# OPS.20.06 lane-ak

Writer: grok. Reviewer: gemini (not run here). This report does not certify the lane.

## What changed

`tools/ops/launch_worker.ps1` now takes an optional `-Effort` (`low`, `medium`, `high`, `xhigh`, `max`, `ultra`). It is applied only when `-ProviderArgs` is not passed. A value below that provider's DEC-032 floor is raised to the floor. A value above the provider's own scale is capped at the highest level that CLI accepts, which is still at or above the floor. Omitting `-Effort` uses the floor.

| Provider | Floor | Highest emitted | Flag |
|---|---|---|---|
| claude | high | max (`ultra` is sent as `max`) | `--effort` |
| grok | xhigh | max (`ultra` is sent as `max`) | `--reasoning-effort` |
| codex | xhigh | ultra | `exec -c model_reasoning_effort="<level>"` |
| gemini | high | high (`xhigh`, `max` and `ultra` stay high) | no separate thinking flag; see below |

`-ProviderExe` together with `-ProviderArgs` is the historical override used by the tests and the PM wrappers. That argument string is passed through unchanged, and `-Effort` combined with `-ProviderArgs` is refused. `-ProviderExe` alone runs that executable with the built-in command, which is how the tests substitute a stub.

`gemini` is a known provider for writer and reviewer. The executable name is `gemini` on `PATH`. The npm shim is a `.cmd`, so the process started is `cmd.exe /d /s /c` with that command. No path outside the repo is hard-coded. The worker command is `gemini --model gemini-3.1-pro-preview --skip-trust --approval-mode yolo --output-format stream-json`, prompt on stdin. Gemini CLI 0.61.0 (the version named in DEC-032) has no thinking-level flag. The built-in alias `gemini-3.1-pro-preview` extends `chat-base-3`, whose `thinkingLevel` is `HIGH`, so the model argument is how thinking HIGH is passed. Same-family pairs are still refused (`gemini` and `agy` are both google). A usage line `RESOURCE_EXHAUSTED` is recognised for gemini. The registry format, timeouts and the pre-push guard are unchanged. Effort is not stored on the registry entry. Probes do not get the claude, grok or codex effort flags. `resume_queue.ps1` was not edited; it probes gemini only when that provider is already exhausted or limited, because gemini is now a known provider. Its default failover order is still claude, codex, grok.

`tools/ops/test_launch_worker.ps1` adds `effort_maps_to_provider_flags`, `effort_floor_raises`, `gemini_provider` and `provider_args_byte_identical`. Launches use the existing fake worker or a stub exe compiled in the temp fixture. No test starts claude, grok, codex or gemini. Each of those four cases has a mutant, and the sweep caught all 44 (the previous 40 plus `effort_flag_not_applied`, `effort_floor_not_raised`, `gemini_model_downgraded`, `provider_args_gain_effort`).

## Evidence besides the gates

- `test_launch_worker.ps1 -Mutants`: `MUTANTS: 44/44 caught` (316 s). The four new faults failed `effort_maps_to_provider_flags`, `effort_floor_raises`, `gemini_provider` and `provider_args_byte_identical` respectively.
- `test_resume_queue.ps1`: `RESULT: PASS (95 checks, 0 failed)`. `all_three_probed` is still claude, codex, grok. Adding gemini to the known-provider list did not probe it unless its status is exhausted or limited.

## Open Owner questions

1. Should a Gemini review be started by `launch_worker.ps1 -Provider gemini`, or only through the PM `start_review` wrapper? This lane starts `gemini` from the launcher. It does not call `pm_ops\start_review.ps1`.
2. For claude, grok and codex, should a launch that does not pass `-ProviderArgs` also pin the DEC-032 model id, and if so the standard model or the big-lane model? This change passes `--model` only for gemini. The other three receive an effort flag and otherwise keep the CLI's own model unless the caller passes `-ProviderArgs`.

## PROPOSED-AK follow-ups

- PROPOSED-AK-01: Pin the DEC-032 model ids on the built-in claude, grok and codex commands, with a way to choose standard versus big.
- PROPOSED-AK-02: Record the applied effort on the registry entry. The registry format was left unchanged.
- PROPOSED-AK-03: On a gemini limit error, fall back to `gemini-3.8-flash` at thinking HIGH and return to `gemini-3.1-pro-preview` after reset.
- PROPOSED-AK-04: Add gemini to the default `-FailoverOrder` in `resume_queue.ps1`. That file is outside this lane's allowedPaths.
- PROPOSED-AK-05: When Gemini CLI grows a thinking-level argument, pass that level beside `--model` instead of relying on the `chat-base-3` alias.

## Gate output

Command: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1`

```
test_launch_worker: ops C:\Users\snewt\.deus_worktrees\lane-ak\tools\ops; temp C:\Users\snewt\AppData\Local\Temp\deus_lw_test_25384_96999
TEST refuse_missing_brief
  PASS exit_1
  PASS says_not_found
  PASS no_registry_entry
  PASS no_prompt_file
  (0.6 s)
TEST refuse_empty_brief
  PASS exit_1
  PASS says_empty
  PASS no_registry_entry
  PASS no_prompt_file
  (0.5 s)
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
  (2.3 s)
TEST resume_prompt
  PASS exit_0
  PASS first_line_exact
  PASS still_names_brief
  PASS registry_resume_sha
  PASS no_head_mismatch
  (2.0 s)
TEST push_rule_from_brief
  PASS exit_0
  PASS no_do_not_push
  PASS rule2_pushes_own_branch
  PASS ends_with_final_sha
  PASS worker_got_it
  PASS registry_push_rule
  (2.1 s)
TEST push_rule_other_branch_is_not_a_push
  PASS exit_0
  PASS do_not_push_kept
  PASS registry_no_push
  (2.1 s)
TEST push_rule_lane_json_true
  PASS exit_0
  PASS push_rule
  PASS registry_source_lane_json
  (2.1 s)
TEST push_rule_lane_json_false_wins
  PASS exit_0
  PASS do_not_push
  PASS registry_source_lane_json
  (1.9 s)
TEST push_rule_lane_json_invalid_refused
  PASS exit_1
  PASS says_push_boolean
  PASS no_registry_entry
  (0.9 s)
TEST prompt_file_recorded_then_reused
  PASS first_exit_0
  PASS first_verbatim
  PASS registry_prompt_file
  PASS second_exit_0
  PASS second_run_is_new
  PASS saved_prompt_reused
  PASS no_do_not_push_injected
  PASS registry_saved
  (3.6 s)
TEST reuse_with_resume_does_not_stack
  PASS first_has_one_resume_line
  PASS exit_0
  PASS reused_the_copy
  PASS source_gone_was_skipped
  PASS exactly_one_resume_line
  PASS new_sha_on_top
  (3.6 s)
TEST explicit_prompt_file_resume_not_stacked
  PASS without_resume_verbatim
  PASS exit_0
  PASS one_resume_line_new_sha
  (3.5 s)
TEST relaunch_note_dropped_when_reused
  PASS explicit_note_kept
  PASS exit_0
  PASS reused
  PASS note_dropped_resume_on_top
  (3.6 s)
TEST reviewer_prompt_never_reused_for_writer
  PASS reviewer_run_recorded
  PASS exit_0
  PASS writer_role
  PASS no_reviewer_text
  PASS generated_writer_prompt
  PASS skipped_registry_reviewer_by_role
  PASS skipped_committed_reviewer
  PASS skipped_unknown_role
  (3.9 s)
TEST writer_prompt_never_reused_for_reviewer
  PASS writer_exit_0
  PASS reviewer_role
  PASS no_writer_text
  PASS generated_reviewer_prompt
  (3.4 s)
TEST committed_prompt_reused_without_registry
  PASS exit_0
  PASS reused_committed_copy
  PASS worker_got_pm_prompt
  (4.3 s)
TEST generated_prompt_not_reused
  PASS first_generated_no_push
  PASS exit_0
  PASS regenerated_with_push
  PASS old_generated_skipped
  (5.6 s)
TEST other_task_or_provider_not_reused
  PASS exit_0
  PASS generated
  PASS skipped_task
  PASS skipped_provider
  (2.6 s)
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
  (7.7 s)
TEST orphaned_children
  PASS exit_2
  PASS state_orphaned
  PASS orphan_pid_recorded
  PASS orphan_left_running
  PASS worker_committed
  (2.8 s)
TEST kill_orphans
  PASS state_orphaned
  PASS orphans_killed_flag
  PASS orphan_dead
  (3.3 s)
TEST exited_no_commit
  PASS exit_2
  PASS state_exited_no_commit
  PASS dirty_file_listed
  PASS no_new_commit
  (1.6 s)
TEST clean_no_commit_is_ok
  PASS flag_absent
  (1.6 s)
TEST scope_check
  PASS exit_2
  PASS state_out_of_scope
  PASS entries_are_paths
  PASS committed_outside_listed
  PASS uncommitted_outside_listed
  PASS allowed_not_listed
  PASS committed_allowed_not_listed
  PASS exactly_two
  (2.0 s)
TEST empty_log
  PASS exit_2
  PASS state_empty_log
  PASS log_bytes_0
  PASS log_file_exists
  (1.6 s)
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
  (1.7 s)
TEST usage_clock_reset
  PASS state_usage
  PASS reset_source_clock
  PASS reset_5pm_ct
  PASS reset_within_a_day
  (1.7 s)
TEST usage_codex_relative
  PASS state_usage
  PASS reset_2h05
  PASS matched_text
  PASS codex_exhausted
  (1.7 s)
TEST usage_grok_default
  PASS role_reviewer
  PASS state_usage
  PASS default_reset_60
  PASS matched_429
  (1.6 s)
TEST usage_no_false_positive
  PASS exit_0
  PASS state_completed
  PASS no_usage
  PASS not_queued
  (1.8 s)
TEST lane_lock
  PASS exit_1
  PASS says_locked
  PASS no_run
  (3.7 s)
TEST active_pid_refusal
  PASS exit_1
  PASS says_live_worker
  PASS no_new_entry
  (0.6 s)
TEST stale_entry_marked_lost
  PASS exit_0
  PASS stale_marked_lost
  (1.9 s)
TEST family_refusal
  PASS grok_writer_refused
  PASS claude_reviewer_refused
  PASS no_run
  (0.8 s)
TEST branch_refusal
  PASS exit_1
  PASS says_branch
  (0.6 s)
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
  (2.7 s)
TEST hooks_refuse_main
  PASS exit_1
  PASS says_main
  PASS main_not_guarded
  PASS global_not_set
  (0.4 s)
TEST effort_maps_to_provider_flags
  PASS claude_flag_built
  PASS grok_flag_built
  PASS codex_flag_built
  PASS gemini_line_unchanged
  PASS claude_exit
  PASS claude_argv
  PASS claude_stdin
  PASS grok_exit
  PASS grok_argv
  PASS grok_prompt_path
  PASS grok_stdin_empty
  PASS codex_exit
  PASS codex_argv
  PASS codex_stdin
  (4.8 s)
TEST effort_floor_raises
  PASS grok_low_raised
  PASS grok_omitted
  PASS claude_medium_raised
  PASS claude_high_stays
  PASS claude_xhigh_stays
  PASS claude_ultra_capped
  PASS grok_max_stays
  PASS grok_ultra_capped
  PASS codex_high_raised
  PASS codex_ultra_stays
  PASS gemini_low_raised
  PASS gemini_ultra_capped
  PASS bad_effort
  PASS grok_low_exit
  PASS grok_low_argv
  PASS omitted_exit
  PASS omitted_is_floor
  PASS invalid_exit
  PASS invalid_says
  PASS invalid_no_registry
  (3.6 s)
TEST gemini_provider
  PASS known_provider
  PASS writer_exit
  PASS writer_role
  PASS writer_command
  PASS writer_stdin
  PASS writer_identity
  PASS reviewer_exit
  PASS reviewer_role
  PASS reviewer_floor_keeps_high_model
  PASS reviewer_commit_names_role
  PASS resource_exhausted_pattern
  PASS same_family_refused
  PASS same_family_no_run
  (3.9 s)
TEST provider_args_byte_identical
  PASS exit_0
  PASS command_is_the_fake_worker
  PASS no_effort_flag_added
  PASS combo_refused
  PASS no_second_entry
  (2.0 s)
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
RESULT: PASS (268 checks, 0 failed)
```

Command: `node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```
