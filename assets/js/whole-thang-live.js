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
let live=new Map(),state="loading",updatedAt="",fetching=false;
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
function markup(){
 const selected=picks();
 const info=state==="loading"?"Connecting to NFL scores…":
  state==="error"?(live.size?"Feed unavailable · last received scores shown":"Live scores temporarily unavailable"):
  "Score feed connected";
 const stamp=updatedAt?new Date(updatedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/New_York"})+" ET":"";
 const order=g=>g&&g.state==="in"?0:g&&g.state==="pre"?1:g&&g.state==="post"?2:1;
 const sorted=[...GAMES].sort((a,b)=>order(get(a))-order(get(b))||GAMES.indexOf(a)-GAMES.indexOf(b));
 return '<div class="wt-score-meta"><span class="'+(state==="error"?"wt-score-error":"")+'"><strong>'+esc(info)+'</strong>'+(stamp?" · Updated "+esc(stamp):"")+'</span>'+
 '<button type="button" class="btn wt-score-refresh" data-score-refresh="1" '+(fetching?"disabled":"")+'>'+(fetching?"Updating…":"↻ Refresh scores")+'</button></div>'+
 '<div class="wt-score-grid">'+sorted.map(g=>{
  const x=get(g),choice=selected[g.id]||"",active=x&&x.state==="in",final=x&&x.state==="post";
  function team(t,side){return '<div class="wt-score-team '+(choice===t?"is-pick":"")+'"><img class="wt-logo" src="'+logo(t)+'" alt="" loading="lazy"><span>'+esc(t)+'</span><span class="wt-score-num">'+score(x,side)+'</span></div>';}
  return '<article class="wt-score-game '+(active?"is-live":"")+'"><div class="wt-score-top"><span>'+esc(active?"LIVE":final?"FINAL":g.day+" · "+g.time+" ET")+'</span>'+
   '<span class="wt-score-status '+(active?"is-live":final?"is-final":"")+'">'+esc(label(x))+'</span></div>'+
   team(g.away,"away")+team(g.home,"home")+
   '<div class="wt-score-pick">'+(choice?'YOUR PICK: <strong>'+esc(choice)+'</strong>':'No pick saved')+'</div></article>';
 }).join("")+'</div>'+
 '<p class="wt-score-help">Score data: ESPN · Automatically checks about every 45 seconds. This is a game-day view, not an official pick submission or automated grading feature.</p>';
}
function ensure(){
 const active=document.querySelector(".tab.active")?.dataset.tab;
 if(active!=="home"&&active!=="picks")return;
 let section=document.getElementById("wt-scoreboard");
 if(!section){
  section=document.createElement("section");
  section.className="section";
  section.id="wt-scoreboard";
  section.innerHTML='<div class="section-head"><h2>NFL Live Scores</h2><span>Week 6 · 14 matchups</span></div><div class="wt-score-shell" id="wt-live-scoreboard"></div>';
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
 }catch{state="error";}
 finally{fetching=false;ensure();}
}
document.addEventListener("click",e=>{if(e.target.closest("[data-score-refresh]"))refresh();});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
ensure();refresh();
setInterval(()=>{if(!document.hidden)refresh();},45000);
})();
