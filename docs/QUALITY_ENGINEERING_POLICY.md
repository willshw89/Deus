# DEUS — QUALITY ENGINEERING POLICY & VERIFICATION PIPELINE

**Effective Date:** 2026-09-25  
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)  
**Status:** CANONICAL & BINDING (Approved by Owner Directive)  

---

## 1. Owner Intent & Canonical Pipeline

Project DEUS development is optimized not merely for agent utilization, but for **MAXIMUM VERIFIED QUALITY**. Substantive engineering tasks do not conclude with an implementer's self-assessment; they must survive an adversarial, multi-agent verification pipeline.

### Canonical Substantive-Task Pipeline
```text
WBS LEAF
  ↓
TASK CONTRACT / DEFINITION OF DONE
  ↓
INDEPENDENT PRE-IMPLEMENTATION ATTACK / TEST PLAN
  ↓
PRIMARY IMPLEMENTER (MAX_MULTIAGENT)
  ↓
AUTOMATED TESTS (Harness & Mutation)
  ↓
INDEPENDENT POST-IMPLEMENTATION ADVERSARIAL REVIEW
  ↓
PERFORMANCE & MEMORY BENCHMARK
  ↓
NATIVE RMMZ VERIFICATION (When Relevant)
  ↓
GEMINI INTEGRATION DECISION
  ↓
OWNER GATE (Only when genuinely required)
  ↓
DONE
```

> **Canonical Shorthand:**  
> **`SPEC → IMPLEMENT → BREAK → BENCHMARK → INTEGRATE`**

---

## 2. Canonical Quality Directives

### 2.1 One Primary Writer Principle
For each owned file set, exactly **ONE PRIMARY WRITER** is authorized.
- Subagents and secondary workers inspect, reason, design tests, profile, and critique read-only.
- If an alternative implementation is proposed, it must be developed on an isolated git worktree branch.
- Concurrent writers are strictly forbidden from modifying overlapping canonical files.

### 2.2 Independent Pre-Implementation Attack Plan
Before substantive implementation begins on a major feature, a **DIFFERENT provider/model** is assigned to formulate failure modes:
- The attack planner receives: canonical WBS requirements, frozen architecture, relevant code, and baseline tests.
- It is deliberately **unanchored** by the implementer's prospective rationale.
- It identifies: edge cases, invalid states, cross-Z boundaries, regression risks, determinism breaks, likely false-positive tests, and Rule 4 mutant injections.
- Acceptance criteria and adversarial tests are frozen **before** implementation concludes. The implementer may not redefine success retroactively.

### 2.3 MAX_MULTIAGENT Implementation Role
The primary implementer executes under `QUALITY_PROFILE = MAX_MULTIAGENT`:
- Strongest available model, highest practical reasoning (`effort: xhigh`), expanded context, and provider-native subagents.
- Subagents handle repository exploration, test analysis, performance checks, and internal self-critique.
- The primary worker remains strictly accountable for code, tests, performance proof, commits, and report evidence.

### 2.4 Independent Post-Implementation Review
The model/provider that implemented a feature must **never** be the sole judge of its correctness:
- **`IMPLEMENTER != FINAL ADVERSARIAL REVIEWER`**
- Standard cross-provider pattern:
  - Claude/Fable implements → Grok attacks → Codex/Astra attacks (when available) → Gemini integrates.
- The reviewer receives: canonical task contract, actual git diff/commit, frozen invariants, and tests.
- Reviewer question: *"Does the committed code actually satisfy the specification?"* (not *"Is the implementer's explanation persuasive?"*).

### 2.5 Dedicated "Try to Make This Fail" Phase
High-risk systems must undergo an explicit adversarial breaking pass:
- Pathological seeds, boundary coordinates, coordinate extremes (min/max).
- Save/reload cycles, malformed save state injections, schema mutations.
- Cross-Z boundary steps (`Z0 S0` vs `Z-1 S4`), void clearance edge cases.
- Extreme resource scarcity, complete abundance, massive colonist counts.
- Long-duration simulation ticks and deterministic rerun consistency.

---

## 3. Golden Benchmark Suites & Visual Regression

### 3.1 Stable Golden Seeds
Major procedural systems maintain permanent Golden Regression Seeds:
- **Seed Types:** Ordinary terrain, extreme canyon/ravine, multi-Z cave network, deep Z-2 exposure, fluid/lava interaction, biome transition stress, connectivity stress, pathological edge case.
- **Tracked Invariants:** Determinism checksums, 3D connectivity, New Game latency, peak allocation, cave frequency, cut frequency, save/load roundtripping, and visual rendering proof.

### 3.2 Golden Visual Regression (RMMZ Native)
All visual validation is grounded in **ACTUAL RMMZ EDITOR & ENGINE SCREENSHOTS**:
- Zero reliance on AI-generated concept art or external mockups for engine verification.
- Maintain Golden Scenes for: Temperate Z0, Wet Z0, Arid Canyon, High Multi-Z Cave, Volcanic Fissure, 5-Z Exposure, Biome Transition, and Settlement Infrastructure.
- Visual review checks: scale drift, palette fidelity (`art/palette/uf.hex`), grid alignment (48px), readability at 1.00x zoom, animation loop stability, and depth contrast.

---

## 4. Machine Gates vs. Owner Gates

To avoid bottlenecking development, gates are cleanly partitioned:

### Machine / Coordinator Gate (Gemini Autonomous Authority)
Gemini approves and integrates without interrupting the owner when evidence proves:
- Automated test suites pass (100% green).
- Rule 4 mutants detected (proof of failure capability).
- Determinism confirmed across seed reruns.
- Memory and frame budgets respected (<0.02 ms frame cost, zero hot-path allocation).
- Save/load serialization and schema versioning valid.
- 25-stratum geometry and physical invariant validity.
- Clean working tree, zero file conflicts, and single-writer ownership preserved.

### Owner Gate (Owner Interruption Required)
The owner is reserved exclusively for high-leverage judgment:
- Creative visual approvals (YEA / NAY on delivered source art batches).
- Gameplay feel, pacing, and core balance decisions.
- Scope expansion or architectural alterations to frozen/canonical systems.
- Incompatible legitimate alternatives requiring a strategic product choice.
- Irreversible creative decisions.

---

## 5. Confidence Reporting & Task Metadata

Every substantive worker return must provide structured uncertainty accounting:

```text
STATUS:                  DONE | BLOCKED | NEEDS_COORDINATOR | NEEDS_OWNER
CONFIDENCE:              HIGH | MEDIUM | LOW
EVIDENCE:
- Tests:                 <suite results, mutant detection count>
- Benchmarks:            <latency before/after, memory delta>
- Files Touched:         <file paths>
- Verification Steps:    <exact commands executed>

UNVERIFIED ASSUMPTIONS:
- [...]

KNOWN RISKS:
- [...]

WHAT WOULD PROVE THIS WRONG:
- <specific failure conditions or falsification tests>
```

*Reports lacking explicit uncertainty accounting and falsification conditions are rejected.*

---

## 6. Architecture Maturity & Design Freeze Levels

Every core architectural concept is assigned an explicit maturity state:
- `EXPERIMENTAL`: Under active test; subject to free modification or replacement.
- `PROVISIONAL`: Preferred current direction; may adapt based on empirical benchmark evidence.
- `FROZEN`: Tested and locked; requires coordinator documented rationale to reopen.
- `CANONICAL`: Core source of truth; changing requires explicit coordinator and owner consensus.

---

## 7. Automatic Second-Opinion Escalation Rules

The coordinator **automatically** dispatches an independent secondary provider when ANY of the following occur:
1. Core architecture authority changes (`DEUS_Levels.js`, `DEUS_World.js`).
2. Save format or state serialization schema changes.
3. Procedural worldgen algorithms or noise pipelines change.
4. Physical resource-conservation rules change.
5. 2D/3D pathfinding traversal contracts change.
6. Performance-critical hot paths or spatial indices are modified.
7. A task spans three or more interconnected subsystems.
8. Implementation tests fail across two consecutive attempts.
9. Implementer confidence is reported as `LOW`.
10. Coordinator confidence is `LOW`.
11. Performance benchmark regresses materially (>10% latency/allocation increase).
12. Adversarial review flags an unmitigated architectural risk.

---

## 8. Definition-of-Done Checklist Compiler

Before substantive implementation commences, the coordinator compiles an explicit DoD checklist:

```text
WBS LEAF: <ID> - <TITLE>

[ ] IMPLEMENT:      Exact feature scope and API contracts.
[ ] TEST:           Automated unit and integration test suite.
[ ] BREAK:          Rule 4 mutants injected; edge-case attack suite passing.
[ ] PERFORMANCE:    Before/after latency and allocation benchmarks recorded.
[ ] SAVE/MIGRATION: State serialization verified; schema version bumped if needed.
[ ] NATIVE RMMZ:    Verified in engine Playtest (F5); zero F8 dev-console errors.
[ ] DOCUMENTATION:  docs/systems/ API updated; docs/STATUS.md synchronized.
[ ] OWNER GATE:     NONE | [Specific approval required]
```
*(Non-applicable categories must be explicitly marked `N/A`).*

---

## 9. Early Termination of Bad Agent Work

Maximum compute utilization requires terminating unviable tasks early:
- Gemini terminates and restarts workers upon evidence of:
  - File ownership boundary violations.
  - Scope creep outside WBS leaf boundaries.
  - Violations of the five-strata 25-stratum geometry authority.
  - Non-canonical save injections or global scans per frame.
  - Circular unproductive tool loops.
  - Model or configuration downgrades violating MAX_MULTIAGENT.

---

## 10. Canonical Quality Wording

> **"Substantive DEUS development follows an evidence-driven quality pipeline: SPEC → IMPLEMENT → BREAK → BENCHMARK → INTEGRATE. Major work receives an independent pre-implementation attack/test plan, one primary implementation owner, independent post-implementation review, measured performance evidence, and native proof where relevant. Workers report confidence, assumptions, known risks, and what would falsify their conclusions. Gemini is responsible for integration and routine technical gates; the owner is reserved for genuine design and visual decisions."**
