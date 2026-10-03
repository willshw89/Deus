# <TASK-ID> / lane-<id>

```text
BUDGET UPDATE (Owner, Fri Oct 2 6:53 PM CT): Owner has max/pro plans on all providers. Loosen budget, not process.
- PM (Codex): strongest OpenAI model at its highest single-agent effort.
- Writers: strongest model at highest effort for every lane except trivial mechanical ones (those stay High).
- Reviewers: strongest model, highest effort. Gemini Pro preferred over Flash.
- Parallel lanes: up to 3–4 at once after pillars-v1, still only with zero shared files.
- Unchanged: one writer per lane, cross-family review, Deus claim check before merge, tests must reach RESULT, no multi-agent "swarm" modes, no self-certification.
```

Owner authorization/date: <exact source>. Writer/model/effort: <assigned writer>. Reviewer: <different family; relay route>. One task, one branch, one writer. No subagents or multi-agent modes without Owner approval. The WBS-ORG amendment allows ORG-1/2/3 and ORG-0.2 in parallel with disjoint file lists before `pillars-v1`; after it, up to 3–4 disjoint lanes may run.

## Goal
<Concrete problem and resulting behavior.>

## Base SHA
<Full origin-visible SHA and passing baseline evidence. Explicitly identify an Owner-authorized bootstrap exception for a red-baseline repair.>

Branch: `task/lane-<id>`. Worktree: <dedicated absolute path>. Manifest: `tasks/<TASK-ID>/lane-<id>/lane.json`.

## Allowed files and forbidden files
<Exact whitelist, plus exact sections for future pillar edits. No overlap with other lanes.>

Always forbid `game/js/libs/**`, `art/sprites/**`, `PROVIDER_USAGE_STATUS.json`, engine core and other local work unless explicitly allowed. No faction/society work during DEC-037. No force-push, `reset --hard`, deletion or history rewrite without Owner approval.

## REFERENCES (required for any non-trivial technique)
- PM selects 1–3 real GitHub repos or files before the lane starts and lists them here with exact URLs and the specific file/function to learn from.
- Writer must open and read each reference before writing code, and cite in REPORT.md which reference pattern each new function follows.
- References are for patterns only: no copying code from GPL/AGPL repos (e.g. OpenFrontIO); MIT/BSD/Apache code may be adapted with attribution in a comment.
- If no suitable reference exists, the writer says so and stops for PM guidance instead of inventing one.
- Writers must not cite a repo they did not actually open.

PM search date/time in CT: <absolute date/time>. Selected files: <1–3 exact GitHub URLs, functions, patterns and license limits>.

## Steps
<Bounded sequence, prerequisites, actual consumers/callers, preservation and evidence collection.>

## Acceptance commands
```powershell
.\run_tests.bat
node tools/ops/run_gate.js --root . --log-dir <unique-evidence-directory>
<specific regression, failure-path, deterministic and performance commands>
```
Full suites must reach computed RESULT lines and pass. Only ORG-1/2/3 may use the recorded ORG-0.1 expected-red list, with no game-logic edits; record every new failure and missing suite explicitly. ORG-0.2 and ORG-4 require green. Record seeds, year, runtime and measurement conditions. Inspect every screenshot. Owner editor F5 is separate acceptance for game changes.

## Required REPORT.md
Task ID, branch, full head SHA and proof it exists on origin; files changed and leftovers; exact new symbols and existing call paths; each function's actually-read reference pattern and required attribution; commands and real RESULT/exit output; inspected captures; before/after performance method and numbers; every untested, unwired or failing item. Times in CT. Include GAME TRANSLATION when the game loads the diff.

## Review, claim check and integration
Manual packet: repo, branch, origin-visible head and base SHA, brief path, changed files, references, criteria and test output. Require `VERDICT: PASS | PASS_WITH_NITS | FAIL`, then BLOCKING, NON-BLOCKING and OWNER DECISION NEEDED. PM never writes and reviews the same lane.

Deus PARTIAL/FALSE holds integration regardless of review. Merge only after passing gates, PASS review and CONFIRMED Deus check; use `merge_gate.js`/`--no-ff`, rerun full suites on main and `git revert` a red merge. Create milestone tags only after proved integrated results and the required Owner gate.

## Stop and escalate
<Lane-specific blockers>. Stop after two unsuccessful repairs of one defect or two failed reviews and bring the Owner one clear question. Surface worldgen-output changes, protected-library changes, deletions/history changes and missing references. No scope expansion or model downgrade on the writer's initiative.
