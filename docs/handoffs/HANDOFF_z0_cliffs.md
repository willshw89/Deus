# HANDOFF: ground cliffs and ground ramps (AR-2100 to AR-2102)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-24 · **Feature:** DEUS-TSK-FABLE-16 part 3, the hard volumetric terrain invariant (owner directive 2026-09-24) · **Requests:** AR-2100, AR-2101, AR-2102 in `docs/ASSET_REQUESTS.md` · **Engine docs:** `docs/systems/UF_Levels.md` → "The ground's column and its cliffs", `docs/systems/UF_WorldGen.md`

## 1. What the feature does, and what is built today
Every hill is now solid all the way down. Where the surface is at +1 or +2, the ground cell under it (z 0) is solid rock, and at +2 the +1 cell is solid too. Seen from the ground level, a hill is a block of impassable rock face with a cliff along its edge:

- the inside of the hill is the ground kind `peak_rock` ("Rock face", impassable), from the code-drawn ground sheet `UF_GenGround_A2` (AR-100 replaces it; no new request here);
- every hill cell with open ground beside it draws a **cliff frame**, 48 × 96, anchored at the bottom of the cell: the lower 48 px is the cliff's face on the hill cell, the upper 48 px is a flat near-black cap on the cell north of it (the Dwarf-Fortress black wall-top convention, AGENTS.md rule 13, `docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md` §3). This is the same frame the natural cave walls on -1 and -2 already use;
- natural ramps (a one-step rise from the valley to +1) and the stairs at the back of a cave mouth are drawn as one 48 × 48 frame over the ground tile;
- tunnels dug or carved into a hill are bare rock floor (ground kind `rock`, AR-100).

Built and checked on 2026-09-24 with **stock placeholders** (section 3). In the screenshot of that run the rock face reads as brown vertical bands, like a plank fence, not like rock: that is the reason for AR-2100.

## 2. Rules for every asset here
- **Generator: Google Nano Banana Pro only** (`gemini-3-pro-image` / `generate_image`; AGENTS.md rule 11, VISION V69, V70, V79, V109). No other model; no pixels typed in code.
- **Non-living assets:** the autonomous pipeline of AGENTS.md rule 13 applies (batch, slot map, process, integrate, log in `docs/ASSET_MANIFEST.md`, verify in context). The user still approves every asset (rule 6).
- **No animation** in these frames (rule 12): a cliff and a ramp are still.
- **Style:** `docs/ART_STANDARD.md` and `docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md`: flat top-down 3/4 view, HD pixel art, 1 art pixel = 1 screen pixel on the 48 px grid, palette `art/palette/uf.hex`, alpha 0 or 255, crisp edges. Raw generations stay in `art/raw/`, masters in `art/masters/`.
- **Checks before delivery:** `tools/art_check.js --native` and `tools/originality_check.js`.
- **The black cap is not art.** The engine fills the upper 48 px of every cliff frame with `#0a0a10` and a 2 px `#121218` line along its top (both inside the convention's `#08080C..#121218`). Do not paint a cap, a grass lip or a rock top into the sheets below; it would never be shown.

## 3. Exactly what the engine reads (and the placeholders it reads today)
All three live in sheets that already exist in the vertical-world plan (`docs/handoffs/HANDOFF_vertical.md` §3), so nothing new has to be wired.

| AR | Sheet and slot | What the engine draws from it | Placeholder today |
|---|---|---|---|
| AR-2100 rock cliff face | `game/img/tilesets/UF_Levels_A4.png` (A4, 768×720), **side kind 8**: the 96×96 block at x 0–95, y 144–239, RMMZ wall-side layout (24 px quarters) | Each 48×48 face is the block's **top quarter row (y 144–167) stacked over its bottom quarter row (y 216–239)**, taking columns by the cliff's neighbours: column 0 (x 0–23) = left end, columns 1–2 (x 24–71) = middle, column 3 (x 72–95) = right end (RMMZ wall-autotile shapes 10 middle, 11 left end, 14 right end, 15 single). The middle rows y 168–215 are not shown by the cliff; draw the whole block as a normal RMMZ wall side anyway. The same slot is AR-1200's side: one delivery serves both the ground cliffs and the cave walls on -1/-2 | `Dungeon_A4` kind 1 "Wall B (Rock Cave)" side, x 96–191, y 144–239, tint `#8c8c9c` |
| AR-2101 soil cliff face | the same sheet, **side kind 9**: x 96–191, y 144–239 | As AR-2100, for solid cells whose material is soil (dug earth refilled, soil banks). Same slot as AR-1201's side | `Dungeon_A4` kind 0 "Wall A (Dirt Cave)" side, x 0–95, y 144–239, tint `#b0a090` |
| AR-2102 ground ramp | `game/img/tilesets/UF_Levels_B.png` (B, 768×768), **tile 4**: x 192–239, y 0–47 (the `ramp_up` look, AR-1211) | One 48×48 frame drawn over the ground tile of every ramp cell of the ground, under units and overlays. Opaque (as the vertical spec says for ramps). One look for all four directions: the engine doesn't pick a direction yet | `Dungeon_A5` tile 43 "Stairs A (Dirt Cave)" |

Also drawn on the ground from the same B sheet: **stairs down** at the back of every cave mouth (tile 2, AR-1209; placeholder `Dungeon_B` tile 10).

## 4. The look
- **Rock face (AR-2100):** a natural cliff of weathered grey stone as seen from the south in the 3/4 view: rough horizontal strata and fractures, a few ledges, darker toward the foot where it meets the ground, light from the upper left. It must read as rock that belongs to the hill, not masonry, not a wall of bricks, not wood. The left-end and right-end columns close the cliff with a rounded, broken edge; the middle columns tile seamlessly side by side. Its brightest tone stays darker than the ground kinds beside it (meadow, snow, sand), so the cliff line reads at zoom 1/3 and at night.
- **Soil face (AR-2101):** the same shape in packed brown earth with roots and pebbles; clearly different from AR-2100 by value and hue.
- **Ground ramp (AR-2102):** a rough slope of earth and broken stone rising toward the hill: lighter at the top edge, darker at the foot, no stair treads (vertical spec: "Ramps show no treads"). It has to read on any ground kind next to it, so no grass is painted into it.
- **Readability test:** a black cap line on top, the face below, the valley ground in front: the cliff must read as the edge of a raised block of land at 1× and at 1/3.

## 5. Review renders (with the delivery)
- `art/review/UF_NaturalCliff_review.png`: 8 frames of 48×96 in one row (384×96): rock single, left end, middle, right end; soil single, left end, middle, right end; each with the flat `#0a0a10` cap on its upper 48 px exactly as the engine draws it.
- `art/review/UF_GroundCliff_scene.png`: a 10×6-cell scene at 1× (480×288): a hill of `peak_rock` top-left, a stepped cliff edge of 6 frames, one ramp frame at the foot, meadow ground in front; and the same at 1/3.

## 6. How it plugs in (no code changes)
1. Put the sheets in `game/img/tilesets/` with the names above; write a note under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.
2. Claude Code checks them (ART_STANDARD §8) and adds the catalog's `levels.look` entries in `game/data/UF_WorldCatalog.json` (with the RMMZ editor closed): `"rock": { "sheet": "UF_Levels_A4", "slot": "A4", "kind": 0 }`, `"soil": { "sheet": "UF_Levels_A4", "slot": "A4", "kind": 1 }`, `"ramp_up": { "sheet": "UF_Levels_B", "slot": "B", "tile": 4 }` (no tints). Today the catalog has no `levels` section and the engine uses its built-in placeholders.
3. At the next boot UF_Levels composes its runtime sheets from those entries; the ground cliffs, the cave walls on -1/-2 and the ground ramps all switch at once. World generation is untouched: where the hills are comes from the seed (UF_Levels' surface heights), not from `UF_WorldCatalog.json`, so no worldgen entry changes.
4. Check in context: `node tools/test_volumetric_terrain_column.js` (the frame contract: 48 × 96, cap colours) and the in-game suite `natural_walls` (`ground_cliff_render`, screenshot `natural_walls.ground_cliff_z0.png`, run on a snapshot copy, `docs/systems/UF_Test.md`).

## 7. Nano Banana Pro prompt (AR-2100 and AR-2101 on one canvas)
```
Pure 2D top-down 16-bit pixel art in the Project DEUS Western pixel grimdark style (FF5/FF6 low-fantasy tactical RPG standard).
Cel shaded with 3-4 distinct tones per material. Light from upper-left (135 degrees). Crisp pixel edges, selective deep
charcoal contour outlines, zero gradients, zero blur, zero anti-aliasing. Palette art/palette/uf.hex. No isometric skew.

[GRID SPECIFICATION]
Sheet size: 768x384 px on a flat #FF00FF background (4x scale of two 96x96 RMMZ A4 wall-side blocks).
Two blocks of 384x384, side by side. Each block is a 4x4 grid of 96x96 quarters (24 px quarters at 1x).

[SLOT ASSIGNMENT MAP]
Block 1 (x 0-383): natural grey rock cliff face, RMMZ wall-side autotile. Columns: left end, middle, middle, right end.
  Top quarter row = the cliff's upper face under the lip; bottom quarter row = the cliff's foot meeting the ground.
  Stacking the top row directly over the bottom row must make one complete 48 px tall cliff face.
Block 2 (x 384-767): the same cliff in packed brown earth with roots and pebbles.

[CONTENT RULES]
Natural weathered rock with horizontal strata and fractures, a few ledges, darker toward the foot. Not masonry, not bricks,
not wood planks. No black cap, no grass lip, no top surface: the face only. Middle columns tile seamlessly left to right.
```
Downscale by exactly 4 with nearest neighbour, snap to `art/palette/uf.hex` (the art direction spec names `tools/clean_palette.js`, which is not in `tools/` on 2026-09-24: name the palette step you used in the delivery note), place block 1 at x 0–95, y 144–239 and block 2 at x 96–191, y 144–239 of `UF_Levels_A4.png` (the rest of the sheet per AR-1200/AR-1201). AR-2102 goes on the B-sheet batch of the vertical plan (tile 4).
