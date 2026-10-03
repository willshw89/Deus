# Provider usage and assignment policy

Authority: Owner, 2026-10-02, including the post-restart MODEL FALLBACK / CROSSLOAD SOP below. Maintained by Codex PM. This branch copy is pending review/integration; the main checkout is protected and receives no direct commits.

| Provider | Last observed status | Evidence / qualification | Reset date and time (America/Chicago) | Weekly reset day |
|---|---|---|---|---|
| Codex | available | Active PM session, 2026-10-02; remaining allowance unknown | Not supplied | Not supplied |
| Claude | available at last use | claude-fable-5-1 completed fix commit 248fc691 on 2026-10-02; worker later stopped without a final result; no quota error observed in the inspected tail | Not supplied | Not supplied |
| Grok | available at last use | grok-4.7 produced audit activity on 2026-10-02; remaining allowance unknown | Not supplied | Not supplied |
| Gemini | not checked | No current availability evidence; do not infer quota from old telemetry | Not supplied | Not supplied |

Operational statuses are available, low and out. Not checked is an evidence gap, not an availability claim. Never invent reset times or weekly days. Update this table from the Owner's limit/reset notices or an actual provider error, including the observation date. Check it before every assignment. A reset date passing does not prove availability.

- Hard lanes use the default staffing and fallback order below, at top effort. Budget is not a constraint for hard lanes; lower effort is for docs, data and mechanical work only.
- Reviewer: the strongest available model from a different family than the current writer. After a crossload, the former writer may review, as explicitly authorized below; identify all contributors and the exact reviewed SHA. If no eligible reviewer is available, queue review and do not merge.
- A low allowance alone does not trigger a writer switch. An actual rate limit, quota exhaustion, outage or stall over 30 minutes triggers the SOP below. Two unsuccessful fixes to the same problem still require stopping that item and a PM handoff under the lane brief. Provider interruption without a quota error is not an out-of-usage verdict.
- Each lane maintains scratchpad/<lane>/NOTES.md with done, next, tried, exact commits/results, attempts and blockers. Preserve these notes and logs across resumes.
- One writer at a time. Verify the old process and its children have stopped before resuming; never kill another lane's processes. A different-family handoff also requires a reviewer independent of all contributors.

## Current assignment

ORG-0.2 / lane-worldgen-green: Claude writer at max effort, Grok reviewer. Resume item (a)'s interrupted post-commit test at 248fc691; then proceed in the Owner's order. Runtime acceptance and independent review are pending.

## MODEL FALLBACK / CROSSLOAD SOP

Owner instruction recorded 2026-10-02 after the laptop restart. This supersedes earlier conflicting staffing/failover rules. A restart resume of the same model is recorded as recovery, not a crossload.

### Default staffing

- Hard lanes: Claude writes at top effort. Reviewer is the strongest available model from a different family.
- Mechanical lanes (docs, data, renames): Grok at High is fine.
- Gemini writes only, on narrow lanes with references. The Owner relays to it by hand.
- Codex is PM. Deus checks every claim independently.

### When a model goes down

Triggers: rate limit, quota, outage, or stall over 30 minutes.

1. Freeze: the writer's work stops wherever it is. Establish that the old writer and its owned children have stopped before starting another writer.
2. Checkpoint: commit whatever is on the lane branch as `WIP checkpoint <lane> <time CT>` (no force-push), and push it. Save the logs to `scratchpad/<lane-id>/evidence/`. Stage only this lane's files explicitly; preserve unrelated files.
3. Write `scratchpad/<lane-id>/HANDOFF.md` with lane ID, branch, checkpoint SHA, base SHA; goal and acceptance criteria copied from the brief; what is done/in progress/untested; last `run_tests.bat` passed/failed counts and failing test names; reproduction seed/year; known hazards and files not to touch. Missing results stay explicitly missing.
4. Crossload: the next model starts from the checkpoint SHA and HANDOFF.md, not chat memory. Its first message restates the goal and checkpoint SHA. Hard-lane fallback order: **Claude -> Codex/GPT -> Grok -> Gemini (narrow scope only)**. Gemini is handed off by the Owner.
5. Re-pair the reviewer: different family from the new writer. If the old writer returns, it may review but does not retake the lane mid-stream.
6. Log the switch below: CT time, lane, from, to, reason and checkpoint SHA. If checkpoint/push is blocked, report the actual blocker; do not pretend the remote checkpoint exists.

### Never during a crossload

- Run two writers on the same lane at once.
- Rebase, squash or force-push checkpoint history.
- Widen the lane scope.
- Treat the handoff as completion: the new writer reruns `run_tests.bat` before claiming anything.

### Done means

- `run_tests.bat` passes the lane acceptance criteria.
- A cross-family review passes.
- Deus confirms on the laptop: **CONFIRMED / PARTIAL / FALSE**.
- Owner sign-off where required by the brief.
- Report: **lane, branch, SHA, test counts, reviewer, Deus verdict**.

### Switch log

| Time CT | Lane | From | To | Reason | Checkpoint SHA |
|---|---|---|---|---|---|

No model switch recorded by this update. The 2026-10-02 restart recovery retained Claude as writer; recovered evidence was checkpointed at 4811cda0. A fresh native result remains pending.
