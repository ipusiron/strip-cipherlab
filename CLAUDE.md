# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Strip CipherLab is an educational web tool for learning the strip cipher (M-138-A style) through interactive visualization. It is a static HTML/CSS/JavaScript application that runs entirely in the browser (no build step, no dependencies, works from `file://`).

## Architecture

### Files

- `index.html` - Single page with five tabs (ストリップ作成, ストリップ初期設定, 暗号化, 復号, 座学). Meta CSP is `'self'` only: no inline scripts, inline event handlers, or `style` attributes.
- `js/strip-core.js` - Pure logic (no DOM), exposed as `globalThis.StripCore`. Normalization, strip checks, keyword ranking, encrypt/decrypt, groups, the 26-row window, random strips (`crypto.getRandomValues`, rejection sampling) and passphrase strips (FNV-1a 32 + mulberry32 + Fisher–Yates).
- `js/messages.js` - UI strings used by `script.js` (`StripMessages.t(lang, key, params)`). Only `ja` for now; keep JS string literals free of Japanese (tested).
- `script.js` - DOM handling only: state, rendering, events.
- `style.css` - Styles. Colors are CSS variables in `:root` (contrast tested).

### State (`script.js`)

```javascript
const state = {
  strips: [],          // 26-letter alphabets
  stripsVersion: 0,    // bumped when strips are replaced (window rebuild key)
  frameOrder: [],      // strip indices (0-based) left to right; shown 1-based in the UI
  cipherRowGapEnc: 1,  // 1..25
  cipherRowGapDec: 1,  // 1..25
  encGroup: 0,         // group shown in the encryption window
  decGroup: 0,         // group shown in the decryption window
};
```

- Every change goes through `setStrips()` / `setOrder()` / `renderEnc()` / `renderDec()`, which re-render all outputs (no stale results).
- `setStrips()` resets the frame order to all strips from the first one. Invalid strip text is rejected (nothing changes).
- Keyword order: the keyword length becomes the number of strips used; a keyword longer than the strip count is rejected.

### Cipher model

- Encrypt: group the letters by r (= `frameOrder.length`); letter i uses strip `frameOrder[i % r]`; output the letter `gap` rows below (`(pos + gap) % 26`). Decrypt subtracts.
- `gaps` in the core may be a number (same for all groups) or an array per group. The UI currently uses one gap for all groups.
- Window: `StripCore.windowColumns(groupLetters, strips, order, mode)` gives each column's `offset` into the doubled (52-letter) strip. `enc` puts the group on the top row (row k = gap +k); `dec` puts it on the bottom row (row 25-k = gap -k). The UI slides the tape with the CSS variable `--offset` and never measures layout.

## Development Commands

```bash
# Run tests (Node.js 22+, no dependencies)
npm test

# Open directly in a browser, or serve locally
python -m http.server 8000
```

## Testing

- `test/core.test.js` - known answers (checked against an independent Python reference), round trips, boundaries
- `test/readme.test.js` - README examples recomputed with the core, YAML metadata structure, directory tree, images, wording
- `test/html.test.js` - CSP, ARIA tabs, ids used by `script.js`
- `test/messages.test.js` - dictionary keys used by `script.js`, no Japanese literals in `script.js`
- `test/contrast.test.js` - text/background pairs at 4.5:1 or more
- `test/format.test.js` - line length, LF line endings

## Notes

- Keep the README YAML metadata structure (keys, order, HTML comment) as is; hackinglab.online reads it.
- The README directory tree must list every file with a one-line description (tested).
- GitHub Pages: `.nojekyll`, demo at https://ipusiron.github.io/strip-cipherlab/
