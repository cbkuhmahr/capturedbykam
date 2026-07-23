const menuToggle = document.querySelector("#menu-toggle");

if (menuToggle) {
  document.querySelectorAll(".menu-panel a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.checked = false;
    });
  });
}

const bookingForm = document.querySelector("#cbk-booking-form");
const bookingStatus = document.querySelector("#booking-status");
const retainerForm = document.querySelector("#retainer-form");
const retainerStatus = document.querySelector("#retainer-status");

const CBK_SUPABASE_URL = "https://waiopvueoobwrnlctmua.supabase.co";
const CBK_SUPABASE_PUBLISHABLE_KEY = "";
const CBK_RETAINER_PAYMENT_LINK = "https://buy.stripe.com/dRm8wRa8B5Po5uycT96Zy00";

function bookingValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function buildBookingPayload(formData) {
  const preferredTime = bookingValue(formData, "preferred_time");
  const location = bookingValue(formData, "location");
  const budget = bookingValue(formData, "budget");
  const baseMessage = bookingValue(formData, "message");

  const fullMessage = [
    baseMessage,
    "",
    "--- Booking Details ---",
    `Preferred time: ${preferredTime || "Not provided"}`,
    `Location: ${location || "Not provided"}`,
    `Package / estimated budget: ${budget || "Not provided"}`,
    "Terms accepted: Yes",
    "50% retainer required: Yes",
    "Deposit status: Not paid through this form",
    "Retainer process: CBK confirms availability, sends acknowledgment code, then client pays retainer.",
    `Retainer payment link: ${CBK_RETAINER_PAYMENT_LINK}`
  ].join("\n");

  return {
    name: bookingValue(formData, "name"),
    email: bookingValue(formData, "email"),
    phone: bookingValue(formData, "phone") || null,
    shoot_type: bookingValue(formData, "shoot_type"),
    preferred_date: bookingValue(formData, "preferred_date") || null,
    budget: budget || null,
    message: fullMessage,
    status: "new",
    source: "capturedbykam.com"
  };
}

function buildMailto(payload) {
  const subject = `CBK Booking Request - ${payload.name}`;
  const body = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "Not provided"}`,
    `Project type: ${payload.shoot_type}`,
    `Preferred date: ${payload.preferred_date || "Not provided"}`,
    `Budget/package: ${payload.budget || "Not provided"}`,
    "",
    payload.message
  ].join("\n");

  return `mailto:kam@capturedbykam.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function submitToSupabase(payload) {
  const response = await fetch(`${CBK_SUPABASE_URL}/rest/v1/booking_inquiries`, {
    method: "POST",
    headers: {
      apikey: CBK_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${CBK_SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Booking request could not be saved.");
  }
}

if (bookingForm) {
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(bookingForm);
    const acceptedTerms = formData.get("terms") === "on";

    if (!acceptedTerms) {
      bookingStatus.textContent = "Please accept the booking terms before submitting.";
      return;
    }

    const payload = buildBookingPayload(formData);
    const submitButton = bookingForm.querySelector("button[type='submit']");

    if (submitButton) submitButton.disabled = true;
    bookingStatus.textContent = "Preparing booking request...";

    try {
      if (CBK_SUPABASE_PUBLISHABLE_KEY) {
        await submitToSupabase(payload);
        bookingStatus.textContent = "Booking request received. CBK will follow up with availability, acknowledgment code, and retainer instructions.";
        bookingForm.reset();
      } else {
        window.location.href = buildMailto(payload);
        bookingStatus.textContent = "Your email app should open with the booking request. Send that email to complete the inquiry for now.";
      }
    } catch (error) {
      console.error(error);
      window.location.href = buildMailto(payload);
      bookingStatus.textContent = "The database save did not complete, so the request opened as an email instead.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

if (retainerForm) {
  retainerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(retainerForm);
    const code = bookingValue(formData, "acknowledgment_code");
    const service = bookingValue(formData, "confirmed_service");
    const amount = bookingValue(formData, "retainer_amount");
    const acceptedTerms = formData.get("retainer_terms") === "on";

    if (!code || !service || !amount || !acceptedTerms) {
      retainerStatus.textContent = "Enter your acknowledgment code, confirmed service, exact retainer amount, and check the confirmation box.";
      return;
    }

    retainerStatus.textContent = `Opening Stripe. Use acknowledgment code ${code} and pay the confirmed ${service} retainer amount: ${amount}.`;
    window.open(CBK_RETAINER_PAYMENT_LINK, "_blank", "noopener");
  });
}
