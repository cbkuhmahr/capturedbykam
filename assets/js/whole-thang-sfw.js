(() => {
  "use strict";

  const app = document.getElementById("app");
  const openButton = document.querySelector("[data-wt-private]");
  if (!app || !openButton) return;


  function makeFlirt() {
    const st={mode:"playful",state:"",name:"",previous:[]};
    const bank={
      playful:{hey:["Hey, trouble. You here to be charming or cause mischief?","Well look who made the day more interesting.","There you are. What's on your mind?"],flirt:["You think you can keep up with me? Bold claim.","You're awfully confident. I like it.","Oh, so you want to flirt? Interesting."],thanks:["Careful. Flattery might earn you a smile.","Smooth. I see what you did there.","Now that's how you get someone's attention."],other:["You have my attention. Tell me more.","You're making this conversation difficult to leave.","Okay, what are you really thinking?","Interesting. I want to hear the rest."]},
      sweet:{hey:["Hi. I'm glad you're here.","Hey there. How's your day?","There you are. Tell me something good."],flirt:["I like the sound of gentle flirting.","Aw, that's a sweet thing to say.","You make it easy to smile."],thanks:["That's lovely to hear.","What a kind thing to say.","You have a sweet way with words."],other:["I'm listening. Tell me more.","I like getting to know you.","No rush. We can just talk.","That sounds like something worth exploring."]},
      bold:{hey:["Oh, you showed up. Now this could get interesting.","Hey. Let's skip the small talk.","Look at you making an entrance."],flirt:["Is that your best line, or are you warming up?","Confidence looks good on you. Can you back it up?","I like a challenge. Impress me."],thanks:["I see your charm offensive. Not bad.","You know exactly what you're doing.","That's a strong opening. Keep going."],other:["All right, make me curious.","You're up. Make your next line memorable.","Interesting. Don't stop there.","I see the confidence. I like it."]}
    };
    function pick(xs){const fresh=xs.filter(x=>!st.previous.includes(x)),pool=fresh.length?fresh:xs;const x=pool[Math.floor(Math.random()*pool.length)];st.previous.push(x);if(st.previous.length>5)st.previous.shift();return x;}
    function done(text,choices){return {text,choices:choices||["Flirt with me","Ask me something","Surprise me"]};}
    function tone(v){if(bank[v])st.mode=v;st.state="";return done(st.mode==="bold"?"Bold it is. Can you keep up?":st.mode==="sweet"?"Sweet and gentle. I'm listening.":"Playful it is. I like your style.",["Give me a compliment","Truth or dare?","Plan a date"]);}
    function reset(){st.name="";st.state="";st.previous=[];return done("Hey, you. Ready for a little flirting? Choose a vibe or say what's on your mind.",["Flirt with me","Truth or dare?","Plan a date","Surprise me"]);}
    function answer(value){
      const t=String(value||"").trim().toLowerCase().replace(/[’‘]/g,"'").slice(0,700);
      const b=bank[st.mode];
      if(!t)return done("I'm here. Say something.");
      if(/\b(stop|don't flirt|leave me alone|not comfortable)\b/.test(t))return done("Understood. We can keep it friendly. You set the pace.",["Tell me a joke","How are you?"]);
      if(/\b(sad|depressed|lonely|stressed|anxious|rough day|bad day)\b/.test(t))return done("I'm sorry it's been a tough day. Want to talk, or would a little distraction help?",["Distract me","Tell me a joke"]);
      if(/\b(are you real|are you ai|are you a bot|how do you work)\b/.test(t))return done("I'm a fictional, scripted chat character, not a person or a live AI model. But we can still have fun with banter.",["Flirt with me","Truth or dare?"]);
      const name=/\b(?:my name is|call me|i am called) ([a-z][a-z'-]{1,18})\b/.exec(t);
      if(name){st.name=name[1][0].toUpperCase()+name[1].slice(1);return done(st.name+". I like it. Tell me something about yourself.",["Plan a date","Flirt with me"]);}
      if(/\b(what's my name|remember my name)\b/.test(t))return done(st.name?"I remember, "+st.name+". I was paying attention.":"You haven't told me your name yet.",["Flirt with me"]);
      if(/\b(truth or dare|another round|play a game)\b/.test(t)){st.state="game";return done("Let's play. Truth or dare?",["Truth","Dare"]);}
      if(/\b(plan a date|first date|date night|take you out|describe our date)\b/.test(t)){st.state="date";return done("Our first date: coffee, dinner, a walk, or should I choose?",["Coffee","Dinner","You choose"]);}
      if(st.state==="game"&&/\btruth\b/.test(t)){st.state="truth";return done("Truth: what's one little thing that makes someone attractive to you?",["Great smile","Eye contact","Good humor"]);}
      if(st.state==="game"&&/\bdare\b/.test(t)){st.state="dare";return done("Dare: give me your smoothest one-line pickup line. I'll rate it.",["You're trouble, aren't you?","I love your smile"]);}
      if(st.state==="date"&&/\b(coffee|dinner|walk|concert|music|movie|tea)\b/.test(t)){st.state="";const a=/\b(coffee|dinner|walk|concert|music|movie|tea)\b/.exec(t)[0];return done("A "+a+" date? I like that. How would you make it unforgettable?",["Good conversation","Make you laugh","Hold hands"]);}
      if(st.state==="date"&&/\b(you choose|surprise|your choice)\b/.test(t)){st.state="";return done("I'm choosing a rooftop, music in the background, and a conversation we don't want to end.",["And then?","That sounds romantic"]);}
      if(st.state==="dare"&&t.length>4&&!/\b(your turn|skip)\b/.test(t)){st.state="";return done("An 8 out of 10 for confidence. The other two points? Earn them.",["Another round","Flirt with me"]);}
      if(st.state==="truth"&&t.length>3){st.state="";return done("I like that answer. The little things can make the biggest impression.",["Another round","Your turn"]);}
      if(/\b(surprise me|distract me)\b/.test(t))return done(pick(["We're the only two people laughing at a serious party. Do we stay or leave for late-night food?","Would you choose an unexpected love note or a call from someone you like?","You have 30 seconds to charm me. What's your line?"]),["Stay and flirt","Sneak out","Your turn"]);
      if(/\b(tell me a joke|make me laugh|another joke)\b/.test(t))return done(pick(["I was going to play it cool, but apparently I don't have that setting.","My flirting is like Wi-Fi. Better when you're close.","I had a great pickup line, but you distracted me."]),["That was corny","Another joke"]);
      if(/\b(give me a compliment|compliment me|say something nice)\b/.test(t))return done(pick(["There's something attractive about someone who can laugh at themselves.","You have the kind of confidence that makes a conversation interesting.","You make it easy to be curious. That's rare."]),["Keep going","Your turn"]);
      if(/\b(hi|hey|hello|good morning|good evening|what's up)\b/.test(t)&&t.length<60)return done(pick(b.hey),["Flirt with me","Truth or dare?","Plan a date"]);
      if(/\b(flirt|tease me|pickup line|charm me)\b/.test(t))return done(pick(b.flirt),["Your turn","Plan a date","Truth or dare?"]);
      if(/\b(beautiful|cute|gorgeous|pretty|handsome|lovely|hot|attractive|sweet|i like you)\b/.test(t))return done(pick(b.thanks),["Your turn","Flirt with me"]);
      if(/\b(kiss|cuddle|hug|hold hands)\b/.test(t))return done("A little chemistry, an unhurried conversation, and a sweet moment? That's romantic.",["And then?","Plan a date"]);
      if(/\b(photo|picture|send a pic)\b/.test(t))return done("No picture service in this version—just our conversation.",["Describe our date","Flirt with me"]);
      if(/\b(who are you|what's your name)\b/.test(t))return done("I'm SFW, a fictional companion with a playful streak.",["Flirt with me","Ask me something"]);
      if(/\b(how are you|how's your day|what are you doing)\b/.test(t))return done("I'm right here in this little conversation. What's made you smile today?",["You did","Long day"]);
      if(/\b(coffee|music|dinner|movie|weekend)\b/.test(t))return done("I could get into that. Would it be part of your ideal date?",["Plan a date","Surprise me"]);
      if(/\b(sweet|bold|playful)\b/.test(t)&&t.length<30)return tone(/\bsweet\b/.test(t)?"sweet":/\bbold\b/.test(t)?"bold":"playful");
      if(t.endsWith("?"))return done(pick(["That's a fun question. What would your answer be?","I'm curious what made you ask. Tell me.","I like your curiosity. What are you hoping I'll say?"]),["Flirt with me","Your turn"]);
      return done(pick(b.other),["Flirt with me","Truth or dare?","Plan a date"]);
    }
    return {answer,reset,tone};
  }

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
    ".wt-sfw-notice{align-self:stretch;border-top:1px solid #44454b;padding:12px 3px;color:#d0d0da;line-height:1.55;font-size:13px}",
    ".wt-sfw-notice a{display:inline-block;margin-top:9px;padding:9px 13px;background:#28292e;border:1px solid #55565f;border-radius:9px;color:#efcb80;text-decoration:none;font-size:13px;font-weight:750}",
    ".tabs.wt-sfw-open .tab.active:after{display:none!important}",
    ".tabs.wt-sfw-open .tab.active{color:#9799a1!important}",
    ".wt-sfw-compose{border-top:1px solid #303138;padding:12px;display:flex;gap:8px;align-items:center}",
    ".wt-sfw-compose textarea{resize:none;flex:1 1 auto;min-width:0;min-height:45px;max-height:135px;background:#202126!important;border:1px solid #404148!important;border-radius:12px!important;padding:11px!important;font-size:15px!important;line-height:1.4!important;color:#fff!important}",
    ".wt-sfw-send{background:#edc66c;border:0;border-radius:12px;padding:12px 15px;min-height:45px;flex-shrink:0;font-size:13px;font-weight:800;color:#151515;cursor:pointer}",
    ".wt-sfw-send:disabled{opacity:.5;cursor:wait}",
    ".wt-sfw-foot{padding:0 15px 15px;color:#a1a1aa;font-size:11px;line-height:1.6}",
    "@media(max-width:640px){.wt-sfw{padding:12px 10px 30px}.wt-sfw-head{padding:14px}.wt-sfw-messages{min-height:45vh;max-height:58vh}.wt-sfw-message{max-width:92%}}"
  ].join("\n");
  document.head.append(style);


  style.textContent += [
    ".wt-sfw-vibe{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #303138;background:#18161d}",
    ".wt-sfw-vibe label{font-size:12px;color:#bcb6c0;font-weight:750}",
    ".wt-sfw-vibe select{background:#27232b;color:#fff;border:1px solid #554b5c;border-radius:8px;padding:8px 12px;font-size:13px}",
    ".wt-sfw-prompts{display:flex;gap:7px;flex-wrap:wrap;padding:6px 13px 14px}",
    ".wt-sfw-prompt{border-radius:999px!important;background:#24212a!important;border:1px solid #5e4e63!important;color:#f0d5e6!important;padding:8px 12px!important;font-size:12px!important;cursor:pointer}",
    ".wt-sfw-message.typing{opacity:.6;font-style:italic}",
    ".wt-sfw-prompt:disabled{opacity:.4}"
  ].join("\n");

  const panel = document.createElement("section");
  panel.className = "wt-sfw";
  panel.id = "wt-sfw";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Private SFW chat");

  panel.innerHTML = [
    '<div class="wt-sfw-shell">',
    '<div class="wt-sfw-head"><div><div class="wt-sfw-name">SFW ✦</div><div class="wt-sfw-status">Private flirt chat · fictional character</div></div><div class="wt-sfw-actions"><button type="button" class="wt-sfw-btn" id="wt-sfw-clear">Clear</button><button type="button" class="wt-sfw-btn" id="wt-sfw-close">Close</button></div></div>',
    '<div class="wt-sfw-vibe"><label for="wt-sfw-mode">Vibe</label><select id="wt-sfw-mode"><option value="playful">Playful</option><option value="sweet">Sweet</option><option value="bold">Bold</option></select></div>',
    '<div class="wt-sfw-messages" id="wt-sfw-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>',
    '<div class="wt-sfw-prompts" id="wt-sfw-prompts" aria-label="Suggested replies"></div>',
    '<form id="wt-sfw-form" class="wt-sfw-compose"><textarea id="wt-sfw-input" aria-label="Message SFW" rows="1" maxlength="700" placeholder="Say something…" required></textarea><button type="submit" class="wt-sfw-send">Send</button></form>',
    '<div class="wt-sfw-foot">Interactive scripted chat, not generative AI. No external connection or saved chat history. Clear or reload resets the conversation.</div>',
    '</div>'
  ].join("");
  app.after(panel);


  const brain=makeFlirt();
  const messages=panel.querySelector("#wt-sfw-messages"),prompts=panel.querySelector("#wt-sfw-prompts");
  const input=panel.querySelector("#wt-sfw-input"),form=panel.querySelector("#wt-sfw-form"),send=panel.querySelector(".wt-sfw-send");
  let busy=false,timer=null;
  function bubble(type,text){const node=document.createElement("div");node.className="wt-sfw-message "+type;node.textContent=text;messages.append(node);messages.scrollTop=messages.scrollHeight;return node;}
  function setBusy(value){busy=value;send.disabled=value;prompts.querySelectorAll("button").forEach(b=>b.disabled=value);}
  function showChoices(xs){prompts.replaceChildren();xs.slice(0,4).forEach(x=>{const b=document.createElement("button");b.type="button";b.className="wt-sfw-prompt";b.textContent=x;b.addEventListener("click",()=>chat(x));prompts.append(b);});}
  function respond(x){bubble("bot",x.text);showChoices(x.choices);}
  function cancel(){if(timer!==null){clearTimeout(timer);timer=null;}setBusy(false);}
  function clear(){cancel();messages.replaceChildren();respond(brain.reset());input.value="";}
  function chat(value){if(busy)return;const x=String(value||"").trim().slice(0,700);if(!x)return;bubble("user",x);input.value="";const answer=brain.answer(x);setBusy(true);const typing=bubble("bot typing","Typing…");timer=setTimeout(()=>{timer=null;typing.remove();respond(answer);setBusy(false);},Math.min(700,320+x.length*8));}
  form.addEventListener("submit",ev=>{ev.preventDefault();chat(input.value);});
  input.addEventListener("keydown",ev=>{if(ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();chat(input.value);}});
  panel.querySelector("#wt-sfw-mode").addEventListener("change",ev=>{cancel();respond(brain.tone(ev.target.value));});
  panel.querySelector("#wt-sfw-clear").addEventListener("click",clear);
  function hide(){panel.hidden=true;app.hidden=false;openButton.setAttribute("aria-current","false");document.querySelector(".tabs")?.classList.remove("wt-sfw-open");document.getElementById("wt-more-toggle")?.removeAttribute("aria-current");}
  function show(){const menu=document.getElementById("wt-more-menu"),toggle=document.getElementById("wt-more-toggle");if(menu)menu.hidden=true;if(toggle)toggle.setAttribute("aria-expanded","false");app.hidden=true;panel.hidden=false;openButton.setAttribute("aria-current","page");document.querySelector(".tabs")?.classList.add("wt-sfw-open");if(toggle)toggle.setAttribute("aria-current","page");input.focus();}
  openButton.addEventListener("click",ev=>{ev.preventDefault();ev.stopPropagation();show();});
  panel.querySelector("#wt-sfw-close").addEventListener("click",hide);
  document.addEventListener("click",ev=>{if(!panel.hidden&&ev.target.closest(".tabs [data-tab], .wt-more-menu [data-go], .wt-more-menu [data-wt-open]"))hide();},true);
  clear();
})();
