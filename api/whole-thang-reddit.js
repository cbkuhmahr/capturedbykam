"use strict";

// Approved Reddit Data API access only; no unauthenticated scraping.
// The feature deliberately stays disabled until Reddit has approved the app/use.
// Images are linked from Reddit without caching or redistribution.
const AUTH_URL = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/cbk-auth";
const COMMUNITY_NAMES = [
  "amateurwifehub", "AnythingPanties", "athletic_ladies", "BootyDaily",
  "deepbuttcrack", "FuckworthyWifeshare", "FullBackPanties", "hornypanties",
  "Moms_In_Thongs", "PantiesByBrandName1", "panty_lines", "PantyCake",
  "SwimmerBabes", "SwimmingSuits", "Wife_Getting_Ready_GW", "Wife_In_Panties"
];
const COMMUNITIES = new Map(COMMUNITY_NAMES.map(name => [name.toLowerCase(), name]));
const ALLOWED_HOSTS = new Set(["www.capturedbykam.com", "capturedbykam.com", "capturedbykam.vercel.app"]);
let credentialToken = null;
let credentialExpires = 0;

function failure(res, status, error) { return res.status(status).json({error}); }
function readCookie(header, name) {
  const item = String(header || "").split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  if (!item) return "";
  try { return decodeURIComponent(item.slice(name.length + 1)); } catch { return ""; }
}
async function verifySession(token) {
  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json", "Origin":"https://www.capturedbykam.com", "x-cbk-admin-token":token},
    body: JSON.stringify({action:"securityStatus"}),
    signal:AbortSignal.timeout(8000)
  });
  return response.ok;
}
async function redditToken() {
  if (credentialToken && credentialExpires > Date.now() + 30000) return credentialToken;
  const pair = Buffer.from(process.env.REDDIT_CLIENT_ID + ":" + process.env.REDDIT_CLIENT_SECRET).toString("base64");
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method:"POST",
    headers:{
      "Authorization":"Basic " + pair,
      "Content-Type":"application/x-www-form-urlencoded",
      "User-Agent":process.env.REDDIT_USER_AGENT
    },
    body:"grant_type=client_credentials",
    signal:AbortSignal.timeout(8000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.access_token !== "string") throw Error("Reddit authorization unavailable");
  credentialToken = data.access_token;
  credentialExpires = Date.now() + Math.min(Number(data.expires_in)||600,3600)*1000;
  return credentialToken;
}
function usableImage(post) {
  if (!post || post.stickied || post.spoiler || post.is_self || post.removed_by_category ||
      post.banned_by || post.author === "[deleted]" || post.is_video) return null;
  // Only accept direct Reddit-hosted image URLs. Avoid redirectors, embeds and arbitrary HTML.
  const raw = post.url_overridden_by_dest || post.url;
  if (typeof raw !== "string") return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:" || !["i.redd.it","preview.redd.it"].includes(url.hostname) ||
      !/\.(jpe?g|png|webp)$/i.test(url.pathname)) return null;
  if (typeof post.permalink !== "string" || !/^\/r\/[A-Za-z0-9_]+\/comments\/[A-Za-z0-9]+\//.test(post.permalink))
    return null;
  const community = COMMUNITIES.get(String(post.subreddit||"").toLowerCase());
  if (!community) return null;
  return {
    image: url.toString(),
    link: "https://www.reddit.com" + post.permalink,
    subreddit: community,
    title: String(post.title || "").slice(0, 160)
  };
}
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","same-origin");
  if (req.method !== "POST") { res.setHeader("Allow","POST");return failure(res,405,"Method not allowed"); }
  const host = String(req.headers.host || "").toLowerCase();
  const origin = String(req.headers.origin || "");
  const referer = String(req.headers.referer || "");
  if (!(ALLOWED_HOSTS.has(host) || /^capturedbykam-[a-z0-9-]+\.vercel\.app$/.test(host)) ||
    (origin && origin !== "https://" + host) || (!origin && !referer.startsWith("https://" + host + "/")) ||
    req.headers["x-wt-companion"] !== "1") return failure(res,403,"Invalid request source");
  const session = readCookie(req.headers.cookie,"cbk_admin_session");
  if (!/^[a-f0-9]{64}$/i.test(session)) return failure(res,401,"Unlock WholeThang first");
  let body = req.body;
  if (typeof body === "string") { try {body = JSON.parse(body);} catch {return failure(res,400,"Invalid JSON");} }
  const selected = body?.subreddits;
  if (!Array.isArray(selected) || !selected.length || selected.length>16 || selected.some(s=>typeof s!=="string" || !COMMUNITIES.has(s.toLowerCase())))
    return failure(res,400,"Choose at least one configured subreddit");
  const communities = [...new Set(selected.map(s=>COMMUNITIES.get(s.toLowerCase())))];
  try { if (!await verifySession(session)) return failure(res,401,"WholeThang session expired"); }
  catch { return failure(res,503,"Unable to verify session"); }

  if (process.env.REDDIT_DATA_API_APPROVED !== "true" ||
      !process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET || !process.env.REDDIT_USER_AGENT) {
    return failure(res,503,"Reddit photos aren't connected yet. The app needs approved Reddit API access.");
  }
  try {
    const oauth = await redditToken();
    const order = communities.sort(()=>Math.random()-0.5).slice(0,3);
    for (const subreddit of order) {
      const response = await fetch("https://oauth.reddit.com/r/" + encodeURIComponent(subreddit) + "/hot?limit=45&raw_json=1", {
        headers: {
          "Authorization":"Bearer " + oauth,
          "User-Agent":process.env.REDDIT_USER_AGENT
        },
        signal:AbortSignal.timeout(9000)
      });
      if (response.status === 401 || response.status === 403) continue;
      if (!response.ok) continue;
      const data = await response.json().catch(()=>null);
      const candidates = (data?.data?.children||[]).map(x=>usableImage(x.data)).filter(Boolean)
        .filter(x=>x.subreddit.toLowerCase()===subreddit.toLowerCase());
      if (candidates.length) return res.status(200).json({photo:candidates[Math.floor(Math.random()*candidates.length)]});
    }
    return failure(res,404,"No accessible Reddit-hosted images found in the selected communities. Reddit may restrict mature API content.");
  } catch {
    return failure(res,502,"Reddit photo service is unavailable");
  }
};