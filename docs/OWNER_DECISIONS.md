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
- **DEC-011 Amendment Note (Owner Directive 0021-V Addendum §19, 01:28 CT):** Owner wants all nine depth cues eventually; 1:1 correctness first. Cues 1–6 (visible inner side walls of openings, rim shadows, darker baked tile palettes, height edges/ramps, hanging/falling props, deep light sources) are art/draw-order only and in scope under DEC-011. Cues 7–9 (depth parallax, code-applied haze/darkening, slight scale-down) amend DEC-011 and are approved in principle for an Owner-led review session after Lanes K and N land and 1:1 correctness is verified; each will be an independent toggle off by default with measured benchmark cost.
- **DEC-011 Amendment Note (Owner Requirement 2026-09-26 11:31 CT, Directive 0083-CF):** When looking down through layers, every visible lower layer shows its effects, HP bars, status indicators, and other combat or spell overlays, not just terrain and sprites. Under DEC-011, these overlays render at 1:1 scale with zero filters (no blur, tint, fog, desaturation, or scaling applied to them).
- **DEC-011 Amendment Note (Owner Requirement 2026-09-26 11:32 CT, Directive 0084-CG):** Multi-unit selection and group orders operate across layers. The player can select units on several layers at once and give them orders together (for example, box-select through visible lower layers, or add units from other layers to the current selection with modifier-click or modifier-box).

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
- **Amendment Note (2026-09-26, Directive 0035-AJ D-2 & D-3):**
  - **D-2 Stratum/slice thickness is 2 ft:** A layer is 10 ft = 5 slices of 2 ft; squares are 5 ft. Stale code references to 1-ft strata and 5-ft levels (audit F-01) are superseded; WG.00.17 aligns all feet conversions (`Z_STEP_FEET`, blast geometry).
  - **D-3 Sparse storage is mandatory in-memory as well as in saves:** Uniform columns stored compactly (run-length), levels allocated on demand, bounded 3D path-search scratch (audit F-02). WG.00.17 DoD enforces the in-memory layout.

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

---

### Decision `DEC-016`: The scale chart is the governing size authority for the art catalogue, templates and placement
- **Date Logged:** 2026-09-26
- **Decider:** Owner (00:11 CT, "the most important is the scale chart"; relayed by PM 0019-S/0028-AC)
- **Status:** `DECIDED`
- **Ruling:** Every catalogue entry's pixel size, envelope, footprint and anchor derive from the scale chart (`art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`, whose numeric source is `game/data/DEUS_ScaleRegistry.json`; the two are not independent evidence), citing one chart row per entry. The catalogue builder (`tools/art/build_catalogue.js`), template generator (`tools/art/make_blank_templates.js`) and placement validator (`tools/art/validate_art.js`) enforce it. Disagreements with other documents go to the Owner and are never resolved by workers. Sim distances (DEC-013 geometry) govern the simulation. Where geometry and chart imply different px/ft, it is an Owner question (`stratumPx`).
- **Open:** If "the scale chart" means a different file, the Owner names it and DEC-016 is amended.

---

### Decision `DEC-017`: Keep RMMZ for menus, dialogue, saving, database and battle; fallback map renderer is a custom multi-layer PixiJS renderer inside RMMZ, decided after demo benchmarks
- **Date Logged:** 2026-09-26
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
- **Status:** `DECIDED` (Owner ruling 01:21 CT, directive 0021-V Addendum §16)
- **Decider:** Owner
- **Summary:**
  1. **Seamless Transitions:** Ramps and slopes carry units continuously from one layer to the next. A ramp is a run of cells rising one stratum per cell (5 cells = one 10 ft layer). At the top stratum, the unit's Z becomes Z+1 with zero screen transfer, fade, or pause. Depends on Lane N (in-place layer switch) and DEC-019 stratum height offsets.
  2. **Camera-Follow Default:** When the player unit crosses a ramp boundary between layers, the camera view automatically follows the player's current layer. Non-player units crossing simply transfer layer membership lists (Lane K per-frame membership refresh).
  3. **Pathfinding & Construction:** Multi-Z pathfinding treats ramps, stairs, and ladders as traversable layer connectors. Colonists can build ramps. Art catalogue adds ramp/slope pieces per terrain (placeholders only; DEC-007).

---

### Decision `DEC-021`: Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 01:24 CT, directive 0021-V Addendum §18)
- **Decider:** Owner
- **Summary:**
  1. **Occlusion Culling Rule:** Any cell, entity, prop, or effect covered by an opaque upper layer is not drawn at all.
  2. **Bounded Draw Cost:** Draw cost is strictly bounded by exposed visible screen area (VISION V133), NOT by total layer count. For each screen column/cell, rendering traverses only from the currently viewed layer downward to the first opaque surface; cells under solid cover cost zero.
  3. **Benchmark Requirement:** Applied in Lane K follow-up, the 32-layer refactor, and future overlook view. Benchmark target: the stress scene with 32 layers must cost approximately the same frame time as with 5 layers when upper layers are solid.

---

### Decision `DEC-022`: Cross-Layer 3D Targeting, Ballistics, and Volume Damage
- **Date Logged:** 2026-09-26
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
- **Status:** `DECIDED` (Owner ruling relayed by PM, Directive 0035-AJ §1)
- **Decider:** Owner
- **Summary:**
  1. **Finite Minerals:** VISION rules V74, V83, INV-SIM-03, and LIFE-002 stand as binding law. Ore, stone, and gem deposits are finite in the geological stratum.
  2. **Bug Removal:** Sprouting of ores, stones, and gems over time in `DEUS_Ecology.js` (audit VEG-1, F-03) is classified as a code defect to be removed in `SIM.50.12`.
  3. **No Spontaneous Regeneration:** Minerals do not respawn silently. Any reintroduction of materials must occur solely through closed-loop mass conservation / erosion / reclamation mechanics (see DEC-028).

---

### Decision `DEC-024`: Unified Water Simulation Authority (`DEUS_Fluid`) & Legacy Flood Retirement (Ruling D-4)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED (PM)` (Owner may object; Directive 0035-AJ §1)
- **Decider:** PM (Grok Bot)
- **Summary:**
  1. **Single Water Authority:** The physical fluid solver `DEUS_Fluid` is established as the sole authoritative water simulation system in Project DEUS.
  2. **Retirement of Volume-Less Flood Fill:** The legacy flood-fill mechanism in `DEUS_Levels.js:3389` that generated water without conserved volume (audit WAT-1, F-05) is retired.
  3. **Reconciliation:** All four disparate water stores (WAT-5) converge onto `DEUS_Fluid`. The integration is validated in Playtest (F5) with `window.UF.Fluid`.

---

### Decision `DEC-025`: Nine SRD Culture and Faction Development Plans (Ruling D-6)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED (PM)` (Owner may object; Directive 0035-AJ §1)
- **Decider:** PM (Grok Bot)
- **Summary:**
  1. **Nine Culture Plans:** Each of the 9 SRD 5.1 races (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling per `game/data/srd51/character_options.json`) receives its own dedicated culture and faction development plan (DEC-015, SOC.10.03 slots).
  2. **Catalog Expansion:** Expands the world catalog culture templates from 7 to 9.
  3. **Layer Mapping:** Specific race-to-home-layer assignments remain `OPEN` (DEC-013).

---

### Decision `DEC-026`: Calendar Scale vs Solar Day (`OWNER_OPEN`, Ruling D-1)
- **Date Logged:** 2026-09-26
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
- **Status:** `DECIDED` (Owner ruling 08:20 CT, Directive 0062-BK)
- **Decider:** Owner
- **Summary:**
  1. **Authoritative Combat Law:** DEUS combat mechanics are canonically governed by SRD 5.1 rules — d20 attack rolls vs Armor Class (AC), SRD damage dice, SRD stat blocks/hit points, initiative, action economy, and conditions.
  2. **Retirement of V64:** VISION rule V64 (OSRS-style accuracy/strength combat) is formally RETIRED. Rule V47 is reinstated as the authoritative combat specification.
  3. **Data & Engine Integration:** The SRD 5.1 dataset in `game/data/srd51/` is authoritative for combat resolution. Rules are evaluated behind `UF.Rules` with pure, deterministic, seeded dice logic compatible with headless simulation under ADR-003.

---

### Decision `DEC-028`: Matter Conservation by Weight & Closed-Loop World Reclamation
- **Date Logged:** 2026-09-26
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
- **Status:** `DECIDED` (Owner ruling ~07:40 CT, Directive 0060-BI)
- **Decider:** Owner
- **Summary:**
  1. **In-Tree Remediation:** Incident `SEC-2026-09-26-01` (hardcoded API key literal committed in historical commit `224b1b36`) is resolved in-tree via Lane Z security tooling (`OPS.70.02`), removing the fallback and redacting references.
  2. **History Purge Declined:** The Owner explicitly DECLINED git history purges, filter-repo, or forced pushes on `origin/main` to preserve absolute commit immutability.
  3. **Revocation Authority:** Credential revocation is handled directly by the Owner externally.



### Decision DEC-030: World Grid and Vertical Biomes (Owner & PM delegated, 2026-09-26)
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
