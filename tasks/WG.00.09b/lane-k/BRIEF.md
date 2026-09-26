# Lane K Brief: Flat Layers (DEC-011) & Performance (WG.00.09b)

## Standing rules
1. One primary writer per file set. Lane K's write set is disjoint from all other active lanes.
2. Workers never push. Only the integrator pushes.
3. Capture the exit code of every command, one per command ("EXIT=$LASTEXITCODE"). Put the raw values in your reports.
4. FOREGROUND rule: a worker runs tests in the foreground and does not end its turn while background jobs or child processes are still running.
5. No art generation of any kind (DEC-007). Screenshots taken by the test harness are evidence, not art.
6. Nothing merges to main without PM sign-off in the mailbox, until the merge gate (Lane I) passes.
7. Run tests in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not push. Do not merge. Write only inside allowedPaths.

**allowedPaths** (exact):
- `game/js/plugins/DEUS_Depth.js`
- `game/js/plugins.js`. Only the `DEUS_Depth` entry's `parameters` block may change.
- `game/js/plugins/DEUS_Minimap.js`
- `game/js/plugins/DEUS_Fog.js`. Phase K4 only, and only if the K3 baseline ranks it.
- `game/js/plugins/DEUS_DayNight.js`. Phase K4 only, and only if the K3 baseline ranks it.
- `docs/systems/DEUS_Depth.md`, `docs/systems/DEUS_Minimap.md`
- `tools/test_layer_render_flat.js` (new), `tools/bench_render_layers.js` (new), `tools/test_minimap.js`
- `tasks/WG.00.09b/lane-k/**`

**Forbidden:** everything else. That includes DEUS_Levels.js, DEUS_World.js, DEUS_Camera.js, DEUS_Perspective25D.js, DEUS_Culling.js, tools/governance/**, tools/ops/**, docs/OWNER_DECISIONS.md and all art and img/**. If a fix needs a forbidden file, stop and write the finding to `tasks/WG.00.09b/lane-k/escalation.md`.

**Phase K1: flat layers (DEC-011).** Change `DEUS_Depth.js` as follows:
1. `PRESETS` (L132-157), `DEUS_DEPTH` (L121-124), `noBlur`/`scaleOnly` (L126-127) and `depthDefaults` (L115): collapse all of these to a single flat config. Remove the presets deus, deus_scale, deus_color, A, B, C, D, E and the related provocations. Keep `off` or `setEnabled`.
2. `config` (L159-185): remove `camera`, `blurQuality`, `maxParallaxPx` and `depths[*].scale/brightness/saturation/contrast/blur`. Keep `enabled`, `maxDepth`, `voidColor`, `exposes`, `entities` and `entityRefreshFrames`, which phase K2 revisits.
3. `cameraScale` / `resolveDepth` / `applyPreset` (L187-205): remove them, together with the `Preset` and `EyeHeightFt` plugin params (header L14-51). In plugins.js, the `DEUS_Depth` parameters become `{"MaxDepth": "2"}`.
4. `Sprite_DepthPlane.updatePlane` (L663-680): replace the centre projection (`this.x = Math.round(c.x + (u.x - c.x) * s)`, `this.scale.set(s, s)`, L669-674) with `this.x = u.x; this.y = u.y;` and scale fixed at 1.
5. `Sprite_DepthPlane.applyLook` (L681-706): remove the ColorMatrixFilter (L684-692) and the BlurFilter (L693-699). The plane must always end with `this.filters = null` and `alpha = 1`. Also remove the `_colorFilter`/`_blurFilter` fields (L475-476).
6. `Depth.project` / `Depth.edgeShift` / `setEyeHeight` / `cameraScale` / `preset` (L870-891): project becomes the identity, and the rest are removed or return 0. Update `describe`/`stats` (L899-913) to match.
7. F7 preset hotkey (L829-841, `CYCLE`): remove it, and free keyMapper[118] as it was before (`HOTKEY_WAS`).
8. Do NOT change the unit tint from unit data (`s.tint = tintOf(u.data.tint)`, L619) or item material tint (L634). Those are the entities' own colours, not depth shading. Keep `forceNearest` (L343-350). It is 1:1-safe.
10. See-through on EVERY view (Owner, 23:52 CT, looking at the Ground view: "it doesnt look like we have cuts down to z-2 yet"). Today planes are drawn only under +1/+2 views (L175, L746-748) and `ground_draws_nothing` asserts nothing is drawn on Ground. Change it: on every view (+2, +1, 0, -1), wherever the viewed level's cell is open (air, or a cut/ravine opening from Lane H's carve), draw the level below through it, 1:1, using the same exposure logic (`exposes`, `depth2_through_depth1`), down to MaxDepth 2 levels below the viewed level, and void colour below -2. Solid cells stay opaque. Rewrite `ground_draws_nothing` as `ground_draws_through_openings` (a solid ground cell draws nothing below; an open cell over the Z-2 cut shows Z-1/Z-2). If exposure data for 0/-1 views needs DEUS_Levels/DEUS_World changes, stop and write escalation.md with the exact need.
9. Out of scope, flag only: Fog `this._fogBitmap.smooth = true` (DEUS_Fog.js L547) softens fog on the current level. It is not a background layer, so leave it unless the Owner says otherwise. The minimap `_baseSprite.scale.set(0.5)` (DEUS_Minimap.js L528) is UI and stays.

**Phase K2: lag fix.** Evidence and hypotheses:
- (Evidence) Characters on non-viewed layers are not Game_Events. They are world units stepped by `World.update` → `stepOffscreen` once every `CONFIG.unitStepFrames` = 16 frames per unit, spread by id (DEUS_World.js L136, L1677-1702, L1613-1627). Each step is a whole-cell jump. DEUS_Depth then draws them at the integer cell (`placeEntities`, L607-624) with a fixed standing frame (`unitFrame`, L369-370; header L67-68, "nothing animates off the level on screen"). The result is 1-tile jumps about every 0.27 s with no walk cycle, which reads as lag.
- (Evidence) The plane's unit set is re-read only when an event fires, when the camera's cell changes, or every `entityRefreshFrames` = 60 frames (L180, `updateEntities` L520-532). A unit that walks into the view window on a lower level while the camera is still shows up as much as 60 frames late.
- (Evidence) A layer change is a full map transfer. `UF.Levels.setView` (DEUS_Levels.js L4179-4193) calls `World.transferView` → `reserveTransfer` (DEUS_World.js L2724-2730), which triggers a Scene_Map restart and a new Spriteset. The new `Sprite_DepthRoot` (DEUS_Depth L817-822, L714-734) allocates 4 fresh canvas layers and re-binds its planes through `peekArea`. `peekArea` runs a synchronous `buildArea` on a cache miss (DEUS_World L801 PEEK_CACHE=6, L811-821). The depth suite confirms this: "Each level switch makes a new spriteset" (L1387-1388). `UF.Levels.stats().lastSwitch` already records `ms` and `frames` (DEUS_Levels L4230-4233).
- (Hypothesis) On a fresh plane, `unitFrame` returns null until `ImageManager.loadCharacter` is ready (L357-358, L613-614), so lower-layer units stay invisible for the first frames after a switch.
- (Evidence) The minimap takes 32 frames to repaint a layer. Changing `activeZ` marks all 256 chunks dirty (DEUS_Minimap.js L411-417, L220-229), and `processDirty(8)` handles 8 chunks per frame (L616).
- Minor minimap bug: `sampleCell` reads objects and ground from `W.viewLevel()` whatever `z` is (L255-265, L311-315). A non-current Z tab can show the current level's objects. Fix it if it is cheap. If not, record it.

K2 changes, all inside allowedPaths:
- (a) A presentation-only tween in DEUS_Depth. When a tracked unit's `u.x/u.y` changes, move its sprite from the previous cell to the new one over `unitStepFrames` frames, and play the sheet's walk frames while it moves. No simulation change.
- (b) Plane unit membership is checked every frame against `W.unitsInArea` within the window. Remove the 60-frame periodic dependency, or reduce it to a safety net.
- (c) Preload the character bitmaps for units on the planes' levels, so that no unit sprite is hidden because its frame is not ready after a switch.
- (d) Pool the plane canvases at module level so a switch reuses them instead of allocating 4 new layers. Keep the check `canvases_freed` (L1388) meaningful: no leak.
- (e) Minimap: keep one base bitmap per Z. Do not re-dirty every chunk when switching between Z tabs that are already built; invalidation stays driven by cell changes.
- Converting a layer switch away from a map transfer (Levels/World) is OUT of scope. If the K3 numbers show it dominates, write `escalation.md` with those numbers.

**Phase K3: measurement harness first (§4). Phase K4: perf fixes (§4).**
- Implement `tools/bench_render_layers.js` to instrument snapshot copy of game/ and record metrics across view switches.

**Done tests:**
- New `tools/test_layer_render_flat.js`. It follows the existing NW harness pattern (tools/test_snapshot.js with an in-engine suite `layers_flat` registered by DEUS_Depth.js), and it exits non-zero on failure. It must assert:
  (1) on views +2 and +1 with both planes bound, every `Sprite_DepthPlane` and its `_entities` container, and the `Sprite_DepthRoot`, have `filters == null`, `scale.x == scale.y == 1`, `alpha == 1`, and no BlurFilter or ColorMatrixFilter anywhere in the subtree; the main `_tilemap` stays at scale 1 with no filters;
  (2) a world point on a lower plane is drawn at exactly its unprojected screen position (`observed == unprojected`, ±0 px), including after a 2-tile pan;
  (3) crisp: the planes' tile render holds no colour outside the source palette (reuse `crisp_nearest`);
  (4) in the same frame as `levels:viewChanged`, every visible plane is bound (paints > 0), and every unit in the window on a plane level has a visible sprite with a non-null frame;
  (5) a unit on a lower level that steps (or enters the window with the camera still) gets its sprite's target updated in that same frame and drawn at the new cell within `unitStepFrames` frames. No 60-frame wait.
  Each check needs a provocation (UF_TEST_PROVOKE=depth.<check>) that is shown to fail it.
- Update the existing checks in DEUS_Depth.js `registerChecks` (suite `depth`, L930-1391; run with `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth`). Update them, do not delete them. List each change in `tasks/WG.00.09b/lane-k/test_changes.md`:
  - `projection_origin` (L1045-1055): assert identity (left edge maps to x 0).
  - `parallax_bounded` (L1181-1197): assert zero edge shift and a pan that moves by exactly `panned*48`.
  - `tunables_take_effect` (L1199-1206): exercise `maxDepth`/`enabled` instead of scale.
  - `preset_filters` (L1208-1213): assert no filters in every state.
  - `blur_by_default` (L1234-1244): invert it to "no blends", which is the same as crisp.
  - `depth_transform_progressive` (L1247-1259): rewrite as `flat_transform` (scale 1, no filters, main tilemap untouched).
  - `entities_inherit_treatment` (L1260-1273): assert entity world scale 1 and no filters.
  - `blur_off_no_blur` / `color_off_baseline` (L1274-1289): fold them into the flat assertion.
  - `treatment_cost` (L1311-1344): replace it with planes on vs off.
  - `config_deterministic` (L1305-1310) and `visual_settings_no_physics` (L1291-1304): keep them, minus the presets.
  - Section 12 screenshots (L1346-1381): shots become `plus2_off`, `plus2_flat`, `plus1_off`, `plus1_flat`, and `screenshots_written` checks the new count.
  - Keep: `planes_present`, `repaint_cost`, `entities_drawn`, `exposure_by_upper_geometry`, `mask_order`, `depth2_through_depth1`, `crisp_nearest`, `one_level_below`, `void_beyond`, `canvases_freed`, `no_errors`. Update `hotkey_free` for the removed F7 binding.
- `tools/test_minimap.js`: add a check that switching back to an already-built Z tab does not re-dirty all 256 chunks. The existing checks stay.
- No tools/test_*.js on main asserts blur, scale or filters today (grep-verified). If the worker finds one, it is updated, not deleted.
- **Screenshots:** before and after, taken ONLY through the existing harness (`t.screenshot` in the `depth` suite through `tools/test_snapshot.js`). "Before" is the suite run on main at the branch base. "After" is the run on the lane tip. Copy the PNGs to `tasks/WG.00.09b/lane-k/evidence/` with their sha8 in the filename. No hand-made or generated images.

**lane.json gateTests:** `node tools/test_layer_render_flat.js`, `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth`, `node tools/test_minimap.js` (timeouts 900/900/300 s).

**Commits:** messages start `[claude] WG.00.09b`. Commit early on task/lane-k. Do not push or merge.

---

## Directive 0019-T §2: Worst-Case Combat Stress Scenario (K3 Addition)
Add a second scenario to `tools/bench_render_layers.js` (same harness, same per-frame metrics as 0017-Q §4), selected by `--scenario=stress`:
- **1x zoom** (the locked view). Fill the whole visible screen with animated units, one per walkable visible cell up to the screen's capacity, spread over 3 visible Z layers (the viewed layer plus two layers seen through openings).
- **Every unit is in combat:** walk cycles, melee swings (swords), ranged attacks with arrows in flight, and spell casts with projectile, impact and hit-flash effects, using the existing animation/effect path (RMMZ animations or the current DEUS effect code). Record which path was used.
- **Run 30 s by day and 30 s at night** (DayNight glows active), fixed seed.
- **Also record peak counts:** units drawn, projectiles alive, effect sprites/particles alive, draw calls if obtainable (else say "not obtainable").
- **Placeholder or existing assets only. NO ART MAY BE GENERATED (DEC-007).** If an effect has no asset, use a solid-color placeholder and list it.
- **Output:** `tasks/WG.00.09b/lane-k/perf/stress_baseline_<sha8>.json` with median, p95 and worst frame time, and the fps those imply. Run it 2 times in the foreground of the harness (not the worker) and report both.
- **K4 ranking:** uses both the normal baseline and the stress baseline.
