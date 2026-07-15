const SUPABASE_URL = "https://waiopvueoobwrnlctmua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Up3TnUwNTBwcenufqF1bWw_vfoE0Qz0";

const bookingForm = document.querySelector("#bookingForm");
const formStatus = document.querySelector("#formStatus");

function setStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

if (bookingForm && window.supabase) {
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = bookingForm.querySelector("button[type='submit']");
    const formData = new FormData(bookingForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim() || null,
      shoot_type: String(formData.get("shoot_type") || "").trim(),
      preferred_date: String(formData.get("preferred_date") || "").trim() || null,
      budget: String(formData.get("budget") || "").trim() || null,
      message: String(formData.get("message") || "").trim(),
      source: "capturedbykam.com"
    };

    if (!payload.name || !payload.email || !payload.shoot_type || !payload.message) {
      setStatus("Please fill out the required fields before sending.", "error");
      return;
    }

    try {
      submitButton.disabled = true;
      setStatus("Sending inquiry...");

      const { error } = await client.from("booking_inquiries").insert(payload);
      if (error) throw error;

      bookingForm.reset();
      setStatus("Inquiry sent. CBK will follow up with next steps.", "success");
    } catch (error) {
      console.error("Booking inquiry failed:", error);
      setStatus("Something went wrong. Please try again or reach out through your normal CBK contact path.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}
