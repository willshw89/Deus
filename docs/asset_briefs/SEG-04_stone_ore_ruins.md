# Segment 04: stone ore ruins (written 2026-09-18 by Claude Code)

Eleven briefs: the loose stone and gravel of every biome, the granite boulder, the four mineral outcrops (iron, copper, gold, crystal) with their worked-out states, and the three pieces a sacked site is rebuilt from (old bones, rubble, fallen pillar). Every state, yield, tag and site fact below is read from `game/data/UF_WorldCatalog.json` (objects, items.types, sites.kinds, cultures) and `docs/ASSET_INVENTORY.md`; where an object has no second sprite the brief says so. Work units: "beats" = the catalog's `work` divided by 10.

What the engine shows today (checked 2026-09-18, MD5 of the files in `game/img/characters/`): `!$U7_LooseStones` and `!$U7_Gravel` are one and the same file (two small dark stones); `!$U7_CrystalSpire` and `!$U7_SmallCrystals` are one file (one blue-white spire); `!$U7_MalachiteOutcrop` is the same file as `!$U7_CaveBoulder` (a grey lumpy boulder, shape 343 in `docs/STATUS.md` → Stand-ins, although STATUS lists 341 for the malachite); `!$U7_GoldVeinOutcrop` is the same file as `!$IronstoneDeposit` (shape 341). `rubble` and `rubble_pillar` are stock RPG Maker tiles (`Outside_C` 282 and 286). So six of these eleven objects have no art of their own yet, and none of the eleven has original art.

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares, every asset inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1). No 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up, 1 px left per unit of height); the top, south and east faces are visible; the footprint contact sits in the bottom-right region of the square (`docs/GUIDE_25D.md`). Flat scatters (loose stones, gravel, small crystals, bones, rubble) lie low in the square with each piece lit on top, mid on its south side and dark on its east side.
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for ≤ 32 colours per asset; 1-px micro-dither between neighbouring ramp steps is welcome; no gradients, no anti-aliasing against the background.
4. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0/255 after cleaning, no baked ground shadow (the engine draws shadows).
5. Sidecar: `art/masters/<id>.json` with frameWidth 48, frameHeight 48, anchor [24, 47], facings and animations (the AR-600 sidecar fields; objects here need facings ["S"] and animations { "stand": [0] } only).
6. Open the reference named in each brief before drawing (`art/u7_reference_squares/` squares, or the stand-in sheet in `game/img/characters/`, or the stock tile). It is a reference and a development stand-in: nothing copied from it ships.
7. Contained: nothing touches the top edge (row 0) or the right edge (column 47); the anchor is the bottom centre of the cell, [24, 47]; the 147 outline runs on the lower and right silhouette only, never on the sunlit upper-left edge.
8. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated).
9. Export = copy the approved master into `game/img/characters/` per `docs/ART_STANDARD.md` §5 (no scaling: masters are already at screen size) under the name the catalog's `image` field uses, or give the entry a new `image` name (for `rubble` and `rubble_pillar` the entry has a `tile` field today: replace it with `image`; Gemini may edit the `objects` list only).
10. Mark the request row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name; the user approves each asset (`art/APPROVALS.md`) before it ships.
11. Order: `rocks_small` first (it is the worked-out state of four other objects), then top to bottom. Draw `crystal` before `crystal_small` and `rubble` before `rubble_pillar` so the pairs share their ramps.
12. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-04_stone_ore_ruins.md`. Where `SEG-00` also has a brief for `rocks_small`, this one wins.

---

### rocks_small — Loose stones (AR-104)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 36 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: each stone is a small block whose top face sits 2–3 px up and left of its footprint; the top is lit, the south face mid, the east face dark
- **Reference**: the `!$U7_LooseStones` stand-in in `game/img/characters/` (two small dark stones at the foot of the frame; shape number not recorded in STATUS; the same file serves as the gravel stand-in today); nearest reference square for stone shading: `art/u7_reference_squares/u7_boulder_48.png` (shape 342; reference only, nothing copied ships)
- **Palette Ramps**: Stone top 120 `#CECECE` with 118 `#EFEFEF` micro-dither; South face 123 `#9E9E9E`; East face 126 `#6D6D6D`; Crack 128 `#515151`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Six stones lie in the lower third of the square, rows 32–47, between columns 6 and 41, none overlapping: the largest is 12 px wide and 8 px tall with its footprint on rows 40–44, columns 22–33, and its top face 3 px up and 3 px left of that; three stones of 6×5 sit at columns 8–13 (rows 36–40), columns 34–39 (rows 38–42) and columns 16–21 (rows 42–46); two chips of 4×3 sit at columns 12–15 (rows 44–46) and columns 30–33 (rows 34–36). Each stone's top face is 120 with a 1-px 118 micro-dither along its upper-left rim, its south face (2–3 rows under the top) is 123, and its east face (a 1–2 px strip on the right) is 126; the largest carries one 128 crack, 1 px wide and 6 px long, running down-right across its top. A 1-px 129 contact line sits under each stone on its lowest row, and the 147 outline is drawn on the lower and right edges of each stone only. Rows 0–31, columns 0–5 and columns 42–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"pick" (work 20, 2 beats; yields 2 `stone`) removes the object: the cell shows bare ground, and the stones arrive as the `stone` item icon (its own brief in the items segment). This file is also the worked-out state the engine swaps in on the same cell after "quarry" on `granite_boulder` and after "mine" on `ironstone`, `copper_outcrop` and `gold_outcrop` (each `becomes` `rocks_small`). It is flat (`under`, `passable`): units and items are drawn over it. No other engine state.

#### Readability Check:
At zoom ⅓ a scatter of six light grey specks low in the cell, coarser than the gravel's fine grit and far smaller and paler than the boulder's single mass.

Deliver: art/masters/rocks_small.png (48×48, magenta background) + art/masters/rocks_small.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### gravel — Gravel (AR-104)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 40 px wide and 14 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a flat spread of pebbles; each pebble is 1 px of height, so its lit top pixel sits up-left of its dark lower-right pixel
- **Reference**: none extracted; the `!$U7_Gravel` stand-in in `game/img/characters/` is the same file as the loose-stones stand-in (two dark stones) and does not show gravel; nearest reference square for the stone colour: `art/u7_reference_squares/u7_boulder_48.png` (shape 342; reference only, nothing copied ships)
- **Palette Ramps**: Pebble top 121 `#BEBEBE`, glint 118 `#EFEFEF`; Pebble shade 125 `#7D7D7D`; Warm pebbles 152 `#AEA29A`, 154 `#8E8279`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
About forty-five pebbles of 2×2 and 3×2 px lie on rows 34–47 between columns 4 and 43, densest on rows 38–44 (pebbles touching) and thinning to single pebbles along the upper-left and right margins, so the spread reads as a low lens of grit rather than a heap. Every pebble is 121 on its upper-left pixel(s) and 125 on its lower-right pixel; one pebble in five is the warm pair 152 over 154 instead, and six pebbles carry a single 118 glint on their top-left pixel. No pebble is taller than 2 px, so there is no separate south or east face, only the lit-over-dark pixel pair that gives the 45° lean in miniature. A 1-px 129 contact shadow lies on row 47 under the front row of pebbles only, and the 147 outline is used only on the lower-right pixel of the eight largest pebbles. Rows 0–33, columns 0–3 and columns 44–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"pick" (work 20, 2 beats; yields 1 `stone`) removes the object: the cell shows bare ground. It is flat (`under`, `passable`) and only the `mountain` biome places it. No second state in the engine.

#### Readability Check:
At zoom ⅓ a faint grey lens of grit that darkens the ground without any single stone standing out, unlike the six distinct specks of the loose stones.

Deliver: art/masters/gravel.png (48×48, magenta background) + art/masters/gravel.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### granite_boulder — Granite boulder (AR-022)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 42 px wide and 36 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: `art/u7_reference_squares/u7_boulder_48.png` (SHAPES.VGA shape 342 at 1:1, 45×47: a pale faceted mass, lit upper-left, shaded lower-right; a reference only, nothing copied ships)
- **Palette Ramps**: Top face 120 `#CECECE` with 118 `#EFEFEF` micro-dither and 121 `#BEBEBE` at the fold; South face 123 `#9E9E9E`, 124 `#8E8E8E`; East face 126 `#6D6D6D`, crevice 128 `#515151`; Lichen 168 `#71864D`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The footprint is an oval 20 px wide and 10 px deep on rows 38–47, columns 24–44, with a 1-px 129 contact line under its lower edge on row 47. The mass climbs 26 px while sliding 26 px to the left: its summit stands 26 px above the footprint's rear point at row 38, column 34, so it lands at row 12, column 8, the crest is a rounded cap on rows 12–18, columns 4–16, and the whole boulder spans rows 12–47, columns 3–44. The top face (the crest and the upper-left slope down to row 24) is 120 with 118 micro-dithered along its upper-left rim and 121 where it folds over; the south face (the broad diagonal band from the crest's lower edge at row 24 down-right to the front of the footprint at row 47) is 123 with 1-px dither into 124 on its lower half; the east face (an 8–12 px strip along the right, columns 32–44) is 126 with 128 in two vertical crevices at columns 36 and 41. Three 128 cracks, 1 px wide and 6–10 px long, cross the top face from upper-left to lower-right, and five 2×1 lichen specks of 168 sit on the crest. The 147 outline runs along the lower and right silhouette only. Rows 0–11, columns 0–2 and columns 45–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"quarry" (work 200, 20 beats; yields 4 `stone`) turns the cell into `rocks_small`: the loose-stones brief owns that file, and the engine swaps sprites on the same cell. The boulder blocks movement (units work from a neighbouring cell). No other engine state.

#### Readability Check:
At zoom ⅓ the largest single light grey mass on the map, filling most of its cell and clearly lit top-left, unlike the low rust-brown ironstone mound and the small grey scatter of loose stones.

Deliver: art/masters/granite_boulder.png (48×48, magenta background) + art/masters/granite_boulder.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### ironstone — Ironstone outcrop (AR-022)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 41 px wide and 26 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: `art/u7_reference_squares/u7_ironstone_48.png` (SHAPES.VGA shape 341 at 1:1, 41×27: a rounded, layered rust-and-tan mound sitting low in the square; a reference only, nothing copied ships)
- **Palette Ramps**: Ledge tops 181 `#BE825D` with 180 `#CE9A7D` micro-dither; South faces 182 `#AE653D`; East ends 183 `#9E5124`; Cracks 184 `#8E3D0C`, deepest pockets 185 `#7D2D00`; Raw iron flecks 122 `#AEAEAE` with 118 `#EFEFEF` glints; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The footprint is a low oval 32 px wide and 8 px deep on rows 40–47, columns 12–44, with a 1-px 129 contact line on row 47. The mound is built of three sedimentary ledges stepping up and to the left, each 6 px tall and each narrower than the one below (their ground footprints are columns 12–44, 14–36 and 18–32), each drawn 6 px up and 6 px left of the ledge under it, so the crest ledge's top sits 18 px up-left of its footprint on rows 22–28, columns 6–20 and the whole outcrop spans rows 22–47, columns 4–44. Every ledge's top is 181 with 180 micro-dithered along its upper-left rim, its south face (the 5–6 rows under the top) is 182, and its east end (a 3–4 px strip on the right) is 183; the seams between ledges are 1-px 184 lines with 185 in the four deepest pockets where a ledge overhangs. Seven flecks of raw iron, 2×1 px in 122 with a single 118 glint pixel, sit in the seams and on the crest, and two 184 cracks 1 px wide run down-right across the middle ledge. The 147 outline runs along the lower and right silhouette only. Rows 0–21, columns 0–3 and columns 45–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"mine" (work 300, 30 beats; yields 2 `ore_iron` and 1 `stone`) turns the cell into `rocks_small` (that brief owns the file). The outcrop blocks movement (units work from a neighbouring cell). No other engine state.

#### Readability Check:
At zoom ⅓ a low rust-brown stepped mound, the only warm-coloured rock among the greys of the mountains and rock desert, and lower and browner than the granite boulder.

Deliver: art/masters/ironstone.png (48×48, magenta background) + art/masters/ironstone.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### copper_outcrop — Copper outcrop (AR-044)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 41 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: none extracted for the green: `docs/STATUS.md` → Stand-ins lists shape 341 for `!$U7_MalachiteOutcrop`, but the file in `game/img/characters/` is byte-identical to `!$U7_CaveBoulder` (shape 343, a grey lumpy boulder); use `art/u7_reference_squares/u7_boulder_48.png` (shape 342) for the rock's faces and take the mineral colours from the palette (reference only, nothing copied ships)
- **Palette Ramps**: Rock top 121 `#BEBEBE`; South face 123 `#9E9E9E`; East face 126 `#6D6D6D`, cracks 128 `#515151`; Mineral crust 240 `#7DDF7D` (lit), 241 `#45B645`, 242 `#189218`, 243 `#006D00` (in cracks); Metal glints 36 `#FF9E3D`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The footprint is 28 px wide and 8 px deep on rows 40–47, columns 16–44, with a 1-px 129 contact line on row 47. The outcrop is a jagged stack of three angular slabs, not a rounded mound: it climbs 22 px while sliding 22 px left, its crest slab a flat-topped wedge on rows 18–24, columns 6–20, so the whole shape spans rows 18–47, columns 4–44 with a stepped, angular silhouette. Slab tops are 121, south faces 123, east faces 126, and the joints between slabs are 1-px 128 lines. Three irregular patches of mineral crust, 6–10 px across, lie on the slab tops (one on the crest, two on the middle slab) in 241 with 240 micro-dithered on their upper-left and 242 on their lower-right, and one 2-px-wide seam of 242 runs from the crest's front edge down-right along a joint to the footprint, with 243 where it enters the 128 cracks; two single 36 pixels glint at the seam's upper-left ends. The 147 outline runs along the lower and right silhouette only. Rows 0–17, columns 0–3 and columns 45–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"mine" (work 280, 28 beats; yields 2 `ore_copper` and 1 `stone`) turns the cell into `rocks_small` (that brief owns the file). The outcrop blocks movement (units work from a neighbouring cell). No other engine state.

#### Readability Check:
At zoom ⅓ a grey angular rock with bright green patches, the only green-flecked stone; the ironstone is rust-brown and rounded, the gold outcrop pale with a yellow streak.

Deliver: art/masters/copper_outcrop.png (48×48, magenta background) + art/masters/copper_outcrop.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### gold_outcrop — Gold outcrop (AR-044)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 39 px wide and 28 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: `art/u7_reference_squares/u7_ironstone_48.png` (SHAPES.VGA shape 341) for the mound's lean and size: the `!$U7_GoldVeinOutcrop` stand-in in `game/img/characters/` is byte-identical to `!$IronstoneDeposit` (shape 341) and shows no gold; the vein colours come from the palette (reference only, nothing copied ships)
- **Palette Ramps**: Quartz top 118 `#EFEFEF` with 120 `#CECECE` micro-dither; South face 121 `#BEBEBE`, 123 `#9E9E9E`; East face 124 `#8E8E8E`, 126 `#6D6D6D`; Cracks 128 `#515151`; Vein 250 `#FFD200` (core), 251 `#FFAE00`, 6 `#DBAE20` (shaded side), 7 `#C69618` (in cracks); Catchlight 15 `#FFFFFF`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The footprint is 26 px wide and 8 px deep on rows 40–47, columns 18–44, with a 1-px 129 contact line on row 47. A rounded pale mound climbs 20 px while sliding 20 px left: its summit stands 20 px above the footprint's rear point at row 40, column 33, so it lands at row 20, column 13, the crest is a rounded cap on rows 20–26, columns 7–19, and the whole shape spans rows 20–47, columns 6–44. The top face (crest and upper-left slope to row 28) is 118 with 120 micro-dithered along the fold, the south face (row 28 down-right to the footprint) is 121 with 1-px dither into 123 on its lower half, and the east face (columns 34–44) is 124 with 126 at the ground edge; two 128 cracks, 1 px wide, run down-right across the south face. One vein 2 px wide runs from the crest at row 22, column 14 down-right across the top and south faces to the footprint at row 44, column 38, branching once at row 32 toward column 30: its upper-left pixel row is 250, its lower-right row 251, with 6 where the vein crosses onto the east face and 7 where it enters the cracks, and three single 15 catchlights on its upper-left edge. The 147 outline runs along the lower and right silhouette only. Rows 0–19, columns 0–5 and columns 45–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"mine" (work 360, 36 beats; yields 1 `gold` and 1 `stone`) turns the cell into `rocks_small` (that brief owns the file). The outcrop blocks movement (units work from a neighbouring cell); its tags are `ore`, `mineral`, `precious`. No other engine state.

#### Readability Check:
At zoom ⅓ the palest rock on the map with one warm yellow streak across it, unlike the green-patched copper, the rust ironstone and the plain grey boulder.

Deliver: art/masters/gold_outcrop.png (48×48, magenta background) + art/masters/gold_outcrop.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### crystal — Crystal cluster (AR-044)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 38 px wide and 35 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); each prism shows its lit upper-left facet, its mid south facet and its dark east facet
- **Reference**: the `!$U7_CrystalSpire` stand-in in `game/img/characters/` (SHAPES.VGA shape 747 per STATUS → Stand-ins: one blue-white spire about 24×46, nearly upright); no reference square exists; for the up-left lean of a tall narrow shape see `art/u7_reference_squares/u7_pine_tree_48.png` (shape 306) (reference only, nothing copied ships)
- **Palette Ramps**: Lit facet 192 `#F3F3FF` with 195 `#CECEFF` micro-dither; South facet 197 `#B6B6FF`, 199 `#9E9EFF`; East facet 76 `#7D7DFF`, 78 `#3D3DFF`; Deep edge 81 `#0000C2`; Catchlight 15 `#FFFFFF`; Rock base 123 `#9E9E9E`, 126 `#6D6D6D`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A slab of rock 20 px wide and 6 px tall sits on rows 42–47, columns 22–41, its top 123 and its south and east faces 126, with a 1-px 129 contact line on row 47 and the 147 outline on its lower and right edges. Four prisms grow from the slab, all leaning up-left at 45° and parallel: prism A, 8 px wide at its foot (columns 30–37 on row 42) and 29 px long, tapers to a 3-px point at row 13, columns 4–6; prism B, 6 px wide at columns 22–27, is 16 px long with its tip at row 26, columns 8–9; prism C, 5 px wide at columns 37–41, is 20 px long with its tip at row 22, columns 18–20; prism D is a 4-px stub at columns 26–29, 8 px long, tip at row 34, columns 19–20 (every tip sits exactly as far left of its foot's centre as it is above it). Each prism is a six-sided rod with three visible long facets: the upper-left facet 192 with 1-px 195 micro-dither, the middle (south) facet 197 running into 199 toward the foot, and the lower-right (east) facet 76 with 78 on its last 2 px; a 1-px 81 line marks the edge where each east facet meets the background and the foot of each prism, and a 2-px 15 catchlight sits at every tip with one more 15 pixel on prism A's lit facet at row 20. No 147 is used on the crystal itself, so the glass reads as glass; the dark brown outline belongs to the rock slab only. Rows 0–12, columns 0–3 and columns 42–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"mine" (work 240, 24 beats; yields 2 `gem_rough`) turns the cell into `crystal_small` (the next brief; its own file). The cluster blocks movement (units work from a neighbouring cell). No other engine state.

#### Readability Check:
At zoom ⅓ a tall blue-white spike leaning up-left, the only blue object among the rocks; the small crystals are a low glitter with no tall spike, and the pine is green.

Deliver: art/masters/crystal.png (48×48, magenta background) + art/masters/crystal.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### crystal_small — Small crystals (AR-044)
- **Category**: Geology
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 33 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: each small prism leans up and to the left at 45° with a lit upper-left facet, a mid south facet and a dark east facet; a flat scatter otherwise
- **Reference**: the `!$U7_SmallCrystals` stand-in in `game/img/characters/` is byte-identical to `!$U7_CrystalSpire` (shape 747) and shows the full spire, not a scatter; no reference square exists (reference only, nothing copied ships)
- **Palette Ramps**: Lit facet 192 `#F3F3FF` with 195 `#CECEFF` micro-dither; South facet 197 `#B6B6FF`, 199 `#9E9EFF`; East facet 76 `#7D7DFF`, 78 `#3D3DFF`; Deep edge 81 `#0000C2`; Catchlight 15 `#FFFFFF`; Rock chips 126 `#6D6D6D`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Three rock chips of 126 lie low in the square: 6×4 px on rows 44–47, columns 12–17; 8×5 px on rows 42–46, columns 24–31; 7×3 px on rows 45–47, columns 34–40, each with a 1-px 129 contact line under it and a 147 outline on its lower and right edges. Six prisms 3–4 px wide grow from the chips, all leaning up-left at 45°: from the middle chip a 12-px prism rooted at its centre (column 27) whose tip reaches row 30, columns 15–16, and an 8-px one rooted at its right end (column 30) to row 34, column 22; from the left chip a 6-px prism to row 38, columns 8–9; from the right chip an 8-px prism to row 37, columns 29–30 and a 5-px one to row 40, column 33; one more 6-px prism lies flat on the ground on rows 45–46, columns 18–23 with no lean. Facets as on the cluster: upper-left 192 with 195 dither, south 197 into 199, east 76 with 78 at the foot, a 1-px 81 edge where the east facet meets the background, and a single 15 catchlight at each tip. The 147 outline is used on the rock chips only. Rows 0–29, columns 0–7 and columns 41–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"pick" (work 40, 4 beats; yields 1 `gem_rough`) removes the object: the cell shows bare ground. It is flat (`under`, `passable`) and is what a mined `crystal` leaves on its cell. No second state in the engine.

#### Readability Check:
At zoom ⅓ a low blue-white glitter close to the ground, the only blue scatter, with none of the cluster's tall spike and none of the loose stones' grey.

Deliver: art/masters/crystal_small.png (48×48, magenta background) + art/masters/crystal_small.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### bones_pile — Old bones (AR-104)
- **Category**: Building (site piece, ruins)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a flat scatter; the skull is the one raised piece, its dome lit on the upper-left, its right side shaded; the long bones are lit along their upper-left edge and dark along their lower-right edge
- **Reference**: the `!$U7_OldBones` stand-in in `game/img/characters/` (a small skull with one bone at the foot of the frame, about 14×10; shape number not recorded in STATUS); no reference square exists; for scale next to a person see `art/u7_reference_squares/u7_hare_48.png` (shape 811) (reference only, nothing copied ships)
- **Palette Ramps**: Bone lit 148 `#EFEBE7`, 134 `#EBE3D7`; Bone mid 135 `#DBCAB2`; Bone shade 136 `#CAB292`; Soil-stained ends 137 `#BA9A71`; Sockets 147 `#201408`, nasal notch 161 `#242020`; Contact 129 `#454545`; background `#FF00FF`.

#### Primary State Visual Description:
The skull, 10 px wide and 9 px tall, sits on rows 35–43, columns 28–37: its dome is 148 with 134 micro-dithered on the upper-left, its right side 135, its jaw 136, with two 2×2 sockets of 147 at rows 37–38 (columns 30–31 and 34–35) and a 1-px 161 nasal notch under them. Three long bones 3 px thick with 4-px knobbed ends lie on the ground around it: one from row 46, column 27 up-left to row 38, column 9; one from row 44, column 24 to row 40, column 6; one crossing them from row 47, column 12 up-right to row 41, column 26; each is 148 on its upper-left pixel strip, 135 in the middle and 136 on its lower-right strip, with 137 on the knobs that touch the soil. Four rib arcs, 1 px thick in 135 with a 136 pixel row beneath, curve between columns 14 and 26 on rows 30–36, opening toward the lower-right, so the pile's highest point is row 30. A 1-px 129 contact line lies on row 47 under the skull and under the front bone, and the 147 outline runs along the lower and right silhouette of the skull and the bones only. Rows 0–29, columns 0–5 and columns 38–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"pick" (work 20, 2 beats; yields 2 `bone`) removes the object: the cell shows bare ground. It is flat (`under`, `passable`). The catalog also places it as the `ruin` of `campfire`, at the centre of every `ruin` site and `lair`, four times inside a `warren`, rarely in the sand desert and in cursed regions. No second state in the engine.

#### Readability Check:
At zoom ⅓ a small ivory cluster with two dark dots, the only pale warm-white scatter, unlike the grey loose stones and the blue small crystals.

Deliver: art/masters/bones_pile.png (48×48, magenta background) + art/masters/bones_pile.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### rubble — Rubble (AR-104)
- **Category**: Building (site piece, ruins)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 42 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a low heap of broken blocks; each block's top face slides up-left by its height (3–5 px), with a mid south face under it and a dark east face on its right
- **Reference**: none extracted; today the engine shows the stock `Outside_C` tile 282 (a pile of round grey stones drawn upright, not in this projection); nearest reference square for stone faces: `art/u7_reference_squares/u7_boulder_48.png` (shape 342; reference only, nothing copied ships)
- **Palette Ramps**: Block top 121 `#BEBEBE` with 118 `#EFEFEF` micro-dither; South face 123 `#9E9E9E`; East face 126 `#6D6D6D`; Chips 124 `#8E8E8E`; Old mortar 150 `#CEC6BE`; Charred beam 160 `#35312D`, end grain 143 `#5D350C`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Ten broken ashlar blocks of 6×4 to 12×8 px lie in three rows: a back row on rows 26–34 at columns 12–21, 22–31 (tilted) and 30–38; a middle row on rows 33–41 at columns 6–14, 15–27 (the largest, 12×8), 28–37 and 36–44; and a front row of half-buried pieces on rows 40–47 at columns 10–16, 20–26 and 30–35, so the heap is highest at row 26 around columns 14–22 and spans rows 26–47, columns 3–44. Each block is drawn as a lit top of 121 with 118 micro-dithered on its upper-left edge, a south face of 123 (3–5 rows) and a 2-px east face of 126, its top slid up-left by the block's height; two blocks keep a crust of 150 old mortar along one edge. One charred beam end, 9×3 px in 160 with 143 end grain on its last 2 columns, sticks out of the heap at rows 43–45, columns 3–11 (the same heap is what a wooden wall leaves), and about twenty 1–2 px chips of 124 are scattered around the foot of the heap on rows 44–47. A 1-px 129 contact line lies on row 47 under the front row, and the 147 outline runs along the lower and right edges of every block only. Rows 0–25, columns 0–2 and columns 45–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"pick" (work 40, 4 beats; yields 2 `stone`) removes the object: the cell shows bare ground. It is flat (`under`, `passable`). The catalog names it as the `ruin` of `wall_wood`, `wall_stone` and `workbench`, as what "quarry" on a `wall_stone` leaves (2 `stone`), and as the ring (with 6 gaps) and six of the inside pieces of every `ruin` site, which is what a sacked site becomes. No second state in the engine.

#### Readability Check:
At zoom ⅓ a low grey heap with straight block edges and one dark beam, unlike the rounded loose stones and the single long shape of the fallen pillar.

Deliver: art/masters/rubble.png (48×48, magenta background) + art/masters/rubble.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### rubble_pillar — Fallen pillar (AR-104)
- **Category**: Building (site piece, ruins)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 41 px wide and 40 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a column drum lying on the ground and pointing up-left (north-west), so it runs along the same 45° diagonal as the lean; its upper-left flank is the lit top, its lower-right flank the shaded side, and its broken near end faces the viewer
- **Reference**: none extracted; today the engine shows the stock `Outside_C` tile 286 (a dark teal fluted column lying diagonally); the unreferenced `!$U7_FallenPillar` stand-in in `game/img/characters/` (a thin broken column, about 34×14; shape number not recorded in STATUS) is on disk; nearest reference square for the stone: `art/u7_reference_squares/u7_boulder_48.png` (shape 342; reference only, nothing copied ships)
- **Palette Ramps**: Lit flank 150 `#CEC6BE` with 148 `#EFEBE7` micro-dither; Mid 152 `#AEA29A`; Break face 153 `#9E928A`; Shaded flank 155 `#7D7169`, ground edge 157 `#615551`; Flutes 159 `#453D39`; Lichen 168 `#71864D`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The broken near end is an oval cross-section 13 px wide and 13 px tall on rows 34–46, columns 32–44, showing the break face in 153 with 155 micro-dither and a 1-px 152 rim, with a 129 contact line under it on row 47. From it the shaft, 12 px thick, runs up-left 26 px to a capital fragment on rows 8–20, columns 4–18, so the whole pillar spans rows 8–47, columns 4–44. The shaft's upper-left flank is 150 with 148 micro-dithered along its top edge, its middle 152, its lower-right flank 155 with 157 along the ground edge, and five 1-px 159 flutes run the length of the shaft parallel to its axis; the capital fragment is a squarer block 14×12 with a 150 top, a 153 south face and a 157 east face. Six 2×1 lichen specks of 168 sit on the lit flank, and a 1-px 129 contact shadow follows the shaft's lower-right ground edge from the break end to the capital. The 147 outline runs along the lower and right silhouette only. Rows 0–7, columns 0–3 and columns 45–47 stay magenta; nothing touches the top or right edge of the square.

#### Interaction / Transformed State Description:
"quarry" (work 160, 16 beats; yields 3 `stone`) removes the object: the cell shows bare ground. It blocks movement (units work from a neighbouring cell). The catalog uses it as the ring (with 3 gaps) of every `warren` and as the wall piece `goblin` colonists build with, and places two inside every `ruin` site. No second state in the engine.

#### Readability Check:
At zoom ⅓ one long pale bar lying diagonally up-left with a round dark end, unlike the blocky rubble heap and the rounded grey boulder.

Deliver: art/masters/rubble_pillar.png (48×48, magenta background) + art/masters/rubble_pillar.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).
