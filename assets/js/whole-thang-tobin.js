(() => {
  "use strict";

  const app = document.getElementById("app");
  const openButton = document.querySelector("[data-wt-private]");
  if (!app || !openButton) return;

  const style = document.createElement("style");
  style.textContent = [
    ".wt-tobin[hidden]{display:none!important}",
    ".wt-tobin{padding:20px 14px 40px;max-width:820px;margin:auto}",
    ".wt-tobin-shell{border:1px solid #303138;border-radius:22px;overflow:hidden;background:#131416}",
    ".wt-tobin-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px;border-bottom:1px solid #303138}",
    ".wt-tobin-name{font-size:21px;font-weight:800;letter-spacing:-.03em}",
    ".wt-tobin-status{font-size:11px;color:#a1a1aa;margin-top:4px}",
    ".wt-tobin-actions{display:flex;gap:8px}",
    ".wt-tobin-btn{border:1px solid #484850;background:#24252a;color:#f5f5f7;border-radius:10px;padding:9px 12px;cursor:pointer;font-size:12px;font-weight:700}",
    ".wt-tobin-messages{display:flex;flex-direction:column;gap:12px;min-height:300px;max-height:60vh;overflow-y:auto;padding:20px 15px}",
    ".wt-tobin-message{max-width:85%;padding:12px 14px;border-radius:17px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px}",
    ".wt-tobin-message.bot{align-self:flex-start;background:#26272c;color:#f5f5f7;border-bottom-left-radius:5px}",
    ".wt-tobin-message.user{align-self:flex-end;background:#edc66c;color:#181818;border-bottom-right-radius:5px}",
    ".wt-tobin-compose{border-top:1px solid #303138;padding:12px;display:flex;gap:9px;align-items:flex-end}",
    ".wt-tobin-compose textarea{resize:none;flex:1;min-height:45px;max-height:135px;background:#202126!important;border:1px solid #404148!important;border-radius:12px!important;padding:11px!important;font-size:15px!important;line-height:1.4!important;color:#fff!important}",
    ".wt-tobin-send{background:#edc66c;border:0;border-radius:12px;padding:12px 15px;min-height:45px;font-size:13px;font-weight:800;color:#151515;cursor:pointer}",
    ".wt-tobin-send:disabled{opacity:.5;cursor:wait}",
    ".wt-tobin-foot{padding:0 15px 15px;color:#a1a1aa;font-size:11px;line-height:1.6}",
    "@media(max-width:640px){.wt-tobin{padding:12px 10px 30px}.wt-tobin-head{padding:14px}.wt-tobin-messages{min-height:45vh;max-height:58vh}.wt-tobin-message{max-width:92%}}"
  ].join("\n");
  document.head.append(style);

  const panel = document.createElement("section");
  panel.className = "wt-tobin";
  panel.id = "wt-tobin";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Private Tobin chat");
  panel.innerHTML = [
    '<div class="wt-tobin-shell">',
    '<div class="wt-tobin-head">',
    '<div><div class="wt-tobin-name">Tobin</div><div class="wt-tobin-status">Private companion · fictional AI</div></div>',
    '<div class="wt-tobin-actions"><button type="button" class="wt-tobin-btn" id="wt-tobin-clear">Clear</button><button type="button" class="wt-tobin-btn" id="wt-tobin-close">Close</button></div>',
    '</div>',
    '<div class="wt-tobin-messages" id="wt-tobin-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>',
    '<form class="wt-tobin-compose" id="wt-tobin-form">',
    '<textarea id="wt-tobin-input" rows="1" maxlength="1000" aria-label="Message Tobin" placeholder="Message Tobin…" required></textarea>',
    '<button class="wt-tobin-send" type="submit">Send</button>',
    '</form>',
    '<div class="wt-tobin-foot">Messages stay in this open page, not your saved picks or site database. AI replies are processed by the configured AI provider. Reddit photos: not connected.</div>',
    '</div>'
  ].join("");
  app.after(panel);

  const messagesNode = panel.querySelector("#wt-tobin-messages");
  const form = panel.querySelector("#wt-tobin-form");
  const input = panel.querySelector("#wt-tobin-input");
  const send = panel.querySelector(".wt-tobin-send");
  let chat = [];
  let busy = false;

  function addMessage(role, content) {
    const bubble = document.createElement("div");
    bubble.className = "wt-tobin-message " + (role === "user" ? "user" : "bot");
    bubble.textContent = content;
    messagesNode.append(bubble);
    messagesNode.scrollTop = messagesNode.scrollHeight;
    return bubble;
  }
  function reset() {
    chat = [];
    messagesNode.replaceChildren();
    addMessage("assistant", "Hey you. It's Tobin. What kind of conversation are you in the mood for?");
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
  panel.querySelector("#wt-tobin-close").addEventListener("click", hide);
  panel.querySelector("#wt-tobin-clear").addEventListener("click", reset);
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
      if (!response.ok || typeof data.reply !== "string") throw new Error(data.error || "Tobin is unavailable.");
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