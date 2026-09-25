# Task State: Lane G — ATK-YEAR0-002 Runtime Year 0 Fix

- **Lane:** G
- **Task ID:** `ATK-YEAR0-002`
- **WBS ID:** `WG.00.11`
- **Role:** Writer: Claude CLI (Fable) | Reviewer: Grok (adversarial review)
- **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-g`
- **Branch:** `task/lane-g` (base `37ac57da`)
- **Status:** FIX COMMITTED, waiting on coordinator decisions (see Current Gate). Not merged.

## Owned File Set
- `game/js/plugins/DEUS_Core.js` (edited)
- `game/js/plugins/DEUS_History.js` (edited)
- `game/js/plugins/DEUS_HistoricalDemographics.js` (edited)
- `game/js/plugins/DEUS_FactionMenus.js` (no edit needed, see below)
- `game/js/plugins/DEUS_Test.js` (edited)
- `tasks/lane-g/state.md`

## Current Gate
Two test files outside the Lane G write set conflict with the fix. Neither can be changed from this lane, so the coordinator has to decide before merge:
1. **`tools/test_new_game_year0.js` cannot exit 0 unmodified, whatever the plugin code does.** It needs the promotion it asks for (drop `KNOWN_OPEN`, replace the discrimination run). The diff is below.
2. **`tools/test_historical_carrying_capacity.js` (ASTRA-14) pins `DEUS_HistoricalDemographics.js` to the frozen HIST-09 candidate hash.** Any edit fails it, including the ones this brief requires. Decide: re-freeze, or reject the demographics part.
3. **`tools/test_history_materialization_and_world_age.js` (ASTRA-15) pins the old contract**, under which Year 0 gives demographic year 1 and has the same data as Year 1. The brief's contract replaces that. Update the two assertions shown below.

Grok closure review comes after those decisions.

## What changed
- `DEUS_Core.js`
  - `Game_UFTime` constructor: `this.year` is the setup year when it is an integer ≥ 0, else 0. The old `(… UF.NewGameSetup.year) || 1` turned 0 into 1.
  - New `resetCalendar()`, called from a `DataManager.setupNewGame` hook before the original runs, which is before `Game_Player.setupForNewGame` builds the world. It resets hour, minute, day, month, year and the timer. Pause and HUD are left alone, because DEUS_TimeSpeed mirrors its pause state into `$ufTime.isPaused`. This is the brief's "line 409 re-sync". It also fixes the Lane B found-by-reading issue: a New Game started after a Load kept that save's date.
- `DEUS_HistoricalDemographics.js`
  - `create()` accepts a source history whose `startYear` is 0 or 1, and uses it as the model's start year. That covers `startYear`, `currentYear`, founder `born = startYear - age`, dynasty `foundedYear`, and the source-site `founded` check.
  - `validate()` accepts `startYear` 0 or 1. The lower bounds that were hard-coded to 1 now use `state.startYear`: site `foundedYear`, partnership `fromYear` (imported ones equal it), ruler `fromYear`, succession start, and event years.
  - Saves with `startYear: 1` validate exactly as before, so there is no schema bump. Code older than this commit rejects a Year 0 save (forward compatibility only).
- `DEUS_History.js`
  - `generate()`: `foundedYear = targetYear === 0 ? 0 : 1`, passed to `found()`. Sites, rulers, founding events and `history.startYear` use it.
  - The existing-history guard also compares `startYear`, so Year 0 and Year 1 are now different eras.
  - `steps` is unchanged (`targetYear <= 1 ? 0 : targetYear`). `$ufTime.year = demographics.currentYear` is unchanged, and now writes 0.
  - Chronicle window: founding lines are pinned at the world's founding year (`Math.min(1, …sites.founded)`), not at year 1.
  - In-game `add_event` check: `ev.year >= 0`.
- `DEUS_Test.js`: no-menu harness path.
  - `--deus-year=<n>`, `--uf-year=<n>` or the environment variable `DEUS_TEST_YEAR=<n>` sets `UF.NewGameSetup.year` before `setupNewGame`. `tools/run_tests.js` passes its environment on, so it needs no change.
  - A year already set in `UF.NewGameSetup` is kept.
  - An invalid request ends the run with exit 2.
  - With no request, the old default (UF_History's 500 years) is unchanged.
- `DEUS_FactionMenus.js`: nothing to change. `setYear` already floors at 0 (`:491`), and the in-game assertion is already `year_clamped_min_0` (`:1615`), both from Lane B `37ac57da`. Section A covers both (`set_year_0_is_0`, `set_year_negative_clamps_0`).

### Deviation from the brief
- **Brief item 2 asked for `steps = targetYear <= 0 ? 0 : targetYear`.** With Year ≥ 1 worlds still starting at 1, that makes setup year 1 run one step and give clock 2. I kept `targetYear <= 1 ? 0 : targetYear` and start the model at 0 only for target 0. Result: 0→0 and 1→1, and N>1 is byte-identical to HEAD (evidence below).

## Done, with evidence (all run 2026-09-25 in this worktree)
1. Baseline on HEAD, before editing: `node tools/test_new_game_year0.js --strict` exited 1. Sections A and B passed. Section C had 3 OPEN checks: clock 1, save 1, constructor 1, with `startYear 1`, `demographicsCurrentYear 1`.
2. After the fix, **unmodified** `node tools/test_new_game_year0.js --strict` still exits 1:
   ```
   [PASS] new_game_pipeline_ran: world:created listeners built history (true) with 0 console errors
   [FIXED?] new_game_clock_year_is_0: Clock year after a Year 0 New Game: 0 (expected 0)
   [FIXED?] new_game_save_year_is_0: deusTime.year in the first save of a Year 0 New Game: 0 (expected 0)
   [FIXED?] clock_constructor_keeps_year_0: new Game_DEUSTime() with UF.NewGameSetup.year 0: year 0 (expected 0)
   history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72}
   ...12 mutants [PASS]...
   Error: Override anchor found 0 times in DEUS_Core.js: this.year = (window.UF && UF.NewGameSetup && UF.NewGameSetup
   ```
   Everything in A, B and C passes: 39 `[PASS]` lines plus 3 `[FIXED?]`. The exit 1 comes from two things in the test file itself:
   - `SECTION_C_DISCRIMINATION` patches the old `|| 1` line, which no longer exists.
   - Any `KNOWN_OPEN` check that passes is reported as a problem ("drop it from KNOWN_OPEN").
3. Mutant "restore `|| 1` in DEUS_Core.js", applied in memory and run through the **unmodified** suite with `--strict`: caught.
   ```
   [OPEN ATK-YEAR0-002] clock_constructor_keeps_year_0: new Game_DEUSTime() with UF.NewGameSetup.year 0: year 1 (expected 0)
   TEST SUITE FAILED: ... FAIL clock_constructor_keeps_year_0 (--strict)   (exit 1)
   ```
4. The suite with the promotion applied in memory (the diff below) exits 0:
   - `SETUP CONTRACT PASSED: 30 gating checks ...`
   - `INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.`
   - Its three Section C mutants are all caught: `core_restores_or_1` (1 failing check), `history_founds_year_0_at_1` (2), `history_clock_floor_1` (2).
   - The summary's "12 mutants" counter doesn't count them.
5. Only Year 0 changed (headless New Game, real plugins, seed 424242, HEAD sources via `git show` vs. working tree):
   - Year 1: the history, units and factions hashes match HEAD exactly; clock 1/1.
   - Year 42: the history, units and factions hashes match HEAD exactly; clock 43/43.
   - Year 0 world: clock 0, save 0, `validate()` ok.
     - Demographics: `startYear` 0, `currentYear` 0.
     - Founding year 0 everywhere: sites, dynasties, rulers, partnerships and event years are all `[0]`. The chronicle's founding events are year 0.
     - The oldest founder was born in year -18.
     - 72 living people and 72 units; unit ages equal `currentYear - born`.
   - Year 0 against Year 1 with the years taken out: identical people, ages, households, rulers, sites, event texts and unit positions.
6. Calendar re-sync probe (DEUS_Core in a VM, `setupNewGame` stub that records the clock).
   - Loaded a save at 3:30, day 17, month 5, year 7, with pause on and HUD off, then started a Year 0 New Game. The world build saw 8:0, day 1, month 0, year 0, timer 0. Pause (true) and HUD (false) were kept.
   - Setup years: 42 → 42. `undefined`, `"SENTINEL"`, -3, 1.5 and `{}` → 0.
   - Mutants "hook removed" and "reset keeps old year": both caught.
7. DEUS_Test year-request probe (VM with stubbed NW.js, fs and engine).
   - No request: `UF.NewGameSetup` untouched.
   - `--deus-year=0` and `DEUS_TEST_YEAR=0` both give `{year:0}`.
   - `--uf-year=42` wins over the environment variable.
   - A preset year is kept. A preset seed is kept, with the year added.
   - `abc` and `-1` stop the run with exit 2, and `setupNewGame` isn't called.
   - Mutant "request ignored": 3 of 4 cases fail.
8. Chronicle probe: Year 0 world plus 30 play events, `ChronicleWindow.prototype.drawChronicle` on a fake window.
   - The 9 founding lines are drawn first, then the newest events, ending at `TEST_event 30`. The same holds for Year 1.
   - Mutant (pin year 1 only): the first line is `TEST_event 4`. Caught.
9. Other history suites, before → after:
   - `test_historical_carrying_capacity.js`: PASS → **FAIL** `CANDIDATE_MISMATCH: working plugin differs from frozen candidate`. This is the Gate 2 hash pin. Its behaviour checks run from the `4af58dd` Git snapshot, not the working file.
   - `test_history_materialization_and_world_age.js`: PASS, 29 checks → **FAIL** `WORLD_AGE: target does not map to frozen annual clock` on the first Year 0 row (Gate 3). I then applied only the two assertion changes proposed below, in memory, through a Node `registerHooks` load hook in `NODE_OPTIONS`, so its worker processes got them too. Result: `RESULT: 29 passed, 0 failed`, exit 0, 116 s.
     - `ERA year=0` passes for seeds 0, 424242 and 20260919, with 72 living people each.
     - The year 100/250/500 living and ancestor counts are identical to the HEAD baseline (for example seed 0: 761/188, 984/1582, 1080/4178).
   - Already failing on HEAD, same message after:
     - `test_hist_metadata_contracts.js`: `FATAL: History: HistoricalDemographics, Callings and Dnd5e must be loaded before New Game`.
     - `test_production_history_demographics.js`: `Production candidate mismatch before regression tests`. It pins the older `8a40d2e` candidate.
     - `test_second_by_second_history.js`: `TypeError … reading 'generate'`.
10. `node --check` passes on all four edited plugins.

All probes and in-memory mutants were run from stdin with no files written. The one exception is a scratch output file in Git Bash `/tmp`, which I deleted right away. Two test tools write to the OS temp folder as part of their normal runs: `test_history_materialization_and_world_age.js` makes a temporary save directory and deletes it; `test_historical_carrying_capacity.js` writes nothing.

## Proposed test changes (owners outside Lane G)
`tools/test_new_game_year0.js`, the promotion the suite asks for:
```diff
-const KNOWN_OPEN = new Set(["new_game_clock_year_is_0", "new_game_save_year_is_0", "clock_constructor_keeps_year_0"]);
+const KNOWN_OPEN = new Set();
-const SECTION_C_DISCRIMINATION = { ... };                 // anchors the removed `|| 1` line
+const SECTION_C_MUTANTS = [
+    { name: "core_restores_or_1", kills: ["clock_constructor_keeps_year_0"],
+      edit: { DEUS_Core: { "this.year = Number.isInteger(setupYear) && setupYear >= 0 ? setupYear : 0;": "this.year = (window.UF && UF.NewGameSetup && UF.NewGameSetup.year) || 1;" } } },
+    { name: "history_founds_year_0_at_1", kills: ["new_game_clock_year_is_0", "new_game_save_year_is_0"],
+      edit: { DEUS_History: { "const foundedYear = targetYear === 0 ? 0 : 1;": "const foundedYear = 1;" } } },
+    { name: "history_clock_floor_1", kills: ["new_game_clock_year_is_0", "new_game_save_year_is_0"],
+      edit: { DEUS_History: { "if (live && window.$ufTime) $ufTime.year = demographics.currentYear;": "if (live && window.$ufTime) $ufTime.year = Math.max(1, demographics.currentYear);" } } }
+];
 // in main(): replace the `disc` / section_c_checks_can_pass block with a loop over SECTION_C_MUTANTS
 // (mutantResult(m, runSectionC(a.payload, m.edit).checks)), and count them in the summary line.
```
`tools/test_history_materialization_and_world_age.js`, the new Year 0 contract:
```diff
-    assert(d.yearsSimulated === steps && d.currentYear === steps + 1, "WORLD_AGE: ...");
+    const start = targetYear === 0 ? 0 : 1;
+    assert(d.yearsSimulated === steps && d.startYear === start && d.currentYear === start + steps, "WORLD_AGE: ...");
-    assert(alias.coreSha256 === dawn.coreSha256 && alias.unitsSha256 === dawn.unitsSha256, "DAWN_ALIAS: ...");
+    assert(dawn.currentYear === 0 && alias.currentYear === 1 && alias.living === dawn.living && alias.records === dawn.records, "DAWN_ALIAS: ...");
```
Also update the `methodology` string, which says "Year0/1 are founders … core currentYear=N+1".

`tools/test_historical_carrying_capacity.js`: re-freeze `CANDIDATE`, `CANDIDATE_SHA256` and `CANDIDATE_BYTES` to the new commit, or reject the demographics change (owner/coordinator).

## Not done / known problems
- **Native RMMZ run not done** (the F5 playtest or `tools/run_tests.js`). The containment rules keep writes inside this worktree, and a native run needs a snapshot under `%TEMP%` plus the gitignored stand-in images. So there is no screenshot, and the AGENTS.md Definition of Done is **not met** for the native part.
  - Suggested run: `DEUS_TEST_YEAR=0 node tools/run_tests.js history --game <snapshot>`.
  - Then look at the clock HUD year, and at the chronicle (H) with its founding lines at year 0.
- **Setup year N>1 still gives clock N+1** (42 → 43, unchanged from HEAD). This is the frozen HIST-10 contract ("N>1 means N annual steps from year 1"), which ASTRA-15 pins. So native `setup.clock_year_is_42` still fails. Changing it would move every era's demographics RNG (it is keyed by year) and needs an owner decision. Not in this brief.
- **In-game `history` suite, `no_years` check** (`DEUS_History.js` around `:3877`): it expects year-1 founding lines and 0 simulated years. Its `regenerate()` worlds use the default 500 years, so it is stale on HEAD already, independent of this fix. Left as is.
- `History.currentYear()` has a fallback for when there is no clock (`h.years || 1`). It would say 1 for a Year 0 history without a clock. The runtime always has a clock, so it is left as is.
- Old code rejects a Year 0 demographics save (`startYear 0`). New code loads all old saves.

## Exact next step
- Gemini (coordinator):
  - Decide Gates 1–3.
  - Apply or assign the test changes above.
  - Re-run `node tools/test_new_game_year0.js --strict`; expected exit 0.
  - Re-run `node tools/test_history_materialization_and_world_age.js`.
  - Run the native check.
- Grok: adversarial closure review of `task/lane-g`.

## Open questions / defects
- Gate 2: the HIST-09 candidate freeze versus the brief's required demographics edits. Which wins?
- Setup year N>1 → clock N+1: keep the HIST-10 contract, or make the model 0-based for every era? That changes the RNG streams and every pinned era hash.
