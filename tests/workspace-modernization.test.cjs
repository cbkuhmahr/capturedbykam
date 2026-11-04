// Run with: node --test tests/workspace-modernization.test.cjs
// Uses Node's built-in runner; no browser, live account, network or dependencies.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const history = JSON.parse(read('api/whole-thang.js').match(/const HISTORY_ROWS = (".*?");/)[1]);
const plain = value => JSON.parse(JSON.stringify(value));

function harness(file, expose, prepare = source => source, storage = {}) {
  const nodes = new Map();
  const node = id => {
    if(!nodes.has(id))nodes.set(id,{id,textContent:id==='wt-history'?JSON.stringify(history):'',dataset:{},style:{},value:'',hidden:true,addEventListener(){},appendChild(){},append(){},setAttribute(){},removeAttribute(){},querySelector(selector){return node(selector);},querySelectorAll(){return [];},classList:{toggle(){},add(){},remove(){}}});
    return nodes.get(id);
  };
  const values = new Map(Object.entries(storage));
  const context = {
    window:{matchMedia:()=>({matches:false})},
    document:{getElementById:node,createElement:()=>node('created-'+nodes.size),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},dispatchEvent(){},body:node('body'),head:node('head'),hidden:false},
    localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
    navigator:{},MutationObserver:class{observe(){}},setInterval(){},setTimeout(){},clearTimeout(){},
    Date,Intl,TextEncoder,Blob,URL,AbortSignal,Map,Set,Event,console,
    fetch:()=>{throw Error('Unexpected live network request in test');}
  };
  context.window.window=context.window;
  let source=prepare(read(file));
  source=source.replace(/\}\)\(\);\s*$/, '\nwindow.__test={'+expose+'};\n})();');
  vm.runInNewContext(source,context,{filename:file});
  return {api:context.window.__test,context,values};
}
function core(){return harness('assets/js/whole-thang-v3.js','HISTORY,summary,TS,forecast,gradeWeek,seasonTotals,validMargin,sameSavedChoices,calendarWeek,GAMES,activeWeek,weekNavigator,readWeekState,historyIsReady,setState(next){state=next;week6State=next;}',s=>s.replace('render();\nvoid bootstrap();',''));}
function fantasy(){return harness('assets/js/whole-thang-manual-fantasy.js','fantasyPoints,recommended,setScoring(value){state.scoring=value;}',s=>s.replace('load();emit();','load();'));}
function live(){return harness('assets/js/whole-thang-live.js','verdict,displaySpread,GAMES',s=>s.replace('ensure();\nif(GAMES.length){refresh();refreshMarket();}',''));}

test('preserves the verified 79-pick baseline and excludes ties from accuracy',()=>{
  const {api}=core();
  assert.equal(api.HISTORY.length,79);
  assert.deepEqual(plain(api.summary),{wins:54,losses:24,ties:1});
  assert.equal(api.seasonTotals().record,'54–24–1T');
  assert.equal(api.seasonTotals().accuracy,'69.23');
  assert.equal(Object.keys(api.TS).length,32);
});

test('grades final wins, losses and ties while leaving pending and invalid scores ungraded',()=>{
  const {api}=core();
  const games=[{id:'1',away:'CHI',home:'GB'},{id:'2',away:'DAL',home:'PHI'},{id:'3',away:'NYG',home:'NYJ'},{id:'4',away:'KC',home:'IND'}];
  const scores=games.map((g,i)=>({...g,state:i===3?'pre':'post',awayScore:[21,13,10,null][i],homeScore:[14,20,10,null][i]}));
  const result=api.gradeWeek(7,games,{'1':'CHI','2':'DAL','3':'NYG','4':'KC'},scores);
  assert.equal(result.record,'1–1–1T');
  assert.equal(result.rate,50);
  assert.equal(result.games.length,3);
  scores[0].awayScore='unavailable';
  assert.equal(api.gradeWeek(7,games,{'1':'CHI'},scores).games.length,0);
});

test('retains the home-field and neutral-site forecast calculations',()=>{
  const {api}=core();
  api.TS.CHI.elo=1500;api.TS.ATL.elo=1500;
  api.setState({picks:{},mnfMargin:'',homeEdge:0,locked:false});
  assert.equal(api.forecast({away:'CHI',home:'ATL',neutral:false}).probability,.5);
  api.setState({picks:{},mnfMargin:'',homeEdge:85,locked:false});
  const home=api.forecast({away:'CHI',home:'ATL',neutral:false});
  assert.equal(home.choice,'ATL');assert.ok(home.probability>.6);
  assert.equal(api.forecast({away:'CHI',home:'ATL',neutral:true}).probability,.5);
});

test('retains the MNF margin range and cloud choice verification',()=>{
  const {api}=core();
  for(const value of ['',null,undefined])assert.equal(api.validMargin(value),'');
  for(const value of ['0','7','200'])assert.equal(api.validMargin(value),value);
  for(const value of ['-1','201','1.5','abc'])assert.equal(api.validMargin(value),'');
  assert.equal(api.sameSavedChoices({picks:{a:'CHI'},mnfMargin:'7',locked:true,homeEdge:45},{picks:{a:'CHI'},mnfMargin:7,locked:true,homeEdge:45}),true);
  assert.equal(api.sameSavedChoices({picks:{a:'CHI'}},{picks:{a:'GB'}}),false);
});


test('opens without showing legacy Week 6 matchups or an invented updated record',()=>{
 const {api}=core();
 assert.equal(api.GAMES.length,0);
 assert.ok(api.activeWeek>=6&&api.activeWeek<=18);
 assert.equal(api.historyIsReady(),false);
 assert.equal(api.seasonTotals().ready,false);
 assert.equal(api.seasonTotals().record,'54–24–1T'); // canonical baseline, not presented as current
 const source=read('lib/whole-thang-page.js');
 assert.ok(source.includes('2026 SEASON · verifying record'));
 assert.ok(!source.includes('54–24–1T <span>2026 SEASON'));
});

test('has all remaining regular-season weeks ready for browsing and future picks',()=>{
 const {api}=core();
 const html=api.weekNavigator();
 for(let wk=6;wk<=18;wk++)assert.ok(html.includes('value="'+wk+'"'),'Week '+wk);
 assert.ok(html.includes('Current week'));
 assert.ok(read('api/whole-thang-sync.js').includes('week>18'));
});

test('removes all form integration assets and action buttons',()=>{
 const page=read('lib/whole-thang-page.js');
 const picks=read('assets/js/whole-thang-v3.js');
 const share=read('assets/js/whole-thang-apple.js');
 assert.ok(!page.includes('whole-thang-family-form'));
 assert.ok(!picks.includes('family-launch'));
 assert.ok(!share.includes('Microsoft Form'));
 assert.ok(!fs.existsSync(path.join(root,'assets/js/whole-thang-family-form.js')));
 assert.ok(!fs.existsSync(path.join(root,'assets/css/whole-thang-family-form.css')));
});

test('preserves complete cloud-sync week identity across delayed submissions',()=>{
 const source=read('assets/js/whole-thang-v3.js');
 const start=source.indexOf('function queueCloudSave(){');
 const capture=source.indexOf('const snapshot=JSON.parse(JSON.stringify(state)),week=activeWeek;',start);
 const delay=source.indexOf('const timer=setTimeout(()=>{',start);
 const end=source.indexOf('function save(){',start);
 assert.ok(start>=0&&capture>start&&delay>capture&&delay<end);
 assert.ok(source.slice(delay,end).includes('cloudRequest("saveWeek",{season:SEASON,week,state:snapshot})'));
 assert.ok(source.slice(start,end).includes('cloudTimers.set(week,timer)'));
 assert.ok(source.slice(start,end).includes('cloudWriteChains.set(week,write)'));
 assert.ok(source.slice(start,end).includes('cloudTimers.get(week)'));
});

test('retains all live pick verdicts and spread formatting',()=>{
  const {api}=live(),game={away:'CHI',home:'GB'};
  const result=(state,away,home)=>({state,awayScore:away,homeScore:home});
  assert.equal(api.verdict(game,result('post',21,14),'CHI'),'correct');
  assert.equal(api.verdict(game,result('post',21,14),'GB'),'incorrect');
  assert.equal(api.verdict(game,result('post',14,14),'CHI'),'tied');
  assert.equal(api.verdict(game,result('in',21,14),'CHI'),'ahead');
  assert.equal(api.verdict(game,result('in',21,14),'GB'),'behind');
  assert.equal(api.verdict(game,result('in',14,14),'CHI'),'even');
  assert.equal(api.verdict(game,result('pre',null,null),'CHI'),'upcoming');
  assert.equal(api.verdict(game,result('post',21,14),''),'unpicked');
  assert.equal(api.verdict(game,result('post',null,14),'CHI'),'unknown');
  assert.equal(api.displaySpread(0),'PK');assert.equal(api.displaySpread(3.5),'+3.5');assert.equal(api.displaySpread(-3),'-3');
});

test('preserves standard, half-PPR, PPR and kicker scoring',()=>{
  const {api}=fantasy();
  const player={stats:{passYds:100,passTD:1,int:1,rushYds:20,rushTD:1,recYds:30,recTD:1,rec:4,fumLost:1}};
  for(const [format,expected] of [['standard','22.00'],['half','24.00'],['ppr','26.00']]){
    api.setScoring(format);assert.equal(api.fantasyPoints(player,{pos:'WR'}),expected);
  }
  assert.equal(api.fantasyPoints({stats:{fgMade:3,xpMade:2}},{pos:'K'}),'11.00');
  assert.equal(api.fantasyPoints(null,{pos:'WR'}),null);
});

test('work schedule exports overnight month boundaries and Eastern timezone rules',()=>{
  const {api}=harness('assets/js/whole-thang-work-shifts.js','createICS');
  const result=api.createICS({'2026-11-30':'overnight','2026-11-03':'morning','2026-11-04':'evening'});
  assert.match(result,/DTSTART;TZID=America\/New_York:20261130T230000/);
  assert.match(result,/DTEND;TZID=America\/New_York:20261201T070000/);
  assert.match(result,/DTEND;TZID=America\/New_York:20261103T150000/);
  assert.match(result,/DTSTART;TZID=America\/New_York:20261104T150000/);
  assert.match(result,/TZOFFSETTO:-0500/);assert.match(result,/TZOFFSETTO:-0400/);
  assert.equal((result.match(/BEGIN:VEVENT/g)||[]).length,3);
  assert.ok(result.endsWith('END:VCALENDAR\r\n'));
});

test('authenticated page retains every navigation destination and optional tool',()=>{
  const html=require('../lib/whole-thang-page');
  const tabs=[...html.matchAll(/data-tab="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(tabs,['live','fantasy','picks','intel','home','teams','history','data']);
  for(const id of ['wt-history','app','wt-media-launch','wt-more-toggle','wt-more-menu','wt-shifts-open'])assert.ok(html.includes('id="'+id+'"'),id);
  for(const src of ['whole-thang-apple.js','whole-thang-media.js','whole-thang-manual-fantasy.js','whole-thang-work-shifts.js','whole-thang-lock.js','whole-thang-awake.js'])assert.ok(html.includes(src),src);
  assert.equal((html.match(/rel="stylesheet"/g)||[]).length,2);
  assert.equal((html.match(/<style/g)||[]).length,0);
  assert.ok(!/Sunday Night Tiebreaker|snfMargin/.test(html));
});

function response(){return {headers:{},statusCode:null,body:null,setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;},end(v){this.body=v;return this;},redirect(code,url){this.statusCode=code;this.body=url;return this;}};}
test('page authentication still rejects unsupported methods and unauthenticated/malformed cookies',async()=>{
  const handler=require('../api/whole-thang');
  for(const cookie of ['', 'unrelated=%ZZ','cbk_admin_session=']){const res=response();await handler({method:'GET',headers:{cookie}},res);assert.equal(res.statusCode,302);assert.equal(res.body,'/admin.html');}
  const res=response();await handler({method:'POST',headers:{}},res);assert.equal(res.statusCode,405);
});

test('sync API still rejects cross-origin requests and invalid actions without changing data',async()=>{
  const handler=require('../api/whole-thang-sync');
  const req={method:'POST',headers:{host:'www.capturedbykam.com',origin:'https://www.capturedbykam.com',cookie:'cbk_admin_session='+'a'.repeat(64)},body:{action:'loadWeek',season:2026,week:19}};
  let res=response();await handler(req,res);assert.equal(res.statusCode,400);
  res=response();await handler({...req,headers:{...req.headers,origin:'https://other.example'}},res);assert.equal(res.statusCode,403);
  res=response();await handler({...req,body:{action:'deleteEverything'}},res);assert.equal(res.statusCode,400);
});

test('public-data helper deduplicates concurrent reads and refuses private endpoints',async()=>{
  let calls=0,finish;
  const ctx={window:{},document:{body:{},addEventListener(){}},MutationObserver:class{observe(){}},fetch:async()=>{calls++;await new Promise(resolve=>{finish=resolve;});return {ok:true,json:async()=>({ok:true,games:[]})};},AbortSignal,Date,Promise,Map,Error,queueMicrotask};
  vm.runInNewContext(read('assets/js/whole-thang-ui.js'),ctx);
  const helper=ctx.window.WTUI;
  const a=helper.publicJSON('/api/nfl-standings',600000),b=helper.publicJSON('/api/nfl-standings',600000);
  assert.equal(calls,1);finish();await Promise.all([a,b]);
  await helper.publicJSON('/api/nfl-standings',600000);assert.equal(calls,1);
  await assert.rejects(helper.publicJSON('/api/whole-thang-sync'),/Only public sports data/);
});
