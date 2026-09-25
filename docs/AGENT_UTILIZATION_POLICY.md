# DEUS — MAXIMUM AGENT UTILIZATION POLICY & OPERATING STANDARD

**Effective Date:** 2026-09-25  
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)  
**Status:** CANONICAL & BINDING (Approved by Owner Directive)  

---

## 1. Owner Intent & Core Principle

The project owner explicitly directs **MAXIMUM PRODUCTIVE USE** of all available AI subscription and included-usage capacity.

> **Core Operating Principle:**  
> **MAXIMUM PRODUCTIVE COMPUTE NOW over saving subscription usage for later.**  
> Convert expiring AI usage into useful DEUS progress, rigorous testing, validation, performance profiling, adversarial review, and future task preparation. Consume available included agent capacity until the provider reports that its usage is exhausted, rate-limited, or otherwise unavailable.

### Binding Rules of Consumption
1. **Aggressive Model Selection:** Default to the strongest available models (`claude-opus-5-5[1m]`, `grok-4.7`, `gemini-3-pro`) for substantive engineering.
2. **Deep Reasoning & High Effort:** Do not downgrade reasoning effort or token budgets merely to preserve quota.
3. **Long Context Utilization:** Leverage large-context capabilities for repository-wide reasoning, cross-plugin dependencies, and structural audits.
4. **No Artificial Restraint:** Do not stop using a provider because "substantial usage has already been consumed." If safe, useful work remains, keep assigning it until the provider explicitly reports exhaustion.
5. **No Pointless Waste:** Every consumed token must yield tangible project value. Fictitious busywork, repetitive restatements, and circular unevidenced reviews are strictly prohibited.

---

## 2. Provider Access vs. Worker Availability Architecture

The orchestrator and integration authority track each subordinate model provider across two orthogonal dimensions:
1. **Provider Access:** Whether the owner holds valid subscription/account access.
2. **Current Worker Availability:** Real-time state of quota, CLI discoverability, and invocation capability.

### Recognized Provider States
- `AVAILABLE`: Active quota, CLI discovered and authenticated, ready for immediate assignment.
- `LIMITED`: Operational but restricted (e.g. rate-limit backoff, temporary cool-down).
- `EXHAUSTED`: Owner has access, but current period quota is exhausted. Do not repeatedly hammer; retain queued work and probe periodically for reset.
- `OFFLINE`: Network or provider service outage.
- `NOT_CONFIGURED`: Access exists but environment/CLI requires local configuration.
- `UNKNOWN`: Unprobed state.

### Current Provider Status (as of 2026-09-25)

| Provider | System Role | Access | Current State | CLI Ready | Strongest Visible Model | Routing Directive |
|---|---|:---:|:---:|:---:|---|---|
| **Claude / Fable** | Bounded Implementation & Deep Debugging | `YES` | **`AVAILABLE`** | `YES` | `claude-opus-5-5[1m]` | Assign active implementation leaves and deep architectural code. |
| **Grok** | Parallel Analysis, Adversarial Review, Profiling | `YES` | **`AVAILABLE`** | `YES` | `grok-4.7` | Saturate with independent audits, seed sweeps, benchmarks, and review. |
| **Codex** | Mutation Testing & Invariant Breaking | `YES` | **`EXHAUSTED`** | `NO` (`NOT_FOUND`) | *(Deferred to quota reset)* | Retain queued backlog; do not hammer. Re-verify CLI on usage reset. |
| **Gemini** | Integration Authority & Nano Banana Pro Art | `YES` | **`AVAILABLE`** | `YES` | `gemini-3-pro-image` / `gemini-3-pro` | Coordinate gates, integrate commits, verify tests, produce authentic art. |

---

## 3. Worker Saturation & Multi-Model Allocation

At every orchestration cycle, the coordinator ensures **every available worker is actively occupied**:
- **Target Load:** Each available worker maintains **1 active productive task** + **1–3 prepared follow-up candidates**.
- **Multi-Model Attack on Critical Subsystems:** For high-risk systems (worldgen, five-strata geometry, fluid dynamics, depth renderer, save formats, economy, pathfinding, AI simulation), multiple providers are intentionally deployed in parallel:
  - **Worker A (e.g., Fable):** Implements bounded code.
  - **Worker B (e.g., Grok):** Conducts independent adversarial architecture review, performance profiling, and boundary checks.
  - **Worker C (e.g., Codex, when available):** Generates invariant-breaking tests and mutation attacks.
  - **Gemini:** Acts as integration and verification authority.

---

## 4. Path Ownership & Worktree Isolation Laws

Maximum utilization must never compromise repository integrity:
1. **Strict Path Ownership:** Never allow two agents to concurrently edit overlapping files.
2. **Active Implementation Owner Wins:** If Worker A is actively implementing in a file path, Worker B may only inspect read-only, analyze performance, or write isolated non-conflicting tools.
3. **Worktree Isolation:** Parallel implementation tasks must run in isolated git worktrees (`.worktrees/<agent>-<task>`) branching from committed HEAD. Workers commit to their designated feature branches; Gemini reviews and integrates into `main`.

---

## 5. Productive Idle-Capacity Backlog

When primary milestone implementation is claimed or blocked at a gate, available capacity must be immediately routed to the productive backlog:

1. **WorldGen Sweeps & Topology:**
   - 100 to 1,000 deterministic seed sweeps analyzing terrain continuity, cave distributions, and cliff formations.
   - Deep-cut exposure rarity proofs and statistical frequency validation.
   - Reachability and pathfinding connectivity audits across multi-Z strata.
2. **Performance & Memory Profiling:**
   - Boot-time, New Game generation, and map load benchmarks.
   - Hot-path allocation audits (enforcing zero-allocation runtime queries).
   - Quiescent frame budgets (<0.02 ms) and tick throttling tests.
3. **Adversarial & Mutation Testing:**
   - Rule 4 mutant construction and test-harness verification.
   - Fuzz testing save/load state serialization against corrupted or missing keys.
   - Multi-Z physical boundary and floating-mass invariant validation.
4. **Economy & Simulation Verifications:**
   - Closed-loop material conservation simulations across thousands of ticks.
   - Biome resource distribution balancing and founder survival margins.
5. **Asset & Atlas Tooling:**
   - Automated asset manifest completeness validators.
   - Packed sheet coordinate and rigid 48px grid alignment verification.
6. **Codebase Hygiene:**
   - Static analysis for dead code, duplicate routines, and documentation drift.

---

## 6. Execution Lifecycle: Continue-Until-Gate

The orchestrator operates in an automated continuous loop:
```text
WHILE productive safe work exists:
    1. Inspect WBS & active file ownership
    2. Check provider availability states
    3. Dispatch all AVAILABLE workers with bounded, non-overlapping tasks
    4. Collect results & execution evidence
    5. Independently verify tests (including Rule 4 mutants)
    6. Integrate approved commits into main
    7. Update WBS & STATUS registries
    8. Refill worker queues immediately

STOP ONLY IF:
    - Genuine Owner Gate reached (visual approval, major architectural change)
    - All usable providers become EXHAUSTED or OFFLINE
    - Repository integrity conflict occurs
```

### Owner Gate vs. Autonomous Execution Boundaries
- **Owner Interruption Required For:** Major design choices, visual art approvals (Rule 6), alterations to frozen architecture, scope expansion, and irreversible breaking changes.
- **Autonomous Handling (No Interruption):** Routine implementation details, provider reassignment on exhaustion, retry logic, ordinary test fixes, worktree management, and background profiling.

---

## 7. Reporting Cadence

At the conclusion of each orchestration cycle, the coordinator reports concisely:
```text
PROVIDER STATES:
- Claude/Fable: [AVAILABLE | LIMITED | EXHAUSTED]
- Grok:         [AVAILABLE | LIMITED | EXHAUSTED]
- Codex:        [EXHAUSTED | OFFLINE | AVAILABLE]
- Gemini:       [AVAILABLE]

WORK COMPLETED:
- <Agent>: <Task ID> — <Summary> (<Commit Hash / Evidence>)

ACTIVE ASSIGNMENTS:
- <Agent>: <Task ID> — <Target File Paths>

QUEUED NEXT:
- <Agent>: <Task ID> — <Prepared Scope>

OWNER GATE:
- NONE | [Specific Decision / Approval Requested]
```
