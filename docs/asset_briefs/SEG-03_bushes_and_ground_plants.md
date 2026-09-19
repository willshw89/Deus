# Segment 03: bushes and ground plants (written 2026-09-18 by Claude Code)

The eighteen small plants of `docs/ASSET_REQUESTS.md` AR-103: the six that stand up and block a cell (berry bush full and picked, shrub, desert shrub, snow bush, the two cacti) and the twelve that lie flat and are drawn **under** units and items (`under: true` in `game/data/UF_WorldCatalog.json`: tall grass, reeds, the four wildflower patches, fern, lichen, wild grain, wild wheat, lily pads). Every state, yield, tint and tag below is read from the catalog and `docs/ASSET_INVENTORY.md` on 2026-09-18; where the engine has only one state the brief says so. Two of these (`grass_tuft`, `berry_bush`) also appear in `SEG-00_in_the_world_now.md`; this segment's version wins (it was checked later, and its numbers match the catalog).

Segment note: keep the twelve "under" plants low in the square (nothing above row 16, most of the mass below row 30) and low in contrast (no 147 silhouette line; their darkest pixel is a dark green or a dark straw colour), so a unit standing on the cell reads on top of them. The six blocking plants may use the 147 outline on their lower and right silhouette like every other object.

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares (`art/u7_reference_squares/`, approved composite `art/review/u7_square_composite.png`), every asset inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1). No 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible; the ground contact sits in the bottom-right region of the square and the shape climbs and slides up-left from it (`docs/GUIDE_25D.md`). Flat plants (lichen, lily pads) have no lean beyond a 1-px rim.
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for 32 colours or fewer per asset; 1-px micro-dither between neighbouring ramp steps is welcome; no gradients, no anti-aliasing against the background.
4. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0 or 255 after cleaning, no baked ground shadow (the engine draws shadows), plus the sidecar `art/masters/<id>.json` in the AR-600 form: frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }.
5. Open the reference named in each brief before drawing. A reference square (`art/u7_reference_squares/<key>_48.png`, with `catalog.json` beside it) or a stand-in sheet in `game/img/characters/` is a reference and a development stand-in only: nothing copied from it ships; the delivered file is original work in that manner.
6. Contained: nothing touches the top edge (row 0) or the right edge (column 47); the anchor is the bottom centre of the cell, [24, 47]; the engine positions every sprite by that anchor.
7. Under plants (see the segment note above): low, flat, no 147 outline; the engine draws them beneath units and items (`UF_Objects` gives `under` objects a z offset of -100) and units walk through them (`passable`).
8. Check each master: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated; palette, alpha, frame size and sidecar checks apply).
9. Export (`docs/ART_STANDARD.md` §5 step 8): the approved master is copied into `game/img/characters/` under the catalog's `image` name, with no scaling (masters are already at screen size). The eight objects that use stock RPG Maker tiles today (`tile` entries: snow bush, cactus, tall cactus, fern, lichen, wild grain, wild wheat, lily pads) switch to an `image` entry when their file lands, an `objects`-list edit Gemini may make per `docs/handoffs/HANDOFF_world_generation.md`; the tints that only exist to tell shared stand-ins apart (`berry_bush_bare`, `desert_shrub`, `flowers_purple`, `flowers_blue`, `flowers_white`, `lichen`) are dropped at the same time.
10. Mark the AR-103 row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name(s), one line per delivered id.
11. The user approves each asset before it ships (`art/APPROVALS.md`); until then the stand-in stays in the game.
12. Order: the two anchors that touch this family first (`berry_bush`, then `bush`), then the rest of this file top to bottom; verify any brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-03_bushes_and_ground_plants.md`.

---

### berry_bush — Berry bush (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 34 px wide and 26 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a low rounded mound whose height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top is lit, the south and east faces are shaded
- **Reference**: `art/u7_reference_squares/u7_berry_bush_48.png` (SHAPES.VGA shape 672 at 1:1, 29×28 px; a reference only, nothing copied ships): a dark two-lobed mound lit from the upper left, a few red-brown dots on it, and a patch of bare earth at its lower right
- **Palette Ramps**: Leaf 200 `#86D200` (lit top), 241 `#45B645`, 242 `#189218` (south face), 243 `#006D00` (east face), 70 `#005100` (pockets); Berries 24 `#C20C1C` (body), 21 `#FF394D` (catchlight), 28 `#510000` (shadow side); Twig 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The ground contact is a 24-px-wide band on rows 45–47, columns 16–39, in 243 with a 1-px 147 contact line on row 47 and a 4-px twig stub of 143 showing at columns 34–37, rows 43–46. Above it the mound is three overlapping leaf clusters 34 px wide (columns 8–41) and 26 px tall (rows 22–47): the largest lobe is centred at row 34, column 22, a smaller one at row 30, column 34, and because the bush leans up-left its crown reaches row 22 at column 16 while its right flank ends at row 40, column 41. The upper-left third of each lobe is 200 with 1-px micro-dither into 241, the middle band 242, the south face (rows 38–44) and the whole east flank (columns 34–41) 243, with 70 in the two pockets where lobes meet. Fourteen berries of 2×2 px in 24, each with one 21 pixel at its upper-left corner and one 28 pixel at its lower-right, sit on the lit top and the middle band, none on the east flank. The 147 outline runs only where the mound meets the background along its lower and right sides; the lit upper-left edge has none. Rows 0–21 and columns 42–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
"gather" (work 40 in the catalog's `work` units; yields 2 Berries) turns it into `berry_bush_bare`, which regrows into this object after 48 hours: its own brief and file, next in this file. The bush blocks movement (colonists work from a neighbouring cell). No other engine state.

#### Readability Check:
At zoom ⅓ the red flecks on a low green mound separate it from the plain shrub (no dots, an open spiky fan) and from the tall grass (a flat bright fan drawn under units).

Deliver: art/masters/berry_bush.png (48×48, magenta background) + art/masters/berry_bush.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### berry_bush_bare — Berry bush (picked) (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 34 px wide and 26 px tall (the same silhouette as the full bush)
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the same low mound as the full bush, height leaning up and to the left at 45°; top lit, south and east faces shaded
- **Reference**: `art/u7_reference_squares/u7_berry_bush_48.png` (SHAPES.VGA shape 672 at 1:1; a reference only, nothing copied ships), and the delivered `berry_bush` master, whose silhouette this file repeats pixel for pixel
- **Palette Ramps**: Leaf 241 `#45B645` (top, one step duller than the full bush), 242 `#189218`, 243 `#006D00`, 70 `#005100`; Dull dither 168 `#71864D`; Twig 143 `#5D350C`, 141 `#7D4D18` (bare twig ends); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Same silhouette and same base as `berry_bush`: the contact band on rows 45–47, columns 16–39 with its 147 line on row 47 and the 143 twig stub at columns 34–37; three lobes over columns 8–41 and rows 22–47 with the crown at row 22, column 16 and the right flank ending at row 40, column 41; copy the full bush's mask exactly so the two files swap without a jump. Every berry pixel becomes the leaf colour around it. The lit upper-left third is 241 (not 200) with 1-px micro-dither into 168 so the picked bush reads duller, the middle band 242, the south face (rows 38–44) and the east flank (columns 34–41) 243, the pockets 70. Where the six largest berry clusters were, a 1–2 px bare twig end of 141 pokes out of the leaves between rows 26 and 36. The 147 outline runs along the lower and right silhouette only. Rows 0–21 and columns 42–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
The engine has no action on this object: it `regrow`s into `berry_bush` after 48 hours, and it is the after-state of the berry bush's "gather". Today the engine draws the full bush's stand-in tinted #a8b898 to stand for it; with this master in place that `tint` is not needed and is dropped when the file is integrated.

#### Readability Check:
At zoom ⅓ a green mound the size of the berry bush with no red flecks and a greyer top, readable as "picked, growing back" next to a full bush.

Deliver: art/masters/berry_bush_bare.png (48×48, magenta background) + art/masters/berry_bush_bare.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### bush — Shrub (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 38 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a fan of leaves rising from a small woody base and leaning up and to the left at 45°; the lit faces of the leaves are on their upper-left halves, the shaded underside and east side of the clump are dark
- **Reference**: the `!$U7_Shrub` stand-in in `game/img/characters/` (SHAPES.VGA shape 619 at 1:1; a reference only, nothing copied ships): a bright fan of pointed leaves spreading up-left from a small brown base at the lower right
- **Palette Ramps**: Leaf 200 `#86D200` (lit tips), 241 `#45B645`, 242 `#189218`, 243 `#006D00`, 70 `#005100` (pockets); Stem 141 `#7D4D18`, 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is a knot of stems 8 px wide on rows 42–47, columns 30–37, in 143 with 141 on its left edge and a 147 contact line on row 47. From it eleven to thirteen pointed leaves 3–5 px wide and 12–24 px long fan out and lean up-left: the longest reaches row 18, column 8; the right-hand leaves stay short and end at row 34, column 43; together they cover columns 6–43 and rows 18–47. Each leaf is 241 along its upper-left half with a 1-px 200 tip and 1-px micro-dither on the boundary, 242 along its lower-right half, and 243 where it passes under another leaf; the underside of the clump (rows 40–46) and its east side (columns 38–43) are 243 with 70 pockets. The 147 outline follows the lower and right silhouette only; the lit tips have none. Rows 0–17, columns 0–5 and columns 44–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 40, yields 2 Plant fiber) removes it (`becomes` null): the cell shows bare ground; there is no second sprite and no regrow entry. It blocks movement, so colonists work from a neighbouring cell. `desert_shrub` is a separate object with its own brief and file.

#### Readability Check:
At zoom ⅓ an open spiky green fan taller than the berry bush's rounded mound, without red dots, and with a visible dark base that the tall grass tuft (drawn under units) lacks.

Deliver: art/masters/bush.png (48×48, magenta background) + art/masters/bush.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### desert_shrub — Desert shrub (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 24 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: thin twigs rising from a woody crown and leaning up and to the left at 45°; leaf clusters are lit on their upper-left and shaded on their lower-right
- **Reference**: none; the nearest is the shrub stand-in `!$U7_Shrub` in `game/img/characters/` (SHAPES.VGA shape 619), which the engine tints for this object today (a reference only, nothing copied ships)
- **Palette Ramps**: Leaf 202 `#7D9600` (lit), 168 `#71864D`, 169 `#5D7139`, 170 `#4D5D28` (shade); Twig 139 `#9A7141` (lit edge), 141 `#7D4D18`, 143 `#5D350C` (crown); Dry tips 136 `#CAB292`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is a woody crown of 143, 6 px wide, on rows 43–47, columns 30–35, with a 147 contact line on row 47. Six to eight thin twigs (1–2 px wide, 141 with a 139 pixel on their lit left edge every 3 px) spread and lean up-left from it over columns 10–41 and rows 24–46, the longest reaching row 24, column 12; between the twigs the shape is mostly background, so the sand shows through. Sparse leaf clusters of 3×2 to 5×3 px hang on the twigs: 202 on their upper-left, 168 in the middle, 169 on the lower-right, 170 where two clusters overlap, with 1-px micro-dither between 202 and 168; four or five twig ends carry a single 136 dry tip. There are no solid faces, so the 147 outline is only under the crown and along the right-most twig. Rows 0–23, columns 0–9 and columns 42–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 40, yields 1 Plant fiber) removes it (`becomes` null); no second sprite and no regrow entry. Today the engine shows the shrub stand-in tinted #d8c898 for this object; with this master the `tint` is not needed and is dropped at integration. It blocks movement. No second state in the engine.

#### Readability Check:
At zoom ⅓ a sparse olive scribble on sand, open where the shrub is a solid green fan, and browner than any grass.

Deliver: art/masters/desert_shrub.png (48×48, magenta background) + art/masters/desert_shrub.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### snow_bush — Snow bush (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 24 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a dense evergreen mound leaning up and to the left at 45°, snow on its lit top surfaces, its south and east faces shaded
- **Reference**: none (today the stock `Outside_B` tile 232, an upright RPG Maker tile, reference only); the nearest reference square for the mound is `art/u7_reference_squares/u7_berry_bush_48.png` (SHAPES.VGA shape 672; a reference only, nothing copied ships)
- **Palette Ramps**: Snow 118 `#EFEFEF` (lit caps), 119 `#DFDFDF`, 121 `#BEBEBE` (cap shadow); Needle 243 `#006D00`, 70 `#005100`, 71 `#003500` (deep pockets); Twig 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A dense evergreen mound 32 px wide (columns 9–40) and 24 px tall (rows 24–47) with its ground contact on rows 45–47, columns 14–38, and a 147 contact line on row 47; the crown leans up-left to row 24, column 16, and the right flank ends at row 40, column 40. The foliage is 243 with 1-px micro-dither into 70 on the south face (rows 38–44) and solid 70 with 71 pockets on the east flank (columns 33–40). Snow lies on every lit top surface: three caps of 118, 3–5 px tall and 8–14 px wide, on rows 24–34, each with 119 on its right half and a 1-px 121 line along its underside, plus five or six single 118 flecks lower on the mound. Two 143 twig ends show at the lower left between rows 40 and 44. The 147 outline runs along the lower and right silhouette only; the snow caps have no outline. Rows 0–23 and columns 41–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 40, yields 1 Plant fiber) removes it (`becomes` null); no second sprite and no regrow entry. It blocks movement. No second state in the engine.

#### Readability Check:
At zoom ⅓ a dark green mound with white caps on snow or tundra ground, where the plain shrub is bright and open and the berry bush carries red.

Deliver: art/masters/snow_bush.png (48×48, magenta background) + art/masters/snow_bush.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### cactus — Cactus (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 34 px wide and 34 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a ribbed barrel standing on its base at the bottom-right region and leaning up and to the left at 45°; the top is lit, the south face mid, the east third of the body dark
- **Reference**: none (today the stock `Outside_B` tile 238, reference only); the nearest reference square for a single leaning column is `art/u7_reference_squares/u7_pine_tree_48.png` (SHAPES.VGA shape 306 shrunk to 0.80; a reference only, nothing copied ships)
- **Palette Ramps**: Body 240 `#7DDF7D` (lit rib crests), 241 `#45B645`, 242 `#189218` (south face), 243 `#006D00` (east face), 70 `#005100` (rib grooves); Spines 134 `#EBE3D7`; Fruit 24 `#C20C1C`, 21 `#FF394D`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A barrel body 14 px wide has its ground contact on rows 44–47, columns 26–39, with a 147 contact line on row 47; it climbs 26 px while sliding 20 px left, so its rounded top sits on rows 14–18, columns 6–19. A single arm 6 px wide leaves the right side of the body at row 30, steps out to column 32 and curls up to end at row 22, column 26, keeping the same lean. Eight vertical ribs run the length of the body and the arm: each rib's left crest is a 1-px line of 240 dithered into 241, its groove a 1-px line of 70, the south face between grooves 242, and the east third of every limb (its right 5 px) 243 with grooves in 70. Spines are single 134 pixels every 4 px along each crest. Three fruits of 3×3 px in 24 with one 21 pixel each sit on the crown between rows 14 and 16. The 147 outline follows the lower and right silhouette only. Rows 0–13, columns 0–5 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 50, yields 1 Fruit) removes it (`becomes` null): bare ground, no picked-cactus sprite, no regrow entry. It blocks movement. No second state in the engine.

#### Readability Check:
At zoom ⅓ a short ribbed green barrel with red points on top, half the height of the tall cactus and the only rounded green shape on sand.

Deliver: art/masters/cactus.png (48×48, magenta background) + art/masters/cactus.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### cactus_tall — Tall cactus (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 34 px wide and 45 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a tall ribbed column with two arms, standing at the bottom-right region and leaning up and to the left at 45°; lit crests on the left of every rib, the south face mid, the east third of every limb dark
- **Reference**: none (today the stock `Outside_B` tile 174, reference only); the nearest reference square for the lean of one tall stem is `art/u7_reference_squares/u7_pine_tree_48.png` (SHAPES.VGA shape 306 shrunk to 0.80; a reference only, nothing copied ships)
- **Palette Ramps**: Body 241 `#45B645` (lit crests), 242 `#189218` (south face), 243 `#006D00` (east face), 70 `#005100` (grooves), 71 `#003500` (grooves on the east side); Spines 134 `#EBE3D7` (lit), 136 `#CAB292` (shaded); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The main column is 10 px wide; its ground contact is rows 44–47, columns 30–39, with a 147 contact line on row 47, and it climbs to a rounded crown on rows 3–8, columns 12–21, sliding 18 px left over its 40 px of height (the same overall diagonal as the pine reference, which reads as the 45° lean at this size). Two arms 6 px wide leave the column: the left one at row 30 steps out to column 6 and turns up to end at row 14, column 8; the right one at row 22 steps out to column 36 and ends at row 12, column 30. Each limb carries eight ribs: 1-px crests of 241, grooves of 70 (71 on the east third), 242 on the south face between them, 243 over the east third of every limb, with 1-px micro-dither where 241 meets 242. Spines are single 134 pixels every 4 px on the lit crests and 136 on the shaded side. The 147 outline follows the lower and right silhouette only. Rows 0–2, columns 0–5 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"chop" (work 80, yields 2 Plant fiber) removes it (`becomes` null): there is no stump object for a cactus and no regrow entry. It blocks movement. No second state in the engine.

#### Readability Check:
At zoom ⅓ the tallest thing in a desert, a green fork leaning up-left, twice the height of the short cactus and without its red points.

Deliver: art/masters/cactus_tall.png (48×48, magenta background) + art/masters/cactus_tall.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### grass_tuft — Tall grass (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 30 px wide and 20 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: blades lean up and to the left at 45° from a low root; an under-plant, so there is no south or east face beyond the blade shading
- **Reference**: the `!$U7_TallGrass` stand-in in `game/img/characters/` (SHAPES.VGA shape 321 at 1:1; a reference only, nothing copied ships): yellow-green blades leaning up-left from a small dark root
- **Palette Ramps**: Blade 201 `#86B200` (lit tips), 241 `#45B645`, 242 `#189218`, 243 `#006D00` (base and crossings); Dry tips 202 `#7D9600`; Root 144 `#4D2D0C`; no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
The root is a dark patch of 243, 10 px wide, on rows 44–47, columns 22–31, with a 2-px 144 contact line on row 47 under its right half. Eleven to thirteen blades 1–2 px wide and 8–18 px long fan up-left from it: the tallest tip ends at row 28, column 12 and the shortest right-hand blade at row 40, column 38, so the clump covers columns 10–39 and rows 28–47. Blades are 242 for their lower third, 241 in the middle and 201 on their last 3 px, with two tips in 202 to read as drying; where blades cross, the rear one is 243 for 2 px. No 147 outline anywhere: the darkest pixel is 243, so a unit standing on the cell reads on top (the engine draws this object under units). Rows 0–27, columns 0–9 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 20, yields 1 Plant fiber) removes it (`becomes` null): bare ground; the catalog has no regrow entry for it and there is no second sprite. It is `passable` and drawn under units and items (`under`).

#### Readability Check:
At zoom ⅓ a small bright fan on the ground, shorter and yellower than the reeds and paler than the fern's dark arching fronds.

Deliver: art/masters/grass_tuft.png (48×48, magenta background) + art/masters/grass_tuft.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### reeds — Reeds (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 26 px wide and 32 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: straight stems lean up and to the left at 45° from a low wet clump; an under-plant, so the only shading is the lit left edge of each stem
- **Reference**: the `!$U7_Reeds` stand-in in `game/img/characters/` (SHAPES.VGA shape 323 at 1:1; a reference only, nothing copied ships): straight grey-green stems with brown heads leaning up-left over a dark clump
- **Palette Ramps**: Stem 166 `#9EAE7D` (lit edge), 168 `#71864D`, 169 `#5D7139`, 171 `#415120` (base); Seed heads 138 `#AA8659` (lit), 140 `#8A5D2D`, 143 `#5D350C` (shade); no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
The base is a wet clump of 171, 12 px wide, on rows 44–47, columns 22–33, with no separate contact line (171 is the darkest pixel of the asset). Nine straight stems 1 px wide rise from it, each leaning up-left at the same angle so the stand slides 12 px left over its 30 px of height: the tallest ends at row 16, column 12 and the shortest at row 30, column 34, covering columns 10–35 and rows 16–47. Each stem is 168 with a 1-px 166 lit edge on its left for its upper half and 169 for its lower third; four of the stems carry a 2×6 px seed head of 140 with 138 on its upper-left and 143 on its lower-right, and the rest end in a 2-px blade of 166. Three 1-px leaf blades of 169 hang off the stems between rows 30 and 40. No 147 outline (the object is drawn under units). Rows 0–15, columns 0–9 and columns 36–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 30, yields 2 Straw) removes it (`becomes` null); no second sprite and no regrow entry. It is `passable` and drawn under units and items (`under`).

#### Readability Check:
At zoom ⅓ a narrow upright stand of grey-green lines with brown tips, taller and straighter than the tall grass's fan and duller than any leaf green.

Deliver: art/masters/reeds.png (48×48, magenta background) + art/masters/reeds.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### flowers — Wildflowers (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 17 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a nearly flat leaf mat with short stalks leaning up and to the left at 45°; the mat is lit on its upper-left half and shaded along its lower-right edge
- **Reference**: the `!$U7_Wildflowers` stand-in in `game/img/characters/` (SHAPES.VGA shape 314 at 1:1; a reference only, nothing copied ships): a low mat of grey-green leaves with small pale heads
- **Palette Ramps**: Leaf 241 `#45B645` (lit), 242 `#189218`, 243 `#006D00` (under-leaf, stalks); Heads 250 `#FFD200` (yellow), 234 `#FFC228`, 21 `#FF394D` (red), 24 `#C20C1C`; Centres 15 `#FFFFFF`; no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
A leaf mat 32 px wide (columns 8–39) and 10 px tall (rows 37–47) touches the ground along row 47 with no contact line; the mat is 242 with 1-px micro-dither into 241 over its upper-left half and 243 along its lower-right edge and in the gaps between leaves, so it sits almost flat. Nine flower heads of 3×3 px stand on 1-px 243 stalks 2–6 px tall that lean up-left, the highest head at row 31, column 12 and the lowest at row 38, column 36: five heads in 250 with a 234 pixel at their lower-right, four in 21 with a 24 pixel at their lower-right, each with a single 15 centre pixel. No 147 outline; the darkest pixel is 243 (the object is drawn under units). Rows 0–30, columns 0–7 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: nothing interacts with wildflowers (no `actions`, no `regrow`); they are `passable` and drawn under units and items (`under`). `flowers_purple`, `flowers_blue` and `flowers_white` are separate catalog objects with the same leaf mat and their own heads: their own briefs and files, next in this file.

#### Readability Check:
At zoom ⅓ warm yellow and red specks on a green patch, unlike the cool single-colour patches of the purple, blue and white variants.

Deliver: art/masters/flowers.png (48×48, magenta background) + art/masters/flowers.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### flowers_purple — Purple flowers (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 17 px tall (the wildflowers' mat)
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the wildflowers' flat leaf mat with short stalks leaning up and to the left at 45°
- **Reference**: the `!$U7_Wildflowers` stand-in in `game/img/characters/` (SHAPES.VGA shape 314, which the engine tints for this object today; a reference only, nothing copied ships), and the delivered `flowers` master, whose leaf layer this file repeats
- **Palette Ramps**: Leaf 241 `#45B645`, 242 `#189218`, 243 `#006D00`; Heads 89 `#D79AD7` (lit), 90 `#C66DC6` (body), 91 `#B249B2` (shadow); Centres 250 `#FFD200`; no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
Identical mat and stalk positions to `flowers`: the leaf mat on rows 37–47, columns 8–39 (242 dithered into 241 on the upper-left, 243 along the lower-right edge and in the gaps), nine 1-px 243 stalks leaning up-left with the highest head at row 31, column 12; reuse that file's leaf layer pixel for pixel so the four patches sit the same on the ground. Every head is a 3×3 block of 90 with an 89 pixel at its upper-left corner, a 91 pixel at its lower-right corner and a single 250 centre. No 147 outline; the darkest pixel is 243. Rows 0–30, columns 0–7 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: nothing interacts with it (no `actions`, no `regrow`); it is `passable` and drawn under units and items. Today the engine shows the wildflowers stand-in tinted #d0a0ff for this object; with this master the `tint` is not needed and is dropped at integration.

#### Readability Check:
At zoom ⅓ a violet-specked patch, the only purple on the ground, on the same green mat as the other flower patches.

Deliver: art/masters/flowers_purple.png (48×48, magenta background) + art/masters/flowers_purple.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### flowers_blue — Blue flowers (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 17 px tall (the wildflowers' mat)
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the wildflowers' flat leaf mat with short stalks leaning up and to the left at 45°
- **Reference**: the `!$U7_Wildflowers` stand-in in `game/img/characters/` (SHAPES.VGA shape 314, which the engine tints for this object today; a reference only, nothing copied ships), and the delivered `flowers` master, whose leaf layer this file repeats
- **Palette Ramps**: Leaf 241 `#45B645`, 242 `#189218`, 243 `#006D00`; Heads 74 `#BABAFF` (lit), 76 `#7D7DFF` (body), 77 `#5D5DFF` (shadow); Centres 250 `#FFD200`; no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
Identical mat and stalk positions to `flowers`: the leaf mat on rows 37–47, columns 8–39 (242 dithered into 241 on the upper-left, 243 along the lower-right edge and in the gaps), nine 1-px 243 stalks leaning up-left with the highest head at row 31, column 12; reuse that file's leaf layer pixel for pixel. Every head is a 3×3 block of 76 with a 74 pixel at its upper-left corner, a 77 pixel at its lower-right corner and a single 250 centre. No 147 outline; the darkest pixel is 243. Rows 0–30, columns 0–7 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: nothing interacts with it (no `actions`, no `regrow`); it is `passable` and drawn under units and items. Today the engine shows the wildflowers stand-in tinted #a0c0ff for this object; with this master the `tint` is not needed and is dropped at integration.

#### Readability Check:
At zoom ⅓ a blue-specked green patch, cooler than the purple patch and never on water, which is where the only other blue lies.

Deliver: art/masters/flowers_blue.png (48×48, magenta background) + art/masters/flowers_blue.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### flowers_white — White flowers (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 17 px tall (the wildflowers' mat)
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the wildflowers' flat leaf mat with short stalks leaning up and to the left at 45°
- **Reference**: the `!$U7_Wildflowers` stand-in in `game/img/characters/` (SHAPES.VGA shape 314, which the engine tints for this object today; a reference only, nothing copied ships), and the delivered `flowers` master, whose leaf layer this file repeats
- **Palette Ramps**: Leaf 241 `#45B645`, 242 `#189218`, 243 `#006D00`; Heads 15 `#FFFFFF` (lit), 118 `#EFEFEF` (body), 120 `#CECECE` (shadow); Centres 250 `#FFD200`; no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
Identical mat and stalk positions to `flowers`: the leaf mat on rows 37–47, columns 8–39 (242 dithered into 241 on the upper-left, 243 along the lower-right edge and in the gaps), nine 1-px 243 stalks leaning up-left with the highest head at row 31, column 12; reuse that file's leaf layer pixel for pixel. Every head is a 3×3 block of 118 with a 15 pixel at its upper-left corner, a 120 pixel at its lower-right corner and a single 250 centre. No 147 outline; the darkest pixel is 243. Rows 0–30, columns 0–7 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: nothing interacts with it (no `actions`, no `regrow`); it is `passable` and drawn under units and items. Today the engine shows the wildflowers stand-in tinted #f0f0f0 for this object; with this master the `tint` is not needed and is dropped at integration.

#### Readability Check:
At zoom ⅓ white specks on a flat green patch: the green mat separates it from the snow bush (a raised dark mound with white caps) and the yellow centres from the lichen (a pale flat crust with no heads).

Deliver: art/masters/flowers_white.png (48×48, magenta background) + art/masters/flowers_white.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### fern — Fern (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 34 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: fronds arch out of a low crown and lean up and to the left at 45°; an under-plant, so the shading is the lit upper-left leaflets against dark undersides
- **Reference**: none (today the stock `Outside_B` tile 246, reference only); the nearest stand-in for a fan of fronds is `!$U7_Shrub` in `game/img/characters/` (SHAPES.VGA shape 619; a reference only, nothing copied ships)
- **Palette Ramps**: Frond 241 `#45B645` (lit leaflet tips), 242 `#189218`, 243 `#006D00`, 70 `#005100` (under-frond); Midrib 168 `#71864D`; Crown 144 `#4D2D0C`; no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
A crown of 144, 6 px wide, sits on rows 44–47, columns 26–31, with no separate contact line. Six fronds 3–4 px wide and 14–22 px long arch out of it: three lean up-left (the longest tip at row 26, column 10), one short one points up-left to row 32, column 22, and two curl right and end low at row 40, columns 38–41 and row 42, column 35; the fern covers columns 8–41 and rows 26–47. Each frond is a 1-px 168 midrib with 2-px leaflets on both sides: leaflets are 242 with a 241 tip on the three upper-left fronds, 243 on the two right-hand fronds and on every underside, and 70 where fronds cross; 1-px micro-dither between 242 and 243 runs along the middle of each frond. No 147 outline (the object is drawn under units; 70 is the darkest pixel). Rows 0–25, columns 0–7 and columns 42–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 20, yields 1 Plant fiber) removes it (`becomes` null); no second sprite and no regrow entry. It is `passable` and drawn under units and items (`under`).

#### Readability Check:
At zoom ⅓ a dark arching green shape low on the forest floor, darker and more spread than the tall grass fan and without the shrub's raised woody base.

Deliver: art/masters/fern.png (48×48, magenta background) + art/masters/fern.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### lichen — Lichen (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 30 px wide and 12 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: flat (a crust on the ground): no height beyond a 1-px rim on each patch's lower and right edge, so there is no lean and no south or east face
- **Reference**: none (today the stock `Outside_B` tile 251 under the catalog's tint, reference only); no reference square is a crust, so the nearest is the low ground-hugging `art/u7_reference_squares/u7_ironstone_48.png` (SHAPES.VGA shape 341) for how a flat shape sits on its cell (a reference only, nothing copied ships)
- **Palette Ramps**: Crust 163 `#E3EBD7` (lit), 164 `#CAD7B6` (body), 165 `#B6C29A`, 166 `#9EAE7D` (rim), 167 `#8A9A61` (gaps); Rock speck 150 `#CEC6BE`; no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
A flat crust 30 px wide (columns 10–39) and 12 px tall (rows 36–47) made of five or six lobed patches 6–12 px across that touch or overlap; there is no lean: each patch's only "face" is a 1-px 166 line along its lower and right edge. Patch interiors are 164 with 1-px micro-dither into 163 over their upper-left halves and into 165 towards their lower-right; 167 fills the 1-px gaps where patches meet, and four or five single 150 pixels show the rock through. Nothing rises above row 36 and nothing is darker than 167 (the object is drawn under units); no 147 anywhere. Rows 0–35, columns 0–9 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: nothing interacts with lichen (no `actions`, no `regrow`); it is `passable` and drawn under units and items (`under`). Today the stock tile is shown tinted #c8d8c8; with this master the `tint` is not needed and is dropped at integration.

#### Readability Check:
At zoom ⅓ a pale flat grey-green stain on rock or tundra, lower and paler than any leaf plant and without the white flowers' heads.

Deliver: art/masters/lichen.png (48×48, magenta background) + art/masters/lichen.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### wild_grain — Wild grain (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 26 px wide and 28 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: thin stems lean up and to the left at 45° from a low base; an under-plant, so the shading is the lit left edge of each stem and the shadow under each nodding head
- **Reference**: none (today the stock `Outside_B` tile 172, reference only); the nearest stand-in for a leaning clump of stems is `!$U7_TallGrass` in `game/img/characters/` (SHAPES.VGA shape 321; a reference only, nothing copied ships)
- **Palette Ramps**: Stem 201 `#86B200` (lit), 202 `#7D9600`, 203 `#697900` (base); Seed heads 3 `#F3DF79` (lit), 4 `#EFD251`, 6 `#DBAE20`, 7 `#C69618` (shadow); no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
The base is 203, 10 px wide, on rows 44–47, columns 24–33, with no separate contact line. Ten stems 1 px wide rise and lean up-left from it, sliding 10 px left over 26 px of height, so the stand covers columns 12–37 and rows 20–47 with the tallest head at row 20, column 14. Stems are 202 with a 201 lit pixel every 3 px along their left edge; each of the seven tallest ends in a loose drooping seed head 3 px wide and 6–7 px long built of 2×1 px grains, 3 on the upper-left grains, 4 in the middle, 6 on the lower-right, and a single 7 pixel under each head where it nods over; the three short stems end in a 2-px 201 blade. No 147 outline; 203 and 7 are the darkest pixels (the object is drawn under units). Rows 0–19, columns 0–11 and columns 38–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 30, yields 1 Seeds and 1 Straw) removes it (`becomes` null); no second sprite and no regrow entry. It is `passable` and drawn under units and items (`under`).

#### Readability Check:
At zoom ⅓ a green clump with pale yellow nodding tips, greener and looser than the wild wheat's golden upright ears and yellower at the tips than the tall grass.

Deliver: art/masters/wild_grain.png (48×48, magenta background) + art/masters/wild_grain.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### wheat_wild — Wild wheat (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 26 px wide and 32 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: straight stems lean up and to the left at 45° from a low base; an under-plant, so the shading is the lit left edge of every other stem and the shadow under each ear
- **Reference**: none (today the stock `Outside_B` tile 173, reference only); the nearest stand-in for straight stems with heads is `!$U7_Reeds` in `game/img/characters/` (SHAPES.VGA shape 323; a reference only, nothing copied ships)
- **Palette Ramps**: Stem 137 `#BA9A71` (lit), 138 `#AA8659`, 139 `#9A7141` (base); Ears 2 `#F7E7A6` (lit), 4 `#EFD251`, 5 `#EFCA28`, 7 `#C69618`, 8 `#B28210` (shadow); Awns 1 `#FBF3CE`; no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
The base is 139, 10 px wide, on rows 44–47, columns 24–33, with no separate contact line. Twelve straight stems 1 px wide in 138 (137 along the lit left edge of every other stem) rise and lean up-left, sliding 10 px left over 30 px of height: the stand covers columns 12–37 and rows 16–47, the tallest ear ending at row 16, column 14. Each stem ends in an upright ear 3 px wide and 7–8 px long built of paired 1-px grains: 2 on the upper-left grains, 4 in the middle, 5 on the right, 7 under the ear and 8 where two ears overlap; 1-px awns of 1 stick 2 px above and to the left of each ear. Two or three dry leaf blades of 138 hang off the stems between rows 34 and 42. No 147 outline; 139 and 8 are the darkest pixels (the object is drawn under units). Rows 0–15, columns 0–11 and columns 38–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
"gather" (work 30, yields 1 Seeds and 1 Straw) removes it (`becomes` null); no second sprite and no regrow entry. It is `passable` and drawn under units and items (`under`).

#### Readability Check:
At zoom ⅓ a golden upright stand, straw-coloured from base to tip, unlike the wild grain's green stems and the reeds' grey-green stems with brown heads.

Deliver: art/masters/wheat_wild.png (48×48, magenta background) + art/masters/wheat_wild.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### lily_pad — Lily pads (AR-103)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 38 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: flat (floating on the water surface): the pads have no height, so there is no lean and no south or east face; only a 1-px darker rim on each pad's lower and right edge says it sits on the water
- **Reference**: none (today the stock `Outside_B` tile 253, reference only); no reference square is a water plant, so the nearest guides are the lichen brief above for a flat under-plant and the water autotiles the pads float on (AR-101)
- **Palette Ramps**: Pad 240 `#7DDF7D` (lit rim), 241 `#45B645` (top), 242 `#189218` (shade), 243 `#006D00` (rim, notch); Flower 15 `#FFFFFF` (petals), 17 `#FFBABA` (petal shade), 250 `#FFD200` (centre); no 147 outline; background `#FF00FF`.

#### Primary State Visual Description:
Four round pads seen from straight above lie in the lower half of the square: a 15-px pad on rows 32–46, columns 21–35; a 12-px pad on rows 35–46, columns 8–19; a 10-px pad on rows 29–38, columns 36–45; and a 6-px pad on rows 41–46, columns 37–42; each has a V-shaped notch of background 2–3 px wide cut from its lower-right edge towards its centre. Pad tops are 241 with 1-px micro-dither into 240 across the upper-left third and into 242 across the lower-right third, and a 1-px 243 rim only along the lower and right edges of each pad (no 147 anywhere). One flower 5 px across sits on the largest pad centred at row 36, column 26: five 15 petals each with a 17 pixel at its lower-right and a single 250 centre. Everything else, including the water between and around the pads, stays magenta so the animated water tile shows through; rows 0–28, row 47, columns 0–7 and columns 46–47 are empty (the pads float, so nothing needs to touch the contact row); nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: nothing interacts with lily pads (no `actions`, no `regrow`); the world generator places them only on water cells (`onWater`), they are `passable` and drawn under units and items (`under`).

#### Readability Check:
At zoom ⅓ round green discs on blue water with one white point, the only green on a water cell; the notch keeps them from reading as flat stones.

Deliver: art/masters/lily_pad.png (48×48, magenta background) + art/masters/lily_pad.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).
