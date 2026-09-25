# DEUS — AGENT QUALITY, CORRECTION & CONTINUOUS-LEARNING LOOP v1
**Authoritative Operational Architecture & Closed-Loop Quality Standard**
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)
**Approved by Owner Directive:** 2026-09-25

---

## 1. Canonical Principle

> **"DEUS treats every substantive AI task as both project work and evidence about the engineering process. Task assignment, implementation, review, corrections, integration, and final outcomes are recorded in structured form. Valid defects, false positives, correction cycles, escaped bugs, performance results, provider usage, and owner interruptions feed an evidence-based learning loop that improves future routing, prompts, tests, and review strategy. The system does not optimize for token consumption or arbitrary model scores; it optimizes for verified accepted project progress and avoids repeatedly making the same class of mistake."**

### Related Operational Standards
- **Agent Communication Protocol:** [`docs/AGENT_COMMUNICATION_PROTOCOL.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_COMMUNICATION_PROTOCOL.md) (Structured task mailbox & evidence bus)
- **Agent Utilization Policy:** [`docs/AGENT_UTILIZATION_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_UTILIZATION_POLICY.md) (MAX_MULTIAGENT orchestration)
- **Quality Engineering Standard:** [`docs/QUALITY_ENGINEERING_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/QUALITY_ENGINEERING_POLICY.md) (5-phase quality lifecycle)
- **Performance Architecture:** [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md) (Demand-driven performance standard)

---

## 2. Canonical Task State Machine

Every task across all providers follows a strict, auditable lifecycle:

```text
               ┌───────────────┐
               │    BACKLOG    │
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │     READY     │
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │  PRE_ATTACK   │  (Tier 1 & select Tier 2)
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │    CLAIMED    │
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │ IMPLEMENTING  │
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │   SELF_TEST   │
               └───────┬───────┘
                       │
                       ▼
         ┌───────────────────────────┐
         │    INDEPENDENT_REVIEW     │◄───────────────────┐
         └─────────────┬─────────────┘                    │
                       │                                  │
          [Defects?]───┴──────────┐                       │
             │ No                 │ Yes                   │
             │                    ▼                       │
             │         ┌─────────────────────┐            │
             │         │    FIX_REQUIRED     │            │
             │         └──────────┬──────────┘            │
             │                    │                       │
             │                    ▼                       │
             │         ┌─────────────────────┐            │
             │         │     REMEDIATION     │────────────┘
             │         └─────────────────────┘ (Escalate at 2nd failure)
             ▼
     ┌───────────────┐
     │   BENCHMARK   │ (Performance regression gate)
     └───────┬───────┘
             │
             ▼
     ┌───────────────┐
     │ NATIVE_PROOF  │ (NW.js / RMMZ visual evidence)
     └───────┬───────┘
             │
             ▼
     ┌───────────────┐
     │  INTEGRATION  │ (Coordinator merge to canonical main)
     └───────┬───────┘
             │
             ▼
     ┌───────────────┐
     │  OWNER_GATE   │ (Owner directive / visual approval)
     └───────┬───────┘
             │
             ▼
     ┌───────────────┐
     │     DONE      │
     └───────┬───────┘
             │
             ▼
     ┌───────────────────┐
     │ OUTCOME_RECORDED  │ (Telemetry logged to durable storage)
     └───────┬───────────┘
             │
             ▼
     ┌───────────────────┐
     │  LEARNING_UPDATE  │ (Routing, templates & invariants updated)
     └───────────────────┘

Side States:
- BLOCKED: Missing upstream dependency or prerequisite.
- CRASHED: Worker process terminated unexpectedly or timed out.
- PROVIDER_EXHAUSTED: Upstream model credit/rate limit reached.
- ABANDONED: Task formally cancelled or superseded by Owner/Coordinator.
```

---

## 3. Task Tiers

The mandatory stages for each task are determined by its tier:

| Tier | Classification | Definition | Mandatory Stages |
|---|---|---|---|
| **TIER 1** | **CRITICAL** | Core engine plugins, strata geometry, worldgen determinism, five-Z rendering, save/load schema, fluid simulation. | Full Pipeline: Pre-Attack + Implementation + Self-Test + Blind Independent Review + Mutation Detection + Performance Benchmark + Native NW.js Proof + Coordinator Integration. |
| **TIER 2** | **SUBSTANTIVE** | Secondary gameplay systems, AI decision trees, workstation crafting, inventory, container logic. | Implementation + Self-Test + Independent Review + Regression Run + Native Smoke Proof + Coordinator Integration. |
| **TIER 3** | **ROUTINE** | Minor data additions, localized bug fixes, secondary test coverage, non-breaking schema updates. | Single Strong Worker + Self-Test + Gemini Coordinator Review + Automated Tests. |
| **TIER 4** | **MECHANICAL** | Lint fixing, formatting, documentation synchronization, directory relocation, mechanical renaming. | Single Agent / Tool execution + Quick Automated Verification. |

---

## 4. Task Classification & Dimensional Metadata

Every dispatched task is assigned a primary task class and evaluated across six operational dimensions:

### Primary Task Classes:
- `ARCHITECTURE`: System contract definition, interface design, data schema creation.
- `IMPLEMENTATION`: Feature coding in `game/js/plugins/` or core modules.
- `DEBUGGING`: Root-cause analysis and defect correction.
- `TESTING`: Automated harness creation, regression coverage, Rule 4 mutation suites.
- `ADVERSARIAL_REVIEW`: Independent red-team attack, invariant verification, edge-case probing.
- `PROFILING`: Runtime benchmarking, memory profiling, frame-time latency analysis.
- `MIGRATION`: Structural repository consolidation, path updates, code refactoring.
- `DOCUMENTATION`: Policy specification, architecture manuals, audit logs, status reports.
- `ART_GENERATION`: Prompt compilation and Nano Banana Pro source generation.
- `ART_QC`: Palette verification, scale consistency, sprite grid alignment, originality check.
- `DATA_GENERATION`: Catalog generation (`UF_WorldCatalog.json`), biome configuration, tileset slots.

### Dimensional Risk Flags (Recorded before dispatch):
- `risk`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
- `complexity`: `LOW` | `MEDIUM` | `HIGH` | `EXTREME`
- `performanceSensitivity`: `true` | `false` (Requires before/after benchmark)
- `saveSensitivity`: `true` | `false` (Requires backward compatibility and checksum verification)
- `determinismSensitivity`: `true` | `false` (Requires bit-identical seed reproduction)
- `nativeProofRequired`: `true` | `false` (Requires live NW.js playtest screenshot)

---

## 5. Definition-of-Done (DoD) Compilation

Before substantive implementation begins, the Coordinator compiles a frozen Definition of Done:

```json
{
  "taskId": "DEUS-TSK-19B",
  "dod": {
    "IMPLEMENT": "REQUIRED",
    "TEST": "REQUIRED",
    "BREAK": "REQUIRED",
    "PERFORMANCE": "REQUIRED",
    "SAVE_MIGRATION": "REQUIRED",
    "NATIVE": "REQUIRED",
    "DOCUMENTATION": "REQUIRED",
    "OWNER": "N/A"
  }
}
```
*Rule: The implementer cannot redefine success after coding begins.*

---

## 6. Pre-Implementation Attack Plan

For Tier 1 and select Tier 2 tasks, an independent model (e.g. Grok or Gemini) produces an Attack Plan prior to code completion:
- **Inputs**: Canonical task contract, frozen invariants, existing codebase, test suites.
- **Deliverables**:
  1. Identified boundary conditions and edge cases.
  2. Concrete candidate Rule 4 mutants (syntax modifications that break logic).
  3. Performance and allocation risks in proposed hot paths.
  4. Seed determinism and PRNG isolation risks.
  5. Save/load serialization compatibility traps.
  6. Blind spots in planned test suites.

---

## 7. Implementation Standards & Metadata

The primary implementer operates under strict tracking:
- **Single-Writer Rule**: Exactly one primary writer holds write ownership over designated files in an isolated worktree.
- **Metadata Logged**:
  ```text
  PROVIDER:                Anthropic / Claude
  PARENT_MODEL_REQUESTED:  claude-opus-5-5
  PARENT_MODEL_ACTUAL:     claude-opus-5-5[1m]
  REASONING_EFFORT:        xhigh
  CONTEXT_MODE:            1M
  SUBAGENT_COUNT:          3
  SUBAGENT_ROLES:          [Architect, TestBreaker, SystemsReviewer]
  BASE_COMMIT:             19fcf0e
  WORKTREE_PATH:           scratchpad/wt19b
  OWNED_PATHS:             [game/js/plugins/DEUS_Levels.js, tools/test_strata_cuts_and_caves.js]
  ```

---

## 8. Implementer Return Contract

Implementers return structured technical reports containing:
1. `STATUS`: `COMPLETE` | `PARTIALLY_COMPLETE` | `BLOCKED`
2. `CONFIDENCE`: `HIGH` | `MEDIUM` | `LOW` (with technical justification)
3. `EVIDENCE`: Real test command outputs, timings, and pass counts (never claimed without observation).
4. `UNVERIFIED_ASSUMPTIONS`: What was assumed but not proven.
5. `KNOWN_RISKS`: Potential failure modes or edge cases.
6. `WHAT_WOULD_PROVE_THIS_WRONG`: Explicit test condition that would invalidate the implementation.
7. `ARTIFACTS`: Commit hash, git diff summary, test logs, screenshots.

---

## 9. Blind Independent Review Architecture

For substantive and critical tasks, independent review is conducted without persuasion bias:
- **Blind Review Packet**: The reviewer receives:
  - Canonical task contract and frozen invariants.
  - Raw git diff / commit.
  - New and existing test files.
- **Narrative Exclusion**: The implementer's self-congratulatory narrative and claims are omitted from the initial review prompt. The reviewer inspects raw code and tests first.
- **Reconciliation**: Gemini reconciles the implementer's claims against the reviewer's independent findings.

---

## 10. Defect Records & Classification

Every finding discovered during review, testing, or post-integration is assigned a durable record:

```json
{
  "defectId": "DEF-19B-001",
  "taskId": "DEUS-TSK-19B",
  "severity": "MAJOR",
  "category": "IMPLEMENTATION",
  "finder": "grok-4.7",
  "affectedInvariant": "continuousAirHeight stops on fluid as well as solid",
  "evidence": "continuousAirHeight(64,30) returned 4 through water instead of 0",
  "status": "CLOSED",
  "fixCommit": "116a3de",
  "closureReviewer": "grok-4.7"
}
```

### Defect Categories:
- `SPEC_GAP`: Specification was ambiguous or omitted a required constraint.
- `IMPLEMENTATION`: Logic error, boundary mistake, or unhandled case in code.
- `TEST_GAP`: Automated tests failed to assert an invariant or catch a mutant.
- `PERFORMANCE`: Frame budget violation, allocation in hot path, or memory leak.
- `DETERMINISM`: Seed variation, PRNG desynchronization, or unseeded random call.
- `SAVE_COMPATIBILITY`: Save corruption, schema mismatch, or unversioned state.
- `OWNERSHIP`: Editing files outside assigned scope or worktree collision.
- `REVIEW_MISS`: Defect present in reviewable code that independent review failed to flag.
- `ORCHESTRATION`: Dispatch mistake, tool failure, or incorrect task sequencing.
- `ART_QC`: Palette mismatch, scale error, binary alpha violation, or grid misalignment.

### Defect Statuses:
- `OPEN` → `FIXING` → `REVIEW` → `CLOSED` | `ACCEPTED_RISK`

---

## 11. Review Finding Quality

After defect resolution, the Coordinator grades reviewer findings to track real accuracy:
- **`VALID`**: Material defect or real invariant violation requiring remediation.
- **`PARTIALLY_VALID`**: Real concern but lower severity or partially mitigated by existing architecture.
- **`FALSE_POSITIVE`**: Reviewer misunderstood requirement, misread code, or flagged non-existent bug.
- **`DUPLICATE`**: Finding already reported in another active defect record.

*Quality Rule: Reviewers are rewarded for finding valid, high-impact defects—not for padding review length with false positives.*

---

## 12. Bounded Correction Loop

When defects are found (`FIX_REQUIRED`):
1. **Targeted Packet**: The implementer receives only:
   - Specific defect ID and classification.
   - Exact code location and invariant violated.
   - Minimal reproduction test / failing mutant.
   - Explicit closure criterion.
2. **Targeted Remediation**: Implementer modifies only the affected logic.
3. **Targeted Verification**: Rerun failing check + affected regression suite.
4. **Closure Verification**: Original finding reviewer explicitly audits fix commit (`CLOSED` vs `OPEN`).

---

## 13. Repeated-Failure Escalation Protocol

To avoid endless patch loops:
- **First Failure**: Bounded remediation by original implementer.
- **Second Failure (Same Issue)**: Mandatory independent architecture review from a different model provider (e.g. Claude fails twice $\rightarrow$ Grok or Gemini conducts deep architectural review).
- **Third Failure**: **STOP PATCH LOOP**. Halt execution. Re-evaluate underlying architectural assumptions with the Owner. Do not endlessly patch an incorrect abstraction.

---

## 14. Defect Escape Tracking

An **Escaped Defect** is any bug discovered *after* a task has been integrated into canonical `main`:
- **Tracking Log**:
  - Where discovered (test run, later task, playtest).
  - Production impact.
  - Which quality control gate should have caught it.
  - Root cause of escape.
  - Specific process change introduced to prevent future escapes.
- *Escaped defects are treated as highest-value learning events, not occasions for blame.*

---

## 15. Incident Review (Postmortem) Standard

Reserved for serious project failures (save corruption, determinism break, filesystem truncation, merge collision, $>20\%$ performance regression):
1. **What Happened**: Clear chronological summary.
2. **Root Cause**: Underlying technical reason.
3. **Why Controls Missed It**: Why self-test, mutation tests, and review did not detect it.
4. **Recovery**: Exact git restore, fix commit, or migration executed.
5. **Prevention Changes**: 1–3 concrete, enforceable policy or tooling updates.

---

## 16. Durable Telemetry Architecture

All telemetry is recorded in structured, machine-readable formats under `docs/telemetry/`:
- `docs/telemetry/tasks.jsonl`: Outcome per completed task.
- `docs/telemetry/defects.jsonl`: Comprehensive defect log.
- `docs/telemetry/escapes.jsonl`: Escaped defect register.
- `docs/telemetry/reviews.jsonl`: Reviewer finding accuracy records.
- `docs/telemetry/interruptions.jsonl`: Owner interruption log.

### Task Outcome Telemetry Schema (`tasks.jsonl`):
```json
{
  "taskId": "DEUS-TSK-19B",
  "wbsId": "WG.00.08",
  "taskClass": "IMPLEMENTATION",
  "tier": 1,
  "risk": "HIGH",
  "provider": "Anthropic",
  "parentModel": "claude-opus-5-5",
  "effort": "xhigh",
  "subagents": 3,
  "durationSeconds": 14200,
  "firstPassAccepted": false,
  "defectCounts": { "BLOCKER": 0, "MAJOR": 2, "MINOR": 0 },
  "correctionCycles": 1,
  "testsAdded": 2,
  "mutantsAdded": 5,
  "performanceDeltaMs": -0.4,
  "escapedDefects": 0,
  "ownerInterruptions": 0,
  "result": "ACCEPTED",
  "resultCommit": "116a3de"
}
```

---

## 17. Reviewer & Implementer Evidence Profiles

Evidence profiles track proven track records across specific task classes:

### Provider Profile States:
- `STRONG_EVIDENCE`: Consistently delivers valid first-pass work or high-value defect detection with low false positives ($\ge 5$ comparable tasks).
- `MODERATE_EVIDENCE`: Demonstrates competence but has occasional correction cycles or minor gaps (2–4 tasks).
- `INSUFFICIENT_DATA`: Fewer than 2 tasks completed in this class.
- `MIXED_RESULTS`: High correction cycles, recurring false positives, or escaped defects.

*Principle: No arbitrary scalar "scores" (e.g. 84/100). Profiles represent technical track records per task class.*

---

## 18. Coordinator & Owner Interruption Telemetry

Gemini's coordination performance is tracked against objective standards:
- **Coordinator Metrics**: Routing accuracy, zero ownership collisions, timely dispatch, zero skipped regression gates.
- **Owner Interruption Classification**:
  - `DESIGN_REQUIRED`: Genuine gameplay/art design choice (Appropriate).
  - `VISUAL_APPROVAL`: Art asset sign-off gate (Appropriate).
  - `SAFETY_GATE`: Major destructive or structural repository action (Appropriate).
  - `TECHNICAL_AMBIGUITY`: Insufficiently specified engineering choice (Target: Reduce).
  - `UNNECESSARY_ESCALATION`: Asking owner routine technical questions (Target: Eliminate).
  - `MESSENGER_FAILURE`: Subagent communication crash (Target: Eliminate).

---

## 19. Prompt & Template Versioning

Task prompt templates are versioned and evaluated by outcome:
- Example: `WORLDGEN_IMPLEMENTATION_V3`, `ADVERSARIAL_REVIEW_V2`.
- When a prompt revision demonstrates fewer correction cycles and zero escaped defects across $\ge 5$ tasks, it is promoted to the canonical template.

---

## 20. Routing Engine Logic

Task dispatch evaluates a multidimensional matrix:
```text
Dispatch Decision = f(
  Task Class,
  Task Risk & Complexity,
  Historical Provider Suitability,
  First-Pass History,
  Provider Availability & Quota,
  Time to Quota Reset,
  Ownership Isolation Requirements
)
```
*Gemini must be able to justify every routing choice in plain language.*

---

## 21. Continuous Learning Cadence

- **After Every Substantive Task**: Log structured telemetry to `docs/telemetry/`. Record defects and outcomes.
- **After ~10 Comparable Tasks**: Review trendlines in first-pass acceptance, false positive rates, and correction cycles. Propose bounded routing or template refinements.
- **At Major WBS Milestones**: Comprehensive Agent Operating Model audit and governance review.

---

## 22. Image Generation & Visual QC Learning Loop

When non-living or authorized asset generation occurs:
- Track: Asset family, provider model, prompt adherence, scale consistency, palette fidelity, animation frame alignment, owner approval rate.
- Identify families with high rejection rates and refine spatial slot maps and style references before proceeding.

---

## 23. Owner-Facing Plain Language Reporting

Reports to the owner follow a 5-point translation structure:
1. **WHAT HAPPENED**: Plain summary of the event.
2. **WHAT THE TERM MEANS**: Simple definition of any technical concept.
3. **WHY IT MATTERS**: Impact on gameplay, stability, or development speed.
4. **WHAT THE AGENTS WILL DO**: Next autonomous action planned.
5. **WHAT OWNER MUST DECIDE**: Clear choice if an Owner Gate is reached (otherwise state "No owner action required").

---

## 24. Implementation Plan During Consolidation Window

During the approved post-19B consolidation window, the learning framework is brought online:
1. Create `docs/telemetry/` directory structure with schema validators.
2. Build `tools/learning/log_task_outcome.js` and `tools/learning/audit_reviewer_findings.js`.
3. Build `tools/learning/deus_ai_dashboard.js` producing compact CLI operational summaries.
4. Populate initial telemetry records from completed tasks (WG.00.01 through WG.00.08).
5. Freeze initial Provider Evidence Profiles.

---

## 25. Final Canonical Principle

> **"The system continuously answers: What kinds of tasks are we doing? Which provider/configuration performs well on those tasks? Which reviewers catch real defects? What mistakes are recurring? Which tests/invariants should be added? Which prompts create less rework? Is multiagent helping or wasting effort? Are we interrupting the owner unnecessarily? Are bugs escaping our pipeline? What small evidence-backed change should improve the next comparable task? The goal is not perfect agents. The goal is an engineering organization that becomes less likely to repeat the same failures over time."**
