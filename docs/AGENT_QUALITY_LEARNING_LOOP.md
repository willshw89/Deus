# AGENT_QUALITY_LEARNING_LOOP: what ENGINE_RULES does not say

> The rules are in `docs/ENGINE_RULES.md` (§5 testing, §6 the three DoD levels and the merge gate) and `AGENTS.md`. Reduced 2026-09-29 from the 462-line v1 (2026-09-25). Removed: the task state machine, tier tables, DoD JSON, provider evidence profiles, routing formula, prompt versioning and the telemetry schemas for files that were never created (`docs/telemetry/tasks.jsonl`, `defects.jsonl`, `escapes.jsonl`, `reviews.jsonl`, `interruptions.jsonl`, `tools/learning/*`). What exists under `docs/telemetry/` on 2026-09-29: `sessions/active_workers.json` (one entry per launcher run), `failover_log.jsonl`, `security_incidents.json`.

## Task record
Every launcher run records provider, role, task, branch, base and head commits, exit code, state and flags in `docs/telemetry/sessions/active_workers.json` (`tools/ops/README.md` §2). A lane's brief, prompt, review and closure verdict live under `tasks/<task>/<lane>/`. That is the durable task state (INV-GOV-04).

## Defects
A finding has: id (`DEF-<lane>-<n>`), severity (BLOCKER / MAJOR / MINOR), category, finder, the invariant or rule broken, evidence (file:line, command output, or an opened screenshot), status (`OPEN` -> `FIXING` -> `REVIEW` -> `CLOSED` | `ACCEPTED_RISK`), fix commit, and the closure reviewer (never the writer's family). Categories: `SPEC_GAP`, `IMPLEMENTATION`, `TEST_GAP`, `PERFORMANCE`, `DETERMINISM`, `SAVE_COMPATIBILITY`, `OWNERSHIP`, `REVIEW_MISS`, `ORCHESTRATION`, `ART_QC`. A finding is graded after closure as `VALID`, `PARTIALLY_VALID`, `FALSE_POSITIVE` or `DUPLICATE`; reviewers are judged on valid findings, not on volume.

## Correction loop
The writer gets only the defect id, the location, the failing check or mutant, and the closure criterion, and changes only the affected logic. Second failed fix of the same problem: stop and ask the Owner (AGENTS.md Rule 10; this replaces the v1 three-strike rule). An escaped defect (found after merge to `main`) is recorded with where it was found, which gate should have caught it, and the one process change made; it is a learning event, not blame.

## Postmortem (save corruption, determinism break, file truncation, merge collision, > 20% regression)
What happened; root cause; why self-test, mutants and review missed it; the exact recovery (git restore, fix commit, migration); one to three enforceable prevention changes.

## Reporting to the Owner
Five points, plain words: what happened; what the term means; why it matters; what the agents will do next; what the Owner must decide (or "no Owner action required"). Fewer approval loops and questionnaires (Owner, 2026-09-29): ask only for design choices, art sign-off (DEC-007) and destructive repository actions.
