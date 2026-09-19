# Segment 00: what is in the world right now (written 2026-09-18 by Claude Code)

The user asked (2026-09-18, night): "Give prompts for assets that are in the world right now and need assets." This segment is the **start-here subset**: the things a New Game puts on screen around the home site, all of which are still U7 stand-ins, stock RPG Maker tiles or code-drawn shapes. The full set, one segment per family, is in the other `SEG-*.md` files; where a brief here and its segment brief disagree, the segment brief wins (it was checked later).

Evidence for "in the world right now" (worldgen suite, 2026-09-18, one seed): objects in the start area: grass_tuft 887, pine 488, oak 315, fern 288, reeds 232, flowers 169, tree_savanna 144, berry_bush 141; the start kit within 20 cells: berry_bush 6, oak 8, rocks_small 10, reeds 4, granite_boulder 2, fruit_tree 1; the home site (a human town in that run): a ring of wall_stone, a campfire at the centre, 8 floor_straw, 3 stockpile; wildlife herds of the temperate grassland and forest: deer, boar, hare, wild_sheep, fowl, wolf, fox; the colonists: 4–10 people of the player's species (human, elf, dwarf or gnome; human in two of four runs).

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares, every asset inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1). No 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up, 1 px left per unit of height); the top, south and east faces are visible; the base sits in the bottom-right region of the square (`docs/GUIDE_25D.md`).
3. Palette: `art/palette/uf.hex` only (indices below are verified against the file); aim for ≤ 32 colours per asset; micro-dither is welcome; no gradients or anti-aliasing against the background.
4. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0/255 after cleaning, no baked ground shadow (the engine draws shadows), plus `art/masters/<id>.json` (frameWidth 48, frameHeight 48, anchor [24, 47], facings, animations).
5. Open the reference square named in each brief before drawing (`art/u7_reference_squares/`). It is a reference and a development stand-in: nothing copied from it ships.
6. Contained: nothing touches the top edge (row 0) or the right edge (column 47); the anchor is the bottom centre of the cell, [24, 47].
7. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated), then copy the approved file into `game/img/characters/` under the name the catalog uses (or update the catalog's `image` field; Gemini may edit the `objects`, `items.types`, `wildlife.species` and `people` lists only).
8. Mark the request row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name; the user approves each asset (`art/APPROVALS.md`).
9. Order: the four anchors in `SEG-01` first (person, oak, wall, meadow ground), then this file top to bottom.
10. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-00_in_the_world_now.md`.

---

### grass_tuft — Tall grass (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn shape is 34 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: blades lean up and to the left at 45°; a flat object, so no south or east face beyond the blade shading
- **Reference**: the `!$U7_TallGrass` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Palette Ramps**: Blade 201 `#86B200` (sunlit tips), 241 `#45B645` (mid), 242 `#189218` (shadow), 243 `#006D00` (base); Dry tips 202 `#7D9600`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The clump's base is a 12-px-wide dark patch of 243 on rows 44–47, columns 22–33. From it 11 to 13 blades rise, each 1–2 px wide and 10 to 20 px long, fanning out and leaning up-left so the tallest tip reaches row 26, column 12 and the shortest right-hand blade ends at row 40, column 36. Blades are 242 near the base, 241 in the middle and 201 on the last 3 px of each tip, with one or two tips in 202 to read as drying; a 1-px 147 line runs along the lower-right edge of the three front blades only. Everything above row 25, left of column 10 and right of column 37 stays magenta, and nothing touches the top or right edge.

#### Interaction / Transformed State Description:
"gather" (work 3 beats, yields 2 fiber) removes the object: the cell shows bare ground. No second sprite in the engine; the same file is reused with the catalog's `regrow` when the tuft comes back.

#### Readability Check:
At zoom ⅓ it reads as a small bright fan on the ground, lower and lighter than reeds (taller, straight, blue-green) and the fern (dark, arching fronds).

Deliver: art/masters/grass_tuft.png (48×48, magenta background) + art/masters/grass_tuft.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### oak — Oak (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn shape is 44 px wide and 46 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: the trunk leans up and to the left at 45°; the top of the canopy is lit, its south and east sides shaded
- **Reference**: `art/u7_reference_squares/u7_oak_tree_48.png` (shape 181 shrunk to 0.67; reference only, nothing copied ships)
- **Palette Ramps**: Leaf 200 `#86D200` (sunlit crown), 241 `#45B645`, 242 `#189218`, 243 `#006D00`, 70 `#005100` (under-canopy); Bark 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The root flare sits in the bottom-right quarter of the square: a 10-px-wide base on rows 40–47, columns 30–40, in 145 with a 147 contact line on row 47. From it the trunk (6 px wide, 141 on its left strip, 143 in the middle, 145 on the right) climbs 14 px while sliding 14 px to the left, reaching the canopy's underside at row 26, columns 16–22. The canopy is an irregular mass of leaf clusters about 44 px wide (columns 2–45) and 28 px tall (rows 0–27), its upper-left third in 200 and 241 with 1-px micro-dither between the two, the centre in 242, the lower-right and the underside in 243 with 70 in the deepest pockets; three or four gaps show branch fragments in 143. The outline is 147 only where a cluster meets the background on its lower and right sides. Nothing touches columns 46–47 or row 0.

#### Interaction / Transformed State Description:
`stump` (after "chop", 12 beats, yields 3 logs): its own file (SEG-02). The oak has no other engine state.

#### Readability Check:
At zoom ⅓ the oak is the broadest, darkest-crowned tree with a bare trunk leaning up-left, unlike the pine's narrow tiered crown and the fruit tree's paler crown with red dots.

Deliver: art/masters/oak.png (48×48, magenta background) + art/masters/oak.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### pine — Pine (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn shape is 36 px wide and 46 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: the trunk leans up and to the left at 45°; each tier of boughs is lit on top and shaded on its south and east sides
- **Reference**: `art/u7_reference_squares/u7_pine_tree_48.png` (shape 306 shrunk to 0.80; reference only, nothing copied ships)
- **Palette Ramps**: Needle 241 `#45B645` (lit tier tops), 242 `#189218`, 243 `#006D00`, 70 `#005100`, 71 `#003500` (deep shade); Bark 143 `#5D350C`, 145 `#3D240C`; Silhouette 147 `#201408`.

#### Primary State Visual Description:
A narrow root base of 145, 6 px wide, sits on rows 43–47, columns 32–37, with a 147 contact line on row 47; the trunk (3 px wide, 143 with a 145 right strip) climbs and slides up-left to row 34, column 24, where the lowest tier begins. Four tiers of boughs stack up the lean, each an irregular wedge wider at the bottom: tier 1 spans columns 10–40 on rows 30–38, tier 2 columns 12–36 on rows 20–30, tier 3 columns 14–30 on rows 10–20, and the crown a 6-px spike ending at row 1, column 18. Each tier's top surface is 241 with 1-px dither into 242, its south face 243, and the underside and east side 70 with 71 in the deepest notches; the outline 147 runs only under each tier and along the right silhouette. Row 0 and columns 41–47 stay magenta.

#### Interaction / Transformed State Description:
`stump` (after "chop", 12 beats, yields 3 logs): the same stump file as the oak (SEG-02). No other engine state.

#### Readability Check:
At zoom ⅓ the pine is the tall narrow dark triangle among the trees, distinct from the round oak and the pale fruit tree.

Deliver: art/masters/pine.png (48×48, magenta background) + art/masters/pine.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### berry_bush — Berry bush (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn shape is 34 px wide and 26 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: a low mound, its top lit and its south and east sides shaded
- **Reference**: `art/u7_reference_squares/u7_berry_bush_48.png` (shape 672 at 1:1; reference only, nothing copied ships)
- **Palette Ramps**: Leaf 200 `#86D200` (top), 241 `#45B645`, 242 `#189218`, 243 `#006D00`; Berries 24 `#C20C1C` (body), 21 `#FF394D` (catchlight); Twig 143 `#5D350C`; Silhouette 147 `#201408`.

#### Primary State Visual Description:
A rounded mound about 34 px wide (columns 9–42) and 22 px tall (rows 24–46) with its ground contact on rows 44–47 between columns 14 and 40 and a 147 contact line on row 47; the mound's silhouette is lumpy, three overlapping leaf clusters, the highest at row 24, column 20 because the shape leans up-left. The top third is 200 dithered into 241, the middle 242, the south face and the east flank 243, with 2-px twig fragments of 143 in two gaps. Fourteen berries of 2×2 px in 24, each with a single 21 pixel at its upper-left, are scattered mostly over the lit top and the middle; the outline 147 runs along the lower and right edges only. Rows 0–23 and columns 43–47 stay magenta.

#### Interaction / Transformed State Description:
`berry_bush_bare` (after "gather", 3 beats, yields 3 berries; regrows per the catalog): the identical mound with every berry pixel replaced by the leaf colour around it and the top third one step darker (200 becomes 241); its own file, SEG-03.

#### Readability Check:
At zoom ⅓ the red flecks on a low green mound separate it from the plain bush and the tall grass.

Deliver: art/masters/berry_bush.png (48×48, magenta background) + art/masters/berry_bush.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### rocks_small — Loose stones (AR-104)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn shape is 36 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: each stone shows a lit top, a mid south face and a dark east face
- **Reference**: the `!$U7_LooseStones` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Palette Ramps**: Stone 120 `#CECECE` (tops), 123 `#9E9E9E` (south faces), 126 `#6D6D6D` (east faces), 128 `#515151` (cracks); Contact 129 `#454545`; Silhouette 147 `#201408`.

#### Primary State Visual Description:
Six stones lie in the lower third of the square, rows 32–47, between columns 6 and 42: one 12×8 stone at columns 22–33, rows 36–44, three of 6×5 and two of 4×3 around it, none overlapping, each with its top in 120, its south face in 123, its east face in 126 and one 128 crack on the largest; a 1-px 129 contact shadow sits under each on its lowest row. The outline 147 is drawn on the lower and right edges of each stone only. Rows 0–31 and columns 43–47 stay magenta.

#### Interaction / Transformed State Description:
"pick" (2 beats, yields 2 stone) removes the object: the cell shows bare ground. This file is also the worked-out state of `granite_boulder` (quarry) and `ironstone` (mine).

#### Readability Check:
At zoom ⅓ a scatter of light grey specks low in the cell, smaller and paler than the boulder's single mass.

Deliver: art/masters/rocks_small.png (48×48, magenta background) + art/masters/rocks_small.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### wall_stone — Stone wall (AR-104)
- **Category**: Building
- **Dimensions**: a SET of 48×48 pieces on one sheet (the engine assembles them like RPG Maker chipset walls; user decision 2026-09-18: connected pieces with visible faces on the north and south sides); each piece fits its square
- **Anchor**: none (tile); each piece fills its cell
- **Projection**: U7 2.5D oblique: the wall's top face is a flat lit band; its south face is visible below the top when the cell south of it is open; its north face is visible when the cell north of it is open (the user's rule), and the east face shows on a wall's right end
- **Reference**: none extracted; nearest is the stock `Outside_C` block tile 277 used today (reference only)
- **Palette Ramps**: Ashlar top 121 `#BEBEBE`, mortar 124 `#8E8E8E`; South face 123 `#9E9E9E` with 126 `#6D6D6D` joints; East face and north face 127 `#616161` with 129 `#454545` joints; Silhouette 147 `#201408`.

#### Primary State Visual Description:
Straight piece (east–west run, both neighbours walls): the top face is a band 48 px wide on rows 0–15 in 121 with 1-px 124 mortar lines every 8 px and a 1-px 147 line on row 15; the south face fills rows 16–47 in 123, coursed with 126 joints every 8 rows and staggered every 16 px, with a 147 line on row 47. North-facing piece (the cell to the north is open, the one to the south is a wall): rows 0–15 show the north face in 127 with 129 joints and the top band moves to rows 16–31. End piece (east end): the top band stops at column 41 and columns 42–47 show the east face in 127 on rows 0–47 with 129 joints. Corner pieces join the top bands; a wall standing alone shows top, north, south and east faces. The set is: straight E–W, straight N–S (top band 16 px wide on columns 16–31, faces on both sides), the four corners, the four ends, a cross and the four T-junctions, exactly as the RPG Maker A4 wall convention lays them out, plus the north-face variants where the north cell is open.

#### Interaction / Transformed State Description:
`rubble` (the ruin state; also what "dismantle" leaves after returning 2 stone): its own file, SEG-04. Unbuilt (the build job's materials on the cell) is shown by the item icons, not by this sheet.

#### Readability Check:
At zoom ⅓ a light grey band with a darker face under it reads as a wall from above, unlike the brown palisade's vertical stripes.

Deliver: art/masters/wall_stone.png (the A4-style set sheet, magenta background) + art/masters/wall_stone.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations listing each piece by name: straight_ew, straight_ns, corner_ne, corner_nw, corner_se, corner_sw, end_n, end_s, end_e, end_w, cross, t_n, t_s, t_e, t_w, and the north-face variants).

---

### campfire — Campfire (AR-105)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn shape is 40 px wide and 30 px tall (unlit) and 40 px tall (lit)
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: the stone ring is an ellipse seen from above, each cobble lit on top and shaded south and east; the flame stands up along the lean
- **Reference**: `art/u7_reference_squares/u7_campfire_48.png` (shape 739 at 1:1; reference only, nothing copied ships)
- **Palette Ramps**: Cobbles 121 `#BEBEBE` (tops), 124 `#8E8E8E` (south), 126 `#6D6D6D` (east); Charred wood 160 `#35312D`, 143 `#5D350C`; Coals 236 `#FF5100`, 24 `#C20C1C`; Flame 250 `#FFD200` (core), 251 `#FFAE00`, 235 `#FF8E10`; Contact 129 `#454545`.

#### Primary State Visual Description:
Unlit: an ellipse of fourteen cobbles, each 5–7 px across, forms a ring 40 px wide (columns 4–43) and 22 px tall (rows 24–46), the ring's far side at row 24 and its near side at row 46; every cobble has a 121 top, a 124 south face 2 px tall and a 126 east sliver, with 1-px 129 contact shadow under the near-side cobbles on row 47. Inside the ring three charred logs of 160 with 143 end grain cross over a bed of 24 coals with three 236 embers. Rows 0–23 and columns 44–47 stay magenta.

#### Interaction / Transformed State Description:
`campfire_lit` (the hearth in use for cooking and light): the same ring with a flame 16 px wide and 22 px tall rising from the logs, leaning up-left so its tip ends at row 6, column 14: a 250 core, a 251 body, 235 edges and two detached 235 sparks above; no outline on the flame; the cobbles nearest the fire get a 251 pixel on their inner top edge. Its own file. When a site is sacked the catalog replaces the hearth with `bones_pile` (SEG-04).

#### Readability Check:
At zoom ⅓ the only grey ring on the map; lit, the only warm yellow flicker, so hearths are found at a glance.

Deliver: art/masters/campfire.png and art/masters/campfire_lit.png (48×48, magenta background) + a .json for each (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }; the lit file may carry 3 flame frames as animations { "lit": [0, 1, 2] }).

---

### floor_straw — Straw bed (AR-104)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn shape is 40 px wide and 24 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: a low pallet, its top lit, a 3-px south edge and a 2-px east edge shaded
- **Reference**: none extracted; nearest is the stock `Outside_B` hay tile 248 used today (reference only)
- **Palette Ramps**: Straw 2 `#F7E7A6` (lit strands), 3 `#F3DF79`, 136 `#CAB292` (mid), 138 `#AA8659` (shadow), 139 `#9A7141` (edges); Twine 143 `#5D350C`; Contact 129 `#454545`.

#### Primary State Visual Description:
A rounded rectangle 40 px wide (columns 4–43) and 20 px tall (rows 24–43) with 4 px of south edge on rows 44–47 in 138 and a 2-px east edge on columns 42–43 in 139; the top is 136 with hundreds of 1-px strands in 2 and 3 running diagonally up-left, a shallow oval hollow of 138 in the middle (rows 30–38, columns 14–32) where someone sleeps, and two twine bands of 143 crossing the pallet at columns 12 and 34. A 1-px 129 contact shadow lies on row 47 under the south edge; the outline 147 `#201408` is not used, the 139 edge does the work. Rows 0–23 stay magenta.

#### Interaction / Transformed State Description:
No second state in the engine (a bed is a bed; "dismantle" returns 2 straw and removes it). Sleeping colonists are drawn on top of it by their own sleep frame (AR-600).

#### Readability Check:
At zoom ⅓ a pale yellow oblong inside the walls, unlike the dashed stockpile square and the grey hearth ring.

Deliver: art/masters/floor_straw.png (48×48, magenta background) + art/masters/floor_straw.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### stockpile — Stockpile marker (AR-104)
- **Category**: Building
- **Dimensions**: exactly 48×48 (a flat marker filling its cell)
- **Anchor**: none (tile)
- **Projection**: flat (UI-like ground marker, no lean)
- **Reference**: none; today it is code-drawn (`UF_GenStockpile`, a dashed square)
- **Palette Ramps**: Border 137 `#BA9A71` (rope-coloured dashes), 139 `#9A7141` (dash shadow); Ground tint 136 `#CAB292` at low coverage; no outline.

#### Primary State Visual Description:
A square border 2 px thick inset 3 px from the cell edge (columns 3–44, rows 3–44), drawn as 6-px dashes of 137 with 4-px gaps and a 1-px 139 shadow line under each dash; the interior is empty except for a sparse scatter of 1-px 136 pixels (about one in twelve) so the ground shows through. Nothing else; items stacked on the stockpile are drawn on top of it by the engine.

#### Interaction / Transformed State Description:
No second state in the engine ("dismantle" removes it; items on it stay).

#### Readability Check:
At zoom ⅓ a faint dashed square reads as "storage here" without competing with the items on it.

Deliver: art/masters/stockpile.png (48×48, magenta background) + art/masters/stockpile.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### human — Human, adult, male and female (AR-400)
- **Category**: People
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn figure is 28 px wide and 34 px tall (the head 12 px of that)
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: the figure stands on its feet at the bottom-right region and leans up-left at 45°, so the head sits 12 px left of the feet; the top of the head and shoulders are lit, the front (south) is mid, the right (east) side dark
- **Reference**: `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265, male) and the `$U7_Eve_T0`/`T1` stand-in (shape 452, female); reference only, nothing copied ships
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, sleep; this brief is the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view. Clothing tiers T0–T3 (fiber wrap, hide cloak, tailored) and age stages (AR-601) are separate layer sheets on the same grid (SEG-11, SEG-17).
- **Palette Ramps**: Skin 32 `#FFDFBA` (lit), 105 `#E3C2B2`, 109 `#C68E75` (shade); Hair 143 `#5D350C`, 145 `#3D240C`; Tier-0 wrap 136 `#CAB292`, 138 `#AA8659`; Eyes 15 `#FFFFFF`, 147 `#201408`; Silhouette 147 `#201408`.

#### Primary State Visual Description:
Feet: two 6×3 px shapes of 145 on rows 45–47 at columns 26–31 and 33–38 with a 147 contact line. Legs (6 px wide each) climb 12 px while sliding 12 px left; the hips are at row 33, columns 16–30; the torso continues to the shoulders at row 22, columns 8–24 (16 px wide for the man, 13 px for the woman), and the head is a 10×12 oval on rows 9–21, columns 6–16, so the crown ends at row 9. Skin faces: the top of the head and the left shoulder in 32, the face and chest in 105 with 1-px micro-dither into 109 on the right (east) side of every limb; hair in 143 with 145 on its right and under the fringe (the woman's hair falls to the shoulders); eyes are two 147 pixels each with one 15 pixel to their upper-left; tier 0 is a hip wrap of 136 with 138 folds from row 33 to row 40. The outline 147 runs along the right and lower silhouette only. Rows 0–8, columns 0–5 and columns 39–47 stay magenta.

#### Interaction / Transformed State Description:
Clothing tiers (`fiber_wrap` at tier 1, `hide_cloak` at tier 2, tailored at tier 3) are layers over this body; carrying a tool shows the tool layer (SEG-17); `hurt` and `sleep` frames are columns of the same sheet. Death removes the unit (no corpse sprite in the engine yet).

#### Readability Check:
At zoom ⅓ a pale upright figure leaning up-left on its green stance square, distinct from the four-legged animals on yellow squares.

Deliver: art/masters/human_male.png and art/masters/human_female.png (the AR-600 sheet, 48×48 frames, magenta background) + a .json for each (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations per AR-600).

---

### deer — Deer (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn animal is 36 px wide and 38 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: hooves at the bottom-right region, the body leaning up-left, the back lit, the flank mid, the belly and east side dark
- **Reference**: `art/u7_reference_squares/u7_deer_48.png` (shape 502 at 1:1; reference only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns stand, walk ×3, flee ×3 (reuses the work columns), hurt; this brief is the south stand frame; W and E transposed, not mirrored.
- **Palette Ramps**: Coat 137 `#BA9A71` (lit back), 139 `#9A7141`, 140 `#8A5D2D` (flank), 142 `#6D3D0C` (belly, legs); Tail and chest 134 `#EBE3D7`; Antler 136 `#CAB292`; Eye and hooves 147 `#201408`.

#### Primary State Visual Description:
Four slender legs (2 px wide, 142) end in 147 hooves on row 47 between columns 26 and 40; the body rises 14 px while sliding 14 px left to a barrel 22 px long and 12 px deep on rows 24–36, columns 12–34, its back in 137 dithered into 139, its flank in 140 and its belly in 142. The neck climbs a further 10 px up-left to a narrow head on rows 8–16, columns 6–16, with two 147 eye pixels and a 134 chest patch below the throat; antlers of 136 branch 6 px above the head to row 2 (males; the female has none and a slightly smaller body). A 134 tail tuft sits at the rear on row 24, column 34. The outline 147 runs along the belly, the right side and under the jaw only; rows 0–1 and columns 41–47 stay magenta.

#### Interaction / Transformed State Description:
No carcass frame is used by the engine: a hunt (4–20 beats, the deer flees) removes the unit and drops 3 raw meat and 1 hide as item icons (SEG-07).

#### Readability Check:
At zoom ⅓ a tan long-legged shape taller than it is long, unlike the low dark boar and the grey wolf.

Deliver: art/masters/deer.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/deer.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "flee": [4, 5, 6], "hurt": [7] }).

---

### hare — Hare (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn animal is 20 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: a small crouched body at the bottom-right region with the ears leaning up-left
- **Reference**: `art/u7_reference_squares/u7_hare_48.png` (shape 811 at 1:1; reference only, nothing copied ships)
- **Sheet**: AR-600 layout as the deer (stand, walk ×3, flee ×3, hurt), rows S, W, E, N.
- **Palette Ramps**: Fur 136 `#CAB292` (lit), 137 `#BA9A71`, 139 `#9A7141` (shade); Belly and tail 134 `#EBE3D7`; Inner ear 107 `#D2A692`; Eye 147 `#201408`.

#### Primary State Visual Description:
A crouched oval body 16 px long and 10 px tall on rows 34–44, columns 22–38, hind feet of 139 touching row 47 at columns 30–37 with a 147 contact pixel under each; the head is a 8×8 rounded block on rows 28–36, columns 16–24, and two ears 3 px wide and 12 px long lean up-left from it to row 14, column 8, with 107 inside. The back and the tops of the ears are 136 with 1-px dither into 137; the flank 137; the underside and the east side 139; the belly and a 2×2 tail at column 38, row 36, are 134; one 147 eye pixel. Outline 147 along the lower and right edges only; rows 0–13, columns 0–7 and 39–47 stay magenta.

#### Interaction / Transformed State Description:
No carcass frame: a hunt removes the unit and drops 1 raw meat and 1 hide as item icons (SEG-07).

#### Readability Check:
At zoom ⅓ a small pale blob with two upright ears, the smallest animal on the map.

Deliver: art/masters/hare.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/hare.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "flee": [4, 5, 6], "hurt": [7] }).

---

### boar — Boar (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn animal is 36 px wide and 26 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: a low heavy body at the bottom-right region, the back leaning up-left, the ridge lit, the flank mid, the belly and east side dark
- **Reference**: none extracted (the stand-in is the `$U7_Dog` sheet, shape 496, tinted `#7a5a40`); nearest reference square is the deer for the lean of a four-legged animal
- **Sheet**: AR-600 layout as the deer (stand, walk ×3, flee ×3, hurt), rows S, W, E, N.
- **Palette Ramps**: Bristle 143 `#5D350C` (ridge), 142 `#6D3D0C`, 144 `#4D2D0C` (flank), 145 `#3D240C` (belly, legs); Snout 111 `#9A6D59`; Tusks 15 `#FFFFFF`; Eye and hooves 147 `#201408`.

#### Primary State Visual Description:
Four short legs (3 px wide, 145) with 147 hooves on row 47 between columns 24 and 42; the barrel is 26 px long and 14 px deep on rows 28–42, columns 14–40, rising 6 px up-left from the legs, its ridge a 2-px band of 143 with 1-px bristle ticks of 147 along the top, the flank 142 dithered into 144, the belly 145. The lowered head is a 12×10 wedge on rows 30–40, columns 6–18, ending in a 3×2 snout of 111 at column 6 with two tusks of 15 (1×2 px) either side of it; one 147 eye pixel at row 32, column 12; small triangular ears of 142 at row 28. The outline 147 runs along the belly, the right side and the snout's lower edge; rows 0–27 and columns 43–47 stay magenta.

#### Interaction / Transformed State Description:
No carcass frame: a hunt (the boar does not flee) removes the unit and drops 3 raw meat and 1 hide as item icons (SEG-07).

#### Readability Check:
At zoom ⅓ a low, wide, dark brown shape with two white points, the only animal that is longer than it is tall and darker than the ground.

Deliver: art/masters/boar.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/boar.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "flee": [4, 5, 6], "hurt": [7] }).

---

### wolf — Wolf (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution; the drawn animal is 38 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]`
- **Projection**: U7 2.5D oblique: paws at the bottom-right region, the body leaning up-left, the back lit, the flank mid, the underside and east side dark
- **Reference**: `art/u7_reference_squares/u7_wolf_48.png` (shape 537 at 1:1; reference only, nothing copied ships)
- **Sheet**: AR-600 layout with attack: stand, walk ×3, attack ×3, hurt; rows S, W, E, N.
- **Palette Ramps**: Pelt 122 `#AEAEAE` (lit back), 124 `#8E8E8E`, 126 `#6D6D6D` (flank), 128 `#515151` (underside); Muzzle and chest 149 `#DFD7D2`; Eye 5 `#EFCA28`; Nose, claws, outline 147 `#201408`.

#### Primary State Visual Description:
Four legs (3 px wide, 126 with 128 on their right) with 147 claws on row 47 between columns 22 and 42; the body is a lean barrel 24 px long and 11 px deep on rows 26–37, columns 12–36, rising 8 px up-left from the legs, its back 122 dithered into 124, its flank 126, its underside 128; a bushy tail of 124 with a 149 tip curves down to row 40 at column 40. The head is a 12×9 wedge on rows 18–27, columns 4–16, with erect 3-px ears of 124 to row 14, a 149 muzzle and chest, a 147 nose pixel and one 5 eye pixel. The outline 147 runs along the underside, the right side and the jaw; rows 0–13 and columns 43–47 stay magenta.

#### Interaction / Transformed State Description:
No carcass frame: a hunt removes the unit and drops 2 raw meat and 1 hide as item icons (SEG-07). The attack frames play on the map when it hunts or fights (V45).

#### Readability Check:
At zoom ⅓ a grey four-legged shape with pointed ears on a yellow (or red, when hostile) square, the only grey animal in temperate country.

Deliver: art/masters/wolf.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/wolf.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [4, 5, 6], "hurt": [7] }).
