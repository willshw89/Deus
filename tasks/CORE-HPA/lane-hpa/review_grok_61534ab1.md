# CORE-HPA lane-hpa review (grok)

Writer tip: `a7e06d9abfba302f1d5e3a0945f0dc66f5f6f7c1` (Claude).
Reviewed tip: `61534ab17c4b2f56f496905998e87bf0731770ef` (writer tip plus the fix below).
Branch: `task/core-hpa-impl-fable`. Reviewer: grok. Cross-family: writer was Claude. This review does not issue Deus.

Prior review `review_grok_dcfe569d.md` was PASS WITH MINORS on `dcfe569d`. This pass covers `a785d1b3`, `dff478c0`, and `a7e06d9a` only, plus whether those commits regress the closed majors.

## Scope

`git diff --name-status 565dc5aead7e068230528d573c395ea21ed5cf5d HEAD` (merge-base with `origin/main`):

- `A docs/lanes/CORE-HPA.md` — parked design filing, an allowed path
- `A docs/systems/DEUS_Pathfinding.md`
- `A game/js/sim/pathfinding.js` — moved from `game/js/deus/DEUS_Pathfinding.js`
- `A tasks/CORE-HPA/lane-hpa/BRIEF.md`
- `A tasks/CORE-HPA/lane-hpa/lane.json`
- `A tasks/CORE-HPA/lane-hpa/review_grok_dcfe569d.md`
- `A tools/bench_pathfinding_hpa.js`
- `A tools/test_pathfinding_hpa.js`

No path outside `allowedPaths`. No art. `docs/lanes/CORE-HPA.md` is still PARKED for main. That is not a defect of this standalone branch.

`git merge-tree --write-tree origin/main HEAD` at `61534ab1` produced tree `df4f7266a5fd20c4e8dc67b6bb0deca30b2620ee` and exited 0. Clean merge with `origin/main`.

## Checks

`node tools/test_pathfinding_hpa.js` at the fixed tree: 35 passed, 0 failed, exit 0 (42s). Determinism hash `29bbbfe6`. Optimality cache-off max 1.038, median 1.011, 0 over 1.10 (n = 199). Dig storm at budget 2,500: 60 routes, 43 completed during the storm, 10 restarts, 0 invalid, 0 A* disagreements, graph matches a fresh build.

Named mutants, each exit 1 and failing its named check: `global_restart` (dig_storm), `merge_on_reuse` (connectivity_reuse), `no_lazy_flush_check` (lazy_flush_invalidation), `seam_closed` (wrap seams), `corner_cut` and `corner_cut_plain` (corner_rule), `ignore_doors` (door_masks, door_plain, door_in_entrance_run), `ignore_doors_plain` (door_masks, door_plain), `no_dirty` (incremental_update), `budget_ignored` (budget, scheduler, inflight_rebuild), `greedy_abstract` (optimality), `random_ties` (determinism), `no_rollover` (epoch_rollover), `overflow_silent` (open_overflow), `door_in_run` (door_in_entrance_run), `no_version_check` (inflight_rebuild), `keep_loops` (smoothing_no_loops), `no_same_cluster_fallthrough` (same_cluster_detour), `no_plain_fallback` (short_query_detour).

## Prior majors

`stale_identity` still passes. An impassable one-tile query is `blocked` with a null path. A lazy walk ends `stale` after a flush replaces entrance nodes. A search restarted onto a walled goal ends `blocked` with a null path. Those three fixes from `dcfe569d` are intact.

## Fixed on this tip

### BLOCKER — a paused abstract search dropped replacement entrances

`a7e06d9a` stopped restarting on every edit, which the dig storm needs, by skipping every abstract node with `nodeBorn` after the search started. A flush that recycles entrance ids then makes those new nodes invisible. On a 160x48 barred map, pausing after 12 abstract expansions and moving the middle gaps returned `unreachable` while plain A* found a path of cost 1638. Continuing after the search had already expanded those nodes could also walk a parent cycle and throw `RangeError: Invalid array length`.

Allocation now clears that id's mark, g, and parent, so a stale open-list entry cannot expand the new node. Relaxation reads the live tables, so an entrance the search has not expanded yet is usable. A node the search has already expanded, and that this flush freed or reused, restarts the search. A parent chain that cycles or does not reach the start restarts it. An interior rebuild that keeps the expanded ids does not. `abstract_flush`: the early pause finishes at cost 1650 vs A* 1638 with 0 restarts; the deep pause restarts once and matches that cost. Dig storm stays inside the spec budget (10 restarts, 43 of 60 routes completed during the storm).

`budget_ignored`'s anchor still named the old version check and did not load (0 hits). It now matches `_graphStillValid` and fails budget, scheduler, and inflight_rebuild. `corner_cut` no longer failed `corner_rule` once invalid refined paths were restarted instead of returned; the check now runs the cluster-local search on a walled diagonal, and the mutant fails it. `no_version_check` still reached a correct path by a later refine restart, so `inflight_rebuild` now also requires that restart to add no refine failure. The mutant fails that.

## Findings

### MINOR — a cold door-class table built inside `step()` is still not counted

Same item as the `dcfe569d` review, not regressed. `_classTable` for a class other than 0 still runs the first time the abstract phase touches that cluster, and those expansions are not added to `step()`'s `used`. Class 0 is built at `flush`. The system doc still says so, and the writer's open list grades it major. Paths stay correct. Mask 0, which the budget checks use, does not hit it.

## Not charged

The writer's integration backlog in the system doc is unchanged and is not a regression of this tip: no post-edit query with a non-zero door mask, `Scheduler.results` unbounded until `take()`, and `flush()` time not included in the expansion budget. Phase 2 (stairs, ramps, drops, cross-level search) is still out of this brief. `beginSearch` throws for a different z.

VERDICT: PASS WITH MINORS
