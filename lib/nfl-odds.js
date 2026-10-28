"use strict";

// Public, read-only pregame point spreads and over/under from ESPN.
// This endpoint never places wagers and never reads private pick state.
const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events";
const ALIASES = { WSH:"WAS", JAC:"JAX", LA:"LAR", STL:"LAR", OAK:"LV", SD:"LAC" };
const clean = value => ALIASES[String(value || "").toUpperCase()] || String(value || "").toUpperCase();
const finite = value => value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;

function parseLine(offer, home, away) {
  if (!offer || typeof offer !== "object") return null;
  const details = String(offer.details || "").trim().slice(0,45);
  let homeSpread = finite(offer.spread);
  const exact = details.match(/^([A-Za-z]{2,3})\s+([+-]?\d+(?:\.\d+)?|PK|EVEN)(?:\s|$)/i);
  if (exact) {
    const side = clean(exact[1]);
    const line = /^(PK|EVEN)$/i.test(exact[2]) ? 0 : finite(exact[2]);
    if (line !== null && (side === home || side === away)) {
      // Provider details explicitly identify the team to whom the spread applies.
      homeSpread = side === home ? line : -line;
    }
  } else if (/^(PK|EVEN)$/i.test(details)) homeSpread = 0;
  const total = finite(offer.overUnder ?? offer.over_under);
  if (homeSpread !== null && (homeSpread < -60 || homeSpread > 60)) homeSpread = null;
  const overUnder = total !== null && total >= 10 && total <= 125 ? total : null;
  const homeMoneyline = finite(offer.homeTeamOdds?.moneyLine ?? offer.homeTeamOdds?.moneyline);
  const awayMoneyline = finite(offer.awayTeamOdds?.moneyLine ?? offer.awayTeamOdds?.moneyline);
  if (homeSpread === null && overUnder === null && homeMoneyline === null && awayMoneyline === null) return null;
  return {
    homeSpread,
    awaySpread: homeSpread === null ? null : -homeSpread,
    overUnder,
    homeMoneyline: homeMoneyline !== null && homeMoneyline >= -20000 && homeMoneyline <= 20000 ? homeMoneyline : null,
    awayMoneyline: awayMoneyline !== null && awayMoneyline >= -20000 && awayMoneyline <= 20000 ? awayMoneyline : null,
    provider: String(offer.provider?.name || offer.provider?.displayName || "ESPN").slice(0,40)
  };
}
function selectOdds(entries, home, away) {
  const offers = (Array.isArray(entries) ? entries : entries ? [entries] : [])
    .map(entry => parseLine(entry, home, away)).filter(Boolean);
  // Prefer one source providing both spread and O/U; avoid mixing sportsbooks.
  return offers.find(o => o.homeSpread !== null && o.overUnder !== null) || offers[0] || null;
}
async function fallbackOdds(id, competitionId, home, away) {
  if (!/^\d{5,15}$/.test(String(id)) || !/^\d{5,15}$/.test(String(competitionId))) return null;
  try {
    const url = CORE + "/" + id + "/competitions/" + competitionId + "/odds?limit=15";
    const response = await fetch(url, {headers:{"Accept":"application/json"},signal:AbortSignal.timeout(4700)});
    if (!response.ok) return null;
    const data = await response.json();
    return selectOdds(data?.items, home, away);
  } catch { return null; }
}
module.exports = async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ok:false,error:"Method not allowed"});
  }
  const season = Number(req.query?.season ?? 2026);
  const week = Number(req.query?.week ?? 6);
  if (!Number.isInteger(week) || week < 1 || week > 18 || !Number.isInteger(season) || season < 2020 || season > 2035) {
    return res.status(400).json({ok:false,error:"Invalid season or week"});
  }
  try {
    const url = new URL(SCOREBOARD);
    url.searchParams.set("season", String(season));
    url.searchParams.set("seasontype", "2");
    url.searchParams.set("week", String(week));
    url.searchParams.set("limit", "50");
    const response = await fetch(url, {headers:{"Accept":"application/json"},signal:AbortSignal.timeout(9000)});
    if (!response.ok) throw Error("Scoreboard unavailable");
    const data = await response.json();
    if (!Array.isArray(data.events)) throw Error("Invalid ESPN response");
    const games = data.events.map(event => {
      const competition = event?.competitions?.[0];
      const home = competition?.competitors?.find(x => x.homeAway === "home");
      const away = competition?.competitors?.find(x => x.homeAway === "away");
      if (!home?.team?.abbreviation || !away?.team?.abbreviation) return null;
      const homeCode = clean(home.team.abbreviation), awayCode = clean(away.team.abbreviation);
      return {
        home:homeCode, away:awayCode, id:String(event.id || ""),
        competitionId:String(competition.id || event.id || ""),
        odds:selectOdds(competition.odds,homeCode,awayCode)
      };
    }).filter(Boolean);
    // When ESPN doesn't include lines in the scoreboard, follow its event-level
    // sportsbook endpoint. Lines may be unavailable after kickoff; never fabricate.
    const enriched = await Promise.all(games.map(async g => ({
      away:g.away, home:g.home,
      odds:g.odds || await fallbackOdds(g.id,g.competitionId,g.home,g.away)
    })));
    res.setHeader("Cache-Control","public, s-maxage=180, stale-while-revalidate=180");
    return res.status(200).json({ok:true,season,week,updatedAt:new Date().toISOString(),source:"ESPN",games:enriched});
  } catch {
    res.setHeader("Cache-Control","no-store");
    return res.status(502).json({ok:false,error:"Point spreads are temporarily unavailable"});
  }
};
