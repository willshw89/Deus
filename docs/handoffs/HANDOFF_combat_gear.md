# HANDOFF: combat gear and workshops (V55)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-18 (night) · **Feature:** combat with its production chains (VISION V55; engine paragraph `docs/design/WORLD_ARCHITECTURE.md` §2.10 "Combat chains"; requests AR-900 to AR-906 in `docs/ASSET_REQUESTS.md`; briefs `docs/asset_briefs/SEG-18_combat_gear_and_workshops.md`)

## What this is
Colonies will make weapons and armor from the ground up: ore and charcoal to bars at a **furnace**, bars to blades, axes, maces, helms and mail at a **smithy**, logs to bows at a **bowyer's bench**, logs, bar and feathers to arrows at a **fletcher's bench**, hides to leather at a **tanning rack**, leather to armor, plus wooden shields and clubs; made weapons wait on a **weapon rack** for the militia. Everything a person wears or holds shows on the map sprite (VISION V41/V44: one 48×48 frame grid, layers composed by the engine), and fights play on the map with the sprite's attack frames (V45), d20 rolls (V47) and body-part injuries.

This is the art half. **Phase 1 (tonight): the spec, the catalog entries and these requests. Phase 2 (next): the code that reads them.** You can deliver everything below before phase 2 lands: the workshops and ground items show as soon as their catalog entries exist (that is UF_Objects and UF_Items as they are today), and the layer sheets are read by fixed names the moment the renderer exists. **No code, no `game/data/` edits beyond the `image` fields named in §3.**

## 1. What the engine will read

### 1.1 Layer sheets, one per item, found by the item's id
`unit.data.equipment = { head, weapon, shield, torso, legs }`. For each filled slot the renderer loads one sheet from `game/img/characters/`:

| Slot | File | Sidecar `layer` | Painted columns | Briefs |
|---|---|---|---|---|
| `weapon` | `$UF_held_<itemId>.png` | `held` | stand, walk, work, attack (carry, cast, sleep empty) | AR-900: `club`, `spear`, `dagger_iron`, `sword_short`, `sword_long`, `axe_iron`, `mace`, `bow_short`, `bow_long`, `sling` |
| `shield` | `$UF_shield_<itemId>.png` | `shield` | all but sleep | AR-901: `shield_wood`, `shield_iron` |
| `head` | `$UF_head_<itemId>.png` | `head` | all but sleep | AR-902: `helmet_leather`, `helmet_iron` |
| `torso` | `$UF_torso_<itemId>.png` | `torso` | all but sleep | AR-903: `armor_leather`, `mail_iron` |
| `legs` | `$UF_legs_<itemId>.png` | `legs` | all but sleep | AR-903: `leggings_leather`, `greaves_iron` |
| (carried `arrows` with a bow) | `$UF_back_arrows.png` | `back` | all but sleep | AR-904: `arrows` |

Lookup order per slot: `$UF_<slot>_<itemId>_<species>_<gender>.png`, then `$UF_<slot>_<itemId>_<species>.png`, then `$UF_<slot>_<itemId>.png`. Deliver the plain name only (drawn over the human male body); a species or gender variant is made only when the user asks for one. **The sheet name is the item id**, so nothing in the catalog points at a layer: put the file in place and it is found.

Compose order, bottom to top: body, clothes tier (`$UF_<species>_<gender>_clothes_T<n>`, AR-600), legs, torso, head, back, shield, held, fx. A layer is transparent where it has nothing, and it leaves transparent the pixels where the body must be in front of it (a club head behind the head, a quiver behind the back seen from the south).

### 1.2 The grid (AR-600 at 48×48 native)
One PNG = 16 columns × 4 rows of 48×48 frames = **768×192 px**. Rows S, W, E, N (RPG Maker's order; W and E transposed from the body's stored directions, never mirrored, `docs/GUIDE_25D.md` §2). Columns: `stand` [0], `walk` [1, 2, 3], `work` [4, 5, 6], `carry` [7, 8, 9], `attack` [10, 11, 12] (wind-up, strike, recover), `cast` [13, 14], `sleep` [15]. Anchor [24, 47] in every frame: the body's. Sidecar next to the PNG, same name, `.json`:

```json
{ "frameWidth": 48, "frameHeight": 48, "anchor": [24, 47], "facings": ["S", "W", "E", "N"],
  "animations": { "stand": [0], "walk": [1, 2, 3], "work": [4, 5, 6], "carry": [7, 8, 9], "attack": [10, 11, 12], "cast": [13, 14], "sleep": [15] },
  "layer": "held" }
```

Where things go on the body (south facing, from the human brief in `SEG-00`): feet rows 45–47 at columns 26–38; hips row 33, columns 16–30; shoulders row 22, columns 8–24; head rows 9–21, columns 6–16; the weapon hand (the figure's right, the viewer's left) at (14, 36); the shield and bow hand at (32, 36). Attack frames move the weapon hand to (6, 20), (24, 40), (18, 38) and the shield hand to (30, 26), (36, 34), (32, 36). Draw every layer over the delivered body sheet (`art/masters/human_male.png`, AR-400); until it exists, over the reference square each brief names. All layers share these points, so weapons swap without a shift.

### 1.3 Ground and inventory icons
Every item, weapons included, has a one-frame 48×48 icon: the thing lying on a cell. It is exported as the middle frame of the top row of a 144×192 sheet under a `!$` name (`UF_Items` reads column 1, row 0 of a 3×4 grid; `docs/ART_STANDARD.md` §5 step 8, SEG-07 step 8). The character sheet (V49) draws the same frame in its grid cells and equipment slots, so there is no separate icon to make.

### 1.4 Workshops
Ordinary objects: `objects[]` entries with `image`, `build` (items and work), `tags` (`building`, `workplace`, and the workshop's own tag that a recipe's `at` names: `furnace`, `smithy`, `bowyer`, `fletcher`, `tannery`, `rack`), `ruin: "rubble"`. One 48×48 square each, blocking (the crafter stands on a neighbouring cell). States are separate entries, as everywhere in the catalog (`berry_bush` / `berry_bush_bare`): `furnace` / `furnace_lit` and `weapon_rack` / `weapon_rack_full`. Phase 2 switches a cell between the pair when a smelt starts and ends and when a weapon is stored or taken; until then the first of each pair is what is drawn. The lit furnace is a 144×48 sheet of three flame frames (`animations.lit`), like `campfire_lit`.

### 1.5 Effects
Read by fixed name from `game/img/characters/`; no catalog entry: `$UF_fx_hit.png` (144×48, 3 frames, over the struck sprite), `$UF_fx_arrow.png` (96×192, column 0 the arrow, column 1 the sling stone, rows = flight direction S, W, E, N), `!$UF_fx_blood.png` (144×48, 3 flat decal variants drawn under units). Until they land the engine draws `UF_GenHit`, `UF_GenArrow` and `UF_GenBlood` in code.

## 2. Delivery order
Work the segment in this order; each step is useful on its own.

1. **Workshops (AR-905), seven files:** `furnace`, `furnace_lit`, `smithy`, `bowyer_bench`, `fletcher_bench`, `tanning_rack`, `weapon_rack`, `weapon_rack_full`. They are on the map the moment the catalog entries exist (every site's arming plan builds them, and "Build here" lists them), so they are seen first and most.
2. **Ground items (AR-904 and the icons of AR-900 to AR-903):** `arrows`, `charcoal`, `bar_iron` (replacing the stand-in already in use), `bar_copper`, `leather`, `feathers`, then the ten weapon icons, the two shields, the two helms, the four armor pieces. They lie on the ground and fill the character sheet as soon as the chain runs.
3. **The human body sheet (AR-400, `human` in SEG-00 / SEG-01 anchors), if it is still undelivered:** every layer registers to it. Approve one facing of the body before drawing layers over it (`docs/ART_STANDARD.md` §7).
4. **Weapon layers (AR-900)**, in the order the chain produces them: `club`, `sling`, `spear`, `dagger_iron`, `bow_short`, `axe_iron`, `mace`, `sword_short`, `bow_long`, `sword_long`.
5. **Shields (AR-901):** `shield_wood`, then `shield_iron`.
6. **Helms and armor (AR-902, AR-903):** `helmet_leather`, `armor_leather`, `leggings_leather`, then `helmet_iron`, `mail_iron`, `greaves_iron`. Leather first: it is what a colony makes first.
7. **The quiver layer (`$UF_back_arrows`, AR-904)** and the **effects (AR-906)**.

## 3. How each family plugs in, without code

| Family | Deliver to | Then edit in `game/data/UF_WorldCatalog.json` | Seen where |
|---|---|---|---|
| Workshops | `game/img/characters/!$Furnace.png`, `!$Furnace_Lit.png`, `!$Smithy.png`, `!$BowyerBench.png`, `!$FletcherBench.png`, `!$TanningRack.png`, `!$WeaponRack.png`, `!$WeaponRack_Full.png` + sidecars | the matching `objects[]` entry's `image` (e.g. `"image": "!$Furnace"`) | on the map at every site that reached the arming steps, and in the "Build here" menu |
| Ground items | `game/img/characters/!$Item_<Name>.png` (144×192 export, the 48×48 frame in column 1, row 0) + sidecar | the matching `items.types[]` entry's `image`; remove any `tint` the entry carried while it shared a stand-in | on the ground, in stockpiles, in the character sheet's grid and slots |
| Weapon, shield, helm, armor layers | `game/img/characters/$UF_held_<id>.png`, `$UF_shield_<id>.png`, `$UF_head_<id>.png`, `$UF_torso_<id>.png`, `$UF_legs_<id>.png` + sidecars with `layer` | nothing: found by name | on every unit with the item equipped (phase 2 renderer) |
| Quiver | `game/img/characters/$UF_back_arrows.png` + sidecar | nothing | on every archer carrying arrows |
| Effects | `game/img/characters/$UF_fx_hit.png`, `$UF_fx_arrow.png`, `!$UF_fx_blood.png` + sidecars | nothing | on hits, shots and wounds (phase 2) |

The catalog entries for the new ids are written by Claude Code tonight (the combat-chains work). **If an id from a brief is not in the catalog when you deliver:** put the files in place, write the id and file name under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`, and do not add the entry yourself; the `image` field is switched when the entry exists. Gemini's catalog edits stay within `objects[].image` and `items.types[].image` (AGENTS.md "Who touches what").

Masters first, always: `art/masters/<id>.png` + `.json` per the brief's Deliver line (48×48 for icons and workshops; 768×192 for layers; 144×48 for the lit furnace and the two effect strips; 96×192 for the arrow), on flat magenta `#FF00FF`, palette colours only (`art/palette/uf.hex`), alpha 0/255, no baked shadow. Export = copy at 1:1 (icons into the 144×192 frame). The user approves each master (`art/APPROVALS.md`) before it ships.

## 4. Checking your work
1. Brief check before you draw: `"C:\Program Files\nodejs\node.exe" tools\check_briefs.js docs\asset_briefs\SEG-18_combat_gear_and_workshops.md` (rule 3 reports the gear and workshop headings as unknown ids until the catalog entries land; that is expected tonight).
2. Master check: `"C:\Program Files\nodejs\node.exe" tools\art_check.js --sidecar art\masters\<id>.png` (ignore its 3×-grid check for 48-native masters until the tool is updated).
3. Engine check: `run_tests.bat objects` and `run_tests.bat items` (`images_exist` fails if an `image` names a file that is not there; `catalog_types` fails on a bad `becomes`, `ruin` or yield). Playtest: hover a workshop or item (the look tooltip's last line names the file and its status), right-click a cell for "Build here" and the workshops, watch a colonist craft at one.
4. Update the request row (`DELIVERED`, with the backticked file names and what you checked) and, for anything derived from a reference shape, the Stand-ins list in `docs/STATUS.md` (rule 8: `U7_` prefix, never committed, replaced before release).

## 5. What is decided here and what is not
- Decided (this handoff and SEG-18): the layer names and slots, the compose order, the grid and its column indices, the registration points, the icon export, the workshop state pairs, the effect names, the delivery order.
- Proposed, binding only when the catalog says so: every number in the briefs' Interaction sections (recipe inputs, build costs, stack sizes, weapon dice, ranges, armor class). The chains catalog work writes the real values; where a brief and the catalog disagree, the catalog wins and the brief is corrected.
- Not in this handoff: creature attack frames (AR-401/AR-402 already ask for them), the people's own attack columns (AR-400), the character-sheet frames (AR-701), casting effects (AR-600 `cast`).

## Notes for Claude Code
(Gemini writes here when an asset needs an engine change; leave the sections above as they are.)
