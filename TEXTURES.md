# Textures — provenance and licence

**This repo is CC0-1.0. Everything in `textures/` must be public domain or
generated.** No CC-BY, no "free for personal/non-commercial use", no scraped
images, no asset-store content. If a source requires attribution it does not
belong here — CC0 means someone can take this repo and do anything with it, and
that promise has to hold for every byte in it.

Record every addition in the table below **before** it ships: asset ID, source
URL, licence, and any local modification.

## Two sourcing routes

**A · Generate them.** If you can produce images, generate the set: seamless, at
a stated real-world size, with normal and roughness derived from the base
colour. Best control, no licensing question. Note it as `generated` below.

**B · CC0 libraries.** [ambientCG](https://ambientcg.com) is CC0 1.0, has a JSON
API, and ships Color + NormalGL + Roughness + AO (+ Metalness) per material.

**Neither route available is not permission to draw textures in code.**
Procedurally drawn canvas textures are the toy look — the thing being fixed, not
a fallback. Say you are blocked instead.

## Conversion

```powershell
node tools/convert-tex.js textures/ <srcDir>     # ambientCG map sets -> WebP
node tools/make-canopy.js textures/              # composite a foliage cutout card
```

Colour 1024 px @ q0.82 · normal **512** px @ q0.85 · roughness/AO 512 px @ q0.78.

Normals stay at 512 deliberately: WebP encodes high-frequency normal noise badly
— a 1024 asphalt normal cost 486 KB on its own, a fifth of the whole budget —
and the extra resolution is not resolvable at 1–4 m tiling on a phone.

## Current set — shared environment + spaceship cards

All from **[ambientCG](https://ambientcg.com), CC0 1.0**, converted locally to
WebP. Tile sizes are carried on the material cards in `lib/v1/surface.js`, where
each one records whether it was **measured** or **estimated**.

| Asset | Used for | Tile (m) | How the size was determined |
|---|---|---|---|
| Bricks097 | red brick | 2.400 × 1.200 | **measured** — 32 px course pitch, 16.00 courses/tile @ 75 mm, autocorrelation r = 1.0 |
| Bricks075A | buff / rough stone | 2.00 × 1.00 | published (ambientCG 200 × 100 cm) |
| Travertine009 | limestone trim | 1.20 × 1.20 | published |
| Concrete034 | paths, kerbs | 1.10 × 0.55 | published |
| PavingStones138 | plaza setts | 1.25 × 2.50 | published; pixel aspect 1:2 agrees |
| RoofingTiles013A | slate roof | 2.90 × 2.90 | published |
| Bark014 | tree trunks | 1.20 × 1.20 | published |
| Asphalt033 | roads | 4.00 × 4.00 | **estimate** — no periodic cue to measure |
| Grass005 | lawn | 2.00 × 2.00 | **estimate** — blade length implies ~2 m |
| Planks037A | timber | 2.00 × 2.00 | **estimate** — plank width implies ~2 m |
| canopy_leaf | foliage cutout | n/a | **derived** from LeafSet030 (CC0) by `tools/make-canopy.js` — 260 leaves, seeded LCG, hue-rotated 72°, 36.7 % alpha coverage, 0 pixels at the border |
| Paint004 | coated exterior and interior panels | 1.00 × 1.00 m | **estimate** — non-periodic coating; ambientCG reports no physical dimensions. Linear RGB mean measured locally: 0.705 before tint. |
| Metal046B | blackened service alloy, engines and exposed hardware | 1.50 × 1.50 m | **estimate** — non-periodic metal; ambientCG reports no physical dimensions. Linear RGB mean measured locally: 0.051. |
| DiamondPlate005D | corridor and machinery-deck tread plate | 0.80 × 0.80 m | **estimate with measured image cue** — 51 px tread period in the 1024 px NormalGL map; assumes a 40 mm industrial lug pitch, giving 0.803 m. Linear RGB mean: 0.148. |
| Rubber004 | cockpit and crew-room resilient flooring | 0.75 × 0.75 m | **published** — ambientCG dimension metadata 75 × 75 cm. Linear RGB mean measured locally: 0.027. |

The four spaceship sets above were downloaded as ambientCG 1K-JPG archives,
then converted locally to WebP: colour 1024 px at quality 82; NormalGL 512 px
at quality 85; roughness/AO 512 px at quality 78. Their source pages are
`https://ambientcg.com/view?id=<asset ID>` and every file is CC0 1.0.

Estimates are the ones to re-measure first if a surface reads at the wrong scale.
