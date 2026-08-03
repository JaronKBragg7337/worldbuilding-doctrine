# Manifest — current state

**Update this before you finish a session.** It is how the next one picks up
without re-deriving everything. Stale manifest = an hour lost.

Last updated: **2026-08-03**

---

## Repo status

| Thing | State |
|---|---|
| Doctrine (v3.1) | **Done.** Core + full reference + docx, all in sync |
| `lib/v1` shared kit | **Seeded, unproven in this repo.** Ported from a live project (see below) |
| `textures/` | **Done.** 40 files, 2.29 MB, all ambientCG CC0 |
| Test hub `index.html` | **Done.** Lists assets; add a card per new asset |
| `assets/spaceship/` | **Not started.** Brief written, folder empty |
| `assets/_template/` | **Not started** |
| GitHub Pages | Serve from `main` / root |

---

## `lib/v1` — provenance and confidence

Everything here is **ported from Heartbeat Observatory**, where it runs live.
That means the code is proven, but its behaviour *in this repo* has not been
observed yet — nothing has imported it here.

| Module | Proven where | Confidence |
|---|---|---|
| `surface.js` | Live. Took a town from "reads as a toy" to plausible with no geometry change. | **High** — but `TEX_BASE` was changed to a relative default here and that path has not been exercised |
| `foliage.js` | Live. 24 trees, 1 draw call, cut-out shadows | High |
| `openings.js` | Live. 252 windows, 3 draw calls | High — assumes walls with no opening cut in them; see its header |
| `harness/` | Live. Every measurement in this doctrine came out of it | High |
| `detail.js` | **NEW here.** Exercised by `assets/_template/` — bevelBox, seam, weld, vent, hinge, handrail, ladder, bolts, fastenerRun all render | **Verified once.** 24 draw calls, 5,482 tris, zero console errors |
| `address.js` | **NEW here.** Both directions exercised: assets register with IDs + addresses, and `lookAtAddress` places a camera | **Verified once, after a fix** — see below |

**A bug was found by running it, which reading it did not catch.**
`lookAtAddress` placed the camera correctly but yawed it `heading + PI`, facing
it directly *away* from the target. The first capture was an empty plane with the
subject behind the camera. Fixed: yaw is `heading`, because a camera standing at
`(x + sin h·d, z + cos h·d)` needs to look along `(-sin h, -cos h)`, which is what
a yaw of `h` already gives. This is exactly the class of fault the doctrine's
Part 0B exists for — it looked right and was wrong.

`assets/_template/` is the regression test for the kit. If you change `lib/v1`,
run it and look at the picture.

---

## Next

1. **`assets/spaceship/`** — follow `HERO-ASSET-BRIEF.md`. Rig first, then three
   silhouette options as orthographic elevations, and **stop for a choice before
   detailing** — primary form is the one thing expensive to change later.
2. Add a card for each new asset to `index.html`.
3. Not yet exercised anywhere in this repo: `foliage.js` and `openings.js`. They
   run live elsewhere, but nothing here imports them.

---

## Decisions already made — do not relitigate

- **One repo, not one per asset.** The kit is the product; assets are downstream.
  Duplicating the kit per repo makes every asset cost full price and lets the
  engine drift.
- **`lib/v1` is frozen** once an asset ships against it. Improvements go to
  `lib/v2`; assets opt in by import path. This is the same freeze law that keeps
  nine worlds isolated in the owner's `worlds-lab`.
- **No Blender, no imported models.** Everything parametric, in code. Blender was
  tried on a previous project and was a detour — the look comes from the runtime
  material system, not from modelling.
- **CC0 or generated textures only.** The repo is CC0; that promise has to hold
  for every byte.
- **Hero assets are testbeds, not games.** Build the instrumented proving ground
  and the telemetry. No progression, enemies, menus, scoring or content.
