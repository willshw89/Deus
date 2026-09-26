# WORK QUEUE & CONTROL TOWER — Project DEUS

**Coordinator:** Gemini  
**Last Updated:** 2026-09-25 23:45 CT (Directive 001-L)  
**Active Engine Gate:** Current parallel lanes: Lane H (WG.00.08 Z-2 Cut Proof Hardening), Lane C2b (WG.00.12 Governance Hardening), and Lane E (WG.00.09 Five-Z Depth Renderer Attack Plan). Merged lanes: A, B, C1, C2, C3, F, G. Delivered: Lane D.  
**Hardware Rule:** Max 1 heavy local job cap LIFTED as of 2026-09-25 (Owner decision). Auto-tripwire: instantaneous power loss reinstates cap of 1 immediately.  
**Canonical Governance Standard:** [`docs/CANONICAL_ROLES.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/CANONICAL_ROLES.md) and [`docs/AGENT_UTILIZATION_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_UTILIZATION_POLICY.md).

---

## 1. Governance & Routing Loop

Every work block moves strictly through the standard DEUS routing loop:

$$\text{Coordinator (Gemini)} \longrightarrow \text{Architecture / Plan (Grok / Claude)} \longrightarrow \text{Build Bench (Claude / Fable)} \longrightarrow \text{Verification & Adversarial Review (Grok)} \longrightarrow \text{Integration to Main (Gemini)} \longrightarrow \text{Owner Release Gate}$$

### Permanent Work Destinations:
1. **Routing, Coordination & Integration — Gemini:** Multi-agent routing, WBS state maintenance, git merge & push authority. Zero engine code edits; no self-certification.
2. **Implementation & Core Engineering — Claude / Fable:** Bounded implementation leaves, test creation, plugin code adhering to lean architecture standards.
3. **Adversarial Verification, Mutation Testing & Review — Grok (Independent):** Invariant testing, failure-mode analysis, mutant roster execution, independent verification verdicts.
4. **Bounded Tooling & Automation — OpenAI Codex (Exhausted):** Bounded scripts, migration tools, telemetry utilities (when quota available).
5. **Directives & PM Mailbox Authority — Grok Bot (PM):** Directives, independent sign-offs, mailbox communication via `C:\Users\snewt\.deus_pm`.
6. **Owner Release Gate — Owner Session:** Final playtest acceptance, high-level rulings, release decisions.

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
- **Assigned Worker**: Model or conversation (`Claude / Fable`, `Grok`, `Codex`, `Gemini`, or `Owner`)
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
- **Status**: `PARKED` (Awaiting PM/Owner assignment)
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
  1. Authorize execution of `WB-003` when ready.
  2. Confirm preferred predator-kill behavior: drop harvestable meat/bone items or feed in place.
- **Assigned Worker**: Claude / Fable (Writer). Reviewer: Grok (Independent Reviewer).
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
- **Expected Handoff Destination**: Verification & Adversarial Review (Grok) -> Coordinator Integration.

---

### Block `WB-004`: WG.00.12 Consolidation Without Moving Files (Lane C)
- **Objective**: Establish non-moving foundation for repository hygiene, governance, performance profiling, and battle stack audit prior to any physical directory migration.
- **Priority**: `HIGH`
- **Status**: `IN_PROGRESS` (Sub-lanes C1, C2, C3, and F merged; C2b active).
- **Dependencies**: WG.00.08 / FABLE-19B closeout evidence.
- **Allowed Paths**:
  - `docs/telemetry/*`
  - `tools/performance/*`
  - `tools/governance/*`
  - `docs/adr/*`
  - `docs/issues/*`
- **Forbidden Paths**: Core engine plugins (`game/js/plugins/DEUS_Levels.js`, `DEUS_World.js`, `DEUS_Fluid.js`, etc.); zero file moving/renaming.
- **Owner Decisions Required**: None (non-moving preparatory work).
- **Assigned Worker**: Claude (Lane C2b writer). Reviewer: Grok (Adversarial re-attack).
- **Automated Acceptance Criteria**:
  - `tools/performance/` and `tools/governance/` scripts execute cleanly and output verifiable metrics.
  - Battle stack audit document completed in `docs/adr/`.
- **Performance Criteria**: Zero runtime engine impact (tooling only).
- **Rollback / Recovery Plan**: Git branch/worktree isolation.
- **Expected Handoff Destination**: Adversarial Review (Grok) -> Coordinator Integration.

---

### Block `WB-005`: WG.00.08 Native Z-2 Cut Proof Hardening (Lane H)
- **Objective**: Harden automated Z-2 cut proof (`tools/test_generated_z2_cut_proof.js`) per DEC-001 fluid ruling with whole-footprint checks, ravine identity assertions, and 5 built-in mutants.
- **Priority**: `CRITICAL`
- **Status**: `REVIEWED-PASS-WITH-MINORS` (Merged into `main` at `9acdee8a` per PM sign-off Directive 0016-P; pending minor defect disposition).
- **Dependencies**: DEC-001 Owner Fluid Ruling.
- **Allowed Paths**: `tools/test_generated_z2_cut_proof.js`, `tasks/WG.00.08/*` (docs & evidence only).
- **Forbidden Paths**: All engine plugins (`game/js/plugins/*`) and game data.
- **Owner Decisions Required**: Disposition DEC-010 (rock ledge support vs connectivity).
- **Assigned Worker**: Claude / Fable (Writer). Reviewer: PM Grok Bot / Grok Verifier.
- **Automated Acceptance Criteria**:
  - Baseline `node tools/test_generated_z2_cut_proof.js` exits 0 (12/12 checks pass). Verified on main.
  - Mutants sweep `node tools/test_generated_z2_cut_proof.js --mutants` exits 1 (8/8 caught).
- **Expected Handoff Destination**: Merged into main. Minor follow-ups tracked under DEF-Z2-PROOF-*.

---

### Block `WB-006`: WG.00.12 Governance Checker Hardening (Lane C2b)
- **Objective**: Harden `tools/governance/check_claims.js` against 9 PM attack vectors identified in Directive 001-I §C.
- **Priority**: `HIGH`
- **Status**: `IN_PROGRESS` (Active writer in `C:\Users\snewt\.deus_worktrees\lane-c2b`).
- **Dependencies**: Merged Lane C2 (`83bcc1a7`).
- **Allowed Paths**: `tools/governance/check_claims.js`, `tools/governance/test_check_claims.js`, `tasks/WG.00.12/c2_governance_state.md`.
- **Forbidden Paths**: All engine files.
- **Assigned Worker**: Claude CLI (Writer). Reviewer: Grok (Adversarial Re-attack).
- **Automated Acceptance Criteria**: All 9 attack vectors detected and reported with exit 1; clean claims exit 0.
- **Expected Handoff Destination**: Grok Adversarial Re-attack -> PM Sign-off -> Coordinator Integration.

---

### Block `WB-007`: WG.00.09 Five-Z Depth Renderer Attack Plan (Lane E)
- **Objective**: Author and harden the global Five-Z depth renderer attack plan (`docs/systems/UF_Depth_Attack_Plan.md`) adhering to lean 2D chibi top-down RPG specifications, zero blur, zero runtime color matrix shaders, and scale-only recession (DEC-006 / R1 = Option D).
- **Priority**: `HIGH`
- **Status**: `IN_PROGRESS` (Diff review `6a71a4c4` requested changes on 2 minor findings: N5, N6).
- **Dependencies**: DEC-006 (Option D ruling).
- **Allowed Paths**: `docs/systems/UF_Depth_Attack_Plan.md`, `tasks/DEUS-TSK-FABLE-19C/*`.
- **Forbidden Paths**: All engine code (`game/js/plugins/*`) and game data.
- **Assigned Worker**: Grok CLI (Writer). Reviewer: Claude CLI (Independent Diff Reviewer).
- **Automated Acceptance Criteria**: Clean independent diff review PASS without open blockers or major findings.
### Block `WB-008`: WG.00.12 Automated Merge Gate (Lane I)
- **Objective**: Implement CLI tool `tools/governance/merge_gate.js`, self-test suite `tools/governance/test_merge_gate.js`, and documentation `tools/governance/MERGE_GATE.md` enforcing scope boundaries, independent review tag/hash verification, test suite execution in fresh clones, and remote push alignment.
- **Priority**: `CRITICAL`
- **Status**: `IN_PROGRESS` (Active writer Claude PID 10576 on branch `task/lane-i`).
- **Dependencies**: None.
- **Allowed Paths**: `tools/governance/merge_gate.js`, `tools/governance/test_merge_gate.js`, `tools/governance/MERGE_GATE.md`, `tasks/WG.00.12/lane-i/**`.
- **Forbidden Paths**: All other paths.
- **Assigned Worker**: Claude CLI (Writer). Reviewer: Grok CLI (Adversarial Attacker).
- **Automated Acceptance Criteria**: All 11 refusal conditions + passing case + mutants pass in foreground clone.
- **Expected Handoff Destination**: Grok Adversarial Attack -> PM Sign-off -> First Gate-Enforced Merge to Main.

---

### Block `WB-009`: WG.00.12 Standard Worker Launcher & Pre-Push Guard (Lane J)
- **Objective**: Implement `tools/ops/launch_worker.ps1`, `gate_tests.json`, `pre-push` hook, `install_lane_hooks.ps1`, `resume_queue.ps1`, and self-tests.
- **Priority**: `CRITICAL`
- **Status**: `IN_PROGRESS` (Active writer Claude PID 2684 on branch `task/lane-j`).
- **Dependencies**: None.
- **Allowed Paths**: `tools/ops/launch_worker.ps1`, `tools/ops/gate_tests.json`, `tools/ops/hooks/pre-push`, `tools/ops/install_lane_hooks.ps1`, `tools/ops/test_launch_worker.ps1`, `tools/ops/README.md`, `tools/ops/resume_queue.ps1`, `tools/ops/test_resume_queue.ps1`, `tasks/WG.00.12/lane-j/**`.
- **Forbidden Paths**: Lane I files and all engine plugins.
- **Assigned Worker**: Claude CLI (Writer). Reviewer: Grok CLI (Independent Reviewer).
- **Automated Acceptance Criteria**: `tools/ops/test_launch_worker.ps1` and `tools/ops/test_resume_queue.ps1` pass in foreground.
- **Expected Handoff Destination**: Grok Independent Review -> PM Sign-off -> Gate Merge.

---

### Block `WB-010`: WG.00.12 GitHub Actions Continuous Integration Gate
- **Objective**: Author `.github/workflows/gate.yml` running the node-only gate test suite on push to `main` and `task/*`.
- **Priority**: `HIGH`
- **Status**: `QUEUED` (Do not launch; starts after Lane I is gate-merged; requires PM sign-off before merge).
- **Dependencies**: `WB-008` (Lane I Merge Gate).
- **Allowed Paths**: `.github/workflows/gate.yml`, `docs/governance/CI_GATE.md`.
- **Forbidden Paths**: All other files.
- **Assigned Worker**: Unassigned (Queued).
- **Expected Handoff Destination**: PM Review & Sign-off -> Integration to Main.



