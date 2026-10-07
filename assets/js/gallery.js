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

  let project = null;
  let photos = [];
  const selected = new Map();

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
    document.getElementById("packageText").textContent = `${project.package_size} photos minimum`;
    document.getElementById("packagePrice").textContent = `$${Number(project.package_price).toFixed(0)} + $${Number(project.extra_photo_price).toFixed(0)} each extra`;
    document.getElementById("orderTitle").textContent = `${project.package_size} photos — $${Number(project.package_price).toFixed(0)}`;

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

  function calculateExtras() {
    if (!project) return { count: 0, amount: 0 };
    const count = Math.max(selected.size - Number(project.package_size), 0);
    return { count, amount: count * Number(project.extra_photo_price || 0) };
  }

  function calculateTotal() {
    if (!project) return 0;
    return Number(project.package_price) + calculateExtras().amount;
  }

  function updateSelection() {
    const minimum = project?.package_size || 5;
    const total = calculateTotal();
    if (selected.size < minimum) {
      selectionCount.textContent = `${selected.size} selected — choose at least ${minimum}`;
    } else {
      selectionCount.textContent = `${selected.size} selected — $${total.toFixed(2)}`;
    }
    reviewButton.disabled = selected.size < minimum;
    document.getElementById("orderTitle").textContent = selected.size >= minimum
      ? `${selected.size} photos — $${total.toFixed(2)}`
      : `${minimum} photos — $${Number(project.package_price).toFixed(2)}`;
    const extras = calculateExtras();
    selectedCodesEl.innerHTML = [...selected.values()].map((p) => `<span>${escapeHtml(p.photo_code)}</span>`).join("");
    orderPhotoCount.textContent = String(selected.size);
    orderBasePrice.textContent = "$" + Number(project?.package_price || 0).toFixed(2);
    orderExtras.textContent = extras.count ? `${extras.count} × $${Number(project?.extra_photo_price || 0).toFixed(2)} = $${extras.amount.toFixed(2)}` : "$0.00";
    orderExtrasRow.hidden = extras.count === 0;
    orderTotal.textContent = "$" + total.toFixed(2);
    submitOrderButton.textContent = selected.size >= minimum ? `Place Order — $${total.toFixed(2)}` : `Select ${minimum - selected.size} More`;
  }

  reviewButton.addEventListener("click", openDrawer);
  document.getElementById("closeDrawer").addEventListener("click", closeDrawer);
  document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);

  function openDrawer() {
    updateSelection();
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cbk-no-scroll");
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cbk-no-scroll");
  }

  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    orderMessage.textContent = "";
    if (selected.size < project.package_size) return;

    const form = new FormData(orderForm);
    const deliveryMethod = "email";
    const email = String(form.get("customer_email") || "").trim();
    const phone = String(form.get("customer_phone") || "").trim();
    if (!email) {
      orderMessage.textContent = "Enter an email address for photo delivery.";
      return;
    }

    const orderCode = "CBK-" + [...crypto.getRandomValues(new Uint8Array(4))]
      .map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();

    const submit = submitOrderButton;
    submit.disabled = true;
    submit.textContent = "Saving Order…";

    const paymentMethod = String(form.get("payment_method"));
    const { error } = await client.from("cbk_shop_orders").insert({
      order_code: orderCode,
      project_id: project.id,
      customer_name: String(form.get("customer_name")).trim(),
      customer_email: email || null,
      customer_phone: phone || null,
      delivery_method: deliveryMethod,
      selected_photo_codes: [...selected.values()].map((p) => p.photo_code),
      amount: calculateTotal(),
      payment_method: paymentMethod
    });

    if (error) {
      orderMessage.textContent = "Your order could not be saved. Please try again.";
      submit.disabled = false;
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
    return String(value).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]));
  }

  loadGallery();
})();