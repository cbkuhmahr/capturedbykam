(() => {
  const cfg = window.CBK_SUPABASE;
  const client = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false } });

  const loginPanel = document.getElementById("loginPanel");
  const dashboard = document.getElementById("adminDashboard");
  const signOutButton = document.getElementById("signOutButton");
  const loginForm = document.getElementById("loginForm");
  const loginPin = document.getElementById("loginPin");
  const loginMessage = document.getElementById("loginMessage");
  const passkeyLoginButton = document.getElementById("passkeyLoginButton");
  const loginDivider = document.getElementById("loginDivider");
  const loginIntro = document.getElementById("loginIntro");
  const totpLoginForm = document.getElementById("totpLoginForm");
  const loginTotpCode = document.getElementById("loginTotpCode");
  const totpLoginMessage = document.getElementById("totpLoginMessage");
  const cancelTotpLogin = document.getElementById("cancelTotpLogin");

  const securityOverall = document.getElementById("securityOverall");
  const passkeyStatus = document.getElementById("passkeyStatus");
  const totpStatus = document.getElementById("totpStatus");
  const registerPasskeyButton = document.getElementById("registerPasskeyButton");
  const setupAuthenticatorButton = document.getElementById("setupAuthenticatorButton");
  const securityMessage = document.getElementById("securityMessage");
  const totpSetupPanel = document.getElementById("totpSetupPanel");
  const totpSecret = document.getElementById("totpSecret");
  const copyTotpSecret = document.getElementById("copyTotpSecret");
  const totpSetupForm = document.getElementById("totpSetupForm");
  const totpSetupCode = document.getElementById("totpSetupCode");

  const projectForm = document.getElementById("projectForm");
  const uploadForm = document.getElementById("uploadForm");
  const uploadProject = document.getElementById("uploadProject");
  const projectList = document.getElementById("adminProjects");
  const orderList = document.getElementById("adminOrders");
  const bookingList = document.getElementById("adminBookings");
  const photoFilesInput = document.getElementById("photoFiles");
  const photoSelectionCount = document.getElementById("photoSelectionCount");
  const editProjectDialog = document.getElementById("editProjectDialog");
  const editProjectForm = document.getElementById("editProjectForm");
  const editProjectMessage = document.getElementById("editProjectMessage");
  const repairOriginalsForm = document.getElementById("repairOriginalsForm");
  const repairProject = document.getElementById("repairProject");
  const repairFiles = document.getElementById("repairFiles");
  const repairSelectionCount = document.getElementById("repairSelectionCount");

  // Remove the legacy readable browser token. New sessions live only in a Secure HttpOnly cookie.
  localStorage.removeItem("cbk_admin_session_v1");

  let mfaToken = "";
  let projects = [];
  let photos = [];
  let orders = [];
  let bookings = [];
  let bookingsAvailable = true;
  let orderFilter = "new";

  async function requestJson(url, action, payload = {}) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });

    let data = {};
    try { data = await response.json(); } catch {}

    if (!response.ok) {
      const error = new Error(data.error || "Request failed.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function authApi(action, payload = {}) {
    try {
      return await requestJson("/api/admin-auth", action, payload);
    } catch (error) {
      if (error.status === 401 && !["login", "verifyTotpLogin", "passkeyAuthenticate"].includes(action)) {
        showLogin("Session expired. Sign in again.");
      }
      throw error;
    }
  }

  async function api(action, payload = {}) {
    try {
      return await requestJson("/api/admin-api", action, payload);
    } catch (error) {
      if (error.status === 401) showLogin("Session expired. Sign in again.");
      throw error;
    }
  }

  async function refreshPublicSecurity() {
    try {
      const status = await authApi("publicSecurityStatus");
      const hasPasskey = Boolean(status.passkey_enabled);
      passkeyLoginButton.hidden = !hasPasskey;
      loginDivider.hidden = !hasPasskey;
      loginIntro.textContent = hasPasskey
        ? "Use your passkey for the fastest, strongest sign-in. PIN + Microsoft Authenticator is your backup."
        : "Enter your current admin PIN. Once inside, secure this page with a passkey and Microsoft Authenticator.";
    } catch {
      passkeyLoginButton.hidden = true;
      loginDivider.hidden = true;
    }
  }

  function completeLogin() {
    mfaToken = "";
    loginPin.value = "";
    loginTotpCode.value = "";
    totpLoginForm.hidden = true;
    loginForm.hidden = false;
    return openDashboard();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pin = loginPin.value.trim();
    if (!/^\d{6}$/.test(pin)) {
      loginMessage.textContent = "Enter all 6 digits.";
      return;
    }

    loginMessage.textContent = "Checking PIN…";
    const button = loginForm.querySelector("button[type='submit']");
    button.disabled = true;

    try {
      const data = await authApi("login", { pin });
      if (data.mfa_required) {
        mfaToken = data.mfa_token || "";
        loginMessage.textContent = "";
        loginForm.hidden = true;
        passkeyLoginButton.hidden = true;
        loginDivider.hidden = true;
        totpLoginForm.hidden = false;
        totpLoginMessage.textContent = "PIN accepted. Verify with Microsoft Authenticator.";
        setTimeout(() => loginTotpCode.focus(), 50);
      } else {
        await completeLogin();
      }
    } catch (error) {
      loginMessage.textContent = error.message;
      loginPin.select();
    } finally {
      button.disabled = false;
    }
  });

  totpLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = loginTotpCode.value.replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(code)) {
      totpLoginMessage.textContent = "Enter the current 6-digit code.";
      return;
    }

    const button = totpLoginForm.querySelector("button[type='submit']");
    button.disabled = true;
    totpLoginMessage.textContent = "Verifying…";
    try {
      await authApi("verifyTotpLogin", { mfa_token: mfaToken, code });
      await completeLogin();
    } catch (error) {
      totpLoginMessage.textContent = error.message;
      loginTotpCode.select();
    } finally {
      button.disabled = false;
    }
  });

  passkeyLoginButton.addEventListener("click", async () => {
    if (!window.SimpleWebAuthnBrowser?.startAuthentication) {
      loginMessage.textContent = "This browser cannot use passkeys here. Use PIN backup access.";
      return;
    }

    passkeyLoginButton.disabled = true;
    loginMessage.textContent = "Waiting for your passkey…";
    try {
      const start = await authApi("passkeyAuthOptions");
      const response = await window.SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: start.options });
      await authApi("passkeyAuthenticate", {
        challenge_id: start.challenge_id,
        response
      });
      await completeLogin();
    } catch (error) {
      loginMessage.textContent = error.message || "Passkey sign-in was canceled.";
    } finally {
      passkeyLoginButton.disabled = false;
    }
  });

  cancelTotpLogin.addEventListener("click", async () => {
    mfaToken = "";
    loginTotpCode.value = "";
    totpLoginForm.hidden = true;
    loginForm.hidden = false;
    totpLoginMessage.textContent = "";
    await refreshPublicSecurity();
    setTimeout(() => loginPin.focus(), 50);
  });

  loginPin.addEventListener("input", () => {
    loginPin.value = loginPin.value.replace(/\D/g, "").slice(0, 6);
  });
  loginTotpCode.addEventListener("input", () => {
    loginTotpCode.value = loginTotpCode.value.replace(/\D/g, "").slice(0, 6);
  });
  totpSetupCode.addEventListener("input", () => {
    totpSetupCode.value = totpSetupCode.value.replace(/\D/g, "").slice(0, 6);
  });

  signOutButton.addEventListener("click", async () => {
    try { await authApi("logout"); } catch {}
    showLogin("Studio Admin locked.");
    await refreshPublicSecurity();
  });

  async function openDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    signOutButton.hidden = false;
    loginMessage.textContent = "";
    totpLoginMessage.textContent = "";
    await Promise.all([refreshAll(), refreshSecurity()]);
  }

  function showLogin(message = "") {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    signOutButton.hidden = true;
    totpLoginForm.hidden = true;
    loginForm.hidden = false;
    mfaToken = "";
    loginMessage.textContent = message;
    securityMessage.textContent = "";
    setTimeout(() => loginPin.focus(), 50);
  }

  function deviceLabel() {
    const ua = navigator.userAgent || "";
    if (/iPhone/i.test(ua)) return "iPhone Face ID";
    if (/iPad/i.test(ua)) return "iPad Passkey";
    if (/Macintosh|Mac OS/i.test(ua)) return "Mac Passkey";
    if (/Windows/i.test(ua)) return "Windows Hello";
    if (/Android/i.test(ua)) return "Android Passkey";
    return "Studio Admin Passkey";
  }

  async function refreshSecurity() {
    try {
      const status = await authApi("securityStatus");
      const passkeys = Array.isArray(status.passkeys) ? status.passkeys : [];

      passkeyStatus.textContent = status.passkey_enabled
        ? `Active · ${passkeys.length} passkey${passkeys.length === 1 ? "" : "s"}`
        : "Not enrolled";
      totpStatus.textContent = status.totp_enabled
        ? "Active · Microsoft Authenticator"
        : "Not enrolled";

      registerPasskeyButton.textContent = status.passkey_enabled
        ? "Add Another Passkey"
        : "Register Passkey on This Device";

      setupAuthenticatorButton.disabled = !status.passkey_enabled || status.totp_enabled;
      setupAuthenticatorButton.textContent = status.totp_enabled
        ? "Microsoft Authenticator Active"
        : "Set Up Microsoft Authenticator";

      securityOverall.textContent = status.upgraded ? "Protected" : "Setup required";
      securityOverall.classList.toggle("is-secure", Boolean(status.upgraded));

      if (status.upgraded) {
        securityMessage.textContent = "Passkey is primary. PIN + Microsoft Authenticator is your backup.";
        totpSetupPanel.hidden = true;
      }
    } catch (error) {
      securityMessage.textContent = error.message;
    }
  }

  registerPasskeyButton.addEventListener("click", async () => {
    if (!/^(www\.)?capturedbykam\.com$/i.test(location.hostname)) {
      securityMessage.textContent = "Passkeys must be enrolled from capturedbykam.com, not a Vercel preview address.";
      return;
    }
    if (!window.SimpleWebAuthnBrowser?.startRegistration) {
      securityMessage.textContent = "This browser does not support passkey setup.";
      return;
    }

    registerPasskeyButton.disabled = true;
    securityMessage.textContent = "Your device will ask you to create or save a passkey…";

    try {
      const start = await authApi("passkeyRegisterOptions");
      const response = await window.SimpleWebAuthnBrowser.startRegistration({ optionsJSON: start.options });
      await authApi("passkeyRegisterVerify", {
        challenge_id: start.challenge_id,
        response,
        friendly_name: deviceLabel()
      });
      securityMessage.textContent = "Passkey registered. You can now sign in with Face ID, Touch ID, Windows Hello, or your saved passkey.";
      await refreshSecurity();
      await refreshPublicSecurity();
    } catch (error) {
      securityMessage.textContent = error.message || "Passkey setup was canceled.";
    } finally {
      registerPasskeyButton.disabled = false;
    }
  });

  setupAuthenticatorButton.addEventListener("click", async () => {
    setupAuthenticatorButton.disabled = true;
    securityMessage.textContent = "Creating Microsoft Authenticator setup…";
    try {
      const data = await authApi("totpEnrollStart");
      totpSecret.textContent = data.secret || "";
      totpSetupPanel.hidden = false;
      totpSetupCode.value = "";
      securityMessage.textContent = "Add the setup key to Microsoft Authenticator, then enter the current code below.";
      setTimeout(() => totpSetupCode.focus(), 50);
    } catch (error) {
      securityMessage.textContent = error.message;
      setupAuthenticatorButton.disabled = false;
    }
  });

  copyTotpSecret.addEventListener("click", async () => {
    const value = totpSecret.textContent.trim();
    if (!value || value === "—") return;
    try {
      await navigator.clipboard.writeText(value);
      copyTotpSecret.textContent = "Copied";
      setTimeout(() => { copyTotpSecret.textContent = "Copy Key"; }, 1400);
    } catch {
      securityMessage.textContent = "Press and hold the setup key to copy it.";
    }
  });

  totpSetupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = totpSetupCode.value.replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(code)) {
      securityMessage.textContent = "Enter the current 6-digit Microsoft Authenticator code.";
      return;
    }

    const button = totpSetupForm.querySelector("button[type='submit']");
    button.disabled = true;
    securityMessage.textContent = "Verifying Microsoft Authenticator…";
    try {
      await authApi("totpEnrollVerify", { code });
      totpSetupPanel.hidden = true;
      totpSecret.textContent = "—";
      totpSetupCode.value = "";
      securityMessage.textContent = "Microsoft Authenticator verified. Studio Admin security upgrade is complete.";
      await refreshSecurity();
      await refreshPublicSecurity();
    } catch (error) {
      securityMessage.textContent = error.message;
      totpSetupCode.select();
    } finally {
      button.disabled = false;
    }
  });

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
        extra_photo_price: Number(fd.get("extra_photo_price")),
        status: fd.get("status")
      });
      message.textContent = "Project created. You can upload photos now.";
      projectForm.reset();
      projectForm.elements.package_size.value = 5;
      projectForm.elements.package_price.value = "25.00";
      projectForm.elements.extra_photo_price.value = "2.00";
      await refreshAll();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  photoFilesInput.addEventListener("change", () => {
    const count = photoFilesInput.files.length;
    if (count > 20) {
      photoFilesInput.value = "";
      photoSelectionCount.textContent = "Please select no more than 20 photos at a time.";
      document.getElementById("uploadMessage").textContent = "Batch limit: 20 photos.";
      return;
    }
    photoSelectionCount.textContent = count
      ? count + " photo" + (count === 1 ? "" : "s") + " selected."
      : "No photos selected.";
    document.getElementById("uploadMessage").textContent = "";
  });

  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const projectId = uploadProject.value;
    const files = [...photoFilesInput.files];
    const message = document.getElementById("uploadMessage");
    const progress = document.getElementById("uploadProgress");
    const bar = progress.querySelector("span");
    const button = document.getElementById("uploadButton");

    if (!projectId || !files.length) return;
    if (files.length > 20) {
      message.textContent = "Please select no more than 20 photos at a time.";
      return;
    }

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
        const prepared = await api("prepareUpload", { project_id: projectId, photo_code: code, original_name: file.name });

        const { error: previewUploadError } = await client.storage
          .from(cfg.bucket)
          .uploadToSignedUrl(prepared.preview.path, prepared.preview.token, blob, {
            contentType: "image/jpeg"
          });
        if (previewUploadError) throw previewUploadError;

        const originalType = file.type || "application/octet-stream";
        const { error: originalUploadError } = await client.storage
          .from("cbk-gallery-originals")
          .uploadToSignedUrl(prepared.original.path, prepared.original.token, file, {
            contentType: originalType
          });
        if (originalUploadError) throw originalUploadError;

        await api("registerPhoto", {
          project_id: projectId,
          photo_code: code,
          storage_path: prepared.preview.path,
          original_path: prepared.original.path
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
    photoFilesInput.value = "";
    photoSelectionCount.textContent = "No photos selected.";
    await refreshAll();
  });


  repairFiles.addEventListener("change", () => {
    const count = repairFiles.files.length;
    if (count > 20) {
      repairFiles.value = "";
      repairSelectionCount.textContent = "Please select no more than 20 originals at a time.";
      return;
    }
    repairSelectionCount.textContent = count
      ? count + " original" + (count === 1 ? "" : "s") + " selected."
      : "No originals selected.";
  });

  repairOriginalsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const projectId = repairProject.value;
    const files = [...repairFiles.files];
    const message = document.getElementById("repairMessage");
    const progress = document.getElementById("repairProgress");
    const bar = progress.querySelector("span");
    const button = document.getElementById("repairButton");

    if (!projectId || !files.length) return;
    if (files.length > 20) {
      message.textContent = "Please select no more than 20 originals at a time.";
      return;
    }

    const missingByCode = new Map(
      photos
        .filter((photo) => photo.project_id === projectId && !photo.original_path)
        .map((photo) => [photo.photo_code.toLowerCase(), photo])
    );

    progress.hidden = false;
    bar.style.width = "0%";
    button.disabled = true;
    let matched = 0;
    let skipped = 0;

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const code = filenameCode(file.name).toLowerCase();
      const photo = missingByCode.get(code);
      if (!photo) {
        skipped++;
        bar.style.width = Math.round(((index + 1) / files.length) * 100) + "%";
        continue;
      }

      try {
        message.textContent = `Attaching original ${index + 1} of ${files.length}…`;
        const prepared = await api("prepareOriginalRepair", { photo_id: photo.id, original_name: file.name });
        const { error: uploadError } = await client.storage
          .from("cbk-gallery-originals")
          .uploadToSignedUrl(prepared.path, prepared.token, file, {
            contentType: file.type || "application/octet-stream"
          });
        if (uploadError) throw uploadError;

        await api("attachOriginal", { photo_id: photo.id, original_path: prepared.path });
        matched++;
        bar.style.width = Math.round(((index + 1) / files.length) * 100) + "%";
      } catch (error) {
        message.textContent = `Stopped after ${matched} matched originals: ${error.message}`;
        button.disabled = false;
        await refreshAll();
        return;
      }
    }

    message.textContent = `${matched} originals attached${skipped ? `; ${skipped} filename${skipped === 1 ? "" : "s"} did not match a missing photo ID` : ""}.`;
    button.disabled = false;
    repairFiles.value = "";
    repairSelectionCount.textContent = "No originals selected.";
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
      bookings = data.bookings || [];
      bookingsAvailable = data.bookings_available !== false;
      renderStats();
      renderProjectSelect();
      renderProjects();
      renderOrders();
      renderBookings();
    } catch (error) {
      if (!dashboard.hidden) console.error(error);
    }
  }

  function renderStats() {
    document.getElementById("statProjects").textContent = projects.length;
    document.getElementById("statOpen").textContent = projects.filter((p) => p.status === "open").length;
    document.getElementById("statPhotos").textContent = photos.length;
    document.getElementById("statOrders").textContent = orders.filter((o) => o.fulfillment_status === "new").length;
  }

  function renderProjectSelect() {
    const currentUpload = uploadProject.value;
    const currentRepair = repairProject.value;
    const options = '<option value="">Choose project…</option>' + projects.map((p) =>
      `<option value="${p.id}">${escapeHtml(p.title)} — ${p.status}</option>`
    ).join("");
    uploadProject.innerHTML = options;
    repairProject.innerHTML = options;
    if (projects.some((p) => p.id === currentUpload)) uploadProject.value = currentUpload;
    if (projects.some((p) => p.id === currentRepair)) repairProject.value = currentRepair;
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
          <p>${count} photos · ${p.package_size} for $${Number(p.package_price).toFixed(0)} · +$${Number(p.extra_photo_price || 0).toFixed(0)} each extra</p>
        </div>
        <div class="cbk-admin-actions">
          <button class="button" type="button" data-upload="${p.id}">Add Photos</button>
          <button class="button" type="button" data-edit="${p.id}">Edit</button>
          <button class="button" type="button" data-photos="${p.id}">Manage Photos</button>
          <a class="button" href="gallery.html?project=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Preview</a>
          <a class="button" href="qr.html?project=${encodeURIComponent(p.slug)}&label=${encodeURIComponent(p.title)}" target="_blank" rel="noopener">QR Code</a>
          <button class="button" type="button" data-status="${p.id}" data-next="${p.status === "open" ? "closed" : "open"}">${p.status === "open" ? "Close" : "Open"}</button>
          <button class="button cbk-danger" type="button" data-delete="${p.id}">Delete</button>
        </div>
        <div class="cbk-project-photo-panel" id="photo-panel-${p.id}" hidden></div>
      </article>`;
    }).join("");

    projectList.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEditProject(button.dataset.edit)));
    projectList.querySelectorAll("[data-photos]").forEach((button) => button.addEventListener("click", () => toggleProjectPhotos(button.dataset.photos)));

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

  function renderBookings() {
    if (!bookingList) return;
    if (!bookingsAvailable) {
      bookingList.innerHTML = '<div class="cbk-admin-empty">Booking inquiries are currently unavailable. Refresh to retry.</div>';
      return;
    }
    if (!bookings.length) {
      bookingList.innerHTML = '<div class="cbk-admin-empty">No website booking inquiries yet.</div>';
      return;
    }

    bookingList.innerHTML = bookings.map((booking) => {
      const when = new Date(booking.created_at);
      const date = Number.isNaN(when.getTime()) ? "" : when.toLocaleString();
      const contact = booking.email ? '<a href="mailto:' + encodeURIComponent(booking.email) + '">' + escapeHtml(booking.email) + '</a>' : "No email";
      return '<article class="cbk-booking-inquiry">'
        + '<div class="cbk-order-top"><div>'
        + '<span class="cbk-status cbk-status-new">' + escapeHtml(booking.status || "new") + '</span>'
        + '<h3>' + escapeHtml(booking.name || "Customer") + ' · ' + escapeHtml(booking.shoot_type || "Project") + '</h3>'
        + '</div><time>' + escapeHtml(date) + '</time></div>'
        + '<div class="cbk-order-contact"><span>' + contact + '</span>'
        + '<span>' + escapeHtml(booking.phone || "No phone") + '</span>'
        + '<span>' + escapeHtml(booking.preferred_date || "Date TBD") + '</span>'
        + '<span>' + escapeHtml(booking.budget || "Budget TBD") + '</span></div>'
        + '<p class="cbk-booking-note">' + escapeHtml(booking.message || "") + '</p>'
        + '</article>';
    }).join("");
  }

  function orderStage(order) {
    if (order.fulfillment_status === "sent") return "sent";
    if (order.payment_status === "confirmed") return "paid";
    return "new";
  }

  function renderOrders() {
    const visibleOrders = orderFilter === "all" ? orders : orders.filter((o) => orderStage(o) === orderFilter);
    if (!visibleOrders.length) {
      orderList.innerHTML = '<div class="cbk-admin-empty">No orders in this status.</div>';
      return;
    }

    orderList.innerHTML = visibleOrders.map((o) => `
      <article class="cbk-order-card">
        <div class="cbk-order-top">
          <div>
            <span class="cbk-status cbk-status-${orderStage(o)}">${orderStage(o).toUpperCase()}</span>
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
          <button class="button button-dark" data-deliver="${o.id}" type="button">${o.fulfillment_status === "sent" ? "Delivered ✓" : (o.payment_status === "confirmed" ? "Resend Delivery" : "Confirm Payment & Send Photos")}</button>
        </div>
      </article>`).join("");

    orderList.querySelectorAll("[data-deliver]").forEach((button) => button.addEventListener("click", async () => {
      const order = orders.find((item) => item.id === button.dataset.deliver);
      if (!order) return;
      const actionText = order.payment_status === "confirmed" ? "Resend delivery email?" : "Confirm payment and send the purchased photos now?";
      if (!confirm(actionText)) return;
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = order.payment_status === "confirmed" ? "Resending…" : "Confirming & Sending…";
      try {
        await api("confirmAndDeliver", { order_id: order.id });
        await refreshAll();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
        button.textContent = originalText;
      }
    }));
  }


  function openEditProject(projectId) {
    const p = projects.find((item) => item.id === projectId);
    if (!p) return;
    editProjectForm.elements.project_id.value = p.id;
    editProjectForm.elements.title.value = p.title || "";
    editProjectForm.elements.event_date.value = p.event_date || "";
    editProjectForm.elements.description.value = p.description || "";
    editProjectForm.elements.package_size.value = p.package_size;
    editProjectForm.elements.package_price.value = Number(p.package_price).toFixed(2);
    editProjectForm.elements.extra_photo_price.value = Number(p.extra_photo_price || 0).toFixed(2);
    editProjectForm.elements.status.value = p.status;
    editProjectMessage.textContent = "";
    editProjectDialog.showModal();
  }

  editProjectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(editProjectForm);
    editProjectMessage.textContent = "Saving changes…";
    try {
      await api("updateProject", {
        project_id: fd.get("project_id"),
        title: String(fd.get("title") || "").trim(),
        event_date: fd.get("event_date") || null,
        description: String(fd.get("description") || "").trim(),
        package_size: Number(fd.get("package_size")),
        package_price: Number(fd.get("package_price")),
        extra_photo_price: Number(fd.get("extra_photo_price")),
        status: fd.get("status")
      });
      editProjectDialog.close();
      await refreshAll();
    } catch (error) {
      editProjectMessage.textContent = error.message;
    }
  });

  document.getElementById("closeEditProject").addEventListener("click", () => editProjectDialog.close());

  function toggleProjectPhotos(projectId) {
    const panel = document.getElementById("photo-panel-" + projectId);
    if (!panel) return;
    if (!panel.hidden) {
      panel.hidden = true;
      return;
    }

    const projectPhotos = photos.filter((photo) => photo.project_id === projectId);
    if (!projectPhotos.length) {
      panel.innerHTML = '<div class="cbk-admin-empty">No photos in this gallery yet.</div>';
    } else {
      panel.innerHTML = '<div class="cbk-admin-photo-grid">' + projectPhotos.map((photo) => {
        const url = client.storage.from(cfg.bucket).getPublicUrl(photo.storage_path).data.publicUrl;
        const originalStatus = photo.original_path ? "Original ready" : "Original missing";
        return '<article class="cbk-admin-photo"><img src="' + url + '" alt=""><span>' + escapeHtml(photo.photo_code) + '</span><small class="' + (photo.original_path ? 'cbk-original-ready' : 'cbk-original-missing') + '">' + originalStatus + '</small><button class="button cbk-danger" type="button" data-delete-photo="' + photo.id + '">Delete</button></article>';
      }).join("") + '</div>';

      panel.querySelectorAll("[data-delete-photo]").forEach((button) => button.addEventListener("click", async () => {
        const photo = photos.find((item) => item.id === button.dataset.deletePhoto);
        if (!photo || !confirm('Delete photo "' + photo.photo_code + '" from this gallery?')) return;
        try {
          await api("deletePhoto", { photo_id: photo.id });
          await refreshAll();
          const refreshedPanel = document.getElementById("photo-panel-" + projectId);
          if (refreshedPanel) {
            refreshedPanel.hidden = true;
            toggleProjectPhotos(projectId);
          }
        } catch (error) {
          alert(error.message);
        }
      }));
    }
    panel.hidden = false;
  }

  document.querySelectorAll("[data-order-filter]").forEach((button) => button.addEventListener("click", () => {
    orderFilter = button.dataset.orderFilter;
    document.querySelectorAll("[data-order-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    renderOrders();
  }));

  document.getElementById("refreshButton").addEventListener("click", refreshAll);

  function filenameCode(name) {
    return String(name).replace(/\.[^.]+$/, "").trim().replace(/\s+/g, "-").slice(0, 80) || "CBK-PHOTO";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]));
  }

  async function initializeAdmin() {
    try {
      await authApi("securityStatus");
      await openDashboard();
    } catch {
      showLogin();
      await refreshPublicSecurity();
    }
  }

  initializeAdmin();
})();