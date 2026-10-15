"use strict";
// Read-only public NFL box-score adapter. No Yahoo credentials, roster, or pick state.
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";
const ALIASES={WSH:"WAS",JAC:"JAX",LA:"LAR",STL:"LAR",OAK:"LV",SD:"LAC"};
const cleanTeam=code=>ALIASES[String(code||"").toUpperCase()]||String(code||"").toUpperCase();
const clamp=(s,n)=>String(s||"").slice(0,n);
function parseAthletes(payload){
  const box=payload&&payload.boxscore;
  if(!box||!Array.isArray(box.players))return [];
  const teamMap=new Map();
  for(const entry of (box.teams||[])){
    if(entry?.team?.id&&entry?.team?.abbreviation)teamMap.set(String(entry.team.id),cleanTeam(entry.team.abbreviation));
  }
  const results=new Map();
  for(const teamEntry of box.players.slice(0,2)){
    const team=cleanTeam(teamEntry?.team?.abbreviation||teamMap.get(String(teamEntry?.team?.id||""))||"");
    for(const block of (teamEntry.statistics||[]).slice(0,24)){
      const category=clamp(block.name,35).toLowerCase();
      if(!category||!Array.isArray(block.athletes))continue;
      const labels=Array.isArray(block.labels)?block.labels.map(x=>clamp(x,25)):[];
      for(const item of block.athletes.slice(0,80)){
        const a=item?.athlete||{};
        const name=clamp(a.fullName||a.displayName,90);
        if(!name)continue;
        const key=String(a.id||name)+"-"+team;
        if(!results.has(key))results.set(key,{id:clamp(a.id,16),name,team,groups:{}});
        const stats=Array.isArray(item.stats)?item.stats:[];
        const row={};
        for(let i=0;i<Math.min(stats.length,24);i++){
          const label=labels[i]||"Column "+(i+1);
          row[label]=clamp(stats[i],25);
        }
        results.get(key).groups[category]=row;
      }
    }
  }
  return [...results.values()].slice(0,220);
}
module.exports=async function handler(req,res){
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Access-Control-Allow-Origin","https://www.capturedbykam.com");
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({ok:false,error:"Method not allowed"});}
  const event=String(req.query?.event||"");
  if(!/^\d{7,12}$/.test(event))return res.status(400).json({ok:false,error:"Invalid ESPN event ID"});
  try{
    const request=await fetch(ESPN+"?event="+encodeURIComponent(event),{
      headers:{Accept:"application/json"},signal:AbortSignal.timeout(8500)
    });
    if(!request.ok)throw Error("ESPN summary "+request.status);
    const data=await request.json();
    const players=parseAthletes(data);
    if(!data.boxscore||!Array.isArray(data.boxscore.players))throw Error("Box score has not been published");
    res.setHeader("Cache-Control","public, s-maxage=35, stale-while-revalidate=40");
    return res.status(200).json({ok:true,source:"ESPN box score",event,updatedAt:new Date().toISOString(),players});
  }catch{
    res.setHeader("Cache-Control","no-store");
    return res.status(502).json({ok:false,error:"Player box score temporarily unavailable"});
  }
};
