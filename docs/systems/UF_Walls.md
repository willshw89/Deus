# UF_Walls

Two-square wall rendering for VISION V73. Every wall is anchored to one blocking world-object cell and draws a 48×96 frame: its wall face fills the lower square and its roof/top fills the square immediately above.

Status on 2026-09-19: implemented in `game/js/plugins/UF_Walls.js` and registered after `UF_Objects`, before `UF_Doors`. The focused `walls` suite passed 7/7 on the `live_walls_v73_final` snapshot. The same current tree passed `doors` 12/12 and `smoke` 13/13. RMMZ F5/F8 are not checked yet.

**Owner:** Claude Code / engine · **Load order:** after `UF_Objects`; before `UF_Doors`, `UF_Look`, `UF_Interact`, and `UF_Test`.

## Coordinate and collision contract

For a wall object stored at `(x,y)`:

- `(x,y)` is the lower **wall** square. It contains the catalog object and blocks movement through the ordinary `UF_Objects` rule.
- `(x,y-1)` is the upper **roof** square. It is visual overhang, not another object-grid entry and not another collision cell.
- The 48×96 sprite is bottom-centre anchored on `(x,y)`. Its roof therefore sorts in front of a unit one row north, which makes that unit appear behind the wall.
- A north–south sequence of wall objects remains one object per base cell. Storing roof cells separately would make adjacent walls overwrite one another and make removal ambiguous, so V73 is implemented as a two-square visual footprint with one collision base.

`UF.Walls.baseAt(area,x,y)` identifies both roles: a wall cell returns itself with `role:"wall"`; an otherwise-empty cell immediately north of a wall returns the wall below with `role:"roof"`.

## Connected wall frames

The wall-set contract is 20 frames in a 4×5 grid. Each frame is 48×96 in the final set, so the full PNG is 192×480:

- Frames 0–15 use the NESW connection bit mask: north 1, east 2, south 4, west 8.
- Frames 16, 18 and 19 are the alternate horizontal run and caps used when the visible face belongs on the other side of an enclosure.
- Frame 17 is reserved by the art contract.

The engine also accepts a single 48×96 wall master while art is being reviewed. It repeats that one frame for every connection, which is structurally correct but not final art.

The current `!$WallWood_Set` and working-tree `!$WallStone_Set` are full 192×480 sheets of 20 connected 48×96 frames, so UF_Walls selects their frames directly. The wood set is committed and approved. The stone delivery belongs to another agent and was still uncommitted when this engine task ended. UF_Walls retains a compatibility fallback for any legacy 48×48 wall sheet: it copies the old roof frame into the top square and draws a simple code-generated wood or stone face in the bottom square.

## Public API (`UF.Walls`)

| Member | Meaning |
|---|---|
| `footprint` | `[1,2]`, the visual width and height in cells |
| `isWallType(type)` | True for `autotile:"wall"` or an object tagged `wall` |
| `isWallCell(grid,w,h,x,y)` | True when the object grid contains any wall type at the cell |
| `maskAt(grid,w,h,x,y)` | NESW connection mask, 0–15 |
| `frameIndexAt(grid,w,h,x,y)` | Connected frame including alternate horizontal faces |
| `visualCells(x,y)` | `[{role:"roof",x,y-1},{role:"wall",x,y}]` |
| `baseAt(area,x,y)` | Resolve a wall or its otherwise-empty roof square to the stored base |
| `patchObjectLayer()` | Idempotently install the UF_Objects sprite-layer aliases |
| `clearCache()` | Drop generated placeholder frames and request a redraw |

## Rendering and performance

The plugin aliases `UF.Objects.Sprite_Layer._tryFrame` and `_rebuild`; it does not edit or replace `UF_Objects.js`.

- Approved 48×96 source frames are selected directly with no generated copy.
- A current 48×48 source frame is expanded once into a cached 48×96 placeholder bitmap.
- Connection lookups inspect four neighboring object cells. Rebuilds reassign a wall sprite only when its connected-frame key changes.
- No whole-map scan and no per-frame sprite allocation are added.

## Checks (`walls`, non-default)

| Check | Fails when |
|---|---|
| `catalog` | Wood or stone wall is absent or lacks the wall contract |
| `contract` | The public footprint or roof coordinate is not `[1,2]` / one row north |
| `two_cell_render` | The drawn wall frame is not 48×96, is not bottom-anchored, or its top does not reach the roof square |
| `connected_frames` | A three-cell horizontal run does not choose frames 2, 10 and 8 |
| `footprint_roles` | Roof lookup does not resolve to the base, the base does not block, or a duplicate roof object is stored |
| `perf` | 10,000 connected-frame lookups average over 0.005 ms each |
| `no_errors` | The harness records an uncaught error |

Set `UF_TEST_PROVOKE=walls.two_cell_render` only in a focused test run to disable two-square expansion and prove the rendering check can fail.

Observed on 2026-09-19: the normal suite passed 7/7. With `UF_TEST_PROVOKE=walls.two_cell_render`, it exited 1 with `two_cell_render` reporting a 48×48 frame whose roof and wall-cell tops were both 252.0, and `connected_frames` reporting three undefined wall-frame selections. The opened failure capture showed the wooden run and stone wall as one row with no lower faces. The opened passing capture showed a connected three-piece wooden run and an isolated stone wall, each spanning a roof row and a lower wall-face row. The post-registration run `live_walls_v73_commit` also passed 7/7; performance was 11.315 ms for 10,000 connection lookups (0.001132 ms per lookup, budget 0.005).

## Assets and known limits

- The approved wooden connected set is `art/masters/wall_wood.png` and `game/img/characters/!$WallWood_Set.png`: 20 frames at 48×96 in a 192×480 sheet.
- A 192×480 stone connected set is present at `game/img/characters/!$WallStone_Set.png`, but it is another agent's uncommitted delivery and was not staged or committed by this task.
- Code-generated lower faces remain only as compatibility placeholders for legacy 48×48 wall sheets.
- Clicking the visual roof square still addresses its map cell. `UF.Walls.baseAt` exposes the redirect needed when roof interaction is added; this plugin does not silently redirect a click away from a unit or item that may stand north of the wall.
- Real RMMZ editor F5 behavior and the F8 console remain unchecked.

## Replaced core methods

None. Aliases only: `UF.Objects.Sprite_Layer.prototype._tryFrame`, `UF.Objects.Sprite_Layer.prototype._rebuild`, and `Scene_Boot.prototype.start`.
