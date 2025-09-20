# Repository Guidelines

## Project Structure & Module Organization
- `index.html` — Single-page UI and tab layout.
- `script.js` — Core logic (strip generation, frame order, encrypt/decrypt, UI wiring).
- `style.css` — Styles and visualization of strips/lines.
- `assets/` — Images and static assets (e.g., `assets/screenshot.png`).
- `.nojekyll` — Enables GitHub Pages to serve files as-is.

## Build, Test, and Development Commands
- Run locally (Python): `python -m http.server 8000` → open `http://localhost:8000/`.
- Run locally (Node): `npx serve .` or `npx http-server . -p 8000`.
- No build step or bundler; keep it static and dependency-free.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; include semicolons; prefer double quotes in JS.
- JavaScript: camelCase for variables/functions; UPPER_SNAKE_CASE for constants (e.g., `ALPHABET`).
- CSS: kebab-case class names (e.g., `.enc-strips-container`, `.actual-strip-char`).
- Files: lowercase with hyphens or simple names (e.g., `index.html`, `script.js`).
- Keep functions small and UI updates isolated (e.g., `refresh*`, `init*` patterns).

## Testing Guidelines
- No formal test suite. Perform manual checks in the browser:
  - Build tab: generate random/keyed strips; validate and apply.
  - Frame tab: reorder by drag-and-drop; verify `frameOrder` view.
  - Encrypt/Decrypt tabs: type plaintext, adjust gap, copy outputs; confirm console logs.
- Avoid regressions to default boot path (`DOMContentLoaded → boot()`), which seeds sample strips.

## Commit & Pull Request Guidelines
- Commit messages: imperative, concise summary; add short scope if useful (e.g., `enc`, `ui`, `style`).
  - Example: `enc: fix cipher line positioning at gap edges`.
- PRs should include: purpose, screenshots for UI changes, steps to verify locally, and any trade-offs.
- Link related issues; keep diffs minimal and focused.

## Security & Configuration Tips
- No secrets or network calls; all logic is client-side. Avoid adding external scripts without review.
- Preserve static hosting compatibility (GitHub Pages); do not introduce a mandatory build step.

## Agent-Specific Instructions
- Follow existing patterns and do not add dependencies. Update README if UX or flows change.
