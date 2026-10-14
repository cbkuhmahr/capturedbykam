"use strict";

// Public, read-only scoreboard data. No pick state or credentials enter this endpoint.
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const ALIASES = { WSH:"WAS", JAC:"JAX", LA:"LAR", STL:"LAR", OAK:"LV", SD:"LAC" };
const cleanTeam = (code) => ALIASES[String(code || "").toUpperCase()] || String(code || "").toUpperCase();
const cleanScore = (value) => {
  if (value && typeof value === "object") value = value.value ?? value.displayValue;
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
function compactGame(event) {
  const c = event?.competitions?.[0];
  const home = c?.competitors?.find(x => x.homeAway === "home");
  const away = c?.competitors?.find(x => x.homeAway === "away");
  if (!home?.team?.abbreviation || !away?.team?.abbreviation) return null;
  const status = event.status || c?.status || {};
  const type = status.type || {};
  const state = ["pre","in","post"].includes(type.state) ? type.state : (type.completed ? "post" : "pre");
  const detail = String(type.shortDetail || type.detail || type.description || "").slice(0,70);
  return {
    id: String(event.id || ""),
    away: cleanTeam(away.team.abbreviation),
    home: cleanTeam(home.team.abbreviation),
    awayScore: state === "pre" ? null : cleanScore(away.score),
    homeScore: state === "pre" ? null : cleanScore(home.score),
    state,
    detail,
    period: Number(status.period || 0),
    clock: String(status.displayClock || "").slice(0,15),
    kickoff: String(event.date || ""),
    completed: !!type.completed,
    statusName: String(type.name || "").slice(0,35)
  };
}

module.exports = async function handler(req,res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ok:false,error:"Method not allowed"});
  }
  const week = Number(req.query?.week ?? 6);
  const season = Number(req.query?.season ?? 2026);
  if (!Number.isInteger(week) || week < 1 || week > 18 || !Number.isInteger(season) || season < 2020 || season > 2035) {
    return res.status(400).json({ok:false,error:"Invalid season or week"});
  }
  try {
    const url = new URL(ESPN);
    url.searchParams.set("season", String(season));
    url.searchParams.set("seasontype", "2");
    url.searchParams.set("week", String(week));
    url.searchParams.set("limit", "50");
    const response = await fetch(url, {headers:{"Accept":"application/json"},signal:AbortSignal.timeout(8500)});
    if (!response.ok) throw Error("Upstream scoreboard status " + response.status);
    const data = await response.json();
    if (!Array.isArray(data.events)) throw Error("Invalid scoreboard payload");
    const games = data.events.map(compactGame).filter(Boolean);
    // Edge caching limits requests on game days; clients poll every 45 seconds.
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
    return res.status(200).json({ok:true,season,week,source:"ESPN",updatedAt:new Date().toISOString(),games});
  } catch {
    res.setHeader("Cache-Control","no-store");
    return res.status(502).json({ok:false,error:"Live scores are temporarily unavailable"});
  }
};
