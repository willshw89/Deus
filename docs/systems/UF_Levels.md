# UF_Levels
The five persistent levels of the world (VISION V80, `docs/design/VERTICAL_WORLD.md`): `-2`, `-1`, Ground, `+1`, `+2`, all 256×256 at the same x,y. Every cell of every level has a **shape** (`solid`, `floor`, `open`, `ramp`, `stairUp`, `stairDown`, `stairBoth`) and a **material** (`stone`, `soil`, `wood`). A level is a seeded **baseline** (regenerated from the world seed, never saved) plus sparse saved **changes**. One level is on screen at a time: each level has its own RMMZ map id, and the levels other than the ground are painted from their shapes with runtime tileset 92. The player moves the view up and down with keys or the level plate; the cursor cell and the camera stay where they were. Old saves load unchanged on the ground.

Status: vertical slice 1 of `docs/design/VERTICAL_BUILD_PLAN.md` (§5), built 2026-09-19 by Claude Code. Checks: suite `vertical` (9 checks, not in the default run). Slices 2 (stairs, ramps, routes between levels) and 3 (digging, building, support, falling) are not built: nothing in play changes a unit's level or a cell's shape yet, except tests.

**Owner:** Claude Code (engine) · **File:** `game/js/plugins/UF_Levels.js` · **Load order:** after `UF_Fire`, before `UF_Test` (`@base UF_World`; after UF_WorldGen, UF_Tiles, UF_Objects, UF_Items, UF_Jobs, UF_Combat, UF_TimeSpeed, UF_Camera, UF_Look).

The z support lives in the files it belongs to (the "z seam"): `UF_World.js` (map ids, builds, units, paths, off-screen walking), `UF_Objects.js`, `UF_Items.js`, `UF_Jobs.js` and `UF_Look.js`. Their additions are listed below under "Levels in the other plugins". They work without UF_Levels (everything defaults to the ground); UF_Levels adds the levels' contents, the view switching and the migration.

## Coordinates
- A **record** carries `z` beside its area: `unit.z`, `item.z`, `job.target.z`, `job.stand.z`, a regrow entry's `z`, a unit's `goal.z`. Missing = the ground (0).
- An **API handle** may carry `z` inside the area: a *level area* `{ x, y, z }`. Every UF_World, UF_Objects, UF_Items and UF_Jobs function that takes an area accepts one; positional UF_World calls take a trailing `z`.
- **Map ids:** `MapIdBase + slot × areas + area index`, slot 0 = Ground (so the ground keeps id 1000 and old saves don't change), 1 = `+1` (1001), 2 = `+2` (1002), 3 = `-1` (1003), 4 = `-2` (1004).
- **Fail-closed legacy calls:** `UF.World.currentArea()`, `areaOfMapId()` and `isAreaMap()` answer only for the ground: while another level is on screen, `currentArea()` is `null`. `world:tileChanged`, `world:objectChanged`, `objects:changed` and `world:areaBuilt` fire only for the ground. So a plugin that doesn't know about levels either works on the ground or pauses (see Known problems); it never reads a `-1` map as if it were the ground.

## API (`UF.Levels`)
| Member | Description |
|---|---|
| `LEVELS` | `[-2, -1, 0, 1, 2]` |
| `SHAPES` | `{ solid: 1, floor: 2, open: 3, ramp: 4, stairUp: 5, stairDown: 6, stairBoth: 7 }` |
| `MATERIALS` | `["stone", "soil", "wood"]` |
| `TILESET_ID`, `GEN` | 92; the baseline generator version of new worlds (1) |
| `isLevel(z)` | `true` for integers -2..+2 |
| `label(z)` | The player-visible name: `"+2"`, `"+1"`, `"Ground"`, `"-1"`, `"-2"` |
| `levelKey(ax, ay, z)` | `"x,y"` for the ground (the pre-V80 key), `"x,y,z"` otherwise |
| `zOf(o)`, `levelArea(ref)`, `ref(area, x, y, z)`, `sameLevel(a, b)` | Helpers for records and handles |
| `shapeAt(ref)` → shape name, `""` outside the world | `ref` = `{ area, x, y, z }` |
| `cellAt(ref)` → `{ shape, code, constructed, material }` or `null` | |
| `setShape(ref, shape, { constructed, material })` → bool | Saves the change (a return to the baseline removes the entry) and redraws the cell and its 8 neighbours wherever the level is built (`UF.World.setDerivedTile`). Refused (`false`, reason in `lastRefusal()`): a level or cell that doesn't exist, an unknown shape or material, the ground (its shapes come with stairs and holes, slice 2), or a `solid`/`open` shape where a unit stands (V68). Emits `levels:shapeChanged` |
| `standableShape(ref)`, `isConnectorCell(ref)` | By shape alone |
| `describeCell(ref)` | `"-1 · Rock"`, `"-1 · Cave floor"`, `"+1 · Open air"`, `"+1 · Wooden floor"`: UF_Look's second line on the levels |
| `cellArt(ref)` | The stock sheet that draws the cell (`"Dungeon_A4"`, `"Outside_A5#19"`): UF_Look's art line |
| `baseline(z, ax, ay)` → `{ shape, material }` (`Uint8Array`s of codes) | Runtime only |
| `checksum(z, seed?, gen?)` | FNV-1a hex of a level's baseline; the ground's is a 32×32 lattice of `UF.WorldGen.cellInfo` (ground kind, water, peak). With `seed` it regenerates another world's (tests) |
| `migrate(state, view)` → migration record | Brings a pre-V80 state to version 4 in place (see Save data) |
| `verifyLevels(state)` → list of mismatches | Regenerates every baseline and compares it with the saved checksum |
| `view()` → -2..+2 or `null` | The level on screen |
| `setView(z, { center })` → bool | Shows level z; keeps the cursor and the camera (or centres on `center`) |
| `up()`, `down()`, `ground()` | One level up / down; the ground |
| `follow(unitId \| null)` | Follow a unit with the view (sets `$colonyManager.cameraFollowUnit`); the view changes level with it |
| `switching()` | A switch is in progress |
| `plateText()` | What the level plate shows |
| `looks()`, `composedSheets()`, `composeInfo()`, `tileOf(key)` | The look table, the runtime sheets and their build info |
| `stats()` | `{ generated, genMs, lastGenMs, shapeReads, switches, lastSwitch: { from, to, ms, frames, reused, follow }, migrations, checksumMismatches, composeMs, initMs }` |

## Levels in the other plugins (the z seam)
**`UF.World`** (every trailing `z` defaults to the ground):
- `LEVELS`, `zOf`, `isLevel`, `levelKey`; `inWorld(ax, ay, z)` (false for a level outside -2..+2); `areaMapId(ax, ay, z)` (0 for such a level); `levelOfMapId(mapId)` → `{ x, y, z }`; `isWorldMap(mapId)`; `viewLevel()` → the level on screen (a frozen shared object).
- `registerGenerator(name, fn, order, { levels })`: default `[0]`, so every existing generator stays ground-only; `ctx.z` says which level is built. `buildArea(ax, ay, z)`: the start template only on the ground.
- `setTile(…, tileId, z)`, `getTile(…, layer, z)`, `setObject(…, type, z)`, `getObject(ax, ay, x, y, z)`; `setDerivedTile(ax, ay, x, y, layer, tileId, z)` (patches the built maps, records no diff: level tiles are derived from shapes).
- `peekArea(ax, ay, z)` (least recently used eviction, 6 builds), `adoptBuild(ax, ay, z, map)`, `cachedBuild(ax, ay, z)`, `refreshUnitEvents(map, ax, ay, z)`, `reconcileEvents()`.
- `cellFree(ax, ay, x, y, ignoreUnitId, z)`, `nearestFreeCell(…, ignoreUnitId, z)`, `spawnCellFor(…, name, z)`, `standerAt(ax, ay, x, y, z)`. At boot a dispatcher sends level cells straight to UF_World's own test, because UF_Doors wraps `cellFree` with the pre-V80 signature and drops `z`; ground calls still go through UF_Doors.
- `addUnit({ …, z })` (throws for a level outside -2..+2; `u.z` is always written); `unitsInArea(ax, ay, z)`; `sendUnit(id, { area, x, y, z })` returns `false` for a goal on another level than the unit's; `moveUnitToLevel(unit, z, x, y)` (drops goal and path, moves the event on or off screen, emits `world:unitLevelChanged(u, fromZ, toZ)`); `isDisplayed(u)` compares the level.
- `findPath(area, …, { z })`, `walkable(ax, ay, x, y, { z })`, `reachable(levelArea, …)`, `transferView(ax, ay, x, y, dir, z)`.
- **Off-screen walking:** units on a level that isn't on screen follow planned paths on their own level (they used to step in a straight line through trees, walls and water), one cell per `UnitStepFrames`, spread over the frames by unit id; they wait for a unit in the way, then walk round it. `pathConfig.offscreenPaths` (default `true`) switches it off (tests). Fliers keep the straight step.
- **Map loading:** the map leaving the screen stays in the peek cache; a level shown before is shown again from there (unit events renewed) when the view comes from another level, so returning to the ground doesn't rebuild it. The same level again (a map reload, a return from another scene) is still rebuilt, and a build belongs to one world state (a loaded game never shows the previous world's map).
- Events: `world:levelTileChanged`, `world:levelObjectChanged`, `world:levelBuilt(levelArea)`, `world:unitLevelChanged`.

**`UF.Objects`:** all area functions take a level area; regrow entries carry `z`; `objects:levelChanged(levelArea, x, y, fromId, toId)` for levels other than the ground; the "on screen" calls (`at`, `set`, `find`, `apply`, `describe`) use the level on screen. **`UF.Items`:** items carry `z`; the ground index key is unchanged; `create`/`count`/`find` accept `z`; the sprites and "on screen" calls use the level on screen; a removed unit's items drop on its level. **`UF.Jobs`:** targets and stands carry `z` (a target without an area takes the level on screen); `take` offers a unit only jobs on its own level until slice 2; stand cells on another level off screen use `UF.World.walkable` on that level. **`UF_Look`:** the tooltip works on every level; on a level other than the ground its second line is `UF.Levels.describeCell` and sites aren't named.

## Baselines (generator version 1)
- `+1`, `+2`: every cell `open` (air).
- `-1`: `solid` except a seeded value-noise blob field (`caveScale` 18, threshold 0.76), about 9-13 % floor in 25-30 pockets (measured on three seeds with the same code); material `soil` where a second noise (scale 36) is above 0.5, else `stone`; a 2-cell rock border.
- `-2`: the same with scale 30, threshold 0.74 (bigger caverns), all `stone`.
- Ground: `floor` (its passability is its tiles).
- The noise, the salts (`"uf.levels.cave.<z>"`, `"uf.levels.soil.<z>"`) and the parameters are in UF_Levels itself and frozen per generator version, so a change elsewhere never changes a saved world's levels. Slice 4 (geology, RESOURCE_ATLAS) is generator version 2; saves keep the version they were made with (`levels[z].gen`).
- All five are generated and checksummed at New Game (about 70 ms measured, `vertical.five_levels`).

## Drawing (tileset 92) and the looks
The catalog's `levels.look` (else the same placeholders built into the code) says which sheet draws each look: `rock`, `soil`, `cave_floor`, `mined_stone`, `mined_soil`, `deck_wood`, `deck_stone`, `open_air`, `hole_edge`, `roof_wood`, `stair_up`, `stair_down`, `stair_both`, `ramp_up`, `ramp_top`, `ladder_foot`, `ladder_top`, `vein_iron`, `vein_copper`, `vein_gold`, `vein_gem` (`docs/handoffs/HANDOFF_vertical.md` §2 and §7). At boot (Scene_Boot waits for it, about 50 ms) UF_Levels copies each look, with its tint baked in, into three runtime sheets in the slots of the handoff's §3: `UF_GenLevels_A2` (A2 kinds 0-7: cave floor, dug stone, dug earth, wooden deck, stone deck, open air, hole edge, roof), `UF_GenLevels_A4` (A4 kinds 0-1: rock, soil) and `UF_GenLevels_B` (B tiles 1-11: stairs, ramps, ladders, veins). A sheet that fails to load is drawn as a flat colour and named in a warning. When Gemini's `UF_Levels_*` sheets are delivered and checked, each catalog entry becomes `{ "sheet": "UF_Levels_A2", "slot": "A2", "kind": n }` without a tint; no code changes.

Cell → tiles: layer 0 the base look (autotiled against neighbours of the same look), layer 1 the hole edge over an underground `open` cell, layer 2 a stair or ramp. Passage flags: rock, soil, open air and hole edge `0x0f`; floors and connectors 0; B tile 0 and veins `0x10`. The ground keeps tileset 91 and draws nothing from here in slice 1.

## The view
- **Keys:** `,` (also `<`) up, `.` (also `>`) down, Home the ground. A press in a frame when the map can't switch (a transfer finishing, an event running) is kept for 30 frames.
- **Level plate:** top right, left of the speed buttons (UF_TimeSpeed): `▼  -1  ▲`; the arrows are buttons; drawn in code (AR-1312 will replace it). Only the labels `+2`, `+1`, `Ground`, `-1`, `-2` are shown.
- A switch is an RMMZ transfer with no fade to the level's map; the cursor cell and the display position are put back; the zoom stays. It doesn't autosave and doesn't clear the image cache (it's a camera move, not a journey; VERTICAL_BUILD_PLAN §12 D-3).
- **Follow mode:** when `$colonyManager.cameraFollowUnit` names a unit on another level of the area on screen, the view switches to that level centred on it.
- Units, items and objects of other levels are not drawn and not clickable: their events don't exist on this level's map, and the object and item layers draw the level on screen.

## Save data (`UF.World.state`, version 4)
- `levels["-2".."2"] = { z, gen, checksum, cells: { "ax,ay": { cellIndex: packed } } }`, `packed = shape | constructed × 8 | material × 16`. `checksumMismatch: true` is added on load when a regenerated baseline differs (reported by a console warning, never repaired).
- `view = { x, y, z }`: the level on screen and the cursor cell.
- `version: 4`; `migrations: [{ from, to: 4, rule: "V80", counts: { units, items, jobs, regrow }, conflicts: [] }]` after a pre-V80 load.
- Records: `unit.z`, `unit.goal.z`, `item.z`, `job.target.z`, `job.stand.z`, regrow `z`. Level objects are in `objectDiffs["ax,ay,z"]`; ground keys are unchanged.
- **Migration** (on load when `version < 4` or `levels` is missing): writes `z: 0` on every unit (and goal), item, job target and stand and regrow entry, adds the five level entries (the four new levels regenerated from the seed), `view` on the ground, `version: 4` and one migration record. Nothing moves; no id, diff, object diff or fog key changes.

## Events
Emitted: `levels:viewChanged(fromZ, toZ)`, `levels:shapeChanged(ref, from, to)` (`from`/`to` = `cellAt` records). Listened: `world:created` (make the levels). Hooks (aliases): `DataManager.onLoad` and `Scene_Boot.start` (tileset 92), `Scene_Boot.isReady` (runtime sheets), `ImageManager.loadTileset`, `DataManager.extractSaveContents` (migration, checksum check), `Game_Player.performTransfer`, `Scene_Map.prototype.start / update / onTransfer / shouldAutosave / createDisplayObjects / isAnyWindowUnderMouse`, `UF.Combat.engage` (units on different levels never engage).

## Keys and mouse
`,` / `<` up, `.` / `>` down, Home the ground; click the plate's arrows.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `Dungeon_A4` kinds 1 and 0 (tinted) | rock, soil | stock RMMZ, replacement AR-1200, AR-1201 |
| `Dungeon_A2` kinds 8, 10, 2, 6 | cave floor, dug stone floor, dug earth floor, hole edge | stock RMMZ, AR-1202, AR-1203, AR-1207 |
| `Inside_A2` kinds 8 and 1 | wooden and stone decks | stock RMMZ, AR-1204, AR-1205 |
| `Outside_A5` tile 19 (tinted) | open air | stock RMMZ, AR-1206 |
| `Outside_A3` kind 4 | roof | stock RMMZ, AR-1219 |
| `Dungeon_B` 2, 10, 5, 29, 32 (tinted), 37; `Dungeon_A5` 83, 43 | stairs, ladders, veins, stairs both ways, ramps | stock RMMZ, AR-1208 to AR-1217 (not drawn in slice 1) |
| The level plate | view level | drawn in code, AR-1312 (not yet requested) |

## Checks
Suite `vertical` (run on its own: `--uf-test=vertical`; UF_Test's 180 s watchdog covers one suite). Provocation: `UF_TEST_PROVOKE=vertical.<check>` in a `--uf-test` run.
| Check | Proves | Provocation |
|---|---|---|
| `five_levels` | Exactly five levels saved; four 65 536-cell baselines whose regeneration equals the saved checksum; the ground lattice checksum; map ids round-trip, ground 1000; a sixth level refused by `isLevel`, `inWorld`, `areaMapId`, `setObject`, `setShape`, `addUnit` | `vertical.five_levels`: `isLevel` accepts 3 |
| `switch_view` | Level down by key: map 1003, cursor and display kept, zoom kept; the `-1` unit drawn with pixels, the ground unit not; the `-1` object and item drawn, the ground ones not; Look doesn't name the ground unit; plate `-1`; `currentArea()` null; `unitsInArea` per level; ground `findIn`/`find` miss the `-1` fixtures; a `-1` object change fires only `objects:levelChanged`; `Combat.engage` refuses a cross-level pair. Back up, then `+1` (floor walkable, air not, by `isPassable` and `cellFree`), then Home. Screenshots `view_ground`, `view_minus1`, `view_plus1` at zoom 1 | `vertical.switch_view`: `unitsInArea` ignores z during the switch |
| `follow_view` | A followed unit moved to `-1` takes the view with it, centred; an unfollowed unit's level change doesn't | `vertical.follow_view`: the follow hook off |
| `offscreen_state` | A `-1` walker in an L corridor (the straight line crosses rock) arrives without leaving the corridor while the ground is on screen; a ground walker round a wall arrives without standing on it while `-1` is on screen; unit data kept; no level build, no baseline generated and ≤ 64 cell reads per frame meanwhile; back on the ground every ground unit has an event and none stands on a blocked cell | `vertical.offscreen_state`: `pathConfig.offscreenPaths = false` |
| `persistence` | A shape change (ground: a tile), an object, an item and a unit on each of the five levels survive `makeSaveContents` → JSON → `extractSaveContents` → a new Scene_Map, each on its own level only; all baselines regenerate to the saved checksums; seed + 1 gives a different `-1` | `vertical.persistence`: the saved copy loses `levels["-1"].cells` |
| `save_size` | Save JSON ≤ 3 MB (V50), with the zipped size | `vertical.save_size`: 4 MB of padding |
| `switch_time` | Ground → `-1` and `-1` → ground switch times (performance.now from the key frame to Scene_Map.start) under a 5 s sanity bound; reports whether the build was reused | `vertical.budgets`: a 6 s busy wait in the level build |
| `surface_migration` | A real save made by the pre-V80 build (`game/test_fixtures/vertical_pre_v80.rmmzsave`, with the ground-build hashes it recorded in `.meta.json`) loads in place: every unit, item and job where it was at z 0; diffs, object diffs, fog, seed unchanged; the ground rebuilt from the migrated state has the same tile and object hashes as the pre-V80 build; five levels, version 4, one migration record; the map is the ground | `vertical.surface_migration`: `migrate` puts the first unit at -1 |
| `no_errors` | No uncaught error during the suite | `vertical.no_errors`: throws once |

World suite: `level_ids` (replaces `one_layer`): ids distinct and round-trip, ground id = MapIdBase, `areaOfMapId` of a level map is null, levels 3 and -3 don't exist. Provocation `world.level_ids` (the `-1` slot collides with `+1`).

## Known problems
- While a level other than the ground is on screen, the plugins that run only for `currentArea()` pause for the ground: wildlife decisions (UF_Wildlife `tick`), combat (UF_Combat `runTick`), speech bubbles, stance squares and action overlays (they draw nothing there anyway). Units still walk off screen and jobs still advance. The owner changes are listed in `docs/design/VERTICAL_BUILD_PLAN.md` §8.
- Units don't change level in play yet (slice 2); `take` keeps colonists on their own level.
- UF_Fog stores a level's fog under `map:<id>` (fog is off for development); the plan's `area:x,y,z` key is a one-line change in UF_Fog.
- Right-click options (UF_Interact) are ground-only: on another level nothing is offered.
- `pool` (A1) is not composed yet; no level uses water in slice 1.
