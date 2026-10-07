async function resolveSquareLocation(accessToken, host) {
  if (process.env.SQUARE_LOCATION_ID) return process.env.SQUARE_LOCATION_ID;

  const response = await fetch(host + "/v2/locations", {
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Square-Version": "2026-09-16",
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) return "";
  const body = await response.json().catch(() => ({}));
  const active = (body.locations || []).find((location) => location.status === "ACTIVE");
  return active?.id || "";
}

let domainRegistrationAttempted = false;

async function registerApplePayDomains(accessToken, host) {
  if (domainRegistrationAttempted) return;
  domainRegistrationAttempted = true;

  for (const domainName of ["www.capturedbykam.com", "capturedbykam.com"]) {
    try {
      await fetch(host + "/v2/apple-pay/domains", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Square-Version": "2026-09-16",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ domain_name: domainName })
      });
    } catch {}
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  const applicationId = process.env.SQUARE_APPLICATION_ID || "";
  const accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
  const explicitEnvironment = (process.env.SQUARE_ENVIRONMENT || "").toLowerCase();
  const environment = explicitEnvironment === "sandbox" || applicationId.startsWith("sandbox-")
    ? "sandbox"
    : "production";
  const host = environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  if (!applicationId || !accessToken) {
    return res.status(200).json({
      enabled: false,
      reason: "Square credentials are not configured."
    });
  }

  try {
    const locationId = await resolveSquareLocation(accessToken, host);
    if (!locationId) {
      return res.status(200).json({
        enabled: false,
        reason: "No active Square location was found."
      });
    }

    await registerApplePayDomains(accessToken, host);

    return res.status(200).json({
      enabled: true,
      applicationId,
      locationId,
      environment,
      sdkUrl: environment === "sandbox"
        ? "https://sandbox.web.squarecdn.com/v1/square.js"
        : "https://web.squarecdn.com/v1/square.js"
    });
  } catch {
    return res.status(200).json({
      enabled: false,
      reason: "Square checkout is temporarily unavailable."
    });
  }
};
