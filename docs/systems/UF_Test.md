# UF_Test: test harness

**Owner:** Claude Code · **Files:** `game/js/plugins/UF_Test.js`, `tools/run_tests.js`, `run_tests.bat`, `tools/add_test_plugin.js`

## 1. Purpose
Runs named checks inside the real game and reports PASS/FAIL for each. It replaces the old autotest in `UF_Core.js`, which printed success no matter what. It does nothing unless the game is started with `--uf-test`, so normal play and the editor's Playtest are unaffected.

## 2. Public API
Register suites from any plugin that loads **before** `UF_Test` runs its suites (any plugin; suites start once the map is up):

```js
if (window.UF && UF.Test) {
    UF.Test.suite("cursor", async t => {
        t.check("visible", someCondition, "detail shown on PASS or FAIL");
        await t.waitFrames(30);                                    // wait N rendered frames
        await t.waitUntil(() => $gamePlayer.x === 40, 5000, "cursor to reach x=40"); // rejects on timeout
        t.screenshot("after_move");                                // saves test_output/cursor.after_move.png
    });
}
```

| Member | What it does |
|---|---|
| `UF.Test.active` | `true` only in a test run. Use it to skip test-only setup elsewhere. |
| `UF.Test.suite(name, fn, { isDefault })` | Registers a suite. `isDefault: false` means it only runs when named (`run_tests.bat <name>`). |
| `t.check(name, condition, detail)` | Records PASS or FAIL. Returns the boolean. |
| `t.waitFrames(n)` | Promise that resolves after `n` frames. |
| `t.waitUntil(testFn, timeoutMs, what)` | Promise that resolves when `testFn()` is true, checked every frame. Rejects on timeout, which fails the suite with a `suite_completed` FAIL. |
| `t.screenshot(name)` | Saves the current screen to `game/test_output/<suite>.<name>.png` and returns the path. |
| `t.errorsSoFar()` | Uncaught errors recorded so far in this run. |
| `UF.Time.setForTest(hour, minute?, day?)` | Test clock (DEUS-TSK-FABLE-07), installed by `DEUS_Test` only in a test run: puts the calendar `$ufTime` (DEUS_Core) at that time and leaves it running at its normal rate; pause, speed and survival routines untouched. Returns `{ hour, minute, day }`, or `null` outside a test run. Proven by `tools/test_autonomous_settlement_closure.js` (`test_clock_hook`) and used by the `settlement` suite. |

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

## 6. Status
- Works (checked 2026-09-18 on a snapshot copy of the game): `selftest` exits 1 with `fail_path` FAIL; `smoke` ran and caught the save crash (AUDIT_LOG A2-1).
- Known limits:
  - NW.js doesn't pass exit codes back to the shell, so `run_tests.js` reads the code from the `RESULT` line. It deletes the old results file before each run, so a run that never starts can't reuse old results.
  - Not yet registered in the real `game/js/plugins.js` (the RMMZ editor was open). See STATUS → Tools.
  - Input simulation helpers (pressing keys, moving the mouse) don't exist yet. For cursor checks, set `Input._currentState[...]` or call the cursor's own move function, and say which one in the check's detail.
- Native Playtest smoke (2026-09-24, DEUS-TSK-FABLE-19A gate): `node tools/native_smoke_19a.js --game <snapshot game folder> [--provoke tamper|nodig|error|gen]` starts the real `nw.exe` with the editor's Playtest argument (`test`) and drives it over the DevTools protocol (no UF_Test plugin, no `plugins.js` change): New Game through the title's setup window and Embark, the console checker `tools/smoke_19a_playtest.js` (which a person can paste into F8 during an editor F5 run instead), a save, a load through the game's Load screen, a second process loading the same slot, screenshots after each step, every page exception, `console.error` and missing file. It refuses the project's own `game/` (its `save/` holds the user's saves). The literal editor F5 run stays a person's.
- Running it: `run_tests.bat` (default suites), `run_tests.bat smoke`, `run_tests.bat selftest`, `run_tests.bat perf`. Results are in `game/test_output/results.txt`. To test a disposable copy of the game: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js --game <copy>`.
