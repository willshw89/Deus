# WG.00.09b Lane K: test changes

Date: 2026-09-26. Brief: "Update the existing checks in DEUS_Depth.js registerChecks (suite depth) … Update them, do not delete them. List each change."

Run commands:
- `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth`
- or `node tools/test_layer_render_flat.js --suite depth [--provoke]`, which runs the same suite, requires every check, and with `--provoke` runs each check's provocation (`UF_TEST_PROVOKE=depth.<check>`) in its own snapshot and requires that check to FAIL.

## Suite `depth` (DEUS_Depth.js `registerChecks`), before (3a9daa0f: 28 checks) → after (26 checks)

| Before | After | What changed | Provocation (seen failing, see the report) |
|---|---|---|---|
| `preconditions`, `proof_scene` | same | unchanged | fixture only |
| `planes_present` | same | unchanged assertion (+2 binds +1 and the ground, both painted) | `depth.planes_present` (nothing bound) |
| `repaint_cost` | same | the canvas is now 912×720, not 1008×816 (PAD 0: nothing projects inward); bound 16 ms unchanged | none (measured) |
| `projection_origin` | same name | asserts the identity: the viewport centre maps to (408,312) and the left edge to (0,312), ±0 px | `depth.projection_origin` (the old centre projection at 0.97) |
| `exposure_by_upper_geometry` | same | unchanged assertion. Its provocation is now keyed on the check name, and it also drops the new stencil mask (planes above the tile layer, unmasked) | `depth.exposure_by_upper_geometry` (was `depth.exposure`, which the check-name driver never set) |
| `mask_order`, `depth2_through_depth1` | same | the probes use screen = cell position (identity) instead of `D.project` with a scale | `depth.mask_order`, `depth.depth2_through_depth1` |
| `entities_drawn` | same | the body probe is at the cell's own position | `depth.entities_drawn` |
| `crisp_nearest` | same | unchanged assertion (0 colours outside the source canvases). The provocation is bilinear sampling plus a half-pixel offset: at 1:1 on whole pixels, bilinear alone blends nothing | `depth.crisp_nearest` |
| `parallax_bounded` | same name | asserts zero edge shift measured on both planes (`observed(p, 0, cy).x === 0`), a 2-tile pan moving a fixed world point by exactly −96 px, and the centre point staying put | `depth.parallax_bounded` (the old projection at 0.80) |
| `tunables_take_effect` | same name | exercises `config.maxDepth` 2 → 1 → 2 and `config.enabled` false → true on the next frame (planes and the void), not a scale | none (measured) |
| `preset_filters` | **`no_filters_any_state`** | presets are gone. It asserts no filter on the root, the planes, their entity containers or any sprite under them, in six states: maxDepth 1 and 2, off, on, entities off and on | `depth.no_filters_any_state` (a ColorMatrixFilter on the entity container) |
| `one_level_below` | same | preset D removed: maxDepth 1 gives depth 1 bound, depth 2 hidden, the void shown | none (measured) |
| `void_beyond` | same | unchanged assertion. The suite now sets the harness clock to 12:00 (`UF.Time.setForTest`), because DEUS_DayNight tones the screen by the hour and an exact screen pixel needs the day tone | `depth.void_beyond` |
| `blur_by_default` | **`no_blends`** | inverted as the brief asks: with maxDepth 1, 0 of the sampled render pixels are colours outside the source canvases and the void (≥1000 samples) | `depth.no_blends` (bilinear plus a half-pixel offset) |
| `depth_transform_progressive` | **`flat_transform`** | both planes and their entity containers at scale 1, at whole-pixel positions equal to the tilemap's own, no filter, alpha 1; no Blur/ColorMatrix anywhere in the subtree; the main tilemap at scale 1, no filters, alpha 1; a terrace pixel equal to its source texel | `depth.flat_transform` |
| `blur_off_no_blur`, `color_off_baseline` | folded into **`flat_transform`** | "no BlurFilter" and "no filter, and the baseline colour equals the source texel" are asserted there (brief: "fold them into the flat assertion") | via `depth.flat_transform` |
| `entities_inherit_treatment` | same name | the unit sprite is a child of the +1 plane, its world transform is 1 × 1, and there is no filter on it or on any container up to the map tilemap. The detail prints the unit's own tint (kept, per the brief) | `depth.entities_inherit_treatment` |
| `visual_settings_no_physics` | same | presets and eye heights removed: it cycles maxDepth 1/0/2 and off/on, and nothing physical changes | none |
| `config_deterministic` | same | presets removed: `describe()` and each plane's z, visibility, position, scale, alpha and filters are the same after maxDepth 1/0/2 and off/on | none |
| `treatment_cost` | **`planes_cost`** | planes off vs on: the median engine tick over 2 interleaved rounds × 60 frames, the simulation paused, bound +8 ms. The old suite paused `UF.TimeSpeed`, which does not exist (the object is `UF.Time`), so its "simulation paused" was never true; the new one pauses `UF.Time` | none (measured) |
| `screenshots_written` (16 shots) | same, **4 shots** | `plus2_off`, `plus2_flat`, `plus1_off`, `plus1_flat`. A fixture cut down to −2 is made before them, so +1 shows the ground and −1 through it | none |
| `ground_draws_nothing` | **`ground_draws_through_openings`** | on the ground view: depth 1 → −1, depth 2 → −2. A non-open ground cell renders the same with the planes on and off. An open cell over the −2 floor renders the −2 texel (−1 transparent there). An open cell over a −1 floor renders the −1 texel. Tile layers plus planes are rendered with every other tilemap child hidden | `depth.ground_draws_through_openings` (the old rule, `exposes: z > 0`) |
| `canvases_freed` | same | stronger: after 4 switches, 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (the pool is reused, so nothing leaks and nothing is re-allocated) | `depth.canvases_freed` (nothing pooled: 16 made, 12 destroyed) |
| `hotkey_free` | same | the F7 hotkey is removed; asserts `Input.keyMapper[118] === undefined` | none |
| `no_errors` | same | unchanged | none |

## New suite `layers_flat` (DEUS_Depth.js, driver `tools/test_layer_render_flat.js`)

| Check | Asserts (brief item) | Provocation |
|---|---|---|
| `preconditions`, `fixtures` | the world, levels and screen; the Z-2 fixture cut; test units A (+1) and B (−1 floor) added on the ground view | fixture only |
| `flat_position` | (2) a world pixel on each lower plane is drawn exactly where the map tilemap draws that pixel (±0), before and after a 2-tile pan; unit A stands exactly on its cell's foot | `depth.flat_position` (+1 px) |
| `flat_crisp` | (3) the +2 planes' tile render holds no colour outside the source canvases and the void | `depth.flat_crisp` |
| `unit_step_same_frame` | (5) unit A's step sets its sprite's target in the step's frame; the sprite reaches the new cell's foot within UnitStepFrames + 1 frames, passing between the cells and showing walk frames; unit E, stepping into the window from outside with the camera still, gets its sprite in the frame it enters | `depth.unit_step_same_frame` (the old path: units re-read every 60 frames) |
| `scan_candidates_only` | (K4) the per-frame unit check tests exactly the units on the planes' levels, fewer than the world's | `depth.scan_candidates_only` (every unit, every frame) |
| `item_change_scoped` | (K4) a held item's change sets no plane dirty flag; a ground item on the +1 plane's level sets only that plane's item flag (not walls, not objects) | `depth.item_change_scoped` (the old storm) |
| `every_view_sees_through` | (brief item 10) on +2, +1, Ground and −1: an open cell of the viewed level renders the planes' own pixel (the map tilemap does not paint it), and a cell that is not open is unchanged with the planes off | `depth.every_view_sees_through` (the old rule) |
| `flat_no_filters` | (1) on +2 and +1 with both planes bound: `filters` null on every object under the root, no Blur/ColorMatrix, scale 1 and alpha 1 on the root, planes and entity containers; the map tilemap at scale 1 with no filters | `depth.flat_no_filters` |
| `switch_same_frame` | (4) in the same frame as `levels:viewChanged` (5 switches: 0→+2→+1→0→−1→0), every visible plane is bound and painted, and every unit in the window on a plane's level has a visible sprite with a ready bitmap and a frame | `depth.switch_same_frame` (no synchronous bind, no preload) |
| `screenshots_written` | `ground_off`, `ground_flat`, `minus1_off`, `minus1_flat` | none |
| `no_errors` | no uncaught error | none |

## `tools/test_minimap.js`
The existing 20 checks are unchanged. Four were added (see docs/systems/DEUS_Minimap.md §4). Each was run against the plugin version before it and failed there:
- `z_switch_back_no_full_redirty`
- `z_switch_keeps_offtab_changes`
- `tab_samples_its_own_level`
- `overlay_throttled`

`MockSprite` gained an empty `update()` so the real HUD sprite can be updated under the mocks.

Pre-existing finding, not fixed (the brief says existing checks stay): `negative_coords_safe` is `check(…, true, …)`, so it can never fail (AGENTS rule 4).

## Other tests
No `tools/test_*.js` on the branch base asserts blur, scale or filters. I searched with `grep -rn "UF.Depth\|DEUS_Depth" tools/` and found only the new files.
