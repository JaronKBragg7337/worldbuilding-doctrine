# Prompt to send — hero asset as a VEHICLE TESTBED

Send with `DOCTRINE-CORE.md`. Change the repo line and the asset line.

> **Why this replaced an earlier "no game, no world" version.** That scope was
> written for a display model — something you orbit and look at. It is wrong for a
> vehicle. You cannot tell whether controls, camera or handling are right by
> looking at a still object, and those are exactly the things that get discovered
> late and force rework. A vehicle needs a **proving ground** from day one.
>
> The distinction that matters is **testbed, not game**: build the instrumented
> course and the telemetry, do not build progression, enemies, menus, scoring or
> content. The course exists to make handling measurable.

---

```
Attached is my world-building doctrine core. Read it before you start — it is
how I want the work done, not background reading.

Project: <<<PASTE REPO URL HERE>>>
Engine: Three.js. Everything built in code, parametrically, from one config file
of constants. No Blender, no imported models. The look comes from a runtime
material system, not from modelling.

--- WHAT THIS IS ---

One spaceship, built to a level of detail that holds up with your face against
it, plus the minimum instrumented rig needed to prove it flies and drives
correctly. This asset is the template every future vehicle in my games is built
from — so the depth of detail here sets the bar for everything after it.

It is NOT a game. No progression, enemies, menus, scoring, missions, or content.
If you think of a feature, put it in TODO.md and do not build it.

--- THE SHIP ---

Silhouette: NOT a pencil. Not a Starship/Falcon cylinder-with-fins. I want
something that reads as genuinely advanced rather than as a tube — a wide,
layered, purposeful hull with real overhangs, recesses, and asymmetry where
function justifies it. Give me 3 silhouette options as flat orthographic
elevations BEFORE any detailing, and let me pick. Silhouette is the primary
form and everything else hangs off it — getting it wrong is the one mistake
that is expensive to undo.

Interior, walkable, in this order:
  1. Cockpit — seats, console, throttle, stick, switch banks, labelled buttons,
     readouts, overhead panel, harnesses, grab handles.
  2. A main corridor connecting fore to aft, with door frames and thresholds.
  3. At least two decks joined by BOTH a ladder and an elevator.
  4. Secondary rooms off the corridor (crew, cargo, engineering).

Exterior: hull plating with real panel seams, rivets, weld beads, access hatches
with hinges and dogs, vents, grilles, landing gear, thrusters with scorch, grab
rails, ladder to the hatch, warning placards.

Real dimensions everywhere, and tell me what they are: hatch 2.0 x 0.9 m,
handrail at 0.9 m, ladder rungs 0.3 m apart, corridor 0.9-1.2 m wide, deck
height 2.4 m, step riser under 0.2 m. A 1.8 m crew figure I can toggle. A ship
reads as huge only when something on it is unmistakably person-sized.

--- THE RIG (build this BEFORE the ship) ---

1. Headless screenshot harness, desktop AND mobile, with a TURNTABLE: the same
   fixed camera angles every run. A hero asset cannot be judged from one render;
   most mistakes only show at one angle. Pin anything that moves.

2. A PROVING GROUND, deliberately minimal:
     - a ground course with turns, for hover-drive mode
     - a set of air gates forming a route, for flight mode
     - both defined as DATA (a list of waypoints), not hand-placed geometry

3. A CONTROL TRACE. This is the most important thing in the rig.
   Every run records, at fixed timestep: input state, ship position, velocity,
   orientation, the intended next waypoint, and the ship's screen-space position.
   Write it out as JSON I can hand to an AI later.
   The point: when I fly and the ship goes the wrong way, I should not have to
   describe it. The trace answers "the player held left, the ship yawed right"
   or "the player was on course but the camera lost the ship" as a NUMBER.
   Guessing at feel from a description is how control bugs survive for months.

--- THE CAMERA. READ THIS TWICE. ---

This is the failure that has bitten me on every game I have made, and a
screenshot will never catch it.

Under sustained acceleration the follow camera lags, the ship drifts toward the
edge of frame, and past a certain speed it leaves the screen entirely. A still
render looks completely fine. The bug only exists while the input is HELD.

Requirements:
  - Framerate-independent damping: x += (target - x) * (1 - exp(-lambda * dt)).
    A fixed lerp factor is framerate-dependent and will behave differently on
    every machine.
  - Velocity feed-forward, so the rig anticipates motion instead of chasing it.
    A follow camera with no feed-forward has a steady-state error proportional
    to speed — that IS this bug.
  - A screen-space clamp as a backstop: project the ship to NDC each frame and
    correct if it exceeds a threshold.

And test it, automatically, without me:
  - Step the simulation at fixed dt (do NOT rely on the render loop; a software
    renderer runs at a few fps and any timing test reads as broken when it is
    fine).
  - Hold full forward for 10 simulated seconds. Each step, project the ship to
    NDC. Assert max |ndc.x| and |ndc.y| stay under 0.35. REPORT the max
    deviation and when it occurred, as numbers.
  - Repeat for: hard turn while accelerating, full stop from top speed, and the
    hover-to-flight transition. Those are the cases that break it.
  - Emit a filmstrip (N frames tiled into one image) for anything involving
    motion. One screenshot cannot show a dynamic fault.

--- CONTROLS ---

Two modes on one vehicle: hover-drive on the ground (should feel like driving)
and free flight. I expect to iterate on feel — that is normal and I am not
asking you to nail it first try. What I am asking is that every control constant
lives in ONE config file with real units and a comment saying what it does, so
tuning is editing numbers rather than hunting through logic.

Player on foot: get out of the seat, walk the interior, exit and enter the ship,
with the door animating. My games have gravity effects, so movement must not
assume a fixed up vector — put the up vector in one place.

--- HOW TO WORK ---

Build in PASSES and keep a MANIFEST.md recording what exists, what is stubbed,
and what is next. This asset is too large for one session; the manifest is how
the next session picks up without re-deriving everything.

Suggested passes: rig → silhouette options → hull exterior → material system →
cockpit → corridor + decks → ladder/elevator → secondary rooms → on-foot
movement → flight model → hover model → camera → polish.

Before any detailing, show me the material card table: every card, its tile size
in metres, and whether that number was MEASURED or ESTIMATED. If you cannot
produce that table, the material system does not exist yet.

Report what you verified and how, what you could not verify, and what you
skipped. If something in the doctrine is wrong for this asset, say so — I would
rather have your judgement than silent compliance.
```

---

## Notes for you (not part of the prompt)

**Ask for the silhouette options early and actually choose.** Primary form is the
one thing that is expensive to change later. Everything else — rivets, panels,
rooms — can be redone cheaply because it is generated from constants.

**The control trace is the highest-value item in the whole brief.** It converts
"the controls feel wrong" from a conversation into a file. Without it you will
keep paying for the same diagnosis.

**Expect the interior to be the bulk of the work.** A hull is one pass; a cockpit
with labelled switch banks and two decks joined by a working elevator is many.
That is where the depth you are after actually lives.
