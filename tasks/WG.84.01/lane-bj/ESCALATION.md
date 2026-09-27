# WG.84.01 writer finding: surface camps without their starter resources

**Date:** 2026-09-27. **Writer:** Codex, lane-bj. **Proposed severity:** MAJOR, for Owner and production-owner review. **Status:** open writer finding; no WBS closure, production fix, or Owner decision is asserted.

The real registered generation audit has produced surface settlements whose generated maps contain none of the required starter resources within their configured camp radius. This is an observed contract failure, distinct from the narrower same-layer route findings below. The completed 20-seed totals, all controls, gate exits and measurements belong in [REPORT.md](REPORT.md) and [gate_worldgen.log](gate_worldgen.log); the examples here were inspected while that full run was in progress.

## Established observations

| Evidence | Seed and location | Observation |
|---|---|---|
| [pilot_424242.log](pilot_424242.log), `@@result` | 424242, area `(0,0)`, Z0, site 3 / faction f3, camp `(198,54)` | Every required surface kit count is zero within radius 20. The eight halfling founders, IDs 17–24, stand at `(223–225,49–53)`, 25–27 cells from the recorded camp by Chebyshev distance. Their shared 66-cell same-layer component contains no accessible food source or drinkable water under this audit's rules. |
| Same pilot | 424242, area `(0,0)`, Z0, site 8 / faction f8, camp `(192,105)` | Every required surface kit count is zero within radius 20. This site's founders do have observed same-layer food and water access elsewhere; missing camp resources and missing routes are separate findings. |
| [gate_worldgen.log](gate_worldgen.log), `@@seed` for 386902684 | 386902684, area `(0,0)`, Z0, site 3 / faction f3, camp `(57,192)` | Both fresh workers fail `surface_kit`, case `site:3`, with zero of every required kit entry. Both workers exit 1; recorded worker-process elapsed times are 27,915.536 ms and 27,781.118 ms. |

Required minimums are the current catalog values: berry bushes 8, oaks 8, small rocks 10, grass tufts 60, reeds 4, granite boulders 4, fruit trees 1, and ore outcrops at least 1. Counts come from actual generated `map.ufObjects` inside the circular radius, not generation logs or source matching. The pilot's original check lines aggregate founder/site failures; the final harness gives these failures individual case IDs.

The pilot command exited 1; its shell stopwatch measured 27,615.3979 ms, and the worker reported 27,522.855 ms. These figures describe headless command execution, not frame performance. No terrain-shape/elevation probe for these exact camp cells, complete 3D route search, native Playtest, survival simulation, or screenshot was produced for this escalation.

## Source-supported likely cause

The evidence is consistent with a known mismatch between climate-based camp selection and volumetric terrain. The exact terrain cause at these seed coordinates remains an inference until the production owner inspects their shapes/elevations.

1. `game/js/plugins/DEUS_WorldGen.js:853–857` makes the ground `cellInfo(...).walkable` predicate reject shape 3 (open), water and climate peaks, but it does not reject shape 1 (solid). `game/js/plugins/DEUS_History.js:603–617` trusts that predicate when choosing a camp's 3×3 block. Its final fallback at line 631 can return clamped coordinates even when both camp searches fail.
2. Starter-resource placement uses stricter physical rules. `DEUS_WorldGen.js:1430–1436` rejects cells whose actual surface elevation differs from the camp's Z, ramps, and non-floor shapes. The loop at line 1446 stops when its candidate pools empty, even if the minimum remains unmet. It reports no exception for that shortage. Kit centres continue to use the camp's recorded coordinates (`DEUS_WorldGen.js:886–899`).
3. Founder materialization searches outward using actual `World.cellFree` (`DEUS_History.js:465–478`). Its radius can grow to the area size; it is not limited to the catalog founder reach or the kit radius and does not require connectivity back to the camp. This permits standable founders far from a poorly situated camp rather than exposing the placement failure as an exception.

An existing related finding is explicit in [docs/systems/UF_WorldGen.md](../../../docs/systems/UF_WorldGen.md), line 163, dated 2026-09-24: climate walkability can accept ground beneath hills, and seeds 20260923 and 20260924 produced camp chests on solid ground. It names the failed `history_objects_off_solid` check and assigns the fix to camp/home placement. The check remains in `tools/test_volumetric_terrain_column.js:562`; it was read, not rerun for this escalation.

## Contract and route limitation

[docs/VISION.md](../../../docs/VISION.md), V67 at line 77, guarantees each faction nearby resources for its first buildings, tools, clothes and meals, plus drinkable water. V134 at line 128 requires a viable Year-0 world with nine factions and 72 founders. The existing `kit_per_area` and `kit_fair` checks documented in `docs/systems/UF_WorldGen.md:113–115` enforce the per-camp starter minimums. Zero kit entries are therefore an existing contract failure; no new threshold was introduced to create that result.

The food/water oracle deliberately measures **same-layer access** through actual standable cells and cardinal neighbors; gathering/drinking may occur from a neighboring working cell. Its failure does **not** prove 3D entrapment, inevitable starvation or thirst, or inability to survive through inventory, hunting, trade or later migration. Production paths can leave a layer through ramps/stairs and return (`DEUS_World.js:2244`, `2451–2477`); those routes were not evaluated. Legal same-layer diagonals require open orthogonal neighbors (`DEUS_World.js:2435–2448`), so omitting diagonals does not itself disconnect this cardinal component.

Retain the route failures as bounded local-viability findings and the missing kits as independent contract failures. A full 3D route diagnosis belongs to production-owner follow-up; this writer has not changed the test requirements to make those cases pass.

## Reproduction and handoff

From the repository root, run each command in the foreground:

```text
node tools/worldgen_qa/seed_worker.js 424242
node tools/worldgen_qa/seed_worker.js 386902684
```

Each command uses the real New Game/registered generation path and reports failures with seed, stage and case ID. Expected from the recorded observations: exit 1 with the corresponding `surface_kit` failures; seed 424242 also reports the local food/water failures. The full lane gate remains:

```text
node tools/worldgen_qa/test_multiseed_worldgen_qa.js
```

Production-owner review should establish the terrain at the reported camp coordinates, reconcile camp/home selection with physical floors and resource availability, and assess the founder-to-camp and cross-layer routes. Any production change requires a separately authorized task outside this lane's allowed paths. This escalation changes no production plugin/data, registration, WBS/status, Owner decision, or other task and requests no art/audio work.
