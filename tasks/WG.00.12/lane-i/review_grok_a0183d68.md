# Grok review: WG.00.12 Lane I automated merge gate

Reviewed commit: a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5

That commit is `[claude] WG.00.12 Lane I: MERGE_GATE.md` on `task/lane-i`. It adds `tools/governance/MERGE_GATE.md`. The gate and the self-test it describes are the parent implementation at `7e9124f3`, unchanged between that commit and a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5. I read `tools/governance/merge_gate.js`, `tools/governance/test_merge_gate.js`, and `tools/governance/MERGE_GATE.md` at that tree, then re-ran the suite from a fresh clone of that commit.

VERDICT: PASS

## How the suite was run

Clone: `git clone --shared --no-checkout` of this repository into `C:\Users\snewt\AppData\Local\Temp\deus-lane-i-review-6c244a5b`, sparse checkout of `tools/governance`, detached at a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5. Node v24.19.0.

Command, from that clone:

```
node tools/governance/test_merge_gate.js
```

Result: `RESULT: 89 passed, 0 failed`. Process exit code **0**. Wall clock for the command was 244 seconds. The harness's own temp repository was `C:\Users\snewt\AppData\Local\Temp\deus-merge-gate-test-SBH6nL` (a bare origin plus a work clone; the harness deleted it). The 89 lines are 7 unit checks, 60 gate cases, 19 `--mutant` kills, and 3 source-mutant kills. That split matches `MERGE_GATE.md` §10. The author's 159-second timing was not reproduced; the pass count and exit code were.

`tools/ops/gate_tests.json` is absent at a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5 (`git cat-file` reports the path does not exist). `docs/CANONICAL_ROLES.md` §2 does list "Claude / Fable" and "Gemini / Antigravity" as one row each, which is what `FAMILIES` encodes.

## Checks (a)-(g)

**(a) Manifest and scope.** `checkManifest` reads `lane.json` from the tip blob, requires the path `tasks/<id>/<lane>/lane.json`, and requires every commit from `git log <tip> -- <manifest>` to be a single-parent gemini-family commit. A bad commit returns before scope, review, or tests (`merge_gate.js` around 455-462 and 746-752). `fail_writer_edits_lane_json` passed, including the marker file that proves the tampered `gateTests` entry never ran. A grok edit and a merge commit that changes the file are refused the same way, and those cases passed. On a throwaway repo I also checked linear history: `[gemini]` add, `[claude]` tamper, `[gemini]` restore. `git log -- <file>` still lists the claude commit, so a later revert does not clear `MANIFEST_TAMPERED`. Scope is `git diff --name-status -z --no-renames <merge-base> <tip>`. Added, modified, and deleted paths must match an `allowedPaths` glob. The out-of-scope file, out-of-scope deletion, and sibling-directory cases passed. `**` does not match the directory itself or a sibling prefix (`unit_glob` passed).

**(b) Review.** The tip must be a one-parent commit that touches a `review_*.md` file. Anything after that commit is `REVIEW_NOT_LAST`, including a `[gemini]` launch-prompt commit (`fail_gemini_commit_after_review` passed). The same-family cases passed: claude reviewing claude, fable reviewing claude, and claude reviewing fable. A designated reviewer is enforced when the manifest names one. The file must be `review_<tag>_<first 8 of the last non-review commit>.md` and must contain that commit's full 40-hex hash as its own word. `unit_full_hashes` passed: a 64-hex token and a 12-hex abbreviation do not count. Every line that parses as a verdict must be `VERDICT: PASS` or `VERDICT: CLEAN PASS`. Missing, `FAIL`, incomplete, empty, and a second non-pass line all refused in the suite. A bold `CLEAN PASS` line is accepted (`pass_clean_pass_bold_verdict`).

**(c) Tests.** Each `gateTests` entry is `spawnSync` with `shell: false`, `node` replaced by `process.execPath`, stdin ignored, stdout and stderr to a log. One `git clone --shared` per test, checked out detached at the checked sha. A non-zero status is `TEST_FAILED`. A timeout is `TEST_TIMEOUT` and is a refusal. `fail_test_timeout` passed (15s sleep, `timeoutSec: 1`, harness bound 12s). `fail_uncommitted_fix_not_counted` passed: an uncommitted fix in the work tree did not make the clone's copy pass. An empty `gateTests` array is `TESTS_NONE`.

**(d) Pushed.** After `git fetch origin`, local tip, `refs/remotes/origin/<branch>`, and `git ls-remote` are compared. Ahead, behind, diverged, never pushed, and a stale tracking ref each have a passing case. `fail_branch_missing` expects both `BRANCH_MISSING` and `BRANCH_NOT_ON_REMOTE` when the branch is on neither side, and that case passed.

**(e) Main.** `main`, `origin/main`, and `ls-remote` of `refs/heads/main` must be one commit. `main` must be checked out in a work tree whose tracked status is clean and which has no `MERGE_HEAD`, `CHERRY_PICK_HEAD`, or `REVERT_HEAD`. Dirty, merge-in-progress, not-synced, and detached cases passed. Untracked files are ignored, which `MERGE_GATE.md` §9 states.

**(f) Execution.** A real merge runs only when every check held and the run is not a dry run. Active mutants force a dry run (`mutant_run_is_forced_dry_run_and_never_merges` passed). The merge is `git merge --no-ff --no-edit` of the checked sha in `main`'s work tree. `pass_real_merge_no_ff_never_pushes` passed: the new `main` has parents `[old main, tip]`, `origin/main` stayed put, and the work tree was clean. `fail_merge_conflict_is_aborted` passed: conflict, `merge --abort`, no `MERGE_HEAD`. There is no `git push` on this path. The three source mutants (dry-run still merges, `--ff` instead of `--no-ff`, push after merge) each occur once in `merge_gate.js` and each was killed.

**(g) Summary.** The report prints raw `rev-parse` / `ls-remote` hashes, the diff with an allowed-path column, the review file and verdict, each test command with exit and duration, the checks table, and `GATE: PASS (exit 0)` or `GATE: REFUSED (exit n)`. `pass_valid_lane_dry_run_prints_summary` asserts those rows and passed.

## Mutant table

`MUTANTS` in `merge_gate.js` and `KILLS` in `test_merge_gate.js` have the same 19 keys. `unit_every_mutant_has_a_kill_case` passed. `MERGE_GATE.md` §10 lists those 19 plus the three source mutants, and the kill-case names match the code. A kill is not a name match: the harness re-runs the case with `--mutant=<name>` under `DEUS_MERGE_GATE_SELFTEST=1`, requires the summary to show that mutant, requires at least one of the case's original reason codes to disappear, and requires the case to stop meeting its original expectation. All 19 `mutant_*_killed` lines passed. I read each switch. They do what the table says: provenance, scope, review presence, review-is-tip, writer family, fable-as-claude, designated reviewer, review commit contents, review file name, reviewed hash, verdict, non-zero exit, timeout, quarantine, fresh clone, local-vs-remote, tracking-ref-vs-ls-remote, main cleanliness, and main sync. `push_off` also skips `BRANCH_NOT_ON_REMOTE`, which is the same comparison when the remote ref is absent. The kill case for that mutant is the ahead case, and it was killed.

## Reason codes

The §6 table has 42 codes. The `refuse(...)` and `UsageError(...)` sites in `merge_gate.js` produce the same 42, with nothing extra and nothing missing. The seven codes whose test-case cell is `none` are `GIT_ERROR`, `REMOTE_ERROR`, `MAIN_MISSING`, `NO_MERGE_BASE`, `RACE_REF_MOVED`, `REVIEW_NO_TARGET`, and `CLONE_FAILED`. Two further branches are named in that table and have no case: a merge commit as the review tip (`REVIEW_COMMIT_FILES`) and a merge that succeeds with unexpected parents (`MERGE_FAILED`). That is the nine untested paths §9 lists. I did not find a reason code the document pretends is tested and the suite never produces.

The unexpected-parents branch (`doMerge`, around 666-671) records `MERGE_FAILED` and leaves `main` where the merge put it. The conflict path does abort. The `--no-ff` source mutant is killed by the harness, so a fast-forward substitution does not slip through the self-test.

## gateTests and quarantine

`quarantineList` reads `tools/ops/gate_tests.json` from the `main` commit and from the tip. A missing file or a missing `quarantine` key adds nothing. Invalid JSON, or a `quarantine` value that is not an array of strings or `{ "path": string }`, is `QUARANTINE_LIST_INVALID` and contributes no entries. The two lists are concatenated, so a bad or empty copy on the tip does not drop `main`'s entries. A test is quarantined when its `cmd` or any arg equals a quarantine path after `normPath` (backslashes to slashes, leading `./` stripped, lowercased). The match does not resolve `..` and does not follow `require`. `MERGE_GATE.md` §9 says that. `fail_quarantined_test` passed: args `tests\Flaky.js` matched `tests/flaky.js` on `main`, the test was not spawned, and the marker file was absent. `fail_quarantine_list_invalid_on_branch` passed. There is no case for a quarantine entry with a bad shape (object without `path`); that branch returns the same `QUARANTINE_LIST_INVALID` code the invalid-JSON case already produces.

When the manifest is trusted, tests still run after scope, review, push, or main have already refused. A tampered manifest does not get that far. §4 states both.

## Findings

These do not open a writer bypass of a trusted manifest, and they do not merge on failure. They are why this is a pass with findings.

1. **The checks table can say a push check passed when the three refs are not equal.** `checkPushed` returns immediately when `ls-remote` errors, after refusing `REMOTE_ERROR` on the refs row, and it returns immediately when the local tip is missing and the remote ref exists (`if (!tip || tip === remote.sha ...)` around line 362). The pushed row is then `PASS` because nothing refused it and nothing skipped it. `checkMain` skips the sync comparison when `ls-remote` errors, so the main row can likewise read `PASS` while `REMOTE_ERROR` is on refs. §9 discloses the `ls-remote` case and says it was read, not run. The missing-local case is not in that paragraph. I ran it in a throwaway origin: branch pushed, local `refs/heads` deleted, gate invoked with `--dry-run`. Exit code 1, only `REFUSED BRANCH_MISSING`, and the checks table contained `(d) pushed | PASS`. The gate did not merge.

2. **A `timeoutSec` that rounds to 0 milliseconds is not a timeout.** Validation accepts any number greater than 0 (around line 434). The spawn uses `Math.round(timeoutSec * 1000)`. On Node v24.19.0, `spawnSync` with `timeout: 0` ran a 5-second process to exit 0. Through the gate, a trusted manifest with `timeoutSec: 0.0004` and a test that sleeps 2 seconds dry-ran as `GATE: PASS (exit 0)`, test row `0.0004 s | 0 | 2.06 s | PASS`, elapsed about 3.7 seconds. A writer cannot put that value in `lane.json` without `MANIFEST_TAMPERED`, which skips tests. Someone who can already commit a `[gemini]` manifest can also set a very large `timeoutSec`. The brief's "a timeout counts as failure" holds for the 1-second case the suite runs.

3. **§7's refused-test sample omits the fences the code prints.** The tail is wrapped in a code fence (`merge_gate.js` around 297-299). The sample in §7 shows the tail text without fences. The suite checks the test row and the captured `FAIL TEST_ deliberate` line, and that case passed.

## Branch state this review sits on

`task/lane-i` at review time is `f1ab35fb5ed74e5a07d3a2ce14b3bdcd87f49ce1`, which is two `[gemini]` launch-prompt commits after the reviewed commit: `e24f073a169da09357c85e246e0660a45fdf24b8`, then `f1ab35fb5ed74e5a07d3a2ce14b3bdcd87f49ce1`. This file names a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5 because that is the commit under review. Check (b), as implemented and tested, treats the first non-review commit below the review tip as the target. After this review commit, that target is `f1ab35fb5ed74e5a07d3a2ce14b3bdcd87f49ce1`, and the expected file name is `review_grok_f1ab35fb.md`. A later gate run on this branch will refuse this file with `REVIEW_FILE_NAME` and `REVIEW_WRONG_COMMIT` until the review names that later commit or those two commits are no longer between a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5 and the review.
