# Prompt to send with the doctrine — single hero asset (spaceship)

Send this **plus** `WORLDBUILDING_DOCTRINE_v3`. Change only the repo line.

> Why this is different from the doctrine's prompts A and B: those build a world.
> This builds **one object**, which changes the budget completely. A world spends
> its triangles across 200 m; a hero asset spends all of them on one hull. Almost
> everything the doctrine says to economise on, you should not economise on here.

---

```
Attached is my world-building engineering doctrine. Read all of it before you
start — it is how I want the work done, not background reading.

Project: <<<PASTE NEW REPO URL HERE>>>
Engine: Three.js. No Blender, no GLB, no imported models — see "Why no Blender".

SCOPE — read this twice.

This repo contains ONE spaceship and nothing else. No game, no world, no
terrain, no UI, no menus, no gameplay, no multiplayer. A viewer that shows the
ship and lets me orbit it, and the ship itself. Nothing may be added to this
repo until the ship is finished. If you think of a feature, write it in TODO.md
and do not build it.

The ship must look beyond amazing at close range. That is the entire job.

--- WHY NO BLENDER ---

I have already been through this on another project. Blender was a detour that
did not deliver the look. The realism I am after comes from a RUNTIME MATERIAL
SYSTEM, not from modelling. A proven reference: a post-apocalyptic Three.js
world whose shipping containers read as real corrugated steel — those are plain
boxes wearing a projected photographic material. The ridges are a texture and a
shader, not geometry.

So: build everything in code, parametrically, from one config file of constants.
That also means the whole ship re-rolls at new proportions with one command.

--- WHAT ACTUALLY MAKES IT LOOK REAL (in priority order) ---

1. MATERIAL SYSTEM FIRST, LIGHTING LAST.
   Lighting a toy gives you a well-lit toy. Do not open with shadows, tone
   mapping or exposure. If your first instinct is "it needs better lighting",
   you are about to waste my time — I have had that answer before and it was
   wrong every time.

2. PHOTOGRAPHIC PBR SOURCE, NOT TEXTURES DRAWN IN CODE.
   Hand-drawn canvas textures are exactly what makes something read as a toy.
   Use CC0 photographic sets — ambientCG has a JSON API and ships Color +
   NormalGL + Roughness + AO + Metalness per material. Download the sets you
   need for metal, painted metal, worn panel, diamond plate, rubber, glass.
   Convert to WebP for delivery. Record every asset ID, its source URL and its
   licence in the repo before it ships.

3. REAL-WORLD TILE SIZE, MEASURED — NOT GUESSED.
   Every material is a data card carrying the metres one tile covers. Where the
   source has a periodic cue (plate seams, tread, rivet rows), MEASURE it:
   autocorrelate the row-mean luminance and derive the pitch. Where it has no
   periodic cue, say so and label the number an ESTIMATE. Never present an
   estimate as a measurement.
   The tile must be a vec2, not a scalar — photographic sources are often 2:1,
   and a scalar stretches them by 2x.

4. PROJECT UVs FROM POSITION, ALONG THE DOMINANT NORMAL AXIS.
   Mesh UVs make texel density a per-part chore and bevels make it worse.
   Projection makes density one number and uniform by construction.
   IMPORTANT: use OBJECT SPACE, not world space. The ship moves; world-space
   projection makes the texture swim across it.
   If you add normal maps under projection, rebuild the tangent frame
   analytically from the projection axis and rotate it into view space. Three's
   derivative-based tangents describe the mesh UVs you are no longer sampling.

5. THE VARIATION LAYERS. These are most of what sells it, and they are free
   once the projection exists:
     - anti-tiling: a second sample at an incommensurate scale (x0.173)
     - grime accumulating toward the ship's underside and into recesses
     - dust settling on up-facing normals
     - roughness varying with the macro sample, so wear is not uniform
     - albedo gamma lift: photographic sets are often far too dark to be
       plausible albedos. Check the LINEAR albedo of every base colour before
       tuning any light. Floor about 0.03, ceiling about 0.85. Correct with
       gamma below 1 — a colour tint can only ever darken.

6. THE FORM HIERARCHY (doctrine Part 3B) IS THE SPINE OF THE MODEL.
   Primary: hull, engines, wings.
   Secondary: cockpit, intakes, cargo bay, landing gear, thrusters, airlock.
   Tertiary: panel seams, rivets, weld beads, hinges, vents, conduit, grab
   rails, hatch dogs, antenna, warning placards.
   Micro: scratches, edge wear, scorch around thrusters, dust, paint chips.
   Tertiary detail is INSTANCED — rivets number in the hundreds and belong in
   an InstancedMesh, not hundreds of draw calls.
   Build a detailing kit module (bevelBox, bolts, rivets, seam, weld, hinge,
   vent, grille, ladder, handrail) so the whole ship speaks one vocabulary.

7. BEVEL EVERY EXPOSED EDGE. 6-20 mm. A perfectly sharp 90 degree edge is a
   rendering artifact, not an object. This is most of what makes a form read as
   manufactured.

8. HUMAN SCALE IS WHAT SELLS SIZE.
   A ship reads as huge only when something on it is unmistakably person-sized.
   Put in real dimensions and say what they are: hatch 2.0 x 0.9 m, handrail at
   0.9 m, ladder rungs 0.3 m apart, step riser under 0.2 m, walkway 0.8 m wide,
   a 1.8 m crew figure for reference. Give me a toggle to show or hide the
   figure.

--- HOW I WANT YOU TO WORK ---

BUILD THE HARNESS BEFORE THE SHIP. Non-negotiable. Doctrine Part 9.
  - headless screenshot harness (Playwright or equivalent), desktop AND mobile
  - a TURNTABLE: the same N camera angles every run, pinned. A hero asset
    cannot be judged from one render; most mistakes only show at one angle.
  - PIN EVERYTHING that moves: time of day, camera, animation. If any of those
    are free-running, two screenshots are not comparable and you will report a
    regression that is not real.
  - a legacy/A-B flag so before and after come from ONE build differing only in
    the thing under test
  - a dev handle exposing renderer.info, the material registry and each card's
    tile size and whether that size was measured or estimated

MEASURE BEFORE YOU CONCLUDE. Read pixel values, bounding boxes, uniforms,
draw calls. Do not theorise from a screenshot. When a number surprises you,
re-measure before believing it.

REPORT HONESTLY, EVERY TIME: what you changed, what you VERIFIED and how, what
you could NOT verify, and what you deliberately skipped. Include the numbers. If
you quote a performance figure, say what camera and what viewport it came from.

If something in the doctrine is wrong for this project, say so and explain.
Don't silently ignore it.

--- SPECIFIC TRAPS, EACH OF WHICH HAS ALREADY COST ME TIME ---

- Measuring draw calls with the camera pointed at one part of the scene.
  Frustum culling hides most of it and the number is meaningless. Measure from a
  fixed wide view that contains the whole subject.
- Comparing two screenshots taken at different points in an animation or
  day/night cycle. Pin it.
- A single-column pixel scan on a repeating pattern locking onto every other
  row and reporting a 2x error. Scan the full row, or autocorrelate.
- Guessing an envelope instead of solving the generator's own maths for it.
- Quality tiers silently disabling a feature on the device class most users
  actually have. Check what your tier logic does on a real phone.
- Stacking two darkenings (a dark tint AND a raised gamma) and crushing a
  surface to black.
- Building objects before textures finish loading. A texture built from
  undefined is black, not an error — throw instead.

--- WHAT DONE LOOKS LIKE ---

I should be able to orbit the ship at walking distance and find something worth
looking at at every angle: seams that line up, rivets that follow structure,
wear concentrated where a crew would actually touch it, grime where water would
run, scorch where thrust exits. Nothing should read as a box with a picture on
it.

Ask me anything that would change what you build. Otherwise start with the
harness.
```

---

## Two things to add yourself

**Say the scope sentence out loud, twice.** "Spaceship only, nothing else, until
it's right" is the instruction most likely to be quietly ignored. Every AI will
want to give you a flying demo. The `TODO.md` clause above is there to give it
somewhere to put that urge.

**Ask for the tile-size table early.** Before any content work, ask it to print
every material card with its tile size in metres and whether that number was
measured or estimated. If it cannot produce that table, it has not built the
material system — it has hard-coded some numbers, and the look will not hold.
