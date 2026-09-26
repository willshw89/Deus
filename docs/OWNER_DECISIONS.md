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
- **Status:** `SUPERSEDED by DEC-011`
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner): Option D. Scale-only depth separation, no colour darkening, until tile art is migrated to the master palette. Revisit shading after migration. Fold R1=D plus items R2–R11 into the depth attack plan. Superseded by DEC-011 (2026-09-25 23:54 CT).

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

---

### Decision `DEC-010`: Rock Ledge Support vs. Lateral Edge Connectivity in Cuts/Caves
- **Date Logged:** 2026-09-25
- **Question:** In procedural cut and cave carving (WG.00.08), does a solid stone stratum require direct vertical support from below, or is horizontal/lateral connectivity to the rock wall / bedrock / area edge sufficient (e.g. natural rock overhangs or ledges over air, as found at (190,72))?
- **Source:** Directive 0016-P / `DEF-Z2-PROOF-LEDGE-01`.
- **Options:**
  1. Lateral connectivity is sufficient: natural rock ledges and overhangs attached to solid cavern/ravine walls are structurally valid (matches the engine's cleanup rule).
  2. Full vertical column support required: any stratum with air directly beneath it must be carved or eliminated, disallowing all natural stone overhangs.
- **Recommended Default:** Option 1 (Lateral connectivity is sufficient; natural overhangs allowed if grounded to wall/edge).
- **What Happens If Unanswered:** Treated as Option 1 default.
- **Status:** `OPEN`

---

### Decision `DEC-011`: Owner overrides DEC-006/R1 (Option D). Flat layer rendering
- **Date Logged:** 2026-09-25
- **Decider:** Owner (23:54 CT, relayed by PM 0017-Q)
- **Status:** `DECIDED`
- **Owner Ruling:** Owner overrides R1/Option D. Every Z layer renders 1:1. That means no blur, no scale or zoom, no parallax or projection offset, and no ColorMatrix, alpha or tint depth shading or any other filter. The first goal is correct layer display. Visual depth effects will be revisited later, and only with the Owner.
- **Engine Fact:** Option D was never implemented in the engine. `main` still ships `DEUS_Depth` with Preset `deus` (`game/js/plugins.js`, lines ~270-278: `"Preset": "deus"`, `"EyeHeightFt": "140"`). That preset gives camera-model scale 0.959/0.921 plus ColorMatrix plus BlurFilter 0.6/1.2 px (`DEUS_Depth.js` L121-124, L135, L203). R1 exists only in the Lane E plan doc and in WORK_QUEUE WB-007.
- **Lane E Consequence:** WB-007's plan mandates "scale-only recession (DEC-006 / R1 = Option D)". Pause Lane E until the PM re-scopes it to DEC-011. Do not merge Lane E as written.

---

### Decision `DEC-012`: Sim/render split and level-of-detail simulation are adopted architecture
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner order 2026-09-26 00:00 CT, directive 0018-R)
- **Decider:** Owner
- **Summary:**
  1. **Sim/render split:** The simulation becomes plain JavaScript modules with ZERO dependency on RPG Maker, PIXI, or the DOM. Headless node runs the entire simulation on its own fixed tick (10 Hz). RPG Maker is purely an observer/renderer that consumes state snapshots and issues player orders into a command queue.
  2. **Level-of-Detail (LOD):** The active player/camera region simulates at full tick fidelity. Distant regions simulate as coarse aggregate summaries at reduced frequency (water volume, populations, biomass, temperature). Promotion from coarse to fine is deterministic (same seed + state = identical world); demotion conserves all mass, energy, and population.
  3. **Roadmap:** Implemented in milestone M3 (SIM.00 and SIM.30 packages). Lane M writes the architectural decision record (ADR-003).

---

### Decision `DEC-013`: Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale
- **Date Logged:** 2026-09-26 (Amended 01:10 CT per Owner Directive 0021-V Addendum §12–§13; supersedes 9-layer baseline)
- **Status:** `DECIDED` (Owner ruling 00:34, 00:37, 01:06–01:10 CT)
- **Decider:** Owner
- **Summary:**
  1. **Thirty-Two Z Layers:** The world simulation and presentation expand to 32 vertical Z layers (superseding 9 layers; formerly -2..+2). Total vertical headroom: 320 ft. The Z-range refactor targets 32 as the default gameplay layer count and must still support running at 9 in automated tests.
  2. **Governing Geometry & Scale:**
     - 1 square / cell = 5 ft × 5 ft (D&D movement standard).
     - 1 Z layer = 10 ft tall (equivalent to 2 cubes).
     - 5 strata per layer = 2 ft per stratum (5 strata × 2 ft = 10 ft).
  3. **Mandatory Sparse Storage:** Memory, state arrays, and save size must scale with occupied cells/entities, NOT with 32 × area. Empty sky and untouched solid rock cost near zero.
  4. **Cross-Layer Blast & Structural Damage:** Explosions and blasts (e.g. fireball) damage floors and propagate damage to the layer below depending on floor material, thickness, and attenuation. `applyVolumeDamage` propagates vertically with distance falloff and solid material attenuation (fire vs impact).
  5. **Nine Races with Home Layer Ranges:** Exactly 9 races exist in the world, each assigned one native home layer range within the biome bands where its settlements and natural habitat generate (supersedes "one layer per race").
  6. **Soft Home Boundaries:** "Home layer range" defines where a race's settlements and native populations materialize; it is not a hard barrier. Races may travel, explore, trade, migrate, and engage in conflict across all Z layers.
  7. **Five Vertical Biome Bands Spanning 32 Layers:** The 25 pipeline biomes are partitioned into 5 vertical bands of 5 biomes each across the 32 layers (-16..+15, surface at 0):
     - **Lower-2 (Deep Caverns):** Layers -16..-9 (8 layers, 5 biomes)
     - **Lower-1 (Shallow Underground):** Layers -8..-1 (8 layers, 5 biomes)
     - **Surface:** Layers 0..+3 (4 layers: ground, hills, low buildings; 5 biomes)
     - **Upper-1 (Low Sky / Towers / Canopy):** Layers +4..+9 (6 layers, 5 biomes)
     - **Upper-2 (High Sky / Peaks / Cloud Realm):** Layers +10..+15 (6 layers, 5 biomes)
- **Open Sub-Questions (with PM defaults):**
  - **Z-Range Coordinate Mapping:** Default `-16..+15` (surface = 0). Status: `OPEN` (PM default).
  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).

---

### Decision `DEC-014`: Population Simulation Budget, Crowd Counts LOD, and Anti-Snowball Pressures
- **Date Logged:** 2026-09-26
- **Status:** `OPEN` (Owner discussion 00:46-00:50 CT, directive 0021-V Addendum §9; PM defaults recorded)
- **Decider:** Owner
- **Summary:**
  1. **No Population Cap:** The simulation enforces no arbitrary ceiling on total world population.
  2. **Detailed Individual Budget vs Crowd LOD:** A detailed individual simulation budget (named, fully simulated individual agents) is sized by post-split simulation performance benchmarks. Population beyond the budget is simulated as aggregate counts (crowd LOD) and promoted to individuals when entering the player's focus bubble, becoming leaders, heroes, or soldiers in formed armies.
  3. **Three-Axis Identity & Obligation Retention:** Crowd counts maintain the SOC.10.01 three-axis identity (`craft`, `civicOffice`, `class`) plus an obligation level (duty to defend or serve), ensuring military levies and labor forces draw from appropriate demographics and casualties feed back accurately into counts.
  4. **Anti-Snowball Pressures:** Large, dominant factions experience emergent counter-pressures: regional rebellions, epidemic disease in dense settlements, supply/logistical strain, and dynastic succession crises, ensuring faction supremacy must be continuously maintained rather than permanently snowballing.
  5. **Monster Origins:** Default rule is that most monsters reproduce biologically like animals; per-species origin settings (`breeds`, `spawned`, `created`, `unique`) are preserved for lore exceptions (Owner assigns).

---

### Decision `DEC-015`: Data-Driven Per-Faction Development Plans
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 00:52 CT, directive 0021-V Addendum §10)
- **Decider:** Owner
- **Summary:**
  1. **Preplanned Societal Expansion:** Each of the 9 races follows an authored Faction Development Plan defining how its civilization builds itself out from founding to empire.
  2. **Data-Driven Architecture:** Plans are authored as structured JSON data schemas consumed by autonomous civilization logic (`docs/design/AUTONOMOUS_CIVILIZATION.md`) and deep-history generation, rather than hardcoded logic.
  3. **Plan Components:**
     - **Settlement Stages:** Progressive stages (e.g. camp, hamlet, village, town, city, capital) with required population, buildings, roles, and institutions.
     - **Build-Order Priorities:** Stage-specific construction preferences (shelter, water, food, storage, defense, workshops, temples, government seats) dynamically adapting under threat, famine, or abundance.
     - **Class & Occupation Mix:** Demographic targets per stage mapped to SOC.10.01 identity and obligation levels.
     - **Technology & Knowledge Paths:** Craft and construction unlocks.
     - **Architectural Style:** Cultural building profiles linked to `docs/art/DEUS_RACIAL_BUILDING_BIBLE_TEMPLATE.md` adapted to the race's DEC-013 home-layer band.
     - **Expansion & Failure Modes:** Colonization distance/terrain rules and societal regression/collapse conditions.
  4. **Owner Separation:** Technical schema and structural template are engineering tasks; race-specific cultural lore, names, and values remain Owner-authored (TODO).
