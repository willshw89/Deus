# Segment 14: ground tiles b (written 2026-09-18 by Claude Code)

The second half of the A2 ground sheet: the eleven ground kinds at `groundKinds` indices 11–21 of `game/data/UF_WorldCatalog.json`, in catalog order (request AR-100, with AR-120 for the two region grasses). The first half (meadow, lush grass, dry grass, scrub soil, leaf litter, needle floor, jungle floor, tundra, snow, ice, sand) is the ground tiles a segment (SEG-13); the same A2 rules apply here and are restated below so this file works on its own. Ground is the flat plane everything else stands on and never leans, with one exception: the impassable rock face (`peak_rock`) carries cliff faces on its south and east rims so a peak reads as a wall from above. Every fact about biomes, region swaps and the dig job comes from the catalog, from the plugins `UF_WorldGen.js`, `UF_Tiles.js` and `UF_Interact.js`, and from `docs/ASSET_INVENTORY.md` (rows `UF_GenGround_A2#3344` to `#3824`); today all eleven kinds are drawn in code (`UF_GenGround_A2`) from the catalog's placeholder colours, which are not palette colours and are superseded by the ramps below.

## How to work this segment
1. Style: high-resolution micro-textured ground in the manner of the reference grass block, at native resolution (1 art pixel = 1 screen pixel at zoom 1); no 16×16 upscaling, no blur, no anti-aliasing; `docs/ART_STANDARD.md` is binding.
2. Projection: flat. Ground has no 2.5D lean; the objects and units standing on it lean up-left at 45° (`docs/GUIDE_25D.md` §1), so the ground stays calm: fine grain, low contrast, nothing that reads as a shape a unit could stand behind. The rock face is the one kind that borrows the lean: its base tile is the top of the rock and its south and east rims are cliff faces (its brief says exactly where).
3. Master: one 48×48 base tile per kind that wraps on both axes (column 47 continues into column 0, row 47 into row 0), laid 2 across and 3 down to fill a 96×144 A2 block, then the edge ring painted over it as each brief says. Deliver the block as `art/masters/<id>.png`; every pixel is opaque, so there is no magenta background and no alpha on a ground block.
4. Block layout (RPG Maker A2, at 48-px tiles): the top-left tile (columns 0–47, rows 0–47) is the showcase tile with the ring all round (autotile shape 47: the editor's palette thumbnail, never placed by the world generator or the dig job, which use shapes 0–46); the top-right tile (columns 48–95, rows 0–47) is the inner-corner tile with an L-shaped notch at each of its four corners (each notch is the concave corner shown where a foreign cell touches only diagonally); the lower 2×2 square (columns 0–95, rows 48–143) has the ring on its outer border only and nothing on its internal seams at column 48 and row 96. The engine cuts every block into 24×24 quarters and composes each map cell from four of them, so the base tile must be seamless or every biome shows a grid.
5. Ring: a kind meets ANY other kind with the same ring, so it is drawn in the kind's own darkest colour, 2 px wide (rows 0–1, 46–47, columns 0–1, 46–47 of the showcase tile; rows 48–49, 142–143, columns 0–1, 94–95 of the lower square; 2 px thick and 6 px long along both edges of each inner-corner notch), and the 2 px inside it carry the texture thinned (fewer stones, blades or clods) where a brief says so; never a black outline, never a colour borrowed from another kind.
6. Palette: `art/palette/uf.hex` only (every index below was checked against the file on 2026-09-18); at most 32 colours per kind, and these briefs use 6–9; 1-px micro-dither between adjacent ramp steps is the way to shade, never a gradient; no baked shadows of objects (the engine draws those).
7. Open the reference first: the stand-in sheet `game/img/tilesets/U7_Ground_A2.png` (each brief names the block in it that is nearest, and its rows are grass, sand, loam and rock families) and the reference squares in `art/u7_reference_squares/` for grain and shading, then `art/review/u7_square_composite.png` once for the objects that will stand on the ground. They are references and development stand-ins: nothing copied from them ships.
8. Objects are not in the tile: reeds, boulders, dead trees, bones, plants and dropped items are drawn by their own layers on top of the ground, so keep every tile lower in contrast than the things that stand on it (each brief lists what those are).
9. Sidecar: `art/masters/<id>.json` with the AR-600 fields (frameWidth 48, frameHeight 48, anchor null because a tile has no anchor, facings [], animations {}) plus layer "ground" and slot n, the kind's index in `groundKinds`, given in each Deliver line; the same form as the ground tiles a segment.
10. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --type tileset art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated; the palette and alpha checks apply).
11. Export (`docs/ART_STANDARD.md` §5 step 8, no scaling): Claude Code assembles the approved blocks into one 768×576 A2 sheet, 8 blocks per row in `groundKinds` order (slot n at column n mod 8, row n div 8, in pixels x = 96 × (n mod 8), y = 144 × (n div 8)), copies it to `game/img/tilesets/` and switches `tilesets.surface.A2` in the catalog from `UF_GenGround_A2` to the sheet's name; Gemini does not edit `game/data/`. Then mark the request row DELIVERED in `docs/ASSET_REQUESTS.md` with the backticked file name (AR-100, or AR-120 for `cursed_grass` and `blessed_grass`); the user approves each kind before it ships (`art/APPROVALS.md`).
12. Order: after the meadow anchor and the rest of the ground tiles a segment, then this file top to bottom (the three grey kinds stony, bare rock and scree share one stone construction and must be settled side by side; the two muds share one blob construction); verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-14_ground_tiles_b.md` and fix every FAIL before reporting.

---

### stony — Stony ground (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the only relief is 1 px of light on each pebble's upper-left and 1 px of shadow on its lower-right
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the grey cobble block (fourth block of the top row; its builder `tools/build_master_u7_chipsets.js` took SHAPES.VGA flat shape 1 for it), and `art/u7_reference_squares/u7_boulder_48.png` (shape 342) for the grain of pale stone; reference only, nothing copied ships
- **Palette Ramps**: Grit 152 `#AEA29A` (lit), 153 `#9E928A` (field), 154 `#8E8279` (shade), 155 `#7D7169` (hollows); Pebbles 151 `#BEB2AE` (tops), 157 `#615551` (undersides); Cracks 158 `#514945`; Ring 158 `#514945`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile (rows and columns 0–47) the field is 153 broken by 152 in a 1-px micro-dither over the upper-left third and by 154 over the lower-right third, each covering about 35% of its third with no run longer than 4 px, so the plane reads lit from the upper left without a gradient. Nine to twelve flat pebbles of 3–5 px, irregular and never square, lie on it with at least 3 px between any two, each 151 with a 1-px 157 line on its lower and right sides and an open upper-left edge. A net of 1-px crack lines in 158 runs roughly diagonally, three or four segments of 6–14 px (for example from (4, 30) to (16, 18) and from (26, 44) to (40, 32)), and 155 fills a 2-px hollow beside each of the two largest pebbles. The tile wraps: a pebble or crack cut by column 47 continues at column 0 and one cut by row 47 at row 0, and the dither joins across both edges. In the 96×144 block the showcase tile (columns 0–47, rows 0–47) carries a 2-px ring of 158 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47 with no pebble in the 2 px inside it; the inner-corner tile (columns 48–95, rows 0–47) is the plain texture with an L-shaped notch of 158, 2 px thick and 6 px long along both edges, at each of its four corners (48,0), (95,0), (48,47) and (95,47); the lower square (columns 0–95, rows 48–143) has the same 2-px ring of 158 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and nothing on its internal seams at column 48 and row 96. No baked shadow, no lit side beyond the pebbles' 1 px, no transparent pixel; the rock desert's boulders, loose stones, ironstone, copper outcrops, cacti and desert shrubs are objects drawn on top.

#### Interaction / Transformed State Description:
No second state in the engine: a ground kind has no actions and no `regrow`, and stony ground is the floor of the rock desert biome (`desert_rock`) only, never swapped by cursed or blessed regions. The one change a cell of it can undergo is the dig job (a right-click job, work 80): the cell becomes `dirt` (its own brief in this file), the autotile shapes of it and its eight neighbours are re-derived from these blocks, and a `stone` item drops 1 time in 4. Its 47 autotile shapes against every neighbouring kind are the engine's only variants of this block.

#### Readability Check:
At zoom ⅓ a pale warm grey plane with dark crack lines and paler pebble specks: lighter and warmer than the neutral bare rock, without the packed lumps of scree, the charred stubs of ash or the cliff bands of the rock face.

Deliver: art/masters/stony.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/stony.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 11). Slot 11 = column 3, row 1 of the assembled A2 sheet (x 288–383, y 144–287).

---

### red_clay — Red clay (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; each clay layer has a 1-px lit lip on its upper side, nothing more
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the red clay block (fourth block of the second row; its builder `tools/build_master_u7_chipsets.js` took SHAPES.VGA flat shape 144 for it), and `art/u7_reference_squares/u7_ironstone_48.png` (shape 341) for the rusty layered grain; reference only, nothing copied ships
- **Palette Ramps**: Clay 181 `#BE825D` (lit lips), 182 `#AE653D` (field), 183 `#9E5124` (layer lines), 184 `#8E3D0C` (drying cracks); Deep 185 `#7D2D00` (crack junctions); Dust 180 `#CE9A7D` (1-px flecks); Ring 185 `#7D2D00`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 182 crossed by five or six layer lines of 183, 1 px thick, running roughly horizontally with a 1-px wobble every 8–12 px so no line is ruled straight, spaced 6–10 rows apart (for example at rows 3, 11, 18, 27, 36 and 44), each leaving the tile at column 47 on the same row it re-enters at column 0; the row directly above each line is 181 for its whole length (the sunlit lip of the layer), and the upper-left third of the field carries a 1-px micro-dither of 181 covering about 30% of it while the lower-right third carries none. Over the layers a net of drying cracks in 184 outlines five to seven polygons of 10–18 px, the crack lines 1 px wide and bending where they cross a layer line, with a single 185 pixel at every junction of three cracks; cracks that reach an edge continue on the opposite edge. Dust flecks of 180, single pixels, are scattered one per 40 px² and never touch a crack. In the 96×144 block the showcase tile carries a 2-px ring of 185 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, with no crack in the 2 px inside it; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 185 at each of its four corners; the lower square has the 2-px ring of 185 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side beyond the lips, no transparent pixel; the badlands' dead trees, loose stones, boulders, ironstone, gold outcrops, tall cacti and crystals are objects drawn on top.

#### Interaction / Transformed State Description:
No second state in the engine: red clay is the floor of the badlands biome (`desert_badland`) only, with no actions and no swaps in cursed or blessed regions. The dig job (work 80) turns the cell into `dirt` (its own brief in this file) and drops a `stone` item 1 time in 4; the 47 autotile shapes are its only other variants.

#### Readability Check:
At zoom ⅓ the only red-orange ground on the map, its faint horizontal banding separating it from the grainy warm brown of dirt and from every grey.

Deliver: art/masters/red_clay.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/red_clay.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 12). Slot 12 = column 4, row 1 of the assembled A2 sheet (x 384–479, y 144–287).

---

### rock — Bare rock (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; each slab has 1 px of light on its upper-left edge and 1 px of shadow on its lower-right edge, so the relief is 1 px: walkable ground, not a cliff
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the solid rock block (second block of the bottom row; its builder `tools/build_master_u7_chipsets.js` took SHAPES.VGA flat shape 1, darkened, for it), and `art/u7_reference_squares/u7_boulder_48.png` (shape 342) for the facet shading; reference only, nothing copied ships
- **Palette Ramps**: Stone 124 `#8E8E8E` (lit slab edges), 125 `#7D7D7D` (field), 126 `#6D6D6D` (shade), 127 `#616161` (shadow edges); Fissures 129 `#454545`; Glints 122 `#AEAEAE` (1-px); Ring 130 `#353535`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 125 broken by 124 in a 1-px micro-dither over the upper-left third and by 126 over the lower-right third (about 35% of each third, no run longer than 4 px), and cut into six to nine flat slabs, irregular polygons 10–20 px across, by 1-px fissure lines of 129 that leave the tile at one edge and continue at the opposite edge. Each slab's upper-left edge (the pixels just inside the fissure on its north and west sides) is 124 and its lower-right edge is 127, one pixel each, so the slabs look like slightly tilted flagstones and nothing taller. Three or four hairline cracks of 129 branch from the fissures 4–8 px into the slabs, and two or three single 122 glints sit on the lit corners of the largest slabs. In the 96×144 block the showcase tile carries a 2-px ring of 130 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, with no fissure in the 2 px inside it; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 130 at each of its four corners; the lower square has the 2-px ring of 130 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side beyond the slab edges, no transparent pixel; the mountains' boulders, ironstone, copper and gold outcrops, crystals, pines, loose stones, lichen and gravel are objects drawn on top, so the slabs stay calmer than any of them.

#### Interaction / Transformed State Description:
No second state in the engine: bare rock is the floor of the mountain biome (`mountain`) below the peak line (the world generator puts `peak_rock` where the elevation field reaches the catalog's peak level of 0.86 and `snow` where the mountain is cold; the rest is this kind), with no actions and no swaps in cursed or blessed regions. The dig job (work 80) turns the cell into `dirt` (its own brief in this file) and drops a `stone` item 1 time in 4; the 47 autotile shapes are its only other variants.

#### Readability Check:
At zoom ⅓ a neutral mid-grey slab plane, cooler and darker than stony ground, lighter than the rock face and without its cliff bands, and smoother than scree's packed lumps.

Deliver: art/masters/rock.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/rock.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 13). Slot 13 = column 5, row 1 of the assembled A2 sheet (x 480–575, y 144–287).

---

### peak_rock — Rock face (AR-100)
- **Category**: Ground (A2 autotile, impassable)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile (the top of the rock) repeated 2 across and 3 down, with cliff faces painted over the south and east rims and a lit lip over the north and west rims in place of the ring
- **Anchor**: none (tile)
- **Projection**: U7 2.5D oblique applied to a tile: the base tile is the top of the rock seen from above; the south band of the block's rim (rows 120–143 of the lower square) is the cliff's south face and the east band (columns 72–95) its east face, so a mass of these cells reads as a raised block whose lit top sits up-left of its dark base; the north and west rims show only the top's sunlit lip, because the north and west faces are never seen
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the solid rock block (second block of the bottom row; its builder `tools/build_master_u7_chipsets.js` took SHAPES.VGA flat shape 1, darkened, for it) for the top's grain, and `art/u7_reference_squares/u7_boulder_48.png` (shape 342) for how a south face and an east face darken step by step; no cliff square was extracted; reference only, nothing copied ships
- **Palette Ramps**: Top 128 `#515151` (field), 126 `#6D6D6D` (lit specks and inner lip), 129 `#454545` (top cracks and face lips); South face 130 `#353535` with 131 `#242424` strata; East face 131 `#242424` with 132 `#181818` strata; Lip 124 `#8E8E8E` (the sunlit edge on the north and west rims); Contact 133 `#080808` (the line where a face meets the ground below); no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 128 broken by 126 in a 1-px micro-dither over the upper-left third and by 129 over the lower-right third (about 35% of each, no run longer than 4 px), cut by 1-px 129 cracks into four to six facets 12–24 px across that continue across the wrap, with two or three single 126 specks per facet; every step is one darker than the bare rock brief's, so a peak reads as a shadowed mass even where no face shows. In the lower square of the 96×144 block the south band (columns 0–95, rows 120–143, including both bottom corners) is the south face in place of the ring: rows 120–121 are 129 (the rounded lip of the top), rows 122–142 are 130 with three horizontal strata lines of 131 (1 px, wobbling 1 px every 10–14 px) and 2-px-wide vertical cracks of 131 every 12–20 px, and row 143 is 133, the contact line with the ground below. The east band (columns 72–95, rows 48–143) is the east face: columns 72–73 are 129 (lip), columns 74–94 are 131 with two vertical strata lines of 132 and short horizontal cracks of 132 every 8–14 rows, and column 95 is 133; in the bottom-right corner (columns 72–95, rows 120–143) the south face runs across to column 93 and columns 94–95 are 133, the darkest point of the block, and in the top-right corner the east face starts at row 50 under a 2-px 124 lip. The north band (rows 48–71) and the west band (columns 0–23) of the lower square carry the top texture to within 2 px of the edge, and the outermost 2 px (rows 48–49, columns 0–1) are 124 with a 1-px line of 126 inside them: the top's sunlit back lip, no face. The showcase tile (columns 0–47, rows 0–47) is a lone block: the 2-px 124 lip on rows 0–1 and columns 0–1, a 6-px south face on rows 41–47 (129 lip, 130 face, 133 contact on row 47) and a 5-px east face on columns 43–47 (129 lip, 131 face, 133 contact on column 47); the inner-corner tile (columns 48–95, rows 0–47) is the top texture with the faces bent around a 2-px-thick, 6-px-long L-shaped notch at each corner: at (95,47) (foreign cell to the south-east) the notch is a 4-px south face in 130 meeting a 3-px east face in 131 with a 133 contact pixel, at (48,0) (foreign cell to the north-west) it is the 124 lip only, and at (95,0) and (48,47) one arm is lip and the other face. No baked shadow beyond the faces, no transparent pixel.

#### Interaction / Transformed State Description:
No second state in the engine, and no unit ever stands on it: the catalog marks it `passable` false, so every one of its 48 tile shapes blocks all four directions, the world generator writes region 250 on exactly its cells (mountain cells whose elevation field reaches the catalog's peak level of 0.86), and the dig menu refuses it with the reason "solid rock". It is never swapped by cursed or blessed regions and never dug into `dirt`; its 47 autotile shapes are its only variants, which is why the faces live in the rim bands and not in a separate sprite.

#### Readability Check:
At zoom ⅓ the darkest grey on the map, and the only ground whose southern and eastern borders carry a dark vertical band, so mountain peaks read as walls from above against the lighter bare rock and snow around them.

Deliver: art/masters/peak_rock.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/peak_rock.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 14). Slot 14 = column 6, row 1 of the assembled A2 sheet (x 576–671, y 144–287).

---

### mud — Mud (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; wet ground, so no relief at all, only a sheen on the upper-left of each soft blob
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the wet mud block (second block of the third row; its builder `tools/build_master_u7_chipsets.js` took SHAPES.VGA flat shape 5 for it); no reference square was extracted; reference only, nothing copied ships
- **Palette Ramps**: Mud 216 `#7D6559` (wet sheen), 217 `#6D554D` (field), 219 `#514139` (soft blobs), 221 `#352D24` (standing-water pockets); Algae 169 `#5D7139` (film), 170 `#4D5D28` (film edge); Ring 222 `#241818`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 217 carrying eight to ten soft rounded blobs of 219, 4–8 px across, with no outline and their edges broken by a 1-px dither into 217 so nothing is hard-edged; a blob cut by column 47 or row 47 continues on the opposite edge. Inside the three largest blobs a 2–3-px pocket of 221 marks standing water, and on the upper-left rim of four blobs a 2-px crescent of 216 is the wet sheen, echoed by a 1-px micro-dither of 216 covering about 25% of the upper-left third of the field. Three or four algae patches of 169, 3–6 px, sit in the lower-right two-thirds with a 1-px 170 line on their lower and right sides; there are no cracks and no grains, because this ground is wet. In the 96×144 block the showcase tile carries a 2-px ring of 222 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, with no blob in the 2 px inside it; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 222 at each of its four corners; the lower square has the 2-px ring of 222 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side beyond the sheen, no transparent pixel; the marsh's reeds, tall grass and white flowers, and the lily pads on its water, are objects drawn on top.

#### Interaction / Transformed State Description:
No second state in the engine: mud is the floor of the four marsh biomes (`marsh_temperate_fresh`, `marsh_temperate_salt`, `marsh_tropical_fresh`, `marsh_tropical_salt`) and the dry ground of the fresh and brackish lake biomes (`lake_fresh`, `lake_brackish`), with no actions and no swaps in cursed or blessed regions. The dig job (work 80) turns the cell into `dirt` (its own brief in this file) and drops a `stone` item 1 time in 4; the 47 autotile shapes are its only other variants.

#### Readability Check:
At zoom ⅓ a taupe plane with soft dark blotches and small green films, softer and lighter than the near-black swamp mud, and cooler and blotchier than the grainy orange-brown of dirt.

Deliver: art/masters/mud.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/mud.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 15). Slot 15 = column 7, row 1 of the assembled A2 sheet (x 672–767, y 144–287).

---

### swamp_mud — Swamp mud (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; wet peat with no relief, a single light pixel on the upper-left rim of each pool
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the swamp peat block (third block of the third row; its builder `tools/build_master_u7_chipsets.js` took SHAPES.VGA flat shape 51, darkened, for it); no reference square was extracted; reference only, nothing copied ships
- **Palette Ramps**: Peat 219 `#514139` (lit crumbs), 220 `#45352D` (field), 221 `#352D24` (blobs), 222 `#241818` (pools); Moss 172 `#39451C` (film), 173 `#313D18` (film shade), 174 `#283114` (film edge); Ring 223 `#181010`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 220 broken by 219 in a 1-px micro-dither covering about 25% of the upper-left third, carrying ten to twelve soft blobs of 221, 4–8 px, edged by a 1-px dither into 220 and continuing across the wrap where they meet an edge. Four or five black pools of 222, rounded and 3–6 px across, lie among the blobs, each with one single 219 pixel on its upper-left rim (light on standing water) and nothing else inside, and no two pools touch. Moss films of 172 in three or four patches of 4–7 px sit mostly in the lower-right half, each with 173 over its lower-right third and a 1-px 174 line on its lower and right sides, and eight to ten single 219 crumbs are scattered where there is neither blob nor pool. In the 96×144 block the showcase tile carries a 2-px ring of 223 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, with no pool in the 2 px inside it; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 223 at each of its four corners; the lower square has the 2-px ring of 223 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side beyond the pool rims, no transparent pixel; swamp trees, mangroves, reeds, ferns and lily pads are objects drawn on top.

#### Interaction / Transformed State Description:
No second state in the engine: swamp mud is the floor of the five swamp biomes (`swamp_temperate_fresh`, `swamp_temperate_salt`, `swamp_tropical_fresh`, `swamp_tropical_salt`, `swamp_mangrove`), with no actions and no swaps in cursed or blessed regions (cursed water beside it becomes the `blighted` water kind, but the ground stays). The dig job (work 80) turns the cell into `dirt` (its own brief in this file) and drops a `stone` item 1 time in 4; the 47 autotile shapes are its only other variants.

#### Readability Check:
At zoom ⅓ the darkest brown-green ground: its black pools separate it from plain mud and its green films from ash, the other near-black plane, which is grey.

Deliver: art/masters/swamp_mud.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/swamp_mud.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 16). Slot 16 = column 0, row 2 of the assembled A2 sheet (x 0–95, y 288–431).

---

### dirt — Dirt (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; each clod has one shadow pixel at its lower-right, nothing taller
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the dirt path block (third block of the top row; `docs/STATUS.md` → Stand-ins lists the sheet's dirt as SHAPES.VGA flat shape 23 and its builder `tools/build_master_u7_chipsets.js` names flat shape 16 for that block); reference only, nothing copied ships
- **Palette Ramps**: Earth 138 `#AA8659` (lit grains), 139 `#9A7141` (field), 140 `#8A5D2D` (shade grains), 142 `#6D3D0C` (clods); Stones 136 `#CAB292` (1-px pale specks), 144 `#4D2D0C` (clod shadow); Ring 145 `#3D240C`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 139 broken by 138 in a 1-px micro-dither over the upper-left third and by 140 over the lower-right third (about 35% of each third), and over the whole tile a grain of single pixels, 138 at one pixel in twelve and 140 at one in twelve with no two of the same colour adjacent, so the plane reads as turned earth. Six to eight clods of 142, 2–4 px and irregular, lie with at least 4 px between them, each with a single 144 pixel at its lower-right, and three or four pale stone specks of 136, 1–2 px, sit in the gaps; a clod or speck cut by column 47 or row 47 continues on the opposite edge. There are no cracks, layers or blades: this is loose, freshly turned soil, and it must sit darker and browner than sand and greyer than red clay so a dug cell shows against both. In the 96×144 block the showcase tile carries a 2-px ring of 145 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, with no clod in the 2 px inside it, so a dug hole reads as a dark ring cut into the grass around it; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 145 at each of its four corners; the lower square has the 2-px ring of 145 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side beyond the clods' 1 px, no transparent pixel; items dropped by digging and anything built on the cell are drawn on top by the items and objects layers.

#### Interaction / Transformed State Description:
This block is itself the transformed state of every other passable ground kind: no biome uses dirt as its floor, and a cell becomes dirt only when the dig job (work 80) finishes on it, when the engine writes this kind's base tile, re-derives the autotile shapes of the cell and its eight neighbours, and drops a `stone` item 1 time in 4. Dirt has no state of its own beyond that: it can be dug again with the same result, it never regrows into the kind it replaced, and the cursed and blessed region swaps do not touch it.

#### Readability Check:
At zoom ⅓ a warm orange-brown grainy plane, the warmest ground after red clay, from which its lack of banding separates it, and darker and browner than sand.

Deliver: art/masters/dirt.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/dirt.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 17). Slot 17 = column 1, row 2 of the assembled A2 sheet (x 96–191, y 288–431).

---

### cursed_grass — Blighted grass (AR-120)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the blades are 1-px vertical ticks drawn straight up, the meadow tile's construction, thinned and greyed
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the grass block at columns 0–95, rows 0–143 (SHAPES.VGA flat ground shape 4, the meadow's yardstick) and the blighted grass block (sixth block of the third row; its builder `tools/build_master_u7_chipsets.js` took flat shape 36, desaturated, for it); reference only, nothing copied ships
- **Palette Ramps**: Dead ground 156 `#6D615D` (field), 158 `#514945` (shade), 155 `#7D7169` (lit flecks); Blades 172 `#39451C` (blades), 171 `#415120` (blade tips, barely lighter); Blight flecks 96 `#610061`, 98 `#450045`; Ring 160 `#35312D`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 156 broken by 158 in an irregular 1-px micro-dither covering about 40% of the tile with no run longer than 4 px, and by 6 to 8 single 155 flecks in the upper-left third: bare, greyed earth where the meadow's olive field was. Over it stand 12 to 14 blades, half the meadow's count, each 1 px wide and 2 to 4 px tall in 172 with a single 171 pixel at the top, no two touching, so the grass reads as thin and dying rather than lit. Blight flecks sit on the field between blades and never on a blade: five clusters of two or three 96 pixels and six single 98 pixels per tile, spaced so no cluster is within 6 px of another, a stain in the ground rather than flowers. Nothing in the tile is a bright green: the whole ramp is the meadow (168–172 olive) drained of colour, and it must sit next to the meadow tile without a jump in brightness. The tile wraps on both axes; in the 96×144 block the showcase tile carries a 2-px ring of 160 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, with no blade in the 2 px inside it, so the border of a cursed region shows as a dark line where blight meets living grass; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 160 at each of its four corners; the lower square has the 2-px ring of 160 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel; blighted trees and old bones are objects drawn on top.

#### Interaction / Transformed State Description:
No second state in the engine: blighted grass exists only as a generation-time swap. In a cursed region (alignment field below 0.18) the world generator lays this kind in place of `meadow`, `tropical_grass`, `dry_grass` and `jungle_floor`, adds `tree_cursed` and `bones_pile`, removes the flowers and `fruit_tree` objects, and makes the water there `blighted`; the swap never reverses in play. The dig job (work 80) turns the cell into `dirt` (its own brief in this file) and drops a `stone` item 1 time in 4; the 47 autotile shapes are its only other variants.

#### Readability Check:
At zoom ⅓ a grey-olive plane with a purplish stipple next to the green meadow: duller and darker than every living grass, greener than ash and browner than scree.

Deliver: art/masters/cursed_grass.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/cursed_grass.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 18). Slot 18 = column 2, row 2 of the assembled A2 sheet (x 192–287, y 288–431).

---

### blessed_grass — Flowering grass (AR-120)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; the blades are 1-px vertical ticks drawn straight up with a lighter tip, the meadow tile's construction in a brighter, purer green
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the grass block at columns 0–95, rows 0–143 (SHAPES.VGA flat ground shape 4, the meadow's yardstick) and the flowering meadow block (seventh block of the top row; its builder `tools/build_master_u7_chipsets.js` took flat shape 35 with added flower pixels for it); reference only, nothing copied ships
- **Palette Ramps**: Grass 240 `#7DDF7D` (lit blade tips), 241 `#45B645` (blades), 242 `#189218` (field), 243 `#006D00` (shade pockets); Flowers 2 `#F7E7A6` (petals), 1 `#FBF3CE` (petal highlight), 234 `#FFC228` (centres); Ring 69 `#046D00`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is 242 broken by 243 in an irregular 1-px micro-dither covering about 35% of the tile with no run longer than 4 px. Over it stand 26 to 30 blades, each 1 px wide and 3 to 5 px tall, drawn straight up in 241 with a single 240 pixel at the top of each, no two touching: a brighter, purer green than the meadow's olive ramp (168–172), with none of the lush grass's yellow-green blades or yellow seed heads. Ten to fourteen small flowers sit on the field at least 4 px apart and never on a blade: each is a 2×2 block of 2 with a single 1 pixel at its upper-left, and the four largest are 3×3 blocks of 2 with a 234 centre pixel; there are no bald patches, stones or cracks. The tile wraps on both axes, blades, dither and any flower cut by an edge continuing on the opposite edge. In the 96×144 block the showcase tile carries a 2-px ring of 69 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, with no flower in the 2 px inside it, so the border with plain meadow is a thin dark line and not a jump in hue; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 69 at each of its four corners; the lower square has the 2-px ring of 69 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side, no transparent pixel; the blessed region's standing wildflowers, white flowers and fruit trees are objects drawn on top, larger than these ground flecks.

#### Interaction / Transformed State Description:
No second state in the engine: flowering grass exists only as a generation-time swap. In a blessed region (alignment field 0.82 and above) the world generator lays this kind in place of `meadow`, `tropical_grass` and `dry_grass` and adds `flowers`, `flowers_white` and `fruit_tree` objects; the swap never reverses in play. The dig job (work 80) turns the cell into `dirt` (its own brief in this file) and drops a `stone` item 1 time in 4; the 47 autotile shapes are its only other variants.

#### Readability Check:
At zoom ⅓ the brightest, purest green on the map with a cream stipple: separated from the olive meadow by hue, from the lush grass by its cream flowers in place of yellow seed heads, and from the wildflower objects by scale, since those stand taller and redder than any fleck here.

Deliver: art/masters/blessed_grass.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/blessed_grass.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 19). Slot 19 = column 3, row 2 of the assembled A2 sheet (x 288–383, y 288–431).

---

### ash — Ash (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; a powder with no relief except one shadow pixel under each charred stub
- **Reference**: none extracted; nearest is the solid rock block of `game/img/tilesets/U7_Ground_A2.png` (second block of the bottom row; its builder `tools/build_master_u7_chipsets.js` took SHAPES.VGA flat shape 1, darkened, for it) for a soft dark grey, with the powder texture left to this brief; reference only, nothing copied ships
- **Palette Ramps**: Ash 156 `#6D615D` (lit), 157 `#615551` (field), 158 `#514945` (shade); Char 160 `#35312D` (burnt stubs), 161 `#242020` (stub shadow); Embers 237 `#CA3900` (1-px, rare), 184 `#8E3D0C` (ember shade); Ring 162 `#181414`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile the field is a soft 157 broken by 156 in a 1-px micro-dither over the upper-left third and by 158 over the lower-right third (about 35% of each third, no run longer than 4 px), with no cracks, facets, grains or blades: the dither alone makes the powder. Five to seven charred stubs of 160, 2–4 px and irregular, lie at least 5 px apart with a single 161 pixel at each one's lower-right, and six to eight single 158 flecks sit between them; a stub cut by column 47 or row 47 continues on the opposite edge. Two ember pixels of 237 per tile, each with one 184 pixel at its lower-right and never within 8 px of the other ember, are the only warm colour and must stay this rare so the tile reads dead and not burning. In the 96×144 block the showcase tile carries a 2-px ring of 162 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, with no stub in the 2 px inside it, so the edge of a burnt forest against living forest floor reads as a soft dark line; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 162 at each of its four corners; the lower square has the 2-px ring of 162 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side beyond the stubs' 1 px, no transparent pixel; blighted trees and old bones are objects drawn on top, so the stubs here stay smaller than any of them.

#### Interaction / Transformed State Description:
No second state in the engine: ash exists only as a generation-time swap. In a cursed region (alignment field below 0.18) the world generator lays this kind in place of `forest_floor` and `needle_floor`, adds `tree_cursed` and `bones_pile`, removes the flowers and `fruit_tree` objects, and makes the water there `blighted`; the swap never reverses in play. The dig job (work 80) turns the cell into `dirt` (its own brief in this file) and drops a `stone` item 1 time in 4; the 47 autotile shapes are its only other variants.

#### Readability Check:
At zoom ⅓ a flat, matte warm grey with black specks and one or two orange points: softer than the cracked bare rock and the pebbled stony ground, greyer than blighted grass and swamp mud.

Deliver: art/masters/ash.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/ash.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 20). Slot 20 = column 4, row 2 of the assembled A2 sheet (x 384–479, y 288–431).

---

### scree — Scree (AR-100)
- **Category**: Ground (A2 autotile)
- **Dimensions**: an RPG Maker A2 autotile block of 2×3 tiles of 48×48 = 96×144 px at native resolution (1 art pixel = 1 screen pixel at zoom 1): one seamless 48×48 base tile repeated 2 across and 3 down, with the edge ring and notches painted over it
- **Anchor**: none (tile)
- **Projection**: flat (ground tile): seen from straight above, no lean and no faces; each loose lump has a lit upper-left half, a shaded lower-right half and a 1-px dark side on its lower and right edges, and that 1 px is all the relief
- **Reference**: `game/img/tilesets/U7_Ground_A2.png`, the sand scree block (fifth block of the second row; its builder `tools/build_master_u7_chipsets.js` took SHAPES.VGA flat shape 1, darkened and warmed, for it), and `art/u7_reference_squares/u7_boulder_48.png` (shape 342) for the lit-top, dark-side shading of a stone; reference only, nothing copied ships
- **Palette Ramps**: Stone 155 `#7D7169` (lump tops), 156 `#6D615D` (lump lower halves), 157 `#615551` (lump sides), 158 `#514945` (undersides where lumps overlap); Gaps 160 `#35312D`; Grit 154 `#8E8279` (1-px); Ring 161 `#242020`; no background colour: every pixel of a ground block is opaque.

#### Primary State Visual Description:
On the 48×48 base tile about twenty loose angular lumps of 4–8 px cover the tile edge to edge, packed so that the 1-px gaps of 160 between them form one continuous dark network: the reverse of stony ground, where a few pebbles sit on an open field. Each lump is 155 over its upper-left half and 156 over its lower-right half, split along a rough diagonal, with a 1-px 157 side on its lower and right edges and a single 158 pixel where it tucks under the lump below it; a lump cut by column 47 or row 47 continues on the opposite edge so the network wraps. Eight to ten single 154 grit pixels sit inside the gaps, never on a lump. In the 96×144 block the showcase tile carries a 2-px ring of 161 on rows 0–1, rows 46–47, columns 0–1 and columns 46–47, and in the 2 px inside it the lumps shrink to 3–4 px so a border thins out instead of stopping dead; the inner-corner tile is the plain texture with a 2-px-thick, 6-px-long L-shaped notch of 161 at each of its four corners; the lower square has the 2-px ring of 161 on its outer border only (rows 48–49, rows 142–143, columns 0–1, columns 94–95) and none on the seams at column 48 and row 96. No baked shadow, no lit side beyond each lump's 1 px, no transparent pixel; loose stones, gravel and boulders standing on scree are objects drawn on top, so the lumps stay smaller and flatter than the loose-stones object.

#### Interaction / Transformed State Description:
No second state in the engine. Scree is defined in the catalog (slot 21) and drawn on the sheet, but on 2026-09-18 no biome lists it as its floor and no world-generation rule places it, so it appears on no map until the catalog assigns it; when it does, a cell of it behaves like every other passable kind: the dig job (work 80) turns it into `dirt` (its own brief in this file) and drops a `stone` item 1 time in 4, and the 47 autotile shapes are its only other variants.

#### Readability Check:
At zoom ⅓ a dark, busy grey of packed lumps: darker and coarser than stony ground, warmer and rougher than the smooth slabs of bare rock, and without the cliff bands of the rock face.

Deliver: art/masters/scree.png (96×144 A2 block, every pixel opaque, so no magenta is left) + art/masters/scree.json (frameWidth 48, frameHeight 48, anchor null, facings [], animations {}, layer "ground", slot 21). Slot 21 = column 5, row 2 of the assembled A2 sheet (x 480–575, y 288–431).
