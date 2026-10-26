(() => {
  "use strict";

  const app = document.getElementById("app");
  const openButton = document.querySelector("[data-wt-private]");
  if (!app || !openButton) return;

  const sourceNames = ["amateurwifehub","AnythingPanties","athletic_ladies","BootyDaily","deepbuttcrack","FuckworthyWifeshare","FullBackPanties","hornypanties","Moms_In_Thongs","PantiesByBrandName1","panty_lines","PantyCake","SwimmerBabes","SwimmingSuits","Wife_Getting_Ready_GW","Wife_In_Panties"];
  const style = document.createElement("style");
  style.textContent = [
    ".wt-sfw[hidden]{display:none!important}",
    ".wt-sfw{padding:20px 14px 40px;max-width:820px;margin:auto}",
    ".wt-sfw-shell{border:1px solid #303138;border-radius:22px;overflow:hidden;background:#131416}",
    ".wt-sfw-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px;border-bottom:1px solid #303138}",
    ".wt-sfw-name{font-size:21px;font-weight:800;letter-spacing:-.03em}",
    ".wt-sfw-status{font-size:11px;color:#a1a1aa;margin-top:4px}",
    ".wt-sfw-actions{display:flex;gap:8px}",
    ".wt-sfw-btn{border:1px solid #484850;background:#24252a;color:#f5f5f7;border-radius:10px;padding:9px 12px;cursor:pointer;font-size:12px;font-weight:700}",
    ".wt-sfw-messages{display:flex;flex-direction:column;gap:12px;min-height:300px;max-height:60vh;overflow-y:auto;padding:20px 15px}",
    ".wt-sfw-message{max-width:85%;padding:12px 14px;border-radius:17px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px}",
    ".wt-sfw-message.bot{align-self:flex-start;background:#26272c;color:#f5f5f7;border-bottom-left-radius:5px}",
    ".wt-sfw-message.user{align-self:flex-end;background:#edc66c;color:#181818;border-bottom-right-radius:5px}",
    ".wt-sfw-compose{border-top:1px solid #303138;padding:12px;display:flex;gap:8px;align-items:center}",
    ".wt-sfw-compose textarea{resize:none;flex:1 1 auto;min-width:0;min-height:45px;max-height:135px;background:#202126!important;border:1px solid #404148!important;border-radius:12px!important;padding:11px!important;font-size:15px!important;line-height:1.4!important;color:#fff!important}",
    ".wt-sfw-send{background:#edc66c;border:0;border-radius:12px;padding:12px 15px;min-height:45px;flex-shrink:0;font-size:13px;font-weight:800;color:#151515;cursor:pointer}",
    ".wt-sfw-photo-btn{white-space:nowrap;min-height:45px;flex-shrink:0;padding:10px 12px;background:#303036;border:1px solid #585862;color:#f5f5f7}",
    "@media(max-width:640px){.wt-sfw-compose{padding:10px 8px;gap:6px}.wt-sfw-photo-btn{padding:10px 8px;font-size:12px}.wt-sfw-send{padding:10px 12px}}",
    ".wt-sfw-send:disabled{opacity:.5;cursor:wait}",
    ".wt-sfw-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 14px;border-bottom:1px solid #303138}",
    ".wt-sfw-source-area[hidden]{display:none!important}",
    ".wt-sfw-source-area{padding:13px 14px;border-bottom:1px solid #303138;background:#18191d}",
    ".wt-sfw-source-area p{margin:0 0 10px;color:#a4a4b2;font-size:12px;line-height:1.5}",
    ".wt-sfw-source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}",
    ".wt-sfw-source-grid label{display:flex;gap:7px;align-items:center;overflow-wrap:anywhere;font-size:12px;color:#dedee6}",
    ".wt-sfw-source-grid input{accent-color:#edc66c}",
    ".wt-sfw-photo{max-width:85%;align-self:flex-start;background:#222328;padding:10px;border-radius:14px;min-width:0}",
    ".wt-sfw-photo img{display:block;width:100%;max-width:340px;height:auto;max-height:460px;object-fit:contain;border-radius:9px}",
    ".wt-sfw-photo a{display:block;margin-top:8px;font-size:12px;color:#edc66c;overflow-wrap:anywhere}",
    ".wt-sfw-photo figcaption{margin-top:8px;font-size:11px;color:#a3a3ad}",
    "@media(max-width:640px){.wt-sfw-source-grid{grid-template-columns:1fr}}",
    ".wt-sfw-foot{padding:0 15px 15px;color:#a1a1aa;font-size:11px;line-height:1.6}",
    "@media(max-width:640px){.wt-sfw{padding:12px 10px 30px}.wt-sfw-head{padding:14px}.wt-sfw-messages{min-height:45vh;max-height:58vh}.wt-sfw-message{max-width:92%}}"
  ].join("\n");
  document.head.append(style);

  const panel = document.createElement("section");
  panel.className = "wt-sfw";
  panel.id = "wt-sfw";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Private SFW chat");
  panel.innerHTML = [
    '<div class="wt-sfw-shell">',
    '<div class="wt-sfw-head">',
    '<div><div class="wt-sfw-name">SFW</div><div class="wt-sfw-status">Private companion · fictional AI</div></div>',
    '<div class="wt-sfw-actions"><button type="button" class="wt-sfw-btn" id="wt-sfw-clear">Clear</button><button type="button" class="wt-sfw-btn" id="wt-sfw-close">Close</button></div>',
    '</div>',
    '<div class="wt-sfw-toolbar"><button type="button" id="wt-sfw-source-toggle" class="wt-sfw-btn" aria-expanded="false">Picture sources (16)</button></div>',
    '<div class="wt-sfw-source-area" id="wt-sfw-source-area" hidden><p>Only approved Reddit API results from these communities are eligible. Pictures open the original Reddit post. Sources are not connected until Reddit authorizes the app.</p><div class="wt-sfw-source-grid" id="wt-sfw-source-grid"></div></div>',
    '<div class="wt-sfw-messages" id="wt-sfw-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>',
    '<form class="wt-sfw-compose" id="wt-sfw-form">',
    '<textarea id="wt-sfw-input" rows="1" maxlength="1000" aria-label="Message SFW" placeholder="Message SFW…" required></textarea>',
    '<button type="button" id="wt-sfw-photo-btn" class="wt-sfw-btn wt-sfw-photo-btn" aria-label="Send a picture from Reddit">Send Pic</button>',
    '<button class="wt-sfw-send" type="submit">Send</button>',
    '</form>',
    '<div class="wt-sfw-foot">Messages stay in this open page, not your saved picks or site database. AI replies are processed by the configured AI provider. Reddit photos require approved API access. Images come from the selected communities when connected.</div>',
    '</div>'
  ].join("");
  app.after(panel);

  const messagesNode = panel.querySelector("#wt-sfw-messages");
  const form = panel.querySelector("#wt-sfw-form");
  const input = panel.querySelector("#wt-sfw-input");
  const send = panel.querySelector(".wt-sfw-send");
  let chat = [];
  let busy = false;

  const sourceArea = panel.querySelector("#wt-sfw-source-area");
  const sourceGrid = panel.querySelector("#wt-sfw-source-grid");
  const photoButton = panel.querySelector("#wt-sfw-photo-btn");
  const sourceToggle = panel.querySelector("#wt-sfw-source-toggle");
  const enabledSources = new Set(sourceNames);
  sourceNames.forEach(name => {
    const label = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = true;
    check.addEventListener("change", () => {
      if (check.checked) enabledSources.add(name);
      else enabledSources.delete(name);
    });
    label.append(check, document.createTextNode("r/" + name));
    sourceGrid.append(label);
  });
  sourceToggle.addEventListener("click", () => {
    sourceArea.hidden = !sourceArea.hidden;
    sourceToggle.setAttribute("aria-expanded", String(!sourceArea.hidden));
  });

  async function showPhoto() {
    if (busy) return;
    if (!enabledSources.size) {
      addMessage("assistant", "Choose at least one picture source first.");
      sourceArea.hidden = false;
      sourceToggle.setAttribute("aria-expanded", "true");
      return;
    }
    busy = true;
    send.disabled = true;
    photoButton.disabled = true;
    const pending = addMessage("assistant", "Looking for a photo…");
    try {
      const response = await fetch("/api/whole-thang-reddit", {
        method:"POST",
        credentials:"same-origin",
        cache:"no-store",
        headers:{"Content-Type":"application/json","X-WT-Companion":"1"},
        body:JSON.stringify({subreddits:[...enabledSources]})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.photo || typeof data.photo.image !== "string" ||
          typeof data.photo.link !== "string") {
        throw new Error(data.error || "No picture could be retrieved.");
      }
      pending.remove();
      const photo = data.photo;
      const figure = document.createElement("figure");
      figure.className = "wt-sfw-photo";
      const image = document.createElement("img");
      image.src = photo.image;
      image.alt = "Image from r/" + photo.subreddit + ": " + (photo.title || "Reddit photo");
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      const caption = document.createElement("figcaption");
      caption.textContent = "From r/" + photo.subreddit;
      const link = document.createElement("a");
      link.href = photo.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View original post on Reddit";
      figure.append(image, caption, link);
      messagesNode.append(figure);
      messagesNode.scrollTop = messagesNode.scrollHeight;
    } catch (error) {
      pending.textContent = error.message || "Reddit is unavailable.";
    } finally {
      busy = false;
      send.disabled = false;
      photoButton.disabled = false;
    }
  }
  photoButton.addEventListener("click", showPhoto);


  function addMessage(role, content) {
    const bubble = document.createElement("div");
    bubble.className = "wt-sfw-message " + (role === "user" ? "user" : "bot");
    bubble.textContent = content;
    messagesNode.append(bubble);
    messagesNode.scrollTop = messagesNode.scrollHeight;
    return bubble;
  }
  function reset() {
    chat = [];
    messagesNode.replaceChildren();
    addMessage("assistant", "Hey. You're in SFW — your private companion space. What kind of conversation would you like?");
    input.value = "";
  }
  function hide() {
    panel.hidden = true;
    app.hidden = false;
    openButton.setAttribute("aria-current", "false");
  }
  function show() {
    const menu = document.getElementById("wt-more-menu");
    const toggle = document.getElementById("wt-more-toggle");
    if (menu) menu.hidden = true;
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    app.hidden = true;
    panel.hidden = false;
    openButton.setAttribute("aria-current", "page");
    input.focus();
  }

  openButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    show();
  });
  panel.querySelector("#wt-sfw-close").addEventListener("click", hide);
  panel.querySelector("#wt-sfw-clear").addEventListener("click", reset);
  document.addEventListener("click", event => {
    if (!panel.hidden && event.target.closest(".tabs [data-tab], .wt-more-menu [data-go], .wt-more-menu [data-wt-open]")) hide();
  }, true);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy) form.requestSubmit();
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    const message = input.value.trim();
    if (!message) return;
    // A direct request for a picture goes to approved Reddit sources, never to the AI model.
    if (/\b(send|show|get|share)\b.{0,45}\b(pic|pics|photo|photos|picture|pictures)\b/i.test(message)) {
      addMessage("user", message);
      input.value = "";
      await showPhoto();
      return;
    }
    chat.push({role:"user",content:message});
    addMessage("user", message);
    input.value = "";
    busy = true;
    send.disabled = true;
    const pending = addMessage("assistant", "Typing…");
    try {
      const response = await fetch("/api/whole-thang-companion", {
        method:"POST",
        credentials:"same-origin",
        cache:"no-store",
        headers:{"Content-Type":"application/json","X-WT-Companion":"1"},
        body:JSON.stringify({messages:chat.slice(-12)})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.reply !== "string") throw new Error(data.error || "SFW is unavailable.");
      pending.textContent = data.reply;
      chat.push({role:"assistant",content:data.reply});
      chat = chat.slice(-16);
    } catch (error) {
      pending.textContent = error.message || "Connection unavailable.";
    } finally {
      busy = false;
      send.disabled = false;
      if (!panel.hidden) input.focus();
      messagesNode.scrollTop = messagesNode.scrollHeight;
    }
  });

  reset();
})();