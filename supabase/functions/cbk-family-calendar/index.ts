import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const AUTH = SUPABASE_URL + "/functions/v1/cbk-auth";
const TABLE = "cbk_family_calendars";
const ID = "miles-whitmer-basketball";
const MAX_GAMES = 200;
const SOURCE = "https://www.maxpreps.com/oh/toledo/whitmer-panthers/basketball/jv/schedule/";
type Game = { id: string; date: string; time: string; opponent: string; venue: string; home: boolean; status: "confirmed" | "tentative"; notes: string };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" }
});
const validTime = (s: unknown): s is string => typeof s === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s);
const validDate = (s: unknown): s is string => {
  if (typeof s !== "string" || !/^20[2-9][0-9]-(0[1-9]|1[0-2])-[0-3][0-9]$/.test(s)) return false;
  const [y,m,d] = s.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10) === s;
};
const validString = (s: unknown, max: number, min = 0) =>
  typeof s === "string" && s.trim().length >= min && s.trim().length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(s);
function validGame(v: unknown): v is Game {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const g = v as Record<string, unknown>;
  return typeof g.id === "string" && /^[a-z0-9][a-z0-9-]{1,79}$/.test(g.id) &&
    validDate(g.date) && validTime(g.time) &&
    validString(g.opponent,100,1) && validString(g.venue,240,1) &&
    typeof g.home === "boolean" &&
    (g.status === "confirmed" || g.status === "tentative") &&
    validString(g.notes,500);
}
function cleanGame(g: Game): Game {
  return { id:g.id, date:g.date, time:g.time, opponent:g.opponent.trim(),
    venue:g.venue.trim(), home:g.home, status:g.status, notes:g.notes.trim() };
}
const esc = (s: string) => String(s).replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
const stamp = () => new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
function fold(rows: string[]): string {
  const encoder = new TextEncoder();
  const result: string[] = [];
  for (const row of rows) {
    let chunk = "", bytes = 0;
    for (const chr of row) {
      const length = encoder.encode(chr).length;
      if (bytes + length > 75) { result.push(chunk); chunk = " "; bytes = 1; }
      chunk += chr; bytes += length;
    }
    result.push(chunk);
  }
  return result.join("\r\n") + "\r\n";
}
function localEnd(date: string,time: string): { date: string; time: string } {
  const [y,m,d] = date.split("-").map(Number);
  const [hh,mm] = time.split(":").map(Number);
  const end = new Date(Date.UTC(y,m-1,d,hh,mm) + 90 * 60000);
  return { date:end.toISOString().slice(0,10), time:end.toISOString().slice(11,16) };
}
const compact = (day: string,time: string) => day.replace(/-/g,"") + "T" + time.replace(":","") + "00";
function calendar(entries: Game[]): string {
  const rows = ["BEGIN:VCALENDAR","VERSION:2.0","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "PRODID:-//Captured by Kam//Family Calendar//EN",
    "X-WR-CALNAME:Miles Whitmer Basketball 🏀","X-WR-TIMEZONE:America/New_York",
    "X-WR-CALDESC:Whitmer JV game times edited in Captured by Kam Sports",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H","X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE","TZID:America/New_York",
    "BEGIN:DAYLIGHT","TZOFFSETFROM:-0500","TZOFFSETTO:-0400","TZNAME:EDT",
    "DTSTART:19700308T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU","END:DAYLIGHT",
    "BEGIN:STANDARD","TZOFFSETFROM:-0400","TZOFFSETTO:-0500","TZNAME:EST",
    "DTSTART:19701101T020000","RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU","END:STANDARD","END:VTIMEZONE"];
  for (const g of [...entries].sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))) {
    if (!validGame(g)) continue;
    const end = localEnd(g.date,g.time);
    const title = "Miles Whitmer Basketball 🏀 — " + (g.home ? "vs " : "@ ") + g.opponent;
    const description = "Whitmer Panthers JV Basketball. " + (g.home ? "HOME" : "AWAY") +
      " game vs " + g.opponent + ". Estimated 90-minute duration." +
      (g.notes ? " Notes: " + g.notes : "") + " Schedule: " + SOURCE;
    rows.push("BEGIN:VEVENT","UID:" + g.id + "@calendar.capturedbykam.com",
      "DTSTAMP:" + stamp(),
      "DTSTART;TZID=America/New_York:" + compact(g.date,g.time),
      "DTEND;TZID=America/New_York:" + compact(end.date,end.time),
      "SUMMARY:" + esc(title),
      "LOCATION:" + esc(g.venue),
      "DESCRIPTION:" + esc(description),
      "URL:" + SOURCE,
      "STATUS:" + (g.status === "tentative" ? "TENTATIVE" : "CONFIRMED"),
      "BEGIN:VALARM","ACTION:DISPLAY","TRIGGER:-P1D","DESCRIPTION:Basketball game tomorrow","END:VALARM",
      "BEGIN:VALARM","ACTION:DISPLAY","TRIGGER:-PT1H","DESCRIPTION:Basketball game in one hour","END:VALARM",
      "END:VEVENT");
  }
  rows.push("END:VCALENDAR");
  return fold(rows);
}
async function authorized(token: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return false;
  try {
    const response = await fetch(AUTH,{
      method:"POST",
      headers:{"Content-Type":"application/json","Origin":"https://www.capturedbykam.com","x-cbk-admin-token":token},
      body:JSON.stringify({action:"securityStatus"}),
      signal:AbortSignal.timeout(10000)
    });
    return response.ok;
  } catch { return false; }
}
async function getRow() {
  const {data,error} = await db.from(TABLE).select("calendar_id,feed_token,entries,updated_at").eq("calendar_id",ID).maybeSingle();
  if (error) throw error;
  return data;
}
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === "GET" || req.method === "HEAD") {
    const token = url.searchParams.get("feed") || "";
    if (!/^[a-f0-9]{64}$/.test(token)) return reply({error:"Calendar not found"},404);
    const {data,error} = await db.from(TABLE).select("entries").eq("calendar_id",ID).eq("feed_token",token).maybeSingle();
    if (error) return reply({error:"Calendar unavailable"},503);
    if (!data) return reply({error:"Calendar not found"},404);
    return new Response(req.method === "HEAD" ? "" : calendar(Array.isArray(data.entries) ? data.entries : []), {
      headers:{"Content-Type":"text/calendar; charset=utf-8",
        "Content-Disposition":'inline; filename="Miles_Whitmer_Basketball.ics"',
        "Cache-Control":"private, no-store, max-age=0",
        "X-Robots-Tag":"noindex, nofollow",
        "X-Content-Type-Options":"nosniff",
        "Referrer-Policy":"no-referrer"}
    });
  }
  if (req.method !== "POST") return reply({error:"Method not allowed"},405);
  if (!await authorized(req.headers.get("x-cbk-admin-token") || "")) return reply({error:"Admin session required"},401);
  let input: any;
  try { input=await req.json(); } catch { return reply({error:"Invalid JSON"},400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return reply({error:"Invalid request"},400);
  try {
    const row = await getRow();
    if (!row) return reply({error:"Calendar unavailable"},503);
    const feedUrl = "https://www.capturedbykam.com/api/whole-thang-work-calendar?kind=miles&feed=" + row.feed_token;
    if (input.action === "loadGames") {
      return reply({games:row.entries || [],feedUrl,revision:row.updated_at});
    }
    if (input.action === "saveGames") {
      const games = input.games;
      if (!Array.isArray(games) || games.length > MAX_GAMES || !games.every(validGame)) return reply({error:"Invalid game list"},400);
      if (new Set(games.map((g: Game) => g.id)).size !== games.length) return reply({error:"Duplicate game IDs"},400);
      if (typeof input.revision !== "string" || input.revision !== row.updated_at)
        return reply({error:"Calendar changed on another device. Reload before saving."},409);
      const normalized = games.map(cleanGame);
      const {data,error} = await db.from(TABLE)
        .update({entries:normalized,updated_at:new Date().toISOString()})
        .eq("calendar_id",ID).eq("updated_at",row.updated_at)
        .select("updated_at").maybeSingle();
      if (error) return reply({error:"Unable to save games"},503);
      if (!data) return reply({error:"Calendar changed on another device. Reload before saving."},409);
      return reply({saved:true,count:normalized.length,revision:data.updated_at,feedUrl});
    }
    return reply({error:"Invalid action"},400);
  } catch { return reply({error:"Calendar service unavailable"},503); }
});