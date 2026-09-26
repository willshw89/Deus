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
- **Status:** `OPEN` | `DECIDED` | `SUSPENDED`
- **Owner Ruling & Date:** Recorded upon Owner response

---

## 2. Seeded Decisions

### Decision `DEC-001`: Native Playtest Proof Requirement for A10-1 (WG.00.08)
- **Date Logged:** 2026-09-25
- **Question:** Does the Owner require an interactive human RMMZ editor Playtest (F5) inspection of a natural Z-2 ravine cut before WG.00.08 returns to `DONE`, or is the automated plain Node run with RMMZ stubs + real engine sources plus the rendered 512×512 PNG proof (`game/test_output/z2_cut_proof_seed18_194_89.png`) sufficient?
- **Options:**
  1. Automated plain Node run with RMMZ stubs + real engine sources + rendered 2D visual map proof is sufficient for gate closure.
  2. Owner must personally launch RMMZ editor (F5) and observe a Z-2 cut on Seed 18 before closure.
- **Recommended Default:** Option 1 (Automated plain Node run with RMMZ stubs + real engine sources + rendered map proof) for automated gate closure, with Option 2 performed as part of Slice 1 overall review.
- **What Happens If Unanswered:** Remains in `REVIEW`; WG.00.08 cannot transition to `DONE`.
- **Status:** Option 1 accepted in principle; SUSPENDED pending a passing proof
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner / PM Grok Bot review): Option 1 accepted in principle; SUSPENDED pending a passing proof. PM review verdict = REJECT on initial proof (exits 1 on main with 44 fluid under-carve errors). Interactive F5 check moves to Slice 1 milestone review.
- **Owner Ruling on Fluids over Voids (2026-09-25):** Fluid may sit above a void only with >=1 solid layer between; fluid directly on air is a defect; fluid on fluid is normal.
- **WBS Impact:** `WG.00.08` stays in `REVIEW`. Fresh proof assigned to Lane H.

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
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner): Option 1. Private GitHub remote `https://github.com/willshw89/Deus.git` (private remote). Verified live, 10,259 tracked files pushed (`game/img` whitelisted, `game/data/df_*.json` tracked). Pre-migration backup requirement complete. Pending: Owner off-laptop copy of `C:\Users\snewt\DEUS_backups\deus_untracked_2026-09-25.zip` (BLOCKER-BACKUP resolved with this caveat).

---

### Decision `DEC-006` / `R1`: WG.00.09 Depth Shading Rule vs Palette Reality
- **Date Logged:** 2026-09-25
- **Question:** How should multi-Z lower levels darken under WG.00.09 depth rendering given current tile art palette?
- **Options:**
  - Option A: Plan's 2-step rule (~33% darker at depth 1, ~67% darker at depth 3).
  - Option B: One darkening step at depths 3–4 only.
  - Option C: Fixed dither pattern between neighbouring palette colors.
  - Option D: Scale-only depth separation, no color darkening, until tile art is migrated to the master palette. Revisit shading after migration.
- **Recommended Default:** Option D.
- **What Happens If Unanswered:** WG.00.09 DEFINE stays BLOCKED.
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner): Option D. Scale-only depth separation, no colour darkening, until tile art is migrated to the master palette. Revisit shading after migration. Fold R1=D plus items R2–R11 into the depth attack plan.

---

### Decision `DEC-007`: No art generation without Owner involvement
- **Date Logged:** 2026-09-25
- **Question:** May agents generate, request from generators, or integrate newly generated art autonomously?
- **Options:**
  1. Autonomous generation permitted under Rules 11 and 13.
  2. No art generated, requested, or integrated without direct Owner involvement.
- **Recommended Default:** Option 2.
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Owner, relayed by PM 001-L): No art of any kind may be generated, requested from a generator, or integrated as newly generated art by anyone (the PM, Gemini or any worker) without the Owner's direct involvement. All earlier autonomous-generation mandates (AGENTS.md Rules 11/13, GEMINI.md, CLAUDE.md, art briefs, packets) are suspended until the Owner rewrites them.
- **Owner Ruling Amendment (2026-09-25, 23:41 CT):** Scope clarification: Allowed without the Owner (these are not art): the art CATALOGUE (manifest of every tile/sprite with sheet, slot, pixel coordinates, size and palette), BLANK template tilesets (empty grids and slot IDs generated from the catalogue), and PLACEMENT/validation tooling that places Owner-approved art into catalogue slots. Only generating the art itself requires the Owner.

---

### Decision `DEC-008`: Heavy-Job Cap Lifted & Power-Off Concurrency Tripwire
- **Date Logged:** 2026-09-25
- **Question:** Is the laptop thermal issue resolved, and can multi-worker concurrent execution proceed?
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner): Heavy-job cap lifted; power-off tripwire reinstates MAX_SIMULTANEOUS_HEAVY_LOCAL_JOBS=1; laptop power-loss issue considered fixed.

---

### Decision `DEC-009`: Master Palette Engine Migration Release-Blocking Status
- **Date Logged:** 2026-09-25
- **Question:** Is `art/palette/uf.hex` (the Ultima VII daylight palette) allowed to ship, or must the master-palette migration (WG.00.13) be release-blocking?
- **Source:** ADR-002 §7 item 3.
- **Options:**
  1. Release-blocking: `uf.hex` is an interim runtime palette; master palette migration (WG.00.13) must be complete before any public/player release.
  2. Non-blocking: `uf.hex` may ship in early alpha builds, with migration occurring in background.
- **Recommended Default:** Option 1 (Release-blocking).
- **What Happens If Unanswered:** Treated as release-blocking.
- **Status:** `OPEN`


