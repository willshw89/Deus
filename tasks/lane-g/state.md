# Task State: Lane G — ATK-YEAR0-002 Runtime Year 0 Fix and Test Maintenance

- **Lane:** G
- **Task ID:** `ATK-YEAR0-002`
- **WBS ID:** `WG.00.11`
- **Role:** Writer: Claude CLI (Fable) | Reviewer: Grok (adversarial review)
- **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-g`
- **Branch:** `task/lane-g` (base `37ac57da`; runtime fix `0859ed3c`; test maintenance in the commit after it)
- **Status:** RUNTIME FIX AND TEST MAINTENANCE COMMITTED (Directive 001-F §2). Waiting on Grok closure review. Not merged.

## Owned File Set
- `game/js/plugins/DEUS_Core.js` (edited in `0859ed3c`)
- `game/js/plugins/DEUS_History.js` (edited in `0859ed3c`)
- `game/js/plugins/DEUS_HistoricalDemographics.js` (edited in `0859ed3c`)
- `game/js/plugins/DEUS_FactionMenus.js` (no edit needed, see below)
- `game/js/plugins/DEUS_Test.js` (edited in `0859ed3c`)
- `tools/test_new_game_year0.js` (edited, Directive 001-F §2a)
- `tools/test_history_materialization_and_world_age.js` (edited, Directive 001-F §2b)
- `tools/test_historical_carrying_capacity.js` (edited, Directive 001-F §2c)
- `tasks/lane-g/state.md`

## Current Gate
Gates 1–3 from the runtime-fix report were decided by Directive 001-F §2: promote Section C, move ASTRA-15 to the Year 0 contract, and re-freeze ASTRA-14 (owner approved). All three suites now exit 0; see "Test maintenance" below. What remains:
- Grok closure review of `task/lane-g` (both commits). The review includes a byte diff of Section C against `37ac57da`.
- Native RMMZ run (see Not done).

## Test maintenance (Directive 001-F §2), 2026-09-25
### What changed
- `tools/test_new_game_year0.js`
  - `KNOWN_OPEN` is now empty. `new_game_clock_year_is_0`, `new_game_save_year_is_0` and `clock_constructor_keeps_year_0` are gating. The `KNOWN_OPEN` mechanism is kept for future checks.
  - `runSectionC` is byte-identical to `37ac57da`: SHA-256 `45b883ee…7a5`, 1799 bytes, the same in both versions.
  - The Section D discrimination run's Core anchor is now the new line, `this.year = Number.isInteger(setupYear) && setupYear >= 0 ? setupYear : 0;`. The replacement is the same independent "setup year straight into the clock" edit as before.
  - New `SECTION_C_MUTANTS`, counted in the summary line:
    - `core_restores_or_1 (pre-ATK-YEAR0-002 code)`: the real "restore `|| 1`" mutant. It puts back the exact pre-fix line.
    - `history_founds_year_0_at_1`
    - `history_clock_floor_1`
  - Header comment, Section C heading, the `OPEN` tag and the not-met message no longer describe ATK-YEAR0-002 as open.
- `tools/test_history_materialization_and_world_age.js`
  - `WORLD_AGE` uses the brief's text: `const start = targetYear === 0 ? 0 : 1;` and `d.startYear === start && d.currentYear === start + steps`.
  - `DAWN_ALIAS` uses the brief's text: `dawn.currentYear === 0 && alias.currentYear === 1 && alias.living === dawn.living && alias.records === dawn.records`.
  - Both assertion messages keep their prefixes. The DAWN_ALIAS message now describes the new check.
  - The report's `methodology` string now states the Year 0 contract.
- `tools/test_historical_carrying_capacity.js`
  - `CANDIDATE` is now `0859ed3c6e3ea475abad9e00353f8961cfcec2cc`.
  - `CANDIDATE_SHA256` is now `fca4a15abc45a88bff836d97ab77936581e4679fe104e17b2596d079f9015cdc`.
  - `CANDIDATE_BYTES` is now `52898`.
  - New `BOOTSTRAP` is `4af58dd…`. See the deviations below.

### Deviations from the brief (test maintenance)
- **ASTRA-14: re-freezing the constants alone cannot pass.** `frozenBundle()` loads World, WorldGen, Factions, History and Levels from the candidate commit, and then the plugin.
  - With `CANDIDATE = 0859ed3c` the run stops at `load()`: `FAIL: Error: History: HistoricalDemographics, Callings and Dnd5e must be loaded before New Game (DEUS_History:384)`. I observed this.
  - That requirement is not new in this lane. It is absent at `4af58dd` and present at `0859ed3c` (grep count 0 vs 1).
  - With `CANDIDATE` left at `4af58dd`, a new `CANDIDATE_SHA256` fails the frozen-snapshot hash check at line 89.
  - Smallest change that works: `frozenBundle(commit, pluginCommit = commit)`. `sourceBundle()` now calls `frozenBundle(BOOTSTRAP, CANDIDATE)`, so only the plugin under test comes from `0859ed3c`. The Year-1 founding world that the contracts run on stays at the HIST-09 bootstrap.
  - Each `sources[]` entry records its own commit. The report's `candidate` object gains `bootstrap`.
  - The legacy v6 bundle is unchanged: `frozenBundle(LEGACY)` reads everything from one commit, as before.
- **Two extra Section C mutants** (`history_founds_year_0_at_1`, `history_clock_floor_1`), beyond the one the brief names. The restore-`|| 1` mutant only kills `clock_constructor_keeps_year_0`. Without these two, the newly gating clock and save checks would have no mutant in the suite (AGENTS.md Rule 4). They are easy to drop if the coordinator objects.

### Evidence (all run 2026-09-25 in this worktree, working tree = `0859ed3c` plugins + these test edits)
1. `node tools/test_new_game_year0.js --strict`: **exit 0**. The same command without `--strict` also exits 0.
   ```
   [PASS] new_game_clock_year_is_0: Clock year after a Year 0 New Game: 0 (expected 0)
   [PASS] new_game_save_year_is_0: deusTime.year in the first save of a Year 0 New Game: 0 (expected 0)
   [PASS] clock_constructor_keeps_year_0: new Game_DEUSTime() with UF.NewGameSetup.year 0: year 0 (expected 0)
   history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72} (2562 ms)
   [PASS] mutant core_restores_or_1 (pre-ATK-YEAR0-002 code) caught: 1 failing checks, targeted: clock_constructor_keeps_year_0
   [PASS] mutant history_founds_year_0_at_1 caught: 2 failing checks, targeted: new_game_clock_year_is_0, new_game_save_year_is_0
   [PASS] mutant history_clock_floor_1 caught: 2 failing checks, targeted: new_game_clock_year_is_0, new_game_save_year_is_0
   [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0; 2797 ms)
   SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
   INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
   ```
   Sections A (22 checks) and B (4 checks) all `[PASS]`. All 12 older mutants are still caught.
2. `node tools/test_history_materialization_and_world_age.js`: **exit 0** after 108 s. `RESULT: 29 passed, 0 failed`.
   - Year 0 rows: `PASS ERA seed=0/424242/20260919 year=0: 72 living, 0 ancestors`.
   - The year 100/250/500 living and ancestor counts match the pre-fix baseline for every seed. For example seed 0: 761/188, 984/1582 and 1080/4178.
   - Rule 4, run through the suite with an in-memory source hook (`NODE_OPTIONS=--import=data:…` patching `fs.readFileSync` for `DEUS_History.js` in every worker; no file written):
     - Mutant `foundedYear = 1` (Year 0 founded at year 1): exit 1 after 3 s, `WORKER_FAILURE: FAIL Error: WORLD_AGE: target does not map to frozen annual clock`.
     - Mutant "Year 1 drops one non-leader founder per faction" (clock years stay correct): exit 1 after 72 s. All 12 era rows pass, then `FAIL Error: DAWN_ALIAS: Year0/Year1 founders differ in clock year, census or records`.
3. `node tools/test_historical_carrying_capacity.js`: **exit 0** after 18 s, `status PASS`.
   - 23 of 23 contracts pass. The 5 packet checks pass.
   - 8 of 8 mutants are caught (each child exits 1 on its target contract).
   - Report `candidate`: `{"commit":"0859ed3c…","bootstrap":"4af58dd…","sha256":"fca4a15a…","bytes":52898}`.
   - Pin can still fail: with `fs.readFileSync` patched to append one byte to the working plugin, `sourceBundle()` throws `CANDIDATE_MISMATCH: working plugin differs from frozen candidate`. Unpatched, it succeeds.
4. Regression sanity checks, each exit 0:
   - `node tools/check_deus_syntax.js`: `Checked 52 DEUS plugin files. Errors: 0`.
   - `node tools/test_palette.js`: `Palette loaded successfully`.
   - `node tools/test_geology_strata.js`: `RESULT: 9 passed, 0 failed (exit 0)`.
   - `node --check` passes on all three edited test files.
5. **Containment note.** During these runs I redirected test output to scratch files outside the worktree:
   - `%TEMP%\lg\` (6 files: the suites' stdout/stderr)
   - Git Bash `/tmp/lg_cc.json` and `/tmp/lg_cc.err`
   All were deleted before the commit (`ls` confirms they are gone). No other file outside the worktree was written. The source-hook mutants were run from stdin through a `data:` URL.

## What changed (runtime fix, `0859ed3c`)
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

### Deviation from the brief (runtime fix)
- **Brief item 2 asked for `steps = targetYear <= 0 ? 0 : targetYear`.** With Year ≥ 1 worlds still starting at 1, that makes setup year 1 run one step and give clock 2. I kept `targetYear <= 1 ? 0 : targetYear` and start the model at 0 only for target 0. Result: 0→0 and 1→1, and N>1 is byte-identical to HEAD (evidence below).

## Done, with evidence (runtime fix, `0859ed3c`; all run 2026-09-25 in this worktree)
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
9. Other history suites, before → after the runtime fix (superseded for the first two by the test maintenance above):
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

## Proposed test changes
Applied under Directive 001-F §2 in the test-maintenance commit. See "Test maintenance" above and `git diff 0859ed3c -- tools/`.

## Not done / known problems
- **Native RMMZ run not done** (the F5 playtest or `tools/run_tests.js`). The containment rules keep writes inside this worktree, and a native run needs a snapshot under `%TEMP%` plus the gitignored stand-in images. So there is no screenshot, and the AGENTS.md Definition of Done is **not met** for the native part.
  - Suggested run: `DEUS_TEST_YEAR=0 node tools/run_tests.js history --game <snapshot>`.
  - Then look at the clock HUD year, and at the chronicle (H) with its founding lines at year 0.
- **Setup year N>1 still gives clock N+1** (42 → 43, unchanged from HEAD). This is the frozen HIST-10 contract ("N>1 means N annual steps from year 1"), which ASTRA-15 pins. So native `setup.clock_year_is_42` still fails. Changing it would move every era's demographics RNG (it is keyed by year) and needs an owner decision. Not in this brief.
- **In-game `history` suite, `no_years` check** (`DEUS_History.js` around `:3877`): it expects year-1 founding lines and 0 simulated years. Its `regenerate()` worlds use the default 500 years, so it is stale on HEAD already, independent of this fix. Left as is.
- `History.currentYear()` has a fallback for when there is no clock (`h.years || 1`). It would say 1 for a Year 0 history without a clock. The runtime always has a clock, so it is left as is.
- Old code rejects a Year 0 demographics save (`startYear 0`). New code loads all old saves.
- **The new `DAWN_ALIAS` is weaker than the old one.**
  - It compares only the clock years and the `living` and `records` counts. The old check compared the full core and units hashes, which a Year 0 vs Year 1 split can no longer match.
  - Same-count content drift between Year 0 and Year 1 founders (names, ages, positions) would pass it. The runtime-fix probe (item 5 above) showed identical content with the years removed, but no committed check pins that.
  - A stronger form would compare the core hash after normalising years. Not in the brief; left for the coordinator.
- **ASTRA-14 contracts run on the HIST-09 Year-1 bootstrap world only** (`BOOTSTRAP` `4af58dd`). They exercise the new plugin, but never with a Year 0 (`startYear 0`) source history. Year 0 creation and validation are covered by the ASTRA-15 Year 0 rows and by `test_new_game_year0.js` Section C.
- The DAWN_ALIAS and WORLD_AGE mutants and the ASTRA-14 pin probe were run in memory. They are not in the suites' own mutant lists (the ASTRA-15 CLI only accepts its three fixed `--mutant=` names).

## Exact next step
- Grok: adversarial closure review of `task/lane-g` (`0859ed3c` plus the test-maintenance commit).
  - Section C byte diff: `runSectionC` is unchanged against `37ac57da`.
  - Check the ASTRA-14 `BOOTSTRAP` split and the two extra Section C mutants.
- Gemini (coordinator):
  - Accept or reject the two test-maintenance deviations.
  - Run the native check: `DEUS_TEST_YEAR=0 node tools/run_tests.js history --game <snapshot>`, and look at the HUD year and the chronicle.
  - Merge decision.

## Open questions / defects
- ASTRA-14 re-freeze: is the plugin-only re-freeze on the `4af58dd` bootstrap acceptable, or should the frozen harness move to the HIST-10 load order (HistoricalDemographics, Callings and Dnd5e before History)? The second is a larger rewrite of an Astra-owned suite.
- DAWN_ALIAS: keep the brief's count-only form, or strengthen it to a year-normalised core hash?
- Setup year N>1 → clock N+1: keep the HIST-10 contract, or make the model 0-based for every era? That changes the RNG streams and every pinned era hash.
