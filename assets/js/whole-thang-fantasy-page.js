(() => {
"use strict";
// Dedicated Fantasy tab. Keep the NFL Live tab focused on scores and family picks.
const app = document.getElementById("app");
if (!app) return;
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const teamLogo = value => "https://a.espncdn.com/i/teamlogos/nfl/500/" + (value === "WAS" ? "wsh" : value).toLowerCase() + ".png";
function currentMatchup(game) {
  return (window.WTScoreGames || []).find(g => g.away === game.away && g.home === game.home) || {state:"pre",away:game.away,home:game.home};
}
function score(value, active) {
  return active && Number.isFinite(Number(value)) && value != null ? String(value) : "—";
}
function gameCard(game, result, manual, yahoo) {
  const live = result.state === "in", finished = result.state === "post";
  const state = live ? ("LIVE · " + (result.detail || ("Q" + result.period + " " + (result.clock || "")))) : finished ? "FINAL" : "UPCOMING";
  return '<article class="wt-fantasy-game-card">' +
    '<div class="wt-fantasy-game-top"><span>' + esc(game.away) + ' @ ' + esc(game.home) + '</span><small class="' + (live?"is-live":"") + '">' + esc(state) + '</small></div>' +
    '<div class="wt-fantasy-game-score"><div><img src="' + teamLogo(game.away) + '" loading="lazy" alt=""><b>' + esc(game.away) + '</b><strong>' + score(result.awayScore, live || finished) + '</strong></div>' +
    '<span>–</span><div><img src="' + teamLogo(game.home) + '" loading="lazy" alt=""><b>' + esc(game.home) + '</b><strong>' + score(result.homeScore, live || finished) + '</strong></div></div>' +
    manual + yahoo + '</article>';
}
function render(){
  if (document.querySelector(".tab.active")?.dataset.tab !== "fantasy") return;
  const gamesRoot=document.getElementById("wt-fantasy-games"), yahooRoot=document.getElementById("wt-fantasy-yahoo");
  if(!gamesRoot || !yahooRoot) return;
  const schedule=window.WTScouting?.games || [];
  const manual=window.WTManualFantasy, yahoo=window.WTFantasy;
  const cards=[];
  for (const game of schedule){
    const result=currentMatchup(game);
    const manualRows=manual?.gameRows?.(game,result) || "";
    const yahooRows=yahoo?.gameRows?.(game) || "";
    if(manualRows || yahooRows) cards.push(gameCard(game,result,manualRows,yahooRows));
  }
  gamesRoot.innerHTML=cards.length?
    '<div class="wt-fantasy-game-grid">' + cards.join("") + '</div>' :
    '<p class="wt-fantasy-quiet">No games matched your roster. Check each player’s team assignment, or use Manage roster to add players.</p>';
  yahooRoot.innerHTML=yahoo?.toolbar?.() || '<p class="wt-fantasy-quiet">Checking Yahoo connection options…</p>';
}
const observer=new MutationObserver(render);
observer.observe(app,{childList:true});
for(const name of ["wt-manual-fantasy-change","wt-fantasy-change","wt-scores-ready"]){
  document.addEventListener(name,render);
}
render();
})();
