# DEUS — CANONICAL AI ROLES & DIVISION OF LABOR
**Document ID:** `DEUS-GOV-ROLES-01`  
**Status:** AUTHORITATIVE & BINDING  
**Authority:** Owner Directive (2026-09-25, drafted with Grok / Incoming PM)  
**Applicability:** All AI Agents (Gemini, Claude / Fable, Grok, Codex)

---

## 1. Executive Principle & Single Authority

This document is the **single source of truth** for AI agent roles, responsibilities, and decision authorities on Project DEUS. It reconciles, supersedes, and unifies all prior role descriptions in `GEMINI.md`, `AGENTS.md`, `docs/DIVISION_OF_LABOR.md`, and `docs/WORK_QUEUE.md`. All other governance documents must point directly to this specification.

Review interval: Roles are reviewed after approximately **10 completed tasks**, using telemetry and verified output, not impressions.

---

## 2. Allocation of Roles by Aptitude

| Agent / Model | Primary Role | Core Responsibilities | Hard Constraints & Invariant Boundaries |
|---|---|---|---|
| **Gemini / Antigravity** | **Coordinator & Integration Authority** | • Orchestration, task routing, and WBS state transitions.<br>• Integration authority for all merges into `main`.<br>• Repository health, architectural alignment, and baseline profiling.<br>• Autonomous non-living art production pipeline via Google Nano Banana Pro.<br>• Telemetry monitoring and 3-minute pulse reporting. | • **Does not self-certify.** A WBS item CANNOT be marked `DONE` until an independent closure reviewer's verdict is recorded with a timestamp that precedes the `DONE` edit.<br>• Cannot close defects as `grok`. May record `FIX_READY`. |
| **Claude / Fable** | **Primary Implementer** | • Core engine leaves (`DEUS_Levels.js`, `DEUS_WorldGen.js`, `DEUS_Fluid.js`, etc.).<br>• Simulation leaves and society systems (`DEUS_Projects.js`, `DEUS_Colonists.js`, `DEUS_Jobs.js`).<br>• Primary code authoring for deep mechanics and algorithmic implementations. | • Does not modify WBS statuses directly (submits evidence packets to Coordinator).<br>• Does not edit files outside assigned worktree/lane. |
| **Grok** | **Adversarial Reviewer & Defect Closer** | • Independent adversarial code audit and vulnerability identification.<br>• Failure mutation design and defect verification.<br>• Defect closure authority (`closedBy: "grok"`).<br>• Performance attack plans and boundary condition audits. | • **Not the author of specs, protocols, or results documents.**<br>• Any Grok document or report stating results **must cite the specific execution run and commit** that produced them.<br>• Does not implement production engine code. |
| **Codex** | **Tooling & Harness Engineer** | • Bounded diagnostic tooling, test harnesses, and validation scripts.<br>• Telemetry collectors, governance parsers, and performance probes.<br>• Auxiliary automation scripts and CI/CD harnesses (when usage/model is available). | • Strictly bounded to `tools/` and `docs/telemetry/`.<br>• Does not modify runtime engine plugins (`game/js/plugins/`). |

---

## 3. The Independent Verification Gate

No WBS leaf, feature milestone, or defect may be declared closed without meeting the two-party verification rule:

$$\textbf{Implementation (Claude/Fable or Gemini)} \;\;+\;\; \textbf{Independent Adversarial Audit (Grok)} \;\;+\;\; \textbf{Coordinator Merge (Gemini)} \;\;=\;\; \textbf{DONE}$$

1. **Independent First Verdict**: Reviewers (Grok / Codex) must inspect actual git commits and execute tests independently, forming their first verdict without relying on the implementer's self-reported text.
2. **Defect Lifecycle**:
   - `OPEN`: Discovered by reviewer or test harness.
   - `FIX_READY`: Implementer commits fix and provides evidence run.
   - `CLOSED`: Reviewer independently verifies fix commit in tree and records formal closure signature with timestamp.
3. **No Retroactive Backfill**: Closure timestamps must reflect genuine verification moments; rapid sequential backfilling is prohibited.

---

## 4. File Ownership & Concurrency Boundaries

To ensure zero merge conflicts and preserve codebase integrity during parallel execution:
- **One Primary Writer per File Set**: Each active task lane possesses exclusive write access to its designated whitelist.
- **Published Matrix**: Active file ownership must be published in `docs/STATUS.md` prior to launching parallel work lanes.
- **Migration Freeze Protocol**: Migration or directory restructuring (e.g. copying to `C:\Dev\DEUS`) requires a synchronized **Migration Freeze** where all active lanes commit their work and pause. Zero edits may occur during file migration.

---

## 5. Pointer References

The following documents defer to and are governed by this specification:
- `GEMINI.md` → Refers to Section 2 (Gemini Role: Coordinator, Integration, Non-Living Art).
- `AGENTS.md` → Refers to Section 2 & 4 (Collaborative multi-agent boundaries).
- `docs/DIVISION_OF_LABOR.md` → Refers to Section 2 (Gemini / Fable domain split).
- `docs/WORK_QUEUE.md` → Refers to Section 3 (Routing and approval gates).
