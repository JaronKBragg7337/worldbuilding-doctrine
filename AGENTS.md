# Start here

You are working in **worldbuilding-lab**: a doctrine, a shared kit, and a test
hub for hero assets. Everything you need is in this repo — nothing else has to
be sent to you.

## Read in this order

1. **`DOCTRINE-CORE.md`** — how the work is done. ~10 KB. Read all of it.
2. **`MANIFEST.md`** — what exists right now, what is stubbed, what is next.
3. The brief for whatever you are building — e.g. `HERO-ASSET-BRIEF.md`.

`WORLDBUILDING_DOCTRINE_v3.md` is the full reference. Do not read it end to end
by default; pull the Part you need. `DOCTRINE-CORE.md` names which Part covers
what.

## The three rules that matter most

**Measure before you conclude.** Numbers land before a diagnosis, in a message
that proposes nothing. If it looks flat or fake, the reflex answer is "add
lighting" and it is almost always wrong — check whether a light rig already
exists. Lighting is not wrong, it is *last*.

**Do not pre-narrow the scope.** Complete games get built in a single pass. If
you find yourself proposing a reduced version because the full one "won't fit",
you are guessing at your own limits and guessing low. Build the whole thing.

**Report honestly.** What changed · what you VERIFIED and how · what you could
NOT verify · what you deliberately skipped. Say which camera and viewport a
performance number came from.

You are expected to disagree. If something here is wrong for the asset in front
of you, say so and explain — judgement beats silent compliance.

## Layout

```
DOCTRINE-CORE.md          read first
MANIFEST.md               current state — UPDATE THIS as you work
index.html                the test hub (GitHub Pages)
lib/v1/                   shared kit. FROZEN — see lib/README.md
  surface.js                projected PBR material system
  detail.js                 bevelBox, bolts, rivets, seam, weld, hinge, vent, ladder
  address.js                grid addressing + inspection layer + lookAtAddress
  foliage.js                alpha-cutout canopy cards
  openings.js               window/door assemblies
  harness/                  headless capture, perf, texture measurement
textures/                 shared CC0 sets — see TEXTURES.md
assets/<name>/            one hero asset per folder
assets/_template/         copy this to start a new one
tools/                    texture conversion, page generation
```

## Non-negotiables

**`lib/v1` is frozen.** Once an asset ships against a lib version, that
version's files never change — a fix for one asset must never break another.
Improvements go in `lib/v2/` (copy, bump, change) and assets opt in by import
path. Only exception: a security fix, with every dependent asset re-walked.

**Textures must be CC0 or generated.** This repo is CC0-1.0. Anything you add
must be public domain or something you generated. No CC-BY, no "free for
personal use", no scraped images. Record every asset in `TEXTURES.md` with its
source URL and licence *before* it ships. If you cannot source CC0 and cannot
generate, say so — do not fall back to drawing textures in code and calling the
material system done. That is the toy look, and it is the thing being fixed.

**Update `MANIFEST.md` before you finish.** It is how the next session picks up
without re-deriving everything. A session that leaves it stale has cost the next
one an hour.

## Getting eyes

You cannot judge this work from source. Stand up the harness first:

```bash
node lib/v1/harness/serve.js 8099
node lib/v1/harness/shoot.js --tag=before --views=desktop,mobile \
  --url="http://localhost:8099/assets/<name>/index.html?dev=1"
```

Pin anything that moves — time of day, camera, animation — or two captures are
not comparable and you will report a regression that is not real.
`lib/v1/harness/README.md` documents the traps already hit.
