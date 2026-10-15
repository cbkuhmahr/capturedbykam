(() => {
"use strict";
// Hand-entered Week 6 Yahoo roster snapshot. No Yahoo credentials or API required.
// The advisor is an explainable projection heuristic, not Yahoo's official lineup advice.
const KEY = "wt-manual-fantasy-2026-week6-v1";
const F = ["QB","RB","RB","WR","WR","WR","TE","WRT","K","DEF"];
const SEED = [
["dak","Dak Prescott","DAL","GB","QB","QB",21.86,29,4,"ACTIVE"],
["swift","D'Andre Swift","CHI","ATL","RB","RB",14.40,21,3.5,"ACTIVE"],
["irving","Bucky Irving","TB","PIT","RB","RB",14.04,11,4,"ACTIVE"],
["jsn","Jaxon Smith-Njigba","SEA","DEN","WR","WR",21.53,29,5,"ACTIVE"],
["london","Drake London","ATL","CHI","WR","WR",18.37,15,4.5,"ACTIVE"],
["diggs","Stefon Diggs","WAS","SF","WR","WR",11.53,26,3.5,"Q"],
["loveland","Colston Loveland","CHI","ATL","TE","TE",9.86,13,3.5,"ACTIVE"],
["stevenson","Rhamondre Stevenson","NE","NYJ","RB","WRT",17.24,10,3.5,"ACTIVE"],
["dicker","Cameron Dicker","LAC","KC","K","K",6.95,13,4,"ACTIVE"],
["seattle-dst","Seattle Seahawks D/ST","SEA","DEN","DEF","DEF",6.67,20,4,"ACTIVE"],
["pitts","Kyle Pitts Sr.","ATL","CHI","TE","BN",7.91,30,3.5,"ACTIVE"],
["love","Jordan Love","GB","DAL","QB","BN",24.33,5,4,"ACTIVE"],
["jeudy","Jerry Jeudy","CLE","BAL","WR","BN",5.45,10,3,"ACTIVE"],
["kupp","Cooper Kupp","SEA","DEN","WR","BN",6.14,29,3.5,"ACTIVE"],
["kmet","Cole Kmet","CHI","ATL","TE","BN",3.29,13,3,"ACTIVE"],
["douglas","Demario Douglas","NE","NYJ","WR","BN",7.29,23,3,"ACTIVE"]
];
const ESC = value => String(value == null ? "" : value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const NUM = value => Number.isFinite(Number(value)) && value !== "" && value != null ? Number(value) : null;
const TWO = n => typeof n==="number"&&Number.isFinite(n)?n.toFixed(2):"—";
const OPP = value => String(value||"").toUpperCase().replace(/[^A-Z]/g,"").slice(0,3);
const POS = ["QB","RB","WR","TE","K","DEF"];
const SLOTS = {QB:["QB","BN"],RB:["RB","WRT","BN"],WR:["WR","WRT","BN"],TE:["TE","WRT","BN"],K:["K","BN"],DEF:["DEF","BN"]};
function normalize(p) {
  const pos=POS.includes(p.pos)?p.pos:"WR";
  const slot=SLOTS[pos].includes(p.slot)?p.slot:"BN";
  return {id:String(p.id||"").slice(0,70), name:String(p.name||"Player").slice(0,90),
    team:OPP(p.team), opponent:OPP(p.opponent),pos,slot,
    projection:NUM(p.projection), rank:Math.min(32,Math.max(0,Number(p.rank)||0)),
    talent:Math.min(5,Math.max(1,Number(p.talent)||3)),
    status:["ACTIVE","Q","D","OUT","IR"].includes(p.status)?p.status:"ACTIVE"};
}
function fresh() {
  return {version:1,teamName:"MONSTERS OF THE MIDWAY",week:6,scoring:"half",
    players:SEED.map(row=>normalize({id:row[0],name:row[1],team:row[2],opponent:row[3],pos:row[4],slot:row[5],
      projection:row[6],rank:row[7],talent:row[8],status:row[9]}))};
}
function load() {
 try {
   const data=JSON.parse(localStorage.getItem(KEY)||"null");
   if(data && data.version===1 && Array.isArray(data.players)) return {
     ...fresh(),teamName:String(data.teamName||"MONSTERS OF THE MIDWAY").slice(0,75),
     scoring:["standard","half","ppr"].includes(data.scoring)?data.scoring:"half",
     players:data.players.slice(0,65).map(normalize).filter(p=>p.id)
   };
 } catch {}
 return fresh();
}
let data=load(), editId="", error="";
function save() {
  try { localStorage.setItem(KEY,JSON.stringify(data));error=""; }
  catch {error="Browser storage unavailable. Edits may not persist.";}
  document.dispatchEvent(new Event("wt-fantasy-change"));
}
function starter(p) {return p.slot!=="BN";}
function decision(p) {
  if(p.status==="OUT"||p.status==="IR") return -1e5;
  if(p.projection===null) return -1e4;
  // Yahoo projections already include context. The small modifiers are only tie-breakers.
  const match=p.rank?((16.5-p.rank)/15.5)*.75:0;
  const talent=(p.talent-3)*.55;
  const health=p.status==="D"?-3:p.status==="Q"?-1.25:0;
  return p.projection+match+talent+health;
}
function bestLineup() {
  const eligible=p=>p.status!=="OUT"&&p.status!=="IR"&&p.projection!==null;
  const pool=data.players.filter(eligible);
  const used=new Set(), picks=[];
  for(const slot of F){
    const options=pool.filter(p=>!used.has(p.id)&&(slot==="WRT"?["RB","WR","TE"].includes(p.pos):p.pos===slot));
    options.sort((a,b)=>decision(b)-decision(a));
    if(options[0]){used.add(options[0].id);picks.push({player:options[0],slot});}
  }
  return picks;
}
function recommendations() {
  const ideal=bestLineup(),idSet=new Set(ideal.map(x=>x.player.id));
  const current=data.players.filter(starter);
  const outs=current.filter(p=>!idSet.has(p.id));
  const ins=ideal.filter(x=>!current.some(p=>p.id===x.player.id));
  return ins.map(entry=>{
    const replaced=outs.find(p=>p.pos===entry.player.pos && (p.slot===entry.slot || entry.slot==="WRT"))||
      outs.find(p=>p.pos===entry.player.pos)||
      outs.find(p=>p.slot===entry.slot)||outs[0];
    if(replaced)outs.splice(outs.indexOf(replaced),1);
    return {add:entry.player,remove:replaced,slot:replaced?.slot||entry.slot};
  }).filter(x=>x.remove);
}
function total(players) { return players.reduce((n,p)=>n+(p.projection===null?0:p.projection),0); }
function comparison(p) {
  const match=p.rank?(p.rank<=12?"Favorable":p.rank>=24?"Difficult":"Neutral"):"Unrated";
  return match+(p.rank?" · opponent rank "+p.rank+"/32":"");
}
function rosterRow(p) {
  const editing=editId===p.id;
  const actual=livePlayer(p);
  const number=actual?.points!=null?TWO(actual.points):(p.projection===null?"—":TWO(p.projection));
  const status=p.status==="ACTIVE"?"":'<span class="mf-injury">'+ESC(p.status)+'</span>';
  let html='<article class="mf-player"><div class="mf-roster-main">'+
    '<span class="mf-position '+(starter(p)?"mf-start":"mf-bench")+'">'+ESC(p.slot)+'</span>'+
    '<div class="mf-person"><strong>'+ESC(p.name)+' '+status+'</strong><small>'+ESC(p.pos)+' · '+ESC(p.team)+(p.opponent?' vs '+ESC(p.opponent):'')+' · '+ESC(comparison(p))+'</small>'+
    '<small>Scouting grade '+p.talent+'/5 · Decision score '+(decision(p)<0?"—":TWO(decision(p)))+'</small></div>'+
    '<div class="mf-proj"><strong>'+number+'</strong><small>PROJ</small></div>'+
    '<button class="btn mf-edit" type="button" data-mf-edit="'+ESC(p.id)+'">'+(editing?"Close":"Edit")+'</button></div>';
  if(editing){
   const input=(name,label,value,type="text",extra="")=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+ESC(value==null?"":value)+'" '+extra+'></label>';
   const pick=(name,label,options,value)=>'<label>'+label+'<select name="'+name+'">'+options.map(o=>'<option value="'+ESC(o)+'" '+(o===value?"selected":"")+'>'+ESC(o)+'</option>').join("")+'</select></label>';
   html+='<form class="mf-edit-form" data-mf-save="'+ESC(p.id)+'"><div class="mf-fields">'+
     input("name","Player",p.name)+pick("pos","Position",POS,p.pos)+
     input("team","NFL team",p.team)+input("opponent","Opponent",p.opponent)+
     input("projection","Yahoo projection",p.projection,"number",'min="0" step="0.01"')+
     input("rank","Opponent rank (1–32)",p.rank||"","number",'min="1" max="32"')+
     input("talent","Scouting grade (1–5)",p.talent,"number",'min="1" max="5" step="0.5"')+
     pick("status","Availability",["ACTIVE","Q","D","OUT","IR"],p.status)+
     pick("slot","Your lineup",SLOTS[p.pos],p.slot)+
     '</div><div class="mf-row-actions"><button class="btn primary" type="submit">Save player</button>'+
     '<button class="btn danger" type="button" data-mf-remove="'+ESC(p.id)+'">Remove</button></div></form>';
  }
  return html+'</article>';
}
function advice() {
 const moves=recommendations();
 const warnings=data.players.filter(p=>starter(p)&&p.status!=="ACTIVE");
 const scoreCurrent=total(data.players.filter(starter));
 const scoreIdeal=total(bestLineup().map(x=>x.player));
 let markup='<section class="mf-advice"><div class="mf-section-head"><h3>Start / Sit Advisor</h3><span>Week 6 · Projection + matchup + role</span></div>'+
  '<div class="mf-metrics"><div><small>Current lineup projection</small><strong>'+TWO(scoreCurrent)+'</strong></div>'+
  '<div><small>Suggested lineup projection</small><strong>'+TWO(scoreIdeal)+'</strong></div>'+
  '<div><small>Possible projection gain</small><strong>+'+TWO(Math.max(0,scoreIdeal-scoreCurrent))+'</strong></div></div>';
 if(moves.length){
   markup+=moves.map(move=>'<div class="mf-swap"><div><small class="mf-swap-kicker">POTENTIAL SWAP · '+ESC(move.slot)+'</small>'+
     '<strong>START '+ESC(move.add.name)+'</strong><small>SIT '+ESC(move.remove.name)+'</small>'+
     '<p>'+TWO(move.add.projection)+' vs '+TWO(move.remove.projection)+' projected points. '+
     ESC(move.add.name)+' matchup: '+ESC(comparison(move.add))+'. '+
     'Check availability and kickoff times before changing Yahoo.</p></div>'+
     '<button class="btn primary" type="button" data-mf-swap="'+ESC(move.add.id)+'" data-mf-sit="'+ESC(move.remove.id)+'">Use in planner</button></div>').join("");
 }else markup+='<div class="mf-no-swaps">Your current starters match this advisor’s projection-based lineup. No immediate swap suggested.</div>';
 if(warnings.length) markup+='<div class="mf-warning"><strong>Availability watch</strong>'+
   warnings.map(p=>'<p>'+ESC(p.name)+' is marked '+ESC(p.status)+' in the saved screenshot/roster. Verify the latest injury status before kickoff, especially for late games.</p>').join("")+'</div>';
 markup+='<p class="mf-disclaimer">Advisory only: source projections and opponent rankings are from your Yahoo Week 6 screenshots. Scouting grades are editable subjective inputs, not verified player rankings. Small modifiers avoid double-counting matchups already reflected in Yahoo projections. This planner does not update your actual Yahoo starters. Live estimates use common NFL scoring rules, not your Yahoo league settings.</p></section>';
 return markup;
}
function page() {
 const starters=data.players.filter(starter),bench=data.players.filter(p=>!starter(p));
 const current=total(starters);
 return '<section class="mf-shell"><div class="mf-hero"><div><small>MANUAL YAHOO ROSTER · WEEK 6</small>'+
  '<h2>'+ESC(data.teamName)+'</h2><p>3–2 · 5th of 12 from your screenshot · 16 players captured</p></div>'+
  '<div class="mf-main-total"><small>LINEUP PROJECTION</small><strong>'+TWO(current)+'</strong><small>Yahoo screenshot baseline</small></div></div>'+
  '<div class="mf-toolbar"><span>Saved locally on this device · No Yahoo authorization needed</span>'+
  '<label>Scoring <select data-mf-scoring><option value="standard" '+(data.scoring==="standard"?"selected":"")+'>Standard</option>'+
  '<option value="half" '+(data.scoring==="half"?"selected":"")+'>Half-PPR</option>'+
  '<option value="ppr" '+(data.scoring==="ppr"?"selected":"")+'>Full PPR</option></select></label></div>'+
  (error?'<div class="mf-warning">'+ESC(error)+'</div>':"")+
  advice()+
  '<section class="mf-roster"><div class="mf-section-head"><h3>Starters</h3><span>Points / Projected</span></div>'+
  (starters.length?starters.map(rosterRow).join(""):'<div class="empty">No starter positions set.</div>')+
  '<div class="mf-section-head mf-bench-header"><h3>Bench</h3><span>Points / Projected</span></div>'+
  (bench.length?bench.map(rosterRow).join(""):'<div class="empty">No bench players.</div>')+'</section>'+
  '<details class="mf-add"><summary>+ Add another player</summary><form data-mf-add><div class="mf-fields">'+
  '<label>Full name<input required name="name" maxlength="90" placeholder="Player name"></label>'+
  '<label>Team<input required name="team" maxlength="3" placeholder="CHI"></label>'+
  '<label>Opponent<input name="opponent" maxlength="3" placeholder="ATL"></label>'+
  '<label>Position<select name="pos">'+POS.map(x=>'<option value="'+x+'">'+x+'</option>').join("")+'</select></label>'+
  '<label>Projection<input name="projection" type="number" min="0" step=".01"></label>'+
  '<label>Opponent rank<input name="rank" type="number" min="1" max="32"></label></div>'+
  '<button type="submit" class="btn primary">Add to bench</button></form></details>'+
  '<div class="mf-footer"><button class="btn" type="button" data-mf-export>Copy roster backup</button>'+
  '<button class="btn" type="button" data-mf-reset>Restore screenshot lineup</button>'+
  '<p>Yahoo projections remain the screenshot snapshot. ESPN-derived individual game stats refresh during games and use the scoring selector, but are NOT official Yahoo scoring. Defense scoring and special kicking bonuses may be unavailable. Edit values as news changes or send an updated roster screenshot. Manual changes are private to this browser until cloud syncing is implemented.</p></div></section>';
}

// Public ESPN box score is optional; its estimate is not official Yahoo scoring.
const gameBox=new Map(),lastGameCheck=new Map(),activeRequests=new Set();
function normalizeName(value){return String(value||"").toLowerCase().replace(/\\b(jr|sr|ii|iii|iv)\\b/g,"").replace(/[^a-z]/g,"");}
function stat(g,cat,keys){
 const row=g?.[cat];if(!row)return 0;
 const pair=Object.entries(row).find(([k])=>keys.includes(k.toUpperCase()));
 const value=Number(pair?.[1]);return Number.isFinite(value)?value:0;
}
function boxScore(p,game){
 const list=gameBox.get(game.away+"-"+game.home)||[];
 const record=list.find(x=>x.team===p.team&&normalizeName(x.name)===normalizeName(p.name));
 if(!record)return null;
 const g=record.groups||{};
 const passY=stat(g,"passing",["YDS"]),passTD=stat(g,"passing",["TD"]),ints=stat(g,"passing",["INT"]);
 const rushY=stat(g,"rushing",["YDS"]),rushTD=stat(g,"rushing",["TD"]);
 const rec=stat(g,"receiving",["REC"]),recY=stat(g,"receiving",["YDS"]),recTD=stat(g,"receiving",["TD"]);
 const lost=stat(g,"fumbles",["LST","FL"]);
 let points=null;
 if(["QB","RB","WR","TE"].includes(p.pos))
    points=passY/25+passTD*4-ints*2+rushY/10+rushTD*6+recY/10+recTD*6+rec*({standard:0,half:.5,ppr:1}[data.scoring]??.5)-lost*2;
 let summary=[];
 if(g.passing)summary.push(passY+" pass yds",passTD+" pass TD");
 if(g.rushing)summary.push(rushY+" rush yds",rushTD+" rush TD");
 if(g.receiving)summary.push(rec+" rec",recY+" rec yds",recTD+" rec TD");
 if(p.pos==="K"&&g.kicking){
   const pair=Object.entries(g.kicking).find(([k])=>["FG","FGM-A"].includes(k.toUpperCase()));
   const xp=Object.entries(g.kicking).find(([k])=>["XP","XPM-A"].includes(k.toUpperCase()));
   const made=v=>Number(String(v||"0").split("/")[0])||0;
   points=made(pair?.[1])*3+made(xp?.[1]);
   summary.push(made(pair?.[1])+" FG",made(xp?.[1])+" XP");
 }
 return {points:typeof points==="number"?Math.round(points*100)/100:null,detail:summary.join(" · ")};
}
function livePlayer(p){
 for(const key of gameBox.keys()){
   const teams=key.split("-");
   if(teams.includes(p.team))return boxScore(p,{away:teams[0],home:teams[1]});
 }
 return null;
}
function repaint(){
 document.dispatchEvent(new Event("wt-fantasy-change"));
 const root=document.getElementById("wt-manual-fantasy-root");
 if(root)root.innerHTML=page();
}
document.addEventListener("wt-score-update",event=>{
 for(const game of (event.detail?.games||[])){
   if(!game?.id||!["in","post"].includes(game.state))continue;
   if(!data.players.some(p=>p.team===game.away||p.team===game.home))continue;
   const key=game.away+"-"+game.home;
   if(activeRequests.has(key)||Date.now()-(lastGameCheck.get(key)||0)<(game.state==="post"?1200000:60000))continue;
   lastGameCheck.set(key,Date.now());activeRequests.add(key);
   fetch("/api/nfl-player-box?event="+encodeURIComponent(game.id),{cache:"no-store",credentials:"same-origin"})
     .then(async response=>{if(!response.ok)throw Error("Unavailable");return response.json();})
     .then(result=>{if(result.ok&&Array.isArray(result.players)){gameBox.set(key,result.players);repaint();}})
     .catch(()=>{}).finally(()=>activeRequests.delete(key));
 }
});

function gameRows(game) {
 const matched=data.players.filter(p=>p.team===game.away||p.team===game.home);
 if(!matched.length)return "";
 matched.sort((a,b)=>Number(starter(b))-Number(starter(a)));
 return '<div class="wt-fantasy-inside"><div class="wt-fantasy-match-head"><strong>Monsters of the Midway · Fantasy</strong><span>'+matched.length+' player'+(matched.length===1?"":"s")+'</span></div>'+
  matched.map(p=>{
    const actual=boxScore(p,game);
    const number=actual?.points!=null?actual.points:p.projection;
    const label=actual?.points!=null?"EST PTS":"PROJ";
    return '<div class="wt-fantasy-player"><span class="wt-fantasy-role '+(starter(p)?"starter":"bench")+'">'+ESC(p.slot)+'</span>'+
      '<div class="wt-fantasy-person"><strong>'+ESC(p.name)+(p.status!=="ACTIVE"?' · '+ESC(p.status):'')+'</strong>'+
      '<small>'+ESC(p.pos)+' · '+ESC(p.team)+(actual?.detail?' · '+ESC(actual.detail):' · '+ESC(comparison(p)))+'</small></div>'+
      '<div class="wt-fantasy-pts"><strong>'+TWO(number)+'</strong><small>'+label+'</small></div></div>';
    }).join("")+
  '</div>';
}
function toolbar() {
 const starters=data.players.filter(starter);
 return '<div class="wt-fantasy-toolbar"><div><strong>Monsters of the Midway · My Fantasy</strong>'+
   '<small>Manual roster · Week 6 · Live points from ESPN are estimates</small></div>'+
   '<div class="wt-fantasy-total"><strong>'+TWO(total(starters))+'</strong><small>Projected starter points</small></div>'+
   '<button class="btn primary" type="button" data-go="fantasy">Start / Sit Advisor →</button></div>';
}
function refresh() {
 const root=document.getElementById("wt-manual-fantasy-root");
 if(root)root.innerHTML=page();
 save();
}
document.addEventListener("click",event=>{
 const edit=event.target.closest("[data-mf-edit]");
 if(edit){editId=edit.dataset.mfEdit===editId?"":edit.dataset.mfEdit;const root=document.getElementById("wt-manual-fantasy-root");if(root)root.innerHTML=page();return;}
 const swap=event.target.closest("[data-mf-swap]");
 if(swap) {
   const incoming=data.players.find(p=>p.id===swap.dataset.mfSwap),outgoing=data.players.find(p=>p.id===swap.dataset.mfSit);
   if(incoming&&outgoing && incoming.slot==="BN" && outgoing.slot!=="BN"){
     incoming.slot=outgoing.slot;outgoing.slot="BN";refresh();
   }return;
 }
 const del=event.target.closest("[data-mf-remove]");
 if(del){if(confirm("Remove this player from your planner?")){data.players=data.players.filter(p=>p.id!==del.dataset.mfRemove);editId="";refresh();}return;}
 if(event.target.closest("[data-mf-reset]")){
   if(confirm("Restore all 16 players and starting slots from your Week 6 screenshots? This overwrites manual edits.")){data=fresh();editId="";refresh();}return;
 }
 if(event.target.closest("[data-mf-export]")){
   const text=JSON.stringify(data,null,2);
   if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>alert("Fantasy roster copied.")).catch(()=>prompt("Copy your roster backup",text));}
   else prompt("Copy your roster backup",text);
 }
});
document.addEventListener("change",event=>{
 if(event.target.matches("[data-mf-scoring]")){
   data.scoring=event.target.value;refresh();
 }
});
document.addEventListener("submit",event=>{
 const form=event.target;
 if(form.matches("[data-mf-save]")){
   event.preventDefault();
   const player=data.players.find(p=>p.id===form.dataset.mfSave);if(!player)return;
   const v=new FormData(form);
   const pos=String(v.get("pos")),slot=String(v.get("slot"));
   Object.assign(player,normalize({...player,name:v.get("name"),team:v.get("team"),opponent:v.get("opponent"),
     pos,slot:SLOTS[pos]?.includes(slot)?slot:"BN",projection:v.get("projection"),rank:v.get("rank"),
     talent:v.get("talent"),status:v.get("status")}));
   editId="";refresh();return;
 }
 if(form.matches("[data-mf-add]")){
   event.preventDefault();const v=new FormData(form);
   data.players.push(normalize({id:"added-"+Date.now(),name:v.get("name"),team:v.get("team"),
     opponent:v.get("opponent"),pos:v.get("pos"),slot:"BN",projection:v.get("projection"),
     rank:v.get("rank"),talent:3,status:"ACTIVE"}));
   refresh();
 }
});
window.WTManualFantasy = {page,toolbar,gameRows,getPlayers:()=>data.players.map(x=>({...x})),getAdvice:recommendations};
document.dispatchEvent(new Event("wt-fantasy-change"));
})();