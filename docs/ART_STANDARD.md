# ART STANDARD: High-Resolution 2.5D Ultima VII Oblique (1-Square Tile Containment)

**Approved 2026-09-18 (night) by user decision:** the game's look is **High-Resolution 2.5D Ultima VII Oblique**, strictly contained inside **1 asset square (48×48 screen pixels)**. This brings back the rich micro-dithered detail, textile folds, rock grain, and authentic 45° axonometric depth of Ultima VII (`STATIC/SHAPES.VGA` using the Daylight Palette `art/palette/uf.hex`), without multi-tile sprawl. Low-res chunky 16×16 pixel art is superseded.

## 1. The view
| # | Rule |
|---|---|
| U1 | **Ultima VII 2.5D Oblique view** on a square grid: ground is viewed from above; vertical height projects **up and to the left at 45°**. Top, South, and East faces are visible. |
| U2 | **High-resolution micro-detail:** artwork uses fine 1-pixel micro-dithered shading, authentic textile folds, and mineral facets matching native Ultima VII assets, rather than chunky low-res block pixels. |
| U3 | **One coherent scale (VISION V44, revised 2026-09-19):** every asset is drawn at the same world scale; small things (a hare, an item, a flower) are smaller than a cell and large things (a big tree, a boulder, a horse, a troll, a workshop, a house) are larger than one and may cover several cells (a footprint) or overhang neighbouring cells. Creatures still move one per cell. The pixels-per-metre scale is set by a lineup the user approves (`docs/design/SCALE.md`, pending); until then do not shrink or stretch assets to fit a cell. Anchor at the bottom-centre of the footprint. |
| U4 | **Facings:** 4 facings for characters and creatures (South, West, East, North). In 2.5D oblique projection, West and East facings are transposed (X/Y swap) to maintain the 45° up-and-left lean. |
| U5 | **Palette:** 100% Ultima VII Daylight Palette (`STATIC/PALETTES.FLX` record 0 / `art/palette/uf.hex`). Background for generation/clean steps is flat magenta `#FF00FF`. No blur, no anti-aliasing to background. |
| U6 | **Scale reference:** 1 tile = 48×48 screen pixels (RMMZ native tile grid). |
| U7 | **Combat is on the map** (VISION V45): attacks, casts, and hits play as animation frames on the map sprite (AR-600), with DF-style injuries. |

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
