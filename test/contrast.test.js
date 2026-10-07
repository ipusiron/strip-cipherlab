import test from "node:test";
import assert from "node:assert/strict";
import { read } from "./load.js";

const css = read("style.css");
const root = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
const vars = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
const color = (c) => (c.startsWith("--") ? vars[c.slice(2)] : c);

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [x, y] = [luminance(color(a)), luminance(color(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// 文字の色と下地の組（WCAG 2.2 の 1.4.3、4.5:1 以上）
const PAIRS = [
  ["--text-primary", "--bg-secondary"], ["--text-primary", "--bg-primary"], ["--text-primary", "--bg-accent"],
  ["--text-primary", "--warn-bg"], ["--text-primary", "--info-bg"], ["--text-primary", "--ok-bg"], ["--text-primary", "--error-bg"],
  ["--text-secondary", "--bg-secondary"], ["--text-secondary", "--bg-primary"], ["--text-secondary", "--bg-accent"],
  ["--text-muted", "--bg-secondary"], ["--text-muted", "--bg-primary"], ["--text-muted", "#f0f4f8"], ["--text-muted", "#f5f7fa"],
  ["#ffffff", "--accent-blue"], ["#ffffff", "--accent-blue-hover"], ["#ffffff", "--accent-green"],
  ["#ffffff", "--row-base"], ["#ffffff", "--row-gap"], ["#ffffff", "--text-secondary"], ["#ffffff", "--ok"],
  ["--accent-blue-hover", "--bg-accent"], ["--accent-blue-hover", "--bg-secondary"],
];

test("文字と下地の組はすべて 4.5:1 以上", () => {
  for (const [fg, bg] of PAIRS) {
    assert.ok(color(fg) && color(bg), `${fg} ${bg}`);
    const r = ratio(fg, bg);
    assert.ok(r >= 4.5, `${fg} on ${bg} = ${r.toFixed(2)}`);
  }
});

test("白い文字を載せる面は変数で塗る（直書きの淡い色に白を載せない）", () => {
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const [, sel, body] of blocks) {
    if (!/color:\s*white/.test(body)) continue;
    const bg = body.match(/background:\s*([^;]+);/);
    if (!bg) continue;
    assert.match(bg[1].trim(), /^var\(--[\w-]+\)/, sel.trim());
  }
});

test("フォーカスの枠があり、動きを減らす設定で遷移を止める", () => {
  assert.match(css, /:focus-visible\s*\{\s*outline: 3px solid/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none !important/);
  // スマートフォンの入力欄は16px（iOS の拡大を防ぐ）。操作ボタンは44px
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?textarea \{\s*font-size: 16px;/);
  assert.match(css, /\.cipher-control-btn \{[^}]*width: 44px;[^}]*height: 44px;/);
  assert.match(css, /\.group-btn \{[^}]*min-width: 44px;[^}]*min-height: 44px;/);
});
