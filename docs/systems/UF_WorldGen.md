# UF_WorldGen
Builds every UF_World area from the world seed and `game/data/UF_WorldCatalog.json`: climate fields become biomes, ground kinds, water kinds and region character; areas get ground and water autotiles, region 250 on peaks, dense objects in the object grid, faction sites from UF_History, and the start (clearing, kit, the pair as events 1 and 2 until UF_Colonists exists). Every cell is a pure function of the seed and its world coordinates, so any cell can be classified without building its area.
Status: built 2026-09-18 (rewrite for `docs/design/WORLD_ARCHITECTURE.md` section 3), checks: `worldgen` (19 checks), `biomes` (11 checks, 12 when `UF.History.sitesIn` exists).

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
7. the kit (section 3.8): for each `start.kit.objects` id short of its minimum within `radius[1]`, the difference is added on seeded eligible ring cells.

## State it saves
None. Everything is recomputed from `UF.World.state.seed`; changes to tiles and objects are UF_World's `diffs` / `objectDiffs`.

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
| `catalog_ids_resolve` | A biome's ground/water/plant id, a region plant or ground, a kit id, a site piece id or a required water key (`fresh`, `icy`, `swamp`, `marsh`, `blighted`) is unknown |
| `autotile_matches_editor` | Fewer than 47 shapes derive, or a 3-wide strip isn't 16,0,24 |
| `tileset_id` | The built map or the map on screen doesn't use `UF.Tiles.TILESET_ID` |
| `start_in_middle` | Without UF_Colonists: events 1 and 2 aren't the named pair at mid±dx, or the note lacks `<glade>`; with UF_Colonists: any generator `<colonist` event exists |
| `names_vary_by_seed` | Seed and seed+1 give the same pair names |
| `water_near_start` | No water tile within `pond.distance[1] + pond.radius[1] + 2` of the start |
| `river_not_through_start` | A river's center passes within `keepAwayFromStart` of the start on its row |
| `rivers_count` | The river count is outside `catalog.rivers.count` or zero |
| `river_continuous` | A river has a dry row in the start area, or its center jumps more than a river width between rows |
| `river_continuous_between_areas` | (Only with an area below) the bottom row and the next area's top row share no water column |
| `objects_placed` | No objects in `map.ufObjects`, `stats` doesn't add up, or any `<ufObject:` event exists |
| `glade_clear` | An object inside `start.clearRadius` |
| `no_objects_in_water` | A non-`onWater` object on a water tile, or an `onWater` object on land |
| `kit` | A kit object is below its minimum within `kit.radius[1]` |
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
| `kit_present` | As `kit` above |
| `sites_stamped` | (Only when `UF.History.sitesIn` exists) no site in any area, or a site's pieces aren't in `ufObjects` |
| `build_time` | The median of 3 start-area builds exceeds 1500 ms |
| `deterministic` | As above |
| `no_errors` | Any uncaught error |
Screenshots: `biomes.start_zoom_0/1/2.png` (the start at each camera level), `biomes.corner.png` (cell (24,24) at ⅓), `worldgen.start_area.png`.

Results 2026-09-18 (snapshot runs, seeds random): `worldgen` 19/19 after fixing the `autotile_shapes` check's water handling; `biomes` 11/11 after the mangrove rule below; a Node survey of 52 seeds gave 110–160 ms per build, 12–22 distinct biomes, 100 % ocean rim, all three savagery tiers, kit met every time, objects 2456–3849 (one seed with 43 % ocean fell under 2500).

## Replaced core methods
None, aliases only (`Scene_Boot.prototype.start` to register the suites in test mode).

## Known limits
- `catalog.rivers.count` is `[1, 2]`, so the contract's "rivers ≥ 2" isn't guaranteed by the data; `rivers_count` checks the catalog range instead. Change the catalog to `[2, 2]` for two rivers always.
- Mangrove refinement: the contract's table sends every tropical, salty (sal > 0.5), r > 0.75 cell to `swamp_mangrove`, which makes `swamp_tropical_salt` unreachable. Here mangroves need sal > 0.8 (the shore band); salt swamps lie behind them.
- `objects_dense` (≥ 2500) can fail on seeds where the ocean covers more than about 40 % of the single area (1 of 52 surveyed seeds: 2456). The placement formula is the contract's and the densities are the catalog's; raising grassland/forest `plants` chances a little would clear it.
- Ground next to water joins the ground under the water (no outline on the bank), so the water autotile alone draws the shore.
- `avoidWater` doesn't see water in a neighboring area (no effect in a one-area world).
- Off-world coordinates classify as ocean (continent mask 0); rivers and the pond are only defined inside the world.
- The `world` suite's `unit_walks_to_goal` (UF_World) walks a test unit to (3,128), which is inside the ocean rim and impassable; it needs a walkable goal (`UF.WorldGen.cellInfo(...).walkable`).
- `UF.History.sitesIn` errors are caught (`UF.WorldGen.lastSiteError`) so a History bug can't break area builds; the area then has no sites.
