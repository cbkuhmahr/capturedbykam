<script>
  const mediaDayForm = document.getElementById('mediaDayForm');
  const packageInputs = Array.from(document.querySelectorAll('input[name="package_choice"]'));
  const packageCards = Array.from(document.querySelectorAll('.package-card'));
  const formStatus = document.getElementById('formStatus');
  const detailsSubmitBtn = document.getElementById('detailsSubmitBtn');
  const referenceNumberField = document.getElementById('referenceNumber');
  const selectedPackageField = document.getElementById('selectedPackageField');

  let detailsSent = false;
  let currentReference = '';

  function makeReferenceNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const random = Math.floor(100 + Math.random() * 900);
    return `CBK-${y}${m}${d}-${h}${min}-${random}`;
  }

  function getSelectedPackageInput() {
    return document.querySelector('input[name="package_choice"]:checked');
  }

  function refreshPackageUI() {
    const selected = getSelectedPackageInput();
    const selectedKey = selected ? selected.dataset.packageKey : '';

    packageCards.forEach((card) => {
      const cardKey = card.dataset.packageKey;
      const payzone = card.querySelector('.package-payzone');
      const refEl = card.querySelector('.pay-ref');

      card.classList.toggle('is-selected', cardKey === selectedKey);

      if (!detailsSent) {
        card.classList.remove('is-dim');
        if (payzone) payzone.hidden = true;
        if (refEl) refEl.textContent = '';
        return;
      }

      const isMatch = cardKey === selectedKey;
      card.classList.toggle('is-dim', !isMatch);
      if (payzone) payzone.hidden = !isMatch;
      if (refEl) refEl.textContent = isMatch ? `Reference: ${currentReference}` : '';
    });
  }

  packageInputs.forEach((input) => {
    input.addEventListener('change', refreshPackageUI);
  });

  refreshPackageUI();

  mediaDayForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!mediaDayForm.reportValidity()) return;

    const selected = getSelectedPackageInput();
    if (!selected) {
      alert('Please choose a package before continuing.');
      return;
    }

    currentReference = makeReferenceNumber();
    referenceNumberField.value = currentReference;
    selectedPackageField.value = selected.value;

    detailsSubmitBtn.disabled = true;
    detailsSubmitBtn.textContent = 'Sending Details...';

    const formData = new FormData(mediaDayForm);

    try {
      const response = await fetch(mediaDayForm.action, {
        method: mediaDayForm.method || 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Form submit failed');
      }

      detailsSent = true;
      window.CBK_SIGNUP_REF = currentReference;
      window.CBK_SELECTED_PACKAGE = {
        key: selected.dataset.packageKey,
        name: selected.dataset.packageName,
        price: selected.dataset.packagePrice
      };

      packageInputs.forEach((input) => {
        input.disabled = true;
      });

      formStatus.hidden = false;
      formStatus.innerHTML = `
        <strong>Details sent.</strong><br>
        Reference Number: ${currentReference}<br>
        Selected Package: ${selected.dataset.packageName}<br>
        Complete payment below to finish registration.
      `;

      detailsSubmitBtn.textContent = 'Details Sent — Complete Payment Below';
      refreshPackageUI();

      const chosenCard = document.querySelector(`.package-card[data-package-key="${selected.dataset.packageKey}"]`);
      if (chosenCard) {
        chosenCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      detailsSubmitBtn.disabled = false;
      detailsSubmitBtn.textContent = 'Send Details & Continue to Payment';

      formStatus.hidden = false;
      formStatus.innerHTML = `
        <strong>Something failed.</strong><br>
        Your player details were not confirmed as sent. Please try again.
      `;
    }
  });
</script>
