# DEUS — OWNER DECISIONS LOG
**Status:** CANONICAL & BINDING  
**Authority:** Owner Directive 001 (2026-09-25)  
**Rule:** Nothing in Project DEUS waits on Owner input unless it is explicitly logged as an open entry in this file.

**This file is the only decision log (2026-09-29, PM under DEC-042).** From 2026-09-29, `docs/STATUS.md` section 0 and the `docs/VISION.md` decision log no longer carry rules; they point here. `docs/DECISIONS_DIGEST.md` is a one-line-per-rule view of the LIVE entries, derived from this file; where the two disagree, this file wins.
**How a decision is recorded:** the Owner's own words where they exist, the date, the decider (Owner, or PM with "Owner may object"), and a record status line under the date: `LIVE`, `SUPERSEDED by DEC-xxx`, `PARTLY SUPERSEDED (which items, by what)`, `DORMANT under DEC-037`, or `OPEN`. Ruling text is never deleted or reworded; a later ruling is added as a dated amendment or a new decision.
**How to read a status:** obey LIVE items. A SUPERSEDED entry is history. A DORMANT entry waits for the Owner to lift the DEC-037 freeze. An OPEN entry applies its stated default until the Owner rules.

---

## 1. Decision Schema

Every decision item recorded in this log must provide:
- **Decision ID:** Stable identifier (e.g. `DEC-001`)
- **Date Logged:** ISO date (`YYYY-MM-DD`)
- **Record status (added 2026-09-29):** `LIVE` | `SUPERSEDED by DEC-xxx` | `PARTLY SUPERSEDED (which items, by what)` | `DORMANT under DEC-037` | `OPEN`, directly under the date
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
- **Record status (2026-09-29):** PARTLY SUPERSEDED: Option 1 (headless Node run plus rendered PNG is enough for gate closure) is superseded by the Owner's rule that nothing is complete without in-game RMMZ F5 proof seen by the Owner (Owner 2026-09-29; AGENTS.md Definition of Done; DEC-041 item 7). The fluids-over-voids ruling (fluid above a void needs at least one solid layer between) is LIVE.
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
- **Record status (2026-09-29):** OPEN; DORMANT under DEC-037 (the society WBS is civilization scope, frozen).
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
- **Record status (2026-09-29):** SUPERSEDED by DEC-037 (crafting is frozen civilization scope) and DEC-043 (the craft design is recorded, implementation deferred). The `C:\Dev\DEUS` migration it waited on never happened.
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
- **Record status (2026-09-29):** OPEN; the Option 1 default applies: no `--no-verify` without a written Owner entry in this file.
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
- **Record status (2026-09-29):** LIVE. The Owner's off-laptop copy of the untracked-essentials zip is still pending.
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
- **Record status (2026-09-29):** SUPERSEDED by DEC-011.
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
- **Record status (2026-09-29):** LIVE, as amended 2026-09-25 (catalogue, blank templates and placement tooling are not art) and 2026-09-29 (PixelLab OBJECTS/MAPS opening for the natural world, Owner final QA, high top-down camera, ground tile variants). Which generator: DEC-044.
- **Question:** May agents generate, request from generators, or integrate newly generated art autonomously?
- **Options:**
  1. Autonomous generation permitted under Rules 11 and 13.
  2. No art generated, requested, or integrated without direct Owner involvement.
- **Recommended Default:** Option 2.
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Owner, relayed by PM 001-L): No art of any kind may be generated, requested from a generator, or integrated as newly generated art by anyone (the PM, Gemini or any worker) without the Owner's direct involvement. All earlier autonomous-generation mandates (AGENTS.md Rules 11/13, GEMINI.md, CLAUDE.md, art briefs, packets) are suspended until the Owner rewrites them.
- **Owner Ruling Amendment (2026-09-25, 23:41 CT):** Scope clarification: Allowed without the Owner (these are not art): the art CATALOGUE (manifest of every tile/sprite with sheet, slot, pixel coordinates, size and palette), BLANK template tilesets (empty grids and slot IDs generated from the catalogue), and PLACEMENT/validation tooling that places Owner-approved art into catalogue slots. Only generating the art itself requires the Owner.
- **Owner Amendment (2026-09-29, given directly to Claude Code in chat): PixelLab opening for the natural world.** Owner's words: "I am opening up Pixellab to generate assets as needed using the OBJECTS and MAPS [options] only, in order to make tilesets, charsets, chipsets, etc to complete the natural world. No 'Creator' or 'Character' prompts. Everything generated must have been catalogued first, must be prompted consistent with our SOP, and must go through QA vetting process." On QA, same day: it "should ensure art style, dimensions, camera orientation, etc. It should ensure animated assets work as intended. Basically that everything works and nothing [substandard] is getting through." On variety: "we get a lot of variety from our object prompts. Use that variety in the world to make the world diverse" and "Diverse but READABLE. It should not be confusing to the player."
  - **Allowed:** PixelLab OBJECTS and MAPS tools, as needed, for natural-world tilesets, charsets, chipsets and similar.
  - **Not allowed:** PixelLab "Creator" or "Character" prompts; any other generator, tool or scope without the Owner.
  - **Every generated asset:** (1) has its record in `art/catalogue/catalogue.json` before generation; (2) is prompted consistent with the SOP (`docs/art/DEUS_ASSET_STANDARD.md`, confirmed as the SOP by the Owner the same day); (3) passes QA vetting before it enters the game: art style, dimensions, camera orientation, and animation working as intended. Anything substandard is rejected.
  - **Variety:** place an object's approved variants across the world for diversity, keeping it readable. (Recorder's note: variants of one object should still read as that object, and different objects should stay easy to tell apart.)
  - **Owner sign-off:** "I am the final QA, and YOU will present assets to me for signoff." After QA vetting, Claude presents each asset to the Owner, and it enters the game only with the Owner's sign-off (AGENTS.md Rule 6, VISION V11). AGENTS.md Rules 11 and 13 stay suspended.
  - **Camera (Owner, 2026-09-29, "high topdown"):** every PixelLab prompt for every asset class (terrain tiles, objects, props, creatures) uses the PixelLab view setting **high top-down**. This is the one camera; `docs/art/DEUS_ASSET_STANDARD.md` AS-LOOK-001 / AS-PROJ-001 ("RMMZ standard top-down 3/4 view") describe the same camera as the engine presents it. Any note that says low top-down is superseded.
  - **Ground tile variants (Owner, 2026-09-29, "I want more variants of each type of tile so there's a gradient on the ground"):** each ground kind gets several tile variants, placed so the ground shifts gradually instead of repeating one stamp, while ground kinds stay distinguishable. Counts, format and placement rule to be recorded as their own decision once the design is settled.

---

### Decision `DEC-008`: Heavy-Job Cap Lifted & Power-Off Concurrency Tripwire
- **Date Logged:** 2026-09-25
- **Record status (2026-09-29):** LIVE.
- **Question:** Is the laptop thermal issue resolved, and can multi-worker concurrent execution proceed?
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner): Heavy-job cap lifted; power-off tripwire reinstates MAX_SIMULTANEOUS_HEAVY_LOCAL_JOBS=1; laptop power-loss issue considered fixed.

---

### Decision `DEC-009`: Master Palette Engine Migration Release-Blocking Status
- **Date Logged:** 2026-09-25
- **Record status (2026-09-29):** OPEN; the default applies: `uf.hex` is an interim runtime palette and the master-palette migration is release-blocking. `docs/art/DEUS_ASSET_STANDARD.md` AS-GLOBAL-004 names the master file (`art/palette/deus_master_world_palette_v1.hex`); it does not close this question.
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
- **Record status (2026-09-29):** OPEN; the Option 1 default applies (lateral connectivity is sufficient). NAT.02.01's `evalCellSupport` (`game/js/sim/structural/support.js`) evaluates horizontal neighbours, which matches the default; the Owner has not ruled.
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
- **Record status (2026-09-29):** LIVE (1:1 flat layers, no filters). Cues 7-9 of the §19 amendment are approved in principle only and wait for an Owner-led session. The 0083-CF (lower-layer overlays at 1:1) and 0084-CG (cross-layer selection) amendments are LIVE.
- **Decider:** Owner (23:54 CT, relayed by PM 0017-Q)
- **Status:** `DECIDED`
- **Owner Ruling:** Owner overrides R1/Option D. Every Z layer renders 1:1. That means no blur, no scale or zoom, no parallax or projection offset, and no ColorMatrix, alpha or tint depth shading or any other filter. The first goal is correct layer display. Visual depth effects will be revisited later, and only with the Owner.
- **Engine Fact:** Option D was never implemented in the engine. `main` still ships `DEUS_Depth` with Preset `deus` (`game/js/plugins.js`, lines ~270-278: `"Preset": "deus"`, `"EyeHeightFt": "140"`). That preset gives camera-model scale 0.959/0.921 plus ColorMatrix plus BlurFilter 0.6/1.2 px (`DEUS_Depth.js` L121-124, L135, L203). R1 exists only in the Lane E plan doc and in WORK_QUEUE WB-007.
- **Lane E Consequence:** WB-007's plan mandates "scale-only recession (DEC-006 / R1 = Option D)". Pause Lane E until the PM re-scopes it to DEC-011. Do not merge Lane E as written.
- **DEC-011 Amendment Note (Owner Directive 0021-V Addendum §19, 01:28 CT):** Owner wants all nine depth cues eventually; 1:1 correctness first. Cues 1–6 (visible inner side walls of openings, rim shadows, darker baked tile palettes, height edges/ramps, hanging/falling props, deep light sources) are art/draw-order only and in scope under DEC-011. Cues 7–9 (depth parallax, code-applied haze/darkening, slight scale-down) amend DEC-011 and are approved in principle for an Owner-led review session after Lanes K and N land and 1:1 correctness is verified; each will be an independent toggle off by default with measured benchmark cost.
- **DEC-011 Amendment Note (Owner Requirement 2026-09-26 11:31 CT, Directive 0083-CF):** When looking down through layers, every visible lower layer shows its effects, HP bars, status indicators, and other combat or spell overlays, not just terrain and sprites. Under DEC-011, these overlays render at 1:1 scale with zero filters (no blur, tint, fog, desaturation, or scaling applied to them).
- **DEC-011 Amendment Note (Owner Requirement 2026-09-26 11:32 CT, Directive 0084-CG):** Multi-unit selection and group orders operate across layers. The player can select units on several layers at once and give them orders together (for example, box-select through visible lower layers, or add units from other layers to the current selection with modifier-click or modifier-box).

---

### Decision `DEC-012`: Sim/render split and level-of-detail simulation are adopted architecture
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED` (Owner order 2026-09-26 00:00 CT, directive 0018-R)
- **Decider:** Owner
- **Summary:**
  1. **Sim/render split:** The simulation becomes plain JavaScript modules with ZERO dependency on RPG Maker, PIXI, or the DOM. Headless node runs the entire simulation on its own fixed tick (10 Hz). RPG Maker is purely an observer/renderer that consumes state snapshots and issues player orders into a command queue.
  2. **Level-of-Detail (LOD):** The active player/camera region simulates at full tick fidelity. Distant regions simulate as coarse aggregate summaries at reduced frequency (water volume, populations, biomass, temperature). Promotion from coarse to fine is deterministic (same seed + state = identical world); demotion conserves all mass, energy, and population.
  3. **Roadmap:** Implemented in milestone M3 (SIM.00 and SIM.30 packages). Lane M writes the architectural decision record (ADR-003).

---

### Decision `DEC-013`: Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale
- **Date Logged:** 2026-09-26 (Amended 01:10 CT per Owner Directive 0021-V Addendum §12–§13; supersedes 9-layer baseline)
- **Record status (2026-09-29):** PARTLY SUPERSEDED: item 7 (five biome bands of 25 biomes and their layer ranges) and the biome-per-band sub-question by DEC-030 and then DEC-038 items 1-2 (physical continua; six depth bands). Items 1-4 and amendments D-2 and D-3 (32 layers, 5 ft cells, 10 ft layers, 2 ft strata, sparse storage, cross-layer blast damage) are LIVE. Items 5-6 and the race-to-band sub-question (nine races, home layer ranges) are DORMANT under DEC-037. OPEN (2026-09-29): item 2's layer height (10 ft, five 2 ft strata; `art/catalogue/geometry.json` and `DEUS_Levels.js` follow it) conflicts with `docs/art/DEUS_ASSET_STANDARD.md` AS-GLOBAL-018 / AS-SCALE-001 / AS-QTR-001 (5 ft, 48 px, four 12 px quarters; the DEC-016 `stratumPx` question); this log governs until the Owner rules once (`docs/STATUS.md` D.5).
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
- **Amendment Note (2026-09-26, Directive 0035-AJ D-2 & D-3):**
  - **D-2 Stratum/slice thickness is 2 ft:** A layer is 10 ft = 5 slices of 2 ft; squares are 5 ft. Stale code references to 1-ft strata and 5-ft levels (audit F-01) are superseded; WG.00.17 aligns all feet conversions (`Z_STEP_FEET`, blast geometry).
  - **D-3 Sparse storage is mandatory in-memory as well as in saves:** Uniform columns stored compactly (run-length), levels allocated on demand, bounded 3D path-search scratch (audit F-02). WG.00.17 DoD enforces the in-memory layout.

---

### Decision `DEC-014`: Population Simulation Budget, Crowd Counts LOD, and Anti-Snowball Pressures
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** OPEN; DORMANT under DEC-037 (population, factions and crowd LOD are civilization scope; item 5 monster origins waits for the Fauna step).
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
- **Record status (2026-09-29):** DORMANT under DEC-037 (faction and civilization implementation is frozen).
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

---

### Decision `DEC-016`: The scale chart is the governing size authority for the art catalogue, templates and placement
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE.
- **Decider:** Owner (00:11 CT, "the most important is the scale chart"; relayed by PM 0019-S/0028-AC)
- **Status:** `DECIDED`
- **Ruling:** Every catalogue entry's pixel size, envelope, footprint and anchor derive from the scale chart (`art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`, whose numeric source is `game/data/DEUS_ScaleRegistry.json`; the two are not independent evidence), citing one chart row per entry. The catalogue builder (`tools/art/build_catalogue.js`), template generator (`tools/art/make_blank_templates.js`) and placement validator (`tools/art/validate_art.js`) enforce it. Disagreements with other documents go to the Owner and are never resolved by workers. Sim distances (DEC-013 geometry) govern the simulation. Where geometry and chart imply different px/ft, it is an Owner question (`stratumPx`).
- **Open:** If "the scale chart" means a different file, the Owner names it and DEC-016 is amended.

---

### Decision `DEC-017`: Keep RMMZ for menus, dialogue, saving, database and battle; fallback map renderer is a custom multi-layer PixiJS renderer inside RMMZ, decided after demo benchmarks
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE (shell). The fallback go/no-go is OPEN until the benchmarks; no renderer lane opens before the Owner decides.
- **Decider:** Owner (01:38 CT, relayed by PM 0028-AC)
- **Status:** `DECIDED` (shell). The fallback trigger is `OPEN` until the benchmarks.
- **Ruling:** RMMZ remains the engine for menus, dialogue, saving, the database and battle screens. If the stock RMMZ map (`Spriteset_Map`/`Tilemap`) cannot meet the goals, the fallback is a **custom multi-layer PixiJS map renderer inside RMMZ**. It replaces map drawing inside `Scene_Map` only; all other scenes, windows, save, database and battle are untouched, so it is not an engine swap. The goals are 32 layers, the §18 occlusion rule, DEC-011 1:1 flat layers, and the stress scene within frame budget. The go/no-go is decided with the Owner after the demo benchmarks: Lane K normal plus 0019-T stress baselines, and the §18 32-vs-5-layer occlusion benchmark. No renderer code lane opens before then.
- **Consequences:**
  - ADR-003 Rev 3 adopts this as its exit/fallback path (§13 "Engine Exit Path").
  - Added WBS placeholder row "Custom multi-layer PixiJS map renderer (fallback)" (`WG.00.24`), gated on Lane K benchmarks and Owner go/no-go.
  - Benchmark hygiene note: benchmarks share CPU with other workers, so each perf record must note concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.

---

### Decision `DEC-018`: SRD spells are hyper-realistic: effects play out physically in the simulation; SRD numbers stay the rules baseline
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** PARTLY SUPERSEDED: the sub-question's PM default (conjured matter as an explicit magical source/sink in the conservation ledger) by DEC-040 item 2 and its 2026-09-29 clarification (no sinks; material or water that appears from nothing is a blocking defect). How conjured water and stone get a source is therefore OPEN. The ruling itself (physical effects on top of unchanged SRD numbers, one schema, zero per-spell code) is LIVE; runtime work follows the DEC-037 order.
- **Decider:** Owner (01:39 CT, relayed by PM 0028-AC)
- **Status:** `DECIDED`. Per-spell details are `OPEN` pending the audit.
- **Ruling:** Spell effects play out physically in the living-world simulation:
  - Fire ignites combustible materials and spreads
  - Blasts damage structures and can breach floors into lower layers
  - Water floods and flows
  - Cold freezes liquid into ice
  - Earth spells reshape physical terrain strata
  SRD 5.1 damage, range, saves, area, duration and casting stay the rules baseline, and physical consequences are added on top, never replacing SRD numbers. It is data-driven: one spell-effect schema of reusable primitives, and ZERO per-spell code.
- **Open Sub-Question (PM default):** Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the conservation ledger like the rain/evaporation exception.
- **WBS Integration:** `SIM.60.01` (audit), `SIM.60.02` (schema), `SIM.60.03` (runtime), `SIM.60.04` (QA fixtures).

---

### Decision `DEC-019`: In-Layer Height (Strata) Presentation & Movement Rules
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE. Item 1 is a straight vertical pixel shift under DEC-011, not the 2.5D projection retired by VISION V131; the Owner has not said otherwise. OPEN question for the Owner (2026-09-29): whether "the 2.5D offsets are retired" includes this per-stratum pixel shift (INV-GEO-05).
- **Status:** `DECIDED` (Owner ruling 01:17–01:19 CT, directive 0021-V Addendum §15)
- **Decider:** Owner
- **Summary:**
  1. **Visual Presentation:** Characters and objects are rendered raised by a fixed pixel offset per stratum of ground height (a straight vertical pixel shift, no scale/projection deformation; DEC-011 compliant).
  2. **Movement Rules:**
     - 1 stratum difference (2 ft): Normal step (traversable without penalty).
     - 2 strata difference (4 ft): Climb or jump (reduced movement speed or skill check).
     - Full layer difference (10 ft / 5 strata): Requires stairs, ladder, or ramp.
  3. **3D Height Mechanics:** Falling damage, melee reach, and line-of-sight elevation advantage use real 3D vertical height differences.
  4. **Art Preparation:** Catalogue requires one top-surface tile per terrain plus auto-placed edge/cliff-face strips per height difference (1 to 5 strata) and height shading; NOT a full tile set per height. Catalogue placeholders only; no art generation (DEC-007).

---

### Decision `DEC-020`: Seamless Inter-Layer Ramps and Camera-Follow Behavior
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE, with the 0090-CM multi-layer hills amendment.
- **Status:** `DECIDED` (Owner ruling 01:21 CT, directive 0021-V Addendum §16)
- **Decider:** Owner
- **Summary:**
  1. **Seamless Transitions:** Ramps and slopes carry units continuously from one layer to the next. A ramp is a run of cells rising one stratum per cell (5 cells = one 10 ft layer). At the top stratum, the unit's Z becomes Z+1 with zero screen transfer, fade, or pause. Depends on Lane N (in-place layer switch) and DEC-019 stratum height offsets.
  2. **Camera-Follow Default:** When the player unit crosses a ramp boundary between layers, the camera view automatically follows the player's current layer. Non-player units crossing simply transfer layer membership lists (Lane K per-frame membership refresh).
  3. **Pathfinding & Construction:** Multi-Z pathfinding treats ramps, stairs, and ladders as traversable layer connectors. Colonists can build ramps. Art catalogue adds ramp/slope pieces per terrain (placeholders only; DEC-007).
- **DEC-020 Amendment Note (Owner requirement 2026-09-26 12:12 CT, Directive 0090-CM):** A hill can span several Z layers, and units walk straight up it with no stairs, no transfer, and no loading. Terrain rises continuously across layer boundaries (multi-layer hills, not only single 5-cell ramps) via slope and ramp tiles between Z layers. Pathfinding across Z treats walkable slopes as ordinary path edges between layers. The camera follows the controlled unit's layer while it walks across slopes (no fade, pause, or load). Selected units and group orders keep working while crossing layers on slopes (selection is not dropped at a layer change).

---

### Decision `DEC-021`: Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED` (Owner ruling 01:24 CT, directive 0021-V Addendum §18)
- **Decider:** Owner
- **Summary:**
  1. **Occlusion Culling Rule:** Any cell, entity, prop, or effect covered by an opaque upper layer is not drawn at all.
  2. **Bounded Draw Cost:** Draw cost is strictly bounded by exposed visible screen area (VISION V133), NOT by total layer count. For each screen column/cell, rendering traverses only from the currently viewed layer downward to the first opaque surface; cells under solid cover cost zero.
  3. **Benchmark Requirement:** Applied in Lane K follow-up, the 32-layer refactor, and future overlook view. Benchmark target: the stress scene with 32 layers must cost approximately the same frame time as with 5 layers when upper layers are solid.

---

### Decision `DEC-022`: Cross-Layer 3D Targeting, Ballistics, and Volume Damage
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE; implementation waits on the DEC-037 upstream order.
- **Status:** `DECIDED` (Owner ruling 01:35 CT, directive 0021-V Addendum §20)
- **Decider:** Owner
- **Summary:**
  1. **3D Targeting:** Spells, arrows, and thrown items can target cells and entities on lower (and upper) layers whenever there is an unobstructed 3D line of sight through openings (shafts, ravines, stairwells, overlooks).
  2. **True 3D Geometry:** Range calculation uses true 3D Euclidean distance (5 ft grid cells, 10 ft layer height).
  3. **Vertical Modifiers:** Falling projectiles and dropped objects gain velocity/impact damage based on height fallen; shooting upward incurs a range penalty.
  4. **Volume Area Damage:** Area-of-effect blasts (fireball, explosive shells) hitting a floor propagate cross-layer volume damage downward per DEC-013 §12. Targeting UI allows selecting visible cells on lower layers viewed through openings.

---

### Decision `DEC-023`: Ore and Mineral Deposits Never Respawn (Ruling D-5)
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED` (Owner ruling relayed by PM, Directive 0035-AJ §1)
- **Decider:** Owner
- **Summary:**
  1. **Finite Minerals:** VISION rules V74, V83, INV-SIM-03, and LIFE-002 stand as binding law. Ore, stone, and gem deposits are finite in the geological stratum.
  2. **Bug Removal:** Sprouting of ores, stones, and gems over time in `DEUS_Ecology.js` (audit VEG-1, F-03) is classified as a code defect to be removed in `SIM.50.12`.
  3. **No Spontaneous Regeneration:** Minerals do not respawn silently. Any reintroduction of materials must occur solely through closed-loop mass conservation / erosion / reclamation mechanics (see DEC-028).

---

### Decision `DEC-024`: Unified Water Simulation Authority (`DEUS_Fluid`) & Legacy Flood Retirement (Ruling D-4)
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE as a PM ruling (Grok Bot, 2026-09-26); the Owner has not objected. `DEUS_Fluid` is the open-water authority; groundwater is the NAT.03.01 aquifer kernel (DEC-038 items 5 and 9), which hands seeped water to `DEUS_Fluid`.
- **Status:** `DECIDED (PM)` (Owner may object; Directive 0035-AJ §1)
- **Decider:** PM (Grok Bot)
- **Summary:**
  1. **Single Water Authority:** The physical fluid solver `DEUS_Fluid` is established as the sole authoritative water simulation system in Project DEUS.
  2. **Retirement of Volume-Less Flood Fill:** The legacy flood-fill mechanism in `DEUS_Levels.js:3389` that generated water without conserved volume (audit WAT-1, F-05) is retired.
  3. **Reconciliation:** All four disparate water stores (WAT-5) converge onto `DEUS_Fluid`. The integration is validated in Playtest (F5) with `window.UF.Fluid`.

---

### Decision `DEC-025`: Nine SRD Culture and Faction Development Plans (Ruling D-6)
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** DORMANT under DEC-037 (PM ruling, Grok Bot, 2026-09-26; the Owner has not objected; faction plans are frozen civilization scope).
- **Status:** `DECIDED (PM)` (Owner may object; Directive 0035-AJ §1)
- **Decider:** PM (Grok Bot)
- **Summary:**
  1. **Nine Culture Plans:** Each of the 9 SRD 5.1 races (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling per `game/data/srd51/character_options.json`) receives its own dedicated culture and faction development plan (DEC-015, SOC.10.03 slots).
  2. **Catalog Expansion:** Expands the world catalog culture templates from 7 to 9.
  3. **Layer Mapping:** Specific race-to-home-layer assignments remain `OPEN` (DEC-013).

---

### Decision `DEC-026`: Calendar Scale vs Solar Day (`OWNER_OPEN`, Ruling D-1)
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** SUPERSEDED by DEC-038 item 8 (360-day calendar: 12 months of 30 days, 4 seasons of 90 days), which is Option A. The real-time length of one game day is not set by DEC-038.
- **Status:** `OPEN` (Owner question relayed by PM, Directive 0035-AJ §1)
- **Decider:** Owner
- **Question:** How should the game calendar reconcile the solar day with the annual seasonal cycle given VISION rule V123 (1 game day = 1 year, making seasons the four 6-hour quarters of a day)?
- **Options:**
  - Option A: Decouple the solar day from the calendar year (multi-day year with distinct diurnal cycles per season).
  - Option B: Retain V123 (1 day = 1 year; 6-hour micro-seasons).
  - Option C: Slow both the biological lifecycle clock and the calendar in lockstep.
- **Recommended Default:** Option A.
- **What Happens If Unanswered:** `SIM.50.06` (seasonal simulation) remains held until an authoritative ruling is recorded.

---

### Decision `DEC-027`: SRD 5.1 Combat Authority (d20 vs AC, SRD Damage, HP, Actions, Conditions; V64 Retired)
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED` (Owner ruling 08:20 CT, Directive 0062-BK)
- **Decider:** Owner
- **Summary:**
  1. **Authoritative Combat Law:** DEUS combat mechanics are canonically governed by SRD 5.1 rules — d20 attack rolls vs Armor Class (AC), SRD damage dice, SRD stat blocks/hit points, initiative, action economy, and conditions.
  2. **Retirement of V64:** VISION rule V64 (OSRS-style accuracy/strength combat) is formally RETIRED. Rule V47 is reinstated as the authoritative combat specification.
  3. **Data & Engine Integration:** The SRD 5.1 dataset in `game/data/srd51/` is authoritative for combat resolution. Rules are evaluated behind `UF.Rules` with pure, deterministic, seeded dice logic compatible with headless simulation under ADR-003.

---

### Decision `DEC-028`: Matter Conservation by Weight & Closed-Loop World Reclamation
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** PARTLY SUPERSEDED: item 2's organic path (wood, organic detritus, corpses, bone -> soil) by the DEC-040 clarification of 2026-09-29 (plants, creatures and gases are outside the closed-mass rule). Items 1, 2 (stone -> stone; metal -> rust, scrap or trace, never virgin ore), 3 and 4 are LIVE, read as DEC-040 clarifies: world material and water, by weight, not chemistry.
- **Status:** `DECIDED` (Owner ruling 08:25 CT, Directive 0063-BL)
- **Decider:** Owner
- **Summary:**
  1. **Conservation by Weight:** Every material, block, item, and structure carries an invariant weight. Mining a block yields items of equivalent aggregate weight; building consumes exact weight; structural collapse yields debris/rubble of identical weight. Matter is neither created nor destroyed.
  2. **World Terrain Reclamation:** The terrain slowly reclaims loose and abandoned outdoor items (stone, timber, bone, metal, corpses, ruins) by weight. When sufficient mass accumulates at a coordinate, it regenerates solid terrain blocks of the corresponding base material:
     - Stone / masonry rubble → solid stone.
     - Wood / organic detritus / corpses / bone → soil / fertile earth.
     - Metals → rust / scrap or trace mineral veins, never virgin ore veins (finite ore rule DEC-023 preserved).
  3. **Exemptions:** Items stored within active, claimed, or enclosed structures are exempt from reclamation.
  4. **Accounting Authority:** The per-class mass ledger `game/js/sim/ledger*` (`WG.65.15`) is the single authoritative accounting instrument across mining, construction, collapse (`SIM.40.01`), decay (`SIM.40.05`), and reclamation.

---

### Decision `DEC-029`: Handling Policy for Credential Incidents (SEC-2026-09-26-01)
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** LIVE (no git history purge, filter-repo or force push on `origin/main`). The Owner's relayed answer "1. purge history" of 2026-09-29 was applied to `docs/DECISIONS_DIGEST.md` (no history in the digest), not to git; if it meant git history, this decision needs an Owner amendment before anyone acts (`docs/STATUS.md` D.9).
- **Status:** `DECIDED` (Owner ruling ~07:40 CT, Directive 0060-BI)
- **Decider:** Owner
- **Summary:**
  1. **In-Tree Remediation:** Incident `SEC-2026-09-26-01` (hardcoded API key literal committed in historical commit `224b1b36`) is resolved in-tree via Lane Z security tooling (`OPS.70.02`), removing the fallback and redacting references.
  2. **History Purge Declined:** The Owner explicitly DECLINED git history purges, filter-repo, or forced pushes on `origin/main` to preserve absolute commit immutability.
  3. **Revocation Authority:** Credential revocation is handled directly by the Owner externally.



### Decision DEC-030: World Grid and Vertical Biomes (Owner & PM delegated, 2026-09-26)
- **Date Logged:** 2026-09-26 (added 2026-09-29 from the heading; the entry had no date line)
- **Record status (2026-09-29):** PARTLY SUPERSEDED: the six biome enums and the 15 pairwise transitions by DEC-038 item 1 (biomes are derived labels over the temperature, moisture, volcanism and wildness continua); the five depth bands are restated by DEC-038 item 2 with the same ranges plus Sky +12..+15. LIVE: 32 layers with the top four as open air, geology-first method, the 3x3 grid of 256x256 wrapping maps, data-driven grid size, seamless edges.
- **Vertical extent:** 32 layers (-16..+15). Top 4 layers (+12..+15) are reserved open air (no natural terrain). Natural terrain tops out at +11.
- **Biomes (6):** VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD.
- **Depth bands (5):** Deep Earth (-16..-11), Caverns (-10..-5), Lowlands (-4..+1), Uplands (+2..+6), Highlands (+7..+11).
- **Geology-first method:** Rock bodies span layers. Per-biome placement rules on top of geology. Vertical links: physical cause, surface tells, passages, shared resources.
- **Supersedes:** WG.00.04 (old 5 biomes) and DEC-013 band ranges. Replaces 25-biome drafting (Directive 0069-BR). Each of the 6 biomes is expressed across all 5 depths (30 biome-depth combinations).
- **World Map:** 3x3 grid of 256x256 maps (approx 768x768 tiles). Wraps on all edges (round world). Coarse resolution whole-world generation first. Current map runs full detail, other 8 run at ADR-003 LOD summary level.
- **Transitions:** 15 pairwise biome transitions (6 choose 2).
- **Engine Data:** Grid size is data so it can be re-scaled (e.g. to 4x4) later.
- **Map Edges:** Seamless transitions reuse Lane N's in-place swap, with no load screen.

---

### Decision `DEC-031`: Crossload Routing and Effort Policy
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** SUPERSEDED by DEC-032 (model standard, no same-provider review) and DEC-035 (routing and effort by lane type); the Claude-constraint window it addressed ended 2026-09-29. Item 4's Gemini review-file conventions survive only as tooling practice.
- **Status:** `DECIDED` (Owner ruling 10:19 CT)
- **Decider:** Owner
- **Summary:**
  1. **Routing during Claude constraint:** While Claude is >=97% usage or Codex is exhausted: Writers = Grok (grok-4.7). Reviewers of Grok code = Gemini (or Claude if budget allows). Reviewers of Claude code = Grok. No model reviews its own code. Claude budget reserved for in-flight work.
  2. **Models:** Frontier only (no flash/mini/small tiers).
  3. **Effort by judgment:** `top` (grok xhigh / claude max / codex ultra) for hard/high-risk writing (sim engines, refactors) and its reviews; `high` for ordinary lanes and reviews; `medium` or lower for routine ops, pulses, and record-only work.
  4. **Tooling:** `pm_ops\start_review.ps1 -Provider gemini` runs Gemini reviews. Gemini reviews must touch only `tasks/<T>/<lane>/review_gemini_<sha8>.md`, use subject `[gemini] <T> review <sha8>`, and hold exactly one VERDICT line. lane.json reviewer must be `gemini`.

---

### Decision `DEC-032`: Owner Model Standard
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** PARTLY SUPERSEDED: items 5-6 (Grok `xhigh` floor) narrowed by DEC-035 item 2 for purely mechanical Grok writer lanes only. Item 3's Codex-exhausted note (until 2026-09-29 21:34 CT) and item 10 are time-bound. Items 1-2, 4, 7-9 are LIVE. Roles: DEC-042.
- **Status:** `DECIDED` (Owner ruling 11:23–11:24 CT, Directive 0082-CE)
- **Decider:** Owner
- **Summary:**
  1. **Tiers:** "Big" designates the hardest or highest-risk lanes: WG.00.17 (32-layer core), SIM.60.05 / SIM.60.06 (SRD combat), SIM.40.00 / SIM.40.11 (mass ledger), and SIM.00.01 (ADR-003 performance). Everything else is "Standard".
  2. **Claude:** Standard is `claude-opus-5-5` at effort `high`. Big is `claude-fable-5-1` at effort `max` (writer).
  3. **Codex:** Standard is `gpt-5.6-sol` at `xhigh`. Big is `gpt-6-astra` at `ultra`. Codex is exhausted account-wide (5.6 included) until Tue Sep 29 21:34 CT.
  4. **Gemini:** `gemini-3.1-pro-preview` at thinking `HIGH`, falling back to `gemini-3.8-flash` at thinking `HIGH` (Gemini CLI 0.61.0).
  5. **Grok:** `grok-4.7` at `xhigh`. `xhigh` is the Grok floor; nothing launches Grok below it.
  6. **Effort Floor:** Effort never falls below the tier standard, including on fallback models.
  7. **Fallback:** Step down each provider's model chain on limit errors, and return to the top model after the reset.
  8. **Multi-Agent:** On for every provider and role by default. The only exception is tiny routine or record-only jobs.
  9. **Reviews:** Never review your own provider's code.
  10. **Context:** Y and Z reviews that ran at high effort are being re-run at xhigh (launched 11:27 CT).

---

### Decision `DEC-033`: Recruitable Non-Core Humanoids, Capture/Domestication, and Tamed Party Creatures
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** DORMANT under DEC-037 (recruitment, capture, taming and party creatures are society systems; they wait for the Fauna step and the Owner lifting the freeze).
- **Status:** `DECIDED` (Owner rulings 12:59 CT and 13:01 CT, Directive 0096-CS)
- **Decider:** Owner
- **Summary:**
  1. **Recruitable Non-Core Humanoids:** Non-core humanoids (11 extra face cultures beyond the 9 SRD races: goblin, orc, kobold, etc.) can be persuaded or recruited into the player's party. They receive full paper-doll bodies on shared body templates (same layer and anchor rules as the 9 SRD races). Monstrous types (undead, elementals, etc.) remain fixed-sprite (no paper-doll).
  2. **Capture and Domestication:** Enemies and wildlife can be captured and tamed into pets, mounts, livestock, and work animals. Captured humanoids become prisoners or recruits.
  3. **Tamed Creatures in the Party:** Tamed creatures fight in the party using only their basic SRD 5.1 stat blocks and natural attacks and defenses. There are NO creature armor or equipment slots, no barding, and no crafted creature gear (Owner 13:01 CT ruling supersedes equipment exploration). A riding saddle is a visual marker only (no equipment slot, no mechanical stats).

---

### Decision `DEC-034`: Gemini Flash Final Merge Gate During Pro Quota Block
- **Date Logged:** 2026-09-26
- **Record status (2026-09-29):** SUPERSEDED by DEC-035 item 3 (Gemini 3.1 Pro is the merge-gate reviewer again once available); the Pro quota window (~2026-09-27 19:04 CT) has expired. The Lane AA and Lane AL merges it authorized stand.
- **Status:** `DECIDED` (Owner ruling 20:45 CT, Directive 0122-DR)
- **Decider:** Owner
- **Summary:**
  1. **Final Merge Gate Authorization:** `gemini-3.8-flash` (thinking `HIGH`) is authorized as the authoritative final merge gate while `gemini-3.1-pro` is quota-blocked (until the reset window ~2026-09-27 19:04 CT / 7:04 PM CT).
  2. **Supersession of Prior Pro-Required Holds:** Prior holds requiring a secondary or combined `gemini-3.1-pro` review pass before merge (e.g. Lane AA WG.00.17 second pass, Lane AL WG.20.01 combined pass) are superseded by an Owner-authorized Flash thinking `HIGH` review verdict.
  3. **Unblocking Downstream Writers:** With Flash final gate reviews completed (Lane AL CLEAN PASS at `c17da05f`, Lane AA PASS WITH NOTES at `d2c6614f`), Lane AA and Lane AL merges to `main` are executed (`1c2fcc28` and `c1bb4469`), unblocking dependent downstream writer lanes (SIM.40.11, SIM.50.13, COMBAT-U7, WORLD-ITEMS, DEPTH-DEMO).

---

### Decision `DEC-035`: Gate Tests Before Review, Mechanical Writer Effort, and Model Routing Rules
- **Date Logged:** 2026-09-27
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED` (Owner rulings 11:26 CT and 11:49 CT, Directives 0141-EK, 0142-EL)
- **Decider:** Owner
- **Summary:**
  1. **Gate Tests Before Review:** The PM runs every `lane.json` gate test on the writer tip, in a fresh clone, before launching any Gemini review. Any lane with a failing gate test goes back to a fix pass instead of review.
  2. **Writer Effort by Lane Type:** Grok writers stay at `xhigh` for simulation, worldgen, rendering, combat, AI, and tricky logic. `high` is permitted ONLY for purely mechanical lanes (data files, schemas, templates, catalog entries, formatting, simple specs). This supersedes DEC-032 item 5 ("xhigh is the Grok floor; nothing launches Grok below it") and the item 6 effort floor for mechanical Grok writer lanes only; big-tier lanes, reviews, and all other cases keep the floor. Implemented in Lane BC (`pm_ops/top_models.ps1` honoring explicit Grok `high` when `effortClass` is mechanical).
  3. **Model Routing Rule:** Quality first: the strongest available model at `xhigh` for hard logic (sim, worldgen, rendering, combat, AI, tooling logic); `high` effort or cheaper models only for purely mechanical work. When Claude/Codex return (Tue Sep 29) or Gemini 3.1 Pro resets (~7:04 PM CT today), re-route each task to whichever available model is strongest for it. Gemini 3.1 Pro becomes the merge-gate reviewer again once back (gemini-3.8-flash thinking HIGH remains the DEC-034 gate only while Pro is unavailable).

---

### Decision `DEC-036`: Race-Class Affinities, No Race-Class Locks, and Role Distribution Rule
- **Date Logged:** 2026-09-27
- **Record status (2026-09-29):** DORMANT under DEC-037 (classes and race affinities are society scope); the item 4 `OWNER_TODO` values stay OPEN.
- **Status:** `DECIDED` (Owner rulings 11:59 CT, 12:30 CT, 12:31 CT, 12:33 CT, Directives 0143-EM, 0144-EN)
- **Decider:** Owner
- **Summary:**
  1. **No Race-Class Locks:** Every race can take every class without exception. No class is ever locked to any race. The three-axis person identity model (SOC.10.01) allows any combination.
  2. **Race-Class Affinity Table:** Each race receives small thematic affinities (a small bonus and town AI weighting). The authoritative table (Owner 12:30 CT, corrections at 12:31 CT and 12:33 CT):
     | Race | Affinity classes |
     |---|---|
     | Human | Fighter, Wizard, Cleric |
     | Dwarf | Paladin, Cleric, Rogue |
     | Elf | Ranger, Druid, Sorcerer |
     | Half-elf | Fighter, Druid, Bard |
     | Halfling | Fighter, Druid, Rogue |
     | Gnome | Fighter, Cleric, Wizard |
     | Half-orc | Barbarian, Druid, Fighter |
     | Tiefling | Fighter, Warlock, Cleric |
     | Dragonborn | Fighter, Monk, Cleric |
  3. **Role Distribution Rule:** Each race favours one tank, one healer, and one damage class. The Owner counts Ranger as a tank.
  4. **Unset Authoring Values (OWNER_TODO):**
     - Bonus size: `OWNER_TODO`
     - Job-pick weight: `OWNER_TODO`
     - Role tags for non-obvious rows (e.g. Half-elf Fighter/Druid/Bard, Half-orc Barbarian/Druid/Fighter): `OWNER_TODO`
     - Playtest starting suggestions (unapproved, pending Owner ruling): +1 on class main rolls, ~10% faster class XP, ~1.5x job-pick weight.
  5. **Cross-References:** DEC-013 item 5 (nine races), SOC.10.01 (person identity class axis allows any class for any race; merged at `099be7b9`), SOC.11.01 (2014 SRD class integration), SOC.13.01 (central duty scheduler). Planning task tracked in SOC.11.02.

---

### Decision `DEC-037`: Lean Natural World v1 Phase Lock & Causal Dependency Chain
- **Date Logged:** 2026-09-28
- **Record status (2026-09-29):** LIVE. Owner-authorized exceptions to the civilization freeze, per the PM brief of 2026-09-29: the sack inventory and racial banners. The Owner's exact words for those two exceptions are not in this file; the PM records them when it has them.
- **Status:** `DECIDED` (Owner Directive 2026-09-28)
- **Decider:** Owner
- **Summary:**
  1. **Lean Natural World v1 Phase Lock:** Engineering effort must focus strictly on what materially matters to completing a believable, deterministic, playable natural world. Defer luxury features, eliminate redundant systems, and trim speculative complexity.
  2. **Upstream-First Causal Dependency Order:**
     `Physical Space -> Physical Matter -> Water -> Geomorphology / Soil -> Climate -> Flora -> Fauna`.
     Do not implement downstream runtime systems until their upstream physical contracts exist and have passed required gates.
  3. **Tiered Allocation:**
     - **CORE:** Focus implementation and review resources on a few robust physical authorities.
     - **DERIVED:** Prefer outcomes emerging from core systems and prove them with tests; avoid redundant feature systems.
     - **ENRICHMENT:** Wait.
     - **PRESENTATION:** Wait unless needed for verification, within existing approvals and DEC-007.
     - **CIVILIZATION:** Frozen. No civilization, farming, faction, or society implementation under this phase.
     - **CUT / superseded:** Allocate no new work.

---

### Decision `DEC-038`: Lean Natural World v1 Physical Foundations & Mathematical Calibration (Amended)
- **Date Logged:** 2026-09-28
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED` (Owner rulings 2026-09-28 on Mathematical and Physical Foundations, with Final Ratification Amendments)
- **Decider:** Owner
- **Summary:**
  1. **Physical Continua over Categorical Biome Enums:** The fundamental physical authorities are four continuous dimensions: temperature, moisture, volcanism, and wildness, anchored to discrete physical elevation (stratum/Z). Biome designations (e.g. tundra, taiga, temperate marsh, primeval forest, arid scrub, geothermal caldera) are derived content/presentation labels, not primitive physics enums.
  2. **Restoration of Canonical Five-Band Depth Architecture:** The tested five-band vertical stratification is canonically restored:
     - Deep Earth: Z = -16 .. -11 (6 levels = 60 ft)
     - Caverns: Z = -10 .. -5 (6 levels = 60 ft)
     - Lowlands: Z = -4 .. +1 (6 levels = 60 ft)
     - Uplands: Z = +2 .. +6 (5 levels = 50 ft)
     - Highlands: Z = +7 .. +11 (5 levels = 50 ft)
     - Sky (Atmosphere): Z = +12 .. +15 (4 levels = 40 ft)
  3. **Authoritative Integer Internal-Unit Policy (Zero Ambiguity):**
     - Spatial Address: Integer cell (x, y, z) and stratum s in [0..4].
     - Mass: Integer centipounds (1 unit = 0.01 lb).
     - Water Mass: Authoritative mass in centipounds; display volume in derived gallons (1 gal = 834 centipounds).
     - Saturation: Integer basis points (0 .. 10000, where 10000 = 100.00%).
     - Hydraulic Head: Integer millistrata (1000 units = 1 stratum = 2 ft; elevation head relative to global bedrock datum).
     - Temperature: Integer centi-Fahrenheit (7250 = 72.50°F).
     - Simulation Time: Integer ticks.
  4. **Slope Generation via Continuous Target Gradient + Accumulated 2-ft Rasterization:** Rather than quantizing slopes to coarse cell multiples, the terrain generator accumulates continuous rise (accumulatedRise += 5 ft * targetSlope). When accumulatedRise >= 2 ft, elevation rises one stratum and decrements 2 ft, preserving the exact 2-ft vertical lattice while supporting arbitrary smooth grades.
  5. **Aquifer Equations & Hydraulic Precision (NAT.03.01):**
     - Total hydraulic head h = elevationHead + pressureHead using a global bedrock elevation datum.
     - Interface conductivity across adjacent cells uses the harmonic mean: K_interface = (2 * K_A * K_B) / (K_A + K_B).
     - Discrete flow calculations carry a deterministic fractional residual accumulator to prevent small flows from permanently truncating to zero. Net mass strictly conserved in ledger.
  6. **Configurable Climate Scaling:** Elevation cooling is defined as a configurable gameplay coefficient (CLIMATE_CONFIG.elevationScale = -35 centi-F/Z, initial baseline -0.35°F/Z) rather than a hardcoded atmospheric lapse rate, subject to tuning after playtest observation.
  7. **Natural World v1 Simulation Envelopes:** 32 Z vertically and 768x768 (3x3 regions) horizontally are formally declared as the Natural World v1 simulation envelopes, not permanent engine-level maximum ceilings.
  8. **Deterministic Calendar Math:** Authoritative 360-day calendar (12x30 days, 4x90 seasons) uses explicit zero-based day-of-year wrapping:
     dayOfYear = absoluteDay % 360 (0..359); month = Math.floor(dayOfYear / 30) + 1 (1..12); dayOfMonth = (dayOfYear % 30) + 1 (1..30); season = Math.floor(dayOfYear / 90) (0=Spring, 1=Summer, 2=Autumn, 3=Winter).
  9. **Ratification of NAT.03.01 in Lane bx:** Lean Aquifer & Water Table Kernel authorized for execution in lane-bx with MiniMax M3 writer and Grok reviewer under these exact specifications.

---

### Decision `DEC-039`: Rules-Source Hierarchy (SRD 5.1 -> Minecraft Reference -> DEUS Law)
- **Date Logged:** 2026-09-28
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED` (Owner Directive 2026-09-28)
- **Decider:** Owner
- **Summary:**
  1. **Canonical Five-Tier Rules Hierarchy:**
     1. **OWNER DECISIONS** (Project vision, architectural rulings, freezes, explicit directives).
     2. **SRD 5.1 (CC-BY-4.0)** (Creatures, class/spell mechanics, ability scores, combat, saving throws, core traits).
     3. **VANILLA MINECRAFT (Java Edition Stable Behavior)** (Default behavioral/gameplay reference when SRD is silent or too abstract for a simulated world).
     4. **DEUS-SPECIFIC PHYSICAL INTERPRETATION** (Translation to 5-ft lattice, 32 Z, 2-ft strata, continuous coordinates, closed mass).
     5. **ORIGINAL DEUS CONTENT** (Original pixel art, lore, factions, original code; zero asset copying).
  2. **Core Operational Rule:** Use the SRD wherever it gives an answer. When the SRD is silent or too abstract to define a functioning simulated world, use vanilla Minecraft Java Edition as the default behavioral reference unless an explicit DEUS decision overrides it.
  3. **Behavior Reference vs Implementation:** Copy gameplay logic and reference behavior, NEVER textures, source code, sounds, names, or art.
  4. **World Generation vs Regeneration Philosophy:**
     - **Generation Order:** `WORLD SEED -> base terrain -> geology -> water -> soil/environment -> vegetation -> fauna/monsters -> structures/features`. Establishes initial world state.
     - **Regeneration Law:** Regeneration happens ONLY through physical world rules (seed dispersal, suitable soil/light/moisture for plants; breeding/migration for wildlife). Zero magic chunk reload respawning or arbitrary respawn timers. Supernatural entities follow explicit SRD rules.
  5. **Minecraft Rule Record Format:** Every Minecraft-derived DEUS specification must document: `SOURCE`, `REFERENCE BEHAVIOR`, `DEUS TRANSLATION`, and `DEVIATIONS`.

---

### Decision `DEC-040`: Universal Closed-Mass World Invariant & Magma/Core Reservoirs
- **Date Logged:** 2026-09-28
- **Record status (2026-09-29):** PARTLY SUPERSEDED: items 3-4 narrowed by the Owner clarification of 2026-09-29 below. The living-plant, creature-body and gas reservoirs, and the logging/harvesting, fauna/digestion and smoke/gas contracts, are outside the rule. Items 1-2 and 5 are LIVE as the clarification reads them: a lifecycle weight ledger for material generated with the world (stone, soil, sand, clay, ores, metals) and for water; type, volume and density may change, weight may not; no sinks; nothing that complicates soil.
- **Status:** `DECIDED` (Owner Directive 2026-09-28)
- **Decider:** Owner
- **Summary:**
  1. **Master Conservation Law:** Project DEUS is a closed-mass world. Matter may move, combine, separate, change phase, decay, burn, be eaten, mined, crafted, carried, dissolved, or transformed—but total world mass never changes:
     $$\text{WORLD\_TOTAL\_MASS}(t) \equiv \text{WORLD\_TOTAL\_MASS}(\text{Year 0})$$
     Strictly enforced in authoritative integer centipounds ($1\text{ unit} = 0.01\text{ lb}$).
  2. **No Deletion Sinks:** No sink—including lava, deep earth, fire, decay, digestion, or offscreen simulation—may delete matter. Every transformation identifies source reservoir, destination reservoir, and conserved transferred mass.
  3. **Core Environmental Reservoirs:** Solid strata, loose items/rubble, carried/container inventory, liquid water/groundwater, atmospheric/gaseous products, living plant biomass, creature body mass, magma/core reservoirs.
  4. **Subsystem Conservation Contracts:**
     - **Mining/Excavation:** Displaced solid stratum mass transfers exactly to loose rubble/ore item mass.
     - **Logging/Harvesting:** Plant biomass transfers into logs, branches, stumps, crop food, and seeds.
     - **Fauna/Digestion:** Consumed food transfers to creature body mass and waste; death transfers body mass to corpse, meat, bones, hide, and decay products.
     - **Smelting/Burning:** Wood/ore mass transfers exactly into metal, slag, ash, and smoke/combustion gases.
  5. **Magma & Planetary Core as Mass-Bearing Reservoirs:**
     - Lava is a mass-transfer and transformation system, not a deletion sink.
     - Matter engulfed by lava melts/decomposes into magma mass, dissolved minerals, and volcanic gases/ash.
     - Magma reservoirs track mass, temperature, pressure, density, viscosity, volatile load, and composition.
     - Magma outputs (eruptions, intrusions, basalt ridges, ash clouds, geothermal deposits) transfer mass out of the magma reservoir with exact balance.
     - Deep Earth ($Z \in [-16 \dots -11]$) interfaces with an aggregated mantle/core reservoir beneath the playable 32-Z stack. The planetary core is not an infinite material faucet.
- **Owner Clarification (2026-09-29, given directly to Claude Code in chat): scope and intent.** Where this differs from the summary above, this governs. Owner's words: "The mass conservation is specifically for natural world materials like Stone, iron, copper, etc"; "Anything that is generated with the world, it's mined, crafted, etc, rusts, breaks, eventually reclaimed by the world, and across that timeline the mass stays the same, so that reclaimed items end up becoming the same amount [of] earth ... its not meant to [hamstring] soil because soil weighs more than sand"; "Water, yes ... Plants, creatures, gases are not as important. The intent is that water, lava, and the natural world are able to erode, reclaim, and keep the natural world going so it doesnt eventually become a million crafted items because nothing ever degrades ... But that degradation has to form a world of equal mass as the world it came from ... its not a semantic chemistry/physics thing to complicate soil."
  - **Purpose:** the natural world renews itself. Water, lava and natural processes erode, degrade and reclaim what is mined, built or crafted, and what they reclaim returns as the same weight of natural material.
  - **Conserved:** material generated with the world (stone, soil, sand, clay, ores, and metals such as iron and copper) through its whole life (mined, crafted, rusted, broken, reclaimed), plus water. Lava and magma remain transfer paths (item 5).
  - **Out of scope:** plants, creatures and gases are not part of this rule. The Owner, correcting an earlier "lower priority" wording the same day: "I dont care about these. thats not my intent."
  - **Weight, not chemistry:** the ledger counts weight. Material type, volume and density may change along the way; soil weighs more than sand. This is not a chemistry or physics exercise and must not complicate soil.
  - **Blocking defects:** material or water that appears from nothing, or disappears without a destination.

---

### Decision `DEC-041`: 24/7 Multi-Agent Orchestration Architecture & Natural World v1 Exit Gate
- **Date Logged:** 2026-09-28
- **Record status (2026-09-29):** LIVE. The Owner asked on 2026-09-29 for fewer approval loops and questionnaires; item 5's package gate stands until the Owner changes it.
- **Status:** `DECIDED` (Owner Directive 2026-09-28)
- **Decider:** Owner
- **Summary:**
  1. **Campaign & Execution Architecture:**
     - `/teamwork-preview`: Multi-day Natural World campaign coordinator.
     - `/goal`: Bounded current task objectives (single-lane completion through review, gate, and merge).
     - `/schedule`: Idempotent 5-minute watchdog pulse (`*/5 * * * *`).
  2. **Watchdog Idempotency & Per-Lane Leases:**
     - Every pulse verifies: worker active (PID + output stream), review active, merge in progress, SHA reviewed, lane merged, Owner approval present.
     - If an active lease exists, the watchdog observes; it never launches duplicate workers or reviews.
     - If rate-limited, records timestamp in `provider_status.json` and sleeps until reset without spinning context.
  3. **Strict Lane Exit States:** Every lane terminates in exactly one of: `MERGED`, `REJECTED`, `SUPERSEDED`, or `PAUSED-BLOCKED`.
  4. **Automated Worktree Archiving:** Worktrees are removed (`git worktree remove`) ONLY after merge SHA, remote push, review evidence, and task report are safely recorded on `main`.
  5. **Hard Owner Package Gates:** Orchestration autonomously advances approved leaves through `Writer -> Verify -> Review -> Merge Gate -> Main`. However, upon package completion (e.g. Package 3 Water -> Package 4 Soil), it produces read-only preflight and proposal, then HALTS for explicit Owner approval before opening implementation lanes.
  6. **Single Machine-Readable Canonical Registry:** Master truth resides in `tasks/wbs_registry.json`. Markdown WBS and `docs/STATUS.md` derive from or reference this registry.
  7. **Natural World v1 Exit Gate (Final 12-Point Scenario):**
     Before final Natural World v1 sign-off, a fixed-seed in-engine scenario must prove:
     1. World topology survives region seams and save/load cycles;
     2. Physical world objects remain persistent;
     3. Excavation exposes predetermined geological strata;
     4. Unsupported terrain triggers cascading collapse into rubble;
     5. Groundwater breach produces conserved Darcy seepage;
     6. Groundwater and surface water hydrate soil moisture;
     7. Terrain elevation and volcanism dynamically drive continuous climate;
     8. Soil moisture, light, and temperature govern plant germination and growth;
     9. Vegetation biomass determines herbivore carrying capacity;
     10. Wildlife populations persist and reproduce rather than arbitrarily respawning;
     11. Full region unload and reload reproduces bit-identical state;
     12. Quiescent sleep guarantees zero global full-world per-frame scans.


---

### Decision `DEC-042`: Claude Code is the current PM
- **Date Logged:** 2026-09-29
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-29: "You are the current PM")
- **Decider:** Owner
- **Summary:** Claude Code holds the PM role from 2026-09-29: it interprets Owner intent, records Owner decisions in this file, opens and closes lanes (`[pm]` commits to `tasks/<id>/<lane>/lane.json`, which `tools/governance/merge_gate.js` trusts), routes review, and presents QA-passed art to the Owner for sign-off (DEC-007 amendment). Gemini / Antigravity remains the coordinator for its own worker fleet and keeps the integration duties it already has; the merge gate stays the only way into `main` for reviewed code. Where `docs/CANONICAL_ROLES.md` or older briefs say otherwise, this decision governs until the roles document is rewritten. Zero self-certification still applies to the PM: the PM never reviews its own family's code.

---

### Decision `DEC-043`: Construction and crafting model (recorded design; implementation deferred)
- **Date Logged:** 2026-09-29
- **Record status (2026-09-29):** LIVE as recorded design; implementation DORMANT under DEC-037.
- **Status:** `DECIDED` as design direction (Owner, in chat with Claude Code, 2026-09-29). **Not a lane authorization:** building and crafting are civilization systems and stay frozen under DEC-037 until the Owner opens them.
- **Decider:** Owner
- **Summary (Owner's words, lightly trimmed):** "The way building will work, is there will be a 'Ghost model' when there is intent to build. The ghost model will also have a black box inventory like a creature. Once the correct construction items are placed in the ghost model, you can click 'Construct', the model will become 'the under construction model' and then once construction is complete, there will be the final model. Crafting works the same way. Say there's a workbench, there will be a black inventory box on the workbench, and then the opportunity to 'combine', the creature will make a craft attempt. All of this bears in mind skill checks using SRD."
  1. **Three build states per structure:** ghost (intent), under construction, final. Each is a distinct model.
  2. **Ghost model inventory:** a ghost holds a black-box inventory like a creature's; construction begins ("Construct") only when the required items are inside it.
  3. **Crafting is the same pattern at a workbench:** the workbench has a black-box inventory; "Combine" makes the creature attempt the craft.
  4. **Skill checks:** construction and craft attempts use SRD 5.1 skill checks (DEC-039).
  5. **Closed mass (DEC-040):** the items placed in a ghost or workbench are the material of the result; nothing is created from nothing.
- **Art implication (when opened):** every buildable structure needs ghost, under-construction and final art; every workbench needs an interior-inventory presentation. Catalogue records first, per DEC-007.

---

### Decision `DEC-044`: PixelLab is the sole production generator (AS-GEN-004 / AS-GEN-005)
- **Date Logged:** 2026-09-29 (ruling given 2026-09-26 15:44 CT; until now recorded only in `docs/art/DEUS_ASSET_STANDARD.md`)
- **Record status (2026-09-29):** LIVE.
- **Status:** `DECIDED`
- **Decider:** Owner (2026-09-26 15:44 CT, encoded as AS-GEN-004 by WG.20.01 commit `282def92`; AS-GEN-005 is the one-generator-per-set rule stated inside that ruling)
- **Ruling, as the asset standard records it:** "PixelLab is the primary generator for every category. Retro Diffusion is standby and is not assigned to a category. Nano Banana Pro is for concepts only and is not a production generator. The multi-generator bake-off is off." One generator per category and per layered set, and that generator is PixelLab: a paper-doll set or a creature family carries that one id, a set whose members disagree fails, and Retro Diffusion and Nano Banana Pro are not mixed into a layered set. A style LoRA or fine-tune is `optional-later` and needs an Owner decision after approved art exists.
- **Relation to other decisions:** DEC-007 decides whether art may be generated at all (frozen, except the 2026-09-29 PixelLab OBJECTS/MAPS opening for the natural world). DEC-044 decides which generator: PixelLab only. AGENTS.md Rule 11 and the CLAUDE.md Nano Banana Pro mandate stay suspended under DEC-007 and, when rewritten, follow this decision. Every PixelLab prompt uses the high top-down view (AS-VIEW-002; DEC-007 amendment of 2026-09-29).
