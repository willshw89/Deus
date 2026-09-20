# HANDOFF: art for the five-level vertical world (AR-1200 to AR-1219)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-19 · **Feature:** VISION V80, `docs/design/VERTICAL_WORLD.md` · **Requests:** AR-1200 to AR-1219 in `docs/ASSET_REQUESTS.md`

## What the feature does, and what is built today
The world becomes five persistent 256×256 levels at the same x,y: `-2`, `-1`, Ground, `+1`, `+2` (VERTICAL_WORLD §1). One level is drawn at a time. The player moves the view up and down, and people dig down (mine, channel), build up (floors, stairs, ramps, roofs) and walk between levels on stairs and ramps (§3.3, §5, §7). Every cell has a shape (`solid`, `floor`, `open`, `ramp`, `stairUp`, `stairDown`, `stairBoth`) and a material (§3.2).

### Layer Guidelines (VISION V117):
- **Z-2: The Deep Layer:** Blacks, dark blues, glowies (bioluminescence, glowing mushrooms, radiant crystal clusters, luminescent cave moss, aether fissures), dark purples. Abyssal subterranean depths in perpetual darkness lit only by eerie ambient bioluminescence.
- **Z-1: The Subterranean Layer:** Browns, greys, slate, packed earth, rough-hewn stone, dark shale. Mineable ore veins (iron, copper, gold, coal), excavated halls, natural cavern pockets, early dwarven settlements, subterranean farming (mushrooms, roots).
- **Z=0: Overland Biomes:** Full natural surface biomes (meadows, mixed forests, taiga/snow, arid deserts, wetlands/swamps, coastlines). Sunlight and weather cycles, wildlife herds, flora, trees, settler camps, surface agriculture, natural cave entrances descending into Z-1.
- **Z=+1 and Z=+2: Elevated / Vertical Layering:** **ONLY built up** (multi-story colonist architecture, second floors, roofs, watchtowers, defensive battlements) OR **Additional Z layers of cliffs/mountains etc** (cliffs, plateaus, mesa tops, mountain slopes, highlands, peaks). Open sky/air everywhere else.

**Status on 2026-09-19:** the engine for this is being written now: `UF_Levels.js`, claimed in `docs/STATUS.md` → In progress, 13:20. None of it is in `game/` yet. Until it lands, **nothing on this list is drawn in the game.** The stock RPG Maker MZ placeholders in §2 are the ones the engine will draw first (VISION V9, user 2026-09-19: "Feel free to use duplicate RMMZ assets for these"). Your art replaces them.

Make art only. Don't edit code, tools, or `game/data/` (AGENTS.md → Two agents). Put your work under `art/`. Put the finished sheets in `game/img/tilesets/` under the names in §3. When a sheet is ready, write a note under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`. Claude Code checks it and switches the catalog to it.

## 1. Rules that apply to every asset here
- **Style:** `docs/ART_STANDARD.md`, meaning HD pixel art in the style of Final Fantasy VI, in the flat 3/4 top-down view. Ground and floors are seen from straight above, with no lean, no isometric view and no perspective. 1 art pixel = 1 screen pixel on the 48 px grid, using every pixel. Palette `art/palette/uf.hex`. Alpha is 0 or 255 only. **No pure black** (F5): holes and shafts use the palette's darkest blue-black. Light comes from the upper left.
- **Generator: Google Nano Banana II exclusively** (AGENTS.md Rule 11, VISION V69, V70, V79, V109). All generation tasks must utilize Google Nano Banana II (`generate_image`, model id `gemini-3.1-flash-image`). No other model is permitted. Draw on a 4× canvas where one 48 px cell is 192×192, on a flat magenta `#FF00FF` background. Save the raw output unmodified in `art/raw/`. Every prompt carries the RMMZ format of its sheet (V70, `docs/RMMZ_ASSET_SPEC.md`). A ready prompt is in §5.
- **Animation: Sprite frames only; NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108). Animated water, cave glints, and hazards must have their animations delivered as discrete sprite frames; no programmatic distortion, squashing, or shader warps.
- **Checks before delivery:** `tools/art_check.js --native` and `tools/originality_check.js` both pass. Then do the review renders in §4. The user approves every asset (AGENTS rule 6). Nothing counts as done until the user approves it.

- **Readability is the job.** Rock, soil, natural floor, dug floor, built floor, open air and holes must be clearly different at zoom 1× and at the farthest zoom (1/3). They also must stay different at night (UF_DayNight darkens the map). Check value (light or dark) first and hue second.
- **Autotiles must work in all 47 shapes** (A1, A2, A4). The engine picks each cell's shape from its neighbours, the same way the RMMZ editor does. A block that only looks right as a solid fill breaks along every tunnel edge.
- **Sheet sizes, measured from the stock files on 2026-09-19:** A1 768×576, A2 768×576, **A4 768×720**, B 768×768. `docs/RMMZ_ASSET_SPEC.md` §3 lists A4 (and A3, which measures 768×384) as 768×576, which is wrong. This was reported to Claude Code's lead on 2026-09-19 and isn't corrected yet. Use 768×720 for A4.

## 2. The placeholders the engine will draw first
Each one was chosen by opening a crop of the stock sheet. A tint is a multiply colour. Tiles on the tilemap can't be tinted per tile, so the engine either bakes the tint into a runtime copy of the sheet or draws the tile as a tinted sprite, the way `UF_Objects` draws tile objects. Block positions are pixel rectangles in the stock PNG.

| AR | What | Stock placeholder | Where in the stock sheet | Tint |
|---|---|---|---|---|
| AR-1200 | Natural solid rock (top) | `Dungeon_A4` kind 1 "Wall B (Rock Cave)", tile 5936 | top block x 96–191, y 0–143; side x 96–191, y 144–239 | `#8c8c9c` (dark slate) |
| AR-1201 | Soil, solid (top) | `Dungeon_A4` kind 0 "Wall A (Dirt Cave)", tile 5888 | top x 0–95, y 0–143; side x 0–95, y 144–239 | `#b0a090` |
| AR-1202 | Cave floor (natural) | `Dungeon_A2` kind 8 "Ground C (Rock Cave)", tile 3200 | x 0–95, y 144–287 | none |
| AR-1203 | Mined-out floor, stone / soil | `Dungeon_A2` kind 10 "Dark Ground C (Rock Cave)", tile 3296 / kind 2 "Dark Ground A (Dirt Cave)", tile 2912 | x 192–287, y 144–287 / x 192–287, y 0–143 | none |
| AR-1204 | Built wooden floor, upper level | `Inside_A2` kind 8 "Ground E (Wood Floor Border)", tile 3200 in the Inside set | x 0–95, y 144–287 | none |
| AR-1205 | Built stone floor, upper level | `Inside_A2` kind 1 "Ground B (Stone Floor Tile)", tile 2864 in the Inside set | x 96–191, y 0–143 | none |
| AR-1206 | Open air (upper levels) | `Outside_A5` tile 19 "Snow A" (flat white), tile 1555 | x 144–191, y 96–143 | `#6f8fb8` (flat sky blue) |
| AR-1207 | Edge of a hole or channel | `Dungeon_A2` kind 6 "Hole I (Stone Floor)", tile 3104; transparent round the hole, drawn over the floor | x 576–671, y 0–143 | none |
| AR-1208 | Stairs up | `Dungeon_B` tile 2 "Stairs A (Up)" | x 96–143, y 0–47 | none |
| AR-1209 | Stairs down | `Dungeon_B` tile 10 "Stairs A (Down)" | x 96–143, y 48–95 | none |
| AR-1210 | Stairs both ways | `Dungeon_A5` tile 83 "Stairs K (Stone)", tile 1619 | x 144–191, y 480–527 | none |
| AR-1211 | Ramp up (the ramp cell) | `Dungeon_A5` tile 43 "Stairs A (Dirt Cave)", tile 1579 | x 144–191, y 240–287 | none |
| AR-1212 | Ramp down (the top of a ramp, seen from the level above) | same tile as AR-1211 | same | `#6a6a7a` (darker) |
| AR-1213 | Ladder: foot / top | `Dungeon_B` tile 5 "Wood Ladder" / tile 29 "Hole B (Wood Ladder)" | x 240–287, y 0–47 / x 240–287, y 144–191 | none |
| AR-1214 | Iron vein in rock | `Dungeon_B` tile 32 "Gravel A (Dirt Cave)" drawn over AR-1200 | x 0–47, y 192–239 | `#e07050` (rust) |
| AR-1215 | Copper vein in rock | same tile as AR-1214, drawn over AR-1200 | same | `#50e0a8` (green) |
| AR-1216 | Gold vein in rock | same tile as AR-1214, drawn over AR-1200 | same | `#ffff50` (yellow) |
| AR-1217 | Gems in rock | `Dungeon_B` tile 37 "Small Crystals" drawn over AR-1200 | x 240–287, y 192–239 | none |
| AR-1218 | Underground pool | `Dungeon_A1` kind 10 "Water D (Rock Cave)", tile 2528 | 3 frames: x 0–287, y 432–575 | none |
| AR-1219 | Roof / ceiling marker | `Outside_A3` kind 4 "Roof E (Wood)", tile 4544 | x 384–479, y 0–95 | none |

What the crops showed: the tinted rock is a dark slate mass that stands out from the pale cave floor. The dug-stone floor is a shade darker and greyer than the natural cave floor, so a dug tunnel is visible but the difference is small. Your art should widen it. The tinted flecks read as rust, green and gold on the rock. The small crystals read as gems. Two of the stock tiles contain pure black #000000, which the final art must not (F5): the hole (`Dungeon_A2` kind 6, 6,737 pixels counted) and the ladder top (`Dungeon_B` tile 29, 385 pixels). The stairs-down tile has none.

## 3. What to make: files, slots and the look of each
Four new sheets in `game/img/tilesets/`. Leave unused slots fully transparent. Keep masters and sidecars for each asset in `art/masters/lvl_<name>.png` and `.json`. Keep the 4× originals in `art/raw/lvl_<name>.png`.

### `UF_Levels_A4.png`: A4, 768×720 (solid cells)
The A4 layout: for kind k, `tx = k % 8`. Top blocks (96×144, the same piece layout as A2) are kinds 0–7 at y 0–143. Side blocks (96×96, the RMMZ wall-side layout) are kinds 8–15 at y 144–239.
- **Kind 0 / 8: natural rock (AR-1200).** The flat top of undug stone, seen from above. Blocky, fractured slabs with dark joints, in a cool grey slate ramp of 4–5 tones. Its **brightest tone is darker than the middle tone of the cave floor** (kind 0 of the A2 sheet). Edge pieces get a dark outline, with a 2 px lighter lip on the top and left, so tunnel walls show at 1/3 zoom. The side block is a rough rock face 48 px tall, darker toward the bottom. The engine plans to draw only the top. It may later draw the side under solid cells that have open floor to the south, so the side block must still be real.
- **Kind 1 / 9: soil (AR-1201).** The top of a mass of packed earth and clay: warm brown clods, pebbles, a few pale root threads. Same edge treatment as rock. It must be told apart from rock by hue (warm against cool), and from the dug soil floor by being darker and coarser.

### `UF_Levels_A2.png`: A2, 768×576 (floors, air, holes, roof)
Kind k is the 96×144 block at x = (k % 8)·96, y = ⌊k / 8⌋·144. The top-left 48 is the lone-cell piece, the top-right 48 is the inner corners, and the lower 2×2 is the edges and centre.
- **Kind 0: cave floor (AR-1202).** Natural uneven stone floor: pale grey-beige slabs, hairline cracks, grit. Keep it quiet enough that units, items and stance squares stay legible on it.
- **Kind 1: dug stone floor (AR-1203a).** Rock that a pick has just cut: flatter than kind 0, with chisel and pick marks, a few chips, cooler and a clear step darker than kind 0.
- **Kind 2: dug soil floor (AR-1203b).** Trodden earth with spade marks and pebbles, lighter than soil (A4 kind 1).
- **Kind 3: wooden deck, upper level (AR-1204).** The plank floor `floor_wood` from AR-300 / `HANDOFF_floors_doors.md`. Reuse its interior once the user approves it. **Only the edge pieces differ:** they show the end of a raised floor, with board ends or a joist edge and a 3–4 px dark underside strip along the south edge, so it reads as a floor with a drop beyond it. The AR-300 floor's edges are a transition to dirt; this one's are not.
- **Kind 4: stone deck, upper level (AR-1205).** The `floor_stone` flagstones from AR-300, with the same kind of raised-edge pieces: slab edges with a visible thickness strip.
- **Kind 5: open air (AR-1206).** What you see on `+1` and `+2` where nothing is built. A calm, mid-value sky-blue haze with a very faint speck or cloud texture that doesn't visibly repeat every 48 px. It must be plainly "not a floor", and it must not compete with floors, units or markers. Its edge pieces darken slightly where open air meets anything built. **It must also work at about 50% opacity:** the engine may draw it over a dimmed view of the level below for planning (VERTICAL_WORLD §8). So no dark outlines that would read as walls. Entities on the level below are shown there, but you can't interact with them.
- **Kind 6: hole or channel edge (AR-1207).** Transparent (alpha 0) everywhere outside the hole. It is drawn over whatever floor is in the cell: cave floor, grass, or a wooden deck. The centre is the drop to the level below, in the palette's darkest blue-black. The rim is a broken floor edge, a rough lip of rock or earth 6–10 px wide in 2–3 tones, lit from the upper left.
- **Kind 7: roof (AR-1219).** A built roof seen from the level above: wooden shingles in strong rows, so it reads as a roof and not a floor. The engine may also draw it at 25–35% opacity over the cells of the level below that have a floor or roof above them (the ceiling marker), so the rows must hold up at low opacity. No fine noise.

### `UF_Levels_B.png`: B, 768×768 (connectors and veins; 48×48 tiles)
Tile i sits at x = ((⌊i / 128⌋ % 2)·8 + i % 8)·48, y = ⌊(i % 128) / 8⌋·48. That's the same formula `UF_Objects` uses. **Tile 0 stays fully transparent** (RMMZ treats B tile 0 as "no tile"). Connectors are drawn over the cell's floor, so leave the pixels transparent wherever the floor should show.
- **1: stairs up (AR-1208).** A short stone flight rising toward the top (north) of the cell: 4–5 treads getting lighter as they rise, with side stringers. It must read as "goes up" by its silhouette at 1×.
- **2: stairs down (AR-1209).** A framed opening in the floor with treads going down into darkness toward the north, getting darker as they descend, and a stone lip round the opening.
- **3: stairs both ways (AR-1210).** A stairwell: a flight rising on the left half and a flight descending into the opening on the right half. Tiles 1, 2 and 3 must be told apart by shape, not only by colour.
- **4: ramp up (AR-1211).** A smooth graded slope rising toward the north, earth or rock, lighter at the top, with a scuffed track. No treads. It must not read as stairs. Opaque.
- **5: ramp down, the top of a ramp (AR-1212).** The same slope seen from the level above as it falls away: a lip at the top edge, getting darker toward the bottom. Opaque.
- **6 / 7: ladder foot / ladder top (AR-1213).** At the foot, two wooden rails with rungs rising from the floor toward a square opening in the ceiling, whose shadow is at the top of the cell. At the top, a square hatch opening in the floor with the ladder's top rungs going down into darkness. The design has no ladder shape yet (VERTICAL_WORLD §3.3), so this one is Low priority.
- **8 / 9 / 10 / 11: iron / copper / gold / gem vein (AR-1214–1217).** Transparent overlays drawn on top of rock (A4 kind 0) and soil (A4 kind 1). Iron is rust-red and brown nodules with dark specks. Copper is a green mineral crust with orange-metal glints. Gold is bright yellow threads with white catchlights. Gems are 3–5 small faceted crystals in mixed colours set in the rock. Cover 30–50% of the cell, spread toward the edges, so that neighbouring vein cells join into one vein instead of a row of centred blobs.

### `UF_Levels_A1.png`: A1, 768×576 (underground water)
- **Kind 0: underground pool (AR-1218).** Three animation frames of a 96×144 A1 block side by side at x 0–287, y 0–143, which is the RMMZ position of A1 kind 0. RMMZ plays them in the order 0-1-2-1. Still, dark-blue cave water with a faint shimmer, and a rim of wet cave stone that matches A2 kind 0. The rest of the sheet stays transparent.

## 4. Review renders (in `art/review/`, open them before you report)
1. **Underground mock-up (-1):** a 9×9 field with a rock mass, a soil mass, a natural cave pocket, a dug tunnel through both, one iron vein and one gem vein, a pool, stairs up, stairs down, a ramp, and a hole. Show it at 3× and at 1×, and at 1× under a dark night tone.
2. **Upper-level mock-up (+1):** open air all round, a 4×3 wooden deck and a 3×3 stone deck with their edges, a roof, stairs down, a ladder top, and a hole in the deck. Also render one copy with open air at 50% over a ground-level grass render.
3. **Autotile sheet:** each A2 and A4 kind in a test pattern that uses every one of the 47 shapes (corners, edges, T joins, a lone cell, the interior).
4. **Person reference:** a settler standing on each floor kind at 1×, so the floors stay quiet behind a unit.

## 5. Ready prompt (paste Prompt 0's STYLE AND RULES block from `GENERATOR_PROMPTS.md` first, then this)
```text
IMAGE MODEL: Google Nano Banana II (gemini-3.1-flash-image) is mandatory for all generation tasks (AGENTS.md Rule 11, VISION V69/V70/V79/V109). No other model allowed. All animation must happen through sprite frames—NO AFTER-EFFECT ANIMATIONS (Rule 12, V108). Draw on a 4x canvas where one RPG Maker grid cell of 48x48 px is 192x192, even 4x4 pixel blocks, on a flat #FF00FF magenta background.


GROUP: vertical-world terrain for an RPG Maker MZ colony game with five stacked levels (two below ground, the ground, two above). Everything is seen from straight above in the flat 3/4 RPG view, HD pixel art in the style of Final Fantasy VI, light from the upper left, 3-5 flat tones per material, no gradients or blur, no pure black.

RMMZ FORMAT (the cleaning tool packs your output into these; docs/RMMZ_ASSET_SPEC.md):
- A4 wall-top autotile block (UF_Levels_A4.png, sheet 768x720): top 96x144 native (2x3 cells: lone piece, inner corners, then edges and centre) plus a 96x96 side block. Draw the 4x version: 384x576 top, 384x384 side.
- A2 floor autotile block (UF_Levels_A2.png, sheet 768x576): 96x144 native = 384x576 at 4x, same piece layout.
- B overlay tile (UF_Levels_B.png, sheet 768x768): one 48x48 cell = 192x192 at 4x, transparent (magenta) wherever the floor below should show.
- A1 water autotile (UF_Levels_A1.png, sheet 768x576): three 96x144 frames side by side = 1152x576 at 4x.

SUBJECT: <one asset from docs/handoffs/HANDOFF_vertical.md section 3, with its look paragraph pasted here>
Attach as references: the approved meadow tile (art/masters/meadow.png), the approved settler (art/masters/human_male_stand.png) for scale, and the stock placeholder crop named in section 2 (for the slot and role only; do not copy it).
```

## 6. Order of work
1. **Anchor pair first, alone:** rock (AR-1200) and cave floor (AR-1202) together, so the most important contrast is settled. Wait for the user's approval, then use the pair as a reference for everything else.
2. **Level switching and connectors (engine slices 1–2):** open air (AR-1206), hole edge (AR-1207), stairs up, down and both (AR-1208–1210), ramp up and down (AR-1211–1212).
3. **Digging and building (slice 3):** soil (AR-1201), dug floors (AR-1203), wooden and stone decks (AR-1204–1205, after AR-300's floors are approved), roof (AR-1219), ladder (AR-1213).
4. **Geology and water (slices 4–5):** veins (AR-1214–1217), pool (AR-1218).

## 7. How it plugs in (the plan so far; the engine isn't built yet)
- **Catalog (Claude Code's part of `game/data/UF_WorldCatalog.json`; you don't edit it):** a new `levels.look` section maps each look to its image. It starts on the stock placeholders from §2. For example:
  ```json
  "levels": { "look": {
    "rock":     { "sheet": "Dungeon_A4", "slot": "A4", "kind": 1, "tint": "#8c8c9c" },
    "stair_up": { "sheet": "Dungeon_B",  "slot": "B",  "tile": 2 },
    "vein_iron":{ "sheet": "Dungeon_B",  "slot": "B",  "tile": 32, "tint": "#e07050", "over": "rock" }
  } }
  ```
  The keys are `rock`, `soil`, `cave_floor`, `mined_stone`, `mined_soil`, `deck_wood`, `deck_stone`, `open_air`, `hole_edge`, `stair_up`, `stair_down`, `stair_both`, `ramp_up`, `ramp_top`, `ladder_foot`, `ladder_top`, `vein_iron`, `vein_copper`, `vein_gold`, `vein_gem`, `pool` and `roof_wood`. When your sheet is checked, Claude Code switches each key to your slot, for example `"rock": { "sheet": "UF_Levels_A4", "slot": "A4", "kind": 0 }`, and removes the tint.
- **Drawing:** the levels below ground are drawn with a runtime tileset built from these sheets, the same way `UF_Tiles` builds tileset 91 for the ground. Connectors, veins and the hole edge are drawn over the floor, as overlay tiles or tile sprites, so the same art works on every level. The ground level keeps its current tileset and draws only the overlays.
- **If the engine lands with different key names or slots,** Claude Code updates this handoff and the AR rows. The sheet names and slots in §3 are what you deliver to.
- **Your note, when you deliver:** the sheet file, which slot holds which AR, the review renders, and the check output. Write it under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`, and set the rows to `DELIVERED`.
