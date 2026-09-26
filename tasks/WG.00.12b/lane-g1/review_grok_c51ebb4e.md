# Grok review — WG.00.12b Lane G1 (merge-gate / check_claims / launcher trust)

Reviewed writer tip on `task/lane-g1`. Confirmed in the live worktree before this review commit:

```
git rev-parse HEAD
git rev-parse origin/task/lane-g1
git log -8 --format="%H %an %s"
```

```
c51ebb4e22a51c5f981612d0a9f97db9b55c0f28
c51ebb4e22a51c5f981612d0a9f97db9b55c0f28
c51ebb4e22a51c5f981612d0a9f97db9b55c0f28 deus-claude [claude] WG.00.12b REPORT.md: scope check of every changed path against allowedPaths
1c7c5165779dee8405ea8be78329e5f75eee8322 deus-claude [claude] WG.00.12b REPORT.md and evidence (gateTests, before/after, mutants, check_claims before/after, gate dry runs, real manifests)
3387244fbc7f6151360506c523ef66d8dbc3196c deus-claude [claude] WG.00.12b docs (MERGE_GATE.md, governance and ops READMEs); CRLF-aware mutant sweep; push tests check exit first
1bc9cd7f4ad46723d47d895421dc0598b36134ec deus-claude [claude] WG.00.12b WIP: reviewer-prompt test uses a worker mode that commits another file
2c5973a2f5c0ec6eedd10a2d2fc3fd335491d6d5 deus-claude [claude] WG.00.12b WIP: launcher reuses the lane's saved prompt per task/role/provider, push-aware default prompt; resume_queue passes -PromptFile -SavedPrompt
a4f6531585adeb96c8776777f53ac7769c33a53b deus-claude [claude] WG.00.12b WIP: merge_gate trusts [pm] manifest commits; check_claims pm agent (built-in whitelist, never a closer)
242e526b6ac840b6baedc2d4e1653c933bc75a0e snewt [ops] WG.00.12b lane-g1 launch prompt 20260926_042901
41d2447414afdd7f473511453fad7890149aa846 deus-pm [pm] Open lane-g1 (WG.00.12b): BRIEF.md and lane.json
```

`HEAD` and `origin/task/lane-g1` are `c51ebb4e22a51c5f981612d0a9f97db9b55c0f28`.

Independent read of `tools/governance/merge_gate.js`, `test_merge_gate.js`, `MERGE_GATE.md`, `check_claims.js`, `test_check_claims.js`, `tools/governance/README.md`, `tools/ops/launch_worker.ps1`, `test_launch_worker.ps1`, `resume_queue.ps1`, `test_resume_queue.ps1`, `tools/ops/README.md`, and `tasks/WG.00.12b/lane-g1/BRIEF.md`, `lane.json`, `REPORT.md`, and `evidence/`. Suites and probes ran in a fresh clone, then the clone was deleted.

Clone: `git clone -c core.autocrlf=false C:\Users\snewt\.deus_worktrees\lane-g1 C:\Users\snewt\AppData\Local\Temp\g1_review_20260926_060231`, then `git checkout --detach c51ebb4e22a51c5f981612d0a9f97db9b55c0f28`. Clone `HEAD` printed `c51ebb4e22a51c5f981612d0a9f97db9b55c0f28`. `git diff --name-status 3387244fbc7f6151360506c523ef66d8dbc3196c c51ebb4e22a51c5f981612d0a9f97db9b55c0f28` is only `REPORT.md` and `evidence/` (added). The tools under test at the tip are the tools at `3387244fbc7f6151360506c523ef66d8dbc3196c`.

## Scope

`git diff --name-status 9cba41eaf6378048d50004dcf243defbfe7f17f4 c51ebb4e22a51c5f981612d0a9f97db9b55c0f28` (`EXIT=0`):

```
A	tasks/WG.00.12b/lane-g1/BRIEF.md
A	tasks/WG.00.12b/lane-g1/REPORT.md
A	tasks/WG.00.12b/lane-g1/evidence/base_mutants_resume_queue.log
A	tasks/WG.00.12b/lane-g1/evidence/base_test_check_claims.log
A	tasks/WG.00.12b/lane-g1/evidence/base_test_launch_worker.log
A	tasks/WG.00.12b/lane-g1/evidence/base_test_merge_gate.log
A	tasks/WG.00.12b/lane-g1/evidence/base_test_resume_queue.log
A	tasks/WG.00.12b/lane-g1/evidence/check_claims_before_after.log
A	tasks/WG.00.12b/lane-g1/evidence/gate1_test_merge_gate.log
A	tasks/WG.00.12b/lane-g1/evidence/gate2_test_check_claims.log
A	tasks/WG.00.12b/lane-g1/evidence/gate3_test_launch_worker.log
A	tasks/WG.00.12b/lane-g1/evidence/gate4_test_resume_queue.log
A	tasks/WG.00.12b/lane-g1/evidence/gate5_check_deus_syntax.log
A	tasks/WG.00.12b/lane-g1/evidence/merge_gate_dry_run_lane_k.log
A	tasks/WG.00.12b/lane-g1/evidence/merge_gate_dry_run_lane_m_and_o2.log
A	tasks/WG.00.12b/lane-g1/evidence/merge_gate_dry_run_lane_r.log
A	tasks/WG.00.12b/lane-g1/evidence/mutants_launch_worker.log
A	tasks/WG.00.12b/lane-g1/evidence/mutants_resume_queue.log
A	tasks/WG.00.12b/lane-g1/evidence/real_manifests_validation.log
A	tasks/WG.00.12b/lane-g1/lane.json
A	tasks/WG.00.12b/lane-g1/launches/20260926_042901_prompt.txt
M	tools/governance/MERGE_GATE.md
M	tools/governance/README.md
M	tools/governance/check_claims.js
M	tools/governance/merge_gate.js
M	tools/governance/test_check_claims.js
M	tools/governance/test_merge_gate.js
M	tools/ops/README.md
M	tools/ops/launch_worker.ps1
M	tools/ops/resume_queue.ps1
M	tools/ops/test_launch_worker.ps1
M	tools/ops/test_resume_queue.ps1
```

32 paths. Each matches an `allowedPaths` glob from `lane.json` via `merge_gate.js` `globToRegExp` (`paths 32 outside 0`, `SCOPECHECK_EXIT=0`). The diff contains no `art/` path and no image file. DEC-007: this review generated no art.

`tasks/WG.00.12b/lane-g1/lane.json` has one history row at this tip: `41d2447414afdd7f473511453fad7890149aa846`, one parent, tag `pm`, `trustedManifestCommit` true.

## Gate tests

Run in the temp clone, foreground, one suite at a time. `EXIT` is `$LASTEXITCODE`.

| # | Command | Raw result | EXIT | Wall |
|---|---|---|---|---|
| 1 | `node tools/governance/test_merge_gate.js` | `RESULT: 105 passed, 0 failed` | `EXIT=0` | 251 s |
| 2 | `node tools/governance/test_check_claims.js` | `RESULT: 279 passed, 0 failed` | `EXIT=0` | 213 s |
| 3 | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1` | `RESULT: PASS (216 checks, 0 failed)` | `EXIT=0` | 89 s |
| 4 | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_resume_queue.ps1` | `RESULT: PASS (95 checks, 0 failed)` | `EXIT=0` | 33 s |
| 5 | `node tools/check_deus_syntax.js` | `Checked 52 DEUS plugin files. Errors: 0` | `EXIT=0` | 4 s |

Those counts are the report's after counts. The committed base logs (`evidence/base_test_*.log`) read `RESULT: 89 passed, 0 failed`, `RESULT: 254 passed, 0 failed`, `RESULT: PASS (147 checks, 0 failed)`, and `RESULT: PASS (68 checks, 0 failed)`, which are the brief baselines. This review re-ran the after suites and did not re-run the four base suites.

Launcher temp roots were `C:\Users\snewt\AppData\Local\Temp\deus_lw_test_21880_3041` and `C:\Users\snewt\AppData\Local\Temp\deus_rq_test_24256_88089` (fake worker / fake launcher). This review did not invoke `launch_worker.ps1` or `resume_queue.ps1` against the real registry, and did not kill a process outside those suites.

## Mutant kills (re-run)

Inside the two Node suites above, every `mutant_*_killed` and `source_mutant_*_killed` line passed, including `manifest_trust_any_tag`, `manifest_trust_pm_merge`, `manifest_gemini_untrusted`, `manifest_pm_untrusted`, `pm_review_family`, and the ten `pm_*` check_claims mutants.

```
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1 -Mutants
MUTANTS: 40/40 caught
LAUNCH_MUTANTS_EXIT=0
LAUNCH_MUTANTS_WALL_SEC=278
```

```
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_resume_queue.ps1 -Mutants
MUTANTS: 20/20 caught
RESUME_MUTANTS_EXIT=0
RESUME_MUTANTS_WALL_SEC=113
```

The resume sweep printed `MUTANT launcher_pid_not_checked: CAUGHT` and caught `saved_prompt_not_passed`, `relaunch_role_forced_writer`, `queued_run_not_preferred`, `saved_flag_dropped`, and `launcher_saved_flag_ignored`. No `SURVIVED` or `SETUP-ERROR` line in either sweep.

## check_claims on the real `[pm]` commits

AFTER is `tools/governance/check_claims.js` at the tip. BEFORE is the blob `9cba41eaf6378048d50004dcf243defbfe7f17f4:tools/governance/check_claims.js` (extracted with `git show`, no BOM).

```
===== BEFORE f5c1dfd2 =====
DEUS check_claims: commit f5c1dfd "[pm] Register write-set claims for Lanes Q, R, W (SIM.40.01 / SIM.40.05 / SIM.40.10 design) in docs/STATUS.md"
  agent pm (commit subject), lane unknown (every lane held by pm)
  1 path(s): M docs/STATUS.md
PASS 4.1 evidence required (0 checked)
PASS 4.2 zero self-certification (0 checked)
PASS 4.3 WBS revision and immutability (0 checked)
FAIL 4.4 single-writer whitelist: 1 violation(s)
  - agent "pm" (commit subject) holds no lane in the whitelist matrix
RESULT: 3 passed, 1 failed - commit rejected
RESULT (all): 0 clean, 1 rejected, 0 with grandfathered 4.4 notes
epoch: built-in a12f94a7 (Directive 001-I base)
EXIT=1
===== AFTER f5c1dfd2 =====
DEUS check_claims: commit f5c1dfd "[pm] Register write-set claims for Lanes Q, R, W (SIM.40.01 / SIM.40.05 / SIM.40.10 design) in docs/STATUS.md"
  agent pm (commit subject), lane PM (built-in whitelist) (every lane held by pm)
  1 path(s): M docs/STATUS.md
PASS 4.1 evidence required (0 checked)
PASS 4.2 zero self-certification (0 checked)
PASS 4.3 WBS revision and immutability (0 checked)
PASS 4.4 single-writer whitelist (1 checked)
RESULT: 4 passed, 0 failed
RESULT (all): 1 clean, 0 rejected, 0 with grandfathered 4.4 notes
epoch: built-in a12f94a7 (Directive 001-I base)
EXIT=0
===== BEFORE d9766aa2 =====
DEUS check_claims: commit d9766aa "[pm] Open lane-r (SIM.40.05): BRIEF.md and lane.json"
  agent pm (commit subject), lane unknown (every lane held by pm)
  2 path(s): A tasks/SIM.40.05/lane-r/BRIEF.md, A tasks/SIM.40.05/lane-r/lane.json
PASS 4.1 evidence required (0 checked)
PASS 4.2 zero self-certification (0 checked)
PASS 4.3 WBS revision and immutability (0 checked)
FAIL 4.4 single-writer whitelist: 1 violation(s)
  - agent "pm" (commit subject) holds no lane in the whitelist matrix
RESULT: 3 passed, 1 failed - commit rejected
RESULT (all): 0 clean, 1 rejected, 0 with grandfathered 4.4 notes
epoch: built-in a12f94a7 (Directive 001-I base)
EXIT=1
===== AFTER d9766aa2 =====
DEUS check_claims: commit d9766aa "[pm] Open lane-r (SIM.40.05): BRIEF.md and lane.json"
  agent pm (commit subject), lane PM (built-in whitelist) (every lane held by pm)
  2 path(s): A tasks/SIM.40.05/lane-r/BRIEF.md, A tasks/SIM.40.05/lane-r/lane.json
PASS 4.1 evidence required (0 checked)
PASS 4.2 zero self-certification (0 checked)
PASS 4.3 WBS revision and immutability (0 checked)
PASS 4.4 single-writer whitelist (2 checked)
RESULT: 4 passed, 0 failed
RESULT (all): 1 clean, 0 rejected, 0 with grandfathered 4.4 notes
epoch: built-in a12f94a7 (Directive 001-I base)
EXIT=0
```

The same pair on this lane's opening commit: BEFORE `41d24474` `EXIT=1` (`agent "pm" holds no lane`); AFTER `EXIT=0` (`PASS 4.4 single-writer whitelist (2 checked)` on `BRIEF.md` and `lane.json`).

`PM_WHITELIST` is `tasks/*/*/BRIEF*.md`, `tasks/*/*/lane.json`, `docs/STATUS.md`. A direct `globToRe` check allows `tasks/SIM.40.05/lane-r/BRIEF.md`, `BRIEF_REV3.md`, and `lane.json`, and `docs/STATUS.md`. It denies `REPORT.md`, `review_grok_0123abcd.md`, `launches/x_prompt.txt`, `game/js/plugins/X.js`, `tools/governance/merge_gate.js`, `tasks/a/b/c/lane.json`, and `docs/status.md`. `validateManifest` rejects writer `"pm"` and reviewer `"pm"`. `pm` is absent from `FAMILIES`, so `family("pm")` is null unless the `pm_review_family` mutant is on. That mutant was killed by `fail_pm_review_commit_is_not_a_review`.

## Manifest trust

`trustedManifestCommit` on synthetic headers: single-parent `[pm]`, `[PM]`, `[gemini]`, and `[antigravity]` are trusted. Single-parent `[claude]`, `[ops]`, `[grok]`, `[grok_pm]`, `[pm_bot]`, `[pmx]`, and an untagged subject are untrusted. A two-parent `[pm]` commit and a two-parent `[gemini]` commit are untrusted.

Real `git log <tip> -- lane.json` through the same function:

- `origin/task/lane-r` at `d1fdf14730745ee73f8dcab6d4c6cb3a414c27d0`, file `tasks/SIM.40.05/lane-r/lane.json`: only `d9766aa25fb9`, tag `pm`, one parent, trusted. `validateManifest` on that blob: `[]`.
- `HEAD` (`c51ebb4e22a51c5f981612d0a9f97db9b55c0f28`), file `tasks/WG.00.12b/lane-g1/lane.json`: only `41d2447414af`, tag `pm`, one parent, trusted. `validateManifest`: `[]`.
- `origin/task/lane-k` at `43d61f1f13b510e8d207e2794d5cffcaf483412d` (tip has moved since the report's dry run): `e3896d7623b5` tag `claude` trusted false, and `84f6d072c400` tag `gemini` trusted true. The `[claude]` manifest edit is still in the history, so the new gate still refuses Lane K with `MANIFEST_TAMPERED`.

Lane M's manifest blob `8b2da031a3fd997177b1635bb2548f416ce7ef6a:tasks/SIM.00.01/lane-m/lane.json` fails `validateManifest` with `"taskId" must be a non-empty string`, `"writer" must be a non-empty string`, `"gateTests" must be an array`. That matches the report: a real pre-gate schema on a `[gemini]` commit, and a `[pm]` manifest is not the source of `MANIFEST_INVALID`.

`"push": "yes"` is `MANIFEST_INVALID` (`"push" must be true or false`). `"push": false` validates.

This review did not re-execute the full Lane R `--dry-run` (that run evaluates scope, review, and Lane R's own gate test). Provenance and `validateManifest` on the Lane R, Lane G1, Lane K, and Lane M blobs were measured directly. The report's Lane R dry-run log names the same manifest commit `d9766aa25fb98095bf48b217412a54c9e046d517` and the same tip `d1fdf14730745ee73f8dcab6d4c6cb3a414c27d0`.

## What the code does

`trustedManifestCommit` trusts a commit whose subject tag is in the gemini family (`gemini`, `antigravity`) or is exactly `pm`, and rejects every commit with more than one parent. `checkManifest` still returns before scope, review, and tests when any history row is untrusted. A `[pm]` tip that only touches a review file hits `REVIEW_TAG_UNKNOWN` because `family("pm")` is null.

`check_claims.js` adds `pm: "pm"` beside the unchanged `grok_pm` / `grok_bot` → `grok` aliases. `EXACT_ONLY_AGENTS` keeps `pm` out of the free-text agent regex. The 4.4 list is `PM_WHITELIST`, appended by `withBuiltInLanes` only when a STATUS matrix exists. `NON_CLOSERS` makes `closedBy: pm` fail 4.2 in status documents and on ledger lines. The ten `pm_*` source mutants are killed by the suite that passed above.

`Find-DeusSavedPrompt` tries the registry entry for the same task, role, and provider (`promptFile`, then `launchPromptPath`, preferred run first), then a committed `tasks/<task>/<lane>/launches/*_prompt.txt` whose adding commit subject matches `^\[ops\] \S+ \S+ launch prompt \S+ \((writer|reviewer) ([a-z]+)\)$` for that role and provider. Generated prompts are skipped. `Set-DeusPromptResume` strips an existing resume preamble (and, for a saved prompt, a leading relaunch note ending in `--- original prompt follows ---`) before writing one resume line. `resume_queue.ps1` passes the selected path as `-PromptFile -SavedPrompt` and logs which one it used. `Get-DeusPushRule` takes a boolean `lane.json` `push` when present, otherwise a brief line `git push origin <the lane branch>`. The generated rule 2 for a push names only that branch, forbids `main`, force, and `DEUS_INTEGRATOR`, and ends with the `FINAL SHA:` line. The ops README states the plain-text brief match and the `"push": false` override.

## Findings

BLOCKER: none

MAJOR: none

MINOR: none

VERDICT: CLEAN PASS
