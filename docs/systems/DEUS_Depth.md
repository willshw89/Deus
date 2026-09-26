# DEUS_Depth

Flat layer compositing. On every view, wherever the viewed level's cell is open, the levels below are drawn 1:1 through it, down to `MaxDepth` levels below; beyond them lies the void.

- **Owner decision DEC-011** (2026-09-25 23:54 CT, relayed by PM 0017-Q): every Z layer renders 1:1. There is no blur, no scale or zoom, no parallax or projection offset, and no ColorMatrix, alpha or tint depth shading or any other filter. Visual depth effects will be revisited later, and only with the Owner.
- **Owner, 2026-09-25 23:52 CT**, on the Ground view: "it doesnt look like we have cuts down to z-2 yet". So see-through applies on every view, not only on +1/+2.
- This supersedes the camera-model projection, the `deus` preset (colour matrix plus blur) and presets A–E of 2026-09-24 (DEC-006/R1, superseded).

**Owner:** Claude Code (Lane K, WG.00.09b) · **File:** `game/js/plugins/DEUS_Depth.js` · **Load order:** after `DEUS_Levels`, `DEUS_Camera`, `DEUS_Culling` (`@base DEUS_Levels`); before `DEUS_Test`. **Parameter:** `MaxDepth` (2). `plugins.js` passes `{"MaxDepth": "2"}`.

## 1. What is drawn
- **Views and planes.** On a view at level z, depth 1 shows level z−1 through z's open cells, and depth 2 shows level z−2 through the open cells of both. Below the last drawn level, or below −2 where no level exists, the void colour `#08080C` shows.
  - +2 shows +1 and the ground.
  - +1 shows the ground and −1.
  - Ground shows −1 and −2.
  - −1 shows −2, then the void.
  - −2 shows the void at its open cells.
  - A level with no open cell binds nothing.
  - `config.exposes(z)` (every level) decides which levels' open cells show what is below. The provocation `ground_draws_through_openings` restores the old `z > 0` rule.
- **Solid cells stay opaque.** The planes and the void sit under the map's lower tile layer (`Sprite_DepthRoot`, `z = −1`, a child of `Spriteset_Map._tilemap`), so the viewed level's own tiles hide them.
  - They are also clipped by a stencil mask (a `PIXI.Graphics`, not a filter) to the viewed level's open cells. The mask is one rectangle per horizontal run of open cells in the tilemap's window, rebuilt when the start cell or a shape changes and moved every frame.
  - A solid cell whose art has transparent pixels (AUDIT_LOG A9) still shows nothing below.
- **Open cells of the viewed level are not painted by the map.** While the planes are on, the map tilemap instance gets its own `_addSpot`, which skips the viewed level's open cells.
  - On +1/+2 those cells are transparent open air anyway.
  - On the ground they are painted as rock face (DEUS_WorldGen), and below the ground as `cave_floor` + `hole_edge` (DEUS_Levels). Either would hide what is below.
  - Switching the planes off repaints them as before.
- **Each plane skips its own level's open cells** (`DepthTilemap.skipCell`), so depth 2 shows through depth 1's open cells and the void through the last plane's.
- **1:1.** A plane's canvas sits exactly where the map tilemap puts its own: `Sprite_DepthPlane.unprojected()` uses the tilemap's rounding (`startX × 48 − ceil(displayX × 48)`). Its scale is 1, its alpha 1, its `filters` null; the canvases are nearest-sampled.
  - `UF.Depth.project` is the identity and `edgeShift()` is 0.
  - The removed centre projection comes back only under the provocations `projection_origin` (0.97) and `parallax_bounded` (0.80).
- **Colours that stay:** a unit's own `data.tint` and an item's material or type tint. These are the entities' colours, not depth shading.
- **Canvas size.** `PAD` is 0: nothing projects inward any more. Each canvas is the tilemap's window, 912 × 720 px (19 × 15 tiles).
  - A canvas is repainted when the window's start tile changes, on a refresh (tile or shape events), or every 30 frames while A1 water is in the window (the water frame of the map, rule 12).
  - Repaint cost: 1.3–8.3 ms per plane (`repaint_cost`, runs of 2026-09-26, this machine).
- **Data.** `UF.World.peekArea` gives the lower levels' cached builds (they are never re-read per frame). `UF.Levels.shapeGrid` gives the open cells, cached per level and patched cell by cell on `levels:shapeChanged` / `levels:cellChanged`.

## 2. Entities of the lower levels
Objects, items, units, natural walls/cliff faces and, on the ground, ramps and stairs are pooled sprites in the plane's entity container. They are masked and sorted with the plane.

- **Objects:** a subclass of `UF.Objects.Sprite_Layer`, fed the level's build. It rebuilds on `objects:levelChanged` / `objects:changed` for that level, on a repaint, or when the view crosses a cell.
- **Items:** `UF.Items.find` on the level, using the frame rule of UF_Items. On `items:changed` only the item sprites of the plane whose level holds the item are re-read, and only if the item is on the ground there or was drawn there. A held item (an arrow shot, a meal) touches no plane. Before K4, combat rebuilt every plane's walls and objects on every arrow.
- **Walls and connectors:** `UF.Levels.naturalWallCells` / `groundConnectorCells`, re-read on a repaint or when the view crosses a cell. The walls' near-black upper caps (rule 13) are the lower level's own. For example, the bottom row of a cut shows the caps of the rock south of it.
- **Safety net:** items and walls are re-read at least every `config.entityRefreshFrames` (300) frames.
- **Units (K2):**
  - **Membership every frame.** One pass over a candidate list: the world's units on the bound planes' levels, tested against the view window plus 3 cells (6 cells upwards for tall sprites).
    - The list is remade when `UF.World.units()` returns a new array (a unit was added or removed), on `world:unitLevelChanged` / `world:unitAreaChanged`, when the planes are bound again, and at least every 60 frames.
    - No `world:unitMoved` listener is used. `UF.Events.emit` writes a synchronous log line per listener of every `world:*` event (DEUS_Core; about 0.14 ms each, escalated in `tasks/WG.00.09b/lane-k/escalation.md`).
  - **Same frame.** RMMZ updates the spriteset before the map, so the unit pass runs again after `Scene_Map.update` (`lateUpdate`). A step taken this frame gets its sprite's target before this frame is drawn.
    - Units are placed against the display origin the tiles of this frame were placed with (`_cam`), so a scroll inside the map update cannot shift them off their cells.
    - The spriteset's own update leaves the units to the late pass once one has run (K4: they used to run twice).
  - **Walk.** When a unit's cell changes, its sprite walks from where it is drawn to the new cell over `UF.World.config.unitStepFrames` (16) simulation ticks (`UF.World._frame`, so it follows the time speed and stops while paused). It plays the sheet's walk columns while it moves: the sidecar's `animations.walk` at `frameMs`, or RPG Maker's 1, 2, 1, 0 at 10 ticks.
    - A move of more than 2 cells (a fall or a placement) is not walked.
    - Loop seams are crossed the short way.
    - This is presentation only; the simulation is not touched. Frames are discrete sheet frames (rule 12).
  - **Preload.** Every unit sheet of the area on screen starts loading at `Scene_Map.start`, at a rebuild (the planes' levels), and on `world:unitAdded` / `world:unitImageChanged` / level or area changes. A sprite never waits for its sheet after a switch.
- **Not drawn on lower levels:** attack, cast and hurt frames, hitsplats, bars and RMMZ animations. DEUS_Anim and DEUS_Combat work only on Game_Events of the viewed level (escalation.md E5). Also not drawn: fire, the flood overlay, speech, stance rings, designations, fog.

## 3. Level switches and canvases
A level switch is still a map transfer (DEUS_Levels / DEUS_World; Lane N's in-place switch is 0017-Q). DEUS_Depth makes the switch cheap on its side:
- **Canvas pool.** `Scene_Map.terminate` (after RMMZ's background snapshot) returns the planes' 4 canvases to a module pool, and the next spriteset takes them.
  - Since boot, 4 canvases are made and none after that (`canvases_freed`). Without the pool (its provocation), 4 switches made 16 and destroyed 12.
- **Bound in the switch's first frame.** The root binds, paints and places the planes when it is made (`createCharacters`). So in the frame of `levels:viewChanged` every visible plane is painted and every unit in the window has a frame (`switch_same_frame`).
- **Measured:** request to started took 90–169 ms per switch after K4, in 12 switches. The planes' own part is the pooled canvases, peeks of cached builds (about 0.01 ms) and one paint of about 2–3 ms per plane.

## 4. Public API (`UF.Depth`)
| Member | Description |
|---|---|
| `config` | `enabled`, `maxDepth` (2), `voidColor` (`0x08080c`), `exposes(z)` (every level), `entities { objects, items, units, walls }`, `entityRefreshFrames` (300, the safety net for items and walls). After editing, call `touch()` or `refresh()`; `enabled` and `maxDepth` take effect on the next frame by themselves. |
| `PAD` | 0 |
| `project(depth, sx, sy)` | the identity `{ x: sx, y: sy }` (kept for callers; DEC-011) |
| `edgeShift()` | 0 |
| `setEnabled(on)`, `touch()`, `refresh()`, `rebuild()` | Turn the planes on or off (the map repaints its open cells accordingly); pick up config edits; repaint the planes; bind again. |
| `planes()` | The visible bound planes (`depth`, `level`, `map`, `unprojected()`, `entityCounts()`, `inEntityWindow(win, x, y, size)`). |
| `root()` | The `Sprite_DepthRoot` of the map scene, or null. |
| `isOpen(ax, ay, x, y, z)` | Whether a cell is open, from the cached shape grid. |
| `describe()`, `stats()` | `describe()`: "2 level(s) below, drawn 1:1 (DEC-011), void #08080c". `stats()`: `{ enabled, maxDepth, view, seeThrough, voidVisible, rebuilds, paints, lastPaintMs, peeks, lastPeekMs, layersAlive, canvasesMade, canvasesDestroyed, pooled, updates, lastUpdateMs, unitSteps, preloads, mainRepaints, unitsScanned, candidateRebuilds, entityRebuilds, itemRebuilds, itemDirties, objectDirties, planes: [{ depth, z, visible, scale, x, y, alpha, paints, water, entities, filters, bitmap }] }`. |

Removed (DEC-011): the presets `deus`, `deus_scale`, `deus_color`, `A`–`E`, `off` (use `setEnabled`); `preset()`, `cameraScale()`, `setEyeHeight()`, `center()`; `config.camera`, `origin`, `maxParallaxPx`, `blurQuality`, `depths`; the `Preset` and `EyeHeightFt` parameters; the F7 hotkey (`Input.keyMapper[118]` is free again).

## 5. Events
- **Listened:**
  - `levels:shapeChanged`, `levels:cellChanged`: patch the open-cell cache, repaint that level's plane, and repaint the map when the cell is on the viewed level.
  - `world:levelTileChanged`, `world:tileChanged`: repaint that level's plane.
  - `world:levelBuilt`, `world:areaBuilt`: bind again.
  - `world:created`: clear the caches.
  - `objects:levelChanged`, `objects:changed`: the object layer of that level.
  - `items:changed`: the item sprites of the plane concerned.
  - `world:unitAdded`, `world:unitImageChanged`: preload.
  - `world:unitLevelChanged`, `world:unitAreaChanged`: remake the unit candidates and preload.
- **Emitted:** none.
- **Save data:** none.

## 6. Checks
Two suites, not default suites.

- **`depth`**: `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth`. 26 checks. They are listed with their changes in `tasks/WG.00.09b/lane-k/test_changes.md`: preconditions, proof_scene, planes_present, repaint_cost, projection_origin, exposure_by_upper_geometry, mask_order, depth2_through_depth1, entities_drawn, crisp_nearest, parallax_bounded, tunables_take_effect, no_filters_any_state, one_level_below, void_beyond, no_blends, flat_transform, entities_inherit_treatment, visual_settings_no_physics, config_deterministic, planes_cost, screenshots_written, ground_draws_through_openings, canvases_freed, hotkey_free, no_errors.
- **`layers_flat`**: `node tools/test_layer_render_flat.js`. The driver requires every check, and `--provoke` proves each provocable check can fail. The same driver runs the depth suite with `--suite depth`. 12 checks: preconditions, fixtures, flat_position, flat_crisp, unit_step_same_frame, scan_candidates_only, item_change_scoped, every_view_sees_through, flat_no_filters, switch_same_frame, screenshots_written, no_errors.
- **Provocations:** `UF_TEST_PROVOKE=depth.<check>`. Each is listed in `test_changes.md`.
- **The suites set the harness clock to 12:00** (`UF.Time.setForTest`), because DEUS_DayNight tones the screen by the hour.
- **Fixtures:**
  - A 3 × 2 Z-2 cut is laid on the low ground nearest the window centre: the ground open; under it one −1 floor cell and five −1 open cells over a −2 floor.
  - Test units are named `TEST_*`.
  - The New Game seed differs per harness run, so the windows differ per run.

## 7. Status (2026-09-26, Lane K, branch `task/lane-k`)
- **Gates at 4da2e734:**

  | Command | Exit | Result |
  |---|---|---|
  | `node tools/test_layer_render_flat.js` | 0 | 12/12 |
  | `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth` | 0 | 26/26 |
  | `node tools/test_minimap.js` | 0 | 24/24 |

  The final commit re-runs them; see the report.
- **Provocations:** 8/8 `layers_flat` and 15/15 `depth` provocations fail their check. `mask_order` needed a stronger probe first: over ground without art it could not tell the order apart. The check now probes a +1 floor over painted ground, laying one deck cell if the world has none in view.
- **Screenshots** (opened) are in `tasks/WG.00.09b/lane-k/evidence/after_<sha8>/`, with the before set in `before_3a9daa0f/`:
  - `plus2_flat`: +1 and the ground at 1:1 through +2's open air.
  - `plus1_flat`: the ground and −1 through +1's.
  - `ground_flat`: through the cut, the −1 floor with a test unit and the −2 floor.
  - `minus1_off` / `minus1_flat`: the −2 floor through −1's open cells, under the blue cave tone.
- **Cost:** see `tasks/WG.00.09b/lane-k/perf/` and `escalation.md`.
  - With the simulation paused, the planes cost about 0.25–0.5 ms per tick (`paused_+2_planes_on/off`; `planes_cost` +0.5 ms).
  - Under the stress scenario after K4, DEUS_Depth takes about 1.1 ms (update) + 1.1 ms (late pass) + 0.37 ms (render) per tick, against 3.4–3.7 + 1.1 + 0.36 before K4.
  - A frame is dominated by the simulation (escalation.md E1–E3), not by the planes.
- **Not done / known:**
  - Not tried in the editor's Playtest (F5).
  - Lower-level combat frames and effects are not drawn (E5).
  - A switch is still a map transfer (Lane N).
  - Fog of the lower levels is not applied.
