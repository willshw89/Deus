# UF_World: the world's areas, units, and the paths units walk

**Owner:** Claude Code · **File:** `game/js/plugins/UF_World.js` · **Load order:** after UF_ProcGen, before the plugins that use it (UF_WorldGen … UF_Interact), before `UF_Test`

## 1. Purpose
The world has one 256×256 area with the separate persistent levels of its **Z range** (VISION V80; WG.00.17, `docs/systems/DEUS_ZRange.md`): new worlds have 32 layers, -16..+15, with the ground at 0; a save made before WG.00.17 keeps its five levels -2..+2. The range is one setting, kept per world in `state.zRange`. Each level builds from deterministic generators and its saved changes. UF_Levels owns the versioned baseline and migration; UF_World owns level addressing, map caches, units and paths. Units remain in one world registry and continue walking on their own level while another level is rendered. Other systems must schedule against their records' levels, not the view; the World seam alone does not establish that every consumer simulates every level.

**Paths (2026-09-19):** on-screen and off-screen walkers follow terrain-aware paths on their own level. Current eight-direction planning, diagonal corner rules, facing and the existing movement/sliding integration are retained. Ground-only APIs remain deliberately ground-only so an unadapted plugin cannot mistake underground terrain for the surface.

## 2. Public API (`UF.World`)
Anything not listed here is internal.

### World and areas
| Member | Description |
|---|---|
| `config` | Plugin parameters: `areasX`, `areasY` (default 1×1), `size` (256), `mapIdBase` (1000), `tilesetId`, `groundTileId`, `templateMapId` (0 = none), `startInWorld`, `seed` (0 = random each New Game), `unitStepFrames` |
| `state` | The saved world: `{ version, zRange: {zMin, zMax} (absent in a save made before WG.00.17: -2..+2), seed, areasX, areasY, size, startArea: {x,y}, units: {id: unit}, nextUnitId, diffs, objectDiffs }` plus what other plugins keep there (`items`, `jobs`, `factions`, …). Read it; change it only through the functions below. |
| `newWorld(seed?)` | Creates a fresh world. Called automatically on New Game. |
| `hash32(...ints)`, `mulberry32(seed)` | The seeded hash and random-number generator every plugin uses (never `Math.random` in the simulation). |
| `currentArea()` | Ground-only `{x, y}`, or `null` when another level or a non-world map is on screen; use `viewLevel()` for every level |
| `inWorld(ax, ay, z = 0)` | Whether the area exists and `z` is a level of the world's Z range |
| `areaMapId(ax, ay, z = 0)` / `areaOfMapId(mapId)` / `isAreaMap(mapId)` | Ground keeps its IDs; the latter two recognize only Ground. Invalid area/level returns map ID 0 |
| `isStartArea(ax, ay)` | Whether this is the start area |
| `rngFor(ax, ay, salt)` | Deterministic random function for an area. Returns numbers in [0, 1). |
| `registerGenerator(name, fn, order = 100, { levels = [0] })` / `unregisterGenerator(name)` / `generators()` | Area generators (see below). Registering the same name again replaces it. |
| `buildArea(ax, ay, z = 0)` | Builds and returns an area's `$dataMap` object without touching the current map. Slow (~393k cells), so don't call it every frame. |
| `peekArea(ax, ay, z = 0)` / `clearPeekCache()` | A cached build of an area for reading off-screen cells (tiles, objects). Don't read its `events`. |
| `setTile(ax, ay, x, y, layer, tileId, z = 0)` / `getTile(ax, ay, x, y, layer, z = 0)` | Change or read a tile anywhere. Changes are recorded in `state.diffs`, survive leaving the area and saving, update the screen, and update the path grid. **All tile changes go through `setTile`.** |
| `setObject(ax, ay, x, y, type, z = 0)` / `getObject(ax, ay, x, y, z = 0)` | Change or read the object on a cell (type number from UF_Objects, 0 = nothing), recorded in `state.objectDiffs`. **All object changes go through `setObject`** (UF_Objects' `set`/`setIn`/`apply` and its regrowth do), or paths won't see them. **Returns `false` and changes nothing** when the new type blocks movement and a unit that doesn't pass through everything stands on the cell (VISION V68): see Spawning below. |
| `cellFree(ax, ay, x, y, ignoreUnitId, z = 0)` / `nearestFreeCell(ax, ay, x, y, radius, ignoreUnitId, z = 0)` | Whether a unit could be placed on a cell (walkable ground, no blocking object, no water, no unit there, fliers included), and the nearest such cell (rings outward, then by distance). UF_Doors wraps `cellFree` for door cells. |

**Generators.** `fn(ctx)` runs every time an area is built, in `order` (low first). It must be **deterministic**: use `ctx.rng` or `rngFor`, never `Math.random`, or areas change every time they're visited. `ctx` has `areaX`, `areaY`, `z`, `width`, `height`, `seed`, `rng()`, `isStart`, `templateRect`, `center`, `map` (the `$dataMap` being built), `setTile/getTile/index`, `objects` (Uint16Array), `setObject/getObject`, and `addEvent(spec)` (limit 999 per area).

### Level seam (merged 2026-09-19; runtime integration checks pending)

- Record coordinates store `z` beside `area`: unit/goal `{ area: {x,y}, x, y, z }`. An API area handle may be `{x,y,z}`. Missing/undefined means Ground; explicit invalid levels (including null, strings, fractions, NaN and levels outside the world's Z range) are not rounded into Ground. `addUnit` throws; mutators/path entry points refuse.
- The Z range (WG.00.17, `docs/systems/DEUS_ZRange.md`): `zRange()` → frozen `{zMin, zMax}` (without a world: the range a New Game gets); `levels()` and `LEVELS` → every level, lowest first (a frozen array replaced when a new state is read); `levelCount()`, `levelIndex(z)` (`z - zMin`, -1 for a non-level); `Z_RANGES` (`default` -16..+15, `test` -4..+4, `legacy` -2..+2); `parseZRange(v)`; `newWorldZRange()` (the environment's `DEUS_Z_RANGE`, else the default); `mapIdSlot(z)`; `onZRange(f)` (called when a new state's range is read). A New Game writes `state.zRange`; a state without it is a legacy world.
- `zOf(record)` defaults only missing z; `isLevel(z)` validates against the range; `levelKey(ax,ay,z)` keeps ground spelling `"ax,ay"`, otherwise `"ax,ay,z"`. `sameArea` deliberately compares only x/y.
- `levelOfMapId(id)` → `{x,y,z}` or null; `isWorldMap(id)`; `viewLevel()` returns a frozen shared level handle or null. Slots: Ground=0, +1=1, +2=2, -1=3, -2=4 (kept, so saved ids stay valid), then +z = 2z − 1 and −z = 2z (+3=5, −3=6, …, +15=29, −16=32), the same in every world; ID = MapIdBase + slot × area count + area index.
- Generators default to Ground only; explicitly register `{levels:[...]}` for other levels, or `{levels: z => bool}` for a rule over every level of the range (read when an area is built, so it never outlives a range). The start template is ground-only. `buildArea`/`peekArea` return null for invalid areas/levels.
- `setDerivedTile(ax,ay,x,y,layer,tileId,z=0)` updates built maps and path grids without recording a tile diff (UF_Levels stores shape changes). `adoptBuild(ax,ay,z,map)`, `cachedBuild(ax,ay,z=0)`, `refreshUnitEvents(map,ax,ay,z=0)`, `reconcileEvents()` support view switching.
- Cache: nine least-recently-used level builds (`PEEK_CACHE`; six before WG.00.17), with outgoing shown maps retained. The prewarm builds the view's ring (z±1, z±2); a map load waits for every level within `LOAD_WARM_REACH` (4) of the view, so builds follow the view and never the layer count. Re-entering another shown level reuses its build and refreshes unit events; explicit reload rebuilds. Loading another world clears caches and plans.
- `moveUnitToLevel(unitOrId,z,x?,y?)` changes a registered unit's level/cell, clears its goal/path and updates its event. It checks level and cell bounds; its caller must validate landing passability. `sendUnit` refuses cross-level goals until route integration.
- `transferView(ax,ay,x,y,dir?,z?)` defaults to the current view level (else Ground); it never changes a unit's level. `reachable` uses area.z. Door checks receive the tested level; no boot-time bypass skips UF_Doors.
- New Game accepts `state.viewStart = {area:{x,y},x,y,z}` from the founding system. Omitted area uses `startArea`; omitted z uses area.z or Ground. The initial view transfer uses that level (a dwarven primary home at -1 opens map 1003), while invalid founding levels throw rather than falling back to Ground.
- Persistent level baselines and their version/checksum metadata belong to UF_Levels; tile/object differences and unit records belong to UF_World. Ground diff keys and map IDs remain unchanged. These APIs do not authorize reconstructing or overwriting a saved baseline.

### Scale (`UF.Space`)
`GRID_SIZE_FEET` 5 (a square is 5 ft × 5 ft), `STRATUM_FEET` 2, `STRATA_PER_LAYER` 5, `Z_STEP_FEET` 10 (a layer; derived from the two before it). DEC-013 item 2, WG.00.17: a stratum was 1 ft and `Z_STEP_FEET` 5 before. `rulesDistanceFeet(a, b)` counts a level apart as `Z_STEP_FEET`. DEUS_Levels reads its cell and stratum feet from here (sphere damage, clearance in strata × `STRATUM_FEET`).

### Units
A unit record: `{ id, name, image: { characterName, characterIndex }, area: {x, y}, z, x, y, dir, dir8, goal, stuckFrames, data }`. Put your system's per-unit state in **`data`** (for example `data.needs`). It's saved with the unit. `data.through: true` (fliers) makes the unit's event pass through everything.

| Member | Description |
|---|---|
| `addUnit({ name, image, area, z, x, y, dir, data, snapToFree, exact })` | Creates a unit and returns its record. It appears immediately if its area is on screen. **It only ever appears on a cell it can stand on** (V68, since 2026-09-19): the cell asked for when `cellFree` accepts it, else the nearest free cell (see Spawning). `snapToFree: radius` only sets the first search radius now (`true` = 6). `exact: true` keeps the cell asked for (test fixtures; the cell must be one the unit can stand on, and a console warning names it when it isn't). Units with `data.through` are never moved. |
| `spawnCellFor(ax, ay, x, y, radius = 6, name, z = 0)` | The cell `addUnit` would put a unit asking for (x, y) on: `{ x, y, how, dist }`, `how` = `asked`, `moved`, `widened`, `shared` or `stuck` |
| `spawnStats()` | Counts since the world was created or loaded: `added`, `asked` (kept its cell), `moved`, `widened`, `shared`, `stuck`, `exact`, `through`, `maxMove`, `objectRefusals`, `regrowWaits`, `warnings`, `last` (the last 10 warnings) |
| `standerAt(ax, ay, x, y, z = 0)` | The first unit on the cell that doesn't pass through everything, or `null` |
| `lastObjectRefusal` | The last object change `setObject` refused: `{ area, x, y, type, objectId, unitId, unitName, reason }` |
| `holdOccupiedRegrowth()` | Puts off by an hour every due regrowth (UF_Objects' regrow list) whose new type blocks and whose cell holds a unit. Runs by itself before UF_Objects' regrowth; returns how many it held |
| `unit(id)`, `units()`, `unitsInArea(ax, ay, z = 0)`, `unitByName(name)` | Look up units |
| `removeUnit(id)` | Deletes a unit (death, leaving the world) |
| `sendUnit(id, { area: {x, y}, x, y, z })` | Walks the unit there. `unit.goal` goes back to `null` on arrival (`world:unitArrived`) or when it gives up (`world:unitBlocked`). Sending the same goal again keeps the current plan. |
| `stopUnit(id)` | Clears the goal and the plan |
| `isDisplayed(unit)`, `eventIdOf(id)` (= `1000 + id`), `eventOf(id)`, `unitOfEvent(gameEvent)` | Events of units on screen. **Never hold on to an event; ask again each time.** |
| `refreshUnitImage(id)` | Re-reads `unit.image` and `data.through` into the unit's event (clothing tiers) |

How units move:
- **On screen, walkers:** the unit follows a planned path (below), one cell per step with straight or diagonal movement (4-way only when configured). Each step first checks the grid again: if the world changed under the path (a wall went up on the next cell) or the unit was moved off it, the unit plans again. If another unit (or any solid event) stands on the next cell, the unit waits up to **30 frames**, then plans a way round that cell; if that cell is the goal itself, it gives up with `"goal occupied"`. If the path left hasn't got shorter for **600 map updates** (10 s at ×1: walking round units that never move aside, back and forth between two held gaps), it gives up with `"no way past"`. A goal cell nobody can stand on (a tree to chop, a wall site to build, water) ends at its **nearest reachable open neighbour**, and the unit arrives there. When no path exists the unit gives up **at once** (`world:unitBlocked`, reason `"no path"`), with no press against a wall.
- **On screen, fliers** (`data.through`) and **paths switched off** (`pathConfig.enabled = false`): the step used before paths: RMMZ's `findDirectionTo` (UF_Movement8D: a 200-node search in a small window), and after 300 frames without a step the goal is dropped (reason `"stuck"`).
- **Off screen:** walkers in the same area as their goal follow the same level-aware planned paths, one cell per `unitStepFrames` frames (16 by default), spread by unit ID. Terrain, doors and other walkers are checked, including both corners of diagonal steps. On/off-screen requests share the planning queue. Fliers, explicit paths-off mode and multi-area cross-area travel retain the straight fallback.
- **At an area edge** the unit steps into the neighbouring area, at the matching cell on the opposite edge (multi-area worlds only).

### Spawning (VISION V68, user 2026-09-19: "Nothing should spawn onto a square that is occupied by something they cant move thru")
**Units.** `addUnit` is the one function that adds units (births, site people, arrivals, wildlife, monsters, test units), so the rule lives there and every caller gets it without asking:
1. The cell asked for, when `cellFree` accepts it: walkable tiles, no water, no blocking object (tree, boulder, wall, workbench, shut door), no other unit (fliers count as occupants, so nothing spawns under a bird). A caller whose cell is free is never moved.
2. Else the nearest free cell within `snapToFree` (a number) or 6 cells; else within 24 cells.
3. Else the nearest cell that is at least walkable (`walkable`: tiles, water, objects) even if a unit stands there, with a console warning naming the unit and the cell; with none of those either, the cell asked for, with a warning (the middle of an ocean).
- Not moved: units with `data.through` (fliers pass through everything) and `exact: true`.
- **Water dwellers:** no wildlife species in the catalog is tagged for water (checked 2026-09-19: no `swim`, `aquatic`, `water` or `fish` kind or tag), so every unit follows the land rule. A species that lives in water needs a tag first; then the mirror rule (water cells only) goes here.
- Units added before `world:created` (the start template's `<ufUnit>` events) are seated just after it, so checking their cells doesn't build and cache the area before the generators' inputs exist.

**Objects.** Every object change goes through `setObject` (UF_Objects' `setIn`, `set`, `apply` and regrowth all call it), so the object half of V68 lives there: a change to a type that blocks movement is **refused** (`false`, nothing changes, `lastObjectRefusal` and a `world:objectRefused` event say which unit is in the way) while a unit that doesn't pass through everything stands on the cell. Callers that build (UF_Jobs, UF_Doors, UF_Fire, UF_History) get `false` from `UF.Objects.setIn`. A type that doesn't block (flowers, a floor, a stockpile, a bridge) may still go under a unit.
- **Regrowth waits:** UF_Objects' regrowth calls its own internal `setIn`, and a refused entry would be dropped. So just before UF_Objects processes its regrow list (UF_World's `time:hour` listener runs first; `UF.Objects.processRegrow` is wrapped at boot for direct calls), every due entry whose new type blocks and whose cell holds a unit is put off by one game hour, as often as needed. It grows the first hour after the unit has left.
- **Worldgen is unaffected:** generators write their own grid (`ctx.setObject`) while an area is built, without `World.setObject`. UF_History's settlement pass does go through `UF.Objects.setIn` on the live world, but it runs before any unit exists: `spawnStats().objectRefusals` was 0 after world creation in every spawn-suite run (2026-09-19).

### Paths
| Member | Description |
|---|---|
| `findPath(area, sx, sy, gx, gy, opts)` | A path in one area: `[{x, y}, …]` after the start, ending at the goal (or, for a goal cell nobody can stand on, at its nearest reachable open 4-neighbour); `[]` when already there; `null` when there is none. `opts`: `unit` (a unit record or id: doors let their own people through), `maxNodes` (cells expanded before giving up, default 12,000), `avoid: {x, y}` (a cell to walk round), `allowPartial` (a search that hits `maxNodes` returns the part toward the goal, marked `path.partial = true`), `resolveBlocked: false` (a blocked goal cell returns `null`), `z` (defaults to `area.z`, else Ground). |
| `lastPath` | What the last search did: `{ reason, ms, expanded, length, partial }`. Reasons: `found`, `partial`, `here`, `no path`, `goal walled in`, `start walled in`, `too far to plan`, `goal blocked`, `outside the area`, `not in the world`. |
| `walkable(ax, ay, x, y, opts)` | Whether a unit could stand on the cell by the path rule (tiles, water, objects; a door only for `opts.unit` when UF_Doors lets it through). `opts.z` selects the level (default Ground). `opts.ground: true`: whether the ground alone (tiles and water, objects ignored) lets units walk every way. |
| `reachable(area, sx, sy, gx, gy)` | Whether (gx, gy) can be walked to from (sx, sy), from the region map (instant; doors count as open, units ignored). A blocked goal cell is never reachable itself: ask about its neighbours. |
| `pathOf(unitId)` | The cells still ahead on the unit's current plan (`[{x, y}]`, next step first), or `null` |
| `pathStats()` / `resetPathStats()` | Planner numbers since the world was created: `plans, found, partial, none, avgMs, p95Ms` (last 512 plans), `maxMs, maxPlan, avgExpanded, medianExpanded, maxExpanded, queuedTotal, queuePeak, queueNow, replans, detours, waitFrames, blocked {reason: n}, regionBuilds, regionMsAvg, gridBuilds, gridMsAvg, cachedPlans` |
| `pathScratchStats()` | The 3D search scratch (WG.00.17): `{ layersAllocated, layersWithScratch, bytesPerLayer, bytes, lastSearchLayers, heapEntries, levels }`. A level gets its scratch slot (`g`, `parent`, `seen`, `closed`, `goal`: 20 B a cell) the first time a search reaches it, so a route within one level allocates one level of scratch, never one per layer of the range; a path's cells stay global ids, `(z − zMin) × size² + cell` |
| `pathConfig` | Settings (read them; tests may change them): `enabled` (true), `maxNodes` (12,000), `plansPerUpdate` (4), `waitFrames` (30), `maxStepFails` (3), `maxPartialLegs` (8), `progressFrames` (600), `offscreenPaths` (true; tests may disable) |

**The path rule is the on-screen stepping rule**, per cell and per direction:
- the tiles' passage flags, exactly as RMMZ's `checkPassage` reads them (top layer first, [*] tiles skipped), out of the cell in the step's direction and into the next cell from the opposite side;
- no water (`Tilemap.isWaterTile` on layer 0), except a bridge (UF_Roads' `bridge` object, which UF_Roads makes walkable on screen);
- no object whose catalog entry isn't `passable: true` (the same table UF_Objects' `blocks` uses; a unit can't leave such a cell either), except a door (UF_Doors) for units `UF.Doors.canUnitPass` lets through;
- other units are ignored when planning (they are waited for when met).

**How it works.** Each built map gets a walk grid (a byte per cell: the directions a unit may leave and enter it by) when its map is set up (about 8 ms on this machine), and a **region map** (cells joined by passable steps, doors open; 1.7–4.2 ms on average, rebuilt only after a change that opens or closes a cell). `setTile` and `setObject` update the grid cell and mark the region map stale. A plan first checks the region map, so an unreachable goal is known without searching; then A* runs over the whole area (8-way, octile costs 5 straight / 7 diagonal; 4-way when configured, binary heap, typed arrays allocated once and stamped per search, deeper nodes first on ties). A search that expands 12,000 cells without reaching the goal returns a partial plan toward it (only if that brings the unit at least 2 cells closer); the unit walks it and plans the next leg, and gives up with `"too far to plan"` after 8 legs.

**Budget.** At most **4 new plans per map update** (per update, so at ×8 speed up to 32 per drawn frame); the other units wait in a queue, oldest first. Plans are runtime only: a cache keyed by unit and goal, never saved (a loaded game plans again).

## 3. Events (through `UF.Events`, when UF_Core has loaded)
| Event | Payload |
|---|---|
| `world:initializing` | Fresh `state`, after clearing runtime caches and before template units or `world:created`; initialize persistent level baselines idempotently before factions choose founding cells. Do not reset saved levels in later generation listeners. |
| `world:created` | `state` |
| `world:areaBuilt` | `{x, y}`: the area just loaded for display |
| `world:viewAreaChanged` | `from {x, y}` or `null`, `to {x, y}` |
| `world:unitAdded` / `world:unitRemoved` | `unit` |
| `world:unitAreaChanged` | `unit`, `from {x, y}`, `to {x, y}` |
| `world:unitArrived` | `unit` |
| `world:unitBlocked` | `unit`, `reason`, `goal` (the goal given up; `unit.goal` is already `null`). Reasons: `no path`, `goal walled in`, `start walled in`, `goal occupied` (a unit stood on the goal for 30 frames), `no way past` (no way round a unit in the way, or no progress for `progressFrames`), `too far to plan`, `step refused` (the map refused 3 steps in a row), `stuck` (fliers and paths-off mode, 300 frames) |
| `world:unitImageChanged` | `unit` |
| `world:tileChanged` | `area {x, y}`, `x`, `y`, `layer`, `tileId` |
| `world:objectChanged` | `area {x, y}`, `x`, `y`, `type` |
| `world:levelTileChanged` | `levelArea {x,y,z}`, `x`, `y`, `layer`, `tileId`; non-ground tile changes, plus derived tiles on any level |
| `world:levelObjectChanged` | `levelArea {x,y,z}`, `x`, `y`, `type`; non-ground only |
| `world:levelBuilt` | `levelArea {x,y,z}`; non-ground map loaded for display |
| `world:unitLevelChanged` | `unit`, `fromZ`, `toZ` |
| `world:objectRefused` | `{ area, x, y, type, objectId, unitId, unitName, reason }`: `setObject` refused a blocking object on a unit's cell (V68) |

## 4. Save data
`contents.ufWorld` = `UF.World.state` (plain objects only). On load it's restored before the map rebuilds, so the area comes back with its tile and object changes and units. Paths are not saved.

## 5. Checks (UF_Test suite `world`, a default suite)
| Check | Proves |
|---|---|
| `in_area_map`, `area_size`, `level_ids` | New Game starts in the world's start area, a 256×256 map with a full data array and object grid, every level's map ID is distinct and round-trips, ground ID is unchanged, ground-only APIs exclude other levels, a level one past either end of the Z range is refused (WG.00.17; before, the levels 3 and -3) |
| `seeded` | Building the same area twice gives the same data |
| `diff_applies_live`, `object_diffs`, `diff_persists` | `setTile`/`setObject` show immediately, go through the peek cache off screen, and are still there later |
| `save_roundtrip` | The world state survives serialization |
| `single_area_world` (or `unit_starts_offscreen` with several areas) | The walk test's start and goal: 15 cells apart on a straight open row (searched outward from row 128, because a faction's walls may cross it) |
| `unit_enters_view`, `unit_walks_to_goal`, `faces_its_steps`, `four_way_steps` | A unit appears, walks 15 steps west to its goal, faces every step it takes, and never steps diagonally |
| `spawn_not_in_walls` | `snapToFree` never places a unit on a tree |
| `unit_image_refresh` | A new `unit.image` shows on the event |
| `view_stays_in_world` (or `view_crosses_edge`/`view_returns`, `unit_leaves_view` with several areas) | The view stops at the world's edge |
| `path_around_wall` | A closed 9×9 ring of wall objects with one gap, on a clear 27×27 patch away from units: a unit inside reaches a goal outside on the far side, 7 cells past the ring, within 40 s, through the gap, never standing on a wall cell |
| `path_blocked_goal` | `findPath` to a wall piece ends at its nearest reachable open neighbour (inside from inside, outside from outside), with no wall cell on the path |
| `path_blocked_fast` | With the gap closed, a unit outside sent inside gets `world:unitBlocked` within 60 frames and never stands on a wall |
| `path_gives_up_when_crowded` | The ring with two gaps, a unit standing still in each: a unit outside sent inside gives up with `"no way past"` within 20 s, never entering the ring or standing on a wall (without the progress limit it goes back and forth between the gaps for ever) |
| `path_replans` | A wall placed on a walking unit's next path cell: it walks round it (more than the 14 straight steps) and arrives, never stepping onto it |
| `path_budget` | 100 plans of 40–80 cells on the map (seeded picks), each timed: average ≤ 1.5 ms (the detail gives p95, max and cells expanded) |
| `no_wall_steps` | 60 s of play from the start of the path checks: steps by walkers (units without `data.through`) onto blocking cells (`UF.Objects.blocks`, water that isn't a bridge) = 0, with the planner's numbers for the window |
| `no_path_is_true` | The first 5 `"no path"` give-ups in that window are re-tested at that moment with a flood fill over `$gameMap.isPassable` (which knows nothing of the planner): none may be reachable |
| `frame_cost` | `UF.World.update` costs ≤ 1 ms per map update on average over the same 60 s (planning included) |
| `no_errors` | No uncaught errors during the above |

The path checks take about 60 s (the play window runs alongside them); the whole run, boot included, took 69 s on 2026-09-19.

### Suite `spawn` (VISION V68; not a default suite: `node tools/run_tests.js spawn --game <snapshot>`, about 15 s)
| Check | Proves |
|---|---|
| `all_units_on_standable_cells` | Right after a new game, every unit that doesn't pass through everything stands on a cell `cellFree` accepts ignoring itself (a walker under a flier also counts as fine: RMMZ lets it walk there). Counts per `data.kind`, `spawnStats()`, the water-dweller finding and the units of the camp screenshot (`spawn.camp_after_new_game.png`: the closest zoom showing every unit within 14 cells of the view's start) are in the detail |
| `addUnit_moves_off_blocked` | A unit asked onto a tree, a boulder, water, and a cell another unit stands on (each verified blocked first) lands on a free cell with no free cell nearer, and its event is there. Also UF_Combat's `spawnHostile` asked onto the tree |
| `exact_respected` | `exact: true` on a free cell keeps it; `exact: true` again on that cell (now taken) still keeps it, while the same request without `exact` is moved |
| `no_object_on_unit` | A regrowth forced onto a unit's cell (a regrow entry, empty cell to berry bush, due now, then a clock hour) doesn't grow while the unit is there and grows the hour after it has left; `setIn(wall_stone)` and `set(wall_wood)` on a unit's cell return `false`, leave the cell empty and record the reason; flowers may go under the unit; the wall goes up once the unit has left |
| `after_play` | 3600 map updates (60 s of game time at ×1) at the fastest speed with the colony, wildlife and the clock running, plus a birth (`UF.Colonists.giveBirth`), a hostile spawned onto a tree and regrowth forced onto 3 occupied cells a third of the way in: every unit added is on a free cell the moment it appears, and every unit is on a cell it can stand on at the end |
| `no_errors` | No uncaught errors during the above |

Each was seen failing (2026-09-19) with the environment variable `UF_TEST_PROVOKE` set for the test run (read only in a `--uf-test` run): `spawn.guard` (addUnit places units exactly where asked, from boot), `spawn.exact` (addUnit ignores `exact`), `spawn.objects` (no object refusal, no regrowth hold), `spawn.misplace` (one unit put on a tree cell just before each scan).

## 6. Status (2026-09-19)

**Current integration:** the World Z seam is merged with the active eight-way movement code. Node syntax and `git diff --check` pass. An ad-hoc in-memory Node VM check passed 26 contracts (five map IDs, strict invalid-z refusal, generator/tile/unit isolation, all-five off-screen walking and facing, actual save serialization, event families); changing unit construction to store `z: 0` caused its `unit record isolation` assertion to fail. This is not an RMMZ integration test. Five-level runtime and F5 acceptance have not yet been checked for this merged file. The historical results below describe earlier ground-only code, not proof of the merged version. Consumer-wide simulation across all five levels remains a release gate.

### Historical ground-only results
- **Spawning guard (V68), checked 2026-09-19 by Claude Code on snapshot copies; not yet run in Playtest F5:** suite `spawn` 6/6 in five runs on random seeds (two on earlier versions of the working copy, two on the final code in the working copy, one on a fresh snapshot of `game/` after the copy-back); each check seen failing with its provocation (`UF_TEST_PROVOKE`, see §5). In those runs 100–126 walking units were checked after world creation and 101–126 after play, 0 on a cell they can't stand on; `spawnStats()` after creation: 3–7 units moved 1 cell (these include callers that already asked for a free cell), none widened, shared or stuck, 0 object refusals. Also passed with the guard: world 26/26, smoke 13/13, history, objects, items, factions, timespeed, talk, combat, anim, sheet, fire, overseer, worldgen. The title-screen New Game flow reached the map with 143 units and no error.
  - **`wildlife.drawn_and_tinted` fails when a colonist stands at the test's tree cell** (2 of 5 runs with the guard, 0 of 4 without): the fixture at `UF_Wildlife.js` line 829 puts an oak on (cx, cy − 3) without looking for a unit there, and the guard refuses it (logged: `"oak" can't go on (128,125): "Braor" (unit 3) stands there`). The fixture needs a cell with no unit (`UF.World.standerAt`), which is UF_Wildlife's owner's change.
  - `UF_Jobs.js` line 351 (build `apply`) ignores `setIn`'s result: a build refused because a unit stands on the site uses up its items and ends `done` with nothing built. Not seen in a run; found by reading. UF_History line 756 also ignores it (0 refusals at creation so far).
  - Suites that fail the same way with and without the change (not caused by it): colonists `plan_reads_the_site`; jobs `hunt`, `open_job_taken`, `stalled_fails`, `saved`; look `cell_lines`, `asset_line_names_status`, `hunt_and_haul_options`, `saved`; stance `selection_square`; doors (7 checks: no door is placed in these worlds, so the door fixtures never reach their units); floors `perf`. Stance `hidden_off_map` failed once in 3 runs with the guard (markers 13 → 11 when one unit was removed, no object refusal logged) and in none of 3 without; not reproduced.
- **Works on snapshot copies of the game (checked 2026-09-19 by Claude Code; not yet run in Playtest F5):** the final code passed the world suite 26/26 on three random seeds (1179386317, 1950759435, 1178898424); earlier versions passed on seeds 721103047 and 1513387444. Every new or changed check was seen failing on a deliberately broken copy (mutant sets MA to MG, `sabotage_world.js` in Claude Code's scratchpad). Measured on this machine (Ryzen 7 8845HS), final code:
  - plans of 40–80 cells: 0.044–0.062 ms average, p95 0.085–0.23 ms, max 0.57 ms; 65–71 cells expanded (median), at most 1,024;
  - 60 s of play with 106–129 units: 940–1,205 plans, 0.028–0.037 ms average; queue peak 28–43; 0 walker steps onto blocking cells in 10,887–13,476 steps;
  - `UF.World.update`: 0.113–0.119 ms per map update on average (worst 4.6–10.5 ms, when a region map rebuild falls into it). With paths switched off (the old step, mutant MA) the same window cost 2.3–4.9 ms per update.
- **Other suites with this code (snapshots, 2026-09-19):** smoke 9/9; wildlife 15/15 on one seed and 14/15 on seed 2109239665, where `by_biome` fails the same way without this change; colonists 20/21 (`plan_reads_the_site`, same without this change); jobs 13/17: `hunt`, `open_job_taken` and `saved` fail without this change too, and **`jobs.stalled_fails` now fails** because it expects a boxed-in unit to take 2 × 300 ticks to fail its job. The job now fails after 8 ticks with the same reason ("can't reach it"), as paths require. The check belongs to UF_Jobs.
- **Known limits:**
  - Off-screen fliers, paths-off mode and cross-area travel retain straight stepping; ordinary same-area walkers use their own level's path grid.
  - The region map is rebuilt in full after any change that opens or closes a cell, the next time a plan needs it: 1.7–4.2 ms on average, up to 16 ms seen once in a 60 s window.
  - A goal more than 12,000 cells of search away is walked toward in partial legs (up to 8), which can end in a dead end (`"too far to plan"`). No test map needed one in these runs.
  - In play about 3–5 units a minute give up with `"goal occupied"` and 1–4 with `"no way past"` (herds, crowded gates). The caller decides what to do next (UF_Jobs picks a stand cell again; UF_Wildlife picks another wander goal).
  - UF_Combat's chase steps hostile units with `findDirectionTo` directly, not through `sendUnit`, so those steps don't use the planner. UF_Jobs picks the nearest open neighbour of a target as its stand cell without asking whether it is reachable (`reachable` answers that instantly); when it isn't, the unit now gives up at once (`"no path"`) and the job fails after its second block.
  - A unit on a cell that has just had a blocking object put on it can't leave (UF_Objects blocks leaving such a cell, as on screen); it gives up at once with `"start walled in"`. Since the V68 guard (2026-09-19) `setObject` refuses such a change while the unit stands there, so this only happens to units that pass through everything or to an `exact` test unit.
  - Removed sprites are detached, not destroyed (a small leak per unit crossing; freed when the scene changes).
