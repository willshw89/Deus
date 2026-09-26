# MERGE_GATE (tools/governance/merge_gate.js)

**Owner:** Claude Code (WG.00.12 Lane I writer; reviewer Grok) · **Files:** `tools/governance/merge_gate.js`, `tools/governance/test_merge_gate.js` · **Built:** 2026-09-26 (`7e9124f3`) · **Changed:** 2026-09-26, WG.00.12b Lane G1: `[pm]` manifest commits are trusted (§4, §5 (a))

A Node script with no npm dependencies (standard library and the `git` command only). It is not a plugin: nothing runs in the game. It judges one lane branch against its manifest, prints a summary table, and either refuses with named reason codes or, when every check holds and `--dry-run` is absent, runs `git merge --no-ff` into `main`. It never pushes.

## 1. Purpose
A lane branch reaches `main` only through the integrator (docs/CANONICAL_ROLES.md §2 and §3: implementation + independent review + coordinator merge). The gate turns the integrator's merge checks (scope, review, tests, push state, a clean `main`) into rules that can fail. It reads every fact from git objects rather than from anyone's report, and prints the raw values it compared so the integrator can check the gate as well.

Who runs it:
- Without `--dry-run` it merges. That is the integrator's step (CANONICAL_ROLES §2: integration authority for all merges into `main`).
- With `--dry-run` it shows what the integrator will see, without merging. A dry run still runs `git fetch origin` (see §9) and the lane's gate tests.

## 2. Usage
```
node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<id>/<lane>/lane.json [--dry-run]
                                    [--branch <name>] [--keep-temp]
node tools/governance/merge_gate.js --help
```

| Option | Effect |
|---|---|
| `--lane <lane>` | Required. Letters, digits, `.`, `_`, `-`. Must equal the manifest's `lane` and the `<lane>` segment of the manifest path. |
| `--manifest <path>` | Required. Must be `tasks/<id>/<lane>/lane.json`, repository-relative (an absolute path inside the repository is converted). It is read from the branch tip commit, never from a work tree. |
| `--branch <name>` | The branch to merge. Default `task/<lane>`. Must equal the manifest's `branch`; `main` is rejected. |
| `--dry-run` | Run every check and print the summary, but do not merge. |
| `--keep-temp` | Keep the temporary clones and test logs (`%TEMP%\deus-merge-gate-XXXXXX\clone-<n>`, `test-<n>.log`) and print their folder. |
| `--mutant=<name>` | Self-test only (§8): switches one check off. Refused with `MUTANT_NOT_ALLOWED` unless the environment has `DEUS_MERGE_GATE_SELFTEST=1`. Any mutant forces a dry run. |
| `--help`, `-h` | Print the usage and exit 0. |

Run it from any work tree of the repository (the lane's worktree or `main`'s). The gate uses the top level of the current work tree for its git commands, finds the worktree that has `main` checked out with `git worktree list --porcelain`, and merges there. In this project that is `C:\Users\snewt\OneDrive\Desktop\UF` (`git worktree list`, 2026-09-26).

Exit codes:

| Exit | Final line | When |
|---|---|---|
| 0 | `GATE: PASS (exit 0)` | Every check passed. The branch was merged, or left unmerged because of `--dry-run`. |
| 1 | `GATE: REFUSED (exit 1)` | At least one reason code (§6), including environment codes such as `REMOTE_ERROR` and `BRANCH_MISSING`. |
| 2 | `GATE: REFUSED (exit 2)` | Bad arguments (`USAGE`, `MUTANT_NOT_ALLOWED`) or a git command failed unexpectedly (`GIT_ERROR`); the remaining checks show `SKIPPED`. |

`--help` exits 0 without a summary.

## 3. The manifest (`tasks/<id>/<lane>/lane.json`)
The coordinator writes it in a `[gemini]` commit, or the PM in a `[pm]` commit. Since Owner directive 0028-AC A0 (2026-09-26, about 01:50 CT) the PM (Grok Bot, main chat) opens lanes, launches workers and merges. It opens each lane with one `[pm]` commit that adds `tasks/<id>/<lane>/BRIEF.md` and `lane.json` (for example `d9766aa2` on `task/lane-r`, `147bf517` on `task/lane-s`). Lane I's own manifest:

```json
{
  "lane": "lane-i",
  "taskId": "WG.00.12",
  "branch": "task/lane-i",
  "writer": "claude",
  "reviewer": "grok",
  "allowedPaths": [
    "tools/governance/merge_gate.js",
    "tools/governance/test_merge_gate.js",
    "tools/governance/MERGE_GATE.md",
    "tasks/WG.00.12/lane-i/**"
  ],
  "gateTests": [
    { "cmd": "node", "args": ["tools/governance/test_merge_gate.js"], "timeoutSec": 900 },
    { "cmd": "node", "args": ["tools/governance/test_check_claims.js"], "timeoutSec": 600 }
  ]
}
```

| Field | Rule (`validateManifest`; a break is `MANIFEST_INVALID`) |
|---|---|
| `lane`, `taskId`, `branch`, `writer` | Non-empty strings. `lane` must equal `--lane`, `taskId` the `<id>` path segment, `branch` the branch being merged (`MANIFEST_MISMATCH` otherwise). |
| `writer` | A known agent: `claude`, `fable`, `grok`, `codex`, `gemini`, `antigravity`. `pm` is not one: the PM may write the manifest but never writes or reviews the lane's work. |
| `reviewer` | Optional. A known agent that is not in the writer's family. When present, the review must come from this agent's family. `pm` is refused here too. |
| `push` | Optional, `true` or `false` (any other value is `MANIFEST_INVALID`). The gate does not use it. `tools/ops/launch_worker.ps1` reads it to decide whether its default prompt tells the worker to push the lane branch (tools/ops/README.md §1). |
| `allowedPaths` | Non-empty array of globs (§5 SCOPE). An absolute path, a backslash, or a `.` or `..` segment is invalid. |
| `gateTests` | Array of `{ "cmd": string, "args": [string…], "timeoutSec": number > 0 }`. `args` and `timeoutSec` are optional (timeout default 600 s). An empty array is valid JSON but refuses the gate with `TESTS_NONE`. |

Agent families (docs/CANONICAL_ROLES.md §2 lists "Claude / Fable" and "Gemini / Antigravity" as one row each): `claude` = `fable`; `gemini` = `antigravity`; `grok`; `codex`. A tag is the text in brackets at the very start of a commit subject, lower-cased (`[Grok] …` → `grok`).

Writing `gateTests` on Windows: `cmd` is spawned without a shell. `node` is replaced by the Node binary running the gate. Other commands must be real executables on `PATH`, not `.cmd`/`.bat` shims: without a shell, `spawnSync("npm")` fails with `ENOENT` and `spawnSync("npm.cmd")` with `EINVAL` (checked with Node v24.19.0, 2026-09-26). Both end as `TEST_SPAWN_ERROR`. Point `node` at the script instead.

## 4. Security model
1. **One checked commit.** At the start the gate resolves `refs/heads/<branch>` to one sha (the "checked sha"). The manifest, the diff, the review and the test clones all read that commit's git objects. Uncommitted or unpushed edits in any work tree are never judged (case `fail_uncommitted_fix_not_counted`). The merge names that sha, not the branch, and just before merging the gate re-reads both refs (`RACE_REF_MOVED` if either moved).
2. **The manifest is trusted before anything it says is used.** Every commit that ever changed `lane.json` (`git log <tip> -- <manifest>`) must be a single-parent commit tagged `[gemini]`/`[antigravity]` (the coordinator) or `[pm]` (the PM, directive 0028-AC A0). If any other commit changed it, the gate stops there: scope, review and tests show `SKIPPED (manifest not trusted)` and none of the manifest's `gateTests` run (cases `fail_writer_edits_lane_json` and `fail_claude_edits_pm_opened_lane_json` check with a marker file that the tampered test did not run). `[pm]` is trusted for this one purpose. It is not an agent family (`FAMILIES` has no `pm`), so a `[pm]` commit is never a review (§5 (b): `REVIEW_TAG_UNKNOWN`), never skipped as a stacked review when the gate looks for the reviewed commit, and `pm` is not a valid manifest `writer` or `reviewer` (§3). A merge commit is never trusted, whatever its tag, and neither are look-alike tags such as `[grok_pm]` or `[pm_bot]`. Git's default history simplification follows the parent a file's content came from. A manifest edit made on a side branch and merged in is therefore listed under the side commit that made it. On 2026-09-26 a `[claude]` side edit merged by a `[gemini]` merge commit gave `MANIFEST_TAMPERED` naming the `[claude]` commit.
3. **Tests run in a clone at the checked sha**, one fresh clone per test, with no shell, their own timeout, and real exit codes. A test cannot pass because of a file that exists only in someone's work tree.
4. **Refs are compared raw.** The branch must be the same commit locally, in the remote-tracking ref after `git fetch origin`, and in `git ls-remote origin`. `main` must match the same way and its worktree must be clean. Every value compared is printed.
5. **Fail closed, report everything.** Any refusal stops the merge. The checks that can still run do run (scope, review and tests after a trusted manifest; push and main state always), so one run lists every problem.
6. **The gate never pushes.** After a merge `origin/main` is unchanged. The integrator inspects the merge and pushes it.
7. **Every check can fail.** Each has a `--mutant` switch that turns it off, and the self-test proves each mutant lets a bad branch through (§8). Mutants need `DEUS_MERGE_GATE_SELFTEST=1` and force a dry run, so a mutant can never merge.

What this model does not cover is listed in §9.

## 5. Checks
They run in this order. The Checks table (§7) has one row per check.

### refs
- `git fetch --quiet origin`. On failure: `REMOTE_ERROR`, and the gate continues with the refs it has.
- One `git ls-remote origin refs/heads/<branch> refs/heads/main`, keeping exact ref names only. On failure: `REMOTE_ERROR`.
- `git rev-parse` of `refs/heads/<branch>`, `refs/remotes/origin/<branch>`, `refs/heads/main` and `refs/remotes/origin/main`.
- The (d) and (e) checks run next. After them: no local branch → `BRANCH_MISSING`. No local `main` → `MAIN_MISSING`. No merge base → `NO_MERGE_BASE`. Branch tip already contained in `main` → `NOTHING_TO_MERGE`. Each of these skips (a) to (c).

### (a) manifest
1. The path must match `tasks/<id>/<lane>/lane.json` with `<lane>` = `--lane` (`MANIFEST_MISMATCH`).
2. The file must exist in the tip's tree and have history (`MANIFEST_MISSING`).
3. Provenance (`trustedManifestCommit`): every commit listed by `git log <tip> -- <manifest>` must have one parent and a subject tag in the `gemini` family or exactly `pm` (tags are lower-cased, so `[PM]` counts). Each commit that fails this gets its own `MANIFEST_TAMPERED` line, and the gate stops trusting the manifest. Once any other commit has changed the manifest, no later commit can repair it: only a branch whose history lacks that commit can pass. Rewriting a pushed branch is the integrator's call.

   | Commit that changed `lane.json` | Trusted | Test case |
   |---|---|---|
   | `[gemini]` or `[antigravity]`, one parent | yes | `pass_valid_lane_dry_run_prints_summary`, `pass_gemini_updates_manifest_later` |
   | `[pm]`, one parent | yes | `pass_pm_opened_lane`, `pass_pm_opened_lane_widened_by_pm_then_gemini` |
   | `[claude]`, `[fable]` (the writer) | no | `fail_writer_edits_lane_json`, `fail_claude_edits_pm_opened_lane_json` |
   | `[grok]`, `[codex]`, `[ops]` | no | `fail_lane_json_edited_by_grok`, `fail_lane_json_edited_by_codex`, `fail_lane_json_edited_by_ops` |
   | no tag, or a look-alike such as `[grok_pm]` | no | `fail_lane_json_edited_by_untagged_commit`, `fail_lane_json_edited_by_grok_pm_tag` |
   | any merge commit, `[pm]` or `[gemini]` included | no | `fail_lane_json_changed_by_merge_commit`, `fail_lane_json_changed_by_pm_merge_commit` |
4. JSON parse and `validateManifest` (§3): `MANIFEST_INVALID`.
5. `lane`, `taskId`, `branch` agreement: `MANIFEST_MISMATCH`.

### (a) scope
`git diff --name-status -z --no-renames <merge-base main tip> <tip>`. Every path must match an `allowedPaths` glob, or the gate refuses with `SCOPE_VIOLATION` listing each one. Added, modified and deleted paths all count. A rename counts as a delete plus an add, so both names must be allowed. The diff includes the coordinator's own commits on the branch (brief, manifest, launch prompts), so the manifest normally allows `tasks/<id>/<lane>/**`.

Glob syntax (`globToRegExp`), matched against the whole path, case-sensitive:

| Pattern | Matches |
|---|---|
| `*` | any characters inside one path segment |
| `?` | one character inside one path segment |
| `**` | any characters across segments (`tasks/X/**` matches `tasks/X/a/b.md` but not `tasks/X` itself) |
| `**/` | zero or more whole directories (`docs/**/x.md` matches `docs/x.md` and `docs/a/b/x.md`) |
| trailing `/` | same as `/**` |
| anything else | itself, literally (including `[`, `{`, `.`) |

`tasks/WG.00.12/lane-i/**` does not match the sibling folder `tasks/WG.00.12/lane-ij/…` (case `fail_sibling_lane_dir_prefix`).

### (b) review
The gate walks the first-parent chain `git rev-list --first-parent <tip> ^main`, newest first.

1. **The tip must be the review commit.** The tip is taken as the review when it has one parent and touches a file matching `tasks/<taskId>/<lane>/review_*.md`. If it isn't, the gate looks further down the chain. A lower commit that touches a review file gives `REVIEW_NOT_LAST`, listing every commit after it. Any commit after the review counts, including a `[gemini]` launch-prompt commit (case `fail_gemini_commit_after_review`). If the tip is a merge commit that touches a review file, the code is `REVIEW_COMMIT_FILES`. If no commit touches a review file, the code is `REVIEW_MISSING`. Only the tip review is judged: an earlier FAIL review followed by a fix and a new PASS review passes (case `pass_failed_review_then_fix_then_pass_review`).
2. **Reviewer identity.** The review's subject tag must be a known agent (`REVIEW_TAG_UNKNOWN`; for a `[pm]` review the detail adds "[pm] may write lane.json but never reviews", case `fail_pm_review_commit_is_not_a_review`) outside the writer's family (`REVIEW_SAME_FAMILY`: `[claude]` and `[fable]` never review each other). When the manifest names a `reviewer`, the tag must be in that reviewer's family (`REVIEWER_NOT_DESIGNATED`).
3. **The reviewed commit ("target")** is the first commit below the review on the first-parent chain that is not itself a review. Here a review means one parent, only non-deleted review files, and a tag of a known family other than the writer's, so stacked reviews are skipped. The target can be any agent's commit. For example, a `[gemini]` launch-prompt commit made after the writer's last commit and before the review is the target (case `pass_review_names_gemini_commit_after_writer`). With no commit below the review: `REVIEW_NO_TARGET`.
4. **Files.** The review commit must add or modify exactly one review file and touch nothing else (`REVIEW_COMMIT_FILES`). The file must be named `tasks/<taskId>/<lane>/review_<tag>_<first 8 hex of target>.md`, where `<tag>` is the review's subject tag (`REVIEW_FILE_NAME`).
5. **Hash.** The file must contain the target's full 40-character hash, as a whole word, in any case. Other hashes may appear too; 64-hex tokens and abbreviations do not count. No full hash at all gives `REVIEW_HASH_MISSING`. Full hashes that don't include the target give `REVIEW_WRONG_COMMIT`.
6. **Verdict.** A verdict line is any line that, after optional Markdown decoration (spaces, `>`, `#`, `*`, `_`, `` ` ``, `|`, `-`), starts with `verdict` in any case followed by `:` or `=`. There must be at least one (`REVIEW_VERDICT_MISSING`). Every verdict line must read exactly `VERDICT:` then `PASS` or `CLEAN PASS` (upper case), with only decoration or a final `.` after it (`REVIEW_VERDICT_NOT_PASS`).

   | Accepted (unit test) | Refused (unit test) |
   |---|---|
   | `VERDICT: PASS`, `VERDICT: CLEAN PASS`, `**VERDICT: PASS**`, `**VERDICT:** CLEAN PASS`, `## VERDICT: PASS`, `- VERDICT: PASS` | `VERDICT: FAIL`, `VERDICT: PASS WITH FINDINGS`, `VERDICT: pass`, `Verdict: PASS`, `VERDICT:`, `VERDICT: PASSED`, `VERDICT: PASS` plus a second line `VERDICT: FAIL`, no verdict line |

A review commit that passes, as the self-test builds it (subject shortened):

```
subject:  [grok] review of 839511e1
file:     tasks/<id>/<lane>/review_grok_839511e1.md   (the only file in the commit)
content:  # TEST_ review

          Reviewed commit: 839511e1831cb1c1b2d99c7207d25a6025b7fed6

          VERDICT: PASS
```

Reviewers: write exactly one verdict line. A findings line such as `- Verdict: FAIL (F1, now fixed)` is a verdict line and refuses the gate.

### (c) tests
1. `gateTests` empty: `TESTS_NONE`.
2. **Quarantine.** `tools/ops/gate_tests.json` is read from local `main` and from the tip, so a lane cannot lift a quarantine by editing its own copy. Its `quarantine` key is an array of strings or `{ "path": … }` objects. A missing file or a missing key means no quarantine. Invalid JSON or any other shape gives `QUARANTINE_LIST_INVALID`. A test is quarantined when a quarantine path equals its `cmd` or one of its `args` after normalising both (backslashes to `/`, leading `./` removed, lower case). A quarantined test is not run and refuses the gate (`TEST_QUARANTINED`). This repository has no `tools/ops/gate_tests.json` at `7d333ae8`.
3. **Clone.** For each test, `git clone --shared --no-checkout <git common dir> %TEMP%\deus-merge-gate-XXXXXX\clone-<n>`, then `git checkout --detach <checked sha>`. The clone's `HEAD` must equal the checked sha (`CLONE_FAILED`).
4. **Run.** `spawnSync(cmd, args, { cwd: clone, shell: false, timeout: timeoutSec × 1000, killSignal: SIGKILL })`, in manifest order. stdin is `ignore` (empty). stdout and stderr go to `test-<n>.log`. The environment is the gate's own, minus `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE` and the other repository-locating `GIT_*` variables, plus `GIT_TERMINAL_PROMPT=0`, `GCM_INTERACTIVE=never` and `GIT_OPTIONAL_LOCKS=0`.
5. **Result.** Past the timeout the test is killed (`TEST_TIMEOUT`). If it cannot start: `TEST_SPAWN_ERROR`. Any exit code other than 0, including death by a signal: `TEST_FAILED`. For FAIL and TIMEOUT the summary prints the last 20 lines of the log.

Tests run whenever the manifest is trusted, even if scope, review, push or main have already refused.

### (d) pushed
Using the values from refs:
- `origin` has no `refs/heads/<branch>`: `BRANCH_NOT_ON_REMOTE`.
- `refs/remotes/origin/<branch>` ≠ the `ls-remote` hash: `TRACKING_REF_STALE`. Usually `remote.origin.fetch` does not map the branch.
- Local tip ≠ `ls-remote` hash: `BRANCH_UNPUSHED` (the remote commit is an ancestor of the local one), `BRANCH_BEHIND_REMOTE` (the local commit is an ancestor of the remote one), or `BRANCH_DIVERGED` (neither, or the remote commit isn't present locally).

### (e) main
- `main`, `origin/main` and the `ls-remote` hash must be one commit: `MAIN_NOT_SYNCED`.
- `main` must be checked out in a worktree that exists: `MAIN_NOT_CHECKED_OUT`. A detached `HEAD`, a worktree git marks `prunable` (its folder is gone), or `git status` failing there all end here.
- That worktree must have no staged or unstaged changes to tracked files (`git status --porcelain=v1 --untracked-files=no`) and no `MERGE_HEAD`, `CHERRY_PICK_HEAD` or `REVERT_HEAD`: `MAIN_DIRTY`. Untracked files are not checked.

### (f) execution
Runs only when nothing refused and the run is not a dry run:
1. Re-read `refs/heads/<branch>` and `refs/heads/main`. A change gives `RACE_REF_MOVED`.
2. Re-check `main`'s worktree. A change gives `MAIN_DIRTY`.
3. In `main`'s worktree: `git merge --no-ff --no-edit -m "Merge <branch> at <sha> (<taskId> <lane>) via merge_gate" <sha>`.
4. If git fails (a conflict, or an untracked file in the way), the gate runs `git merge --abort` and refuses with `MERGE_FAILED`, stating whether the abort worked and whether `main` moved.
5. Afterwards the new `main` must have exactly the parents [old `main`, checked sha] (`MERGE_FAILED` otherwise).
6. No push. The Execution row reads `MERGED <sha> (parents <old main> <tip>; not pushed)`.

### (g) summary
See §7.

## 6. Reason codes
Each refusal prints one line `REFUSED <CODE>: <detail>` before the final `GATE:` line. The detail names the commits, paths and hashes involved. "Test case" names the `test_merge_gate.js` case that produces the code. "none" means the code path was read but no case runs it.

| Code | Row | Exit | Meaning | First diagnostic step (§8) | Test case |
|---|---|---|---|---|---|
| `USAGE` | refs | 2 | Missing or unknown argument, bad `--lane`/`--branch`, unknown mutant | Read the usage text printed above the summary | `fail_usage_without_manifest`, `fail_unknown_mutant` |
| `MUTANT_NOT_ALLOWED` | refs | 2 | `--mutant` without `DEUS_MERGE_GATE_SELFTEST=1` | Remove `--mutant`; it is for the self-test only | `fail_mutant_flag_without_selftest_env` |
| `GIT_ERROR` | refs | 2 | Not inside a git work tree, or a git command failed unexpectedly | Run the git command named in the detail by hand | none |
| `REMOTE_ERROR` | refs | 1 | `git fetch origin` or `git ls-remote origin` failed | `git fetch origin`; check network and credentials | none |
| `BRANCH_MISSING` | refs | 1 | No local `refs/heads/<branch>` | `git branch --list <branch>`; fetch and create it from `origin/<branch>` | `fail_branch_missing` |
| `MAIN_MISSING` | refs | 1 | No local `refs/heads/main` | `git branch --list main` | none |
| `NO_MERGE_BASE` | refs | 1 | Branch and `main` share no history | `git merge-base main <branch>` | none |
| `NOTHING_TO_MERGE` | refs | 1 | Branch tip already in `main` | `git branch --contains <tip>`; the lane is already merged | `fail_nothing_to_merge` |
| `RACE_REF_MOVED` | refs | 1 | Branch or `main` moved while the gate ran | Re-run the gate | none |
| `MANIFEST_MISMATCH` | (a) manifest | 1 | Manifest path, `lane`, `taskId` or `branch` disagree with the arguments | Compare `--lane`/`--branch` with the manifest | `fail_manifest_branch_mismatch`, `fail_manifest_path_of_other_lane` |
| `MANIFEST_MISSING` | (a) manifest | 1 | No `lane.json` at the tip | `git ls-tree <tip> tasks/<id>/<lane>/` | `fail_manifest_missing` |
| `MANIFEST_TAMPERED` | (a) manifest | 1 | A commit other than a single-parent `[gemini]` or `[pm]` commit changed `lane.json` | `git log --format="%H %P %s" <tip> -- <manifest>` | `fail_writer_edits_lane_json`, `fail_lane_json_edited_by_grok`, `fail_lane_json_changed_by_merge_commit`, `fail_claude_edits_pm_opened_lane_json`, `fail_lane_json_edited_by_ops`, `fail_lane_json_edited_by_codex`, `fail_lane_json_edited_by_untagged_commit`, `fail_lane_json_edited_by_grok_pm_tag`, `fail_lane_json_changed_by_pm_merge_commit` |
| `MANIFEST_INVALID` | (a) manifest | 1 | `lane.json` is not JSON or breaks a §3 rule | `git show <tip>:<manifest>` | `fail_manifest_invalid_json`; rules: `unit_manifest_validation` |
| `SCOPE_VIOLATION` | (a) scope | 1 | A diff path matches no `allowedPaths` glob | The Diff table's `NO` rows | `fail_out_of_scope_file`, `fail_out_of_scope_deletion`, `fail_sibling_lane_dir_prefix` |
| `REVIEW_MISSING` | (b) review | 1 | No commit on the branch touches `tasks/<id>/<lane>/review_*.md` | `git log --first-parent --stat main..<branch>` | `fail_review_missing` |
| `REVIEW_NOT_LAST` | (b) review | 1 | Commits follow the review commit | The detail lists them; a new review of the new tip is needed | `fail_writer_commit_after_review`, `fail_gemini_commit_after_review`, `fail_pm_commit_after_review` |
| `REVIEW_COMMIT_FILES` | (b) review | 1 | The review commit touches other files, several review files, deletes one, or is a merge | `git show --stat <review commit>` | `fail_review_commit_touches_code` (merge-tip variant: none) |
| `REVIEW_TAG_UNKNOWN` | (b) review | 1 | Review subject has no known agent tag (`[pm]` included) | `git show -s --format=%s <tip>` | `fail_review_tag_unknown`, `fail_pm_review_commit_is_not_a_review` |
| `REVIEW_SAME_FAMILY` | (b) review | 1 | Reviewer in the writer's family (`claude` = `fable`) | Compare the review tag with the manifest `writer` | `fail_same_tag_review_claude_reviews_claude`, `fail_same_tag_review_with_designated_reviewer`, `fail_fable_reviews_claude`, `fail_claude_reviews_fable` |
| `REVIEWER_NOT_DESIGNATED` | (b) review | 1 | Review tag not in the manifest `reviewer`'s family | Compare with the manifest `reviewer` | `fail_reviewer_not_designated`, `fail_same_tag_review_with_designated_reviewer` |
| `REVIEW_NO_TARGET` | (b) review | 1 | Nothing but reviews on the branch | `git log --first-parent main..<branch>` | none |
| `REVIEW_FILE_NAME` | (b) review | 1 | Review file not `review_<tag>_<target sha8>.md` | Review table: `reviewer file` vs `expected file` | `fail_review_file_misnamed`, `fail_review_names_other_commit` |
| `REVIEW_WRONG_COMMIT` | (b) review | 1 | The file's full hashes do not include the target | Review table: `full hashes in file` vs `last non-review commit` | `fail_review_names_other_commit`, `fail_review_hash_wrong_content` |
| `REVIEW_HASH_MISSING` | (b) review | 1 | No full 40-character hash in the file | `git show <tip>:<review file>` | `fail_review_hash_abbreviated` |
| `REVIEW_VERDICT_MISSING` | (b) review | 1 | No verdict line | Add `VERDICT: PASS` (a new review commit) | `fail_verdict_missing` |
| `REVIEW_VERDICT_NOT_PASS` | (b) review | 1 | A verdict line is not exactly PASS / CLEAN PASS | The detail quotes the offending lines | `fail_verdict_fail`, `fail_verdict_incomplete`, `fail_verdict_empty`, `fail_verdict_conflicting_lines` |
| `TESTS_NONE` | (c) tests | 1 | `gateTests` is empty | The coordinator adds gate tests to the manifest | `fail_no_gate_tests` |
| `QUARANTINE_LIST_INVALID` | (c) tests | 1 | `tools/ops/gate_tests.json` on `main` or the tip is unreadable | `git show main:tools/ops/gate_tests.json` (and `<tip>:`) | `fail_quarantine_list_invalid_on_branch` |
| `TEST_QUARANTINED` | (c) tests | 1 | A gate test uses a quarantined path; it was not run | The detail names the entry and whether it came from `main` or the tip | `fail_quarantined_test` |
| `CLONE_FAILED` | (c) tests | 1 | The temporary clone or its checkout failed | `--keep-temp`, then inspect the clone | none |
| `TEST_TIMEOUT` | (c) tests | 1 | A test ran past its `timeoutSec` and was killed | The output tail; re-run by hand in a kept clone | `fail_test_timeout` |
| `TEST_SPAWN_ERROR` | (c) tests | 1 | The command could not start (`ENOENT`, `EINVAL` for `.cmd` shims) | §3 "Writing gateTests on Windows" | `fail_test_spawn_error` |
| `TEST_FAILED` | (c) tests | 1 | A test exited non-zero | The output tail; re-run by hand in a kept clone | `fail_test_exits_nonzero`, `fail_uncommitted_fix_not_counted` |
| `BRANCH_NOT_ON_REMOTE` | (d) pushed | 1 | `origin` has no such branch | `git ls-remote origin refs/heads/<branch>` | `fail_branch_never_pushed`, `fail_branch_missing` |
| `TRACKING_REF_STALE` | (d) pushed | 1 | `origin/<branch>` ≠ `ls-remote` after the fetch | `git config --get-all remote.origin.fetch` | `fail_tracking_ref_stale` |
| `BRANCH_UNPUSHED` | (d) pushed | 1 | Local branch ahead of `origin` | `git log --oneline origin/<branch>..<branch>` | `fail_branch_unpushed_local_ahead` |
| `BRANCH_BEHIND_REMOTE` | (d) pushed | 1 | `origin` has commits the local branch lacks | `git log --oneline <branch>..origin/<branch>` | `fail_local_behind_remote` |
| `BRANCH_DIVERGED` | (d) pushed | 1 | Local and remote have diverged | Both `git log` ranges above | `fail_branch_diverged` |
| `MAIN_NOT_SYNCED` | (e) main | 1 | `main`, `origin/main`, `ls-remote` disagree | `git rev-parse main origin/main`, `git ls-remote origin refs/heads/main` | `fail_main_not_synced` |
| `MAIN_NOT_CHECKED_OUT` | (e) main | 1 | No worktree has `main` checked out (or it is missing) | `git worktree list --porcelain` | `fail_main_not_checked_out` |
| `MAIN_DIRTY` | (e) main | 1 | Tracked changes or a merge / cherry-pick / revert in progress in `main`'s worktree | `git -C <main worktree> status` | `fail_main_dirty`, `fail_main_merge_in_progress` |
| `MERGE_FAILED` | (f) execution | 1 | `git merge --no-ff` failed (aborted) or produced unexpected parents | The detail: abort result and whether `main` moved | `fail_merge_conflict_is_aborted` (unexpected-parents variant: none) |

## 7. Summary output
Sections, in order: a header table (lane, branch, manifest, mode, repository, and `mutants` when any are active); **Refs** with the command and raw hash of each value; **Manifest** with the path, the blob at the tip, every commit that changed it, and writer / reviewer; **Diff**, one row per path with status and `In allowedPaths`; **Review**; **Tests**, one row per test with command, timeout, exit, duration and result, then the output tail of each failed or timed-out test; **Checks** with each row's `PASS`, `REFUSED` or `SKIPPED (<why>)` plus its reason codes; the `REFUSED` lines; and the final `GATE:` line. Before the summary, one `.. test n/N: <command> (timeout T s) in <clone>` progress line is printed per test. Sections for stages that did not run are left out.

A passing dry run on the self-test fixture (2026-09-26, exit 0; temp paths shortened):

```
# DEUS merge gate summary (tools/governance/merge_gate.js)
| Item | Value |
|---|---|
| lane | lane-ok |
| branch | task/lane-ok |
| manifest | tasks/TEST.01/lane-ok/lane.json |
| mode | dry-run |
| repository | …\deus-merge-gate-test-7e93Li\work |

## Refs (raw values after git fetch origin)
| Ref | Command | Hash |
|---|---|---|
| local branch | git rev-parse refs/heads/task/lane-ok | e1cb97c24741ad5519f4d0a7c21a087e1566dd0e |
| tracking ref | git rev-parse refs/remotes/origin/task/lane-ok | e1cb97c24741ad5519f4d0a7c21a087e1566dd0e |
| remote branch | git ls-remote origin refs/heads/task/lane-ok | e1cb97c24741ad5519f4d0a7c21a087e1566dd0e |
| local main | git rev-parse refs/heads/main | 602077af7cce1176fcd1e436f25626b589bb681b |
| tracking main | git rev-parse refs/remotes/origin/main | 602077af7cce1176fcd1e436f25626b589bb681b |
| remote main | git ls-remote origin refs/heads/main | 602077af7cce1176fcd1e436f25626b589bb681b |
| main worktree | git worktree list --porcelain | …/deus-merge-gate-test-7e93Li/work |
| merge-base | git merge-base 602077af e1cb97c2 | 602077af7cce1176fcd1e436f25626b589bb681b |
| checked sha | (local branch tip; every check reads this commit) | e1cb97c24741ad5519f4d0a7c21a087e1566dd0e |

## Manifest
| Item | Value |
|---|---|
| path | tasks/TEST.01/lane-ok/lane.json |
| blob at tip | f674d8a700180e4681ff566fe651c969ff3ff6d1 |
| changed by | f723713300f87030e48cc9fcc50a85a4bcecaf57 [gemini] TEST_ brief + manifest |
| writer / reviewer | claude / grok |

## Diff (git diff --name-status 602077af e1cb97c2): 5 file(s)
| # | Status | Path | In allowedPaths |
|---|---|---|---|
| 1 | A | src/feature.js | yes |
| 2 | A | tasks/TEST.01/lane-ok/BRIEF.md | yes |
| 3 | A | tasks/TEST.01/lane-ok/lane.json | yes |
| 4 | A | tasks/TEST.01/lane-ok/review_grok_839511e1.md | yes |
| 5 | A | tests/test_feature.js | yes |

## Review
| Item | Value |
|---|---|
| review commit | e1cb97c24741ad5519f4d0a7c21a087e1566dd0e [grok] TEST_ review of 839511e1 |
| reviewer file | tasks/TEST.01/lane-ok/review_grok_839511e1.md |
| expected file | tasks/TEST.01/lane-ok/review_grok_839511e1.md |
| last non-review commit | 839511e1831cb1c1b2d99c7207d25a6025b7fed6 [claude] TEST_ feature |
| full hashes in file | 839511e1831cb1c1b2d99c7207d25a6025b7fed6 |
| verdict | VERDICT: PASS |

## Tests (spawnSync, no shell; each in a fresh clone at the checked sha)
| # | Command | Timeout | Exit | Duration | Result |
|---|---|---|---|---|---|
| 1 | node tests/test_feature.js | 60 s | 0 | 0.04 s | PASS |

## Checks
| Check | Result | Reason codes |
|---|---|---|
| refs | PASS | - |
| (a) manifest | PASS | - |
| (a) scope | PASS | - |
| (b) review | PASS | - |
| (c) tests | PASS | - |
| (d) pushed | PASS | - |
| (e) main | PASS | - |
| (f) execution | SKIPPED (dry-run) | - |

GATE: PASS (exit 0)
```

The same lane after an unpushed `[claude]` commit that also broke the test (exit 1; the tables above the Tests section are the same as before apart from the new local tip `923d95cc…`):

```
## Tests (spawnSync, no shell; each in a fresh clone at the checked sha)
| # | Command | Timeout | Exit | Duration | Result |
|---|---|---|---|---|---|
| 1 | node tests/test_feature.js | 60 s | 1 | 0.05 s | FAIL |

### Test 1 output, last 20 lines
FAIL TEST_ late change

## Checks
| Check | Result | Reason codes |
|---|---|---|
| refs | PASS | - |
| (a) manifest | PASS | - |
| (a) scope | PASS | - |
| (b) review | REFUSED | REVIEW_NOT_LAST |
| (c) tests | REFUSED | TEST_FAILED |
| (d) pushed | REFUSED | BRANCH_UNPUSHED |
| (e) main | PASS | - |
| (f) execution | NOT RUN (refused) | - |

REFUSED BRANCH_UNPUSHED: local task/lane-ok 923d95cc6251f4a0457461462efc1b9827dc106d is ahead of origin e1cb97c24741ad5519f4d0a7c21a087e1566dd0e; push it
REFUSED REVIEW_NOT_LAST: review commit e1cb97c24741ad5519f4d0a7c21a087e1566dd0e "[grok] TEST_ review of 839511e1" is followed by 1 commit(s): 923d95cc "[claude] TEST_ late change after review"
REFUSED TEST_FAILED: test 1 (node tests/test_feature.js) exited 1
GATE: REFUSED (exit 1)
```

`SKIPPED` reasons: `not run` (argument error), `no branch`, `no main`, `no merge-base`, `nothing to merge`, `manifest not trusted`, `gate stopped by the error`. Execution row values: `NOT RUN (refused)`, `SKIPPED (dry-run)`, `SKIPPED (dry-run (forced: mutants active))`, `NOT RUN (error)`, `MERGED <sha> (parents … ; not pushed)`, `FAILED (aborted)`, `UNEXPECTED RESULT <sha>`.

## 8. Diagnostics
Start from the `REFUSED` lines. Each names its check, and the matching table holds the raw values. Then reproduce the value by hand with the command in the Refs table or in §6. Use `<tip>` for the `checked sha` row.

- **Refs and push state.** `git fetch origin`, then `git rev-parse <branch> origin/<branch>` and `git ls-remote origin refs/heads/<branch>`. The three must print one hash. `git log --oneline origin/<branch>..<branch>` lists unpushed commits and `<branch>..origin/<branch>` lists missing ones. Under the standing rules, only the integrator pushes lane branches.
- **Manifest.** `git log --format="%H %P %s" <tip> -- tasks/<id>/<lane>/lane.json`. Every line must be one parent plus a `[gemini]` or `[pm]` subject. `git show <tip>:tasks/<id>/<lane>/lane.json` shows what the gate parsed.
- **Scope.** `git diff --name-status --no-renames $(git merge-base main <branch>) <branch>`, compared with `allowedPaths`. The fix is a new commit that reverts the stray path, or a `[gemini]` commit that widens `allowedPaths`. Either one lands after the review, so a new review is needed.
- **Review.** `git log --first-parent --format="%H %P %s" main..<branch>` shows the chain as the gate walks it: the first line must be the review, and the first non-review line below it is the target. `git show --stat <tip>` must list one file, `review_<tag>_<target sha8>.md`. `git show <tip>:<that file>` must hold the target's full hash and one `VERDICT: PASS` / `VERDICT: CLEAN PASS` line. Coordinator commits (launch prompts, manifest updates) made after the review refuse the gate, so a lane that must pass the gate gets no coordinator commits after its review.
- **Tests.** Re-run with `--dry-run --keep-temp`. The kept folder has `clone-<n>` (the checked sha, detached) and `test-<n>.log` (the full output). To reproduce, `cd` into the clone and run the command from the Tests row. A test that passes in your work tree but fails here usually depends on an uncommitted, untracked or ignored file, or on a path outside the repository.
- **Main.** `git worktree list --porcelain` shows which worktree holds `main`. In that worktree, `git status` and `git rev-parse main origin/main`. Changes there belong to whoever made them. Settle them with that agent or the Owner rather than discarding them.
- **Merge failure.** The detail gives git's last lines, whether `git merge --abort` worked, and whether `main` moved. A conflict means `main` moved under the lane: the lane has to be brought up to date and reviewed again.
- **Exit 2.** For `USAGE`, the usage text is printed above the summary. `GIT_ERROR` names the git command that failed. Run it by hand from the same folder.

## 9. Known limits
- **Agent identity is the commit subject tag.** Anyone who can commit can write `[gemini]`, `[pm]` or `[grok]`. The gate does not check author, committer or signatures. It enforces the protocol but does not authenticate agents.
- **The gate that judges a lane is the copy the integrator runs** (normally `main`'s). A lane that changes `merge_gate.js` itself, such as WG.00.12b, is judged by the old rules until it is merged: the pre-G1 gate refuses every `[pm]`-opened lane with `MANIFEST_TAMPERED`.
- **Gate tests are lane code.** Manifest provenance ensures the coordinator chose the commands, but the scripts they run come from the branch. They run with the privileges of whoever runs the gate. The clone isolates the tree a test sees, not the machine: a test can write anywhere that user can. The pre-merge re-check catches a moved ref or tracked changes in `main`'s worktree, not every side effect.
- **Quarantine matching is exact token equality** after normalisation. A test that reaches a quarantined file indirectly is not caught. That includes a wrapper script, `node -e "require(…)"`, or another spelling such as `tests/../tests/flaky.js`.
- **Untracked files in `main`'s worktree are not checked.** If the merge would overwrite one, git refuses, the gate aborts, and the refusal is `MERGE_FAILED`.
- **`git fetch origin` runs even with `--dry-run`.** It updates remote-tracking refs, not branches or work trees.
- **The review is judged only by its hash and verdict lines**, not by what it says.
- **Codes no self-test case produces:** `GIT_ERROR`, `REMOTE_ERROR`, `MAIN_MISSING`, `NO_MERGE_BASE`, `RACE_REF_MOVED`, `REVIEW_NO_TARGET`, `CLONE_FAILED`, the merge-tip variant of `REVIEW_COMMIT_FILES`, and the unexpected-parents variant of `MERGE_FAILED`. Their code paths have been read, not run.
- **Summary display gaps.**
  - With `REVIEW_NOT_LAST`, every Review row reads `(none)`; the `REFUSED` line names the review commit and the commits after it. Observed 2026-09-26 (§7).
  - When `git ls-remote` fails (`REMOTE_ERROR`), the (d) pushed row, and the `main` sync part of (e), read `PASS` although they were not evaluated. The gate still refuses. This comes from reading `checkPushed` and `checkMain`, not from a run.

## 10. Self-tests (`tools/governance/test_merge_gate.js`)
```
node tools/governance/test_merge_gate.js [--keep] [--only=<substring>]
```
`--keep` leaves the temporary repository. `--only` runs the unit checks plus the cases whose name contains the substring, with no mutants. Output: one `PASS <name>` or `FAIL <name>: <detail>` per check, then `RESULT: <n> passed, <m> failed`. Exit 1 on any failure.

**Fixture.** Under `%TEMP%\deus-merge-gate-test-XXXXXX`: a bare `origin.git`, and a `work` clone with `main` checked out and pushed. The base commit holds `README.md`, `src/app.js` and `tools/ops/gate_tests.json`, which quarantines `tests/flaky.js`. Each case builds its own branch `task/lane-<name>` with plumbing and a private index, so `main` stays checked out and clean. The branch holds a `[gemini]` manifest commit, writer commits and a review commit. The case pushes it or not, then runs the gate from `work`. Refusal cases run without `--dry-run`, so a gate that wrongly passed would really merge. Every case checks that `main` did not move unless a merge was expected. A case passes only if the gate's exit code and its exact set of reason codes match, and the final `GATE:` line agrees with the exit code.

**Checks (105; 89 before WG.00.12b).** 8 unit checks (globs, verdict parsing, tags and families, the manifest trust table, full-hash extraction, quarantine path normalisation, manifest validation including `push` and `pm`, and every mutant having a kill case), 70 gate cases, 24 `--mutant` kills, and 3 source mutants.

The brief's twelve required refusals map to these cases:

| # | Brief item | Cases |
|---|---|---|
| 1 | Same-agent-tag review | `fail_same_tag_review_claude_reviews_claude`, `fail_same_tag_review_with_designated_reviewer` |
| 2 | `claude` vs `fable` | `fail_fable_reviews_claude`, `fail_claude_reviews_fable` |
| 3 | Review names another hash | `fail_review_names_other_commit`, `fail_review_hash_wrong_content`, `fail_review_hash_abbreviated` |
| 4 | Writer commits after the review | `fail_writer_commit_after_review`, `fail_gemini_commit_after_review` |
| 5 | Missing or non-PASS verdict | `fail_verdict_missing`, `fail_verdict_fail`, `fail_verdict_incomplete`, `fail_verdict_empty`, `fail_verdict_conflicting_lines` |
| 6 | Failing test command | `fail_test_exits_nonzero`, `fail_uncommitted_fix_not_counted` |
| 7 | Test past its `timeoutSec` | `fail_test_timeout`: a 15 s test with `timeoutSec: 1` must end in under 12 s with a TIMEOUT row |
| 8 | Out-of-scope file | `fail_out_of_scope_file`, `fail_out_of_scope_deletion`, `fail_sibling_lane_dir_prefix` |
| 9 | Writer edits `lane.json` | `fail_writer_edits_lane_json` (marker file proves the tampered test never ran), `fail_lane_json_edited_by_grok`, `fail_lane_json_changed_by_merge_commit` |
| 10 | Unpushed branch (ahead or divergent) | `fail_branch_unpushed_local_ahead`, `fail_branch_diverged`, `fail_branch_never_pushed` |
| 11 | Local ≠ remote | `fail_local_behind_remote`, `fail_tracking_ref_stale` |
| 12 | Valid passing case | `pass_valid_lane_dry_run_prints_summary` (the summary must contain each raw hash, the diff rows, the review rows, and a test row with exit 0 and duration); `pass_real_merge_no_ff_never_pushes` (a real merge: new `main` has parents [old `main`, tip], `origin/main` unchanged, work tree clean) |

The other cases: six more passing shapes (bold `CLEAN PASS`, FAIL review then fix then PASS review, `[gemini]` commit between writer and review, no designated reviewer, a `[gemini]` scope update, a run from the lane's own worktree). Also: remaining review, test, manifest and main refusals, the usage and mutant guards, `fail_merge_conflict_is_aborted` (no `MERGE_HEAD` left, work tree clean), and `fail_nothing_to_merge`.

WG.00.12b added ten cases for PM-opened lanes: the two passing `[pm]` shapes and the seven refused manifest changes in the §5 (a) table (each also checks that scope, review and tests are `SKIPPED (manifest not trusted)`, that no gate test ran, and that the marker file of the tampered manifest's test is absent), plus `fail_pm_review_commit_is_not_a_review` and `fail_pm_commit_after_review`.

**Mutants.** Each `--mutant` switches one check off or, for the `*_untrusted` pair, makes a rule stricter. It runs, with `DEUS_MERGE_GATE_SELFTEST=1`, on the case listed. On a refusal case it must remove at least one of that case's reason codes; on a passing case it must make the gate refuse. The harness also confirms the `mutants` header row, so a mutant that was never applied can't pass:

| Mutant | Switches off | Kill case |
|---|---|---|
| `manifest_provenance_off` | lane.json provenance | `fail_writer_edits_lane_json` |
| `manifest_trust_any_tag` | the tag rule (any single-parent commit, tagged or not) | `fail_lane_json_edited_by_ops` |
| `manifest_trust_pm_merge` | the merge-commit rule for `[pm]` | `fail_lane_json_changed_by_pm_merge_commit` |
| `manifest_gemini_untrusted` | trust in `[gemini]` (stricter) | `pass_valid_lane_dry_run_prints_summary` |
| `manifest_pm_untrusted` | trust in `[pm]` (stricter) | `pass_pm_opened_lane` |
| `pm_review_family` | "`[pm]` is no agent family" | `fail_pm_review_commit_is_not_a_review` |
| `scope_off` | allowedPaths | `fail_out_of_scope_file` |
| `review_required_off` | review presence | `fail_review_missing` |
| `review_order_off` | review must be the tip | `fail_writer_commit_after_review` |
| `review_family_off` | writer-family refusal | `fail_same_tag_review_claude_reviews_claude` |
| `fable_alias_off` | fable = claude | `fail_fable_reviews_claude` |
| `reviewer_designation_off` | manifest `reviewer` | `fail_reviewer_not_designated` |
| `review_files_off` | review commit touches one file | `fail_review_commit_touches_code` |
| `review_name_off` | review file name | `fail_review_file_misnamed` |
| `review_hash_off` | reviewed-hash comparison | `fail_review_hash_wrong_content` |
| `verdict_off` | verdict | `fail_verdict_fail` |
| `test_exit_off` | non-zero exit | `fail_test_exits_nonzero` |
| `test_timeout_off` | per-test timeout | `fail_test_timeout` |
| `quarantine_off` | quarantine list | `fail_quarantined_test` |
| `fresh_clone_off` | clone at the tip (tests run in the current work tree) | `fail_uncommitted_fix_not_counted` |
| `push_off` | local vs remote branch | `fail_branch_unpushed_local_ahead` |
| `tracking_off` | `origin/<branch>` vs `ls-remote` | `fail_tracking_ref_stale` |
| `main_clean_off` | main worktree clean | `fail_main_dirty` |
| `main_sync_off` | main == origin/main | `fail_main_not_synced` |

**Source mutants.** The execution step has no flag. Instead the harness writes three edited copies of `merge_gate.js`: `dry_run_merges` (merges despite `--dry-run`), `fast_forward_merge` (`--ff` for `--no-ff`) and `push_after_merge` (pushes `main`). Each copy runs on a fresh lane that the real gate passes (control run), and each must fail. The text each copy replaces must occur exactly once in `merge_gate.js`, or the check fails.

**Maintaining the gate.**
- A new check needs a `MUTANTS` entry in `merge_gate.js` and a `KILLS` entry naming a case in `test_merge_gate.js`. `unit_every_mutant_has_a_kill_case` fails when the two lists differ.
- Editing the lines the source mutants target (`else if (dryRun) R.execution`, the `["merge", "--no-ff", "--no-edit"` argument list, ``R.execution = `MERGED ${head}``) requires updating `SOURCE_MUTANTS`.

## 11. Status (2026-09-26)
At `7d333ae8` (whose `merge_gate.js` and `test_merge_gate.js` are unchanged since `7e9124f3`), `node tools/governance/test_merge_gate.js` printed 89 `PASS` lines, `RESULT: 89 passed, 0 failed`, exit 0, in 159 s wall-clock (`date +%s` before and after the run). All 19 mutant and 3 source-mutant checks printed `PASS …_killed`: each switched-off check let its kill case through, so each check has been seen to fail. The two sample runs in §7 and the side-branch manifest check in §4 were made on a fixture kept with `--keep`, then deleted.

Not yet done: the gate has not been run on a real lane branch in this repository. Lane I's own branch has no review commit yet.

WG.00.12b (Lane G1, 2026-09-26): the suite counts, the mutant results and a dry run of the changed gate against the real Lane R and Lane K manifest histories are recorded, with commit hashes, in `tasks/WG.00.12b/lane-g1/REPORT.md`.
