# CORE-HPA lane — independent review of Fable implementation

Cross-family review only. Writer was Claude/Fable. Reviewer must not be Anthropic.

## Scope

Standalone HPA*/HAA* pathfinder on `task/core-hpa-impl-fable` at `c0f41d2a`:
- `game/js/deus/DEUS_Pathfinding.js`
- `docs/systems/DEUS_Pathfinding.md`
- `tools/test_pathfinding_hpa.js`
- `tools/bench_pathfinding_hpa.js`

Design authority: `docs/lanes/CORE-HPA.md` (Owner-approved 2026-10-03). Owner assigned Fable a standalone build; this does not unpark a main merge. Do not merge. Do not push unless lane.json says push (it does not). Do not touch ORG-0.2 files.

## Gate already run by PM

`node tools/test_pathfinding_hpa.js` on `c0f41d2a`: 31 passed, 0 failed, EXIT=0. Re-run in foreground if you need your own measurement; do not invent counts.

## Deliverable

Write `tasks/CORE-HPA/lane-hpa/review_grok_<tip8>.md` with BLOCKER / MAJOR / MINOR findings and an explicit verdict (CLEAN PASS, PASS_WITH_NITS, or CHANGES REQUESTED). Commit the review file on this branch. Do not push. Do not merge.
