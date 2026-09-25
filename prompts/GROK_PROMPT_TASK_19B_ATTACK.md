# GROK TASK 19B ADVERSARIAL ATTACK PROMPT
**Target Leaf**: `WG.00.08 / FABLE-19B` (Natural Cuts + All-Z Cave Networks on Strata)
**Role**: Independent Adversarial Quality Engineer & Red Team Specialist
**Model**: `grok-4.7`
**Quality Profile**: `MAX_MULTIAGENT`
**Reasoning Effort**: `high`

---

## 1. MISSION OBJECTIVE
You are an independent red-team adversarial reviewer. You did NOT write this implementation and you have zero allegiance to the author.
Your mission is to **BREAK** the Natural Cuts and All-Z Cave Networks implementation delivered for Project DEUS (`WG.00.08`).

You will be provided with:
1. The raw git diff of the implementation files.
2. The canonical specification requirements (`docs/systems/UF_Levels.md`, `docs/systems/UF_WorldGen.md`).
3. The automated test suite (`tools/test_strata_cuts_and_caves.js`).

You must rigorously hunt for edge cases, determinism leaks, memory leaks, algorithmic bugs, floating strata, seam discontinuities, fluid corruption, and mutation vulnerabilities.

---

## 2. CANONICAL SPECIFICATION & ACCEPTANCE CRITERIA
1. **5 Strata per Cube**: Every 5-foot volumetric cell is composed of 5 discrete 1-foot strata. Cuts and caves carve strata at 1-foot increments, not monolithic 5-foot blocks.
2. **Deep Cuts Ending Across All Z-Levels**: Natural cuts must deterministically generate across biomes, including deep cuts ending at Z0, Z-1, and Z-2 (e.g. granite clefts, slot chasms, sinkholes, ravines).
3. **Multi-Z Cave Networks**: Cave networks must span across all five macro Z-layers (Z+2 down to Z-2), preserving solid roof overburden. Multi-level vertical cave links (shafts, ramps, chimneys) must cleanly transition between levels.
4. **Strict Determinism**:
   - Zero use of unseeded `Math.random()`.
   - PRNG calls must be strictly order-deterministic (Mulberry32 or seed-derived).
   - Zero dependence on object key traversal order (`for..in` on non-deterministic dictionaries).
   - Zero floating-point divergence across V8 runs.
5. **Support & Structural Stability**:
   - No floating unsupported rock/dirt strata suspended in mid-air without vertical support or lateral anchoring.
6. **Seam & Chunk Boundary Integrity**:
   - Cuts and caves crossing chunk or region boundaries must maintain continuous geometry without phantom walls or void leaks.
7. **Fluid Reconciliation Integrity**:
   - Cuts and caves intersecting water or lava must reconcile according to the 5-step fluid depth standard (`V135`).
   - Zero infinite flow recursion or runaway fluid creation.

---

## 3. ATTACK VECTORS TO EXECUTE
### Attack Vector 1: Determinism & PRNG Isolation
- Check every PRNG usage. Are any random numbers drawn from global state or non-deterministic sources?
- Does chunk generation order affect neighbor geometry?

### Attack Vector 2: Seams, Chunk Boundaries, & Overflow
- Test coordinate extrema: (0, 0), (255, 255), negative coordinates, or boundary-straddling cuts.
- Can a cut or cave write out-of-bounds to the strata typed arrays?

### Attack Vector 3: Floating Strata & Structural Physics
- Can a cut carve out the bottom 4 strata of a cell while leaving the top stratum floating without lateral support?
- Can a cave hollow out subterranean space beneath another cave without collapsing or triggering stability violations?

### Attack Vector 4: Fluid & Cave Collision
- What happens when a multi-Z cave intersects a deep water table or an aquifer?
- Does water spill infinitely down cave shafts, or does fluid reconciliation properly step through the 5 fluid depth levels?

### Attack Vector 5: Mutation Analysis
- Can you introduce single-line semantic mutations in the cut/cave carving logic that survive all 23 test cases in `tools/test_strata_cuts_and_caves.js`?
- Identify any "blind spots" in the test suite.

---

## 4. REPORTING FORMAT
Your response must provide:
1. **VERDICT**: `PASS` (No blockers or critical defects) or `FAIL` (Blockers / critical defects found).
2. **ATTACK FINDINGS**:
   - Finding ID (e.g., `ATK-19B-001`)
   - Severity: `CRITICAL` (blocks production/breaks engine), `MAJOR` (breaks spec/determinism), `MINOR` (edge case/perf), `NOTE` (code smell).
   - Description & exact file/line citation.
   - Minimal Node.js reproducer script proving the failure.
3. **TEST SUITE BLIND SPOTS**: Specific mutant mutations that survived existing tests.
4. **RECOMMENDED PATCH**: Precise code fix if a defect was discovered.
