const BRAND = {
  email: "kam@capturedbykam.com",
  instagram: "https://www.instagram.com/CapturedBy_Kam/",
  youtube: "https://www.youtube.com/@YOUR_HANDLE"
};

const root = document.documentElement;

const headerEl = document.getElementById("siteHeader");
const footerEl = document.getElementById("siteFooter");
const bookEl = document.getElementById("book");

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

function isMobile(){
  return window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
}

function viewportHeight(){
  return window.visualViewport?.height || window.innerHeight;
}

/* ✅ More aggressive book stretching (uses the yellow area) */
function updateBookMaxH(){
  if(!isMobile()){
    root.style.removeProperty("--bookMaxHpx");
    return;
  }

  const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
  const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;

  // smaller padding so the book gets more height
  const padding = 14;

  const maxH = Math.max(340, viewportHeight() - headerH - footerH - padding);
  root.style.setProperty("--bookMaxHpx", `${maxH}px`);
}

window.addEventListener("resize", updateBookMaxH);
window.addEventListener("orientationchange", updateBookMaxH);
window.visualViewport?.addEventListener("resize", updateBookMaxH);
window.visualViewport?.addEventListener("scroll", updateBookMaxH);

/* Page turning */
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

  if (flipPrevBtn && flipNextBtn){
    flipPrevBtn.disabled = currentIndex <= 0;
    flipNextBtn.disabled = currentIndex >= total - 1;
    flipPrevBtn.style.opacity = flipPrevBtn.disabled ? "0.35" : "1";
    flipNextBtn.style.opacity = flipNextBtn.disabled ? "0.35" : "1";
  }
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

function shouldIgnoreTap(target){
  return !!target.closest("a,button,input,select,textarea,label");
}

bookEl?.addEventListener("click", (e) => {
  if(shouldIgnoreTap(e.target)) return;
  const rect = bookEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (x > rect.width * 0.85) nextPage();
  else if (x < rect.width * 0.15) prevPage();
});

let sx = 0, sy = 0, tracking = false;
bookEl?.addEventListener("touchstart", (e) => {
  if(e.touches.length !== 1) return;
  if(shouldIgnoreTap(e.target)) return;
  tracking = true;
  sx = e.touches[0].clientX;
  sy = e.touches[0].clientY;
}, { passive:true });

bookEl?.addEventListener("touchend", (e) => {
  if(!tracking) return;
  tracking = false;
  if(e.changedTouches.length !== 1) return;
  const dx = e.changedTouches[0].clientX - sx;
  const dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2){
    if (dx < 0) nextPage(); else prevPage();
  }
}, { passive:true });

flipPrevBtn?.addEventListener("click", prevPage);
flipNextBtn?.addEventListener("click", nextPage);

navBtns.forEach(btn => btn.addEventListener("click", () => turnTo(Number(btn.dataset.target))));
logo?.addEventListener("click", () => turnTo(0));
enterBtn?.addEventListener("click", () => turnTo(1));

updateBookMaxH();
render();