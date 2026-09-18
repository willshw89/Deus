# ART STANDARD: the 2D look (16-bit JRPG style, in the manner of Final Fantasy VI)

**Revised 2026-09-18 (evening) by user decision:** the game's look is **2D in the style of FF6**, not Ultima VII's 2.5D. The earlier 2.5D standard and `docs/GUIDE_25D.md` are superseded; they stay in the repo as history only. This applies to every image in the game, placeholders included. An image that breaks a rule here doesn't go into `game/img/`, however good it looks.

## 1. The view
| # | Rule |
|---|---|
| F1 | **Flat 3/4 top-down JRPG view** on a square grid, the same view RPG Maker draws by default: ground is seen from above, walls and objects show their front face, nothing leans, no isometric diamonds. |
| F2 | **Tiles:** 16×16 native pixels, shown at exactly **3× = 48×48** (RMMZ's tile size). Ground and water are RMMZ autotiles (A1/A2 layouts). Tall things (trees, walls, furniture) are objects drawn as sprites over the ground, sorted by their bottom row so people walk in front of and behind them. |
| F3 | **Characters:** upright, 4 facings (S, W, E, N), **16×24 native = 48×72 exported** for people (adults; children smaller), animals sized to fit 1 cell. Feet on the bottom row of the cell, anchor at the bottom-centre of the cell. E and W may be mirrors of each other (there is no lean to break). |
| F4 | **Depth:** the engine sorts by foot row; a sprite may overhang the cells above it (tree canopies, tall walls) but never the cells below. |
| F5 | **Palette:** 16-bit look: 16–32 colors per sheet, one project palette (`art/palette/uf.hex`) once locked, no gradients, no anti-aliasing, no blur, pixels fully opaque or fully transparent. Outlines dark and selective (as FF6 does), not pure black everywhere. |
| F6 | **Scale reference:** an adult is 1 cell wide and 1½ cells tall; a door is 1 cell; a hut is 3×3 cells; a large tree is 2 cells wide and 3 tall. |

## 2. Placeholders
- **Stock RPG Maker MZ art is the placeholder set** (it is this style, and licensed for RPG Maker games): `Outside_*` tiles for ground, water, trees, bushes, rocks and buildings; `People1–4`, `Actor1–3`, `Nature`, `Monster`, `Evil` character sheets. The catalog names them; `docs/ASSET_INVENTORY.md` lists every one in use with its request ID.
- **Ultima VII art is no longer a stand-in** (it leans). Existing `U7_` files stay on disk until each is replaced, listed in `docs/STATUS.md`, and are never committed; new `U7_` files are not made.
- Code-drawn placeholders (`UF_Gen*`: ground kinds, stance squares, selection corners, designation marks) are fine until art arrives.

## 3. Sprite sheets and sidecars
- Characters and creatures: RPG Maker's `$` single-character sheet, 3 columns × 4 rows (S, W, E, N), frame 48×72 for people (48×48 for small animals, 96×96 for large ones), plus the animation columns of the layered standard (`docs/ASSET_REQUESTS.md` AR-600) as they arrive.
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
| 2. Style lock (once) | Four anchor assets: one person, one tree, one wall piece, one ground tile, in the FF6 manner | Gemini, then the user |
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
