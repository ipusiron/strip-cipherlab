import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { read, core, load } from "./load.js";
import { render } from "../tools/build-english.mjs";
import { evaluate, evaluateFixed } from "../tools/evaluate.mjs";

const C = core();
const T = load("js/english-data.js").StripEnglish.bigram;
const STRIP5 = C.passphraseStrips("STRIP", 5);
const ORDER5 = C.orderFromKeyword("STRIP", 5).order;
const CIPHER = "GQFQPIOFNGXWZVQZOFDNKUONKCDO";
// 決まった乱数源
const bytesFrom = (arr) => {
  let i = 0;
  return (count) => Uint8Array.from({ length: count }, () => arr[i++ % arr.length]);
};

test("英語の表: 学習用の本文から作り直すと js/english-data.js と同じ（手で編集していない）", () => {
  const corpus = fs.readFileSync(new URL("../tools/corpus/train-pg1342.txt", import.meta.url), "utf8");
  assert.equal(render(corpus), read("js/english-data.js"));
  assert.equal(T.length, 26 * 26);
  for (let p = 0; p < 26; p++) {
    const sum = T.slice(p * 26, p * 26 + 26).reduce((a, v) => a + Math.exp(v), 0);
    assert.ok(Math.abs(sum - 1) < 0.01, `row ${p}: ${sum}`);
  }
});

test("点数: 隣り合う2文字の対数尤度の平均（Python の独立な計算と一致）。2文字未満は null", () => {
  assert.equal(C.englishScore("THE", T).toFixed(3), "-0.992");
  assert.equal(C.englishScore("QXZ", T).toFixed(3), "-5.585");
  assert.equal(C.englishScore("ODETH", T).toFixed(3), "-2.375");
  assert.equal(C.englishScore("ATTAC", T).toFixed(3), "-2.765");
  assert.equal(C.englishScore("attac", T), C.englishScore("ATTAC", T));
  assert.equal(C.englishScore("A", T), null);
  assert.equal(C.englishScore("", T), null);
});

test("群の候補: 段差1〜25の行が1つずつ、点数の高い順。短い群では外れの行が1位になることがある", () => {
  const cands = C.rankCandidates("GQFQP", STRIP5, ORDER5, T);
  assert.equal(cands.length, 25);
  assert.deepEqual(cands.map((c) => c.gap).sort((a, b) => a - b), Array.from({ length: 25 }, (_, i) => i + 1));
  assert.deepEqual(cands.map((c) => c.rank), Array.from({ length: 25 }, (_, i) => i + 1));
  for (let i = 1; i < cands.length; i++) assert.ok(cands[i - 1].score >= cands[i].score);
  assert.deepEqual(cands.slice(0, 2).map((c) => [c.gap, c.text]), [[17, "ODETH"], [7, "ATTAC"]]);
  // 窓の行と同じ文字列
  const cols = C.windowColumns("GQFQP", STRIP5, ORDER5, "dec");
  for (const c of cands) assert.equal(c.text, C.windowRow(cols, C.rowOfGap(c.gap, "dec")));
});

test("全部の群で同じ段差の候補: 全文の点数で選ぶと、計算例の段差7が1位", () => {
  const cands = C.rankFixedCandidates(CIPHER, STRIP5, ORDER5, T);
  assert.equal(cands.length, 25);
  assert.equal(cands[0].gap, 7);
  assert.equal(cands[0].text, "ATTACKATDAWNMEETATTHEOLDMILL");
});

test("群ごとの1位: 10文字の群は当たり、8文字の最後の群は外れる例", () => {
  const strips = C.passphraseStrips("STRIP", 10);
  const order = C.firstOrder(10);
  const plain = C.lettersOnly("It was the best of times it was the worst of times it was the age of wisdom");
  const gaps = [5, 17, 2, 23, 11, 8];
  const cipher = C.encrypt(plain, strips, order, gaps);
  assert.equal(cipher, "UKVBUNJKAAZFTAVQBPXVPDHXZMQJGOAHRCIBQSENUFGHADNYAPPQPGZKSF");
  assert.deepEqual(C.bestGaps(cipher, strips, order, T), [5, 17, 2, 23, 11, 10]);
  assert.equal(C.decrypt(cipher, strips, order, gaps), plain);
  assert.deepEqual(C.bestGaps("", strips, order, T), []);
});

test("1文字の群は点数が付かず、段差の小さい順に並ぶ", () => {
  const cands = C.rankCandidates("Q", STRIP5, ORDER5, T);
  assert.deepEqual(cands.map((c) => c.gap), Array.from({ length: 25 }, (_, i) => i + 1));
  assert.ok(cands.every((c) => c.score === null));
  assert.deepEqual(C.sortCandidates([{ gap: 3, score: null }, { gap: 2, score: -3 }, { gap: 1, score: -3 }]).map((c) => c.gap), [1, 2, 3]);
});

test("群ごとの段差の乱数: 1〜25 で偏りがない（余りの偏りが出るバイトは捨てる）", () => {
  const all = bytesFrom(Array.from({ length: 256 }, (_, i) => i));
  const gaps = C.randomGaps(250, all);
  assert.equal(gaps.length, 250);
  const counts = new Array(26).fill(0);
  for (const g of gaps) counts[g]++;
  assert.equal(counts[0], 0);
  assert.deepEqual(new Set(counts.slice(1)), new Set([10]));
  assert.ok(C.randomGaps(20, C.cryptoBytes).every((g) => Number.isInteger(g) && g >= 1 && g <= 25));
});

test("評価（別の本・決まった種）: 群が長いほど1位が正しく、全文で選ぶと短くても当たる", () => {
  const ev = evaluate({ lengths: [5, 10, 20], trials: 300 });
  assert.ok(ev[5].top1 < ev[10].top1 && ev[10].top1 <= ev[20].top1, JSON.stringify(ev));
  assert.ok(ev[20].top1 >= 99, JSON.stringify(ev));
  assert.deepEqual(evaluate({ lengths: [8], trials: 50 }), evaluate({ lengths: [8], trials: 50 }));
  const fx = evaluateFixed({ cases: [[10, 30]], trials: 200 });
  assert.ok(fx["10/30"] >= 99, JSON.stringify(fx));
});
