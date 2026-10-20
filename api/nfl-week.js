"use strict";
// Read-only 2026 NFL schedule. Automatically moves to the next week after the
// last game becomes final, including an early rollover after Monday night.
const SCOREBOARD="https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const START=Date.parse("2026-09-10T00:00:00Z");
const WEEK_MS=7*86400000;
const ALIASES={WSH:"WAS",JAC:"JAX",LA:"LAR",STL:"LAR",OAK:"LV",SD:"LAC"};
const fix=v=>ALIASES[String(v||"").toUpperCase()]||String(v||"").toUpperCase();
const W6=["SEA-DEN","HOU-JAX","TEN-IND","CAR-PHI","PIT-TB","BAL-CLE","NO-NYG","CHI-ATL","NYJ-NE","ARI-LAR","LAC-KC","BUF-LV","DAL-GB","WAS-SF"];
const dateET=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",month:"short",day:"numeric"});
const timeET=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit",hour12:true});
const dayET=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"long",hour:"numeric",hourCycle:"h23"});
function groupFor(date,neutral){
 const parts=dayET.formatToParts(date),day=parts.find(p=>p.type==="weekday")?.value||"Sunday";
 const hour=Number(parts.find(p=>p.type==="hour")?.value||0);
 if(day==="Thursday")return "Thursday";
 if(day==="Monday")return "Monday Night";
 if(day==="Sunday"&&neutral&&hour<12)return "International";
 if(day==="Sunday"&&hour>=19)return "Sunday Night";
 if(day==="Sunday"&&hour>=15)return "Sunday Late";
 if(day==="Sunday")return "Sunday Early";
 return day;
}
function cleanScore(v){
 if(v&&typeof v==="object")v=v.value??v.displayValue;
 if(v===null||v===undefined||v==="")return null;
 const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;
}
function game(event,week){
 const c=event?.competitions?.[0];
 const home=c?.competitors?.find(x=>x.homeAway==="home");
 const away=c?.competitors?.find(x=>x.homeAway==="away");
 if(!home?.team?.abbreviation||!away?.team?.abbreviation)return null;
 const h=fix(home.team.abbreviation),a=fix(away.team.abbreviation);
 const type=event.status?.type||c.status?.type||{};
 const state=["pre","in","post"].includes(type.state)?type.state:(type.completed?"post":"pre");
 const date=new Date(event.date||c.date);
 if(!Number.isFinite(date.getTime()))return null;
 const id=week===6?"w6-"+(W6.indexOf(a+"-"+h)+1):"w"+week+"-"+String(event.id||"");
 if(week===6&&W6.indexOf(a+"-"+h)===-1)return null;
 if(week!==6&&!/^w\d{1,2}-\d{5,15}$/.test(id))return null;
 const day=dateET.format(date).replace(",", " ·").replace(",", "");
 const time=timeET.format(date);
 return {id,away:a,home:h,group:groupFor(date,!!c.neutralSite),day,time,neutral:!!c.neutralSite,
  kickoff:date.toISOString(),state,completed:!!type.completed,
  awayScore:state==="pre"?null:cleanScore(away.score),
  homeScore:state==="pre"?null:cleanScore(home.score),
  detail:String(type.shortDetail||type.detail||"").slice(0,64),
  period:Number(event.status?.period||0),clock:String(event.status?.displayClock||"").slice(0,15),
  statusName:String(type.name||"").slice(0,35)};
}
async function fetchWeek(season,week){
 const u=new URL(SCOREBOARD);
 for(const [key,v] of Object.entries({season,seasontype:2,week,limit:50}))u.searchParams.set(key,String(v));
 const response=await fetch(u,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(8500)});
 if(!response.ok)throw Error("NFL schedule feed error");
 const data=await response.json();
 if(!Array.isArray(data.events))throw Error("NFL schedule missing games");
 const rows=data.events.map(e=>game(e,week)).filter(Boolean);
 rows.sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff));
 return rows;
}
module.exports=async function handler(req,res){
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({ok:false,error:"Method not allowed"});}
 const season=2026,now=Date.now();
 let baseWeek=Math.max(6,Math.min(18,Math.floor((now-START)/WEEK_MS)+1));
 try{
  const base=await fetchWeek(season,baseWeek);
  if(base.length<10)throw Error("Schedule is incomplete");
  const finished=base.every(g=>g.state==="post"&&g.completed);
  const shouldAdvance=baseWeek<18&&finished;
  const activeWeek=shouldAdvance?baseWeek+1:baseWeek;
  const active=shouldAdvance?await fetchWeek(season,activeWeek):base;
  if(active.length<10)throw Error("Next week schedule is incomplete");
  const previousWeek=activeWeek-1;
  let previous=shouldAdvance?base:[];
  if(previousWeek>=6&&!shouldAdvance){
   try{previous=await fetchWeek(season,previousWeek);}catch{}
  }
  res.setHeader("Cache-Control","public, s-maxage=20, stale-while-revalidate=20");
  return res.status(200).json({ok:true,season,week:activeWeek,games:active,
   previousWeek,previousGames:previous,rolledOver:shouldAdvance,source:"ESPN",
   updatedAt:new Date().toISOString()});
 }catch{
  res.setHeader("Cache-Control","no-store");
  return res.status(502).json({ok:false,error:"NFL week could not be verified; previous schedule retained"});
 }
};