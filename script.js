const BRAND = {
  email: "kam@capturedbykam.com",
  instagram: "https://www.instagram.com/CapturedBy_Kam/",
  youtube: "https://www.youtube.com/@YOUR_HANDLE" // <- change
};

const root = document.documentElement;

const headerEl = document.getElementById("siteHeader");
const footerEl = document.getElementById("siteFooter");

const nav = document.querySelector(".left-nav");
const navBtns = Array.from(document.querySelectorAll(".navBtn"));
const logo = document.getElementById("logo");
const enterBtn = document.getElementById("enterBtn");

const igTop = document.getElementById("igTop");
const ytTop = document.getElementById("ytTop");
const contactFooter = document.getElementById("contactFooter");
const igFooter = document.getElementById("igFooter");
const ytFooter = document.getElementById("ytFooter");

igTop.href = BRAND.instagram;
ytTop.href = BRAND.youtube;
contactFooter.href = `mailto:${BRAND.email}`;
igFooter.href = BRAND.instagram;
ytFooter.href = BRAND.youtube;

const bookEl = document.getElementById("book");

const flipPrevBtn = document.querySelector(".flipPrev");
const flipNextBtn = document.querySelector(".flipNext");

let pages = Array.from(document.querySelectorAll(".page"));

const prefersReducedMotion = window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function isMobile(){
  return window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
}

/* ===== Layout: set dynamic book max height on mobile ===== */
function updateBookMaxH(){
  if(!isMobile()) {
    root.style.removeProperty("--bookMaxHpx");
    return;
  }

  const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
  const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;

  // Small breathing room
  const padding = 28;

  // Available height = viewport - header - footer - padding
  const maxH = Math.max(320, window.innerHeight - headerH - footerH - padding);
  root.style.setProperty("--bookMaxHpx", `${maxH}px`);
}

window.addEventListener("resize", updateBookMaxH);
window.addEventListener("orientationchange", updateBookMaxH);

/* ===== Mobile nav fades ===== */
function updateNavFades(){
  if(!nav) return;
  const maxScroll = Math.max(0, nav.scrollWidth - nav.clientWidth);
  const x = nav.scrollLeft;

  nav.classList.toggle("at-start", x <= 2);
  nav.classList.toggle("at-end", x >= maxScroll - 2);
  if(maxScroll <= 2) nav.classList.add("at-start", "at-end");
}

let navRAF = 0;
function requestNavUpdate(){
  if(navRAF) return;
  navRAF = requestAnimationFrame(() => {
    navRAF = 0;
    updateNavFades();
  });
}

nav?.addEventListener("scroll", requestNavUpdate, { passive:true });

/* ===== Page turning ===== */
let currentIndex = 0;
let turnToken = 0;

function clampIndex(n){
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(pages.length - 1, x));
}

function render(){
  const total = pages.length;

  pages.forEach((page, i) => {
    const turned = i < currentIndex;
    page.style.transform = turned ? "rotateY(-180deg)" : "rotateY(0deg)";
    page.style.zIndex = String(turned ? i : (total - i));
  });

  navBtns.forEach(b => {
    const isActive = Number(b.dataset.target) === currentIndex;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-current", isActive ? "page" : "false");
  });

  flipPrevBtn.disabled = currentIndex <= 0;
  flipNextBtn.disabled = currentIndex >= total - 1;
  flipPrevBtn.style.opacity = flipPrevBtn.disabled ? "0.35" : "1";
  flipNextBtn.style.opacity = flipNextBtn.disabled ? "0.35" : "1";

  requestNavUpdate();
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function turnTo(target){
  target = clampIndex(target);

  turnToken++;
  const myToken = turnToken;

  if (prefersReducedMotion){
    currentIndex = target;
    render();
    return;
  }
  if (target === currentIndex) return;

  const distance = Math.abs(target - currentIndex);
  const dir = target > currentIndex ? 1 : -1;

  // Premium pacing
  const FAST_MS = 1700;
  const FINAL_MS = 2600;
  const fastDelay = 900;
  const finalDelay = 1500;

  root.style.setProperty("--turnDur", (distance >= 2) ? `${FAST_MS}ms` : `${FINAL_MS}ms`);

  while(currentIndex !== target){
    if(myToken !== turnToken) return;

    const next = currentIndex + dir;
    const isFinalStep = next === target;

    root.style.setProperty("--turnDur", isFinalStep ? `${FINAL_MS}ms` : `${FAST_MS}ms`);
    currentIndex = next;
    render();

    await sleep(isFinalStep ? finalDelay : fastDelay);
  }
}

function nextPage(){ turnTo(currentIndex + 1); }
function prevPage(){ turnTo(currentIndex - 1); }

/* ===== Tap-to-flip zones (without touching menus) ===== */
function shouldIgnoreTap(target){
  return !!target.closest("a,button,input,select,textarea,label");
}

bookEl?.addEventListener("click", (e) => {
  if(!bookEl) return;
  if(shouldIgnoreTap(e.target)) return;

  const rect = bookEl.getBoundingClientRect();
  const x = e.clientX - rect.left;

  // Tap right/left edge zones (15% each)
  if (x > rect.width * 0.85) nextPage();
  else if (x < rect.width * 0.15) prevPage();
});

/* ===== Swipe to flip ===== */
let touchStartX = 0;
let touchStartY = 0;
let tracking = false;

bookEl?.addEventListener("touchstart", (e) => {
  if(e.touches.length !== 1) return;
  if(shouldIgnoreTap(e.target)) return;
  tracking = true;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive:true });

bookEl?.addEventListener("touchend", (e) => {
  if(!tracking) return;
  tracking = false;
  if(e.changedTouches.length !== 1) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  // horizontal intent
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    if (dx < 0) nextPage();
    else prevPage();
  }
}, { passive:true });

/* ===== Booking form ===== */
const form = document.getElementById("bookingForm");
const nameInput = document.getElementById("nameInput");
const serviceSelect = document.getElementById("serviceSelect");
const dateInput = document.getElementById("dateInput");
const timeInput = document.getElementById("timeInput");
const notesInput = document.getElementById("notesInput");

(function setMinDate(){
  if(!dateInput) return;
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  dateInput.min = `${yyyy}-${mm}-${dd}`;
})();

function goToBookWithService(serviceName){
  turnTo(3).then(() => {
    serviceSelect.value = serviceName;
    setTimeout(() => nameInput.focus(), prefersReducedMotion ? 0 : 200);
  });
}

document.querySelectorAll(".serviceCta").forEach(btn => {
  btn.addEventListener("click", () => goToBookWithService(btn.dataset.service));
});

form?.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const service = serviceSelect.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  const notes = notesInput.value.trim();

  const subject = `CBK Booking Request — ${service || "Service"}`;
  const bodyLines = [
    `Hi Kam,`,
    ``,
    `My name is: ${name}`,
    `I am interested in: ${service}`,
    `When: ${date}`,
    `What time: ${time}`,
    notes ? `Notes: ${notes}` : null,
    ``,
    `Sent from capturedby_kam site`
  ].filter(Boolean);

  const mailto = `mailto:${encodeURIComponent(BRAND.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  window.location.href = mailto;
});

/* ===== Gallery ===== */
const galleryStatus = document.getElementById("galleryStatus");
const bookContainer = document.querySelector(".book");

function buildCandidates(i){
  const pad2 = String(i).padStart(2,"0");
  const pad3 = String(i).padStart(3,"0");
  return [
    `images/images.${pad2}.JPG`,
    `images/images.${pad3}.JPG`,
    `images/images.${pad2}.jpg`,
    `images/images.${pad3}.jpg`,
  ];
}

function probeImage(url, timeoutMs = 900){
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;

    const t = setTimeout(() => {
      if(done) return;
      done = true;
      resolve(false);
    }, timeoutMs);

    img.onload = () => {
      if(done) return;
      done = true;
      clearTimeout(t);
      resolve(true);
    };
    img.onerror = () => {
      if(done) return;
      done = true;
      clearTimeout(t);
      resolve(false);
    };

    // no cache bust in production (better performance)
    img.src = url;
  });
}

async function loadManifest(){
  try{
    const res = await fetch("images/manifest.json", { cache: "no-store" });
    if(!res.ok) return null;
    const data = await res.json();
    if(!Array.isArray(data)) return null;

    // allow either ["images.01.JPG"] or ["images/images.01.JPG"]
    return data.map(x => (x.startsWith("images/") ? x : `images/${x}`));
  }catch{
    return null;
  }
}

async function discoverImages(){
  const found = [];
  const max = 70;
  let missesAfterFound = 0;

  for(let i=1;i<=max;i++){
    const urls = buildCandidates(i);
    let okUrl = null;

    for(const u of urls){
      // eslint-disable-next-line no-await-in-loop
      const ok = await probeImage(u);
      if(ok){ okUrl = u; break; }
    }

    if(okUrl){
      found.push(okUrl);
      missesAfterFound = 0;
    }else if(found.length > 0){
      missesAfterFound++;
      if(missesAfterFound >= 10) break;
    }
  }
  return found;
}

function createGalleryPage(index, url, label){
  const page = document.createElement("div");
  page.className = "page";
  page.dataset.index = String(index);

  page.innerHTML = `
    <div class="face front">
      <div class="pageBody">
        <div class="h">GALLERY</div>
        <div class="p subtle">${label}</div>
        <div class="photoWrap">
          <img class="photo" src="${url}" alt="${label}" loading="lazy" />
        </div>
      </div>
    </div>
    <div class="face back"></div>
  `;

  return page;
}

function preload(urls, startIdx){
  const next1 = urls[startIdx + 1];
  const next2 = urls[startIdx + 2];
  [next1, next2].filter(Boolean).forEach(u => {
    const img = new Image();
    img.src = u;
  });
}

async function buildGallery(){
  if(!galleryStatus || !bookContainer) return;

  let urls = await loadManifest();
  if(!urls) urls = await discoverImages();

  if(!urls.length){
    galleryStatus.textContent = "No images found. Add files in /images or add images/manifest.json.";
    return;
  }

  galleryStatus.textContent = `${urls.length} images loaded. Swipe or flip to view.`;

  const startIndex = 5;
  let idx = startIndex;

  urls.forEach((url, i) => {
    const label = `Photo ${i+1} of ${urls.length}`;
    const page = createGalleryPage(idx, url, label);
    bookContainer.appendChild(page);
    idx++;
  });

  pages = Array.from(document.querySelectorAll(".page"));
  render();

  // preload a couple images for smoothness
  preload(urls, 0);
}

/* ===== Events ===== */
navBtns.forEach(btn => btn.addEventListener("click", () => turnTo(Number(btn.dataset.target))));
logo.addEventListener("click", () => turnTo(0));
enterBtn?.addEventListener("click", () => turnTo(1));

flipPrevBtn.addEventListener("click", prevPage);
flipNextBtn.addEventListener("click", nextPage);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "Home") turnTo(0);
  if (e.key === "ArrowRight") nextPage();
  if (e.key === "ArrowLeft") prevPage();
});

updateBookMaxH();
render();
buildGallery();