# Spaceship material gate

Status after the silhouette decision: **B · Split-keel Courier is locked** and
the ship-specific cards below extend the frozen projected PBR system at runtime.
`lib/v1` is unchanged. All image maps are ambientCG CC0 and are recorded in
[`../../TEXTURES.md`](../../TEXTURES.md); no texture is drawn in code.

| Card | Tile size (m) | Size evidence | Used at this gate |
|---|---:|---|---|
| Red brick | 2.40 × 1.20 | **MEASURED** — 32 px course pitch; 16 courses at 75 mm | No |
| Rough coursed stone | 2.00 × 1.00 | **PUBLISHED** — ambientCG 200 × 100 cm; not independently measured | No |
| Travertine / limestone | 1.20 × 1.20 | **PUBLISHED** — ambientCG 120 × 120 cm; not independently measured | No |
| Fine broomed concrete | 1.10 × 0.55 | **PUBLISHED** — ambientCG 110 × 55 cm; not independently measured | **Rig course** |
| Granite setts | 1.25 × 2.50 | **PUBLISHED** — ambientCG 125 × 250 cm; pixel aspect agrees | No |
| Weathered asphalt | 4.00 × 4.00 | **ESTIMATED** — no periodic cue | **Rig ground** |
| Mown lawn | 2.00 × 2.00 | **ESTIMATED** — blade length implies scale | No |
| Tree bark | 1.20 × 1.20 | **PUBLISHED** — ambientCG 120 × 120 cm; not independently measured | No |
| Stained planks | 2.00 × 2.00 | **ESTIMATED** — plank width implies scale | No |
| Dark slate roof | 2.90 × 2.90 | **PUBLISHED** — ambientCG 290 × 290 cm; not independently measured | No |

## Selected ship cards

| Card | Base | Tile size (m) | Size evidence | Measured linear RGB mean | Job |
|---|---|---:|---|---:|---|
| Coated panel | Paint004 | 1.00 × 1.00 | **ESTIMATED** — non-periodic; ambientCG reports 0 × 0 | 0.705 | Exterior ceramic-grey shell and warm interior wall panels; colour comes from material tint, not a generated texture |
| Blackened service alloy | Metal046B | 1.50 × 1.50 | **ESTIMATED** — non-periodic; ambientCG reports 0 × 0 | 0.051 | Engine housings, exposed frames, rails and hatch hardware |
| Industrial tread plate | DiamondPlate005D | 0.80 × 0.80 | **ESTIMATED with measured cue** — 51 px period measured in a 1024 px NormalGL map; 40 mm lug-pitch assumption | 0.148 | Main corridor and engineering deck |
| Resilient black floor | Rubber004 | 0.75 × 0.75 | **PUBLISHED** — ambientCG 75 × 75 cm | 0.027 | Cockpit, crew room and gun-station floor |

Paint004 is intentionally a coating card with `metalness = 0`; paint remains a
dielectric even when the substrate is metal. Metal046B and DiamondPlate005D are
metal cards. Rubber004's source albedo is already at the doctrine's approximate
linear floor target of 0.03, so it is lifted with gamma rather than light power.

## Lighting status

The rig's fixed hemisphere and directional lights remain diagnostic. Seven
fixture-linked interior utility lights were added only after the cards, primary
form, secondary form and detail existed. Every light has shadows disabled; none
was used to establish the silhouette or to conceal an unresolved material-scale
problem.

## Material gate result

**PASS.** The final automated report found four installed ship cards and
`textureDrawingInCode: false` at both desktop and mobile viewports. Any later
card must still be added here and in `TEXTURES.md` before geometry uses it.
