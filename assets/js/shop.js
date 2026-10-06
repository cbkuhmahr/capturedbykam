(() => {
  const cfg = window.CBK_SUPABASE;
  const client = window.supabase.createClient(cfg.url, cfg.key);
  const grid = document.getElementById("projectGrid");

  const publicUrl = (path) => client.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;

  const formatDate = (value) => {
    if (!value) return "Gallery open";
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
  };

  async function loadProjects() {
    const { data, error } = await client
      .from("cbk_shop_projects")
      .select("id,title,slug,event_date,description,package_size,package_price,cover_path,created_at")
      .eq("status", "open")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      grid.innerHTML = '<div class="cbk-empty">The galleries are temporarily unavailable. Please check back shortly.</div>';
      return;
    }

    if (!data?.length) {
      grid.innerHTML = '<div class="cbk-empty"><strong>No open galleries right now.</strong><span>New event galleries will appear here when they are ready.</span></div>';
      return;
    }

    grid.innerHTML = data.map((project) => {
      const cover = project.cover_path
        ? `<img src="${publicUrl(project.cover_path)}" alt="" loading="lazy" />`
        : '<div class="cbk-project-placeholder">CBK</div>';
      return `
        <a class="cbk-project-card" href="gallery.html?project=${encodeURIComponent(project.slug)}">
          <div class="cbk-project-cover">${cover}</div>
          <div class="cbk-project-copy">
            <span class="cbk-project-date">${formatDate(project.event_date)}</span>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description || "View the gallery and choose your favorites.")}</p>
            <div class="cbk-project-bottom">
              <strong>${project.package_size} photos — $${Number(project.package_price).toFixed(0)}</strong>
              <span>View Photos →</span>
            </div>
          </div>
        </a>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]));
  }

  loadProjects();
})();