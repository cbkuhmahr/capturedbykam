const BRAND = {
  email: "kam@capturedbykam.com",
  instagram: "https://www.instagram.com/CapturedBy_Kam/",
  youtube: "https://www.youtube.com/@YOUR_HANDLE" // <- change this
};

const root = document.documentElement;

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

const flipPrevBtn = document.querySelector(".flipPrev");
const flipNextBtn = document.querySelector(".flipNext");

let pages = Array.from(document.querySelectorAll(".page"));

const prefersReducedMotion = window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let currentIndex = 0;
let turnToken = 0;

function clampIndex(n){
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(pages.length - 1, x));
}

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
window.addEventListener("resize", requestNavUpdate);
window.addEventListener("orientationchange", requestNavUpdate);

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

  // flip controls (disable at ends)
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

  const FAST_MS = 1700;
  const FINAL_MS = 2600;
  const fastDelay = 950;
  const finalDelay = 1550;

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

/* ===== Gallery: build book pages from /images folder ===== */
const galleryStatus = document.getElementById("galleryStatus");
const galleryCoverPage = document.getElementById("galleryCoverPage");
const bookEl = document.querySelector(".book");

function buildCandidates(i){
  const pad2 = String(i).padStart(2,"0");   // 01..99
  const pad3 = String(i).padStart(3,"0");  // 001..999

  // Your folder shows: images/images.01.JPG, images/images.010.JPG, etc.
  return [
    `images/images.${pad2}.JPG`,
    `images/images.${pad3}.JPG`,
    `images/images.${pad2}.jpg`,
    `images/images.${pad3}.jpg`,
    `images/images.${i}.JPG`,
    `images/images.${i}.jpg`,
  ];
}

function probeImage(url, timeoutMs = 1200){
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

    img.src = url + `?v=${Date.now()}`; // avoid caching during testing
  });
}

async function discoverImages(){
  const found = [];
  const max = 60;

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

function injectGalleryStyles(){
  // minimal add-on styles (keeps CSS clean without needing a 4th file)
  const css = `
    .photoWrap{
      margin-top: 14px;
      border: 1px solid rgba(47,46,41,.14);
      background: rgba(0,0,0,.02);
      padding: 10px;
    }
    .photo{
      width: 100%;
      height: auto;
      display:block;
      object-fit: cover;
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

async function buildGallery(){
  if(!galleryStatus || !bookEl) return;

  injectGalleryStyles();

  const urls = await discoverImages();

  if(!urls.length){
    galleryStatus.textContent = "No images found. Add files to /images as images.01.JPG, images.02.JPG, etc.";
    return;
  }

  galleryStatus.textContent = `${urls.length} images loaded. Flip to view.`;

  // Insert pages after gallery cover (index 4)
  const startIndex = 5;
  let idx = startIndex;

  urls.forEach((url, i) => {
    const label = `Photo ${i+1} of ${urls.length}`;
    const page = createGalleryPage(idx, url, label);
    bookEl.appendChild(page);
    idx++;
  });

  // refresh pages list AFTER injection
  pages = Array.from(document.querySelectorAll(".page"));

  // Ensure Gallery nav goes to the gallery cover
  const galleryBtn = navBtns.find(b => b.textContent.trim() === "GALLERY");
  if(galleryBtn) galleryBtn.dataset.target = "4";

  render();
}

/* ===== Events ===== */
navBtns.forEach(btn => btn.addEventListener("click", () => turnTo(Number(btn.dataset.target))));
logo.addEventListener("click", () => turnTo(0));
enterBtn?.addEventListener("click", () => turnTo(1));

flipPrevBtn.addEventListener("click", prevPage);
flipNextBtn.addEventListener("click", nextPage);

// Keyboard support
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "Home") turnTo(0);
  if (e.key === "ArrowRight") nextPage();
  if (e.key === "ArrowLeft") prevPage();
});

// Initial
render();
buildGallery();