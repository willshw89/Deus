# DEUS — MAXIMUM AGENT UTILIZATION & MODEL STRENGTH POLICY

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
1. **Aggressive Model Selection (MAX_QUALITY Default):** Default to the strongest available models (`claude-opus-5-5[1m]`, `grok-4.7`, `gemini-3-pro`) for substantive engineering.
2. **Deep Reasoning & High Effort:** Do not downgrade reasoning effort or token budgets merely to preserve quota.
3. **Long Context Utilization:** Leverage large-context capabilities for repository-wide reasoning, cross-plugin dependencies, and structural audits.
4. **No Artificial Restraint:** Do not stop using a provider because "substantial usage has already been consumed." If safe, useful work remains, keep assigning it until the provider explicitly reports exhaustion.
5. **No Pointless Waste:** Every consumed token must yield tangible project value. Fictitious busywork, repetitive restatements, and circular unevidenced reviews are strictly prohibited.

---

## 2. Maximum Model Strength Routing Policy (MAX_QUALITY)

### Canonical Routing Principle
> **Substantive delegated work defaults to MAX_QUALITY: the strongest currently available provider model, highest practical reasoning/effort, and expanded context when beneficial. Model downgrades occur only for mechanical work, provider unavailability, exhaustion, or invocation failure, and must be reported rather than silently applied.**

The owner prefers **maximum capability, maximum reasoning quality, and maximum useful context** over quota conservation, speed optimization, or cheap-model routing.

### Current Discovered Maximums & Defaults (2026-09-25)

| Provider | Strongest Discovered Model | Effort / Reasoning Setting | Context Tier | Designated Substantive Role |
|---|---|---|---|---|
| **Claude / Fable** | `claude-opus-5-5[1m]` | `effort: xhigh` (or max supported) | Up to 1M tokens | Bounded core implementation, complex algorithmic systems, deep debugging. |
| **Grok** | `grok-4.7` | Highest supported reasoning | Standard long context | Independent adversarial review, test generation, seed sweeps, performance profiling. |
| **Codex** | *(Discovered upon reset)* | Highest appropriate reasoning | Standard | Mutation testing, invariant breaking, fuzz testing (currently EXHAUSTED). |
| **Gemini** | `gemini-3-pro` / `gemini-3-pro-image` | High reasoning / Thinking | Full repository context | Integration authority, gatekeeper, coordination, authentic Nano Banana Pro art. |

*Note: Model names are dynamic discoveries, not permanently hardcoded ceilings. When a stronger model or tier appears on an installed CLI/account, the orchestrator automatically upgrades subsequent MAX_QUALITY dispatches.*

### Mandatory MAX_QUALITY Subsystems
Autonomous MAX_QUALITY model routing is mandatory for:
- Procedural world generation and seed determinism
- Multi-Z strata foundation and 25-stratum column geometry
- Natural cuts, cave generation, and void structures
- WG.00.07 fluid simulation, pressure, and mass conservation
- Five-Z depth rendering and visibility occlusion
- 2D/3D pathfinding, vertical ramps, and traversability graphs
- Resource economy, workstation crafting grids, and item durability
- Save/load state serialization, schema versioning, and migrations
- Colonist/creature behavioral AI, goal selection, and urgency trees
- Performance-critical hot paths, spatial indices, and allocation budgets
- Core engine architecture and cross-plugin interfaces
- Test architecture, mutation test suites, and adversarial test plans
- Final integration review, defect analysis, and release gate verification

### Permissible Mechanical Downgrades
A weaker or faster model tier (e.g. flash, haiku, mini) is permitted **ONLY** for demonstrably mechanical tasks with no architectural judgment:
- Syntax reformatting or lint fixing
- Pure filename discovery and directory listing
- Simple pattern-matching regex grep
- Rote documentation table synchronization
- Trivial file transformations

*If there is any reasonable doubt whether a task requires architectural judgment, the orchestrator MUST route to the stronger model.*

### Prohibition Against Quota-Conservation Downgrades
The coordinator and subordinate agents are strictly forbidden from executing downgrades motivated by quota preservation:
- ❌ *"Opus usage is valuable, so I will use Sonnet."*
- ❌ *"Grok 4.7 is expensive, so I will use an older model."*
- ❌ *"I will save high reasoning for later."*

Downgrades are valid ONLY when:
1. The strongest model is reported unavailable by the provider.
2. The provider reports usage exhaustion or rate-limit saturation.
3. The task is demonstrably mechanical.
4. The stronger model invocation repeatedly fails with provider errors.

### Fallback Protocol & Transparent Reporting
When a downgrade is forced by provider failure or quota exhaustion:
1. Record the exact failure or rate-limit response.
2. Select the next strongest available model from that provider.
3. Explicitly report the downgrade in the task metadata. Silent downgrades are banned.

### Strong Model Implementer + Reviewer Pairing
High-risk systems must utilize strong models on **both** sides of the verification boundary:
- **Implementation:** Claude Opus 5.5 (`effort: xhigh`)
- **Adversarial Review:** Grok 4.7 (highest reasoning)
- **Integration Decision:** Gemini Pro (high reasoning coordinator)
- **Invariant Breaking:** Codex (when available)

Never implement with a top-tier model and review with a low-tier model merely to conserve quota.

### Subagent Delegation Policy
When a provider CLI natively supports subagents (e.g. Claude Code or Gemini):
- The strongest parent model may invoke internal subagents for repo exploration, test analysis, or parallel checks.
- Subagent usage must not overlap file edits.
- The parent model remains strictly accountable for the final code and commit.
- Parent models must never be downgraded simply because subagents are enabled.

### Task Metadata Tracking
Every dispatched assignment must record:
```text
QUALITY_PROFILE: MAX_QUALITY | MECHANICAL_FAST
REQUESTED_MODEL: <model_name>
ACTUAL_MODEL:    <model_name>
REASONING_EFFORT:<xhigh | high | medium | low>
CONTEXT_MODE:    <1M | standard>
PROVIDER_STATE:  <AVAILABLE | LIMITED | EXHAUSTED>
FALLBACK_REASON: <NONE | reason_for_downgrade>
```

---

## 3. Provider Access vs. Worker Availability Architecture

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

| Provider | System Role | Access | Current State | CLI Ready | Strongest Discovered Model | Routing Directive |
|---|---|:---:|:---:|:---:|---|---|
| **Claude / Fable** | Bounded Implementation & Core Engineering | `YES` | **`AVAILABLE`** | `YES` | `claude-opus-5-5[1m]` | Assign active implementation leaves; run at `effort: xhigh`. |
| **Grok** | Parallel Analysis, Adversarial Review, Profiling | `YES` | **`AVAILABLE`** | `YES` | `grok-4.7` | Saturate available capacity on independent audits, seed sweeps, benchmarks, and architectural reviews. |
| **Codex** | Mutation Testing & Invariant Breaking | `YES` | **`EXHAUSTED`** | `NO` (`NOT_FOUND`) | *(Deferred to quota reset)* | Retain queued backlog; do not hammer. Re-verify CLI on usage reset. |
| **Gemini** | Integration Authority & Nano Banana Pro Art | `YES` | **`AVAILABLE`** | `YES` | `gemini-3-pro` / `gemini-3-pro-image` | Coordinate gates, integrate commits, verify tests, produce authentic art. |

---

## 4. Worker Saturation & Multi-Model Allocation

At every orchestration cycle, the coordinator ensures **every available worker is actively occupied**:
- **Target Load:** Each available worker maintains **1 active productive task** + **1–3 prepared follow-up candidates**.
- **Multi-Model Attack on Critical Subsystems:** Deploy parallel workers for implementation, adversarial review, and independent test generation.

---

## 5. Path Ownership & Worktree Isolation Laws

Maximum utilization must never compromise repository integrity:
1. **Strict Path Ownership:** Never allow two agents to concurrently edit overlapping files.
2. **Active Implementation Owner Wins:** If Worker A is actively implementing in a file path, Worker B may only inspect read-only, analyze performance, or write isolated non-conflicting tools.
3. **Worktree Isolation:** Parallel implementation tasks must run in isolated git worktrees (`.worktrees/<agent>-<task>`) branching from committed HEAD. Workers commit to their designated feature branches; Gemini reviews and integrates into `main`.

---

## 6. Productive Idle-Capacity Backlog

When primary milestone implementation is claimed or blocked at a gate, available capacity must be immediately routed to the productive backlog:
1. **WorldGen Sweeps & Topology:** 100–1,000 seed sweeps, cut exposure analysis, connectivity audits.
2. **Performance & Memory Profiling:** Boot-time benchmarks, hot-path allocation audits (<0.02 ms frame budgets).
3. **Adversarial & Mutation Testing:** Rule 4 mutant construction, save/load fuzz testing.
4. **Economy & Simulation Verifications:** Closed-loop conservation simulations, balance checks.
5. **Asset & Atlas Tooling:** Manifest completeness checkers, coordinate alignment verification.
6. **Codebase Hygiene:** Dead code detection, duplicate routine analysis, documentation audit.

---

## 7. Execution Lifecycle: Continue-Until-Gate

The orchestrator operates in an automated continuous loop:
```text
WHILE productive safe work exists:
    1. Inspect WBS & active file ownership
    2. Check provider availability states
    3. Dispatch all AVAILABLE workers with bounded, non-overlapping tasks (MAX_QUALITY)
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

## 8. Reporting Cadence

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
- <Agent>: <Task ID> — <Target File Paths> [QUALITY_PROFILE: MAX_QUALITY | Model: <model>]

QUEUED NEXT:
- <Agent>: <Task ID> — <Prepared Scope>

OWNER GATE:
- NONE | [Specific Decision / Approval Requested]
```
