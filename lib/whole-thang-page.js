"use strict";

// The authenticated handler supplies historical data. Keep presentation separate
// from session checks and preserve the public /whole-thang route.
module.exports = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b111c">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>$billi-type uh’day.</title>
<link rel="stylesheet" href="/assets/css/workspace-foundation.css?v=20261104-season">
<link rel="stylesheet" href="/assets/css/whole-thang-workspace.css?v=20261104-season">
</head>
<body>
<a class="wt-skip-link" href="#app">Skip to content</a>
<svg class="wt-icon-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
<symbol id="wt-i-live" viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></symbol>
<symbol id="wt-i-fantasy" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></symbol>
<symbol id="wt-i-picks" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></symbol>
<symbol id="wt-i-intel" viewBox="0 0 24 24"><path d="M4 20V10m8 10V4m8 16v-7M2 20h20"/></symbol>
<symbol id="wt-i-home" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></symbol>
<symbol id="wt-i-teams" viewBox="0 0 24 24"><path d="M8 3h8v8a4 4 0 0 1-8 0Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 3v6m-4 0h8"/></symbol>
<symbol id="wt-i-history" viewBox="0 0 24 24"><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2"/></symbol>
<symbol id="wt-i-data" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></symbol>
<symbol id="wt-i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></symbol>
</defs></svg>
<div class="shell">
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand-wrap"><span class="orbit" aria-hidden="true">✦</span><div><div class="brand">$billi-type uh’day.</div><span class="wt-brand-caption">SPORTS WORKSPACE</span></div></div>
      <div class="wt-top-actions"><button class="admin-link wt-media-launch" type="button" id="wt-media-launch">Listen / Watch</button><a class="admin-link" href="/admin.html">CBK Admin ↗</a></div>
    </div>
    <nav class="tabs" aria-label="Sports workspace">
      <button class="tab active" id="wt-tab-live" type="button" data-tab="live" aria-current="page"><svg aria-hidden="true"><use href="#wt-i-live"/></svg><span>Live</span></button>
      <button class="tab" id="wt-tab-fantasy" type="button" data-tab="fantasy"><svg aria-hidden="true"><use href="#wt-i-fantasy"/></svg><span>Fantasy</span></button>
      <button class="tab" id="wt-tab-picks" type="button" data-tab="picks"><svg aria-hidden="true"><use href="#wt-i-picks"/></svg><span>Picks</span></button>
      <button class="tab" id="wt-tab-intel" type="button" data-tab="intel"><svg aria-hidden="true"><use href="#wt-i-intel"/></svg><span>Intelligence</span></button>
      <div class="wt-secondary-nav">
        <span class="wt-nav-label">WORKSPACE</span>
        <button class="tab" id="wt-tab-home" type="button" data-tab="home"><svg aria-hidden="true"><use href="#wt-i-home"/></svg><span>Overview</span></button>
        <button class="tab" id="wt-tab-teams" type="button" data-tab="teams"><svg aria-hidden="true"><use href="#wt-i-teams"/></svg><span>Team rankings</span></button>
        <button class="tab" id="wt-tab-history" type="button" data-tab="history"><svg aria-hidden="true"><use href="#wt-i-history"/></svg><span>Pick history</span></button>
        <button class="tab" id="wt-tab-data" type="button" data-tab="data"><svg aria-hidden="true"><use href="#wt-i-data"/></svg><span>Data &amp; backup</span></button>
      </div>
      <div class="wt-more-wrap">
        <button class="wt-more-toggle" type="button" id="wt-more-toggle" data-wt-menu="1" aria-expanded="false" aria-controls="wt-more-menu"><svg aria-hidden="true"><use href="#wt-i-more"/></svg><span>More</span><span class="wt-menu-chevron" aria-hidden="true">⌄</span></button>
        <div id="wt-more-menu" class="wt-more-menu" hidden>
          <span class="wt-menu-heading">Workspace</span>
          <button type="button" data-go="home">Overview</button>
          <button type="button" data-go="teams">Team rankings</button>
          <button type="button" data-go="history">Pick history</button>
          <button type="button" data-go="data">Data &amp; backup</button>
          <span class="wt-menu-heading">Tools</span>
          <button type="button" data-wt-open="apple">Share &amp; calendar</button>
          <button type="button" data-wt-open="media">Listen / Watch</button>
          <button id="wt-shifts-open" type="button">Work schedule</button>
          <a href="/admin.html">CBK Admin ↗</a>
        </div>
      </div>
    </nav>
    <div class="season-strip" aria-label="Season performance">
      <div class="record">— <span>2026 SEASON · verifying record</span></div>
      <div class="metric"><strong>—</strong><small>Accuracy</small></div>
      <div class="metric"><strong>14–2</strong><small>Best week</small></div>
    </div>
  </header>
  <div class="wt-main-column">
    <div class="wt-workspace-header"><div class="wt-breadcrumb">Workspace <span aria-hidden="true">/</span> <strong id="wt-view-label">Live scores</strong></div><span class="wt-sync-indicator" data-wt-cloud role="status">Connecting…</span></div>
    <main id="app" tabindex="-1" aria-label="Live scores"></main>
  </div>
</div>
<noscript><p class="note">Enable JavaScript to use your sports workspace. <a href="/admin.html">Return to Admin</a></p></noscript>
<script id="wt-history" type="application/json">__WT_HISTORY__</script>
<script src="/assets/js/whole-thang-ui.js?v=20261104-season" defer></script>
<script src="/assets/js/whole-thang-v3.js?v=20261104-season" defer></script>
<script src="/assets/js/whole-thang-live.js?v=20261104-season" defer></script>
<script src="/assets/js/whole-thang-media.js?v=20261103" defer></script>
<script src="/assets/js/whole-thang-lock.js" defer></script>
<script src="/assets/js/whole-thang-apple.js?v=20261103" defer></script>
<script src="/assets/js/whole-thang-manual-fantasy.js?v=20261103" defer></script>
<script src="/assets/js/whole-thang-fantasy-page.js?v=20261103" defer></script>
<script src="/assets/js/whole-thang-awake.js?v=20261019-compact-awake" defer></script>
<script src="/assets/js/whole-thang-work-shifts.js?v=20261103" defer></script>
</body>
</html>`;
