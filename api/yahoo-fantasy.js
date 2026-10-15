"use strict";
// Yahoo Fantasy is read-only. Yahoo app access must be approved before using this handler.
// Secrets are server-side only. A per-browser encrypted HttpOnly cookie stores OAuth tokens.
const { randomBytes, createCipheriv, createDecipheriv, createHash, timingSafeEqual } = require("node:crypto");
const AUTH_EDGE = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/cbk-auth";
const SESSION = "cbk_admin_session";
const YAHOO_COOKIE = "wt_yahoo_tokens";
const STATE_COOKIE = "wt_yahoo_state";
const API = "https://fantasysports.yahooapis.com/fantasy/v2";
const AUTHORIZE = "https://api.login.yahoo.com/oauth2/request_auth";
const TOKEN = "https://api.login.yahoo.com/oauth2/get_token";
const CALLBACK_PATH = "/api/yahoo-fantasy?action=callback";
const HOSTS = new Set(["www.capturedbykam.com", "capturedbykam.com", "capturedbykam.vercel.app"]);
const TEAM_ALIASES = { WSH: "WAS", JAC: "JAX", LA: "LAR", STL: "LAR", OAK: "LV", SD: "LAC" };
function cookies(input) {
  const out = {};
  for (const part of String(input || "").split(";")) {
    const at = part.indexOf("=");
    if (at < 0) continue;
    try { out[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim()); } catch {}
  }
  return out;
}
function secretKey() {
  const source = String(process.env.YAHOO_SESSION_SECRET || "");
  if (source.length < 32) return null;
  return createHash("sha256").update(source).digest();
}
function seal(data) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
function unseal(input) {
  try {
    const buffer = Buffer.from(String(input || ""), "base64url");
    if (buffer.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), buffer.subarray(0, 12));
    decipher.setAuthTag(buffer.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString());
  } catch { return null; }
}
function cookie(name, value, age = 3600 * 24 * 30) {
  return name + "=" + encodeURIComponent(value) + "; Path=/api/yahoo-fantasy; Max-Age=" + age +
    "; HttpOnly; Secure; SameSite=Lax";
}
function forget(name) { return cookie(name, "", 0); }
function sameSiteRequest(req) {
  const host = String(req.headers.host || "").toLowerCase();
  const origin = String(req.headers.origin || "");
  return HOSTS.has(host) && (!origin || origin === "https://" + host);
}
async function isAdmin(req) {
  const token = cookies(req.headers.cookie)[SESSION];
  if (!/^[a-f0-9]{64}$/i.test(token || "")) return false;
  try {
    const response = await fetch(AUTH_EDGE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://www.capturedbykam.com", "x-cbk-admin-token": token },
      body: JSON.stringify({ action: "securityStatus" }),
      signal: AbortSignal.timeout(8500)
    });
    return response.ok;
  } catch { return false; }
}
function configured() {
  return !!(process.env.YAHOO_CLIENT_ID && process.env.YAHOO_CLIENT_SECRET &&
    process.env.YAHOO_SESSION_SECRET && secretKey() && process.env.YAHOO_REDIRECT_URI);
}
function configuredRedirect() {
  const uri = String(process.env.YAHOO_REDIRECT_URI || "");
  try {
    const parsed = new URL(uri);
    return parsed.protocol === "https:" && HOSTS.has(parsed.host) &&
      parsed.pathname === "/api/yahoo-fantasy" && parsed.searchParams.get("action") === "callback";
  } catch { return false; }
}
function fail(res, status, message) { return res.status(status).json({ ok: false, error: message }); }
async function getTokens(fields) {
  const payload = new URLSearchParams(fields);
  const credentials = Buffer.from(process.env.YAHOO_CLIENT_ID + ":" + process.env.YAHOO_CLIENT_SECRET).toString("base64");
  const response = await fetch(TOKEN, {
    method: "POST", headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + credentials, "Accept": "application/json"
    }, body: payload.toString(), signal: AbortSignal.timeout(10000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw Error("Yahoo authorization failed");
  return data;
}
function tokenState(result, previous = {}) {
  return {
    access: result.access_token,
    refresh: result.refresh_token || previous.refresh,
    expiry: Date.now() + Math.max(60, Number(result.expires_in || 3600) - 90) * 1000
  };
}
async function accessFor(req, res) {
  let state = unseal(cookies(req.headers.cookie)[YAHOO_COOKIE]);
  if (!state?.refresh) return null;
  if (!state.access || Number(state.expiry) <= Date.now()) {
    const refreshed = await getTokens({grant_type:"refresh_token", refresh_token:state.refresh, redirect_uri:process.env.YAHOO_REDIRECT_URI});
    state = tokenState(refreshed, state);
    res.setHeader("Set-Cookie", cookie(YAHOO_COOKIE, seal(state)));
  }
  return state.access;
}
async function yahoo(path, access) {
  const response = await fetch(API + "/" + path + (path.includes("?") ? "&" : "?") + "format=json", {
    headers: { Authorization: "Bearer " + access, Accept: "application/json" },
    signal: AbortSignal.timeout(9500)
  });
  if (!response.ok) throw Error("Yahoo API status " + response.status);
  return response.json();
}
function walk(value, fn, depth = 0) {
  if (!value || typeof value !== "object" || depth > 22) return;
  fn(value);
  if (Array.isArray(value)) value.forEach(child => walk(child, fn, depth + 1));
  else Object.values(value).forEach(child => walk(child, fn, depth + 1));
}
function fragments(value) {
  const out = {};
  if (Array.isArray(value)) for (const item of value) {
    if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(out, item);
  }
  else if (value && typeof value === "object") Object.assign(out, value);
  return out;
}
function extractTeams(payload) {
  const output = new Map();
  walk(payload, node => {
    if (!Array.isArray(node.team)) return;
    const m = fragments(node.team[0]);
    if (!/^\d+\.l\.\d+\.t\.\d+$/.test(m.team_key || "")) return;
    output.set(m.team_key, { key: m.team_key, name: String(m.name || "Yahoo team").slice(0, 100),
      leagueKey: m.team_key.split(".t.")[0] });
  });
  return [...output.values()].filter(t => t.key && t.leagueKey);
}
function extractPlayers(payload) {
  const output = new Map();
  walk(payload, node => {
    if (!Array.isArray(node.player)) return;
    const m = fragments(node.player[0]);
    const key = String(m.player_key || "");
    if (!/^\d+\.p\.\d+$/.test(key)) return;
    const extra = node.player[1] && typeof node.player[1] === "object" ? node.player[1] : {};
    let selected = "";
    walk(extra, x => {
      if (selected || !Object.hasOwn(x, "selected_position")) return;
      const pos = x.selected_position;
      if (typeof pos === "string") selected = pos;
      else {
        const pieces = fragments(pos);
        selected = String(pieces.position || pos?.position || "");
      }
    });
    const name = (m.name && typeof m.name === "object") ? m.name.full : m.name;
    let total = null;
    let rawStats = [];
    walk(extra, x => {
      if (x.player_points && typeof x.player_points === "object") {
        const n = Number(x.player_points.total);
        if (x.player_points.total != null && Number.isFinite(n)) total = n;
      }
      if (x.player_stats && x.player_stats.stats) {
        const root = x.player_stats.stats;
        rawStats = Object.values(root).flatMap(v => v && typeof v === "object" ? [v.stat || v] : [])
          .filter(s => s && s.stat_id != null && s.value != null)
          .map(s => ({ id: String(s.stat_id), value: String(s.value).slice(0, 30) })).slice(0, 25);
      }
    });
    output.set(key, { key, name: String(name || "Player").slice(0, 90),
      team: TEAM_ALIASES[String(m.editorial_team_abbr || "").toUpperCase()] || String(m.editorial_team_abbr || "").toUpperCase(),
      position: String(m.display_position || m.primary_position || "").slice(0, 14),
      slot: String(selected || "").slice(0, 14), points: total, stats: rawStats });
  });
  return output;
}
function statLabels(payload) {
  const labels = {};
  walk(payload, x => {
    if (x.stat_id == null || !(x.name || x.display_name)) return;
    labels[String(x.stat_id)] = String(x.display_name || x.name).slice(0, 35);
  });
  return labels;
}
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET" && req.method !== "POST") return fail(res, 405, "Method not allowed");
  const action = String(req.query?.action || "status");
  if (!["status","connect","callback","roster","disconnect"].includes(action)) return fail(res, 400, "Unknown action");
  if (action === "callback") {
    if (!configured() || !configuredRedirect()) return res.redirect(302, "/whole-thang/?yahoo=unavailable");
    const jar = cookies(req.headers.cookie);
    const expected = String(jar[STATE_COOKIE] || "");
    const got = String(req.query?.state || "");
    const same = expected.length === got.length && expected.length >= 40 &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(got));
    res.setHeader("Set-Cookie", forget(STATE_COOKIE));
    if (!same || req.query?.error || !req.query?.code) return res.redirect(302, "/whole-thang/?yahoo=denied");
    try {
      const result = await getTokens({ grant_type:"authorization_code", code:String(req.query.code),
        redirect_uri:process.env.YAHOO_REDIRECT_URI });
      res.setHeader("Set-Cookie", [forget(STATE_COOKIE), cookie(YAHOO_COOKIE, seal(tokenState(result)))]);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
      return res.status(200).send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yahoo connected</title><body style="background:#0b1016;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:90vh;text-align:center"><main><h1>Yahoo Fantasy connected</h1><p>Your read-only Yahoo roster connection is ready.</p><a href="/whole-thang/" style="color:#f5c75c">Open $billi-type uh’day. →</a></main></body></html>');
    } catch { return res.redirect(302, "/whole-thang/?yahoo=error"); }
  }
  if (!(await isAdmin(req))) return fail(res, 401, "Unlock the site with your admin login first");
  if (action === "status") return res.status(200).json({ ok:true, available:configured() && configuredRedirect(),
    connected:!!unseal(cookies(req.headers.cookie)[YAHOO_COOKIE])?.refresh });
  if (action === "disconnect") {
    if (req.method !== "POST" || !sameSiteRequest(req)) return fail(res, 403, "Request not allowed");
    res.setHeader("Set-Cookie", forget(YAHOO_COOKIE));
    return res.status(200).json({ok:true,connected:false});
  }
  if (!configured() || !configuredRedirect()) return fail(res, 503, "Yahoo Fantasy integration awaits Yahoo API approval and server configuration");
  if (action === "connect") {
    if (!sameSiteRequest(req)) return fail(res, 403, "Request not allowed");
    const state = randomBytes(32).toString("base64url");
    res.setHeader("Set-Cookie", cookie(STATE_COOKIE, state, 600));
    const target = new URL(AUTHORIZE);
    target.searchParams.set("client_id", process.env.YAHOO_CLIENT_ID);
    target.searchParams.set("response_type", "code");
    target.searchParams.set("redirect_uri", process.env.YAHOO_REDIRECT_URI);
    target.searchParams.set("state", state);
    return res.redirect(302, target.toString());
  }
  if (req.method !== "GET") return fail(res, 405, "Method not allowed");
  const week = Number(req.query?.week || 6);
  if (!Number.isInteger(week) || week < 1 || week > 18) return fail(res, 400, "Invalid week");
  try {
    const access = await accessFor(req, res);
    if (!access) return fail(res, 401, "Connect Yahoo Fantasy to see your roster");
    const all = extractTeams(await yahoo("users;use_login=1/games;game_keys=nfl/teams", access));
    if (!all.length) return res.status(200).json({ok:true, teams:[], players:[], week});
    const requested = String(req.query?.team || "");
    const selected = all.find(x => x.key === requested) || all[0];
    const [rosterRaw, statsRaw, settingsRaw] = await Promise.all([
      yahoo("team/" + selected.key + "/roster;week=" + week + "/players", access),
      yahoo("team/" + selected.key + "/players/stats;type=week;week=" + week, access).catch(() => null),
      yahoo("league/" + selected.leagueKey + "/settings", access).catch(() => null)
    ]);
    const roster = extractPlayers(rosterRaw);
    const stats = statsRaw ? extractPlayers(statsRaw) : new Map();
    const names = settingsRaw ? statLabels(settingsRaw) : {};
    const players = [...roster.values()].map(player => {
      const result = stats.get(player.key);
      return { ...player,
        points:result?.points ?? player.points,
        stats:(result?.stats?.length ? result.stats : player.stats).map(s => ({
          name:names[s.id] || "Stat " + s.id, value:s.value
        }))
      };
    });
    return res.status(200).json({ok:true, week, updatedAt:new Date().toISOString(),
      teams:all, selectedTeam:selected.key, players, source:"Yahoo Fantasy"});
  } catch { return fail(res, 502, "Yahoo roster or stats could not be loaded. Reconnect Yahoo if the issue persists."); }
};
