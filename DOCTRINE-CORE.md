# World-Building Doctrine — CORE

**Send this one by default.** It is the ~10% that changes the outcome most.
The full document (`WORLDBUILDING_DOCTRINE_v3.md`) is the reference; pull in a
specific Part when the work actually needs it.

---

## Scope: do not pre-narrow it

Before anything else — **do not talk the work down.** Complete Three.js games
with inventory, settings, multiplayer and full mechanics are routinely produced
in a single pass. That is the normal ceiling, not the exceptional one. If you
catch yourself proposing a reduced version because the full one "won't fit",
you are guessing at your own limits and guessing low.

Build the whole thing. Where a genuinely long build needs continuity across
sessions, that is what `MANIFEST.md` is for — a record of what exists, what is
stubbed, and what is next. **That is a continuity tool, not an admission that
the work is too big.**

Restrictions cost capability. Where this document constrains something it is
because a specific mistake was paid for, and it will say what the mistake was.
Anything not constrained here is open.

---

## 0 · Measure before you conclude

Produce measurements **before** presenting a diagnosis. Investigate however you
like on the way there — but the numbers land first, so a conclusion can be
checked against something.

| Question | The measurement, not the impression |
|---|---|
| Is what I'm reading what's actually live? | Hash the deployed files against the checkout |
| How big is the surface detail? | Pixels per repeat → metres, via the real UV scale |
| How big is anything? | World-space bounding boxes from the asset |
| What does it cost? | Draw calls + triangles at a **fixed wide camera** |
| Is it too dark? | **Linear** albedo. Floor ≈ 0.03, ceiling ≈ 0.85 |
| Does the fix belong where I think? | Confirm which code path builds the thing |

**This is not an instruction to stop thinking.** Independent investigation is
wanted, including investigation this document did not anticipate. If you find a
better route, take it and say why. If something here is wrong for the project,
say so — judgement beats silent compliance.

### Reflexes that have already been tried and did not deliver

Not forbidden. But arriving at one means you are probably re-running a failed
experiment — check before spending on it.

| Symptom | The reflex, and what it missed |
|---|---|
| Looks flat / fake / like a toy | *"Needs shadows and lighting."* Check whether a light rig already exists — it usually does. **Lighting is not wrong, it is LAST.** It is the final 10% and cannot rescue the other 90%. |
| Surfaces look wrong | *"Add a normal map."* Measure texel density first. The detail is more often the wrong **size** than missing. |
| Runs badly | *"Reduce triangles."* Count **draw calls** first. On the web it is nearly always draw calls. |
| Something sits wrong | *"Nudge the offset."* Solve the generating maths. A tuned constant hides the error and it returns. |
| A material reads badly | *"Tint it."* A multiply can only darken. To lift, use **gamma < 1**. |

**Worked example.** A town square read as a toy. It already had ACES tone
mapping, sky-matched fog and soft shadows. What removed the plastic look: the
pavement went from a 96 px hand-drawn grid tiled at repeat 3 to a photographic
granite sett at a **measured** 1.25 × 2.5 m tile; brick courses were measured at
163.7 mm against a real 75 mm. Same geometry, same lights. The surface was the
whole difference.

---

## 1 · Build order — do not reorder

1. **Enforcement layer first.** Headless screenshot harness, scene report, a dev
   handle exposing renderer counters. A rule nobody checks is a rule that will
   be broken. Build this before content, not after.
2. **Material system.** See §2.
3. **Form.** See §3.
4. **Lighting last.**

**Pin everything that moves** — time of day, camera, animation — behind a dev
flag, or two captures are not comparable and you will report a regression that
is not real. Add a legacy flag so before/after come from **one build** differing
only in the thing under test.

---

## 2 · The material system (this is the lever)

- **Photographic sources, not textures drawn in code.** Hand-drawn canvas
  textures *are* the toy look — that is the single most reliable way to make
  something read as plastic. Two routes, both valid; take whichever your
  capabilities allow and **say which one you took**:
    - **A · Generate them.** If you can produce images, generate the texture
      set yourself — seamless, at a stated real-world size, with normal and
      roughness derived from it. Best control, no licensing question.
    - **B · CC0 libraries.** If you cannot produce images, do not fall back to
      drawing them in code — that is the failure mode, not the workaround. Use
      CC0 photographic sets (ambientCG has a JSON API and ships Color +
      NormalGL + Roughness + AO per material).
  Either way, record asset ID, source URL and licence in the repo before
  shipping. **Never silently substitute a procedural texture for a photographic
  one and call it done.**
- **Real-world tile size, MEASURED.** Where the source has a periodic cue,
  autocorrelate the row-mean luminance and derive the pitch. Where it does not,
  label the number an **estimate** — never present an estimate as a measurement.
- **Tile is a vec2, not a scalar.** Photographic sources are often 2:1; a scalar
  stretches them 2×.
- **Project UVs from world position along the dominant normal axis.** Mesh UVs
  make texel density a per-asset chore and bevels make it worse. Projection makes
  density one number, uniform by construction. Use **object space for anything
  that moves** — world projection makes the texture swim across it.
- **The variation layers** — nearly free once projection exists, and most of what
  sells it: anti-tiling (second sample at an incommensurate scale, ×0.173),
  grime accumulating toward the ground, dust on up-facing normals, roughness
  varying with the macro sample.
- **Albedo sanity.** Photographic sets are often far too dark to be plausible
  albedos, and it is invisible until measured. Check linear albedo before tuning
  any light.
- **Never ship vegetation without a cutout map.**

---

## 3 · Form hierarchy

**Primary** silhouette → **Secondary** major components → **Tertiary**
construction detail (seams, rivets, welds, hinges, vents, trim, handles) →
**Micro** material wear (scratches, edge wear, dust, chips).

- **Bevel every exposed edge**, 6–20 mm. A perfectly sharp 90° edge is a
  rendering artifact, not an object. This is most of what makes a form read as
  manufactured.
- **Tertiary detail is INSTANCED.** Rivets number in the hundreds and belong in
  an InstancedMesh, not hundreds of draw calls.
- **Separate trim into independent meshes** — painted-on trim reads flat.
- **Real dimensions are most of legibility.** Human 1.78 m. Stair riser ≤ 0.20 m.
  A thing reads as huge only when something on it is unmistakably person-sized.
- Build a **detailing kit module** (`bevelBox`, `bolts`, `rivets`, `seam`,
  `weld`, `hinge`, `vent`) so everything speaks one vocabulary.

---

## 4 · Addressing — the shared language between human and AI

An AI cannot see the world, and a human cannot read the scene graph. Addressing
is what lets both describe the same thing without either guessing.

**Every position maps to a stable label** — `L{level}-H{col}-R{row}` on the
module grid, zero-padded so it sorts. **Every asset carries a unique ID and its
address**, and nothing repeats. Then "the wall near the fountain" becomes
`AST-WALL-0043 at L0-H12-R08`, which is exact and unambiguous.

This earns its keep the moment there are ten similar objects. "The container is
floating" is useless; `AST-CONTAINER-0043 is floating` is a work order.

**Build the loop in BOTH directions.** Labels alone are only half of it:

| Direction | What it gives you |
|---|---|
| position → address | Reports, issue lists, and the human saying where they are |
| **address → camera pose → screenshot** | **The AI going to a coordinate and seeing what the human sees** |

The second is the one that gets missed, and it is the one that matters. A dev
hook that takes an address, places the camera there, and captures — plus an
inspection layer that draws the grid, cell addresses and asset IDs in-world —
means a human can say "look at L0-H12-R08" and the AI can actually go and look.
No screenshot round-trip, no describing, no guessing.

It is also the foundation for an AI stepping through a world on its own: it may
not be able to *feel* controls, but it can teleport to an address, read what is
there, and report — which converts most "does this look right" questions from
opinion into observation.

---

## 5 · Report honestly, every time

State: **what changed · what was VERIFIED and how · what could NOT be verified ·
what was deliberately skipped.** Include the numbers, and say which camera and
viewport a performance figure came from.

"This should work" and "I verified this" are different sentences. A green light
from a weak test is worse than no test.

---

## 6 · The eight measurement faults

Each produced a confidently wrong number on a live project. Full detail in Part
6B of the reference document.

1. Cost measured under frustum culling — 65 draw calls reported where the real
   whole-view figure was 796.
2. Captures compared across a free-running day/night cycle.
3. A single-column scan of a repeating pattern locking onto every *other* row —
   an exact 2× error, and plausible enough to believe.
4. An envelope guessed when the generator's own maths could be solved for it.
5. A quality tier silently disabling a feature on the majority device.
6. Two darkenings stacked (dark tint *and* raised gamma) crushing a surface.
7. Shared state declared below a function that reads it during init — the
   reported error was not the real one.
8. User-placed content not sharing the code path that was just fixed.
