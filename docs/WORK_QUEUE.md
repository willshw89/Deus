# WORK QUEUE & CONTROL TOWER — Project DEUS

**Owner Terminal:** Gemini  
**Last Updated:** 2026-09-25  
**Active Engine Gate:** Year-0 default + Z-2 generated-cut proof + Phase 1 baseline file (Slice 1 playtest remains AWAITING OWNER separately; WG.00.09 / 19C remains QUEUED)  

---

## 1. Governance & Routing Loop

Every work block moves strictly through the standard DEUS routing loop:

$$\text{Owner Terminal} \longrightarrow \text{Architecture Council} \longrightarrow \begin{matrix} \text{Economy Review} \\ \text{(when relevant)} \end{matrix} \longrightarrow \text{Build Bench} \longrightarrow \begin{matrix} \text{Verification, Debug} \\ \text{\& Performance} \end{matrix} \longrightarrow \begin{matrix} \text{Native MZ \&} \\ \text{Player Review} \end{matrix} \longrightarrow \begin{matrix} \text{Provenance, Build} \\ \text{\& Recovery} \end{matrix} \longrightarrow \begin{matrix} \text{Owner Terminal} \\ \text{Release Gate} \end{matrix}$$

### Permanent Work Destinations:
1. **Architecture Council — Codex Astra Ultra**: System boundaries, schemas, contracts, sequencing, technical risks, architectural review.
2. **Economy & Simulation Review — Gemini**: Resources, production chains, crafting, refining, construction, 3×3 workstation-grid transactions, logistics, population, AI behavior, simulation performance.
3. **Build Bench / Implementation — Claude Code Fable Ultra**: Focused implementation blocks. Preserves path boundaries, runs focused unit tests, outputs formal handoff packet.
4. **Verification, Debug & Performance — Gemini**: Automated tests, determinism checks, regression tests, profiling, 60 FPS frame-budget validation (<16.6 ms), memory cleanup, console zero-error review.
5. **Native MZ & Player Review — Gemini + Owner Session**: RMMZ editor Playtest (F5), dev console (F8), scene transitions, camera, input, native feel.
6. **Provenance, Assets, Build & Recovery — Gemini**: Asset metadata, SHA-256 hashes, originality checks, backup snapshots, packaging checks, release eligibility.

---

## 2. Standard Work Block Schema

Every work block MUST declare:
- **Block ID**: Stable identifier (e.g. `WB-001`)
- **Objective**: Plain-language description of intended change
- **Priority**: `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`
- **Status**: `NEW` · `EVALUATING` · `QUEUED` · `READY` · `IN_PROGRESS` · `BLOCKED` · `WAITING_FOR_MODEL_CREDITS` · `VERIFY` · `DONE` · `PARKED` · `REJECTED` · `SUPERSEDED`
- **Dependencies**: Prerequisite work blocks or slice approvals
- **Allowed Paths**: Explicit file / directory whitelist
- **Forbidden Paths**: Explicit read-only or off-limits files (`game/js/rmmz_*.js`, etc.)
- **Owner Decisions Required**: Open gates or choices requiring user input
- **Assigned Worker**: Model or conversation (`Astra`, `Fable`, `Gemini`, or `Owner`)
- **Automated Acceptance Criteria**: Measurable test commands that must output `PASS`
- **Native MZ Acceptance Criteria**: Playtest observations, scene transitions, F8 console output
- **Performance Criteria**: FPS target, frame budget (<16.6ms), no full-world per-frame scans
- **Provenance & Licensing**: Originality check compliance, no ripped U7/U8/DF raw assets
- **Rollback / Recovery Plan**: Git branch/worktree, commit hashes, or backup archive paths
- **Expected Handoff Destination**: Next stage in the routing loop

---

## 3. Active & Queued Work Blocks

### Block `WB-001`: Slice 1 Owner Acceptance & Native Playtest Gate
- **Objective**: Complete formal owner playtest review of Slice 1 (Autonomous Colonist AI & Settlement Construction) in native RPG Maker MZ editor.
- **Priority**: `HIGH`
- **Status**: `AWAITING_OWNER` (Slice 1 playtest gate, tracked separately from active engine gate)
- **Dependencies**: Slice 0 Approved (`2026-09-20`)
- **Allowed Paths**: `docs/STATUS.md`, `docs/SLICES.md`, `docs/WORK_QUEUE.md`
- **Forbidden Paths**: `game/js/rmmz_*.js`, `game/js/libs/`, `game/js/plugins/` (Code freeze pending review)
- **Owner Decisions Required**:
  1. Confirm settlement construction behavior in native Playtest (F5).
  2. Approve or request adjustments to Slice 1.
- **Assigned Worker**: Gemini (Facilitator) + Owner (Tester)
- **Automated Acceptance Criteria**:
  - `node tools/run_tests.js smoke` -> 13/13 PASS (Observed 2026-09-22)
  - `node tools/run_tests.js sheet` -> 16/16 PASS
  - `node tools/run_tests.js colonists` -> 5/5 PASS
  - `node tools/run_tests.js jobs` -> 19/19 PASS
- **Native MZ Acceptance Criteria**:
  - Clean boot to `Scene_Title` without infinite spinner.
  - New Game transitions cleanly to `Scene_Map` (Map001 template loading seeded procedural terrain).
  - Founders visible around campfire with stance circles.
  - Zero unhandled exceptions in F8 console.
- **Performance Criteria**: Stable 60 FPS at 1x speed; no freezing or stalling during tick execution.
- **Provenance & Licensing**: All active plugins under DEUS license; no ripped reference assets.
- **Rollback / Recovery Plan**: Git commit `17039c1de8c2d09b2c606dcd7fc1838398b65657` baseline.
- **Expected Handoff Destination**: Owner Terminal Release Gate -> Promotion to Slice 2.

---

### Block `WB-002`: Slice 2 Specification & Architecture Council Alignment (Draft)
- **Objective**: Formalize Slice 2 (Needs, Food, Circadian Clock, and Time Controls) into bounded, executable work blocks adhering to lean architecture and DF 3×3 workstation standards.
- **Priority**: `MEDIUM`
- **Status**: `QUEUED`
- **Dependencies**: `WB-001` (Slice 1 approval)
- **Allowed Paths**: `docs/SLICES.md`, `docs/design/`, `docs/WORK_QUEUE.md`
- **Forbidden Paths**: All runtime code until block is marked `READY` and assigned.
- **Owner Decisions Required**: Confirm whether Needs (hunger, thirst, fatigue) should remain decoupled from autonomous survival loops until basic designation jobs are solidified.
- **Assigned Worker**: Architecture Council (Codex Astra Ultra, or Gemini if Astra credits unavailable)
- **Automated Acceptance Criteria**: Slice 2 acceptance test harness drafted and able to fail.
- **Native MZ Acceptance Criteria**: UI dials and time speed controls verified in RMMZ windowing.
- **Performance Criteria**: Multi-domain time tickers consume <0.5 ms per frame.
- **Provenance & Licensing**: Clean room implementations.
- **Rollback / Recovery Plan**: Branch isolation.
- **Expected Handoff Destination**: Build Bench (Claude Code Fable Ultra).

---

### Block `WB-003`: Natural World Autonomous Behavior & Living Ecology
- **Objective**: Activate the autonomous life and behavior of the natural world (fauna grazing, herd cohesion, predator/prey balance, flee responses, plant/bush ecological regrowth, and diurnal lighting) within strict 60 FPS budgets.
- **Priority**: `HIGH`
- **Status**: `READY` (Awaiting Owner Authorization to Execute)
- **Dependencies**: None (self-contained living environment substrate).
- **Allowed Paths**:
  - `game/js/plugins/DEUS_Wildlife.js`
  - `game/js/plugins/DEUS_Ecology.js`
  - `game/js/plugins/DEUS_Environment.js`
  - `game/js/plugins/DEUS_DayNight.js`
  - `docs/STATUS.md`
  - `docs/WORK_QUEUE.md`
- **Forbidden Paths**:
  - `game/js/rmmz_*.js`, `game/js/libs/`, `game/js/main.js` (Read-only engine core)
  - `game/data/*.json` (Editor safety; catalog remains unchanged)
  - `game/js/plugins/DEUS_Colonists.js`, `game/js/plugins/DEUS_Jobs.js` (Human systems untouched)
- **Owner Decisions Required**:
  1. Confirm authorization to execute `WB-003` with Gemini while Astra & Fable are resting.
  2. Confirm preferred predator-kill behavior: drop harvestable meat/bone items or feed in place.
- **Assigned Worker**: Gemini (Implementation & Verification)
- **Automated Acceptance Criteria**:
  - `node tools/run_tests.js smoke` -> 13/13 PASS
  - `node tools/run_tests.js wildlife` -> 13/13 PASS (grazing, fleeing, predator detection, performance < 1.0 ms)
- **Native MZ Acceptance Criteria**:
  - In Playtest (F5), wild deer, hares, and boars wander naturally in herds, pause to graze near vegetation, flee when approached, and sleep during nighttime.
  - Predators stalk prey within their sensory radius.
  - Zero unhandled errors in F8 dev console.
- **Performance Criteria**: Total wildlife + ecology tick execution consumes < 1.0 ms per frame on 256×256 maps.
- **Provenance & Licensing**: 100% original code and logic; zero ripped reference code.
- **Rollback / Recovery Plan**: Git commit baseline `17039c1de8c2d09b2c606dcd7fc1838398b65657`.
- **Expected Handoff Destination**: Verification, Debug & Performance (Gemini) -> Native MZ & Player Review (Owner).

