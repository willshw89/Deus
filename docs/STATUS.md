# STATUS: Project DEUS Current Operational State
**Project Formal Name:** DEUS  
**Last Updated:** 2026-09-25 23:45 CT (Directive 001-L)  
**Coordinator & Integration Authority:** Gemini / Antigravity  
**Reporting Policy:** Immediate notification on commits, failures, defects, crashes, or power events; routine pulse every 15 minutes.  
**Historical Ledger:** All completed historical records prior to 2026-09-25 are archived in [`docs/archive/STATUS_LEDGER_20260925.md`](archive/STATUS_LEDGER_20260925.md).  
**Canonical Defect Ledger:** `tasks/WG.00.08/defects.jsonl` (Note: `docs/telemetry/defects.jsonl` cited in protocol docs does not exist).

---

## 0. Global Rules and Freezes
- **DEC-007 Art Freeze (Owner, 2026-09-25):** No art of any kind may be generated, requested from any generator, or integrated as newly generated art by anyone (PM, Gemini, or any worker) without direct Owner involvement. All earlier autonomous-generation mandates are suspended. Test-harness PNG renders used as test evidence are allowed and not art.
- **Migration Freeze:** The physical copy to `C:\Dev\DEUS` is frozen until all active writers commit and pause at a synchronized freeze point.
- **Pre-Commit Hook Status:** Hook is **NOT installed** (waits for Grok pass on Lane C2b AND Lane E merge, per Directive 001-I §C).
- **WG.00.08 Gate:** WG.00.08 cannot close until a passing Lane H proof, independent Grok verification, and PM sign-off.
- **Core Process Rules:**
  - One primary writer per file set (strict non-overlapping ownership).
  - Reviewers form their first verdict independently.
  - Gemini alone controls WBS transitions; zero self-certification.
  - Independent closure review required before marking any WBS item `DONE`.
  - Only the integrator pushes to `origin`, after each merge; workers never push.
  - A running CLI `-p` session reads its prompt only at launch.
  - Command captures must record `EXIT=$LASTEXITCODE` per command directly in shell (never inside `powershell -Command "..."`).

---

## 1. Hardware, Remote & Execution State
- **Hardware Status:** `GREEN` (Clean restarts 17:16/17:18; no Kernel-Power 41).
- **Heavy Job Cap:** Formally **LIFTED** as of 2026-09-25 per Owner decision.
- **Automatic Tripwire:** Any instant power loss automatically reinstates `MAX_SIMULTANEOUS_HEAVY_LOCAL_JOBS = 1` until explicitly lifted by the Owner. Any power event must be reported immediately.
- **Remote Git Origin:** Formally configured and live per DEC-005: `origin = https://github.com/willshw89/Deus.git` (private remote). Verified clean clone with 10,259 tracked files, fsck clean, checks pass.
- **Origin in Sync:** **YES** (`main` and `origin/main` both at `eb93286c11282d8c5e529be5bdf04212d1cd51cc`).
- **Backup State:** **COMPLETE (git); untracked-essentials zip awaiting Owner off-laptop copy** (`C:\Users\snewt\DEUS_backups\deus_untracked_2026-09-25.zip`, 89.5 MB, SHA256 D3A49004…C0CD1).
- **Pre-Execution Checkpoint Discipline:** Before launching any heavy execution, workers must checkpoint in `tasks/<task-id>/state.md`, save all open files, verify git branch/worktree, and commit uncommitted work.
- **Migration Freeze:** The physical copy to `C:\Dev\DEUS` is frozen until all active writers commit and pause at a synchronized freeze point.

---

## In progress
- **Incident Correction (Directive 001-H sec 6):** Coordinator output file overwrite at 17:13:55 logged as `DEF-COORD-INJECT-01`; `b1ua8l2oj.output` had real 29/0 EXIT=0 result confirmed by `task-34196.log:1084`; `bvwyow104.output` was hook-script SyntaxError (EXIT=1); coordinator ceased all worker temp file touches.
- **Worker Relaunch (Directive 001-K §1):** Lane H original worker (Claude PID 6276, `task-35425`) exited at 23:18:50 with uncommitted work while background evidence runs were still executing. Reason: Claude CLI completed its single-prompt turn expecting an asynchronous callback notification ("I don't need a monitor here: the background evidence run will notify me when it finishes..."). Coordinator waited for all background node test runs to complete, then relaunched the worker via `resume_lane_h.ps1` as `task-35727` (PID 21660) at 23:25.
- **Lane A (Claude / Fable):** WG.00.08 Merged into `main` (`0f7f26cd`), but WG.00.08 stays in `REVIEW` per Directive 001-H sec 2 until Grok verifier commits PASS, DEC-001 is recorded, and PM signs off.
- **Lane B (Claude / Fable):** WG.00.11 Merged into `main` (`8c0c210c`). Hardening suite verified passing (counts superseded by Lane G).
- **Lane C1 (Claude CLI):** WG.00.12 Merged into `main` (`e07c86ea`). Backup infrastructure verified.
- **Lane C2 (Claude CLI):** WG.00.12 Merged into `main` (`83bcc1a7`). Machine governance checker verified (88/88 checks pass, 22 mutants killed). Hook installation held until Grok passes Lane C2b AND Lane E merges, per Directive 001-I §C.
- **Lane C3 (Claude CLI):** WG.00.12 Merged into `main` (`8db39b0b`). ADR-002 Rev 2 (uf.hex canonical for runtime) PROPOSED, awaiting Grok review; not yet accepted.
- **Lane D (Grok PM):** Adversarial review delivered (verdicts recorded).
- **Lane E (Grok Writer / Claude Reviewer):** WG.00.09 Follow-up: Grok revision (`5964f772`) diff-reviewed by Claude across full diff `710fa095..5964f772` (`6a71a4c4`). Verdict: **CHANGES REQUESTED** (0 blocker, 0 major, 2 minor: N5, N6). Findings N2, N4 resolved, N3 resolved as asked, N1 partly resolved (carried into N5). Grok writer to fold in N5 and N6.
- **Lane F (Claude CLI):** WG.00.12 Merged into `main` (`d09a1295`). 8-test post-F suite all passed with EXIT=0. Pushed to `origin`.
- **Lane G (Claude CLI):** WG.00.11 Merged into `main` (`da2c16b2`). Provenance: coordinator re-ran in lane-g worktree; PM reproduced exit 0 on lane-g and on merged main da2c16b2 (30/30 gating checks pass, 15 mutants caught, world_age 29/29 pass, carrying capacity 23/23 pass).
- **Lane H (Claude / Fable):** WG.00.08 Fresh Z-2 cut proof (`tools/test_generated_z2_cut_proof.js`) per Directive 001-I sec B. Committed `c8694f01` and pushed to `origin/task/lane-h`. Baseline 12/12 pass (exit 0), 8/8 mutants exit 1 (including `floating_slab_left`). Claude claims proof hardened and fluid ruling aligned; Grok verification pending.
- **Lane C2b (Claude):** WG.00.12 Governance hardener (`tools/governance/check_claims.js`) per Directive 001-I sec C. Worktree `lane-c2b`.

---

## 2. Active Parallel Work Lanes (DEUS Directive 001-K)

| Lane | Objective & WBS ID | Provider / Model | Worker Task ID & Branch | Worktree Path | Last Output / mtime | Current Gate & Status |
|---|---|---|---|---|---|---|
| **Lane A** | **WG.00.08 Exit Criteria** (`WG.00.08`) | Claude CLI (Fable) / `claude-opus-5-5` | Merged `0f7f26cd`<br>`task/lane-a` | `C:\Users\snewt\.deus_worktrees\lane-a` | 2026-09-25 18:31:09 | **STATUS: MERGED / REVIEW HELD.**<br>• Grok verifier PASS (`16fec107`) is on task/lane-a only, not on main, and covers the 28-mutant roster only. WG.00.08 stays in REVIEW. |
| **Lane B** | **ATK-YEAR0-001 Hardening** (`WG.00.11`) | Claude CLI (Fable) / `claude-opus-5-5` | Merged `8c0c210c`<br>`task/lane-b` | `C:\Users\snewt\.deus_worktrees\lane-b` | 2026-09-25 16:52:25 | **STATUS: INTEGRATED TO MAIN.**<br>• Test counts superseded by Lane G (30 gating / 15 mutants). Merged to main and pushed to origin. |
| **Lane C1** | **Consolidation Infrastructure** (`WG.00.12`) | Claude CLI (Codex failover) / `claude-opus-5-5` | Merged `e07c86ea`<br>`task/lane-c1` | `C:\Users\snewt\.deus_worktrees\lane-c1` | 2026-09-25 16:52:25 | **STATUS: INTEGRATED TO MAIN.**<br>• Authored `tools/backup_project.ps1`. Merged to main and pushed to origin. |
| **Lane C2** | **Governance check_claims.js** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | Merged `83bcc1a7`<br>`task/lane-c2` | `C:\Users\snewt\.deus_worktrees\lane-c2` | 2026-09-25 17:02:39 | **STATUS: INTEGRATED TO MAIN.**<br>• Hardening against PM attack assigned to Lane C2b. |
| **Lane C2b** | **Governance Hardening** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | `task-35427` (PID 7264)<br>`task/lane-c2b` | `C:\Users\snewt\.deus_worktrees\lane-c2b` | Active | **STATUS: ACTIVE WRITER.**<br>• Hardening check_claims.js against PM attack per Directive 001-I sec C. |
| **Lane C3** | **Palette ADR Revision & Review** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | Merged `8db39b0b`<br>`task/lane-c3` | `C:\Users\snewt\.deus_worktrees\lane-c3` | 2026-09-25 16:54:51 | **STATUS: INTEGRATED TO MAIN.**<br>• ADR-002 Rev 2 (uf.hex canonical for runtime) PROPOSED, awaiting Grok review; not yet accepted. Merged to main and pushed to origin. |
| **Lane D** | **Adversarial Review** | Grok (PM instance) / `grok-4.7` | Via Owner | Main checkout | 2026-09-25 16:48:00 | **STATUS: DELIVERED.**<br>• ATK-19B-001 CLOSED; ATK-19B-002 KEEP OPEN (F2); ATK-YEAR0-001 KEEP OPEN (F1); WG.00.08 stays REVIEW. |
| **Lane E** | **WG.00.09 DEFINE / PRE-ATTACK** (`WG.00.09`) | Grok CLI (Writer) / Claude (Reviewer) | `task-35960` (PID 25240)<br>`task/lane-e` (pushed `6a71a4c4`) | `C:\Users\snewt\.deus_worktrees\lane-e` | Active | **STATUS: ACTIVE WRITER.**<br>• Grok writer launched to fold in N5 and N6 review findings into attack plan per Directive 001-M §2. |
| **Lane F** | **OneDrive-Link Migration Prep** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | Merged `d09a1295`<br>`task/lane-f` | `C:\Users\snewt\.deus_worktrees\lane-f` | 2026-09-25 16:52:09 | **STATUS: INTEGRATED TO MAIN.**<br>• Post-F test suite 8/8 EXIT=0; pushed to origin. |
| **Lane G** | **ATK-YEAR0-002 Runtime Fix & Test Maint** (`WG.00.11`) | Claude CLI / `claude-opus-5-5` | Merged `da2c16b2`<br>`task/lane-g` | `C:\Users\snewt\.deus_worktrees\lane-g` | 2026-09-25 17:50:51 | **STATUS: INTEGRATED TO MAIN.**<br>• Runtime Year 0 integrated. |
| **Lane H** | **Z-2 Cut Proof & Fluid Hardening** (`WG.00.08`) | Claude CLI (Writer) / Grok (Verifier) | Merged `9acdee8a`<br>`task/lane-h` | `C:\Users\snewt\.deus_worktrees\lane-h` | 2026-09-26 00:00:58 | **STATUS: REVIEWED-PASS-WITH-MINORS / MERGED.**<br>• Merged into main per PM sign-off 0016-P (`9acdee8a`). Baseline 12/12 exits 0 on main. Grok verifier PID 24140 still active in background. |
| **Lane I** | **Merge Gate CLI & Self-Tests** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | `task-36035` (PID 10576)<br>`task/lane-i` (pushed `4d731c6e`) | `C:\Users\snewt\.deus_worktrees\lane-i` | Active | **STATUS: ACTIVE WRITER.**<br>• Implementing `tools/governance/merge_gate.js`, `test_merge_gate.js`, `MERGE_GATE.md` per Directive 001-N §1. |
| **Lane J** | **Standard Worker Launcher & Pre-Push Guard** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | `task-36037` (PID 2684)<br>`task/lane-j` (pushed `dac855a2`) | `C:\Users\snewt\.deus_worktrees\lane-j` | Active | **STATUS: ACTIVE WRITER.**<br>• Implementing `tools/ops/launch_worker.ps1`, `gate_tests.json`, `resume_queue.ps1` per Directive 001-N §2. |

---

## 3. Strict File-Ownership Matrix (No Overlapping Write Sets)

### Active Writers & Lanes
| Lane / Owner | Exclusive File Whitelist (Full Paths) | Access Policy |
|---|---|---|
| **Gemini (Coordinator)** | `docs/STATUS.md`<br>`docs/archive/STATUS_LEDGER_*.md`<br>`docs/WORK_QUEUE.md`<br>`docs/MODEL_AVAILABILITY.md`<br>`docs/telemetry/sessions/active_workers.json`<br>`docs/worldgen/DEUS_WORLDGEN_WBS.md`<br>`docs/art/DEUS_WORLD_WBS.md`<br>`docs/OWNER_DECISIONS.md` (entries only)<br>`tasks/WG.00.08/defects.jsonl` (append-only)<br>`C:\Users\snewt\.deus_pm\outbox\*` | **Exclusive Writer.** WBS coordination, integration authority, pulse reports, baseline records. Zero engine code. |
| **Lane C2b (Claude)** | `tools/governance/check_claims.js`<br>`tools/governance/test_check_claims.js`<br>`tasks/WG.00.12/c2_governance_state.md` | **Exclusive Writer (Worktree lane-c2b).** Governance checker hardening per Directive 001-I sec C. |
| **Lane E (Grok Writer / Claude Reviewer)** | `docs/systems/UF_Depth_Attack_Plan.md` (attack plan (Grok) — spec authority pending PM ruling)<br>`tasks/DEUS-TSK-FABLE-19C/*` | **Exclusive Writer (Worktree lane-e).** Depth renderer attack plan revision (Grok) and re-review (Claude). |
| **Lane I (Claude Writer / Grok Reviewer)** | `tools/governance/merge_gate.js`<br>`tools/governance/test_merge_gate.js`<br>`tools/governance/MERGE_GATE.md`<br>`tasks/WG.00.12/lane-i/**` | **Exclusive Writer (Worktree lane-i).** Automated merge gate implementation per 001-N §1. |
| **Lane J (Claude Writer / Grok Reviewer)** | `tools/ops/launch_worker.ps1`<br>`tools/ops/gate_tests.json`<br>`tools/ops/hooks/pre-push`<br>`tools/ops/install_lane_hooks.ps1`<br>`tools/ops/test_launch_worker.ps1`<br>`tools/ops/README.md`<br>`tools/ops/resume_queue.ps1`<br>`tools/ops/test_resume_queue.ps1`<br>`tasks/WG.00.12/lane-j/**` | **Exclusive Writer (Worktree lane-j).** Standard launcher & operational hooks per 001-N §2. |
| **Lane S (Claude Writer / Grok Reviewer)** | `art/catalogue/**`<br>`docs/art/catalogue/**`<br>`tools/art/build_catalogue.js`<br>`tools/art/test_catalogue.js`<br>`tools/art/fixtures/catalogue/**`<br>`tasks/WG.20.02/lane-s/**` | **Exclusive Writer (Worktree lane-s).** WG.20.02 art catalogue. NO ART GENERATION. PM-launched 2026-09-26 (0028-AC Ã‚Â§2.3). |
| **Lane T (Claude Writer / Grok Reviewer)** | `tools/art/make_blank_templates.js`<br>`tools/art/test_blank_templates.js`<br>`tools/art/fixtures/templates/**`<br>`art/templates/**`<br>`tasks/WG.32.02/lane-t/**` | **Exclusive Writer (Worktree lane-t).** WG.32.02 blank template tilesets. NO ART GENERATION. PM-launched 2026-09-26. |
| **Lane U (Claude Writer / Grok Reviewer)** | `tools/art/place_art.js`<br>`tools/art/validate_art.js`<br>`tools/art/test_place_art.js`<br>`tools/art/fixtures/place/**`<br>`docs/art/APPROVALS_FORMAT.md`<br>`tasks/WG.41.01/lane-u/**` | **Exclusive Writer (Worktree lane-u).** WG.41.01 placement and validation tooling. NO ART GENERATION. PM-launched 2026-09-26. |
| **Lane P (Claude Writer / Grok Reviewer)** | `docs/audits/SRD_SPELL_EFFECT_AUDIT.md`<br>`docs/audits/srd_spell_effect_audit.json`<br>`tasks/SIM.60.01/lane-p/**` | **Exclusive Writer (Worktree lane-p).** SIM.60.01 SRD spell-effect audit (design only). PM-launched 2026-09-26. |
| **Lane N review (Grok Reviewer)** | `tasks/SIM.00.00/lane-n/review_grok_2f2a1ff2.md` | **Review file only (Worktree lane-n).** Independent review of Lane N writer tip 2f2a1ff2. PM-launched 2026-09-26. |
| **Lane M Rev 3 (Claude Writer / Grok Reviewer)** | `docs/adr/ADR-003_sim_render_split_and_lod.md`<br>`docs/adr/README.md`<br>`tasks/SIM.00.01/lane-m/**` (except `review_grok_*.md`) | **Exclusive Writer (Worktree lane-m).** SIM.00.01 ADR-003 Rev 3 after Grok FAIL (review_grok_c456cb73.md). PM-relaunched 2026-09-26. |

### Retired Lanes: Write Access Revoked
- **Lane A (Claude / Fable):** Merged to `main` (`0f7f26cd`). Write access revoked.
- **Lane B (Claude / Fable):** Merged to `main` (`8c0c210c`). Write access revoked.
- **Lane C1 (Claude CLI):** Merged to `main` (`e07c86ea`). Write access revoked.
- **Lane C2 (Claude CLI):** Merged to `main` (`83bcc1a7`). Write access revoked.
- **Lane C3 (Claude CLI):** Merged to `main` (`8db39b0b`). Write access revoked.
- **Lane D (Grok):** Delivered. Write access revoked.
- **Lane F (Claude CLI):** Merged to `main` (`d09a1295`). Write access revoked.
- **Lane G (Claude CLI):** Merged to `main` (`da2c16b2`). Write access revoked.
- **Lane H (Claude / Fable):** Merged to `main` (`9acdee8a`). Write access revoked.

### Frozen / Read-Only Paths
- `C:\Dev\DEUS`
- `game/js/plugins/DEUS_Levels.js`
- `game/js/plugins/DEUS_World.js`
- `game/js/plugins/DEUS_WorldGen.js`
- `game/js/plugins/DEUS_Fluid.js`
- `game/js/rmmz_*.js`

---

## 4. Open Defects & Blockers

| Defect / Finding ID | Task / WBS | Severity | Title & Requirement | Status | Owner |
|---|---|:---:|---|:---:|:---:|
| **BLOCKER-BACKUP** | `WG.00.12` | `BLOCKER` | Migration to `C:\Dev\DEUS` backup requirement: private GitHub remote live (DEC-005), `game/img` fully whitelisted, `game/data/df_*.json` tracked, all branches pushed to origin, PM clone-verified, and untracked essentials zipped (`C:\Users\snewt\DEUS_backups\deus_untracked_2026-09-25.zip`, SHA256 D3A49004…C0CD1). | `RESOLVED` (closedBy: PM Grok Bot, clone-verified 2026-09-25, pending Owner off-disk copy of zip) | Owner / PM Grok Bot |
| **TRIAGE-SCRATCH-TEMP** | `ENGINEERING` | `MINOR` | Five old scratch worktrees under `%LOCALAPPDATA%\Temp\claude\` (wt13, wt14, wt16, wt18, wt19b) hold unbacked uncommitted edits (including `DEUS_DeathForensics.js`). Do not clean Temp until Owner triage. | `OPEN` | Owner |
| **ATK-19B-001** | `WG.00.08` | `MAJOR` | continuousAirHeight counts fluid strata as open air clearance. | `CLOSED` | Grok (verified on `2e4571a`) |
| **ATK-19B-002** | `WG.00.08` | `MAJOR` | Shafts and skylights carve rock below fluid. Skylight fix verified, but shaft guard (`DEUS_Levels.js:2498`) untested (F2); rock under shaft plants must be recorded & `shaft_prescan_removed` caught. | `OPEN` (Review F2) | Lane H / Grok |
| **ATK-YEAR0-001** | `WG.00.11` | `MAJOR` | Standard New Game defaults to Year 1; INV-SIM-01 requires World Year 0. Edge-case hardening committed in Lane B (`37ac57da`). | `OPEN` (Awaiting Grok Signoff) | Lane B / Grok |
| **ATK-YEAR0-002** | `WG.00.11` | `MAJOR` | Standard New Game Year 0 runs clock, history, and first save at Year 1. Core `|| 1` -> `?? 0`, History startYear 0, Demographics startYear 0. Assigned to Lane G. | `FIX_READY` (Lane G merged da2c16b2, awaiting Grok closure) | Lane G / Grok |
| **A10-1** | `WG.00.08` | `MAJOR` | Native playtest proof of Z-2 ravine cut. DEC-001 accepted in principle; merged into main per Directive 0016-P. | `REVIEWED-PASS-WITH-MINORS` | Owner / Grok |
| **DEF-COORD-INJECT-01** | `WG.00.11` | `MAJOR` | Coordinator output file overwrite at 17:13:55 logged as DEF-COORD-INJECT-01. | `OPEN` | Coordinator |
| **DEF-COORD-BOARD-HASH-01** | `GOVERNANCE` | `MINOR` | Coordinator board reported non-existent hash for lane-b as 100% match; boards must paste raw command output. | `OPEN` | Coordinator |
| **DEF-COORD-EMPTY-BOARD-01** | `GOVERNANCE` | `MINOR` | Outbox boards 2307, 2317, 2325 created as 0-byte files; temp-write-then-move pattern enforced. | `OPEN` | Coordinator |
| **DEF-COORD-MERGE-01** | `WG.00.08` | `MAJOR` | Lane A merged 0f7f26cd (22:45:24) before Grok verification 16fec107 (22:49:10); earlier a1d02927 merged then undone by git reset --hard da2c16b2. | `OPEN` | PM / Coordinator |
| **DEF-COORD-CLOSE-01** | `WG.00.08` | `MAJOR` | 31676cf1 marked WG.00.08 DONE 11 min after fix 2e4571a6 with no committed review. | `OPEN` | PM / Coordinator |
| **DEF-COORD-EXIT-01** | `WG.00.12` | `MINOR` | Four 22:46 test runs captured $LASTEXITCODE inside powershell.exe -Command. | `OPEN` | PM / Coordinator |
| **DEF-OPS-LOG-01** | `WG.00.12` | `MINOR` | Claude -p launches without redirect left task logs at 0 bytes (task-35425, task-35427); run_lane_a_grok.ps1, run_lane_c3.ps1, run_review_8d1c7c37.ps1 and lane-c3\BRIEF.md are 0 bytes. | `OPEN` | PM / Coordinator |
| **DEF-COORD-BOARD-HASH-02** | `GOVERNANCE` | `MINOR` | Board 2026-09-25_2340 lists task/lane-c1 = 4f346b9a and task/lane-c2 = e99da6f2 in sync with origin (EXIT=128 on git cat-file); lists lane-c3 70dad277 as in sync while origin/task/lane-c3 = 048752c8. | `OPEN` | PM / Coordinator |
| **DEF-COORD-BOARD-HASH-03** | `GOVERNANCE` | `MINOR` | Board 2026-09-26_0104 published non-existent full SHA for Lane I tip (`a0183d684e20...` instead of real `a0183d68ad21...`); boards must use only git rev-parse output. | `OPEN` | Coordinator |
| **DEF-COORD-LAUNCH-PROMPT-01** | `GOVERNANCE` | `MAJOR` | Launch-prompt commits landed on live lane branches instead of out-of-band/main. Root cause: `run_review_lane_*.ps1` and `run_lane_*.ps1` committed prompt files directly to lane worktrees before launching workers. Remedied: prompts stored out-of-band in `logs/` or on `main`; new authority split transfers launching/merging to PM. | `OPEN` | Coordinator |
| **DEF-COORD-INBOX-01** | `GOVERNANCE` | `MINOR` | Board 2026-09-26_0129 claimed inbox was empty when `0025-Z.md` was present since 01:21:59 CT. Root cause: outbox board did not cite live `Get-ChildItem inbox -File`. | `OPEN` | Coordinator |
| **DEF-COORD-TIPS-01** | `GOVERNANCE` | `MINOR` | Board 2026-09-26_0129 listed stale tips for Lanes K and N without reporting worktree HEAD and unpushed status. Enforced: worktree HEAD and origin/<branch> must both be cited with UNPUSHED flag when differing. | `OPEN` | Coordinator |
| **DEF-COORD-MERGE-WORDING-01** | `GOVERNANCE` | `INFO` | Board wording implied merges ready without reflecting active PM merge holds on Lanes J, C2b, I. Enforced: explicit merge hold status until mailbox sign-off. | `OPEN` | Coordinator |
| **DEF-Z2-PROOF-LEDGE-01** | `WG.00.08` | `MINOR` | no_floating_solids checks connectivity to bedrock/edge, not support; single stone ledge attached to wall passes. Queued as DEC-010. | `OPEN` | PM |
| **DEF-Z2-PROOF-FLUIDPATH-01** | `WG.00.08` | `MINOR` | seed 18 ravine holds no natural fluid; fluid-skip path exercised only through 6 test-planted water columns. | `OPEN` | PM |
| **DEF-Z2-PROOF-PLAN-01** | `WG.00.08` | `MINOR` | footprint compares carve to engine own plan; plan errors caught only by target-column and column-count checks. | `OPEN` | PM |
| **DEF-Z2-PROOF-SEED-01** | `WG.00.08` | `INFO` | SEED/TX/TY hardcoded at test line 82; add --seed/--site option in a later pass. | `OPEN` | PM |
| **DEF-COORD-WIPE-02** | `GOVERNANCE` | `MINOR` | PM temp clone at AppData\Local\Temp\verify_h emptied around 23:39 CT by unknown external process. | `OPEN` | Coordinator / PM |
| **MACHINE-STABILITY** | `HARDWARE` | `MAJOR` | 7 unexpected shutdowns 2026-09-25; Event 6008 at 00:14, 09:17, 12:15, 13:48, 14:13, 14:32, 17:19; Owner investigating; post-crash tripwire active. | `OPEN` | Owner |
| **SCRATCH-SALVAGE** | `OPERATIONS` | `INFO` | Uncommitted scratch worktrees salvaged to salvage/* branches on origin per Directive 001-N §4 (unreviewed). Temp worktrees removed. | `OPEN` | PM / Owner |
| **DUAL-MAILBOX** | `GOVERNANCE` | `INFO` | docs/agents/mailboxes and tools/agents/bus.js are frozen; C:\Users\snewt\.deus_pm is authoritative. | `OPEN` | PM / Coordinator |
| **LANES I/J** | `WG.00.12` | `INFO` | Automated merge gate (Lane I) and standard worker launcher / pre-push guard (Lane J) active per Directive 001-N. | `OPEN` | Claude / Grok |

---

## 5. Model Availability & Failover State
- **Claude / Fable:** `AVAILABLE` (Active writer on Lane H proof hardening and Lane C2b governance hardening).
- **Grok:** `AVAILABLE` (Active writer on Lane E N1–N4/N5–N6 attack plan; queued adversarial verifier for Lane H and Lane C2b).
- **Grok Bot:** `PM` (Directives, independent verification sign-off, mailbox authority).
- **OpenAI Codex:** `EXHAUSTED` (Usage exhausted; reset time unknown).
- **Gemini / Antigravity:** `AVAILABLE` (Coordinator & integration authority only; zero self-certification; writes only its governance set).


---

## Stand-ins (U7-derived files: unused by the catalog since 2026-09-19; dev only, never committed, deleted before release; AGENTS rule 8)
**Placeholders are stock RPG Maker MZ art** (VISION V9, user 2026-09-19: "stock is fine"; the U7 files lean and clash with the flat HD FF6 look). Checked 2026-09-19 by Claude Code: no image, tile, people image or tier in `game/data/UF_WorldCatalog.json` names a U7 file or a U7-derived file without the prefix (grep, and the inventory check `catalog_no_standins`). What the catalog draws instead:
1. Units (wildlife, faction people, the start pair and its clothing tiers): `$UF_Stock_<Sheet>_<i>` sheets, one character cut out of a stock 8-character sheet (People1–4, Actor1–3, Nature, Monster, Evil, Vehicle, SF_*), or `$UF_Stock_BigMonster1_r1` (one row of `$BigMonster1`, always facing the viewer). Made by **`tools/extract_stock_characters.js`**; `--check --alias "$Adam=People1_4,$Eve=People1_5"` verifies all 52 against the RMMZ install's stock sheets (RESULT PASS, 2026-09-19). The same tool's `--alias` wrote stock People1 characters 4 and 5 over `$Adam.png` and `$Eve.png`, which UF_Colonists hard-codes for grown colonists without tier sheets (the UF_Anim and UF_Combat tests name `$Adam` too); the U7 originals are kept beside them as `.u7bak.png`. Their `.json` sidecars still name SHAPES.VGA 458 / 452 (the frame geometry, 48×48 with facings S W E N, still fits).
2. Items: `!$UF_Icon_<n>` sheets, stock IconSet icons cut by **`tools/extract_stock_icons.js`** (`--check`: 37 of 37 match), and Gemini's own `!$UF_Item_*` drawings for log, stone, iron and copper ore, berries, straw and meat.
3. Objects: stock `Outside_B` / `Outside_C` / `Inside_C` tiles with tints, `!Door1`, the wall sets, and Gemini's own flat `!$UF_*` drawings (berry bush, fern, campfire, rubble, straw bed, work stone, furnace, smithy).
`tools/generate_asset_inventory.js` counts the two tools' cuts as stock RMMZ only after comparing their pixels with the stock source (check `stock_cuts_verified`).

**Not swapped yet: the catalog swap does not reach three places** (checked 2026-09-19 11:20 by Claude Code with `tools/generate_asset_inventory.js`, which since then also reads the RMMZ editor data; its checks `runtime_no_standins` and `rmmz_data_no_standins` FAIL until these change):
1. Drawn in play by plugin code: `U7_Faces` (UF_Dialogue 271, the portrait of the old keyword dialogue; UF_Gumps 215, the paperdoll, which the I key opens on the map per UF_Gumps 347–352 with EnablePaperdoll "true"; read from the code, not tried in play) and the four container backgrounds `u7_gump_chest`, `u7_gump_barrel`, `u7_gump_backpack`, `u7_gump_sack` (UF_Gumps 104–108, when an event with a container note or the OpenContainer command opens one). Both plugins are enabled in plugins.js. Needs a code change (a stock face sheet such as `People1` in place of `U7_Faces`, a plain or code-drawn container window in place of the gumps), which waits until game/js may be edited again.
2. The RMMZ editor data: Actors.json actors 2–9 (face `U7_Faces` 0–7; map sprites `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith` for actors 2, 5 and 8), Map001 "The Bastion of Kraghold" (6 event pages: `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith`, `$U7_Goblin`) and Map002 "The Glade of Genesis" (336 event pages: `!$PineTree`, `!$GraniteBoulder`, `!$IronstoneDeposit`, `!$BerryBush`, `!$TimberOak`, `!$FruitTree`, `!$Campfire`). Not drawn in a new game as far as checked (the party is actor 1 only, with no face or sprite, System.json; UF_ColonyOverseer 141–142 turns the menu off; UF_World starts a new game in a generated area, map 1000, because StartInWorld defaults to true and StartTemplateMapId to 0; the only transfers in the plugins go to generated areas, UF_World 1617 and 1703, and no map event or common event has a Transfer Player command), but the editor shows them. Changing them edits editor-managed files, so the editor must be closed first.
3. Test-suite fixtures (listed per line below): a code change in each plugin's UF.Test.suite block. The UF_Look suite also expects the oak to draw `!$TimberOak` and the savanna tree `!$U7_Flat-toptree` (UF_Look 546 and 555–560), which the catalog no longer does.

`game/img/system/Window.png` (the skin of every window) is not a stand-in: `buildU7WindowSkin` in tools/generate_all_u7_assets.js (lines 361–477) draws it from fixed colours and arithmetic, with no SHAPES.VGA data; rebuilt from that code 2026-09-19 and compared: 0 of 36,864 pixels differ. `U7_Window.png` is a byte copy the same tool made (line 586) and counts as a stand-in by its name only. The inventory therefore classes Window.png as original (AR-033).

The U7 files below stay on disk (never committed) and nothing in the catalog draws them. The inventory tool reads this list: every backticked file on a bullet line counts as a U7 stand-in wherever it is used, so U7-derived files without the prefix must be named here. Format: `- <files> | source | what still names them`.
- People: every `$U7_*` person sheet (`$U7_Adam*`, `$U7_Eve*`, `$U7_Townsman.png`, `$U7_Townswoman.png`, `$U7_Guard.png`, `$U7_Ranger.png`, `$U7_Goblin.png`, `$U7_Orc.png`, `$U7_Gnome.png`, `$U7_DwarfGuard.png`, `$U7_Miner.png`, `$U7_Blacksmith.png`, `$U7_Fighter*`, `$U7_Automaton.png` and the rest), and without the prefix `$Adam.u7bak.png`, `$Eve.u7bak.png` (the U7 files that were $Adam.png and $Eve.png, byte-identical to each other) and `$People1.png` | SHAPES.VGA 458 / 452 (Adam, Eve, tiers 0–2), 462 / 463 (tier 3), 720 (guard), 265 (townsman, `$People1.png`), 460 (ranger); 3×, E/W transposed | RMMZ editor data (not drawn in play, see above): `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith` (Actors.json actors 2, 5, 8 and Map001 events), `$U7_Goblin` (a Map001 event); test suites (grep of game/js/plugins at 11:20): `$U7_Townsman`, `$U7_Ranger`, `$U7_Guard`, `$U7_Goblin` (UF_Factions, UF_Fire, UF_Interact, UF_Items, UF_Jobs, UF_Look, UF_Objects, UF_Roads, UF_Skills, UF_Stance, UF_Talk fallback, UF_TimeSpeed, UF_Wildlife, UF_World), `$People1` (UF_Floors 457)
- Creatures: every `$U7_*` creature sheet (`$U7_Deer.png`, `$U7_Wolf.png`, `$U7_Dog.png`, `$U7_Hare.png`, `$U7_Fox.png`, `$U7_Horse.png`, `$U7_Sheep.png`, `$U7_Ox.png`, `$U7_Aurochs.png`, `$U7_Chicken.png`, `$U7_WildBird.png`, `$U7_Hawk.png`, `$U7_Rat.png`, `$U7_Bat.png`, `$U7_CaveBat.png`, `$U7_Serpent.png`, `$U7_Snake.png`, `$U7_Cat.png`, `$U7_Spider.png`, `$U7_CaveSpider.png`, `$U7_CaveCrawler.png`, `$U7_CaveLurker.png`, `$U7_Troll.png`, `$U7_BogHorror.png`, `$U7_Skeleton.png`) | SHAPES.VGA 811, 498, 716, 523, 970, 537, 510, 496, 495, 555, 865, 493, 530, 502, 500, 727 and others, 3×, E/W transposed (AR-401 to AR-403) | test suites only: `$U7_Hare` (UF_Colonists, UF_Doors, UF_Interact, UF_Jobs, UF_Stance, UF_Talk fallback), `$U7_Troll` (UF_Stance). The combat rewrite of 2026-09-19 (UF_Combat.js, 10:59) draws spawned hostiles from the catalog species image, no longer `$U7_Wolf` / `$U7_CaveSpider`
- Objects without the prefix: `!$TimberOak.png`, `!$PineTree.png`, `!$FruitTree.png`, `!$BirchTree.png`, `!$SwampTree.png`, `!$DeadTree.png`, `!$TreeStump.png`, `!$BerryBush.png`, `!$WildShrub.png`, `!$TallGrass.png`, `!$Reeds.png`, `!$Wildflowers.png`, `!$GraniteBoulder.png`, `!$IronstoneDeposit.png`, `!$CaveBoulder.png`, `!$LooseStones.png`, `!$CrystalCluster.png`, `!$IronOreVein.png`, `!$CaveMouth.png`, `!$CaveLadder.png`, `!$FallenPillar.png`, `!$OldBones.png`, `!$StrawBed.png`, `!$WallStone.png`, `!$WallWood.png`, `!$Campfire.png` | SHAPES.VGA shapes 181, 306, 328, 310, 332, 325, 313, 672, 619, 321, 323, 314, 342, 341, 343, 353, 747, 916, 389, 705, 360, 650, 683, 365, 362, 739 (each file's sidecar `standInSource`), 3× | RMMZ editor data (not drawn in play, see above): Map002 events, 336 pages (`!$GraniteBoulder` 85, `!$PineTree` 82, `!$IronstoneDeposit` 64, `!$BerryBush` 57, `!$TimberOak` 46, `!$FruitTree` 1, `!$Campfire` 1); test suites: `!$TimberOak` (UF_Look 546, 562–566)
- Objects with the prefix: every `!$U7_*` object sheet (`!$U7_TimberOak.png`, `!$U7_PineTree.png`, `!$U7_FruitTree.png`, `!$U7_Flat-toptree.png`, `!$U7_Broadleafgiant.png`, `!$U7_Swamptree.png`, `!$U7_Deadtree.png`, `!$U7_TreeStump.png`, `!$U7_Shrub.png`, `!$U7_TallGrass.png`, `!$U7_Reeds.png`, `!$U7_Wildflowers.png`, `!$U7_LooseStones.png`, `!$U7_Gravel.png`, `!$U7_GraniteBoulder.png`, `!$U7_CaveBoulder.png`, `!$U7_MalachiteOutcrop.png`, `!$U7_GoldVeinOutcrop.png`, `!$U7_IronOreVein.png`, `!$U7_CrystalSpire.png`, `!$U7_SmallCrystals.png`, `!$U7_OldBones.png`, `!$U7_FallenPillar.png`, `!$U7_StrawBed.png`, `!$U7_WallStone.png`, `!$U7_WallWood.png`, `!$U7_CaveMouth.png`, `!$U7_CaveLadder.png`) | SHAPES.VGA, 3×, collision-aligned anchors (AR-021 to AR-023, AR-044, AR-102, AR-103) | test suites only: `!$U7_Flat-toptree` (UF_Look 555, 560), `!$U7_Shrub` (UF_Look 564)
- Items: the 23 `!$U7_Item_*.png` sheets (WoodLog, Firewood, RoughStone, IronOre, LeadOre, Blackrock, GoldNugget, MetalBar, RoughGem, CutGem, PlantFiber, WoolFleece, StrawBundle, SeedPouch, WildBerries, TreeFruit, CaveMushroom, RootVegetable, RawMeat, HaunchMeat, RiverFish, AnimalBone, LeatherHide), and without the prefix `!$UF_Item_Firewood.png`, `!$UF_Item_Fish.png` (byte-identical to U7 item sheets) | SHAPES.VGA item shapes, 3× (AR-200) | nothing
- Ground: `game/img/tilesets/U7_Ground_A1.png`, `U7_Ground_A2.png`, `U7_Outside_A1.png`, `U7_Outside_A2.png`, `U7_Dungeon_A1.png`, `U7_Dungeon_A2.png`, `U7_Fortress_B.png`, `U7_Glade_B.png` | SHAPES.VGA flat shapes 4, 23, 5 and others, 3× (AR-001) | nothing (the catalog's tileset is the code-drawn UF_GenGround_A2 with stock Outside_A1, Outside_B and Outside_C)
- UI still drawn in play: `game/img/faces/U7_Faces.png` (8 portraits), `game/img/system/u7_gump_*.png` (container gumps; `gump_test.png`, `gump_backpack.png`, `gump_barrel.png`, `gump_sack.png` below are byte copies) | FACES.VGA and GUMPS.VGA shapes 0, 1, 2, 5, by tools/extract_u7_assets.ps1 (lines 83–180) | drawn in play: UF_Dialogue 271 and UF_Gumps 215 (faces), UF_Gumps 104–108 (gumps); RMMZ editor data: Actors.json faces of actors 2–9. Not swapped: a code change, see above
- UI and other extractions, unused: `game/img/system/U7_Window.png`, `U7_Cursor.png`, `U7_Select.png`, `U7_Pointer.png`, `U7_HandPointer.png`, `game/img/system/u7_gumps/`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png` | earlier extraction, sources not recorded | nothing

## Backlog (not scheduled)
- AUDIT_LOG A10-3 (level -1's natural objects do not survive a load and land on dug floors) and A10-4 (level -1's flood grid floods solid rock): both before 19A, found by the 19A native smoke.
- V132 (user, 2026-09-24): racial spawn levels at world generation (Z-2 tiefling, dragonborn; Z-1 dwarf, gnome; Z0 human, half-orc; Z+1 halfling, half-elf; Z+2 elf), initial anchors only. `DEUS_Factions.js` `getZForSpecies` and the catalog layer lists still follow the 2026-09-22 rule (everyone else on Z0). Queued after the FABLE-19A gate; needs an assignment (DEUS_Factions / catalog / History placement).
- "DEUS — DEPTH VISUAL TUNING BRIEF" (user, 2026-09-24; VISION decision log): 5 ft per level, H = 120 ft with 160 / 90 ft presets, 4 % colour steps per level, blur off, screenshots of 3–5 visible levels. Queued behind 19A; depths 3–4 need 19B geometry and the 19C compositor.
- Wildlife standing inside hills (23 animals on the ground's solid hill cells at seed 20260923, the same on 2d5fc47): placement or roaming ignores the ground's column shapes.
