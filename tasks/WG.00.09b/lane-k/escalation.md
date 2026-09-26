# WG.00.09b Lane K: escalation (fixes outside the lane's write set)

Date: 2026-09-26. Writer: Claude (Lane K). Branch `task/lane-k`.

The K3 baselines rank the cost of a frame. Almost all of it is outside Lane K's allowed paths. Per the brief ("If a fix needs a forbidden file, stop and write the finding to escalation.md"), nothing below was changed. Each item gives the measured numbers, the call chain with file:line, and what the fix needs.

## How it was measured
- Tool: `node tools/bench_render_layers.js --scenario normal|stress [--runs n] [--rev <sha>]` (Lane K, K3). It runs on a disposable snapshot copy of `game/` in nw.exe. The DEUS_Test harness is used with the flags from `tools/run_tests.js` plus a DevTools port.
- Per engine tick it records the frame interval, the tick duration, the wrapped update and render parts, and WebGL draw calls.
- CPU profiles come from V8's sampling profiler over the DevTools protocol at a 500 µs interval. "ms per update" means sampled ms divided by the simulation updates in the profiled window.
- Machine: this laptop. GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)". 144 Hz display: the idle frame is 6.95 ms.
- Every run is a fresh New Game with a different seed, about 1,190–1,265 units in the world. Whole-frame numbers therefore vary a lot between runs.
- Files in `tasks/WG.00.09b/lane-k/perf/`:

  | File | What it is |
  |---|---|
  | `baseline_5c6641e1.json`, `stress_baseline_5c6641e1.json` | Pre-K4. 2 runs each. Game code equals 983a9e46. |
  | `baseline_f19b23bf.json`, `stress_baseline_f19b23bf.json` | Post-K4. 2 runs each. |
  | `baseline_8592b07a.json`, `stress_baseline_8592b07a.json` | Branch base, the pre-DEC-011 renderer. 1 run each. |

- Ranking: `node tasks/WG.00.09b/lane-k/perf/rank_k4.js <baseline> <stress_baseline>`. Lane-side before/after: `node tasks/WG.00.09b/lane-k/perf/compare_k4.js <before> <after>`.

## Summary: where a frame goes (post-K4, 12 profiled windows: 8 steady views and 4 stress halves)

| Rank | Cost (ms per simulation update, mean / worst window) | What | Owner file(s) |
|---|---|---|---|
| 1 | 36.6 / 60.6 | Room computation for unit wetness and thermal: E1 | DEUS_Environment, DEUS_Floors, DEUS_Objects |
| 2 | 7.9 / 15.6 (self) | World walkability and unit stepping, full unit scans: E2 | DEUS_World |
| 3 | up to 24.5 (stress, night) | Colonists hazard reflex → Jobs.safeCellNear → World.walkable: E2 | DEUS_Colonists, DEUS_Jobs, DEUS_World |
| 4 | 1.8 / 4.2 | Synchronous log writes in `UF.Events.emit`: E3 | DEUS_Core |
| 5 | 1.2 / 4.4 | Effekseer (RMMZ animations, stress only) | RMMZ libs (read-only) |
| 6 | 2.3 / 3.7 | Garbage collection | all |
| n/a | 90–169 ms per switch | Level switch as a map transfer: E4 | DEUS_Levels, DEUS_World (Lane N) |
| lane | 0.36 / 0.65 (self) | DEUS_Depth after K4 (was 0.63 / 1.06) | Lane K, done |
| lane | 0.03 / 0.09 (self) | DEUS_Minimap after K4 | Lane K, done |
| lane | 0.00 | DEUS_Fog, DEUS_DayNight: not ranked, so not touched (brief K4 rule) | Lane K |

Steady-view frame medians with the simulation running are 30–90 ms (11–33 fps); stress medians are 108–146 ms. With the simulation paused (`UF.Time.pause()`), the same +2 view runs at 6.95 ms (the display's 144 Hz), with a 1.0–1.4 ms tick. So the lag the Owner sees on a layer is the simulation, not the layer rendering.

## E1. Room flood fill per unit per update (the largest single cost)
- **Chain:**
  - `Game_Map.update` (DEUS_Environment.js:796) → `updateEnvironment` (DEUS_Environment.js:720) → `stepUnitThermal` (:559) → `updateWetness` (:418)
  - → `isRoofed` (DEUS_Floors.js:198) → `roomAt` (:152) → `computeRoom` (:127) → `isGap` (:101) / `isBarrier` (:91)
  - → `UF.Objects.atIn` (DEUS_Objects.js:968) → `typeOf` (:101) → the anonymous function at DEUS_Objects.js:82 and `table` (:80)
- **Cost:**
  - Inclusive per simulation update: 27.6 mean / 48.8 worst ms pre-K4 and 36.6 / 60.6 ms post-K4. The difference is the world, not K4, which does not touch this code.
  - DEUS_Objects self time alone is 36 ms per update in the post-K4 windows.
  - Its share of `Scene_Map.updateMain` is 63–74 % in the 12 post-K4 windows and 39–76 % in the 12 pre-K4 windows. Its share of the whole engine tick is 51–70 % post-K4 and 34–71 % pre-K4. It is on every view.
- **Needs:** a room answer that is not recomputed per unit per update.
  - For example, cache `roomAt` per cell with invalidation on `objects:*`, `floors:*` and `levels:shapeChanged`.
  - Or compute roofed/room ids per region once per change.
  - Or run wetness and thermal at a lower rate with LOD (DEC-012).
- **Files:** DEUS_Environment.js, DEUS_Floors.js, DEUS_Objects.js.

## E2. World walkability, unit stepping and the colonist hazard reflex
- **DEUS_World self time:** 7.9 mean / 15.6 worst ms per update. The top self functions are:
  - `World.walkable` (DEUS_World.js:2637)
  - `gridOf` (:1816)
  - `stepOpen` (:2478)
  - `standerAt` (:1059), which calls `World.standerAt` / `cellFree` (:939–962). That scans every unit for one cell.
- **Unit stepping:** `World.update` (:1677) with `stepOffscreen` (:1613) is 6.6 ms per update in the stress window where it made the stored top 60. Its wrapped part `update.map.world` is 4.8 mean / 8.1 worst ms per tick.
- **Colonist hazard reflex (stress night, pre-K4 run 1):** `DEUS_Colonists.scan` (:5250) → `decide` (:5169) → `hazardReflexJob` (:1719) → `DEUS_Jobs.safeCellNear` (:1019) → `standableIn` (:245) → `World.walkable`. That is 23.0 ms per update.
- **Needs:**
  - A spatial occupancy index for units, so a cell query doesn't scan all units.
  - A cached walkability grid per level, invalidated by tile, shape and object events.
  - A bounded search in `safeCellNear`.
- **Files:** DEUS_World.js, DEUS_Jobs.js, DEUS_Colonists.js.

## E3. `UF.Events.emit` writes a log line synchronously for every listener of every `world:*` event
- **Code:** DEUS_Core.js:257–270. After each listener it calls `require('fs').appendFileSync('game_runtime.log', …)` when `dur > 20 || event.startsWith("world:")`. So every `world:*` event, for example `world:unitMoved` on every unit step, costs one synchronous file append per listener.
- **Measured:**
  - One append: 131–139 µs (2,000 appends, node on this machine).
  - The profiles' `open`/`writeBuffer`/`close` self time: 1.8 mean / 4.2 worst ms per update post-K4, 1.5 / 3.0 pre-K4.
  - The wrapped `events` part: 2.3 mean / 4.9 worst ms per tick.
  - Under stress, 44–48 `world:*` events per frame (median), 25–28 listener calls (median), 118 at most.
- **Consequence for Lane K:** K2(b) did not add a `world:unitMoved` listener, although that would have been the event-driven way. At 300 walking units it would have cost about 2.6 ms per frame in log writes. DEUS_Depth instead checks a candidate list of units once per frame; see docs/systems/DEUS_Depth.md.
- **Needs:** drop the `|| event.startsWith("world:")` clause (keep the > 20 ms slow-listener log), or make the log asynchronous or buffered.
- **File:** DEUS_Core.js.

## E4. A level switch is a map transfer (as the brief says: out of scope, numbers only)
- **Request to started:** `UF.Levels.setView` to the new Scene_Map started took 90–169 ms per switch, over 12 switches in 2 post-K4 runs. `UF.Levels.stats().lastSwitch.ms` gave 70–145 ms.
- **Before:** pre-K4, 12 switches took 90–208 ms (`lastSwitch` 70–184 ms). On the branch base, 6 switches took 103–290 ms (86–267 ms).
- **DEUS_Depth's own share of a switch:**
  - The new spriteset's planes take their canvases from the pool: 4 canvases made since boot, 0 after that (the `canvases_freed` check).
  - They peek cached builds: `lastPeekMs` 0.005–0.015 ms.
  - They paint once at bind: `lastPaintMs` about 2–3 ms per plane.
- **Assessment:** the switch is a 6–12 frame hitch at 60 Hz. It does not dominate: the steady simulation costs 30–120 ms in every frame. The in-place switch is Lane N's (0017-Q, WBS §4 step 7), and these numbers are for them.
- **Files:** DEUS_Levels.js, DEUS_World.js.

## E5. Found on the way (not performance, flagged only)
- **Lower-level combat is invisible.** DEUS_Anim chooses attack, cast and hurt frames only for Game_Events of the viewed level. DEUS_Combat's hitsplats and bars, and RMMZ animations, also need a Game_Event. Through an opening you therefore see lower-level units walk (Lane K K2) but never fight. To show it, DEUS_Anim or DEUS_Combat need a path for units without an event. Those files are outside this lane.
- **No projectile, spell-effect or hit-flash code exists in the game.** The 0019-T stress scenario used RMMZ Effekseer animations 6, 11 and 66 for impacts (their flash timings are the hit flash) and bench-only solid-colour placeholders for arrows and spell orbs in flight. `stress_baseline_*.json` lists them under `stress.placeholders`. No art was made (DEC-007).
- **`DEUS_Fire.js:674–676`** calls `UF.Anim.hurtColumns` and `UF.Anim.playFrames`. Neither exists in the Anim API, so burn hurt frames never play. Found by the K3 survey, not verified further.
- **`tasks/WG.00.09b/lane-k/lane.json` is 0 bytes in the lane worktree** (mtime 2026-09-26 00:28, before Lane K wrote anything). The committed version is intact. Lane K did not stage or restore it. The coordinator should check its tooling.
