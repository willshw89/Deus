# UF_Objects

Map objects (trees, plants, stones, ore, buildings) from `catalog.objects`: one type number per cell in `$dataMap.ufObjects` (index + 1, 0 = nothing), kept and saved by UF_World. UF_Objects draws the objects in view as pooled sprites inside the map's tilemap, sorted with the characters by foot row; makes impassable objects block movement; runs actions (chop, gather, pick, quarry, mine) that yield items and change the object; and regrows picked plants after their hours. Status: built 2026-09-18, checks: `objects` (17 checks, all PASS on a snapshot copy 2026-09-18; `smoke` on the same kind of snapshot: 6 passed, 1 failed = the known `colony_state_in_save`).

**Owner:** Claude Code (objects agent) · **File:** `game/js/plugins/UF_Objects.js` · **Load order:** after `UF_World`, `UF_WorldGen`, `UF_Tiles`, `UF_History`; before `UF_Items`, `UF_Jobs` and `UF_Test` (WORLD_ARCHITECTURE §5). Not yet registered in the real `game/js/plugins.js` (Claude Code registers it when the editor is closed); tests ran with `--plugins UF_Tiles,UF_Objects`.

## API

Level seam added 2026-09-19: every area argument accepts a LevelArea `{x,y,z?}`. Omitted z means Ground; only integer -2 through +2 is accepted. Non-ground operations require World `viewLevel` and `levelOfMapId`; they refuse before reaching a legacy Ground-only core. Positional World reads/writes receive trailing z. `at`, `set`, `find`, `apply`, and `describe` use the viewed level. `applyIn` returns z beside its area and drops yields on that same level.

`UF.Objects`:
- `types()` → `[entry]`: the catalog list with `typeId` (index + 1) and `tintValue` added (copies; the catalog stays untouched).
- `type(idOrTypeId: string | number)` → entry or `null`.
- `typeId(id: string)` → number (0 = unknown).
- `at(x, y)` → entry or `null` on the map on screen; `atIn(area, x, y)` for any area (`peekArea` for off-screen ones).
- `typeIdAt(x, y)` → number; `typeIdIn(area, x, y)`.
- `set(x, y, idOrTypeId | null)` → bool. Puts an object on a cell of the map on screen through `UF.World.setObject` (recorded as a diff, drawn next frame). Unknown id → `false`, nothing changes. Same type as before → `true`, no event.
- `setIn(area: {x, y}, x, y, idOrTypeId | null)` → bool, any area.
- `blocks(x, y)` → bool: the object on the cell of the map on screen has `passable !== true`. `blocksIn(area, x, y)`.
- `find({ near: {x, y}, radius = 20, tags?: [string], id?: string, action?: string, limit?: number })` → `[{ x, y, type, dist }]` on the map on screen, sorted by Euclidean distance (ties: y, then x). `tags` must all be present. `findIn(area, opts)`.
- `apply(x, y, action: string, actor?)` → `null` when the cell has no object or the object has no such action; else `{ ok: true, action, area, x, y, from: id, to: id | null, yields: {itemId: count}, items: [...], actor }`. Drops every yield on the cell with `UF.Items.drop(area, x, y, itemId, count)` when `window.UF.Items` exists (`items` collects the returned values; empty without UF_Items), sets `becomes` (a missing `becomes` means the object is used up), schedules `regrow` of the new type, emits `objects:changed`. `applyIn(area, x, y, action, actor)` for any area.
- `describe(x, y)` → `{ id, name, tags, actions: [names], passable, under }` or `null`. `describeIn(area, x, y)`.
- `generated[name]()` → cached `Bitmap` for `gen:` entries. Built in: `stockpile` (a flat dashed 48×48 square). Other plugins may add generators (`UF.Objects.generated.foo = () => bitmap`).
- `refresh()`: rebuild the sprites in view next frame, recomputing every frame rectangle (called by the sidecar loader).
- `layer()` → the scene's `Sprite_UFObjectLayer` or `null`; `spriteAt(x, y)` → the pooled `Sprite` drawn for that cell or `null`; `Sprite_Layer` (the class); `MIN_Z` (7), `UNDER_BONUS` (−100).
- `hourNow()` → the game-hour count used for regrow (`((year × 12 + month) × 28 + day − 1) × 24 + hour`); `regrowList()`; `processRegrow()` → how many objects regrew now.
- `perf()` → `{ frames, avgMs, maxMs, rebuilds, sprites, pooled }` of the layer's `update()` since `resetPerf()`.

`UF.Sidecars`:
- `get(name)` → the parsed `img/characters/<name>.json` or `null` until it has loaded (and `null` for images that have none). The first call starts an XHR; loaded once per name.
- `load(name)` → Promise of the same; `isLoaded(name)`; `has(name)` (loaded and present).

Rendering (WORLD_ARCHITECTURE §4): one pooled `Sprite` per object in view (`displayX/Y` and `screenTileX/Y`, so zoom-aware, plus a 3-cell margin and 6 extra rows above for tall canopies), direct children of `Spriteset_Map._tilemap`, keyed by cell so a scroll step keeps every sprite whose cell stays in view. Rebuilt when the display moves a cell, the zoom changes, the map or its grid changes, or `world:objectChanged` fires; never iterates the whole area. Position: anchor at the cell's bottom center (`x = (cellX − displayX + 0.5) × 48`, `y = (cellY − displayY + 1) × 48`) unless the sidecar gives `anchor: [ax, ay]` in sheet pixels. Frame: `image` → the sidecar's `frameWidth/Height` and `animations.stand[0]` column of row 0, else column 1 row 0 of a `$` 3×4 sheet (a 12×8 sheet uses `characterIndex`); `tile: { sheet, id }` → the 48×48 rectangle `Tilemap._addNormalTile` would use (id 0–255 = B, 256–511 = C); `gen` → the generated bitmap. `z = max(7, round((cellY − displayY) × 48 + 48) + (under ? −100 : 0))`, the same foot row UF_Perspective25D gives characters. `tint` → `sprite.tint`.

## State it saves
- `UF.World.state.objectDiffs[areaKey][cellIndex]` (written by `UF.World.setObject`): every changed cell.
- `UF.World.state.regrow`: `[{ area: {x, y}, x, y, z, from: typeId, to: typeId, due: hour }]`, one entry at most per cell and level; `due` compared with `hourNow()`. Old missing-z entries mean Ground. All levels' due entries are serviced on the same hour event regardless of the viewed map. If a spawn guard temporarily refuses regrowth, the due entry is retained for retry.
- `UF.World.state.regrowHours`: only when `$ufTime` is missing (a fallback hour counter).
- Nothing in `unit.data`.

## Events (UF.Events)
- Emits `objects:changed(area, x, y, fromId | null, toId | null)` for Ground changes through `set`, `setIn`, `apply`, `applyIn` or regrowth. Other levels emit `objects:levelChanged(levelArea,x,y,fromId,toId)` instead. (`UF.World.setObject` emits the corresponding `world:objectChanged` or `world:levelObjectChanged`.)
- Listens: both World object-change events (redraw only when the changed level is viewed), `time:hour` (regrowth across every level; entries whose cell no longer holds the picked type are dropped).

## Keys and mouse
None.

## Assets used
- **Since 2026-09-19 (VISION V9, user: "stock is fine"): no object names U7 art.** `tools/switch_things_to_stock.js` moved the 30 objects that named a U7 file (or a byte-identical U7 copy under another name: `!$UF_Stump`, `!$UF_Wildflowers`) to stock `Outside_B` / `Outside_C` tiles chosen from labelled crops of the sheets. Trees use tile blocks (`tile.w` / `tile.h`, the id is the top-left tile), drawn centred on their cell and standing on its bottom edge: oak, fruit tree (picked), flat-top, broadleaf giant = Large Tree `Outside_B` 176, 2×2; birch, swamp tree, mangrove = Tree 157 over 165, 1×2; pine = Conifer (Snow) 221 over 229, 1×2, tinted green; snow fir = Large Conifer (Snow) 192, 2×2; dead and cursed tree = Dead Tree 232 over 240, 1×2. One-tile objects: stump 156, bush 166, desert shrub 241, tall grass 153, reeds 251, flowers 163/161/162/160 (orange, purple, blue, white), loose stones / gravel / small crystals 171, granite boulder 159, ironstone 167, copper outcrop C282, gold outcrop C285, crystal cluster C287, old bones C281. Kinds that share a tile differ by `tint` (the full table is the tool's `OBJECTS` list; `--check` exits 1 if an entry drifts or any object names U7 art again). The U7 files stay on disk, unused. `UF_Sheet`'s picture box draws one 48×48 tile, so it shows only the top-left tile of a tree block (known limit, UF_Sheet).
- Every `image`, `tile` and `gen` of `catalog.objects` (found by `tools/generate_asset_inventory.js`). On 2026-09-18: 23 character sheets (`!$TimberOak`, `!$PineTree`, `!$FruitTree`, `!$BerryBush`, `!$Campfire`, `!$GraniteBoulder`, `!$IronstoneDeposit`, and 16 `!$U7_*` stand-ins with sidecars) and stock RMMZ tiles of `Outside_B` / `Outside_C` (palm 237, snow bush 232, cactus 238, tall cactus 174, fern 246, lichen 251, wild grain 172, wild wheat 173, lily pads 253, wooden wall 80, straw bed 248, rubble C282, fallen pillar C286, stone wall C277, work stone C285).
- `UF_GenStockpile` (code-drawn placeholder, `UF.Objects.generated.stockpile`): a 48×48 dashed square. Needs an ASSET_REQUESTS entry.
- Tests only: `$U7_Townsman` (the sorting check's test unit).

## Checks (suite `objects`, default)
| Check | FAILs when |
|---|---|
| `catalog_types` | An entry lacks id/name or image/tile/gen, a `gen` has no generator, a tile id is outside 0–511, a `becomes`/`regrow.to`/`ruin` names an unknown object, a yield or `build.items` names an unknown item, or ids repeat |
| `images_exist` | An `image` file is missing from `img/characters` or a `tile.sheet` from `img/tilesets` |
| `names_clean` | An object name or id contains a banned proper noun (AGENTS.md → Reference vs. shipped content) |
| `layer_in_tilemap` | The scene's `Sprite_UFObjectLayer` isn't a child of the map's tilemap |
| `drawn_in_view` | An oak set at a cell in view has no sprite the next frame, the sprite has no opaque pixels, its anchor isn't at the cell's bottom center on screen (±1.5 px, zoom-aware), or the sprite stays after setting the cell to 0 |
| `tile_object_drawn` | A palm (`Outside_B` #237) isn't drawn from rectangle (624,624) 48×48 of the B sheet with opaque pixels |
| `tint_applied` | A birch sprite's tint isn't the catalog's `#e6f0e0` (or an untinted object isn't white) |
| `generated_drawn` | The stockpile sprite doesn't use the generated 48×48 bitmap with opaque pixels and the under bonus |
| `blocks_passage` | `Game_Map.isPassable` still allows a cell with an oak (any direction), or blocks one with tall grass, or the ground under them wasn't passable to begin with |
| `sorted_with_units` | Grass on a test unit's cell, an oak north of it and a pine south of it don't get z below, below and above the unit's sprite z |
| `apply_chop` | Chopping an oak doesn't leave a stump, doesn't return `{log: 3}`, doesn't emit `objects:changed(oak → stump)`, or a missing action doesn't return `null` (with UF_Items: 3 logs aren't on the cell) |
| `regrow` | Gathering a berry bush doesn't schedule `due = now + 48`, the bare bush comes back before 48 emitted `time:hour`s or not at the 48th, or the entry stays |
| `persists` | After a reload of the area (or a trip east and back in a multi-area world) the grid isn't rebuilt, the boulder is gone, or the diff and the regrow list don't survive a `JsonEx` round-trip |
| `drawn_after_reload` | The boulder has no loaded sprite on the new scene |
| `perf` | With ~3900 objects written across the area (every 16th free cell), at zoom ⅓ with the view scrolling half a cell per frame, the layer's `update()` averages over 1 ms across 120 frames |
| `perf_dense` | Same budget with every other cell of the 96×96 block around the middle filled (~4300 more objects, ~560–630 sprites in view) |
| `no_errors` | Any uncaught error during the suite |

Screenshots: `objects.objects_in_view.png` (zoom 1: the pair among the test objects and the generated forest), `objects.objects_zoomed_out.png` (zoom ⅓ during the dense perf run). Measured 2026-09-18 (Ryzen 7 8845HS / RTX 4060 laptop, nw.exe test run): `perf` avg 0.29 ms, max 2.27 ms, 366 sprites; `perf_dense` avg 0.51 ms, max 2.02 ms, 563 sprites. Seen failing: `perf_dense` (1.43 ms before sprites were keyed by cell), and on a sabotaged snapshot copy `catalog_types`, `images_exist`, `tint_applied`, `blocks_passage`, `sorted_with_units`, `apply_chop`, `regrow`.

## Replaced core methods
None, aliases only: `Game_Map.prototype.isPassable`, `Spriteset_Map.prototype.createCharacters`, `Scene_Boot.prototype.start`.

## Known limits

2026-09-19 merge verification: Objects/Items real source in a Node VM with documented World stubs passed 9 contract checks covering five independent object grids and item indices, regrowth on all five levels at one hour, yields, event signatures, strict z validation, item record precedence, inventory level changes/removal, viewed reads, and JSON state reload. Removing z from the loaded Items index key produced 5 failures. Syntax checks passed. This is API evidence; coherent five-level runtime snapshots and RMMZ F5/F8 remain to be run for this merge. Existing wall framing and test-fixture changes were preserved.

- A cell with an impassable object can't be left either (like an impassable tile), so a unit standing where a wall gets built is stuck until the wall goes. Regrowth can't cause this: only picked bushes and trees regrow, and units never stand on them.
- A passable object that isn't `under` (a stump) has the same z as a unit on its cell; the tie falls to sprite creation order, so the unit may draw under the stump.
- "Under" objects (grass, stones, beds, stockpiles) draw over stance markers (z 5) and designation markers (z 6) on every row, by the contract's z formula (foot row − 100 ≥ 7); `MIN_Z` 7 keeps the top screen rows consistent with the rest instead of letting them fall under the ground layer.
- One frame per object: no animation, no facing. The sidecar is read for `frameWidth/Height`, `anchor` and `animations.stand[0]` only.
- Reads and writes in an off-screen area go through `UF.World.peekArea`, which builds the area the first time (hundreds of ms), then reuses the cached build.
- Sprites stay pooled (hidden) in the tilemap until the scene changes; the pool grows to the most objects ever in view at once at zoom ⅓ (about 600 in a dense forest).
- `find` scans the square window around `near` (radius 40 = 6 561 cells); call it per decision, not per frame.
- The passing runs were made after the worldgen rewrite landed (dense generated forests); the checks place their own objects and don't depend on the generator.
