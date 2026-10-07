import test from "node:test";
import assert from "node:assert/strict";
import { read, load } from "./load.js";

const { MESSAGES, t, format } = load("js/messages.js").StripMessages;
const script = read("script.js");
const JAPANESE = new RegExp("[" + [[0x3040, 0x30ff], [0x3400, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCharCode(a) + "-" + String.fromCharCode(b)).join("") + "]");

test("script.js が引くキーは辞書にある（組み立てるキーも含む）", () => {
  // 「Messages.t("ja", …)」と、組み立てるキーの接頭辞（"frame.order." など）は除く
  const keys = [...script.matchAll(/(?<![\w.])t\("([\w.]*\w)"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 30, String(keys.length));
  for (const k of keys) assert.ok(k in MESSAGES.ja, k);
  for (const k of ["toast.cipherCopied", "toast.plainCopied", "window.cipherRow", "window.plainRow", "frame.keyEmpty", "frame.keyTooLong"]) {
    assert.ok(k in MESSAGES.ja, k);
  }
  for (const reason of ["empty", "notNumber", "outOfRange", "duplicate"]) assert.ok(("frame.order." + reason) in MESSAGES.ja, reason);
});

test("script.js の文字列リテラルに日本語がない（文言は辞書へ。コメントは可）", () => {
  const code = script.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ .*$/gm, "");
  const literals = [...code.matchAll(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g)].map((m) => m[0]);
  assert.ok(literals.length > 50, String(literals.length));
  for (const s of literals) assert.doesNotMatch(s, JAPANESE, s);
});

test("置き場所 {name} を埋める。ない値はそのまま残す", () => {
  assert.equal(t("ja", "group.label", { n: 2, total: 3 }), "群2/3");
  assert.equal(format("{a}-{b}", { a: 1 }), "1-{b}");
  assert.equal(t("ja", "no.such.key"), "no.such.key");
  for (const [k, v] of Object.entries(MESSAGES.ja)) assert.equal(typeof v, "string", k);
});
