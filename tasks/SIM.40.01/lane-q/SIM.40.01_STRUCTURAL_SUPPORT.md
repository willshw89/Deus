# SIM.40.01 Structure, material and support/collapse design (docs only)

| | |
|---|---|
| Task | SIM.40.01, support model design and blast propagation (`docs/worldgen/DEUS_WORLDGEN_WBS.md:534`), plus the material-and-structure model that the SIM.50.01 audit §6 step 5 names as SIM.40.01's unlisted prerequisite, and the hooks SIM.40.02-.04 need |
| Lane / branch | lane-q, `task/lane-q` |
| Writer / reviewer | Claude (writer). Grok reviews independently later; nothing in this file is reviewed or approved |
| Base commit | `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` (origin/main when the PM opened the lane). The worktree HEAD when writing started was `bedb03c2fe0013316b98037a48504e18551563e8`; `git diff --stat 84ee3b55 HEAD` lists only files under `tasks/SIM.40.01/lane-q/`, so every `game/`, `docs/`, `tools/` and `archive/` citation below holds at the base commit |
| Kind of work | Design only. No file outside `tasks/SIM.40.01/lane-q/` was changed. No code, script or test is committed. No art was generated, drawn, requested or integrated (DEC-007) |
| Status | PROPOSED. Every number is a tuning proposal. Every new work item is `PROPOSED-Q-NN`, not a WBS ID |

## 0. Header: inputs, method, limits, dependencies

### 0.1 Inputs read

- **Audit:** `docs/audits/LIVING_WORLD_GAP_AUDIT.md` (SIM.50.01; the audit cites code at `75cf2ff3`). Sections read in full: §1, §2.1-§2.7, §3.7, §3.8, §3.9, §4.1-§4.3, §5, §6, §7, §8, §9, §10, Appendix A and B.
- **WBS:** `docs/worldgen/DEUS_WORLDGEN_WBS.md` Rev 25 (`:3`): WG.00.17 (`:105`), WG.63.04 (`:210`), WG.65.15 (`:254`), WG.65.16 (`:255`), SIM.00.00-.06 (`:519-525`), SIM.30.01-.05 (`:529-533`), SIM.40.01-.10 (`:534-543`), SIM.50.02-.10 (`:545-553`), SIM.60.01-.04 (`:559-562`), GP.07.02 (`:578`). `docs/society/DEUS_SOCIETY_WBS.md` was checked for SOC rows that touch buildings; only SOC.10.03 (plan data, a SIM.50.08 dependency at `DEUS_WORLDGEN_WBS.md:551`) matters here.
- **Decisions:** `docs/OWNER_DECISIONS.md` DEC-010 (`:137-147`), DEC-011 (`:150-157`), DEC-012 (`:161-168`), DEC-013 (`:172-195`), DEC-014 (`:199-208`), DEC-015 (`:212-226`), DEC-018 (`:251-263`), DEC-019 (`:267-278`), DEC-020 (`:282-289`), DEC-021 (`:293-300`), DEC-022 (`:304-312`).
- **VISION:** V74 (`docs/VISION.md:84`), V83 (`:94`), V95 (`:106`), V133 (`:127`), V136 (`:130`), V137 (`:131`), V138 (`:132`), V139 (`:133`), V140 (`:134`), V141 (`:135`), V142 (`:136`); V123 and V128 are decision-log entries (`:338-342`, `:365-367`).
- **Invariants and risks:** INV-SIM-02 and INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:52-53`); LIFE-001..004 (`docs/RISK_REGISTER.md:60-63`); NAT-003 (`docs/RISK_REGISTER.md:74`).
- **Design docs (read only):** `docs/design/DURABILITY.md` (§0, §1, §4.4, §7.1, §9.3, §11), `docs/design/VERTICAL_WORLD.md` (§5.2, §5.4), `docs/design/VERTICAL_BUILD_PLAN.md` (§7.2-§7.4), `docs/design/TERRAIN_LEVELS.md` (§3.3), `docs/design/VERTICAL_NATURAL_WORLD.md`, `docs/design/REMAINS.md`, `docs/design/WORLD_ARCHITECTURE.md`, `docs/design/TECH_TREE.md` (searched for support, collapse, span and scale terms). Disagreements are listed in §0.5.
- **Code (read only, cited at the base):** `game/js/plugins/DEUS_Levels.js` (strata header `:985-1060`, `writeCell` `:1537-1572`, `setStrata` `:1579-1622`, damage `:1640-1760`, `applyVolumeDamage` and `sphereDamage` `:1764-1855`, adapters to `effectiveSupport` `:1860-1950`, floating-rock pass `:2695-2721`, caps `:2780-2877`), `DEUS_Jobs.js` (mine `:446-484`, build `:700-734`), `DEUS_Interact.js` (dig `:53`, `:155-170`, `:252-262`), `DEUS_Floors.js` (`:33`, `:198-278`), `DEUS_Walls.js`, `DEUS_Doors.js` (`:85-96`, `:438-452`), `DEUS_Colonists.js:3733-3736`, `DEUS_Fluid.js:941-944`, `DEUS_World.js:255`.
- **Data:** `game/data/DEUS_WorldCatalog.json` (materials `:4563-4900`, rubble `:2091`, rubble_pillar `:2111`, wall_wood `:2150`, wall_stone `:2191`, bridge `:2408`, doors `:2445`, `:2490`, `:2535`, bed_wood `:2771`, wall_timber_frame `:3053`, wall_brick `:3098`, wall_ashlar `:3143`, items `stone` `:3214`, `log` `:3193`, `brick_clay` `:4441`, `mortar_lime` `:4455`, `stone_block` `:4469`, `plank_dressed` `:4483`).
- **SRD 5.1 (`game/data/srd51/`):** `rules.json` entries `srd:rule:objects` (`:7126`), `srd:rule:objects-statistics-for-objects` (`:7155`, object AC, object HP, damage types, damage threshold, Huge and Gargantuan objects), `srd:table:object-armor-class` (`:6950`), `srd:table:object-hit-points` (`:7013`), `srd:rule:adventuring-the-environment` (`:4390`, falling, suffocating), `srd:rule:spellcasting-casting-a-spell` (`:5012`, areas of effect expand in straight lines; total cover blocks them), `srd:rule:combat-cover` (`:4782`). `spells.json` entries fireball (`:7539`), shatter (`:14745`), earthquake (`:6379`), disintegrate (`:5855`), wall-of-stone (`:17309`), wall-of-ice (`:17237`), move-earth (`:12101`), stone-shape (`:15745`), passwall (`:12236`), meteor-swarm (`:11669`).
- **Sibling and proposed inputs (unreviewed or not on main):**
  - ADR-003 Rev 3, `origin/task/lane-m:docs/adr/ADR-003_sim_render_split_and_lod.md` (commit `2e32f596`; a Grok review commit `9e0ef94d` on that branch). It is not on main at the base, so this design cites it as **PROPOSED** (§0.4).
  - Lane P's SRD spell-effect audit, `origin/task/lane-p:docs/audits/SRD_SPELL_EFFECT_AUDIT.md` (tip `352d1983`), unreviewed input for primitive names (`volumeDamage`, `terrainEdit`, `conjureMatter`, `forceBarrier`).
  - Lanes R (SIM.40.05 decay) and W (SIM.40.10 population): at the time of writing their branches hold only their BRIEF and `lane.json` (`origin/task/lane-r` tip `d9766aa2`, `origin/task/lane-w` tip `31892ae7`). The interface with Lane R is written here as explicit assumptions (§6).

### 0.2 Method

1. Read the audit rows for this lane and re-checked every code line this document cites at the base commit. The audit cites `75cf2ff3`. Between `75cf2ff3` and the base only `DEUS_Levels.js` (from line 4175 on) and `DEUS_World.js` changed (`git diff --stat 75cf2ff3 84ee3b55 -- game/`), so the audit's `DEUS_Levels.js` citations below line 4175 still hold; the self-test caller of `applyVolumeDamage` moved from `:5682` to `:5732`.
2. Absence claims come from `git grep` at the base, each with its exit code (1 = no match): `fallDamage|unitFell|fallThrough` (exit 1), `porosit|permeab|loadCapacity|maxLoad` (exit 1), and a strata `rubble` material in `DEUS_Levels.js` (exit 1). The commands are in REPORT.md.
3. Numbers: masses are density × voxel volume; spans come from a cantilever self-weight bending estimate (§3.3); both were computed with an ad-hoc `node -e` run that is not kept. SRD numbers are quoted from the files above; where the SRD has no number the table says **extrapolated**.
4. Every mechanism states: rule; data read and written with its sparse representation; trigger; ledger entries; CPU per tick and memory at 32 layers; what the SRD says.

### 0.3 Limits

- Nothing was run in NW.js, the RMMZ editor or a headless core. No performance was measured: every memory and CPU figure is arithmetic from stated assumptions.
- The numbers are physically motivated, not play-tested. The Owner questions in §13 ask for the feel.
- The design is written against the core layout that ADR-003 proposes. If that ADR changes, the mechanism stays and the hosting module changes.

### 0.4 Dependency on PROPOSED ADR-003

This design uses the following ADR-003 Rev 3 assumptions (section numbers are the ADR's). If the ADR changes, each item below needs re-checking:

| # | Assumption taken from ADR-003 (PROPOSED) | Used in |
|---|---|---|
| A1 | A headless core with a 10 Hz tick; 1 tick = 36 game-seconds; 1 game hour = 100 ticks; 1 game day = 2,400 ticks (ADR §3.1-§3.2) | §4, §5, §6 durations |
| A2 | One ordered system list per tick (ADR §3.8); this design adds support, collapse and talus slots | §4.6, §10.4 |
| A3 | Chunked storage: a chunk is 32 × 32 cells of one layer, UNIFORM (no arrays) or MIXED (arrays allocated on first write) (ADR §15.3) | §9 |
| A4 | Regions are 32 × 32 cells × one slab of two layers; levels L0/L1/L2; dormant regions cost nothing (ADR §5.1-§5.5) | §4.5, §9.5 |
| A5 | A ledger with `transform`, `source`, `sink` and Q-MASS per family (ADR §7.8-§7.9); SIM.40.01 sets the per-material mass tables "with WG.65.15" | §8 |
| A6 | Integer distances in half-feet: cell 10, stratum 4, layer 20 (ADR §15.0) | §7 |
| A7 | Volume damage as one core system with shells, parents and a per-mille pass table that SIM.40.01 fills in (ADR §18.2, Q18) | §7 |
| A8 | A change feed and command queue (ADR §4.3-§4.4) | §10 |
| A9 | Every core test runs at the 9-layer test range (-4..+4) and the 32-layer default (ADR §15.2) | §11 |

Before the core exists, the same rules can run inside the legacy `DEUS_Levels.js` writer, because every trigger in this design is the existing `levels:strataChanged` event (`DEUS_Levels.js:1558`). Where the legacy path differs it is said.

### 0.5 Where existing documents disagree with DEC-013, V137 or the audit

| Document | What it says | Conflict | This design |
|---|---|---|---|
| `docs/design/VERTICAL_BUILD_PLAN.md:445` | "Always supported: every natural cell; every ground (z 0) cell." | V137 (`docs/VISION.md:131`) and SUP-1 need natural rock to fail when undercut; the brief asks for cave-ceiling spans | Natural rock has spans (§3.3). DEC-010 stays an Owner question (OQ-Q-01) |
| `docs/design/VERTICAL_BUILD_PLAN.md:447` | Built floors join a component supported within `support.maxSpan` (3) BFS steps | A single span for every material; five levels | Span per material and thickness (§3.3) |
| `docs/design/VERTICAL_BUILD_PLAN.md:454` | Fall damage `fall.hpPerLevel × levels fallen` | Levels are 5 ft in that plan; DEC-013 layers are 10 ft; SRD gives 1d6 per 10 ft | SRD falling per 10 ft (§5.5) |
| `docs/design/TERRAIN_LEVELS.md:206` | "Natural cells are always supported ... so hills never collapse. Digging a tunnel into a hill at z=0 leaves the +1 floor above it standing" | Same as the first row | A soil tunnel with less than 20 ft of soil above it needs props (§3.3, OQ-Q-12) |
| `docs/design/VERTICAL_WORLD.md:210` (§5.4) | "At z=-2, the bottom boundary is solid" | Five levels; DEC-013 bottom is -16 | The bottom is `zMin` (§3.2) |
| `docs/design/DURABILITY.md:716` | Collapse deals `collapse.damage (20) × levels fallen` | Levels of 5 ft; not SRD | SRD earthquake and falling numbers as the baseline (§5.5) |
| `docs/design/DURABILITY.md:53` | "A dismantled wall gives back 75% of its materials" | The other 25% vanishes (LIFE-001) unless it becomes debris | The remainder becomes loose debris (§8.2) |
| `docs/design/DURABILITY.md:560` | The quarried stone wall gives 2 stone and `becomes: null` | Fixes the 2-in-4-out leak but is silent on where the wall's mass goes when broken by force (`:558`: "gives no pieces") | Breaking by force converts the wall's strata to rubble of equal mass (§5.3) |
| `docs/design/REMAINS.md:86` | Falling bodies: "`landingZ(cell)` is `z` today" | No falling exists | Units fall to the first supporting stratum (§5.5) |

## 1. Conventions

- **Voxel.** One stratum of one cell: 5 ft × 5 ft × 2 ft = 50 ft³ = 1.41584 m³ (DEC-013 item 2, `docs/OWNER_DECISIONS.md:178-181`). A cell's column of one layer is five voxels S0 (bottom) .. S4 (top).
- **Elevation index.** `e = (z − zMin) × 5 + s`. At -16..+15 it runs 0..159; at the 9-layer test range 0..44. Never the legacy 0..24 (`DEUS_Levels.js:2010`).
- **Mass unit.** 1 kg, integer, in every ledger entry (§8). Water keeps the fluid depth unit (§8.1).
- **Stale model marker.** The code today has 5 levels (-2..+2) of five 1 ft strata (`DEUS_Levels.js:61`, `:985`, `:993`; audit F-01). Where a number here would differ under that model it is marked **[STALE-1FT: ...]** with the value it would have. Nothing in this design relies on the stale model.
- **Plugin paths.** A bare plugin name (`DEUS_Levels.js:1558`) means `game/js/plugins/DEUS_Levels.js`; other paths are from the repo root.
- **Durations.** Action-domain durations are in ticks (A1). Slow durations are in "years of simulated time" with the D-1 mapping table in §6.6. D-1 is OWNER_OPEN and this design does not choose it.

## Material model

### 2.1 Today's materials (the gap, audit §2.4 and §6 step 5)

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:994` | `const M_AIR = 0, M_STONE = 1, M_SOIL = 2, M_WOOD = 3, M_WATER = 4, M_LAVA = 5;` | Six strata materials. |
| `DEUS_Levels.js:995` | `const M_BUILT = 0x80, M_ID = 0x3f;` | A 6-bit id (64 ids, 58 free) and a constructed flag. |
| `DEUS_Levels.js:1016` | `const m = (v & 0x40) === 0 ? STRATA_MATERIALS[v & M_ID] : null;` | Bit 0x40 is treated as invalid, so the id space is exactly 0..63. |
| `DEUS_Levels.js:1000` | `// Material table. Diagnostic values, not balanced:` | Placeholder numbers. |
| `DEUS_Levels.js:1005` | `{ id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble", ...` | Properties are only solid, fluid, maxHP, support (0..1), debris (a name) and resist per damage type. |
| `DEUS_Levels.js:1002` | `// leaves, reported in levels:strataDestroyed (no item drops in 19A).` | Debris is a label, not matter (SUP-3). |
| `DEUS_Levels.js:1942` | `function effectiveSupport(a, b, c, d, e) {` | Support is a per-cell diagnostic sum with no propagation (SUP-1). |
| `game/data/DEUS_WorldCatalog.json:4754` | `"density": 2.75,` | The catalogue has per-rock density, compressive strength, fracture and weather resistance (granite shown) that no strata code reads. |
| `game/data/DEUS_WorldCatalog.json:4893` | `"corrosionResistance": 30,` | Iron's corrosion value; unread (audit DEC-2). |

What support, collapse, decay and fire need that is missing: mass per voxel; load capacity; span capacity by thickness; a loose class that can bear but never span; porosity and permeability; flammability and ignition; weathering, rot and corrosion inputs; the SRD object AC and HP link; and matter-bearing debris materials (rubble, loose fill, sediment, ash, ice, scrap, oxidised trace, broken timber, dust). The audit's greps for `porosit|permeab`, `loadCapacity|maxLoad` and a strata `rubble` have no hits (re-run at the base, exit 1).

### 2.2 The property set

Every material id gets these properties (all integers, so the core stays float-free, A6):

| Property | Unit | Used by |
|---|---|---|
| `class` | `air`, `fluid`, `natural`, `loose`, `assembly` | every system |
| `family` | Q-MASS family: `mineral`, `organic`, `water`, `metal:<element>` (§8.1) | ledger |
| `kgPerVoxel` | kg in one full voxel (for loose materials: one full loose voxel; the exact mass lives in the loose record, §2.6) | ledger, load |
| `srdAC` | SRD object AC | weapon attacks on structures (V95) |
| `maxHP` | SRD hit points per voxel | damage, decay |
| `dt` | damage threshold (SRD rule, `rules.json:7155`); damage from one effect below it does nothing | blasts, attacks |
| `spanBase[t]` | cells a member of thickness t strata may reach from its nearest bearing member (§3.3) | support |
| `ratedLoadKg` | superimposed load one spanning cell carries at full HP | support |
| `bearingKg` | load one bearing voxel-cell carries before crushing; `null` = never checked | support |
| `perm` | permeability class 0 (tight) .. 6 (open) | SIM.50.02 seepage |
| `flam` / `ignitePts` | flammability class 0..5 and the fire damage that ignites it | SIM.50.05, blasts |
| `weather` | the catalogue field and value that drives decay (Lane R) | SIM.40.05 |
| `debris` | the loose material the voxel becomes when destroyed | collapse, blasts |
| `repose` | loose only: the largest height step to a neighbour, in strata | talus (§5.4) |

### 2.3 Natural materials

Natural rock resolves its type today through the seeded geology function (`DEUS_Jobs.js:464-466` reads `G.geologyAt(gx, gy, zOf(job.target))` for mined stone). This design gives each rock type its own id so that a voxel, its rubble and its ledger line know their rock without a geology call. Generic `stone` (id 1) stays for legacy saves and resolves through `geologyAt` exactly as today.

Voxel mass = catalogue density × 1,415.84 kg per t/m³. Spans are `spanBase[t]` for thickness t = 1, 2, 3, 5, 10, 20, ≥40 strata (§3.3).

| Id (proposed) | Key | kg/voxel | SRD AC | maxHP | DT | spanBase t=1,2,3,5,10,20,≥40 | ratedLoadKg | bearingKg | perm | flam | Weathering input | Debris |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (exists) | stone (generic, legacy) | as its `geologyAt` rock | 17 | as its rock | 10 | as its rock | as its rock | null | as its rock | 0 | as its rock | rubble |
| 32 | granite | 3,894 (`DEUS_WorldCatalog.json:4754`, 2.75) | 17 | 255 | 10 | 2,3,3,4,6,9,12 | 20 × kg | null | 0 | 0 | weatherResistance 95 | rubble |
| 33 | basalt | 4,106 (`:4773`, 2.9) | 17 | 240 | 10 | 2,3,3,4,6,9,12 | 20 × kg | null | 1 | 0 | 90 | rubble |
| 34 | slate | 3,752 (`:4791`, 2.65) | 17 | 210 | 10 | 1,2,3,4,5,8,11 | 20 × kg | null | 0 | 0 | 90 | rubble |
| 35 | marble | 3,823 (`:4810`, 2.7) | 17 | 150 | 10 | 1,2,3,4,5,8,11 | 20 × kg | null | 0 | 0 | 65 | rubble |
| 36 | limestone | 3,256 (`:4717`, 2.3) | 17 | 120 | 10 | 1,2,3,3,5,7,11 | 20 × kg | null | 2 | 0 | 50 | rubble |
| 37 | sandstone | 2,973 (`:4736`, 2.1) | 17 | 105 | 10 | 1,2,2,3,4,6,9 | 20 × kg | null | 3 | 0 | 45 | rubble |
| 2 (exists) | soil | 2,265 (1.6 t/m³, extrapolated; no catalogue density) | 10 (extrapolated) | 40 (today `DEUS_Levels.js:1006`) | 0 | 0,0,0,0,1,1,2 | 2 × kg | 35,000 | 3 | 0 | none (erosion is SIM.50.03) | loose_fill |
| 3 (exists) | wood (natural, e.g. a giant trunk) | 1,062 (oak 0.75, `:4611`) | 15 | 60 (today) | 5 | 1,1,2,2,3,3,3 | 5 × kg | 40,000 | 4 | 3 | rotResistance (oak 75, `:4616`) | broken_timber |
| 10 (new) | ice | 1,298 (0.917 t/m³) | 13 | 15 | 0 | 2,3,3,4,6,9,12 | floating: 3.5 × h_cm² (§3.3) | null | 0 | 0 | melts (SIM.50.06) | ice rubble = loose ice, then melt |
| 4, 5 (exist) | water, lava | fluid (§8.1) | — | 0 | — | — | — | — | — | lava ignites | — | — |

- **HP.** SRD Wall of Stone gives "30 hit points per inch of thickness" for a 10 ft × 10 ft panel (`spells.json:17309`). That is 30 HP per 8.33 ft³, or 3.6 HP per ft³, so a 50 ft³ voxel of stone is **180 HP** whichever face is struck (5 × 2 ft face × 60 in, or 5 × 5 ft face × 24 in, both give 180). Per rock, 180 is scaled by the catalogue `fractureResistance` over 60 (granite 85 gives 255, sandstone 35 gives 105); **extrapolated**. Limestone's 120 equals today's diagnostic stone `maxHP` (`DEUS_Levels.js:1005`).
- **Ice.** SRD Wall of Ice has "30 hit points per 10-foot section" at 1 ft thick and is "vulnerable to fire damage" (`spells.json:17237`): 0.3 HP per ft³, so **15 HP per voxel**, fire resist 2 (§7.3). The SRD object table gives ice AC 13 (`rules.json:6950`); Wall of Ice's own AC is 12.
- **AC.** SRD object AC: stone 17, wood and bone 15, crystal, glass and ice 13, iron and steel 19, cloth, paper and rope 11 (`rules.json:6950`). Soil has no SRD row: 10 is **extrapolated**.
- **DT.** The SRD states the damage-threshold rule for "big objects such as castle walls" with no numbers (`rules.json:7155`). Every DT here is **extrapolated** (OQ-Q-10).
- **[STALE-1FT:** under 1 ft strata every kg/voxel and every maxHP above halves, and each spanBase column index means half the thickness in feet.]

### 2.4 Loose materials (new)

Loose materials are matter that bears weight but never spans or gives lateral support (§3.2). They take no HP damage; blasts and collapses move them. Bulk density is the parent's density times (1 − void fraction).

| Id | Key | Family | kg per full loose voxel | repose (strata per cell) | perm | flam | Made by | Becomes (Lane R) |
|---|---|---|---|---|---|---|---|---|
| 6 | rubble | parent's (stone rubble: mineral; masonry rubble: mineral) | 0.6 × parent kg (granite rubble 2,336) | 2 (38.7°; rock rubble repose 35-40°) | 5 | 0 | collapse, blast, dismantle remainder, mine spoil | sediment (weathering) |
| 7 | loose_fill | mineral + organic as soil | 1,911 (1.35 t/m³) | 1 (21.8°) | 4 | 0 | dig, soil collapse, earthworks | soil (compaction) |
| 8 | sediment | mineral | 2,124 (1.5 t/m³) | 1 | 3 | 0 | erosion (SIM.50.03), rubble weathering | stone (lithification, Lane R) |
| 9 | ash | mineral (the non-combustible part of wood) | 850 (0.6 t/m³) | 1 | 3 | 0 | fire burn-out (SIM.50.05) | soil |
| 11 | scrap | `metal:<element>` of the source | 0.25 × metal kg (iron scrap 2,786) | 2 | 5 | 0 | destroyed metal assemblies | mineral_trace (rust) |
| 12 | mineral_trace | `metal:<element>` (oxide; never ore) | 2,549 (1.8 t/m³) | 1 | 3 | 0 | rust and corrosion of metal items and scrap (SIM.40.07) | stays (LIFE-002) |
| 13 | broken_timber | organic | 354 (0.25 t/m³) | 2 | 5 | 4 | destroyed timber assemblies (DURABILITY DU8 name) | soil (rot) |
| 14 | dust | the source's family and composition | 1,416 (1.0 t/m³) | 1 | 4 | 0 | SRD Disintegrate's "pile of fine gray dust" (`spells.json:5855`) | sediment |
| 15 | snow (reserved) | water | reserved for SIM.50.06 | — | — | — | — | — |
| 10 | ice (loose form: `iceRubble` flag on the loose record) | water | 0.6 × 1,298 | 2 | 5 | 0 | broken ice | melts |

Loose voxels carry `repose` for talus (§5.4), `bearingKg` 30,000 (rubble, scrap), 20,000 (loose_fill, sediment, dust, ash), and no span.

### 2.5 Constructed assemblies (new)

A constructed voxel is not solid timber or solid stone: a 5 ft cell holds a wall of 1-2 ft or a floor of planks on joists. Each assembly is its own id whose `kgPerVoxel` encodes that fill. The constructed flag `0x80` (`DEUS_Levels.js:995`) stays as provenance ("made by an agent", for WG.65.16); a collapse clears it.

| Id | Key | Family | Fill of the source | kg/voxel | SRD AC | maxHP | DT | spanBase (any t) | ratedLoadKg | bearingKg | perm | flam / ignitePts | Weathering input | Debris |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 16 | masonry (rubble stone in mortar, 1.5 ft) | mineral | 0.30 × limestone | 977 | 17 | 54 | 10 | 1 (lintel) | 5,000 | 200,000 | 2 | 0 | stone's weatherResistance | rubble |
| 17 | ashlar (dressed stone, 2 ft) | mineral | 0.40 × dressed stone (2.7) | 1,529 | 17 | 72 | 10 | 1 | 8,000 | null | 1 | 0 | stone's | rubble |
| 18 | brick (fired brick, 1 ft) | mineral | 0.20 × brick (1.9) | 538 | 15 (extrapolated) | 36 | 5 | 1 | 3,000 | 150,000 | 2 | 0 | 50 (extrapolated) | rubble |
| 19 | stone_vault (arched floor or ceiling) | mineral | 0.35 × limestone | 1,140 | 17 | 63 | 10 | 3 | 8,000 | null | 1 | 0 | stone's | rubble |
| 20 | foundation (footing) | mineral | 0.60 × limestone | 1,954 | 17 | 108 | 10 | 0 | — | null (spreads load: the soil voxel under it gets 4 × its bearingKg) | 1 | 0 | buried: slowest class | rubble |
| 21 | rammed_earth | mineral + organic | 0.30 × compacted earth (1.9) | 807 | 10 (extrapolated) | 30 | 0 | 0 | — | 60,000 | 3 | 0 | washes out: fastest mineral class | loose_fill |
| 22 | timber_floor (planks on joists) | organic | 52 kg/m² | 120 | 15 | 27 | 5 | 2 | 1,000 | — | 4 | 3 / 5 | species rotResistance | broken_timber |
| 23 | timber_wall (log or plank) | organic | 0.25 × species | 266 (oak) | 15 | 27 | 5 | 1 | 1,500 | 40,000 | 3 | 3 / 5 | rotResistance | broken_timber |
| 24 | timber_frame (framed, infilled) | organic + mineral infill | 0.12 × species | 127 | 15 | 18 | 0 | 1 | 800 | 15,000 | 3 | 3 / 5 | rotResistance | broken_timber |
| 25 | timber_post (prop, pillar) | organic | 0.04 × species | 42 | 15 | 18 | 0 | 0 | — | 20,000 | 6 | 3 / 5 | rotResistance | broken_timber |
| 26 | timber_roof (rafters, boards, shingles) | organic | 60 kg/m² | 138 | 15 | 18 | 0 | 2 | 400 | — | 3 | 3 / 5 | rotResistance, sky exposure | broken_timber |
| 27 | thatch_roof | organic | 41 kg/m² | 95 | 11 | 5 | 0 | 2 | 200 | — | 5 | 5 / 1 | fastest organic class | broken_timber |
| 28 | bridge_deck (timber) | organic | 0.14 × species | 149 | 15 | 27 | 5 | 2 | 3,000 | — | 5 | 3 / 5 | rotResistance, wet exposure | broken_timber |
| 29 | iron_grate (grille or plate floor) | metal:iron | 0.01 × iron | 111 | 19 | 54 (extrapolated) | 10 | 2 | 1,500 | — | 6 | 0 | corrosionResistance 30 (`:4893`) | scrap |
| 30 | conjured_stone (SRD Wall of Stone, 6 in) | mineral | 0.10 × granite | 382 | 15 (SRD) | 18 (SRD panel 180 / 10 voxels) | 0 | 2 (SRD 20-ft span rule) | 2,000 | null | 0 | 0 | as granite | rubble |
| 31 | reserved (stairs flight, if §3.2's object form is replaced) | — | — | — | — | — | — | — | — | — | — | — | — | — |

- **SRD links.** Wood is AC 15, stone 17, iron 19 (`rules.json:6950`). The SRD object HP table stops at Large: "Large (cart, 10-ft.-by-10-ft. window) | 5 (1d10) | 27 (5d10)" (`rules.json:7013`). A 5 ft × 5 ft section of timber floor or wall is treated as a Large resilient object (27), a thatch section as Large fragile (5), a light frame section as Medium resilient (18). The stone assemblies use the Wall of Stone rate of 3 HP per inch of a 10 ft² face (a 1.5 ft masonry wall: 18 in × 3 = 54). Conjured stone keeps the SRD's own figures: a panel is AC 15 with 30 HP per inch, so a 6 in panel has 180 HP; one panel is 2 cells × 5 strata = 10 voxels, 18 HP each. Iron's 54 is **extrapolated** (twice the Large resilient figure).
- **Conjured stone's span** follows the SRD: "If you create a span greater than 20 feet in length, you must halve the size of each panel to create supports" (`spells.json:17309`). A 20 ft span is 4 cells, whose middle cells are 2 cells from a support, so spanBase 2.
- **Species.** Timber assemblies take the species of the timber used (the item's `mat`, as mined stone does at `DEUS_Jobs.js:478`). Their kg scales by species density over oak's 0.75; the table shows oak.
- **Alloys.** An item or assembly of an alloy (bronze) carries an integer composition per family (for example bronze = copper 88 %, tin 12 % by kg), so the ledger sees each element (§8.1).

### 2.6 How loose matter is stored exactly

A loose voxel's strata byte says which loose material is there; its exact mass cannot be a whole number of voxels, because rubble bulks up (1 granite voxel of 3,894 kg becomes 1.67 rubble voxels at 2,336 kg each). So:
- **Loose record.** Each cell with loose strata has one sparse record `{ lineage (the source material id), kg (Uint32) }` per loose material in the cell (almost always one). The strata bytes are derived from it: `ceil(kg / kgPerLooseVoxel)` loose voxels stacked from the lowest free stratum. The record is saved; the bytes are derived.
- **Why not reuse the HP byte.** A 1/255 fill fraction cannot hold an exact kg total, and the ledger must be exact (LIFE-001). The HP byte of a loose voxel is fixed at 255.
- **Overflow.** When a cell's loose mass needs more voxels than its free strata, the rest spills (§5.4); a pile may rise into the cell's column on the layer above.
- **Cost.** 8 bytes per loose cell in a MIXED chunk (2 B cell index, 1 B lineage, 1 B spare, 4 B kg), held in a per-chunk sorted array (§9.1).

### 2.7 Id allocation

| Ids | Use |
|---|---|
| 0-5 | existing: air, stone (generic), soil, wood, water, lava |
| 6-15 | loose: rubble, loose_fill, sediment, ash, ice, scrap, mineral_trace, broken_timber, dust, snow (reserved for SIM.50.06) |
| 16-31 | assemblies (31 reserved) |
| 32-37 | rock types: granite, basalt, slate, marble, limestone, sandstone |
| 38-47 | reserved for ore-bearing rock (WG.61 veins). Each carries `ore: true` and its element; no process may write one except world generation (LIFE-002, §8.6) |
| 48-63 | free (16 ids) |

The 0x40 bit stays invalid (`DEUS_Levels.js:1016`). A layout with more than 64 ids needs a record format change and is out of scope.

### 2.8 Input to the material-and-structure package (PROPOSED-Q-01)

PROPOSED-Q-01 (§12) implements §2.2-§2.7 as data plus the loose record. The material table moves from the code constant at `DEUS_Levels.js:1003-1010` into catalogue data read at load, keyed by these ids, with a load-time validator: every id has every property of §2.2, every assembly's debris exists, no loose material has a span, and no transform output is an ore id (§8.6).

## Buildings as strata

### 3.1 What exists (LAND-5, SUP-2, SET-4)

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Jobs.js:721` | `const placed = O.setIn(area, x, y, t.id);` | The build job places an object; no strata change. |
| `DEUS_Jobs.js:727` | `consumeBuildItems(I, area, x, y, needs);` | Items are consumed after the object is placed. |
| `DEUS_Levels.js:1602` | `if (opts.constructed && SOLID_B[v & 0xff] === 1) v \|= M_BUILT;` | The strata writer can mark constructed strata; no build job asks it to. |
| `DEUS_Floors.js:276` | `L.setShape({ area: copyArea(area), x: cx, y: cy, z: targetZ }, "floor", { constructed: true, material: mat });` | The only constructed strata written today: a roof deck on z+1, from nothing, as a side effect of `isRoofed` (`DEUS_Floors.js:215`; LAND-1). |
| `DEUS_Doors.js:91` | `const hp = Math.max(1, (type.door && type.door.hp) \| 0);` | Doors hold HP in their own store. |
| `DEUS_Colonists.js:3733` | `else if (here && (hasTag(here, "building") \|\| hasTag(here, "ruin"))) state = step.exact ? "blocked" : "skipped";` | Ruins block building, so foundations are never reused (SET-4). |
| `game/data/DEUS_WorldCatalog.json:2191` | `"id": "wall_stone",` | Walls are object types (also `wall_wood` `:2150`, `wall_timber_frame` `:3053`, `wall_brick` `:3098`, `wall_ashlar` `:3143`). |

### 3.2 Element by element

Rule: anything that carries load or encloses space becomes constructed strata; anything that only rests on a surface, moves, or is used stays an object and counts as load.

| Element | Becomes | Strata written (2 ft slices; one layer is 10 ft) | Why |
|---|---|---|---|
| Wall, ground storey | strata | S1-S4 of the wall cell (8 ft) in the wall's assembly; S0 is the foundation (§3.4) | Carries the storeys above; V137 |
| Wall, upper storey | strata | S0-S4 of the wall cell on that layer (10 ft), continuing the wall below | One contiguous member with the wall below |
| Floor (upper storey), roof deck, ceiling | strata | S0 of the layer above, over each interior cell (2 ft) | A floor is the ceiling of the cell below (VERTICAL_WORLD §5.2) |
| Pitched or thatched roof | strata | S0 of the layer above in `timber_roof` or `thatch_roof`. A pitch is presentation (a catalogue slot), not geometry | DEC-011: flat layers |
| Ground-storey floor on earth | object (finish) | none; it is a surface finish on the natural S0, as `DEUS_Floors.js:33` floors are now | It carries nothing |
| Door | strata frame plus object leaf | the door cell's S1-S4 are air (8 ft clear opening); the layer above's S0 spans over it as the lintel; the leaf stays a `DEUS_Doors` object with its HP | The leaf moves; the frame is the walls and the floor above |
| Window (later) | strata | air strata inside a wall column (for example S2-S3); the wall column splits into two members and the upper one spans one cell (masonry spanBase 1) | Handled by the support rule with no special case |
| Stairs | strata plus connector | S0 in the stair's assembly plus today's connector code (`DEUS_Levels.js:1041`); the layer above leaves its S0 open at the landing cell; the flight is an object that loads S0 | Keeps the existing connector model |
| Ramp (DEC-020) | strata | the k-th cell of a 5-cell run holds S0-Sk (k = 0..4) of `rammed_earth` or `masonry`, plus the RAMP connector | "a run of cells rising one stratum per cell" (`docs/OWNER_DECISIONS.md:287`) |
| Column, pillar, prop | strata | S0-S4 (or S1-S4 on the ground) of `timber_post`, `masonry` or `ashlar` in one cell | The main support tool (SIM.40.03) |
| Bridge | strata | S0 of the deck cells in `bridge_deck`; piers are columns | `bridge` has no `build` today (`game/data/DEUS_WorldCatalog.json:2408`) |
| Furniture, workbenches, beds, chests, stockpiles, campfire | objects | none | They rest on a floor; they are load and victims, not supports (OQ-Q-04) |
| Wall of Stone, Wall of Ice (SRD) | strata | `conjured_stone` or ice voxels along the panels | They are "an object made of stone that can be damaged and thus breached" (`spells.json:17309`) |

**Thickness.** A floor, roof or foundation is 1 stratum (2 ft). A ground-storey wall is 4 strata above the foundation; an upper-storey wall is 5. Horizontal thickness is always the cell (5 ft): a thin wall is expressed by its assembly's fill (§2.5), not by geometry. A door opening is 8 ft (4 strata); with a 2 ft floor above that fills the 10 ft layer. Clear room height is 8 ft. **[STALE-1FT:** the same strata would be 4 ft walls and a 1 ft floor in a 5 ft level.]

### 3.3 How a build job writes them

The build job (`DEUS_Jobs.js:707-728`) keeps its transactional shape (materials must lie on the cell; the world accepts the change first; only then are materials consumed) and changes what it writes:
1. **Plan.** The job's target is a list of voxels `[(cell, z, s, assembly)]` from the catalogue entry (for example `wall_stone`: S1-S4 in `masonry` on a foundation). Before the job is offered, `Support.wouldSupport(voxels)` (§10.2) must say every planned voxel will be supported. This replaces the walkability test at `DEUS_Colonists.js:3736` ("unsupported airborne" builds).
2. **Materials.** Required mass = Σ planned voxels × `kgPerVoxel`, by family. The catalogue `build.items` for each constructed type must supply exactly that mass plus a declared `wasteKg` (offcuts, broken bricks); a load-time data check fails when Σ(item count × item kg) ≠ strata kg + wasteKg (§8.2, OQ-Q-06 on item masses).
3. **Write.** `setStrata(ref, { m }, { constructed: true, cause: "build:<typeId>", refuseIfStanding: true })` per cell, which already refuses when a unit stands there (`DEUS_Levels.js:1543-1546`, V68).
4. **Ledger.** `transform(ITEM → STRATUM_BUILT, family, kg, "build")` for the strata mass and `transform(ITEM → LOOSE, family, wasteKg, "build:waste")` for the waste, deposited as loose debris at the cell (§8.2).
5. **Events.** `levels:strataChanged` with cause `build:<typeId>` (`DEUS_Levels.js:1558`), which also enqueues the support recheck (§4.1).
6. **Refusal.** A refused write leaves every material on the cell, as today.

Dismantle and quarry of a built element become the reverse: strata → items (a salvage fraction) plus the remainder as loose debris, never more out than in (§8.2).

### 3.4 Foundations and re-founding (SET-4)

- **Foundations are strata.** A wall on earth or soil gets a `foundation` voxel at S0 of its cell (the natural S0 is dug out: its mass becomes loose_fill spoil, §8.2). On rock the rock is the foundation and nothing is written.
- **They last.** Foundations are grounded, bearing and buried, so they get the slowest decay class (Lane R input, §6.4) and do not fall when the walls above them collapse.
- **Ruins keep them.** When a building decays or collapses, its foundation strata stay under the rubble. They are the stratum matter a later ruin (LIFE-003) and a later builder read.
- **Re-founding.** A build plan whose wall cell already holds a supported `foundation` voxel skips the footing (no dig, no footing cost). Loose rubble on top must be cleared first, or consumed: a "rebuild" job may take masonry-lineage rubble kg as the stone input of a new `masonry` wall (rubble → masonry is a transform in the mineral family). The planner rule that blocks every `ruin`-tagged cell (`DEUS_Colonists.js:3733`) must then allow a cell whose only contents are a foundation and clearable rubble (SIM.50.09, PROPOSED-Q-02).

### 3.5 Migration of existing saves and objects

A save made before PROPOSED-Q-02 has walls, doors and roof decks in the old forms. On load (one save-schema step, versioned per `DEUS_Levels.js:996` `STRATA_SCHEMA`):
1. **Wall objects** (types tagged `wall`: `wall_wood`, `wall_stone`, `wall_timber_frame`, `wall_brick`, `wall_ashlar`, `rubble_pillar`) become S1-S4 of the matching assembly with the constructed flag. The object record is removed. `rubble_pillar` becomes `masonry`.
2. **Mass check.** The object's mass is its build items' kg. When the new strata kg differ, the difference is written as loose debris at the cell (object heavier) or as a logged one-time source `migration:legacyWall` (strata heavier). No silent change (LIFE-001).
3. **Doors** keep their `DEUS_Doors` record and HP; the door cell's strata stay as they are; the lintel is whatever the layer above holds.
4. **Roof decks** written from nothing by `DEUS_Floors.js:276` are re-tagged as `timber_floor` or `masonry` voxels. They had no material cost, so they are either kept with a one-time logged source `migration:legacyRoofDeck` or removed (OQ-Q-11).
5. **Rubble objects** (`rubble`, `game/data/DEUS_WorldCatalog.json:2091`) become a loose record of 2 stone items' kg of rubble at the cell (the object's pick yield, `:2104`), so its mass is kept.
6. **Scale.** A legacy save keeps -2..+2 (ADR §15.2). Its five 1 ft strata per level are reinterpreted as 2 ft strata of a 10 ft layer. The ledger's baseline totals are computed after the reinterpretation, so the doubling of kg per voxel is a unit change at load, not a source during play.
7. **Test.** The migration fixture (§11, T14) loads a legacy save with each wall type, a door and a roof deck, and checks the strata, the object list and the ledger totals.

### 3.6 Rendering and catalogue slots (DEC-011, DEC-007)

Walls, floors and roofs are drawn from the strata's assembly ids through catalogue slots, with flat 1:1 layers (DEC-011) and nothing drawn under opaque cover (DEC-021). No art is generated or requested. The slots this design needs, as text only:
- art slot needed: `strata_face_<assembly>` for ids 16-30, wall and floor face per assembly.
- art slot needed: `loose_<material>` for ids 6-14, pile tops and sides for loose matter.
- art slot needed: `support_failing`, a crack marker frame for a member in the failing state (§5.1), drawn from sprite frames only (Rule 12).

<!-- CONTINUES -->
