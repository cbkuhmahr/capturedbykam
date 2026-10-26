(() => {
  "use strict";

  const app = document.getElementById("app");
  const openButton = document.querySelector("[data-wt-private]");
  if (!app || !openButton) return;

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
    ".wt-sfw-compose{border-top:1px solid #303138;padding:12px;display:flex;gap:9px;align-items:flex-end}",
    ".wt-sfw-compose textarea{resize:none;flex:1;min-height:45px;max-height:135px;background:#202126!important;border:1px solid #404148!important;border-radius:12px!important;padding:11px!important;font-size:15px!important;line-height:1.4!important;color:#fff!important}",
    ".wt-sfw-send{background:#edc66c;border:0;border-radius:12px;padding:12px 15px;min-height:45px;font-size:13px;font-weight:800;color:#151515;cursor:pointer}",
    ".wt-sfw-send:disabled{opacity:.5;cursor:wait}",
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
    '<div class="wt-sfw-messages" id="wt-sfw-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>',
    '<form class="wt-sfw-compose" id="wt-sfw-form">',
    '<textarea id="wt-sfw-input" rows="1" maxlength="1000" aria-label="Message SFW" placeholder="Message SFW…" required></textarea>',
    '<button class="wt-sfw-send" type="submit">Send</button>',
    '</form>',
    '<div class="wt-sfw-foot">Messages stay in this open page, not your saved picks or site database. AI replies are processed by the configured AI provider. Reddit photos: not connected.</div>',
    '</div>'
  ].join("");
  app.after(panel);

  const messagesNode = panel.querySelector("#wt-sfw-messages");
  const form = panel.querySelector("#wt-sfw-form");
  const input = panel.querySelector("#wt-sfw-input");
  const send = panel.querySelector(".wt-sfw-send");
  let chat = [];
  let busy = false;

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