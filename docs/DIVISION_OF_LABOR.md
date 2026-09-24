# DEUS — Division of Labor & Collaborative Roadmap: Gemini & Fable
**Document ID:** `DEUS-GOV-DIVISION-01`  
**Status:** Authoritative Governance Contract & Collaborative Roadmap  
**Authority:** User Directive (2026-09-24)  
**Applicability:** All AI Agents (Gemini & Fable / Claude Code)

---

## 1. The Core Principle

$$\textbf{“Gemini should fix the world so it obeys solid physical rules;}$$
$$\textbf{Fable should fix the people so they can survive in that world and actually grow a society.”}$$

---

## 2. Subsystem Ownership & Domains

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DEUS DIVISION OF LABOR                          │
├────────────────────────────────────────────────────────────────────────┤
│ GEMINI: CORE ENGINE / WORLD RULES / INFRASTRUCTURE / PHYSICS           │
│ - The Physical World Simulator: owns what is true in the universe.     │
│ - Structural Z-support, multi-level ontology, collapse physics.        │
│ - Fluid depth simulation, volumetric flow, fluid-terrain interactions. │
│ - Fire propagation rules, material flammability, environmental decay. │
│ - Universal construction state machine (Intent -> Building -> Complete)│
│ - Performance foundation: 4x speed @ 60 FPS, zero full-world scans.    │
│ - Modular 48px art production pipeline via Google Nano Banana Pro.     │
├────────────────────────────────────────────────────────────────────────┤
│ FABLE (CLAUDE CODE): AUTONOMOUS BEHAVIOR / COLONY COMPETENCE / SURVIVAL│
│ - The Society & Decision Simulator: owns how people live and decide.   │
│ - 7-day unattended survival baseline -> 30-day settlement competence.  │
│ - Hazard reflex & survival behavior (fleeing fire, dousing, triage).  │
│ - Needs & work balance (sleep, hunger, thirst, encumbrance, routing).  │
│ - Settlement expansion behavior (communal shelter -> cottages -> civic)│
│ - Threat response (armed defense, civilian flight to refuge).          │
│ - Autonomous job recovery, stale task withdrawal, peon deposit loops.  │
└────────────────────────────────────────────────────────────────────────┘
```

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
