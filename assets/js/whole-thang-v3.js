(() => {
"use strict";
const NAMES = {ARI:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",CAR:"Panthers",CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",DEN:"Broncos",DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",JAX:"Jaguars",KC:"Chiefs",LAC:"Chargers",LAR:"Rams",LV:"Raiders",MIA:"Dolphins",MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",NYJ:"Jets",PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",TB:"Buccaneers",TEN:"Titans",WAS:"Commanders"};
const LOGOS = {WAS:"wsh"};
const OLD_KEY="whole-thang-v2", KEY="whole-thang-v3";
const GAMES = [
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
const rawNode=document.getElementById("wt-history");
if(!rawNode){document.getElementById("app").textContent="Historical data unavailable.";return;}
const raw=JSON.parse(rawNode.textContent);
const HISTORY=raw.trim().split(/\n+/).map((line,i)=>{
 const [wk,away,home,pick,winner,winScore,loseScore]=line.trim().split(/\s+/);
 const tie=winner==="T", w=Number(winScore), l=Number(loseScore);
 return {id:"history-"+(i+1),week:Number(wk),away,home,pick,winner,tie,awayScore:tie?w:winner===away?w:l,homeScore:tie?w:winner===home?w:l,status:tie?"T":pick===winner?"W":"L"};
});
const EMPTY=()=>({picks:{},snfMargin:"",mnfMargin:"",locked:false,homeEdge:45});
function safeLoad(){
 let existing=null,old=null;
 try{existing=JSON.parse(localStorage.getItem(KEY)||"null");}catch{}
 try{old=JSON.parse(localStorage.getItem(OLD_KEY)||localStorage.getItem("whole-thang-v1")||"null");}catch{}
 const source=existing||old||{};
 const allow=Object.fromEntries(GAMES.filter(g=>source.picks&&[g.away,g.home].includes(source.picks[g.id])).map(g=>[g.id,source.picks[g.id]]));
 return {picks:allow,snfMargin:validMargin(source.snfMargin),mnfMargin:validMargin(source.mnfMargin),locked:!!source.locked,homeEdge:[0,25,45,65,85].includes(Number(source.homeEdge))?Number(source.homeEdge):45};
}
function validMargin(v){return v===""||v==null?"":Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=200?String(v):"";}
let state=safeLoad(),tab="home",teamSort="rating",intelFilter="all";
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast("Browser storage is unavailable.");}}
function escape(s){return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function logo(a){return "https://a.espncdn.com/i/teamlogos/nfl/500/"+(LOGOS[a]||a).toLowerCase()+".png";}
function fmt(n){return Number(n).toFixed(1);}
const summary={wins:HISTORY.filter(x=>x.status==="W").length,losses:HISTORY.filter(x=>x.status==="L").length,ties:HISTORY.filter(x=>x.status==="T").length};
if(HISTORY.length!==79||summary.wins!==54||summary.losses!==24||summary.ties!==1){document.getElementById("app").textContent="Historical data did not pass the 79-pick checksum.";return;}
const pct=(w,l)=>w+l?(100*w/(w+l)):0;
function weekStats(w){const a=HISTORY.filter(x=>x.week===w);const won=a.filter(x=>x.status==="W").length, lost=a.filter(x=>x.status==="L").length,tied=a.filter(x=>x.status==="T").length;return {week:w,wins:won,losses:lost,ties:tied,record:won+"–"+lost+(tied?"–"+tied+"T":""),rate:pct(won,lost),games:a};}
const weeks=[1,2,3,4,5].map(weekStats);
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
 document.querySelectorAll(".tab").forEach(b=>{b.classList.toggle("active",b.dataset.tab===tab);b.setAttribute("aria-selected",b.dataset.tab===tab?"true":"false");});
 document.querySelector(".season-strip .record").innerHTML=summary.wins+"–"+summary.losses+"–"+summary.ties+"T <span>2026</span>";
 document.querySelector(".season-strip .metric strong").textContent=pct(summary.wins,summary.losses).toFixed(2)+"%";
 const pages={home:homePage,picks:picksPage,intel:intelPage,teams:teamsPage,history:historyPage,data:dataPage};
 document.getElementById("app").innerHTML=(pages[tab]||homePage)();
}
function section(title,sub,body){return '<section class="section"><div class="section-head"><h2>'+title+'</h2><span>'+sub+'</span></div>'+body+'</section>';}
function cardMetric(label,value,foot){return '<div class="summary-item"><small>'+label+'</small><strong>'+value+'</strong><em>'+foot+'</em></div>';}
function homePage(){
 const forecasts=allForecasts(),picked=GAMES.filter(g=>state.picks[g.id]).length;
 const disagreements=forecasts.filter(f=>state.picks[f.id]&&state.picks[f.id]!==f.choice);
 const closest=[...forecasts].sort((a,b)=>a.probability-b.probability).slice(0,3);
 const danger=disagreements.length?disagreements.slice(0,3).map(f=>'<div class="wt-brief-row"><strong>'+f.away+' @ '+f.home+'</strong><span>Your '+state.picks[f.id]+' vs model '+f.choice+' · '+Math.round(f.probability*100)+'% preliminary</span></div>').join(""):'<div class="wt-brief-row"><span>No model disagreements among saved Week 6 picks yet.</span></div>';
 const curve=weeks.map(w=>'<div class="wt-bar-row"><span>W'+w.week+'</span><div class="wt-bar-track"><div class="wt-bar-fill" style="width:'+w.rate+'%"></div></div><strong>'+fmt(w.rate)+'%</strong></div>').join("");
 return section("2026 Season","Weeks 1–5 · verified import",
   '<div class="panel summary-grid">'+cardMetric("Record","54–24–1T","79 selections")+cardMetric("Win rate","69.23%","ties excluded")+cardMetric("Best week","14–2","Week 4")+'</div>')+
 section("Week 6 Control","Oct 15–19 · 14 matchups",
   '<div class="panel focus-row"><div class="focus-copy"><small>On deck</small><strong>Seahawks @ Broncos</strong><span>Thursday · 8:15 PM ET · '+picked+' of 14 picks saved on this browser</span></div><div class="counter">'+picked+'<small>/14 picked</small></div></div><div class="action-row"><button class="btn primary" data-go="picks">Manage picks</button><button class="btn" data-go="intel">Open workhorse →</button></div>')+
 section("Trend","Your weekly accuracy",'<div class="panel wt-pad">'+curve+'</div>')+
 section("Workhorse Brief","Based on all 79 game outcomes",
   '<div class="wt-brief-grid"><div class="panel wt-pad"><h3>Potential disagreements</h3>'+danger+'</div><div class="panel wt-pad"><h3>Closest calls</h3>'+closest.map(f=>'<div class="wt-brief-row"><strong>'+f.away+' @ '+f.home+'</strong><span>'+f.choice+' · '+Math.round(f.probability*100)+'% model estimate</span></div>').join("")+'</div></div>')+
 '<div class="note"><strong>Integrity:</strong> Week 1 grading corrections are included. Three formerly misgraded wins: Ravens over Colts, Raiders over Dolphins, Eagles over Commanders. The engine is a statistical model, not a connected live AI service. Injury reports, live odds, and real-time news are not included.</div>';
}
function pickCard(f){
 const chosen=state.picks[f.id]||"",canPick=!state.locked;
 return '<article class="wt-game-card"><div class="wt-card-head"><strong>'+f.day+' · '+f.time+' ET</strong><span>'+f.group+(f.neutral?" · Neutral":"")+'</span></div>'+
 [f.away,f.home].map(t=>'<button type="button" class="wt-team-option '+(chosen===t?"is-selected":"")+'" data-pick="'+f.id+'" data-team="'+t+'" '+(canPick?"":"disabled")+'>'+tinyLogo(t)+'<span>'+NAMES[t]+'</span><small>'+t+' · '+recordText(TS[t])+'</small><i>'+(chosen===t?"✓":"○")+'</i></button>').join("")+
 '<div class="wt-card-foot"><span>MODEL: <strong>'+f.choice+'</strong> · '+Math.round(f.probability*100)+'%</span><span class="'+(chosen&&chosen!==f.choice?"wt-red":"wt-muted")+'">'+(chosen?(chosen===f.choice?"Agrees with model":"Against model"):"Not picked")+'</span></div></article>';
}
function picksPage(){
 const forecasts=allForecasts(),picked=Object.keys(state.picks).filter(id=>GAMES.some(g=>g.id===id)).length;
 const groups=[...new Set(forecasts.map(f=>f.group))];
 return section("Week 6 Picks",picked+"/14 selected · "+(state.locked?"Locally locked":"Editable"),
    '<div class="wt-info-bar"><span><strong>Computer:</strong> '+picked+' selections on this device</span><span>Not submitted to the family form</span></div>'+
    groups.map(group=>'<div class="wt-group"><div class="group-label">'+group+'</div><div class="wt-match-grid">'+forecasts.filter(f=>f.group===group).map(pickCard).join("")+'</div></div>').join(""))+
 section("Pool Tiebreakers","Closest without going over",
 '<div class="tiebreak-grid"><div class="field"><label>SNF · DAL @ GB · victory margin</label><input aria-label="SNF margin" type="number" min="0" max="200" data-margin="snfMargin" value="'+escape(state.snfMargin)+'" '+(state.locked?"disabled":"")+' placeholder="Margin"></div><div class="field"><label>MNF · WAS @ SF · victory margin</label><input aria-label="MNF margin" type="number" min="0" max="200" data-margin="mnfMargin" value="'+escape(state.mnfMargin)+'" '+(state.locked?"disabled":"")+' placeholder="Margin"></div></div>'+
 '<div class="action-row"><button class="btn primary" data-action="save">Save this browser</button><button class="btn" data-action="lock">'+(state.locked?"Unlock picks":"Lock picks")+'</button></div><p class="wt-helper">The lock is a personal reminder, not the league submission cutoff. Submit your official picks in the family form.</p>');
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
 return section("The Workhorse","Week 6 · data-driven matchup research",
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
 return section("Your Pick History","All 79 game-by-game results",
 '<div class="panel summary-grid">'+cardMetric("Wins","54","Correct")+cardMetric("Losses","24","Incorrect")+cardMetric("Ties","1","No winner")+'</div>'+
 '<div class="wt-history-weeks">'+weeks.map(w=>'<details class="wt-week" '+(w.week===5?"open":"")+'><summary><span><strong>Week '+w.week+'</strong><small>'+w.games.length+' selections</small></span><strong>'+w.record+'</strong><span>'+fmt(w.rate)+'%</span></summary><div class="wt-history-table"><table><thead><tr><th>Game</th><th>Pick</th><th>Final</th><th>Grade</th></tr></thead><tbody>'+
 w.games.map(g=>'<tr><td>'+g.away+' @ '+g.home+'</td><td><strong>'+g.pick+'</strong></td><td>'+g.awayScore+'–'+g.homeScore+'</td><td><span class="'+outcomeClass(g)+'">'+(g.status==="W"?"✓ Win":g.status==="L"?"✕ Loss":"T Tie")+'</span></td></tr>').join("")+'</tbody></table></div></details>').join("")+'</div>')+
 '<div class="note"><strong>Week 1 corrections:</strong> BAL @ IND (Ravens 41–23), MIA @ LV (Raiders 27–13), and WAS @ PHI (Eagles 24–22) were winners. Corrected season record: 54–24–1T. Tied games do not enter the accuracy denominator.</div>';
}
function dataPage(){
 const json=JSON.stringify({version:3,scope:"browser-picks-only",week:6,...state},null,2);
 return section("Data / Backup","Device-only preferences",
 '<div class="note"><strong>Verified history is protected and cannot be overwritten by imported backups.</strong> Your personal Week 6 picks and settings are currently saved only in this browser. Use Copy backup to move them to another device; server sync is not enabled.</div>'+
 '<div class="data-grid wt-data-grid"><div class="field"><label>Export local picks</label><textarea readonly id="exportBox">'+escape(json)+'</textarea><div class="action-row"><button class="btn" data-action="copy">Copy backup</button></div></div><div class="field"><label>Import local picks</label><textarea id="importBox" placeholder="Paste WHOLE THANG backup JSON"></textarea><div class="action-row"><button class="btn primary" data-action="import">Import picks</button><button class="btn danger" data-action="reset">Reset local picks</button></div></div></div>')+
 '<div class="note"><strong>Data source:</strong> Supplied Week 1–5 pick log and final scores, last updated October 12, 2026. All 79 selections are preserved as historical data. Week 6 results have not been entered.</div>';
}
function switchTab(next){tab=next;render();window.scrollTo({top:0,behavior:"smooth"});}
document.querySelectorAll(".tab").forEach(el=>el.addEventListener("click",()=>switchTab(el.dataset.tab)));
document.addEventListener("click",async function(e){
 const nav=e.target.closest("[data-go]");if(nav){switchTab(nav.dataset.go);return;}
 const target=e.target.closest("[data-pick]");
 if(target){if(state.locked)return;const g=GAMES.find(g=>g.id===target.dataset.pick);if(!g||![g.away,g.home].includes(target.dataset.team))return;
 state.picks[g.id]=target.dataset.team;save();render();return;}
 const action=e.target.closest("[data-action]");if(!action)return;
 switch(action.dataset.action){
 case "save":save();toast("Picks saved on this browser.");break;
 case "lock":state.locked=!state.locked;save();render();toast(state.locked?"Locally locked.":"Unlocked.");break;
 case "copy":try{await navigator.clipboard.writeText(document.getElementById("exportBox").value);toast("Backup copied.");}catch{toast("Copy unavailable; select the backup text.");}break;
 case "import":try{
 const v=JSON.parse(document.getElementById("importBox").value);
 if(!v||typeof v!=="object"||!v.picks||typeof v.picks!=="object")throw Error("Invalid picks backup");
 state={...EMPTY(),picks:Object.fromEntries(GAMES.filter(g=>[g.away,g.home].includes(v.picks[g.id])).map(g=>[g.id,v.picks[g.id]])),snfMargin:validMargin(v.snfMargin),mnfMargin:validMargin(v.mnfMargin),locked:!!v.locked,homeEdge:[0,25,45,65,85].includes(Number(v.homeEdge))?Number(v.homeEdge):45};
 save();render();toast("Picks imported; official history unchanged.");
 }catch{toast("Invalid picks backup.");}break;
 case "reset":if(confirm("Clear Week 6 browser picks and settings? Verified results will stay.")){state=EMPTY();save();render();toast("Local Week 6 picks reset.");}break;
 }
});
document.addEventListener("change",e=>{
 if(e.target.id==="homeEdge"){state.homeEdge=Number(e.target.value);save();render();}
 if(e.target.id==="teamSort"){teamSort=e.target.value;render();}
 if(e.target.id==="intelFilter"){intelFilter=e.target.value;render();}
 if(e.target.matches("[data-margin]")){state[e.target.dataset.margin]=validMargin(e.target.value);save();}
});
render();
})();