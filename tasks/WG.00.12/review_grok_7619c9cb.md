# Independent Review: Lane C2b — WG.00.12 Governance Tooling Hardening

**Reviewed commit:** `7619c9cb68b1594d62a8dee79948dd42799bdcf9`
**Subject:** `[claude] WG.00.12 Lane C2b: harden check_claims.js review backing, record scope and status glyphs (254/254, 94 mutants)`
**Author:** deus-claude (not this reviewer)
**Branch:** `task/lane-c2b`
**Reviewer:** Grok
**Date:** 2026-09-26
**Files read at that commit:** `tools/governance/check_claims.js`, `tools/governance/test_check_claims.js`, `tasks/WG.00.12/c2_governance_state.md`
**Requirement source:** `BRIEF.md` (DEUS Directive 001-I §C). The directive text is not in the repository; the nine vectors below are the brief's.

VERDICT: PASS

The commit hardens `check_claims.js` against all nine vectors. It touches only the Lane C2b whitelist: `check_claims.js` (+202/− in the combined 331-line diff), `test_check_claims.js`, and `c2_governance_state.md`. It does not edit `game/`, `docs/`, or the hooks directory, and it does not install the hook.

Branch tip at review time was `d2e397da` (`[gemini] Record Lane C2b Grok review launch prompt`). That commit adds only `tasks/WG.00.12/launches/20260926_010017_prompt.txt`. The three reviewed files are identical to `7619c9cb`.

## Fresh-clone run

Clone: `C:\Users\snewt\AppData\Local\Temp\c2b-review-7619c9cb` (`git clone --no-hardlinks` of this worktree, detached at the reviewed commit, clean status).

```
git rev-parse HEAD
7619c9cb68b1594d62a8dee79948dd42799bdcf9

node tools/governance/test_check_claims.js
```

| Item | Observed |
|---|---|
| Exit code | **0** |
| Suite line | `RESULT: 254 passed, 0 failed` |
| SKIP lines | none |
| FAIL lines | none |
| Mutant kill lines | **94** `PASS mutant_*_killed` (94 unique mutant names in the source, no duplicates) |
| Wall time | 181 seconds |

The 254 checks are the 12 unit checks, the fixture cases, 6 backfill cases, the 9-step hook case, the text-format check, 5 real-history checks, and the 94 mutant kills. Real-history commits (`31676cf`, `d1fbeab`, the integration merges, `2355931`, `a12f94a7`) were present in the clone and ran; none were skipped.

`GOVERNANCE_EPOCH` is `a12f94a70c1f5c9f2b6ae3f4fcfb2fbe752f9f3d`, which is `a12f94a7`.

## The nine vectors

| # | Vector | Enforcement inspected | Locked by |
|---|---|---|---|
| 1 | Status parsing and the terminal allowlist | `plainStatusText` / `normText` fold NFKD, strip marks and `\p{Cf}` (plus Hangul fillers and braille blank), then NFKC. Emphasis `` * _ ` ``, HTML comments, strikeout, and entities are removed before `statusOf`. `Status:` / `State:` labels drop. `->`, `=>`, `→`, and `←` select the new value (`A ← B` is A). A cell is non-terminal only when its active phrase is `TODO`, `IN_PROGRESS`, `REVIEW`, or `BLOCKED` or a listed alias, and no closure word (`DONE` … `SHIPPED`, plus `CHECKMARK` for `✅ ✔ ✓ ☑ [x]`) stands unnegated. Anything else, including blank and unknown words, is a closure. Status headers match `status`, `state`, or `progress`. A leaf table with no such column fails 4.3; a defect row that loses one fails 4.1. | `unit_status_allowlist`, `unit_status_normalization`, `unit_status_arrows_labels_annotations`, `fail_status_*`, `fail43_wbs_status_column_renamed`, `fail41_defect_status_column_renamed`; mutants `status_*` (16), `4.3_status_column_optional`, `4.1_defect_status_column_loss_ignored` |
| 2 | Reviewer and closer | `strictAgent` accepts one known agent. On a WBS, STATUS, AUDIT_LOG, or issues closure the closer must differ from the committer, from every owner, and from the author of a cited work commit. `closedBy` text alone fails. `reviewArtifact` requires a cited `.md/.txt/.json/.jsonl/.log/.yaml` whose name matches review / verdict / verif / signoff / audit, that is not a status document or ledger, exists in the committed tree, mentions the record id, records no failing verdict for that id, and was last committed by a `[closer]` subject (same commit only when the committer is that closer). `closedBy: owner` requires a parent-tree `DEC-xxx` in `docs/OWNER_DECISIONS.md` that is `DECIDED` and names the record. A `Writer → Reviewer` cell splits at the arrow. | `fail42_*`, `unit_reviewers_and_agents`, `unit_review_artifact_verdicts`, `pass_owner_closure_with_decided_dec`, `pass_pair_column_writer_reviewer`; mutants `4.2_*` (24) including `4.2_reviewer_regex_off`, `4.2_reviewer_regex_unnormalized`, `4.2_typed_closedby_accepted`, `4.2_artifact_verdict_unread` |
| 3 | Evidence | `evidenceOf` accepts a 7–40 hex commit only when `git cat-file` resolves it and it is an ancestor of a parent. A test run is an existing script path plus an existing non-review log that matches `PASS_OUTCOME_RE` and does not match `FAIL_OUTCOME_RE`. A pass sentence typed on the record is not a run. Every path the record cites must exist in the index or the commit tree. | `fail41_done_without_evidence`, `fail41_test_claim_text_only`, `fail41_failing_test_log`, `fail41_cited_evidence_file_missing`, `fail41_commit_not_reachable`; mutants `4.1_text_test_claim_trusted`, `4.1_failing_log_accepted`, `4.1_missing_evidence_files_ignored`, `4.1_reachability_ignored` |
| 4 | Revision log | A touched WBS needs a `Rev` header and a table whose first header is `Rev` / `Revision` / `Version` (with `#` / `no` / `number`). Numbers are contiguous positive integers and the max must equal the header. A missing row, a rewritten row, a duplicate, a gap, or a row inserted under the old head fails 4.3. A "Revision Log" heading with no such table fails. | `unit_revision_log`, `fail43_rev_*`, `pass_rev_log_header_synonym`; mutants `4.3_revlog_contiguity_unchecked`, `4.3_revlog_row_deletion_allowed`, `4.3_revlog_row_rewrite_allowed`, `4.3_revlog_header_synonyms_dropped`, `4.3_revlog_section_detection_off`, `4.3_revlog_table_optional`, `4.3_rev_header_optional` |
| 5 | Ledgers | `tasks/<task>/defects.jsonl` matches any letter case. Keys are compared with punctuation stripped (`Status` and `status`). A key twice, or `status` and `state` that disagree, fails 4.1. `SHIPPED`, `RECORDED`, and blank are closures via the same allowlist as vector 1. Old lines must remain the exact prefix. I re-parsed three duplicate-key lines, including an escaped quote and a trailing backslash; `jsonKeyConflicts` reported `status` on each. | `fail41_ledger_*`, `fail42_ledger_*`, `fail43_ledger_*`, `pass_ledger_mixed_case_keys_fix_ready`, `unit_json_key_conflicts`; mutants `ledger_keys_case_sensitive`, `ledger_path_case_sensitive`, `ledger_duplicate_keys_allowed`, `ledger_denylist_instead_of_allowlist`, `4.3_ledger_append_only_off` |
| 6 | Scan scope | Every Markdown table is read, including blockquoted tables and tables after the first. A leaf or defect id is the first cell when it starts with the id (`TW.00.05 (new)`); `WG.00.12/C1` is not `WG.00.12`. Added `<table>`, `<tr>`, `<td>`, or `<th>` fails. Sentences outside tables in `docs/STATUS.md` that name an id and a closure word are claims, including `- [x]`. | `fail_status_second_table_leaf`, `fail_status_leaf_id_with_suffix`, `fail_status_blockquote_table_leaf`, `fail43_html_table_in_wbs`, `fail41_html_table_in_status`, `fail42_status_prose_claim`, `fail42_status_prose_task_list_checked`, `unit_prose_claims`, `unit_record_ids_and_tables`; mutants `status_leaf_tables_need_wbs_header`, `4.1_defect_tables_first_only`, `4.2_status_prose_not_scanned`, `tables_in_blockquotes_skipped`, `html_tables_allowed`, `leaf_sub_ids_read_as_parent` |
| 7 | Hook and range gate | The hook body (`DEUS-GOVERNANCE-HOOK v2`) loads `git cat-file blob HEAD:tools/governance/check_claims.js`, else the staged `:path` blob, into a temp file under the git dir, and exits 1 when neither exists. It does not execute the working-tree copy. `--range` rejects `a...b`, rejects a base that is not an ancestor of head, and checks every commit in `base..head`. Lane hints come from `Merge branch '.../lane-<x>'` and from a `task/lane-<x>` head ref, and a hint only narrows. | hook case (9 steps, including `ignores_tampered_working_tree_checker` and `fails_closed_without_checker`), `pass_range_gate_clean`, `range_gate_*`; mutants `hook_fails_open_without_checker`, `hook_runs_working_tree_checker`, `range_base_ancestry_unchecked`, `range_merge_lane_hints_off`, `range_head_ref_hint_off`, `range_symmetric_allowed` |
| 8 | Section 4.4 whitelist | `dir/*` owns the folder and its subfolders (`unit_glob_subtree`). A merge that changes no path passes without an identity. Commits at or before the epoch grandfather 4.4 only; 4.1–4.3 still fail (`fail41_pre_epoch_commit_still_checked`, mutant `grandfather_covers_all_rules`). `--epoch` may move only to an ancestor or `none` (`real_epoch_override_cannot_widen`, mutant `epoch_override_may_widen`). The whitelist is read from the parent commit. | `pass_subtree_whitelist`, `pass_commit_merge_without_agent_subject`, `pass44_grandfathered_pre_epoch`, `fail44_post_epoch_not_grandfathered`, `fail44_*`; mutants `4.4_*`, `grandfather_*` |
| 9 | Mutant suite | 94 single-site mutants. Each kill is one named unit, fixture, hook, or real-history check going red. The set includes `status_*` (statusWord / statusOf), `4.2_reviewer_regex_*`, `status_allowlist_replaced_by_denylist` and `ledger_denylist_instead_of_allowlist` (closing list is an allowlist), and `4.3_revlog_*` (revision-log detection). All 94 were killed in the clone run. | `RESULT: 254 passed, 0 failed` |

Hand checks of `statusOf` on the reviewed file, same commit: `REVIEW ← DONE` is non-terminal `REVIEW`; `DONE ← TODO` is terminal `DONE`; `TODO ↔ UNKNOWN` and `TODO <-> UNKNOWN` are terminal `UNKNOWN`; `Status: DONE` is terminal `DONE`. That matches the arrow rule in the state doc.

## Residuals (do not change the verdict)

These are the limits the state doc already states, confirmed in the code. They are bounded, and the nine vectors still hold.

- **F10, ledger signature.** `pass_ledger_closer_signs_own_closure` and `pass_ledger_closer_adds_review_in_same_commit` allow the closer to commit a ledger line. A fixer still cannot be the closer or the committer (`fail42_ledger_closedby_is_fixer`, `fail42_ledger_fixer_commits_closure`). On a status document the closer must be a different agent (`fail42_closer_is_committer`). The Owner ruling requested in the state doc is still the right next step.
- **Declared identity.** A `[grok]` subject is trusted as Grok. `--range` still applies 4.4 to the paths.
- **4.1 hash.** Any commit reachable from a parent counts as evidence. The review artifact is the separate 4.2 check.
- **Test log binding.** Any existing script plus any committed passing log counts. The log does not have to name that script. A pass claim with no log still fails (`fail41_test_claim_text_only`).
- **Prose hyphenation.** A hyphenated closure word in a STATUS sentence is skipped (`DONE-ish`). In a status cell, `DONE-unverified` is one unknown phrase and is a closure.
- **Verdict wording.** `FAIL`, `REJECTED`, `CHANGES REQUESTED`, `NO-GO`, `NOT APPROVED`, `BLOCKED`, and `DENIED` are read on verdict lines, headings, and Verdict / Result / Outcome cells. A rejection phrased as "this does not pass" still backs a closure. A review with no verdict still backs one.
- **Id mention.** The artifact and the DEC entry match the id by substring after normalization. A review that mentions `WG.00.08.01` also mentions `WG.00.08`. The artifact still has to be the closer's document and must not record a failing verdict for the id being closed.
- **Aliases.** `OPEN`, `QUEUED`, `FIX_READY`, `CHANGES_REQUESTED`, and the other names listed in `NON_TERMINAL` are non-terminal. `REVIEW (D0NE)` stays `REVIEW`, because `D0NE` is not a closure word; `REVIEW (→ D0NE)` is a closure (`fail_status_arrow_to_unknown`). Unknown primary words are closures (`fail_status_unknown_word`).
- **F6.** Rule 4.4 reads the parent whitelist. This branch's parent still has the pre-`eb93286c` Lane C2b row, so a range gate rejects `tasks/WG.00.12/c2_governance_state.md` until the branch is rebased onto that main commit or the epoch moves. That is the checker applying 4.4, not a hole in it.
- **Hook not installed.** `DEC-004` is still open. The install path was tested inside the throwaway repository only.

## Verdict

VERDICT: PASS

`7619c9cb68b1594d62a8dee79948dd42799bdcf9` meets Directive 001-I §C as stated in `BRIEF.md`. The fresh-clone suite exited 0 with 254 passed, 0 failed, and 94 of 94 mutants killed.
