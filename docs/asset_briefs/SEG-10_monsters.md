# Segment 10: monsters (written 2026-09-18 by Claude Code)

The six dangerous creatures of `wildlife.species` in `game/data/UF_WorldCatalog.json`: the giant spider (kind `predator`) and the five of kind `monster` (troll, bog horror, sand stalker, restless dead, ice wraith). Today all six are drawn from three shared stand-in sheets told apart by a colour tint; each gets its own original sheet here. Facts about states, yields, regions and stance squares come from the catalog and the three shared-sheet rows under Creatures in `docs/ASSET_INVENTORY.md`; nothing else is promised.

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares, every frame inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1). No 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up, 1 px left per unit of height); the top, south and east faces are visible; the feet or leg tips sit in the bottom-right region of the square (`docs/GUIDE_25D.md`). West and east facings are transposed (x/y swap), never mirrored; north is the back view.
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for ≤ 32 colours per asset; 1-px micro-dither is welcome; no gradients and no anti-aliasing against the background.
4. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0 or 255 after cleaning, no baked ground shadow (the engine draws shadows), plus `art/masters/<id>.json` per AR-600 (frameWidth 48, frameHeight 48, anchor [24, 47], facings, animations).
5. Open the reference named in each brief before drawing. Only the giant spider has a recorded stand-in shape (`docs/STATUS.md` → Stand-ins); the other five have no counterpart in `art/u7_reference_squares/`, so each brief names the nearest reference for the lean and the shading. References are references: nothing copied from them ships; every delivered frame is original work in that manner.
6. Generic fantasy only: the catalog's names are the only names; no creatures or terms owned by another game or rulebook; no lore invented in the art (no runes, banners or emblems).
7. Stance squares: the five `monster` species stand on a red square in play (`UF_Stance`, VISION V32), so no red bodies or red markings on them; the giant spider stands on a yellow square and may keep small red eye pixels.
8. Contained: nothing touches the top edge (row 0) or the right edge (column 47); the anchor is the bottom centre of the cell, [24, 47], the same pixel in every frame of the sheet.
9. Sheets: AR-600 body layer, rows S, W, E, N; columns stand, walk ×3, attack ×3, hurt (8 columns of 48×48). Today's engine reads only stand and walk (the 3-column walk sheets); the attack and hurt columns are for the on-map combat of VISION V45 (AR-600 renderer, next build) and monsters only wander in the current build, so deliver stand and walk first and leave any column you cannot finish transparent rather than inventing it.
10. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated), then export by copying the approved sheet unchanged into `game/img/characters/` under the name the catalog's `image` field uses, or set that field to the new name (`docs/ART_STANDARD.md` §5, no scaling; Gemini may edit the `wildlife.species` list for this).
11. Mark the request row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name (AR-401 for the giant spider, AR-402 for the other five); the user approves each asset before it ships (`art/APPROVALS.md`).
12. Verify a brief you edit with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-10_monsters.md`; every FAIL must be fixed before reporting.

---

### giant_spider — Giant spider (AR-401)
- **Category**: Wildlife (kind `predator`)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 40 px wide and 30 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the leg tips stand in the bottom-right region and the body rises up-left at 45° (1 px up and 1 px left per unit of height); the top of the abdomen is lit, the south face mid, the east side and the underside dark
- **Reference**: the `$U7_CaveSpider` stand-in sheet in `game/img/characters/` (SHAPES.VGA shape 865 per `docs/STATUS.md` → Stand-ins; 3 columns × 4 rows of 48×48); there is no square for it in `art/u7_reference_squares/`, and the nearest square for the lean of a low animal is `art/u7_reference_squares/u7_hare_48.png` (shape 811). Reference only, nothing copied ships.
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns stand, walk ×3, attack ×3, hurt; this brief is the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view (the abdomen nearest the viewer, the head hidden behind it).
- **Palette Ramps**: Body 129 `#454545` (lit crown of the abdomen), 130 `#353535`, 131 `#242424` (south faces), 132 `#181818` (east faces, underside); Sheen and joints 128 `#515151`, 126 `#6D6D6D` (1-px hair ticks, leg knuckles); Eyes 23 `#DF1428` (cluster), 21 `#FF394D` (one catchlight); Fangs 134 `#EBE3D7`; Silhouette 133 `#080808` (in place of the usual 147, which would be lighter than this body); background `#FF00FF`.

#### Primary State Visual Description:
Eight legs, 2 px thick in 130 with a 131 strip on each leg's lower and right edge and a 128 knuckle pixel at every bend, spread 40 px wide (columns 4–43): the rear pair's tips touch row 47 at columns 36–43, the two middle pairs end on rows 45–46 between columns 8 and 34, and the front pair reaches down to row 46 at columns 14–20 and 26–32. The head (cephalothorax) is a 12×10 oval on rows 30–40, columns 18–30, lifted 7 px above the leg tips and so shifted 7 px left: its top in 130, its south face in 131, its east side in 132, with a cluster of five 23 eye pixels and one 21 pixel on rows 33–35, columns 22–28, and two 3×2 fangs of 134 hanging from its south edge at row 41, columns 21–23 and 26–28. The abdomen is a 20×16 bulb up-left of the head on rows 18–34, columns 6–26, its crown in 129 with 1-px micro-dither into 130 across the upper-left third, 131 on the south face, 132 on the lower-right and the underside, and 1-px ticks of 128 and 126 along its upper-left rim for hair sheen. The outline is 133 only along the lower and right silhouette (the undersides of the legs, the right-hand legs and the east edge of the abdomen); the lit upper-left rim has no outline. Rows 0–17 and columns 44–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
No carcass frame is used by the engine: "Hunt giant spider" (right-click; `hunt.work` 160; it never flees) removes the unit and drops 1 raw meat (`meat_raw`) on its cell as an item icon (the item's own brief owns that file). A colonist chooses it as prey on its own only with bravery ≥ 60; otherwise a designation sends one. It stands on a yellow stance square (kind `predator`, not `monster`), lives in herds of 1–2, and is placed only in regions of savagery `wild` or above (tropical moist forest, tropical swamp, mountain, conifer forest). The `attack` and `hurt` columns play on the map once the AR-600 renderer lands (V45); in the current build it only wanders.

#### Readability Check:
At zoom ⅓ a black, wide, many-legged blot on a yellow square, lower and rounder than any four-legged animal and the opposite in value of the pale sand stalker on its red square.

Deliver: art/masters/giant_spider.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/giant_spider.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [4, 5, 6], "hurt": [7] }).

---

### troll — Troll (AR-402)
- **Category**: Wildlife (kind `monster`)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn figure is 38 px wide and 44 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the figure stands on its feet in the bottom-right region and leans up-left at 45° (1 px up and 1 px left per unit of height); the top of the head and the left shoulder are lit, the front (south) mid, the right (east) side of every limb dark
- **Reference**: none: no square in `art/u7_reference_squares/` and no entry in `docs/STATUS.md` → Stand-ins. The `$U7_Troll` stand-in sheet in `game/img/characters/` (its sidecar says SHAPES.VGA shape 532) shows a winged beast, not a troll, so do not follow it. Nearest references: `art/u7_reference_squares/u7_ranger_south_48.png` (shape 460) for the stance and lean of a standing humanoid, drawn a third bigger in every dimension, and `art/u7_reference_squares/u7_boulder_48.png` (shape 342) for how a lumpy hide is faceted and dithered. Reference only, nothing copied ships.
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns stand, walk ×3, attack ×3, hurt; this brief is the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view (the mane down the spine, no face).
- **Palette Ramps**: Hide 150 `#CEC6BE` (lit crown, left shoulder), 152 `#AEA29A`, 154 `#8E8279` (south faces), 156 `#6D615D` (east faces), 158 `#514945` (creases, under the jaw); Mane and brow 143 `#5D350C`, 145 `#3D240C`; Loincloth 139 `#9A7141`, 141 `#7D4D18`; Tusks and nails 134 `#EBE3D7`; Eyes 5 `#EFCA28`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Feet: two splayed 8×4 slabs of 156 on rows 44–47 at columns 24–31 and 34–41, each with three 134 nail pixels on its front edge and a 147 contact line on row 47. The legs, 7 px thick, climb 10 px while sliding 10 px left to hips at row 34, columns 14–32, where a loincloth of 139 with 141 folds hangs from row 30 to row 38. The torso is barrel-chested and stooped: it widens to shoulders at row 16, columns 4–28 (24 px, wider than the hips), and the arms, 6 px thick, hang from them to a left fist at rows 34–38, columns 4–10 and a right fist at rows 38–42, columns 36–42, knuckles as 1-px ticks of 134. The head is small, a 10×10 lump on rows 6–16, columns 8–18, sunk between the shoulders with no neck: a brow ridge of 145 with a 143 mane running back over the crown, two 5 eye pixels at row 11, columns 11 and 15, and two 134 tusks rising from the lower jaw at row 14, columns 10 and 16. Shading: the crown and the left shoulder in 150, the chest and belly in 152 with 1-px micro-dither into 154 across the belly and the fronts of the thighs, the east side of each limb and the whole right flank in 156, creases at the elbows, under the jaw and between the toes in 158. The outline is 147 along the right and lower silhouette only. Rows 0–5, columns 0–3 and columns 43–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
No carcass frame is used by the engine: "Hunt troll" (right-click; `hunt.work` 400, the longest hunt with the bog horror's; it never flees) removes the unit and drops 4 raw meat (`meat_raw`) and 2 hide (`hide`) on its cell as item icons (their own briefs own those files). Colonists never pick a `monster` as prey on their own; only a designation sends one. It stands on a red stance square, wanders alone (herd 1–1), and is placed only in regions of savagery `wild` or above (mountain, taiga, badland, conifer forest), one group at each lair site. The `attack` and `hurt` columns play on the map once the AR-600 renderer lands (V45); in the current build it only wanders.

#### Readability Check:
At zoom ⅓ a broad grey-tan upright hulk on a red square, twice the bulk of a person, with no green in it; the bog horror is green and hunched, the restless dead thin and white.

Deliver: art/masters/troll.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/troll.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [4, 5, 6], "hurt": [7] }).

---

### bog_horror — Bog horror (AR-402)
- **Category**: Wildlife (kind `monster`)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn figure is 40 px wide and 34 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: a hunched mass standing on flat feet in the bottom-right region, its back rising up-left at 45° (1 px up and 1 px left per unit of height); the crown of the back is lit, the front (south) mid, the east side and the underside of the arms dark
- **Reference**: none: no square in `art/u7_reference_squares/` and no entry in `docs/STATUS.md` → Stand-ins. Today the engine draws the `$U7_Troll` sheet for it, tinted by the catalog's `tint` field (a pale swamp green) only to tell the two species apart; the tint goes when this file lands. The unused `$U7_BogHorror.png` in `game/img/characters/` is a 2×2-cell many-headed beast from an earlier extraction, contrary to V44: do not follow it. Nearest references: the troll brief above for the mass of a heavy humanoid, and `art/u7_reference_squares/u7_berry_bush_48.png` (shape 672) for how wet leaf-and-weed clumps are dithered. Reference only, nothing copied ships.
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns stand, walk ×3, attack ×3, hurt; this brief is the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view (weed hanging down the back, no eyes).
- **Palette Ramps**: Weed-hide 168 `#71864D` (lit crown of the back), 169 `#5D7139`, 170 `#4D5D28` (front), 172 `#39451C` (east faces), 174 `#283114` (under the arms, the mouth); Slime 201 `#86B200`, 202 `#7D9600` (1-px wet dots); Mud 145 `#3D240C`, 143 `#5D350C` (shins, forearms); Eyes 233 `#FFEF41`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Two wide flat feet of 145 sit on rows 44–47 at columns 20–28 and 30–38 with a 147 contact line; short legs 8 px thick climb only 6 px while sliding 6 px left to a squat body on rows 14–40, columns 6–36 (30 px wide, 26 px tall) that is hunched so the crown of the back at row 14, columns 8–22 is the highest point and there is no neck. The head is a 12×8 lump on rows 18–26, columns 4–16, pushed forward and down at the front-left, with a 174 mouth slit 8 px long on row 24 and two 233 eye pixels at row 20, columns 7 and 12. The arms are long, 7 px thick, and hang from the shoulders to knuckles on the ground: the left at rows 40–44, columns 8–14, the right at rows 40–44, columns 38–43. Strands of weed 1–3 px long in 169 and 170 hang from the shoulders, elbows and chin over the body; the back's crown is 168 with 1-px 201 slime dots along it, the front 169 with 1-px micro-dither into 170, the east side of every limb 172, the undersides of the arms and the mouth 174, and 202 dots along the upper-left edge of each arm; the shins and forearms below row 36 are mud in 145 dithered up into 143. The outline is 147 along the lower and right silhouette only. Rows 0–13, columns 0–3 and columns 44–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
No carcass frame is used by the engine: "Hunt bog horror" (right-click; `hunt.work` 400; it never flees) removes the unit and drops nothing (the catalog gives it no `yields`). Colonists never pick a `monster` as prey on their own; only a designation sends one. It stands on a red stance square, wanders alone (herd 1–1), and is placed only in regions of savagery `primeval` (temperate and tropical swamp, salt marsh, mangrove), one group at each lair site. The `attack` and `hurt` columns play on the map once the AR-600 renderer lands (V45); in the current build it only wanders.

#### Readability Check:
At zoom ⅓ a hunched green mass wider than it is tall on a red square in a swamp; the troll is grey and upright, and no bush moves or stands on a red square.

Deliver: art/masters/bog_horror.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/bog_horror.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [4, 5, 6], "hurt": [7] }).

---

### sand_stalker — Sand stalker (AR-402)
- **Category**: Wildlife (kind `monster`)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn animal is 42 px wide and 33 px tall (the raised tail makes the height)
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the leg tips stand in the bottom-right region and the low body rises up-left at 45° (1 px up and 1 px left per unit of height), the curled tail climbing further up the lean; the top of the carapace is lit, the south faces mid, the east faces and the underside dark
- **Reference**: none: no square in `art/u7_reference_squares/` and no entry in `docs/STATUS.md` → Stand-ins. Today the engine draws the `$U7_CaveSpider` sheet (shape 865) for it, tinted by the catalog's `tint` field (a pale sand yellow) only to tell the two species apart; the tint goes when this file lands. Nearest references: the giant spider brief above for the leg layout, and `art/u7_reference_squares/u7_ironstone_48.png` (shape 341) for the pale, sandy top shading. Reference only, nothing copied ships.
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns stand, walk ×3, attack ×3, hurt; this brief is the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view (the tail's barb nearest the viewer, the eyes hidden).
- **Palette Ramps**: Carapace 2 `#F7E7A6` (lit crown), 3 `#F3DF79`, 136 `#CAB292` (south faces), 137 `#BA9A71` (east faces, tail rings), 138 `#AA8659` (underside); Markings 141 `#7D4D18`, 145 `#3D240C` (chevrons); Eyes 133 `#080808`; Barb and silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Eight legs, 2 px thick in 136 with a 137 strip on each lower and right edge, spread 42 px wide (columns 4–45) and flatter than the giant spider's: the rear pair's tips touch row 47 at columns 38–45, the middle pairs end on rows 45–46 between columns 6 and 36, and the front pair reaches row 46 at columns 16–22 and 28–34. The head is a low 12×8 oval on rows 36–44, columns 20–32, lifted only 4 px above the leg tips, its top in 3, its south face in 136, its east side in 137, with a row of four 133 eye pixels on row 37, columns 22–28; two forelimbs 3 px thick reach out from its sides to raised claws, the left on rows 36–40, columns 10–16 and the right on rows 38–42, columns 34–40, each claw a 2-px pincer in 136 with a 147 tip. The abdomen is an 18×10 plate up-left of the head on rows 28–38, columns 6–24, its crown in 2 with 1-px micro-dither into 3, its south face 136, its east side 137, its underside 138, crossed by four 1-px chevrons of 145 edged with 141. From the abdomen's rear at row 28, column 10 a segmented tail 3 px thick (136 with a 137 ring every 3 px) curls up and over the back to a crest on row 15, columns 12–22, ending in a 147 barb 3 px long pointing down at row 18, column 22. The outline is 147 along the lower and right silhouette only. Rows 0–14 and columns 46–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
No carcass frame is used by the engine: "Hunt sand stalker" (right-click; `hunt.work` 200; it never flees) removes the unit and drops nothing (the catalog gives it no `yields`). Colonists never pick a `monster` as prey on their own; only a designation sends one. It stands on a red stance square, lives in groups of 1–2, and is placed only in regions of savagery `wild` or above in sand and rock desert, one group at each lair site. The `attack` and `hurt` columns play on the map once the AR-600 renderer lands (V45); in the current build it only wanders.

#### Readability Check:
At zoom ⅓ a pale, flat, many-legged shape with a raised dark-tipped tail on a red square in the desert, the opposite in value of the black giant spider on yellow; the dark chevrons and the barb keep it from vanishing into the sand.

Deliver: art/masters/sand_stalker.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/sand_stalker.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [4, 5, 6], "hurt": [7] }).

---

### restless_dead — Restless dead (AR-402)
- **Category**: Wildlife (kind `monster`, alignment `cursed`)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn figure is 33 px wide and 40 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: the figure stands on its feet in the bottom-right region and leans up-left at 45° (1 px up and 1 px left per unit of height); the crown of the skull and the left shoulder are lit, the front (south) mid, the right (east) side of every bone dark
- **Reference**: none: no square in `art/u7_reference_squares/` and no entry in `docs/STATUS.md` → Stand-ins. The `$U7_Skeleton` stand-in sheet in `game/img/characters/` (its sidecar says SHAPES.VGA shape 528) shows the stance of a walking skeleton; the nearest square for the human lean is `art/u7_reference_squares/u7_townsman_south_48.png` (shape 265). Reference only, nothing copied ships.
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns stand, walk ×3, attack ×3, hurt; this brief is the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view (the spine and the back of the skull, no sockets).
- **Palette Ramps**: Bone 148 `#EFEBE7` (lit crown, left shoulder), 149 `#DFD7D2`, 150 `#CEC6BE` (south faces), 152 `#AEA29A` (east faces), 154 `#8E8279` (between the ribs); Sockets and mouth 223 `#181010`; Grave rags 221 `#352D24`, 219 `#514139`; Rust on the belt 183 `#9E5124`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
Feet: two 5×3 bony shapes of 150 on rows 45–47 at columns 27–31 and 34–38 with a 147 contact line. Shin and thigh bones 3 px wide (149 with a 152 strip on the right) and a 1-px 223 gap at each knee climb 12 px while sliding 12 px left to a pelvis of 150 on rows 32–35, columns 16–28, belted by a 1-px 219 strip with one 183 buckle pixel; a 2-px spine of 149 rises to a ribcage of seven 1-px ribs in 149 and 150 with 154 between them on rows 20–31, columns 10–26, under collarbones at row 20. Arm bones 3 px wide hang from the shoulders, the left to a hand at rows 34–37, columns 6–10 and the right to rows 36–39, columns 30–34, with fingers as 1-px 150 ticks. The skull is a 10×11 oval on rows 8–19, columns 6–16: crown 148, face 149, right side 152, two 3×3 sockets of 223 on rows 12–14 at columns 8 and 13, and a 223 mouth line on row 17 with 148 teeth ticks. A torn rag of 221 with 219 edges hangs over the left shoulder and across the hips from row 30 to row 40, with 1-px dithered holes showing bone through it. The outline is 147 along the lower and right silhouette only. Rows 0–7, columns 0–5 and columns 39–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
No carcass frame is used by the engine: "Hunt restless dead" (right-click; `hunt.work` 200; it never flees) removes the unit and drops 3 bone (`bone`) on its cell as item icons (the item's own brief owns that file). Colonists never pick a `monster` as prey on their own; only a designation sends one. It stands on a red stance square, roams in groups of 2–4 (the largest monster group), and is placed only in regions of alignment `cursed` (temperate grassland, broadleaf forest, shrubland, badland, swamp, mountain), one group at each lair site. The `attack` and `hurt` columns play on the map once the AR-600 renderer lands (V45); in the current build it only wanders.

#### Readability Check:
At zoom ⅓ a thin bone-white upright figure on a red square, the only white humanoid; the ice wraith is bluer, taller and has no legs, the troll broad and grey.

Deliver: art/masters/restless_dead.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/restless_dead.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [4, 5, 6], "hurt": [7] }).

---

### ice_wraith — Ice wraith (AR-402)
- **Category**: Wildlife (kind `monster`, alignment `cursed`)
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn figure is 38 px wide and 46 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: no feet; the trailing point of the shroud touches the ground in the bottom-right region and the figure rises up-left at 45° (1 px up and 1 px left per unit of height); the crown of the hood is lit, the front (south) mid, the east side of every fold dark
- **Reference**: none: no square in `art/u7_reference_squares/` and no entry in `docs/STATUS.md` → Stand-ins. Today the engine draws the `$U7_Skeleton` sheet (shape 528 per its sidecar) for it, tinted by the catalog's `tint` field (a pale sky blue) only to tell the two species apart; the tint goes when this file lands. Nearest references: the restless dead brief above for the figure's lean, and `art/u7_reference_squares/u7_pine_tree_48.png` (shape 306) for how a tall tapering silhouette is stacked up the lean. Reference only, nothing copied ships.
- **Sheet**: AR-600 layout, frames 48×48: rows S, W, E, N; columns stand, walk ×3, attack ×3, hurt; this brief is the south stand frame; W and E are transposed per GUIDE_25D (never mirrored); N is the back view (the hood's back, no eyes, the sleeves hidden). The walk frames drift: the hem's points sway, nothing steps.
- **Palette Ramps**: Shroud 192 `#F3F3FF` (lit crown of the hood), 193 `#E7E7FF`, 195 `#CECEFF` (front), 197 `#B6B6FF`, 199 `#9E9EFF` (east side, creases); Cold core 225 `#B2D7F3`, 226 `#71AEE7`, 227 `#358EDB` (inside the hood, claws, the deepest folds); Frost 15 `#FFFFFF` (rime ticks, eyes); Silhouette 86 `#000035` (a blue-black in place of the usual 147, so the figure stays cold); background `#FF00FF`.

#### Primary State Visual Description:
No feet: the shroud's hem ends in three ragged points on rows 40–47 between columns 22 and 40, the longest touching row 47 at columns 30–33 with a 1-px checker of transparent pixels for the 4 rows above it (every pixel fully opaque or fully clear, no partial alpha) so it fades into the ground, the others ending at row 42, column 22 and row 44, column 38. From the hem the figure narrows and rises 12 px while sliding 12 px left to a waist at row 28, columns 12–28, then to shoulders at row 16, columns 6–24, and a 12×12 cowl on rows 2–14, columns 4–16 whose opening is a 6×8 hollow of 227 rimmed with 225, holding two 15 eye pixels at row 8, columns 8 and 12. Two long sleeves of 195 with 197 undersides reach forward and down, ending in three 1-px claw ticks of 226 each, the right at row 30, columns 26–30 and the left at row 26, columns 3–7. Shading: the crown of the hood and the left shoulder in 192, the front in 193 with 1-px micro-dither into 195, the east side of every fold in 197 with 199 in the creases, and 1-px 15 rime ticks along the fold ridges. The outline is 86 along the lower and right silhouette only, and the hem's points have no outline where the checker meets the ground. Rows 0–1, columns 0–2 and columns 41–47 stay magenta; nothing touches row 0 or column 47, so the shape is contained.

#### Interaction / Transformed State Description:
No carcass frame is used by the engine: "Hunt ice wraith" (right-click; `hunt.work` 300; it never flees) removes the unit and drops nothing (the catalog gives it no `yields`). Colonists never pick a `monster` as prey on their own; only a designation sends one. It stands on a red stance square, drifts in groups of 1–2, and is placed only in regions of alignment `cursed` on glacier and tundra, one group at each lair site. The `attack` and `hurt` columns play on the map once the AR-600 renderer lands (V45); in the current build it only wanders.

#### Readability Check:
At zoom ⅓ a tall pale-blue tapering shape with no legs on a red square over snow, the only blue-white figure; the restless dead is bone-white with legs, and the arctic fox is low, four-legged and on a yellow square.

Deliver: art/masters/ice_wraith.png (AR-600 sheet, 48×48 frames, magenta background) + art/masters/ice_wraith.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S", "W", "E", "N"], animations { "stand": [0], "walk": [1, 2, 3], "attack": [4, 5, 6], "hurt": [7] }).
