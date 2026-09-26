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

**Shedding.** Masonry and mudbrick lose mortar, plaster and surface grains as they weather. At each HP step (the capacity thresholds, at most `steps` per life, default 4) a member books `f_shed / steps` of its mass to FINES. Defaults `f_shed`: MUDBRICK 0.30 (walls melt into their own mound), RUBBLESTONE 0.05, BRICK 0.03, ASHLAR 0.01, timber classes 0 (they rot after breaking instead). FINES accumulate in the member's own **shed pool** (one integer per member, not one record per cell). When the pool holds one slice of mass for every foot cell of the member, decay writes one FINES slice along those foot cells and subtracts exactly that mass; the remainder stays in the pool.

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

## Metals and items

This section answers R-03: what happens to loose items, remains and metal. It covers SIM.40.07 ("loose organic items decompose into soil; metals rust; durable relics become buried finds ... mineral ore is never generated (LIFE-002)", `docs/worldgen/DEUS_WORLDGEN_WBS.md:540`) and the remains half of DEC-3.

### R-03.1 What exists

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Items.js:7` | `@plugindesc [DEUS Items] Ground item entities, inventory stacks, material properties, decay rates, and container storage.` | The header claims decay rates; there is no item age, condition or decay code (DEC-2). |
| `DEUS_Anim.js:77` | `const REMAINS_HOURS = 12;` | Remains are a sprite entry kept 12 game hours (catalog `"remainsHours": 12`, `game/data/DEUS_WorldCatalog.json:9922`)... |
| `DEUS_Anim.js:1162` | `until: nowMinutes() + Math.round(remainsHours() * 60)` | ...then removed (`DEUS_Anim.js:1260`, `list.splice(i, 1);`), leaving nothing (DEC-3). |
| `DEUS_Anim.js:78` | `const REMAINS_CAP = 200;` | Past 200, the oldest remains are dropped (`DEUS_Anim.js:1097`). |
| `DEUS_Anim.js:1147` | `if (!cols \|\| !u.area \|\| !W.isDisplayed(u)) {` | A death off-screen leaves no remains at all. Remains depend on the view, which DEC-012's sim/render split forbids. |
| `DEUS_Combat.js:1073` | `if (w && w.unit(victim.id)) w.removeUnit(victim.id);` | The dead unit is deleted; its body mass goes nowhere (REP-2). |

**Design documents that disagree (flagged, not resolved):**
- `docs/design/DURABILITY.md:320` records a user quote: "**Items** have no HP (the user, 14:19). Tools don't wear out." SIM.40.07 and V138 ("Loose items weather, rot, rust, or get buried by sediment", `docs/VISION.md:132`) require weathering of loose items. This design reconciles them as far as it can: weathering applies only to **unattended** items (R-03.2), never to tools in use, and uses a condition field, not HP. Whether that reading is right is **OQ-R-04**.
- `docs/design/REMAINS.md:51` stages animal carcasses FRESH → ROTTING → BONES → gone, and `docs/design/REMAINS.md:428` has bones "crumble away after `bonesDays`". "Gone" deletes mass (LIFE-001); here bones become soil instead (R-03.4).
- `docs/design/REMAINS.md:175` gives a person 24 h fresh and 72 h rotting; `docs/design/PEOPLES.md:215` gives risen bodies rotting "after 30 days" and bone "after 120 days". The two disagree with each other and with the durations below (R-03.4). **OQ-R-06**.
- `docs/design/REMAINS.md:258` draws stages as a PIXI tint (`"tints": { "fresh": "#d87070", ... }`). Under DEC-011 ("no ... tint", `docs/OWNER_DECISIONS.md:154`) stages are sprite frames instead: `remains.<size>.<stage>` in R-02.5.

### R-03.2 Which items decay

- An item decays only while it is **unattended**: on the ground or in a container outside any maintained structure (R-01.7), or in an abandoned structure. Items carried by a unit, worn, or stored in a maintained structure get no decay state. Food spoilage in maintained stores belongs to the food and needs system; when it spoils, its mass goes through the rot transform below.
- A decaying item gets a small record: `dc`, `ex`, `d0` (day it became unattended or last changed exposure), `cond0`, `nextDay`. It gets it on the event that makes it unattended (dropped, owner died, structure abandoned) and loses it when picked up.
- **Composite items.** An item's catalog entry lists its components by family and class, for example a longsword as FE blade plus ORGANIC grip. Each component decays on its own schedule. When an organic component is gone the item becomes its stripped form (a blade, a spearhead) or SCRAP. This needs a `components` field in the item data (Lane Q's material table or the items owner); it is an interface assumption.

### R-03.3 Organics: rot to soil and nutrients

Default lives, sy, unattended (design defaults; real-world orders of magnitude):

| dc | SEALED | SHELTERED | SKY | WET | BURIED-AER | BURIED-ANOX | CAVE |
|---|---|---|---|---|---|---|---|
| TEXTILE (cloth, leather, rope, paper) | 200 | 30 | 3 | 1 | 10 | 1,000 | 5 |
| LIGHTWOOD items (furniture, bows, bowls) | 150 | 60 | 25 | 10 | 15 | 500 | 20 |
| FOOD (bread, meat, grain) | 1 | 0.5 | 0.1 | 0.05 | 0.5 | 50 | 0.2 |

**Rot transform.** At the end of the life: `T(ITEM→SOIL-ORG, ORGANIC, floor(m × hf), "decay.rot")` and `sink(AIR, ORGANIC, m − floor(m × hf), "decay.rot.outgas")`. Humus fractions `hf`: TIMBER and LIGHTWOOD 0.20, THATCH 0.15, TEXTILE 0.10, FOOD 0.05. SOIL-ORG goes to the cell's residue record (section "Sparse storage and cost"). **That residue is the soil-nutrient field DEC-3 says does not exist**: decay writes it, SIM.50.04 reads it as fertility and draws it down as plant growth (`T(SOIL-ORG→BIOMASS)`, SIM.50.04's entry).

### R-03.4 Remains no longer vanish (DEC-3, V140, Lane W interface)

**Every death makes a remains record**, on or off screen and at any LOD. Lane W owns the body: its brief lists "bodies and remains returning to soil via Lane R's decay chain" (`origin/task/lane-w:tasks/SIM.40.10/lane-w/BRIEF.md:46`). The hand-off:
- At death, Lane W books `T(BODY→REMAINS, ORGANIC, m_soft, "death")` and `T(BODY→REMAINS, BONE, m_bone, "death")`. Default bone fraction 0.15 of body mass (humans; per-species data).
- In an L2 region, deaths of anonymous bucket members become aggregate remains per region cell cluster (ADR-003 L1607: "the bodies become mass forms"), with the same transforms.

**Stages and default durations (sy):**

| Stage transition | SKY | SHELTERED | BURIED-AER (grave) | BURIED-ANOX (bog) | CAVE | Frozen (SIM.50.06 flag) |
|---|---|---|---|---|---|---|
| FRESH → SKELETAL (soft tissue gone) | 0.25 | 0.5 | 5 | 1,000 | 1 | paused |
| SKELETAL → bone gone (bone to soil) | 50 | 500 | 2,000 | 10,000 | 20,000 | paused |

- Soft tissue: `T(REMAINS→SOIL-ORG, ORGANIC, floor(m_soft × 0.05), "decay.rot")`, the rest `sink(AIR, ORGANIC, ..., "decay.rot.outgas")`.
- Bone: `T(REMAINS→SOIL-MIN, BONE, m_bone, "decay.bone")`, a phosphate trace in the cell's residue record. Bone never leaves as gas.
- Scavenging (a predator eating remains) is Lane W's transform `T(REMAINS→BODY)`, not a deletion.
- **The 12-hour sprite removal (`DEUS_Anim.js:1162`) and the cap (`DEUS_Anim.js:1097`) are replaced** by stage frames driven by these records. The cap's purpose (bounded saves) is met instead by merging: once a remains record is SKELETAL and buried, or older than `mergeYears` (default 50 sy), it folds into its cell's residue record (bone mass, count, and anchor ids). Save size then grows with cells that hold remains, not with deaths.

**Time scale warning (D-1).** Under D-1 option (b) (DPY = 1), 0.25 sy is 6 game hours, which is 60 real seconds at 1x (ADR-003 §3.2: 1 game hour = 10 s). `docs/design/REMAINS.md:175` (24 h + 72 h) is 4 sy under (b), sixteen times slower than this table. The durations are data; which feel is wanted is **OQ-R-06**, and the calendar itself is D-1.

**SRD links.**
- *Gentle repose*: "the target is protected from decay" for 10 days (`game/data/srd51/spells.json:8417`). It pauses the remains clock: `d0 += 10 game days`. Under D-1 (b) that is 10 sy; under (a) it is 10 / N sy.
- Time limits that assume a body persists: *raise dead* "dead no longer than 10 days" (`spells.json:13455`), *resurrection* "no more than a century" (`spells.json:14025`), *true resurrection* 200 years (`spells.json:16818`). The remains record keeps its `personId` **anchor** for at least `anchorYears` (default 200 sy) even after all its mass has become soil: a zero-mass record, so no matter is invented and the SRD windows still have a target (TR-6).
- *Speak with dead* needs a corpse that "must still have a mouth" (`spells.json:15402`): true while the skull is present (stage FRESH or SKELETAL).
- *Animate dead* uses bones or a corpse (`spells.json:1838`): it takes the REMAINS record's mass into a BODY (Lane W's transform); nothing is created.

### R-03.5 Bone, stone, glass and ceramic items

- BONE items (tools, combs, ivory) use the SKELETAL row above.
- GLASS, CERAMIC, STONEITEM: no decay. They break only through damage events (sherds stay ITEM mass of the same family). They are relics (TR-5).

### R-03.6 Metals corrode to trace minerals, never ore (LIFE-002, D-5)

Default lives, sy, from full metal to fully oxidised, for a reference section of 1/4 inch; thicker items multiply by `thicknessIn / 0.25` (data):

| dc | SEALED | SHELTERED | SKY | WET | BURIED-AER | BURIED-ANOX | CAVE |
|---|---|---|---|---|---|---|---|
| FERROUS (iron, steel) | 2,000 | 300 | 60 | 25 | 150 | 3,000 | 400 |
| CUPROUS (copper, bronze, brass) | ∞ | 20,000 | 5,000 | 1,500 | 8,000 | 30,000 | 20,000 |
| LEADTIN (lead, tin, pewter) | ∞ | 10,000 | 3,000 | 800 | 5,000 | 20,000 | 10,000 |
| SILVER | ∞ | ∞ | 30,000 | 10,000 | 20,000 | ∞ | ∞ |
| NOBLE (gold, platinum) | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ |
| SPECIAL (mithral, adamantine, magic items) | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ (OQ-R-05) |

Scaled by catalog `corrosionResistance` (iron 30 at `game/data/DEUS_WorldCatalog.json:4893`, gold 99 at `:4953`): life × cR / 30 for FERROUS, and relative to each class's reference metal otherwise.

**Corrosion transform.** Over its life a metal component converts in `steps` equal parts (default 4): each step books `T(ITEM→OXIDE, FE, floor(m0 / 4), "decay.corrode")`, the last step takes the remainder. When less than 10 % of the metal is left, the item is destroyed and the rest becomes OXIDE. OXIDE goes to the cell's residue record and keeps its family and form forever. When the cell's floor becomes soil or sediment, the OXIDE stays OXIDE inside it: a rust stain, a green copper trace.

**The ore guard.** Four rules, each with a test (AT-R-06):
1. **No transform outputs ore.** The transform table has no entry whose output is an ore material (ADR-003 L950).
2. **OXIDE is not a resource.** It has no `mine` or `quarry` yield, no item form that can be picked, and no smelting recipe accepts it. Salvaged SCRAP (unoxidised metal) can be re-smelted: that recycles existing metal, it does not create it.
3. **Runtime guard.** The ledger rejects any strata or object write whose output is an ore material or an ore outcrop object with a cause other than world generation. This would also have caught the ore sprouts (`DEUS_Ecology.js:739`, VEG-1, F-03), which D-5 removes.
4. **Deep time too.** Lithification (if enabled, OQ-R-03) outputs only ROCK-SED kinds (breccia, conglomerate, sandstone, mudstone). It never outputs ore, gems, coal or a fossil-bed resource: bones inside lithified rock stay BONE mass in the rock's inclusion record, not a mineable object. V83 names "Finite stone, ore, gems and fossil beds" as non-respawning (`docs/VISION.md:94`).

**SRD corrosion (DEC-018: SRD numbers first, physics on top).**
- Rust monster, Rust Metal: a nonmagical metal weapon that hits it "takes a permanent and cumulative -1 penalty to damage rolls. If its penalty drops to -5, the weapon is destroyed" (`game/data/srd51/creatures.json:30549`). Each -1 books `T(ITEM→OXIDE, FE, floor(m_fe / 5), "srd.rust_metal")`, and destruction books the remainder.
- Rust monster, Antennae: "If the object isn't being worn or carried, the touch destroys a 1-foot cube of it"; armor loses 1 AC per touch and is destroyed at AC 10 (`creatures.json:30573`). A 1-foot cube of iron is about 490 lb = 7,840 mu: `T(ITEM or BUILT→OXIDE, FE, min(7,840, m), "srd.antennae")`. Armor loses `m / (AC_base − 10)` per touch.
- Black pudding and gray ooze corrode metal (and the pudding wood) by eating it (`creatures.json:28401`, `:28733`). Metal goes to OXIDE; eaten wood goes to the creature (`T(ITEM→BODY)`, Lane W).
- *Mending* "repairs a single break or tear in an object" no larger than 1 foot (`spells.json:11589`). It restores a broken item's condition, but it cannot restore mass that has become OXIDE or rotted away. No matter is created.
- *Creation* makes objects that last by material, down to 1 minute for adamantine or mithral (`spells.json:5091`): a CONJURED source at casting and a CONJURED sink at expiry (DEC-018's PM default). Decay never turns conjured matter into lasting residue: any residue of a conjured object inherits its expiry and is sunk with it.

### R-03.7 Durable relics and buried finds

- **Relic classes:** NOBLE, SILVER, SPECIAL, GLASS, CERAMIC, STONEITEM, and the remaining metal of a corroding item. Decay never removes them from the ITEM family (TR-5).
- **Burial.** An item is buried when ≥ 1 slice (2 ft; stale 1 ft) of solid or loose material covers its slice. The trigger is the `levels:strataChanged` event on its cell. The item becomes ITEM-BURIED (ADR-003 L1678: `buried: true`, it stays an item): `T(ITEM→ITEM-BURIED, family, m, "decay.bury")`. It leaves the surface item index (no draw, no pickup) and joins its chunk's sparse buried-find list, keyed by cell and slice.
- **Recovery.** A dig or mine write that removes the cover re-exposes it (`T(ITEM-BURIED→ITEM)`). WG.65.17 ("Subsurface excavation exposes genuine historical ruins, buried foundations, and forgotten artifacts", `docs/worldgen/DEUS_WORLDGEN_WBS.md:256`) reads the same list.

## Fire residue

This section answers R-04: burned matter leaves ash and charcoal with conserved mass (FIR-3), and the ash then weathers.

### R-04.1 What exists

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Fire.js:442` | `for (const it of I.atIn(p.area, p.x, p.y)) if (I.remove(it.id)) destroyed++;` | Items on a burned cell are deleted (FIR-3). |
| `DEUS_Fire.js:444` | `O.setIn(p.area, p.x, p.y, to);` | The object becomes its catalog `becomes` value. |
| `DEUS_Fire.js:445` | `if (rule.ground) setGround(p.area, p.x, p.y, rule.ground);` | The only ash is a ground tile (`"id": "ash",`, `game/data/DEUS_WorldCatalog.json:257`), on level 0 only (`DEUS_Fire.js:453`, FIR-4). |
| `game/data/DEUS_WorldCatalog.json:10246` | `"becomes": "rubble",` | A burned **wooden** wall becomes stone rubble, which picks for 2 stone (`:2104`): wood turns into stone (FIR-3, LAND-1). |
| `game/data/DEUS_WorldCatalog.json:3664` | `"id": "charcoal",` | Charcoal already exists as an item, with a recipe (`:5304`). |

Fire never damages strata (FIR-2). There is no carbon accounting (audit §3.4).

### R-04.2 The residue rule

One function, `residue.burn(composition, kappa, cell, cause)`, is **owned by this design** and **called by SIM.50.05** at every burnout (and by strata burning once FIR-2 is fixed). SIM.50.05 owns ignition, spread and the burn completeness `kappa` in 0..1 (defaults: open flame 0.8; roof collapsed onto the fire or smouldering under cover 0.3; unknown 0.6). The composition comes from the catalog material of the object, the components of each item (R-03.2), or the material of each burning slice.

For each ORGANIC component of mass `m` and class `c`:
- `ash = floor(m × ashFrac[c])`
- `char = floor(m × charFrac[c] × (1 − kappa))`
- `gas = m − ash − char`

Ledger: `T(src→ASH, ORGANIC, ash, cause)`, `T(src→CHARCOAL, ORGANIC, char, cause)`, `sink(AIR, ORGANIC, gas, "fire.outgas")`. The AIR sink is the smoke; it is how SIM.50.05's "Conserves carbon mass" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:548`) is met: carbon leaves through a named sink, it is not deleted.

| class | ashFrac | charFrac (at kappa = 0) |
|---|---|---|
| TIMBER, LIGHTWOOD | 0.01 | 0.30 (TIMBER), 0.25 (LIGHTWOOD) |
| THATCH | 0.05 | 0.10 |
| TEXTILE, paper | 0.02 | 0.15 |
| FLESH | 0.01 | 0.05 |
| FOOD | 0.02 | 0.10 |

Source: real-world orders of magnitude (wood ash about 1 % of dry mass; charcoal yield up to about a third under smothered burning). The SRD has no residue rules; it says only that "Paper or cloth objects might be vulnerable to fire and lightning damage" (`game/data/srd51/rules.json:7167`).

**Worked example.** 1,000 lb of timber = 16,000 mu, kappa 0.6: ash = floor(16,000 × 0.01) = 160; char = floor(16,000 × 0.30 × 0.4) = 1,920; gas = 16,000 − 160 − 1,920 = 13,920. Total 16,000.

**Other families in a fire:**
- **BONE** calcines: `T(REMAINS→REMAINS, BONE, floor(m × 0.65))` marked calcined, and `sink(AIR, BONE, rest, "fire.outgas")` for the collagen.
- **Metals** do not burn. Items survive as ITEM, minus their organic components, which burn as above; a spear becomes a spearhead (SCRAP). Lead and tin melt in a structure fire and become SCRAP of the same family (a puddle), not new matter.
- **Stone, brick, glass, ceramic** lose HP through the fire factor (`DEUS_Levels.js:1005`, stone `fire: 0.1`) and keep their mass. Glass may slump into SCRAP (GLASS family).
- **Conjured** matter's residue inherits its expiry (R-03.6).

**Fixes this implies (for the SIM.50.05 lane, not done here):** item deletion at `DEUS_Fire.js:441-442` becomes `residue.burn` per item; the wooden-wall rule at `game/data/DEUS_WorldCatalog.json:10239-10246` becomes a charred ORGANIC rubble plus residue, and the nails and hinges become SCRAP.

### R-04.3 Where the residue goes

- Ash and charcoal go to the burning cell's residue record (`ashMu`, `charMu`) at its lowest standing slice.
- When `ashMu` reaches one slice of mass, a strata write makes that slice an **ASH stratum** (a new material from Lane Q's table) and subtracts exactly one slice of mass; the remainder stays in the record. Ash bulk density about 40 lb/ft³ × 50 ft³ = 2,000 lb = **32,000 mu per slice** (stale 1-ft slice: 16,000 mu). Charcoal about 15 lb/ft³ × 50 ft³ = 750 lb = **12,000 mu per slice**.
- **Worked example, a burned 10×10 timber house.** Assume (Lane Q decides the real number) a built timber wall slice is 20 % solid wood: 10 ft³ × 40 lb/ft³ = 400 lb. Walls 36 squares × 2 layers × 5 slices = 360 slices = 144,000 lb; roof 100 slices at 200 lb = 20,000 lb; total 164,000 lb. At kappa 0.6: ash 1,640 lb, charcoal 164,000 × 0.30 × 0.4 = 19,680 lb. Over the 100 floor cells that is about 16 lb of ash and 197 lb of charcoal per cell: sub-slice residue (0.26 slice of charcoal), held in the residue record and shown by the existing `ash` ground kind. No new strata write is needed.
- A wildfire (SIM.50.05) does the same per burned plant object. It costs one residue entry per burned cell, which already has an entry in the active burning list (`DEUS_Fire.js:531`).

### R-04.4 How ash and charcoal weather

| Residue | SKY | SHELTERED | BURIED (either) | Transform at the end |
|---|---|---|---|---|
| ASH | 5 sy | 50 sy | ∞ (a buried ash horizon, TR-7) | `T(ASH→SOIL-MIN, ORGANIC, m, "decay.ash_to_soil")`: nutrient-rich soil; SIM.50.04 reads it as a fertility boost |
| CHARCOAL | 20 sy to fragment into soil | 200 sy | ∞ | `T(CHARCOAL→SOIL-CARBON, ORGANIC, m)`; then SOIL-CARBON oxidises only if exposed at the surface: `sink(AIR, ORGANIC, m, "decay.char_oxidise")` over 5,000 sy |

- Exposed ash is the most erodible material on a burned slope. SIM.50.03 may move it before it weathers; that is its transfer, ledgered as a move of the same form.
- **Charcoal never becomes coal.** Coal is a finite mineral; no transform outputs it (ore guard rule 4).

### R-04.5 The link to SIM.50.05 and WG.63.04 ash beds

SIM.50.05 asks for "permanent ash beds (WG.63.04)" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:548`). In this design an ash bed is the ASH stratum written by `residue.burn`, on any layer -16..+15 (fixing FIR-4's level-0 ground tile). "Permanent" is read as: a **buried** ash bed is permanent (TR-7); an **exposed** one weathers into soil in about 5 sy unless buried first. If "permanent" means that exposed ash never weathers, that contradicts this rule; the choice is **OQ-R-07**.

**Cost.** One `residue.burn` call per burnout event, O(components). One residue entry per burned cell until it weathers. Nothing scans.

## Decay-driven collapse

This section answers R-05: how decay lowers member strength and hands off to SIM.40.01/.02 collapse, with localized support rechecks. It is an **interface contract with Lane Q**. Lane Q had not pushed a design when this was written (`origin/task/lane-q` at `9103799e` holds only its brief), so every Lane Q name below is **ASSUMED** and taken from ADR-003 §16 and the Lane Q brief. If Lane Q's reviewed design names things differently, the names change and the contract does not.

### R-05.1 What exists

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:1940` | `/** The load the cell carries, 0..1: sum over its solid strata of support x hp / 255, divided by 5 (diagnostic; no` | `effectiveSupport` (line 1942) is a per-cell diagnostic. No game code reads it; there is no propagation, span check or collapse (SUP-1). |
| `DEUS_Levels.js:1558` | `emit("levels:strataChanged", ref, { before: Array.from(before), after: Array.from(rec), cause });` | Every strata write emits before and after records: the hook both lanes use. |
| `DEUS_Levels.js:1795` | `function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {` | Box and sphere damage exist; only a self-test calls them (audit §2.4). |

ADR-003 §16.3 feeds its `supportDirty` queue with "a decay failure (§17)" (ADR-003 L1579), and its collapse turns a fallen stratum into "rubble or talus of the same material family" by `ledger.transform(stratum → rubble)` (L1594).

### R-05.2 Who owns what

| Concern | Owner |
|---|---|
| Material table, `maxHP`, capacity, span, the HP thresholds at which capacity drops | Lane Q (SIM.40.01) |
| Whether a stratum is supported; the `supportDirty` queue; its budget and order | Lane Q (SIM.40.01), ADR-003 §16.3 |
| Breaking a stratum or object into rubble, talus or its catalog ruin; falling; spill; impact damage (V95) | Lane Q (SIM.40.02), ADR-003 §16.4 |
| HP lost over time; exposure; maintenance and abandonment; member records; the decay heap | Lane R (SIM.40.05) |
| Stages, reclamation, weathering of rubble after it has fallen, burial, items, remains, residue | Lane R (SIM.40.05-.08) |

### R-05.3 The contract

- **C-1. Decay writes HP only at thresholds.** Decay computes HP lazily (closed form). It writes an element's HP byte, through the single strata writer (`writeCell`, `DEUS_Levels.js:1537`) with cause `"decay"`, only when the lazy HP crosses one of the capacity thresholds Lane Q publishes for that material (`capacityThresholdsHP[material]`, an ascending list of HP bytes; ASSUMED name). ADR-003 §16.3 already enqueues "a stratum ... damaged across a capacity threshold", so every such write reaches the support queue without a second call. A member's thresholds are its `steps` (R-02.3); default 4, so a member causes at most 4 HP writes plus 1 failure in its life.
- **C-2. Decay never removes matter itself.** At an element's `failDay` (HP 0), decay calls Lane Q's single break path, `collapse.breakElement(ref, "decay")` (ASSUMED name), the same code path a blast or a pick uses at 0 HP. Lane Q books `T(BUILT→RUBBLE, family, m, "collapse.decay")` and puts the cells into `supportDirty`. There is one break-conversion owner (Lane Q), so decay can never disagree with collapse about where the mass went. This replaces today's 0-HP-to-air rule (`DEUS_Levels.js:1702`) on the decay path.
- **C-3. Collapse tells decay what changed.** Lane Q's collapse emits one event per cascade step (the ADR-003 feed's `EFFECT(collapse)`, or `structure:collapsed`; ASSUMED) carrying the cells, the forms and the masses moved. Decay listens and: marks the failed members, re-derives stages, and recomputes exposure **only** for members whose cells or face neighbours are in the event (rubble burying a wall base, a roof hole opening a room to the sky).
- **C-4. Strength scaling is Lane Q's.** Capacity is `capacity[material]` scaled by `hp / maxHP` with integer thresholds (ADR-003 §16.3). Decay supplies the HP; it never computes load or support.
- **C-5. Bounded work.** One decay event writes at most one member's strata (≤ 64, the member cap), so it enqueues at most 64 cells. ADR-003 §16.3 bounds one evaluation at O(span² × strata). With a span of 4 cells and 5 strata that is 16 × 5 = 80 strata reads per cell, ≤ 64 × 80 = 5,120 reads per decay event before the cascade, and the cascade only continues if something actually fails.
- **C-6. Determinism.** Decay pops its heap in `(dueDay, memberId)` order; Lane Q processes `supportDirty` in its canonical order (FIFO by tick, then elevation, then cell index). No `Math.random` (ADR-003 §10).
- **C-7. Ledger.** Decay's own entries are shedding (`BUILT→FINES`), rot and weathering of fallen rubble, and item and remains transforms. Lane Q's are the break (`BUILT→RUBBLE`) and falling. Every mass unit of a member ends in exactly one class; the long-run test checks the sum over both lanes.
- **C-8. External loads act on decayed HP.** Snow load (SIM.50.06's annual maximum, R-01.5), blasts (DEC-013 §4, `applyVolumeDamage`) and the SRD *earthquake*, which "deals 50 bludgeoning damage to any structure in contact with the ground ... If a structure drops to 0 hit points, it collapses" (`game/data/srd51/spells.json:6391`), all act on the current, decayed HP. So old ruins fall first, without any special rule.

### R-05.4 Roof to wall to collapse, step by step

1. Day `d0`: the site is abandoned; the house's members get schedules. The TIMBER roof (SKY, 60 sy) and the ASHLAR walls (SHELTERED) are separate members.
2. Each time the roof's lazy HP crosses a threshold, decay writes the roof strata's HP (C-1); Lane Q re-checks those cells. Snow load in a cold region may make the roof fail at a threshold before HP 0; Lane Q breaks it.
3. At the roof's `failDay` (or earlier, by overload), `collapse.breakElement` turns the roof into RUBBLE that falls onto the floor (Lane Q). The collapse event (C-3) tells decay: the walls' tops are now SKY; decay splits the wall members (upper slices SKY, lower slices unchanged) and reschedules them. The structure is S3.
4. Centuries later the upper wall members fail the same way. Their rubble lands against the wall bases: C-3 again; decay reclassifies the bases as BURIED-AER (∞). The structure is S4 and its foundations survive.

### R-05.5 Underground props

A PROP member (mine timbers, cellar posts) in CAVE exposure has a TIMBER life of 50 sy, halved again where cave fungus grows (R-06.6). Its failure is often the failure of a natural rock roof it held: Lane Q decides, under V128 (natural rock counts as structure) and DEC-010's default (lateral connectivity suffices, `docs/OWNER_DECISIONS.md:144`; DEC-010 is `OPEN`). **This is a DEC-010 dependency.**

## Nature reclaiming

This section answers R-06: vegetation invading abandoned cells, sediment burial, and the underground variants across the 16 layers below the surface. SIM.40.06's row is "vegetation spreads into abandoned cells; sediment slowly buries low ruins" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:539`).

### R-06.1 What exists

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Objects.js:266` | `// Never schedule regrowth on floors, walls, or constructed objects` | Vegetation is kept off built cells (line 267 returns), the opposite of overgrowth. The same guard sits in `DEUS_Ecology.js` (lines 275, 313, 354, 627, 776, 847). |
| `DEUS_Ecology.js:581` | `const tries = o.tries > 0 ? o.tries : 64;` | Spread samples 64 cells per game hour; it is bounded sampling, not a scan (audit §3.3). |
| `DEUS_Ecology.js:805` | `for (const z of [0, -1, -2]) {` | Underground sprouts exist only on the stale levels; spread is ground level only (VEG-5). |
| `DEUS_Levels.js:994` | `const M_AIR = 0, M_STONE = 1, M_SOIL = 2, M_WOOD = 3, M_WATER = 4, M_LAVA = 5;` | No sediment, rubble or loose fill material exists (ERO-1). |

### R-06.2 The reclamation rule (overturns `DEUS_Objects.js:266`)

**New rule:** *never establish plants on a **maintained** built cell; on an **abandoned** built cell, allow establishment by stage.*
- Decay publishes a sparse per-cell flag, `reclaimable`, in its chunk trace map. It is set when the cell's structure becomes unmaintained and reaches the stage below, and cleared if the structure is maintained again (re-founding, R-07). Ecology's establishment guard (the seven call sites above) asks `decay.isReclaimable(cell)` instead of refusing every built cell.
- Which plants may establish on a reclaimable cell:

| Stage | Cells | Establishes (SIM.50.04 decides species) |
|---|---|---|
| S1 | wall faces and tops | moss and lichen (a flag and a catalogue look only; no mass) |
| S1 | floors open to the sky, doorways | pioneer herbs |
| S3 | roofless floors, rubble tops | herbs, shrubs, saplings |
| S4-S5 | rubble spreads and mounds | the biome's normal succession (WG.65.09) |
| any | SHELTERED interiors | nothing without light, except fungi (R-06.6) |

- Spread comes only from neighbouring vegetation and matures by day counts (ADR-003 §17.4). Growth is Ecology's ledgered source: photosynthetic AIR uptake plus a draw on the cell's SOIL-ORG (`T(SOIL-ORG→BIOMASS)`); nothing is created from nothing.
- **Feedback.** A plant object on or beside a masonry member sets `M_root` (R-01.5) through the `objects:changed` event for that cell only.

### R-06.3 Burial: what makes a mound

A ruin becomes a buried mound (S5) through four mass transfers, all local and all ledgered:
1. **Its own rubble.** Fallen roofs and walls bury the wall bases (R-05.4). Lane Q's transform.
2. **Mudbrick melt and masonry shedding.** FINES collect at the wall foot (R-02.3): `T(BUILT→FINES)`.
3. **Litter to soil.** Plants on the footprint drop litter (SIM.50.04's `T(BIOMASS→SOIL-ORG)`). Litter build-up is uniform over a vegetated footprint, so it is held **per structure footprint** in closed form (a start day and a rate), not per cell: one heap entry per footprint gives the day the next full slice is due. On that day decay writes one SOIL stratum on every footprint cell and books exactly one slice of soil mass per cell (soil bulk about 80 lb/ft³ × 50 ft³ = 4,000 lb = **64,000 mu**; stale 32,000 mu). Default build-up: 0.25 mm per sy on a vegetated footprint, so one 2-ft slice (610 mm) takes about 2,400 sy (stale 1-ft slice: about 1,200 sy).
4. **Sediment from outside (SIM.50.03).** Slope wash and floods deposit SEDIMENT in low ruins (ADR-003 L1674: "Soil or rubble erodes at an exposed source cell in the same drainage (−k) and deposits at the low cell (+k)"). SIM.50.03 owns the rates. Decay only reacts to the strata-write events on its members' cells.

Wind-blown dust (WG.65.06 names wind transport) is not modelled here.

Every covering write reaches decay as `levels:strataChanged` on the member's cell or the cell above. Decay then changes the exposure of the covered slices (BURIED-AER or BURIED-ANOX) and buries items (R-03.7). No burial check runs on a clock.

### R-06.4 Underground variants (layers -1..-16)

| Layer band | Exposure of built matter | Reclaimers | Water |
|---|---|---|---|
| Layer -1 (top of Lower-1) | CAVE or SEALED; cellars and crypts under surface sites | Tree roots from layer 0 reach built strata in layer -1 (`M_root`); fungi | Surface rain seeps down shafts and stairwells (SIM.50.02): WET near openings |
| Lower-1, -8..-1 (`docs/OWNER_DECISIONS.md:188`) | CAVE: humid, no sky, no freeze-thaw (`FT = 0`) | **Cave fungus** colonises organic members, props, doors, remains and organic rubble, spreading only from neighbouring fungus. Where fungus is present, TIMBER and LIGHTWOOD lives in CAVE are halved (`M_fungus = 2`). Fungus growth draws SOIL-ORG and the organic matter it consumes: `T(ITEM or RUBBLE→BIOMASS, ORGANIC, m)`, SIM.50.04's underground variant. | A rising water table (SIM.50.02) makes members WET, then BURIED-ANOX in waterlogged mud: timber is preserved, iron corrodes slowly. **D-4 dependency.** |
| Lower-2, -16..-9 (`docs/OWNER_DECISIONS.md:187`) | CAVE or SEALED; dry sealed chambers keep nearly everything (relic-rich deep sites) | Fungi only; no roots | Deep flooding as above. Near lava (static pools today, `DEUS_Levels.js:1038`), organic members ignite through SIM.50.05 and leave residue (R-04). |
| Upper layers, +1..+15 | SKY on tops and faces; SIM.50.06's lapse rate raises `FT` with altitude | Birds and wind seeds are SIM.50.04's; plants need a soil or rubble slice | No burial: tower ruins fall. Lane Q's cascade carries their rubble down to the first layer that holds it, so upper layers end empty and the mound forms at the base. |

- **Flowstone** (mineral crusts growing over cave ruins) needs dissolved-load transport in the water ledger. It is out of scope and noted for SIM.50.02.
- The fungus and root rules use the configurable Z range (WG.00.17). Today's `[0, -1, -2]` sprout list (`DEUS_Ecology.js:805`) is stale code state.

### R-06.5 Data, triggers and cost

- **Data:** the `reclaimable` flag, derived from the structure's state and cached per chunk (not saved); the shed pool per member; the litter schedule per structure footprint (section "Sparse storage and cost").
- **Triggers:** a structure changing maintenance state (one event per structure), a stage transition (one event per structure), `objects:changed` for root feedback, `levels:strataChanged` for burial.
- **Cost:** setting flags for a 10×10 house plus its 1-cell halo is at most 12 × 12 = 144 flag writes, once per stage transition. Ecology's establishment keeps its own bounded sampling (moved into the core by ADR-003 SIM.00.05); decay adds a constant-time flag read to it.

## Ruins and re-founding

This section answers R-07 (LIFE-003, SIM.50.09): when a settlement becomes a physical ruin, which traces survive and for how long, salvage with conserved mass, and re-founding on old foundations.

### R-07.1 What exists

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Projects.js:135` | `const PHASES = ["camp", "village", "town"];` | Live phases only grow (line 579); nothing steps back (SET-1). |
| `DEUS_HistoricalDemographics.js:319` | `abandonedYear: null, isRuined: false, population: 0, peakPopulation: 0, historicalCapacity };` | `isRuined` starts false and nothing sets it true (X-7, SET-5)... |
| `DEUS_History.js:547` | `site.ruined = ds.isRuined ? ds.abandonedYear : null;` | ...so the one reader always leaves `site.ruined` null. |
| `DEUS_Colonists.js:3733` | `else if (here && (hasTag(here, "building") \|\| hasTag(here, "ruin"))) state = step.exact ? "blocked" : "skipped";` | Ruin cells block building, so foundations are never reused (SET-4; also `UF_Households.js:462`). |
| `game/data/DEUS_WorldCatalog.json:2204` | `"stone": 2` | Quarrying a 2-stone wall yields 2 stone and leaves rubble (line 2206) that picks for 2 more (LAND-1). |

The Year-0 rule governs where ruins can come from: "Standard New Game begins strictly at World Year 0 (V134). No pre-generated centuries of roads, ruined cities, or exhausted mines" (INV-SIM-01, `docs/INVARIANT_REGISTRY.md:51`). Every ruin in this design comes from a settlement the simulation built and then abandoned. Decay never stamps a ruin.

### R-07.2 The site state machine (fixes X-7 in design)

The site record belongs to SIM.50.09. Decay adds these fields: `state`, `abandonedDay`, `stage`, `predecessorSiteId`.

| State | Entered when | What decay does |
|---|---|---|
| ACTIVE | population > 0 | computes upkeep coverage `k` on population or structure events (R-01.7) |
| DECLINING | SIM.50.09 marks contraction, or `k < 1` | triage: whole structures lose maintenance in a deterministic order |
| ABANDONED | population 0 for `siteAbandonYears` (1 sy), or SIM.50.09's abandonment event (war, famine, disease) | every structure loses maintenance in one event; `abandonedDay` is set; this is the same fact as the history ledger's `abandonedYear` (`DEUS_HistoricalDemographics.js:521`) |
| RUIN | ≥ 50 % of the site's built mass is in structures at S3 or later | **sets `isRuined = true`**, so `DEUS_History.js:547` sees it: the X-7 fix |
| MOUND | ≥ 50 % at S5 or later | none beyond the stage |
| REFOUNDED | a new site claims the old footprint (R-07.5) | the old record is kept for history; the new site links to it |

- Transitions are evaluated only when one of the site's structures changes stage. Cost is proportional to stage events, never to the number of sites.
- **The floor (LIFE-003).** A site with an anchor (a history site, a monument, a grave with an anchor record) never goes past MOUND. Its anchor records are never removed (ADR-003 L1683). A site with no anchor keeps the trace rules below, so it still does not vanish within the retention times.

### R-07.3 Trace retention rules

"Removed only by" lists physical processes. Decay itself removes none of these traces within the minimum retention times.

| Rule | Trace | How it is retained | Minimum retention (default) | Removed only by |
|---|---|---|---|---|
| **TR-1** Foundations | WALL-BASE and FOUNDATION members of stone, brick and mudbrick walls, and stone footings of timber buildings | Buried slices have life ∞ (R-01.6). In addition, decay never schedules a failure for a FOUNDATION member: its HP stops at the anchor floor `h = 0.25` | ≥ 10,000 sy; indefinitely in practice | salvage (a job; leaves a `robbed` provenance flag, TR-8), erosion (SIM.50.03), collapse from below (Lane Q), blasts |
| **TR-2** Vaults and cellars | built voids below grade or at layer ≤ -1: cellars, crypts, tunnels, halls | CAVE and SEALED lives: ASHLAR 20,000 sy or ∞, BRICK 5,000, RUBBLESTONE 3,000; the lining's base is TR-1 | ≥ 3,000 sy for the void; the lining indefinitely | Lane Q collapse (the lining then stays as rubble in place), flooding fills but does not remove |
| **TR-3** Mounds | the elevation anomaly of rubble, fines and soil over a footprint | Decay never moves mass outside the footprint and its 1-cell halo | ≥ 10,000 sy without erosion; SIM.50.03 must keep a mound ≥ 1 slice for ≥ 1,000 sy on a slope with default rates, or report that it cannot | erosion, excavation, salvage |
| **TR-4** Roads | paved roads (stone slabs as built strata at ground level) and compacted earth paths | Slabs are FOUNDATION members (TR-1). Earth paths keep a `compacted` provenance flag (WG.65.16) that cuts plant establishment to 25 % | slabs as TR-1; the vegetation line for 500 sy; the flag indefinitely | excavation, erosion |
| **TR-5** Relics | NOBLE, SILVER, SPECIAL, GLASS, CERAMIC, STONEITEM items and uncorroded metal cores | Never leave the ITEM family through decay (R-03.7) | indefinitely | a job picking them up |
| **TR-6** Graves and remains | remains records, grave objects and their `personId` anchors | Anchored graves (ADR-003 L1683; the anchor schema of `docs/systems/UF_History.md:106`) are never removed. Other remains keep their anchor for `anchorYears` (200 sy) after their bones are gone (R-03.4) | indefinitely for anchored graves; bones 2,000 sy buried | a job (exhumation) |
| **TR-7** Burn horizons | buried ASH and CHARCOAL | Buried residue has life ∞ (R-04.4) | indefinitely | excavation, erosion |
| **TR-8** Provenance and traces | WG.65.16 flags on changed cells (built, collapsed, robbed, naturalized); OXIDE, bone phosphate and SOIL-CARBON in residue records | They are ordinary sparse saved state | indefinitely | nothing; they move only with the soil they sit in |

**What a visitor finds at a default stone hamlet** (limestone ASHLAR houses with TIMBER roofs, temperate, FT 0.25, no erosion; approximate, from R-01.6):

| Years after abandonment | What is visible |
|---|---|
| 10 | weathered roofs, weeds in doorways (S1-S2) |
| 100 | roofless houses with standing walls, saplings inside (S3) |
| 1,000 | the same walls lower and cracked; shrubs and young woodland; an iron-stained floor; ceramic and glass in the leaf litter (S3) |
| 2,000 | wall stubs and rubble spreads (S4); foundations complete |
| 10,000 | low grassed or wooded mounds on the old plan (S5), foundations under them, relics and an ash line at the burned house under the soil |

### R-07.4 Salvage with conserved mass

A salvage job (owned by the SIM.50.08 and SIM.50.09 job systems) takes matter from RUBBLE, BUILT or SCRAP and makes items **by mass**:
- `n = floor(m_taken / unitMass[item])`; `T(RUBBLE or BUILT→ITEM, family, n × unitMass, "salvage")`. The remainder stays where it was, as RUBBLE. Nothing is lost and nothing is created.
- **Worked example.** A limestone rubble slice: catalog density 2.3 g/cm³ (`game/data/DEUS_WorldCatalog.json:4717`, `"density": 2.3,`) = 143.6 lb/ft³ solid; rubble with 35 % voids gives 50 ft³ × 0.65 × 143.6 = 4,667 lb = 74,672 mu. With an assumed 50 lb (800 mu) stone item: n = 93, taken 74,400 mu, remainder 272 mu stays as RUBBLE in the cell's residue record. This replaces the fixed "2 stone" yields (`game/data/DEUS_WorldCatalog.json:2204`, `:2104`) for ruins, closing LAND-1's 2-in-4-out quarry for this path.
- BUILT ASHLAR with `h ≥ 0.5` yields dressed blocks (reuse costs less labour); lower HP yields rubble stone.
- BUILT TIMBER with `h ≥ 0.6` yields reusable beams; lower HP yields firewood. The rot clock stops when the item is picked up.
- SCRAP yields metal items that can be smelted (recycling existing metal). OXIDE yields nothing (ore guard rule 2).
- Robbing a FOUNDATION member is allowed (people do dig out old foundations), but it leaves a `robbed` provenance flag on the cells (TR-8), so the plan still reads in the soil.

**SRD tools for the same work (DEC-018, mass-conserving).** *Fabricate* converts "raw materials into products of the same material" (`game/data/srd51/spells.json:6848`): `T(RUBBLE→ITEM)` with the same by-mass rule. *Stone shape* reshapes a stone section "no more than 5 feet in any dimension" (`spells.json:15757`): it can re-form a damaged BUILT section without adding mass. *Move earth* reshapes "dirt, sand, or clay" and "can't manipulate natural stone or stone construction" (`spells.json:12114`): it can strip the soil off a mound (a SOIL transfer), and if structures shift, Lane Q rechecks them. *Wall of stone* made permanent (`spells.json:17322`) enters as a CONJURED source and then decays as ordinary stone.

### R-07.5 Re-founding on existing foundations (SET-4)

1. **Claiming.** The build and household placement rules that refuse ruin cells (`DEUS_Colonists.js:3733`, `UF_Households.js:462`) change to: a ruin cell is **claimable**. A claimed cell is either cleared (salvage) or reused.
2. **Reuse.** A build job whose plan puts a wall on a cell with WALL-BASE or FOUNDATION built strata of a compatible material at `h ≥ 0.5` builds **only the missing slices**. Only the new slices consume items (`T(ITEM→BUILT)`). The reused slices change `structureId` with no ledger entry (no mass moves). Their decay state resets to maintained; their HP stays as it is until a repair job restores it, which consumes material equal to the mass that was shed.
3. **Re-roofing.** A standing S3 ruin can be re-roofed: only ROOF members are built. This is the fastest re-foundation.
4. **Vegetation.** Plants on reclaimed cells become clearing work (Ecology's felling path). Once the cell is maintained again, `reclaimable` is cleared and nothing new establishes.
5. **The new site** is a new record with `predecessorSiteId`; the old record stays, with state REFOUNDED.
6. **Which cultures reuse whose ruins** is plan data: DEC-015 plans per race (SOC.10.02, SOC.10.03). The race-to-plan-slot list is D-6, a PM decision the Owner may overturn. **This is a D-6 dependency**, and the policy itself is OQ-R-08.

Prerequisite: LAND-5 (buildings as built strata). Without it there is no foundation stratum to reuse.

## Deep history and LOD

This section answers R-08: summary decay for fast-forward and off-focus regions (SIM.40.08, SIM.30.02, DEC-012), the slow clocks (NAT-003), and the calendar mapping under both D-1 options.

### R-08.1 What exists

- There is no LOD: the world is one area, and systems run at full fidelity or not at all (F-09).
- The history ledger does not create physical sites (DEC-4); the older generator that stamped ruins is off (`game/data/DEUS_WorldCatalog.json:7670`, `"simulate": false,`).
- The only slow clocks are `time:hour` and `time:day`, and a decade-scale tick "would need a clock that does not exist yet" (audit §2.5).

### R-08.2 Why decay needs almost no summary model

- **Decay state is per record, not per region.** Members, items and remains carry closed-form schedules in one heap. ADR-003 states the consequence: "an element's HP on day D is the same at L0, L1, L2, or after a deep-history jump of many years" (ADR-003 L1693). **[ADR-003]**
- **Geology is fine at every LOD.** ADR-003 §16.5 says "Support depends only on geometry, and geometry is fine at every LOD level", and collapse runs the same algorithm in L2 at the coarse tick. So decay's strata writes and Lane Q's rechecks happen the same way in L0, L1 and L2. **[ADR-003]**
- **The one LOD difference** is timing: an exposure change caused by another event takes effect on the day that event is processed, and L2 processes collapses at its coarse tick of 1 game hour (ADR-003 L1694). That is why the long-run test compares stages and ledger totals, not exact HP (A7 in "Matter ledger long-run test").
- **What L2 does not do for decay:** nothing is sent to the render feed, and crowd-bucket deaths become aggregate remains (R-03.4).

### R-08.3 Cohort summary: only for matter that has no records

Two kinds of matter may exist in L2 without per-entity records:
- remains of crowd-bucket deaths (DEC-014's crowd LOD, OPEN), and
- buildings of a settlement run as an aggregate economy, if SOC.60.01 ("coarse background catch-up for remote settlement economies", `docs/society/DEUS_SOCIETY_WBS.md:118`) builds them as counts rather than strata.

For these, a region keeps **cohort records** `(dc, stage, count, massByForm[])`:
- Transitions use the same lives in closed form. Each cohort flow is an integer: `floor` for all target classes but the last, which takes the remainder.
- **Promotion** instantiates members deterministically (seeded by region id and cohort index). Masses are assigned by largest remainder, with ties broken by index, so the region's per-class totals are identical before and after (SIM.30.03's rule, "Mutants that leak 1 unit of water, ore or population ... are caught", `docs/worldgen/DEUS_WORLDGEN_WBS.md:531`).
- **Demotion** sums member masses into the cohort; nothing is rounded away.
- Cost: at most 20 classes × 8 stages × (4 B count + 8 forms × 8 B) = 10,880 B per region that holds such matter, and only regions that hold it have a record.

### R-08.4 Fast-forward and deep history

- **Day jumps.** Fast-forward, history mode and off-focus catch-up all advance the day counter and pop every heap entry due up to the new day, in `(dueDay, id)` order (ADR-003 L1696: "It runs the same heaps with day jumps"). **Cost is proportional to due events, not to years.**
- **Worked example.** Aging a 40-structure site by 10,000 sy: 40 structures × 15 members × at most 6 events (4 thresholds, a failure, a burial change) = 3,600 member events; 2,000 unattended items × 4 steps = 8,000; 200 remains × 3 = 600. Total about 12,200 events, whatever the number of years. At an assumed 1-10 µs per event (heap pop plus a few writes; not measured) that is 12-122 ms, plus Lane Q's rechecks for the failures (C-5).
- **DEC-4 and Year 0.** History-produced ruins must come from the history-mode core, where "Traces are ordinary sim data, not flavour text" and there is "no second 'trace generator' that could invent material" (ADR-003 §14.2). Decay then only ages what history built. Whether a New Game may start with aged history at all is ADR-003 Q6 against INV-SIM-01 (ADR-003 L1249, §14.3), an Owner question this design does not answer. Decay works the same either way.

### R-08.5 Slow clocks (NAT-003, INV-SIM-02)

- All decay, reclamation and weathering timers are in the **historical** domain (INV-SIM-02).
- They run at each game-day boundary (ADR-003 L1689) and process due entries in batches of at most ⌈due / 2,400⌉ per tick (ADR-003 L1047). **[ADR-003]**
- Decay needs no separate hour, season or decade service: each record carries its own due day, so a 3,000-sy wall life is one heap entry, not 3,000 annual ticks. This is how NAT-003's "multi-timescale execution (action, daily, seasonal, century)" (`docs/RISK_REGISTER.md:74`) is met for decay.
- Climate modifiers come from SIM.50.06's annual summary per region: one event per region per year. Under D-1 option (b) a year boundary is every game day; under (a) it is every N days.

### R-08.6 Calendar mapping (D-1 is OWNER_OPEN; no option is chosen)

Fixed facts: 1 game day = 2,400 ticks = 240 s real at 1x (ADR-003 §3.2). Durations are authored in sy and converted with DPY (section 0.3).
- **Option (b), keep V123:** DPY = 1 (`DEUS_Core.js:324`); "1 real hour = 15 years" (`DEUS_Core.js:59`).
- **Option (a), separate day from year:** DPY = N, the Owner's choice. The two N values below come from existing code and are **illustrations only, not proposals**: N = 20 from the archived clock ("4 seasons per year: Spring (days 1-5), Summer (6-10), Autumn (11-15), Winter (16-20)", `archive/plugins/DEUS_Time.js:314`) and N = 336 from the latent 12 months × 28 days in `DEUS_Objects.js:162`.

| Duration (sy) | What it is here | (b) DPY = 1: game days / real time at 1x | (a) N = 20: real time at 1x | (a) N = 336: real time at 1x |
|---|---|---|---|---|
| 0.25 | corpse to skeleton, SKY | 0.25 d / 60 s | 20 min | 5.6 h |
| 1 | site abandonment grace | 1 d / 4 min | 80 min | 22.4 h |
| 12 | thatch roof fails, SKY | 12 d / 48 min | 16 h | 11.2 days |
| 60 | timber roof fails, SKY; V123's mean lifespan | 60 d / 4 h | 3.3 days | 56 days |
| 400 | rubblestone walls fail after roof loss | 400 d / 26.7 h | 22.2 days | 1.02 years |
| 3,000 | ashlar walls fail after roof loss (wR 90) | 3,000 d / 8.3 days | 167 days | 7.7 years |
| 10,000 | the long-run test horizon | 10,000 d / 27.8 days | 1.5 years | 25.6 years |
| 1,000,000 | lithification scale (OQ-R-03) | 10^6 d / 7.6 years | 152 years | 2,557 years |

Real time at 1x is `sy × DPY × 240 s`. At ADR-003's best-effort 16x speed (ADR-003 Q3) divide by 16; history mode and day jumps are not bound to real time at all.

**SRD time limits under D-1.** SRD limits in **days** scale with DPY; limits in **years** do not.

| SRD limit | Under (b) | Under (a), N = 20 | Under (a), N = 336 |
|---|---|---|---|
| *gentle repose* 10 days (`spells.json:8417`) | 10 sy | 0.5 sy | 0.03 sy |
| *raise dead* 10 days (`spells.json:13455`) | 10 sy | 0.5 sy | 0.03 sy |
| *resurrection* a century (`spells.json:14025`) | 100 sy | 100 sy | 100 sy |

So under (b) a *raise dead* window outlasts this design's skeletonisation (0.25 sy). That mismatch is a D-1 consequence, recorded here for the Owner, not resolved.

## Matter ledger long-run test

This section answers R-09: a deterministic fixture, aged through every stage over more than 10,000 sy, that proves every ledger class exact at every checkpoint, a zero ore delta and trace retention, with mutants that must fail. It is written so SIM.40.09 ("aging an abandoned site through all stages ... exact mass conservation ... zero ore generation ... zero per-frame scan", `docs/worldgen/DEUS_WORLDGEN_WBS.md:542`) can implement it.

### R-09.1 Runner

- Headless core (ADR-003 §2), history mode with day jumps. **[ADR-003]**
- Run twice at the 9-layer test range (-4..+4) and twice at the 32-layer default (-16..+15), as ADR-003 §17.6 requires. The fixture fits both ranges.
- Fixed seed; D-1 parameter DPY = 1 for the reference run and DPY = 20 for a second run (the test must pass under both; the stage **days** differ, the stage **years** and ledger totals do not).

### R-09.2 Fixture FX-R-01, an abandoned hamlet

**Structures** (one 64×64 cell patch of one area, surface layer 0, plus the layers named):

| Id | What | Members |
|---|---|---|
| H1 | stone house 8×8 with a cellar | limestone ASHLAR walls (`weatherResistance` 50) 2 layers high; TIMBER roof; FERROUS fittings; cellar at layer -1 with an ASHLAR vault and TIMBER props |
| H2 | mudbrick house 6×6 | MUDBRICK walls 1 layer; THATCH roof |
| H3 | timber hall 10×6 | TIMBER walls and roof; LIGHTWOOD doors; 200 iron nails as FITTINGS; **burned at y5** (scripted `residue.burn`, kappa 0.6) |
| H4 | brick tower 4×4 | BRICK walls from layer 0 to layer +2; LIGHTWOOD floors and roof |
| R1, R2 | roads | R1: 20 cells of RUBBLESTONE slabs; R2: 20 cells of compacted earth path |
| S1 | cave shrine at layer -3 | ASHLAR altar, TIMBER props, 4 CERAMIC jars, 1 gold ring |

**Items:** an iron longsword (FE blade + ORGANIC grip), a copper pot, 10 silver coins, a glass bottle, 5 cloth bolts, 10 loaves of bread, a pair of leather boots, all in H1 and H3.
**Remains:** two persons (one in an anchored grave outside H1, one unburied in H3's fire) and one deer carcass.
**Stand-ins for systems not built yet** (each is a ledgered FIXTURE-FEED source or a scripted event, so the test accounts for it):
- vegetation: plant objects established on reclaimable cells on a fixed schedule, their biomass booked from AIR, litter booked `T(BIOMASS→SOIL-ORG)` at 0.25 mm per sy;
- sediment: `source(FIXTURE-FEED, SEDIMENT)` delivering one slice per 1,000 sy to the low side of the patch;
- water: at y300 the H1 cellar floods through the fluid API (a D-4 dependency);
- climate: FT 0.25 and a fixed snow load.

**Timeline:** y0 built and maintained; y5 H3 burns; y10 population set to 0; y11 site ABANDONED; run to **y12,000**.

**Checkpoints:** y0, 5, 11, 12, 25, 60, 100, 300, 1,000, 3,000, 5,000, 10,000, 12,000, and every structure stage transition.

### R-09.3 Assertions at every checkpoint

- **A1 Exact classes.** For every (family, form) class, the ledger total equals a recount of the fixture world: strata by material × mass per slice, residue records, items, buried finds, remains, biomass. Integers, exact. (The recount is a test-only walk of the small fixture; the runtime never walks.)
- **A2 Closure.** Per family: Σ classes + Σ sinks − Σ sources = the y0 total, exactly.
- **A3 Zero ore delta.** Ore-material strata, ore outcrop objects, ore items and any ore-form mass are unchanged from y0. The ore write guard's rejection log is empty. A static check fails if any transform table entry outputs an ore, coal, gem or fossil-bed form.
- **A4 Trace retention (LIFE-003).**
  - At y1,000: ≥ 90 % of H1's WALL-BASE and FOUNDATION y0 mass is still BUILT.
  - At y3,000 and y10,000: H1, H2 and H4 footprints each stand ≥ 1 slice above their surroundings (TR-3).
  - The H1 cellar is open, or, if Lane Q collapsed it, its lining is RUBBLE in place (TR-2).
  - At y12,000: the gold ring, silver coins, glass bottle and ceramic jars exist as ITEM or ITEM-BURIED with their y0 mass (TR-5); the anchored grave record exists (TR-6); H3's ash and charcoal lie under ≥ 1 slice (TR-7); R1's slabs are BUILT and R2's `compacted` flag is set (TR-4).
- **A5 Stages.** Each structure's stage at each checkpoint equals the stage computed by an **independent oracle**: a separate function that reads only the parameter tables and the fixture geometry, not the implementation.
- **A6 Determinism.** Two runs produce identical ledger and state checksums at every checkpoint. The 9-layer and 32-layer runs produce identical stages and identical ledger totals.
- **A7 LOD invariance.** The fixture aged (i) all-L0 day by day, (ii) in L2 at the coarse tick, and (iii) in one day jump with checkpoints gives identical stages and ledger totals (ADR-003 §17.6).
- **A8 Work bound.** `decay.work_per_tick ≤ ⌈active / 2,400⌉`; zero decay work on maintained days y0-y10, except the fire; cells enqueued per decay event ≤ 64 (C-5); a frame counter shows decay is never called from a render hook.
- **A9 Save and load.** Saving at y1,000, reloading (the heap is rebuilt from records) and continuing gives the same checksums at y3,000..y12,000 as the uninterrupted run.

**Expected stages (approximate; the oracle computes exact days from data).** Lives from R-01.6 with limestone `wR` 50 (ASHLAR lives × 50/90) and FT 0.25:

| Structure | S1 | S2 | S3 | S4 | S5 |
|---|---|---|---|---|---|
| H1 stone house | ~y22 (roof h ≤ 0.85) | ~y22 (halo vegetation) | ~y73 (TIMBER roof, d0 y13 + 60) | ~y1,400 (walls SKY, life about 1,333 sy) | ~y2,500-4,000 (litter plus feed) |
| H2 mudbrick | ~y14 | ~y20 | ~y24 (THATCH roof, d0 y12 + 12) | ~y63 (MUDBRICK SKY 60 / 1.5) | ~y70-100 (own fines) |
| H3 timber hall | burned y5 | ~y15 | y5 (fire collapse) | y5-y100 | ~y2,500 |
| H4 brick tower | ~y16 | ~y20 | ~y37 (LIGHTWOOD roof) | ~y570 (BRICK SKY 800 / 1.5) | ~y3,000 |

### R-09.4 Mutants that must fail

| Mutant | Change | Assertion that must fail |
|---|---|---|
| MR-01 residue leak | `residue.burn` computes gas as `floor(m × (1 − a − c))` instead of the remainder | A1, A2 at y5 |
| MR-02 shed leak | shedding books FINES but does not add them to the member's shed pool | A1 |
| MR-03 ore creation | the corrosion transform outputs an ore form, or an ore outcrop object, at y1,000 | A3 |
| MR-04 foundation erasure | FOUNDATION members get a `failDay` (the TR-1 floor removed) | A4 at y3,000 or y10,000 |
| MR-05 relic erasure | the gold ring and glass rot like organics | A4 at y12,000 |
| MR-06 vanishing remains | remains removed after 12 game hours (today's `DEUS_Anim.js:1162`) | A1, A4 |
| MR-07 fire deletes items | today's `DEUS_Fire.js:442` behaviour | A1 at y5 |
| MR-08 double yield | salvage uses the catalog's fixed 2 + 2 stone | A1, A2 |
| MR-09 nondeterminism | `Math.random` in the vegetation stand-in or in spill order | A6 |
| MR-10 full scan | decay iterates all members every tick | A8 |
| MR-11 stale geometry | burial threshold of one 1-ft slice (half the mass), or a bottom layer hard-coded at -2 | A5, A6 (the 32-layer run, the S1 shrine at layer -3) |
| MR-12 lost heap | the heap is not rebuilt on load | A9 |
| MR-13 walls before roofs | ROOF and WALL lives swapped | A5, and the data validator AT-R-02 |
| MR-14 coal from charcoal | with OQ-R-03's lithification run enabled, buried charcoal becomes coal | A3 |

### R-09.5 Optional deep-time run

Only if the Owner puts lithification in scope (OQ-R-03): FX-R-01L continues FX-R-01 by day jump to 1,000,000 sy, with FIXTURE-FEED burying the patch under ≥ 1 layer (10 ft). ROCK-SED must form from SEDIMENT and SOIL-MIN; A1-A3 must hold, with A3 extended to coal, gems and fossil beds.

## Sparse storage and cost

This section answers R-10: how decay state is represented in memory and saves (D-3: sparse storage covers **both**), how it is scheduled, and what it costs per site, region and layer, with the arithmetic.

### R-10.1 Principles

- Decay state is **per entity** (structure, member, unattended item, remains record, site, cohort) and, for a few point traces, **per touched cell in a sparse chunk map**. Nothing is per cell per tick, and nothing is dense in the layer count.
- Only **unmaintained** records have heap entries. A maintained world has an empty decay heap except for items and remains.
- Everything that can be derived is a cache and is not saved (AGENTS.md Rule 14, "save truth, rebuild caches").
- Chunks are ADR-003's 32×32 cells of one layer (§15.3). **[ADR-003]**

### R-10.2 Data structures

| Structure | Fields (typed layout) | Bytes | Exists for |
|---|---|---|---|
| Member | memberId u32, structureId u32, dc u8, ex u8, role u8, flags u8, hp0 u8, pad 3, d0 i32 (game day), rateMilli u32, nextDay i32, shedPool u32, runsOffset u32, runsCount u16, pad 2 | 40 + 4 per run | every member of every structure |
| Member run | x u8, y u8 (in area), z 6 bits (64 layers of headroom), slice mask 5 bits, 5 spare bits | 4 | one per cell a member covers |
| Structure | id u32, siteId u32, stage u8, flags u8 (anchor, burned), memberFirst u32, memberCount u16, bbox 4 × u8 + 2 × i8, litterStartDay i32 | 28 | every structure |
| Site decay fields | state u8, stage u8, pad 2, abandonedDay i32, predecessorSiteId u32 | 12 | every site |
| Heap entry | nextDay i32, id u32 (kind in the top 3 bits) | 8 | unmaintained members, unattended items, remains, weathering residue, litter footprints |
| Item decay fields | dc u8, ex u8, cond0 u8, pad, d0 i32, nextDay i32 | 12 | unattended items only |
| Remains record | personId u32, species u16, stage u8, ex u8, softMu u32, boneMu u32, d0 i32, nextDay i32, cell key u32 | 28 | unmerged remains |
| Residue entry | cell index u16 + slice u8, present-mask u8, then only present fields as u32: ash, charcoal, soil-org, soil-min, oxide per metal family, bone, remains-anchor list ref | 4 + 4 per field (typically 12-20) | **touched cells only**: burned cells, cells where an item rotted or corroded, cells where remains merged |
| Chunk structure index | list of structure ids whose bbox overlaps the chunk | 4 per id | chunks that hold built matter |
| Buried-find list | item ids keyed by cell and slice | 4-8 per item | chunks that hold buried items |
| Cohort record | 20 classes × 8 stages × (u32 count + 8 forms × 8 B) | ≤ 10,880 | only regions that hold records-less matter (R-08.3) |

**Residue storage adapts to density.** A chunk keeps residue entries in a small sorted array while it has ≤ 64 of them. Past that it switches to a per-chunk plane: 1,024 cells × 24 B = 24 KiB, allocated on demand. The `reclaimable` flag is not stored: it is derived from the structure's state.

**Reverse lookup** (which members does this changed cell touch?) goes cell → chunk → overlapping structure ids → those structures' member runs. That is about 5 structures × 15 members per lookup, with no per-cell member index.

### R-10.3 Memory arithmetic

DEC-014 gives no population numbers: the budget is "sized by post-split simulation performance benchmarks" (`docs/OWNER_DECISIONS.md:205`), and DEC-014 is `OPEN`. The only concrete figure is Year 0: "9 racial factions of 8 founders each = 72 colonists" (`docs/society/DEUS_SOCIETY_WBS.md:19`). So two **assumed** scenarios follow; they are not predictions.

**Per site** (40 structures, 15 members each, 8 runs per member): 600 members × (40 + 32) B = 43,200 B; structures 40 × 28 = 1,120 B; site 12 B. **About 44 KB per site**, all of it at any layer count. When the site is a burned or corroded ruin, add its touched chunks: up to about 4 × 24 KiB = 96 KiB in dense planes, usually much less.

**Scenario Y0** (Year 0: 72 colonists, 9 camps, ≤ 5 structures each): 45 structures × 15 members × 72 B = 48,600 B, plus about 2,000 unattended items × 12 B = 24,000 B. **Under 100 KB.**

**Scenario L** (assumed large world: 200 sites × 50 structures = 10,000 structures; population 50,000; 30 % of structures unmaintained; 200,000 unattended items):

| Item | Arithmetic | Bytes |
|---|---|---|
| Members | 150,000 × 72 B | 10.8 MB |
| Structures | 10,000 × 28 B | 0.28 MB |
| Heap: members | 45,000 × 8 B | 0.36 MB |
| Unattended items | 200,000 × (12 B + 8 B heap) | 4.0 MB |
| Remains | V123's mean lifespan of 60 years gives about 50,000 / 60 ≈ 833 deaths per sy; unmerged for up to 50 sy: 41,700 × (28 + 8) B | 1.5 MB |
| Residue | about 120,000 touched cells (burned houses, corrosion and rot points, merged remains) × 20 B, or dense planes where clustered | 2.4-4.8 MB |
| **Total** | | **about 19-22 MB** |

**Per layer.** None of these structures has a size term in the layer count. At 32 layers a world with the same buildings costs the same as at 9 or 5 layers. Underground sites cost what is built there, like surface sites. That meets ADR-003's rule that `heap(32) − heap(9)` on the sparse fixture stays within the chunk directory difference plus 64 KiB (§9.1). **[ADR-003]**

**Per region.** Nothing, unless the region holds records-less matter: then one cohort record of at most 10,880 B (R-08.3).

### R-10.4 CPU per tick

- **Class:** O(k log n) per tick, where k ≤ ⌈due / 2,400⌉ is the number of due heap entries processed that tick (ADR-003 L1047) and n is the heap size. When nothing is due, the cost is one integer comparison of the heap top against the current day.
- **Scenario L event rate:**
  - members: 45,000 unmaintained × 6 events per life ÷ a mean life of about 500 sy = 540 per sy;
  - items: 200,000 × 4 steps ÷ about 50 sy = 16,000 per sy;
  - remains: 833 × 3 = 2,500 per sy;
  - residue and litter: about 1,000 per sy;
  - **about 20,000 events per sy**.
- **Under D-1 (b), DPY = 1:** 20,000 events per game day = ⌈20,000 / 2,400⌉ = **9 per tick**, 90 per real second at 1x, 1,440 at 16x. Each is a heap pop and push of about log2(290,000) ≈ 18 comparisons (the heap holds about 45,000 members, 200,000 items and 41,700 remains). Only the 540 member events per sy write strata (≤ 64 each) and wake Lane Q (C-5).
- **Under D-1 (a), DPY = N:** 20,000 / N per game day: 1 per tick at N = 20.
- **Per frame: zero.** Decay runs only in the core tick (historical domain), never from a render hook (A8).
- **Event handlers** (exposure recomputation on `levels:strataChanged`, fluid wet/dry, `objects:changed`) cost one reverse lookup (R-10.2) and a reschedule of the affected members only.

### R-10.5 Save representation (D-3)

| What | Saved form | Size |
|---|---|---|
| Maintained members | **not saved**: rebuilt at load from the structure's built strata by the deterministic grouping rule (R-02.2), ids assigned in canonical order | 0 |
| Unmaintained members | `(memberId, ex, hp0, d0, shedPool)` plus runs | about 16 + 4 per run B |
| Structures | `(id, siteId, stage, flags, litterStartDay)` | about 16 B |
| Item decay fields | stored on the item record | 12 B per unattended item |
| Remains | full record until merged | 28 B |
| Residue | per chunk, present entries only: cell, mask, present values | 12-20 B per touched cell |
| Heap, reverse index, reclaimable flags, exposure caches | **not saved**; rebuilt at load | 0 |
| Strata that decay wrote (rubble, fines, ash, soil slices) | ordinary changed-cell records | 11 B each, 22 hex characters in today's format (`DEUS_Levels.js:997`, `:1351`) |

- **Worked example.** A ruined 10×10 house with its halo touches 12 × 12 = 144 cells on 2 layers, at most 288 changed cells × 22 characters ≈ **6.3 KB** of strata save. Under the stale 1-ft model the same house spans the same cells and the record length is the same, because both models have 5 slices per layer.
- **Scenario L save:** 45,000 unmaintained members × about 48 B ≈ 2.2 MB (the 105,000 members of maintained structures are rebuilt, not saved); items 200,000 × 12 B = 2.4 MB; remains 41,700 × 28 B ≈ 1.2 MB; residue 120,000 × 20 B = 2.4 MB; about 8.2 MB in total, before encoding overhead. Today's only save budget is a 3 MB check on the Levels part (`DEUS_Levels.js:5517`); the SIM.00.06 save format (ADR-003 §11) will need a decay line in its budget.
- **Load:** rebuilding the heap is O(n log n) once; for about 290,000 entries that is about 5.2 million comparisons (not measured).

### R-10.6 Summary per mechanism

| Mechanism | Reads / writes (sparse form) | Trigger | CPU class | Memory at 32 layers |
|---|---|---|---|---|
| Structure decay | member records; HP bytes at thresholds | heap due day (historical domain) | O(log n) per event | 72 B per member, 0 per layer |
| Exposure | cached sky and wet aggregates; member `ex` | `levels:strataChanged`, fluid wet/dry, collapse event | O(members of ~5 structures) per event | 0 extra |
| Maintenance and abandonment | site upkeep `k`, triage list | population or structure events | O(structures in site) per event | 12 B per site |
| Shedding and litter | member shed pool; footprint litter schedule | heap | O(foot cells) per slice write | 4 B per member, 4 B per structure |
| Items and remains | item fields; remains records | drop, death, heap | O(log n) per event | 20 B per unattended item; 36 B per remains |
| Fire residue | residue entries | SIM.50.05 burnout | O(components) | 12-20 B per burned cell |
| Reclamation | derived flag; Ecology's own records | stage and maintenance events | O(footprint cells) per stage | 0 saved |
| Deep history | the same heaps | day jump | O(due events) | 0 extra |
| Cohorts (L2 only) | cohort record | region coarse tick or day jump | O(classes × stages) per region | ≤ 10,880 B per region with such matter |

## Acceptance tests

This section answers R-11: automatable tests for SIM.40.05-.09 (and the interfaces with SIM.40.02, SIM.40.10, SIM.50.05 and SIM.50.09), each with a mutant that must fail. Every test runs headless, at the 9-layer test range and the 32-layer default (ADR-003 §17.6), and exits non-zero on failure.

| Id | Leaf | Fixture and assertion | Mutant that must fail |
|---|---|---|---|
| AT-R-01 | SIM.40.05 | One member per dc and ex: lazy HP at sampled days equals the closed form; HP bytes are written only at the published thresholds and at failure (≤ `steps` + 1 writes per life) | HP written every day (write count above the bound); or the rate ignores `ex` |
| AT-R-02 | SIM.40.05 | Data validator: every life > 0 or ∞; ∞ only where the table allows it; for every structure template, ROOF life at SKY < WALL life at SHELTERED; ore, coal, gem or fossil outputs absent from the transform table | ROOF and WALL lives swapped (MR-13): the validator exits 1 |
| AT-R-03 | SIM.40.05 | A maintained site: zero heap entries for its members and zero decay work over 10 game days (ADR-003 §17.6) | maintenance ignored: entries appear and work > 0 |
| AT-R-04 | SIM.40.05, SIM.50.09 | Population to 0: ABANDONED after `siteAbandonYears`; at S3 on ≥ 50 % of mass the site is RUIN, `isRuined` is true, and the History reader gives `site.ruined = abandonedYear` | `isRuined` never set (today's X-7) |
| AT-R-05 | SIM.40.05 with SIM.40.02 | House fixture: at the roof's `failDay`, Lane Q's break path is called once per roof member; wall tops become SKY; ≤ 64 cells enqueued per decay event; the ledger shows `BUILT→RUBBLE`, not a deletion | decay turns the strata to air itself (today's `DEUS_Levels.js:1702` path): ledger leak, no collapse event; or a whole-world support recheck (visit counter above the bound) |
| AT-R-06 | SIM.40.07 | Ore guard: static transform-table check; the runtime guard rejects an ore write with a non-generation cause and logs it; no recipe accepts OXIDE | corrosion outputs an ore form (MR-03); or an ore sprout like `DEUS_Ecology.js:739` is reintroduced and not rejected |
| AT-R-07 | SIM.40.07 | An unattended iron longsword at SKY: 4 corrosion steps at the expected days, the grip rots on its own schedule, masses exact; the same sword carried by a unit never changes | attended items decay (breaks the DURABILITY.md:320 reading, OQ-R-04) |
| AT-R-08 | SIM.40.07 with SIM.40.10 | An off-screen death makes a remains record; stages at the expected days; mass to SOIL-ORG, SOIL-MIN and AIR exact; the anchor is kept for 200 sy; *gentle repose* shifts the clock by 10 game days | remains removed after 12 game hours (MR-06, `DEUS_Anim.js:1162`); or no remains off-screen (`DEUS_Anim.js:1147`) |
| AT-R-09 | SIM.50.05 with this design | Burn fixture (timber, cloth, iron nails, a lead cup, bone): `residue.burn` totals exact; metals survive; lead becomes SCRAP; charcoal and ash in the residue entry | items deleted (MR-07, `DEUS_Fire.js:442`); or gas by `floor` (MR-01) |
| AT-R-10 | SIM.40.06 | Plants establish on an abandoned S3 floor within the stand-in schedule and never on a maintained built cell | the `DEUS_Objects.js:266` guard kept (no establishment); or the guard removed entirely (plants on maintained cells) |
| AT-R-11 | SIM.40.06, SIM.40.07 | A strata write that covers a member or item reclassifies it BURIED in the same tick and reschedules or removes its heap entry; the item becomes ITEM-BURIED; excavation re-exposes it | no burial reclassification: the foundation keeps decaying and A4 fails |
| AT-R-12 | SIM.40.06 | Members at layers -3 and -12 never get SKY or `FT > 0`; cave fungus halves TIMBER lives; a flood makes members WET | bottom layer hard-coded at -2 or -4 (caught by the -12 member in the 32-layer run) |
| AT-R-13 | SIM.50.09 | Salvage of a limestone rubble slice yields 93 stones of 800 mu and leaves 272 mu of RUBBLE | fixed 2-stone yields (MR-08); or the remainder dropped |
| AT-R-14 | SIM.50.09 | Re-founding on H1: ruin cells are claimable; only missing slices consume items; reused slices keep their mass and change `structureId` | ruin cells block building (`DEUS_Colonists.js:3733`); or the whole wall's materials are consumed again |
| AT-R-15 | SIM.40.08 | LOD invariance (A7): L0 day stepping, L2 coarse ticks and one day jump give identical stages and ledger totals | summary rounding done in floating point, or cohort promotion without largest-remainder assignment |
| AT-R-16 | SIM.40.08 | Aging FX-R-01 by 10,000 sy processes no more heap events than the oracle's count, and zero in maintained periods | an annual loop that evaluates every member every year (event counter far above the bound) |
| AT-R-17 | SIM.40.09 | The long-run ledger test, FX-R-01 with A1-A9 | MR-01..MR-14 (section "Matter ledger long-run test") |
| AT-R-18 | SIM.40.05 | Sparse fixture: decay heap and record bytes identical at 9 and 32 layers; residue planes only in touched chunks | a per-layer dense residue plane: `heap(32) − heap(9)` above 64 KiB |
| AT-R-19 | SIM.40.05 | Save at y1,000, reload, continue: identical checksums (A9); decay save bytes grow only with unmaintained members, unattended items, remains and touched cells | heap not rebuilt on load (MR-12) |
| AT-R-20 | SIM.40.05 | D-1 neutrality: FX-R-01 at DPY = 1 and DPY = 20 gives identical stage **years** and ledger totals | one duration authored in days instead of sy |
| AT-R-21 | SIM.60.03 interface | SRD: a rust monster hit five times destroys a weapon and moves its iron to OXIDE exactly; the antennae destroy a 1-ft cube (7,840 mu) of an unattended iron object; a conjured wooden object that burns leaves residue that is sunk at the spell's expiry | conjured residue kept as permanent charcoal (the CONJURED sink does not balance its source) |
| AT-R-22 | PROPOSED-R-11 (Owner-gated) | FX-R-01L to 1,000,000 sy: ROCK-SED forms; no ore, coal, gem or fossil-bed output | charcoal becomes coal (MR-14) |

## WBS impact

This section answers R-12. Claude does not mint WBS IDs or change statuses (CANONICAL_ROLES; this lane's brief). Everything below is **PROPOSED** for the Coordinator.

### R-12.1 Where it fits in the audit's order of work

The audit's §6 order: 1) rule-breach fixes, 2) the ledger WG.65.15 moved earlier, 3) WG.00.17, 4) the core tick and slow clocks (ADR-003, SIM.00.02-.05), 5) the material and structure model (not yet in the WBS), 6) SIM.40 support and collapse, then decay, 7) SIM.30 LOD, 8) SIM.50.02-.10. This design's packages sit at step 6 and after, except:
- the ore guard's runtime check (PROPOSED-R-05) is small and could land with step 2, because it is a ledger rule;
- the fire residue function (PROPOSED-R-06) closes FIR-3, a LIFE-001 breach; it needs the ledger (step 2) but not the rest.

### R-12.2 Proposed packages

| Id | Title | Real dependencies | Maps to | Acceptance tests |
|---|---|---|---|---|
| PROPOSED-R-01 | Decay parameter data (dc, ex, lives, thresholds, residue fractions) and its validator | SIM.40.01, WG.65.15 | SIM.40.05 | AT-R-02, AT-R-20 |
| PROPOSED-R-02 | Decay members and the closed-form scheduler | SIM.40.01, SIM.40.02, SIM.00.05, WG.00.17, WG.65.15 | SIM.40.05 | AT-R-01, AT-R-05, AT-R-18, AT-R-19 |
| PROPOSED-R-03 | Maintenance, abandonment and the site state machine (X-7) | SIM.00.05, SIM.40.10, SOC.10.02 | SIM.40.05, SIM.50.09 | AT-R-03, AT-R-04 |
| PROPOSED-R-04 | Item weathering, remains to soil, buried finds | SIM.40.05, SIM.40.10, WG.65.15 | SIM.40.07 | AT-R-07, AT-R-08, AT-R-11 |
| PROPOSED-R-05 | Corrosion to OXIDE and the ore guard | WG.65.15, SIM.40.05 | SIM.40.07 | AT-R-06, AT-R-21 |
| PROPOSED-R-06 | Fire residue function (ash, charcoal, carbon sink) | SIM.50.05, WG.63.04, WG.65.15 | SIM.50.05 | AT-R-09 |
| PROPOSED-R-07 | Reclamation rule and burial exposure, surface and underground | SIM.40.05, SIM.50.04, SIM.50.03, SIM.50.02 | SIM.40.06 | AT-R-10, AT-R-11, AT-R-12 |
| PROPOSED-R-08 | Trace retention, salvage by mass and re-founding | SIM.40.08, SIM.50.08, SIM.50.09, SOC.10.03 | SIM.50.09 | AT-R-13, AT-R-14 |
| PROPOSED-R-09 | Deep-history day jumps and cohort decay | SIM.30.02, SIM.30.03, SIM.40.05 | SIM.40.08 | AT-R-15, AT-R-16 |
| PROPOSED-R-10 | Long-run matter ledger fixture FX-R-01 | SIM.40.06, SIM.40.07, SIM.40.08, WG.65.15 | SIM.40.09 | AT-R-17 |
| PROPOSED-R-11 | Lithification (only if the Owner puts it in scope, OQ-R-03) | SIM.50.03, WG.65.08, WG.65.16 | none yet | AT-R-22 |
| PROPOSED-R-12 | Reconcile the design documents listed below with this design (docs only) | SIM.40.05 | none | a check that fails if a listed conflicting sentence is still present; mutant: re-insert one and the check must fail |

### R-12.3 Recommended changes to existing rows (for the Coordinator)

- **SIM.40.05** lists "SIM.40.01, dep: SIM.00.01" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:538`). It also needs WG.65.15 (the ledger), SIM.00.05 (terrain in the core; ADR-003 Q15, L1258) and the material and structure model (audit §6 step 5, which Lane Q's SIM.40.01 design is expected to cover).
- **SIM.40.07** needs SIM.40.10 for remains (Lane W's W-03).
- **SIM.40.08** needs SIM.30.03 as well as SIM.30.02 (promotion must conserve cohort masses).
- **SIM.50.05** needs PROPOSED-R-06 (or its content) for FIR-3, and SIM.50.06 (audit §6 step 8).
- **Overlaps.** WG.65.10 "Construction Degradation & Ruins: Maintained → Damaged → Ruined → Collapsed → Overgrown" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:249`) duplicates SIM.40.05/.06. WG.65.01 (lifecycle state machine), WG.65.08 (pedogenesis), WG.65.13 (catch-up), WG.65.14 (disturbed-region scheduler), WG.65.17 (archaeology) and WG.65.18 (multi-century stress test) each overlap a part of this design; WG.61.02 "Closed-Loop Finite Conservation Ledger" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:194`, QUEUED) overlaps WG.65.15. The Coordinator decides which rows to merge or supersede.
- **Stale geometry in planning text.** WG.65.02 says "1 ft strata cells" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:241`); SIM.30.01 says "256×256×5 Z" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:529`); INV-GEO-01 "1 stratum = 1 ft" and INV-GEO-02 "5 macro-Z levels" (`docs/INVARIANT_REGISTRY.md:29-30`) contradict DEC-013.

### R-12.4 Disagreements flagged (none resolved here)

| Sources | Disagreement | Where it is routed |
|---|---|---|
| The brief's chain to rock vs ADR-003 L1683 ("never go past 'buried mound'") and L1680 (compaction "into strata on a century-scale schedule") | The brief asks for soil, sediment and rock; ADR-003 floors meaningful sites at the mound. This design keeps ADR-003's floor for anchored matter (TR-1..TR-8) and applies S6-S7 only to non-anchor matter; lithification is Owner-gated | OQ-R-02, OQ-R-03 |
| `docs/design/DURABILITY.md:320` vs SIM.40.07 and V138 | "Items have no HP ... Tools don't wear out" vs item weathering | OQ-R-04 |
| `docs/design/REMAINS.md:175` vs `docs/design/PEOPLES.md:215` vs R-03.4 | three different body decay timings | OQ-R-06 |
| `docs/design/REMAINS.md:258` vs DEC-011 | stage tints vs "no ... tint" | art slot `remains.<size>.<stage>`; PROPOSED-R-12 |
| `docs/design/REMAINS.md:428`, `DEUS_Anim.js:1097`, `DEUS_Fire.js:442` vs LIFE-001 | bones "crumble away", remains dropped past a cap, items deleted by fire | R-03.4, R-04; PROPOSED-R-12 |
| `docs/design/DURABILITY.md:53` and `:557` (dismantle returns 75 %) vs `docs/design/WORLD_ARCHITECTURE.md:236` (dismantle to `build.items`) vs LIFE-001 | neither is by mass | salvage by mass (R-07.4); PROPOSED-R-12 |
| `docs/design/ECOLOGY.md:128` | a full pass over every level's object grid at load (65,536 reads per level), about 2.1 million at 32 layers | outside decay; flagged for SIM.50.04 |
| `docs/design/VERTICAL_WORLD.md:288` | dense per-level arrays, against DEC-013 §3 at 32 layers | outside decay; flagged for WG.00.17 |
| WG.63.04 / SIM.50.05 "permanent ash beds" vs R-04.4 | whether exposed ash weathers | OQ-R-07 |
| SRD damage threshold (`game/data/srd51/rules.json:7167`) vs V138 | decay against walls with a threshold | OQ-R-09 |

**Dependencies on PM decisions the Owner may overturn:** D-4 (water authority: WET, BURIED-ANOX, flooding, fixture water; R-01.4, R-06.4, R-09.2) and D-6 (race-to-plan slots: re-founding policy; R-07.5). **On an OPEN decision:** DEC-010 (props and natural rock roofs; R-05.5). **On OWNER_OPEN D-1:** every duration (section 0.3, R-08.6).

No escalation file was written: every disagreement above is one the brief tells this lane to flag, and none needed a file outside the allowed paths.

## Owner questions

These are questions, not answers. Each option list starts with the default this design uses so that it can be specified; the Owner may pick any option. D-1 (calendar scale) is already open and is not repeated here.

| Id | Question | Options |
|---|---|---|
| OQ-R-01 | How fast should decay run? | (a) the real-world-order default lives in this document (a timber roof in 60 sy, stone walls in millennia); (b) all lives divided by one factor (for example 10) so ruins form within a play session; (c) separate factors for structures and for items and remains. It interacts with D-1 (the mapping table in R-08.6). |
| OQ-R-02 | How long must ruins stay recognisable (LIFE-003)? | (a) foundations, vaults and mounds indefinitely unless a physical process removes them (default: TR-1..TR-8); (b) at least 10,000 sy, after which natural erosion may erase them; (c) at least 1,000 sy. |
| OQ-R-03 | Is lithification (sediment to rock) in scope? | (a) no: the cycle ends at consolidated sediment and soil strata (ADR-003 L1680); (b) only in deep-history day jumps, never in live play; (c) yes, live, under the ore guard. |
| OQ-R-04 | Do unattended items weather, given "Items have no HP ... Tools don't wear out" (`docs/design/DURABILITY.md:320`)? | (a) unattended items weather through a condition field (not HP), tools in use never wear (default); (b) only organic items rot, metal never corrodes; (c) no item weathering (SIM.40.07 would need rewording). |
| OQ-R-05 | Do mithral, adamantine and magic items decay? | (a) never (default); (b) very slowly; (c) per-item data. |
| OQ-R-06 | Which remains timings apply, and how long is a dead person's identity kept? | (a) physical durations in sy (skeleton in 0.25 sy in the open) with the anchor kept ≥ 200 sy for *true resurrection* (default); (b) REMAINS.md's game-hour durations as the look, with the physical clock underneath; (c) PEOPLES.md's 30 and 120 days. |
| OQ-R-07 | Are ash beds permanent when exposed (WG.63.04, SIM.50.05)? | (a) buried ash beds are permanent; exposed ash weathers to soil in about 5 sy (default); (b) exposed ash beds never weather; (c) the ash look stays while its mass goes to soil. |
| OQ-R-08 | Who may re-found whose ruins? | (a) any culture on any ruin (default); (b) only the same race or culture; (c) per race in the DEC-015 plan data (depends on D-6). |
| OQ-R-09 | Does decay lower HP past an object's SRD damage threshold? | (a) yes, decay ignores the damage threshold (default); (b) objects with a threshold decay at a reduced rate; (c) they never decay. |

## Not checked

- Nothing was run. There is no code in this lane; every test above is a specification for later code lanes.
- Every rate, fraction and duration is a design default from real-world orders of magnitude; none was balanced or measured.
- Memory and CPU figures are arithmetic from the stated assumptions; the per-event time (1-10 µs) is an assumption.
- Lane Q and Lane W designs did not exist when this was written; the collapse contract (R-05) and the remains hand-off (R-03.4) use assumed names.
- ADR-003 is PROPOSED; every **[ADR-003]** mark depends on it.
- A search pass reported ADR-003 merged on `origin/main` after this lane's base; that was not re-checked by the writer beyond `git show` of the Lane M branch file.

