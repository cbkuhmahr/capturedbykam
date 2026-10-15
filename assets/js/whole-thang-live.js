(() => {
"use strict";
// Read-only live-score layer: it never changes WholeThang's saved picks or game history.
const GAMES=[
["SEA","DEN","Thu · Oct 15","8:15 PM"],["HOU","JAX","Sun · Oct 18","9:30 AM"],
["TEN","IND","Sun · Oct 18","1:00 PM"],["CAR","PHI","Sun · Oct 18","1:00 PM"],
["PIT","TB","Sun · Oct 18","1:00 PM"],["BAL","CLE","Sun · Oct 18","1:00 PM"],
["NO","NYG","Sun · Oct 18","1:00 PM"],["CHI","ATL","Sun · Oct 18","1:00 PM"],
["NYJ","NE","Sun · Oct 18","1:00 PM"],["ARI","LAR","Sun · Oct 18","4:05 PM"],
["LAC","KC","Sun · Oct 18","4:25 PM"],["BUF","LV","Sun · Oct 18","4:25 PM"],
["DAL","GB","Sun · Oct 18","8:20 PM"],["WAS","SF","Mon · Oct 19","8:15 PM"]
].map((g,i)=>({id:"w6-"+(i+1),away:g[0],home:g[1],day:g[2],time:g[3]}));
const names={WAS:"wsh"};
const app=document.getElementById("app");
if(!app)return;
let live=new Map(),state="loading",updatedAt="",fetching=false,viewFilter="all";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const logo=t=>"https://a.espncdn.com/i/teamlogos/nfl/500/"+(names[t]||t).toLowerCase()+".png";
const get=g=>live.get(g.away+"-"+g.home)||null;
function picks(){
 try{
  const raw=JSON.parse(localStorage.getItem("whole-thang-v3")||"{}");
  return raw&&typeof raw.picks==="object"?raw.picks:{};
 }catch{return {};}
}
function label(g){
 if(!g)return "UPCOMING";
 if(g.state==="post")return /OT/i.test(g.detail)?"FINAL / OT":"FINAL";
 if(g.state==="in")return g.detail||("Q"+g.period+" "+g.clock);
 if(/POSTPONED|CANCELLED|DELAYED/i.test(g.statusName))return g.detail||g.statusName;
 return "UPCOMING";
}
function score(g,side){return g&&g.state!=="pre"&&Number.isFinite(g[side+"Score"])?g[side+"Score"]:"—";}
function mini(game){
 const g=get(game);
 return g&&g.state!=="pre"?'<strong>'+esc(label(g))+'</strong> · '+game.away+' '+score(g,"away")+' – '+game.home+' '+score(g,"home"):"";
}
function verdict(game, result, choice) {
 if(!choice)return "unpicked";
 if(!result||result.state==="pre")return "upcoming";
 if(result.awayScore==null||result.homeScore==null)return "unknown";
 const away=Number(result.awayScore),home=Number(result.homeScore);
 if(!Number.isFinite(away)||!Number.isFinite(home))return "unknown";
 if(away===home)return result.state==="post"?"tied":"even";
 const leader=away>home?game.away:game.home;
 const right=leader===choice;
 if(result.state==="post")return right?"correct":"incorrect";
 return right?"ahead":"behind";
}
function markup(){
 const selected=picks();
 const info=state==="loading"?"Connecting to NFL scores…":
  state==="error"?(live.size?"Feed unavailable · last received scores shown":"Live scores temporarily unavailable"):
  "Score feed connected";
 const stamp=updatedAt?new Date(updatedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/New_York"})+" ET":"";
 const details=GAMES.map(game=>({game,result:get(game),choice:selected[game.id]||"",verdict:verdict(game,get(game),selected[game.id]||"")}));
 const completed=details.filter(x=>x.result&&x.result.state==="post"&&x.choice);
 const right=completed.filter(x=>x.verdict==="correct").length;
 const wrong=completed.filter(x=>x.verdict==="incorrect").length;
 const ties=completed.filter(x=>x.verdict==="tied").length;
 const inProgress=details.filter(x=>x.result&&x.result.state==="in");
 const liveAhead=inProgress.filter(x=>x.verdict==="ahead").length;
 const liveBehind=inProgress.filter(x=>x.verdict==="behind").length;
 const picked=details.filter(x=>x.choice).length;
 const order=g=>g&&g.state==="in"?0:g&&g.state==="pre"?1:g&&g.state==="post"?2:1;
 const sorted=details.sort((a,b)=>order(a.result)-order(b.result)||GAMES.indexOf(a.game)-GAMES.indexOf(b.game));
 const shown=sorted.filter(x=>viewFilter==="live"?(x.result&&x.result.state==="in"):viewFilter==="picked"?!!x.choice:true);
 const summary='<div class="wt-score-summary" aria-label="Current pick outcomes">'+
  '<div><small>Final picks</small><strong>'+right+'–'+wrong+(ties?'–'+ties+'T':'')+'</strong><span>Completed games</span></div>'+
  '<div><small>Currently ahead</small><strong>'+liveAhead+'</strong><span>In-progress picks</span></div>'+
  '<div><small>Currently behind</small><strong>'+liveBehind+'</strong><span>In-progress picks</span></div>'+
  '<div><small>Picks saved</small><strong>'+picked+'/'+GAMES.length+'</strong><span>Week 6 card</span></div></div>';
 const filters='<div class="wt-live-filters" aria-label="Filter scoreboard">'+
  [["all","All games"],["live","Live now"],["picked","My picks"]].map(([key,name])=>'<button type="button" data-live-filter="'+key+'" class="btn '+(viewFilter===key?"primary":"")+'" aria-pressed="'+(viewFilter===key)+'">'+name+'</button>').join("")+
 '</div>';
 const status='<div class="wt-score-meta"><span class="'+(state==="error"?"wt-score-error":"")+'"><strong>'+esc(info)+'</strong>'+(stamp?" · Updated "+esc(stamp):"")+'</span>'+
 '<button type="button" class="btn wt-score-refresh" data-score-refresh="1" '+(fetching?"disabled":"")+'>'+(fetching?"Updating…":"↻ Refresh scores")+'</button></div>';
 const board='<div class="wt-score-grid">'+(shown.length?shown.map(({game,result:x,choice,verdict:outcome})=>{
  const active=x&&x.state==="in",final=x&&x.state==="post";
  function team(t,side){return '<div class="wt-score-team '+(choice===t?"is-pick":"")+'"><img class="wt-logo" src="'+logo(t)+'" alt="" loading="lazy"><span>'+esc(t)+'</span><span class="wt-score-num">'+score(x,side)+'</span></div>';}
  const explanation={correct:"✓ Correct pick",incorrect:"✕ Incorrect pick",tied:"Final tie · no winning pick",ahead:"Currently winning",behind:"Currently losing",even:"Currently tied",upcoming:"Game not started",unpicked:"No pick saved",unknown:"Score not available"}[outcome];
  return '<article class="wt-score-game '+(active?"is-live":"")+'"><div class="wt-score-top"><span>'+esc(active?"LIVE":final?"FINAL":game.day+" · "+game.time+" ET")+'</span>'+
   '<span class="wt-score-status '+(active?"is-live":final?"is-final":"")+'">'+esc(label(x))+'</span></div>'+
   team(game.away,"away")+team(game.home,"home")+
   '<div class="wt-score-pick">YOUR PICK: <strong>'+esc(choice||"—")+'</strong><span class="wt-pick-verdict wt-v-'+outcome+'">'+esc(explanation)+'</span></div>'+(window.WTManualFantasy?.gameRows?.(game)||window.WTFantasy?.gameRows?.(game)||"")+'</article>';
 }).join(""):'<div class="empty">No games match this view right now.</div>')+'</div>';
 return status+(window.WTManualFantasy?.toolbar?.()||window.WTFantasy?.toolbar?.()||"")+summary+filters+board+
 '<p class="wt-score-help">Scores from ESPN · Auto-refreshes about every 45 seconds when this page is open. In-progress leads can change; this view does not edit picks, grade official family submissions, or calculate prizes. Official picks must still be submitted using the family form.</p>';
}
function ensure(){
 const active=document.querySelector(".tab.active")?.dataset.tab;
 if(active!=="home"&&active!=="picks"&&active!=="live")return;
 let section=document.getElementById("wt-scoreboard");
 if(!section){
  section=document.createElement("section");
  section.className="section";
  section.id="wt-scoreboard";
  section.innerHTML='<div class="section-head"><h2>Live Game Center</h2><span>Week 6 · 14 matchups</span></div><div class="wt-score-shell" id="wt-live-scoreboard"></div>';
  app.prepend(section);
 }
 const cards=app.querySelectorAll(".wt-game-card");
 cards.forEach((card,i)=>{
  const game=GAMES[i];
  if(!game)return;
  let holder=card.querySelector(".wt-card-score");
  if(!holder){
   holder=document.createElement("div");
   holder.className="wt-card-score";
   const head=card.querySelector(".wt-card-head");
   if(head)head.insertAdjacentElement("afterend",holder);
  }
  holder.innerHTML=mini(game);
 });
 const board=document.getElementById("wt-live-scoreboard");
 if(board)board.innerHTML=markup();
}
const observer=new MutationObserver(()=>ensure());
observer.observe(app,{childList:true});
async function refresh(){
 if(fetching)return;
 fetching=true;ensure();
 try{
  const response=await fetch("/api/nfl-scores?week=6&season=2026",{cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw Error("Score request failed");
  const json=await response.json();
  if(!json.ok||!Array.isArray(json.games))throw Error("Invalid score format");
  const next=new Map(json.games.filter(g=>g&&typeof g.away==="string"&&typeof g.home==="string").map(g=>[g.away+"-"+g.home,g]));
  if(!GAMES.some(g=>next.has(g.away+"-"+g.home)))throw Error("No matching matchups");
  live=next;updatedAt=json.updatedAt||new Date().toISOString();state="ready";
  document.dispatchEvent(new CustomEvent("wt-score-update",{detail:{games:json.games}}));
 }catch{state="error";}
 finally{fetching=false;ensure();}
}
document.addEventListener("click",e=>{
 if(e.target.closest("[data-score-refresh]")){refresh();return;}
 const filter=e.target.closest("[data-live-filter]");
 if(filter&&["all","live","picked"].includes(filter.dataset.liveFilter)){viewFilter=filter.dataset.liveFilter;ensure();}
});
document.addEventListener("wt-fantasy-change",ensure);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
ensure();refresh();
setInterval(()=>{if(!document.hidden)refresh();},45000);
})();
