const pages = Array.from(document.querySelectorAll('.pagePanel'));
const navButtons = Array.from(document.querySelectorAll('.navBtn'));
const pageCurrent = document.getElementById('pageCurrent');
const pageTotal = document.getElementById('pageTotal');
const pagePrev = document.getElementById('pagePrev');
const pageNext = document.getElementById('pageNext');
const enterBtn = document.getElementById('enterBtn');
const logoBtn = document.getElementById('logo');
const jumpToBookButtons = Array.from(document.querySelectorAll('.jumpToBook'));
const serviceCtaButtons = Array.from(document.querySelectorAll('.serviceCta'));
const serviceSelect = document.getElementById('serviceSelect');
const emailInput = document.getElementById('emailInput');
const replyToField = document.getElementById('replyToField');
const pageViewport = document.getElementById('pageViewport');

let currentPage = 0;
pageTotal.textContent = String(pages.length).padStart(2, '0');

function showPage(index) {
  currentPage = Math.max(0, Math.min(index, pages.length - 1));

  pages.forEach((page, i) => {
    page.classList.toggle('is-active', i === currentPage);
  });

  navButtons.forEach((btn) => {
    const target = Number(btn.dataset.target);
    btn.classList.toggle('is-active', target === currentPage);
  });

  pageCurrent.textContent = String(currentPage + 1).padStart(2, '0');
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => showPage(Number(btn.dataset.target)));
});

pagePrev?.addEventListener('click', () => showPage(currentPage - 1));
pageNext?.addEventListener('click', () => showPage(currentPage + 1));
enterBtn?.addEventListener('click', () => showPage(1));
logoBtn?.addEventListener('click', () => showPage(0));

jumpToBookButtons.forEach((btn) => {
  btn.addEventListener('click', () => showPage(3));
});

serviceCtaButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const service = btn.dataset.service;
    if (serviceSelect) serviceSelect.value = service;
    showPage(3);
  });
});

if (emailInput && replyToField) {
  emailInput.addEventListener('input', () => {
    replyToField.value = emailInput.value.trim();
  });
}

const galleryItems = [
  {
    src: 'author.jpg',
    title: 'Artist portrait / brand presence',
    caption: 'A personal frame that brings warmth, color, and personality into the brand.'
  },
  {
    src: 'avatar.jpg',
    title: 'Behind the lens',
    caption: 'A self-aware image that lets the audience meet the photographer, not just the business name.'
  },
  {
    src: 'sphere-10.JPG',
    title: 'Toledo Museum of Art',
    caption: 'Architectural detail with soft light and local identity. Clean, simple, strong.'
  },
  {
    src: 'sphere-9.JPG',
    title: 'Editorial detail / print culture',
    caption: 'A close study in texture, typography, and restraint. This is the kind of quiet frame that hits.'
  },
  {
    src: 'sphere-8.JPG',
    title: 'Color study / candy counter',
    caption: 'A playful composition with shallow depth and rich color separation.'
  },
  {
    src: 'sphere-1.jpeg',
    title: 'Market texture / everyday life',
    caption: 'Proof that ordinary subjects still go hard when the framing and focus are right.'
  },
  {
    src: 'sphere-3.JPG',
    title: 'Collection / print archive',
    caption: 'A strong still-life image rooted in nostalgia, culture, and personal taste.'
  },
  {
    src: 'sphere-4.JPG',
    title: 'Beauty detail / lifestyle frame',
    caption: 'Luxury, color, and texture all working together without feeling overcooked.'
  },
  {
    src: 'sphere-5.JPG',
    title: 'Family / creative process',
    caption: 'A softer observational frame that feels real instead of staged.'
  },
  {
    src: 'sphere-6.JPG',
    title: 'Lifestyle close-up',
    caption: 'Tight focus, tactile detail, and a playful summer feel.'
  },
  {
    src: 'sphere-7.JPG',
    title: 'Form study / sculpture',
    caption: 'Minimal composition with strong geometry and negative space.'
  }
];

const galleryMainImage = document.getElementById('galleryMainImage');
const galleryTitle = document.getElementById('galleryTitle');
const galleryCaption = document.getElementById('galleryCaption');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');
const thumbs = Array.from(document.querySelectorAll('.thumb'));
let currentGalleryIndex = 0;

function showGalleryItem(index) {
  currentGalleryIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentGalleryIndex];

  if (!galleryMainImage || !galleryTitle || !galleryCaption) return;

  galleryMainImage.src = item.src;
  galleryMainImage.alt = item.title;
  galleryTitle.textContent = item.title;
  galleryCaption.textContent = item.caption;

  thumbs.forEach((thumb, i) => {
    thumb.classList.toggle('is-active', i === currentGalleryIndex);
  });
}

thumbs.forEach((thumb) => {
  thumb.addEventListener('click', () => {
    showGalleryItem(Number(thumb.dataset.index));
  });
});

galleryPrev?.addEventListener('click', () => showGalleryItem(currentGalleryIndex - 1));
galleryNext?.addEventListener('click', () => showGalleryItem(currentGalleryIndex + 1));

let touchStartX = 0;
let touchEndX = 0;

pageViewport?.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

pageViewport?.addEventListener('touchend', (event) => {
  touchEndX = event.changedTouches[0].clientX;
  const distance = touchEndX - touchStartX;

  if (Math.abs(distance) < 40) return;

  if (distance < 0) showPage(currentPage + 1);
  if (distance > 0) showPage(currentPage - 1);
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') showPage(currentPage + 1);
  if (event.key === 'ArrowLeft') showPage(currentPage - 1);

  if (currentPage === 4 && event.key === 'ArrowUp') showGalleryItem(currentGalleryIndex - 1);
  if (currentPage === 4 && event.key === 'ArrowDown') showGalleryItem(currentGalleryIndex + 1);
});

showPage(0);
showGalleryItem(0);
