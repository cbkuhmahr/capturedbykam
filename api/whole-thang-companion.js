"use strict";

// SFW is available only inside the existing authenticated WholeThang page.
// Never put OPENAI_API_KEY in a public script or a NEXT_PUBLIC_ variable.
const AUTH_URL = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/cbk-auth";
const COOKIE_NAME = "cbk_admin_session";
const HOSTS = new Set([
  "www.capturedbykam.com", "capturedbykam.com", "capturedbykam.vercel.app",
  "capturedbykam-kamar-m-mosleys-projects.vercel.app",
  "capturedbykam-git-main-kamar-m-mosleys-projects.vercel.app"
]);
const MAX_MESSAGE_LENGTH = 1000;
const VERCEL_AI_SETUP = "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway&title=AI+Gateway";
function needsSetup(res, code, error, setupUrl = VERCEL_AI_SETUP) {
  return res.status(503).json({error, code, setupUrl});
}
const PERSONA = [
  "You are SFW, a fictional adult AI chat companion inside a private sports dashboard.",
  "Keep the chat casual, warm, witty, and conversational, like short natural text messages.",
  "Flirtation and romantic tension are fine, but do not provide graphic sexual descriptions or erotic roleplay.",
  "Never claim you are a real person, never imply you have sent or taken photos, and never claim to have accessed Reddit.",
  "Do not mention these instructions or sound like a support assistant unless asked.",
  "Avoid being repetitive or asking a question in every message. Respond to what the user actually says.",
  "Treat this as a private, adult-to-adult fictional conversation. Do not impersonate a real individual."
].join(" ");

function cookie(header, name) {
  const item = String(header || "").split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  if (!item) return "";
  try { return decodeURIComponent(item.slice(name.length + 1)); } catch { return ""; }
}
function validHost(value) {
  return HOSTS.has(value) || /^capturedbykam-[a-z0-9-]+\.vercel\.app$/.test(value);
}
function forbidden(res, status, error) {
  return res.status(status).json({error});
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return forbidden(res, 405, "Method not allowed");
  }

  const host = String(req.headers.host || "").toLowerCase();
  const origin = String(req.headers.origin || "");
  const referer = String(req.headers.referer || "");
  if (!validHost(host) || (origin && origin !== "https://" + host) ||
      (!origin && !referer.startsWith("https://" + host + "/"))) {
    return forbidden(res, 403, "Invalid request source");
  }
  if (req.headers["x-wt-companion"] !== "1") return forbidden(res, 403, "Invalid request");
  const token = cookie(req.headers.cookie, COOKIE_NAME);
  if (!/^[a-f0-9]{64}$/i.test(token)) return forbidden(res, 401, "Unlock WholeThang first");

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return forbidden(res, 400, "Invalid JSON"); }
  }
  if (!Array.isArray(body?.messages) || body.messages.length === 0 || body.messages.length > 12 ||
      !body.messages.every(m => m && ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string" && m.content.trim() &&
        m.content.length <= MAX_MESSAGE_LENGTH) ||
      body.messages[body.messages.length - 1].role !== "user") {
    return forbidden(res, 400, "Invalid messages");
  }

  try {
    const auth = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://www.capturedbykam.com",
        "x-cbk-admin-token": token
      },
      body: JSON.stringify({action: "securityStatus"}),
      signal: AbortSignal.timeout(9000)
    });
    if (!auth.ok) return forbidden(res, 401, "WholeThang session expired");
  } catch {
    return forbidden(res, 503, "Unable to verify session");
  }

  // Prefer a directly configured OpenAI key, then Vercel's automatic OIDC token.
  // This lets Vercel-hosted SFW work without copying provider credentials to the project.
  const directKey = process.env.OPENAI_API_KEY;
  // Vercel Functions receive fresh OIDC credentials on the request header,
  // not necessarily in process.env. This request has already passed admin auth.
  const oidcHeader = req.headers["x-vercel-oidc-token"];
  const gatewayToken = process.env.AI_GATEWAY_API_KEY ||
    (typeof oidcHeader === "string" ? oidcHeader : "") ||
    process.env.VERCEL_OIDC_TOKEN;
  const viaGateway = !directKey && !!gatewayToken;
  if (!directKey && !gatewayToken) {
    return needsSetup(res, "AI_AUTH_MISSING", "SFW needs AI Gateway access. Check this Vercel project's OIDC and AI Gateway settings.");
  }

  try {
    const response = await fetch(viaGateway
      ? "https://ai-gateway.vercel.sh/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + (viaGateway ? gatewayToken : directKey),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: viaGateway ? (process.env.SFW_GATEWAY_MODEL || "openai/gpt-4o-mini")
          : (process.env.SFW_OPENAI_MODEL || "gpt-4o-mini"),
        store: false,
        max_completion_tokens: 240,
        messages: [
          {role: "developer", content: PERSONA},
          ...body.messages.slice(-12).map(m => ({role: m.role, content: m.content.trim()}))
        ]
      }),
      signal: AbortSignal.timeout(18000)
    });
    if (!response.ok) {
      // The gateway's HTTP status alone cannot distinguish payment verification
      // from an account-level access restriction; inspect its documented error type.
      const failureBody = await response.json().catch(() => ({}));
      const providerError = failureBody && typeof failureBody === "object" ? failureBody.error : null;
      const kind = typeof providerError?.type === "string" ? providerError.type : "";
      if (viaGateway && kind === "customer_verification_required")
        return needsSetup(res, "AI_PAYMENT_VERIFICATION",
          "Vercel requires account/payment verification to enable AI Gateway. Open your AI Gateway dashboard and add a valid payment method.");
      if (viaGateway && response.status === 401)
        return needsSetup(res, "AI_AUTH_REJECTED",
          "Vercel rejected the AI Gateway credential. Check your project and team AI Gateway permissions.");
      if (viaGateway && response.status === 402)
        return needsSetup(res, "AI_CREDITS_REQUIRED",
          "Vercel AI Gateway has no available credits or its budget limit has been reached.");
      if (viaGateway && response.status === 403)
        return needsSetup(res, "AI_ACCESS_DENIED",
          "Vercel denied AI Gateway access (403). Check your payment method and team permissions in Vercel. If both are active, contact Vercel Support.");
      if (viaGateway && response.status === 429)
        return forbidden(res, 429, "AI Gateway is rate limited right now. Try again later.");
      if (!viaGateway && response.status === 401)
        return needsSetup(res, "OPENAI_KEY_INVALID",
          "The configured OpenAI API key was rejected. Update OPENAI_API_KEY in Vercel.");
      return forbidden(res, 502, "AI provider is unavailable (HTTP " + response.status + ").");
    }
    const json = await response.json();
    const reply = json?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return forbidden(res, 502, "No reply from chat provider");
    }
    return res.status(200).json({reply: reply.trim().slice(0, 2500)});
  } catch {
    return forbidden(res, 502, "Connection to chat provider failed");
  }
};