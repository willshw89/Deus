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
3. Numbers: masses are density × voxel volume; spans come from a cantilever self-weight bending estimate (§4.3); both were computed with an ad-hoc `node -e` run that is not kept. SRD numbers are quoted from the files above; where the SRD has no number the table says **extrapolated**.
4. Every mechanism states: rule; data read and written with its sparse representation; trigger; ledger entries; CPU per tick and memory at 32 layers; what the SRD says.

### 0.3 Limits

- Nothing was run in NW.js, the RMMZ editor or a headless core. No performance was measured: every memory and CPU figure is arithmetic from stated assumptions.
- The numbers are physically motivated, not play-tested. The Owner questions in §14 ask for the feel.
- The design is written against the core layout that ADR-003 proposes. If that ADR changes, the mechanism stays and the hosting module changes.

### 0.4 Dependency on PROPOSED ADR-003

This design uses the following ADR-003 Rev 3 assumptions (section numbers are the ADR's). If the ADR changes, each item below needs re-checking:

| # | Assumption taken from ADR-003 (PROPOSED) | Used in |
|---|---|---|
| A1 | A headless core with a 10 Hz tick; 1 tick = 36 game-seconds; 1 game hour = 100 ticks; 1 game day = 2,400 ticks (ADR §3.1-§3.2) | §5, §6, §7 (durations) |
| A2 | One ordered system list per tick (ADR §3.8); this design adds support, collapse and talus slots | §5.4, §11.4 |
| A3 | Chunked storage: a chunk is 32 × 32 cells of one layer, UNIFORM (no arrays) or MIXED (arrays allocated on first write) (ADR §15.3) | §10 |
| A4 | Regions are 32 × 32 cells × one slab of two layers; levels L0/L1/L2; dormant regions cost nothing (ADR §5.1-§5.5) | §5.5, §10.5 |
| A5 | A ledger with `transform`, `source`, `sink` and Q-MASS per family (ADR §7.8-§7.9); SIM.40.01 sets the per-material mass tables "with WG.65.15" | §9 |
| A6 | Integer distances in half-feet: cell 10, stratum 4, layer 20 (ADR §15.0) | §8 |
| A7 | Volume damage as one core system with shells, parents and a per-mille pass table that SIM.40.01 fills in (ADR §18.2, Q18) | §8 |
| A8 | A change feed and command queue (ADR §4.3-§4.4) | §11 |
| A9 | Every core test runs at the 9-layer test range (-4..+4) and the 32-layer default (ADR §15.2) | §12 |

Before the core exists, the same rules can run inside the legacy `DEUS_Levels.js` writer, because every trigger in this design is the existing `levels:strataChanged` event (`DEUS_Levels.js:1558`). Where the legacy path differs it is said.

### 0.5 Where existing documents disagree with DEC-013, V137 or the audit

| Document | What it says | Conflict | This design |
|---|---|---|---|
| `docs/design/VERTICAL_BUILD_PLAN.md:445` | "Always supported: every natural cell; every ground (z 0) cell." | V137 (`docs/VISION.md:131`) and SUP-1 need natural rock to fail when undercut; the brief asks for cave-ceiling spans | Natural rock has spans (§4.3). DEC-010 stays an Owner question (OQ-Q-01) |
| `docs/design/VERTICAL_BUILD_PLAN.md:447` | Built floors join a component supported within `support.maxSpan` (3) BFS steps | A single span for every material; five levels | Span per material and thickness (§4.3) |
| `docs/design/VERTICAL_BUILD_PLAN.md:454` | Fall damage `fall.hpPerLevel × levels fallen` | Levels are 5 ft in that plan; DEC-013 layers are 10 ft; SRD gives 1d6 per 10 ft | SRD falling per 10 ft (§6.5) |
| `docs/design/TERRAIN_LEVELS.md:206` | "Natural cells are always supported ... so hills never collapse. Digging a tunnel into a hill at z=0 leaves the +1 floor above it standing" | Same as the first row | A soil tunnel with less than 20 ft of soil above it needs props (§4.3, OQ-Q-12) |
| `docs/design/VERTICAL_WORLD.md:210` (§5.4) | "At z=-2, the bottom boundary is solid" | Five levels; DEC-013 bottom is -16 | The bottom is `zMin` (§4.2) |
| `docs/design/DURABILITY.md:716` | Collapse deals `collapse.damage (20) × levels fallen` | Levels of 5 ft; not SRD | SRD earthquake and falling numbers as the baseline (§6.5) |
| `docs/design/DURABILITY.md:53` | "A dismantled wall gives back 75% of its materials" | The other 25% vanishes (LIFE-001) unless it becomes debris | The remainder becomes loose debris (§9.2) |
| `docs/design/DURABILITY.md:560` | The quarried stone wall gives 2 stone and `becomes: null` | Fixes the 2-in-4-out leak but is silent on where the wall's mass goes when broken by force (`:558`: "gives no pieces") | Breaking by force converts the wall's strata to rubble of equal mass (§6.3) |
| `docs/design/REMAINS.md:86` | Falling bodies: "`landingZ(cell)` is `z` today" | No falling exists | Units fall to the first supporting stratum (§6.5) |

## 1. Conventions

- **Voxel.** One stratum of one cell: 5 ft × 5 ft × 2 ft = 50 ft³ = 1.41584 m³ (DEC-013 item 2, `docs/OWNER_DECISIONS.md:178-181`). A cell's column of one layer is five voxels S0 (bottom) .. S4 (top).
- **Elevation index.** `e = (z − zMin) × 5 + s`. At -16..+15 it runs 0..159; at the 9-layer test range 0..44. Never the legacy 0..24 (`DEUS_Levels.js:2010`).
- **Mass unit.** 1 kg, integer, in every ledger entry (§9). Water keeps the fluid depth unit (§9.1).
- **Stale model marker.** The code today has 5 levels (-2..+2) of five 1 ft strata (`DEUS_Levels.js:61`, `:985`, `:993`; audit F-01). Where a number here would differ under that model it is marked **[STALE-1FT: ...]** with the value it would have. Nothing in this design relies on the stale model.
- **Plugin paths.** A bare plugin name (`DEUS_Levels.js:1558`) means `game/js/plugins/DEUS_Levels.js`; other paths are from the repo root.
- **Durations.** Action-domain durations are in ticks (A1). Slow durations are in "years of simulated time" with the D-1 mapping table in §7.6. D-1 is OWNER_OPEN and this design does not choose it.

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
| `family` | Q-MASS family: `mineral`, `organic`, `water`, `metal:<element>` (§9.1) | ledger |
| `kgPerVoxel` | kg in one full voxel (for loose materials: one full loose voxel; the exact mass lives in the loose record, §2.6) | ledger, load |
| `srdAC` | SRD object AC | weapon attacks on structures (V95) |
| `maxHP` | SRD hit points per voxel | damage, decay |
| `dt` | damage threshold (SRD rule, `rules.json:7155`); damage from one effect below it does nothing | blasts, attacks |
| `spanBase[t]` | cells a member of thickness t strata may reach from its nearest bearing member (§4.3) | support |
| `ratedLoadKg` | superimposed load one spanning cell carries at full HP | support |
| `bearingKg` | load one bearing voxel-cell carries before crushing; `null` = never checked | support |
| `perm` | permeability class 0 (tight) .. 6 (open) | SIM.50.02 seepage |
| `flam` / `ignitePts` | flammability class 0..5 and the fire damage that ignites it | SIM.50.05, blasts |
| `weather` | the catalogue field and value that drives decay (Lane R) | SIM.40.05 |
| `debris` | the loose material the voxel becomes when destroyed | collapse, blasts |
| `repose` | loose only: the largest height step to a neighbour, in strata | talus (§6.4) |

### 2.3 Natural materials

Natural rock resolves its type today through the seeded geology function (`DEUS_Jobs.js:464-466` reads `G.geologyAt(gx, gy, zOf(job.target))` for mined stone). This design gives each rock type its own id so that a voxel, its rubble and its ledger line know their rock without a geology call. Generic `stone` (id 1) stays for legacy saves and resolves through `geologyAt` exactly as today.

Voxel mass = catalogue density × 1,415.84 kg per t/m³. Spans are `spanBase[t]` for thickness t = 1, 2, 3, 5, 10, 20, ≥40 strata (§4.3).

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
| 10 (new) | ice | 1,298 (0.917 t/m³) | 13 | 15 | 0 | 2,3,3,4,6,9,12 | floating: 3.5 × h_cm² (§4.3) | null | 0 | 0 | melts (SIM.50.06) | ice rubble = loose ice, then melt |
| 4, 5 (exist) | water, lava | fluid (§9.1) | — | 0 | — | — | — | — | — | lava ignites | — | — |

- **HP.** SRD Wall of Stone gives "30 hit points per inch of thickness" for a 10 ft × 10 ft panel (`spells.json:17309`). That is 30 HP per 8.33 ft³, or 3.6 HP per ft³, so a 50 ft³ voxel of stone is **180 HP** whichever face is struck (5 × 2 ft face × 60 in, or 5 × 5 ft face × 24 in, both give 180). Per rock, 180 is scaled by the catalogue `fractureResistance` over 60 (granite 85 gives 255, sandstone 35 gives 105); **extrapolated**. Limestone's 120 equals today's diagnostic stone `maxHP` (`DEUS_Levels.js:1005`).
- **Ice.** SRD Wall of Ice has "30 hit points per 10-foot section" at 1 ft thick and is "vulnerable to fire damage" (`spells.json:17237`): 0.3 HP per ft³, so **15 HP per voxel**, fire resist 2 (§8.3). The SRD object table gives ice AC 13 (`rules.json:6950`); Wall of Ice's own AC is 12.
- **AC.** SRD object AC: stone 17, wood and bone 15, crystal, glass and ice 13, iron and steel 19, cloth, paper and rope 11 (`rules.json:6950`). Soil has no SRD row: 10 is **extrapolated**.
- **DT.** The SRD states the damage-threshold rule for "big objects such as castle walls" with no numbers (`rules.json:7155`). Every DT here is **extrapolated** (OQ-Q-10).
- **[STALE-1FT:** under 1 ft strata every kg/voxel and every maxHP above halves, and each spanBase column index means half the thickness in feet.]

### 2.4 Loose materials (new)

Loose materials are matter that bears weight but never spans or gives lateral support (§4.2). They take no HP damage; blasts and collapses move them. Bulk density is the parent's density times (1 − void fraction).

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

Loose voxels carry `repose` for talus (§6.4), `bearingKg` 30,000 (rubble, scrap), 20,000 (loose_fill, sediment, dust, ash), and no span.

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
- **Alloys.** An item or assembly of an alloy (bronze) carries an integer composition per family (for example bronze = copper 88 %, tin 12 % by kg), so the ledger sees each element (§9.1).

### 2.6 How loose matter is stored exactly

A loose voxel's strata byte says which loose material is there; its exact mass cannot be a whole number of voxels, because rubble bulks up (1 granite voxel of 3,894 kg becomes 1.67 rubble voxels at 2,336 kg each). So:
- **Loose record.** Each cell with loose strata has one sparse record `{ lineage (the source material id), kg (Uint32) }` per loose material in the cell (almost always one). The strata bytes are derived from it: `ceil(kg / kgPerLooseVoxel)` loose voxels stacked from the lowest free stratum. The record is saved; the bytes are derived.
- **Why not reuse the HP byte.** A 1/255 fill fraction cannot hold an exact kg total, and the ledger must be exact (LIFE-001). The HP byte of a loose voxel is fixed at 255.
- **Overflow.** When a cell's loose mass needs more voxels than its free strata, the rest spills (§6.4); a pile may rise into the cell's column on the layer above.
- **Cost.** 8 bytes per loose cell in a MIXED chunk (2 B cell index, 1 B lineage, 1 B spare, 4 B kg), held in a per-chunk sorted array (§10.1).

### 2.7 Id allocation

| Ids | Use |
|---|---|
| 0-5 | existing: air, stone (generic), soil, wood, water, lava |
| 6-15 | loose: rubble, loose_fill, sediment, ash, ice, scrap, mineral_trace, broken_timber, dust, snow (reserved for SIM.50.06) |
| 16-31 | assemblies (31 reserved) |
| 32-37 | rock types: granite, basalt, slate, marble, limestone, sandstone |
| 38-47 | reserved for ore-bearing rock (WG.61 veins). Each carries `ore: true` and its element; no process may write one except world generation (LIFE-002, §9.6) |
| 48-63 | free (16 ids) |

The 0x40 bit stays invalid (`DEUS_Levels.js:1016`). A layout with more than 64 ids needs a record format change and is out of scope.

### 2.8 Input to the material-and-structure package (PROPOSED-Q-01)

PROPOSED-Q-01 (§13) implements §2.2-§2.7 as data plus the loose record. The material table moves from the code constant at `DEUS_Levels.js:1003-1010` into catalogue data read at load, keyed by these ids, with a load-time validator: every id has every property of §2.2, every assembly's debris exists, no loose material has a span, and no transform output is an ore id (§9.6).

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
1. **Plan.** The job's target is a list of voxels `[(cell, z, s, assembly)]` from the catalogue entry (for example `wall_stone`: S1-S4 in `masonry` on a foundation). Before the job is offered, `Support.wouldSupport(voxels)` (§11.2) must say every planned voxel will be supported. This replaces the walkability test at `DEUS_Colonists.js:3736` ("unsupported airborne" builds).
2. **Materials.** Required mass = Σ planned voxels × `kgPerVoxel`, by family. The catalogue `build.items` for each constructed type must supply exactly that mass plus a declared `wasteKg` (offcuts, broken bricks); a load-time data check fails when Σ(item count × item kg) ≠ strata kg + wasteKg (§9.2, OQ-Q-06 on item masses).
3. **Write.** `setStrata(ref, { m }, { constructed: true, cause: "build:<typeId>", refuseIfStanding: true })` per cell, which already refuses when a unit stands there (`DEUS_Levels.js:1543-1546`, V68).
4. **Ledger.** `transform(ITEM → STRATUM_BUILT, family, kg, "build")` for the strata mass and `transform(ITEM → LOOSE, family, wasteKg, "build:waste")` for the waste, deposited as loose debris at the cell (§9.2).
5. **Events.** `levels:strataChanged` with cause `build:<typeId>` (`DEUS_Levels.js:1558`), which also enqueues the support recheck (§5.1).
6. **Refusal.** A refused write leaves every material on the cell, as today.

Dismantle and quarry of a built element become the reverse: strata → items (a salvage fraction) plus the remainder as loose debris, never more out than in (§9.2).

### 3.4 Foundations and re-founding (SET-4)

- **Foundations are strata.** A wall on earth or soil gets a `foundation` voxel at S0 of its cell (the natural S0 is dug out: its mass becomes loose_fill spoil, §9.2). On rock the rock is the foundation and nothing is written.
- **They last.** Foundations are grounded, bearing and buried, so they get the slowest decay class (Lane R input, §7.4) and do not fall when the walls above them collapse.
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
7. **Test.** The migration fixture (§12, T14) loads a legacy save with each wall type, a door and a roof deck, and checks the strata, the object list and the ledger totals.

### 3.6 Rendering and catalogue slots (DEC-011, DEC-007)

Walls, floors and roofs are drawn from the strata's assembly ids through catalogue slots, with flat 1:1 layers (DEC-011) and nothing drawn under opaque cover (DEC-021). No art is generated or requested. The slots this design needs, as text only:
- art slot needed: `strata_face_<assembly>` for ids 16-30, wall and floor face per assembly.
- art slot needed: `loose_<material>` for ids 6-14, pile tops and sides for loose matter.
- art slot needed: `support_failing`, a crack marker frame for a member in the failing state (§6.1), drawn from sprite frames only (Rule 12).

## Support model

### 4.1 Members, loads and what carries what

- **Member.** A member is a maximal vertical run of contiguous non-loose solid voxels (natural or assembly) in one cell column: `(area, x, y, e0..e1)`, thickness `t = e1 − e0 + 1` strata. Examples:
  - a wall column through two storeys, with the floor voxel between them and its foundation and the ground below it down to the first air, is one member;
  - an interior floor voxel with a room below and a room above is a member with t = 1;
  - the rock over a cave, from the cave ceiling up to the next air, is one member, however many layers it crosses.
- **Material of a member.** Span and rated load use the weakest voxel of the member (the minimum of `spanBase[t]` and of `ratedLoadKg` over its voxels). The HP band is the lowest band among its voxels.
- **Loose voxels** are never members. They are load on the member directly below their stack.
- **Fluid** is load on the member below it (its depth units × kg per unit, §9.1) and supports nothing, except that floating ice bears on water (§4.3).
- **Objects and items** are load on the member under their cell (object kg from its build items or the catalogue; item kg × count). They never support (OQ-Q-04).
- **Units** are not load by default (OQ-Q-05).

### 4.2 Bearing, lateral support and the bottom of the world

A member M with bottom voxel e0 is **bearing** (distance 0) when any of these holds:
1. the voxel at `e0 − 1` in the same column is solid and belongs to a member that is not in the failing set (§6.1);
2. the voxel at `e0 − 1` is loose, and the loose stack rests on such a member;
3. `e0` is the bottom stratum of layer `zMin` (e = 0), the floor of the world array. At -16..+15 that is S0 of layer -16. **[STALE-1FT:** today's bottom is -2, `DEUS_Levels.js:2010` and VERTICAL_WORLD §5.4.**]**
4. M is ice resting on a full fluid voxel (floating ice, §4.3).

Otherwise M is **lateral**. Its distance `dist(M) = 1 + min dist(N)` over the members N in the four horizontal neighbour columns (N, E, S, W) whose elevation range overlaps M's by at least one stratum and which are not failing. Loose voxels never give lateral support.

M is **supported** when it is bearing and passes the crush check (§4.4), or when `1 ≤ dist(M) ≤ spanEff(M)` and its superimposed load is within capacity (§4.4). Members that are not in the failing set are supported: the world starts stable (§4.5) and every change is rechecked (§5), so the invariant holds by induction.

**Edges.** A neighbour column across an area edge is read from the neighbouring area (the core keeps geology resident at every LOD level, ADR §6 table row "Geology and terrain"; the legacy code regenerates a baseline from the seed, `DEUS_Levels.js:906`, `:2104`). A neighbour outside the world counts as bearing, as the generation rule already treats "the area's edge (the next area)" (`DEUS_Levels.js:2696`).

### 4.3 Span capacity

**Derivation.** A cantilever of thickness `T` under its own weight has a peak bending stress `σ = 3ρgL²/T`, so it reaches `L = sqrt(T σ / (3ρg))`. A beam supported at both ends over a length S has the same peak stress as a cantilever of S/2 (`σ = 3ρgS²/(4T)`), and its middle is S/2 from a support. So one rule, "distance to the nearest bearing member ≤ L", covers ledges, ceilings and floors alike. With `T = t × 0.6096 m` and allowable rock-mass tension `σ` (**extrapolated**, conservative for jointed rock): granite and basalt 1.5 MPa, slate and marble 1.0, limestone 0.8, sandstone 0.5, ice 0.5, soil 0.02. `spanBase[t] = floor(L / 1.524 m)` cells, capped at **S_MAX = 12** cells (60 ft) so that every search is bounded (§5.5). The results are the columns of the §2.3 table.

**What the table means:**
- A 2 ft granite ledge reaches 2 cells (10 ft) out from its wall; a 2 ft sandstone ledge 1 cell.
- A cave is stable while its width in cells is at most `2 × spanBase`. Limestone with 20 ft (10 strata) of rock above spans 5 cells from each wall, so a 10-cell (50 ft) cave stands and an 11-cell cave does not.
- Soil cannot span unless it is thick: 20 ft of soil (t = 10) spans 1 cell, so a 2-cell (10 ft) tunnel under 20 ft of soil stands, and a 1-cell tunnel under 10 ft of soil (t = 5, span 0) falls in unless propped (OQ-Q-12).
- Assemblies (§2.5): a timber floor (spanBase 2) clears up to 4 cells (20 ft) between bearing walls; a stone vault (3) 6 cells (30 ft); a bridge deck needs a pier every 5 cells (4 cells, 20 ft, clear); conjured stone follows the SRD's 20 ft rule.
- Floating ice bears on water with capacity `P = 3.5 × h²` kg for thickness h in cm (Gold's formula, **extrapolated**, not SRD): 1 stratum (61 cm) carries 13,020 kg, 2 strata 52,080 kg. Freezing and thawing belong to SIM.50.06.

**Scale.** **[STALE-1FT:** a table column t means t ft of thickness in the old model, half the DEC-013 value, so the old model's spans would be about 0.71 × these for the same strata count.**]**

### 4.4 Load and capacity

All integer arithmetic.

| Quantity | Rule |
|---|---|
| HP band | `band = (hp + 31) >> 5` on the 1..255 HP byte: 1..8 (8 = full). A destroyed voxel (HP 0) is no longer part of the member |
| Effective span | `spanEff = floor(spanBase[t] × band / 8)` |
| Superimposed load `Lsup` | kg resting on the member's top voxel: the loose stack above it, the objects and items on that cell, the fluid above it, and the whole load of any member resting on its top |
| Capacity (lateral members) | `cap = ratedLoadKg × band / 8`; a lateral member fails when `Lsup > cap` ("overload") |
| Crush check (bearing members) | For each voxel with a non-null `bearingKg`: the kg above it in the member, plus `Lsup`, plus the tributary load (next row), must not exceed `bearingKg × band / 8` ("crush"). Natural rock, ashlar and vaults have `bearingKg` null and are never checked |
| Tributary load | Each lateral member records `rootDir`, the neighbour direction its `dist` came from (ties N, E, S, W). Following `rootDir` ends at one bearing member B. B's tributary load is the sum of `kg + Lsup` over the lateral members rooted at B. It is kept as a running sum, changed by deltas when a rooted member's load changes |
| Soil under a footing | A soil or loose voxel directly under a `foundation` voxel checks against 4 × its `bearingKg` (a spread footing) |

**Examples.** A timber floor cell rated 1,000 kg carries a stockpile of about 1,000 kg. One voxel of granite rubble (2,336 kg) from a collapse above overloads it, so a collapse onto a timber floor pancakes through it (§6.6). A masonry tower ten layers tall on bare soil puts about 48,850 kg on the soil voxel under each wall column (10 layers × 5 voxels × 977 kg), over soil's 35,000 kg, so it sinks and fails unless it has a foundation (4 × 35,000 = 140,000 kg).

### 4.5 Natural rock and ledges (V128, DEC-010)

- **Rock is structure.** V128 makes natural rock count as enclosure and ground (`docs/VISION.md:365-366`). Here rock members are members like walls: a floor can span from a cave wall, and a room can be part rock, part masonry.
- **Rock is not "always supported".** This replaces the rule at `docs/design/VERTICAL_BUILD_PLAN.md:445` and `docs/design/TERRAIN_LEVELS.md:206`. An undercut ledge or a widened cave can fall (V137, SUP-1).
- **DEC-010.** DEC-010 is OPEN; its default is option 1, "lateral connectivity is sufficient" (`docs/OWNER_DECISIONS.md:142-146`). This design keeps lateral connectivity and bounds it by the span table. Unbounded connectivity would make every recheck a flood fill to bedrock or the area edge, as the generation pass does over every voxel of an area (`DEUS_Levels.js:2698`: `N = n * E_TOP`, 1,638,400 voxels at 256 × 256 × 25; 10,485,760 at 160 strata). That is a full-area scan per mutation and breaks V133. OQ-Q-01 asks the Owner.
- **Ceiling caps.** Until WG.00.17 replaces them with real upper layers, the legacy caps above +2 stay anchored by definition (`DEUS_Levels.js:2793`: `anchored: true`). They count as bearing.
- **A stable world at generation.** The generator must leave no member beyond its span, or play would bring down virgin terrain at the first nearby dig. The floating-rock pass (`DEUS_Levels.js:2695-2721`) is extended to also remove, thicken or pillar over-span natural members (PROPOSED-Q-06). The test in §12 (T8) evaluates every member of a fresh world once in test mode and expects zero failures.

### 4.6 Vertical propagation through 2-ft slices and 10-ft layers

- **Members cross layers.** S4 of layer z and S0 of layer z+1 are neighbours on the elevation index (e and e+1), so a member is layer-blind. A wall standing on a floor standing on a wall is one member while its voxels are contiguous.
- **Load goes down** through `e0 − 1` into the member below, as far as the world floor (e = 0 at `zMin`). **Status goes up:** when a member fails, the member resting on its top (the voxel at `e1 + 1`) loses bearing and is rechecked (§5.1).
- **Range.** e runs 0..159 at -16..+15 and 0..44 at the 9-layer test range. No 0..24 cap and no ±2 literal (audit Appendix A lists the legacy literals for WG.00.17).
- **Cheap walks.** Finding a member's bottom or top walks the column. In a UNIFORM chunk (ADR §15.3) all five strata of that layer are one value, so the walk moves a layer at a time: at most 32 chunk reads at 32 layers, usually one or two.

## Localized support recheck

### 5.1 Triggers

Nothing is scanned. Support work starts only from these events:

| Event | Emitted by | What is enqueued |
|---|---|---|
| `levels:strataChanged` (ref, `{ before, after, cause }`) | `writeCell`, `DEUS_Levels.js:1558`: every strata write (build, dig, damage, decay, fire, collapse, talus, spells) | Only when a voxel changed between solid, loose, fluid and air, or a voxel's HP band changed: the member(s) containing the changed voxels before and after, the member resting on the top of the changed range, the member under its bottom, and the members in the four neighbour columns overlapping the changed elevations |
| HP-only writes | the same event; `writeCell` emits it for HP-only changes too (`DEUS_Levels.js:1535`) | Only on a band change (§4.4), so decay and fire, which lower HP in small steps, cost at most 8 rechecks per voxel over its life |
| `levels:capChanged` (`DEUS_Levels.js:2816`), `levels:capBreached` (`:2875`) | legacy caps | the member under the cap |
| `objects:changed`, `objects:levelChanged` (`DEUS_Objects.js:313-314`) | object placed or removed | the member under the cell, only when its load crosses its capacity (a load band) |
| item drop and pick-up (`Items.drop`, `DEUS_Items.js:325`, and the take path) | items | as objects |
| fluid depth changes (SIM.50.02) | the fluid authority (D-4: `DEUS_Fluid`) | as objects, aggregated per member per tick |
| loose record changes (§2.6) | loose writes | the member under the stack |
| a member's state change (internal) | this system | its dependants: the member on its top, and the lateral members whose `rootDir` points at it |

Load events are throttled by a **load band**: `loadBand = min(8, floor(Lsup × 8 / cap))`. A lateral member is enqueued only when its load band moves to or from 8 (over capacity). Dropping one item on a floor does not wake support unless it tips the floor over.

### 5.2 The queue

- `supportDirty`: one FIFO ring of member keys for the whole world, deduplicated by a `queued` bit on the member record (a transient record is made for a member that has none).
- Order: enqueue tick, then elevation e, then cell index (ADR §16.3), so the processing order is a function of the mutation order only.
- Budget: **SUPPORT_BUDGET = 256** member evaluations per tick (the number ADR §16.3 leaves to SIM.40.01). What does not fit waits for the next tick in the same order.

### 5.3 Evaluating one member

1. Re-derive the member's extent from the strata at its key column: walk down to its bottom and up to its top (§4.6).
2. Bearing test (§4.2 items 1-4): one voxel read below `e0`, plus the failing-set lookup.
3. If not bearing: `dist = 1 + min` of the stored `dist` of the up to four overlapping, non-failing neighbour members, with `rootDir` set to the winning direction (ties N, E, S, W). A bearing neighbour without a record has dist 0 by the one-voxel test. A lateral neighbour without a record gets one from the chunk's lazy initialisation (§5.4).
4. Band, `spanEff`, `Lsup`, capacity, and the crush test for bearing members (§4.4).
5. Store the new `dist`, `rootDir`, band and load band. If any of them changed, enqueue the dependants (§5.1, last row).
6. If the member is now unsupported, put it in the failing set with its cause and fail tick (§6.1).

**Raised distances.** When a member's `dist` goes up or it disappears, the members that took their `dist` through it would otherwise count up slowly. So the update runs in two phases, as in voxel light propagation: first every member reachable by following `rootDir` back to the changed one is set to "unknown" (a walk of at most S_MAX steps outward), then those members are enqueued and take the minimum over their other neighbours.

### 5.4 Lazy records per chunk

Records exist only for lateral members (overhangs, cave ceilings, floors and roofs) in chunks something has touched since load. The first time a mutation lands in a chunk, the system computes `dist` for the chunk's lateral members with a multi-source search from the bearing members of the chunk and a halo of S_MAX cells: at most (32 + 2 × 12)² = 3,136 columns, once per chunk per load. Bearing members never need a record: the one-voxel test answers them. The records are derived state. They are not saved, and a load rebuilds them lazily with the same values, because `dist` is the unique minimum distance and `rootDir` ties are canonical.

### 5.5 Worst-case bound

| Case | Bound | Arithmetic |
|---|---|---|
| Idle (no mutation) | 0 work | V133: the queue is empty (`support.work_per_tick` = 0, ADR §9.1) |
| One evaluation | ≤ 64 reads | one bottom walk (1-2 chunk reads, ≤ 32 worst), one voxel below, 4 neighbour records, the load stack above (≤ 10 strata plus the cell's objects and items), the crush prefix over voxels with a `bearingKg` (≤ t, usually ≤ 10) |
| One changed voxel | ≤ 6 members enqueued directly | itself, above, below, 4 neighbours minus duplicates |
| Distance wave after a removal | ≤ (2 × S_MAX² + 2 × S_MAX + 1) × R members | the diamond of radius 12 is 313 columns; R is the number of members per column overlapping the elevation window, 1-2 in practice (a column's members are separated by air) |
| One tick | ≤ SUPPORT_BUDGET × 64 = 16,384 reads | about 0.1 ms at 10⁸ simple operations per second (not measured) |
| A fireball through a timber floor | about 25 voxels destroyed, ≤ 150 enqueues | one tick |
| 9 vs 32 layers | identical except the bottom walk | the walk is bounded by the layer count through UNIFORM chunks (≤ 32 reads) |

### 5.6 Determinism

Integers only; canonical neighbour order; the queue order is a function of the mutation order; no `Math.random`. Two runs from the same state and command log give the same failures on the same ticks. Save and load keep the queue, the failing set and the loose records; the `dist` records are rebuilt to the same values (§5.4), so a save in the middle of a cascade continues identically (ADR §10.7).

### 5.7 Area edges, region borders and LOD

- **Area edges:** §4.2. **Region and slab borders:** nothing special; the queue is per world.
- **LOD.** Support reads only geometry, which is fine at every LOD level (ADR §16.5). This design proposes one change to the PROPOSED ADR: process the queue every tick whatever the region's level, not "at the coarse tick" in L2. The queue holds only real work and dormant regions have none, so the cost is the same, and collapse timing then does not depend on where the camera is (ADR §5.7). Victims in L2 regions are bucket deaths as ADR §16.5 says. This is flagged for the ADR owner and depends on ADR-003 being adopted.
- **Deep history** runs the same code inside event bubbles (ADR §14.2); §10.5 adds a batched form for sites nobody observes.

## Sudden collapse

### 6.1 The failing state

- A member found unsupported enters the failing set: `{ memberKey, cause, detectedTick, failTick }`. The cause is `span`, `overload`, `crush`, or `support-lost` (the member under it or beside it failed or was destroyed).
- `failTick = detectedTick + WARN_TICKS[cause][class]` (action domain, INV-SIM-02):

  | Class | `support-lost` in the same tick as a blast, dig or collapse | `span`, `overload`, `crush` |
  |---|---|---|
  | loose stack (it only ever falls) | 0 | 0 |
  | natural rock | 0 | a seeded 0..10 ticks per member, so a cave-in is not one frame but stays deterministic |
  | masonry, brick, ashlar, vault | 0 | 5 ticks (3 game-minutes; 0.5 s real at 1x) |
  | timber, thatch, bridge deck | 0 | 20 ticks (12 game-minutes; 2 s real at 1x) |

- On entry: `support:failing` (§11). SIM.40.03 colonists leave the member's cells and the cells below it; a prop built in time wakes the member, and if it is supported again it leaves the failing set with `support:rescued`.
- At `failTick` the member is evaluated once more. If it is still unsupported, it collapses (§6.2). The warning times are OQ-Q-09.

### 6.2 The cascade

For a collapsing member M in column (x, y) with voxels `e0..e1`:
1. **What falls:** M's voxels; the loose stack on M's top; the objects and items on M's top cell; the units standing on it. A member resting on M's top is not dragged: it loses bearing, is enqueued, and falls in turn only if nothing else holds it (an upper floor held by other walls stays).
2. **Where it lands:** the first voxel below `e0` in the same column that is solid or loose. Fluid is passed through: the debris sinks and the fluid authority re-levels the displaced water through the `levels:strataChanged` hook it already has (`DEUS_Fluid.js:941-944`).
3. **Fall height:** `h = e0 − (landing + 1)` strata, `2h` ft.
4. **Conversion:** every voxel of M becomes its `debris` material with lineage = its own material and `kg = kgPerVoxel` (§6.3).
5. **Deposit:** the kg are added to the landing cell's loose record, and the strata bytes are re-derived; overflow goes to talus (§6.4).
6. **Writes and events:** M's voxels become air (`writeCell`, cause `collapse:fall`), the landing cell gets its loose voxels (cause `collapse:land`). Both emit `levels:strataChanged`, which enqueues the member M held up, the members rooted through M, and the landing member, whose load just grew.
7. **Chain inside the tick:** members enqueued by a collapse are evaluated in the same tick while `COLLAPSE_CHAIN_BUDGET` (64 members) lasts, so a tower falls together; the rest continue next tick in queue order.

**A tower across several layers.** A masonry tower on +1..+4 (the SIM.40.04 row) with a blast that destroys its base voxels at +1: the wall members above lose bearing (support-lost, 0 ticks), fall to the ground surface at 0, and convert to rubble; each storey's floor members lose their rootDir chains and fall in the same chain; the rubble pile overloads nothing (it lands on the ground) and spills as talus. At 32 layers the same fixture runs on +4..+15 (§12, T2).

### 6.3 Conversion with equal mass

- Each voxel: `ledger.transform(STRATUM_NATURAL or STRATUM_BUILT → LOOSE, family, kgPerVoxel, "collapse")`. `kgPerVoxel` is an integer table value and the loose record stores kg, so the transform is exact.
- An object crushed to 0 HP: `transform(OBJECT → OBJECT(remains) + LOOSE)`. Its kg is split into its catalogue remains' kg and loose debris for the rest. This needs a kg on every object type, including remains (PROPOSED-Q-01).
- Items falling are moved, not transformed. They have no HP (DURABILITY §4.6).
- No path here deletes or creates matter (LIFE-001), and no output is an ore id (§9.6).

### 6.4 Talus and angle of repose

- **Stability.** A loose column at c with top elevation `H(c)` is unstable against a neighbour n whose surface top is `H(n)` when `H(c) − H(n) > repose` (strata; §2.4: rubble 2, loose fill 1, sediment 1, ash 1, scrap 2, broken timber 2).
- **Spill.** One loose voxel's worth of kg (or what is left) moves from c to its lowest unstable neighbour, ties N, E, S, W. The moved kg lands on n's surface; if n is an open shaft or stairwell, it falls on (the landing search of §6.2), so talus pours down holes into lower layers.
- **Budget.** `TALUS_BUDGET` = 128 spill steps per tick, with a `talusDirty` queue ordered like the support queue. A 50-voxel collapse settles in roughly 50 × 5 = 250 steps, 2 ticks.
- **Ledger.** A spill moves kg within the same form and family, so the totals do not change; the feed records it for provenance (WG.65.16) but it is not a ledger transform.
- **Load.** Loose kg landing on a floor is load (§4.4) and can overload it (§6.6).

### 6.5 Falls and impact damage (V95, SUP-4)

- **A falling unit.** SRD: "a creature takes 1d6 bludgeoning damage for every 10 feet it fell, to a maximum of 20d6. The creature lands prone, unless it avoids taking damage from the fall" (`rules.json:4390`). The fall in feet is `2 × strata fallen`; dice = `floor(ft / 10)`: one full layer is 1d6, and the cap binds past 20 layers (200 ft) of the 320 ft world. Dice are seeded (ADR §10.1). **[STALE-1FT:** a one-level fall in the old model is 5 ft, 0 dice.**]**
- **A unit hit by debris.** The SRD baseline is Earthquake's structure collapse: "the creature takes 5d6 bludgeoning damage, is knocked prone, and is buried in the rubble, requiring a DC 20 Strength (Athletics) check as an action to escape ... On a successful save, the creature takes half as much damage and doesn't fall prone or become buried" (`spells.json:6379`, Dexterity save).
  - For an Earthquake spell the SRD's own radius ("within half the distance of a structure's height") applies unchanged (SIM.60).
  - For every other collapse, the units hit are those in the cells the debris passes through or lands on, plus talus spill cells. They take the same save and 5d6 (the SRD number), and the physical addition on top (DEC-018): +1d6 per further 10 ft the debris fell beyond the first 10 ft, capped at 20d6; debris under 500 kg on the unit's cell (one floorboard section) deals half. The addition is **extrapolated** (OQ-Q-08).
- **Buried units** stay buried until they make the DC 20 check or others clear the loose kg over them. Suffocation follows the SRD: a creature holds its breath for 1 + Constitution modifier minutes (minimum 30 seconds), then survives Constitution modifier rounds (`rules.json:4390`). With a 36 s tick (A1) there are 6 SRD rounds per tick; the rules layer resolves rounds inside the tick.
- **Objects** take crushing damage from the same dice against their V95 HP and armour, and break into their remains at 0 HP. This replaces DURABILITY's `collapse.damage (20) × levels fallen` (`docs/design/DURABILITY.md:716`).
- **Items** are moved to the landing cell. They have no HP.

### 6.6 The recheck the rubble itself triggers

- The landing member's load grows, so it is enqueued (§5.1). If it is a lateral floor and the debris exceeds its capacity, it fails too: a collapse onto a timber floor falls through storey after storey until it reaches a bearing member or the ground.
- Talus that spills onto a neighbour's floor loads that floor the same way.
- A loose stack whose support fails simply falls again (§4.2 item 2); loose matter never hangs.

## Decay-driven collapse

### 7.1 Who owns what (the Lane Q / Lane R interface)

Lane R (SIM.40.05, `origin/task/lane-r`) has no design on its branch at the time of writing. Its brief asks it to state the hand-off "with localized support rechecks (interface contract with Lane Q stated explicitly)" (its R-05). This is Lane Q's side of that contract; Lane R's document may amend it.

| Owner | Owns |
|---|---|
| Lane Q (SIM.40.01-.04) | members, spans, loads and capacities; HP bands and what they mean for support; the recheck queue; the failing set; collapse, debris conversion, talus and falls; the material ids and physical columns of §2 |
| Lane R (SIM.40.05-.09) | decay rates by material and exposure; maintenance and abandonment; the schedule of HP loss (ADR §17.3 `failDay`); site stages (intact, weathered, overgrown, collapsed, buried mound); reclamation; item weathering; rubble and sediment becoming soil and stone |
| Shared | the material table (Lane R adds rate columns keyed by the §2.7 ids); the one strata writer; the ledger families (§9.1) |

### 7.2 The contract

- **C1. Decay lowers HP, nothing else.** Decay writes HP bytes of constructed voxels (and of natural voxels, if Lane R weathers rock) only through the strata writer, with cause `decay:<reason>`. At HP 0 the writer destroys the voxel (`DEUS_Levels.js:1699-1703`), and with PROPOSED-Q-01 the destroyed voxel becomes its loose debris rather than air. From there Lane Q's collapse path runs.
- **C2. Band crossings, not daily steps.** Support reacts only when a voxel's band `(hp + 31) >> 5` changes (§4.4). Lane R should schedule the HP write for each band crossing (at most 8 per voxel) rather than every day, which generalises ADR §17.3's `failDay` into a `nextBandDay` heap.
- **C3. Events back to Lane R.** `support:failing`, `collapse:begin`, `collapse:landed` and `collapse:end` carry the member key and, when known, the site id (§11), so Lane R can derive the "collapsed" stage.
- **C4. Mass.** Everything from intact wall to rubble is a Lane Q transform with exact kg (§6.3). Rubble to sediment to soil or stone is Lane R's, with families unchanged.
- **C5. Inputs Lane Q offers.** `Support.query(ref)` (§11.2) returns thickness, dist, band, load ratio and the failing state, so Lane R can, for example, decay overloaded members faster.
- **C6. Roofs before walls, by the support rule itself.** A lateral member at distance d fails when `floor(spanBase × band / 8) < d`. A timber roof (spanBase 2) at d = 2 fails at the first band drop (band 7 gives 1); at d = 1 it fails below band 4. A bearing wall (d = 0) never fails by span, only by crush or HP 0. So the middle of a roof falls first, then its edges, then the walls, whatever Lane R's rates are; Lane R's sky-exposure rate makes roofs faster still.
- **C7. Foundations.** Lane R gives them the slowest class; Lane Q never collapses a foundation that bears on the ground (its crush margin is large).
- **C8. Time domains.** Decay is historical (days, years); support and collapse are action (ticks). INV-SIM-02.
- **C9. Determinism and LOD.** Lane R's closed-form days plus Lane Q's LOD-independent queue (§5.7) give the same stages at any LOD.

### 7.3 How an abandoned house ends as rubble

A 6 × 6 timber house with a thatch roof, 4 × 4 interior (20 ft, the most a thatch roof spans without a post):
1. Lane R lowers thatch HP fastest (sky exposure). At the first band crossing the four middle roof cells (d = 2) fail: their thatch becomes broken_timber and falls 8 ft to the floor inside. The roof has fallen in.
2. At band 3 the remaining roof ring (d = 1) falls.
3. The walls are bearing. Now open to the sky, Lane R decays them faster. Each wall voxel that reaches HP 0 becomes broken_timber, and the voxels above it lose bearing and fall.
4. What is left is a ring of broken_timber piles and, under stone walls, rubble and the foundation strata. Lane R rots broken timber to soil (organic) and buries the rest (the "buried mound"); foundations and stone rubble stay as recognisable traces (LIFE-003).
5. The house's total kg equals the debris kg at every step (§6.3).

### 7.4 What Lane Q gives Lane R per material

The `weather` column of §2.3-§2.5 names the catalogue field that should drive each rate (`weatherResistance` for stone, `rotResistance` for timber, `corrosionResistance` for iron, `DEUS_WorldCatalog.json:4893`), plus four fixed classes: foundation slowest; rammed earth the fastest mineral; thatch the fastest organic; iron grate by corrosion.

### 7.5 Only local rechecks

Lane R's heap pops the voxels that are due; each HP write that changes a band enqueues its member (§5.1). Lane Q never iterates structures, and Lane R never asks for support over an area. The cost per abandoned voxel is at most 8 rechecks over its whole life.

### 7.6 Durations under D-1 (OWNER_OPEN)

Calendar scale D-1 (audit §9) is open. This design never picks an option. Action-domain durations (warnings, falls, talus) are in ticks and do not depend on D-1. Slow durations are written in "years of simulated time"; this is what they mean under each option (A1: 1 game hour = 100 ticks, 1 game day = 2,400 ticks; at 1x one tick is 0.1 real seconds):

| Duration | D-1 option (a): solar day separate from the year, Y days per year (Y is the Owner's) | D-1 option (b): keep V123, 1 year = 1 game day |
|---|---|---|
| 1 game hour | 100 ticks (10 s real) | 100 ticks (10 s real) |
| 1 game day | 2,400 ticks (240 s) | 2,400 ticks (240 s) |
| 1 season | Y/4 days = 600 × Y ticks | 6 game hours = 600 ticks (60 s) |
| 1 year | 2,400 × Y ticks (240 × Y s) | 2,400 ticks (240 s) |
| 10 years | 24,000 × Y ticks | 24,000 ticks (40 min) |
| 100 years | 240,000 × Y ticks | 240,000 ticks (6.7 h) |

For illustration only, not a choice: Y = 20 is the archived clock's year (`archive/plugins/DEUS_Time.js:314`, "Spring (days 1-5) ... Winter (16-20)"), and Y = 336 is the 12 × 28-day year in the regrowth counter (`DEUS_Objects.js:162`). A roof that Lane R rates to reach its first band in 5 years falls in after 12,000 ticks (20 real minutes at 1x) under (b), and after 240,000 ticks (Y = 20) or 4,032,000 ticks (Y = 336) under (a). V123 itself is at `docs/VISION.md:338-340`.

<!-- CONTINUES -->
