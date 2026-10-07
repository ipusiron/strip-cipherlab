import test from "node:test";
import assert from "node:assert/strict";
import { read, load } from "./load.js";

const { MESSAGES, t } = load("js/messages.js").StripMessages;
const I18N = load("js/i18n.js").StripI18n;
const html = read("index.html");
const script = read("script.js");
const JAPANESE = new RegExp("[" + [[0x3040, 0x30ff], [0x3400, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCharCode(a) + "-" + String.fromCharCode(b)).join("") + "]");
const placeholders = (s) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(",");

test("日本語と英語の辞書は同じキーを持ち、置き場所（{name}）もそろう", () => {
  const ja = Object.keys(MESSAGES.ja);
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), [...ja].sort());
  for (const k of ja) assert.equal(placeholders(MESSAGES.en[k]), placeholders(MESSAGES.ja[k]), k);
  assert.ok(ja.length >= 140, String(ja.length));
});

test("英語の文言に日本語の文字がない", () => {
  for (const [k, v] of Object.entries(MESSAGES.en)) assert.doesNotMatch(v, JAPANESE, k);
  assert.equal(t("en", "group.label", { n: 2, total: 3 }), "Group 2/3");
});

test("index.html の data-i18n の文字・data-i18n-attr の属性は、日本語の辞書と同じ", () => {
  const texts = [...html.matchAll(/data-i18n="([\w.]+)"[^>]*>([^<]*)</g)];
  assert.ok(texts.length >= 75, String(texts.length));
  for (const [, key, text] of texts) assert.equal(text, MESSAGES.ja[key], key);
  const attrs = [...html.matchAll(/<[^>]*data-i18n-attr="([^"]+)"[^>]*>/g)];
  assert.ok(attrs.length >= 15, String(attrs.length));
  for (const [tag, spec] of attrs) {
    for (const part of spec.split(";")) {
      const [attr, key] = part.split(":");
      const m = tag.match(new RegExp(`\\s${attr}="([^"]*)"`));
      assert.ok(m, `${key} ${attr}`);
      assert.equal(m[1], MESSAGES.ja[key], key);
    }
  }
  // 日本語の文字を含む要素は、すべて data-i18n で訳せる（noscript とコメントと title を除く）
  const body = html.split("<body>")[1].replace(/<noscript>[\s\S]*?<\/noscript>/, "").replace(/<!--[\s\S]*?-->/g, "");
  const bare = [...body.matchAll(/<([a-z0-9]+)(?![^>]*data-i18n)[^>]*>([^<]*)</g)].filter(([, , text]) => JAPANESE.test(text));
  assert.deepEqual(bare.map((m) => m[0]), []);
  const tags = [...body.matchAll(/<[a-z][^>]*>/g)].map((m) => m[0]);
  for (const tag of tags) {
    for (const [, attr, v] of tag.matchAll(/\s(placeholder|aria-label)="([^"]*)"/g)) {
      if (JAPANESE.test(v)) assert.match(tag, new RegExp(`data-i18n-attr="[^"]*${attr}:`), tag);
    }
  }
});

test("script.js が引くキーは、日英どちらの辞書にもある", () => {
  const keys = [...script.matchAll(/(?<![\w.])t\("([\w.]*\w)"/g)].map((m) => m[1]);
  for (const k of keys) {
    assert.ok(k in MESSAGES.ja, k);
    assert.ok(k in MESSAGES.en, k);
  }
});

test("初期の言語: ?lang= → 保存した選択 → ブラウザーの言語（日本語以外は英語）", () => {
  assert.equal(I18N.initialLanguage("?lang=en", "ja", ["ja-JP"]), "en");
  assert.equal(I18N.initialLanguage("?x=1&lang=ja", "en", ["en-US"]), "ja");
  assert.equal(I18N.initialLanguage("", "en", ["ja-JP"]), "en");
  assert.equal(I18N.initialLanguage("", null, ["ja-JP", "en"]), "ja");
  assert.equal(I18N.initialLanguage("", "fr", ["fr-FR"]), "en");
  assert.equal(I18N.initialLanguage("?lang=de", null, []), "en");
  assert.equal(I18N.fromQuery("?language=en"), null);
});
