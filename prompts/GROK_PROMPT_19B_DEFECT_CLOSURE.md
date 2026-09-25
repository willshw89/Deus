# GROK TARGETED DEFECT-CLOSURE REVIEW
**Target Leaf**: `WG.00.08 / FABLE-19B` (Natural Cuts + All-Z Cave Networks on Strata)
**Role**: Independent Adversarial Red Team Specialist & Quality Auditor
**Model**: `grok-4.7`
**Reasoning Effort**: `high`

---

## 1. MISSION OBJECTIVE
You previously audited commit `116a3de` on `task/19b-cuts-caves` and issued **VERDICT: FAIL** with two MAJOR findings and identified test blind spots:
1. `ATK-19B-001 — MAJOR`: `continuousAirHeight` and `airRunAt` count water and lava as air.
2. `ATK-19B-002 — MAJOR`: Vertical shafts and skylights turn fluid bytes into air, violating fluid conservation.
3. Test suite blind spots: `air_stops_on_fluid`, `void_min_1`, and `shaft_keeps_fluid` survived without failing tests.

Fable has authored a remediation commit on branch `task/19b-cuts-caves` in worktree `scratchpad/wt19b`.
Your job is to rigorously verify whether the defects are truly CLOSED and whether the mutants are genuinely CAUGHT.

---

## 2. EVIDENCE TO INSPECT ON `task/19b-cuts-caves`
Inspect the latest commit on `task/19b-cuts-caves`:
1. `game/js/plugins/DEUS_Levels.js`:
   - `continuousAirHeight` and `airRunAt`: verify `rdM[rdO + s] !== M_AIR` stops the air run on any non-air stratum (solid OR fluid).
   - Shafts and skylights: verify `fluidIn` interval pre-scan aborts/skips columns containing fluid, preventing fluid destruction.
2. `tools/test_strata_cuts_and_caves.js`:
   - Verify new check `clearance_stops_at_fluid` tests water (depth 0, depth 2) and lava (depth 0) on `continuousAirHeight` and `airRunAt`.
   - Verify new check `shafts_keep_fluid` tests planted water in shaft/skylight paths.
   - Verify the 5 new pinned mutants in `MUTANTS`:
     - `air_through_fluid`
     - `airrun_through_fluid`
     - `void_min_1`
     - `shaft_through_fluid`
     - `skylight_through_fluid`
3. Execute tests and probes in `scratchpad/wt19b` or a detached worktree of the remediation commit.

---

## 3. REQUIRED REPORTING VERDICTS
Your report MUST provide explicit verdicts for each item:

```text
ATK-19B-001: [CLOSED / OPEN]
ATK-19B-002: [CLOSED / OPEN]

MUTANT VERDICTS:
air_through_fluid: [CAUGHT / SURVIVES]
airrun_through_fluid: [CAUGHT / SURVIVES]
void_min_1: [CAUGHT / SURVIVES]
shaft_through_fluid: [CAUGHT / SURVIVES]
skylight_through_fluid: [CAUGHT / SURVIVES]

OVERALL DEFECT-CLOSURE VERDICT: [PASS / FAIL]
```

Provide concrete command outputs and test execution evidence proving your verdicts.
