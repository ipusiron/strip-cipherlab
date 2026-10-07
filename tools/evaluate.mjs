// 候補の行の点数で、正しい段差が何位に来るかを測る（学習に使っていない別の本 tools/corpus/eval-pg98.txt で評価する）
// 使い方: node tools/evaluate.mjs（README の「点数の当たり方」の表と同じ値を出す。決まった種の乱数なので毎回同じ）
// 試行ごとに、乱数のストリップ r 本・本文の任意の位置の r 文字・段差 1〜25 を選び、暗号化して候補を点数順に並べる
import fs from "node:fs";
import vm from "node:vm";

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const ctx = vm.createContext({ TextEncoder, Intl });
vm.runInContext(read("js/strip-core.js"), ctx);
vm.runInContext(read("js/english-data.js"), ctx);
const C = ctx.StripCore;
const TABLE = ctx.StripEnglish.bigram;

export const LENGTHS = [5, 8, 10, 15, 20];
export const TRIALS = 2000;
export const SEED = 20261007;

// 線形合同法（評価を再現するための乱数。画面では使わない）
function lcg(seed) {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
  const bytes = (n) => Uint8Array.from({ length: n }, () => Math.floor(next() * 256));
  return { next, bytes };
}

export function evaluate({ lengths = LENGTHS, trials = TRIALS, seed = SEED } = {}) {
  const text = C.lettersOnly(read("tools/corpus/eval-pg98.txt"));
  const rng = lcg(seed);
  const out = {};
  for (const r of lengths) {
    let top1 = 0;
    let top3 = 0;
    for (let t = 0; t < trials; t++) {
      const strips = C.randomStrips(r, rng.bytes);
      const order = C.firstOrder(r);
      const start = Math.floor(rng.next() * (text.length - r));
      const plain = text.slice(start, start + r);
      const gap = 1 + Math.floor(rng.next() * C.MAX_GAP);
      const cipher = C.encrypt(plain, strips, order, gap);
      const rank = C.rankCandidates(cipher, strips, order, TABLE).find((c) => c.gap === gap).rank;
      if (rank === 1) top1++;
      if (rank <= 3) top3++;
    }
    out[r] = { top1: (100 * top1) / trials, top3: (100 * top3) / trials };
  }
  return out;
}

// 全部の群で同じ段差のとき: 全文を段差 1〜25 で復号した文の点数で1位を選ぶ。[使用本数, 全文の文字数] ごと
export const FIXED_CASES = [[5, 10], [5, 15], [10, 20], [10, 30]];

export function evaluateFixed({ cases = FIXED_CASES, trials = TRIALS, seed = SEED + 1 } = {}) {
  const text = C.lettersOnly(read("tools/corpus/eval-pg98.txt"));
  const rng = lcg(seed);
  const out = {};
  for (const [r, len] of cases) {
    let top1 = 0;
    for (let t = 0; t < trials; t++) {
      const strips = C.randomStrips(r, rng.bytes);
      const order = C.firstOrder(r);
      const start = Math.floor(rng.next() * (text.length - len));
      const plain = text.slice(start, start + len);
      const gap = 1 + Math.floor(rng.next() * C.MAX_GAP);
      const cipher = C.encrypt(plain, strips, order, gap);
      if (C.rankFixedCandidates(cipher, strips, order, TABLE)[0].gap === gap) top1++;
    }
    out[`${r}/${len}`] = (100 * top1) / trials;
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("evaluate.mjs")) {
  for (const [r, v] of Object.entries(evaluate())) console.log(`群${r}文字: 1位 ${v.top1.toFixed(1)}%  3位以内 ${v.top3.toFixed(1)}%`);
  for (const [k, v] of Object.entries(evaluateFixed())) console.log(`同じ段差 ${k.replace("/", "本・全文")}文字: 1位 ${v.toFixed(1)}%`);
}
