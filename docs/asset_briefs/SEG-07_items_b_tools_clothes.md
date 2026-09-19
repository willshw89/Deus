# Segment 07: items b tools clothes (written 2026-09-18 by Claude Code)

The second half of the ground items: the raw materials plants and animals give (plant fiber, straw, hide, bone, wool), the two meats and the fish, and the first tools and clothes a colonist makes (stone axe, stone knife, stone pick, woven wrap, hide cloak). Every one of them lies on a cell as a stack drawn with one frame (`UF_Items`); carried items are not drawn yet. Facts about states, yields, recipes and tints below come from `game/data/UF_WorldCatalog.json` (`items.types`, `recipes.list`, `objects`, `wildlife.species`) and `docs/ASSET_INVENTORY.md`, read 2026-09-18.

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares, every asset inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1). No 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up, 1 px left per unit of height); the top, south and east faces are visible; the ground contact sits in the bottom-right region of the square (`docs/GUIDE_25D.md`). Items are low, so they lean only by their own thickness.
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for ≤ 32 colours per asset; micro-dither is welcome; no gradients or anti-aliasing against the background.
4. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0/255 after cleaning, no baked ground shadow (the engine draws shadows).
5. Reference: open the file named in each brief's Reference bullet before drawing. There is no item square in `art/u7_reference_squares/`, so the references here are the stand-in sheets in `game/img/characters/` (the middle frame of their top row). They are references and development stand-ins: nothing copied from them ships.
6. Contained: nothing touches the top edge (row 0) or the right edge (column 47); the anchor is the bottom centre of the cell, [24, 47]; the outline 147 goes on the lower and right silhouette only.
7. Sidecar: `art/masters/<id>.json` per AR-600 (`frameWidth` 48, `frameHeight` 48, `anchor` [24, 47], `facings` ["S"], `animations` { "stand": [0] }, `standInSource`). Items are one frame; the tools' held layers and the clothes' tier layers live in the equipment segment (eq_ ids) and are only cross-referenced here.
8. Export: per `docs/ART_STANDARD.md` §5 step 8 the approved master is copied into `game/img/characters/` under a `!$` name at 1:1 (no scaling). The engine reads an item's frame from column 1, row 0 of a 3×4 grid of the sidecar's frame size (`UF_Items`), so the exported sheet is 144×192 with the 48×48 master in the middle frame of the top row; the master itself stays 48×48.
9. Catalog: when a file lands, the item's `image` in `items.types` changes to the new name and, for the five tinted entries (the tools and clothes), the `tint` field is removed: the tint exists only to tell the shared stand-in apart. Gemini may edit the `items.types` list for that and nothing else in the catalog.
10. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated).
11. Then mark the request row in `docs/ASSET_REQUESTS.md` (AR-200 for the materials and food, AR-201 for the tools and clothes) DELIVERED with the backticked file name; the user approves each asset before it ships (`art/APPROVALS.md`).
12. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-07_items_b_tools_clothes.md`.

---

### fiber — Plant fiber (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 30 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a low object, so it leans up and left by only its 6 px of thickness; the top strands are lit, the south belly is mid, the east cut ends are dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_PlantFiber` stand-in in `game/img/characters/` (SHAPES.VGA shape 654 frame 0, a small purple sprig; reference only, nothing copied ships)
- **Palette Ramps**: Strand 2 `#F7E7A6` (lit), 3 `#F3DF79`, 136 `#CAB292` (belly), 137 `#BA9A71` (shade); Fresh ends 202 `#7D9600`, 168 `#71864D`; Tie 139 `#9A7141`, 141 `#7D4D18`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A hank of stripped stalks twisted into a loose skein and tied once at its waist, lying on the ground. The skein spans columns 12–41 and rows 30–47: its contact is the lower loop on rows 41–47, columns 14–41, and because the hank is 6 px thick its upper edge sits 6 px up and 6 px left of that, running from row 30, column 12 to row 36, column 35. The top face is the upper-left 3-px band of the skein in 2 with 3 micro-dithered into it; the south belly (the middle 8 px) is 136 with a 1-px 137 strand line every 2 px running along the length; the east end (columns 35–41) is a fan of five frayed 1-px strand tips in 202 and 168 over 137, the freshly cut ends. The tie is a 3-px band of 139 at columns 25–27, rows 33–44, with one 141 knot pixel at row 38, column 26, and it pinches the skein 2 px narrower. The outline is 147 on the lower and right silhouette only; rows 0–29, columns 0–11 and columns 42–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: the stack lies on its cell as this one frame whatever its count (up to 10; the look label reads "10 × Plant fiber") until it is hauled or used up by a recipe: Knap a stone knife (1), Haft a stone axe (1), Haft a stone pick (1), Weave a fiber wrap (6), Sew a hide cloak (2). It comes from "gather" on `bush` (2), `desert_shrub` (1), `snow_bush` (1), `grass_tuft` (1) and `fern` (1), and from "chop" on `cactus_tall` (2).

#### Readability Check:
At zoom ⅓ a pale-yellow twisted loop with a dark waist, unlike straw (a golden sheaf with a dotted cut end) and the woven wrap (a neat square fold with straight edges).

Deliver: art/masters/fiber.png (48×48, magenta background) + art/masters/fiber.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### straw — Straw (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 40 px wide and 28 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a bound sheaf lying with its stalks pointing up-left; 10 px thick, so its top edge sits 10 px up and left of its contact; top lit, south mid, east (the cut butt) dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_StrawBundle` stand-in in `game/img/characters/` (SHAPES.VGA shape 1023 frame 0, a round golden bundle; reference only, nothing copied ships)
- **Palette Ramps**: Stalk 2 `#F7E7A6` (lit edge), 3 `#F3DF79`, 4 `#EFD251` (body), 6 `#DBAE20` (grooves), 7 `#C69618`, 8 `#B28210` (shade), 9 `#9E690C` (deepest groove); Cord 139 `#9A7141`, 141 `#7D4D18`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A sheaf of dry stalks bound once at the waist, lying on its side with the seed heads up-left and the cut butt bottom-right. The butt is an oval of cut stalk ends 12 px wide and 10 px tall at columns 30–41, rows 36–46, its contact on rows 44–47; it is filled with a micro-dither of 4 and 7 dots on a 6 ground, the ends of the stalks. From the butt the body runs up-left, 14 px thick across its width, to the heads at columns 3–16, rows 20–30, so the whole sheaf spans columns 3–42 and rows 20–47. Its upper-left long edge is a 3-px band of 2 and 3; the body is 4 with a 1-px 6 groove every 2–3 px running the length of the stalks; the lower-right long edge is 7 and 8 with one 9 line in the deepest groove. Six nodding seed heads in 6 with 4 highlights fan out at the up-left end; the cord is a 4-px band of 139 across the waist at columns 22–25 with a 141 knot of 2 px on its lower-right side. The outline is 147 on the lower and right silhouette only; rows 0–19, columns 0–2 and columns 43–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: one frame for any stack up to 10. It comes from "gather" on `reeds` (2), `wild_grain` (1, with 1 seeds) and `wheat_wild` (1, with 1 seeds). Two straw hauled onto a cell build a Straw bed (`floor_straw`, AR-104, its own brief in SEG-00): the bed's unbuilt state is this icon lying on the cell, its built state is the bed's own file. Tags straw, material, bedding; no recipe uses it.

#### Readability Check:
At zoom ⅓ a warm golden diagonal streak with a dotted round end, longer and yellower than the plant-fiber hank and brighter than a log.

Deliver: art/masters/straw.png (48×48, magenta background) + art/masters/straw.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### meat_raw — Raw meat (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 28 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a joint 8 px thick lying on its cut face, so its top rises 8 px up and left of the contact; top lit, south mid, east dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_RawMeat` stand-in in `game/img/characters/` (SHAPES.VGA shape 377 frame 23, a small brown joint; reference only, nothing copied ships)
- **Palette Ramps**: Flesh 21 `#FF394D` (lit top), 23 `#DF1428`, 24 `#C20C1C` (south), 26 `#8A040C` (east), 28 `#510000` (crease); Fat 32 `#FFDFBA`, 134 `#EBE3D7`; Bone 134 `#EBE3D7`, 120 `#CECECE`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A raw haunch: a rounded joint of red meat with a knuckle of bone sticking out of its upper-left end. The meat body fills columns 14–37, rows 30–47, with its contact (the flat cut face) on rows 44–47, columns 16–37; it is 8 px thick, so the rounded top face is the upper-left half of the body in 21 with 23 micro-dithered into it, the south face (rows 40–46) is 24, and the east face (columns 33–37) is 26 with a 28 line in the crease where the joint meets the ground. A 2-px strip of fat runs along the top-left rim of the body in 32 with 134 dither. The bone shank leaves the body's upper-left corner as a 3-px-wide 134 bar from row 31, column 15 to the knuckle, a 6×6 knob at columns 10–15, rows 26–31, in 134 with 120 on its lower-right half. The outline is 147 on the lower and right silhouette only, plus one 147 pixel under the knob; rows 0–25, columns 0–9 and columns 38–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state as an item: a stack of up to 5 shows this one frame. Roast meat (`cook_meat`: 1 raw meat → 1 `meat_cooked`, 90 work, skill cooking, next to an object tagged `fire`, today the `campfire`) replaces it with the cooked joint, its own brief and file below; eaten raw it removes 20 hunger and the stack shrinks by one. It is what a hunt drops: `deer` 3, `boar` 3, `aurochs` 6, `wild_horse` 4, `wild_sheep` 2, `wolf` 2, `troll` 4, and 1 from the small game (`hare`, `fowl`, `rat`, `fox`, `hawk`, `serpent` and the rest).

#### Readability Check:
At zoom ⅓ the only bright red lump on the ground, with a pale knob at one end; the cooked joint is the same shape in brown, and berries are a scatter of small dots rather than one mass.

Deliver: art/masters/meat_raw.png (48×48, magenta background) + art/masters/meat_raw.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### meat_cooked — Cooked meat (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 28 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the same joint as `meat_raw`, 8 px thick, top rising 8 px up and left of the contact; top lit, south mid, east dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_HaunchMeat` stand-in in `game/img/characters/` (SHAPES.VGA shape 377 frame 8, a darker brown joint; reference only, nothing copied ships)
- **Palette Ramps**: Crust 8 `#B28210` (gloss dots), 140 `#8A5D2D` (lit top), 10 `#8A5508`, 11 `#754504` (south), 12 `#613100`, 13 `#4D2400` (east), 145 `#3D240C` (crease); Bone 134 `#EBE3D7`, 136 `#CAB292`, 137 `#BA9A71` (scorched base); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The same silhouette as the raw joint, pixel for pixel, so the swap after roasting reads as one joint changing colour: the body on columns 14–37, rows 30–47 with its contact on rows 44–47, the bone shank and the 6×6 knuckle at columns 10–15, rows 26–31. The top face (upper-left half) is 140 with 10 micro-dithered into it and eight single 8 pixels scattered over it as fat gloss; the south face (rows 40–46) is 11 with 12 dither on its lower 2 px; the east face (columns 33–37) is 13 with a 145 line in the crease. The bone is 134 with 136 on its lower-right half and a 137 band 2 px wide where the shank enters the meat, the part that scorched. The outline is 147 on the lower and right silhouette only; rows 0–25, columns 0–9 and columns 38–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 5 shows this one frame. It is made by Roast meat (`cook_meat`, 1 `meat_raw`) and Roast fish (`cook_fish`, 1 `fish`), both 90 work next to a `fire`-tagged object; eaten it removes 50 hunger and the stack shrinks by one. No recipe takes it as an input.

#### Readability Check:
At zoom ⅓ a brown lump with a pale knob at one end: the raw joint's shape in the log's colours, but shorter and rounder than a log and with the knuckle.

Deliver: art/masters/meat_cooked.png (48×48, magenta background) + art/masters/meat_cooked.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### fish — Fish (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 34 px wide and 14 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a fish lying on its side, 6 px thick, so its back sits 6 px up and left of the belly line; the back is lit, the flank mid, the tail end dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_RiverFish` stand-in in `game/img/characters/` (SHAPES.VGA shape 509 frame 0, a tiny blue fish; reference only, nothing copied ships)
- **Palette Ramps**: Back 74 `#BABAFF` (lit), 76 `#7D7DFF`, 78 `#3D3DFF` (fins); Flank 118 `#EFEFEF`, 120 `#CECECE`, 122 `#AEAEAE`, 126 `#6D6D6D` (gill, tail shade); Eye 15 `#FFFFFF`, 147 `#201408`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A whole fish lying on its side with its head up-left and its tail bottom-right, spanning columns 8–41 and rows 34–47. The belly line is the contact on rows 44–47 from column 14 to column 36; the body is a spindle 10 px deep at its middle (columns 18–28) tapering to a 3-px tail root at column 34, then a forked tail 7 px wide at columns 35–41, rows 38–46. The back is the upper-left 3-px band of the spindle in 76 with 74 micro-dithered along its crest; the flank is 120 with a 118 highlight band 2 px wide just under the back and single 118 pixels as scale glints; the belly edge (the lowest 2 px) is 122, and the tail and the last 4 px of the body are 122 with 126 on their lower-right side. The head (columns 8–17) has a 126 gill arc 1 px wide at column 16, an eye of one 147 pixel at row 39, column 12 with one 15 pixel to its upper-left, and a 147 mouth notch at row 42, column 8; a dorsal fin of 78, 5 px long and 2 px tall, sits on the back at columns 22–26, and a pelvic fin of 78 hangs 2 px below the belly at columns 20–22. The outline is 147 on the lower and right silhouette only; rows 0–33, columns 0–7 and columns 42–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 5 shows this one frame. It comes from "Fish here" on a water cell (the `fish` job: the angler stands on the bank and lands one fish 2 times in 3, dropped where they stand); Roast fish (`cook_fish`, 1 fish → 1 `meat_cooked`, 90 work at a `fire`-tagged object) replaces it with the cooked joint's file; eaten raw it removes 25 hunger.

#### Readability Check:
At zoom ⅓ a small silver-blue sliver lying flat, the only blue item; longer and thinner than a stone and cooler than every meat.

Deliver: art/masters/fish.png (48×48, magenta background) + art/masters/fish.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### hide — Hide (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 38 px wide and 24 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a pelt lying flat, fur side up, only 2 px thick, so it is almost all top face; its turned-up rim on the lower and right edges is the south and east face
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_LeatherHide` stand-in in `game/img/characters/` (SHAPES.VGA shape 851 frame 0, a small blue speckled slab; reference only, nothing copied ships)
- **Palette Ramps**: Fur 137 `#BA9A71` (lit), 138 `#AA8659`, 139 `#9A7141`, 140 `#8A5D2D` (shade), 141 `#7D4D18` (spine, hair strokes); Flesh side 135 `#DBCAB2`, 136 `#CAB292`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A whole pelt laid out flat, fur up: an irregular oval body with four short leg flaps and a neck flap, spanning columns 5–42 and rows 24–47, its whole underside the contact. The body is a lumpy oval from column 9 to column 38 and from row 26 to row 45; the leg flaps are 5×4 lobes at the upper-left (columns 5–9, rows 28–31), upper-right (columns 36–40, rows 26–29), lower-left (columns 7–11, rows 41–44) and lower-right (columns 38–42, rows 40–43), and the neck flap is a 6×5 lobe at columns 18–23, rows 24–28. The fur is 137 with 138 micro-dithered across the upper-left third, 139 in the centre and 140 across the lower-right third; a 141 spine line runs from the neck flap to the lower-right at 45°, and 1-px 141 hair strokes 3 px long lie parallel to it every 3 px. The turned-up flesh-side rim is a 2-px band of 135 (inner) and 136 (outer) along the lower and right edges of the body and of every flap: the object's only south and east face. The outline is 147 on the lower and right silhouette only; rows 0–23, columns 0–4 and columns 43–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 5 shows this one frame. It is what a hunt drops beside the meat: `deer`, `boar`, `wild_horse`, `hare`, `wolf`, `jackal`, `fox`, `arctic_fox`, `wildcat` and `serpent` 1 each, `aurochs` and `troll` 2. Sew a hide cloak uses 2 with 2 plant fiber (240 work, skill crafting; a knife speeds it) and gives `hide_cloak`, its own brief and file below.

#### Readability Check:
At zoom ⅓ a flat tan blotch with little lobes, wider and flatter than any other item and warmer than the loose stones; the hide cloak is the same tan folded into a compact block with a pale collar.

Deliver: art/masters/hide.png (48×48, magenta background) + art/masters/hide.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### bone — Bone (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 34 px wide and 20 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: bones lying on the ground, the long one 5 px thick, so each shows a lit upper-left top, a mid south side and a dark east end
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_AnimalBone` stand-in in `game/img/characters/` (SHAPES.VGA shape 507 frame 9, a small red-and-white rib cluster; reference only, nothing copied ships)
- **Palette Ramps**: Bone 148 `#EFEBE7` (lit), 134 `#EBE3D7`, 135 `#DBCAB2` (south), 136 `#CAB292` (knob pits), 150 `#CEC6BE` (east ends); Marrow 137 `#BA9A71`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Three clean bones: a long bone with a knob at each end lying at 45° from upper-left to lower-right, a curved rib under it, and a short bone beside the rib, together spanning columns 6–39 and rows 27–47. The long bone's upper knob is a 7×7 rounded block at columns 6–12, rows 27–33; its shaft is 4 px wide and runs down-right to the lower knob, a 7×7 block at columns 30–36, rows 40–46, whose base is the contact; the shaft's upper-left edge is 148, its middle 134, its lower-right edge 135, and each knob has a 136 pit of 2 px at its centre with a 150 lower-right quarter. The rib is a 3-px-wide arc of 134 with a 148 top edge and a 135 underside, curving from row 46, column 16 up to row 38, column 26 and down to row 44, column 39, its right end cut to show a 137 marrow pixel. The short bone is a 9×3 bar of 134 with 148 on top at columns 14–22, rows 40–42, with 2-px knobs at each end. The outline is 147 on the lower and right silhouette of each bone only; rows 0–26, columns 0–5 and columns 40–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one frame. It comes from "pick" on `bones_pile` (2, the pile is then gone; the pile is its own object brief in SEG-04) and from hunts: `deer` 2, `aurochs` 3, `restless_dead` 3. No recipe uses it yet (2026-09-18).

#### Readability Check:
At zoom ⅓ a pale, almost white, diagonal stick with knobbed ends: the palest item on the ground, cooler than straw and thinner than the wool fleece.

Deliver: art/masters/bone.png (48×48, magenta background) + art/masters/bone.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### wool — Wool (AR-200)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 30 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a rolled fleece 12 px thick, so its crown sits 12 px up and left of its contact; the crown is lit, the south side mid, the east side dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_WoolFleece` stand-in in `game/img/characters/` (SHAPES.VGA shape 653 frame 0, a small striped white-and-orange bale; reference only, nothing copied ships)
- **Palette Ramps**: Fleece 15 `#FFFFFF` (crown), 148 `#EFEBE7`, 149 `#DFD7D2` (south), 150 `#CEC6BE` (east), 151 `#BEB2AE` (deepest crimp); Tips 134 `#EBE3D7`; Tie 139 `#9A7141`, 141 `#7D4D18`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A shorn fleece rolled loosely into a soft oval and tied once, sitting on the ground. Its contact is an oval on rows 42–47, columns 16–40; the mound rises 12 px and slides 12 px left, so the crown is an oval of about the same size at columns 6–30, rows 26–36, and the whole shape spans columns 6–40 and rows 26–47. The crown is 15 with 148 micro-dithered around its rim; the south side (from the crown's lower edge down to row 46) is 149 with 1-px wavy 150 lines every 3 px, the crimp of the wool; the east side (the right 8 px of the mound) is 150 with 151 in the two deepest crimps. Six single 134 pixels sit on the outermost tufts of the rim where the fleece tips are still yellowed. The tie is a 3-px band of 139 over the crown from column 20 to column 26, bending down the south side to the contact, with a 141 knot of 2 px at row 41, column 27. The outline is 147 on the lower and right silhouette only; rows 0–25, columns 0–5 and columns 41–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 5 shows this one frame. It comes from a `wild_sheep` hunt (1, with 2 raw meat). No recipe uses it yet (2026-09-18).

#### Readability Check:
At zoom ⅓ a soft white mound, the roundest and whitest item, unlike the bone (a thin pale stick) and the loose stones (grey and angular).

Deliver: art/masters/wool.png (48×48, magenta background) + art/masters/wool.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### stone_axe — Stone axe (AR-201)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 36 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a hafted axe lying on the ground with its head up-left and its haft trailing down-right; the head is 8 px thick, so its top facet is lit, its south face mid, its east face dark
- **Reference**: none in `art/u7_reference_squares/`; the stand-in is the tinted `!$U7_Item_RoughStone` in `game/img/characters/` (SHAPES.VGA shape 815 frame 0, a bare grey pebble: a reference for the head's stone only); for the haft see the `!$U7_Item_WoodLog` stand-in (reference only, nothing copied ships)
- **Palette Ramps**: Head 118 `#EFEFEF` (edge glint), 120 `#CECECE` (top facet), 122 `#AEAEAE`, 124 `#8E8E8E` (south), 126 `#6D6D6D` (east), 128 `#515151` (knapping scars); Haft 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Lashing 136 `#CAB292`, 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A knapped stone head lashed into the split end of a straight wooden haft, the whole tool lying diagonally so it spans columns 6–41 and rows 17–47. The haft is 5 px wide and runs at 45° from its butt at columns 36–41, rows 42–47 (the contact) up-left to the socket at columns 15–20, rows 24–29; its upper-left edge is 141, its middle 143 and its lower-right edge 145. The head is a wedge 14 px long and 10 px deep at columns 6–19, rows 17–28, the cutting edge on its upper-left end: the top facet (upper-left half) is 120 with 122 micro-dithered into it and a 1-px 118 glint along the edge, the south face (its lower 4 px) is 124 with 122 dither, the east face (its right 3 px) is 126, and three 128 knapping scars 2–3 px long sit on the top facet. The lashing is an X of 136 cord 2 px wide with a 138 shadow line on each strand's lower-right side, crossing the socket at columns 14–21, rows 22–30, and a 138 turn wraps the haft 3 px below it. The outline is 147 on the lower and right silhouette only; rows 0–16, columns 0–5 and columns 42–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
As a ground item it is this one frame (stack 1). Equipped, it goes into the unit's tool slot and speeds "chop" ×2 and the Split firewood recipe (tool tag axe); today nothing is drawn in the hand, and the AR-600 renderer (next build) composes the held layer `$UF_held_stone_axe.png`, whose brief is `eq_stone_axe` in the equipment segment, not repeated here. It is made by Haft a stone axe (2 stone, 1 log, 1 plant fiber, 120 work, skill stonework). The catalog tint a8b8c8 only tints the shared stone stand-in; the entry drops it when this file lands.

#### Readability Check:
At zoom ⅓ a long dark diagonal stick with a grey block at its upper-left end: the pick has a pointed tan head set crosswise on a longer haft, the knife has no haft at all, and the loose stones have no stick.

Deliver: art/masters/stone_axe.png (48×48, magenta background) + art/masters/stone_axe.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### stone_knife — Stone knife (AR-201)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 24 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a flat blade 3 px thick lying with its point up-left and its grip down-right; the blade's upper-left facets are lit, its lower-right facets and the grip's east side dark
- **Reference**: none in `art/u7_reference_squares/`; the stand-in is the tinted `!$U7_Item_RoughStone` in `game/img/characters/` (SHAPES.VGA shape 815 frame 0, a bare grey pebble: a reference for the stone only; reference only, nothing copied ships)
- **Palette Ramps**: Blade 118 `#EFEFEF` (edge glint), 120 `#CECECE` (lit facets), 122 `#AEAEAE`, 124 `#8E8E8E` (shadowed facets), 126 `#6D6D6D` (east edge); Grip 141 `#7D4D18`, 143 `#5D350C`; Wrapping 136 `#CAB292`, 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A leaf-shaped flint blade with a short grip wrapped in plant-fiber cord, lying diagonally across columns 10–33 and rows 30–47. The grip is a 4-px-wide bar from columns 24–33, rows 40–47 (its lower end the contact), in 141 with 143 on its lower-right edge and four 136 cord bands 1 px wide every 2 px, each with a 138 pixel on its lower-right end. The blade leaves the grip at columns 22–24, rows 37–40 and widens to 7 px at its middle (columns 15–18) before tapering to a point at row 30, column 10; its upper-left half is 120 with two 122 facet lines running from the spine to the edge, its lower-right half is 124 with 122 micro-dithered in, a 1-px 118 glint runs the length of the upper-left cutting edge, and the lower-right edge is 126. The outline is 147 on the lower and right silhouette only; rows 0–29, columns 0–9 and columns 34–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
As a ground item it is this one frame (stack 1). Equipped, it goes into the unit's tool slot and speeds "hunt" ×2, "gather" ×1.5 and craft ×1.5, and it is the knife tool that speeds Sew a hide cloak; today nothing is drawn in the hand, and the AR-600 renderer (next build) composes the held layer `$UF_held_stone_knife.png`, whose brief is `eq_stone_knife` in the equipment segment, not repeated here. It is made by Knap a stone knife (1 stone, 1 plant fiber, 90 work, skill stonework). The catalog tint d0d8e0 only tints the shared stone stand-in; the entry drops it when this file lands.

#### Readability Check:
At zoom ⅓ a small pale grey sliver with a dark stub, the smallest tool: no long haft like the axe and pick, and pointed and wrapped where a loose stone is a rounded speck.

Deliver: art/masters/stone_knife.png (48×48, magenta background) + art/masters/stone_knife.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### stone_pick — Stone pick (AR-201)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 40 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a long haft lying diagonally with a pointed stone head set crosswise at its upper-left end; the head is 8 px thick, so its top is lit, its south face mid, its east face dark
- **Reference**: none in `art/u7_reference_squares/`; the stand-in is the tinted `!$U7_Item_RoughStone` in `game/img/characters/` (SHAPES.VGA shape 815 frame 0, a bare grey pebble: a reference for the head's stone only); for the haft see the `!$U7_Item_WoodLog` stand-in (reference only, nothing copied ships)
- **Palette Ramps**: Head 150 `#CEC6BE` (top), 152 `#AEA29A` (south), 154 `#8E8279` (east), 156 `#6D615D` (scars), 148 `#EFEBE7` (point glint); Haft 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Lashing 136 `#CAB292`, 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A pointed stone head lashed crosswise to the end of a haft longer than the axe's, the tool lying diagonally so it spans columns 4–43 and rows 17–47. The haft is 5 px wide and runs at 45° from its butt at columns 38–43, rows 42–47 (the contact) up-left to the socket at columns 14–19, rows 22–27; its upper-left edge is 141, its middle 143 and its lower-right edge 145. The head is a tapered prism 16 px long and 8 px deep set across the haft's end, from its blunt poll at columns 16–21, rows 25–30 to its point at row 17, column 4: the top (the upper-left half of the prism) is 150 with 152 micro-dithered along its lower edge and a 1-px 148 glint on the last 3 px of the point, the south face (its lower 3 px) is 152, the east face (the poll and the 2 px beside it) is 154, and three 156 knapping scars sit on the top. The lashing is an X of 136 cord 2 px wide with a 138 shadow line on each strand's lower-right side across the socket at columns 13–21, rows 21–29, plus two 138 turns around the haft just below it. The outline is 147 on the lower and right silhouette only; rows 0–16, columns 0–3 and columns 44–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
As a ground item it is this one frame (stack 1). Equipped, it goes into the unit's tool slot and speeds "quarry" ×2, "mine" ×2 and "pick" ×1.5; today nothing is drawn in the hand, and the AR-600 renderer (next build) composes the held layer `$UF_held_stone_pick.png`, whose brief is `eq_stone_pick` in the equipment segment, not repeated here. It is made by Haft a stone pick (2 stone, 1 log, 1 plant fiber, 120 work, skill stonework). The catalog tint b8a890 only tints the shared stone stand-in; the entry drops it when this file lands, and the warm grey head above keeps the tan identity that tint gave it.

#### Readability Check:
At zoom ⅓ the longest diagonal stick, with a warm-grey pointed bar across its upper-left end; the axe's head is a cooler grey block in line with the haft, and the knife has no haft.

Deliver: art/masters/stone_pick.png (48×48, magenta background) + art/masters/stone_pick.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### fiber_wrap — Woven wrap (AR-201)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 30 px wide and 20 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a folded cloth 8 px thick, so its top face sits 8 px up and left of its contact; the top is lit, the south fold face mid, the east fold face dark
- **Reference**: none in `art/u7_reference_squares/`; the stand-in is the tinted `!$U7_Item_PlantFiber` in `game/img/characters/` (SHAPES.VGA shape 654 frame 0, a small sprig: a reference for the material's colour only; reference only, nothing copied ships)
- **Palette Ramps**: Cloth 1 `#FBF3CE` (lit), 2 `#F7E7A6` (top), 3 `#F3DF79` (weave), 136 `#CAB292` (south fold), 137 `#BA9A71`, 138 `#AA8659` (east fold); Weave lines 139 `#9A7141`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A length of coarse woven cloth folded twice into a neat rectangle with a fringed edge, lying flat. Its contact is a 22×6 rectangle on rows 42–47, columns 18–39; the block is 8 px thick, so the top face is a 22×12 rectangle 8 px up and left, at columns 10–31, rows 28–39, and the whole shape spans columns 10–39 and rows 28–47. The top face is 2 with a checker micro-dither of 3 (every other pixel on every other row) to read as weave, a 1-px 139 line every 4 px along the fold direction, and a 1-px 1 highlight along its upper-left two edges. The south fold face is the 8-px band below the top face's lower edge, columns 12–37: 136 with a 137 line at each of its two visible folds (rows 42 and 45); the east fold face is the 8-px band right of the top face, 138 with 137 dither on its upper half. A fringe of 1-px 3 ticks 2 px long hangs off the south face's lower edge every 2 px, each with a 137 pixel at its tip. The outline is 147 on the lower and right silhouette only; rows 0–27, columns 0–9 and columns 40–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
As a ground item it is this one frame (stack 1). Worn, it sets the wearer's clothing tier to 1: today the whole sheet swaps to the tier-1 sheet listed in the catalog's `tiers` (index 1), and under AR-600 it becomes the tier-1 clothes layer (`$UF_<species>_<gender>_clothes_T1.png`, one per species and gender), briefed under its eq_ id in the equipment segment, not repeated here. It is made by Weave a fiber wrap (6 plant fiber, 180 work, skill crafting). The catalog tint e0d0a0 only tints the shared plant-fiber stand-in; the entry drops it when this file lands.

#### Readability Check:
At zoom ⅓ a pale straw-coloured square block with straight edges, unlike the plant-fiber hank (a twisted loop) and straw (a long diagonal sheaf).

Deliver: art/masters/fiber_wrap.png (48×48, magenta background) + art/masters/fiber_wrap.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### hide_cloak — Hide cloak (AR-201)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a folded cloak 10 px thick, so its top face sits 10 px up and left of its contact; the top is lit, the south fold face mid, the east fold face dark
- **Reference**: none in `art/u7_reference_squares/`; the stand-in is the tinted `!$U7_Item_LeatherHide` in `game/img/characters/` (SHAPES.VGA shape 851 frame 0, a small speckled slab: a reference for the material only; reference only, nothing copied ships)
- **Palette Ramps**: Leather 137 `#BA9A71` (lit), 138 `#AA8659` (top), 139 `#9A7141` (south fold), 140 `#8A5D2D`, 141 `#7D4D18` (east fold); Fur collar 134 `#EBE3D7`, 135 `#DBCAB2`, 136 `#CAB292`; Toggle 148 `#EFEBE7`; Tie 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A cloak of stitched hide folded into a compact block with its fur collar turned out on top and a bone toggle on a cord. Its contact is a 20×6 oval-cornered rectangle on rows 42–47, columns 20–39; the block is 10 px thick, so the top face is a 20×10 rectangle 10 px up and left, at columns 10–29, rows 26–35, and the whole shape spans columns 8–39 and rows 24–47. The top face is 138 with 137 micro-dithered across its upper-left half and a 1-px 141 stitch line of alternating pixels running its length 3 px from the upper edge; the south fold face (the 10-px band below it, columns 12–37) is 139 with 140 at the two fold creases (rows 40 and 44); the east fold face (the 10-px band to its right) is 141 with 140 dither on its upper half. The fur collar is a 12×5 tuft along the top face's upper-left edge at columns 8–19, rows 24–28, in 135 with 134 tips on its upper-left pixels and 136 on its lower-right; the toggle is a 4×2 bar of 148 at row 30, columns 22–25, hung from a 1-px 143 cord loop 3 px long. The outline is 147 on the lower and right silhouette only; rows 0–23, columns 0–7 and columns 40–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
As a ground item it is this one frame (stack 1). Worn, it sets the wearer's clothing tier to 2: today the whole sheet swaps to the tier-2 sheet listed in the catalog's `tiers` (index 2), and under AR-600 it becomes the tier-2 clothes layer (`$UF_<species>_<gender>_clothes_T2.png`, one per species and gender), briefed under its eq_ id in the equipment segment, not repeated here. It is made by Sew a hide cloak (2 hide, 2 plant fiber, 240 work, skill crafting; a knife speeds it). The catalog tint c8a880 only tints the shared hide stand-in; the entry drops it when this file lands.

#### Readability Check:
At zoom ⅓ a compact tan block with a pale tuft on its upper-left corner, unlike the raw hide (a flat lobed blotch) and the woven wrap (a paler, yellower block with no tuft).

Deliver: art/masters/hide_cloak.png (48×48, magenta background) + art/masters/hide_cloak.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).
