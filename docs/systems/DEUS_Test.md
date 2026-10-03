# DEUS_Test: test harness

> Naming normalized 2026-09-30 (OPS.PRUNE.06): canonical plugin `game/js/plugins/DEUS_Test.js`; API namespace `DEUS` (`window.UF` remains the runtime alias in `DEUS_Core.js`). Existing dated results and limitations below are retained, not re-tested by this documentation change.

**Owner:** Claude Code · **Files:** `game/js/plugins/DEUS_Test.js`, `tools/run_tests.js`, `run_tests.bat`, `tools/add_test_plugin.js`

## 1. Purpose
Runs named checks inside the real game and reports PASS/FAIL for each. It replaces the old autotest in `DEUS_Core.js`, which printed success no matter what. It does nothing unless the game is started with `--uf-test`, so normal play and the editor's Playtest are unaffected.

## 2. Public API
Register suites from any plugin that loads **before** `DEUS_Test` runs its suites (any plugin; suites start once the map is up):

```js
if (window.UF && DEUS.Test) {
    DEUS.Test.suite("cursor", async t => {
        t.check("visible", someCondition, "detail shown on PASS or FAIL");
        await t.waitFrames(30);                                    // wait N rendered frames
        await t.waitUntil(() => $gamePlayer.x === 40, 5000, "cursor to reach x=40"); // rejects on timeout
        t.screenshot("after_move");                                // saves test_output/cursor.after_move.png
    });
}
```

| Member | What it does |
|---|---|
| `DEUS.Test.active` | `true` only in a test run. Use it to skip test-only setup elsewhere. |
| `DEUS.Test.suite(name, fn, { isDefault })` | Registers a suite. `isDefault: false` means it only runs when named (`run_tests.bat <name>`). |
| `t.check(name, condition, detail)` | Records PASS or FAIL. Returns the boolean. |
| `t.waitFrames(n)` | Promise that resolves after `n` frames. |
| `t.waitUntil(testFn, timeoutMs, what)` | Promise that resolves when `testFn()` is true, checked every frame. Rejects on timeout, which fails the suite with a `suite_completed` FAIL. |
| `t.screenshot(name)` | Saves the current screen to `game/test_output/<suite>.<name>.png` and returns the path. |
| `t.errorsSoFar()` | Uncaught errors recorded so far in this run. |
| `DEUS.Time.setForTest(hour, minute?, day?)` | Test clock (DEUS-TSK-FABLE-07), installed by `DEUS_Test` only in a test run: puts the calendar `$ufTime` (DEUS_Core) at that time and leaves it running at its normal rate; pause, speed and survival routines untouched. Returns `{ hour, minute, day }`, or `null` outside a test run. Proven by `tools/test_autonomous_settlement_closure.js` (`test_clock_hook`) and used by the `settlement` suite. |

Name checks after what they prove (`moves_8_dirs`, not `test3`). Every acceptance criterion in `docs/SLICES.md` that a script can judge maps to a named check.

## 3. Events
None.

## 4. Save data
None. It reads `DataManager.makeSaveContents()` in the `smoke` suite but never saves.

## 5. Checks provided
| Suite | Check | Proves |
|---|---|---|
| `selftest` (on request) | `pass_path`, `fail_path` | The harness can PASS and can FAIL. `fail_path` is supposed to FAIL. |
| `smoke` (default) | `reached_map` | New Game reaches a map scene |
| | `player_not_visible` | No protagonist is drawn (V4) |
| | `event_drawn.<name>` | Each event with an image is really drawn: loaded, visible, on screen, has opaque pixels |
| | `save_serializes` | The save data can be written (if it fails, the detail names the failing top-level key) |
| | `colony_state_in_save` | Colonist data is part of the save |
| | `no_errors` | No uncaught error or scene exception in the first ~3 s on the map |
| `perf` (on request) | `avg_frame_under_17ms`, `worst_frame_under_50ms` | Frame time over 30 s, with the numbers in the detail |
| `perf_overlay` (on request, `DEUS_PERF=1`) | `perf_source`, `frames_observed`, `renders_observed`, `sim_ticks_counted`, `newgame_recorded`, `heap_reported`, `load_not_invented`, `pause_stops_ticks_not_frames`, `off_on_boundary`, `log_line_written`, `log_failure_detected`, `load_data_recorded`, `load_to_map_recorded` | `UF.Perf` (DEUS_Core, off by default; `DEUS_World` reports its ticks) counts real Pixi ticker callbacks and `app.render` calls, counts the actual simulation ticks exactly as `UF.Sim.tickCount` does, records the boot New Game (synchronous setup and time to the first draw of the started map), reports the heap or null, records no load when none happened, stops counting ticks while the world is paused, writes a `[PERF]` line to `game_runtime.log` that carries the call's own tag and grows the file (a forced append failure must make `logNow` return null), keeps disabled time out of the interval samples (`off_on_boundary`), and records a real save-then-load only behind a fail-closed isolation guard (the environment must say `DEUS_TEST_DISPOSABLE_SAVES=1` and the game folder's save directory must hold no file at all, no slot, no global metadata, no backup; otherwise nothing is written and both load checks fail with the reason and the game path; the suite never deletes, moves or overwrites), the data-load endpoint and the to-map endpoint being separate checks (the to-map endpoint is this suite's own map transition, which threw in P2 and is reported, not claimed); the independent listener and any pause the suite set are restored in a finally; the off/on proof counts the new interval samples against the independent listener instead of reading a retained interval; then shows the overlay (`perf_overlay.overlay.png`). Since the second round the counters are compared with an independent ticker listener over wall-clock windows, not with harness update counts. Numbers are provisional measurements on a red SHA, with no pass threshold |
| any suite | `suite_completed` | FAIL only: the suite threw (`<message> [<where>]`), ran past its 180 s watchdog (`watchdog: suite took longer than 180 s (budget per suite); last check <name>`), or returned only after that budget |

## 6. Status
- Works (checked 2026-09-18 on a snapshot copy of the game): `selftest` exits 1 with `fail_path` FAIL; `smoke` ran and caught the save crash (AUDIT_LOG A2-1).
- Known limits:
  - NW.js doesn't pass exit codes back to the shell, so `run_tests.js` reads the code from the `RESULT` line. It deletes the old results file before each run, so a run that never starts can't reuse old results.
- Watchdogs (2026-10-03, ORG-0.2 overnight item 1; before it one 180 s timer bounded the whole run and at year 500 only 9-10 of the default suites were reached): every suite has its own 180 s budget (`SUITE_BUDGET_MS` in `DEUS_Test.js`). Past it the harness writes `FAIL <suite>.suite_completed - watchdog: suite took longer than 180 s (budget per suite); last check <name>`, saves `test_output/<suite>.on_timeout.png`, rejects that suite's pending `t.waitFrames` / `t.waitUntil` promises (the stalled suite unwinds at its next `await`; a wait it asks for afterwards is refused), and starts the next suite. Anything the expired suite still records is written as `LATE PASS|FAIL <suite>.<check> ... (after the suite's watchdog; not counted)` and left out of the totals; `HARNESS late: suite <name> ended <s> s after it started ...` records when and how it unwound. A suite that returns only after its budget (it blocked the frame loop, so its timer could not fire in time) also fails `suite_completed`. The map-start wait keeps its own 180 s (`MAP_START_MS`). Before the first suite the harness writes `HARNESS suite budget 180 s each; <n> suite(s) selected: <names>`, and before `RESULT` it writes `HARNESS watchdog: <k> suite(s) exceeded 180 s: <names>` when any did. `tools/run_tests.js` no longer kills `nw.exe` at a fixed 240 s: it kills the whole `nw.exe` tree (`taskkill /T /F`, then `child.kill()`) when `results.txt` has not changed for 240 s (`STALL_MS`, longer than the map-start wait, so a slow New Game is not a hang) or when the run passes its hard cap of 180 s + n x 180 s + 60 s, computed from the budget line (`HARNESS: <n> suite(s) x 180 s budget; hard cap <s> s from launch` on stdout). A kill is named on stderr (`HARNESS: <reason>, killing nw.exe`) and, with no `RESULT` line, the run exits 2. Retain mode (2026-10-03, Owner no-delete rule): with `DEUS_TEST_RETAIN=1` in the environment or `--retain` on the command line the runner deletes nothing: a game folder whose `test_output` already holds a `results.txt` or a PNG is refused before launch (`HARNESS: retain mode refuses ...`, exit 2, nothing touched; use a fresh `git archive <sha> game` snapshot), so a stale RESULT can never be read as the run's own and the harness's start-of-run output cleanup finds nothing to remove; the unique browser profile must not pre-exist and is kept after the run (`HARNESS: retain mode kept the browser profile at <path>`). Without the mode the runner behaves as before (results file removed before launch, profile removed after). The in-game harness itself still unlinks old PNGs and `results.txt` in `test_output` when it starts; on a verified-empty snapshot that is a no-op. A complete default run is therefore bounded by 180 + n x 180 + 60 s (n = 25 default suites on 2026-10-03: 1.3 h) and takes as long as its suites take otherwise; gate manifests that give `tools/run_tests.js` 300 s (for example `tasks/ORG-0.2/lane-worldgen-green/lane.json`) are shorter than a full run and need the PM's attention.
  - Not yet registered in the real `game/js/plugins.js` (the RMMZ editor was open). See STATUS → Tools.
  - Input simulation helpers (pressing keys, moving the mouse) don't exist yet. For cursor checks, set `Input._currentState[...]` or call the cursor's own move function, and say which one in the check's detail.
- Native Playtest smoke (2026-09-24, DEUS-TSK-FABLE-19A gate): `node tools/native_smoke_19a.js --game <snapshot game folder> [--provoke tamper|nodig|error|gen]` starts the real `nw.exe` with the editor's Playtest argument (`test`) and drives it over the DevTools protocol (no DEUS_Test plugin, no `plugins.js` change): New Game through the title's setup window and Embark, the console checker `tools/smoke_19a_playtest.js` (which a person can paste into F8 during an editor F5 run instead), a save, a load through the game's Load screen, a second process loading the same slot, screenshots after each step, every page exception, `console.error` and missing file. It refuses the project's own `game/` (its `save/` holds the user's saves). The literal editor F5 run stays a person's.
- Running it: `run_tests.bat` (default suites), `run_tests.bat smoke`, `run_tests.bat selftest`, `run_tests.bat perf`. Results are in `game/test_output/results.txt`. To test a disposable copy of the game: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js --game <copy>`.
