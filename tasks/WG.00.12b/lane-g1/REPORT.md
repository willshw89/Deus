# WG.00.12b Lane G1 REPORT: merge-gate / check_claims / launcher trust fix for PM-opened lanes

**Lane:** lane-g1 · **Branch:** task/lane-g1 · **Writer:** claude · **Reviewer:** grok (independent; decides) · **Base:** `9cba41eaf6378048d50004dcf243defbfe7f17f4` · **Date:** 2026-09-26

Code and docs under test: `3387244fbc7f6151360506c523ef66d8dbc3196c` (every suite, mutant sweep, before/after run and dry run below ran on this commit, in throwaway clones under `%TEMP%`, since deleted). The commits after it add only this report and `evidence/`. Authority for the change: Owner directive 0028-AC A0 (2026-09-26, about 01:50 CT): the PM (Grok Bot, main chat) opens lanes, launches workers and merges.

NO ART was generated, requested or integrated. No real worker was launched, no process this lane did not start was killed, and the real registry, `C:\Users\snewt\.deus_pm\**` and `C:\Users\snewt\.deus_worktrees\logs\**` were not written. The merge gate ran only with `--dry-run`, in throwaway clones; `main` in those clones did not move (hashes below). Nothing here is self-certified: the Grok review decides.

Commits on the branch (oldest first): `a4f65315` governance WIP, `2c5973a2` ops WIP, `1bc9cd7f` test-fixture fix, `3387244f` docs and final code touches, then the report commits.

## 1. What changed

### `tools/governance/merge_gate.js`: `[pm]` manifest commits are trusted
- `:11-17` header (a) MANIFEST: `[gemini]` or `[pm]` non-merge commits; `[pm]` trusted for manifest provenance only.
- `:61` `PM_TAG = "pm"`. It is **not** added to `FAMILIES`, so `family("pm")` stays `null`.
- `:189-196` `trustedManifestCommit(h)`: one parent, and the tag is in the `gemini` family or exactly `pm`. Everything else is untrusted: `[claude]`, `[fable]`, `[grok]`, `[codex]`, `[ops]`, `[owner]`, untagged, look-alikes (`[grok_pm]`, `[pm_bot]`, `[pmx]`) and **every merge commit** (`[pm]` and `[gemini]` merges included).
- `:479-484` `checkManifest` uses it. `MANIFEST_TAMPERED` still stops the gate before scope, review and tests. The message now says "only [gemini] or [pm] commits may change it".
- `:449` `validateManifest` accepts an optional `push` field that must be a boolean. `pm` is refused as `writer` or `reviewer` (unchanged code: `family("pm")` is `null`).
- `:545-548` `REVIEW_TAG_UNKNOWN` for a `[pm]` review adds "; [pm] may write lane.json but never reviews". A `[pm]` commit is never a review: `isReview` needs a non-null family, and the review tag check refuses it.
- `:66-71` five new `--mutant`s: `manifest_trust_any_tag`, `manifest_trust_pm_merge`, `manifest_gemini_untrusted`, `manifest_pm_untrusted`, `pm_review_family` (`:185`). `manifest_provenance_off` is unchanged and still means "accept lane.json edits by any commit".

### `tools/governance/check_claims.js`: the `pm` agent
- `:136` `pm: "pm"` in `AGENT_ALIASES`: a canonical agent of its own, not an alias of grok. `grok_pm` / `grok_bot` → `grok` is unchanged (see §8 Q1).
- `:141` `EXACT_ONLY_AGENTS`, `:168` `AGENT_RE`: `pm` counts where a name stands alone (`[pm]`, `--agent pm`, `DEUS_AGENT=pm`, `--lane pm`, `closedBy: pm`, a Reviewer cell `PM`), never inside free text. "PM" also appears in clock times and in names such as "PM Grok Bot", and `normAgent("PM Grok Bot")` is still `grok` (unit check).
- **Where the 4.4 whitelist lives.** For every other agent, rule 4.4 reads the whitelist from the File-Ownership table(s) of `docs/STATUS.md` as of the parent commit (`checkTarget` → `parseLaneMatrix(parentTree.read(PATHS.status))`, rows keyed by label, holders from the label and writer column). The PM writes `docs/STATUS.md` itself, so a STATUS row would let one `[pm]` commit widen what the next may touch. `docs/STATUS.md` is also read-only for this lane. So the PM's whitelist is built in:
  - `:148` `PM_WHITELIST = ["tasks/*/*/BRIEF*.md", "tasks/*/*/lane.json", "docs/STATUS.md"]`;
  - `:826-831` `withBuiltInLanes` appends it to the parsed table as the lane `PM (built-in whitelist)` (key `pm`, holder `pm`);
  - `:1419` `checkTarget` uses it.

  Because `pm` is never matched in free text, no STATUS row can grant `pm` a path. The FROZEN / READ-ONLY row still applies to the PM's paths. With no whitelist table, 4.4 fails for the PM as for everyone. Documented in `tools/governance/README.md` and the file header (`:52-53`).
- `:855` for `pm`, a branch name, merge hint or `--range` head-ref hint does not pick the lane (the PM commits on every lane's branch). An explicit `--lane` / `DEUS_LANE` still does, and fails if `pm` does not hold that lane.
- `:144` `NON_CLOSERS = {pm}`. `:1060-1065` in a WBS / STATUS / AUDIT_LOG / issues closure, naming `pm` as closer fails 4.2. `:1111` a ledger line `closedBy: pm` fails 4.2. Both hold even when the review artifact was committed by `[pm]`. The PM may still commit a closure another agent made and backed (`closedBy: grok` with a `[grok]` review file).

### `tools/ops/launch_worker.ps1`: prompt selection and the push rule
- `:40` new switch `-SavedPrompt`.
- `:862-889` `Remove-DeusResumePreamble` / `Set-DeusPromptResume`: this launch's resume line replaces any launcher resume line at the top, so lines never stack. With `-SavedPrompt`, or when reusing, a relaunch note ending in the line `--- original prompt follows ---` is dropped too. The PM used that form for the lane-s relaunch (`tasks/WG.20.02/lane-s/launches/20260926_034739_prompt.txt`).
- `:891` `Test-DeusGeneratedPrompt` recognises the launcher's own default (first line and a `Standing rules:` line).
- `:898` `Get-DeusLaunchCommitRole` and `:1161` the prompt commit subject is now `[ops] <task> <lane> launch prompt <stamp> (<role> <provider>)`.
- `:904-968` `Find-DeusSavedPrompt(Worktree, TaskId, Lane, Role, Provider, RegistryPath, PreferRunId)`. Candidates:
  1. registry entries of the lane with the same `taskId`, `role` and `provider` (the `-PreferRunId` entry first, then newest `startedAt`): `promptFile`, then `launchPromptPath`;
  2. prompt files committed at `HEAD` in `tasks/<task>/<lane>/launches/`, whose adding commit's subject names the same role and provider, and which have not changed since.

  Missing or empty files and generated prompts are passed over, with the reason recorded. A reviewer prompt is never used for a writer or the reverse. Reviewer `-NoCommitPrompt` copies are uncommitted, and their registry entry says `role: reviewer`.
- `:970-984` `Get-DeusPushRule`. `lane.json` `"push": true|false` decides; any other value refuses the launch (exit 1). Otherwise the brief decides: it contains `git push origin <lane branch>` (optionally `-u` / `--set-upstream`).
- `:998-1004` generated rule 2. With a push: "... When finished, commit and push your own branch only: git push origin <branch>. Never push main or any other branch, never force-push, never set DEUS_INTEGRATOR; if the push is refused, say so and stop. Do not merge. ...", and the prompt ends with `Your final output line must be exactly: FINAL SHA: <sha> (pasted from git rev-parse HEAD after the push).` Without a push the old "Do not push. Do not merge." text is kept.
- `:1079-1084` push rule and `-SavedPrompt` checks; `:1116-1143` selection order: `-PromptFile` (verbatim; with `-ResumeFromSha` only a launcher resume line is replaced), else the saved prompt, else the default.
- `:1178-1179` registry fields `promptFile` (the source prompt path, `null` when generated), `promptSource` (`file|saved|generated`), `promptFrom`, `promptCandidatesSkipped` (up to 20), `pushRule`, `pushRuleSource`.

### `tools/ops/resume_queue.ps1`
- `:14-16` header. `:209-220`: for each relaunch, `Find-DeusSavedPrompt` with the queue entry's task, role and chosen provider and `-PreferRunId <queued runId>`, so the queued run's registry `promptFile` is tried first, then rule 3a. The result is passed as `-PromptFile <path> -SavedPrompt`, and the choice is logged (`<lane> prompt: saved <role> prompt <path> (<from>)` or `<lane> prompt: launcher default (...)`). `:262-263` the queue entry records `resumePromptFile` / `resumePromptFrom`.

### Tests
- `tools/governance/test_merge_gate.js`:
  - `:134-143` `Lane.pmOpen()` and `tamper()`; `:242` `verifyManifestStopsGate` (scope, review and tests `SKIPPED (manifest not trusted)`, no `.. test` line, marker file absent);
  - `:409-450` ten new cases;
  - `:559-566` kill table; `:676-680` a mutant that makes a rule stricter is killed on a passing case when the gate now refuses;
  - `:621-627` unit `unit_manifest_trust`, `:631-638` `push` / `pm` in `unit_manifest_validation`.
- `tools/governance/test_check_claims.js`:
  - `:269-280` fixtures `pmOpenFiles` / `pmReview`;
  - 13 cases from `:775` (`pass_pm_*`, `fail44_pm_*`, `fail42_pm_*`, `fail42_ledger_closedby_pm`);
  - unit `unit_pm_agent` `:1141`; real-history check `real_pm_claim_and_lane_opening_commits_pass` `:1196` (`f5c1dfd2`, `d9766aa2`, `41d24474`);
  - ten `pm_*` source mutants `:1336-1347`;
  - `:1321` the existing mutant `4.4_whitelist_read_from_staged_status` retargeted to the changed `checkTarget` line.
- `tools/ops/test_launch_worker.ps1`:
  - helpers `:264-305`; `commit_run` gains subject, registry and "Do not push" checks (`:334-345`);
  - 15 new tests `:384-572`;
  - 16 new mutants `:921-952`;
  - `:848-853` the mutation sweep matches a multi-line fault's text with the file's own line ending (see §6 item 3).
- `tools/ops/test_resume_queue.ps1`: the fake launcher records `-PromptFile` / `-SavedPrompt` (`:64`, `:72`); 7 new tests `:338-455`; 5 new mutants `:508-517`.

### Docs
`tools/governance/MERGE_GATE.md` (§3 manifest fields incl. `push`, §4 item 2, §5 (a) trust table, §5 (b), §6 codes, §8, §9, §10 counts and mutant table), `tools/governance/README.md` (the PM, the gate rule, the `pm` agent and its whitelist), `tools/ops/README.md` (`lane.json` `push`, "The prompt" selection rules, registry fields, the resume-queue relaunch, test counts). Each cites 0028-AC A0 (Owner, about 01:50 CT, 2026-09-26).

## 2. The MANIFEST_INVALID finding
**It is a real manifest defect, not the gate being too strict. It is not on a `[pm]` manifest.** Evidence: `evidence/real_manifests_validation.log` (the gate's own `trustedManifestCommit` and `validateManifest`, loaded from `3387244f`, run on each real manifest at its branch tip):
- All ten `[pm]`-opened manifests are trusted and validate with **0 errors**: lane-r `d9766aa2`, lane-q `9103799e`, lane-w `31892ae7`, lane-p `e39b20e6`, lane-s `147bf517`, lane-t `728737e7`, lane-u `ed4aa23d`, lane-l1 `e2cbe558`, lane-g1 `41d24474`, lane-o2 `7ec8b131`.
- The one manifest that fails validation is Lane M's (`tasks/SIM.00.01/lane-m/lane.json`, written by `[gemini]` `8b2da031`). The PM relaunched that lane ("Lane M Rev 3"). Raw: `validateManifest: "taskId" must be a non-empty string; "writer" must be a non-empty string; "gateTests" must be an array`. The file uses an older schema (`wbsId` instead of `taskId`, no `writer`, `"gateTest": "node tools/check_deus_syntax.js"` as a string instead of a `gateTests` array, `closureReviewer` instead of `reviewer`).
- With the old gate, a `[pm]` manifest can never show `MANIFEST_INVALID`: provenance is checked first and returns on `MANIFEST_TAMPERED` (`merge_gate.js` at base, lines 455-463) before `JSON.parse` / `validateManifest` (465-470).
- Lane M and lane-o2 are now merged into `main` (`6aa1a332`), so a dry run stops at `NOTHING_TO_MERGE` before reading their manifests (`evidence/merge_gate_dry_run_lane_m_and_o2.log`). The lane-o2 manifest has a layout the gate cannot pass either way, reading `checkManifest`: path `tasks/SIM.50.11/gap-audit-people/lane.json` with `"lane": "lane-o2"`. With `--lane lane-o2` the path segment differs; with `--lane gap-audit-people` the `lane` field differs. Both give `MANIFEST_MISMATCH`, not `MANIFEST_INVALID`.
- Also found: **Lane K's manifest was changed by the writer's own commit** `e3896d76` (`[claude] WG.00.09b Fix1: ...`, it replaced a gate test's args). The old and the new gate both refuse Lane K with `MANIFEST_TAMPERED` (§5).

## 3. How it was tested (all in throwaway clones under `%TEMP%`, foreground, one command per call, EXIT captured)
Evidence clone: `git clone C:\Users\snewt\.deus_worktrees\lane-g1 %TEMP%\g1_verify_20260926_051909`, then `git checkout 3387244fbc7f6151360506c523ef66d8dbc3196c`. The system gitconfig sets `core.autocrlf=true`, so the clone's files are CRLF. Base clone: `%TEMP%\g1_base_053456` at `9cba41eaf6378048d50004dcf243defbfe7f17f4`. Both are deleted. Full raw logs are in `tasks/WG.00.12b/lane-g1/evidence/`; Appendix A has the gateTests logs verbatim.

### 3.1 gateTests of `tasks/WG.00.12b/lane-g1/lane.json`, exactly as written (clone at `3387244f`)
| # | Command | Raw result | EXIT | Wall |
|---|---|---|---|---|
| 1 | `node tools/governance/test_merge_gate.js` | `RESULT: 105 passed, 0 failed` | `EXIT=0` | 231 s |
| 2 | `node tools/governance/test_check_claims.js` | `RESULT: 279 passed, 0 failed` | `EXIT=0` | 127 s |
| 3 | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1` | `RESULT: PASS (216 checks, 0 failed)` | `EXIT=0` | 75 s |
| 4 | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_resume_queue.ps1` | `RESULT: PASS (95 checks, 0 failed)` | `EXIT=0` | 30 s |
| 5 | `node tools/check_deus_syntax.js` | `Checked 52 DEUS plugin files. Errors: 0` | `EXIT=0` | 3 s |

### 3.2 Before / after counts (before = the same commands in the base clone at `9cba41ea`, logs `evidence/base_*.log`)
| Suite | Before (raw) | After (raw) | New checks |
|---|---|---|---|
| `test_merge_gate.js` | `RESULT: 89 passed, 0 failed` `EXIT=0` | `RESULT: 105 passed, 0 failed` `EXIT=0` | +16: 10 cases, 1 unit (+ `push`/`pm` clauses in `unit_manifest_validation` and `unit_tags_and_families`), 5 mutant kills |
| `test_check_claims.js` | `RESULT: 254 passed, 0 failed` `EXIT=0` | `RESULT: 279 passed, 0 failed` `EXIT=0` | +25: 13 cases, 1 unit, 1 real-history check, 10 mutant kills |
| `test_launch_worker.ps1` | `RESULT: PASS (147 checks, 0 failed)` `EXIT=0` | `RESULT: PASS (216 checks, 0 failed)` `EXIT=0` | +69 checks (15 new tests, 4 new checks in `commit_run`) |
| `test_resume_queue.ps1` | `RESULT: PASS (68 checks, 0 failed)` `EXIT=0` | `RESULT: PASS (95 checks, 0 failed)` `EXIT=0` | +27 checks (7 tests) |

### 3.3 Mutants (every new rule has one that must fail)
- `test_merge_gate.js` (inside the suite run above): all 24 `--mutant`s and 3 source mutants printed `PASS mutant_<name>_killed` / `PASS source_mutant_<name>_killed`. New in G1:

  | Mutant | Kill case |
  |---|---|
  | `manifest_trust_any_tag` | `fail_lane_json_edited_by_ops` |
  | `manifest_trust_pm_merge` | `fail_lane_json_changed_by_pm_merge_commit` |
  | `manifest_gemini_untrusted` | `pass_valid_lane_dry_run_prints_summary` |
  | `manifest_pm_untrusted` | `pass_pm_opened_lane` |
  | `pm_review_family` | `fail_pm_review_commit_is_not_a_review` |

  The existing `manifest_provenance_off` is still killed by `fail_writer_edits_lane_json`.
- `test_check_claims.js` (inside the suite run): all 104 source mutants killed (94 before). New:

  | Mutant | Kill case |
  |---|---|
  | `pm_builtin_whitelist_off` | `pass_pm_lane_opening_commit` |
  | `pm_whitelist_any_path` | `fail44_pm_edits_code` |
  | `pm_whitelist_whole_lane_folder` | `fail44_pm_writes_lane_files_other_than_the_brief` |
  | `pm_alias_of_grok` | `pass_pm_lane_opening_commit` |
  | `pm_matched_in_free_text` | `fail44_pm_status_row_grants_nothing`, `unit:unit_pm_agent` |
  | `pm_lane_hint_honoured` | `pass_pm_staged_on_the_lane_branch`, `pass_pm_range_with_head_ref_hint` |
  | `pm_explicit_lane_overridden` | `fail44_pm_explicit_lane_not_held` |
  | `pm_may_close` | `fail42_pm_named_as_closer_with_its_own_artifact`, `fail42_ledger_closedby_pm` |
  | `pm_status_closer_rule_off` | `fail42_pm_named_as_closer_with_its_own_artifact` |
  | `pm_ledger_closer_rule_off` | `fail42_ledger_closedby_pm` |
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1 -Mutants` (clone at `3387244f`): `MUTANTS: 40/40 caught`, `EXIT=0`, 259 s (`evidence/mutants_launch_worker.log`; 24 before). New:

  | Mutant | Test |
  |---|---|
  | `saved_prompt_ignored`, `prompt_file_not_recorded` | `prompt_file_recorded_then_reused` |
  | `registry_role_not_checked`, `committed_role_not_checked` | `reviewer_prompt_never_reused_for_writer` |
  | `registry_task_not_checked`, `registry_provider_not_checked` | `other_task_or_provider_not_reused` |
  | `commit_subject_without_role` | `committed_prompt_reused_without_registry` |
  | `generated_prompt_reused` | `generated_prompt_not_reused` |
  | `resume_lines_stack` | `reuse_with_resume_does_not_stack`, `explicit_prompt_file_resume_not_stacked` |
  | `relaunch_note_kept` | `relaunch_note_dropped_when_reused` |
  | `push_rule_ignored`, `push_brief_ignored`, `no_final_sha_line` | `push_rule_from_brief` |
  | `push_any_branch_prefix` | `push_rule_other_branch_is_not_a_push` |
  | `push_lane_json_ignored` | `push_rule_lane_json_true`, `push_rule_lane_json_false_wins` |
  | `push_lane_json_invalid_accepted` | `push_rule_lane_json_invalid_refused` |
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_resume_queue.ps1 -Mutants` (clone at `3387244f`): `MUTANTS: 20/20 caught`, `EXIT=0`, 99 s (`evidence/mutants_resume_queue.log`; 15 before). New:

  | Mutant | Test |
  |---|---|
  | `saved_prompt_not_passed` | `relaunch_passes_saved_prompt` |
  | `relaunch_role_forced_writer` | `reviewer_relaunch_uses_reviewer_prompt` |
  | `queued_run_not_preferred` | `relaunch_prefers_the_queued_run` |
  | `saved_flag_dropped`, `launcher_saved_flag_ignored` | `end_to_end_saved_prompt_resume` |

  Base comparison (clone at `9cba41ea`, CRLF): `MUTANTS: 14/15 caught; not caught: launcher_pid_not_checked` `EXIT=1`, with `MUTANT launcher_pid_not_checked: SETUP-ERROR (the text to replace occurs 0 times in launch_worker.ps1, expected 1)` (`evidence/base_mutants_resume_queue.log`). See §6 item 3.

### 3.4 Acceptance points and the tests that show them
- `[pm]` and `[gemini]` non-merge manifest commits are trusted: `pass_pm_opened_lane`, `pass_pm_opened_lane_widened_by_pm_then_gemini`, `pass_valid_lane_dry_run_prints_summary`, `pass_gemini_updates_manifest_later`, `unit_manifest_trust`. Every other manifest change is `MANIFEST_TAMPERED` and stops the gate (skipped rows, no test run, marker absent): `fail_claude_edits_pm_opened_lane_json`, `fail_lane_json_edited_by_{ops,codex,untagged_commit,grok_pm_tag}`, `fail_lane_json_changed_by_pm_merge_commit`, plus the existing `[claude]`, `[grok]` and merge cases. `[pm]` never satisfies the review check: `fail_pm_review_commit_is_not_a_review`, `fail_pm_commit_after_review`.
- `pm` is a known check_claims agent with a narrow, documented 4.4 whitelist:
  - lane-opening commit `pass_pm_lane_opening_commit`; STATUS claim commit `pass_pm_status_claim_commit`;
  - `[pm]` code edits still fail: `fail44_pm_edits_code` (`game/js/plugins/TEST_X.js`, `tools/governance/merge_gate.js`, `src/fix.js`), `fail44_pm_writes_lane_files_other_than_the_brief` (a review file, `REPORT.md`, a `launches/` prompt);
  - frozen still applies: `fail44_pm_frozen_path_inside_its_whitelist`; STATUS cannot widen it: `fail44_pm_status_row_grants_nothing`;
  - `pm` cannot close or self-certify: `fail42_pm_self_certifies_in_status`, `fail42_pm_named_as_closer_with_its_own_artifact`, `fail42_ledger_closedby_pm`.
- Launcher and resume_queue:
  - reuse the saved writer prompt: `prompt_file_recorded_then_reused`, `committed_prompt_reused_without_registry`, `relaunch_passes_saved_prompt`, `relaunch_prefers_the_queued_run`, `relaunch_prompt_falls_back_to_committed`;
  - never mix roles: `reviewer_prompt_never_reused_for_writer`, `writer_prompt_never_reused_for_reviewer`, `reviewer_relaunch_uses_reviewer_prompt`;
  - never stack resume lines: `reuse_with_resume_does_not_stack`, `explicit_prompt_file_resume_not_stacked`, `relaunch_note_dropped_when_reused`, `end_to_end_saved_prompt_resume`;
  - never inject "Do not push" when the brief pushes: `push_rule_from_brief`, `push_rule_lane_json_true`, `generated_prompt_not_reused`, `prompt_file_recorded_then_reused` (`no_do_not_push_injected`);
  - record `promptFile`: `prompt_file_recorded_then_reused`, `reuse_with_resume_does_not_stack`, `end_to_end_saved_prompt_resume`.

## 4. check_claims before / after on the real PM commits (raw, `evidence/check_claims_before_after.log`)
Run from the evidence clone at `3387244f`, where `d9766aa2` exists (it is on `origin/task/lane-r`). "BEFORE" is `tools/governance/check_claims.js` of base `9cba41ea`, extracted with `git show` (Git Bash, so the bytes are unchanged).

```
## BEFORE: $ node <tools/governance/check_claims.js from base 9cba41ea, extracted with git show> --range f5c1dfd2~1..f5c1dfd2
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

## AFTER: $ node tools/governance/check_claims.js --range f5c1dfd2~1..f5c1dfd2
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

## BEFORE: $ node <tools/governance/check_claims.js from base 9cba41ea, extracted with git show> --range d9766aa2~1..d9766aa2
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

## AFTER: $ node tools/governance/check_claims.js --range d9766aa2~1..d9766aa2
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

## 5. Merge gate dry runs on real lane histories (raw excerpts; full output in `evidence/merge_gate_dry_run_lane_{r,k}.log`)
Throwaway gate clone `%TEMP%\g1_gateclone_053404` of this repository. `main` `d655c122ab00eb8ee863a7fda990369f4c4574c0` was checked out there, and `task/lane-r` `d1fdf14730745ee73f8dcab6d4c6cb3a414c27d0` and `task/lane-k` `abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2` were created from `origin/*`. Old gate = `merge_gate.js` of `9cba41ea`; new gate = `3387244f`'s. All runs used `--dry-run`. After all four runs `git rev-parse main` in the clone printed `d655c122ab00eb8ee863a7fda990369f4c4574c0` (unchanged). The clone is deleted.

**Lane R** (manifest changed only by the `[pm]` opening commit `d9766aa25fb98095bf48b217412a54c9e046d517`):
```
######## OLD gate: $ node <OLD merge_gate.js> --lane lane-r --manifest tasks/SIM.40.05/lane-r/lane.json --dry-run
| (a) manifest | REFUSED | MANIFEST_TAMPERED |
| (a) scope | SKIPPED (manifest not trusted) | - |
| (b) review | SKIPPED (manifest not trusted) | - |
| (c) tests | SKIPPED (manifest not trusted) | - |
| (d) pushed | PASS | - |
| (e) main | PASS | - |
| (f) execution | NOT RUN (refused) | - |
REFUSED MANIFEST_TAMPERED: d9766aa25fb98095bf48b217412a54c9e046d517 "[pm] Open lane-r (SIM.40.05): BRIEF.md and lane.json" changed tasks/SIM.40.05/lane-r/lane.json; only [gemini] commits may change it
GATE: REFUSED (exit 1)
EXIT=1
######## NEW gate: $ node <NEW merge_gate.js> --lane lane-r --manifest tasks/SIM.40.05/lane-r/lane.json --dry-run
| changed by | d9766aa25fb98095bf48b217412a54c9e046d517 [pm] Open lane-r (SIM.40.05): BRIEF.md and lane.json |
| review commit | d1fdf14730745ee73f8dcab6d4c6cb3a414c27d0 [grok] SIM.40.05 review 9a2908fb |
| last non-review commit | 9a2908fbe7741d22cacf2fe18b84ecb4c272526d [claude] SIM.40.05 Fix1 REPORT.md: findings and changes, gate in a temp clone of 6ff05cfe, checks and counts |
| verdict | VERDICT: PASS |
| (a) manifest | PASS | - |
| (a) scope | PASS | - |
| (b) review | PASS | - |
| (c) tests | PASS | - |
| (d) pushed | PASS | - |
| (e) main | PASS | - |
| (f) execution | SKIPPED (dry-run) | - |
GATE: PASS (exit 0)
EXIT=0
```
With the new gate the `[pm]` manifest is trusted, so scope, review and the lane's own gate test were evaluated. This is the gate's dry-run output, not a merge and not a judgement of Lane R by this lane.

**Lane K** (a real `[claude]` edit of the manifest, `e3896d76`, on top of the `[gemini]` opening `84f6d072`): still refused by the new gate.
```
######## NEW gate: $ node <NEW merge_gate.js> --lane lane-k --manifest tasks/WG.00.09b/lane-k/lane.json --dry-run
| changed by | e3896d7623b57bca165ffede272c26d9c7c7afd5 [claude] WG.00.09b Fix1: deterministic gates (fixture scene, condition waits, tick-based step, report-only timings), seam-safe item/wall windows (B1), per-run snapshot dirs, bench machineLoad |
|  | 84f6d072c40032bb19ec22b71c1fe5db5d406930 [gemini] 0017-Q sec2 Lane K brief + manifest (WG.00.09b) |
| (a) manifest | REFUSED | MANIFEST_TAMPERED |
| (a) scope | SKIPPED (manifest not trusted) | - |
| (b) review | SKIPPED (manifest not trusted) | - |
| (c) tests | SKIPPED (manifest not trusted) | - |
| (d) pushed | PASS | - |
| (e) main | PASS | - |
| (f) execution | NOT RUN (refused) | - |
REFUSED MANIFEST_TAMPERED: e3896d7623b57bca165ffede272c26d9c7c7afd5 "[claude] WG.00.09b Fix1: deterministic gates (fixture scene, condition waits, tick-based step, report-only timings), seam-safe item/wall windows (B1), per-run snapshot dirs, bench machineLoad" changed tasks/WG.00.09b/lane-k/lane.json; only [gemini] or [pm] commits may change it
GATE: REFUSED (exit 1)
EXIT=1
```
The fixture equivalent in the suite is `fail_claude_edits_pm_opened_lane_json` (`[claude]` edit of a `[pm]`-opened manifest). It gives `MANIFEST_TAMPERED`, skipped scope, review and tests, and no gate test run.

## 6. Not done / known problems
1. **This lane's own merge will be refused by `main`'s gate.** The gate that runs is the integrator's copy on `main`, which still refuses `41d24474` (`[pm]`) with `MANIFEST_TAMPERED`. The merge needs a PM manual merge, or a run of this branch's `merge_gate.js` (PROPOSED-G1-02). Documented in MERGE_GATE.md §9.
2. **4.4 works on paths:** within `docs/STATUS.md` it cannot limit the PM to claim rows. The PM's real STATUS commits also edit lane-status prose (`51d78a38` line 57, `9f9954e5` lines 58/60), so a row-only rule would reject them. Rules 4.1 and 4.2 still check every closure in STATUS (PROPOSED-G1-08).
3. **Pre-existing, fixed here:** in a fresh clone on this machine (system `core.autocrlf=true`, so scripts check out CRLF), the Lane J mutant `launcher_pid_not_checked` in `test_resume_queue.ps1 -Mutants` was a SETUP-ERROR: its search text has a bare `` `n ``. Base evidence: `evidence/base_mutants_resume_queue.log` (`MUTANTS: 14/15 caught`, `EXIT=1`). `Invoke-MutantSweep` (`test_launch_worker.ps1:848-853`) now matches the file's own line ending, and the same sweep at `3387244f` prints `MUTANT launcher_pid_not_checked: CAUGHT` and `MUTANTS: 20/20 caught`. The `-Mutants` sweeps are not gateTests, so the gate's counts were not affected.
4. The brief-text push match is plain text. A brief sentence such as "never run git push origin task/lane-x" would count as asking for a push. `lane.json` `"push": false` overrides it (documented, and tested in `push_rule_lane_json_false_wins`).
5. Prompts are reused only for the same provider. After a `resume_queue -AllowFailover` move to another provider, the default is generated instead, because the saved prompt names the old agent and commit tag. This is a deliberate rule beyond the brief (§8 Q4).
6. `Find-DeusSavedPrompt` sorts committed launch files by name. For two launches in the same second, `<stamp>_2_prompt.txt` sorts after `<stamp>_prompt.txt` although it is newer. The registry pass, which runs first, orders by `startedAt`.
7. `--check-backfill` (A1-A4 flags) does not flag `closedBy: pm`. Only the commit-time rule 4.2 does (PROPOSED-G1-06).
8. `[ops]` launch-prompt commits still fail check_claims 4.4 in `--range` audits: `ops` is no agent and no lane owns `tasks/*/*/launches/*`. This is Lane C2b finding F13, now with `[ops]` instead of `[gemini]` (PROPOSED-G1-03).
9. Nothing here was run in the RMMZ editor (tooling only; no game code touched).
10. Two stale test folders from before this lane, `%TEMP%\deus_lw_test_9604_9633` and `%TEMP%\deus_rq_test_15948_51612` (created 2026-09-26 01:06), were left alone; they are not this lane's.

## 7. PROPOSED follow-ups (not WBS IDs)
- **PROPOSED-G1-01** `tools/ops/hooks/pre-push` blocks every lane push without `DEUS_INTEGRATOR=1`, with the message "Lane worktrees do not push (DEUS WG.00.12)". That now contradicts briefs that require `git push origin task/<lane>` and the launcher's push-aware prompt. The hook is not installed on real worktrees yet (tools/ops/README.md §5). Decide whether it should allow a push of the worktree's own `task/<lane>` branch. The hook is outside this lane's allowedPaths.
- **PROPOSED-G1-02** Merge this lane by a PM manual merge, or by running this branch's gate (`node <task/lane-g1 copy of merge_gate.js> ...`); `main`'s gate refuses the `[pm]` manifest (§6 item 1).
- **PROPOSED-G1-03** Give `[ops]` (the launcher's prompt commits) a built-in check_claims whitelist, `tasks/*/*/launches/*_prompt.txt`, like `pm`, so `--range` audits of lane branches stop failing on them.
- **PROPOSED-G1-04** Lane M's manifest (`8b2da031`) uses a pre-gate schema (§2). If the lane is ever gated, a `[pm]` or `[gemini]` commit should rewrite it with `taskId`, `writer`, `reviewer` and a `gateTests` array.
- **PROPOSED-G1-05** Lane K's manifest was changed by its writer (`e3896d76`). No later commit can make the gate trust it again (MERGE_GATE.md §5 (a) 3), so Lane K needs a PM decision: a manual merge, or a history rewrite by the integrator.
- **PROPOSED-G1-06** Add a `--check-backfill` flag for ledger closures with `closedBy: pm`.
- **PROPOSED-G1-07** The lane-o2 manifest layout (`tasks/SIM.50.11/gap-audit-people/lane.json` with `lane: lane-o2`) cannot pass the gate's path/lane agreement. Future lanes should keep `tasks/<id>/<lane>/lane.json` with `<lane>` = the `lane` field.
- **PROPOSED-G1-08** If the PM should be limited to claim rows inside `docs/STATUS.md`, that needs a content rule in check_claims (4.4 is per path).

## 8. Open questions for the PM / Owner
- **Q1.** `check_claims` still maps `grok_pm` and `grok_bot` to `grok` (kept as the brief asked). As a result, a PM commit tagged `[grok_bot]`/`[grok_pm]` counts as the reviewer family, and `closedBy: grok_bot` counts as a Grok closure. The rule "pm never closes" binds only the `[pm]` identity. Should those aliases map to `pm`? I changed nothing. The merge gate has no `grok_pm` family: a `[grok_pm]` manifest edit is `MANIFEST_TAMPERED` (`fail_lane_json_edited_by_grok_pm_tag`).
- **Q2.** Should the PM's 4.4 whitelist move to a `docs/STATUS.md` row that the PM maintains, like the coordinator's? I built it in because the PM writes STATUS itself (§1), so a row would let a `[pm]` commit widen the PM's own whitelist.
- **Q3.** The relaunch-note convention (`--- original prompt follows ---`) is inferred from one PM relaunch prompt. Should the PM adopt it formally, or pass `-ResumeFromSha` with an unannotated prompt?
- **Q4.** On provider failover, should the saved prompt be reused anyway (it names the old provider and commit tag), or should the default be generated, which is what happens now?

## 9. Scope
`git diff --name-only 9cba41eaf6378048d50004dcf243defbfe7f17f4..HEAD` with each path checked against lane.json `allowedPaths` (the merge gate's `globToRegExp`): see §9.1. `BRIEF.md`, `lane.json` and `launches/20260926_042901_prompt.txt` are the PM's and the launcher's commits (`41d24474`, `242e526b`) and were not edited by this lane.

### 9.1 Scope check (run on the report commit; the next commit changes only this REPORT.md, already listed)
```
$ git diff --name-only 9cba41eaf6378048d50004dcf243defbfe7f17f4..HEAD   (HEAD 1c7c5165779dee8405ea8be78329e5f75eee8322, the report commit)
EXIT=0
tasks/WG.00.12b/lane-g1/BRIEF.md  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/REPORT.md  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/base_mutants_resume_queue.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/base_test_check_claims.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/base_test_launch_worker.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/base_test_merge_gate.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/base_test_resume_queue.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/check_claims_before_after.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/gate1_test_merge_gate.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/gate2_test_check_claims.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/gate3_test_launch_worker.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/gate4_test_resume_queue.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/gate5_check_deus_syntax.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/merge_gate_dry_run_lane_k.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/merge_gate_dry_run_lane_m_and_o2.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/merge_gate_dry_run_lane_r.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/mutants_launch_worker.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/mutants_resume_queue.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/evidence/real_manifests_validation.log  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/lane.json  ->  in allowedPaths (tasks/WG.00.12b/**)
tasks/WG.00.12b/lane-g1/launches/20260926_042901_prompt.txt  ->  in allowedPaths (tasks/WG.00.12b/**)
tools/governance/MERGE_GATE.md  ->  in allowedPaths (tools/governance/MERGE_GATE.md)
tools/governance/README.md  ->  in allowedPaths (tools/governance/README.md)
tools/governance/check_claims.js  ->  in allowedPaths (tools/governance/check_claims.js)
tools/governance/merge_gate.js  ->  in allowedPaths (tools/governance/merge_gate.js)
tools/governance/test_check_claims.js  ->  in allowedPaths (tools/governance/test_check_claims.js)
tools/governance/test_merge_gate.js  ->  in allowedPaths (tools/governance/test_merge_gate.js)
tools/ops/README.md  ->  in allowedPaths (tools/ops/README.md)
tools/ops/launch_worker.ps1  ->  in allowedPaths (tools/ops/launch_worker.ps1)
tools/ops/resume_queue.ps1  ->  in allowedPaths (tools/ops/resume_queue.ps1)
tools/ops/test_launch_worker.ps1  ->  in allowedPaths (tools/ops/test_launch_worker.ps1)
tools/ops/test_resume_queue.ps1  ->  in allowedPaths (tools/ops/test_resume_queue.ps1)
paths outside allowedPaths: 0
EXIT=0
```

## Appendix A: raw gateTests output (clone at `3387244f`), verbatim from `evidence/gate1..5_*.log`

### gate1_test_merge_gate.log
```
$ node tools/governance/test_merge_gate.js   (temp clone C:\Users\snewt\AppData\Local\Temp\g1_verify_20260926_051909 at 3387244fbc7f6151360506c523ef66d8dbc3196c; start 2026-09-26T10:19:33Z)
=== merge_gate.js tests (WG.00.12 Lane I) ===
temp repository: C:\Users\snewt\AppData\Local\Temp\deus-merge-gate-test-7RfNDj
PASS unit_glob
PASS unit_verdict
PASS unit_tags_and_families
PASS unit_manifest_trust
PASS unit_full_hashes
PASS unit_quarantine_path_normalisation
PASS unit_manifest_validation
PASS unit_every_mutant_has_a_kill_case
PASS pass_valid_lane_dry_run_prints_summary
PASS pass_clean_pass_bold_verdict
PASS pass_failed_review_then_fix_then_pass_review
PASS pass_review_names_gemini_commit_after_writer
PASS pass_no_designated_reviewer_grok_review
PASS pass_gemini_updates_manifest_later
PASS pass_run_from_lane_worktree
PASS fail_same_tag_review_claude_reviews_claude
PASS fail_same_tag_review_with_designated_reviewer
PASS fail_fable_reviews_claude
PASS fail_claude_reviews_fable
PASS fail_review_names_other_commit
PASS fail_review_hash_wrong_content
PASS fail_review_hash_abbreviated
PASS fail_writer_commit_after_review
PASS fail_gemini_commit_after_review
PASS fail_verdict_missing
PASS fail_verdict_fail
PASS fail_verdict_incomplete
PASS fail_verdict_empty
PASS fail_verdict_conflicting_lines
PASS fail_review_commit_touches_code
PASS fail_review_file_misnamed
PASS fail_reviewer_not_designated
PASS fail_review_tag_unknown
PASS fail_review_missing
PASS fail_test_exits_nonzero
PASS fail_test_timeout
PASS fail_test_spawn_error
PASS fail_no_gate_tests
PASS fail_quarantined_test
PASS fail_quarantine_list_invalid_on_branch
PASS fail_uncommitted_fix_not_counted
PASS fail_out_of_scope_file
PASS fail_out_of_scope_deletion
PASS fail_sibling_lane_dir_prefix
PASS fail_writer_edits_lane_json
PASS fail_lane_json_edited_by_grok
PASS fail_lane_json_changed_by_merge_commit
PASS pass_pm_opened_lane
PASS pass_pm_opened_lane_widened_by_pm_then_gemini
PASS fail_claude_edits_pm_opened_lane_json
PASS fail_lane_json_edited_by_ops
PASS fail_lane_json_edited_by_codex
PASS fail_lane_json_edited_by_untagged_commit
PASS fail_lane_json_edited_by_grok_pm_tag
PASS fail_lane_json_changed_by_pm_merge_commit
PASS fail_pm_review_commit_is_not_a_review
PASS fail_pm_commit_after_review
PASS fail_manifest_missing
PASS fail_manifest_invalid_json
PASS fail_manifest_branch_mismatch
PASS fail_manifest_path_of_other_lane
PASS fail_branch_unpushed_local_ahead
PASS fail_branch_diverged
PASS fail_branch_never_pushed
PASS fail_local_behind_remote
PASS fail_tracking_ref_stale
PASS fail_branch_missing
PASS fail_main_dirty
PASS fail_main_merge_in_progress
PASS fail_main_not_synced
PASS fail_main_not_checked_out
PASS fail_usage_without_manifest
PASS fail_mutant_flag_without_selftest_env
PASS fail_unknown_mutant
PASS mutant_run_is_forced_dry_run_and_never_merges
PASS pass_real_merge_no_ff_never_pushes
PASS fail_merge_conflict_is_aborted
PASS fail_nothing_to_merge
PASS mutant_manifest_provenance_off_killed
PASS mutant_manifest_trust_any_tag_killed
PASS mutant_manifest_trust_pm_merge_killed
PASS mutant_manifest_gemini_untrusted_killed
PASS mutant_manifest_pm_untrusted_killed
PASS mutant_pm_review_family_killed
PASS mutant_scope_off_killed
PASS mutant_review_required_off_killed
PASS mutant_review_order_off_killed
PASS mutant_review_family_off_killed
PASS mutant_fable_alias_off_killed
PASS mutant_reviewer_designation_off_killed
PASS mutant_review_files_off_killed
PASS mutant_review_name_off_killed
PASS mutant_review_hash_off_killed
PASS mutant_verdict_off_killed
PASS mutant_test_exit_off_killed
PASS mutant_test_timeout_off_killed
PASS mutant_quarantine_off_killed
PASS mutant_fresh_clone_off_killed
PASS mutant_push_off_killed
PASS mutant_tracking_off_killed
PASS mutant_main_clean_off_killed
PASS mutant_main_sync_off_killed
PASS source_mutant_dry_run_merges_killed
PASS source_mutant_fast_forward_merge_killed
PASS source_mutant_push_after_merge_killed
RESULT: 105 passed, 0 failed
EXIT=0
wall=231 s
```

### gate2_test_check_claims.log
```
$ node tools/governance/test_check_claims.js   (temp clone C:\Users\snewt\AppData\Local\Temp\g1_verify_20260926_051909 at 3387244fbc7f6151360506c523ef66d8dbc3196c; start 2026-09-26T10:23:28Z)
=== check_claims.js tests (WG.00.12 Lanes C2 and C2b) ===
temp repository: C:\Users\snewt\AppData\Local\Temp\deus-check-claims-hYKjpc
PASS unit_status_allowlist
PASS unit_status_normalization
PASS unit_status_arrows_labels_annotations
PASS unit_reviewers_and_agents
PASS unit_revision_log
PASS unit_glob_subtree
PASS unit_pass_and_fail_outcomes
PASS unit_json_key_conflicts
PASS unit_prose_claims
PASS unit_review_artifact_verdicts
PASS unit_record_ids_and_tables
PASS unit_decisions_and_lane_matrix
PASS unit_pm_agent
PASS pass_c2_edits_own_tool_branch_identity
PASS pass_env_lane_b_edits_fix
PASS pass_subtree_whitelist
PASS pass_wbs_done_with_commit_and_reviewer
PASS pass_wbs_done_with_test_log_and_verdict
PASS pass_wbs_leaf_added_with_rev_and_log
PASS pass_wbs_status_only_edit_without_rev
PASS pass_wbs_reopen_done_to_review
PASS pass_status_negated_closure_word
PASS pass_status_arrow_to_nonterminal
PASS pass_status_label_nonterminal
PASS pass_status_struck_old_value
PASS pass_status_header_synonym_state
PASS pass_rev_log_header_synonym
PASS pass_owner_closure_with_decided_dec
PASS pass_artifact_scoped_item_verdicts
PASS pass_pair_column_writer_reviewer
PASS pass_ledger_closed_by_reviewer_relayed
PASS pass_ledger_closer_signs_own_closure
PASS pass_ledger_closer_adds_review_in_same_commit
PASS pass_ledger_mixed_case_keys_fix_ready
PASS pass_status_row_closed_backed_by_ledger
PASS pass_status_prose_unrelated_edit
PASS pass_clean_merge_by_coordinator
PASS pass_commit_mode_clean_commit
PASS pass_commit_merge_without_agent_subject
PASS pass_lane_given_as_agent_name
PASS pass_bom_added_to_ledger
PASS pass_range_row_expanded_with_rev
PASS pass_range_row_hyphen_for_en_dash
PASS fail_status_label_prefix
PASS fail_status_unicode_arrow
PASS fail_status_ascii_arrow
PASS fail_status_arrow_to_unknown
PASS fail_status_zero_width
PASS fail_status_fullwidth
PASS fail_status_emphasis_split
PASS fail_status_emphasis_word
PASS fail_status_transition_annotation
PASS fail_status_unlisted_terminal
PASS fail_status_unknown_word
PASS fail_status_blanked
PASS fail_status_html_entity
PASS fail_status_emoji_mixed_case
PASS fail_status_check_mark_beside_review
PASS fail_status_second_table_leaf
PASS fail_status_leaf_id_with_suffix
PASS fail_status_blockquote_table_leaf
PASS fail43_html_table_in_wbs
PASS fail41_html_table_in_status
PASS fail41_done_without_evidence
PASS fail41_fabricated_hash
PASS fail41_commit_not_reachable
PASS fail41_failing_test_log
PASS fail41_test_claim_text_only
PASS fail41_missing_test_script
PASS fail41_cited_evidence_file_missing
PASS fail41_status_table_closed_without_evidence
PASS fail41_second_defect_table_closed
PASS fail41_defect_id_cell_suffixed
PASS fail41_ledger_path_case_variant
PASS fail41_defect_status_column_renamed
PASS fail41_ledger_closure_without_evidence
PASS fail41_ledger_ambiguous_duplicate_keys
PASS fail41_ledger_status_key_case
PASS fail42_wbs_done_no_reviewer_committer_is_owner
PASS fail42_wbs_owner_named_as_reviewer
PASS fail42_wbs_claude_alias_of_fable_owner
PASS fail42_wbs_cited_commit_author_as_reviewer
PASS fail42_typed_closedby_without_artifact
PASS fail42_artifact_by_another_agent
PASS fail42_artifact_forged_in_same_commit
PASS fail42_artifact_missing
PASS fail42_artifact_does_not_mention_leaf
PASS fail42_status_document_as_review_artifact
PASS fail42_script_as_review_artifact
PASS fail42_artifact_records_failing_verdict
PASS fail42_artifact_item_verdict_fails
PASS fail42_pair_column_writer_reviews_own_leaf
PASS fail42_closer_is_committer
PASS fail42_unknown_closer_name
PASS fail42_unknown_closer_beside_valid
PASS fail42_owner_closure_without_dec
PASS fail42_owner_closure_dec_open
PASS fail42_owner_closure_dec_unrelated
PASS fail42_owner_closure_dec_added_in_same_commit
PASS fail42_ledger_closedby_is_fixer
PASS fail42_ledger_fixer_commits_closure
PASS fail42_ledger_closure_without_closedby
PASS fail42_ledger_closedby_not_an_agent
PASS fail42_ledger_typed_closedby_without_artifact
PASS fail42_ledger_unlisted_terminal_status
PASS fail42_closure_by_unknown_committer
PASS fail42_status_row_closed_but_ledger_open
PASS fail42_status_prose_claim
PASS fail42_status_prose_task_list_checked
PASS fail43_leaf_added_without_rev
PASS fail43_leaf_deleted
PASS fail43_leaf_renamed
PASS fail43_leaf_retitled
PASS fail43_scope_edit_without_rev
PASS fail43_rev_went_down
PASS fail43_rev_header_removed
PASS fail43_rev_up_without_log_row
PASS fail43_rev_log_gap
PASS fail43_rev_log_row_deleted
PASS fail43_rev_log_row_rewritten
PASS fail43_rev_log_zero_row
PASS fail43_rev_log_ahead_of_header
PASS fail43_rev_log_header_renamed
PASS fail43_rev_log_removed
PASS fail43_wbs_status_column_renamed
PASS fail43_duplicate_leaf_id
PASS fail43_range_row_deleted
PASS fail43_single_row_inside_range
PASS fail43_ledger_line_deleted
PASS fail43_ledger_line_rewritten
PASS fail44_file_of_another_lane
PASS fail44_frozen_path_even_for_coordinator
PASS fail44_path_no_lane_owns
PASS fail44_commit_widens_own_whitelist
PASS fail44_no_identity_on_main
PASS fail44_declared_agent_does_not_hold_lane
PASS fail44_rename_out_of_lane
PASS fail44_merge_resolution_edits_other_lane
PASS fail44_commit_mode_uses_subject_agent
PASS pass44_grandfathered_pre_epoch
PASS fail44_post_epoch_not_grandfathered
PASS fail41_pre_epoch_commit_still_checked
PASS pass_pm_lane_opening_commit
PASS pass_pm_status_claim_commit
PASS pass_pm_staged_on_the_lane_branch
PASS pass_pm_range_with_head_ref_hint
PASS pass_pm_records_grok_closure_in_status
PASS fail44_pm_edits_code
PASS fail44_pm_writes_lane_files_other_than_the_brief
PASS fail44_pm_frozen_path_inside_its_whitelist
PASS fail44_pm_status_row_grants_nothing
PASS fail44_pm_explicit_lane_not_held
PASS fail42_pm_self_certifies_in_status
PASS fail42_pm_named_as_closer_with_its_own_artifact
PASS fail42_ledger_closedby_pm
PASS pass_range_gate_clean
PASS range_gate_flags_out_of_lane_commit
PASS range_gate_merge_lane_hint
PASS range_gate_head_ref_hint
PASS range_gate_rejects_rewritten_base
PASS range_gate_refuses_symmetric_range
PASS backfill_clean_ledger_has_no_flags
PASS backfill_chain_burst_B1
PASS backfill_batch_burst_B2
PASS backfill_window_edge_1000ms_not_flagged
PASS backfill_window_edge_999ms_flagged
PASS backfill_audit_trail_A1_A2_A3_A4
PASS hook_install_reject_tamper_accept_failclosed_uninstall
PASS text_output_pass_fail_result_lines
PASS real_31676cf_WG.00.08_DONE_without_reviewer_fails_4.2
PASS real_d1fbeab_ledger_chain_bursts_flagged
PASS real_integration_merges_and_lane_commits_pass
PASS real_pm_claim_and_lane_opening_commits_pass
PASS real_2355931_pre_epoch_lane_commit_grandfathered
PASS real_epoch_override_cannot_widen
PASS mutant_4.1_evidence_gate_off_killed
PASS mutant_4.1_reachability_ignored_killed
PASS mutant_4.1_text_test_claim_trusted_killed
PASS mutant_4.1_failing_log_accepted_killed
PASS mutant_4.1_missing_evidence_files_ignored_killed
PASS mutant_4.1_defect_status_column_loss_ignored_killed
PASS mutant_4.1_defect_tables_first_only_killed
PASS mutant_4.2_wbs_reviewer_not_required_killed
PASS mutant_4.2_typed_closedby_accepted_killed
PASS mutant_4.2_artifact_author_unchecked_killed
PASS mutant_4.2_artifact_same_commit_by_anyone_killed
PASS mutant_4.2_artifact_id_unchecked_killed
PASS mutant_4.2_closer_may_be_committer_killed
PASS mutant_4.2_reviewer_regex_unknown_names_ignored_killed
PASS mutant_4.2_reviewer_regex_off_killed
PASS mutant_4.2_reviewer_regex_unnormalized_killed
PASS mutant_4.2_ledger_closer_not_validated_killed
PASS mutant_4.2_owner_needs_no_decision_killed
PASS mutant_4.2_owner_decision_scope_unchecked_killed
PASS mutant_4.2_status_docs_count_as_review_artifacts_killed
PASS mutant_4.2_artifact_verdict_unread_killed
PASS mutant_4.2_artifact_heading_verdict_unread_killed
PASS mutant_4.2_artifact_verdict_scope_ignored_killed
PASS mutant_4.2_artifact_verdict_scope_without_item_killed
PASS mutant_4.2_artifact_table_verdicts_unread_killed
PASS mutant_4.2_decision_status_ignored_killed
PASS mutant_4.2_decisions_read_from_new_tree_killed
PASS mutant_4.2_closer_may_be_fixer_killed
PASS mutant_4.2_fixer_may_commit_closure_killed
PASS mutant_4.2_unknown_committer_allowed_killed
PASS mutant_4.2_status_prose_not_scanned_killed
PASS mutant_status_allowlist_replaced_by_denylist_killed
PASS mutant_status_closing_words_ignored_killed
PASS mutant_status_arrow_targets_unchecked_killed
PASS mutant_status_negation_ignored_killed
PASS mutant_status_prose_compounds_claimed_killed
PASS mutant_status_determiners_ignored_killed
PASS mutant_status_unicode_arrows_ignored_killed
PASS mutant_status_ascii_arrows_ignored_killed
PASS mutant_status_label_not_stripped_killed
PASS mutant_status_emphasis_not_stripped_killed
PASS mutant_status_invisible_chars_kept_killed
PASS mutant_status_no_nfkc_killed
PASS mutant_status_entities_not_decoded_killed
PASS mutant_status_strikethrough_kept_killed
PASS mutant_status_check_marks_ignored_killed
PASS mutant_leaf_ids_exact_only_killed
PASS mutant_leaf_sub_ids_read_as_parent_killed
PASS mutant_defect_sub_ids_read_as_parent_killed
PASS mutant_pair_columns_read_as_owner_and_reviewer_killed
PASS mutant_pair_writer_not_an_owner_killed
PASS mutant_defect_ids_exact_only_killed
PASS mutant_tables_in_blockquotes_skipped_killed
PASS mutant_html_tables_allowed_killed
PASS mutant_status_leaf_tables_need_wbs_header_killed
PASS mutant_identity_env_overrides_audited_commit_killed
PASS mutant_identity_shared_lane_agent_dropped_killed
PASS mutant_bom_not_stripped_killed
PASS mutant_4.3_rev_increase_not_required_killed
PASS mutant_4.3_deleted_leaves_allowed_killed
PASS mutant_4.3_range_expansion_counts_as_deletion_killed
PASS mutant_4.3_range_overlap_ignored_killed
PASS mutant_4.3_rev_header_optional_killed
PASS mutant_4.3_status_column_optional_killed
PASS mutant_4.3_revlog_contiguity_unchecked_killed
PASS mutant_4.3_revlog_row_deletion_allowed_killed
PASS mutant_4.3_revlog_row_rewrite_allowed_killed
PASS mutant_4.3_revlog_header_synonyms_dropped_killed
PASS mutant_4.3_revlog_section_detection_off_killed
PASS mutant_4.3_revlog_table_optional_killed
PASS mutant_4.3_ledger_append_only_off_killed
PASS mutant_ledger_keys_case_sensitive_killed
PASS mutant_ledger_path_case_sensitive_killed
PASS mutant_ledger_duplicate_keys_allowed_killed
PASS mutant_ledger_denylist_instead_of_allowlist_killed
PASS mutant_4.4_whitelist_off_killed
PASS mutant_4.4_whitelist_read_from_staged_status_killed
PASS mutant_4.4_frozen_row_ignored_killed
PASS mutant_4.4_merge_counts_every_merged_path_killed
PASS mutant_4.4_empty_merge_needs_identity_killed
PASS mutant_4.4_subtree_glob_off_killed
PASS mutant_grandfather_every_audited_commit_killed
PASS mutant_grandfather_nothing_killed
PASS mutant_grandfather_covers_all_rules_killed
PASS mutant_epoch_override_may_widen_killed
PASS mutant_range_base_ancestry_unchecked_killed
PASS mutant_range_merge_lane_hints_off_killed
PASS mutant_range_head_ref_hint_off_killed
PASS mutant_range_symmetric_allowed_killed
PASS mutant_pm_builtin_whitelist_off_killed
PASS mutant_pm_whitelist_any_path_killed
PASS mutant_pm_whitelist_whole_lane_folder_killed
PASS mutant_pm_alias_of_grok_killed
PASS mutant_pm_matched_in_free_text_killed
PASS mutant_pm_lane_hint_honoured_killed
PASS mutant_pm_explicit_lane_overridden_killed
PASS mutant_pm_may_close_killed
PASS mutant_pm_status_closer_rule_off_killed
PASS mutant_pm_ledger_closer_rule_off_killed
PASS mutant_backfill_B1_window_zero_killed
PASS mutant_backfill_B2_off_killed
PASS mutant_backfill_window_inclusive_killed
PASS mutant_hook_fails_open_without_checker_killed
PASS mutant_hook_runs_working_tree_checker_killed
RESULT: 279 passed, 0 failed
EXIT=0
wall=127 s
```

### gate3_test_launch_worker.log
```
$ powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1   (temp clone C:\Users\snewt\AppData\Local\Temp\g1_verify_20260926_051909 at 3387244fbc7f6151360506c523ef66d8dbc3196c; start 2026-09-26T10:25:40Z)
test_launch_worker: ops C:\Users\snewt\AppData\Local\Temp\g1_verify_20260926_051909\tools\ops; temp C:\Users\snewt\AppData\Local\Temp\deus_lw_test_19084_1193
TEST refuse_missing_brief
  PASS exit_1
  PASS says_not_found
  PASS no_registry_entry
  PASS no_prompt_file
  (0.4 s)
TEST refuse_empty_brief
  PASS exit_1
  PASS says_empty
  PASS no_registry_entry
  PASS no_prompt_file
  (0.4 s)
TEST commit_run
  PASS exit_0
  PASS state_completed
  PASS run_id_format
  PASS prompt_saved
  PASS prompt_tracked
  PASS prompt_committed_before_worker
  PASS prompt_commit_names_role_and_provider
  PASS registry_prompt_generated
  PASS registry_push_rule_default
  PASS worker_got_exact_prompt
  PASS prompt_names_brief
  PASS prompt_lists_allowed
  PASS prompt_no_art_rule
  PASS prompt_do_not_push_without_push_brief
  PASS log_path
  PASS log_has_stdout
  PASS log_has_stderr
  PASS exit_file
  PASS registry_pid
  PASS registry_process_start
  PASS registry_start_end
  PASS registry_exit_code
  PASS registry_new_commit
  PASS registry_launch_time_ct
  PASS worker_process_gone
  PASS env_author
  PASS env_committer
  PASS env_integrator_stripped
  PASS commit_author_identity
  PASS no_flags
  (1.8 s)
TEST resume_prompt
  PASS exit_0
  PASS first_line_exact
  PASS still_names_brief
  PASS registry_resume_sha
  PASS no_head_mismatch
  (1.6 s)
TEST push_rule_from_brief
  PASS exit_0
  PASS no_do_not_push
  PASS rule2_pushes_own_branch
  PASS ends_with_final_sha
  PASS worker_got_it
  PASS registry_push_rule
  (1.6 s)
TEST push_rule_other_branch_is_not_a_push
  PASS exit_0
  PASS do_not_push_kept
  PASS registry_no_push
  (1.6 s)
TEST push_rule_lane_json_true
  PASS exit_0
  PASS push_rule
  PASS registry_source_lane_json
  (1.5 s)
TEST push_rule_lane_json_false_wins
  PASS exit_0
  PASS do_not_push
  PASS registry_source_lane_json
  (1.6 s)
TEST push_rule_lane_json_invalid_refused
  PASS exit_1
  PASS says_push_boolean
  PASS no_registry_entry
  (0.5 s)
TEST prompt_file_recorded_then_reused
  PASS first_exit_0
  PASS first_verbatim
  PASS registry_prompt_file
  PASS second_exit_0
  PASS second_run_is_new
  PASS saved_prompt_reused
  PASS no_do_not_push_injected
  PASS registry_saved
  (2.9 s)
TEST reuse_with_resume_does_not_stack
  PASS first_has_one_resume_line
  PASS exit_0
  PASS reused_the_copy
  PASS source_gone_was_skipped
  PASS exactly_one_resume_line
  PASS new_sha_on_top
  (3.1 s)
TEST explicit_prompt_file_resume_not_stacked
  PASS without_resume_verbatim
  PASS exit_0
  PASS one_resume_line_new_sha
  (2.9 s)
TEST relaunch_note_dropped_when_reused
  PASS explicit_note_kept
  PASS exit_0
  PASS reused
  PASS note_dropped_resume_on_top
  (2.9 s)
TEST reviewer_prompt_never_reused_for_writer
  PASS reviewer_run_recorded
  PASS exit_0
  PASS writer_role
  PASS no_reviewer_text
  PASS generated_writer_prompt
  PASS skipped_registry_reviewer_by_role
  PASS skipped_committed_reviewer
  PASS skipped_unknown_role
  (3.1 s)
TEST writer_prompt_never_reused_for_reviewer
  PASS writer_exit_0
  PASS reviewer_role
  PASS no_writer_text
  PASS generated_reviewer_prompt
  (2.8 s)
TEST committed_prompt_reused_without_registry
  PASS exit_0
  PASS reused_committed_copy
  PASS worker_got_pm_prompt
  (2.8 s)
TEST generated_prompt_not_reused
  PASS first_generated_no_push
  PASS exit_0
  PASS regenerated_with_push
  PASS old_generated_skipped
  (3.1 s)
TEST other_task_or_provider_not_reused
  PASS exit_0
  PASS generated
  PASS skipped_task
  PASS skipped_provider
  (1.6 s)
TEST saved_prompt_flag_needs_prompt_file
  PASS exit_1
  PASS says_needs_prompt_file
  PASS no_registry_entry
  (0.5 s)
TEST timeout_kill
  PASS exit_2
  PASS state_timeout
  PASS timed_out_flag
  PASS bounded_time
  PASS worker_killed
  PASS child_started
  PASS child_killed
  PASS log_has_output
  PASS registry_end
  (7.4 s)
TEST orphaned_children
  PASS exit_2
  PASS state_orphaned
  PASS orphan_pid_recorded
  PASS orphan_left_running
  PASS worker_committed
  (2.5 s)
TEST kill_orphans
  PASS state_orphaned
  PASS orphans_killed_flag
  PASS orphan_dead
  (3.0 s)
TEST exited_no_commit
  PASS exit_2
  PASS state_exited_no_commit
  PASS dirty_file_listed
  PASS no_new_commit
  (1.4 s)
TEST clean_no_commit_is_ok
  PASS flag_absent
  (1.4 s)
TEST scope_check
  PASS exit_2
  PASS state_out_of_scope
  PASS entries_are_paths
  PASS committed_outside_listed
  PASS uncommitted_outside_listed
  PASS allowed_not_listed
  PASS committed_allowed_not_listed
  PASS exactly_two
  (1.7 s)
TEST empty_log
  PASS exit_2
  PASS state_empty_log
  PASS log_bytes_0
  PASS log_file_exists
  (1.5 s)
TEST usage_claude_epoch
  PASS exit_2
  PASS state_usage
  PASS matched_text
  PASS reset_from_epoch
  PASS provider_exhausted
  PASS provider_reset
  PASS queued_once
  PASS queue_fields
  PASS queue_last_commit
  (1.6 s)
TEST usage_clock_reset
  PASS state_usage
  PASS reset_source_clock
  PASS reset_5pm_ct
  PASS reset_within_a_day
  (1.5 s)
TEST usage_codex_relative
  PASS state_usage
  PASS reset_2h05
  PASS matched_text
  PASS codex_exhausted
  (1.5 s)
TEST usage_grok_default
  PASS role_reviewer
  PASS state_usage
  PASS default_reset_60
  PASS matched_429
  (1.5 s)
TEST usage_no_false_positive
  PASS exit_0
  PASS state_completed
  PASS no_usage
  PASS not_queued
  (1.5 s)
TEST lane_lock
  PASS exit_1
  PASS says_locked
  PASS no_run
  (3.7 s)
TEST active_pid_refusal
  PASS exit_1
  PASS says_live_worker
  PASS no_new_entry
  (0.5 s)
TEST stale_entry_marked_lost
  PASS exit_0
  PASS stale_marked_lost
  (1.7 s)
TEST family_refusal
  PASS grok_writer_refused
  PASS claude_reviewer_refused
  PASS no_run
  (0.8 s)
TEST branch_refusal
  PASS exit_1
  PASS says_branch
  (0.5 s)
TEST hooks_install_and_block
  PASS install_exit_0
  PASS worktree_scoped_hookspath
  PASS worktree_config_enabled
  PASS main_not_guarded
  PASS repo_wide_not_set
  PASS global_not_set
  PASS hook_copied_exactly
  PASS push_blocked
  PASS remote_untouched
  PASS push_blocked_unless_exactly_1
  PASS integrator_push_allowed
  PASS remote_updated
  PASS main_push_not_guarded
  PASS check_reports_guarded
  PASS check_reports_unguarded
  (2.2 s)
TEST hooks_refuse_main
  PASS exit_1
  PASS says_main
  PASS main_not_guarded
  PASS global_not_set
  (0.3 s)
TEST gate_registry
  PASS valid_json
  PASS gate_is_list_of_paths
  PASS quarantine_has_path_and_reason
  PASS gate_has_check_deus_syntax
  PASS gate_has_test_palette
  PASS gate_has_test_check_claims
  PASS gate_has_test_strata_cuts_and_caves
  PASS gate_has_test_new_game_year0
  PASS gate_has_test_history_materialization_and_world_age
  PASS gate_has_test_historical_carrying_capacity
  PASS gate_has_test_geology_strata
  PASS gate_has_test_strata_foundation
  PASS z2_quarantined
  PASS no_path_in_both
  PASS no_duplicates
  PASS all_paths_exist
  (0.0 s)
  PASS no_leftover_processes
RESULT: PASS (216 checks, 0 failed)
EXIT=0
wall=75 s
```

### gate4_test_resume_queue.log
```
$ powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_resume_queue.ps1   (temp clone C:\Users\snewt\AppData\Local\Temp\g1_verify_20260926_051909 at 3387244fbc7f6151360506c523ef66d8dbc3196c; start 2026-09-26T10:27:01Z)
test_resume_queue: ops C:\Users\snewt\AppData\Local\Temp\g1_verify_20260926_051909\tools\ops; temp C:\Users\snewt\AppData\Local\Temp\deus_rq_test_8104_35854
TEST not_due_no_probe
  PASS exit_0
  PASS not_probed
  PASS reset_unchanged
  PASS no_launch
  PASS still_queued
  PASS skip_reason
  (0.8 s)
TEST probe_fail_backoff
  PASS exit_0
  PASS all_three_probed
  PASS late_reset_backs_off_from_now
  PASS on_time_reset_plus_30
  PASS unknown_reset_now_plus_30
  PASS still_exhausted
  PASS probe_result_usage
  PASS no_launch
  PASS still_queued
  (1.8 s)
TEST probe_ok_relaunch
  PASS exit_0
  PASS probed
  PASS available
  PASS reset_cleared
  PASS launched_once
  PASS launch_lane_provider
  PASS launch_resume_sha
  PASS launch_role_writer
  PASS launch_brief
  PASS entry_resumed
  (1.5 s)
TEST probe_timeout
  PASS exit_0
  PASS bounded_time
  PASS timeout_recorded
  PASS backed_off
  PASS no_launch
  (4.1 s)
TEST live_pid_blocks
  PASS no_launch
  PASS still_queued
  PASS skip_lane_active
  (0.6 s)
TEST launcher_pid_blocks
  PASS no_launch
  PASS skip_lane_active
  (0.6 s)
TEST dead_pid_does_not_block
  PASS launched
  (1.3 s)
TEST lane_lock_blocks
  PASS no_launch
  PASS skip_locked
  (0.6 s)
TEST one_session_per_lane
  PASS launched_once
  PASS one_resumed_one_queued
  (1.0 s)
TEST failover_refuses_same_family
  PASS no_launch
  PASS still_queued
  PASS reason_family
  (0.6 s)
TEST failover_to_distinct_family
  PASS launched_once
  PASS codex_writer
  PASS failover_recorded
  (1.0 s)
TEST reviewer_role_preserved
  PASS launched_once
  PASS not_claude
  PASS codex_reviewer
  (1.0 s)
TEST no_failover_without_flag
  PASS no_launch
  PASS still_queued
  (0.6 s)
TEST codex_probed
  PASS codex_probed
  PASS codex_available
  (1.0 s)
TEST launch_failure_requeues
  PASS exit_1
  PASS launcher_called
  PASS back_to_queued
  PASS error_recorded
  (0.9 s)
TEST dry_run_writes_nothing
  PASS exit_0
  PASS status_unchanged
  PASS no_probe
  PASS no_launch
  PASS says_would_probe
  (0.5 s)
TEST relaunch_passes_saved_prompt
  PASS exit_0
  PASS launched_once
  PASS passes_prompt_file
  PASS marks_it_saved
  PASS logs_choice
  PASS queue_records_prompt
  (1.2 s)
TEST relaunch_prefers_the_queued_run
  PASS launched_once
  PASS queued_run_prompt
  (1.0 s)
TEST relaunch_prompt_falls_back_to_committed
  PASS launched_once
  PASS passes_committed_prompt
  PASS logs_committed
  (1.1 s)
TEST reviewer_relaunch_uses_reviewer_prompt
  PASS launched_once
  PASS reviewer_prompt
  PASS not_writer_prompt
  (1.2 s)
TEST no_saved_prompt_uses_launcher_default
  PASS launched_once
  PASS no_prompt_file
  PASS logs_default
  PASS queue_records_default
  (0.9 s)
TEST dry_run_shows_prompt_choice
  PASS exit_0
  PASS no_launch
  PASS status_unchanged
  PASS would_pass_prompt
  (0.6 s)
TEST end_to_end_saved_prompt_resume
  PASS exit_0
  PASS resumed_verified
  PASS run_completed
  PASS one_resume_line_no_note
  PASS registry_saved_source
  (2.1 s)
TEST end_to_end_real_launcher
  PASS exit_0
  PASS resumed_verified
  PASS run_completed
  PASS resume_prompt
  PASS same_provider
  (2.1 s)
  PASS no_leftover_processes
RESULT: PASS (95 checks, 0 failed)
EXIT=0
wall=30 s
```

### gate5_check_deus_syntax.log
```
$ node tools/check_deus_syntax.js   (temp clone C:\Users\snewt\AppData\Local\Temp\g1_verify_20260926_051909 at 3387244fbc7f6151360506c523ef66d8dbc3196c; start 2026-09-26T10:27:31Z)
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
wall=3 s
```
