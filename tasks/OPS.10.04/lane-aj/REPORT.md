# OPS.10.04 lane-aj — merge_gate LF clones

Writer: grok. Branch: `task/lane-aj`. No art was generated.

## What changed

`makeClone` in `tools/governance/merge_gate.js` now checks out every gate-test clone so the work-tree bytes equal the committed blobs, whatever the caller's global or system line-ending config is.

On `git clone --shared --no-checkout` the command passes `-c core.autocrlf=false -c core.eol=lf -c core.safecrlf=false`. Those three keys are written into the clone's local config before checkout. The checkout command passes the same three `-c` overrides, plus the existing `advice.detachedHead=false`. Local config overrides a caller's global and system config; the checkout `-c` overrides the local values for that command.

`core.autocrlf=false` stops `core.autocrlf=true` from smudging an LF blob into CRLF. `core.eol=lf` does the same for a `text` or `text=auto` path whose `eol` attribute is unspecified (a caller's `core.eol=crlf`, or the Windows native default, would otherwise write CRLF). `core.safecrlf=false` stops a caller's `core.safecrlf` from refusing that checkout. A blob that already contains CRLF is left as stored when `text=auto` does not convert it. An explicit `eol=` attribute in the tree still wins, because that is repository content.

No other gate decision changed. Scope, review, the pushed check, the main check, and merge execution are the same. Existing assertions were not weakened. The real user and system git configs were not modified. The regression uses a file under the test's temp directory only.

`--mutant=clone_autocrlf_off` drops all three settings. `test_merge_gate.js` case `pass_clone_lf_under_autocrlf_true` is the kill case. `MERGE_GATE.md` §4, §5 (c), §10 and §11 describe this.

## Evidence

On this machine `git config --show-origin --get-regexp core.autocrlf` reads `true` from `C:/Users/snewt/AppData/Local/grok/git/2.55.0.windows.5/etc/gitconfig` and from `C:/Program Files/Git/etc/gitconfig`, and `false` from the repository local config. A fresh clone does not copy the repository local config, so it was checking out CRLF. Git 2.55.0.windows.5.

The regression does not use those files. `setupFixture` writes `%TEMP%\deus-merge-gate-test-*\autocrlf-true.gitconfig`:

```
[core]
	autocrlf = true
	eol = crlf
	safecrlf = true
```

The case sets `GIT_CONFIG_GLOBAL` to that path for the gate process only. The lane's gate test reads `src/feature.js` and requires those bytes to equal the LF blob committed for that path (`module.exports = { add: (a, b) => a + b };\n`). The harness deletes the temp repository, including the temp gitconfig, at the end of the run.

A focused run of that case (`node tools/governance/test_merge_gate.js --only=pass_clone_lf`) printed `PASS pass_clone_lf_under_autocrlf_true` and `RESULT: 9 passed, 0 failed` (8 unit checks plus the case). The full suite below includes the same case and `PASS mutant_clone_autocrlf_off_killed`: with the three settings dropped, that same fixture run refuses the gate.

Throwaway probes used to choose `core.eol` and `core.safecrlf` lived under `%TEMP%\lf-probe-*` and were deleted before this report's commit.

## Open Owner questions

None.

## Follow-ups

None.

## Gate tests

Commands from `tasks/OPS.10.04/lane-aj/lane.json`, run after the implementation commit and before this report commit. Exit code 0 for both.

### `node tools/governance/test_merge_gate.js`

Runner wall time 319.48 s. Exit 0.

```
=== merge_gate.js tests (WG.00.12 Lane I) ===
temp repository: C:\Users\snewt\AppData\Local\Temp\deus-merge-gate-test-SYikWH
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
PASS pass_clone_lf_under_autocrlf_true
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
PASS mutant_clone_autocrlf_off_killed
PASS mutant_push_off_killed
PASS mutant_tracking_off_killed
PASS mutant_main_clean_off_killed
PASS mutant_main_sync_off_killed
PASS source_mutant_dry_run_merges_killed
PASS source_mutant_fast_forward_merge_killed
PASS source_mutant_push_after_merge_killed
RESULT: 107 passed, 0 failed
```

### `node tools/check_deus_syntax.js`

Exit 0.

```
Checked 52 DEUS plugin files. Errors: 0
```
