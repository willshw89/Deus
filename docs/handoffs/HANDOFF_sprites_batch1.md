# HANDOFF: sprites, style lock and batch 1

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-18 · **What this serves:** the first original art in the FF6-style look (VISION V2, revised 2026-09-18 evening), replacing U7 stand-ins and stock RPG Maker placeholders one asset at a time, each designed with its interaction states (VISION V36).

Everything you need for one asset is in its brief in `art/briefs/<id>.md`; the briefs are self-contained, so you can work from a single file. `art/README.md` explains the folders and the steps. This handoff gives the order, how to deliver, and the list.

## The order

1. **Style lock first, one anchor at a time, the user's approval between each** (`docs/ART_STANDARD.md` §5 step 2):
   1. `person_human_male` (sets the pixel scale, proportions, outline and palette handling for everything)
   2. `tree_oak`
   3. `wall_wood`
   4. `ground_meadow`
   Each approved anchor's master is attached to every later generation as a reference. Do not start anchor 2 before anchor 1 has its `approved` line in `art/APPROVALS.md`, and so on.
2. **Batch 1** after the fourth approval, in this order (each depends on the ones before it where the briefs say so: the stump matches the oak's trunk, the pine matches the oak's scale, the outcrop matches the boulder's greys, the campfire uses the loose stones, the faces use the person masters):
   `person_human_female` → `hare` → `deer` → `wolf` → `boar` → `tree_pine` → `tree_fruit` → `stump` → `berry_bush` → `grass_tuft` → `reeds` → `rocks_small` → `granite_boulder` → `ironstone` → `campfire` → `straw_bed` → `stockpile_marker` → `items_batch1` → `face_human_male` → `face_human_female` → `target_square` → `stance_squares`.
   Within batch 1 the user approves each id before it is exported; you may generate the next while waiting.
3. **One facing or state first, then the rest** (ART_STANDARD §7): for every sheet, get the south stand frame (or the main state) right, then attach it to make the other facings, frames and states.

## How to deliver

1. Claim the brief in `docs/STATUS.md` → In progress (agent, brief id, files). **While Claude Code's world-build claim line stands ("Gemini: no edits to game/, tools/ or docs/ until this line is gone"), work in `art/` only**: raw, masters, review. The export, the catalog edit and the request status wait until that line is gone.
2. Generate into `art/raw/<id>/` (magenta `#FF00FF` background, one view per file, prompt kept in `NOTES.md`), clean into `art/masters/` (1× native, palette-snapped, alpha 0/255, sidecar next to it), check with `"C:\Program Files\nodejs\node.exe" tools\art_check.js <png>` when the tool exists (write "not checked" if it does not), make the review image, and say what you saw at 1× and 3×.
3. Wait for the user's line in `art/APPROVALS.md`.
4. Export at exactly 3× to the `game/img/` path the brief names, with the sidecar; change the catalog field the brief's section 9 names (only in `objects`, `items.types`, `wildlife.species`, `people`; everything else goes under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`); check the JSON parses; run `"C:\Program Files\nodejs\node.exe" tools\generate_asset_inventory.js` and check the asset's row; mark the request row `DELIVERED (` + the backticked file name + `)` and say what you checked.
5. Commit your files only (`git add <paths>`), message `[gemini] <brief id> ...`, one brief per commit; remove your claim.

## The briefs

| Brief (`art/briefs/<id>.md`) | Catalog id(s) | Placeholder replaced | Request IDs | Deliverable file(s) |
|---|---|---|---|---|
| `person_human_male` | `people.human`; `start.pair[0]` tiers[0] | `$Adam`, `$U7_Townsman`, `$U7_Ranger`, `$U7_Guard` | AR-400, AR-010, AR-600 | `$UF_human_male_adult_body.png` + json |
| `tree_oak` | `oak` (`birch` keeps its tint on it) | `!$TimberOak` | AR-102, AR-021 | `!$UF_Tree_Oak.png` + json |
| `wall_wood` | `wall_wood` | `Outside_B` tile 80 | AR-104 (AR-300 later) | `!$UF_Wall_Wood.png` + json |
| `ground_meadow` | `groundKinds[0]` meadow | `UF_GenGround_A2` kind 0 | AR-100 | `UF_Ground_A2.png` (block 0) + json |
| `person_human_female` | `start.pair[1]` tiers[0]; `people.human` | `$Eve` | AR-400, AR-011, AR-600 | `$UF_human_female_adult_body.png` + json |
| `hare` | `hare` | `$U7_Hare` | AR-401 | `$UF_hare_body.png` + json |
| `deer` | `deer` | `$U7_Deer` | AR-401 | `$UF_deer_body.png` + json |
| `wolf` | `wolf` | `$U7_Wolf` | AR-401 | `$UF_wolf_body.png` + json |
| `boar` | `boar` | `$U7_Dog` tinted `#7a5a40` | AR-401 | `$UF_boar_body.png` + json |
| `tree_pine` | `pine` (`fir_snow` keeps its tint on it) | `!$PineTree` | AR-102, AR-021 | `!$UF_Tree_Pine.png` + json |
| `tree_fruit` | `fruit_tree`, `fruit_tree_bare` | `!$FruitTree` (+ tint) | AR-102, AR-020 | `!$UF_Tree_Fruit.png`, `!$UF_Tree_Fruit_Picked.png` + json |
| `stump` | `stump` | `!$U7_TreeStump` | AR-102, AR-021 | `!$UF_Stump.png` + json |
| `berry_bush` | `berry_bush`, `berry_bush_bare` | `!$BerryBush` (+ tint) | AR-103, AR-023 | `!$UF_Berry_Bush.png`, `!$UF_Berry_Bush_Picked.png` + json |
| `grass_tuft` | `grass_tuft` | `!$U7_TallGrass` | AR-103 | `!$UF_Grass_Tuft.png` + json |
| `reeds` | `reeds` | `!$U7_Reeds` | AR-103 | `!$UF_Reeds.png` + json |
| `rocks_small` | `rocks_small` | `!$U7_LooseStones` | AR-104 | `!$UF_Rocks_Small.png` + json |
| `granite_boulder` | `granite_boulder` | `!$GraniteBoulder` | AR-022 | `!$UF_Granite_Boulder.png` + json |
| `ironstone` | `ironstone` | `!$IronstoneDeposit` | AR-022, AR-044 | `!$UF_Ironstone.png` + json |
| `campfire` | `campfire` | `!$Campfire` | AR-105 | `!$UF_Campfire.png`, `!$UF_Campfire_Lit.png` (3 frames), `!$UF_Campfire_Out.png` + json |
| `straw_bed` | `floor_straw` | `Outside_B` tile 248 | AR-104 | `!$UF_Straw_Bed.png` + json |
| `stockpile_marker` | `stockpile` | `UF_GenStockpile` (`gen`) | AR-104 | `!$UF_Stockpile.png` + json |
| `items_batch1` | `log`, `stone`, `berries`, `fruit`, `meat_raw`, `meat_cooked`, `fiber`, `straw`, `hide`, `bone`, `stone_knife`, `stone_axe`, `stone_pick`, `fiber_wrap`, `hide_cloak` | `!$U7_Item_*` (tools and clothes as tints) | AR-200, AR-201, AR-800 | 15 × `!$UF_Item_<Name>.png` + json, `UF_IconSet_Items.png` + json |
| `face_human_male` | none yet (`catalog.faces`, planned) | `img/faces/U7_Faces.png`, stock face sheets | AR-700 | `UF_Face_human_male_adult.png` + json |
| `face_human_female` | none yet | same | AR-700 | `UF_Face_human_female_adult.png` + json |
| `target_square` | none (UI) | `UF_GenSelect` | AR-031 | `UF_Select.png` (3 frames) + json |
| `stance_squares` | `stance.colors` (Claude Code's) | `UF_GenStance_*` | AR-034 | `UF_Stance.png` (3 frames) + json |

## What the engine can show today, and what waits for Claude Code

Said plainly so nobody claims more than the game does:
- **Objects, items, ground:** the engine reads `image` + sidecar (`frameWidth`, `frameHeight`, `anchor`, `animations.stand[0]`) for objects and items (`docs/systems/UF_Objects.md`, `UF_Items.md`), so those deliveries show in game as soon as the catalog field is switched. The A2 sheet is switched only when all 22 kinds exist (or Claude Code composites the meadow block over the generated sheet).
- **People and creatures:** RPG Maker's character sprite reads a 3-column × 4-row `$` sheet. The AR-600 16/17-column sheets are read by the layered renderer, which is "engine side (Claude Code, next build)". Until it lands, Claude Code's export cuts columns 1–3 (step, stand, step = RPG Maker's own walk layout) into a walk sheet for the catalog. The work, carry, attack, cast, sleep and dead frames are delivered now and used then.
- **Campfire lit / burnt out:** the catalog has one campfire entry and `UF_Objects` draws one frame; the lit loop and the burnt-out state need an engine change (noted in the brief). Deliver all three files anyway (AR-105 asks for them).
- **Faces:** `catalog.faces` and `UF_Sheet` (V49) do not exist yet; the face sheets wait in `game/img/faces/` until then.
- **Selection marker and stance squares:** `UF_Stance` draws generated bitmaps; Claude Code switches it to the files when they are approved.
- **Icons:** RPG Maker loads one `img/system/IconSet.png` (stock 512×640, icons 0–319). Claude Code appends the items row (indices 320–334) and adds an `icon` field to `items.types` when UF_Sheet needs it.

## The check tool, and files that appeared while this was written

- `tools/art_check.js` exists (2026-09-18 19:48). Usage from its header: `node tools/art_check.js <png> [<png>...] [--sidecar] [--json] [--summary] [--type <t>]`; checks `alpha`, `grid`, `palette`, `size`, `sidecar`, `lean`, `margin`; exit code 1 on any FAIL. Every brief's section 8 says how to run it for that asset. Two consequences the briefs already carry: the top native row of every frame stays empty (`margin`), and the 2× icon sheet fails `grid` by design (recorded as a known deviation, `items_batch1.md`).
- While these briefs were being written (2026-09-18 19:46–20:03) another agent put `art/briefs/FABLE_ASSET_BRIEF.md`, `art/masters/settler_male_16x16.png` (+ json), `art/review/index.html` and three `art/settler_male_*.png` files into `art/`. They are not part of this handoff and were not checked. That brief's header cites "Final Fantasy V" and an "Ultima VII Daylight Palette"; `docs/ART_STANDARD.md` and `docs/VISION.md` V2/V9 (FF6 manner, no Ultima VII sources) win. `settler_male` has no line in `art/APPROVALS.md` and is not a style anchor; the style lock starts with `person_human_male`. `art/APPROVALS.md` was written at 20:01 over a file that the Write reported as existing; if the other agent had put content there, it is gone and the user should say what it was.

## Decisions needed from the user

- **Icon scale:** ART_STANDARD F2 says 1× native at exactly 3×; RPG Maker's IconSet cell is 32×32. `items_batch1.md` exports the 16×16 master at 2× for the icon (and 3× for the map). Confirm, or choose another rule for UI icons.
- **AR-034 stance squares:** `docs/systems/UF_Stance.md` says the generated squares "are the design, no art request needed"; `docs/ASSET_REQUESTS.md` AR-034 requests art. The brief follows AR-034. Confirm which stands.
- **File naming for creatures:** AR-600 names people sheets `$UF_<species>_<gender>_<stage>_body.png` and says creatures are "body layer only"; the briefs use `$UF_<species>_body.png` for creatures (no gender or stage). Confirm.
- **`ground_meadow` before AR-100 is complete:** switch the A2 sheet only when all 22 kinds are in, or composite the approved block over the generated sheet meanwhile (Claude Code's call unless the user prefers one).

## Not covered by this batch

The other 18 ground kinds and the 9 water kinds (AR-100, AR-101), the other trees and small plants (AR-102, AR-103), the other site pieces and ruins (AR-104), the other 20 wildlife species and the monsters (AR-401, AR-402), the other species' people and the age stages (AR-400, AR-601), clothing tiers as layers (AR-501), held tools (AR-600 held layer), the remaining items (12 of 27 item types), the other faces (AR-700), the window skin and the rest of AR-800, designation markers (AR-035), the look-panel frame (AR-032), construction pieces (AR-300), workshops (AR-500). Each gets a brief when its turn comes.
