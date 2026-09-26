# WG.00.17 lane AA: test changes

Base `5255f1a58a9d95bb7bc08377ef055c366610e486`. This file lists every change to test code on the branch. Every path is inside the BRIEF's allowedPaths. The run results are in `REPORT.md`.

## 1. The gate tools and the read-only test files: no change

```
git diff 5255f1a58a9d95bb7bc08377ef055c366610e486 HEAD -- tools/test_layer_render_flat.js tools/test_minimap.js \
  tools/test_layer_switch_inplace.js tools/test_snapshot.js tools/bench_render_layers.js tools/run_tests.js \
  tools/check_deus_syntax.js tools/test_palette.js game/js/plugins/DEUS_Test.js game/js/plugins.js game/js/sim | wc -l
0
```

The required counts are unchanged: layers_flat 12, depth 27, minimap 24, layer_switch_inplace 7.

## 2. DEUS_Depth check code: one line (PM ruling E1-A, 2026-09-26, `BRIEF.md` section "PM ruling E1-A")

`game/js/plugins/DEUS_Depth.js:1902`, the `want` of `switchState` in the `layers_flat` check `switch_same_frame`. That is the only change to DEUS_Depth.js on the branch (`git diff 5255f1a5..HEAD -- game/js/plugins/DEUS_Depth.js`: one line out, one line in).

Before:
```js
                const r = D.root(), out = { frame, root: !!r, want: [to - 1, to - 2].filter(z => L.isLevel(z)), planes: [], planesOk: false, units: [], missing: [], stale: [] };
```
After:
```js
                const r = D.root(), out = { frame, root: !!r, want: [to - 1, to - 2].filter(z => L.isLevel(z) && (z === to - 1 || (config.exposes(to - 1) && openCells(area.x, area.y, to - 1).open > 0))), planes: [], planesOk: false, units: [], missing: [], stale: [] }; // depth 2 only under rebuild's rule (PM ruling E1-A, WG.00.17)
```

- Depth 2 (`to - 2`) is wanted only under the renderer's own rule (`Sprite_DepthRoot.prototype.rebuild`, :930): level `to - 1` is exposed (`config.exposes`) and has an open cell in the view's area (`openCells(area.x, area.y, to - 1).open > 0`, where `area` is the suite's `W.viewLevel()`).
- It uses the renderer's `config.exposes` and `openCells`, not a copy of them.
- Nothing else in the check changed: the fixture scene, the switch sequence, `planesOk`, the unit judgement, the provocation and the count are as before. The renderer did not change.
- At -2..+2 the new expectation is the base's: `to - 2` is never wanted where it isn't a level, and where it is, the fixture's views have open cells on `to - 1`.

Regression test: `tools/zrange/test_switch_depth2.js` (new). It runs the unchanged gate in throwaway clones with a probe plugin that is added to the clone only. It shows:
- the open-cell case: depth 2 bound and wanted, also on the new level -3;
- the closed-cell case: depth 2 neither bound nor wanted;
- a provocation CAUGHT in each case: an unbound depth-2 plane, a spurious depth-2 plane, and the expectation before E1-A.

## 3. In-game checks inside the lane's plugins (the Z range's own literals in test code)

These suites live in files of the write set. Their checks hard-coded the five levels, so they now read the range; each keeps its old meaning at -2..+2.

| File | Suite (default?) | Check | Change | Why |
|---|---|---|---|---|
| `DEUS_World.js` | `world` (default) | `level_ids` | "A sixth level doesn't exist" tested levels 3 and -3; it now tests `zMax + 1` and `zMin - 1` (3 and -3 at -2..+2). The detail names those levels. Provocation `world.level_ids` unchanged. | At -16..+15, 3 and -3 are levels. |
| `DEUS_Levels.js` | `vertical` (not default) | `five_levels` | `LEVELS` equals the range (was the literal list); the core's five entries and checksums as before; a level outside the core has an entry only with a change (`entriesOk`); the six refusals test `zMax + 1` (was 3); `inWorld(zMin - 1)` is added. The provocation `vertical.five_levels` makes `isLevel` accept `zMax + 1` (was 3), and `label` hides that level (was 3). | The world's levels are its range. |
| `DEUS_Levels.js` | `vertical` | `complete_at_start` | The core's arrays and checksums as before, plus: every level of the range has a baseline. | Levels outside the core are made too (UNIFORM). |
| `DEUS_Levels.js` | `vertical` | `persistence`, `save_size` | The fixtures (a shape, an object, an item and a unit per level) go on the five core levels (`CORE_LEVELS`; before `LEVELS`, which is now the range); the checksums regenerate over the core; the detail lists changed strata per saved level key. | `LEVELS` would put fixtures on 32 levels; only the core has checksums. |
| `DEUS_Levels.js` | `vertical` | `surface_migration` | The migrated save's level keys are compared with `CORE_LEVELS` (was `LEVELS`). | A pre-V80 migration adds the five core entries. |
| `DEUS_Levels.js` | `strata` (not default) | `strata_live` | "Flat `Uint8Array(n × 5)` baselines" became "chunk stores": `dir` is a `Uint16Array` of `cw²` entries, the MIXED arrays match `mixedCount`, the dense compat copy is n × 5 and `hp` is null. Records are counted over the levels that have them, saved records over every level key, and units by level over the levels that have units. | The sparse store (P2). |
| `DEUS_Levels.js` | `strata` | `adapter_cost` | The sample cells' levels come from `CORE_LEVELS` (was `(k % 5) - 2`: the same five levels). | No literal. |
| `DEUS_Levels.js` | `strata` | `shape_grids_coherent` | `vg.grids === 5 && vg.cells === 5 × n` became `vg.grids >= 5 && vg.cells === vg.grids × n`. The core's grids are built first (`CORE_LEVELS`). Every cached grid is still re-derived and compared cell by cell. | Other levels' grids may also be cached (GRID_KEEP 15). |
| `DEUS_History.js` | `history` (default) | the checks that regenerate another seed's world (`syntheticState`), `nothing_built` | The synthetic state carries the world's `zRange`; `nothing_built` gathers sites over `W.levels()` (was `[-2, -1, 0, 1, 2]`). | A state without `zRange` is a legacy world, so a synthetic state would be generated at -2..+2 while the real world is at -16..+15. |
| `DEUS_Wildlife.js` | `wildlife_seeds` (not default) | `population_over_seeds` (its `synthetic` state) | The synthetic state carries `zRange`. | As above. |
| `DEUS_WorldGen.js` | `worldgen` (default) | `kit_seeded` (its state `s3`) | `s3` carries `zRange`. | As above. |

## 4. New test code of the lane (all new files)

- `tools/test_zrange.js` and `tools/zrange/zrange_suite.js`: the 10 checks.
- `tools/zrange/provocations.js`: one provocation per check.
- `tools/zrange/scan_z_literals.js` and `tools/zrange/z_literal_allowlist.json`: the static scan.
- `tools/zrange/blast_tables.js` and `tools/zrange/bounds.js`: the feet fixture and the storage bounds.
- `tools/zrange/fixtures/*`: the base commit's data and legacy save, made from the base commit by `--refresh-base` and `--make-legacy-fixture`.
- `tools/zrange/test_switch_depth2.js`: the E1-A regression.
- `tools/zrange/run_gates.js`: the lane's gates in fresh clones.
- `tools/zrange/literal_map.js`: writes `literal_map.md`.
- `tools/zrange/clone.js`: throwaway clones.
- `tools/zrange/bench_queries.js` and `tools/zrange/prof_top.js`: diagnostics.

In this session one provocation was brought up to date with the code: `authority_past_top` targets the inline `isLevel` of 830f2c38. Its old target no longer existed, so `--provoke` would have stopped on it with a harness error.
