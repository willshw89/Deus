# OPS.30.01 lane-y: GATE suite runner and measured quarantine census (REPORT)

**Writer:** claude (Claude Code, Opus 5.5) | **Branch:** task/lane-y | **Base:** `425b594c146d5f353c10faa11f4b5d47f499b45f` | **Date:** 2026-09-26
**Reviewer:** grok (independent review, launched later by the PM). Nothing here is self-certified: the tool's own
`PASS <check>` lines are test output, not a verdict on this lane.

No art was generated, requested or integrated (DEC-007). See "DEC-007 note" for what the census suites wrote inside
their throwaway clones.

**Escalation (standing rule 6):** `tasks/OPS.30.01/lane-y/escalation.md`. lane.json gateTest 3
(`node tools/ops/run_gate.js`) exits 1 in a clone made the way `merge_gate.js` makes one on this machine (system
`core.autocrlf=true`, CRLF files): three gate suites (`test_strata_cuts_and_caves.js`, `test_new_game_year0.js`,
`test_historical_carrying_capacity.js`) fail on CRLF checkouts and pass on LF checkouts of the same commit. The
census and the gate runs follow the brief's `core.autocrlf=false` clones, where all 9 gate suites pass. The fix lies
in read-only files; nothing was worked around.

## What changed

| Path | What |
|---|---|
| `tools/ops/run_gate.js` | New. Gate runner (default mode), `--census`, `--check-lists`, `--merge-census`, `--screen`. No npm dependencies. |
| `tools/ops/test_run_gate.js` | New. 97 checks, 11 of them mutants (in-memory copies of run_gate.js run with `node -`). |
| `tools/ops/fixtures/run_gate/**` | New. 18 synthetic suites, 5 helpers, 19 list files, README. |
| `tools/ops/quarantine.json` | New. The measured census of `425b594c` (3 runs) plus `tools/ops/test_run_gate.js` (3 runs on this branch). |
| `tasks/OPS.30.01/lane-y/REPORT.md` | This report. |
| `tasks/OPS.30.01/lane-y/escalation.md` | The CRLF finding (standing rule 6). |
| `tasks/OPS.30.01/lane-y/evidence/**` | Raw logs and census files of every run below; per-suite logs of census runs 1-3 (`evidence/logs/run<k>/`). |
| `tasks/OPS.30.01/lane-y/analysis/report_tables.js` | Builds the census tables of this report from the evidence (runs nothing). |
| `tasks/OPS.30.01/lane-y/leftover_check.js`, `wait_for_exit.js` | Evidence helpers: list processes naming a path; wait in the foreground for a job's `EXIT=` line. |

`tools/ops/gate_tests.json`, every test file, `tools/classify_tests.js`, `tools/run_tests.js`, `tools/governance/**`
and everything else outside allowedPaths are unchanged (scope diff at the end).

**Name substitution (brief):** the WBS row (`docs/worldgen/DEUS_WORLDGEN_WBS.md:428` at the base) names
`tools/ops/gate_suites.json`. No such file was created: the gate list is the `gate` array of the existing
`tools/ops/gate_tests.json` (Lane J), which `tools/governance/merge_gate.js:54` (`QUARANTINE_FILE`) and
`merge_gate.js:587-603` (`quarantineList`) read. run_gate.js reads the same array.

## How run_gate.js decides (the rules, also in the tool's header)

**Gate mode** (`node tools/ops/run_gate.js [--root <dir>]`): runs every entry of `gate_tests.json` `gate`, one at a
time, as `node <suite>` (no shell, cwd = root), prints `GATE <suite> EXIT=<n> <ms>ms` and `RESULT: <n> passed, <m>
failed`; exit 0 only if every suite exits 0, 1 otherwise, 2 on a usage or list error (missing/invalid/empty list,
duplicate, missing suite file) or when a listed or `--suite`-named suite is NEEDS_NWJS (then nothing runs).

**Categories** (each suite exactly one; the deciding line is stored):

| Category | Rule |
|---|---|
| NEEDS_NWJS | The static screen finds the NW.js harness (below): the suite is never run; deciding line = the screen evidence. Also given if the runtime guard blocked a harness launch (none at the base). |
| KILLED_TIMEOUT | Still running at the timeout (census default 180 s): killed with its whole process tree. |
| PASS | Exit code 0. |
| otherwise | The deciding line is the first candidate line of **stderr** that matches a rule, in print order; stdout is used only when stderr has no candidate line at all. First matching rule, in this order: |
| FAIL_MISSING_REFERENCE | `Cannot find module '<...>/js/plugins/<...>'` (a missing plugin) |
| FAIL_MISSING_DEPENDENCY | `Cannot find module`, `MODULE_NOT_FOUND`, `ERR_MODULE_NOT_FOUND`; `spawn <program> ENOENT` |
| FAIL_MISSING_REFERENCE | `ENOENT`, `no such file or directory`, .NET `FileNotFoundException` / `DirectoryNotFoundException` / `Could not find file|a part of the path`; `plugin ... missing|not found|not registered`, `missing plugin`, `unknown plugin`, `must be loaded` |
| FAIL_API_DRIFT | `TypeError`, `is not a function`, `is not a constructor`, `Cannot read/set properties of undefined/null`, `is not iterable` (the census cannot tell whether the undefined value came from a project module or the suite's own code) |
| FAIL_OTHER | No rule matched: first candidate stderr line, else first stdout line with FAIL/error, else last stdout line. Flaky suites (runs disagree) are FAIL_OTHER with `flaky: true` and `runCategories`. |

Candidate lines leave out blank lines, stack frames, node's error-location header (file:line, source line, caret),
`(node:<pid>)` warnings, the `Node.js v<n>` footer and lines starting with PASS/ok. Paths of the root and of the
run's scratch folder are written `<root>` / `<tmp>`.

**NEEDS_NWJS static screen** (before anything is spawned). Harness names: `nw.exe`, `nwjs`, `run_tests`,
`test_snapshot`, `Game.exe` (case-insensitive, not preceded by a letter/digit/underscore, so `NEEDS_NWJS` and
`Utils.isNwjs` do not count). Followed transitively from the suite: literal `require()`/`import()` of relative or
absolute paths (from every file), and path-like tokens ending in `.js/.cjs/.mjs/.bat/.cmd/.ps1/.sh` matched by file
name against every tracked script (from the suite, files under `tools/`, shell scripts and any file using
`child_process`). A suite is NEEDS_NWJS when a harness name appears in its own path or text, in the path or text of
a reached file under `tools/` or a reached shell script, or in the text of any other reached file that also uses
`child_process` (no `game/` file does at the base; the plugins name the harness only in comments, see
`game/js/plugins/DEUS_Levels.js:143`, `DEUS_Test.js:12`). Not followed: `tools/ops/run_gate.js` itself and
`tools/ops/fixtures/run_gate/` (their text names the harness on purpose; the fixtures are screened again as suites
inside the synthetic repos). The screen agrees with a plain `git grep -i -E "nw\.exe|nwjs|run_tests|test_snapshot"`
over the 187 base suites except `tools/test_d20_equipment_slots.js`, whose only hit is an `isNwjs: () => false` stub
(line 117); no suite at the base reaches the harness only through a helper.

**Runtime guard** (second line, for paths built at run time): every suite runs with `NODE_OPTIONS=--require <guard>`,
a preload that wraps `child_process` spawn/spawnSync/exec/execSync/execFile/execFileSync/fork and throws instead of
starting a process whose command or arguments name the harness (git commands excepted). It blocked nothing at the
base; the fixture `guard_evasion.js` shows it working.

**Environment and processes:** each suite gets the runner's environment minus GIT_DIR-style variables, `NODE_PATH`
and `NODE_OPTIONS` (this session had a NODE_PATH into a Grok Bot `app.asar`), plus its own fresh `TEMP/TMP/TMPDIR`
(removed afterwards) and the guard. Timeouts kill the whole tree (`taskkill /T /F`). After every invocation the
runner lists processes and kills leftovers it started (children of a suite created while it ran, their descendants,
anything naming the scratch folder) and reports processes that only name the root. At most 3 suites at once.

### Deviations from the brief's wording, and why

1. **spawn, not spawnSync, in gate mode.** On Windows `spawnSync`'s timeout ends only the direct child; the brief's
   rule 3 asks for the whole tree to be killed. Gate mode still runs one suite at a time, with no shell.
2. **Gate-mode default timeout 600 s** (`merge_gate.js:53` `DEFAULT_TIMEOUT_SEC = 600`), census default 180 s. The
   gate suite `tools/test_strata_cuts_and_caves.js` took 217.6 s alone in a used clone
   (`evidence/strata_cuts_standalone.log`), 177.5 s and 167.7 s in the gate runs below, and was killed at 180 s in
   census runs 1 and 2. A 180 s gate default would fail a healthy gate suite.
3. **Extra modes** `--merge-census` (builds quarantine.json from census files and reports agreement) and `--screen`
   (static verdicts only). `--census` also has `--budget-sec` and resumes a partial census: the shell tool here stops
   foreground commands at 10 minutes, and a full census takes about 18 minutes.
4. **Commands longer than 10 minutes** (the gate runs, the lane.json gate run, two chunks of the supplementary run)
   ran as a job whose output and `EXIT=` line go to a log file, while this session waited on it in the foreground
   with `wait_for_exit.js` (repeated until the `EXIT=` line appeared). The turn never ended with a job running.
5. **quarantine.json details:** NEEDS_NWJS entries store the screen evidence as `firstErrorLine` with
   `exitCode: null, ms: null`; KILLED_TIMEOUT has `exitCode: null`; `passingNotGated` entries are objects
   `{path, ms[, measuredOn]}` (`ms` = longest of the runs); optional top-level `runs: 3`.
6. **Rules changed once.** A first census run (runner `5acd3a50`) showed two rule gaps: PowerShell reports a
   missing image as `FileNotFoundException` on a later stderr line, and DEUS_History reports missing plugins as
   "must be loaded before New Game". Both rules were added (with fixtures) before the three counted runs, which all
   used runner `33357307`. The earlier run is kept in `evidence/superseded/`; under the new rules 4 of its suites
   change from FAIL_OTHER to FAIL_MISSING_REFERENCE, and `test_merge_gate.js` passed there in 178 s but was killed at
   180 s in all three counted runs.

## Commands and raw results

All census and gate runs used throwaway clones under `%TEMP%` made with
`git clone -c core.autocrlf=false <worktree> <clone>`, `git -C <clone> checkout --detach 425b594c...` and a disabled
push URL (`git remote set-url --push origin DISABLED-lane-y-census-no-push`), each deleted after its leftover check.

### Gate run on a fresh clone of main (`evidence/gate_fresh_clone.log`, runner `33357307`)

```
run_gate: gate mode, 9 suites from C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gate\tools\ops\gate_tests.json, root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gate, HEAD 425b594c146d5f353c10faa11f4b5d47f499b45f, timeout 600 s each, one at a time
GATE tools/check_deus_syntax.js EXIT=0 4055ms
GATE tools/test_palette.js EXIT=0 58ms
GATE tools/governance/test_check_claims.js EXIT=0 139032ms
GATE tools/test_strata_cuts_and_caves.js EXIT=0 177523ms
GATE tools/test_new_game_year0.js EXIT=0 18208ms
GATE tools/test_history_materialization_and_world_age.js EXIT=0 106214ms
GATE tools/test_historical_carrying_capacity.js EXIT=0 20218ms
GATE tools/test_geology_strata.js EXIT=0 17936ms
GATE tools/test_strata_foundation.js EXIT=0 93123ms
LEFTOVERS: none
RESULT: 9 passed, 0 failed
EXIT=0
```

### Gate run with one suite deliberately broken (`evidence/gate_broken_suite.log`)

Same clone after the run above; the break, then the run:

```
diff --git a/tools/test_palette.js b/tools/test_palette.js
+console.error("OPS.30.01 deliberate break"); process.exit(1);
...
GATE tools/check_deus_syntax.js EXIT=0 2989ms
GATE tools/test_palette.js EXIT=1 38ms FAIL_OTHER
GATE tools/governance/test_check_claims.js EXIT=0 130924ms
GATE tools/test_strata_cuts_and_caves.js EXIT=0 167730ms
GATE tools/test_new_game_year0.js EXIT=0 13677ms
GATE tools/test_history_materialization_and_world_age.js EXIT=0 94146ms
GATE tools/test_historical_carrying_capacity.js EXIT=0 17291ms
GATE tools/test_geology_strata.js EXIT=0 15343ms
GATE tools/test_strata_foundation.js EXIT=0 85222ms
LEFTOVERS: none
RESULT: 8 passed, 1 failed
EXIT=1
```

### Census runs (timeout 180 s, 3 at once, 188 suites each)

Each run is 3 resumed chunks of `node tools/ops/run_gate.js --census --root <fresh clone> --out
evidence/census_run<k>.json --log-dir <tmp> --budget-sec 360` (full output with every suite line and every
chunk's `EXIT=` in `evidence/census_run<k>.log`; chunks exit 3 = partial, the last exits 0):

```
run 1: CENSUS COUNTS PASS=70 FAIL_MISSING_DEPENDENCY=0 FAIL_API_DRIFT=19 FAIL_MISSING_REFERENCE=35 FAIL_OTHER=13 KILLED_TIMEOUT=9 NEEDS_NWJS=42
       CENSUS COMPLETE: 188/188 measured   EXIT=0   LEFTOVERS: none (every chunk)
run 2: CENSUS COUNTS PASS=70 FAIL_MISSING_DEPENDENCY=0 FAIL_API_DRIFT=19 FAIL_MISSING_REFERENCE=35 FAIL_OTHER=13 KILLED_TIMEOUT=9 NEEDS_NWJS=42
       CENSUS COMPLETE: 188/188 measured   EXIT=0   LEFTOVERS: none (every chunk)
run 3: CENSUS COUNTS PASS=72 FAIL_MISSING_DEPENDENCY=0 FAIL_API_DRIFT=19 FAIL_MISSING_REFERENCE=35 FAIL_OTHER=13 KILLED_TIMEOUT=7 NEEDS_NWJS=42
       CENSUS COMPLETE: 188/188 measured   EXIT=0   LEFTOVERS: none (every chunk)
```

`tools/ops/test_run_gate.js` did not exist at the base; it was measured the same way three times, each in a fresh
clone of this branch at `2d9f513c` (`evidence/census_tip_run<k>.log`): PASS 3/3, `EXIT=0`, `LEFTOVERS: none`.
`git diff 2d9f513c HEAD -- tools/ops/run_gate.js tools/ops/test_run_gate.js tools/ops/fixtures` is empty at the
commit these results were pasted on.

Leftover checks after every clone (`node tasks/OPS.30.01/lane-y/leftover_check.js <clone>`, which leaves out its
own process chain): `LEFTOVER CHECK: 0 process(es)` for census clones 1-3, the gate clone, the three tip clones,
the supplementary clone and the gate-test clone, and a final check for any process naming `%TEMP%\deus-lane-y-`,
`%TEMP%\deus-run-gate-` or `%TEMP%\deus-test-run-gate-`: `LEFTOVER CHECK: 0 process(es)`.

### Merge into quarantine.json (`evidence/merge.log`)

```
MERGE suites=189 agree=187 disagree=2 gate=9 quarantine=117 passingNotGated=63
MERGE COUNTS (non-gate) PASS=63 FAIL_MISSING_DEPENDENCY=0 FAIL_API_DRIFT=19 FAIL_MISSING_REFERENCE=35 FAIL_OTHER=14 KILLED_TIMEOUT=7 NEEDS_NWJS=42
FLAKY tools/test_strata_fluid_reconciliation.js KILLED_TIMEOUT / KILLED_TIMEOUT / PASS
GATE tools/test_strata_cuts_and_caves.js KILLED_TIMEOUT / KILLED_TIMEOUT / PASS
(the other 8 gate suites PASS / PASS / PASS)
WROTE C:\Users\snewt\.deus_worktrees\lane-y\tools\ops\quarantine.json
EXIT=0
```

### Flaky suites

- `tools/test_strata_fluid_reconciliation.js` (quarantine, `flaky: true`): KILLED_TIMEOUT, KILLED_TIMEOUT, PASS
  (145 s in run 3); PASS in 163 s in the supplementary 580 s run. Slow, not hung.
- `tools/test_strata_cuts_and_caves.js` (gate list, so not in quarantine.json): KILLED_TIMEOUT, KILLED_TIMEOUT, PASS
  (169 s) in the census; PASS in both gate-mode runs (177.5 s, 167.7 s) and alone (217.6 s).
- `tools/governance/test_merge_gate.js`: KILLED_TIMEOUT in all three counted runs, PASS in 178 s in the superseded
  run and in 195 s in the supplementary run. Recorded KILLED_TIMEOUT (the three counted runs agree).

## Census results

<!-- generated by tasks/OPS.30.01/lane-y/analysis/report_tables.js from the committed evidence; do not edit by hand -->

### Counts per category

Census of `425b594c` (3 runs, fresh clone each, timeout 180 s, 3 at once) plus `tools/ops/test_run_gate.js` (added by this lane, 3 runs on lane commit `2d9f513c`).

| Category | run 1 | run 2 | run 3 | quarantine.json (non-gate, 3/3 rule) |
|---|---|---|---|---|
| PASS | 70 | 70 | 72 | 63 passingNotGated |
| FAIL_MISSING_DEPENDENCY | 0 | 0 | 0 | 0 |
| FAIL_API_DRIFT | 19 | 19 | 19 | 19 |
| FAIL_MISSING_REFERENCE | 35 | 35 | 35 | 35 |
| FAIL_OTHER | 13 | 13 | 13 | 14 |
| KILLED_TIMEOUT | 9 | 9 | 7 | 7 |
| NEEDS_NWJS | 42 | 42 | 42 | 42 |
| total | 188 | 188 | 188 | 180 non-gate + 9 gate = 189 |

Run columns count all 188 suites of the base, gate suites included; the last column leaves out the 9 gate suites and adds `tools/ops/test_run_gate.js`.

### Agreement across the three runs

187 of 189 suites got the same category in all three runs; 2 did not:

| Suite | list | run 1 | run 2 | run 3 | ms (runs) |
|---|---|---|---|---|---|
| `tools/test_strata_cuts_and_caves.js` | gate | KILLED_TIMEOUT | KILLED_TIMEOUT | PASS | 180165 / 180187 / 169427 |
| `tools/test_strata_fluid_reconciliation.js` | quarantine | KILLED_TIMEOUT | KILLED_TIMEOUT | PASS | 180171 / 180180 / 145122 |

Suites with the same category but a different deciding line between runs: 0.

### Gate suites in the census (timeout 180 s, 3 at once)

| Gate suite | run 1 | run 2 | run 3 | ms (runs) |
|---|---|---|---|---|
| `tools/check_deus_syntax.js` | PASS | PASS | PASS | 3962 / 3782 / 5196 |
| `tools/test_palette.js` | PASS | PASS | PASS | 49 / 51 / 49 |
| `tools/governance/test_check_claims.js` | PASS | PASS | PASS | 148583 / 169014 / 158932 |
| `tools/test_strata_cuts_and_caves.js` | KILLED_TIMEOUT | KILLED_TIMEOUT | PASS | 180165 / 180187 / 169427 |
| `tools/test_new_game_year0.js` | PASS | PASS | PASS | 13870 / 19925 / 14821 |
| `tools/test_history_materialization_and_world_age.js` | PASS | PASS | PASS | 105267 / 114329 / 97142 |
| `tools/test_historical_carrying_capacity.js` | PASS | PASS | PASS | 21235 / 27075 / 20822 |
| `tools/test_geology_strata.js` | PASS | PASS | PASS | 23322 / 24534 / 18622 |
| `tools/test_strata_foundation.js` | PASS | PASS | PASS | 148842 / 141673 / 88586 |

### Every suite

`list` is where the suite is now: the gate list (gate_tests.json, read only), the quarantine (`quarantine.json` suites) or `passingNotGated`. `ms` is the longest of the three runs. The deciding line is cut at 150 characters; the full line is in quarantine.json and the census files.

| # | Suite | list | category | runs | ms | deciding line |
|---|---|---|---|---|---|---|
| 1 | `tools/art/test_blank_templates.js` | passingNotGated | PASS | 3/3 | 45592 |  |
| 2 | `tools/art/test_catalogue.js` | quarantine | FAIL_OTHER | 3/3 | 10684 | FAIL catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: art/catalogue/catalogue.json, art/catalog... |
| 3 | `tools/art/test_place_art.js` | passingNotGated | PASS | 3/3 | 8640 |  |
| 4 | `tools/check_deus_syntax.js` | gate | PASS | 3/3 | 5196 |  |
| 5 | `tools/governance/test_check_claims.js` | gate | PASS | 3/3 | 169014 |  |
| 6 | `tools/governance/test_merge_gate.js` | quarantine | KILLED_TIMEOUT | 3/3 | 180200 | killed after 180 s (timeout) with its whole process tree |
| 7 | `tools/ops/test_run_gate.js` | passingNotGated | PASS | 3/3 | 61954 |  |
| 8 | `tools/sim/test_ledger.js` | passingNotGated | PASS | 3/3 | 16035 |  |
| 9 | `tools/sim/test_ledger_longrun.js` | passingNotGated | PASS | 3/3 | 24016 |  |
| 10 | `tools/test_19b_performance_determinism.js` | quarantine | FAIL_API_DRIFT | 3/3 | 102 | TypeError: WA.initNewWorld is not a function |
| 11 | `tools/test_adam_res.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 51 | Error: ENOENT: no such file or directory, open 'C:\Program Files\GOG Galaxy\Games\Ultima 7\STATIC\PALETTES.FLX' |
| 12 | `tools/test_adam_scales.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 52 | Error: ENOENT: no such file or directory, open 'C:\Program Files\GOG Galaxy\Games\Ultima 7\STATIC\PALETTES.FLX' |
| 13 | `tools/test_aging_and_lifespan.js` | passingNotGated | PASS | 3/3 | 60 |  |
| 14 | `tools/test_agriculture.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 59 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_Agriculture.js' |
| 15 | `tools/test_all_animated_objects_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_all_animated_objects_live.js:112 names "nwjs": const nwExe = path.join(rmmzDir, 'nwjs-win', 'nw.exe'); |
| 16 | `tools/test_all_faction_menus.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_all_faction_menus.js:35 names "run_tests": childProcess.execSync('"${process.execPath}" tools/run_tests.js faction_menus ... |
| 17 | `tools/test_all_object_charsets.js` | quarantine | FAIL_OTHER | 3/3 | 23665 | Icon Art Check FAIL on oak (<root>\art\masters\oak_icon.png): |
| 18 | `tools/test_all_walk_cycles.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 645 | Error: ENOENT: no such file or directory, open '<root>\game\test_output\all_males_walk_cycles_4step.png' |
| 19 | `tools/test_ally_movement_exclusive_action_square.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_ally_movement_exclusive_action_square.js:211 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/ru... |
| 20 | `tools/test_autonomous_project_dispatch.js` | quarantine | KILLED_TIMEOUT | 3/3 | 180201 | killed after 180 s (timeout) with its whole process tree |
| 21 | `tools/test_autonomous_settlement_closure.js` | passingNotGated | PASS | 3/3 | 69468 |  |
| 22 | `tools/test_autonomous_work_recovery.js` | quarantine | KILLED_TIMEOUT | 3/3 | 180155 | killed after 180 s (timeout) with its whole process tree |
| 23 | `tools/test_biome_standard.js` | passingNotGated | PASS | 3/3 | 739 |  |
| 24 | `tools/test_birth_rate_halved.js` | quarantine | FAIL_OTHER | 3/3 | 64 | AssertionError [ERR_ASSERTION]: UF_Colonists.js must check roll < 0.5 for 50% conception rate |
| 25 | `tools/test_building_variety_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_building_variety_live.js:209 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js smoke... |
| 26 | `tools/test_callings_and_clearing_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_callings_and_clearing_live.js:257 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js ... |
| 27 | `tools/test_callings_system.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 57 | Error: Cannot find module '../game/js/plugins/UF_Callings.js' |
| 28 | `tools/test_chest_left_click_info.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_chest_left_click_info.js:12 names "nwjs": const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nw... |
| 29 | `tools/test_clean_attack_sheet.js` | passingNotGated | PASS | 3/3 | 211 |  |
| 30 | `tools/test_clean_bow_sheet.js` | passingNotGated | PASS | 3/3 | 228 |  |
| 31 | `tools/test_clean_downed_sheet.js` | passingNotGated | PASS | 3/3 | 179 |  |
| 32 | `tools/test_clean_haul_sheet.js` | passingNotGated | PASS | 3/3 | 198 |  |
| 33 | `tools/test_clean_magic_sheet.js` | passingNotGated | PASS | 3/3 | 224 |  |
| 34 | `tools/test_clean_u7_composites.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 128 | Error: ENOENT: no such file or directory, open '<root>\scratch\u7_modular_test\clean_combo_A.png' |
| 35 | `tools/test_clean_walk_sheet.js` | passingNotGated | PASS | 3/3 | 203 |  |
| 36 | `tools/test_clean_walk_sheet2.js` | passingNotGated | PASS | 3/3 | 188 |  |
| 37 | `tools/test_clean_walk_sheet3.js` | passingNotGated | PASS | 3/3 | 185 |  |
| 38 | `tools/test_clean_work_sheet.js` | passingNotGated | PASS | 3/3 | 181 |  |
| 39 | `tools/test_column_landforms.js` | passingNotGated | PASS | 3/3 | 578 |  |
| 40 | `tools/test_combat_dying_integration.js` | passingNotGated | PASS | 3/3 | 100 |  |
| 41 | `tools/test_conditions_native_closure.js` | passingNotGated | PASS | 3/3 | 1923 |  |
| 42 | `tools/test_conditions_system.js` | passingNotGated | PASS | 3/3 | 75 |  |
| 43 | `tools/test_container_item_interactions.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_container_item_interactions.js:12 names "nwjs": const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker ... |
| 44 | `tools/test_continuous_frontier_progression.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_continuous_frontier_progression.js:168 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_test... |
| 45 | `tools/test_cooperative_building_and_offspring_pairbonding.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 77 | FAIL coop_pairbond.founder_1to1_pairbonding_at_creation: Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_CultureGrowth.js' |
| 46 | `tools/test_cooperative_homestead_construction.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_cooperative_homestead_construction.js:201 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_t... |
| 47 | `tools/test_creatures_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_creatures_ingame.js:84 names "run_tests": const out = childProcess.execSync('"${process.execPath}" tools/run_tests.js wil... |
| 48 | `tools/test_culling_native.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_culling_native.js:20 names "nwjs": const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\... |
| 49 | `tools/test_culture_growth.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 56 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_CultureGrowth.js' |
| 50 | `tools/test_d20_equipment_slots.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 61 | Error: Cannot find module '<root>\game\js\plugins\UF_Rules.js' |
| 51 | `tools/test_deer_action_boxes.js` | passingNotGated | PASS | 3/3 | 208 |  |
| 52 | `tools/test_diagonal_corners_and_doorways.js` | quarantine | FAIL_API_DRIFT | 3/3 | 62 | FAIL diagonal_geometry.corner_cut_rejected_around_obstacle: unit.canPassDiagonally is not a function |
| 53 | `tools/test_duplicate_registration.js` | passingNotGated | PASS | 3/3 | 80 |  |
| 54 | `tools/test_dwarves_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_dwarves_ingame.js:163 names "run_tests": const out = childProcess.execSync('"${process.execPath}" tools/run_tests.js smok... |
| 55 | `tools/test_dynamic_armor_reflection.js` | quarantine | FAIL_API_DRIFT | 3/3 | 296 | TypeError: Cannot read properties of undefined (reading 'clothingIndexForUnit') |
| 56 | `tools/test_ecology.js` | quarantine | FAIL_API_DRIFT | 3/3 | 68 | FAIL ecology.renewable_vs_finite: Cannot read properties of undefined (reading 'isRenewableObject') |
| 57 | `tools/test_elves_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_elves_ingame.js:165 names "run_tests": const out = childProcess.execSync('"${process.execPath}" tools/run_tests.js smoke ... |
| 58 | `tools/test_extraction_difficulty.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 62 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_Skills.js' |
| 59 | `tools/test_eye_variations.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 54 | Error: ENOENT: no such file or directory, open '<root>\game\test_output\eye_e1_1x.png' |
| 60 | `tools/test_facing_detection.js` | passingNotGated | PASS | 3/3 | 74 |  |
| 61 | `tools/test_faction_construction_and_homes.js` | quarantine | FAIL_API_DRIFT | 3/3 | 99 | FAIL faction_construction.all_faction_founders_are_settlers: TypeError: Cannot read properties of undefined (reading 'setup') |
| 62 | `tools/test_faction_founder_pairbonding.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 66 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_Outposts.js' |
| 63 | `tools/test_faction_menus_clean.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_faction_menus_clean.js:14 names "run_tests": const out = childProcess.execSync('"${process.execPath}" tools/run_tests.js ... |
| 64 | `tools/test_faction_reproduction.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 58 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_Goals.js' |
| 65 | `tools/test_faction_starting_gear.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 91 | Error: History: HistoricalDemographics, Callings and Dnd5e must be loaded before New Game |
| 66 | `tools/test_factions_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_factions_live.js:71 names "run_tests": const out = childProcess.execSync('"C:\\Program Files\\nodejs\\node.exe" tools/run... |
| 67 | `tools/test_family_compounds_and_shops.js` | passingNotGated | PASS | 3/3 | 84 |  |
| 68 | `tools/test_family_integration.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 58 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_FireSafety.js' |
| 69 | `tools/test_farm_view.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 58 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_FarmView.js' |
| 70 | `tools/test_female_u7_composites.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 117 | Error: ENOENT: no such file or directory, open '<root>\scratch\u7_modular_test\f_combo_A.png' |
| 71 | `tools/test_ff5_candidates.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 64 | Error: ENOENT: no such file or directory, open '<root>\game\test_output\settler_ff5_c1_1x.png' |
| 72 | `tools/test_ff5_proportions_and_footsteps.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 69 | Error: ENOENT: no such file or directory, open '<root>\scratch\peasant_48_test.png' |
| 73 | `tools/test_fire_safety.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 55 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_FireSafety.js' |
| 74 | `tools/test_fix_facings.js` | quarantine | FAIL_OTHER | 3/3 | 69 | ReferenceError: testFiles is not defined |
| 75 | `tools/test_fixed_cycle.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 140 | Error: ENOENT: no such file or directory, open '<root>\game\test_output\fixed_male_walk_cycle_filmstrip.png' |
| 76 | `tools/test_fixed_walk_playback.js` | passingNotGated | PASS | 3/3 | 131 |  |
| 77 | `tools/test_fog_z_level_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_fog_z_level_live.js:124 names "run_tests": // 3. Run NW.js headless using run_tests.js harness |
| 78 | `tools/test_foliage_sprite_animations.js` | passingNotGated | PASS | 3/3 | 328 |  |
| 79 | `tools/test_gen3_metrics.js` | passingNotGated | PASS | 3/3 | 197 |  |
| 80 | `tools/test_generated_z2_cut_proof.js` | passingNotGated | PASS | 3/3 | 50727 |  |
| 81 | `tools/test_generator_combinations.js` | passingNotGated | PASS | 3/3 | 371 |  |
| 82 | `tools/test_geology_strata.js` | gate | PASS | 3/3 | 24534 |  |
| 83 | `tools/test_goals.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 54 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_Goals.js' |
| 84 | `tools/test_golden_art_review_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_golden_art_review_live.js:240 names "run_tests": console.log('Running in-engine test suite via run_tests.js...'); |
| 85 | `tools/test_greater_z_roof_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_greater_z_roof_live.js:153 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js smoke -... |
| 86 | `tools/test_ground_shades_prototype.js` | passingNotGated | PASS | 3/3 | 57 |  |
| 87 | `tools/test_hare_action_boxes.js` | passingNotGated | PASS | 3/3 | 234 |  |
| 88 | `tools/test_haul_builder.js` | passingNotGated | PASS | 3/3 | 100 |  |
| 89 | `tools/test_hazard_reflex.js` | passingNotGated | PASS | 3/3 | 738 |  |
| 90 | `tools/test_hazard_torture_live.js` | passingNotGated | PASS | 3/3 | 4670 |  |
| 91 | `tools/test_hearth_containment_and_provenance.js` | passingNotGated | PASS | 3/3 | 150 |  |
| 92 | `tools/test_hist_metadata_contracts.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 16522 | FATAL: History: HistoricalDemographics, Callings and Dnd5e must be loaded before New Game |
| 93 | `tools/test_historical_carrying_capacity.js` | gate | PASS | 3/3 | 27075 |  |
| 94 | `tools/test_history_materialization_and_world_age.js` | gate | PASS | 3/3 | 114329 |  |
| 95 | `tools/test_households.js` | passingNotGated | PASS | 3/3 | 378 |  |
| 96 | `tools/test_human_dwarf_8d_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_human_dwarf_8d_live.js:163 names "run_tests": const out = childProcess.execSync('"${process.execPath}" tools/run_tests.js... |
| 97 | `tools/test_human_female_variations_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_human_female_variations_live.js:150 names "run_tests": // 3. Run test using run_tests.js against snapshot |
| 98 | `tools/test_human_inheritance.js` | passingNotGated | PASS | 3/3 | 60 |  |
| 99 | `tools/test_human_male_live_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_human_male_live_ingame.js:137 names "run_tests": // 3. Run test runner against snapshot using run_tests.js |
| 100 | `tools/test_human_male_variations_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_human_male_variations_live.js:145 names "run_tests": path.join(ROOT, 'tools', 'run_tests.js'), |
| 101 | `tools/test_layer_switch_inplace.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_layer_switch_inplace.js:438 names "run_tests": const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "run_tests... |
| 102 | `tools/test_light_wall_occlusion_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_light_wall_occlusion_live.js:157 names "run_tests": // 3. Run test using run_tests.js against snapshot |
| 103 | `tools/test_liquid_depth_simulation.js` | passingNotGated | PASS | 3/3 | 640 |  |
| 104 | `tools/test_live_town_center_progression.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_live_town_center_progression.js:165 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.j... |
| 105 | `tools/test_ludeon_planning.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_ludeon_planning.js:189 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js smoke --gam... |
| 106 | `tools/test_material_recipes.js` | quarantine | FAIL_API_DRIFT | 3/3 | 66 | TypeError: Cannot read properties of undefined (reading 'handler') |
| 107 | `tools/test_material_refining_and_tech_pacing.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 65 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_CultureGrowth.js' |
| 108 | `tools/test_material_substitution.js` | quarantine | FAIL_API_DRIFT | 3/3 | 65 | TypeError: Cannot read properties of undefined (reading 'matchesRequirement') |
| 109 | `tools/test_menu_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_menu_ingame.js:47 names "run_tests": const out = childProcess.execSync('"${process.execPath}" tools/run_tests.js smoke --... |
| 110 | `tools/test_minimap.js` | passingNotGated | PASS | 3/3 | 70 |  |
| 111 | `tools/test_multi_deficit_settlement.js` | passingNotGated | PASS | 3/3 | 956 |  |
| 112 | `tools/test_native_resolution_standard.js` | passingNotGated | PASS | 3/3 | 94 |  |
| 113 | `tools/test_native_survival_soak.js` | quarantine | FAIL_OTHER | 3/3 | 144249 | RESULT: SOAK CHECKS FAILED (7 passed, 2 failed, exit 1) |
| 114 | `tools/test_natural_connections.js` | quarantine | FAIL_API_DRIFT | 3/3 | 80 | FAIL natural_connections.seeded_mock_determinism_and_pairing: TypeError: Cannot read properties of undefined (reading 'state') |
| 115 | `tools/test_new_game_year0.js` | gate | PASS | 3/3 | 19925 |  |
| 116 | `tools/test_object_art.js` | quarantine | FAIL_OTHER | 3/3 | 7233 | Art Check Failures: |
| 117 | `tools/test_object_originality.js` | quarantine | FAIL_OTHER | 3/3 | 6241 | Originality Check Failures: |
| 118 | `tools/test_palette.js` | gate | PASS | 3/3 | 51 |  |
| 119 | `tools/test_palette_standard.js` | passingNotGated | PASS | 3/3 | 319 |  |
| 120 | `tools/test_perf_benchmark.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_perf_benchmark.js:12 names "nwjs": const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\... |
| 121 | `tools/test_physical_inventory_proof.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 58 | Error: Cannot find module '../game/js/plugins/UF_Containers.js' |
| 122 | `tools/test_population_growth_and_immigration.js` | quarantine | FAIL_API_DRIFT | 3/3 | 84 | FAIL population_growth.conception_chance_logistic_curve: Cannot read properties of undefined (reading 'generate') |
| 123 | `tools/test_portrait_clothing_offsets.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 112 | Error: ENOENT: no such file or directory, open '<root>\scratch\u7_modular_test\test_cloth0_ty_75.png' |
| 124 | `tools/test_post_town_hall_progression.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_post_town_hall_progression.js:155 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js ... |
| 125 | `tools/test_process_human_12.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 463 | + FullyQualifiedErrorId : FileNotFoundException |
| 126 | `tools/test_production_history_demographics.js` | quarantine | FAIL_OTHER | 3/3 | 57 | FAIL: Error: Production candidate mismatch before regression tests |
| 127 | `tools/test_profile_tabs.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 51 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_ProfileTabs.js' |
| 128 | `tools/test_project_construction_loop.js` | quarantine | KILLED_TIMEOUT | 3/3 | 180196 | killed after 180 s (timeout) with its whole process tree |
| 129 | `tools/test_r4c2_foreshorten.js` | passingNotGated | PASS | 3/3 | 72 |  |
| 130 | `tools/test_regrowth_construction_guard.js` | quarantine | FAIL_API_DRIFT | 3/3 | 61 | TypeError: Cannot read properties of undefined (reading 'setIn') |
| 131 | `tools/test_resize_face.js` | passingNotGated | PASS | 3/3 | 375 |  |
| 132 | `tools/test_resource_economy_standard.js` | passingNotGated | PASS | 3/3 | 55 |  |
| 133 | `tools/test_resource_node_materials.js` | quarantine | FAIL_API_DRIFT | 3/3 | 67 | TypeError: Cannot read properties of undefined (reading 'materialOf') |
| 134 | `tools/test_round_world.js` | quarantine | FAIL_OTHER | 3/3 | 72 | ReferenceError: Scene_Map is not defined |
| 135 | `tools/test_round_world_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_round_world_live.js:117 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js smoke --ga... |
| 136 | `tools/test_sanitation_system.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 55 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_Sanitation.js' |
| 137 | `tools/test_scale_standard.js` | passingNotGated | PASS | 3/3 | 219 |  |
| 138 | `tools/test_seamless_map_edges.js` | quarantine | FAIL_OTHER | 3/3 | 62 | ReferenceError: Scene_Map is not defined |
| 139 | `tools/test_seamless_seam_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_seamless_seam_live.js:83 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js smoke --g... |
| 140 | `tools/test_second_by_second_history.js` | quarantine | FAIL_API_DRIFT | 3/3 | 74 | FAIL second_by_second.universal_year_1_founding: TypeError: Cannot read properties of undefined (reading 'generate') |
| 141 | `tools/test_settlement_domestic_housing.js` | quarantine | KILLED_TIMEOUT | 3/3 | 180194 | killed after 180 s (timeout) with its whole process tree |
| 142 | `tools/test_settlement_expansion_multi_dwelling.js` | quarantine | KILLED_TIMEOUT | 3/3 | 180202 | killed after 180 s (timeout) with its whole process tree |
| 143 | `tools/test_settlement_pillars.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 63 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_SettlementPillars.js' |
| 144 | `tools/test_settlement_projects.js` | passingNotGated | PASS | 3/3 | 2989 |  |
| 145 | `tools/test_sheep_action_boxes.js` | passingNotGated | PASS | 3/3 | 332 |  |
| 146 | `tools/test_side_combos.js` | passingNotGated | PASS | 3/3 | 171 |  |
| 147 | `tools/test_slice_human.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 521 | + FullyQualifiedErrorId : FileNotFoundException |
| 148 | `tools/test_snapshot.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_snapshot.js names "test_snapshot": (the file's own path) |
| 149 | `tools/test_srd_character_presentation.js` | passingNotGated | PASS | 3/3 | 151 |  |
| 150 | `tools/test_srd_combat_proof.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 58 | Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_Conditions.js' |
| 151 | `tools/test_srd_equipment_proof.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 57 | Error: Cannot find module '<root>\game\js\plugins\UF_Conditions.js' |
| 152 | `tools/test_srd_parity.js` | passingNotGated | PASS | 3/3 | 100 |  |
| 153 | `tools/test_srd_rules_proof.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 90 | Error: Cannot find module '<root>\game\js\plugins\UF_Conditions.js' |
| 154 | `tools/test_stabilization.js` | passingNotGated | PASS | 3/3 | 1136 |  |
| 155 | `tools/test_standard_4d_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_standard_4d_ingame.js:145 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js smoke --... |
| 156 | `tools/test_standard_8d_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_standard_8d_ingame.js:238 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js smoke --... |
| 157 | `tools/test_starter_kit_and_stockpile.js` | passingNotGated | PASS | 3/3 | 57314 |  |
| 158 | `tools/test_stockpiles_designation.js` | passingNotGated | PASS | 3/3 | 104 |  |
| 159 | `tools/test_strata_cuts_and_caves.js` | gate | (gate, see above) | KILLED/KILLED/PASS | 180187 | killed after 180 s (timeout) with its whole process tree |
| 160 | `tools/test_strata_fluid_reconciliation.js` | quarantine | FAIL_OTHER (flaky) | KILLED/KILLED/PASS | 180180 | flaky (KILLED_TIMEOUT / KILLED_TIMEOUT / PASS): killed after 180 s (timeout) with its whole process tree |
| 161 | `tools/test_strata_foundation.js` | gate | PASS | 3/3 | 148842 |  |
| 162 | `tools/test_survival_needs_loop.js` | quarantine | KILLED_TIMEOUT | 3/3 | 180153 | killed after 180 s (timeout) with its whole process tree |
| 163 | `tools/test_survival_regressions.js` | passingNotGated | PASS | 3/3 | 26037 |  |
| 164 | `tools/test_temperate_arid_transition_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_temperate_arid_transition_live.js:311 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests... |
| 165 | `tools/test_tilesets_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_tilesets_live.js:75 names "run_tests": const out = childProcess.execSync('"C:\\Program Files\\nodejs\\node.exe" "${path.j... |
| 166 | `tools/test_time_domains_proof.js` | passingNotGated | PASS | 3/3 | 62 |  |
| 167 | `tools/test_title_menu.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_title_menu.js:48 names "nw.exe": childProcess.execSync('nw.exe game', { cwd: ROOT, timeout: 15000 }); |
| 168 | `tools/test_town_hall_ai_live.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_town_hall_ai_live.js:214 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_tests.js smoke --g... |
| 169 | `tools/test_u7_modular_composition.js` | passingNotGated | PASS | 3/3 | 209 |  |
| 170 | `tools/test_underground_room.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_underground_room.js:47 names "run_tests": const out = childProcess.execSync('"C:\\Program Files\\nodejs\\node.exe" "${pat... |
| 171 | `tools/test_unified_capability_proof.js` | quarantine | FAIL_MISSING_REFERENCE | 3/3 | 66 | Error: Cannot find module '../game/js/plugins/UF_Proficiency.js' |
| 172 | `tools/test_unpartnered_shelter_progression.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_unpartnered_shelter_progression.js:206 names "run_tests": const out = childProcess.execSync('"${nodePath}" tools/run_test... |
| 173 | `tools/test_upper_elevation_terrain.js` | quarantine | FAIL_API_DRIFT | 3/3 | 2442 | TypeError: Tilemap.isTileA1 is not a function |
| 174 | `tools/test_v2_clean_u7_composites.js` | passingNotGated | PASS | 3/3 | 115 |  |
| 175 | `tools/test_var2_suite.js` | quarantine | FAIL_OTHER | 3/3 | 663 | no index at <root>\reference\u7_originality_index.json: run with --build-index first |
| 176 | `tools/test_var_suite.js` | quarantine | FAIL_OTHER | 3/3 | 666 | no index at <root>\reference\u7_originality_index.json: run with --build-index first |
| 177 | `tools/test_vertical_worldgen_proof.js` | quarantine | FAIL_OTHER | 3/3 | 201 | FAIL: Subterranean stair landing is dry after the fluid simulation (cellAt.water=true, flooded=true, floodType=water) |
| 178 | `tools/test_volumetric_terrain_column.js` | passingNotGated | PASS | 3/3 | 85382 |  |
| 179 | `tools/test_walk_triplets.js` | passingNotGated | PASS | 3/3 | 154 |  |
| 180 | `tools/test_walls_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_walls_ingame.js:140 names "run_tests": '"C:\\Program Files\\nodejs\\node.exe" "${path.join(ROOT, 'tools', 'run_tests.js')... |
| 181 | `tools/test_water_ingame.js` | quarantine | NEEDS_NWJS | 3/3 | - | static screen: tools/test_water_ingame.js:44 names "run_tests": const out = childProcess.execSync('"C:\\Program Files\\nodejs\\node.exe" "${path.jo... |
| 182 | `tools/test_wolf_cleanup.js` | passingNotGated | PASS | 3/3 | 112 |  |
| 183 | `tools/test_z_cavern_gen.js` | passingNotGated | PASS | 3/3 | 138 |  |
| 184 | `tools/test_z_doors.js` | quarantine | FAIL_API_DRIFT | 3/3 | 104 | FAIL z_doors.legacy_refuses_level_aliasing: Cannot read properties of undefined (reading 'at') |
| 185 | `tools/test_z_fire.js` | quarantine | FAIL_API_DRIFT | 3/3 | 64 | FAIL z_fire.legacy_refuses_levels_without_mutation: TypeError: Cannot read properties of undefined (reading 'ignite') |
| 186 | `tools/test_z_floors.js` | quarantine | FAIL_API_DRIFT | 3/3 | 56 | FAIL z_floors.legacy_ground_read_write: Cannot read properties of undefined (reading 'canLay') |
| 187 | `tools/test_z_flora.js` | quarantine | FAIL_API_DRIFT | 3/3 | 83 | FAIL z_flora.depth_specific_natural_and_kit: TypeError: generators.get(...) is not a function |
| 188 | `tools/test_z_ownership.js` | quarantine | FAIL_API_DRIFT | 3/3 | 58 | FAIL ownership_z.legacy_ground_key: Cannot read properties of undefined (reading 'keyOf') |
| 189 | `tools/test_z_walls.js` | quarantine | FAIL_API_DRIFT | 3/3 | 51 | FAIL walls_z.legacy_lookup: Cannot read properties of undefined (reading 'baseAt') |

### tools/classify_tests.js heuristic against the measurement

`tools/classify_tests.js`, run at `425b594c` in a throwaway clone (evidence/classify_tests_run.log, output evidence/classify_tests_output_at_425b594c.md), labels 711 top-level `tools/*.js` files. It does not look into subfolders, so the nested suites are "(not seen)". Rows: the heuristic's label; columns: the measured category (FLAKY = the runs disagreed).

| heuristic \ measured | PASS | FAIL_API_DRIFT | FAIL_MISSING_REFERENCE | FAIL_OTHER | KILLED_TIMEOUT | FLAKY | NEEDS_NWJS | total |
|---|---|---|---|---|---|---|---|---|
| HEADLESS_AUTOMATED | 60 | 19 | 35 | 11 | 6 | 2 | 24 | 157 |
| PLAYTEST_IN_GAME | 1 | 0 | 0 | 0 | 0 | 0 | 18 | 19 |
| ART_PIPELINE | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 4 |
| UTILITY_TOOL | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| (not seen) | 6 | 0 | 0 | 1 | 1 | 0 | 0 | 8 |

- Labelled HEADLESS_AUTOMATED ("runnable in CI") but not passing: **97** of 157.
- Labelled PLAYTEST_IN_GAME ("requires live RMMZ") but not NEEDS_NWJS: **1** of 19.
- Mislabelled on runnability (the two lines above): **98**.
- NEEDS_NWJS suites the heuristic did not label PLAYTEST_IN_GAME: 24 (HEADLESS_AUTOMATED 24).
- Suites (tracked `test_*.js`) the heuristic files as a non-test (ART_PIPELINE, UTILITY_TOOL, LEGACY_OR_STALE): 5; not seen at all: 8.

Mislabelled PLAYTEST_IN_GAME suites (measured, not NEEDS_NWJS):

- `tools/test_hazard_torture_live.js`: PASS

NEEDS_NWJS suites labelled HEADLESS_AUTOMATED:

- `tools/test_all_faction_menus.js`
- `tools/test_ally_movement_exclusive_action_square.js`
- `tools/test_chest_left_click_info.js`
- `tools/test_container_item_interactions.js`
- `tools/test_continuous_frontier_progression.js`
- `tools/test_cooperative_homestead_construction.js`
- `tools/test_creatures_ingame.js`
- `tools/test_culling_native.js`
- `tools/test_dwarves_ingame.js`
- `tools/test_elves_ingame.js`
- `tools/test_faction_menus_clean.js`
- `tools/test_layer_switch_inplace.js`
- `tools/test_ludeon_planning.js`
- `tools/test_menu_ingame.js`
- `tools/test_perf_benchmark.js`
- `tools/test_post_town_hall_progression.js`
- `tools/test_snapshot.js`
- `tools/test_standard_4d_ingame.js`
- `tools/test_standard_8d_ingame.js`
- `tools/test_title_menu.js`
- `tools/test_underground_room.js`
- `tools/test_unpartnered_shelter_progression.js`
- `tools/test_walls_ingame.js`
- `tools/test_water_ingame.js`

### NEEDS_NWJS (never run by this lane)

| # | Suite | static screen evidence (file:line, harness name) |
|---|---|---|
| 1 | `tools/test_all_animated_objects_live.js` | tools/test_all_animated_objects_live.js:112 "nwjs" |
| 2 | `tools/test_all_faction_menus.js` | tools/test_all_faction_menus.js:35 "run_tests" |
| 3 | `tools/test_ally_movement_exclusive_action_square.js` | tools/test_ally_movement_exclusive_action_square.js:211 "run_tests" |
| 4 | `tools/test_building_variety_live.js` | tools/test_building_variety_live.js:209 "run_tests" |
| 5 | `tools/test_callings_and_clearing_live.js` | tools/test_callings_and_clearing_live.js:257 "run_tests" |
| 6 | `tools/test_chest_left_click_info.js` | tools/test_chest_left_click_info.js:12 "nwjs" |
| 7 | `tools/test_container_item_interactions.js` | tools/test_container_item_interactions.js:12 "nwjs" |
| 8 | `tools/test_continuous_frontier_progression.js` | tools/test_continuous_frontier_progression.js:168 "run_tests" |
| 9 | `tools/test_cooperative_homestead_construction.js` | tools/test_cooperative_homestead_construction.js:201 "run_tests" |
| 10 | `tools/test_creatures_ingame.js` | tools/test_creatures_ingame.js:84 "run_tests" |
| 11 | `tools/test_culling_native.js` | tools/test_culling_native.js:20 "nwjs" |
| 12 | `tools/test_dwarves_ingame.js` | tools/test_dwarves_ingame.js:163 "run_tests" |
| 13 | `tools/test_elves_ingame.js` | tools/test_elves_ingame.js:165 "run_tests" |
| 14 | `tools/test_faction_menus_clean.js` | tools/test_faction_menus_clean.js:14 "run_tests" |
| 15 | `tools/test_factions_live.js` | tools/test_factions_live.js:71 "run_tests" |
| 16 | `tools/test_fog_z_level_live.js` | tools/test_fog_z_level_live.js:124 "run_tests" |
| 17 | `tools/test_golden_art_review_live.js` | tools/test_golden_art_review_live.js:240 "run_tests" |
| 18 | `tools/test_greater_z_roof_live.js` | tools/test_greater_z_roof_live.js:153 "run_tests" |
| 19 | `tools/test_human_dwarf_8d_live.js` | tools/test_human_dwarf_8d_live.js:163 "run_tests" |
| 20 | `tools/test_human_female_variations_live.js` | tools/test_human_female_variations_live.js:150 "run_tests" |
| 21 | `tools/test_human_male_live_ingame.js` | tools/test_human_male_live_ingame.js:137 "run_tests" |
| 22 | `tools/test_human_male_variations_live.js` | tools/test_human_male_variations_live.js:145 "run_tests" |
| 23 | `tools/test_layer_switch_inplace.js` | tools/test_layer_switch_inplace.js:438 "run_tests" |
| 24 | `tools/test_light_wall_occlusion_live.js` | tools/test_light_wall_occlusion_live.js:157 "run_tests" |
| 25 | `tools/test_live_town_center_progression.js` | tools/test_live_town_center_progression.js:165 "run_tests" |
| 26 | `tools/test_ludeon_planning.js` | tools/test_ludeon_planning.js:189 "run_tests" |
| 27 | `tools/test_menu_ingame.js` | tools/test_menu_ingame.js:47 "run_tests" |
| 28 | `tools/test_perf_benchmark.js` | tools/test_perf_benchmark.js:12 "nwjs" |
| 29 | `tools/test_post_town_hall_progression.js` | tools/test_post_town_hall_progression.js:155 "run_tests" |
| 30 | `tools/test_round_world_live.js` | tools/test_round_world_live.js:117 "run_tests" |
| 31 | `tools/test_seamless_seam_live.js` | tools/test_seamless_seam_live.js:83 "run_tests" |
| 32 | `tools/test_snapshot.js` | tools/test_snapshot.js "test_snapshot" |
| 33 | `tools/test_standard_4d_ingame.js` | tools/test_standard_4d_ingame.js:145 "run_tests" |
| 34 | `tools/test_standard_8d_ingame.js` | tools/test_standard_8d_ingame.js:238 "run_tests" |
| 35 | `tools/test_temperate_arid_transition_live.js` | tools/test_temperate_arid_transition_live.js:311 "run_tests" |
| 36 | `tools/test_tilesets_live.js` | tools/test_tilesets_live.js:75 "run_tests" |
| 37 | `tools/test_title_menu.js` | tools/test_title_menu.js:48 "nw.exe" |
| 38 | `tools/test_town_hall_ai_live.js` | tools/test_town_hall_ai_live.js:214 "run_tests" |
| 39 | `tools/test_underground_room.js` | tools/test_underground_room.js:47 "run_tests" |
| 40 | `tools/test_unpartnered_shelter_progression.js` | tools/test_unpartnered_shelter_progression.js:206 "run_tests" |
| 41 | `tools/test_walls_ingame.js` | tools/test_walls_ingame.js:140 "run_tests" |
| 42 | `tools/test_water_ingame.js` | tools/test_water_ingame.js:44 "run_tests" |

### Quarantine by failure group (OPS.30.04 work items)

- **FAIL_API_DRIFT** (19): `test_19b_performance_determinism.js`, `test_diagonal_corners_and_doorways.js`, `test_dynamic_armor_reflection.js`, `test_ecology.js`, `test_faction_construction_and_homes.js`, `test_material_recipes.js`, `test_material_substitution.js`, `test_natural_connections.js`, `test_population_growth_and_immigration.js`, `test_regrowth_construction_guard.js`, `test_resource_node_materials.js`, `test_second_by_second_history.js`, `test_upper_elevation_terrain.js`, `test_z_doors.js`, `test_z_fire.js`, `test_z_floors.js`, `test_z_flora.js`, `test_z_ownership.js`, `test_z_walls.js`
- **FAIL_MISSING_REFERENCE: a file outside the repo (U7 install, an agent's brain folder)** (4): `test_adam_res.js`, `test_adam_scales.js`, `test_process_human_12.js`, `test_slice_human.js`
- **FAIL_MISSING_REFERENCE: a plugin the suite loads is gone (UF_* names) or not loaded** (23): `test_agriculture.js`, `test_callings_system.js`, `test_cooperative_building_and_offspring_pairbonding.js`, `test_culture_growth.js`, `test_d20_equipment_slots.js`, `test_extraction_difficulty.js`, `test_faction_founder_pairbonding.js`, `test_faction_reproduction.js`, `test_faction_starting_gear.js`, `test_family_integration.js`, `test_farm_view.js`, `test_fire_safety.js`, `test_goals.js`, `test_hist_metadata_contracts.js`, `test_material_refining_and_tech_pacing.js`, `test_physical_inventory_proof.js`, `test_profile_tabs.js`, `test_sanitation_system.js`, `test_settlement_pillars.js`, `test_srd_combat_proof.js`, `test_srd_equipment_proof.js`, `test_srd_rules_proof.js`, `test_unified_capability_proof.js`
- **FAIL_MISSING_REFERENCE: an input another tool writes (game/test_output/, scratch/) is missing** (8): `test_all_walk_cycles.js`, `test_clean_u7_composites.js`, `test_eye_variations.js`, `test_female_u7_composites.js`, `test_ff5_candidates.js`, `test_ff5_proportions_and_footsteps.js`, `test_fixed_cycle.js`, `test_portrait_clothing_offsets.js`
- **FAIL_OTHER** (13): `art/test_catalogue.js`, `test_all_object_charsets.js`, `test_birth_rate_halved.js`, `test_fix_facings.js`, `test_native_survival_soak.js`, `test_object_art.js`, `test_object_originality.js`, `test_production_history_demographics.js`, `test_round_world.js`, `test_seamless_map_edges.js`, `test_var2_suite.js`, `test_var_suite.js`, `test_vertical_worldgen_proof.js`
- **FAIL_OTHER (flaky)** (1): `test_strata_fluid_reconciliation.js`
- **KILLED_TIMEOUT** (7): `governance/test_merge_gate.js`, `test_autonomous_project_dispatch.js`, `test_autonomous_work_recovery.js`, `test_project_construction_loop.js`, `test_settlement_domestic_housing.js`, `test_settlement_expansion_multi_dwelling.js`, `test_survival_needs_loop.js`

### Supplementary: the timed-out and flaky suites with a 580 s timeout (not used for quarantine.json)

One run, fresh clone of `425b594c`, up to 3 at once, timeout 580 s (evidence/census_slow_580s*.log).

| Suite | 180 s census (3 runs) | 580 s run | ms | deciding line |
|---|---|---|---|---|
| `tools/governance/test_merge_gate.js` | KILLED_TIMEOUT / KILLED_TIMEOUT / KILLED_TIMEOUT | PASS | 195212 |  |
| `tools/test_autonomous_project_dispatch.js` | KILLED_TIMEOUT / KILLED_TIMEOUT / KILLED_TIMEOUT | PASS | 500640 |  |
| `tools/test_autonomous_work_recovery.js` | KILLED_TIMEOUT / KILLED_TIMEOUT / KILLED_TIMEOUT | FAIL_OTHER | 504790 | FAIL recovery.forage_target_gone_or_unreachable - gather at 34,20 found its plant picked -> done (null) after 9 updat... |
| `tools/test_project_construction_loop.js` | KILLED_TIMEOUT / KILLED_TIMEOUT / KILLED_TIMEOUT | KILLED_TIMEOUT | 580245 | killed after 580 s (timeout) with its whole process tree |
| `tools/test_settlement_domestic_housing.js` | KILLED_TIMEOUT / KILLED_TIMEOUT / KILLED_TIMEOUT | KILLED_TIMEOUT | 580366 | killed after 580 s (timeout) with its whole process tree |
| `tools/test_settlement_expansion_multi_dwelling.js` | KILLED_TIMEOUT / KILLED_TIMEOUT / KILLED_TIMEOUT | KILLED_TIMEOUT | 580365 | killed after 580 s (timeout) with its whole process tree |
| `tools/test_strata_fluid_reconciliation.js` | KILLED_TIMEOUT / KILLED_TIMEOUT / PASS | PASS | 163496 |  |
| `tools/test_survival_needs_loop.js` | KILLED_TIMEOUT / KILLED_TIMEOUT / KILLED_TIMEOUT | KILLED_TIMEOUT | 580143 | killed after 580 s (timeout) with its whole process tree |

### Passing in every run, not in the gate list (gate candidates)

| # | Suite | longest run ms |
|---|---|---|
| 1 | `tools/art/test_blank_templates.js` | 45592 |
| 2 | `tools/art/test_place_art.js` | 8640 |
| 3 | `tools/ops/test_run_gate.js` (measured on `2d9f513c`) | 61954 |
| 4 | `tools/sim/test_ledger.js` | 16035 |
| 5 | `tools/sim/test_ledger_longrun.js` | 24016 |
| 6 | `tools/test_aging_and_lifespan.js` | 60 |
| 7 | `tools/test_autonomous_settlement_closure.js` | 69468 |
| 8 | `tools/test_biome_standard.js` | 739 |
| 9 | `tools/test_clean_attack_sheet.js` | 211 |
| 10 | `tools/test_clean_bow_sheet.js` | 228 |
| 11 | `tools/test_clean_downed_sheet.js` | 179 |
| 12 | `tools/test_clean_haul_sheet.js` | 198 |
| 13 | `tools/test_clean_magic_sheet.js` | 224 |
| 14 | `tools/test_clean_walk_sheet.js` | 203 |
| 15 | `tools/test_clean_walk_sheet2.js` | 188 |
| 16 | `tools/test_clean_walk_sheet3.js` | 185 |
| 17 | `tools/test_clean_work_sheet.js` | 181 |
| 18 | `tools/test_column_landforms.js` | 578 |
| 19 | `tools/test_combat_dying_integration.js` | 100 |
| 20 | `tools/test_conditions_native_closure.js` | 1923 |
| 21 | `tools/test_conditions_system.js` | 75 |
| 22 | `tools/test_deer_action_boxes.js` | 208 |
| 23 | `tools/test_duplicate_registration.js` | 80 |
| 24 | `tools/test_facing_detection.js` | 74 |
| 25 | `tools/test_family_compounds_and_shops.js` | 84 |
| 26 | `tools/test_fixed_walk_playback.js` | 131 |
| 27 | `tools/test_foliage_sprite_animations.js` | 328 |
| 28 | `tools/test_gen3_metrics.js` | 197 |
| 29 | `tools/test_generated_z2_cut_proof.js` | 50727 |
| 30 | `tools/test_generator_combinations.js` | 371 |
| 31 | `tools/test_ground_shades_prototype.js` | 57 |
| 32 | `tools/test_hare_action_boxes.js` | 234 |
| 33 | `tools/test_haul_builder.js` | 100 |
| 34 | `tools/test_hazard_reflex.js` | 738 |
| 35 | `tools/test_hazard_torture_live.js` | 4670 |
| 36 | `tools/test_hearth_containment_and_provenance.js` | 150 |
| 37 | `tools/test_households.js` | 378 |
| 38 | `tools/test_human_inheritance.js` | 60 |
| 39 | `tools/test_liquid_depth_simulation.js` | 640 |
| 40 | `tools/test_minimap.js` | 70 |
| 41 | `tools/test_multi_deficit_settlement.js` | 956 |
| 42 | `tools/test_native_resolution_standard.js` | 94 |
| 43 | `tools/test_palette_standard.js` | 319 |
| 44 | `tools/test_r4c2_foreshorten.js` | 72 |
| 45 | `tools/test_resize_face.js` | 375 |
| 46 | `tools/test_resource_economy_standard.js` | 55 |
| 47 | `tools/test_scale_standard.js` | 219 |
| 48 | `tools/test_settlement_projects.js` | 2989 |
| 49 | `tools/test_sheep_action_boxes.js` | 332 |
| 50 | `tools/test_side_combos.js` | 171 |
| 51 | `tools/test_srd_character_presentation.js` | 151 |
| 52 | `tools/test_srd_parity.js` | 100 |
| 53 | `tools/test_stabilization.js` | 1136 |
| 54 | `tools/test_starter_kit_and_stockpile.js` | 57314 |
| 55 | `tools/test_stockpiles_designation.js` | 104 |
| 56 | `tools/test_survival_regressions.js` | 26037 |
| 57 | `tools/test_time_domains_proof.js` | 62 |
| 58 | `tools/test_u7_modular_composition.js` | 209 |
| 59 | `tools/test_v2_clean_u7_composites.js` | 115 |
| 60 | `tools/test_volumetric_terrain_column.js` | 85382 |
| 61 | `tools/test_walk_triplets.js` | 154 |
| 62 | `tools/test_wolf_cleanup.js` | 112 |
| 63 | `tools/test_z_cavern_gen.js` | 138 |

## run_gate test suite

`node tools/ops/test_run_gate.js` (raw output under "lane.json gateTests" below): 97 checks, of which 11 are
mutants, each applied to an in-memory copy of run_gate.js and run with `node -`; every mutant's check set first
passes on the unmutated source run the same way (`stdin_baseline_*`). Required by the brief: gate ignores a failing
exit, timeout removed, NEEDS_NWJS screen removed, missing-module rule swapped, `--check-lists` duplicate check
removed. Extra: tree kill removed, transitive screen removed, gate-mode NEEDS_NWJS refusal removed, runtime guard
removed, leftover sweep removed, `--check-lists` unlisted check removed.

The tree-kill mutant first survived: on Windows libuv puts a node process's ordinary children in a kill-on-close
job, so killing the hang fixture already ended its child. The fixture now detaches its child (as a leaked helper
would); the mutant is then caught by `census_timeout_tree_killed_before_sweep`.

The NEEDS_NWJS proof: every fixture suite writes `<name>.ran` when it runs; after the census of the 19-suite fixture
repo the four static NEEDS_NWJS fixtures have no marker and the other 15 all have one
(`census_needs_nwjs_never_spawned`, `census_every_other_suite_ran`). The NEEDS_NWJS fixtures never start anything
even if run: they only print or write their marker.

## PROPOSED follow-ups (the PM decides; nothing here was applied)

- **PROPOSED-Y-01 (gate list):** 63 suites passed in every run and are not gated (table "Passing in every run" above),
  all candidates for `gate_tests.json` `gate`. Two cautions: (a) `test_clean_attack_sheet.js`,
  `test_clean_bow_sheet.js`, `test_clean_downed_sheet.js`, `test_clean_haul_sheet.js`, `test_clean_magic_sheet.js`,
  `test_clean_work_sheet.js`, `test_fixed_walk_playback.js` and `test_r4c2_foreshorten.js` rewrite tracked PNGs
  under `art/review/` when run (8 files modified in the first census clone; each file name appears in exactly one of
  these suites' source; which run wrote which file was not traced). Under DEC-007 the PM/Owner may not want a gate
  that regenerates review art. (b) Three take over a minute: `test_volumetric_terrain_column.js` 85 s,
  `test_autonomous_settlement_closure.js` 69 s, `tools/ops/test_run_gate.js` 62 s.
- **PROPOSED-Y-02 (stale quarantine entry):** `gate_tests.json` quarantines `tools/test_generated_z2_cut_proof.js`
  ("Exits 1 on main; Lane H rework in progress"). It passed in all three runs (33-51 s).
  Remove it from the `quarantine` array; the WBS row puts it in GATE "once WG.00.08 lands". `--check-lists` prints
  this as a NOTE, not a violation.
- **PROPOSED-Y-03 (gate timing):** the whole gate takes about 576 s of suite time one at a time (run above), with
  `test_strata_cuts_and_caves.js` at 168-218 s. Any runner of the gate (merge gate: 600 s per test; lane.json here:
  1800 s; a future CI, OPS.30.02) needs at least 600 s for that suite and well over 10 minutes for the list.
- **PROPOSED-Y-04 (gate list):** add `tools/ops/test_run_gate.js` (3/3 PASS, 62 s), and have the merge gate or every
  lane.json run `node tools/ops/run_gate.js --check-lists` (it is a command, not a suite file, so it cannot go in
  the `gate` array as is).
- **PROPOSED-Y-05 (process):** `--check-lists` reports UNLISTED for any tracked `test_*.js` in no list. Every lane that
  adds a suite (live lanes X and Z write under `tools/`) must add it to the gate list or to `quarantine.json`
  (`passingNotGated` with `measuredOn`, or `suites`), so `tools/ops/quarantine.json` needs to be in those lanes'
  allowedPaths, or the census re-run after merges.
- **PROPOSED-Y-06 (OPS.30.04 work items):** the groups in "Quarantine by failure group": 19 API drift, 23 missing
  or unloaded plugins (UF_* names that no longer exist, or plugins the suite does not load), 8 missing generated
  inputs (`game/test_output/`, `scratch/`), 4 files outside the repo (U7 install, an agent's brain folder), 13 other
  failures, 1 flaky, 7 KILLED_TIMEOUT. `test_var_suite.js` and `test_var2_suite.js` fail because the local-only
  `reference/u7_originality_index.json` is absent (FAIL_OTHER by the rules; a missing reference in substance).
- **PROPOSED-Y-07 (KILLED_TIMEOUT is not "hung"):** with 580 s, 3 of the 8 timed-out or flaky suites pass
  (`test_merge_gate.js` 195 s, `test_autonomous_project_dispatch.js` 501 s, `test_strata_fluid_reconciliation.js`
  163 s), `test_autonomous_work_recovery.js` fails after 505 s, and 4 are still running at 580 s. OPS.30.04 should
  measure these alone before calling them broken.
- **PROPOSED-Y-08 (NW.js baseline):** the 42 NEEDS_NWJS suites are the input list for OPS.30.05 (quiet window).
  `tools/test_snapshot.js` is itself the harness.
- **PROPOSED-Y-09 (docs):** `docs/TEST_CLASSIFICATION.md` (generated 2026-09-21 by `tools/classify_tests.js`, 605
  scripts) is stale, and at the base the heuristic mislabels 98 suites on runnability (table above). Retire it or
  point it at `tools/ops/quarantine.json` (docs/ is outside this lane).
- **PROPOSED-Y-10 (scope):** the census covers `*.js` suites only, as briefed; `tools/ops/test_launch_worker.ps1`
  and `tools/ops/test_resume_queue.ps1` are not in it.
- **PROPOSED-Y-11 (WBS figures):** the row's "9 gate / 68 failing / 9 killed" came from an older audit. Measured at
  `425b594c`: 9 gate (all pass in gate mode), 68 FAIL_* outside the gate (19 + 35 + 14), 7 KILLED_TIMEOUT plus the
  gate suite killed in 2 of 3 runs, 42 NEEDS_NWJS, 63 passing outside the gate.

## DEC-007 note

Art-pipeline suites in the census (for example `test_clean_*_sheet.js`) re-render review images when they run. They
did so only inside the throwaway clones: the first census clone showed 8 tracked PNGs under `art/review/` modified.
Nothing was copied out of any clone, every clone was deleted, and this branch adds no image file
(`git diff --name-only 425b594c..HEAD` has no .png/.jpg/.gif/.bmp/.webp path). Suites that read an agent's image
folder (`test_process_human_12.js`, `test_slice_human.js`, `test_ff5_proportions_and_footsteps.js`) failed before
writing anything: their source folders do not exist on this machine.

## Not done / known problems

- **CRLF checkouts** (escalated): the census describes LF checkouts, as briefed. On a CRLF checkout three gate
  suites fail (A/B above), so lane.json gateTest 3 fails in `merge_gate.js`'s clones on this machine. How the other
  suites behave on CRLF checkouts was not measured.
- `test_run_gate.js` leaves one empty-ish runner scratch folder (`%TEMP%\deus-run-gate-*`, holding the guard file
  and one suite folder) per run: the `timeout_removed` mutant's runner is killed by the test's watchdog before it can
  clean up. Seven such folders from this session's seven direct runs were found (times matching the runs) and
  deleted; no process was left. Not fixed: it was found after the escalation above, and changing the test would
  invalidate its three measured runs.
- The screen is text-based. It follows literal requires and path tokens; a path assembled at run time is only caught
  by the runtime guard, and only while the suite keeps `NODE_OPTIONS` for its node children. A suite that merely
  names the harness in a comment is NEEDS_NWJS (deliberately conservative).
- The guard blocks any spawn whose arguments name the harness, including harmless ones such as `node --check
  tools/run_tests.js`; such a suite would show as NEEDS_NWJS (runtime). None did at the base.
- Leftover attribution uses parent PID plus creation time; an orphan whose parent was an intermediate process that
  already exited is only found if its command line names the scratch folder. The census found no leftovers.
- KILLED_TIMEOUT mixes slow and hung suites (PROPOSED-Y-07). All durations were measured on a machine shared with
  other lanes (Lane K's reviewer runs NW.js here), so they vary (for example `test_strata_foundation.js` 88-149 s).
- FAIL_API_DRIFT cannot tell whether the undefined value came from a project module or the suite itself.
  `ReferenceError` is FAIL_OTHER (`test_fix_facings.js`: the suite's own variable; `test_round_world.js`,
  `test_seamless_map_edges.js`: the RMMZ global `Scene_Map`).
- `--check-lists` on main will report UNLISTED as soon as another lane merges a new suite (PROPOSED-Y-05).
- The POSIX code paths (process groups, `ps`) were not run; everything ran on Windows 11 with node v24.19.0.
- The whole gate cannot run as one foreground command within this environment's 10-minute shell limit; see
  deviation 4.

## lane.json gateTests (run before the final commit)

All four entries of `tasks/OPS.30.01/lane-y/lane.json` `gateTests`, exactly as written, on commit `e5f1dafc42defd88590a703f45393607b4a868c5` (the commits after it add only this report, `escalation.md` and evidence).

**In the worktree** (entries 1, 2 and 4; the brief runs these from the worktree root), `evidence/gatetests_worktree.log`:

```
# worktree C:/Users/snewt/.deus_worktrees/lane-y at e5f1dafc42defd88590a703f45393607b4a868c5
$ node tools/ops/test_run_gate.js
test_run_gate: fixtures in C:\Users\snewt\AppData\Local\Temp\deus-test-run-gate-bBxUjN
PASS gate_all_pass_exit_0
PASS gate_default_timeout_600
PASS gate_line_format
PASS gate_one_suite_broken_exit_1
PASS gate_failure_shows_deciding_line
PASS gate_refuses_nwjs_in_list_exit_2_runs_nothing
PASS gate_refuses_nwjs_suite_named_exit_2
PASS gate_refuses_transitive_nwjs_exit_2
PASS gate_timeout_exit_1
PASS gate_timeout_killed_suite_and_child
PASS gate_empty_list_exit_2
PASS gate_invalid_list_exit_2
PASS gate_missing_suite_exit_2
PASS screen_mode_runs_nothing
PASS usage_unknown_flag_exit_2
PASS usage_concurrency_above_3_exit_2
PASS usage_census_without_out_exit_2
PASS census_complete_exit_0
PASS census_rows_are_the_tracked_suites
PASS category_test_pass_PASS
PASS category_test_pass_nested_PASS
PASS category_test_fail_FAIL_OTHER
PASS category_test_hang_KILLED_TIMEOUT
PASS category_test_leak_PASS
PASS category_test_missing_module_FAIL_MISSING_DEPENDENCY
PASS category_test_missing_plugin_FAIL_MISSING_REFERENCE
PASS category_test_enoent_FAIL_MISSING_REFERENCE
PASS category_test_type_error_FAIL_API_DRIFT
PASS category_test_stdout_only_FAIL_MISSING_REFERENCE
PASS category_test_stderr_decides_FAIL_OTHER
PASS category_test_nw_binary_ref_NEEDS_NWJS
PASS category_test_harness_runner_ref_NEEDS_NWJS
PASS category_test_via_helper_NEEDS_NWJS
PASS category_test_via_spawned_script_NEEDS_NWJS
PASS category_test_plugin_comment_PASS
PASS category_test_guard_evasion_NEEDS_NWJS
PASS category_test_dotnet_missing_file_FAIL_MISSING_REFERENCE
PASS category_test_plugin_not_loaded_FAIL_MISSING_REFERENCE
PASS census_needs_nwjs_never_spawned
PASS census_every_other_suite_ran
PASS census_nwjs_rows_carry_screen_evidence
PASS census_hang_killed_with_its_child
PASS census_leak_child_swept
PASS census_guard_evasion_blocked
PASS census_deciding_lines
PASS census_row_fields
PASS census_gate_flag
PASS census_lines_hide_root_path
PASS census_log_dir_one_log_per_run_suite
PASS census_defaults_180s_3_at_once
PASS census_budget_partial_exit_3
PASS census_resume_completes_exit_0
PASS census_refuses_to_overwrite_complete_exit_2
PASS census_refuses_nwjs_suite_named_exit_2
PASS check_lists_ok_exit_0
PASS check_lists_default_gate_list_exit_0
PASS check_lists_duplicate_in_gate
PASS check_lists_unlisted_suite
PASS check_lists_duplicate_in_quarantine
PASS check_lists_missing_path
PASS check_lists_suite_in_gate_and_quarantine
PASS check_lists_suite_in_gate_and_gate_tests_quarantine
PASS check_lists_bad_schema
PASS check_lists_needs_nwjs_in_gate
PASS check_lists_needs_nwjs_recorded_passing
PASS check_lists_stale_needs_nwjs
PASS check_lists_invalid_gate_list
PASS check_lists_missing_quarantine_file
PASS check_lists_runs_no_suite
PASS merge_three_agreeing_runs
PASS merge_output_passes_check_lists
PASS merge_flaky_suite_is_fail_other
PASS merge_refuses_partial_census_exit_2
PASS merge_refuses_missing_run_exit_2
PASS stdin_baseline_setGateFail
PASS mutant_gate_ignores_failing_exit_killed
    mutant gate_ignores_failing_exit caught by: gate_one_suite_broken_exit_1
PASS stdin_baseline_setTimeoutKill
PASS mutant_timeout_removed_killed
    mutant timeout_removed caught by: gate_timeout_exit_1, gate_timeout_killed_suite_and_child
PASS stdin_baseline_setScreenGate
PASS mutant_needs_nwjs_screen_removed_killed
    mutant needs_nwjs_screen_removed caught by: gate_refuses_nwjs_suite_named_exit_2
PASS stdin_baseline_setMissingModule
PASS mutant_missing_module_rule_swapped_killed
    mutant missing_module_rule_swapped caught by: census_missing_module_category
PASS stdin_baseline_setDuplicate
PASS mutant_check_lists_duplicate_check_removed_killed
    mutant check_lists_duplicate_check_removed caught by: check_lists_duplicate_in_gate
PASS stdin_baseline_setTreeKill
PASS mutant_tree_kill_removed_killed
    mutant tree_kill_removed caught by: census_timeout_tree_killed_before_sweep
PASS stdin_baseline_setTransitive
PASS mutant_transitive_screen_removed_killed
    mutant transitive_screen_removed caught by: gate_refuses_transitive_nwjs_exit_2
PASS mutant_gate_nwjs_refusal_removed_killed
    mutant gate_nwjs_refusal_removed caught by: gate_refuses_nwjs_suite_named_exit_2
PASS stdin_baseline_setGuard
PASS mutant_runtime_guard_removed_killed
    mutant runtime_guard_removed caught by: census_runtime_guard_blocks_launch
PASS stdin_baseline_setLeak
PASS mutant_leftover_sweep_removed_killed
    mutant leftover_sweep_removed caught by: census_leftover_child_swept
PASS stdin_baseline_setUnlisted
PASS mutant_check_lists_unlisted_check_removed_killed
    mutant check_lists_unlisted_check_removed caught by: check_lists_unlisted_suite
PASS run_gate_on_disk_unchanged
PASS no_leftover_processes
RESULT: 97 passed, 0 failed
EXIT=0
$ node tools/ops/run_gate.js --check-lists
run_gate: check-lists, root C:\Users\snewt\.deus_worktrees\lane-y, gate list C:\Users\snewt\.deus_worktrees\lane-y\tools\ops\gate_tests.json, quarantine C:\Users\snewt\.deus_worktrees\lane-y\tools\ops\quarantine.json
NOTE: tools/test_generated_z2_cut_proof.js is on the gate_tests.json quarantine list but quarantine.json records it passing in every run
CHECK-LISTS: OK (9 gate, 117 quarantined, 63 passingNotGated, 188 tracked suites)
EXIT=0
$ node tools/check_deus_syntax.js
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

**In a clone made the way `merge_gate.js` makes one** (`git clone --shared --no-checkout <common dir>`, `checkout --detach`, system `core.autocrlf=true`, so CRLF files), entries 1, 2 and 4, `evidence/gatetests_clone.log`:

```
# fresh clone C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests (git clone --shared --no-checkout C:/Users/snewt/OneDrive/Desktop/UF/.git; checkout --detach e5f1dafc42defd88590a703f45393607b4a868c5; system core.autocrlf, CRLF files), cwd = clone
$ node tools/ops/test_run_gate.js
test_run_gate: fixtures in C:\Users\snewt\AppData\Local\Temp\deus-test-run-gate-MSZ25O
PASS gate_all_pass_exit_0
PASS gate_default_timeout_600
PASS gate_line_format
PASS gate_one_suite_broken_exit_1
PASS gate_failure_shows_deciding_line
PASS gate_refuses_nwjs_in_list_exit_2_runs_nothing
PASS gate_refuses_nwjs_suite_named_exit_2
PASS gate_refuses_transitive_nwjs_exit_2
PASS gate_timeout_exit_1
PASS gate_timeout_killed_suite_and_child
PASS gate_empty_list_exit_2
PASS gate_invalid_list_exit_2
PASS gate_missing_suite_exit_2
PASS screen_mode_runs_nothing
PASS usage_unknown_flag_exit_2
PASS usage_concurrency_above_3_exit_2
PASS usage_census_without_out_exit_2
PASS census_complete_exit_0
PASS census_rows_are_the_tracked_suites
PASS category_test_pass_PASS
PASS category_test_pass_nested_PASS
PASS category_test_fail_FAIL_OTHER
PASS category_test_hang_KILLED_TIMEOUT
PASS category_test_leak_PASS
PASS category_test_missing_module_FAIL_MISSING_DEPENDENCY
PASS category_test_missing_plugin_FAIL_MISSING_REFERENCE
PASS category_test_enoent_FAIL_MISSING_REFERENCE
PASS category_test_type_error_FAIL_API_DRIFT
PASS category_test_stdout_only_FAIL_MISSING_REFERENCE
PASS category_test_stderr_decides_FAIL_OTHER
PASS category_test_nw_binary_ref_NEEDS_NWJS
PASS category_test_harness_runner_ref_NEEDS_NWJS
PASS category_test_via_helper_NEEDS_NWJS
PASS category_test_via_spawned_script_NEEDS_NWJS
PASS category_test_plugin_comment_PASS
PASS category_test_guard_evasion_NEEDS_NWJS
PASS category_test_dotnet_missing_file_FAIL_MISSING_REFERENCE
PASS category_test_plugin_not_loaded_FAIL_MISSING_REFERENCE
PASS census_needs_nwjs_never_spawned
PASS census_every_other_suite_ran
PASS census_nwjs_rows_carry_screen_evidence
PASS census_hang_killed_with_its_child
PASS census_leak_child_swept
PASS census_guard_evasion_blocked
PASS census_deciding_lines
PASS census_row_fields
PASS census_gate_flag
PASS census_lines_hide_root_path
PASS census_log_dir_one_log_per_run_suite
PASS census_defaults_180s_3_at_once
PASS census_budget_partial_exit_3
PASS census_resume_completes_exit_0
PASS census_refuses_to_overwrite_complete_exit_2
PASS census_refuses_nwjs_suite_named_exit_2
PASS check_lists_ok_exit_0
PASS check_lists_default_gate_list_exit_0
PASS check_lists_duplicate_in_gate
PASS check_lists_unlisted_suite
PASS check_lists_duplicate_in_quarantine
PASS check_lists_missing_path
PASS check_lists_suite_in_gate_and_quarantine
PASS check_lists_suite_in_gate_and_gate_tests_quarantine
PASS check_lists_bad_schema
PASS check_lists_needs_nwjs_in_gate
PASS check_lists_needs_nwjs_recorded_passing
PASS check_lists_stale_needs_nwjs
PASS check_lists_invalid_gate_list
PASS check_lists_missing_quarantine_file
PASS check_lists_runs_no_suite
PASS merge_three_agreeing_runs
PASS merge_output_passes_check_lists
PASS merge_flaky_suite_is_fail_other
PASS merge_refuses_partial_census_exit_2
PASS merge_refuses_missing_run_exit_2
PASS stdin_baseline_setGateFail
PASS mutant_gate_ignores_failing_exit_killed
    mutant gate_ignores_failing_exit caught by: gate_one_suite_broken_exit_1
PASS stdin_baseline_setTimeoutKill
PASS mutant_timeout_removed_killed
    mutant timeout_removed caught by: gate_timeout_exit_1, gate_timeout_killed_suite_and_child
PASS stdin_baseline_setScreenGate
PASS mutant_needs_nwjs_screen_removed_killed
    mutant needs_nwjs_screen_removed caught by: gate_refuses_nwjs_suite_named_exit_2
PASS stdin_baseline_setMissingModule
PASS mutant_missing_module_rule_swapped_killed
    mutant missing_module_rule_swapped caught by: census_missing_module_category
PASS stdin_baseline_setDuplicate
PASS mutant_check_lists_duplicate_check_removed_killed
    mutant check_lists_duplicate_check_removed caught by: check_lists_duplicate_in_gate
PASS stdin_baseline_setTreeKill
PASS mutant_tree_kill_removed_killed
    mutant tree_kill_removed caught by: census_timeout_tree_killed_before_sweep
PASS stdin_baseline_setTransitive
PASS mutant_transitive_screen_removed_killed
    mutant transitive_screen_removed caught by: gate_refuses_transitive_nwjs_exit_2
PASS mutant_gate_nwjs_refusal_removed_killed
    mutant gate_nwjs_refusal_removed caught by: gate_refuses_nwjs_suite_named_exit_2
PASS stdin_baseline_setGuard
PASS mutant_runtime_guard_removed_killed
    mutant runtime_guard_removed caught by: census_runtime_guard_blocks_launch
PASS stdin_baseline_setLeak
PASS mutant_leftover_sweep_removed_killed
    mutant leftover_sweep_removed caught by: census_leftover_child_swept
PASS stdin_baseline_setUnlisted
PASS mutant_check_lists_unlisted_check_removed_killed
    mutant check_lists_unlisted_check_removed caught by: check_lists_unlisted_suite
PASS run_gate_on_disk_unchanged
PASS no_leftover_processes
RESULT: 97 passed, 0 failed
EXIT=0
$ node tools/ops/run_gate.js --check-lists
run_gate: check-lists, root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests, gate list C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests\tools\ops\gate_tests.json, quarantine C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests\tools\ops\quarantine.json
NOTE: tools/test_generated_z2_cut_proof.js is on the gate_tests.json quarantine list but quarantine.json records it passing in every run
CHECK-LISTS: OK (9 gate, 117 quarantined, 63 passingNotGated, 188 tracked suites)
EXIT=0
$ node tools/check_deus_syntax.js
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

Entry 3 in the same clone (run as a job, waited on in the foreground: about 10 minutes), `evidence/gatetests_clone_gate.log`:

```
# same clone C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests at e5f1dafc42defd88590a703f45393607b4a868c5, cwd = clone
$ node tools/ops/run_gate.js
run_gate: gate mode, 9 suites from C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests\tools\ops\gate_tests.json, root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests, HEAD e5f1dafc42defd88590a703f45393607b4a868c5, timeout 600 s each, one at a time
GATE tools/check_deus_syntax.js EXIT=0 2867ms
GATE tools/test_palette.js EXIT=0 41ms
GATE tools/governance/test_check_claims.js EXIT=0 135315ms
GATE tools/test_strata_cuts_and_caves.js EXIT=2 167148ms FAIL_OTHER
    | decided by other: RESULT: 18 passed, 0 failed (exit 2)
    | PASS cave_free_terrain - 18: cave columns 2058 (3.14 %), massif 691 (1.05 %); 3: cave columns 1531 (2.34 %), massif 290 (0.44 %); 21: cave columns 1927 (2.94 %), massif 262 (0.40 %); 4: cave columns 1686 (2.57 %), massif 1006 (1.54 %) (limits 5 % and 3 %)
    | PASS traversable_terrain - 18: standable 125240/124320 (100.7 %), ground 24408/23939 (102.0 %), largest ground region 14148/14537 (97.3 %), start valley untouched true; 3: standable 128150/127194 (100.8 %), ground 39962/39468 (101.3 %), largest ground region 39557/39320 (100.6 %), start valley untouched true; 21: standable 127618/126036 (101.3 %), ground 12686/11478 (110.5 %), largest ground region 3348/3348 (100.0 %), start valley untouched true; 4: standable 123812/123627 (100.1 %), ground 15315/14346 (106.8 %), largest ground region 4442/4457 (99.7 %), start valley untouched true
    | PASS cave_overburden - seed 18: 2128 roofed generated cave floors (hasOpaqueOverburden true and continuousAirHeight = the air run of the strata), 2989 sky-open cut floors (no overburden, Infinity); wrong 0; network chambers roofed at their centres 47/48 (want >= 90 %: a mouth or a cut can open a few): #7 (22,201) floor 10: open to the sky
    | PASS cave_void_minimum - roofed generated cave voids over 4 seeds by height (ft): {"3":852,"4":1995,"5":2130,"6":1071,"7":1047,"8":301,"9":77,"10":20,"11":5,"12":8,"13":3,"14":2}; under 3 ft 0
    | PASS roof_breach - cave (167,31,0) under 1 ft of roof: before {"ob":true,"cl":"5","shape":"floor"}, dug 1 strata (want 1) -> {"ob":false,"cl":"Infinity","shape":"floor"}, restored {"ob":true,"cl":"5","records":0}; +2 cave (136,176,2) under a stone cap 10 ft: overburden true -> breached (true, levels:capBreached 1) false, clearance 4 -> Infinity; saved and loaded: overburden false, cap gone, saved record true; restored: overburden true, clearance 4, record kept false
    | PASS clearance_4_5_more - fixture column (64,30): 1 solid + 4 air under solid 4 ft (derived shape floor: the compatibility view; the clearance is the data), 5 air on -2's S4 5, across -1 and the ground 6 (airRunAt 6), up to +1 9, open sky Infinity, a 2 ft slot 2 (shape solid), solid 0, no floor -1; restored records 0; generated floors: 4 ft (176,39,0), 5 ft (167,31,0), > 5 ft 7 ft (175,46,0); 1,000,000 queries 1403 ns each, heap growth 105840 B (checksum 6075000)
    | PASS clearance_stops_at_fluid - fixture column (64,30): -1 stone + 4 water, ground solid: continuousAirHeight 0 (want 0), airRunAt(6) 0 (want 0); -1 stone + 2 air + 2 water: continuousAirHeight 2 (want 2), airRunAt(6) 2 (want 2); -1 stone + water + 3 air (from the floor): continuousAirHeight 0 (want 0), airRunAt(6) 0 (want 0); the same, air run from S2: continuousAirHeight 0 (want 0), airRunAt(7) 3 (want 3); -2 stone + 4 lava, -1 solid: continuousAirHeight 0 (want 0), airRunAt(1) 0 (want 0); -2 stone + 4 air, -1 solid (control): continuousAirHeight 4 (want 4), airRunAt(1) 4 (want 4); restored records 0
    | PASS multi_z_connectivity - 3 networks flagged multi-Z in seed 18; #6 from (202,50) floor 10 ft: 658 air strata (roofed), floors on levels [-1,0]; natural ramp connectors added 294, e.g. (71,24,-1) derived ramp
    | HARNESS shafts_keep_fluid: the shaft loop to instrument is missing
    | RESULT: 18 passed, 0 failed (exit 2)
GATE tools/test_new_game_year0.js EXIT=1 2560ms FAIL_OTHER
    | decided by other: Error: Override anchor found 0 times in DEUS_FactionMenus.js: this._factionIndex = 0;
    |     at createMenusEnv (<root>\tools\test_new_game_year0.js:131:17)
    |     at runSectionA (<root>\tools\test_new_game_year0.js:153:17)
    |     at main (<root>\tools\test_new_game_year0.js:452:35)
    |     at Object.<anonymous> (<root>\tools\test_new_game_year0.js:490:1)
    |     at Module._compile (node:internal/modules/cjs/loader:1872:14)
    |     at Object..js (node:internal/modules/cjs/loader:2003:10)
    |     at Module.load (node:internal/modules/cjs/loader:1594:32)
    |     at Module._load (node:internal/modules/cjs/loader:1396:12)
    |     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    | Node.js v24.19.0
GATE tools/test_history_materialization_and_world_age.js EXIT=0 92289ms
GATE tools/test_historical_carrying_capacity.js EXIT=1 365ms FAIL_OTHER
    | decided by other: FAIL: Error: CANDIDATE_MISMATCH: working plugin differs from frozen candidate
    |     at assert (<root>\tools\test_historical_carrying_capacity.js:51:50)
    |     at sourceBundle (<root>\tools\test_historical_carrying_capacity.js:95:9)
    |     at main (<root>\tools\test_historical_carrying_capacity.js:603:18)
    |     at Object.<anonymous> (<root>\tools\test_historical_carrying_capacity.js:608:36)
    |     at Module._compile (node:internal/modules/cjs/loader:1872:14)
    |     at Object..js (node:internal/modules/cjs/loader:2003:10)
    |     at Module.load (node:internal/modules/cjs/loader:1594:32)
    |     at Module._load (node:internal/modules/cjs/loader:1396:12)
    |     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    |     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
GATE tools/test_geology_strata.js EXIT=0 17084ms
GATE tools/test_strata_foundation.js EXIT=0 101044ms
LEFTOVERS: none
RESULT: 6 passed, 3 failed
EXIT=1
```

**Entry 3 exits 1 in the CRLF clone.** Three gate suites fail there and pass on an LF checkout of the same commit (`evidence/crlf_ab.log`, A/B on the same clone):

```
# A/B on C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests at e5f1dafc42defd88590a703f45393607b4a868c5: A = checkout with system core.autocrlf=true (JavaScript source, Unicode text, UTF-8 text, with CRLF line terminators)
$ node tools/ops/run_gate.js --root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests --suite tools/test_new_game_year0.js --suite tools/test_historical_carrying_capacity.js --suite tools/test_strata_cuts_and_caves.js
GATE tools/test_new_game_year0.js EXIT=1 2656ms FAIL_OTHER
GATE tools/test_historical_carrying_capacity.js EXIT=1 363ms FAIL_OTHER
GATE tools/test_strata_cuts_and_caves.js EXIT=2 170568ms FAIL_OTHER
LEFTOVERS: none
RESULT: 0 passed, 3 failed
EXIT=1
# B = same clone after: git config core.autocrlf false; git rm -q --cached -r .; git reset -q --hard  (JavaScript source, Unicode text, UTF-8 text), HEAD e5f1dafc42defd88590a703f45393607b4a868c5
$ node tools/ops/run_gate.js --root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-gatetests --suite tools/test_new_game_year0.js --suite tools/test_historical_carrying_capacity.js --suite tools/test_strata_cuts_and_caves.js
GATE tools/test_new_game_year0.js EXIT=0 14120ms
GATE tools/test_historical_carrying_capacity.js EXIT=0 17751ms
GATE tools/test_strata_cuts_and_caves.js EXIT=0 245837ms
LEFTOVERS: none
RESULT: 3 passed, 0 failed
EXIT=0
```

This is escalated in `tasks/OPS.30.01/lane-y/escalation.md` (standing rule 6): the fix is in read-only files (`merge_gate.js` clone options, a repo `.gitattributes`, or the three suites). Entry 3 passed on the LF fresh clone of main (`evidence/gate_fresh_clone.log`, `EXIT=0`, see above).

## Scope

`node tasks/OPS.30.01/lane-y/analysis/scope_check.js --cached` (every path changed since the base, matched against `lane.json` allowedPaths; run with the final commit staged; `git diff --name-only 425b594c..HEAD` after the commit gives the same list):

```
$ git diff --cached --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f: 522 paths, 0 outside allowedPaths
  tools/ops/run_gate.js: 1
  tools/ops/test_run_gate.js: 1
  tools/ops/quarantine.json: 1
  tools/ops/fixtures/run_gate/**: 43
  tasks/OPS.30.01/**: 476
paths other than evidence/logs/** and evidence/superseded/**:
  tasks/OPS.30.01/lane-y/BRIEF.md
  tasks/OPS.30.01/lane-y/REPORT.md
  tasks/OPS.30.01/lane-y/analysis/report_tables.js
  tasks/OPS.30.01/lane-y/analysis/scope_check.js
  tasks/OPS.30.01/lane-y/escalation.md
  tasks/OPS.30.01/lane-y/evidence/census_run1.json
  tasks/OPS.30.01/lane-y/evidence/census_run1.log
  tasks/OPS.30.01/lane-y/evidence/census_run2.json
  tasks/OPS.30.01/lane-y/evidence/census_run2.log
  tasks/OPS.30.01/lane-y/evidence/census_run3.json
  tasks/OPS.30.01/lane-y/evidence/census_run3.log
  tasks/OPS.30.01/lane-y/evidence/census_slow_580s.json
  tasks/OPS.30.01/lane-y/evidence/census_slow_580s.log
  tasks/OPS.30.01/lane-y/evidence/census_slow_580s_chunk2.log
  tasks/OPS.30.01/lane-y/evidence/census_slow_580s_chunk3.log
  tasks/OPS.30.01/lane-y/evidence/census_tip_run1.json
  tasks/OPS.30.01/lane-y/evidence/census_tip_run1.log
  tasks/OPS.30.01/lane-y/evidence/census_tip_run2.json
  tasks/OPS.30.01/lane-y/evidence/census_tip_run2.log
  tasks/OPS.30.01/lane-y/evidence/census_tip_run3.json
  tasks/OPS.30.01/lane-y/evidence/census_tip_run3.log
  tasks/OPS.30.01/lane-y/evidence/check_lists_worktree.log
  tasks/OPS.30.01/lane-y/evidence/classify_tests_output_at_425b594c.md
  tasks/OPS.30.01/lane-y/evidence/classify_tests_run.log
  tasks/OPS.30.01/lane-y/evidence/crlf_ab.log
  tasks/OPS.30.01/lane-y/evidence/gate_broken_suite.log
  tasks/OPS.30.01/lane-y/evidence/gate_fresh_clone.log
  tasks/OPS.30.01/lane-y/evidence/gatetests_clone.log
  tasks/OPS.30.01/lane-y/evidence/gatetests_clone_gate.log
  tasks/OPS.30.01/lane-y/evidence/gatetests_worktree.log
  tasks/OPS.30.01/lane-y/evidence/merge.log
  tasks/OPS.30.01/lane-y/evidence/strata_cuts_standalone.log
  tasks/OPS.30.01/lane-y/lane.json
  tasks/OPS.30.01/lane-y/launches/20260926_070955_prompt.txt
  tasks/OPS.30.01/lane-y/leftover_check.js
  tasks/OPS.30.01/lane-y/wait_for_exit.js
  tools/ops/fixtures/run_gate/README.md
  tools/ops/fixtures/run_gate/helpers/api.js
  tools/ops/fixtures/run_gate/helpers/harness_helper.js
  tools/ops/fixtures/run_gate/helpers/launcher.js
  tools/ops/fixtures/run_gate/helpers/plugin_notes.js
  tools/ops/fixtures/run_gate/helpers/sleeper.js
  tools/ops/fixtures/run_gate/lists/cl_gate_duplicate.json
  tools/ops/fixtures/run_gate/lists/cl_gate_in_both.json
  tools/ops/fixtures/run_gate/lists/cl_gate_missing_path.json
  tools/ops/fixtures/run_gate/lists/cl_gate_nw.json
  tools/ops/fixtures/run_gate/lists/cl_gate_ok.json
  tools/ops/fixtures/run_gate/lists/cl_gate_quarantined_in_gate_tests.json
  tools/ops/fixtures/run_gate/lists/cl_quarantine_bad_schema.json
  tools/ops/fixtures/run_gate/lists/cl_quarantine_duplicate.json
  tools/ops/fixtures/run_gate/lists/cl_quarantine_no_nw.json
  tools/ops/fixtures/run_gate/lists/cl_quarantine_nw_as_pass.json
  tools/ops/fixtures/run_gate/lists/cl_quarantine_nw_stale.json
  tools/ops/fixtures/run_gate/lists/cl_quarantine_ok.json
  tools/ops/fixtures/run_gate/lists/cl_quarantine_unlisted.json
  tools/ops/fixtures/run_gate/lists/gate_all_pass.json
  tools/ops/fixtures/run_gate/lists/gate_empty.json
  tools/ops/fixtures/run_gate/lists/gate_invalid.json
  tools/ops/fixtures/run_gate/lists/gate_missing_suite.json
  tools/ops/fixtures/run_gate/lists/gate_names_nw.json
  tools/ops/fixtures/run_gate/lists/gate_one_fails.json
  tools/ops/fixtures/run_gate/suites/dotnet_missing_file.js
  tools/ops/fixtures/run_gate/suites/enoent.js
  tools/ops/fixtures/run_gate/suites/fail.js
  tools/ops/fixtures/run_gate/suites/guard_evasion.js
  tools/ops/fixtures/run_gate/suites/hang.js
  tools/ops/fixtures/run_gate/suites/harness_runner_ref.js
  tools/ops/fixtures/run_gate/suites/leak.js
  tools/ops/fixtures/run_gate/suites/missing_module.js
  tools/ops/fixtures/run_gate/suites/missing_plugin.js
  tools/ops/fixtures/run_gate/suites/nw_binary_ref.js
  tools/ops/fixtures/run_gate/suites/pass.js
  tools/ops/fixtures/run_gate/suites/plugin_comment.js
  tools/ops/fixtures/run_gate/suites/plugin_not_loaded.js
  tools/ops/fixtures/run_gate/suites/stderr_decides.js
  tools/ops/fixtures/run_gate/suites/stdout_only.js
  tools/ops/fixtures/run_gate/suites/type_error.js
  tools/ops/fixtures/run_gate/suites/via_helper.js
  tools/ops/fixtures/run_gate/suites/via_spawned_script.js
  tools/ops/quarantine.json
  tools/ops/run_gate.js
  tools/ops/test_run_gate.js
EXIT=0
```

`BRIEF.md`, `lane.json` and `launches/20260926_070955_prompt.txt` come from the `[pm]` commit `63e07276` and the `[ops]` launcher commit `7a02e1b5`; this lane did not edit them. `git diff --cached --name-only 425b594c -- tools/ops/gate_tests.json 'tools/test_*.js' tools/classify_tests.js tools/run_tests.js tools/governance docs game art` prints nothing (0 lines).

Final `git rev-parse HEAD`: recorded in the next line by a follow-up commit (a commit cannot hold its own hash).
