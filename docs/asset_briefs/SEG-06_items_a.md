# Segment 06: items a (written 2026-09-18 by Claude Code)

Ground items, first half: the raw materials, ores, gems and plant foods of `items.types` in `game/data/UF_WorldCatalog.json` (request AR-200). Each is a small 2.5D object resting in the lower half of its square. The engine draws one such icon per stack on the cell it lies on (frame column 1, row 0 of the sheet, anchored at the sidecar's anchor, under any unit standing there) and lists the count in the look tooltip; no number is drawn on the map, so the icon must read on its own. The same 48×48 master is reused as the inventory icon of the character sheet (AR-701, V49) when that arrives; today nothing draws these sheets in an inventory. Tools and clothing (AR-201) and the animal products are in other segments.

## How to work this segment
1. Masters are 48×48 at native resolution (1 art pixel = 1 screen pixel at zoom 1), on flat magenta `#FF00FF`, alpha 0 or 255 after cleaning. No 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top face is lit, the south face mid, the east face dark; the ground contact sits in the bottom-right region of the square and the shape slides up-left from it (`docs/GUIDE_25D.md`).
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for 32 colours or fewer per asset; 1-px micro-dither between ramp steps is welcome; no gradients, no anti-aliasing against the background.
4. No baked ground shadow: the engine draws shadows. The 147 `#201408` outline goes on the lower and right silhouette only; the lit upper-left edge has none.
5. Items rest in the lower half of the square: the contact line is on row 47, the drawn shape is between 20 and 36 px wide and between 10 and 22 px tall, and nothing touches row 0 or column 47.
6. Open the reference first. Items have no square in the reference-square folder, so the reference is the stand-in sheet in `game/img/characters/` named on each brief's Reference bullet (frame column 1, row 0) together with the shape number from that sheet's sidecar. The stand-ins are tiny (8–20 px): draw the new master larger, as this file says, and in the same manner; nothing copied from a stand-in ships.
7. Sidecar per AR-600: `art/masters/<id>.json` with frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }.
8. Export = copy the approved master into `game/img/characters/` per `docs/ART_STANDARD.md` §5, with no scaling, either under the name the catalog's `image` field uses or with the `image` field updated (Gemini may edit `items.types`). Where an item is a tinted share of another item's image today, tell Claude Code in "Notes for Claude Code" so the `tint` is removed on integration.
9. Check with `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png`; ignore its 3×-grid check for 48-native masters until the tool is updated.
10. Mark the AR-200 row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name.
11. The user approves each asset before it ships (`art/APPROVALS.md`); nothing goes into `game/img/` before that.
12. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-06_items_a.md`.

---

### log — Log (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 36 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a cylinder lying east–west; its lit top ridge sits up and to the left of its ground contact by its height (8 px); the south face and the cut east end are visible, the west end is not
- **Reference**: the `!$U7_Item_WoodLog` stand-in in `game/img/characters/` (SHAPES.VGA shape 923 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Bark 141 `#7D4D18` (lit top ridge), 143 `#5D350C` (south face), 145 `#3D240C` (underside), 146 `#2D1C08` (bark grooves); Cut face 136 `#CAB292` (end grain), 137 `#BA9A71` (rings), 139 `#9A7141` (rim); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The log lies along the ground with its contact on row 47 from column 14 to column 40, a 147 line the whole length. It is 8 px high, so its lit top ridge runs 8 px up and 8 px left of the contact: a band of 141 on rows 30–34 from column 6 to column 32, with 1-px micro-dither into 143 along row 34. The south face fills rows 35–42, each row starting 1 px further right than the one above, in 143 with 1-px dashes of 146 every third row for bark grooves; the underside on rows 43–46 is 145 with 143/145 micro-dither on row 43. The cut east end is an ellipse 10 px wide and 16 px tall centred at column 36, row 39 (columns 31–41, rows 31–47), filled 136 with three concentric rings of 137 and a 1-px 139 rim, its left edge meeting the bark. The outline 147 runs along the contact row and the right edge of the cut face (column 41) only. Rows 0–29, columns 0–5 and columns 42–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 5 logs shows this one icon and the look tooltip gives the count. Sources: "chop" on trees (`oak`, `pine`, `fir_snow`, `fruit_tree` 3; `tree_tropical` 4; `birch`, `tree_savanna`, `tree_swamp`, `mangrove` 2; `palm`, `dead_tree`, `tree_cursed` 1) and on `stump` (1). Consumed by the recipes Haft a stone axe (1), Haft a stone pick (1) and Split firewood (1 log makes 3 `firewood`), and as build material for `wall_wood` (1), `workbench` (1) and `campfire` (3); colonists haul it to the stockpile that stores the `wood` tag.

#### Readability Check:
At zoom ⅓ a single dark horizontal bar with a pale round end, unlike the firewood's pale striped bundle and the stump, which stands upright on its own cell with a wide cut top.

Deliver: art/masters/log.png (48×48, magenta background) + art/masters/log.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### firewood — Firewood (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 33 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: three split billets lying east–west, each 5 px high, the ones behind and on top shifted up-left by the lean; split faces up, bark south, end grain on the east ends
- **Reference**: the `!$U7_Item_Firewood` stand-in in `game/img/characters/` (SHAPES.VGA shape 984 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Split face 135 `#DBCAB2` (lit), 136 `#CAB292` (mid), 137 `#BA9A71` (grain lines), 139 `#9A7141` (end-grain rays); Bark 143 `#5D350C` (south faces), 145 `#3D240C` (lower bark edge); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The nearest billet lies with its contact on row 47 from column 12 to column 38 (a 147 line) and its lit split face on rows 41–43 from column 7 to column 33, 5 px up-left of the contact; its bark south face is rows 44–46 in 143 with 145 on row 46. A second billet lies behind it, contact hidden, split face on rows 36–38 from column 9 to column 35 and bark on rows 39–40; a third rests on top of the two, split face on rows 30–32 from column 6 to column 32 and bark on rows 33–35. Each split face is 135 with 1-px 137 grain lines running the length every second row and 135/136 micro-dither toward its right end; each east end is a triangular wedge of end grain 5 px wide (columns 33–38, 30–35 and 27–32) in 136 with three 139 rays. The outline 147 runs under the nearest billet and down the right edges of the three wedges only. Rows 0–29, columns 0–5 and columns 39–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Made by the recipe Split firewood (1 `log` makes 3, an axe speeds it) and dropped by "chop" on `dead_tree` (2). It carries the `fuel` tag, but no plugin burns fuel yet (checked 2026-09-18), so nothing consumes it; colonists haul it to the stockpile that stores the `wood` tag.

#### Readability Check:
At zoom ⅓ a pale striped bundle, lighter and shorter than the log's dark bar and never round-ended.

Deliver: art/masters/firewood.png (48×48, magenta background) + art/masters/firewood.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### stone — Stone (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 26 px wide and 14 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: one angular block 6 px high; its lit top facet sits up-left of the contact, the south face is mid, the east face dark
- **Reference**: the `!$U7_Item_RoughStone` stand-in in `game/img/characters/` (SHAPES.VGA shape 815 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Stone 120 `#CECECE` (top facet), 121 `#BEBEBE` (top, right third), 123 `#9E9E9E` (south face), 126 `#6D6D6D` (east face), 128 `#515151` (crack); Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The block's contact is row 47 from column 18 to column 36 with a 147 line, and a 1-px 129 contact shade sits on row 46 under the south face. It is 6 px high: the top facet is a rough five-sided shape on rows 34–40 from column 12 to column 31, 120 with 1-px micro-dither into 121 over its right third and one 128 crack 4 px long running down-right from row 36, column 20. The south face fills rows 40–46, each row starting 1 px further right, in 123; the east face is the strip from column 31 to column 37 on rows 36–46 in 126. The outline 147 runs along the bottom and the right edge only; the lit top-left has none. Rows 0–33, columns 0–11 and columns 38–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Sources: "pick" on `rocks_small` (2), `gravel` (1) and `rubble` (2); "quarry" on `granite_boulder` (4) and `rubble_pillar` (3); "mine" on `ironstone`, `copper_outcrop` and `gold_outcrop` (1 each beside the ore). Consumed by the recipes Knap a stone knife (1), Haft a stone axe (2) and Haft a stone pick (2), and as build material for `wall_stone` (2), `workbench` (2) and `campfire` (3); colonists haul it to the stockpile that stores the `stone` tag. The tools `stone_axe`, `stone_knife` and `stone_pick` reuse this image with a tint today; they get their own briefs under AR-201, so draw no tool here.

#### Readability Check:
At zoom ⅓ one mid-grey angular block, unlike the loose-stones object (a scatter of six small stones) and the ores (the same dark lump with orange or green streaks).

Deliver: art/masters/stone.png (48×48, magenta background) + art/masters/stone.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### ore_iron — Iron ore (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 28 px wide and 17 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a rounded lump 7 px high; lit top up-left of the contact, mid south face, dark east face
- **Reference**: the `!$U7_Item_IronOre` stand-in in `game/img/characters/` (SHAPES.VGA shape 916 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Rock 158 `#514945` (top), 159 `#453D39` (south face), 160 `#35312D` (east face); Rust bands 183 `#9E5124` (lit), 184 `#8E3D0C` (mid), 185 `#7D2D00` (in shade); Metal flecks 122 `#AEAEAE`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The lump's contact is row 47 from column 16 to column 36 with a 147 line. It is 7 px high: the top is an irregular oval on rows 31–38 from column 10 to column 30 in 158 with 158/159 micro-dither along its lower edge; the south face fills rows 38–46, each row starting 1 px further right, in 159; the east face is the strip from column 30 to column 37 on rows 33–46 in 160. Two rust bands 2 px thick cross the lump from upper-left to lower-right, entering at row 32, column 13 and row 35, column 18, in 183 on the top, 184 on the south face and 185 where they reach the east face, each with a 1-px 184 edge; six single 122 pixels sit along the bands as flecks of raw metal. The outline 147 runs along the bottom and right edges only. Rows 0–30, columns 0–9 and columns 38–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Source: "mine" on `ironstone` (2, beside 1 `stone`). No recipe uses it and nothing smelts it in the catalog (2026-09-18); no stockpile in the colony plan stores the `ore` tag, so a haul takes it to the nearest stockpile of any kind.

#### Readability Check:
At zoom ⅓ a dark lump with orange-red streaks, unlike the copper ore's green crust and the plain stone's even grey.

Deliver: art/masters/ore_iron.png (48×48, magenta background) + art/masters/ore_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### ore_copper — Copper ore (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 27 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a two-noduled lump 6 px high; lit top up-left of the contact, mid south face, dark east face
- **Reference**: the `!$U7_Item_LeadOre` stand-in in `game/img/characters/` (SHAPES.VGA shape 915 frame 0, shrunk into the square, shown mint green by the catalog's tint; reference only, nothing copied ships)
- **Palette Ramps**: Rock 158 `#514945` (top), 159 `#453D39` (south face), 160 `#35312D` (east face); Green crust 165 `#B6C29A` (lit), 167 `#8A9A61` (mid), 169 `#5D7139` (in the pits); Native metal 182 `#AE653D`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The lump's contact is row 47 from column 17 to column 36 with a 147 line. It is 6 px high and made of two fused nodules, the left one larger: the top on rows 32–38 from column 11 to column 30 in 158 with a 1-px 159 crease between the nodules at column 22; the south face fills rows 38–46, each row starting 1 px further right, in 159; the east face is the strip from column 30 to column 37 on rows 34–46 in 160. A green mineral crust covers the upper-left two thirds of the top and spills 3 px down the south face, laid as 1-px micro-dither of 165 and 167 with 169 in four 2-px pits, so it reads as a bloom on the rock and not as paint; one 2×2 node of 182 sits on the south face at row 41, column 22. The outline 147 runs along the bottom and right edges only. Rows 0–31, columns 0–10 and columns 38–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Source: "mine" on `copper_outcrop` (2, beside 1 `stone`). No recipe uses it and nothing smelts it in the catalog (2026-09-18); no stockpile in the colony plan stores the `ore` tag, so a haul takes it to the nearest stockpile of any kind. This master is painted in its own colours: it replaces a shared, tinted image, so Claude Code removes the catalog's `tint` on integration.

#### Readability Check:
At zoom ⅓ a dark lump with a pale green crust, unlike the iron ore's orange-red streaks and the rough gem's blue chunk.

Deliver: art/masters/ore_copper.png (48×48, magenta background) + art/masters/ore_copper.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### gold — Gold nugget (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 24 px wide and 10 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a small two-lobed nugget 5 px high with two loose grains beside it; lit top up-left of the contact, mid south face, dark east face
- **Reference**: the `!$U7_Item_GoldNugget` stand-in in `game/img/characters/` (SHAPES.VGA shape 645 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Gold 233 `#FFEF41` (glints), 250 `#FFD200` (top), 251 `#FFAE00` (south face), 6 `#DBAE20` (east face), 7 `#C69618` (crevice), 9 `#9E690C` (pits); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The nugget's contact is row 47 from column 22 to column 33 with a 147 line. It is 5 px high: the top on rows 38–42 from column 17 to column 28 in 250, two lobes with the left one 7 px and the right one 4 px across and a 1-px 7 crevice between them, three single 233 glint pixels along the upper-left edge and three single 9 pits on the right lobe; the south face on rows 42–46, each row starting 1 px further right, in 251 with 250/251 micro-dither on row 42; the east face from column 28 to column 33 on rows 40–46 in 6. Two loose grains of 2×2 px lie on row 46–47 at columns 14–15 and 36–37, each 250 above 6. The outline 147 runs along the bottom and right edges of the main lump only. Rows 0–37, columns 0–13 and columns 38–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Source: "mine" on `gold_outcrop` (1, beside 1 `stone`). No recipe uses it (2026-09-18); no stockpile in the colony plan stores the `precious` tag, so a haul takes it to the nearest stockpile of any kind.

#### Readability Check:
At zoom ⅓ the only small warm-yellow item; the iron bar is grey and straight-edged, the cut gem blue.

Deliver: art/masters/gold.png (48×48, magenta background) + art/masters/gold.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### gem_rough — Rough gem (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 20 px wide and 15 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a broken crystal chunk 8 px high with a rind of host rock on one corner; lit top facet up-left of the contact, mid south face, dark east face
- **Reference**: the `!$U7_Item_RoughGem` stand-in in `game/img/characters/` (SHAPES.VGA shape 760 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Crystal 225 `#B2D7F3` (top facet), 226 `#71AEE7` (top, fracture line), 227 `#358EDB` (south face), 228 `#006DD2` (east face); Glint 15 `#FFFFFF`; Host rock 154 `#8E8279`, 156 `#6D615D`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The chunk's contact is row 47 from column 20 to column 34 with a 147 line. It is 8 px high: the top facet is an irregular six-sided flat on rows 33–37 from column 16 to column 27 in 225 with 225/226 micro-dither over its right half and one 15 glint pixel at row 34, column 19; the south face fills rows 37–46, each row starting 1 px further right, in 227 with a 1-px 226 fracture line running down-right from row 38, column 20; the east face is the strip from column 27 to column 35 on rows 35–46 in 228. A rind of host rock clings to the lower-left corner on rows 42–47 from column 16 to column 21, 154 on its upper part and 156 below, with 227/154 micro-dither along the join. The outline 147 runs along the bottom and right edges only. Rows 0–32, columns 0–15 and columns 36–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Sources: "mine" on `crystal` (2) and "pick" on `crystal_small` (1). No recipe cuts it (`gem_cut` has no recipe, 2026-09-18); no stockpile in the colony plan stores the `gem` tag, so a haul takes it to the nearest stockpile of any kind.

#### Readability Check:
At zoom ⅓ a pale blue chunk with a grey corner, cloudy and lopsided where the cut gem is a small symmetric star of facets.

Deliver: art/masters/gem_rough.png (48×48, magenta background) + art/masters/gem_rough.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### gem_cut — Cut gem (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 16 px wide and 12 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a faceted stone resting on its point, 9 px high; the flat table is lit and sits up-left of the point, the crown facets fan to the girdle, the pavilion facets below are mid on the south and dark on the east
- **Reference**: the `!$U7_Item_CutGem` stand-in in `game/img/characters/` (SHAPES.VGA shape 728 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Table 73 `#DBDBFF`; Crown 74 `#BABAFF` (lit facets), 76 `#7D7DFF` (mid facets); Pavilion 78 `#3D3DFF` (south), 81 `#0000C2` (east), 83 `#00008A` (deepest facet); Glint 15 `#FFFFFF`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The stone rests on a 2-px point on row 47 at columns 26–27 with a 147 contact line there. It is 9 px high: the table is a flat octagon 6 px wide on rows 36–38 from column 18 to column 23 in 73 with one 15 glint pixel at its upper-left corner; eight crown facets fan from the table down to the girdle, alternating 74 and 76 as 1-px-wide wedges, and the girdle is the widest line on row 41 from column 17 to column 32. The pavilion narrows from the girdle to the point: rows 42–47 shrink from 16 px to 2 px, the south facets in 78 on the left two thirds, the east facets in 81 on the right third, and the one facet under the girdle's centre in 83, each facet boundary a 1-px step with 76/78 micro-dither along the girdle. The outline 147 runs along the lower-right edges of the pavilion only; the crown has no outline. Rows 0–35, columns 0–16 and columns 33–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Nothing produces it in the catalog (no recipe outputs it and no object yields it, 2026-09-18): the type exists for a future gem-cutting recipe from `gem_rough`, and today it appears only when a test drops it. No stockpile in the colony plan stores the `gem` or `precious` tags, so a haul takes it to the nearest stockpile of any kind.

#### Readability Check:
At zoom ⅓ a small symmetric blue star with a white glint, sharper and smaller than the rough gem's lopsided chunk and the wrong colour for the gold nugget.

Deliver: art/masters/gem_cut.png (48×48, magenta background) + art/masters/gem_cut.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### bar_iron — Iron bar (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 14 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a cast block lying east–west, 7 px high; its flat top face is a parallelogram shifted 7 px up and 7 px left of the footprint, with a mid south face and a dark east face
- **Reference**: the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (SHAPES.VGA shape 646 frame 0, shrunk into the square; it is yellow, this master is grey iron; reference only, nothing copied ships)
- **Palette Ramps**: Iron 119 `#DFDFDF` (edge highlight), 121 `#BEBEBE` (top face), 122 `#AEAEAE` (top, right end), 124 `#8E8E8E` (south face), 127 `#616161` (east face), 129 `#454545` (mould seam); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The footprint is a rectangle on rows 41–47 from column 14 to column 38 with a 147 contact line on row 47. The block is 7 px high, so its top face is the same rectangle drawn 7 px up and 7 px left: rows 34–40 from column 7 to column 31, in 121 with a 1-px 119 highlight along its top and left edges and 121/122 micro-dither over its right 6 px. The south face is the parallelogram between the two, rows 40–47, each row starting 1 px further right, in 124 with a 1-px 129 mould seam along row 43; the east face is the parallelogram from column 31 to column 38 between rows 34 and 47 in 127. The corners are chamfered by 1 px so it reads as cast, not sawn. The outline 147 runs along the bottom and the right edge only. Rows 0–33, columns 0–6 and columns 39–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Nothing produces or consumes it in the catalog (no smelting recipe, no build cost, 2026-09-18): the type exists for a future smelting step from `ore_iron`, and today it appears only when a test drops it. No stockpile in the colony plan stores the `metal` tag, so a haul takes it to the nearest stockpile of any kind.

#### Readability Check:
At zoom ⅓ the only straight-edged grey block with a lit parallelogram top, unlike the stone's rough facets and the gold nugget's yellow.

Deliver: art/masters/bar_iron.png (48×48, magenta background) + art/masters/bar_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### berries — Berries (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 25 px wide and 12 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a low heap 4 px high; the upper-left berries are lit, the lower-right ones in shade, the heap's crest shifted up-left of its contact
- **Reference**: the `!$U7_Item_WildBerries` stand-in in `game/img/characters/` (SHAPES.VGA shape 377 frame 21, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Berry 24 `#C20C1C` (body), 26 `#8A040C` (shaded halves), 28 `#510000` (where berries touch); Catchlight 21 `#FF394D`; Leaf 241 `#45B645` (lit), 243 `#006D00` (underside); Twig 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The heap's contact is row 47 from column 19 to column 34 with a 147 line. Twelve berries of 3×3 px in 24 are packed in three staggered rows whose centres are on rows 45, 42 and 39, from column 17 to column 34, the top row 4 px left of the bottom row so the heap leans up-left; each berry in the upper-left half carries one 21 catchlight pixel at its upper-left, each in the lower-right half has its lower-right two pixels in 26, and the pixels where two berries touch are 28, with 24/26 micro-dither across the middle row. Two leaves 6×3 px, 241 with a 243 underside row, lie on a 1-px 143 twig: one at rows 39–41 from column 12 to column 17, the other at rows 36–38 from column 30 to column 36. The outline 147 runs along the bottom and right edges of the heap only. Rows 0–35, columns 0–11 and columns 37–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Source: "gather" on `berry_bush` (2, leaving `berry_bush_bare`). Eaten by a hungry colonist for 25 hunger (the item is consumed); colonists haul it to the stockpile that stores the `food` tag (the larder) and keep 6 food in stock.

#### Readability Check:
At zoom ⅓ a small dark-red cluster, the reddest item, where the fruit is one larger orange globe.

Deliver: art/masters/berries.png (48×48, magenta background) + art/masters/berries.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### fruit — Fruit (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 19 px wide and 20 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: one round fruit; the lit side is its upper-left, the south lower third mid, the east quarter dark, the stem and leaf leaning up-left
- **Reference**: the `!$U7_Item_TreeFruit` stand-in in `game/img/characters/` (SHAPES.VGA shape 377 frame 20, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Skin 36 `#FF9E3D` (lit upper-left), 38 `#FF7D00` (body), 40 `#C26100` (south lower third), 41 `#A65100` (east quarter); Glint 33 `#FFCE9A`; Stem 143 `#5D350C`; Leaf 241 `#45B645`, 243 `#006D00`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The fruit is a sphere 16 px across on rows 32–47 from column 17 to column 32, resting on a 4-px 147 contact line on row 47 at columns 24–27. Its upper-left third is 36 with a 2×1 glint of 33 at row 34, column 20; the body is 38; the lower third from row 43 down is 40; the right quarter from column 29 is 41; every boundary is a 1-px band of micro-dither between its two colours so the sphere reads round. A 143 stem 3 px tall rises from row 31 to row 29 at column 22, and one leaf 7×4 px leans up-left from it to end at row 27, column 14, 241 with its lower-right row in 243. The outline 147 runs along the sphere's lower and right edges only. Rows 0–26, columns 0–13 and columns 33–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Sources: "gather" on `fruit_tree` (3, leaving `fruit_tree_bare`) and on `cactus` (1). Eaten by a hungry colonist for 30 hunger and 10 thirst (the item is consumed); colonists haul it to the stockpile that stores the `food` tag.

#### Readability Check:
At zoom ⅓ one orange globe with a green leaf, larger and rounder than the berries' red cluster and the gold nugget's yellow speck.

Deliver: art/masters/fruit.png (48×48, magenta background) + art/masters/fruit.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### mushroom — Mushrooms (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 22 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: three picked mushrooms lying loose; the caps' tops are lit, their south rims mid, their east edges dark, the one behind shifted up-left
- **Reference**: the `!$U7_Item_CaveMushroom` stand-in in `game/img/characters/` (SHAPES.VGA shape 671 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Cap 149 `#DFD7D2` (lit top), 150 `#CEC6BE` (mid), 152 `#AEA29A` (south rim); Gills 136 `#CAB292`, 137 `#BA9A71`; Stem 135 `#DBCAB2`, 154 `#8E8279` (east edge, shade under the caps); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The heap's contact is row 47 from column 15 to column 35 with a 147 line. The front mushroom lies on its side with its cap toward the viewer: a disc 10×8 px on rows 38–46 from column 15 to column 25 filled 136 with eight 1-px radial gill lines of 137, and a stem 8×4 px in 135 pointing right on rows 41–45 from column 25 to column 33 with a 154 row beneath it. The second stands cap-up at the right: a dome 10×6 px on rows 36–42 from column 26 to column 36, 149 with 149/150 micro-dither over its right half and a 152 rim on its lowest row, on a stem 4×5 px in 135 on rows 42–47 from column 30 to column 34 with a 154 east column. The third is small and behind, a dome 7×4 px on rows 32–36 from column 20 to column 27 in 149 with a 152 rim, its stem hidden by the front cap. The outline 147 runs along the bottom and right edges only. Rows 0–31, columns 0–14 and columns 37–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Nothing produces it in the world yet (no object yields it and no recipe makes it, 2026-09-18): the type exists for a future foraging source, and today it appears only when a test drops it. Eaten by a hungry colonist for 20 hunger (the item is consumed); colonists haul it to the stockpile that stores the `food` tag.

#### Readability Check:
At zoom ⅓ a pale grey-white pair of domes, the lightest item, unlike the seed pouch's brown and the stone's mid-grey block.

Deliver: art/masters/mushroom.png (48×48, magenta background) + art/masters/mushroom.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### root — Root vegetable (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 27 px wide and 21 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a tapered root lying with its thick end up-left and its tip down-right on the ground; the top of the root is lit, its lower side mid, its tip end dark; the leaf tuft leans up-left
- **Reference**: the `!$U7_Item_RootVegetable` stand-in in `game/img/characters/` (SHAPES.VGA shape 377 frame 18, shrunk into the square; it is orange, this master is a tan root so it never reads as the fruit; reference only, nothing copied ships)
- **Palette Ramps**: Root 135 `#DBCAB2` (lit top), 136 `#CAB292` (body), 137 `#BA9A71` (lower side), 139 `#9A7141` (tip, root hairs); Soil 143 `#5D350C`; Leaf 241 `#45B645` (tips), 242 `#189218` (mid), 243 `#006D00` (base); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The root's contact runs along its lower edge on rows 44–47 from column 20 to column 33 with a 147 line on row 47. The root is a wedge 8 px thick at its upper-left end (rows 33–41 from column 14 to column 21) tapering to a 1-px tip at row 46, column 33; its upper edge is 135, the body 136 with 135/136 micro-dither along the top, the lower side 137 and the last 5 px of the tip 139, with three 1-px 139 root hairs trailing down from the lower edge and two 2×2 clods of 143 clinging to the thick end. From the thick end a tuft of five leaves 2 px wide leans up-left, the longest ending at row 27, column 8 and the shortest at row 31, column 18, each 243 at its base, 242 in the middle and 241 on its last 3 px. The outline 147 runs along the lower and right edges of the root only. Rows 0–26, columns 0–7 and columns 35–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one icon and the look tooltip gives the count. Nothing produces it in the world yet (no object yields it and no recipe makes it, 2026-09-18): the type exists for a future digging or foraging source, and today it appears only when a test drops it. Eaten by a hungry colonist for 25 hunger (the item is consumed); colonists haul it to the stockpile that stores the `food` tag.

#### Readability Check:
At zoom ⅓ a tan wedge with a green tuft at one end, the only item with a large green top, unlike the orange fruit and the pale mushrooms.

Deliver: art/masters/root.png (48×48, magenta background) + art/masters/root.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### seeds — Seeds (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 23 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a small tied cloth pouch 9 px high with seeds spilling from its mouth; its upper-left is lit, its south lower part mid, its east edge dark
- **Reference**: the `!$U7_Item_SeedPouch` stand-in in `game/img/characters/` (SHAPES.VGA shape 677 frame 0, shrunk into the square; reference only, nothing copied ships)
- **Palette Ramps**: Cloth 137 `#BA9A71` (lit), 138 `#AA8659` (body), 139 `#9A7141` (south lower part), 140 `#8A5D2D` (east edge); Mouth 145 `#3D240C`; Cord 143 `#5D350C`; Seeds 4 `#EFD251`, 6 `#DBAE20`, 8 `#B28210`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The pouch's contact is row 47 from column 19 to column 32 with a 147 line. The body is a rounded sack 16 px wide and 12 px tall on rows 36–47 from column 17 to column 32, its upper-left third 137 with 137/138 micro-dither into the 138 body, its lowest 4 rows 139, and its east edge (columns 30–32) 140, with two 1-px 139 fold lines curving from the neck to the base. The neck gathers to 7 px on rows 34–36 from column 21 to column 27, tied by a 1-px 143 cord on row 35 whose two ends hang 3 px down the south face; above the cord the mouth is a 145 opening 5×2 px on rows 32–33 from column 22 to column 26 with three single seeds of 4 in it. Eleven seeds of 1 px each in 4, 6 and 8 lie spilled on the ground to the lower-left, on rows 43–47 from column 10 to column 18, thinning with distance. The outline 147 runs along the bottom and right edges of the sack only. Rows 0–31, columns 0–9 and columns 33–47 stay magenta; nothing touches row 0 or column 47, the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 20 shows this one icon and the look tooltip gives the count. Sources: "gather" on `wild_grain` and `wheat_wild` (1 each, beside 1 `straw`). No recipe or job uses seeds yet (no farming in the catalog, 2026-09-18); no stockpile in the colony plan stores the `seed` tag, so a haul takes them to the nearest stockpile of any kind.

#### Readability Check:
At zoom ⅓ a small brown rounded sack with a yellow speckle beside it, unlike the pale mushroom domes and the tan root wedge.

Deliver: art/masters/seeds.png (48×48, magenta background) + art/masters/seeds.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).
