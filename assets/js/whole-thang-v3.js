(() => {
"use strict";
const NAMES = {ARI:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",CAR:"Panthers",CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",DEN:"Broncos",DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",JAX:"Jaguars",KC:"Chiefs",LAC:"Chargers",LAR:"Rams",LV:"Raiders",MIA:"Dolphins",MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",NYJ:"Jets",PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",TB:"Buccaneers",TEN:"Titans",WAS:"Commanders"};
const LOGOS = {WAS:"wsh"};
const OLD_KEY="whole-thang-v2", KEY="whole-thang-v3";
const LEGACY_GAMES = [
 ["SEA","DEN","Thursday","Thu · Oct 15","8:15 PM"],
 ["HOU","JAX","London","Sun · Oct 18","9:30 AM"],
 ["TEN","IND","Sunday Early","Sun · Oct 18","1:00 PM"],
 ["CAR","PHI","Sunday Early","Sun · Oct 18","1:00 PM"],
 ["PIT","TB","Sunday Early","Sun · Oct 18","1:00 PM"],
 ["BAL","CLE","Sunday Early","Sun · Oct 18","1:00 PM"],
 ["NO","NYG","Sunday Early","Sun · Oct 18","1:00 PM"],
 ["CHI","ATL","Sunday Early","Sun · Oct 18","1:00 PM"],
 ["NYJ","NE","Sunday Early","Sun · Oct 18","1:00 PM"],
 ["ARI","LAR","Sunday Late","Sun · Oct 18","4:05 PM"],
 ["LAC","KC","Sunday Late","Sun · Oct 18","4:25 PM"],
 ["BUF","LV","Sunday Late","Sun · Oct 18","4:25 PM"],
 ["DAL","GB","Sunday Night","Sun · Oct 18","8:20 PM"],
 ["WAS","SF","Monday Night","Mon · Oct 19","8:15 PM"]
].map((a,i)=>({id:"w6-"+(i+1),away:a[0],home:a[1],group:a[2],day:a[3],time:a[4],neutral:a[2]==="London"}));
let GAMES=LEGACY_GAMES;
let activeWeek=6;
let week6State=null;
const WEEKLY_PREFIX="whole-thang-v3-2026-";
const weekScores=new Map();
const previousWeeks=new Map();
let activatingWeek=false;
let lastWeekCheck=0;
const rawNode=document.getElementById("wt-history");
if(!rawNode){document.getElementById("app").textContent="Historical data unavailable.";return;}
const raw=JSON.parse(rawNode.textContent);
const HISTORY=raw.trim().split(/\n+/).map((line,i)=>{
 const [wk,away,home,pick,winner,winScore,loseScore]=line.trim().split(/\s+/);
 const tie=winner==="T", w=Number(winScore), l=Number(loseScore);
 return {id:"history-"+(i+1),week:Number(wk),away,home,pick,winner,tie,awayScore:tie?w:winner===away?w:l,homeScore:tie?w:winner===home?w:l,status:tie?"T":pick===winner?"W":"L"};
});
const EMPTY=()=>({picks:{},mnfMargin:"",locked:false,homeEdge:45,updatedAt:0});
function safeLoad(){
 let existing=null,old=null;
 try{existing=JSON.parse(localStorage.getItem(KEY)||"null");}catch{}
 try{old=JSON.parse(localStorage.getItem(OLD_KEY)||localStorage.getItem("whole-thang-v1")||"null");}catch{}
 const source=existing||old||{};
 const allow=Object.fromEntries(GAMES.filter(g=>source.picks&&[g.away,g.home].includes(source.picks[g.id])).map(g=>[g.id,source.picks[g.id]]));
 return {picks:allow,mnfMargin:validMargin(source.mnfMargin),locked:!!source.locked,homeEdge:[0,25,45,65,85].includes(Number(source.homeEdge))?Number(source.homeEdge):45,updatedAt:Number(source.updatedAt)||0};
}
function validMargin(v){return v===""||v==null?"":Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=200?String(v):"";}
let state=safeLoad(),tab="live",teamSort="rating",intelFilter="all";
week6State=state;
let cloudStatus="Connecting cloud…",initialCloudLoad=true,cloudTimer=null,localRevision=0;
let syncingDevice=false,lastDeviceSync="";
async function cloudRequest(action,payload={}){
 const r=await fetch("/api/whole-thang-sync",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||!data.ok)throw Error(data.error||"Could not reach cloud sync");
 return data;
}
function queueCloudSave(){
 if(initialCloudLoad||activatingWeek)return;
 if(cloudTimer)clearTimeout(cloudTimer);
 cloudTimer=setTimeout(async()=>{
  const snapshot=JSON.parse(JSON.stringify(state)),week=activeWeek;
  try{
   cloudStatus="Syncing…";
   if(week===6)await cloudRequest("save",{state:snapshot});
   else await cloudRequest("saveWeek",{season:2026,week,state:snapshot});
   if(week===activeWeek&&snapshot.updatedAt===state.updatedAt){cloudStatus="Cloud synced";render();}
   else if(week===activeWeek)queueCloudSave();
  }catch{cloudStatus="Local backup · sync offline";render();}
 },400);
}
function save(){
 state.updatedAt=Date.now();
 localRevision++;
 try{localStorage.setItem(activeWeek===6?KEY:WEEKLY_PREFIX+activeWeek,JSON.stringify(state));}catch{toast("Browser storage unavailable.");}
 if(activeWeek===6)week6State=state;
 queueCloudSave();
}
async function initCloud(){
 const started=localRevision;
 try{
  const response=await cloudRequest("load");
  const remote=response.state;
  const remoteTime=remote?Date.parse(remote.updated_at)||0:0;
  const localTime=Number(state.updatedAt)||0;
  if(remote&&started===localRevision&&remoteTime>=localTime){
   state={...EMPTY(),picks:Object.fromEntries(GAMES.filter(g=>remote.picks&&[g.away,g.home].includes(remote.picks[g.id])).map(g=>[g.id,remote.picks[g.id]])),mnfMargin:validMargin(remote.mnf_margin),locked:!!remote.locked,homeEdge:[0,25,45,65,85].includes(Number(remote.home_edge))?Number(remote.home_edge):45,updatedAt:remoteTime};
   try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
   initialCloudLoad=false;cloudStatus="Cloud synced";
  }else{
   initialCloudLoad=false;cloudStatus="Cloud connected";
   if(localRevision>started||state.updatedAt||Object.keys(state.picks).length||state.mnfMargin!=="")queueCloudSave();
  }
 }catch{initialCloudLoad=false;cloudStatus="Local backup · sync offline";}
 week6State=state;
 render();
 await checkWeek();
}

// Weekly rollover: only the authenticated picks sync changes. Historical weeks
// are never overwritten when a new schedule becomes active.
function readWeekState(week,games) {
 let raw=null;
 try{raw=JSON.parse(localStorage.getItem(WEEKLY_PREFIX+week)||"null");}catch{}
 const initial=raw&&typeof raw==="object"?raw:{};
 return {...EMPTY(),picks:Object.fromEntries(games.filter(g=>[g.away,g.home].includes(initial.picks?.[g.id])).map(g=>[g.id,initial.picks[g.id]])),
  mnfMargin:validMargin(initial.mnfMargin),locked:initial.locked===true,
  homeEdge:[0,25,45,65,85].includes(Number(initial.homeEdge))?Number(initial.homeEdge):45,
  updatedAt:Number(initial.updatedAt)||0};
}
function restoreRemoteWeek(remote,games){
 return {...EMPTY(),picks:Object.fromEntries(games.filter(g=>[g.away,g.home].includes(remote?.picks?.[g.id])).map(g=>[g.id,remote.picks[g.id]])),
  mnfMargin:validMargin(remote?.mnf_margin),locked:remote?.locked===true,
  homeEdge:[0,25,45,65,85].includes(Number(remote?.home_edge))?Number(remote.home_edge):45,
  updatedAt:Date.parse(remote?.updated_at)||0};
}
async function historicalWeek(week){
 if(weekScores.has(week)&&week<7)return;
 try{
  const res=await fetch("/api/nfl-scores?mode=week&week="+week,{credentials:"same-origin"});
  const data=await res.json();
  if(!res.ok||!data.ok||!Array.isArray(data.games)||data.games.length<10)return;
  weekScores.set(week,data.games);
  if(week>=7){
   let archive=readWeekState(week,data.games);
   try{
    const cloud=await cloudRequest("loadWeek",{season:2026,week});
    if(cloud.state){
     const saved=restoreRemoteWeek(cloud.state,data.games);
     if(saved.updatedAt>=archive.updatedAt)archive=saved;
    }else if(archive.updatedAt>0 && (Object.keys(archive.picks).length>0 || archive.mnfMargin!=="")){
     // Restore an older week's locally saved selections to the cloud once,
     // but never overwrite an existing cloud record during historical import.
     await cloudRequest("saveWeek",{season:2026,week,state:archive});
    }
   }catch{}
   previousWeeks.set(week,gradeWeek(week,data.games,archive.picks,data.games));
  }
 }catch{}
}
async function checkWeek(){
 if(activatingWeek)return;
 lastWeekCheck=Date.now();
 let response,feed;
 try{
  response=await fetch("/api/nfl-scores?mode=week",{cache:"no-store",credentials:"same-origin"});
  feed=await response.json();
  if(!response.ok||!feed.ok||!Number.isInteger(feed.week)||!Array.isArray(feed.games)||feed.games.length<10)return;
 }catch{return;}
 if(feed.week<activeWeek)return;
 if(feed.week===activeWeek){
  if(feed.week===6){weekScores.set(6,feed.games);}
  return;
 }
 activatingWeek=true;
 let saveAfterActivation=false;
 try{
  if(activeWeek===6)week6State=state;
  const latestWeek=feed.week;
  const newGames=feed.games.map(g=>({id:g.id,away:g.away,home:g.home,group:g.group,day:g.day,time:g.time,
   neutral:!!g.neutral,kickoff:g.kickoff}));
  if(!newGames.every(g=>NAMES[g.home]&&NAMES[g.away]&&g.id.startsWith("w"+latestWeek+"-")))return;
  if(feed.previousWeek>=6&&feed.previousGames?.length>=10)
   weekScores.set(feed.previousWeek,feed.previousGames);
  GAMES=newGames;
  activeWeek=latestWeek;
  state=readWeekState(activeWeek,GAMES);
  updateScouting();
  cloudStatus="Connecting weekly cloud…";
  render();
  const started=localRevision;
  try{
   const cloud=await cloudRequest("loadWeek",{season:2026,week:activeWeek});
   if(cloud.state&&started===localRevision){
    const remote=restoreRemoteWeek(cloud.state,GAMES);
    if(remote.updatedAt>=state.updatedAt){
     state=remote;
     try{localStorage.setItem(WEEKLY_PREFIX+activeWeek,JSON.stringify(state));}catch{}
    }
   }
   cloudStatus="Cloud connected";
  }catch{cloudStatus="Local backup · sync offline";}
  // queueCloudSave is suppressed during activation. Defer it until the
  // new week has finished loading so edits made mid-transition are preserved.
  saveAfterActivation=Boolean(localRevision>started||(state.updatedAt&&!cloudStatus.includes("offline")));
  window.WTActiveWeekData={week:activeWeek,games:GAMES};
  document.dispatchEvent(new Event("wt-week-changed"));
  render();
 }finally{
  activatingWeek=false;
  if(saveAfterActivation)queueCloudSave();
 }
 // Load existing final results and older selections without blocking the week switch.
 for(let wk=6;wk<activeWeek;wk++){
  if(wk===6&&weekScores.has(6))continue;
  if(wk>=7&&previousWeeks.has(wk))continue;
  await historicalWeek(wk);
 }
 updateSeasonStrip();
 if(tab==="history")render();
}
window.WTActiveWeekData={week:activeWeek,games:GAMES};
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkWeek();});
setInterval(()=>{if(!document.hidden)checkWeek();},60000);

function escape(s){return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function logo(a){return "https://a.espncdn.com/i/teamlogos/nfl/500/"+(LOGOS[a]||a).toLowerCase()+".png";}
function fmt(n){return Number(n).toFixed(1);}
const summary={wins:HISTORY.filter(x=>x.status==="W").length,losses:HISTORY.filter(x=>x.status==="L").length,ties:HISTORY.filter(x=>x.status==="T").length};
if(HISTORY.length!==79||summary.wins!==54||summary.losses!==24||summary.ties!==1){document.getElementById("app").textContent="Historical data did not pass the 79-pick checksum.";return;}
const pct=(w,l)=>w+l?(100*w/(w+l)):0;
function weekStats(w){const a=HISTORY.filter(x=>x.week===w);const won=a.filter(x=>x.status==="W").length, lost=a.filter(x=>x.status==="L").length,tied=a.filter(x=>x.status==="T").length;return {week:w,wins:won,losses:lost,ties:tied,record:won+"–"+lost+(tied?"–"+tied+"T":""),rate:pct(won,lost),games:a};}
const weeks=[1,2,3,4,5].map(weekStats);
function weekSixResults(){
 const feed=weekScores.get(6)||(activeWeek===6&&Array.isArray(window.WTScoreGames)?window.WTScoreGames:[]);
 const finals=new Map(feed.filter(g=>g&&g.state==="post").map(g=>[g.away+"-"+g.home,g]));
 const games=LEGACY_GAMES.map(game=>{
  const pick=week6State?.picks?.[game.id],r=finals.get(game.away+"-"+game.home);
  if(!pick||![game.away,game.home].includes(pick)||!r||r.awayScore==null||r.homeScore==null)return null;
  const away=Number(r.awayScore),home=Number(r.homeScore);
  if(!Number.isFinite(away)||!Number.isFinite(home))return null;
  const winner=away===home?"T":away>home?game.away:game.home;
  return {week:6,away:game.away,home:game.home,pick,awayScore:away,homeScore:home,status:winner==="T"?"T":winner===pick?"W":"L"};
 }).filter(Boolean);
 const wins=games.filter(g=>g.status==="W").length,losses=games.filter(g=>g.status==="L").length,ties=games.filter(g=>g.status==="T").length;
 return {week:6,games,wins,losses,ties,record:wins+"–"+losses+(ties?"–"+ties+"T":""),rate:pct(wins,losses)};
}
function gradeWeek(week,games,picks,scores){
 const finals=new Map((scores||[]).filter(g=>g&&g.state==="post").map(g=>[g.away+"-"+g.home,g]));
 const entries=(games||[]).map(game=>{
  const pick=picks?.[game.id],result=finals.get(game.away+"-"+game.home);
  if(!pick||![game.away,game.home].includes(pick)||!result||result.awayScore==null||result.homeScore==null)return null;
  const away=Number(result.awayScore),home=Number(result.homeScore);
  if(!Number.isFinite(away)||!Number.isFinite(home))return null;
  const winner=away===home?"T":away>home?game.away:game.home;
  return {week,away:game.away,home:game.home,pick,awayScore:away,homeScore:home,
   status:winner==="T"?"T":winner===pick?"W":"L"};
 }).filter(Boolean);
 const wins=entries.filter(x=>x.status==="W").length,losses=entries.filter(x=>x.status==="L").length,ties=entries.filter(x=>x.status==="T").length;
 return {week,games:entries,wins,losses,ties,record:wins+"–"+losses+(ties?"–"+ties+"T":""),rate:pct(wins,losses)};
}
function allScoredWeeks(){
 const w6=weekSixResults();
 const past=[w6,...[...previousWeeks.values()].sort((a,b)=>a.week-b.week)];
 if(activeWeek>6)past.push(gradeWeek(activeWeek,GAMES,state.picks,weekScores.get(activeWeek)||[]));
 return past.filter(x=>x.games.length);
}
function seasonTotals(){
 const w6=weekSixResults(),scored=allScoredWeeks();
 const wins=summary.wins+scored.reduce((n,x)=>n+x.wins,0),losses=summary.losses+scored.reduce((n,x)=>n+x.losses,0),ties=summary.ties+scored.reduce((n,x)=>n+x.ties,0);
 return {wins,losses,ties,accuracy:pct(wins,losses).toFixed(2),record:wins+"–"+losses+"–"+ties+"T",week6:w6,scored};
}
window.WTSeasonTotals=seasonTotals;
function updateSeasonStrip(){
 const x=seasonTotals(),r=document.querySelector(".season-strip .record"),a=document.querySelector(".season-strip .metric strong");
 if(r)r.innerHTML=x.record+" <span>2026</span>";
 if(a)a.textContent=x.accuracy+"%";
}

/* Current cloud-aware choices are exposed read-only for the optional Apple Share panel. */
window.WTAppleSnapshot = function () {
 const totals=seasonTotals(),allWeeks=weeks.concat(totals.scored);
 return {
  week: activeWeek,
  picks: GAMES.map(g => ({
   away: g.away, home: g.home, group: g.group, day: g.day,
   time: g.time, choice: state.picks[g.id] || ""
  })),
  mnfMargin: state.mnfMargin,
  season: { wins: totals.wins, losses: totals.losses, ties: totals.ties,
   accuracy: totals.accuracy },
  weeks: allWeeks.map(w => ({ week: w.week, wins: w.wins, losses: w.losses,
    ties: w.ties, record: w.record, rate: w.rate.toFixed(2),
    games: w.games.map(g => ({
      away: g.away, home: g.home, pick: g.pick,
      awayScore: g.awayScore, homeScore: g.homeScore, status: g.status
    })) }))
 };
};

function teamStats(){
 const ts=Object.fromEntries(Object.keys(NAMES).map(abbr=>[abbr,{abbr,w:0,l:0,t:0,pf:0,pa:0,elo:1500,games:[],chosen:0,right:0,wrong:0,drawn:0,opp:[]}]));
 // Sequential Elo with a capped margin factor and home field adjustment.
 HISTORY.forEach(g=>{
   const a=ts[g.away],h=ts[g.home];
   const diff=(h.elo+45)-a.elo;
   const expected=1/(1+Math.pow(10,diff/400));
   const actual=g.tie?.5:(g.winner===g.away?1:0);
   const margin=Math.abs(g.awayScore-g.homeScore);
   const shift=25*(1+Math.min(21,margin)/35)*(actual-expected);
   a.elo+=shift;h.elo-=shift;
   const outcomeA=g.tie?"T":g.winner===g.away?"W":"L";
   const outcomeH=g.tie?"T":g.winner===g.home?"W":"L";
   for(const [team,other,scored,against,result] of [[a,h,g.awayScore,g.homeScore,outcomeA],[h,a,g.homeScore,g.awayScore,outcomeH]]){
     if(result==="W")team.w++;else if(result==="L")team.l++;else team.t++;
     team.pf+=scored;team.pa+=against;
     team.opp.push(other.abbr);team.games.push({week:g.week,result});
   }
   const p=ts[g.pick];p.chosen++;
   if(g.status==="W")p.right++;if(g.status==="L")p.wrong++;if(g.status==="T")p.drawn++;
 });
 for(const t of Object.values(ts)){
   t.sos=t.opp.length?t.opp.reduce((sum,o)=>sum+pct(ts[o].w,ts[o].l),0)/t.opp.length:50;
   t.diff=t.pf-t.pa;
   t.form=t.games.slice(-3).map(x=>x.result).join(" ");
   t.rate=pct(t.w,t.l);t.pickRate=pct(t.right,t.wrong);
 }
 const sorted=Object.values(ts).sort((a,b)=>b.elo-a.elo);
 sorted.forEach((t,i)=>{t.rank=i+1;t.grade=t.elo>=1555?"A":t.elo>=1530?"B+":t.elo>=1510?"B":t.elo>=1490?"C":t.elo>=1470?"D": "F";});
 return ts;
}
const TS=teamStats();
function updateScouting(){window.WTScouting={teams:Object.fromEntries(Object.entries(TS).map(([id,t])=>[id,{pa:t.pa,pf:t.pf,games:t.games.length,elo:t.elo}])),games:GAMES.map(g=>({away:g.away,home:g.home,id:g.id,state:"pre"}))};}
updateScouting();
function forecast(g){
 const away=TS[g.away],home=TS[g.home];
 const advantage=g.neutral?0:state.homeEdge;
 const hp=1/(1+Math.pow(10,(away.elo-home.elo-advantage)/400));
 const probability=Math.max(hp,1-hp),choice=hp>=.5?g.home:g.away;
 const strength=Math.abs(home.elo-away.elo-advantage);
 const confidence=probability>=.62?"Higher":probability>=.55?"Moderate":"Toss-up";
 return {...g,choice,probability,confidence,spread:strength,awayTeam:away,homeTeam:home,
   explanation:(NAMES[choice]+" leads the five-week Elo-style rating comparison; "+
     (g.neutral?"neutral-site game, no home advantage applied.":"a "+advantage+"-point rating home adjustment is applied.")+
     " Opponent-strength ratings: "+NAMES[g.away]+" "+fmt(away.sos)+"%, "+NAMES[g.home]+" "+fmt(home.sos)+"%.")};
}
function allForecasts(){return GAMES.map(forecast);}
function recordText(x){return x.w+"–"+x.l+(x.t?"–"+x.t+"T":"");}
function pickRecord(t){return t.chosen?t.right+"–"+t.wrong+(t.drawn?"–"+t.drawn+"T":""):"—";}
function tinyLogo(team){return '<img class="wt-logo" src="'+logo(team)+'" alt="" loading="lazy">';}
function outcomeClass(g){return g.status==="W"?"wt-win":g.status==="L"?"wt-loss":"wt-tie";}
function toast(msg){const el=document.createElement("div");el.className="toast";el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2200);}
function render(){
 document.body.dataset.wtView=tab;
 document.querySelectorAll(".tab").forEach(b=>{b.classList.toggle("active",b.dataset.tab===tab);b.setAttribute("aria-selected",b.dataset.tab===tab?"true":"false");});
 updateSeasonStrip();
 const pages={home:homePage,live:()=>"",fantasy:()=>'<section class="wt-fantasy-page"><header class="wt-fantasy-page-head"><h2>Fantasy · Week '+activeWeek+'</h2></header><div id="wt-manual-fantasy-root">'+(window.WTManualFantasy?.toolbar?.()||'<div class="empty">Loading roster…</div>')+'</div><section class="wt-fantasy-games-section"><h3>My players · NFL games</h3><div id="wt-fantasy-games"></div></section></section>',picks:picksPage,intel:intelPage,teams:teamsPage,history:historyPage,data:dataPage};
 document.getElementById("app").innerHTML=(pages[tab]||homePage)();
}
function section(title,sub,body){return '<section class="section"><div class="section-head"><h2>'+title+'</h2></div>'+body+'</section>';}
function cardMetric(label,value,foot){return '<div class="summary-item"><small>'+label+'</small><strong>'+value+'</strong></div>';}
function homePage(){
 const picked=GAMES.filter(g=>state.picks[g.id]).length;
 return section("Week "+activeWeek,"",'<div class="panel focus-row"><div class="focus-copy"><strong>'+picked+' of '+GAMES.length+' picks saved</strong><span>'+(GAMES[0]?escape(GAMES[0].away+" @ "+GAMES[0].home+" · "+GAMES[0].day+" "+GAMES[0].time+" ET"):"Schedule loading")+'</span></div><div class="counter">'+picked+'/'+GAMES.length+'</div></div>'+
 '<div class="action-row"><button class="btn primary" data-go="picks">Edit picks</button><button class="btn" data-go="fantasy">Fantasy players</button><button class="btn" data-go="intel">Matchups</button></div>');
}
function pickCard(f){
 const chosen=state.picks[f.id]||"",canPick=!state.locked;
 return '<article class="wt-game-card"><div class="wt-card-head"><strong>'+f.day+' · '+f.time+' ET</strong><span>'+f.group+(f.neutral?" · Neutral":"")+'</span></div>'+
 [f.away,f.home].map(t=>'<button type="button" class="wt-team-option '+(chosen===t?"is-selected":"")+'" data-pick="'+f.id+'" data-team="'+t+'" '+(canPick?"":"disabled")+'>'+tinyLogo(t)+'<span>'+NAMES[t]+'</span><small>'+t+' · '+recordText(TS[t])+'</small><i>'+(chosen===t?"✓":"○")+'</i></button>').join("")+
 '<div class="wt-card-foot"><span>MODEL: <strong>'+f.choice+'</strong> · '+Math.round(f.probability*100)+'%</span><span class="'+(chosen&&chosen!==f.choice?"wt-red":"wt-muted")+'">'+(chosen?(chosen===f.choice?"Agrees with model":"Against model"):"Not picked")+'</span></div></article>';
}
function picksPage(){
 const forecasts=allForecasts(),groups=[...new Set(forecasts.map(f=>f.group))];
 return section("Week "+activeWeek+" Picks","",
 '<div class="wt-edit-toolbar" role="group" aria-label="Pick controls">'+
 '<button type="button" class="btn" data-action="edit" '+(!state.locked?'disabled':'')+'>Edit picks</button>'+
 '<button type="button" class="btn primary" data-action="save-lock" '+(state.locked?'disabled':'')+'>Save & Lock</button>'+
 '<button type="button" class="btn" data-action="save">Save picks</button>'+
 '<button type="button" class="btn" data-action="sync-device" '+(syncingDevice||initialCloudLoad||activatingWeek?'disabled':'')+'>Sync & Verify</button>'+
 '<span class="wt-cloud-status" role="status">'+escape(cloudStatus)+'</span></div>'+
 groups.map(group=>'<div class="wt-group"><div class="group-label">'+group+'</div><div class="wt-match-grid">'+forecasts.filter(f=>f.group===group).map(pickCard).join("")+'</div></div>').join(""))+
 section("Monday Night Tiebreaker","",'<div class="tiebreak-grid"><div class="field"><label>Winning margin · '+(GAMES.filter(g=>g.group==="Monday Night").map(g=>g.away+" @ "+g.home).join(" / ")||"Monday Night Football")+'</label><input aria-label="MNF predicted winning margin" type="number" min="0" max="200" data-margin="mnfMargin" value="'+escape(state.mnfMargin)+'" '+(state.locked?'disabled':'')+' placeholder="Margin"></div></div>');
}
function intelCard(f){
 const chosen=state.picks[f.id];
 return '<article class="wt-intel-card"><div class="wt-intel-top"><span>'+f.day+' · '+f.time+' ET</span><span>'+f.confidence+' signal</span></div>'+
 '<div class="wt-intel-match">'+tinyLogo(f.away)+'<strong>'+f.away+'</strong><span>@</span>'+tinyLogo(f.home)+'<strong>'+f.home+'</strong></div>'+
 '<div class="wt-prob"><div class="wt-prob-fill" style="width:'+(Math.round(f.probability*100))+'%"></div></div>'+
 '<div class="wt-intel-result"><div><small>Model lean</small><strong>'+f.choice+' · '+Math.round(f.probability*100)+'%</strong></div><div><small>Your pick</small><strong class="'+(chosen&&chosen!==f.choice?"wt-red":"")+'">'+(chosen||"Unselected")+'</strong></div></div>'+
 '<p class="wt-explain">'+f.explanation+'</p>'+
 '<div class="wt-factor-grid"><span>'+f.away+': <strong>'+recordText(f.awayTeam)+'</strong> · Elo '+Math.round(f.awayTeam.elo)+'</span><span>'+f.home+': <strong>'+recordText(f.homeTeam)+'</strong> · Elo '+Math.round(f.homeTeam.elo)+'</span></div>'+
 '<div class="wt-card-foot"><span>Your history picking '+f.choice+': '+pickRecord(TS[f.choice])+'</span><button class="btn wt-small-btn" data-pick="'+f.id+'" data-team="'+f.choice+'" '+(state.locked?"disabled":"")+'>'+(chosen===f.choice?"Selected":"Use model lean")+'</button></div></article>';
}
function intelPage(){
 const sorted=allForecasts().sort((a,b)=>b.probability-a.probability);
 const filtered=sorted.filter(f=>intelFilter==="close"?f.probability<.56:intelFilter==="against"?state.picks[f.id]&&state.picks[f.id]!==f.choice:true);
 const close=sorted.filter(f=>f.probability<.56).length,against=sorted.filter(f=>state.picks[f.id]&&state.picks[f.id]!==f.choice).length;
 return section("The Workhorse","Week "+activeWeek+" · data-driven matchup research",
 '<div class="wt-intro"><span class="wt-model-tag">ELO-STYLE • EXPLAINABLE</span><h3>See the evidence before the pick.</h3><p>79 completed games drive the team ratings. Compare opponent strength, recent performance, personal picks, and model estimates. These probabilities are preliminary, uncalibrated estimates—not guarantees.</p></div>'+
 '<div class="wt-info-bar"><span>'+close+' near-tossups</span><span>'+against+' disagreements with your selections</span></div>'+
 '<div class="wt-controls"><label>Home field rating edge <select id="homeEdge" aria-label="Home-field rating edge">'+[0,25,45,65,85].map(n=>'<option value="'+n+'" '+(state.homeEdge===n?"selected":"")+'>'+n+' Elo points</option>').join("")+'</select></label><label>Scouting view <select id="intelFilter"><option value="all" '+(intelFilter==="all"?"selected":"")+'>All games · strongest first</option><option value="close" '+(intelFilter==="close"?"selected":"")+'>Near-tossups</option><option value="against" '+(intelFilter==="against"?"selected":"")+'>My picks vs model</option></select></label></div>'+
 '<div class="wt-intel-grid">'+(filtered.length?filtered.map(intelCard).join(""):'<div class="empty">No games match this filter.</div>')+'</div>')+
 '<div class="note"><strong>Model methodology:</strong> All teams start at rating 1500. Ratings update after each imported score using winner, losing margin and expected outcome (25 K factor, capped margin multiplier). London is treated as neutral. Strength of schedule is the average winning percentage of opponents from the imported games. The five-week dataset is limited. No live injuries, betting lines, player availability, or LLM feed is connected; use this as one input, not an automatic pick generator.</div>';
}
function teamsPage(){
 const opts={rating:"Model rating",record:"Win percentage",sos:"Schedule strength",diff:"Point differential",picks:"Your picking accuracy"};
 const arr=Object.values(TS).sort((a,b)=>{
 if(teamSort==="record")return b.rate-a.rate||b.elo-a.elo;
 if(teamSort==="sos")return b.sos-a.sos;
 if(teamSort==="diff")return b.diff-a.diff;
 if(teamSort==="picks")return b.pickRate-a.pickRate||b.chosen-a.chosen;
 return b.elo-a.elo;
 });
 return section("32-Team Intelligence","Through Week 5 · all imported results",
 '<div class="wt-controls"><label>Rank by <select id="teamSort">'+Object.entries(opts).map(([v,t])=>'<option value="'+v+'" '+(teamSort===v?"selected":"")+'>'+t+'</option>').join("")+'</select></label></div>'+
 '<div class="table-wrap wt-overflow"><table><thead><tr><th>Team</th><th>Record</th><th>Grade</th><th>Elo</th><th>PD</th><th>SOS</th><th>My picks</th></tr></thead><tbody>'+
 arr.map(t=>'<tr><td class="wt-name">'+tinyLogo(t.abbr)+'<span><strong>'+NAMES[t.abbr]+'</strong><small>'+t.abbr+' · #'+t.rank+'</small></span></td><td>'+recordText(t)+'</td><td><b class="wt-grade">'+t.grade+'</b></td><td>'+Math.round(t.elo)+'</td><td class="'+(t.diff>=0?"good":"wt-red")+'">'+(t.diff>0?"+":"")+t.diff+'</td><td>'+fmt(t.sos)+'%</td><td>'+pickRecord(t)+'<small class="wt-table-sub">'+(t.chosen?fmt(t.pickRate)+"%":"No picks")+'</small></td></tr>').join("")+'</tbody></table></div>')+
 '<div class="note"><strong>Definitions:</strong> PD = point differential in the 79 imported results; SOS = average final opponent win percentage; grade is a preliminary rating tier, not an official NFL grade. Personal success picking a team is shown separately from the forecast, to avoid treating your history as proof of future results.</div>';
}
function historyPage(){
 const t=seasonTotals(),all=weeks.concat(t.scored);
 return section("Your Pick History","",
 '<div class="panel summary-grid">'+cardMetric("Wins",String(t.wins),"Correct")+cardMetric("Losses",String(t.losses),"Incorrect")+cardMetric("Ties",String(t.ties),"No winner")+'</div>'+
 '<div class="wt-history-season-line">Overall <strong>'+t.record+'</strong><span>'+t.accuracy+'% accuracy</span><small>'+(79+t.scored.reduce((n,w)=>n+w.games.length,0))+' graded picks</small></div>'+
 '<div class="wt-history-weeks">'+all.map(w=>'<details class="wt-week" '+(w.week===(all.length?all.at(-1).week:5)?"open":"")+'><summary><span><strong>Week '+w.week+'</strong><small>'+w.games.length+(w.week===6?" final results":" selections")+'</small></span><strong>'+w.record+'</strong><span>'+fmt(w.rate)+'%</span></summary><div class="wt-history-table"><table><thead><tr><th>Game</th><th>Pick</th><th>Final</th><th>Grade</th></tr></thead><tbody>'+
 w.games.map(g=>'<tr><td>'+g.away+' @ '+g.home+'</td><td><strong>'+g.pick+'</strong></td><td>'+g.awayScore+'–'+g.homeScore+'</td><td><span class="'+outcomeClass(g)+'">'+(g.status==="W"?"✓ Win":g.status==="L"?"✕ Loss":"T Tie")+'</span></td></tr>').join("")+'</tbody></table></div></details>').join("")+'</div>')+
 '<div class="note"><strong>Weeks 1–5:</strong> 54–24–1T verified. Later completed picks are graded from NFL final scores and your saved selections. Tied games do not count toward accuracy.</div>';
}
function dataPage(){
 const json=JSON.stringify({version:3,scope:"browser-picks-only",week:activeWeek,...state},null,2);
 return section("Data / Backup","Secure cloud sync and local backup",
 '<div class="sp-sync-panel"><strong>Device sync</strong> · '+escape(cloudStatus)+'. <button class="btn" type="button" data-action="sync-device" '+(syncingDevice||initialCloudLoad||activatingWeek?'disabled':'')+'>Sync & Verify this device</button>'+(lastDeviceSync?'<p>'+escape(lastDeviceSync)+'</p>':'')+'<p>Open this from the iPhone home-screen app that holds your original picks. Safari may keep separate local data.</p></div>'+
 '<div class="note"><strong>Verified history cannot be overwritten by imported backups.</strong> Weekly picks can sync through the private admin database when online. You can also export or import a local JSON backup.</div>'+
 '<div class="data-grid wt-data-grid"><div class="field"><label>Export local picks</label><textarea readonly id="exportBox">'+escape(json)+'</textarea><div class="action-row"><button class="btn" data-action="copy">Copy backup</button></div></div><div class="field"><label>Import local picks</label><textarea id="importBox" placeholder="Paste WHOLE THANG backup JSON"></textarea><div class="action-row"><button class="btn primary" data-action="import">Import picks</button><button class="btn danger" data-action="reset">Reset local picks</button></div></div></div>')+
 '<div class="note"><strong>Data source:</strong> Supplied Week 1–5 pick log and final scores, last updated October 12, 2026. All 79 selections are preserved as historical data. Additional completed picks are graded automatically from final NFL scores.</div>';
}

function weekHasSavedData(candidate) {
 return !!candidate && (
  Object.keys(candidate.picks || {}).length > 0 ||
  candidate.mnfMargin !== "" && candidate.mnfMargin != null ||
  candidate.locked === true
 );
}
function normalizedCloudWeek(remote, week, games) {
 if(week !== 6) return restoreRemoteWeek(remote, games);
 return {...EMPTY(),
  picks: Object.fromEntries(games.filter(g => [g.away,g.home].includes(remote?.picks?.[g.id])).map(g => [g.id,remote.picks[g.id]])),
  mnfMargin: validMargin(remote?.mnf_margin), locked: remote?.locked === true,
  homeEdge: [0,25,45,65,85].includes(Number(remote?.home_edge)) ? Number(remote.home_edge) : 45,
  updatedAt: Date.parse(remote?.updated_at) || 0
 };
}
function sameSavedChoices(a,b) {
 return JSON.stringify(a?.picks || {}) === JSON.stringify(b?.picks || {}) &&
  String(a?.mnfMargin ?? "") === String(b?.mnfMargin ?? "") &&
  !!a?.locked === !!b?.locked &&
  Number(a?.homeEdge ?? 45) === Number(b?.homeEdge ?? 45);
}
function storeCloudWeek(week, recovered) {
 if(week === activeWeek) {
  state = recovered;
  localRevision++;
  render();
 }
 if(week === 6) week6State = recovered;
 try {
  localStorage.setItem(week === 6 ? KEY : WEEKLY_PREFIX+week, JSON.stringify(recovered));
 } catch { /* The cloud copy remains available even when device storage is disabled. */ }
}
async function syncDevice() {
 if(syncingDevice || initialCloudLoad || activatingWeek) return;
 syncingDevice = true;
 let transferred=0, confirmed=0, skipped=0, conflicts=0;
 cloudStatus="Checking this device…";
 lastDeviceSync="";
 render();
 try {
  // The currently opened standalone iPhone app has its own local picks.
  // Check archived device data as well as this week's active selections.
  const stopWeek=activeWeek;
  for(let wk=6;wk<=stopWeek;wk++){
   let games,local;
   if(wk===6){games=LEGACY_GAMES;local=wk===activeWeek?state:week6State;}
   else if(wk===activeWeek){games=GAMES;local=state;}
   else{
    let oldState=null;
    try{oldState=JSON.parse(localStorage.getItem(WEEKLY_PREFIX+wk)||"null");}catch{}
    if(!weekHasSavedData(oldState)){skipped++;continue;}
    const res=await fetch("/api/nfl-scores?mode=week&week="+wk,{credentials:"same-origin"});
    const schedule=await res.json().catch(()=>({}));
    if(!res.ok||!schedule.ok||!Array.isArray(schedule.games)||schedule.games.length<10)
     throw Error("Could not verify Week "+wk+" matchups.");
    games=schedule.games;
    local=readWeekState(wk,games);
   }
   const isCurrent=wk===activeWeek;
   const revision=localRevision;
   const params=wk===6?{}:{season:2026,week:wk};
   const remoteResponse=await cloudRequest(wk===6?"load":"loadWeek",params);
   const remote=remoteResponse.state;
   if(isCurrent && revision!==localRevision)throw Error("Picks changed while syncing. Tap Sync & Verify again.");
   if(remote){
    const remoteCopy=normalizedCloudWeek(remote,wk,games);
    if(isCurrent && remoteCopy.updatedAt > Number(local?.updatedAt||0)){
     // A newer server record takes precedence. Never overwrite it with a stale device.
     storeCloudWeek(wk,remoteCopy);
     confirmed++;
    }else if(isCurrent && !sameSavedChoices(local,remoteCopy) && Number(local?.updatedAt||0)>remoteCopy.updatedAt){
     // User-initiated save of edits from this device, then read back for verification.
     await cloudRequest(wk===6?"save":"saveWeek",{...params,state:local});
     const check=await cloudRequest(wk===6?"load":"loadWeek",params);
     if(!check.state||!sameSavedChoices(local,normalizedCloudWeek(check.state,wk,games)))
      throw Error("Week "+wk+" could not be verified after saving.");
     confirmed++;transferred++;
    }else if(!isCurrent && !sameSavedChoices(local,remoteCopy) && weekHasSavedData(local)){
     // Keep divergent archived histories intact. Do not replace existing cloud choices.
     conflicts++;
    }else{
     if(isCurrent && !sameSavedChoices(local,remoteCopy))storeCloudWeek(wk,remoteCopy);
     confirmed++;
    }
    continue;
   }
   if(!weekHasSavedData(local)){skipped++;continue;}
   if(isCurrent && revision!==localRevision)throw Error("Picks changed while syncing. Tap Sync & Verify again.");
   // Nothing yet saved on the server: recover this device's original selections.
   await cloudRequest(wk===6?"save":"saveWeek",{...params,state:local});
   const check=await cloudRequest(wk===6?"load":"loadWeek",params);
   if(!check.state||!sameSavedChoices(local,normalizedCloudWeek(check.state,wk,games)))
    throw Error("Week "+wk+" could not be verified after uploading.");
   transferred++;confirmed++;
   if(!isCurrent && wk>=7)previousWeeks.set(wk,gradeWeek(wk,games,local.picks,games));
  }
  cloudStatus=confirmed ? "Cloud verified" : "No picks on this device";
  lastDeviceSync=confirmed+" week"+(confirmed===1?"":"s")+" verified"+(transferred?", "+transferred+" uploaded":"")+
   (conflicts?", "+conflicts+" archived conflict"+(conflicts===1?"":"s")+" preserved":"")+
   (skipped?", "+skipped+" empty":"")+".";
  if(conflicts)cloudStatus="Review archived differences";
  toast(conflicts?"Cloud kept existing older picks; local copies preserved.":"Device sync check complete.");
 }catch(error){
  cloudStatus="Sync needs attention";
  lastDeviceSync=String(error?.message||"Connection unavailable.");
  toast("Device sync: "+lastDeviceSync);
 }finally{
  syncingDevice=false;
  render();
 }
}
function switchTab(next){if(!["home","live","fantasy","picks","intel","teams","history","data"].includes(next))return;tab=next;render();const m=document.getElementById("wt-more-menu"),b=document.getElementById("wt-more-toggle");if(m)m.hidden=true;if(b)b.setAttribute("aria-expanded","false");window.scrollTo({top:0,behavior:"smooth"});}
document.querySelectorAll(".tab").forEach(el=>el.addEventListener("click",()=>switchTab(el.dataset.tab)));
document.addEventListener("click",async function(e){
 const nav=e.target.closest("[data-go]");if(nav){switchTab(nav.dataset.go);return;}
 const target=e.target.closest("[data-pick]");
 if(target){if(state.locked)return;const g=GAMES.find(g=>g.id===target.dataset.pick);if(!g||![g.away,g.home].includes(target.dataset.team))return;
 state.picks[g.id]=target.dataset.team;save();render();return;}
 const action=e.target.closest("[data-action]");if(!action)return;
 switch(action.dataset.action){
 case "save":save();toast("Saved locally; cloud sync requested.");break;
 case "sync-device":await syncDevice();break;
 case "edit":
  if(state.locked){state.locked=false;save();render();toast("Editing enabled. Tap a team to update its pick.");}
  else toast("Your picks are already editable. Tap any team to change it.");
  break;
 case "save-lock":
  if(!state.locked){state.locked=true;save();render();toast("Selections saved and locked. Use Edit Picks to change them.");}
  else toast("Selections are already locked.");
  break;
 case "lock":
  state.locked=!state.locked;save();render();
  toast(state.locked?"Selections saved and locked.":"Editing enabled. Tap a team to update its pick.");
  break;
 case "copy":try{await navigator.clipboard.writeText(document.getElementById("exportBox").value);toast("Backup copied.");}catch{toast("Copy unavailable; select the backup text.");}break;
 case "import":try{
 const v=JSON.parse(document.getElementById("importBox").value);
 if(!v||typeof v!=="object"||!v.picks||typeof v.picks!=="object")throw Error("Invalid picks backup");
 state={...EMPTY(),picks:Object.fromEntries(GAMES.filter(g=>[g.away,g.home].includes(v.picks[g.id])).map(g=>[g.id,v.picks[g.id]])),mnfMargin:validMargin(v.mnfMargin),locked:!!v.locked,homeEdge:[0,25,45,65,85].includes(Number(v.homeEdge))?Number(v.homeEdge):45};
 save();render();toast("Picks imported; official history unchanged.");
 }catch{toast("Invalid picks backup.");}break;
 case "reset":if(confirm("Clear Week "+activeWeek+" picks and settings? Verified results will stay.")){state=EMPTY();save();render();toast("Current week picks reset.");}break;
 }
});
document.addEventListener("change",e=>{
 if(e.target.id==="homeEdge"){state.homeEdge=Number(e.target.value);save();render();}
 if(e.target.id==="teamSort"){teamSort=e.target.value;render();}
 if(e.target.id==="intelFilter"){intelFilter=e.target.value;render();}
 if(e.target.matches("[data-margin]")){state[e.target.dataset.margin]=validMargin(e.target.value);save();}
});
document.addEventListener("click",event=>{
 const trigger=event.target.closest("[data-wt-menu]");
 const menu=document.getElementById("wt-more-menu"),toggle=document.getElementById("wt-more-toggle");
 if(!menu||!toggle)return;
 if(trigger){menu.hidden=!menu.hidden;toggle.setAttribute("aria-expanded",String(!menu.hidden));return;}
 const action=event.target.closest("[data-wt-open]");
 if(action){document.getElementById(action.dataset.wtOpen==="apple"?"wt-apple-open":"wt-media-launch")?.click();menu.hidden=true;toggle.setAttribute("aria-expanded","false");return;}
 if(!event.target.closest(".wt-more-wrap")){menu.hidden=true;toggle.setAttribute("aria-expanded","false");}
});
document.addEventListener("keydown",event=>{if(event.key==="Escape"){const m=document.getElementById("wt-more-menu"),b=document.getElementById("wt-more-toggle");if(m)m.hidden=true;if(b)b.setAttribute("aria-expanded","false");}});
document.addEventListener("wt-scores-ready",()=>{if(activeWeek===6&&Array.isArray(window.WTScoreGames))weekScores.set(6,window.WTScoreGames);if(activeWeek>6&&Array.isArray(window.WTScoreGames))weekScores.set(activeWeek,window.WTScoreGames);if(tab==="history")render();else updateSeasonStrip();});
render();
initCloud();
})();