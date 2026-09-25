# DEUS — Division of Labor & Collaborative Roadmap: Gemini & Fable
**Document ID:** `DEUS-GOV-DIVISION-01`  
**Status:** Authoritative Governance Contract & Collaborative Roadmap  
**Authority:** User Directive (2026-09-24)  
**Applicability:** All AI Agents (Gemini & Fable / Claude Code)  
**Canonical Roles Precedence:** Overall cross-model AI roles, responsibilities, and decision authorities are canonically defined in [`docs/CANONICAL_ROLES.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/CANONICAL_ROLES.md). This document specifies the domain split between physical world simulation and society behavior.

---

## 1. The Core Principle

$$\textbf{“Gemini should fix the world so it obeys solid physical rules;}$$
$$\textbf{Fable should fix the people so they can survive in that world and actually grow a society.”}$$

---

## 2. File Ownership & API Boundary (Split by File, Meet at Function Calls)

| Agent | Exclusive File Ownership | Role & Authority |
|---|---|---|
| **Gemini** | `game/js/plugins/DEUS_Fire.js`<br>`game/js/plugins/DEUS_Levels.js`<br>`game/js/plugins/DEUS_Fluid.js`<br>`game/js/plugins/DEUS_Walls.js`<br>`game/js/plugins/DEUS_Floors.js`<br>`game/js/plugins/DEUS_WorldGen.js`<br>`game/js/plugins/DEUS_Environment.js`<br>`game/js/plugins/DEUS_Core.js`<br>Engine Performance & Render Layers | **Physical World Authority:**<br>Implements physical simulation laws, structural support BFS, multi-Z ontology, collapse cascades, fluid depth, fire rules, and rain extinguishing.<br>Provides query APIs: `canConstruct()`, `isHazardous()`, `isSafeToExcavate()`, support checks, and piece state (`PLANNED`, `BUILDING`, `COMPLETE`). |
| **Fable** | `game/js/plugins/DEUS_Projects.js`<br>`game/js/plugins/DEUS_Colonists.js`<br>`game/js/plugins/DEUS_Jobs.js`<br>`game/js/plugins/UF_Households.js`<br>Colony AI & Behavioral Decision Loops | **Society & Behavior Authority:**<br>Owns the settlement brain, blueprint set, resource hauling, job assignments, colonist decision loops, survival soaks, and settlement expansion.<br>Calls Gemini's physical query APIs and never reimplements physical rules. |

### The Golden Rules of File Ownership:
1. **Never edit a file owned by the other agent.** (Prevents syntax errors and duplicate declarations).
2. **All interaction happens through documented function calls and events, never shared file editing.**
3. **If a physical query is needed by the planner (e.g. `canConstruct` or `isSafeToExcavate`), Gemini implements it in the physical layer (`DEUS_Fire.js` / `DEUS_Walls.js` / `DEUS_Levels.js`), and Fable calls it from `DEUS_Projects.js` / `DEUS_Jobs.js`.**
4. **For the Universal Construction Lifecycle, Gemini owns what is physically true about each piece (e.g. that a `PLANNED` or `BUILDING` wall provides zero structural support). Fable's `DEUS_Projects.js` keeps the planning and hauling, and reads those states.**

---

## 3. The Four-Phase Collaborative Roadmap

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   FOUR-PHASE COLLABORATIVE ROADMAP                     │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: SURVIVAL BASELINE & HAZARD HARDENING                          │
│ • FABLE:                                                               │
│   - Execute clean 7-day unattended survival soak.                      │
│   - Scale to 30-day settlement competence soak.                        │
│   - Eliminate mass casualty loops from dumb colonist behavior.         │
│ • GEMINI:                                                              │
│   - Harden fire model: strict hearth clearance & containment.          │
│   - Implement rain/water extinguishing interactions.                   │
│   - Harden construction safety guards (refuse unsafe placements).      │
│   - Full cause-chain forensic auditability for every burn or death.    │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: PHYSICAL CORRECTNESS & VOLUMETRIC GEOMETRY                    │
│ • GEMINI:                                                              │
│   - Event-driven structural support BFS & multi-Z collapse cascades.   │
│   - Enforce solid terrain invariant on Z0 under Z+1/Z+2 hills.         │
│   - Explicit constructible roofs at Z+1; derived shelter coverage.     │
│   - Unified 6-layer cell ontology (Base, Material, Build, Fluid, Fire).│
│ • FABLE:                                                               │
│   - Adapt colonist navigation, mining, and building to multi-Z rules.  │
│   - Respect structural stability (prevent mining under own ceiling).   │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: EXPANSION & BUILDING GRAMMAR                                  │
│ • GEMINI:                                                              │
│   - Settlement expansion parcel framework using Building Grammar.      │
│   - Component construction plans (intent manifests for dwellings).     │
│ • FABLE:                                                               │
│   - Autonomous growth transition: Communal Hall -> Family Cottages ->  │
│     Workshops -> Stockpiles -> Defensive Gates.                        │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: SCALABLE OPTIMIZATION & VERIFICATION                          │
│ • GEMINI:                                                              │
│   - Bounded spatial caches, dirty-region invalidation, 60 FPS @ 4x.    │
│ • FABLE:                                                               │
│   - Verify AI decision loops remain stable and responsive at 4x speed. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Immediate Assignments

### Gemini Immediate Assignment: “Stabilize the Physical World”
1. **Fire & Hazard Model Hardening:**
   - Audit `DEUS_Fire.js` and `DEUS_Projects.js`.
   - Enforce hearth safety clearance invariant (no combustible materials within 1 tile).
   - Wire precipitation extinguishing: rain accelerates flame burnout by $10\times$.
   - Construction refusal: `canConstruct` rejects blueprint placements that create fire hazards.
   - Forensic provenance: Ensure every burned entity logs structured origin records.
2. **Universal Construction State Machine:**
   - Implement `PLANNED` $\to$ `MATERIAL_READY` $\to$ `BUILDING` $\to$ `COMPLETE` in `DEUS_Projects.js`.
3. **Structural Support Foundation:**
   - Implement the bounded BFS collapse check in `DEUS_Levels.js`.

### Fable Immediate Assignment: “Make the 8 Settlers Survive and Expand”
1. **7-Day Soak Execution:**
   - Run 7-day unattended simulation without catastrophic death loops.
2. **Fire Survival Reflex:**
   - Ensure settlers never path through fire and actively douse burning comrades.
3. **Post-Communal Expansion:**
   - Transition colonists from the first communal room into family dwellings and storage.
