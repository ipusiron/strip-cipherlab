/* ===============================
 * Strip CipherLab（教育用簡易モデル）
 * - ストリップ作成（ランダム・合言葉・手入力）
 * - ストリップ初期設定（使用本数・鍵語・番号で装着順を決める）
 * - 暗号化／復号（26行の窓で、群ごとにストリップを滑らせて読む）
 * - 座学
 * 計算は js/strip-core.js（StripCore）、画面の文言は js/messages.js（StripMessages）
 * =============================== */

const Core = globalThis.StripCore;
const Messages = globalThis.StripMessages;

// ---------- 状態 ----------
const state = {
  strips: [],                 // ["QWERTY...", ...] 26文字各
  stripsVersion: 0,           // ストリップを作り直すたびに増やす（窓を作り直す目印）
  frameOrder: [],             // 装着順（左→右）。ストリップの添字（0始まり。画面では1始まりの番号）
  cipherRowGapEnc: 1,         // 暗号化タブ用 段差（1〜25。「全部の群で同じ」のとき）
  encGapMode: "group",        // 暗号化の段差の決め方: "group"（群ごと）か "fixed"（全部の群で同じ）
  encGaps: [],                // 群ごとの段差（足りない分は乱数で足す）
  cipherRowGapDec: 1,         // 復号タブ用 段差（1〜25。「全部の群で同じ」のとき）
  decGapMode: "group",        // 復号の段差の決め方: "group"（群ごとに選ぶ）か "fixed"（全部の群で同じ）
  decGaps: [],                // 群ごとに選んだ段差（足りない分は1）
  encGroup: 0,                // 暗号化タブの窓に出している群（0始まり）
  decGroup: 0,                // 復号タブの窓に出している群（0始まり）
};

// ---------- ユーティリティ ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const t = (key, params) => Messages.t("ja", key, params);
const stripLabel = (index) => "#" + (index + 1);
const gapLabel = (g, mode) => (mode === "dec" ? "-" : "+") + g;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function clampInt(value, min, max, fallback) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// 状態表示の欄（role="status"）に文言を出す。kind は "ok" か "error"
function setMessage(selector, lines, kind) {
  const box = $(selector);
  box.textContent = Array.isArray(lines) ? lines.join("\n") : (lines || "");
  box.classList.toggle("is-error", kind === "error");
  box.classList.toggle("is-ok", kind === "ok");
}

// トースト表示機能（#toast は aria-live の欄）
let toastTimer = 0;
function showToast(message, duration = 3000) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

async function copyText(text, okKey) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(t(okKey));
  } catch (e) {
    showToast(t("toast.copyFailed"));
  }
}

// ---------- ストリップの検査の文言 ----------
function describeProblems(parsed) {
  const lines = parsed.problems.map((p) => {
    const parts = [t("strip.line", { line: p.line, length: p.length })];
    if (p.duplicates.length) parts.push(t("strip.duplicates", { letters: p.duplicates.join(" ") }));
    if (p.missing.length) parts.push(t("strip.missing", { letters: p.missing.join(" ") }));
    return parts.join(t("sep.clause"));
  });
  if (parsed.tooMany) lines.push(t("strip.tooMany", { max: Core.MAX_STRIPS }));
  if (!parsed.strips.length && !parsed.problems.length) lines.push(t("strip.empty"));
  return lines;
}

function describeCycles(strips) {
  return Core.sameCycleGroups(strips).map((g) => t("strip.sameCycle", { list: g.map(stripLabel).join(t("sep.list")) }));
}

// ---------- 状態の変更（変えたら必ず全タブを描き直す） ----------
function setStrips(strips) {
  state.strips = strips;
  state.stripsVersion++;
  state.frameOrder = Core.firstOrder(strips.length);
  state.encGaps = [];
  state.decGaps = [];
  state.encGroup = 0;
  state.decGroup = 0;
  $("#useCount").value = String(strips.length);
  $("#stripsText").value = strips.join("\n");
  refreshActualStrips();
  renderOrderViews();
}

function setOrder(order) {
  state.frameOrder = order;
  state.encGaps = [];
  state.decGaps = [];
  state.encGroup = 0;
  state.decGroup = 0;
  $("#useCount").value = String(order.length);
  renderOrderViews();
}

function renderOrderViews() {
  refreshFrameView();
  renderEnc();
  renderDec();
}

// ---------- タブ ----------
function activateTab(btn, focus) {
  $$(".tab-btn").forEach((b) => {
    const on = b === btn;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  });
  $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === btn.dataset.tab));
  if (focus) btn.focus();
}

function initTabs() {
  const tabs = $$(".tab-btn");
  tabs.forEach((btn, i) => {
    btn.addEventListener("click", () => activateTab(btn, false));
    btn.addEventListener("keydown", (e) => {
      let next = -1;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      activateTab(tabs[next], true);
    });
  });
}

// ---------- ストリップ作成タブ ----------
// 実際のストリップ表示を更新（26文字を2回続けた52文字）
function refreshActualStrips() {
  const container = $("#actualStripsContainer");
  container.replaceChildren();
  if (state.strips.length === 0) {
    container.appendChild(el("div", "no-strips-message", t("build.noStrips")));
    return;
  }
  state.strips.forEach((alphabet, i) => {
    const stripElement = el("div", "actual-strip");
    stripElement.appendChild(el("div", "actual-strip-header", stripLabel(i)));
    const body = el("div", "actual-strip-body");
    const doubled = alphabet + alphabet;
    for (let j = 0; j < doubled.length; j++) {
      // 最初の26文字と繰り返し部分で背景色を変え、26文字目に区切りを付ける
      const charElement = el("div", "actual-strip-char " + (j < 26 ? "first-section" : "repeat-section"), doubled[j]);
      if (j === 25) charElement.classList.add("section-end");
      body.appendChild(charElement);
    }
    stripElement.appendChild(body);
    container.appendChild(stripElement);
  });
}

function readGenCount() {
  const n = clampInt($("#genCount").value, 1, Core.MAX_STRIPS, 10);
  $("#genCount").value = String(n);
  return n;
}

function initBuildTab() {
  $("#btnGenRandom").addEventListener("click", () => {
    const n = readGenCount();
    setStrips(Core.randomStrips(n, Core.cryptoBytes));
    setMessage("#genMsg", t("build.generated", { count: n }), "ok");
    setMessage("#validateMsg", "");
  });

  $("#btnGenPassphrase").addEventListener("click", () => {
    const pass = Core.normalizePassphrase($("#passphrase").value);
    if (!pass) { setMessage("#genMsg", t("build.needPassphrase"), "error"); return; }
    const n = readGenCount();
    setStrips(Core.passphraseStrips(pass, n));
    setMessage("#genMsg", t("build.generatedPass", { count: n }), "ok");
    setMessage("#validateMsg", "");
  });

  $("#btnValidate").addEventListener("click", () => {
    const parsed = Core.parseStrips($("#stripsText").value);
    const problems = describeProblems(parsed);
    if (problems.length) { setMessage("#validateMsg", problems, "error"); return; }
    const cycles = describeCycles(parsed.strips);
    setMessage("#validateMsg", [t("strip.valid", { count: parsed.strips.length })].concat(cycles), cycles.length ? "error" : "ok");
  });

  $("#btnApplyStrips").addEventListener("click", () => {
    const parsed = Core.parseStrips($("#stripsText").value);
    const problems = describeProblems(parsed);
    if (problems.length) {
      setMessage("#validateMsg", [t("strip.notApplied")].concat(problems), "error");
      return;
    }
    setStrips(parsed.strips);
    const cycles = describeCycles(parsed.strips);
    setMessage("#validateMsg", [t("strip.applied", { count: parsed.strips.length })].concat(cycles), cycles.length ? "error" : "ok");
    setMessage("#genMsg", "");
  });
}

// ---------- ストリップ初期設定タブ ----------
function refreshFrameView() {
  $("#frameOrderView").textContent = state.frameOrder.map((i) => i + 1).join(" ");
  const container = $("#offsetTable");
  container.replaceChildren();
  const last = state.frameOrder.length - 1;
  state.frameOrder.forEach((rowIndex, i) => {
    const stripElement = el("div", "actual-strip draggable-strip");
    stripElement.draggable = true;
    stripElement.dataset.stripIndex = String(i);
    stripElement.appendChild(el("div", "actual-strip-header", stripLabel(rowIndex)));
    const body = el("div", "actual-strip-body");
    for (const ch of state.strips[rowIndex]) body.appendChild(el("div", "actual-strip-char first-section", ch));
    stripElement.appendChild(body);

    // 位置と、キーボード・タッチで並べ替えるボタン
    const foot = el("div", "strip-position");
    const left = el("button", "move-btn", "◀");
    left.type = "button";
    left.dataset.move = String(i);
    left.dataset.dir = "-1";
    left.disabled = i === 0;
    left.setAttribute("aria-label", t("frame.moveLeft", { strip: stripLabel(rowIndex), pos: i + 1 }));
    const right = el("button", "move-btn", "▶");
    right.type = "button";
    right.dataset.move = String(i);
    right.dataset.dir = "1";
    right.disabled = i === last;
    right.setAttribute("aria-label", t("frame.moveRight", { strip: stripLabel(rowIndex), pos: i + 1 }));
    foot.append(left, el("span", "strip-position-num", t("frame.position", { n: i + 1 })), right);
    stripElement.appendChild(foot);
    container.appendChild(stripElement);
  });
  setupStripDragAndDrop(container);
}

// 装着順の i 番目と j 番目を入れ替える
function swapOrder(i, j) {
  const order = state.frameOrder.slice();
  [order[i], order[j]] = [order[j], order[i]];
  setOrder(order);
}

// ---------- ドラッグ＆ドロップ ----------
let dragState = {
  draggedIndex: -1,
  dropContainer: null
};

function setupStripDragAndDrop(container) {
  // リスナーは一度だけ登録する（描き直しでは要素だけ入れ替わる）
  if (dragState.dropContainer === container) return;
  dragState.dropContainer = container;

  container.addEventListener("dragstart", (e) => {
    const stripElement = e.target.closest(".draggable-strip");
    if (!stripElement) return;
    dragState.draggedIndex = parseInt(stripElement.dataset.stripIndex, 10);
    stripElement.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(dragState.draggedIndex));
  });

  container.addEventListener("dragend", (e) => {
    const stripElement = e.target.closest(".draggable-strip");
    if (stripElement) stripElement.classList.remove("dragging");
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    const transferredIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    const draggedIndex = Number.isNaN(transferredIndex) ? dragState.draggedIndex : transferredIndex;
    dragState.draggedIndex = -1;
    const dropTarget = e.target.closest(".draggable-strip");
    if (draggedIndex < 0 || !dropTarget) return;
    const dropIndex = parseInt(dropTarget.dataset.stripIndex, 10);
    if (draggedIndex === dropIndex || !(draggedIndex < state.frameOrder.length)) return;
    swapOrder(draggedIndex, dropIndex);
  });

  // ◀ ▶ のボタン（描き直したあとも同じ向きのボタンにフォーカスを戻す）
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".move-btn");
    if (!btn || btn.disabled) return;
    const i = Number(btn.dataset.move);
    const dir = Number(btn.dataset.dir);
    swapOrder(i, i + dir);
    const moved = container.querySelector(`.move-btn[data-move="${i + dir}"][data-dir="${dir}"]`);
    const back = container.querySelector(`.move-btn[data-move="${i + dir}"][data-dir="${-dir}"]`);
    (moved && !moved.disabled ? moved : back).focus();
  });
}

function initFrameTab() {
  $("#btnUseFirst").addEventListener("click", () => {
    const n = clampInt($("#useCount").value, 1, Core.MAX_STRIPS, 10);
    if (n > state.strips.length) {
      setMessage("#frameMsg", t("frame.tooMany", { use: n, count: state.strips.length }), "error");
      return;
    }
    setOrder(Core.firstOrder(n));
    setMessage("#frameMsg", t("frame.first", { use: n }), "ok");
  });

  $("#btnFrameByKey").addEventListener("click", () => {
    const res = Core.orderFromKeyword($("#frameKey").value, state.strips.length);
    if (!res.ok) {
      const key = res.reason === "empty" ? "frame.keyEmpty" : "frame.keyTooLong";
      setMessage("#frameMsg", t(key, { length: res.letters.length, count: state.strips.length }), "error");
      return;
    }
    setOrder(res.order);
    setMessage("#frameMsg", t("frame.keyOk", { letters: res.letters, ranks: res.ranks.join(" "), use: res.order.length }), "ok");
  });

  $("#btnApplyOrder").addEventListener("click", () => {
    const res = Core.parseOrder($("#manualOrder").value, state.strips.length);
    if (!res.ok) {
      const bad = (res.bad || []).join(t("sep.list"));
      setMessage("#frameMsg", t("frame.order." + res.reason, { bad, count: state.strips.length }), "error");
      return;
    }
    setOrder(res.order);
    setMessage("#frameMsg", t("frame.orderOk", { use: res.order.length }), "ok");
  });
}

// ---------- 窓（26行） ----------
// mode "enc": 群の文字を最上段（段差0）にそろえ、下の25行が段差 +1〜+25
// mode "dec": 群の文字を最下段にそろえ、上の25行が段差 -1〜-25
// 位置は計算部の offset から決める（画面の寸法は測らない）
function renderWindow(container, groupLetters, mode, gap) {
  if (!state.frameOrder.length) {
    container.replaceChildren(el("div", "no-strips-message", t("common.noOrder")));
    return;
  }
  const columns = Core.windowColumns(groupLetters, state.strips, state.frameOrder, mode);
  const baseRow = mode === "dec" ? Core.MAX_GAP : 0;
  const gapRow = Core.rowOfGap(gap, mode);
  const signature = state.stripsVersion + "|" + state.frameOrder.join(",") + "|" + mode;
  let win = container.querySelector(".frame-window");
  if (!win || win.dataset.signature !== signature) {
    win = el("div", "frame-window " + mode);
    win.dataset.signature = signature;
    const labels = el("div", "fw-labels");
    labels.appendChild(el("div", "fw-corner", t("window.gap")));
    for (let k = 0; k < Core.SIZE; k++) {
      if (k === baseRow) {
        labels.appendChild(el("div", "fw-row-label is-base", t(mode === "dec" ? "window.cipherRow" : "window.plainRow")));
        continue;
      }
      const g = mode === "dec" ? Core.MAX_GAP - k : k;
      const b = el("button", "fw-row-label", gapLabel(g, mode));
      b.type = "button";
      b.dataset.gap = String(g);
      b.setAttribute("aria-label", t("window.pickGap", { gap: gapLabel(g, mode) }));
      labels.appendChild(b);
    }
    labels.appendChild(el("div", "fw-corner fw-corner-foot", t("window.position")));
    const stripsBox = el("div", "fw-strips");
    stripsBox.setAttribute("aria-hidden", "true");
    columns.forEach((c) => {
      const col = el("div", "fw-strip");
      col.appendChild(el("div", "fw-head", stripLabel(c.strip)));
      const viewport = el("div", "fw-viewport");
      const tape = el("div", "fw-tape");
      for (const ch of state.strips[c.strip].repeat(2)) tape.appendChild(el("div", "fw-cell", ch));
      viewport.appendChild(tape);
      col.append(viewport, el("div", "fw-foot", String(c.position + 1)));
      stripsBox.appendChild(col);
    });
    win.append(labels, stripsBox);
    container.replaceChildren(win);
  }
  // 滑らせる量（CSS 変数 --offset）と、基準の行・段差の行の印を更新する
  const cols = win.querySelectorAll(".fw-strip");
  columns.forEach((c, i) => {
    const col = cols[i];
    col.classList.toggle("is-idle", !c.letter);
    const tape = col.querySelector(".fw-tape");
    tape.style.setProperty("--offset", String(c.offset));
    tape.querySelectorAll(".is-base, .is-gap").forEach((cell) => cell.classList.remove("is-base", "is-gap"));
    if (c.letter) {
      tape.children[c.offset + baseRow].classList.add("is-base");
      tape.children[c.offset + gapRow].classList.add("is-gap");
    }
  });
  win.querySelectorAll(".fw-row-label[data-gap]").forEach((b) => {
    const on = Number(b.dataset.gap) === gap;
    b.classList.toggle("is-gap", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function renderWarnings(box, items) {
  box.replaceChildren(...items.map((w) => el("div", w.kind === "info" ? "info-message" : "warning-message", w.text)));
}

function renderGroupNav(prefix, count, index, text) {
  $("#" + prefix + "GroupLabel").textContent = count ? t("group.label", { n: index + 1, total: count }) : t("group.none");
  $("#" + prefix + "GroupPrev").disabled = index <= 0;
  $("#" + prefix + "GroupNext").disabled = index >= count - 1;
  $("#" + prefix + "GroupText").textContent = text;
}

// 入力欄のカーソルの手前の英字の数から、カーソルのある群を返す
function groupAtCaret(textarea, r) {
  const before = Core.lettersOnly(textarea.value.slice(0, textarea.selectionStart || 0)).length;
  return before ? Math.floor((before - 1) / r) : 0;
}

const clampGroup = (index, count) => Math.max(0, Math.min(index, count - 1));

// ---------- 暗号化タブ ----------
// 群ごとの段差を、群の数まで乱数で足す（今ある値は変えない）
function ensureEncGaps(count) {
  if (state.encGaps.length < count) state.encGaps = state.encGaps.concat(Core.randomGaps(count - state.encGaps.length, Core.cryptoBytes));
}

// 群 i の段差（決め方に従う）
const encGapOf = (i) => (state.encGapMode === "group" ? state.encGaps[i] : state.cipherRowGapEnc);

function renderEnc() {
  const raw = $("#plainText").value;
  const letters = Core.lettersOnly(raw);
  const r = state.frameOrder.length;
  const groups = r ? Core.splitGroups(letters, r) : [];
  const perGroup = state.encGapMode === "group";
  ensureEncGaps(Math.max(groups.length, 1));
  state.encGroup = clampGroup(state.encGroup, groups.length);
  const gap = encGapOf(state.encGroup);
  const warnings = [];
  const dropped = Core.droppedChars(raw);
  if (dropped.length) {
    warnings.push({ kind: "warn", text: t("enc.dropped", { chars: dropped.slice(0, 8).join(" ") + (dropped.length > 8 ? " …" : "") }) });
  }
  let cipher = "";
  if (!r) {
    warnings.push({ kind: "warn", text: t("common.noOrder") });
  } else {
    if (letters.length > r) {
      const params = { length: letters.length, r, groups: groups.length, gap: gapLabel(gap, "enc") };
      warnings.push({ kind: "info", text: t(perGroup ? "enc.groupsPerGroup" : "enc.groupsFixed", params) });
    }
    cipher = Core.encrypt(letters, state.strips, state.frameOrder, perGroup ? state.encGaps : state.cipherRowGapEnc);
  }
  renderWarnings($("#plainTextWarnings"), warnings);
  $("#cipherText").value = cipher;

  $("#cipherOffsetValue").textContent = gapLabel(gap, "enc");
  $("#cipherUpBtn").disabled = gap <= 1;
  $("#cipherDownBtn").disabled = gap >= Core.MAX_GAP;
  $("#btnRerollGaps").hidden = !perGroup;
  // 群ごとの段差の控え（送り手のメモ。受け手には知らせない）
  $("#encGapList").textContent = perGroup && groups.length
    ? t("enc.gapList", { list: groups.map((_, i) => gapLabel(state.encGaps[i], "enc")).join(" ") })
    : "";

  const group = groups[state.encGroup] || "";
  const text = group
    ? t("enc.groupText", { plain: group, cipher: Core.splitGroups(cipher, r)[state.encGroup], gap: gapLabel(gap, "enc") })
    : t("enc.groupEmpty");
  renderGroupNav("enc", groups.length, state.encGroup, text);
  renderWindow($("#encStripsDisplay"), group, "enc", gap);
}

// 段差を変える（群ごとのときは窓に出している群の段差だけ）
function setEncGap(g) {
  const v = clampInt(g, 1, Core.MAX_GAP, 1);
  if (state.encGapMode === "group") {
    ensureEncGaps(state.encGroup + 1);
    state.encGaps[state.encGroup] = v;
  } else {
    state.cipherRowGapEnc = v;
  }
  renderEnc();
}

function initEncTab() {
  $("#btnClearPlain").addEventListener("click", () => {
    $("#plainText").value = "";
    state.encGroup = 0;
    renderEnc();
    showToast(t("toast.plainCleared"));
    $("#plainText").focus();
  });
  $("#btnCopyCipher").addEventListener("click", () => copyText($("#cipherText").value, "toast.cipherCopied"));

  // 平文入力のリアルタイム反映（窓はカーソルのある群を出す）
  $("#plainText").addEventListener("input", () => {
    state.encGroup = groupAtCaret($("#plainText"), state.frameOrder.length || 1);
    renderEnc();
  });

  $("#cipherUpBtn").addEventListener("click", () => setEncGap(encGapOf(state.encGroup) - 1));
  $("#cipherDownBtn").addEventListener("click", () => setEncGap(encGapOf(state.encGroup) + 1));
  $$("input[name=encGapMode]").forEach((radio) => radio.addEventListener("change", () => {
    state.encGapMode = radio.value;
    renderEnc();
  }));
  $("#btnRerollGaps").addEventListener("click", () => {
    state.encGaps = [];
    renderEnc();
    showToast(t("toast.gapsRerolled"));
  });
  $("#encGroupPrev").addEventListener("click", () => { state.encGroup--; renderEnc(); });
  $("#encGroupNext").addEventListener("click", () => { state.encGroup++; renderEnc(); });
  $("#encStripsDisplay").addEventListener("click", (e) => {
    const b = e.target.closest(".fw-row-label[data-gap]");
    if (b) setEncGap(Number(b.dataset.gap));
  });
}

// ---------- 復号タブ ----------
const ENGLISH = () => globalThis.StripEnglish.bigram;
const SHORT_GROUP = 8; // これより短い群は点数の1位が外れやすい（tools/evaluate.mjs: 5文字で1位約70%、8文字で約93%）
const scoreLabel = (score) => (score === null ? t("cand.noScore") : score.toFixed(2));

function ensureDecGaps(count) {
  while (state.decGaps.length < count) state.decGaps.push(1);
}

// 群 i の段差（決め方に従う）
const decGapOf = (i) => (state.decGapMode === "group" ? state.decGaps[i] : state.cipherRowGapDec);

// 候補の表（群ごと: その群の25行／全部の群で同じ: 全文の25通り）。描き直してもフォーカスを同じ段差に戻す
function renderCandidates(cands, selectedGap, title, note) {
  $("#candTitle").textContent = title;
  renderWarnings($("#candNote"), note ? [{ kind: "info", text: note }] : []);
  const body = $("#candBody");
  const active = document.activeElement;
  const focused = active && body.contains(active) ? Number(active.dataset.gap) : 0;
  body.replaceChildren(...cands.map((c) => {
    const tr = el("tr", c.gap === selectedGap ? "is-selected" : "");
    const btn = el("button", "cand-btn mono", c.text.length > 60 ? c.text.slice(0, 60) + "…" : c.text);
    btn.type = "button";
    btn.dataset.gap = String(c.gap);
    btn.setAttribute("aria-pressed", c.gap === selectedGap ? "true" : "false");
    btn.setAttribute("aria-label", t("cand.pick", { gap: gapLabel(c.gap, "dec"), rank: c.rank, score: scoreLabel(c.score) }));
    const textCell = el("td", "cand-text");
    textCell.appendChild(btn);
    tr.append(el("td", "cand-rank", t("cand.rank", { n: c.rank })), el("td", "cand-gap mono", gapLabel(c.gap, "dec")),
      textCell, el("td", "cand-score mono", scoreLabel(c.score)));
    return tr;
  }));
  if (focused) {
    const again = body.querySelector(`.cand-btn[data-gap="${focused}"]`);
    if (again) again.focus();
  }
}

function renderDec() {
  const raw = $("#cipherIn").value;
  const letters = Core.lettersOnly(raw);
  const r = state.frameOrder.length;
  const groups = r ? Core.splitGroups(letters, r) : [];
  const perGroup = state.decGapMode === "group";
  ensureDecGaps(Math.max(groups.length, 1));
  state.decGroup = clampGroup(state.decGroup, groups.length);
  const gap = decGapOf(state.decGroup);
  const warnings = [];
  const dropped = Core.droppedChars(raw);
  if (dropped.length) {
    warnings.push({ kind: "warn", text: t("dec.dropped", { chars: dropped.slice(0, 8).join(" ") + (dropped.length > 8 ? " …" : "") }) });
  }
  let plain = "";
  if (!r) {
    warnings.push({ kind: "warn", text: t("common.noOrder") });
  } else {
    plain = Core.decrypt(letters, state.strips, state.frameOrder, perGroup ? state.decGaps : state.cipherRowGapDec);
  }
  renderWarnings($("#cipherInWarnings"), warnings);
  $("#plainOut").value = plain;

  $("#decCipherOffsetValue").textContent = gapLabel(gap, "dec");
  $("#decCipherUpBtn").disabled = gap >= Core.MAX_GAP;
  $("#decCipherDownBtn").disabled = gap <= 1;
  $("#btnAutoGaps").disabled = !groups.length;
  $("#decGapList").textContent = perGroup && groups.length
    ? t("dec.gapList", { list: groups.map((_, i) => gapLabel(state.decGaps[i], "dec")).join(" ") })
    : "";

  const group = groups[state.decGroup] || "";
  let cands = [];
  if (group) {
    cands = perGroup
      ? Core.rankCandidates(group, state.strips, state.frameOrder, ENGLISH())
      : Core.rankFixedCandidates(letters, state.strips, state.frameOrder, ENGLISH());
  }
  const picked = cands.find((c) => c.gap === gap);
  const title = !group ? t("cand.titleEmpty") : t(perGroup ? "cand.titleGroup" : "cand.titleFixed", { n: state.decGroup + 1 });
  const note = perGroup && group && group.length < SHORT_GROUP ? t("cand.short", { n: group.length }) : "";
  renderCandidates(cands, gap, title, note);

  const plainGroup = r ? Core.splitGroups(plain, r)[state.decGroup] || "" : "";
  const text = group
    ? t("dec.groupText", { cipher: group, plain: plainGroup, gap: gapLabel(gap, "dec"),
      score: scoreLabel(Core.englishScore(plainGroup, ENGLISH())), rank: picked ? picked.rank : "-" })
    : t("dec.groupEmpty");
  renderGroupNav("dec", groups.length, state.decGroup, text);
  renderWindow($("#decStripsDisplay"), group, "dec", gap);
}

// 段差を変える（群ごとのときは窓に出している群の段差だけ）
function setDecGap(g) {
  const v = clampInt(g, 1, Core.MAX_GAP, 1);
  if (state.decGapMode === "group") {
    ensureDecGaps(state.decGroup + 1);
    state.decGaps[state.decGroup] = v;
  } else {
    state.cipherRowGapDec = v;
  }
  renderDec();
}

// 点数1位の段差を選ぶ（群ごと: 各群の1位／全部の群で同じ: 全文の1位）
function autoGaps() {
  const letters = Core.lettersOnly($("#cipherIn").value);
  if (!letters || !state.frameOrder.length) return;
  if (state.decGapMode === "group") {
    state.decGaps = Core.bestGaps(letters, state.strips, state.frameOrder, ENGLISH());
  } else {
    state.cipherRowGapDec = Core.rankFixedCandidates(letters, state.strips, state.frameOrder, ENGLISH())[0].gap;
  }
  renderDec();
  showToast(t("toast.autoGaps"));
}

function initDecTab() {
  // 暗号化タブの暗号文→復号タブの入力
  $("#btnSyncCipherFromEnc").addEventListener("click", () => {
    $("#cipherIn").value = $("#cipherText").value;
    state.decGroup = 0;
    state.decGaps = [];
    renderDec();
    showToast(t("toast.synced"));
  });
  $("#btnClearCipherIn").addEventListener("click", () => {
    $("#cipherIn").value = "";
    state.decGroup = 0;
    state.decGaps = [];
    renderDec();
    showToast(t("toast.cipherCleared"));
    $("#cipherIn").focus();
  });
  $("#btnCopyPlain").addEventListener("click", () => copyText($("#plainOut").value, "toast.plainCopied"));

  $("#cipherIn").addEventListener("input", () => {
    state.decGroup = groupAtCaret($("#cipherIn"), state.frameOrder.length || 1);
    renderDec();
  });

  $("#decCipherUpBtn").addEventListener("click", () => setDecGap(decGapOf(state.decGroup) + 1));
  $("#decCipherDownBtn").addEventListener("click", () => setDecGap(decGapOf(state.decGroup) - 1));
  $$("input[name=decGapMode]").forEach((radio) => radio.addEventListener("change", () => {
    state.decGapMode = radio.value;
    renderDec();
  }));
  $("#btnAutoGaps").addEventListener("click", autoGaps);
  $("#candBody").addEventListener("click", (e) => {
    const b = e.target.closest(".cand-btn");
    if (b) setDecGap(Number(b.dataset.gap));
  });
  $("#decGroupPrev").addEventListener("click", () => { state.decGroup--; renderDec(); });
  $("#decGroupNext").addEventListener("click", () => { state.decGroup++; renderDec(); });
  $("#decStripsDisplay").addEventListener("click", (e) => {
    const b = e.target.closest(".fw-row-label[data-gap]");
    if (b) setDecGap(Number(b.dataset.gap));
  });
}

// ---------- 初期ロード ----------
function boot() {
  initTabs();
  initBuildTab();
  initFrameTab();
  initEncTab();
  initDecTab();

  // 起動時にランダムなストリップを10本作り、先頭から並べる
  setStrips(Core.randomStrips(10, Core.cryptoBytes));
}

document.addEventListener("DOMContentLoaded", boot);
