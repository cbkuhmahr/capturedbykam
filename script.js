const tabs = Array.from(document.querySelectorAll(".tab"));
const pages = Array.from(document.querySelectorAll("[data-page]"));

function activatePage(id) {
  const current = document.querySelector(".page.is-active");
  const next = document.getElementById(id);

  if (!next || current === next) return;

  // tab states
  tabs.forEach(t => {
    const active = t.dataset.target === id;
    t.classList.toggle("is-active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });

  // page transition
  if (current) {
    current.classList.add("is-leaving");
    current.classList.remove("is-active");

    // after leave animation, clean up
    setTimeout(() => current.classList.remove("is-leaving"), 260);
  }

  next.classList.add("is-active");

  // optional: update hash for shareable links
  history.replaceState(null, "", `#${id}`);
}

// click tabs
tabs.forEach(tab => {
  tab.addEventListener("click", () => activatePage(tab.dataset.target));
});

// internal jump buttons
document.addEventListener("click", (e) => {
  const jump = e.target.closest("[data-jump]");
  if (!jump) return;
  e.preventDefault();
  activatePage(jump.dataset.jump);
});

// hash routing on load
const hash = (window.location.hash || "").replace("#", "");
if (hash && document.getElementById(hash)) activatePage(hash);

// mailto form submit (BOOK + SIGNUP)
function sendMailFromForm(form, subjectPrefix) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const entries = Object.fromEntries(data.entries());

    const to = "capturedbykammedia@gmail.com";
    const subject = `${subjectPrefix} — ${entries.name || "New Inquiry"}`;

    const bodyLines = [
      "Captured by Kam — Inquiry",
      "--------------------------------",
      ...Object.entries(entries).map(([k, v]) => `${k}: ${v}`),
      "--------------------------------",
      "IG: @CapturedBy_Kam",
      "YouTube: https://www.youtube.com/@capturedbykammedia"
    ];

    const body = encodeURIComponent(bodyLines.join("\n"));
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`;

    window.location.href = mailto;
  });
}

const bookForm = document.getElementById("bookForm");
const signUpForm = document.getElementById("signUpForm");

if (bookForm) sendMailFromForm(bookForm, "BOOKING REQUEST");
if (signUpForm) sendMailFromForm(signUpForm, "ONLINE SIGN UP");