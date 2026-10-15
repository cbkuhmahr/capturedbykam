(() => {
  const cfg = window.CBK_SUPABASE;
  const client = window.supabase.createClient(cfg.url, cfg.key);
  const grid = document.getElementById("projectGrid");
  const search = document.getElementById("eventSearch");
  const refresh = document.getElementById("refreshEvents");
  const status = document.getElementById("galleryFeedStatus");
  let projects = [];
  let loading = false;
  let lastRefresh = null;

  function updateStatus(message) {
    if (status) status.textContent = message;
  }

  const publicUrl = (path) => client.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;

  const formatDate = (value) => {
    if (!value) return "Gallery open";
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
  };

  async function loadProjects() {
    if (loading) return;
    loading = true;
    if (refresh) refresh.disabled = true;
    updateStatus("Checking for new event photos…");
    try {
    const { data, error } = await client
      .from("cbk_shop_projects")
      .select("id,title,slug,event_date,description,package_size,package_price,extra_photo_price,cover_path,created_at")
      .eq("status", "open")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      updateStatus("Cannot reach the galleries. Try Refresh.");
      grid.innerHTML = '<div class="cbk-empty">The galleries are temporarily unavailable. Please check back shortly.</div>';
      return;
    }

    if (!data?.length) {
      projects = [];
      updateStatus("No events currently published.");
      grid.innerHTML = '<div class="cbk-empty"><strong>No open galleries right now.</strong><span>New event galleries will appear here when they are ready.</span></div>';
      return;
    }

    projects = data;
    lastRefresh = new Date();
    renderProjects();
    } finally {
      loading = false;
      if (refresh) refresh.disabled = false;
    }
  }

  function renderProjects() {
    const term = (search?.value || "").trim().toLocaleLowerCase();
    const filtered = projects.filter(p => [p.title, p.description, formatDate(p.event_date)].some(v => String(v || "").toLocaleLowerCase().includes(term)));
    updateStatus(filtered.length + " of " + projects.length + " galleries shown · Updated " + (lastRefresh ? lastRefresh.toLocaleTimeString("en-US", {hour:"numeric",minute:"2-digit"}) : "just now") + ". Checks for new galleries every 60 seconds.");
    if (!filtered.length) {
      grid.innerHTML = '<div class="cbk-empty"><strong>No matching event.</strong><span>Try another team, event or date.</span></div>';
      return;
    }
    grid.innerHTML = filtered.map((project) => {
      const cover = project.cover_path
        ? `<img src="${publicUrl(project.cover_path)}" alt="" loading="lazy" />`
        : '<div class="cbk-project-placeholder">CBK</div>';
      return `
        <article class="cbk-project-card">
          <a class="cbk-project-cover" href="gallery.html?project=${encodeURIComponent(project.slug)}" aria-label="Shop ${escapeHtml(project.title)}">${cover}</a>
          <div class="cbk-project-copy">
            <span class="cbk-project-date">${formatDate(project.event_date)}</span>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description || "View the gallery and choose your favorites.")}</p>
            <div class="cbk-project-bottom">
              <strong>$${(Number(project.package_price) / Math.max(Number(project.package_size) - 1, 1)).toFixed(2)} each · ${project.package_size} for $${Number(project.package_price).toFixed(0)} · +$${Number(project.extra_photo_price || 0).toFixed(0)} each after ${project.package_size}</strong>
              <span class="cbk-gallery-links"><a href="gallery.html?project=${encodeURIComponent(project.slug)}">View Photos →</a><a href="qr.html?project=${encodeURIComponent(project.slug)}&label=${encodeURIComponent(project.title)}" aria-label="Open printable QR code for ${escapeHtml(project.title)}">Event QR ↗</a><button type="button" class="cbk-native-share" data-share-gallery="${escapeHtml(project.slug)}">Share in Messages</button></span>
            </div>
          </div>
        </article>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]));
  }

  grid?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-share-gallery]");
    if (!button) return;
    const project = projects.find(p => p.slug === button.dataset.shareGallery);
    if (!project) return;
    const title = "Capturedby_Kam · " + project.title;
    const url = new URL("gallery.html?project=" + encodeURIComponent(project.slug), location.href).href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: "Check out photos from " + project.title + " on Capturedby_Kam.", url });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      updateStatus("Gallery link copied. Paste it into Apple Messages.");
    } catch {
      updateStatus("Open this gallery in Safari on your iPhone to use the Messages share sheet.");
    }
  });

  search?.addEventListener("input", renderProjects);
  refresh?.addEventListener("click", loadProjects);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadProjects(); });
  window.setInterval(() => { if (!document.hidden) loadProjects(); }, 60000);
  loadProjects();
})();