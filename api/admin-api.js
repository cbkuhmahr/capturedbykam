const ADMIN_FUNCTION = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/cbk-admin";
const COOKIE_NAME = "cbk_admin_session";
const ALLOWED_ORIGINS = new Set([
  "https://www.capturedbykam.com",
  "https://capturedbykam.com",
  "https://capturedbykam.vercel.app"
]);

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function requestOrigin(req) {
  const origin = String(req.headers.origin || "");
  if (origin) return origin;
  const referer = String(req.headers.referer || "");
  try { return referer ? new URL(referer).origin : ""; } catch { return ""; }
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    COOKIE_NAME + "=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict"
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  const origin = requestOrigin(req);
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: "Invalid request origin." });
  }

  const cookies = parseCookies(String(req.headers.cookie || ""));
  const sessionToken = cookies[COOKIE_NAME] || "";
  if (!sessionToken) return res.status(401).json({ error: "Studio Admin is locked." });

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const action = String(body.action || "");
  if (!action || action === "login") {
    return res.status(400).json({ error: "Invalid admin action." });
  }

  try {
    let response;

    if (action === "confirmAndDeliver") {
      const host = String(req.headers.host || "www.capturedbykam.com");
      response = await fetch("https://" + host + "/api/cbk-deliver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cbk-admin-token": sessionToken
        },
        body: JSON.stringify(body)
      });
    } else {
      response = await fetch(ADMIN_FUNCTION, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.capturedbykam.com",
          "x-cbk-admin-token": sessionToken
        },
        body: JSON.stringify(body)
      });
    }

    const data = await response.json().catch(() => ({}));
    if (response.status === 401) clearSessionCookie(res);
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({ error: "Studio Admin service is temporarily unavailable." });
  }
};
