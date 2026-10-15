"use strict";
const ENDPOINT="https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";
const ALIASES={WSH:"WAS",JAC:"JAX",LA:"LAR",OAK:"LV",SD:"LAC"};
const code=s=>ALIASES[String(s||"").toUpperCase()]||String(s||"").toUpperCase();
const simple=s=>String(s||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g,"");
const number=s=>{const n=Number(String(s??"").replace(/,/g,"").split("/")[0]);return Number.isFinite(n)?n:0;};
const STATS={passing:{YDS:"passYds",TD:"passTD",INT:"int"},rushing:{YDS:"rushYds",TD:"rushTD"},receiving:{REC:"rec",YDS:"recYds",TD:"recTD"},fumbling:{LOST:"fumLost"},fumbles:{LOST:"fumLost"},kicking:{FG:"fgMade",FGM:"fgMade",XP:"xpMade",XPM:"xpMade",PTS:"kickPts"}};
function parseBoxscore(data){
 const result=new Map();
 for(const group of data?.boxscore?.players||[]){
  const team=code(group?.team?.abbreviation);
  for(const category of group.statistics||[]){
   const kind=String(category.name||"").toLowerCase(),keys=STATS[kind];
   if(!keys)continue;
   for(const row of category.athletes||[]){
    const name=String(row.athlete?.displayName||row.athlete?.fullName||"");
    if(!name||!team)continue;
    const id=team+":"+simple(name);
    if(!result.has(id))result.set(id,{name,team,stats:{}});
    const player=result.get(id);
    for(const [i,label] of (category.labels||[]).entries()){
     const stat=keys[String(label).toUpperCase()];
     if(stat&&row.stats?.[i]!=null)player.stats[stat]=number(row.stats[i]);
    }
   }
  }
 }
 return [...result.values()];
}
module.exports=async function handler(req,res){
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET")return res.status(405).json({ok:false,error:"GET only"});
 const event=String(req.query?.event||"");
 if(!/^\d{8,12}$/.test(event))return res.status(400).json({ok:false,error:"Invalid event"});
 try{
  const u=new URL(ENDPOINT);u.searchParams.set("event",event);
  const response=await fetch(u,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Error("Boxscore unavailable");
  const data=await response.json();
  if(!data?.boxscore)throw Error("No player stats");
  res.setHeader("Cache-Control","public, s-maxage=35, stale-while-revalidate=45");
  return res.status(200).json({ok:true,event,updatedAt:new Date().toISOString(),source:"ESPN boxscore",players:parseBoxscore(data)});
 }catch{return res.status(502).json({ok:false,error:"Player stats are unavailable right now"});}
};
