(() => {
  const grid = document.getElementById("featuredWorkGrid");
  if (!grid || !window.CBK_SUPABASE || !window.supabase) return;
  const cfg = window.CBK_SUPABASE;
  const client = window.supabase.createClient(cfg.url, cfg.key);
  const publicUrl = (path) => client.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;
  const escapeHtml = (v) => String(v || "").replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
  async function load() {
    const { data, error } = await client
      .from("cbk_shop_projects")
      .select("title,slug,cover_path,event_date")
      .eq("status","open")
      .order("event_date",{ascending:false,nullsFirst:false})
      .limit(4);
    if (error || !data?.length) {
      grid.innerHTML = '<div class="studio-work-empty">Selected work is being refreshed. Current galleries remain available in the Photo Shop.</div>';
      return;
    }
    grid.innerHTML = data.map((p) => {
      const image = p.cover_path
        ? '<img src="'+publicUrl(p.cover_path)+'" alt="" loading="lazy">'
        : '<div style="height:100%;display:grid;place-items:center;background:#d9d3ca;font-weight:800">CBK</div>';
      return '<a class="studio-work-card" href="gallery.html?project='+encodeURIComponent(p.slug)+'">'+image+
        '<div class="studio-work-overlay"><span>Selected Work</span><strong>'+escapeHtml(p.title)+'</strong></div></a>';
    }).join("");
  }
  load();
})();