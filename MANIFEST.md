# Manifest — current state

**Update this before you finish a session.** It is how the next one picks up
without re-deriving everything. Stale manifest = an hour lost.

Last updated: **2026-08-03**

---

## Repo status

| Thing | State |
|---|---|
| Doctrine (v3.1) | **Done.** Core + full reference + docx, all in sync |
| `lib/v1` shared kit | **Frozen and exercised here.** Surface, addressing, detail and harness paths have rendered in-repo; foliage/openings remain unexercised here |
| `textures/` | **Done.** 54 files, 3,067,966 bytes, all CC0; four spaceship sets are ambientCG sources converted locally to WebP |
| Test hub `index.html` | **Done.** Lists assets; add a card per new asset |
| `assets/spaceship/` | **B2 hero build verified.** Selected hull, material system, exterior, two-deck interior, crew stations, movement and harness are live |
| `assets/_template/` | **Done.** Regression fixture for detail/address modules |
| GitHub Pages | Serve from `main` / root |

---

## `lib/v1` — provenance and confidence

The original kit was **ported from Heartbeat Observatory**, where it runs live.
`surface.js`, `detail.js`, `address.js`, and `harness/` have now also been
observed in this repo. `foliage.js` and `openings.js` are the remaining modules
with only their live-project provenance.

| Module | Proven where | Confidence |
|---|---|---|
| `surface.js` | Live. Took a town from "reads as a toy" to plausible with no geometry change. | **High.** Relative `TEX_BASE` exercised by spaceship rig: 38 maps loaded, asphalt + concrete materials built |
| `foliage.js` | Live. 24 trees, 1 draw call, cut-out shadows | High |
| `openings.js` | Live. 252 windows, 3 draw calls | High — assumes walls with no opening cut in them; see its header |
| `harness/` | Live. Every measurement in this doctrine came out of it | **High, now exercised here.** Desktop/mobile capture, fixed-step traces and filmstrips passed; it caught a DPR-2 viewport fault and rejected one incomplete mobile load |
| `detail.js` | **NEW here.** Exercised by `assets/_template/` — bevelBox, seam, weld, vent, hinge, handrail, ladder, bolts, fastenerRun all render | **Verified once.** 24 draw calls, 5,482 tris, zero console errors |
| `address.js` | **NEW here.** Both directions exercised: assets register with IDs + addresses, and `lookAtAddress` places a camera | **Verified by template and spaceship.** Spaceship report currently registers 10 rig/review assets |

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

## Spaceship — selected B2 hero build

The owner selected **B · Split-keel Courier**. The undetailed A/B/C elevations
remain available under `B orthographic` as a decision archive; only B geometry
was carried into the detailed ship. `lib/v1` is unchanged.

### Built

- Parametric exterior with split booms, three-axis drive cluster, service
  channels, landing gear, thrusters, panel seams, rivets, welds, access hatches,
  hinges/dogs, vents, grab rails and a boarding ladder.
- Four projected PBR cards installed through the frozen surface path before
  lighting: Paint004, Metal046B, DiamondPlate005D and Rubber004. Provenance and
  scale evidence are in `TEXTURES.md` and `assets/spaceship/MATERIAL-CARDS.md`.
  No texture is drawn in code.
- Two walkable decks, nine named rooms, a 1.15 m corridor, 0.90 × 2.00 m hatches,
  0.30 m ladder rung spacing, 0.90 m handrail height and both a ladder and an
  animated elevator. Clear deck heights measure 2.20 m and 2.22 m.
- Furnished cockpit, crew/galley, cargo, engineering, airlock and two dedicated
  gunnery rooms. The pilot chair controls the assisted chin repeater. Dorsal and
  ventral guns remain unavailable until their physical chairs are occupied.
- WASD/arrow walking, drag look, sprint, E interact/sit/use and Q leave seat.
  World up is configured once in `config.js`; the implementation does not embed
  a separate controller up vector.
- Harness-first data remains live: 8-point ground course, 5-gate air route,
  fixed-step traces, four sustained-input scenarios, fixed views, desktop/mobile
  captures and six-frame motion filmstrips.

### Measured final state

The authoritative report is
`assets/spaceship/harness/out/verification-report.json` (ignored locally; copied
to `outputs/worldbuilding-lab/spaceship/b2-verified-2026-08-03/`). Final
automated run: **PASS**, zero browser or console errors at 1440 × 900 desktop
and 390 × 844 mobile.

| Measurement | Result |
|---|---:|
| Declared pressure hull | 22.40 × 7.60 × 31.00 m |
| Measured pressure geometry | 21.60 × 7.258 × 31.00 m |
| Measured operational envelope | 21.60 × 8.81 × 33.19 m |
| Whole authored asset | 172 meshes · 129,624 triangles · 426 instances |
| Airlock → pilot route | 26.60 m · 275 samples at 0.10 m · PASS |
| Pilot → dorsal gun route | 15.05 m · 153 samples at 0.10 m · PASS |
| Pilot → ventral gun route | 20.25 m · 209 samples at 0.10 m · PASS |
| Door mechanism | 0.468 m leaf travel · 0.717 s measured · PASS |
| Elevator mechanism | y 1.05 → 3.60 → 1.05 m · 2.417 s each way · PASS |

Crew assertions passed: seated pilot has the assisted gun; an uncrewed dorsal
station is unavailable; a teammate enables it; leaving the pilot seat disables
the chin gun; walking to and occupying the ventral chair enables the ventral
gun. The teammate buttons are a deterministic occupancy test hook, not network
multiplayer.

All four 600-step camera scenarios stayed below `|NDC| < 0.35` without any
screen-clamp correction. Worst desktop result was hover-to-flight at
`x = 0.04893`, `y = 0.25421`; worst mobile result was the same scenario at
`x = 0.16944`, `y = 0.25421`.

Static material/visibility batching reduced the desktop exterior fixed view to
84 calls / 77,992 visible triangles. Desktop cutaway is 126 calls; mobile
exterior is 76 calls. These are view-dependent renderer counts, not whole-asset
triangle totals.

Seven local utility lights were added after material/form/detail. Shadows remain
disabled. Local verification used port 8101 because another process owned 8099.

### Explicit limits / assumptions

- Paint004 and Metal046B physical tile sizes are estimates. DiamondPlate005D has
  a measured 51 px image period but its 0.80 m tile assumes a 40 mm lug pitch.
  Rubber004 uses published 0.75 × 0.75 m metadata and was not independently
  measured.
- Camera containment is verified numerically; handling *feel* still needs the
  owner's hands-on pass. Non-default gravity orientation is configurable but was
  not exercised in this run.
- The outer airlock door and boarding ladder are modelled and animated. The
  automated on-foot gate currently proves interior room-to-room circulation,
  not continuous exterior boarding traversal.
- Weapon availability and physical station ownership are implemented. Weapon
  firing, damage and networked teammate synchronization are intentionally outside
  this hero-asset testbed.

Known documentation mismatch remains: `AGENTS.md` points to
`lib/v1/harness/README.md`, but that file is absent. The harness source and
Doctrine Part 9 were used; `lib/v1` was not edited to repair documentation.

## Next

1. Owner hands-on pass for walking/seat placement and hover/flight feel; tune
   constants only in `assets/spaceship/config.js`.
2. If the testbed expands, add a measured exterior boarding route and closed-door
   collision gate before calling enter/exit fully proven.
3. Multiplayer synchronization and weapon behaviour belong in the consuming
   game, not this asset repo.
4. Still unexercised in this repo: `foliage.js` and `openings.js`; they run live
   elsewhere, but nothing here imports them.

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
