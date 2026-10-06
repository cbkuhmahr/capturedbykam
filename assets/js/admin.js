(() => {
  const cfg = window.CBK_SUPABASE;
  const client = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
  const apiUrl = cfg.url + "/functions/v1/cbk-admin";
  const tokenKey = "cbk_admin_session_v1";

  const loginPanel = document.getElementById("loginPanel");
  const dashboard = document.getElementById("adminDashboard");
  const signOutButton = document.getElementById("signOutButton");
  const loginForm = document.getElementById("loginForm");
  const loginPin = document.getElementById("loginPin");
  const loginMessage = document.getElementById("loginMessage");
  const projectForm = document.getElementById("projectForm");
  const uploadForm = document.getElementById("uploadForm");
  const uploadProject = document.getElementById("uploadProject");
  const projectList = document.getElementById("adminProjects");
  const orderList = document.getElementById("adminOrders");

  let sessionToken = localStorage.getItem(tokenKey) || "";
  let projects = [];
  let photos = [];
  let orders = [];

  async function api(action, payload = {}, includeToken = true) {
    const headers = { "Content-Type": "application/json" };
    if (includeToken && sessionToken) headers["x-cbk-admin-token"] = sessionToken;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload })
    });

    let data = {};
    try { data = await response.json(); } catch {}

    if (response.status === 401 && action !== "login") {
      localStorage.removeItem(tokenKey);
      sessionToken = "";
      showLogin("Session expired. Enter your passcode again.");
      throw new Error(data.error || "Session expired.");
    }

    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pin = loginPin.value.trim();
    if (!/^\d{6}$/.test(pin)) {
      loginMessage.textContent = "Enter all 6 digits.";
      return;
    }

    loginMessage.textContent = "Unlocking…";
    loginForm.querySelector("button").disabled = true;

    try {
      const data = await api("login", { pin }, false);
      sessionToken = data.token;
      localStorage.setItem(tokenKey, sessionToken);
      loginPin.value = "";
      await openDashboard();
    } catch (error) {
      loginMessage.textContent = error.message;
      loginPin.select();
    } finally {
      loginForm.querySelector("button").disabled = false;
    }
  });

  loginPin.addEventListener("input", () => {
    loginPin.value = loginPin.value.replace(/\D/g, "").slice(0, 6);
  });

  signOutButton.addEventListener("click", async () => {
    try { if (sessionToken) await api("logout"); } catch {}
    localStorage.removeItem(tokenKey);
    sessionToken = "";
    showLogin("Studio Admin locked.");
  });

  async function openDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    signOutButton.hidden = false;
    loginMessage.textContent = "";
    await refreshAll();
  }

  function showLogin(message = "") {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    signOutButton.hidden = true;
    loginMessage.textContent = message;
    setTimeout(() => loginPin.focus(), 50);
  }

  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(projectForm);
    const message = document.getElementById("projectMessage");
    message.textContent = "Creating project…";

    try {
      await api("createProject", {
        title: String(fd.get("title")).trim(),
        event_date: fd.get("event_date") || null,
        description: String(fd.get("description") || "").trim(),
        package_size: Number(fd.get("package_size")),
        package_price: Number(fd.get("package_price")),
        status: fd.get("status")
      });
      message.textContent = "Project created. You can upload photos now.";
      projectForm.reset();
      projectForm.elements.package_size.value = 5;
      projectForm.elements.package_price.value = "20.00";
      await refreshAll();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const projectId = uploadProject.value;
    const files = [...document.getElementById("photoFiles").files];
    const message = document.getElementById("uploadMessage");
    const progress = document.getElementById("uploadProgress");
    const bar = progress.querySelector("span");
    const button = document.getElementById("uploadButton");

    if (!projectId || !files.length) return;

    const existingCodes = new Set(
      photos.filter((p) => p.project_id === projectId).map((p) => p.photo_code.toLowerCase())
    );

    progress.hidden = false;
    bar.style.width = "0%";
    button.disabled = true;
    let uploaded = 0;

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const baseCode = filenameCode(file.name);
      let code = baseCode;
      let suffix = 2;
      while (existingCodes.has(code.toLowerCase())) code = `${baseCode}-${suffix++}`;
      existingCodes.add(code.toLowerCase());

      try {
        message.textContent = `Preparing ${index + 1} of ${files.length}…`;
        const blob = await makeWatermarkedPreview(file);
        const prepared = await api("prepareUpload", { project_id: projectId, photo_code: code });

        const { error: uploadError } = await client.storage
          .from(cfg.bucket)
          .uploadToSignedUrl(prepared.path, prepared.token, blob, {
            contentType: "image/jpeg"
          });

        if (uploadError) throw uploadError;

        await api("registerPhoto", {
          project_id: projectId,
          photo_code: code,
          storage_path: prepared.path
        });

        uploaded++;
        bar.style.width = Math.round(((index + 1) / files.length) * 100) + "%";
        message.textContent = `Uploaded ${uploaded} of ${files.length} previews…`;
      } catch (error) {
        message.textContent = `Stopped after ${uploaded} uploads: ${error.message}`;
        break;
      }
    }

    if (uploaded === files.length) message.textContent = `${uploaded} photos added. Gallery is ready.`;
    button.disabled = false;
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
    try {
      const data = await api("dashboard");
      projects = data.projects || [];
      photos = data.photos || [];
      orders = data.orders || [];
      renderStats();
      renderProjectSelect();
      renderProjects();
      renderOrders();
    } catch (error) {
      if (sessionToken) alert(error.message);
    }
  }

  function renderStats() {
    document.getElementById("statProjects").textContent = projects.length;
    document.getElementById("statOpen").textContent = projects.filter((p) => p.status === "open").length;
    document.getElementById("statPhotos").textContent = photos.length;
    document.getElementById("statOrders").textContent = orders.filter((o) => o.fulfillment_status === "new").length;
  }

  function renderProjectSelect() {
    const current = uploadProject.value;
    uploadProject.innerHTML = '<option value="">Choose project…</option>' + projects.map((p) =>
      `<option value="${p.id}">${escapeHtml(p.title)} — ${p.status}</option>`
    ).join("");
    if (projects.some((p) => p.id === current)) uploadProject.value = current;
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
          <a class="button" href="gallery.html?project=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Preview</a>
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
      try {
        await api("setProjectStatus", { project_id: button.dataset.status, status: button.dataset.next });
        await refreshAll();
      } catch (error) { alert(error.message); }
    }));

    projectList.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
      const project = projects.find((p) => p.id === button.dataset.delete);
      if (!confirm(`Delete "${project?.title}" and its gallery photos? This cannot be undone.`)) return;
      try {
        await api("deleteProject", { project_id: button.dataset.delete });
        await refreshAll();
      } catch (error) { alert(error.message); }
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
      try {
        await api("updateOrder", { order_id: button.dataset.paid, payment_status: "confirmed" });
        await refreshAll();
      } catch (error) { alert(error.message); }
    }));

    orderList.querySelectorAll("[data-sent]").forEach((button) => button.addEventListener("click", async () => {
      try {
        await api("updateOrder", { order_id: button.dataset.sent, fulfillment_status: "sent" });
        await refreshAll();
      } catch (error) { alert(error.message); }
    }));
  }

  document.getElementById("refreshButton").addEventListener("click", refreshAll);

  function filenameCode(name) {
    return String(name).replace(/\.[^.]+$/, "").trim().replace(/\s+/g, "-").slice(0, 80) || "CBK-PHOTO";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]));
  }

  if (sessionToken) {
    openDashboard().catch(() => showLogin("Enter your passcode to unlock Studio Admin."));
  } else {
    showLogin();
  }
})();