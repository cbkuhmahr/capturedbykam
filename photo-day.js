(() => {
  "use strict";

  const STORAGE_KEY = "cbk-photo-day-selection";

  const form = document.getElementById("pdForm");
  const statusMessage = document.getElementById("pdStatusMessage");
  const emailInput = document.getElementById("pdEmailInput");
  const replyToField = document.getElementById("pdReplyToField");
  const orderDate = document.getElementById("pdOrderDate");
  const totalDisplay = document.getElementById("pdTotalDisplay");
  const totalDueField = document.getElementById("pdTotalDueField");
  const nextField = document.getElementById("pdNextField");
  const paymentCodeField = document.getElementById("pdPaymentCodeField");

  const packageInputs = Array.from(document.querySelectorAll('input[name="Package"]'));
  const extraInputs = Array.from(document.querySelectorAll('input[name="A la Carte"]'));

  function formatMoney(value) {
    return `$${value.toFixed(2)}`;
  }

  function generatePaymentCode() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const randomDigits = String(Math.floor(1000 + Math.random() * 9000));
    return `CBK-${year}${month}${day}-${randomDigits}`;
  }

  function getSelectedPackage() {
    return packageInputs.find((input) => input.checked) || null;
  }

  function saveSelections() {
    const payload = {
      packageValue: getSelectedPackage()?.value || "",
      extras: extraInputs.filter((input) => input.checked).map((input) => input.value)
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function restoreSelections() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      packageInputs.forEach((input) => {
        input.checked = input.value === parsed.packageValue;
      });

      extraInputs.forEach((input) => {
        input.checked = Array.isArray(parsed.extras) && parsed.extras.includes(input.value);
      });
    } catch (error) {
      console.error("Could not restore saved photo day selections.", error);
    }
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

    if (totalDisplay) {
      totalDisplay.value = formatted;
    }

    if (totalDueField) {
      totalDueField.value = formatted;
    }
  }

  function setReturnUrl() {
    if (!nextField) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    const selectedPackage = getSelectedPackage();

    nextUrl.search = "";
    nextUrl.hash = selectedPackage?.dataset.payTarget || "";
    nextUrl.searchParams.set("submitted", "1");

    nextField.value = nextUrl.toString();
  }

  function showSubmittedMessageIfNeeded() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("submitted") === "1" && statusMessage) {
      statusMessage.hidden = false;
    }
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
    input.addEventListener("change", () => {
      updateTotal();
      saveSelections();
    });
  });

  form?.addEventListener("submit", () => {
    const paymentCode = generatePaymentCode();

    if (paymentCodeField) {
      paymentCodeField.value = paymentCode;
    }

    if (replyToField && emailInput) {
      replyToField.value = emailInput.value.trim();
    }

    saveSelections();
    setReturnUrl();
  });

  restoreSelections();
  updateTotal();
  showSubmittedMessageIfNeeded();
})();
