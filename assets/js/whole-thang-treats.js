(() => {
"use strict";
/* Public treats! cover/editorial previews and Vimeo embeds. No downloaded or paid content. */
const CDN="https://treatsmagazine.com/cdn/shop/";
const PRINT="https://treatsmagazine.com/collections/print-magazine";
const DIGITAL="https://treatsmagazine.com/collections/digital-magazine";
const ARTICLE="https://treatsmagazine.com/blogs/articles/";
const im=(title,section,path,url)=>({kind:"image",title,section,url,src:CDN+path});
const vid=(title,id)=>({kind:"video",title,section:"Film",url:"https://vimeo.com/"+id,id});
const ITEMS=[
 im("Josh Ryan · Issue 13","Print","files/josh_ryan_issue_13.png?v=1745021445&width=533",PRINT),
 im("Erin Cummins · Issue 13","Print","files/erin_cummins_sonny_treats_issue_13.png?v=1744782287&width=533",PRINT),
 im("Jessica Goicoechea · Issue 13","Print","files/jessica_goi_treats_issue_13.png?v=1744781860&width=533",PRINT),
 im("Viki Odintcova · Issue 13","Print","files/viki_odintcova_mavrin_treats_issue-10.png?v=1744782369&width=533",PRINT),
 im("Dylan Penn · Issue 7","Print","files/dylan_penn_treats_issue7.png?v=1743395321&width=533",PRINT),
 im("Sessilee Lopez · Issue 4","Print","files/issue4new.png?v=1745007268&width=533",PRINT),
 im("Steve Shaw · Issue 13","Print","files/steve_shaw_gillian_nation_treats_issue_13.png?v=1744782263&width=533",PRINT),
 im("Xenia Deli · Issue 5","Print","files/xenia_deli_samuel_bayer_treats_issue_5.png?v=1762139910&width=533",PRINT),
 im("Issue 1 · Digital cover","Digital","files/treats_issue_one.png?v=1755554377&width=533",DIGITAL),
 im("Anna Herrin · Issue 10","Digital","files/anna_herrin_ben_watts_treats_magazine_issue_10.png?v=1753362419&width=533",DIGITAL),
 im("Rachel Cook · Issue 10","Digital","files/rachel_cook_robert_voltaire_treats_magazine_issue_10.png?v=1753362419&width=533",DIGITAL),
 im("The Fat Jewish · Issue 11","Digital","files/treats_issue_11_the__fat_jewish.png?v=1753141318&width=533",DIGITAL),
 im("Issue 12 · Digital cover","Digital","files/iPad_Pro_Mockup_copy.png?v=1753141014&width=533",DIGITAL),
 im("Erin Cummins · Issue 13 digital","Digital","files/erin_cummins_treats_magazine_issue_13_01.png?v=1753130195&width=533",DIGITAL),
 im("Lou Lou Roberts · Issue 2","Digital","files/lou_lou_roberts_treats_magazine_issue_2_ca555fab-69d7-46f3-9408-c3d48e1b7bf3.png?v=1745024594&width=533",DIGITAL),
 im("Emily Ratajkowski · Issue 3","Digital","files/emily_ratajkowski_treats_issue_3_steve_shaw.png?v=1753140123&width=533",DIGITAL),
 im("Kelsie Smeby · Editorial","Editorial","articles/Screen_Shot_2026-02-11_at_5.28.54_PM.png?v=1778894678&width=533",ARTICLE+"kelsie-smeby-the-discipline-behind-the-beauty"),
 im("Treats! to Playboy · Editorial","Editorial","articles/Screen_Shot_2026-02-11_at_5.08.11_PM.png?v=1770859043&width=533",ARTICLE+"treats-cover-to-playboy-cover"),
 im("Treats+ · Creators platform","Editorial","articles/Screen_Shot_2026-02-11_at_4.07.08_PM_ee364258-2bfd-472f-9e22-c74e1e85cba5.png?v=1780108137&width=533",ARTICLE+"treats-plus-creators-platform"),
 im("Bares It All · Book preview","Editorial","articles/treats_bares_it_all_book_01_2d336904-1740-4dae-8a8c-0b4f20b95a6a.jpg?v=1778895011&width=533",ARTICLE+"could-this-be-the-only-book-on-your-coffee-table-you-actually-open"),
 im("Erin Cummins · Portrait","Editorial","articles/erin_cummins_treats_magazine_14_0244286a-1869-4082-8064-0259c23a639b.jpg?v=1770857380&width=533",ARTICLE+"meet-model-erin-cummins"),
 im("Bares It All · Collection","Editorial","articles/tati_treats_magazine_bares_it_all_book_02.png?v=1753265464&width=533",ARTICLE+"treats-bares-it-all-book-1"),
 vid("Ben Watts · Issue 1 shoot","20688767"),
 vid("Ben Watts · Issue 2 shoot","30574848"),
 vid("Samuel Bayer · Audra Marie","63860325"),
 vid("Issue 4 · Sessilee Lopez","77826792"),
 vid("Ben Watts · Behind the scenes","78586399")
];
const nav=document.querySelector(".wt-top-actions");
if(!nav || document.getElementById("wt-treats-launch"))return;
const launch=document.createElement("button");
launch.id="wt-treats-launch";launch.className="admin-link wt-treats-launch";launch.type="button";
launch.textContent="Art";launch.setAttribute("aria-label","Open 18-plus treats! fine-art viewer");
launch.setAttribute("aria-expanded","false");
nav.insertBefore(launch,nav.querySelector("a.admin-link"));
const shade=document.createElement("div");shade.className="wt-treats-shade";shade.hidden=true;
const panel=document.createElement("section");panel.className="wt-treats-panel";panel.hidden=true;
panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");
panel.setAttribute("aria-label","18-plus treats! fine-art preview viewer");
panel.innerHTML=[
'<header class="wt-treats-header"><div><small>PRIVATE LOUNGE · 18+</small><h2>treats! / Art Viewer</h2></div><button class="wt-treats-close" type="button" data-action="close" aria-label="Close viewer">×</button></header>',
'<div class="wt-treats-gate"><div class="wt-treats-gate-card"><small>ADULT CONTENT</small><h3>View fine-art photography?</h3><p>Publisher previews can include artistic nudity. This gallery is separate from your NFL picks and CBK photo store.</p><div class="wt-treats-controls"><button class="wt-treats-btn gold" type="button" data-action="confirm">I am 18 or older</button><button class="wt-treats-btn" type="button" data-action="close">Cancel</button></div></div></div>',
'<div class="wt-treats-content" hidden>',
'<nav class="wt-treats-filters" aria-label="Preview filters"><button type="button" data-filter="all" class="active" aria-pressed="true">All · 27</button><button type="button" data-filter="image" aria-pressed="false">Photos · 22</button><button type="button" data-filter="video" aria-pressed="false">Films · 5</button></nav>',
'<div class="wt-treats-stage"><img class="wt-treats-image" alt=""><div class="wt-treats-player" hidden></div><div class="wt-treats-error" hidden>Preview unavailable at publisher. Open the source to view it.</div>',
'<button class="wt-treats-arrow left" type="button" data-action="prev" aria-label="Previous image">‹</button><button class="wt-treats-arrow right" type="button" data-action="next" aria-label="Next image">›</button></div>',
'<div class="wt-treats-caption"><div><small class="wt-treats-count"></small><h3 class="wt-treats-title"></h3><p class="wt-treats-label"></p></div><a class="wt-treats-source" target="_blank" rel="noopener noreferrer">View at publisher ↗</a></div>',
'<div class="wt-treats-footer"><div class="wt-treats-controls"><button class="wt-treats-btn" type="button" data-action="prev">Previous</button><button class="wt-treats-btn gold" type="button" data-action="cycle">Pause cycle</button><button class="wt-treats-btn" type="button" data-action="next">Next</button></div>',
'<p>Free cover and article previews; full digital issues cost extra. The photos are served from treats!’ own website. Vimeo films play only where their owners permit embedding. This independent viewer is not affiliated with treats! Magazine.</p></div>',
'</div>'
].join("");
document.body.append(shade,panel);
const get=sel=>panel.querySelector(sel);
const gate=get(".wt-treats-gate"),content=get(".wt-treats-content"),stage=get(".wt-treats-stage");
const picture=get(".wt-treats-image"),player=get(".wt-treats-player"),error=get(".wt-treats-error");
const count=get(".wt-treats-count"),title=get(".wt-treats-title"),label=get(".wt-treats-label"),source=get(".wt-treats-source");
let open=false,filter="all",idx=0,cycle=true,timer=null;
function confirmed(){try{return sessionStorage.getItem("wt-treats-18")==="yes"}catch{return false}}
function allow(){try{sessionStorage.setItem("wt-treats-18","yes")}catch{}}
function list(){return ITEMS.map((v,i)=>({v,i})).filter(x=>filter==="all"||x.v.kind===filter)}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function syncTimer(){
 stopTimer();
 const btn=get('[data-action="cycle"]');
 btn.textContent=cycle?"Pause cycle":"Play cycle";
 btn.setAttribute("aria-pressed",String(cycle));
 if(open&&gate.hidden&&cycle&&!document.hidden&&ITEMS[idx].kind==="image")
   timer=setInterval(()=>advance(1,true),7500);
}
function show(){
 const item=ITEMS[idx],available=list(),order=available.findIndex(x=>x.i===idx);
 count.textContent=String(Math.max(1,order+1)).padStart(2,"0")+" / "+String(available.length).padStart(2,"0");
 title.textContent=item.title;label.textContent=item.section+" · "+(item.kind==="image"?"Public preview":"Public Vimeo feature");
 source.href=item.url;source.textContent=item.kind==="image"?"View at treats! ↗":"Open on Vimeo ↗";
 picture.hidden=true;picture.removeAttribute("src");picture.onerror=null;player.hidden=true;player.replaceChildren();error.hidden=true;
 if(item.kind==="image"){
   picture.alt="treats! magazine public preview — "+item.title;
   picture.onerror=()=>{if(ITEMS[idx]===item){picture.hidden=true;error.hidden=false}};
   picture.src=item.src;picture.hidden=false;
 }else{
   const frame=document.createElement("iframe");
   frame.src="https://player.vimeo.com/video/"+item.id+"?dnt=1";
   frame.title=item.title+" on Vimeo";frame.loading="lazy";
   frame.allow="fullscreen; picture-in-picture; encrypted-media";
   frame.allowFullscreen=true;frame.referrerPolicy="strict-origin-when-cross-origin";
   player.append(frame);player.hidden=false;cycle=false;
 }
 syncTimer();
}
function advance(amount,automatic){
 const a=list();let current=a.findIndex(x=>x.i===idx);
 if(current<0)current=0;
 let target=(current+amount+a.length)%a.length;
 if(automatic&&filter==="all"){
   for(let tries=0;tries<a.length&&a[target].v.kind!=="image";tries++)target=(target+1)%a.length;
 }
 idx=a[target].i;show();
}
function toggle(yes){
 open=yes;shade.hidden=!yes;panel.hidden=!yes;
 document.body.classList.toggle("wt-treats-open",yes);
 launch.setAttribute("aria-expanded",String(yes));
 if(yes){
  gate.hidden=confirmed();content.hidden=!gate.hidden;
  if(gate.hidden){show();get(".wt-treats-close").focus()}
  else get('[data-action="confirm"]').focus();
 }else{
  stopTimer();player.replaceChildren();picture.removeAttribute("src");launch.focus();
 }
}
launch.addEventListener("click",()=>toggle(true));
shade.addEventListener("click",()=>toggle(false));
panel.addEventListener("click",e=>{
 const f=e.target.closest("[data-filter]");
 if(f){
  filter=f.dataset.filter;
  panel.querySelectorAll("[data-filter]").forEach(b=>{const yes=b===f;b.classList.toggle("active",yes);b.setAttribute("aria-pressed",String(yes))});
  idx=list()[0]?.i||0;cycle=ITEMS[idx].kind==="image";show();return;
 }
 const b=e.target.closest("[data-action]");if(!b)return;
 const act=b.dataset.action;
 if(act==="close")toggle(false);
 if(act==="confirm"){allow();gate.hidden=true;content.hidden=false;cycle=true;show()}
 if(act==="prev")advance(-1,false);
 if(act==="next")advance(1,false);
 if(act==="cycle"){
  cycle=!cycle;
  if(cycle&&ITEMS[idx].kind==="video"){
    filter="image";idx=0;
    panel.querySelectorAll("[data-filter]").forEach(x=>{let yes=x.dataset.filter==="image";x.classList.toggle("active",yes);x.setAttribute("aria-pressed",String(yes))});
    show();
  }else syncTimer();
 }
});
document.addEventListener("keydown",e=>{
 if(!open)return;
 if(e.key==="Escape"){e.preventDefault();toggle(false)}
 if(!gate.hidden)return;
 if(e.key==="ArrowLeft"){e.preventDefault();advance(-1,false)}
 if(e.key==="ArrowRight"){e.preventDefault();advance(1,false)}
});
document.addEventListener("visibilitychange",syncTimer);
})();