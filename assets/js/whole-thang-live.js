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

/* Apple Sports-inspired presentation, retaining independent $billi-type branding. */
let sportsDay="auto",sportsScope="all",openedGame=null,detailView="stats",detailRequest=0;
const detailCache=new Map();
let favorites=new Set();
try{favorites=new Set(JSON.parse(localStorage.getItem("wt-sports-favorites")||"[]").filter(x=>/^[A-Z]{2,3}$/.test(x)));}catch{}
const fullNames={ARI:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",CAR:"Panthers",CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",DEN:"Broncos",DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",JAX:"Jaguars",KC:"Chiefs",LAC:"Chargers",LAR:"Rams",LV:"Raiders",MIA:"Dolphins",MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",NYJ:"Jets",PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",TB:"Buccaneers",TEN:"Titans",WAS:"Commanders"};
const teamColors={ARI:"#972c3e",ATL:"#a6192e",BAL:"#523a84",BUF:"#134c9c",CAR:"#1576aa",CHI:"#af541b",CIN:"#ab411a",CLE:"#a24e1c",DAL:"#234e82",DEN:"#bc531b",DET:"#137b9e",GB:"#285733",HOU:"#184f60",IND:"#20558d",JAX:"#18675e",KC:"#a52632",LAC:"#147aa6",LAR:"#20529f",LV:"#5e6269",MIA:"#117e87",MIN:"#60418b",NE:"#284b75",NO:"#9d854c",NYG:"#174c94",NYJ:"#276044",PHI:"#155d60",PIT:"#b99623",SEA:"#286b69",SF:"#a42b31",TB:"#ac4930",TEN:"#2b5b90",WAS:"#813b43"};
const dateFormatter=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"});
function dateStamp(date){const p=Object.fromEntries(dateFormatter.formatToParts(date).map(q=>[q.type,q.value]));return p.year+"-"+p.month+"-"+p.day;}
function nflKickoff(game){
 if(game.kickoff){const d=new Date(game.kickoff);if(Number.isFinite(d.getTime()))return d;}
 const match=String(game.day||"").match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
 if(!match)return null;
 const d=new Date(match[1]+" "+match[2]+", 2026 12:00:00");
 return Number.isFinite(d.getTime())?d:null;
}
function sportsDateClass(game){
 const kickoff=nflKickoff(game);
 if(!kickoff)return "week";
 const now=new Date();
 const today=dateStamp(now);
 const yesterday=dateStamp(new Date(now.getTime()-86400000));
 const day=dateStamp(kickoff);
 if(day===yesterday)return "yesterday";
 if(day===today)return "today";
 if(day>today)return "upcoming";
 return "past";
}
function resolvedDay(){
 if(sportsDay!=="auto")return sportsDay;
 if(GAMES.some(g=>sportsDateClass(g)==="today"))return "today";
 if(GAMES.some(g=>sportsDateClass(g)==="upcoming"))return "upcoming";
 return "week";
}
function matchupAccent(game){return teamColors[game.home]||"#24587e";}
function toggleFavorite(team){
 if(favorites.has(team))favorites.delete(team);else favorites.add(team);
 try{localStorage.setItem("wt-sports-favorites",JSON.stringify([...favorites]));}catch{}
 ensure();
 if(openedGame)renderGameSheet();
}
function sportsGameCard(item){
 const {game,result:x,choice,verdict:outcome}=item;
 const inPlay=x?.state==="in",final=x?.state==="post",hasScores=x&&x.state!=="pre";
 const away=x?.awayScore==null?null:Number(x.awayScore),home=x?.homeScore==null?null:Number(x.homeScore);
 const awayWon=final&&away!==null&&home!==null&&Number.isFinite(away)&&Number.isFinite(home)&&away>home;
 const homeWon=final&&away!==null&&home!==null&&Number.isFinite(away)&&Number.isFinite(home)&&home>away;
 const status=inPlay?label(x):final?"Final":game.day+" · "+game.time+" ET";
 const choose=choice?"<span class=\"sp-picked\">My pick: "+esc(choice)+"</span>":"";
 const verdictText={correct:"Correct",incorrect:"Incorrect",tied:"Tie",ahead:"Ahead",behind:"Behind",even:"Even",upcoming:"Pending"}[outcome]||"";
 function team(t,side,isWinner){
  const pre=hasScores?score(x,side):"—";
  return '<div class="sp-team '+(final&&!isWinner&&away!==home?"sp-loser":"")+'">'+
   '<img src="'+logo(t)+'" alt="" loading="lazy"><strong class="sp-points">'+esc(pre)+'</strong>'+
   '<span>'+esc(fullNames[t]||t)+'</span></div>';
 }
 const favorite=favorites.has(game.away)||favorites.has(game.home);
 return '<article class="sp-fixture" style="--sp-accent:'+matchupAccent(game)+'" data-sp-card="'+esc(game.id)+'">'+
  '<div class="sp-fixture-top"><span>'+esc(game.group||"NFL · Week "+currentWeek)+'</span>'+
   '<span class="'+(inPlay?"sp-live-tag":"")+'">'+esc(status)+'</span></div>'+
  '<button class="sp-score-open" type="button" data-sp-open="'+esc(game.id)+'" aria-label="Game details: '+esc(fullNames[game.away]||game.away)+' at '+esc(fullNames[game.home]||game.home)+'">'+
   '<div class="sp-scoreline">'+team(game.away,"away",awayWon)+
    '<div class="sp-versus"><span>'+(!hasScores?"@":inPlay?esc(x.clock||"LIVE"):"")+'</span><small>'+(!hasScores?"VS":final?"FINAL":inPlay?"LIVE":"")+'</small></div>'+
    team(game.home,"home",homeWon)+'</div>'+
   '<div class="sp-fixture-footer"><span>'+choose+(verdictText?'<span class="sp-verdict sp-v-'+outcome+'">'+esc(verdictText)+'</span>':"")+'</span><span>Game details ›</span></div>'+
  '</button>'+
  '<div class="sp-star-pair"><button type="button" class="sp-star '+(favorites.has(game.away)?"is-on":"")+'" data-sp-fave="'+esc(game.away)+'" aria-label="'+(favorites.has(game.away)?"Remove favorite ":"Favorite ")+esc(fullNames[game.away])+'" aria-pressed="'+favorites.has(game.away)+'">★</button>'+
  '<button type="button" class="sp-star '+(favorites.has(game.home)?"is-on":"")+'" data-sp-fave="'+esc(game.home)+'" aria-label="'+(favorites.has(game.home)?"Remove favorite ":"Favorite ")+esc(fullNames[game.home])+'" aria-pressed="'+favorites.has(game.home)+'">★</button></div>'+
  '</article>';
}
function renderGameSheet(){
 let host=document.getElementById("sp-game-sheet");
 if(!openedGame){if(host)host.remove();document.body.classList.remove("sp-modal-open");return;}
 const game=GAMES.find(g=>g.id===openedGame);
 if(!game){openedGame=null;renderGameSheet();return;}
 if(!host){host=document.createElement("div");host.id="sp-game-sheet";host.className="sp-overlay";document.body.appendChild(host);}
 document.body.classList.add("sp-modal-open");
 const scoreResult=get(game),hasScores=scoreResult&&scoreResult.state!=="pre",line=getMarket(game);
 const row=GAMES.findIndex(g=>g.id===game.id),prev=GAMES[(row-1+GAMES.length)%GAMES.length],next=GAMES[(row+1)%GAMES.length];
 const choice=picks()[game.id];
 const detail=detailCache.get(String(scoreResult?.id||""));
 const numbers=detail?.teams||[];
 function teamScore(side,t){
  return '<div class="sp-sheet-team"><img alt="" src="'+logo(t)+'"><strong>'+esc(hasScores?score(scoreResult,side):"—")+'</strong>'+
   '<span>'+esc(fullNames[t]||t)+'</span>'+
   '<button type="button" data-sp-fave="'+esc(t)+'" aria-pressed="'+favorites.has(t)+'" aria-label="'+(favorites.has(t)?"Remove favorite ":"Favorite ")+esc(fullNames[t]||t)+'">'+(favorites.has(t)?"★ Following":"☆ Follow")+'</button></div>';
 }
 const statTab='<div class="sp-sheet-tabs">'+[["stats","Stats"],["plays","Scoring"],["odds","Odds"],["players","My players"]].map(([id,label])=>
  '<button type="button" data-sp-panel="'+id+'" class="'+(detailView===id?"selected":"")+'">'+label+'</button>').join("")+'</div>';
 let section="";
 if(detailView==="stats"){
  if(detail===null||detail===undefined)section='<p class="sp-no-data">'+(scoreResult?.id?"Loading team statistics…":"Detailed statistics are unavailable for this game.")+'</p>';
  else{
   const quarters=detail.quarters||[];
   section=quarters.some(q=>q.scores.length)?'<div class="sp-sheet-table-wrap"><table class="sp-quarter-table"><thead><tr><th>Team</th>'+
    Array.from({length:Math.max(...quarters.map(q=>q.scores.length),4)},(_,i)=>'<th>'+(i===4?"OT":i+1)+'</th>').join("")+'</tr></thead><tbody>'+
    quarters.map(q=>'<tr><th>'+esc(q.team)+'</th>'+Array.from({length:Math.max(...quarters.map(x=>x.scores.length),4)},(_,i)=>'<td>'+esc(q.scores[i]??"—")+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>':"";
   const keys=["totalYards","netPassingYards","rushingYards","firstDowns","thirdDownEff","turnovers","possessionTime"];
   const map=Object.fromEntries(numbers.map(t=>[t.team,Object.fromEntries(t.stats.map(s=>[s.key,s]))]));
   const awayMap=map[game.away]||{},homeMap=map[game.home]||{};
   const rows=keys.filter(k=>awayMap[k]||homeMap[k]).map(k=>'<div class="sp-stat-row"><strong>'+esc(awayMap[k]?.value||"—")+'</strong><span>'+esc(awayMap[k]?.label||homeMap[k]?.label||k)+'</span><strong>'+esc(homeMap[k]?.value||"—")+'</strong></div>').join("");
   section+=rows?'<div class="sp-stats">'+rows+'</div>':'<p class="sp-no-data">Team statistics are not available yet.</p>';
  }
 }else if(detailView==="plays"){
  const plays=detail?.scoring||[];
  section=detail===undefined?'<p class="sp-no-data">Loading scoring plays…</p>':
    plays.length?plays.map(p=>'<div class="sp-play"><small>Q'+esc(p.period||"—")+' · '+esc(p.clock)+'</small><span>'+esc(p.text)+'</span><strong>'+esc(p.awayScore)+' – '+esc(p.homeScore)+'</strong></div>').join(""):
    '<p class="sp-no-data">No scoring plays available.</p>';
 }else if(detailView==="odds"){
  const awaySp=Number.isFinite(line?.awaySpread)?displaySpread(line.awaySpread):"—",homeSp=Number.isFinite(line?.homeSpread)?displaySpread(line.homeSpread):"—";
  const total=Number.isFinite(line?.overUnder)?String(line.overUnder):"—";
  const money=v=>Number.isFinite(v)?(v>0?"+":"")+String(v):"—";
  section='<div class="sp-odds-grid"><span>Team</span><span>Spread</span><span>Total</span><span>Moneyline</span>'+
   '<strong>'+esc(game.away)+'</strong><strong>'+esc(awaySp)+'</strong><strong>'+esc(total)+'</strong><strong>'+esc(money(line?.awayMoneyline))+'</strong>'+
   '<strong>'+esc(game.home)+'</strong><strong>'+esc(homeSp)+'</strong><strong>'+esc(total)+'</strong><strong>'+esc(money(line?.homeMoneyline))+'</strong></div>'+
   '<p class="sp-no-data">'+esc(line?.provider||"Pregame lines unavailable")+' · O/U is the combined-game point total.</p>';
 }else if(detailView==="players"){
  const rows=window.WTManualFantasy?.gameRows?.(game,scoreResult)||"";
  section=rows||'<p class="sp-no-data">No tracked fantasy players in this matchup.</p>';
 }
 host.innerHTML='<div class="sp-scrim" data-sp-close="1"></div>'+
 '<section class="sp-sheet" role="dialog" aria-modal="true" aria-label="'+esc(game.away)+' at '+esc(game.home)+' game details">'+
 '<div class="sp-sheet-handle" aria-hidden="true"></div>'+
 '<div class="sp-sheet-heading"><button type="button" data-sp-close="1" aria-label="Close details">✕</button><span>WEEK '+currentWeek+' · NFL</span><div class="sp-sheet-faves"><button type="button" data-sp-fave="'+esc(game.away)+'" aria-label="Favorite away team" aria-pressed="'+favorites.has(game.away)+'">'+(favorites.has(game.away)?"★":"☆")+'</button><button type="button" data-sp-fave="'+esc(game.home)+'" aria-label="Favorite home team" aria-pressed="'+favorites.has(game.home)+'">'+(favorites.has(game.home)?"★":"☆")+'</button></div></div>'+
 '<p class="sp-sheet-status">'+esc(label(scoreResult))+'</p>'+
 '<div class="sp-sheet-score" style="--sp-accent:'+matchupAccent(game)+'">'+teamScore("away",game.away)+
 '<span class="sp-sheet-mid">'+(hasScores?"–":"@")+'</span>'+teamScore("home",game.home)+'</div>'+
 (choice?'<p class="sp-sheet-pick">My pick · <strong>'+esc(choice)+'</strong></p>':"")+
 statTab+'<div class="sp-sheet-body">'+section+'</div>'+
 '<div class="sp-sheet-nav"><button type="button" data-sp-prev="'+esc(prev.id)+'">‹ Previous game</button><button type="button" data-sp-next="'+esc(next.id)+'">Next game ›</button></div></section>';
}
async function openSportsGame(id){
 const game=GAMES.find(g=>g.id===id);if(!game)return;
 openedGame=id;detailView="stats";renderGameSheet();
 const eventId=String(get(game)?.id||"");
 if(!/^\d{6,12}$/.test(eventId)||detailCache.has(eventId))return;
 const request=++detailRequest;
 try{
  const response=await fetch("/api/nfl-game?event="+encodeURIComponent(eventId),{credentials:"same-origin"});
  const data=await response.json();
  detailCache.set(eventId,response.ok&&data.ok?data:{teams:[],quarters:[],scoring:[]});
 }catch{detailCache.set(eventId,{teams:[],quarters:[],scoring:[]});}
 if(request===detailRequest&&openedGame===id)renderGameSheet();
}
function closeSportsGame(){openedGame=null;detailRequest++;renderGameSheet();}

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

 const todayView=resolvedDay();
 const visible=shown.filter(x=>(todayView==="week"||sportsDateClass(x.game)===todayView)&&
   (sportsScope==="all"||favorites.has(x.game.home)||favorites.has(x.game.away)));
 const banner='<div class="sp-head"><div><small>NFL · 2026 SEASON</small><h1>Scores</h1></div>'+
  '<button type="button" data-sp-scope="1" class="sp-scope" aria-pressed="'+(sportsScope==="favorites")+'">'+
  (sportsScope==="favorites"?"★ My Teams":"☆ My Teams")+'</button></div>';
 const dayTabs='<div class="sp-daytabs" role="group" aria-label="Games by date">'+
  [["yesterday","Yesterday"],["today","Today"],["upcoming","Upcoming"],["week","Full week"]].map(([k,name])=>
  '<button type="button" data-sp-day="'+k+'" class="'+(todayView===k?"selected":"")+'" aria-pressed="'+(todayView===k)+'">'+name+'</button>').join("")+'</div>';
 const weekHead='<div class="sp-league-label"><span>🏈 NFL</span><span>WEEK '+currentWeek+'</span></div>';
 const board='<div class="sp-score-board" aria-label="NFL game scores">'+
  (visible.length?visible.map(sportsGameCard).join(""):
    '<div class="sp-empty"><strong>No games '+(todayView==="week"?"this week":todayView==="upcoming"?"upcoming":todayView==="today"?"today": "yesterday")+'</strong>'+
      '<span>'+(sportsScope==="favorites"?"Favorite a team with ★ or switch to All teams.":"Choose Full week to see every matchup.")+'</span>'+
      '<button type="button" data-sp-day="week">Show full week</button>'+
      (sportsScope==="favorites"?'<button type="button" data-sp-scope="1">All teams</button>':"")+'</div>')+
 '</div>';
 return banner+dayTabs+summary+weekHead+board+seasonLine+
  '<div class="sp-score-tools">'+status+filters+tools+'</div>';

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
 if(board){board.innerHTML=markup();window.WTStayAwake?.sync();if(openedGame)renderGameSheet();}
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
 const day=e.target.closest("[data-sp-day]");
 if(day){sportsDay=day.dataset.spDay;ensure();return;}
 if(e.target.closest("[data-sp-scope]")){sportsScope=sportsScope==="all"?"favorites":"all";ensure();return;}
 const star=e.target.closest("[data-sp-fave]");if(star){toggleFavorite(star.dataset.spFave);return;}
 if(e.target.closest("[data-sp-close]")){closeSportsGame();return;}
 const prev=e.target.closest("[data-sp-prev]");if(prev){openSportsGame(prev.dataset.spPrev);return;}
 const next=e.target.closest("[data-sp-next]");if(next){openSportsGame(next.dataset.spNext);return;}
 const panel=e.target.closest("[data-sp-panel]");if(panel){detailView=panel.dataset.spPanel;renderGameSheet();return;}
 const open=e.target.closest("[data-sp-open]");if(open){openSportsGame(open.dataset.spOpen);return;}
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
 GAMES=data.games.map(g=>({id:g.id,away:g.away,home:g.home,day:g.day,time:g.time,group:g.group,neutral:g.neutral,kickoff:g.kickoff}));
 live=new Map();market=new Map();state="loading";updatedAt="";viewFilter="all";
 expandedGames.clear();
 closeSportsGame();sportsDay="auto";
 ensure();refresh();refreshMarket();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&openedGame)closeSportsGame();});
let spSwipeStart=null;
document.addEventListener("touchstart",e=>{
 if(!openedGame || !e.target.closest(".sp-sheet-score"))return;
 const t=e.touches?.[0];if(t)spSwipeStart={x:t.clientX,y:t.clientY};
},{passive:true});
document.addEventListener("touchend",e=>{
 if(!spSwipeStart||!openedGame)return;
 const t=e.changedTouches?.[0],start=spSwipeStart;spSwipeStart=null;
 if(!t)return;
 const dx=t.clientX-start.x,dy=t.clientY-start.y;
 if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.3)return;
 const ix=GAMES.findIndex(g=>g.id===openedGame);
 if(ix<0||GAMES.length<2)return;
 const next=GAMES[(ix+(dx<0?1:-1)+GAMES.length)%GAMES.length];
 openSportsGame(next.id);
},{passive:true});

document.addEventListener("wt-fantasy-change",ensure);
document.addEventListener("wt-manual-fantasy-change",ensure);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){refresh();refreshMarket();}});
ensure();refresh();refreshMarket();
setInterval(()=>{if(!document.hidden)refresh();},45000);
setInterval(()=>{if(!document.hidden)refreshMarket();},180000);
})();
