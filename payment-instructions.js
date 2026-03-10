// payment-instructions.js
(() => {
  "use strict";

  const methodEl = document.getElementById("piMethod");
  const totalEl = document.getElementById("piTotal");
  const codeEl = document.getElementById("piCode");
  const actionLink = document.getElementById("piActionLink");
  const instructionEl = document.getElementById("piInstruction");

  const params = new URLSearchParams(window.location.search);

  const method = params.get("method") || "—";
  const total = params.get("total") || "$0.00";
  const code = params.get("code") || "—";

  const PAYPAL_ME_LINK = "https://paypal.me/kam@capturedbykam.com";
  const CASH_APP_LINK = "https://cash.app/$CapturedbyKam";
  const VENMO_LINK = "https://account.venmo.com/u/@CapturedbyKam";
  const APPLE_PAY_TO = "4194500315";

  function getNumericTotal(value) {
    const cleaned = String(value).replace(/[^0-9.]/g, "");
    const number = Number(cleaned || 0);
    return number.toFixed(2);
  }

  if (methodEl) methodEl.textContent = method;
  if (totalEl) totalEl.textContent = total;
  if (codeEl) codeEl.textContent = code;

  if (!actionLink || !instructionEl) return;

  actionLink.classList.remove("is-hidden");

  switch (method) {
    case "PayPal":
      actionLink.href = `${PAYPAL_ME_LINK}/${getNumericTotal(total)}`;
      actionLink.textContent = "Open PayPal";
      instructionEl.textContent = `Send ${total} paypal.me/kam@capturedbykam.com  to and enter ${code} in the note / reason for payment.`;
      break;

    case "Cash App":
      actionLink.href = CASH_APP_LINK;
      actionLink.textContent = "Open Cash App";
      instructionEl.textContent = `Send ${total} to $CapturedbyKam and enter ${code} in the note / reason for payment.`;
      break;

    case "Venmo":
      actionLink.href = VENMO_LINK;
      actionLink.textContent = "Open Venmo";
      instructionEl.textContent = `Send ${total} to @CapturedbyKam and enter ${code} in the note / reason for payment.`;
      break;

    case "Apple Pay":
      actionLink.classList.add("is-hidden");
      instructionEl.textContent = `Use Apple Cash to send ${total} to ${APPLE_PAY_TO}. Enter ${code} in the note / reason for payment.`;
      break;

    case "Cash":
      actionLink.classList.add("is-hidden");
      instructionEl.textContent = `Bring ${total} in cash and keep ${code} with your order.`;
      break;

    default:
      actionLink.classList.add("is-hidden");
      instructionEl.textContent = `Use ${code} with your payment.`;
      break;
  }
})();
