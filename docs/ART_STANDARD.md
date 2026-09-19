# ART STANDARD: the 2D look (16-bit JRPG pixel art in the manner of Final Fantasy V, one square per asset)

**Revised 2026-09-19 (morning) by user decision:** the game's look is **flat pixel art in the manner of Final Fantasy V (SNES), one square per asset**: no 2.5D lean, no lifts, no transposed facings. The 2026-09-18 night standard (high-resolution U7 2.5D in a 48×48 square) is withdrawn; `docs/GUIDE_25D.md` is obsolete again. This applies to every image in the game, placeholders included. An image that breaks a rule here doesn't go into `game/img/`, however good it looks.

## 1. The view
| # | Rule |
|---|---|
| F1 | **Flat 3/4 top-down JRPG view** on a square grid, the same view RPG Maker draws by default: ground is seen from above, walls and objects show their front face, nothing leans, no isometric diamonds. |
| F2 | **Tiles:** 16×16 native pixels, shown at exactly **3× = 48×48** (RMMZ's tile size). Ground and water are RMMZ autotiles (A1/A2 layouts). Trees, walls and furniture are objects drawn as sprites over the ground, sorted by their bottom row so people walk in front of and behind them. |
| F3 | **Everything fits one tile (VISION V44, like DF):** every person, creature, tree, wall piece and item has a one-cell footprint and fits a **48×48 frame** (16×16 native), whatever its real size; a hare, a horse, a troll and an oak are all one tile. Bulk shows in the portrait and the description. Characters: upright, 4 facings (S, W, E, N), feet on the bottom row of the cell, anchor at the bottom-centre; E and W may mirror each other. RPG Maker's own 48×48 character frames are exactly this format. |
| F4 | **Depth:** the engine sorts by foot row; a sprite may overhang the cells above it (tree canopies, tall walls) but never the cells below. |
| F5 | **Palette:** 16-bit look: 16–32 colors per sheet, one project palette (`art/palette/uf.hex`) once locked, no gradients, no anti-aliasing, no blur, pixels fully opaque or fully transparent. Outlines dark and selective (as FF5 does), not pure black everywhere. |
| F6 | **Scale reference:** everything is one cell (F3); a hut is 3×3 cells of one-cell wall pieces; a forest is many one-cell trees. |
| F7 | **Combat is on the map** (VISION V45): attacks, casts and hits are frames of the character's own sheet (AR-600 `attack`, `cast`) plus small effect sprites; there is no battle screen and no separate battler art. |

## 2. Placeholders
- **What is in use today stays until it is replaced:** the `U7_` stand-ins (VISION V9) and the stock RPG Maker MZ tiles and sheets the catalog names. `docs/ASSET_INVENTORY.md` lists every one with its request ID. The `U7_` stand-ins lean (they are 2.5D), so they break this look and are replaced first; whether to swap them for stock RPG Maker art in the meantime is a decision waiting on the user (STATUS).
- New art is made to this standard only; no new `U7_` files are made.
- Code-drawn placeholders (`UF_Gen*`: ground kinds, stance squares, selection corners, designation marks) are fine until art arrives.

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
| 1. Brief | `docs/asset_briefs/SEG-<nn>_<family>.md` (one brief per asset in Gemini's schema: id, category, dimensions 16×16, anchor [8, 15], palette ramps, primary state, interaction state, readability; `tools/check_briefs.js` checks them) | Claude Code drafts from the catalog; user approves |
| 2. Style lock (once) | Four anchor assets: one person, one tree, one wall piece, one ground tile, in the FF5 manner | Gemini, then the user |
| 3. Generate | `art/raw/<id>/`: one view per request, flat magenta `#FF00FF` background, the style anchors attached | Gemini |
| 4. Clean | `art/masters/<id>.png`: downsample to 1×, snap to the palette, remove the background, place on the anchor | A tool |
| 5. Check | §6 passes | Tool |
| 6. Review | `art/review/index.html`: 1× and 3× next to the person reference, on grass | User |
| 7. Approve | `art/APPROVALS.md` | **User only** |
| 8. Export | 3× to `game/img/` for approved ids | Tool |

## 6. Asset checklist
Automated: palette colors only; alpha 0 or 255; scaling the master 3× reproduces the export; frame size and anchor as the sidecar says; the sidecar exists with the right frame counts.
By eye: upright, no lean; right size next to the person reference; same character in every frame; reads at 1× (farthest zoom) and at night; no stray pixels.

## 7. How image models fail here, and the rule for each
| Failure | Rule |
|---|---|
| Can't hit exact pixel sizes or sheet grids | Never trust the model's grid. The clean step rebuilds it. |
| "Pixel art" with mixed pixel sizes and blur | Downsample and snap. If it falls apart at 1×, reject it. |
| Drifts to isometric or to modern high-res | Attach the style anchors and a stock RPG Maker sprite as a size reference; reject anything that isn't flat 3/4 top-down. |
| The character changes between frames or facings | Approve one facing first, then use it as the reference for the others. |
| Green fringes from green-screen | Magenta background only |
