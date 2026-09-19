# Segment 13: ground tiles a (written 2026-09-18 by Claude Code)

The first eleven of the 22 ground kinds in `game/data/UF_WorldCatalog.json` → `groundKinds`, in the catalog's order (request AR-100): meadow, lush grass, dry grass, scrub soil, leaf litter, needle floor, jungle floor, tundra, snow, ice, sand. The other eleven (stony, red clay, bare rock, rock face, mud, swamp mud, dirt, blighted grass, flowering grass, ash, scree) are the ground tiles b segment. Today every one of them is drawn in code (`UF_GenGround_A2`, plugin `UF_Tiles.js`) from the catalog's placeholder `colors` and `edge` fields; those placeholder colours are not palette colours and are superseded by the ramps below. The only ground stand-in with a decoded source is the grass block of `game/img/tilesets/U7_Ground_A2.png` (flat ground shape 4 at 3×; sampled 2026-09-18: its five colours are palette indices 168–172, which is why the meadow ramp below is that ramp).

Ground is the one family that does not lean: it is the flat square grid seen from straight above, and every leaning object, unit and item in the other segments is drawn on top of it. So a ground tile has no top, south or east face, no baked shadow and no highlight direction; it is a calm, micro-textured field that never competes with what stands on it (ART_STANDARD §1 U1 and §4). What the engine does with it: it cuts each 96×144 block into 24×24 quarter tiles and composes the 47 autotile shapes of RPG Maker's A2 layout from them, so a kind's edge against any neighbouring kind shows as a ring, and biome borders read on the map (`docs/ASSET_INVENTORY.md` → Ground and water tiles).

## How to work this segment
1. Style: high-resolution micro-textured ground in the manner of the reference grass block, at native resolution (1 art pixel = 1 screen pixel at zoom 1). No 16×16 upscaling, no blur, no anti-aliasing. `docs/ART_STANDARD.md` is binding.
2. Projection: flat. Ground has no 2.5D lean; only the objects and units standing on it lean up-left at 45° (`docs/GUIDE_25D.md` §1). Keep the ground calm: fine grain, low contrast, nothing that reads as a shape a unit could stand behind.
3. Master: one 48×48 base tile per kind that wraps on both axes (column 47 continues into column 0, row 47 into row 0), laid 2 across and 3 down to fill a 96×144 A2 block, then the edge ring painted over it as each brief says. Deliver the block as `art/masters/<id>.png`. Every pixel is opaque: there is no magenta background and no alpha on a ground block.
4. Block layout (RPG Maker A2, at 48-px tiles): top-left tile (columns 0–47, rows 0–47) is the showcase tile with the ring all round; top-right tile (columns 48–95, rows 0–47) is the inner-corner tile with a notch at each of its four corners; the lower 2×2 square (columns 0–95, rows 48–143) has the ring on its outer border only and nothing on its internal seams at column 48 and row 96. The engine takes the interior of the lower square for the open field and its ring for edges, so the base tile must be seamless or every biome shows a grid.
5. Palette: `art/palette/uf.hex` only (every index below was checked against the file on 2026-09-18); aim for ≤ 32 colours per kind, the briefs use 6–9; 1-px micro-dither is the way to shade, never a gradient; no baked shadows.
6. Open the reference first: `game/img/tilesets/U7_Ground_A2.png` (its grass block, columns 0–95 and rows 0–143, is the yardstick for grain and contrast) and the composite `art/review/u7_square_composite.png` (the objects that will stand on the ground; the ground must sit under them, not fight them). They are references and development stand-ins: nothing copied from them ships.
7. Sidecar: `art/masters/<id>.json` with the AR-600 fields (frameWidth 48, frameHeight 48, anchor null because a tile has no anchor, facings [], animations {}) plus layer "ground" and slot n (the kind's index in `groundKinds`, given in each Deliver line).
8. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --type tileset art/masters/<id>.png` (the tool skips the sidecar for tilesets and its 3×-grid check does not apply to 48-native masters until it is updated; the palette and alpha checks do apply).
9. Export (ART_STANDARD §5 step 8, no scaling): Claude Code assembles the approved blocks into one 768×576 A2 sheet, 8 blocks per row in `groundKinds` order (slot n goes at column n mod 8, row n div 8, in pixels x = 96 × (n mod 8), y = 144 × (n div 8)), copies it to `game/img/tilesets/`, and switches `tilesets.surface.A2` in the catalog from `UF_GenGround_A2` to the sheet's name. Gemini does not edit `game/data/`.
10. Mark the AR-100 row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file names as blocks arrive; the user approves each kind before it ships (`art/APPROVALS.md`).
11. Order: meadow first (it is the "one ground tile" style anchor of ART_STANDARD §5 step 2 and the ground under the start area), then this file top to bottom; the two grass kinds and dry grass share one blade construction, the three forest floors one leaf construction, so settle each construction on its first kind and reuse it.
12. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-13_ground_tiles_a.md` and fix every FAIL before reporting.

---

### meadow — Meadow (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D objects and units draw on top of it, so the ground stays calm and micro-textured
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the grass block at columns 0–95, rows 0–143 (SHAPES.VGA flat ground shape 4 decoded at 3×; its five colours are palette 168–172; reference only, nothing copied ships), and `art/review/u7_square_composite.png` for the objects that will stand on it
- **Palette Ramps**: Grass 168 `#71864D` (sunlit blade tips), 169 `#5D7139` (lit blades), 170 `#4D5D28` (field), 171 `#415120` (shade between blades), 172 `#39451C` (deepest pockets); Dry tip 202 `#7D9600` (four pixels at most); Ring 173 `#313D18`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile (rows and columns 0–47) the field is 170 broken by 171 in an irregular 1-px micro-dither that covers about 40% of the tile, with no run of either colour longer than 4 px. Over it stand 24 to 28 short blades, each 1 px wide and 3 to 5 px tall and drawn straight up because the ground is flat, in 169 with a single 168 pixel at the top of each; no two blades touch, 6 to 8 single pixels of 172 sit in the pockets beneath them, and at most four blade tips are 202. The tile wraps: a blade cut by column 47 continues at column 0, one cut by row 47 continues at row 0, and the dither joins across both edges, so the tile lays 2 across and 3 down without a seam. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 173 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with an L-shaped notch of 173, 2 px thick and 6 px long along both edges, at each of its four corners (48,0), (95,0), (48,47) and (95,47); the lower square (columns 0–95, rows 48–143) has the same 2-px ring of 173 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and nothing on its internal seams at column 48 and row 96. Nothing else differs between the six tiles, there is no baked shadow or lit side, and no pixel is transparent.

#### Interaction / Transformed State Description:
"dig" (a right-click job in the engine, work 80, dropping a `stone` item 1 time in 4) turns the cell into `dirt`, which has its own brief and file in the ground tiles b segment; the engine then recomputes the autotile shapes of the cell and its eight neighbours from these blocks. At generation, cursed regions lay `cursed_grass` and blessed regions `blessed_grass` in place of meadow (their own briefs); that is a swap when the map is made, not a change in play. There is no other second state in the engine.

#### Readability Check:
At zoom ⅓ the meadow is the calm olive-green field, duller and greyer than the saturated lush grass, greener than the golden dry grass and without the lush grass's yellow flecks; its 173 ring shows only where a biome ends.

Deliver: art/masters/meadow.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/meadow.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 0). Slot 0 = column 0, row 0 of the assembled A2 sheet ("How to work this segment", line 9).

---

### tropical_grass — Lush grass (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D objects and units draw on top of it
- **Reference**: none decoded for lush grass; the nearest is the grass block of `game/img/tilesets/U7_Ground_A2.png` (SHAPES.VGA flat ground shape 4 at 3×; reference only, nothing copied ships), rebuilt here in the brighter ramp below
- **Palette Ramps**: Grass 200 `#86D200` (sunlit blade tips), 201 `#86B200` (lit blades), 241 `#45B645` (field), 242 `#189218` (shade between blades), 243 `#006D00` (deepest pockets); Seed head 49 `#EFEF61` (six single pixels at most); Ring 70 `#005100`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 241 broken by 242 in a 1-px micro-dither covering about 45% of the tile, denser than the meadow's, with no run longer than 4 px. Over it stand 26 to 30 blades, 1 px wide and 4 to 6 px tall (a step taller than the meadow's), in 201 with a single 200 pixel at the top of each; 8 to 10 single pixels of 243 sit in the pockets between them, and 4 to 6 single pixels of 49 are seed heads, never two adjacent and never on the ring rows or columns. The tile wraps on both axes so that blades and dither continue across column 47 → 0 and row 47 → 0. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 70 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 70 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 70 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
"dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours. At generation, cursed regions lay `cursed_grass` and blessed regions `blessed_grass` in place of lush grass (their own briefs); that is a swap when the map is made, not a change in play. No other second state in the engine.

#### Readability Check:
At zoom ⅓ this is the brightest, most saturated green ground on the map, with a faint yellow sparkle of seed heads; the meadow is olive and dull beside it and the jungle floor is dark green blotted with brown.

Deliver: art/masters/tropical_grass.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/tropical_grass.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 1). Slot 1 = column 1, row 0 of the assembled A2 sheet.

---

### dry_grass — Dry grass (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D objects and units draw on top of it
- **Reference**: none decoded for dry grass; the nearest is the grass block of `game/img/tilesets/U7_Ground_A2.png` (SHAPES.VGA flat ground shape 4 at 3×; reference only, nothing copied ships), rebuilt here in straw with bare earth showing
- **Palette Ramps**: Straw 3 `#F3DF79` (sun-bleached tips), 6 `#DBAE20` (lit blades), 7 `#C69618` (field), 8 `#B28210` (shade between blades); Dust 138 `#AA8659` (bare earth between the blades); Living blade 168 `#71864D` (five blades at most); Ring 9 `#9E690C`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 7 broken by 8 in a 1-px micro-dither covering about 35% of the tile, and by 6 to 8 small patches of 138, each 2 to 3 px across, where the earth shows through. Over it stand 22 to 26 blades, 1 px wide and 4 to 7 px tall, in 6 with a single 3 pixel at the top of each, and 4 or 5 further blades in 168 for the grass that is still living; no two blades touch, and none stands on a 138 patch. The tile wraps on both axes: blades and dither continue across column 47 → 0 and row 47 → 0, and a 138 patch cut by an edge continues on the other side. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 9 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 9 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 9 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
"dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours. At generation, cursed regions lay `cursed_grass` and blessed regions `blessed_grass` in place of dry grass (their own briefs); a swap when the map is made, not a change in play. No other second state in the engine.

#### Readability Check:
At zoom ⅓ dry grass is the golden ground, warmer and yellower than sand (pale and bladeless) and than scrub soil (tan with green tufts), and it keeps a few green threads that the sand never has.

Deliver: art/masters/dry_grass.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/dry_grass.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 2). Slot 2 = column 2, row 0 of the assembled A2 sheet.

---

### shrub_soil — Scrub soil (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D objects and units draw on top of it
- **Reference**: none decoded for scrub soil; the nearest is the dirt block of `game/img/tilesets/U7_Ground_A2.png` at columns 192–287, rows 0–143 (SHAPES.VGA flat ground shape 23 at 3×, whose grain is in palette 136–141; reference only, nothing copied ships), with the grass block's tufts added sparsely
- **Palette Ramps**: Soil 137 `#BA9A71` (lit grains), 138 `#AA8659` (field), 139 `#9A7141` (shade), 140 `#8A5D2D` (dark pockets); Scrub 168 `#71864D` (tuft tips), 169 `#5D7139` (tuft base); Pebble 152 `#AEA29A`; Ring 144 `#4D2D0C`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 138 broken by 139 in a 1-px micro-dither covering about 40% of the tile, with 10 to 14 single pixels of 137 as lit grains and 6 to 8 pockets of 140, each 2 to 3 px, in the hollows. Over it sit 5 to 7 tufts, each three 169 pixels in a row with one 168 pixel above the middle one, and 3 or 4 pebbles, each a 2×1 patch of 152 with a 140 pixel directly below it; tufts and pebbles never touch each other. The tile wraps on both axes so the dither, a pocket or a tuft cut by column 47 or row 47 continues on the opposite edge. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 144 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 144 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 144 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
"dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours. Cursed and blessed regions leave scrub soil as it is (it is in neither swap table). No other second state in the engine.

#### Readability Check:
At zoom ⅓ scrub soil is the tan ground flecked with small green tufts and pale pebbles: darker and browner than sand, less yellow than dry grass and without its blades, and lighter and greener than the plain brown dirt a dig leaves.

Deliver: art/masters/shrub_soil.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/shrub_soil.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 3). Slot 3 = column 3, row 0 of the assembled A2 sheet.

---

### forest_floor — Leaf litter (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D trees and units draw on top of it
- **Reference**: none decoded for leaf litter; the nearest is the dirt block of `game/img/tilesets/U7_Ground_A2.png` at columns 192–287, rows 0–143 (SHAPES.VGA flat ground shape 23 at 3×; reference only, nothing copied ships), darkened and strewn with leaves
- **Palette Ramps**: Litter 141 `#7D4D18` (lit leaf edges), 142 `#6D3D0C` (leaves), 143 `#5D350C` (field), 144 `#4D2D0C` (shade), 145 `#3D240C` (deep pockets and twigs); Fallen leaf 182 `#AE653D` (bright rim), 183 `#9E5124` (rust leaves); Ring 146 `#2D1C08`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 143 broken by 144 in a 1-px micro-dither covering about 40% of the tile, with 8 to 10 pockets of 145, each 1 to 2 px, in the hollows. Over it lie 14 to 18 leaves, each a rough oval 3 to 4 px long and 2 px wide, in 142 with one 141 pixel on its upper-left edge; 5 to 7 of them are instead 183 with a single 182 pixel on the upper-left edge, spread so no two rust leaves touch. Two or three twigs, 1-px lines of 145 between 5 and 7 px long at different angles, cross the field without touching a leaf. The tile wraps on both axes so a leaf, twig or pocket cut by column 47 or row 47 continues on the opposite edge. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 146 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 146 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 146 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
"dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours. At generation, cursed regions lay `ash` in place of leaf litter (its own brief); blessed regions leave it as it is. No other second state in the engine.

#### Readability Check:
At zoom ⅓ leaf litter is the warm brown ground with a scatter of oval flecks and a few rust spots, warmer and more blotched than the needle floor (olive-brown with fine diagonal strokes) and plainly brown beside the dark green jungle floor.

Deliver: art/masters/forest_floor.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/forest_floor.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 4). Slot 4 = column 4, row 0 of the assembled A2 sheet.

---

### needle_floor — Needle floor (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D pines and units draw on top of it
- **Reference**: none decoded for a needle floor; the nearest is the dirt block of `game/img/tilesets/U7_Ground_A2.png` at columns 192–287, rows 0–143 (SHAPES.VGA flat ground shape 23 at 3×; reference only, nothing copied ships), darkened to olive-brown and combed with short strokes
- **Palette Ramps**: Needle bed 204 `#515900` (lit needles), 205 `#3D4100` (field), 145 `#3D240C` (brown between the needles), 174 `#283114` (shade); Fresh needles 11 `#754504` (russet strokes), 184 `#8E3D0C` (the newest few); Cone 143 `#5D350C`; Ring 175 `#202410`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is an even 1-px checker micro-dither of 205 and 145, about half each, which reads as one olive-brown at zoom 1; 6 to 8 single pixels of 174 sit in the hollows. Over it lie 30 to 36 needle strokes, each 1 px wide and 3 to 4 px long, all running the same diagonal (one step down and one step right per pixel) and never touching, in 204; 8 to 10 of them are 11 and 3 or 4 are 184 for the freshly fallen needles. One cone, an oval of 143 3 px wide and 4 px tall with a 145 pixel at its lower end, sits away from the tile's edges. The tile wraps on both axes: a stroke cut by column 47 or row 47 continues on the opposite edge and the checker keeps its phase across the seam. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 175 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 175 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 175 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
"dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours. At generation, cursed regions lay `ash` in place of the needle floor (its own brief); blessed regions leave it as it is. No other second state in the engine.

#### Readability Check:
At zoom ⅓ the needle floor is the darkest olive-brown ground, combed with a fine diagonal grain and dotted russet, where leaf litter is warmer and blotched and the jungle floor is green.

Deliver: art/masters/needle_floor.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/needle_floor.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 5). Slot 5 = column 5, row 0 of the assembled A2 sheet.

---

### jungle_floor — Jungle floor (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D trees, ferns and units draw on top of it
- **Reference**: none decoded for a jungle floor; the nearest is the grass block of `game/img/tilesets/U7_Ground_A2.png` (SHAPES.VGA flat ground shape 4 at 3×; reference only, nothing copied ships), darkened and blotted with wet leaves and roots
- **Palette Ramps**: Litter 169 `#5D7139` (lit specks), 170 `#4D5D28` (field), 171 `#415120` (shade), 172 `#39451C` (deep pockets); Wet leaf 243 `#006D00` (glossy fallen leaves), 242 `#189218` (their lit edge); Root and soil 143 `#5D350C`; Ring 174 `#283114`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 170 broken by 171 in a 1-px micro-dither covering about 45% of the tile, with 12 to 16 single pixels of 169 as lit specks and 8 to 10 pockets of 172, each 1 to 2 px, in the hollows. Over it lie 10 to 12 wet leaves, each 4 to 5 px long and 2 to 3 px wide, in 243 with one 242 pixel on the upper-left edge, and 4 or 5 patches of bare soil in 143, each 2 to 3 px; two roots, 1-px lines of 143 between 6 and 8 px long with one bend each, run between the leaves without touching them. The tile wraps on both axes so a leaf, root or patch cut by column 47 or row 47 continues on the opposite edge. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 174 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 174 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 174 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
"dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours. At generation, cursed regions lay `cursed_grass` in place of the jungle floor (its own brief); blessed regions leave it as it is. No other second state in the engine.

#### Readability Check:
At zoom ⅓ the jungle floor is the dark wet green ground with glossy leaf blots and thin brown root lines; lush grass is far brighter and bladed, leaf litter is brown, and the needle floor is olive-brown with a diagonal grain.

Deliver: art/masters/jungle_floor.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/jungle_floor.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 6). Slot 6 = column 6, row 0 of the assembled A2 sheet.

---

### tundra — Tundra (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D lichen, bushes, boulders and units draw on top of it
- **Reference**: none decoded for tundra; the nearest is the grass block of `game/img/tilesets/U7_Ground_A2.png` (SHAPES.VGA flat ground shape 4 at 3×; reference only, nothing copied ships), rebuilt as a low grey-green mat without blades
- **Palette Ramps**: Lichen mat 164 `#CAD7B6` (pale frost patches), 165 `#B6C29A` (lit), 166 `#9EAE7D` (field), 167 `#8A9A61` (shade), 168 `#71864D` (deep pockets); Pebble 152 `#AEA29A`; Ring 169 `#5D7139`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 166 broken by 167 in a 1-px micro-dither covering about 40% of the tile, with 12 to 16 single pixels of 165 scattered as lit crumbs and 8 to 10 pockets of 168, each 1 to 2 px, in the hollows. Over it lie 6 to 8 pale patches of 164, each an irregular blob 3 to 5 px across with a 1-px rim of 165 along its lower and right sides, and 4 or 5 pebbles, each a 2×1 patch of 152 with a 168 pixel directly below it; there are no blades or strokes, so the mat stays lower and flatter than any grass. The tile wraps on both axes so a patch or pebble cut by column 47 or row 47 continues on the opposite edge. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 169 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 169 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 169 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
"dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours. Cursed and blessed regions leave tundra as it is (it is in neither swap table). No other second state in the engine.

#### Readability Check:
At zoom ⅓ tundra is the pale grey-green mat with lighter patches, lighter and greyer than the meadow, greener than snow and without the blades of any grass; next to ice it is the one that is not blue.

Deliver: art/masters/tundra.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/tundra.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 7). Slot 7 = column 7, row 0 of the assembled A2 sheet.

---

### snow — Snow (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D boulders, pines and units draw on top of it
- **Reference**: none decoded for snow; the nearest for grain and contrast is the grass block of `game/img/tilesets/U7_Ground_A2.png` (SHAPES.VGA flat ground shape 4 at 3×; reference only, nothing copied ships), rebuilt as a white crust with blue hollows
- **Palette Ramps**: Snow 15 `#FFFFFF` (crust glints), 118 `#EFEFEF` (lit crust), 192 `#F3F3FF` (field), 193 `#E7E7FF` (hollow), 194 `#DBDBFF` (hollow core), 225 `#B2D7F3` (deepest point of a hollow); Ring 226 `#71AEE7`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 192 broken by 118 in a 1-px micro-dither covering about 40% of the tile, with 10 to 14 single pixels of 15 as glints on the crust. Over it lie 5 to 7 hollows, each an irregular blob 4 to 6 px across in 193 with a 2 to 3 px core of 194 and one 225 pixel at the core's lower-right; no hollow touches another, and there are no blades, strokes or lines, so the snow reads as the smoothest ground in the set. The tile wraps on both axes so a hollow cut by column 47 or row 47 continues on the opposite edge and the dither keeps its phase across the seam. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 226 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 226 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 226 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
The engine lays snow on the cold cells of the `mountain` biome below its peaks (no biome has it as base ground). "dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours; there is no melt, no footprint and no cursed or blessed swap. No other second state in the engine.

#### Readability Check:
At zoom ⅓ snow is the one white ground, with only faint blue hollows; ice beside it is pale blue with dark crack lines, tundra is grey-green, and bare rock (ground tiles b) is grey.

Deliver: art/masters/snow.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/snow.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 8). Slot 8 = column 0, row 1 of the assembled A2 sheet.

---

### ice — Ice (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D boulders and units draw on top of it
- **Reference**: none decoded for ice; the nearest for grain and contrast is the grass block of `game/img/tilesets/U7_Ground_A2.png` (SHAPES.VGA flat ground shape 4 at 3×; reference only, nothing copied ships), rebuilt as a pale blue sheet with cracks
- **Palette Ramps**: Ice 225 `#B2D7F3` (field), 226 `#71AEE7` (shade), 192 `#F3F3FF` (lit facets), 15 `#FFFFFF` (glints); Crack 227 `#358EDB`; Ring 228 `#006DD2`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 225 broken by 226 in a 1-px micro-dither covering about 30% of the tile, sparser than any grass so the sheet reads as smooth. Across it run 3 or 4 cracks, 1-px lines of 227 between 10 and 16 px long, each with one or two bends of 60° to 120° and none crossing another; along the upper-left side of each crack sit 2 or 3 facets of 192, each 2×2 px, and 6 to 8 single pixels of 15 glint elsewhere on the field. The tile wraps on both axes: a crack cut by column 47 or row 47 continues on the opposite edge, so the cracks join into a network when the tile repeats. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 228 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 228 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 228 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
Ice is the ground of the `glacier` biome and the bed under the `ocean_arctic` biome's `icy` water (seen along its shore). "dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours; the engine allows the dig because ice has no `passable` flag, and there is no cracking, melting or cursed or blessed swap. No other second state in the engine.

#### Readability Check:
At zoom ⅓ ice is the pale blue ground veined with darker blue cracks; snow is white without lines, and the icy water next to it moves (an animated A1 kind of AR-101) while the ice does not.

Deliver: art/masters/ice.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/ice.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 9). Slot 9 = column 1, row 1 of the assembled A2 sheet.

---

### sand — Sand (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the U7 2.5D cacti, shrubs, bones and units draw on top of it
- **Reference**: none decoded for sand; the nearest is the dirt block of `game/img/tilesets/U7_Ground_A2.png` at columns 192–287, rows 0–143 (SHAPES.VGA flat ground shape 23 at 3×, whose lightest grains are palette 136–137; reference only, nothing copied ships), lightened to the ramp below
- **Palette Ramps**: Sand 1 `#FBF3CE` (sunlit ripple crests), 2 `#F7E7A6` (lit grains), 135 `#DBCAB2` (field), 136 `#CAB292` (shade), 137 `#BA9A71` (dark grains and pebble shade); Ring 138 `#AA8659`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is an even 1-px checker micro-dither of 135 and 2, about half each, which reads as one pale warm sand at zoom 1; 10 to 14 single pixels of 137 are scattered as dark grains. Over it run 3 or 4 ripple crests, 1-px lines of 1 between 8 and 12 px long with one gentle bend each, every crest followed one pixel below and to the right by a line of 136 of the same length; 3 pebbles, each a 2×1 patch of 136 with a 137 pixel directly below it, sit between the crests. The tile wraps on both axes: a crest cut by column 47 or row 47 continues on the opposite edge and the checker keeps its phase across the seam. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 138 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 138 at each of its four corners; the lower square (columns 0–95, rows 48–143) has the 2-px ring of 138 on its outer border only and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel.

#### Interaction / Transformed State Description:
Sand is the ground of the `desert_sand` biome and the bed under the `ocean_temperate`, `ocean_tropical` and `lake_salt` water (seen along their shores). "dig" (work 80, a `stone` item 1 time in 4) turns the cell into `dirt` (its own brief and file in the ground tiles b segment) and the engine reshapes the cell and its eight neighbours. Cursed and blessed regions leave sand as it is (it is in neither swap table). No other second state in the engine.

#### Readability Check:
At zoom ⅓ sand is the palest warm ground, smooth with faint ripple lines: dry grass beside it is golden and bladed, scrub soil is tan with green tufts, and snow is as pale but cold white with blue hollows.

Deliver: art/masters/sand.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/sand.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 10). Slot 10 = column 2, row 1 of the assembled A2 sheet.
