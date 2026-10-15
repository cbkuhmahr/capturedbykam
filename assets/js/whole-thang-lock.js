(() => {
  "use strict";
  // Lock private pick intelligence on a sustained app switch / tab background.
  // This is an additional client safeguard; Supabase enforces server-side idle limits.
  const BACKGROUND_MS = 60 * 1000;
  const HIDDEN_KEY = "cbk_picks_hidden_at";
  let hiddenAt = 0;
  let locking = false;

  async function lockAndReturn() {
    if (locking) return;
    locking = true;
    document.querySelectorAll("button, input, textarea, select").forEach(el => { el.disabled = true; });
    const app = document.getElementById("app");
    if (app) app.replaceChildren(Object.assign(document.createElement("div"), {
      className: "note", textContent: "Your private dashboard is locked. Redirecting to secure sign-in…"
    }));
    try {
      await fetch("/api/admin-auth", {
        method: "POST",
        credentials: "same-origin",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ action: "logout" }),
        cache: "no-store"
      });
    } catch {}
    try { sessionStorage.removeItem(HIDDEN_KEY); } catch {}
    window.location.replace("/admin.html");
  }

  function rememberHidden() {
    hiddenAt = Date.now();
    try { sessionStorage.setItem(HIDDEN_KEY, String(hiddenAt)); } catch {}
  }
  function checkReturn() {
    let previous = hiddenAt;
    try { previous = Math.max(previous, Number(sessionStorage.getItem(HIDDEN_KEY) || 0)); } catch {}
    if (previous > 0 && Date.now() - previous >= BACKGROUND_MS) {
      lockAndReturn();
    } else {
      hiddenAt = 0;
      try { sessionStorage.removeItem(HIDDEN_KEY); } catch {}
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) rememberHidden();
    else checkReturn();
  });
  window.addEventListener("pagehide", rememberHidden);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) checkReturn();
  });
})();
