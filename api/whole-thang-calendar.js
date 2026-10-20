"use strict";
const URL_NFL="https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const START=Date.parse("2026-09-10T00:00:00Z"),DAY=86400000;
const ALIASES={WSH:"WAS",JAC:"JAX",LA:"LAR",SD:"LAC",OAK:"LV"};
const team=s=>ALIASES[String(s||"").toUpperCase()]||String(s||"").toUpperCase();
const utc=ms=>new Date(ms).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
const esc=s=>String(s).replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
function event({id,summary,start,end,description,alarm}){
 const rows=["BEGIN:VEVENT","UID:"+id+"@capturedbykam.com","DTSTAMP:"+utc(Date.now()),"DTSTART:"+utc(start),"DTEND:"+utc(end),"SUMMARY:"+esc(summary),"DESCRIPTION:"+esc(description),"STATUS:CONFIRMED"];
 if(alarm)rows.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Pick reminder","TRIGGER:-PT2H","END:VALARM");
 return rows.concat("END:VEVENT");
}
async function gamesFor(week){
 const u=new URL(URL_NFL);
 for(const [key,v]of Object.entries({season:2026,seasontype:2,week,limit:50}))u.searchParams.set(key,String(v));
 const response=await fetch(u,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(8500)});
 if(!response.ok)throw Error("NFL schedule request failed");
 const data=await response.json();
 if(!Array.isArray(data.events))throw Error("NFL schedule missing");
 const games=data.events.map(e=>{
  const c=e?.competitions?.[0],h=c?.competitors?.find(x=>x.homeAway==="home"),a=c?.competitors?.find(x=>x.homeAway==="away");
  const date=Date.parse(e.date||c?.date||"");
  if(!h?.team?.abbreviation||!a?.team?.abbreviation||!Number.isFinite(date))return null;
  const status=e.status?.type||c?.status?.type||{};
  return {home:team(h.team.abbreviation),away:team(a.team.abbreviation),start:date,final:status.state==="post"&&!!status.completed};
 }).filter(Boolean).sort((a,b)=>a.start-b.start);
 if(games.length<10)throw Error("Incomplete NFL week");
 return games;
}
module.exports=async function handler(req,res){
 if(!["GET","HEAD"].includes(req.method))return res.status(405).end("Method not allowed");
 try{
  const base=Math.max(6,Math.min(18,Math.floor((Date.now()-START)/(7*DAY))+1));
  let week=base,games=await gamesFor(base);
  if(base<18&&games.every(x=>x.final)){week=base+1;games=await gamesFor(week);}
  const parts=["BEGIN:VCALENDAR","VERSION:2.0","CALSCALE:GREGORIAN","METHOD:PUBLISH",
   "PRODID:-//CapturedByKam//Scott Family NFL Pickem Calendar//EN","X-WR-CALNAME:Scott Family NFL Pick'em",
   "X-WR-CALDESC:Public NFL Week "+week+" games and pick deadline. No private selections.",
   "REFRESH-INTERVAL;VALUE=DURATION:PT6H","X-PUBLISHED-TTL:PT6H"];
  for(const [i,g]of games.entries())parts.push(...event({id:"nfl-2026-w"+week+"-"+(i+1),
   summary:"NFL: "+g.away+" @ "+g.home,start:g.start,end:g.start+3*3600000,
   description:"Week "+week+" NFL kickoff. Public schedule only."}));
  const first=games[0].start;
  parts.push(...event({id:"scott-pickem-w"+week+"-deadline",summary:"Family NFL Pick'em - Week "+week+" picks due",
   start:first-15*60000,end:first,alarm:true,
   description:"Submit the official Microsoft Form before first kickoff. Private dashboard picks do not count as official submission."}));
  parts.push("END:VCALENDAR");
  const fold=line=>line.match(/.{1,70}/g)?.join("\r\n ")||"";
  res.setHeader("Content-Type","text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition",'inline; filename="scott-family-nfl-pickem.ics"');
  res.setHeader("Cache-Control","public, s-maxage=900, max-age=300");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method==="HEAD")return res.status(200).end();
  return res.status(200).send(parts.map(fold).join("\r\n")+"\r\n");
 }catch{res.setHeader("Cache-Control","no-store");return res.status(503).send("NFL calendar temporarily unavailable");}
};