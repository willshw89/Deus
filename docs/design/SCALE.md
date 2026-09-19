# SCALE: the world scale and the pixel density

Written 2026-09-19 by Claude Code for the user's decision on VISION V44 as it read that morning ("The exact scale (screen pixels per metre, a person's height in pixels) is fixed by a scale lineup the user approves"; V44 no longer says this, see the status below). It is a proposal: nothing in `game/js`, `game/data` or `game/img` was changed for it. The lineup images are built by `tools/build_scale_lineup.js`; every number below comes from that tool's output (`game/test_output/scale_measurements.json`) or from files named next to it.

The user's words this answers, in order (2026-09-19): "let's return to the 2.5D style and see how"; "Things can be larger than 1 grid square, but the whole world must seem coherent and at proper scale. So that means, some things get smaller than 1 grid square and some things get larger"; "We can also generate images to the highest resolution / level of detail that makes sense, provided the world makes sense in terms of scale and visual cohesion"; "fantasy realism on a small scale".

## Status (updated 2026-09-19, about 10:40, after review finding M2)
**The world scale is no longer open: the user set it.** VISION V44, revised when the look went back to flat HD pixel art in the FF6 manner (V2), says: a grown person fills roughly one 48 px square; small creatures, plants and items are smaller; larger beings use bigger sheets (96×96, 96×144); trees stand about two squares tall. The size table is §4 of every prompt in `docs/handoffs/GENERATOR_PROMPTS.md` (line 21 onward): a grown human 44–48 px tall in a 48×48 frame, a hare 12–16 px, a deer 44 px long and 48 px tall, a wild horse 72 px long and 56 px tall in 96×96, a troll 88 px, an oak 80–96 px, a pine 104–120 px tall in 96×144. What that does to this document:
- **The person is candidate B's size** (B: ≈ 50 px; the table: 44–48 px). **The large things are not B's.** B doubles the reference shapes (oak 144×142 px, horse 92×100 px); the table draws the oak at 80–96 px and the horse 72 px long. So trees and large animals are smaller next to a person than at B, in the FF6 manner rather than at true proportion. Taking a 1.75 m person as 46 px (26 px per metre, one cell ≈ 1.8 m), a 96 px oak stands about 3.7 m and a 72 px horse is about 2.8 m long. A real oak is 15–25 m tall and a horse about 2.4 m long. Whether trees may be that compressed next to "coherent and at proper scale" is the user's call (§10, item 6).
- **The 2.5D lean is gone** (V2: flat view, upright sprites, nothing leans). Everything below about lifts, the 45° lean and a lower-right anchor is history: §4 on the reference game, the §7.2 anchor note, §7.11 UF_Perspective25D, the §9 Projection row. The anchor stays the bottom-centre of the ground footprint.
- **A fourth scale was in the generator prompts for about 25 minutes** (commit 6182957 at 09:54; the working copy had been rewritten by 10:18, not yet committed then): a grown human 32 px tall, two thirds of a cell, a cell about 2.5–3 m. It was none of A, B or C, and V44's row history records it as "coherent scale with people two thirds of a cell (2026-09-19 late morning)". Gemini's first style-lock anchor was drawn to it: `art/masters/human_male_stand_south.png` (commit c8dbee5). Measured with `tools/png_read.js` on 2026-09-19, the figure is 27×32 px in its 48×48 frame. `art/review/human_male_south_on_meadow_4x.png` (opened) shows a settler leaning up-left and filling about two thirds of the cell's height. So that anchor is off the chosen scale (32 px against 44–48 px) and off the chosen view (it leans). It needs a redraw to the current prompts before anything is built on it.
- **Still useful at the new scale:** the footprint, size-class, anchor and object-grid proposals (§7.1–7.9), the zoom levels (§7.10) and the checks (§7.13), with the table's sizes in place of B's. The lineup images from `tools/build_scale_lineup.js` show the reference game's leaning shapes at A, B and C. They are a record of that measurement, not a size or style reference for new art; the tool was not changed.

## 1. Two separate questions
| | Question | Status |
|---|---|---|
| **(a) World scale** | How many screen pixels a metre is at zoom 1: how tall a person is, how many 48 px cells a deer, a horse, an oak, a boulder or a house covers. | **Set by the user** (V44, revised 2026-09-19): a grown person fills roughly one 48 px square, and the size table is in the generator prompts (see Status). The three candidates below (A, B, C) are the measurement that came before. |
| **(b) Pixel density** | How big one art pixel is on screen. | **Fixed by the user** (VISION V2, ART_STANDARD U2): one art pixel = one screen pixel at zoom 1, highest sensible detail, no chunky upscales next to fine art. It is the same for every candidate. |

They are independent. A larger world scale (a person more pixels tall) does **not** mean bigger pixels. It means the art is **drawn** with more pixels at the same density. So candidates B and C need new art drawn at their size. The B and C images in the lineup enlarge the 1× shapes 2× and 3× by nearest neighbour **only as a size placeholder**. Every such image carries a red caption: "PLACEHOLDER ENLARGEMENT: REAL ART WOULD BE REDRAWN AT FULL DETAIL". Those chunky pixels are not the proposed look.

The cell stays 48×48 screen pixels in every candidate (ART_STANDARD U6, RMMZ's tile). Only the world scale changes: how many metres one cell is.

## 2. The images (open them from the workspace)
Rebuild: `"C:\Program Files\nodejs\node.exe" tools/build_scale_lineup.js` (about 4 s; add `--table` for the measurement table). All files are in `game/test_output/` (gitignored).

| File | What it shows |
|---|---|
| `scale_A_lineup.png` (2256×320) | Candidate A: 25 shapes at 1× on one baseline, on code-drawn grass with the 48 px grid drawn lightly. A green cell marks where a creature stands. A yellow outline marks the cells an object blocks. Cyan dots show each shape's ground footprint. There is a metre ruler and a pink person-height line (1.75 m = 25 px). Five label lines per shape: sprite px, sprite span in cells, ground footprint in cells, and "STANDS IN 1" or "BLOCKS w×h". |
| `scale_A_scene_zoom1.png` (816×624) | Candidate A on the real game screen at zoom 1: a small camp (stone house walls with a wooden door, a bed and a chest inside, a campfire, two people, a barrel, an oak, a pine, a boulder, a deer) in a clearing ringed by seeded forest. Units stand in their cells on stance squares (green friendly, yellow indifferent). |
| `scale_A_scene_zoom2.png` (816×624) | The same world at a camera zoom-in of 2: the camera doubles every screen pixel, and the art is still the 1× art. |
| `scale_A_scene_zoom_2of3.png`, `scale_A_scene_zoom_1of3.png` (1640×624 each) | Candidate A at today's zoom-outs ⅔ and ⅓, two panels each. Left, "sampled": art pixels are skipped, as the engine draws today. Right, "averaged": each screen pixel averages the art pixels under it (mipmaps). |
| `scale_B_lineup.png` (2976×474), `scale_C_lineup.png` (3840×522) | The same lineup at a person ≈ 1 cell and ≈ 1.5 cells tall (placeholder 2× and 3× enlargements, captioned top and bottom). |
| `scale_B_scene_zoom1.png`, `scale_C_scene_zoom1.png` (816×624) | The same camp at the same positions in metres, on the same screen at zoom 1, placeholders captioned. |
| `scale_measurements.json` | Every number in §5, per shape and per candidate, plus the stand-in survey of §3. |

### What the images show (each opened with the Read tool on 2026-09-19; crops at 2× were opened for the wide lineups)
- **A lineup:** at 1× the people are small leaning figures about half a cell tall: 27×25 px, with faces a few pixels. The hare (15×15) and the fowl (15×14) are specks a third of a cell across. The deer (40×44) and the horse (46×50) about fill one cell. The oak (72×71), pine (65×61) and fruit tree (67×64) are the only things clearly larger than a cell, by their crowns. Their trunks sit in one yellow cell, and the crown overhangs one cell up and to the left. The boulder (58×45) is a little over a cell wide. The bed (45×31), chest, barrel and campfire (13×11, tiny) each fit in one cell. The wall piece and the door each block one cell: their ground run is 32 px, and their 53 px sprites lean past it.
- **A scene, zoom 1:** the house, the trees and the boulder read clearly. The two people and the deer read as figures but small: each person is about half the height of its stance square. The screen shows 17×13 cells, about 51–57 m by 39–44 m. The camp takes about a tenth of the screen; the rest is forest and grass.
- **A scene, zoom 2:** the camp fills the screen much as the reference game did. You can see the stone texture on the walls, the planks and iron bands on the door, the quilting on the bed, the barrel's hoops, and the people's hair, clothes and arms (50 px tall on screen). Every pixel is a 2×2 block, uniform for everything, because the camera zooms and the art was not upscaled.
- **A at ⅔ (26×20 cells):** trees, boulders, stumps and the house read. The people are about 17 px, readable as two figures on their squares with no detail. Magnified, the sampled panel shows uneven dropped pixels (a harsher grass speckle, jagged outlines); the averaged panel is softer and calmer, with every shape intact.
- **A at ⅓ (51×39 cells):** the camp is a speck. The house outline reads, and the stance squares are the only sign of the people (each about 8 px, a streak a few pixels wide). Trees and boulders are coloured blobs. Sampled keeps a few loud isolated pixels, such as the red of a shirt; averaged gives brown smudges.
- **B lineup and B scene:** the person is 54×50 px, a little over one cell. The deer (80×88) and horse (92×100) span about two cells. The oak crown spans 3×3 cells over its one blocked trunk cell. The bed blocks 2×1, and a reference wall or door piece (64 px long) blocks 2×1. The house is 5.3×3.3 cells. On screen at zoom 1 the camp looks the way A looks at zoom 2, but the grid and the stance squares stay 48 px, so a person stands in a square about their own height. The pixels are visibly 2×2: that is the placeholder, and the caption says so.
- **C lineup and C scene:** the person is 81×75 px, about 1.6 cells, and overhangs the cell behind. The horse is 138×150 (3 cells), the oak crown 216×213 (4.5 cells), the bed blocks 3×2. On screen at zoom 1 the camp does not fit: the house is cut off at the top, the oak and the deer sit on the edges, and the pine is off screen (about 19×15 m visible). The pixels are 3×3 blocks (placeholder, captioned).

## 3. What the game draws today, and why the scale looks wrong
Measured with `tools/build_scale_lineup.js` (the "INFO stand-in" lines) and a scratch contact sheet of the frames, opened 2026-09-19:
- **None of the images the catalog uses for the lineup subjects is an exact copy of a reference shape at any integer size.** This covers `$U7_Townsman`, `$U7_Hare`, `$U7_Deer`, `$U7_Horse`, `$U7_Ox`, `!$TimberOak`, `!$PineTree`, `!$GraniteBoulder` and the rest. Almost all of their 3×3 blocks are mixed (the townsman 70 of 70, the oak 138 of 138). They were resampled or redrawn to fill a 48×48 frame, so they do not carry the reference shapes' sizes. (Mixed blocks are normal for original 1× art such as `!$UF_Straw_Bed` and `!$UF_Campfire`. The finding here is only that these files are not integer copies of the shapes their sidecars name.)
- **They are not at one scale.** Opaque heights in the stand frame: man 34 px, hare 38 px, fowl 34 px, deer 40 px, horse 43 px, oak 46 px, pine 46 px, boulder 44 px. That is "everything fills one square", the rule V44 replaced. The hare is taller than the man, and the horse is no taller than the oak.
- **Most of them are not the shapes their sidecars name.** The contact sheet shows upright, front-facing figures with no 45° lean for the townsman, hare, fowl, deer, horse, ox, oak, pine and boulder. The sidecars say "SHAPES.VGA shape N (transposed E/W, 48x48 1-square tile)", but the decoded shape N leans up-left. Only `$U7_Eve_T0` is the real leaning shape. `!$StrawBed` holds shape 683 frame 0, a blue-and-white tree; the catalog draws beds with `!$UF_Straw_Bed`, so the tree is not what the game draws.
- **Exact 3× exports exist for 7 sheets:** `!$U7_CaveLadder`, `!$U7_CaveMouth`, `$U7_Automaton`, `$U7_CaveCrawler`, `$U7_CaveLurker`, `$U7_Gnome`, `$U7_Orc`. Each recovers to 1× and matches a decoded frame. Two of them are clipped by their frame: the ladder loses 56 of its 232 pixels and the cave mouth 7 of 559, cut at the frame's left edge. Their file names don't match the reference data's own names for those shapes: the "gnome" sheet is shape 521 and the "orc" sheet is shape 505, which that name table calls a mouse and a drake. I checked the names only, not the pictures. None of the 7 is a lineup subject, so the lineup decodes every shape from the reference data at 1×.

So today's screen has no common scale, and most of it lacks the 2.5D lean. Whichever candidate is chosen, the in-game stand-ins must be re-exported at that candidate's size, as exact integer copies of the 1× shapes marked as placeholders (§7.2 `placeholderScale`), until Gemini's art replaces them.

## 4. How the two reference games handle size (plain words)
**The reference 2.5D game (Ultima VII).** The world is a grid of small ground tiles, 8 px at its native size, about half a metre each: a bed is 5 tiles long, a barrel 1 tile. Height is counted in "lifts" of 4 px; each lift slides an image 4 px up **and** 4 px left, which gives the 45° lean. Each kind of thing has its natural size in tiles and lifts (`STATIC/TFA.DAT`, read by the tool): a person 1×1 tiles × 4 lifts, a child 1×1×3, a hare 1×1×2, a deer 3×3×4, a horse or cow 4×4×4, a troll 2×2×5, an oak 2×2×7 (the trunk; the crown is image only and overhangs), a boulder 3×2×4, a bed 5×3×1, a wall piece or a door 4×1×5. Things larger than a tile cover several tiles. Nothing is shrunk to fit a box. The library is coherent because everything was drawn at that one scale. On its 320×200 screen, a 25 px person was one eighth of the screen's height.

**Dwarf Fortress.** The map is a grid of tiles with no stated size in metres. Every creature stands in one tile whatever its size: a cat and an elephant each take one, and creatures pass each other by lying down. Size is a body volume used for combat and weight, not a tile count (the horse is `BODY_SIZE:2:0:500000`, i.e. 500 000 cm³, in `data/vanilla/vanilla_creatures/objects/creature_domestic.txt`). Walls, floors, beds, chests, tables and doors each take exactly one tile. Workshops take 3×3 tiles. Trees grow a trunk tile with branches and leaves spreading over neighbouring tiles and upper levels. The tile is a gameplay unit, not a measure.

**What UF takes from each (VISION V44).** From DF: movement stays one creature per cell, and walls, doors and floors are whole cells (V21, V56, V57). From Ultima VII: things are drawn at their natural size at one scale, so some are smaller than a cell and some larger, and objects larger than a cell have a footprint of several cells.

## 5. The three candidates, measured
The metre figures are estimates: a person stands for 1.75 m, and a reference ground tile for 0.5 m. The two ways of measuring differ by about 12%, because the reference game draws height slightly foreshortened. Both are given.

| | **A**: reference scale at 1× | **B**: person ≈ 1 cell | **C**: person ≈ 1.5 cells |
|---|---|---|---|
| Size relative to the reference shapes | 1× (the shapes as they are) | 2× (redrawn at full detail) | 3× (redrawn at full detail) |
| A person, feet to crown as drawn | 25 px | 50 px | 75 px |
| Screen px per metre, ground / person | 16 / 14.3 | 32 / 28.6 | 48 / 42.9 |
| **One 48 px cell** | **3.0–3.4 m** | **1.5–1.7 m** | **1.0–1.1 m** |
| Screen at zoom 1 (17×13 cells) | 51–57 × 39–44 m | 26–29 × 20–22 m | 17–19 × 13–15 m |
| The 256×256 map | 770–860 m across | 380–430 m | 256–287 m |
| Speed at 1 cell per beat (V46, 1 beat/s at ×1) | 3.0–3.4 m/s, a jog | 1.5–1.7 m/s, a brisk walk | 1.0–1.1 m/s, a stroll |
| A person relative to screen height (reference game on its screen: 12.5%) | 4% | 8% | 12% |
| A cell-thick wall (DF construction) | 3 m thick | 1.5 m thick | 1 m thick |
| An 8×5 m house (the scene's), exact / cells blocked | 2.7×1.7 / 3×2 | 5.3×3.3 / 6×4 | 8×5 / 8×5 |

The subjects the user asked about. Columns: sprite span in cells, then what it occupies. A creature always stands in one cell (V44); "body" is the cells its ground footprint covers.

| | A | B | C |
|---|---|---|---|
| Person | 0.6×0.5, stands in 1 | 1.1×1.0, stands in 1 | 1.7×1.6, stands in 1 |
| Deer | 0.8×0.9, body 1×1 | 1.7×1.8, body 1×1 | 2.5×2.8, body 2×2 |
| Horse | 1.0×1.0, body 1×1 | 1.9×2.1, body 2×2 | 2.9×3.1, body 2×2 |
| Oak | 1.5×1.5, blocks 1×1 (trunk) | 3.0×3.0, blocks 1×1 | 4.5×4.4, blocks 1×1 |
| Boulder | 1.2×0.9, blocks 1×1 | 2.4×1.9, blocks 1×1 | 3.6×2.8, blocks 2×1 |
| House (8×5 m) | 3×2 cells | 6×4 cells | 8×5 cells |

Every subject (`--table`). Shape:frame is in the reference data (read-only, nothing ships). The footprint is in reference tiles × height in lifts. Each candidate column gives sprite px / span in cells / what it occupies.

| Subject | Shape:frame | Footprint × height | 1× sprite | A | B | C |
|---|---|---|---|---|---|---|
| man | 265:16 | 1×1 × 4 | 27×25 | 27×25 / 0.6×0.5 / 1 | 54×50 / 1.1×1.0 / 1 | 81×75 / 1.7×1.6 / 1 |
| woman | 452:16 | 1×1 × 4 | 26×25 | 26×25 / 0.5×0.5 / 1 | 52×50 / 1.1×1.0 / 1 | 78×75 / 1.6×1.6 / 1 |
| child | 471:16 | 1×1 × 3 | 19×18 | 19×18 / 0.4×0.4 / 1 | 38×36 / 0.8×0.8 / 1 | 57×54 / 1.2×1.1 / 1 |
| guard | 720:16 | 1×1 × 4 | 28×26 | 28×26 / 0.6×0.5 / 1 | 56×52 / 1.2×1.1 / 1 | 84×78 / 1.8×1.6 / 1 |
| hare | 811:16 | 1×1 × 2 | 15×15 | 15×15 / 0.3×0.3 / 1 | 30×30 / 0.6×0.6 / 1 | 45×45 / 0.9×0.9 / 1 |
| fowl | 498:16 | 2×2 × 2 | 15×14 | 15×14 / 0.3×0.3 / 1 | 30×28 / 0.6×0.6 / 1 | 45×42 / 0.9×0.9 / 1 |
| deer | 502:16 | 3×3 × 4 | 40×44 | 40×44 / 0.8×0.9 / 1 | 80×88 / 1.7×1.8 / 1 | 120×132 / 2.5×2.8 / 1 (body 2×2) |
| wolf | 537:16 | 2×2 × 2 | 19×28 | 19×28 / 0.4×0.6 / 1 | 38×56 / 0.8×1.2 / 1 | 57×84 / 1.2×1.8 / 1 |
| sheep | 970:16 | 2×2 × 2 | 20×22 | 20×22 / 0.4×0.5 / 1 | 40×44 / 0.8×0.9 / 1 | 60×66 / 1.3×1.4 / 1 |
| horse | 727:16 | 4×4 × 4 | 46×50 | 46×50 / 1.0×1.0 / 1 | 92×100 / 1.9×2.1 / 1 (body 2×2) | 138×150 / 2.9×3.1 / 1 (body 2×2) |
| ox | 500:16 | 4×4 × 4 | 42×48 | 42×48 / 0.9×1.0 / 1 | 84×96 / 1.8×2.0 / 1 (body 2×2) | 126×144 / 2.6×3.0 / 1 (body 2×2) |
| troll | 533:16 | 2×2 × 5 | 36×32 | 36×32 / 0.8×0.7 / 1 | 72×64 / 1.5×1.3 / 1 | 108×96 / 2.3×2.0 / 1 |
| giant | 501:16 | 3×3 × 5 | 53×45 | 53×45 / 1.1×0.9 / 1 | 106×90 / 2.2×1.9 / 1 | 159×135 / 3.3×2.8 / 1 (body 2×2) |
| oak | 181:1 | 2×2 × 7 | 72×71 | 72×71 / 1.5×1.5 / 1×1 | 144×142 / 3.0×3.0 / 1×1 | 216×213 / 4.5×4.4 / 1×1 |
| pine | 306:1 | 3×3 × 7 | 65×61 | 65×61 / 1.4×1.3 / 1×1 | 130×122 / 2.7×2.5 / 1×1 | 195×183 / 4.1×3.8 / 2×2 |
| fruit tree | 453:4 | 1×1 × 7 | 67×64 | 67×64 / 1.4×1.3 / 1×1 | 134×128 / 2.8×2.7 / 1×1 | 201×192 / 4.2×4.0 / 1×1 |
| bush | 672:0 | 1×1 × 6 | 29×28 | 29×28 / 0.6×0.6 / 1×1 | 58×56 / 1.2×1.2 / 1×1 | 87×84 / 1.8×1.8 / 1×1 |
| stump | 313:1 | 2×2 × 2 | 45×29 | 45×29 / 0.9×0.6 / 1×1 | 90×58 / 1.9×1.2 / 1×1 | 135×87 / 2.8×1.8 / 1×1 |
| boulder | 342:1 | 3×2 × 4 | 58×45 | 58×45 / 1.2×0.9 / 1×1 | 116×90 / 2.4×1.9 / 1×1 | 174×135 / 3.6×2.8 / 2×1 |
| campfire | 825:1 | 2×1 × 1 | 13×11 | 13×11 / 0.3×0.2 / 1×1 | 26×22 / 0.5×0.5 / 1×1 | 39×33 / 0.8×0.7 / 1×1 |
| bed | 696:0 | 5×3 × 1 | 45×31 | 45×31 / 0.9×0.7 / 1×1 | 90×62 / 1.9×1.3 / 2×1 | 135×93 / 2.8×1.9 / 3×2 |
| chest | 800:0 | 2×2 × 1 | 22×15 | 22×15 / 0.5×0.3 / 1×1 | 44×30 / 0.9×0.6 / 1×1 | 66×45 / 1.4×0.9 / 1×1 |
| barrel | 819:0 | 1×1 × 2 | 21×21 | 21×21 / 0.4×0.4 / 1×1 | 42×42 / 0.9×0.9 / 1×1 | 63×63 / 1.3×1.3 / 1×1 |
| wall piece | 869:0 | 4×1 × 5 | 53×28 | 53×28 / 1.1×0.6 / 1×1 | 106×56 / 2.2×1.2 / 2×1 | 159×84 / 3.3×1.8 / 2×1 |
| door | 270:0 | 4×1 × 5 | 53×26 | 53×26 / 1.1×0.5 / 1×1 | 106×52 / 2.2×1.1 / 2×1 | 159×78 / 3.3×1.6 / 2×1 |

"Blocks" is the reference footprint rounded up to whole cells. A tree blocks with its trunk, not its crown. In UF, walls and doors are one cell each whatever the reference piece length (DF construction, §7.3). Frames: people and animals use 16, the front view in the stored south-facing block; objects use the frame that reads best (oak 1 = summer green, stump 1 = unburnt, boulder 1 = grey, campfire 1 = lit, fruit tree 4 = with fruit).

## 6. Recommendation (before the user's decision): candidate B (a person about one cell tall), redrawn at full detail
**B: one cell ≈ 1.5 m on the ground (32 screen px per metre). A standing adult is ≈ 50 px feet to crown as drawn with the lean, about one cell. Every shape is drawn at twice the reference game's proportions, at full detail and one density.** Size rule for art: take the reference shape's size, double it, and draw that size at 1 px detail. Never upscale.

Reasons, tied to the user's words:
1. **"Some things get smaller than 1 grid square and some things get larger."** B is the candidate where that sentence describes the lineup. Hares, fowl, children, bushes, chests, barrels, campfires and every ground item are smaller than a cell. People are about a cell. Deer, horses, oxen, trolls, giants, trees, beds, boulders and houses are larger. At A nearly everything alive is smaller than a cell, and only tree crowns and buildings are larger. At C even an average person overhangs the cell behind them.
2. **"Coherent and at proper scale."** B fits the DF half of the game without distortion. One person per cell is natural when a cell is about a person's height across. A unit stepping one cell per beat moves at 1.5–1.7 m/s, a walking pace, where A jogs at 3 m/s. A cell-thick wall is 1.5 m (thick masonry, drawn as a wall about 0.5 m thick through the cell; §7.3), where A's would be 3 m. A two-cell room is 3 m across. At C the world shrinks to about 260 m across for several factions (V18), and horses 3 cells long overlap two neighbours at one creature per cell.
3. **"Highest resolution / level of detail that makes sense."** B gives every figure four times the pixels of the reference art (2× both ways) at the fixed density. A person has room for a face, hands, clothing tiers, a held weapon and readable attack and work poses (V41, V58). A caps detail at the reference game's 25 px figure. C's 75 px figure is more detail than the screen can show often: at zoom 1 a camp no longer fits on screen.
4. **"Fantasy realism on a small scale."** B is still small: a person is 8% of the screen's height, less than the reference game's 12.5% on its own screen. The view is 17 cells wide at one person per cell, and it shows a 26×20 m patch of a 400 m world. A is smaller still (4%), small enough that the figures stop reading at zoom 1 and need the zoom-in routinely.
5. **Practical.** People fit a 64×64 frame. The layered sheet (AR-600) keeps its grid with a larger frame. Items stay inside 48×48 frames. Most objects keep a 1-cell blocking footprint (trees, bushes, boulders, campfires, chests, barrels, walls, doors); only beds, tables, workshops and similar need multi-cell footprints.

What B costs, stated plainly:
- **No stand-in is at B today.** Until Gemini's art exists, the U7 stand-ins would be shown as exact 2× nearest-neighbour copies of their 1× shapes: coherent in scale, visibly chunky, and flagged `placeholderScale: 2` so UF_Look says "placeholder enlargement". That is a temporary break of U2's "no chunky next to fine" whenever a finished asset stands next to a placeholder. The user should say whether that is acceptable during development (§10).
- **Every brief in `docs/asset_briefs` that draws a thing in the world changes size** (§9).

The strongest case for each alternative, so the user can overrule knowingly:
- **A** is the reference game's own scale. Its whole library is already coherent at the fixed density, so the game could look coherent immediately with exact 1× stand-ins, and it is the literal "small scale". Its costs: 3 m cells (thick walls, a jog per beat, one person per 3 m square), figures that need a zoom-in to read, and detail capped at the reference level.
- **C** matches the reference game's on-screen proportion (a person 12% of the screen height) and gives the most detail. Its costs: a 260 m world, 1 m-per-second movement, horses and trees 3–4.5 cells across, the camp not fitting the screen at zoom 1, and the largest art frames (a tree about 216 px).

## 7. What the recommended scale needs from the engine
Everything below is data-driven: sizes come from sidecars and catalog footprints, so the same code serves A, B or C. The examples use B's numbers. No code was written in this task. The owners follow AGENTS.md; files that other runs are editing today are marked **(in flight)**, and their changes wait for those runs to land.

### 7.1 Catalog fields (`game/data/UF_WorldCatalog.json`)
| Where | Field | Meaning |
|---|---|---|
| `objects[]` | `footprint: [w, h]` | Cells the object occupies, default `[1, 1]`. The **anchor cell** is the footprint's bottom-right cell, the reference game's hotspot convention (GUIDE_25D §2): it holds the type in the object grid, and the other cells are parts (§7.3). Examples at B: `floor_straw` (the straw bed) `[2, 1]`, a table `[2, 1]`, the workshops (furnace, smithy, bowyer, fletcher, tanning rack) `[2, 2]` (3 m square; DF uses 3×3 tiles). Trees, bushes, boulders, campfire, chest, barrel, walls and doors stay `[1, 1]`. |
| `objects[]` | `spacing: n` (optional) | World generation keeps at least `n` free cells (Chebyshev) between this object and others with a shared tag (`tree`). At B, trees get 1 so crowns (3 cells across) overlap at their edges instead of forming a solid mat. |
| `objects[]` | `rotations` (later) | Not needed for the first pass. A bed or table turned 90° is a second catalog entry with the transposed footprint, as the reference game stores turned walls and doors as separate shapes. |
| `wildlife.species[]`, `people[species]` | `size: { class, body: [w, h] }` | `class` picks the frame size (§7.2): `tiny`, `medium`, `large` or `huge`. `body` is the cells the body's ground footprint covers, used only for picking and markers; the unit still stands in one cell (V44). At B: hare, fowl and rat are `tiny` with body `[1,1]`; people, sheep, wolf and fox are `medium`, `[1,1]`; deer and troll are `large`, `[1,1]`; horse, ox and aurochs are `large`, `[2,2]`; the giant is `large`, `[2,2]`. People may also give it per age stage (`stages.child.size`) for AR-601. |
| same | no `scale` field | A catalog scale multiplier would resample art and break the fixed density. Art is drawn at its size. The only multiplier allowed is the integer `placeholderScale` of a stand-in's sidecar (§7.2). |
| `items.types[]` | `icon` (new) next to `image` | `image` is the thing lying on the ground, drawn at true scale (at B a log is about 48 px long, a berry 2–3 px, a sword about 30 px). `icon` is the inventory-grid picture (V59), a UI asset at icon size and not world scale, so small things stay readable in the grid. |
| `camera` (new, optional) | `levels`, `startLevel` | See §7.10, if the camera levels should live in data rather than in the plugin parameter. |

`tools/check_catalog.js` gains rules: footprints are positive integers ≤ 4; a species' `size.body` fits its class; every `image` has a sidecar whose `footprint` equals the catalog's; no `scale` field anywhere.

### 7.2 Sidecar format (`img/characters/<name>.json`)
Existing fields stay: `frameWidth`, `frameHeight`, `anchor`, `facings`, `animations`, `layer`, `species`, `stage`. Changes:
- `frameWidth`/`frameHeight`: sized to the size class, no longer always 48. Suggested at B, a multiple of 16 with room for the up-left lean, from the B lineup's sprite sizes:
  - `tiny` 48×48: items, bushes, hare 30×30, fowl 30×28.
  - `medium` 64×64: people 54×50, sheep 40×44, wolf 38×56.
  - `large` 112×112: deer 80×88, troll 72×64, horse 92×100, ox 84×96, giant 106×90.
  - `huge` 160×160: trees (the oak is 144×142 including its roots).
- `anchor: [ax, ay]`: the frame pixel that is the **bottom-centre of the ground footprint**, as ART_STANDARD U3 says. It is no longer always `[24, 47]`. Leaning art needs its anchor toward the lower right of the frame: in the reference shapes, the footprint's bottom-right corner is the frame's bottom-right pixel for people and animals, and the crown and body lean up-left from there.
- `footprint: [w, h]`: in cells. Must equal the catalog's (checked).
- `sizeClass` (units): must equal the catalog's `size.class`.
- `placeholderScale: k` (stand-ins only, integer): the file holds the 1× shape enlarged k× by nearest neighbour. UF_Look shows "placeholder enlargement ×k". `tools/art_check.js` fails any master that has it.

### 7.3 The object grid: footprint cells without a second grid
`$dataMap.ufObjects` (a Uint16Array, one value per cell, saved as diffs by UF_World) keeps the type number in the anchor cell. Each other cell of a footprint holds a **part** value: `0x8000 | (dx << 6) | dy`, where `(dx, dy)` is the step from the part to its anchor (the anchor is bottom-right, so both are ≥ 0 and < 64). Type numbers stay below `0x8000`, and the catalog has about 60.

Why this encoding: every existing "is anything on this cell" test treats a nonzero value as occupied, and those stay correct with no edit, for example `UF_Roads.js` line 751 (`!$dataMap.ufObjects[i]`). Counts of objects must count anchors only (value below `0x8000`), or they count a bed twice: `UF_WorldGen.js` line 756 (the `objects_placed` stats check) and `UF_Roads.js` line 723. Readers that turn the value into a catalog entry need the part-aware accessor, so they don't index `objs[0x8000 + …]`:
- `UF.World.getObject(ax, ay, x, y)` stays raw. New: `UF.World.objectAt(ax, ay, x, y)` → `{ typeId, anchor: {x, y} }` or `null`, which resolves parts.
- `UF.Objects.typeIdIn`, `at`, `atIn`, `describe`, `blocks` and `blocksIn` resolve parts.
- Readers to switch (grep of 2026-09-19): `UF_History.js` 1876 and 1910 (in flight); `UF_WorldGen.js` 928 and 1082–1093 (in flight); `UF_Roads.js` 114 (wall type compare); `UF_Colonists.js` 375 (its grid accessor, in flight). `UF_Fire.js` 334–342 indexes campfire cells by type; it stays correct while fire sources are 1×1, and indexes anchors only if one ever is larger.
- Saves: parts are written through `UF.World.setObject` like anchors, so the diffs carry them. Save size grows only by the multi-cell objects' extra cells.

### 7.4 UF_Objects
- `set(x, y, id)` places the anchor at (x, y), the bottom-right cell, and writes the parts. It refuses (returns `false`, changes nothing) when a footprint cell is off the map, is water (unless `onWater`), or holds another object or part. `set` on any part cell with `null` removes the whole object, anchor and parts.
- `at`, `typeIdAt`, `describe`, `blocks`, `apply` and `find` accept any footprint cell and act on the anchor. `find` returns anchor cells with `dist` measured to the nearest footprint cell, plus `footprint`. `apply` drops yields on the anchor cell. `becomes` must have the same footprint as the object, or the change is refused and reported. A felled tree's stump keeps the trunk cell.
- Blocking: `Game_Map.isPassable` (already aliased) blocks every footprint cell of an impassable object.
- Drawing: one sprite per object, at its anchor. The sidecar anchor pixel sits on the footprint's bottom-centre: `x = (anchorX − w + 1 + w/2) × 48`, `y = (anchorY + 1) × 48` in tilemap pixels. z is the foot row of the footprint's bottom edge. For equal rows the one further east draws in front (GUIDE_25D §3.4); `Tilemap._compareChildOrder` gets an alias for UF sprites.
- View culling: today it adds 6 extra rows above for tall canopies. It becomes the largest sidecar frame in the catalog: at B a tree's frame reaches 3–4 cells above and 3 cells left of its anchor.
- Canopy cutaway (GUIDE_25D §3.6): when a unit stands under a crown that is drawn in front of it, the crown fades. At A that matters little; at B the crowns cover 3×3 cells, so it is needed for play. The rule itself is for the user to decide, as GUIDE_25D §3.6 already notes.

### 7.5 UF_WorldGen (in flight: another run edits it now)
- Placement (§3.6 of WORLD_ARCHITECTURE): a cell takes an object only if its whole footprint is free land, not water (unless `onWater`), not in the start clearing, and not a site cell. The biome and chance are evaluated at the anchor cell.
- Order: multi-cell objects first, then 1×1. Then `spacing` is enforced against already-placed objects with a shared tag.
- Density retune for B: with one trunk per cell, 3-cell crowns stack into a wall. Tree chances drop so forest trunks stand about every 2–3 cells. A new stats check reports the share of forest cells under a crown.
- Kit and map kit (§3.8) and site stamping (§3.7) use the same `canPlace(footprint)` test. Site discs clear the footprints of their pieces.
- Budget: the footprint test is `w × h` reads per candidate. The map build must stay ≤ 1.5 s (V50, measured by the worldgen perf check).

### 7.6 UF_World and pathing (UF_World in flight)
- Units: one cell each for movement, unchanged (V44, DF). A horse's 2×2 body overhangs its neighbours visually but blocks only its own cell.
- On-screen steps use `Game_Map.isPassable`, which already asks UF_Objects, so footprints block automatically.
- Off-screen steps (`stepOffscreen`) and the whole-area pathfinder that the in-flight run is building must ask `UF.Objects.blocksIn(area, x, y)`, never read `ufObjects` raw. With the §7.3 encoding a raw nonzero test still blocks parts correctly; a raw type lookup does not.
- Work adjacency (UF_Jobs "stand beside it"): beside **any** footprint cell. The job's standing cell is the nearest free cell around the footprint, not around the anchor only.

### 7.7 UF_Interact and UF_Look
- Any footprint cell addresses the object: `optionsFor(x, y)` and `describeCell(x, y)` go through the part-aware `UF.Objects.at`. A right-click on the far end of a bed offers the bed's actions.
- **Pixel picking** for overhangs: at B a crown covers 3×3 cells, but only one of them is the tree's cell. The mouse first tests the sprites under the pointer, front to back, against a 1-bit alpha mask per frame (built once per bitmap and frame, cached). The first opaque hit wins; the cell is the fallback. Clicking a tree's crown then selects the tree, and clicking a horse's head selects the horse (V34, "everything is clickable").
- "Build here ▸" greys out objects whose footprint doesn't fit at the pointer and shows the footprint as a ghost outline. Designation markers outline the whole footprint, not one cell.
- The art line of the tooltip adds "placeholder enlargement ×k" for sidecars with `placeholderScale`.

### 7.8 UF_Stance and the selection marker
- The marker is sized to the creature: its body footprint (`size.body` in cells), centred on the centre of the unit's cell, at least one cell. At B that is 48×48 for people, deer and wolves, and 96×96 for horses, oxen and the giant.
- The generated bitmaps (`UF_GenStance_<stance>`, 48×48 today, `SIZE = 48` at `UF_Stance.js` line 43) become one bitmap per size, or a 9-slice drawn to size, keeping the same fill and outline rule.
- The Overseer's pulsing selection square follows the same rule. z stays at the foot row − 50 (WORLD_ARCHITECTURE §4).

### 7.9 UF_Anim
- Ghosts and remains already copy the unit's own frame (bitmap and frame rectangle). With frames of any size they are at the unit's scale, provided the rectangle comes from the sidecar's `frameWidth`/`frameHeight`, which is already the rule for sheet columns.
- The code collapse rotates the whole 48×48 frame about its centre (known limit in `docs/systems/UF_Anim.md`). It must pivot on the body's ground centre (the sidecar anchor). Its 6 px drop and the 6 px lunge scale with the body: `6 × body height in cells`. A horse's fall should not look like a hare's.
- Placeholders: the ghost and the remains apply the same integer `placeholderScale` as the live sprite.
- View culling margin and the `perf` budget (0.3 ms) are re-measured with 112 px frames.

### 7.10 UF_Camera: zoom levels
Today: levels `[1, 2/3, 1/3]`, start ⅔. Those steps were chosen for 3× art (`docs/systems/UF_Camera.md`: 1 = 3×, ⅔ = 2×, ⅓ = 1×). With one art pixel per screen pixel (U2), no zoom-out step can be exact: ⅔ and ⅓ drop art pixels unevenly (the "sampled" panels). The engine draws character and object bitmaps bilinear (RMMZ's default `Bitmap.smooth = true`). PIXI 5.3's default (`MIPMAP_TEXTURES: 1`, POW2) builds mipmaps only for power-of-two textures, which RMMZ sheets rarely are, so at ⅓ it samples, close to the sampled panel. The ground tilemap renders NEAREST.

Recommended for B: **levels `[2, 1, 1/2, 1/4]`, start 1.**
- 2 is a zoom-in: exact (every pixel doubled), for reading faces, poses and wounds up close. The `zoom2_exact` check proves the 2× view keeps the art exact. On screen a person is 100 px tall.
- 1 is the look the art is drawn for.
- ½ and ¼ are overviews. They land on mipmap levels, so each screen pixel is an exact average of 2×2 or 4×4 art pixels (the "averaged" panels: calm and whole, not shimmering). At ½ a B person is 25 px on screen, the size A shows at zoom 1 (`scale_A_scene_zoom1.png`). At ¼ a person is about 12 px, a figure on its stance square, like A at ½.
- Engine: when the zoom is below 1, character and object bitmaps switch to `PIXI.MIPMAP_MODES.ON` with LINEAR scaling (PIXI 5.3.12 in `game/js/libs/pixi.js`; any texture size under WebGL2, to be measured), and back to NEAREST at 1 and above. The tilemap's render textures have no mipmaps, so the ground stays sampled at ½ and ¼. It is noise-like, but that has to be looked at.
- Checks `level_N_view`, `level_N_mouse` and `zoom_out_shows_more` change numbers (221 → 55, 221, 884, 3536 cells on the 816×624 screen).
- If A is chosen instead: levels `[3, 2, 1, 1/2]`, start 2, because A's figures need the zoom-in to read. If C is chosen: `[1, 1/2, 1/4]` plus a zoom-in of 2 only for inspection.

### 7.11 Other plugins touched
- **UF_Perspective25D** (the lean, K3): one lift is 4 px at A, 8 px at B, 12 px at C. The GUIDE_25D §3 numbers (12 px per lift, "one cell = 16 native px") were written for 3× art and change with the decision.
- **Units drawn by `Sprite_Character`**: RMMZ centres a `$` frame at the cell's bottom and lifts it 6 px (`shiftY`). UF units need the sidecar anchor (an alias that sets `anchor = (ax / frameWidth, ay / frameHeight)`) and a `shiftY` of 0, so the footprint's bottom-centre sits on the cell's foot row.
- **UF_Items**: ground items keep 48×48 frames and draw at true scale. The inventory grid (V59) uses `icon`.
- **UF_Doors / walls**: one cell each (DF). The connected wall sets (`!$WallStone_Set`, `!$WallWood_Set`, 16 shapes) are redrawn at B as walls about 0.5 m (16 px) thick through the cell, as tall as the reference wall (5 lifts, a 40 px lean up-left at B), with a door leaf to match.
- **UF_Jobs / construction**: a multi-cell building (a workshop `[2,2]`) takes its materials on the anchor cell and shows the whole footprint as the planned ghost (DF_MECHANICS §10).
- **UF_Fire, UF_Roads, UF_History, UF_Colonists**: switch the raw type lookups listed in §7.3.

### 7.12 Tools
- `tools/art_check.js`: the 3×-grid rule (`SCALE = 3`, the `grid` check) is replaced by its opposite for masters. **Fail any master in which every k×k block, at some alignment, is one colour for some k ≥ 2** (an integer upscale, which is what the stand-in recovery detects): that catches an upscale sold as fine art (U2). Flat areas in real 1× art don't trip it, because the rule needs the whole sprite to be blocks. Frame size must match the sidecar and size class; the anchor must lie inside the frame.
- `tools/check_briefs.js`: the Anchor WARN rule (line 250, accepts only `[24, 47]` or "none") accepts `[ax, ay]` inside the brief's frame. The embedded `EXEMPLAR` (the oak brief) is rewritten at the new size.
- `tools/build_scale_lineup.js` stays as the scale reference: its B or C lineup, at exact sizes, is the size yardstick attached to every brief.

### 7.13 Checks to add (each must be seen failing once)
- `objects`: `footprint_blocks_all` (a 2×1 bed blocks both cells, both directions); `part_addresses_anchor` (describe, apply and set-null on the part cell act on the whole bed); `set_refuses_overlap` (a bed over a tree returns false and changes nothing); `drawn_once` (one sprite for a multi-cell object, anchored at the footprint's bottom-centre ±1.5 px); `persists_footprint` (area reload and save round-trip keep anchor and parts).
- `worldgen`: `footprints_fit` (no part on water or over another object on 3 seeds); `spacing_kept`.
- `look`: `options_on_part_cell`; `pixel_pick_crown` (the mouse over a crown pixel two cells up-left of the trunk selects the tree).
- `stance`: `marker_sized_to_body` (a horse's marker is 96×96 at B, a hare's 48×48).
- `anim`: `ghost_frame_size` (a 112×112 unit's ghost uses its 112×112 frame and pivots on its anchor).
- `camera`: `zoom_in_exact` (at level 2 a sampled screen pixel equals the art pixel it doubles); `zoom_out_averaged` (at ½ a screen pixel equals the mean of its 2×2 art pixels within 2 per channel).

### 7.14 Order of work
1. The user picks A, B or C (and answers §10).
2. Claude Code: VISION V44 row, ART_STANDARD §3, §5 and §6, GUIDE_25D §3 numbers, AR-600 frame sizes, the catalog fields (§7.1) and checker rules (§7.1, §7.12), the grid encoding and UF_Objects (§7.3–7.4), after the in-flight runs on UF_World, UF_WorldGen, UF_History and UF_Colonists have landed.
3. Re-export the stand-ins as exact integer copies of their 1× shapes at the chosen size, with `placeholderScale`, so the screen is at one scale while art is made.
4. Rewrite the briefs (§9) segment by segment, style anchors first (SEG-01).
5. Gemini draws at the new size. Claude Code checks each delivery against its brief and against the lineup (size ±5%).

## 8. Measurement method and checks
The tool decodes each shape from the reference data at 1×. Its decoder is the algorithm of `decodeShape()` in `tools/generate_all_u7_assets.js`, which can't be required, because loading it writes into the project. It reads footprints and heights from `TFA.DAT`, uses an exact 3× stand-in when one exists (none of the 25 subjects has one), and composes every image in code: grass, grid, labels, a 5×7 pixel font. There is no `Math.random`; the forest scatter is a seeded hash.

`RESULT PASS 50/50 checks` on 2026-09-19. Each check was provoked once with `--provoke <name>` and failed:

| Check | What it proves | Provoked FAIL line (quoted) |
|---|---|---|
| `decoder_matches_earlier_decode` | The decoder gives the same pixels as the earlier tool's `scratch/u7_nature/shape_181.png` (0 of 72×70 differ) | `FAIL scale.decoder_matches_earlier_decode: shape 181 frame 0: 72x70, 1 pixels differ from scratch/u7_nature/shape_181.png` |
| `recovery_uniform_blocks` (7) | Each exact 3× export is whole 3×3 blocks | `FAIL scale.recovery_uniform_blocks: !$U7_CaveLadder.png frame (col 1, row 0) 96x96: 175/176 3x3 blocks uniform at offset (0,0)` |
| `recovery_matches_decoder` (7) | Recovering 1× from them gives a decoded frame of the shape the sidecar names (allowing for frame clipping) | `FAIL scale.recovery_matches_decoder: !$U7_CaveLadder.png recovered to 1x (16x15 opaque) != any of frames 0-31 of shape 706 (as is or transposed, allowing for frame clipping)` |
| `shapes_decoded` (25) | Every subject decodes to a real frame | `FAIL scale.shapes_decoded: boulder: shape 688 frame 1: 1x1 frame, opaque none; footprint 3x2 tiles, height 4 lifts (decoded)` |
| `person_height` | The man is a standing adult frame (20–40 px) | `FAIL scale.person_height: the standing man at 1x is 14 px tall (a standing adult frame in the reference data is 20-40 px; outside that the wrong frame or shape was read)` |
| `lineup_A_exact` | In `scale_A_lineup.png` the man's 291 art pixels appear 1:1 | `FAIL scale.lineup_A_exact: scale_A_lineup.png: 61/291 of the man's art pixels appear 1:1 at the placed position (one art pixel = one screen pixel)` |
| `lineup_enlargement_integer` (2) | B and C placeholders are whole 2×2 and 3×3 blocks | `FAIL scale.lineup_enlargement_integer: scale_B_lineup.png: 0/291 of the man's art pixels are whole 3x3 blocks (placeholder enlargement by an integer, nearest neighbour)` |
| `zoom2_exact` | The zoom-2 view equals the zoom-1 world, each pixel doubled (49 504 sampled pixels) | `FAIL scale.zoom2_exact: scale_A_scene_zoom2.png: 31341/49504 sampled screen pixels equal the zoom-1 world pixel they magnify (integer zoom-in keeps the 1x art exact)` |
| `caption_present` (4) | Every B and C image carries the placeholder caption band top and bottom | `FAIL scale.caption_present: scale_B_lineup.png: caption band colour covers 0% of a row near the top and 0% near the bottom (the placeholder caption is on the image)` |
| `outputs_written` | All 10 files exist; the scenes are 816×624 | `FAIL scale.outputs_written: missing: scale_D_lineup.png` |

## 9. The 223 briefs in `docs/asset_briefs`: what changes in each field
The briefs were written for "fits one 48×48 square, anchor `[24, 47]`". Per field, if B (or C) is chosen:

| Field | Today | Change |
|---|---|---|
| Heading `### id — Name (AR-nnn)` | | None. |
| **Category** | | None. |
| **Dimensions** | "fits inside one 48×48 screen-pixel square …; the drawn shape is W px wide and H px tall" | "drawn at the world scale of `docs/design/SCALE.md` (candidate B: 32 px per metre on the ground, a person ≈ 50 px); the drawn shape is W×H px; frame FW×FH (size class); footprint w×h cells". W and H come from the lineup at the chosen size (the reference shape ×2 at B), not from the 48 box. The checker's `<W>×<H>` rule is still met. |
| **Anchor** | "bottom-centre of the cell `[24, 47]`" | "bottom-centre of the ground footprint, frame pixel `[ax, ay]`". For leaning art the anchor sits toward the frame's lower right. Checker rule 250 is updated to match. |
| **Projection** | 45° up-left lean, 1 px up and 1 px left per unit of height | Same rule, with the lean given in the reference game's height units: one lift is 8 px up and 8 px left at B (4 at A, 12 at C). A person (4 lifts) leans 32 px, a wall (5 lifts) 40 px, an oak's trunk box (7 lifts) 56 px, and its crown image rises beyond that. |
| **Reference** | a 48×48 reference square (`art/u7_reference_squares/…_48.png`, some shrunk: the oak to 0.67) | Size: the lineup (`game/test_output/scale_B_lineup.png` and the 1× shape it names). The shrunk reference squares are no longer a size reference, only a style reference, because they are at mixed scales. "A reference only; nothing copied ships" stays. |
| **Palette Ramps** | | None (fixed palette). At B there is room for one or two more ramp steps; the 32-colour WARN stays. |
| **Primary State Visual Description** | pixel coordinates inside the 48 box ("root flare on rows 40–47, columns 30–40"); "nothing touches row 0 or columns 46–47" | Every coordinate is rewritten in the new frame and proportions. This is the largest edit, one paragraph per brief. The containment sentence becomes "contained in its FW×FH frame". |
| **Interaction / Transformed State** | states from the catalog | Mostly none. Multi-cell objects add their unbuilt state (the footprint's ghost). A stump keeps its tree's trunk cell. |
| **Readability Check** | "at zoom ⅓ …" | At the new levels: ½ and ¼ averaged, and the zoom-in 2. Also "next to the person at true size in the lineup". |
| **Deliver** line | "(48×48, magenta background) + … (frameWidth 48, frameHeight 48, anchor [24, 47], footprint [1, 1] …)" | The frame size, `anchor`, `footprint`, `sizeClass` and, for multi-cell objects, the catalog footprint. |
| Segment "How to work this segment" blocks | items 1 (the 48 square), 4 (sidecar 48/`[24,47]`), 6 (contained in the square), 10 (export) | Rewritten once per segment. The same goes for `INDEX.md` and `README.md` (the style paragraph). |

By segment (brief counts from the `### ` headings; 223 in total):
- **Size and coordinates change** (the thing is drawn in the world): SEG-00 (14), SEG-01 (4), SEG-02 trees (14), SEG-03 bushes and plants (18), SEG-04 stone (11), SEG-05 buildings (6), SEG-08 grazers (8), SEG-09 predators (9), SEG-10 monsters (6), SEG-11 people (13), SEG-17 equipment layers (10, they follow the person frame), SEG-18 combat gear and workshops (33: the layers follow the person frame, the workshops get footprints). 146 briefs.
- **Frame stays 48×48, drawn size changes to true scale, and a separate icon is added:** SEG-06 and SEG-07 items (27).
- **Frame stays, texture features re-sized in metres** (blades, pebbles, ripples at 1.5 m per cell instead of the old implied size): SEG-13, SEG-14 ground (22), SEG-15 water (9). 31 briefs.
- **Unchanged:** SEG-12 faces (7) and SEG-16 UI (12). The exceptions are the three stance-square briefs and the target square, which gain a body-sized version (9-slice or 96×96).

## 10. Decisions for the user
1. ~~**The world scale: A, B or C**~~ **Answered by the user** (V44, 2026-09-19): a grown person fills roughly one 48 px square, sizes as in the generator prompts' §4 table (see Status). V44's row records it; no px-per-metre figure was set.
2. **Stand-ins during development at B or C:** accept exact 2× (or 3×) nearest-neighbour copies of the 1× shapes as placeholders, flagged `placeholderScale` and replaced as art arrives, even though finished art will stand next to them for a while? The alternative is to keep today's resampled 48×48 files, which are neither at one scale nor at one density (§3).
3. **V15 says "Zoom steps keep pixel art exact."** At one art pixel per screen pixel, only zoom-ins can be exact. Recommendation: exact integer zoom-in (2), and averaged (mipmapped) zoom-outs at ½ and ¼ (§7.10).
4. **VISION V2 still says "every asset inside one 48×48 square"** while V44 (revised later the same day) says things may be larger or smaller than a cell. ART_STANDARD §3 ("frame 48×48 for everyone"), §5 step 4 and §6, GUIDE_25D's banner and §3, the 223 briefs and `tools/check_briefs.js` follow the 48 rule. They need the user's scale decision before Claude Code rewrites them.
5. **Canopy cutaway** (GUIDE_25D §3.6): at B crowns cover 3×3 cells, so a unit behind a tree is hidden more often. Choose the fade rule when the object work starts.
6. **How far may trees and large animals be compressed?** (added 2026-09-19 with the Status section.) The prompts' table puts an oak at 80–96 px next to a 44–48 px person: about 3.7 m tall at the person's scale, where a real oak is 15–25 m. The horse is 72 px long, about 2.8 m, which is close to true. This is the FF6 manner (V2) and a departure from "coherent and at proper scale" for trees only. The user may keep it or ask for taller trees (for example 3–4 squares, 96×192 frames).

## 11. Known limits of this lineup
- Metres are estimates (person 1.75 m; reference tile 0.5 m). The two measures differ by about 12%, and both are shown.
- One facing only (the south front view, frame 16) for units. A horse seen from the side would be longer. Reference animals are drawn along the 45° diagonal, so their front view already shows most of the body.
- B and C are shown with placeholder enlargements. Real art at those sizes will have finer detail than the images show; the images only settle size.
- The zoom-out panels are emulations: "sampled" is nearest-neighbour. The engine's bilinear sprites without mipmaps and its NEAREST tilemap are close to it but not identical. "Averaged" is an area average, what mipmaps give.
- In the scenes, walls and the door sit contiguously on reference tiles (4 tiles = 32 px at A). In the engine, walls are one per cell, and A would need wall art 48 px long per cell. At B, 1.33 reference pieces make a cell.
- The forest density in the scenes is arbitrary (one chance per 3 m block). It shows context, not the worldgen density.
- Nothing here ran in the RMMZ editor (no game code changed). The decoder proof depends on `scratch/u7_nature/shape_181.png`; if that file is removed, the first check fails by design.
