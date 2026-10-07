import test from "node:test";
import assert from "node:assert/strict";
import { read } from "./load.js";

// 1行に詰め込んだ（minify した）ファイルを検出する
const LIMITS = [
  ["script.js", 160, 300], ["js/strip-core.js", 160, 150], ["js/messages.js", 160, 40], ["style.css", 160, 500],
  ["index.html", 250, 150],
  ["test/core.test.js", 160, 100], ["test/html.test.js", 160, 40], ["test/messages.test.js", 160, 20],
  ["test/contrast.test.js", 160, 30], ["test/format.test.js", 160, 10], ["test/load.js", 160, 10],
];

test("最長の行と行数の下限", () => {
  for (const [file, maxLen, minLines] of LIMITS) {
    const lines = read(file).split("\n");
    const longest = Math.max(...lines.map((l) => l.length));
    assert.ok(longest <= maxLen, `${file}: ${longest}`);
    assert.ok(lines.length >= minLines, `${file}: ${lines.length} lines`);
  }
});

test("改行は LF、制御文字（タブを除く）がない", () => {
  for (const [file] of LIMITS) {
    const s = read(file);
    assert.ok(!s.includes("\r"), file);
    assert.doesNotMatch(s, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/, file);
  }
});
