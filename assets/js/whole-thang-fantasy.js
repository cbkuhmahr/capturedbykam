(() => {
"use strict";
// Read-only fantasy overlay for the existing NFL Game Center. Does not change pick'em data.
const API = "/api/yahoo-fantasy";
const STORAGE = "wt-yahoo-team-key";
const APPLY = "https://sports.yahoo.com/developer/access/";
let status = "loading", enabled = false, connected = false, message = "";
let players = [], teams = [], teamKey = "", updatedAt = "", loading = false;
const escapeHTML = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const emit = () => document.dispatchEvent(new Event("wt-fantasy-change"));
function pointText(n) { return typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "—"; }
function isStarting(p) {
  const slot = String(p.slot || "").toUpperCase();
  return slot !== "BN" && slot !== "BE" && slot !== "IR" && slot !== "IL" && slot !== "NA" && slot !== "RES" && slot !== "";
}
function statsText(p) {
  const arr = Array.isArray(p.stats) ? p.stats : [];
  return arr.filter(s => s && s.value !== "0" && s.value !== "0.0" && s.value !== "0.00")
    .slice(0, 4).map(s => escapeHTML(s.name) + ": " + escapeHTML(s.value)).join(" · ");
}
function rosterCard(p) {
  const starter = isStarting(p);
  const stats = statsText(p);
  return '<div class="wt-fantasy-player">' +
    '<span class="wt-fantasy-role ' + (starter ? "starter":"bench") + '">' +
    escapeHTML(p.slot || "—") + '</span>' +
    '<div class="wt-fantasy-person"><strong>' + escapeHTML(p.name) + '</strong><small>' +
    escapeHTML(p.position) + (stats ? ' · ' + stats : '') + '</small></div>' +
    '<div class="wt-fantasy-pts"><strong>' + pointText(p.points) + '</strong><small>PTS</small></div></div>';
}
function gameRows(game) {
  if (!connected || !players.length) return "";
  const matched = players.filter(p => p.team === game.away || p.team === game.home);
  if (!matched.length) return "";
  matched.sort((a,b) => Number(isStarting(b)) - Number(isStarting(a)));
  return '<div class="wt-fantasy-inside"><div class="wt-fantasy-match-head"><strong>My Yahoo Fantasy Players</strong><span>' +
    matched.length + " in this game</span></div>" + matched.map(rosterCard).join("") + '</div>';
}
function toolbar() {
  if (status === "loading") return '<div class="wt-fantasy-toolbar"><strong>Yahoo Fantasy</strong><span>Checking connection…</span></div>';
  if (!enabled) return '<div class="wt-fantasy-toolbar"><div><strong>Yahoo Fantasy</strong><small>Approval required before automatic syncing can start. Yahoo must approve read-only API access.</small></div>' +
    '<a href="' + APPLY + '" target="_blank" rel="noopener noreferrer" class="btn">Apply for Yahoo access ↗</a></div>';
  if (!connected) return '<div class="wt-fantasy-toolbar"><div><strong>Yahoo Fantasy</strong><small>Connect your Yahoo account to import your league and weekly lineup.</small></div>' +
    '<button class="btn primary" type="button" data-yahoo-connect="1">Connect Yahoo</button></div>';
  const total = players.filter(isStarting).reduce((sum,p)=>sum+(typeof p.points === "number" ? p.points : 0),0);
  const counted = players.filter(p=>isStarting(p)&&typeof p.points==="number").length;
  const all = players.filter(isStarting).length;
  const choices = teams.length > 1 ? '<label class="wt-fantasy-select">Team <select id="wt-yahoo-team">' +
    teams.map(t=>'<option value="'+escapeHTML(t.key)+'" '+(t.key===teamKey?'selected':'')+'>'+escapeHTML(t.name)+'</option>').join("") +
    '</select></label>' : '<small>' + escapeHTML(teams[0]?.name || "Yahoo Fantasy") + '</small>';
  const stamp = updatedAt ? new Date(updatedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/New_York"}) + " ET" : "—";
  return '<div class="wt-fantasy-toolbar is-connected"><div class="wt-fantasy-title"><strong>Yahoo Fantasy <span class="wt-fantasy-online">● Connected</span></strong>' +
    '<small>Read-only roster and official Yahoo scoring · Updated '+escapeHTML(stamp)+'</small>' +
    (message ? '<small class="wt-fantasy-error">'+escapeHTML(message)+'</small>' : '')+'</div>' +
    '<div class="wt-fantasy-total"><strong>'+pointText(all ? total : null)+'</strong><small>Starter points'+(counted<all?' ('+counted+'/'+all+' reported)':'')+'</small></div>' +
    '<div class="wt-fantasy-actions">'+choices+'<button type="button" class="btn" data-yahoo-refresh="1" '+(loading?'disabled':'')+'>↻ Stats</button>' +
    '<button type="button" class="btn" data-yahoo-disconnect="1">Disconnect</button></div></div>';
}
async function get(action, params={}) {
  const q = new URLSearchParams({action, ...params});
  const response = await fetch(API + "?" + q, {credentials:"same-origin",cache:"no-store"});
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw Error(data.error || "Yahoo Fantasy is unavailable");
  return data;
}
async function loadRoster() {
  if (loading || !connected || document.hidden) return;
  loading = true; message = ""; emit();
  try {
    const q = {week:"6"};
    if (teamKey) q.team = teamKey;
    const data = await get("roster", q);
    teams = Array.isArray(data.teams) ? data.teams : [];
    teamKey = String(data.selectedTeam || "");
    if (teamKey) {try{localStorage.setItem(STORAGE,teamKey);}catch{}}
    players = Array.isArray(data.players) ? data.players : [];
    updatedAt = data.updatedAt || "";
    if (!teams.length) message = "No current-season Yahoo NFL teams found on this account.";
  } catch(e) {
    message = e.message;
    if (/Connect Yahoo/.test(message)) {connected=false;players=[];}
  } finally {loading=false;emit();}
}
async function init() {
  try {
    try {teamKey=localStorage.getItem(STORAGE)||"";} catch{}
    const result = await get("status");
    enabled = !!result.available; connected = !!result.connected;
    status = "ready";
    emit();
    if (connected) await loadRoster();
  } catch(e) {status="error";message=e.message;emit();}
}
document.addEventListener("click", async event => {
  if (event.target.closest("[data-yahoo-connect]")) {
    window.location.assign(API+"?action=connect");
  }
  if (event.target.closest("[data-yahoo-refresh]")) await loadRoster();
  if (event.target.closest("[data-yahoo-disconnect]")) {
    try {
      const response=await fetch(API+"?action=disconnect",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"});
      if(!response.ok)throw Error("Disconnect unsuccessful");
      connected=false;players=[];teams=[];teamKey="";updatedAt="";message="";
      try{localStorage.removeItem(STORAGE);}catch{}
      emit();
    }catch(e){message=e.message;emit();}
  }
});
document.addEventListener("change", event => {
  if (event.target?.id==="wt-yahoo-team") {
    teamKey=event.target.value;players=[];updatedAt="";loadRoster();
  }
});
document.addEventListener("visibilitychange",()=>{if(!document.hidden && connected)loadRoster();});
window.WTFantasy = {gameRows,toolbar};
emit();init();
setInterval(()=>{if(connected && !document.hidden)loadRoster();},90000);
})();