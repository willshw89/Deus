# UF_WorldGen
Builds every UF_World area from the world seed and `game/data/UF_WorldCatalog.json`: climate fields become biomes, ground kinds, water kinds and region character; areas get ground and water autotiles, region 250 on peaks, dense objects in the object grid, faction sites from UF_History (a year-1 camp of a New Game since 2026-09-19 has no pieces: only its disc is kept free of plants), the start (clearing, the pair as events 1 and 2 until UF_Colonists exists) and the resource kit around every faction's campfire (since 2026-09-19; before, around the start only; sized to the colony plan's first stage since the afternoon, VISION V67). Every cell is a pure function of the seed and its world coordinates, so any cell can be classified without building its area.
Status: built 2026-09-18 (rewrite for `docs/design/WORLD_ARCHITECTURE.md` section 3), kit around every faction area 2026-09-19 (VISION V4/V31 revised), kit sized to the plan's first stage with an ore outcrop 2026-09-19 afternoon (V67), checks: `worldgen` (22 checks), `biomes` (11 checks, 12 when `UF.History.sitesIn` exists).

**Owner:** the worldgen agent (Claude Code) · **File:** `game/js/plugins/UF_WorldGen.js` · **Load order:** after `UF_World`, before `UF_Tiles`

## API (`UF.WorldGen`)
World coordinates: `gx = ax * 256 + x`, `gy = ay * 256 + y`.

| Member | Description |
|---|---|
| `catalog()` | The loaded catalog (`$ufWorldCatalog`) or `null` |
| `fields(gx, gy)` → `{ e, r, t, d, v, sav, al, sal }` | Elevation, rainfall, temperature, drainage, volcanism, savagery, alignment, salinity, all 0–1 (section 3.1: continent mask, north cold, mountains cold, start blend toward `climate.startClimate`) |
| `classify(fields, lake)` → biome id | Section 3.3, pure. `lake` = the lake mask at that cell |
| `lakeAt(gx, gy)` → bool | The lake mask (section 3.2) |
| `biomeAt(gx, gy)` → biome id | |
| `cellInfo(gx, gy)` → `{ biomeId, biome, ground, water, walkable, region: { savagery, alignment }, fields, lake, peak }` | Cheap, no area build. `ground` = ground kind id (after mountain snow/peak and cursed/blessed swaps), `water` = key in `catalog.water.surface` or `null`, `walkable` = land, not peak, not water |
| `cellInfoLocal(ax, ay, x, y)` | Same for an area-local cell |
| `isWaterAt(gx, gy)` → bool | Any water: ocean, lake, river or the start pond |
| `riverModels(state)` → `[{ anchorX, anchorY, halfWidth, center(gy), isWater(gx, gy) }]` | All rivers (count and half-width from `catalog.rivers`, seeded columns, never within `keepAwayFromStart` of the start, at least 24 columns apart) |
| `riverModel(state)` | The first river (older callers) |
| `pondModel(state)` → `{ cx, cy, rx, ry, isWater }` | The start pond (`catalog.start.pond`) |
| `waterModel(state?)` → `{ rivers, pond, isWater(gx, gy), isRiverOrPond(gx, gy) }` | Cached per seed |
| `startNames(seed)` → `{ male, female }` | The pair's names from `catalog.start.names` |
| `kitCentres(ax, ay)` → `[{ x, y, faction, camp? }]` | Where the kit goes in an area: every faction's campfire in it (its year-1 camp from UF_History: the area centre unless the centre's 3 × 3 block isn't all land), else its area centre (`faction.home`), the player's first. Without factions, or for a save whose history comes from the older generator (no founders), the start cell of the start area only |
| `kitConfig()` | `catalog.start.kit` with defaults: `{ radius, objects, ore: { ids, count } \| null, nearWater, firstStage, water, wildlife }` |
| `kitNeeds()` → `{ founders, steps, meals, byCulture: { species: need }, needs, other }` | The colony plan's first stage in materials (V67): for every culture (`catalog.cultures`, its plan variant, its wall), the steps named in `start.kit.firstStage.steps`: a build step costs its object's `build.items` per cell (the camp kind's centre piece, the campfire, stands already and costs nothing); a craft step its recipe's inputs once per founder (`each`) or as often as `count` needs; a stock step that many food items; plus `mealsPerFounder` food per founder. `needs` = the most any culture needs of `log`, `stone`, `fiber`, `straw`, `food` (every faction gets the same kit); `other` = inputs outside those five (none on 2026-09-19) |
| `objectWorth(idOrTypeId)` → `{ log, stone, fiber, straw, food, ore }` | Per resource, the most one object yields through its actions, following what it becomes (oak 3 logs + its stump 1 = 4; granite boulder 4 stones + the loose stones it leaves 2 = 6; fruit tree 3 food and 4 logs); regrowth not counted. Food = any item with `food` or the tag, ore = any item tagged `ore` |
| `kitLog["ax,ay"]` → `[{ c, faction, id, x, y }]` | The objects the kit placed in the last build of each area (`c` = index into `kitCentres`) |
| `KIT_RESOURCES` | `["log", "stone", "fiber", "straw", "food", "ore"]` |
| `stats["ax,ay"]` → `{ objectId: count }` | Per-type counts from the last build of each area (site pieces and kit additions included) |
| `lastBuild` → `{ area, ms, objects, biomes: { id: cells }, sites }` | What the last build produced and how long it took |
| `hash32(...ints)`, `hashString(s)`, `unit(...ints)` (0–1), `valueNoise(seed, salt, gx, gy, scale)`, `smoothstep(a, b, v)`, `mulberry32(seed)` | Deterministic helpers for other plugins |
| `autotileShape(same(dx, dy))` → 0–46, `autotileShapeCount()` | Autotile shape from an 8-neighbor predicate, derived from `Tilemap.FLOOR_AUTOTILE_TABLE` |
| `PEAK_REGION` = 250 | Region id written on `peak_rock` cells (informational; UF_Tiles makes the tile itself impassable) |

Removed (section 3.9): `terrain`, `maxObjectsPerArea`, event-based `placeObjects`, `connectionsFor`, `caveOpenAt`, `generateUnderground`.

Generator `uf_worldgen` (order 10) runs in `UF.World.buildArea`:
1. classifies every cell once (biome, ground, water kind, peak, region tiers) into `Uint8Array`s; neighbors outside the area are resolved with the same function so edges match;
2. layer 0: water cells = `catalog.water.surface[kind] + shape(neighbor is any water)`; land = `UF.Tiles.groundBase(kind) + shape(neighbor has the same ground kind, counting the ground under water as its kind)`; layer 5 = 250 on peaks; `map.tilesetId = UF.Tiles.TILESET_ID`;
3. one water dilation (distance 0–4) for `avoidWater`;
4. the start (start area only, no editor template): `map.note = start.note`, the pair as events 1 and 2 from `start.pair` when `window.UF.Colonists` is absent;
5. site discs (`UF.History.sitesIn(ax, ay)`, radius + 1) are kept free; after placement the site `pieces` are stamped through catalog object ids;
6. objects (section 3.6): per land cell, the biome's `plants` in catalog order (cursed regions drop `cursedRemove` and add `cursedPlants`, blessed add `blessedPlants`); `patch = (1 − clump) + clump × smoothstep(0.5, 0.8, valueNoise(seed, hash(id), gx, gy, clumpScale))`, `roll = unit(seed, hash(id) ^ 0x9e3779b9, gx, gy)`, first entry with `roll < chance × patch` wins; `avoidWater` = required water distance; `onWater` entries only on water cells; no caps; peaks, the clearing and site discs stay empty;
7. the kit (section 3.8), **around every centre of `kitCentres`** (every campfire, 2026-09-19): for each `start.kit.objects` id short of its minimum within `radius[1]` of that centre, the difference is added on seeded eligible cells of the ring `radius[0]..radius[1]` (not water, not a peak, not a site disc, so never on a camp's nine cells, clear of water by the object's `avoidWater`), from `hash32(seed, kit salt, ax, ay, centreIndex × 256 + objectIndex)`. Then the ore outcrop (`start.kit.ore`): one id of `ids` and a count within `count` ([1, 2]), both from `hash32(seed, kit salt, ax, ay, centreIndex × 256 + 255)`; any ore id already standing within `radius[1]` counts toward it; placed from the stream `centreIndex × 256 + 254`. Ids in `start.kit.nearWater` (reeds) go on eligible cells within 3 of water first, then anywhere in the ring. Every placement is logged in `kitLog`. Areas are at least 40 cells apart (UF_Factions), so two kits never share a cell. Drinkable water within `start.kit.water.reach` is not placed here: UF_Factions puts each area where it already is.

**The kit's numbers** (catalog `start.kit`, 2026-09-19 afternoon, VISION V67): berry_bush 8, oak 8, rocks_small 10, grass_tuft 60, reeds 4, granite_boulder 4, fruit_tree 1, and 1–2 ironstone or copper outcrops. Where they come from (`kitNeeds`, 8 founders, the first stage = hearth, larder, knives, clothes, axe, pick, food, woodpile, shelter, beds, workstone; hide cloaks, tanning and everything after need hunting and workshops): the most any culture needs is 16 logs (13 wooden walls of the default and workshop plans, an axe, a pick and a workstone), 40 stones (13 stone walls of 2 for dwarves and automata, 8 knives, a pick, an axe, a workstone), 58 fiber (8 wraps of 6, 8 knives, an axe, a pick), 6 straw (the forest plan's 3 straw beds) and 16 food (the forest plan's 8 in the larder plus a meal for each founder), and the plan uses no ore yet (the outcrop is V67's). The minimums alone are worth 36 logs, 47 stones (with one outcrop), 60 fiber, 8 straw, 19 food and 2 ore (`objectWorth`), so every culture's first stage is covered whatever the biome rolls; animals to hunt are UF_Wildlife's kit herds.

## State it saves
None. Everything is recomputed from `UF.World.state.seed`; changes to tiles and objects are UF_World's `diffs` / `objectDiffs`.

## Five-map integration (2026-09-19, Codex)

`cellInfo(gx, gy, z = 0)`, `cellInfoLocal(ax, ay, x, y, z = 0)`, `biomeAt(gx, gy, z = 0)` and `isWaterAt(gx, gy, z = 0)` accept a strict integer level. Ground retains the existing classifier. Other levels read `UF.Levels.cellAt/biomeAt/standableShape`, including the pocket freshwater cells; they never infer underground terrain from the surface climate. Invalid levels return null/false. `waterModel()` remains the legacy surface model; level-aware callers must use the cell APIs.

`kitCentres(ax, ay, z = 0)` returns every bare settlement on the requested map, including two separate settlements of the same dwarven faction. Each centre carries `z` and its own `camp` ID. A missing level defaults to Ground for old saves; a dwarf's underground home is not a Ground kit centre.

The generator `uf_underground_resources` runs at order 20 on -1/-2 only, after Levels paints the shape grid. Small seeded finite deposits use existing rock/ore objects. Settlement kits fill catalog minimums on dry floor reachable through the same natural pocket within 20 cells, leaving the central 7×7 clear. They never carve terrain or write surface diffs. `kitLog` and `stats` use `World.levelKey` for underground maps. Kits currently use the existing surface harvestable objects as explicit placeholders; cave-specific flora is not implemented. This is not the complete RESOURCE_ATLAS, and solid geology still needs excavation gameplay.

Evidence: disposable snapshot `codex_zcore_integration_20260919_a`, `z_integration` 11/11. Both dwarf settlements had a campfire, nearby freshwater, and nonzero log/stone/fiber/straw/food resource potential; no Ground kit belonged to the dwarf faction. This check proves resource classes exist, not that every placement is usable after all blocking objects are placed. Both screenshots were opened: brown soil chamber at -1 and pale deep cavern at -2, visibly using surface vegetation placeholders. Editor F5/F8 not checked.

## Events
Emits none, listens to none. Hooks: `UF.World.registerGenerator("uf_worldgen", generate, 10)`; the catalog is loaded through `DataManager._databaseFiles`.

## Keys and mouse
None.

## Assets used (also listed in docs/ASSET_INVENTORY.md)
| Asset | What for | Status |
|---|---|---|
| `img/tilesets/Outside_A1.png` (`catalog.tilesets.surface.A1`) | The nine water kinds in `catalog.water.surface` (fresh 2048, pond 2096, marsh 2144, swamp 2192, icy 2240, brackish 2432, salt 2528, deep 2624, blighted 2720) | stock RMMZ, replacement AR-101 |
| `UF_GenGround_A2` (code-drawn by UF_Tiles) | The 22 ground kinds | generated, replacement AR-100 |
| `img/characters/$Adam.png`, `$Eve.png` (`catalog.start.pair[].image`) | The start pair events 1 and 2 (until UF_Colonists) | see docs/ASSET_INVENTORY.md |
| Object images (`catalog.objects[].image` / `tile`) | Not drawn here: the generator writes type numbers into `map.ufObjects`; UF_Objects draws them | per object in the inventory |

## Checks
Suite `worldgen` (runs on a snapshot: `node tools/test_snapshot.js --name worldgen --plugins UF_Tiles --suite worldgen`):
| Check | FAILs when |
|---|---|
| `catalog_loaded` | The catalog is missing or lacks `objects`/`biomes`/`climate`/`water` |
| `catalog_images_exist` | An object's `image` PNG or `tile.sheet` PNG is missing |
| `catalog_ids_resolve` | A biome's ground/water/plant id, a region plant or ground, a kit id (objects, ore ids, nearWater ids), a site piece id or a required water key (`fresh`, `icy`, `swamp`, `marsh`, `blighted`) is unknown |
| `autotile_matches_editor` | Fewer than 47 shapes derive, or a 3-wide strip isn't 16,0,24 |
| `tileset_id` | The built map or the map on screen doesn't use `UF.Tiles.TILESET_ID` |
| `start_in_middle` | Without UF_Colonists: events 1 and 2 aren't the named pair at mid±dx, or the note lacks `<glade>`; with UF_Colonists: any generator `<colonist` event exists |
| `names_vary_by_seed` | Seed and seed+1 give the same pair names |
| `water_near_start` | No water tile within `pond.distance[1] + pond.radius[1] + 2` of the start |
| `river_not_through_start` | A river's center passes within `keepAwayFromStart` of the start on its row |
| `rivers_count` | The river count is outside `catalog.rivers.count` or zero |
| `river_continuous` | A river has a dry row in the start area, or its center jumps more than a river width between rows |
| `river_continuous_between_areas` | (Only with an area below) the bottom row and the next area's top row share no water column |
| `objects_placed` | No objects in `map.ufObjects` of a pristine build, `stats` doesn't add up to it, or any `<ufObject:` event exists (pristine since 2026-09-19 afternoon: the campfires are built objects written at New Game) |
| `glade_clear` | An object inside `start.clearRadius` in a pristine build (radius 0 still covers the centre cell, where the player's campfire now stands as a built object) |
| `no_objects_in_water` | A non-`onWater` object on a water tile, or an `onWater` object on land |
| `kit_per_area` (2026-09-19, replaces `kit`) | On a pristine build of the start area (no object or tile diffs from play, no units), at some centre of `kitCentres` a kit object is below its minimum within `kit.radius[1]`, or no drinkable water (`start.kit.water.kinds`, read from the A1 tile) lies within `start.kit.water.reach`; or the number of centres isn't the number of factions |
| `kit_covers_plan` (2026-09-19 afternoon, V67) | `kitNeeds` is missing; the number of centres isn't the number of factions; within `radius[1]` of some centre the objects of a pristine build are worth less than the needs in any of log, stone, fiber, straw, food, or less ore than one outcrop of the least valuable ore id; or the kit's minimums alone (`objectWorth` × minimum) fall short of any need. Detail: the needs per culture, what the minimums are worth, what each area holds |
| `kit_fair` (2026-09-19 afternoon) | Some centre holds fewer than the minimum of any `start.kit.objects` id or fewer ore outcrops than `ore.count[0]` within `radius[1]` (pristine build), or the kit has no ore entry. Detail: the minimums (one table for every area) and each area's counts, ore kind and distance to drinkable water |
| `kit_seeded` (2026-09-19 afternoon) | Two pristine builds of this seed give different `kitLog`s, nothing was placed, or a synthetic world of the next seed (its own factions, year-1 camps and build) gives the same kit layout |
| `peaks_region_250` | A `peak_rock` tile without region 250, or region 250 without a peak tile |
| `autotile_shapes` | A sampled water cell's shape differs from "neighbor is water", or a sampled ground cell (away from water) from "neighbor has the same kind"; or fewer than 100 cells sampled |
| `deterministic` | Tiles or objects differ between two builds |
| `no_errors` | Any uncaught error during the suite |

Suite `biomes` (`--suite biomes`):
| Check | FAILs when |
|---|---|
| `all_biomes_reachable` | A catalog biome is never produced by `classify` over 37 044 synthetic field sets, or `classify` produces an id not in the catalog |
| `world_variety` | Fewer than 10 distinct biomes over a 6×6 sample of 4 points per area |
| `ocean_rim` | Fewer than 60 % of 128 cells 2 in from the world edges are ocean |
| `start_habitable` | The start cell isn't temperate grassland/forest/shrubland/savanna, is cursed, or isn't walkable |
| `region_tiers_exist` | A tier id isn't in the catalog, or fewer than 2 savagery tiers appear in the sample |
| `lakes_or_rivers` | Fewer than 3 of the 9 inland blocks (rim excluded) contain lake/river/pond water |
| `objects_dense` | The start area has fewer than 2500 objects |
| `kit_present` | As `kit_per_area` (every centre, pristine build) |
| `camps_cleared` (2026-09-19, replaces `sites_stamped`) | (Only when `UF.History.sitesIn` exists) the start area has no site; the number of bare camps isn't the number of factions (year-1 worlds); a bare camp's disc (radius + 1) holds any object in a pristine build; or a site of an older save with pieces doesn't have all of them stamped. `sites_stamped` went because nothing is stamped at New Game any more (VISION V31) |
| `build_time` | The median of 3 start-area builds exceeds 1500 ms |
| `deterministic` | As above |
| `no_errors` | Any uncaught error |
Screenshots: `biomes.start_zoom_0/1/2.png` (the start at each camera level), `biomes.corner.png` (cell (24,24) at ⅓), `worldgen.start_area.png`.

Results 2026-09-18 (snapshot runs, seeds random): `worldgen` 19/19 after fixing the `autotile_shapes` check's water handling; `biomes` 11/11 after the mangrove rule below; a Node survey of 52 seeds gave 110–160 ms per build, 12–22 distinct biomes, 100 % ocean rim, all three savagery tiers, kit met every time, objects 2456–3849 (one seed with 43 % ocean fell under 2500).

Results 2026-09-19 afternoon (snapshot copies with the campfire start and the V67 kit, seeds random): `worldgen` 22/22 after `glade_clear` moved to the pristine build (its first run saw the player's campfire: `FAIL worldgen.glade_clear - 1 objects inside the start clearing (radius 0)`); 7 factions, every kit entry at or above its minimum at every campfire, ore 1–2 per area (ironstone and copper both seen), drinkable water at 10.8–22.8 cells; the new checks seen failing on sabotaged copies: `FAIL worldgen.kit_covers_plan - … the kit's minimums alone are worth log 36, stone 47, fiber 8, straw 8, food 19, ore 2 (SHORT: fiber 8/58); within 20 cells of each campfire: Wenpelwyn Kingdom (128,128): log 36, stone 50, fiber 45, …` (grass_tuft minimum set to 8), `FAIL worldgen.kit_fair - … per area: Iric Burrow: berry_bush 7, oak 7, rocks_small 9, grass_tuft 59, reeds 3, granite_boulder 3, fruit_tree 0, ore 0 (none); …` (the kit placing one short), `FAIL worldgen.kit_seeded - seed 220172964: 322 kit objects placed (…), a second build DIFFERENT; …` (the kit drawing from Math.random).

Results 2026-09-19 (snapshot copies with the catalog edit, seeds random): `worldgen` 19/19 (5 factions: every kit object at or above its minimum within 20 cells of every centre, drinkable water at 7.6–23.0 cells), `biomes` 12/12 (7 factions, 7 bare camps with clear discs, water at 7.2–23.3 cells). Seen failing on a sabotaged copy (each kit object placed one short): `FAIL worldgen.kit_per_area - … FAILING: Ulbelok Kingdom at (128,128): short berry_bush 5/6, oak 7/8, rocks_small 9/10, reeds 3/4, granite_boulder 1/2, fruit_tree 0/1; …` and `FAIL biomes.kit_present` alike; with bare camps left uncleared: `FAIL biomes.camps_cleared - 6 sites in area (0,0): 6 bare camps (want 6), 0 older sites stamped; PROBLEMS: Gorula: 5 objects in its disc (first grass_tuft at (126,126)); …`.

## Replaced core methods
None, aliases only (`Scene_Boot.prototype.start` to register the suites in test mode).

## Known limits
- The kit places the same object ids whatever the biome (60 tall-grass tufts on tundra or sand too); a biome-appropriate substitute table (desert shrubs for fiber, pines for oaks) would read better and isn't there.
- `kit_covers_plan` counts what the objects yield once; berry bushes and fruit trees regrow (48 and 72 game hours), which it doesn't count.
- The map kit (`start.mapKit`, WORLD_ARCHITECTURE §3.8) is not placed by this plugin (2026-09-19): only `start.kit` is, around every faction area; there is no `biomes.map_kit` check. UF_Roads reads the map kit's minimums.
- `objects_placed`, `glade_clear`, `kit_per_area`, `kit_covers_plan`, `kit_fair`, `kit_present` and `camps_cleared` use a pristine build (no diffs of play, no units): the campfires are written at New Game and colonists change objects from the first second.
- `catalog.rivers.count` is `[1, 2]`, so the contract's "rivers ≥ 2" isn't guaranteed by the data; `rivers_count` checks the catalog range instead. Change the catalog to `[2, 2]` for two rivers always.
- Mangrove refinement: the contract's table sends every tropical, salty (sal > 0.5), r > 0.75 cell to `swamp_mangrove`, which makes `swamp_tropical_salt` unreachable. Here mangroves need sal > 0.8 (the shore band); salt swamps lie behind them.
- `objects_dense` (≥ 2500) can fail on seeds where the ocean covers more than about 40 % of the single area (1 of 52 surveyed seeds: 2456). The placement formula is the contract's and the densities are the catalog's; raising grassland/forest `plants` chances a little would clear it.
- Ground next to water joins the ground under the water (no outline on the bank), so the water autotile alone draws the shore.
- `avoidWater` doesn't see water in a neighboring area (no effect in a one-area world).
- Off-world coordinates classify as ocean (continent mask 0); rivers and the pond are only defined inside the world.
- The `world` suite's `unit_walks_to_goal` (UF_World) walks a test unit to (3,128), which is inside the ocean rim and impassable; it needs a walkable goal (`UF.WorldGen.cellInfo(...).walkable`).
- `UF.History.sitesIn` errors are caught (`UF.WorldGen.lastSiteError`) so a History bug can't break area builds; the area then has no sites.
