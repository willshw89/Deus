# ASSET REQUESTS: art the engine needs, with specs

**Claude Code** (engine) adds a request here whenever a feature needs art. **Gemini** (art) makes the assets to these specs. Claude Code checks each delivery against its spec and integrates it, and **the user approves** every asset before it counts as final (VISION V11).

Every rule in `docs/ART_STANDARD.md` applies. How to draw the U7 look: `docs/GUIDE_25D.md`. If a spec here seems wrong or impossible, write it under the request's **Notes** and tell the user. Don't silently change the asset or the spec.

## Status flow
`REQUESTED` → `IN PROGRESS` (Gemini) → `DELIVERED` (files in place, sidecar written) → `CHECKED` (Claude Code: ART_STANDARD §8 checks pass and it works in the engine) → `APPROVED` (user) → `INTEGRATED`
A delivery that fails its check goes back to `IN PROGRESS`, with the reason in Notes.

## Shared spec (applies to every request unless it says otherwise)
Values marked *provisional* depend on the user's open decisions Q5 (facings) and Q6 (scale) in `docs/VISION.md`. Use them until those are locked.

| Item | Spec |
|---|---|
| Native pixel size | Draw at **1× native**; export at exactly **3×**, nearest-neighbor (*provisional*, Q6) |
| Grid cell | 16×16 native = 48×48 exported (*provisional*, Q6) |
| Height unit (lift) | 4 native px, drawn **up and left** (ART_STANDARD F2) |
| Projection | Ground is flat top-down. Anything with height leans **up-left at 45°** (GUIDE_25D §1). |
| Frame box | An object with a w×d cell footprint and h lifts of height fits a **(16w + 4h) × (16d + 4h)** native box, with its footprint in the bottom-right corner (ART_STANDARD §3) |
| Facings | **4** (S, W, E, N). E and W are **transposes** of S and N, never mirrors (*provisional*, Q5) |
| Palette | The project palette once it's locked. Until then, stand-ins use U7's palette as decoded. |
| Alpha | 0 or 255 only; no baked shadows (the engine draws shadows) |
| Background for generation | Flat magenta `#FF00FF` |
| Stand-ins | Allowed now (AGENTS rule 8). File name starts with `U7_`, exactly 3×, listed in STATUS → Stand-ins. |
| Original art | Goes through the ART_STANDARD §7 pipeline (`art/briefs` → `art/raw` → `art/masters` → review → `art/APPROVALS.md`) |

### Sprite sheet + sidecar format (what the engine reads)
Every object or character image comes with a JSON sidecar of the same name (`UF_Human_Male.png` + `UF_Human_Male.json`). Sheets are a grid: **one row per facing, one column per frame**, all frames the same size, in exported (3×) pixels.

```json
{
  "id": "human_male",
  "frameWidth": 84,
  "frameHeight": 84,
  "anchor": [83, 83],
  "footprint": [1, 1],
  "heightLifts": 5,
  "facings": ["S", "W", "E", "N"],
  "animations": { "stand": [0], "walk": [1, 0, 2, 0] },
  "frameMs": 150,
  "standInSource": "SHAPES.VGA shape 458 frames 0-2, 16-18 (only for U7_ stand-ins)"
}
```
- `anchor` is the pixel inside a frame that sits on the **bottom-right corner of the footprint** (for U7 shapes, the decoded hotspot × 3).
- Objects without facings (trees, rocks) use `"facings": ["S"]`. States such as `"stump"` or `"harvested"` go in `animations` as single-frame entries.
- Until the engine's sidecar loader exists (Claude Code, next), a stand-in may also be delivered as a standard RMMZ `$`/`!` 3×4 sheet. Say so in Notes.

## Requests

| ID | Asset | Needed for | Priority | Status |
|---|---|---|---|---|
| AR-001 | Ground tiles: grass (2 variants), dirt, riverbed water with banks | Every area (Slice 0 world) | High | REQUESTED |
| AR-010 | Human, male (naked) | Adam; later all humans | High | IN PROGRESS (stand-in `$Adam.png`, shape 458, clothed; must be renamed `U7_`) |
| AR-011 | Human, female (naked) | Eve | High | IN PROGRESS (stand-in `$Eve.png`, shape 452, clothed; must be renamed `U7_`) |
| AR-020 | Fruit tree (the glade's tree) | Glade, food source | High | IN PROGRESS (stand-in `!$FruitTree.png`, shape 670; red canopy looks like a palette problem, see A3-8) |
| AR-021 | Wild tree, 3 variants, standing + stump | World generator, felling | High | REQUESTED |
| AR-022 | Boulder, 2 variants | World generator, stone gathering | Medium | REQUESTED |
| AR-023 | Bush, 2 variants | World generator | Medium | REQUESTED |
| AR-030 | Look cursor | Cursor (Slice 0, deliverable 7) | High | REQUESTED |
| AR-031 | Unit selection marker | Unit selection | Medium | REQUESTED |
| AR-032 | Look panel frame | Look panel (deliverable 7) | Medium | REQUESTED |

### AR-001 Ground tiles
- **Type:** RMMZ tileset images for the A1 (water, animated) and A2 (ground) slots, in RMMZ's standard autotile layout (A1: 768×576 exported; A2: 768×576 exported). Flat top-down, no lean.
- **Needs:** grass ×2 (plain, flowered), dirt path, and riverbed water (animated, 3 frames) whose autotile edges form a bank.
- **Stand-in:** U7 ground tiles (SHAPES.VGA shapes 0–149 are 8×8 [MEASURE]): 2×2 per 16×16 cell, ×3. Name them `U7_Ground_A1.png` / `U7_Ground_A2.png`.
- **Notes:** the engine currently uses tileset 2 (RMMZ "Outside"). Claude Code switches tile IDs when these arrive.

### AR-010 / AR-011 Humans
- **Footprint** 1×1. **Height:** match the U7 stand-in until measured (ART_STANDARD §2 "Adult human height").
- **Facings** S, W, E, N (E/W transposed). **Frames:** stand + 2 walk steps per facing (`walk: [1, 0, 2, 0]`).
- **Naked** (VISION V4), no clothing, non-sexualized, readable at 1× (zoomed-out view).
- **Must read at every zoom level:** 3×, 2×, and 1× (UF_Camera). Check the silhouette at 1×.
- **Stand-in fixes needed:** rename to `$U7_Adam.png` / `$U7_Eve.png` (the engine switches names on delivery). The source shapes are clothed townsfolk; fine as stand-ins.

### AR-020 Fruit tree
- **Footprint** 1×1 trunk. **Height** about 3–4 cells of canopy (match the stand-in). **Facings:** S only.
- **States:** `with_fruit`, `harvested` (the fruit visibly gone). The engine switches state when fruit is picked.
- The canopy must allow the engine's cut-away (fading when a unit is behind it), so no semi-transparent pixels.

### AR-021 / AR-022 / AR-023 World objects
- Trees: footprint 1×1 trunk; states `standing`, `stump`. Boulders and bushes: footprint 1×1, single state.
- 2–3 variants each, as separate columns (the engine picks a variant per object from the seed).
- These are placed by the thousand (a 256×256 area), so keep them readable at 1× and don't make them the brightest thing on screen.

### AR-030 Look cursor
- A **flat** outline of one cell (16×16 native), drawn on the ground, 2 frames (pulse). Bright, and readable on grass, water, and dirt.
- Optional third frame: a vertical "post" rising up-left from the cell's corner, for showing height when the cursor sits on something tall.

### AR-031 Unit selection marker
- A flat ellipse or bracket around a 1×1 footprint on the ground, 1 frame. Drawn under the unit.

### AR-032 Look panel frame
- A window frame in RMMZ window-skin format (`img/system/Window.png` layout, 192×192) in a U7-like style (wood or parchment), or a 9-slice PNG with its border size in Notes.

## Notes for Claude Code (from Gemini)
Write here when an asset needs an engine change.
- (none yet)
