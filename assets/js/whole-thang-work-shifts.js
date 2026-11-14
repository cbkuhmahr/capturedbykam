(() => {
  "use strict";
  const opener = document.getElementById("wt-shifts-open");
  if (!opener) return;

  const ENDPOINT = "/api/whole-thang-work-calendar";
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const SHIFTS = {
    morning: { label: "7 AM – 3 PM", start: "07:00", end: "15:00" },
    shortMorning: { label: "7 AM – 11 AM", start: "07:00", end: "11:00" },
    shortEvening: { label: "3 PM – 7 PM", start: "15:00", end: "19:00" },
    evening: { label: "3 PM – 11 PM", start: "15:00", end: "23:00" },
    longOvernight: { label: "7 PM – 7 AM", start: "19:00", end: "07:00" },
    overnight: { label: "11 PM – 7 AM", start: "23:00", end: "07:00" },
    earlyMorning: { label: "3 AM – 7 AM", start: "03:00", end: "07:00" }
  };
  const pad = n => String(n).padStart(2, "0");
  const dayKey = (y,m,d) => y + "-" + pad(m) + "-" + pad(d);
  const timeValid = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  const valueValid = v => typeof v === "string" ? Object.hasOwn(SHIFTS,v) :
    Boolean(v && typeof v === "object" && v.type === "custom" &&
      typeof v.label === "string" && v.label.trim() && v.label.trim().length <= 56 &&
      timeValid(v.start) && timeValid(v.end) && v.start !== v.end);
  const initialNow = new Date();
  const initial = new Date(initialNow.getFullYear(), initialNow.getMonth() + (initialNow.getDate() >= 25 ? 1 : 0), 1);
  let year = initial.getFullYear(), month = initial.getMonth() + 1;
  let selections = {}, feedUrl = "", remoteReady = false, lastFocus = null, oldOverflow = "";
  let saving = false, saveTimer = null, pending = new Map(), loadRevision = 0;
  let lastSaveError = "";
  const storeKey = ym => "wt-work-shifts-v1:" + ym;
  const ym = () => year + "-" + pad(month);

  const dialog = document.createElement("section");
  dialog.id = "wt-shifts-overlay";
  dialog.className = "wt-shifts-overlay";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "wt-shifts-title");
  dialog.innerHTML = [
    '<div class="wt-shifts-shell">',
    '<header class="wt-shifts-head"><div><div class="wt-shifts-kicker">Sports workspace / Personal tools</div>',
    '<h2 id="wt-shifts-title">Work Shift Calendar</h2>',
    '<p>Choose a preset or create your own hours. Changes save privately to your work calendar.</p></div>',
    '<button class="wt-shifts-close" type="button" id="wt-shifts-close">Done</button></header>',
    '<div class="wt-shifts-panel"><div class="wt-shifts-controls">',
    '<div><label for="wt-shifts-month">Month</label><select id="wt-shifts-month"></select></div>',
    '<div><label for="wt-shifts-year">Year</label><input id="wt-shifts-year" type="number" inputmode="numeric" min="2020" max="2099"></div>',
    '</div><div class="wt-shifts-columns"><span>Date</span><span>Shift (custom hours available)</span></div>',
    '<div id="wt-shifts-days"></div></div>',
    '<div class="wt-shifts-actions"><span id="wt-shifts-count">0 shifts selected</span>',
    '<button type="button" class="wt-shifts-clear" id="wt-shifts-clear">Clear month</button></div>',
    '<p class="wt-shifts-help">Times use Toledo / Eastern Time. Overnight shifts end the next morning.',
    ' Calendar is read-only and refreshes when Apple checks the subscription. Your NFL picks are unaffected.</p>',
    '<div class="wt-shifts-privacy">Your shifts are private in the site. Anyone with your unique subscription link can see them, so do not share the link.</div>',
    '</div><div class="wt-shifts-bar"><div class="wt-shifts-barinner">',
    '<a id="wt-shifts-calendar" class="wt-shifts-export wt-shifts-calendar" href="#" aria-disabled="true">Open Apple Calendar</a>',
    '<button type="button" class="wt-shifts-download" id="wt-shifts-export">Download .ics backup</button>',
    '<p class="wt-shifts-status" id="wt-shifts-status" role="status">Loading your schedule…</p>',
    '</div></div>'
  ].join("");
  document.body.appendChild(dialog);

  const el = id => dialog.querySelector("#" + id);
  const monthSelect = el("wt-shifts-month"), yearInput = el("wt-shifts-year");
  MONTHS.forEach((label,index) => monthSelect.add(new Option(label,String(index+1))));
  function setStatus(message, error = false) {
    const status = el("wt-shifts-status");
    status.textContent = message;
    status.classList.toggle("is-error",error);
  }
  function savedLocal(monthKey) {
    try {
      const value = JSON.parse(localStorage.getItem(storeKey(monthKey)) || "{}");
      if (!value || typeof value !== "object" || Array.isArray(value)) return {};
      return Object.fromEntries(Object.entries(value).filter(([d,v]) =>
        d.startsWith(monthKey + "-") && valueValid(v)));
    } catch { return {}; }
  }
  function persistLocal() {
    try { localStorage.setItem(storeKey(ym()), JSON.stringify(selections)); } catch {}
  }
  function updateCount() {
    const count = Object.keys(selections).length;
    el("wt-shifts-count").textContent = count + " shift" + (count === 1 ? "" : "s") + " selected";
  }
  function updateCalendarLink() {
    const link = el("wt-shifts-calendar");
    const canOpen = Boolean(feedUrl && remoteReady && !saving && pending.size === 0);
    link.setAttribute("aria-disabled", canOpen ? "false" : "true");
    link.href = canOpen ? feedUrl.replace(/^https:\/\//i,"webcal://") : "#";
    link.classList.toggle("is-disabled", !canOpen);
  }
  async function request(data) {
    const resp = await fetch(ENDPOINT, {
      method:"POST", credentials:"same-origin",
      headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)
    });
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(payload.error || "Calendar server returned " + resp.status);
    return payload;
  }
  function queueSave() {
    persistLocal();
    updateCount();
    pending.set(ym(), JSON.parse(JSON.stringify(selections)));
    lastSaveError = "";
    remoteReady = false;
    updateCalendarLink();
    setStatus("Saving your schedule…");
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(flushPending, 260);
  }
  async function flushPending() {
    clearTimeout(saveTimer);
    if (saving || pending.size === 0) return;
    saving = true;
    updateCalendarLink();
    while (pending.size > 0) {
      const [key, snapshot] = pending.entries().next().value;
      pending.delete(key);
      try {
        const result = await request({ action:"save", month:key, selections:snapshot });
        if (result.feedUrl) feedUrl = result.feedUrl;
        lastSaveError = "";
      } catch (err) {
        lastSaveError = err.message || "Save failed";
        pending.set(key, snapshot);
        break;
      }
    }
    saving = false;
    remoteReady = !lastSaveError && Boolean(feedUrl) && pending.size === 0;
    updateCalendarLink();
    if (lastSaveError) setStatus("Save failed: " + lastSaveError + ". Tap Retry save.",true);
    else setStatus("Saved. Tap Open Apple Calendar to subscribe or view your schedule.");
    el("wt-shifts-retry").hidden = !lastSaveError;
  }
  function editorFor(date, initialCustom) {
    const container = document.createElement("div");
    container.className = "wt-shifts-custom";
    container.hidden = true;
    const heading = document.createElement("span");
    heading.className = "wt-shifts-custom-heading";
    heading.textContent = "Custom shift for " + date;
    const label = document.createElement("input");
    label.type = "text"; label.maxLength = 56;
    label.placeholder = "Shift name (e.g. Overtime)";
    label.value = initialCustom?.label || "Custom work shift";
    label.setAttribute("aria-label","Name of custom shift on " + date);
    const inputs = document.createElement("div");
    inputs.className = "wt-shifts-time-fields";
    const startBox = document.createElement("label");
    startBox.textContent = "Start time";
    const start = document.createElement("input");
    start.type = "time"; start.required = true; start.value = initialCustom?.start || "07:00";
    startBox.appendChild(start);
    const endBox = document.createElement("label");
    endBox.textContent = "End time";
    const end = document.createElement("input");
    end.type = "time"; end.required = true; end.value = initialCustom?.end || "15:00";
    endBox.appendChild(end);
    inputs.append(startBox,endBox);
    const actions = document.createElement("div");
    actions.className = "wt-shifts-custom-actions";
    const apply = document.createElement("button");
    apply.type = "button"; apply.textContent = "Save custom shift"; apply.className = "wt-shifts-custom-save";
    const note = document.createElement("span");
    note.className = "wt-shifts-custom-note";
    actions.append(apply,note);
    container.append(heading,label,inputs,actions);
    const notifyDirty = () => { note.textContent = "Tap Save custom shift to apply edits"; };
    [label,start,end].forEach(input => input.addEventListener("input",notifyDirty));
    apply.addEventListener("click", () => {
      if (!label.value.trim() || !timeValid(start.value) || !timeValid(end.value) ||
          start.value === end.value) {
        note.textContent = "Enter a shift name and two different times.";
        note.classList.add("is-error");
        return;
      }
      selections[date] = {
        type:"custom", label:label.value.trim(), start:start.value, end:end.value
      };
      note.textContent = end.value < start.value
        ? "Overnight shift entered. Check cloud save status below."
        : "Shift entered. Check cloud save status below.";
      note.classList.remove("is-error");
      queueSave();
    });
    return container;
  }
  function render() {
    monthSelect.value = String(month);
    yearInput.value = String(year);
    selections = savedLocal(ym());
    const days = el("wt-shifts-days");
    days.replaceChildren();
    const last = new Date(year,month,0).getDate();
    for (let i=1;i<=last;i++) {
      const date = dayKey(year,month,i);
      const current = selections[date];
      const dateObject = new Date(year,month-1,i);
      const row = document.createElement("div");
      row.className = "wt-shifts-row" + ([0,6].includes(dateObject.getDay()) ? " weekend" : "");
      const label = document.createElement("div");
      label.className = "wt-shifts-date";
      label.textContent = new Intl.DateTimeFormat("en-US",{weekday:"short"}).format(dateObject) +
        ", " + MONTHS[month-1] + " " + i;
      const sub = document.createElement("span");
      sub.className = "wt-shifts-sub"; sub.textContent = String(year);
      label.appendChild(sub);
      const right = document.createElement("div");
      right.className = "wt-shifts-entry";
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Work shift for " + date);
      select.add(new Option("Off / No shift",""));
      Object.entries(SHIFTS).forEach(([key,shift]) => select.add(new Option(shift.label,key)));
      select.add(new Option("Custom hours…","custom"));
      select.value = typeof current === "string" ? current : current?.type === "custom" ? "custom" : "";
      select.classList.toggle("selected",Boolean(select.value));
      const custom = editorFor(date, typeof current === "object" ? current : null);
      custom.hidden = select.value !== "custom";
      select.addEventListener("change", () => {
        custom.hidden = select.value !== "custom";
        select.classList.toggle("selected", Boolean(select.value));
        if (select.value === "custom") {
          if (selections[date]?.type !== "custom") delete selections[date];
          queueSave();
          custom.querySelector('input[type="text"]').focus();
        } else {
          if (select.value) selections[date] = select.value;
          else delete selections[date];
          queueSave();
        }
      });
      right.append(select,custom);
      row.append(label,right);
      days.appendChild(row);
    }
    updateCount();
    updateCalendarLink();
  }
  async function load() {
    const requestedMonth = ym();
    const revision = ++loadRevision;
    feedUrl = "";
    remoteReady = false;
    render();
    setStatus("Loading saved shifts…");
    try {
      const data = await request({ action:"load", month:requestedMonth });
      if (revision !== loadRevision || requestedMonth !== ym()) return;
      feedUrl = data.feedUrl || "";
      const remote = Object.fromEntries(Object.entries(data.selections || {}).filter(([date,value]) =>
        date.startsWith(requestedMonth + "-") && valueValid(value)));
      const local = selections;
      if (Object.keys(remote).length === 0 && Object.keys(local).length > 0 &&
          window.confirm("Your online calendar is empty for " + requestedMonth +
            ", but this iPhone has saved shifts. Restore the iPhone shifts to the online calendar?")) {
        pending.set(requestedMonth,JSON.parse(JSON.stringify(local)));
        setStatus("Restoring your saved iPhone shifts…");
        await flushPending();
      } else {
        if (Object.keys(remote).length === 0 && Object.keys(local).length > 0) {
          try { localStorage.setItem(storeKey(requestedMonth) + ":backup", JSON.stringify(local)); } catch {}
        }
        selections = remote;
        persistLocal();
        render();
        remoteReady = Boolean(feedUrl);
        updateCalendarLink();
        setStatus("Ready. Choose your shifts, then tap Open Apple Calendar.");
      }
    } catch (err) {
      if (revision !== loadRevision) return;
      remoteReady = false; updateCalendarLink();
      setStatus("Calendar connection failed: " + (err.message || "Try again") + ". Your local entries remain available.",true);
      el("wt-shifts-retry").hidden = false;
    }
  }
  function esc(s) {
    return String(s).replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
  }
  function addDay(date) {
    const [y,m,d] = date.split("-").map(Number);
    const next = new Date(Date.UTC(y,m-1,d+1));
    return dayKey(next.getUTCFullYear(),next.getUTCMonth()+1,next.getUTCDate());
  }
  function icsFromMonth() {
    const now = new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
    const lines = [
      "BEGIN:VCALENDAR","VERSION:2.0",
      "PRODID:-//Captured by Kam//Work Schedule Backup//EN",
      "CALSCALE:GREGORIAN","METHOD:PUBLISH",
      "X-WR-CALNAME:Mimi Work Schedule",
      "BEGIN:VTIMEZONE","TZID:America/New_York",
      "BEGIN:DAYLIGHT","TZOFFSETFROM:-0500","TZOFFSETTO:-0400","TZNAME:EDT",
      "DTSTART:19700308T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU","END:DAYLIGHT",
      "BEGIN:STANDARD","TZOFFSETFROM:-0400","TZOFFSETTO:-0500","TZNAME:EST",
      "DTSTART:19701101T020000","RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
      "END:STANDARD","END:VTIMEZONE"
    ];
    Object.keys(selections).sort().forEach(date => {
      const choice = selections[date];
      const shift = typeof choice === "string" ? SHIFTS[choice] : choice?.type === "custom" ? choice : null;
      if (!shift || !timeValid(shift.start) || !timeValid(shift.end)) return;
      const start = date.replace(/-/g,"") + "T" + shift.start.replace(":","") + "00";
      const endDate = shift.end <= shift.start ? addDay(date) : date;
      const end = endDate.replace(/-/g,"") + "T" + shift.end.replace(":","") + "00";
      lines.push("BEGIN:VEVENT","UID:mimi-work-" + date.replace(/-/g,"") + "@capturedbykam.com",
        "DTSTAMP:" + now,"DTSTART;TZID=America/New_York:" + start,
        "DTEND;TZID=America/New_York:" + end,
        "SUMMARY:" + esc("Mimi Work – " + shift.label),"END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }
  function close() {
    dialog.hidden = true;
    document.body.style.overflow = oldOverflow;
    if (lastFocus?.focus) lastFocus.focus();
  }

  // The calendar link is a real navigation initiated by the user's tap.
  // Browsers cannot silently insert events; iOS prompts to subscribe the first time.
  el("wt-shifts-calendar").addEventListener("click", event => {
    if (el("wt-shifts-calendar").getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      setStatus(lastSaveError ? "Retry saving before opening Calendar." :
        "Finish saving the schedule before opening Calendar.", Boolean(lastSaveError));
      return;
    }
    setStatus("Opening Apple Calendar. Approve Subscribe on your iPhone. Use Safari if an in-app browser blocks the handoff.");
  });
  el("wt-shifts-export").addEventListener("click", async () => {
    if (!Object.keys(selections).length) {
      setStatus("Choose at least one shift before creating an .ics backup.",true);
      return;
    }
    const filename = "Mimi_Work_Schedule_" + ym() + ".ics";
    const file = new File([icsFromMonth()],filename,{type:"text/calendar"});
    try {
      if (navigator.canShare?.({ files:[file] }) && navigator.share) {
        await navigator.share({ files:[file], title:"Mimi Work Schedule" });
        setStatus("Backup shared. Choose Calendar if your iPhone offers it, or save to Files.");
        return;
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url),15000);
      setStatus("Backup downloaded. For automatic Calendar opening use Open Apple Calendar instead.");
    } catch (err) {
      if (err?.name === "AbortError") setStatus("Share cancelled.");
      else setStatus("Could not share backup: " + (err.message || "Try again"),true);
    }
  });
  el("wt-shifts-close").addEventListener("click",close);
  document.addEventListener("keydown",event => {
    if (event.key === "Escape" && !dialog.hidden) close();
  });
  monthSelect.addEventListener("change",() => { month = Number(monthSelect.value); load(); });
  yearInput.addEventListener("change",() => {
    const next = Number(yearInput.value);
    if (Number.isInteger(next) && next >= 2020 && next <= 2099) year = next;
    load();
  });
  el("wt-shifts-clear").addEventListener("click", () => {
    if (Object.keys(selections).length && !window.confirm("Clear every shift for " + MONTHS[month-1] + " " + year + "?")) return;
    selections = {};
    queueSave();
    render();
  });
  const retry = document.createElement("button");
  retry.id = "wt-shifts-retry"; retry.type = "button"; retry.className = "wt-shifts-retry";
  retry.textContent = "Retry save"; retry.hidden = true;
  retry.addEventListener("click", () => {
    retry.hidden = true;
    if (pending.size) flushPending();
    else load();
  });
  el("wt-shifts-status").insertAdjacentElement("afterend",retry);
  opener.addEventListener("click",() => {
    lastFocus = document.activeElement;
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.hidden = false;
    const menu = document.getElementById("wt-more-menu");
    const toggle = document.getElementById("wt-more-toggle");
    if (menu) menu.hidden = true;
    if (toggle) toggle.setAttribute("aria-expanded","false");
    load();
    el("wt-shifts-close").focus();
  });
})();