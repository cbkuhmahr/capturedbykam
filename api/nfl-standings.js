"use strict";
// ESPN NFL standings, read-only. Compact response for game detail sheets.
const ENDPOINT="https://site.api.espn.com/apis/v2/sports/football/nfl/standings";
const aliases={WSH:"WAS",JAC:"JAX",LA:"LAR"};
const safeText=(s,max=80)=>String(s??"").slice(0,max);
function stat(row,key){
 const s=(row.stats||[]).find(x=>String(x.name||"").toLowerCase()===key.toLowerCase());
 const n=Number(s?.value??s?.displayValue);
 return Number.isFinite(n)?n:null;
}
function parse(data){
 const groups=[];
 function scan(node,parents=[],depth=0){
  if(!node||typeof node!=="object"||depth>7)return;
  const name=safeText(node.name||node.abbreviation,80);
  const trail=name?[...parents,name]:parents;
  const entries=node.standings?.entries;
  if(Array.isArray(entries)&&entries.length){
   const conference=trail.some(s=>/\bAFC\b|American Football Conference/i.test(s))?"AFC":
                    trail.some(s=>/\bNFC\b|National Football Conference/i.test(s))?"NFC":"NFL";
   const groupName=trail.slice().reverse().find(s=>/(East|West|North|South)/i.test(s))||trail.at(-1)||"Standings";
   const teams=entries.map(e=>{
    const code=safeText(e.team?.abbreviation,4).toUpperCase();
    if(!/^[A-Z]{2,4}$/.test(code))return null;
    const wins=stat(e,"wins"),losses=stat(e,"losses"),ties=stat(e,"ties"),pct=stat(e,"winPercent");
    return {team:aliases[code]||code,name:safeText(e.team?.displayName||e.team?.shortDisplayName||code,60),
      wins,losses,ties:ties??0,pct};
   }).filter(Boolean);
   if(teams.length)groups.push({name:groupName,conference,teams});
  }
  if(Array.isArray(node.children))for(const c of node.children)scan(c,trail,depth+1);
 }
 scan(data);
 return groups.filter(x=>x.teams.length>0).slice(0,16);
}
module.exports=async function handler(req,res){
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({ok:false,error:"Method not allowed"});}
 try{
  const response=await fetch(ENDPOINT+"?season=2026&seasontype=2",
    {headers:{Accept:"application/json"},signal:AbortSignal.timeout(8500)});
  if(!response.ok)throw Error("Standings provider unavailable");
  const groups=parse(await response.json());
  if(!groups.length)throw Error("Standings unavailable");
  res.setHeader("Cache-Control","public, s-maxage=600, stale-while-revalidate=1200");
  return res.status(200).json({ok:true,season:2026,groups});
 }catch{
  res.setHeader("Cache-Control","no-store");
  return res.status(502).json({ok:false,error:"NFL standings temporarily unavailable"});
 }
};
