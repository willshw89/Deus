# tools/ops — worker launcher, resume queue and push guard (WG.00.12 Lane J)

Operations tooling for running AI workers in lane worktrees (`%USERPROFILE%\.deus_worktrees\<lane>`).
Windows PowerShell 5.1 scripts; nothing here is loaded by the game.

| File | What it does |
|---|---|
| `launch_worker.ps1` | Starts one provider CLI session (claude, grok, codex or gemini) in a lane worktree, watches it to the end and records what happened. Also the shared function library for the other scripts. |
| `resume_queue.ps1` | One pass of auto-resume: probes providers whose usage limit should have reset, then relaunches queued lanes. Run it on a schedule. |
| `gate_tests.json` | The suites the merge gate runs, and the suites it deliberately does not run (with reasons). |
| `hooks/pre-push` | Blocks `git push` unless `DEUS_INTEGRATOR=1`. |
| `install_lane_hooks.ps1` | Installs the pre-push guard in lane worktrees only (worktree-scoped git config). |
| `test_launch_worker.ps1` | Tests for the launcher, the hook, the installer and `gate_tests.json`. |
| `test_resume_queue.ps1` | Tests for the resume queue, including an end-to-end relaunch through the real launcher. |

Rules the tools enforce: one session per lane; writer and reviewer of a lane are always different AI families;
every change outside the lane's `allowedPaths` is reported. Pushing: since Owner directive 0028-AC A0 (2026-09-26,
about 01:50 CT) the PM opens lanes whose briefs tell the worker to push its own lane branch
(`git push origin task/<lane>`) and end with a `FINAL SHA:` line. The launcher's default prompt follows the brief
(section 2, "The prompt"). The pre-push guard of section 5, where installed, still blocks every push without
`DEUS_INTEGRATOR=1`.

---

## 1. Lane definition: `lane.json`

The launcher reads `lane.json` from the folder that holds the brief (`tasks/<task>/<lane>/lane.json`):

```json
{
  "lane": "lane-j",
  "taskId": "WG.00.12",
  "branch": "task/lane-j",
  "writer": "claude",
  "reviewer": "grok",
  "allowedPaths": ["tools/ops/launch_worker.ps1", "tasks/WG.00.12/lane-j/**"]
}
```

- `taskId` names the prompt folder. Without it the launcher takes it from a brief path of the form `tasks/<task>/...`.
- `branch`: the launcher refuses to start if the worktree is on a different branch.
- `writer` / `reviewer`: used to pick the session's role and to refuse same-family pairs.
- `allowedPaths`: globs, relative to the repo root. `**` crosses folders, `*` and `?` stay inside one folder,
  matching is case-insensitive. Without `lane.json`, pass `-AllowedPaths a,b,c`. With neither, the launcher refuses
  (a scope check would be impossible).
- `push` (optional, WG.00.12b): `true` or `false`. It decides whether the generated default prompt tells the worker
  to push the lane branch; without it the brief decides (section 2, "The prompt"). Any other value refuses the
  launch (exit 1). `tools/governance/merge_gate.js` accepts the field and refuses a non-boolean value
  (`MANIFEST_INVALID`).

## 2. `launch_worker.ps1`

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/launch_worker.ps1 `
    -Lane lane-j -Provider claude -BriefPath tasks/WG.00.12/lane-j/BRIEF.md -TimeoutMinutes 240
```

Run it from any folder; it does not depend on the current directory. The launcher runs in the foreground
and returns when the worker has finished.

### Before it starts (refusals exit 1; nothing is launched and nothing is recorded)

- `-Lane`, `-Provider` (claude | grok | codex | gemini), `-BriefPath`, `-TimeoutMinutes` > 0 are required.
- `-Effort` (optional): `low`, `medium`, `high`, `xhigh`, `max` or `ultra`. It is applied only when `-ProviderArgs` is not given. The launcher raises a lower value to that provider's DEC-032 floor and does not emit a level above the provider's own scale (that cap is still at or above the floor). When `-Effort` is omitted, the floor is what gets passed. `-Effort` together with `-ProviderArgs` is refused. Passing `-ProviderArgs` without `-Effort` is unchanged.
- The worktree (`-Worktree`, default `<WorktreeRoot>\<lane>`) must exist and be the top of a git worktree.
- The brief must exist, be non-empty (not just whitespace) and be inside the worktree.
- The worktree must be on `lane.json`'s `branch`.
- Role: `-Role writer|reviewer`, or taken from `lane.json` (provider = writer → writer, = reviewer → reviewer,
  neither → writer). The provider must not share an AI family with the lane's other role.
- One session per lane: the lane lock `<LogRoot>\<lane>\lane.lock` must be free (held open for the whole run and
  released by the OS if the launcher dies), and no registry entry for the lane may be `RUNNING` with a live
  worker PID or a live launcher PID. A PID only counts as live if its start time matches the recorded one, so a
  reused PID does not block a lane.
  `RUNNING` entries whose processes are gone are marked `LOST` at this point.
- The provider CLI must be found (`-ProviderExe` with `-ProviderArgs` overrides the whole command; the tests and the PM wrappers use this, and that pair is byte-for-byte the argument string they passed). `-ProviderExe` without `-ProviderArgs` runs that executable with the built-in command below, which is how the tests substitute a stub without starting a real model.
- `lane.json` `push`, when present, must be `true` or `false`. `-SavedPrompt` needs `-PromptFile`.

### The prompt (WG.00.12b)

Chosen in this order:

1. **`-PromptFile <file>`**: used as given. With `-ResumeFromSha`, this launch's resume line goes on top, and a
   resume line already at the top of the file is replaced, not stacked. Add `-SavedPrompt` when the file is an
   earlier launch's prompt (`resume_queue.ps1` does). The launcher then also drops a relaunch note: everything up to
   and including a line `--- original prompt follows ---`, the form the PM used for the lane-s relaunch
   (`tasks/WG.20.02/lane-s/launches/20260926_034739_prompt.txt`). Without `-SavedPrompt` that note is kept, because
   the PM may have written it for this launch.
2. **The lane's saved prompt** (`Find-DeusSavedPrompt`), when no `-PromptFile` is given. It is reused like a
   `-SavedPrompt` file: its old resume line and relaunch note are dropped, and this launch's resume line is added when
   `-ResumeFromSha` is set. Candidates, first usable one wins:
   - registry entries of the lane, newest `startedAt` first, with the **same `taskId`, `role` and `provider`**: the
     entry's `promptFile` (the file it was given), then its `launchPromptPath` (the saved copy);
   - prompt files committed at `HEAD` in `tasks/<task>/<lane>/launches/`, newest name first, whose adding commit has
     the launcher's subject `[ops] <task> <lane> launch prompt <stamp> (<role> <provider>)` with the same role and
     provider, and which have not been changed since.

   A candidate is passed over, with the reason recorded in `promptCandidatesSkipped`, when the file is missing or
   empty, when its registry entry or commit does not record the same role and provider, or when the launcher
   generated it. Older subjects without `(<role> <provider>)`, and the coordinator's
   `[gemini] Record Lane X ... launch prompt` commits, record neither, so their prompts are reused only through a
   registry entry. The effects:
   - A reviewer prompt is never reused for a writer, or a writer prompt for a reviewer. Reviewer launches with
     `-NoCommitPrompt` leave their prompt, uncommitted, in the same `launches/` folder. Their registry entry says
     `role: reviewer`, and uncommitted files are not candidates.
   - A prompt written for another provider is not reused (after a failover its first line and commit tag would
     name the wrong agent), and neither is a prompt of another task that happened to use the same lane name.
   - A prompt the launcher generated is never reused, so a pre-WG.00.12b default with "Do not push" is not carried
     forward. The default is generated again from the current brief. A generated prompt is recognised by its first
     line (`You are the primary implementer|independent reviewer for <lane> (Task <id>), running as <provider>.`,
     after any resume line) plus a `Standing rules:` line.
3. **The generated default** (`New-DeusLanePrompt`). Standing rule 2 depends on the push rule (`Get-DeusPushRule`):
   - `lane.json` `"push": true`, or no `push` field and a brief that contains `git push origin <branch>` (optionally
     `-u` / `--set-upstream`) for the lane's own branch (`lane.json` `branch`, else the worktree's branch). Rule 2
     then reads "... When finished, commit and push your own branch only: git push origin <branch>. Never push main or
     any other branch, never force-push, never set DEUS_INTEGRATOR; if the push is refused, say so and stop. Do not
     merge. ...", and the prompt ends with
     `Your final output line must be exactly: FINAL SHA: <sha> (pasted from git rev-parse HEAD after the push).`
   - Otherwise (`"push": false`, or a brief that names no push of the lane branch; `git push origin main` or another
     lane's branch does not count): rule 2 keeps "Do not push. Do not merge." and there is no FINAL SHA line.

   The brief match is plain text. A brief that says "never run git push origin task/lane-x" would count as asking
   for a push. `"push": false` overrides that.

### What a run records

| Where | What |
|---|---|
| `tasks/<task>/<lane>/launches/<yyyyMMdd_HHmmss>_prompt.txt` | The exact prompt, committed on the lane branch (`[ops] <task> <lane> launch prompt <stamp> (<role> <provider>)`; before WG.00.12b the subject ended at `<stamp>`) before the worker starts. `-NoCommitPrompt` writes it without committing. |
| `<LogRoot>\<lane>\<runId>.log` | stdout and stderr of the worker, line by line (UTF-8). `<LogRoot>` defaults to `%USERPROFILE%\.deus_worktrees\logs`. |
| `<LogRoot>\<lane>\<runId>.exit` | `EXIT=<code>` and `STATE=<state>`. |
| `docs/telemetry/sessions/active_workers.json` in the **main** worktree (`-RegistryPath` to override) | One entry per run, keyed by `runId` (`<lane>_<stamp>`). Written at start (`state: RUNNING`, launcher PID, paths, `baseCommit`) and again at the end. |
| `docs/telemetry/sessions/provider_status.json` (next to the registry, `-ProviderStatusPath` to override) | Only after a usage/quota/rate-limit stop: the provider's state and the lane's resume-queue entry (section 3). |

Registry entry fields: `runId lane provider role taskId state flags pid processStartedAt launcherPid
launcherStartedAt worktree branch briefPath launchPromptPath promptFile promptSource promptFrom
promptCandidatesSkipped pushRule pushRuleSource logPath launchTimeCT startedAt endedAt exitCode
timeoutMinutes baseCommit headCommit newCommits dirtyFiles outOfScope orphans orphansKilled usage timedOut
startError logBytes outputDrained branchAfter resumeFromSha resumeHeadMismatch pushGuardHooksPath gitIdentity`.

The prompt fields (WG.00.12b): `promptFile` is the source prompt, meaning the `-PromptFile` given or the saved prompt
reused (full path), or `null` for a generated prompt. `launchPromptPath` stays the copy actually sent.
`promptSource` is `file`, `saved` or `generated`. `promptFrom` says where it came from (`-PromptFile`,
`-PromptFile -SavedPrompt`, `registry run <runId> promptFile|launchPromptPath`, `committed <path>`, or
`generated (no saved <role> prompt for <provider>)`). `promptCandidatesSkipped` lists up to 20 candidates passed over,
with the reason. `pushRule` is `push` or `no-push`, and `pushRuleSource` is `lane.json`, `brief` or `default`; both
are recorded for every run, though only a generated prompt uses them.

Older entries in the registry (`"lane": "Lane C2b"`, `"state": "running"`, no `launcherPid`) are read as the
same lane (`lane-c2b`) and the same state.

### The worker's environment

- `GIT_AUTHOR_NAME` and `GIT_COMMITTER_NAME` = `deus-<provider>` (`deus-claude`, `deus-grok`, `deus-codex`, `deus-gemini`).
- `DEUS_RUN_ID` = the run id.
- `DEUS_INTEGRATOR` is removed, so a worker can never pass the push guard, even if the launching shell is the
  integrator's. `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT` are removed as well.
- Provider command lines, when `-ProviderArgs` is not set. Effort is added for a worker and not for a probe:
  claude `-p --output-format stream-json --verbose --dangerously-skip-permissions --effort <level>`
  (prompt on stdin); grok `--always-approve --prompt-file <prompt> --reasoning-effort <level>`;
  codex `codex.js exec -c model_reasoning_effort="<level>" --dangerously-bypass-approvals-and-sandbox --json -`
  (prompt on stdin); gemini, through `cmd.exe /d /s /c`, `gemini --model gemini-3.1-pro-preview --skip-trust --approval-mode yolo --output-format stream-json`
  (prompt on stdin). The executable name is `gemini` on `PATH`. The launcher does not hard-code a path
  outside the repo; `cmd.exe` is used only because the installed shim is a `.cmd`, which cannot be started
  with redirected streams. Gemini CLI 0.61.0 has no thinking-level flag. The built-in alias
  `gemini-3.1-pro-preview` extends `chat-base-3`, whose `thinkingLevel` is `HIGH`, so that `--model` value
  is how the thinking level is passed.

  DEC-032 floors, and the highest level the launcher will put on the command: claude floor `high`, highest
  `max` (`ultra` is sent as `max`); grok floor `xhigh`, highest `max` (`ultra` is sent as `max`); codex floor
  `xhigh`, highest `ultra`; gemini floor `high`, highest `high` (`xhigh`, `max` and `ultra` stay `high`,
  and the command stays the model alias above). The registry format does not record the effort. Multi-agent
  is left at the CLI default: the launcher does not pass `--no-subagents` or any other switch that turns it off.

### End states

After the worker exits (or is killed) the launcher checks the result. Every problem found is added to `flags`.
`state` is the first flag in this order, or `COMPLETED` if there are none:

| State / flag | Meaning |
|---|---|
| `START-FAILED` | The CLI could not be started (`startError`). |
| `TIMEOUT` | `-TimeoutMinutes` passed; the whole process tree was killed (taskkill /T plus every descendant seen while it ran). |
| `USAGE-EXHAUSTED` | The log shows a usage, quota or rate-limit error for this provider (see below). The lane is queued for resume. |
| `ORPHANED-CHILDREN` | The worker exited while processes it started were still alive (`orphans`: pid, name, command line). They are left running unless `-KillOrphans`. |
| `EXITED-NO-COMMIT` | No new commit since the prompt commit, and the tree is dirty (`dirtyFiles`). A clean tree with no commit is not flagged. |
| `EMPTY-LOG` | The log is 0 bytes. |
| `OUT-OF-SCOPE` | Files changed outside `allowedPaths`, committed since `baseCommit` or left uncommitted (`outOfScope`). Also printed. |
| `BRANCH-CHANGED` | The worktree ended on a different branch. |
| `FAILED` | Non-zero exit code with none of the above. |

Two more states are written by other code: `LOST` (a later launcher found a `RUNNING` entry whose processes
are gone) and `LAUNCHER-ERROR` (the launcher itself threw; it kills the worker tree first).

Exit codes: `0` COMPLETED with no flags; `1` refused; `2` finished in any other state; `3` launcher error.

### Usage / quota / rate-limit detection

Only error output counts, so a worker that writes *about* rate limits is not flagged:
- JSON event lines (stream-json, codex --json): only error-bearing events (`result` with `is_error: true`,
  events with an `error` field, event types containing `error`/`failed`). Assistant text, tool calls and tool
  results are ignored.
- Plain text lines: only the last 50 lines, and only if the exit code was non-zero or the line reads as an error.

Patterns are per provider plus a generic set (`Get-DeusUsagePatterns`). The last matching line is recorded
verbatim in `usage.matchedText`. The reset time comes from that text, first match wins:
`|<unix epoch>` → `epoch`; an ISO-8601 timestamp → `iso`; "try again in 2 hours 5 minutes" → `relative`;
"resets 5pm (America/Chicago)" / "resets Sep 27 at 3am" → `clock` (next such time after the run ended);
otherwise end time + `-DefaultResetMinutes` (60) → `default`.

## 3. Auto-resume: `provider_status.json` and `resume_queue.ps1`

`provider_status.json`:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-09-26T12:00:00Z",
  "providers": {
    "claude": { "state": "EXHAUSTED", "resetAt": "2026-09-26T17:00:00Z", "resetSource": "clock",
                "lastError": "...", "lastErrorAt": "...", "lastErrorRunId": "...",
                "lastProbeAt": "...", "lastProbeResult": "...", "lastProbeLog": "..." }
  },
  "queue": [
    { "lane": "lane-j", "taskId": "WG.00.12", "provider": "claude", "role": "writer", "writer": "claude",
      "reviewer": "grok", "briefPath": "...", "worktree": "...", "branch": "task/lane-j",
      "lastCommit": "<sha at the stop>", "state": "QUEUED", "reason": "USAGE-EXHAUSTED",
      "matchedText": "...", "resetAt": "...", "queuedAt": "...", "runId": "...", "timeoutMinutes": 240 }
  ]
}
```

A lane has at most one `QUEUED` entry; a new stop replaces it. Queue entry states: `QUEUED` → `RESUMING`
(chosen in this pass) → `RESUMED` (launcher started and registered its run: `resumeRunId`,
`resumeLauncherPid`, `resumeVerified`), or back to `QUEUED` with `lastResumeError` if the launcher failed to start.
`lastSkip` says why a queued lane was not relaunched on the last pass.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/resume_queue.ps1              # one pass
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/resume_queue.ps1 -DryRun      # report only, writes nothing
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/resume_queue.ps1 -AllowFailover
```

One pass does the following:
1. **Probe.** Each known provider (claude, grok, codex and gemini) whose state is `EXHAUSTED` or `LIMITED` and whose
   `resetAt` has passed or is unknown is probed, plus any named in `-Probe`. A probe sends
   "Reply with the single word OK." with a 60 s timeout (`-ProbeTimeoutSeconds`). It passes only on exit 0 with an
   `OK` reply and no usage error. Probe logs go to `<LogRoot>\_probes\`.
   - Pass: state `AVAILABLE`, `resetAt` cleared.
   - Fail: `resetAt` = max(`resetAt`, now) + 30 min (`-BackoffMinutes`); the state stays exhausted.
2. **Choose.** For each `QUEUED` lane, skip it if a registry entry for the lane is `RUNNING` with a live worker or
   launcher PID, if the lane lock is held, or if the lane was already chosen in this pass. The lane then runs on its
   own provider if that is `AVAILABLE`. With `-AllowFailover` it may move to the next `AVAILABLE` provider in
   `-FailoverOrder` (default claude, codex, grok), but only if that provider's family differs from the lane's
   other role. It keeps its role (a reviewer stays a reviewer).
3. **Relaunch.** Starts `launch_worker.ps1` hidden with `-ResumeFromSha <lastCommit>`, the same role, brief,
   worktree and timeout. The prompt's first line is exactly
   `resume from HEAD <sha>; re-read BRIEF and the uncommitted diff first`. The rest is the lane's saved prompt for
   the entry's task and role and the chosen provider (WG.00.12b). `Find-DeusSavedPrompt` (section 2, "The prompt")
   tries the queued run's own registry entry first (its `promptFile`, then its copy), then the lane's other entries,
   then committed launch prompts. It passes the result as `-PromptFile <path> -SavedPrompt`, so the old resume line and
   relaunch note are dropped and not stacked. When there is none, no `-PromptFile` is passed and the launcher makes
   the same search itself before falling back to its default. Each relaunch logs
   `<lane> prompt: saved <role> prompt <path> (<where from>)` or
   `<lane> prompt: launcher default (no saved <role> prompt for <provider>; passed over: ...)`, and the queue entry
   records `resumePromptFile` and `resumePromptFrom`. The entry becomes `RESUMED` once the
   launcher has registered a run under its PID (`resumeVerified: true`), or if the launcher is still running
   after `-LaunchVerifySeconds` (30) without registering (`resumeVerified: false`). If it exits first, the
   entry goes back to `QUEUED`. The launcher's own console output goes to
   `<LogRoot>\<lane>\resume_<stamp>.launcher.{out,err}.log`. If HEAD has moved since the stop, the new
   run's registry entry has `resumeHeadMismatch: true`.

The relaunched launcher keeps running after `resume_queue.ps1` returns; that is its job. Watch it through the
registry. Exit codes: `0` pass finished; `1` a relaunch failed to start; `2` bad arguments or unreadable files.

AI families (`Get-DeusProviderFamily`): claude/fable/opus/sonnet/haiku → anthropic; grok → xai;
codex/astra/openai/gpt → openai; gemini/antigravity/agy → google. For example, Grok never writes for a Grok
reviewer, and Claude never reviews a Claude writer.

## 4. `gate_tests.json`

```json
{ "gate": ["tools/check_deus_syntax.js", "..."],
  "quarantine": [{ "path": "tools/test_generated_z2_cut_proof.js", "reason": "..." }] }
```

- `gate`: suites that must exit 0 before a merge. Only add a suite after it has passed on a clean checkout.
- `quarantine`: suites that are known to fail for a stated reason (a retired plugin, a missing U7 install, absent
  reference data, rework in progress). Each needs a `path` and a `reason`. A path is never in both lists.
- `test_launch_worker.ps1` (`gate_registry`) checks the schema, the required seed suites, the z2 quarantine,
  no overlap or duplicates, and that every path exists.

Seed verification, 2026-09-26, lane-j worktree (main + tools/ops, `git status --ignored` clean apart from
tools/ops), `node <suite>` one at a time: all nine `gate` suites exited 0;
`tools/test_generated_z2_cut_proof.js` exited 1. The other ~170 suites under `tools/` have not been swept for
quarantine candidates yet.

## 5. Push guard: `hooks/pre-push` and `install_lane_hooks.ps1`

`hooks/pre-push` exits 1 with `pre-push: BLOCKED push of '<branch>' to '<remote>'` unless the environment has
`DEUS_INTEGRATOR` set to exactly `1`. Only the integrator sets it, in its own shell. Workers started by the
launcher never have it.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/install_lane_hooks.ps1 -Worktree C:\Users\snewt\.deus_worktrees\lane-j
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/install_lane_hooks.ps1 -AllLanes        # every task/lane-* worktree
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/install_lane_hooks.ps1 -AllLanes -Check # report only
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/install_lane_hooks.ps1 -Worktree <path> -Uninstall
```

Per lane worktree the installer:
1. refuses the main worktree (the canonical project keeps its normal hooks and pushes);
2. copies `hooks/pre-push` to `<git common dir>\deus_lane_hooks\` (`-HooksDir` uses another folder, no copy), so the
   guard does not depend on the lane's checked-out branch;
3. runs `git config extensions.worktreeConfig true` (repository config, needed once for worktree-scoped settings);
4. runs `git config --worktree core.hooksPath <that folder>`;
5. checks that the lane now uses the guard, that neither the main worktree nor the repository-wide
   (`--local`) config resolves to it, and that the global `core.hooksPath` did not change.

It never writes `core.hooksPath` at `--global`, `--system` or `--local` scope. It refuses a repository whose
shared config sets `core.worktree` or `core.bare=true` (git requires those to move to `config.worktree` first).

`core.hooksPath` replaces the hooks folder for that worktree, so hooks in `.git/hooks` do not run in a guarded
lane. On 2026-09-26 `.git/hooks` held only `*.sample` files. If a shared hook is added later, copy it into
`deus_lane_hooks` too.

The installer has not been run against the real repository yet: no lane is guarded, and `extensions.worktreeConfig`
is unset. Running it is the integrator's call, because step 3 changes the shared repository config.

## 6. Recovery

| Situation | What to do |
|---|---|
| `TIMEOUT` | The tree is already killed. Read the log tail and the uncommitted diff (`dirtyFiles`), then relaunch with `-ResumeFromSha <headCommit>` or a longer timeout. |
| `ORPHANED-CHILDREN` | `orphans` lists what is still running. Check they are the worker's (command lines), then `Stop-Process -Id <pid>`, or rerun with `-KillOrphans`. |
| `EXITED-NO-COMMIT` | The worker's changes are uncommitted in the worktree. Review `dirtyFiles`, then commit them on the lane branch or relaunch with the resume line so the worker commits them. |
| `OUT-OF-SCOPE` | Do not merge. Revert or move the files listed in `outOfScope`, or get the lane's `allowedPaths` changed. |
| `USAGE-EXHAUSTED` | Nothing to do: `resume_queue.ps1` probes after `resetAt` and relaunches. To force it, run it with `-Probe <provider>`. |
| `EMPTY-LOG` / `START-FAILED` | The CLI did not run or printed nothing. Check the CLI path and login by hand, then relaunch. |
| `LOST` | The launcher died mid-run. The worker may have left changes; treat it like `EXITED-NO-COMMIT`. |
| `LAUNCHER-ERROR` | `launcherError` in the entry and the console show the exception and line. The worker tree was killed. |
| "lane … is locked by another launcher" | Another launcher holds `<LogRoot>\<lane>\lane.lock`; its PID is written in the file. The OS releases the lock when that process ends. Don't delete the file while it runs. |
| "lane … already has a live worker" | The registry names the live PID. Wait for it or stop it. A stale entry is marked `LOST` automatically once its processes are gone. |
| Provider stuck `EXHAUSTED` | Each failed probe pushes `resetAt` 30 min later. `lastProbeResult` and `lastProbeLog` show why the probe failed. |

Shared JSON files are updated under a lock in `%TEMP%\deus_ops_locks\` and replaced atomically (write to
`<file>.tmp<pid>`, then swap), so concurrent launchers do not lose each other's entries.

## 7. Tests

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1            # about 2 minutes
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_resume_queue.ps1             # about 30 s
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1 -Mutants   # about 5 minutes
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_resume_queue.ps1 -Mutants    # about 1.5 minutes
```

`-Only name[,name]` runs selected tests and `-List` names them. `-KeepTemp` keeps the fixture.
Each suite builds a throwaway repository with a lane worktree under `%TEMP%` and runs the real scripts out of
process against fake workers, a fake probe and a fake launcher. It isolates git config (`GIT_CONFIG_GLOBAL`,
`GIT_CONFIG_NOSYSTEM`), clears `DEUS_INTEGRATOR`, `DEUS_RUN_ID` and the `GIT_AUTHOR_*` / `GIT_COMMITTER_*`
variables (a session started by the launcher has them), and kills every process it started before exiting.
The `no_leftover_processes` check fails if any were still running.
`-Mutants` copies `tools/ops`, applies one fault per copy (for example, no timeout kill, scope check off,
same-family failover allowed, hook exits 0) and requires each copy to make at least one check FAIL. A fresh clone on
this machine checks the scripts out with CRLF (the system gitconfig sets `core.autocrlf=true`). The sweep therefore
matches a multi-line fault's text with the file's own line ending. Before WG.00.12b the `launcher_pid_not_checked`
fault was a SETUP-ERROR in such a clone.

Counts (WG.00.12b; before it: 147 and 68 checks, 24 and 15 mutants): `test_launch_worker.ps1` 216 checks and 40
mutants, `test_resume_queue.ps1` 95 checks and 20 mutants. OPS.20.06 adds the effort mapping, the DEC-032 floor,
the gemini provider and the `-ProviderArgs` byte-identity cases, each with a mutant: `test_launch_worker.ps1` is
268 checks and 44 mutants. `test_resume_queue.ps1` is unchanged at 95 checks. The WG.00.12b tests cover the push rule (brief, other branch,
`lane.json` true / false / invalid), prompt reuse (`-PromptFile` recorded then reused, resume without stacking, an
explicit file with an old resume line, relaunch notes, reviewer vs writer both ways, a committed prompt without the
registry, generated prompts not reused, another task or provider not reused) and, in the resume queue, the saved
prompt passed on relaunch (the queued run first, the committed fallback, reviewer relaunch, no saved prompt, dry run,
end to end through the real launcher).

### Library conventions

`resume_queue.ps1` and the tests load the functions from `launch_worker.ps1` via its syntax tree, so its
parameters and main block never run. Two conventions to keep when editing:
- `Read-DeusJsonFile` returns its list wrapped (`return , $list`) so a one-entry list stays a list. Assign it
  (`$list = Read-DeusJsonFile ...`) or parenthesise it before piping: `(Read-DeusJsonFile $p $null) | Where-Object`.
  Piped directly, `$_` is the whole list.
- `Get-DeusGitLines` streams its records and callers collect them with `@()`. Do not change it to `return , @(...)`:
  `@()` would then nest the list, and a nested list of committed files turns into one space-joined string. That
  string matches an allowed glob, so an out-of-scope committed file would pass the scope check. The mutant
  `git_lines_nested` guards this.

Don't write these JSON files with `ConvertTo-Json`: piped input unwraps one-item arrays, and the default depth
of 2 flattens nested objects. Use `Write-DeusJsonFile`.
