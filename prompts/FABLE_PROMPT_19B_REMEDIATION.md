# DEUS — FABLE REMEDIATION ASSIGNMENT: WG.00.08 / FABLE-19B
**Target Leaf**: `WG.00.08 / FABLE-19B` (Natural Cuts + All-Z Cave Networks on Strata)  
**Agent**: Fable (Claude Code / `claude-opus-5-5[1m]`)  
**Worktree**: `scratchpad/wt19b` (Branch: `task/19b-cuts-caves`)  
**Trigger**: Grok 4.7 Independent Adversarial Red-Team Review Defect Return  
**Review Status**: **FAIL** (2 MAJOR defects discovered)  

---

## 1. GROK ADVERSARIAL REVIEW FINDINGS

### Finding 1: ATK-19B-001 — MAJOR (Clearance vs. Fluid Contradiction)
**Location**: `game/js/plugins/DEUS_Levels.js` (lines ~2900-2904 and ~2921-2925)  
**Issue**:
`continuousAirHeight` and `airRunAt` count water (`M_WATER`) and lava (`M_LAVA`) as air.
The handoff specification §8 explicitly requires **continuous air**. A water-filled or lava-filled space must have 0 air clearance. The loop also erroneously continues through fluid into air above it.

In commit `116a3de`:
```javascript
while (s < STRATA) {
    if (SOLID_B[rdM[rdO + s]] === 1) return h;
    h++;
    s++;
}
```
Because `SOLID_B[M_WATER]` is 0 and `SOLID_B[M_LAVA]` is 0, liquid strata are counted as air!

**Required Fix**:
Stop the air run on the first non-air byte in both `continuousAirHeight` and `airRunAt`:
```javascript
while (s < STRATA) {
    if (rdM[rdO + s] !== M_AIR) return h;
    h++;
    s++;
}
```
*(Leave `derivePacked` alone: pool floors are fill 1 with water in S1–S2, and that headroom rule is what makes them floors).*

---

### Finding 2: ATK-19B-002 — MAJOR (Shafts/Skylights Fluid Destruction)
**Location**: `game/js/plugins/DEUS_Levels.js` (lines ~2496 and ~2512)  
**Issue**:
Cave voids correctly abort a cell when they see fluid (`carveVoid`, line 2424, `return 0` before any write).
However, vertical shafts (line 2496) and skylights (line 2512) destroy fluid by turning fluid strata into air:
```javascript
// Line 2496:
for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1 || FLUID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }
```
Skylights stop at fluid only after lower strata in that column are already air.

**Required Fix**:
Shafts and skylights must follow the cave void rule:
If any stratum in the vertical interval is fluid (`FLUID_B[getE(i, e)] === 1`), do NOT carve through fluid. Pre-scan the column interval first: if fluid is present, abort/skip that column and write nothing. Carve solids only.

---

### Finding 3: Test Suite Blind Spots & Mutant Verification
**Location**: `tools/test_strata_cuts_and_caves.js`  
**Issue**:
The existing 23 checks passed despite the above defects because the clearance test fixture only built stone/air columns, and no tests asserted that fluid stops `continuousAirHeight`.
Furthermore, three mutants survived `--no-suites`:
1. `air_stops_on_fluid`: stopping air run on fluid was not asserted.
2. `void_min_1`: `if (C - F < 3) return 0` becoming `< 1` changed seed 18's Z-2 checksum from `dcfbb91b` to `3414e712` and added 86 cave floors, but survived because 3 ft void floor was not asserted.
3. `shaft_keeps_fluid`: shaft carving clearing only solid was untested.

**Required Fix**:
1. Add explicit test assertions in `tools/test_strata_cuts_and_caves.js` verifying that:
   - S0 stone, S1–S4 water, +1 solid -> `continuousAirHeight` returns `0`.
   - S0 stone, S1–S2 air, S3–S4 water -> `continuousAirHeight` returns `2`.
   - Z-2 S0 stone, S1–S4 lava, -1 solid -> `continuousAirHeight` returns `0`.
   - `airRunAt` produces identical results on the same fixture.
2. Add explicit check or mutant asserting that cave voids with `C - F < 3` are rejected.
3. Update `docs/systems/UF_Levels.md` to clarify that `continuousAirHeight` measures continuous **air** above the floor (stopping on solid OR fluid), aligning with the specification.

---

## 2. EXECUTION CONSTRAINTS
- Work strictly inside `scratchpad/wt19b` on branch `task/19b-cuts-caves`.
- Do NOT touch `main` branch.
- Run `node tools/test_strata_cuts_and_caves.js` to ensure all checks pass and all mutants (including new ones) are detected.
- Commit the fix with:
  `[fable] DEUS-TSK-FABLE-19B fix continuousAirHeight fluid stop and shaft fluid conservation`
