# DEUS — AGENT COMMUNICATION PROTOCOL v1
**Structured Inter-Agent Communication & Evidence Bus Specification**
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)
**Approved by Owner Directive:** 2026-09-25

---

## 1. Executive Summary & Plain-Language Model

> **The Shared Task Mailbox:**  
> DEUS agents do not engage in free-form, unmonitored chat. Instead, the communication layer operates like a **Shared Task Mailbox**. Agents send concise, structured, machine-readable messages strictly tied to a specific task, defect, commit, test, or evidence request. Gemini monitors, routes, and arbitrates all traffic. Workers exchange technical facts and verification requests directly, while Gemini maintains absolute control over scope, file ownership, permissions, and canonical integration.

### Core Objectives:
- **Zero Owner Messenger Overhead (`MESSENGER_FAILURE = 0`)**: The owner never copies and pastes text, code, or review feedback between agents.
- **Fast Defect/Fix/Verify Loops**: Implementers and independent reviewers exchange structured defect packets and verification requests directly.
- **Durable & Crash-Recoverable**: Communication is persisted in append-friendly JSONL records in the repository; no state is lost if a session terminates.
- **Review Independence Protected**: A review-independence firewall blocks anchoring before an independent reviewer forms its initial findings.
- **High Signal, Low Chatter**: Communication consists of compact, verified evidence packets rather than conversational prose.

---

## 2. Canonical Principle

> **"DEUS agents communicate through durable, structured task messages rather than uncontrolled free-form conversations. Workers may exchange questions, evidence, defects, fix notifications, verification requests, benchmark results, and blockers within their assigned scope. Gemini remains the authority for scope, ownership, WBS, permissions, architecture, and integration. Independent reviewers form their initial conclusions before implementation discussion. Important exchanges are persisted so crashes or session loss do not erase project state."**

---

## 3. Task-Scoped Communication

Every substantive message must declare its scope:
- `taskId`: Canonical task identifier (e.g. `DEUS-TSK-FABLE-19B`).
- `wbsId`: Immutable WBS leaf (e.g. `WG.00.08`).
- Optional context anchors: `defectId`, `reviewId`, `commit`, `testId`, `riskId`.

### Scope Expansion Boundary:
Workers are **strictly forbidden** from expanding task scope in communication (e.g. *"While you're fixing this, please also rewrite DEUS_Fluid.js"*). If an exchange identifies a missing capability or dependent refactor:
1. The worker emits a `SCOPE_REQUEST` or `NEW_TASK_PROPOSAL` directed exclusively to Gemini.
2. Gemini evaluates task boundaries, ownership locks, and WBS integrity.
3. Gemini either amends the current task contract or creates a separate queued task.

---

## 4. Canonical Message Types

The protocol defines a focused set of 13 structured message types:

| Type | Purpose | Initiator | Expected Response |
|---|---|---|---|
| `QUESTION` | Specific technical clarification citing code/spec. | Worker | `ANSWER` |
| `ANSWER` | Concrete factual response citing canonical sources. | Worker / Gemini | None |
| `EVIDENCE` | Unsolicited or requested test output, logs, or reproduction cases. | Worker | None |
| `DEFECT` | Concrete invariant violation or defect report. | Reviewer / Gemini | `FIX_READY` or `ESCALATE` |
| `FIX_READY` | Implementer announcement of remediation commit. | Implementer | `VERIFY_REQUEST` |
| `VERIFY_REQUEST`| Request to original reviewer to audit a fix commit. | System / Gemini | `DEFECT_CLOSED` or `DEFECT` (Re-open) |
| `DEFECT_CLOSED` | Confirmation by original finder that defect is resolved. | Original Reviewer | None (Proceed to next gate) |
| `BLOCKER` | Immediate halt: worker cannot proceed under constraints. | Worker | Gemini Directive |
| `SCOPE_REQUEST` | Proposal that additional files/tasks are required. | Worker | Gemini Approval / Rejection |
| `ESCALATE` | Technical impasse or boundary issue requiring arbitration. | Worker | Gemini Decision |
| `BENCHMARK_RESULT`| Structured performance timings and memory data. | Worker | None |
| `TEST_RESULT` | Structured test counts, pass/fail status, and mutant detection. | Worker | None |
| `HANDOFF` | Formal transition of task phase approved by Gemini. | Gemini | Worker Claim / Acknowledgment |

---

## 5. Machine-Readable Message Schema

Messages are stored as JSON Lines (`messages.jsonl`) adhering to this schema:

```json
{
  "messageId": "MSG-19B-0042",
  "taskId": "DEUS-TSK-FABLE-19B",
  "wbsId": "WG.00.08",
  "timestamp": "2026-09-25T17:45:00Z",
  "priority": "HIGH",

  "from": "grok",
  "to": "fable",
  "type": "DEFECT",

  "defectId": "DEF-19B-001",
  "relatedCommit": "116a3de",
  "relatedFiles": [
    "game/js/plugins/DEUS_Levels.js"
  ],

  "requiresResponse": true,
  "responseType": "FIX_READY",

  "summary": "continuousAirHeight counts fluid as air",
  "evidence": {
    "requirement": "Clearance means continuous AIR strata only",
    "observed": "Water (M_WATER) stratum was counted as air clearance",
    "location": "DEUS_Levels.js:continuousAirHeight",
    "expected": 0,
    "actual": 4,
    "reproduction": "node tools/test_strata_cuts_and_caves.js --mutant=air_through_fluid",
    "closureCriterion": "Function stops on M_WATER and air_through_fluid mutant is caught"
  },

  "status": "OPEN"
}
```

---

## 6. Structured Evidence Packets (Replacing Prose)

DEUS replaces conversational chatter with **Evidence Packets**. Every defect or question must answer eight concrete questions:
1. **WHAT REQUIREMENT?** The exact invariant or WBS rule violated.
2. **WHAT HAPPENED?** Concise observation of the failure.
3. **WHERE?** Exact file, function, and line number.
4. **HOW TO REPRODUCE?** Exact CLI command or test fixture.
5. **EXPECTED RESULT?** Mathematical or logical output expected.
6. **ACTUAL RESULT?** Actual output received.
7. **SEVERITY?** `BLOCKER` | `MAJOR` | `MINOR`.
8. **WHAT PROVES IT CLOSED?** Exact test, mutant detection, or benchmark that confirms the fix.

---

## 7. Review-Independence Firewall

To prevent **Anchoring Bias** (where an independent reviewer is subconsciously swayed by an implementer's self-assessment):

```text
[ IMPLEMENTATION COMPLETE ]
           │
           ▼
[ Review-Independence Firewall Engaged ]
Implementer ──x── Reviewer (Direct communication BLOCKED)
           │
           ▼
Reviewer receives ONLY:
├── Canonical Specification
├── Raw Git Diff / Commit
├── Frozen Invariants
└── Automated Test Files
           │
           ▼
[ Independent Review Findings Persisted ]
           │
           ▼
[ Review-Independence Firewall Lifted ]
Implementer ◄───► Reviewer (Structured DEFECT / FIX_READY loop enabled)
```

---

## 8. Defect Ownership & Verification Gate

1. **Finder Holds Closure Authority**: The agent that identifies a defect remains its authoritative **Closure Reviewer**.
2. **Implementer Cannot Self-Close**: An implementer cannot declare an independent reviewer's finding closed.
3. **Closure Handshake**:
   - Implementer delivers fix commit $\rightarrow$ emits `FIX_READY`.
   - Coordinator dispatches `VERIFY_REQUEST` to the original finder.
   - Original finder audits the diff and runs tests $\rightarrow$ emits `DEFECT_CLOSED`.
   - Coordinator records closure in `docs/telemetry/defects.jsonl`.
4. **Coordinator Override**: Gemini may override a closure dispute only by publishing documented evidence (e.g. proving a finding was a `FALSE_POSITIVE`).

---

## 9. Disagreement Escalation Rule (Max Two Exchanges)

To prevent circular AI arguments:
- **Exchange 1**: Reviewer issues `DEFECT` $\rightarrow$ Implementer provides technical `ANSWER` or clarification with evidence.
- **Exchange 2**: Reviewer issues rebuttal or re-test result $\rightarrow$ Implementer submits final evidence or fix commit.
- **If Unresolved after 2 Exchanges**: **MANDATORY ESCALATION TO GEMINI (`ESCALATE`)**.
- Gemini arbitrates decisively using repository facts, golden seed runs, and spec invariants. If an authentic gameplay or lore ambiguity exists, Gemini escalates to the Owner via `OWNER_GATE`.

---

## 10. File Ownership & Lock Protection

Communication cannot authorize actions that violate active file locks:
- When an agent proposes a fix or edit, the routing engine validates the sender's `ownedPaths`.
- If a requested change touches files owned by another active worktree or agent, the message is intercepted and flagged `BLOCKED_OWNERSHIP`.
- Gemini reconciles ownership boundaries before any edits are performed.

---

## 11. Communication Priority Levels

- `CRITICAL`: Immediate delivery. Uncaught exceptions, repository corruption, save format breakage, determinism failures, ownership collisions.
- `HIGH`: Major functional defects, broken regression suites, native NW.js playtest crashes, integration blockers.
- `NORMAL`: Standard defect packets, fix announcements, verification requests, benchmark telemetry.
- `LOW`: Non-blocking architectural observations, suggestions for future backlog tasks, minor styling notes.

---

## 12. Durable Storage Architecture

Task communications are persisted in append-only JSON Lines within each task's durable record:

```text
tasks/
└── WG.00.08/
    ├── task.json            # Task metadata, tier, DoD, owned paths
    ├── messages.jsonl       # Complete audit log of all inter-agent messages
    ├── defects.jsonl        # Defect records (OPEN, FIXING, CLOSED)
    ├── reviews.jsonl        # Reviewer reports and finding ratings
    └── report.json          # Final outcome telemetry
```

---

## 13. Crash Recovery Protocol

If an agent CLI session terminates, hangs, or crashes:
1. **Reconstruct State from Disk**: Gemini inspects `task.json` and `messages.jsonl`.
2. **Identify Unprocessed Messages**: Retrieve messages where `requiresResponse === true` and no matching reply exists.
3. **Determine Active Stage**: Re-establish current task state (e.g. `REMEDIATION`, `RE_REVIEW`) from the last recorded message.
4. **Resume Execution**: Re-dispatch the task with the exact unfulfilled message packet without reading historical conversational logs.

---

## 14. Agent Communication Authority Matrix

| Role | Permitted Message Types | Authority & Constraints |
|---|---|---|
| **Owner** | All Directives, Approvals, Gates | Absolute authority over game design, lore, art approval, and milestones. |
| **Gemini** (Coordinator) | All Types, Arbitrations, Gates | Authority over WBS, scope, tier, worktree locks, routing, integration, and escalation. |
| **Implementer** | `QUESTION`, `ANSWER`, `FIX_READY`, `EVIDENCE`, `BLOCKER`, `SCOPE_REQUEST`, `ESCALATE` | Write authority restricted strictly to assigned `ownedPaths` in isolated worktree. |
| **Reviewer** | `DEFECT`, `DEFECT_CLOSED`, `VERIFY_REQUEST`, `EVIDENCE`, `QUESTION`, `ESCALATE` | Read-only analysis. Evaluates invariants and verifies defect closure. Cannot command code rewrites. |
| **Specialist** | `EVIDENCE`, `ANSWER`, `QUESTION` | Read-only advisory role within specialist domain. |
| **Image Generator** | `GENERATED_READY`, `BLOCKER` | Delivers raw art into designated catalog slots. Cannot modify code or design specs. |
| **Art QC Agent** | `DEFECT` (`category: ART_QC`), `DEFECT_CLOSED` | Audits palette, scale, alpha, and originality against art specifications. |

---

## 15. Owner-Facing Reporting Standard (Zero-Relay Rule)

The owner is never used as an inter-agent messenger. Gemini filters technical chatter and communicates via structured summaries:
- **WHAT HAPPENED**: Plain-language description of recent progress.
- **WHAT THE TERM MEANS**: Simple definition of technical concepts.
- **WHY IT MATTERS**: Real impact on gameplay, framerate, or roadmap schedule.
- **WHAT THE AGENTS WILL DO**: Next automated engineering steps.
- **WHAT OWNER MUST DECIDE**: Explicit decision options if an Owner Gate is reached (otherwise *"No action required"*).

---

## 16. Implementation Plan During Consolidation Window

Scheduled alongside `CONSOLIDATION_PLAN_V1`:
1. Build `tools/agents/bus.js`: Lightweight CLI for appending and reading `messages.jsonl`.
2. Build `tools/agents/defect_router.js`: Automates the `DEFECT` $\rightarrow$ `FIX_READY` $\rightarrow$ `VERIFY_REQUEST` $\rightarrow$ `DEFECT_CLOSED` state transitions.
3. Integrate crash-recovery state reconstruction into Coordinator startup scripts.
4. Connect communication metrics (`messagesSent`, `defectClosureLatency`) directly to [`docs/AGENT_QUALITY_LEARNING_LOOP.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_QUALITY_LEARNING_LOOP.md).

---

## 17. Canonical Binding Summary

> **"DEUS agent communication is demand-driven, task-scoped, and evidence-based. Communication occurs through durable structured messages rather than free-form conversation. The owner never acts as an inter-agent messenger. Independent reviewers remain unanchored until initial findings are recorded. Disagreements are capped at two exchanges before coordinator arbitration. All exchanges are persisted in the repository to guarantee seamless crash recovery and verifiable project history."**
