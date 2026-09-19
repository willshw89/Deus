# Segment 09: predators and fliers (written 2026-09-18 by Claude Code)

The nine species of `wildlife.species` that hunt or fly: six predators (`kind` predator: wolf, jackal, fox, arctic_fox, wildcat, serpent) and three fliers (`kind` flier: hawk, songbird, bat). Predators are dangerous: colonists hunt them only with a knife and bravery, and world generation keeps them `predatorFreeRadius` (60) cells from the start. Fliers are prey and carry `data.through`, so they pass over trees, walls and water. Every creature in this file gets the yellow (indifferent) stance square; only monsters get the red one. A finished hunt drops the species' `yields` as item icons on the creature's cell and removes the unit: there is no carcass sprite in the engine, and no brief here asks for one. As of 2026-09-18 all nine are stand-in sheets tinted per the catalog; three species share one file with another (jackal with boar, arctic_fox with fox, and the songbird's file is a byte-identical copy of the hawk's), so they cannot be told apart in play until these masters land.

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares, every frame inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); no 16×16 upscaling; `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up, 1 px left per unit of height); the top, south and east faces are visible; a standing animal's paws sit in the bottom-right region of the square (`docs/GUIDE_25D.md`).
3. Fliers (hawk, songbird, bat): the anchor stays at the cell's bottom centre, but the picture sits in the upper half of the square with no ground contact; rows 23–47 stay magenta.
4. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for ≤ 32 colours per asset; micro-dither (1-px checker between two ramp steps) is welcome; no gradients or anti-aliasing against the background.
5. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0/255 after cleaning, no baked ground shadow (the engine draws shadows).
6. Sidecar: `art/masters/<id>.json` per AR-600 (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations naming the columns this species fills; unfilled columns stay transparent and the engine falls back to `stand`).
7. Open the reference named in each brief before drawing (`art/u7_reference_squares/` where a square exists, otherwise the stand-in sheet in `game/img/characters/`). It is a reference and a development stand-in: nothing copied from it ships.
8. Contained: nothing touches the top edge (row 0) or the right edge (column 47); W and E facings are transposed per `docs/GUIDE_25D.md` §2 (x and y swapped), never mirrored; N is the back view.
9. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated).
10. Export: after approval, copy the master into `game/img/characters/` exactly as `docs/ART_STANDARD.md` §5 says (no scaling: masters are already at screen size); the catalog's `image` field switches to the new name when the sidecar loader lands (Claude Code); until then the 3×4 stand-in stays in play.
11. Mark the request row (AR-401) in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name; the user approves each asset before it ships (`art/APPROVALS.md`).
12. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-09_predators_and_fliers.md`; work the briefs top to bottom (wolf first: it is in the start area's forests).

---

### wolf — Wolf (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 38 px wide and 35 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); paws at the bottom-right region, the body climbing up-left, the back lit (top face), the flank mid (south face), the underside and the right side dark (east face)
- **Reference**: `art/u7_reference_squares/u7_wolf_48.png` (SHAPES.VGA shape 537 at 1:1, 17×30 px drawn: head up-left, tail down-right; the `$U7_Wolf` sheet in `game/img/characters/` is the same shape at 3×; reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the wolf fills stand, walk, attack and hurt and leaves work, carry, cast and dead transparent; this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view
- **Palette Ramps**: Pelt 122 `#AEAEAE` (lit back), 124 `#8E8E8E` (upper flank), 126 `#6D6D6D` (flank and legs), 128 `#515151` (underside, inner legs); Cheek ruff 151 `#BEB2AE`; Muzzle and chest 149 `#DFD7D2`; Eye 5 `#EFCA28`; Nose, claws and outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The hind paws are two 4×2 blocks of 128 with a 147 claw line on row 47 at columns 33–36 and 38–41; the fore paws, further north on the ground and so drawn straight up, are two 4×2 blocks on rows 40–41 at columns 20–23 and 25–28. Each leg is 3 px wide in 126 with a 128 strip on its right and has 8 px of height, so it climbs 8 rows and slides 8 columns left: the hips arrive at row 39, columns 25–33, and the shoulders at row 33, columns 12–20. The barrel is a diagonal band 11 px deep running from the rump (rows 30–40, columns 26–36) to the chest (rows 24–34, columns 10–20): its upper-left edge is the lit back, a 3-px band of 122 with 1-px micro-dither into 124, the flank below it 126, the underside and the whole east (right) side 128; a bushy tail of 124 with a 128 underside and a 149 tip curves from the rump down-right to end at row 44, column 41. A 4-px neck continues the lean to a 12×9 wedge head on rows 16–24, columns 4–15, with two erect 3-px ears of 124 reaching row 13, a 151 cheek ruff on the head's right half, a 149 muzzle on rows 21–24, columns 4–8 with a 147 nose pixel at row 23, column 4, a 149 chest patch under the throat, and one 5 eye pixel at row 19, column 9. The outline is 147 only along the underside, the right silhouette and under the jaw; the lit back has no outline. Rows 0–12, columns 0–3 and columns 42–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 200; the wolf does not flee, so the hunter must close with it) drops 2 `meat_raw` and 1 `hide` as item icons on the wolf's cell and removes the unit; no carcass is drawn. The attack columns play on the map when it fights (VISION V45); its stance square is yellow like all wildlife. Packs of 2–4 in taiga, tundra, conifer and broadleaf forest and mountains.

#### Readability Check:
At zoom ⅓ the only grey four-legged shape with erect ears in cold and conifer country: larger and greyer than the fox, longer-legged and darker than the jackal, and narrower than the tan deer.

Deliver: art/masters/wolf.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/wolf.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [8, 9, 10], "hurt": [14] }).

---

### jackal — Jackal (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 32 px wide and 33 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); paws at the bottom-right region, the body climbing up-left, the back lit, the flank mid, the underside and right side dark
- **Reference**: none extracted; as of 2026-09-18 the catalog draws it with the `$U7_Dog` stand-in sheet (SHAPES.VGA shape 496) tinted `#d0b080`, shared with the boar; the nearest reference square is `art/u7_reference_squares/u7_wolf_48.png` (shape 537) for the pose of a lean canine (reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the jackal fills stand, walk, attack and hurt and leaves the rest transparent; this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view
- **Palette Ramps**: Coat 136 `#CAB292` (lit back), 137 `#BA9A71` (flank), 138 `#AA8659` (underside), 139 `#9A7141` (legs); Saddle 140 `#8A5D2D`; Throat and belly 134 `#EBE3D7`; Inner ear 107 `#D2A692`; Eye 5 `#EFCA28`; Nose, tail tip and outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Smaller and lighter than the wolf: the hind paws are 3×2 blocks of 139 with 147 claw pixels on row 47 at columns 32–34 and 36–38; the fore paws sit on rows 41–42 at columns 22–24 and 26–28. The legs are 2 px wide in 139 with 7 px of height (7 rows up, 7 columns left), thin and long for the body, so the hips reach row 40, columns 25–31 and the shoulders row 34, columns 15–21. The barrel is a slim 9-px-deep band from the rump (rows 31–40, columns 24–33) to the chest (rows 26–35, columns 13–22): the back a 3-px band of 136 with 1-px micro-dither into 137 and a darker saddle of 140 along the spine with sparse 1-px 147 ticks, the flank 137, the underside 138, the east side 138 with a 139 lower edge, and a 134 belly strip. The head is a narrow 9×8 wedge on rows 18–26, columns 8–16, carrying two oversized triangular ears 5 px tall that reach row 15 with 107 inside, a 134 throat, a 147 nose pixel at row 24, column 8, and one 5 eye pixel at row 20, column 12; a thin tail of 137 with a 3-px 147 tip droops from the rump to row 45, column 39. The outline is 147 along the lower and right silhouette only. Rows 0–14, columns 0–7 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 150; the jackal flees the hunter) drops 1 `meat_raw` and 1 `hide` as item icons on its cell and removes the unit; no carcass is drawn. The attack columns play on the map when it fights (VISION V45); stance square yellow. Packs of 2–3 in rock and sand desert, badlands, tropical savanna and tropical shrubland; the catalog's tint goes away once this master replaces the shared stand-in.

#### Readability Check:
At zoom ⅓ a small sandy dog shape with oversized ears on dry ground, paler and shorter-legged than the wolf, without the fox's white-tipped brush and black stockings.

Deliver: art/masters/jackal.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/jackal.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [8, 9, 10], "hurt": [14] }).

---

### fox — Fox (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 35 px wide and 32 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); paws at the bottom-right region, the low body climbing up-left, the back lit, the flank mid, the underside and right side dark
- **Reference**: the `$U7_Fox` stand-in sheet in `game/img/characters/` (SHAPES.VGA shape 510 at 3×: a red fox in the three-quarter pose); no reference square; the nearest square is `art/u7_reference_squares/u7_wolf_48.png` (shape 537) for the canine lean (reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the fox fills stand, walk, attack and hurt and leaves the rest transparent; this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view
- **Palette Ramps**: Coat 37 `#FF8E1C` (lit back), 39 `#E36D00` (flank), 40 `#C26100` (underside), 184 `#8E3D0C` (deep shade at the groin); Cheeks, throat and brush tip 134 `#EBE3D7`; Stockings and ear backs 145 `#3D240C`; Eye 5 `#EFCA28`; Nose and outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The hind paws are 3×2 blocks of 145 on row 47 at columns 31–33 and 35–37; the fore paws sit on rows 41–42 at columns 21–23 and 25–27. The legs are 2 px wide and 145 all the way up (black stockings) with 6 px of height (6 rows up, 6 columns left), so the hips reach row 41, columns 25–31 and the shoulders row 35, columns 15–21. The barrel is a low 9-px-deep band from the rump (rows 33–41, columns 24–32) to the chest (rows 27–35, columns 13–21): the back a 3-px band of 37 with 1-px micro-dither into 39, the flank 39, the underside 40 with 184 where the hind leg meets the body, the east side 40. The head is a pointed 9×7 wedge on rows 20–27, columns 7–15 with two 4-px ears reaching row 16 whose backs are 145, white 134 cheeks and throat, a 147 nose pixel at row 26, column 7 and one 5 eye pixel at row 22, column 11. The brush is the fox's largest feature: a tail 6 px thick of 39 with a 40 underside sweeping from the rump down-right and ending in a 4-px 134 tip at row 45, column 41. The outline is 147 along the lower and right silhouette only. Rows 0–15, columns 0–6 and columns 42–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 100; the fox flees the hunter) drops 1 `meat_raw` and 1 `hide` as item icons on its cell and removes the unit; no carcass is drawn. Attack columns play on the map when it fights (VISION V45); stance square yellow. Alone or in pairs in broadleaf and conifer forest, temperate grassland and taiga; `arctic_fox` is its own brief below, not a tint of this file.

#### Readability Check:
At zoom ⅓ the only orange animal: a low body with a fat white-tipped brush and black legs, unlike the sandy jackal, the grey wolf and the striped wildcat.

Deliver: art/masters/fox.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/fox.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [8, 9, 10], "hurt": [14] }).

---

### arctic_fox — Arctic fox (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 33 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); paws at the bottom-right region, the compact body climbing up-left, the back lit, the flank mid, the underside and right side shaded cold
- **Reference**: none extracted; as of 2026-09-18 it is the `$U7_Fox` stand-in sheet (SHAPES.VGA shape 510) tinted `#e8f0ff`; draw it from the fox brief's pose with the shape changes below; the nearest square is `art/u7_reference_squares/u7_wolf_48.png` (shape 537) for the canine lean (reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the arctic fox fills stand, walk, attack and hurt and leaves the rest transparent; this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view
- **Palette Ramps**: Fur 15 `#FFFFFF` (lit back), 118 `#EFEFEF` (upper flank), 119 `#DFDFDF` (flank), 120 `#CECECE` (underside), 122 `#AEAEAE` (deep shade); Cold shadow 195 `#CECEFF` (1-px micro-dither into 120 on the east side); Inner ear and nose skin 149 `#DFD7D2`; Eye 147 `#201408` with a 15 catchlight; Nose, claws and outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Stockier and rounder than the fox, with short legs and a short muzzle: the hind paws are 3×2 blocks of 120 with 147 claw pixels on row 47 at columns 30–32 and 34–36; the fore paws sit on rows 42–43 at columns 22–24 and 26–28. The legs are 3 px wide in 119, furred to the paws, with only 4 px of height (4 rows up, 4 columns left), so the hips reach row 43, columns 26–32 and the shoulders row 38, columns 18–24. The barrel is a plump 11-px-deep band from the rump (rows 32–43, columns 22–31) to the chest (rows 27–38, columns 13–22): the back a 3-px band of 15 with 1-px micro-dither into 118, the flank 119, the underside 120, the east side 120 with 1-px micro-dither of 195 and 122 at the contact line. The head is a round 9×8 block on rows 21–29, columns 8–16 with two short rounded 3-px ears reaching row 18 (149 inside), a 147 nose pixel at row 27, column 8, and a 147 eye pixel at row 24, column 12 with a 15 pixel to its upper-left. The tail is thick, 7 px, all 118 with a 119 underside and no dark tip, curling from the rump down-right to row 46, column 40. The outline is 147 along the lower and right silhouette only, 1 px, and it is the only dark line on the animal. Rows 0–17, columns 0–7 and columns 41–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 100; the arctic fox flees the hunter) drops 1 `meat_raw` and 1 `hide` as item icons on its cell and removes the unit; no carcass is drawn. Attack columns play on the map when it fights (VISION V45); stance square yellow. Alone or in pairs on tundra and glacier only; the catalog's tint goes away once this master replaces the shared stand-in.

#### Readability Check:
At zoom ⅓ a white compact blob with a thick tail on tundra and snow, white where the fox is orange and rounder and shorter-legged than the wolf; on snow ground the 1-px 147 outline and the cold 195 shading on its right side are what separate it from the tile.

Deliver: art/masters/arctic_fox.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/arctic_fox.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [8, 9, 10], "hurt": [14] }).

---

### wildcat — Wildcat (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 32 px wide and 32 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); paws at the bottom-right region, the low body climbing up-left, the back lit, the flank mid, the underside and right side dark
- **Reference**: none extracted; as of 2026-09-18 it is the `$U7_Cat` stand-in sheet in `game/img/characters/` (SHAPES.VGA shape 495) tinted `#b09070`; the nearest squares are `art/u7_reference_squares/u7_hare_48.png` (shape 811, 15×15 px drawn) for the scale of a small animal and `u7_wolf_48.png` (shape 537) for the stance (reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the wildcat fills stand, walk, attack and hurt and leaves the rest transparent; this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view
- **Palette Ramps**: Coat 137 `#BA9A71` (lit back), 138 `#AA8659` (flank), 139 `#9A7141` (underside and legs); Stripes 142 `#6D3D0C`, tail rings 144 `#4D2D0C`; Belly, muzzle and chest 134 `#EBE3D7`; Nose 107 `#D2A692`; Eye 4 `#EFD251` with a 147 pupil; Claws and outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A small, low cat about twice the hare's bulk: the hind paws are 3×2 blocks of 139 with 147 claw pixels on row 47 at columns 30–32 and 34–36; the fore paws sit on rows 41–42 at columns 21–23 and 25–27. The legs are 2 px wide in 139 with 6 px of height (6 rows up, 6 columns left), so the hips reach row 41, columns 24–30 and the shoulders row 35, columns 15–21. The barrel is a low 8-px-deep band from the rump (rows 33–41, columns 23–31) to the chest (rows 27–35, columns 13–21): the back a 3-px band of 137 with 1-px micro-dither into 138, crossed by five broken 1-px stripes of 142 at 3-px intervals; the flank 138, the underside 139, the east side 139, a 134 belly strip. The head is a round 9×8 block on rows 20–28, columns 8–16 with two pointed 4-px ears reaching row 16, a 134 muzzle and chest, a 107 nose pixel at row 25, column 9, and one 4 eye pixel with a 147 pupil to its right at row 23, columns 12–13. The tail, 4 px thick in 138 with four 1-px 144 rings and a 2-px 144 tip, curls from the rump down-right to row 46, column 39. The outline is 147 along the lower and right silhouette only. Rows 0–15, columns 0–7 and columns 40–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 120; the wildcat flees the hunter) drops 1 `meat_raw` and 1 `hide` as item icons on its cell and removes the unit; no carcass is drawn. Attack columns play on the map when it fights (VISION V45); stance square yellow. Always alone (herd 1–1), in broadleaf forest, moist and dry tropical forest, and temperate and tropical shrubland; the catalog's tint goes away once this master replaces the stand-in.

#### Readability Check:
At zoom ⅓ a small striped tan cat with a ringed tail, lower and shorter-muzzled than the fox and jackal; the stripes and the tail rings tell it from the plain-coated hare, which has the upright ears.

Deliver: art/masters/wildcat.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/wildcat.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [8, 9, 10], "hurt": [14] }).

---

### serpent — Serpent (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 38 px wide and 28 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); a flat animal, so the coils lie on the ground with only a 1–2 px lit top ridge and a shaded lower-right side, and the raised head is the one part that slides up-left
- **Reference**: the `$U7_Snake` stand-in sheet in `game/img/characters/` (SHAPES.VGA shape 530 at 3×: a green snake in an S; the catalog's `$U7_Serpent` file is a byte-identical copy); no reference square (reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the serpent fills stand, walk (a slither, the S shifting one curve per frame), attack (the head snapping down-right at the target) and hurt, and leaves the rest transparent; this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view
- **Palette Ramps**: Scales 202 `#7D9600` (lit dorsal ridge), 168 `#71864D` (body), 169 `#5D7139` (lower-right side), 170 `#4D5D28` (contact line); Diamond markings 173 `#313D18`; Belly scutes 165 `#B6C29A`; Eye 5 `#EFCA28` with a 147 pupil; Tongue 22 `#FF1C35`; Outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The body is a rope 4–5 px thick lying on the ground in three curves, read from the tail: the tail tip tapers to 1 px at row 46, column 42; the first curve runs left along rows 40–46 between columns 24 and 42; the second climbs to rows 33–40 between columns 14 and 30; the third bends back to rows 27–34 between columns 20 and 34, and from its left end the neck rises with 8 px of height, so the head slides 8 rows up and 8 columns left to a 10×6 wedge on rows 19–25, columns 6–16, with a gap of magenta between the head and the coil beneath it. On every segment the dorsal ridge is a 1–2 px band of 202 along the upper-left edge, the body 168, the lower-right side 169 with a 170 contact line where it meets the ground, and on the front (lowest) curve, where the belly turns toward the viewer, a row of 1×2 165 scutes every 2 px; 3×3 diamonds of 173 sit on the spine every 4 px, with 1-px micro-dither of 168 and 169 between ridge and side. The head carries one 5 eye pixel with a 147 pupil at row 21, columns 9–10, and a forked 2-px tongue of 22 leaving the snout at row 23, column 5. The outline is 147 along the lower and right edges of each curve and under the jaw only. Rows 0–18, columns 0–4 and columns 43–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 90; the serpent does not flee) drops 1 `meat_raw` and 1 `hide` as item icons on its cell and removes the unit; no carcass is drawn. Attack columns play on the map when it strikes (VISION V45); stance square yellow. Always alone, in temperate and tropical swamp, tropical marsh, moist tropical forest, and sand and rock desert.

#### Readability Check:
At zoom ⅓ the only long, low, green coil on the ground with no legs and a raised head: a green S where the tall grass is a fan, the reeds are straight and every other animal stands on legs.

Deliver: art/masters/serpent.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/serpent.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [8, 9, 10], "hurt": [14] }).

---

### hawk — Hawk (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn bird is 40 px wide and 20 px tall, in the upper half of the square
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine keeps the anchor on the cell; the hawk's picture sits above it with no ground contact, because fliers carry `data.through` and pass over everything)
- **Projection**: U7 2.5D oblique: seen from above in flight, so the back and the upper surfaces of the wings are the lit top face and the right (east) wing is one ramp step darker; the flier's lift is shown by the empty lower half of the square and by a body centre 4 px left of the anchor column (column 20), not by a full 1:1 up-left slide, since the wingspan must stay inside the square
- **Reference**: the `$U7_Hawk` stand-in sheet in `game/img/characters/` (SHAPES.VGA shape 555 at 3×: a bird with spread wings seen from above); no reference square (reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the hawk fills stand (a glide, wings level), walk (three flap positions: wings up, level, down) and hurt, and leaves work, carry, attack, cast and dead transparent (AR-600 reserves the dead column for prey, but the engine does not read it yet); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view, which for a flier is the same silhouette with the head at the top
- **Palette Ramps**: Wing coverts 141 `#7D4D18` (lit), 142 `#6D3D0C` (mid), 140 `#8A5D2D` (leading edge); Flight feathers 144 `#4D2D0C` with 145 `#3D240C` tips; Wing bars 136 `#CAB292`; Throat 134 `#EBE3D7`; Tail 143 `#5D350C` with a 145 band; Beak 6 `#DBAE20` with a 147 hook; Eye 5 `#EFCA28`; Outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The bird flies south, toward the viewer, so its head is at the bottom of the picture: a 5×5 head of 141 on rows 17–21, columns 18–22 with a 134 throat on its lowest row, a 6 beak pixel pair at row 22, columns 19–20 ending in a 147 hook, and one 5 eye pixel at row 19, column 19. The body is an 8-px-wide oval of 141 with 1-px micro-dither into 142 on rows 8–17, columns 16–23, and the tail fans upward from it: 10 px wide in 143 with a 2-px 145 band on rows 3–8, columns 15–25. The wings leave the shoulders on rows 9–12 and sweep outward and slightly back, each a blade whose tip drops to row 20 at column 3 (left wing) and column 42 (right wing): the coverts are 141 dithered into 142 with a 1-px 140 leading edge, the flight feathers 144 with 145 tips fringed by 1-px notches on the trailing edge, and two 136 bars cross each wing at one third and two thirds of its span; the whole right wing is one step darker (142 coverts, 145 feathers) as the east face. The outline is 147 along the trailing (lower) edges and the right wing's tip only. Rows 0–2, rows 23–47, columns 0–2 and columns 43–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 150; the hawk flees) drops 1 `meat_raw` as an item icon on its cell and removes the unit; no carcass is drawn. It passes over trees, walls and water (`data.through` is true for every flier) and gets the yellow stance square. Alone or in pairs over mountains, temperate and tropical savanna, temperate grassland and rock desert.

#### Readability Check:
At zoom ⅓ a broad dark brown cross floating over the ground with the lower half of its cell empty, twice the songbird's span and a ground-free silhouette that nothing standing on the map shares.

Deliver: art/masters/hawk.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/hawk.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "hurt": [14] }).

---

### songbird — Songbird (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn bird is 20 px wide and 14 px tall, in the upper half of the square
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine keeps the anchor on the cell; the bird's picture sits above it with no ground contact, because fliers carry `data.through`)
- **Projection**: U7 2.5D oblique: seen from above in flight, the back and the wings' upper surfaces lit, the right (east) wing one ramp step darker; the lift is shown by the empty lower half of the square and a body centre 3 px left of the anchor column (column 21), not by a full 1:1 slide
- **Reference**: the `$U7_WildBird` stand-in sheet in `game/img/characters/` (SHAPES.VGA shape 716 per STATUS; the file on disk is a byte-identical copy of the hawk's, so as of 2026-09-18 the two look alike); no reference square (reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the songbird fills stand (a glide), walk (three flap positions) and hurt, and leaves the rest transparent (the dead column is reserved for prey by AR-600 but not read by the engine yet); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view
- **Palette Ramps**: Back and wing coverts 140 `#8A5D2D` (lit), 142 `#6D3D0C` (mid); Flight feathers and tail 144 `#4D2D0C`; Crown and rump patches 3 `#F3DF79` (lit), 6 `#DBAE20` (shade); Cheek 134 `#EBE3D7`; Beak 7 `#C69618`; Eye 147 `#201408` with a 15 `#FFFFFF` catchlight; Outline 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A small bird flying south, head at the bottom: a 4×4 head of 142 on rows 17–20, columns 19–22 with a 2×2 crown patch of 3 (6 on its right pixel) on row 17, a 134 cheek pixel, a 7 beak pixel at row 21, column 20 and one 147 eye pixel with a 15 pixel to its upper-left at row 18, column 20. The body is a 5-px-wide oval of 140 with 1-px micro-dither into 142 on rows 11–17, columns 19–23, with a 3×2 rump patch of 3 and 6 at rows 11–12; the tail is a 4-px-wide fan of 144 on rows 8–11, columns 19–22. The wings are short and rounded, leaving the shoulders on rows 12–14 and reaching row 19 at their tips, columns 12 (left) and 31 (right): coverts 140 dithered into 142, flight feathers 144 with 1-px notches on the trailing edge; the right wing is 142 and 144 throughout as the east face. The outline is 147 along the trailing edges and the right wing's tip only. Rows 0–7, rows 22–47, columns 0–11 and columns 32–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 90; the songbird flees) drops 1 `meat_raw` as an item icon on its cell and removes the unit; no carcass is drawn. Flocks of 2–5 pass over everything (`data.through`) with yellow stance squares, in broadleaf forest, moist tropical forest, temperate grassland, conifer forest and temperate swamp.

#### Readability Check:
At zoom ⅓ a small dark fleck with a yellow dot floating above the ground, half the hawk's span with a rounder body and shorter wings; the flock of two to five tells it from the single hawk, and its brown-and-yellow from the near-black bat.

Deliver: art/masters/songbird.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/songbird.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "hurt": [14] }).

---

### bat — Bat (AR-401)
- **Category**: Wildlife
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn bat is 30 px wide and 10 px tall, in the upper half of the square
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine keeps the anchor on the cell; the bat's picture sits above it with no ground contact, because fliers carry `data.through`)
- **Projection**: U7 2.5D oblique: seen from above in flight, the fur of the back and the upper membranes are the lit top face, the right (east) wing one ramp step darker; the lift is shown by the empty lower half of the square and a body centre 3 px left of the anchor column (column 21), not by a full 1:1 slide
- **Reference**: the `$U7_CaveBat` stand-in sheet in `game/img/characters/` (SHAPES.VGA shape 493 at 3×: a near-black bat with scalloped wings; `$U7_Bat` is a byte-identical copy); no reference square (reference only, nothing copied ships)
- **Sheet**: AR-600 grid, frames 48×48, rows S, W, E, N; columns in the fixed order stand, walk ×3, work ×3, carry, attack ×3, cast ×3, hurt, dead (16 columns, indices 0–15); the bat fills stand (wings level), walk (three flap positions) and hurt, and leaves the rest transparent (the dead column is reserved for prey by AR-600 but not read by the engine yet); this brief describes the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view
- **Palette Ramps**: Membrane 160 `#35312D` (lit), 161 `#242020` (mid), 162 `#181414` (folds and the east wing); Fur 221 `#352D24` (lit back), 223 `#181010` (shade); Ears and face 113 `#6D4D3D`; Finger bones 158 `#514945`; Eyes 22 `#FF1C35`; Outline 117 `#100C08`; background `#FF00FF`.

#### Primary State Visual Description:
The bat flies south like the two birds, head at the bottom: the body is a 4×7 oval of 221 with 1-px micro-dither into 223 on rows 11–17, columns 19–22; the head is a 4×3 block of 113 on rows 17–19, columns 19–22 with two 1×2 ears of 113 pointing down to row 20 at columns 19 and 22 and two 22 eye pixels on row 18, columns 20 and 21 (a readability device: the red pair is what marks the head at a glance). The wings leave the shoulders on rows 12–13 and stretch to the tips at row 12, column 8 (left) and column 37 (right), each membrane a shallow triangle 8 px deep whose trailing (lower) edge is cut into three scallops ending at row 20, with three 1-px 158 finger lines radiating from the shoulder to the scallop points; the left membrane is 160 with 1-px micro-dither into 161 along the folds, the right membrane 161 with 162 folds as the east face. The outline is 117 along the scalloped trailing edges and the right wing's tip only. Rows 0–10, rows 21–47, columns 0–7 and columns 38–47 stay magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a finished hunt (work 90; the bat flees) removes the unit and drops nothing, because the catalog lists no `yields` for it; no carcass is drawn. Flocks of 3–6 pass over everything (`data.through`) with yellow stance squares, in broadleaf forest, temperate swamp, mountains and badlands.

#### Readability Check:
At zoom ⅓ the only near-black scalloped W floating over the ground, more angular and darker than the songbird and narrower than the hawk; its two red eye pixels are the only warm spots on it.

Deliver: art/masters/bat.png (AR-600 sheet, 16 columns × 4 rows of 48×48 frames, magenta background) + art/masters/bat.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "hurt": [14] }).
