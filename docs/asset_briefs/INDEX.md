# Asset briefs: index (written 2026-09-18 by Claude Code)

## What this is
The user's instruction of 2026-09-18 (night): "Give me prompts in this format" (Gemini's own schema, `art/briefs/FABLE_ASSET_BRIEF.md` §6) and "add instructions for every single asset we need so Gemini can work on them in segments … in a file the agent can read". This folder is that: one `SEG-<nn>_<family>.md` file per family of assets, each a list of briefs in that schema with the precisions listed under "Rules that override Gemini's own brief file" below. **The brief is the spec; the request table in `docs/ASSET_REQUESTS.md` is the queue and the status.** Every SEG file opens with a "How to work this segment" block; read it before its first brief.

The style (user decisions of the same night; `docs/VISION.md` V2, V9, V44; `docs/ART_STANDARD.md` is binding): high-resolution 2.5D oblique art in the manner of the reference squares, every asset inside **one 48×48 screen-pixel square at native resolution** (1 art pixel = 1 screen pixel at zoom 1; no 16×16 upscaling), the daylight palette `art/palette/uf.hex` (256 colours, palette-only), height leaning **up and to the left at 45°** so the top, south and east faces are visible (`docs/GUIDE_25D.md`; W and E facings transposed, never mirrored), 1-px micro-dithered shading, flat magenta `#FF00FF` background on masters, alpha 0 or 255, no baked ground shadow. The reference squares in `art/u7_reference_squares/` (one decoded Ultima VII shape per 48×48 square, listed in `catalog.json` beside them) and the `U7_` files in `game/img/` are the reference and the development stand-ins; **nothing copied from them ships** (AGENTS.md rule 8): the delivered art is original work in that manner.

The user approved the composite `art/review/u7_square_composite.png` on 2026-09-18. Opened for this index: it shows fourteen reference squares (a townsman, two more people, oak, fruit tree, pine, stump, berry bush, boulder, ironstone, hearth, deer, wolf, hare), each contained in one 48×48 tile, above four 16×16-versus-48×48 comparisons (settler, oak, boulder, campfire). Open it before the first brief, and open the reference square each brief names before drawing that asset.

Coverage (`tools/check_briefs.js --coverage`, 2026-09-18 22:11): every one of the **137 catalog ids** has a brief: 49 `objects`, 27 `items.types`, 23 `wildlife.species`, 7 `people`, 22 `groundKinds`, 9 `water.surface` kinds. On top of those, the `anchor_` (4), `ui_` (12), `eq_` (10) and `face_` (7) briefs cover the style anchors, the interface, the equipment layers and the portraits. Fourteen ids are briefed twice (SEG-00 and their family segment: the family segment wins) and the five species with a male and a female brief share one id in SEG-11.

## Segments
| # | File | Briefs | What is in it | Request rows | Status |
|---|---|---|---|---|---|
| 00 | `SEG-00_in_the_world_now.md` | 14 | Start-here subset: what a New Game puts on screen around the home site (tall grass, oak, pine, berry bush, loose stones, stone wall, campfire, straw bed, stockpile marker, human, deer, hare, boar, wolf). Every id here also has a brief in its family segment, which wins where they differ. | AR-102, 103, 104, 105, 400, 401 | OPEN (a reading list: deliver and mark these through their family segments) |
| 01 | `SEG-01_style_anchors.md` | 4 | The four style-lock anchors of ART_STANDARD §5 step 2: `anchor_person` (human adult male), `anchor_tree` (oak), `anchor_wall` (wooden wall), `anchor_ground` (meadow block). | AR-400, 102, 104, 100 | OPEN |
| 02 | `SEG-02_trees.md` | 14 | Thirteen standing trees (oak, birch, pine, snow fir, fruit tree full and picked, flat-top, swamp, mangrove, broadleaf giant, palm, dead, blighted) and the stump they all become. | AR-102 | OPEN |
| 03 | `SEG-03_bushes_and_ground_plants.md` | 18 | Six blocking plants (berry bush full and picked, shrub, desert shrub, snow bush, two cacti) and twelve flat "under" plants (tall grass, reeds, four wildflower patches, fern, lichen, wild grain, wild wheat, lily pads). | AR-103 | OPEN |
| 04 | `SEG-04_stone_ore_ruins.md` | 11 | Loose stones, gravel, granite boulder, the four outcrops (ironstone, copper, gold, crystal) with the small crystals, old bones, rubble, fallen pillar. | AR-104, 022, 044 | OPEN |
| 05 | `SEG-05_buildings_and_camp.md` | 6 | Campfire (unlit and lit), wooden wall set, stone wall set, straw bed, stockpile marker, work stone. | AR-105, 104 | OPEN |
| 06 | `SEG-06_items_a.md` | 14 | Ground items, first half: log, firewood, stone, iron and copper ore, gold nugget, rough and cut gem, iron bar, berries, fruit, mushrooms, root vegetable, seeds. | AR-200 | OPEN |
| 07 | `SEG-07_items_b_tools_clothes.md` | 13 | Ground items, second half: plant fibre, straw, raw and cooked meat, fish, hide, bone, wool, stone axe, stone knife, stone pick, woven wrap, hide cloak. | AR-200, 201 | OPEN |
| 08 | `SEG-08_grazers_and_vermin.md` | 8 | Deer, boar, aurochs, wild horse, wild sheep, hare, wild fowl, rat (AR-600 sheets; south stand frame described). | AR-401 | OPEN |
| 09 | `SEG-09_predators_and_fliers.md` | 9 | Wolf, jackal, fox, arctic fox, wildcat, serpent; hawk, songbird, bat. | AR-401 | OPEN |
| 10 | `SEG-10_monsters.md` | 6 | Giant spider, troll, bog horror, sand stalker, restless dead, ice wraith. | AR-401, 402 | OPEN |
| 11 | `SEG-11_people.md` | 13 | The seven playable species, male and female (automaton once): adult tier-0 body in numbers, clothing tiers and age stages as rules, the AR-600 sheet. | AR-400 (with 501, 600, 601) | OPEN |
| 12 | `SEG-12_faces.md` | 7 | One 576×288 portrait sheet per species (8 busts of 144×144). | AR-700 | OPEN |
| 13 | `SEG-13_ground_tiles_a.md` | 11 | Ground kinds 0–10 as A2 blocks: meadow, lush grass, dry grass, scrub soil, leaf litter, needle floor, jungle floor, tundra, snow, ice, sand. | AR-100 | OPEN |
| 14 | `SEG-14_ground_tiles_b.md` | 11 | Ground kinds 11–21: stony, red clay, bare rock, rock face, mud, swamp mud, dirt, blighted grass, flowering grass, ash, scree. | AR-100, 120 | OPEN |
| 15 | `SEG-15_water.md` | 9 | The nine water kinds as three-frame A1 strips: fresh, pond, marsh, swamp, icy, brackish, salt, deep, blighted. | AR-101 | OPEN |
| 16 | `SEG-16_ui.md` | 12 | Stance squares (3), target square, designation markers, look tooltip, right-click menu, colonist card, ledger and chronicle parts, character-sheet frames, window skin with cursor and buttons, PAUSED and speed badges. | AR-031, 032, 034, 035, 701, 800 | OPEN |
| 17 | `SEG-17_equipment_layers_and_effects.md` | 10 | Held layers for the three stone tools, a wooden shield and a leather cap, clothing tiers 1–3 as torso and legs layers, the work and attack pose contracts, the casting effect. | AR-600, 501 | OPEN |
| 18 | `SEG-18_combat_gear_and_workshops.md` | 18 at 22:11 (still being written) | The art of VISION V55: weapons, shields, helms and armour as layers with ground icons; workshops, ammunition, materials and combat effects promised by its intro. Its ids are not in the catalog yet (only `bar_iron` is) and AR-900–906 have no request rows, so the checker fails every heading until the combat-chains catalog work lands. | AR-900–906 (no rows yet) | OPEN (blocked until the catalog has its ids) |

Gemini updates the Status column per segment: `OPEN` → `IN PROGRESS (since <date>)` → `DELIVERED (<date>)` when every brief's files are in `art/masters/`; a partial segment is `IN PROGRESS (n of m delivered)`. The per-asset status stays in the request row of `docs/ASSET_REQUESTS.md`.

## Working order
1. **SEG-01 first, and alone.** The four anchors are the style lock (ART_STANDARD §5 step 2): `anchor_person`, `anchor_tree`, `anchor_wall`, `anchor_ground`, in that order, each approved by the user in `art/APPROVALS.md` before the next. Nothing from any other segment starts until all four are approved; every later generation attaches the approved anchors as its yardstick.
2. Then, in this order: **SEG-02** trees, **SEG-05** buildings and camp, **SEG-08** grazers and vermin, **SEG-11** people, **SEG-13** ground tiles a, **SEG-16** UI. These are what a New Game shows most of: hundreds of trees, the home site, the herds, the colonists, the ground under all of it, and the markers the player reads.
3. Then the rest in number order: SEG-03, 04, 06, 07, 09, 10, 12, 14, 15, 17.
4. SEG-18 when its ids are in the catalog (its row above).
5. SEG-00 is a reading list, not a work item: use it to see what the first screen needs, deliver through the family segments.

Inside a segment, follow the order its "How to work this segment" block gives; where it gives none, top to bottom. One asset at a time: the south stand frame (or the single frame) is drawn and approved before the other facings and animation columns are built from it (ART_STANDARD §7: the character changes between frames otherwise).

## Delivery procedure (one asset)
1. **Claim** the segment: a line under "In progress" in `docs/STATUS.md` (agent, task, files), and set the segment's Status here to `IN PROGRESS`.
2. **Read** the brief and open what it names: the reference square (`art/u7_reference_squares/<key>_48.png`; the `_48_4x.png` copy shows the pixels) or the stand-in sheet in `game/img/`, and the approved composite. Reference only: nothing copied ships.
3. **Generate** into `art/raw/<id>/` (ART_STANDARD §5 step 3): one view per request, flat magenta `#FF00FF` background, the reference square and the approved anchors attached.
4. **Clean** into the master: `art/masters/<id>.png` + `art/masters/<id>.json`. Masters are **48×48 at native resolution** (or the size the brief's Deliver line gives: 768×192 for an AR-600 sheet of 48×48 frames, 96×144 for an A2 ground block, 288×144 for an A1 water strip, 576×288 for a face sheet, the stated layout for a UI piece), snapped to `art/palette/uf.hex`, magenta removed to alpha 0/255, placed on the anchor `[24, 47]` (bottom centre of the cell; tiles and UI: none). The sidecar carries `frameWidth`, `frameHeight`, `anchor`, `facings`, `animations` and, where the brief says, `layer`, `species`, `stage`, `slot`. No clean tool exists on 2026-09-18 (ART_STANDARD §5 step 4 says "a tool"; `tools/` has none), so this step is by hand in a pixel editor.
5. **Check** with `tools/art_check.js` (below). Paste its lines into the delivery note; write "not checked" for anything not run. Until the tool gets a 48-native mode (STATUS K17), its `grid` check reports every 48-native master; ignore that one line and nothing else (ART_STANDARD §6).
6. **Review**: put the master at 1× and 4× next to the person reference on grass in `art/review/` (ART_STANDARD §5 step 6), open it yourself, and say what you saw (AGENTS.md rules 3 and 5).
7. **Approve**: the user writes the line in `art/APPROVALS.md` (§5 step 7, user only). Stop here until it exists.
8. **Export** = copy into `game/img/` with no scaling (§5 step 8: masters are already at screen size; no export tool exists yet, so copy by hand), plus the same sidecar next to it, under the name the brief's Deliver line gives:

| Family (segments) | Goes to | The engine finds it through |
|---|---|---|
| Objects (02–05) | `game/img/characters/!$<Name>.png` + `.json`; the 48×48 master works as is, because `UF_Objects` reads the sidecar's frame size and `animations.stand[0]` | `objects[].image` (or `tile` for a tileset tile) in the catalog |
| Items (06, 07) | `game/img/characters/!$<Name>.png` + `.json`, the master as the middle frame of the top row of a 144×192 sheet (`UF_Items` reads column 1, row 0 of a 3×4 grid) | `items.types[].image` |
| Creatures (08–10) | `game/img/characters/$<Name>.png` + `.json` | `wildlife.species[].image` |
| People (11) | `game/img/characters/$<Name>.png` + `.json`, one file per layer | `people.<species>.images` (a list of sheets) |
| Faces (12) | `game/img/faces/<Name>.png` + `.json` | drawn by a fixed name in `UF_Dialogue` and `UF_Gumps` (`U7_Faces` today): Claude Code switches it |
| Ground (13, 14) and water (15) | one A2 sheet and one A1 sheet in `game/img/tilesets/`, assembled from the blocks in `groundKinds` / `water.surface` order | `tilesets.surface.A2` / `.A1` (`UF_Tiles`): Claude Code assembles the sheet and switches the name |
| UI (16) | `game/img/system/<Name>.png` | the plugins draw these in code or from stand-in files today: Claude Code wires each file |
| Equipment layers (17, 18) | `game/img/characters/$UF_held_<item>.png`, `$UF_shield_<kind>.png`, `$UF_<species>_<gender>_clothes_T<n>.png`, `$UF_fx_<effect>.png` | found by item id and layer name (the AR-600 renderer, next build): Claude Code |

   The engine draws units as RPG Maker `$` sheets (3 columns × 4 rows) on 2026-09-18; the 16-column AR-600 sheets need the layered renderer (AR-600, engine queue). Deliver the master on the AR-600 grid as the brief says; Claude Code cuts the 3-column walk sheet for the current engine on integration and records it in the request row.
9. **Wire it in the catalog** where the file is yours to wire: switch the `image` field of the object, item or creature (or the `images` list of the species) to the new name and remove a `tint` that only told a shared stand-in apart. **Gemini edits only the four catalog lists named in `docs/handoffs/HANDOFF_world_generation.md` §2: `objects`, `items.types`, `wildlife.species`, `people`.** Everything else (`tilesets`, `groundKinds`, `water`, `biomes`, `recipes`, …) and every file under `game/js/` and `tools/` is Claude Code's: write what is needed under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`. Check the JSON before saving: `"C:\Program Files\nodejs\node.exe" -e "JSON.parse(require('fs').readFileSync('game/data/UF_WorldCatalog.json','utf8'))"`.
10. **Mark the request row** in `docs/ASSET_REQUESTS.md` `DELIVERED` with the backticked file name(s), for example ``DELIVERED (`!$Oak.png`)``: that is how `tools/generate_asset_inventory.js` links the file to the request. Run that tool and confirm the row changed in `docs/ASSET_INVENTORY.md`. Claude Code then checks the delivery against the brief and ART_STANDARD §6 (`CHECKED`, or back to `IN PROGRESS` with the reason), and the user approves (`APPROVED`).
11. **Commit your own files only**: `git add <paths>`, message starting `[gemini]`, one segment or one asset per commit. Never `git add -A`. Remove the claim when you report.

## The checker
```
"C:\Program Files\nodejs\node.exe" tools\check_briefs.js                                  (every SEG-*.md)
"C:\Program Files\nodejs\node.exe" tools\check_briefs.js docs\asset_briefs\SEG-02_trees.md  (one file)
"C:\Program Files\nodejs\node.exe" tools\check_briefs.js --coverage --summary               (every catalog id has a brief; one row per file)
"C:\Program Files\nodejs\node.exe" tools\art_check.js --sidecar art\masters\<id>.png         (a delivered master; --type tileset for a ground or water block, --type face for a face sheet)
```
`check_briefs.js` is for whoever edits a brief (Claude Code): every FAIL must be fixed before the brief is handed over, every WARN read. Its rules and output are in `docs/systems/CHECK_BRIEFS.md`; `art_check.js` is in `docs/systems/ART_CHECK.md`. Gemini does not edit the briefs; a brief that is wrong, or an asset that needs an engine change, goes under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.

## Rules that override Gemini's own brief file
`art/briefs/FABLE_ASSET_BRIEF.md` stays as the source of the schema (its §6). Where the rest of that file, or its template, says otherwise, these win (user decisions 2026-09-18 night; ART_STANDARD; AGENTS.md):
1. **48×48 at native resolution**, not 16×16 exported at 3×. Its "Canvas Constraint", §2 footprint rows and columns, the §3 settler grid and the §5 "Wave 1" 16×16 masters are superseded; those masters are not anchors. The anchors are SEG-01's four, once the user approves them.
2. **Anchor: bottom centre of the cell, `[24, 47]`** (the engine's sprite anchor is x 0.5, y 1), not bottom-right `[12, 15]`. Ground tiles, water and UI pieces have no anchor.
3. **Palette indices verified**: every `<index> #HEX` pair in a brief is checked against `art/palette/uf.hex` (the checker fails a mismatch); aim for 32 colours or fewer per asset; no colour outside the palette.
4. **Catalog states, not the template's mandatory ones**: the Interaction section describes the transition the engine really has (`actions.*.becomes`, `regrow`, `build` unbuilt/built, `ruin`, lit/unlit, full/picked, clothing tiers, the items a hunt drops); where the engine has no second state the brief says so, and no state is invented.
5. **One square per asset** (VISION V44): a one-cell footprint inside 48×48, whatever the thing's real size; sheets are grids of 48×48 frames (AR-600), blocks are grids of 48×48 tiles.
6. **No Ultima or Dwarf Fortress proper nouns or signature words in shipped text** (AGENTS.md → Reference vs. shipped content): file names, display names, sidecars, the look tooltip. In a brief, "Ultima VII" and "U7" appear only in the Reference bullet and in the words "U7 2.5D" of the Projection bullet.
7. **The Ultima VII shapes are references and development stand-ins; nothing copied ships** (AGENTS.md rule 8, VISION V9). Every delivered file is original work in that manner.
8. The heading is `### <id> — <Display name> (<AR-nnn>)` with the catalog id and the request row; the Reference bullet and the `Deliver:` line are part of every brief; W and E facings are transposed (x and y swapped), never mirrored; N is the back view.

## Files in this folder
`README.md` (how the folder works, for writers), this `INDEX.md`, `SEG-00` to `SEG-18`. The 26 briefs of the earlier 16×16 style in `art/briefs/` (written 2026-09-18 20:03, never tracked) were deleted on 2026-09-18 when this index landed; `art/README.md` now points here. `docs/handoffs/HANDOFF_sprites_batch1.md` describes that retired batch and is history.
