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

  // Exact Week 9 question mapping provided in the generated respondent URL.
  // Each ID belongs to the game containing the original sample team's code.
  // Never carry this mapping into a different week: form questions may be edited.
  const VERIFIED_WEEK=9;
  const WEEK9_FIELDS=[
    ["r87eef637e97d472d864c7834ccc91ca8","JAX"],
    ["rd132418a70ab4568aca9d9b4314b1c06","CIN"],
    ["rbe3f982ff22240799d790d4b37c82356","DAL"],
    ["rfe626835f14340d99731f0db401a889e","WAS"],
    ["r087b5dd04ef34fe591cdab3f57bd8bf0","NO"],
    ["rd62afba580bd477d9f36b55d810a5d8f","KC"],
    ["r2708651cb762456093091147ab1ec73f","DET"],
    ["rbb509a49c74345f9b5f58691fe7cc91b","DEN"],
    ["r3ec352ab06e24f569d6c0c1e843ad103","NYG"],
    ["r040ea05c04aa4e11abaa90aa06c8b3b1","SF"],
    ["re4a05968543c4cc1b3701d753cbb5c02","HOU"],
    ["r23f7f9d8dd1345f7a51a5f26d7fd7af0","NE"],
    ["r80762aa5b73d45c7ab9fffe9e3422695","SEA"],
    ["r69255fc6061f443bb802083e399c0391","CHI"],
    ["rdabcd12adc9143159e3c08b6e09d09ed","BUF"]
  ];
  const PARTICIPANT_FIELD="r54249e8358f541a09cf212b19f53ca24";
  const PAYMENT_FIELD="ra0713c85c5e94dd7b0703eba742ea550";
  const MARGIN_FIELD="r722dbc84561e44b9b28c5ab55823d5c4";
  const PAYMENT_VALUE=JSON.stringify(JSON.stringify(["Upon Winning — Paid Out Cash / Cash App"]));
  function answerValue(value){
    // Choice values arrive as JSON strings, not raw team names.
    try{
      const decoded=JSON.parse(value);
      if(typeof decoded==="string"){
        try{
          const nested=JSON.parse(decoded);
          if(nested&&typeof nested==="object"&&nested.IsMath===true&&"Answer" in nested)
            return {kind:"math",value:String(nested.Answer)};
        }catch{}
        return {kind:"choice",value:decoded};
      }
    }catch{}
    return {kind:"text",value:String(value)};
  }
  function marginValue(v,example){
    const parsed=answerValue(example);
    return parsed.kind==="math"?
      JSON.stringify(JSON.stringify({Answer:String(v),IsMath:true})):String(v);
  }
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
    const source=answerValue(example);
    const old=teamFromAnswer(source.value);
    if(!old||!TEAMS[abbr])return null;
    const oldNames=TEAMS[old];
    const sample=normalized(source.value);
    const type=sample===normalized(old)?"code":
      sample===normalized(oldNames[0])?"full":"mascot";
    const choice=type==="code"?abbr:type==="full"?TEAMS[abbr][0]:TEAMS[abbr][1];
    return source.kind==="choice"?JSON.stringify(choice):choice;
  }
  function current(){try{
    const s=window.WTAppleSnapshot?.();
    return s&&Number.isInteger(s.week)&&Array.isArray(s.picks)?s:null;
  }catch{return null;}}
  function sourceLink(week){
    try{
      const saved=safeUrl(localStorage.getItem(STORAGE+week));
      if(saved)return {url:saved,custom:true};
    }catch{}
    return {url:new URL(FORM_URL),custom:false};
  }
  function prepared(s){
    const selected=sourceLink(s.week);
    const u=selected.url;
    const mappings=new Map(),usedGames=new Set();
    let totalQuestions=0,marginKey=null,marginExample=null;
    if(s.week===VERIFIED_WEEK&&!selected.custom){
      // A complete and independently checked 2026 Week 9 field-to-fixture map.
      // This mapping remains correct when the user selects the other team.
      for(const [key,originalTeam] of WEEK9_FIELDS){
        const matching=s.picks.filter(g=>g.away===originalTeam||g.home===originalTeam);
        if(matching.length!==1)continue;
        const game=matching[0],id=[game.away,game.home].sort().join("-");
        if(usedGames.has(id))continue;
        usedGames.add(id);
        mappings.set(key,{game,example:JSON.stringify(TEAMS[originalTeam][1])});
      }
      if(mappings.size===WEEK9_FIELDS.length&&s.picks.length===WEEK9_FIELDS.length){
        u.searchParams.set(PARTICIPANT_FIELD,"WHOLETHANGER");
        u.searchParams.set(PAYMENT_FIELD,PAYMENT_VALUE);
        marginKey=MARGIN_FIELD;
        marginExample=JSON.stringify(JSON.stringify({Answer:"3",IsMath:true}));
        totalQuestions=WEEK9_FIELDS.length+3;
      }else{
        // Never generate partial, potentially mismatched picks silently.
        mappings.clear();
      }
    }else if(selected.custom){
      const numeric=[];
      const entries=[...u.searchParams.entries()].filter(([key])=>/^r[a-f0-9]{32}$/i.test(key));
      totalQuestions=entries.length;
      for(const [key,value] of entries){
        const sample=answerValue(value);
        const team=teamFromAnswer(sample.value);
        if(!team){
          if(sample.kind==="math"||/^\\d{1,3}$/.test(sample.value))numeric.push([key,value]);
          continue;
        }
        const matching=s.picks.filter(g=>g.away===team||g.home===team);
        if(matching.length!==1)continue;
        const game=matching[0],id=[game.away,game.home].sort().join("-");
        if(usedGames.has(id))continue;
        usedGames.add(id);
        mappings.set(key,{game,example:value});
      }
      if(numeric.length===1){[marginKey,marginExample]=numeric[0];}
    }
    let mapped=0;
    for(const [key,{game,example}] of mappings){
      if(!game.choice){u.searchParams.delete(key);continue;}
      const value=formatChoice(game.choice,example);
      if(value!==null){u.searchParams.set(key,value);mapped++;}
    }
    let marginMapped=false;
    if(marginKey){
      if(s.mnfMargin!==""&&s.mnfMargin!==null){
        u.searchParams.set(marginKey,marginValue(s.mnfMargin,marginExample));
        marginMapped=true;
      }else{
        u.searchParams.delete(marginKey);
      }
    }
    return {url:u.href,mapped,questions:mappings.size,
      marginMapped,total:s.picks.length,sampleCount:totalQuestions,
      autoConfigured:s.week===VERIFIED_WEEK&&!selected.custom&&mappings.size===WEEK9_FIELDS.length};
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
      link.mapped+" picks ready": "Microsoft Forms"));
    panel.append(head);
    const actions=$("div","wt-family-actions");
    const reveal=button(open?"Hide Microsoft Form":"Review & Submit Family Picks","toggle",true);
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
        " matchups prepared for Microsoft Forms. Review answers before submitting."+
        (link.marginMapped?" Monday Night margin is included.":"")));
    }else{
      panel.append($("p","wt-family-small",
        "This week has no verified matchup mapping yet. Open the official form or add this week’s generated pre-filled response URL below."));
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
        s.week===VERIFIED_WEEK?"Week 9 is already connected. Leave this blank to use the verified mapping.":"Only use a pre-filled respondent link for THIS week. If the form questions change, do not reuse an earlier link. Form links are saved on this device."));
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
