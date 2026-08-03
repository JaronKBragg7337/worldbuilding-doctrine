# World-Building Engineering Doctrine

One file plus one prompt. Send both to any AI, change only the project line, and
it starts with the systems, checks and detail standards already in hand instead
of learning them over the course of the project.

## Grab and go

| File | What it's for |
|---|---|
| **`DOCTRINE-CORE.md`** | **Send this by default.** ~1 page: the 10% that changes the outcome most |
| **`SEND_WITH_DOCTRINE.md`** | Paste one of these prompts alongside it |
| `HERO-ASSET-BRIEF.md` | Long-form prompt for one vehicle / hero asset with a testbed |
| `WORLDBUILDING_DOCTRINE_v3.docx` | The full reference. Attach when the work needs a specific Part |
| `WORLDBUILDING_DOCTRINE_v3.md` | Same full reference as Markdown |
| `report.portable.ts` | Working reference implementation of the Part 9 checks |
| `WORLDBUILDING_DOCTRINE_v2.docx` | Previous version, kept for history |

**Which to send.** The full doctrine is ~38 KB — roughly 10k tokens on *every*
message of a conversation, which works against the point of having a system.
Default to `DOCTRINE-CORE.md` and pull in a specific Part when the work actually
needs it. Send the full document when starting a whole world from scratch.

The only thing you edit is one line:

```
Project: <<<PASTE REPO URL HERE>>>
```

## What's in it

**Part 0B · The diagnosis gate** — measure before you conclude, and a list of the
reflexes that have already been tried and failed. This is the part that stops a
symptom being matched to the wrong cause before any work starts. It constrains
when something may be called a diagnosis; it does not ask the AI to stop
thinking, and it explicitly invites disagreement with the rest of the document.

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

[Heartbeat Observatory](https://github.com/JaronKBragg7337/heartbeat-observatory) —
a live multiplayer town square that read as a toy despite already having ACES
tone mapping, sky-matched fog and soft shadows in place. Measurement first: brick
courses were **163.7 mm against a real 75 mm**, so a 3 m wall showed 18 courses
where it should show 40. Rebuilding surfaces as a projected material system on
photographic CC0 sources — same geometry, same lights — is what removed the
plastic look. Windows became real assemblies at 3 draw calls for 252 of them;
foliage got alpha cutouts at 1 draw call for 24 trees.

Parts 0B and 6B #12–19 all come from that job. Every one of those entries is a
number that was reported confidently and was wrong.
