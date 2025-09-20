# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Strip CipherLab is an educational web tool for learning about strip cipher cryptography through interactive visualization. It's a static HTML/CSS/JavaScript application that runs entirely in the browser.

## Architecture

### Files Structure
- `index.html` - Single-page application with tabbed interface (ストリップ作成, フレーム設定, 暗号化, 復号, 可視化プレイヤー, 座学, インポート/エクスポート)
- `script.js` - Core cipher logic and UI management, organized by sections:
  - State management (lines 12-31)
  - Utility functions (lines 33-86)
  - Strip cipher algorithm implementation
  - Tab navigation and UI event handlers
  - Import/export JSON functionality
- `style.css` - Styling with CSS Grid layout for responsive panels
- `data/` - Sample JSON files for stripsets, frames, and sessions

### Key Data Structures

**State Object (global):**
```javascript
{
  strips: [],           // Array of 26-character alphabets
  frameOrder: [],       // Order indices for strips
  baseRowIndex: 0,      // Reference row index
  offsets: {},          // Row offsets (0-25)
  ijMerge: false,       // I/J merge flag
  grouping: 5,          // Output grouping size
  nonalpha: "drop"      // Non-alpha handling
}
```

### Cipher Algorithm

The implementation follows this flow:
1. **Encryption**: Plain text → Find column in base row → Apply row key → Apply shift key → Get cipher character
2. **Decryption**: Cipher text → Reverse shift → Find in target row → Map to base row → Get plain character

Key functions use modular arithmetic with 26-letter alphabet. Row keys and shift keys cycle through their patterns.

## Development Commands

This is a static site with no build process:

```bash
# Run local development server (if Python installed)
python -m http.server 8000

# Or with Node.js http-server (if installed globally)
http-server

# Open directly in browser
start index.html  # Windows
open index.html   # macOS
```

## Testing Approach

No automated tests exist. Manual testing via browser console:
- Test cipher functions: `encryptWithKeys()`, `decryptWithKeys()`
- Validate strips: Check for 26 unique characters
- Test import/export with sample JSON files in `data/`

## Important Implementation Notes

- All strips must contain exactly 26 unique characters (A-Z)
- Frame order uses 0-based indexing into strips array
- Offsets wrap around using modulo 26
- Row keys and shift keys are converted from letters to numbers (A=0, Z=25)
- UI uses tab-based navigation with show/hide CSS classes
- Drag-and-drop functionality for frame ordering visualization

## Common Tasks

### Adding New Strip Generation Methods
Modify the strip generation section in `script.js` around lines 200-250. Follow the pattern of existing `randPermutationAlphabet()` and `keyedAlphabet()` functions.

### Modifying Cipher Algorithm
Core cipher logic is in `encryptWithKeys()` and `decryptWithKeys()` functions. These handle the mathematical transformations using row/shift keys.

### Updating UI Components
Tab panels are defined in `index.html` with corresponding event handlers in `script.js`. Each tab has an id matching its data-tab attribute.

## GitHub Pages Deployment

The site is configured for GitHub Pages with:
- `.nojekyll` file to bypass Jekyll processing
- Direct serving of static files from repository root
- Demo URL: https://ipusiron.github.io/strip-cipherlab/