# ORG-0.2 independent delta review: save caller at 40ef50c8

Reviewer: Codex, OpenAI GPT-6-Sol / ultra, independent of the Claude Fable 5.1/max runtime writer. Review date: 2026-10-03, CT. Branch: `task/org-0.2-worldgen-green`; review started at documentation checkpoint `a5140d39a934260a3cb4a5f309623f6a367d6ca9`. Reviewed runtime: `40ef50c8b79f1e26eeb03e5e2e4222af39d1488b`; preceding runtime: `d5d641bfc83da15bc21a80c8abd115c8aa53cecb`. The stopped writer checkpoint was `88d529c88235a9543b6036f883f034fc6aaf0e69`. `git diff --exit-code 40ef50c8 -- game tools/run_tests.js` was empty at the review start. This review certifies only Claude's four added `DEUS_Test.js` lines and its `docs/systems/DEUS_Test.md` row. It does not certify Codex PM documents, which share the reviewer's model family.

**Delta verdict: PASS, narrowly. Overall ORG-0.2 lane acceptance: FAIL. Deus: NOT CHECKED.** The fresh normal `run_tests.bat perf_overlay` run reached the corrected save/load path and ended `RESULT: 13 passed, 0 failed (exit 0)`. Claude's W16 default run on the same runtime remains `RESULT: 469 passed, 60 failed (exit 1)`; it entered all 26 default suites but that does not mean every later assertion in a suite ran. Combat and faction menus ended their own 8 s and 5 s waits; W16 had no `look` watchdog. No full default run was performed by this reviewer. The historical Grok overall FAIL at `4eccbbec` remains on record; this review addresses its finding 3 only. Camps/faction spacing and the distinct same-type hand equipment cases remain parked after two writer attempts. No WBS closure, merge, or green-world claim follows from this delta.

## Code review

`40ef50c8` adds the conditional `$gameSystem.onBeforeSave()` call immediately before `await DataManager.saveGame(slot)` inside `if (!refused)`. The existing guard first checks filesystem availability, explicit `DEUS_TEST_DISPOSABLE_SAVES=1`, an empty save directory, and absent slot 1. The delta changes no guard or assertion. `Game_System.onBeforeSave` in `rmmz_objects.js:351-357` records BGM/BGS state; `onAfterLoad` at `:359-363` replays it. `AudioManager.playBgm` dereferences `bgm.name` at `rmmz_managers.js:1169`, explaining the former null-BGM throw. The engine's autosave and manual-save scenes call `onBeforeSave` before `saveGame` (`rmmz_scenes.js:236-237,2377-2378`), as do the Projects and Levels test callers (`DEUS_Projects.js:1763`, `DEUS_Levels.js:6737-6738`). The added call restores that lifecycle at this fixture. The docs row accurately identifies the addition; its P2 throw reference is historical.

The focused assertions prove that `DataManager.loadGame(1)` resolved and the fixture's own `SceneManager.goto(Scene_Map)` reached the first map draw. They do not compare game-state hashes, prove an identical save/load round-trip, cover the normal `Scene_Load` path, or establish general save safety. The earlier M5/M6 guard-negative runs are writer evidence and were not repeated here. The conditional call would be skipped if `$gameSystem` or its method were absent; ordinary RMMZ save operation itself requires a valid game system, and that branch was not exercised by this run.

## Fresh focused run and evidence

The reviewer created previously absent `scratchpad/lane-worldgen-green/snap_CODEX_C3_40ef50c8_0600/game` from `git archive --format=zip` of the exact runtime SHA, then changed only `DEUS_World.parameters.Seed` in that copy to `1920951434`. `C3_snapshot_validation.txt` compares 4,347 committed game blobs with 4,347 snapshot files: the single mismatch is `game/js/plugins.js` with that Seed override. Before launch, `save/` and `test_output/` were absent, and no `nw.exe` process was seen. Environment: `DEUS_TEST_YEAR=500`, `DEUS_PERF=1`, `DEUS_TEST_RETAIN=1`, and disposable-save opt-in `DEUS_TEST_DISPOSABLE_SAVES=1`; no Z override; one 256×256 area in each direction. Hardware recorded by the normal wrapper: AMD Ryzen 7 8845HS, 16 logical CPUs, 31.3 GB RAM, Radeon 780M and NVIDIA RTX 4060 Laptop GPU. The editor was left running. Command: `.\run_tests.bat perf_overlay --game <C3 snapshot game>`, through `scratchpad/org-0.2/run_controlled4.ps1`.

Run time: 2026-10-03 05:59:43–06:00:30 CT. Batch exit 0; wrapper exit 0; real result `13 passed, 0 failed (exit 0)`. The result includes `load_data_recorded` (slot 1 written into the disposable copy, `loadGame` resolved, 348.98 ms data endpoint) and `load_to_map_recorded` (fixture map transition completed, 6,572.25 ms to first map draw). These are provisional measurements on a red runtime, not performance thresholds. Afterwards, that copy's `save/` held `file1.rmmzsave` (1,308,323 bytes) and `global.rmmzsave` (204 bytes); both remain intact. The unique browser profile was retained at `%TEMP%\uf_test_profile_20192_1791025183141`. `game_runtime.log` recorded process exit 0 and no scene exception was found in the reviewed log. The large runtime log remains in the snapshot and the untracked evidence copy.

I opened `evidence/CODEX_C3_40ef50c8_0600/C3_perf_overlay.overlay.png`: it shows the crowded grassy game map with rain, units, top-right controls, and the performance overlay at upper left. The overlay visibly lists the new-game, data-load and to-map endpoints; it matches the selected fixture's capture, though a screenshot cannot prove state equality. The committed PNG is a copy of the opened snapshot capture (SHA-256 `21AAABDC5172C700D6E49AC1CA575338C783DF42C86E06174CB857D86A164ACD`).

An earlier reviewer attempt, C2, used another new exact-source snapshot with the same sole Seed override, but ran in the filesystem sandbox. NW.js failed during boot at `realpathSync` / `lstat 'C:\Users\snewt'` before entering `perf_overlay`; real result `0 passed, 0 failed (exit 2)`, 2026-10-03 05:58:01–05:58:26 CT. Its 3-byte `harness.on_failure.png` was rejected by the image viewer as invalid image data, so it is **not visual evidence**. C2 was not reused. The even earlier C1 preparation failed when a PowerShell binary pipe corrupted the archive before a game snapshot existed; no NW.js launch was made for C1. Both preparation artifacts were retained. The C3 rerun used a fresh snapshot and normal user-profile access, resolving the sandbox-only boot block without changing runtime code.

## Supplemental DevTools CPU diagnostic

Before the 06:05 CT no-new-native cutoff, an external collector in ignored scratch launched another fresh, source-validated 40ef game copy (C4), with the same Seed/year/world, empty save/output preconditions, unique browser profile, unused local debugging port, and disposable-save opt-in. It attached only to its own `index.html` page. A read-only `Runtime.evaluate` observed `Scene_Map.isStarted()`, seed `1920951434`, `areasX=areasY=1`, `size=256`, and map ID 1000 at both sample endpoints. No engine or plugin code was injected or changed. The only protocol mutation was enabling and starting/stopping the DevTools profiler.

`Profiler.setSamplingInterval` requested 500 µs. The raw `C4_started_map.cpuprofile` has 7,757 samples and 1,045 nodes; its profiler-clock interval is 4,080 ms (2026-10-03 06:03:48.138–06:03:52.383 CT wall timestamps). The results file had only its boot header at both endpoints, before its `SUITE perf_overlay` line. The sample therefore represents the started-map/startup window, which still included object/world generation and file I/O; it is **not** a steady-state map, full worldgen, all-process, GPU, or uncontended FPS profile. The sampling itself adds overhead. `C4_profile_top.txt` reports self time such as 534 ms in `DEUS_Objects.js:121`, 334 ms in its table at `:119`, 174 ms in `DEUS_Tiles.computeShadePlan`, and 163 ms in `DEUS_WorldGen.valueNoise`, alongside file open/close work. These are diagnostic attributions from this one interval, not an optimization ranking or a green-SHA baseline. C4 later exited naturally with its own `RESULT: 13 passed, 0 failed (exit 0)`; the external collector was stopped only after writing its metadata and after NW.js had exited. The browser profile, snapshot, saves, raw profile and outputs remain intact. I opened C4's overlay capture: it likewise shows the started game map, rain, units, controls and the performance overlay with load endpoints.

## GAME TRANSLATION STATUS

- Player / World Effect: no new game mechanic. The change makes the test fixture follow the game's actual save lifecycle so the performance overlay can record its loaded-map endpoint.
- Trigger: requested `perf_overlay` suite on a disposable game copy.
- Runtime Authority and Simulation Path: `DEUS_Test.js` calls `Game_System.onBeforeSave`, then `DataManager.saveGame(1)`, `loadGame(1)`, and the fixture's map transition. `Game_System` owns the saved BGM/BGS fields.
- Engine Bridge and Visible Result: `SceneManager.goto(Scene_Map)` reaches a drawn map; the existing `UF.Perf` overlay displays the data and to-map durations. The C3/C4 opened screenshots show that overlay.
- Persistence: actual slot 1 and global save files were created only in each disposable snapshot. Equality of pre-save and post-load world state was not checked.
- Failure Without This Delta: the previous fixture loaded a `Game_System` with null saved BGM and `onAfterLoad` threw before first-map-draw timing.
- Automated Proof: C3's normal `run_tests.bat perf_overlay` result 13/0; C4's separate native launch also ended 13/0 while supplying the raw CPU profile. Writer W16 default 469/60 remains red.
- In-Game Proof: NW.js harness reached and captured Scene_Map; Owner F5/F8 playtest was not performed. Simulation implemented: NO new simulation. Engine bridge implemented: YES for this fixture path only. Presentation implemented: existing overlay exercised. Input/player interaction implemented: NO. Save/load implemented: fixture uses existing save/load; no new save system. Playable verification performed: NO Owner playtest.

## What changed
- This review added only this independent verdict and its unique C2/C3/C4 evidence. No game, test, system document, manifest, REPORT, HANDOFF, or USAGE file was edited by the reviewer.

## How I tested it
- Reviewed the exact 40ef diff, RMMZ save/audio lifecycle, guard ordering, selected assertions, historical Grok finding 3, writer P4 and W16 results; checked that the current game/tools tree matches 40ef.
- Ran the source-pinned C3 native focused suite and opened its capture; collected and inspected C4's external DevTools CPU profile and opened its capture.

## Evidence
- `evidence/CODEX_C3_40ef50c8_0600/`: prelaunch, blob validation, actual stdout/result, screenshot and run metadata.
- `evidence/CODEX_C4_40ef50c8_0602/`: prelaunch, blob validation, raw profile, metadata, top functions, actual result and screenshot.
- `evidence/CODEX_C2_40ef50c8_0559/`: preserved sandbox boot failure; its invalid capture is not image proof.

## Not done / known problems
- Full lane remains 469/60 red on writer W16. The 60 names and check lines remain in `evidence/W16_40ef50c8_full_perf_on/W16_failures.md`; this reviewer did not rerun or certify them. Profile is a sampled, startup-phase CPU diagnostic. There is no identical-hash round-trip, normal `Scene_Load` proof, green performance baseline, Owner F5/F8 proof, or Deus acceptance.

## Try it in RMMZ
1. On a disposable exact-source game copy with empty `save/`, set Seed 1920951434, year 500 and the same performance/retain/disposable environment, then run `run_tests.bat perf_overlay --game <copy>`; the reviewed C3 run gave 13/0 and drew the loaded map. Owner/editor F5 verification is still needed before any gameplay-complete claim.

## Decisions needed
- No new decision for this four-line fixture correction. Existing camps, equipment, full-lane failures, and final Deus/Owner acceptance remain with the PM and Owner under the lane's existing gates.
