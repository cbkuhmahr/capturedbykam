(() => {
  "use strict";
  // Presentation helpers only. No account state, picks or calculations live here.
  function key(element) {
    if (!element || element === document.body) return null;
    if (element.id) return "#" + CSS.escape(element.id);
    const attrs = [...element.attributes].filter(a => a.name.startsWith("data-") && !a.name.startsWith("data-wt-scroll"));
    const owner = element.closest("[data-m-id]");
    const prefix = owner ? '[data-m-id="' + CSS.escape(owner.dataset.mId) + '"] ' : "";
    return attrs.length ? prefix + element.tagName.toLowerCase() + attrs.map(a => '[' + a.name + '="' + CSS.escape(a.value) + '"]').join("") : null;
  }
  function focusSnapshot(root) {
    const active = document.activeElement;
    if (!root.contains(active)) return null;
    return {key:key(active), start:active.selectionStart, end:active.selectionEnd};
  }
  function restoreFocus(root, state) {
    if (!state?.key) return;
    const element = root.querySelector(state.key);
    if (!element || element.disabled) return;
    element.focus({preventScroll:true});
    if (typeof state.start === "number" && /^(INPUT|TEXTAREA)$/.test(element.tagName)) {
      try { element.setSelectionRange(state.start, state.end); } catch {}
    }
  }
  function replace(root, markup) {
    if (!root || root.__wtMarkup === markup) return false;
    const focused = focusSnapshot(root);
    const drafts = [...root.querySelectorAll("textarea:not([readonly])")].map(el => [key(el),el.value]);
    const details = new Map([...root.querySelectorAll("details")].map((el,i) => [el.dataset.wtKey || el.id || el.className+":"+i,el.open]));
    const scroll = [...root.querySelectorAll("[data-wt-scroll]")].map(el => [el.dataset.wtScroll,el.scrollLeft,el.scrollTop]);
    root.innerHTML = markup;
    root.__wtMarkup = markup;
    for (const [selector,value] of drafts) { if(selector){const el=root.querySelector(selector); if(el)el.value=value;} }
    root.querySelectorAll("details").forEach((el,i) => {const id=el.dataset.wtKey||el.id||el.className+":"+i;if(details.has(id))el.open=details.get(id);});
    for(const [id,left,top] of scroll){const el=root.querySelector('[data-wt-scroll="'+CSS.escape(id)+'"]');if(el){el.scrollLeft=left;el.scrollTop=top;}}
    restoreFocus(root,focused);
    return true;
  }
  const requests = new Map();
  function publicJSON(url, maxAge=0) {
    if(!/^\/api\/nfl-(?:scores|game|standings)(?:\?|$)/.test(url))return Promise.reject(Error("Only public sports data may use this cache"));
    const now=Date.now(),cached=requests.get(url);
    if(cached && (cached.pending || now-cached.at<maxAge))return cached.promise;
    const entry={pending:true,at:now,promise:null};
    entry.promise=(async()=>{
      const response=await fetch(url,{credentials:"same-origin",signal:AbortSignal.timeout(12000)});
      const data=await response.json();
      if(!response.ok || !data.ok)throw Error(data.error||"Data is temporarily unavailable");
      entry.pending=false;entry.at=Date.now();return data;
    })().catch(error=>{if(requests.get(url)===entry)requests.delete(url);throw error;});
    requests.set(url,entry);
    if(requests.size>80){for(const [k,v] of requests){if(!v.pending&&k!==url){requests.delete(k);break;}}}
    return entry.promise;
  }

  // Custom drawers all share keyboard containment. Native <dialog> elements
  // already provide it. Track the stable overlay even when its content refreshes.
  let currentModal=null,returnFocus=null,returnSelector=null,queued=false,lastOutsideFocus=null;
  document.addEventListener("focusin",event=>{if(!event.target.closest('[role="dialog"],.sp-overlay'))lastOutsideFocus=event.target;});
  const visible=el=>!el.hidden && el.getAttribute("aria-hidden")!=="true" && !!el.getClientRects().length && getComputedStyle(el).visibility!=="hidden";
  function modalRoot(el){return el?.closest(".sp-overlay")||el;}
  function reconcileModal(){
    queued=false;
    const candidates=[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(visible);
    const next=modalRoot(candidates.at(-1))||null;
    const shell=document.querySelector(".shell")||document.querySelector(".cbk-admin-shell");
    if(next===currentModal)return;
    if(!currentModal && next){
      returnFocus=next.contains(document.activeElement)?lastOutsideFocus:document.activeElement;
      returnSelector=key(returnFocus);
      if(shell)shell.inert=true;
    }
    const previous=currentModal;
    currentModal=next;
    if(next){
      if(!next.contains(document.activeElement))next.querySelector('button:not(:disabled),[href],input:not(:disabled),select,textarea,[tabindex="0"]')?.focus({preventScroll:true});
    }else if(previous){
      if(shell)shell.inert=false;
      // Individual drawers may have already restored their own opener.
      if(!document.activeElement || document.activeElement===document.body || previous.contains(document.activeElement)){
        const target=returnFocus?.isConnected?returnFocus:returnSelector?document.querySelector(returnSelector):null;
        (target&&visible(target)?target:document.getElementById("wt-more-toggle"))?.focus({preventScroll:true});
      }
      returnFocus=null;returnSelector=null;
    }
  }
  function scheduleModal(){if(!queued){queued=true;queueMicrotask(reconcileModal);}}
  new MutationObserver(scheduleModal).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","aria-hidden"]});
  document.addEventListener("keydown",event=>{
    if(event.key!=="Tab" || !currentModal)return;
    const controls=[...currentModal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"],iframe')].filter(visible);
    const first=controls[0],last=controls.at(-1);
    if(!first){event.preventDefault();return;}
    if(event.shiftKey && (document.activeElement===first || !currentModal.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey && (document.activeElement===last || !currentModal.contains(document.activeElement))){event.preventDefault();first.focus();}
  },true);
  window.WTUI={replace,publicJSON,key};
})();
