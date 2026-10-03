# Lane crossload HANDOFF template

Authority: Owner MODEL FALLBACK / CROSSLOAD SOP, 2026-10-02. Copy this into scratchpad/<lane-id>/HANDOFF.md. Replace every placeholder with observed evidence; write NOT RUN/UNKNOWN where necessary. Do not commit logs, keys, credentials or unrelated files. A handoff is not completion.

## Identity and checkpoint

- Lane / task: <lane-id / WBS task>
- Branch and absolute worktree: <branch / path>
- Base SHA: <full SHA>
- Checkpoint SHA: <full SHA>
- Origin-visible checkpoint SHA: <full SHA and verification command, or PUSH BLOCKED with exact error>
- Stopped writer: <provider, model family, exact model, effort>
- Stopped at: <YYYY-MM-DD HH:MM:SS CT>; reason: <rate limit / quota / outage / >30-minute stall / authorized two-fix handoff>
- Process evidence: <PID/start time, stopped status, owned children stopped; no overlapping writer>
- Incoming writer: <provider, family, model, effort>
- Reviewer: <different family from incoming writer; list former contributors and exact reviewed SHA>
- Logs: <scratchpad/<lane-id>/evidence/...>

## Goal and acceptance criteria

Copy the goal and acceptance criteria verbatim from the brief here. Cite the brief path and its commit, plus any later explicit Owner instruction. Do not infer wider scope from the handoff.

## Work state

- Done and observed: <specific changes with SHA/file:line and evidence>
- In progress / partial: <unfinished state and hazards>
- Untested: <explicit paths and scenarios>
- Attempt history: <problem, attempt number, hypothesis, actual result, ruled-out causes; stop after two failed fixes>
- Next bounded action: <one concrete step>

## Last native result

- Tested source SHA: <full SHA>
- Command and cwd: <exact run_tests.bat invocation and environment>
- Seed / year / Z-range: <values; no override if none>
- Snapshot fixture overrides: <exact changed disposable files; source hash validation>
- Start/end CT and actual shell exit: <observed>
- Raw RESULT: <paste complete real line, or NO RESULT>
- Counts: <passed / failed; assertion count may depend on generated entities>
- Failing check names: <every failure, or none observed>
- Coverage / watchdog: <executed, partial and unreached suites; timeout and last observed suite/check>
- Logs: <raw stdout, stderr, results, runtime log paths>
- Screenshots opened: <path and actual visible content; distinguish native NW.js from editor F5/F8>

## Hazards and protected files

Copy the lane whitelist and forbidden paths from the brief. Include other lane claims, game/js/libs/, art/sprites/, PROVIDER_USAGE_STATUS.json, main/stashes/backup refs, and any additional protected local files. Record the editor state if game data/plugin registration could be touched. No rebase, squash, force-push, blanket staging, cleanup or scope expansion.

## Resume protocol

1. Verify branch, checkpoint SHA, worktree status and that the previous writer is stopped.
2. First message restates the goal and checkpoint SHA. Read this file and the referenced brief/evidence, not chat memory.
3. Work only inside the authorized scope. Never run two writers in the lane.
4. Rerun run_tests.bat with the recorded controls before claiming an outcome. No loosened assertions, omitted suites or changed timeouts without explicit Owner authorization.
5. The PM logs the switch in docs/ops/USAGE.md: CT time, lane, from, to, reason, checkpoint SHA. A returning writer may review but does not reclaim the lane mid-stream.
6. Done requires acceptance tests, cross-family PASS, Deus CONFIRMED and Owner sign-off where required. Missing checks stay pending.

## Report row

| Lane | Model / effort | Branch | SHA | Test counts / coverage | Reviewer | Deus verdict | Status / blocker |
|---|---|---|---|---|---|---|---|
| <lane> | <model / effort> | <branch> | <full SHA> | <PASS/FAIL or NO RESULT> | <name/family or pending> | <CONFIRMED/PARTIAL/FALSE or not issued> | <factual state> |
