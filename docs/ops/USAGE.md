# Provider usage and assignment policy

Authority: Owner, 2026-10-02, including the post-restart MODEL FALLBACK / CROSSLOAD SOP below. Maintained by Codex PM. This branch copy is pending review/integration; the main checkout is protected and receives no direct commits.

| Provider | Last observed status | Evidence / qualification | Reset date and time (America/Chicago) | Weekly reset day |
|---|---|---|---|---|
| Codex | available | Active PM session, 2026-10-02; remaining allowance unknown | Not supplied | Not supplied |
| Claude | available at last use | claude-fable-5-1 at max effort completed and pushed checkpoint 3a8f982d on 2026-10-02 21:47 CT; worker exited 0, no orphan children | Not supplied | Not supplied |
| Grok | available at last use | grok-4.7 produced audit activity on 2026-10-02; remaining allowance unknown | Not supplied | Not supplied |
| Gemini | out for this assignment | 2026-10-02: CLI 0.61.0 and 0.62.0 login rejected with UNSUPPORTED_CLIENT; isolated API-key mode reached RESOURCE_EXHAUSTED / monthly project spending cap. No conclusion about the Owner's subscription allowance | Not supplied | Not supplied |

Operational statuses are available, low and out. Not checked is an evidence gap, not an availability claim. Never invent reset times or weekly days. Update this table from the Owner's limit/reset notices or an actual provider error, including the observation date. Check it before every assignment. A reset date passing does not prove availability.

- Hard lanes use the default staffing and fallback order below, at top effort. Budget is not a constraint for hard lanes; lower effort is for docs, data and mechanical work only.
- Reviewer: the strongest available model from a different family than the current writer. After a crossload, the former writer may review, as explicitly authorized below; identify all contributors and the exact reviewed SHA. If no eligible reviewer is available, queue review and do not merge.
- A low allowance alone does not trigger a writer switch. An actual rate limit, quota exhaustion, outage or stall over 30 minutes triggers the SOP below. Two unsuccessful fixes to the same problem still require stopping that item and a PM handoff under the lane brief. Provider interruption without a quota error is not an out-of-usage verdict.
- Each lane maintains scratchpad/<lane>/NOTES.md with done, next, tried, exact commits/results, attempts and blockers. Preserve these notes and logs across resumes.
- One writer at a time. Verify the old process and its children have stopped before resuming; never kill another lane's processes. A different-family handoff also requires a reviewer independent of all contributors.

## Current assignment

Owner directives at 21:16 and 21:20 CT authorize isolated concurrent lanes and direct Gemini dispatch by Codex PM. They supersede the earlier single-lane and Owner-relay restrictions. One writer per lane; no shared file ownership. ORG-0.2 keeps top priority. Nothing commits directly to main.

| Lane | Writer / assignment | Reviewer | State at this update |
|---|---|---|---|
| ORG-0.2 | Claude, claude-fable-5-1, max | Grok, grok-4.7, xhigh | Writer stopped at 3a8f982d. Runtime 093a1f41: 243 pass / 17 fail, seed 1920951434 year 500, incomplete at global watchdog. Review queued after STUB-HUNT. Assertions unchanged |
| STUB-HUNT | Grok, grok-4.7, xhigh; runtime read-only | Codex/GPT | Running on task/stub-hunt, source 565dc5ae; output scratchpad/stub-hunt/STUBS.md |
| ORG-0.3 | Gemini assignment parked; Grok queued after STUB-HUNT, with ORG-0.2 review first | Codex/GPT | task/lane-plugin-audit checkpoint 86ec44c2 pushed. No audit content produced by Gemini; no incoming writer launched yet |
| Setup review | Original writer Grok (Deus), per Owner confirmation | Codex/GPT | Reviewing org/setup-2026-10-02 source 2ffa0d3a. CI coverage finding and native red; Owner will repair findings. No PR/merge yet |

Gemini assignments are recorded in tasks/ORG-0.3/lane-plugin-audit/REPORT.md in that lane. The HANDOFF template is docs/ops/HANDOFF_TEMPLATE.md on org/setup-2026-10-02, pending its separate review/integration. Deus has not issued a laptop verdict for these checkpoints.

## MODEL FALLBACK / CROSSLOAD SOP

Owner instruction recorded 2026-10-02 after the laptop restart. This supersedes earlier conflicting staffing/failover rules. A restart resume of the same model is recorded as recovery, not a crossload.

### Default staffing

- Hard lanes: Claude writes at top effort. Reviewer is the strongest available model from a different family.
- Mechanical lanes (docs, data, renames): Grok at High is fine.
- Gemini writes only, on one narrow lane at a time with references. Codex PM commands it directly (Owner 2026-10-02 21:20 CT); no Owner relay. Gemini cannot review its own family's work.
- Codex is PM. Deus checks every claim independently.

### When a model goes down

Triggers: rate limit, quota, outage, or stall over 30 minutes.

1. Freeze: the writer's work stops wherever it is. Establish that the old writer and its owned children have stopped before starting another writer.
2. Checkpoint: commit whatever is on the lane branch as `WIP checkpoint <lane> <time CT>` (no force-push), and push it. Save the logs to `scratchpad/<lane-id>/evidence/`. Stage only this lane's files explicitly; preserve unrelated files.
3. Write `scratchpad/<lane-id>/HANDOFF.md` with lane ID, branch, checkpoint SHA, base SHA; goal and acceptance criteria copied from the brief; what is done/in progress/untested; last `run_tests.bat` passed/failed counts and failing test names; reproduction seed/year; known hazards and files not to touch. Missing results stay explicitly missing.
4. Crossload: the next model starts from the checkpoint SHA and HANDOFF.md, not chat memory. Its first message restates the goal and checkpoint SHA. Hard-lane fallback order: **Claude -> Codex/GPT -> Grok -> Gemini (narrow scope only)**. Codex PM dispatches Gemini directly under the later Owner directive.
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
| 2026-10-02 21:32 | ORG-0.3 | Gemini | parked | UNSUPPORTED_CLIENT before model work; stopped with logs and HANDOFF preserved; WIP checkpoint pushed | c8ba7a48e6f3db5a71dbaeb81c9225a6c941f20d |
| 2026-10-02 before 21:43 | ORG-0.3 | Gemini | Grok QUEUED, not launched | Owner-bounded recovery started 21:33:53; updated CLI still unsupported, existing API key reached project monthly spending cap. Owner explicitly ordered this fallback after STUB-HUNT; ORG-0.2 review keeps priority | 86ec44c2055f766d17448c8d8f38f800b559059c |

The restart recovery retained Claude as writer; recovered evidence was checkpointed at 4811cda0. The ORG-0.3 rows record parking and a queue, not a fabricated model launch. Record the actual incoming launch separately when it occurs. No reset time or subscription quota is inferred from these errors.
