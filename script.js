// script.js
(() => {
  "use strict";

  const body = document.body;
  const navToggle = document.querySelector(".navToggle");
  const nav = document.getElementById("siteNav");
  const yearEl = document.getElementById("year");
  const emailInput = document.getElementById("emailInput");
  const replyToField = document.getElementById("replyToField");
  const serviceSelect = document.getElementById("serviceSelect");
  const bookButtons = Array.from(document.querySelectorAll(".js-book"));
  const navLinks = Array.from(document.querySelectorAll(".siteNav a"));

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function setMenu(open) {
    body.classList.toggle("nav-open", open);
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  navToggle?.addEventListener("click", () => {
    const isOpen = body.classList.contains("nav-open");
    setMenu(!isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  if (emailInput && replyToField) {
    emailInput.addEventListener("input", () => {
      replyToField.value = emailInput.value.trim();
    });
  }

  bookButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const service = button.getAttribute("data-service") || "";
      if (serviceSelect) {
        serviceSelect.value = service;
      }

      const contact = document.getElementById("contact");
      contact?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 920) {
      setMenu(false);
    }
  });
})();
