const menuToggle = document.querySelector("#menu-toggle");

if (menuToggle) {
  document.querySelectorAll(".menu-panel a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.checked = false;
    });
  });
}