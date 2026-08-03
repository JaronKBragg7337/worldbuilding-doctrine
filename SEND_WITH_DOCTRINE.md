# The prompt to send with the doctrine

Attach `WORLDBUILDING_DOCTRINE_v3` and paste one of the two prompts below.
**The only thing you change is the project line.**

---

## A · Existing project (improve a repo)

```
Attached is my world-building engineering doctrine. Read all of it before you
start — it is how I want the work done, not background reading.

Project: <<<PASTE REPO URL HERE>>>

Clone it if you don't already have it, then get oriented before changing
anything.

Work in this order:

1. Stand up the enforcement layer from Part 9 FIRST — scene report, aperture
   registry, regression diffing, dev handle, headless screenshot harness. Do
   this before content work. If the project already has some of it, fix the
   false-positive rate until the report reads zero, then keep it at zero.
2. Run the Part 2 validation and the Part 6/6B failure laws against what's
   already there. Report what's broken before you fix it.
3. Then improve the world using Part 3B (the form hierarchy) and Part 4
   (materials, albedo sanity, texel density).

Rules I care about:

- Measure before you conclude. Read actual pixel values, bounding boxes,
  uniforms and timings. Don't theorise from a screenshot.
- Verify with the harness, not by asserting. Show me the numbers.
- Tell me plainly what you verified, what you couldn't, and what you skipped.
- If you find a bug I didn't report, say so.
- If something in the doctrine is wrong for this project, say that too and
  explain why — don't silently ignore it.

Ask me anything that would change what you build. Otherwise start.
```

---

## B · New project (build from scratch)

```
Attached is my world-building engineering doctrine. Read all of it before you
start — it is how I want the work done, not background reading.

Project: <<<NAME + ONE-LINE PITCH>>>
Engine: <<<Three.js / Unity / Unreal / Blender>>>

Here's the idea:

<<<DESCRIBE THE GAME OR SCENE>>>

Follow the Part 8 build protocol. Specifically:

1. Ask me what matters before designing — scale, mood, gameplay vs cinematic.
2. Stand up the Part 9 enforcement layer before building content.
3. Design the vocabulary this idea needs; don't reuse someone else's kit.
4. Build to Part 3B — primary, secondary, tertiary, micro. Assembled, not
   booleaned. Real dimensions.
5. Self-validate and report honestly.

Measure before you conclude, and show me the numbers when you verify something.
```

---

## C · Single hero asset (one object, no world)

Use this when the deliverable is **one thing** — a ship, a vehicle, a landmark, a
creature — rather than a place. The budget maths inverts: a world spreads its
triangles over 200 m, a hero asset spends all of them on one hull, so most of
what the doctrine says to economise on you should *not* economise on here.

```
Attached is my world-building engineering doctrine. Read all of it before you
start — it is how I want the work done, not background reading.

Project: <<<PASTE REPO URL HERE>>>
Engine: <<<Three.js / Unity / Unreal>>>
The asset: <<<ONE OBJECT + ONE LINE ON WHAT IT IS>>>

SCOPE. This repo contains that one asset and a viewer to orbit it. No game, no
world, no terrain, no UI, no gameplay. Nothing else gets added until the asset
is finished. If you think of a feature, put it in TODO.md and do not build it.

Work in this order:

1. Harness first (Part 9), including a TURNTABLE — the same fixed camera angles
   every run. A hero asset cannot be judged from one render; most mistakes only
   show at one angle. Pin anything that moves (time of day, camera, animation)
   or two captures are not comparable.
2. Material system before lighting (Part 4, 4B, 4C). Photographic CC0 PBR
   sources, not textures drawn in code. Real-world tile size MEASURED from the
   source, carried as a vec2 — photographic sources are often 2:1 and a scalar
   stretches them. Project UVs from position; use OBJECT space, because the
   asset moves.
3. Form hierarchy (Part 3B) as the spine: primary silhouette, then secondary
   components, then tertiary construction detail (seams, rivets, welds, hinges,
   vents, grab rails), then micro wear. Tertiary detail is INSTANCED. Bevel
   every exposed edge.
4. Human scale is what sells size. Put in real dimensions and tell me what they
   are — hatch 2.0 x 0.9 m, handrail at 0.9 m, rungs 0.3 m apart — and give me
   a 1.8 m reference figure I can toggle.
5. Lighting last.

Before content, show me the material card table: every card, its tile size in
metres, and whether that number was MEASURED or ESTIMATED. If you cannot
produce that table, the material system does not exist yet.

Measure before you conclude (Part 0B). Report what you verified and how, what
you could not verify, and what you skipped. If something in the doctrine is
wrong for this asset, say so and explain — I would rather have your judgement
than silent compliance.
```

---

## What to expect from a good response

A capable AI given this should, unprompted:

- build the scene report before the content, and keep it at zero issues
- catch placement faults you cannot see in a screenshot
- use real dimensions and a shared detailing kit rather than ad-hoc boxes
- tell you when it deviated from the doctrine and why
- distinguish "I verified this" from "this should work"

If it does none of that, it did not read the document — say so and point it at Part 0.

---

## Keeping this current

The doctrine is versioned. When a project teaches you something that cost real
time, add it to **Part 6B** as a failure law in the same voice: what not to do,
then why, then what it cost. That section is the highest-value part of the
document precisely because every entry was paid for.

Do not delete rules that a given project didn't need. Different worlds need
different parts, and a rule that sat unused in one project is not wrong — keep
both options and note when each applies.
