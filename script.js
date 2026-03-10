(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const header = $(".siteHeader");
  const navToggle = $(".navToggle");
  const nav = $("#siteNav");
  const navLinks = $$(".navLink, .siteNav .navLink");
  const yearEl = $("#year");

  const serviceSelect = $("#serviceSelect");
  const bookButtons = $$(".js-book");

  const emailInput = $("#emailInput");
  const replyToField = $("#replyToField");

  const galleryGrid = $("#galleryGrid");
  const galleryLinks = galleryGrid ? $$("a.galleryItem", galleryGrid) : [];

  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  const lightboxMeta = $("#lightboxMeta");
  const lightboxPrev = $(".lightboxPrev");
  const lightboxNext = $(".lightboxNext");
  const lightboxClosers = lightbox ? $$("[data-close='1']", lightbox) : [];

  let currentIndex = 0;

  // Footer year
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile menu
  function setMenu(open) {
    if (!header || !navToggle || !nav) return;
    header.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  navToggle?.addEventListener("click", () => {
    const open = !header.classList.contains("is-open");
    setMenu(open);
  });

  // Close menu after clicking a nav link
  $$("#siteNav a").forEach((a) => {
    a.addEventListener("click", () => setMenu(false));
  });

  // Service quick-book
  bookButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const service = btn.getAttribute("data-service") || "";
      if (serviceSelect) serviceSelect.value = service;
      const contact = $("#contact");
      contact?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // FormSubmit reply-to
  if (emailInput && replyToField) {
    emailInput.addEventListener("input", () => {
      replyToField.value = emailInput.value.trim();
    });
  }

  // Active nav link on scroll
  const sections = ["home", "about", "services", "gallery", "contact", "picture-day"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const linkByHash = new Map(
    $$("#siteNav a").map((a) => [a.getAttribute("href"), a])
  );

  function setActiveHash(hash) {
    linkByHash.forEach((a) => a.classList.remove("is-active"));
    const el = linkByHash.get(hash);
    if (el) el.classList.add("is-active");
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio - a.intersectionRatio))[0];

        if (!visible) return;
        setActiveHash(`#${visible.target.id}`);
      },
      { root: null, threshold: [0.25, 0.5, 0.75] }
    );

    sections.forEach((s) => io.observe(s));
  }

  // Lightbox helpers
  function openLightbox(index) {
    if (!lightbox || !lightboxImg || !galleryLinks.length) return;

    currentIndex = (index + galleryLinks.length) % galleryLinks.length;
    const a = galleryLinks[currentIndex];
    const img = $("img", a);

    lightboxImg.src = a.getAttribute("href");
    lightboxImg.alt = img?.alt || "Gallery image";
    lightboxMeta.textContent = img?.alt || "";

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function nextImage(dir) {
    openLightbox(currentIndex + dir);
  }

  // Enable lightbox only if elements exist
  if (lightbox && lightboxImg && galleryLinks.length) {
    galleryLinks.forEach((a, idx) => {
      a.addEventListener("click", (e) => {
        // Prevent new-tab open; lightbox instead
        e.preventDefault();
        openLightbox(idx);
      });
    });

    lightboxClosers.forEach((el) => el.addEventListener("click", closeLightbox));
    lightboxPrev?.addEventListener("click", () => nextImage(-1));
    lightboxNext?.addEventListener("click", () => nextImage(1));

    window.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") nextImage(-1);
      if (e.key === "ArrowRight") nextImage(1);
    });
  }

  // Ensure initial active nav matches hash
  if (location.hash) setActiveHash(location.hash);
})();
