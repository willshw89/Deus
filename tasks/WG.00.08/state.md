# Task State: WG.00.08 / FABLE-19B — Natural Cuts & All-Z Caves on Strata

- **Task ID:** `WG.00.08`
- **WBS ID:** `WG.00.08`
- **Role:** Writer: Fable / Gemini | Reviewer: Grok
- **Branch / Worktree:** `main` (`c:\Users\snewt\OneDrive\Desktop\UF`)
- **Last Commit:** `8d1c7c3`
- **Current Gate:** Lane A: 19B Closeout Evidence (Targeted Z-2 generated cut proof delivered).

## Owned File Set
- `game/js/plugins/DEUS_Levels.js`
- `game/js/plugins/DEUS_WorldGen.js`
- `tools/test_strata_cuts_and_caves.js`
- `tools/test_generated_z2_cut_proof.js`
- `tasks/WG.00.08/*`

## What is Done (with Evidence)
1. **Physical clearance & continuous air run**: `continuousAirHeight` and `airRunAt` stop at solid and fluid strata (`!== M_AIR`), caught by `clearance_stops_at_fluid` and `air_through_fluid` / `airrun_through_fluid` mutants (commit `2e4571a`, merged `31676cf`).
2. **Fluid-safe carving**: Shafts and skylights refuse columns holding fluid strata (`fluidIn`), preserving 100% of fluid strata with 0 rock carved underneath (commit `2e4571a`).
3. **Targeted Z-2 Cut Proof**: `tools/test_generated_z2_cut_proof.js` verified on Seed 18, Ravine #4 at (194, 89):
   - First air at 3 ft (Z-2 S3).
   - Multi-Z shapes: Z0 open, Z-1 open, Z-2 floor (`HEIGHT_3_OF_5`), Z+1 open, Z+2 open.
   - Fluid audit: Gen 4 fluid strata = 24, Gen 5 fluid strata = 24, 0 fluid lost, 0 rock carved under fluid in 61x61 neighborhood.
   - Map proof rendered to `game/test_output/z2_cut_proof_seed18_194_89.png`.
   - Result: ALL 7 CHECKS PASSED (exit 0).
4. **Isolated Child Suites**:
   - `node tools/test_strata_fluid_reconciliation.js`: 146.0 s wall clock, 36/36 passed, 5/5 mutants detected (exit 0).
   - `node tools/test_strata_foundation.js`: 93.0 s wall clock, 26/26 passed (exit 0).

## Exact Next Step
- Grok independent adversarial review and formal closure sign-off of Lane A / WG.00.08.

## Open Defects / Questions
- ATK-19B-001: CLOSED by Grok on `2e4571a` / `689aff8`.
- ATK-19B-002: CLOSED by Grok on `2e4571a` / `689aff8`.

## Relevant Commands
```bash
node tools/test_generated_z2_cut_proof.js
node tools/test_strata_fluid_reconciliation.js
node tools/test_strata_foundation.js
```
