(() => {
  "use strict";

  const STORAGE_KEY = "cbk-photo-day-selection";

  const form = document.getElementById("pdForm");
  const statusMessage = document.getElementById("pdStatusMessage");
  const emailInput = document.getElementById("pdEmailInput");
  const replyToField = document.getElementById("pdReplyToField");
  const orderDate = document.getElementById("pdOrderDate");
  const nextField = document.getElementById("pdNextField");
  const paymentCodeField = document.getElementById("pdPaymentCodeField");

  const packageInputs = Array.from(document.querySelectorAll('input[name="Package"]'));
  const packageCards = Array.from(document.querySelectorAll(".pdPackageCard"));

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

  function saveSelection() {
    const selectedPackage = getSelectedPackage();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        packageValue: selectedPackage?.value || ""
      })
    );
  }

  function restoreSelection() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      packageInputs.forEach((input) => {
        input.checked = input.value === parsed.packageValue;
      });
    } catch (error) {
      console.error("Could not restore saved package selection.", error);
    }
  }

  function syncSelectedState() {
    const selectedValue = getSelectedPackage()?.value || "";

    packageCards.forEach((card) => {
      const cardInput = card.querySelector('input[name="Package"]');
      card.classList.toggle("isSelected", cardInput?.value === selectedValue);
    });
  }

  function setReturnUrl() {
    if (!nextField) {
      return;
    }

    const selectedPackage = getSelectedPackage();
    const nextUrl = new URL(window.location.href);

    nextUrl.search = "";
    nextUrl.hash = "";

    nextUrl.searchParams.set("submitted", "1");

    if (selectedPackage?.dataset.payTarget) {
      nextUrl.hash = selectedPackage.dataset.payTarget;
    }

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

  packageInputs.forEach((input) => {
    input.addEventListener("change", () => {
      saveSelection();
      syncSelectedState();
    });
  });

  form?.addEventListener("submit", () => {
    if (paymentCodeField) {
      paymentCodeField.value = generatePaymentCode();
    }

    if (replyToField && emailInput) {
      replyToField.value = emailInput.value.trim();
    }

    saveSelection();
    setReturnUrl();
  });

  restoreSelection();
  syncSelectedState();
  showSubmittedMessageIfNeeded();
})();
