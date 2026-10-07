import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { read, exists, core } from "./load.js";

const C = core();
const readme = read("README.md");
const ROOT = new URL("../", import.meta.url);

test("先頭の YAML メタデータ: 構造（キーの順・ブロック形式の一覧）と識別の値", () => {
  const yaml = readme.match(/^<!--\n---\n([\s\S]*?)\n---\n-->/);
  assert.ok(yaml, "YAML block");
  const keys = [...yaml[1].matchAll(/^([a-z_]+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys, ["id", "slug", "title", "subtitle_ja", "subtitle_en", "description_ja", "description_en",
    "category_ja", "category_en", "difficulty", "tags", "repo_url", "demo_url", "hub"]);
  for (const k of ["category_ja", "category_en", "tags"]) assert.match(yaml[1], new RegExp(`^${k}:\\n  - `, "m"), k);
  assert.match(yaml[1], /^id: day071$/m);
  assert.match(yaml[1], /^slug: strip-cipherlab$/m);
  assert.match(yaml[1], /^repo_url: "https:\/\/github.com\/ipusiron\/strip-cipherlab"$/m);
  assert.match(yaml[1], /^demo_url: "https:\/\/ipusiron.github.io\/strip-cipherlab\/"$/m);
  assert.match(yaml[1], /^hub: true$/m);
});

test("シリーズ標準の前半と後半（Day001〜100 は「100」と page_id=42163）", () => {
  assert.match(readme, /\n# Strip CipherLab - /);
  assert.match(readme, /\*\*Day071 - 生成AIで作るセキュリティツール100\*\*/);
  assert.match(readme, /https:\/\/akademeia.info\/\?page_id=42163/);
  assert.doesNotMatch(readme, /セキュリティツール200|page_id=44607/);
  const h2 = [...readme.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(h2.slice(0, 2), ["🌐 デモページ", "📸 スクリーンショット"]);
  assert.deepEqual(h2.slice(-4), ["📁 ディレクトリー構造", "💻 動作環境", "📄 ライセンス", "🛠️ このツールについて"]);
  for (const h of ["✨ 主な機能", "📖 使い方", "🎯 ユースケース", "🔒 セキュリティ", "🧪 テスト", "🔗 参考文献"]) assert.ok(h2.includes(h), h);
});

test("計算例: 合言葉 STRIP・鍵語 STRIP・段差 +7 の暗号文と、1群目の窓の行（計算部で再計算）", () => {
  const strips = C.passphraseStrips("STRIP", 5);
  const key = C.orderFromKeyword("STRIP", 5);
  assert.ok(readme.includes(`（装着順 ${key.ranks.join(" ")}）`));
  const plain = readme.match(/- 平文：([A-Z]+)/)[1];
  const cipher = readme.match(/- 暗号文：([A-Z]+)/)[1];
  assert.equal(C.encrypt(plain, strips, key.order, 7), cipher);
  assert.equal(C.decrypt(cipher, strips, key.order, 7), plain);
  const rows = [...readme.matchAll(/^\| (0（平文）|\+\d+) \| ([A-Z]+) \|$/gm)];
  assert.equal(rows.length, 8);
  const cols = C.windowColumns(plain.slice(0, 5), strips, key.order, "enc");
  for (const [, label, text] of rows) {
    const g = label.startsWith("0") ? 0 : Number(label);
    assert.equal(C.windowRow(cols, g), text, label);
  }
  // 復号の窓では、暗号文の群を最下段にそろえると7行上に平文の群が現れる
  const dec = C.windowColumns(cipher.slice(0, 5), strips, key.order, "dec");
  assert.equal(C.windowRow(dec, C.rowOfGap(7, "dec")), plain.slice(0, 5));
  assert.ok(readme.includes(`暗号文の ${cipher.slice(0, 5)} を最下段にそろえると、7行上に ${plain.slice(0, 5)} が現れます`));
});

test("装着順の例: 鍵語の割当を計算部で再計算する（14本・20本）", () => {
  const ex = [...readme.matchAll(/^例（(\d+)本）：.*`([A-Z]+)` → `([\d ]+)`$/gm)];
  assert.equal(ex.length, 2);
  for (const [, n, letters, ranks] of ex) {
    assert.equal(letters.length, Number(n));
    assert.equal(C.rankKeyword(letters).ranks.join(" "), ranks);
  }
  assert.equal(C.lettersOnly("The strip cipher the str"), "THESTRIPCIPHERTHESTR");
});

function walk(dir, base = "") {
  const out = [];
  for (const e of fs.readdirSync(new URL(dir, ROOT), { withFileTypes: true })) {
    if ([".git", ".claude", "node_modules"].includes(e.name)) continue;
    const rel = base + e.name;
    if (e.isDirectory()) { out.push(rel + "/"); out.push(...walk(dir + e.name + "/", rel + "/")); }
    else out.push(rel);
  }
  return out;
}

test("ディレクトリー構造: 全ファイルが載り、全行に説明がある（# の桁がそろう）", () => {
  const block = readme.match(/## 📁 ディレクトリー構造\n\n```\n([\s\S]*?)\n```/)[1].split("\n");
  assert.equal(block[0], "strip-cipherlab/");
  const lines = block.slice(1);
  const cols = new Set();
  const stack = [];
  const listed = [];
  for (const line of lines) {
    const m = line.match(/^((?:│   |    )*)(?:├── |└── )(\S+)\s+# \S/);
    assert.ok(m, line);
    cols.add(line.indexOf("#"));
    const depth = m[1].length / 4;
    stack.length = depth;
    stack.push(m[2]);
    listed.push(stack.join(""));
  }
  assert.equal(cols.size, 1, "# の桁");
  assert.deepEqual([...listed].sort(), walk("").sort());
});

test("画像: README の画像はすべて実在し、assets の PNG はすべて README から参照される", () => {
  const imgs = [...readme.matchAll(/!\[[^\]]*\]\(((?!https?:)[^)]+)\)/g)].map((m) => m[1]);
  assert.deepEqual(imgs, ["assets/screenshot.png", "assets/screenshot2.png", "assets/screenshot3.png"]);
  for (const f of imgs) assert.ok(exists(f), f);
  const pngs = fs.readdirSync(new URL("assets/", ROOT)).filter((f) => f.endsWith(".png")).map((f) => "assets/" + f);
  assert.deepEqual(pngs.sort(), [...imgs].sort());
});

test("表記: 長音・開く語・カ月。見出しと番号つきの箇条書きの形。強調は一節に二か所まで", () => {
  const body = readme.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  for (const re of [/分か(?!れ|け)/, /全て/, /既に/, /無い/, /ユーザ(?!ー)/, /サーバ(?!ー)/, /ブラウザ(?!ー)/, /ディレクトリ(?!ー)/,
    /パラメータ(?!ー)/, /インターフェース/, /ヶ月|か月/]) {
    assert.doesNotMatch(body, re, String(re));
  }
  for (const line of readme.split("\n")) {
    if (/^#{1,6}(?!#)\S/.test(line)) assert.fail(`見出しの空白: ${line}`);
    if (/^\d+\.\S/.test(line)) assert.fail(`番号の空白: ${line}`);
    assert.doesNotMatch(line, /^- \*\*[^*]+\*\*[:：]/, "箇条書きの項目名を太字にしない");
  }
  const sections = readme.split(/^## /m).slice(1);
  for (const s of sections) {
    const strong = (s.match(/\*\*/g) || []).length / 2;
    assert.ok(strong <= 2, `${s.split("\n")[0]}: ${strong}`);
  }
});
