(() => {
  "use strict";
  const trigger = document.getElementById("wt-calendar-center-open");
  if (!trigger) return;
  const ENDPOINT = "/api/whole-thang-work-calendar";
  const MAX_GAMES = 200;
  const SOURCE = "https://www.maxpreps.com/oh/toledo/whitmer-panthers/basketball/jv/schedule/";
  let games = [], revision = "", feedUrl = "", dirty = false, loaded = false, editingId = null;
  let previousFocus = null, previousOverflow = "";
  const overlay = document.createElement("section");
  overlay.id = "wt-cc-overlay";
  overlay.className = "wt-cc-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role","dialog");
  overlay.setAttribute("aria-modal","true");
  overlay.setAttribute("aria-labelledby","wt-cc-title");
  overlay.innerHTML = [
    '<div class="wt-cc-shell">',
    '<header class="wt-cc-head"><div><small>Sports workspace / Personal tools</small><h2 id="wt-cc-title">Calendar Center</h2></div>',
    '<button type="button" class="wt-cc-button" id="wt-cc-close">Done</button></header>',
    '<div class="wt-cc-body">',
    '<section id="wt-cc-home">',
    '<p class="wt-cc-lead">Make changes here once. Subscribed iPhone calendars pick up changes when Apple refreshes the feed.</p>',
    '<div class="wt-cc-cards">',
    '<article class="wt-cc-card"><span class="wt-cc-kicker">Work / Shifts</span><h3>Amy Work Schedule</h3>',
    '<p>Choose shifts by date, including custom hours and overnight shifts. No Excel required.</p>',
    '<button id="wt-cc-open-work" type="button" class="wt-cc-button">Edit Amy’s shifts</button></article>',
    '<article class="wt-cc-card"><span class="wt-cc-kicker">2026–27 / Basketball</span><h3>Miles Whitmer Basketball 🏀</h3>',
    '<p>Edit the 21 imported Whitmer JV games, home/away details, venues and tipoff times.</p>',
    '<button id="wt-cc-open-games" type="button" class="wt-cc-button">Manage basketball games</button></article>',
    '</div><p class="wt-cc-help">Calendars are not shared between family members unless they subscribe. Keep subscription links private.</p>',
    '</section>',
    '<section id="wt-cc-games-panel" class="wt-cc-panel" hidden>',
    '<div class="wt-cc-topline"><h3>Miles Whitmer Basketball 🏀</h3><button type="button" id="wt-cc-back" class="wt-cc-button">Back</button></div>',
    '<p class="wt-cc-help">Game changes publish from your site. This does not automatically copy later MaxPreps changes.</p>',
    '<div class="wt-cc-alert">January 22 appears twice on MaxPreps (4:45 PM and 6:00 PM). Both entries are marked tentative until you confirm the correct game.</div>',
    '<div class="wt-cc-actions">',
    '<button type="button" class="wt-cc-button" id="wt-cc-add">+ Add game</button>',
    '<button type="button" class="wt-cc-button" id="wt-cc-reload">Reload games</button>',
    '<button type="button" class="wt-cc-button primary" id="wt-cc-save" disabled>Save changes</button>',
    '</div>',
    '<div class="wt-cc-editor wt-cc-form" id="wt-cc-editor" hidden>',
    '<h4 id="wt-cc-editor-title">Edit game</h4><form id="wt-cc-edit-form">',
    '<div class="wt-cc-fields">',
    '<label class="wt-cc-field">Date<input id="wt-cc-date" type="date" required min="2026-01-01" max="2099-12-31"></label>',
    '<label class="wt-cc-field">Start time (Eastern)<input id="wt-cc-time" type="time" required></label>',
    '<label class="wt-cc-field wide">Opponent<input id="wt-cc-opponent" type="text" maxlength="100" required></label>',
    '<label class="wt-cc-field wide">Venue and address<input id="wt-cc-venue" type="text" maxlength="240" required></label>',
    '<label class="wt-cc-field">Home or away<select id="wt-cc-homeaway"><option value="home">Home — vs</option><option value="away">Away — @</option></select></label>',
    '<label class="wt-cc-field">Schedule status<select id="wt-cc-confirmed"><option value="confirmed">Confirmed</option><option value="tentative">Tentative</option></select></label>',
    '<label class="wt-cc-field wide">Notes (optional)<textarea id="wt-cc-notes" maxlength="500"></textarea></label>',
    '</div><div><button type="submit" class="wt-cc-button primary">Apply game</button><button type="button" id="wt-cc-cancel" class="wt-cc-button">Cancel</button></div></form>',
    '</div>',
    '<p id="wt-cc-status" class="wt-cc-status" role="status" aria-live="polite">Loading…</p>',
    '<div class="wt-cc-actions">',
    '<a id="wt-cc-subscribe" class="wt-cc-link primary" href="#" aria-disabled="true">Open Apple Calendar — Subscribe</a>',
    '<button type="button" class="wt-cc-button" id="wt-cc-copy" disabled>Copy subscription link</button>',
    '<a class="wt-cc-link" href="' + SOURCE + '" target="_blank" rel="noopener noreferrer">Check MaxPreps</a>',
    '</div>',
    '<p class="wt-cc-help">Subscribe once on your iPhone. Later edits sync when Apple refreshes the calendar; updates are not instantaneous. The subscription URL grants read access to game details.</p>',
    '<div id="wt-cc-list" class="wt-cc-games"></div>',
    '</section>',
    '<div class="wt-cc-footer">Personal calendars / private administrator workspace</div>',
    '</div></div>'
  ].join("");
  document.body.appendChild(overlay);
  const el = id => overlay.querySelector("#" + id);
  const status = (message, error=false) => {
    el("wt-cc-status").textContent = message;
    el("wt-cc-status").classList.toggle("error",error);
  };
  function setDirty(value) {
    dirty = value;
    el("wt-cc-save").disabled = !loaded || !dirty;
    el("wt-cc-reload").disabled = !loaded;
    el("wt-cc-add").disabled = !loaded || games.length >= MAX_GAMES;
  }
  function setLinks() {
    const link = el("wt-cc-subscribe");
    const okay = loaded && !dirty && Boolean(feedUrl);
    link.setAttribute("aria-disabled",okay ? "false" : "true");
    link.href = okay ? feedUrl.replace(/^https:\/\//i,"webcal://") : "#";
    el("wt-cc-copy").disabled = !okay;
  }
  function showHome() {
    if (dirty && !window.confirm("Discard unsaved basketball changes?")) return false;
    dirty = false;
    setDirty(false);
    el("wt-cc-home").hidden = false;
    el("wt-cc-games-panel").hidden = true;
    el("wt-cc-editor").hidden = true;
    return true;
  }
  function close() {
    if (!showHome()) return;
    overlay.hidden = true;
    document.body.style.overflow = previousOverflow;
    previousFocus?.focus?.();
  }
  function prettyDate(date,time) {
    const [y,m,d] = date.split("-").map(Number);
    const when = new Date(y,m-1,d);
    const label = Number.isFinite(when.getTime()) ? when.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"}) : date;
    const [h,minute] = time.split(":").map(Number);
    const clock = new Date(2000,0,1,h,minute).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    return label + " · " + clock;
  }
  function render() {
    const list = el("wt-cc-list");
    list.replaceChildren();
    for (const game of [...games].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))) {
      const line = document.createElement("div");
      line.className = "wt-cc-game";
      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = (game.home ? "vs " : "@ ") + game.opponent + (game.status === "tentative" ? " · Tentative" : "");
      const when = document.createElement("small");
      when.textContent = prettyDate(game.date,game.time) + " · " + game.venue;
      details.append(title,when);
      const edit = document.createElement("button");
      edit.type = "button"; edit.className="wt-cc-button";
      edit.textContent = "Edit"; edit.dataset.editId=game.id;
      const remove = document.createElement("button");
      remove.type="button"; remove.className="wt-cc-button";
      remove.textContent="Remove"; remove.dataset.deleteId=game.id;
      line.append(details,edit,remove);
      list.appendChild(line);
    }
    if (!games.length) list.textContent = "No games yet. Add one above.";
    setDirty(dirty);
    setLinks();
  }
  async function request(body) {
    const response = await fetch(ENDPOINT,{
      method:"POST", credentials:"same-origin",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    const result = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(result.error || "Calendar service error (" + response.status + ")");
    return result;
  }
  async function loadGames() {
    if (dirty && !window.confirm("Discard unsaved edits and reload?")) return;
    loaded=false; dirty=false; games=[]; setDirty(false); render();
    status("Loading game schedule…");
    el("wt-cc-reload").disabled=true;
    try {
      const result = await request({action:"loadGames"});
      if (!Array.isArray(result.games) || typeof result.revision !== "string" ||
          typeof result.feedUrl !== "string") throw new Error("Unexpected schedule response");
      games = result.games; revision = result.revision; feedUrl = result.feedUrl;
      loaded = true; dirty=false;
      render();
      status(games.length + " games loaded. Select Edit or Add game, then Save changes.");
    } catch(error) {
      status("Unable to load games: " + (error.message || "Please try again."),true);
      el("wt-cc-reload").disabled=false;
    }
  }
  async function saveGames() {
    if (!loaded || !dirty) return;
    el("wt-cc-save").disabled=true;
    status("Saving games to your subscribed calendar…");
    try {
      const result = await request({action:"saveGames",games,revision});
      if (!result.saved || typeof result.revision !== "string") throw new Error("Unexpected save response");
      revision=result.revision; feedUrl=result.feedUrl || feedUrl;
      setDirty(false); setLinks();
      status("Saved " + result.count + " games. Subscribed calendars receive updates when Apple refreshes.");
    } catch (error) {
      setDirty(true); setLinks();
      status("Save failed: " + (error.message || "Try again.") + " Your edits are still here.",true);
    }
  }
  function openEditor(game) {
    editingId = game?.id || null;
    el("wt-cc-editor-title").textContent = game ? "Edit game" : "Add game";
    el("wt-cc-date").value=game?.date || "";
    el("wt-cc-time").value=game?.time || "18:00";
    el("wt-cc-opponent").value=game?.opponent || "";
    el("wt-cc-venue").value=game?.venue || "Whitmer High School, 5601 Clegg Dr, Toledo, OH 43613, USA";
    el("wt-cc-homeaway").value=game?.home ? "home" : game ? "away" : "home";
    el("wt-cc-confirmed").value=game?.status || "confirmed";
    el("wt-cc-notes").value=game?.notes || "";
    el("wt-cc-editor").hidden=false;
    el("wt-cc-editor").scrollIntoView({behavior:"smooth",block:"start"});
    el("wt-cc-opponent").focus({preventScroll:true});
  }
  el("wt-cc-edit-form").addEventListener("submit",event=>{
    event.preventDefault();
    if (!loaded || !event.currentTarget.reportValidity()) return;
    const opponent = el("wt-cc-opponent").value.trim(), venue=el("wt-cc-venue").value.trim();
    if (!opponent || !venue) { status("Opponent and venue are required.",true); return; }
    const eventId = editingId || "miles-" + (crypto.randomUUID?.() || (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)));
    const next = {id:eventId,date:el("wt-cc-date").value,time:el("wt-cc-time").value,
      opponent,venue,home:el("wt-cc-homeaway").value==="home",
      status:el("wt-cc-confirmed").value,notes:el("wt-cc-notes").value.trim()};
    if (!next.date || !next.time) { status("A date and start time are required.",true); return; }
    const index = games.findIndex(x=>x.id===next.id);
    if (index>=0) games[index]=next; else games.push(next);
    el("wt-cc-editor").hidden=true; editingId=null;
    setDirty(true); render();
    status("Change staged. Tap Save changes to update your calendar.");
  });
  el("wt-cc-list").addEventListener("click",event=>{
    const edit=event.target.closest("[data-edit-id]");
    const remove=event.target.closest("[data-delete-id]");
    if (edit) {
      const game=games.find(x=>x.id===edit.dataset.editId);
      if (game) openEditor(game);
    }
    if (remove) {
      const game=games.find(x=>x.id===remove.dataset.deleteId);
      if (game && window.confirm("Remove the " + game.date + " game vs " + game.opponent + "?")) {
        games=games.filter(x=>x.id!==game.id);
        el("wt-cc-editor").hidden=true; editingId=null;
        setDirty(true); render();
        status("Removal staged. Tap Save changes to publish.");
      }
    }
  });
  el("wt-cc-add").addEventListener("click",()=>openEditor(null));
  el("wt-cc-cancel").addEventListener("click",()=>{el("wt-cc-editor").hidden=true;editingId=null;});
  el("wt-cc-save").addEventListener("click",saveGames);
  el("wt-cc-reload").addEventListener("click",loadGames);
  el("wt-cc-open-games").addEventListener("click",()=>{
    el("wt-cc-home").hidden=true;el("wt-cc-games-panel").hidden=false;
    el("wt-cc-editor").hidden=true;loadGames();
  });
  el("wt-cc-back").addEventListener("click",showHome);
  el("wt-cc-close").addEventListener("click",close);
  el("wt-cc-open-work").addEventListener("click",()=>{
    if (showHome()) {
      overlay.hidden=true; document.body.style.overflow=previousOverflow;
      document.getElementById("wt-shifts-open")?.click();
    }
  });
  el("wt-cc-subscribe").addEventListener("click",event=>{
    if (el("wt-cc-subscribe").getAttribute("aria-disabled")==="true") {
      event.preventDefault();status("Save edits and load the calendar before subscribing.",true);
    } else {
      status("Opening Apple Calendar subscription. On iPhone, approve Subscribe. Safari may work better than in-app browsers.");
    }
  });
  el("wt-cc-copy").addEventListener("click",async ()=>{
    if (!feedUrl || dirty || !loaded) return;
    try { await navigator.clipboard.writeText(feedUrl);status("Private calendar link copied. Add it under iPhone Calendar > Calendars > Add Calendar > Add Subscription Calendar."); }
    catch { window.prompt("Copy your private calendar URL:",feedUrl); }
  });
  document.addEventListener("keydown",event=>{if(event.key==="Escape" && !overlay.hidden)close();});
  trigger.addEventListener("click",()=>{
    previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden"; overlay.hidden=false;
    el("wt-cc-home").hidden=false; el("wt-cc-games-panel").hidden=true;
    const menu=document.getElementById("wt-more-menu"), toggle=document.getElementById("wt-more-toggle");
    if(menu)menu.hidden=true;if(toggle)toggle.setAttribute("aria-expanded","false");
    el("wt-cc-close").focus();
  });
})();