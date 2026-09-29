# DEUS — Roles and division of labour (rewritten 2026-09-29 per DEC-042)

**Document ID:** `DEUS-GOV-ROLES-01`. **Authority:** Owner (DEC-042, 2026-09-29; DEC-041; DEC-035). This document matches `AGENTS.md` -> Roles; where the two differ, `AGENTS.md` governs and this file is corrected. Neither outranks `docs/OWNER_DECISIONS.md`.

## 1. Roles
| Who | Does | Does not |
|---|---|---|
| **Owner** | Decides scope, approves every lane, package and art asset; final art QA; the only person who marks work seen in RMMZ F5. | |
| **PM: Claude Code** | Records Owner decisions; opens and closes lanes with `[pm]` commits to `tasks/<id>/<lane>/lane.json`; runs gate tests on writer tips before review (DEC-035); routes review; presents QA-passed art to the Owner. | Review its own family's code; certify its own work. |
| **Coordinator: Gemini / Antigravity** | Runs its worker fleet; keeps its integration duties (merge gate, push `main`); keeps `tasks/wbs_registry.json` and `docs/STATUS.md` current; may record `FIX_READY`. | Self-certify; mark DONE before an independent verdict is recorded; open leaves or lanes without the Owner. |
| **Writers** (Claude, Gemini, Grok, Codex) | Implement one lane on its whitelist in its worktree; hard logic at `xhigh` on the strongest available model. | Change WBS status; merge; push; touch the engine core or another lane's files. |
| **Reviewers** (a different family from the writer; Grok by default, Gemini Pro or Codex when assigned) | Form the first verdict from the diff and their own test run; record provider, model, SHA, commands, exit codes; close defects (`closedBy`). | Review their own family; certify from the writer's report alone. |
| **Codex** | Bounded tooling, harnesses, governance and telemetry utilities; plugin code only when a lane assigns it. | |
| **MiniMax, others** | Manual-only until a reviewed adapter and family mapping exist. | Stand in for one of the four families. |

Grok and Codex have been lane writers since 2026-09-26 (`docs/archive/STATUS_2026-09-29_full.md` sections 2-3: Lane AA Grok on `DEUS_Levels.js`, Lane BO Codex on `DEUS_Mint.js`). Any family may write; the reviewer must be a different family.

## 2. Verification gate
Implementation + independent cross-family review + merge gate (`tools/governance/merge_gate.js`, `git merge --no-ff`) = merged. Done levels are in `AGENTS.md` -> Definition of Done: L1 headless, L2 bridged, L3 seen by the Owner. Nothing is complete below L3.

Defect lifecycle:
- `OPEN`: found by a reviewer or a test harness.
- `FIX_READY`: the writer (or coordinator) commits the fix and cites the evidence run.
- `CLOSED`: the reviewer independently verifies the fix commit in the tree and records the closure with its timestamp.
No retroactive backfill: closure timestamps are the real verification moments.

## 3. File ownership
One writer per file set. Each lane's whitelist is in its `lane.json` `allowedPaths` and published as a row of `docs/STATUS.md` section E before the lane launches. Migration or directory restructuring needs a synchronized freeze in which every active lane commits and pauses.

## 4. Pointers
`GEMINI.md`, `CLAUDE.md` and `.agents/rules/*.md` import or point at `AGENTS.md`; this file adds only the table above and the defect states. `docs/DIVISION_OF_LABOR.md` and `docs/WORK_QUEUE.md` are historical.
