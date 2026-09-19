# Segment 18: combat gear and workshops (written 2026-09-18 by Claude Code)

The art side of VISION V55 (combat with its production chains): the ten weapons and two shields as held layers, the helms and armor as worn layers, the ammunition and the chain's materials as ground items, the six workshops as buildings, and the three combat effects. Every id in a heading below is the id the combat-chains catalog work of the same night uses (`docs/design/WORLD_ARCHITECTURE.md` §2.10 "Combat chains"); as of 2026-09-18 22:30 only `bar_iron` is in `game/data/UF_WorldCatalog.json`, the rest land with that work, so `tools/check_briefs.js` rule 3 fails these headings until the catalog has them (see the segment's check line in `docs/ASSET_REQUESTS.md` AR-900). The d20 numbers quoted in the Interaction sections (weapon dice, ranges, armor class) come from the SRD 5.1 (CC-BY-4.0, credited in `docs/CREDITS.md`) as this night's spec proposes them; when the catalog's `weapon` / `armor` / `shield` / `ammo` blocks land, the catalog wins.

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares, every asset inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1). No 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up, 1 px left per unit of height); the top, south and east faces are visible; the ground contact sits in the bottom-right region of the square (`docs/GUIDE_25D.md`). A weapon held upright therefore draws as a diagonal running up-left from the hand; a weapon held across the body draws up-right; a blade thrust south draws straight down the square.
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for ≤ 32 colours per asset; micro-dither is welcome; no gradients or anti-aliasing against the background.
4. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0/255 after cleaning, no baked ground shadow (the engine draws shadows), plus `art/masters/<id>.json` per AR-600 (`frameWidth` 48, `frameHeight` 48, `anchor` [24, 47], `facings`, `animations`, `layer`).
5. **Layers (weapons, shields, helms, armor, the quiver):** one sheet per item on the AR-600 grid: 16 columns × 4 rows of 48×48 frames = 768×192 px; rows are the facings S, W, E, N; columns are `stand` [0], `walk` [1, 2, 3], `work` [4, 5, 6], `carry` [7, 8, 9], `attack` [10, 11, 12] (wind-up, strike, recover), `cast` [13, 14], `sleep` [15]. The anchor [24, 47] is the body's, in every frame. A layer paints only the item; everything else is magenta, including the frames where the item is put away (weapons: `carry`, `cast` and `sleep` stay empty; armor and helms are drawn in every column, `sleep` included). Where the body should be in front of the item (a club head behind the head, a quiver behind the back in the south facing) the layer leaves those pixels transparent, because layers compose over the body: body, clothes tier, legs, torso, head, back (the quiver), shield, held, fx.
6. **Registration (south facing), from the human brief in `SEG-00` (`human`, the AR-400 body every layer is drawn over):** feet on rows 45–47 at columns 26–38; hips row 33, columns 16–30; shoulders row 22, columns 8–24; head rows 9–21, columns 6–16. Hand points: the right hand (the viewer's left; the weapon hand) centred at column 14, row 36; the left hand (the viewer's right; the shield and bow hand) centred at column 32, row 36. In the three attack frames the weapon hand moves to (6, 20) wind-up, (24, 40) strike, (18, 38) recover, and the shield hand to (30, 26), (36, 34), (32, 36). In the walk frames every hand point moves 2 px down in column 1, back in column 2 and 2 px up in column 3; in the work columns the weapon hangs 4 px lower than in `stand`, the same in all three. Draw the layers over the delivered body sheet (`art/masters/human_male.png`, AR-400); until it exists, over the reference square named in each brief. All species share one layer file (AR-600: everyone is 48×48 with the same anchor); a species whose body needs its own fit gets a `<id>_<species>` variant only when the user asks.
7. Facings: W and E are transposed from the body's stored directions exactly as the body is (`docs/GUIDE_25D.md` §2: swap x and y; never mirrored), so a weapon in the right hand stays in the right hand; N is the back view, in which the hilt is hidden behind the body and only what rises above the shoulder or hangs beside the hip is painted.
8. **Ground and inventory icons:** every item (the weapons too) also has a one-frame 48×48 icon: the thing lying on its cell, and the same frame is what the character sheet (V49) draws in its grid and slots. Exported per `docs/ART_STANDARD.md` §5 step 8 into `game/img/characters/` under a `!$` name at 1:1 as the middle frame of the top row of a 144×192 sheet (`UF_Items` reads column 1, row 0 of a 3×4 grid), while the master stays 48×48 (SEG-07 step 8).
9. Reference: there is no weapon, armor or workshop square in `art/u7_reference_squares/`; each brief names the nearest square (the townsman or ranger figure the layer is drawn over, the boulder for stone, the campfire for fire) and the stand-in sheet whose material it shares. References and stand-ins only: nothing copied ships.
10. Contained: nothing touches the top edge (row 0) or the right edge (column 47) of any frame; a strike may reach row 46 and column 46.
11. Order (also `docs/handoffs/HANDOFF_combat_gear.md`): the six workshops first (AR-905; they stand on the map as soon as the catalog lands), then the ground icons (AR-904 and the weapon icons of AR-900), then the human body sheet if it is still undelivered (AR-400), then the weapon layers (AR-900), shields (AR-901), helms (AR-902), armor (AR-903), effects (AR-906).
12. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated); then mark the request row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file names; the user approves each asset before it ships (`art/APPROVALS.md`).
13. Catalog: when a file lands, Gemini switches the `image` field of the item (`items.types`) or the workshop (`objects`) to the new name; the layer sheets need no catalog field, the engine finds them by the item id (`$UF_held_<id>`, `$UF_shield_<id>`, `$UF_head_<id>`, `$UF_torso_<id>`, `$UF_legs_<id>`, `$UF_back_<id>`); the effects are read by their fixed names. Nothing else in the catalog is Gemini's.
14. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-18_combat_gear_and_workshops.md`.

---

## Weapons (AR-900): held layers with their ground icons

### club — Club (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn club is 12 px wide and 30 px tall; the ground icon fits one 48×48 square, 34 px wide and 14 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: the club rests on the right shoulder, so its shaft runs up-left from the hand along the lean; its head is a rounded knob lit on its upper-left, mid on its south face, dark on its east face
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265, the body the layer sits on); for the wood see the `!$U7_Item_WoodLog` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; columns stand [0], walk [1–3], work [4–6], attack [10–12] painted; carry [7–9], cast [13–14], sleep [15] empty (magenta); the sidecar lists all seven animations so the engine's frame table matches the body's
- **Palette Ramps**: Wood 141 `#7D4D18` (lit strip), 143 `#5D350C` (body), 145 `#3D240C` (east side, grain); Knots 147 `#201408`; Grip wrap 136 `#CAB292`, 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame (column 0, row 0): a hardwood cudgel gripped in the right hand at (14, 36) and resting on the right shoulder, its head behind the head's upper-left. The shaft is 4 px wide and runs from the grip at columns 12–17, rows 34–40 up-left along the lean to the shoulder at (8, 22), then on to the head, a 10×8 knob at columns 1–10, rows 8–15 with a wider swell on its lower-right side; the pixels of the knob that lie inside the body's head (columns 6–16, rows 9–21) are left transparent so the head shows in front. The shaft's upper-left edge is 141, its middle 143, its lower-right edge 145 with 1-px 145 grain ticks every 4 px; the knob's upper-left is 141 with 143 micro-dithered in, its south face 143, its east face 145, and three 147 knot pixels sit on it. The grip is four 1-px bands of 136 with a 138 pixel on each band's lower-right end. The outline is 147 on the lower and right silhouette of the shaft and knob only. Walk frames: the grip follows the hand point ±2 px; work frames: the club hangs 4 px lower, head down beside the right leg (knob at columns 18–27, rows 40–47) in all three. Attack frames: wind-up (column 10): the hand at (6, 20), the club raised up-left above the head with the knob at columns 1–10, rows 1–8 (nothing on row 0) and the shaft running down-right from it to the hand; strike (column 11): the hand at (24, 40), the club swung down the square, shaft from the hand to the knob at columns 26–35, rows 39–46 (nothing on row 47 or column 47); recover (column 12): the hand at (18, 38), the club lowered to the right, knob at columns 30–39, rows 36–43. Ground icon: the same cudgel lying diagonally, knob up-left at columns 6–15, rows 32–40 and the grip end at columns 34–39, rows 42–46, 6 px thick so its top strip is 141, its body 143 and its east end 145, outline 147 on the lower and right edges; rows 0–31, columns 0–5 and columns 40–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the club in the `weapon` slot; the attack frames play on the map when the unit fights (V45), one strike per beat. The chain: Carve a club (1 log, at the bowyer's bench or the work stone per the catalog; the cheapest weapon, no metal). Proposed d20 block: simple melee, 1d4 bludgeoning, Strength. Dropped: the ground icon lies on the cell (stack 1) and is what the character sheet shows in the slot. No other state.

#### Readability Check:
At zoom ⅓ a dark brown stick with a rounded knob standing up from the right shoulder, thicker and shorter than the spear and with no grey head like the iron axe.

Deliver: art/masters/club.png (48×48 ground icon, magenta background) + art/masters/club.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_club.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_club.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_Club.png and $UF_held_club.png.

---

### spear — Spear (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn spear is 18 px wide and 42 px tall; the ground icon fits one 48×48 square, 44 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: held upright, so the shaft runs up-left from the butt beside the right foot; the leaf head's upper-left facet is lit and its lower-right facet dark
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_ranger_south_48.png` (shape 460); for the shaft see the `!$U7_Item_WoodLog` stand-in and for the head the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty
- **Palette Ramps**: Shaft 141 `#7D4D18` (lit strip), 143 `#5D350C`, 145 `#3D240C`; Head 118 `#EFEFEF` (edge glint), 120 `#CECECE` (lit facet), 124 `#8E8E8E` (shaded facet), 126 `#6D6D6D` (socket); Binding 136 `#CAB292`, 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a spear held upright in the right hand beside the body, its butt on the ground by the right foot. The shaft is 3 px wide and runs from the butt at columns 17–19, row 46 up-left through the hand at (14, 36) to the socket at (3, 12), one pixel left per 1.1 px up so it stays inside the square; its upper-left edge is 141, its middle 143, its lower-right edge 145. The head is a leaf blade 6 px wide and 12 px long from the socket at columns 2–6, rows 10–13 (126, with a 138 binding band 2 px tall under it and a 136 highlight pixel) to its point at (1, 1); the blade's upper-left facet is 120 with a 1-px 118 glint along the edge, its lower-right facet 124, and a 1-px 126 midrib runs its length. Where the shaft crosses the body's left silhouette (columns 8–12, rows 22–34) it is painted in front. The outline is 147 on the lower and right silhouette only. Walk: the shaft rises and falls with the hand point ±2 px; work: the spear hangs 4 px lower, the butt lifted off the ground. Attack (a thrust): wind-up (column 10): the hand at (6, 20), the spear pulled back so it lies across the body with the point up-left at (1, 9) and the butt down-right at (30, 40); strike (column 11): the hand at (24, 40), the spear thrust straight down the square: shaft vertical at columns 23–25 from row 22 to row 40, the head from row 38 to its point at (24, 46) painted in front of the hand; recover (column 12): the hand at (18, 38), the spear drawn back to the wind-up angle, point at (5, 14). Ground icon: the spear lying diagonally with its head up-left, the point at (2, 30), the socket at columns 10–13, rows 36–39, the shaft 3 px wide down-right to the butt at columns 42–45, rows 44–47, 3 px thick so its top strip is 141 and its lower-right edge 145; outline 147 on the lower and right edges; rows 0–29, columns 0–1 and columns 46–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the spear in the `weapon` slot; its attack frames are a thrust. The chain: Shaft a spear (1 log, 1 iron bar, at the smithy; a stone-headed variant is not planned). Proposed d20 block: simple melee, 1d6 piercing, Strength, versatile 1d8 in two hands (no shield equipped), thrown 20/60 ft = 4/12 cells (a thrown spear uses the arrow-in-flight effect's stone frame until it has its own). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ the longest thin line on any figure, rising past the head with a pale tip; the club is short and knobbed, the long bow is a curve.

Deliver: art/masters/spear.png (48×48 ground icon, magenta background) + art/masters/spear.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_spear.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_spear.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_Spear.png and $UF_held_spear.png.

---

### dagger_iron — Iron dagger (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn dagger is 8 px wide and 14 px tall; the ground icon fits one 48×48 square, 26 px wide and 14 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: hangs point-down from the right hand, so the blade runs down-right along the lean toward the ground; its upper-left facet is lit, its lower-right facet dark
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the blade's metal see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/`, and for the shape SEG-07's `stone_knife` brief (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty
- **Palette Ramps**: Blade 118 `#EFEFEF` (edge glint), 120 `#CECECE` (lit facet), 124 `#8E8E8E` (shaded facet), 126 `#6D6D6D` (fuller); Guard and pommel 128 `#515151`, 122 `#AEAEAE` (glint); Grip 143 `#5D350C`, 141 `#7D4D18`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a dagger held point-down in the right hand at (14, 36). The grip is a 3×5 bar of 143 with a 141 lit strip at columns 12–14, rows 32–36 topped by a 2×2 pommel of 128 at (12, 31); the guard is a 7×2 bar of 128 with a 122 pixel at its left end at columns 10–16, rows 37–38; the blade leaves the guard and runs down-right along the lean, 3 px wide tapering to a point at (24, 46): its upper-left facet 120 with a 1-px 118 glint on the edge, its lower-right facet 124, one 126 fuller pixel per row along the middle. The outline is 147 on the lower and right silhouette only. Walk: follows the hand point ±2 px; work: 4 px lower, the point near the right ankle. Attack (a stab): wind-up (column 10): the hand at (6, 20), the dagger held point-up beside the head, blade up-left from the guard at (6, 21) to the point at (1, 12); strike (column 11): the hand at (24, 40), the blade thrust straight down the square from the guard at row 41 to the point at (24, 46); recover (column 12): the hand at (18, 38), the dagger back to point-down, its point at (26, 45). Ground icon: the dagger lying diagonally, point up-left at (10, 32), blade 3 px wide down-right to the guard at columns 24–30, rows 40–42, grip and pommel to (35, 46); the blade's upper-left facet 120 with the 118 glint, lower-right 124; outline 147 on the lower and right edges; rows 0–31, columns 0–9 and columns 36–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the dagger in the `weapon` slot; being the `knife` tool too, it speeds hunting, gathering and sewing like the stone knife (`tool` block per the catalog), and it is the weapon a hunter draws. The chain: Forge an iron dagger (1 iron bar, at the smithy). Proposed d20 block: simple melee, 1d4 piercing, finesse (Strength or Dexterity), light, thrown 20/60 ft = 4/12 cells. Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ a short pale sliver hanging at the right hip, too short to be a sword; the stone knife's ground icon is the same size but grey-brown with a wrapped grip.

Deliver: art/masters/dagger_iron.png (48×48 ground icon, magenta background) + art/masters/dagger_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_dagger_iron.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_dagger_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_DaggerIron.png and $UF_held_dagger_iron.png.

---

### sword_short — Short sword (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn sword is 16 px wide and 22 px tall; the ground icon fits one 48×48 square, 36 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: held at port across the chest, so the blade runs up-right from the right hand toward the left shoulder; the blade's upper-left facet is lit, its lower-right facet dark
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the metal see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty
- **Palette Ramps**: Blade 118 `#EFEFEF` (edge glint), 120 `#CECECE` (lit facet), 124 `#8E8E8E` (shaded facet), 126 `#6D6D6D` (fuller); Guard and pommel 128 `#515151`, 122 `#AEAEAE` (glint); Grip 143 `#5D350C`; Grip wrap 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a straight double-edged blade held at port, hilt in the right hand at (14, 36), the blade rising up-right across the chest. The grip is a 3×6 bar of 143 with two 138 wrap bands at columns 12–14, rows 34–39, the pommel a 3×2 block of 128 with a 122 glint at columns 11–13, rows 40–41; the guard is a straight 9×2 bar of 128 at columns 10–18, rows 32–33. The blade leaves the guard's middle and runs up-right, 4 px wide, to a point at (29, 14): its upper-left facet 120 with a 1-px 118 glint on the upper edge, its lower-right facet 124, a 1-px 126 fuller along the middle for two thirds of its length. It is painted in front of the body wherever it crosses it. The outline is 147 on the lower and right silhouette only. Walk: follows the hand point ±2 px; work: 4 px lower and rotated to hang point-down beside the right leg, point at (26, 46). Attack (an overhead cut): wind-up (column 10): the hand at (6, 20), the blade raised up-left above the head, point at (1, 3); strike (column 11): the hand at (24, 40), the blade cut straight down the square, the guard at row 39 and the point at (24, 46); recover (column 12): the hand at (18, 38), the blade lowered to the right, point at (36, 45). Ground icon: the sword lying diagonally, point up-left at (6, 30), blade 4 px wide down-right to the guard at columns 26–34, rows 38–41, grip and pommel to (41, 46); facets as above; outline 147 on the lower and right edges; rows 0–29, columns 0–5 and columns 42–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the sword in the `weapon` slot; its attack frames are an overhead cut. The chain: Forge a short sword (2 iron bars, at the smithy, skill smithing). Proposed d20 block: martial melee, 1d6 piercing, finesse, light. Dropped: the ground icon lies on the cell (stack 1). The long sword is the same hilt with a blade half again as long (its own brief below).

#### Readability Check:
At zoom ⅓ a pale bar slanting up-right across the chest, unlike the spear's long up-left line and the dagger's short hanging sliver.

Deliver: art/masters/sword_short.png (48×48 ground icon, magenta background) + art/masters/sword_short.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_sword_short.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_sword_short.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_SwordShort.png and $UF_held_sword_short.png.

---

### sword_long — Long sword (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn sword is 24 px wide and 30 px tall; the ground icon fits one 48×48 square, 44 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: held at port across the chest like the short sword but reaching past the left shoulder; the blade's upper-left facet is lit, its lower-right facet dark
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the metal see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty
- **Palette Ramps**: Blade 118 `#EFEFEF` (edge glint), 120 `#CECECE` (lit facet), 124 `#8E8E8E` (shaded facet), 126 `#6D6D6D` (fuller); Guard and pommel 128 `#515151`, 122 `#AEAEAE` (glint); Grip 143 `#5D350C`; Grip wrap 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: the short sword's hilt made longer for two hands (grip 3×9 of 143 with three 138 bands at columns 12–14, rows 34–42, pommel 3×2 of 128 at rows 43–44, guard 11×2 of 128 at columns 9–19, rows 32–33, its ends turned 1 px down) in the right hand at (14, 36), and a blade 4 px wide running up-right from the guard to a point at (37, 6), past the left shoulder: upper-left facet 120 with the 118 glint, lower-right facet 124, a 126 fuller for two thirds of the length. Painted in front of the body where it crosses it. The outline is 147 on the lower and right silhouette only. Walk: follows the hand point ±2 px; work: 4 px lower, hanging point-down beside the right leg with the point at (30, 46). Attack (an overhead cut in two hands): wind-up (column 10): the hand at (6, 20), the blade raised up-left above the head with the point at (1, 1); strike (column 11): the hand at (24, 40), the blade cut straight down the square, the guard at row 36 and the point at (24, 46); recover (column 12): the hand at (18, 38), the blade lowered to the right, point at (40, 44). Ground icon: the sword lying diagonally from its point at (2, 28) down-right to the guard at columns 30–40, rows 40–43 and the pommel at (45, 46); facets as above; outline 147 on the lower and right edges; rows 0–27, columns 0–1 and column 47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the long sword in the `weapon` slot. The chain: Forge a long sword (3 iron bars, at the smithy, skill smithing; the smithy's most expensive blade). Proposed d20 block: martial melee, 1d8 slashing, Strength, versatile 1d10 in two hands (no shield). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ a pale bar slanting up-right past the left shoulder, longer than the short sword's, which stops at the shoulder.

Deliver: art/masters/sword_long.png (48×48 ground icon, magenta background) + art/masters/sword_long.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_sword_long.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_sword_long.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_SwordLong.png and $UF_held_sword_long.png.

---

### axe_iron — Iron axe (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn axe is 14 px wide and 30 px tall; the ground icon fits one 48×48 square, 36 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: rests on the right shoulder like the club, the haft up-left along the lean and the iron head beside the head; the head's top facet is lit, its south face mid, its east face dark
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the shape see SEG-07's `stone_axe` brief and for the metal the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty
- **Palette Ramps**: Head 118 `#EFEFEF` (edge glint), 120 `#CECECE` (top facet), 124 `#8E8E8E` (south face), 126 `#6D6D6D` (east face), 128 `#515151` (eye); Haft 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Wedge 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a bearded iron head on a straight haft resting on the right shoulder. The haft is 3 px wide from the grip in the right hand at columns 13–15, rows 33–40 up-left along the lean to the head's eye at (4, 12), 141 on its upper-left edge, 143 in the middle, 145 on its lower-right edge. The head sits crosswise at the haft's top: a wedge 12 px long and 8 px deep at columns 0–11, rows 6–16, its cutting edge on the left (columns 0–1, rows 7–15) with a 1-px 118 glint; its top facet (upper-left half) 120 with 124 micro-dithered in, its south face 124, its east face (the 3 px by the eye) 126, a 128 eye pixel where the haft enters and a 138 wedge pixel above it; the pixels inside the body's head (columns 6–16, rows 9–21) are left transparent. The outline is 147 on the lower and right silhouette only. Walk: follows the hand point ±2 px; work: the axe hangs 4 px lower with the head down beside the right leg (head at columns 18–29, rows 38–46), the same in all three frames (the tool swing of chopping is the body's work frames; the layer keeps the axe in the hand). Attack (an overhead chop): wind-up (column 10): the hand at (6, 20), the axe raised up-left with the head at columns 0–11, rows 1–9; strike (column 11): the hand at (24, 40), the haft straight down the square and the head at columns 20–31, rows 39–46 with its edge down; recover (column 12): the hand at (18, 38), the axe lowered to the right, head at columns 28–39, rows 36–44. Ground icon: the axe lying diagonally, head up-left at columns 4–17, rows 26–36 (edge on the upper-left), haft 3 px wide down-right to the butt at columns 36–39, rows 43–46, facets as above; outline 147 on the lower and right edges; rows 0–25, columns 0–3 and columns 40–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the axe in the `weapon` slot; being an `axe` tool it also speeds "chop" ×3 and Split firewood (`tool` block per the catalog), so a woodcutter who owns one wears it to work. The chain: Forge an iron axe (1 iron bar, 1 log, at the smithy). Proposed d20 block: martial melee, 1d8 slashing, Strength, versatile 1d10. Dropped: the ground icon lies on the cell (stack 1); the stone axe's icon (SEG-07) is the same layout with a grey knapped head and a lashing.

#### Readability Check:
At zoom ⅓ a dark stick over the right shoulder ending in a pale grey block, unlike the club's dark knob and the mace's small round head.

Deliver: art/masters/axe_iron.png (48×48 ground icon, magenta background) + art/masters/axe_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_axe_iron.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_axe_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_AxeIron.png and $UF_held_axe_iron.png.

---

### mace — Mace (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn mace is 10 px wide and 28 px tall; the ground icon fits one 48×48 square, 32 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: rests on the right shoulder, the haft up-left along the lean and the flanged head beside the head; each flange is lit on its upper-left and dark on its lower-right
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the metal see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty
- **Palette Ramps**: Head 120 `#CECECE` (lit flanges), 122 `#AEAEAE`, 124 `#8E8E8E` (shaded flanges), 126 `#6D6D6D` (between flanges), 118 `#EFEFEF` (glints); Haft 128 `#515151` (iron), 122 `#AEAEAE` (lit strip); Grip 143 `#5D350C`, 138 `#AA8659`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: an iron haft 3 px wide from the grip in the right hand (columns 13–15, rows 33–40: 143 with two 138 bands) up-left along the lean to the head at (5, 12), the haft 128 with a 1-px 122 lit strip on its upper-left edge; the head is a 9×9 flanged knob at columns 1–9, rows 8–16: a 126 core with six 2-px flanges radiating from it, each 120 on its upper-left side, 124 on its lower-right side and a 118 glint at its tip, with 122 micro-dithered between them; the pixels inside the body's head (columns 6–16, rows 9–21) are left transparent. The outline is 147 on the lower and right silhouette only. Walk: follows the hand point ±2 px; work: hangs 4 px lower with the head down beside the right leg (head at columns 18–26, rows 38–46) in all three frames. Attack (an overhead blow): wind-up (column 10): the hand at (6, 20), the mace raised with the head at columns 0–8, rows 1–9; strike (column 11): the hand at (24, 40), the haft straight down the square and the head at columns 20–28, rows 38–46; recover (column 12): the hand at (18, 38), the mace lowered to the right, head at columns 30–38, rows 36–44. Ground icon: the mace lying diagonally, head up-left at columns 6–14, rows 32–40, haft down-right to the grip at columns 32–37, rows 42–46, the haft's top strip 122 and body 128; outline 147 on the lower and right edges; rows 0–31, columns 0–5 and columns 38–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the mace in the `weapon` slot; its attack frames are an overhead blow. The chain: Forge a mace (2 iron bars, at the smithy). Proposed d20 block: simple melee, 1d6 bludgeoning, Strength. Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ a grey stick over the right shoulder with a small spiky pale ball, smaller and rounder than the axe's block and paler than the club's wooden knob.

Deliver: art/masters/mace.png (48×48 ground icon, magenta background) + art/masters/mace.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_mace.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_mace.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_Mace.png and $UF_held_mace.png.

---

### bow_short — Short bow (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn bow is 14 px wide and 28 px tall; the ground icon fits one 48×48 square, 40 px wide and 20 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: carried unstrung-looking at the left side, the stave running up-left along the lean beside the left hip; in the attack frames it is raised in front of the body and drawn
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_ranger_south_48.png` (shape 460, the figure a bow suits); for the wood see the `!$U7_Item_WoodLog` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty; the nocked arrow of the wind-up frame is part of this layer, the arrow in flight is the `ui_fx_arrow` effect
- **Palette Ramps**: Stave 141 `#7D4D18` (lit edge), 143 `#5D350C` (body), 145 `#3D240C` (belly side); String 148 `#EFEBE7`, 150 `#CEC6BE`; Grip wrap 136 `#CAB292`, 138 `#AA8659`; Nocked arrow 143 `#5D350C` (shaft), 120 `#CECECE` (head), 148 `#EFEBE7` (fletching); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a short recurve bow held in the left hand at (32, 36) at the left side, its stave a shallow curve 3 px wide running from the lower tip at (40, 46) up-left along the lean to the upper tip at (26, 18), bowed 3 px to the right at its middle so the string, a 1-px line of 148 with 150 where it crosses the stave's shade, runs straight between the tips 2 px left of the stave's belly; the stave is 141 on its upper-left edge, 143 in the middle, 145 on its lower-right edge, with a 4-px grip wrap of 136 and 138 around the hand point. It is painted to the right of the body's hip (columns 30–40 at rows 30–46) and crosses nothing. The outline is 147 on the lower and right silhouette only. Walk: follows the left hand ±2 px; work: 4 px lower. Attack (a shot): wind-up (column 10): the left hand at (30, 26) and the bow raised in front of the body, stave vertical at columns 28–31 from row 12 to row 40 bowed 4 px right at the middle, the string drawn back to the right hand at the cheek (12, 18) so it runs from each tip to (12, 18) as two 1-px 148 lines, with the nocked arrow along the draw: a 1-px 143 shaft from (12, 18) down-right to the stave's middle at (29, 27), a 2-px 120 head just past the stave and a 3-px 148 fletch at the nock; strike (column 11): the left hand at (36, 34), the string straight again between the tips, no arrow (the effect leaves the cell), the bow tilted 4 px right at the top; recover (column 12): the left hand at (32, 36), the bow lowered to the stand pose. Ground icon: the bow lying diagonally, upper tip at (4, 28), lower tip at (43, 46), the stave bowed up-right so its middle sits at (26, 32) and the string runs straight between the tips below it, the stave 3 px thick with 141 on top and 145 on its lower-right edge; outline 147 on the lower and right edges; rows 0–27, columns 0–3 and columns 44–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the bow in the `weapon` slot; it needs `arrows` carried (the quiver, briefed under `arrows`) to shoot, one shot per beat, and the shot appears as the arrow-in-flight effect crossing the cells to the target. The chain: Shape a short bow (1 log, 1 plant fiber for the string, at the bowyer's bench, skill bowyery; the elves' first weapon). Proposed d20 block: simple ranged, 1d6 piercing, Dexterity, two-handed (no shield), ammunition `arrows`, range 80/320 ft = 16/64 cells (normal/long; the chains work may halve both for the map's readability and must say so). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ a curved dark line with a pale string at the figure's right side (the viewer's right), unlike the straight spear on the other side; the long bow is the same curve reaching above the head.

Deliver: art/masters/bow_short.png (48×48 ground icon, magenta background) + art/masters/bow_short.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_bow_short.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_bow_short.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_BowShort.png and $UF_held_bow_short.png.

---

### bow_long — Long bow (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn bow is 20 px wide and 42 px tall; the ground icon fits one 48×48 square, 46 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: carried at the left side, the long stave running up-left along the lean from beside the left foot to above the shoulder; raised and drawn in the attack frames
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_ranger_south_48.png` (shape 460); for the wood see the `!$U7_Item_WoodLog` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty
- **Palette Ramps**: Stave 141 `#7D4D18` (lit edge), 143 `#5D350C` (body), 145 `#3D240C` (belly side); String 148 `#EFEBE7`, 150 `#CEC6BE`; Grip wrap 136 `#CAB292`, 138 `#AA8659`; Nocked arrow 143 `#5D350C` (shaft), 120 `#CECECE` (head), 148 `#EFEBE7` (fletching); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a tall self bow held in the left hand at (32, 36), its stave a long shallow curve 3 px wide from the lower tip beside the left foot at (42, 46) up-left along the lean to the upper tip above the shoulder at (22, 4), bowed 4 px to the right at the middle, the string a straight 1-px 148 line between the tips (150 where it crosses the stave's shade); the stave is 141 on its upper-left edge, 143 in the middle and 145 on its lower-right edge, with a 5-px grip wrap of 136 and 138 around the hand point; it is painted to the right of the body and in front of the left shoulder where it passes it (columns 24–28, rows 18–24). The outline is 147 on the lower and right silhouette only. Walk: follows the left hand ±2 px; work: 4 px lower, the lower tip lifted off the ground. Attack (a shot): wind-up (column 10): the left hand at (30, 26) and the bow raised in front, stave vertical at columns 28–31 from row 2 to row 44 bowed 5 px right, the string drawn back to the right hand at the cheek (12, 18) as two 1-px 148 lines from the tips, the nocked arrow a 1-px 143 shaft from (12, 18) down-right to the stave at (29, 26) with a 2-px 120 head past the stave and a 3-px 148 fletch at the nock; strike (column 11): the left hand at (36, 34), the string straight, no arrow, the bow tilted 4 px right at the top; recover (column 12): the left hand at (32, 36), the bow lowered to the stand pose. Ground icon: the bow lying diagonally from its upper tip at (1, 26) to its lower tip at (46, 46) with the stave bowed up-right to (24, 30) and the string straight below it, 3 px thick with 141 on top and 145 on the lower-right edge; outline 147 on the lower and right edges; rows 0–25, column 0 and column 47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the long bow in the `weapon` slot; it needs `arrows` carried (the quiver) and shoots the arrow-in-flight effect, one shot per beat. The chain: Shape a long bow (2 logs, 1 plant fiber, at the bowyer's bench, skill bowyery, the higher skill roll). Proposed d20 block: martial ranged, 1d8 piercing, Dexterity, two-handed, heavy, ammunition `arrows`, range 150/600 ft = 30/120 cells (the chains work may halve both and must say so). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ a curved dark line taller than the figure, rising above the head on the viewer's right, where the short bow stops at the shoulder.

Deliver: art/masters/bow_long.png (48×48 ground icon, magenta background) + art/masters/bow_long.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_bow_long.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_bow_long.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_BowLong.png and $UF_held_bow_long.png.

---

### sling — Sling (AR-900)
- **Category**: Equipment layer (held) with a ground icon
- **Dimensions**: the held layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn sling is 6 px wide and 12 px tall; the ground icon fits one 48×48 square, 28 px wide and 14 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: two cords hang from the right hand down-right along the lean to a leather pouch; in the wind-up frame the cords whirl in an ellipse above the head
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the leather see the `!$U7_Item_LeatherHide` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `held`: rows S, W, E, N; stand, walk, work and attack columns painted; carry, cast and sleep empty; the stone in flight is the stone frame of the `ui_fx_arrow` effect
- **Palette Ramps**: Cords 136 `#CAB292`, 138 `#AA8659` (shaded turns); Pouch 139 `#9A7141` (lit), 141 `#7D4D18` (body), 143 `#5D350C` (fold); Stone 122 `#AEAEAE`, 126 `#6D6D6D`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: two 1-px cords of 136 (138 on every third pixel) hang from the right hand at (14, 36) down-right along the lean, 1 px apart, to a leather pouch 5×4 px at columns 16–20, rows 43–46 (139 on its upper-left, 141 body, one 143 fold line) holding a 2×2 stone of 122 with a 126 lower-right pixel. The outline is 147 under the pouch only. Walk: follows the hand ±2 px; work: 4 px lower, the pouch touching the ground at row 46 (never row 47 in the layer, so it never reads as part of the feet). Attack (a cast): wind-up (column 10): the hand at (6, 20) and the cords whirling: a 1-px 136 ellipse 22 px wide and 8 px tall centred at (10, 8), rows 4–12, columns 0–21 (nothing on row 0), the pouch at its right end at columns 18–22, rows 9–12 with the stone; strike (column 11): the hand at (24, 40), the cords straight down-right from the hand to the pouch at columns 40–44, rows 42–46, the pouch open (a 139 flap) and empty (the stone has left as the effect); recover (column 12): the hand at (18, 38), the cords hanging as in stand with the pouch at columns 20–24, rows 43–46, empty. Ground icon: the sling coiled on the ground, its two cords a loose 1-px 136 loop 20 px wide on rows 36–44, columns 8–27, and the pouch at columns 26–35, rows 40–46 with the stone in it; outline 147 on the lower and right edges of the pouch; rows 0–35, columns 0–7 and columns 36–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever holds the sling in the `weapon` slot; it throws `stone` items carried in the pack (no quiver), one cast per beat, shown as the stone frame of the arrow-in-flight effect. The chain: Braid a sling (1 leather, 2 plant fiber, at the tanning rack or by hand per the catalog; the cheapest ranged weapon, made before any bow). Proposed d20 block: simple ranged, 1d4 bludgeoning, Dexterity, ammunition `stone`, range 30/120 ft = 6/24 cells. Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ nothing but a tan speck hanging at the right hand in stand, and in the wind-up a thin loop over the head that no other weapon makes; the ground icon is a small tan loop, unlike the plant-fiber hank's yellow twist.

Deliver: art/masters/sling.png (48×48 ground icon, magenta background) + art/masters/sling.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/held_sling.png (768×192, the AR-600 held layer, magenta background) + art/masters/held_sling.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "held"); the export names are !$Item_Sling.png and $UF_held_sling.png.

---

## Shields (AR-901): shield layers with their ground icons

### shield_wood — Wooden shield (AR-901)
- **Category**: Equipment layer (shield) with a ground icon
- **Dimensions**: the shield layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn shield is 20 px wide and 20 px tall; the ground icon fits one 48×48 square, 30 px wide and 24 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: a round shield strapped to the left forearm with its face toward the south (the viewer), so it draws as a full disc; its upper-left rim is lit, its lower-right rim dark, the boss lit on its upper-left
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the planks see the `!$U7_Item_WoodLog` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `shield`: rows S, W, E, N; every column painted except sleep [15]; composed under the held layer and over the body, clothes and armor
- **Palette Ramps**: Planks 139 `#9A7141` (lit), 141 `#7D4D18` (body), 143 `#5D350C` (plank gaps), 145 `#3D240C` (lower-right shade); Rim 126 `#6D6D6D`, 124 `#8E8E8E` (lit upper-left), 128 `#515151`; Boss 120 `#CECECE`, 124 `#8E8E8E`, 118 `#EFEFEF` (glint); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a round plank shield 20 px across centred at (34, 32), spanning columns 24–43, rows 22–41, held on the left arm beside the body's left hip (the layer covers the body's columns 24–30 there). The rim is a 2-px ring of 126 with 124 on its upper-left quarter and 128 on its lower-right quarter; inside it six vertical planks 3 px wide of 141 with a 139 lit strip on each plank's left edge and a 1-px 143 gap between planks, the lower-right third of the face micro-dithered into 145; the boss is a 6-px domed disc of 120 at the centre (columns 31–36, rows 29–34) with a 118 glint pixel at its upper-left and 124 on its lower-right half, and four 128 rivet pixels sit on the rim at the compass points. The outline is 147 on the lower and right silhouette only. Walk: follows the left hand point ±2 px; work: unchanged (the shield stays on the arm). Attack: wind-up (column 10): the shield raised in front, centred at (30, 24); strike (column 11): pulled aside to the right, centred at (38, 34); recover (column 12): centred at (32, 36). N facing: the shield hangs on the back, its full disc visible over the body's back; W and E: transposed like the body, the disc foreshortened to a 10-px-wide oval of rim and boss. Ground icon: the shield lying face-up on the ground, a 28×22 oval (a disc lying flat is drawn as the top-down ellipse) at columns 10–37, rows 24–45, the planks as above with the boss at (24, 34), 3 px thick so its lower and right rim shows a 3-px band of 128; outline 147 on the lower and right edges; rows 0–23, columns 0–9 and columns 38–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the shield in the `shield` slot; a two-handed weapon (the bows, a versatile weapon used in two hands) leaves the slot empty and the layer is not drawn. The chain: Bind a wooden shield (2 logs, 1 leather, at the bowyer's bench, skill carpentry). Proposed d20 block: shield, armor class +2. Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ a brown disc with a pale dot at the figure's right side (the viewer's right), unlike the iron shield's grey disc and the bow's thin curve.

Deliver: art/masters/shield_wood.png (48×48 ground icon, magenta background) + art/masters/shield_wood.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/shield_shield_wood.png (768×192, the AR-600 shield layer, magenta background) + art/masters/shield_shield_wood.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "shield"); the export names are !$Item_ShieldWood.png and $UF_shield_shield_wood.png.

---

### shield_iron — Iron shield (AR-901)
- **Category**: Equipment layer (shield) with a ground icon
- **Dimensions**: the shield layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn shield is 18 px wide and 18 px tall; the ground icon fits one 48×48 square, 28 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: a round iron shield on the left forearm, face to the south, so a full disc; domed, so its upper-left half is lit and its lower-right half shaded
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the metal see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `shield`: rows S, W, E, N; every column painted except sleep [15]; composed under the held layer
- **Palette Ramps**: Face 120 `#CECECE` (lit), 122 `#AEAEAE` (mid), 124 `#8E8E8E` (shaded), 126 `#6D6D6D` (lower-right rim), 118 `#EFEFEF` (glints); Rivets and straps 128 `#515151`, 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a domed iron disc 18 px across centred at (34, 32), spanning columns 25–42, rows 23–40, on the left arm beside the left hip. The upper-left half of the face is 120 with 118 in a 3-px crescent glint near the upper-left rim, the middle band 122, the lower-right half 124 micro-dithered into 126 along the rim; a raised central boss 5 px across at columns 32–36, rows 30–34 in 120 with a 118 pixel; eight 128 rivets ring the face 2 px inside the rim; a 1-px 126 rim line runs round the lower-right half. The outline is 147 on the lower and right silhouette only. Walk: follows the left hand ±2 px; work: unchanged. Attack: wind-up (column 10): raised in front, centred at (30, 24); strike (column 11): aside to the right, centred at (38, 34); recover (column 12): centred at (32, 36). N: on the back; W and E: transposed, a 9-px-wide oval. Ground icon: the shield lying face-up, a 26×20 oval at columns 11–36, rows 25–44, shaded as above with the boss at (24, 34), 3 px thick with a 3-px 126 band on its lower and right rim; outline 147 on the lower and right edges; rows 0–24, columns 0–10 and columns 37–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the shield in the `shield` slot; not drawn while a two-handed weapon is used. The chain: Forge an iron shield (2 iron bars, 1 leather, at the smithy, skill smithing). Proposed d20 block: shield, armor class +2 (the same as the wooden shield; it is heavier and lasts longer under the catalog's material and quality rules). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ a light grey disc at the figure's right side (the viewer's right), unlike the wooden shield's brown disc.

Deliver: art/masters/shield_iron.png (48×48 ground icon, magenta background) + art/masters/shield_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/shield_shield_iron.png (768×192, the AR-600 shield layer, magenta background) + art/masters/shield_shield_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "shield"); the export names are !$Item_ShieldIron.png and $UF_shield_shield_iron.png.

---

## Head (AR-902): helm layers with their ground icons

### helmet_leather — Leather cap (AR-902)
- **Category**: Equipment layer (head) with a ground icon
- **Dimensions**: the head layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn cap is 14 px wide and 9 px tall; the ground icon fits one 48×48 square, 22 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: a skullcap on the crown of the head, whose top is lit, south face mid and east face dark, following the head's own shading
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265, whose head the cap fits); for the leather see the `!$U7_Item_LeatherHide` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `head`: rows S, W, E, N; every column painted except sleep [15] (the cap comes off to sleep); composed over the body, clothes and torso layers and under the shield and held layers
- **Palette Ramps**: Leather 137 `#BA9A71` (lit crown), 139 `#9A7141` (body), 140 `#8A5D2D` (south face), 141 `#7D4D18` (east face), 143 `#5D350C` (brim line); Stitching 136 `#CAB292`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a close-fitting cap covering the head's crown from row 8 (1 px above the body's head, so the head's outline is hidden under it) to row 15, columns 5–17: a dome whose upper-left third is 137 with 139 micro-dithered in, its middle 139, its south face (rows 13–15) 140 and its east side (columns 15–17) 141; a 1-px 143 brim line runs along its lower edge on row 15, and two 136 stitch seams of alternating pixels run over the dome from front to back at columns 9 and 13; a 3×4 ear flap of 140 hangs on the east side at columns 16–18, rows 15–18. The outline is 147 on the lower and right silhouette only. Every other column: the same cap placed on the head of that frame of the body sheet (the head moves by ±2 px in the walk and up to 6 px in the attack frames; the cap moves with it). N: the cap seen from the back, the dome with the seams and no face below. Ground icon: the cap lying on its side, the dome up-left at columns 12–31, rows 30–44 with the brim toward the lower right and the ear flap folded out at columns 30–33, rows 40–45, 8 px thick so its south face is 140 and its east face 141; outline 147 on the lower and right edges; rows 0–29, columns 0–11 and columns 34–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the cap in the `head` slot; the clothing tier below is unchanged. The chain: Sew a leather cap (1 leather, at the tanning rack, skill leatherwork). Proposed d20 block: head armor, armor class +0 (the SRD has no separate helm; the chains work decides whether head armor adds to AC or only shields the head in the body-part injury roll). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ the head turns tan instead of hair-brown; the iron helm turns it grey.

Deliver: art/masters/helmet_leather.png (48×48 ground icon, magenta background) + art/masters/helmet_leather.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/head_helmet_leather.png (768×192, the AR-600 head layer, magenta background) + art/masters/head_helmet_leather.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "head"); the export names are !$Item_HelmetLeather.png and $UF_head_helmet_leather.png.

---

### helmet_iron — Iron helm (AR-902)
- **Category**: Equipment layer (head) with a ground icon
- **Dimensions**: the head layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn helm is 16 px wide and 14 px tall; the ground icon fits one 48×48 square, 22 px wide and 20 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: a rounded conical helm over the head with a nasal bar down the face; the top is lit, the south face mid, the east face dark
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the metal see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `head`: rows S, W, E, N; every column painted except sleep [15]; composed over the body, clothes and torso layers and under the shield and held layers
- **Palette Ramps**: Iron 118 `#EFEFEF` (glint), 120 `#CECECE` (lit top), 122 `#AEAEAE` (body), 124 `#8E8E8E` (south face), 126 `#6D6D6D` (east face, the rim's inside), 128 `#515151` (brow band, nasal, rim); Lining 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a helm over the whole head from row 5 to row 16, columns 4–19: a rounded cone whose peak is at (9, 5), its upper-left half 120 with a 118 glint pixel at the peak and 122 micro-dithered in, its middle 122, its south face (rows 13–16) 124 and its east side (columns 16–19) 126; a 2-px brow band of 128 runs along its lower edge on rows 15–16, and a nasal bar 1 px wide of 128 drops from the brow band at column 11 to row 19 over the face; a 1-px 143 lining line shows under the brow band's ends; the pixels of the body's face between the nasal and the helm's sides stay transparent so the face shows. The outline is 147 on the lower and right silhouette only. Every other column: the same helm on the head of that frame. N: the cone seen from the back, no nasal, the brow band and a 128 neck guard 3 px deep. Ground icon: the helm lying on its side with its peak up-left at (12, 30), the cone spanning columns 10–31, rows 28–46 with the open rim toward the lower right as a 128 ring 2 px wide at columns 26–31, rows 36–46 with 126 inside it, the nasal sticking out at columns 30–33, row 42; outline 147 on the lower and right edges; rows 0–27, columns 0–9 and columns 34–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the helm in the `head` slot. The chain: Forge an iron helm (1 iron bar, 1 leather for the lining, at the smithy, skill smithing). Proposed d20 block: head armor, armor class +1 (the chains work decides; see the leather cap). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ the head turns light grey and pointed; the leather cap is tan and round.

Deliver: art/masters/helmet_iron.png (48×48 ground icon, magenta background) + art/masters/helmet_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/head_helmet_iron.png (768×192, the AR-600 head layer, magenta background) + art/masters/head_helmet_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "head"); the export names are !$Item_HelmetIron.png and $UF_head_helmet_iron.png.

---

## Torso and legs (AR-903): armor layers with their ground icons

### armor_leather — Leather armor (AR-903)
- **Category**: Equipment layer (torso) with a ground icon
- **Dimensions**: the torso layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn jerkin is 24 px wide and 15 px tall; the ground icon fits one 48×48 square, 30 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: a sleeveless jerkin over the torso, which runs from the shoulders down-right to the hips along the lean; the shoulders and the upper-left of the chest are lit, the front mid, the east side dark
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_ranger_south_48.png` (shape 460, a figure in leathers); for the leather see the `!$U7_Item_LeatherHide` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `torso`: rows S, W, E, N; every column painted except sleep [15]; composed over the body, clothes tier and legs layers and under the head, shield and held layers
- **Palette Ramps**: Leather 138 `#AA8659` (lit shoulders), 139 `#9A7141` (body), 140 `#8A5D2D` (front), 141 `#7D4D18` (east side), 143 `#5D350C` (seams, hem); Lacing 136 `#CAB292`; Buckle 122 `#AEAEAE`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a jerkin covering the body's torso from the shoulder line (row 22, columns 8–24) down-right to 2 px below the hip line (row 35, columns 16–32): the parallelogram between those two edges, leaving the arms bare from the shoulder caps down. Its upper-left third (the shoulders and the left of the chest) is 138 with 139 micro-dithered in, the chest and belly 139, the lower band (rows 31–35) 140, the east side (the rightmost 3 px of every row) 141; two 143 seam lines run from each shoulder cap down-right to the hem, a 1-px 136 lacing of alternating pixels runs down the chest's middle from row 23 to row 33 with a 122 buckle pixel at its foot, and the hem is a 1-px 143 line with a 2-px scallop every 4 px. The outline is 147 on the lower and right silhouette only. Every other column: the same jerkin fitted to the torso of that frame of the body sheet (the torso turns and leans in the attack and work frames; the seams follow it). N: the back of the jerkin, no lacing, one 143 spine seam. Ground icon: the jerkin folded into a block 30×22 like the hide cloak (SEG-07) but without the fur collar: its contact on rows 42–47, columns 18–39, 10 px thick so its top face sits at columns 8–29, rows 26–35, 139 on top with 138 dither and the 136 lacing across it, 140 south face, 141 east face; outline 147 on the lower and right edges; rows 0–25, columns 0–7 and columns 40–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the jerkin in the `torso` slot; the clothing tier stays under it (a colonist in a woven wrap and a jerkin shows both). The chain: Sew leather armor (3 leather, 2 plant fiber, at the tanning rack, skill leatherwork; the first armor a colony makes, from the hides its hunters bring). Proposed d20 block: light armor, armor class 11 + Dexterity modifier. Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ the torso turns a darker tan than the hide cloak's and stops at the hips with bare arms; the iron mail turns it grey.

Deliver: art/masters/armor_leather.png (48×48 ground icon, magenta background) + art/masters/armor_leather.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/torso_armor_leather.png (768×192, the AR-600 torso layer, magenta background) + art/masters/torso_armor_leather.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "torso"); the export names are !$Item_ArmorLeather.png and $UF_torso_armor_leather.png.

---

### mail_iron — Iron mail (AR-903)
- **Category**: Equipment layer (torso) with a ground icon
- **Dimensions**: the torso layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn mail shirt is 26 px wide and 18 px tall; the ground icon fits one 48×48 square, 30 px wide and 22 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: a short-sleeved shirt of rings over the torso and upper arms, following the lean; lit on the shoulders, mid on the front, dark on the east side
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the metal see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `torso`: rows S, W, E, N; every column painted except sleep [15]; composed over the body, clothes tier and legs layers and under the head, shield and held layers
- **Palette Ramps**: Rings 120 `#CECECE` (glints), 122 `#AEAEAE` (lit), 124 `#8E8E8E` (body), 126 `#6D6D6D` (shade), 128 `#515151` (under the arms, hem edge); Lining 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a mail shirt covering the torso from the shoulder line (row 22, columns 8–24) down-right to 4 px below the hips (row 37, columns 17–33), with short sleeves that follow the upper arms from each shoulder cap 6 px down-right (to (14, 28) on the viewer's left and (30, 28) on the right), 5 px wide. The rings are a 2×2 checker of 122 and 124 over the whole shirt, with a single 120 glint pixel every 4 px along the shoulders and the upper-left of the chest, the checker turning to 124 and 126 on the lower band (rows 33–37) and to 126 and 128 on the east side (the rightmost 3 px) and under the arms; the hem is a 1-px 128 line and the sleeve ends and neck show a 1-px 143 lining. The outline is 147 on the lower and right silhouette only. Every other column: the shirt fitted to the torso and upper arms of that frame. N: the back, the same checker with no neck opening. Ground icon: the shirt folded into a 30×22 block like the leather armor's, its top face at columns 8–29, rows 26–35 in the 122/124 checker with 120 glints, south face 124/126 checker, east face 126/128 checker, a 143 lining line along the top face's near edge; outline 147 on the lower and right edges; rows 0–25, columns 0–7 and columns 40–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the mail in the `torso` slot; the clothing tier stays under it. The chain: Forge iron mail (4 iron bars, 1 leather, at the smithy, skill smithing; the most expensive piece in the chain). Proposed d20 block: medium armor, armor class 13 + Dexterity modifier (max 2), the SRD's chain shirt line; the chains work may use the heavier lines (14, 16) for a later mail tier. Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ the torso and upper arms turn light grey; leather armor is tan and leaves the arms bare.

Deliver: art/masters/mail_iron.png (48×48 ground icon, magenta background) + art/masters/mail_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/torso_mail_iron.png (768×192, the AR-600 torso layer, magenta background) + art/masters/torso_mail_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "torso"); the export names are !$Item_MailIron.png and $UF_torso_mail_iron.png.

---

### leggings_leather — Leather leggings (AR-903)
- **Category**: Equipment layer (legs) with a ground icon
- **Dimensions**: the legs layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn leggings are 23 px wide and 11 px tall; the ground icon fits one 48×48 square, 28 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: two leather tubes over the legs, which run from the hips down-right to the ankles along the lean; each leg's upper-left strip is lit, its front mid, its east side dark
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_ranger_south_48.png` (shape 460); for the leather see the `!$U7_Item_LeatherHide` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `legs`: rows S, W, E, N; every column painted except sleep [15]; composed over the body and clothes tier and under the torso, head, shield and held layers
- **Palette Ramps**: Leather 138 `#AA8659` (lit strip), 139 `#9A7141` (body), 140 `#8A5D2D` (front shade), 141 `#7D4D18` (east side), 143 `#5D350C` (seams, knee line); Lacing 136 `#CAB292`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: the body's two legs each run down-right from the hip line (row 34) to the ankle (row 44): the viewer's-left leg from columns 16–21 at row 34 to columns 26–31 at row 44, the right leg from columns 24–29 at row 34 to columns 33–38 at row 44. The leggings cover both bands from row 34 to row 44, stopping 1 px above the feet: each leg's upper-left 1-px strip is 138, its body 139, a 2-px front band 140 along the lower half, its east 1-px strip 141; a 143 seam runs down the outer edge of each leg and a 143 line crosses each at the knee (row 39); a 1-px 136 lacing of alternating pixels runs down the inner seam of the viewer's-left leg. The gap between the legs stays transparent. The outline is 147 on the lower and right silhouette only. Every other column: the tubes fitted to the legs of that frame (the walk frames spread the legs; the attack frames step forward). N: the same tubes from the back with the seams on the outer edges. Ground icon: the leggings folded once, a 28×18 block with its contact on rows 42–47, columns 18–39, 8 px thick, top face at columns 10–31, rows 28–37 in 139 with 138 dither and both 143 seams showing, 140 south face, 141 east face; outline 147 on the lower and right edges; rows 0–27, columns 0–9 and columns 40–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the leggings in the `legs` slot; the clothing tier stays under them. The chain: Sew leather leggings (2 leather, 1 plant fiber, at the tanning rack, skill leatherwork). Proposed d20 block: leg armor, armor class +0 (the chains work decides whether leg armor adds to AC or only shields the legs in the body-part injury roll). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ the legs turn tan and read as one block with the leather jerkin; bare legs keep the skin colour and greaves add grey shins.

Deliver: art/masters/leggings_leather.png (48×48 ground icon, magenta background) + art/masters/leggings_leather.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/legs_leggings_leather.png (768×192, the AR-600 legs layer, magenta background) + art/masters/legs_leggings_leather.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "legs"); the export names are !$Item_LeggingsLeather.png and $UF_legs_leggings_leather.png.

---

### greaves_iron — Iron greaves (AR-903)
- **Category**: Equipment layer (legs) with a ground icon
- **Dimensions**: the legs layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows); in the south stand frame the drawn greaves are 16 px wide and 8 px tall; the ground icon fits one 48×48 square, 26 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the body's anchor, the same pixel in every frame of every layer)
- **Projection**: U7 2.5D oblique: two shin plates strapped over the front of the lower legs, each a curved plate lit on its upper-left strip and dark on its east edge
- **Reference**: none in `art/u7_reference_squares/`; draw it over `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265); for the metal see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` (reference only, nothing copied ships)
- **Sheet**: AR-600 layout, layer `legs`: rows S, W, E, N; every column painted except sleep [15]; composed over the body, clothes tier and (when both are worn: the engine draws the greaves' file after the leggings') the leather leggings, under the torso, head, shield and held layers
- **Palette Ramps**: Iron 118 `#EFEFEF` (glint), 120 `#CECECE` (lit strip), 122 `#AEAEAE` (plate), 124 `#8E8E8E` (lower edge), 126 `#6D6D6D` (east edge); Straps 143 `#5D350C`, 128 `#515151` (buckles); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
South stand frame: a plate on the front of each shin from the knee (row 39) to the ankle (row 45), 4 px wide, following the leg's down-right run: the viewer's-left plate from columns 21–24 at row 39 to columns 27–30 at row 45, the right plate from columns 29–32 at row 39 to columns 34–37 at row 45. Each plate's upper-left 1-px strip is 120 with one 118 glint pixel at the knee, its body 122, its lowest row 124, its east 1-px edge 126; two 143 straps 1 px tall cross each plate to the back of the leg at rows 40 and 44 with a 128 buckle pixel on the plate's east edge. The rest of the leg stays transparent (skin or leggings show). The outline is 147 on the lower and right silhouette only. Every other column: the plates on the shins of that frame. N: the straps' backs only, two 143 lines per calf with 128 buckles. Ground icon: the two plates lying side by side on the ground, each a 10×14 curved plate, the left at columns 10–19, rows 30–44 and the right at columns 24–33, rows 32–46, 4 px thick so each has a 124 south face and a 126 east face, straps 143 across each; outline 147 on the lower and right edges; rows 0–29, columns 0–9 and columns 34–47 stay magenta.

#### Interaction / Transformed State Description:
Worn: the layer composes over the body of whoever has the greaves in the `legs` slot (over the leggings when both are worn, per the engine's slot rule in `docs/handoffs/HANDOFF_combat_gear.md`). The chain: Forge iron greaves (2 iron bars, 1 leather, at the smithy, skill smithing). Proposed d20 block: leg armor, armor class +1 (the chains work decides; see the leggings). Dropped: the ground icon lies on the cell (stack 1).

#### Readability Check:
At zoom ⅓ two light grey ticks on the shins; leggings turn the whole leg tan and bare legs stay skin-coloured.

Deliver: art/masters/greaves_iron.png (48×48 ground icon, magenta background) + art/masters/greaves_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/legs_greaves_iron.png (768×192, the AR-600 legs layer, magenta background) + art/masters/legs_greaves_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "legs"); the export names are !$Item_GreavesIron.png and $UF_legs_greaves_iron.png.

---

## Ammunition and materials (AR-904): ground items (also the inventory icons)

### arrows — Arrows (AR-904)
- **Category**: Item, with a worn layer (the quiver)
- **Dimensions**: the ground icon fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn bundle is 36 px wide and 22 px tall; the quiver layer is a sheet of 48×48 frames, 768×192 (16 columns × 4 rows), the quiver 8 px wide and 20 px tall in the north stand frame
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre; the layer uses the body's anchor)
- **Projection**: U7 2.5D oblique: a bundle lying flat, 6 px thick, so its upper edge sits 6 px up and left of its contact; the quiver hangs on the back along the lean, seen whole from the north and only by its fletched tops from the south
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_StrawBundle` stand-in in `game/img/characters/` for a tied bundle, and for the quiver `art/u7_reference_squares/u7_ranger_south_48.png` (the body it hangs on); reference only, nothing copied ships
- **Sheet**: the quiver is an AR-600 layout sheet, layer `back`: rows S, W, E, N; every column painted except sleep [15]; composed over the torso layer and under the shield and held layers
- **Palette Ramps**: Shafts 143 `#5D350C`, 141 `#7D4D18` (lit); Heads 120 `#CECECE`, 124 `#8E8E8E`, 118 `#EFEFEF` (glint); Fletching 148 `#EFEBE7`, 150 `#CEC6BE`, 139 `#9A7141` (bars); Tie and quiver 139 `#9A7141`, 141 `#7D4D18`, 143 `#5D350C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Ground icon: twelve arrows in a bundle tied once at the middle, lying diagonally with the heads up-left and the fletched nocks down-right, spanning columns 6–41 and rows 26–47. The shafts are twelve 1-px lines of 143 (141 on the three uppermost) running parallel from the heads to the nocks, gathered to 8 px wide at the tie, a 3-px band of 139 with a 141 knot pixel at columns 22–24, rows 34–40, and fanning to 14 px wide at each end; the heads are 2-px 120 points with a 124 lower pixel and one 118 glint on the uppermost, scattered along the up-left end at columns 6–12, rows 26–34; the fletching at the down-right end (columns 34–41, rows 38–47) is a fan of 3-px 148 vanes with 150 on their lower halves and one 139 bar each. The bundle's contact is its lower-right length on rows 42–47; its 6-px thickness shows as a 143 shade under the upper shafts. The outline is 147 on the lower and right silhouette only; rows 0–25, columns 0–5 and columns 42–47 stay magenta. Quiver layer, north stand frame: a leather tube 8 px wide and 20 px long of 141 with a 139 lit strip and a 143 lower-right edge, slung diagonally on the back from the right shoulder (14, 22) down-right to the left hip (30, 36), its open top at the shoulder showing a fan of eight 148/150 fletches 6 px tall rising up-left from it to row 14, with 143 shaft ends between them; a 1-px 139 strap runs from the tube's top over the shoulder. South stand frame: only the fletches show above the right shoulder, a 6×8 cluster at columns 3–8, rows 12–19, and the strap crosses the chest as a 1-px 141 diagonal from the right shoulder (8, 22) to the left hip (30, 33); everything else transparent (the body is in front). W and E: transposed like the body, the tube along the near side of the back. Every other column repeats the facing's quiver on that frame's body.

#### Interaction / Transformed State Description:
Carried by a unit with a bow in the `weapon` slot, the stack is its quiver (the `back` layer above), and each shot consumes one arrow; a miss lands the arrow on the ground as this icon (stack 1) for recovery, a hit is used up. The chain: Fletch arrows (1 log, 1 iron bar, 3 feathers → 12 arrows, at the fletcher's bench, skill fletching; the stack size proposed is 12, so one craft is one icon). Proposed d20 block: ammunition for `bow_short` and `bow_long`. No other state.

#### Readability Check:
At zoom ⅓ a thin dark diagonal bundle with pale tips at both ends, thinner than straw and darker than the plant-fiber hank; the quiver reads as a dark tube on a walking figure's back.

Deliver: art/masters/arrows.png (48×48 ground icon, magenta background) + art/masters/arrows.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/back_arrows.png (768×192, the AR-600 back layer, magenta background) + art/masters/back_arrows.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] }, layer "back"); the export names are !$Item_Arrows.png and $UF_back_arrows.png.

---

### charcoal — Charcoal (AR-904)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 30 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a heap of chunks 8 px tall, each chunk's top facet lit, south face mid, east face dark, the heap's crown 8 px up and left of its contact
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_Firewood` stand-in in `game/img/characters/` for split wood and `art/u7_reference_squares/u7_campfire_48.png` (shape 739) for charred logs; reference only, nothing copied ships
- **Palette Ramps**: Char 159 `#453D39` (lit facets), 160 `#35312D` (body), 161 `#242020` (south faces), 132 `#181818` (east faces, cracks); Ash 151 `#BEB2AE`, 150 `#CEC6BE`; Grain 158 `#514945`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A heap of five charred chunks of split wood, each 6–10 px long and 4–5 px thick, piled two on three, spanning columns 10–39 and rows 32–47 with the contact on rows 42–47. Each chunk is a short angular block: its top facet 159 with 160 micro-dithered in and 1-px 158 grain lines along its length, its south face 161, its east end 132 with a 132 crack across the top of the two largest; the upper two chunks sit 4 px up and left of the lower three. Nine single 151 pixels and three 150 pixels lie on the top facets and around the heap's foot as ash dust, and one 1-px 151 ring sits on the largest end as its dry bark. The outline is 147 on the lower and right silhouette only; rows 0–31, columns 0–9 and columns 40–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack (proposed 10) shows this one frame. The chain: Burn charcoal (2 logs → 3 charcoal, at the furnace, skill smelting; the furnace's first job), and Smelt an iron bar (2 iron ore, 1 charcoal → 1 iron bar) and Smelt a copper bar (2 copper ore, 1 charcoal → 1 copper bar) consume it at the furnace. Tags fuel, material.

#### Readability Check:
At zoom ⅓ the only black lump among the items, angular where the raw stone is a grey rounded speck and the firewood is warm brown.

Deliver: art/masters/charcoal.png (48×48, magenta background) + art/masters/charcoal.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$Item_Charcoal.png.

---

### bar_iron — Iron bar (AR-904)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: an ingot 8 px thick, so its top face sits 8 px up and left of its contact; the top is lit, the south face mid, the east face dark
- **Reference**: none in `art/u7_reference_squares/`; the stand-in it replaces is `!$U7_Item_MetalBar` in `game/img/characters/` (SHAPES.VGA metal-bar shape, a small grey bar; reference only, nothing copied ships)
- **Palette Ramps**: Iron 118 `#EFEFEF` (glint), 120 `#CECECE` (lit rim), 122 `#AEAEAE` (top face), 124 `#8E8E8E` (south face), 126 `#6D6D6D` (east face), 128 `#515151` (hammer marks, base line); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A cast ingot with slightly sloped sides, lying on its base. Its contact is a 24×6 rectangle on rows 42–47, columns 16–39; the bar is 8 px thick, so its top face is a 24×8 rectangle 8 px up and left at columns 8–31, rows 30–37, and the whole shape spans columns 8–39 and rows 30–47. The top face is 122 with 120 micro-dithered along its upper-left two edges and a 1-px 118 glint line on the upper edge, and three 128 hammer-mark dents of 2×1 px in a row down its middle; the south face is the 8-px band below the top face's lower edge, columns 10–37, in 124 with its ends cut on 45° diagonals (left end from (16, 47) up-left to (8, 39), right end from (39, 47) to (31, 39)), 1-px micro-dither of 124 into 126 on its lowest 2 rows; the east face is the 8-px parallelogram right of the top face in 126 with a 128 line at its base. The outline is 147 on the lower and right silhouette only; rows 0–29, columns 0–7 and columns 40–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one frame. The chain: Smelt an iron bar (2 iron ore, 1 charcoal, at the furnace, skill smelting) makes it; the smithy consumes it: Forge an iron dagger (1), Shaft a spear (1), Forge an iron axe (1), Forge a mace (2), Forge a short sword (2), Forge a long sword (3), Forge an iron helm (1), Forge an iron shield (2), Forge iron greaves (2), Forge iron mail (4), and Fletch arrows takes 1 for the heads; the smithy itself is built with 1 (proposed `build`). The catalog already has this item (`bar_iron`, "Iron bar"), so the delivery only switches its `image`.

#### Readability Check:
At zoom ⅓ a small light grey brick with straight edges, unlike the rounded grey stone and the copper bar's orange.

Deliver: art/masters/bar_iron.png (48×48, magenta background) + art/masters/bar_iron.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$Item_BarIron.png.

---

### bar_copper — Copper bar (AR-904)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the same ingot as the iron bar, 8 px thick, top lit, south mid, east dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` for the shape and the tinted `!$U7_Item_LeadOre` (copper ore) for the metal's colour; reference only, nothing copied ships
- **Palette Ramps**: Copper 34 `#FFBE7D` (glint), 36 `#FF9E3D` (lit rim), 39 `#E36D00` (top face), 41 `#A65100` (south face), 43 `#6D3500` (east face), 185 `#7D2D00` (hammer marks, base line); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The iron bar's silhouette pixel for pixel, so the two bars stack and sort alike: the contact on rows 42–47, columns 16–39, the top face at columns 8–31, rows 30–37, the whole shape on columns 8–39, rows 30–47. The top face is 39 with 36 micro-dithered along its upper-left two edges and a 1-px 34 glint line on the upper edge, three 185 hammer-mark dents down its middle; the south face 41 with 1-px micro-dither into 43 on its lowest 2 rows, its ends cut on the same 45° diagonals; the east face 43 with a 185 line at its base. The outline is 147 on the lower and right silhouette only; rows 0–29, columns 0–7 and columns 40–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack of up to 10 shows this one frame. The chain: Smelt a copper bar (2 copper ore, 1 charcoal, at the furnace, skill smelting) makes it; it is the softer metal, for the chain's copper variants of the dagger and spear head if the catalog adds them (a copper blade rolls its damage one die lower per the materials table) and for trade goods later. No recipe consumes it as of 2026-09-18.

#### Readability Check:
At zoom ⅓ a small orange brick, the only warm-metal item; the gold nugget is a yellow rounded lump.

Deliver: art/masters/bar_copper.png (48×48, magenta background) + art/masters/bar_copper.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$Item_BarCopper.png.

---

### leather — Leather (AR-904)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 18 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a tanned hide folded in half, 6 px thick, so its top face sits 6 px up and left of its contact; the top is lit, the south fold mid, the east fold dark
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `!$U7_Item_LeatherHide` stand-in in `game/img/characters/` (reference only, nothing copied ships); the raw `hide` (SEG-07) is the lobed fur pelt this is made from
- **Palette Ramps**: Grain side 138 `#AA8659` (lit), 139 `#9A7141` (top face), 140 `#8A5D2D` (south fold), 141 `#7D4D18` (east fold), 143 `#5D350C` (cut edge); Flesh side 135 `#DBCAB2`, 136 `#CAB292`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A sheet of tanned leather folded once, lying flat, its smooth grain side up and a strip of the paler flesh side showing at the fold's open edge. Its contact is a 24×6 rectangle with rounded corners on rows 42–47, columns 16–39; the fold is 6 px thick, so the top face is a 24×10 rectangle 6 px up and left at columns 10–33, rows 30–39, and the whole shape spans columns 10–39 and rows 30–47. The top face is 139 with 138 micro-dithered over its upper-left third and a faint 1-px 140 grain wrinkle every 5 px running down-right; its lower edge (the open edge of the fold) shows a 2-px strip of 135 with 136 dither, the flesh side of the lower half; the south fold face is the 6-px band below it, columns 12–37, in 140 with a 141 crease line on its second row; the east face is the 6-px band right of the top face in 141; the cut edges are a 1-px 143 line along the top face's upper-left two sides. The outline is 147 on the lower and right silhouette only; rows 0–29, columns 0–9 and columns 40–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack (proposed 5) shows this one frame. The chain: Tan a hide (1 hide → 1 leather, at the tanning rack, skill tanning; the rack's only job) makes it; it is consumed by Sew leather armor (3), Sew leather leggings (2), Sew a leather cap (1), Braid a sling (1), Bind a wooden shield (1), and by the smithy's lined pieces (helm, shield, greaves, mail: 1 each). Tags leather, material.

#### Readability Check:
At zoom ⅓ a flat tan rectangle with a pale stripe, straight-edged where the raw hide is a lobed blotch and the hide cloak is a taller block with a tuft.

Deliver: art/masters/leather.png (48×48, magenta background) + art/masters/leather.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$Item_Leather.png.

---

### feathers — Feathers (AR-904)
- **Category**: Item
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 34 px wide and 16 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: three feathers lying flat, each only 1 px thick, so almost all top face; the curl of each quill lifts its tip 2 px up and left
- **Reference**: none in `art/u7_reference_squares/`; the nearest is the `$U7_Chicken` stand-in in `game/img/characters/` (the fowl these come from); reference only, nothing copied ships
- **Palette Ramps**: Vane 148 `#EFEBE7` (lit), 150 `#CEC6BE` (lower half), 139 `#9A7141` (bars); Quill 2 `#F7E7A6`, 136 `#CAB292` (shade); Down 134 `#EBE3D7`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Three fowl feathers lying fanned on the ground, their quill ends together at the lower right and their tips spread up-left, together spanning columns 8–41 and rows 32–47. Each feather is 20–24 px long and 6 px wide: a 1-px quill of 2 (136 on its lower-right side) from the quill end at (40, 46), (38, 44) or (36, 42) running up-left to the tip, with a vane 2–3 px wide either side of it: 148 on the upper-left half of each vane, 150 on the lower-right half, a 1-px 139 bar across the vane every 3 px (the fowl's barring), and a tuft of 134 down 3 px long at the quill end; the vanes' tips are pointed and their edges have single-pixel notches. The three quill ends lie on the contact rows 42–47. The outline is 147 on the lower and right silhouette only; rows 0–31, columns 0–7 and columns 42–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: a stack (proposed 10) shows this one frame. It comes from hunts of `fowl`, `songbird` and `hawk` (yields per the chains catalog work, proposed 2, 1 and 2). The chain: Fletch arrows consumes 3 per twelve arrows at the fletcher's bench. Tags feather, material.

#### Readability Check:
At zoom ⅓ a small pale fan with dark flecks, lighter than the plant-fiber hank and flatter than the wool fleece.

Deliver: art/masters/feathers.png (48×48, magenta background) + art/masters/feathers.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$Item_Feathers.png.

---

## Workshops (AR-905): buildings, one square each

### furnace — Furnace (AR-905)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 44 px wide and 42 px tall unlit; the lit file's flame and smoke reach row 2, so 46 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a beehive dome of fitted stone 18 px tall, so its crown sits 18 px up and left of its footprint; the crown is lit, the south face (with the mouth) mid, the east face dark
- **Reference**: `art/u7_reference_squares/u7_boulder_48.png` (shape 342: a pale faceted mass leaning up-left with darker south and east facets, for the stone ramp) and `art/u7_reference_squares/u7_campfire_48.png` (shape 739, for the embers and flame); no furnace square exists; reference only, nothing copied ships
- **Palette Ramps**: Stones 121 `#BEBEBE` (crown), 123 `#9E9E9E` (south face), 126 `#6D6D6D` (east face), 128 `#515151` (joints, the mouth's rim); Clay daub 181 `#BE825D`, 182 `#AE653D` (shade); Inside 131 `#242424`; Contact 129 `#454545`; Flame (lit file) 250 `#FFD200` (core), 251 `#FFAE00`, 235 `#FF8E10` (tongues), 236 `#FF5100` (edges), 24 `#C20C1C` (embers); Smoke 160 `#35312D`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Unlit. The footprint is a circle 28 px across on the ground at columns 16–43, rows 20–47 (its near edge on row 47 with a 1-px 129 contact line under columns 22–38); the dome is 18 px tall, so its crown is a circle 20 px across centred 18 px up and left of the footprint's centre, at columns 4–23, rows 6–25, and the whole mass is the swept shape between them, spanning columns 4–43 and rows 6–47. The crown is 121 with 1-px 128 joint lines outlining fitted stones 5–7 px across and a chimney hole, a 6×4 oval of 131 with a 128 rim, at the crown's centre (columns 11–16, rows 14–17); the south face is the band from the crown's lower edge to the footprint's near edge in 123 with the same 128 joints and 1-px micro-dither of 123 into 126 on its lowest 3 rows; the east face is the right-hand band in 126 with 128 joints; the joints are filled with 181 clay daub (182 on the east face) so the stones read as set in clay. The mouth is an arch 10 px wide and 8 px tall on the south face at columns 26–35, rows 38–45, 131 inside with a 128 rim and two 24 ember pixels on its sill. The outline is 147 on the lower and right silhouette only; rows 0–5, columns 0–3 and columns 44–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
`furnace_lit` (the furnace while a smelt or a charcoal burn runs; the chains work adds it as a second object entry the way `campfire` gets its lit twin, and the engine switches the cell between the two when the craft starts and ends): a separate file with the same dome, the mouth filled with flame (a 250 core 4 px wide, a 251 body, 235 tongues licking 3 px above the arch with 236 edges, five 24 embers on the sill) and a 6-px flame tongue of 251 and 235 rising from the chimney hole with two detached 160 smoke pixels above it at rows 2–5 (nothing on row 0); the six stones round the mouth get a 251 pixel on their inner edge. Three frames side by side (the tongues shift 1–2 px between frames) as animations { "lit": [0, 1, 2] }. Unbuilt: the build designation marker (AR-035) with the build items lying on the cell (proposed `build`: 6 stone, work 200); no ghost sprite. Recipes at it (proposed): Burn charcoal, Smelt an iron bar, Smelt a copper bar; the crafter stands on a neighbouring cell (the furnace blocks movement). When its site is sacked its `ruin` is `rubble`; "dismantle" drops the stones back and removes it.

#### Readability Check:
At zoom ⅓ a grey dome with a dark spot, taller and rounder than the hearth's flat ring; lit, the only warm glow that sits inside a grey mound rather than in the open.

Deliver: art/masters/furnace.png (48×48, magenta background) + art/masters/furnace.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/furnace_lit.png (144×48: three 48×48 frames side by side, magenta background) + art/masters/furnace_lit.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0], "lit": [0, 1, 2] }); the export names are !$Furnace.png and !$Furnace_Lit.png.

---

### smithy — Smithy (AR-905)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 40 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: an iron anvil on a stone block; the block is 10 px tall and the anvil 6 px tall on top of it, so the anvil's face sits 16 px up and left of the block's footprint; tops lit, south faces mid, east faces dark
- **Reference**: `art/u7_reference_squares/u7_boulder_48.png` (shape 342, for the stone block's ramp); for the iron see the `!$U7_Item_MetalBar` stand-in in `game/img/characters/`; SEG-05's `workbench` brief is the same plate-on-post construction; reference only, nothing copied ships
- **Palette Ramps**: Block 121 `#BEBEBE` (top), 123 `#9E9E9E` (south face), 126 `#6D6D6D` (east face), 128 `#515151` (cracks); Anvil 120 `#CECECE` (face glint), 124 `#8E8E8E` (face), 126 `#6D6D6D` (south face), 128 `#515151` (east face, horn shade), 129 `#454545` (base); Hammer 141 `#7D4D18` (haft), 124 `#8E8E8E` (head); Tongs 128 `#515151`; Scale 131 `#242424`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The block is a squat stone 16×12 on the ground: its footprint is rows 36–47, columns 22–37 with a 129 contact line on row 47; it is 10 px tall, so its top face is the 16×12 rectangle at columns 12–27, rows 26–37 in 121 with one 128 crack, its south face the 10-px band below in 123 with its ends cut on 45° diagonals (left end from (22, 47) up-left to (12, 37), right end from (37, 47) to (27, 37)), its east face the 10-px parallelogram to the right in 126. The anvil stands on the block's top face: a body 14 px long and 6 px deep whose base sits on the block at columns 14–27, rows 30–35, 6 px tall, so its face (the top) is a 14×6 rectangle at columns 8–21, rows 24–29 in 124 with a 1-px 120 glint along its upper-left edge; the horn tapers from the face's left end to a point at (3, 26) in 124 with 128 on its underside; the heel is a 3-px step at the right end; the anvil's south face (rows 30–35) is 126 and its east face 128, with a 129 base line where it meets the block. A hammer lies on the block's top face beside the anvil: a 141 haft 8 px long from (22, 34) to (27, 30) with a 124 head 4×3 at its upper-left end; a pair of tongs of 128, 10 px long, leans against the block's south face at columns 30–33, rows 38–46; four 131 scale flakes lie on the ground at columns 38–41, rows 44–46 and two on the block's top. The outline is 147 on the lower and right silhouette of the block, the anvil and the tongs only; rows 0–23, columns 0–2 and columns 42–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: the smithy looks the same idle and in use (the smith stands on a neighbouring cell in the body's work frames; the ring of the hammer is a sound, not a sprite). Unbuilt: the build designation marker (AR-035) with the build items lying on the cell (proposed `build`: 2 stone, 1 log, 1 iron bar, work 150; the first bar must come from the furnace before a smithy can stand); no ghost sprite. Recipes at it (proposed): every "Forge" recipe of this segment and Shaft a spear. `ruin`: `rubble`; "dismantle" drops the items back. Blocks movement.

#### Readability Check:
At zoom ⅓ a grey block with a darker horned shape on top, squarer than the boulder and unlike the work stone's plain plate on a post.

Deliver: art/masters/smithy.png (48×48, magenta background) + art/masters/smithy.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$Smithy.png.

---

### bowyer_bench — Bowyer's bench (AR-905)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 45 px wide and 26 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a plank bench 8 px tall on two trestles, so its top sits 8 px up and left of its footprint; the top is lit, the plank edge (south face) mid, the east end dark
- **Reference**: none in `art/u7_reference_squares/`; SEG-05's `workbench` brief (a plate on a post) is the nearest construction, and the `!$U7_Item_WoodLog` stand-in in `game/img/characters/` the wood; reference only, nothing copied ships
- **Palette Ramps**: Planks 137 `#BA9A71` (top), 139 `#9A7141` (plank gaps), 140 `#8A5D2D` (south edge), 141 `#7D4D18` (east end); Trestles 143 `#5D350C`, 145 `#3D240C`; Stave 143 `#5D350C`, 141 `#7D4D18` (lit edge); Shavings 2 `#F7E7A6`, 136 `#CAB292`; Bow string 148 `#EFEBE7`; Drawknife 124 `#8E8E8E`, 141 `#7D4D18`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The bench's footprint is a 36×10 rectangle on rows 38–47, columns 8–43 with a 129 contact line under each trestle on row 47 (columns 10–15 and 36–41); two trestles of 143 with a 145 right strip, 6 px wide and 8 px tall, stand at the ends and slide up-left as they rise, so the bench top, three planks side by side, is a 36×10 rectangle at columns 0–35, rows 30–39: 137 with two 1-px 139 gaps along its length and a 140 south edge 2 px tall on rows 38–39 (its ends cut on the 45° diagonal), and a 141 east end 8 px wide right of the top. A stave being shaped lies along the top: a 3-px 143 bar with a 141 lit edge from (3, 32) to (30, 34), held at its left end by a 2-px 145 clamp; a scatter of nine 2 and 136 shaving curls of 2×1 px lies around it and three on the ground at columns 36–40, row 46; a drawknife (a 124 blade 8 px long with a 141 handle at each end) lies across the right end of the top at columns 24–33, rows 31–36. A finished bow leans against the bench's east end: its stave a 143 curve from (38, 24) down to (43, 44) bowed 3 px left at the middle, with a straight 148 string; its foot touches the ground at row 46. The outline is 147 on the lower and right silhouette of the bench, the trestles and the bow only; rows 0–23 and columns 44–47 stay magenta (the top's left end reaches column 0, which is allowed), and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: the same idle and in use (the bowyer stands on a neighbouring cell). Unbuilt: the build designation marker (AR-035) with the build items lying on the cell (proposed `build`: 2 logs, work 90); no ghost sprite. Recipes at it (proposed): Shape a short bow, Shape a long bow, Carve a club, Bind a wooden shield. `ruin`: `rubble`; "dismantle" drops the logs back. Blocks movement. The fletcher's bench (next brief) is the same bench with different things on it; the leaning bow is what tells this one apart.

#### Readability Check:
At zoom ⅓ a low tan plank with a thin curved line standing at its right end; the fletcher's bench has a row of upright sticks at its left end instead, and the work stone is grey.

Deliver: art/masters/bowyer_bench.png (48×48, magenta background) + art/masters/bowyer_bench.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$BowyerBench.png.

---

### fletcher_bench — Fletcher's bench (AR-905)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 44 px wide and 32 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the bowyer's bench (8 px tall, top up-left of the footprint) with a block of upright shafts on its left end that lean up-left along the projection
- **Reference**: none in `art/u7_reference_squares/`; this segment's `bowyer_bench` brief is the bench; the `!$U7_Item_StrawBundle` stand-in in `game/img/characters/` is the nearest for a bundle of shafts; reference only, nothing copied ships
- **Palette Ramps**: Planks 137 `#BA9A71` (top), 139 `#9A7141` (plank gaps), 140 `#8A5D2D` (south edge), 141 `#7D4D18` (east end); Trestles 143 `#5D350C`, 145 `#3D240C`; Shaft block 121 `#BEBEBE`, 123 `#9E9E9E`; Shafts 143 `#5D350C`; Fletching and feather heap 148 `#EFEBE7`, 150 `#CEC6BE`, 139 `#9A7141` (bars); Glue pot 139 `#9A7141`, 2 `#F7E7A6` (gloss); Knife 124 `#8E8E8E`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The bench is the bowyer's bench pixel for pixel: footprint rows 38–47, columns 8–43, trestles at the ends with 129 contact lines, the three-plank top at columns 0–35, rows 30–39 in 137 with 139 gaps, a 140 south edge and a 141 east end; without the stave, the shavings, the drawknife or the leaning bow. On the top's left end stands a stone block 10×6 at columns 2–11, rows 30–35 (121 top, 123 south face) drilled for shafts: twelve 1-px 143 shafts rise from it up-left along the lean, 10–14 px tall, to tips between row 16 and row 20, the four rearmost fletched with 3-px 148 vanes (150 on their lower halves) and the rest bare; a heap of loose feathers lies on the top's right half at columns 20–31, rows 31–37: six 148 and 150 vanes of 5×2 px lying at angles with one 139 bar each; a glue pot, a 4×4 block of 139 with a 2 gloss pixel, sits at columns 30–33, rows 32–35, and a small knife (a 124 blade 5 px long with a 143 handle) lies at columns 14–20, rows 34–36. The outline is 147 on the lower and right silhouette of the bench, the trestles and the block only; rows 0–15, columns 44–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: the same idle and in use (the fletcher stands on a neighbouring cell). Unbuilt: the build designation marker (AR-035) with the build items lying on the cell (proposed `build`: 2 logs, 1 stone, work 90); no ghost sprite. Recipe at it (proposed): Fletch arrows (1 log, 1 iron bar, 3 feathers → 12 arrows). `ruin`: `rubble`; "dismantle" drops the items back. Blocks movement.

#### Readability Check:
At zoom ⅓ a low tan plank with a tuft of upright dark sticks at its left end and a pale smudge on its right; the bowyer's bench has the curved bow at its right end instead.

Deliver: art/masters/fletcher_bench.png (48×48, magenta background) + art/masters/fletcher_bench.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$FletcherBench.png.

---

### tanning_rack — Tanning rack (AR-905)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 42 px wide and 24 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: an upright frame of two posts and two rails standing across the cell (its face to the south), 12 px tall, so its top rail sits 12 px up and left of the posts' feet; the posts' lit strips are on their left, their east sides dark; the laced hide is a flat sheet in the frame's plane
- **Reference**: none in `art/u7_reference_squares/`; the nearest are the `!$U7_Item_LeatherHide` stand-in in `game/img/characters/` for the hide and SEG-05's `wall_wood` brief for upright posts in this projection; reference only, nothing copied ships
- **Palette Ramps**: Posts and rails 141 `#7D4D18` (lit strip), 143 `#5D350C` (body), 145 `#3D240C` (east side); Cords 136 `#CAB292`; Hide (flesh side out) 135 `#DBCAB2` (lit), 136 `#CAB292` (body), 137 `#BA9A71` (shade), 139 `#9A7141` (edge); Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Two posts 3 px wide stand 26 px apart across the cell: their feet on the ground at columns 16–18 and 40–42, rows 44–47 (a 129 contact pixel under each), and each rises 12 px while sliding 12 px left, so their tops are at columns 4–6 and 28–30, row 32; each post is 141 on its left strip, 143 in the middle, 145 on its right strip. Two rails 3 px tall join the posts: the top rail on rows 32–34 from column 4 to column 30, the bottom rail on rows 42–44 from column 16 to column 42 (the bottom rail runs along the ground's slope, so the frame is a parallelogram with corners (4, 32), (30, 32), (42, 44), (16, 44)); rails share the posts' ramp, 141 on top, 143 body, 145 underside. Inside the frame a hide is stretched with its pale flesh side out, an irregular sheet 2 px inside the rails on every side, in 136 with 135 micro-dithered over its upper-left third and 137 over its lower-right third, a 139 line along its uneven edge; eleven 1-px 136 cords run from the hide's edge to the rails and posts every 4 px, each 2 px long. The outline is 147 on the lower and right silhouette of the posts and rails only; rows 0–31, columns 0–3 and columns 43–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
No second state in the engine: the hide in the frame is the rack's own look whether or not a hide is being tanned (the alternative, an empty frame, would read as a fence piece). Unbuilt: the build designation marker (AR-035) with the build items lying on the cell (proposed `build`: 2 logs, 2 plant fiber, work 80); no ghost sprite. Recipes at it (proposed): Tan a hide (1 hide → 1 leather), Sew a leather cap, Sew leather leggings, Sew leather armor, Braid a sling. `ruin`: `rubble`; "dismantle" drops the items back. Blocks movement.

#### Readability Check:
At zoom ⅓ a pale tan square held in a dark frame, the only building with a light patch standing up; the weapon rack is the same frame with dark and grey slivers in it instead.

Deliver: art/masters/tanning_rack.png (48×48, magenta background) + art/masters/tanning_rack.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export name is !$TanningRack.png.

---

### weapon_rack — Weapon rack (AR-905)
- **Category**: Building
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 42 px wide and 24 px tall empty, 30 px tall full (the spear rises to row 20)
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the tanning rack's upright frame (two posts, two rails, 12 px tall, its top up-left of its feet) with pegs on the top rail; the weapons hang in the frame's plane
- **Reference**: none in `art/u7_reference_squares/`; this segment's `tanning_rack` brief is the frame and its weapon briefs are the shapes hung on it; the `!$U7_Item_MetalBar` stand-in in `game/img/characters/` for the iron; reference only, nothing copied ships
- **Palette Ramps**: Posts and rails 141 `#7D4D18` (lit strip), 143 `#5D350C` (body), 145 `#3D240C` (east side); Pegs 139 `#9A7141`; Hung wood 143 `#5D350C`, 141 `#7D4D18`; Hung iron 120 `#CECECE`, 124 `#8E8E8E`, 118 `#EFEFEF` (glint); Bow string 148 `#EFEBE7`; Contact 129 `#454545`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Empty. The frame is the tanning rack's pixel for pixel: posts 3 px wide with feet at columns 16–18 and 40–42, rows 44–47 and tops at columns 4–6 and 28–30, row 32; the top rail on rows 32–34 from column 4 to column 30 and the bottom rail on rows 42–44 from column 16 to column 42; 141 lit strips, 143 bodies, 145 east sides, a 129 contact pixel under each foot. Four pegs of 139, 2 px wide and 3 px tall, stand up from the top rail at columns 8, 14, 20 and 26 (rows 29–31), and the space inside the frame is empty (magenta), so the ground shows through. The outline is 147 on the lower and right silhouette of the posts, rails and pegs only; rows 0–28, columns 0–3 and columns 43–47 stay magenta, and nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
`weapon_rack_full` (the rack holding weapons; the chains work adds it as a second object entry, and the engine switches a rack's cell to it when a weapon is stored on the rack and back when the last one is taken): a separate file with the same frame and four weapons in it: a spear leaning in the frame from the bottom rail at (20, 43) up-left past the top rail to its 120 head at (8, 20) (the only part above the frame), a short sword hanging point-down from the second peg (its 124 guard at columns 12–17, row 32, its 120 blade to row 41), an iron axe hanging from the third peg by its haft with its 124 head at columns 21–27, rows 34–39, and a short bow leaning at the right end from (36, 43) to (29, 33) with a 148 string; the weapons are drawn in the frame's open space and behind the top rail where they pass it. Unbuilt: the build designation marker (AR-035) with the build items lying on the cell (proposed `build`: 2 logs, work 60); no ghost sprite. No recipe at it: it stores made weapons for the militia (the arming step of the society plan, WORLD_ARCHITECTURE §2.10) so soldiers take them from it. `ruin`: `rubble`; "dismantle" drops the logs and any stored weapons. Blocks movement.

#### Readability Check:
At zoom ⅓ an empty dark frame standing up (the ground shows through it), unlike the tanning rack's pale patch; full, a dark frame with grey and brown slivers in it.

Deliver: art/masters/weapon_rack.png (48×48, magenta background) + art/masters/weapon_rack.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); and art/masters/weapon_rack_full.png (48×48, magenta background) + art/masters/weapon_rack_full.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }); the export names are !$WeaponRack.png and !$WeaponRack_Full.png.

---

## Combat effects (AR-906): the engine's code-drawn placeholders, to be replaced

The engine names these files itself (`docs/handoffs/HANDOFF_combat_gear.md` §1.5); the ids below are brief ids, not catalog ids, and the code-drawn placeholders `UF_GenHit`, `UF_GenArrow` and `UF_GenBlood` stand in until the files land.

### ui_fx_hit — Hit flash (AR-906)
- **Category**: Effect (fx layer)
- **Dimensions**: a sheet of three 48×48 frames side by side, 144×48; the flash is 12 px across in frame 0, 20 px in frame 1, and frame 2 is six loose sparks within a 24×24 area
- **Anchor**: bottom-centre of the cell `[24, 47]` (the struck unit's anchor; the flash is placed at chest height of the body that stands on it)
- **Projection**: none: a flat burst of light with no faces, drawn in the plane of the screen over the struck sprite; it does not lean
- **Reference**: none in `art/u7_reference_squares/`; the nearest thing drawn is the campfire's flame in `art/u7_reference_squares/u7_campfire_48.png` (shape 739) for the flame ramp's use; today `UF_GenHit` (a code-drawn white star) is the placeholder; reference only, nothing copied ships
- **Sheet**: one row for every facing (the flash is the same from every side); animations { "hit": [0, 1, 2] }; layer `fx`, composed last, over the held layer
- **Palette Ramps**: Core 15 `#FFFFFF`; Rays 249 `#FFFF00`, 250 `#FFD200`; Sparks 251 `#FFAE00`, 235 `#FF8E10`; no outline; background `#FF00FF`.

#### Primary State Visual Description:
Frame 0: a six-pointed star 12 px across centred at (20, 26), the chest of the south stand body (the body's shoulders are at row 22, columns 8–24, and the flash sits over the upper torso): a 4×4 core of 15 with six 4-px rays of 249 at 60° steps, the two vertical rays 1 px wide and the four diagonal rays stepped 1 px at a time. Frame 1: the same star grown to 20 px across, the core 6×6 of 15, the rays 7 px long in 249 with their outer 2 px in 250, and four 1-px 250 pixels between the rays 8 px from the centre. Frame 2: no core; six sparks of 1–2 px in 251 and 235 scattered 8–12 px from (20, 26) along the ray directions, drifting 1–2 px outward from frame 1's ray tips. Everything else in each frame is magenta; the flash never touches row 0 or column 47. The engine plays the three frames over three consecutive map frames (or one per beat step at slow speeds), so the flash is one blink, then gone.

#### Interaction / Transformed State Description:
Drawn once on the target's sprite when a melee attack or a projectile hits (the moment the attacker's strike frame lands); a miss draws nothing. The same sheet is drawn tinted by the engine for a critical hit (a natural 20: the frames play twice) and is never drawn under fog. No other state.

#### Readability Check:
At zoom ⅓ a single yellow-white blink on a figure, brighter than anything on the map for a moment, so a fight is seen from across the screen.

Deliver: art/masters/ui_fx_hit.png (144×48: three 48×48 frames side by side, magenta background) + art/masters/ui_fx_hit.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0], "hit": [0, 1, 2] }, layer "fx"); the export name is $UF_fx_hit.png.

---

### ui_fx_arrow — Arrow in flight (AR-906)
- **Category**: Effect (projectile)
- **Dimensions**: a sheet of 48×48 frames, 96×192 (2 columns × 4 rows: column 0 the arrow, column 1 the sling stone; rows S, W, E, N); the arrow is 25 px long and 3 px wide, the stone 4×4
- **Anchor**: bottom-centre of the cell `[24, 47]` (the cell the projectile is passing over; the projectile itself is drawn 12 px up and left of the cell's ground centre, its flight height)
- **Projection**: U7 2.5D oblique: the arrow flies 3 units above the ground, so it is drawn 12 px up and left of the centre of the cell it crosses; a south-flying arrow points down the screen, a north-flying one up, east right, west left (the flight direction lies flat, so it is not transposed)
- **Reference**: none in `art/u7_reference_squares/`; this segment's `arrows` brief is the same arrow; today `UF_GenArrow` (a code-drawn line) is the placeholder; reference only, nothing copied ships
- **Sheet**: rows S, W, E, N are the flight direction (row 0 flying south, row 1 west, row 2 east, row 3 north, RPG Maker's order); column 0 the arrow, column 1 the stone; animations { "arrow": [0], "stone": [1] }
- **Palette Ramps**: Shaft 143 `#5D350C`; Head 120 `#CECECE`, 124 `#8E8E8E`, 118 `#EFEFEF` (glint); Fletching 148 `#EFEBE7`, 150 `#CEC6BE`, 139 `#9A7141` (bar); Stone 122 `#AEAEAE`, 126 `#6D6D6D`; no outline; background `#FF00FF`.

#### Primary State Visual Description:
Row 0 (flying south), column 0: a vertical arrow centred at (14, 14): a 1-px 143 shaft at column 14 from row 2 to row 26; the head at the lower end, a 3-px-wide point of 120 on rows 24–27 with a 124 pixel on its right side and a 118 glint at the tip (27); the fletching at the upper end, two 148 vanes 2 px wide and 5 px tall either side of the shaft on rows 3–7 with 150 on their lower pixels and one 139 bar each; the nock a 143 pixel on row 2. Row 3 (north): the same arrow with the head at the top (rows 2–5, tip at row 2) and the fletching at the bottom (rows 21–25). Row 1 (west): the arrow lying along row 14 from column 2 to column 26, the head at the left end (columns 2–5) and the fletching at the right end (columns 21–25, vanes above and below the shaft). Row 2 (east): the same with the head at the right end (columns 23–26) and the fletching at the left (columns 3–7). Column 1, every row: a rounded 4×4 stone at columns 12–15, rows 12–15 in 122 with 126 on its lower-right two pixels and a 118 glint at its upper-left. Everything else is magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
The engine draws the arrow frame of the flight direction on each cell between the archer and the target as the shot advances (one cell per map frame at ×1, so the flight is seen), then removes it: a hit plays the hit flash on the target, a miss drops an `arrows` item (stack 1) on the cell where the arrow stopped. The stone frame is used the same way for the sling (and for a thrown spear or dagger until those have their own frames). No other state.

#### Readability Check:
At zoom ⅓ a dark 1-px streak with a pale tip crossing the cells between two figures; the stone is a grey speck.

Deliver: art/masters/ui_fx_arrow.png (96×192: 2 columns × 4 rows of 48×48 frames, magenta background) + art/masters/ui_fx_arrow.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "arrow": [0], "stone": [1] }, layer "fx"); the export name is $UF_fx_arrow.png.

---

### ui_fx_blood — Blood spatter (AR-906)
- **Category**: Effect (ground decal)
- **Dimensions**: a sheet of three 48×48 frames side by side, 144×48: a splat 14 px across, a smear 24 px long, a trail of three drops
- **Anchor**: bottom-centre of the cell `[24, 47]` (the cell the struck unit stood on; the decal is drawn under units and items like an `under` object)
- **Projection**: flat: a stain on the ground seen from above, no lean and no faces
- **Reference**: none in `art/u7_reference_squares/`; today `UF_GenBlood` (a code-drawn red blot) is the placeholder; the ember and meat ramps of `art/u7_reference_squares/u7_campfire_48.png` and SEG-07's `meat_raw` are the nearest uses of these reds; reference only, nothing copied ships
- **Sheet**: three variants as columns; the engine picks one by the hit's damage (splat for a wound, smear for a heavy blow, drops for bleeding each beat); animations { "splat": [0], "smear": [1], "drops": [2] }
- **Palette Ramps**: Blood 21 `#FF394D` (fresh rim), 24 `#C20C1C` (body), 26 `#8A040C` (centre), 28 `#510000` (darkest pool); no outline; background `#FF00FF`.

#### Primary State Visual Description:
Frame 0 (splat): an irregular blot 14 px across centred at (24, 30) on the cell's ground, its body 24 with a 26 centre 6 px across and two 28 pixels in the middle, its edge ragged with 1–2 px lobes and a 21 pixel on three of the lobes' upper-left sides, and five loose drops of 1–2 px in 24 scattered 4–8 px from the blot. Frame 1 (smear): a streak 24 px long and 6–8 px wide from (10, 26) to (34, 38) (the way a blow from the north-west throws blood), 24 with a 26 core line along its length and 28 where it starts, its trailing end broken into three 24 flecks. Frame 2 (drops): three round drops of 3, 2 and 2 px in 24 with 26 centres at (18, 28), (25, 34) and (30, 40), the bleeding trail of a wounded unit walking. Everything else is magenta; nothing touches row 0 or column 47.

#### Interaction / Transformed State Description:
Drawn on the ground of the struck unit's cell under units and items (z = footY − 100, like `under` objects) when a hit causes bleeding (a DF-style wound: damage above the body part's threshold), and one drop frame per beat on the cells a bleeding unit walks over; the decals fade at the next dawn (the engine's timer; the art has no fade frames, the engine lowers the sprite's opacity). Not an object: it is never in the catalog and cannot be picked, so nothing lies on it.

#### Readability Check:
At zoom ⅓ a small dark red patch on the ground where a fight was, distinct from berries (bright red dots on a green mound) and raw meat (a red lump with a pale knob).

Deliver: art/masters/ui_fx_blood.png (144×48: three 48×48 frames side by side, magenta background) + art/masters/ui_fx_blood.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0], "splat": [0], "smear": [1], "drops": [2] }, layer "fx"); the export name is !$UF_fx_blood.png.
