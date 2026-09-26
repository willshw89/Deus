# Grok review — WG.00.12 Lane J (standard worker launcher and resume queue)

Reviewed commit: `5a1ec388a630f9b7b81f23c4cd37caf35a3efb16`
Branch: `task/lane-j`
Subject: `[claude] WG.00.12 fix scope-check escape and resume exit code; README; evidence`

VERDICT: PASS

Independent read of `tools/ops/launch_worker.ps1`, `tools/ops/resume_queue.ps1`, `tools/ops/test_launch_worker.ps1`, `tools/ops/test_resume_queue.ps1`, and `tools/ops/README.md`, plus `tools/ops/hooks/pre-push`, `tools/ops/install_lane_hooks.ps1`, and `tools/ops/gate_tests.json` as they exist at that commit. The worktree HEAD during this review was `493cb8c0` (one later launch-prompt commit). `git diff 5a1ec388 HEAD -- tools/ops` is empty, so the ops scripts match the reviewed commit.

## Fresh-clone re-run

Clone: `%TEMP%\lane-j-review-5a1ec388` (local clone, detached at `5a1ec388a630f9b7b81f23c4cd37caf35a3efb16`).

```
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1
```

Exit code **0**. 24 tests, **147 checks, 0 failed**. `RESULT: PASS (147 checks, 0 failed)`.

```
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_resume_queue.ps1
```

Exit code **0**. 17 tests, **68 checks, 0 failed**. `RESULT: PASS (68 checks, 0 failed)`.

## Scope-check escape

`Get-DeusGitLines` streams NUL-separated git records (`return @($text.Split([char]0) ...)`). Callers collect them with `@()`. The previous `return , @(...)` wrapped that list. The scope check then saw one nested object, PowerShell joined it on a space, and `src/allowed/**` (`^src/allowed/.*$`) matched the whole string, so a forbidden path committed beside an allowed path was dropped.

The fix leaves each committed path as its own string. Literal glob characters are regex-escaped; `*` and `?` stay inside one segment; `**` crosses directories. Uncommitted porcelain records are split per `-z` record and the path starts at index 3, so that path was not the join bug.

`scope_check` commits `src/allowed/y.txt` and `src/forbidden/x.txt` and leaves `stray.txt` plus `src/allowed/ok.txt` dirty. In this run: `committed_outside_listed`, `uncommitted_outside_listed`, and `exactly_two` passed. `outOfScope` was the two forbidden paths. Launcher exit for that run is 2 (`OUT-OF-SCOPE`).

## Exit-code tracking

`resume_queue.ps1` keeps the `Start-Process` handle (`$null = $proc.Handle`) before it polls. A launcher that exits before it registers a run reports that exit code in `lastResumeError` and the queue entry returns to `QUEUED`. `launch_failure_requeues` passed, including `error_recorded` (text matches `exited with code 1`) and suite exit 1 for that failure.

`launch_worker.ps1` stores `exitCode` on the registry entry and writes `EXIT=<code>` / `STATE=<state>` to `<runId>.exit`. `commit_run` passed `registry_exit_code` (0) and `exit_file` (`EXIT=0`). Timeout, usage, empty log, and scope failures exit 2 with the matching state; refusals exit 1.

## Identity protection

The worker process gets `GIT_AUTHOR_NAME` and `GIT_COMMITTER_NAME` = `deus-<provider>` (`deus-claude`, `deus-grok`, `deus-codex`) and `DEUS_RUN_ID`. `DEUS_INTEGRATOR`, `CLAUDECODE`, and `CLAUDE_CODE_ENTRYPOINT` are removed, so a worker does not inherit the integrator push bit.

The harness clears inherited `GIT_AUTHOR_*` / `GIT_COMMITTER_*` before the suite, so those checks fail if the launcher stops setting them. `commit_run` passed `env_author` (`author=deus-claude`), `env_committer`, `env_integrator_stripped` (`integrator=[]`), and `commit_author_identity` (`deus-claude|deus-claude`).

Same-family pairs are refused at launch and on failover. Lane fixture writer `claude` / reviewer `grok`: `family_refusal` passed (grok-as-writer and claude-as-reviewer, exit 1). `failover_refuses_same_family` passed (`grok: same AI family (xai)`). `reviewer_role_preserved` relaunched the reviewer as codex, role still `reviewer`.

## Hook installation

`hooks/pre-push` exits 0 only when `DEUS_INTEGRATOR` is exactly `1`; every other value exits 1 after draining stdin. `install_lane_hooks.ps1` refuses the main worktree (`git-dir` equals `git-common-dir`), copies the hook under the common git dir, sets `extensions.worktreeConfig true`, and sets `core.hooksPath` with `git config --worktree` only. It then checks that the lane resolves to that directory, that `--local` and the main worktree do not, and that the global `core.hooksPath` is unchanged.

`hooks_install_and_block` passed: worktree-scoped path, main not guarded, repository-wide path unset, global config has no `hooksPath`, hook bytes match, push blocked, `DEUS_INTEGRATOR=true` blocked, `DEUS_INTEGRATOR=1` allowed, main push not guarded. `hooks_refuse_main` passed (exit 1, main still unguarded).

## Queue resume

One pass probes claude, grok, and codex when state is `EXHAUSTED` or `LIMITED` and `resetAt` is due or missing (plus any `-Probe` name). A probe is one line, 60s by default, and passes only on exit 0 with `OK` and no usage error. Failure sets `resetAt` to max(current, now) + 30 minutes. Success sets the provider `AVAILABLE` and clears `resetAt`.

Relaunch goes through `launch_worker.ps1` with `-ResumeFromSha` and the same role. The prompt's first line is `resume from HEAD <sha>; re-read BRIEF and the uncommitted diff first`. A lane is skipped while a registry entry is `RUNNING` with a live worker PID or a live launcher PID (start time must match, so a reused PID does not count), while `lane.lock` is held, or when that lane was already chosen in the pass. Failover requires `-AllowFailover` and a different AI family from the other role.

This run passed `not_due_no_probe`, `probe_fail_backoff` (claude, grok, and codex all probed; resets at `2026-09-26T12:30:00Z`), `probe_ok_relaunch`, `live_pid_blocks`, `launcher_pid_blocks`, `dead_pid_does_not_block`, `lane_lock_blocks`, `one_session_per_lane`, `codex_probed`, `no_failover_without_flag`, `dry_run_writes_nothing`, and `end_to_end_real_launcher` (`resume_prompt` exact, run `COMPLETED`, `resumeVerified` true).

## Notes

`gate_tests.json` contains the nine required gate paths and quarantines `tools/test_generated_z2_cut_proof.js` with a reason. `gate_registry` passed (schema, seed list, no overlap, paths exist). The README states the rest of `tools/` has not been swept for further quarantine entries. This review did not re-run those gate suites.

A kill of `resume_queue.ps1` after it writes `RESUMING` and before the post-launch update leaves that entry in `RESUMING`. Later passes only relaunch `QUEUED`. The tested failure path (launcher exits before register) returns the entry to `QUEUED` with the exit code.
