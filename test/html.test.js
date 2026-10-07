import test from "node:test";
import assert from "node:assert/strict";
import { read } from "./load.js";

const html = read("index.html");
const script = read("script.js");

test("meta CSP がある。'unsafe-inline' と frame-ancestors（meta では効かない）を含まない", () => {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, "CSP meta");
  const csp = m[1];
  for (const d of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
    assert.ok(csp.includes(d), d);
  }
  assert.ok(!csp.includes("unsafe-inline"));
  assert.ok(!csp.includes("unsafe-eval"));
  assert.ok(!csp.includes("frame-ancestors"));
  assert.match(html, /<meta name="referrer" content="no-referrer" \/>/);
  assert.match(html, /<link rel="icon" href="data:," \/>/);
  assert.match(html, /<html lang="ja">/);
});

test("インラインのイベントハンドラー・style 属性・インラインのスクリプトがない", () => {
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  for (const s of scripts) assert.equal(s[2].trim(), "", "inline script");
  assert.deepEqual(scripts.map((s) => s[1].match(/src="([^"]+)"/)[1]), ["./js/strip-core.js", "./js/english-data.js", "./js/messages.js", "./script.js"]);
  // JS で style 属性・innerHTML を使わない（CSSOM の setProperty は CSP の対象外）
  assert.doesNotMatch(script, /setAttribute\(\s*["']style/);
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
  assert.doesNotMatch(script, /console\.log/);
});

test("タブは WAI-ARIA のタブの形（tablist・tab・tabpanel の対応）", () => {
  assert.match(html, /<nav class="tabs" role="tablist"/);
  const TAB = new RegExp('<button type="button" class="tab-btn[^"]*" id="tab-(\\w+)" data-tab="(\\w+)" role="tab" '
    + 'aria-selected="(true|false)" aria-controls="(\\w+)"', "g");
  const tabs = [...html.matchAll(TAB)];
  assert.deepEqual(tabs.map((m) => m[1]), ["build", "frame", "enc", "dec", "study"]);
  for (const m of tabs) {
    assert.equal(m[2], m[1]);
    assert.equal(m[4], m[1]);
    assert.match(html, new RegExp(`<section id="${m[1]}" class="tab-panel[^"]*" role="tabpanel" aria-labelledby="tab-${m[1]}">`));
  }
  assert.equal(tabs.filter((m) => m[3] === "true").length, 1);
});

test("ボタンはすべて type=\"button\"。新しいタブで開くリンクには rel", () => {
  const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(buttons.length >= 20, String(buttons.length));
  for (const b of buttons) assert.match(b, /type="button"/, b);
  for (const a of html.match(/<a [^>]*target="_blank"[^>]*>/g) || []) assert.match(a, /rel="noopener noreferrer"/);
});

test("script.js が使う id はすべて index.html にある", () => {
  const ids = new Set([...script.matchAll(/\$\("#([A-Za-z][\w-]*)"\)/g)].map((m) => m[1]));
  assert.ok(ids.size >= 30, String(ids.size));
  for (const id of ids) assert.match(html, new RegExp(`id="${id}"`), id);
  // 群の切り替えは接頭辞（enc・dec）から組み立てる
  for (const p of ["enc", "dec"]) {
    for (const s of ["GroupLabel", "GroupPrev", "GroupNext", "GroupText"]) assert.match(html, new RegExp(`id="${p}${s}"`));
  }
});

test("状態の欄・警告・トーストは読み上げられる（role=status か aria-live）", () => {
  for (const id of ["genMsg", "validateMsg", "frameMsg", "toast"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*role="status" aria-live="polite"`), id);
  }
  for (const id of ["plainTextWarnings", "cipherInWarnings", "encGroupText", "decGroupText"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-live="polite"`), id);
  }
  // 入力欄には label が付いている
  for (const id of ["genCount", "passphrase", "stripsText", "useCount", "frameKey", "manualOrder", "plainText", "cipherText", "cipherIn", "plainOut"]) {
    assert.match(html, new RegExp(`<label for="${id}">`), id);
  }
});
