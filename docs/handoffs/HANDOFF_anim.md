# HANDOFF: attack, hurt and death frames for every creature (V58)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-19 · **Feature:** combat and death animations for every creature (VISION V58; engine `game/js/plugins/UF_Anim.js`, system doc `docs/systems/UF_Anim.md`; requests AR-600 (grid v3), AR-400, AR-401, AR-402 in `docs/ASSET_REQUESTS.md`)

## What this is
Every person, animal and monster plays an attack when it strikes (hunting, fighting, a predator taking prey), a hurt reaction when hit, and a death when it dies; its remains then lie on the cell for 12 game hours and fade (DF keeps corpses).

**MANDATORY RULES:**
- **ALL GENERATION TASKS ARE TO UTILIZE GOOGLE NANO BANANA PRO** (AGENTS.md Rule 11, VISION V69, V70, V79, V109). Every creature sheet must originate from Google Nano Banana Pro (`generate_image`, model id `gemini-3-pro-image`, Gemini 3 Pro Image model). Nano Banana Pro utilizes advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity text and pixel details. No other model is permitted; no sprites typed in code.
- **ALL ANIMATION MUST HAPPEN THROUGH THE SPRITE; NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108). All motion—strikes, flinches, falls, and remains—must come from distinct sprite frames authored in the art sheets. No programmatic distortion, squashing, stretching, or shader warps.


## 1. What the engine reads
The unit's own sheet in `game/img/characters/` (the one `unit.image.characterName` names: the catalog's `wildlife.species[].image`, `people.<species>.images`, the colonists' tier sheets) and its sidecar, the `.json` of the same name next to it.

### 1.1 The grid (AR-600 v3)
One PNG per sheet: **20 columns × 4 rows of 48×48 frames = 960×192 px** (16×16 native at 3×, V2). Rows S, W, E, N (RPG Maker's order). Columns:

| Columns | Animation | Frames |
|---|---|---|
| 0 | `stand` | 1 |
| 1, 2, 3 | `walk` | step, stand, step |
| 4, 5, 6 | `work` | swing cycle (mine, chop, gather, build) |
| 7, 8, 9 | `carry` | walk with the arms forward |
| 10, 11, 12 | `attack` | wind-up, strike, recover (animals: bite, claw, kick or butt) |
| 13, 14 | `cast` | two frames |
| 15 | `sleep` | lying asleep |
| **16** | **`hurt`** | **one frame: recoiling from the blow (body leaning away from the facing direction, eyes shut or mouth open)** |
| **17, 18, 19** | **`dead`** | **falling: buckling, going down, lying dead. The last frame is the remains that lie on the cell for 12 hours: on its side, still, inside the 48×48 square, feet or paws on the facing side** |

Animals and monsters may leave `work`, `carry` and `cast` empty (transparent); every creature fills `stand`, `walk`, `attack`, `hurt` and `dead`. The anchor (feet at the bottom centre, [24, 47]) is the same pixel in every frame, the dead frames included, so the body falls in place.

### 1.2 The sidecar
```json
{ "frameWidth": 48, "frameHeight": 48, "anchor": [24, 47], "facings": ["S", "W", "E", "N"],
  "animations": { "stand": [0], "walk": [1, 2, 3, 2], "work": [4, 5, 6], "carry": [7, 8, 9],
                  "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15], "hurt": [16], "dead": [17, 18, 19] } }
```
`frameWidth`/`frameHeight` are required on a 20-column sheet (the engine cuts the frames with them). `death` is accepted as another name for `dead`. A sheet may list only what it has: without `attack` the code lunge plays; without `hurt` only UF_Combat's recoil and flash; without `dead` the code fall.

### 1.3 How each set of frames plays
- `attack`: the three columns over 15 frames when UF_Combat resolves a strike (with its lunge offset), and over 12 frames on every work stroke of a hunter next to its prey or a predator next to its target (with a 6 px lunge).
- `hurt`: the column for 10 frames when the unit is hit (with UF_Combat's recoil and red flash).
- `dead`: a 2-frame white flash on the first column, then each column for 8 frames, then the last column stays on the cell, upright, for `anim.remainsHours` game hours, fading over the last hour.

## 2. What to make
Everything already on the AR-400/401/402 lists, redrawn or extended on the v3 grid, one creature at a time; the stock or stand-in sheet stays in use until its replacement is delivered and approved (V11). No new species, no new names.

## 3. How to check a delivery
1. The PNG is 960×192 (or 20 × frameWidth by 4 × frameHeight), alpha 0 or 255, every frame inside its 48×48 square (ART_STANDARD §8).
2. The sidecar parses and lists `attack` (3 columns), `hurt` (1) and `dead` (3).
3. **Do not point a catalog `image` at a 20-column sheet yet.** RPG Maker draws a `$` sheet as 3 columns, so walking and standing would be cut from the wrong place (a third of the sheet's width per frame) until the engine's character renderer cuts `stand` and `walk` by the sidecar too (an engine item, not done). UF_Anim already cuts `attack`, `hurt` and `dead` by the sidecar. Deliver the v3 sheet under its own name (`$UF_<species>_<gender>_adult_body.png`, AR-600) with a review sheet in `art/review/`; Claude Code switches the catalog when the renderer lands.
4. Claude Code then checks it in the game: New Game, **K** calls two hostile wolves near the view (UF_Combat's test key), and in the fight the strikes show the attack columns, hits the hurt column, and the dead one falls through its three death columns and stays on its cell. The `anim` suite proves the columns are the ones played (it uses a code-made sheet; it does not judge the drawing).
