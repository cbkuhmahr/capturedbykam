const APP_KEY='whole-thang-v1';
const BASE={
  profile:{name:'WHOLE THANG 🪐',season:2026,wins:51,losses:27,ties:1,accuracy:65.4,bestWeek:'Week 4',bestRecord:'14–2',lastWeek:'Week 5',lastRecord:'9–5–1T'},
  currentWeek:6,
  history:[
    {week:4,record:'14–2',accuracy:87.5,note:'Best week of the season so far'},
    {week:5,record:'9–5–1T',accuracy:64.3,note:'Rams MNF pick lost to Buffalo, 37–34'}
  ],
  games:[
    {id:'w6-1',day:'THU',time:'8:15 PM',away:'Seattle Seahawks',a:'SEA',home:'Denver Broncos',h:'DEN'},
    {id:'w6-2',day:'SUN',time:'9:30 AM',away:'Houston Texans',a:'HOU',home:'Jacksonville Jaguars',h:'JAX'},
    {id:'w6-3',day:'SUN',time:'1:00 PM',away:'Tennessee Titans',a:'TEN',home:'Indianapolis Colts',h:'IND'},
    {id:'w6-4',day:'SUN',time:'1:00 PM',away:'Carolina Panthers',a:'CAR',home:'Philadelphia Eagles',h:'PHI'},
    {id:'w6-5',day:'SUN',time:'1:00 PM',away:'Pittsburgh Steelers',a:'PIT',home:'Tampa Bay Buccaneers',h:'TB'},
    {id:'w6-6',day:'SUN',time:'1:00 PM',away:'Baltimore Ravens',a:'BAL',home:'Cleveland Browns',h:'CLE'},
    {id:'w6-7',day:'SUN',time:'1:00 PM',away:'New Orleans Saints',a:'NO',home:'New York Giants',h:'NYG'},
    {id:'w6-8',day:'SUN',time:'1:00 PM',away:'Chicago Bears',a:'CHI',home:'Atlanta Falcons',h:'ATL'},
    {id:'w6-9',day:'SUN',time:'1:00 PM',away:'New York Jets',a:'NYJ',home:'New England Patriots',h:'NE'},
    {id:'w6-10',day:'SUN',time:'4:05 PM',away:'Arizona Cardinals',a:'ARI',home:'Los Angeles Rams',h:'LAR'},
    {id:'w6-11',day:'SUN',time:'4:25 PM',away:'Los Angeles Chargers',a:'LAC',home:'Kansas City Chiefs',h:'KC'},
    {id:'w6-12',day:'SUN',time:'4:25 PM',away:'Buffalo Bills',a:'BUF',home:'Las Vegas Raiders',h:'LV'},
    {id:'w6-13',day:'SNF',time:'8:20 PM',away:'Dallas Cowboys',a:'DAL',home:'Green Bay Packers',h:'GB',prime:'SNF'},
    {id:'w6-14',day:'MNF',time:'8:15 PM',away:'Washington Commanders',a:'WAS',home:'San Francisco 49ers',h:'SF',prime:'MNF'}
  ],
  picks:{},snfMargin:'',mnfMargin:'',locked:false
};
let state=load(); let active='home';
function load(){try{return {...BASE,...JSON.parse(localStorage.getItem(APP_KEY)||'{}')}}catch(e){return structuredClone(BASE)}}
function save(){localStorage.setItem(APP_KEY,JSON.stringify(state))}
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800)}
function setTab(tab){active=tab;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));render();window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function pct(){return state.profile.accuracy.toFixed(1)+'%'}
function chosenCount(){return Object.keys(state.picks||{}).filter(k=>state.picks[k]).length}
function home(){
 return `<section class="hero">
 <div class="card hero-card"><div class="kicker">2026 SEASON</div><div class="record">${state.profile.wins}–${state.profile.losses}–${state.profile.ties} <small>W–L–T</small></div><div class="accuracy">${pct()} accuracy • ${state.profile.wins+state.profile.losses+state.profile.ties} graded picks</div><div class="progress"><span></span></div></div>
 <div class="side-stack"><div class="card mini-card"><span>BEST WEEK</span><strong>${state.profile.bestRecord}</strong><span>${state.profile.bestWeek}</span></div><div class="card mini-card"><span>LAST WEEK</span><strong>${state.profile.lastRecord}</strong><span>${state.profile.lastWeek}</span></div></div>
 </section>
 <section class="section"><div class="card week-banner"><div><small>CURRENT SLATE</small><strong>Week ${state.currentWeek}</strong></div><div class="status-pill">${chosenCount()}/${state.games.length} PICKS MADE</div></div></section>
 <section class="section"><div class="section-head"><div><h2>Your command center</h2><p>Track the pick. Track the result. Learn from the pattern.</p></div></div>
 <div class="game-grid">
  <div class="card mini-card"><span>THIS WEEK</span><strong>${chosenCount()} selected</strong><span>${state.locked?'Picks locked':'Still editable'}</span></div>
  <div class="card mini-card"><span>PRIME TIME</span><strong>SNF + MNF</strong><span>Margins: ${state.snfMargin||'—'} / ${state.mnfMargin||'—'}</span></div>
 </div></section>
 <section class="section"><div class="callout"><h3>WHOLE THANG Intelligence</h3><p>The next layer will add opponent strength, injuries, market movement, ATS trends, and your own historical tendencies before you make a selection.</p></div></section>`;
}
function gameCard(g){
 const pick=state.picks[g.id]||'';
 return `<article class="card game-card"><div class="game-meta"><span>${g.day} • ${g.time} ET</span><span>${g.prime||'REG'}</span></div>
 <div class="matchup"><div class="team">${g.a}</div><div class="vs">@</div><div class="team">${g.h}</div></div>
 <div class="pick-buttons"><button class="pick-btn ${pick===g.a?'selected':''}" ${state.locked?'disabled':''} onclick="pick('${g.id}','${g.a}')">${g.a}</button><button class="pick-btn ${pick===g.h?'selected':''}" ${state.locked?'disabled':''} onclick="pick('${g.id}','${g.h}')">${g.h}</button></div></article>`;
}
function picks(){
 return `<section class="section" style="margin-top:0"><div class="section-head"><div><h2>Week ${state.currentWeek} Picks</h2><p>Select one winner per game.</p></div><div class="status-pill">${chosenCount()}/${state.games.length}</div></div>
 <div class="game-grid">${state.games.map(gameCard).join('')}</div></section>
 <section class="section tiebreakers">
 <div class="card field-card"><label>SNF margin — DAL @ GB</label><input type="number" min="0" value="${state.snfMargin}" ${state.locked?'disabled':''} oninput="setMargin('snfMargin',this.value)" placeholder="Predicted margin"></div>
 <div class="card field-card"><label>MNF margin — WAS @ SF</label><input type="number" min="0" value="${state.mnfMargin}" ${state.locked?'disabled':''} oninput="setMargin('mnfMargin',this.value)" placeholder="Predicted margin"></div>
 </section>
 <div class="action-row"><button class="primary-btn" onclick="savePicks()">Save Picks</button><button class="ghost-btn" onclick="toggleLock()">${state.locked?'Unlock Picks':'Lock Picks'}</button></div>`;
}
window.pick=(id,team)=>{if(state.locked)return;state.picks[id]=team;save();render()};
window.setMargin=(k,v)=>{state[k]=v;save()};
window.savePicks=()=>{save();toast('Week 6 picks saved')};
window.toggleLock=()=>{state.locked=!state.locked;save();render();toast(state.locked?'Picks locked':'Picks unlocked')};
function teams(){
 const counts={}; state.games.forEach(g=>{const p=state.picks[g.id];if(p){counts[p]=(counts[p]||0)+1}});
 const rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
 return `<section class="section" style="margin-top:0"><div class="section-head"><div><h2>Team Performance</h2><p>This starts with your saved selections. Historical team records will populate when earlier weeks are imported.</p></div></div>
 <div class="card">${rows.length?'<table class="stat-table"><thead><tr><th>Team</th><th>Current Week Picks</th><th>Historical Record</th></tr></thead><tbody>'+rows.map(r=>`<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td class="muted">Import pending</td></tr>`).join('')+'</tbody></table>':'<div class="empty">Make Week 6 selections to start populating team data.</div>'}</div></section>`;
}
function history(){
 return `<section class="section" style="margin-top:0"><div class="section-head"><div><h2>History</h2><p>Known verified weekly results currently loaded.</p></div></div>
 <div class="card"><table class="stat-table"><thead><tr><th>Week</th><th>Record</th><th>Accuracy</th><th>Note</th></tr></thead><tbody>
 ${state.history.map(h=>`<tr><td><strong>Week ${h.week}</strong></td><td>${h.record}</td><td class="${h.accuracy>=70?'good':''}">${h.accuracy}%</td><td class="muted">${h.note}</td></tr>`).join('')}
 </tbody></table></div>
 <div class="callout" style="margin-top:14px"><h3>Next data import</h3><p>Weeks 1–3 and the full pick-by-pick history can be added without changing the interface. Once loaded, the site can calculate your record by team, division, home/road, prime time, and other situations.</p></div></section>`;
}
function settings(){
 const exportData=JSON.stringify(state,null,2).replace(/</g,'&lt;');
 return `<section class="section" style="margin-top:0"><div class="section-head"><div><h2>Data</h2><p>Phase 1 stores everything on this device. Export a backup anytime.</p></div></div>
 <div class="form-grid">
 <div class="card field-card"><label>Export / backup JSON</label><textarea id="exportBox" class="textarea" readonly>${exportData}</textarea><div class="action-row"><button class="ghost-btn" onclick="copyExport()">Copy</button></div></div>
 <div class="card field-card"><label>Import JSON</label><textarea id="importBox" class="textarea" placeholder="Paste a WHOLE THANG backup here"></textarea><div class="action-row"><button class="primary-btn" onclick="importData()">Import</button><button class="danger-btn" onclick="resetData()">Reset</button></div></div>
 </div>
 <div class="callout" style="margin-top:14px"><h3>Database upgrade ready</h3><p>The production version can swap local storage for Supabase so your picks sync across iPhone, desktop, and any future device.</p></div></section>`;
}
window.copyExport=async()=>{await navigator.clipboard.writeText(JSON.stringify(state,null,2));toast('Backup copied')};
window.importData=()=>{try{const v=JSON.parse(document.getElementById('importBox').value);state={...BASE,...v};save();render();toast('Data imported')}catch(e){toast('Invalid JSON')}};
window.resetData=()=>{if(confirm('Reset WHOLE THANG local data?')){state=structuredClone(BASE);save();render();toast('Data reset')}};
function render(){document.getElementById('app').innerHTML=active==='home'?home():active==='picks'?picks():active==='teams'?teams():active==='history'?history():settings()}
render();

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').classList.remove('hidden')});
document.getElementById('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById('installBtn').classList.add('hidden')};
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'))}