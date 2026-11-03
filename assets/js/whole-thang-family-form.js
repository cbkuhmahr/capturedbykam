(() => {
  "use strict";
  // Microsoft Forms is the official system of record. Never simulate a
  // submission or claim that displaying the form means a response was sent.
  const FORM_URL="https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=DQSIkWdsW0yxEjajBLZtrQAAAAAAAAAAAAc__4JhahlUQ1pGNU5CU1ZGRjJZVVk3WVFFRTBQU1c2Mi4u";
  const STORAGE="wt-family-form-url-2026-w";
  const ALLOWED=new Set(["forms.cloud.microsoft","forms.office.com","forms.microsoft.com"]);
  const TEAMS={
    ARI:["Arizona Cardinals","Cardinals"],ATL:["Atlanta Falcons","Falcons"],
    BAL:["Baltimore Ravens","Ravens"],BUF:["Buffalo Bills","Bills"],
    CAR:["Carolina Panthers","Panthers"],CHI:["Chicago Bears","Bears"],
    CIN:["Cincinnati Bengals","Bengals"],CLE:["Cleveland Browns","Browns"],
    DAL:["Dallas Cowboys","Cowboys"],DEN:["Denver Broncos","Broncos"],
    DET:["Detroit Lions","Lions"],GB:["Green Bay Packers","Packers"],
    HOU:["Houston Texans","Texans"],IND:["Indianapolis Colts","Colts"],
    JAX:["Jacksonville Jaguars","Jaguars"],KC:["Kansas City Chiefs","Chiefs"],
    LAC:["Los Angeles Chargers","Chargers"],LAR:["Los Angeles Rams","Rams"],
    LV:["Las Vegas Raiders","Raiders"],MIA:["Miami Dolphins","Dolphins"],
    MIN:["Minnesota Vikings","Vikings"],NE:["New England Patriots","Patriots"],
    NO:["New Orleans Saints","Saints"],NYG:["New York Giants","Giants"],
    NYJ:["New York Jets","Jets"],PHI:["Philadelphia Eagles","Eagles"],
    PIT:["Pittsburgh Steelers","Steelers"],SEA:["Seattle Seahawks","Seahawks"],
    SF:["San Francisco 49ers","49ers"],TB:["Tampa Bay Buccaneers","Buccaneers"],
    TEN:["Tennessee Titans","Titans"],WAS:["Washington Commanders","Commanders"]
  };
  let open=false;
  let note="";
  const $=(tag,cls,txt)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(txt!==undefined)e.textContent=txt;
    return e;
  };
  function button(label,action,primary=false){
    const b=$("button","btn"+(primary?" primary":""),label);
    b.type="button";
    b.dataset.familyAction=action;
    return b;
  }
  function safeUrl(value){
    try{
      const u=new URL(String(value||"").trim());
      if(u.protocol!=="https:"||!ALLOWED.has(u.hostname))return null;
      if(!(/^\/Pages\/ResponsePage\.aspx$/i.test(u.pathname)||/^\/r\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)))return null;
      if(/ResponsePage\.aspx$/i.test(u.pathname)&&!u.searchParams.has("id"))return null;
      return u;
    }catch{return null;}
  }
  function normalized(v){return String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
  function teamFromAnswer(answer){
    const n=normalized(answer);
    return Object.entries(TEAMS).find(([abbr,names])=>
      [abbr,...names].some(v=>normalized(v)===n))?.[0]||null;
  }
  function formatChoice(abbr,example){
    // The example answer tells us if this form uses team codes, mascots or full names.
    const sample=String(example||"");
    const old=teamFromAnswer(sample);
    if(!old||!TEAMS[abbr])return null;
    const oldNames=TEAMS[old];
    const type=normalized(sample)===normalized(old)?"code":
      normalized(sample)===normalized(oldNames[0])?"full":"mascot";
    return type==="code"?abbr:type==="full"?TEAMS[abbr][0]:TEAMS[abbr][1];
  }
  function current(){try{
    const s=window.WTAppleSnapshot?.();
    return s&&Number.isInteger(s.week)&&Array.isArray(s.picks)?s:null;
  }catch{return null;}}
  function sourceLink(week){
    try{return safeUrl(localStorage.getItem(STORAGE+week))||new URL(FORM_URL);}
    catch{return new URL(FORM_URL);}
  }
  function prepared(s){
    const u=sourceLink(s.week);
    const mappings=new Map();
    const byGame=new Map(s.picks.map(g=>[[g.away,g.home].sort().join("-"),g]));
    const entries=[...u.searchParams.entries()].filter(([k])=>/^r[a-f0-9]{32}$/i.test(k));
    const usedGames=new Set();
    const numeric=[];
    for(const [key,value]of entries){
      const team=teamFromAnswer(value);
      if(!team){
        if(/^\d{1,3}$/.test(value))numeric.push(key);
        continue;
      }
      const game=s.picks.find(g=>g.away===team||g.home===team);
      if(!game)continue;
      const identity=[game.away,game.home].sort().join("-");
      if(usedGames.has(identity))continue;
      usedGames.add(identity);
      mappings.set(key,{game,example:value});
    }
    let count=0;
    for(const [key,{game,example}]of mappings){
      if(!game.choice){u.searchParams.delete(key);continue;}
      const replacement=formatChoice(game.choice,example);
      if(replacement){u.searchParams.set(key,replacement);count++;}
    }
    // Only infer an MNF-margin question if the sample has exactly one numerical
    // prefilled response; otherwise leave such questions unchanged for review.
    let marginMapped=false;
    if(numeric.length===1 && s.mnfMargin!=="" && s.mnfMargin!==null){
      u.searchParams.set(numeric[0],String(s.mnfMargin));
      marginMapped=true;
    }
    return {url:u.href, mapped:count, questions:mappings.size,
      marginMapped, total:s.picks.length, sampleCount:entries.length};
  }
  function summary(s){
    const lines=["WHOLETHANGER — SCOTT FAMILY NFL PICK'EM","WEEK "+s.week,""];
    s.picks.forEach(g=>lines.push(g.away+" @ "+g.home+": "+(g.choice?TEAMS[g.choice]?.[0]||g.choice:"NOT SELECTED")));
    lines.push("","Selected: "+s.picks.filter(g=>g.choice).length+" / "+s.picks.length);
    lines.push("MNF predicted winning margin: "+(s.mnfMargin===""||s.mnfMargin==null?"NOT SET":s.mnfMargin));
    lines.push("","Reference copy only. The Microsoft Form must be submitted separately.");
    return lines.join("\n");
  }
  function render(){
    document.getElementById("wt-family-form")?.remove();
    if(document.body.dataset.wtView!=="picks")return;
    const s=current(),target=document.getElementById("app");
    if(!s||!target)return;
    const ready=s.picks.filter(g=>g.choice).length;
    const link=prepared(s);
    const panel=$("section","wt-family-form");
    panel.id="wt-family-form";
    panel.setAttribute("aria-label","Official family pick'em form");
    const head=$("div","wt-family-head");
    const intro=$("div");
    intro.append($("span","wt-family-overline","SCOTT FAMILY PICK'EM"),
      $("h2","","Official submission · Week "+s.week),
      $("p","",ready+" of "+s.picks.length+" picks selected · MNF margin "+(s.mnfMargin===""?"not set":s.mnfMargin)));
    head.append(intro,$("span","wt-family-chip",link.mapped?
      link.mapped+" pre-filled": "Microsoft Forms"));
    panel.append(head);
    const actions=$("div","wt-family-actions");
    const reveal=button(open?"Hide Microsoft Form":"Open Microsoft Form","toggle",true);
    reveal.setAttribute("aria-expanded",String(open));
    const external=$("a","btn wt-family-extern","Open in browser ↗");
    external.href=link.url;external.target="_blank";external.rel="noopener noreferrer";
    actions.append(reveal,button("Copy my picks","copy"),external);
    panel.append(actions);
    if(ready<s.picks.length||s.mnfMargin===""){
      panel.append($("p","wt-family-caution","Complete your selections and Monday Night winning margin before official submission."));
    }
    if(link.sampleCount){
      panel.append($("p","wt-family-small",link.mapped+" of "+s.picks.length+
        " matchups matched from the pre-filled link. Verify all answers inside Microsoft Forms before submitting."+
        (link.marginMapped?" MNF margin mapped from a numeric field.":"")));
    }else{
      panel.append($("p","wt-family-small",
        "This is the official form. For automatic pre-filling, add a generated pre-filled response URL below."));
    }
    const preview=$("details","wt-family-details");
    preview.append($("summary","","Review my picks"));
    const list=$("ol","wt-family-pick-list");
    for(const g of s.picks){
      list.append($("li","",g.away+" @ "+g.home+" · "+
        (g.choice?(TEAMS[g.choice]?.[0]||g.choice):"Not selected")));
    }
    preview.append(list);panel.append(preview);
    const config=$("details","wt-family-details");
    const configHeading=$("summary","","Set up weekly form / pre-filled URL");
    config.append(configHeading);
    const formRow=$("div","wt-family-settings");
    const input=$("input","wt-family-link");
    input.type="url";input.id="wt-family-link";
    input.setAttribute("aria-label","Microsoft Forms response or pre-filled URL");
    input.placeholder="Paste generated Microsoft Forms response link";
    try{input.value=localStorage.getItem(STORAGE+s.week)||"";}catch{}
    formRow.append(input,button("Save link","save-url"),button("Restore default","reset-url"));
    config.append(formRow,
      $("p","wt-family-small",
        "In Microsoft Forms, choose Get pre-filled URL, enter one team answer for each game, then copy the generated respondent link. The designer URL will not work here. The link is saved for this week on this device."));
    panel.append(config);
    if(note){const status=$("p","wt-family-message",note);status.setAttribute("role","status");panel.append(status);}
    if(open){
      const container=$("div","wt-family-embed");
      const frame=$("iframe");
      frame.title="Official Microsoft Forms family pick'em submission";
      frame.src=link.url;
      frame.loading="lazy";
      frame.referrerPolicy="strict-origin-when-cross-origin";
      container.append(frame);panel.append(container);
      panel.append($("p","wt-family-small","Select Submit inside Microsoft Forms. WHOLETHANG cannot verify whether Microsoft accepted your entry."));
    }
    target.append(panel);
    panel.addEventListener("click",async event=>{
      const action=event.target.closest("[data-family-action]")?.dataset.familyAction;
      if(!action)return;
      if(action==="toggle"){open=!open;note="";render();return;}
      if(action==="copy"){
        try{
          await navigator.clipboard.writeText(summary(s));
          note="Picks copied. Paste them into the form if pre-fill is not configured.";
        }catch{note="Clipboard unavailable. Expand Review my picks and use the selections shown there.";}
        render();return;
      }
      if(action==="reset-url"){
        try{localStorage.removeItem(STORAGE+s.week);note="Restored the default Microsoft Form.";open=false;}
        catch{note="Local settings could not be updated.";}
        render();return;
      }
      if(action==="save-url"){
        const given=document.getElementById("wt-family-link")?.value||"";
        const url=safeUrl(given);
        if(!url){note="Paste a Microsoft Forms RESPONSE link, not the DesignPage link.";render();document.querySelector("#wt-family-form details:last-of-type")?.setAttribute("open","");return;}
        try{localStorage.setItem(STORAGE+s.week,url.href);note="Week "+s.week+" form link saved. Review the pre-filled answers in Microsoft Forms.";open=false;}
        catch{note="Unable to save form settings on this device.";}
        render();
      }
    });
  }
  document.addEventListener("wt-view-rendered",render);
  document.addEventListener("DOMContentLoaded",render);
})();
