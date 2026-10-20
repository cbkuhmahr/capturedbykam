(() => {
"use strict";
// Read-only live-score layer: it never changes WholeThang's saved picks or game history.
let GAMES=[
["SEA","DEN","Thu · Oct 15","8:15 PM"],["HOU","JAX","Sun · Oct 18","9:30 AM"],
["TEN","IND","Sun · Oct 18","1:00 PM"],["CAR","PHI","Sun · Oct 18","1:00 PM"],
["PIT","TB","Sun · Oct 18","1:00 PM"],["BAL","CLE","Sun · Oct 18","1:00 PM"],
["NO","NYG","Sun · Oct 18","1:00 PM"],["CHI","ATL","Sun · Oct 18","1:00 PM"],
["NYJ","NE","Sun · Oct 18","1:00 PM"],["ARI","LAR","Sun · Oct 18","4:05 PM"],
["LAC","KC","Sun · Oct 18","4:25 PM"],["BUF","LV","Sun · Oct 18","4:25 PM"],
["DAL","GB","Sun · Oct 18","8:20 PM"],["WAS","SF","Mon · Oct 19","8:15 PM"]
].map((g,i)=>({id:"w6-"+(i+1),away:g[0],home:g[1],day:g[2],time:g[3]}));
let currentWeek=6;
const names={WAS:"wsh"};
const app=document.getElementById("app");
if(!app)return;
let live=new Map(),state="loading",updatedAt="",fetching=false,viewFilter="all";
let market=new Map(),marketState="loading",marketUpdatedAt="",fetchingMarket=false;
let compact=(()=>{
 try{
  const saved=localStorage.getItem("wt-live-density");
  if(saved==="compact")return true;
  if(saved==="expanded")return false;
 }catch{}
 return !!(window.matchMedia&&window.matchMedia("(max-width: 720px)").matches);
})();
const expandedGames=new Set();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const logo=t=>"https://a.espncdn.com/i/teamlogos/nfl/500/"+(names[t]||t).toLowerCase()+".png";
const get=g=>live.get(g.away+"-"+g.home)||null;
const getMarket=g=>market.get(g.away+"-"+g.home)||null;
function displaySpread(value) {
 if(value===null||value===undefined||!Number.isFinite(value))return "—";
 if(value===0)return "PK";
 return (value>0?"+":"")+value.toFixed(1).replace(/\.0$/,"");
}
function marketLine(game) {
 const line=getMarket(game);
 const spread=line?.awaySpread!==null&&line?.awaySpread!==undefined&&
  line?.homeSpread!==null&&line?.homeSpread!==undefined
  ?game.away+" "+displaySpread(line.awaySpread)+" / "+game.home+" "+displaySpread(line.homeSpread):"Unavailable";
 const total=Number.isFinite(line?.overUnder)?line.overUnder.toFixed(1).replace(/\.0$/,""):"Unavailable";
 return '<div class="wt-market-line" aria-label="Pregame point spread and over under"><span class="wt-market-item"><small>POINT SPREAD</small><strong>'+esc(spread)+'</strong></span>'+
 '<span class="wt-market-item"><small>OVER / UNDER</small><strong>'+esc(total)+(total!=="Unavailable"?" pts":"")+'</strong></span>'+
 (line?.provider?'<small class="wt-market-provider">'+esc(line.provider)+'</small>':"")+'</div>';
}

function picks(){
 try{
  const raw=JSON.parse(localStorage.getItem(currentWeek===6?"whole-thang-v3":"whole-thang-v3-2026-"+currentWeek)||"{}");
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
 const scoreText=g&&g.state!=="pre"?'<strong>'+esc(label(g))+'</strong> · '+game.away+' '+score(g,"away")+' – '+game.home+' '+score(g,"home"):"";
 return (scoreText?'<div>'+scoreText+'</div>':"")+marketLine(game);
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
 const info=state==="error"?"Scores unavailable":state==="loading"?"Loading scores…":"";
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
 const shown=sorted.filter(x=>viewFilter==="live"?(x.result&&x.result.state==="in"):viewFilter==="pending"?(!x.result||x.result.state!=="post"):viewFilter==="picked"?!!x.choice:true);
 const counted=right+wrong+ties;
 const displayable=state==="ready"||!!updatedAt;
 let tallyNote="Final: "+counted+" of "+picked+" selected picks";
 if(ties)tallyNote+=" · "+ties+" tied";
 if(liveAhead||liveBehind)tallyNote+=" · In play: "+liveAhead+" ahead, "+liveBehind+" behind";
 if(state==="loading"&&!updatedAt)tallyNote="Loading scores…";
 if(state==="error")tallyNote=updatedAt?"Last available · "+tallyNote:"Scores temporarily unavailable";
 const summary='<section class="wt-score-summary" aria-label="Week '+currentWeek+' running pick tally">'+
  '<div class="wt-score-summary-title"><span>WEEK '+currentWeek+' · LIVE TALLY</span><strong>Your results</strong></div>'+
  '<div class="wt-score-tally wt-score-tally-right"><small>✓ CORRECT</small><strong>'+(displayable?right:"—")+'</strong></div>'+
  '<div class="wt-score-tally wt-score-tally-wrong"><small>✕ WRONG</small><strong>'+(displayable?wrong:"—")+'</strong></div>'+
  '<div class="wt-score-summary-note" role="status" aria-live="polite">'+esc(tallyNote)+'</div></section>';
 const overall=window.WTSeasonTotals?.();
 const seasonLine=overall?'<div class="wt-live-season-line" aria-label="Overall season results"><div><small>OVERALL · 2026 SEASON</small><strong>'+esc(overall.record)+'</strong></div><div><strong>'+esc(overall.accuracy)+'%</strong><small>ACCURACY</small></div></div>':"";
 const filters='<div class="wt-live-filters" aria-label="Filter scoreboard">'+
  [["all","All"],["live","Live now"],["pending","Not final"],["picked","My picks"]].map(([key,name])=>'<button type="button" data-live-filter="'+key+'" class="btn '+(viewFilter===key?"primary":"")+'" aria-pressed="'+(viewFilter===key)+'">'+name+'</button>').join("")+
 '</div>';
 const tools='<div class="wt-live-tools" aria-label="Live view options">'+
  '<button type="button" class="btn wt-density-btn" data-live-density="1" aria-pressed="'+compact+'">'+(compact?"Compact · On":"Compact · Off")+'</button>'+
  '<button type="button" class="btn wt-awake-btn" data-awake-toggle="1" aria-pressed="true">Keep awake · On</button>'+
 '</div>';
 const status='<div class="wt-score-meta"><span class="'+(state==="error"?"wt-score-error":"")+'">'+esc(info||(stamp?"Updated "+stamp:"Scores ready"))+'</span>'+
 '<button type="button" class="btn wt-score-refresh" data-score-refresh="1" '+(fetching?"disabled":"")+'>'+(fetching?"Updating…":"↻ Refresh scores")+'</button></div>';
 const marketHelp='<div class="wt-market-help" aria-label="Betting lines explained"><strong>ODDS GUIDE</strong> <span>−3.5 = favored by 3.5</span><span>+3.5 = underdog by 3.5</span><span>O/U = combined points</span></div>';
 const board='<div class="wt-score-grid '+(compact?'is-compact':'')+'">'+(shown.length?shown.map(({game,result:x,choice,verdict:outcome})=>{
  const active=x&&x.state==="in",final=x&&x.state==="post";
  const status=active?label(x):final?"FINAL":game.day+" · "+game.time+" ET";
  const names={ARI:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",CAR:"Panthers",CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",DEN:"Broncos",DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",JAX:"Jaguars",KC:"Chiefs",LAC:"Chargers",LAR:"Rams",LV:"Raiders",MIA:"Dolphins",MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",NYJ:"Jets",PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",TB:"Buccaneers",TEN:"Titans",WAS:"Commanders"};
  function team(t,side){return '<div class="wt-score-team '+(choice===t?"is-pick":"")+'"><img class="wt-logo" src="'+logo(t)+'" alt="" loading="lazy"><span class="wt-score-team-label"><strong>'+esc(names[t]||t)+'</strong><small>'+esc(t)+(choice===t?' · MY PICK':'')+'</small></span><span class="wt-score-num">'+score(x,side)+'</span></div>';}
  const verdictText={correct:"Correct",incorrect:"Incorrect",tied:"Tied game",ahead:"Ahead",behind:"Behind",even:"Tied",upcoming:"Upcoming",unpicked:"",unknown:""}[outcome]||"";
  const myPlayers=window.WTManualFantasy?.gameRows?.(game,x)||"";
  return '<article class="wt-score-game '+(active?"is-live":"")+' '+(final?"is-final":"")+' '+(expandedGames.has(game.id)?"is-expanded":"")+'">'+
    '<div class="wt-score-top"><span class="wt-score-week">NFL · WEEK '+currentWeek+'</span><span class="wt-score-status '+(active?"is-live":final?"is-final":"")+'">'+esc(status)+'</span></div>'+
    '<div class="wt-score-teams">'+team(game.away,"away")+team(game.home,"home")+'</div>'+marketLine(game)+
    (choice?'<div class="wt-score-pick"><span>MY PICK <strong>'+esc(choice)+'</strong></span><span class="wt-pick-verdict wt-v-'+outcome+'">'+esc(verdictText)+'</span></div>':'')+
    (myPlayers?'<div class="wt-score-players">'+myPlayers+'</div>':'')+
    (myPlayers&&compact?'<button type="button" class="wt-score-expand" data-score-expand="'+game.id+'" aria-expanded="'+expandedGames.has(game.id)+'">'+(expandedGames.has(game.id)?'Hide players':'Show players')+'</button>':'')+
    '</article>';
 }).join(""):'<div class="empty">No games in this view.</div>')+'</div>';
 return summary+seasonLine+status+filters+tools+marketHelp+board;
}
 function ensure(){
 const active=document.querySelector(".tab.active")?.dataset.tab;
 if(active!=="home"&&active!=="picks"&&active!=="live")return;
 let section=document.getElementById("wt-scoreboard");
 if(!section&&active==="live"){
  section=document.createElement("section");
  section.className="section";
  section.id="wt-scoreboard";
  section.innerHTML='<div class="section-head"><h2>Live Game Center</h2></div><div class="wt-score-shell" id="wt-live-scoreboard"></div>';
  app.prepend(section);
 }
 const cards=app.querySelectorAll(".wt-game-card");
 cards.forEach((card,i)=>{
  const id=card.querySelector("[data-pick]")?.dataset.pick;
  const game=GAMES.find(g=>g.id===id)||GAMES[i];
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
 if(board){board.innerHTML=markup();window.WTStayAwake?.sync();}
}
async function refreshMarket() {
 if(fetchingMarket)return;
 fetchingMarket=true;
 const requestWeek=currentWeek;
 try{
  const response=await fetch("/api/nfl-scores?mode=odds&week="+requestWeek+"&season=2026",{credentials:"same-origin"});
  if(!response.ok)throw Error("Betting lines unavailable");
  const json=await response.json();
  if(!json.ok||!Array.isArray(json.games))throw Error("Invalid betting lines");
  if(requestWeek!==currentWeek)return;
  market=new Map(json.games.filter(g=>g&&g.away&&g.home).map(g=>[g.away+"-"+g.home,g.odds||null]));
  marketUpdatedAt=json.updatedAt||"";
  marketState="ready";
 }catch{marketState="error";}finally{fetchingMarket=false;ensure();}
}
const observer=new MutationObserver(()=>ensure());
observer.observe(app,{childList:true});
async function refresh(){
 if(fetching)return;
 fetching=true;ensure();
 const requestWeek=currentWeek;
 try{
  const response=await fetch("/api/nfl-scores?week="+requestWeek+"&season=2026",{cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw Error("Score request failed");
  const json=await response.json();
  if(!json.ok||!Array.isArray(json.games))throw Error("Invalid score format");
  const next=new Map(json.games.filter(g=>g&&typeof g.away==="string"&&typeof g.home==="string").map(g=>[g.away+"-"+g.home,g]));
  if(!GAMES.some(g=>next.has(g.away+"-"+g.home)))throw Error("No matching matchups");
  if(requestWeek!==currentWeek)return;
  live=next;updatedAt=json.updatedAt||new Date().toISOString();state="ready";
  window.WTScoreGames=json.games;document.dispatchEvent(new Event("wt-scores-ready"));
 }catch{state="error";}
 finally{fetching=false;ensure();}
}
document.addEventListener("click",e=>{
 if(e.target.closest("[data-score-refresh]")){refresh();refreshMarket();return;}
 if(e.target.closest("[data-live-density]")){
  compact=!compact;
  try{localStorage.setItem("wt-live-density",compact?"compact":"expanded");}catch{}
  ensure();
  return;
 }
 const expander=e.target.closest("[data-score-expand]");
 if(expander){
  const id=expander.dataset.scoreExpand;
  if(expandedGames.has(id))expandedGames.delete(id);else expandedGames.add(id);
  ensure();
  return;
 }
 const filter=e.target.closest("[data-live-filter]");
 if(filter&&["all","live","pending","picked"].includes(filter.dataset.liveFilter)){viewFilter=filter.dataset.liveFilter;ensure();}
});
document.addEventListener("wt-week-changed",()=>{
 const data=window.WTActiveWeekData;
 if(!data||!Number.isInteger(data.week)||!Array.isArray(data.games))return;
 if(data.week===currentWeek)return;
 currentWeek=data.week;
 GAMES=data.games.map(g=>({id:g.id,away:g.away,home:g.home,day:g.day,time:g.time,group:g.group,neutral:g.neutral}));
 live=new Map();market=new Map();state="loading";updatedAt="";viewFilter="all";
 expandedGames.clear();
 ensure();refresh();refreshMarket();
});
document.addEventListener("wt-fantasy-change",ensure);
document.addEventListener("wt-manual-fantasy-change",ensure);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){refresh();refreshMarket();}});
ensure();refresh();refreshMarket();
setInterval(()=>{if(!document.hidden)refresh();},45000);
setInterval(()=>{if(!document.hidden)refreshMarket();},180000);
})();
