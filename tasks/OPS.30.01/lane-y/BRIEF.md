# Lane Y Brief: OPS.30.01 GATE suite runner and measured quarantine census

**NO ART GENERATION BY ANYONE (DEC-007).** Test-infrastructure tooling only.

**Lane:** lane-y | **Task ID:** OPS.30.01 (GATE suite list and quarantine list; `docs/worldgen/DEUS_WORLDGEN_WBS.md` M0.4 table, line ~428; rank 6 of the "next 10 parallel packages") | **Branch:** task/lane-y | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-y` | **Writer:** claude | **Reviewer:** grok (independent attack/mutation review, launched later by the PM; the task is not DONE until that review passes) | **Base:** origin/main `425b594c146d5f353c10faa11f4b5d47f499b45f` | **Source:** Owner-authorised main-chat ops 2026-09-26 (PM launches and merges, 0028-AC A0). The row lists no dependency.

**allowedPaths** (exact; mirrored in `tasks/OPS.30.01/lane-y/lane.json`):
- `tools/ops/run_gate.js`
- `tools/ops/test_run_gate.js`
- `tools/ops/quarantine.json`
- `tools/ops/fixtures/run_gate/**`
- `tasks/OPS.30.01/**` (your REPORT, census evidence and logs; the launcher also writes its saved prompt under `tasks/OPS.30.01/lane-y/launches/`; leave that alone)

**FORBIDDEN:** everything else. In particular **`tools/ops/gate_tests.json` is read only**: it is the live gate list the merge gate reads (`tools/governance/merge_gate.js` ~L54, `QUARANTINE_FILE`; an entry on its `quarantine` array refuses any lane whose gateTests use that suite, including live lanes). Do not create a second gate list: the WBS row's `tools/ops/gate_suites.json` is satisfied by the existing `gate` array of `gate_tests.json` (Lane J); record that name substitution in REPORT.md, and write any change you think the gate list needs as `PROPOSED-Y-NN` (the PM applies it). Also forbidden: every test file you run (`tools/test_*.js`, `tools/**/test_*.js`: read only, never "fix" a suite), `tools/classify_tests.js`, `tools/run_tests.js`, `tools/governance/**`, the rest of `tools/ops/**`, `game/**`, `docs/**`, `art/**`. You do NOT mint WBS IDs, change WBS statuses or answer Owner questions.

## Goal
Replace the `tools/classify_tests.js` filename heuristic with measured facts: one runner that executes the GATE suites and exits non-zero if any fails, and one quarantine census that states, for every other test suite in the repository, whether it passes, fails (with a category) or hangs on a fresh clone of main, from sequential runs with a per-command exit code. OPS.30.04 (fix rotted tests), OPS.70.01 (invariant checker), OPS.50.06 (nightly) and OPS.30.02 (CI) all build on this list.

## Hard safety rules for this lane (read twice)
1. **Never launch the NW.js harness.** Do not run `tools/run_tests.js`, `run_tests.bat`, `tools/test_snapshot.js`, or any suite that spawns `nw.exe` / `nwjs` / `run_tests.js` / `test_snapshot.js`. Detect those statically BEFORE running anything: grep the suite source for those names and for `child_process` use pointing at them, and follow local `require(...)`s and locally spawned `tools/**` scripts transitively (a suite that reaches `run_tests.js` or `test_snapshot.js` through a helper is `NEEDS_NWJS` too), and classify them `NEEDS_NWJS` without running them. Another lane's reviewer is running NW.js tests on this machine right now; a stray nw.exe from you would corrupt its evidence. OPS.30.05 owns the NW.js baseline (quiet window).
2. **Run suites only in a throwaway clone** under `%TEMP%` (`git clone -c core.autocrlf=false <this worktree> <temp>`; `git checkout --detach 425b594c146d5f353c10faa11f4b5d47f499b45f`), never in the live worktree or the main checkout. Delete the clone at the end (after copying logs into `tasks/OPS.30.01/lane-y/`).
3. **Every suite gets a hard timeout** (default 180 s; a suite that exceeds it is killed with its whole process tree and classified `KILLED_TIMEOUT`). Run at most 3 suites concurrently. Leave no child process behind: before your turn ends, list node processes whose command line contains your temp clone path and confirm there are none. Never kill a process you did not start.
4. Do not change any test or production file to make it pass.

## What to build
1. **`tools/ops/run_gate.js`** (no npm dependencies):
   - Default: runs every suite in the `gate` array of `tools/ops/gate_tests.json`, each with `node <suite>` via `spawnSync` (no shell), its own timeout, cwd = repo root; prints one line per suite (`GATE <suite> EXIT=<n> <ms>ms`) and `RESULT: <n> passed, <m> failed`; exits 0 only if every gate suite exits 0, 1 otherwise, 2 on a usage/list error. `--root <dir>` runs against another checkout (the fresh clone).
   - `--census`: enumerates every tracked suite (`git ls-files` for `tools/test_*.js` and `tools/**/test_*.js`, plus the `gate` entries), applies the static `NEEDS_NWJS` screen, runs the rest with the timeout/concurrency limits above, and writes a machine-readable census. It classifies each suite: `PASS`, `FAIL_MISSING_DEPENDENCY` (MODULE_NOT_FOUND / missing file the suite requires), `FAIL_API_DRIFT` (TypeError / "is not a function" / undefined property on a project module), `FAIL_MISSING_REFERENCE` (ENOENT on a data/fixture/asset path, missing plugin), `FAIL_OTHER` (anything else, with the first error line), `KILLED_TIMEOUT`, `NEEDS_NWJS`. The rule for each category is written in the tool and in REPORT.md; the first stderr line that decided it is stored per suite.
   - `--check-lists`: fast, runs no suite: validates `gate_tests.json` and `quarantine.json` (schema, no duplicates, every path exists, no suite in both the gate and quarantine lists, every tracked suite appears in exactly one of: gate, quarantine, or the census `PASS` set recorded in `quarantine.json`'s `passingNotGated` list) and exits non-zero on any violation.
   - Refuses (exit 2) to run any suite classified `NEEDS_NWJS`, even when asked explicitly.
2. **`tools/ops/quarantine.json`**: the measured census of main at `425b594c146d5f353c10faa11f4b5d47f499b45f`: `{ schemaVersion, baseCommit, measuredAt: "<CT date only, no clock>", timeoutSec, concurrency, suites: [{ path, category, firstErrorLine, exitCode, ms, owner: null }], passingNotGated: [...] }`. Three consecutive census runs in fresh clones must agree on every category (flaky suites: record per-run results and classify `FAIL_OTHER` with `flaky: true`; list them in REPORT.md). The WBS row's figures (9 gate / 68 failing / 9 killed) come from an older audit on fewer suites (there are about 180 `tools/test_*.js` files now); report the measured numbers, do not force them to match.
3. **`tools/ops/test_run_gate.js`**: one `PASS <name>` / `FAIL <name>` line per check and `RESULT: <n> passed, <m> failed`; exit 0 only if all pass. Uses tiny synthetic suites under `tools/ops/fixtures/run_gate/` (a pass, a fail, a hang, a missing-module, an ENOENT, a TypeError, one that references `nw.exe`, one that references `run_tests.js`) and fixture list files. Checks: gate mode exits 0 on all-pass and 1 when one suite is deliberately broken (the WBS DoD); each category is assigned correctly; the timeout kills the hang and its child; `NEEDS_NWJS` suites are never spawned (prove it: the fixture writes a marker file if run, and the marker must not exist); `--check-lists` catches duplicates, missing paths, a suite in both lists and an unlisted suite. **Mutation checks**: apply each mutant to an in-memory copy of `run_gate.js` (never edit the real file on disk) and show the suite kills it (`PASS mutant_<name>_killed`): gate ignores a failing exit; timeout removed; NEEDS_NWJS screen removed; category rule for missing module swapped; `--check-lists` duplicate check removed.

## Inputs (read; cite `file:line` at your base commit)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` OPS.30.01-.05, OPS.70.01, OPS.50.06 rows; `tools/ops/gate_tests.json`, `tools/ops/README.md`, `tools/governance/merge_gate.js` (how it reads the gate/quarantine file), `tools/governance/MERGE_GATE.md`; `tools/classify_tests.js` (the heuristic you replace; do not edit); `tools/run_tests.js` header (why NW.js tests are different); `docs/TEST_CLASSIFICATION.md`, `docs/QUALITY_ENGINEERING_POLICY.md`, `docs/STATUS.md` "Core Process Rules" (EXIT capture).

## Tests and commands
- In the FOREGROUND from the worktree root: `node tools/ops/test_run_gate.js`, `node tools/ops/run_gate.js --check-lists`, `node tools/check_deus_syntax.js`. In the temp clone: `node tools/ops/run_gate.js --root <clone>` and `node tools/ops/run_gate.js --census --root <clone>` (three census runs, each in its own fresh clone; save each raw log under `tasks/OPS.30.01/lane-y/evidence/`).
- Before your final commit, run every `gateTests` entry of `tasks/OPS.30.01/lane-y/lane.json` exactly as written and paste raw output with `EXIT=` lines in REPORT.md.
- Prove scope: paste `git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD` and show every path matches allowedPaths.

## Deliverables
1. The runner, the test file and fixtures, and the measured `quarantine.json`.
2. `tasks/OPS.30.01/lane-y/REPORT.md`: every command with raw `EXIT=` lines; the census table (counts per category and the full list), agreement across the three runs, flaky suites, the gate run result, test counts and mutants killed; the classify_tests.js vs measured comparison (how many suites the heuristic mislabels); PROPOSED-Y-NN follow-ups (suites that pass and could join the gate list, each with 3/3 passing runs; any gate entry that failed; OPS.30.04 work items by category); the scope diff; the final `git rev-parse HEAD`.

## Acceptance criteria (the independent Grok reviewer will check these)
- No file outside allowedPaths changed; `tools/ops/gate_tests.json` and every test file unchanged.
- No nw.exe was launched by this lane (static screen proven by the marker test; REPORT shows the NEEDS_NWJS list); no leftover processes.
- `run_gate.js` exits 0 on a fresh clone of main and 1 with one suite deliberately broken; `--check-lists` passes on the committed lists and fails on each negative fixture; every mutant is killed.
- The census is reproducible (3 runs agree or flakiness is recorded) and every non-gate suite has exactly one category with its deciding error line.
- Nothing self-certified; REPORT evidence is raw.

Commit messages start `[claude] OPS.30.01`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane (table below), the merged governance/ops tools (`tools/governance/**`, the rest of `tools/ops/**`: read only) and the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only).
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run commands in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin task/lane-y` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file (test-runner `PASS <check>` lines are fine). Your REPORT states what you did and the raw evidence. An independent Grok review decides; the PM merges.
6. Stop and write `tasks/OPS.30.01/lane-y/escalation.md` (then commit and push it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.
7. Your very last output line must be `FINAL SHA: <sha>`, with the sha pasted from `git rev-parse HEAD` after a successful push (or `FINAL SHA: <sha> (push refused)`).

## Live lanes at preparation (write sets are disjoint; do not touch another lane's paths)
| Lane | Task | Role | Write set |
|---|---|---|---|
| K | WG.00.09b depth renderer Fix 2 | Grok reviewer running (writer done) | per `tasks/WG.00.09b/lane-k/lane.json` (`game/js/plugins/DEUS_Depth.js`, `game/js/plugins.js`, minimap/fog/daynight plugins and docs, `tools/test_layer_render_flat.js`, `tools/bench_render_layers.js`, `tools/test_minimap.js`, `tasks/WG.00.09b/lane-k/**`); its reviewer runs NW.js suites on this machine |
| V | SIM.60.02 spell-effect schema | Claude writer | `docs/schemas/spells/**`, `tools/spells/**`, `tasks/SIM.60.02/**` |
| X | WG.33.01 registry/catalogue/atlas integrity checker | Claude writer | `tools/verify_world_state_registry.js`, `tools/test_verify_world_state_registry.js`, `tools/wsr/**`, `tasks/WG.33.01/**` |
| Y | OPS.30.01 GATE runner and quarantine census | Claude writer | `tools/ops/run_gate.js`, `tools/ops/test_run_gate.js`, `tools/ops/quarantine.json`, `tools/ops/fixtures/run_gate/**`, `tasks/OPS.30.01/**` |
| Z | OPS.70.02 secrets scanner and dependency checker | Claude writer | `tools/security/**`, `tasks/OPS.70.02/**` |
| E | WG.00.09a attack plan | PAUSED (do not touch) | `docs/systems/UF_Depth_Attack_Plan.md`, `tasks/DEUS-TSK-FABLE-19C/*` |

