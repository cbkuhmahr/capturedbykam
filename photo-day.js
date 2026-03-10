// photo-day.js
(() => {
  "use strict";

  const form = document.getElementById("pdForm");
  const emailInput = document.getElementById("pdEmailInput");
  const replyToField = document.getElementById("pdReplyToField");
  const orderDate = document.getElementById("pdOrderDate");
  const totalDisplay = document.getElementById("pdTotalDisplay");
  const totalDueField = document.getElementById("pdTotalDueField");
  const nextField = document.getElementById("pdNextField");
  const paymentCodeField = document.getElementById("pdPaymentCodeField");

  const packageInputs = Array.from(document.querySelectorAll('input[name="Package"]'));
  const extraInputs = Array.from(document.querySelectorAll('input[name="A la Carte"]'));
  const paymentInputs = Array.from(document.querySelectorAll('input[name="Payment Method"]'));

  function formatMoney(value) {
    return `$${value.toFixed(2)}`;
  }

  function updateTotal() {
    let total = 0;

    packageInputs.forEach((input) => {
      if (input.checked) total += Number(input.dataset.price || 0);
    });

    extraInputs.forEach((input) => {
      if (input.checked) total += Number(input.dataset.price || 0);
    });

    const formatted = formatMoney(total);

    if (totalDisplay) totalDisplay.value = formatted;
    if (totalDueField) totalDueField.value = formatted;
  }

  function generatePaymentCode() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const randomDigits = String(Math.floor(1000 + Math.random() * 9000));
    return `CBK-${year}${month}${day}-${randomDigits}`;
  }

  if (emailInput && replyToField) {
    emailInput.addEventListener("input", () => {
      replyToField.value = emailInput.value.trim();
    });
  }

  if (orderDate && !orderDate.value) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    orderDate.value = `${year}-${month}-${day}`;
  }

  [...packageInputs, ...extraInputs].forEach((input) => {
    input.addEventListener("change", updateTotal);
  });

  form?.addEventListener("submit", () => {
    const selectedPayment = paymentInputs.find((input) => input.checked)?.value || "";
    const paymentCode = generatePaymentCode();
    const formattedTotal = totalDisplay?.value || "$0.00";

    if (paymentCodeField) {
      paymentCodeField.value = paymentCode;
    }

    if (nextField) {
      const nextUrl = new URL("payment-instructions.html", window.location.href);
      nextUrl.searchParams.set("method", selectedPayment);
      nextUrl.searchParams.set("total", formattedTotal);
      nextUrl.searchParams.set("code", paymentCode);
      nextField.value = nextUrl.toString();
    }
  });

  updateTotal();
})();
