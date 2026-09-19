# Vertical build plan: slices V1 to V3 of the five-level world

**Date:** 2026-09-19 · **Author:** Claude Code (engine) · **Status:** plan only. No code for it exists yet and nothing in it has been run.
**Design it implements:** `docs/design/VERTICAL_WORLD.md` (VISION V80), §10 slices 1–3, with §3 (cells), §3.3 (connectors), §4.1 (generation order), §5 (dig, build, support), §7 (movement), §8 (UI), §9 (persistence) and §11 (checks).
**Also bound by:** V3 (8-way, no corner cutting), V9 (stock RMMZ placeholders), V50 (budgets), V68 (nothing spawns on a cell it can't move through), V73 (the two-square wall is not z+1), `docs/design/RESOURCE_ATLAS.md` §2 (all five baselines generated and checksummed at New Game).
**User request (2026-09-19 13:15):** "Continue coding features from U7 / DF into the game. We are now operating on 5 maps acting as vertical layers. we want to build up or down into this world, etc. Feel free to use duplicate RMMZ assets for these, and we can illustrate them later."

The vertical slices are called **V1, V2, V3** here, so they aren't confused with the project slices in `docs/SLICES.md`. **VW §n** means a section of `VERTICAL_WORLD.md`; a bare **§n** is a section of this plan.

**Line numbers.** Every `file:line` below refers to the working-tree files as read on 2026-09-19 between 13:20 and 13:50. Other runs have uncommitted edits in `UF_World.js`, `UF_Jobs.js`, `UF_Items.js` and `UF_Objects.js` (`git status`). Before editing, find each hook again by the function name given here, and apply the compare-before-copy rule from the task.

---

## 0. The decisions this plan makes (review these first)

| # | Decision | Why |
|---|---|---|
| D1 | **Records carry `z` beside `area`** (`unit.z`, `item.z`, `job.target.z`, `job.stand.z`, regrow `e.z`), as VW §3.1 requires. **API handles carry z inside the area argument**: a *LevelArea* is `{ x, y, z }`, and every API that already takes an `area` object accepts one. APIs that take positional `(ax, ay, …)` get a trailing `z` parameter. **An omitted z means the ground (`z = 0`)** everywhere. | 690 lines in 26 plugins use `area` objects or `sameArea` (a `grep -c` for `sameArea`, `.area` and `area.x`, 2026-09-19). With a LevelArea, the z-aware files change where they build areas, not every signature. The "omitted = ground" rule is the VW §3.1 compatibility overload. |
| D2 | **Fail-closed legacy API.** The legacy calls keep meaning "the ground": `World.currentArea()` returns the ground area only while the ground is on screen and `null` while another level is shown. `areaOfMapId` knows only ground map ids. `unitsInArea(ax, ay)` defaults to z 0. `world:tileChanged`, `world:objectChanged`, `objects:changed` and `world:areaBuilt` fire only for z 0. New z-aware names sit beside them: `World.viewLevel()`, `World.levelOfMapId()`, `world:levelTileChanged`, `world:levelObjectChanged`, `objects:levelChanged`, `world:levelBuilt`. | 97 lines in 27 files outside UF_World call `currentArea()` (grep, 2026-09-19); many of them read `$gameMap`/`$dataMap` after `sameArea(area, W.currentArea())`, and `sameArea` ignores z in all 17 private copies (plus `World.sameArea`). If `currentArea()` returned `{x,y,z}`, Wildlife, Fire, Colonists and Floors would read the −1 map as if it were the ground. With `null`, they fall back to their off-screen or peek paths, which are correct for the ground, or they pause (§8 lists those). |
| D3 | **Cell shape is the authority. Tiles are derived from it, and passability comes from tile flags.** Each level has a seeded baseline shape grid plus sparse saved changes. Materialized maps paint tiles from shapes, and the tileset flags make solid, open and air impassable. | The existing A* planner, region map, `cellFree` V68 guard and RMMZ `isPassable` then work unchanged on every level, because they already read tile flags (`UF_World.js:1078-1090`, `tileBits`). |
| D4 | **One RMMZ map id per level.** Ground stays at 1000, so pre-V80 saves and `$gameMap.mapId()` don't change. +1 = 1001, +2 = 1002, −1 = 1003, −2 = 1004. Levels use an in-memory tileset **92** built from stock Dungeon sheets. | This is what the removed underground layer did (`8e10921`: `MapIdBase + z * perLayer + …`), adapted to z −2…+2. |
| D5 | **Units move between levels in legs.** `UF_Levels` wraps `World.sendUnit`. A goal on another level becomes a route over a connector graph, and UF_World only ever walks the current leg, on the unit's own level. The final goal is saved as `unit.levelGoal`. | UF_World's stepping, path cache and V68 guard stay single-level. Nothing listens to `world:unitArrived` today (grep), so using it to hop levels breaks nothing. |
| D6 | **Off-screen units follow planned paths.** Today they walk in a straight line through trees, walls and water (`UF_World.js:924-937`, "Terrain isn't checked off screen"). | With one area, every unit was on screen. Once the view can leave the ground, the whole colony goes off-screen, and on −1 a straight line goes through rock. This is required in V1. |
| D7 | **Most of the work lives in the new `UF_Levels.js`.** Existing files get small hooks: a **z seam** in `UF_World.js` and **z passes** in `UF_Objects.js`, `UF_Items.js`, `UF_Jobs.js`, `UF_Look.js` and `UF_Interact.js`, plus one line in `UF_Fog.js`. For files claimed by others (Combat, Wildlife and the rest), §8 lists the exact change for each owner, and UF_Levels adds aliases where a public entry point exists. | UF_World's stepping, caches and comparisons are closures (`sameArea`, `planPath`, `stepOffscreen`, `buildCache`). They can't be reached by aliases, so a small seam is unavoidable. Everything else is aliased. |
| D8 | **Old saves migrate in place.** A save with `state.version` 3 gets `z: 0` written on every unit, item, job target and stand, and regrow entry. It also gets `state.levels` and `state.view`, and `version: 4`. The ground diff, object-diff and fog keys don't change, because ground keys are the old keys. The four other baselines are regenerated from the seed. | VW §9. No entity moves. Conflicts go to a log and are never auto-solved. |

---

## 1. What exists today (read on 2026-09-19)

### 1.1 `UF_World.js` (2636 lines)
- **Areas and ids:** areas are `{x, y}`. `sameArea` (L135) and `areaKey` (L136) ignore anything else. `inWorld` L309, `areaMapId(ax, ay) = 1000 + ay*areasX + ax` L311, `areaOfMapId` L312, `isAreaMap` L318, `currentArea` L319.
- **Materialization:** `buildArea(ax, ay)` L373-462 runs every registered generator (L423, `registerGenerator` L337, sorted by order), overlays the start template, applies `state.diffs[areaKey]` (tiles, L455) and `state.objectDiffs[areaKey]` (objects, L457), and adds one event per unit in the area (L460, event id 1000 + unit id). `DataManager.loadMapData` L1661 builds an area map in memory whenever the map id is an area's. A 6-entry peek cache `buildCache` (L546-560, key `seed:areaKey`) serves off-screen reads. `setTile` L465, `getTile` L487, `setObject` L502 (with the V68 refusal) and `getObject` L536 patch the screen map and the cached build.
- **Units:** `addUnit` L797 (V68 `seatCell` L693, `cellFree` L617, `nearestFreeCell` L644, `standerAt` L735), `unitsInArea` L837, `sendUnit` L852, `isDisplayed` L867, `moveUnitToArea` L911. `World.update` L984-1003 syncs on-screen units from their events and steps off-screen ones every 16 frames in a straight line (`stepOffscreen` L925).
- **Planner:** A* over an area's walk grid (`PATHS` L1016, `gridOf` L1110 from tile passage bits, water and object flags; `regionsOf` L1147 flood-fill region labels; `planPath` L1231; `localTarget` L1383; `planFor` L1412; queue L1439; `stepAlongPath` L1476). It is **4-way** (L1359-1362): V3's 8-way engine change is still queued (VISION decision log, 2026-09-19 afternoon). `findPath` L1546, `walkable` L1560, `reachable` L1573.
- **View and save:** `transferView` L1615, `tryViewEdge` L1622, `performTransfer` L1646. Save: `makeSaveContents` puts `ufWorld = World.state`, and `extractSaveContents` L1714 resets the caches. `Game_Map.setup` L1725 pre-builds the walk grid. The world check `one_layer` (L2485) asserts that no layer API exists. **V1 has to replace it** (§5.2 S26).

### 1.2 Other plugins read for this plan
- **UF_Objects.js:** one type number per cell in `$dataMap.ufObjects`, saved as per-area diffs through `World.setObject`. `gridOf(area)` L95, `typeIdIn` L106, regrow L134-160 (entries `{area,x,y,from,to,due}`), `setIn` L165 (emits `objects:changed`), `applyIn` L185 (drops yields through `UF.Items.drop`), `findIn` L206, on-screen API through `currentArea()` L665-697, listener L734. Sprites are drawn from `$dataMap.ufObjects`, so they already follow whatever map is loaded. `Game_Map.isPassable` alias L656 reads `$dataMap` too.
- **UF_Items.js:** item = `{id, type, count, area|null, x, y, holder}` (L18). A cell index keyed `areaKey(a) = "x,y"` (L51, L96-121). `drop` L223, `atIn` L248, `at` L250 (on screen), `find` L256, `putDown` L299, `count` L386, the unit-removed drop L409, and the sprite layer's `currentArea()` L474.
- **UF_Jobs.js:** job = `{id, type, target:{area,x,y}, params, owner, assigned, stand, …}`. `standableIn` L117 (off-screen uses `UF.WorldGen.cellInfoLocal`, which ignores tile diffs), `standFor` L148 (4-neighbours), `atCell` L165, `create` L583 (a target with no area gets `currentArea() || startArea`), `plan` L673, `take` L729 (same-area candidates, manhattan distance), `step` L844 (sends the unit at L859, stall key L862). Every handler passes `job.target.area` to Objects and Items (L189-564). **No reservation system exists** beyond `assigned`. Updates run for every active job, on screen or not (L890-910).
- **UF_Tiles.js:** runtime tileset **91** (A1 Outside_A1, A2 code-drawn ground kinds, B Outside_B, C Outside_C; flags copied from editor tileset 2), registered in `DataManager.onLoad` and `Scene_Boot.start` (L194-229).
- **UF_WorldGen.js:** generator `uf_worldgen` at order 10 (L880) sets `tilesetId` 91 (L690). It exports `hash32`, `hashString`, `mulberry32`, `unit`, `valueNoise`, `smoothstep` and `autotileShape` (L176-187). Salts are in `SALT` L52. `UF_Roads` also registers a generator (L551). Neither knows about z.
- **UF_Camera.js:** zoom is module state, applied in `Spriteset_Map.update` (L120-146), so it survives a map change. Keys `-` / `=` (L143-146). No change is needed.
- **UF_Look.js:** the tooltip hides while `!W.currentArea()` (L310). `cellAt` L251 reads the ground biome through `cellInfoLocal`. `subjectAt` uses map events, `Items.describe` and `Objects.at`.
- **UF_Interact.js:** `optionsFor` L431 returns `[]` when there is no `currentArea()`. It defines job types `dismantle`, `dig` (ground earthwork: **the name `dig` is taken**) and `fish` (L123-198). Designations are open jobs (`designate` L282). Markers sync on `currentArea()` and draw every designation with the same x,y (L773-779). Floors, Doors and Fire wrap `optionsFor` at runtime, which is the pattern UF_Levels follows.
- **UF_Fog.js:** the store key is `keyFor(mapId)` L68: `area:x,y` for area maps, else `map:<id>`. Fog is off for development.
- **UF_Colonists.js:** colonists take designations with `J.open().filter(sameArea x,y)` → `J.take` (L981-997). Default priority is 1 for unknown job types (L152). They search objects and items in `u.area`, which after D1 means the ground.
- **Walls, Floors, Doors (read-only):** Walls draw from `$dataMap.ufObjects`, so they work on any level's object grid. Floors' cultural floors are ground tile kinds. Doors keep a `state.doors` registry keyed by area and cell, and `world:areaBuilt` → `placeAll` is guarded by `generated` (L396-399). None of them is touched in V1–V3 (§8).
- **Keys in use:** RMMZ defaults, plus W A S D and the arrows (Overseer), `-` `=` (Camera), `[` `]` Space (TimeSpeed), K (Combat), F (Factions), I (Gumps), H (History). **Free: `,` (188), `.` (190), Home (36).**
- **Harness:** `UF_Test` always starts a New Game (`UF_Test.js:167-171`) and has a 180 s watchdog for the whole run (L196). There is no fixed-seed option (`grep seed` finds none). Provocations use `UF_TEST_PROVOKE=<suite>.<check>` (`UF_World.js:666-676`, UF_Ownership, UF_Walls).
- **Autosave:** `System.json` `optAutosave` is true, and `Scene_Map.onTransferEnd` autosaves after every transfer (`rmmz_scenes.js:807-817`). Left alone, **every level switch would write an autosave** (§12, decision needed).

### 1.3 The underground layer of 2026-09-18 (`8e10921`, removed in `6b27d9f`)
Read with `git show 6b27d9f^:game/js/plugins/UF_World.js` and `…UF_WorldGen.js`, plus `d095051` (handoff and requests).

| Old piece | Reuse in V1–V3 |
|---|---|
| Areas `{x,y,z}`, `zOf = a => a.z \|\| 0`, `areaMapId(ax,ay,az) = base + az*perLayer + …`, `areaOfMapId` returning z | **Reused as the map-id idea (D4).** Not reused as "z inside `unit.area`". The contract puts z beside the area, and the fail-closed rule (D2) needs the legacy `areaOfMapId` to stay ground-only. |
| `buildArea(ax,ay,az)`, with a separate generator for `areaZ > 0` (`generateUnderground`) | **Reused as a pattern.** `registerGenerator(…, { levels })` keeps every existing generator ground-only. |
| `caveOpenAt(gx,gy,z)`: value noise, blob > threshold, or a thin "tunnel" band; catalog `caveScale 28`, `caveThreshold 0.58`, `tunnelWidth 0.035` | **Reused as the V1 graybox cave noise** for −1 and −2 (§5.6). |
| `connectionsFor(ax,ay)`: seeded dry-land cells away from the start, one about 16 cells from it, 24 cells apart, with a chamber of radius 3 below | **Reused for the V2 descent networks** (§6.2), with conflict checks against units, sites and objects. |
| Region 250 = rock (blocks), 251 = connection (always passable), via a `Game_Map.isPassable` alias | **Dropped.** An `isPassable` alias doesn't reach the off-screen planner. Tile flags do (D3). |
| Keys `,` = up and `.` = down (`Input.keyMapper[188/190]`) | **Reused**, with DF's `<` / `>` on the same keys (Shift doesn't change the keyCode). |
| `layerTarget(u)`: walk to the *nearest* connection, then change layer | **Replaced** by a route over the connector graph (§6.3). The nearest shaft may not lead anywhere. |
| Fog key `area:x,y,z` for z ≠ 0 | **Reused** (§5.2, UF_Fog, one line). |
| Stock tiles: Dungeon A2 3200 cave floor, Dungeon A4 5936 rock top, Dungeon A5 1549 stairs, Outside B 42 ladder hole | **Reused and extended** in §3.3. |
| Withdrawn requests AR-040 to AR-043 (cave floor, rock, cave mouth, way up) | Their specs are the starting point for the new rows (§10). |

---

## 2. Data model

### 2.1 Coordinates and handles
```text
CellRef   = { area: { x, y }, x, y, z }          // stored records (VW §3.1)
LevelArea = { x, y, z }                           // API handle: "the grid of area (x,y) at level z"; missing z = 0
LEVELS    = [-2, -1, 0, 1, 2]                     // isLevel(z): Number.isInteger(z) && -2 <= z <= 2
levelKey(ax, ay, z) = z === 0 ? `${ax},${ay}` : `${ax},${ay},${z}`   // ground key = the pre-V80 areaKey
labels    = { 2: "+2", 1: "+1", 0: "Ground", -1: "-1", -2: "-2" }  // player-visible text (VERTICAL_WORLD §1)
```

### 2.2 Saved state (`UF.World.state`, version 4; the values are illustrative)
```json
{
  "version": 4,
  "view": { "x": 128, "y": 128, "z": 0 },
  "levels": {
    "-2": { "z": -2, "gen": 1, "checksum": "9f31c2aa", "cells": {}, "descents": [] },
    "-1": { "z": -1, "gen": 1, "checksum": "…", "cells": { "0,0": { "30092": 5, "30091": 2, "30093": 2 } }, "descents": [{ "x": 140, "y": 117 }] },
    "0":  { "z": 0,  "gen": 1, "checksum": "…", "cells": { "0,0": { "30092": 6 } }, "descents": [{ "x": 140, "y": 117 }, { "x": 71, "y": 190 }] },
    "1":  { "z": 1,  "gen": 1, "checksum": "…", "cells": { "0,0": { "33400": 26, "33401": 26 } }, "descents": [] },
    "2":  { "z": 2,  "gen": 1, "checksum": "…", "cells": {}, "descents": [] }
  },
  "collapse": [ { "z": 1, "cells": [33400, 33401], "due": 125044 } ],
  "migrations": [ { "from": 3, "to": 4, "rule": "V80", "units": 214, "items": 88, "jobs": 12, "conflicts": [] } ],
  "diffs":       { "0,0": { "…": 2863 } },
  "objectDiffs": { "0,0": { "…": 7 }, "0,0,1": { "33401": 55 } },
  "units": { "17": { "area": { "x": 0, "y": 0 }, "x": 140, "y": 118, "z": -1, "goal": null, "levelGoal": null } },
  "items": { "byId": { "9": { "area": { "x": 0, "y": 0 }, "x": 140, "y": 119, "z": -1 } } },
  "jobs":  { "list": [ { "target": { "area": { "x": 0, "y": 0 }, "x": 141, "y": 119, "z": -1 }, "stand": { "area": { "x": 0, "y": 0 }, "x": 140, "y": 119, "z": -1 } } ] },
  "regrow": [ { "area": { "x": 0, "y": 0 }, "x": 90, "y": 91, "z": 0, "from": 12, "to": 11, "due": 5021 } ]
}
```
- `levels[z].cells[areaKey][cellIndex] = packed` holds the sparse changes against the baseline (§2.3). In the example, cell 30092 = (140, 117): a natural stair down on the ground (6) over a natural stair up on −1 (5) with chamber floor (2) beside it; 26 = a built wood floor on +1 (2 + 8 + 1 × 16), and object 55 (a wall) stands on one of them. `gen` is the generator version of that level's baseline (RESOURCE_ATLAS §9: never reshuffle an existing save). `checksum` is the FNV-1a hash of the baseline, computed at New Game and compared on load.
- Baselines are **not** saved. They are regenerated from `seed` and `gen` into runtime arrays.
- `diffs` and `objectDiffs` keep their existing roles, keyed by `levelKey`. Level terrain tiles are **derived**, so they never appear in `diffs` (§3.5).
- `fog` (UF_Fog) keeps `area:x,y` for the ground and adds `area:x,y,z` for the other levels.

### 2.3 Shape codes and packed changes
| code | shape | walkable | notes |
|---:|---|---|---|
| 1 | `solid` | no | natural rock (V1–V3; constructed walls are wall **objects**, see §7.1) |
| 2 | `floor` | yes | natural cave floor, the ground surface, or a built floor |
| 3 | `open` | no | air or a hole; items and units in it fall (V3) |
| 4 | `ramp` | yes | lower end of a ramp pair (§6.1) |
| 5 | `stairUp` | yes | pairs with `stairDown`/`stairBoth` at z+1 |
| 6 | `stairDown` | yes | pairs with `stairUp`/`stairBoth` at z−1 |
| 7 | `stairBoth` | yes | both of the above |

`packed = shape | (constructed ? 8 : 0) | (material << 4)`. `material` is an index into the catalog `levels.materials` list (V1: 0 = generic stone, 1 = wood).

The ground's baseline shape is `floor` everywhere, except cells whose ground kind is impassable (`peak_rock`, from `cellInfo(...).peak`), which count as `solid` for ramp leaning. Ground passability itself stays with the ground tiles.

### 2.4 Runtime only (not saved)
- `baselines: Map<"seed:gen:z", { shape: Uint8Array(65536), material: Uint8Array(65536) }>`
- `connectors[z]`: a list of connector ends with their region labels and version (V2)
- `routes: Map<unitId, { legs, version }>` (V2), rebuilt from `unit.levelGoal` after a load
- `reservations: Map<"levelKey|cell", jobId>` (V2/V3), rebuilt from active jobs on load

---

## 3. Materializing a level as an RMMZ map

### 3.1 Map ids
`areaMapId(ax, ay, z) = MapIdBase + SLOT[z] * (areasX * areasY) + ay * areasX + ax`, with `SLOT = { 0:0, 1:1, 2:2, -1:3, -2:4 }`.
With one area this gives **1000 = Ground (unchanged), 1001 = +1, 1002 = +2, 1003 = −1, 1004 = −2**. All are above every editor map id (UF_World parameter note, L36). `levelOfMapId(id)` inverts it. `areaOfMapId(id)` keeps returning the ground area only (D2).

### 3.2 Tilesets
- **Ground (z 0):** tileset 91 from UF_Tiles, unchanged. Connectors and holes on the ground are drawn as **Outside_B tiles on map layer 2**. Layer 2 is unused on ground maps: WorldGen and Roads write layers 0 and 5 only (`grep setTile`). UF_Levels patches **one flag** in `$dataTilesets[91]` after UF_Tiles registers it: B 44 "Hole D" becomes `0x0f` (impassable) so a ground `open` cell blocks walkers. No ground generator writes B tiles into the map (objects drawn with Outside_B art are sprites, not map tiles).
- **Levels (z ≠ 0):** in-memory tileset **92** "UF Levels (runtime)", registered by UF_Levels in `DataManager.onLoad` and `Scene_Boot.start` after UF_Tiles. `tilesetNames = ["Dungeon_A1","Dungeon_A2","","Dungeon_A4","Dungeon_A5","Outside_B","Dungeon_C","",""]`, mode 1. Flags are copied from editor tileset 4 (Dungeon) for A1–A5 and C, and from tileset 2 (Outside) for B (ids 0–255). One override: the A4 kind "Wall B (Rock Cave)" top, ids 5936–5983, becomes `0x0f`. The editor ships it as passable `0xe00`, which the old layer fixed with region 250. The sheet names come from the catalog (`levels.tileset`), so art can replace them without code.

### 3.3 Graybox tiles (stock RMMZ, V9)
Names and flags were read from `game/img/tilesets/*.txt` and `game/data/Tilesets.json` on 2026-09-19. "[f]" means impassable in the tileset flags; "auto" means an autotile whose shape comes from its neighbours (`UF.WorldGen.autotileShape`).

| Shape | −1 | −2 | +1 / +2 | Ground (tileset 91) |
|---|---|---|---|---|
| `solid` | L0 A4 **5936** Wall B (Rock Cave) top, auto, [f] after the override | same | not generated in V1–V3 | (peak-rock ground kind, unchanged) |
| `floor`, natural | L0 A2 **3200** Ground C (Rock Cave), auto | L0 A2 **3296** Dark Ground C (Rock Cave), auto | not generated | ground kind, unchanged |
| `floor`, built | L0 A5 **1552** Ground A (Wood) | same | same | (none: ground floors belong to UF_Floors) |
| `open` | L0 A2 **3392** Hole C (Rock Cave), auto, [f] | same | L0 A5 **1536** Darkness [f] (air) | L2 B **44** Hole D ([f] after the patch) |
| `stairUp` | floor + L2 B **1** Stairs A (Up) | same | L0 1552 + L2 B 1 | L2 B 1 |
| `stairDown` | floor + L2 B **9** Stairs A (Down) | same | L0 1552 + L2 B 9 | L2 B 9 |
| `stairBoth` | floor + L2 B **42** Hole B (Wood Ladder) | same | L0 1552 + L2 B 42 | L2 B 42 |
| `ramp` | L0 A5 **1581** Stairs B (Rock Cave, Center) | same | (built ramps: not in V1–V3) | L2 B **2** Stairs B (Up) |

The ids live in the catalog (`levels.tiles`, §7.2), and every stock asset gets a replacement request (§10). Using Outside_B stairs on every level makes a stair look the same above and below.

### 3.4 Build path
1. `DataManager.loadMapData(id)` (UF_World seam S24): `lv = levelOfMapId(id)`. If a peek build of `(lv.x, lv.y, lv.z)` is cached, **reuse that object**: its unit events are replaced with fresh ones for the units on that level (S12, `refreshUnitEvents`). Otherwise `buildArea(lv.x, lv.y, lv.z)`. Before the new map replaces `$dataMap`, the outgoing on-screen build is handed to the peek cache (`adoptBuild`), so off-screen planning on the level just left doesn't rebuild it. For the ground this avoids a full WorldGen build (up to the V50 1.5 s) on every return from a level. The event sent is `world:areaBuilt` for z 0 (Doors' listener is idempotent, `UF_Doors.js:396-399`) and `world:levelBuilt(lv)` otherwise.
2. `buildArea(ax, ay, z)` for z ≠ 0 runs only the generators registered with `{ levels: [z] }`. UF_Levels registers `uf_levels_terrain` (order 5), which paints layers 0 and 2 from `shapeAt` (baseline plus changes) with autotiles and sets `map.tilesetId = 92`. The template overlay applies only at z 0. Object diffs are applied from `objectDiffs[levelKey]`, and unit events come from `unitsInArea(ax, ay, z)`.
3. For z 0, UF_Levels registers `uf_levels_ground` at order 950 (after WorldGen at 10 and Roads), `{ levels: [0] }`. It stamps layer 2 for the ground's shape changes (stairs, holes, ramps) only.
4. `Game_Map.setup` (S25) pre-builds the walk grid for every world map id and then calls `World.reconcileEvents()`. That spawns an event for any displayed unit that has none, for example a unit that changed level during the transfer frame.

### 3.5 Live changes
`UF.Levels.setShape(ref, shape, opts)` writes `levels[z].cells`. It then re-derives the tile of the cell and its 8 neighbours (autotile shapes), patches them through `World.setDerivedTile(ax, ay, x, y, layer, tileId, z)` (seam S8: `setTile` without writing a diff), and emits `levels:shapeChanged(ref, from, to)`. If a connector appeared or disappeared, it also emits `levels:connectorsChanged(z)`. `setDerivedTile` calls UF_World's `pathCellChanged`, so walk grids and region maps update the same way they do for any `setTile`.

---

## 4. What lives where

| Concern | Where |
|---|---|
| z in map ids, builds, caches, diffs, cell tests, units, events, stepping (the "z seam") | `UF_World.js`: the S1–S26 edits in §5.2, all defaulting to z 0 |
| z in object grids, regrow, object events | `UF_Objects.js` z pass (§5.2) |
| z in the ground-item index and item sprites | `UF_Items.js` z pass (§5.2) |
| z in job targets, stands, standability, sending | `UF_Jobs.js` z pass (V1 minimal, V2 cross-level `take`) |
| Tooltip on levels | `UF_Look.js` (2 hooks) |
| Options, markers and designations on levels | `UF_Interact.js` (4 hooks). Level designations come from UF_Levels wrapping `UF.Interact.optionsFor`, the way Floors, Doors and Fire do (`UF_Floors.js:380-381`). |
| Fog store key per level | `UF_Fog.js` L68 (one line) |
| **Everything else** | **`UF_Levels.js` (new):** level registry and migration; baseline generators and checksums; shape API; tileset 92 and the flag patch on 91; terrain generators; view switching, keys, HUD, follow; connector graph and routes; the `World.sendUnit` wrapper and connector hops; V68 at arrival; job types `excavate`, `channel`, `carve`, `construct`; reservations; support and collapse; falls; the guard around `UF.Combat.engage`; checks |

UF_Levels header: `@base UF_World`, `@orderAfter` UF_World, UF_WorldGen, UF_Tiles, UF_Objects, UF_Items, UF_Jobs, UF_Look, UF_Interact, UF_Fire. It is registered last before UF_Test (§9). If it grows past about 2500 lines, V3's jobs and support move to `UF_LevelWorks.js`, registered after it.

---

## 5. Slice V1: state, migration, level switching, graybox

**In:** z on every record; five seeded baselines generated and checksummed at New Game; saves and migration; one map per level with graybox tiles; switching the view with keys and a HUD; per-level off-screen movement; the fail-closed legacy API.
**Out (later slices):** stairs, ramps and routes (V2); digging and building (V3); geology content (slice 4, RESOURCE_ATLAS); light, liquids, falls through open cells except the V3 ones.

### 5.1 The fail-closed rule, stated once
While a level other than the ground is on screen:
- `World.currentArea() === null`, `World.isAreaMap(1003) === false`, and `World.viewLevel()` = `{x:0, y:0, z:-1}`.
- `World.unitsInArea(0, 0)` returns ground units only. `unitsInArea(0, 0, -1)` returns −1 units.
- Object and tile changes on z ≠ 0 fire `world:levelObjectChanged`, `world:levelTileChanged` and `objects:levelChanged`, never the ground event names.
- A z-blind plugin that sends a unit with no `z` sends it to the ground. A z-blind plugin that looks up objects or items with a `{x,y}` area gets the ground.

### 5.2 Changes per file

**`UF_World.js`: the z seam.** Every change keeps z-0 behaviour identical. The `world`, `spawn` and path checks must pass unchanged before and after.

| # | Where | Change |
|---|---|---|
| S1 | helpers L134-136 | add `zOf = o => (o && o.z) \| 0`, `isLevel(z)`, `SLOT`, `levelKey(ax, ay, z)` |
| S2 | `inWorld` L309 | `(ax, ay, z = 0)`, adding `&& isLevel(z)`: rejects a sixth level everywhere `inWorld` is used (L1242, L929, L948, L1629) |
| S3 | `areaMapId` L311 | `(ax, ay, z = 0)`, using §3.1; returns 0 for a non-level z |
| S4 | after L319 | new `levelOfMapId(mapId)`, `isWorldMap(mapId)`, `viewLevel()`. `areaOfMapId`, `isAreaMap` and `currentArea` **stay as they are**: they now mean the ground (D2) |
| S5 | `registerGenerator` L337 | 4th parameter `opts`; `levels: opts.levels \|\| [0]` stored on the entry |
| S6 | `buildArea` L373 | `(ax, ay, z = 0)`: generators filtered by `levels.includes(z)` (L423); `tpl` only when z 0 (L381); `ctx.z`; `map.ufArea = {x, y, z}` (L396; no reader outside this line); diff keys `levelKey` (L455, L457); `unitsInArea(ax, ay, z)` (L460) |
| S7 | `setTile` L465 | trailing `z = 0`: `levelKey` (L469); on-screen test "the view level is (ax, ay, z)" (L471); cache key with z (L477); `world:tileChanged` only for z 0, else `world:levelTileChanged` (L482) |
| S8 | new | `setDerivedTile(ax, ay, x, y, layer, tileId, z)`: S7 without writing `state.diffs` |
| S9 | `getTile` L487 | trailing `z = 0`: `levelKey`, the view-level test, `peekArea(ax, ay, z)` |
| S10 | `setObject` L502 | trailing `z = 0`: `standerAt(…, z)` (L505); `levelKey` (L520); view-level test (L523); cache key (L527); `world:objectChanged` only for z 0, else `world:levelObjectChanged` (L532) |
| S11 | `getObject` L536 | trailing `z = 0` |
| S12 | peek cache L546-560 | `cacheKey(ax, ay, z)`; `peekArea(ax, ay, z = 0)`, moving a hit to the end of the Map so recently used builds survive eviction; new `adoptBuild(ax, ay, z, map)` and `refreshUnitEvents(map, ax, ay, z)` (for §3.4) |
| S13 | V68 guard L617-744 | `cellFree(ax, ay, x, y, ignoreUnitId = 0, z = 0)`: on-screen test through `areaMapId(ax, ay, z)` (L620), `peekArea(…, z)` (L625), `UF.Objects.blocksIn({x: ax, y: ay, z}, …)` (L637), `zOf(u) === z` in the unit loop (L640). Also `nearestFreeCell(…, ignoreUnitId, z)` L644, `seatCell(…, ignoreId, z)` L693 (its `walkable` call L710 and the `other` lookup L714), `spawnCellFor(…, name, z)` L725, and `standerAt(ax, ay, x, y, z = 0)` L735/L744 |
| S14 | `holdOccupiedRegrowth` L749 | `getObject(…, zOf(e))`, `standerAt(…, zOf(e))` |
| S15 | `addUnit` L797 | `spec.z` (default 0; **throws** for a non-level z); `seatCell` with z; `u.z = z` |
| S16 | `unitsInArea` L837 | `(ax, ay, z = 0)`, filtering `zOf(u) === z` |
| S17 | `sendUnit` L852 | the stored goal gets `z` (default 0); `same` compares z; **returns false when the goal's z ≠ the unit's z** (only UF_Levels' wrapper moves units between levels) |
| S18 | `isDisplayed` L867 | true when `viewLevel()` has the unit's area and `zOf(u)` |
| S19 | beside `moveUnitToArea` L911 | new `moveUnitToLevel(u, z, x, y)`: forget the path; despawn the event if displayed; set `u.z`, x, y; spawn the event if now displayed and no transfer is pending; emit `world:unitLevelChanged(u, fromZ, toZ)` |
| S20 | `stepOffscreen` L925 | **D6.** For walkers (not `data.through`, paths enabled), a new `stepOffscreenAlongPath(u)` does the same as `stepAlongPath` (L1476) with `u.x/u.y` in place of the event. It plans through `planFor(u, pos)` (L1412, which takes a position instead of an event), waits and detours round a stander (per-level occupancy built once per off-screen tick), and moves one cell per step. `servePlanQueue` (L1444) serves off-screen units too. Off-screen steps are staggered: `(this._frame + u.id) % unitStepFrames === 0` in place of the single `offscreenTick` (L990), so 400 units don't all step on one frame. Fliers keep the straight step. |
| S21 | `World.update` L984-1003 | `const view = this.viewLevel()`; a unit is on screen when `view` has its area and z (L992) |
| S22 | planner L1101-1590 | `areaMapOf(ax, ay, z = 0)` (L1101-1108); `planPath` takes z from `opts.z ?? zOf(area)` (L1242-1245); `localTarget` key includes z (L1390); `stepOpen` uses `zOf(u)` (L1461); `findPath` (area.z or opts.z), `walkable` (opts.z), `reachable` (area.z). New `regionAt(ax, ay, x, y, z)` and `gridVersion(ax, ay, z)` (a counter bumped in `pathCellChanged` L1133 when an `eff` value changes) for the connector graph |
| S23 | view L1615-1651 | `transferView(ax, ay, x, y, dir, z = view z)`; `tryViewEdge` keeps the view's z. `performTransfer` is unchanged (it emits the ground-only `world:viewAreaChanged`) |
| S24 | `loadMapData` L1661 | `levelOfMapId`; reuse or build (§3.4); the event is `world:areaBuilt` for z 0 and `world:levelBuilt` otherwise |
| S25 | `Game_Map.setup` L1725 | `isWorldMap(mapId)`; then `reconcileEvents()` |
| S26 | check `one_layer` L2485 | replaced by `level_ids`: ground id = MapIdBase; five distinct ids that `levelOfMapId` round-trips; `areaOfMapId(1003) === null`; `inWorld(0, 0, 3) === false` |

`newWorld` L235 is left alone. UF_Levels adds `levels`, `view` and `version: 4` in its `world:created` listener (§5.5).

**`UF_Objects.js` z pass**
- L55: add `zOf` and `lv(area)`.
- `gridOf` L95: use the screen map when `W.viewLevel()` matches the area **and** z, otherwise `W.peekArea(area.x, area.y, zOf(area))`.
- `typeIdIn` L106: `W.getObject(…, zOf(area))`.
- Regrow L134-160: entries get `z`; the de-duplication compares z; `processRegrow` uses `lv(e)`.
- `setIn` L165: z on `getObject`/`setObject`. `objects:changed` fires only for z 0, `objects:levelChanged(levelArea, x, y, fromId, toId)` otherwise.
- `applyIn` L185: `UF.Items.drop(lv(area), …)`; the result carries `z`.
- On-screen API L665-697: `currentArea()` → `W.viewLevel()`.
- Listener L734: also listen to `world:levelObjectChanged`; mark the layer dirty when the changed level is the one on screen.
- `findIn`, `describeIn` and `blocksIn` become z-aware through `gridOf` and `typeIdIn`.

**`UF_Items.js` z pass**
- `areaKey` L51 includes z when it isn't 0. `currentArea` L53 → `W.viewLevel()` for the on-screen helpers (`at` L250, `find` default L258, `count` default L389, `describe` L401, layer L474).
- Index L96-121: keyed by `{x: item.area.x, y: item.area.y, z: item.z | 0}`.
- `placeOnCell` L152 sets `item.z = zOf(area)`.
- `create` L203 reads `at.z ?? at.area.z`.
- Unit-removed drop L409-412 uses the unit's LevelArea.
- New `Items.moveTo(itemId, levelArea, x, y)` (used by falls in V3).

**`UF_Jobs.js` z pass (V1 part)**
- L66-67: add `zOf`, `lv(ref)` and `copyRef(ref)` (keeps z).
- `isWaterIn` L90: on screen through the view level; z 0 off screen unchanged; z ≠ 0 reads `W.getTile(…, 0, z)`.
- `occupiedIn` L104: `unitsInArea(…, z)`; screen events only for the level on screen.
- `standableIn` L117: z 0 off screen keeps `cellInfoLocal`, plus `UF.Levels.standableShape(ref)` so a ground hole or stair diff counts; z ≠ 0 uses `W.walkable(ax, ay, x, y, { z })` and `!blocksIn`.
- `unitDistance` L139: adds `|dz| × levels.route.levelCost`.
- `standFor` L148 and `atCell` L165 compare z.
- `create` L583: `target.z` comes from `target.z`, else `target.area.z`, else (no area) the view level, else 0. Targets built from records copy that record's z (item L270, `params.to` L299, unit L375/L380, prey L456/L473, other L543, partner L564, owner L591).
- Every handler call that passes `job.target.area` passes `lv(job.target)` (L189-564).
- `plan` L686 stores `copyRef(stand)`.
- `step` L859 sends `{…, z: zOf(stand)}` and compares against `unit.levelGoal || unit.goal` with z. The stall key L862 includes z.

**`UF_Look.js`**
- L310: gate on `W.viewLevel()`.
- `cellAt` L251: when the view's z ≠ 0, return `{ text: UF.Levels.describeCell(ref) }`, for example `"-1 · Cave floor"`, `"+1 · Open air"`, `"-1 · Rock"`. At z 0, append the shape text of a ground change (for example `"Stairs down to -1"`, used from V2).

**`UF_Interact.js`**
- `designationsAt` L275: the default area is the view level; filter by z too.
- `optionsFor` L431: `area = W.viewLevel()`; `target` carries z; ground-only options (dig, fish, and the Floors and Doors wraps, which check `currentArea()` themselves) appear only at z 0.
- Marker sync L773-788: filter designations to the level on screen. `setType(job.params.markerAs || job.type)` so new job types can reuse existing glyphs.
- `dismantle` apply L139-147: `lv(job.target)`.

**`UF_Fog.js`** L68: `const lv = W.levelOfMapId && W.levelOfMapId(mapId); if (lv && lv.z) return \`area:${lv.x},${lv.y},${lv.z}\`;`. The ground key is unchanged, so pre-V80 fog carries over. Fog observers per level wait for the discovery work (§13); fog is off for development.

**`UF_Camera.js`, `UF_Tiles.js`:** no change (§1.2).

**`UF_Levels.js` (V1 part):**
- Registry, baselines and checksums (§5.6); shape API; tileset 92 and the B 44 patch on 91; terrain generators (§3.4).
- View switching (§5.3); off-screen hygiene (§5.4); migration (§5.5).
- The `UF.Combat.engage` guard: refuses when attacker and target are on different levels. The call is public (`UF_Combat.js:701`) and is also used internally through `Combat.engage` (L794), so the wrap covers both.
- Suites `vertical`, `vertical_migration`, `vertical_budget`.

### 5.3 Switching the view
- **Keys:** `Input.keyMapper[188] = "ufLevelUp"` (`,` and `<`), `[190] = "ufLevelDown"` (`.` and `>`), `[36] = "ufLevelGround"` (Home). Up means z+1.
- **Handler:** in a `Scene_Map.update` alias, only when the scene is active, no message or event is running, no transfer is pending, `UF.Talk` isn't open, and no busy window is up (the same test as TimeSpeed's `canTogglePause`).
- **`UF.Levels.setView(z)`:**
  1. Record `$gamePlayer.x/y` (the cursor), `$gameMap.displayX/Y` and `UF.Camera.level()`.
  2. `World.transferView(ax, ay, px, py, dir, z)` with fade type 2 (none).
  3. When the new `Scene_Map` has started, restore the display position (performTransfer centres on the player, but UF's camera is free).
  4. Write `state.view = {x, y, z}` and emit `levels:viewChanged(fromZ, toZ)`.
  - The zoom persists by itself.
- **HUD:** a pooled text sprite at top centre, `"Ground · z 0  (< >)"` / `"-1 · z -1"`. It is drawn in code (no Bitmap per frame; it redraws only when z changes) and replaced by art later (§10). Only the words "+2", "+1", "Ground", "-1" and "-2" are shown.
- **Follow mode (V2):** see §6.6. In V1 the follow adapter just loses its event when the followed unit is on another level, which is the current behaviour.
- **Autosave:** see §12 D-3.

### 5.4 Off-screen simulation per level (V1)
- **Units:** S20 path following on their own level, staggered steps, V68 waiting.
- **Jobs:** `UF_Jobs.update` already advances every job regardless of the screen (L890-910). With the z pass, stand cells and standability are correct per level.
- **Objects:** regrowth runs from `time:hour` for every entry, now z-aware.
- **View-dependent plugins** pause while the ground isn't on screen. Wildlife's `tick` returns when `!currentArea()` (`UF_Wildlife.js:1072`) and Combat's `runTick` does the same (`UF_Combat.js:889`). That is the fail-closed behaviour: they don't corrupt anything, but ground creatures stop deciding while the player looks at −1. The exact fixes are §8 owner changes, and it's recorded in STATUS as a known problem until they land.
- **Cost:** no per-cell scans. The per-frame work is `World.update`'s unit loop, one plan budget shared by on- and off-screen units, and the region rebuild after a change (UF_World's existing numbers).

### 5.5 Save migration (pre-V80 to version 4)
UF_Levels wraps `DataManager.extractSaveContents`. It runs after UF_World's wrapper (L1714), which set `World.state` and cleared caches, and after UF_Jobs' (`UF_Jobs.js:947-948`).
1. If `st.version >= 4 && st.levels`: regenerate the baselines for each level's `gen` and compare checksums. A mismatch is logged (`console.warn` plus `st.levels[z].checksumMismatch = true`) and never "fixed" silently.
2. Else (version 3 or missing): `UF.Levels.migrate(st)` writes:
   - `u.z = 0`, `u.levelGoal = null`, `u.goal.z = 0` on every unit;
   - `item.z = 0` on every ground item;
   - `job.target.z = 0` and `job.stand.z = 0` on every job;
   - `e.z = 0` on every regrow entry;
   - `st.levels` with five entries and empty `cells`;
   - `st.view = {x: $gamePlayer.x, y: $gamePlayer.y, z: 0}` (`$gamePlayer` has been extracted by then);
   - `st.version = 4`;
   - `st.migrations.push({from: 3, to: 4, rule: "V80", counts, conflicts: []})`.
3. `diffs`, `objectDiffs` and `fog` keys aren't touched: ground keys are the old keys.
4. No entity is moved. The V2 descent networks are placed later, at the first ground build (§6.2), under the same conflict rules as a New Game, and anything skipped is logged in `st.migrations[i].conflicts`.
5. `$gameMap.mapId()` is 1000 in every pre-V80 save, so the loaded map is the ground as before.

### 5.6 Baselines at New Game (VW §4.1 steps 1–5, graybox content)
- **When:** in UF_Levels' `world:created` listener, registered at boot so it runs after every other listener (Colonists hooks at boot too, `UF_Colonists.js:1505-1507`). It generates all four non-ground baselines **before the first playable frame** (RESOURCE_ATLAS §2), stores their checksums, and stores the ground checksum.
- **Ground checksum:** FNV-1a over `WorldGen.cellInfo(gx, gy)` → (ground kind, water, peak) on a 32 × 32 lattice (1024 cells). That verifies the ground generator without building the map. The full ground is built right after anyway by the first transfer.
- **+1, +2:** every cell `open`.
- **−1:** `solid`, except cells where `caveOpen(z)` holds, which are `floor` (natural). `caveOpen(z) = blob > caveThreshold || |tunnel − 0.5| < tunnelWidth`, using `UF.WorldGen.valueNoise(seed, salt, gx, gy, scale)` with the old layer's formula (`6b27d9f^:UF_WorldGen.js` `caveOpenAt`). Catalog values are 28 / 0.58 / 0.035. A 2-cell border is kept `solid`.
- **−2:** the same formula with its own salt and 44 / 0.56 / 0.03 (bigger caverns).
- **Salts:** `hashString("uf.levels.caves.<z>")`, `…tunnel.<z>`, `…descent`, `…deep`. These are derived names, so they can't collide with WorldGen's `SALT` constants (`UF_WorldGen.js:52`).
- **Material:** 0 (generic stone) everywhere in V1. Geology is slice 4, which bumps `gen` to 2 while v1 saves keep generator 1 (§12 D-4).
- **Cost:** 4 × 65 536 noise samples. Target ≤ 300 ms, measured in `vertical_budget` (§11).

### 5.7 Checks (suite `vertical`, plus `vertical_migration` and `vertical_budget` on request)
Each check follows ENGINE_RULES §6. Each has a provocation through `UF_TEST_PROVOKE=vertical.<check>`, read only in `--uf-test` runs (the `UF_World.js:666-676` pattern). The provoked FAIL line is quoted in the report of the implementing run. Fixtures are built in place, because the harness has no fixed seed, and removed afterwards.

| Check | Required observation | How it is provoked to FAIL |
|---|---|---|
| `vertical.five_levels` (VW §11) | `UF.Levels.LEVELS` is [−2…2]; `state.levels` has exactly those five keys; each non-ground baseline is a 65 536-byte array whose fresh regeneration equals the stored checksum; the ground lattice checksum is stored. A sixth level is rejected everywhere: `inWorld(0,0,3)` false, `areaMapId(0,0,3)` 0, `setObject(…,3)` false, `setShape(z 3)` false, `addUnit({z:3})` throws; `levelOfMapId(areaMapId(0,0,z)).z === z` for all five; ground id 1000 | `vertical.five_levels` makes `isLevel` accept 3, so the refusals fail |
| `vertical.surface_migration` (VW §11), synthetic | Take `JsonEx.parse(JsonEx.stringify(DataManager.makeSaveContents()))`, strip the V80 fields (levels, view, version 3, every z), run `UF.Levels.migrate` on the copy. Every unit, item and job keeps its id, area and x,y and has z 0; `diffs`, `objectDiffs` and `fog` are deep-equal; five level entries exist; one migration record; nothing has z ≠ 0 | `vertical.surface_migration` makes `migrate` put the first unit at z −1 |
| `vertical.surface_migration_real` (suite `vertical_migration`) | Uses a real pre-V80 save: a copy of `game/save/file0.rmmzsave` (the 2026-09-19 12:21 autosave, made with the pre-V80 build), copied into the snapshot's `save/` as slot 19 plus a pristine copy. The suite calls `DataManager.loadGame(19)`, transfers as `Scene_Load` does, and compares the loaded state with the pristine copy decoded by `StorageManager.zipToJson`: unit, item and job ids and cells equal; `mapId` 1000; the ground tile layer-0 hash of the built map equals a fresh build of the unmigrated state | same provocation. **The fixture must be taken before UF_Levels is registered in `game/`**, while the autosave is still pre-V80 |
| `vertical.persistence` (VW §11) | On each of the five levels, place one shape change, one object (`UF.Objects.setIn({x,y,z}, …)`), one item and one unit. Then run `makeSaveContents` → JsonEx round trip → `extractSaveContents` → map reload. Every fixture is at its own level and at no other. Regenerating all five baselines from `state.seed` gives the stored checksums, and seed + 1 gives a different −1 checksum (so the checksum can differ) | `vertical.persistence` drops `levels["-1"].cells` from the saved copy |
| `vertical.switch_view` (VW §11, screenshot) | Setup: unit A on the ground at (c), unit B on −1 at (c+1) on a fixture floor, one object and one item on each level. Press level down by setting `Input._currentState.ufLevelDown` for one frame, so RMMZ's `Input.update` turns it into a trigger (said so in the detail). After the transfer: `mapId` 1003; `$gamePlayer` x,y unchanged; display within 0.01 cell; zoom unchanged; B's event exists and its sprite has loaded, is visible and on screen with opaque pixels; A has no event and no `Sprite_Character`; the object and item sprites appear only for the −1 fixtures; `Look.describeCell` at A's cell doesn't name A; `Interact.optionsFor` at the ground object's cell doesn't offer it; the HUD reads "-1". Then level up, with the mirror checks. Screenshot `vertical.switch_view.png` | `vertical.switch_view` makes S6 add events for units on every level, so A's event exists on −1 |
| `vertical.no_ground_leak` | With the view on −1: `currentArea()` null; `unitsInArea(0,0)` has A and not B; `Objects.findIn({x:0,y:0})` and `Items.find({area:{x:0,y:0}})` exclude the −1 fixtures; a −1 object change fires `objects:levelChanged` and zero `objects:changed`; `UF.Combat.engage(A, B)` is false while `engage(A, A2)` on the ground is true | `vertical.no_ground_leak` makes UF_Objects fire `objects:changed` for z ≠ 0 |
| `vertical.offscreen_paths` (VW §11 `offscreen_sim`, V1 part) | View on the ground. Unit C on −1 in a fixture L-shaped corridor is sent 20 cells round the bend (the straight line crosses rock). Each frame C never stands on a `solid` cell, and it arrives within 2 × (steps × 16) frames. Ground unit D walks round a wall ring while the view is on −1 (so D is off-screen) and never enters a wall cell. A save and load mid-walk (JsonEx round trip) leaves C arriving at the same cell | `vertical.offscreen_paths` restores the straight step in S20 |
| `level_ids` (world suite, replaces `one_layer`) | see S26 | `world.level_ids` switches `SLOT[-1]` to 1, colliding with +1. UF_World's provocation reader (L668-676) accepts only `spawn.*` today; the seam extends it to `world.*` |
| `vertical.budgets` (suite `vertical_budget`, V1 part) | Measured and printed with the method: baseline generation (ms, 4 levels); first switch ground → −1 (ms and frames from key to `isStarted`); a warm switch −1 → ground → −1; level build ms; save length (`JsonEx.stringify(makeSaveContents()).length`); `World.update` average and worst over 30 s with the view on −1 (all ground units off-screen); frame time average and worst over 30 s on −1 at zoom ⅓, with the unit count. Pass: generation ≤ 300 ms (proposal); cold switch ≤ 1500 ms (the V50 map-build budget); warm switch ≤ 250 ms (proposal); save ≤ 3 MB (V50); `World.update` ≤ 1 ms average (V50 per plugin) | `vertical.budgets` adds a 2000 ms busy wait in the level build |

The regression suites run unchanged on the same snapshot: `smoke`, `world`, `spawn`, `objects`, `items`, `jobs`, `look`, `interact`, `colonists`, `tiles`, `camera`.

### 5.8 How V1 is run (task environment)
```text
"C:\Program Files\nodejs\node.exe" tools/test_snapshot.js --name vertical_v1 --plugins UF_Levels --no-run
"C:\Program Files\nodejs\node.exe" tools/run_tests.js vertical --game <snapshot dir>
PowerShell: $env:UF_TEST_PROVOKE='vertical.five_levels'; & "C:\Program Files\nodejs\node.exe" tools/run_tests.js vertical --game <dir>
"C:\Program Files\nodejs\node.exe" <scratchpad>\repro_title.js newgame vertical_title   (real title flow; then "continue")
```
Each suite runs on its own (`--uf-test=<suite>`), because the whole run has a 180 s watchdog (`UF_Test.js:196`).

---

## 6. Slice V2: connectors and routes

### 6.1 Connector rules (VW §3.3)
- **Stairs:** an edge exists between (x,y,z) and (x,y,z+1) when the lower cell is `stairUp` or `stairBoth` **and** the upper cell is `stairDown` or `stairBoth`. Anything else is a half-connector and has no edge. Stair cells are walkable like floor, and a unit changes level on one only when its route says so.
- **Ramps:** a `ramp` at (x,y,z) needs **headroom**: (x,y,z+1) must be `open`. It has an exit in direction d when (x+dx, y+dy, z) is `solid` (the ramp leans on it) **and** (x+dx, y+dy, z+1) is walkable. The edge is ramp (x,y,z) ↔ exit (x+dx, y+dy, z+1). In the other direction, the entry is that exit cell.
- **No corner cutting (V3):** `UF.Levels.canEnter(from, to)` refuses a diagonal step into or out of a connector when either orthogonal neighbour on the relevant level isn't walkable. While `UF_Dir8.fourWay` is true (the planner is 4-way today), connector edges are orthogonal only. The rule is written for 8 directions so the V3 planner change needs no rework.
- **Movement profiles:** `walker` = units with `data.kind` colonist, person or test, unless `data.levels === false`. Creatures and `data.through` units don't use connectors in V1–V3 (wildlife stays on the ground until slice 4's ecology).

### 6.2 Descent networks (VW §4.1 step 6)
- **When:** at the first ground build of a world that has none yet, on `world:areaBuilt` while `$dataMap` is the ground. This avoids a second ground build during `world:created`. It uses the same code for a New Game and for a migrated save.
- **Candidates:** seeded cells from `hash32(seed, salt("descent"), i)`. A candidate must be ground-walkable with no object, no unit within 2 cells, and outside every site disc + 3 (`UF.History.sites()`).
- **Choice:** one network 12–24 cells from the player's home centre (`state.viewStart`), and a second at least 48 cells from the first (catalog `levels.descents`).
- **Each network:** ground `stairDown`; −1 `stairUp`; a natural `floor` chamber of radius 3 round it on −1 (the old layer's `chamberRadius`). One −1 → −2 pair is placed at a seeded floor cell of a −1 cave region that one of the networks reaches, with a −2 chamber.
- **Validation:** routes exist from the home centre to each chamber, down to −2 and back up. On failure the next candidate is tried (a bounded 64 tries). Skipped candidates are logged. Everything is saved in `levels[z].cells` and `levels[z].descents`.

### 6.3 Connector graph and route planner
- **Connector ends per level:** `{id, z, x, y, region, peer: {z, x, y}, kind, cost}`. Built lazily per level from the shape changes plus the baseline, never by scanning 65 536 cells per call: the baselines of +1/+2 have no connectors, −1/−2 have none except descents, and shape changes are sparse.
- **Region labels:** `World.regionAt`. Doors count as open, as in UF_World's region map.
- **Invalidation:** each level's list is rebuilt when `levels:connectorsChanged(z)` fires, or when `World.gridVersion(ax, ay, z)` changed since the last build. The region labels behind it are rebuilt by UF_World only after a change.
- **Route search:** Dijkstra over states "at connector end e".
  - Start: every end on the unit's level in the unit's region, cost = octile distance.
  - Through a connector: `levels.route` costs (stairs up 2, down 1, ramps up 2, down 1; climbing costs more, VW §7.1).
  - Then to every end in the same region on the far level.
  - Sinks: the goal cell's region, or the regions of its 4 standable neighbours when the goal itself can't be stood on (the rule `planPath` uses).
  - The graph holds tens to low hundreds of ends, so O(n²) edges per region are fine.
- **Routes** hold legs `[{z, x, y (walk to here), hop: {z, x, y} | null}]`. They are cached per unit with the versions of every level they cross.
- **Same level, different regions:** the same search, for example out of a walled-in ground pocket through −1.

### 6.4 Moving between levels
- **`World.sendUnit` wrapper (UF_Levels):**
  - If the goal's z (default 0) equals the unit's z and the goal is reachable on that level → the original call (S17), with `u.levelGoal = null`.
  - If `u.levelGoal` is the same CellRef → return true without changes. UF_Jobs re-sends every update (L858).
  - Otherwise plan a route. With none, emit `world:unitBlocked(u, "no way between levels", goal)`: Jobs counts it (L958) and Speech may bark it. With one, set `u.levelGoal`, store the legs, and send the first leg with the original call.
- **Hop:** on `world:unitArrived(u)` with a route whose current leg ends here, check the arrival cell with `World.cellFree(…, z)` for the V68 rule. If it's occupied or blocked, wait up to `pathConfig.waitFrames`, then re-route. Otherwise `World.moveUnitToLevel(u, hop.z, hop.x, hop.y)` and send the next leg. Nothing else listens to `world:unitArrived` (grep, 2026-09-19).
- **Blocked:** on `world:unitBlocked` the route is dropped. Jobs' re-send plans again.
- **After load:** units with `levelGoal` continue their saved `goal` (the current leg). The route is re-planned at the next arrival.
- **Keep connectors clear:** a unit standing still on a connector end for 120 frames with no job is sent to the nearest free non-connector cell on its level. Stand cells and wander targets never pick a connector cell (checked in `standFor` through `UF.Levels.isConnectorCell`). This is the transit reservation that VW §7.2 asks for, without locking.

### 6.5 Jobs across levels
- **`take` L729:** the candidate filter stays `sameArea` (x, y), so it covers all levels. Sorting uses the z-aware `unitDistance`. The dry-run `plan` of every UF_Levels handler calls `UF.Levels.canReach(unit, stand)`, so an unreachable designation stays open with its reason.
- **Reservations:** `UF.Levels.reserve(ref, jobId)` for the stand cells of UF_Levels jobs, and for the safe cell of a channel (V3). Two active jobs never share a stand cell. The map is runtime-only and rebuilt from active jobs after a load.
- **Colonists:** they pick level designations with no change (`UF_Colonists.js:981-997`, default priority 1).
- **Items carried** travel with their holder (`area` null). A drop at the unit's cell uses the unit's LevelArea (the Items z pass).

### 6.6 UI in V2
- **Follow:** each frame, if `$colonyManager.cameraFollowUnit` has an `id` whose unit is on another level and no transfer is pending, `setView(u.z)` centred on the unit. The adapter's `event` getter (`UF_Interact.js:408-409`) then finds the event again. Falls (V3) trigger it too.
- **Look:** stairs and ramps say where they lead (`"Stairs down to -1"`).
- **Interact options:** "Go up" / "Go down" on a connector cell (view change); "Walk here" on a walkable level cell (a `move` job for the selected colonist through `UF.Colonists.order`, as `personalJob` does at L327-340).

### 6.7 Changes per file in V2
- **`UF_Levels.js`:** §6.1–6.6.
- **`UF_Jobs.js`:** `take` distance with levels; `standFor` skips connector cells unless the target itself is one.
- **`UF_Interact.js`:** "Walk here" and "Go up/Go down" through the UF_Levels wrap. There are no new lines in UF_Interact beyond the V1 hooks.

### 6.8 Checks (suite `vertical_routes`)
| Check | Required observation | Provocation |
|---|---|---|
| `vertical.stairs_ramps` (VW §11) | Fixtures: a stair pair ground/−1; a ramp at −1 leaning east with a ground exit and an `open` cell above it; a **half stair** (−1 `stairUp` under plain ground floor) in a −1 pocket reachable only through it. A walker on the ground sent into a −1 cell reachable only by the stairs arrives with z −1, and its trail shows the stair cell on both levels. Sent to a ground cell nearest the ramp, it arrives with z 0 and the trail shows the ramp and its exit. A walker in the pocket sent to the ground gets `world:unitBlocked` "no way between levels" within 60 frames and never changes z | `vertical.stairs_ramps` turns off the pair-agreement test, so the pocket walker climbs the half stair |
| `vertical.no_corner_cut` | `canEnter` table: a diagonal entry to a stair or ramp exit with one orthogonal neighbour blocked → false; with both open → true in 8-way mode, false in 4-way mode. Every step of every fixture route is orthogonal while `fourWay` is true | `vertical.no_corner_cut` turns off the corner rule |
| `vertical.v68_arrival` | A sitter stands on the −1 end of a stair pair. A walker routed down waits on the upper end. Sampled every frame, two non-through units never share a cell on any level. When the sitter leaves, the walker arrives. Then a boulder on the lower end: the walker re-routes or is blocked with a reason, and never lands on the boulder | `vertical.v68_arrival` skips the arrival check |
| `vertical.multilevel_jobs` (VW §11) | An open job on −1 and two colonists on the ground: exactly one takes it, reaches its stand on −1, and completes it (`jobs:done` with `target.z` −1). `Jobs.describe` and the profile name the level. The other colonist never takes it. Two jobs whose nearest stand is the same cell get different stands, and the reservation map has no duplicate | `vertical.multilevel_jobs` turns off stand reservations |
| `vertical.follow_view` | Following a walker that goes down the stairs: within 30 frames of its level change the view is on its level and centred on it. An unfollowed unit's level change never moves the view | `vertical.follow_view` removes the follow hook |
| `vertical.offscreen_sim` (VW §11) | View on +1 (empty). A walker on the ground is routed to −2 and stays off-screen the whole way. It arrives. Save and load after it reached −1: it continues and arrives at the same cell. `levelGoal` was in the save | `vertical.offscreen_sim` leaves `levelGoal` out of the saved copy |
| `vertical.descents_valid` | Two or more ground → −1 networks at least 48 cells apart, one 12–24 cells from the home centre, and at least one −1 → −2 pair. A route exists from the home centre to −2 and back. No descent cell holds a unit, a blocking object or water | `vertical.descents_valid` places the second network on the first |
| `vertical.route_budget` (on request) | 100 seeded cross-level routes: p95 ≤ 2 ms (proposal); a connector-list rebuild after a shape change ≤ 5 ms (proposal) | a busy wait in the planner |

---

## 7. Slice V3: dig down, build up

### 7.1 Designations and job types
New job types, defined by UF_Levels through `UF.Jobs.define` at boot, with `params.markerAs` for existing glyphs. They don't reuse Interact's `dig` (ground earthwork) or the object action `mine` (outcrops), whose names are taken.

| Job type | Target and validity (`UF.Levels.canDesignate`) | Stand | Work → apply |
|---|---|---|---|
| `excavate` (VW §5.1 "mine"; marker `mine`) | a natural `solid` cell on −1 or −2 | a 4-neighbour walkable cell on the same level, reserved | `levels.excavate.work` → `floor` (natural); drop `levels.excavate.yield` (catalog item ids) on the cell; support re-check at (x,y,z+1) |
| `channel` (marker `dig`) | `floor` or stairs at z ≥ −1 (−2 is the bottom, VW §5.4) with no blocking object and no other channel stand on it | a 4-neighbour walkable cell on the same level, **reserved as the safe cell and never the target** (VW §5.1); if the cell below will become a ramp, the stand must not be that ramp's lean cell | → (x,y,z) `open`; if (x,y,z−1) is natural `solid` it becomes a natural `ramp` and drops the carved rock's yield; non-blocking objects on the cell are removed; items, units and debris on it fall (§7.4) |
| `carve` (params `dir: "down" \| "up"`; marker `mine`) | down: (x,y,z) is floor or solid, (x,y,z−1) is solid or floor, z−1 ≥ −2; up: (x,y,z) is floor or solid, (x,y,z+1) is solid or floor, and a ground cell above must be walkable with no blocking object and no water | a 4-neighbour of the target on its own level | → both ends at once: down gives `stairDown` (or `stairBoth` if it was `stairUp`) at z and `stairUp` (or `stairBoth`) at z−1; up is symmetric. Each mined solid end drops its yield. The preview marks both ends |
| `construct` (params `what: "floor" \| "stairs" \| "wall"`, `objectId` for walls; marker `build`) | floor: an `open` cell at z ≥ +1 (or an `open` channel cell underground) that **would be supported** (§7.3). Stairs: a walkable cell at z ≤ +1 whose (x,y,z+1) is open. Wall: a supported built floor on z ≥ +1, and `objectId` a catalog type tagged `wall` (door types are refused: Doors' registry has no z, §8) | a walkable 4-neighbour on the target's level: a stair landing or an existing floor on +1; for stairs, a neighbour on the lower level | phase 0: fetch the material (`levels.construct[what].items`, or the wall object's own `build.items`) from the nearest reachable stack, searching the worker's level first and then the ground, claiming the item id in the reservations; phase 1: go to the stand; phase 2: consume the material from the inventory and apply. Floor → `floor` (built, material wood or stone). Stairs → `stairUp` at z and `stairDown` at z+1 (built, both ends). Wall → `UF.Objects.setIn({x,y,z}, x, y, objectId)` |

Existing `dismantle` (Interact) becomes z-aware in V1 and is how supports are removed in the collapse check. Built ramps and removing connectors are not in V3 (§13).

### 7.2 Catalog section `levels` (new; Claude-owned; no item id appears in code)
`levels` = `{ labels, tileset, tiles (§3.3), materials, generation (§5.6), descents (§6.2), route, excavate { work, yield }, channel { work, yield }, carve { work }, construct { floor, stairs: { items, work } }, support { maxSpan: 3, warnMinutes: 3 }, fall { hpPerLevel: 4, debris } }`. V1 inserts it with a Node script that parses the file to validate it and then inserts the text before the final `}` without reformatting, so Gemini's concurrent edits to `objects` stay intact. The catalog isn't an editor-managed file. Item ids used: `stone` and `log`, which exist (catalog check on 2026-09-19: 50 item types; `wall_wood` builds from 1 log and `wall_stone` from 2 stone).

### 7.3 Minimal support rule (VW §5.2)
- **Always supported:** every natural cell; every ground (z 0) cell.
- **Directly supported:** a built cell C at (x,y,z) is directly supported when (x,y,z−1) is natural `solid`, or holds a blocking object tagged `wall` that is itself supported (a ground wall counts), or is the lower end of C's own stair pair.
- **Component:** the built floors and stairs on level z joined 4-way. A member is supported when its BFS distance inside the component to a directly supported member is ≤ `support.maxSpan` (3). The same function answers the designation preview ("would be supported") and the re-check after a removal, so the two can't disagree.
- **Triggers:** a re-check runs for (x,y,z+1) and its component whenever `excavate` or `channel` changes (x,y,z) or `dismantle` removes a wall object at (x,y,z). The BFS is capped at 4096 cells.
- **Unsupported members:** they go into `state.collapse` with `due = now + warnMinutes` (game minutes, `time:minute`). The Look text says "Unsupported". When due, if still unsupported: shapes become `open`; each cell's `fall.debris` items are dropped at the landing cell below; wall objects on them fall as their `build.items`; units and items on them fall (§7.4). One `levels:collapsed` event goes out per component. Other components are never touched.

### 7.4 Falling (V3 minimum)
- **Landing:** `UF.Levels.fall(entity, ref)` lands on the first level below whose cell at (x,y) isn't `open`. The bottom level has no `open` cells (channel refuses −2), so nothing leaves the array (VW §5.4).
- **Items** use `Items.moveTo`.
- **Units** use `moveUnitToLevel`. The landing cell goes through `World.spawnCellFor(…, z)` when it's occupied or blocked, so V68 holds at landings. Damage is `fall.hpPerLevel × levels fallen` to `unit.data.combat.hp` (through `UF.Combat.hp(u)`, which creates the record), with `Combat.onUnitDeath` at 0. `unit.data.injuries.push({ kind: "fall", levels, hp, tick })` is saved with the unit.
- **Liquids** fall in slice V5 (fluids). The `channel_fall` check reports them as not covered.

### 7.5 UI in V3
UF_Levels wraps `UF.Interact.optionsFor`. Each option is enabled or disabled with the reason from `canDesignate`:
- **Ground cell:** "Dig stairs down", "Channel", "Build stairs up".
- **−1/−2 rock:** "Mine".
- **−1/−2 floor:** "Channel" (not on −2), "Dig stairs down", "Dig stairs up".
- **+1/+2 air:** "Build floor", disabled as "Unsupported" when the support rule says no.
- **+1/+2 floor:** "Build wall", "Build stairs up" (on +1).
- **Any designation:** "Cancel".

Markers show on both ends of a pending stair (`params.pairZ`), filtered by the level on screen.

### 7.6 Changes per file in V3
- **`UF_Levels.js`:** §7.1–7.5 (or `UF_LevelWorks.js`, see §4).
- **`UF_Items.js`:** `moveTo`, if it didn't land in V1.
- **`UF_Interact.js`:** the `markerAs` / `pairZ` marker filter, if it didn't land in V1.
- No other file changes.

### 7.7 Checks (suite `vertical_dig`)
| Check | Required observation | Provocation |
|---|---|---|
| `vertical.dig_down` | "Dig stairs down" on a ground cell by the camp, "Mine" on three −1 rock cells continuing from its bottom, then "Dig stairs down" to −2: colonists do all of it. Shapes are as designated. Each mined cell's catalog yield lies on its own level. A route ground → −2 through the new stairs exists. A screenshot while pending shows markers on both ends | `vertical.dig_down` makes `carve` write only the upper end: the pair is invalid and the route check FAILs |
| `vertical.channel_fall` (VW §11) | Channel a ground cell holding a log, over −1 rock: the ground cell is `open`; −1 is a natural `ramp` with the rock's yield; the log lies at (x,y,−1) and nothing is at z 0. The worker's stand was a reserved neighbour, and afterwards the worker is on z 0 and not on the hole. A test unit (not the worker) on a second channel target falls to −1 with a fall injury. The detail states "liquid: not covered until the fluids slice" | `vertical.channel_fall` lets the stand equal the target, so the worker falls |
| `vertical.build_up` (screenshot on +1) | Inside a 5 × 5 fixture house of ground walls: "Build stairs up", then "Build floor" over the house, then a wall object on +1. Colonists fetch logs from the ground, climb and build. On +1 the wood floor and wall draw. A floor designated 4 cells beyond the last support is refused with "Unsupported" and no job is created | `vertical.build_up` turns the support test off |
| `vertical.support_collapse` (VW §11) | Two separate +1 floor components A and B over two houses. Dismantle the ground walls under A: after the warning period, A's cells are `open` and B is unchanged; debris lies at z 0 under A; a test unit that stood on A is at z 0 with an injury record and lower hp. After a save and load, the debris and the injury are still there | `vertical.support_collapse` collapses every built floor on +1, so B disappears |
| `vertical.dig_budget` (on request) | A support BFS on a 1024-cell component ≤ 2 ms; one collapse event ≤ 10 ms (proposals) | a busy wait |

---

## 8. Owner changes for claimed or view-dependent files (not made by this work)
Each item is a one-place change for the file's owner. UF_Levels doesn't edit these files. The guard in the "UF_Levels meanwhile" column exists where a public entry point allows it.

| File (owner or claim) | Where | Exact change | UF_Levels meanwhile |
|---|---|---|---|
| `UF_Combat.js` (not ours) | `runTick` L887-892 (`const area = w.currentArea(); if (!area) return;`) | run for each level that has units (`W.unitsInArea(area.x, area.y, z)` per z), not only the area on screen; draw only for `W.viewLevel()` | wraps `Combat.engage` (L701) to refuse cross-level pairs; combat pauses while the ground isn't on screen (known problem) |
| `UF_Combat.js` | L90 `sameArea` for units | add `&& (a.z \| 0) === (b.z \| 0)` | same guard |
| `UF_Wildlife.js` (claimed by another Claude Code run) | `tick` L1072 and the `sameArea(u.area, cur)` filters L685, L715, L873, L988 | tick ground creatures whether or not the ground is on screen; read terrain through `W.walkable`/peek instead of `$gameMap` when it isn't; filter with `W.isDisplayed(u)` only for drawing; L881 hunter proximity also compares z | creatures never get a route between levels (profile, §6.1) |
| `UF_Anim.js` | L1172, L1407, L891-895 | use `W.viewLevel()` and filter job targets by z | none (action overlays don't show on other levels; units still draw) |
| `UF_Speech.js` | L779-787 | `W.viewLevel()`; speakers filtered with `W.isDisplayed(u)` | none (no overhead text on other levels) |
| `UF_Stance.js` | L424 | `W.viewLevel()` | none |
| `UF_Sheet.js` | L377, L1136, L1365 | `W.viewLevel()` as the area, passing z | unit clicks work (events); cell panels on levels come later |
| `UF_Doors.js` | `cellKey` L53 (registry key `x,y:x,y`) | include z when doors can be built on levels | `construct` refuses door types on z ≠ 0 |
| `UF_Floors.js`, `UF_Ownership.js`, `UF_Ecology.js`, `UF_Fire.js` | their `sameArea(…, W.currentArea())` reads | none needed for V1–V3: they stay ground-only (fail-closed) | none |
| `UF_Colonists.js` / `UF_Skills.js` | `SKILL_OF` L67 | map `excavate`, `channel` and `carve` to `stonework`, and `construct` to `building` | none (no skill gain from level jobs until then) |

---

## 9. Registration
- **`game/js/plugins.js` entry** (made by the lead in `game/`; UF_Levels only adds it in snapshots through `--plugins UF_Levels`), placed after `UF_Fire` and before `UF_Test`:
```json
{"name":"UF_Levels","status":true,"description":"[UF Levels] Five persistent levels (+2 to -2): one map per level, view switching (< > Home), stairs and ramps, routes between levels, digging down and building up.","parameters":{}}
```
- **`tools/register_world_plugins.js`:**
  - `ORDER` gains `"UF_Levels"` between `"UF_Fire"` and `"UF_Test"`.
  - **`"UF_Walls"` must be added after `"UF_Objects"` in the same edit.** It is registered in `plugins.js` (after UF_Objects) but missing from `ORDER`, and the tool moves every plugin not in `ORDER` in front of `UF_World` (tool line "entries not in ORDER are moved in front of UF_World"). A run would put UF_Walls before UF_Objects, which it aliases.
  - `DESCRIPTIONS` gains the UF_Levels text above and `UF_Walls: "[UF Walls] Two-square walls: a blocking wall cell with its roof/top drawn above it (V73)."`.
- The RMMZ editor is open (task environment). `plugins.js` in `game/` is edited only by the lead, with the editor closed (AGENTS, RMMZ editor safety).

## 10. Art (V9 stock placeholders) and the handoff
Every stock asset in §3.3 gets a replacement request in `docs/ASSET_REQUESTS.md`, naming the stock tile in the Status column (CLAUDE.md). The rows take the next free block (the highest row on 2026-09-19 is AR-1219; proposed AR-1300 to AR-1312). The withdrawn AR-040 to AR-043 specs are the starting text.
- AR-1300 cave floor −1 (A2 autotile, all 47 shapes; stand-in Dungeon_A2 3200)
- AR-1301 deep floor −2 (Dungeon_A2 3296)
- AR-1302 rock top (A4 top autotile; Dungeon_A4 5936)
- AR-1303 hole below (A2 autotile; Dungeon_A2 3392)
- AR-1304 open air on +1/+2 (Dungeon_A5 1536 Darkness)
- AR-1305 built wood floor (Dungeon_A5 1552)
- AR-1306 / 1307 / 1308 stairs up, down, both (Outside_B 1, 9, 42), drawn so they read the same on every level
- AR-1309 natural ramp (Dungeon_A5 1581) and ground ramp (Outside_B 2)
- AR-1310 ground hole (Outside_B 44)
- AR-1311 designation glyphs for mine, channel, carve stairs, build floor (extends AR-800)
- AR-1312 HUD level plate (drawn in code now)

`docs/handoffs/HANDOFF_vertical.md` tells Gemini that every one of these plugs in through `UF_WorldCatalog.json` → `levels.tileset` / `levels.tiles` (sheet names and tile ids), with no code. Floor and rock must stay distinguishable at zoom ⅓.

## 11. Budgets and how they're measured
V50 budgets (`WORLD_ARCHITECTURE.md` §1 item 8): map build ≤ 1500 ms; per-plugin per-frame work ≤ 1 ms average at zoom ⅓; AI per beat ≤ 4 ms for about 400 units; tilemap children ≤ 1500; 60 fps at ×1 and ≥ 30 fps at ×8; save ≤ 3 MB. `vertical_budget` records the V1–V3 numbers against them, with the method printed in the detail (§5.7). The numbers marked "proposal" (generation 300 ms, warm switch 250 ms, route p95 2 ms, support BFS 2 ms) need the user's agreement before they're used as pass lines (§12).

Memory estimate, **not measured**: 4 baseline pairs of 128 KB each; up to 6 cached builds of about 2–3.5 MB each (the tile array of 393 216 entries, the objects, the walk grid and region labels). Well under 20 MB.

## 12. Risks and decisions needed
- **D-1 (user):** the proposal numbers in §11.
- **D-2 (lead or owners):** the UF_World seam touches a file claimed by two other Claude Code runs ("Paths and DF life", "Spawn guard"). It should go in as one edit on the then-current `game/` copy, after they land or with their agreement, and the `world`, `spawn` and path checks must pass unchanged.
- **D-3 (user):** RMMZ autosaves after **every** transfer (`rmmz_scenes.js:807-817`, `optAutosave` true), so every level switch would autosave. Proposal: UF_Levels wraps `Scene_Map.prototype.shouldAutosave` to return false for a view switch. Level switches are camera moves, not journeys. Measure the save time in `vertical_budget` either way.
- **D-4 (Codex, RESOURCE_ATLAS):** "never reshuffle an existing save" means slice 4 either keeps the V1 graybox generator (`gen: 1`) for old saves forever, or ships an explicit migration. This plan stores `gen` per level so either works.
- **Risk:** while another level is on screen, Wildlife AI and Combat pause for the ground (§5.4, §8). It must be written in STATUS as a known problem until the owners' changes land.
- **Risk:** the planner is 4-way until V3's engine change. Connector code is 8-way-ready (§6.1), and the corner check tests the rule function directly, so it can FAIL today.
- **Risk:** reusing a cached build as the screen map (§3.4) depends on refreshing unit events correctly. `vertical.switch_view` covers it, and the fallback is a fresh build (slower, correct).
- **Risk:** `UF_Test` always starts a New Game (`UF_Test.js:167-171`). The real-save migration check therefore loads the fixture inside its suite with `DataManager.loadGame(19)`, the same code path `Scene_Load` uses.
- **Risk:** ground stairs use layer 2. A future ground generator that writes layer 2 would need to leave shape-changed cells alone. That goes in UF_World.md next to `registerGenerator`.

## 13. Not in V1–V3 (VERTICAL_WORLD §10 slices 4–6)
- Geology, aquifers, depth bands, underground ecology and multi-level trees (checks `vertical.geology`, `vertical.tree_span`).
- Fluids, wells, magma and machines (`vertical.aquifer_well`, `vertical.magma_safe`, and the liquid half of `vertical.channel_fall`).
- Fliers, climbers and swimmers (`vertical.flight_climb_fall`).
- Vertical combat (`vertical.combat`), rooms and privacy across levels (`vertical.rooms_ownership`).
- Light and darkness below ground; the cutaway and above/below indicators; multi-level designations; built ramps; removing connectors; hatches, grates and bridges.
- Fog observers and discovery per level (keys only in V1).

## 14. Proposed public API (summary)
**`UF.World` additions (the z seam, V1).** Every trailing `z` defaults to 0, meaning the ground.
- `inWorld(ax, ay, z)`, `areaMapId(ax, ay, z)`, `levelOfMapId(mapId)` → `{x, y, z}` | null, `isWorldMap(mapId)`, `viewLevel()` → `{x, y, z}` | null
- `registerGenerator(name, fn, order, { levels })`, `buildArea(ax, ay, z)`, `peekArea(ax, ay, z)`, `adoptBuild(ax, ay, z, map)`, `refreshUnitEvents(map, ax, ay, z)`, `reconcileEvents()`
- `setTile(…, tileId, z)`, `setDerivedTile(ax, ay, x, y, layer, tileId, z)`, `getTile(…, layer, z)`, `setObject(…, type, z)`, `getObject(ax, ay, x, y, z)`
- `cellFree(ax, ay, x, y, ignoreUnitId, z)`, `nearestFreeCell(…, ignoreUnitId, z)`, `spawnCellFor(…, name, z)`, `standerAt(ax, ay, x, y, z)`
- `addUnit({ …, z })`, `unitsInArea(ax, ay, z)`, `sendUnit(id, { area, x, y, z })`, `moveUnitToLevel(u, z, x, y)`, `isDisplayed(u)` (z-aware)
- `findPath(levelArea, …)`, `walkable(ax, ay, x, y, { z })`, `reachable(levelArea, …)`, `regionAt(ax, ay, x, y, z)`, `gridVersion(ax, ay, z)`, `transferView(ax, ay, x, y, dir, z)`
- Events: `world:levelTileChanged`, `world:levelObjectChanged`, `world:levelBuilt`, `world:unitLevelChanged(u, fromZ, toZ)`

**`UF.Levels` (new plugin `UF_Levels.js`)**
- Constants and helpers: `LEVELS`, `isLevel(z)`, `label(z)`, `levelKey(ax, ay, z)`, `zOf(o)`, `levelArea(ref)`, `ref(area, x, y, z)`, `sameLevel(a, b)`, `SHAPES`
- Cells: `shapeAt(ref)`, `cellAt(ref)` → `{shape, constructed, material}`, `setShape(ref, shape, { constructed, material })`, `standableShape(ref)`, `isConnectorCell(ref)`, `describeCell(ref)`
- Baselines: `baseline(z)`, `checksum(z)`, `registerBaseline(z, gen, fn)`, `migrate(state)`
- View: `view()`, `setView(z)`, `up()`, `down()`, `ground()`, `follow(unitId | null)`
- Routes (V2): `connectors(z)`, `route(fromRef, toRef, { unit })` → `{ legs, cost }` | null, `canReach(unit, ref)`, `canEnter(fromRef, toRef)`
- Work (V2/V3): `reserve(ref, jobId)`, `release(jobId)`, `reservedBy(ref)`, `canDesignate(kind, ref, params)` → `{ ok, reason }`, `designate(kind, ref, params)`; job types `excavate`, `channel`, `carve`, `construct`
- Structure (V3): `supported(ref)`, `supportComponent(ref)`, `collapseQueue()`, `fall(entity, ref)`
- `stats()`
- Events: `levels:viewChanged(fromZ, toZ)`, `levels:shapeChanged(ref, from, to)`, `levels:connectorsChanged(z)`, `levels:collapsed(z, cells)`, `levels:fell(entity, fromRef, toRef, levels)`

**Others:** `objects:levelChanged(levelArea, x, y, fromId, toId)` (UF_Objects); `UF.Items.moveTo(itemId, levelArea, x, y)` (UF_Items). Every UF_Objects, UF_Items and UF_Jobs function that takes an `area` also accepts a LevelArea.
