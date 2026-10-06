(() => {
  const cfg = window.CBK_SUPABASE;
  const client = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, detectSessionInUrl: true }
  });

  const loginPanel = document.getElementById("loginPanel");
  const dashboard = document.getElementById("adminDashboard");
  const signOutButton = document.getElementById("signOutButton");
  const loginForm = document.getElementById("loginForm");
  const projectForm = document.getElementById("projectForm");
  const uploadForm = document.getElementById("uploadForm");
  const uploadProject = document.getElementById("uploadProject");
  const projectList = document.getElementById("adminProjects");
  const orderList = document.getElementById("adminOrders");

  let projects = [];
  let photos = [];
  let orders = [];

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const msg = document.getElementById("loginMessage");
    msg.textContent = "Sending secure link…";
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + "/admin.html" }
    });
    msg.textContent = error ? error.message : "Check your email and tap the secure sign-in link.";
  });

  signOutButton.addEventListener("click", async () => {
    await client.auth.signOut();
    await syncAuth();
  });

  client.auth.onAuthStateChange(() => setTimeout(syncAuth, 0));

  async function syncAuth() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return showLogin();

    const { data: allowed, error } = await client
      .from("cbk_admin_emails")
      .select("email")
      .eq("email", String(user.email || "").toLowerCase())
      .maybeSingle();

    if (error || !allowed) {
      await client.auth.signOut();
      document.getElementById("loginMessage").textContent = "This account is not authorized for Studio Admin.";
      return showLogin();
    }

    loginPanel.hidden = true;
    dashboard.hidden = false;
    signOutButton.hidden = false;
    await refreshAll();
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    signOutButton.hidden = true;
  }

  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(projectForm);
    const title = String(fd.get("title")).trim();
    const baseSlug = slugify(title);
    const slug = baseSlug + "-" + Date.now().toString().slice(-5);

    const { error } = await client.from("cbk_shop_projects").insert({
      title,
      slug,
      event_date: fd.get("event_date") || null,
      description: String(fd.get("description") || "").trim() || null,
      package_size: Number(fd.get("package_size")),
      package_price: Number(fd.get("package_price")),
      status: fd.get("status")
    });

    const message = document.getElementById("projectMessage");
    if (error) return message.textContent = error.message;
    message.textContent = "Project created. You can upload photos now.";
    projectForm.reset();
    projectForm.elements.package_size.value = 5;
    projectForm.elements.package_price.value = "20.00";
    await refreshAll();
  });

  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const projectId = uploadProject.value;
    const files = [...document.getElementById("photoFiles").files];
    const message = document.getElementById("uploadMessage");
    const progress = document.getElementById("uploadProgress");
    const bar = progress.querySelector("span");
    if (!projectId || !files.length) return;

    const project = projects.find((p) => p.id === projectId);
    const existingCodes = new Set(photos.filter((p) => p.project_id === projectId).map((p) => p.photo_code.toLowerCase()));
    progress.hidden = false;
    bar.style.width = "0%";
    message.textContent = "Creating watermarked previews…";
    document.getElementById("uploadButton").disabled = true;

    let firstPath = project?.cover_path || null;
    let uploaded = 0;

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const baseCode = filenameCode(file.name);
      let code = baseCode;
      let suffix = 2;
      while (existingCodes.has(code.toLowerCase())) code = `${baseCode}-${suffix++}`;
      existingCodes.add(code.toLowerCase());

      try {
        const blob = await makeWatermarkedPreview(file);
        const safeName = code.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
        const path = `${projectId}/${Date.now()}-${index}-${safeName}.jpg`;
        const { error: uploadError } = await client.storage.from(cfg.bucket).upload(path, blob, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false
        });
        if (uploadError) throw uploadError;

        const { error: rowError } = await client.from("cbk_shop_photos").insert({
          project_id: projectId,
          photo_code: code,
          storage_path: path,
          sort_order: photos.filter((p) => p.project_id === projectId).length + index
        });
        if (rowError) throw rowError;

        if (!firstPath) firstPath = path;
        uploaded++;
      } catch (error) {
        message.textContent = `Stopped after ${uploaded} uploads: ${error.message}`;
        break;
      }

      bar.style.width = Math.round(((index + 1) / files.length) * 100) + "%";
      message.textContent = `Uploaded ${index + 1} of ${files.length} previews…`;
    }

    if (firstPath && !project?.cover_path) {
      await client.from("cbk_shop_projects").update({ cover_path: firstPath, updated_at: new Date().toISOString() }).eq("id", projectId);
    }

    if (uploaded === files.length) message.textContent = `${uploaded} photos added. Gallery is ready.`;
    document.getElementById("uploadButton").disabled = false;
    document.getElementById("photoFiles").value = "";
    await refreshAll();
  });

  async function makeWatermarkedPreview(file) {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = `700 ${Math.max(26, Math.round(width / 24))}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,.36)";
    ctx.strokeStyle = "rgba(0,0,0,.20)";
    ctx.lineWidth = 2;
    const text = "Capturedby_Kam";
    const stepX = Math.max(330, width * 0.34);
    const stepY = Math.max(180, height * 0.22);
    for (let y = -height; y <= height; y += stepY) {
      for (let x = -width; x <= width; x += stepX) {
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }
    }
    ctx.restore();

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create preview.")), "image/jpeg", 0.82);
    });
  }

  async function refreshAll() {
    const [projectResult, photoResult, orderResult] = await Promise.all([
      client.from("cbk_shop_projects").select("*").order("created_at", { ascending: false }),
      client.from("cbk_shop_photos").select("*").order("created_at", { ascending: false }),
      client.from("cbk_shop_orders").select("*,cbk_shop_projects(title)").order("created_at", { ascending: false })
    ]);

    if (projectResult.error) return;
    projects = projectResult.data || [];
    photos = photoResult.data || [];
    orders = orderResult.data || [];

    renderStats();
    renderProjectSelect();
    renderProjects();
    renderOrders();
  }

  function renderStats() {
    document.getElementById("statProjects").textContent = projects.length;
    document.getElementById("statOpen").textContent = projects.filter((p) => p.status === "open").length;
    document.getElementById("statPhotos").textContent = photos.length;
    document.getElementById("statOrders").textContent = orders.filter((o) => o.fulfillment_status === "new").length;
  }

  function renderProjectSelect() {
    const value = uploadProject.value;
    uploadProject.innerHTML = '<option value="">Choose project…</option>' + projects.map((p) =>
      `<option value="${p.id}">${escapeHtml(p.title)} — ${p.status}</option>`
    ).join("");
    if (projects.some((p) => p.id === value)) uploadProject.value = value;
  }

  function renderProjects() {
    if (!projects.length) {
      projectList.innerHTML = '<div class="cbk-admin-empty">No projects yet. Create your first gallery above.</div>';
      return;
    }

    projectList.innerHTML = projects.map((p) => {
      const count = photos.filter((photo) => photo.project_id === p.id).length;
      return `<article class="cbk-admin-project">
        <div>
          <span class="cbk-status cbk-status-${p.status}">${p.status}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${count} photos · ${p.package_size} for $${Number(p.package_price).toFixed(0)}</p>
        </div>
        <div class="cbk-admin-actions">
          <button class="button" type="button" data-upload="${p.id}">Add Photos</button>
          <a class="button" href="gallery.html?project=${encodeURIComponent(p.slug)}" target="_blank">Preview</a>
          <button class="button" type="button" data-status="${p.id}" data-next="${p.status === "open" ? "closed" : "open"}">${p.status === "open" ? "Close" : "Open"}</button>
          <button class="button cbk-danger" type="button" data-delete="${p.id}">Delete</button>
        </div>
      </article>`;
    }).join("");

    projectList.querySelectorAll("[data-upload]").forEach((button) => button.addEventListener("click", () => {
      uploadProject.value = button.dataset.upload;
      document.getElementById("uploadForm").scrollIntoView({ behavior: "smooth", block: "center" });
    }));

    projectList.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", async () => {
      await client.from("cbk_shop_projects").update({ status: button.dataset.next, updated_at: new Date().toISOString() }).eq("id", button.dataset.status);
      await refreshAll();
    }));

    projectList.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
      const project = projects.find((p) => p.id === button.dataset.delete);
      if (!confirm(`Delete "${project?.title}" and its gallery photos? This cannot be undone.`)) return;
      const paths = photos.filter((p) => p.project_id === button.dataset.delete).map((p) => p.storage_path);
      if (paths.length) await client.storage.from(cfg.bucket).remove(paths);
      const { error } = await client.from("cbk_shop_projects").delete().eq("id", button.dataset.delete);
      if (error) alert(error.message);
      await refreshAll();
    }));
  }

  function renderOrders() {
    if (!orders.length) {
      orderList.innerHTML = '<div class="cbk-admin-empty">No customer orders yet.</div>';
      return;
    }

    orderList.innerHTML = orders.map((o) => `
      <article class="cbk-order-card">
        <div class="cbk-order-top">
          <div>
            <span class="cbk-status cbk-status-${o.fulfillment_status}">${o.fulfillment_status}</span>
            <h3>${escapeHtml(o.order_code)} · ${escapeHtml(o.customer_name)}</h3>
            <p>${escapeHtml(o.cbk_shop_projects?.title || "Gallery")} · $${Number(o.amount).toFixed(2)} · ${escapeHtml(o.payment_method)}</p>
          </div>
          <time>${new Date(o.created_at).toLocaleString()}</time>
        </div>
        <div class="cbk-order-codes">${o.selected_photo_codes.map((c) => `<span>${escapeHtml(c)}</span>`).join("")}</div>
        <div class="cbk-order-contact">
          <span>${o.customer_email ? escapeHtml(o.customer_email) : "No email"}</span>
          <span>${o.customer_phone ? escapeHtml(o.customer_phone) : "No phone"}</span>
          <span>Delivery: ${escapeHtml(o.delivery_method)}</span>
        </div>
        <div class="cbk-admin-actions">
          <button class="button" data-paid="${o.id}" type="button">${o.payment_status === "confirmed" ? "Payment ✓" : "Mark Paid"}</button>
          <button class="button button-dark" data-sent="${o.id}" type="button">${o.fulfillment_status === "sent" ? "Sent ✓" : "Mark Sent"}</button>
        </div>
      </article>`).join("");

    orderList.querySelectorAll("[data-paid]").forEach((button) => button.addEventListener("click", async () => {
      await client.from("cbk_shop_orders").update({ payment_status: "confirmed" }).eq("id", button.dataset.paid);
      await refreshAll();
    }));
    orderList.querySelectorAll("[data-sent]").forEach((button) => button.addEventListener("click", async () => {
      await client.from("cbk_shop_orders").update({ fulfillment_status: "sent" }).eq("id", button.dataset.sent);
      await refreshAll();
    }));
  }

  document.getElementById("refreshButton").addEventListener("click", refreshAll);

  function filenameCode(name) {
    return String(name).replace(/\.[^.]+$/, "").trim().replace(/\s+/g, "-").slice(0, 80) || "CBK-PHOTO";
  }
  function slugify(value) {
    return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gallery";
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]));
  }

  syncAuth();
})();