# PROJECT DEUS — ASSET MANIFEST

Master registry of all packed asset sheets, individual sprite slots, architectural components, and animated props in Project DEUS.

## Schema Definition
- **ASSET ID**: Unique identifier used by engine plugins and catalogs (e.g. `wall_limestone_straight`, `door_oak_closed`, `anim_forge_active`).
- **SHEET FILE**: Path to the source atlas or runtime sprite sheet in `game/img/`.
- **GRID POSITION**: `(col, row)` 0-indexed coordinates on the sheet grid.
- **CATEGORY**: `Architecture`, `Item`, `Object`, `Terrain`, `Workshop`, `Flora`, `Resource`.
- **MATERIAL**: Physical material key (e.g. `stones:limestone`, `woods:oak`, `metals:iron`).
- **STATIC / ANIMATED**: `Static` or `Animated`.
- **FOOTPRINT**: Grid width x height in cells (e.g. `1x2`, `1x1`, `2x2`).
- **FRAME RANGE**: Animation frame range (e.g. `0..7` for 8 frames, or `-` for static).
- **FRAME RATE**: Animation playback speed in ticks/beats (e.g. `4 ticks/frame`, or `-`).
- **ANCHOR**: Sprite anchor point `(x, y)` (standard `(0.5, 1.0)` bottom-center).
- **Z EXTENT**: Vertical level span (e.g. `0`, `0..+1`, `-1`).
- **BLACK-TOP RULE APPLIES**: `YES` (2-grid architectural element with upper black occlusion cap) or `NO`.
- **GAME SYSTEM**: Primary plugin system utilizing the asset (`UF_Walls`, `UF_Objects`, `UF_Items`, `UF_Levels`, `UF_Jobs`).
- **PROMPT VERSION**: Art specification prompt version used during generation.
- **IN-GAME VERIFIED**: `YES` (verified in playtest/test suite) or `NO`.

---

## Registered Assets

| ASSET ID | SHEET FILE | GRID POS | CATEGORY | MATERIAL | TYPE | FOOTPRINT | FRAMES | RATE | ANCHOR | Z EXT | BLACK-TOP | SYSTEM | PROMPT VER | VERIFIED |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `wall_stone_generic` | `img/tilesets/Dungeon_A4.png` | (0, 0) | Architecture | `stones:granite` | Static | 1x2 | - | - | (0.5, 1.0) | 0..+1 | YES | `UF_Walls` | stock | YES |
| `wall_wood_generic` | `img/tilesets/Outside_A4.png` | (0, 1) | Architecture | `woods:pine` | Static | 1x2 | - | - | (0.5, 1.0) | 0..+1 | YES | `UF_Walls` | stock | YES |
| `obj_campfire_lit` | `img/characters/!$Campfire.png` | (0, 0) | Object | `woods:pine` | Animated | 1x1 | 0..2 | 8 ticks | (0.5, 1.0) | 0 | NO | `UF_Objects` | stock | YES |
| `rock_strata_solid` | `img/tilesets/UF_Levels_A4.png` | (0, 0) | Terrain | `stones:granite` | Static | 1x2 | - | - | (0.5, 1.0) | all | YES | `UF_Levels` | v1.0 | YES |
| `cave_wall_natural` | `img/tilesets/UF_Levels_A4.png` | (1, 0) | Terrain | `stones:limestone`| Static | 1x2 | - | - | (0.5, 1.0) | -1..-2 | YES | `UF_Levels` | v1.0 | YES |
| `item_stone_granite`| `img/characters/!$Stone.png` | (0, 0) | Item | `stones:granite` | Static | sub-tile | - | - | (0.5, 1.0) | 0 | NO | `UF_Items` | stock | YES |
| `item_stone_sandstone`|`img/characters/!$Stone.png`| (0, 0) | Item | `stones:sandstone`| Static | sub-tile | - | - | (0.5, 1.0) | 0 | NO | `UF_Items` | stock | YES |
| `item_log_pine` | `img/characters/!$Log.png` | (0, 0) | Item | `woods:pine` | Static | sub-tile | - | - | (0.5, 1.0) | 0 | NO | `UF_Items` | stock | YES |
| `item_log_oak` | `img/characters/!$Log.png` | (0, 0) | Item | `woods:oak` | Static | sub-tile | - | - | (0.5, 1.0) | 0 | NO | `UF_Items` | stock | YES |
| `wall_limestone_straight` | `img/characters/!$UF_StoneWalls_Set.png` | (0, 0) | Architecture | `stones:limestone` | Static | 1x2 | - | - | (0.5, 1.0) | 0..+1 | YES | `UF_Walls` | v1.0 | YES |
| `wall_limestone_corner` | `img/characters/!$UF_StoneWalls_Set.png` | (1, 0) | Architecture | `stones:limestone` | Static | 1x2 | - | - | (0.5, 1.0) | 0..+1 | YES | `UF_Walls` | v1.0 | YES |
| `wall_limestone_doorway` | `img/characters/!$UF_StoneWalls_Set.png` | (2, 0) | Architecture | `stones:limestone` | Static | 1x2 | - | - | (0.5, 1.0) | 0..+1 | YES | `UF_Walls` | v1.0 | YES |
| `wall_limestone_closed_door` | `img/characters/!$UF_StoneWalls_Set.png` | (3, 0) | Architecture | `stones:limestone` | Static | 1x2 | - | - | (0.5, 1.0) | 0..+1 | YES | `UF_Walls` | v1.0 | YES |
| `rock_limestone_cliff` | `img/characters/!$UF_StoneWalls_Set.png` | (0, 1) | Terrain | `stones:limestone` | Static | 1x2 | - | - | (0.5, 1.0) | all | YES | `UF_Levels` | v1.0 | YES |
| `rock_cave_wall_excavated` | `img/characters/!$UF_StoneWalls_Set.png` | (1, 1) | Terrain | `stones:limestone` | Static | 1x2 | - | - | (0.5, 1.0) | -1..-2 | YES | `UF_Levels` | v1.0 | YES |
| `wall_limestone_arrow_slit` | `img/characters/!$UF_StoneWalls_Set.png` | (2, 1) | Architecture | `stones:limestone` | Static | 1x2 | - | - | (0.5, 1.0) | 0..+1 | YES | `UF_Walls` | v1.0 | YES |
| `chest_wood` | `img/characters/!$UF_Chest_Wood.png` | (0..2, 0..3) | Object | `woods:oak` | Animated | 1x1 | 0..2 | 150ms | (0.5, 1.0) | 0 | NO | `UF_Objects` / `UF_Anim` | v2.0 | YES |

*(New non-living packed sheets generated via Google Nano Banana Pro will be appended directly to this manifest as production proceeds.)*

