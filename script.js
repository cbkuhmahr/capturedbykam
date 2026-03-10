(() => {
  "use strict";

  // If this file loads, enable JS styling mode.
  document.documentElement.classList.add("js");

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const pagePanels = $$(".pagePanel");
  const navButtons = $$(".navBtn");

  const pageCurrent = $("#pageCurrent");
  const pageTotal = $("#pageTotal");
  const pagePrev = $("#pagePrev");
  const pageNext = $("#pageNext");

  const enterBtn = $("#enterBtn");

  const serviceCtaButtons = $$(".serviceCta");
  const serviceSelect = $("#serviceSelect");
  const emailInput = $("#emailInput");
  const replyToField = $("#replyToField");

  const galleryMainImage = $("#galleryMainImage");
  const galleryTitle = $("#galleryTitle");
  const galleryCaption = $("#galleryCaption");
  const galleryPrev = $("#galleryPrev");
  const galleryNext = $("#galleryNext");
  const thumbGrid = $("#thumbGrid");
  const galleryFrame = $("#galleryFrame");
  const pageViewport = $("#pageViewport");

  const PAGE_IDS = pagePanels
    .map((p) => String(p.dataset.page || "").trim())
    .filter(Boolean);

  let currentPageIndex = 0;

  if (pageTotal) pageTotal.textContent = String(PAGE_IDS.length).padStart(2, "0");

  const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

  const pageIdToIndex = (pageId) => {
    const idx = PAGE_IDS.indexOf(pageId);
    return idx >= 0 ? idx : 0;
  };

  const indexToPageId = (index) => PAGE_IDS[clamp(index, 0, PAGE_IDS.length - 1)];

  const setActiveNav = (pageId) => {
    navButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.page === pageId));
  };

  const setActivePanel = (pageId) => {
    pagePanels.forEach((panel) => {
      const isActive = panel.dataset.page === pageId;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  };

  const setPageCounter = (index) => {
    if (!pageCurrent) return;
    pageCurrent.textContent = String(index + 1).padStart(2, "0");
  };

  const updateHash = (pageId, mode = "push") => {
    const next = `#${pageId}`;
    if (location.hash === next) return;
    if (mode === "replace") history.replaceState(null, "", next);
    else history.pushState(null, "", next);
  };

  const showPageById = (pageId, { updateUrl = true, urlMode = "push" } = {}) => {
    currentPageIndex = pageIdToIndex(pageId);
    setActivePanel(pageId);
    setActiveNav(pageId);
    setPageCounter(currentPageIndex);
    if (updateUrl) updateHash(pageId, urlMode);
  };

  const showPageByIndex = (index, opts) => showPageById(indexToPageId(index), opts);

  const svgPlaceholderDataUrl = (label) => {
    const safe = String(label ?? "Image").slice(0, 40);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f7f3eb"/>
            <stop offset="1" stop-color="#eee8dc"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
              font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              font-size="42" fill="rgba(37,33,27,0.55)">
          ${safe}
        </text>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const wireImageFallback = (img, label) => {
    if (!img) return;
    img.addEventListener(
      "error",
      () => {
        img.src = svgPlaceholderDataUrl(label || img.alt || "Missing image");
      },
      { once: true }
    );
  };

  // Update if your folder changes
  const IMAGE_FILES = [
    "images.01.JPG",
    "images.02.JPG",
    "images.03.JPG",
    "images.05.JPG",
    "images.06.JPG",
    "images.07.JPG",
    "images.08.JPG",
    "images.09.JPG",
    "images.010.JPG",
    "images.011.JPG",
    "images.012.JPG",
    "images.013.JPG",
    "images.014.JPG",
  ];

  const galleryItems = IMAGE_FILES.map((name, idx) => ({
    src: `images/${name}`,
    title: `Gallery Image ${String(idx + 1).padStart(2, "0")}`,
    caption: "Swipe, click thumbnails, or use arrows to browse.",
  }));

  let currentGalleryIndex = 0;

  const buildThumbs = () => {
    if (!thumbGrid) return;
    thumbGrid.innerHTML = "";
    const frag = document.createDocumentFragment();

    galleryItems.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `thumb${i === 0 ? " is-active" : ""}`;
      btn.dataset.index = String(i);
      btn.setAttribute("aria-label", `Open ${item.title}`);

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = `${item.title} thumbnail`;
      img.loading = "lazy";
      img.decoding = "async";
      wireImageFallback(img, item.title);

      btn.appendChild(img);
      btn.addEventListener("click", () => showGalleryItem(i));
      frag.appendChild(btn);
    });

    thumbGrid.appendChild(frag);
  };

  const setActiveThumb = (index) => {
    if (!thumbGrid) return;
    $$(".thumb", thumbGrid).forEach((t, i) => t.classList.toggle("is-active", i === index));
  };

  const preloadImage = (src) => {
    const img = new Image();
    img.src = src;
  };

  const showGalleryItem = (index) => {
    if (!galleryMainImage || !galleryTitle || !galleryCaption) return;

    currentGalleryIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[currentGalleryIndex];

    galleryMainImage.src = item.src;
    galleryMainImage.alt = item.title;
    galleryTitle.textContent = item.title;
    galleryCaption.textContent = item.caption;

    wireImageFallback(galleryMainImage, item.title);
    setActiveThumb(currentGalleryIndex);
    preloadImage(galleryItems[(currentGalleryIndex + 1) % galleryItems.length].src);
  };

  // NAV: prevent default anchor jump; we control the page swap.
  navButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showPageById(btn.dataset.page || "home", { urlMode: "push" });
    });
  });

  // CONTACT anchor or any element with data-page
  $$("[data-page]:not(.navBtn)").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.tagName === "A") e.preventDefault();
      showPageById(el.dataset.page || "home", { urlMode: "push" });
    });
  });

  pagePrev?.addEventListener("click", () => showPageByIndex(currentPageIndex - 1, { urlMode: "push" }));
  pageNext?.addEventListener("click", () => showPageByIndex(currentPageIndex + 1, { urlMode: "push" }));

  enterBtn?.addEventListener("click", () => showPageById("about", { urlMode: "push" }));

  serviceCtaButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const service = btn.dataset.service || "";
      if (serviceSelect) serviceSelect.value = service;
      showPageById("book", { urlMode: "push" });
    });
  });

  if (emailInput && replyToField) {
    emailInput.addEventListener("input", () => {
      replyToField.value = emailInput.value.trim();
    });
  }

  galleryPrev?.addEventListener("click", () => showGalleryItem(currentGalleryIndex - 1));
  galleryNext?.addEventListener("click", () => showGalleryItem(currentGalleryIndex + 1));

  // Touch: pages vs gallery
  let touchStartX = 0;
  let touchStartTarget = null;

  pageViewport?.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartTarget = event.target;
  }, { passive: true });

  pageViewport?.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const distance = touchEndX - touchStartX;
    if (Math.abs(distance) < 40) return;

    const pageId = indexToPageId(currentPageIndex);
    const startedInGallery =
      pageId === "gallery" &&
      (galleryFrame?.contains(touchStartTarget) || thumbGrid?.contains(touchStartTarget));

    if (startedInGallery) {
      if (distance < 0) showGalleryItem(currentGalleryIndex + 1);
      if (distance > 0) showGalleryItem(currentGalleryIndex - 1);
      return;
    }

    if (distance < 0) showPageByIndex(currentPageIndex + 1, { urlMode: "push" });
    if (distance > 0) showPageByIndex(currentPageIndex - 1, { urlMode: "push" });
  }, { passive: true });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") showPageByIndex(currentPageIndex + 1, { urlMode: "push" });
    if (event.key === "ArrowLeft") showPageByIndex(currentPageIndex - 1, { urlMode: "push" });

    const pageId = indexToPageId(currentPageIndex);
    if (pageId === "gallery" && event.key === "ArrowUp") showGalleryItem(currentGalleryIndex - 1);
    if (pageId === "gallery" && event.key === "ArrowDown") showGalleryItem(currentGalleryIndex + 1);
  });

  const initialPageFromHash = () => {
    const hash = (location.hash || "").replace("#", "").trim();
    return PAGE_IDS.includes(hash) ? hash : "home";
  };

  window.addEventListener("hashchange", () => {
    showPageById(initialPageFromHash(), { updateUrl: false });
  });

  // Boot
  buildThumbs();
  showGalleryItem(0);
  showPageById(initialPageFromHash(), { updateUrl: true, urlMode: "replace" });
})();