# UF_World: a world of areas, units that travel between them

**Owner:** Claude Code · **File:** `game/js/plugins/UF_World.js` · **Load order:** after the other UF plugins, before `UF_Test`

## 1. Purpose
The world is a grid of **areas**, each 256×256 cells (RMMZ's maximum). Areas have no map files. Each one is built in memory when it's visited, from the world seed, the registered generators, the start template (the glade, Map002), and the area's saved tile changes. **Units** (people, animals, anything that acts) live in a world registry rather than on maps. Units in the area on screen are drawn as ordinary RMMZ events. Units anywhere else keep moving in a simplified simulation. Units and the view (the RMMZ player, i.e. the cursor) cross area edges. Implements VISION V14.

## 2. Public API (`UF.World`)
Anything not listed here is internal.

### World and areas
| Member | Description |
|---|---|
| `config` | Plugin parameters: `areasX`, `areasY` (default 6×6), `size` (256), `mapIdBase` (1000), `tilesetId`, `groundTileId`, `templateMapId` (2), `startInWorld`, `seed`, `unitStepFrames` |
| `state` | The saved world: `{ version, seed, areasX, areasY, size, startArea: {x,y}, units: {id: unit}, nextUnitId, diffs }`. Read it; change it only through the functions below. |
| `newWorld(seed?)` | Creates a fresh world. Called automatically on New Game. |
| `currentArea()` | `{x, y}` of the area on screen, or `null` when not on an area map |
| `inWorld(ax, ay)` | Whether the area exists |
| `areaMapId(ax, ay)` / `areaOfMapId(mapId)` / `isAreaMap(mapId)` | Convert between areas and RMMZ map IDs (`1000 + ay × areasX + ax`) |
| `isStartArea(ax, ay)` | Whether this is the area with the glade |
| `template()` / `templateOffset()` | The glade map data and where it sits in the start area (currently (113,113)) |
| `rngFor(ax, ay, salt)` | Deterministic random function for an area. Returns numbers in [0, 1). |
| `registerGenerator(name, fn, order = 100)` | Adds an area generator (see below). Registering the same name again replaces it. |
| `generators()` | Names of the registered generators |
| `buildArea(ax, ay)` | Builds and returns an area's `$dataMap` object without touching the current map. Slow (~393k cells), so don't call it every frame. |
| `setTile(ax, ay, x, y, layer, tileId)` | Changes a tile anywhere. Recorded in `state.diffs`, so it survives leaving the area and saving. If the area is on screen, it updates live. **All world changes (building, digging, felling) must go through this.** |
| `getTile(ax, ay, x, y, layer)` | Reads a tile. For areas not on screen this builds the area (slow). |

**Generators.** `fn(ctx)` runs every time an area is built, in `order` (low first). It must be **deterministic**: use `ctx.rng` or `rngFor`, never `Math.random`, or areas change every time they're visited.

| `ctx` member | Meaning |
|---|---|
| `areaX`, `areaY`, `width`, `height`, `seed` | Which area is being built |
| `rng()` | This area's random numbers |
| `isStart`, `templateRect` | The glade area and the rectangle the glade will overwrite |
| `setTile(x, y, layer, tileId)` / `getTile(x, y, layer)` / `index(x, y, layer)` | Edit the area's tile data (layers 0–3 tiles, 4 shadows, 5 regions) |
| `addEvent({ name, x, y, image: { characterName, characterIndex, direction, pattern }, note, priorityType, through, directionFix, walkAnime })` | Adds a static object as an event (a tree, a rock). Returns its event ID. Limit: 999 per area. |

The glade is stamped **after** the generators run, so it always wins inside `templateRect`. Generator events inside that rectangle are dropped.

### Units
A unit record: `{ id, name, image: { characterName, characterIndex }, area: {x, y}, x, y, dir, goal, stuckFrames, data }`. Put your system's per-unit state in **`data`** (for example `data.needs = { hunger, thirst }`). It's saved with the unit.

| Member | Description |
|---|---|
| `addUnit({ name, image, area, x, y, dir, data })` | Creates a unit and returns its record. It appears immediately if its area is on screen. |
| `unit(id)`, `units()`, `unitsInArea(ax, ay)`, `unitByName(name)` | Look up units |
| `removeUnit(id)` | Deletes a unit (death, leaving the world) |
| `sendUnit(id, { area: {x, y}, x, y })` | Walks the unit there, across areas, on or off screen. `unit.goal` goes back to `null` on arrival. |
| `stopUnit(id)` | Clears the goal |
| `isDisplayed(unit)` | Whether its area is on screen |
| `eventIdOf(id)` | Its event ID, always `1000 + id`, the same in every area |
| `eventOf(id)` | Its `Game_Event` when displayed, else `null`. **Never hold on to an event; ask again each time.** |
| `unitOfEvent(gameEvent)` | Unit record for a unit event, else `null` |

How units move:
- **On screen:** the unit's event walks with RMMZ movement: `findDirectionTo` pathfinding, plus diagonal steps when the diagonal is passable. After 300 frames unable to move, the goal is dropped and `world:unitBlocked` is emitted.
- **Off screen:** one cell every `unitStepFrames` frames (16 by default, the same as RMMZ move speed 4), in a straight line (8 directions). **Terrain isn't checked off screen yet** (see Status).
- **At an area edge** the unit steps into the neighboring area, at the matching cell on the opposite edge.

### The view
| Member | Description |
|---|---|
| `transferView(ax, ay, x, y, dir?)` | Moves the view (the RMMZ player) to a cell in any area, with no fade |
| (automatic) | When the player moves off an area edge through `moveStraight` or `moveDiagonally`, it transfers to the neighboring area at the matching cell. The cursor (Slice 0 deliverable 7) gets this for free as long as it moves the player with those functions. |

## 3. Events (through `UF.Events`, when UF_Core has loaded)
| Event | Payload |
|---|---|
| `world:created` | `state` |
| `world:areaBuilt` | `{x, y}`: the area just loaded for display |
| `world:viewAreaChanged` | `from {x, y}` or `null`, `to {x, y}` |
| `world:unitAdded` / `world:unitRemoved` | `unit` |
| `world:unitAreaChanged` | `unit`, `from {x, y}`, `to {x, y}` |
| `world:unitArrived` / `world:unitBlocked` | `unit` |
| `world:tileChanged` | `area {x, y}`, `x`, `y`, `layer`, `tileId` |

## 4. Save data
`contents.ufWorld` = `UF.World.state` (plain objects only). On load it's restored before the map rebuilds, so the area comes back with its tile changes and units. The whole world costs about 150 bytes plus the units and changed tiles.

## 5. Checks (UF_Test suite `world`, a default suite)
| Check | Proves |
|---|---|
| `in_area_map` | New Game starts in the world's start area |
| `area_size` | The area is 256×256 with a full data array |
| `template_stamped` | The glade and its events are in the start area |
| `seeded` | Building the same area twice gives the same data |
| `diff_applies_live` / `diff_persists` | `setTile` shows immediately, and is still there after leaving and returning |
| `save_roundtrip` | The world state survives serialization |
| `unit_starts_offscreen` / `unit_enters_view` / `unit_walks_to_goal` / `unit_leaves_view` | A unit walks off screen into the area on screen, appears, walks to its goal, walks back out, and still exists in the neighbor area |
| `view_crosses_edge` / `view_returns` | The view crosses into the east area at the matching cell, and back |
| `no_errors` | No uncaught errors during the above |

## 6. Status (2026-09-18)
- **Works:** all 15 checks PASS, on two separate runs of a snapshot copy of the game. Screenshots checked: the test walker appears at cell (3,128) after walking in from the west area; the east area shows plain grass, as expected with no generators yet.
- **Not registered in the real `game/js/plugins.js` yet.** The RMMZ editor is open. To turn it on: Plugin Manager → add `UF_World` after the other UF plugins and before `UF_Test`, ON, then save. **Once it's on, New Game starts in area (3,3) with the glade in the middle of a 256×256 area.** Until Gemini's generator (8b) exists, everything outside the glade is flat grass.
- **Known limits:**
  - Off-screen units walk in straight lines and ignore terrain.
  - On-screen pathfinding is RMMZ's `findDirectionTo` (searches 12 steps; beyond that it heads straight). Good enough for now; a proper long-range pathfinder is a later mechanic.
  - Adam and Eve are still **glade events** (IDs 1 and 2) that `UF_ColonyOverseer` drives by event ID. When the view leaves the start area and returns, the glade is rebuilt and **they're back at their starting cells**. Fix (Gemini, 8b): tag them `<ufUnit>` in Map002, which makes `newWorld()` create them as units, and have `UF_ColonyOverseer` work from unit records (`unitByName`, `eventOf`, `unit.data`).
  - Removed sprites are detached, not destroyed (a small leak per unit crossing; freed when the scene changes).
- **Performance:** not established yet. One clean 30 s run on a 256×256 area averaged 16.80 ms per frame (1,785 frames, ~59.5 FPS), worst frame 95 ms, on a Ryzen 7 8845HS / RTX 4060 laptop. The 30×30 glade averaged 16.69 ms, worst 33 ms. A second 256×256 run had one 11.9 s freeze, and later runs were closed from outside mid-measurement (exit code 0), so the freeze is unexplained. Re-measure on a quiet machine: `run_tests.bat perf`.
