(() => {
  "use strict";
  const params = new URLSearchParams(window.location.search);
  const slug = (params.get("project") || "").trim();
  const label = (params.get("label") || "").trim().slice(0, 140);
  const origin = "https://www.capturedbykam.com";
  // Only project slugs are permitted in the shared URL; no outside redirects.
  const safeSlug = /^[a-zA-Z0-9_-]{1,180}$/.test(slug) ? slug : "";
  const url = safeSlug
    ? origin + "/gallery.html?project=" + encodeURIComponent(safeSlug)
    : origin + "/shop.html";
  const isEvent = Boolean(safeSlug);
  const status = document.getElementById("qrStatus");
  const title = document.getElementById("qrTitle");
  const frame = document.getElementById("qrCode");
  const download = document.getElementById("downloadQr");
  const link = document.getElementById("openDestination");
  const copy = document.getElementById("copyQr");
  const address = document.getElementById("qrAddress");

  if (slug && !safeSlug) {
    status.textContent = "That gallery link is invalid. Showing the permanent Photo Shop code instead.";
  }
  if (isEvent) {
    title.textContent = label || "Find your event photos.";
    frame.setAttribute("aria-label", "QR code to an event photo gallery");
  } else {
    title.textContent = "Your photos are one scan away.";
  }
  link.href = url;
  address.textContent = url.replace("https://", "");

  if (typeof QRCode !== "function") {
    status.textContent = "The QR generator could not load. Check your internet connection and refresh.";
    return;
  }

  new QRCode(frame, {
    text: url,
    width: 320,
    height: 320,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
  download.disabled = false;
  status.textContent = "Ready to save or print. Test the destination before printing a large batch.";

  function qrImage() {
    return frame.querySelector("canvas") || frame.querySelector("img");
  }
  download.addEventListener("click", async () => {
    const source = qrImage();
    if (!source) {
      status.textContent = "The QR image is not ready. Refresh this page and try again.";
      return;
    }
    if (source instanceof HTMLImageElement && !source.complete) {
      try { await source.decode(); }
      catch { status.textContent = "The QR image did not load. Refresh and try again."; return; }
    }

    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 2400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 2400, 2400);
    ctx.drawImage(source, 140, 140, 2120, 2120);
    const filename = isEvent ? "CBK_Event_" + safeSlug + "_QR.png" : "CBK_Permanent_Shop_QR.png";
    canvas.toBlob((blob) => {
      if (!blob) { status.textContent = "QR export failed."; return; }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      status.textContent = "QR PNG prepared. Keep its white border when printing.";
    }, "image/png");
  });
  document.getElementById("printQr").addEventListener("click", () => window.print());
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "Gallery link copied.";
    } catch {
      status.textContent = "Copy unavailable here. Use the Test Destination link to share the page address.";
    }
  });
})();