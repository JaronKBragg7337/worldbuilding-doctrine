# lib

**FREEZE LAW: once an asset ships against a lib version, that version''s files
never change.** A fix for one asset must never be able to break another.
Improvements go in `lib/v2/` (copy `v1`, bump, change), and assets opt in by
import path. Only exception: a security fix, applied with every dependent asset
re-walked.

This is the same law that keeps nine worlds isolated in `worlds-lab`, and it is
what makes a shared kit safe to depend on.

- `v1/` — seeded 2026-08-03. `surface.js`, `foliage.js`, `openings.js` and
  `harness/` are ported from a live project. `detail.js` and `address.js` are
  new and have never been executed — see MANIFEST.md.