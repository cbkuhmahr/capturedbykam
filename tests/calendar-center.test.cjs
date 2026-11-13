"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const handler = require("../lib/whole-thang-work-calendar");
const root = path.join(__dirname, "..");
const calendar = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n";
function response() {
  return {
    statusCode:200,headers:{},body:"",
    setHeader(key,value){this.headers[key]=value;return this;},
    status(code){this.statusCode=code;return this;},
    end(body=""){this.body=body;return this;},
    send(body){this.body=body;return this;},
    json(body){this.body=body;return this;}
  };
}
test("Calendar Center is linked only inside the authenticated Sports page",() => {
  const page=fs.readFileSync(path.join(root,"lib/whole-thang-page.js"),"utf8");
  assert.match(page,/id="wt-calendar-center-open"/);
  assert.match(page,/whole-thang-calendar-center\.js/);
  assert.match(page,/whole-thang-calendar-center\.css/);
  assert.match(page,/id="wt-shifts-open"/);
});
test("Reject malformed subscription tokens",async () => {
  const res=response();
  await handler({method:"GET",query:{kind:"miles",feed:"not-a-token"}},res);
  assert.equal(res.statusCode,404);
});
test("Miles uses the existing Vercel calendar function rather than a new function",async () => {
  const before=global.fetch, urls=[];
  global.fetch=async url => { urls.push(String(url)); return {ok:true,status:200,text:async()=>calendar}; };
  try {
    const res=response();
    await handler({method:"GET",query:{kind:"miles",feed:"a".repeat(64)}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body,calendar);
    assert.match(res.headers["Content-Disposition"],/Miles_Whitmer_Basketball\.ics/);
    assert.match(urls[0],/cbk-family-calendar\?feed=/);
  } finally { global.fetch=before; }
});
test("Existing work calendar feed remains routed to its original backend",async () => {
  const before=global.fetch, urls=[];
  global.fetch=async url => { urls.push(String(url)); return {ok:true,status:200,text:async()=>calendar}; };
  try {
    const res=response();
    await handler({method:"GET",query:{feed:"a".repeat(64)}},res);
    assert.equal(res.statusCode,200);
    assert.match(res.headers["Content-Disposition"],/Mimi_Work_Schedule\.ics/);
    assert.match(urls[0],/whole-thang-work-calendar\?feed=/);
  } finally { global.fetch=before; }
});
test("Games load forwards through authenticated family calendar route",async () => {
  const before=global.fetch, urls=[];
  global.fetch=async url => { urls.push(String(url)); return {ok:true,status:200,json:async()=>({games:[],revision:"test",feedUrl:"test"})}; };
  try {
    const res=response();
    await handler({method:"POST",query:{},
      headers:{host:"www.capturedbykam.com",origin:"https://www.capturedbykam.com",
        cookie:"cbk_admin_session="+"a".repeat(64)},
      body:{action:"loadGames"}},res);
    assert.equal(res.statusCode,200);
    assert.match(urls[0],/cbk-family-calendar$/);
  } finally {global.fetch=before;}
});
test("Unauthenticated game changes are refused",async () => {
  const res=response();
  await handler({method:"POST",query:{},headers:{host:"www.capturedbykam.com",
    origin:"https://www.capturedbykam.com"},body:{action:"saveGames",games:[]}},res);
  assert.equal(res.statusCode,401);
});
test("Clear month saves an empty schedule before rerendering",() => {
  const src=fs.readFileSync(path.join(root,"assets/js/whole-thang-work-shifts.js"),"utf8");
  assert.match(src,/selections = \{\};\s+queueSave\(\);\s+render\(\);/);
  assert.match(src,/window\.confirm\("Your online calendar is empty/);
});
