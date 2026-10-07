# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Strip CipherLab is an educational web tool for learning the strip cipher (M-138-A style) through interactive visualization. It is a static HTML/CSS/JavaScript application that runs entirely in the browser (no build step, no dependencies, works from `file://`).

## Architecture

### Files

- `index.html` - Single page with five tabs (ストリップ作成, ストリップ初期設定, 暗号化, 復号, 座学). Meta CSP is `'self'` only: no inline scripts, inline event handlers, or `style` attributes.
- `js/strip-core.js` - Pure logic (no DOM), exposed as `globalThis.StripCore`. Normalization, strip checks, keyword ranking, encrypt/decrypt, groups, the 26-row window, random strips (`crypto.getRandomValues`, rejection sampling) and passphrase strips (FNV-1a 32 + mulberry32 + Fisher–Yates).
- `js/english-data.js` - Generated table of English letter-pair log-likelihoods (`globalThis.StripEnglish`). Built by `tools/build-english.mjs` from `tools/corpus/train-pg1342.txt`; do not edit by hand.
- `js/messages.js` - UI strings in Japanese and English (`StripMessages.t(lang, key, params)`). `html.*` keys are the static texts of index.html (`data-i18n` / `data-i18n-attr`); the Japanese values must equal the HTML (tested). Keep JS string literals free of Japanese (tested).
- `js/i18n.js` - Language (`?lang=` → saved choice → browser language; non-Japanese means English) and replacement of static texts (`StripI18n`).
- `script.js` - DOM handling only: state, rendering, events.
- `style.css` - Styles. Colors are CSS variables in `:root` (contrast tested).

### State (`script.js`)

```javascript
const state = {
  strips: [],          // 26-letter alphabets
  stripsVersion: 0,    // bumped when strips are replaced (window rebuild key)
  frameOrder: [],      // strip indices (0-based) left to right; shown 1-based in the UI
  cipherRowGapEnc: 1,  // 1..25 (used when encGapMode is "fixed")
  encGapMode: "group", // "group" (gap per group, random by default) or "fixed"
  encGaps: [],         // gap per group; missing ones are filled with crypto random gaps
  cipherRowGapDec: 1,  // 1..25 (used when decGapMode is "fixed")
  decGapMode: "group", // "group" (pick per group) or "fixed"
  decGaps: [],         // chosen gap per group; missing ones are 1
  encGroup: 0,         // group shown in the encryption window
  decGroup: 0,         // group shown in the decryption window
};
```

- Every change goes through `setStrips()` / `setOrder()` / `renderEnc()` / `renderDec()`, which re-render all outputs (no stale results).
- `setStrips()` resets the frame order to all strips from the first one. Invalid strip text is rejected (nothing changes).
- Keyword order: the keyword length becomes the number of strips used; a keyword longer than the strip count is rejected.

### Cipher model

- Encrypt: group the letters by r (= `frameOrder.length`); letter i uses strip `frameOrder[i % r]`; output the letter `gap` rows below (`(pos + gap) % 26`). Decrypt subtracts.
- `gaps` in the core may be a number (same for all groups) or an array per group. The UI uses an array in "group" mode and a number in "fixed" mode.
- Candidates: `rankCandidates(group, strips, order, table)` returns the 25 rows (gap 1..25) sorted by `englishScore` (mean log P(next | prev)); `rankFixedCandidates` scores whole-text decryptions; `bestGaps` picks rank 1 per group. Short groups (< 8 letters) often rank a wrong row first; the UI shows a note.
- Window: `StripCore.windowColumns(groupLetters, strips, order, mode)` gives each column's `offset` into the doubled (52-letter) strip. `enc` puts the group on the top row (row k = gap +k); `dec` puts it on the bottom row (row 25-k = gap -k). The UI slides the tape with the CSS variable `--offset` and never measures layout.

## Development Commands

```bash
# Run tests (Node.js 22+, no dependencies)
npm test

# Rebuild / check the English table, and print the accuracy table shown in the README
node tools/build-english.mjs [--check]
node tools/evaluate.mjs

# Open directly in a browser, or serve locally
python -m http.server 8000
```

## Testing

- `test/core.test.js` - known answers (checked against an independent Python reference), round trips, boundaries
- `test/english.test.js` - English table rebuilt from the corpus, scores (checked against Python), candidates, random gaps, evaluation
- `test/readme.test.js` - README examples and the accuracy tables recomputed with the core / `tools/evaluate.mjs`, YAML metadata structure, directory tree, images, wording
- `test/html.test.js` - CSP, ARIA tabs, ids used by `script.js`
- `test/messages.test.js` - dictionary keys used by `script.js`, no Japanese literals in `script.js`
- `test/i18n.test.js` - same keys and placeholders in both languages, no Japanese in English, HTML text equals the Japanese dictionary, initial language
- `test/contrast.test.js` - text/background pairs at 4.5:1 or more
- `test/format.test.js` - line length, LF line endings

## Notes

- Keep the README YAML metadata structure (keys, order, HTML comment) as is; hackinglab.online reads it. The YAML is only in README.md.
- README.en.md is a full translation with the same headings as README.md (tested). Screenshots: `assets/` (Japanese) and `assets/en/` (English).
- The README directory tree must list every file with a one-line description (tested).
- GitHub Pages: `.nojekyll`, demo at https://ipusiron.github.io/strip-cipherlab/
