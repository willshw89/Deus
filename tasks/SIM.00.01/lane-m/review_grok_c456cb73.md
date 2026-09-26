# Grok independent review — SIM.00.01 ADR-003 Rev 2

Reviewed commit: `c456cb73648668635b68252c6b07dc7be7f7c5ae`
Branch: `task/lane-m`
Reviewer: Grok
Date: 2026-09-26

Documents inspected:

- `docs/adr/ADR-003_sim_render_split_and_lod.md` at `c456cb73648668635b68252c6b07dc7be7f7c5ae` (identical at review time; the only later lane commit, `ae6ee61d`, edits the checklist)
- `docs/adr/README.md` (one index line: PROPOSED, Rev 2, DEC-013 / V137 / V138)
- `tasks/SIM.00.01/lane-m/review_checklist.md` as amended by `ae6ee61d` (Directive 0021-V Addendum §12–§13)

Code citations were checked against the lane tree, whose `game/` and `tools/` match `ebeec892` and current `main` (`75cf2ff3`). Document pins were checked with `git show 0c1baf8d:<path>`. The DEC-013 amendment on `main` is `a1629a69`.

VERDICT: FAIL

Rev 2 answers the nine-layer checklist (`f4e3b56d`) and DEC-013 as frozen at `0c1baf8d`. The checklist this review applies, and DEC-013 on current `main`, supersede that baseline. Three amended requirements are absent, and two engine claims are cited at the wrong lines. Structural collapse, decay, and the nine required sections are in place and should be kept.

## Checklist

### 1. Thirty-Two Z Layers & Headroom — FAIL

The ADR's vertical model is the superseded nine-layer ruling.

- §0 item 7, §5.1, §15, and the §8 row Z specify 9 levels, default −4..+4, and the old bands: Lower-2 (−4, −3), Lower-1 (−2, −1), Surface (0), Upper-1 (+1, +2), Upper-2 (+3, +4). That matches `docs/OWNER_DECISIONS.md:171-187` at `0c1baf8d`. It does not match DEC-013 as amended at `a1629a69`: 32 continuous layers, default −16..+15, surface at 0, 320 ft.
- Region counts stop at 192 (today's 3 bands) and 320 (5 bands × 64). There is no 32-layer region count and no band table for Lower-2 −16..−9, Lower-1 −8..−1, Surface 0..+3, and the two upper bands across +4..+15.
- §15.2 takes `{ zMin, zMax }` from data and runs fixtures at −2..+2 and −4..+4. The checklist requires harnesses that run at both 9 layers and 32 layers. Q16 asks only whether old saves grow from 5 levels to 9.
- Sparse storage is real and is the part to keep. §15.3 UNIFORM chunks (one packed value, no cell arrays) make empty sky and untouched rock cost near zero, and §15.5 writes save bytes only for diffs. That pattern can scale with occupied cells. The budgets do not. §9 `sim.grid_mib` is ≤ 2.7 MiB at 5 levels and ≤ 4.8 MiB at 9. `save.bytes` is ≤ 1.25× the 5-level size at 9 levels. No 32-layer memory or save-size target is defined, and §15.4's "worst case" still multiplies a per-level cost by 9.

### 2. Governing Geometry & Scale — FAIL

The ADR never states the governing scale.

Required: 1 cell = 5 ft × 5 ft, 1 Z layer = 10 ft, 5 strata × 2 ft = 10 ft.

What the ADR says: "Strata per level stay at 5" (`STRATA = 5`, `DEUS_Levels.js:993`), with no foot measure anywhere in §15 or §0.

The same engine line the ADR cites is `const STRATA = 5, CELL_FT = 5`. The strata header says each 5 ft cell is five 1 ft strata (`DEUS_Levels.js:985-986`). The sphere form of `applyVolumeDamage` repeats that: "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`). The amended ruling changes stratum height from that 1 ft engine fact to 2 ft and the layer from 5 ft to 10 ft. Rev 2 neither records the current foot scale nor adopts the amended one. Keeping `STRATA = 5` does not satisfy the scale item.

### 3. Cross-Layer Blasts & Structural Damage — FAIL

The ADR does not specify blast propagation.

Required: a blast (fireball) damages a floor and continues into the layer below according to floor material, thickness, and attenuation. `applyVolumeDamage` propagates vertically with distance falloff and solid-material attenuation, with fire and impact treated differently.

What §16.1 says: `applyVolumeDamage` (`DEUS_Levels.js:1785-1795`) calls `damageCell`. Collapse in §16.4 is unsupported strata falling downward. That is V137 collapse, not a blast punching through a floor.

The function those lines introduce already does more than the sentence says, and the ADR never takes that behavior as the design:

- The box walks an elevation scale `e = (z + 2) * STRATA + s`, capped at 24, and damages every stratum in the box across levels (`:1805-1815`).
- `sphereDamage` (`:1821-1854`) applies constant, linear, or quadratic falloff. Distance mixes 5 ft horizontal cells with 1 ft vertical strata.
- Material resist already differs by type, including `impact`, `blast`, and `fire` (`DEUS_Levels.js:1005-1007`: stone fire 0.1 vs wood fire 2).

None of that is a floor-thickness rule: remaining damage after a floor fails, attenuated by material and thickness, applied to the layer below. Rev 2 does not state that rule, and it does not say how the existing volume call changes when a stratum is 2 ft and a layer is 10 ft.

### 4. Structural Integrity & Change-Driven Collapse (V137) — PASS

§16 places support and collapse in the headless core (`game/js/sim/systems/support.js`, `systems/collapse.js`). The `supportDirty` queue is fed only by mutations: stratum destroyed or damaged across a capacity threshold, build or remove, decay failure, and a collapse landing. Stable geometry does zero work (`support.work_per_tick` = 0), and a whole-world scan is a test mutant that must fail (§16.6).

Support is a downward solid path to the bottom stratum of `zMin`, or a sideways link within `spanCells[material]` (DEC-010 default). Overload is unsupported. An unsupported stratum falls to the first holder, becomes rubble or talus of the same family via `ledger.transform`, and deals V95 impact (mass × fall height, reduced by armour). Q-MASS is the LIFE-001 umbrella in §7.8. V137 at `docs/VISION.md:131` on `0c1baf8d` matches this section.

This section is written against the nine-layer column. The mechanism itself does not depend on the layer count. A revision should keep it and state that the same queue runs on −16..+15.

### 5. Urban Decay & Nature Reclamation (V138) — PASS

§17 puts decay, reclamation, and weathering in the core. Unmaintained elements lose HP in closed form. Sky exposure has the highest rate, so roofs fail first, and `failDay` enqueues the support mutation, which is the roof → wall → collapse sequence. Stages are intact → weathered → overgrown → collapsed → buried mound. Vegetation spreads only from neighbours onto abandoned floors and rubble. Sediment is a paired −k / +k transfer. Item weathering is rot to soil, metal to oxidised trace-mineral sediment, and durable goods to buried finds.

LIFE-001 is the Q-MASS transform chain. LIFE-002 is an explicit ban on ore outputs, with a test that fails the transform table if any output is ore (`docs/RISK_REGISTER.md:61`). LIFE-003 keeps history sites, monuments, and anchored graves at "buried mound" and never deletes the anchor (`docs/RISK_REGISTER.md:62`). Cadence is the game-day boundary (2,400 ticks), with due work spread across the day and a zero-scan mutant. LOD uses the same closed form at L0, L1, L2, and in deep-history day jumps. V138 at `docs/VISION.md:132` on `0c1baf8d` matches this section.

### 6. Nine required ADR-003 sections — PASS

| Required section | Where | Notes |
|---|---|---|
| Context & Motivation | §1 | Frame loop, 32 hooks in 26 plugins, view-dependent outcomes, conservation holes |
| Sim/Render Boundary & Module Layout | §2 | `game/js/sim/`; forbidden list includes `window`, `document`, `PIXI`, `Graphics`, `$game*`, `$data*`, `Game_*`, `Scene_*`, `Sprite*`, `UF`, `DEUS`, `Math.random` |
| Tick Model & Sub-tick Accumulator | §3 | Fixed 10 Hz, 1 tick = 36 game-seconds; host accumulator once per displayed frame; pause reasons and catch-up guard |
| Snapshot Read Interface & Change Feed | §4 | One read-only `SimView`, preallocated `Int32Array` feed, one command queue |
| LOD Region Model | §5 | 32×32 region, focus set, hysteresis, `full` until SIM.30.04. Band geometry is the nine-layer table (item 1) |
| Summary Simulation | §6 | Per-system fine vs L2 state and a coarse rule |
| Promotion & Demotion with Conservation Invariants | §7 | Atomic transition, ledger, Q-MASS |
| Incremental Migration Sequence | §8 | Increment 0 is Lane N in-place switch; later increments migrate live systems one at a time and keep the game playable |
| Performance Budgets | §9 | Allocation, heap, and tick ceilings. Marked PENDING-K3 because `tasks/WG.00.09b/lane-k/perf/` was absent on 2026-09-26. Amendment is required before SIM.00.03. The 32-layer grid and save rows are still missing (item 1) |

The index line in `docs/adr/README.md` matches the ADR status line.

### 7. Fact verification — FAIL

Most cited engine lines are exact, on `ebeec892` and on current `main` (`game/` and `tools/` are unchanged from `ebeec892` through `75cf2ff3`). Checked and holding: the §1.2 hook lines (World `:2932`, Fluid `:1016`, Ecology `:992`, Fire `:617`, Environment `:796`, Colonists `:5748`, Jobs `:1777`, Projects `:1596`, Combat `:1414`, Factions `:657`, Anim `:1506`, Ownership `:613`, TimeSpeed `:189`, Core `:505`, NaturalConnections `:508`, Levels `:4287`, Depth `:834`); `LEVELS` at `DEUS_World.js:155` and `DEUS_Levels.js:61`; Fluid `Z_MIN`/`Z_MAX`/`Z_LEVELS` at `:56-58`; Minimap `Z_LEVELS`/`Z_COUNT` at `:59-60`; strata air-on-destroy at `:1700-1702`; `levels:strataDestroyed` at `:1720-1722`; "no item drops in 19A" at `:1001-1002`; elevation cap `(minZ + 2) * STRATA + minS` at `:1805`; DEC-013, V137, V138, WG.00.17 `:105`, and SIM.40.01–.09 `:525-533` at `0c1baf8d`; LIFE-001..003 at `docs/RISK_REGISTER.md:60-62`; INV-SIM-01..03 at `docs/INVARIANT_REGISTRY.md:51-53`.

Two claims about current engine code are not exact.

1. `applyVolumeDamage` (`DEUS_Levels.js:1785-1795`) "calls `damageCell`" (§16.1). Lines 1783–1794 are the JSDoc. Line 1795 is the signature. `damageCell` is called at `:1815` (box) and `:1849` (sphere). The JSDoc in the cited span already documents cross-level box damage and a sphere with distance falloff, a 5 ft cell, and a 1 ft stratum. The citation both misses the call and skips the behavior written on those lines. `damageCell` itself is correctly at `:1709-1725` (the ADR's `:1708-1725` includes the preceding comment).

2. §1.3 says ecology steps the current area plus one rotating area each game hour, citing the header `DEUS_Ecology.js:22-27`. Those lines say "Every six game hours" and describe the population roll. The hourly driver comment is at `:876`: resources every hour, populations every six hours. `tickHour` (`:888-905`) runs plants and breeding on the current and rotating areas every hour; the population roll is gated at `:907`.

Minor: the SIM.00.01 pointer `docs/worldgen/DEUS_WORLDGEN_WBS.md:509` at `0c1baf8d` is the table header. The SIM.00.01 row is line 511. Factions "every 120 (`:631-632`)" is right for `:632` (`CONTACT_EVERY = 120`); `:631` is `CONTACT_CELLS = 12`.

The header's "current `main` (`0c1baf8d`)" is stale as a tip name. `main` is `75cf2ff3`. The code-identity claim still holds: `git diff --stat ebeec892 main -- game tools` is empty. Document claims that name `0c1baf8d` were checked at that commit and are right for it. They are the pre-amendment text.

## Revision required before a pass

1. Retarget §5.1 and §15 to 32 continuous layers, default −16..+15, 320 ft, and the amended five bands. State that storage and LOD scale past 32.
2. Define 32-layer memory and save-size budgets that grow with occupied or MIXED cells, not with 32 × area. Require fixtures and harnesses at 9 layers and at 32 layers. Keep the UNIFORM-chunk rule.
3. State the governing scale: 5 ft × 5 ft cell, 10 ft layer, 2 ft stratum. Reconcile `CELL_FT = 5` and the current 1 ft stratum comments (`DEUS_Levels.js:985-986`, `:1790-1791`).
4. Specify cross-layer blasts: floor material, thickness, and attenuation into the layer below; vertical distance falloff; fire vs impact. Cite `applyVolumeDamage` at the signature `:1795`, the box call `:1815`, and the sphere call `:1849`, and correct the ecology hour citation.
5. Leave §2–§4, §7–§8, §16, and §17 in place, and extend their Z assumptions to the 32-layer range.

VERDICT: FAIL
