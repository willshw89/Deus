# DEUS — OWNER DECISIONS LOG
**Status:** CANONICAL & BINDING  
**Authority:** Owner Directive 001 (2026-09-25)  
**Rule:** Nothing in Project DEUS waits on Owner input unless it is explicitly logged as an open entry in this file.

---

## 1. Decision Schema

Every decision item recorded in this log must provide:
- **Decision ID:** Stable identifier (e.g. `DEC-001`)
- **Date Logged:** ISO date (`YYYY-MM-DD`)
- **Question:** Concrete, unambiguous question requiring Owner ruling
- **Options:** Distinct, enumerated options
- **Recommended Default:** The engineering/architecture team's recommended choice
- **What Happens If Unanswered:** Safe default fallback behavior if no active decision is given within window
- **Status:** `OPEN` | `DECIDED`
- **Owner Ruling & Date:** Recorded upon Owner response

---

## 2. Seeded Decisions

### Decision `DEC-001`: Native Playtest Proof Requirement for A10-1 (WG.00.08)
- **Date Logged:** 2026-09-25
- **Question:** Does the Owner require an interactive human RMMZ editor Playtest (F5) inspection of a natural Z-2 ravine cut before WG.00.08 returns to `DONE`, or is the automated NW.js headless protocol plus the rendered 512×512 PNG proof (`game/test_output/z2_cut_proof_seed18_194_89.png`) sufficient?
- **Options:**
  1. Automated headless NW.js run + rendered 2D visual map proof is sufficient for gate closure.
  2. Owner must personally launch RMMZ editor (F5) and observe a Z-2 cut on Seed 18 before closure.
- **Recommended Default:** Option 1 (Automated NW.js test + rendered map proof) for automated gate closure, with Option 2 performed as part of Slice 1 overall review.
- **What Happens If Unanswered:** Remains in `REVIEW`; WG.00.08 cannot transition to `DONE`.
- **Status:** `OPEN`

---

### Decision `DEC-002`: Society WBS Baseline Approval (DEUS_SOCIETY_WBS.md)
- **Date Logged:** 2026-09-25
- **Question:** Does the Owner approve freezing the planning baseline of `docs/society/DEUS_SOCIETY_WBS.md` (Rev 2, covering SOC.01 through SOC.70), transitioning it from a planning skeleton to an active authoritative WBS?
- **Options:**
  1. Approve `DEUS_SOCIETY_WBS.md` as canonical frozen baseline.
  2. Request specific adjustments to institutional roles, civic offices, or currency tiers.
- **Recommended Default:** Option 1 (Approve baseline).
- **What Happens If Unanswered:** Society WBS remains a planning skeleton; implementation leaves remain blocked.
- **Status:** `OPEN`

---

### Decision `DEC-003`: Authorization to Create `CRFT` Branch from SRD 5.1
- **Date Logged:** 2026-09-25
- **Question:** Is the team authorized to create the dedicated `CRFT` task branch to ingest D&D 5.1 SRD open equipment, crafting recipes, and material properties (from local `SRD_CC_v5.1.pdf`) into `game/data/UF_WorldCatalog.json`?
- **Options:**
  1. Authorize creation of `CRFT` branch for SRD 5.1 crafting schema drafting.
  2. Defer all crafting and item additions until after repository migration to `C:\Dev\DEUS`.
- **Recommended Default:** Option 2 (Defer until after migration to `C:\Dev\DEUS` to preserve migration freeze boundary).
- **What Happens If Unanswered:** Crafting branch creation is deferred; zero new branches created prior to migration.
- **Status:** `OPEN`

---

### Decision `DEC-004`: Git Pre-Commit Hook Bypass Policy
- **Date Logged:** 2026-09-25
- **Question:** Under what exceptional emergency circumstances may an agent utilize `--no-verify` to bypass `tools/governance/check_claims.js`?
- **Options:**
  1. `--no-verify` is strictly prohibited under all circumstances without prior written entry in this document signed by Owner.
  2. Coordinator (Gemini) may bypass only for emergency repository recovery following a verified machine crash, logging the event immediately.
- **Recommended Default:** Option 1 (Zero bypass without written Owner entry).
- **What Happens If Unanswered:** Option 1 applies strictly.
- **Status:** `OPEN`

---

### Decision `DEC-005`: External Off-Disk Backup Target Selection (WG.00.12)
- **Date Logged:** 2026-09-25
- **Question:** What is the authoritative off-disk backup target for the pre-migration backup of Project DEUS before any copy to `C:\Dev\DEUS`?
- **Options:**
  1. Private git remote (e.g. GitHub/GitLab), pushing all branches, then verifying by cloning into a temporary folder and executing full test suite.
  2. External physical drive / USB drive mount (e.g. `D:\`, `E:\`), running `tools/backup_project.ps1` via robocopy to mirror the repo off-disk.
  3. Both private git remote and external physical drive mirror.
- **Recommended Default:** Option 1 (Private git remote) + test clone and run.
- **What Happens If Unanswered:** Migration to `C:\Dev\DEUS` remains strictly frozen; `WG.00.12` external backup milestone remains NOT DONE.
- **Status:** `OPEN`

