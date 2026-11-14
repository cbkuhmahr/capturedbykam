"use strict";
// Public, read-only NFL box score; fetched only when a game is opened.
// No saved picks, admin sessions, or user account data enter this endpoint.
module.exports=async function handler(req,res){
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({ok:false,error:"Method not allowed"});}
 const id=String(req.query?.event||"");
 if(!/^\d{6,12}$/.test(id))return res.status(400).json({ok:false,error:"Invalid game"});
 try{
  const response=await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event="+encodeURIComponent(id),{
   headers:{Accept:"application/json"},signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error("Game details unavailable");
  const data=await response.json();
  const comp=data.header?.competitions?.[0]||{};
  const quarters=(comp.competitors||[]).map(c=>({
   side:c.homeAway==="home"?"home":"away",
   team:String(c.team?.abbreviation||"").slice(0,4).toUpperCase(),
   scores:(c.linescores||[]).slice(0,6).map(q=>Number.isFinite(Number(q.value))?Number(q.value):null)
  }));
  const teams=(data.boxscore?.teams||[]).map(t=>({
   team:String(t.team?.abbreviation||"").slice(0,4).toUpperCase(),
   stats:(t.statistics||[]).slice(0,28).map(s=>({
    key:String(s.name||"").slice(0,48),
    label:String(s.label||s.name||"").slice(0,60),
    value:String(s.displayValue??"").slice(0,64)
   }))
  }));
  const scoring=(data.scoringPlays||[]).slice(-14).map(p=>({
   period:Number(p.period?.number)||null,
   clock:String(p.clock?.displayValue||"").slice(0,18),
   text:String(p.text||"").slice(0,220),
   awayScore:Number.isFinite(Number(p.awayScore))?Number(p.awayScore):null,
   homeScore:Number.isFinite(Number(p.homeScore))?Number(p.homeScore):null
  }));
  res.setHeader("Cache-Control","public, s-maxage=40, stale-while-revalidate=80");
  return res.status(200).json({ok:true,quarters,teams,scoring});
 }catch{
  res.setHeader("Cache-Control","no-store");
  return res.status(502).json({ok:false,error:"Detailed stats temporarily unavailable"});
 }
};
