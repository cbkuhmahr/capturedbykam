module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminToken = req.headers["x-cbk-admin-token"];
  if (!adminToken || typeof adminToken !== "string") {
    return res.status(401).json({ error: "Studio Admin session required." });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(503).json({ error: "Email delivery is not configured yet." });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const orderId = String(body.order_id || "");
  if (!orderId) return res.status(400).json({ error: "Missing order." });

  try {
    const upstream = await fetch("https://waiopvueoobwrnlctmua.supabase.co/functions/v1/cbk-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cbk-admin-token": adminToken,
        "x-cbk-resend-key": resendKey
      },
      body: JSON.stringify({ action: "confirmAndDeliver", order_id: orderId })
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    return res.send(text);
  } catch {
    return res.status(502).json({ error: "Could not reach the delivery service." });
  }
};
