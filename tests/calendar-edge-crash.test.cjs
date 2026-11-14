"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
for (const slug of ["whole-thang-work-calendar","cbk-family-calendar"]) {
  test(slug + " does not shadow the native URL constructor", () => {
    const src = fs.readFileSync(path.join(root,"supabase/functions",slug,"index.ts"),"utf8");
    assert.match(src,/const SUPABASE_URL = Deno\.env\.get\("SUPABASE_URL"\)!;/);
    assert.match(src,/createClient\(SUPABASE_URL, KEY/);
    assert.match(src,/new URL\(req\.url\)/);
    assert.doesNotMatch(src,/\bconst URL\s*=/);
  });
}
test("Custom shift editor never reports a cloud save prematurely", () => {
  const src = fs.readFileSync(path.join(root,"assets/js/whole-thang-work-shifts.js"),"utf8");
  assert.doesNotMatch(src,/Saved\. Ends the following day/);
  assert.match(src,/Check cloud save status below/);
  assert.match(src,/Saved\. Tap Open Apple Calendar/);
});
