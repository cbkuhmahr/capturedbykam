// Run: node --test tests/function-budget-and-gallery-traffic.test.cjs
"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(base,p),"utf8");
const rewrites=JSON.parse(read("vercel.json")).rewrites;
test("Hobby project has no more than ten directly deployed API functions",()=>{
 const files=fs.readdirSync(path.join(base,"api")).filter(n=>n.endsWith(".js"));
 assert.ok(files.length<=10, "Expected 10 or fewer functions; found "+files.length);
 assert.equal(files.includes("nfl-game.js"),false);
 assert.equal(files.includes("nfl-standings.js"),false);
});
test("Existing sports URLs are served via rewrites",()=>{
 for(const [source,mode] of [["/api/nfl-game","game"],["/api/nfl-standings","standings"]]){
  const found=rewrites.find(r=>r.source===source);
  assert.equal(found?.destination,"/api/nfl-scores?mode="+mode);
 }
});
test("All consolidated sports handlers retain their exported API shape",()=>{
 for(const file of ["lib/nfl-game.js","lib/nfl-standings.js"]){
  const handler=require(path.join(base,file));
  assert.equal(typeof handler,"function");
 }
});
test("Unified sports router still dispatches to each specialist handler",async()=>{
 const router=require(path.join(base,"api/nfl-scores.js"));
 const res={
  headers:{},
  status(code){this.code=code;return this;},
  setHeader(k,v){this.headers[k]=v;return this;},
  json(v){this.body=v;return this;}
 };
 for(const [mode,invalid] of [["game","Invalid game"],["standings",null]]){
  if(mode==="game"){
   await router({method:"GET",query:{mode,event:"bad"}},res);
   assert.equal(res.code,400);assert.equal(res.body.error,invalid);
  }else{
   await router({method:"POST",query:{mode}},res);
   assert.equal(res.code,405);
  }
 }
});
test("Gallery and shop refresh only when visible, with manual actions preserved",()=>{
 const gallery=read("assets/js/gallery.js"),shop=read("assets/js/shop.js");
 assert.match(gallery,/window\.setInterval\([\s\S]*?180000\)/);
 assert.match(shop,/window\.setInterval\([\s\S]*?180000\)/);
 assert.match(gallery,/refreshPhotosButton\?\.addEventListener\("click"/);
 assert.match(shop,/refresh\?\.addEventListener\("click",\s*loadProjects/);
});
