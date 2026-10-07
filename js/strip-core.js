// Strip CipherLab の計算部（DOM を使わない通常のスクリプト。globalThis.StripCore に置く）
// ストリップ暗号: 平文を r 文字ずつの群に分け、群の i 文字目を装着順 i 番目の帯で探し、
// その文字から段差 g 行下の文字を暗号文にする（復号は g 行上）。帯は26文字の乱字列で、
// 実物は端で止まらないよう2回続けて印字する（ここでは添字を 26 で割った余りで扱う）。
// 乱数は呼び出し側から渡す（crypto.getRandomValues を注入）。テストは決定的な列を渡して確かめる。
(function (root) {
  "use strict";

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const SIZE = 26;
  const MAX_STRIPS = 100;
  const MAX_GAP = SIZE - 1;

  // ---------- 文字の正規化 ----------

  // A〜Z だけを取り出す。NFKD で全角英字を半角に、アクセント記号を外し（é→E）、大文字にする
  function lettersOnly(text) {
    return String(text == null ? "" : text).normalize("NFKD").toUpperCase().replace(/[^A-Z]/g, "");
  }

  // 書記素の単位に分ける（Intl.Segmenter がなければコードポイント単位）
  function graphemes(text) {
    const s = String(text == null ? "" : text);
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      return Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s), (x) => x.segment);
    }
    return Array.from(s);
  }

  // 暗号化で捨てられる文字（空白・改行を除く）を、重複なしで現れた順に返す
  function droppedChars(text) {
    const seen = new Set();
    const out = [];
    for (const g of graphemes(text)) {
      if (/^\s+$/.test(g) || lettersOnly(g)) continue;
      if (!seen.has(g)) { seen.add(g); out.push(g); }
    }
    return out;
  }

  // ---------- 帯の検査と読み込み ----------

  // 帯1本の検査: A〜Z の26文字が1回ずつ
  function checkStrip(text) {
    const letters = lettersOnly(text);
    const counts = {};
    for (const ch of letters) counts[ch] = (counts[ch] || 0) + 1;
    const duplicates = ALPHABET.split("").filter((ch) => counts[ch] > 1);
    const missing = ALPHABET.split("").filter((ch) => !counts[ch]);
    return { letters, length: letters.length, duplicates, missing, ok: letters.length === SIZE && missing.length === 0 };
  }

  // 1行1本の乱字列を読む。空行は飛ばす。problems の line は入力欄の行番号（1始まり、空行も数える）
  function parseStrips(text) {
    const strips = [];
    const problems = [];
    String(text == null ? "" : text).split(/\r\n|\r|\n/).forEach((raw, i) => {
      if (!raw.trim()) return;
      const c = checkStrip(raw);
      if (c.ok) strips.push(c.letters);
      else problems.push({ line: i + 1, length: c.length, duplicates: c.duplicates, missing: c.missing });
    });
    return { strips, problems, tooMany: strips.length + problems.length > MAX_STRIPS };
  }

  // 帯を「滑らせても同じか」で比べるための形（A から始まるよう回した文字列）
  function cycleKey(strip) {
    const k = strip.indexOf("A");
    return strip.slice(k) + strip.slice(0, k);
  }

  // 滑らせると同じになる帯の組（0始まりの添字の配列の配列。2本以上の組だけ）
  function sameCycleGroups(strips) {
    const map = new Map();
    strips.forEach((s, i) => {
      const key = cycleKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    });
    return Array.from(map.values()).filter((g) => g.length > 1);
  }

  // ---------- 装着順 ----------

  // 鍵語の各文字に、アルファベット順で番号（1始まり）を振る。同じ文字は左から若い番号
  function rankKeyword(key) {
    const letters = lettersOnly(key);
    const ranks = new Array(letters.length).fill(0);
    let num = 1;
    for (const ch of ALPHABET) {
      for (let i = 0; i < letters.length; i++) {
        if (letters[i] === ch) ranks[i] = num++;
      }
    }
    return { letters, ranks };
  }

  // 鍵語から装着順を決める。鍵語の文字数が使用本数 r になり、帯番号 1..r を割当の順に並べる。
  // order は帯の添字（0始まり）。鍵語が帯の本数より長いときは決められない（範囲外の帯を作らない）
  function orderFromKeyword(key, stripCount) {
    const { letters, ranks } = rankKeyword(key);
    if (!letters.length) return { ok: false, reason: "empty", letters, ranks, order: [] };
    if (letters.length > stripCount) return { ok: false, reason: "tooLong", letters, ranks, order: [] };
    return { ok: true, letters, ranks, order: ranks.map((n) => n - 1) };
  }

  // 先頭から r 本
  function firstOrder(r) {
    return Array.from({ length: Math.max(0, r) }, (_, i) => i);
  }

  // 「13, 4, 2」の形の帯番号（1始まり）を読む。区切りはカンマ・空白・読点
  function parseOrder(text, stripCount) {
    const tokens = String(text == null ? "" : text).normalize("NFKC").split(/[\s,、]+/).filter(Boolean);
    if (!tokens.length) return { ok: false, reason: "empty", order: [] };
    const bad = tokens.filter((t) => !/^\d+$/.test(t));
    if (bad.length) return { ok: false, reason: "notNumber", bad, order: [] };
    const nums = tokens.map(Number);
    const out = nums.filter((n) => n < 1 || n > stripCount);
    if (out.length) return { ok: false, reason: "outOfRange", bad: out, order: [] };
    const seen = new Set();
    const dup = [];
    for (const n of nums) {
      if (seen.has(n) && !dup.includes(n)) dup.push(n);
      seen.add(n);
    }
    if (dup.length) return { ok: false, reason: "duplicate", bad: dup, order: [] };
    return { ok: true, order: nums.map((n) => n - 1) };
  }

  // 装着順が帯の一式に対して正しいか（添字が範囲内・重複なし・1本以上）
  function isValidOrder(order, stripCount) {
    if (!Array.isArray(order) || !order.length) return false;
    const seen = new Set();
    for (const i of order) {
      if (!Number.isInteger(i) || i < 0 || i >= stripCount || seen.has(i)) return false;
      seen.add(i);
    }
    return true;
  }

  // ---------- 暗号化と復号 ----------

  // 群 groupIndex の段差。gaps は数（全群で同じ）か配列（群ごと。足りなければ最後の値）
  function gapFor(gaps, groupIndex) {
    const g = Array.isArray(gaps) ? gaps[Math.min(groupIndex, gaps.length - 1)] : gaps;
    if (!Number.isInteger(g) || g < 0 || g > MAX_GAP) throw new RangeError("gap must be an integer 0..25");
    return g;
  }

  function checkSetup(strips, order) {
    if (!isValidOrder(order, strips.length)) throw new RangeError("invalid frame order");
    for (const i of order) {
      if (!checkStrip(strips[i]).ok) throw new RangeError("invalid strip");
    }
  }

  // sign = +1 で暗号化（段差 g 行下）、-1 で復号（g 行上）
  function shift(text, strips, order, gaps, sign) {
    checkSetup(strips, order);
    const letters = lettersOnly(text);
    const r = order.length;
    let out = "";
    for (let i = 0; i < letters.length; i++) {
      const strip = strips[order[i % r]];
      const g = gapFor(gaps, Math.floor(i / r));
      const pos = strip.indexOf(letters[i]);
      out += strip[(pos + sign * g + SIZE * 2) % SIZE];
    }
    return out;
  }

  const encrypt = (text, strips, order, gaps) => shift(text, strips, order, gaps, 1);
  const decrypt = (text, strips, order, gaps) => shift(text, strips, order, gaps, -1);

  // r 文字ずつの群に分ける（最後の群は短くてよい）
  function splitGroups(letters, r) {
    const out = [];
    for (let i = 0; i < letters.length; i += r) out.push(letters.slice(i, i + r));
    return out;
  }

  // ---------- 窓（ある群に対する26行） ----------

  // 装着順の各位置の帯について、窓に並ぶ26文字（上から）を返す。
  // mode "enc": 群の文字を最上段（段差0）に置く。k 段目が段差 +k の文字
  // mode "dec": 群の文字を最下段に置く。下から k 段上（25-k 段目）が段差 -k の文字
  // offset は2回続けた52文字の帯の何文字目が窓の最上段に来るか（帯を滑らせる量）
  function windowColumns(groupLetters, strips, order, mode) {
    const letters = lettersOnly(groupLetters);
    return order.map((stripIndex, position) => {
      const strip = strips[stripIndex];
      const letter = position < letters.length ? letters[position] : null;
      const pos = letter ? strip.indexOf(letter) : -1;
      const offset = pos < 0 ? 0 : (mode === "dec" ? pos + 1 : pos);
      const cells = (strip + strip).slice(offset, offset + SIZE);
      return { position, strip: stripIndex, letter, offset, cells };
    });
  }

  // 窓の k 段目を横に読んだ文字列（群の文字がある列だけ）
  function windowRow(columns, k) {
    return columns.filter((c) => c.letter).map((c) => c.cells[k]).join("");
  }

  // 段差 g の行が窓の何段目か
  function rowOfGap(g, mode) {
    return mode === "dec" ? MAX_GAP - g : g;
  }

  // ---------- 乱数の帯 ----------

  // 余りの偏りを除いて [0, n) の整数を1つ返す。bytesFn(count) は Uint8Array を返す乱数源。n は 1..256
  function randomIndex(n, bytesFn) {
    if (!Number.isInteger(n) || n < 1 || n > 256) throw new RangeError("n must be 1..256");
    const limit = 256 - (256 % n);
    for (;;) {
      const b = bytesFn(1)[0];
      if (b < limit) return b % n;
    }
  }

  // Fisher–Yates で A〜Z を並べ替えた乱字列
  function shuffleAlphabet(intFn) {
    const arr = ALPHABET.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = intFn(i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr.join("");
  }

  const randomStrip = (bytesFn) => shuffleAlphabet((n) => randomIndex(n, bytesFn));
  const randomStrips = (count, bytesFn) => Array.from({ length: count }, () => randomStrip(bytesFn));

  function cryptoBytes(count) {
    const out = new Uint8Array(count);
    root.crypto.getRandomValues(out);
    return out;
  }

  // ---------- 合言葉から再現できる帯 ----------
  // 同じ合言葉と帯番号から、いつも同じ乱字列を作る（決まった手順の擬似乱数。合言葉を推測されれば帯も再現される）
  // 手順: 種 = FNV-1a 32ビット（合言葉の UTF-8 + "#" + 帯番号）→ mulberry32 → Fisher–Yates（j = floor(乱数 × (i+1))）

  function fnv1a32(text) {
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(text)) {
      h ^= b;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const normalizePassphrase = (pass) => String(pass == null ? "" : pass).normalize("NFC").trim();

  function passphraseStrip(pass, number) {
    const next = mulberry32(fnv1a32(normalizePassphrase(pass) + "#" + number));
    return shuffleAlphabet((n) => Math.floor(next() * n));
  }

  const passphraseStrips = (pass, count) =>
    Array.from({ length: count }, (_, i) => passphraseStrip(pass, i + 1));

  root.StripCore = {
    ALPHABET, SIZE, MAX_STRIPS, MAX_GAP,
    lettersOnly, graphemes, droppedChars,
    checkStrip, parseStrips, cycleKey, sameCycleGroups,
    rankKeyword, orderFromKeyword, firstOrder, parseOrder, isValidOrder,
    gapFor, encrypt, decrypt, splitGroups,
    windowColumns, windowRow, rowOfGap,
    randomIndex, shuffleAlphabet, randomStrip, randomStrips, cryptoBytes,
    fnv1a32, mulberry32, normalizePassphrase, passphraseStrip, passphraseStrips,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
