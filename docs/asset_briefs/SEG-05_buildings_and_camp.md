# Segment 05: buildings and camp (written 2026-09-18 by Claude Code)

The six site pieces a faction builds with: the hearth, the two wall sets, the straw bed, the stockpile marker and the work stone. Every one of them is a stock RPG Maker tile, a stand-in or a code-drawn shape today (`docs/ASSET_INVENTORY.md`). `SEG-00` holds earlier briefs for four of these ids; where the two disagree, this file wins (SEG-00 says the same).

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares; every asset inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); no 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible; the base sits in the bottom-right region of the square (`docs/GUIDE_25D.md`). The wall sets in this segment add a north face by the user's rule of 2026-09-18 (STATUS K18).
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for ≤ 32 colours per asset; micro-dither is welcome; no gradients and no anti-aliasing against the background.
4. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0/255 after cleaning; no baked ground shadow (the engine draws shadows).
5. Sidecar: `art/masters/<id>.json` per AR-600 (frameWidth, frameHeight, anchor [24, 47], facings, animations; the wall sets also list their pieces by name).
6. Open the reference square named in each brief before drawing (`art/u7_reference_squares/`) and the approved composite `art/review/u7_square_composite.png`; they are references and development stand-ins: nothing copied from them ships.
7. Contained: nothing touches the top edge (row 0) or the right edge (column 47), except a wall piece exactly where a neighbouring wall connects; the anchor is the bottom centre of the cell, [24, 47].
8. Export = copy the approved master into `game/img/characters/` under the name the catalog will use (`docs/ART_STANDARD.md` §5 step 8: no scaling, masters are already at screen size). The catalog's `image` field is switched on delivery (Gemini may edit the `objects` list); the wall sets also need Claude Code's piece-picking code in UF_Objects before they show.
9. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated).
10. Then mark the request row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name; the user approves each asset before it ships (`art/APPROVALS.md`).
11. Facts: every state, yield, tag and build cost below comes from `game/data/UF_WorldCatalog.json` and `docs/ASSET_INVENTORY.md`. "Unbuilt" is never a sprite: the engine shows the build designation marker (AR-035) and the materials lying on the cell as item icons until the job is done; "no second state in the engine" means exactly that.
12. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-05_buildings_and_camp.md`.

---

### campfire — Campfire (AR-105)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 40 px wide and 32 px tall unlit; the lit file's flame reaches row 4, so 44 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the ring of stones is a low oval seen from above, each stone lit on top, mid on its south side and dark on its east side, the far stones' tops sitting up and to the left of their footprint; the flame rises along the same lean, up and to the left
- **Reference**: `art/u7_reference_squares/u7_campfire_48.png` (SHAPES.VGA shape 739 at 1:1, 47×47: a wide ring of fitted grey cobbles tilted so its far side sits up-left, a dark pit with red embers in the middle; also the "hearth 739" cell of `art/review/u7_square_composite.png`; a reference only, nothing copied ships)
- **Palette Ramps**: Cobbles 121 `#BEBEBE` (tops), 123 `#9E9E9E` (south faces), 126 `#6D6D6D` (east faces), 128 `#515151` (cracks and the pit); Charred logs 160 `#35312D`, 143 `#5D350C` (end grain); Embers 24 `#C20C1C`, 236 `#FF5100`; Flame 250 `#FFD200` (core), 251 `#FFAE00` (body), 235 `#FF8E10` (tongues); Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Unlit. The ring's footprint is an oval 36 px wide and 18 px tall whose ground contact runs from row 28 to row 46 between columns 8 and 43; the nearest stone touches row 46 at columns 22–30 and a 1-px 129 contact line lies under it on row 47. Sixteen fitted stones, 5–8 px across, make the ring; each is 6 px tall, so its top face (121, with 1-px 128 cracks where stones meet) sits 6 px up and 6 px left of its footprint, its south face is a 6-px band of 123 under the top on the near half of the ring (rows 40–46), and its east face a 3-px sliver of 126 on the stones of the right-hand third (columns 36–43); the far stones' tops reach row 16 between columns 4 and 30, and 1-px micro-dither of 121 into 123 softens the edge where each top meets its south face. Inside the ring the pit is 128 dithered 1 px into 147 toward the centre; three charred logs of 160, 4 px thick with 143 end grain, cross over it on rows 24–34, and five 24 ember pixels with two 236 centres show between the logs. The outline 147 runs only along the ring's lower and right silhouette; the sunlit upper-left rim has none. Rows 0–15, columns 0–3 and columns 44–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
`campfire_lit` (the unlit / lit pair the inventory derives from the `fire` tag; AR-105): a separate file with the same ring and a flame 14 px wide at its base rising from the logs and leaning up-left, its tip at row 4, column 12: a 250 core 4 px wide, a 251 body, 235 tongues on the edges with 1-px gaps of background between the tongues, no outline on the flame, and two detached 235 sparks 3–5 px above the tip; the six stones nearest the flame get one 251 pixel on their inner top edge. Three flame frames side by side (the tongues shift 1–2 px between frames) as animations { "lit": [0, 1, 2] }. Today the engine draws one image for the hearth in every case: the two roasting recipes need a fire-tagged object next to the cook, and the colony treats the nearest one as its hearth, but nothing switches the sprite; the lit file is switched in when the engine gains a lit flag (Claude Code). Unbuilt: the build designation marker (AR-035) with the 3 logs and 3 stones lying on the cell as item icons; no ghost sprite. When its site is sacked the catalog's `ruin` replaces it with `bones_pile` (its own brief, SEG-04); "dismantle" drops the 3 logs and 3 stones back on the cell and removes it. AR-105 also names a burnt-out state; the catalog has no such object, so it is not part of this brief until it does.

#### Readability Check:
At zoom ⅓ the hearth is the only round grey ring on the map, dark in the middle, and lit it is the only warm yellow flicker, so a site's centre is found at a glance; the stone wall is a straight band and the loose stones a scatter, never a ring.

Deliver: art/masters/campfire.png (48×48, magenta background) + art/masters/campfire.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/campfire_lit.png (144×48: three 48×48 frames side by side, magenta background) + art/masters/campfire_lit.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0], "lit": [0, 1, 2] }).

---

### wall_wood — Wooden wall (AR-104)
- **Category**: Building
- **Dimensions**: a SET of sixteen 48×48 pieces on one 768×48 sheet (16 columns × 1 row of 48×48 frames); a piece runs to the edge of its square only where a neighbouring wall connects; the straight east–west piece's drawn shape is 48 px wide and 44 px tall (rows 4–47)
- **Anchor**: bottom-centre of the cell `[24, 47]` (every piece is a full 48×48 frame, so this also puts the piece exactly on its cell)
- **Projection**: U7 2.5D oblique: a palisade 12 px thick on the ground and 16 px tall, its top face shifted 16 px up and 16 px left of its footprint; the top face is lit, the south face mid, the east face dark; by the user's rule of 2026-09-18 a piece with no wall to its north also shows a north face above the top band, one step darker than the south face
- **Reference**: none in `art/u7_reference_squares/`; the nearest are the stock `Outside_B` tile 80 palisade in use today and the U7 plank-fence shapes (no square extracted; a reference only, nothing copied ships). The mechanism is RPG Maker's A4 convention: a wall-top autotile chosen by the wall's neighbours plus a wall-face strip under it, folded here into one 48×48 piece per cell
- **Palette Ramps**: Log ends 137 `#BA9A71` (end grain, lit), 139 `#9A7141` (rings); Bark 141 `#7D4D18` (lit strip), 142 `#6D3D0C` (south face), 144 `#4D2D0C` (east and north faces), 145 `#3D240C` (grooves between logs); Lashing 138 `#AA8659`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Straight east–west piece (walls to the east and the west; piece 10 below). The footprint is the strip rows 36–47 across columns 0–47: a palisade of upright logs 6 px across, two ranks deep. The top face, shifted 16 px up and 16 px left, is the band rows 20–31 across the full width (the shift is invisible along a run, so the band simply meets the next piece at both edges): sixteen cut log ends in two ranks (rows 20–25 and 26–31), each a 6×6 oval of 137 with one 139 ring, a 1-px 145 groove between neighbours and a 1-px 147 line on row 31. The south face fills rows 32–47: the front rank's eight logs as 45° diagonal bands of 142, 6 px wide and sloping up-left (every real-world vertical edge is a diagonal in this projection, 1 px left per row up, so the bands repeat every 6 px and tile with the neighbouring piece), each with a 1-px 141 lit strip on its left edge and a 145 groove on its right, a 138 lashing 2 px tall running horizontally across all the logs on rows 34–35 and again on rows 43–44, 1-px micro-dither of 142 into 144 on rows 44–46, and a 129 contact line on row 47. The north face, drawn only when the cell to the north holds no wall, is the back rank's logs as the same 45° diagonal bands in 144 with 145 grooves and a 139 lashing on rows 8–9 and 16–17, on rows 4–19 across the full width; with a wall to the north (pieces 11 and 15) those rows hold the north–south arm instead. Rows 0–3 stay magenta on every piece.
The other fifteen pieces are the same slab folded into an L, a T, a cross or a post, drawn with the same three numbers: a north–south arm has its footprint on columns 36–47, its top band of log ends on columns 20–31 (two ranks side by side, ovals 6 rows apart) and its east face on columns 32–47 (the east rank's logs as 45° diagonal bands of 144, 6 rows apart, with 145 grooves, and a 1-px 147 line on column 47 only where the arm meets open ground), running from row 0 when a wall stands to the north; where an east–west band and a north–south band meet, the log ends merge into one L, T or cross of end grain, and the south face and the east face meet on a 45° diagonal the way a box's faces meet at its corner. Ends: an east–west arm with no wall to its east ends flush at column 47, so its east face is the parallelogram with corners (47,36), (47,47), (31,31), (31,20) and the top band stops at column 31; an arm with no wall to its west starts its footprint at column 16, so the top band's overhang lands at column 0 and the south face's left edge runs on the diagonal from (16,47) up-left to (0,31), the triangle left of it staying magenta; a north–south arm with no wall to its south ends its footprint at row 47, so its south face is the parallelogram (36,47), (47,47), (31,31), (20,31); a north–south arm with no wall to its north starts its footprint at row 36, so its top band starts at row 20 and its north face (columns 20–31) sits on rows 4–19. The post (no neighbours) is the 12×12 footprint rows 36–47, columns 36–47 with all four of those faces.
Sheet order, piece i = N·1 + E·2 + S·4 + W·8 where a bit is 1 when a wall stands on that side, frame i at column i of the 768×48 sheet: 0 post, 1 N, 2 E, 3 N+E, 4 S, 5 N+S (straight north–south), 6 E+S, 7 N+E+S, 8 W, 9 N+W, 10 E+W (straight east–west), 11 N+E+W, 12 S+W, 13 N+S+W, 14 E+S+W, 15 all four (cross). The engine (UF_Objects, Claude Code) reads a wall cell's four neighbours and draws frame i; Gemini draws the sixteen frames so that every pair of connecting edges matches pixel for pixel.

#### Interaction / Transformed State Description:
`rubble` (the catalog's `ruin` when its site is sacked; its own brief, SEG-04). "Dismantle" drops the 1 log back on the cell and removes the piece; its neighbours then repick their frames. Unbuilt: the build designation marker (AR-035) with the 1 log lying on the cell; no ghost sprite. A built wall blocks movement (units work from a neighbouring cell). Sites use it as the ring of camps and villages (with two openings, so the end pieces are seen at every gate) and scattered inside villages; the human, elf, gnome and orc cultures build it first.

#### Readability Check:
At zoom ⅓ a warm brown band topped by a row of pale dots (the log ends), unlike the stone wall's cool grey band, and its ends cut on a diagonal show where a run stops; nothing else on the map is a continuous brown line.

Deliver: art/masters/wall_wood.png (768×48: sixteen 48×48 frames in the order above, magenta background) + art/masters/wall_wood.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [10] }, pieces { "post": 0, "n": 1, "e": 2, "ne": 3, "s": 4, "ns": 5, "es": 6, "nes": 7, "w": 8, "nw": 9, "ew": 10, "new": 11, "sw": 12, "nsw": 13, "esw": 14, "nesw": 15 }); the export name in game/img/characters/ is !$WallWood_Set.png (the file Gemini claimed in docs/STATUS.md on 2026-09-18).

---

### wall_stone — Stone wall (AR-104)
- **Category**: Building
- **Dimensions**: a SET of sixteen 48×48 pieces on one 768×48 sheet (16 columns × 1 row of 48×48 frames), the same sixteen footprints and the same sheet order as the wooden wall, so the two sets swap cell for cell; the straight east–west piece's drawn shape is 48 px wide and 44 px tall (rows 4–47)
- **Anchor**: bottom-centre of the cell `[24, 47]` (every piece is a full 48×48 frame, so this also puts the piece exactly on its cell)
- **Projection**: U7 2.5D oblique: a coursed wall 12 px thick on the ground and 16 px tall, its top face shifted 16 px up and 16 px left of its footprint; the top face is lit, the south face mid, the east face dark; by the user's rule of 2026-09-18 a piece with no wall to its north also shows a north face above the top band, in the east face's ramp
- **Reference**: none in `art/u7_reference_squares/`; the nearest are the stock `Outside_C` tile 277 in use today, `art/u7_reference_squares/u7_boulder_48.png` (shape 342) for the stone ramp and facet shading, and the U7 stone-wall shapes (no square extracted; a reference only, nothing copied ships). The mechanism is RPG Maker's A4 convention (wall top by neighbours, wall face below it) folded into one 48×48 piece per cell
- **Palette Ramps**: Capstones 121 `#BEBEBE` (top), 120 `#CECECE` (lit upper-left edge of each capstone), 124 `#8E8E8E` (mortar lines); South face 123 `#9E9E9E` with 126 `#6D6D6D` joints; East and north faces 127 `#616161` with 129 `#454545` joints, 128 `#515151` (deep cracks); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Straight east–west piece (piece 10): the footprint is rows 36–47 across columns 0–47. The top face is the band rows 20–31 across the full width: six capstones 8 px long in 121, each with a 1-px 120 strip on its upper-left edge and a 1-px 124 mortar line between neighbours (offset 4 px from the joints of the course below), a 124 line on row 20 and a 147 line on row 31. The south face fills rows 32–47 in 123, laid in two courses of 8 rows with 126 joints: a horizontal course joint on row 39, and block joints every 12 px drawn as 45° diagonals sloping up-left (a real vertical joint is a diagonal in this projection, 1 px left per row up), staggered 6 px between the courses, with 1-px micro-dither of 123 into 126 on rows 45–46 and a 1-px 128 crack in one block; a 129 contact line on row 47. The north face, only when no wall stands to the north, is rows 4–19 in 127 with the same two courses in 129 joints and the 128 crack; rows 0–3 stay magenta on every piece.
Every other piece follows the wooden wall's numbers exactly: a north–south arm's footprint on columns 36–47, its capstone band on columns 20–31 (the capstones then run down the band, 8 px each, with 124 mortar between them) and its east face on columns 32–47 in 127 with 129 joints; on that east face the course joint is the vertical line between columns 39 and 40 and the block joints are 45° diagonals across the 16-px band, 12 rows apart and staggered 6 rows between the two courses (an east–west arm's east end shows the same vertical course line at column 39); ends, corners, T pieces and the cross join their bands and faces on the same 45° diagonals as the wooden set, and the post is the same 12×12 footprint. Sheet order is identical: piece i = N·1 + E·2 + S·4 + W·8, frame i at column i.

#### Interaction / Transformed State Description:
`rubble` (the catalog's `ruin` when its site is sacked; its own brief, SEG-04). "Dismantle" drops the 2 stone back on the cell and removes the piece; its neighbours repick their frames. Unbuilt: the build designation marker (AR-035) with the 2 stone lying on the cell; no ghost sprite. A built wall blocks movement (units work from a neighbouring cell). Sites use it as the ring of towns and holds and scattered inside them; the dwarf and automaton cultures build it first, and the human, gnome and orc cultures build it later.

#### Readability Check:
At zoom ⅓ a light grey band with a darker face under it, straight and cool where the palisade is warm and dotted; not a ring like the hearth, not a scatter like the loose stones, and its plate-and-post shape tells the work stone apart from a wall end.

Deliver: art/masters/wall_stone.png (768×48: sixteen 48×48 frames in the wooden wall's order, magenta background) + art/masters/wall_stone.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [10] }, pieces { "post": 0, "n": 1, "e": 2, "ne": 3, "s": 4, "ns": 5, "es": 6, "nes": 7, "w": 8, "nw": 9, "ew": 10, "new": 11, "sw": 12, "nsw": 13, "esw": 14, "nesw": 15 }); the export name in game/img/characters/ is !$WallStone_Set.png (the file Gemini claimed in docs/STATUS.md on 2026-09-18).

---

### floor_straw — Straw bed (AR-104)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 40 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre; this object is drawn under units and items)
- **Projection**: U7 2.5D oblique: a low pallet 4 px tall, its top face shifted 4 px up and 4 px left of the footprint so a 4-px south face and a 4-px east face show; the top is lit, the faces shaded
- **Reference**: none in `art/u7_reference_squares/`; the nearest are the stock `Outside_B` tile 248 in use today and the U7 hay-bed shape (no square extracted; a reference only, nothing copied ships)
- **Palette Ramps**: Straw 2 `#F7E7A6` (lit strands), 3 `#F3DF79`, 136 `#CAB292` (mid), 138 `#AA8659` (hollow and shadow), 139 `#9A7141` (south and east faces); Twine 143 `#5D350C`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The footprint is a rounded rectangle 36 px wide and 18 px deep on rows 30–47, columns 8–43, its ground contact along row 47 from column 12 to 43 with a 1-px 129 contact line there. The pallet is 4 px tall, so its top face is the same rounded rectangle shifted to rows 26–43, columns 4–39, leaving a 4-px south face on rows 44–47 in 139 (its right end cut on the diagonal from (43,47) up-left to (39,43)) and a 4-px east face on columns 40–43 between rows 30 and 43 in 139 with 1-px 138 micro-dither along its left edge. The top face is 136 covered with 1-px strands of 2 and 3 laid down-right, about one strand pixel in three, thinning to plain 136 and then 138 in a shallow oval hollow on rows 32–38, columns 14–30 where a sleeper lies; two twine bands of 143, 2 px wide, cross the pallet at columns 12–13 and 32–33 from its top edge down over the south face. The outline 147 runs along the south face's bottom edge and the east face's right edge only. Rows 0–25, columns 0–3 and columns 44–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: the bed is the same empty or slept in. A colonist's sleep job targets a `bed` object and the sleeper stands on the cell, drawn over the bed (the sleep frame of the AR-600 sheet once the sheets have one; the stand frame until then). Unbuilt: the build designation marker (AR-035) with the 2 straw lying on the cell; no ghost sprite. "Dismantle" drops the 2 straw and removes it. The catalog gives it no `ruin`, so there is no ruined file. It is passable and drawn under units and items.

#### Readability Check:
At zoom ⅓ a pale yellow oblong lying flat inside the walls, solid where the stockpile marker is an outline with an empty middle, and warm where the hearth ring is grey.

Deliver: art/masters/floor_straw.png (48×48, magenta background) + art/masters/floor_straw.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### stockpile — Stockpile marker (AR-104)
- **Category**: Building
- **Dimensions**: exactly 48×48 (a flat marker filling its cell)
- **Anchor**: none (tile): a flat full-cell marker; the engine draws it under units and items
- **Projection**: flat (UI-like ground marker, no lean; the user's spec is a flat dashed square)
- **Reference**: none; today it is code-drawn (`UF_GenStockpile`: a pale cream dashed line, 6 px on and 4 px off, inset 4 px, over a faint dark fill); the nearest drawn thing is the look cursor's flat cell outline (AR-030)
- **Palette Ramps**: Dashes 135 `#DBCAB2` (pale linen, the rope), 139 `#9A7141` (the 1-px shadow line under and to the right of each dash); Corner pegs 143 `#5D350C`; Ground tint 136 `#CAB292` (sparse pixels inside); no outline; background `#FF00FF`.

#### Primary State Visual Description:
A square border inset 3 px from the cell edge: the rope runs on rows 3–4 and 43–44 and on columns 3–4 and 43–44 (2 px thick), broken into 6-px dashes of 135 with 6-px gaps so that a dash sits at every corner and three more lie along each side; under each horizontal dash and to the right of each vertical dash a 1-px line of 139 is its shadow, so the dash reads on pale ground (sand, snow) as well as on grass and dirt. Each corner holds a 3×3 peg of 143 over the dash. The interior stays magenta except a sparse scatter of single 136 pixels, about one in twelve, in place of the code marker's faint fill (alpha is 0 or 255, so the fill is a dither, never a tint). Nothing else: the items stacked on the stockpile are drawn on top of it by the engine. SEG-00 gave the dashes 137; this file's 135 over 139 replaces it, for contrast on light ground.

#### Interaction / Transformed State Description:
No second state in the engine. "Dismantle" removes the marker (it has no build items, so nothing drops) and the items on it stay on the ground. Items hauled to it (the colony's larder for food, its woodpile for wood and stone) are drawn over it; sites are placed with two or three of them. Unbuilt is the build designation marker (AR-035) alone for the catalog's 20 work, with no materials.

#### Readability Check:
At zoom ⅓ a faint pale dashed square lying flat on the ground, the only building that is an outline, and it never competes with the item icons stacked on it.

Deliver: art/masters/stockpile.png (48×48, magenta background) + art/masters/stockpile.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### workbench — Work stone (AR-104)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 43 px wide and 24 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a flat stone plate resting on a log stood on end, the plate lifted 8 px and 4 px thick, so its top face sits 12 px up and 12 px left of its ground footprint; the top is lit, the south face mid, the east face dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest are the stock `Outside_C` tile 285 in use today, `art/u7_reference_squares/u7_boulder_48.png` (shape 342 at 1:1: a pale faceted mass leaning up-left with darker south and east facets) for the stone ramp, and the U7 table shapes for a plate on a post (no square extracted; a reference only, nothing copied ships)
- **Palette Ramps**: Plate 120 `#CECECE` (top), 123 `#9E9E9E` (south face), 126 `#6D6D6D` (east face), 128 `#515151` (tool marks and chips); Post 141 `#7D4D18` (lit strip), 143 `#5D350C` (bark), 145 `#3D240C` (shaded strip); Flakes 137 `#BA9A71`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The post is a log stood on end: a 10-px-wide cylinder whose ground contact is rows 40–47, columns 30–39, with a 129 contact line on row 47; it is 8 px tall, its bark south face in 143 with a 2-px 141 lit strip on its left and a 2-px 145 strip on its right, and its east face (from column 39 up-left to column 31) in 145; its top is hidden under the plate. The plate is a 30×12 stone whose ground footprint is rows 36–47, columns 14–43; lifted 8 px by the post its underside plane sits at rows 28–39, columns 6–35 (never visible), and with 4 px of thickness its top face is the plate at rows 24–35, columns 2–31, in 120 with 1-px micro-dither into 123 along its right and lower 3 px, three 128 tool-mark scratches 4–6 px long and one 128 chipped corner at its upper-left. The plate's south face is the 4-px band rows 36–39 in 123, its ends cut on 45° diagonals (left end from (6,39) up-left to (2,35), right end from (35,39) to (31,35)); its east face is the 4-px parallelogram from (35,28)–(35,39) up-left to (31,24)–(31,35) in 126. Four 137 stone flakes of 2×1 px lie on the top face's right half and two on the ground at columns 41–44, row 46. The outline 147 runs along the lower and right silhouette of the plate and the post only. Rows 0–23, columns 0–1 and columns 45–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
`rubble` (the catalog's `ruin` when its site is sacked; its own brief, SEG-04). "Dismantle" drops the 2 stone and 1 log back on the cell and removes it. Unbuilt: the build designation marker (AR-035) with the 2 stone and 1 log lying on the cell; no ghost sprite. No recipe in the catalog requires a `workplace` yet (every recipe's workplace tag is null or fire), so the built work stone has no in-use state to draw; it is a plan step of the default, stone and workshop plans and blocks movement (units work from a neighbouring cell).

#### Readability Check:
At zoom ⅓ a light grey plate lifted on a dark post, the only grey shape with straight edges that is not part of a wall band; the boulder is rounder and taller, the loose stones smaller and scattered.

Deliver: art/masters/workbench.png (48×48, magenta background) + art/masters/workbench.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).
