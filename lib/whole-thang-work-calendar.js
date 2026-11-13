"use strict";

const COOKIE_NAME = "cbk_admin_session";
const EDGE = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/whole-thang-work-calendar";
const HOSTS = new Set(["www.capturedbykam.com", "capturedbykam.com", "capturedbykam.vercel.app"]);

function readCookies(header = "") {
  const result = {};
  for (const part of String(header).split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    try { result[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim()); } catch {}
  }
  return result;
}

module.exports = async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method === "GET" || req.method === "HEAD") {
    const feed = typeof req.query?.feed === "string" ? req.query.feed : "";
    if (!/^[a-f0-9]{64}$/.test(feed)) return res.status(404).end("Calendar not found");
    try {
      const upstream = await fetch(EDGE + "?feed=" + encodeURIComponent(feed), {
        headers: { "Accept": "text/calendar" },
        signal: AbortSignal.timeout(12000)
      });
      if (!upstream.ok) return res.status(upstream.status === 404 ? 404 : 503).end("Calendar unavailable");
      const contents = await upstream.text();
      if (!contents.startsWith("BEGIN:VCALENDAR\r\n")) return res.status(502).end("Invalid calendar response");
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="Mimi_Work_Schedule.ics"');
      return res.status(200).send(req.method === "HEAD" ? "" : contents);
    } catch { return res.status(502).end("Calendar temporarily unavailable"); }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, HEAD, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const host = String(req.headers.host || "").toLowerCase();
  const origin = String(req.headers.origin || "");
  const referer = String(req.headers.referer || "");
  if (!HOSTS.has(host)) return res.status(403).json({ error: "Invalid host" });
  if (origin && origin !== "https://" + host) return res.status(403).json({ error: "Invalid origin" });
  if (!origin && !referer.startsWith("https://" + host + "/"))
    return res.status(403).json({ error: "Invalid request source" });
  const token = readCookies(req.headers.cookie || "")[COOKIE_NAME] || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(401).json({ error: "Unlock admin first" });

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      !["load", "save"].includes(body.action)) {
    return res.status(400).json({ error: "Invalid schedule action" });
  }
  try {
    const upstream = await fetch(EDGE, {
      method: "POST",
      headers: { "Content-Type": "application/json",
        "Origin": "https://www.capturedbykam.com", "x-cbk-admin-token": token },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    });
    const data = await upstream.json().catch(() => ({ error: "Calendar service unavailable" }));
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: "Calendar service temporarily unavailable" });
  }
};
