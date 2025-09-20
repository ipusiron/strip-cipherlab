/* ===============================
 * Strip CipherLab (教育用簡易モデル)
 * - ストリップ作成
 * - フレーム設定（装着順・基準行・オフセット）
 * - 暗号化／復号（Row-Key & Shift-Key）
 * - プレイバック可視化
 * - JSON入出力
 * =============================== */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// ---------- 状態 ----------
const state = {
  strips: [],                 // ["QWERTY...", ...] 26文字各
  frameOrder: [],             // [0,1,2,...] 使用する行のインデックス（左→右）
  cipherRowGapEnc: 1,         // 暗号化タブ用 段差
  cipherRowGapDec: 1,         // 復号タブ用 段差
};

// ---------- ユーティリティ ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function randPermutationAlphabet() {
  const arr = ALPHABET.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

// キーワード→置換アルファベット（Keyed Alphabet）
function keyedAlphabet(keyword) {
  const k = normalizeLetters(keyword).replace(/[^A-Z]/g, "");
  const seen = new Set();
  let out = "";
  for (const ch of k) {
    if (!seen.has(ch)) { seen.add(ch); out += ch; }
  }
  for (const ch of ALPHABET) {
    if (!seen.has(ch)) out += ch;
  }
  return out;
}

// 文字→A=0..Z=25
function lettersToNumbers(s) {
  const up = normalizeLetters(s).replace(/[^A-Z]/g, "");
  return Array.from(up).map(ch => ch.charCodeAt(0) - 65);
}

// 大文字化
function normalizeLetters(text) {
  return text.toUpperCase();
}

function isAlpha(ch) { return ch >= 'A' && ch <= 'Z'; }

// ストリップのスライド範囲に応じてコンテナの高さを動的調整
function adjustContainerHeight(container, opts = { mode: 'enc' }) {
  const strips = container.querySelectorAll('.actual-strip');
  if (strips.length === 0) return;

  let minTranslateY = 0;
  let maxTranslateY = 0;

  // 全ストリップのtransform値を解析
  strips.forEach(strip => {
    const transform = strip.style.transform;
    if (transform && transform.includes('translateY')) {
      const match = transform.match(/translateY\(([^)]+)px\)/);
      if (match) {
        const translateY = parseFloat(match[1]);
        minTranslateY = Math.min(minTranslateY, translateY);
        maxTranslateY = Math.max(maxTranslateY, translateY);
      }
    }
  });

  // ストリップの基本高さ（52文字 * CHAR_HEIGHT）
  const stripHeight = 52 * CHAR_HEIGHT;
  const basePadding = 16;

  // 必要な上下の追加スペースを計算
  const topExtraSpace = Math.max(0, -minTranslateY);
  const bottomExtraSpace = Math.max(0, maxTranslateY);

  if (opts.mode === 'enc') {
    // 暗号化タブ: 上方向のはみ出し分だけpadding-topを加算して重なりを防止
    const newPaddingTop = basePadding + topExtraSpace;
    const newMinHeight = stripHeight + topExtraSpace + bottomExtraSpace + basePadding * 2;
    container.style.paddingTop = `${newPaddingTop}px`;
    container.style.minHeight = `${newMinHeight}px`;
    console.log(`Container adjusted (ENC): paddingTop=${newPaddingTop}px, minHeight=${newMinHeight}px, translateY range: ${minTranslateY} to ${maxTranslateY}`);
  } else {
    // 復号タブ: はみ出しを避けるため上下方向の余白を確保（枠内に収める）
    const newPaddingTop = basePadding + topExtraSpace;
    const newMinHeight = stripHeight + topExtraSpace + bottomExtraSpace + basePadding * 2;
    container.style.paddingTop = `${newPaddingTop}px`;
    container.style.minHeight = `${newMinHeight}px`;
    console.log(`Container adjusted (DEC): paddingTop=${newPaddingTop}px, minHeight=${newMinHeight}px, translateY range: ${minTranslateY} to ${maxTranslateY}`);
  }
}

const CHAR_HEIGHT = 24; // px grid step used for all vertical math
const BASELINE_ROW_INDEX_ENC = 13; // 14th row for encryption view
const BASELINE_ROW_INDEX_DEC = 39; // 40th row for decryption view (lower half)

// 基準線とラベルの位置を動的に調整（コンテナpadding基準で安定化）
function updateBaselinePosition(container, opts = { mode: 'enc' }) {
  // 既存の動的要素と古い固定要素を削除
  const existingBaseline = container.querySelector('.dynamic-baseline');
  const existingLabel = container.querySelector('.dynamic-baseline-label');
  const existingCipherLine = container.querySelector('.dynamic-cipher-line');
  const existingCipherLabel = container.querySelector('.dynamic-cipher-label');
  const oldCipherLine = container.querySelector('.cipher-line');
  const oldCipherLabel = container.querySelector('.cipher-line-label');

  if (existingBaseline) existingBaseline.remove();
  if (existingLabel) existingLabel.remove();
  if (existingCipherLine) existingCipherLine.remove();
  if (existingCipherLabel) existingCipherLabel.remove();
  if (oldCipherLine) oldCipherLine.remove();
  if (oldCipherLabel) oldCipherLabel.remove();

  // コンテナのpaddingTopを基準に安定した基準線を算出
  const cs = getComputedStyle(container);
  const padTop = parseFloat(cs.paddingTop) || 16;
  const baseRow = opts.mode === 'dec' ? BASELINE_ROW_INDEX_DEC : BASELINE_ROW_INDEX_ENC;
  let baselineTop = padTop + (baseRow + 1) * CHAR_HEIGHT;
  // ピクセルに揃える（サブピクセルのズレを防ぐ）
  baselineTop = Math.round(baselineTop);
  // ラインの位置を計算（encは下方向、decは上方向）
  const gap = (opts && Number.isInteger(opts.gap)) ? opts.gap : state.cipherRowGapEnc;
  const cipherLineTop = opts.mode === 'dec'
    ? (baselineTop - gap * CHAR_HEIGHT)
    : (baselineTop + gap * CHAR_HEIGHT);

  // 動的基準線を作成（ストリップより前面に配置）
  const baseline = document.createElement('div');
  baseline.className = 'dynamic-baseline';
  baseline.style.cssText = `
    position: absolute;
    top: ${baselineTop}px;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--accent-red);
    z-index: 100;
    pointer-events: none;
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
  `;

  // 基準線ラベルを作成
  const label = document.createElement('div');
  label.className = 'dynamic-baseline-label';
  label.textContent = opts.mode === 'dec' ? '基準線（暗号文）' : '基準線（平文）';
  label.style.cssText = `
    position: absolute;
    top: ${baselineTop}px;
    left: 16px;
    transform: translateY(-50%);
    background: var(--accent-red);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    z-index: 101;
    pointer-events: none;
  `;

  // 動的暗号文ラインを作成
  const cipherLine = document.createElement('div');
  cipherLine.className = 'dynamic-cipher-line';
  cipherLine.style.cssText = `
    position: absolute;
    top: ${cipherLineTop}px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent-blue);
    z-index: 110;
    pointer-events: none;
    box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
  `;

  // 暗号文ラインラベルを作成
  const cipherLabel = document.createElement('div');
  cipherLabel.className = 'dynamic-cipher-label';
  cipherLabel.textContent = opts.mode === 'dec'
    ? `平文候補行 (段差-${gap})`
    : `暗号文候補 (段差+${gap})`;
  cipherLabel.style.cssText = `
    position: absolute;
    top: ${cipherLineTop}px;
    right: 16px; /* ラベルをストリップの右側に配置 */
    transform: translateY(-50%);
    background: var(--accent-blue);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    z-index: 111;
    pointer-events: none;
  `;

  container.appendChild(baseline);
  container.appendChild(label);
  container.appendChild(cipherLine);
  container.appendChild(cipherLabel);
}

// トースト表示機能
function showToast(message, duration = 3000) {
  // 既存のトーストがあれば削除
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // 新しいトーストを作成
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // アニメーション開始
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // 指定時間後に非表示
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300); // トランジション時間
  }, duration);
}


// 鍵語 → 装着順（アルファベット順割当／同字は左から若番）
function frameOrderFromKeyphrase(key, lengthNeeded) {
  const cleaned = key.toUpperCase().replace(/[^A-Z]/g, "");
  if (!cleaned.length) return null;
  const N = cleaned.length;
  // 各文字の順位（A→Z）でグルーピングし、出現順に番号を振る
  const entries = cleaned.split("").map((ch, idx) => ({ ch, idx }));
  // 文字→出現index配列（左から）
  const map = {};
  entries.forEach(e => {
    if (!map[e.ch]) map[e.ch] = [];
    map[e.ch].push(e.idx);
  });
  // A→Zの順に、各文字の出現位置を左から処理して連番を付与
  const orderNums = Array(N).fill(0);
  let num = 1;
  for (const letter of ALPHABET) {
    const arr = map[letter];
    if (!arr) continue;
    for (const pos of arr) {
      orderNums[pos] = num++;
    }
  }
  // 1..N を 0..N-1 に変換（装着するストリップのインデックスとして）
  // ※本数＝鍵語長とするのが自然。必要本数と一致しない場合は切詰め／不足分は先頭から補完。
  const zeroBased = orderNums.map(n => n - 1);
  let frame = zeroBased;
  // 長さ調整
  if (lengthNeeded && lengthNeeded > 0) {
    if (frame.length > lengthNeeded) frame = frame.slice(0, lengthNeeded);
    if (frame.length < lengthNeeded) {
      // 不足分は 0.. で埋める（重複OK。運用で避けたい場合は後で手動修正）
      const pad = [];
      let p = 0;
      while (frame.length + pad.length < lengthNeeded) {
        pad.push(p % N); p++;
      }
      frame = frame.concat(pad);
    }
  }
  return frame;
}


// ---------- 簡素化されたストリップ暗号 ----------
function simpleEncrypt(plain, options = {}) {
  if (state.frameOrder.length === 0) throw new Error("ストリップが設定されていません。");


  let result = "";
  let charIndex = 0;

  const src = plain;
  for (let i = 0; i < src.length; i++) {
    const raw = src[i];
    let P = normalizeLetters(raw);

    if (!isAlpha(P)) {
      continue;
    }

    // 使用するストリップを循環で選択
    const stripIndex = state.frameOrder[charIndex % state.frameOrder.length];
    const stripText = state.strips[stripIndex];

    // ストリップ内で平文文字の位置を検索
    const plaintextPositionInStrip = stripText.indexOf(P);
    if (plaintextPositionInStrip === -1) {
      throw new Error(`文字 '${P}' がストリップ #${stripIndex} に見つかりません`);
    }

    // ストリップを移動させて、平文文字を基準位置（例：位置13）に配置
    // 段差位置（基準位置 + 段差）から暗号文字を読み取る
    const basePosition = 13; // 基準線の位置（任意の固定値）
    const cipherPosition = (basePosition + state.cipherRowGap) % 26;

    // ストリップ上での実際の暗号文字位置を計算
    // 平文が基準位置に来るようにストリップをスライドした状態で、段差位置の文字を取得
    const gap = Number.isInteger(options.gap) ? options.gap : state.cipherRowGapEnc;
    const actualCipherPosition = (plaintextPositionInStrip + gap) % 26;
    const C = stripText[actualCipherPosition];

    console.log(`Encrypt char ${charIndex}: '${P}' at strip pos ${plaintextPositionInStrip} -> slide to baseline -> read cipher at gap +${gap} = '${C}'`);

    result += C;

    charIndex++;
  }

  return result;
}

function simpleDecrypt(cipher, options = {}) {
  if (state.frameOrder.length === 0) throw new Error("ストリップが設定されていません。");

  // 入力正規化（空白除去）
  const src = cipher.toUpperCase().replace(/[^A-Z]/g, "");
  let result = "";

  for (let i = 0; i < src.length; i++) {
    const C = src[i];
    if (!isAlpha(C)) continue;

    // 使用するストリップを循環で選択
    const stripIndex = state.frameOrder[i % state.frameOrder.length];
    const stripText = state.strips[stripIndex];

    // ストリップ内で暗号文字の位置を検索
    const cipherPositionInStrip = stripText.indexOf(C);
    if (cipherPositionInStrip === -1) {
      throw new Error(`暗号文字 '${C}' がストリップ #${stripIndex} に見つかりません`);
    }

    // 平文文字位置を計算：暗号文字位置 - 段差 (mod 26)
    const gap = Number.isInteger(options.gap) ? options.gap : state.cipherRowGapDec;
    const plaintextPositionInStrip = (cipherPositionInStrip - gap + 26) % 26;
    const P = stripText[plaintextPositionInStrip];
    result += P;
  }

  return result;
}


// ---------- UI 初期化 ----------
function initTabs() {
  $$(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach(b => b.classList.remove("active"));
      $$(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const id = btn.dataset.tab;
      $("#" + id).classList.add("active");

      // タブ切替時に復号エリアを再描画して高さ・基準線を調整
      if (id === 'dec') {
        try {
          refreshDecStrips();
          autoDecrypt();
          const container = $("#decStripsDisplay");
          if (container) {
            requestAnimationFrame(() => updateBaselinePosition(container, { mode: 'dec', gap: state.cipherRowGapDec }));
          }
        } catch {}
      }
    });
  });
}

function refreshStripsTextarea() {
  $("#stripsText").value = state.strips.join("\n");
}

// 実際のストリップ表示を更新
function refreshActualStrips() {
  const container = $("#actualStripsContainer");
  container.innerHTML = "";

  if (state.strips.length === 0) {
    const message = document.createElement("div");
    message.className = "no-strips-message";
    message.textContent = "上の設定からストリップを生成してください";
    container.appendChild(message);
    return;
  }

  // 各ストリップを表示
  for (let i = 0; i < state.strips.length; i++) {
    const alphabet = state.strips[i];
    const actualStrip = alphabet + alphabet; // 26文字を2回繰り返し

    const stripElement = document.createElement("div");
    stripElement.className = "actual-strip";

    // ストリップヘッダー
    const header = document.createElement("div");
    header.className = "actual-strip-header";
    header.textContent = `#${i}`;

    // ストリップ本体
    const body = document.createElement("div");
    body.className = "actual-strip-body";

    // 文字を縦に配置
    for (let j = 0; j < actualStrip.length; j++) {
      const charElement = document.createElement("div");
      charElement.className = "actual-strip-char";
      charElement.textContent = actualStrip[j];

      // 最初の26文字と繰り返し部分で背景色を変える
      if (j < 26) {
        charElement.classList.add("first-section");
      } else {
        charElement.classList.add("repeat-section");
      }

      // 26文字目には区切りのスタイルを追加
      if (j === 25) {
        charElement.classList.add("section-end");
      }

      body.appendChild(charElement);
    }

    stripElement.appendChild(header);
    stripElement.appendChild(body);
    container.appendChild(stripElement);
  }
}



function initCipherControls() {
  const upBtn = $("#cipherUpBtn");
  const downBtn = $("#cipherDownBtn");
  const offsetValue = $("#cipherOffsetValue");

  // 既存のイベントリスナーがある場合は削除して重複を防ぐ
  if (upBtn._cipherControlsInitialized) {
    return;
  }
  upBtn._cipherControlsInitialized = true;

  function updateCipherPosition() {
    // 段差表示を更新
    offsetValue.textContent = state.cipherRowGapEnc;

    // ボタンの状態を更新
    upBtn.disabled = state.cipherRowGapEnc >= 25;
    downBtn.disabled = state.cipherRowGapEnc <= 1;

    // 暗号化結果とストリップ表示を更新
    autoEncrypt();
    const pt = $("#plainText").value || "";
    const hasAlpha = /[A-Za-z]/.test(pt);
    if (hasAlpha) {
      // 文字がある場合のみストリップ再配置（不要な再配置で基準線が揺れないように）
      refreshEncStrips();
    }

    // 段差変更時に基準線と暗号文ラインの位置も更新
    const container = $("#encStripsDisplay");
    if (container) {
      updateBaselinePosition(container, { mode: 'enc', gap: state.cipherRowGapEnc });
    }

    console.log(`Cipher row gap (enc) updated to: ${state.cipherRowGapEnc}`);
  }

  // ボタンイベントリスナー
  upBtn.addEventListener('click', () => {
    console.log(`Up button clicked (enc), current gap: ${state.cipherRowGapEnc}`);
    if (state.cipherRowGapEnc < 25) {
      state.cipherRowGapEnc++;
      updateCipherPosition();
    }
  });

  downBtn.addEventListener('click', () => {
    console.log(`Down button clicked (enc), current gap: ${state.cipherRowGapEnc}`);
    if (state.cipherRowGapEnc > 1) {
      state.cipherRowGapEnc--;
      updateCipherPosition();
    }
  });

  // 初期状態を設定
  updateCipherPosition();
}

function updatePlaintextWarnings() {
  const warningsContainer = $("#plainTextWarnings");
  const plainText = $("#plainText").value;
  const maxChars = state.frameOrder.length || 10; // デフォルト10文字

  // 警告をクリア
  warningsContainer.innerHTML = "";

  if (!plainText.trim()) {
    return; // 空文字の場合は警告不要
  }

  // アルファベット文字のみを抽出
  const alphaChars = [];
  const nonAlphaChars = [];

  for (let i = 0; i < plainText.length; i++) {
    const char = plainText[i].toUpperCase();
    if (char >= 'A' && char <= 'Z') {
      alphaChars.push(char);
    } else {
      nonAlphaChars.push(plainText[i]);
    }
  }

  const warnings = [];

  // 非アルファベット文字の警告
  if (nonAlphaChars.length > 0) {
    warnings.push(`非アルファベット文字（${nonAlphaChars.slice(0, 5).join(', ')}${nonAlphaChars.length > 5 ? '...' : ''}）は処理から除外されます`);
  }

  // 文字数超過の警告
  if (alphaChars.length > maxChars) {
    warnings.push(`最初の${maxChars}文字だけを処理対象とします（${alphaChars.length}文字入力済み）`);
  }

  // 警告メッセージを表示
  warnings.forEach(warning => {
    const warningDiv = document.createElement("div");
    warningDiv.className = "warning-message";
    warningDiv.textContent = warning;
    warningsContainer.appendChild(warningDiv);
  });
}

function refreshEncStrips() {
  const container = $("#encStripsDisplay");
  container.innerHTML = "";

  if (state.frameOrder.length === 0) {
    const message = document.createElement("div");
    message.className = "no-strips-message";
    message.textContent = "ストリップ設定タブでストリップを配置してください";
    container.appendChild(message);
    return;
  }


  // 平文を取得して各文字のストリップ位置を計算
  const plainText = $("#plainText").value;

  // 各ストリップが担当する平文文字を計算
  const stripPlaintextChars = {};
  let alphaCharIndex = 0; // アルファベット文字のインデックス（ストリップ選択用）

  for (let i = 0; i < plainText.length; i++) {
    const rawChar = plainText[i];
    const normalizedChar = normalizeLetters(rawChar);

    if (!isAlpha(normalizedChar)) {
      continue; // 非アルファベット文字はスキップ
    }

    const stripIndex = alphaCharIndex % state.frameOrder.length;
    if (!stripPlaintextChars[stripIndex]) {
      stripPlaintextChars[stripIndex] = [];
    }
    const alphaIndex = normalizedChar.charCodeAt(0) - 65; // A=0, B=1, ...
    stripPlaintextChars[stripIndex].push({
      char: normalizedChar,
      position: alphaIndex,
      charIndex: alphaCharIndex,
      originalIndex: i // 元のテキストでの位置
    });

    alphaCharIndex++;
  }

  // frameOrderに従ってストリップを表示（read-only版）
  for (let i = 0; i < state.frameOrder.length; i++) {
    const rowIndex = state.frameOrder[i];
    const alphabet = state.strips[rowIndex];

    console.log(`Strip ${i}: rowIndex=${rowIndex}, alphabet="${alphabet}"`);

    if (!alphabet) {
      console.error(`Strip ${i}: No alphabet found for rowIndex ${rowIndex}`);
      continue;
    }

    const actualStrip = alphabet + alphabet; // 26文字を2回繰り返し

    const stripElement = document.createElement("div");
    stripElement.className = "actual-strip enc-strip-readonly";
    const charHeight = 24; // px; must match CSS in enc view
    const plaintextChars = stripPlaintextChars[i];

    // ストリップヘッダー
    const header = document.createElement("div");
    header.className = "actual-strip-header";
    header.textContent = `#${rowIndex}`;

    // ストリップ本体
    const body = document.createElement("div");
    body.className = "actual-strip-body";

    // 平文の文字位置に応じてハイライトする文字のインデックスを計算
    const highlightPositions = new Set();

    if (plaintextChars && plaintextChars.length > 0) {
      // このストリップが担当する全ての平文文字をハイライト
      plaintextChars.forEach((charInfo, idx) => {
        const plainChar = charInfo.char;

        // ストリップ内での平文文字の位置を検索
        const charPositionInStrip = alphabet.indexOf(plainChar);

        if (charPositionInStrip >= 0) {
          // 上側の青色部分のみハイライト
          highlightPositions.add(charPositionInStrip);

          // デバッグ情報（最初の文字のみ）
          if (idx === 0) {
            const cipherIndex_debug = (13 + state.cipherRowGapEnc) % 52;
            const cipherChar = actualStrip[cipherIndex_debug];
            console.log(`Alpha char ${charInfo.charIndex} (orig pos ${charInfo.originalIndex}): '${plainChar}' (strip position ${charPositionInStrip}) at baseline position 13 -> cipher position ${cipherIndex_debug}: '${cipherChar}'`);
          }
        }
      });
    }

    // 文字を縦に配置
    for (let j = 0; j < actualStrip.length; j++) {
      const charElement = document.createElement("div");
      charElement.className = "actual-strip-char";
      charElement.textContent = actualStrip[j];

      // 最初の26文字と繰り返し部分で背景色を変える
      if (j < 26) {
        charElement.classList.add("first-section");
      } else {
        charElement.classList.add("repeat-section");
      }

      // 26文字目には区切りのスタイルを追加
      if (j === 25) {
        charElement.classList.add("section-end");
      }

      // 平文文字に対応する位置をハイライト（細い赤枠のみ）
      if (highlightPositions.has(j)) {
        charElement.classList.add("highlight-active");
      }

      body.appendChild(charElement);
    }

    // Position indicator
    const positionIndicator = document.createElement("div");
    positionIndicator.className = "strip-position";
    positionIndicator.textContent = `位置 ${i + 1}`;

    stripElement.appendChild(header);
    stripElement.appendChild(body);
    stripElement.appendChild(positionIndicator);
    container.appendChild(stripElement);

    // Store first plaintext char position for alignment (or -1 if none)
    let firstPlainPos = -1;
    if (plaintextChars && plaintextChars.length > 0) {
      const firstChar = plaintextChars[0].char;
      const pos = alphabet.indexOf(firstChar);
      if (pos >= 0) firstPlainPos = pos;
    }
    stripElement.dataset.firstPlainPos = String(firstPlainPos);
  }

  // Align all strips to the baseline based on final container geometry
  const alignAllStripsToBaseline = () => {
    const containerRect = container.getBoundingClientRect();
    const cs = getComputedStyle(container);
    const padTop = parseFloat(cs.paddingTop) || 16;
    const baselineTop = Math.round(padTop + (BASELINE_ROW_INDEX_ENC + 1) * CHAR_HEIGHT);

    container.querySelectorAll('.enc-strip-readonly').forEach(strip => {
      const body = strip.querySelector('.actual-strip-body');
      if (!body) return;
      let pos = parseInt(strip.dataset.firstPlainPos || '-1', 10);
      // 初回表示など対象文字が無い場合は14文字目(インデックス13)に揃える
      if (pos < 0) pos = 13;
      const bRect = body.getBoundingClientRect();
      const bTopRel = bRect.top - containerRect.top;
      const currentBottom = bTopRel + (pos + 1) * CHAR_HEIGHT;
      const shiftAmount = Math.round(baselineTop - currentBottom);
      strip.style.transform = `translateY(${shiftAmount}px)`;
    });
  };

  // Step 1: initial align, Step 2: adjust height (ENC), Step 3: final align + line redraw
  alignAllStripsToBaseline();
  adjustContainerHeight(container, { mode: 'enc' });
  requestAnimationFrame(() => {
    alignAllStripsToBaseline();
    updateBaselinePosition(container, { mode: 'enc', gap: state.cipherRowGapEnc });
    // 初回描画でのズレ回避のため、もう一度次フレームで位置を確定
    requestAnimationFrame(() => updateBaselinePosition(container, { mode: 'enc', gap: state.cipherRowGapEnc }));
  });

  console.log(`refreshEncStrips: Total strips rendered: ${container.children.length}`);
}

function refreshFrameView() {
  $("#frameOrderView").textContent = "[" + state.frameOrder.join(", ") + "]";
  // strips visualization using the same style as actual strips
  const container = $("#offsetTable");
  container.innerHTML = "";

  // Create strips display
  for (let i = 0; i < state.frameOrder.length; i++) {
    const rowIndex = state.frameOrder[i];
    const alphabet = state.strips[rowIndex];
    const actualStrip = alphabet + alphabet; // 26文字を2回繰り返し

    const stripElement = document.createElement("div");
    stripElement.className = "actual-strip draggable-strip";
    stripElement.draggable = true;
    stripElement.dataset.stripIndex = String(i);
    stripElement.dataset.rowIndex = String(rowIndex);

    // ストリップヘッダー
    const header = document.createElement("div");
    header.className = "actual-strip-header";
    header.textContent = `#${rowIndex}`;

    // ストリップ本体
    const body = document.createElement("div");
    body.className = "actual-strip-body";

    // 文字を縦に配置
    for (let j = 0; j < actualStrip.length; j++) {
      const charElement = document.createElement("div");
      charElement.className = "actual-strip-char";
      charElement.textContent = actualStrip[j];

      // 最初の26文字と繰り返し部分で背景色を変える
      if (j < 26) {
        charElement.classList.add("first-section");
      } else {
        charElement.classList.add("repeat-section");
      }

      // 26文字目には区切りのスタイルを追加
      if (j === 25) {
        charElement.classList.add("section-end");
      }

      body.appendChild(charElement);
    }

    // Position indicator
    const positionIndicator = document.createElement("div");
    positionIndicator.className = "strip-position";
    positionIndicator.textContent = `位置 ${i + 1}`;

    stripElement.appendChild(header);
    stripElement.appendChild(body);
    stripElement.appendChild(positionIndicator);

    container.appendChild(stripElement);
  }

  // Add drag and drop functionality
  setupStripDragAndDrop(container);

  // Update encryption strips display
  refreshEncStrips();

  // Update plaintext warnings (max chars might have changed)
  updatePlaintextWarnings();
}

// ---------- ドラッグ＆ドロップ ----------
let dragState = {
  draggedIndex: -1,
  dropContainer: null
};

function setupStripDragAndDrop(container) {
  // 既存のイベントリスナーをクリア（重複を避ける）
  if (dragState.dropContainer === container) return;

  dragState.dropContainer = container;

  container.addEventListener('dragstart', (e) => {
    const stripElement = e.target.closest('.draggable-strip');
    if (stripElement) {
      dragState.draggedIndex = parseInt(stripElement.dataset.stripIndex);
      stripElement.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
      // データ転送に情報を保存（DOM要素に依存しない）
      e.dataTransfer.setData('text/plain', dragState.draggedIndex.toString());
    }
  });

  container.addEventListener('dragend', (e) => {
    const stripElement = e.target.closest('.draggable-strip');
    if (stripElement) {
      stripElement.style.opacity = '1';
    }
    // draggedIndexはリセットしない（dropで使用するため）
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();

    // データ転送から情報を取得
    const transferredIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const draggedIndex = isNaN(transferredIndex) ? dragState.draggedIndex : transferredIndex;

    if (draggedIndex === -1) {
      return;
    }

    const dropTarget = e.target.closest('.draggable-strip');
    if (!dropTarget) {
      return;
    }

    const dropIndex = parseInt(dropTarget.dataset.stripIndex);

    // 同じ要素にドロップした場合は何もしない
    if (draggedIndex === dropIndex) {
      dragState.draggedIndex = -1;
      return;
    }

    // frameOrder配列の要素を入れ替え
    const draggedRowIndex = state.frameOrder[draggedIndex];
    const dropRowIndex = state.frameOrder[dropIndex];

    state.frameOrder[draggedIndex] = dropRowIndex;
    state.frameOrder[dropIndex] = draggedRowIndex;

    // 状態をリセット
    dragState.draggedIndex = -1;

    // 表示を更新
    refreshFrameView();
  });
}

// ---------- 折りたたみ機能 ----------
function toggleAdvancedSettings() {
  const content = document.getElementById('advancedContent');
  const toggle = document.getElementById('advancedToggle');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    toggle.textContent = '▲';
  } else {
    content.classList.add('collapsed');
    toggle.textContent = '▼';
  }
}

// ---------- 事件（イベント） ----------
function initBuildTab() {
  $("#btnGenRandom").addEventListener("click", () => {
    const n = Number($("#genCount").value) || 10;
    state.strips = Array.from({length:n}, () => randPermutationAlphabet());
    refreshStripsTextarea();
    refreshActualStrips();
    refreshFrameView();
  });

  $("#btnGenKeyword").addEventListener("click", () => {
    const kw = $("#keywordAlpha").value.trim();
    if (!kw) { alert("キーワードを入力してください"); return; }
    const n = Number($("#genCount").value) || 10;
    const base = keyedAlphabet(kw);
    // 1本目は base、2本目以降は base をちょい回転して変化を付ける
    const strips = [];
    for (let i = 0; i < n; i++) {
      const rot = i % 26;
      strips.push(base.slice(rot) + base.slice(0, rot));
    }
    state.strips = strips;
    refreshStripsTextarea();
    refreshActualStrips();
    refreshFrameView();
  });

  $("#btnValidate").addEventListener("click", () => {
    const lines = $("#stripsText").value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const msgs = [];
    lines.forEach((ln, i) => {
      const up = ln.toUpperCase().replace(/[^A-Z]/g, "");
      if (up.length !== 26) msgs.push(`line ${i}: 文字数=${up.length}（26である必要）`);
      const set = new Set(up.split(""));
      if (set.size !== 26) msgs.push(`line ${i}: 文字重複あり`);
      for (const ch of ALPHABET) {
        if (!set.has(ch)) msgs.push(`line ${i}: 欠落文字 ${ch}`);
      }
    });
    $("#validateMsg").textContent = msgs.length ? msgs.join("\n") : "OK: 26文字×各行、重複・欠落なし";
  });


  $("#btnApplyStrips").addEventListener("click", () => {
    const lines = $("#stripsText").value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    state.strips = lines.map(s => s.toUpperCase().replace(/[^A-Z]/g, ""));
    // 初回は frame を先頭から使う
    const use = Math.min(state.strips.length, Number($("#useCount").value) || 10);
    state.frameOrder = Array.from({length: use}, (_,i)=>i);
    refreshActualStrips();
    refreshFrameView();
    alert("ストリップを生成しました。");
  });
}

function initFrameTab() {
  $("#btnUseFirst").addEventListener("click", () => {
    const requestedCount = Number($("#useCount").value) || 10;

    if (requestedCount > state.strips.length) {
      alert(`エラー: 使用本数(${requestedCount})が生成されたストリップ数(${state.strips.length})を超えています。\n\nストリップ作成タブで十分な数のストリップを生成してください。`);
      return;
    }

    const use = Math.min(state.strips.length, requestedCount);
    state.frameOrder = Array.from({length: use}, (_,i)=>i);
    refreshFrameView();
  });

  $("#btnFrameByKey").addEventListener("click", () => {
    const key = $("#frameKey").value.trim();
    const requestedCount = Number($("#useCount").value) || 10;

    if (requestedCount > state.strips.length) {
      alert(`エラー: 使用本数(${requestedCount})が生成されたストリップ数(${state.strips.length})を超えています。\n\nストリップ作成タブで十分な数のストリップを生成してください。`);
      return;
    }

    const need = Math.min(state.strips.length, requestedCount);
    const order = frameOrderFromKeyphrase(key, need);
    if (!order) { alert("鍵語を入力してください"); return; }
    state.frameOrder = order;
    refreshFrameView();
  });

  $("#btnApplyOrder").addEventListener("click", () => {
    const s = $("#manualOrder").value.trim();
    if (!s) return;
    const arr = s.split(",").map(x => Number(x.trim())).filter(x => Number.isInteger(x));
    // 有効範囲のみに絞る
    const valid = arr.filter(i => Number.isInteger(i) && i >= 0 && i < state.strips.length);
    if (!valid.length) { alert("有効なインデックスがありません"); return; }
    state.frameOrder = valid;
    refreshFrameView();
  });

}

function autoEncrypt() {
  try {
    const pt = $("#plainText").value;
    const out = simpleEncrypt(pt, { gap: state.cipherRowGapEnc });
    $("#cipherText").value = out;
  } catch (e) {
    $("#cipherText").value = "Error: " + e.message;
  }
}

function initEncTab() {
  // 平文同期ボタンは削除（Encryptタブには同期なし）
  // 平文クリア
  const clearBtn = $("#btnClearPlain");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const ta = $("#plainText");
      if (ta) {
        ta.value = "";
        updatePlaintextWarnings();
        refreshEncStrips();
        autoEncrypt();
        showToast("平文をクリアしました");
        ta.focus();
      }
    });
  }
  $("#btnCopyCipher").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("#cipherText").value);
      showToast("暗号文をコピーしました");
    } catch (error) {
      showToast("コピーに失敗しました");
    }
  });

  // 平文入力のリアルタイム反映
  $("#plainText").addEventListener("input", () => {
    updatePlaintextWarnings();
    refreshEncStrips();
    autoEncrypt();
    const container = $("#encStripsDisplay");
    if (container) {
      requestAnimationFrame(() => updateBaselinePosition(container, { mode: 'enc', gap: state.cipherRowGapEnc }));
    }
  });

  // 初回実行は、ストリップが設定された後に実行
  setTimeout(() => {
    updatePlaintextWarnings();
    initCipherControls();
    autoEncrypt();
  }, 0);
}

function autoDecrypt() {
  try {
    const ct = $("#cipherIn").value;
    const out = simpleDecrypt(ct);
    $("#plainOut").value = out;
  } catch (e) {
    $("#plainOut").value = "Error: " + e.message;
  }
}

function initDecCipherControls() {
  const upBtn = $("#decCipherUpBtn");
  const downBtn = $("#decCipherDownBtn");
  const offsetValue = $("#decCipherOffsetValue");

  if (!upBtn || upBtn._cipherControlsInitialized) return;
  upBtn._cipherControlsInitialized = true;

  function update() {
    offsetValue.textContent = `-${state.cipherRowGapDec}`;
    upBtn.disabled = state.cipherRowGapDec >= 25;
    downBtn.disabled = state.cipherRowGapDec <= 1;
    refreshDecStrips();
    autoDecrypt();
  }

  upBtn.addEventListener('click', () => {
    if (state.cipherRowGapDec < 25) { state.cipherRowGapDec++; update(); }
  });
  downBtn.addEventListener('click', () => {
    if (state.cipherRowGapDec > 1) { state.cipherRowGapDec--; update(); }
  });

  update();
}

function refreshDecStrips() {
  const container = $("#decStripsDisplay");
  if (!container) return;
  container.innerHTML = "";

  if (state.frameOrder.length === 0) {
    const message = document.createElement("div");
    message.className = "no-strips-message";
    message.textContent = "ストリップ設定タブでストリップを配置してください";
    container.appendChild(message);
    return;
  }

  const cipherText = $("#cipherIn").value;

  // 各ストリップが担当する暗号文字を計算
  const stripCipherChars = {};
  let alphaCharIndex = 0;
  for (let i = 0; i < cipherText.length; i++) {
    const raw = cipherText[i].toUpperCase();
    if (!isAlpha(raw)) continue;
    const stripIndex = alphaCharIndex % state.frameOrder.length;
    if (!stripCipherChars[stripIndex]) stripCipherChars[stripIndex] = [];
    stripCipherChars[stripIndex].push({ char: raw, charIndex: alphaCharIndex, originalIndex: i });
    alphaCharIndex++;
  }

  // ストリップを描画
  for (let i = 0; i < state.frameOrder.length; i++) {
    const rowIndex = state.frameOrder[i];
    const alphabet = state.strips[rowIndex];
    if (!alphabet) continue;
    const actualStrip = alphabet + alphabet;

    const stripElement = document.createElement("div");
    stripElement.className = "actual-strip enc-strip-readonly";

    // header
    const header = document.createElement("div");
    header.className = "actual-strip-header";
    header.textContent = `#${rowIndex}`;

    // body
    const body = document.createElement("div");
    body.className = "actual-strip-body";

    // ハイライト対象（暗号文字の位置）
    const highlightPositions = new Set();
    const cipherChars = stripCipherChars[i];
    let firstCipherPos = -1;
    if (cipherChars && cipherChars.length > 0) {
      cipherChars.forEach((info) => {
        const pos = alphabet.indexOf(info.char);
        if (pos >= 0) {
          // 下半分（26..51）を優先してマーキング（基準線が下側のため）
          const preferred = (BASELINE_ROW_INDEX_DEC >= 26 && pos + 26 < 52) ? (pos + 26) : pos;
          highlightPositions.add(preferred);
          if (firstCipherPos === -1) firstCipherPos = preferred;
        }
      });
    }
    stripElement.dataset.firstCipherPos = String(firstCipherPos);

    for (let j = 0; j < actualStrip.length; j++) {
      const chEl = document.createElement("div");
      chEl.className = "actual-strip-char";
      chEl.textContent = actualStrip[j];
      if (j < 26) chEl.classList.add("first-section");
      else chEl.classList.add("repeat-section");
      if (j === 25) chEl.classList.add("section-end");
      if (highlightPositions.has(j)) chEl.classList.add("highlight-active");
      body.appendChild(chEl);
    }

    const positionIndicator = document.createElement("div");
    positionIndicator.className = "strip-position";
    positionIndicator.textContent = `位置 ${i + 1}`;

    stripElement.appendChild(header);
    stripElement.appendChild(body);
    stripElement.appendChild(positionIndicator);
    container.appendChild(stripElement);
  }

  // 整列とライン再描画
  const alignAll = () => {
    const containerRect = container.getBoundingClientRect();
    const cs = getComputedStyle(container);
    const padTop = parseFloat(cs.paddingTop) || 16;
    const baselineTop = Math.round(padTop + (BASELINE_ROW_INDEX_DEC + 1) * CHAR_HEIGHT);

    container.querySelectorAll('.enc-strip-readonly').forEach(strip => {
      const body = strip.querySelector('.actual-strip-body');
      if (!body) return;
      let pos = parseInt(strip.dataset.firstCipherPos || '-1', 10);
      // 初回表示など対象文字が無い場合は下半分の基準行(40行目=インデックス39)に揃える
      if (pos < 0) pos = BASELINE_ROW_INDEX_DEC;
      const bRect = body.getBoundingClientRect();
      const bTopRel = bRect.top - containerRect.top;
      const currentBottom = bTopRel + (pos + 1) * CHAR_HEIGHT;
      const shiftAmount = Math.round(baselineTop - currentBottom);
      strip.style.transform = `translateY(${shiftAmount}px)`;
    });
  };

  alignAll();
  adjustContainerHeight(container, { mode: 'dec' });
  requestAnimationFrame(() => {
    alignAll();
    updateBaselinePosition(container, { mode: 'dec', gap: state.cipherRowGapDec });
    // 初回描画でのズレ回避のため、もう一度次フレームで位置を確定
    requestAnimationFrame(() => updateBaselinePosition(container, { mode: 'dec', gap: state.cipherRowGapDec }));
  });
}

function initDecTab() {
  // 同期ボタン（暗号化タブの暗号文→復号タブの入力）
  const syncBtn = $("#btnSyncCipherFromEnc");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      const srcEl = $("#cipherText");
      const src = srcEl ? srcEl.value : "";
      $("#cipherIn").value = src || "";
      refreshDecStrips();
      autoDecrypt();
      const container = $("#decStripsDisplay");
      if (container) requestAnimationFrame(() => updateBaselinePosition(container, { mode: 'dec', gap: state.cipherRowGapDec }));
      showToast("暗号化タブの暗号文を同期しました");
    });
  }

  // 暗号文クリア
  const clearCipherBtn = $("#btnClearCipherIn");
  if (clearCipherBtn) {
    clearCipherBtn.addEventListener("click", () => {
      $("#cipherIn").value = "";
      refreshDecStrips();
      autoDecrypt();
      const container = $("#decStripsDisplay");
      if (container) requestAnimationFrame(() => updateBaselinePosition(container, { mode: 'dec', gap: state.cipherRowGapDec }));
      showToast("暗号文をクリアしました");
    });
  }

  $("#btnCopyPlain").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("#plainOut").value);
      showToast("平文（候補）をコピーしました");
    } catch (error) {
      showToast("コピーに失敗しました");
    }
  });

  $("#cipherIn").addEventListener("input", () => {
    refreshDecStrips();
    autoDecrypt();
    const container = $("#decStripsDisplay");
    if (container) requestAnimationFrame(() => updateBaselinePosition(container, { mode: 'dec', gap: state.cipherRowGapDec }));
  });

  setTimeout(() => {
    initDecCipherControls();
    autoDecrypt();
  }, 0);
}



// ---------- 初期ロード ----------
function boot() {
  initTabs();
  initBuildTab();
  initFrameTab();
  initEncTab();
  initDecTab();

  // 起動時にランダムストリップを生成
  const defaultStripCount = 10;
  state.strips = Array.from({length: defaultStripCount}, () => randPermutationAlphabet());
  state.frameOrder = Array.from({length: defaultStripCount}, (_, i) => i);

  console.log('Generated random strips:', state.strips);
  refreshStripsTextarea();
  refreshActualStrips();
  refreshFrameView();
  refreshEncStrips();

  // 暗号化タブの初期設定（ストリップ設定後）
  if ($("#plainText")) {
    updatePlaintextWarnings();
    autoEncrypt();
  }

}

document.addEventListener("DOMContentLoaded", boot);
