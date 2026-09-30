# BRIEF: NAT.03.01 / lane-cw — DEUS_Fluid & Sim/Hydro Design-Independent Correctness Fixes

Date: 2026-09-30
Task ID: NAT.03.01
Lane: lane-cw
Branch: task/lane-cw
Writer: Codex (OpenAI)
Reviewer: Grok (xAI)
Authority: MSG-PRUNE-PM-034; SYSEVAL-B01 (Grok Heavy + ChatGPT Pro merged consensus); Owner DEC-037 / DEC-038.

---

## GAME TRANSLATION

WBS / Lane: NAT.03.01 / lane-cw
Approved scope / Owner authorization reference: Owner directive 2026-09-30 (MSG-PRUNE-PM-034; SYSEVAL-B01 merged scope).
Writer SHA / evidence date: Inception 2026-09-30
Translation Class: C FOUNDATIONAL / INDIRECT (Core hydrological simulation correctness, work scheduling, coordinate consistency, and typed mass preservation).

Player / World Effect:
Surface and underground water flow, pooling, lake levels, and rain/seepage simulation execute with bounded computational cost (zero idle churn), without coordinate translation bugs, without dropping liquid records on world boundary shifts or save/load cycles, and without phantom lava-to-water transmutations or untyped liquid mass leaks.

Trigger:
Hydrological tick execution (`UF.Fluid.tick()`), map transition/expansion, save/load cycles, and fluid-strata reconciliation passes.

Runtime Authority:
`game/js/plugins/DEUS_Fluid.js` and `game/js/sim/hydro/` simulation modules. Single authority consolidation across `sim/hydro` vs `sim/hydrology` is held for Braintrust Design D2.

Simulation Path:
`game/js/plugins/DEUS_Fluid.js`, `game/js/sim/hydro/index.js`, `game/js/sim/hydro/pressure.js`, `game/js/sim/hydro/permeability.js`, `game/js/sim/hydro/evaporation.js`.

Engine Bridge:
RMMZ map tile/visual liquid representation via `DEUS_Levels.js` and `DEUS_Visuals.js`. Runtime authority unification deferred to Braintrust Design D2. Player-facing status: FOUNDATION CORRECTNESS PASS.

Visible Result:
Water and lava depth/fraction queries return strictly consistent values regardless of `{x, y}` vs `{ax, ay}` coordinate form; liquids do not leak through closed doors/walls during rain/spill; world saves retain complete fluid state across boundary shifts.

Persistence:
Save payload `fluids` and `hydro` structures in save game state. Absences reset cleanly; failed requires do not drop saved payloads.

Failure Without This Lane:
`tick(0)` continues doing full work; lake cells are enumerated every tick; out-of-range z drops fluid on map reload; coordinate overloads disagree; displaced lava turns into water; 32-bit `|0` overflows truncate liquid mass totals.

Automated Proof:
Automated test suite `tools/test_fluid_correctness_lane_cw.js` with individual assertion cases and real failure mutants proving items (a) through (h).

In-Game Proof:
NOT RUN (Bounded simulation foundation pass; direct in-engine playtest deferred to D2 integration).

CONSUMED BY GAME SYSTEMS:
- `DEUS_Levels.js` (flood fill / liquid strata queries)
- `DEUS_Visuals.js` (water and lava rendering depths)
- `DEUS_WorldGen.js` (strata fluid reconciliation)
- Corruption consequence: Liquid disappearance, lake freeze-ups, incorrect passability, or memory/CPU spikes.

GAME BRIDGE STATUS
Simulation implemented: YES - Correctness fixes to DEUS_Fluid and sim/hydro
Engine bridge implemented: NO - Authority unification held for Design D2
Presentation implemented: NO - Deferred to D2
Input/player interaction implemented: N/A - Foundational simulation
Save/load implemented: YES - Save isolation and preservation fixes
Playable verification performed: NO - Foundation scope

Remaining step before player can experience it:
Braintrust Design D2 authority settlement, followed by runtime bridge integration.

---

## Detailed Task Scope (MSG-PRUNE-PM-034)

Implement the following design-independent correctness fixes:

1. **(a) Work Budget & Scheduling**:
   - One shared work budget across all queued areas.
   - `tick(0)` does ZERO work.
   - No per-tick enumeration of every lake cell; use area-indexed scheduling.
   - `cost()` must count real work performed.

2. **(b) Coordinate & Range Preservation on Load**:
   - `load()` must keep records outside the legacy range.
   - `zMin` must re-base dynamically when `UF.World` expands.

3. **(c) Coordinate Overloads & Walkability**:
   - `depthAt`, `typeAt`, and `fluidFillFractionAt` must give identical results for `{x, y}` and `{ax, ay}`.
   - `walkable` must respect the caller's z coordinate.
   - `setCell` must honor `{ax, ay}` and cell capacity.

4. **(d) Typed Liquid Conservation in Reconciliation**:
   - Never overwrite another liquid type.
   - Displaced lava must remain lava, never counted or converted to water.
   - Retain displaced liquid in the typed store without deletion pending Design D2.

5. **(e) Save Isolation & Fault Tolerance**:
   - Absent save keys must reset fluid state cleanly.
   - A failed hydro require must NOT drop the saved hydro payload on the subsequent save.

6. **(f) Mass Total Precision**:
   - Remove all `|0` bitwise truncation narrowing on liquid mass totals.

7. **(g) Shared Passage Rules**:
   - Hydro rain, spill, and seepage must respect the exact same closed doors and walls as `DEUS_Fluid`.

8. **(h) Documentation Integrity**:
   - In `docs/systems/DEUS_Fluid.md`, remove false claims ('COMPLETED/VERIFIED', 60 FPS claims, 'zero GC').
   - Accurately state what is wired vs pending.

9. **Tests & Mutants**:
   - Provide `tools/test_fluid_correctness_lane_cw.js` testing (a)-(h).
   - Each check must be able to fail.
   - Replace `_mutantDelete` with an authentic mass-deletion mutant.

10. **Held for Design D2**:
    - Do NOT decide single authority between `sim/hydro` vs `sim/hydrology`.
    - Do NOT consolidate `sim/hydrology`.
    - Do NOT alter displaced-water return path, waiter/spring wakeups, or water/lava reaction products.
