# Lane N Brief: In-Place Layer Switch & Area Prewarm (SIM.00.00)

## Standing rules
1. One primary writer per file set. Lane N's write set is disjoint from all other active lanes.
2. Workers never push. Only the integrator pushes.
3. Capture the exit code of every command, one per command ("EXIT=$LASTEXITCODE"). Put raw values in your reports.
4. FOREGROUND rule: Run tests in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not push. Do not merge. Write only inside allowedPaths.
5. NO ART of any kind (DEC-007). Never generate, request or integrate art, and never tell anyone to. Screenshots taken by test harness are evidence, not art.
6. Nothing merges to main without PM sign-off in the mailbox, until the merge gate (Lane I) passes.

**allowedPaths** (exact):
- `game/js/plugins/DEUS_Levels.js` (only view-switch, transfer and area-cache code paths; list every function touched)
- `game/js/plugins/DEUS_World.js` (only view-switch, transfer and area-cache code paths; list every function touched)
- `tools/test_layer_switch_inplace.js` (new)
- `tasks/SIM.00.00/lane-n/**`

**Forbidden:** everything in Lane K's list (DEUS_Depth.js, DEUS_Minimap.js, plugins.js, Fog, DayNight), world generation logic, and the Z-2 cut carve. If Lane N needs a hook in DEUS_Depth or the minimap, write the need to `tasks/SIM.00.00/lane-n/escalation.md`; Lane K adds it.

## Objective
Changing the viewed Z level must not transfer or restart the map scene. It becomes a view change: swap the tilemap data and layer bindings in place, keep the Spriteset, keep the simulation running with no pause, and prewarm (build in advance, spread over frames) the areas for z±1 and z±2 so a switch never runs a synchronous `buildArea`.

## Evidence & Background
- `UF.Levels.setView` (DEUS_Levels.js L4179-4193) calls `World.transferView` then `reserveTransfer` (DEUS_World.js L2724-2730, L2822-2849), which restarts Scene_Map; `peekArea` builds on a cache miss synchronously (DEUS_World L801, L811-821).

## Done Tests (`tools/test_layer_switch_inplace.js`)
Exits non-zero on failure. Each check must have a provocation shown to fail it:
1. A switch 0 → +1 → +2 → 0 → -1 → 0 creates no new Scene_Map and no new Spriteset (same object identity).
2. The world tick count keeps advancing across every switch with no skipped ticks.
3. No synchronous `buildArea` during a switch once prewarm has run.
4. `UF.Levels.stats().lastSwitch.frames` is at most 1 and its ms is reported.
5. Player, units, fog and minimap show the correct level immediately after the switch.
6. Saving and loading after several switches restores the same view and world state.
Existing Levels/World suites must still pass unchanged; list any test updated and why in `tasks/SIM.00.00/lane-n/test_changes.md`.

## Performance Measurement
Record `lastSwitch` ms and frames on main and on the lane tip with the bench scenario, and put both in `tasks/SIM.00.00/lane-n/perf/`.

## Commits
Messages start `[claude] SIM.00.00`. Commit early on task/lane-n. Do not push or merge.
