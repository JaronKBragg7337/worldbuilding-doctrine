# World-Building Engineering Doctrine

One file plus one prompt. Send both to any AI, change only the project line, and
it starts with the systems, checks and detail standards already in hand instead
of learning them over the course of the project.

## Grab and go

| File | What it's for |
|---|---|
| **`WORLDBUILDING_DOCTRINE_v3.docx`** | Attach this to the AI |
| **`SEND_WITH_DOCTRINE.md`** | Paste one of these two prompts alongside it |
| `WORLDBUILDING_DOCTRINE_v3.md` | Same doctrine as Markdown, if pasting is easier |
| `report.portable.ts` | Working reference implementation of the Part 9 checks |
| `WORLDBUILDING_DOCTRINE_v2.docx` | Previous version, kept for history |

The only thing you edit is one line:

```
Project: <<<PASTE REPO URL HERE>>>
```

## What's in it

**Parts 1–8** — conventions, placement contracts, geometry vocabulary, material
cards, engine pipelines, failure laws, control/camera reference values, and the
build protocol.

**Part 2B · Declared intent** — exemption flags so validation stops reporting
deliberate design as error. A checker that cries wolf gets ignored, and then it
misses the real thing.

**Part 3B · The form hierarchy** — primary → secondary → tertiary → micro, with
the working checklist. Assets that look *designed and manufactured*, not
booleaned together.

**Part 6B · Failure laws learned in production** — eleven of them, ordered by
what they cost. Each entry is a mistake someone already paid for.

**Part 9 · Enforcement** — the scene report contract, apertures as first-class
objects, regression diffing, the dev handle, and a headless verification
harness. This is the half that makes the rest actually hold.

## Design principle: superposition

Where two approaches both work, this document keeps **both** and says when each
applies — aperture sizes, camera feel values, mobile presets. A rule that one
project didn't need isn't wrong; it's waiting for the project that does.

Nothing gets deleted for being unused.

## Keeping it current

When a project teaches you something that cost real time, add it to **Part 6B**
in the same voice: what not to do, why, and what it cost. That section is the
most valuable part of the document precisely because every line was paid for.

## Proven on

[RUSTFALL](https://github.com/JaronKBragg7337/rustfall) — a Three.js
post-apocalyptic wasteland. The enforcement layer took that project's validator
from 67 issues (mostly false positives) to 0, and immediately surfaced two real
placement faults that were invisible in screenshots.
