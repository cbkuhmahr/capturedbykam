"use strict";
// Public information only. No picks, account data, or personal calendar data are exposed.
const GAMES = [
 ["SEA","DEN","2026-10-15","20:15"],
 ["HOU","JAX","2026-10-18","09:30"],
 ["TEN","IND","2026-10-18","13:00"],
 ["CAR","PHI","2026-10-18","13:00"],
 ["PIT","TB","2026-10-18","13:00"],
 ["BAL","CLE","2026-10-18","13:00"],
 ["NO","NYG","2026-10-18","13:00"],
 ["CHI","ATL","2026-10-18","13:00"],
 ["NYJ","NE","2026-10-18","13:00"],
 ["ARI","LAR","2026-10-18","16:05"],
 ["LAC","KC","2026-10-18","16:25"],
 ["BUF","LV","2026-10-18","16:25"],
 ["DAL","GB","2026-10-18","20:20"],
 ["WAS","SF","2026-10-19","20:15"]
];
const utc = (ms) => new Date(ms).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/, "Z");
const esc = (s) => String(s).replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
function event({id,summary,start,end,description,alarm}) {
 const parts = [
  "BEGIN:VEVENT", "UID:"+id+"@capturedbykam.com", "DTSTAMP:20261015T000000Z",
  "DTSTART:"+utc(start), "DTEND:"+utc(end),
  "SUMMARY:"+esc(summary), "DESCRIPTION:"+esc(description),
  "STATUS:CONFIRMED"
 ];
 if (alarm) parts.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Pick reminder","TRIGGER:-PT2H","END:VALARM");
 parts.push("END:VEVENT");
 return parts;
}
module.exports = async function handler(req,res) {
 if (!["GET","HEAD"].includes(req.method)) return res.status(405).end("Method not allowed");
 const parts = [
  "BEGIN:VCALENDAR","VERSION:2.0","CALSCALE:GREGORIAN","METHOD:PUBLISH",
  "PRODID:-//CapturedbyKam//Scott Family NFL Pickem Calendar//EN",
  "X-WR-CALNAME:Scott Family NFL Pick'em",
  "X-WR-CALDESC:Public 2026 Week 6 games and pick deadline. No private selections.",
  "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  "X-PUBLISHED-TTL:PT6H"
 ];
 // All current Week 6 kickoffs occur in Eastern Daylight Time (UTC-04:00).
 const times=GAMES.map((g,i)=>{
  const start=Date.parse(g[2]+"T"+g[3]+":00-04:00");
  if (!Number.isFinite(start)) throw Error("Bad schedule timestamp");
  parts.push(...event({id:"nfl-2026-week6-"+String(i+1),summary:"NFL: "+g[0]+" @ "+g[1],start,
    end:start+3*60*60*1000,description:"Week 6 kickoff (Eastern time). Public schedule only."}));
  return start;
 });
 const cutoff=times[0];
 parts.push(...event({id:"scott-pickem-w6-deadline",summary:"Family NFL Pick'em - Week 6 picks due",
  start:cutoff-15*60*1000,end:cutoff,
  description:"Submit the official Microsoft Form before Thursday's first kickoff. Picks on the private website alone do not count as submission.",alarm:true}));
 parts.push("END:VCALENDAR");
 // RFC 5545 line folding: keep iCalendar property lines below 75 octets.
 const fold = line => line.match(/.{1,70}/g)?.join("\r\n ") || "";
 const body=parts.map(fold).join("\r\n")+"\r\n";
 res.setHeader("Content-Type","text/calendar; charset=utf-8");
 res.setHeader("Content-Disposition",'inline; filename="scott-family-nfl-pickem.ics"');
 res.setHeader("Cache-Control","public, s-maxage=1800, max-age=300");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method==="HEAD")return res.status(200).end();
 return res.status(200).send(body);
};
