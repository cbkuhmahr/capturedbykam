(() => {
  "use strict";
  // Screen Wake Lock only works while this page is visible. It cannot provide
  // background execution or bypass the private dashboard's sign-in timeout.
  const KEY = "wt-keep-screen-awake";
  let keepLiveAwake = true;
  try { keepLiveAwake = sessionStorage.getItem(KEY) !== "off"; } catch (_) {}
  let radioLoaded = false;
  let sentinel = null;
  let pending = null;
  let unavailable = false;
  const supported = !!(navigator.wakeLock && typeof navigator.wakeLock.request === "function");

  function wanted() {
    return !document.hidden && (radioLoaded || (keepLiveAwake && document.body.dataset.wtView === "live"));
  }
  function updateButtons() {
    document.querySelectorAll("[data-awake-toggle]").forEach(button => {
      button.disabled = !supported;
      button.setAttribute("aria-pressed", String(keepLiveAwake));
      button.textContent = !supported ? "Keep awake unavailable" :
        unavailable && keepLiveAwake ? "Keep awake unavailable" :
        keepLiveAwake ? "Keep awake · On" : "Keep awake · Off";
      button.title = !supported ? "This browser does not support keeping the screen on." :
        unavailable ? "iOS did not grant a screen wake lock. Check Low Power Mode or try again." :
        "Keep the screen on while the Live page is open. Does not run in the background.";
    });
  }
  async function reconcile() {
    if (!supported || !wanted()) {
      if (sentinel) {
        const old = sentinel;
        sentinel = null;
        try { await old.release(); } catch (_) {}
      }
      updateButtons();
      return;
    }
    if (sentinel && !sentinel.released) { updateButtons(); return; }
    if (pending) return;
    pending = navigator.wakeLock.request("screen");
    try {
      const acquired = await pending;
      if (!wanted()) {
        try { await acquired.release(); } catch (_) {}
        return;
      }
      sentinel = acquired;
      unavailable = false;
      acquired.addEventListener("release", () => {
        if (sentinel === acquired) {
          sentinel = null;
          updateButtons();
        }
      });
    } catch (_) {
      unavailable = true;
    } finally {
      pending = null;
      updateButtons();
    }
  }
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-awake-toggle]");
    if (!button) return;
    keepLiveAwake = !keepLiveAwake;
    unavailable = false;
    try { sessionStorage.setItem(KEY, keepLiveAwake ? "on" : "off"); } catch (_) {}
    updateButtons();
    void reconcile();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) unavailable = false;
    void reconcile();
  });
  window.addEventListener("pageshow", () => { void reconcile(); });
  new MutationObserver(() => { void reconcile(); }).observe(document.body, {
    attributes: true, attributeFilter: ["data-wt-view"]
  });
  window.WTStayAwake = {
    setRadio(loaded) { radioLoaded = !!loaded; void reconcile(); },
    sync: updateButtons
  };
  updateButtons();
  void reconcile();
})();
