import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { read, exists, core, load } from "./load.js";

const C = core();
const readme = read("README.md");
const readmeEn = read("README.en.md");
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
  assert.ok(readme.includes(`（装着順${key.ranks.join(" ")}）`));
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
  assert.ok(readme.includes(`暗号文の${cipher.slice(0, 5)}を最下段にそろえると、7行上に${plain.slice(0, 5)}が現れます`));
});

test("計算例の続き: 5文字の群は外れの行が1位になり、全文の点数なら段差7が1位（計算部で再計算）", () => {
  const T = load("js/english-data.js").StripEnglish.bigram;
  const strips = C.passphraseStrips("STRIP", 5);
  const order = C.orderFromKeyword("STRIP", 5).order;
  const [first, second] = C.rankCandidates("GQFQP", strips, order, T);
  const m = readme.match(/段差-(\d+)の([A-Z]+)（点数(-\d\.\d\d)）が1位、正しい([A-Z]+)（点数(-\d\.\d\d)）は2位/);
  assert.ok(m, "文");
  assert.deepEqual([Number(m[1]), m[2], m[3]], [first.gap, first.text, first.score.toFixed(2)]);
  assert.deepEqual([m[4], m[5]], [second.text, second.score.toFixed(2)]);
  assert.equal(second.gap, 7);
  assert.equal(C.rankFixedCandidates("GQFQPIOFNGXWZVQZOFDNKUONKCDO", strips, order, T)[0].gap, 7);
});

test("計算例（群ごとの段差と自動推定）: 暗号文と自動推定の段差を計算部で再計算する", () => {
  const T = load("js/english-data.js").StripEnglish.bigram;
  const sec = readme.split("### 計算例（群ごとの段差と自動推定）")[1].split("\n### ")[0];
  const plain = sec.match(/- 平文：([A-Z]+)/)[1];
  const gaps = sec.match(/- 群ごとの段差：([+\d ]+)/)[1].trim().split(" ").map(Number);
  const cipher = sec.match(/- 暗号文：([A-Z]+)/)[1];
  const auto = sec.match(/- 自動推定（群ごとの点数1位）：([-\d ]+)/)[1].trim().split(" ").map((v) => -Number(v));
  const strips = C.passphraseStrips("STRIP", 10);
  const order = C.firstOrder(10);
  assert.equal(C.encrypt(plain, strips, order, gaps), cipher);
  assert.deepEqual(C.bestGaps(cipher, strips, order, T), auto);
  const last = C.splitGroups(cipher, 10).at(-1);
  const right = C.rankCandidates(last, strips, order, T).find((c) => c.gap === gaps.at(-1));
  assert.ok(sec.includes(`正しい段差-${gaps.at(-1)}（${right.text}）が${right.rank}位`));
});

test("点数と自動推定の表: tools/evaluate.mjs の結果と一致する", async () => {
  const { evaluate, evaluateFixed } = await import("../tools/evaluate.mjs");
  const g = evaluate();
  const rowsG = [...readme.matchAll(/^\| (\d+)文字 \| ([\d.]+)% \| ([\d.]+)% \|$/gm)];
  assert.equal(rowsG.length, Object.keys(g).length);
  for (const [, r, top1, top3] of rowsG) assert.deepEqual([top1, top3], [g[r].top1.toFixed(1), g[r].top3.toFixed(1)], r);
  const f = evaluateFixed();
  const rowsF = [...readme.matchAll(/^\| (\d+)本 \| (\d+)文字 \| ([\d.]+)% \|$/gm)];
  assert.equal(rowsF.length, Object.keys(f).length);
  for (const [, r, len, v] of rowsF) assert.equal(v, f[`${r}/${len}`].toFixed(1), `${r}/${len}`);
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

function checkTree(text, heading) {
  const block = text.match(new RegExp(`## 📁 ${heading}\\n\\n\`\`\`\\n([\\s\\S]*?)\\n\`\`\``))[1].split("\n");
  assert.equal(block[0], "strip-cipherlab/");
  const cols = new Set();
  const stack = [];
  const listed = [];
  for (const line of block.slice(1)) {
    const m = line.match(/^((?:│   |    )*)(?:├── |└── )(\S+)\s+# \S/);
    assert.ok(m, line);
    cols.add(line.indexOf("#"));
    stack.length = m[1].length / 4;
    stack.push(m[2]);
    listed.push(stack.join(""));
  }
  assert.equal(cols.size, 1, "# の桁");
  assert.deepEqual([...listed].sort(), walk("").sort());
}

test("ディレクトリー構造: 全ファイルが載り、全行に説明がある（# の桁がそろう。日英とも）", () => {
  checkTree(readme, "ディレクトリー構造");
  checkTree(readmeEn, "Directory structure");
});

test("画像: README の画像はすべて実在し、assets の PNG はすべてどちらかの README から参照される", () => {
  const images = (text) => [...text.matchAll(/!\[[^\]]*\]\(((?!https?:)[^)]+)\)/g)].map((m) => m[1]);
  const ja = images(readme);
  const en = images(readmeEn);
  assert.deepEqual(ja, ["assets/screenshot.png", "assets/screenshot2.png", "assets/screenshot3.png"]);
  assert.deepEqual(en, ["assets/en/screenshot.png", "assets/en/screenshot2.png", "assets/en/screenshot3.png"]);
  for (const f of [...ja, ...en]) assert.ok(exists(f), f);
  const pngs = walk("").filter((f) => f.startsWith("assets/") && f.endsWith(".png"));
  assert.deepEqual(pngs.sort(), [...ja, ...en].sort());
});

test("表記: 長音・開く語・カ月。見出しと番号つきの箇条書きの形。強調は一節に二か所まで", () => {
  const body = readme.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  for (const re of [/分か(?!れ|け)/, /全て/, /既に/, /無い/, /ユーザ(?!ー)/, /サーバ(?!ー)/, /ブラウザ(?!ー)/, /ディレクトリ(?!ー)/,
    /パラメータ(?!ー)/, /インターフェース/, /ヶ月|か月/]) {
    assert.doesNotMatch(body, re, String(re));
  }
  // 日本語と英字・数字・インラインコードの間に半角空白を入れない（コードブロックと冒頭の YAML は除く）
  const prose = readme.split("-->")[1].replace(/```[\s\S]*?```/g, "");
  const J = "[\\u3040-\\u30ff\\u3400-\\u9fff\\uff01-\\uff60]";
  const spaced = prose.match(new RegExp(`.{0,12}(?:${J} +[A-Za-z0-9\`]|[A-Za-z0-9\`] +${J}).{0,12}`));
  assert.equal(spaced, null, spaced && spaced[0]);
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

test("英語版: 言語のリンク・定型・見出しが日本語版と1対1（数・階層・アイコン）", () => {
  assert.equal(readmeEn.split("\n")[0], "English · [日本語](README.md)");
  assert.ok(readme.includes("\n[English](README.en.md) · 日本語\n"));
  assert.doesNotMatch(readmeEn, /^---\nid:/m, "YAML は README.md だけ");
  assert.match(readmeEn, /\*\*Day071 - 100 Security Tools with Generative AI\*\*/);
  assert.match(readmeEn, /https:\/\/akademeia.info\/\?page_id=42163/);
  const heads = (text) => [...text.matchAll(/^(#{1,3}) (.+)$/gm)].map((m) => [m[1].length, m[2].match(/^\P{L}*/u)[0].trim()]);
  const ja = heads(readme);
  const en = heads(readmeEn);
  assert.equal(en.length, ja.length);
  ja.forEach(([level, icon], i) => {
    assert.equal(en[i][0], level, `${i}`);
    if (level === 2) assert.equal(en[i][1], icon, `${i}`);
  });
  const JAPANESE = /[\u3040-\u30ff\u3400-\u9fff]/;
  const enBody = readmeEn.split("\n").slice(1).join("\n");
  assert.doesNotMatch(enBody, JAPANESE);
});

test("英語版: 計算例・装着順の例・評価の表を計算部と tools/evaluate.mjs で再計算する", async () => {
  const T = load("js/english-data.js").StripEnglish.bigram;
  const s5 = C.passphraseStrips("STRIP", 5);
  const key = C.orderFromKeyword("STRIP", 5);
  assert.ok(readmeEn.includes(`(strip order: ${key.ranks.join(" ")})`));
  const plain = readmeEn.match(/- Plaintext: ([A-Z]+)/)[1];
  const cipher = readmeEn.match(/- Ciphertext: ([A-Z]+)/)[1];
  assert.equal(C.encrypt(plain, s5, key.order, 7), cipher);
  const cols = C.windowColumns(plain.slice(0, 5), s5, key.order, "enc");
  const rows = [...readmeEn.matchAll(/^\| (0 \(plaintext\)|\+\d+) \| ([A-Z]+) \|$/gm)];
  assert.equal(rows.length, 8);
  for (const [, label, text] of rows) assert.equal(C.windowRow(cols, label.startsWith("0") ? 0 : Number(label)), text);
  const [first, second] = C.rankCandidates(cipher.slice(0, 5), s5, key.order, T);
  assert.ok(readmeEn.includes(`${first.text} at offset -${first.gap} (score ${first.score.toFixed(2)}) comes first`));
  assert.ok(readmeEn.includes(`the correct ${second.text} (score ${second.score.toFixed(2)}) comes second`));
  const sec = readmeEn.split("### Worked example (offsets per group and auto-pick)")[1].split("\n### ")[0];
  const p2 = sec.match(/- Plaintext: ([A-Z]+)/)[1];
  const gaps = sec.match(/- Offsets per group: ([+\d ]+)/)[1].trim().split(" ").map(Number);
  const c2 = sec.match(/- Ciphertext: ([A-Z]+)/)[1];
  const auto = sec.match(/- Auto-pick \(top score per group\): ([-\d ]+)/)[1].trim().split(" ").map((v) => -Number(v));
  const s10 = C.passphraseStrips("STRIP", 10);
  assert.equal(C.encrypt(p2, s10, C.firstOrder(10), gaps), c2);
  assert.deepEqual(C.bestGaps(c2, s10, C.firstOrder(10), T), auto);
  const ex = [...readmeEn.matchAll(/^Example \((\d+) strips\):.*`([A-Z]+)` → `([\d ]+)`$/gm)];
  assert.equal(ex.length, 2);
  for (const [, n, letters, ranks] of ex) {
    assert.equal(letters.length, Number(n));
    assert.equal(C.rankKeyword(letters).ranks.join(" "), ranks);
  }
  const { evaluate, evaluateFixed } = await import("../tools/evaluate.mjs");
  const g = evaluate();
  const rowsG = [...readmeEn.matchAll(/^\| (\d+) letters \| ([\d.]+)% \| ([\d.]+)% \|$/gm)];
  assert.equal(rowsG.length, Object.keys(g).length);
  for (const [, r, top1, top3] of rowsG) assert.deepEqual([top1, top3], [g[r].top1.toFixed(1), g[r].top3.toFixed(1)]);
  const f = evaluateFixed();
  const rowsF = [...readmeEn.matchAll(/^\| (\d+) strips \| (\d+) letters \| ([\d.]+)% \|$/gm)];
  assert.equal(rowsF.length, Object.keys(f).length);
  for (const [, r, len, v] of rowsF) assert.equal(v, f[`${r}/${len}`].toFixed(1));
});
