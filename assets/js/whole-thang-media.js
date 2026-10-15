(() => {
  "use strict";
  // The sports lounge is an optional interface layer. It never reads or modifies picks.
  const launch = document.getElementById("wt-media-launch");
  if (!launch || document.getElementById("wt-media-panel")) return;
  const STATIONS = {
    chicago: {
      name: "ESPN Chicago 1000",
      provider: "TuneIn",
      source: "https://tunein.com/embed/player/s21297/",
      direct: "https://tunein.com/radio/ESPN-Chicago-1000-s21297/",
      description: "Chicago sports talk and Bears pregame/postgame. Bears play-by-play may be restricted to listeners in the local market."
    },
    herd: {
      name: "FOX Sports Radio / The Herd",
      provider: "iHeartRadio",
      source: "https://www.iheart.com/live/fox-sports-radio-4732/?embed=true",
      direct: "https://www.iheart.com/live/fox-sports-radio-4732/",
      description: "FOX Sports Radio carries The Herd with Colin Cowherd, weekdays 12–3 PM Eastern. Other programming airs outside those hours."
    }
  };
  let selected = "chicago";
  let loaded = false;
  let opened = false;
  const layer = document.createElement("div");
  layer.className = "wt-media-shade";
  layer.id = "wt-media-shade";
  layer.setAttribute("aria-hidden", "true");
  const panel = document.createElement("section");
  panel.className = "wt-media-panel";
  panel.id = "wt-media-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-hidden", "true");
  panel.setAttribute("aria-label", "Live Sports Lounge");
  panel.innerHTML =
    '<div class="wt-media-head"><div><div class="wt-media-eyebrow">$billi-type uh’day. / Game Day</div><h2>Live Sports Lounge</h2></div>' +
    '<button class="wt-media-close" type="button" data-media-close aria-label="Close lounge">×</button></div>' +
    '<div class="wt-media-content">' +
      '<div class="wt-media-banner"><div><strong>Chicago radio. National sports talk. Bears football.</strong>' +
        '<p>A dedicated listening and viewing hub while you track your picks and scores.</p></div>' +
        '<span class="wt-media-signal">SPORTS RADIO</span></div>' +
      '<section class="wt-media-section" aria-label="Radio stations"><div class="wt-media-sectiontitle">' +
        '<h3>01 / Listen live</h3><small>Choose a station</small></div>' +
        '<div class="wt-radio-choices" role="group" aria-label="Select radio station">' +
          '<button type="button" class="wt-radio-choice selected" data-media-station="chicago" aria-pressed="true">' +
          '<span>AM 1000 · CHICAGO</span><strong>ESPN Chicago</strong><small>Bears radio · Chicago sports</small></button>' +
          '<button type="button" class="wt-radio-choice" data-media-station="herd" aria-pressed="false">' +
          '<span>FOX SPORTS RADIO</span><strong>Colin Cowherd</strong><small>The Herd · Mon–Fri · noon–3 ET</small></button>' +
        '</div>' +
        '<div class="wt-radio-shell"><div id="wt-radio-status" class="wt-radio-status" aria-live="polite"></div>' +
          '<div id="wt-radio-player"></div>' +
          '<div class="wt-radio-actions"><button type="button" class="wt-media-btn primary" data-media-load>Load live player</button>' +
          '<button type="button" class="wt-media-btn" data-media-stop disabled>Stop player</button>' +
          '<a id="wt-radio-direct" class="wt-media-btn" target="_blank" rel="noopener noreferrer">Open at broadcaster ↗</a></div>' +
          '<p class="wt-radio-hint">After loading, press Play inside the station widget. A broadcaster can disable an embed, require sign-in, or block a game by region; the broadcaster link is the fallback.</p>' +
        '</div></section>' +
      '<section class="wt-media-section" aria-label="Bears video viewing"><div class="wt-media-sectiontitle"><h3>02 / Bears watch deck</h3><small>Out-of-market options</small></div>' +
        '<div class="wt-watch-screen" role="img" aria-label="Chicago Bears game day watch destination, live video requires an authorized provider">' +
          '<div class="wt-watch-screenmark">CHI · GAME DAY</div>' +
          '<div class="wt-watch-center"><span>LIVE GAME VIDEO</span><strong>BEARS WATCH DECK</strong>' +
            '<p>Game video plays through an authorized subscription provider, not an unlicensed in-app stream.</p></div>' +
        '</div>' +
        '<div class="wt-watch-actions">' +
          '<a class="wt-media-btn primary" href="https://tv.youtube.com/learn/nflsundayticket/" target="_blank" rel="noopener noreferrer">Watch out-of-market · Sunday Ticket ↗</a>' +
          '<a class="wt-media-btn" href="https://www.nfl.com/plus" target="_blank" rel="noopener noreferrer">Bears live audio · NFL+ ↗</a>' +
          '<a class="wt-media-btn" href="https://www.foxsports.com/live" target="_blank" rel="noopener noreferrer">FOX live · where eligible ↗</a>' +
          '<a class="wt-media-btn" href="https://www.chicagobears.com/watch-live-games/ways-to-watch" target="_blank" rel="noopener noreferrer">Official Bears viewing guide ↗</a>' +
        '</div>' +
        '<div class="wt-media-disclaimer"><strong>Out-of-market reality:</strong> NFL+ includes home/away game audio across the U.S., but only local and primetime live video on supported mobile devices. Sunday Ticket covers out-of-market Sunday afternoon games. This website cannot change your IP address or override broadcaster location restrictions.</div>' +
      '</section>' +
    '</div>';
  const dock = document.createElement("div");
  dock.className = "wt-media-dock";
  dock.id = "wt-media-dock";
  dock.innerHTML = '<button type="button" class="wt-media-dock-copy" data-media-open><strong id="wt-dock-title">Sports radio</strong><small>Player loaded · tap to reopen</small></button>' +
    '<button type="button" class="wt-dock-stop" data-media-stop>Stop</button>';
  document.body.append(layer, panel, dock);
  const player = panel.querySelector("#wt-radio-player");
  const status = panel.querySelector("#wt-radio-status");
  const direct = panel.querySelector("#wt-radio-direct");
  const loadButton = panel.querySelector("[data-media-load]");
  const stopButton = panel.querySelector(".wt-radio-shell [data-media-stop]");
  const dockTitle = dock.querySelector("#wt-dock-title");
  function refreshRadio() {
    const station = STATIONS[selected];
    status.textContent = station.description;
    direct.href = station.direct;
    direct.setAttribute("aria-label", "Open " + station.name + " on " + station.provider);
    panel.querySelectorAll("[data-media-station]").forEach(btn => {
      const active = btn.dataset.mediaStation === selected;
      btn.classList.toggle("selected", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    loadButton.textContent = loaded ? "Reload player" : "Load live player";
    stopButton.disabled = !loaded;
    dock.classList.toggle("is-active", loaded);
    dockTitle.textContent = station.name;
  }
  function stopRadio() {
    // Removing the iframe reliably stops an existing third-party player.
    player.replaceChildren();
    loaded = false;
    refreshRadio();
  }
  function loadRadio() {
    stopRadio();
    const iframe = document.createElement("iframe");
    iframe.src = STATIONS[selected].source;
    iframe.title = STATIONS[selected].name + " live radio player";
    iframe.className = "wt-radio-frame";
    iframe.setAttribute("allow", "autoplay; encrypted-media");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("loading", "eager");
    player.appendChild(iframe);
    loaded = true;
    refreshRadio();
    status.textContent = "Player loaded from " + STATIONS[selected].provider + ". Use Play in the widget. If unavailable, choose Open at broadcaster. " + STATIONS[selected].description;
  }
  function setOpen(next) {
    opened = !!next;
    layer.classList.toggle("is-open", opened);
    panel.classList.toggle("is-open", opened);
    panel.setAttribute("aria-hidden", String(!opened));
    layer.setAttribute("aria-hidden", String(!opened));
    launch.setAttribute("aria-expanded", String(opened));
    document.body.style.overflow = opened ? "hidden" : "";
    if (opened) panel.querySelector("[data-media-close]").focus();
    else launch.focus();
  }
  launch.setAttribute("aria-expanded", "false");
  launch.setAttribute("aria-controls", "wt-media-panel");
  launch.addEventListener("click", () => setOpen(!opened));
  layer.addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", event => {
    if (event.target.closest("[data-media-close]")) {setOpen(false);return;}
    const chosen = event.target.closest("[data-media-station]");
    if (chosen) {
      if (chosen.dataset.mediaStation !== selected) {
        stopRadio();
        selected = chosen.dataset.mediaStation;
        refreshRadio();
      }
      return;
    }
    if (event.target.closest("[data-media-load]")) {loadRadio();return;}
    if (event.target.closest("[data-media-stop]")) stopRadio();
  });
  dock.addEventListener("click", event => {
    if (event.target.closest("[data-media-stop]")) stopRadio();
    else setOpen(true);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && opened) setOpen(false);
  });
  refreshRadio();
})();