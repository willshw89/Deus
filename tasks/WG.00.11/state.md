# Task State: WG.00.11 — Standard New Game Year 0 Contract (INV-SIM-01)

- **Task ID:** `WG.00.11` (see "ID collisions" below)
- **WBS ID:** `WG.00.11`
- **Role:** Writer: Fable (Lane B) | Reviewer: Grok
- **Branch / Worktree:** `task/lane-b` (`C:\Users\snewt\.deus_worktrees\lane-b`), base `d1fbeab`
- **Last Commit:** this checkpoint, `[fable] WG.00.11 ATK-YEAR0-001 edge-case hardening and verification suite` (Gemini's original fix: `8d1c7c3`)
- **Current Gate:** Grok review of the hardening. ATK-YEAR0-001 closure criterion met; INV-SIM-01 end to end NOT met (proposed ATK-YEAR0-002, outside the Lane B write set).
- **Updated:** 2026-09-25 (Fable)

## Owned File Set
- `game/js/plugins/DEUS_FactionMenus.js`
- `tools/test_new_game_year0.js`
- `tasks/WG.00.11/*`

## What is Done (with Evidence)

### 1. Review of Gemini's fix (`8d1c7c3`)
Confirmed in the code: `_year = 0` default (line 347), `onNewGameEmbark` fallback `0` (280), typed-box and blur floors `0` (559, 564; line numbers after this checkpoint), `changeYear` floor `0` (1092), in-game `default_year_0` (1580).

Gaps it left, fixed in this checkpoint (all in `DEUS_FactionMenus.js`):
- `setYear(y)` still floored at 1: `setYear(0)` gave 1, `setYear(-10)` gave 1, non-numeric gave 1. Now 0..999, non-numeric gives 0.
- `currentYear()` ignored a box value of `"0"` (`parsed >= 1`), so a stale year could win over the box. Now `>= 0`.
- Year box tooltip said "Starting Year (1 - 999 AD)"; the class comment said "(1-200 AD)". Both now say 0.
- In-game `setup` suite: `year_clamped_min_1` expected 1 and became `year_clamped_min_0`. `year_adjusted_to_50` stepped +49 from the old default 1, so it has FAILED natively since `8d1c7c3`. It now steps +50 from 0.

### 2. `tools/test_new_game_year0.js` hardened (3 checks + 1 mutant → 31 checks + 12 mutants + 1 discrimination run)
- **Section A (gating, 22 checks), setup window and embark payload:**
  - the original 3 gates; the null-window fallback now starts from a sentinel, so it can't pass on a leftover value
  - keyboard: Left at 0 stays 0 with no cursor sound; Shift+Left from 5 clamps to 0; PageDown clamps to 0; Left from 1 reaches 0; 0→Right→Left round trip; Shift+Right clamps at 999
  - `setYear` with 0, negative, non-numeric and >999
  - typed box: "0", cleared box then blur, "-5"/"abc" then blur, box "0" over a stale year
  - payload: exact keys, integer `year === 0`, seed range, JSON round trip, `setupNewGame` called once, typed-then-decremented embark, embark with the box still focused
- **Section B (gating, 4 checks), clock save/load in the real `DEUS_Core.js`:** year 0 is written to `deusTime` and `ufTime`, restored over clock year 7, and restored from a legacy `ufTime`-only save.
- **Section C (known open, 4 checks), headless New Game:** the real Core / World / WorldGen / Factions / History / Levels / Dnd5e / Callings / HistoricalDemographics plugins are fed the payload Section A emits, with seed 424242 and a clock sentinel of 777. It checks the live clock year, the first save's year and the `Game_DEUSTime` constructor. These checks are reported but don't gate unless `--strict`. If one starts passing, the suite exits 1 so it gets promoted.
- **Section D (Rule 4):** 10 FactionMenus mutants and 2 Core mutants. Each must fail the checks it names. Two of them are the pre-hardening code. A discrimination run feeds the clock the setup year and shows all 4 Section C checks can pass.

### 3. Evidence (all runs 2026-09-25, this worktree)
`node tools/test_new_game_year0.js` → exit 0:
```
SETUP CONTRACT PASSED: 27 gating checks, 12 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END NOT MET: 3 Section C checks fail (ATK-YEAR0-002, proposed): a Year 0 New Game runs its clock and save at year 1.
  [OPEN ATK-YEAR0-002] new_game_clock_year_is_0: Clock year after a Year 0 New Game: 1 (expected 0)
  [OPEN ATK-YEAR0-002] new_game_save_year_is_0: deusTime.year in the first save of a Year 0 New Game: 1 (expected 0)
  [OPEN ATK-YEAR0-002] clock_constructor_keeps_year_0: new Game_DEUSTime() with UF.NewGameSetup.year 0: year 1 (expected 0)
  history after New Game: {"startYear":1,"years":0,"worldAge":0,"clockYear0":1,"demographicsCurrentYear":1,"demographicsStartYear":1,"units":72}
  [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0)
```
`node tools/test_new_game_year0.js --strict` → exit 1 (the 3 Section C checks).

The new suite run against the pre-hardening plugin (`git archive HEAD` copy in `%TEMP%`) → exit 1:
```
  [FAIL] key_right_left_round_trip: 0 -> Right -> 2 -> Left -> 1 (expected 1, 0)
  [FAIL] set_year_0_is_0: setYear(0) -> 1, box "1" (expected 0, "0")
  [FAIL] set_year_negative_clamps_0: setYear(-10) -> 1 (expected 0)
  [FAIL] set_year_non_numeric_is_0: setYear("abc"/undefined/null/"") -> 1/1/1/1 (expected 0/0/0/0)
  [FAIL] box_0_overrides_stale_year: Box "0" with stale _year 42 -> currentYear 42 (expected 0)
```
Native RMMZ (nw.exe) in-game `setup` suite on disposable snapshots (`tools/test_snapshot.js` from the canonical tree, which has the stand-in images, so `game/` is identical to `d1fbeab`):
- HEAD plugin: `RESULT: 61 passed, 4 failed`. The failures are `year_adjusted_to_50`, `clock_year_is_42`, `history_settled_run` and `settled_hearths_constructed`.
- This branch (all 95 plugins byte-identical to the worktree): `RESULT: 62 passed, 3 failed`. `default_year_0`, `year_adjusted_to_50` and `year_clamped_min_0` pass. The remaining 3 failures are the same pre-existing ones as on HEAD.
- There are no error or exception lines in `results.txt` or `game_runtime.log`, and no `last_crash.txt`. The F8 console was not watched live.
- Screenshots I opened (in `%TEMP%\uf_snapshots\laneb_year0\test_output\`):
  - `setup.live_deus_new_game_setup.png`: setup window over the title art, "Starting Year ◄ 0 ► AD", Faction Human, seed "Random".
  - `setup.live_deus_new_game_setup_dwarf_42.png`: Dwarf / 42 / 998877 with Start highlighted.
  - `setup.live_deus_new_game_setup_seed_selected.png`: the seed row highlighted.
  - `setup.live_deus_new_game_setup_buttons_selected.png`: the Randomize button highlighted.
  - `setup.live_deus_title_after_cancel.png`: the title screen with New Game / Continue.
  - `setup.live_dwarf_colony_year_42.png`: live map with colonists, a chest and trees. No year readout is on screen.
- The HEAD-baseline screenshots (`laneb_year0_head`) were not opened and are not cited.

## Exact Next Step
- Grok: adversarial review of the hardening and closure verdict for ATK-YEAR0-001.
- Gemini (coordinator):
  - register ATK-YEAR0-002 (or reject it)
  - get the owner ruling below
  - update `docs/STATUS.md`. The Lane B row still says "passes 3/3 checks".
  - merge `task/lane-b`
- Lane B makes no edit outside its write set.

## Open Defects / Questions
- **ATK-YEAR0-001** (MAJOR): the closure criterion is met. The menu default is 0. The suite fails if the default is not 0 or the untouched payload is not 0: mutant `default_year_1` fails 5 checks, including `window_default_year_is_0` and `embark_year_is_0`. OPEN until Grok signs.
- **ATK-YEAR0-002 (proposed, unregistered; suggested MAJOR): INV-SIM-01 is not met end to end.**
  - Headless New Game with the real plugins, seed 424242. The first save stores the same year as the clock:

    | Setup year | Clock year |
    |---|---|
    | 0 | 1 |
    | 1 | 1 |
    | 2 | 3 |
    | 42 | 43 |

  - Setup years 0 and 1 give identical history (`years 0`, `startYear 1`).
  - Causes, all outside the Lane B write set:
    - `DEUS_History.js:370` `steps = targetYear <= 1 ? 0 : targetYear`, and `:401` `$ufTime.year = demographics.currentYear`.
    - `DEUS_HistoricalDemographics.js:301` creates the history with `startYear: 1, currentYear: 1`, and its validators (`:264`, `:385`) require `startYear === 1`. The historical calendar is 1-based.
    - `DEUS_Core.js:285` `this.year = (… UF.NewGameSetup.year) || 1` turns 0 into 1. This is latent today because the clock is built once at boot, before any setup.
  - The same off-by-one makes native `setup.clock_year_is_42` fail (clock 43) on HEAD and on this branch.
  - **Decision needed (owner):** is "World Year 0" the label of the first year (the clock shows 0 while the demographic model stays 1-based inside), or does the historical model become 0-based (schema and validator change, save migration)?
- **Pre-existing, not Year-0:** native `setup.history_settled_run` and `setup.settled_hearths_constructed` fail on HEAD too. `st.history.settled` is absent on the v6 demographics path.
- **ID collisions (governance):**
  - `WG.00.11` is "Incarnation & Command Layer" in `docs/worldgen/DEUS_WORLDGEN_WBS.md:98`, but this task uses `WG.00.11` for the Year 0 contract.
  - `INV-SIM-01` is "Standard New Game Starts at Year 0" in `docs/INVARIANT_REGISTRY.md:51`, but "Matter Conservation Invariant" in `docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md:111`.
- **Found by reading code, not run:** nothing resets `$ufTime` hour, minute, day or monthIndex on New Game. The clock is built once at boot, and only Load restores those fields. A New Game started after loading a save in the same session would keep that save's day, month and hour; only the year is overwritten, by `History.generate`.

## Relevant Commands
```bash
node tools/test_new_game_year0.js            # setup contract gate (exit 0 today), reports Section C
node tools/test_new_game_year0.js --strict   # INV-SIM-01 end-to-end gate (exit 1 today)
node <canonical>/tools/test_snapshot.js --name laneb_year0 --no-run   # then copy this branch's plugins in
node tools/run_tests.js setup --game %TEMP%\uf_snapshots\laneb_year0  # native in-game setup suite
```
