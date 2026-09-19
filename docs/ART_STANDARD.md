# ART STANDARD: High-Resolution 2.5D Ultima VII Oblique (Proportional World Scale)

**Approved 2026-09-19 by user decision:** the game's look is **High-Resolution 2.5D Ultima VII Oblique**, with **proportional world scale** (user: "Things can be larger than 1 grid square, but the whole world must seem coherent and at proper scale. So that means, some things get smaller than 1 grid square and some things get larger"). This brings authentic micro-dithered detail, textile folds, rock grain, and authentic 45° axonometric depth of Ultima VII (`art/palette/uf.hex`). Multi-tile sprawl on the collision grid is avoided by keeping discrete 1-cell footprints while letting visual canopies, large fauna and monsters scale naturally, and vermin/items scale down.

## 1. The view
| # | Rule |
|---|---|
| U1 | **Ultima VII 2.5D Oblique view** on a square grid: ground is viewed from above; vertical height projects **up and to the left at 45°**. Top, South, and East faces are visible. |
| U2 | **Fantasy realism on a small scale, at full detail (user, 2026-09-19):** art is made at the highest resolution and level of detail that makes sense, with ONE pixel density for everything: one art pixel = one screen pixel at zoom 1 (no 2× or 3× chunky upscales next to fine art). Realistic proportions, materials and light in a fantasy world, seen small. Fine 1-pixel shading and micro-dither as in the reference squares. |
| U3 | **Coherent proportional scale (VISION V44):** footprints anchor to the cell grid, but visual height, mass and canopy scale naturally. Towering trees, large draft animals (oxen, horses) and monsters can exceed 48×48 frames; vermin (rats, birds), loose items, and small flora scale smaller than 48×48. Anchor sits at the bottom-centre of the ground footprint. |
| U4 | **Facings:** 4 facings for characters and creatures (South, West, East, North). In 2.5D oblique projection, West and East facings are transposed (X/Y swap) to maintain the 45° up-and-left lean. |
| U5 | **Palette:** 100% Ultima VII Daylight Palette (`STATIC/PALETTES.FLX` record 0 / `art/palette/uf.hex`). Background for generation/clean steps is flat magenta `#FF00FF`. No blur, no anti-aliasing to background. |
| U6 | **Scale reference:** 1 tile = 48×48 screen pixels (RMMZ native tile grid). |
| U7 | **Combat is on the map** (VISION V45): attacks, casts, and hits play as animation frames on the map sprite (AR-600), with DF-style injuries. |
| U8 | **Everything that can be animated is animated (VISION V60):** creatures carry idle frames (breathing, a weight shift, a blink where the face shows) besides walk, work, carry, attack, hurt and death; plants carry a 3-frame sway (trees, grass, reeds, crops); fire, water, smoke and doors carry their loops; workshops a working loop. Frames go in the sheet with the sidecar naming them under `animations` (`idle`, `sway`, `lit`, `open`, `work`) and `frameMs`. |

## 2. Reference & Stand-ins
- **Ultima VII assets decoded directly from `STATIC/SHAPES.VGA`** (scaled to 48×48 single-tile containment) serve as the approved visual masters and stand-ins during development (`art/u7_reference_squares/`).
- Original art will match this standard: authentic 2.5D oblique lean, micro-dithered shading, and 48×48 square containment.

## 3. Sprite sheets and sidecars
- Characters and creatures: RPG Maker's `$` single-character sheet, 3 columns × 4 rows (S, W, E, N), **frame 48×48 for everyone**, plus the animation columns of the layered standard (`docs/ASSET_REQUESTS.md` AR-600: work, carry, attack, cast, sleep) as they arrive.
- Objects: one frame (the middle frame of the top row of a `!$` sheet, or a tile in a B/C tileset image). States are separate entries (standing/stump, full/picked, unlit/lit, intact/ruined).
- Every original sheet has a JSON sidecar of the same name: `frameWidth`, `frameHeight`, `anchor` (bottom-centre pixel of the footprint), `facings`, `animations`, `layer`, `species`, `stage`.

## 4. Color and style
- One project palette once locked (`art/palette/uf.hex`); until then the RPG Maker RTP palette range is acceptable for placeholders.
- Light from the upper left, soft; shadows under objects are drawn by the engine, not baked.
- No text, watermarks or borders in images. Generic, descriptive names (`UF_Tree_Oak.png`, "Oak"); no invented lore in names.

## 5. Making real art
| Step | Output | Who |
|---|---|---|
| 1. Brief | `art/briefs/<id>.md`: id, category, footprint, frame size, facings, animations, states, description | Claude Code drafts from the catalog; user approves |
| 2. Style lock (once) | Four anchor assets: one person, one tree, one wall piece, one ground tile, in the U7 2.5D manner at 48×48 (the reference squares in `art/u7_reference_squares/` are the yardstick; the user approved the composite `art/review/u7_square_composite.png` on 2026-09-18) | Gemini, then the user |
| 3. Generate | `art/raw/<id>/`: one view per request, flat magenta `#FF00FF` background, the reference square and the style anchors attached | Gemini |
| 4. Clean | `art/masters/<id>.png`: **48×48 native** (1 art pixel = 1 screen pixel at zoom 1; no upscaling step), snap to the palette, remove the background, place on the anchor (bottom-centre of the cell, `[24, 47]`) | A tool |
| 5. Check | §6 passes | Tool |
| 6. Review | `art/review/index.html`: 1× and 4× next to the person reference, on grass | User |
| 7. Approve | `art/APPROVALS.md` | **User only** |
| 8. Export | copy to `game/img/` for approved ids (no scaling: masters are already at screen size) | Tool |

## 6. Asset checklist
Automated: palette colors only; alpha 0 or 255; the frame is 48×48 (or the sheet is a grid of 48×48 frames); frame size and anchor as the sidecar says; the sidecar exists with the right frame counts. (`tools/art_check.js` still applies the older 3×-grid rule; until it is updated, run it with `--type` where it matters and ignore the `grid` check for 48-native masters.)
By eye: the 45° up-left lean reads (top, south and east faces visible); nothing clipped at the square's edges; right size next to the person reference; same character in every frame; reads at zoom ⅓ (farthest) and at night; no stray pixels.

## 7. How image models fail here, and the rule for each
| Failure | Rule |
|---|---|
| Can't hit exact pixel sizes or sheet grids | Never trust the model's grid. The clean step rebuilds it. |
| "Pixel art" with mixed pixel sizes and blur | Downsample and snap. If it falls apart at 1×, reject it. |
| Drifts to isometric, to a flat JRPG view, or to painterly high-res | Attach the reference square for the same kind of thing and the style anchors; reject anything without the 45° up-left lean, anything with a diamond (isometric) base, and anything that does not fit the 48×48 square. |
| The character changes between frames or facings | Approve one facing first, then use it as the reference for the others. |
| Green fringes from green-screen | Magenta background only |
