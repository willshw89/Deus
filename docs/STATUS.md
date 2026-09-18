# STATUS: what's actually true right now

Update this whenever reality changes. Write only what you've checked, and say how you checked it.

**Last updated:** 2026-09-18
**Current slice:** Slice 0 (IN PROGRESS since 2026-09-18)
**Roles:** Claude Code = engine and features; Gemini = art (AGENTS.md → Two agents)

## In progress (claims)
Format: `- <agent> | <task> | <files/folders> | since <date>`
- Claude Code | **World build** (docs/design/WORLD_ARCHITECTURE.md): biomes, objects, items, jobs, colonists, wildlife, history, stance squares, look/interact, pause, asset inventory | `game/js/plugins/UF_*.js`, `game/data/UF_WorldCatalog.json`, `game/js/plugins.js`, `docs/systems/`, `docs/ASSET_INVENTORY.md`, `tools/` | since 2026-09-18 18:00. **Gemini: no edits to game/, tools/ or docs/ until this line is gone.**

## Verified working (checks on a snapshot of the game, 2026-09-18, by Claude Code)
Suites run at 17:51 on snapshots: `smoke` 6 PASS / 1 FAIL (K7), `world` 14 PASS / 1 FAIL (a test timing, fixed after the run). The other suites are being rewritten for the world build; their state is recorded when it lands.
- **One 256×256 surface area** (user decision 2026-09-18): the underground layer, cave mouths and layer switching are removed from `UF_World`, `UF_WorldGen`, `UF_Fog`, `UF_DayNight`, `UF_Factions` (commit 6b27d9f). `UF_World` keeps the area grid code, switched to 1×1.
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

## Plugins registered in `game/js/plugins.js` (2026-09-18)
`… UF_ProcGen > UF_World > UF_WorldGen > UF_Factions > UF_History > UF_Fog > UF_DayNight > UF_TimeSpeed > UF_Camera > UF_Test` (UF_Visuals lighting off; UF_Core clock HUD off). `UF_History` was registered by Gemini (17:20, uncommitted line). The world build adds `UF_Tiles`, `UF_Objects`, `UF_Items`, `UF_Jobs`, `UF_Colonists`, `UF_Wildlife`, `UF_Stance`, `UF_Look`, `UF_Interact` in the order given in `docs/design/WORLD_ARCHITECTURE.md` §5.
**The RMMZ editor has been open since 14:57 with an older plugin list in memory. Close it without saving and reopen it before saving anything in it.**

## Known problems
- **K13 Gemini edits the engine and data** (2026-09-18, 16:30–17:34): it rewrote `UF_WorldCatalog.json` three times, added code to `UF_ColonyOverseer.js`, `UF_World.js`, `UF_WorldGen.js` and `plugins.js`, wrote `UF_History.js`, copied U7 tile sheets over the stock `Outside_A1/A2.png` and `Dungeon_A1/A2.png` (reverted twice by Claude Code), and committed all of it as `[gemini]` (235dc2c), including Claude Code's uncommitted `UF_World.js` work. The user was asked to stop Gemini while the world build runs. Gemini's role is art only (AGENTS.md).
- **K7 Colonist state isn't saved** (`smoke.colony_state_in_save` FAIL). `$colonyManager` lives outside the save; after loading, Adam and Eve's needs, thoughts, and jobs are lost. Fix: move colonists onto `UF.World` units (`unit.data`).
- **K3 Projection isn't U7 yet:** `UF_Perspective25D` lifts height straight up (36 px), and sprites anchor at the bottom center, so leaning objects look shifted right of their cell. Fix: GUIDE_25D §3 plus the sidecar anchor loader.
- **K2 Old fake autotest still present:** `UF_Core.js` still has the ungated map-start test block and the unconditional "100% OPERATIONAL" line (line 163), plus `run_autotest.bat` (A2-2).
- **K9 Concurrent code edits:** Gemini edited engine files while Claude Code worked, breaking boot three times on 2026-09-18 (duplicate lines; `loadScript("UF_Factions.js")` → `UF_Factions.js.js`). Each was fixed and committed (272bfc0, 0133225).
- **K10** `Map002.json` is Gemini's baked 256×256 world. Nothing uses it any more; the seeded world replaced it (user decision 2026-09-18).
- ~~K11~~ `UF_Factions.js`: replaced 2026-09-18 by the seeded faction generator (d43e6de).
- Art quality issues are tracked in `docs/ASSET_REQUESTS.md` and `docs/handoffs/HANDOFF_world_generation.md` (red fruit tree canopy, broken pine, boulders drawn as slabs).
- **K12** Gemini is replacing the object images (`!$TimberOak`, `!$PineTree`, …) with U7 stand-ins under their existing names (not yet committed). Stand-ins should use the `U7_` prefix (AGENTS rule 8), which also keeps them out of git, and the catalog entries switch to the new names.
- Fixed 2026-09-18: `UF_ColonyOverseer` snapped the camera to (120,122) on every map load, which broke layer and area changes. Colonists also matched another area's event 1 as "Adam".

## Engine queue (Claude Code)
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
Side items: projection fix + sprite anchors (K3), look cursor, removing the old autotest (K2).
Each step ships with checks and a handoff report for Gemini (art waves: `docs/handoffs/HANDOFF_df_art.md`).

## Stand-ins (U7-derived, dev only; replace before release; AGENTS rule 8)
Format: `- <file> | source | used for`
- `game/img/characters/$U7_Adam_T0.png`, `$U7_Eve_T0.png`, `$Adam.png`, `$Eve.png` | SHAPES.VGA shapes 458 / 452, 3×, transposed E/W, unclad | Adam and Eve Tier 0 Naked start
- `game/img/characters/$U7_Adam_T1.png`, `$U7_Eve_T1.png` | SHAPES.VGA shapes 458 / 452, 3×, transposed E/W, woven fiber/grass wraps | Tier 1 Primitive Attire
- `game/img/characters/$U7_Adam_T2.png`, `$U7_Eve_T2.png` | SHAPES.VGA shapes 458 / 452, 3×, transposed E/W | Tier 2 Peasant/fur attire
- `game/img/characters/$U7_Adam_T3.png`, `$U7_Eve_T3.png` | SHAPES.VGA shapes 462 / 463, 3×, transposed E/W | Tier 3 Fighter/tailored armor
- `game/img/characters/!$TimberOak.png` | SHAPES.VGA shape 181, 3×, collision-aligned anchor | Broadleaf timber oak
- `game/img/characters/!$PineTree.png` | SHAPES.VGA shape 306, 3×, collision-aligned anchor | Conifer pine tree
- `game/img/characters/!$FruitTree.png` | SHAPES.VGA shape 328, 3×, collision-aligned anchor | Ancient fruit tree
- `game/img/characters/!$GraniteBoulder.png` | SHAPES.VGA shape 342, 3×, collision-aligned anchor | Granite boulder
- `game/img/characters/!$IronstoneDeposit.png` | SHAPES.VGA shape 341, 3×, collision-aligned anchor | Ironstone outcrop
- `game/img/characters/!$BerryBush.png` | SHAPES.VGA shape 672, 3×, collision-aligned anchor | Berry bush
- `game/img/characters/!$Campfire.png` | SHAPES.VGA shape 739, 3×, collision-aligned anchor | Campfire hearth
- `game/img/characters/!$TreeStump.png`, `!$U7_TreeStump.png` | SHAPES.VGA shape 313, 3×, collision-aligned anchor | Felled tree stump (AR-021)
- `game/img/characters/!$CaveMouth.png`, `!$U7_CaveMouth.png` | SHAPES.VGA shape 389, 3×, collision-aligned anchor | Subterranean cavern entrance (AR-042)
- `game/img/characters/!$CaveLadder.png`, `!$U7_CaveLadder.png` | SHAPES.VGA shape 705, 3×, collision-aligned anchor | Cavern ascent ladder (AR-043)
- `game/img/characters/!$IronOreVein.png`, `!$U7_IronOreVein.png` | SHAPES.VGA shape 916, 3×, collision-aligned anchor | Ore vein mineral cluster (AR-044)
- `game/img/characters/$U7_Guard.png` | SHAPES.VGA shape 720, 3×, transposed E/W | Faction / city guard (AR-050)
- `game/img/characters/$U7_Townsman.png`, `$People1.png` | SHAPES.VGA shape 265, 3×, transposed E/W | Townsman settler / arrival (AR-050)
- `game/img/characters/$U7_Ranger.png` | SHAPES.VGA shape 460, 3×, transposed E/W | Woodland ranger (AR-050)
- `game/img/system/Window.png`, `game/img/system/U7_Window.png` | Carved oak & aged parchment, gold trim | UI Window skin (AR-033)
- `game/img/system/U7_Cursor.png` | 48x48 gold 2-frame pulse brackets | Look cursor (AR-030)
- `game/img/system/U7_Select.png` | 48x48 cyan corner brackets | Unit selection marker (AR-031)
- `game/img/tilesets/U7_Ground_A2.png`, `U7_Outside_A2.png`, `U7_Dungeon_A2.png` | SHAPES.VGA flat shapes 4 (grass), 23 (dirt), 5 (cave floor), 3× | A2 autotile ground sheet (AR-001 / AR-040)
- `game/img/characters/$U7_Hare.png`, `$U7_Chicken.png`, `$U7_WildBird.png`, `$U7_Rat.png` | SHAPES.VGA shapes 811, 498, 716, 523, 3×, transposed E/W, 48×48 frames | Dwarf Fortress small grazer wildlife (AR-401)
- `game/img/characters/$U7_Sheep.png`, `$U7_Wolf.png`, `$U7_Fox.png`, `$U7_Dog.png`, `$U7_Cat.png`, `$U7_Hawk.png`, `$U7_CaveSpider.png`, `$U7_CaveBat.png`, `$U7_Snake.png` | SHAPES.VGA shapes 970, 537, 510, 496, 495, 555, 865, 493, 530, 3×, transposed E/W, 96×96 frames | Dwarf Fortress medium wildlife & cavern creatures (AR-401 / AR-403)
- `game/img/characters/$U7_Deer.png`, `$U7_Ox.png`, `$U7_Horse.png` | SHAPES.VGA shapes 502, 500, 727, 3×, transposed E/W, 192×192 frames | Dwarf Fortress large fauna & draft animals (AR-401 / AR-403)
- `game/img/characters/!$U7_Item_*.png` (23 items: WoodLog, Firewood, RoughStone, IronOre, LeadOre, Blackrock, GoldNugget, MetalBar, RoughGem, CutGem, PlantFiber, WoolFleece, StrawBundle, SeedPouch, WildBerries, TreeFruit, CaveMushroom, RootVegetable, RawMeat, HaunchMeat, RiverFish, AnimalBone, LeatherHide) | SHAPES.VGA native item shapes, 3× integer nearest-neighbor, grounded bottom-anchor | Dwarf Fortress loose ground resource items & gump icons (AR-200)
- `game/img/characters/!$U7_Flat-toptree.png`, `!$U7_Deadtree.png`, `!$U7_Swamptree.png`, `!$U7_Broadleafgiant.png`, `!$U7_Shrub.png`, `!$U7_CaveBoulder.png`, `!$U7_CrystalSpire.png`, `!$U7_MalachiteOutcrop.png`, `!$U7_GoldVeinOutcrop.png` | SHAPES.VGA shapes 310, 325, 332, 181, 619, 343, 747, 341, 3× integer nearest-neighbor, collision-aligned anchors | Dwarf Fortress world objects & in-situ harvestable nodes (AR-021, AR-022, AR-044, AR-102, AR-103)
- `game/img/characters/$U7_*.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png`, `game/img/system/u7_gumps/`, `u7_gump_*.png`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `U7_Faces.png`, `game/img/tilesets/U7_Fortress_B.png` | earlier extraction, sources not recorded | unused or unknown

## Environment
- Node.js v24.19.0 at `C:\Program Files\nodejs\`. Git repo at the project root (whitelist `.gitignore`).
- `run_tests.bat [suite]` runs the checks. It keeps running without window focus and reads its result from `game/test_output/results.txt`.

## Decisions waiting on the user
- Q1–Q8 in `docs/VISION.md` (Q5 facings and Q6 scale are still needed for the art standard)

## Backlog (not scheduled)
- (empty)
