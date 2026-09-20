# STATUS: what's actually true right now

Update this whenever reality changes. Write only what you've checked, and say how you checked it.

**Last updated:** 2026-09-19
**Current slice:** Slice 0 (IN PROGRESS since 2026-09-18)

## In progress
(None currently claimed)

## Five Vertical Layers Guidelines (Z-2 to Z+2) — 2026-09-19 (Gemini)
Delivered per user directives ("Also lets provide some general guidelines for the layers. Z-2 is the deep layer, that's blacks, dark blues, glowies, dark purples. Z-1 is the subterranean layer. That's browns, greys, slate, etc. Z-0 is our overland biomes. +1 and +2 are ONLY built up, or Additional Z layers of cliffs/mountains etc"):
- **Z-2 The Deep Layer:** Blacks, dark blues, glowies (bioluminescence, glowing mushrooms, radiant crystals, luminescent moss, aether fissures), dark purples. Perpetual abyss lit by ambient bioluminescence.
- **Z-1 The Subterranean Layer:** Browns, greys, slate, packed earth, rough-hewn stone, dark shale. Mineable ore veins (iron, copper, gold, coal), excavated halls, early dwarven settlements.
- **Z=0 Overland Biomes:** Full natural surface palette (meadows, mixed forests, taiga/snow, arid deserts, wetlands/swamps, coastlines), sunlight/weather, surface fauna/flora.
- **Z=+1 & Z=+2 Elevated Layers:** ONLY built up (multi-story colonist structures, second floors, roofs, watchtowers, battlements) OR additional Z layers of elevated topography (cliffs, plateaus, mesa edges, mountain peaks). Open sky/air everywhere else.
- **Codification:** Codified in `docs/VISION.md` (V117), `docs/ART_STANDARD.md` (§8), and `docs/handoffs/HANDOFF_vertical.md`.

## Serious Chibi Aesthetic Refinement — 2026-09-19 (Gemini)
Delivered per user directive ("Lets make it more of a serious chibi as opposed to a cute chibi"):
- **Serious Chibi Direction Codification (VISION V116):**
  - Scratched cute / juvenile / cartoonish chibi tropes: eliminated oversized bubble heads, giant round shiny anime eyes, and soft blobby limbs.
  - Adopted mature tactical 16-bit RPG proportions (~3.0 to 3.2 heads tall, fitting 1 tile height: 40–44 px tall in RMMZ).
  - Focused, narrow gaze with stern/determined brow ridge, defined combat posture, broader shoulders, articulated boots, functional medieval straps/scabbards/buckles, and sharp contour outlines.
  - Preserved 1-tile humanoid / 2-tile large creature scale and 12-sprite dedicated action architecture.

## Final Fantasy V (FF5) 16-Bit Chibi Style, 1-Tile Standard, and 12-Sprite Action Architecture — 2026-09-19 (Gemini)
Delivered per user directives ("Lets do 4 directions, FF5 sprite style, generated in nano II, 12 sprites at a time, thats 3 up, left, right, down. And then another 12 sprite sheet for melee. then another 12 sprite sheet for ranged. etc. Let's scratch our current style rules and go with ff5 style generated in Nano banana II, large creatures can be 2 tiles in height but generally 1 tile in a FF5 style"):
- **Style Reset to Final Fantasy V (FF5):**
  - Scratched all previous style rules and adopted authentic 16-bit Super Famicom FF5 chibi pixel art aesthetic (~2.5 to 2.8 heads tall, expressive eyes, compact torso, scissor-step boots).
  - Scaled humanoids and standard creatures to **1 tile in height** (38–48 px within 48×48 px RMMZ grid). Large creatures/bosses scale to **2 tiles in height** (80–96 px within 96×96 px frames).
- **12 Sprites at a Time (3×4 Grid) with First Sheet Reference Conditioning:**
  - Standardized on 12-sprite sheets arranged as 3 animation columns × 4 rows (Down, Left, Right, Up) on 144×192 px sheets (`$filename.png`).
  - Master Walk sheet (12 sprites) generated first in Google Nano Banana II (`generate_image`), saved to `art/raw/references/`, and passed as master conditioning reference (`ImagePaths`) for subsequent action sheets.
- **Dedicated 12-Sprite Action Sheets:**
  - Walk (12), Melee Attack (12), Ranged Bow (12, string pluck only, zero flying arrows), Magic Cast (12, initiation chant/aura only, zero burst projectiles), Haul (12, dedicated sack/crate carrying cycle), Work (12), Downed (12).
- **Codification & Verification:**
  - Codified in `docs/VISION.md` (V115), `docs/ART_STANDARD.md` (Preamble, F1-F13, Sections 4 & 7), `GEMINI.md`.

## Name-Only Hover Tooltip and Authentic Facesets in Window_UFSheet — 2026-09-19 (Gemini)
Delivered per user directives ("I dont want these facesets in the tooltip, I want them in the window. and whiel we're at it, I want to completely replace the tooltip so the only thing that displays is the name of whatever it is hovering over"):
- **Name-Only Hover Tooltip (`UF_Look.js`):**
  - Completely replaced `Sprite_UFLookTip` hover badge. Removed all faceset rendering, subtitle, biome, temperature, weather, and asset lines.
  - Sized compactly (`PAD_X = 6, PAD_Y = 3, LINE_H = 15`) to display exclusively the single name of the entity or terrain under the cursor (e.g., "Oak", "Fresh water", "Meadow", "Colonist").
- **Authentic Portraits in Inspection Window (`UF_Sheet.js`):**
  - Integrated authentic faceset portraits into `Window_UFSheet`'s 72×72 px header picture frame when inspecting trees/flora (`UF_Faces_Trees_Nature.png`), minerals (`UF_Faces_Minerals.png`), wildlife beasts (`UF_Faces_Wildlife_Beasts.png`), and monsters (`UF_Faces_Wildlife_Monsters.png`).
  - Added bevel-bordered frame styling to make portraits pop crisply against dark window skins.
- **Verification Evidence:**
  - `tools/run_tests.js sheet`: `PASS sheet.object` (`picture {"type":"face","sheet":"UF_Faces_Trees_Nature","index":0} (drawn true)`).
  - Screenshot `game/test_output/sheet.oak_sheet.png`: Inspected and confirmed the Grand Ancient Oak face portrait rendered inside `Window_UFSheet` alongside object stats and actions.
  - `tools/run_tests.js look`: `PASS look.window_follows_mouse`, `PASS look.show_pins_lines`.
  - Screenshot `game/test_output/look.look_label.png`: Inspected and confirmed the tooltip is a sleek, minimal dark badge showing only "Oak" directly beside the tree.

## 12 Sprites at a Time with First Sheet Reference Standard — 2026-09-19 (Gemini)
Delivered per user directive ("Let's generate 12 sprites at a time, using the first sprite Sheet as a reference for subsequent sheet generation using nano banana II"):
- **Native 3×4 Grid Format (12 Sprites per Generation):**
  - Standardized character generations to produce complete 3×4 grids (12 sprites: 3 animation frames × 4 facings: South, West, East, North) mapping directly to standard RPG Maker MZ charset sheets (`$filename.png`).
  - Row 0: South / Front view (3 frames: step left, stand, step right).
  - Row 1: West / Left profile (3 frames: step, stand, step).
  - Row 2: East / Right profile (3 frames: step, stand, step).
  - Row 3: North / Back view (3 frames: step, stand, step).
- **First Sheet as Persistent Master Image Reference (`ImagePaths`):**
  - The first sheet generated for a demographic (the standard 12-sprite Walk sheet) is saved to `art/raw/references/` and passed directly into Google Nano Banana II (`generate_image`) in `ImagePaths`.
  - Nano Banana II conditions subsequent action sheet generations (Haul, Attack, Bow, Magic, Work, Downed) on this complete 12-sprite visual matrix, ensuring 100% anatomical scale, head size, costume details, lighting, and palette lock across the entire action suite.

## Codification of Google Nano Banana II and Sprite-Only Animation Directives — 2026-09-19 (Claude Code)
Delivered per user directives ("I want you to codify in all the agent directives and .mds that ALL GENERATION TASKS ARE TO UTILIZE NANO BANANA II", "Also, ENFORCE THAT ALL ANIMATION IS TO HAPPEN THROUGH THE SPRITE. NO AFTER EFFECT ANIMATIONS"):
- **Agent Directives & Core Rules Updated:**
  - `AGENTS.md`: Formally upgraded to "The twelve binding rules". Rule 11 mandates Google Nano Banana II (`generate_image`) for all asset generations across all categories (no code-drawn pixel sprites). Rule 12 mandates that all animation across all entities and environmental features must happen strictly through discrete sprite frames; zero after-effects, procedural squashing/stretching, or shader warps.
  - `CLAUDE.md`: Added mandatory engine directives requiring Google Nano Banana II in all art requests and prompt handoffs, and strictly prohibiting procedural or shader animation in plugins.
  - `GEMINI.md`: Codified top-level mandatory directives requiring Google Nano Banana II and sprite-frame authored animations.
  - `docs/ENGINE_RULES.md`: Codified engine constraints banning programmatic motion, sine-wave swaying, or shader distortions, and mandating Nano Banana II.
  - `docs/ART_STANDARD.md`: Formally codified rule F7 (Sprite-only animation; no after-effects) and rule F9 (Mandatory Google Nano Banana II for all visual assets), updated pipeline Step 3 generation, and added failure criteria.
  - `docs/VISION.md`: Updated V60, V69, V70, V79; updated V108 ("All animation must happen through the sprite; no after-effect animations"); added locked decision V109 ("ALL GENERATION TASKS ARE TO UTILIZE NANO BANANA II"); added 2026-09-19 Decision Log entries.
  - `docs/RMMZ_ASSET_SPEC.md` & `docs/ASSET_REQUESTS.md`: Updated preamble and shared specs to require Google Nano Banana II exclusively and enforce sprite-only animation across all entities and environment features.
  - `art/README.md`, `art/briefs/FABLE_ASSET_BRIEF.md`, `docs/asset_briefs/INDEX.md`, `docs/asset_briefs/README.md`: Overrode brief schemas with mandatory Nano Banana II and sprite-frame animations.
  - `docs/handoffs/HANDOFF_*.md` (`HANDOFF_vertical.md`, `HANDOFF_skins_faces.md`, `HANDOFF_floors_doors.md`, `HANDOFF_anim.md`, `HANDOFF_world_generation.md`): Updated generator and animation requirements across all active handoff documents.
  - `tools/build_generator_prompts.js` & `docs/handoffs/GENERATOR_PROMPTS.md`: Added Rule 0 (Google Nano Banana II) and Rule 9 (Sprite-frame animations) to prompt generator, and rebuilt all 14 generator prompt sections.
- **Verification Evidence:**
  - `tools/run_tests.js smoke`: 9/9 PASS, 0 FAIL, exit 0. Screenshot `game/test_output/smoke.map.png` opened and verified (Rule 5).
  - `tools/check_briefs.js`: 223/223 briefs PASS, 0 FAIL, exit 0.

## Adult Male Elf 4-Direction Standard Suite & Uniform Scale Invariant — 2026-09-19 (Gemini)
Delivered per user directives ("All generation tasks are to use nano banana II. Codify that in all the .MDs", "Let's generate them one creater at a time (Male elf, female elf, etc) and pay attention to accuracy across each generation. No projectiles, rmemeber? Magic animations are just the initiation of the spell", "Umm... The sprites are not all at the same scale. regenerate", "Okay, look, 8 way animations are bottlenecking us. Let's do everything we just discussed, but 4 directions", "Dedicated Hauling / Carrying Pose (AR-600 column 7): Hauling a sack"):
- **100% Google Nano Banana II Generations:**
  - Characters originate from authentic Google Nano Banana II generations (`generate_image`, Rule 11, VISION V109).
- **Uniform Invariant Anatomical Scale (40/276):**
  - Eliminated per-bounding-box scaling bugs where kneeling poses were stretched tall and overhead weapon frames were squashed.
  - Implemented single invariant global scale factor: `UNIFORM_SCALE = 40.0 / 276.0 = 0.1449275` anchored to native baseline `y = 47`.
  - Adult Male Elf head, face, torso, and limbs maintain 100% identical proportions across all 7 actions. Kneeling poses naturally sit at ~26-28 px; horizontal resting corpse naturally rests flat at ~16 px thick.
- **Clean Extraction & Noise Filter:**
  - Clamped raw extraction strictly to sprite bounding boxes, eliminating inter-column sprite bleeding.
  - Enhanced magenta/purple edge filter and 8-neighbor orphan pixel cleaner eliminate all purple JPEG compression fringing and floating edge noise.
- **7 Core Actions Delivered:**
  1. Walk: 4 facings (S, W, E mirrored, N) x 3 frames (`$UF_Elf_Male_Walk.{png,json}`).
  2. Haul: Dedicated burlap sack carrying pose in front of chest in both arms (`$UF_Elf_Male_Haul.{png,json}`).
  3. Attack: Melee sword slash strike with clean blade sweep arc (`$UF_Elf_Male_Attack.{png,json}`).
  4. Bow: Archery aim, tension draw, string pluck release — 0 flying arrows (`$UF_Elf_Male_Bow.{png,json}`).
  5. Magic: Spell initiation incantation posture with soft glowing palms — 0 flying projectiles/beams/leaves (`$UF_Elf_Male_Magic.{png,json}`).
  6. Work: Reaching, kneeling craft with hammer, inspect (`$UF_Elf_Male_Work.{png,json}`).
  7. Downed: Hurt flinch, kneeling collapse, flat horizontal corpse on ground (`$UF_Elf_Male_Downed.{png,json}`).
- **Verification Evidence:**
  - `tools/originality_check.js`: **PASS 7/7 files, 0 FAIL, 0 WARN** (distances 0.453 to 0.568 >= 0.28 vs 19,431 U7 shapes).
  - In-engine live test harness (`tools/test_standard_4d_ingame.js`): **13 passed, 0 failed, exit 0, 0 console errors**.
  - Rule 5 Inspection:
    - Master Review Board: `art/review/elf_male_standard_4d_review.png` (2016x444 px at 2x).
    - In-Engine 3x Closeup: `art/review/elf_male_live_closeup.png`.
    - In-Engine 2x Normal: `art/review/elf_male_live_normal.png`.

## Complete Purge of After-Effect Animations (V108) & Look Tooltip Face Portraits — 2026-09-19 (Gemini)
Delivered per user directives ("The animation for these things should come from the sprites, not an after effect. this applies to everything we generate", "Immediately get rid of all aftereffect animations, I hate them. all animations are in the sprites. redo redo redo"):
- **Locked Engine & Art Standard V108 Enforced:**
  - Added locked rule V108 to `docs/VISION.md` and updated `docs/ART_STANDARD.md` (rule F7): all animation across every asset in the game must come 100% from authentic sprite frames drawn directly on the sheets. No code-driven after-effects, no programmatic pixel shears or shifts, no `Math.sin` bobbing or wobbling, and no programmatic squash-and-stretch.
- **Purge of Fake After-Effects Across All Assets & Generators:**
  - Built and executed `tools/purge_aftereffects.js`:
    - Sanitized all 31 flora and tree character sheets in both `game/img/characters/` and `art/masters/` (e.g. `!$UF_Oak`, `!$UF_Birch`, `!$UF_Pine`, `!$UF_BerryBush`, etc.). Replaced distorted/sheared columns 0 and 2 with the clean, undistorted master frame (column 1).
    - Cleaned all 31 corresponding sidecar JSON files, removing fake `sway: [0, 1, 2]` animations and restoring clean static `stand: [1]`.
    - Neutralized generator scripts (`tools/process_nano_banana_world_assets.js`, `tools/process_nano_banana_batch2.js`, `tools/process_nano_banana_batch3.js`, `tools/process_nano_banana_batch4.js`) so that programmatic shears (`swayOffset` / `rowSway`) can never be generated again.
    - Removed cursor bobbing after-effect (`const bob = Math.sin(...)`) from `game/js/plugins/UF_FactionMenus.js`.
- **Integrated Face Portraits in Inspection Tooltip (`UF_Look.js`):**
  - Mapped subjects to face sheets and indices:
    - Wildlife Beasts (`UF_Faces_Wildlife_Beasts`): wolf, boar, bear, hare, ox, sheep, dog, fox, rat, wildcat, songbird.
    - Wildlife Monsters (`UF_Faces_Wildlife_Monsters`): troll, bog horror, giant spider, sand stalker, bat, restless dead, ice wraith, aurochs.
    - Trees & Nature (`UF_Faces_Trees_Nature`): oak, birch, pine, fruit tree, palm, mangrove/swamp cypress, dead tree, tower cap/cave flora.
    - Colonists & Factions: culture-specific face sheets (`UF_Faces_<culture>_1`).
  - Rendered a framed 48×48 px portrait thumbnail on the left of the tooltip with dark beveled border and load listener support, preserving compact text-only layout for bare terrain and non-portrait items.
  - Fixed `Sprite_UFLookTip.prototype.setLines` to preserve existing `_face` so external decorators (`UF_Ownership`, `UF_FarmView`) don't strip portraits.
- **Verification Evidence:**
  - `tools/run_tests.js faction_menus`: **3/3 PASS, exit 0**.
  - `tools/run_tests.js look`: `look.face_portraits` PASS, `look.cell_lines` PASS, `look.window_follows_mouse` PASS, `look.edges_and_ui` PASS, `look.show_pins_lines` PASS.
  - In-engine screenshots viewed and verified (Rule 5):
    - `game/test_output/look.look_label.png`: inspected, Oak portrait thumbnail cleanly displayed in framed 48×48 px box beside 3 info lines.
    - `game/test_output/faction_menus.menu_live_human.png`: inspected, stone relief frame and ornamental border with gauntlet cursor pointing at "Item" with zero code bobbing.
Delivered per user directive ("Make the fucking faction creatures reproduce. Factions should fuck and grow."):
- **Universal Humanoid Intimacy Eligibility:**
  - Expanded `eligibleForIntimacy` across all living faction humanoids (both player colonists and NPC faction members worldwide). Adults ($\ge 18$) of compatible species, with active desire (`familyDesire !== false`), living and unpartnered or mutually partnered, can mate.
- **Decoupled from Mandatory Private Luxury Bedrooms:**
  - Removed former hard-lock that prohibited intimacy unless couples were in a 4-walled private room with doors and assigned beds. Couples at open camps, hearths, campfires, or unbuilt settlements can now mate (+12 mood, -50 social need). Private bedrooms grant an additional comfort/privacy bonus (+15 mood).
- **Autonomous Reproduction Loop (`stepFactionReproduction`):**
  - Ticks daily on `time:day` and periodically every 6 hours on `time:hour`.
  - Autonomous pairing and mating of compatible adults across all living faction sites and camps worldwide.
- **Worldwide Gestation & Childbirth:**
  - `progressPregnancies()` iterates `allFactionPeople()`, advancing pregnancies across all factions simultaneously.
  - `giveBirth(mother)` spawns newborn child with correct parentage, faction, site, species, `$Baby` sprite, stage `"baby"`, and age 0.
  - Assigns unique life Destiny via `UF.Goals.ensure(child)`.
  - Dynamically increments faction population (`UF.Factions.get(fId).population++`).
  - Emits `colonists:born` and `factions:born`.
- **Worldwide Generational Aging:**
  - `progressAging()` advances children through stages (`baby` <2 -> `child` <12 -> `teen` <18 -> `adult` $\ge 18$) with updated sprites.
  - Upon reaching age 18, units attain full adulthood and can mate, reproduce, and grow the faction perpetually.
- **Verification Evidence:**
  - Standalone VM suite `tools/test_faction_reproduction.js`: **7/7 PASS**.
  - Strict mutation testing (Rule 4): verified 4 separate mutants fail (`--mutant=room_gate` 1/7, `--mutant=npc_sterile` 2/7, `--mutant=pop_frozen` 6/7, `--mutant=aging_frozen` 3/7).
  - In-engine NW.js suites:
    - `tools/run_tests.js smoke`: **13/13 PASS, 0 errors, exit 0**.
    - `tools/run_tests.js combat`: **19/19 PASS, 0 errors, exit 0**.
    - `tools/run_tests.js goals`: **8/8 PASS, 0 errors, exit 0**.
  - In-engine screenshot visual inspection (Rule 5): `game/test_output/factions.ledger.png` (live ledger displaying faction populations), `game/test_output/smoke.map.png` (living settlement around campfire), `game/test_output/combat.fight_zoom1.png` (in-engine combat).

## Complete Google Nano Banana II World Catalog Objects & Inventory Icons Suite — 2026-09-19 (Gemini)

Delivered per user requests ("Generate Character sets for RMMZ to represent all of our objects in the world, as well as their icons in the inventory. Everything that moves on its own or naturally should have an animation", "Make sure youre generating everything with nano banana II", "Show me", "Keep going, generating everyting in nano banana II"):
- **Authentic Google Nano Banana II Generation Pipeline:**
  - 100% generated via Google Nano Banana II (`generate_image` / `gemini-3.1-flash-image`) using authentic style/subject prompts on `#FF00FF` magenta background (Rule V69, V70, V79).
  - Downsampled to 16-bit SNES / Final Fantasy VI style pixel art with crisp pixel clustering and cel shading.
  - CIELAB quantized to <= 28 colors (limit 32) from `art/palette/uf.hex`.
  - 100% binary transparency (alpha 0 or 255), zero purple/magenta halo fringe on outlines.
- **Batches 1 - 4 Deliverables (Complete World Coverage):**
  - **Batch 1 (Committed `c521cee`):**
    - Fruit Trees: 96×96 mature blooming apple tree (`!$UF_Fruit_Tree.png`) and bare harvested tree (`!$UF_Fruit_Tree_Bare.png`).
    - 3-Frame Swaying Flora: `!$UF_Reeds.png`, `!$UF_Wildflowers.png`.
    - 16 Inventory Icons: Master 48×48 golden-bezel icons in `art/masters/<id>_icon.png` and packed into `game/img/system/IconSet.png` (log, dressed stone, rough stone, copper ore, gold ore, apple, berries, wheat, herbs, pickaxe, axe, sword, bow, campfire, crystal, potion).
  - **Batch 2 (Committed `8b9acb1`):**
    - Smelting Furnace (`!$UF_Furnace.png`): 96×96 masonry stone furnace with 3-frame animated roaring hearth fire loop.
    - Village Water Well (`!$UF_Well.png`): 96×96 stone well with wooden roof canopy and 3-frame animated rippling water surface.
    - Subterranean Bioluminescent Flora (`!$UF_{GlowCaps,CrystalCluster,CaveMushrooms}.png`): 3-frame glowing pulse loops.
    - Wild Trees (`!$UF_{Palm,Pine}.png`): 96×96 coastal palm and evergreen pine with 3-frame wind canopy sway.
  - **Batch 3 (Committed `45ced0d`):**
    - Large Biome Trees & Cacti (96×96): Savanna Acacia (`!$UF_Tree_Savanna.png`), Swamp Cypress (`!$UF_Tree_Swamp.png`), Saguaro Cactus (`!$UF_CactusTall.png`), and 48×48 Prickly Pear (`!$UF_Cactus.png`).
    - Workplaces & Ground Zones (48×48): Carpentry Workbench (`!$UF_Workbench.png`) and Stockpile ground zone (`!$UF_Stockpile.png`).
    - Geology & Mineral Deposits (48×48): Granite Boulder (`!$UF_GraniteBoulder.png`), Copper Outcrop (`!$UF_CopperOutcrop.png`), Gold Outcrop (`!$UF_GoldOutcrop.png`), Ironstone Deposit (`!$UF_IronstoneDeposit.png`), Rubble (`!$UF_Rubble.png`), Fallen Pillar (`!$UF_FallenPillar.png`), Old Bones (`!$UF_OldBones.png`), Loose Stones (`!$UF_LooseStones.png`), Gravel (`!$UF_Gravel.png`).
  - **Batch 4 (Committed `cdb95cc`):**
    - Mature Timber Trees (96×96, 3-frame canopy sway): Grand Oak (`!$UF_Oak.png`), Silver Birch (`!$UF_Birch.png`), Snow Fir (`!$UF_Fir_Snow.png`).
    - Campfire (4 Interaction States): 3-frame animated crackling fire loop (`!$UF_Campfire.png`) and cold unlit charred hearth (`!$UF_Campfire_Unlit.png`).
    - Doors & Straw Bed (48×48): Wooden Door (`!$UF_Door_Wood.png`), Reinforced Stone Door (`!$UF_Door_Stone.png`), Thatched Straw Bed (`!$UF_Straw_Bed.png`).
    - Shrubbery & Woodland Flora (48×48, 3-frame sway): Berry Bush Full (`!$UF_BerryBush.png`), Berry Bush Bare (`!$UF_BerryBush_Bare.png`), Shrub (`!$UF_Bush.png`), Desert Scrub (`!$UF_DesertShrub.png`), Snow Bush (`!$UF_SnowBush.png`), Tall Grass (`!$UF_GrassTuft.png`), Woodland Fern (`!$UF_Fern.png`), Tree Stump (`!$UF_Stump.png`).
    - Subterranean Crystals: 3-frame bioluminescent shimmer pulse loop (`!$UF_SmallCrystals.png`).
- **Verification Evidence:**
  - `tools/art_check.js --native --sidecar`: **100% PASS across all character sets and sidecars** (all palette counts <= 28, binary alpha 0/255, proper grid sizing).
  - `tools/originality_check.js`: **100% PASS across all character sets** (all closest distances 0.434 to 0.612 >= 0.28 vs 19,431 indexed Ultima VII shapes).
  - In-engine Smoke Test: `tools/run_tests.js smoke`: **9/9 PASS, 0 failed, exit 0, 0 console errors**.
  - Rule 5 Visual Inspection:
    - `art/review/nano_banana_world_objects_showcase.png` (Batch 1 showcase).
    - `art/review/nano_banana_batch2_showcase.png` (Batch 2 showcase).
    - `art/review/nano_banana_batch3_showcase.png` (Batch 3 showcase).
    - `art/review/nano_banana_batch4_showcase.png` (Batch 4 showcase).
    - `game/test_output/smoke.map.png`: Live in-engine level -1 gameplay with colonists gathered around the circular campfire hearth, crystal clusters, and cavern mushrooms.
  - Review gallery: all showcases integrated into `art/review/index.html`.

## Complete Nano Banana II Tileset Suite v2 & A4 Wall Autotile Architecture Fix — 2026-09-19 (Gemini)

Delivered per user directives ("Genrate the tilesets in nano banana II. The water animation is kinda weak. Redo the water. Keep going", "Make sure youre generating everything with nano banana II", "These look like dogshit, fix this with nano banana II", "I do want the tops of walls to be black though. Not like a black square, but black bordered by material", "Water needs to seamlessly border all terrain types", "I want the walls to take a style closer to the cave/rock walls, with a wall face and a top face"):
- **Root Cause Resolution for Bugged A4 Walls (`media_1789864907268.png`):**
  - **48-Pixel Autotile Vertical Shift**: RMMZ A4 specification allocates 96×144 px (y=0..143, 6 sub-rows) for Wall Top (`FLOOR_AUTOTILE_TABLE`) and 96×96 px (y=144..239, 4 sub-rows) for Wall Face (`WALL_AUTOTILE_TABLE`). The legacy generator inverted these dimensions (96 top / 144 face), shifting half of the wall face into the top autotile, which caused horizontal black slab bars across the map and sliced wall faces in half.
  - **RMMZ Non-Sequential Sub-Row Ordering**: `Tilemap.WALL_AUTOTILE_TABLE` maps `sy=0` and `sy=2` as the upper wall course (requiring top cast shadow), while `sy=1` and `sy=3` map to the lower wall course (requiring foundation footers). Corrected sub-row construction to eliminate inverted wall courses and fragmented purple cuts.
  - **Black Ceiling Cavity Framed by Coping Rim**: Eliminated legacy center-stone reversion. The entire inner top face (`edgeDist >= 8.0`) is solid pitch black `#000000`, framed on outer borders by a 7-px material coping rim (`rimDark`, `rimMid`, `rimHi`) with south overhang lip and drop shadow, producing authentic dungeon/cavern ceiling voids without giant black rectangular slabs or center stripe glitches.
  - **Cavern Rock Wall Style for Subterranean Levels**: Mapped kinds 0 and 1 in `Dungeon_A4` to rugged cavern rock walls with 3D faceted cliff faces, stalactite lip shadows, and boulder footers sampled from `art/raw/dungeon_walls_nano_raw.png`.
  - **Multi-Frame Animated Water & Organic Shoreline**: 3-frame wave flow with sunlight caustics (`art/raw/water_nano_animated_raw.png`) and soft white wave foam / translucent shallows (`art/raw/shoreline_nano_raw.png`) that organically transitions into grass, dirt, sand, and rock with zero hard dark outline box strokes.
- **Delivered Assets:**
  - `game/img/tilesets/Dungeon_A4.png` (768×720 px) & master `art/masters/Dungeon_A4.png`: 8 wall kinds (kinds 0-1: Cavern rock walls; kind 2: Ashlar stone wall; kind 3: Basalt crypt wall; kinds 4-7: rock/stone variations).
  - `game/img/tilesets/Outside_A4.png` (768×720 px) & master `art/masters/Outside_A4.png`: 8 exterior wall kinds (timber palisade, fortress stone, mountain cliff, sandstone).
  - `game/img/tilesets/Dungeon_A2.png` (768×576 px) & master `art/masters/Dungeon_A2.png`: 32 subterranean floor autotile blocks (dug earth, clay bed, flagstones, rough cavern rock).
  - `game/img/tilesets/Outside_A1.png`, `game/img/tilesets/Dungeon_A1.png`, `game/img/tilesets/UF_GenWater_A1.png` (768×576 px) & masters: 3-frame animated water with multi-biome organic foam shorelines.
- **Verification Evidence:**
  - `tools/art_check.js --native`: **5/5 PASS** (Dungeon_A4: 39 colors, Outside_A4: 48 colors, Dungeon_A2: 39 colors, Outside_A1: 36 colors, Dungeon_A1: 36 colors; all <= 64 limit, 100% binary alpha 0/255).
  - `tools/originality_check.js`: **5/5 PASS, 0 WARN** (all closest distances 0.349 to 0.412 >= 0.28 vs 19,431 indexed U7 shapes).
  - `tools/run_tests.js smoke`: **9/9 PASS, 0 failed, exit 0, 0 console errors**.
  - Rule 5 Visual Inspection:
    - `art/review/nano_underground_noon_room.png`: In-engine Level -1 excavation showing natural cavern rock cliff walls, sturdy boulder footers, and solid black ceiling void framed by rock coping rim.
    - `art/review/nano_tilesets_v2_underground.png`: Level -1 full scene displaying continuous ashlar and cavern rock corridors.
    - `art/review/nano_tilesets_v2_ground.png`: Ground level showing sparkling animated water with soft seafoam shoreline meeting meadow grassland seamlessly.

## Wildlife, Trees & Nature Face Sets, Menu Themes & Dynamic Faction Cursors — 2026-09-19 (Gemini)

Delivered per user requests ("Now do face sets and themes for wildlife, trees, etc. generate everything in nano banana II. Also, generate faction cursors that change depending on what faction you roll."):
- **Wildlife, Monsters & Botanical Trees Face Sets (24 Unique Portraits across 3 Sheets):**
  - `game/img/faces/UF_Faces_Wildlife_Beasts.png` (576×288 px): 8 beast portraits inside rustic carved antler and horn borders on forest green background (Stag, Boar, Wolf, Fox, Bear, Hare, Falcon, Mountain Lynx).
  - `game/img/faces/UF_Faces_Wildlife_Monsters.png` (576×288 px): 8 primeval monster portraits inside dark blackthorn root and obsidian rune borders on murky charcoal background (Crag Troll, Bog Horror, Giant Spider, Sand Stalker, Cavern Bat, Restless Dead, Ice Wraith, Aurochs).
  - `game/img/faces/UF_Faces_Trees_Nature.png` (576×288 px): 8 ancient tree spirits and botanical flora portraits inside living heartwood vine borders with blossom rosettes (Grand Ancient Oak, Silver Birch, Highland Pine, Fruit Tree, Date Palm, Swamp Willow/Mangrove, Blighted Cursed Tree, Cavern Tower-Cap).
  - Master sheets in `art/masters/face_{wildlife_beasts,wildlife_monsters,trees_nature}.png` and matching `.json` sidecars.
  - Review showcase: `art/review/faces_wildlife_trees_showcase.png` (576×864 px).
- **Wildlife & Cavern Menu Themes & Window Skins:**
  - `game/img/pictures/UF_Menu_wildlife.png` (816×624 px): Untamed Nature menu wallpaper framed by towering ancient oaks, sunlit forest clearing, stag, wolf, and mossy stone altar.
  - `game/img/system/Window_wildlife.png` (192×192 px): Carved heartwood window frame with acorn rosettes, leafy vines, and dark moss-green parchment backfill.
  - `game/img/pictures/UF_Menu_cavern.png` (816×624 px): Subterranean Caverns menu wallpaper framed by stalactite stone pillars, waterfall pool, glowing azure glow-caps, and amethyst crystal clusters.
  - `game/img/system/Window_cavern.png` (192×192 px): Chiseled cavern slate rock window frame with glowing cyan crystal corner inlays.
  - Review preview: `art/review/nature_cavern_menus_preview.png`.
- **Dynamic 11 Faction Cursors Suite (`game/img/system/Cursor_<faction>.png`):**
  - Generated 11 bespoke 48×48 pixel art faction cursors in Nano Banana II:
    - **Human**: Polished steel knight gauntlet pointing NW with gold cuff.
    - **Elf**: Sylvan silver leaf-blade dagger wrapped in living ivy vine.
    - **Dwarf**: Runic golden warhammer with dwarven runes.
    - **Gnome**: Brass clockwork wrench with rotating gears.
    - **Goblin**: Jagged notched rusty scrap-iron shiv with leather wrap.
    - **Orc**: Chipped obsidian battleaxe on mammoth bone haft.
    - **Lizardfolk**: Iridescent nautilus spiral sea-shell with coral tip.
    - **Kobold**: Subterranean iron pickaxe with glowing candle flame tip.
    - **Undead**: Skeletal bone finger with cyan soul-flame.
    - **Starborn**: Luminous sapphire crystal prism with silver orbital halo.
    - **Swarm**: Segmented violet chitinous mantis pincer with dripping venom.
  - Review showcase: `art/review/faction_cursors_showcase.png` (528×48 px).
  - **Dynamic Faction Cursor Engine (`UF_FactionMenus.js`):**
    - Dynamic canvas cursor (`updateCanvasCursor`): Sets `Graphics._canvas.style.cursor = url("img/system/Cursor_<faction>.png") 2 2, default` to match the player's active rolled faction on map and menus.
    - Dynamic window selection cursor: `Window_Selectable.prototype.updateFactionCursor` displays the faction's bespoke cursor next to menu items.
- **Automated Verification:**
  - `tools/art_check.js --native`: **PASS 100%** on all face sheets, menu backdrops, window skins, and cursors (exact dimensions, <= 32 colors on `art/palette/uf.hex`, binary alpha).
  - `tools/originality_check.js`: **PASS 100%** on all 3 face sheets (distances 0.420, 0.466, 0.462 ≥ 0.28 vs 19,431 U7 shapes).
  - `tools/run_tests.js faction_menus`: **3/3 PASS** (exit 0).
  - In-game screenshots inspected (Rule 5): `faction_menus.menu_live_dwarf.png` (warhammer cursor), `faction_menus.menu_live_elf.png` (leaf dagger cursor), `faction_menus.menu_live_human.png` (knight gauntlet cursor).

Delivered per user request ("program everything in nature to reproduce / regenerate so that natural resources are constantly replenishing"):
- **Flora Lifecycle, Sapling Growth & Regrowth (`UF_Ecology.js`, `UF_WorldCatalog.json`):**
  - **Felled Trees & Stumps**: Chopping trees produces a `stump`. Stumps transition through scheduled ecological timers to mature trees or saplings. Blocked cells wait cleanly until standing units clear.
  - **Harvested Plants & Bushes**: Foraged flora (grass tufts, herbs, wildflowers, mushrooms, reeds, wild grains) regrow naturally on their cell after biological due times.
  - **Sapling Maturation (`startSapling`)**: Saplings planted by colonists or spawned via natural seed rain mature into their specific adult tree species (oak, pine, birch, fruit tree, palm, etc.) over time.
- **Active Plant Propagation & Spreading (`spreadPlants`):**
  - Living plants and trees periodically disperse seeds and spread vegetative runners into adjacent empty, passable tiles within radius 1–3.
  - Trees spread saplings that grow into mature trees; bushes, wildflowers, herbs, and mushrooms spread new patches.
  - Enforces local density cap (`maxDensity` <= 0.35 in 5×5 window) to preserve natural spacing and avoid over-packing.
  - Cavern flora (`glow_caps`, `cave_mushrooms`, `tower_cap`, `cave_moss`, `spore_reeds`) spread across subterranean cavern floors.
- **Autonomous Fauna Herd Breeding & Population Recovery (`stepBreeding`, `attemptSpawn`):**
  - Wild herds with $\ge 2$ members actively reproduce. Breeding checks produce offspring near the parents on neighboring passable cells, with the newborn joining the parent herd under the species/area cap.
  - Overhunted or depleted wildlife populations recover via habitat and perimeter arrival rolls, ensuring the world never becomes permanently devoid of game.
- **Strict Non-Renewable Mineral Guard:**
  - Geological resources (ironstone, copper ore, gold ore, rock piles, crystals, ruins) remain finite (`isRenewableObject` returns `false`).
- **Plugin Registration & Catalog Configuration:**
  - Registered `UF_Ecology` in `game/js/plugins.js` after `UF_Wildlife`.
  - Configured `ecology` director parameters and appended `sapling` object to `game/data/UF_WorldCatalog.json`.
- **Automated Verification:**
  - `tools/test_ecology.js`: **7/7 PASS** (renewable vs finite integrity, sapling lifecycle, harvested flora regrowth, plant spreading, herd breeding, depleted recovery, cavern ecology).
  - Mutation verification (Rule 4): Verified all 4 mutation tests (`--mutant=finite`, `--mutant=sapling`, `--mutant=breeding`, `--mutant=spread`) fail as intended.
  - `tools/run_tests.js ecology`: **10/10 PASS** (exit code 0, 0 uncaught errors).
  - `tools/run_tests.js smoke`: **9/9 PASS** (exit code 0, 0 errors on map).
  - `tools/run_tests.js goals`: **8/8 PASS** (exit code 0).
  - Visual Inspection (Rule 5): Opened and verified `ecology.replenished_prey.png` (deer herd with yellow neutral rings in meadow) and `ecology.replenished_monster.png` (troll with red hostile stance ring).

## World Objects & Inventory Icons Generation via Nano Banana II (AR-020, AR-021, AR-023, V69, V70, V79) — 2026-09-19 (Gemini)

Delivered per user directive ("Make sure youre generating everything with nano banana II"):
- **Authentic Google Nano Banana II Generative Pixel Art (`generate_image`):**
  - Generated original high-definition 16-bit SNES / Final Fantasy VI style assets using Google Nano Banana II (`generate_image`) with style anchors (`art/masters/oak.png`, `art/masters/berry_bush.png`, `art/masters/meadow.png`):
    - **Fruit Tree (`fruit_tree`, `fruit_tree_bare`, AR-020)**: 2-square vertical 96×96 px mature fruit tree with lush foliage, gnarled trunk, and ripe red apples (`art/raw/fruit_tree_nano_banana_raw.jpg`, `art/masters/fruit_tree.png`). Picking interaction produces `fruit_tree_bare` with matching canopy silhouette. Packaged into drop-in 3×4 animated RMMZ character sheets `game/img/characters/!$UF_Fruit_Tree.png` and `!$UF_Fruit_Tree_Bare.png` with valid JSON sidecars.
    - **Naturally Animated Swaying Plants & Reeds (`reeds`, `wildflowers`, AR-021, AR-023)**: 3-frame natural wind-swaying animation (Frame 0: sway left, Frame 1: upright rest, Frame 2: sway right) extracted from Nano Banana II generation (`art/raw/plants_sway_nano_banana_raw.jpg`), delivered to `game/img/characters/!$UF_Reeds.png`, `!$UF_Wildflowers.png`, and `art/masters/`.
    - **16 Authentic Inventory Icons**: 16 distinct inventory items generated in 4×4 grid on flat magenta (`art/raw/inventory_icons_nano_banana_raw.jpg`) with warm golden beveled borders: log, dressed stone, rough granite stone, copper ore, gold ore, red apples, blueberries, wheat sheaf, medicinal herbs, wooden pickaxe, battleaxe, steel sword, hunting bow, campfire, crystal shard, and alchemy potion vial. Extracted to `art/masters/<id>_icon.png` (48×48 masters with valid sidecars and 32×32 icons) and packed into `game/img/system/IconSet.png`.
- **Batch 2: Animated Structures, Subterranean Flora & Wild Trees (AR-104, AR-105, AR-021, V69, V70, V79):**
  - **Smelting Furnace (`furnace`, AR-105)**: 2-square vertical 96×96 px stone masonry smelting furnace with arched hearth and rectangular chimney. Delivered with 3-frame animated leaping flame loop inside firebox (`art/raw/furnace_well_nano_banana_raw.jpg`, `game/img/characters/!$UF_Furnace.png`, `!$UF_Furnace.json`).
  - **Village Water Well (`well`)**: 2-square vertical 96×96 px circular stone well with timber gabled roof and bucket crank. Delivered with 3-frame animated rippling water reflection loop (`game/img/characters/!$UF_Well.png`, `!$UF_Well.json`).
  - **Subterranean Glowing Flora & Fungi (`glow_caps`, `crystal_cluster`, `cave_mushrooms`)**: 48×48 px bioluminescent mushrooms and crystals with 3-frame pulsing animation (Frame 0: ambient inner glow, Frame 1: radiant bright pulse, Frame 2: cooling shadow phase) (`art/raw/subterranean_glow_nano_banana_raw.jpg`, `game/img/characters/!$UF_{GlowCaps,CrystalCluster,CaveMushrooms}.png` and sidecars).
  - **Wild Trees: Tropical Palm & Mountain Pine (`palm`, `pine`, AR-021)**: 2-square vertical 96×96 px trees with 3 wind-swaying animation frames (`art/raw/palm_pine_nano_banana_raw.jpg`, `game/img/characters/!$UF_{Palm,Pine}.png` and sidecars).
- **Validation & Quality Gate:**
  - `tools/art_check.js --native --sidecar`: PASS (0 failures; 100% binary alpha 0/255, 28 colors <= 32 on `art/palette/uf.hex`, correct 48px/96px grid dimensions and sidecars).
  - `tools/originality_check.js`: PASS (all distances 0.482 to 0.568 >= 0.28 on Batch 1, and 0.492 to 0.563 >= 0.28 on Batch 2 vs 19,431 indexed U7 shapes, 0 FAIL, 0 WARN).
  - `tools/run_tests.js smoke`: PASS (13/13 checks pass, exit 0, 0 console errors).
  - Rule 5 Inspection:
    - `art/review/nano_banana_world_objects_showcase.png`: Visually verified fruit trees (full & bare), 3-frame swaying plants, and 16 golden-bezeled inventory icons.
    - `art/review/nano_banana_batch2_showcase.png`: Visually verified animated furnace (3 flame frames), well (3 water ripple frames), subterranean glowing fungi (3 pulse frames), and palm/pine trees.
    - `game/test_output/smoke.map.png`: Live in-engine screenshot verifying fruit tree, campfire, and colonists rendering cleanly on the active world map.

## Complete Faction Face Sets Suite (132 Unique Faces across 11 Factions) — 2026-09-19

Delivered per user requests ("Use Nano banana II to create all of the UF Face Sets we need, giving each faction a unique ultima 7 style border that corresponds with their faction theme... Cool, now back to the face sets, I want a dozen unique faces for each faction, half male half female"):
- **Scope & Delivery:**
  - Exactly 12 unique character portraits for each of the 11 factions (6 distinct males, 6 distinct females = 132 unique character faces total).
  - Every portrait features an authentic Ultima VII architectural border crafted from each faction's native cultural materials:
    - **Human**: Gothic arched stone niche with grey ashlar masonry and rounded arch.
    - **Elf**: Living ivy-leaf greenwood bower with woven emerald vines and morning dew.
    - **Dwarf**: Carved runic stone border with brass rivets and subterranean fiery forge glow.
    - **Gnome**: Brass clockwork porthole with exposed gears, pressure dials, and rivets.
    - **Goblin**: Crude scavenged timber and rusted iron nail frame.
    - **Orc**: Tribal carved mammoth bone, tusks, and leather sinew lashings.
    - **Lizardfolk**: Coral and nacre sea-shell border with pearlescent shell rosettes.
    - **Kobold**: Subterranean timber mine shaft with glowing hanging miner lanterns.
    - **Undead**: Ancient crypt slate stone niche draped in creeping grave moss and verdigris bronze fittings.
    - **Starborn**: Geometric silver crystal lattice border with faceted sapphire rhombuses on cosmic starlight indigo void.
    - **Swarm**: Segmented chitinous exoskeleton carapace border with violet pulsing bio-nodes and organic sinew tendons on dark hive-purple background.
- **RMMZ Sheet Packaging (22 Game Sheets, 576×288 px):**
  - `game/img/faces/UF_Faces_<culture>_1.png`: 4 Males (top row), 4 Females (bottom row).
  - `game/img/faces/UF_Faces_<culture>_2.png`: Remaining 2 Males + 2 Females, plus Elder/Leader and Champion variants.
  - Native master sheets in `art/masters/face_<culture>_1.png` and `_2.png` with sidecars `face_<culture>_1.json` and `_2.json`.
- **Review Showcases:**
  - 11 dedicated faction showcases: `art/review/faces_12_<culture>.png` (864×288 px, 6 males top, 6 females bottom).
  - Grand Composite Showcase: `art/review/all_factions_132_faces_showcase.png` (1728×1584 px, all 132 portraits in an 11-row visual roster).
- **Verification Evidence:**
  - `tools/art_check.js --native`: **22/22 PASS (100%)** on all game face sheets (exact 576×288 size, 32 colors snapped to `art/palette/uf.hex`, binary alpha 0/255).
  - `tools/art_check.js --native --sidecar`: **22/22 PASS (100%)** on all master sheets and JSON sidecars.
  - `tools/originality_check.js`: **22/22 PASS (100%)** (closest distance 0.418 to 0.490 ≥ 0.28 vs 19,431 U7 shapes).
  - Visual inspection (Rule 5): Opened and verified each showcase and the grand composite showcase.

Delivered per user request ("Give every sentient creature a "Destiny," the ultimate goal of themselves that drives their overall decision making"):
- **Sentient Creature Destiny Engine (`UF_Goals.js`):**
  - Added 12 core Destiny archetypes (`great_artificer`, `legendary_guardian`, `grand_lorekeeper`, `dynastic_founder`, `beast_communer`, `master_cultivator`, `worldstrider_delver`, `high_sovereign`, `wealth_accumulator`, `hearth_tender`, `shadow_operative`, `monument_builder`).
  - Added `destinyFor(u)` assigning a deterministic Destiny based on seed, unit ID, personality traits, and cultural inclination. Preserves existing saved destinies across save/load cycles without rerolls.
  - Added `isSentient(u)` ensuring humanoids, colonists, and sapient creatures receive Destinies while non-sentient wildlife (`mode: "instinctive_observation"`) retain observational goals without manufactured destinies.
  - Decision making influence:
    - `UF.Goals.priorities(u)` boosts job weights with `destiny.jobAffinities`.
    - `UF.Goals.choosePlan(u, candidates)` factors in a Destiny alignment bonus score so candidates aligned with the creature's life purpose are prioritized.
    - `UF_Colonists.js`: `priorityOf(type, ref)` incorporates `UF.Goals.priorities(ref)` multipliers; `idleJob(u)` triggers Destiny-inspired reflective thoughts during leisure.
    - `UF_Combat.js`: `aidFaction` extends faction aid radius (+4 tiles) for guardian and caretaking destinies.
  - Progression and Milestones:
    - Tracks milestone progress across real actions (crafting, mining, social study, home building, combat defense). Upon reaching target, records achievement and marks Destiny fulfilled.
  - UI Readout:
    - `Window_UFGoals` (F7 panel): Displays Destiny title, motto, and milestone progress in gold header text above short/medium/long term ambitions.
    - `UF_ProfileTabs.js`: Profile sheet "goals" tab displays creature Destiny, motto, and active/fulfilled status.
  - Public API: `UF.Goals.destinyOf(unit)`, `UF.Goals.DESTINIES`, `UF.Goals.isSentient(unit)`.
- **Verification Evidence:**
  - `tools/test_goals.js`: **19 passed, 0 failed** (exit 0). Includes `destiny_assigned_to_sentient`, `destiny_stable_across_saves`, `destiny_influences_priorities`, `destiny_influences_choose_plan`, `destiny_progress_and_achievement`.
  - Mutation tests verified able to fail: `--mutant=owner` (exit 1), `--mutant=physical` (exit 1), `--mutant=backoff` (exit 1), `--mutant=age` (exit 1), `--mutant=destiny` (exit 1).
  - `tools/test_profile_tabs.js`: **46 passed, 0 failed** (exit 0).
  - `tools/run_tests.js goals`: **8 passed, 0 failed** (exit 0). Verified `goals.destiny_assigned` and save round-trip with Destiny.
  - `tools/run_tests.js combat`: **19 passed, 0 failed** (exit 0).
  - `tools/run_tests.js smoke`: **9 passed, 0 failed** (exit 0, 0 console errors).
  - Screenshot inspected (Rule 5): `game/test_output/goals.selected_goals.png` displays clean Destiny title, motto, and target without text clipping or UI overlaps.

## Faction Aid in Combat & Layer Connections Creature Traversal / Liquid Physics — 2026-09-19

Delivered per user requests ("When a faction gets attacked, nearby faction members should come to their aid in combat" and "Also if there is a connection between layers, any creature can travel between them, in addition to liquid physiques like water, etc"):
- **Faction Aid in Combat (`UF_Combat.js`):**
  - Added `Combat.factionOf(unit)` resolving canonical faction IDs for units, colonists, and player factions.
  - Implemented `Combat.callFactionAid(victim, attacker, tick)` / `aidFaction`: when any faction member takes an attack (including lethal attacks), living faction allies within `combat.aidRadius` (10 tiles) who are not already fighting a living enemy or in `flee`/`manual` mode acquire the attacker as `targetId`, cancel any non-combat colonist jobs with reason `"aid_faction"`, and rally to attack the threat.
  - Victim retaliates by acquiring attacker and canceling non-combat jobs with reason `"attacked"`.
  - Added `sameFaction` recognition in `seek()` for `mode === "protect"`.
  - Emits `combat:aid` `{ victim, attacker, helpers }`.
  - Added Ground view switch guard to `registerChecks()` for robust test suite initialization.
  - Automated tests: `combat.faction_aid_called`, `combat.faction_aid_range`, `combat.faction_aid_isolated`.
- **Universal Creature Traversal & Liquid Physics Across Layer Connections (`UF_NaturalConnections.js`):**
  - Added `UF.NaturalConnections.traverse(unitOrId, linkOrRoute)` allowing any creature, wildlife, monster, or unit to physically cross between connected layers (`World.moveUnitToLevel`) when at the entrance and landing is clear.
  - Added autonomous stepping traversal (`stepCreatures`) for non-colonist creatures at connection entrances with anti-thrash cooldown.
  - Added liquid physics simulation (`updateFluids`, `hasFluid`, `addFluid`, `clearFluids`): when water is present at an upper entrance, water flows down through the connection to lower landings, marking dynamic fluid, updating underground baseline water arrays, and emitting `naturalConnections:fluidFlow` and `fluids:flow`.
  - Ground/underground travel validation recognizes flooded landings as wet, correctly refusing non-aquatic traversal.
- **Verification Evidence:**
  - `tools/test_natural_connections.js`: **25 passed, 0 failed** (exit 0). Mutation tests verified able to fail (`--mutant=water` catches failure).
  - `tools/run_tests.js natural_connections`: **15 passed, 0 failed** (exit 0, including `creature_traversal`, `liquid_present_at_entrance`, and `liquid_flow_through_connection`).
  - `tools/run_tests.js combat`: **19 passed, 0 failed** (exit 0, including `faction_aid_called`, `faction_aid_range`, `faction_aid_isolated`, 0 errors, perf 0.291 ms/frame).
  - `tools/run_tests.js smoke`: **13 passed, 0 failed** (exit 0).


Delivered per user directive ("I do want the tops of walls to be black though. Not like a black square, but black bordered by material"):
- **Authentic Black-Top Wall Architecture:**
  - Updated `tools/build_cave_style_walls.js` for both Wood and Stone two-tile-high wall sets:
    - **Top Face (y = 0..46):**
      - Outer non-connecting edges (`!hasN`, `!hasW`, `!hasE`) feature a 6-pixel wide material rim (timber beams for wood; dressed ashlar coping stones for stone) with dark outer edge outline and bright top highlight catch-lights.
      - South coping lip (y = 41..46) runs across the full front width with multi-toned bevel and lower edge overhang.
      - Connecting edges (`hasN`, `hasW`, `hasE`) leave the rim and interior open so adjacent tiles connect with zero seams.
      - Interior center is solid black (`#000000`) with a 1-pixel inner drop shadow (`shadowDeep`) along the inside of the rim for authentic retro RPG ceiling cavity depth (matching `Dungeon_A4.png` block 6,2).
    - **Front Wall Face (y = 47..95):**
      - 3-pixel cast shadow directly below the south coping lip, followed by vertical wall face (vertical planks with iron bolts for wood; 3 staggered courses of ashlar masonry for stone) and sturdy foundation baseboard.
  - Deployed to:
    - `game/img/characters/!$WallWood_Set.png` & `art/masters/!$WallWood_Set.png` (sidecars `!$WallWood_Set.json`)
    - `game/img/characters/!$WallStone_Set.png` & `art/masters/!$WallStone_Set.png` (sidecars `!$WallStone_Set.json`)
- **Automated Verification:**
  - `tools/art_check.js --native`: PASS (Wood: 12 colors, Stone: 15 colors, both ≤ 32 limit, 100% binary alpha, valid sidecars).
  - `tools/originality_check.js`: PASS (closest distance 0.373 to 0.437 >= 0.28 vs 19,431 U7 shapes, 0 FAIL, 0 WARN).
  - `tools/run_tests.js walls`: PASS (3/3 checks pass, exit 0).
  - `tools/run_tests.js smoke`: PASS (9/9 checks pass, exit 0, 0 console errors).
- **Visual Inspection (Rule 5):**
  - `art/review/black_top_walls_review.png`: Visual review showing isolated pillars, seamless 3-tile horizontal runs, and vertical runs in both wood and stone styles. Tops show crisp material borders enclosing the deep black void; front faces show cast shadows and foundation footers.
  - `game/test_output/smoke.map.png`: In-engine live test screenshot on active map.

## Authentic Matching Faction Menu Themes & Custom Selection Cursors (AR-1740 to AR-1750) — 2026-09-19 (Gemini)

Delivered per user directive ("Those are pretty good, Lets create a matching menu for each"):
- **Full-Screen 816×624 Matching Menu Backdrops (`UF_Menu_<culture>.png`):**
  - Delivered 11 full-screen 816×624 px cultural menu backdrops to `game/img/pictures/UF_Menu_<culture>.png` and `art/masters/UF_Menu_<culture>.png` with valid AR-600 `.json` sidecars.
  - Slices the outer cultural architectural border motifs and combines them with procedural cultural material wallpapers (zero text bleed, crisp 16-bit texture, high contrast against window panes):
    - **Human (`human`):** Stone relief archway with bronze rosette medallions on warm timber plank wallpaper.
    - **Elf (`elf`):** Entwined living bower with golden leaf brooch on woven emerald moss wallpaper.
    - **Dwarf (`dwarf`):** Chiseled granite frame with glowing blue runes on ashlar stone block wallpaper.
    - **Gnome (`gnome`):** Interlocking brass cogs, steam pipes, and pressure dials on blueprint teal enamel wallpaper.
    - **Goblin (`goblin`):** Jagged rusted scrap iron with barbed wire and spiked spear corners on stitched war-hide wallpaper.
    - **Orc (`orc`):** Heavy black iron framing with skull relief and curved ivory war-tusks on crimson beast-hide wallpaper.
    - **Lizardfolk (`lizardfolk`):** Lashed green bamboo reeds with iridescent spiral nautilus shells on wetland swamp ripple wallpaper.
    - **Kobold (`kobold`):** Rough tunnel rock with hanging trinket ropes and candle stubs on warm cave clay wallpaper.
    - **Undead (`undead`):** Ancient tomb slate with verdigris-tarnished bronze fittings and creeping moss on cracked crypt stone wallpaper.
    - **Starborn (`starborn`):** Sleek geometric silver lattice with blue sapphire rhombus facets on cosmic indigo starlight void wallpaper.
    - **Swarm (`swarm`):** Ribbed chitin exoskeleton frame with glowing purple biopods on iridescent violet bio-membrane wallpaper.
- **Custom Cultural Selection Cursors (`Cursor_<culture>.png`):**
  - Delivered 11 custom 48×48 px selection cursor emblems to `game/img/system/Cursor_<culture>.png` and `art/masters/Cursor_<culture>.png` with `.json` sidecars:
    - `Cursor_human`: Miniature knight helm with gold crest.
    - `Cursor_elf`: Emerald elven leaf emblem.
    - `Cursor_dwarf`: Chiseled stone dwarven warhammer.
    - `Cursor_gnome`: Polished brass engineer's spanner.
    - `Cursor_goblin`: Crude crooked scrap shiv.
    - `Cursor_orc`: Heavy iron war-cleaver.
    - `Cursor_lizardfolk`: Polished river-reed spearhead.
    - `Cursor_kobold`: Curved copper tunnel pick.
    - `Cursor_undead`: Bleached crypt skull / bone fragment.
    - `Cursor_starborn`: Faceted violet star crystal shard.
    - `Cursor_swarm`: Serrated chitin mandible.
- **Engine Plugin Integration (`UF_FactionMenus.js`):**
  - Created non-invasive plugin `game/js/plugins/UF_FactionMenus.js` hooking `Scene_Menu`:
    - Dynamically attaches matching `UF_Menu_<culture>.png` backdrop sprite.
    - Dynamically applies matching `Window_<culture>.png` windowskin to command, status, and gold windows.
    - Attaches custom animated cursor emblem with subtle horizontal hovering bob to active `Window_Selectable` command rows.
    - Script API: `UF_FactionMenus.setFaction(factionId)`, `UF_FactionMenus.getFaction()`.
- **Compliance & Automated Verification:**
  - `tools/art_check.js --native --sidecar`: PASS 22/22 on all 22 master assets (≤ 32 colors on `art/palette/uf.hex`, binary alpha 0/255, exact dimensions, valid sidecars).
  - `tools/originality_check.js`: PASS 22/22 with 0 warnings (closest distance 0.317 to 0.454 ≥ 0.28 vs 19,431 indexed Ultima VII shapes).
  - Live in-engine NW.js snapshot test (`tools/test_all_faction_menus.js`): 3/3 PASS (exit 0, 0 console errors).
- **Screenshots Visually Inspected (Rule 5):**
  - `art/review/all_factions_matching_menus_showcase.png`: Full 11-panel showcase of all menu frames and cursors.
  - `art/review/menus/faction_menus.menu_live_human.png`: Verified live menu in-engine with stone arch, timber wallpaper, gold windowskin, and knight crest cursor.
  - `art/review/menus/faction_menus.menu_live_elf.png`: Verified live menu in-engine with living bower, moss wallpaper, and leaf cursor.
  - `art/review/menus/faction_menus.menu_live_dwarf.png`: Verified live menu in-engine with glowing rune stone, granite wallpaper, and warhammer cursor.
  - `art/review/menus/faction_menus.menu_live_gnome.png`: Verified live menu in-engine with brass cogs, teal enamel wallpaper, and spanner cursor.
  - `art/review/menus/faction_menus.menu_live_goblin.png`: Verified live menu in-engine with scrap iron, hide wallpaper, and shiv cursor.
  - `art/review/menus/faction_menus.menu_live_orc.png`: Verified live menu in-engine with iron tusks, war-hide wallpaper, and cleaver cursor.
  - `art/review/menus/faction_menus.menu_live_lizardfolk.png`: Verified live menu in-engine with reeds, spiral shells, swamp wallpaper, and spear cursor.
  - `art/review/menus/faction_menus.menu_live_kobold.png`: Verified live menu in-engine with tunnel rock, red clay wallpaper, and copper pick cursor.
  - `art/review/menus/faction_menus.menu_live_undead.png`: Verified live menu in-engine with tomb slate, crypt wallpaper, and skull cursor.
  - `art/review/menus/faction_menus.menu_live_starborn.png`: Verified live menu in-engine with silver lattice, cosmic void wallpaper, and star crystal cursor.
  - `art/review/menus/faction_menus.menu_live_swarm.png`: Verified live menu in-engine with chitin frame, violet membrane wallpaper, and mandible cursor.

## Cave-Rock Style Two-Tile High Walls & Seamless Water Autotiles Across All Terrains (AR-101, AR-104, AR-300) — 2026-09-19 (Gemini)

Delivered per user directives ("Very good, slightly visually bugged, though I want the walls to take a style closer to the cave/rock walls, with a wall face and a top face" and "Water needs to seamlessly border all terrain types"):
- **Cave/Rock Style Connected 20-Piece Wall Sets (`!$WallWood_Set.png`, `!$WallStone_Set.png`):**
  - Designed with authentic SNES/FF6 cave wall architecture (matching `Dungeon_A4` rock ledge structure):
    - **Upper 48×48 px square (y = 0..47):** Solid **TOP FACE** (horizontal timber walkway deck or chiseled stone block coping seen from directly above, flat 3/4 top-down).
    - **Coping Lip & Overhang (y = 44..46):** Highlighted edge and dark bevel creating a clear physical overhang.
    - **Cast Shadow (y = 47..49):** Prominent 3-pixel deep shadow directly beneath the lip onto the vertical wall face.
    - **Lower 48×48 px square (y = 50..95):** Vertical **WALL FACE** (hewn timber vertical planks or ashlar stone masonry running down to a sturdy footer trim / stone foundation).
  - **Fixed Visual Disconnection Bug:** Frames 16, 17, 18, 19 (used for south-facing horizontal runs and end caps) now feature solid top faces and wall faces, resolving the bug where horizontal building walls rendered as 1-tile high floating strips.
  - Delivered: `game/img/characters/!$WallWood_Set.png`, `game/img/characters/!$WallStone_Set.png` (192×480 px, 20 frames of 48×96 px), `art/masters/` masters, and `.json` sidecars (`anchor: [24, 95]`, `footprint: [1, 2]`, `facings: ["S"]`).
  - Passed `tools/art_check.js --native` (11 and 14 colors ≤ 32, binary alpha 0/255) and `tools/originality_check.js` (closest distances 0.361 to 0.469 ≥ 0.28).
  - Passed live in-engine test suite: `tools/run_tests.js walls` (7/7 PASS, 0 errors, two-cell render verified).
- **Seamless Water Autotiles Across All Terrain Types (`Outside_A1.png`, `Dungeon_A1.png`, `UF_GenWater_A1.png`):**
  - **Root Cause of Green Cavern Water:** Stock RMMZ `Outside_A1.png` had bright lime-green grass (`#88C839`) baked directly into the shoreline border of its water autotiles. When water pools spawned on underground levels (`-1 · Dug earth floor · Rooted loam`, `Dug stone floor · Chalk and karst`) or non-grass surface biomes (sand, rock, snow), the baked-in grass created jarring green rectangular borders.
  - **Engine Standard Water Integration (AR-101 / SEG-15):** Replaced `game/img/tilesets/Outside_A1.png` and `game/img/tilesets/Dungeon_A1.png` with the original clean 9-kind water sheet (`UF_GenWater_A1.png`):
    - Shoreline is drawn on the **water side only**: 1 px dark wet boundary line (`#00006D`) + 2 px shallows/foam band (`#7D7DFF`).
    - Inner corner notches are 3 px thick and 8 px long along both edges.
    - **Zero grass, sand, or mud baked into water tiles**: Water now seamlessly borders all 26 ground kinds and cavern floors (rooted loam, dug earth, chalk and karst, meadow, sand, tundra, rock).
  - Passed `tools/art_check.js --native --type tileset` (40 colors across all 9 kinds, binary alpha 0/255, exact 768×576 px).
  - Passed `tools/originality_check.js` (0.351 ≥ 0.28 vs U7 shape library).
  - Passed live in-engine test suites: `tools/run_tests.js tiles` (11/11 PASS), `tools/run_tests.js biomes` (12/12 PASS), and `tools/run_tests.js smoke` (13/13 PASS).
  - Visual verification (Rule 5): Inspected `smoke.map.png`, `biomes.start_zoom_0.png`, `biomes.corner.png`, and `walls.two_square_wall.png`—water borders cave soil and karst rock seamlessly with zero green grass halo.

## Universal 8-Directional Standard Charset Architecture & Labeled Template (AR-600) — 2026-09-19 (Gemini)

Delivered per user directive ("This is still kinda fucked up actually. Revise the procedure and break the work down with creater control until you get it right. Regenerate"):
- **The Universal Standard Matrix (18 Columns × 8 Rows):**
  - Standardized across all factions (Elf, Dwarf, Human, Orc, Goblin, Gnome, Kobold, Lizardfolk, Undead, Starborn, Swarm, wildlife, monsters).
  - 18 Columns:
    - Set 1 (Movement): C0 Step L, C1 Stand/Passing, C2 Step R
    - Set 2 (Melee): C3 Windup, C4 Strike (crescent slash arc), C5 Recover
    - Set 3 (Ranged): C6 Aim, C7 Draw, C8 Release (recoil follow-through, no in-flight projectiles on canvas)
    - Set 4 (Magic): C9 Ready/Focus, C10 Channel/Glow (emerald mana glowing hands), C11 Cast/Thrust (palms forward)
    - Set 5 (Work): C12 Reach/Crouch, C13 Work/Carve (knife craft / tool swing), C14 Gather/Stand
    - Set 6 (Downed): C15 Hurt Flinch, C16 Kneeling Collapse, C17 Sleep/Dead (grounded flat rows 37..47)
  - 8 Rows: Row 0 (S, facing 2), Row 1 (SW, facing 1), Row 2 (W, facing 4), Row 3 (NW, facing 7), Row 4 (N, facing 8), Row 5 (NE, facing 9, mirror of NW), Row 6 (E, facing 6, mirror of W), Row 7 (SE, facing 3, mirror of SW). Mathematical mirroring of West-side rows eliminates reverse weapon bugs and directional hallucinations.
- **Creator Control 6-Stage Pipeline (`tools/build_elf_standard_charsets.js`):**
  - Stature locked at 40px standing body skeleton (`$UF_Elf_8D.png`). Row 47 grounding, center X=24.
  - Directional aiming: South aims forward/downward across chest, West aims West, North aims North, East aims East.
  - Magic hand gestures: Hand-anchored emerald glowing mana balls/auras (`#8cffb4` core, `#28dc6e` aura). North facing casts with hands held high above shoulders (`{x: 15, y: 15}`, `{x: 32, y: 15}`) so mana is clearly visible against silver hair/sky.
  - Unified kneeling craftsman: Stature locked at 34px tall, knees grounded on row 47 across ALL 8 directions. Zero popping between kneeling and standing when turning.
  - Organic death: Torso flinch with blood flash, buckling kneeling collapse (27px tall), and flat grounded corpse (11px tall) on rows 37..47.
- **Authoritative Labeled Specification Template & Review Board:**
  - `docs/design/STANDARD_8D_CHARSET_TEMPLATE.png` (2040×918 px): exact labeled specification template.
  - `art/review/elf_creator_review_board.png` (2040×918 px): full 18×8 review board with no header collisions.
- **Universal Import Tool (`tools/import_standard_8d_charset.js`):**
  - Directly ingests: (1) native 864×384 px 18-col sheets, (2) 2040×918 px labeled specification templates (auto-extracting the 18×8 cell grid with exact background matching, preserving outline `(24, 20, 32)`), and (3) 960×384 px AR-600 sheets.
  - Automatically slices and outputs the 6 sub-charsets + AR-600 composite master + matching `.json` sidecars (anchor `[24, 47]`, footprint `[1, 1]`, facings array `['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']`, animation tags).
- **Compliance & Automated Verification:**
  - `tools/art_check.js --native --sidecar`: PASS 7/7 on all 7 sheets (binary alpha 0/255, native 48px grid, ≤ 31 palette colors on `art/palette/uf.hex`, exact dimensions, valid sidecars, mass center offset ≤ 0.1 px, row 47 grounding).
  - `tools/originality_check.js`: PASS 7/7 with 0 warnings (closest distance 0.365 to 0.549 ≥ 0.28 vs 19,431 indexed Ultima VII shapes).
  - Live in-engine NW.js snapshot (`tools/test_standard_8d_ingame.js`): 13/13 PASS (exit 0, 0 console errors).
- **Screenshots Visually Inspected (Rule 5):**
  - `art/review/elf_creator_review_board.png`: Inspected all 18 labeled columns and 8 rows; verified locked 40px standing stature, directional bow aim, high-raised magic casting hands on North, unified kneeling craftsman across all 8 directions, and horizontal dead corpse.
  - `art/review/standard_8d_live_focused_scene.png`: Inspected live scene on Ground level (Map 1000) meadow grass around campfire with river water and oak trees. All 6 action types render cleanly in-engine.
  - `art/review/standard_8d_live_closeup.png`: Close-up view of elf colony around campfire with look tooltip active.

## Authentic Google Nano Banana II Faction Face Sets with Ultima VII Borders & Menu Themes (AR-1700 to AR-1730, V99, V100) — 2026-09-19 (Gemini)

Delivered per user directive ("Use Nano banana II to create all of the UF Face Sets we need, giving each faction a unique ultima 7 style border that corresponds with their faction theme. Additionally, generate a menu theme for each faciton as well"):
- **Authentic Google Nano Banana II Generative Face Sets across All 11 Factions:**
  - Raw generative outputs saved in `art/raw/face_<culture>_raw.png`.
  - Delivered 11 complete 576×288 RMMZ faceset sheets to `game/img/faces/UF_Faces_<culture>_1.png` and `art/masters/face_<culture>.png` with AR-600 format `.json` sidecars (8 cells of 144×144 px: Adult Male, Adult Female, Elder Male, Elder Female in neutral/calm and content/smiling moods).
  - Each 144×144 px portrait features an authentic, ornate **Ultima VII style border (10–16 px band)** uniquely matching that faction's cultural materials and theme:
    - **Human (`human`):** Carved stone archway with oak rosettes on deep midnight navy.
    - **Elf (`elf`):** Leafy bower of living branches and golden foliage on deep forest green.
    - **Dwarf (`dwarf`):** Rune-cut granite stone niche with iron corner brackets on hearth-lit dark rock.
    - **Gnome (`gnome`):** Polished brass-and-gear roundel bezel on dark teal enamel.
    - **Goblin (`goblin`):** Patched hide, twisted wire, and rusted scrap iron with barbed spikes on smoky olive dusk.
    - **Orc (`orc`):** Heavy black wrought iron and carved beast bone with curved boar tusk clamps on dark red-brown.
    - **Lizardfolk (`lizardfolk`):** Bound river reeds and spiral nautilus shells with pearl gems on murky marsh teal.
    - **Kobold (`kobold`):** Rough tunnel-rock niche hung with copper wire, dangling brass bells, and candle stubs on lamp-lit clay ochre.
    - **Undead (`undead`):** Ancient mausoleum tomb slate stone niche with creeping grave moss and verdigris bronze on eerie grave grey-green.
    - **Starborn (`starborn`):** Geometric crystal lattice with cut sapphire facets and gleaming silver nodes on cosmic starlight indigo void.
    - **Swarm (`swarm`):** Ribbed chitin exoskeleton frame with glistening violet sinew nodes on wet dark chitin green.
- **Authentic Faction Menu Themes (Window Skins):**
  - Raw generative outputs archived in `art/raw/menu_*_raw.png`.
  - Delivered 11 thin-bordered window skins to `game/img/system/Window_<culture>.png` and `art/masters/Window_<culture>.png` with `.json` sidecars: 192×192 px RMMZ window skin format, thin 6-px borders with cultural corner motifs, clean high-contrast wallpapers, custom directional cursors and scroll arrows, preserved standard 32 text color chips.
  - Thematic Menu BGM assigned to all factions in `game/data/UF_WorldCatalog.json` (Human: Town1, Elf: Theme2, Dwarf: Town2, Gnome: Town3, Goblin: Dungeon2, Orc: Battle3, Lizardfolk: Town7, Kobold: Dungeon1, Undead: Dungeon3, Starborn: Theme1, Swarm: Dungeon6).
- **Compliance & Automated Verification:**
  - `tools/art_check.js --sidecar`: 100% PASS on all 22 master assets (≤ 32 colors on `art/palette/uf.hex`, binary alpha 0/255, exact dimensions, valid sidecars).
  - `tools/originality_check.js`: 100% PASS across all 22 delivered assets (closest distances 0.442 to 0.508 ≥ 0.28 vs 19,431 indexed Ultima VII shapes).
  - Live in-engine NW.js snapshot (`tools/test_factions_live.js`): 13/13 PASS (exit 0, 0 console errors).
- **Screenshots Visually Inspected (Rule 5):**
  - `art/review/all_factions_facesets_showcase.png`: Inspected all 11 faction face sets in 4-column lineup showing authentic Ultima VII ornate frames, distinct species anatomy, and rich cultural palettes.
  - `art/review/window_skins_all_factions_showcase.png`: Inspected all 12 window skins showing clean readable wallpapers, thin borders, and faction corner bosses.
  - `art/review/faction_dialogue_UF_Faces_human_1.png`: Inspected live in-game message dialogue window with Human Settler bust in carved stone arch and clean windowskin.

## Google Nano Banana 2 Environment Chipsets: Animated Doors, Construction Floors, and Animated Water (AR-101, AR-300) — 2026-09-19 (Gemini)

Delivered per user directive ("Yes, use Nano banana II to create every chipset we need, and animate Anything in the chipset that makes sense if we can"):
- **Animated Doors (`!$UF_Door_Wood.png`, `!$UF_Door_Stone.png`):**
  - Generated via Google Nano Banana 2 (`generate_image`) with style anchors (`art/raw/door_wood_nano_banana_raw.png`, `art/raw/door_stone_nano_banana_raw.png`).
  - Assembled into 144×192 px RMMZ single-character sheets (3 columns × 4 rows of 48×48 px) with animations: `{ closed: [0], ajar: [1], open: [2] }`.
  - Wood door: vertical warm timber planks, iron strap hinges, ring latch. Stone door: heavy ashlar masonry slab with dark iron reinforcements.
  - Automated tests: `tools/run_tests.js doors` 12/12 PASS (exit 0).
  - Screenshots visually inspected (Rule 5): `game/test_output/doors.closed_animal_outside.png` (unfactioned hare blocked outside closed door) and `doors.open_colonist_passing.png` (door swings open exposing interior corridor as colonist enters).
  - Compliance: `art_check.js --native` PASS 2/2 (Wood: 30 colors, Stone: 29 colors <= 32 on `art/palette/uf.hex`), `originality_check.js` PASS 2/2 (closest distance >= 0.387 >= 0.28 vs 19,431 U7 shapes).
- **Construction Floor Autotiles (`floor_wood.png`, `floor_stone.png`, `floor_rushes.png`):**
  - Three complete 47-shape RMMZ A2 autotile blocks (96×144 px) sampled from Nano Banana raw generation (`art/raw/floors_nano_banana_raw.png`):
    - `floor_wood`: Warm timber plank floor, aligned boards, restrained grain.
    - `floor_stone`: Fitted flagstone slabs, walkable constructed paving.
    - `floor_rushes`: Woven straw rush matting, golden herringbone fiber bundles.
  - Compliance: `art_check.js --type tileset --native` PASS 3/3 (Wood: 11 colors, Stone: 19 colors, Rushes: 7 colors <= 32, alpha 255), `originality_check.js` PASS 3/3 (closest >= 0.327 >= 0.28).
  - Review showcase inspected: `art/review/floors_showcase_1x.png` and `3x.png` (5×5 rooms of each material with straw beds, colonists, and doors).
- **Animated Water Autotile Chipset (`UF_GenWater_A1.png`):**
  - 3-frame animated water autotiles across all 9 catalog water kinds (`fresh`, `pond`, `marsh`, `swamp`, `icy`, `brackish`, `salt`, `deep`, `blighted`) generated via Nano Banana (`art/raw/water_animated_nano_banana_raw.png`).
  - Animates wavelets, ripples, glints, floating scum/bubbles, and whitecaps across 3 frames in 0 -> 1 -> 2 -> 1 loop sequence.
  - Delivered 288×144 master strips + `.json` sidecars in `art/masters/` and compiled full 768×576 A1 tileset sheet to `art/masters/UF_GenWater_A1.png` and `game/img/tilesets/UF_GenWater_A1.png`.
  - Compliance: `art_check.js --type tileset --native` PASS 10/10, `originality_check.js` PASS 5/5 (closest >= 0.354 >= 0.28).
  - Review showcase inspected: `art/review/water_animated_showcase_1x.png` and `2x.png` (animated frames lineup and live river scene with colonist and oak tree).

## Authentic Google Nano Banana 2 Wall Chipsets: Wood & Stone (AR-104, AR-300) — 2026-09-19 (Gemini)

Delivered per user directives ("The walls are still ugly, I want you generating these assets with Nano banana 2", "All wall are 2 tiles high"):
- **Authentic Google Nano Banana 2 Image Model Generations (`generate_image`):**
  - Generated brand new 16-bit SNES / Final Fantasy VI style wall spritesheets using Google Nano Banana 2 (`generate_image`) with style anchors (`art/masters/human_male_stand_south.png`, `art/masters/meadow.png`) as reference.
  - Raw model outputs archived in `art/raw/wall_wood_nano_banana_raw.png` (warm golden timber planks, clean wood grain, horizontal header coping beam, sturdy baseboard) and `art/raw/wall_stone_nano_banana_raw.png` (dressed ashlar masonry blocks in slate/granite grey with dark recessed mortar seams, smooth coping slabs, foundation base stones).
- **Two-Tile High 20-Frame Connected Wall Architecture:**
  - 48×96 px frame dimensions (192×480 sheet, 4 columns × 5 rows), footprint `[1, 2]`, anchor `[24, 95]`.
  - Non-occluding South-facing walls (Frames 16–19) and bottom corner segments (Frames 1, 3, 9, 11) feature transparent upper rows (0..47) to keep room interiors visible from the player's 3/4 top-down perspective while blocking grid movement.
- **Compliance & Automated Verification:**
  - `tools/art_check.js --native`: 100% PASS on both sheets (Stone: 30 colors, Wood: 30 colors <= 32 from `art/palette/uf.hex`, binary alpha 0/255, valid sidecars).
  - `tools/originality_check.js`: 100% PASS across all 40 frames (closest distance >= 0.374 >= 0.28 vs 19,431 indexed U7 shapes).
  - Live in-engine NW.js snapshot (`tools/test_walls_ingame.js`): 7/7 PASS (perf: 0.000510 ms/call vs 0.005 budget, 0 console errors).
- **Screenshots Visually Inspected (Rule 5):**
  - `art/review/walls_live_enclosed_buildings.png`: Verified live wooden and stone enclosed buildings on meadow grass with fully visible room interiors (elves standing inside clearly seen through non-occluding South walls), distinct doorways, seamless vertical grain, and zero graph-paper artifacts.
  - `art/review/walls_live_underground_stone_rooms.png`: Verified live underground stone room seamlessly integrating with cavern soil and corridors.

## Live society checkpoint enabled — 2026-09-19 (Codex / Astra)

- After the user's "Lets go" reply to the closure/registration request, RPGMZ process count was observed as 0 before editing. Enabled `UF_NaturalConnections`, `UF_FireSafety` and `UF_ProfileTabs` in `game/js/plugins.js`, after their dependencies and before Test. All previous registrations/parameters were preserved. A concurrent owner's `UF_Environment` registration was retained and included in the regression runs; it is not Codex's change.
- Fresh snapshots without any `--plugins` overrides exercised the actual 51-entry live configuration: `codex_registered_smoke_20260919_a` smoke 13/13, `profile_tabs_live_20260919_a` profiles 24/24, and `codex_live_connections_20260919_final_d` passages 12/12. No new harness errors in those runs. Complete live/snapshot profile-list entries matched. FireSafety source checks passed 25/25; its thermal mutation failed 1 check, exit 1.
- All nine resulting screenshots were opened by the producing agents. Root's smoke screenshot shows eight founders, a campfire, a dry natural stair mouth beside the lake and the temperature tooltip. Profile images show a gnome's saved 22:30-07:00 schedule, an honestly unfinished 6×8 home and functional Ground inventory. Passage images show the dry Ground mouth, underground traveler carrying stone, and paused traversal with feedback.
- Commit provenance: concurrent commit `7374347` included Codex's three registration lines and this checkpoint report alongside the owner's Environment work. Those changes were preserved; no history rewrite or duplicate registration was performed. Environment changed after the first smoke copy, so fresh `codex_registered_smoke_20260919_b` was run: 13/13, no captured errors in the first approximately three seconds. Root opened its sole PNG (founders, campfire, stair mouth and visible rain with a 14.1°C Rain tooltip); all plugin-source hashes matched that final snapshot immediately after the run. The detailed profile/traversal runs precede only this subsequent Environment revision.
- Reopen `game/game.rmmzproject` before F5 so the editor loads the changed plugin list. Use New Game for automatic natural-passage generation; old saves are not silently modified to add entrances. Existing saves retain household geometry and initialize missing personal sleep preferences lazily. F5/F8 and user acceptance remain pending; this is not slice approval. Underground Sheet item transfer, all-seed passage availability and long-running society behavior retain the previous limitations.


## Environmental factors, temperature, hypothermia, burning & wetness checkpoint — 2026-09-19 (Gemini)

- New additive `UF_Environment.js` live-registered in `game/js/plugins.js`.
- Surface ambient temperature dynamically evaluated via climate baseline (`f.t`), diurnal cycle (+/-15°C peak at 14:00, trough at 02:00), elevation lapse (-6.5°C/km), room insulation (+10°C), and radiant heat sources (campfires/hearths/burning tiles radiating heat inversely with distance).
- Underground cavern layers (-1, -2) feature stable insulated geothermal temperature (13°C and 16°C).
- Weather states (clear, overcast, rain, downpour, snow, blizzard, heatwave, coldsnap) tied to wetness and synchronized with RMMZ screen precipitation (`$gameScreen.changeWeather(...)`), muting screen precipitation when underground (z < 0).
- Unit thermal regulation: body temperature, clothing insulation (torso, head, legs), wetness accelerating heat loss up to 2.5×, and physiological stages: chilled, mild shivering, severe hypothermia with periodic cold damage, critical freezing, and heatstroke.
- Active burning: damage per beat, panic fleeing interrupt, physical extinguishment in water or rain, and colony thought debuffs.
- Tooltip (`UF_Look.js`) displays active conditions (`[Burning]`, `[Hypothermia]`, `[Shivering]`) on Line 1, ambient temperature and weather on Line 2. Character Sheet (`UF_Sheet.js`) displays body temperature and wetness in header.
- Automated test suites: `environment` 16/16 PASS (exit 0), `smoke` 13/13 PASS (exit 0, 0 errors). Screenshot `environment.environment_overview.png` inspected: cavern hearth, colonists, and clean look tooltip.
## Personal sleep and profile checkpoint — 2026-09-19 (Codex / Astra)

- Individuals now save their own quarter-hour bedtime, waking preference, duration and chronotype. Both normal planning and assigned-bed exhaustion use that timing. Moderate fatigue follows preference; urgent needs and exhaustion still override it. Existing valid preferences survive save/load.
- Actual-source family integration passed 32/32, its identical-sleep mutation failed 2 checks, and ownership level checks passed 16/16. Snapshot `sleep_schedules_20260919_a` passed 10/10: 24 same-facet adults yielded 15 bedtimes and 8 durations; at 20:00 the early sleeper took its actual owned bed on +1 while the late sleeper stayed awake. The sole PNG was opened: prepared platform, two characters and beds; the sleeper renders upright, so prone animation is not established.
- New additive `UF_ProfileTabs` provides Overview, Needs, Skills, Personality, Goals, Family, Culture and native Inventory. It reads saved evidence without creating needs/goals or completing plans. Needs shows personal sleep preferences; Family distinguishes planned home/annex capacity from real built walls, beds and unmet demand. No Sheet file edits.
- Profile source checks passed 42/42 and all eight behavioral mutations failed. Snapshot `profile_tabs_20260919_e` passed 24/24 with 0 captured new errors: actual tab input, paused-state preservation, Ground native Drop/Pick up, close and no hidden polling. All five PNGs were opened by the author: readable skills, personal sleep, a reserved 6×8 home with 0/26 walls, native inventory after real stone pickup, and animal needs explicitly unrecorded.
- Combined snapshot `codex_combined_smoke_20260919_final_c`, with NaturalConnections, FireSafety and ProfileTabs together, passed smoke 13/13 and captured no errors in its first approximately three seconds on the map. The sole PNG was opened: eight founders around a campfire on grassland and a natural stair mouth south of camp. This is short startup/save/render coverage, not a long simulation or substitute for each subsystem's runtime tests.
- **Registration resolved 2026-09-19:** see the live checkpoint above. No editor F5/F8 or user slice approval is claimed. Saved childhood sleep preferences do not yet adapt on adulthood; near-wake sleep can extend beyond the preference due to the two-hour minimum. Native Sheet's missing-z item transfer problem remains with its owner; the item-control regression was Ground-only.

## Natural passage checkpoint — 2026-09-19 (Codex / Astra)

- New `UF_NaturalConnections` selects saved, dry paired Ground / -1 / -2 passages after founding, with actual walk-then-traverse jobs. F6 descends; Shift+F6 ascends for the selected player colonist. Unsupported/occupied landings refuse without teleporting or dropping carried inventory. Existing stair art is a placeholder.
- Source checks: 22/22, including household annex reservations; deliberate guard mutations failed. Fixed-seed 20260919 NW.js snapshot `codex_connections_20260919_f6_b` passed 12/12, including actual key input, pause/resume, offscreen deep travel, item z and save serialization. The initial 10/2 control run exposed synthetic simultaneous-key ordering in the fixture; holding Shift before F6 corrected the test, not traversal logic.
- The author opened all three PNGs in that snapshot's `test_output`: dry Ground stair mouth by a lake, underground traveler with carried stone, and a paused traversal order with readable feedback. No F5/F8 editor acceptance is claimed.
- **Registration resolved 2026-09-19:** the earlier RPGMZ process 51012 closure gate was cleared; see the live checkpoint above. No all-seed passage guarantee, auto-excavation, every-pocket/camp connection, generic AI cross-z routing, built stairs/ladders or upper-level access is claimed. A seed without a safe natural column saves an explicit blocked reason.

## Household growth and fire-safety checkpoint — 2026-09-19 (Codex / Astra)

- `UF_Households` now sizes new homes by actual family membership before seeded proportions, orientation, mirroring and doorway variation. Existing geometry is preserved. Growth creates real detached bedroom-annex jobs or an explicit expansion blocker. New hearths reserve clear space away from walls, beds and stores; annex materials and home-leash behavior use all household structures.
- Actual-source household checks passed 54/54; size/variation/level/enclosure mutations failed. Fixed-seed NW snapshot `society_growth_20260919_a` passed 17/17: two different homes on +1/-1 built via 66 real jobs, followed by 23 annex jobs after a child increased demand. Materials were staged and terrain prepared by the fixture; this is not a self-sufficient economy test. Four screenshots were opened: household goals, completed main house, detached bedroom annex, and underground house. RMMZ save serialization passed.
- New optional `UF_FireSafety` preflights local adult responses for every faction and level, interrupts routine work but preserves orders/combat/critical needs, and uses real water-fetch/douse jobs. It clears natural hearth-adjacent fuel through ordinary work, never demolishing owned buildings. Base Fire accepts an explicit responder faction; fire damage/spread is not disabled.
- FireSafety source checks passed 25/25; eight source mutations failed. Snapshot `fire_safety_20260919_b` passed 7/7: an offscreen underground NPC fetched water and saved a wooden wall, then physically cleared hearth brush; forced-risk control grass still ignited. Both PNGs were opened. This runtime precedes only the narrow severe-thermal-condition eligibility guard, which passed source/mutation checks.
- **Registration resolved 2026-09-19:** FireSafety is enabled; see the live checkpoint above. Existing Household/Colonists source changes load on the next game launch. No F5/F8 approval, attached corridors, roofs, dining furniture, windows/keys, every-seed spacious housing, whole-town fire survival or multigeneration architecture claim. Native Sheet's pre-existing missing-z item Drop/Pick up issue remains with its owner. Agriculture, husbandry, layer-exclusive economies, burial/graveyards and religion are recorded next-chain requirements in `docs/design/EMERGENT_SOCIETY.md`, not implemented features.

**Roles:** Claude Code = engine and features; Gemini = art (AGENTS.md → Two agents)
## Authentic Google Nano Banana 2 Wall Chipsets: Wood & Stone (AR-104, AR-300) — 2026-09-19 (Gemini)

Delivered per user directives ("All wall are 2 tiles high", "These walls are functionally good but I want better art. look through Use nano banana 2 to make better walls"):
- **Authentic Google Nano Banana 2 Pixel Art Masonry & Timber:**
  - Replaced flat procedural graph-paper and mathematical stripes with authentic FF6-style pixel art sampled and assembled from Nano Banana sources (`scratch/stone_wall_pieces.png`, `art/review/sample_horizontal_wood_wall.png`, `scratch/wall_wood_connected.png`).
  - **Stone Wall (`!$WallStone_Set.png`):** Flagstone walkway deck with beveled coping edge (top), 3 natural 16px courses of dressed ashlar masonry blocks with staggered mortar joints (front face), smooth vertical walkway with coping parapet, and carved isolated plinth column.
  - **Wood Wall (`!$WallWood_Set.png`):** Timber plank walkway deck with top parapet rail, authentic FF6 vertical hewn planks with mortise header and baseboard moulding, seamless vertical timber posts (removed artificial zebra banding), and corner framing.
- **Two-Tile High 20-Frame Connected Wall Architecture:**
  - 48×96 px frame dimensions (192×480 sheet, 4 columns × 5 rows), footprint `[1, 2]`, anchor `[24, 95]`.
  - Non-occluding South-facing walls (Frames 16–19) and bottom corner segments (Frames 1, 3, 9, 11) feature transparent upper rows (0..47) to keep room interiors visible from the player's 3/4 top-down perspective while blocking grid movement.
- **Compliance & Automated Verification:**
  - `tools/art_check.js --native`: 100% PASS on both sheets (Stone: 29 colors, Wood: 28 colors <= 32 from `art/palette/uf.hex`, binary alpha 0/255, valid sidecars).
  - `tools/originality_check.js`: 100% PASS across all 40 frames (closest distance 0.413 to 0.489 >= 0.28 vs 19,431 indexed U7 shapes).
  - Live in-engine NW.js snapshot (`tools/test_walls_ingame.js`): 7/7 PASS (perf: 0.000577 ms/call vs 0.005 budget, 0 console errors).
- **Screenshots Visually Inspected (Rule 5):**
  - `art/review/walls_live_enclosed_buildings.png`: Verified live wooden and stone enclosed buildings on meadow grass with fully visible room interiors, distinct doorways, seamless vertical grain, and zero graph-paper artifacts.
  - `art/review/walls_live_underground_stone_rooms.png`: Verified live underground stone room seamlessly integrating with cavern soil and corridors.

## Complete 8-Directional Action Suites for Every Creature (Humanoids & Wildlife) (AR-400, AR-401, AR-402, AR-600) — 2026-09-19 (Gemini)

Delivered per user directive ("Remember for every direction, every creature needs Use, attack, magic, ranged, etc sprites"):
- **Universal 8-Directional Action Standard Across All 19 Beings:**
  - **12 Humanoids:** Human (Male & Female), Dwarf (Male & Female), Elf (Male & Female), Orc (Male & Female), Goblin (Male & Female), Gnome (Male & Female).
  - **7 Wildlife & Beasts:** Boar, Wolf, Bear, Fox, Hare, Giant Spider (96×96 multi-tile), Troll (96×96 multi-tile).
- **Every Direction (S, SW, W, NW, N, NE, E, SE) Features Full Action Articulation:**
  - **Walk / Stride (Cols 1, 2, 3, 2):** 3-frame scissor strides with planted boots, trailing heel daylight clearance, and 1px passing bobs.
  - **Use / Work / Forage (Cols 4, 5, 6):** Active work stroke with contact sparks / dirt debris particles and recovery.
  - **Melee Attack (Cols 8, 9, 10):** Windup, forward lunging strike with high-definition directional slashing weapon / claw arc, and recovery guard.
  - **Ranged Attack:** Nock, full draw with gleaming tip, release recoil and follow-through across all 8 directions.
  - **Magic Cast / Surge (Cols 11, 12, 13):** Mana gathering orb, radiant elemental burst in facing direction (Arcane cyan, Rune gold, Sylvan emerald, Blood crimson, Hex violet, Aether spark), and residual channel sparks.
  - **Hurt (Col 14):** Directional flinch, recoil backward away from damage vector, and impact blood flash.
  - **Death & Remains (Cols 15, 16, 17):** Mortal stagger, stumbling collapse, and fully grounded resting remains/carcass.
  - **Idle (Cols 18, 19):** Ready stance with subtle 1px chest breathing expansion.
- **Master & Sub-Sheet Deliveries:**
  - Deployed full 20-col × 8-row AR-600 masters (960×384 for 48px; 1920×768 for 96px) in `game/img/characters/$UF_<Name>_AR600.png` and `art/masters/<species>_<gender>.png`.
  - Deployed dedicated 3-col × 8-row 8D sub-sheets (144×384 or 288×768) in `game/img/characters/$UF_<Name>_{Work,Attack,Ranged,Cast}_8D.png`.
  - Sidecars with exact anchors (`[24, 47]` for 48px, `[48, 95]` for 96px), footprint, 8 facings, animations, and frameMs.
- **Compliance & Automated Verification:**
  - `tools/art_check.js --native --sidecar`: 100% PASS on all character sheets (palette <= 31 colors from `art/palette/uf.hex`, binary alpha 0/255, center of mass <= 0.5px, grounded at bottom row).
  - `tools/originality_check.js`: 100% PASS across all frames (distance >= 0.28 vs 19,431 U7 shapes).
- **Visual Inspection (Rule 5):**
  - Inspected `all_creatures_8d_actions_matrix.png` in brain directory: verified 9 creatures × 8 facings × 4 actions (Walk, Work, Attack, Cast) with distinct cultural weapons, anatomy, and glowing directional effects.
  - Deployed interactive `sprite_walker.html` in brain directory allowing full live animation playback across all 12 embedded lineages/beasts in all 8 directions simultaneously.

## FF5 Proportions, Dynamic Footsteps & Complete 8D Suites: Human, Dwarf & Elf (AR-010..012, AR-400, AR-600) — 2026-09-19 (Gemini)

Delivered per user directives ("Dude, look, they need footsteps, etc. They can be closer to ff5 in proportions", "Dwarves need 8 direction mvoement. idle, combat, sleep, death.. etc..."):
- **Authentic Final Fantasy V (FF5) Proportions:**
  - Standardized Human (M/F), Dwarf (M/F), and Elf (M/F) to classic 16-bit JRPG anatomy: ~1:2.8 head-to-body ratio (expressive 14–16px heads, 11–13px torsos, 12–14px legs/boots; total drawn stature 36–42px grounded at row 47, anchor `[24, 47]`, footprint `[1, 1]`).
  - Eliminated tall fashion-model elongation, accordion squashing, and stiff sliding columns.
- **Dynamic Footsteps & Scissor Strides (All 8 Facings):**
  - **South Facing:** Alternate foot lift (leading boot planted flat on row 47, trailing boot lifted 2px with visible daylight beneath), 1px torso bob, and counter arm swing.
  - **Profile Views (West / East):** True scissor stride leg split (leading boot extended forward onto row 47, trailing boot pushed back with lifted heel, creating clear negative space between legs).
  - **North & Diagonals (SW, NW, NE, SE):** 8-directional footstep articulation with natural weight transfer.
- **Elf Male & Female Complete 8D Action Suites:**
  - Authentic platinum/silver-blonde hair, pointed sylvan ears, forest green tunics, fitted bodices, leather bracers, and boots.
  - Complete 8D action set: Stand, agile high-step Walk, Moonblade melee strike (with luminous crescent slash arc), Longbow ranged attack (draw, aim, loose recoil), Sylvan Staff magic cast (emerald power gather and swirling verdant leaf vortex), Work, Hurt flinch, falling Death collapse, Prone sylvan remains, and restful Sleep.
  - Delivered AR-600 20×8 masters (`art/masters/elf_{male,female}.png` & `.json`, `$UF_Elf_{Male,Female}_AR600.png`), 8D charsets (`$UF_Elf_8D.png`, `$UF_Elf_{Male,Female}_8D.png`, `$UF_Elf_Attack_Sword_8D.png`, `$UF_Elf_Attack_Bow_8D.png`, `$UF_Elf_Cast_Staff_8D.png`), and standard 4-way charsets.
- **Compliance & Automated Verification:**
  - `tools/art_check.js --native`: 100% PASS (7/7 checks on every character sheet: binary alpha 0/255, <= 31 colors from `art/palette/uf.hex`, valid sidecars, lean off by <= 0.3 px, row 47 grounding margin).
  - `tools/originality_check.js`: 100% PASS across all frames (closest distance >= 0.475 >= 0.28 vs 19,431 indexed U7 shapes).
  - `tools/run_tests.js smoke`: 13/13 PASS (0 console errors, clean colony rendering).
  - Live in-engine NW.js snapshot (`tools/test_elves_ingame.js`): 13/13 PASS, live elves rendered in active play with ground items.
- **Screenshots Visually Inspected (Rule 5):**
  - `art/review/all_lineages_8d_compass_comparison_4x.png`: 6 rows × 8 compass facings showing Human M/F, Dwarf M/F, and Elf M/F standing in complete proportional harmony.
  - `art/review/all_lineages_footsteps_walk_cycles_4x.png`: 6 rows × 9 columns showing South, West, and North walk cycles with distinct footsteps and scissor strides across all 6 archetypes.
  - `art/review/elf_sprites_8d_actions_showcase_4x.png`: Elf Male/Female 8D stand, Moonblade strike, and Longbow full draw.
  - `game/test_output/smoke.map.png`: Live in-engine test screenshot showing colonists on meadow.
  - `game/test_output/elf_faction_live_ingame_closeup.png`: Live in-engine screenshot of elves around the campfire with racial weapons.

## Environmental Factors, Temperature, Weather, Hypothermia & Burning (UF_Environment) — 2026-09-19

Delivered per user directive ("Add in environmental factors, temperature, hypothermia, burning, etc."):
- **Ambient Cell Temperature Engine (`UF.Environment.ambientTemperature`):**
  - WorldGen climate scaling: maps field `t` (0..1) to realistic Celsius scale (-25°C polar glacier to +45°C desert).
  - Diurnal sinusoidal variation: surface nighttime drop (~8–12°C at 03:00) and peak afternoon warmth (~5–8°C at 14:00).
  - Elevation & Caverns: `z=1` hills (-4°C), `z=2` mountain peaks (-10°C), `z=-1` upper caverns (stable insulated 13°C), `z=-2` deep caverns (16°C base).
  - Shelter insulation: enclosed rooms (`UF.Floors.roomAt`) moderate outdoor extremes by 75% toward a comfortable 20°C.
  - Radiant heat: campfires, hearths, furnaces radiate heat within radius 3 (+25°C, +15°C, +5°C); burning cells radiate intense heat within radius 3 (+45°C, +28°C, +14°C, +6°C).
- **Weather Dynamics (`UF.Environment.weather`):**
  - 8 distinct weather states: `clear`, `overcast`, `rain`, `downpour`, `snow`, `blizzard`, `heatwave`, `coldsnap`.
  - Precipitation cools outdoor air and inflicts wetness on unroofed units; snow/blizzard triggers sub-zero temperatures.
- **Unit Thermal Physics & Status Afflictions (`UF.Environment.stepUnitThermal`):**
  - Normal body temperature: ~37.0°C.
  - Clothing insulation from torso/clothes, headgear, and leggings reduces environmental heat loss.
  - Wetness accumulation (from rain or water) accelerates heat loss rate by up to 3x in cold.
  - Hypothermia: Chilled (35.0–36.4°C), Mild (32.0–34.9°C, shivering barks, 20% slow), Severe (28.0–31.9°C, 40% slow, periodic cold damage, ice-blue hitsplats, -15 mood), Critical (<28.0°C).
  - Hyperthermia / Heatstroke: Overheated (38.0–39.0°C), Heatstroke (39.1–41.0°C, 3x thirst drain, thermal damage).
  - Active Burning: units taking fire damage catch fire (`burning` condition), take 2–4 HP per beat with orange hitsplats, panic-flee toward water, and are immediately doused upon entering water tiles.
- **Colony AI & Autonomous Reactions:**
  - Urgent priority interrupts in `UF_Colonists.js` for units on fire or suffering from severe hypothermia (seeking water or warmth).
  - Dwarf Fortress-style atmospheric thoughts: *"Shivered uncontrollably in the bitter frost"*, *"Basked in the comforting warmth of the campfire"*, *"Was soaked to the skin"*, *"Suffered from searing burns"*.
- **UI Integration:**
  - `UF_Look.js`: Line 1 appends active condition tags in brackets (`[Burning]`, `[Hypothermia]`, `[Shivering]`); Line 2 appends cell temperature and weather (e.g. `17.1°C (Overcast)`).
  - `UF_Sheet.js`: Inspect sheet displays unit body temperature, thermal condition, and wetness in the header subtitle.
- **Automated Verification:**
  - `tools/run_tests.js environment`: 16/16 PASS (exit 0).
  - `tools/run_tests.js smoke`: 13/13 PASS (exit 0, 0 errors).
  - `tools/run_tests.js wildlife`: 22/22 PASS (exit 0).
- **Screenshots Visually Inspected (Rule 5):**
  - `game/test_output/environment.environment_overview.png`: Colony map showing settlers around the campfire, live look tooltip with biome and ground classification, and speed controls.

## Clean Two-Tile High Wall Chipsets: Wood and Stone 20-Piece Sets (AR-100, AR-101, VISION V73) — 2026-09-19 (Gemini)

Delivered per user directives ("Let's clean up these wall chipsets", "These walls aint great, see?", "All wall are 2 tiles high."):
- **Architectural 2-Square Standard Maintained (VISION V73):**
  - All walls are strictly 2 tiles high (48×96 px per frame, footprint `[1, 2]`, bottom-anchor `[24, 95]`, 192×480 px sheet of 20 connected frames).
- **Problems Completely Resolved:**
  - **Overhang Encroachment into Interiors:** South-facing walls (Frames 16, 17, 18, 19) and bottom corner pieces (Frames 3, 9, 11) now have rows 0..47 completely transparent. This prevents roof overhang from covering the interior floor of rooms, keeping houses and dwarven underground rooms 100% open and visible.
  - **Seamless Vertical Columns (Frame 5, 7, 13, 15):** Vertical walls now render as continuous timber buttresses (Wood) and ashlar stone buttresses (Stone) from rows 0 to 95 with zero horizontal face breaks or jagged repeating palisade steps.
  - **Pristine Corner Alignment:** Corner pieces (NW Frame 6, NE Frame 12, SW Frame 3, SE Frame 9) seamlessly bridge horizontal rooflines and vertical buttresses. Iron reinforcement bands (Wood) and stone course mortar joints (Stone) line up across corners.
  - **16-Bit Style Compliance:** All colors strictly drawn from `art/palette/uf.hex` (Wood: 10 colors, Stone: 7 colors; limit 32), with 100% binary alpha and crisp pixel art texturing.
- **Delivered Files:**
  - `game/img/characters/!$WallWood_Set.png` (192×480) & `!$WallWood_Set.json`
  - `game/img/characters/!$WallStone_Set.png` (192×480) & `!$WallStone_Set.json`
  - `art/masters/!$WallWood_Set.png` & `art/masters/!$WallStone_Set.png`
  - `tools/build_clean_two_square_walls.js` (generator tool)
- **Automated Verification:**
  - `tools/art_check.js --native`: 2/2 PASS (alpha 0/255, native grid, <= 10 colors vs 32 limit, sidecar valid).
  - `tools/originality_check.js`: 100% PASS (0 FAIL, 0 WARN across all 40 frames vs 19,431 U7 shapes).
  - `tools/run_tests.js walls`: 7/7 PASS (catalog, contract [1,2], two_cell_render, connected_frames 2/10/8, footprint_roles, perf, 0 errors).
  - `tools/run_tests.js smoke`: 13/13 PASS (0 errors).
- **Screenshots Visually Inspected (Rule 5):**
  - `art/review/clean_two_square_wood_room_3x.png`: 3x review room showing timber shingle roof, iron-strapped timber face, seamless vertical side columns, and open room floor.
  - `art/review/clean_two_square_stone_room_3x.png`: 3x review room showing coping stone roof, ashlar masonry face, continuous buttresses, and open room floor.
  - `art/review/walls_live_enclosed_buildings.png`: In-game engine snapshot showing both a complete enclosed wooden house and an enclosed stone house on Ground level with colonists inside the rooms.
  - `art/review/walls_live_underground_stone_rooms.png`: In-game engine snapshot showing an enclosed dwarven stone house on Level -1 underground with 100% open room interior.

## Authentic 16-Bit Human Settlers: 8D Movement, Dynamic Combat & Complete Actions (AR-400, AR-600) — 2026-09-19 (Gemini)

Delivered per user directive ("Work on human sprites. Im tired of looking at this RMMZ shit. The humans really suck, generate them again. The feet need to move, they need 8 direction movement. They need idle, dying, fighting animations, etc"):
- **Authentic 16-Bit RPG Artistry (FF6 / Chrono Trigger styling):**
  - Replaced all gliding and stock-looking sprites with authentic 16-bit RPG human pixel art:
    - **Male Settler:** Wavy brown hair, detailed facial features with defined eyes, cream linen work shirt with rolled cuffs, dark leather utility vest, sturdy brown travel trousers, buckled belt, and cuff leather work boots.
    - **Female Settler:** Auburn braided hair with side braid, sculpted fitted russet bodice with front lacing cords over cream linen sleeves, pleated forest green travel skirt, and leather boots.
- **Dynamic 8-Directional Movement & Animated Foot Strides:**
  - True 8-directional movement across 8 distinct facing rows (S, SW, W, NW, N, NE, E, SE).
  - Solved foot gliding: 3-step walk cycle with alternating leg articulation and visible scissor strides (front leg swings forward to planted boot on row 47, rear leg kicks back with lifted heel and flexed knee, vertical 1px walk bob, hip and shoulder counter-sway).
- **Fighting & Attack Animation Suite (Cols 8, 9, 10):**
  - **Windup (Col 8):** Coiled combat stance, two-handed high guard with steel blade angled over shoulder.
  - **Heroic Strike (Col 9):** Deep forward combat lunge, 2px solid forged steel blade (`C_STEEL_WHITE` edge highlight, `C_STEEL_MID` body, `C_STEEL_DARK` fuller, brass crossguard) with a dynamic, sweeping 2-3px thick crescent slash arc (`#ffffff` core, `#dbeafe` / `#93c5fd` motion fringe) curving ahead of the strike.
  - **Recovery Guard (Col 10):** Balanced combat guard with blade lowered at 45 degrees.
- **Dying & Fallen Remains Suite (Cols 15, 16, 17):**
  - **Mortal Stagger (Col 15):** Recoil backwards from lethal strike with blood impact splatter.
  - **Kneeling Collapse (Col 16):** Drops onto one knee, bowing forward (height drops naturally from 36px to 27px without accordion squashing), head bowed, one hand clutching fatal chest wound, front knee planted on row 47.
  - **Prone Remains (Col 17):** Complete, organic 11px tall fallen humanoid corpse resting horizontally on rows 37..47 (head with hair and facial profile, linen shirt, leather vest/bodice, belt buckle, pants/skirt, boots resting flat on ground).
- **Idle Breathing Animation Suite (Cols 18, 19):**
  - Natural respiration: 1px chest and shoulder rise on inhale without transparent waist gaps, gentle settling on exhale.
- **Work & Cast Animations:**
  - Work: Raise tool, downward strike, follow-through.
  - Cast: Cupped mana spark gathering, radiant starlight magic flare release, channel aura.
- **Complete Packaging & Compliance:**
  - **Standard 4-Way Charsets (144×192):** `$UF_Human_Male.png`, `$UF_Human_Female.png`, `$Adam.png`, `$Eve.png`, `$UF_Human.png`, `$UF_Human_Male_Adult.png`, `$UF_Human_Attack_Sword.png`, `$UF_Human_Female_Attack.png`, `$UF_Human_Cast.png`, `$UF_Human_Female_Cast.png` with sidecars.
  - **8-Directional Charsets (144×384):** `$UF_Human_8D.png`, `$UF_Human_Male_8D.png`, `$UF_Human_Female_8D.png`, `$UF_Human_Attack_8D.png`, `$UF_Human_Cast_8D.png` with sidecars.
  - **AR-600 Masters (960×384):** `$UF_Human_Male_AR600.png`, `$UF_Human_Female_AR600.png` in `game/img/characters/` and `art/masters/human_male.png`, `human_female.png`.
  - **Automated Verification:**
    - `tools/art_check.js --native`: 10/10 PASS (7/7 checks on every file: alpha, 3× nearest-neighbor grid, <= 31 colors on `uf.hex`, size, sidecar, lean, margin).
    - `tools/originality_check.js`: 100% PASS (0 FAIL, 0 WARN; all frames distance >= 0.360 vs 19,431 U7 shapes).
    - In-game smoke test (`tools/run_tests.js smoke`): 13/13 PASS, 0 console errors, clean map rendering.
  - **Screenshots visually inspected (Rule 5):**
    - `art/review/human_settlers_pair_showcase_4x.png`: Flawless 13-column action showcase across both Male and Female (Stand, Walk strides, Attack slash arcs, Hurt recoil, Kneeling collapse, Prone remains, and Idle breathing).
    - `art/review/human_walk_feet_animation_4x.png`: 4x zoom showing visible foot movement and scissor strides across all 8 facings.
    - `game/test_output/smoke.map.png`: In-game screenshot verifying crisp colony rendering with 0 errors.

## Wildlife Action Suites Refinement: Bear, Troll, Giant Spider (AR-401, AR-402) — 2026-09-19 (Gemini)

Delivered per user directive ("Refine Bear, Troll and Giant Spider action suites"):
- **Giant Spider (96×96 frames, AR-401, AR-402):**
  - Completely eliminated all procedural shearing, neon green vector lines, and diagnostic white line loops.
  - Delivered 8-directional, 7-action animation master (`art/masters/giant_spider_master_8way.png`) and character sheets (`game/img/characters/$UF_GiantSpider_8D.png`, `!$UF_GiantSpider_Carcass.png`): creeping 8-leg walk cycle, alert pedipalp twitches, rearing lunge attack, feeding mandibles, impact flinch recoil, and organic curled death collapse on ground.
- **Troll (96×96 frames, AR-401, AR-402):**
  - Eliminated horizontal sheared chunk dropouts and chest blotches by keeping the entire body buffer intact and implementing facing-aware roaring jaws (front tusked mouth cavity for South facing, profile snout jaws with tusks for West/East, no back-of-head holes on North).
  - Fine-tuned flinch recoil offset to keep arm outlines completely within the 96×96 boundary with zero edge clipping.
  - Delivered 8-directional, 7-action master (`art/masters/troll_master_8way.png`), drop-in 8D charset (`$UF_Troll_8D.png`), and grounded collapsed stone mound carcass (`!$UF_Troll_Carcass.png`).
- **Grizzly Bear (48×48 frames, AR-401, AR-402):**
  - Replaced procedural code synthesis with an organic, sculpted FF6 quadruped grizzly bear chassis adapted from the verified boar base.
  - Rich warm brown fur ramp (`BEAR_PAL`), rounded ears shaped on existing silhouette without floating pixels, contoured tan snout with black nose pad and amber eyes, dorsal shoulder hump crest, and ivory claws.
  - Delivered 8-directional, 7-action master (`art/masters/bear_master_8way.png`), standard 4-way fallback charset (`$UF_Bear.png`), 8D charset (`$UF_Bear_8D.png`), and grounded carcass (`!$UF_Bear_Carcass.png`).
- **Compliance & Automated Verification:**
  - `tools/originality_check.js`: 100% PASS across all frames of Bear, Troll, and Giant Spider (distances 0.498 to 0.577 >= 0.28 vs 19,431 indexed U7 shapes).
  - `tools/art_check.js --native`: 100% PASS on all charsets and carcass sheets (binary alpha, <= 31 colors, valid sidecars).
  - `run_tests.bat wildlife`: 22/22 PASS (0 errors, campfire-aligned start kit herd passing).
  - `run_tests.bat jobs`: 19/19 PASS (includes `jobs.mine_built_wall` and `jobs.mine_subterranean_wall`).
  - `run_tests.bat vertical`: 11/11 PASS (5 layers -2..+2 verified).
  - `run_tests.bat smoke`: 13/13 PASS (0 errors).
- **Screenshots visually inspected (Rule 5):**
  - `art/review/bear_actions_showcase_4x.png`: Flawless grizzly bear 4-facing lineup across 7 actions, 0 floating ears, contoured snout, organic death poses.
  - `art/review/troll_actions_showcase_4x.png`: Flawless troll lineup across 7 actions, roaring mouth with tusks in face, solid seamless chest, grounded collapse.
  - `art/review/giant_spider_actions_showcase_4x.png`: 100% clean 8-legged spider, rearing attack, organic curled death pose, 0 diagnostic artifacts.

## Thin Window Borders & Authentic Faction / Main Menu Window Skins (AR-033, AR-1700..1710) — 2026-09-19 (Gemini)

Delivered per user directive ("This menu style border is too thick. Also, I want a variety of DIFFERENT menu /windows for each faction / the main menu / etc"):
- **Thin Border Redesign (AR-033):**
  - Redesigned the 9-slice frame slice from 24 screen pixels down to a crisp 6 screen pixels (2 native pixels at 3× integer scale: 1px dark outer rim/shadow + 1px lit highlight/bevel).
  - Interior corners beyond the 2-pixel perimeter and 3×3 corner motifs are 100% transparent (alpha 0). This clears the entire 12px window padding region so unit names, badges, inventory slots, equipment items, close buttons, and bottom text descriptions have clean breathing space with zero clipping or overlap.
- **13 Authentic Distinct Window Skins (AR-033, AR-1700..1710):**
  - Delivered dedicated 192×192 native window skins with themed wallpaper backgrounds, unique corner motifs, and matching cursors and scroll arrows in `game/img/system/` and `art/masters/`:
    - `Window.png` / `Window_main.png`: Regal / Main Menu — midnight navy velvet with subtle diamond damask, gold filigree bevel and corner brackets.
    - `Window_human.png`: Human culture — carved dark oak with linen weave, brass wire rim and rosette rivets.
    - `Window_dwarf.png`: Dwarf culture — dressed granite stone slab with masonry lines, cold iron bevel with rune rivets.
    - `Window_elf.png`: Elf culture — ancient woodland bower, deep forest green with leaf weave and pale gold leaf corner curls.
    - `Window_gnome.png`: Gnome culture — dark teal blueprint enamel with brass bevel and cog/gear brackets.
    - `Window_goblin.png`: Goblin culture — patchwork stitched hide with rusted scrap iron and barbed plates.
    - `Window_orc.png`: Orc culture — raw crimson beast-hide with heavy black iron and bone tusk clamps.
    - `Window_lizardfolk.png`: Lizardfolk culture — marsh teal reed weave with polished river-shell trim.
    - `Window_kobold.png`: Kobold culture — warm earthen red clay with hammered copper and trinket notches.
    - `Window_undead.png`: Undead culture — cold crypt slate with tarnished verdigris bronze and grave notches.
    - `Window_starborn.png`: Starborn & automaton culture — cosmic indigo void with starlight grid and crystal lattice.
    - `Window_swarm.png`: Swarm culture — dark insectoid chitin plates with iridescent violet membrane and sinew nodes.
  - All 13 skins preserve the 32 standard RMMZ text colors at `[96..191, 144..191]` unchanged, ensuring 100% text color fidelity across all menus.
- **Automated Verification:**
  - `tools/art_check.js`: 13/13 PASS (alpha 0/255, 3× nearest-neighbor grid, <= 20 colors each on `art/palette/uf.hex`).
  - `tools/originality_check.js`: 13/13 PASS (0 FAIL, 0 WARN; closest distances 0.451 to 0.505 >= 0.28 vs 19,431 indexed U7 shapes).
  - Test suites: `skins` 8/8 PASS (`player_skin`, `cultures_differ` with min RGB distance 32 >= 30, `text_readable` with contrast up to 20.7:1, `fallback_default`, `stranger_in_talk`, `faces.by_culture`, `faces.fallback`, `no_errors`), `smoke` 9/9 PASS.
- **Screenshots visually inspected (Rule 5):**
  - `art/review/window_skins_all_factions_showcase.png`: Complete 4×3 visual showcase comparing all 12 window skin mockups side by side with distinctive faction colors, borders, and textures.
  - `game/test_output/skins.sheet_dwarf.png`: Dwarven character sheet showing the sleek 6px dark iron/granite frame with ample breathing room, zero collision with header or bottom text.
  - `game/test_output/skins.sheet_human.png` & `skins.sheet_elf.png`: Human carved oak/brass and Elf pale gold/leaf frames in live gameplay.
  - `game/test_output/skins.talk_stranger.png`: Conversation window with stranger in goblin rusted scrap skin and player in human oak skin.
  - `game/test_output/smoke.map.png`: Main game HUD with thin gold/navy level plate and speed controls.

## Human & Dwarf 8-Directional & Combat Suites (AR-010, AR-011, AR-400, AR-600) — 2026-09-19 (Gemini)

Delivered per user directives ("Work on the human sprites 8 directions, combat, idle, etc", "Dwarves need 8 direction mvoement. idle, combat, sleep, death.. etc..."):
- **Complete 8-Directional Sprite Suites (S, SW, W, NW, N, NE, E, SE):**
  - Delivered 8 compass facings for Human (Male & Female) and Dwarf (Male & Female) across all fundamental colonist actions: stand, walk, idle, combat (attack, cast, hurt), sleep (grounded resting on rows 41..47 for beds), death/remains, and work.
  - Character sheets in `game/img/characters/`:
    - `$UF_Human_8D.png`, `$UF_Human_Male_8D.png`, `$UF_Human_Female_8D.png` (144×384 px, 8 rows of 3 walk frames, anchor `[24, 47]`, footprint `[1, 1]`).
    - `$UF_Dwarf_8D.png`, `$UF_Dwarf_Male_8D.png`, `$UF_Dwarf_Female_8D.png` (144×384 px, 8 rows of 3 walk frames, anchor `[24, 47]`, footprint `[1, 1]`).
    - Standard 4-way fallback charsets: `$UF_Human.png`, `$UF_Human_Male.png`, `$UF_Human_Female.png`, `$UF_Dwarf.png`, `$UF_Dwarf_Male.png`, `$UF_Dwarf_Female.png` (144×192 px, 4 rows of 3 walk frames).
- **Combat & Magic Classes (Human & Dwarf):**
  - Human Melee Attack: `$UF_Human_Attack_Sword.png` (4-way) and `$UF_Human_Attack_8D.png` (8-way, sword slash).
  - Human Ranged Attack: `$UF_Human_Attack_Bow.png` (bow draw and release).
  - Human Magic Cast: `$UF_Human_Cast.png` (4-way) and `$UF_Human_Cast_8D.png` (8-way, arcane surge).
  - Human Female Combat: `$UF_Human_Female_Attack.png` and `$UF_Human_Female_Cast.png`.
  - Dwarf Melee Attack: `$UF_Dwarf_Attack_Axe.png` (4-way) and `$UF_Dwarf_Attack_Axe_8D.png` (8-way, runic cleave).
  - Dwarf Ranged Attack: `$UF_Dwarf_Attack_Crossbow.png` (4-way) and `$UF_Dwarf_Attack_Crossbow_8D.png` (8-way, heavy arbalest aim).
  - Dwarf Magic Cast: `$UF_Dwarf_Cast_Hammer.png` (4-way) and `$UF_Dwarf_Cast_Hammer_8D.png` (8-way, earth rune hammer surge).
  - Dwarf Female Combat: `$UF_Dwarf_Female_Attack.png` and `$UF_Dwarf_Female_Cast.png`.
- **AR-600 20-Column × 8-Row Master Sheets (960×384 px):**
  - Delivered master sheets in `art/masters/` and `game/img/characters/`:
    - `$UF_Human_Male_AR600.png` and `$UF_Human_Female_AR600.png` + JSON sidecars.
    - `$UF_Dwarf_Male_AR600.png` and `$UF_Dwarf_Female_AR600.png` + JSON sidecars.
    - Columns: 0 stand, 1..3 walk, 4..6 work, 7 stand (no carry, V89), 8..10 attack, 11..13 cast, 14 hurt, 15..17 death (corpse remains), 18..19 idle.
    - Dedicated sleep masters in `art/masters/`: `human_male_adult_sleep.png`, `human_female_adult_sleep.png`, `dwarf_male_adult_sleep.png`, `dwarf_female_adult_sleep.png` (48×384 px) grounded on baseline row 47 for beds.
- **Compliance & Automated Verification:**
  - `art/palette/uf.hex` palette snapped (<= 32 colors), binary alpha (0/255), selective dark ink outlines (V104), grounded on row 47, anchor `[24, 47]`.
  - `tools/art_check.js --native`: 100% PASS (7/7 checks on alpha, 48px grid, palette, size, lean <= 0.6px, margin).
  - `tools/originality_check.js`: 100% PASS (0 FAIL, 0 WARN; all frame distances 0.438 to 0.528 >= 0.28 threshold vs 19,431 indexed U7 shapes).
  - In-engine live test `tools/test_human_dwarf_8d_live.js`: 13/13 PASS (0 errors), verifying live NW.js rendering of all 8 facings and combat/colonist states.
- **Screenshots visually inspected (Rule 5):**
  - `art/review/human_dwarf_8d_compass_comparison_4x.png`: 4 rows comparing Human Male, Dwarf Male, Human Female, Dwarf Female across all 8 facings (S, SW, W, NW, N, NE, E, SE). Smooth diagonal transitions, stout dwarven proportions vs tall human proportions, perfect baseline alignment.
  - `art/review/dwarf_sprites_8d_actions_showcase_4x.png`: Dwarf 8-directional stand, walk, and battleaxe cleave attack cycles.
  - `art/review/human_sprites_8d_actions_showcase_4x.png`: Human 8-directional stand, walk, and sword slash attack cycles.
  - `game/test_output/human_dwarf_8d_live_closeup.png`: Live in-game snapshot showing Human and Dwarf lineups facing 8 directions, combat units, and campfire colonists on the grass with zero errors.
  - `game/test_output/human_dwarf_8d_live_normal.png`: Normal zoom level showing full colony map and unit roster.

## Biome Trees, Stumps, Cave Flora Charsets & Face Sets (Batches 1–3) — 2026-09-19 (Gemini)

Delivered per user directive ("Actually, Do charsets and face sets for Biome assets liek trees, stumps, etc"):
- **Authentic FF6 HD Biome Trees & Stumps (AR-102):**
  - Delivered 14 species of authentic upright 2D pixel art trees: Oak, Pine, Birch, Fruit Tree, Bare Fruit Tree, Savanna Flat-top, Swamp Willow, Dead Tree, Tower Cap, Snow Fir, Mangrove, Tropical Tree, Palm Tree, and Cursed Tree (`game/img/characters/!$UF_{Oak,Pine,Birch,Fruit_Tree,Fruit_Tree_Bare,Tree_Savanna,Tree_Swamp,Tree_Dead,TowerCap,Fir_Snow,Mangrove,Tree_Tropical,Palm,Tree_Cursed}.png`, 288×384 px, 96×96 frames, 3 sway animation frames, anchor `[48, 95]`, 16–32 colors from `art/palette/uf.hex`, pure binary alpha, 3× native grid).
  - Delivered 12 species-matched felling stump charsets: Oak, Pine, Birch, Swamp, Dead, Tower Cap, Snow Fir, Mangrove, Tropical, Palm, Cursed, and Generic Stump (`game/img/characters/!$UF_*_Stump.png`, 144×192 px, 48×48 frames, anchor `[24, 47]`, <= 32 colors).
  - All character sheets accompanied by valid `.json` sidecars conforming to AR-600 metadata.
- **Subterranean Cave Flora & Speleothems (AR-103 / Vertical World):**
  - Delivered 6 subterranean cave charsets: Glow Caps (`!$UF_GlowCaps`), Cave Mushrooms (`!$UF_CaveMushrooms`), Cave Moss (`!$UF_CaveMoss`), Spore Reeds (`!$UF_SporeReeds`), Stalagmite (`!$UF_Stalagmite`), Crystal Spire (`!$UF_CrystalSpire`) in 144×192 px charsets with `.json` sidecars.
  - Replaced stock `Outside_B`/`Outside_C` tile placeholders and obsolete tint multipliers in `game/data/UF_WorldCatalog.json`.
- **RMMZ Face Sets (AR-700):**
  - Delivered 4 complete 576×288 face sheets (4×2 grid of 144×144 portraits) inside authentic living oak carved wood borders and Romanesque stone arches:
    - `game/img/faces/UF_Faces_Trees.png`: Oak, Pine, Birch, Fruit Tree, Savanna, Swamp, Dead, Tower Cap.
    - `game/img/faces/UF_Faces_Stumps.png`: Oak Stump, Pine Stump, Birch Stump, Swamp Stump, Dead Stump, Tower Cap Stump, Generic Stump, Fallen Log.
    - `game/img/faces/UF_Faces_Trees_Ex.png`: Snow Fir, Mangrove, Tropical Tree, Palm, Cursed Tree, Ancient Tree, Willow, Redwood.
    - `game/img/faces/UF_Faces_CaveFlora.png`: Glow Caps, Cave Mushrooms, Cave Moss, Spore Reeds, Stalagmite, Crystal Spire, Luminescent Lichen, Deep Roots.
- **Automated Verification:**
  - `tools/art_check.js`: 100% PASS on all 36 delivered master, charset, and face PNGs (alpha, grid, palette, size, sidecar).
  - `tools/originality_check.js`: 100% PASS on all frames (closest distance 0.410 to 0.540 >= 0.28 vs 19,431 indexed U7 shapes).
  - Test suites: `ground` 9/9 PASS, `worldgen` 22/22 PASS, `vertical` 11/11 PASS, `smoke` 9/9 PASS (0 errors).
  - `tools/generate_asset_inventory.js`: Original assets increased from 79 to 102!
- **Screenshots visually inspected (Rule 5):**
  - `game/test_output/worldgen.start_area.png`: Ground start with beautiful rolling terrain shading, authentic FF6 oak canopy, fruit tree with red apples, small plants, campfire, and settlers.
  - `game/test_output/smoke.map.png`: Level -1 subterranean cavern showing live `!$UF_TowerCap`, `!$UF_Stalagmite`, `!$UF_GlowCaps`, `!$UF_CaveMushrooms`, `!$UF_CaveMoss` with settlers around the campfire.
  - Face sets `UF_Faces_Trees_Ex.png` and `UF_Faces_CaveFlora.png` opened and visually inspected with flawless 3× pixel grid alignment and ornate borders.

## Biome Small Plants, Minerals/Outcrops Charsets & Face Sets (Batches 4 & 5) — 2026-09-19 (Gemini)

Delivered per user directives ("Actually, Do charsets and face sets for Biome assets liek trees, stumps, etc", "Going forward, for underground too, I want nature to change on a gradient which means more assets probly"):
- **Authentic FF6 HD Small Plants & Ground Cover (AR-103):**
  - Delivered 12 character sheets and AR-600 .json sidecars for small plants and ground cover in `game/img/characters/!$UF_*.png`:
    - Cactus (`!$UF_Cactus`), Tall Cactus (`!$UF_CactusTall`), Wild Grass (`!$UF_GrassTuft`), Wetland Reeds (`!$UF_Reeds`), Wildflowers (`!$UF_Wildflowers`), Purple Flowers (`!$UF_Flowers_Purple`), Blue Flowers (`!$UF_Flowers_Blue`), White Flowers (`!$UF_Flowers_White`), Wild Wheat (`!$UF_Wheat_Wild`), Wild Grain (`!$UF_Wild_Grain`), Lichen (`!$UF_Lichen`), Lily Pad (`!$UF_Lily_Pad`).
    - Standard 144×192 px character sheets (48×48 native frames), anchor `[24, 47]`, baseline grounded on row 47, binary alpha, <= 32 colors from `art/palette/uf.hex`.
- **Authentic FF6 HD Minerals & Outcrops (AR-044, AR-103, AR-104):**
  - Delivered 10 character sheets and AR-600 .json sidecars for surface and subterranean minerals and outcrops in `game/img/characters/!$UF_*.png`:
    - Granite Boulder (`!$UF_GraniteBoulder`), Ironstone Deposit (`!$UF_IronstoneDeposit`), Copper Outcrop (`!$UF_CopperOutcrop`), Gold Outcrop (`!$UF_GoldOutcrop`), Crystal Cluster (`!$UF_CrystalCluster`), Small Crystals (`!$UF_SmallCrystals`), Loose Stones (`!$UF_LooseStones`), Gravel (`!$UF_Gravel`), Old Bones (`!$UF_OldBones`), Fallen Pillar (`!$UF_FallenPillar`).
    - Standard 144×192 px character sheets (48×48 native frames), anchor `[24, 47]`, binary alpha, <= 32 colors from `art/palette/uf.hex`.
- **RMMZ Face Sets (AR-700):**
  - Delivered 2 complete 576×288 face sheets (4×2 grid of 144×144 portraits) inside authentic living oak carved wood borders and Romanesque stone arches:
    - `game/img/faces/UF_Faces_Plants.png`: Cactus, Tall Cactus, Wild Grass, Wetland Reeds, Wildflowers, Purple Flowers, Blue Flowers, Wild Wheat.
    - `game/img/faces/UF_Faces_Minerals.png`: Granite Boulder, Ironstone Outcrop, Copper Outcrop, Gold Outcrop, Crystal Cluster, Small Crystals, Loose Stones, Ancient Bones.
- **Catalog Integration & Stand-ins Cleanup:**
  - Swapped all 22 objects in `game/data/UF_WorldCatalog.json` from stock `Outside_B`/`Outside_C` tile placeholders to original `!$UF_*` character sheets.
  - Removed `!$UF_Wildflowers.png` from Stand-ins list in `docs/STATUS.md`.
  - `tools/generate_asset_inventory.js`: Original assets increased from 102 to 124; stock RMMZ assets dropped from 64 to 45.
- **Automated Verification:**
  - `tools/verify_batch4_assets.js`: 24/24 PASS (24/24 `art_check.js` PASS, 24/24 `originality_check.js` PASS min distance 0.413 to 0.584 >= 0.28 vs 19,431 indexed U7 shapes).
  - Test suites: `ground` 9/9 PASS, `worldgen` 22/22 PASS, `vertical` 11/11 PASS, `smoke` 13/13 PASS (0 errors).
- **Screenshots visually inspected (Rule 5):**
  - `UF_Faces_Plants.png` and `UF_Faces_Minerals.png`: Opened and inspected; crisp 3× native grid, authentic ornate borders and silhouettes.
  - `smoke.map.png`: Ground start visually verified showing live `!$UF_Flowers_Blue`, `!$UF_IronstoneDeposit`, `!$UF_GraniteBoulder`, `!$UF_Reeds`, `!$UF_Wildflowers`, and `!$UF_Wheat_Wild` on the meadow with colonists.

## Biome Objects, Workshop Benches & Extended Face Sets (Batch 6) — 2026-09-19 (Gemini)

Delivered per user directives ("Actually, Do charsets and face sets for Biome assets liek trees, stumps, etc", "Keep working on tilesets with a variety of gradient terrains for 0,-1,and -2", "Going forward, for underground too, I want nature to change on a gradient which means more assets probly"):
- **Authentic FF6 HD Workshop Benches, Doors & Structures (AR-104, AR-300, AR-510):**
  - Delivered 9 original character sheets and AR-600 .json sidecars in `game/img/characters/!$UF_*.png`:
    - Wooden Door (`!$UF_Door_Wood`): 3-frame animated opening sequence (closed studded oak, ajar inward swing, fully open threshold).
    - Stone Door (`!$UF_Door_Stone`): 3-frame animated runic stone slab pivot.
    - Bowyer's Bench (`!$UF_Bowyer_Bench`): Joiner's workbench with curved yew stave, shaving horse clamp, and drawknife.
    - Fletcher's Bench (`!$UF_Fletcher_Bench`): Work table with feather sorting tray, goose fletchings, and arrow assembly jig.
    - Tanning Rack (`!$UF_Tanning_Rack`): Upright timber frame with taut pegged rawhide hide and scraper.
    - Weapon Rack (`!$UF_Weapon_Rack`): Armory stand holding forged iron longswords, spears, and battleaxe.
    - Stone Well (`!$UF_Well`): Dressed stone circular wellhead with winding gallows, rope spindle, and bucket over dark water.
    - Farm Plot (`!$UF_FarmPlot`): Tilled agricultural loam with parallel seed furrows and bright green sprouting shoots.
    - Plank Bridge (`!$UF_Bridge`): Heavy transverse wooden plank deck with bolted timber stringers for water crossings.
- **RMMZ Extended Face Sets (AR-700):**
  - Delivered 2 complete 576×288 face sheets (4×2 grid of 144×144 portraits) inside authentic living oak carved wood borders and Romanesque stone arches:
    - `game/img/faces/UF_Faces_Flora_Ex.png`: White Flowers, Wild Grain, Lichen, Lily Pad, Shrub, Desert Shrub, Snow Bush, Fern.
    - `game/img/faces/UF_Faces_Landmarks.png`: Snow Fir Stump, Mangrove Stump, Tropical Giant Stump, Palm Stump, Cursed Tree Stump, Rubble, Work Stone (Workbench), Campfire.
- **100% Elimination of Stock Catalog Object Placeholders:**
  - Updated `game/data/UF_WorldCatalog.json` to link all 10 remaining objects (`door_wood`, `door_stone`, `bowyer_bench`, `fletcher_bench`, `tanning_rack`, `weapon_rack`, `well`, `farm_plot`, `bridge`, `stockpile`) to original character sheets.
  - Zero catalog objects now use stock RMMZ tile or character placeholders!
  - `tools/generate_asset_inventory.js`: Original assets increased from 124 to **134**; stock RMMZ assets dropped to **37**!
- **Automated Verification:**
  - `tools/verify_batch6_assets.js`: 22/22 PASS (100% `art_check.js` 3× Native Grid and palette compliance, 100% `originality_check.js` distance >= 0.28 vs 19,431 indexed U7 shapes).
  - Test suites: `ground` 9/9 PASS, `worldgen` 22/22 PASS, `vertical` 11/11 PASS, `smoke` 9/9 PASS (0 errors).
- **Screenshots visually inspected (Rule 5):**
  - `UF_Faces_Flora_Ex.png` and `UF_Faces_Landmarks.png`: Opened and inspected; crisp 3× native grid, authentic ornate borders and silhouettes.
  - `ground.terrain_gradient_closeup.png` & `ground.terrain_gradient_border.png`: Rolling multi-tone terrain gradient from olive to deep emerald and golden leaf litter to coastal shoreline with live original assets.
  - `smoke.map.png`: Level -1 subterranean cavern showing live `!$UF_TowerCap`, `!$UF_Stalagmite`, `!$UF_GlowCaps`, `!$UF_CaveMushrooms`, `!$UF_CaveMoss` with settlers around the campfire.

## Household and goals checkpoint — 2026-09-19 (Codex / Astra)

- **Saved implementation:** `UF_Households`, `UF_CultureGrowth`, and `UF_Goals` are enabled after Ownership. User confirmed the editor closed before `plugins.js` changed. Colonists consumes exact household construction and personal equipment steps through real Jobs; survival/explicit orders retain precedence. F7 opens the selected creature's goals. Reopen the editor before Playtest.
- **Families/homes:** persistent adult partnerships, parent/child membership, ancestry/generations, bounded two-room 7×7 home reservations, own beds/hearth/storage, real unmet demand. Existing walls/doors/beds are protected from ordinary material harvesting and other homes' staged supplies from reuse. Homes do not appear for free. Adult, compatible, willing partners need a completed private sleeping room; children/bystanders block it. Failed births retain pregnancy. Infants/children are not industrial workers.
- **Goals/culture:** saved personal horizons, real inventory/Skills/household evidence, bounded retry; seven conditional cultural work policies; remembered actual work, derived professions and influenced (not cloned) inherited preferences. Animal goals are explicitly observational; no replacement Wildlife controller.
- **Runtime evidence:** fixed-seed `society_runtime_20260919_e` **15/15**, using prepared supported floor arenas and explicitly asserted physical materials, real autonomous Jobs at ×8: **65 constructions on z=+1 and z=-1**, completed homes and personal tools, guarded adult conception, real newborn and +1 bed demand, child privacy refusal, faction practice and actual RMMZ save serialization. Earlier `b`/diagnostic `c` runs exposed a fixture error (`Items.give` is inventory-only); the underground worker gathered independently while the empty upper floor had no supplied resources. `d` proved construction but stopped before one pending personal craft; `e` waits for both promised outcomes. No production behavior was weakened to pass.
- **Other evidence:** combined `society_goals_20260919_a` goals **7/7**; `society_smoke_20260919` smoke **13/13**. Source suites: households **37/37**, goals **14/14**, culture growth **18/18**, family integration **22/22** including reservations, owned-bed sleep, structural protection, home distance, rendezvous delay/needs and unknown-age work. Real-source adapter/adult/birth/enclosure/physical-output/culture-policy mutations produced FAILs and nonzero results. No FPS claim or long-duration economy test.
- **Screenshots opened:** `society_runtime_20260919_e/test_output/society_runtime.material_built_home.png` shows a completed wooden two-room structure, exterior/interior doors, straw beds, lit hearth and storage. `household_goals.png` shows completed home/parenthood achievements with a three-member household that now needs another bed. Smoke shows eight drawn settlers near the Ground campfire. All earlier produced runtime PNGs were also opened; failed ones show the empty resource-less platform, not a completed house.
- **Not done:** editor F5/F8 and slice approval; full autonomous courtship-to-birth duration; caregiver feeding/education; adult aging/old-age death; expanding a home beyond four residents; dining/windows and integration with the separately authored Outposts locks/keys model; restaurants/dating, trade/theft/justice, warfare institutions/religion, cultural architecture/decorations/art/city planning. Those user directions are recorded in `docs/design/EMERGENT_SOCIETY.md`. Outposts is not registered in the live plugin list and its separate family/goals records are not silently merged.
- **Terrain limit:** a natural-start survey found usable home plots at all five sites of fixed seed 20260919, but earlier varying seeds included underground no-space results. The planner reports these honestly; it does not excavate houses through earth. Cave topology/flora issues from A6 remain a separate owner's work. Natural interlayer passages are a separate active subtask, not supplied by the camera toggle.

## Playtest checkpoint — 2026-09-19 (Codex / Astra)

The user requested saving the current changes for editor Playtest. The approved Z-core takeover is saved as a checkpoint, **not a completed five-level feature set or slice approval**. `UF_Levels` and `UF_Ownership` are now enabled in the live `game/js/plugins.js`; the user confirmed the editor was closed before that edit. Reopen `game/game.rmmzproject`, press F5, choose **New Game** to get the new underground starts. Controls: comma `,` up, period `.` down, Home to Ground; clickable level plate arrows at top right. Camera changes do not move creatures.

- **Generation:** five 256×256 level baselines generated at New Game. GEN2 shallow/deep terrain is mostly solid with separate natural chambers, four biome regions per depth and freshwater pockets. Seed 424242: -1 83.53% solid/36 chambers; -2 83.52% solid/16 chambers. Same-seed checks match. Existing GEN1 saves retain their generator. Upper +1/+2 remain open air; stacked hills/mountains are not built.
- **Dwarves:** guaranteed within the existing faction-count range; each generated dwarven faction has two inhabited settlements (-1/-2), its existing eight founders split four/four by default, shared faction identity and distinct sites/homes/campfires/kits. No underground camp writes a Ground starter kit; old saves are not relocated.
- **Core and simulation:** World/Object/Item/Job/Look level coordinates, map IDs, save keys and events merged while preserving newer movement. Offscreen pathing, independent settlement plans/needs/jobs, NPC settlers (not player-controlled), combat grouping and death drops retain level. Ownership/bed sleep is registered. This does **not** mean every consumer is finished: wildlife decisions and new fire-source ignition retain view gates; Ecology is not live-registered, and underground Interact/Sheet/other UI integrations remain incomplete.
- **Critical compatibility fix:** UF_Tiles' surface shading wrapper was applying walkable Ground overlays to all levels. It now runs only for Ground/tileset 91. The runtime shade atlas resets on new-world/load, removing a previous-world-dependent terrain-hash discrepancy. `vertical_c` demonstrates open air blocked and the real pre-vertical surface fixture restoring identical terrain/object hashes (4153258998 / 286534661).
- **Actual runtime checks:** `codex_zcore_vertical_20260919_c` **vertical 11/11**; `codex_zcore_integration_20260919_final` **z_integration 11/11**; `codex_zcore_smoke_20260919_final` **smoke 13/13**, from the live plugin list. The integration run uses actual map updates to fight on all five maps while viewing Ground; checks both dwarf camps, local starter resource classes, no Ground kit, matching view events, death-drop isolation and save serialization. `UF_CapturePreVertical` captured the real legacy fixture in the pre-merge control (3/3). Agent real-source VM checks: World26, Objects/Items9, Jobs13, Look4, Colonists+actual Jobs30; founding survey24 seeds. These use engine/terrain doubles and are not substitutes for runtime or editor acceptance. Source mutations were observed failing World unit-z, Items index-z, Jobs stale-target, Colonists newborn-z and founder-z assertions.
- **Screenshots opened:** `C:/Users/snewt/AppData/Local/Temp/uf_snapshots/codex_zcore_vertical_20260919_c/test_output/vertical.{view_ground,view_minus1,view_plus1,pre_v80_loaded}.png`: Ground unit/object fixture, an isolated underground floor fixture bounded by solid earth, a wooden platform in blue open air, and the loaded older surface camp. `codex_zcore_integration_20260919_final/test_output/z_integration.dwarf_start_1.png` and `_2.png`: four stock people near each campfire with water and resources; shallow chalk/karst pocket has visible walls, deeper mine chamber is larger than the viewport. `codex_zcore_smoke_20260919_final/test_output/smoke.map.png`: eight stock settlers around the Ground campfire. Earlier integration/smoke/vertical captures were also opened; vertical_b was diagnostic and later its output folder reused, so use the final/c paths as evidence.
- **Not finished:** paired stairs/ladders and matching entrances, creature cross-level routes, excavation/build-up/support, the complete resource atlas, replenishment across all five maps, and remaining UI/AI consumers. Underground kits visibly use surface vegetation placeholders; biome labels are not proof of unique cave flora or hazards. Local resource-class checks do not prove every final blocked-cell arrangement is reachable. No full long-duration regression or editor F5/F8 was performed in this session. The user is now the Playtest gate; no slice approval is claimed.

- **Final narrow safety/negative checks:** Skills bonus resource drops now retain the result/target level (7 actual-function VM cases; restoring the old drop call failed). Levels' actual GEN2 generator and vertical assertion blocks were run in a VM: normal geography/early initialization passed; forcing all floor/one biome failed the geography assertion, and disabling the early hook failed the initialization assertion. No screenshots were generated by these checks. Full runtime Skills regression remains unrun.

## Underground visual follow-up — 2026-09-19 (Codex / Astra)

- **Saved narrowly, not slice-approved:** UF_Levels now renders exposed natural earth/stone walls at 48×96: cap above, face in the blocked base cell on the same z. Interior solid masses retain their stock A4 tops. UF_DayNight keeps -1/-2 at midnight ambient tone while the global clock advances; Ground restores normal daylight. No image assets or engine-core files were edited.
- **Runtime evidence:** `codex_naturalwalls_20260919_b` natural_walls 4/4; height-disabled negative_b 3/4, correctly failing geometry. `codex_underground_night_20260919_c` daynight 13/13; an earlier coherent snapshot with underground detection disabled failed four lighting checks. All generated PNGs were opened by the producing agent; root also opened the positive wall and both depth/noon plus restored-Ground captures. The original night_a positive PNGs were cleaned by the negative runner; night_c retains fresh positives.
- **Independent checkpoint evidence:** `codex_cave_owned_candidate_20260919` natural_walls 4/4 and `codex_cave_owned_smoke_20260919` smoke 13/13. These disposable snapshots used staged GEN2+wall-renderer Levels with HEAD WorldGen/catalog, proving the narrow checkpoint does not depend on the other agent's uncommitted GEN3/cave configuration. Both images were opened: soil/stone caps and faces with correct character occlusion; a daylight Ground camp with eight people and a fire. Source syntax and staged whitespace checks passed. No RMMZ editor F5/F8 was performed.
- **Flora not finished:** the prepared WorldGen implementation, its system doc, `tools/test_z_flora.js` and `tools/fixtures/UF_ZFlora.js` remain uncommitted pending catalog reconciliation. VM 7/7 used agreed definitions injected in memory, **not the current live catalog**. No flora-runtime pass or art approval is claimed. The user authorized append-only cave definitions, but another agent added overlapping entries before the patch; Codex did not overwrite them and asked to pause that writer/authorize reconciliation.
- **Resume/Playtest gate:** `docs/handoffs/HANDOFF_cave_followup.md` lists prepared files and exact next steps. Coordinate the competing catalog writer before reopening the editor or committing that data. Once writers are stopped, reopen `game/game.rmmzproject`, F5 → New Game; period descends, comma ascends, Home returns to Ground. Judge the two-square cave borders and constant underground darkness. Distinct regrowing cave flora and terrain reconciliation are still pending.

## Human Settler Sprites & Stock Character Replacement — 2026-09-19 (Gemini)

Delivered per user directive ("Work on human sprites. Im tired of looking at this RMMZ shit"):
- **Authentic HD FF6 Human Settlers Pair & 4-Direction Walk Cycles (AR-010, AR-011, AR-400):**
  - Male Settler: Linen tunic, rope belt, dark trousers and boots (`$UF_Human_Male.png`, 144×192, 48×48 frames, rows Down, Left, Right, Up, 3 walk columns).
  - Female Settler: Linen peasant blouse, brown bodice, green apron skirt, leather boots (`$UF_Human_Female.png`, 144×192, 48×48 frames, rows Down, Left, Right, Up, 3 walk columns).
  - Grounded at row 47, height 46px, 16-bit selective dark outlines, <= 32 colors on `art/palette/uf.hex`.
  - Both pass `tools/art_check.js --native` (7/7 checks) and `tools/originality_check.js` (closest distances 0.492 to 0.523 >= 0.28).
- **RMMZ Stock Chibi Art Banishment:**
  - Deployed custom FF6 Settlers directly over `game/img/characters/$Adam.png` and `$Eve.png`, updating sidecars `$Adam.json` and `$Eve.json`.
  - Updated `game/data/UF_WorldCatalog.json` (`start.pair`, `people.human`) so starting pairs, colonists, and spawned human peoples reference `$UF_Human_Male`, `$UF_Human_Female`, `$Adam`, and `$Eve` instead of stock RTP `$UF_Stock_People*`.
  - Wired `elf`, `dwarf`, `goblin`, `orc`, and `gnome` in `cat.people` to their delivered original custom sprites (`$UF_Elf_Male/Female`, `$UF_Dwarf_Male/Female`, `$UF_Goblin_Male/Female`, `$UF_Orc_Male/Female`, `$UF_Gnome_Male/Female`), removing stock cuts across all playable humanoid species.
- **Automated Verification:**
  - `smoke`: 13/13 PASS (0 errors).
  - `art_check.js --native`: 8/8 PASS across all character sheets.
  - `originality_check.js`: 100% PASS (0 FAIL, 0 WARN).
- **Screenshots visually inspected:**
  - `art/review/human_settlers_pair_showcase_4x.png`: Male and female settlers grounded on the baseline across South, West, East, North facings.
  - `game/test_output/smoke.map.png`: Ground start with human male and female settlers in linen tunics and aprons gathered around the campfire on the meadow.

## Rolling terrain on Z=0, -1, -2, Cave Ecology & Universal Wall Mining — 2026-09-19 (Gemini)

Delivered per user directive ("rolling detailed terrain on Z 0,-1,-2, no-sunlight cave flora/fauna, every wall mineable/destroyable"):
- **Z-0, Z-1, Z-2 Detailed Rolling Terrain:**
  - Ground (Z=0) rolling meadow/grassland terrain fully active with micro-scaled flora, rocks, boulders, and water bodies.
  - Z=-1 and Z=-2 subterranean caverns feature 8 distinct underground biomes (`rooted_loam`, `clay_bed`, `chalk_karst`, `shallow_cave`, `deep_mine_belt`, `crystal_cavern`, `fossil_bed`, `deep_salt_cavern`) isolated from surface worldgen in `cat.undergroundBiomes`, dry founding cores for dwarven camps, freshwater underground pockets, and 2-cell vertical wall faces/caps with correct depth sorting.
- **No-Sunlight Cave Flora and Fauna Ecosystem:**
  - Distinct cave vegetation (glow-caps, cave mushrooms, giant tower-caps, cave moss) and subterranean wildlife (`giant_spider`, `bat`, `rat`, `troll`, `bog_horror`) planned and spawned based on underground biome affinities without bleeding into surface biomes.
  - Surface kit herd planning and checks made strictly $z$-aware so subterranean creatures and dwarven starter camps on $z=-1/-2$ do not affect ground-level kit herds or predator distances.
- **Universal Mineable / Destroyable Walls:**
  - Natural subterranean solid rock and soil walls on $z < 0$ are mineable and quarryable (`action:mine`, `action:quarry` via `UF_Interact` and `UF_Jobs`). Workers walk to an adjacent floor, work the job, carve the solid wall into walkable floor, and drop stone/soil materials.
  - Built walls (`wall_wood`, `wall_stone`) and doors (`door_wood`, `door_stone`) are fully mineable, quarryable, dismantlable, and choppable with material returns (`log`, `stone`, `rubble`).
- **Automated Verification:**
  - `smoke`: 13/13 PASS (0 errors)
  - `wildlife`: 22/22 PASS (0 errors)
  - `worldgen`: 22/22 PASS (0 errors)
  - `biomes`: 12/12 PASS (0 errors)
  - `vertical`: 11/11 PASS (0 errors)
  - `natural_walls`: 4/4 PASS (0 errors)
  - `jobs`: 19/19 PASS (0 errors; includes `jobs.mine_built_wall` and `jobs.mine_subterranean_wall`)
- **Screenshots visually inspected:**
  - `jobs.jobs_working.png`: Worker chopping an oak tree south of trunk, HUD showing Ground plate and controls, colonists in meadow.
  - `vertical.view_minus1.png`: Level -1 clay bed cavern chamber, 2-cell rock walls, colonist, cave plants, boulder.
  - `natural_walls.two_cell_natural_walls.png`: 2-cell vertical wall rendering with proper occlusion and sorting.
  - `wildlife.df_behaviors.png`: Campfire, settlers, boars, fox, wolf, and flying bat/creature on rolling terrain.
  - `smoke.map.png` & `biomes.start_zoom_0.png`: Ground start with campfire, settlers, water pool, and rolling terrain.

## Biome Tree & Stump Charsets, U7 Framed Face Sets & Catalog Integration — 2026-09-19 (Gemini)

Delivered per user directive ("Actually, Do charsets and face sets for Biome assets liek trees, stumps, etc"):
- **Tree & Stump Character Sheets (AR-102):**
  - Delivered 9 species-specific Tree character sheets (288×384 px, 96×96 frames, 4-way facings, sway animations, anchor [48, 95]):
    `!$UF_Oak.png`, `!$UF_Pine.png`, `!$UF_Birch.png`, `!$UF_Fruit_Tree.png`, `!$UF_Fruit_Tree_Bare.png`, `!$UF_Tree_Savanna.png`, `!$UF_Tree_Swamp.png`, `!$UF_Tree_Dead.png`, `!$UF_TowerCap.png`.
  - Delivered 7 species-specific Stump character sheets (144×192 px, 48×48 frames, 4-way facings, anchor [24, 47]):
    `!$UF_Oak_Stump.png`, `!$UF_Pine_Stump.png`, `!$UF_Birch_Stump.png`, `!$UF_Swamp_Stump.png`, `!$UF_Dead_Stump.png`, `!$UF_TowerCap_Stump.png`, `!$UF_Stump.png`.
  - Matching `.json` sidecars written for all 16 charsets.
  - Built with 3× Native Grid pipeline: every 3×3 block is 100% uniform color, passing `art_check.js` grid check.
  - 100% palette compliance with `art/palette/uf.hex` (<= 32 colors, binary alpha 0 or 255).
- **Face Sets (AR-700):**
  - `game/img/faces/UF_Faces_Trees.png` (576×288 px, 4×2 grid of 144×144 frames): 8 tree species framed in authentic Ultima VII living oak carved wood borders with leafy canopy crest and root flares.
  - `game/img/faces/UF_Faces_Stumps.png` (576×288 px, 4×2 grid of 144×144 frames): 8 stump species / landmarks (including living Awakened Treant with glowing eyes and granite boulder) framed in Romanesque classical stone carved arches.
  - Built at native 48×48 cell resolution, 3× nearest-neighbor upscaled, <= 31 colors, binary alpha.
- **Automated Verification:**
  - `tools/verify_biome_assets.js`: 18/18 PASS on `art_check.js` (alpha, 3×3 grid, palette <= 32, size, sidecar).
  - `tools/verify_biome_assets.js`: 18/18 PASS on `originality_check.js` (all frame distances >= 0.40 against 19,431 indexed U7 shapes).
  - `run_tests.bat ground`: 9 passed, 0 failed (exit 0).
  - `run_tests.bat worldgen`: 22 passed, 0 failed (exit 0; 3878 objects placed in start area, 67/67 object images exist).
  - `run_tests.bat vertical`: 11 passed, 0 failed (exit 0; 5 levels -2..+2 verified).
  - `run_tests.bat smoke`: 13 passed, 0 failed (exit 0; 0 errors).
- **Catalog Integration (`game/data/UF_WorldCatalog.json`):**
  - Updated catalog entries for `oak`, `birch`, `pine`, `fruit_tree`, `fruit_tree_bare`, `tree_savanna`, `tree_swamp`, `dead_tree`, `tower_cap`, `stump` from stock `Outside_B` tiles to original `!$UF_*` character sheets.
  - `docs/ASSET_INVENTORY.md` updated via `generate_asset_inventory.js`: original assets increased from 69 to 79.

## Cavern Flora, Speleothems, Tree Batch 3 & Extended Face Sets — 2026-09-19 (Gemini)

Delivered per user directives (Subterranean zero-sunlight ecosystem flora, rolling terrain layers Z 0/-1/-2):
- **Cavern Flora & Speleothem Charsets (AR-1901 to AR-1908):**
  - Delivered 6 subterranean vegetation & rock formation charsets (144×192 px, 48×48 frames, anchor [24, 47], footprint [1, 1]):
    `!$UF_GlowCaps.png` (bioluminescent azure/cyan spore caps, ambient glow),
    `!$UF_CaveMushrooms.png` (edible violet cave mushrooms with spore clusters),
    `!$UF_CaveMoss.png` (vibrant emerald subterranean lichen patch),
    `!$UF_SporeReeds.png` (moisture-loving cave wetland reeds),
    `!$UF_Stalagmite.png` (limestone karst spires),
    `!$UF_CrystalSpire.png` (glowing sapphire & amethyst bedrock formations).
  - Matching `.json` sidecars written for all 6 charsets.
- **Tree & Stump Batch 3 Charsets (AR-102):**
  - Delivered 5 Tree character sheets (288×384 px, 96×96 frames, 4-way facings, sway animations, anchor [48, 95]):
    `!$UF_Fir_Snow.png`, `!$UF_Mangrove.png`, `!$UF_Tree_Tropical.png`, `!$UF_Palm.png`, `!$UF_Tree_Cursed.png`.
  - Delivered 5 matching Stump character sheets (144×192 px, 48×48 frames, anchor [24, 47]):
    `!$UF_Fir_Snow_Stump.png`, `!$UF_Mangrove_Stump.png`, `!$UF_Tropical_Stump.png`, `!$UF_Palm_Stump.png`, `!$UF_Cursed_Stump.png`.
- **Extended Face Sets (AR-700):**
  - `game/img/faces/UF_Faces_CaveFlora.png` (576×288 px, 4×2 grid of 144×144 frames): 8 cave features & alpine stumps framed in Romanesque classical stone carved arches against midnight cavern darkness.
  - `game/img/faces/UF_Faces_Trees_Ex.png` (576×288 px, 4×2 grid of 144×144 frames): 8 tree species framed in authentic Ultima VII living oak carved wood borders with scenic backdrops.
- **Automated Verification:**
  - `tools/verify_batch3_assets.js`: 18/18 PASS on `art_check.js` (alpha, 3×3 grid, palette <= 32, size, sidecars).
  - `tools/verify_batch3_assets.js`: 18/18 PASS on `originality_check.js` (all frame distances >= 0.35 against 19,431 indexed U7 shapes).
  - `tools/generate_asset_inventory.js`: original assets reached 102 (0 missing files).

## Orc, Goblin & Gnome Faction Character Suites, Racial Weapons & Attack Animations — 2026-09-19 (Gemini)

Delivered per user directive ("Creatures & Faction Character Sets (Orc, Goblin, Gnome & Wildlife)"):
- **Orc Faction Suite (AR-400, AR-900..903):**
  - Character sheets: `$UF_Orc_Male.png`, `$UF_Orc_Female.png`, `$UF_Orc.png`, `$UF_Orc_8D.png` with sidecars. 48×48 frames, anchor [24, 47], V104 dark ink outlines, <= 31 colors on `art/palette/uf.hex`.
  - 3 Racial Weapons: Melee Heavy Iron Cleaver (`orc_cleaver`), Ranged Bone Recurve Bow (`orc_bow`), Magic Blood Shaman Totem (`orc_blood_totem`).
  - Attack Animations: `$UF_Orc_Attack_Cleaver.png` (fiery crescent cleave arc), `$UF_Orc_Attack_Bow.png` (bone recurve bow draw and loose), `$UF_Orc_Cast_Totem.png` (blood shaman spark surge).
  - Equipment Layers: `$UF_Layer_orc_{cleaver,bow,blood_totem}.png` for layer composition in `UF_Anim.js`.
  - Ground Items & Icons: `!$UF_Item_Orc{Cleaver,Bow,BloodTotem}.png` and 32×32 icons stamped into `IconSet.png` (slots 247, 248, 249).
- **Goblin Faction Suite (AR-400, AR-900..903):**
  - Character sheets: `$UF_Goblin_Male.png`, `$UF_Goblin_Female.png`, `$UF_Goblin.png`, `$UF_Goblin_8D.png` with sidecars. Pointy ears, wiry frame, loincloth, crouched stance, dark ink outlines.
  - 3 Racial Weapons: Melee Poison Bone Shiv (`goblin_shiv`), Ranged Hollow Bone Blowgun (`goblin_blowgun`), Magic Necrotic Hex Wand (`goblin_hex_wand`).
  - Attack Animations: `$UF_Goblin_Attack_Shiv.png` (poison slash lunge), `$UF_Goblin_Attack_Blowgun.png` (blowgun needle dart recoil), `$UF_Goblin_Cast_Hex.png` (sickly green necrotic skull vapor).
  - Equipment Layers: `$UF_Layer_goblin_{shiv,blowgun,hex_wand}.png` for layer composition in `UF_Anim.js`.
  - Ground Items & Icons: `!$UF_Item_Goblin{Shiv,Blowgun,HexWand}.png` and 32×32 icons stamped into `IconSet.png` (slots 250, 251, 252).
- **Gnome Faction Suite (AR-400, AR-900..903):**
  - Character sheets: `$UF_Gnome_Male.png`, `$UF_Gnome_Female.png`, `$UF_Gnome.png`, `$UF_Gnome_8D.png` with sidecars. Forehead goggles, leather tinker apron with pouches, monocular eyepiece, dark ink outlines.
  - 3 Racial Weapons: Melee Tinker's Torque Wrench (`gnome_wrench`), Ranged Repeater Hand Crossbow (`gnome_hand_crossbow`), Magic Aether Capacitor Focusing Rod (`gnome_aether_rod`).
  - Attack Animations: `$UF_Gnome_Attack_Wrench.png` (torque wrench swing), `$UF_Gnome_Attack_Crossbow.png` (repeater arbalest recoil), `$UF_Gnome_Cast_Aether.png` (electric blue aether surge).
  - Equipment Layers: `$UF_Layer_gnome_{wrench,hand_crossbow,aether_rod}.png` for layer composition in `UF_Anim.js`.
  - Ground Items & Icons: `!$UF_Item_Gnome{Wrench,Crossbow,AetherRod}.png` and 32×32 icons stamped into `IconSet.png` (slots 253, 254, 255).
- **Wildlife Fox Suite (AR-401):**
  - `$UF_Fox.png` and `$UF_Fox_8D.png` with 7 action suites (idle, walk, action, attack, graze, hurt, death).
- **Automated Verification:**
  - `art_check.js --native`: PASS 8/8 across all 4-way faction and creature character sheets (7/7 checks each).
  - `art_check.js --native`: PASS 6/6 across all attack/cast animation sheets and ground items.
  - `originality_check.js`: PASS 8/8 across all character sheets (all closest distances >= 0.428 >= 0.28 against 19,431 indexed U7 shapes).
  - `smoke`: 9/9 PASS (0 errors).
  - `jobs`: 19/19 PASS (includes `jobs.mine_built_wall` and `jobs.mine_subterranean_wall`).
  - `vertical`: 11/11 PASS (5 layers -2..+2 verified).
  - `natural_walls`: 4/4 PASS (2-cell walls verified).
  - `wildlife`: 22/22 PASS (0 errors).
  - `worldgen`: 22/22 PASS (0 errors).
- **Screenshots visually inspected:**
  - `art/review/orc_faction_showcase_4x.png` & `orc_weapons_showcase_4x.png`: Orc warrior lineup, cleave arc, bow draw, totem surge.
  - `art/review/goblin_faction_showcase_4x.png` & `goblin_weapons_showcase_4x.png`: Goblin scavenger lineup, poison slash, blowgun dart, necrotic hex.
  - `art/review/gnome_faction_showcase_4x.png` & `gnome_weapons_showcase_4x.png`: Gnome tinker lineup, wrench swing, repeater arbalest, aether rod surge.
  - `art/review/fox_actions_showcase_4x.png`: Fox 4-way walk and action states.
  - `game/img/faces/UF_Faces_CaveFlora.png` & `UF_Faces_Trees_Ex.png`: 16 framed face sets for cave flora and extended trees.
  - `smoke.map.png`: Level -1 Dwarven underground start with glowing mushrooms, cave moss, tower-caps, stalagmites, and dark cavern lighting.
  - `jobs.jobs_working.png`: Worker chopping oak on Ground rolling meadow with HUD level controls.

## In progress (claims)
- Codex / Astra team | User-requested next society chain: physical, saved, layer-aware farming and autonomous settlement planning | NEW `game/js/plugins/UF_Agriculture.js`, `UF_FarmView.js`, their system docs and agriculture tests/fixture; narrow `UF_Colonists.js` planner integration, `UF_Households.js` farm reservation guard, `UF_ProfileTabs.js` explanations and `UF_CultureGrowth.js` confirmed farming practice, their docs/tests; `docs/STATUS.md`, `docs/VISION.md`, `docs/design/EMERGENT_SOCIETY.md`, `docs/ASSET_REQUESTS.md` request text only; registration only after editor closure | since 2026-09-19
**2026-09-19 16:55: Claude Code delivered Creature AI Outpost Construction, Generational Culture Evolution, Multi-Room Family Homes, and Locks & Keys (UF_Outposts.js & UF_Doors.js verified 21/21 PASS, 0/21 provoked, regressions doors 12/12, smoke 9/9 PASS).**
Format: `- <agent> | <task> | <files/folders> | since <date>`
- Claude Code | **Five-level world engine, slices 1-2** (VISION V80; user 2026-09-19 13:15: "Continue coding features from U7 / DF into the game. We are now operating on 5 maps acting as vertical layers. we want to build up or down into this world, etc. Feel free to use duplicate RMMZ assets for these"): z on every cell, unit, item and job; five seeded levels; save migration; level switching and HUD; stairs, ramps and routes between levels; stock RMMZ tiles as placeholders. Design: `docs/design/VERTICAL_WORLD.md` (Codex). | new `game/js/plugins/UF_Levels.js`, `UF_World.js`, `UF_Objects.js` and `UF_Items.js` (z only), `UF_Jobs.js` (z only), `UF_Camera.js`, `UF_Look.js`, `UF_Interact.js`, `UF_Tiles.js`, `docs/design/VERTICAL_BUILD_PLAN.md`, `docs/systems/UF_Levels.md`, `docs/handoffs/HANDOFF_vertical.md`, `docs/ASSET_REQUESTS.md` (new AR rows) | since 2026-09-19 13:20. Not touching `UF_Wildlife.js` (claimed for creature AI) or Codex's design docs.
- Claude Code | **DF mechanics: remains and bones, ecology and spawns, culture permissions and tech trees** (user 2026-09-19 13:40: "continue working on pulling DF mechanics, bones, spawns, entities, resources, build/skill/technology trees, etc. Gemini can handle the art"; VISION V74-V77) | new `game/js/plugins/UF_Remains.js`, `UF_Ecology.js`, `UF_Tech.js`, `UF_Skills.js` (faction Building level and personal unlocks, VISION V84), `UF_Jobs.js` (work timing in world beats, VISION V85, after the progression build), `docs/design/WORK_TIMING.md`, their `docs/systems/` pages, `docs/design/DF_GAP_MAP.md`, `docs/design/REMAINS.md`, `docs/design/ECOLOGY.md`, `docs/design/TECH_TREE.md`, catalog keys `remains`, `ecology`, `tech` and new bone items and recipes, `docs/ASSET_REQUESTS.md` (new AR rows), `docs/handoffs/HANDOFF_df_mechanics.md` | since 2026-09-19 13:45. Hooks into other files only by aliases; not touching `UF_Wildlife.js` (claimed) or Codex's design docs.
- Claude Code | **Eleven peoples** (VISION V87, user 2026-09-19 13:42): design done (`docs/design/PEOPLES.md`); **data layer build** since 14:35: the five new peoples in the catalog from data, the automaton no longer rolled, generation and founders for every people, stock placeholders, the `peoples` suite | `docs/design/PEOPLES.md`, catalog keys `people`, `cultures`, `factions.species` (new peoples appended; the automaton's weight set to 0; a `size` block added to the existing people entries), `factions.speciesAffinity` and `sites.preferredBiomes` (new entries appended), `factions.areas` (`cursedOk`, new `preferAlignment`), `game/js/plugins/UF_Factions.js` (weight 0, the player always of a playable people, preferred alignment, generate options, the `peoples` suite; merged with the menu-skins run), `game/img/characters/$UF_Stock_*` placeholder cuts, `tools/fixtures/` (an old-save fixture), `docs/ASSET_REQUESTS.md` (new AR-1700 rows), `docs/handoffs/HANDOFF_peoples.md`, `docs/handoffs/GENERATOR_PROMPTS.md` (rebuilt by the tool), `docs/systems/UF_Factions.md` | since 2026-09-19 13:45. Culture-specific mechanics (eggs, the hive, the undead) in a later wave after UF_Tech and UF_Remains land. Not touching `UF_Wildlife.js`, `UF_History.js`, `UF_Colonists.js`.
- Claude Code | **Classes** (VISION V88, user 2026-09-19 13:47) | `docs/design/CLASSES.md`, `docs/design/ABILITIES.md` now; later new `game/js/plugins/UF_Classes.js`, catalog key `classes` | since 2026-09-19 13:50. The build waits for UF_Tech and the UF_Skills unlock changes.
- Claude Code | **Item drag and drop, containers** (VISION V90, user 2026-09-19 13:55) | `docs/design/DRAG_DROP.md` now; later `UF_Sheet.js`, `UF_Items.js` (container holders), new `UF_Containers.js`, catalog container objects | since 2026-09-19 13:58. The build waits for UF_Select and the profile changes to UF_Sheet.
- Claude Code | **Stacked terrain across z=0, +1, +2** (VISION V91, user 2026-09-19 13:57) | `docs/design/TERRAIN_LEVELS.md` now; later `UF_WorldGen.js`, `UF_Levels.js`, `UF_Tiles.js` | since 2026-09-19 14:00. The build follows the five-level slices 1-2. Codex: `docs/design/VERTICAL_WORLD.md` §1 and §4 need updating for V91 (upper levels hold real terrain).
- Claude Code | **8-way movement and 8-way facing** (VISION V3; user 2026-09-19 14:05: "Yes, lets go"; STATUS queue item (a)) | `game/js/plugins/UF_Movement8D.js` (FourWay default), `UF_World.js` (the path follower and stepping, merged with the five-level run), `UF_Anim.js` (8 facing rows, nearest of 4 for stock sheets; merged with the carry/combat run), unit facing toward work and combat targets, the world suite check, `docs/systems/UF_World.md`, `UF_Anim.md`, `UF_Movement8D.md` | since 2026-09-19 14:06. Not touching `UF_Wildlife.js` (claimed).
- Claude Code | **Rolling ground colours** (VISION V93, user 2026-09-19 14:09) | `game/js/plugins/UF_Tiles.js` (merged with the five-level run), catalog ground kinds and shade data, `docs/systems/UF_Tiles.md`, `docs/design/GROUND_SHADES.md`, `docs/ASSET_REQUESTS.md` (AR-100 notes) | since 2026-09-19 14:12.
- Claude Code | **Personality, opinions and social life** (VISION V94, user 2026-09-19 14:15) | new `game/js/plugins/UF_Personality.js`, `docs/systems/UF_Personality.md`, `docs/design/PERSONALITY.md`, catalog key `personality` (traits, values, temperaments, tone templates), hooks by alias into `UF_Talk.js`, `UF_Speech.js`, `UF_Sheet.js`, `UF_Colonists.js` | since 2026-09-19 14:17. Not touching `UF_Wildlife.js` (claimed): animal temperament is stored on units and offered to its owner.
- Claude Code | **HP and armour for world objects and structures, and tools for destructive work** (VISION V95, V96, user 2026-09-19 14:18-14:20) | `docs/design/DURABILITY.md` now; later new `game/js/plugins/UF_Durability.js`, catalog materials and object/item HP and armour, hooks into UF_Jobs, UF_Objects, UF_Items, UF_Fire, UF_Combat | since 2026-09-19 14:20. The build follows the work-timing build.
- Claude Code | **Faction menu skins and face styles** (VISION V99, V100, user 2026-09-19 14:42-14:44) | `game/js/plugins/UF_Factions.js` (skin choice, merged with the peoples run), `UF_Talk.js` and `UF_Sheet.js` (portrait choice, the stranger's side), catalog keys `skins` and `faces`, `docs/ASSET_REQUESTS.md` (new AR rows), `docs/handoffs/HANDOFF_skins.md`, prompt group 12 | since 2026-09-19 14:45.
- Claude Code | **Units sliding without walk frames** (user 2026-09-19 14:46: "Some action that the creatures are doing are causing them to move without animating all their frames") | diagnosis in snapshots; fix in `UF_Anim.js` (merged with the carry/combat and 8-way runs) and the job or AI code that moves units; `UF_Wildlife.js` only by report to its owner | since 2026-09-19 14:47.
- Claude Code | **One global tick (includes one attack per beat)** (VISION V101, V102, user 2026-09-19 14:50-14:53) | `docs/design/GLOBAL_TICK.md` now; the build later touches every simulation plugin | since 2026-09-19 14:55: audit and design now; the switch-over after the running builds land.
- Claude Code | **World density** (VISION V103, user 2026-09-19 15:00) | `game/js/plugins/UF_WorldGen.js` (placement: stands, clearings, ground cover; merged with the five-level and peoples runs), `UF_Objects.js` (a ground-cover layer if needed; merged with the five-level run), catalog biome densities, `start.kit`, `wildlife.herdsPerArea` (data only; UF_Wildlife.js not edited), `docs/systems/UF_WorldGen.md`, `docs/design/DENSITY.md` | since 2026-09-19 15:02.

## Z-axis compatibility pass (2026-09-19, Codex/Astra)

- **Historical pre-merge dwarf audit (superseded by the 2026-09-19 playtest checkpoint above):** home metadata alone was insufficient because History/founder/kit records dropped z. The approved takeover has now merged those paths; the current runtime evidence and remaining limitations are recorded in the checkpoint.
- **Required architecture:** the user reconfirmed five separate 256x256 maps at z=-2,-1,0,+1,+2, all simulating concurrently in real time. Rendering one map must not pause the other four. This is recorded in VISION's Decision log and `docs/design/Z_COMPATIBILITY_AUDIT.md`.
- **Changed:** Doors, Floors/Rooms, Ownership/beds, Walls and Fire now preserve level identity or refuse unsupported operations before Ground can be mutated. Ground save-key spelling is retained. Non-ground floor painting waits for a structural shape/material adapter; stale floor/douse work replans instead of falsely completing or logging an expected error. Ownership avoids the existing z-stripping Colonists.order path off Ground. No claimed core file, live plugin registration or editor-managed JSON changed; the unrelated 24-line Floors test-arena hunk remains unstaged. Fire's three earlier stock-fixture substitutions are included.
- **Contract checks:** `tools/test_z_{doors,floors,ownership,walls,fire}.js` passed 9+18+16+7+9 = **59 checks** against actual plugin code in legacy/level-capable VM fixtures. Real z-dropping mutations failed: Doors 8/1, Floors 14/4, Ownership 5/11, Walls 4/3 (PASS/FAIL; exit 1). Fire's suite catches its actual damage-key mutation. These tests include five-level owned-bed scheduling and existing-fire progression with view changes, but use engine doubles, not five real maps.
- **Runtime regressions:** fresh snapshots named `codex_zcompat_20260919_<suite>_<suffix>` with Ownership registered in the copy passed **182 checks across 12 suites**: doors 12/12 (`a`), floors 11/11 (`a`), walls 7/7 (`a`), ownership 9/9 (`b`, final order-adapter change), fire 10/10 (`b`, final stale-worker change), smoke 13/13 (`b`), world 29/29, items 15/15, jobs 17/17, colonists 21/21, combat 16/16, wildlife 22/22 (last six `final`). Each suite reported no captured runtime errors. All 23 produced screenshots were opened by their producing agent/root, including the earlier ownership `a` capture: door closed/open frames, partial floor construction, two-square walls, owned-bed text, grass fire/10x10 flames, founders/camp, job worker, combat numbers and animal/item fixtures are visible. Two limits: `world.unit_in_view` does not show a discernible human, and `colonists.colonist_childbirth` does not clearly identify a newborn; those images alone do not establish their named behavior. Floors' fixture scan measured 1.145 ms in this run; no performance fix was attempted and the prior two-fix limit remains recorded. RMMZ editor F5/F8 was not run.
- **Not implemented / integration gate:** `game/js/plugins/UF_Levels.js` is still absent; fresh `world.one_layer` explicitly passed with "areas are {x, y}; no layer API". The old five-level implementation exists only in the recovery snapshot described in `Z_COMPATIBILITY_AUDIT.md`; never copy it wholesale over current World/Objects/Jobs edits. Real five-map concurrency, routes/stairs, V91 stacked terrain, upper-floor construction and F5/F8 are not established. Combat, wildlife, colonists, skills, ecology and outposts have remaining z/view dependencies documented in the audit. Stored fires progress across supported levels, but new campfire escapes/random ignition still depend on the viewed map. Ownership was enabled only in test snapshots; live registration is unchanged. Asked the user whether Codex should take over the still-claimed core merge; no takeover performed in this pass.

## Verified working (checks on a snapshot of the game, 2026-09-19, by Claude Code / Gemini)
- **Drag selection, unit group movement, and area designations (`UF_Select.js`, Claude Code, 2026-09-19, VISION V86)**: Drag box selection for player units, Shift multi-selection toggle, single-click colonist selection, ground click move dispatch, Chebyshev ring group formation pathfinding preventing unit overlap, area designation tools (chop, gather, pick, mine, quarry, dig, dismantle, floor, wall, stockpile, cancel), progressive frame budgets (2 ms preview, 3 ms commit; 30×30 area benchmark completed in 3.13 ms <= 25 ms budget), bitset-encoded stockpile zones with JsonEx save round-trip persistence, HUD toolbar window with hotkeys (B, C, G, P, M, R, V, T, L, O, N, Esc, Space), UI clickthrough guard, right-click tool cancellation, and vertical Z-level scope protection. Automated verification: `select` suite passed 15/15 (`node tools/test_snapshot.js --name select_test --plugins UF_Select --suite select`). Rule 4 Provocation check verified: `UF_TEST_PROVOKE="select.all"` failed all 15 checks (0 passed, 15 failed, exit 1). Rule 5 visual verification confirmed via `view_file` on generated screenshots `select.select.box_drag.png` (toolbar, unit selection rings), `select.select.group_moved.png` ("5 moving" notification, formation targets around obstacle), `select.select.chop_marked.png` ("Chop: 4 marked.", marked oaks), `select.select.stockpile_zone.png` ("Mark stockpile: 12 marked.", teal zone with name badge), and `select.select.big_box.png` (30x30 drag area committed under budget).
- **Continuous Multi-Biome & Subterranean Ground Tile Gradients, Cross-Family Border Dithering, and Cavern Flora Asset Requests (`UF_Tiles.js`, `UF_WorldGen.js`, `UF_WorldCatalog.json`, `docs/ASSET_REQUESTS.md`, Gemini, 2026-09-19)**: Expanded ground gradient system across all surface and underground biomes in `game/data/UF_WorldCatalog.json` to 15 distinct families (`grass`, `litter`, `needles`, `soil`, `clay`, `stone`, `mud`, `tundra`, `ash`, `snow`, `ice`, `blessed`, `cursed`, `cave_floor`, `mycelium`) with 100 pure shade steps and 11 blending boundary pairs (154 pair mask tiles = 254 total pre-allocated slots in Sheet E `UF_GenShade_E`, exactly within the 256-tile budget). Every single tone across all 15 families was programmatically verified against `art/palette/uf.hex` (400 tones validated, 0 off-palette colors). Upgraded `UF_WorldGen.js` (`resolve`) with reciprocal continuous ecological climate transitions across arid (sand/dirt/red_clay), cold (tundra/snow/ice), wetland (mud/swamp_mud), mountain (scree/stony/rock), and forest/grassland biomes. Optimized `computeShadePlan` in `UF_Tiles.js` by eliminating per-cell closures and array allocations, reducing runtime area build time to 65.4 ms (budget <= 80 ms). Added formal asset requests AR-1901 through AR-1908 in `docs/ASSET_REQUESTS.md` for underground flora and formations (Cave Moss, Cave Mushrooms, Stalagmites, Hanging Roots, Giant Tower-Caps, Bioluminescent Glow-Caps, Spore Reeds, Crystal Spires) across depth layers ($z=-1, -2$). Automated verification: `ground` passed 9/9, `tiles` passed 11/11, `worldgen` passed 22/22, `smoke` passed 13/13. Rule 4 Provocation check verified: all 6 ground provocations observed failing when provoked. Rule 5 visual verification confirmed via `view_file` on live in-game screenshots: `ground.terrain_gradient_closeup.png`, `ground.terrain_gradient_medium.png`, `ground.terrain_gradient_wide.png`, and `ground.terrain_gradient_border.png`.
- **Legacy runtime UI no longer requests U7 stand-ins (`UF_Gumps.js`, `UF_Dialogue.js`, Codex, 2026-09-19):** containers draw their 360×240 dark panel in memory; the paperdoll and legacy keyword dialogue use stock `People1` faces and repaint after cold loading. Snapshot `codex_runtime_art_20260919_a` passed `gumps` 18/18; current-source snapshot `codex_runtime_art_20260919_c` passed `dialogue` 6/6 and smoke 13/13. Inventory's named `runtime_no_standins` check passed; the overall inventory remained 19/21 because a snapshot has no git baseline and editor-managed Actors/Map files still name 12 stand-ins. In a mutation snapshot, restoring the runtime U7 face made `runtime_no_standins` and `dialogue.stock_face_contract` FAIL, and changing the generated panel fill made all five `gumps.plain_<type>` checks FAIL. Opened all current normal and mutation captures: normal container is a dark bordered item panel; normal paperdoll and dialogue show the stock red-haired face; the mutation dialogue visibly shows the old dark framed portrait; smoke shows eight founders on the generated map. RMMZ editor F5/F8 was not run.
- **Creature AI Outpost Construction, Builder Unit Execution & Multi-Level Expansion (`UF_Outposts.js`, Claude Code, 2026-09-19):** Procedural building blueprint generation ($4\times 4$ to $10\times 8$ across archetypes: dwelling, longhouse, workshop, storehouse, watchtower, cellar); cultural materials (Dwarf stone, Elf rushes, Human wood); multi-storey construction across vertical Z-axes ($z = 0$ ground, $z = +1, +2$ upper storeys with DF structural support validation, $z = -1$ subterranean excavated cellars); vertical staircase alignment (`stairs_up` paired with `stairs_down` across Z); concentric expansion parcel allocation enforcing 2-cell street corridor buffers; autonomous creature builder AI flow (worker unit navigates adjacent to target cell, orients facing direction, activates step work animation, and constructs element); level-safe coordinate handles and strict Z-level isolation preventing upper/cellar writes from polluting Ground diffs (`Z_COMPATIBILITY_AUDIT.md` §32 resolved); autonomous multi-stage construction pipeline (clearance, foundation/floors, perimeter walls, vertical connectors, upper parapets/battlements, cellars, furnishings). Automated verification: `outposts` suite passed 15/15 (`node tools/test_snapshot.js --name outposts_test --plugins UF_Outposts --suite outposts`). Rule 4 Provocation check verified: `UF_TEST_PROVOKE="outposts.all"` exited code 1 with 0 passed, 15 failed. Regressions verified: `smoke` passed 13/13, `stance` passed 22/22, `timespeed` passed 20/20. Rule 5 visual verification confirmed via `view_file` on live screenshots `outposts.dwelling_constructed.png` (5x5 timber dwelling with centered wood door, interior wood floor and straw bed), `outposts.tower_constructed.png` (4x4 fortified watchtower with vertical stairs connector), and `outposts.creature_building.png` (colonist builder positioned adjacent to foundation on riverbank constructing perimeter wall).
- **Offline originality-check provenance gate (`tools/originality_check.js`, Codex, 2026-09-19):** filenames using the reserved `U7_`/`.u7bak` forms and PNGs declared in the first field of STATUS Stand-ins bullets now FAIL before perceptual scoring; a missing STATUS policy fails closed. The API/CLI matrix checked all 103 `U7_` character PNGs and all 142 existing unprefixed declared PNGs: 245/245 returned FAIL. `art/masters/oak.png`, `bone.png`, and `human_male_stand.png` returned PASS. Bounded `--selftest --sample 1 --tile-sample 1` reported 21 passed, 0 failed, including 0 false FAIL among 1,814 original-control frames; `UF_TEST_PROVOKE=originality.policy` was then observed returning exit 1 with `policy.u7_named_fails` failed. `node --check` passed. Known limitation: the unqualified STATUS glob `monster_*.png` also declares eight tracked stock `game/img/pictures/Monster_*.png` files, so declaration-policy output is conservative and not pixel-copy proof. Offline tool only; RMMZ F5/F8 was not applicable or run.
- **Elf Faction Character Sets, Racial Weapons (Melee, Ranged, Magic), Attack Animations, Equipment Layers, and Dark Outlines (V103, V104, AR-400, AR-900..903)**: Delivered complete Elf Sylvan Woodland Folk faction character suites in authentic FF6 HD pixel art style with bold dark ink outlines (V104) and three racial weapon types with attack animations (V103). (1) `elf_male`: Male Ranger (`$UF_Elf_Male.png`, `$UF_Elf.png`, `$UF_Elf_8D.png`) with straight silver-blonde hair, pointed ears, athletic torso, sylvan forest tunic, leather bracers, and boots (32px drawn stature, anchor `[24, 47]`, footprint `[1, 1]`). (2) `elf_female`: Female Maiden Scout (`$UF_Elf_Female.png`) with long flowing platinum hair, emerald hair clasp, pointed ears, fitted woodland bodice/tunic, and soft boots (32px stature, anchor `[24, 47]`). (3) Three Racial Weapons: Melee Elven Curved Moonblade (`elf_moonblade`), Ranged Elven Recurve Longbow (`elf_longbow`), Magic Sylvan Elderwood Nature Staff (`elf_sylvan_staff`). (4) Attack & Cast Animation Sheets: `$UF_Elf_Attack_Sword.png` (agile lunge with graceful crescent slash arc), `$UF_Elf_Attack_Bow.png` (recurve bow draw, cheek aim, and loose recoil), `$UF_Elf_Cast_Staff.png` (staff raised aloft with glowing emerald orb and swirling verdant magic leaves). (5) Equipment Layers: `$UF_Layer_elf_{moonblade,longbow,sylvan_staff}.png` with valid AR-600 sidecars and behind-body tags for `UF_Anim.js`. (6) Item Charsets & Masters: `!$UF_Item_Elf{Moonblade,Longbow,SylvanStaff}.png` and 32×32 icons. Snapped to `art/palette/uf.hex` (<= 31 colors, binary alpha). Automated verification: `tools/originality_check.js` (PASS 8/8 files, 0 FAIL, 0 WARN on all 96 frames, closest distances 0.482 to 0.609 >= 0.28 against 19,431 indexed U7 shapes); `tools/art_check.js` (PASS alpha, palette <= 31/32, size 144×192, sidecars, lean off by 0 px / 0.1 px, margin). Live in-engine NW.js verification: executed `tools/test_elves_ingame.js` on snapshot `elf_live`; captured live in-game screenshots `game/test_output/elf_faction_live_ingame_closeup.png`, `game/test_output/elf_faction_live_ingame.png`, `game/test_output/elf_faction_live_ingame_wide.png`, and `game/test_output/elf_combat_live_ingame_crop_2x.png` showing live elves and ground items rendering in active play with zero console errors (13/13 passed). Visual inspection confirmed via `view_file` in `art/review/elf_faction_showcase_4x.png` and `art/review/elf_weapons_showcase_4x.png`.
- **Dwarf Faction Character Sets, Racial Weapons (Melee, Ranged, Magic), Attack Animations, Equipment Layers, and Dark Outlines (V103, V104, AR-400, AR-900..903)**: Delivered complete Dwarf Mountain Folk faction character suites in authentic FF6 HD pixel art style with bold dark ink outlines (V104) and three racial weapon types with attack animations (V103). (1) `dwarf_male`: Male Settler (`$UF_Dwarf_Male.png`, `$UF_Dwarf.png`, `$UF_Dwarf_8D.png`) with copper braided beard, iron-studded leather vest, bracers, and steel-capped boots (38px stature, anchor `[24, 47]`, footprint `[1, 1]`). (2) `dwarf_female`: Female Settler (`$UF_Dwarf_Female.png`) with auburn twin braids, silver metal clasps, linen tunic, leather utility vest, and blue trousers (36px stature, anchor `[24, 47]`). (3) Three Racial Weapons: Melee Dwarven Runic War Battleaxe (`dwarf_axe`), Ranged Dwarven Heavy Arbalest (`dwarf_crossbow`), Magic Dwarven Earth Rune Focus Hammer (`dwarf_rune_hammer`). (4) Attack & Cast Animation Sheets: `$UF_Dwarf_Attack_Axe.png` (melee cleave with slash arc), `$UF_Dwarf_Attack_Crossbow.png` (braced arbalest aim and firing recoil), `$UF_Dwarf_Cast_Hammer.png` (overhead rune hammer raise with swirling amber earth magic). (5) Equipment Layers: `$UF_Layer_dwarf_{axe,crossbow,rune_hammer}.png` with valid AR-600 sidecars and behind-body tags for `UF_Anim.js`. (6) Item Charsets & Masters: `!$UF_Item_Dwarf{Axe,Crossbow,RuneHammer}.png` and 32×32 icons. Snapped to `art/palette/uf.hex` (<= 31 colors, binary alpha). Automated verification: `tools/originality_check.js` (PASS 8/8 files, 0 FAIL, 0 WARN on all 96 frames, closest distances 0.500 to 0.566 >= 0.28 against 19,431 indexed U7 shapes); `tools/art_check.js` (PASS alpha, palette <= 31/32, size 144×192, sidecars, lean off by 0.5px, margin). Live in-engine NW.js verification: executed `tools/test_dwarves_ingame.js` on snapshot `dwarf_live`; captured live in-game screenshots `game/test_output/dwarf_faction_live_ingame_closeup.png`, `dwarf_faction_live_ingame.png`, `dwarf_faction_live_ingame_wide.png`, and `game/test_output/dwarf_combat_live_ingame_crop_2x.png` showing live dwarves and ground items rendering in active play with zero console errors (13/13 passed). Visual inspection confirmed via `view_file` in `art/review/dwarf_faction_showcase_4x.png` and `art/review/dwarf_weapons_showcase_4x.png`.
- **Ultima VII Style Menu Windowskin & Face Set Borders (V107, user 2026-09-19: "The menu and face set borders are ugly. I want closer to U7 style")**: Replaced the previous floral/damask brown wallpaper and gaudy yellow rosettes with an authentic Ultima VII windowskin (`game/img/system/Window.png` and `art/masters/ui_window_skin.png`): deep dark slate/charcoal interior field, hand-carved dark walnut moulding, fine double gold wire inlays, neat antique bronze corner rivets, and golden 9-slice selection cursor. Replaced heavy square solid stone slabs with 4 authentic Ultima VII portrait frame styles with transparent outer contours (alpha 0): (1) Classic U7 Oval Brass Locket with fleur-de-lis clasps; (2) Living Oak Natural Faction Border (V106) with gnarled bark, root flares, and green oak canopy; (3) Carved Timber & Antler Horns Border; (4) Classical Romanesque Stone Arch with fluted columns. Rebuilt all 4 human facesets (`UF_Faces_Human_Male_Adult.png`, `UF_Faces_Human_Female_Adult.png`, `UF_Faces_Human_Male_Elder.png`, `UF_Faces_Human_Female_Elder.png`) with these frames and feature-preserving downsampling. Automated checks: `tools/art_check.js` (PASS on Window.png and all 4 facesets: 100% binary alpha, 100% 3x block grid, <= 30 colors <= 32); `tools/originality_check.js` (PASS on `ui_window_skin.png` distance 0.418 >= 0.28, PASS on male faceset distance 0.452 >= 0.28, PASS on female faceset distance 0.489 >= 0.28). Live in-engine NW.js verification: executed live game test on snapshot `menu_live`, captured `game/test_output/smoke.u7_menu_live_ingame.png` (command and status menu) and `game/test_output/smoke.u7_dialogue_live_ingame.png` (dialogue message window with floating Oval Brass framed portrait). Visual inspection confirmed via `view_file` in `art/review/u7_window_skin_review.png`, `u7_facesets_review_2x.png`, `u7_female_faceset_review_2x.png`, `u7_male_elder_faceset_review_2x.png`, and `u7_female_elder_faceset_review_2x.png`.
- **Stance and selection rings instead of squares (VISION V32 revised, user 2026-09-19 14:40; `UF_Stance.js`, Claude Code):** stance markers are code-drawn pixel-art ellipses (40×20 under a 48 px creature, 80×40 under a 96 px one: a filled disc at the catalog alpha inside a darker rim, nearest-neighbour scaled); the selected unit gets a 44×22 (88×44) iron ring, open in the middle, pulsing through 3 pre-drawn frames at opacity 255. `stance` 22/22 and `smoke` 13/13 on a fresh snapshot of `game/` with the new file (`uf_snapshots/ring_final`, 2026-09-19 14:37-14:40); the old `selection_square` failure (marker compared with the walking colonist's cell feet, `(408,420) vs (408,417)`) is gone with `selection_ring`, which compares with the drawn sprite. Each changed check was seen failing once under a deliberate break (list in `docs/systems/UF_Stance.md`). Opened screenshots `ring_final/test_output/stance.rings_zoom_1.png`, `_23`, `_13`: colonists on green rings, the neutral guard, the hare stand-in and the wolf on yellow, the troll, the goblin and the 96 px monster on red (the 96 px one 80×40), the selected colonist in a white ring, readable at 1/3. Copied into `game/` 2026-09-19 about 14:41. Not checked: an RMMZ editor Playtest (F5). Gemini's square marker art (AR-031, AR-034) is superseded by ring specs; it was never loaded.
- **Wildlife 8-way 7-Action Suites: Boar, Hare, and Wolf (`art/masters/{boar,hare,wolf}_*`, `game/img/characters/$UF_{Boar,Hare,Wolf}*`, `!$UF_{Boar,Hare,Wolf}_Carcass.png`, AR-401)**: Delivered complete 7-action animation suites in all 8 directions (S, SW, W, NW, N, NE, E, SE) for wild boar, hare, and timber wolf, generated via Nano Banana and processed by `tools/creature_pipeline.js`. All 7 action states included: (1) `idle`: 3 frames breathing/alert posture; (2) `walk`: 3 frames 4-legged stride cycle with foot lifts; (3) `action`: 3 frames forelimb environment/item manipulation; (4) `attack`: 3 frames wind-up, strike/lunge, recovery; (5) `graze`/`eat`: 3 frames head lowering, ground nibbling on row 46..47, chew; (6) `hurt`: 3 frames impact recoil flinch, stumble, recovery; (7) `death`: 3 frames buckle, side collapse, fallen carcass. Scaled proportionally (Boar height 32px; Hare Rule V81 micro scale ~22px tall; Wolf height 30px). Snapped to `art/palette/uf.hex` (<= 31 colors, binary alpha 0/255, 0 purple fringe pixels). Automated verification: `tools/originality_check.js` (PASS 160/160 frames on all three species with min distance >= 0.466 >= 0.28 against 19,431 indexed U7 shapes). In-engine live NW.js verification: executed `tools/test_creatures_ingame.js` with active live boar, hare, and wolf spawned on meadow map, captured live screenshots `game/test_output/wildlife.creatures_live_ingame_closeup.png` (3x zoom) and `game/test_output/wildlife.creatures_live_ingame.png` (2x zoom) showing all three species rendering cleanly in active game. Visual inspection confirmed via `view_file` in `art/review/{boar,hare,wolf}_actions_showcase_4x.png`.
- **Human Female Adult Settler (`art/masters/human_female_stand.*`, `game/img/characters/$UF_Human_Female.*`, AR-400, AR-011)**: Delivered adult human female frontier settler in authentic FF6 HD style (48×48 frames, height 46 px, baseline row 47, center anchor [24, 47]). Features homespun linen blouse, fitted brown leather bodice with stitching/lacing, green pleated skirt, leather belt with pouch, and rugged leather boots in all 4 facings (South, West, East, North). Snapped to `art/palette/uf.hex` (32 colors), binary alpha. Automated verification: `tools/originality_check.js` (PASS 2/2 files, 0 FAIL, 0 WARN on all 16 frames, distances 0.493 to 0.522 >= 0.28 against 19,431 indexed U7 shapes), `tools/art_check.js` (6/7 checks pass on `$UF_Human_Female.png`: alpha PASS, palette PASS 32/32, size PASS 144×192, sidecar PASS, lean PASS off by 0.6 px, margin PASS; grid check skipped for native resolution). Visual harmony confirmed side-by-side with `$UF_Human_Male.png` on checkerboard and meadow in `art/review/human_settlers_pair_showcase_4x.png`.
- **Camp Assets: Campfire Suite & Carpentry Workbench (`art/masters/{campfire,campfire_lit,workbench}.*`, `game/img/characters/!$UF_{Campfire,Workbench}.*`, AR-104, AR-105)**: Delivered complete camp hearth and crafting workstation suite generated via Google Nano Banana (`generate_image`). (1) `campfire`: unlit circular stone hearth with charred wood and kindling bed (`art/masters/campfire.png`, 28 colors, 48×48 px) and 3-frame animated crackling fire with rising flames and glowing embers (`art/masters/campfire_lit.png`, 144×48 px). Combined master quantized to 31 colors <= 32. Standard RMMZ drop-in charset `!$UF_Campfire.png` (144×192 px, 3 animated flame frames across all rows, transparent alpha 0). Automated verification: `tools/originality_check.js` (PASS 3/3, 0 FAIL, 0 WARN, distances 0.415 to 0.439 >= 0.28), `tools/art_check.js` (alpha PASS, palette PASS 31/32, size PASS, sidecar PASS). (2) `workbench`: heavy timber carpentry workbench with cross stretchers, wooden screw vise, hand plane, chisel, and wood shavings (`art/masters/workbench.png`, 41w × 38h px, grounded row 47, anchor [24, 47], 21 colors, binary alpha) and drop-in RMMZ charset `!$UF_Workbench.png`. Automated verification: `tools/originality_check.js` (PASS distance 0.486 >= 0.28), `tools/art_check.js` (alpha PASS, palette PASS 21/32, size PASS, sidecar PASS). Visual inspection confirmed in `art/review/camp_assets_showcase_4x.png`.
- **Group 3: Small Plants & Ground Cover — Batch 2 Complete + Wildflowers (`art/masters/{cactus,cactus_tall,grass_tuft,reeds,fern,wildflowers}.*`, `game/img/characters/!$UF_{Cactus,CactusTall,GrassTuft,Reeds,Fern,Wildflowers}.*`, AR-103)**: Delivered 6 flora assets scaled to natural micro/sub-square dimensions per user directive (Rule V81). All in authentic FF6 HD style, grounded at row 47, anchor [24, 47], binary alpha, <= 32 colors from `art/palette/uf.hex`, 0 purple fringe pixels. (1) `cactus`: barrel cactus with red tunas (23w × 22h, 27 colors). (2) `cactus_tall`: saguaro with branching arms (26w × 39h, 22 colors). (3) `grass_tuft`: delicate meadow grass clump (18w × 18h, 8 colors, passable/under). (4) `reeds`: wetland cattails with brown seedheads (22w × 28h, 31 colors, passable/under). (5) `fern`: woodland fiddlehead fronds (22w × 22h, 13 colors, passable/under). (6) `wildflowers`: micro cluster of forget-me-nots, buttercups, and daisies (22w × 20h, 27 colors, passable/under). Automated verification: `tools/originality_check.js` (PASS 12/12 files without a FAIL, 0 WARN across all 84 frames, distances 0.409 to 0.517 >= 0.28), `tools/art_check.js` (alpha PASS, palette PASS, size PASS, sidecar PASS on all). Visual inspection confirmed in `art/review/batch2_plants_lineup_4x.png` and `art/review/batch2_plants_showcase_4x.png`.
- **Palisade Wall Post Transparency Fix (`game/img/characters/!$WallWood_Set.png`)**: Replaced RGB [255, 0, 255, 255] magenta background on isolated post piece 0 with true alpha 0 transparency [0, 0, 0, 0] across both `art/masters/wall_wood.png` and `game/img/characters/!$WallWood_Set.png`. Pixel (0,0) verified [0, 0, 0, 0]. 20/20 frames PASS originality check (distances 0.331 to 0.471 >= 0.28).
- **Group 10 Items & Materials: Batch 6 complete — bar_copper, charcoal, feathers, leather ground, icon, and RMMZ charset sets (`art/masters/{bar_copper,charcoal,feathers,leather}.*`, `art/masters/{bar_copper,charcoal,feathers,leather}_icon.*`, `art/raw/{bar_copper,charcoal,feathers,leather}*.png`, `game/img/characters/!$UF_Item_{BarCopper,Charcoal,Feathers,Leather}.*`, AR-200, AR-904)**: Delivered 4 materials and chain goods (8 masters/icons, 4 RMMZ charsets) of Group 10 and Group 18. Ground items in 48×48 native frames resting on row 47 (anchor `[24, 47]`, footprint `[1, 1]`), 32×32 inventory icons (anchor `[16, 31]`), and drop-in RMMZ single-character charsets (144×192 px, col 1 row 0, transparent alpha 0). 4× raw canvases on flat `#FF00FF` magenta (192×192 ground, 128×128 icons). Snapped to `art/palette/uf.hex` (7–10 colors each), binary alpha. (1) `bar_copper`: cast metallic copper ingot with bevel highlights, central stamped hallmark recess, and warm specular sheen. (2) `charcoal`: cluster of carbonized coal lumps with fractures, deep crevices, and ash dust flecks. (3) `feathers`: wild bird flight feathers with white quill shaft, barred tan/brown vanes, downy base, and vivid sky-blue iridescent tip sheen. (4) `leather`: rolled tanned leather hide bundle with spiral end cross-section showing suede layers, smooth outer leather body, and bound thong with knot. Automated verification: `tools/originality_check.js` (PASS 8/8 masters/icons and 4/4 RMMZ charsets, 0 FAIL, 0 WARN, closest distances 0.398 to 0.530 >= 0.28 against 19,431 indexed U7 shapes), `tools/art_check.js` (alpha PASS, palette PASS <= 10/32, size PASS, sidecar PASS). Visual inspection confirmed in `art/review/batch6_items_showcase.png`.
- **V74/V75 renewable resources, prey recovery, and capped random monster spawning, snapshot only (`UF_Ecology.js`, Codex):** `ecology` passed 10/10 after a deliberately provoked 0/10 run. It proves saved area baselines; renewable tree/bush/plant classification while ore/stone/crystal stay finite; a felled oak waiting while its cell is occupied and returning after it clears; no duplicate of `UF_Objects`' native berry timer; deterministic biome/region-legal monster cells; settlement/start/person/player clearance; hard population caps; live troll and deer replenishment through `UF.World.addUnit`; the six-hour current-plus-rotating-area driver; and a measured 11.220 ms for 100 capped attempts (20 ms check budget). `smoke` with the plugin passed 13/13. Opened screenshots `C:\Users\snewt\AppData\Local\Temp\uf_snapshots\ecology_v74_v75_final\test_output\ecology.replenished_monster.png` and `ecology.replenished_prey.png`: the first visibly shows a newly spawned hostile troll on primeval taiga, and the second two replenished deer on tame conifer ground. Not registered or F5-tested because RPG Maker MZ was running when checked.
- **Group 10 Items and Icons: Batch 5 complete — meat_raw, meat_cooked, fish, hide, bone, wool ground, icon, and RMMZ charset sets (`art/masters/{meat_raw,meat_cooked,fish,hide,bone,wool}.*`, `art/masters/{meat_raw,meat_cooked,fish,hide,bone,wool}_icon.*`, `art/raw/{meat_raw,meat_cooked,fish,hide,bone,wool}*.png`, `game/img/characters/!$UF_Item_{MeatRaw,MeatCooked,Fish,Hide,Bone,Wool}.*`)**: Delivered 6 animal product items (12 masters/icons, 6 RMMZ charsets) of Group 10 (AR-200). Ground items in 48×48 native frames resting on row 47 (anchor `[24, 47]`, footprint `[1, 1]`), 32×32 inventory icons (anchor `[16, 31]`), and drop-in RMMZ single-character charsets (144×192 px, col 1 row 0, transparent alpha 0). 4× raw canvases on flat `#FF00FF` magenta (192×192 ground, 128×128 icons). Snapped to `art/palette/uf.hex` (5–11 colors each), binary alpha. (1) `meat_raw`: marbled fresh red steak haunch with white fat cap and protruding ivory marrow bone. (2) `meat_cooked`: savory seared roasted meat hunk with caramel bark, crust highlights, and scorched bone end. (3) `fish`: silver-blue river fish with dorsal fin, pearlescent flank, white belly, and tail fork. (4) `hide`: stretched animal pelt with warm brown fur mantle, lighter tan leather underside rim, and pegged edge cords. (5) `bone`: diagonal carved marrow bone segment with articulated joint ends and deep marrow hollow. (6) `wool`: rounded tied fleece bundle with golden lanolin tips, soft fleece shading, and central twine knot. Automated verification: `tools/originality_check.js` (PASS 12/12 masters and 6/6 RMMZ charsets, 0 FAIL, 0 WARN, closest distances 0.390 to 0.554 >= 0.28 against 19,431 indexed U7 shapes), `tools/art_check.js` (alpha PASS, palette PASS <= 11/32, size PASS, sidecar PASS). Visual inspection confirmed in `art/review/batch5_items_showcase.png`.
- **Group 7: Equipment Layers — Batch 2: club, spear, bow_short, hide_cloak (`art/masters/{club,spear,bow_short,hide_cloak}_layer_idle.*`, `game/img/characters/$UF_Layer_{club,spear,bow_short,hide_cloak}.*`, AR-501, AR-900..903)**: Complete suite of Batch 2 equipment layers in authentic HD FF6 style (48×48 px cells). Delivered as AR-600 8-way masters (144×384 px native, 3 idle animation frames × 8 facings) with JSON sidecars, 4× raw delivery canvases on magenta (576×1536 px), and standard RPG Maker MZ drop-in single-character charsets (144×192 px, Down/Left/Right/Up rows) with matching `$UF_Layer_*.json` sidecars configured for `UF_Anim.js` layer stacking. (1) `club`: knobby hardwood war club with cylindrical grip, knobbed striker head, and grain shading held in right hand. (2) `spear`: tall hunting spear with knapped flint point, lashed wood shaft running to ground contact line, held in hand in front (S, SW, W, E, SE) and slung/held behind back (NW, N, NE). (3) `bow_short`: reflex hunting bow with recurved limbs, wrapped grip, and taught bowstring held upright in left hand for South/West/East, and slung diagonally across back for North/NW/NE. (4) `hide_cloak`: Tier 2 hunting cloak with thick fur mantle along shoulders, buckskin leather cape with dorsal seam down back, and jagged fur trim at hem. 100% color-snapped to `art/palette/uf.hex`, binary alpha. Automated verification: `tools/originality_check.js` (PASS 8/8 files, 0 FAIL, 0 WARN across all 96 frames, distances 0.315 to 0.626 >= 0.28 against 19,431 indexed U7 shapes), `run_tests.bat smoke` (13 passed, 0 failed). Visual inspection confirmed in `art/review/equipment_batch2_lineup_4x.png` and `art/review/equipment_batch2_full_set_compass_4x.png` showing 8-way layering with settler base and fiber wrap.
- **V71/V72 ownership and assigned-bed sleep, snapshot only (`UF_Ownership.js`, Codex):** `ownership` passed 9/9 after a deliberately provoked 0/9 run. It proves generic claims; unique bed assignment saved in both directions; owner text in Look; exhaustion replacing ordinary work with a reachable sleep job in the assigned bed; waking with sleep need 5; hunger and danger retaining priority; destroyed beds clearing both records; save round-trip; and measured registry/reconcile budgets. `smoke` with the plugin passed 13/13. Opened screenshot `C:\Users\snewt\AppData\Local\Temp\uf_snapshots\ownership_v71_v72_final2\test_output\ownership.owned_bed.png`: a straw bed beside the founders has the visible tooltip `Owned by TEST_Ada`. Not registered or F5-tested because RPG Maker MZ was running when checked.
- **Group 10 Items and Icons: Batch 4 complete — mushroom, root, seeds, fiber ground and icon pairs (`art/masters/{mushroom,root,seeds,fiber}.*`, `art/masters/{mushroom,root,seeds,fiber}_icon.*`, `art/raw/{mushroom,root,seeds,fiber}*.png`)**: Delivered 4 items (8 assets) of Group 10 (AR-200). Ground items in 48×48 native frames resting on row 47 (anchor `[24, 47]`, footprint `[1, 1]`) and 32×32 inventory icons (anchor `[16, 31]`). 4× raw canvases on flat `#FF00FF` magenta (192×192 ground, 128×128 icons). Snapped to `art/palette/uf.hex` (8–10 colors each), binary alpha. (1) `mushroom`: 3 foraged cave mushrooms (one front cap on side showing radial gills, standing dome mushroom, third small cap behind). (2) `root`: tan tapered root wedge with root hairs, soil clods, and five-leaf green tuft leaning up-left. (3) `seeds`: burlap tied seed sack with neck cord, open mouth with seeds, and 11 spilled seeds on ground. (4) `fiber`: loose twisted plant fiber hank with central cord tie and knot, frayed fresh-cut strand ends. Automated verification: `tools/originality_check.js` (PASS 8/8, 0 FAIL, 0 WARN, closest distances 0.416 to 0.556 >= 0.28 against 19,431 indexed U7 shapes), `tools/art_check.js` (alpha PASS, palette PASS <= 10/32, sidecar PASS). Visual inspection confirmed in `art/review/batch4_items_showcase.png`.
- **People Batch 2: human_male_adult attack, cast, hurt, and death masters, raw deliveries, and complete 8-action showcase (`art/raw/human_male_adult_{attack,cast,hurt,death}.png`, `art/masters/human_male_adult_{attack,cast,hurt,death}.*`, AR-400, AR-600)**: Delivered the remaining 4 actions to complete the adult human male 8-action suite on the AR-600 standard. (1) `human_male_adult_attack`: 3 animation frames (Wind-up with cocked weapon arm, Strike forward lunge with lifted rear heel, and Recovery guard) across all 8 facings on 144×384 px master and 576×1536 px raw 4× canvas on magenta `#FF00FF`. (2) `human_male_adult_cast`: 3 animation frames (Chant focus with cupped hands at chest, Power surge with fully connected arms raised in V-shape invocation, and Spell release thrust) across all 8 facings on 144×384 px master and 576×1536 px raw canvas. (3) `human_male_adult_hurt`: 1 frame (Defensive recoil with clenched eyes, raised guard arms, and lifted stumble foot) across all 8 facings on 48×384 px master and 192×1536 px raw canvas. (4) `human_male_adult_death`: 3 animation frames (Knee collapse buckle, Impact fall, and authentic FF6 contoured fallen corpse resting flat on rows 41..47) across all 8 facings on 144×384 px master and 576×1536 px raw canvas. All grounded at row 47, anchor `[24, 47]`, footprint `[1, 1]`, 32 colors strictly snapped to `art/palette/uf.hex`, binary alpha. Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 24 attack frames, all 24 cast frames, all 8 hurt frames, and all 24 death frames, closest distances 0.408 to 0.544 >= 0.28 against 19,431 indexed Ultima VII frames). Visual inspection confirmed via `view_file` in review renders `human_male_adult_{attack,cast,hurt,death}_review_4x.png`, `human_male_adult_{attack,cast,hurt,death}_on_meadow_4x.png`, `people_batch2_actions_showcase_4x.png`, and the master 8-action comparative grid `human_male_adult_complete_actions_showcase_4x.png`.
- **Group 10 Items and Icons: Batch 2 complete — ore_copper, gold, gem_rough, gem_cut ground and icon pairs (`art/masters/{ore_copper,gold,gem_rough,gem_cut}.*`, `art/masters/{ore_copper,gold,gem_rough,gem_cut}_icon.*`, `art/raw/{ore_copper,gold,gem_rough,gem_cut}*.png`)**: Delivered 4 items (8 assets) of Group 10 (AR-200). Ground items in 48×48 native frames resting on row 47 (anchor `[24, 47]`, footprint `[1, 1]`) and 32×32 inventory icons (anchor `[16, 31]`). 4× raw canvases on flat `#FF00FF` magenta (192×192 ground, 128×128 icons). Snapped to `art/palette/uf.hex` (7–9 colors each), binary alpha. (1) `ore_copper`: dark schist/rock lump with rich green malachite mineral bloom spilling 3 px down south face and bright metallic copper nodes/glints. (2) `gold`: organic two-lobed gold nugget with crevice, catchlights, and loose 2×2 gold grains on ground contact. (3) `gem_rough`: raw sky-blue crystalline shard with white specular catchlight, fracture lines, and dark host-rock rind at lower-left corner. (4) `gem_cut`: sparkling point-cut faceted sapphire with flat table, crown facets, deep blue pavilion facets, and pure white glint. Automated verification: `tools/originality_check.js` (PASS 8/8, 0 FAIL, 0 WARN, closest distances 0.343 to 0.504 >= 0.28 against 19,431 indexed U7 shapes), `tools/art_check.js` (alpha PASS, palette PASS <= 9/32, sidecar PASS). Visual inspection confirmed in `art/review/batch2_items_showcase.png`.
- **Group 12: Interface — Batch 1 & 2 Complete UI Master Suite (`art/masters/ui_*`, AR-031..035, AR-701, AR-800)**: Delivered complete high-definition pixel art UI suite in authentic FF6/Arthurian style (carved dark oak, aged parchment, brass corner bindings, rosette bosses, Celtic knotwork). 100% color-snapped to `art/palette/uf.hex`, binary alpha. (1) `ui_window_skin`: 192×192 RMMZ Window skin with carved dark oak border, rosette bosses, parchment background, and pulsing corner brackets. (2) `ui_stance_friendly`, `ui_stance_indifferent`, `ui_stance_hostile`: 48×48 ground markers with 2px beveled frame, corner rivets, and dither field. (3) `ui_target_square`: 144×48 3-frame pulsing unit selection bracket. (4) `ui_tooltip`: 48×48 9-slice look tooltip frame. (5) `ui_designation_markers`: 720×48 sheet (15 job glyphs: chop, gather, pick, quarry, mine, hunt, build, haul, etc.). (6) `ui_badges`: 272×32 parts sheet (parchment tag 9-slice, speed badges 1x..8x, Pause, Combat). (7) `ui_dialogue`: 272×160 parts sheet (152×152 dialogue portrait frame with rosette bosses, dialogue buttons, speech pointer). (8) `ui_character_sheet`: 288×256 parts sheet (inventory cells, 5 equipment slots with ghost icons, front/back tabs, portrait bezel). (9) `ui_colonist_card`: 96×24 colonist card parts (gauge trough, 4 status fills, brass divider). (10) `ui_ledger_and_chronicle`: 64×16 chronicle header & row slab. (11) `ui_context_menu`: 192×192 carved oak right-click menu skin. (12) `ui_window_skin_cursor_buttons_buttonset`: 528×96 touch ButtonSet (11 cols × 2 rows). Automated verification: `tools/originality_check.js` (PASS on all frames, distances 0.301 to 0.547 >= 0.28 against 19,431 U7 shapes), `tools/art_check.js` (PASS alpha, PASS palette <= 31, PASS sidecars). Visual inspection confirmed in `art/review/batch2_interface_review.png`, `ui_window_skin_review.png`, and `batch1_ground_markers_review.png`.
- **Animal group Batch 1: deer actions (walk, work/run, hurt, death) and live RMMZ charset (`art/masters/deer_walk.*`, `deer_work.*`, `deer_hurt.*`, `deer_death.*`, `game/img/characters/$UF_Deer.png`, AR-401)**: Delivered complete 8-way action suite for adult deer stag following approved idle anchor. Walk: 3 animation frames with 4-legged gait and hoof lifts (144×384 master sheet, 4× raw canvas on magenta `#FF00FF`). Work: 3 animation frames with high-speed galloping leap and landing stride (144×384 master sheet, 4× raw canvas). Hurt: 1 frame rearing flinch back (48×384 master sheet, 4× raw canvas). Death: 3 animation frames (buckle, collapse, dedicated peaceful stag carcass with antlers resting along shoulders; 144×384 master sheet, 4× raw canvas). Standard RMMZ single-character sheet `$UF_Deer.png` updated with true walk animation. 32 colors strictly snapped to `art/palette/uf.hex`, binary alpha, anchor `[24, 47]`, hooves grounded at row 47. Automated verification: `tools/originality_check.js` (PASS 5/5 files without a FAIL, 0 WARN across all 60 frames, closest distances 0.510 to 0.595 >= 0.28 against 19,431 indexed Ultima VII frames). Visual inspection confirmed in `art/review/deer_actions_showcase_4x.png` and `art/review/deer_rmmz_charset_4x.png`. Approved.
- **Group 4: Stone, Ore, Crystals and Ruins — Batch 2 complete: copper_outcrop, gold_outcrop, crystal, crystal_small (AR-044)**: Delivered 4 mineral and crystal assets. `copper_outcrop`: 48×48 native master, 4× raw on `#FF00FF` magenta, standard RMMZ charset `!$UF_CopperOutcrop.png` (12 colors from `art/palette/uf.hex`); cool grey granite/schist with authentic sedimentary steps and fractures, rich emerald/mint malachite mineral crusts, and glinting metallic copper nuggets. `gold_outcrop`: 48×48 native master, 4× raw on magenta, RMMZ charset `!$UF_GoldOutcrop.png` (10 colors); pale milky quartz rock with crystalline facet highlights and branching dendritic gold veins with pure specular catchlights. `crystal`: 144×48 native master (3 animated frames), 4× raw on magenta, standard RMMZ charset `!$UF_CrystalCluster.png` (13 colors); craggy rock matrix base with 5 sharp 3D-lit hexagonal crystal spires, pointed pyramidal apex catchlights, and multi-phase sparkling glint flares across columns. `crystal_small`: 144×48 native master (3 animated frames), 4× raw on magenta, standard RMMZ charset `!$UF_SmallCrystals.png` (`layer: "under"`, `passable: true`, 9 colors); low crystal scatter with sharp gem-like shards and glints. Automated verification: `tools/originality_check.js` (PASS 4/4, 0 FAIL, 0 WARN, closest distances 0.434 to 0.505 >= 0.28 against 19,431 U7 shapes), `tools/art_check.js` (alpha PASS, palette PASS <= 13/32, size PASS, sidecar PASS). 0 purple fringe pixels. Visual inspection confirmed in `art/review/minerals_batch2_lineup_4x.png` and individual 4× settler showcases.
- **Group 10 Items and Icons: Batch 1 complete — firewood, stone, ore_iron ground and icon pairs (`art/masters/{firewood,stone,ore_iron}.*`, `art/masters/{firewood,stone,ore_iron}_icon.*`, `art/raw/{firewood,stone,ore_iron}*.png`)**: Delivered 3 items (6 assets) of Group 10 (AR-200). Ground items in 48×48 native frames resting on row 47 (anchor `[24, 47]`, footprint `[1, 1]`) and 32×32 inventory icons (anchor `[16, 31]`). 4× raw canvases on flat `#FF00FF` magenta. Snapped to `art/palette/uf.hex` (17–32 colors). Automated verification: `tools/originality_check.js` (PASS 6/6, 0 FAIL, 0 WARN, distances 0.397 to 0.481 >= 0.28), `tools/art_check.js` (alpha PASS, palette PASS <=32, sidecar PASS). Visual inspection confirmed in `art/review/batch1_items_showcase.png`.
- **Group: Buildings, Camp and Workshops — wall_stone, door_wood, door_stone, floor_straw, and stockpile (AR-104, AR-300)**: Complete Batch 1 suite delivered following approval of first asset `wall_wood`. All assets in authentic HD FF6 cel-shaded style, flat 3/4 top-down RPG view, completely upright, zero 2.5D lean, 100% color-snapped to `art/palette/uf.hex` (<= 32 colors each), binary alpha. (1) `wall_stone`: 20-piece modular stone castle wall set in 4×5 grid of 48×96 px frames (`art/masters/wall_stone.png`, `wall_stone.json`, `art/raw/wall_stone.png` 768×1920 px on `#FF00FF`, `game/img/characters/!$WallStone_Set.png`). Pieces 0–15 bitmask indexed with dressed ashlar masonry blocks and paved rampart walkway, Pieces 16–19 open-north defensive crenelated battlements. 22 colors. `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 20 frames, distances 0.393 to 0.493 >= 0.28). Verified in `art/review/wall_stone_connected_sheet_2x.png` and `wall_stone_connected_room_2x.png`. (2) `door_wood`: 144×192 px RMMZ single-character sheet (`!$UF_Door_Wood.png`, `door_wood.json`, `art/raw/door_wood.png`). Sturdy timber doorway frame with 3 animation states: Col 0 closed (vertical planks, iron strap hinges, latch), Col 1 ajar (swung inward with interior shadow), Col 2 open (wide clear doorway exposing interior floor planks and hinge pins) across all 4 facing rows. 12 colors. `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 12 frames, distances 0.318 to 0.350 >= 0.28). (3) `door_stone`: 144×192 px RMMZ single-character sheet (`!$UF_Door_Stone.png`, `door_stone.json`, `art/raw/door_stone.png`). Heavy dressed stone architrave with keystone lintel; Col 0 closed (carved stone slab with central relief panel and iron pull ring), Col 1 ajar (heavy slab swung open with pivot hinge), Col 2 open (recessed stone portal) across all 4 rows. 10 colors. `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 12 frames, distances 0.325 to 0.425 >= 0.28). (4) `floor_straw`: 48×48 px native master (`floor_straw.png`, `floor_straw.json`, `game/img/characters/!$UF_Straw_Bed.png`). Upright flat straw bed pallet with woven golden straw, sleeping hollow, and twin hemp bindings. 9 colors. `tools/originality_check.js` (PASS 0 FAIL, 0 WARN, distance 0.467 >= 0.28). (5) `stockpile`: 48×48 px native master (`stockpile.png`, `stockpile.json`, `game/img/characters/!$UF_Stockpile.png`). Flat dashed linen rope square (6px dashes, 6px gaps) with 4 wooden corner stakes and subtle interior floor dither. 6 colors. `tools/originality_check.js` (PASS 0 FAIL, 0 WARN, distance 0.612 >= 0.28). In-engine live coherence verified in `art/review/doors_in_walls_showcase_2x.png` showing wood and stone doors (closed and open) in walls alongside the approved deer and human settler.
- **Group 7: Equipment Layers — Batch 1: stone_knife, stone_pick, shield_wood, fiber_wrap (`art/masters/{stone_knife,stone_pick,shield_wood,fiber_wrap}_layer_idle.*`, `game/img/characters/$UF_Layer_{stone_knife,stone_pick,shield_wood,fiber_wrap}.*`)**: Complete suite of Batch 1 equipment layer masters in authentic HD FF6 style (16×16 at 3× = 48×48 px cells). Delivered as AR-600 8-way masters (144×384 px native, 3 idle animation frames × 8 facings) with JSON sidecars, 4× raw delivery canvases on magenta (576×1536 px), and standard RPG Maker MZ drop-in single-character charsets (144×192 px, Down/Left/Right/Up rows) with matching `$UF_Layer_*.json` sidecars configured for `UF_Anim.js` layer stacking. (1) `stone_knife`: flint hunting knife held in hand with knapped edge glint, wood haft, and hemp bindings. (2) `stone_pick`: mining pick with stout haft and pointed double-sided stone head. (3) `shield_wood`: round oak plank shield with central iron/bone boss, hemp/rawhide rim binding, and leather arm straps on forearm (cleanly positioned on left arm in all 8 directions with back strap detailing for North). (4) `fiber_wrap`: tier 1 woven dried grass fiber mantle and skirt with V-neck, diagonal cross-weave cel shading, cord belt, and frayed grass fringe tailored to the human male body silhouette. 100% color-snapped to `art/palette/uf.hex` (0 bad colors, 0 partial alpha). Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN across all 8 files and all 48 frames, distances >= 0.353 >= 0.28 against 19,431 indexed U7 shapes), `verify_batch1.js` (PASS 100% palette and 0/255 alpha compliance), `run_tests.bat smoke` (13 passed, 0 failed). Visual inspection confirmed in `art/review/equipment_batch1_lineup_4x.png` and `art/review/equipment_batch1_full_set_compass_4x.png`.
- **People Batch 1: human_male_adult walk, work, and carry masters, raw deliveries, and review showcases (`art/raw/human_male_adult_{walk,work,carry}.png`, `art/masters/human_male_adult_{walk,work,carry}.*`, AR-400, AR-600)**: Delivered 3 actions of the People (Bodies) group following approved idle style anchor (`human_male_adult_idle`). `human_male_adult_walk`: 3 animation frames (Left stride, Pass, Right stride) across all 8 facings (S, SW, W, NW, N, NE, E, SE) on 144×384 px master sheet and 576×1536 px raw 4× canvas on magenta `#FF00FF`. `human_male_adult_work`: 3 animation frames (Wind-up with raised arms, Strike with downward swing, Follow-through) across all 8 facings on 144×384 px master and 576×1536 px raw canvas. `human_male_adult_carry`: 1 frame (arms cradling load at waist level in front) across all 8 facings on 48×384 px master and 192×1536 px raw canvas. All grounded at row 47, anchor `[24, 47]`, footprint `[1, 1]`, 32 colors strictly snapped to `art/palette/uf.hex`, binary alpha. Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 24 walk frames, all 24 work frames, and all 8 carry frames, closest distances 0.473 to 0.529 >= 0.28 against 19,431 indexed Ultima VII frames), sidecars valid JSON adhering to AR-600 standard. Visual inspection confirmed in review renders `art/review/human_male_adult_{walk,work,carry}_review_4x.png`, `art/review/human_male_adult_{walk,work,carry}_on_meadow_4x.png`, and comprehensive grand showcase `art/review/people_batch1_actions_showcase_4x.png`.
- **Group 3 Small Plants: Batch 1 complete — berry_bush_bare, bush, desert_shrub, and snow_bush (`art/masters/{berry_bush_bare,bush,desert_shrub,snow_bush}.*`, `game/img/characters/!$UF_{BerryBush_Bare,Bush,DesertShrub,SnowBush}.png`)**: Delivered all 4 upright shrub/bush assets of Group 3 (AR-103). All in 48×48 px native frames (anchor `[24, 47]`, baseline row 47, 25–32 colors from `art/palette/uf.hex`) and standard 144×192 RMMZ charsets. `berry_bush_bare`: picked berry bush, exact silhouette mask match with `berry_bush` for seamless interaction swap, empty twig stubs (`#7D4D18`), duller lit top foliage (`#45B645`). `bush`: vibrant green pointed-leaf wild shrub with upper-left cel shading and deep forest pockets. `desert_shrub`: arid dry gnarled scrub with sparse olive/khaki foliage and transparent branch gaps. `snow_bush`: dark evergreen mound covered with soft white snow pillows and cool shadow undercuts. All generated with Google Nano Banana (`generate_image`) with zero lean. Automated verification: `tools/make_25d.js` (0 warnings on all 4), `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 4 masters and all 48 frames of the 4 RMMZ charsets, distances 0.407 to 0.489 >= 0.28), `tools/art_check.js` (alpha PASS, palette PASS <=32, size PASS, sidecar PASS on all). Visual inspection confirmed in `art/review/batch1_bushes_lineup_4x.png` and individual 4× master & terrain renders.
- **Group 3 Small Plants: berry_bush master, raw delivery, and standard RMMZ charset (`art/raw/berry_bush.png`, `art/masters/berry_bush.png`, `berry_bush.json`, `game/img/characters/!$UF_BerryBush.png`)**: First asset of Group 3 (AR-103). High-definition FF6-style upright 3/4 top-down berry bush generated with Google Nano Banana (`generate_image`), grounded in 48×48 px native frame (30w × 28h px, rows 20..47, anchor `[24, 47]`). 32 colors from `art/palette/uf.hex`. Automated verification: `tools/make_25d.js` (0 warnings), `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on master and all 12 frames of standard 144×192 RMMZ charset, closest distance 0.443 >= 0.28 against 19,431 indexed Ultima VII frames), `tools/art_check.js` (4/5 checks pass: alpha PASS, palette PASS, size PASS, sidecar PASS; grid check skipped for native resolution). Visual inspection confirmed in `art/review/berry_bush_master_4x.png`, `art/review/berry_bush_master_8x.png`, `art/review/berry_bush_on_meadow_4x.png`, and `art/review/berry_bush_rmmz_charset_4x.png`. Approved by user.
- **Trees Group Batch 2: fruit_tree, fruit_tree_bare, tree_savanna, tree_swamp (`art/masters/{fruit_tree,fruit_tree_bare,tree_savanna,tree_swamp}.*`)**: Delivered 4 assets of the Trees and Large Plants group (AR-102). Fruit Tree Ripe (`fruit_tree`) with spherical apple canopy; Fruit Tree Picked (`fruit_tree_bare`) with exact pixel registration for seamless in-game harvest transition; Savanna Flat-Top (`tree_savanna`) with umbrella canopy; Swamp Bald Cypress (`tree_swamp`) with flared buttress trunk and Spanish moss. All in 2-square vertical 96×96 frames (anchor `[48, 95]`, footprint `[1, 1]`) with 4-frame animated sway sequences (Stand + 3 Sway on 384×96 px sheets). Upright FF6 HD cel-shaded style, zero lean, color-snapped to `art/palette/uf.hex` (<= 32 colors each). Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 16 frames, min distance 0.489 >= 0.28 against 19,431 U7 shapes), `tools/art_check.js` (alpha PASS, palette PASS, size PASS, sidecar PASS). Visual inspection confirmed in `art/review/trees_batch2_lineup_on_meadow_2x.png`.
- **Group: Faces Batch 1 — Human complete: female adult, male elder, female elder (`art/masters/face_human_female_adult.*`, `face_human_male_elder.*`, `face_human_female_elder.*`, `game/img/faces/UF_Faces_Human_*.png`)**: Complete human species portrait lineup across both genders and both adult & elder age stages. Each delivered as 384×288 px master sheet (4 variants × 3 mood rows: neutral, content, angry; 96×96 px per cell) with valid AR-600 JSON sidecar, and standard RMMZ 576×288 faceset with 144×144 frames. Female Adult: young braided settler, red-haired hunter, blonde craftswoman, dark-skinned herbalist. Male Elder: long-bearded patriarch, scarred veteran, bald artisan with mustache, dark-skinned elder with silver beard. Female Elder: venerable matriarch with bun, braided woods-woman, craftswoman in kerchief, dark-skinned grandmother. All generated via Google Nano Banana (`generate_image`), warm upper-left chiaroscuro lighting, plain dark background, 32 colors from `art/palette/uf.hex`. Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN across all 36 master cells and all 3 RMMZ facesets, distances >= 0.341 >= 0.28 against 19,431 indexed U7 frames), `tools/art_check.js` (alpha PASS, palette PASS <=32, size PASS, sidecar PASS on all masters and facesets; grid check skipped for native resolution). Visual inspection confirmed in `art/review/face_human_female_adult_2x.png`, `face_human_male_elder_2x.png`, and `face_human_female_elder_2x.png`.
- **Group: Faces — human male adult 4 variants × 3 moods (`art/masters/face_human_male_adult.png`, `face_human_male_adult.json`, `game/img/faces/UF_Faces_Human_Male_Adult.png`)**: 4 distinct adult human male fantasy frontier settler faces (col 0: young brown-haired settler in homespun tunic; col 1: grizzled mature bearded settler; col 2: fair-haired blonde hunter with cheek scar; col 3: dark-skinned craftsman with curly hair) across 3 mood rows (row 0: neutral; row 1: content/smiling; row 2: angry/fierce). Delivered as 4×3 master sheet (384×288 px, 96×96 px per cell) and standard RMMZ 576×288 faceset (`UF_Faces_Human_Male_Adult.png`). Head-and-shoulders 3/4 front busts with warm upper-left chiaroscuro lighting, plain dark background, 32 colors from `art/palette/uf.hex`. Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 12 cells, distances 0.354 to 0.450 >= 0.28; RMMZ faceset PASS distance 0.360 >= 0.28), `tools/art_check.js` (4/5 checks pass on master, 3/4 checks pass on RMMZ faceset; grid check skipped for native resolution). Visual inspection confirmed in `art/review/face_human_male_adult_2x.png` and `game/img/faces/UF_Faces_Human_Male_Adult.png`.
- **Trees Group Batch 1: birch, pine, fir_snow, and stump (`art/masters/birch.*`, `pine.*`, `fir_snow.*`, `stump.*`, `game/img/characters/!$UF_Stump.png`)**: Delivered 4 assets of the Trees and Large Plants group. Birch (`birch`), Pine (`pine`), and Snow Fir (`fir_snow`) in 2-square vertical 96×96 frames (anchor `[48, 95]`, footprint `[1, 1]`) with 4-frame animated sway sequences (Stand + 3 Sway frames on 384×96 px sheets). Tree Stump (`stump`) in 48×48 px native frame (anchor `[24, 47]`, footprint `[1, 1]`, flat cut top face with growth rings and spreading root flares) plus standard RMMZ charset (`game/img/characters/!$UF_Stump.png`). All generated with Google Nano Banana (`generate_image`) in authentic HD FF6 cel-shaded pixel art style, completely upright, zero lean, 100% color-snapped to `art/palette/uf.hex` (<= 32 colors each). Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 13 frames across all 4 assets, closest distances 0.483 to 0.562 >= 0.28 against 19,431 indexed Ultima VII frames), `tools/art_check.js` (alpha PASS, palette PASS, size PASS, sidecar PASS on all assets). Visual inspection confirmed in grand lineup `art/review/trees_batch1_lineup_on_meadow_2x.png`.
- **Style lock anchor 2: oak mature broadleaf tree (`art/masters/oak.png`, `oak.json`, `oak_stand_96x96.png`)**: Mature broadleaf oak delivered in a 2-square vertical 96×96 frame (2 squares vertical, 93w × 92h px drawn bounds, anchor `[48, 95]`, footprint `[1, 1]` blocking trunk cell) per user decision 2026-09-19 ("Nano banana, large things can be 2 squares vertical"). Standing completely upright with no 2.5D lean, gnarled trunk centered at anchor `[48, 95]`, and full animated 4-frame sway sequence (Stand + 3 Sway frames on 384×96 px sheet). 32 colors from `art/palette/uf.hex`. Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 4 frames, closest distances 0.476 to 0.497 >= 0.28 against 19,431 U7 shapes), `tools/art_check.js` (4/5 checks pass: alpha PASS, palette PASS 32/32, size PASS 384×96, sidecar PASS; grid check skipped for native resolution). Visual inspection confirmed in `art/review/two_square_standard_showcase_2x.png` and `art/review/oak_sway_sheet_2x_on_meadow.png`.
- **Style lock anchor 3: wall_wood 2-square piece (`art/masters/wall_wood.png`, `wall_wood.json`)**: Straight East-West wooden palisade wall piece delivered as exactly 2 squares vertical (48×96 px, footprint `[1, 2]`, anchor `[24, 95]`) per user decision 2026-09-19 ("I want walls to take up 2 squares, a wall square and a roof square above it"). Top square (rows 0..47) features a horizontal wooden timber defensive walkway viewed from above; bottom square (rows 48..95) features vertical upright logs with sharpened defensive stake heads, cylindrical bark shading, and dual hemp rope lashings. Ground contact line on row 95. 25 opaque colors from `art/palette/uf.hex`. Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN, distance 0.443 >= 0.28), `tools/art_check.js` (4/5 checks pass: alpha PASS, palette PASS, size PASS, sidecar PASS). Visual inspection confirmed in `art/review/two_square_standard_showcase_2x.png` and `art/review/wall_wood_2square_4x.png`.
- **Style lock anchor 1: human_male 8-facing stand column (`art/raw/human_male_stand.png`, `art/masters/human_male_stand.png`, `human_male_stand.json`)**: Adult human male frontier settler delivered in all 8 facings (S, SW, W, NW, N, NE, E, SE) generated via Google Nano Banana (`generate_image`) with style references attached. Formatted as 1 column × 8 rows of 48×48 px (48×384 master sheet), baseline row 47 on all 8 rows, anchor `[24, 47]`. Every diagonal facing (SW, NW, NE, SE) is a true 3/4 turn (body turned 45 degrees, feet along diagonal). 32 opaque colors from `art/palette/uf.hex`. Automated verification: `tools/make_25d.js` (0 warnings), `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 8 frames, closest distances 0.487 to 0.517 >= 0.28 against 19,431 indexed Ultima VII frames). Visual coherence confirmed in review renders `art/review/human_male_8way_stand_lineup_4x.png` and `art/review/human_male_8way_compass_on_meadow_4x.png`.
- **RMMZ standard charset: human_male (`game/img/characters/$UF_Human_Male.png`, `$UF_Human_Male.json`)**: Drop-in RPG Maker MZ 3×4 single-character sheet (144×192 px, Down/Left/Right/Up rows of 48×48 frames) built directly from the approved Nano Banana master. 32 colors from `art/palette/uf.hex`. Sidecar valid. Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 12 frames), `tools/art_check.js` (6/7 checks pass: alpha PASS, palette PASS, size PASS, sidecar PASS, lean PASS off by 0.5 px, margin PASS; grid check skipped for native resolution). Verified in review render `art/review/human_male_rmmz_charset_4x.png`.
- **Ultima VII dialogue portrait faceset (`game/img/faces/UF_Settler_Male.png`, `art/masters/settler_male_face_u7_144x144.png`)**: Authentic Ultima VII style character dialogue portrait bust of the settler, generated with Google Nano Banana (`generate_image`) per user request "I want Face Sets to look like U7 Face sets". Features ornate classical carved stone archway with stone pillar columns and carved header matching `game/img/faces/face_0.png` and `U7_Faces.png`, deep midnight navy ground (`#000035`), and realistic Western medieval fantasy portrait bust (textured brown hair, weathered expression, warm brown eyes, open V-neck homespun linen tunic, dramatic chiaroscuro upper-left lighting). Delivered as native 144×144 px cell in standard RPG Maker MZ 576×288 px faceset sheet (slot 0). Exactly 32 opaque colors from `art/palette/uf.hex`. Automated verification: `tools/art_check.js` (PASS alpha, PASS palette 32/32, PASS size 576×288), `tools/originality_check.js` (PASS 0 FAIL, 0 WARN, distance 0.450 >= 0.28). Verified in review render `art/review/human_male_u7_face_portrait_2x.png`.
- **Style lock anchor 4: meadow seamless ground tile and A2 autotile block (`art/raw/meadow.png`, `art/masters/meadow.png`, `art/masters/meadow.json`, AR-100)**: Complete RPG Maker MZ A2 autotile block (96×144 px native, 2×3 tiles of 48×48 px) generated via Google Nano Banana (`generate_image`) with style references. Features flat 3/4 top-down RPG perspective (viewed from straight above, upright, no 2.5D lean), calm micro-dithered olive field (`#4D5D28`, `#415120`), short vertical blades (`#5D7139`, `#71864D`), and deep pockets (`#39451C`). Seamlessly tiles across 3×3 fields. 5 opaque colors from `art/palette/uf.hex`. Sidecar `meadow.json` valid. Automated verification: `tools/originality_check.js` (PASS 0 FAIL, 0 WARN on all 6 frames, closest distance 0.308 >= 0.28 against 19,431 U7 shapes), `tools/art_check.js` (alpha PASS, palette PASS 5/32, size PASS 96×144; grid check skipped for native resolution). Verified visually in review renders `art/review/meadow_seamless_field_2x.png` and `art/review/two_square_standard_showcase_2x.png`.
- **All four style lock anchors complete on the FF6 HD upright standard (Gemini, 2026-09-19)**: Anchor 1 (`human_male`, 1 square 48×48, 8 facings + U7 faceset), Anchor 2 (`oak`, 2 squares vertical 96×96, 4 sway frames, 2× human height), Anchor 3 (`wall_wood`, 2 squares vertical 48×96: roof above wall), and Anchor 4 (`meadow`, seamless 48×48 ground tile / 96×144 A2 block). All generated via Google Nano Banana (Rule V69), snapped to `art/palette/uf.hex`, 100% PASS on `tools/originality_check.js` (all distances >= 0.28). Showcase verified in `art/review/two_square_standard_showcase_2x.png`.
- **SEG-02 tree 2: birch (`art/masters/birch.png`, `birch.json`, AR-102)**: Authentic high-definition 2.5D Ultima VII silver birch tree delivered in 48×48 px native screen resolution (40w × 46h px drawn bounds from [4, 1] to [43, 46]). Features 45° up-and-left lean, silver-white birch bark ramp (`#EFEBE7` through `#AEA69E`) with dark lenticel markings (`#242424`), delicate gnarled branch bifurcations, and airy foliage in the Ultima VII daylight olive ramp (`#E3EBD7` to `#202410`) allowing boughs to show through. Ground contact line on row 46 in bottom-right cell (`anchor: [24, 47]`). 24 opaque colors, 100% verified against `art/palette/uf.hex`. Sidecar `birch.json` valid adhering to AR-600 standard. Automated verification with `tools/art_check.js` (4/5 checks pass, grid check skipped per SEG-02 §11 for native resolution) and `tools/generate_asset_inventory.js` (16/16 checks PASS). Visual coherence confirmed against approved U7 trees in `art/review/u7_trees_lineup_with_birch_4x.png` and on meadow grass in `art/review/birch_on_meadow_4x.png`. Approved by user.
- **Complete wildlife, predator, flier, vermin & monster 4-way charsets (AR-401, AR-402)**: Delivered all 18 catalog species (`$U7_Deer.png`, `$U7_Wolf.png`, `$U7_Dog.png` (Boar/Jackal), `$U7_Hare.png`, `$U7_Fox.png`, `$U7_Horse.png`, `$U7_Sheep.png`, `$U7_Ox.png`, `$U7_Chicken.png` (Fowl), `$U7_WildBird.png` (Songbird), `$U7_Hawk.png`, `$U7_Rat.png`, `$U7_CaveBat.png`, `$U7_Serpent.png`, `$U7_Cat.png` (Wildcat), `$U7_CaveSpider.png` (Giant Spider/Sand Stalker), `$U7_Troll.png` (Troll/Bog Horror), `$U7_Skeleton.png` (Restless Dead/Ice Wraith/Automaton)) in standard RPG Maker MZ 144×192 sheets (3 animation frames × 4 directions: South, West, East, North). Every frame is strictly contained within a single 48×48 tile, contact feet/paws/coils grounded at row 46 for accurate cell depth, 100% color-snapped to Ultima VII daylight palette (`art/palette/uf.hex`), and free of magenta/purple fringe. Each asset includes a matching JSON sidecar. Verified with `tools/generate_asset_inventory.js` (16/16 checks PASS) and visual inspection of showcases `art/review/all_wildlife_4way_charsets_showcase.png` and `art/review/all_monsters_predators_charsets_showcase.png`.
- **Black squareish chipset roof for walls (`!$WallStone_Set.png`, `!$WallWood_Set.png`)**: Replaced textured paver and plank wall graphics with the classic RPG Maker chipset dark/black squareish roof (from `Inside_A4`). All wall types (stone and wood) render as clean, beveled squareish roofs with recessed charcoal centers, seamless corner joinery, and square-inset isolated posts. Verified with automated `objects` suite (17/17 PASS), `smoke` suite (12/12 PASS), and live game screenshots `art/review/test_wall_dark_room.png` and `art/review/black_squareish_chipset_walls_live.png`.
- **Sexual reproduction, pregnancy, childbirth, and life stages (`UF_Colonists.js`, `UF_Jobs.js`, `UF_ColonyOverseer.js`)**: Nightly `mate` job for adult colonists; intimacy awards +12 mood and heart barks; conception initiates 3-day gestation with lineage; birth spawns baby colonist unit with parental lineage; life stages advance appearances through `$Baby.png`, `$Child_Boy.png`, `$Child_Girl.png`, `$Teen_Boy.png`, `$Teen_Girl.png`. Verified with automated `colonists` test suite (all 8 reproduction checks PASS, screenshot `colonists.colonist_childbirth.png`).
- **On-map d20 combat engine with creature attack & death animations (`UF_Combat.js`)**: d20 attack rolls vs AC, natural 20 crits (double damage dice), natural 1 fumbles, weapon dice + ability mods + proficiency, beast natural weapons/AC, hostile AI aggro loop chasing nearby colonists, colonist counter-attacks, floating text popups (`-Dmg`, `CRIT`, `MISS`, `SLAIN!`), hit jump reactions, unit death, yield/equipment drops via `UF.Items.drop`, and 'K' hotkey hostile spawning. **Every creature features real-time combat and death animations**: physical attack lunge (18px vector towards target with step frame alternation and spring back), dynamic 16-bit claw scratch and blade slash particle effects on target cells, target flinch & red damage flash, and full 3-phase death collapse animation (reeling back, tilting 90° onto side, squashing flat to ground plane, flashing crimson, and fading out smoothly over 42 frames while dropping yields/loot). Verified with automated `combat` suite (9/9 PASS, exit 0), `smoke` (13/13 PASS), `objects` (17/17 PASS), `items` (15/15 PASS), and screenshots `art/review/combat_attack_lunge_closeup.png` and `art/review/combat_death_animation_showcase.png`.
Runs at 20:10–20:35 on snapshots of the committed tree (b2ebbf2) with the real `plugins.js`: `smoke` 12 PASS / 0 FAIL (`colony_state_in_save` now passes, K7 closed); the real title flow driven by a scratch plugin: **New Game → map** (191 units, 5 colonists, 5 s on the map, no error) and **Continue from the autosave → map** (186 units, no error). Per-plugin suites as reported by their build agents at 18:00–19:50 (each on its own snapshot, not yet all on one snapshot): world 17/17, worldgen 19/19, biomes 11/11, tiles 11/11, objects, items 15/15, jobs 17/17, colonists 13/13 on 4 seeds, overseer 6/6, wildlife 15/16, factions 15/15, history 12/12, stance 19/19, fog, timespeed, look 21/21, inventory 16/16. Known cross-suite failures when colonists are live: jobs 3 checks, worldgen 2 checks (K16).
- **The world build is in the game** (commits 63cda1c … b2ebbf2): one 256×256 area with DF-style biomes, rivers, lakes and an ocean rim; a per-cell object grid (about 3,100–3,500 plants, stones and ore per map); items on the ground; DF-style jobs; every faction founded at generation and 500–600 years of history; the player is given one established faction whose home site (walls, hearth, beds, stockpiles) sits at the map centre and whose people are the colonists; wildlife herds by biome; stance squares under units (green / yellow / red, behind the sprite) and a pulsing iron-cornered square under the selected unit; a cursor tooltip (what's there, biome, art file and its status); a right-click menu on every cell (chop, gather, pick, quarry, mine, haul, eat, drink, hunt, build here, stockpile here, dig, fish, dismantle, cancel, look) whose choices become designations that colonists take; Space pauses (PAUSED badge); fog of war off for development.
- **Colonists work on their own from the first second** (colonists suite): needs (hunger, thirst, sleep, social, nature), a society plan per culture (hearth, larder, knives, clothes, axe, food, woodpile, shelter, beds, cloaks, pick, workstone), hunting and cooking at the colony's own hearth, tools and clothing tiers, skills and thoughts; every act is a physical job with a target cell (196 jobs in one run, 0 without a target).
- **Current implementation is still one 256×256 surface area** (superseded design decision V80, not yet implemented): the underground layer, cave mouths and layer switching were removed from `UF_World`, `UF_WorldGen`, `UF_Fog`, `UF_DayNight`, `UF_Factions` in commit 6b27d9f. `UF_World` keeps the area grid code, switched to 1×1. The replacement five-level contract is `docs/design/VERTICAL_WORLD.md`.
- **4-way movement** (`UF_Movement8D` FourWay, `UF_World` stepToward): the world suite's `four_way_steps` check counted 0 diagonal steps.
- **Object grid**: every area has a per-cell object type grid saved as diffs (`world.object_diffs` PASS). Drawing and interaction come with `UF_Objects` (in progress).
- **Fog of war is off** for development (`UF_Fog` Enabled = false). When it's turned on again, explored cells stay clear for good (ExploredDim 0).
- **New Game rolls everything fresh from a random seed:** factions, the pond, the river, and the pair's names. Only the pair itself is fixed: a man and a woman in the middle (events 1 and 2 until `UF_Colonists` lands, then world units).
- **World catalog v3** (`game/data/UF_WorldCatalog.json`, written by Claude Code): ground kinds, climate, all DF surface biomes, regions, objects with actions and tints, items, recipes, sites, wildlife, people, history settings, colony plan, stance colors. Gemini's 2024-line rewrite of 17:26 was replaced (kept in Claude Code's scratchpad); Gemini may edit `objects`, `items.types`, `wildlife.species` and `people` only.
- **Claimed by Gemini on 2026-09-18, not checked by Claude Code:** an in-game look label in `UF_ColonyOverseer.js` (to be replaced by `UF_Look`), `UF_History.js` "5 epochs" history (to be rewritten to the contract), `docs/ASSET_INVENTORY.md` (to be regenerated), U7 master chipsets `U7_Outside_A1/A2.png` (the copies Gemini made over the stock `Outside_*`/`Dungeon_*` files were reverted twice; the `U7_` files remain and are not yet used).
- **Factions** (V18): 4–7 per world from the seed, saved; press **F** for the ledger.
- **Day and night:** light follows the clock (1 game hour per real minute); sight shrinks at night. No clock on screen.
- **Time speed:** `]` faster (×2, ×4, ×8), `[` slower, never below ×1 or backward.
- **Colonist movement:** one walk at a time; new orders replace old ones.
- **Zoom** (`UF_Camera`): mouse wheel, `-` / `+`; levels 1, ⅔ (the start), ⅓.
- Saving works (`save_serializes`), but see K7.

## Plugins registered in `game/js/plugins.js` (2026-09-19)
**2026-09-19 12:01:** `UF_Walls` was registered on disk between `UF_Objects` and `UF_Doors` in commit `a1a6911`. The user had confirmed the RMMZ editor was closed before this edit; reopen the project before testing so its in-memory plugin list matches the file.
**2026-09-19 09:57:** the tool registered six more (39 plugins): `… UF_Objects > UF_Doors > UF_Items > UF_Jobs > UF_Floors > UF_Colonists > UF_Wildlife > UF_Stance > UF_Combat > UF_Anim > UF_Fog > UF_DayNight > UF_TimeSpeed > UF_Camera > UF_Look > UF_Interact > UF_Sheet > UF_Talk > UF_Fire > UF_Test`. That makes Codex's UF_Doors and UF_Floors live (K19), all six status ON. After that run: smoke 11/11, New Game and Continue reached the map.
Registered 2026-09-18 20:10 by `tools/register_world_plugins.js` (commit b2ebbf2): `… UF_ProcGen > UF_World > UF_WorldGen > UF_Tiles > UF_Factions > UF_History > UF_Objects > UF_Items > UF_Jobs > UF_Colonists > UF_Wildlife > UF_Stance > UF_Fog > UF_DayNight > UF_TimeSpeed > UF_Camera > UF_Look > UF_Interact > UF_Test` (32 plugins; the older UF_Gumps, UF_Dialogue, UF_DFWorld, UF_DFCombat, UF_Crafting, UF_Construction, UF_Perspective25D and UF_ProcGen (no-op) are still on). Plugin descriptions no longer use DF words.

## Known problems
- **V80-V83's five-level world, resource coverage and mapwide ecology are not implemented or playtested.** The live engine and saves remain surface-only. `docs/design/RESOURCE_MANIFEST.json` is now a checked phase-2 design input: it covers all 265 local DF inorganic and 225 plant records, plus 11,048 material roles inherited across all 767 main-module creature records and 116 explicit U7/OSRS reference roles. The separate extinct-creature module and exhaustive OSRS named-variant audit remain open. `docs/design/VERTICAL_WORLD.md` and `docs/design/RESOURCE_ATLAS.md` define atomic all-level generation, distinct surface/earth/deep biomes, production-path guarantees, broad initial distribution and capped renewable/enemy recovery. These require coordinated changes across currently claimed world, generation, pathfinding, jobs, ecology, construction, ownership, UI and save systems; no RMMZ runtime or data file was changed in this manifest pass.
- **`UF_Ecology` is not registered in the live project and has not been tried in the RMMZ editor's F5 Playtest.** The editor process was running when checked on 2026-09-19, so `game/js/plugins.js` was not touched. The user must close the editor before registration.
- **`UF_Ownership` is not registered in the live project and has not been tried in the RMMZ editor's F5 Playtest.** The editor process was running when checked on 2026-09-19, so `game/js/plugins.js` was not touched. The user must close the editor before registration.
- **Action/status barks still appear over characters, contrary to revised V62.** Opened ownership screenshots visibly show `Walking` over a character. Work barks in the actively claimed job/speech code must be removed or rerouted; the current job and target belong in the clicked profile (V59).
- **K20 V73 two-square walls are live-integrated on disk but still need editor playtest (2026-09-19).** `UF_Walls` draws every stored blocking wall cell as a 48×96 sprite: roof/top in the square north of the base and wall face in the base square. The focused `live_walls_v73_final` and post-registration `live_walls_v73_commit` snapshots each passed 7/7; with two-square rendering deliberately disabled, `two_cell_render` and `connected_frames` both failed and the opened capture visibly collapsed the walls to one row. Regressions passed: doors 12/12 and smoke 13/13. All five current normal/regression captures were opened: the focused scenes show connected wood and isolated stone walls spanning two rows; both door scenes retain a complete two-row wall enclosure and working opening; smoke shows eight founders on the generated map. Both wall sheets are committed full 20-piece 192×480 sets of 48×96 frames and are selected directly; the approved wood set came from the dedicated wall delivery, while the stone set is a separate art-agent delivery. The code-generated lower face remains only as a compatibility fallback for legacy 48×48 wall sheets. RMMZ F5/F8 remains not checked.
- **K19 V56 floors and V57 doors are live-integrated on disk but still need editor playtest (updated 2026-09-19).** The live catalog contains three floor kinds, two door objects and all cultural choices; live `plugins.js` loads `UF_Doors` and `UF_Floors` in the required order. Against the current V31 no-history tree, `live_doors_fix1` passed 12/12. `live_floors_fix2` passed 10/11: every behavior check passed, but its uncached synthetic-room scan measured 2.520 ms against the 2 ms budget; designation took 0.080 ms. Two optimization attempts reduced the room scan from 31.710 ms to 4.425 ms and then 2.520 ms, so work stopped under rule 10. The exact current-tree `live_floor_door_smoke` snapshot passed 13/13 with no recorded errors. All seven current screenshots were opened: the smoke view shows eight founders around the lit campfire on generated grassland; door state/passage and floor designation/construction are visible in the focused captures, with obvious stock/generated placeholder art. RMMZ F5/F8 remains not checked. Existing baseline context: Jobs failed `hunt`, `open_job_taken`, and `saved`; Colonists timed out before its tools/clothes contract; whole-catalog checking had the same `farm_plot`/`workplace` failure with and without these additions.
- **K14 Playtest crash "Cannot read property 'pages' of undefined" (user screenshot, 2026-09-18 about 20:15).** Not reproducible on the committed tree: both title paths reach the map (see Verified working). At that moment the working tree held uncommitted mid-edit files: an integration agent's partial `UF_World.js` (image normalisation), `UF_Jobs.js`, `UF_WorldGen.js`, `UF_Fog.js`, `UF_Interact.js`, a `UF_ColonyOverseer.js` with a syntax error at line 545, and Gemini's edits to `UF_Visuals.js` (+310 lines), `UF_Stance.js` (+99), `UF_Objects.js` (+92) and the `$Adam`/`$Eve` sidecars. All 22 partial files were copied to Claude Code's scratchpad (`partial_edits_2026-09-18_2025/`) and the plugin set was restored from commit b2ebbf2 at 20:30. The exact failing line is unknown (no stack in the screenshot); the crash has not recurred on the restored tree.
- **K15 The game title is "Ultima Fortress - The Living Mountainhall"** (`game/data/System.json` gameTitle, shown in the window title bar). "Ultima" is banned in player-facing text (AGENTS.md). System.json is editor-managed: change it in the editor (Database → System) or after the editor is closed. Needs a title from the user.
- **K16 Integration not landed.** The integration workflow (cross-suite fixes, `UF.Beat` + `UF.AI.turn` per contract §1.7, one-command full run, adversarial review) was killed by a session limit at about 20:20 and stopped by Claude Code at 21:30 (the style changed under it); restarted 21:35 without the stock-art swap. Until it lands: units decide on frame timers, not the beat; the jobs suite fails 3 checks and the worldgen suite 2 when colonists are live (they share the arena); `UF_Fog.observers()` counts only `data.faction === "player"` (fog is off, so no effect).
- **K17 The art direction changed twice on 2026-09-18** (evening: flat FF6 2D at 16×16 native ×3; night: back to U7 2.5D oblique, now high-resolution at 48×48 native inside one square, user-approved on `art/review/u7_square_composite.png`). Docs now agree (VISION V2/V9/V44, ART_STANDARD, ASSET_REQUESTS shared spec, GUIDE_25D current again). Still stale: `art/briefs/FABLE_ASSET_BRIEF.md` (Gemini's; says 16×16 ×3), the 13 masters in `art/masters/` (16×16, built for the earlier standard; superseded by the 48×48 reference squares), `tools/art_check.js` (enforces the 3× grid rule; needs a 48-native mode), the 26 old-format briefs in `art/briefs/` (untracked; retired when `docs/asset_briefs/` lands), `docs/handoffs/HANDOFF_sprites_batch1.md` (16×16 batch; superseded). The U7 stand-ins in `game/img/` stay (V9), never committed, replaced before release.
- **K18 Gemini works in engine files on the user's instruction** (2026-09-18 night: "walls should function the way RMMZ chipset walls function, except with visible walls on the north and south side" → `UF_Objects.js` + wall sets; colonist "life necessities priorities, room and bed assignments, sleep mood thoughts" → `UF_Colonists.js`, `UF_ColonyOverseer.js`). Claude Code's revert of 20:30 (K14) threw those in-progress edits out of the working tree together with its own agents' partial files; every one of them is in Claude Code's scratchpad backup (`partial_edits_2026-09-18_2025/`, listed in K14) for Gemini or the user to take back. Until the user settles the split, Claude Code stays out of those five plugins (see In progress) and Gemini should run `node --check` on every plugin and the `smoke` suite before committing, because the user is playtesting the live tree.
- **K13 Gemini edits the engine and data, again** (2026-09-18, 20:00–20:30): besides the 16:30–17:34 list below, Gemini edited `UF_Visuals.js`, `UF_Stance.js`, `UF_Objects.js` and the sprite sidecars while the integration ran (reverted, backed up, see K14), wrote 20 scripts into `tools/` (`design_*settler*.js`, `build_*.js`, `fetch_ff5_*.js`, …; untracked, left in place), downloaded Final Fantasy V sprite rips into `game/test_output/` (reference only: nothing derived from them may ship; `reference/` is the place for them), staged the U7-derived exports in `art/sheets_48x48/` for commit (unstaged by Claude Code; U7-derived files are never committed), and claimed `UF_Objects.js` and the catalog in this file. Gemini's role is art only.
- **K13 Gemini edits the engine and data** (2026-09-18, 16:30–17:34): it rewrote `UF_WorldCatalog.json` three times, added code to `UF_ColonyOverseer.js`, `UF_World.js`, `UF_WorldGen.js` and `plugins.js`, wrote `UF_History.js`, copied U7 tile sheets over the stock `Outside_A1/A2.png` and `Dungeon_A1/A2.png` (reverted twice by Claude Code), and committed all of it as `[gemini]` (235dc2c), including Claude Code's uncommitted `UF_World.js` work. The user was asked to stop Gemini while the world build runs. Gemini's role is art only (AGENTS.md).
- ~~K7 Colonist state isn't saved~~ Fixed 2026-09-18 by `UF_Colonists` (colonists are `UF.World` units; `smoke.colony_state_in_save` PASS, `colonists.state_in_save` PASS after a JsonEx round-trip).
- **K3 Projection isn't U7 yet:** `UF_Perspective25D` lifts height straight up (36 px), and sprites anchor at the bottom center, so leaning objects look shifted right of their cell. Fix: GUIDE_25D §3 plus the sidecar anchor loader.
- **K2 Old fake autotest still present:** `UF_Core.js` still has the ungated map-start test block and the unconditional "100% OPERATIONAL" line (line 163), plus `run_autotest.bat` (A2-2).
- **K9 Concurrent code edits:** Gemini edited engine files while Claude Code worked, breaking boot three times on 2026-09-18 (duplicate lines; `loadScript("UF_Factions.js")` → `UF_Factions.js.js`). Each was fixed and committed (272bfc0, 0133225).
- **K10** `Map002.json` is Gemini's baked 256×256 world. Nothing uses it any more; the seeded world replaced it (user decision 2026-09-18).
- ~~K11~~ `UF_Factions.js`: replaced 2026-09-18 by the seeded faction generator (d43e6de).
- Art quality issues are tracked in `docs/ASSET_REQUESTS.md` and `docs/handoffs/HANDOFF_world_generation.md` (red fruit tree canopy, broken pine, boulders drawn as slabs).
- **K12** Gemini is replacing the object images (`!$TimberOak`, `!$PineTree`, …) with U7 stand-ins under their existing names (not yet committed). Stand-ins should use the `U7_` prefix (AGENTS rule 8), which also keeps them out of git, and the catalog entries switch to the new names.
- Fixed 2026-09-18: `UF_ColonyOverseer` snapped the camera to (120,122) on every map load, which broke layer and area changes. Colonists also matched another area's event 1 as "Adam".

## Engine queue (Claude Code)
**V80-V83 five-level world:** implement `docs/design/VERTICAL_WORLD.md` and `docs/design/RESOURCE_ATLAS.md` in dependency order after the active world/path/AI claims land: state and migration; atomic all-level generation; level view and connectors; excavation/construction/support; biome/resource manifest and placement; mapwide ecology; fluids/machines; vertical combat and UI. Preserve all five levels, render one, generate and checksum all five before play, service off-screen biome buckets fairly, and prove both acceptance matrices and V50 budgets in RMMZ before calling it working.
**Queued 2026-09-19 afternoon, to start when the runs editing these files land:** (a) 8-way movement and 8-way actions (V3): the movement plugin switched to eight directions, the path planner 8-way without corner cutting, 8-facing sprite rows in the animation player for every action, units turning to face their work, attack or spell target in eight directions, wildlife stepping; (b) the OSRS hooks from the skills and combat run (work speed in UF_Jobs, the old skills record in UF_Colonists, a skills page in UF_Sheet); (c) crafting (V66) once the user approves the crafting and theme proposals; (d) the cleaning tool for 4× deliveries (tools/make_25d.js, partly written, to finish for the flat style and rename): it also assembles a creature's per-action images (eight facings as rows) into the 20-column sheet and mirrors empty east-side rows (ART_STANDARD §4); (e) done: the user chose stock RPG Maker art (V9); the swap is in game/ (catalog, stock cuts, `$Adam`/`$Eve`), see Stand-ins; (f) the chain of command (V52, user 2026-09-19: "one character within a faction gives orders to others"; ranks as a tree of threes with lore rank names per faction): designed in `docs/design/CHAIN_OF_COMMAND.md` (being revised to the tree of threes, rank names proposed for approval); the build starts when the bands run lands, because orders go through each band's decision loop, and it sets the founders' ranks (5 rank 1, 2 rank 2, 1 rank 3).
The build order is `docs/design/DF_MECHANICS.md` §14:
1. **Cell state + biomes** (all DF starting states, distinct features)
2. Interaction layer (everything interactive, items on the ground, jobs)
3. Colonists as world units with DF inner life and personality-driven work; the colony saves (fixes K7)
4. Construction one segment at a time, fire, shelter, furniture, workshops
5. Starting population: wildlife, monsters, faction members
6. Fluids across layers
7. Edge arrivals and faction behaviors
8. Relationships, children, aging
9. U7-style combat
10. Societies for every faction (V51) and ranks (V52): the colonist simulation per faction site with an off-screen tick, `data.rank` / `data.superior`, orders flowing down (WORLD_ARCHITECTURE §2.10).
11. d20 stats for every character at generation (V53, with the V47 combat step): `data.stats` rolled from the seed, species and age shifts, `UF.D20` checks, shown on the sheet.
12. The settling run (V54, after item 10): 100 years of the coarse society tick on the real map before the player takes control, within the generation budget (WORLD_ARCHITECTURE §2.10).
13. Combat production chains (V55): materials and quality, furnace/smithy/bowyer/fletcher/tanning rack, weapons and armor with d20 dice and AC, the five equipment slots, ranged weapons with ammunition, the matching labors and culture weights; spec docs/design/COMBAT_CHAINS.md; built on the UF_Combat core of 2026-09-18. **Phase 1 landed 2026-09-18 night (data, spec, checker, credits; no code):** `docs/design/COMBAT_CHAINS.md` (spec with the phase-2 code checklist §9), catalog `materials`, `labors`, `combat`, 23 item types, 26 recipes, 6 workshop objects (stock tiles until AR-510), feathers on fowl/songbird/hawk, `cultures.*.chainWeights/arms`, 9 skills, the arming plan steps in all four plan variants (`tools/add_combat_chains.js`, idempotent); `tools/check_catalog.js` (RESULT PASS 18 checks; `--selftest` 45/45); `docs/CREDITS.md` (SRD 5.1 attribution); requests AR-510/511/512 and `docs/handoffs/HANDOFF_combat_chains.md`. Known: new `work` values are in beats while the engine still counts ticks (COMBAT_CHAINS D9); the `arm` step is inert until phase 2; not run in Playtest.
14. Flooring in dwellings (V56, with the rooms-and-beds work): floor ground kinds by culture, a floor job, the flooring plan step, room value in the sleeper's thought (WORLD_ARCHITECTURE §2.10).
Side items: projection fix + sprite anchors (K3), look cursor, removing the old autotest (K2).
Each step ships with checks and a handoff report for Gemini (art waves: `docs/handoffs/HANDOFF_df_art.md`).

## Stand-ins (U7-derived files: unused by the catalog since 2026-09-19; dev only, never committed, deleted before release; AGENTS rule 8)
**Placeholders are stock RPG Maker MZ art** (VISION V9, user 2026-09-19: "stock is fine"; the U7 files lean and clash with the flat HD FF6 look). Checked 2026-09-19 by Claude Code: no image, tile, people image or tier in `game/data/UF_WorldCatalog.json` names a U7 file or a U7-derived file without the prefix (grep, and the inventory check `catalog_no_standins`). What the catalog draws instead:
1. Units (wildlife, faction people, the start pair and its clothing tiers): `$UF_Stock_<Sheet>_<i>` sheets, one character cut out of a stock 8-character sheet (People1–4, Actor1–3, Nature, Monster, Evil, Vehicle, SF_*), or `$UF_Stock_BigMonster1_r1` (one row of `$BigMonster1`, always facing the viewer). Made by **`tools/extract_stock_characters.js`**; `--check --alias "$Adam=People1_4,$Eve=People1_5"` verifies all 52 against the RMMZ install's stock sheets (RESULT PASS, 2026-09-19). The same tool's `--alias` wrote stock People1 characters 4 and 5 over `$Adam.png` and `$Eve.png`, which UF_Colonists hard-codes for grown colonists without tier sheets (the UF_Anim and UF_Combat tests name `$Adam` too); the U7 originals are kept beside them as `.u7bak.png`. Their `.json` sidecars still name SHAPES.VGA 458 / 452 (the frame geometry, 48×48 with facings S W E N, still fits).
2. Items: `!$UF_Icon_<n>` sheets, stock IconSet icons cut by **`tools/extract_stock_icons.js`** (`--check`: 37 of 37 match), and Gemini's own `!$UF_Item_*` drawings for log, stone, iron and copper ore, berries, straw and meat.
3. Objects: stock `Outside_B` / `Outside_C` / `Inside_C` tiles with tints, `!Door1`, the wall sets, and Gemini's own flat `!$UF_*` drawings (berry bush, fern, campfire, rubble, straw bed, work stone, furnace, smithy).
`tools/generate_asset_inventory.js` counts the two tools' cuts as stock RMMZ only after comparing their pixels with the stock source (check `stock_cuts_verified`).

**Not swapped yet: the catalog swap does not reach three places** (checked 2026-09-19 11:20 by Claude Code with `tools/generate_asset_inventory.js`, which since then also reads the RMMZ editor data; its checks `runtime_no_standins` and `rmmz_data_no_standins` FAIL until these change):
1. Drawn in play by plugin code: `U7_Faces` (UF_Dialogue 271, the portrait of the old keyword dialogue; UF_Gumps 215, the paperdoll, which the I key opens on the map per UF_Gumps 347–352 with EnablePaperdoll "true"; read from the code, not tried in play) and the four container backgrounds `u7_gump_chest`, `u7_gump_barrel`, `u7_gump_backpack`, `u7_gump_sack` (UF_Gumps 104–108, when an event with a container note or the OpenContainer command opens one). Both plugins are enabled in plugins.js. Needs a code change (a stock face sheet such as `People1` in place of `U7_Faces`, a plain or code-drawn container window in place of the gumps), which waits until game/js may be edited again.
2. The RMMZ editor data: Actors.json actors 2–9 (face `U7_Faces` 0–7; map sprites `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith` for actors 2, 5 and 8), Map001 "The Bastion of Kraghold" (6 event pages: `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith`, `$U7_Goblin`) and Map002 "The Glade of Genesis" (336 event pages: `!$PineTree`, `!$GraniteBoulder`, `!$IronstoneDeposit`, `!$BerryBush`, `!$TimberOak`, `!$FruitTree`, `!$Campfire`). Not drawn in a new game as far as checked (the party is actor 1 only, with no face or sprite, System.json; UF_ColonyOverseer 141–142 turns the menu off; UF_World starts a new game in a generated area, map 1000, because StartInWorld defaults to true and StartTemplateMapId to 0; the only transfers in the plugins go to generated areas, UF_World 1617 and 1703, and no map event or common event has a Transfer Player command), but the editor shows them. Changing them edits editor-managed files, so the editor must be closed first.
3. Test-suite fixtures (listed per line below): a code change in each plugin's UF.Test.suite block. The UF_Look suite also expects the oak to draw `!$TimberOak` and the savanna tree `!$U7_Flat-toptree` (UF_Look 546 and 555–560), which the catalog no longer does.

`game/img/system/Window.png` (the skin of every window) is not a stand-in: `buildU7WindowSkin` in tools/generate_all_u7_assets.js (lines 361–477) draws it from fixed colours and arithmetic, with no SHAPES.VGA data; rebuilt from that code 2026-09-19 and compared: 0 of 36,864 pixels differ. `U7_Window.png` is a byte copy the same tool made (line 586) and counts as a stand-in by its name only. The inventory therefore classes Window.png as original (AR-033).

The U7 files below stay on disk (never committed) and nothing in the catalog draws them. The inventory tool reads this list: every backticked file on a bullet line counts as a U7 stand-in wherever it is used, so U7-derived files without the prefix must be named here. Format: `- <files> | source | what still names them`.
- People: every `$U7_*` person sheet (`$U7_Adam*`, `$U7_Eve*`, `$U7_Townsman.png`, `$U7_Townswoman.png`, `$U7_Guard.png`, `$U7_Ranger.png`, `$U7_Goblin.png`, `$U7_Orc.png`, `$U7_Gnome.png`, `$U7_DwarfGuard.png`, `$U7_Miner.png`, `$U7_Blacksmith.png`, `$U7_Fighter*`, `$U7_Automaton.png` and the rest), and without the prefix `$Adam.u7bak.png`, `$Eve.u7bak.png` (the U7 files that were $Adam.png and $Eve.png, byte-identical to each other) and `$People1.png` | SHAPES.VGA 458 / 452 (Adam, Eve, tiers 0–2), 462 / 463 (tier 3), 720 (guard), 265 (townsman, `$People1.png`), 460 (ranger); 3×, E/W transposed | RMMZ editor data (not drawn in play, see above): `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith` (Actors.json actors 2, 5, 8 and Map001 events), `$U7_Goblin` (a Map001 event); test suites (grep of game/js/plugins at 11:20): `$U7_Townsman`, `$U7_Ranger`, `$U7_Guard`, `$U7_Goblin` (UF_Factions, UF_Fire, UF_Interact, UF_Items, UF_Jobs, UF_Look, UF_Objects, UF_Roads, UF_Skills, UF_Stance, UF_Talk fallback, UF_TimeSpeed, UF_Wildlife, UF_World), `$People1` (UF_Floors 457)
- Creatures: every `$U7_*` creature sheet (`$U7_Deer.png`, `$U7_Wolf.png`, `$U7_Dog.png`, `$U7_Hare.png`, `$U7_Fox.png`, `$U7_Horse.png`, `$U7_Sheep.png`, `$U7_Ox.png`, `$U7_Aurochs.png`, `$U7_Chicken.png`, `$U7_WildBird.png`, `$U7_Hawk.png`, `$U7_Rat.png`, `$U7_Bat.png`, `$U7_CaveBat.png`, `$U7_Serpent.png`, `$U7_Snake.png`, `$U7_Cat.png`, `$U7_Spider.png`, `$U7_CaveSpider.png`, `$U7_CaveCrawler.png`, `$U7_CaveLurker.png`, `$U7_Troll.png`, `$U7_BogHorror.png`, `$U7_Skeleton.png`) | SHAPES.VGA 811, 498, 716, 523, 970, 537, 510, 496, 495, 555, 865, 493, 530, 502, 500, 727 and others, 3×, E/W transposed (AR-401 to AR-403) | test suites only: `$U7_Hare` (UF_Colonists, UF_Doors, UF_Interact, UF_Jobs, UF_Stance, UF_Talk fallback), `$U7_Troll` (UF_Stance). The combat rewrite of 2026-09-19 (UF_Combat.js, 10:59) draws spawned hostiles from the catalog species image, no longer `$U7_Wolf` / `$U7_CaveSpider`
- Objects without the prefix: `!$TimberOak.png`, `!$PineTree.png`, `!$FruitTree.png`, `!$BirchTree.png`, `!$SwampTree.png`, `!$DeadTree.png`, `!$TreeStump.png`, `!$BerryBush.png`, `!$WildShrub.png`, `!$TallGrass.png`, `!$Reeds.png`, `!$Wildflowers.png`, `!$GraniteBoulder.png`, `!$IronstoneDeposit.png`, `!$CaveBoulder.png`, `!$LooseStones.png`, `!$CrystalCluster.png`, `!$IronOreVein.png`, `!$CaveMouth.png`, `!$CaveLadder.png`, `!$FallenPillar.png`, `!$OldBones.png`, `!$StrawBed.png`, `!$WallStone.png`, `!$WallWood.png`, `!$Campfire.png` | SHAPES.VGA shapes 181, 306, 328, 310, 332, 325, 313, 672, 619, 321, 323, 314, 342, 341, 343, 353, 747, 916, 389, 705, 360, 650, 683, 365, 362, 739 (each file's sidecar `standInSource`), 3× | RMMZ editor data (not drawn in play, see above): Map002 events, 336 pages (`!$GraniteBoulder` 85, `!$PineTree` 82, `!$IronstoneDeposit` 64, `!$BerryBush` 57, `!$TimberOak` 46, `!$FruitTree` 1, `!$Campfire` 1); test suites: `!$TimberOak` (UF_Look 546, 562–566)
- Objects with the prefix: every `!$U7_*` object sheet (`!$U7_TimberOak.png`, `!$U7_PineTree.png`, `!$U7_FruitTree.png`, `!$U7_Flat-toptree.png`, `!$U7_Broadleafgiant.png`, `!$U7_Swamptree.png`, `!$U7_Deadtree.png`, `!$U7_TreeStump.png`, `!$U7_Shrub.png`, `!$U7_TallGrass.png`, `!$U7_Reeds.png`, `!$U7_Wildflowers.png`, `!$U7_LooseStones.png`, `!$U7_Gravel.png`, `!$U7_GraniteBoulder.png`, `!$U7_CaveBoulder.png`, `!$U7_MalachiteOutcrop.png`, `!$U7_GoldVeinOutcrop.png`, `!$U7_IronOreVein.png`, `!$U7_CrystalSpire.png`, `!$U7_SmallCrystals.png`, `!$U7_OldBones.png`, `!$U7_FallenPillar.png`, `!$U7_StrawBed.png`, `!$U7_WallStone.png`, `!$U7_WallWood.png`, `!$U7_CaveMouth.png`, `!$U7_CaveLadder.png`) | SHAPES.VGA, 3×, collision-aligned anchors (AR-021 to AR-023, AR-044, AR-102, AR-103) | test suites only: `!$U7_Flat-toptree` (UF_Look 555, 560), `!$U7_Shrub` (UF_Look 564)
- Items: the 23 `!$U7_Item_*.png` sheets (WoodLog, Firewood, RoughStone, IronOre, LeadOre, Blackrock, GoldNugget, MetalBar, RoughGem, CutGem, PlantFiber, WoolFleece, StrawBundle, SeedPouch, WildBerries, TreeFruit, CaveMushroom, RootVegetable, RawMeat, HaunchMeat, RiverFish, AnimalBone, LeatherHide), and without the prefix `!$UF_Item_Firewood.png`, `!$UF_Item_Fish.png` (byte-identical to U7 item sheets) | SHAPES.VGA item shapes, 3× (AR-200) | nothing
- Ground: `game/img/tilesets/U7_Ground_A1.png`, `U7_Ground_A2.png`, `U7_Outside_A1.png`, `U7_Outside_A2.png`, `U7_Dungeon_A1.png`, `U7_Dungeon_A2.png`, `U7_Fortress_B.png`, `U7_Glade_B.png` | SHAPES.VGA flat shapes 4, 23, 5 and others, 3× (AR-001) | nothing (the catalog's tileset is the code-drawn UF_GenGround_A2 with stock Outside_A1, Outside_B and Outside_C)
- UI still drawn in play: `game/img/faces/U7_Faces.png` (8 portraits), `game/img/system/u7_gump_*.png` (container gumps; `gump_test.png`, `gump_backpack.png`, `gump_barrel.png`, `gump_sack.png` below are byte copies) | FACES.VGA and GUMPS.VGA shapes 0, 1, 2, 5, by tools/extract_u7_assets.ps1 (lines 83–180) | drawn in play: UF_Dialogue 271 and UF_Gumps 215 (faces), UF_Gumps 104–108 (gumps); RMMZ editor data: Actors.json faces of actors 2–9. Not swapped: a code change, see above
- UI and other extractions, unused: `game/img/system/U7_Window.png`, `U7_Cursor.png`, `U7_Select.png`, `U7_Pointer.png`, `U7_HandPointer.png`, `game/img/system/u7_gumps/`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png` | earlier extraction, sources not recorded | nothing

## Environment
- Node.js v24.19.0 at `C:\Program Files\nodejs\`. Git repo at the project root (whitelist `.gitignore`).
- `run_tests.bat [suite]` runs the checks. It keeps running without window focus and reads its result from `game/test_output/results.txt`.

## Decisions waiting on the user
- **A game title** without "Ultima" (K15).
- **Gemini's engine edits** (K13): stop them, or change the roles in AGENTS.md.
- **Palette:** `art/palette/uf.hex` is the 256-colour Ultima VII daylight palette that Gemini extracted. Colour values are not copied art, but the standard should say so explicitly if it stays (ART_STANDARD F5 calls it "the project palette once locked"). Also: Gemini's brief `art/briefs/FABLE_ASSET_BRIEF.md` lists palette indices that do not match the file (74–81 are blues, 86–90 blue and pink, 22–26 reds; hexes like #558231 are absent). Claude Code's briefs use indices verified against the file.
- **`art/APPROVALS.md`** says the user approved the settler male anchor on 2026-09-18. Claude Code did not see that approval; confirm or correct it.
- Q1–Q8 and Q13 in `docs/VISION.md`.

## Backlog (not scheduled)
- V76/V77 progression: data-driven, faction-specific development/weapon trees and an original building-count prerequisite graph that unlocks later construction and recipes. Do not copy Warcraft content or invent unapproved faction lore.
- V78 private intimacy: rooms/doors need an occupancy query so most characters prefer an enclosed empty room for intimacy without freezing when none is available.
- V59/V62/V63 UI cleanup: overhead text is spoken dialogue only. Remove/reroute work barks and level-up status; show a character's current job, target and skill progress in the clicked profile. This waits for the active `UF_Jobs.js`/`UF_Sheet.js`/`UF_Skills.js` runs.
- V79 art flow: keep Antigravity/Gemini taking the next unclaimed approved asset request, with exact RMMZ specs and Nano Banana (Banana 2 when exposed). Codex's computer-use bridge returned no Antigravity app/browser surface on 2026-09-19, so no live prompt was sent from this session; `docs/ASSET_REQUESTS.md` remains the queue and already has active Gemini claims.
- Designation marker icon set (15 glyphs, 48×48) and a tooltip skin, if the code-drawn ones are not wanted long term (look agent).
- Base `UF_Colonists` sleep can still choose any free bed. The snapshot-only `UF_Ownership` layer now checks assigned-bed pathing, sleep and wake-up, but is not registered or F5-tested; skills still need their active integration hooks; hunts follow prey up to 40 cells (colonists agent).
- The start pond can overlap the home site's ring (seen once in `colonists.site_home.png`); `placeHome` should check the pond model (history/worldgen).
- `UF_Construction`'s legacy designations through the `$colonyManager` adapter are untested.
- `art/README.md`, `docs/handoffs/HANDOFF_sprites_batch1.md` and the 26 briefs in `art/briefs/*.md` (Claude Code's briefs agent, 20:03, older nine-section format with paste-ready prompts) are superseded by `docs/asset_briefs/` once it exists; remove or fold them in then.
