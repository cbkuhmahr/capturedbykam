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
  const rawTotal = params.get("total") || "$0.00";
  const total = rawTotal.startsWith("$") ? rawTotal : "$" + rawTotal;
  const code = params.get("code") || "—";
  const CASH_APP_LINK = "https://cash.app/$CapturedbyKam";
  const APPLE_PAY_TO = "4194500315";

  if (methodEl) methodEl.textContent = method;
  if (totalEl) totalEl.textContent = total;
  if (codeEl) codeEl.textContent = code;
  if (!actionLink || !instructionEl) return;

  if (method === "Cash App") {
    actionLink.href = CASH_APP_LINK;
    actionLink.textContent = "Continue with Cash App";
    instructionEl.textContent = `Send ${total} to $CapturedbyKam. Put ${code} in the payment note.`;
    return;
  }

  if (method === "Apple Pay") {
    actionLink.href = "sms:" + APPLE_PAY_TO;
    actionLink.textContent = "Continue with Apple Pay";
    instructionEl.textContent = `Send ${total} with Apple Pay to ${APPLE_PAY_TO}. Include ${code} with the payment.`;
    return;
  }

  actionLink.classList.add("is-hidden");
  instructionEl.textContent = `Use order code ${code} with your payment.`;
})();