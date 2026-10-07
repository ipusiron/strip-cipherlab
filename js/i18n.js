// 画面の言語（日本語・英語）の決定と、静的な文言の差し替え（通常のスクリプト。globalThis.StripI18n に置く）
// 初期の言語: URL の ?lang= → 保存した選択 → ブラウザーの言語（日本語以外は英語）
(function (root) {
  "use strict";
  const KEY = "strip-cipherlab-lang";
  let current = "ja";

  function fromQuery(search) {
    const m = /[?&]lang=(ja|en)(&|$)/.exec(search || "");
    return m ? m[1] : null;
  }

  function initialLanguage(search, saved, browserLanguages) {
    const q = fromQuery(search);
    if (q) return q;
    if (saved === "ja" || saved === "en") return saved;
    const first = (browserLanguages || []).find((l) => typeof l === "string" && l);
    return first && first.toLowerCase().startsWith("ja") ? "ja" : "en";
  }

  function readSaved() {
    try {
      return root.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function save(lang) {
    try {
      root.localStorage.setItem(KEY, lang);
    } catch (e) {
      // 保存できなくても切り替えは効く
    }
  }

  const getLanguage = () => current;
  const t = (key, params) => root.StripMessages.t(current, key, params);

  // data-i18n（文字）と data-i18n-attr（"属性:キー;属性:キー"）を辞書から入れ直す
  function applyStaticText(doc) {
    doc.documentElement.lang = current;
    for (const node of doc.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
    for (const node of doc.querySelectorAll("[data-i18n-attr]")) {
      for (const part of node.dataset.i18nAttr.split(";")) {
        const [attr, key] = part.split(":");
        node.setAttribute(attr, t(key));
      }
    }
  }

  function use(lang, doc) {
    current = lang === "en" ? "en" : "ja";
    applyStaticText(doc);
  }

  root.StripI18n = { KEY, fromQuery, initialLanguage, readSaved, save, getLanguage, t, applyStaticText, use };
})(typeof globalThis !== "undefined" ? globalThis : this);
