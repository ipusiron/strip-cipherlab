import test from "node:test";
import assert from "node:assert/strict";
import { core } from "./load.js";

const C = core();
const A = C.ALPHABET;
// 決定的な乱数源: 渡したバイト列を順に返す
const bytesFrom = (arr) => {
  let i = 0;
  return (count) => {
    const out = new Uint8Array(count);
    for (let k = 0; k < count; k++) out[k] = arr[i++ % arr.length];
    return out;
  };
};
const isPermutation = (s) => s.length === 26 && [...s].sort().join("") === A;

// 既知解答は、別に書いた Python の参照実装（FNV-1a・mulberry32・Fisher–Yates・暗号化）の出力
const STRIP5 = [
  "WSNREQXCOGYVKBTMPHZFIDJLAU",
  "VPAXFEBLZGHMQTJSRNKWCDOIUY",
  "AWHEQJVCDPMGKTBLUZSRFYOIXN",
  "BCGSFXEVRTPOJKHMZQDYIAULWN",
  "WSXPIHUTKZBECRQYLJANGMFDVO",
];
const PT = "Attack at dawn. Meet at the old mill.";

test("文字の正規化: A〜Z だけを大文字で取り出す（全角英字は半角に、アクセントは外す）", () => {
  assert.equal(C.lettersOnly(PT), "ATTACKATDAWNMEETATTHEOLDMILL");
  assert.equal(C.lettersOnly("ＡＢｃ"), "ABC");
  assert.equal(C.lettersOnly("café"), "CAFE");
  assert.equal(C.lettersOnly("café"), "CAFE");
  assert.equal(C.lettersOnly("ストリップ 123"), "");
  assert.equal(C.lettersOnly(null), "");
});

test("捨てられる文字の一覧: 空白・改行を除き、重複なしで現れた順", () => {
  assert.deepEqual(C.droppedChars("a-b c、d-1\n"), ["-", "、", "1"]);
  assert.deepEqual(C.droppedChars("attack at dawn"), []);
  assert.deepEqual(C.droppedChars("café"), []);
});

test("帯の検査: 26文字が1回ずつ。足りない文字・重なった文字を返す", () => {
  assert.equal(C.checkStrip(A).ok, true);
  assert.equal(C.checkStrip("qwer tyui opas dfgh jklz xcvb nm").ok, true);
  const short = C.checkStrip(A.slice(0, 25));
  assert.equal(short.ok, false);
  assert.equal(short.length, 25);
  assert.deepEqual(short.missing, ["Z"]);
  const same = C.checkStrip("A".repeat(26));
  assert.deepEqual(same.duplicates, ["A"]);
  assert.equal(same.missing.length, 25);
});

test("乱字列の読み込み: 空行は飛ばし、問題の行は入力欄の行番号（1始まり）で返す", () => {
  const r = C.parseStrips([STRIP5[0], "", A.slice(0, 25), STRIP5[1], "A".repeat(26)].join("\n"));
  assert.deepEqual(r.strips, [STRIP5[0], STRIP5[1]]);
  assert.deepEqual(r.problems.map((p) => p.line), [3, 5]);
  assert.equal(r.tooMany, false);
  assert.equal(C.parseStrips(Array(101).fill(A).join("\n")).tooMany, true);
  assert.equal(C.parseStrips(Array(100).fill(A).join("\r\n")).strips.length, 100);
});

test("滑らせると同じ帯: 回転しただけの帯は同じ組になる", () => {
  const base = "KEYWORDABCFGHIJLMNPQSTUVXZ";
  const rotated = Array.from({ length: 10 }, (_, i) => base.slice(i) + base.slice(0, i));
  assert.deepEqual(C.sameCycleGroups(rotated), [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]]);
  assert.deepEqual(C.sameCycleGroups(STRIP5), []);
  assert.equal(C.cycleKey("BCDEFGHIJKLMNOPQRSTUVWXYZA"), A);
});

test("鍵語の割当: アルファベット順、同じ文字は左から若い番号（README の例）", () => {
  const r = C.rankKeyword("The strip cipher");
  assert.equal(r.letters, "THESTRIPCIPHER");
  assert.deepEqual(r.ranks, [13, 4, 2, 12, 14, 10, 6, 8, 1, 7, 9, 5, 3, 11]);
  assert.deepEqual(C.rankKeyword("STRIP").ranks, [4, 5, 3, 1, 2]);
});

test("鍵語から装着順: 鍵語の文字数＝使用本数。帯より長い鍵語は決めない（範囲外の帯を作らない）", () => {
  const ok = C.orderFromKeyword("The strip cipher", 14);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.order, [12, 3, 1, 11, 13, 9, 5, 7, 0, 6, 8, 4, 2, 10]);
  assert.equal(C.isValidOrder(ok.order, 14), true);
  const tooLong = C.orderFromKeyword("The strip cipher", 10);
  assert.equal(tooLong.ok, false);
  assert.equal(tooLong.reason, "tooLong");
  assert.equal(C.orderFromKeyword("123", 10).reason, "empty");
  for (let n = 1; n <= 26; n++) {
    const key = "QUICKBROWNFOXJUMPSOVERTHELAZYDOG".slice(0, n);
    assert.equal(C.isValidOrder(C.orderFromKeyword(key, n).order, n), true, key);
  }
});

test("帯番号の入力（1始まり）: 範囲外・重複・数でないものは決めない", () => {
  assert.deepEqual(C.parseOrder("13, 4 2、1", 14), { ok: true, order: [12, 3, 1, 0] });
  assert.deepEqual(C.parseOrder("１，２", 2).order, [0, 1]);
  assert.equal(C.parseOrder("", 5).reason, "empty");
  assert.equal(C.parseOrder("0, 1", 5).reason, "outOfRange");
  assert.deepEqual(C.parseOrder("1, 6", 5).bad, [6]);
  assert.deepEqual(C.parseOrder("1, 2, 1, 2", 5).bad, [1, 2]);
  assert.equal(C.parseOrder("1, a", 5).reason, "notNumber");
  assert.equal(C.parseOrder("-1", 5).reason, "notNumber");
  assert.deepEqual(C.firstOrder(3), [0, 1, 2]);
});

test("既知解答: 合言葉 STRIP の帯5本・鍵語 STRIP の装着順で暗号化（Python の参照実装と一致）", () => {
  const order = C.orderFromKeyword("STRIP", 5).order;
  assert.deepEqual(order, [3, 4, 2, 0, 1]);
  assert.equal(C.encrypt(PT, STRIP5, order, 1), "UKBUDHNBJXNGGQBPNBMMVWUJQAJU");
  assert.equal(C.encrypt(PT, STRIP5, order, 7), "GQFQPIOFNGXWZVQZOFDNKUONKCDO");
  assert.equal(C.encrypt(PT, STRIP5, order, [3, 11, 25, 1, 9, 2, 14, 6]), "WBUSIWPXXTLAPRFPNBMMMKXECUAZ");
  assert.equal(C.decrypt("GQFQPIOFNGXWZVQZOFDNKUONKCDO", STRIP5, order, 7), "ATTACKATDAWNMEETATTHEOLDMILL");
});

test("往復: どの段差（1〜25）でも、同じ段差で復号すると元の平文に戻る", () => {
  const strips = C.randomStrips(12, bytesFrom([7, 200, 31, 99, 254, 0, 13, 128, 77]));
  const order = [11, 0, 5, 3, 9, 1, 7];
  const plain = C.lettersOnly("The quick brown fox jumps over the lazy dog " + A);
  for (let g = 1; g <= 25; g++) {
    const ct = C.encrypt(plain, strips, order, g);
    assert.equal(ct.length, plain.length);
    assert.notEqual(ct, plain);
    assert.equal(C.decrypt(ct, strips, order, g), plain, `gap ${g}`);
  }
  const gaps = [5, 25, 1, 13, 8, 2];
  assert.equal(C.decrypt(C.encrypt(plain, strips, order, gaps), strips, order, gaps), plain);
});

test("帯の本数より長い平文は、同じ装着順を繰り返す（周期＝使用本数）", () => {
  const order = [0, 1, 2];
  const ct = C.encrypt("AAAAAAAAA", STRIP5, order, 4);
  assert.equal(ct.slice(0, 3), ct.slice(3, 6));
  assert.equal(ct.slice(3, 6), ct.slice(6, 9));
  assert.deepEqual(C.splitGroups("ABCDEFGHIJ", 4), ["ABCD", "EFGH", "IJ"]);
  assert.deepEqual(C.splitGroups("", 4), []);
});

test("不正な装着順・段差は RangeError（範囲外の帯で TypeError にならない）", () => {
  const ten = C.randomStrips(10, bytesFrom([1, 2, 3, 250]));
  assert.throws(() => C.encrypt("HELLO", ten, [12, 3, 1], 1), RangeError);
  assert.throws(() => C.encrypt("HELLO", ten, [1, 1], 1), RangeError);
  assert.throws(() => C.encrypt("HELLO", ten, [], 1), RangeError);
  assert.throws(() => C.encrypt("HELLO", ten, [0], 26), RangeError);
  assert.throws(() => C.encrypt("HELLO", ten, [0], 1.5), RangeError);
  assert.throws(() => C.encrypt("HELLO", [A.slice(0, 25) + "A"], [0], 1), RangeError);
  assert.equal(C.gapFor([3, 9], 5), 9);
});

test("窓: 暗号化は群の文字が最上段、段差 g の段を横に読むと暗号文の群", () => {
  const order = C.orderFromKeyword("STRIP", 5).order;
  const plain = C.lettersOnly(PT);
  const groups = C.splitGroups(plain, 5);
  for (const g of [1, 7, 25]) {
    const ct = C.splitGroups(C.encrypt(plain, STRIP5, order, g), 5);
    groups.forEach((grp, gi) => {
      const cols = C.windowColumns(grp, STRIP5, order, "enc");
      assert.equal(C.windowRow(cols, 0), grp);
      assert.equal(C.windowRow(cols, C.rowOfGap(g, "enc")), ct[gi]);
    });
  }
  const cols = C.windowColumns("ATT", STRIP5, order, "enc");
  assert.equal(cols.length, 5);
  assert.deepEqual(cols.map((c) => c.letter), ["A", "T", "T", null, null]);
  assert.equal(cols[3].offset, 0);
  for (const c of cols) assert.equal(c.cells.length, 26);
});

test("窓: 復号は群の文字が最下段、段差 g の行（下から g 段上）が平文の候補", () => {
  const order = [4, 0, 2];
  const ct = C.encrypt("STRIPCIPHER", STRIP5, order, 9);
  const groups = C.splitGroups(ct, 3);
  const plain = C.splitGroups("STRIPCIPHER", 3);
  groups.forEach((grp, gi) => {
    const cols = C.windowColumns(grp, STRIP5, order, "dec");
    assert.equal(C.windowRow(cols, 25), grp);
    assert.equal(C.windowRow(cols, C.rowOfGap(9, "dec")), plain[gi]);
    // 52文字（2回続けた帯）の offset 文字目から26文字が窓に並ぶ
    for (const c of cols) assert.equal(c.cells, (STRIP5[c.strip] + STRIP5[c.strip]).slice(c.offset, c.offset + 26));
  });
});

test("偏りのない乱数: 余りの偏りが出るバイトは捨てて引き直す", () => {
  assert.equal(C.randomIndex(26, bytesFrom([255, 234, 3])), 3);
  assert.equal(C.randomIndex(26, bytesFrom([233])), 233 % 26);
  const counts = new Array(26).fill(0);
  const all = bytesFrom(Array.from({ length: 256 }, (_, i) => i));
  for (let i = 0; i < 234; i++) counts[C.randomIndex(26, all)]++;
  assert.deepEqual(new Set(counts), new Set([9]));
  assert.throws(() => C.randomIndex(0, all), RangeError);
});

test("乱数の帯: どれも A〜Z の並べ替え。crypto の乱数源で作れる", () => {
  const strips = C.randomStrips(20, bytesFrom([9, 18, 27, 36, 45, 54, 63, 240, 250]));
  assert.equal(strips.length, 20);
  for (const s of strips) assert.equal(isPermutation(s), true, s);
  assert.equal(C.cryptoBytes(16).length, 16);
  const real = C.randomStrips(50, C.cryptoBytes);
  for (const s of real) assert.equal(isPermutation(s), true);
  assert.deepEqual(C.sameCycleGroups(real), []);
});

test("合言葉の帯: FNV-1a の既知値、同じ合言葉からいつも同じ帯（Python の参照実装と一致）", () => {
  assert.equal(C.fnv1a32(""), 0x811c9dc5);
  assert.equal(C.fnv1a32("a"), 0xe40c292c);
  assert.equal(C.fnv1a32("STRIP#1"), 1430323237);
  assert.deepEqual(C.passphraseStrips("STRIP", 5), STRIP5);
  assert.deepEqual(C.passphraseStrips("  STRIP  ", 5), STRIP5);
  assert.deepEqual(C.passphraseStrips("合言葉", 2), ["KOLIDWCZXEFVJHRGNUSBTPYMAQ", "QFLIAXSTVKJHBORPCUGEMWDYZN"]);
  assert.notDeepEqual(C.passphraseStrips("strip", 5), STRIP5);
  const hundred = C.passphraseStrips("STRIP", 100);
  for (const s of hundred) assert.equal(isPermutation(s), true);
  assert.deepEqual(C.sameCycleGroups(hundred), []);
  assert.equal(C.passphraseStrip("STRIP", 3), STRIP5[2]);
});
