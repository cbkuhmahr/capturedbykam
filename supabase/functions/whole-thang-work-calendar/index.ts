import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const AUTH = SUPABASE_URL + "/functions/v1/cbk-auth";
const TABLE = "cbk_work_schedule_calendar";
const ID = "mimi-work";
const PRESETS: Record<string, { label: string; start: string; end: string }> = {
  morning: { label: "7 AM – 3 PM", start: "07:00", end: "15:00" },
  shortMorning: { label: "7 AM – 11 AM", start: "07:00", end: "11:00" },
  shortEvening: { label: "3 PM – 7 PM", start: "15:00", end: "19:00" },
  evening: { label: "3 PM – 11 PM", start: "15:00", end: "23:00" },
  longOvernight: { label: "7 PM – 7 AM", start: "19:00", end: "07:00" },
  overnight: { label: "11 PM – 7 AM", start: "23:00", end: "07:00" },
  earlyMorning: { label: "3 AM – 7 AM", start: "03:00", end: "07:00" }
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" }
});
const validTime = (value: unknown) => typeof value === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
const validDay = (value: string) => {
  if (!/^20[2-9][0-9]-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === value;
};
const nextDay = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};
const esc = (value: string) => String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const isValidChoice = (value: unknown): boolean => {
  if (typeof value === "string") return Object.prototype.hasOwnProperty.call(PRESETS, value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return v.type === "custom" && typeof v.label === "string" && v.label.trim().length > 0 &&
    v.label.trim().length <= 56 && !/[\x00-\x1f\x7f]/.test(v.label) &&
    validTime(v.start) && validTime(v.end) && v.start !== v.end;
};
const normalizeChoice = (value: unknown) => {
  if (typeof value === "string") return value;
  const v = value as { type: string; label: string; start: string; end: string };
  return { type: "custom", label: v.label.trim(), start: v.start, end: v.end };
};
const detail = (value: unknown) => {
  if (typeof value === "string") return PRESETS[value] || null;
  if (isValidChoice(value)) {
    const v = value as { label: string; start: string; end: string };
    return { label: v.label, start: v.start, end: v.end };
  }
  return null;
};
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
function fold(lines: string[]) {
  const encoder = new TextEncoder();
  const folded: string[] = [];
  for (const line of lines) {
    let segment = "", bytes = 0;
    for (const character of line) {
      const n = encoder.encode(character).length;
      if (bytes + n > 75) { folded.push(segment); segment = " "; bytes = 1; }
      segment += character; bytes += n;
    }
    folded.push(segment);
  }
  return folded.join("\r\n") + "\r\n";
}
function buildIcs(shifts: Record<string, unknown>) {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "PRODID:-//Captured by Kam//Work Schedule//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Mimi Work Schedule", "X-WR-TIMEZONE:America/New_York",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "BEGIN:VTIMEZONE", "TZID:America/New_York",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0400", "TZNAME:EDT",
    "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:-0400", "TZOFFSETTO:-0500", "TZNAME:EST",
    "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD", "END:VTIMEZONE"
  ];
  for (const day of Object.keys(shifts).sort()) {
    if (!validDay(day)) continue;
    const shift = detail(shifts[day]);
    if (!shift) continue;
    const endDay = shift.end <= shift.start ? nextDay(day) : day;
    const compact = (date: string, time: string) => date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";
    lines.push("BEGIN:VEVENT",
      "UID:mimi-work-" + day.replace(/-/g, "") + "@capturedbykam.com",
      "DTSTAMP:" + stamp(),
      "DTSTART;TZID=America/New_York:" + compact(day, shift.start),
      "DTEND;TZID=America/New_York:" + compact(endDay, shift.end),
      "SUMMARY:" + esc("Mimi Work – " + shift.label),
      "DESCRIPTION:Work schedule shift",
      "STATUS:CONFIRMED", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return fold(lines);
}
async function authorized(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return false;
  try {
    const response = await fetch(AUTH, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://www.capturedbykam.com",
        "x-cbk-admin-token": token },
      body: JSON.stringify({ action: "securityStatus" })
    });
    return response.ok;
  } catch { return false; }
}
async function row() {
  const { data, error } = await db.from(TABLE).select("calendar_id,feed_token,shifts").eq("calendar_id", ID).single();
  if (error) throw error;
  if (!data) throw new Error("Work schedule not initialized");
  return data;
}
Deno.serve(async (req: Request) => {
  const u = new URL(req.url);
  if (req.method === "GET") {
    const feed = u.searchParams.get("feed") || "";
    if (!/^[a-f0-9]{64}$/.test(feed)) return json({ error: "Calendar not found" }, 404);
    const { data, error } = await db.from(TABLE).select("shifts").eq("feed_token", feed).maybeSingle();
    if (error) return json({ error: "Calendar unavailable" }, 503);
    if (!data) return json({ error: "Calendar not found" }, 404);
    return new Response(buildIcs(data.shifts || {}), {
      status: 200,
      headers: { "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "inline; filename=\"Mimi_Work_Schedule.ics\"",
        "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" }
    });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const token = req.headers.get("x-cbk-admin-token") || "";
  if (!await authorized(token)) return json({ error: "Admin session required" }, 401);
  let input: any;
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  try {
    const current = await row();
    if (input?.action === "load") {
      const month = input.month;
      if (typeof month !== "string" || !/^20[2-9][0-9]-(0[1-9]|1[0-2])$/.test(month))
        return json({ error: "Invalid month" }, 400);
      const entries = Object.entries(current.shifts || {}).filter(([date]) => date.startsWith(month + "-"));
      return json({ selections: Object.fromEntries(entries),
        feedUrl: "https://www.capturedbykam.com/api/whole-thang-work-calendar?feed=" + current.feed_token });
    }
    if (input?.action === "save") {
      const month = input.month, selections = input.selections;
      if (typeof month !== "string" || !/^20[2-9][0-9]-(0[1-9]|1[0-2])$/.test(month))
        return json({ error: "Invalid month" }, 400);
      if (!selections || typeof selections !== "object" || Array.isArray(selections) || Object.keys(selections).length > 31)
        return json({ error: "Invalid schedule" }, 400);
      for (const [day, choice] of Object.entries(selections)) {
        if (!validDay(day) || !day.startsWith(month + "-") || !isValidChoice(choice))
          return json({ error: "Invalid shift on " + day }, 400);
      }
      const updated = { ...(current.shifts || {}) };
      for (const day of Object.keys(updated)) if (day.startsWith(month + "-")) delete updated[day];
      for (const [day, choice] of Object.entries(selections)) updated[day] = normalizeChoice(choice);
      if (Object.keys(updated).length > 2500) return json({ error: "Schedule limit reached" }, 400);
      const { error } = await db.from(TABLE).update({ shifts: updated, updated_at: new Date().toISOString() })
        .eq("calendar_id", ID);
      if (error) return json({ error: "Unable to save work schedule" }, 503);
      return json({ saved: true, count: Object.keys(selections).length,
        feedUrl: "https://www.capturedbykam.com/api/whole-thang-work-calendar?feed=" + current.feed_token });
    }
    return json({ error: "Invalid action" }, 400);
  } catch {
    return json({ error: "Work schedule service unavailable" }, 503);
  }
});