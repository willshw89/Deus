# NAT.04.01 / lane-by — attempt 3 report (writer: Claude Code)

Date: 2026-09-29. Owner approved this attempt the same day under AGENTS.md Rule 10 after two Grok FAILs
(`50c08991` on `ace19c25`, `97432c21` on `c96dfce8`). Closed-mass scope per the Owner's 2026-09-29
clarification recorded under DEC-040: a weight ledger for world material and water; type, volume and
density may change, weight may not; plants, creatures and gases are outside the rule.

## What changed
- `game/js/sim/geomorphology/soil.js`: rewritten slope cascade and column model.
  - Only loose sediment cascades; the solid matrix never slides (brief §3.3).
  - A new deposit cell starts with zero solid, zero loose, zero water (`SoilStratum.deposit`). The
    constructor's full-cell default is what minted 187,500 cp per new cell on attempt 2.
  - `bulkDensity` is the material's density and is never recomputed from mass. Fill height follows from
    mass: `(solid + loose) / density / 25 sq ft`, capped at 2 ft.
  - A column's surface is the top of its highest stratum that still holds material; an emptied shell no
    longer defines the surface.
  - A column the engine has no strata for is unknown ground: no cascade into it. An optional
    `groundElevationProvider(x, y)` hook lets the world bridge supply a floor; the deposit is then placed
    in the stratum band containing that floor.
  - Per-tick transfer moves half the excess height as volume, capped by the loose available and the
    receiving cell's free volume; a full receiver spills into the cell above it (crossing Z at s=4).
    The source is re-queued only while it still holds loose sediment and the step is still steeper than
    `tan(theta) * 5 ft`.
  - Two work queues, `dirtyMoisture` and `dirtySlope`; the moisture pass can no longer consume the
    slope pass's work. `dirtyColumns` remains as a read-only union for old callers.
  - Capillary wicking: rate `2000 * deficit / fieldCapacity` per tick with a floor of 1 cp, passed to the
    signed residual unrounded; the receiver stays queued until it reaches field capacity or the donor has
    nothing above its own field capacity.
  - Column index (`columns` map) replaces the full-strata walk for surface lookups; rebuilt on load.
  - `depositSuspendedSediment` returns suspended sediment to a stratum as loose alluvium, debiting the
    reservoir (brief §3.4 "depositing alluvial loam downstream").
  - `soil.js` publishes `window.DEUS.Sim.Soil` and `window.DEUS.Sim.Geomorphology` itself.
  - 9 new mutants, one per defect class, each caught by the suite.
- `tools/test_soil_geomorphology.js`: 27 tests, 136 assertions, every closed-mass check on
  `getTotalMass().total` every tick; `--mutation-sweep` runs all 14 mutants in child processes and
  requires each to fail on an assertion (a hard-coded exit does not count).
- `tasks/NAT.04.01/lane-by/lane.json` (separate `[pm]` commit): writer `claude`, sweep added to gateTests.

## How I tested it
```
node tools/test_soil_geomorphology.js                    -> RESULT: 136 passed, 0 failed (exit 0)
node tools/test_soil_geomorphology.js --mutation-sweep   -> SWEEP RESULT: 14 caught, 0 survived (exit 0)
```
Independent re-run of Grok's attempt-2 probe against this code (scratchpad `probe_slope_new.js`):
gate fixture 425,000 cp after each of 8 slope ticks (attempt 2: 1,737,500 after 8); lone loose cell
237,500 -> 237,500 (attempt 2: +187,500 in one tick); moisture-then-slope order moves sediment
(attempt 2: 0).

## Grok's attempt-2 findings, status on this tip
| Finding (`review_grok_c96dfce8.md`) | Status |
|---|---|
| New strata built at `bulkDensity * 50` solid (mints 187,500 cp per deposit) | Fixed; `test_slope_stability_cascade_conservation`, `test_slope_deposit_above_full_cell_crosses_z` assert new cells start at 0 solid; world total asserted every tick |
| Empty cardinal neighbours read as elevation 0 | Fixed; unknown ground receives nothing (`test_slope_unknown_ground_moves_nothing`); provider hook for the bridge (`test_slope_ground_provider_floor`) |
| Source solid leaves sideways; emptied shell stays the surface | Fixed; solid never cascades; `test_emptied_cell_is_not_surface` |
| Cascade never settles; dirty set grows | Fixed; `test_slope_settles_at_angle_of_repose` (final step within `tan(20°)*5`), queues empty at the end of every slope test |
| Moisture pass clears the flag slope needs | Fixed; two queues; `test_slope_runs_after_moisture_pass` |
| Capillary stops after one pulse, 33,671 cp short | Fixed; `test_capillary_reaches_field_capacity_unaided` (reaches 49,140 unaided) |
| 0.407 cp rate rounded away before the residual | Fixed; `test_capillary_residual_sees_unrounded_rate` (100 cp and 10 cp deficits close exactly) |
| `getHighestStratumAt` walks every stratum | Fixed; column index; `test_slope_lookups_are_column_local` (2,000 strata, ≤6 lookups, ≤30 scanned) |
| Gate asserted two loose fields after one tick | Fixed; `getTotalMass().total` every tick, 8-tick run, competing transfers, exhausted donor, save/continue equivalence |
| `index.js` alone does not publish the kernel | `soil.js` publishes both names; `test_browser_realm_entry_points` |
| Ledger journal credit with no debit; residual entries 0 | Not changed. Journals are running records, not reservoirs; `getTotalMass()` is the conservation authority. Non-blocking under the Owner's 2026-09-29 scope |

## GAME TRANSLATION

```text
WBS / Lane:                 NAT.04.01 / lane-by
Approved scope:             Owner Directive 2026-09-28 14:28 CT (Package 4); attempt 3 approved 2026-09-29.
Writer SHA / evidence date: see the [claude] commit that adds this file / 2026-09-29
Translation Class:          C FOUNDATIONAL / INDIRECT on this tip (B once bridged)

Player / World Effect:      Loose sediment on a steep bank slides into the lower cell and settles at its
                            angle of repose; topsoil over a water table wets up to field capacity; excess
                            rain drains down; bedrock weathers to regolith; eroded soil returns downstream.
Trigger:                    markDirty from excavation, water-table change, deposition or weathering events.
Runtime Authority:          game/js/sim/geomorphology/soil.js (GeomorphologyEngine).
Simulation Path:            processMoistureTick -> processSlopeStability (simulateQuiescence), events via
                            applyWeathering / applyWaterErosion / depositSuspendedSediment / applyThermalDegradation.
Engine Bridge:              NOT IMPLEMENTED on this tip. No plugin loads game/js/sim/geomorphology; nothing
                            in game/js/plugins calls it. DEFERRED TO a bridge lane that feeds DEUS_Levels
                            strata into the engine and sets groundElevationProvider from the level data.
Visible Result:             none yet (no bridge).
Persistence:                engine.serialize()/deserialize() carry strata, both queues, residuals, journals,
                            reservoirs; save/continue equivalence tested. Not yet in the game's save blob.
Failure Without This Lane:  Package 5 (Climate) and 6 (Flora) have no soil moisture or horizon data to read.
Automated Proof:            node tools/test_soil_geomorphology.js; --mutation-sweep (outputs above).
In-Game Proof:              NOT RUN. No F5 scenario exists until the bridge lane lands.

Simulation implemented:            YES (this tip)
Engine bridge implemented:         NO (deferred, named above)
Presentation implemented:          NO
Input/player interaction:          NO
Save/load implemented:             YES in the kernel; NO in the game save
Playable verification performed:   NO
Player-facing status:              NOT YET PLAYABLE

CONSUMED BY GAME SYSTEMS: Package 5 Climate (moisture, thermal mass), Package 6 Flora (moisture, horizon,
organic), excavation (yield by density), fluid/erosion (suspended sediment reservoir).
```

## Not done / known problems
- No engine bridge: the kernel is not loaded by any plugin, so nothing is visible in play. That is a
  separate authorized step, not this lane.
- Mass units across the sim are still mixed (aquifer.js centipounds, collapse.js pounds); this lane uses
  centipounds throughout and does not touch the others.
- The surface-height model treats an over-full fixture cell (solid full plus loose on top) as 2 ft high;
  the test fixtures inherited from attempt 1 build such cells. Real world data should not.
- Volume is not conserved and is not meant to be (Owner: weight, not chemistry).
