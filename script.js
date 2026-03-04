// ====== SETTINGS YOU CAN CHANGE ======
const BOOKING_EMAIL = "capturedbykammedia@gmail.com";
const ORDER_FORM_URL = ""; // <-- paste your real order form link here when ready
// =====================================

document.getElementById("yearNow").textContent = new Date().getFullYear();

// Booking form -> opens email with prefilled subject/body
document.getElementById("bookingForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const fd = new FormData(e.target);
  const name = (fd.get("name") || "").toString().trim();
  const email = (fd.get("email") || "").toString().trim();
  const service = (fd.get("service") || "").toString().trim();
  const datetime = (fd.get("datetime") || "").toString().trim();
  const notes = (fd.get("notes") || "").toString().trim();

  const subject = encodeURIComponent(`Booking Request — ${service}`);
  const body = encodeURIComponent(
`Name: ${name}
Email: ${email}
Service: ${service}
Preferred date/time: ${datetime}

Notes:
${notes || "(none)"}
`
  );

  window.location.href = `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${body}`;
});

// Order form button
document.getElementById("orderBtn").addEventListener("click", () => {
  if (!ORDER_FORM_URL) {
    alert("Order form link not set yet. Paste it into script.js (ORDER_FORM_URL).");
    return;
  }
  window.open(ORDER_FORM_URL, "_blank", "noopener,noreferrer");
});