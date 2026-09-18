# ASSET INVENTORY: Ultima Fortress Art Manifest

**Generated:** 2026-09-18  
**Rules Reference:** `AGENTS.md`, `docs/ART_STANDARD.md`, `docs/ASSET_REQUESTS.md`  
**Catalog Authority:** `game/data/UF_WorldCatalog.json` (Version 3)  
**Palette:** Authentic Ultima VII 256-color daylight palette (`PALETTES.FLX` Record 0)  
**Projection:** 2.5D axonometric (45° up-left lean for height; flat top-down for ground; transposed East/West facings, never mirrored; 3× integer nearest-neighbor scale).

---

## Summary of Asset Coverage

| Category | Total Entries | U7 Stand-in | Original | Code-Drawn | Stock RMMZ | Retired |
|---|---|---|---|---|---|---|
| Terrain & Water | 10 | 10 | 0 | 0 | 0 | 0 |
| Ground Kinds (Biomes) | 26 | 1 | 0 | 25 | 0 | 0 |
| Colonists | 2 | 2 | 0 | 0 | 0 | 0 |
| World Objects & Flora | 23 | 23 | 0 | 0 | 0 | 0 |
| Ground Resource Items | 23 | 23 | 0 | 0 | 0 | 0 |
| Wildlife & Fauna | 14 | 14 | 0 | 0 | 0 | 0 |
| Faction Civilized Species | 7 | 7 | 0 | 0 | 0 | 0 |
| UI & System | 3 | 3 | 0 | 0 | 0 | 0 |
| Retired Subterranean Assets (V20 Retired) | 4 | 0 | 0 | 0 | 0 | 4 |
| **TOTAL** | **112** | **83** | **0** | **25** | **0** | **4** |

> [!NOTE]
> Every asset in the catalog names its exact image file, its request ID, and its status.
> All visual entities in-game reflect this metadata when hovered by the mouse cursor.
> Subterranean level was retired 2026-09-18 per user directive.

---

## Terrain & Water

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `terrain_grass` | Meadow grass | `U7_Outside_A2.png` | `AR-001` | **U7 stand-in** | ✓ YES | — | Seamless U7 meadow grass A2 autotile (SHAPES 4, 23, 5, 3x integer) |
| `terrain_water_fresh` | River fresh water | `Outside_A1.png` | `AR-001` | **U7 stand-in** | ✓ YES | — | A1 fresh water with shoreline banks, 3-frame flow animation |
| `water_pond` | Pond water | `Outside_A1.png` | `AR-101` | **U7 stand-in** | ✓ YES | — | Surface water variant (pond) |
| `water_marsh` | Marsh water | `Outside_A1.png` | `AR-101` | **U7 stand-in** | ✓ YES | — | Surface water variant (marsh) |
| `water_swamp` | Swamp water | `Outside_A1.png` | `AR-101` | **U7 stand-in** | ✓ YES | — | Surface water variant (swamp) |
| `water_icy` | Icy water | `Outside_A1.png` | `AR-101` | **U7 stand-in** | ✓ YES | — | Surface water variant (icy) |
| `water_brackish` | Brackish water | `Outside_A1.png` | `AR-101` | **U7 stand-in** | ✓ YES | — | Surface water variant (brackish) |
| `water_salt` | Salt water | `Outside_A1.png` | `AR-101` | **U7 stand-in** | ✓ YES | — | Surface water variant (salt) |
| `water_deep` | Deep ocean | `Outside_A1.png` | `AR-101` | **U7 stand-in** | ✓ YES | — | Surface water variant (deep) |
| `water_blighted` | Blighted water | `Outside_A1.png` | `AR-101` | **U7 stand-in** | ✓ YES | — | Surface water variant (blighted) |

## Ground Kinds (Biomes)

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `ground_meadow` | Meadow | `U7_Outside_A2.png` | `AR-001` | **U7 stand-in** | ✓ YES | — | Procedural ground pattern: grass |
| `ground_tropical_grass` | Lush grass | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: grass |
| `ground_dry_grass` | Dry grass | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: grass |
| `ground_shrub_soil` | Scrub soil | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: dots |
| `ground_forest_floor` | Leaf litter | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: litter |
| `ground_needle_floor` | Needle floor | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: needles |
| `ground_jungle_floor` | Jungle floor | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: litter |
| `ground_tundra` | Tundra | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: dots |
| `ground_snow` | Snow | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: snow |
| `ground_ice` | Ice | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: ice |
| `ground_sand` | Sand | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: dots |
| `ground_stony` | Stony ground | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: cracks |
| `ground_red_clay` | Red clay | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: stria |
| `ground_rock` | Bare rock | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: cracks |
| `ground_peak_rock` | Rock face | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: cracks |
| `ground_mud` | Mud | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: mud |
| `ground_swamp_mud` | Swamp mud | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: mud |
| `ground_dirt` | Dirt | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: dots |
| `ground_cursed_grass` | Blighted grass | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: grass |
| `ground_blessed_grass` | Flowering grass | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: grass |
| `ground_ash` | Ash | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: dots |
| `ground_cave_floor` | Cave floor | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: cracks |
| `ground_cave_rock` | Solid rock | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: cracks |
| `ground_fungal_floor` | Fungal floor | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: mud |
| `ground_crystal_floor` | Crystal floor | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: ice |
| `ground_chasm` | Chasm | `UF_Tiles_Procedural` | `AR-100` | **code-drawn placeholder** | ✗ MISSING | — | Procedural ground pattern: dots |

## Colonists

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `colonist_adam` | Adam (Naked Start) | `$Adam.png` | `AR-010` | **U7 stand-in** | ✓ YES | ✓ YES | U7 native 3x unclad figure, 4 facings (E/W transposed), 3-frame walk |
| `colonist_eve` | Eve (Naked Start) | `$Eve.png` | `AR-011` | **U7 stand-in** | ✓ YES | ✓ YES | U7 native 3x unclad figure, 4 facings (E/W transposed), 3-frame walk |

## World Objects & Flora

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `oak` | Oak | `!$TimberOak.png` | `AR-021` | **U7 stand-in** | ✓ YES | — | Density: 0.025, Clump: 0.7, collision-aligned anchor |
| `pine` | Pine | `!$PineTree.png` | `AR-021` | **U7 stand-in** | ✓ YES | — | Density: 0.025, Clump: 0.7, collision-aligned anchor |
| `fruit_tree` | Fruit tree | `!$FruitTree.png` | `AR-020` | **U7 stand-in** | ✓ YES | — | Density: 0.012, Clump: 0.5, collision-aligned anchor |
| `tree_savanna` | Flat-top tree | `!$U7_Flat-toptree.png` | `AR-102` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.015, Clump: 0.5, collision-aligned anchor |
| `tree_swamp` | Swamp tree | `!$U7_Swamptree.png` | `AR-102` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.015, Clump: 0.6, collision-aligned anchor |
| `tree_tropical` | Broadleaf giant | `!$U7_Broadleafgiant.png` | `AR-102` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.015, Clump: 0.6, collision-aligned anchor |
| `dead_tree` | Dead tree | `!$U7_Deadtree.png` | `AR-102` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.012, Clump: 0.5, collision-aligned anchor |
| `berry_bush` | Berry bush | `!$BerryBush.png` | `AR-023` | **U7 stand-in** | ✓ YES | — | Density: 0.025, Clump: 0.5, collision-aligned anchor |
| `bush` | Shrub | `!$U7_Shrub.png` | `AR-023` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.025, Clump: 0.5, collision-aligned anchor |
| `grass_tuft` | Tall grass | `!$U7_TallGrass.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.035, Clump: 0.5, collision-aligned anchor |
| `reeds` | Reeds | `!$U7_Reeds.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.025, Clump: 0.6, collision-aligned anchor |
| `flowers` | Wildflowers | `!$U7_Wildflowers.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.025, Clump: 0.6, collision-aligned anchor |
| `rocks_small` | Loose stones | `!$U7_LooseStones.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.02, Clump: 0.5, collision-aligned anchor |
| `granite_boulder` | Granite boulder | `!$GraniteBoulder.png` | `AR-022` | **U7 stand-in** | ✓ YES | — | Density: 0.015, Clump: 0.6, collision-aligned anchor |
| `ironstone` | Ironstone outcrop | `!$IronstoneDeposit.png` | `AR-022` | **U7 stand-in** | ✓ YES | — | Density: 0.012, Clump: 0.6, collision-aligned anchor |
| `cave_ironstone` | Ore vein | `!$IronOreVein.png` | `AR-044` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.012, Clump: 0.5, collision-aligned anchor |
| `cave_boulder` | Boulder | `!$U7_CaveBoulder.png` | `AR-044` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.015, Clump: 0.5, collision-aligned anchor |
| `crystal` | Crystal cluster | `!$U7_CrystalSpire.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.012, Clump: 0.5, collision-aligned anchor |
| `crystal_small` | Small crystals | `!$U7_SmallCrystals.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.015, Clump: 0.5, collision-aligned anchor |
| `gravel` | Gravel | `!$U7_Gravel.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.015, Clump: 0.5, collision-aligned anchor |
| `bones` | Old bones | `!$U7_OldBones.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0.01, Clump: 0.4, collision-aligned anchor |
| `tree_stump` | Felled tree stump | `!$TreeStump.png` | `AR-103` | **U7 stand-in** | ✓ YES | ✓ YES | Density: 0, Clump: 0, collision-aligned anchor |
| `campfire` | Campfire hearth | `!$Campfire.png` | `AR-103` | **U7 stand-in** | ✓ YES | — | Density: 0, Clump: 0, collision-aligned anchor |

## Ground Resource Items

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `wood_log` | Wood log | `!$U7_Item_WoodLog.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: wood, 3x native pixel art, grounded bottom-anchor |
| `firewood` | Firewood | `!$U7_Item_Firewood.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: fuel, 3x native pixel art, grounded bottom-anchor |
| `rough_stone` | Rough stone | `!$U7_Item_RoughStone.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: stone, 3x native pixel art, grounded bottom-anchor |
| `iron_ore` | Iron ore | `!$U7_Item_IronOre.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: ore, 3x native pixel art, grounded bottom-anchor |
| `lead_ore` | Lead ore | `!$U7_Item_LeadOre.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: ore, 3x native pixel art, grounded bottom-anchor |
| `blackrock` | Blackrock | `!$U7_Item_Blackrock.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: special, 3x native pixel art, grounded bottom-anchor |
| `gold_nugget` | Gold nugget | `!$U7_Item_GoldNugget.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: metal, 3x native pixel art, grounded bottom-anchor |
| `metal_bar` | Metal bar | `!$U7_Item_MetalBar.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: refined, 3x native pixel art, grounded bottom-anchor |
| `rough_gem` | Rough gem | `!$U7_Item_RoughGem.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: gem, 3x native pixel art, grounded bottom-anchor |
| `cut_gem` | Cut gem | `!$U7_Item_CutGem.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: gem, 3x native pixel art, grounded bottom-anchor |
| `plant_fiber` | Plant fiber | `!$U7_Item_PlantFiber.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: fiber, 3x native pixel art, grounded bottom-anchor |
| `wool_fleece` | Wool fleece | `!$U7_Item_WoolFleece.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: fiber, 3x native pixel art, grounded bottom-anchor |
| `straw_bundle` | Straw bundle | `!$U7_Item_StrawBundle.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: fiber, 3x native pixel art, grounded bottom-anchor |
| `seed_pouch` | Seed pouch | `!$U7_Item_SeedPouch.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: agriculture, 3x native pixel art, grounded bottom-anchor |
| `wild_berries` | Wild berries | `!$U7_Item_WildBerries.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: food, 3x native pixel art, grounded bottom-anchor |
| `tree_fruit` | Tree fruit | `!$U7_Item_TreeFruit.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: food, 3x native pixel art, grounded bottom-anchor |
| `cave_mushroom` | Mushroom | `!$U7_Item_CaveMushroom.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: food, 3x native pixel art, grounded bottom-anchor |
| `root_vegetable` | Root vegetable | `!$U7_Item_RootVegetable.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: food, 3x native pixel art, grounded bottom-anchor |
| `raw_meat` | Raw meat | `!$U7_Item_RawMeat.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: food, 3x native pixel art, grounded bottom-anchor |
| `haunch_meat` | Haunch meat | `!$U7_Item_HaunchMeat.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: food, 3x native pixel art, grounded bottom-anchor |
| `river_fish` | River fish | `!$U7_Item_RiverFish.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: food, 3x native pixel art, grounded bottom-anchor |
| `animal_bone` | Animal bone | `!$U7_Item_AnimalBone.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: bone, 3x native pixel art, grounded bottom-anchor |
| `leather_hide` | Leather hide | `!$U7_Item_LeatherHide.png` | `AR-200` | **U7 stand-in** | ✓ YES | ✓ YES | Category: leather, 3x native pixel art, grounded bottom-anchor |

## Wildlife & Fauna

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `wolf` | Wolf | `$U7_Wolf.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [2-4], 4 facings (E/W transposed) |
| `wildcat` | Wildcat | `$U7_Cat.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [1-1], 4 facings (E/W transposed) |
| `boar` | Boar | `$U7_Ox.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [2-5], 4 facings (E/W transposed) |
| `fowl` | Wild fowl | `$U7_Chicken.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [3-6], 4 facings (E/W transposed) |
| `hare` | Hare | `$U7_Hare.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [2-6], 4 facings (E/W transposed) |
| `fox` | Fox | `$U7_Fox.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [1-2], 4 facings (E/W transposed) |
| `dog` | Hound | `$U7_Dog.png` | `AR-403` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [1-3], 4 facings (E/W transposed) |
| `hawk` | Hawk | `$U7_Hawk.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [1-1], 4 facings (E/W transposed) |
| `deer` | Deer | `$U7_Deer.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [3-7], 4 facings (E/W transposed) |
| `horse` | Wild horse | `$U7_Horse.png` | `AR-403` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [2-5], 4 facings (E/W transposed) |
| `sheep` | Wild sheep | `$U7_Sheep.png` | `AR-403` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [3-8], 4 facings (E/W transposed) |
| `rat` | Rat | `$U7_Rat.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [2-6], 4 facings (E/W transposed) |
| `bog_horror` | Bog horror | `$U7_BogHorror.png` | `AR-402` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [1-1], 4 facings (E/W transposed) |
| `serpent` | Giant serpent | `$U7_Serpent.png` | `AR-401` | **U7 stand-in** | ✓ YES | ✓ YES | Herd: [1-2], 4 facings (E/W transposed) |

## Faction Civilized Species

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `faction_human` | Humans Civilian/Warrior | `$U7_Townsman.png` | `AR-050` | **U7 stand-in** | ✓ YES | ✓ YES | 4 facings (E/W transposed), 3-frame walk, U7 daylight palette |
| `faction_elf` | Elves Civilian/Warrior | `$U7_Ranger.png` | `AR-400` | **U7 stand-in** | ✓ YES | ✓ YES | 4 facings (E/W transposed), 3-frame walk, U7 daylight palette |
| `faction_dwarf` | Dwarves Civilian/Warrior | `$U7_DwarfGuard.png` | `AR-400` | **U7 stand-in** | ✓ YES | — | 4 facings (E/W transposed), 3-frame walk, U7 daylight palette |
| `faction_goblin` | Goblins Civilian/Warrior | `$U7_Goblin.png` | `AR-400` | **U7 stand-in** | ✓ YES | ✓ YES | 4 facings (E/W transposed), 3-frame walk, U7 daylight palette |
| `faction_orc` | Orcs Civilian/Warrior | `$U7_Orc.png` | `AR-400` | **U7 stand-in** | ✓ YES | ✓ YES | 4 facings (E/W transposed), 3-frame walk, U7 daylight palette |
| `faction_gnome` | Gnomes Civilian/Warrior | `$U7_Gnome.png` | `AR-400` | **U7 stand-in** | ✓ YES | ✓ YES | 4 facings (E/W transposed), 3-frame walk, U7 daylight palette |
| `faction_automaton` | Automata Civilian/Warrior | `$U7_Automaton.png` | `AR-400` | **U7 stand-in** | ✓ YES | ✓ YES | 4 facings (E/W transposed), 3-frame walk, U7 daylight palette |

## UI & System

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `ui_lookCursor` | Look cursor | `U7_Cursor.png` | `AR-030` | **U7 stand-in** | ✓ YES | — | U7 styling (carved oak, gold trim, high-visibility) |
| `ui_selectionMarker` | Unit selection marker | `U7_Select.png` | `AR-031` | **U7 stand-in** | ✓ YES | — | U7 styling (carved oak, gold trim, high-visibility) |
| `ui_windowSkin` | UI Window skin | `Window.png` | `AR-033` | **U7 stand-in** | ✓ YES | — | U7 styling (carved oak, gold trim, high-visibility) |

## Retired Subterranean Assets (V20 Retired)

| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |
|---|---|---|---|---|---|---|---|
| `cave_floor` | Cave floor autotile | `U7_Dungeon_A2.png` | `AR-040` | **retired (stand-in retained on disk)** | ✓ YES | — | Subterranean level retired by user 2026-09-18 |
| `cave_rock` | Cave solid rock autotile | `Dungeon_A4.png` | `AR-041` | **retired** | ✓ YES | — | Subterranean level retired by user 2026-09-18 |
| `cave_mouth` | Cave mouth entrance | `!$U7_CaveMouth.png` | `AR-042` | **retired (stand-in retained on disk)** | ✓ YES | ✓ YES | Subterranean level retired by user 2026-09-18 |
| `cave_ladder` | Cave ascent ladder | `!$U7_CaveLadder.png` | `AR-043` | **retired (stand-in retained on disk)** | ✓ YES | ✓ YES | Subterranean level retired by user 2026-09-18 |

