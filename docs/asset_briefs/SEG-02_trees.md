# Segment 02: trees (written 2026-09-18 by Claude Code)

The fourteen tree objects of `game/data/UF_WorldCatalog.json` (`objects` list): thirteen standing trees and the stump they all become. Where each grows, from the catalog's biome tables: oak in the temperate broadleaf forest, the dry tropical forest and the temperate grassland; birch in the temperate broadleaf forest; pine in the taiga, both conifer forests and the mountains; snow fir in the taiga; fruit tree in the broadleaf forests and the tropical grassland (removed from cursed regions, added in blessed ones); flat-top tree in the savannas, the tropical grassland and the dry tropical forest; swamp tree in the four swamps; mangrove in the tropical salt marsh, the tropical salt swamp and the mangrove swamp; broadleaf giant in the tropical conifer and moist broadleaf forests and in the fresh tropical marsh and swamp; palm in the dry and moist tropical broadleaf forests; dead tree in the badlands; blighted tree in no biome, only in cursed regions. Five of them (birch, snow fir, picked fruit tree, mangrove, blighted tree) have no image of their own today: the engine draws another tree's image through a catalog `tint`. Every one gets its own master here.

## How to work this segment
1. Style: high-resolution 2.5D in the manner of the reference squares (`art/u7_reference_squares/`, the composite the user approved 2026-09-18), every tree inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1). No 16×16 upscaling. `docs/ART_STANDARD.md` is binding.
2. Projection: height leans up and to the left at 45° (1 px up, 1 px left per unit of height); the top, south and east faces are visible; every trunk rises from a root base in the bottom-right region of the square and its crown ends up-left of that base (`docs/GUIDE_25D.md`).
3. Palette: `art/palette/uf.hex` only (every index below is verified against the file); aim for ≤ 32 colours per asset; 1-px micro-dither between two neighbouring ramp steps is the shading method; no gradients and no anti-aliasing against the background.
4. Masters: `art/masters/<id>.png` on flat magenta `#FF00FF`, alpha 0/255 after cleaning, no baked ground shadow (the engine draws shadows), plus the sidecar `art/masters/<id>.json` in the AR-600 form (id, frameWidth 48, frameHeight 48, anchor [24, 47], footprint [1, 1], facings ["S"], animations { "stand": [0] }).
5. Open the reference named in each brief before drawing. The reference squares and the stand-ins in `game/img/characters/` are references and development stand-ins only: nothing copied from them ships; the delivered art is original work in that manner.
6. Contained: nothing touches the top edge (row 0) or the right edge (columns 46–47); the base may sit on row 47; the anchor is the bottom centre of the cell, [24, 47], and the engine draws the sprite with that pixel on the cell's bottom centre.
7. Outline: 147 `#201408` only along the lower and right silhouette (the shadow side); sunlit upper-left edges meet the background with no outline.
8. Facts: every state, yield, tag, tint and placement rule in these briefs is read from `game/data/UF_WorldCatalog.json` and `docs/ASSET_INVENTORY.md`; the after-state of every standing tree here is the stump (last brief), and "no second state in the engine" means exactly that. Work values are the catalog's `work` numbers (progress grows by the unit's work rate per tick; tools multiply it).
9. Shared images today: birch, snow fir, picked fruit tree, mangrove and blighted tree reuse another tree's image with a catalog `tint`. When one of these masters lands, its catalog entry's `image` is pointed at the new file and its `tint` field removed, or the engine would wash the new art too (Gemini may edit the `objects` list per `docs/handoffs/HANDOFF_world_generation.md`, nothing else in the file). The palm is a stock tile today (`tile` field); its entry gets an `image` field instead.
10. Export: copy the approved master into `game/img/characters/` under the name the entry's `image` field names, with its sidecar beside it (no scaling: masters are already at screen size), `docs/ART_STANDARD.md` §5.
11. Check: `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated), then mark the AR-102 row in `docs/ASSET_REQUESTS.md` DELIVERED with the backticked file name; AR-020 (fruit tree) and AR-021 (oak, pine, stump) are older rows the same files satisfy.
12. Gate: the user approves each asset before it ships (`art/APPROVALS.md`). Order: the oak first (it is one of the four style anchors of `docs/ART_STANDARD.md` §5 step 2), then this file top to bottom. Writers verify this file with `"C:\Program Files\nodejs\node.exe" tools/check_briefs.js docs/asset_briefs/SEG-02_trees.md`.

---

### oak — Oak (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 44 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: `art/u7_reference_squares/u7_oak_tree_48.png` (SHAPES.VGA shape 181 shrunk to 0.67: a dense mottled crown filling the square with the trunk just showing at the bottom right; the stand-in `!$TimberOak.png` is the same shape at 3×; a reference only, nothing copied ships)
- **Palette Ramps**: Leaf 200 `#86D200` (sunlit crown), 241 `#45B645`, 242 `#189218`, 243 `#006D00`, 70 `#005100` (under-canopy); Bark 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The root flare sits in the bottom-right quarter of the square: a 10-px-wide base on rows 40–47, columns 30–40, in 145 with a 147 contact line on row 47 and 1-px root tips reaching columns 28 and 42 on rows 46–47. From it the trunk (6 px wide: 141 on its left 1-px strip, 143 in the middle, 145 on the right 2 px) climbs from row 40 to row 26 while sliding 14 px to the left, so it spans columns 32–37 at row 40 and columns 18–23 at row 26, where it forks into two 143 limbs that vanish into the canopy. The canopy is an irregular mass of lobed leaf clusters 44 px wide (columns 2–45) and 28 px tall (rows 1–28): its upper-left third is 200 with 1-px micro-dither into 241, the centre 242, the lower-right third and the underside 243 with 70 in the deepest pockets, and three or four ragged gaps of magenta between clusters show branch fragments in 143. The top of each cluster (its upper-left lobe) takes the lit step, its south side the middle step and its east side the dark step, so every cluster reads as a small leaning box. The outline is 147 only where a cluster or the trunk meets the background on its lower and right sides; the sunlit upper-left edges have no outline. Row 0 and columns 46–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 240, yields 3 Log; the stump itself yields 1 more): its own brief and file at the end of this segment. The oak has no other engine state. Today's stand-in image is also shown, pale-tinted, for the birch; the birch gets its own master (next brief).

#### Readability Check:
At zoom ⅓ the oak is the broadest, darkest-crowned round tree with a short bare trunk leaning up-left, unlike the pine's narrow tiered spike, the fruit tree's paler crown with red dots and the broadleaf giant's taller, shelf-layered, buttressed mass.

Deliver: art/masters/oak.png (48×48, magenta background) + art/masters/oak.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### birch — Birch (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 36 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: none of its own; the nearest is the oak square `art/u7_reference_squares/u7_oak_tree_48.png` (SHAPES.VGA shape 181) for the lean of the trunk and the way clusters stack, and today the engine shows that same oak image for the birch with a pale tint (a reference only, nothing copied ships)
- **Palette Ramps**: Bark 148 `#EFEBE7` (lit strip), 149 `#DFD7D2`, 150 `#CEC6BE` (shadow strip); Bark marks 131 `#242424`; Leaf 240 `#7DDF7D` (sunlit dither), 200 `#86D200`, 241 `#45B645`, 242 `#189218`, 243 `#006D00`; Twig and silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is a small flare of 149 on rows 42–47, columns 32–38 (7 px wide), with a 147 contact line on row 47. The trunk is 4 px wide and pale: 148 on its left 1-px strip, 149 in the middle 2 px, 150 on the right strip, with 2-px horizontal dashes of 131 on its right half every 4–5 rows (the bark's dark marks); it climbs from row 42 to row 20 while sliding 22 px left (columns 33–36 at row 42, columns 11–14 at row 20), then splits into three 2-px limbs of 149 with a 150 right edge that fan up-left, up and up-right into the crown. The crown is an airy oval 36 px wide (columns 4–39) and 24 px tall (rows 1–24) made of 12–16 small clusters of 3–5 px with magenta gaps between them: clusters on the upper-left take 200 with 1-px micro-dither into 240, the central ones 241, the lower-right ones and every underside 242 with 243 in the pockets; 1-px twigs of 147 show in the gaps and join the limbs. The outline is 147 only on the lower and right edges of each cluster and along the trunk's right side; the pale bark's left edge meets the magenta with no outline. Row 0 and columns 40–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 200, yields 2 Log): its own brief and file at the end of this segment; no other engine state. Today the engine draws the oak's image for the birch with a pale wash (the entry's `tint` field, e6f0e0); once this master is in place the entry's `image` names the new file and the `tint` field is removed, or the wash would bleach the new art too.

#### Readability Check:
At zoom ⅓ the birch is the only tree with a white trunk and a see-through light-green crown, thinner and paler than the oak beside which it grows in the temperate broadleaf forest.

Deliver: art/masters/birch.png (48×48, magenta background) + art/masters/birch.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### pine — Pine (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 39 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: `art/u7_reference_squares/u7_pine_tree_48.png` (SHAPES.VGA shape 306 shrunk to 0.80: a dark olive conifer running from the bottom-right corner to the top-left with brown boughs showing through; the stand-in `!$PineTree.png` is the same shape at 3×; a reference only, nothing copied ships)
- **Palette Ramps**: Needle 241 `#45B645` (lit tier tops), 242 `#189218`, 243 `#006D00`, 70 `#005100`, 71 `#003500` (deep notches); Bark 143 `#5D350C`, 145 `#3D240C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
A narrow root base of 145, 6 px wide, sits on rows 43–47, columns 34–39, with a 147 contact line on row 47; the trunk (3 px wide, 143 with a 145 right strip) climbs from row 43 to row 36 while sliding 7 px left, from columns 35–37 to columns 28–30, and is bare between rows 39 and 43. Four tiers of boughs stack up the lean, each an irregular wedge widest at its bottom and stepping in from the right: tier 1 spans columns 10–43 on rows 31–38, tier 2 columns 8–37 on rows 21–30, tier 3 columns 6–30 on rows 11–20, and the crown columns 5–20 on rows 1–10, ending in a 2-px tip at row 1, column 9. Each tier's top surface (its upper-left slope, 3–4 px deep) is 241 with 1-px micro-dither into 242, its south face 243, and its underside and east side 70 with 71 in the notches between boughs; needle edges are drawn as 1-px jags, not smooth curves. The outline is 147 only under each tier and along the right-hand silhouette. Row 0 and columns 44–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 240, yields 3 Log): the same stump brief and file as the oak; no other engine state. Today's stand-in image is also shown, blue-tinted, for the snow fir; the snow fir gets its own master (next brief).

#### Readability Check:
At zoom ⅓ the pine is the tall, narrow, dark green spike among the trees, unmistakable next to the round oak, and it differs from the snow fir by having no white on its tiers.

Deliver: art/masters/pine.png (48×48, magenta background) + art/masters/pine.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### fir_snow — Snow fir (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 37 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: none of its own; the nearest is the pine square `art/u7_reference_squares/u7_pine_tree_48.png` (SHAPES.VGA shape 306), and today the engine shows that same pine image for the snow fir with a blue tint (a reference only, nothing copied ships)
- **Palette Ramps**: Needle 242 `#189218` (lit), 243 `#006D00`, 70 `#005100`, 71 `#003500`; Snow 15 `#FFFFFF` (lit edge), 118 `#EFEFEF`, 194 `#DBDBFF` (shade), 196 `#C2C2FF` (where snow meets needles); Bark 145 `#3D240C`, 146 `#2D1C08`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The skeleton is the pine's: a 7-px root base of 145 on rows 43–47, columns 34–40, with a 146 shadow strip on its right 2 px and a 147 contact line on row 47; a 3-px trunk (145 with a 146 right strip) climbing from row 43 to row 36 while sliding 7 px left; and four tiers of boughs, tier 1 on columns 10–41, rows 31–38, tier 2 on columns 8–35, rows 21–30, tier 3 on columns 6–28, rows 11–20, and the crown on columns 5–18, rows 1–10, with its tip at row 1, column 8. The needles are colder and darker than the pine's: tier tops 242 with 1-px micro-dither into 243, south faces 243, undersides and east sides 70 with 71 in the notches. Snow lies only on the up-facing surfaces: each tier's top slope carries a 2–3-px-thick cap that is 15 along its upper-left edge, 118 micro-dithered into 194 towards the right, and 196 where the cap meets the needles below it; the crown is capped from row 1 down to row 5; the south and east faces carry no snow at all. The outline is 147 only under each tier and along the right silhouette, and it never runs along snow. Row 0 and columns 42–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 240, yields 3 Log): the shared stump brief and file; no other engine state. Today the engine draws the pine's image for the snow fir with a blue wash (the entry's `tint` field, d0e0ff); once this master is in place the entry's `image` names the new file and the `tint` field is removed.

#### Readability Check:
At zoom ⅓ the snow fir is the pine's spike with white steps on it, the only tree with white in its crown; it grows in the taiga among plain pines and must read there as a different tree, not as a lit pine.

Deliver: art/masters/fir_snow.png (48×48, magenta background) + art/masters/fir_snow.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### fruit_tree — Fruit tree (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 42 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: `art/u7_reference_squares/u7_fruit_tree_48.png` (SHAPES.VGA shape 328 shrunk to 0.75: a thick pale grey trunk climbing up-left with sparse sage foliage around it; the stand-in `!$FruitTree.png` is the same shape at 3×; a reference for the lean only, since ours carries a full green crown with fruit; nothing copied ships)
- **Palette Ramps**: Leaf 200 `#86D200` (sunlit dome), 241 `#45B645`, 242 `#189218`, 243 `#006D00`; Fruit 21 `#FF394D` (highlight pixel), 23 `#DF1428` (body); Bark 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The root base is 10 px wide on rows 41–47, columns 30–39, in 145 with a 147 contact line on row 47. The trunk (5 px wide: 141 left strip, 143 middle, 145 right strip) climbs from row 41 to row 27 while sliding 14 px left, from columns 32–36 to columns 18–22, and forks at row 27 into two 143 limbs that disappear under the crown. The crown is a rounder, smoother dome than the oak's, 42 px wide (columns 3–44) and 29 px tall (rows 1–29): its upper-left third 200 with 1-px micro-dither into 241, its centre 241 and 242 in soft lobes, its lower-right third and underside 242 with 243 in the pockets, and no gaps of background inside it. Ten to twelve fruit, each a 2×2-px dot with 21 on its upper-left pixel and 23 on the other three, sit in the crown's middle and lower-right (none in the sunlit 200 area, none on the outline) with at least 1 px of leaf around each. The outline is 147 only on the crown's lower and right edges and the trunk's right side. Row 0 and columns 45–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
Two real transitions. "gather" (catalog work 60, yields 3 Fruit) turns it into `fruit_tree_bare` (next brief, its own file; the engine regrows that into this tree after 72 game hours). "chop" (catalog work 300, yields 3 Log) turns it into `stump` (last brief). At generation the engine also drops fruit trees from cursed regions and adds them in blessed ones; that is placement, not a state.

#### Readability Check:
At zoom ⅓ the fruit tree is the pale round crown with red specks, lighter than the oak and rounder than anything else; without the specks it must still read as the same tree, which is what the picked brief does.

Deliver: art/masters/fruit_tree.png (48×48, magenta background) + art/masters/fruit_tree.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### fruit_tree_bare — Fruit tree (picked) (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 42 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: the same square as the fruit tree, `art/u7_reference_squares/u7_fruit_tree_48.png` (SHAPES.VGA shape 328 shrunk to 0.75), and the delivered `art/masters/fruit_tree.png`, whose silhouette this file repeats (a reference only, nothing copied ships)
- **Palette Ramps**: Leaf 201 `#86B200` (spent sunlit step), 241 `#45B645`, 242 `#189218`, 243 `#006D00`; Spent dither 166 `#9EAE7D`; Bark 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The silhouette, trunk and outline are the fruit tree's pixel for pixel (the same base on rows 41–47, columns 30–39; the same trunk from columns 32–36 at row 41 to columns 18–22 at row 27; the same dome on columns 3–44, rows 1–29), so the swap does not jump on screen. Every fruit dot is replaced by the leaf colour around it. The crown is a shade spent: its sunlit upper-left third is 201 instead of 200, and 1-px micro-dither of 166 into 241 runs across the centre so the dome reads a touch grey-green, while the lower-right third and the underside keep 242 and 243. The bark keeps 141, 143 and 145 exactly as before. The outline stays 147 on the lower and right edges only. Row 0 and columns 45–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`regrow`: after 72 game hours the engine replaces it with `fruit_tree` (the previous brief); it checks regrowth once every game hour. "chop" (catalog work 300, yields 3 Log) turns it into `stump`. Today the engine draws the fruit tree's image for it with a grey-green wash (the entry's `tint` field, c8d8c0); once this master is in place the entry's `image` names the new file and the `tint` field is removed.

#### Readability Check:
At zoom ⅓ it is the fruit tree's exact shape without red specks and a shade duller, so a player scanning for food sees the difference at once but never mistakes it for an oak.

Deliver: art/masters/fruit_tree_bare.png (48×48, magenta background) + art/masters/fruit_tree_bare.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### tree_savanna — Flat-top tree (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 44 px wide and 40 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: the stand-in `!$U7_Flat-toptree.png` in `game/img/characters/` (SHAPES.VGA shape 310 at 3×: a short rounded cluster of pale-tipped leaves on a brown stem; no reference square exists; ours is taller and flatter; a reference only, nothing copied ships)
- **Palette Ramps**: Canopy 201 `#86B200` (flat lit top), 202 `#7D9600`, 203 `#697900`, 204 `#515900`, 205 `#3D4100` (underside pockets); Bark 140 `#8A5D2D`, 142 `#6D3D0C`, 144 `#4D2D0C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is a 7-px flare of 144 on rows 42–47, columns 34–40, with a 147 contact line on row 47. The trunk is slender, 3 px wide (140 left strip, 142 middle, 144 right strip), and climbs from row 42 to row 24 while sliding 18 px left, from columns 35–37 to columns 17–19; at row 26 it forks into three 2-px limbs of 142 that spread up-left, up and up-right and reach the canopy's underside at columns 8, 20 and 32 on row 21. The canopy is a shallow disc, 44 px wide (columns 2–45) and only 14 px tall (rows 8–21), flat on top: its top surface is a nearly straight band 3 px deep of 201 with 1-px micro-dither into 202, the body 202 and 203 in flat horizontal lobes, the underside a ragged 2–3-px band of 204 with 205 in the pockets, and two or three slots of magenta between the limb tips show that the disc floats on its limbs. Its east end (columns 40–45) is one step darker than the same row further left, which is the disc's east face. The outline is 147 only along the underside and the right end of the disc and the trunk's right side. Rows 0–7 and columns 46–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 200, yields 2 Log): the shared stump brief and file. No other engine state.

#### Readability Check:
At zoom ⅓ it is the only tree whose crown is a thin flat line on a stalk, wide and low against the dry grass of the savannas, nothing like the round oak or the domed fruit tree.

Deliver: art/masters/tree_savanna.png (48×48, magenta background) + art/masters/tree_savanna.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### tree_swamp — Swamp tree (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 41 px wide and 46 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: the stand-in `!$U7_Swamptree.png` in `game/img/characters/` (SHAPES.VGA shape 332 at 3×: a gnarled rust-brown trunk twisting up-left with only scraps of foliage; no reference square exists; a reference only, nothing copied ships)
- **Palette Ramps**: Bark 182 `#AE653D` (lit strip), 183 `#9E5124`, 184 `#8E3D0C`, 185 `#7D2D00` (roots and east side); Leaf 202 `#7D9600`, 203 `#697900`, 204 `#515900`, 205 `#3D4100`; Moss 165 `#B6C29A`, 166 `#9EAE7D` (hanging strands), 168 `#71864D`, 169 `#5D7139` (trunk patches); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is a wide knotted root spread on rows 40–47, columns 28–42, in 185 with a 147 contact line on row 47 and two knuckled roots reaching columns 26 and 44 on rows 45–47. The trunk is thick and crooked: 8 px wide at row 40 narrowing to 5 px at row 18, with 182 on its lit left strip, 183 in the middle, 184 then 185 on the right, and a kink at row 30 where it steps 3 px right before resuming the lean, so it spans columns 30–37 at row 40, columns 24–29 at row 30 and columns 14–18 at row 18; patches of moss, 1–3 px, in 168 with 169 shade, sit on the trunk's upper-left edge at rows 22, 28 and 36. From row 18 three ragged limbs of 184 spread across columns 4–38 up to row 2, carrying sparse leaf clusters of 4–6 px with more magenta than leaf between them: 202 on their tops, 203 on their south sides, 204 and 205 underneath. Strands of hanging moss, 1 px wide and 4–8 px long, in 165 with 166 at their lower ends, dangle from the limbs down to row 28 at columns 9, 15, 22 and 31. The outline is 147 only on the lower and right edges of trunk, roots and clusters. Rows 0–1 and columns 45–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 220, yields 2 Log): the shared stump brief and file; no other engine state. The generator may place it on land cells touching water (its `avoidWater` is 0), never on a water cell. Today's stand-in image is also shown, sage-tinted, for the mangrove; the mangrove gets its own master (next brief).

#### Readability Check:
At zoom ⅓ the swamp tree is the crooked rust-brown trunk with a thin, moss-hung crown, more trunk than leaf, unlike the dense green domes of the oak and the mangrove.

Deliver: art/masters/tree_swamp.png (48×48, magenta background) + art/masters/tree_swamp.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### mangrove — Mangrove (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 44 px wide and 41 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: none of its own; the nearest is the swamp tree stand-in `!$U7_Swamptree.png` in `game/img/characters/` (SHAPES.VGA shape 332), which the engine shows for the mangrove with a sage tint today; for the dome, the oak square `art/u7_reference_squares/u7_oak_tree_48.png` (a reference only, nothing copied ships)
- **Palette Ramps**: Leaf 165 `#B6C29A` (sunlit dither), 166 `#9EAE7D`, 167 `#8A9A61`, 168 `#71864D`, 169 `#5D7139`, 170 `#4D5D28` (underside pockets); Root 139 `#9A7141` (lit pixel), 142 `#6D3D0C`, 144 `#4D2D0C` (crossing shadow); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is not a flare but an arch of prop roots: seven roots, each 2 px wide (139 on the lit left pixel, 142 on the right pixel, 144 where one crosses behind another), fan down and right from a root crown on rows 34–36, columns 29–35, to touch the ground on row 47 at columns 23, 27, 31, 35, 39, 43 and 45, each with a 147 contact dot; magenta shows between the roots all the way down to row 47 so the ground draws through them. A short trunk, 5 px wide (139 left strip, 142 middle, 144 right strip), climbs from the root crown at row 34 to row 26 while sliding 8 px left, from columns 30–34 to columns 22–26. The crown is a dense, low dome 41 px wide (columns 2–42) and 22 px tall (rows 7–28), drawn as overlapping leathery leaves, each a 3×2-px oval: 166 with 1-px micro-dither into 165 on the upper-left third, 167 in the centre, 168 on the lower-right third, 169 on the underside with 170 in the pockets, and no gaps inside the dome. The outline is 147 only along the dome's lower and right edges and down the right side of each root. Rows 0–6 and columns 46–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 220, yields 2 Log): the shared stump brief and file; no other engine state. The generator may place it on land cells touching water (its `avoidWater` is 0), never on a water cell, so the roots must read against grass, mud and the water's edge alike. Today the engine draws the swamp tree's image for the mangrove with a sage wash (the entry's `tint` field, a8c8a0); once this master is in place the entry's `image` names the new file and the `tint` field is removed.

#### Readability Check:
At zoom ⅓ the mangrove is the low grey-green dome standing on a cage of legs, the only tree with daylight under its crown; the swamp tree beside it is taller, browner and sparse.

Deliver: art/masters/mangrove.png (48×48, magenta background) + art/masters/mangrove.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### tree_tropical — Broadleaf giant (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 45 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: the stand-in `!$U7_Broadleafgiant.png` in `game/img/characters/` is SHAPES.VGA shape 181 at 3×, the same shape as the oak, so the oak square `art/u7_reference_squares/u7_oak_tree_48.png` is the nearest reference; the giant must be drawn to differ from the oak (a reference only, nothing copied ships)
- **Palette Ramps**: Leaf 240 `#7DDF7D` (emergent tops), 200 `#86D200`, 241 `#45B645`, 242 `#189218`, 243 `#006D00`, 70 `#005100`, 71 `#003500` (underside pockets); Bark 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is the widest in the segment: three buttress fins on rows 38–47 fan out from the trunk to columns 26, 34 and 42 on row 47, in 141 on their upper-left slopes, 143 on their south faces and 145 on their east faces, with a 147 contact line along row 47. The trunk is 8 px wide (141 on its left 2 px, 143 in the middle, 145 on the right 2 px) and climbs from row 38 to row 28 while sliding 10 px left, from columns 30–37 to columns 20–27, before the crown swallows it. The crown is a layered mass 45 px wide (columns 1–45) and 30 px tall (rows 1–30), built of large leaves 4–6 px long drawn as overlapping fans in three shelves: the upper shelf 240 with 1-px micro-dither into 200 on its lit tops and 241 on its south sides, the middle shelf 241 on top and 242 on its south sides, the lower shelf 242 on top, 243 on its south sides and 70 with 71 on the underside, so the crown reads as stacked shelves rather than one ball; two emergent tufts break the upper silhouette on rows 1–4 at columns 9–14 and 24–28. The outline is 147 only on the lower and right edges of each shelf and of the buttresses. Row 0 and columns 46–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 320, the longest felling in the segment, yields 4 Log): the shared stump brief and file. No other engine state.

#### Readability Check:
At zoom ⅓ the broadleaf giant is the tallest and widest green mass with a visible buttressed foot and shelf-like layers, darker and taller than the oak whose shape it must not share, since today both use the same stand-in.

Deliver: art/masters/tree_tropical.png (48×48, magenta background) + art/masters/tree_tropical.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### palm — Palm (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 41 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: none; the placeholder today is stock RPG Maker tile 237 of `Outside_B` (a flat upright tile, not a reference); the nearest square for the leaning trunk is the pine, `art/u7_reference_squares/u7_pine_tree_48.png` (SHAPES.VGA shape 306; a reference only, nothing copied ships)
- **Palette Ramps**: Frond 200 `#86D200` (upper edges), 201 `#86B200`, 202 `#7D9600` (midrib), 242 `#189218`, 243 `#006D00` (undersides); Trunk 138 `#AA8659`, 139 `#9A7141` (alternating rings), 140 `#8A5D2D` (right strip); Coconut 141 `#7D4D18`, 144 `#4D2D0C`; Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is a 6-px clump of 140 on rows 43–47, columns 34–39, with a 147 contact line on row 47. The trunk is 4 px wide and ringed: 2-row bands alternate 138 and 139, with a 140 strip on the right pixel, and it climbs from row 43 to row 14 in a gentle curve that slides 20 px left, passing columns 35–38 at row 43, columns 27–30 at row 30 and columns 16–19 at row 14. Seven fronds radiate from the crown point on rows 12–14, columns 16–18: three sweep up-left, up and up-right to tips at row 2 column 6, row 1 column 14 and row 3 column 24; two sweep right to tips at row 8 column 40 and row 14 column 44; two droop down-left and down to tips at row 26 column 4 and row 30 column 22; each frond is 3–4 px wide at its base tapering to 1 px, with a 1-px midrib of 202, its upper-left edge 200 with 201 leaflets, its underside 242 with 243 leaflets, and 1-px notches of magenta between the leaflets along its length. Three coconuts, 3×3 px each in 141 with a 144 lower-right corner, hang under the crown on rows 14–17, columns 18–23. The outline is 147 only under each frond and along the trunk's right side. Row 0 and columns 45–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 160, yields 1 Log): the shared stump brief and file; no other engine state. The generator may place it on land cells touching water (its `avoidWater` is 0). Today the palm is the only tree drawn from a stock RPG Maker tile (the entry's `tile` field, `Outside_B` 237); once this master is in place the entry gets an `image` field naming the new file and the `tile` field is removed.

#### Readability Check:
At zoom ⅓ the palm is the curved bare stalk with a star of fronds and no dome, the only tree with an open crown, nothing like the flat-top's disc or the broadleaf giant's mass in the same tropical forests.

Deliver: art/masters/palm.png (48×48, magenta background) + art/masters/palm.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### dead_tree — Dead tree (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 37 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: the stand-in `!$U7_Deadtree.png` in `game/img/characters/` (SHAPES.VGA shape 325 at 3×: a bare, twisted, dark brown fork of branches; no reference square exists; a reference only, nothing copied ships)
- **Palette Ramps**: Wood 152 `#AEA29A` (lit edges), 154 `#8E8279`, 156 `#6D615D`, 158 `#514945`, 160 `#35312D` (crack and root shade); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is an 11-px root flare on rows 42–47, columns 30–40, in 158 with 160 on its right 3 px, a 147 contact line on row 47 and two exposed roots to columns 28 and 42 on rows 45–47. The trunk is 6 px wide (152 on its lit left strip, 154 in the middle, 156 then 158 on the right, and a 1-px crack of 160 running up its centre from row 40 to row 26) and climbs from row 42 to row 22 while sliding 18 px left, from columns 32–37 to columns 14–19; a broken limb stub, 4 px wide, juts right from the trunk on rows 29–31, columns 26–30, ending in a splintered 152 tip. At row 22 the trunk splits into two main limbs (3 px, then 2 px wide) that split again between rows 12 and 16 into seven twigs, 1–2 px wide, ending in points spread from row 1, column 8 across to row 10, column 44; every limb and twig is 152 on its upper-left edge and 156 on its lower-right with 154 between, and there is no leaf, bud or moss anywhere. The outline is 147 only along the lower and right edges of trunk, limbs and roots. Row 0 and columns 45–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 120, the quickest felling in the segment, yields 1 Log and 2 Firewood): the shared stump brief and file; no other engine state. Today's stand-in image is also shown, lavender-tinted, for the blighted tree; the blighted tree gets its own master (next brief).

#### Readability Check:
At zoom ⅓ the dead tree is the grey, leafless fork standing on the badlands, the only tree with more sky than crown; the blighted tree differs by its near-black wood and purple growths.

Deliver: art/masters/dead_tree.png (48×48, magenta background) + art/masters/dead_tree.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### tree_cursed — Blighted tree (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 38 px wide and 47 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible
- **Reference**: none of its own; the nearest is the dead tree stand-in `!$U7_Deadtree.png` in `game/img/characters/` (SHAPES.VGA shape 325), which the engine shows for the blighted tree with a lavender tint today (a reference only, nothing copied ships)
- **Palette Ramps**: Bark 129 `#454545` (lit strip), 130 `#353535`, 131 `#242424`, 132 `#181818` (east side); Blight 88 `#EBCAEB` (fungus top edge), 89 `#D79AD7`, 91 `#B249B2`, 93 `#8E108E` (vein), 96 `#610061` (pod shade); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The base is a 12-px root mass on rows 41–47, columns 29–40, in 130 with 131 on its right 3 px, a 147 contact line on row 47, and roots that curl rather than spread, hooking upward at their tips on columns 27 and 42. The trunk is 6 px wide (129 on its lit left strip, 130 in the middle, 131 then 132 on the right) and climbs from row 41 to row 21 while sliding 16 px left, from columns 31–36 to columns 15–20, twisting once at row 32 where it bulges 2 px to the right; a vein of blight, 1 px wide, in 93 with 91 highlights, snakes up the trunk's lit side from row 40 to row 24, and three shelf fungi, each 3×2 px in 89 with an 88 top edge, grow out of the trunk's right side on rows 29, 34 and 38. At row 21 the trunk splits into two limbs that curl back on themselves and end in six hooked twigs, 1–2 px wide, whose points reach from row 1, column 7 across to row 9, column 44; five or six pod-like growths, 2×3 px in 91 with a 96 lower half, hang from the twigs on rows 8–14. Limbs are 129 on their upper-left edges and 131 on their lower-right; the outline is 147 along the lower and right edges of everything. Row 0 and columns 45–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
`stump` (after "chop": catalog work 140, yields 1 Log): the shared stump brief and file; no other engine state. No biome lists it: the generator adds it only in cursed regions (the catalog's region rule, chance 0.02 per cell there), where the ground becomes `cursed_grass` or `ash`, so it must read against those grounds. Today the engine draws the dead tree's image for it with a lavender wash (the entry's `tint` field, c0a0e0); once this master is in place the entry's `image` names the new file and the `tint` field is removed.

#### Readability Check:
At zoom ⅓ the blighted tree is the black, hooked, purple-spotted fork, darker than the grey dead tree and the only tree with purple in it; it stands alone on blighted grass or ash, so it must not read as a burnt oak.

Deliver: art/masters/tree_cursed.png (48×48, magenta background) + art/masters/tree_cursed.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).

---

### stump — Stump (AR-102)
- **Category**: Flora
- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 32 px wide and 24 px tall
- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell's bottom centre)
- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top (the cut face), south and east faces are visible
- **Reference**: `art/u7_reference_squares/u7_stump_48.png` (SHAPES.VGA shape 313 at 1.00: a low, near-black jagged stump with splintered spikes rising up-left and a spreading root; the stand-in `!$U7_TreeStump.png` is the same shape at 3×; a reference only, nothing copied ships)
- **Palette Ramps**: Cut face 135 `#DBCAB2` (lit rim and splinters), 136 `#CAB292`, 138 `#AA8659` (heart), 139 `#9A7141` (growth rings); Bark 141 `#7D4D18` (dither on the south face), 143 `#5D350C`, 145 `#3D240C`, 146 `#2D1C08` (grooves); Silhouette 147 `#201408`; background `#FF00FF`.

#### Primary State Visual Description:
The stump is one unit of height, so its cut top sits only about 8 px up and 8 px left of its base. The base is a root flare on rows 44–47, columns 16–44, in 145 with a 147 contact line on row 47 and two roots running out to columns 14 and 45 on rows 46–47. Above it the bark body slides up-left: the south face, columns 18–34 on rows 37–44, is 143 with 1-px micro-dither of 141 on its upper-left half, and the east face, columns 34–41 on rows 33–46, is 145 with 146 in vertical bark grooves every 3 px. The cut face is an ellipse 16 px wide and 9 px tall on rows 29–37, columns 18–33, filled 136 with a 138 heart at its centre and five concentric 1-px growth rings of 139 around it, its lit upper-left rim 135; one torn splinter of 135 with a 139 shadow side rises from the disc's back-left edge to row 24, column 20, and a second, shorter one to row 27, column 29. The outline is 147 only along the lower and right edges of the body and roots and under the disc's right rim. Rows 0–23 and columns 46–47 stay magenta; the shape is contained.

#### Interaction / Transformed State Description:
This is the after-state of every tree in this segment (13 trees, all through "chop"). Its own "chop" (catalog work 100, yields 1 Log) removes it (`becomes` null): the cell then shows bare ground and no sprite. It is `passable`: units walk through it, so it must not look like an obstacle. No biome places it; it appears only by felling.

#### Readability Check:
At zoom ⅓ the stump is the low brown knob with a pale top, lower than any bush and warmer than the grey loose stones; its pale disc is what says a tree stood here.

Deliver: art/masters/stump.png (48×48, magenta background) + art/masters/stump.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).
