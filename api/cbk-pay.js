const CHECKOUT_FUNCTION = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/cbk-checkout";

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

async function checkoutAction(action, payload = {}, headers = {}) {
  const response = await fetch(CHECKOUT_FUNCTION, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({ action, ...payload })
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function publicSquareMessage(body) {
  const code = body?.errors?.[0]?.code || "";
  if (["CARD_DECLINED", "GENERIC_DECLINE", "INSUFFICIENT_FUNDS", "TRANSACTION_LIMIT"].includes(code)) {
    return "Payment was declined. No charge was completed.";
  }
  if (code === "INVALID_EXPIRATION" || code === "VERIFY_CVV_FAILURE" || code === "VERIFY_AVS_FAILURE") {
    return "Payment could not be verified. Try another payment method.";
  }
  return "Payment could not be completed. Please try again.";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  const applicationId = process.env.SQUARE_APPLICATION_ID || "";
  const accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
  const resendKey = process.env.RESEND_API_KEY || "";
  const explicitEnvironment = (process.env.SQUARE_ENVIRONMENT || "").toLowerCase();
  const environment = explicitEnvironment === "sandbox" || applicationId.startsWith("sandbox-")
    ? "sandbox"
    : "production";
  const host = environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  if (!applicationId || !accessToken) {
    return res.status(503).json({ error: "Express checkout is not configured yet." });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const sourceId = String(body.source_id || "");
  const orderId = String(body.order_id || "");
  const checkoutToken = String(body.checkout_token || "");

  if (!sourceId || !orderId || checkoutToken.length < 40) {
    return res.status(400).json({ error: "Checkout session is incomplete." });
  }

  try {
    const locationId = await resolveSquareLocation(accessToken, host);
    if (!locationId) return res.status(503).json({ error: "Square location is not configured." });

    const contextResult = await checkoutAction("paymentContext", {
      order_id: orderId,
      checkout_token: checkoutToken
    });

    if (!contextResult.response.ok) {
      return res.status(contextResult.response.status).json({
        error: contextResult.data?.error || "Checkout session could not be verified."
      });
    }

    const context = contextResult.data;
    let squarePaymentId = context.square_payment_id || null;

    if (context.payment_status !== "confirmed") {
      const amountCents = Math.round(Number(context.amount) * 100);
      const squareResponse = await fetch(host + "/v2/payments", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Square-Version": "2026-09-16",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source_id: sourceId,
          idempotency_key: String(context.order_code).slice(0, 45),
          amount_money: {
            amount: amountCents,
            currency: "USD"
          },
          autocomplete: true,
          location_id: locationId,
          reference_id: String(context.order_code).slice(0, 40),
          note: "Capturedby_Kam digital photo order " + context.order_code
        })
      });

      const squareBody = await squareResponse.json().catch(() => ({}));
      if (!squareResponse.ok || !squareBody.payment?.id) {
        if (squareResponse.status < 500) {
          await checkoutAction("cancelOrder", {
            order_id: orderId,
            checkout_token: checkoutToken,
            reason: squareBody?.errors?.[0]?.code || "Payment was not completed."
          }).catch(() => {});
        }
        return res.status(402).json({
          error: publicSquareMessage(squareBody),
          code: squareBody?.errors?.[0]?.code || null
        });
      }

      squarePaymentId = squareBody.payment.id;
    }

    const completion = await checkoutAction("completePayment", {
      order_id: orderId,
      checkout_token: checkoutToken,
      square_payment_id: squarePaymentId
    }, {
      "x-cbk-square-key": accessToken,
      "x-cbk-resend-key": resendKey,
      "x-cbk-square-location": locationId,
      "x-cbk-square-environment": environment
    });

    if (!completion.response.ok) {
      return res.status(200).json({
        ok: true,
        paid: true,
        order_code: context.order_code,
        amount: Number(context.amount),
        delivery_pending: true,
        error: completion.data?.error || "Payment is confirmed. Delivery needs attention."
      });
    }

    return res.status(200).json(completion.data);
  } catch {
    return res.status(502).json({
      error: "Payment service is temporarily unavailable. Please try again."
    });
  }
};
