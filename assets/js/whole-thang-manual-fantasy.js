(() => {
"use strict";
const KEY="wt-fantasy-manual-v1",POSITIONS=["QB","RB","WR","TE","K","DST"];
const TEAMS="ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LAR LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS".split(" ");
const BASE={QB:17,RB:10,WR:10,TE:7,K:8,DST:7};
const SNAPSHOT=[["Dak Prescott","DAL","QB","START",21.86,29,"active"],["D'Andre Swift","CHI","RB","START",14.4,21,"active"],["Bucky Irving","TB","RB","START",14.04,11,"active"],["Jaxon Smith-Njigba","SEA","WR","START",21.53,29,"active"],["Drake London","ATL","WR","START",18.37,15,"active"],["Stefon Diggs","WAS","WR","START",11.53,26,"Q"],["Colston Loveland","CHI","TE","START",9.86,13,"active"],["Rhamondre Stevenson","NE","RB","START",17.24,10,"active"],["Cameron Dicker","LAC","K","START",6.95,13,"active"],["Seattle Seahawks D/ST","SEA","DST","START",6.67,20,"active"],["Kyle Pitts Sr.","ATL","TE","BN",7.91,30,"active"],["Jordan Love","GB","QB","BN",24.33,5,"active"],["Jerry Jeudy","CLE","WR","BN",5.45,10,"active"],["Cooper Kupp","SEA","WR","BN",6.14,29,"active"],["Cole Kmet","CHI","TE","BN",3.29,13,"active"],["Demario Douglas","NE","WR","BN",7.29,23,"active"]];
function screenshotRoster(){return SNAPSHOT.map(([name,team,pos,slot,avg,rank,availability],i)=>({id:"screenshot-"+i,name,team,pos,slot,avg,rank,availability,tier:3,source:"yahoo-week6"}));}

const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g,"");
const validAvg=v=>v===""||v==null?null:Number.isFinite(+v)?Math.max(0,Math.min(75,+v)):null;
let state={players:screenshotRoster(),scoring:"half"},editor=false,note="",gameList=[],box=new Map(),busy=new Set();
function emit(){document.dispatchEvent(new Event("wt-manual-fantasy-change"));}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{note="Browser storage may be unavailable.";}emit();}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(x&&Array.isArray(x.players)){state.players=(x.players.length?x.players:screenshotRoster()).filter(p=>p&&typeof p.name==="string").slice(0,80).map(p=>({id:String(p.id||""),name:p.name.slice(0,75),team:TEAMS.includes(p.team)?p.team:"",pos:POSITIONS.includes(p.pos)?p.pos:"",avg:validAvg(p.avg),rank:Math.max(0,Math.min(32,Number(p.rank)||0)),source:p.source==="yahoo-week6"?"yahoo-week6":"manual",tier:Math.max(1,Math.min(5,+p.tier||3)),slot:p.slot==="START"?"START":"BN",availability:["active","Q","OUT"].includes(p.availability)?p.availability:"active"}));state.scoring=["standard","half","ppr"].includes(x.scoring)?x.scoring:"half";}}catch{}}
function games(){return window.WTScoreGames?.length?window.WTScoreGames:(window.WTScouting?.games||gameList);}
function match(p){
 const g=games().find(g=>g.away===p.team||g.home===p.team),against=g?(g.away===p.team?g.home:g.away):"";
 const t=window.WTScouting?.teams?.[against];
 const rank=Number(p.rank)||0;
 if(rank>=1&&rank<=32){const factor=((16.5-rank)/15.5)*.055;return {against,factor,label:(rank<=10?"Favorable":rank>=24?"Difficult":"Neutral")+" (Yahoo positional defense rank "+rank+"/32; Week 6 screenshot)"};}
 if(!against)return {against:"",factor:0,label:"Bye / no scheduled Week 6 game"};
 if(!t?.games)return {against,factor:0,label:"Opponent strength unavailable"};
 const difference=p.pos==="DST"?22-t.pf/t.games:t.pa/t.games-22;
 const factor=Math.max(-.13,Math.min(.13,difference/40));
 return {against,factor,label:(factor>.055?"Favorable":factor<-.055?"Tough":"Neutral")+" matchup (team-scoring proxy)"};
}
function model(p){
 const m=match(p),known=p.avg!=null,baseline=known?p.avg:BASE[p.pos]||0;
 const tier=known?1+(p.tier-3)*.02:({1:.68,2:.84,3:1,4:1.18,5:1.38}[p.tier]||1);
 const points=!p.pos||!m.against||p.availability==="OUT"?-1:baseline*tier*(1+m.factor)*(p.availability==="Q"&&p.source!=="yahoo-week6"?.9:1);
 return {...p,match:m,points,known};
}
function scores(){return state.players.map(model).sort((a,b)=>b.points-a.points);}
function recommended(){
 const all=scores().filter(p=>p.points>=0),used=new Set(),list=[];
 function take(allowed){const next=all.find(p=>!used.has(p.id)&&allowed.includes(p.pos));if(next){used.add(next.id);list.push(next);}}
 take(["QB"]);take(["RB"]);take(["RB"]);take(["WR"]);take(["WR"]);take(["WR"]);take(["TE"]);take(["RB","WR","TE"]);take(["K"]);take(["DST"]);
 return list;
}
function option(values,value,blank){return (blank?'<option value="">'+html(blank)+'</option>':"")+values.map(v=>'<option value="'+html(v)+'" '+(v===value?"selected":"")+'>'+html(v)+'</option>').join("");}
function fantasyPoints(obj){
 if(!obj)return null;
 const s=obj.stats||{},ppr=state.scoring==="ppr"?1:state.scoring==="half"?.5:0;
 return ((s.passYds||0)/25+(s.passTD||0)*4-(s.int||0)+(s.rushYds||0)/10+(s.rushTD||0)*6+(s.recYds||0)/10+(s.recTD||0)*6+(s.rec||0)*ppr-(s.fumLost||0)*2).toFixed(2);
}
function gameRows(game,result){
 const roster=state.players.filter(p=>p.team&&(p.team===game.away||p.team===game.home));
 if(!roster.length)return "";
 const available=box.get(String(result?.id||""))?.data?.players||[];
 const lines=roster.map(p=>{
  const row=result?.state!=="pre"?available.find(x=>x.team===p.team&&norm(x.name)===norm(p.name)):null;
  const stats=row?.stats||{};
  const detail=[stats.passYds!=null?stats.passYds+" pass yd":"",stats.rushYds!=null?stats.rushYds+" rush yd":"",stats.rec!=null?stats.rec+" rec":"",stats.recYds!=null?stats.recYds+" rec yd":""].filter(Boolean).join(" · ");
  const points=p.pos==="K"||p.pos==="DST"?null:fantasyPoints(row);
  return '<div class="wt-manual-game-player"><span class="wt-manual-slot '+(p.slot==="START"?"on":"")+'">'+(p.slot==="START"?"START":"BENCH")+'</span><span><b>'+html(p.name)+'</b><small>'+html(p.pos||"Assign position")+' · '+html(detail||(result?.state==="pre"?"Upcoming":"Stats pending"))+'</small></span><strong>'+(points??"—")+'</strong></div>';
 }).join("");
 return '<div class="wt-manual-game-players"><div class="wt-manual-match-head"><strong>My fantasy players</strong><span>Est. '+(state.scoring==="half"?"½-PPR":html(state.scoring.toUpperCase()))+' points</span></div>'+lines+'<small class="wt-manual-foot">Read-only ESPN box-score estimates, not official Yahoo totals. Bonuses, kickers, and team defenses are excluded.</small></div>';
}
function rosterEditor(){
 const scoring=option(["standard","half","ppr"],state.scoring);
 return '<div class="wt-manual-editor"><div class="wt-manual-settings"><label>Scoring<select data-m-scoring="1">'+scoring+'</select></label><span>Yahoo public leagues generally use half-PPR; confirm your private league rules.</span></div>'+
 '<label class="wt-manual-paste-label">Paste players or backup JSON <small>(Name | TEAM | POS | Avg PPG; names alone also work)</small><textarea id="wt-m-paste" rows="4" placeholder="Josh Allen | BUF | QB | 20.5\nBijan Robinson | ATL | RB | 18.1\nOr just a player name"></textarea></label>'+
 '<div class="wt-manual-editor-actions"><button type="button" class="btn primary" data-m-import="1">Add players</button><button type="button" class="btn" data-m-auto="1">Use suggested lineup here</button><button type="button" class="btn" data-m-backup="1">Copy backup</button></div>'+
 (note?'<p class="wt-manual-note">'+html(note)+'</p>':"")+
 '<div class="wt-manual-edit-list">'+state.players.map(p=>
 '<div class="wt-manual-edit-player" data-m-id="'+html(p.id)+'"><label>Name<input maxlength="75" data-m-field="name" value="'+html(p.name)+'"></label>'+
 '<label>Team<select data-m-field="team">'+option(TEAMS,p.team,"Team")+'</select></label>'+
 '<label>Pos<select data-m-field="pos">'+option(POSITIONS,p.pos,"Pos")+'</select></label>'+
 '<label>Week 6 proj / Avg PPG<input type="number" data-m-field="avg" min="0" max="75" step=".1" placeholder="Optional" value="'+(p.avg??"")+'"></label>'+
 '<label>Yahoo opponent rank (1–32)<input type="number" data-m-field="rank" min="1" max="32" value="'+(p.rank||"")+'"></label>'+ '<label>Talent tier<select data-m-field="tier">'+[1,2,3,4,5].map(v=>'<option value="'+v+'" '+(p.tier===v?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
 '<label>Lineup<select data-m-field="slot"><option value="START" '+(p.slot==="START"?"selected":"") +'>Starter</option><option value="BN" '+(p.slot==="BN"?"selected":"") +'>Bench</option></select></label>'+
 '<label>Injury status*<select data-m-field="availability"><option value="active" '+(p.availability==="active"?"selected":"")+'>Active</option><option value="Q" '+(p.availability==="Q"?"selected":"")+'>Questionable</option><option value="OUT" '+(p.availability==="OUT"?"selected":"")+'>Out</option></select></label>'+
 '<button class="btn danger" data-m-remove="'+html(p.id)+'">Remove</button></div>').join("")+'</div>'+
 '<small>Injury statuses are manually entered, not checked against a live report. Your fantasy roster is stored only on this device; pick’em cloud data is untouched.</small></div>';
}
function toolbar(){
 const list=scores(),chosen=recommended(),selection=new Set(chosen.map(x=>x.id)),swaps=list.filter(p=>selection.has(p.id)&&p.slot!=="START"),poor=list.filter(p=>p.slot==="START"&&!selection.has(p.id));
 let advice=swaps.length?'<div class="wt-manual-swap">'+swaps.slice(0,5).map(p=>{
  const replacing=poor.find(x=>x.pos===p.pos||(["RB","WR","TE"].includes(p.pos)&&["RB","WR","TE"].includes(x.pos)));
  return '<div><strong>Consider START '+html(p.name)+'</strong><span>'+(replacing?'over '+html(replacing.name)+' · ':'')+
  (p.points>=0?p.points.toFixed(1):"—")+' planning points · '+html(p.match.label)+'</span></div>';
 }).join("")+'</div>':list.length?'<p class="wt-manual-light">Your selected starters match this preliminary lineup.</p>':"";
 if(list.length&&!list.some(x=>x.known))advice='<p class="wt-manual-light">No player averages entered yet. Ratings currently use generic position baselines and your talent tiers, not verified projections.</p>'+advice;
 const details=list.length?'<div class="wt-manual-recommendations"><div class="wt-manual-headline"><strong>Start / Sit · Preliminary</strong><span>Default lineup: QB · 2 RB · 3 WR · TE · FLEX · K · DST</span></div>'+advice+
 '<div class="wt-manual-rankings">'+list.map(p=>{
  const flag=p.points<0?"VERIFY":selection.has(p.id)?"START":"SIT";
  return '<div class="wt-manual-ranked"><span class="wt-manual-advice '+flag.toLowerCase()+'">'+flag+'</span><div><b>'+html(p.name)+'</b><small>'+html(p.pos||"Position needed")+' · '+html(p.team||"Team needed")+(p.match.against?' vs '+html(p.match.against):' · Bye/unknown')+' · '+(p.source==="yahoo-week6"?"Yahoo screenshot projection":p.known?"Points entered":"Tier "+p.tier+" assumption")+'</small></div><strong>'+(p.points<0?"—":p.points.toFixed(1))+'</strong></div>';
 }).join("")+'</div><p class="wt-manual-disclosure">These are planning estimates, not official Yahoo projections. Opponent defense is approximated using the first five NFL weeks’ points allowed, not position-specific fantasy points allowed. Check injuries, usage, scoring, and lineup settings.</p></div>':
 '<div class="wt-manual-empty">Add your roster to see Week 6 matchups, projected start/sit rankings, and live player stats. Names alone are fine — then assign NFL team and position.</div>';
 return '<section class="wt-manual-shell"><div class="wt-manual-intro"><div><h3>Fantasy Scouting Lab <small>Week 6</small></h3><p>No Yahoo access needed. Your Monsters of the Midway roster is loaded from the screenshots. Compare Week 6 matchups and estimated points.</p></div><button type="button" class="btn primary" data-m-toggle="1">'+(editor?"Close editor":"Manage roster")+'</button></div>'+details+(editor?rosterEditor():"")+'</section>';
}
function importPlayers(raw){
 const input=String(raw||"").trim();
 if(input.startsWith("{")){
  try{
   const parsed=JSON.parse(input);
   if(!parsed||!Array.isArray(parsed.players)||parsed.players.length>80)throw Error("Invalid backup");
   state.players=parsed.players.filter(p=>p&&typeof p.name==="string"&&p.name.trim()).map(p=>({
    id:Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10),
    name:p.name.slice(0,75),team:TEAMS.includes(p.team)?p.team:"",pos:POSITIONS.includes(p.pos)?p.pos:"",
    avg:validAvg(p.avg),tier:Math.max(1,Math.min(5,+p.tier||3)),
    slot:p.slot==="START"?"START":"BN",availability:["active","Q","OUT"].includes(p.availability)?p.availability:"active"
   }));
   state.scoring=["standard","half","ppr"].includes(parsed.scoring)?parsed.scoring:"half";
   note="Roster backup imported into this device. Check lineup and scoring.";persist();
  }catch{note="Backup JSON could not be imported.";emit();}
  return;
 }
 let added=0;
 for(const line of String(raw||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,80)){
  let [name,team,pos,avg]=line.split(/[|,]/).map(s=>s.trim());
  const short=line.match(/^(QB|RB|WR|TE|K|DST)\s*[-–:]\s*(.+?)\s*[-–:]\s*([A-Za-z]{2,3})$/i);
  if(short){pos=short[1];name=short[2];team=short[3];}
  if(!name||name.length<2||state.players.some(p=>norm(p.name)===norm(name)))continue;
  if(state.players.length>=80)break;
  state.players.push({id:Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10),name:name.slice(0,75),team:TEAMS.includes(String(team||"").toUpperCase())?team.toUpperCase():"",pos:POSITIONS.includes(String(pos||"").toUpperCase())?pos.toUpperCase():"",avg:validAvg(avg),rank:0,source:"manual",tier:3,slot:"BN",availability:"active"});added++;
 }
 note=added?added+" player(s) added.":"No new players detected.";persist();
}
async function refreshBox(){
 const all=games(),assigned=new Set(state.players.map(p=>p.team).filter(Boolean));
 for(const game of all){
  if(!game.id||game.state==="pre"||!(assigned.has(game.away)||assigned.has(game.home)))continue;
  const id=String(game.id),cached=box.get(id);
  if(busy.has(id)||cached&&Date.now()-cached.at<(game.state==="post"?900000:90000))continue;
  busy.add(id);
  try{const r=await fetch("/api/nfl-fantasy-boxscore?event="+encodeURIComponent(id),{cache:"no-store"});
   const result=await r.json();box.set(id,{at:Date.now(),data:result?.ok?result:{players:[]}});
  }catch{box.set(id,{at:Date.now(),data:{players:[]}});}
  finally{busy.delete(id);emit();}
 }
}
document.addEventListener("click",e=>{
 if(e.target.closest("[data-m-toggle]")){editor=!editor;emit();return;}
 if(e.target.closest("[data-m-import]")){importPlayers(document.getElementById("wt-m-paste")?.value);refreshBox();return;}
 const remove=e.target.closest("[data-m-remove]");
 if(remove){state.players=state.players.filter(p=>p.id!==remove.dataset.mRemove);persist();return;}
 if(e.target.closest("[data-m-auto]")){const chosen=new Set(recommended().map(x=>x.id));state.players.forEach(p=>p.slot=chosen.has(p.id)?"START":"BN");note="Suggested starters saved locally. Your Yahoo lineup was not changed.";persist();return;}
 if(e.target.closest("[data-m-backup]")){navigator.clipboard?.writeText(JSON.stringify(state,null,2)).then(()=>{note="Backup copied";emit();}).catch(()=>{note="Clipboard unavailable";emit();});}
});
document.addEventListener("change",e=>{
 const s=e.target.closest("[data-m-scoring]");
 if(s){state.scoring=s.value;note="Confirm averages are for the selected scoring format.";persist();return;}
 const input=e.target.closest("[data-m-field]");if(!input)return;
 const row=input.closest("[data-m-id]"),p=state.players.find(p=>p.id===row?.dataset.mId);if(!p)return;
 const f=input.dataset.mField,v=input.value;
 if(f==="name")p.name=v.trim().slice(0,75)||p.name;
 if(f==="team")p.team=TEAMS.includes(v)?v:"";
 if(f==="pos")p.pos=POSITIONS.includes(v)?v:"";
 if(f==="avg")p.avg=validAvg(v);
 if(f==="rank")p.rank=Math.max(0,Math.min(32,Number(v)||0));
 if(f==="tier")p.tier=Math.max(1,Math.min(5,Number(v)||3));
 if(f==="slot")p.slot=v==="START"?"START":"BN";
 if(f==="availability")p.availability=["active","Q","OUT"].includes(v)?v:"active";
 persist();refreshBox();
});
document.addEventListener("wt-scores-ready",()=>{gameList=window.WTScoreGames||[];refreshBox();});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshBox();});
setInterval(()=>{if(!document.hidden)refreshBox();},90000);
window.WTManualFantasy={toolbar,gameRows,roster:()=>state.players.slice()};
load();emit();
})();