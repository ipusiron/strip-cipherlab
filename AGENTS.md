# Repository Guidelines

## Project Structure & Module Organization
- `index.html` — Single-page UI and tab layout (meta CSP: `'self'` only).
- `js/strip-core.js` — Pure cipher logic (no DOM): strips, keyword order, encrypt/decrypt, the 26-row window, random and passphrase strips.
- `js/english-data.js` — Generated English letter-pair table (do not edit; run `node tools/build-english.mjs`).
- `js/messages.js` — UI strings used by `script.js`.
- `script.js` — UI wiring (state, rendering, events).
- `style.css` — Styles and the strip window.
- `test/` — `node --test` suites (core, English scoring, README, HTML, messages, contrast, format).
- `tools/` — Development scripts and Project Gutenberg excerpts (`build-english.mjs`, `evaluate.mjs`, `corpus/`). Not loaded by the page.
- `assets/` — Screenshots used by the README.
- `.nojekyll` — Enables GitHub Pages to serve files as-is.

## Build, Test, and Development Commands
- Test: `npm test` (Node.js 22+, no dependencies). GitHub Actions runs it on push and pull_request.
- Run locally (Python): `python -m http.server 8000` → open `http://localhost:8000/`. Opening `index.html` directly also works.
- No build step or bundler; keep it static and dependency-free.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; include semicolons; prefer double quotes in JS.
- JavaScript: camelCase for variables/functions; UPPER_SNAKE_CASE for constants (e.g., `ALPHABET`).
- CSS: kebab-case class names (e.g., `.frame-window`, `.fw-cell`).
- Put logic in `js/strip-core.js` and UI strings in `js/messages.js`; keep `script.js` free of Japanese string literals.
- No inline event handlers or `style` attributes (CSP). Set positions through CSS variables (`style.setProperty`).

## Testing Guidelines
- Add or update tests with every change; do not change expected values to make tests pass.
- README examples are recomputed by `test/readme.test.js`; keep them in sync with the core.
- Manual checks in the browser: generate strips (random / passphrase / manual), set the order (first N / keyword / numbers / drag / ◀ ▶), encrypt with gaps per group or one gap, decrypt by picking candidates or the auto estimate, in both gap modes.

## Commit & Pull Request Guidelines
- Commit messages: concise summary; add short scope if useful (e.g., `enc`, `ui`, `style`).
- PRs should include: purpose, screenshots for UI changes, steps to verify locally, and any trade-offs.

## Security & Configuration Tips
- No secrets or network calls; all logic is client-side. Do not add external scripts.
- Preserve static hosting compatibility (GitHub Pages); do not introduce a mandatory build step.

## Agent-Specific Instructions
- Follow existing patterns and do not add dependencies. Update README (and its tests) if UX or flows change.
