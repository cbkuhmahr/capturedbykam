"use strict";

const BRAND = {
  email: "kam@capturedbykam.com",
  instagram: "https://www.instagram.com/CapturedBy_Kam/",
  youtube: "https://www.youtube.com/@YOUR_HANDLE",
};

const GALLERY_IMAGES = [];

const root = document.documentElement;

const headerEl = document.getElementById("siteHeader");
const footerEl = document.getElementById("siteFooter");
const bookEl = document.getElementById("book");

const navBtns = Array.from(document.querySelectorAll(".navBtn"));
const logo = document.getElementById("logo");
const enterBtn = document.getElementById("enterBtn");

const igTop = document.getElementById("igTop");
const ytTop = document.getElementById("ytTop");
const contactFooter = document.getElementById("contactFooter");
const igFooter = document.getElementById("igFooter");
const ytFooter = document.getElementById("ytFooter");

const flipPrevBtn = document.querySelector(".flipPrev");
const flipNextBtn = document.querySelector(".flipNext");

const bookingForm = document.getElementById("bookingForm");
const bookingSubmitBtn = document.getElementById("bookingSubmitBtn");
const nameInput = document.getElementById("nameInput");
const serviceSelect = document.getElementById("serviceSelect");
const dateInput = document.getElementById("dateInput");
const timeInput = document.getElementById("timeInput");
const notesInput = document.getElementById("notesInput");

const bookingModal = document.getElementById("bookingModal");
const bookingText = document.getElementById("bookingText");
const openEmailBtn = document.getElementById("openEmailBtn");
const copyRequestBtn = document.getElementById("copyRequestBtn");
const copyStatus = document.getElementById("copyStatus");

const galleryStatus = document.getElementById("galleryStatus");

if (igTop) igTop.href = BRAND.instagram;
if (ytTop) ytTop.href = BRAND.youtube;
if (contactFooter) contactFooter.href = `mailto:${BRAND.email}`;
if (igFooter) igFooter.href = BRAND.instagram;
if (ytFooter) ytFooter.href = BRAND.youtube;

const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function isMobile() {
  return window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
}

function viewportHeight() {
  return window.visualViewport?.height || window.innerHeight;
}

function updateBookMaxH() {
  if (isMobile()) {
    root.style.removeProperty("--bookMaxHpx");
    return;
  }

  const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
  const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;
  const padding = 40;

  const maxH = Math.max(520, viewportHeight() - headerH - footerH - padding);
  root.style.setProperty("--bookMaxHpx", `${maxH}px`);
}

window.addEventListener("resize", updateBookMaxH);
window.addEventListener("orientationchange", updateBookMaxH);
window.visualViewport?.addEventListener("resize", updateBookMaxH);

let pages = Array.from(document.querySelectorAll(".page"));
let currentIndex = 0;
let turnToken = 0;

function hydratePages() {
  pages = Array.from(document.querySelectorAll(".page"));
  pages.forEach((p, i) => {
    p.dataset.index = String(i);
  });
}

function clampIndex(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(pages.length - 1, x));
}

function navTargetForIndex(index) {
  return index >= 4 ? 4 : index;
}

function renderMobileSections() {
  if (!isMobile()) {
    pages.forEach((page) => page.classList.remove("is-mobile-active"));
    return;
  }

  pages.forEach((page, i) => {
    page.classList.toggle("is-mobile-active", i === currentIndex);
  });
}

function render() {
  const total = pages.length;
  const mobile = isMobile();

  pages.forEach((page, i) => {
    if (mobile) {
      page.style.transform = "none";
      page.style.zIndex = "1";
      return;
    }

    const turned = i < currentIndex;
    page.style.transform = turned ? "rotateY(-180deg)" : "rotateY(0deg)";
    page.style.zIndex = String(turned ? i : total - i);
  });

  const navTarget = navTargetForIndex(currentIndex);
  navBtns.forEach((btn) => {
    const isActive = Number(btn.dataset.target) === navTarget;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-current", isActive ? "page" : "false");
  });

  if (flipPrevBtn) {
    flipPrevBtn.disabled = mobile || currentIndex <= 0;
    flipPrevBtn.style.opacity = flipPrevBtn.disabled ? "0.35" : "1";
  }

  if (flipNextBtn) {
    flipNextBtn.disabled = mobile || currentIndex >= total - 1;
    flipNextBtn.style.opacity = flipNextBtn.disabled ? "0.35" : "1";
  }

  renderMobileSections();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function turnTo(target) {
  target = clampIndex(target);

  turnToken += 1;
  const myToken = turnToken;

  if (isMobile() || prefersReducedMotion) {
    currentIndex = target;
    render();
    return;
  }

  if (target === currentIndex) return;

  const distance = Math.abs(target - currentIndex);
  const dir = target > currentIndex ? 1 : -1;

  const FAST_MS = 1500;
  const FINAL_MS = 2200;
  const fastDelay = 760;
  const finalDelay = 1180;

  root.style.setProperty("--turnDur", distance >= 2 ? `${FAST_MS}ms` : `${FINAL_MS}ms`);

  while (currentIndex !== target) {
    if (myToken !== turnToken) return;

    const next = currentIndex + dir;
    const isFinalStep = next === target;

    root.style.setProperty("--turnDur", isFinalStep ? `${FINAL_MS}ms` : `${FAST_MS}ms`);
    currentIndex = next;
    render();

    await sleep(isFinalStep ? finalDelay : fastDelay);
  }
}

function nextPage() {
  void turnTo(currentIndex + 1);
}

function prevPage() {
  void turnTo(currentIndex - 1);
}

function shouldIgnoreTap(target) {
  return !!target.closest("a,button,input,select,textarea,label");
}

bookEl?.addEventListener("click", (e) => {
  if (isMobile()) return;
  if (shouldIgnoreTap(e.target)) return;

  const rect = bookEl.getBoundingClientRect();
  const x = e.clientX - rect.left;

  if (x > rect.width * 0.85) nextPage();
  else if (x < rect.width * 0.15) prevPage();
});

let sx = 0;
let sy = 0;
let tracking = false;

bookEl?.addEventListener(
  "touchstart",
  (e) => {
    if (isMobile()) return;
    if (e.touches.length !== 1) return;
    if (shouldIgnoreTap(e.target)) return;

    tracking = true;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  },
  { passive: true }
);

bookEl?.addEventListener(
  "touchend",
  (e) => {
    if (isMobile()) return;
    if (!tracking) return;
    tracking = false;

    if (e.changedTouches.length !== 1) return;

    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) nextPage();
      else prevPage();
    }
  },
  { passive: true }
);

flipPrevBtn?.addEventListener("click", prevPage);
flipNextBtn?.addEventListener("click", nextPage);

navBtns.forEach((btn) => {
  btn.addEventListener("click", () => void turnTo(Number(btn.dataset.target)));
});

logo?.addEventListener("click", () => void turnTo(0));
enterBtn?.addEventListener("click", () => void turnTo(1));

document.addEventListener("keydown", (e) => {
  if (shouldIgnoreTap(document.activeElement)) return;

  if (e.key === "ArrowRight" && !isMobile()) nextPage();
  if (e.key === "ArrowLeft" && !isMobile()) prevPage();
  if (e.key === "Home") void turnTo(0);
  if (e.key === "End") void turnTo(pages.length - 1);
});

function setMinDateToday() {
  if (!dateInput) return;

  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  dateInput.min = `${yyyy}-${mm}-${dd}`;
}

function buildRequestText({ name, service, date, time, notes }) {
  return [
    `Name: ${name}`,
    `Service: ${service}`,
    `Preferred Date: ${date}`,
    `Preferred Time: ${time}`,
    `Notes: ${notes || "(none)"}`,
    "",
    "— Sent from capturedbykam.com",
  ].join("\n");
}

function buildMailto({ service, bodyText }) {
  const subject = encodeURIComponent(`Booking Request — ${service}`);
  const body = encodeURIComponent(bodyText);
  return `mailto:${BRAND.email}?subject=${subject}&body=${body}`;
}

function openBookingModal({ bodyText, mailtoUrl }) {
  if (!bookingModal || !bookingText || !openEmailBtn || !copyStatus) return;

  bookingText.value = bodyText;
  openEmailBtn.href = mailtoUrl;
  copyStatus.textContent = "";
  bookingModal.hidden = false;
  bookingText.focus();
  bookingText.setSelectionRange(0, 0);
}

function closeBookingModal() {
  if (!bookingModal) return;
  bookingModal.hidden = true;
}

async function copyToClipboard(text) {
  if (!navigator.clipboard?.writeText) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

document.querySelectorAll("[data-close='1']").forEach((el) => {
  el.addEventListener("click", closeBookingModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && bookingModal && !bookingModal.hidden) {
    closeBookingModal();
  }
});

copyRequestBtn?.addEventListener("click", async () => {
  const text = bookingText?.value || "";
  if (!text) return;

  try {
    const ok = await copyToClipboard(text);
    copyStatus.textContent = ok ? "Copied ✅" : "Copy not supported on this device.";
    if (!ok) bookingText?.select();
  } catch {
    copyStatus.textContent = "Copy failed — tap and hold to select, then copy.";
    bookingText?.select();
  }
});

bookingForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!bookingForm.reportValidity()) return;

  const name = nameInput?.value?.trim() || "";
  const service = serviceSelect?.value?.trim() || "";
  const date = dateInput?.value || "";
  const time = timeInput?.value || "";
  const notes = notesInput?.value?.trim() || "";

  const bodyText = buildRequestText({ name, service, date, time, notes });
  const mailtoUrl = buildMailto({ service, bodyText });

  openBookingModal({ bodyText, mailtoUrl });
  bookingSubmitBtn?.blur();
});

document.querySelectorAll(".serviceCta").forEach((btn) => {
  btn.addEventListener("click", () => {
    const service = btn.getAttribute("data-service");
    if (service && serviceSelect) serviceSelect.value = service;
    void turnTo(3);
    setTimeout(() => nameInput?.focus(), prefersReducedMotion ? 0 : 300);
  });
});

function createGalleryPage(src, index) {
  const page = document.createElement("div");
  page.className = "page";
  page.dataset.index = String(index);

  const front = document.createElement("div");
  front.className = "face front";

  const body = document.createElement("div");
  body.className = "pageBody";

  const h = document.createElement("div");
  h.className = "h";
  h.textContent = "GALLERY";

  const wrap = document.createElement("div");
  wrap.className = "photoWrap";

  const img = document.createElement("img");
  img.className = "photo";
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = "Gallery photo";
  img.src = src;

  img.addEventListener("error", () => {
    wrap.innerHTML = "";
    const msg = document.createElement("div");
    msg.className = "photoError";
    msg.textContent = "Couldn’t load this image. Check the URL/path.";
    wrap.appendChild(msg);
  });

  wrap.appendChild(img);
  body.appendChild(h);
  body.appendChild(wrap);
  front.appendChild(body);

  const back = document.createElement("div");
  back.className = "face back";

  page.appendChild(front);
  page.appendChild(back);

  return page;
}

function initGallery() {
  if (!galleryStatus) return;

  if (!Array.isArray(GALLERY_IMAGES) || GALLERY_IMAGES.length === 0) {
    galleryStatus.textContent = "No gallery images yet.";
    return;
  }

  galleryStatus.textContent = `Loaded ${GALLERY_IMAGES.length} photo${GALLERY_IMAGES.length === 1 ? "" : "s"}.`;

  const startIndex = pages.length;

  for (let i = 0; i < GALLERY_IMAGES.length; i += 1) {
    const page = createGalleryPage(GALLERY_IMAGES[i], startIndex + i);
    bookEl?.appendChild(page);
  }

  hydratePages();
  render();
}

updateBookMaxH();
setMinDateToday();
hydratePages();
initGallery();
render();