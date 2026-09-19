# ART STANDARD: HD pixel art in the style of Final Fantasy VI

**Set 2026-09-19 (early afternoon) by user decision (VISION V2, V44):** the look is **HD pixel art in the style of Final Fantasy VI**: the flat 3/4 top-down RPG view, upright sprites, no lean, at the **highest definition that keeps the art style and the scale** (user: "i want the highest definition assets that keep the art style and scale"), with every sprite sized against the 48 px RPG Maker grid square. The earlier standards (U7 2.5D, flat 16×16 at 3×, high-resolution 2.5D squares, the 2.5D proportional-scale version) are withdrawn; `docs/GUIDE_25D.md` is obsolete. This applies to every image in the game. An image that breaks a rule here doesn't go into `game/img/`, however good it looks.

## 1. The view and the look
| # | Rule |
|---|---|
| F1 | **Flat 3/4 top-down RPG view**, the one RPG Maker draws by default: ground seen from above; people, animals, trees and objects stand upright and show their front; walls show their top and front face. Nothing leans, tilts or slants; no isometric diamonds; no perspective. |
| F2 | **FF6's design language:** clear readable silhouettes, charming proportions (people with slightly large heads, about three heads tall), a dark selective outline (darkest at the bottom and right, never plain black everywhere), lively cel shading in 3–5 flat tones per material, light from the upper left, a little dithering only for texture. No gradients, no blur, no anti-aliasing against the background. |
| F3 | **Highest definition that keeps the style and the scale:** one art pixel is one screen pixel at zoom 1 on the 48 px grid. That is the most detail a pixel-art sprite can carry at this grid size without turning into scaled-down painting; every sprite uses it fully (faces with eyes, clothing folds, buckles, hair and fur texture, bark and stone grain), keeping FF6's clarity. The generators' 4× originals are kept in `art/raw/` so a larger grid square could be adopted later without redrawing. |
| F4 | **Scale against the grid square (V44):** a grown person fills roughly one square; smaller creatures, plants and items are smaller; larger beings use bigger character sheets and take up more space. The size table is in §2. Creatures move one per cell; large objects may cover several cells and may overhang the cells above them, never the cells below. |
| F5 | **Palette:** the project palette `art/palette/uf.hex` (256 colours); the cleaning tool snaps every colour to it. Rich, warm, lively colour as in FF6; no neon, no pure black. Every pixel fully opaque or fully transparent. |
| F6 | **Characters:** 8 facings (S, SW, W, NW, N, NE, E, SE; VISION V3), the east-side facings may mirror the west side. Bodies are bare-handed in plain clothes; clothing, armour, shields, tools and weapons are layer sheets on the same frames (V61). |
| F7 | **Animation is frames in the art** (V58, V60): idle, walk, work, carry, attack, cast, hurt, death; sway, lit, open and work loops for objects. The game draws no motion of its own. Combat happens on the map (V45, V64). |
| F8 | **Theme (V65):** Arthurian fantasy with science-fiction touches. Named lore needs the user's approval (AGENTS rule 7). |

## 2. Sizes against the 48 px grid square
| Thing | Final size | Frame |
|---|---|---|
| Grown human, elf, orc, automaton | 44–48 px tall | 48 × 48 |
| Dwarf, goblin, gnome | 34–40 px tall | 48 × 48 |
| Child | 24–36 px | 48 × 48 |
| Hare, rat, songbird | 12–16 px | 48 × 48 |
| Fowl, bat, hawk | 16–24 px | 48 × 48 |
| Fox, wildcat, jackal | 26–32 px long | 48 × 48 |
| Wolf, boar, sheep | 36–44 px long, 28–32 tall | 48 × 48 |
| Deer | 44 px long, 48 tall with antlers | 48 × 48 |
| Wild horse, aurochs | 72 px long, 56 tall | 96 × 96 |
| Giant spider, sand stalker | 64 px wide | 96 × 96 |
| Restless dead | 46 px tall | 48 × 48 |
| Ice wraith, bog horror | 64–72 px tall | 96 × 96 |
| Troll | 88 px tall | 96 × 96 |
| Oak, fruit tree | 80–96 px wide and tall | 96 × 96 |
| Pine, birch, palm | 56–72 wide, 104–120 tall | 96 × 144 |
| Stump, bush | 32 × 24, 36 × 28 | 48 × 48 |
| Tall grass, reeds, flowers | 12–36 px | 48 × 48 |
| Boulder, ore outcrop | 48 × 40 | 48 × 48 |
| Loose stones, items on the ground | 12–28 px | 48 × 48 |
| Campfire | 40 wide, flame 32 tall | 48 × 48 |
| Straw bed, work stone | 44–48 × 24–28 | 48 × 48 |
| Furnace, well | 48–56 wide, 56–64 tall | 96 × 96 |
| Wall piece | top on its square, front face one square tall below | 48 × 96 |

Every sprite stands on the bottom-centre of its frame. The anchor in the sidecar is that point.

## 3. Placeholders
- **Stock RPG Maker MZ art is the placeholder set** (VISION V9, 2026-09-19): tiles from `Outside_*`, characters from `People1-4`, `Actor1-3`, `Nature`, `Monster`, `Evil` (cut into single-character sheets by a tool so the engine can use them), icons from `IconSet`. Its people fill a 48 px square, like §2. `docs/ASSET_INVENTORY.md` lists every one with its request ID. The `U7_` files stay on disk, unused.
- New art is made to this standard only.
- Code-drawn placeholders (`UF_Gen*`) are fine until art arrives.

## 4. Sheets and sidecars
- Characters and creatures: one sheet per character on the layered standard (`docs/ASSET_REQUESTS.md` AR-600): 8 rows (S, SW, W, NW, N, NE, E, SE) and 20 columns (0 stand, 1–3 walk, 4–6 work, 7 carry, 8–10 attack, 11–13 cast, 14 hurt, 15–17 death, 18–19 idle), frames of the size in §2.
- Objects: one frame per state, or a loop named in the sidecar. States that the catalog treats as separate objects (standing/stump, full/picked, unlit/lit, intact/ruined) are separate files.
- Every sheet has a JSON sidecar of the same name: `frameWidth`, `frameHeight`, `anchor` (bottom-centre of the footprint), `footprint`, `facings`, `animations`, `frameMs`, `layer`, `species`, `stage`.

## 5. Making real art
| Step | Output | Who |
|---|---|---|
| 1. Prompt | `docs/handoffs/GENERATOR_PROMPTS.md` (one prompt per asset group; built by `tools/build_generator_prompts.js` from the catalog) | Claude Code |
| 2. Style lock (once) | Four anchors: a man, an oak, a wall piece, a meadow tile | a generator, then the user |
| 3. Generate | `art/raw/<id>.png`: drawn on a 4× canvas (one grid square = 192 × 192), magenta background; kept as the high-resolution original | the generators |
| 4. Clean | `art/masters/<id>.png` + sidecar: reduced by 4, background removed, snapped to the palette, placed on the anchor (the cleaning tool) | a tool |
| 5. Check | `tools/art_check.js --native` and `tools/originality_check.js` pass | tools |
| 6. Review | the result at 1× and 4× on grass next to the person reference | the user |
| 7. Approve | `art/APPROVALS.md` | **the user only** |
| 8. Export | copy to `game/img/` and point the catalog at it | Claude Code |

## 6. Asset checklist
Automated: palette colours only; alpha 0 or 255; frame size, anchor and frame counts as the sidecar says; originality check passes.
By eye: upright, no lean; the right size against the grid square and the person reference; the same character in every frame and facing; the detail uses the full resolution; reads at zoom ⅓ and at night; no stray pixels.

## 7. How image models fail here, and the rule for each
| Failure | Rule |
|---|---|
| Can't hit exact pixel sizes or sheet grids | Draw at 4× with even blocks; the cleaning step rebuilds the grid. |
| Mixed pixel sizes and blur | Reject; ask for even 4 × 4 blocks. |
| Drifts to 2.5D, isometric or painterly | Reject anything that isn't the flat 3/4 top-down view. |
| Wrong size against the grid square | Measure against §2 and the person reference; redraw. |
| Too little detail (big flat areas, 16-bit-sized features) | Reject; this standard uses every pixel of the frame. |
| The character changes between frames or facings | Approve one facing first, then use it as the reference for the others. |
| Copies a reference | The originality check rejects it. |
| Green fringes from green-screen | Magenta background only. |
