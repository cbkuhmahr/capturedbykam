(() => {
"use strict";
const header=document.querySelector(".wt-top-actions");
if(!header || document.getElementById("wt-apple-open")) return;
const launch=document.createElement("button");
launch.id="wt-apple-open";
launch.type="button";
launch.className="admin-link wt-apple-launch";
launch.textContent="↗ Apple";
header.insertBefore(launch,header.querySelector("a"));
const shade=document.createElement("div");
shade.className="wt-apple-shade";
shade.hidden=true;
const panel=document.createElement("section");
panel.className="wt-apple-drawer";
panel.setAttribute("role","dialog");
panel.setAttribute("aria-modal","true");
panel.setAttribute("aria-label","Apple sharing, Calendar and Contacts");
panel.hidden=true;
panel.innerHTML=[
'<div class="wt-apple-top"><div><small>APPLE / CONNECT</small><h2>Share & Connect</h2></div><button class="wt-apple-close" data-apple="close" type="button" aria-label="Close sharing panel">×</button></div>',
'<div class="wt-apple-scroll">',
'<section class="wt-apple-section"><h3>01 / Messages</h3><p>Send your picks and verified results through the iPhone share sheet. Select Messages, then choose a recipient from your iPhone Contacts. Nothing is sent without your approval.</p>',
'<div class="wt-apple-actions"><button class="wt-apple-btn primary" data-apple="picks" type="button">Share current picks</button><button class="wt-apple-btn" data-apple="season" type="button">Share season record</button></div>',
'<label class="wt-apple-label" for="wt-share-week">Weekly results</label><div class="wt-apple-inline"><select id="wt-share-week"><option value="5">Week 5</option><option value="4">Week 4</option><option value="3">Week 3</option><option value="2">Week 2</option><option value="1">Week 1</option></select><button type="button" class="wt-apple-btn" data-apple="week">Share results</button></div>',
'<div class="wt-apple-inline wt-apple-secondary"><button class="wt-apple-btn" data-apple="messages" type="button">Open Messages composer</button><button class="wt-apple-btn" data-apple="copy" type="button">Copy current summary</button></div></section>',
'<section class="wt-apple-section"><h3>02 / Apple Calendar</h3><p>Subscribe to the current NFL schedule and official pick deadline. Calendar handles updates to this feed when future schedules are published. Your appointments and private picks are never accessible to this subscription.</p>',
'<div class="wt-apple-actions"><a class="wt-apple-btn primary" href="webcal://www.capturedbykam.com/api/whole-thang-calendar" id="wt-calendar-subscribe">Subscribe in Apple Calendar</a><a class="wt-apple-btn" href="/api/whole-thang-calendar" target="_blank" rel="noopener">Open .ics calendar</a></div>',
'<small class="wt-apple-tip">On iPhone, tap Subscribe. If the prompt does not appear, copy the calendar URL and use Calendar → Calendars → Add Calendar → Add Subscription Calendar.</small></section>',
'<section class="wt-apple-section"><h3>03 / Contacts</h3><p>For Messages, your iPhone lets you choose recipients from Contacts directly. To choose someone before opening Messages, use a supported contact picker or import a vCard file on this device.</p>',
'<div class="wt-apple-actions"><button type="button" class="wt-apple-btn primary" data-apple="pick-contact">Choose a contact</button><label class="wt-apple-btn wt-apple-file">Import .vcf on this device<input type="file" id="wt-apple-vcf" accept=".vcf,text/vcard,text/x-vcard" hidden></label></div>',
'<div class="wt-apple-inline wt-apple-contact-line"><select aria-label="Selected contact" id="wt-apple-contacts"><option value="">Select a contact</option></select><button type="button" class="wt-apple-btn" data-apple="message-contact">Message contact</button></div>',
'<small class="wt-apple-tip">Contacts are used only in this browser tab. They are not uploaded, saved to the database, or automatically messaged. iPhone Safari does not provide dependable full iCloud Contacts synchronization.</small></section>',
'<p class="wt-apple-status" role="status" aria-live="polite" id="wt-apple-status">Ready to share.</p>',
'</div>'
].join("");
document.body.append(shade,panel);
let isOpen=false;
let contacts=[];
let current="picks";
const status=panel.querySelector("#wt-apple-status");
const weekSelect=panel.querySelector("#wt-share-week");
const contactSelect=panel.querySelector("#wt-apple-contacts");
function note(msg){status.textContent=msg;}
function snapshot(){
 if(typeof window.WTAppleSnapshot!=="function") throw Error("Pick data is not ready yet.");
 return window.WTAppleSnapshot();
}
function pickText(){
 const s=snapshot();
 const lines=["$billi-type uh’day. | Scott Family NFL Pick'em | Week "+s.week,"Whole Thang picks",""];
 for(const g of s.picks)lines.push(g.away+" @ "+g.home+": "+(g.choice||"Not selected"));
 lines.push("","Selected: "+s.picks.filter(g=>g.choice).length+" / "+s.picks.length);
 if(s.mnfMargin!=="" && s.mnfMargin!==null)lines.push("MNF predicted margin: "+s.mnfMargin);
 lines.push("","Unofficial copy — the family's Microsoft Form is still the official submission.");
 return lines.join("\n");
}
function seasonText(){
 const s=snapshot(),r=s.season;
 const lines=["$billi-type uh’day. | Whole Thang | 2026 NFL Pick'em",
  "Season through Week "+Math.max(...s.weeks.map(w=>Number(w.week)))+": "+r.wins+"–"+r.losses+"–"+r.ties+"T",
  "Winning percentage: "+r.accuracy+"%",""];
 for(const w of s.weeks)lines.push("Week "+w.week+": "+w.record+" ("+Number(w.rate).toFixed(2)+"%)");
 return lines.join("\n");
}
function weekText(){
 const s=snapshot(),week=Number(weekSelect.value);
 const w=s.weeks.find(x=>x.week===week);
 if(!w)throw Error("Weekly results unavailable");
 const lines=["$billi-type uh’day. | Whole Thang | Week "+week+" results",
  "Record: "+w.record+" | Accuracy "+Number(w.rate).toFixed(2)+"%",""];
 for(const g of w.games)
  lines.push(g.away+" @ "+g.home+" | Pick: "+g.pick+" | Final: "+g.awayScore+"-"+g.homeScore+" | "+(g.status==="W"?"WIN":g.status==="L"?"LOSS":"TIE"));
 return lines.join("\n");
}
function composed(){return current==="season"?seasonText():current==="week"?weekText():pickText();}
function setOpen(open){
 isOpen=!!open;
 shade.hidden=!isOpen;
 panel.hidden=!isOpen;
 document.body.classList.toggle("wt-apple-open",isOpen);
 if(isOpen){note("Ready to share.");panel.querySelector(".wt-apple-close").focus();}
 else launch.focus();
}
async function shareCurrent(kind){
 current=kind;
 let text, title;
 try{text=composed();title=kind==="picks"?"Whole Thang Week "+snapshot().week+" picks":kind==="week"?"Whole Thang weekly results":"Whole Thang season results";}
 catch(err){note(err.message);return;}
 if(typeof navigator.share==="function"){
  try{await navigator.share({title,text});note("Share sheet opened. Messages controls the recipient and sending.");}
  catch(err){if(err.name!=="AbortError")note("Native sharing was unavailable. Use Copy or Open Messages.");}
 }else{
  try{await navigator.clipboard.writeText(text);note("Summary copied. Paste it into Apple Messages.");}
  catch{note("Sharing is unavailable in this browser; try Safari on your iPhone.");}
 }
}
function openMessages(text,recipient=""){
 // On iPhone, SMS opens the actual Messages app and its own contact chooser.
 // Message-body deep linking is best-effort; Apple may omit the prefilled text.
 const safe=String(recipient).replace(/[^0-9+]/g,"");
 if(recipient && (!/^\+?\d{7,16}$/.test(safe)))throw Error("Select a valid phone number.");
 const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const isAndroid=/Android/i.test(navigator.userAgent);
 if(isIOS || isAndroid){
  window.location.href="sms:"+safe+(isIOS?"?&body=":"?body=")+encodeURIComponent(text);
  note("Messages opened. Choose or confirm your recipient and send.");
 }else{
  navigator.clipboard?.writeText(text).then(()=>note("Text copied. Open Messages on your Apple device and paste."),()=>note("Open this page on your iPhone to use Messages."));
 }
}
function addContact(name,tel){
 const number=String(tel||"").replace(/[^0-9+]/g,"");
 if(!/^\+?\d{7,16}$/.test(number))return false;
 if(contacts.some(c=>c.phone===number))return false;
 contacts.push({name:String(name||"Contact").trim().slice(0,90),phone:number});
 const option=document.createElement("option");
 option.value=String(contacts.length-1);
 option.textContent=contacts.at(-1).name+" · "+number;
 contactSelect.append(option);
 contactSelect.value=option.value;
 return true;
}
function importVcards(src){
 // Parse only FN / TEL. Contact details remain entirely in browser memory.
 const lines=src.replace(/\r?\n[ \t]/g,"").split(/\r?\n/);
 let person=null,count=0;
 for(const line of lines){
  if(/^BEGIN:VCARD/i.test(line)){person={name:"",tel:""};continue;}
  if(!person)continue;
  if(/^FN(?:;[^:]*)?:/i.test(line))person.name=line.slice(line.indexOf(":")+1).replace(/\\,/g,",").replace(/\\n/gi," ");
  else if(/^TEL(?:;[^:]*)?:/i.test(line) && !person.tel)person.tel=line.slice(line.indexOf(":")+1);
  else if(/^END:VCARD/i.test(line)){if(addContact(person.name,person.tel))count++;person=null;}
  if(count>=250)break;
 }
 return count;
}
launch.addEventListener("click",()=>setOpen(!isOpen));
shade.addEventListener("click",()=>setOpen(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&isOpen)setOpen(false);});
panel.addEventListener("click",async e=>{
 const b=e.target.closest("[data-apple]");
 if(!b)return;
 const action=b.dataset.apple;
 if(action==="close"){setOpen(false);return;}
 if(["picks","week","season"].includes(action)){await shareCurrent(action);return;}
 if(action==="copy"){
  try{await navigator.clipboard.writeText(composed());note("Copied. Paste into Messages.");}
  catch(err){note("Copy failed: "+err.message);}return;
 }
 if(action==="messages"){
  try{openMessages(composed());}catch(err){note(err.message);}return;
 }
 if(action==="pick-contact"){
  if(!navigator.contacts?.select){note("Apple Safari does not offer a webpage contact picker. Use Messages to choose a recipient, or import a .vcf here.");return;}
  try{
   const entries=await navigator.contacts.select(["name","tel"],{multiple:false});
   let count=0;
   for(const item of entries||[])if(addContact(item.name?.[0],item.tel?.[0]))count++;
   note(count?"Contact selected.":"No phone contact selected.");
  }catch(err){note("Contact picker unavailable. Use Messages directly or import a .vcf.");}
  return;
 }
 if(action==="message-contact"){
  const contact=contactSelect.value === "" ? null : contacts[Number(contactSelect.value)];
  if(!contact){note("Select or import a contact first.");return;}
  try{openMessages(composed(),contact.phone);}catch(err){note(err.message);}
 }
});
panel.querySelector("#wt-apple-vcf").addEventListener("change",async e=>{
 const file=e.target.files?.[0];
 if(!file)return;
 if(file.size>2*1024*1024){note("Please choose a vCard smaller than 2 MB.");e.target.value="";return;}
 try{
  const count=importVcards(await file.text());
  note(count?count+" local contact"+(count===1?"":"s")+" added. Nothing was uploaded.":"No telephone contacts found in that vCard.");
 }catch{note("The vCard could not be read.");}
 e.target.value="";
});
})();