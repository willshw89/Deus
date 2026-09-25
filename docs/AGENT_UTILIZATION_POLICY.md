# DEUS — MAXIMUM AGENT UTILIZATION & MULTIAGENT ORCHESTRATION POLICY

**Effective Date:** 2026-09-25  
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)  
**Status:** CANONICAL & BINDING (Approved by Owner Directives)  

---

## 1. Owner Intent & Core Principle

The project owner explicitly directs **MAXIMUM PRODUCTIVE USE** of all available AI subscription and included-usage capacity across all configured model providers.

> **Core Operating Principle:**  
> **MAXIMUM PRODUCTIVE COMPUTE NOW over saving subscription usage for later.**  
> Convert expiring AI usage into useful DEUS progress, rigorous testing, validation, performance profiling, adversarial review, and future task preparation. Consume available included agent capacity until the provider reports that its usage is exhausted, rate-limited, or otherwise unavailable.

### Binding Rules of Consumption
1. **Default to MAX_MULTIAGENT:** Substantive delegated engineering defaults to the strongest available models, highest reasoning, expanded context, and provider-native multi-agent/subagent teams.
2. **Deep Reasoning & High Effort:** Do not downgrade reasoning effort or token budgets merely to preserve quota.
3. **Long Context Utilization:** Leverage large-context capabilities for repository-wide reasoning, cross-plugin dependencies, and structural audits.
4. **No Artificial Restraint:** Do not stop using a provider because "substantial usage has already been consumed." If safe, useful work remains, keep assigning it until the provider explicitly reports exhaustion.
5. **No Pointless Waste:** Every consumed token must yield tangible project value. Fictitious busywork, repetitive restatements, and circular unevidenced reviews are strictly prohibited.

---

## 2. Canonical Quality Profile: MAX_MULTIAGENT

### Canonical Routing Principle
> **"Substantive DEUS work defaults to MAX_MULTIAGENT: the strongest currently available model, highest practical reasoning/effort, expanded context when beneficial, and provider-native multi-agent/subagent execution whenever supported. Important work should also receive independent cross-provider review when useful. Silent downgrade to weaker models or single-agent execution is prohibited except for provider limitations, exhaustion, invocation failure, or genuinely mechanical work."**

The owner prefers **maximum capability, maximum reasoning quality, maximum useful context, and multi-agent independent perspectives** over quota conservation, speed optimization, cheap-model routing, or single-agent isolation.

### Definition of MAX_MULTIAGENT
- **Strongest Available Model:** Top-tier discovered models per provider (`claude-opus-5-5[1m]`, `grok-4.7`, `gemini-3-pro`).
- **Highest Practical Reasoning / Effort:** `effort: xhigh` in Claude, highest reasoning in Grok, deep Thinking mode in Gemini.
- **Expanded Context:** Utilize 1M / large context windows whenever tasks benefit from broad repository architecture.
- **Provider-Native Multi-Agent Execution:** Spawn internal subagents, agent teams, or parallel reasoning sessions when natively supported by the provider CLI.
- **Independent Internal Review:** Internal subagents explicitly challenge, break, profile, and verify solutions before returning to the coordinator.
- **No Silent Downgrade:** Any fallback to single-agent mode or lower model tiers requires explicit recording of provider limitation or quota exhaustion.

### Mandatory MAX_MULTIAGENT Subsystems
Autonomous MAX_MULTIAGENT routing is mandatory for:
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

### Internal Independence: Multi-Agent Role Decomposition
For critical tasks, multi-agent decomposition must avoid echo-chamber consensus by assigning distinct adversarial roles:
- **Agent A (Architecture / Correctness):** Analyzes architectural compliance, contract invariants, and integration fit.
- **Agent B (Adversarial / Test Breaker):** Actively attempts to break the design, finds edge-case failures, and constructs Rule 4 mutants.
- **Agent C (Performance / Profiling):** Analyzes algorithmic complexity, hot-path allocations, and frame-budget risks.
- **Agent D (Simplification / Lean Design):** Identifies unnecessary complexity, duplicate abstractions, and refactoring opportunities.
- **Primary Agent (Integrator / Writer):** Synthesizes findings, reconciles evidence, executes verified edits, and commits.

### Strict File Writing Ownership
**Multi-agent execution does NOT permit multiple writers to concurrently edit the same files.**
- Within any task, **exactly one primary agent** holds write ownership of designated files.
- Subagents inspect, reason, test, profile, and propose patches read-only.
- Parallel writing tasks must operate in isolated git worktrees.

### Dual-Layer Multi-Agent Architecture
The coordinator utilizes both:
1. **Intra-Provider Multi-Agent:** Claude-native subagents, Grok-native subagents/parallel sessions, Gemini subagents.
2. **Inter-Provider Multi-Agent:** Independent cross-provider pairing (e.g. Claude Opus implements ↔ Grok 4.7 conducts adversarial review ↔ Gemini Pro performs integration review).

### Permissible Mechanical Downgrades
A single-agent or faster model tier (e.g. flash, haiku) is permitted **ONLY** for genuinely mechanical tasks with no architectural judgment:
- Syntax reformatting or lint fixing
- Pure filename discovery and directory listing
- Simple pattern-matching regex grep
- Rote documentation table synchronization
- Trivial file transformations

*If there is any reasonable doubt whether a task requires architectural judgment, the orchestrator MUST route to MAX_MULTIAGENT.*

### Task Metadata & Operational Evidence Rule
A task is **NOT** considered fully MAX_MULTIAGENT-compliant merely because its selected model supports multi-agent/subagent operation. The orchestrator must record actual operational evidence of multi-agent execution.

Every substantive dispatched task must record:
```text
QUALITY_PROFILE:        MAX_MULTIAGENT | MECHANICAL_FAST
PARENT_MODEL_REQUESTED: <model_name>
PARENT_MODEL_ACTUAL:    <model_name>
REASONING_EFFORT:       <xhigh | high | medium | low>
CONTEXT_MODE:           <1M | standard>
MULTIAGENT_SUPPORTED:   YES | NO
MULTIAGENT_REQUESTED:   YES
MULTIAGENT_ACTUAL:      YES | NO
SUBAGENT_COUNT:         <count>
SUBAGENT_ROLES:         [<role1>, <role2>, ...]
PARALLEL_AGENT_COUNT:   <count> (if applicable)
PROVIDER_STATE:         <AVAILABLE | LIMITED | EXHAUSTED>
FALLBACK_REASON:        <NONE | reason if actual multi-agent execution did not occur>
```

#### Historical vs. Future Task Classification
- **Active Tasks (FABLE-19B, GROK-TASK-D):** Running prior to this directive; recorded as:
  `MAX_QUALITY = YES`, `MULTIAGENT_ACTUAL = UNKNOWN / NO EVIDENCE` (unless runtime logs substantiate subagent calls).
- **Subsequent Dispatches:** Must actively deploy and evidence multi-agent execution whenever supported by the provider CLI.

---

## 3. Absolute WBS-Catalogue Image Generation Rule

### Canonical Image Generation Principle
> **"All DEUS image generation is subordinate to the canonical WBS and semantic asset catalogue. Every generated image must originate from an authorized WBS requirement and catalogue entry, with its production role, dimensions, variants, animation requirements, and—when runtime-bound—permanent atlas destination defined before generation. Available image-generation providers are used in parallel to complete different READY catalogue entries; they do not independently invent production assets or bypass catalogue, QC, deterministic packing, in-engine proof, or owner approval."**

### The Required Lineage Chain
Every generated production image must strictly trace through the unbroken chain:
```text
WBS LEAF
  ↓
ASSET REQUIREMENT
  ↓
CANONICAL CATALOGUE ENTRY
  ↓
SEMANTIC ASSET ID
  ↓
PERMANENT ATLAS SLOT / DESTINATION
  ↓
READY STATUS
  ↓
PROVIDER ASSIGNMENT
  ↓
GENERATION JOB
```
*If an asset does not have an approved catalogue entry and predetermined atlas destination, IT MUST NOT BE GENERATED.*

### Prohibition Against Ad-Hoc Production Art
- ❌ *"Grok has spare quota, make some rocks."*
- ❌ *"Nano Banana has capacity, generate more trees."*
- ❌ *"Astra should make random cave props."*
- ❌ Generating an interesting asset and finding a use for it afterward.
- ❌ Generating whole tilesets before the catalogue defines their contents.

Image capacity is consumed strictly by advancing **READY catalogue entries**. If no catalogue entries are marked READY, image workers must wait or assist with non-generation catalogue/QC tasks.

### Distributed Multi-Provider Image Generation
Parallel image providers (Google Nano Banana Pro, Grok, Astra when configured) are heavily utilized by distributing **different READY catalogue families**:
- **Coherent Family Ownership:** One provider produces the entire assigned family/batch (including all animation frames). Never split animation frames across unrelated providers.
- **Example Allocation:**
  - Grok → Oak tree family (`TEMP_Z0_TREE_OAK_A/B/C`)
  - Nano Banana Pro → Grass & wildflower family (`TEMP_Z0_GRASS_A/B/C`, `TEMP_Z0_FLOWER_A/B/C`)
  - Astra → Stone & crag family (`TEMP_Z0_ROCK_A/B/C`)

### Animation & Atlas Pre-Conditions
1. **Catalogue-Driven Animation:** Animation requirements (`animated: true`, `frameCount`, `variantCount`, companion sheet coordinates) must exist in catalogue metadata before generation begins. Image providers may not unilaterally alter frame counts or layout.
2. **Atlas Destination Precedes Generation:** Every runtime-bound asset must have its destination sheet, row, column, autotile block, or reserved coordinate rectangle assigned before generation.
3. **Source Art Only:** Image providers generate raw source art only. They never directly edit canonical runtime tilesheets. Integration follows the deterministic pipeline:
   `GENERATOR OUTPUT → STAGING → MECHANICAL QC → VISUAL CRITIQUE → DETERMINISTIC PACKER → PREASSIGNED ATLAS SLOT → IN-ENGINE PROOF → OWNER YEA/NAY`.

### WorldGen WBS Gates Remain Authoritative
Mass catalogue-driven image production is strictly gated by the physical WorldGen WBS sequence:
```text
Physical World Completion (WG.00–WG.09)
  ↓
WG.10: World Visual Topology Specification
  ↓
WG.11: Animation Requirements & Phase Budgets
  ↓
WG.20–25: Complete Semantic Asset Catalogue
  ↓
WG.30–33: Permanent Atlas Planning & Blank Companion Sheets
  ↓
WG.40+: Mass Distributed Image Generation
```
*Available image-generation compute does NOT permit bypassing or skipping these preceding gates.*

---

## 4. Provider Access vs. Worker Availability Architecture

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

### Discovered Provider Capabilities (as of 2026-09-25)

| Provider | Access | State | CLI Ready | Strongest Discovered Model | Max Reasoning | Context | Multi-Agent Support | Image Support | Substantive Role |
|---|:---:|:---:|:---:|---|---|---|---|:---:|---|
| **Claude / Fable** | `YES` | **`AVAILABLE`** | `YES` | `claude-opus-5-5[1m]` | `effort: xhigh` | Up to 1M | **YES** (native subagents, agent teams, worktrees) | `NO` | Primary implementation leaves, deep debugging, complex algorithms. |
| **Grok** | `YES` | **`AVAILABLE`** | `YES` | `grok-4.7` | Highest reasoning | Standard long | **YES** (native `--agents`, parallel sessions, worktrees) | **YES** (Source art only, catalogue-driven) | Adversarial analysis, test design, performance profiling, source art generation. |
| **Astra** | `UNKNOWN` | **`NOT_CONFIGURED`** | `NO` | *(Unprobed)* | *(Unprobed)* | *(Unprobed)* | *(Pending discovery)* | *(Pending discovery)* | Secondary engineering/art (activate when CLI configured). |
| **Codex** | `YES` | **`EXHAUSTED`** | `NO` | *(Deferred to reset)* | Highest appropriate | Standard | **YES** (when available) | `NO` | Mutation testing, invariant breaking, fuzz testing (standby for reset). |
| **Gemini** | `YES` | **`AVAILABLE`** | `YES` | `gemini-3-pro` / `gemini-3-pro-image` | High reasoning / Thinking | Full repo context | **YES** (`invoke_subagent`, `define_subagent`) | **YES** (Nano Banana Pro source art, catalogue-driven) | Coordinator, control tower, integration authority, authentic pixel art. |

---

## 5. Worker Saturation & Multi-Model Allocation

At every orchestration cycle, the coordinator ensures **every available worker is actively occupied**:
- **Target Load:** Each available worker maintains **1 active productive task** + **1–3 prepared follow-up candidates**.
- **Multi-Model Attack on Critical Subsystems:** Parallel workers deployed for implementation, adversarial review, and independent test generation using strong models and subagent teams.

---

## 6. Path Ownership & Worktree Isolation Laws

Maximum utilization must never compromise repository integrity:
1. **Strict Path Ownership:** Never allow two agents to concurrently edit overlapping files.
2. **Active Implementation Owner Wins:** If Worker A is actively implementing in a file path, Worker B may only inspect read-only, analyze performance, or write isolated non-conflicting tools.
3. **Worktree Isolation:** Parallel implementation tasks must run in isolated git worktrees (`.worktrees/<agent>-<task>`) branching from committed HEAD. Workers commit to their designated feature branches; Gemini reviews and integrates into `main`.

---

## 7. Productive Idle-Capacity Backlog

When primary milestone implementation is claimed or blocked at a gate, available capacity must be immediately routed to the productive backlog:
1. **WorldGen Sweeps & Topology:** 100–1,000 seed sweeps, cut exposure analysis, connectivity audits.
2. **Performance & Memory Profiling:** Boot-time benchmarks, hot-path allocation audits (<0.02 ms frame budgets).
3. **Adversarial & Mutation Testing:** Rule 4 mutant construction, save/load fuzz testing.
4. **Economy & Simulation Verifications:** Closed-loop conservation simulations, balance checks.
5. **Asset & Atlas Tooling:** Manifest completeness checkers, coordinate alignment verification.
6. **Codebase Hygiene:** Dead code detection, duplicate routine analysis, documentation audit.

---

## 8. Execution Lifecycle: Continue-Until-Gate

The orchestrator operates in an automated continuous loop:
```text
WHILE productive safe work exists:
    1. Inspect WBS & active file ownership
    2. Check provider availability states
    3. Dispatch all AVAILABLE workers with bounded, non-overlapping tasks (MAX_MULTIAGENT)
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

## 9. Reporting Cadence

At the conclusion of each orchestration cycle, the coordinator reports concisely:
```text
PROVIDER STATES:
- Claude/Fable: [AVAILABLE | LIMITED | EXHAUSTED]
- Grok:         [AVAILABLE | LIMITED | EXHAUSTED]
- Astra:        [NOT_CONFIGURED | AVAILABLE | EXHAUSTED]
- Codex:        [EXHAUSTED | OFFLINE | AVAILABLE]
- Gemini:       [AVAILABLE]

WORK COMPLETED:
- <Agent>: <Task ID> — <Summary> (<Commit Hash / Evidence>)

ACTIVE ASSIGNMENTS:
- <Agent>: <Task ID> — <Target File Paths> [QUALITY_PROFILE: MAX_MULTIAGENT | Model: <model> | MultiAgent: YES]

QUEUED NEXT:
- <Agent>: <Task ID> — <Prepared Scope>

OWNER GATE:
- NONE | [Specific Decision / Approval Requested]
```
