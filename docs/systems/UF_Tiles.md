# UF_Tiles
Draws the catalog's ground kinds (`groundKinds`, 22 of up to 32) as one RMMZ A2 autotile sheet in code (`UF_GenGround_A2`, 768×576, 16 px native at exactly 3×, textured interior plus an outline where a kind borders another) and registers one in-memory tileset, ID 91, for every world area: A1/A5/B/C from `catalog.tilesets.surface`, A2 the generated sheet, flags from the editor's base tileset except ground kinds and water kinds. Nothing is written to `game/data`.
Status: built 2026-09-18 (extended for `docs/design/WORLD_ARCHITECTURE.md` section 5.1), checks: `tiles` (11 checks).

**Owner:** the worldgen agent (Claude Code) · **File:** `game/js/plugins/UF_Tiles.js` · **Load order:** after `UF_WorldGen`, before `UF_Factions` (the tileset exists before the first area map loads: it's registered when `$dataTilesets` and the catalog have loaded, and again at `Scene_Boot.start`)

## API (`UF.Tiles`)
| Member | Description |
|---|---|
| `TILESET_ID` | 91 (plugin parameter `TilesetId`). UF_WorldGen sets `map.tilesetId` to it |
| `GEN_A2` | `"UF_GenGround_A2"`, the generated sheet's name (served by an `ImageManager.loadTileset` alias) |
| `kinds()` → `[{ id, name, pattern, colors, edge, passable? }]` | The ground kinds in sheet order (index = A2 kind) |
| `groundBase(kindId)` → tile id or `null` | `Tilemap.TILE_ID_A2 + index × 48` (shape 0) |
| `kindOfTile(tileId)` → kind entry or `null` | For any of a kind's 48 shapes; `null` for non-A2 tiles |
| `waterKindOfTile(tileId)` → key in `catalog.water.surface` or `null` | For any shape of an A1 water kind |
| `generatedBitmap()` → `Bitmap` | The A2 sheet (drawn once) |
| `tileset()` → `$dataTilesets[91]` or `null` | The runtime tileset record |

Flags in tileset 91: copied from `$dataTilesets[catalog.tilesets.surface.base]` (2, "Outside"); every A2 ground kind gets 0x0f when `passable === false` (`peak_rock`), else 0; every catalog water kind (all 48 shapes) gets its passage bits set to 0x0f, because the stock sheet leaves some A1 kinds walkable (2720 "blighted" had 0xf40) and units must stand next to water to drink, never in it.

## State it saves
None.

## Events
None emitted or listened. Hooks: `DataManager.onLoad` (register when `$dataTilesets` or the catalog loads), `Scene_Boot.start`, `ImageManager.loadTileset` (serves the generated sheet).

## Keys and mouse
None.

## Assets used (also listed in docs/ASSET_INVENTORY.md)
| Asset | What for | Status |
|---|---|---|
| `UF_GenGround_A2` | A2 ground kinds, drawn in code from `groundKinds[].colors/pattern/edge` | generated placeholder, replacement AR-100 |
| `img/tilesets/Outside_A1.png` | A1 water kinds (`catalog.water.surface`) | stock RMMZ, replacement AR-101 |
| `img/tilesets/Outside_A5.png` | A5 slot (unused by the generator so far) | stock RMMZ |
| `img/tilesets/Outside_B.png`, `Outside_C.png` | B/C tiles that catalog objects with `tile` reference (drawn by UF_Objects) | stock RMMZ |

## Checks
Suite `tiles` (`node tools/test_snapshot.js --name tiles --plugins UF_Tiles --suite tiles`):
| Check | FAILs when |
|---|---|
| `ground_kinds` | Fewer than 16 or more than 32 kinds in the catalog |
| `runtime_tileset` | `$dataTilesets[91]` is missing, has no A2 name or fewer than 8192 flags |
| `generated_sheet` | The sheet isn't 768×576 or isn't ready |
| `kinds_look_different` | Fewer than 75 % of the kinds' sample pixels are distinct colors |
| `pixel_grid_3x` | A 3×3 pixel block in the first kind's interior has mixed colors |
| `tileset_names` | A1/A5/B/C names differ from `catalog.tilesets.surface`, or A2 isn't the generated sheet |
| `flags` | `peak_rock` shapes 0 and 46 aren't 0x0f, or `meadow`'s aren't 0 |
| `water_impassable` | Any catalog water kind's shape 0 or 46 is passable in a direction |
| `kind_of_tile` | `kindOfTile(groundBase("forest_floor") + 17)` isn't `forest_floor`, or an A1 tile doesn't give `null` |
| `area_uses_tileset` | The area on screen doesn't use tileset 91 |
| `no_errors` | Any uncaught error |

Result 2026-09-18: 11/11 PASS on a snapshot run.

## Replaced core methods
None, aliases only (`ImageManager.loadTileset`, `DataManager.onLoad`, `Scene_Boot.prototype.start`).

## Known limits
- Up to 32 ground kinds (one A2 sheet); the catalog has 22.
- The sheet is regenerated per game start (not cached on disk); it takes a few milliseconds.
- Water passability is forced in tileset 91 only; editor maps using tileset 2 keep the stock flags.
- Ground textures are placeholders (`UF_Gen*`); the real art is AR-100 (A2) and AR-101 (A1) in `docs/ASSET_REQUESTS.md`.
