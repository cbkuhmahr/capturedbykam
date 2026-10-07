module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method not allowed");
  }

  try {
    const upstream = await fetch("https://app.squareup.com/digital-wallets/apple-pay/apple-developer-merchantid-domain-association");
    if (!upstream.ok) return res.status(502).send("Domain association unavailable");

    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    return res.status(200).send(bytes);
  } catch {
    return res.status(502).send("Domain association unavailable");
  }
};
