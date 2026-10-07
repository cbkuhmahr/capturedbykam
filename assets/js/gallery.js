(() => {
  const cfg = window.CBK_SUPABASE;
  const client = window.supabase.createClient(cfg.url, cfg.key);
  const slug = new URLSearchParams(location.search).get("project");

  const titleEl = document.getElementById("galleryTitle");
  const descEl = document.getElementById("galleryDescription");
  const grid = document.getElementById("photoGrid");
  const selectionCount = document.getElementById("selectionCount");
  const reviewButton = document.getElementById("reviewButton");
  const drawer = document.getElementById("orderDrawer");
  const selectedCodesEl = document.getElementById("selectedCodes");
  const orderForm = document.getElementById("orderForm");
  const orderMessage = document.getElementById("orderMessage");
  const orderPhotoCount = document.getElementById("orderPhotoCount");
  const orderBasePrice = document.getElementById("orderBasePrice");
  const orderExtras = document.getElementById("orderExtras");
  const orderExtrasRow = document.getElementById("orderExtrasRow");
  const orderTotal = document.getElementById("orderTotal");
  const submitOrderButton = document.getElementById("submitOrder");

  const expressCheckout = document.getElementById("expressCheckout");
  const manualPaymentFallback = document.getElementById("manualPaymentFallback");
  const walletMethods = document.getElementById("walletMethods");
  const walletLockMessage = document.getElementById("walletLockMessage");
  const walletMessage = document.getElementById("walletMessage");
  const applePayWrap = document.getElementById("applePayWrap");
  const applePayButton = document.getElementById("applePayButton");
  const cashAppPayWrap = document.getElementById("cashAppPayWrap");
  const cashAppPayTarget = document.getElementById("cashAppPay");
  const paymentSuccess = document.getElementById("paymentSuccess");
  const successCopy = document.getElementById("successCopy");
  const downloadLinks = document.getElementById("downloadLinks");

  let project = null;
  let photos = [];
  const selected = new Map();

  let squareConfig = null;
  let payments = null;
  let applePay = null;
  let cashAppPay = null;
  let squareReady = false;
  let checkoutFinished = false;
  let walletGeneration = 0;

  const publicUrl = (path) => client.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;

  async function loadGallery() {
    if (!slug) return fail("Gallery not found.");

    const { data: projects, error: projectError } = await client
      .from("cbk_shop_projects")
      .select("id,title,description,package_size,package_price,extra_photo_price,event_date")
      .eq("slug", slug)
      .eq("status", "open")
      .limit(1);

    if (projectError || !projects?.length) return fail("This gallery is not currently open.");
    project = projects[0];

    titleEl.textContent = project.title;
    descEl.textContent = project.description || "Select your favorite photos below.";
    const individualPrice = getIndividualPrice();
    document.getElementById("packageText").textContent = `Individual photos — $${individualPrice.toFixed(2)} each`;
    document.getElementById("packagePrice").textContent = `${project.package_size} for $${Number(project.package_price).toFixed(0)} · $${Number(project.extra_photo_price || 0).toFixed(0)} each after ${project.package_size}`;
    document.getElementById("orderTitle").textContent = "Your photo order";

    const { data, error } = await client
      .from("cbk_shop_photos")
      .select("id,photo_code,storage_path,sort_order")
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true })
      .order("photo_code", { ascending: true });

    if (error) return fail("Photos could not be loaded.");
    photos = data || [];
    renderPhotos();
    updateSelection();
  }

  function renderPhotos() {
    if (!photos.length) {
      grid.innerHTML = '<div class="cbk-empty">Photos are being added to this gallery.</div>';
      return;
    }

    grid.innerHTML = photos.map((photo) => `
      <button class="cbk-photo-card" type="button" data-id="${photo.id}" aria-pressed="false">
        <img src="${publicUrl(photo.storage_path)}" alt="Photo ${escapeHtml(photo.photo_code)}" loading="lazy" />
        <span class="cbk-photo-check">✓</span>
        <span class="cbk-photo-code">${escapeHtml(photo.photo_code)}</span>
      </button>`).join("");

    grid.querySelectorAll(".cbk-photo-card").forEach((button) => {
      button.addEventListener("click", () => togglePhoto(button.dataset.id, button));
    });
  }

  function togglePhoto(id, button) {
    const photo = photos.find((item) => item.id === id);
    if (!photo) return;

    if (selected.has(id)) {
      selected.delete(id);
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    } else {
      selected.set(id, photo);
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
    }

    updateSelection();
  }

  function getIndividualPrice() {
    if (!project) return 0;
    const bundleSize = Number(project.package_size);
    const bundlePrice = Number(project.package_price);
    return bundleSize > 1 ? bundlePrice / (bundleSize - 1) : bundlePrice;
  }

  function calculateExtras() {
    if (!project) return { count: 0, amount: 0 };
    const bundleSize = Number(project.package_size);
    const count = Math.max(selected.size - bundleSize, 0);
    const each = Number(project.extra_photo_price || 0);
    return { count, amount: count * each, each };
  }

  function calculateBaseAmount() {
    if (!project || selected.size < 1) return 0;
    const bundleSize = Number(project.package_size);
    if (selected.size >= bundleSize) return Number(project.package_price);
    return selected.size * getIndividualPrice();
  }

  function calculateTotal() {
    return calculateBaseAmount() + calculateExtras().amount;
  }

  function updateSelection() {
    const minimum = 1;
    const total = calculateTotal();

    if (selected.size < minimum) {
      selectionCount.textContent = "0 selected — choose at least 1";
    } else {
      selectionCount.textContent = `${selected.size} selected — $${total.toFixed(2)}`;
    }

    reviewButton.disabled = selected.size < minimum;
    document.getElementById("orderTitle").textContent = selected.size >= minimum
      ? `${selected.size} photo${selected.size === 1 ? "" : "s"} — $${total.toFixed(2)}`
      : "Your photo order";

    const extras = calculateExtras();
    selectedCodesEl.innerHTML = [...selected.values()]
      .map((p) => `<span>${escapeHtml(p.photo_code)}</span>`)
      .join("");

    orderPhotoCount.textContent = String(selected.size);
    orderBasePrice.textContent = "$" + calculateBaseAmount().toFixed(2);
    orderExtras.textContent = extras.count
      ? `${extras.count} × $${extras.each.toFixed(2)} = $${extras.amount.toFixed(2)}`
      : "$0.00";
    orderExtrasRow.hidden = extras.count === 0;
    orderTotal.textContent = "$" + total.toFixed(2);
    submitOrderButton.textContent = selected.size >= minimum
      ? `Place Order — $${total.toFixed(2)}`
      : "Select a Photo";
  }

  reviewButton.addEventListener("click", openDrawer);
  document.getElementById("closeDrawer").addEventListener("click", closeDrawer);
  document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);

  async function openDrawer() {
    checkoutFinished = false;
    updateSelection();
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cbk-no-scroll");

    if (squareReady) {
      await setupWallets();
      updateWalletLock();
    }
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cbk-no-scroll");
  }

  function contactIsValid() {
    const name = orderForm.elements.customer_name;
    const email = orderForm.elements.customer_email;
    return Boolean(name?.value.trim().length >= 2 && email?.validity.valid && email.value.trim());
  }

  function validateContact() {
    const name = orderForm.elements.customer_name;
    const email = orderForm.elements.customer_email;

    if (!name.value.trim()) {
      name.setCustomValidity("Enter your name.");
      name.reportValidity();
      name.setCustomValidity("");
      return false;
    }

    if (!email.value.trim() || !email.validity.valid) {
      email.reportValidity();
      return false;
    }

    return true;
  }

  function updateWalletLock() {
    if (!squareReady) return;
    const unlocked = contactIsValid();
    walletMethods.classList.toggle("is-locked", !unlocked);
    walletLockMessage.hidden = unlocked;
  }

  orderForm.elements.customer_name.addEventListener("input", updateWalletLock);
  orderForm.elements.customer_email.addEventListener("input", updateWalletLock);

  async function loadSquareCheckout() {
    try {
      const response = await fetch("/api/square-config", { cache: "no-store" });
      const config = await response.json();
      if (!response.ok || !config.enabled) return;

      await loadScript(config.sdkUrl);
      if (!window.Square?.payments) return;

      squareConfig = config;
      payments = window.Square.payments(config.applicationId, config.locationId);
      squareReady = true;
      expressCheckout.hidden = false;
      manualPaymentFallback.hidden = true;
      updateWalletLock();

      if (drawer.classList.contains("is-open")) await setupWallets();
    } catch {
      squareReady = false;
      expressCheckout.hidden = true;
      manualPaymentFallback.hidden = false;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src === src);
      if (existing) {
        if (window.Square) return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function cleanupWallets() {
    try {
      if (cashAppPay?.destroy) await cashAppPay.destroy();
    } catch {}
    try {
      if (applePay?.destroy) await applePay.destroy();
    } catch {}

    cashAppPay = null;
    applePay = null;
    cashAppPayTarget.innerHTML = "";
    applePayWrap.hidden = true;
    cashAppPayWrap.hidden = true;
  }

  async function setupWallets() {
    if (!squareReady || !payments || !project || selected.size < 1) return;

    const generation = ++walletGeneration;
    await cleanupWallets();

    const paymentRequest = payments.paymentRequest({
      countryCode: "US",
      currencyCode: "USD",
      total: {
        amount: calculateTotal().toFixed(2),
        label: "Capturedby_Kam"
      }
    });

    let available = 0;

    try {
      const method = await payments.applePay(paymentRequest);
      if (generation !== walletGeneration) {
        try { await method.destroy(); } catch {}
        return;
      }

      applePay = method;
      applePayWrap.hidden = false;
      available += 1;

      applePayButton.onclick = async (event) => {
        event.preventDefault();
        if (checkoutFinished || !validateContact()) return;

        let tokenPromise;
        try {
          tokenPromise = applePay.tokenize();
        } catch {
          walletMessage.textContent = "Apple Pay could not be opened. Try Cash App Pay.";
          return;
        }

        setWalletBusy(true, "Opening Apple Pay…");

        try {
          const tokenResult = await tokenPromise;
          if (tokenResult.status === "OK" && tokenResult.token) {
            await handleWalletToken(tokenResult.token, "Apple Pay");
          } else if (tokenResult.status === "Cancel") {
            walletMessage.textContent = "Apple Pay was canceled.";
          } else {
            walletMessage.textContent = "Apple Pay could not be completed. Try again.";
          }
        } catch {
          walletMessage.textContent = "Apple Pay could not be completed. Try again.";
        } finally {
          if (!checkoutFinished) setWalletBusy(false);
        }
      };
    } catch {
      applePay = null;
      applePayWrap.hidden = true;
    }

    try {
      const method = await payments.cashAppPay(paymentRequest, {
        redirectURL: window.location.href,
        referenceId: "cbk-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24)
      });

      if (generation !== walletGeneration) {
        try { await method.destroy(); } catch {}
        return;
      }

      cashAppPay = method;
      cashAppPay.addEventListener("ontokenization", async (event) => {
        if (checkoutFinished) return;
        const tokenResult = event.detail?.tokenResult;

        if (tokenResult?.status === "OK" && tokenResult.token) {
          if (!validateContact()) {
            walletMessage.textContent = "Enter your name and email, then try Cash App Pay again.";
            return;
          }

          setWalletBusy(true, "Confirming Cash App payment…");
          try {
            await handleWalletToken(tokenResult.token, "Cash App");
          } finally {
            if (!checkoutFinished) setWalletBusy(false);
          }
        } else if (tokenResult?.status === "Cancel") {
          walletMessage.textContent = "Cash App Pay was canceled.";
        } else if (tokenResult?.status === "Error") {
          walletMessage.textContent = "Cash App Pay could not be completed. Try again.";
        }
      });

      cashAppPayWrap.hidden = false;
      await cashAppPay.attach("#cashAppPay");
      available += 1;
    } catch {
      cashAppPay = null;
      cashAppPayWrap.hidden = true;
    }

    if (generation !== walletGeneration) return;

    if (!available) {
      squareReady = false;
      expressCheckout.hidden = true;
      manualPaymentFallback.hidden = false;
    }
  }

  function setWalletBusy(busy, message = "") {
    walletMethods.classList.toggle("is-processing", busy);
    applePayButton.disabled = busy;
    if (message) walletMessage.textContent = message;
  }

  async function createCheckoutOrder(paymentMethod) {
    const form = new FormData(orderForm);
    const response = await fetch(cfg.url + "/functions/v1/cbk-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createOrder",
        project_id: project.id,
        customer_name: String(form.get("customer_name") || "").trim(),
        customer_email: String(form.get("customer_email") || "").trim(),
        customer_phone: String(form.get("customer_phone") || "").trim(),
        selected_photo_codes: [...selected.values()].map((p) => p.photo_code),
        payment_method: paymentMethod
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.order_id || !data.checkout_token) {
      throw new Error(data.error || "Checkout could not be started.");
    }
    return data;
  }

  async function handleWalletToken(sourceId, paymentMethod) {
    walletMessage.textContent = "Creating secure order…";

    try {
      const checkout = await createCheckoutOrder(paymentMethod);
      walletMessage.textContent = "Confirming payment…";

      const response = await fetch("/api/cbk-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: sourceId,
          order_id: checkout.order_id,
          checkout_token: checkout.checkout_token
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Payment could not be completed.");
      }

      if (!data.paid) {
        throw new Error(data.error || "Payment was not confirmed.");
      }

      checkoutFinished = true;
      showPaymentSuccess(data);
    } catch (error) {
      walletMessage.textContent = error.message || "Payment could not be completed. Please try again.";
      throw error;
    }
  }

  function showPaymentSuccess(data) {
    expressCheckout.hidden = true;
    manualPaymentFallback.hidden = true;
    orderForm.classList.add("is-paid");
    paymentSuccess.hidden = false;

    const links = Array.isArray(data.downloads) ? data.downloads : [];
    downloadLinks.innerHTML = links.map((item) => `
      <a class="cbk-download-link" href="${item.url}" target="_blank" rel="noopener">
        <span>${escapeHtml(item.code)}</span>
        <strong>Download Photo</strong>
      </a>`).join("");

    if (data.delivery_pending && links.length) {
      successCopy.textContent = "Payment is confirmed. Your downloads are ready here; the email copy may take a little longer.";
    } else if (data.delivery_pending && !links.length) {
      successCopy.textContent = "Payment is confirmed. Your order is safe, and CBK will finish delivery shortly.";
    } else {
      successCopy.textContent = "Download your photos below. A copy has also been sent to your email.";
    }

    walletMessage.textContent = "";
    document.querySelector(".cbk-order-panel")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    orderMessage.textContent = "";

    if (selected.size < 1) return;

    if (squareReady) {
      walletMessage.textContent = "Choose Apple Pay or Cash App Pay to complete your purchase.";
      return;
    }

    const form = new FormData(orderForm);
    const email = String(form.get("customer_email") || "").trim();
    const phone = String(form.get("customer_phone") || "").trim();

    if (!email) {
      orderMessage.textContent = "Enter an email address for photo delivery.";
      return;
    }

    const orderCode = "CBK-" + [...crypto.getRandomValues(new Uint8Array(4))]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    submitOrderButton.disabled = true;
    submitOrderButton.textContent = "Saving Order…";

    const paymentMethod = String(form.get("payment_method"));
    const { error } = await client.from("cbk_shop_orders").insert({
      order_code: orderCode,
      project_id: project.id,
      customer_name: String(form.get("customer_name")).trim(),
      customer_email: email || null,
      customer_phone: phone || null,
      delivery_method: "email",
      selected_photo_codes: [...selected.values()].map((p) => p.photo_code),
      amount: calculateTotal(),
      payment_method: paymentMethod,
      payment_provider: "manual"
    });

    if (error) {
      orderMessage.textContent = "Your order could not be saved. Please try again.";
      submitOrderButton.disabled = false;
      updateSelection();
      return;
    }

    const total = "$" + calculateTotal().toFixed(2);
    location.href = `payment-instructions.html?method=${encodeURIComponent(paymentMethod)}&total=${encodeURIComponent(total)}&code=${encodeURIComponent(orderCode)}`;
  });

  function fail(message) {
    titleEl.textContent = message;
    grid.innerHTML = '<div class="cbk-empty">Return to <a href="shop.html">Photo Shop</a>.</div>';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  loadGallery();
  loadSquareCheckout();
})();
