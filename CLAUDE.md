# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Strip CipherLab is an educational web tool for learning about strip cipher cryptography through interactive visualization. It's a static HTML/CSS/JavaScript application that runs entirely in the browser.

## Architecture

### Files Structure
- `index.html` - Single-page application with tabbed interface (ストリップ作成, フレーム設定, 暗号化, 復号, 座学)
- `script.js` - Core cipher logic and UI management (~1280 lines)
- `style.css` - Styling with CSS Grid layout for responsive panels

### Key Data Structures

**State Object (global, lines 12-18):**
```javascript
const state = {
  strips: [],           // Array of 26-character alphabets (e.g., "QWERTY...")
  frameOrder: [],       // Indices into strips array for frame ordering [0,1,2,...]
  cipherRowGapEnc: 1,   // Gap offset for encryption tab (1-25)
  cipherRowGapDec: 1,   // Gap offset for decryption tab (1-25)
};
```

### Cipher Algorithm

The strip cipher implementation:
1. **Encryption** (`simpleEncrypt`, line 292): For each plaintext char, find its position in the corresponding strip, add the gap offset (mod 26), return the character at that position
2. **Decryption** (`simpleDecrypt`, line 339): Reverse of encryption - subtract the gap offset (mod 26)

Key constants:
- `CHAR_HEIGHT = 24` (line 106) - pixel height per character in visualization
- `BASELINE_ROW_INDEX_ENC = 13` (line 107) - baseline row for encryption view
- `BASELINE_ROW_INDEX_DEC = 39` (line 108) - baseline row for decryption view

## Development Commands

This is a static site with no build process:

```bash
# Open directly in browser
start index.html  # Windows
open index.html   # macOS

# Or run local server
python -m http.server 8000
```

## Testing Approach

No automated tests. Manual testing via browser console:
- Test cipher: `simpleEncrypt("HELLO")`, `simpleDecrypt("CIPHER")`
- Validate strips: Each must be exactly 26 unique A-Z characters
- Check state: `console.log(state)`

## Important Implementation Notes

- All strips must contain exactly 26 unique characters (A-Z)
- Frame order uses 0-based indexing into strips array
- Gap offsets wrap around using modulo 26
- UI uses tab-based navigation with `.active` CSS class toggling
- Drag-and-drop reordering in フレーム設定 tab (`setupStripDragAndDrop`, line 815)

## Common Tasks

### Adding New Strip Generation Methods
Add functions near `randPermutationAlphabet()` (line 24) and `keyedAlphabet()` (line 34). Both return 26-character strings.

### Modifying Cipher Algorithm
Core logic in `simpleEncrypt()` (line 292) and `simpleDecrypt()` (line 339).

### Updating UI Components
Tab panels defined in `index.html` with `data-tab` attributes. Event handlers in `init*Tab()` functions (lines 899-1251).

## GitHub Pages Deployment

- `.nojekyll` file bypasses Jekyll processing
- Demo URL: https://ipusiron.github.io/strip-cipherlab/