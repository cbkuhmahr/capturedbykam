(() => {
  "use strict";

  const PAYPAL_LINKS = {
    rookie: "https://www.paypal.com/ncp/payment/AS63S2UBAE376",
    allstar: "https://www.paypal.com/ncp/payment/SLHNF33CATTQ6",
    mvp: "https://www.paypal.com/ncp/payment/AS63S2UBAE376"
  };

  const form = document.getElementById("mediaDayForm");
  if (!form) return;

  const packageInputs = Array.from(document.querySelectorAll('input[name="package_choice"]'));
  const packageCards = Array.from(document.querySelectorAll(".pd-package"));
  const payButtons = Array.from(document.querySelectorAll(".pd-paypal-button"));
  const emailInput = document.getElementById("emailAddress");
  const replyToField = document.getElementById("replyToField");
  const formUrlField = document.getElementById("formUrlField");
  const referenceField = document.getElementById("referenceNumber");
  const packageField = document.getElementById("selectedPackageField");
  const submitButton = document.getElementById("detailsSubmitBtn");
  const statusBox = document.getElementById("formStatus");

  let currentReference = "";
  let submissionComplete = false;

  function buildReference() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const rand = Math.floor(100 + Math.random() * 900);
    return `CBK-${yyyy}${mm}${dd}-${hh}${min}-${rand}`;
  }

  function getSelectedPackageInput() {
    return document.querySelector('input[name="package_choice"]:checked');
  }

  function syncReplyTo() {
    if (replyToField && emailInput) {
      replyToField.value = emailInput.value.trim();
    }
  }

  function syncFormUrl() {
    if (formUrlField) {
      formUrlField.value = window.location.href;
    }
  }

  function updateVisibleCards() {
    const selected = getSelectedPackageInput();
    const selectedKey = selected ? selected.dataset.packageKey : "";

    packageCards.forEach((card) => {
      const cardKey = card.dataset.packageKey;
      const payzone = card.querySelector(".pd-payzone");
      const refText = card.querySelector(".pd-ref-text");

      card.classList.toggle("is-selected", cardKey === selectedKey);

      if (!submissionComplete) {
        card.classList.remove("is-dim");
        if (payzone) payzone.hidden = true;
        if (refText) refText.textContent = "";
        return;
      }

      const isMatch = cardKey === selectedKey;
      card.classList.toggle("is-dim", !isMatch);
      if (payzone) payzone.hidden = !isMatch;
      if (refText) refText.textContent = isMatch ? currentReference : "";
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(type, selected) {
    if (!statusBox) return;

    const selectedName = selected?.dataset.packageName || "";
    statusBox.hidden = false;
    statusBox.className = `pd-status ${type === "error" ? "is-error" : "is-success"}`;

    if (type === "error") {
      statusBox.innerHTML = `
        <p class="pd-status-title">Something failed.</p>
        <p class="pd-status-body">The player details were not confirmed as sent. Try again.</p>
      `;
      return;
    }

    statusBox.innerHTML = `
      <p class="pd-status-title">Details sent.</p>
      <p class="pd-status-body">
        Reference Number: <strong>${escapeHtml(currentReference)}</strong><br>
        Selected Package: <strong>${escapeHtml(selectedName)}</strong><br>
        Add the reference number in the PayPal note when you pay.
      </p>
      <div class="pd-status-row">
        <button type="button" class="pd-copy-button" id="copyReferenceButton">Copy Reference</button>
      </div>
    `;

    const copyButton = document.getElementById("copyReferenceButton");
    copyButton?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(currentReference);
        copyButton.textContent = "Reference Copied";
        window.setTimeout(() => {
          copyButton.textContent = "Copy Reference";
        }, 1500);
      } catch {
        copyButton.textContent = currentReference;
      }
    });
  }

  function getAjaxAction() {
    const action = form.getAttribute("action") || "";
    if (!action) return "";
    if (action.includes("/ajax/")) return action;
    return action.replace("formsubmit.co/", "formsubmit.co/ajax/");
  }

  function getPaymentLink(packageKey) {
    return PAYPAL_LINKS[packageKey] || "";
  }

  function bindPaymentLinks() {
    payButtons.forEach((button) => {
      const key = button.dataset.payKey;
      const href = getPaymentLink(key);
      button.href = href && !href.startsWith("PASTE_YOUR_") ? href : "#";
      button.setAttribute("aria-disabled", button.href === "#" ? "true" : "false");
    });
  }

  function openPaymentWindow(packageKey) {
    const paymentLink = getPaymentLink(packageKey);
    if (!paymentLink || paymentLink.startsWith("PASTE_YOUR_")) {
      return;
    }

    window.open(paymentLink, "_blank", "noopener,noreferrer");
  }

  async function submitDetails(event) {
    event.preventDefault();

    syncReplyTo();
    syncFormUrl();

    if (!form.reportValidity()) return;

    const selected = getSelectedPackageInput();
    if (!selected) {
      window.alert("Select one package before continuing.");
      return;
    }

    currentReference = buildReference();
    referenceField.value = currentReference;
    packageField.value = selected.value;

    submitButton.disabled = true;
    submitButton.textContent = "Sending Details...";

    const ajaxAction = getAjaxAction();
    const formData = new FormData(form);

    try {
      const response = await fetch(ajaxAction, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error("Submission failed");
      }

      submissionComplete = true;
      packageInputs.forEach((input) => {
        input.disabled = true;
      });

      setStatus("success", selected);
      updateVisibleCards();

      submitButton.textContent = "Details Sent";

      const selectedCard = document.querySelector(`.pd-package[data-package-key="${selected.dataset.packageKey}"]`);
      selectedCard?.scrollIntoView({ behavior: "smooth", block: "center" });
      openPaymentWindow(selected.dataset.packageKey);
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = "Send Details + Continue to PayPal";
      setStatus("error");
    }
  }

  emailInput?.addEventListener("input", syncReplyTo);
  packageInputs.forEach((input) => {
    input.addEventListener("change", updateVisibleCards);
  });

  bindPaymentLinks();
  syncReplyTo();
  syncFormUrl();
  updateVisibleCards();
  form.addEventListener("submit", submitDetails);
})();
