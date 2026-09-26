# SIM.40.05 Decay Cycle Design: decay, reclamation, weathering, decay-to-geology (docs only)

| | |
|---|---|
| Task | SIM.40.05 (one design covering SIM.40.05 decay, SIM.40.06 nature reclaiming, SIM.40.07 item weathering and burial, SIM.40.08 deep-history decay, and the long-run test SIM.40.09 needs). Lane R, branch `task/lane-r`. Source: Directive 0028-AC A2 item 6, re-scoped by the PM on 2026-09-26 to the SIM.50.01 audit. |
| Writer / reviewer | Claude (writer). Grok (independent reviewer, launched later by the PM). This document does not certify itself. |
| Date | 2026-09-26 |
| Base commit | Branch HEAD when writing started: `0026c89c997778e5d12380d68e5c72c57a98f9d3` (`git rev-parse HEAD`). Its merge-base with `origin/main` is the brief's base `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`. `git diff --stat 84ee3b55 HEAD -- game/ docs/` is empty (EXIT=0), so every `game/` and `docs/` citation below resolves identically at both. Code is cited `file:line`; a bare plugin name (`DEUS_Levels.js:1558`) means `game/js/plugins/<name>`. |
| Kind of work | Design only. No code, scripts, tests or art. Nothing outside `tasks/SIM.40.05/lane-r/` was written. No art was generated, requested or integrated (DEC-007); art needs are text-only "art slot needed" lines for the Owner. |
| Inputs read | `docs/audits/LIVING_WORLD_GAP_AUDIT.md` (SIM.50.01, cited "audit"); `docs/worldgen/DEUS_WORLDGEN_WBS.md` Rev 25; `docs/society/DEUS_SOCIETY_WBS.md`; `docs/OWNER_DECISIONS.md` (DEC-010..DEC-022); `docs/VISION.md` (V74, V83, V95, V123, V128, V133, V137..V142); `docs/INVARIANT_REGISTRY.md`; `docs/RISK_REGISTER.md`; `docs/design/DURABILITY.md`, `REMAINS.md`, `ECOLOGY.md`, `TERRAIN_LEVELS.md`, `VERTICAL_WORLD.md`, `VERTICAL_NATURAL_WORLD.md`, `WORLD_ARCHITECTURE.md`, `TECH_TREE.md`, `PEOPLES.md` (decay parts); `DEUS_Levels.js`, `DEUS_Fire.js`, `DEUS_Anim.js`, `DEUS_Objects.js`, `DEUS_History.js`, `DEUS_HistoricalDemographics.js`, `DEUS_Doors.js`, `DEUS_Ecology.js`, `DEUS_Core.js`, `game/data/DEUS_WorldCatalog.json`; SRD 5.1 at `game/data/srd51/` (`rules.json`, `creatures.json`, `spells.json`); ADR-003 Rev 3 (PROPOSED) from `origin/task/lane-m`; sibling briefs `origin/task/lane-q:tasks/SIM.40.01/lane-q/BRIEF.md` and `origin/task/lane-w:tasks/SIM.40.10/lane-w/BRIEF.md`. |
| Method | The writer read the audit's decay, fire, settlement, conservation and clock sections, ADR-003 §7.8, §14, §15.3, §16 and §17, and the material, writer, damage and support parts of `DEUS_Levels.js` directly. Four read-only search passes (code citations, design docs, planning IDs, SRD plus ADR-003 plus sibling lanes) were delegated; the citations used here were spot-checked against the files. |
| Limits | Nothing was run in NW.js or the RMMZ editor; no screenshots exist because nothing visual is claimed. Every rate, fraction and duration is a **design default** (a parameter in data, tunable), not a measured or balanced value; real-world orders of magnitude are the source where the SRD is silent. Memory and CPU figures are arithmetic from stated assumptions, not measurements. Lanes Q and W had pushed only their briefs (`origin/task/lane-q` at `9103799e`, `origin/task/lane-w` at `31892ae7`); every interface with them is written here as an explicit, unreviewed assumption. |
| Dependency on ADR-003 | ADR-003 Rev 3 (`docs/adr/ADR-003_sim_render_split_and_lod.md` on `origin/task/lane-m`, tip `9e0ef94d`) is cited **PROPOSED**: its own status line says it "stays PROPOSED until the Owner and the PM sign it off" (ADR-003 L3). A search pass reported that it was merged to `origin/main` after this lane's base (`3b33faa5`, with a Grok PASS), still marked PROPOSED; this lane's base does not contain it. Every mechanism below that uses its tick (10 Hz, 1 tick = 36 game-seconds, ADR-003 L58), its game-day cadence (L1689), its LOD levels L0/L1/L2 (L64-70), its 32×32 chunk storage (§15.3), its ledger transform API (§7.8) or its support queue (§16.3) is marked **[ADR-003]** and must be re-checked if ADR-003 changes. ADR-003 lines are cited `ADR-003 Lnnn`. |

## 0. Conventions used in every section

### 0.1 Geometry (DEC-013 as amended, Owner ruling D-2)

- 32 Z layers, **-16..+15**, surface 0; a square is **5 ft × 5 ft**; a layer is **10 ft**; a layer holds **5 slices (strata) of 2 ft** (`docs/OWNER_DECISIONS.md:177-181`). Bands: Lower-2 -16..-9, Lower-1 -8..-1, Surface 0..+3, Upper-1 +4..+9, Upper-2 +10..+15 (`docs/OWNER_DECISIONS.md:187-191`).
- One slice of one square is 5 × 5 × 2 = **50 ft³**; one layer-cell is **250 ft³**.
- **Stale code state.** The code has 5 levels (-2..+2) of five **1 ft** strata: `DEUS_Levels.js:61` (`const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);`), `DEUS_Levels.js:985` ("Every 5 ft cell of every level is five 1 ft strata"), `DEUS_Levels.js:993` (`const STRATA = 5, CELL_FT = 5;`), audit F-01. Under that stale model a slice is 25 ft³, and every threshold written below in slices means half the feet. Where a number would differ it is marked "(stale: ...)". WG.00.17 replaces the stale model; this design is written against 2-ft slices and 10-ft layers only.
- Both models have **5 slices per layer**, so the changed-cell record layout (`DEUS_Levels.js:997`, 11 bytes: connector, 5 materials, 5 HP bytes) keeps its size under DEC-013. Only the slice height and the layer count change.

### 0.2 Mass units and the ledger (LIFE-001, WG.65.15, ADR-003 §7.8)

- The ledger is the ADR-003 Q-MASS ledger: integer mass per material **family**, moved between **forms** only by `ledger.transform(fromForm, toForm, family, mu, cause)`; sources and sinks only by `ledger.source/sink(q, n, cause)` with a named cause (ADR-003 L943-950, §7.9). WG.65.15 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:254`) builds the verifier.
- **Mass unit (mu).** ADR-003 leaves the unit to SIM.40.01 with WG.65.15. This design **assumes 1 mu = 1/16 lb** (SRD weights are in pounds). If they choose another unit, every mu figure below scales by one constant. JS integers are exact to 2^53 ≈ 9.0 × 10^15 mu; one 256×256 area fully solid at 32 layers is 65,536 × 160 slices × ≈132,000 mu (granite at 165 lb/ft³ × 50 ft³ × 16) ≈ 1.4 × 10^12 mu, so about 6,400 such areas fit before exactness is at risk.
- **Rounding.** Every split of an integer mass into several outputs computes all but one output with `floor` and gives the last output the remainder by subtraction, so the parts always sum exactly to the input. Sub-slice leftovers are held in a per-cell residue record (section "Sparse storage and cost"), never dropped.
- **Families used here:** STONE (per lithology), EARTH (clay, silt, soil mineral fraction, mudbrick, ceramic), ORGANIC (wood, plant fibre, textile, leather, paper, flesh, food, humus, and the ash and charcoal they leave: a family keeps its mass through every form it takes), BONE, FE, CU (copper and its alloys, split by element per WG.65.15: Cu, Sn, Zn), PB, AG, AU, PT, SPECIAL (mithral, adamantine), GLASS, WATER. WG.65.15 names "Fe, Cu, Ag, Au, Pt" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:254`); the rest are this design's proposal.
- **Forms used here:** NATURAL (in-place natural strata), BUILT (constructed strata or objects), RUBBLE (loose broken material in strata), SCRAP (metal fragments as items), FINES (weathering dust and mortar crumbs, a sediment form), SEDIMENT, SOIL-MIN (soil mineral fraction), SOIL-ORG (humus, nutrients), SOIL-CARBON (charcoal fragments in soil), ITEM, ITEM-BURIED (ADR-003's `buried: true`, L1678), REMAINS (corpses and bones), ASH, CHARCOAL, OXIDE (rust, patina, tarnish: trace mineral, never ore), ROCK-SED (lithified; Owner-gated, OQ-R-03), BIOMASS (living plants, owned by SIM.50.04), BODY (living creatures, owned by SIM.40.10 / Lane W).
- **Explicit sources and sinks used here:** AIR (outgassing of rot and combustion as a sink; photosynthetic uptake by plants as SIM.50.04's source), CONJURED (DEC-018's PM default, `docs/OWNER_DECISIONS.md:262`), and, in test fixtures only, FIXTURE-FEED (a scripted sediment or water feeder standing in for systems not built yet).
- **Oxygen is not modelled.** Rust, patina and tarnish carry the metal's mass unchanged (Fe stays Fe family). Real oxides weigh more than the metal; modelling that would need an AIR source per corrosion event. This keeps metal families exact and is listed as a WG.65.15 interface assumption.
- Ledger entries are written `T(FROM→TO, FAMILY, m, cause)`.

### 0.3 Time units (D-1 is OWNER_OPEN)

- Every duration is authored in **simulated years (sy)**. At load, a duration becomes game days with `days = sy × DPY`, where **DPY (game days per year) is the D-1 parameter**. Under D-1 option (b), keep V123 as coded, **DPY = 1** (`DEUS_Core.js:324`, `this.year++; // 1 day/night cycle per year`). Under D-1 option (a), separate the solar day from the year, **DPY = N > 1**, chosen by the Owner. This design does not choose.
- Schedules are integer game days on ADR-003's integer tick clock (2,400 ticks per game day, 240 s real at 1x; ADR-003 §3.2). All decay timers are in the `historical` domain (INV-SIM-02, `docs/INVARIANT_REGISTRY.md:52`).
- The mapping table for both options is in section "Deep history and LOD".

### 0.4 Rendering and art (DEC-011, DEC-007)

- Flat 1:1 layer rendering, no filters, tints, fog, shading overlays or scaling (`docs/OWNER_DECISIONS.md:154`). A visible decay stage is a **catalogue slot name only**; its look is a sprite frame or tile from the art catalogue (WG.20.02 adds "decay-stage overlays", `docs/worldgen/DEUS_WORLDGEN_WBS.md:135`). No motion is code-driven (AGENTS.md Rule 12).
- Art needs are written as text only: "art slot needed: <name>, <purpose>".

## Decay drivers

This section answers R-01: what makes a thing decay, how fast, and who stops it.

### R-01.1 What exists

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:1000` | `// Material table. Diagnostic values, not balanced:` | Six strata materials with `maxHP`, `support`, `debris`, `resist`; no decay rate, exposure or maintenance field. |
| `DEUS_Levels.js:1007` | `{ id: M_WOOD, key: "wood", ... debris: "broken_timber", resist: { impact: 1, dig: 1, blast: 1.2, fire: 2 } }` | Wood has a fire factor that nothing uses (FIR-2). |
| `game/data/DEUS_WorldCatalog.json:4721` | `"weatherResistance": 50,` | Six stones carry `weatherResistance` (lines 4721, 4740, 4758, 4777, 4795, 4814). No code reads it (DEC-2). |
| `game/data/DEUS_WorldCatalog.json:4893` | `"corrosionResistance": 30,` | Seven metals carry `corrosionResistance` (iron 30; gold 99 at :4953). No code reads it. |
| `game/data/DEUS_WorldCatalog.json:4575` | `"rotResistance": 30,` | Woods carry `rotResistance`. No code reads it. |
| `DEUS_Doors.js:91` | `const hp = Math.max(1, (type.door && type.door.hp) \| 0);` | Doors are the only structures with HP (audit §4.2). |
| `DEUS_HistoricalDemographics.js:521` | `s.abandonedYear = state.currentYear;` | Abandonment exists only as a year in the history ledger; `isRuined` is never set (X-7). |

There is no maintenance state, no abandonment flag on structures, no exposure classification and no slow clock that could drive decay (DEC-1, ERO-3, F-06).

### R-01.2 The rule

Each built element (a built stratum marked `M_BUILT`, `DEUS_Levels.js:995`, or a built object) loses HP in closed form once it is unmaintained, following ADR-003 §17.3:

`HP(day) = HP(d0) − floor(rateMilli[dc][ex] × (day − d0) / 1000)` (ADR-003 L1653),

with two additions this design makes:
1. **Rates are authored as lives, not per-day numbers.** For decay class `dc` and exposure `ex`, the data holds `lifeYears[dc][ex]`, the simulated years a full-HP element takes to reach 0 HP. At load, `rateMilli = ceil(1000 × maxHP / (lifeYears × DPY))`, so the same data works under both D-1 options. A life of "∞" means no decay and no schedule entry.
2. **Modifiers multiply the life, never the HP.** `life = lifeYears[dc][ex] / (M_ft × M_root × M_fire)`, each modifier ≥ 1, quantized to 1/8 steps so that small climate changes do not reschedule anything.

### R-01.3 Decay classes (dc)

The material model (Lane Q's Q-01 table, which its brief says carries a "weathering and corrosion class", `origin/task/lane-q:tasks/SIM.40.01/lane-q/BRIEF.md:44`) gives each material a `decayClass`. Proposed classes:

| dc | Covers | Scaled by existing catalog field |
|---|---|---|
| ASHLAR | dressed or cut stone laid in courses | `weatherResistance` (life × wR / 90) |
| RUBBLESTONE | fieldstone, rubble masonry with mud or lime mortar | `weatherResistance` (life × wR / 90) |
| BRICK | fired brick with lime mortar | none today |
| MUDBRICK | adobe, cob, rammed earth, daub | none today |
| TIMBER | heavy timber: beams, posts, log walls, props | `rotResistance` (life × rR / 50) |
| LIGHTWOOD | planks, shingles, wattle, furniture, doors | `rotResistance` (life × rR / 50) |
| THATCH | straw, reed, turf roofs | none |
| TEXTILE | cloth, leather, rope, paper, parchment | none |
| FLESH | bodies, meat, food | none (remains, see "Metals and items") |
| BONE | bone, horn, antler, ivory, shell | none |
| FERROUS | iron, steel | `corrosionResistance` (life × cR / 30) |
| CUPROUS | copper, bronze, brass | `corrosionResistance` |
| LEADTIN | lead, tin, pewter | `corrosionResistance` |
| SILVER | silver | `corrosionResistance` |
| NOBLE | gold, platinum | none: never corrodes |
| SPECIAL | mithral, adamantine, magic items | none: never corrodes by default (OQ-R-05) |
| GLASS, CERAMIC, STONEITEM | glass, fired clay, stone tools and querns | none: never decays (relics) |

Natural (unbuilt) strata have no decay class. Their weathering is SIM.50.03's erosion (WG.65.05), not decay.

### R-01.4 Exposure classes (ex)

ADR-003 names three exposures: open to the sky, wet, buried (L1654). This design refines them into seven. Each maps back to one of the three.

| ex | Condition (all read from cached aggregates, never scanned) | ADR-003 class |
|---|---|---|
| SEALED | roofed **and** maintained, or enclosed in dry rock underground with no seep | (none: lowest) |
| SHELTERED | roofed (a solid stratum above within the structure) but unmaintained | sky, reduced |
| SKY | no solid stratum above up to `zMax` (ADR-003's cached per-column "open to the sky" aggregate) | sky |
| WET | the element's cell or a face neighbour holds fluid for ≥ 1 game day (D-4 water authority), or is saturated below the water table | wet |
| BURIED-AER | covered by ≥ 1 slice (2 ft; stale: 1 ft) of soil, sediment or rubble, above the water table | buried |
| BURIED-ANOX | buried below the water table or under ≥ 1 full layer (10 ft) of fill | buried |
| CAVE | underground (layer ≤ -1 under natural rock), humid, no sky, not flooded | sheltered, humid |

Exposure is recomputed **only** for the elements whose inputs changed: a roof element failing (its cells' columns), a strata write above the element (burial or excavation), a fluid wet/dry transition on a face neighbour, or a maintenance change of the owning structure. Each of those arrives as an event (`levels:strataChanged`, `DEUS_Levels.js:1558`; the fluid change feed; the site upkeep event). Nothing walks the world to find exposure.

**Water dependency (D-4).** WET and BURIED-ANOX need a water authority. Per the PM decision D-4 (audit §9), `DEUS_Fluid` becomes that authority and the legacy flood fill that creates water (`DEUS_Levels.js:3315`, WAT-1) is retired. If the Owner overturns D-4, WET and the water table must come from whatever replaces it; the rest of this design is unchanged. **This is a D-4 dependency.**

### R-01.5 Modifiers

- **Freeze-thaw and snow (SIM.50.06).** SIM.50.06 publishes, per LOD region, an annual freeze-thaw index `FT` in 0..1 and an annual maximum snow load. For porous masonry (MUDBRICK, BRICK, RUBBLESTONE) `M_ft = 1 + 2 × FT`; for ASHLAR `M_ft = 1 + 2 × FT × (1 − wR / 100)`; for other classes `M_ft = 1`. Snow load is not a decay rate: it goes to Lane Q's roof load check, so a decay-weakened roof fails earlier in a snowy region (section "Decay-driven collapse"). Below layer -1 `FT = 0` (no freeze-thaw underground). A region's index change reschedules its elements only when the quantized modifier changes (1/8 steps), and only for elements in that region, which is bounded by that region's decaying-element count.
- **Roots (SIM.50.04).** A tree or shrub object on the element's cell or a face neighbour sets `M_root = 2` for MUDBRICK, BRICK, RUBBLESTONE and 1.5 for ASHLAR. It arrives as an `objects:changed` event for that cell.
- **Fire damage.** Fire removes HP at once through the damage path (`registerDamageResponse`, `DEUS_Levels.js:1653`; DURABILITY's fire rule, `docs/design/DURABILITY.md:145`). A charred TIMBER or LIGHTWOOD element also gets `M_fire = 1.5` for the rest of its life. Fire residue is in "Fire residue".
- **Burial** is not a modifier; it changes the exposure class (to BURIED-AER or BURIED-ANOX), which usually slows decay to nothing.

### R-01.6 Default lives (`lifeYears[dc][ex]`, unmaintained, sy)

These are **design defaults** (data, tunable). Source for all rows: real-world orders of magnitude (thatch fails within a generation, unroofed mudbrick melts in decades, dressed stone walls stand for millennia, buried iron survives in anoxic ground); the SRD has no decay rates (the only SRD statement that corpses decay is *gentle repose*, `game/data/srd51/spells.json:8417`). ∞ means no decay.

| dc | SEALED | SHELTERED | SKY | WET | BURIED-AER | BURIED-ANOX | CAVE |
|---|---|---|---|---|---|---|---|
| THATCH | 60 | 30 | 12 | 5 | 8 | 200 | 10 |
| LIGHTWOOD | 150 | 60 | 25 | 10 | 15 | 500 | 20 |
| TIMBER | 400 | 150 | 60 | 25 | 40 | 2,000 | 50 |
| MUDBRICK | 1,000 | 400 | 60 | 15 | ∞ | ∞ | 800 |
| RUBBLESTONE | 3,000 | 1,500 | 400 | 200 | ∞ | ∞ | 3,000 |
| BRICK | 5,000 | 2,500 | 800 | 300 | ∞ | ∞ | 5,000 |
| ASHLAR (wR 90) | ∞ | 20,000 | 3,000 | 1,500 | ∞ | ∞ | 20,000 |

Item classes (TEXTILE, FLESH, BONE, metals) have their own tables in "Metals and items".

**Worked example (stone house, timber roof, temperate, FT = 0.25, abandoned at year 0).** The TIMBER roof is SKY: life 60 sy, so it fails at 60 sy. The ASHLAR walls are SHELTERED while roofed: after 60 sy they have lost 60 / 20,000 = 0.3 % of HP. At 60 sy the roof's failure makes the wall tops SKY: ASHLAR SKY with `M_ft = 1 + 2 × 0.25 × 0.1 = 1.05`, quantized to 1.125, life 3,000 / 1.125 ≈ 2,667 sy, so the upper courses fail near year 2,720. The fallen courses bury the lower courses (BURIED-AER, ∞), which then stop decaying: the foundation survives (TR-1 in "Ruins and re-founding").

### R-01.7 Maintenance and abandonment

**Who counts as maintaining.** A built element is maintained on day D if either:
- a job touched it within `maintainYears[dc]` (repair, re-thatch, re-point; defaults THATCH 2, LIGHTWOOD 5, TIMBER 10, MUDBRICK 2, masonry 25 sy); or
- its structure belongs to a site whose **upkeep coverage** `k` is 1. `k = min(1, labourAvailable / labourDemand)`, where `labourDemand = Σ upkeepDays[dc] × elementCount` (person-days per sy, data) and `labourAvailable = sitePopulation × upkeepShare` (default 5 % of work time). `sitePopulation` counts tracked units and crowd-bucket members of the owning faction resident at the site (ADR-003's Q-FACTPOP; Lane W and DEC-014 own the counts).

If `k < 1`, the site keeps whole structures maintained in a deterministic triage order (most recently used first, ties by structure id) until the labour runs out; the rest become unmaintained. The triage list is recomputed only on the site's population-change and structure-change events, so its cost is bounded by that site's structure count. Upkeep consumes material: each repair books `T(ITEM→BUILT, family, m, "decay.repair")` for the mass the element shed (see R-02.3).

**When an element becomes abandoned.** An element is abandoned `abandonYears[dc]` after it was last maintained (ADR-003's `abandonDays`, L1650; defaults 1 sy for THATCH and LIGHTWOOD, 2 sy for everything else). Only then does it get a decay schedule (`d0` = the day it became abandoned).

**When a site becomes abandoned.** A site is ABANDONED when its resident population is 0 for `siteAbandonYears` (default 1 sy), or when SIM.50.09 declares it abandoned (war, famine, disease; `docs/worldgen/DEUS_WORLDGEN_WBS.md:552`). Its structures then all lose coverage in one event, bounded by the site's structure count. The site state machine is in "Ruins and re-founding".

**Cost.** A maintained element has no heap entry and costs nothing per tick. ADR-003's requirement "a maintained settlement does zero decay work over 10 game days" (§17.6) holds by construction.

### R-01.8 Ledger entries and SRD

- Losing HP is not a mass transfer; it books nothing. Mass moves only when an element sheds fines (R-02.3), breaks (Lane Q's collapse path) or weathers after breaking. Every such move is listed in "Structure stages".
- **SRD baseline (DEC-018).** SRD object Armor Class by material (Cloth, paper, rope 11; Crystal, glass, ice 13; Wood, bone 15; Stone 17; Iron, steel 19; Mithral 21; Adamantine 23; `game/data/srd51/rules.json:6962`) and SRD object hit points by size (`rules.json:7016`) stay the baseline for `maxHP` and AC; Lane Q maps them to elements. Decay only lowers HP over time on top of them.
- **Damage threshold.** The SRD says damage below an object's damage threshold "is considered superficial and doesn't reduce the object's hit points" (`rules.json:7167`). Decay is not damage from an attack or effect, so this design lets decay lower HP regardless of the threshold; otherwise a castle wall with a threshold would never decay, contradicting V138 (`docs/VISION.md:132`). This is a design choice, flagged for the reviewer.

## Structure stages

This section answers R-02: the full chain from intact building to rock, per material, with what each stage is in the strata and object model and which catalogue slot marks it.

### R-02.1 What exists

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:1602` | `if (opts.constructed && SOLID_B[v & 0xff] === 1) v \|= M_BUILT;` | The strata format can mark built strata, but no build job writes it: walls, doors and furniture are objects (LAND-5, SUP-2). |
| `DEUS_Levels.js:1702` | `rec[REC_M + s] = M_AIR;` | A stratum at 0 HP becomes air; the debris exists only as a label on `levels:strataDestroyed` (`DEUS_Levels.js:1002`, `:1721`). |
| `DEUS_History.js:1508` | `e && e.ruin ? typeId(e.ruin) : 0); }` | The only ruin transition is instant, in the disabled settle run (`game/data/DEUS_WorldCatalog.json:7670`, `"simulate": false,`). |
| `game/data/DEUS_WorldCatalog.json:2104` | `"stone": 2` | Picking catalog rubble yields 2 stone regardless of what made it (LAND-1). |

**Prerequisite (audit §6 step 5, LAND-5).** Stages below assume that buildings are **built strata** (Lane Q's Q-02: "Foundations must be stratum matter that later ruins and re-founding can reuse", `origin/task/lane-q:tasks/SIM.40.01/lane-q/BRIEF.md:45`) and that the new strata materials RUBBLE, LOOSE-FILL, SEDIMENT, ASH, SCRAP and OXIDE exist (audit ERO-1; Lane Q's Q-01 lists "rubble, loose fill, sediment, ash, ice, scrap, rust/mineral trace", BRIEF.md:44). Built objects that stay objects (furniture, doors) follow the same stages as their material, with the object's catalog `ruin` form at breakage.

### R-02.2 The decay member

ADR-003 schedules per element (L1659-1661). A house of 10×10 squares with two-layer walls has about 36 perimeter squares × 2 layers × 5 slices = 360 wall strata plus 100 roof strata: about 460 elements. Scheduling each one separately costs 460 heap entries per house for no gain, because elements of one wall share material, exposure and maintenance.

This design groups elements into **decay members**: a run of built strata of one structure with the same `dc`, the same `ex` and the same role (ROOF, WALL-UPPER, WALL-BASE, FLOOR, FOUNDATION, PROP, FITTING). A member holds at most 64 strata (a cap that bounds the support work one member event can cause). One heap entry per member, keyed `(nextDay, memberId)`. Each element's HP is still the closed-form ADR-003 value; the member just shares `d0`, `HP(d0)` and the rate. A member is split when its elements' exposure diverges (for example, rubble buries the lower slices of a wall): the split is local to that member.

Roles are assigned when the structure is built (Lane Q's build path writes them into the member index, not into the strata). **WALL-BASE** is the lowest two slices (4 ft; stale: 2 ft) of every wall; **FOUNDATION** is any built stratum at or below the ground surface of its cell.

### R-02.3 The stages

Stages are derived (ADR-003 L1666) per structure from member states, then per site as the stage reached by at least 50 % of the site's built mass. Thresholds use the member HP fraction `h = HP / maxHP`.

| Stage | Entered when (structure level) | In the strata / object model | Ledger entries at entry | Catalogue slot (names only, DEC-011) |
|---|---|---|---|---|
| S0 INTACT | maintained, or every member `h > 0.85` | built strata at full or repaired HP | none | the built tile or object as it is |
| S1 WEATHERED | any member `h ≤ 0.85`, no member failed | built strata, HP byte lowered at Lane Q's capacity thresholds (see "Decay-driven collapse") | per HP step of a masonry or mudbrick member: `T(BUILT→FINES, family, f_shed × mass_member / steps, "decay.shed")`, fines deposited on the member's foot cell | `decay.<family>.weathered` |
| S2 OVERGROWN | S1 or later, and vegetation (SIM.50.04) holds ≥ 1 plant object on the footprint or its 1-cell halo | plant objects on built cells (allowed by the reclamation rule in "Nature reclaiming") | plant growth is SIM.50.04's AIR source; none from decay | `decay.<family>.overgrown` |
| S3 COLLAPSED RUIN | ≥ 50 % of ROOF mass has failed and at least one WALL-UPPER member still stands | roof strata have broken into RUBBLE (via Lane Q) on the floor slices below; walls partly standing | Lane Q's `T(BUILT→RUBBLE, family, m, "collapse.decay")`; FITTING members release `T(BUILT→SCRAP, FE, m, "decay.release")` | `decay.<family>.collapsed` |
| S4 RUBBLE / SCRAP | every WALL-UPPER member has failed; WALL-BASE and FOUNDATION remain | a rubble spread within the footprint plus a 1-cell halo, over standing wall bases | Lane Q's `T(BUILT→RUBBLE)` for each wall member; organic rubble starts to rot (below) | `rubble.<family>`, `scrap.<metal>` |
| S5 BURIED MOUND | ≥ 50 % of the footprint's rubble and wall bases lie under ≥ 1 slice (2 ft; stale 1 ft) of SOIL or SEDIMENT, and the footprint stands ≥ 1 slice above its surroundings | SOIL-ORG and SEDIMENT strata over RUBBLE strata over WALL-BASE and FOUNDATION built strata | burial is SIM.50.03's transfer or decay's own litter and melt (see "Nature reclaiming") | `mound.buried` (a ground and slope look, not a building) |
| S6 SOIL / SEDIMENT | the non-anchor RUBBLE and FINES have become SOIL-MIN (stony soil) | a stony soil horizon; anchor matter (TR-1..TR-7) stays as it is | `T(RUBBLE→SOIL-MIN, family, m, "decay.pedogenesis")`, `T(FINES→SOIL-MIN)` | `soil.stony` |
| S7 ROCK | Owner-gated (OQ-R-03): SEDIMENT and SOIL-MIN under ≥ 1 layer (10 ft) of cover for ≥ `lithYears` | a ROCK-SED stratum (breccia, conglomerate, mudstone, sandstone) | `T(SEDIMENT→ROCK-SED, family, m, "geology.lithify")` | `strata.rock_sed.<kind>` |

**Roofs fail before walls.** Roofs are SKY-exposed from the start; walls are SHELTERED while the roof stands (R-01.6). With the default lives, every roof class fails before every wall class of the same structure: a THATCH roof at 12 sy, a LIGHTWOOD roof at 25 sy and a TIMBER roof at 60 sy, against 96 sy or more for timber walls, about 60 sy after roof loss for mudbrick, and centuries or more for masonry. A data validator (AT-R-02) rejects any table in which a structure's ROOF life at SKY is not shorter than its WALL life at SHELTERED.

**Shedding.** Masonry and mudbrick lose mortar, plaster and surface grains as they weather. At each HP step (the capacity thresholds, at most `steps` per life, default 4) a member books `f_shed / steps` of its mass to FINES. Defaults `f_shed`: MUDBRICK 0.30 (walls melt into their own mound), RUBBLESTONE 0.05, BRICK 0.03, ASHLAR 0.01, timber classes 0 (they rot after breaking instead). FINES land on the foot cell of the member and add to its residue record (a slice is written only when a full slice of mass accumulates).

**Rot of organic rubble.** Broken TIMBER, LIGHTWOOD and THATCH (`broken_timber`, `DEUS_Levels.js:1007`) weather on their own schedule: `rotYears[dc][ex]` = the same life as the intact class at that exposure. At the end, `T(RUBBLE→SOIL-ORG, ORGANIC, floor(m × 0.2), "decay.rot")` and `sink(AIR, ORGANIC, m − that, "decay.rot.outgas")`. The 20 % humus fraction is a default.

**Pedogenesis of mineral rubble (S5 to S6).** Buried non-anchor RUBBLE becomes stony soil over `pedoYears` (default 5,000 sy BURIED-AER; ∞ BURIED-ANOX, where it stays rubble). FINES become SOIL-MIN over 200 sy. This is WG.65.08's process (`docs/worldgen/DEUS_WORLDGEN_WBS.md:247`) at the level of one site; WG.65.08 owns the soil model.

### R-02.4 Per-material chains

| dc | Chain after abandonment (default lives, temperate, no erosion) | End state within 10,000 sy |
|---|---|---|
| THATCH roof | SKY: weathered at ~2 sy, fails at 12 sy (S3) → RUBBLE rots to SOIL-ORG and AIR at 12 sy more | soil; nothing structural |
| LIGHTWOOD | roof fails at 25 sy; walls SHELTERED then SKY, fail near 50 sy; rubble rots by ~75 sy; nails and hinges become SCRAP (FE) at breakage and then corrode (R-03) | soil with an iron-oxide trace (TR-8) |
| TIMBER | roof fails at 60 sy; walls fail near 96 sy; posts in the ground are BURIED-AER (40 sy) and rot first at the base, which is what brings timber walls down; waterlogged timbers (BURIED-ANOX) last 2,000 sy | soil; post stains (a SOIL-ORG trace in the post hole) |
| MUDBRICK | roof fails first (whatever its class); walls SKY 60 sy, shedding 30 % of their mass as FINES around their base while they stand; upper walls fail and slump; the fines and slumped brick bury the wall bases (BURIED-AER, ∞) | a mound (tell) around standing wall stubs: S5 |
| RUBBLESTONE | walls SKY 400 sy after roof loss; upper courses fall and bury the bases | S4 then S5 as soil accumulates |
| BRICK | walls SKY 800 sy after roof loss | S4 then S5 |
| ASHLAR | walls SKY about 2,700-3,000 sy after roof loss; foundations never decay | S3 or S4 at 10,000 sy on a stable site; S5 where sediment accumulates |
| Vaults (masonry below ground) | CAVE or SEALED: 20,000 sy or ∞ for ASHLAR; the risk is collapse, not decay (Lane Q) | standing voids (TR-2) |

### R-02.5 Catalogue slots and art needs (names only)

Slots follow NAT-001's "strict semantic banding" (`docs/RISK_REGISTER.md:72`): one slot per material **family** and stage, not per material, to avoid a catalogue explosion. The existing ground kind `ash` (`game/data/DEUS_WorldCatalog.json:257`) and the rubble and bones objects (`:2091`, `:2069`) are reused where they fit.

- art slot needed: `decay.stone.weathered`, masonry wall face at stage S1 (one per family: stone, brick, earth, wood)
- art slot needed: `decay.<family>.overgrown`, the same wall with vines or moss as sprite frames (stage S2)
- art slot needed: `decay.<family>.collapsed`, broken wall top and open roof line (stage S3)
- art slot needed: `rubble.<family>`, loose rubble strata tile per family (stone, brick, earth, wood)
- art slot needed: `scrap.fe` and `scrap.cu`, small scrap-metal item frames (rusted and green-patinated)
- art slot needed: `mound.buried`, grassed low mound ground over buried ruins (S5)
- art slot needed: `soil.stony`, stony soil strata face for cutaways (S6)
- art slot needed: `strata.ash` and `strata.charcoal`, ash and charcoal strata faces for cutaways (see "Fire residue")
- art slot needed: `strata.rock_sed.breccia`, only if the Owner puts lithification in scope (OQ-R-03)
- art slot needed: `remains.<size>.<stage>`, per-stage remains frames to replace REMAINS.md's stage tints (see "Metals and items")

<!-- APPEND -->
