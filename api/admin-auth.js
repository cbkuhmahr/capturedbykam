const AUTH_FUNCTION = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/cbk-auth";
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

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    COOKIE_NAME + "=" + encodeURIComponent(token) +
      "; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict"
  );
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

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const action = String(body.action || "");
  const protectedActions = new Set([
    "securityStatus",
    "passkeyRegisterOptions",
    "passkeyRegisterVerify",
    "totpEnrollStart",
    "totpEnrollVerify",
    "logout"
  ]);

  const cookies = parseCookies(String(req.headers.cookie || ""));
  const sessionToken = cookies[COOKIE_NAME] || "";

  if (protectedActions.has(action) && !sessionToken) {
    return res.status(401).json({ error: "Studio Admin is locked." });
  }

  try {
    const headers = {
      "Content-Type": "application/json",
      "Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.capturedbykam.com"
    };
    if (sessionToken) headers["x-cbk-admin-token"] = sessionToken;

    const response = await fetch(AUTH_FUNCTION, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (["login", "verifyTotpLogin", "passkeyAuthenticate"].includes(action) && response.ok && data.token) {
      setSessionCookie(res, data.token);
      delete data.token;
    }

    if (action === "logout") clearSessionCookie(res);
    if (response.status === 401 && protectedActions.has(action)) clearSessionCookie(res);

    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({ error: "Admin security service is temporarily unavailable." });
  }
};
