# Lane J Brief: Standard Worker Launcher & Pre-Push Guard (Task WG.00.12)

**Lane:** lane-j  
**Task ID:** WG.00.12  
**Branch:** task/lane-j  
**Writer:** claude  
**Reviewer:** grok  
**Allowed Paths:**
- `tools/ops/launch_worker.ps1`
- `tools/ops/gate_tests.json`
- `tools/ops/hooks/pre-push`
- `tools/ops/install_lane_hooks.ps1`
- `tools/ops/test_launch_worker.ps1`
- `tools/ops/README.md`
- `tools/ops/resume_queue.ps1`
- `tools/ops/test_resume_queue.ps1`
- `tasks/WG.00.12/lane-j/**`

---

## Standing Directives & Non-Negotiables
1. **NO ART (DEC-007):** Never generate, request or integrate art, and never tell anyone to.
2. **Execution Discipline:** Run tests in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not push. Do not merge. Write only inside allowedPaths.
3. **Disjoint Scope:** Do not touch Lane I files (`tools/governance/merge_gate.js`, etc.). Keep write sets strictly disjoint.

---

## Deliverables & Specification

### 1. `tools/ops/launch_worker.ps1`
Standard runner for launching workers. Usage:
`tools/ops/launch_worker.ps1 -Lane <lane> -Provider claude|grok -BriefPath <path> -TimeoutMinutes <n> [-RegistryPath <path>]`
Must:
- Refuse to start if the brief is missing or empty.
- Save the exact prompt to `tasks/<task-id>/<lane>/launches/<yyyyMMdd_HHmmss>_prompt.txt` (tracked).
- Tee stdout + stderr to log file (`C:\Users\snewt\.deus_worktrees\logs\<lane>\<runid>.log`) and flag a 0-byte log as a failure.
- Record PID, start, end, exit code, and state in `docs/telemetry/sessions/active_workers.json`.
- Kill the process tree on timeout and record state `TIMEOUT`.
- Detect headless exit anomalies:
  - Worker exited while child processes it spawned are still alive -> record `ORPHANED-CHILDREN`.
  - Worker exited with a dirty working tree and no new commit -> record `EXITED-NO-COMMIT`.
- Set per-agent git identity ($env:GIT_AUTHOR_NAME and $env:GIT_COMMITTER_NAME to deus-claude / deus-grok).
- After run completes, inspect git status and list every changed file (committed or uncommitted) outside the lane's `allowedPaths`.
- Detect usage/quota/rate-limit exit per provider from log output, recording state `USAGE-EXHAUSTED` (with exact matched error text and reset timestamp).
- Queue interrupted lanes in `docs/telemetry/sessions/provider_status.json` with lane, provider, brief path, and last commit hash for auto-resume.

### 2. `tools/ops/resume_queue.ps1` & Auto-Resume
- Manages auto-resume of quota-exhausted workers from `docs/telemetry/sessions/provider_status.json`.
- When provider `resetAt` has elapsed, execute a cheap probe (one-line test prompt, 60s timeout).
- If probe succeeds: set provider state `AVAILABLE` and relaunch lane via `launch_worker.ps1` with prompt: "resume from HEAD <sha>; re-read BRIEF and the uncommitted diff first".
- If probe fails: back off `resetAt` by +30 minutes.
- Enforce: never run two concurrent sessions on one lane; never relaunch a lane with an active PID.
- Enforce failover safety: lane may failover to another provider ONLY if writer and reviewer remain distinct AI families (never Grok writer + Grok reviewer).
- Include Codex in probes when eligible.

### 3. `tools/ops/gate_tests.json`
Schema: `{"gate": [...], "quarantine": [{"path": ..., "reason": ...}]}`.
Seed `gate` with suites verified passing on clean clones:
- `tools/check_deus_syntax.js`
- `tools/test_palette.js`
- `tools/governance/test_check_claims.js`
- `tools/test_strata_cuts_and_caves.js`
- `tools/test_new_game_year0.js`
- `tools/test_history_materialization_and_world_age.js`
- `tools/test_historical_carrying_capacity.js`
- `tools/test_geology_strata.js`
- `tools/test_strata_foundation.js`
Seed `quarantine` with:
- `tools/test_generated_z2_cut_proof.js` (reason: exits 1 on main; Lane H rework in progress)
- Any tests failing due to retired plugins, missing U7 install, or absent reference data, each with explicit reason.

### 4. `tools/ops/hooks/pre-push` & `tools/ops/install_lane_hooks.ps1`
- `pre-push`: blocks `git push` unless `$env:DEUS_INTEGRATOR == '1'`.
- `install_lane_hooks.ps1`: enables `git config extensions.worktreeConfig true` and sets `git config --worktree core.hooksPath <hooks_dir>` for lane worktrees ONLY. Never sets global or repository-wide hooks path.

### 5. Test Suites & Documentation
- `tools/ops/test_launch_worker.ps1`: tests prompt tracking, logging, timeout kill, headless-exit detection, and scope boundary checks.
- `tools/ops/test_resume_queue.ps1`: tests exhaustion state handling, backoff, PID collision prevention, and reviewer role preservation.
- `tools/ops/README.md`: architectural guide documenting operations, hooks, and recovery.
