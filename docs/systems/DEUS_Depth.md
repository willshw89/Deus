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
  - Repaint times are printed by `repaint_cost`, reported but not gated (Fix 1). For example: 3.3 / 1.6 / 0.3 / 0.4 / 0.4 ms in `tasks/WG.00.09b/lane-k/evidence/after_eb446e06/results_depth_eb446e06.txt`.
- **Data.** `UF.World.peekArea` gives the lower levels' cached builds (they are never re-read per frame). `UF.Levels.shapeGrid` gives the open cells, cached per level and patched cell by cell on `levels:shapeChanged` / `levels:cellChanged`.

## 2. Entities of the lower levels
Objects, items, units, natural walls/cliff faces and, on the ground, ramps and stairs are pooled sprites in the plane's entity container. They are masked and sorted with the plane.

- **Objects:** a subclass of `UF.Objects.Sprite_Layer`, fed the level's build. It rebuilds on `objects:levelChanged` / `objects:changed` for that level, on a repaint, or when the view crosses a cell.
- **The window at the loop seam (Fix 1, B1).** The areas loop (scrollType 3). Near an area's edge the view's display origin
  wraps (a view centred at y 6 has its display at y 255.5), and the entity window runs past the seam.
  - Items, walls and connectors are read in up to four pieces inside 0..size−1 (`windowPieces`), never as one query around
    the unwrapped window.
  - Before Fix 1, an item at y 3 was never found there, and the clamped wall window dropped every wall face past the seam.
    The reproduction is in `tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/`, the check is `entities_at_seam`, and its
    provocation restores the old reads.
- **Items:** one `UF.Items.find` per window piece, centred on the piece, keeping the items on the piece's cells. It uses the
  frame rule of UF_Items.
  - A lookup per window cell was tried and cost more on these item-sparse levels: up to 4.56 ms in one tick
    (`perf/escalation_figures_output.txt`, `fix1a.B.depth.plane.rebuildItems.max`).
  - On `items:changed`, only the item sprites of the plane whose level holds the item are re-read, and only if the item is
    on the ground there or was drawn there. A held item (an arrow shot, a meal) touches no plane. Before K4, combat rebuilt
    every plane's walls and objects on every arrow.
- **Walls and connectors:** `UF.Levels.naturalWallCells` / `groundConnectorCells` per window piece (both clamp to the
  area), re-read on a repaint or when the view crosses a cell.
  - The walls' near-black upper caps (rule 13) are the lower level's own. For example, the bottom row of a cut shows the caps
    of the rock south of it, and a one-cell hole in a terrace shows the cap of the ground wall south of it.
- **Safety net:** items and walls are re-read at least every `config.entityRefreshFrames` (300) frames.
- **Units (K2):**
  - **Membership every frame.** One pass over a candidate list: the world's units on the bound planes' levels, tested against the view window plus 3 cells (6 cells upwards for tall sprites).
    - The list is remade when `UF.World.units()` returns a new array (a unit was added or removed), on `world:unitLevelChanged` / `world:unitAreaChanged`, when the planes are bound again, and at least every 60 frames.
    - No `world:unitMoved` listener is used. `UF.Events.emit` writes a synchronous log line per listener of every `world:*` event (DEUS_Core; median 115.9 µs per append, escalated in `tasks/WG.00.09b/lane-k/escalation.md` E3).
  - **Same frame.** RMMZ updates the spriteset before the map, so the unit pass runs again after `Scene_Map.update` (`lateUpdate`). A step taken this frame gets its sprite's target before this frame is drawn.
    - Units are placed against the display origin the tiles of this frame were placed with (`_cam`), so a scroll inside the map update cannot shift them off their cells.
    - The spriteset's own update leaves the units to the late pass once one has run (K4: they used to run twice).
  - **Walk.** When a unit's cell changes, its sprite walks from where it is drawn to the new cell over `UF.World.config.unitStepFrames` (16) simulation ticks (`UF.World._frame`, so it follows the time speed and stops while paused). It plays the sheet's walk columns while it moves: the sidecar's `animations.walk` at `frameMs`, or RPG Maker's 1, 2, 1, 0 at 10 ticks.
    - A move of more than 2 cells (a fall or a placement) is not walked.
    - Loop seams are crossed the short way.
    - This is presentation only; the simulation is not touched. Frames are discrete sheet frames (rule 12).
  - **Preload.** Every unit sheet of the area on screen starts loading at `Scene_Map.start`, at a rebuild (the planes' levels), and on `world:unitAdded` / `world:unitImageChanged` / level or area changes. A sprite never waits for its sheet after a switch. `UF.Depth.preloadsPending()` counts the preloaded sheets still loading (the checks wait for 0 before a switch).
- **Not drawn on lower levels:** attack, cast and hurt frames, hitsplats, bars and RMMZ animations. DEUS_Anim and DEUS_Combat work only on Game_Events of the viewed level (escalation.md E5). Also not drawn: fire, the flood overlay, speech, stance rings, designations, fog.

## 3. Level switches and canvases
A level switch happens **in place** (Lane N, SIM.00.00, main merge `e27e8be5`). The Scene_Map, its Spriteset_Map and this
plugin's `Sprite_DepthRoot` with its planes and canvases all stay. Area edges and loads are still map transfers: a new
Scene_Map and a new spriteset.

- **In place: bound, painted and placed before `levels:viewChanged` (Fix 2).** The order within one frame:
  1. `DEUS_Levels` aliases `Spriteset_Map.update`. The alias sees that the spriteset is bound to an older `$dataMap` and calls
     `finishSwitch`, before any layer of the spriteset updates.
  2. `finishSwitch` calls `UF.World.rebindSpriteset`. That rebinds the map tilemap and the character sprites, then emits
     `world:levelBuilt` (or `world:areaBuilt` when the new view is the ground).
  3. DEUS_Depth's listener runs `Sprite_DepthRoot.levelShown`:
     - `rebuild` binds the planes to the levels below the new view. A bind clears the plane's entity sprites.
     - `sync` then does one whole frame of the root's work at once: the planes placed and painted, the exposure mask and the
       void, the objects, items, walls and connectors, and the unit pass that `lateUpdate` would do later in the frame
       (membership, sprites, frames and positions).
  4. `rebindSpriteset` returns. `finishSwitch` refreshes the fog and emits `levels:viewChanged`. Every listener of that event
     sees the new view's planes painted and their units drawn on their cells.
     - This rests on the order of statements in `finishSwitch` (`DEUS_Levels.js`, the rebind comes before the emit).
     - It does not rest on the order of the listeners of either event.
  5. The frame continues as every frame:
     - the spriteset's own update re-places the planes, with no repaint unless something moved;
     - `Scene_Map.update` runs;
     - the late unit pass runs.
- **Before Fix 2** the listener only rebound, and binding clears the entity sprites. The paint and the unit pass waited for
  the frame's own update and late pass, which come after the event.
  - At `levels:viewChanged` the planes were on the right levels but not yet painted, and the units on their levels had no
    sprite. The gate `switch_same_frame` failed on every run after the Lane N merge.
  - The first frame drawn was already complete: same frame number, measured on `3538594d`
    (`tasks/WG.00.09b/lane-k/evidence/fix2_repro_3538594d/`).
  - So the lag was in the state that other code sees at the event, not on screen. The check now judges both moments.
- **Cost of the move.** The paint and the unit pass now run inside the rebind instead of later in the same frame. Lane N's
  instrumented gate was run once on each commit (seed 18, 23 switches; `tasks/WG.00.09b/lane-k/perf/fix2_switch_cost_output.txt`):
  - The rebind's listener time went from a median of 1.24 ms to 7.31 ms, max 11.01 → 24.35 ms.
  - The slowest `SceneManager.updateMain` around each switch went from a median of 59.22 ms to 52.24 ms. That difference is
    one run each, noise: no increase was measured.
- **Map transfer** (an area edge, a load).
  - The `world:*Built` events fire in `Scene_Map.create`, before the new scene has a spriteset, so no root hears them.
  - The new root binds, paints and places everything when it is made (`createCharacters`), before its scene starts.
    `canvases_freed` checks that its planes are bound when the scene starts.
- **Canvas pool.**
  - On a map transfer, `Scene_Map.terminate` (after RMMZ's background snapshot) returns the planes' 4 canvases to a module
    pool, and the next spriteset takes them. In-place switches keep them.
  - Since boot, 4 canvases are made and none after that. `canvases_freed` goes through 2 map transfers, because the switches
    alone no longer make spritesets (Fix 2). Without the pool (its provocation) the 2 transfers made 12 and destroyed 8.
- **Measured.** DEUS_Levels' `lastSwitch.ms`, from the request to the rebind (DEUS_Depth's part included), was 8.9–29.2 ms
  per in-place switch on `c2184c94`. That is 12 switches in `perf/baseline_c2184c94.json` (bench normal ×2, both runs
  labelled quiet).
  - The Fix 1 transfer switches measured 86.7–493.6 ms (`perf/baseline_eb446e06.json`, escalation.md E4).
  - The bench's own request-to-settled time (34.6–179.1 ms on `c2184c94`) includes the frames the harness waits.

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
| `preloadsPending()` | How many unit sheets the preload started are still loading (0: all ready or failed). |
| `describe()`, `stats()` | `describe()`: "2 level(s) below, drawn 1:1 (DEC-011), void #08080c". `stats()`: `{ enabled, maxDepth, view, seeThrough, voidVisible, rebuilds, paints, lastPaintMs, peeks, lastPeekMs, layersAlive, canvasesMade, canvasesDestroyed, pooled, updates, lastUpdateMs, unitSteps, preloads, mainRepaints, unitsScanned, candidateRebuilds, entityRebuilds, itemRebuilds, itemDirties, objectDirties, planes: [{ depth, z, visible, scale, x, y, alpha, paints, water, entities, filters, bitmap }] }`. |

Removed (DEC-011): the presets `deus`, `deus_scale`, `deus_color`, `A`–`E`, `off` (use `setEnabled`); `preset()`, `cameraScale()`, `setEyeHeight()`, `center()`; `config.camera`, `origin`, `maxParallaxPx`, `blurQuality`, `depths`; the `Preset` and `EyeHeightFt` parameters; the F7 hotkey (`Input.keyMapper[118]` is free again).

## 5. Events
- **Listened:**
  - `levels:shapeChanged`, `levels:cellChanged`: patch the open-cell cache, repaint that level's plane, and repaint the map when the cell is on the viewed level.
  - `world:levelTileChanged`, `world:tileChanged`: repaint that level's plane.
  - `world:levelBuilt`, `world:areaBuilt`: bind again; with a live root (an in-place switch), also paint and place
    everything at once, before `levels:viewChanged` (§3).
  - `world:created`: clear the caches.
  - `objects:levelChanged`, `objects:changed`: the object layer of that level.
  - `items:changed`: the item sprites of the plane concerned.
  - `world:unitAdded`, `world:unitImageChanged`: preload.
  - `world:unitLevelChanged`, `world:unitAreaChanged`: remake the unit candidates and preload.
- **Emitted:** none.
- **Save data:** none.

## 6. Checks
Two suites, not default suites.

- **`depth`**: `node tools/test_layer_render_flat.js --suite depth` (the lane's gate 2 since Fix 1). The older
  `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth` runs the same suite, but in a fixed snapshot
  folder. 27 checks, listed with their changes in `tasks/WG.00.09b/lane-k/test_changes.md`: preconditions, proof_scene,
  planes_present, repaint_cost, projection_origin, exposure_by_upper_geometry, mask_order, depth2_through_depth1,
  entities_drawn, crisp_nearest, parallax_bounded, tunables_take_effect, no_filters_any_state, one_level_below, void_beyond,
  no_blends, flat_transform, entities_inherit_treatment, visual_settings_no_physics, config_deterministic, planes_cost,
  screenshots_written, ground_draws_through_openings, entities_at_seam, canvases_freed, hotkey_free, no_errors.
- **`layers_flat`**: `node tools/test_layer_render_flat.js`. 12 checks: preconditions, fixtures, flat_position, flat_crisp,
  unit_step_same_frame, scan_candidates_only, item_change_scoped, every_view_sees_through, flat_no_filters,
  switch_same_frame, screenshots_written, no_errors.
- **The two switch checks (Fix 2).**
  - `switch_same_frame` judges each of the 5 switches 0→+2→+1→0→−1→0 twice: at `levels:viewChanged`, and just before the
    first render after it. Both times:
    - the planes are the new view's levels below it, shown and painted since they were bound;
    - every unit in the window on a plane's level has a visible sprite with a ready bitmap and a frame, on its cell's foot;
    - no plane draws a unit of another level.
  - `canvases_freed` checks the pool across 2 map transfers, and that the planes are bound when each new scene starts.
- **The driver** (`tools/test_layer_render_flat.js`):
  - It requires every check. `--provoke` proves each provocable check can fail; `--jobs n` runs n provocations at once.
  - Every run gets its own snapshot folder (`%TEMP%\uf_snapshots\lanek_<suite>_<pid>_<time>`), printed and deleted
    afterwards; `--keep` keeps it.
  - A `HARNESS` line or a suite that stopped is exit 2.
- **Provocations:** `UF_TEST_PROVOKE=depth.<check>`. Each is listed in `test_changes.md`.
- **Deterministic gates (Fix 1).**
  - No check passes or fails on wall-clock time: `repaint_cost` and `planes_cost` print their milliseconds as "reported,
    not gated" and assert only that the repaint happened and that the planes were off / on as set while sampled.
  - No check depends on the generated world (the fixture scene below).
  - Waits are condition waits: sheets loaded, the preload finished, the view switched, the weather cleared. A timeout is a
    `HARNESS` line naming the condition.
  - The unit step is judged on the simulation's clock (`UF.World._frame`), not on displayed frames.
- **A still world.** The suites pause the simulation (`UF.Time.pause`) for everything except the unit step. They set the
  harness clock to 12:00 (`UF.Time.setForTest`), because DEUS_DayNight tones the screen by the hour, and they clear the weather.
- **The fixture scene** (`buildScene`), 16 × 9 columns × 5 levels around a centre C. Every view of both suites is centred on C.
  - C is the first place, in a fixed order from (size/2 + 56, size/2 + 56), with no unit on any level within 33 × 33 cells.
  - Objects there are cleared, the strata of every column are written explicitly (`UF.Levels.setStrata`), and the ground
    floor cells get one painted ground tile (the catalog's first ground kind; AUDIT_LOG A9).
  - Every level of every column is then verified. `proof_scene` / `fixtures` fail on any difference, and the suite stops
    with a `HARNESS` line.
  - The scene holds a +1 terrace with a one-cell hole, a +2 summit on a +1 hill, a wooden deck, low ground, and the 3 × 2 Z-2
    cut at C: the ground open, one −1 floor cell and five −1 open cells over a −2 floor.
  - Every probe cell is a named fixture cell (`SCENE_AT`), including a reference cell that is not open on each of the views
    +2, +1, the ground and −1 (`every_view_sees_through`).
  - `entities_at_seam` builds its own cells at the area's corner.
  - Test units are named `TEST_*`. Both suites print the world seed in `preconditions`.

## 7. Status (2026-09-26, Lane K Fix 2, branch `task/lane-k`, code at c2184c94)
- **Fix 2 gates on c2184c94.** This is the lane merged with main `1f683b94` (Lane N's in-place switch) plus the Fix 2
  change. Each gate ran in its own fresh temp clone. Raw logs are in `tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/`, and
  `tasks/WG.00.09b/lane-k/REPORT.md` "Fix 2" has the details.

  | Command | Runs | Exit 0 | Result |
  |---|---|---|---|
  | `node tools/test_layer_render_flat.js` | 3 in a row | 3/3 | 12/12 each |
  | `node tools/test_layer_render_flat.js --provoke --jobs 3` | 1 | 1/1 | 8/8 provocations caught |
  | `node tools/test_layer_render_flat.js --suite depth` | 1 | 1/1 | 27/27 |
  | `node tools/test_layer_render_flat.js --suite depth --provoke --jobs 3` | 1 | 1/1 | 16/16 provocations caught |
  | `node tools/test_minimap.js` | 1 | 1/1 | 24/24 |
  | `node tools/test_layer_switch_inplace.js` (Lane N) | 1 | 1/1 | 7/7 |
  | `node tools/check_deus_syntax.js`, `node tools/test_palette.js` | 1 each | 2/2 | 52 files, 0 errors; palette loaded |

- **Bench** on c2184c94: normal ×2 and stress ×2, all four labelled quiet (`perf/baseline_c2184c94.json`,
  `perf/stress_baseline_c2184c94.json`, `perf/logs_c2184c94/`).
- **Fix 1 status (code at eb446e06, before the merge with main):**
- **Gates on eb446e06**, run in fresh temp clones. Raw logs are in
  `tasks/WG.00.09b/lane-k/evidence/determinism_eb446e06/`, and `tasks/WG.00.09b/lane-k/REPORT.md` has the details.

  | Command | Runs | Exit 0 | Result each run |
  |---|---|---|---|
  | `node tools/test_layer_render_flat.js` | 5 in a row, then 4 with 3 other gate runs at the same time | 9/9 | 12/12 |
  | `node tools/test_layer_render_flat.js --suite depth` | 5 in a row, then 4 with 3 other gate runs at the same time | 9/9 | 27/27 |
  | `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth` | 5 in a row | 5/5 | 27 passed, 0 failed |
  | `node tools/test_minimap.js` | 5 in a row | 5/5 | 24/24 |

- **Provocations:** 8/8 `layers_flat` and 16/16 `depth` provocations fail their own check
  (`evidence/provoke_eb446e06/`). The Grok review decides; this is not a self-certification.
- **Screenshots** (opened) are in `tasks/WG.00.09b/lane-k/evidence/after_eb446e06/`, of the fixture scene; the before set
  is in `before_3a9daa0f/`:
  - `plus2_flat`: +1 and the ground at 1:1 through +2's open air.
  - `plus1_flat`: the ground and −1 through +1's.
  - `ground_flat`: through the cut, the −1 floor with a test unit and the −2 floor.
  - `minus1_off` / `minus1_flat`: the −2 floor through −1's open cells, under the blue cave tone.
- **Cost:** see `tasks/WG.00.09b/lane-k/perf/` and `escalation.md`. Every figure there cites its JSON field; the Fix 1 runs
  carry their machine load.
  - With the simulation paused, the planes' tick is 2.065–2.365 ms on vs 1.53–1.67 ms off (`fix1.ticks.paused`).
  - Under the stress scenario and the steady views, DEUS_Depth's parts are 0.393 mean / 0.585 worst (update), 0.400 / 0.730
    (late pass) and 0.142 / 0.200 (render) ms per tick (`fix1.B.*`).
  - A frame is dominated by the simulation (escalation.md E1–E3), not by the planes.
- **Not done / known:**
  - Not tried in the editor's Playtest (F5).
  - Lower-level combat frames and effects are not drawn (E5).
  - The in-place switch's order (rebind before `levels:viewChanged`) is Lane N's. If it changes, `switch_same_frame`
    shows it.
  - Fog of the lower levels is not applied.
  - The viewed level's own natural wall sprites were not checked at the loop seam (E5).
