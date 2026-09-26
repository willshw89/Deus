# WG.00.09b Lane K: escalation (fixes outside the lane's write set)

Date: 2026-09-26, revised for Fix 1 (review `review_grok_86bf49a9.md`, M2). Writer: Claude (Lane K). Branch `task/lane-k`.

The K3 baselines rank the cost of a frame, and the Fix 1 reruns rank it again. Almost all of it is outside Lane K's allowed
paths. Per the brief ("If a fix needs a forbidden file, stop and write the finding to escalation.md"), nothing below was
changed. Each item gives the measured numbers, the call chain with file:line, and what the fix needs.

## Where every number comes from (Fix 1, M2)
- Every number in this file comes from JSON committed in `tasks/WG.00.09b/lane-k/perf/`. It is printed by
  `node tasks/WG.00.09b/lane-k/perf/escalation_figures.js`; the output at this commit is in `perf/escalation_figures_output.txt`.
- Each number is followed by the ID of the output line that prints it, for example `[fix1.A.env]`. That line names the
  file, the field, the phase or run, and the rounding. The one exception is plain arithmetic on cited numbers, which is
  written out where it is used.
- File:line references (DEUS_Environment.js:720 and so on) are code locations, not measurements.
- Data sets:

  | Set (ID prefix) | Files | Code | Machine load |
  |---|---|---|---|
  | `fix1` | `baseline_eb446e06.json`, `stress_baseline_eb446e06.json` | Fix 1 final code | Recorded per run (`runs[].machineLoad`): normal 1, normal 2 and stress 1 `quiet`, stress 2 `loaded` (overall median CPU 26.8 %) [fix1.normal.r1.load] [fix1.normal.r2.load] [fix1.stress.r1.load] [fix1.stress.r2.load] |
  | `fix1a` | `baseline_e3896d76.json`, `stress_baseline_e3896d76.json` | Fix 1 intermediate: items found by one lookup per window cell. Replaced because it cost more [fix1a.B.depth.plane.rebuildItems.max] | Recorded |
  | `fix1b` | `baseline_8dbd0bdc.json` | Fix 1 intermediate: the final renderer, and the bench tool before its nw.exe process-tree rule | Recorded |
  | `postK4` | `baseline_f19b23bf.json`, `stress_baseline_f19b23bf.json` | Post-K4 | **Taken under contention, load not recorded (pre-Fix 1)** |
  | `preK4` | `baseline_5c6641e1.json`, `stress_baseline_5c6641e1.json` | Pre-K4 (game code of 983a9e46) | **Taken under contention, load not recorded (pre-Fix 1)** |
  | `base` | `baseline_8592b07a.json`, `stress_baseline_8592b07a.json` | Branch base, the pre-DEC-011 renderer | **Taken under contention, load not recorded (pre-Fix 1)** |

- **Tool.** `node tools/bench_render_layers.js --scenario normal|stress [--runs n] [--append] [--pre-log <probe log>]`. It runs on
  a disposable snapshot copy of `game/` in nw.exe, using the DEUS_Test harness with the flags of `tools/run_tests.js` plus a
  DevTools port.
  - Per engine tick it records the frame interval, the tick duration, the wrapped update and render parts, and WebGL draw calls.
  - CPU profiles come from V8's sampling profiler over the DevTools protocol, at a 500 µs interval. "ms per update" is the
    sampled ms divided by the simulation updates in the profiled window.
  - Machine load (Fix 1, P3), per run:
    - the whole machine's CPU % once a second (os.cpus() idle/total deltas), min / median / max per phase and overall;
    - the AI worker count (the PM's filter; this session counts as 1) and the other nw.exe at start, every 15 s and at the end;
    - a 30 s probe before the run (`--load-probe`).
  - Label: `quiet` when the overall median CPU is at most 25 % and no other nw.exe was seen, otherwise `loaded`.
- **Machine.** `{"host":"MSI","cpus":16,"cpu":"AMD Ryzen 7 8845HS w/ Radeon 780M Graphics","totalMemGb":31.3}`
  [fix1.normal.machine]. GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)" [fix1.normal.gl].
- **Display refresh.** The paused +2 frame interval is the display's refresh interval:
  - 15.495–15.67 ms in the Fix 1 runs [fix1.frames.paused];
  - 6.94–6.95 ms in the post-K4 runs [postK4.frames.paused].
  So the display ran at a different refresh rate on 2026-09-26 during the Fix 1 runs (why was not checked). Frame intervals near
  the refresh interval can't be compared between those sets; tick times can.
- **Worlds.** Every run is a fresh New Game with its own seed. Units in the world: 1182 and 1192 in the normal runs
  [fix1.normal.runs], 1243 and 1241 in the stress runs [fix1.stress.runs]. Whole-frame numbers vary between runs.
- **Ranking.** `node tasks/WG.00.09b/lane-k/perf/rank_k4.js <baseline> <stress_baseline>` prints the same A rows as the
  figures script. Lane-side before/after: `perf/compare_k4.js <before> <after>`.

## Summary: where a frame goes (fix1: 12 profiled windows, the steady views and the stress halves [fix1.windows])

| Rank | Cost (ms per simulation update, mean / worst window) | What | Owner file(s) |
|---|---|---|---|
| 1 | 27.79 / 47.56 [fix1.A.env] | Room computation for unit wetness and thermal: E1 | DEUS_Environment, DEUS_Floors, DEUS_Objects |
| 2 | 28.37 / 44.45 (self) [fix1.A.objectsSelf] | DEUS_Objects self time, mostly inside E1's chain (`atIn`, `typeOf`) | DEUS_Objects |
| 3 | 9.64 / 17.95 (self) [fix1.A.worldSelf] | World walkability and unit stepping, full unit scans: E2 | DEUS_World |
| 4 | 9.49 / 15.14 over 7 windows [fix1.A.colonists] | Colonists scan/decide; of which the hazard reflex 11.20 in the one window where it is in the stored top 60 [fix1.A.hazard]: E2 | DEUS_Colonists, DEUS_Jobs, DEUS_World |
| 5 | 2.31 / 4.56 [fix1.A.gc] | Garbage collection | all |
| 6 | 1.45 / 3.03 [fix1.A.log] | Synchronous log writes in `UF.Events.emit`: E3 | DEUS_Core |
| 7 | 0.86 / 2.72 [fix1.A.effekseer] | Effekseer (RMMZ animations; stress) | RMMZ libs (read-only) |
| n/a | 105.0–515.0 ms per switch [fix1.switch.requestToStarted] | Level switch as a map transfer: E4 | DEUS_Levels, DEUS_World (Lane N) |
| lane | 0.27 / 0.45 (self) [fix1.A.depthSelf] | DEUS_Depth | Lane K |
| lane | 0.02 / 0.07 (self) [fix1.A.minimapSelf] | DEUS_Minimap | Lane K |
| lane | 0.00 / 0.00 [fix1.A.fogSelf] [fix1.A.dayNightSelf] | DEUS_Fog, DEUS_DayNight: not ranked, so not touched (brief K4 rule) | Lane K |

- **Whole frames.** Steady-view frame medians with the simulation running: 16.105–94.975 ms [fix1.frames.steady]. Stress
  frame medians: 72.375–108.7 ms [fix1.frames.stress].
- **Simulation paused** (`UF.Time.pause()`): the +2 view's engine tick is 1.53–2.365 ms [fix1.ticks.paused], and the frame
  waits for the display (above). With the simulation running, steady ticks are 12.665–92.725 ms [fix1.ticks.steady]. So the
  lag the Owner sees on a layer is the simulation, not the layer rendering.
- **Ranking change.** The top four rows by worst window are in the same order as the post-K4 ranking: Environment 60.60,
  DEUS_Objects self 57.60, DEUS_World self 15.60, Colonists 9.93 [postK4.A.env] [postK4.A.objectsSelf] [postK4.A.worldSelf]
  [postK4.A.colonists]. That older data was taken under contention with the load not recorded.
  - The intermediate `fix1a` data put Colonists first, 33.62 worst [fix1a.A.colonists].
  - The largest row in Lane K's write set is DEUS_Depth self, 0.45 ms per update in its worst window [fix1.A.depthSelf];
    DEUS_Minimap is 0.07 [fix1.A.minimapSelf]. DEUS_Fog and DEUS_DayNight stay at 0.00 [fix1.A.fogSelf] [fix1.A.dayNightSelf],
    so the K4 rule still leaves them untouched.

## E1. Room flood fill per unit per update (the largest single cost)
- **Chain:**
  - `Game_Map.update` (DEUS_Environment.js:796) → `updateEnvironment` (DEUS_Environment.js:720) → `stepUnitThermal` (:559) → `updateWetness` (:418)
  - → `isRoofed` (DEUS_Floors.js:198) → `roomAt` (:152) → `computeRoom` (:127) → `isGap` (:101) / `isBarrier` (:91)
  - → `UF.Objects.atIn` (DEUS_Objects.js:968) → `typeOf` (:101) → the anonymous function at DEUS_Objects.js:82 and `table` (:80)
- **Cost:**
  - Inclusive: 27.79 mean / 47.56 worst ms per update [fix1.A.env].
  - DEUS_Objects self time: 28.37 / 44.45 [fix1.A.objectsSelf].
  - Share of the largest `Scene_Map.updateMain` inclusive time in each window: 40.9–80.3 % [fix1.A.envShareOfUpdateMain].
    Share of the non-idle sampled time: 33.1–73.0 % [fix1.A.envShareOfBusy]. It is on every view.
  - Pre-Fix 1, for comparison (contention, load not recorded): 36.62 / 60.60 post-K4 [postK4.A.env] and 27.41 / 41.93
    pre-K4 [preK4.A.env]. The differences are the world and the load: neither K4 nor Fix 1 touches this code.
- **Needs:** a room answer that is not recomputed per unit per update.
  - For example, cache `roomAt` per cell with invalidation on `objects:*`, `floors:*` and `levels:shapeChanged`.
  - Or compute roofed/room ids per region once per change.
  - Or run wetness and thermal at a lower rate with LOD (DEC-012).
- **Files:** DEUS_Environment.js, DEUS_Floors.js, DEUS_Objects.js.

## E2. World walkability, unit stepping and the colonist hazard reflex
- **DEUS_World self time:** 9.64 mean / 17.95 worst ms per update [fix1.A.worldSelf]. The functions it contains (code
  references):
  - `World.walkable` (DEUS_World.js:2637)
  - `gridOf` (:1816)
  - `stepOpen` (:2478)
  - `standerAt` (:1059), which calls `World.standerAt` / `cellFree` (:939–962). That scans every unit for one cell.
- **Unit stepping:** `World.update` (:1677) with `stepOffscreen` (:1613) is not in the stored top-60 inclusive list of any
  Fix 1 window [fix1.A.worldUpdate]. Its wrapped part `update.map.world` is 5.086 mean / 8.890 worst ms per tick
  [fix1.B.update.map.world].
- **Colonists.** `DEUS_Colonists.scan` (:5250) → `decide` (:5169) is 9.49 mean / 15.14 worst ms per update over the 7 windows
  where it is in the top 60 [fix1.A.colonists]. Its branch `hazardReflexJob` (:1719) → `DEUS_Jobs.safeCellNear` (:1019) →
  `standableIn` (:245) → `World.walkable` is 11.20 ms per update in normal run 1, steady Ground [fix1.A.hazard].
  Pre-Fix 1 (contention, load not recorded): 19.49 mean / 25.58 worst over 3 windows pre-K4 [preK4.A.hazard], 20.97 /
  21.86 on the branch base [base.A.hazard].
- **Needs:**
  - A spatial occupancy index for units, so a cell query doesn't scan all units.
  - A cached walkability grid per level, invalidated by tile, shape and object events.
  - A bounded search in `safeCellNear`.
- **Files:** DEUS_World.js, DEUS_Jobs.js, DEUS_Colonists.js.

## E3. `UF.Events.emit` writes a log line synchronously for every listener of every `world:*` event
- **Code:** DEUS_Core.js:257–270. After each listener it calls `require('fs').appendFileSync('game_runtime.log', …)` when
  `dur > 20 || event.startsWith("world:")`. So every `world:*` event, for example `world:unitMoved` on every unit step, costs
  one synchronous file append per listener.
- **Measured:**
  - One append: median 115.9 µs, p95 170 µs, over 2000 appends in node on this machine. CPU was 28.7 % during the
    measurement; `perf/append_cost.js` wrote `append_cost.json` [append.us].
  - The profiles' `open`/`close`/`writeBuffer`/`writeString`/`fsync` self time: 1.45 mean / 3.03 worst ms per update [fix1.A.log].
  - The wrapped `events` part: 2.575 mean / 5.230 worst ms per tick [fix1.B.events].
  - Under stress: 51–59 `world:*` events per frame (median of each stress phase), 123–137 at most. Listener calls: medians
    26–33, 95–110 at most [fix1.events.stress].
- **Consequence for Lane K:** K2(b) did not add a `world:unitMoved` listener, although that would have been the event-driven way.
  - Arithmetic on cited inputs: 300 walking units, each stepping once per `unitStepFrames` = 16 frames
    (`CONFIG.unitStepFrames`, DEUS_World.js:136), make 300 / 16 = 18.75 `world:unitMoved` events a frame.
  - One more listener therefore costs 18.75 × 115.9 µs ≈ 2.17 ms a frame in log writes.
  - DEUS_Depth instead checks a candidate list of units once per frame; see docs/systems/DEUS_Depth.md.
- **Needs:** drop the `|| event.startsWith("world:")` clause (keep the > 20 ms slow-listener log), or make the log asynchronous or buffered.
- **File:** DEUS_Core.js.

## E4. A level switch is a map transfer (as the brief says: out of scope, numbers only)
- **Request to started:** from `UF.Levels.setView` to the new Scene_Map started took 105.0–515.0 ms per switch over 12
  switches [fix1.switch.requestToStarted]. `UF.Levels.stats().lastSwitch.ms` gave 86.7–493.6 ms [fix1.switch.lastSwitchMs].
  - The slowest was a +2 → +1 switch: 515 ms, with `lastSwitch.ms` 493.6 and the planes' peek 0.005 ms [fix1.switch.slowest].
    That is DEUS_Levels' own transfer time, not the planes'.
  - The worst frame in the 30 frames after a switch was 139.3–658.8 ms [fix1.switch.worstFrame].
- **Before (pre-Fix 1, contention, load not recorded):**
  - post-K4: 89.8–168.5 ms (`lastSwitch` 69.8–145.2) [postK4.switch.requestToStarted] [postK4.switch.lastSwitchMs];
  - pre-K4: 90.4–208.0 ms (70.5–183.6) [preK4.switch.requestToStarted] [preK4.switch.lastSwitchMs];
  - branch base: 103.4–290.4 ms (85.8–266.9) [base.switch.requestToStarted] [base.switch.lastSwitchMs].
- **DEUS_Depth's own share of a switch** [fix1.switch.depth]:
  - The new spriteset's planes take their canvases from the pool: 4 canvases made since boot (the `canvases_freed` check) [fix1.switch.depth].
  - They peek cached builds: `lastPeekMs` 0.000–0.010 ms [fix1.switch.depth].
  - They paint once at bind: `lastPaintMs` 1.585–2.590 ms per plane [fix1.switch.depth].
- **Assessment:** the switch is a hitch of 105.0–515.0 ms [fix1.switch.requestToStarted]. With the simulation running, a steady tick is already
  12.665–92.725 ms [fix1.ticks.steady]. The in-place switch is Lane N's (0017-Q, WBS §4 step 7), and these numbers are for them.
- **Files:** DEUS_Levels.js, DEUS_World.js.

## E5. Found on the way (not performance, flagged only)
- **Lower-level combat is invisible.**
  - DEUS_Anim chooses attack, cast and hurt frames only for Game_Events of the viewed level.
  - DEUS_Combat's hitsplats and bars, and RMMZ animations, also need a Game_Event.
  - Through an opening you therefore see lower-level units walk (Lane K K2) but never fight.
  - Showing it needs a path in DEUS_Anim or DEUS_Combat for units without an event. Those files are outside this lane.
- **No projectile, spell-effect or hit-flash code exists in the game.**
  - The 0019-T stress scenario used RMMZ Effekseer animations 6, 11 and 66 for impacts; their flash timings are the hit flash.
  - Arrows and spell orbs in flight are bench-only solid-colour placeholders, listed under `stress.placeholders` in
    `stress_baseline_*.json`.
  - No art was made (DEC-007).
- **`DEUS_Fire.js:674–676`** calls `UF.Anim.hurtColumns` and `UF.Anim.playFrames`. Neither exists in the Anim API, so burn
  hurt frames never play. Found by the K3 survey, not verified further.
- **`UF.Levels.naturalWallCells` and `groundConnectorCells` clamp their window to 0..size-1** (DEUS_Levels.js:3860–3890).
  - The areas loop, so a caller whose window crosses the loop seam gets no cells past it. This was the second half of B1.
  - Since Fix 1, DEUS_Depth splits its window at the seam; the check is `entities_at_seam`.
  - Whether the viewed level's own natural wall sprites have the same gap at the seam was not checked.
- **Harness: no seed pin reachable from Lane K's paths.** DEUS_World reads `UF.NewGameSetup.seed` (DEUS_World.js:2869),
  but the harness (DEUS_Test.js `startNormalGame`) sets only a year. Fix 1 therefore made the suites independent of the
  world with an explicit fixture scene instead of pinning the seed (B2).
  - If a seed pin is wanted for reproducing a run, `--deus-seed=<n>` / `DEUS_TEST_SEED` in DEUS_Test.js would be the place.
  - Both suites print the world seed in their preconditions line.
- **Harness: gate 2's snapshot folder is fixed.** `node tools/test_snapshot.js --name depth ...` uses `%TEMP%\uf_snapshots\depth`,
  so two of those runs at the same time overwrite each other (tools/test_snapshot.js is outside Lane K's paths).
  - Lane K's `lane.json` gate 2 is now `node tools/test_layer_render_flat.js --suite depth`: the same suite and required
    checks, with a folder per run.
  - The old command still passes (evidence/determinism_eb446e06/gate2_old_test_snapshot_depth_x5.log).
- **Correction.** An earlier version of this file said `tasks/WG.00.09b/lane-k/lane.json` was 0 bytes in the lane worktree.
  That was wrong: the review measured 1018 bytes both at HEAD and in the worktree. The note is removed.
