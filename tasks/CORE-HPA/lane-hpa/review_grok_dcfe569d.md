# CORE-HPA lane-hpa review (grok)

Writer tip: `c0f41d2abcfa13a200d91c5e57ca74a1ff30184a` (Claude).
Reviewed tip: `dcfe569d77fe0ac9b76aa8bc82f25115ee8bc53b` (writer tip plus the fixes below).
Branch: `task/core-hpa-impl-fable`. Reviewer: grok. Cross-family: writer was Claude. This review does not issue Deus.

## Scope

`git diff --name-status 565dc5aead7e068230528d573c395ea21ed5cf5d HEAD` (merge-base with `origin/main`):

- `A docs/lanes/CORE-HPA.md` — parked design filing `88631da5`, an allowed path, not part of the writer commit
- `A docs/systems/DEUS_Pathfinding.md`
- `A game/js/deus/DEUS_Pathfinding.js`
- `A tools/bench_pathfinding_hpa.js`
- `A tools/test_pathfinding_hpa.js`

The writer commit itself touches only the four deliverable paths. No paths outside `allowedPaths`. `docs/lanes/CORE-HPA.md` still says PARKED for main until ORG-0.2 is green. That is not a blocker for this standalone branch. No art.

`git merge-tree --write-tree origin/main HEAD` at `dcfe569d` produced tree `af40b7dbf5c3aeadf027a5fc76177cdf3fd1ba4a` and exited 0. Clean merge with `origin/main`.

## Checks

`node tools/test_pathfinding_hpa.js` at the fixed tree: 32 passed, 0 failed, exit 0 (51s). Determinism hash `29bbbfe6`. Optimality cache-off max 1.038, median 1.011, 0 over 1.10 (n = 199). Open-list overflow on the test seed: 0. Seam route x=5 to x=760 costs 130, matching plain A*.

Named mutants, each exit 1 and failing its named check: `seam_closed` (wrap seams), `corner_cut` and `corner_cut_plain` (`corner_rule`), `ignore_doors` (`door_masks`, `door_plain`, `door_in_entrance_run`), `ignore_doors_plain` (`door_masks`, `door_plain`), `no_dirty` (`incremental_update`, `incremental_version`), `budget_ignored` (`budget`, `scheduler`, `inflight_rebuild`), `greedy_abstract` (`optimality`, max 1.415), `random_ties` (`determinism`), `no_rollover` (`epoch_rollover`), `overflow_silent` (`open_overflow`), `door_in_run` (`door_in_entrance_run`), `no_version_check` (`inflight_rebuild`), `keep_loops` (`smoothing_no_loops`, after the anchor fix below), `no_same_cluster_fallthrough` (`same_cluster_detour`), `no_plain_fallback` (`short_query_detour`).

## Findings

### MINOR — a cold door-class table is built inside `step()` and is not counted

`_classTable` runs a cluster-local Dijkstra and adds those expansions only to `metrics.rebuildExpansions`. Class 0 is built during `flush()`, outside the scheduler budget. Any other permission class is built the first time `_abstract` visits that cluster, and those expansions are not added to `step()`'s `used`. `Scheduler.lastTickExpansions` therefore under-counts a cold door class, and one tick can expand more nodes than `budgetPerTick`. Paths stay correct: the table is the same intra-edge search the spec runs at a rebuild, and mask 0 (the budget tests) never hits the hole. The system doc now says so.

## Fixed on this tip

### MAJOR — lazy refinement walked recycled entrance ids

Opening the tile between two border runs replaces that border's entrance nodes and reuses their ids. `refineNext()` then appended tiles for the new ids. On a 64×64 seam that produced a found path with a 15-tile jump. `entranceEpoch` now bumps whenever a rescan replaces nodes, and `refineNext()` returns `stale` / `portal_sealed` when the epoch has moved. Covered by `stale_identity`.

### MAJOR — an impassable one-tile query returned `found`

`findPath` on a walled tile to itself returned status `found` and a one-tile path that `validatePath` rejects. Impassable start or goal is now `blocked` before the trivial-path case, including when they are the same tile. A passable one-tile query is still `found` with cost 0.

### MAJOR — a restarted search kept the abandoned tiles

A search already in refinement, flushed, then pointed at a walled goal, restarted and finished `blocked` while `result().path` still held the partial walk (7 tiles in the probe). `_reset()` drops the partial path, and `_finish()` clears `path` for every status other than `found`.

### MINOR — `keep_loops` never loaded

The mutant anchor was `this.path = removeLoops(out); used++;`, but the smoother has `this.refined = true;` between those statements. The harness exited 2 and never ran `smoothing_no_loops`. The anchor now matches that statement. Re-run: `smoothing_no_loops` fails, 31 other checks pass, exit 1.

## Not charged

Phase 2 (stairs, ramps, drops, cross-level search) is not in this module. The file header and system doc say the Owner's standalone brief stopped at one z-level, and `beginSearch` throws for a different z. The storage index is already `(z - zMin)`. That deferral is not a defect of this branch. `DEUS_Movement8D.js` and `DEUS_FlowFields.js` were not touched.

VERDICT: PASS WITH MINORS
