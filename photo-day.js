(() => {
  "use strict";

  const emailInput = document.getElementById("pdEmailInput");
  const replyToField = document.getElementById("pdReplyToField");
  const orderDate = document.getElementById("pdOrderDate");
  const totalDisplay = document.getElementById("pdTotalDisplay");
  const totalDueField = document.getElementById("pdTotalDueField");

  const packageInputs = Array.from(document.querySelectorAll('input[name="Package"]'));
  const extraInputs = Array.from(document.querySelectorAll('input[name="A la Carte"]'));

  function formatMoney(value) {
    return `$${value.toFixed(2)}`;
  }

  function updateTotal() {
    let total = 0;

    packageInputs.forEach((input) => {
      if (input.checked) {
        total += Number(input.dataset.price || 0);
      }
    });

    extraInputs.forEach((input) => {
      if (input.checked) {
        total += Number(input.dataset.price || 0);
      }
    });

    const formatted = formatMoney(total);
    if (totalDisplay) totalDisplay.value = formatted;
    if (totalDueField) totalDueField.value = formatted;
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

  updateTotal();
})();
