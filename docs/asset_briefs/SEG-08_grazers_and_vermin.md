# Segment 08: grazers and vermin (written 2026-09-18 by Claude Code)

The eight prey species of `wildlife.species` in `game/data/UF_WorldCatalog.json` whose `kind` is `grazer` or `vermin`: deer, boar, aurochs, wild horse, wild sheep, hare, wild fowl and rat. They are placed in herds by biome on New Game, wander, and are hunted by the colonists; predators, fliers and monsters are other segments. Every fact below about states, yields, tints and kinds is read from the catalog entry and from `docs/ASSET_INVENTORY.md` → Creatures; the hunt job itself (`UF_Jobs.js`, "hunt") drops the species' `yields` on the prey's cell and removes the unit, so no creature in this segment has a carcass sprite. Where a brief here disagrees with the deer, hare or boar brief in `SEG-00`, this one wins (it was checked later).

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares; every creature inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); no 16×16 upscaling; `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up, 1 px left per unit of height); the top (the back), the south face (chest and face) and the east face (the right flank) are visible; the hooves or feet nearest the viewer sit in the bottom-right region of the square and the body recedes up-left behind them (`docs/GUIDE_25D.md`).
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); at most 32 colours per asset; 1-px micro-dither between ramp steps is welcome; no gradients, no anti-aliasing against the background, no baked ground shadow (the engine draws shadows).
4. Masters: `art/masters/<id>.png` on flat magenta #FF00FF (alpha 0 or 255 after cleaning) plus `art/masters/<id>.json` per the AR-600 sidecar v2 (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations by column).
5. Sheets: the AR-600 grid, 16 columns × 4 rows of 48×48 frames = 768×192, rows S, W, E, N, columns in the fixed order stand (0), walk ×3 (1–3: step, stand, step), work ×3 (4–6), carry (7), attack ×3 (8–10), cast ×3 (11–13), hurt (14), dead (15); the creatures of this segment fill stand, walk and hurt only and leave the other columns transparent (the engine falls back to stand for a missing animation); the dead column stays empty because a hunt removes the unit and drops item icons on its cell.
6. Facings: draw the south stand frame first and get it approved, then build the other frames from it; W and E are transposes of N and S (x/y swap, which keeps the up-left lean), never mirrors; N is the back view.
7. Scale: every creature fits one square regardless of its real size; the aurochs and the horse are shrunk to fit, the hare, the fowl and the rat are drawn at the smallest size that still reads at zoom ⅓ (not true scale); each brief gives its drawn size.
8. Open the reference square named in each brief before drawing (`art/u7_reference_squares/`); where none exists the brief names the nearest one and today's stand-in sheet. A reference is a reference and a development stand-in: nothing copied from it ships.
9. Contained: nothing touches the top edge (row 0) or the right edge (column 47); the anchor is the bottom centre of the cell, [24, 47]; the contact pixels of the nearest feet sit on row 47.
10. Stance: wildlife stands on a yellow stance square that the engine draws under it (VISION V32); a 147 outline along the lower and right silhouette keeps each animal legible on that square and on light ground.
11. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated); then export = copy the file, unscaled, into `game/img/characters/` under the name the catalog's `image` field uses, or update that field (`docs/ART_STANDARD.md` §5, step 8).
12. Mark the AR-401 row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name; the user approves each asset before it ships (`art/APPROVALS.md`); verify an edited brief with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-08_grazers_and_vermin.md`.

---

### deer — Deer (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 37 px wide and 46 px tall, antler tips to hooves
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the forehooves sit in the bottom-right region, the back is the lit top face, the chest and face are the south face, the right flank is the dark east face
- **Reference**: `art/u7_reference_squares/u7_deer_48.png` (SHAPES.VGA shape 502 at 1:1; today's stand-in is the `$U7_Deer` sheet; a reference only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15). The deer fills stand, walk ×3 and hurt (columns 0–3 and 14) and leaves work, carry, attack, cast and dead transparent (a grazer never works, carries, attacks or casts, and a hunt drops item icons instead of a dead frame); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view.
- **Palette Ramps**: Coat 181 `#BE825D` (lit back), 182 `#AE653D` (chest, south face), 183 `#9E5124` (east flank), 184 `#8E3D0C` (belly, legs, nose); Throat and tail 134 `#EBE3D7`; Antler 136 `#CAB292`, 137 `#BA9A71` (underside); Inner ear 107 `#D2A692`; Eyes, hooves, outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The forehooves are 147 pixel pairs on row 47 at columns 30–31 and 36–37 under 2-px-wide legs of 184 that run up to row 38; the hind legs stand further north, on rows 24–36 at columns 8–9 and 13–14, with their 147 hooves on row 36, so the footprint reads as one cell seen from above. The chest is a rounded front 16 px wide on rows 28–40, columns 24–40, in 182 with 1-px micro-dither into 183 on its right (east) third and a 134 throat patch on rows 26–31, columns 26–30; from the withers at row 26, column 22 the back runs up-left as a band of 181, 8 to 10 px wide, to the rump on rows 12–24, columns 4–16, dithered into 182 along its lower-right edge, with the east flank below it in 183 and the belly line in 184, and a 2×3 tail flash of 134 at the rump's top-left on rows 13–15, columns 4–5. The neck rises from the chest to a head 10 px wide and 12 px tall on rows 8–20, columns 18–28, its muzzle pointing down at the viewer with a 2×2 nose of 184 on rows 18–19, columns 22–23, two 147 eye pixels on row 12 at columns 20 and 26, and leaf-shaped ears 3×6 with a 107 inner pixel on rows 8–13 at columns 15–17 and 29–31. The antlers are beams of 136, 2 px thick with 137 undersides, that leave the crown on row 8 and branch up-left and up-right to row 2, spanning columns 10–34, three tines each. The outline is 147 only along the lower and right silhouette (the belly, the right legs, the right side of the chest, neck and head); rows 0–1, columns 0–3 and columns 41–47 stay magenta, so nothing touches the top or right edge and the shape is contained.

#### Interaction / Transformed State Description:
No carcass or dead frame is used by the engine: a hunt (work 120; the deer `flees`, stepping away from its hunter) removes the unit and drops 3 `meat_raw`, 1 `hide` and 2 `bone` as item icons on its cell (their own briefs in the items segment, SEG-07). The deer has no other engine state.

#### Readability Check:
At zoom ⅓ the deer is the tallest russet animal, thin-legged, antlered and taller than it is long, unlike the heavier tan wild horse with its black mane and the near-black aurochs with its horns.

Deliver: art/masters/deer.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames = 768×192, magenta background) + art/masters/deer.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3, 2], "hurt": [14] }).

---

### boar — Boar (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 37 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); a low heavy body: the forehooves and the lowered head sit in the bottom-right region, the bristled ridge is the lit top face, the head and chest are the south face, the right flank is the dark east face
- **Reference**: none extracted; today's stand-in is the `$U7_Dog` sheet (SHAPES.VGA shape 496) tinted `#7a5a40` by the catalog; the nearest reference square for the lean of a four-legged animal is `art/u7_reference_squares/u7_deer_48.png` (references only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15). The boar fills stand, walk ×3 and hurt (columns 0–3 and 14) and leaves work, carry, attack, cast and dead transparent (a grazer never works, carries, attacks or casts, and a hunt drops item icons instead of a dead frame); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view.
- **Palette Ramps**: Bristle 158 `#514945` (lit ridge, forehead), 159 `#453D39` (flank, south face), 160 `#35312D` (east flank, underside), 161 `#242020` (legs, tail); Bristle tips 137 `#BA9A71`; Snout 111 `#9A6D59`, 110 `#AE7D65` (lit rim); Tusks 15 `#FFFFFF`; Eyes, nostrils, hooves, outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The forelegs are 3 px wide in 161 on rows 40–47 at columns 29–31 and 36–38 with 147 hooves on row 47; the hind legs stand further north on rows 32–39 at columns 16–18 and 23–25 with 147 hooves on row 39. The head is a wedge facing the viewer on rows 28–44, columns 24–40, widest at the ears and narrowing down to a 6×4 snout disc of 111 on rows 41–44, columns 29–34, with a 110 rim along its upper-left edge and two 147 nostrils on row 43 at columns 30 and 33; two tusks of 15, 1×3 px each, rise from the jaw on rows 38–40 at columns 27 and 36, the eyes are 147 pixels on row 34 at columns 27 and 37, the ears are 4×5 triangles of 159 with 160 backs on rows 27–31 at columns 22–25 and 39–42, and the forehead between them is 158. From the shoulders at row 28, column 24 the barrel rises up-left to the rump on rows 18–30, columns 6–18: the ridge (top face) is a 3-px band of 158 with 1-px ticks of 137 every 2 px along its upper edge for the pale bristle tips, the flank (south face) is 159 micro-dithered into 160 toward the underside, the east flank and the belly are 160, and a thin 161 tail curls at the rump's left on row 20, columns 6–7, ending in a 147 tuft. The outline is 147 along the lower and right silhouette only (the belly, the right legs, the right ear and the jaw). Rows 0–17, columns 0–5 and columns 43–47 stay magenta; nothing touches the top or right edge and the shape is contained.

#### Interaction / Transformed State Description:
No carcass or dead frame is used by the engine: a hunt (work 150; the boar does not flee, `flees` is false, so it stays where it is while the hunter works from a neighbouring cell) removes the unit and drops 3 `meat_raw` and 1 `hide` as item icons on its cell (items segment, SEG-07). The boar has no other engine state.

#### Readability Check:
At zoom ⅓ a low grey-brown block, longer than it is tall, with two white points at its front; darker and squarer than the hare and the sheep, half the size of the near-black aurochs and greyer.

Deliver: art/masters/boar.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames = 768×192, magenta background) + art/masters/boar.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3, 2], "hurt": [14] }).

---

### aurochs — Aurochs (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 41 px wide and 40 px tall (the largest creature in the segment, shrunk to fit)
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the forehooves and the broad head sit in the bottom-right region, the humped back is the lit top face, the face and chest are the south face, the right flank is the dark east face
- **Reference**: none extracted; today's stand-in is the `$U7_Ox` sheet (SHAPES.VGA shape 500) tinted `#6a4a30` by the catalog; the nearest reference square for the lean of a four-legged animal is `art/u7_reference_squares/u7_deer_48.png` (references only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15). The aurochs fills stand, walk ×3 and hurt (columns 0–3 and 14) and leaves work, carry, attack, cast and dead transparent (a grazer never works, carries, attacks or casts, and a hunt drops item icons instead of a dead frame); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view.
- **Palette Ramps**: Hide 144 `#4D2D0C` (lit top face: back, forehead), 145 `#3D240C` (south face: face, chest), 146 `#2D1C08` (east flank, belly, legs, tail); Dorsal stripe and muzzle ring 137 `#BA9A71`; Horn 136 `#CAB292` with 137 `#BA9A71` undersides; Horn tips, nostrils, hooves, eyes, tail tuft, outline 147 `#201408`; Eye catchlight 15 `#FFFFFF`; background `#FF00FF`.

#### Primary State Visual Description:
The forelegs are 4 px wide in 146 on rows 36–47 at columns 28–31 and 36–39 with 147 hooves on row 47; the hind legs stand further north on rows 26–37 at columns 12–15 and 20–23 with 147 hooves on row 37. The head is a broad block facing the viewer on rows 26–42, columns 22–38, turned a little to the viewer's left: the forehead's top face is 144, the face 145 micro-dithered into 146 on its right half, a 137 muzzle ring sits on rows 38–42, columns 25–35 with two 147 nostrils on row 40 at columns 28 and 32, the eyes are 147 pixels on row 31 at columns 24 and 36 each with one 15 catchlight pixel to its upper-left, and 4×4 ears of 145 sit on rows 27–30 at columns 19–22 and 38–41. The horns are 136, 3 px thick with 137 undersides: each leaves the poll on row 26, sweeps outward and forward and turns its 147 tip up; because of the turn the left horn shows its full sweep on rows 16–28, columns 12–22, and the right horn is foreshortened on rows 16–28, columns 38–44. From the shoulder hump on rows 14–26, columns 16–30 (row 14 is the highest point of the back) the top face runs up-left to the rump on rows 8–20, columns 4–16, in 144 with a 2-px dorsal stripe of 137 down its middle from the hump to the tail; the flank (south face) is 145 micro-dithered into 146 toward the belly, the east flank and the belly are 146, and the tail hangs down the rump's left edge in 146 from row 12 to row 30 at columns 4–5 with a 147 tuft. The outline is 147 along the lower and right silhouette only, and it is what keeps this dark hide legible on dark ground. Rows 0–7, columns 0–3 and columns 45–47 stay magenta; nothing touches the top or right edge and the shape is contained.

#### Interaction / Transformed State Description:
No carcass or dead frame is used by the engine: a hunt (work 240, the longest in the segment; the aurochs does not flee, `flees` is false, so it stays where it is while the hunter works from a neighbouring cell) removes the unit and drops 6 `meat_raw`, 2 `hide` and 3 `bone` as item icons on its cell (items segment, SEG-07). The aurochs has no other engine state.

#### Readability Check:
At zoom ⅓ the largest animal on the map, filling its square, near-black with a pale line along its back and two pale horn arcs; the boar beside it is half the size and grey, the wild horse tan with a black mane.

Deliver: art/masters/aurochs.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames = 768×192, magenta background) + art/masters/aurochs.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3, 2], "hurt": [14] }).

---

### wild_horse — Wild horse (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 37 px wide and 45 px tall, ear tips to hooves
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the forehooves sit in the bottom-right region, the back is the lit top face, the chest, neck and face are the south face, the right flank is the dark east face
- **Reference**: none extracted; today's stand-in is the `$U7_Horse` sheet (SHAPES.VGA shape 727, no tint); the nearest reference square for the lean of a four-legged animal is `art/u7_reference_squares/u7_deer_48.png` (references only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15). The wild horse fills stand, walk ×3 and hurt (columns 0–3 and 14) and leaves work, carry, attack, cast and dead transparent (a grazer never works, carries, attacks or casts, and a hunt drops item icons instead of a dead frame); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view.
- **Palette Ramps**: Coat 138 `#AA8659` (lit back), 139 `#9A7141` (chest, neck, south face), 140 `#8A5D2D` (east flank), 141 `#7D4D18` (belly, upper legs, lower lip); Mane, tail, dorsal stripe, lower legs, ear tips 145 `#3D240C`; Hooves, eyes, nostrils, outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The forelegs are 3 px wide on rows 32–47 at columns 30–32 and 37–39, 141 above the knee and 145 from row 40 down to the 147 hooves on row 47; the hind legs stand further north on rows 24–38 at columns 12–14 and 18–20, 145 below row 32, with 147 hooves on row 38. The chest is a rounded front 16 px wide on rows 26–40, columns 24–40, in 139 with 1-px micro-dither into 140 on its right (east) third; the neck rises up-left from it, 8 px wide, 139 on its left half and 140 on its right, with the mane a 3-px band of 145 along its upper-left edge from row 26 up to row 8. The head is 8 px wide and 14 px tall on rows 8–22, columns 16–24, the muzzle pointing down at the viewer with two 147 nostrils on row 20 at columns 18 and 22 and a 141 lower lip on rows 21–22, 147 eyes on row 12 at columns 16 and 24, and 2×5 ears of 139 with 145 tips on rows 3–7 at columns 17–18 and 22–23. From the withers at row 24, column 22 the back (top face) runs up-left as a 10-px band of 138 with a 2-px dorsal stripe of 145 down its middle to the croup on rows 10–24, columns 4–14, micro-dithered 138 into 139 along its lower-right edge; the east flank is 140, the belly 141, and the tail of 145, 2 to 3 px wide, falls from the croup at row 10, column 4 down the rump's left edge to row 30. The outline is 147 along the lower and right silhouette only (the belly, the right legs, the right side of the chest, neck and head). Rows 0–2, columns 0–3 and columns 41–47 stay magenta; nothing touches the top or right edge and the shape is contained.

#### Interaction / Transformed State Description:
No carcass or dead frame is used by the engine: a hunt (work 180; the horse `flees`, stepping away from its hunter, and has the widest `wander` of the segment) removes the unit and drops 4 `meat_raw` and 1 `hide` as item icons on its cell (items segment, SEG-07). The wild horse has no other engine state.

#### Readability Check:
At zoom ⅓ a tall tan body with a black mane and tail and a long lowered head; the deer is redder and thinner with antlers, the aurochs blacker and squarer with horns.

Deliver: art/masters/wild_horse.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames = 768×192, magenta background) + art/masters/wild_horse.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3, 2], "hurt": [14] }).

---

### wild_sheep — Wild sheep (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 29 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the forehooves and the dark face sit in the bottom-right region, the fleece's top is the lit top face, the chest is the south face, the right flank is the dark east face
- **Reference**: none extracted; today's stand-in is the `$U7_Sheep` sheet (SHAPES.VGA shape 970, no tint); the nearest reference square for the lean of a four-legged animal is `art/u7_reference_squares/u7_deer_48.png` (references only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15). The wild sheep fills stand, walk ×3 and hurt (columns 0–3 and 14) and leaves work, carry, attack, cast and dead transparent (a grazer never works, carries, attacks or casts, and a hunt drops item icons instead of a dead frame); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view.
- **Palette Ramps**: Wool 134 `#EBE3D7` (lit top face, muzzle), 135 `#DBCAB2` (curl dither, tail), 136 `#CAB292` (south face), 138 `#AA8659` (east flank, underside); Face, ears and legs 159 `#453D39`, 160 `#35312D` (right side); Horn 137 `#BA9A71`, 139 `#9A7141` (underside); Eyes 5 `#EFCA28`; Hooves, outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The forelegs are 2 px wide in 160 on rows 40–47 at columns 28–29 and 34–35 with 147 hooves on row 47; the hind legs stand further north on rows 30–38 at columns 16–17 and 22–23 with 147 hooves on row 38. The fleece is a lumpy mass with a scalloped silhouette on rows 20–40, columns 10–36, rising up-left from the shoulders at row 30, column 26 to the rump on rows 20–30, columns 10–20: its top face is 134 with 1-px micro-dither of 135 in short curls, its south face (the chest and lower front) 135 dithered into 136, its east flank and underside 138, and a 2×4 tail tuft of 135 sits at the rump's top-left on rows 20–23, columns 10–11. The head is a dark face 6 px wide and 8 px tall on rows 24–32, columns 26–32, in 159 with 160 on its right side, a 2×2 muzzle of 134 on rows 31–32, columns 28–29, two 5 eye pixels on row 27 at columns 27 and 31, and 2×4 ears of 159 on rows 23–26 at columns 24–25 and 33–34. The horns are curls of 137, 3 px thick with 139 undersides and 8 px across, one on rows 18–26 at columns 20–27 and one on rows 18–26 at columns 31–38, each leaving the crown, curling back, out and down around its ear. The outline is 147 along the lower and right silhouette only. Rows 0–17, columns 0–9 and columns 39–47 stay magenta; nothing touches the top or right edge and the shape is contained.

#### Interaction / Transformed State Description:
No carcass or dead frame is used by the engine: a hunt (work 100; the sheep `flees`, stepping away from its hunter) removes the unit and drops 2 `meat_raw` and 1 `wool` as item icons on its cell (items segment, SEG-07); it is the only species in the segment that drops `wool` and drops no `hide`. The wild sheep has no other engine state.

#### Readability Check:
At zoom ⅓ the only near-white animal on grass or bare rock, a cream lump with a dark face; the hare is smaller and tan with upright ears, the fowl brown with a red dot.

Deliver: art/masters/wild_sheep.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames = 768×192, magenta background) + art/masters/wild_sheep.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3, 2], "hurt": [14] }).

---

### hare — Hare (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 24 px wide and 22 px tall, ear tips to feet
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); a small crouched body with its hind feet in the bottom-right region, the back the lit top face, the flank the south face, the right end the dark east face, and the ears leaning up-left
- **Reference**: `art/u7_reference_squares/u7_hare_48.png` (SHAPES.VGA shape 811 at 1:1; today's stand-in is the `$U7_Hare` sheet; a reference only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15). The hare fills stand, walk ×3 and hurt (columns 0–3 and 14) and leaves work, carry, attack, cast and dead transparent (a grazer never works, carries, attacks or casts, and a hunt drops item icons instead of a dead frame); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view.
- **Palette Ramps**: Fur 136 `#CAB292` (lit back, outer ears), 137 `#BA9A71` (flank), 139 `#9A7141` (underside, feet, ear tips); Belly and tail 134 `#EBE3D7`; Inner ear and nose 107 `#D2A692`; Eye, outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The hind feet are two 4×2 blocks of 139 on rows 46–47 at columns 28–31 and 33–36, each with a 147 pixel at its right end on row 47, and the forefeet tuck under the chest as 2×1 pixels of 139 on row 45 at columns 22–23 and 25–26. The body is a crouched oval 12 px long and 8 px tall on rows 38–46, columns 24–36: its back (top face) 136 micro-dithered into 137 along its lower-right, its flank (south face) 137, its underside and its right (east) end 139, with a 3-px belly strip of 134 on rows 43–45 and a 2×2 tail of 134 at the rump's upper-right corner on rows 38–39, columns 35–36. The head is 6×6 on rows 34–40, columns 20–26, up-left of the body's front, with one 147 eye pixel on row 36 at column 22 and a 107 nose pixel on row 39 at column 20; the ears are 2 px wide and 8 px long and rise up-left from the crown at row 34 to row 26, one from columns 21–22 to columns 13–14 and one from columns 24–25 to columns 16–17, their outer edges 136, a 1-px line of 107 inside each and 139 tips. The outline is 147 along the lower and right silhouette only. Rows 0–25, columns 0–12 and columns 37–47 stay magenta; nothing touches the top or right edge and the shape is contained.

#### Interaction / Transformed State Description:
No carcass or dead frame is used by the engine: a hunt (work 60; the hare `flees`, stepping away from its hunter) removes the unit and drops 1 `meat_raw` and 1 `hide` as item icons on its cell (items segment, SEG-07). The hare has no other engine state; it is also the prey placed near the start so the pair can hunt on day one.

#### Readability Check:
At zoom ⅓ a small tan blob with two upright ears, smaller than the sheep and paler than the rat; the fowl beside it has no ears and a red comb.

Deliver: art/masters/hare.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames = 768×192, magenta background) + art/masters/hare.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3, 2], "hurt": [14] }).

---

### fowl — Wild fowl (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn bird is 24 px wide and 24 px tall, comb to toes
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); a ground bird with its feet in the bottom-right region, the back the lit top face, the breast the south face, the folded right wing the dark east face, the tail fanning up-left
- **Reference**: none extracted; today's stand-in is the `$U7_Chicken` sheet (SHAPES.VGA shape 498) tinted `#c0a080` by the catalog; the nearest reference square for a small ground animal is `art/u7_reference_squares/u7_hare_48.png` (references only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15). The fowl fills stand, walk ×3 and hurt (columns 0–3 and 14) and leaves work, carry, attack, cast and dead transparent (a grazer never works, carries, attacks or casts, and a hunt drops item icons instead of a dead frame); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view.
- **Palette Ramps**: Plumage 137 `#BA9A71` (lit back, feather edges), 138 `#AA8659` (back dither), 139 `#9A7141` (breast, south face), 140 `#8A5D2D` (wing, east side), 141 `#7D4D18` (breast speckles, tail edge), 143 `#5D350C` (tail); Comb and wattle 24 `#C20C1C`; Beak and feet 6 `#DBAE20`, legs 7 `#C69618`; Eye, toe tips, outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Two three-toed feet of 6 stand on rows 46–47 at columns 26–30 and 31–35 with a 147 pixel at each toe tip on row 47, on 2-px legs of 7 that run up rows 43–45. The body is a plump oval 14 px wide and 10 px tall on rows 34–43, columns 20–34: its top face (the back) is 137 micro-dithered into 138 for the feather texture, its south face (the breast) is 139 with 1-px 141 speckles on a diagonal 3-px grid, and its east side is a folded wing 6×8 on rows 35–42, columns 28–33 in 140 with three 1-px 137 feather-edge lines. The neck rises up-left from the breast on rows 30–34, columns 24–27 to a 6×6 head on rows 26–31, columns 22–28, with a 2-px serrated comb of 24 on rows 24–25, columns 23–27, a 2×2 beak of 6 pointing down-right on rows 29–30, columns 28–29, a 1×2 wattle of 24 under it on rows 31–32 at column 27, and one 147 eye pixel on row 28 at column 25. The tail is a fan of five 143 feathers, each 2 px wide, rising up-left from the rump at row 34, column 20 to row 26, column 12, the topmost feather edged in 141. The outline is 147 along the lower and right silhouette only. Rows 0–23, columns 0–11 and columns 36–47 stay magenta; nothing touches the top or right edge and the shape is contained.

#### Interaction / Transformed State Description:
No carcass or dead frame is used by the engine: a hunt (work 60; the fowl `flees`, stepping away from its hunter) removes the unit and drops 1 `meat_raw` as an item icon on its cell (items segment, SEG-07); it drops no `hide`. The fowl has no other engine state; it is one of the three prey species placed near the start.

#### Readability Check:
At zoom ⅓ a small brown teardrop with a red dot on top and a dark raised tail, the only bird standing on the ground in this segment; the hare beside it is paler with two upright ears.

Deliver: art/masters/fowl.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames = 768×192, magenta background) + art/masters/fowl.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3, 2], "hurt": [14] }).

---

### rat — Rat (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 19 px wide and 20 px tall, the body 10 px wide and the tail the rest
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); an animal so low that the lean is 2 px at most: the head sits in the bottom-right region facing the viewer, the back is the lit top face, the right edge the dark east face, the tail lies on the ground trailing up-left
- **Reference**: none extracted; today's stand-in is the `$U7_Rat` sheet (SHAPES.VGA shape 523, no tint); the nearest reference square for a small ground animal is `art/u7_reference_squares/u7_hare_48.png` (references only, nothing copied ships)
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15). The rat fills stand, walk ×3 and hurt (columns 0–3 and 14) and leaves work, carry, attack, cast and dead transparent (vermin never work, carry, attack or cast, and a hunt drops item icons instead of a dead frame); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view.
- **Palette Ramps**: Fur 155 `#7D7169` (lit back), 157 `#615551` (flank), 159 `#453D39` (underside, east edge); Ears, feet and tail 108 `#CA9A82`; Nose 107 `#D2A692`; Eyes, outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The body is a teardrop 10 px wide and 12 px tall on rows 36–47, columns 26–36, its contact along row 47 from column 28 to column 34, the rump the broad upper end and the head the narrow lower end facing the viewer. The back (top face) is 155 micro-dithered into 157 along its right half, the flank 157, the underside and the right (east) edge 159; the head tapers on rows 43–47, columns 28–34 to a single 107 nose pixel on row 47 at column 31, with 147 eyes on row 44 at columns 29 and 33 and two 2×2 ears of 108 on rows 42–43 at columns 27–28 and 34–35. Four 2×1 feet of 108 show at the body's sides, on row 46 at columns 24–25 and 37–38 and on row 39 at columns 24–25 and 37–38. The tail is a 1-px line of 108 that leaves the rump at row 36, column 30 and curves up and to the left across the ground to row 28, column 20. The outline is 147 along the lower and right silhouette only (the right flank, the right feet and the jaw). Rows 0–27, columns 0–19 and columns 39–47 stay magenta; nothing touches the top or right edge and the shape is contained.

#### Interaction / Transformed State Description:
No carcass or dead frame is used by the engine: a hunt (work 40, the shortest in the segment; the rat `flees`, stepping away from its hunter) removes the unit and drops 1 `meat_raw` as an item icon on its cell (items segment, SEG-07); it drops no `hide`. Its `kind` is `vermin`, which the engine treats as prey exactly like a grazer; the rat has no other engine state.

#### Readability Check:
At zoom ⅓ the smallest animal on the map, a grey slip with a pale tail on dark marsh ground, lower and darker than the tan hare.

Deliver: art/masters/rat.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames = 768×192, magenta background) + art/masters/rat.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3, 2], "hurt": [14] }).
