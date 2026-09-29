# Lessons and mistakes

Durable log of process mistakes and the rule each one produced. Task OPS.40.06. This file records. It does not close a defect, change a WBS status, mint a WBS id, or answer an Owner question.

**NO ART GENERATION (DEC-007).** Nothing in this log asks for art.

An entry cites a commit object (`git cat-file -e <sha>` exits 0) or a path that is in the commit named beside it. A 40-hex string that does not resolve is quoted as text that was published. It is not cited as a commit. Line numbers are from the tree of `a6be423d` (origin/main when this log was written) unless a commit is named.

## Index

| ID | Date (CT) | Mistake | Record |
|---|---|---|---|
| LM-001 | 2026-09-25 23:05 | A board published a full `task/lane-b` hash that is not an object, marked MATCH (100%) | DEF-COORD-BOARD-HASH-01 |
| LM-002 | 2026-09-25 17:13 | A hook-script SyntaxError (exit 1) stood in for the real passing run | DEF-COORD-INJECT-01 |
| LM-003 | 2026-09-25 17:09 | Revision 1's 27/27 was recorded as the complete roster; mutant 28 had exited 0 | roster rev 1 vs rev 2 |
| LM-004 | 2026-09-25 22:46 | Exit codes were read inside `powershell -Command` | DEF-COORD-EXIT-01 |
| LM-005 | 2026-09-25 22:45 | `task/lane-a` was merged before the review commit existed | DEF-COORD-MERGE-01 |
| LM-006 | 2026-09-25 17:10 and 17:53 | The coordinator wrote pass counts into STATUS before an independent review | `59573b81`, `4b9673c6` |
| LM-007 | 2026-09-25 15:25 | WG.00.08 was marked DONE eleven minutes after the fix, with no review | DEF-COORD-CLOSE-01 |
| LM-008 | 2026-09-26 09:23 | A script rewrite corrupted the WBS files | DEF-COORD-WBS-CORRUPT-01 |
| LM-009 | 2026-09-26 10:11 | Escape interpretation ate the leading `t` of `tools` and `tasks` in STATUS | DEF-COORD-STATUS-CORRUPT-01 |
| LM-010 | 2026-09-25 board 2340 | A board named lane tips that are not objects, and called another pair in sync | DEF-COORD-BOARD-HASH-02 |
| LM-011 | 2026-09-26 board 0104 | A board published a full SHA whose last bytes were retyped | DEF-COORD-BOARD-HASH-03 |
| LM-012 | 2026-09-25 23:07–23:25 | Three outbox boards were created as 0-byte files | DEF-COORD-EMPTY-BOARD-01 |
| LM-013 | 2026-09-26 | Launch-prompt commits landed on live lane branches | DEF-COORD-LAUNCH-PROMPT-01 |
| LM-014 | 2026-09-25 | Task logs and four named files were left at 0 bytes | DEF-OPS-LOG-01 |
| LM-015 | 2026-09-26 01:29 | A board said the inbox was empty while a directive file was present | DEF-COORD-INBOX-01 |
| LM-016 | 2026-09-26 01:29 | A board listed stale lane tips and omitted unpushed state | DEF-COORD-TIPS-01 |
| LM-017 | 2026-09-26 | Board wording said merges were ready during a PM merge hold | DEF-COORD-MERGE-WORDING-01 |
| LM-018 | 2026-09-25 ~23:39 | A PM temp clone was emptied by a process outside the run | DEF-COORD-WIPE-02 |

## LM-001 — Fabricated `task/lane-b` hash

- **Date:** 2026-09-25, board time 23:05 CT.
- **What happened:** The coordinator pulse board printed one full hash for both the local and origin `task/lane-b` refs and marked the row MATCH (100%). The published string is `ed75745610ec163f4b52b2257d079944634df4e2`. That object does not exist. The real commit with the prefix `ed757456` is `ed75745694e174ad7836724c0ac206bd0d186a2c` (`[claude] WG.00.11 Independent review of coordinator commit 8d1c7c37`, 2026-09-25 22:59:49 -0500). On 2026-09-27, `git rev-parse task/lane-b` and `git rev-parse origin/task/lane-b` both print that real SHA. The same board's other five hashes (main, lane-a, lane-e, lane-f, lane-g) do resolve. The lane-b cell is the one that was retyped: the 8-hex prefix is real and the rest is not.
- **Evidence:** `git cat-file -e ed75745694e174ad7836724c0ac206bd0d186a2c^{commit}` exits 0. `git cat-file -e ed75745610ec163f4b52b2257d079944634df4e2^{commit}` exits 128 (`fatal: Not a valid object name`). The published string was read from `C:\Users\snewt\.deus_pm\outbox\2026-09-25_2305_board.md` line 20. That file is not in the git tree: `git cat-file -e HEAD:docs/outbox/2026-09-25_2305_board.md` exits 128. The in-repo record is `tasks/WG.00.08/defects.jsonl:14` (DEF-COORD-BOARD-HASH-01, appended by `a0d68065e18269ac823792cee842f45addd28ab4`) and `docs/STATUS.md:168`. The defect's location field names `docs/outbox/2026-09-25_2305_board.md:20`. On `a6be423d` (origin/main when this task started), `git grep -n ed75745610ec a6be423d` exits 1: the rejected full string is not in the defect row or the WBS. It is quoted in this file so the failed `git cat-file` can be repeated without the out-of-repo board. `git cat-file -e ed757456:tasks/WG.00.11/review_8d1c7c37.md` exits 0. That path is not in HEAD (`git cat-file -e HEAD:tasks/WG.00.11/review_8d1c7c37.md` exits 128). OPS.10.02 is the existing row for bringing the review file onto main.
- **Impact:** A board could report a 100% match for a ref whose full name is not an object. Anyone who copied the string could not check the review out.
- **Rule now in place:** Boards paste raw `git rev-parse` output and do not retype a hash (`tasks/WG.00.08/defects.jsonl:14` requirement; `docs/STATUS.md:168`). For a closure, `tools/governance/check_claims.js` rule 4.1 rejects a hex token that is not a commit (`tools/governance/check_claims.js` lines 22–26 and 931–932). The fixture is `fail41_fabricated_hash` in `tools/governance/test_check_claims.js:448`. Rule 4.1 does not scan outbox boards. The existing row that asks for a correction board with raw `rev-parse` / `ls-remote` output is OPS.40.09.
- **Status:** Recorded. DEF-COORD-BOARD-HASH-01 remains OPEN in `docs/STATUS.md:168`. This entry does not close it.

## LM-002 — SyntaxError output taken as the proof

- **Date:** 2026-09-25 17:13:55 CT, recorded the same evening.
- **What happened:** The coordinator overwrote a worker output file. The record says `bvwyow104.output` was a hook-script SyntaxError and exited 1, while `b1ua8l2oj.output` held the real result, 29 passed and 0 failed, exit 0, confirmed at `task-34196.log:1084`. The SyntaxError file was the output in hand. It was not the passing run.
- **Evidence:** `docs/STATUS.md:41` and `docs/STATUS.md:167`. `tasks/WG.00.08/defects.jsonl:12` (status RECORDED) and `:13` (status OPEN), written by `d087b0977cca51194d42ba8538c3de38b69ae914` and re-appended OPEN by `a0d68065e18269ac823792cee842f45addd28ab4`. The temp paths in those rows are not repository paths. This log does not claim they were re-opened.
- **Impact:** A failing parse can be filed as the proof of a green run. The real exit 0 sat in a different file.
- **Rule now in place:** The coordinator does not write inside a worker's files, logs, or temp outputs (`tasks/WG.00.08/defects.jsonl:13` requirement). A closure's log counts as a passing run only when the committed log matches a pass pattern and does not match a fail pattern (`tools/governance/check_claims.js:180–181` and `:923`). A pass sentence typed into the record is not a run (`fail41_test_claim_text_only`, `tools/governance/test_check_claims.js:452`). A log with no passing run fails 4.1 (`fail41_failing_test_log`, `tools/governance/test_check_claims.js:450`). `tools/check_deus_syntax.js` turns `node -c` failures into process exit 1 (`tools/check_deus_syntax.js:21`).
- **Status:** Recorded. DEF-COORD-INJECT-01 remains OPEN in `docs/STATUS.md:167`.

## LM-003 — 27 mutants recorded, 28 required

- **Date:** 2026-09-25. Revision 1 committed 17:09:20 CT. The surviving mutant was still exiting 0 then. Revision 2 committed 18:30:41 CT. The independent check of the 28-row roster committed 22:49:10 CT.
- **What happened:** Revision 1 of the WG.00.08 kill roster listed 27 mutants and the cited sweep said 27/27. `59573b81` copied "27/27 caught" into STATUS as criteria 2.2b delivered. Mutant `shaft_prescan_removed` was not one of the 27. On the old `shafts_keep_fluid` check that mutant survived: the process exited 0. Revision 2 added it as row 28, strengthened the check, and re-ran the sweep. That sweep says 28/28. The baseline on both revisions is 28 checks passed. That check count is not the mutant count.
- **Evidence:** `9f320da22d8956a026012a093b9ec4dc7f5ad964` (`[fable] WG.00.08 Criteria 2.2b/2.2c mutant roster and skylight proof`). `tasks/WG.00.08/evidence/mutants_run_d1fbeab.log:30` reads `MUTANTS: 27/27 caught by a named check (exit 1) (1387 s)`. `tasks/WG.00.08/evidence/mutant_shaft_prescan_removed_old_check_bb32c44.log:48` reads `RESULT: 26 passed, 0 failed (exit 0)`. `a14ee83268028e5084f5c595c54c868cde736ddb` (`[fable] WG.00.08 Add and prove shaft_prescan_removed mutant`). `tasks/WG.00.08/evidence/mutants_run_47052c3.log:29` reads `MUTANTS: 28/28 caught by a named check (exit 1) (1146 s)`. The revision table is `tasks/WG.00.08/mutant_kill_roster.md:121–125`. `tasks/WG.00.08/state.md:107` points at that table. `16fec1077534c48480a5fac893cade74546a5ffd` is the adversarial verification of the 28/28 roster. `git cat-file -e 16fec107:tasks/WG.00.08/grok_verification.md` exits 0. That path is not in HEAD.
- **Impact:** A status line called the exit criterion delivered while the mutant the directive added still passed the old check.
- **Rule now in place:** A mutant is caught only when its process exits 1 and at least one line matches `FAIL <check>`. An exit of 2 is a harness failure, not a kill. A crash is not a kill (`tasks/WG.00.08/mutant_kill_roster.md:23–24`). The number written into a record is the committed log's `MUTANTS: N/N` line. Rows, `MUTANTS` keys, and log rows are the same set (`tasks/WG.00.08/mutant_kill_roster.md:7` and the revision table). `16fec107` is the review that applied that comparison to the 28-row roster.
- **Status:** Recorded. The 28/28 log and the roster are on HEAD. The verification write-up is only on `16fec107` (see OPS.10.02). This entry does not change WG.00.08's status.

## LM-004 — Exit codes lost inside `powershell -Command`

- **Date:** 2026-09-25, the four runs the record places at 22:46 CT.
- **What happened:** Four test runs captured `$LASTEXITCODE` inside `powershell.exe -Command`. The outer capture then does not hold each command's own exit code. Those four codes are not evidence of pass or fail.
- **Evidence:** `docs/STATUS.md:172` (DEF-COORD-EXIT-01), added in `d1f9cec58f704e6559cd72cf9546ee7c30aab751` (2026-09-25 23:54:17 -0500). The four command lines are not in the tree. This entry does not reconstruct them.
- **Impact:** A reported exit of 0 can be the exit of the wrapper, or of a later `echo`, rather than the exit of the test.
- **Rule now in place:** `docs/STATUS.md:24`, added in `86c48aade4f838e3b2d90396e4c992cfa6c0802b` (2026-09-25 23:41:30 -0500): record `EXIT=$LASTEXITCODE` after each command, in the shell that ran it, never inside `powershell -Command "..."`. No checker in `tools/` fails a capture that uses that wrapper. The sentence is the guard.
- **Status:** Recorded. DEF-COORD-EXIT-01 remains OPEN.

## LM-005 — Merge before review

- **Date:** 2026-09-25 22:45:24 CT, four minutes before the review commit at 22:49:10 CT.
- **What happened:** `0f7f26cd0d249b07db893a6f48c4aa7cbfe51a8f` merged `task/lane-a` into main (`[gemini] Merge branch 'task/lane-a' into main (Directive 001-H sec 1-2)`). The Grok verification of the 28-mutant roster, `16fec1077534c48480a5fac893cade74546a5ffd`, did not exist yet. An earlier merge of the same branch, `a1d02927e43f1d3217659c146aac8a522974c259` (22:41:08 CT), is not an ancestor of HEAD. The record says that merge was undone with `git reset --hard` to `da2c16b2c8ac2939d855837ecea1b31a17cdf06e`. `da2c16b2` is an ancestor of HEAD. `0f7f26cd` is an ancestor of HEAD. `16fec107` is not.
- **Evidence:** The four SHAs above all satisfy `git cat-file -e`. `git merge-base --is-ancestor 16fec107 0f7f26cd` exits 1. `git merge-base --is-ancestor 0f7f26cd HEAD` exits 0. `git merge-base --is-ancestor 16fec107 HEAD` exits 1. `git merge-base --is-ancestor 16fec107 task/lane-a` exits 0, and both `task/lane-a` and `origin/task/lane-a` resolve to `16fec107`. `git merge-base --is-ancestor a1d02927 HEAD` exits 1. `docs/STATUS.md:43` and `:76` say the same thing: the verifier commit is on `task/lane-a` and is not on main. `docs/STATUS.md:170` is DEF-COORD-MERGE-01. `node tools/governance/check_claims.js --commit 0f7f26cd` exits 0: the checker sees no path that differs from every parent, so rules 4.1–4.4 do not fire on that merge.
- **Impact:** Main contained the lane's tree before the independent verification commit existed. The verification is still absent from main.
- **Rule now in place:** An independent closure review is required before a leaf is marked DONE (`docs/STATUS.md:21`; `docs/CANONICAL_ROLES.md:21` and `:28–34`). The machine form that refuses a merge with no review commit is the merge gate: the tip must be the review commit, and a missing review file is `REVIEW_MISSING` (`tools/governance/MERGE_GATE.md`, the review check; `tools/governance/merge_gate.js`). That gate landed after this merge (Lane I's `a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5` is 2026-09-26 00:38:23 -0500). `check_claims.js` is not the check that catches this merge. OPS.10.02 is the existing row for bringing `16fec107` onto main without the lane-a `state.md` edits.
- **Status:** Recorded. DEF-COORD-MERGE-01 remains OPEN. This entry does not merge anything.

## LM-006 — Self-certification

- **Date:** 2026-09-25 17:10:25 CT and 17:53:46 CT.
- **What happened:** Two `[gemini]` commits wrote the worker's pass counts into `docs/STATUS.md` while the same pages still said Grok's review was outstanding.
  - `59573b81bc83b965558fae602ab7a9703e02ecee` recorded Lane A criteria 2.2b/2.2c as delivered, including "27/27 caught", and Lane C2 as "88/88 PASS". The lane rows say the work is awaiting Grok.
  - `4b9673c67879def4131643196ddb960369394c69` is titled "Record Lane G completion and verified test pass". It set the Lane G table cell to "COMMITTED & VERIFIED" with "Gating checks pass (30/30)" and, in that same cell, "world_age 29/0; carrying capacity 23/0". The bullet above the table says "world_age 29/29 pass, carrying capacity 23/23 pass" and "Awaiting Grok review".
- **Evidence:** Both SHAs satisfy `git cat-file -e` and are ancestors of HEAD. The diffs are `docs/STATUS.md` only. Re-audit on 2026-09-27: `node tools/governance/check_claims.js --commit 59573b81` exits 1. Rule 4.1: `docs/STATUS.md` prose `WG.00.08 -> DELIVERED` cites `9f320da2`, which is not reachable from the parent. Rule 4.2: the same prose names no independent reviewer, and the committer is gemini, who is among the owners. `node tools/governance/check_claims.js --commit 4b9673c6` exits 1. Rule 4.1: prose `WG.00.11 -> COMPLETE` cites `a8e42502`, which is not reachable from the parent. Rule 4.2: no independent reviewer, committer gemini. Both results are marked `historical: true` by the checker.
- **Impact:** STATUS presented worker counts as delivered or verified before a reviewer commit existed, and it cited commits that were not on the parent history.
- **Rule now in place:** Gemini does not self-certify. A leaf cannot be marked DONE until an independent reviewer's verdict is recorded with a timestamp that precedes the DONE edit (`docs/CANONICAL_ROLES.md:21`). Reviewers form the first verdict independently (`docs/STATUS.md:19–21`). `tools/governance/check_claims.js` rule 4.2 (`tools/governance/check_claims.js:27–38`) is the machine form. Fixtures include `fail42_pm_self_certifies_in_status` (`tools/governance/test_check_claims.js:836`) and `real_31676cf_WG.00.08_DONE_without_reviewer_fails_4.2` (`tools/governance/test_check_claims.js:1170`). The audits in the evidence line are the two commits of this entry failing that checker.
- **Status:** Recorded. The STATUS sentences have since been rewritten by later commits. The two commits remain in history. This entry does not revert them.

## LM-007 — Marked DONE before any review

- **Date:** 2026-09-25 15:25:11 CT, eleven minutes after the fix commit at 15:14:08 CT.
- **What happened:** `31676cf143a2b458306b29a43a1e76e40f09cb90` merged `task/19b-cuts-caves` into main and set WG.00.08 to `` `DONE` (FABLE-19B / 2e4571a) ``. The fix it names is `2e4571a6bd91f852af9cf55f48e15362395a5334`. No review commit sits between them.
- **Evidence:** Both SHAs satisfy `git cat-file -e`. `31676cf1` is an ancestor of HEAD. The WBS row change is in that commit's diff of `docs/worldgen/DEUS_WORLDGEN_WBS.md` (WG.00.08 from `` `ACTIVE` `` to `` `DONE` ``). `docs/STATUS.md:171` is DEF-COORD-CLOSE-01, added in `d1f9cec58f704e6559cd72cf9546ee7c30aab751`. `node tools/governance/check_claims.js --commit 31676cf1` exits 1. Rule 4.2 reports three violations, including `docs/worldgen/DEUS_WORLDGEN_WBS.md` `WG.00.08 -> DONE` with no independent reviewer and committer gemini. The same audit's rule 4.1 reports the STATUS prose `WG.00.08 -> COMPLETED` cites no commit and no test run. The fixture `real_31676cf_WG.00.08_DONE_without_reviewer_fails_4.2` pins this commit.
- **Impact:** The leaf read as finished before anyone independent of the merge had signed it. Later work had to put it back in review.
- **Rule now in place:** Same as LM-006: `docs/CANONICAL_ROLES.md:21`, `docs/STATUS.md:21`, and check_claims rule 4.2. The DONE edit's timestamp has to follow the reviewer's verdict, not precede it.
- **Status:** Recorded. DEF-COORD-CLOSE-01 remains OPEN. This entry does not set WG.00.08's status.

## LM-008 — WBS files rewritten by a script

- **Date:** 2026-09-26 09:23:47 CT. Restored 10:39:58 CT.
- **What happened:** `0536d3920ae4ac6dd65364565583bcf69db20a60` (`[gemini] Record DECs for 32 layers, biomes, and world grid; WBS/STATUS maintenance`) replaced large parts of the WBS files in one commit. The diff stat for `docs/worldgen/DEUS_WORLDGEN_WBS.md` in that commit is 1511 lines changed. `b9abee29b64f008502d667aa85de20e2669a298f` (`[gemini] Restore WBS files corrupted by 0536d392`, 2026-09-26 10:39:58 -0500) put the files back. The defect row says the corruption was a script/regex edit and that whole-file rewrites are banned.
- **Evidence:** Both SHAs satisfy `git cat-file -e` and are ancestors of HEAD. `docs/STATUS.md:189` is DEF-COORD-WBS-CORRUPT-01. The row's introducing commits include `6e07f7db4ce8d1a7f4b77cd9a8fd605442d6b87a` and `9c0e7b57e93dee27ccc163f669531b348456955c` (`git log -S DEF-COORD-WBS-CORRUPT-01 -- docs/STATUS.md`).
- **Impact:** A generated rewrite of a WBS can drop or alter rows that later readers treat as the plan. The restore commit is what current history relies on.
- **Rule now in place:** `tools/governance/check_claims.js` rule 4.3 (`tools/governance/check_claims.js:39–45`): a WBS keeps its Rev header and revision log; old log rows are not deleted, rewritten, or back-filled; leaves are not deleted, renamed, or retitled. The fixture `fail43_rev_log_row_rewritten` is in `tools/governance/test_check_claims.js`. The defect row's own rule is: no whole-file rewrite (`docs/STATUS.md:189`).
- **Status:** Recorded. DEF-COORD-WBS-CORRUPT-01 remains OPEN. This entry does not edit a WBS file.

## LM-009 — STATUS paths eaten by escape interpretation

- **Date:** 2026-09-26 10:11:17 CT.
- **What happened:** `a81d0daf8239c1f7d4e5269f9dd6e85e019b2733` wrote the Lane Z–AC whitelist cells in `docs/STATUS.md` so that a `\t` escape was interpreted. In the blob `a81d0daf:docs/STATUS.md`, the bytes after the Lane Z cell's first `|` are: space (U+0020), tab (U+0009), then the characters `ools/security/**`, then `<br>`, then another tab and `asks/`. The leading `t` of `tools` and `tasks` is gone, and so is the opening backtick. The defect row names this backslash interpretation and says backslash paths must be stored raw.
- **Evidence:** `git cat-file -e a81d0daf` exits 0 and the commit is an ancestor of HEAD. The byte check is a Node read of `git show a81d0daf:docs/STATUS.md` (character codes `32,9,111,111,108,115` at the start of that cell). `docs/STATUS.md:190` is DEF-COORD-STATUS-CORRUPT-01, introduced in `9c0e7b57e93dee27ccc163f669531b348456955c`. The current line `docs/STATUS.md:109` contains `` `tools/security/**` `` again. `git blame -L 109,109 -- docs/STATUS.md` names `aa0385e3f7d0da79d9d666b591505071592798e0` (2026-09-26 22:19:29 -0500) as the last commit to touch that line. This entry does not claim that commit was the first repair.
- **Impact:** A whitelist cell that no longer names `tools/` or `tasks/` does not match the files the lane owns. A later reader who renders the file through a second escape pass sees a different path than the one that was meant.
- **Rule now in place:** The defect row: backslash paths must be raw (`docs/STATUS.md:190`). Write the path as literal characters. Do not pass the file through a string unescape. No separate checker for this escape was found in `tools/`.
- **Status:** Recorded. The current Lane Z line is the repaired spelling. DEF-COORD-STATUS-CORRUPT-01 remains OPEN.

## LM-010 — Board hashes that are not the refs

- **Date:** Board `2026-09-25_2340`, as named in the defect row.
- **What happened:** The row says that board listed `task/lane-c1` as `4f346b9a` and `task/lane-c2` as `e99da6f2`, both "in sync" with origin, and that `git cat-file` on those names exited 128. It also says the board listed lane-c3 `70dad277` as in sync while `origin/task/lane-c3` was `048752c8`.
- **Evidence:** `docs/STATUS.md:174`. On 2026-09-27, `git cat-file -t 4f346b9a` and `git cat-file -t e99da6f2` both exit 128. `70dad2779911954aa521f94d10a9a829549ffa81` and `048752c83e6fc0bbc06f8cfbe810cb07b61c17f0` both exist. `git rev-parse origin/task/lane-c3` on this date prints `70dad2779911954aa521f94d10a9a829549ffa81`, so the "origin is `048752c8`" clause is the board-time claim in the row, not the ref today. The board file is not in the git tree.
- **Impact:** Same as LM-001, for two more refs, plus a sync claim that named two different real commits.
- **Rule now in place:** Same as LM-001. Paste `git rev-parse` and `git rev-parse origin/<branch>`. A 100% match is those two strings being equal, not a typed pair.
- **Status:** Recorded. DEF-COORD-BOARD-HASH-02 remains OPEN.

## LM-011 — Full SHA with the tail retyped

- **Date:** Board `2026-09-26_0104`, recorded in `8be696f6aad53fe68d819327401672c74494c628` (2026-09-26 01:08:55 -0500).
- **What happened:** The board published `a0183d684e20...` as the Lane I tip. The object with that prefix is `a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5` (`[claude] WG.00.12 Lane I: MERGE_GATE.md`, 2026-09-26 00:38:23 -0500). The published form `a0183d684e20` does not resolve.
- **Evidence:** `docs/STATUS.md:175`. `git cat-file -t a0183d684e20` exits 128. `git cat-file -e a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5` exits 0. `8be696f6` satisfies `git cat-file -e`.
- **Impact:** A reader who checks out the printed string gets "not a valid object name" for a commit that does exist under a different tail.
- **Rule now in place:** Same as LM-001. Copy the full line from `git rev-parse`. Do not extend an 8-hex prefix by hand.
- **Status:** Recorded. DEF-COORD-BOARD-HASH-03 remains OPEN.

## LM-012 — 0-byte outbox boards

- **Date:** 2026-09-25, boards 2307, 2317, and 2325.
- **What happened:** Three outbox boards were created as empty files. A reader of the board sequence sees a pulse that has no text.
- **Evidence:** `tasks/WG.00.08/defects.jsonl:15` and `docs/STATUS.md:169`, appended by `a0d68065e18269ac823792cee842f45addd28ab4`. The paths in the defect are under `C:\Users\snewt\.deus_pm\outbox\`, which is outside the git tree. On 2026-09-27 those three files were still present and each had length 0. `2026-09-25_2307_board.md` is also named, at 0 bytes, beside the 2305 board that holds LM-001.
- **Impact:** An empty board is not a record. A later reader cannot tell a skipped pulse from a failed write.
- **Rule now in place:** Write to a temp file and move it into place only when its length is greater than 0 (`tasks/WG.00.08/defects.jsonl:15` requirement; `docs/STATUS.md:169`).
- **Status:** Recorded. DEF-COORD-EMPTY-BOARD-01 remains OPEN. The three files were still empty when this entry was written.

## LM-013 — Launch prompts committed onto lane branches

- **Date:** Recorded 2026-09-26 in `6e07f7db4ce8d1a7f4b77cd9a8fd605442d6b87a` (02:00:16 -0500).
- **What happened:** The row says launch-prompt commits landed on live lane branches because `run_review_lane_*.ps1` and `run_lane_*.ps1` committed the prompt in the lane worktree before the worker started. It says the remedy is to store prompts out of band, in `logs/` or on `main`, and that launching and merging moved to the PM.
- **Evidence:** `docs/STATUS.md:176`. The current launcher still commits the prompt onto the lane worktree unless `-NoCommitPrompt` is passed: `tools/ops/launch_worker.ps1:1246–1249` runs `git add` and `git commit` on `tasks/<task>/<lane>/launches/<stamp>_prompt.txt`. Those `run_lane_*.ps1` names are not in `git ls-files` output from a search for `run_lane` and `run_review`. This lane's own `tasks/OPS.40.06/lane-at/launches/20260927_021428_prompt.txt` was untracked at the start of the OPS.40.06 run and is not part of this commit.
- **Impact:** A prompt commit moves the branch tip after the commit the worker was asked to review, and it mixes launch paperwork into the lane's history.
- **Rule now in place:** The defect row says prompts stay out of band (`docs/STATUS.md:176`). The launcher code does not default to that. See PROPOSED-AT-01 in `tasks/OPS.40.06/lane-at/REPORT.md`. This log does not change `launch_worker.ps1` (that path is outside this task's allowed set).
- **Status:** Recorded. DEF-COORD-LAUNCH-PROMPT-01 remains OPEN.

## LM-014 — 0-byte task logs

- **Date:** 2026-09-25, recorded in `d1f9cec58f704e6559cd72cf9546ee7c30aab751`.
- **What happened:** The row says Claude `-p` launches with no redirect left `task-35425` and `task-35427` logs at 0 bytes, and that `run_lane_a_grok.ps1`, `run_lane_c3.ps1`, `run_review_8d1c7c37.ps1`, and `lane-c3\BRIEF.md` are 0 bytes.
- **Evidence:** `docs/STATUS.md:173`. A `git ls-files` search for those script names and for `lane-c3/BRIEF.md` returned no matching paths. The 0-byte files are not in this tree. The row is the in-repo record.
- **Impact:** A 0-byte log cannot confirm what the worker ran. A 0-byte brief is not a brief.
- **Rule now in place:** Redirect the worker's stdout and stderr to the task log before the process is started, and do not treat a 0-byte file as a completed write (same length check as LM-012). No separate in-repo copy of those four files was found to cite.
- **Status:** Recorded. DEF-OPS-LOG-01 remains OPEN.

## LM-015 — Inbox reported empty

- **Date:** Board `2026-09-26_0129`. The row says `0025-Z.md` had been in the inbox since 01:21:59 CT.
- **What happened:** The board said the inbox was empty. The row says the file was already there. The board did not cite a live directory listing.
- **Evidence:** `docs/STATUS.md:177`, introduced in `6e07f7db4ce8d1a7f4b77cd9a8fd605442d6b87a`. The inbox file is under the PM mailbox, outside this git tree. It was not re-listed for this entry.
- **Impact:** A coordinator can skip a directive that is sitting in the inbox.
- **Rule now in place:** The row: an outbox board cites a live `Get-ChildItem inbox -File` (`docs/STATUS.md:177`).
- **Status:** Recorded. DEF-COORD-INBOX-01 remains OPEN.

## LM-016 — Stale tips, no unpushed flag

- **Date:** Board `2026-09-26_0129`.
- **What happened:** The row says that board listed stale tips for Lanes K and N and did not report the worktree HEAD or whether the branch was unpushed.
- **Evidence:** `docs/STATUS.md:178`, introduced in `6e07f7db4ce8d1a7f4b77cd9a8fd605442d6b87a`. The board is outside the git tree and was not re-read for this entry. The row is the in-repo record.
- **Impact:** A stale tip sends a reviewer, or a merger, at the wrong commit. An unpushed tip looks published.
- **Rule now in place:** The row: cite both the worktree HEAD and `origin/<branch>`, and mark UNPUSHED when they differ (`docs/STATUS.md:178`).
- **Status:** Recorded. DEF-COORD-TIPS-01 remains OPEN.

## LM-017 — Merge wording ahead of the hold

- **Date:** Recorded with the 2026-09-26 board corrections.
- **What happened:** The row says board wording implied merges were ready while the PM still had merge holds on Lanes J, C2b, and I.
- **Evidence:** `docs/STATUS.md:179`, introduced in `6e07f7db4ce8d1a7f4b77cd9a8fd605442d6b87a`. Severity on that row is INFO.
- **Impact:** A reader can merge, or can prepare to merge, while the hold is still in force.
- **Rule now in place:** The row: the board states the merge hold until mailbox sign-off (`docs/STATUS.md:179`).
- **Status:** Recorded. DEF-COORD-MERGE-WORDING-01 remains OPEN.

## LM-018 — Temp clone emptied from outside

- **Date:** 2026-09-25, about 23:39 CT, as the row states.
- **What happened:** The row says the PM temp clone at `AppData\Local\Temp\verify_h` was emptied by an unknown process outside the run.
- **Evidence:** `docs/STATUS.md:184`, introduced in `d89edf7e287f33efde16ce0f67527be97d730cdc` (2026-09-26 00:02:46 -0500, `[gemini] 0016-P governance alignment: WG.00.08 reviewed/merged, DEC-010, DEF-Z2-PROOF-* defects`). The directory is outside the git tree. It was not re-inspected for this entry.
- **Impact:** A verification clone that disappears mid-run leaves no tree to re-check. A result that depended on that directory cannot be repeated.
- **Rule now in place:** The heavy-job rule in the lane briefs: a heavy NW.js or clone run uses a throwaway directory under `%TEMP%`, and that directory is deleted by the run that created it, at the end, not by an unrelated process in the middle. This entry does not add a new lock. DEF-COORD-WIPE-02 stays the record of the hole.
- **Status:** Recorded. DEF-COORD-WIPE-02 remains OPEN.

## What this log does not do

- It does not mark any WBS row DONE, REVIEW, or PLANNED. OPS.40.06 stays whatever status the WBS already has.
- It does not close any `DEF-*` row. Where a current file no longer shows the damage (LM-008's restore, LM-009's repaired line), the defect row is still OPEN and this log leaves it OPEN.
- It does not answer the Owner questions named in `tasks/OPS.40.06/lane-at/REPORT.md`.
- It does not generate, request, or integrate art.

## Checklist by work class (added 2026-09-29 by the PM; the launcher prepends the matching block to every writer prompt once lane-co lands)

### Simulation kernels and physics (game/js/sim/**)
- Assert `getTotalMass().total` (or the subsystem's total) on EVERY tick of a multi-tick run, not two fields after one tick (NAT.04.01 attempt 2 minted 187,500 cp per tick unseen; review 97432c21).
- A new cell/record starts at zero mass; constructors that default to "full" mint matter (soil.js attempt 2).
- Unknown neighbours are unknown, not "elevation 0"; state which authority supplies missing data (groundElevationProvider pattern).
- Every mutant must fail on an assertion line; a hard-coded `process.exit(1)` is not a caught mutant (review 50c08991).
- Tests call the production engine, never stub helpers (6 of 15 failing lanes in the 2026-09-29 audit).
- Separate work queues per pass so one pass cannot clear another's dirty set.

### Engine bridges and RMMZ plugins
- Register plugins in `game/js/plugins.js`; a Node `require()` companion cannot see RMMZ globals and its "Cannot find module" log line hides the real error (DEUS_Bag never loaded while its test passed 5/5, 2026-09-29).
- Check `game/game_runtime.log` for `[CORE] Companion plugin ... NOT loaded` after every launch until `tools/check_plugin_boot.js` exists.
- A plugin loaded by both `require()` and `loadScript` runs twice; keep one path.
- Live-edit hooks must use `UF.Events.on` with the positional `(area, x, y, layer, tileId)` signature; `UF.World.on` is undefined (DEUS_Tiles.js:1255).
- "In-game VERIFIED" needs a screenshot you opened that shows the feature, on the shipped `plugins.js` parameters (the 3×3 world claim was made on a 1×1 world).

### Tooling, tests and gates
- A check that only prints cannot fail; every check_*.js exits non-zero on a finding (9 of 13 did not, audit 2026-09-29).
- Gate suites run in a fresh clone with `core.autocrlf=false`; CRLF clones broke three suites (Lane Y).
- Launch prompts must not be committed onto the lane branch above the writer commit (`-NoCommitPrompt`); they became the gate's "review target" and caused REVIEW_FILE_NAME refusals.

### Art (PixelLab OBJECTS/MAPS)
- Catalogue row and prompt file exist BEFORE the call; a prompt written afterwards is a reconstruction and is labelled so.
- Only OBJECTS and MAPS tools; `create_image_pro_flash` and Character/Creator tools are banned (DEC-007 amendment). The 26 individual_48 tiles were made with the wrong tool.
- "Seamless" in the prompt is not seamless: measure the wrap-edge ratio (14 of 26 tiles failed at 1.0).
- Variants are distinct front-view generations; rotations are facings and move the light (granite set used 8 rotations as 8 variants).
- `APPROVED` is written only from the Owner's SHA-256 ledger; agents set at most QA states (8 batch-3 objects were self-approved 2026-09-29).
- Within one set, variants stay within one grey-value step and one silhouette family; check the set against its neighbours (Cave Moss vs Bush confusion).

### Process and source control
- Never commit runtime code straight to main (cd8e43b7, eb790a68); never commit keys (5842f6f8 leaked a MiniMax key, purged the same day); never `git clean -x`/`-X` (dee6a400's .gitignore hid protected files).
- A review is independent only if the reviewer's own account authored the commit; six "[grok]" reviews were authored by the ops account.
- Record Owner decisions in docs/OWNER_DECISIONS.md the same session; a rule that lives only in chat does not reach the next agent.
