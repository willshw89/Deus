# SIM.40.10 Population Design: Lineage, Lifecycle, Carrying Capacity, Nine Races

| | |
|---|---|
| Task | SIM.40.10 (shared reproduction and lifecycle for people, livestock, wildlife and monsters), population budget and carrying capacity (DEC-014), nine SRD races with one culture-plan slot each (D-6), and what migration needs first. Lane W, docs only. |
| Writer / reviewer | Claude (writer). Grok reviews independently; this document does not certify itself. |
| Date | 2026-09-26 |
| Base commit | `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` (the BRIEF's base, `origin/main`). `git rev-parse HEAD` when writing started: `4f2ea274ecbcbb7602eb0709bbf61af0548d5743`. `git diff --stat 84ee3b55 HEAD` lists only files under `tasks/SIM.40.10/lane-w/`, so every `file:line` below reads the same at both commits. |
| Kind of work | Design only. No code, scripts, tests or art. Nothing outside `tasks/SIM.40.10/lane-w/` was written. |
| Governing rows | V74, V83, V95, V123, V128, V133, V137-V142; DEC-012, DEC-013, DEC-014 (OPEN, PM defaults), DEC-015, DEC-018; INV-SIM-01..03; LIFE-001..003, NAT-003; audit gaps REP-1..5, MIG-1..5, PLAN-1..4, SET-1..5, decay gap DEC-3 (the audit's decay gap IDs `DEC-1..3` are written "decay gap DEC-n" here so they are not mistaken for Owner decisions). |
| PROPOSED dependency | ADR-003 Rev 3 (`docs/adr/ADR-003_sim_render_split_and_lod.md` on `origin/task/lane-m`, not on `main`). Read with `git show origin/task/lane-m:docs/adr/ADR-003_sim_render_split_and_lod.md`. Every place this design leans on it is marked **[ADR-003 PROPOSED]**. |

## 0. Inputs, method, conventions and limits

**Inputs read.**
- `docs/audits/LIVING_WORLD_GAP_AUDIT.md` (SIM.50.01, merged `4614dbfa`): §1, §2.5-2.7, §3.6, §3.8, §4.3, §4.4, §5, §6, §9.
- `docs/OWNER_DECISIONS.md` DEC-010..DEC-015, DEC-018 (lines 137-266); `docs/VISION.md` V74 (line 84), V83 (94), V95 (106), V123 (decision log, 338-342), V128 (log, 365), V133 (127), V137-V142 (131-136); `docs/INVARIANT_REGISTRY.md:51-53`; `docs/RISK_REGISTER.md:60-62`, `:74`.
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` (Rev 25): WG.00.17 (line 105), WG.62.02 (196), WG.65.10 (249), WG.65.15 (254), SIM.00.00-06 (519-525), SIM.30.01-05 (529-533), SIM.40.01-10 (534-543), SIM.50.01-10 (544-553), SIM.60.01-04 (559-562), GP.07.02 (578). `docs/society/DEUS_SOCIETY_WBS.md` SOC.10.01-03 (58-60), SOC.20.01 (71).
- ADR-003 Rev 3 [ADR-003 PROPOSED]: §5 (regions, L0/L1/L2), §6 (summary state), §7.5 (tracked units), §7.8 (conserved quantities), §9.2 (time budgets PENDING-K3), §14.3 (Q6 aged worlds).
- Code at the base commit: `DEUS_Colonists.js`, `DEUS_History.js`, `DEUS_HistoricalDemographics.js`, `DEUS_Ecology.js`, `DEUS_Wildlife.js`, `DEUS_Factions.js`, `UF_Households.js`, `DEUS_World.js`, `DEUS_Levels.js`; data `game/data/DEUS_WorldCatalog.json`; SRD `game/data/srd51/character_options.json`, `creatures.json`, `rules.json`.
- Design docs, read only: `docs/design/PEOPLES.md`, `docs/design/ECOLOGY.md`, `docs/design/REMAINS.md` (headers and life-stage sections).
- Sibling lanes, unreviewed: Lane O2 people-side gap audit `tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md` at `origin/task/gap-audit-people` `3ef0d154603a1fa6ed32dfc3c705cf7d8f3662e4` (a WIP checkpoint). Lane R (`origin/task/lane-r`, `d9766aa2`) and Lane Q (`origin/task/lane-q`, `9103799e`) hold only their BRIEF and `lane.json`, so their interfaces are written below as explicit assumptions (section 3.6).

**Method.** Every code claim was read at the base commit with `sed -n` or `grep -n`; each audit citation this document reuses was re-read (the plugins it cites for population are byte-identical between the audit commit `75cf2ff3` and the base; only `DEUS_Levels.js` and `DEUS_World.js` changed, and `DEUS_World.js` citations here use the base lines). SRD text was extracted from `character_options.json` with a `node -e` one-liner (REPORT.md has the commands).

**Conventions.**
- A bare plugin name (`DEUS_Colonists.js:2482`) means `game/js/plugins/<name>`. Other paths are from the repo root.
- **Geometry (DEC-013, Owner ruling D-2):** 32 layers, z = -16..+15, surface 0; one cell is 5 ft × 5 ft; one layer is 10 ft; one layer is 5 slices (strata) of 2 ft. The code today has 5 levels of five 1 ft strata (audit F-01) and `Z_STEP_FEET: 5` (`DEUS_World.js:255`). Where a number here would differ under that stale model, the text says so.
- **Regions [ADR-003 PROPOSED]:** a region is 32 × 32 cells across one *slab* of 2 adjacent layers, so 64 regions per slab and 1,024 regions per 256 × 256 area at 32 layers (ADR-003 §5.1). In feet a region is 160 ft × 160 ft × 20 ft. LOD levels: L0 full (every tick), L1 near (every 10 ticks), L2 summary (every 100 ticks = 1 game hour) (ADR-003 §5.2).
- **Ledger [ADR-003 PROPOSED, WG.65.15]:** matter moves only by `ledger.transform(fromForm, toForm, family, massUnits, cause)` (ADR-003 §7.8). Q-MASS[family] changes only through a named source or sink. This document names the forms and causes it needs; WG.65.15 owns the mass unit. **Assumption A-MASS:** biology uses integer grams (1 g). A 150 lb dwarf (SRD) is 68,039 g and fits a `Uint32` with room for a Gargantuan creature.
- **Sparse (DEC-013 §3, Owner ruling D-3):** covers resident memory and saves. Every structure below states its sparse form.
- **Change-driven (V133, NAT-003):** nothing below walks every creature, cell or region on a clock. Work is driven by (1) a due-date queue of lifecycle events, (2) region coarse steps that ADR-003 §5.5 schedules only for regions that hold state, and (3) mutation events.

**Limits.**
- Nothing was run. Costs are order-of-magnitude arithmetic with stated assumptions; no timing was measured (the ADR's time budgets are PENDING-K3).
- SRD 5.1 is silent on gestation, litter size and animal lifespans. Numbers for those are **proposed defaults from general zoology, not SRD**, and every one is a data parameter with an Owner or tuning gate.
- The Owner has not ruled on D-1 (calendar), DEC-014 (still OPEN with PM defaults), ADR-003 Q14 (crowd LOD for people) or the race-to-layer mapping (DEC-013 open sub-question). This design depends on each and says where.
- D-4 (Fluid is the one water authority) and D-6 (one plan slot per SRD race) are PM decisions the Owner may overturn. Items that depend on them are tagged **[D-4]** and **[D-6]**.

### 0.1 Time units and the D-1 mapping (OWNER_OPEN, not chosen here)

All durations are written in **sim-years (y)** of biological time. The Owner has not ruled D-1 (audit §9). Today V123 makes one day/night cycle one year: 240 s real at ×1 (`docs/VISION.md:340`, `DEUS_Core.js:59`), and "seasons" are 6-hour quarters of one day (audit F-06). The table shows what each duration means under the two options the BRIEF names. Option (a) separates the solar day from the year: a year becomes `DAYS_PER_YEAR` solar days, a number the Owner has not set. The example column uses 336 days (12 months × 28 days, the structure the regrowth counter already assumes at `DEUS_Objects.js:162`) **only to show scale; it is not a proposal**, and it assumes a solar day stays 240 s real at ×1.

| Duration | sim-years | (b) keep V123: real time at ×1 (1 y = 240 s) | (a) separate day and year: solar days | (a) real time at ×1 if `DAYS_PER_YEAR` = 336 (illustration) |
|---|---|---|---|---|
| One ADR L2 coarse step (1 game hour) [ADR-003 PROPOSED] | 1/24 of a solar day | 10 s; one step = 1/24 y ≈ 15 days of biology | 1/24 day | 10 s; one step = 1/8,064 y |
| One season (quarter year) | 0.25 | 60 s | `DAYS_PER_YEAR`/4 | 84 days = 5.6 h |
| Rat gestation (zoology default) | 0.06 | 14.4 s | 0.06 × D | 20 days = 1.3 h |
| Wolf gestation (zoology default) | 0.17 | 41 s | 0.17 × D | 57 days = 3.8 h |
| Deer gestation (zoology default) | 0.55 | 132 s | 0.55 × D | 185 days = 12.3 h |
| Human gestation (zoology default; SRD silent) | 0.75 | 180 s | 0.75 × D | 252 days = 16.8 h |
| Human birth spacing (`DEUS_HistoricalDemographics.js:128`) | 3 | 720 s | 3 × D | 1,008 days = 67 h |
| Human coming of age (V123: 15) | 15 | 3,600 s = 1 h | 15 × D | 5,040 days = 14 days real |
| Human mean lifespan (V123: 60) | 60 | 4 h | 60 × D | 56 days real |
| Dwarf mean lifespan (SRD: about 350) | 350 | 23.3 h | 350 × D | 327 days real |
| Elf lifespan (SRD: up to 750) | 750 | 50 h | 750 × D | 700 days real |

Consequences that hold under either option, and are therefore designed in:
- Under (b) a coarse step spans about 15 days of biology, so short gestations (rat, 0.06 y) complete within one or two coarse steps. Lifecycle events are therefore **due-dated in sim-time and resolved by closed form**, never by counting steps (section 1.4). The same records work under (a), where events are thousands of steps apart.
- The audit's option (c) (slow the life clock and the calendar together) is also compatible: it changes only the sim-year-to-real-time factor in this table.

## Lifecycle

### 1.1 Species classes and origin kinds

V140 asks for one lifecycle across people, livestock, wildlife and biological monsters. This design has one data record per species, the **life block**, and four classes that differ only in data and in how LOD holds them.

| Class | Examples today | Data source today | LOD holding [ADR-003 PROPOSED] | Lineage kept |
|---|---|---|---|---|
| People (nine SRD races) | `human` … `tiefling` | `people` (`game/data/DEUS_WorldCatalog.json:7305`); profiles `DEUS_HistoricalDemographics.js:128-136` | tracked individuals (ADR-003 §7.5: kind `person`/`colonist` is always tracked) plus, if the Owner adopts crowd LOD for people (ADR-003 Q14, DEC-014 §2), crowd buckets (section 6) | per individual; per lineage for crowds |
| Livestock | none: no `livestock` string exists in `game/js/plugins` or the catalog (grep, REPORT.md) | ABSENT | owned herds (section 6.4) | per herd; per individual only when named or tracked |
| Wildlife | 18 non-monster species (`wildlife.species`, `game/data/DEUS_WorldCatalog.json:6246`: 7 grazer, 1 vermin, 7 predator, 3 flier) | catalog `wildlife` | anonymous buckets `count[species][ageBand][sex]` per region (ADR-003 §6) | herd trait means only |
| Monsters | 5 `kind: "monster"` species: `troll` (`:7050`), `bog_horror`, `sand_stalker`, `restless_dead` (`:7208`), `ice_wraith` | catalog `wildlife` | same as wildlife when `origin = breeds`; per individual when `unique` | as wildlife, or none |

**Origin kinds (DEC-014 §5, V140).** Every species carries `life.origin`. No field of this kind exists today (REP-3). The default is `breeds` (DEC-014 §5: "most monsters reproduce biologically like animals"). The Owner assigns exceptions.

| `origin` | Rule | Ledger | Default by SRD creature type (proposal; Owner assigns per species) |
|---|---|---|---|
| `breeds` | Sexual reproduction through the full lifecycle below. | food → body → remains (section 3) | beast, humanoid, giant, monstrosity, dragon, plant, ooze |
| `created` | Made by an agent from existing matter (undead from remains, constructs from materials). Never breeds; ages only if the species says so. | `remains → body` or `item → body`, cause `create:<spell or rite>`; nothing from nothing | undead, construct |
| `spawned` | Arrives from an explicitly modelled source (a lair, a rift). Never breeds in place. | a named **source** `spawn:<sourceId>`, logged like rain or conjured matter (DEC-018 PM default, `docs/OWNER_DECISIONS.md:262`); the source and its budget are Owner-approved data | fiend, celestial, elemental |
| `unique` | One individual, never reproduces, never respawns; death is final. | as `breeds` for its own body | legendary named creatures |

The five catalog monsters map as follows (a proposal, not an assignment): `troll` is SRD "Large giant" (`game/data/srd51/creatures.json:33428`), so `breeds`. `restless_dead` is undead by name; the nearest SRD entries are undead (`srd:creature:zombie`, `creatures.json:35073`), so `created`. `bog_horror`, `sand_stalker` and `ice_wraith` have no SRD entry by name; their origin is an Owner question (OQ-W-06).

V75 ("monsters keep spawning", cited in `docs/design/ECOLOGY.md:6`) and V83 conflict with LIFE-001 if "spawn" means "appear from nothing". Today `attemptSpawn` does exactly that for prey and monsters (`DEUS_Ecology.js:509`, unit created at `:548`, called by `processArea` at `:563-564`). Under this design "keep spawning" is met by `breeds` plus arrivals from neighbouring regions (migration moves counts, it creates none) or by an approved `spawned` source. OQ-W-06 asks the Owner which.

### 1.2 Stages

One stage table per species, in sim-years, in data (`life.stages`). Stage names are the ones the code already uses (`baby`, `child`, `teen`, `adult`, `elder`: `DEUS_Colonists.js:2807-2816`) plus `egg` and `juvenile` for animals. Stages are **derived** from `birthTime` and the table; they are never stored per tick (section 1.4).

| Class | Stages (sim-years are species data) | Source |
|---|---|---|
| People | baby → child → teen → adult → elder. Humans: baby 0-1, child 2-11, teen 12-14, adult 15-49, elder 50+ (V123, `docs/VISION.md:339`) | V123 for humans; SRD `Age` text for the other eight (section 1.3) |
| Livestock and wildlife (mammals) | newborn → juvenile → adult → elder; `egg` precedes newborn for egg-layers | zoology defaults; SRD silent |
| Birds, reptiles, spiders | egg → juvenile → adult → elder | zoology defaults |
| Dragonborn | egg → baby ("walk hours after hatching") → child (size of a 10-year-old human at 3) → adult 15 → elder | SRD (`game/data/srd51/character_options.json:366`) |
| `created` / `spawned` | a single `adult` stage unless data says otherwise | origin rule |

Two kinds of maturity are kept apart because the SRD keeps them apart:
- **Physical maturity** (`adultAge`): can work, fight and reproduce.
- **Social adulthood** (`socialAdultAge`): the culture's age of full standing. For dwarves the SRD says they "mature at the same rate as humans, but they're considered young until they reach the age of 50"; for elves "an elf typically claims adulthood and an adult name around the age of 100". This field feeds DEC-015 plan roles and SOC.10.01 `class`, not biology.

### 1.3 SRD baselines per race

Quoted from the SRD `Age`, `Size` and `Speed` paragraphs (`game/data/srd51/character_options.json`, race entries at lines 45, 123, 197, 366, 525, 626, 692, 810, 882). The last three columns are what the code's history profiles use today (`DEUS_HistoricalDemographics.js:128-136`), which run only at New Game (`DEUS_History.js:391`).

| Race | SRD age text (verbatim, trimmed) | adultAge / socialAdultAge (proposed) | Lifespan (proposed data) | Code `lifespan` | Code `reproductiveAge` | Code `birthSpacingYears` |
|---|---|---|---|---|---|---|
| Human | "reach adulthood in their late teens and live less than a century" | 15 (V123) / 15 | V123 curve, mean 60 | [60, 90] | [18, 55] | 3 |
| Dwarf | "mature at the same rate as humans … considered young until … 50 … live about 350 years" | 15 / 50 | mean 350 | [250, 350] | [40, 240] | 6 |
| Elf | "reach physical maturity at about the same age as humans … claims adulthood … around the age of 100 and can live to be 750" | 15 / 100 | max 750 | [350, 750] | [60, 350] | 12 |
| Halfling | "reaches adulthood at the age of 20 and generally lives into the middle of his or her second century" | 20 / 20 | about 150 | [120, 150] | [20, 110] | 4 |
| Dragonborn | "walk hours after hatching … size and development of a 10-year-old human child by the age of 3, and reach adulthood by 15 … live to be around 80" | 15 / 15 | about 80 | [65, 80] | [15, 60] | 3 |
| Gnome | "mature at the same rate humans do … settle down into an adult life by around age 40 … live 350 to almost 500 years" | 15 / 40 | 350-500 | [350, 500] | [40, 200] | 10 |
| Half-Elf | "mature at the same rate humans do and reach adulthood around the age of 20 … often exceeding 180 years" | 20 / 20 | about 180+ | [140, 180] | [20, 125] | 5 |
| Half-Orc | "mature a little faster than humans, reaching adulthood around age 14 … rarely live longer than 75 years" | 14 / 14 | up to 75 | [55, 75] | [14, 50] | 2 |
| Tiefling | "mature at the same rate as humans but live a few years longer" | 15 / 15 | human + a few years | [70, 110] | [18, 65] | 3 |

Findings from the table:
- **The code's profiles are mostly consistent with the SRD and are the right starting data** (W-08: keep). Two spots differ. `half-elf` caps at 180 where the SRD says "often exceeding 180". `tiefling` [70, 110] is far more than "a few years longer" than humans.
- **Human life has two conflicting numbers in code.** The history profile says lifespan [60, 90] (`DEUS_HistoricalDemographics.js:128`); the live mortality curve centres at 60 (`DEUS_Colonists.js:2828-2847`, V123). The curve is applied to *every* species, so a dwarf or elf would die near 60 if aging ran (it does not run: REP-1). Per-species lifespans fix this.
- **V123 vs the SRD for humans.** V123 sets coming of age at 15 (`docs/VISION.md:339`); the SRD says "late teens". V123 is an Owner row and is more specific, so it governs humans in this design; the mismatch is listed as OQ-W-01 rather than resolved.
- **`docs/design/PEOPLES.md:575` (PE11)** proposes different lifespans (for example elves 300-400, dwarves 150-180), which disagree with the SRD. PEOPLES.md predates DEC-013 and D-6 (section 5.3). This design uses the SRD.

### 1.4 Aging, elderhood and death without a per-tick scan

**Rule.** Age is never incremented. Each individual stores `birthTime` (integer game hours since the epoch). `age = (now - birthTime) / HOURS_PER_YEAR`, and `stage = lookup(species.stages, age)`. Under D-1 (b) `HOURS_PER_YEAR` = 24; under (a) it is 24 × `DAYS_PER_YEAR`. That constant is the only place D-1 enters the lifecycle.

**Due-date queue.** Each individual has at most one pending lifecycle event: its next stage boundary, its birth-giving date, or its natural-death date. Events sit in a **hierarchical timing wheel** keyed by due hour (buckets of 1 hour, 1 day, 1 season, 1 year, 1 decade; an event moves down a level when its bucket comes due). The slow clock services pop only the events that are due. Cost per game hour = O(events due), independent of population.

**Natural death.** At birth (or at promotion from a crowd, section 6), draw the natural-death age once from the species' lifespan distribution with a seeded RNG `(worldSeed, 'death', individualId)`. For humans the distribution is V123's curve (0% before 55; 6% at 55-57 … 80% at 76+, `docs/VISION.md:341`), turned into a cumulative table so one draw replaces yearly rolls. Other hazards (famine, disease, violence) can end life earlier through the hooks in section 9; they never have to scan.

**Elderhood.** The `elder` boundary is a stage event like any other; it changes derived work capacity and fertility (section 3.2). REP-5 (elder at 50 in `DEUS_Colonists.js:2807`, at 55 in `:3243`) disappears because both call sites read one table.

**Trigger and clock.** The `life` service subscribes to the ADR core's hour clock [ADR-003 PROPOSED; SIM.00.02]. Domain tag: `historical` for L2 closed-form resolution, `action` for L0 individuals (INV-SIM-02).

**Ledger.** Aging moves no matter by itself. Growth is fed by food (section 3.3).

**Memory and CPU (32 layers).** The `birthTime` field costs 4 bytes per individual. The queue holds one entry of 12 bytes (due hour u32, individual id u32, kind u8, padding) per individual: 20,000 named individuals need 240 KB. Assuming about 150 lifecycle events per 1,000 people per year (≈35 births, ≈35 deaths, ≈80 stage changes: 5 stages per 60-year life), 20,000 individuals make 3,000 events per sim-year. Under (b) that is 12.5 events per real second at ×1; under (a) with D = 336, 0.037 per second. Neither needs more than O(1) work per event. Layer count does not appear in either figure.

### 1.5 What reactivates and what is replaced (REP-1, REP-5)

| Today | Status | Recommendation |
|---|---|---|
| `progressAging` (`DEUS_Colonists.js:2799`) adds one year every 240 s to every faction person (`:2800` walks `allFactionPeople()`); called only from the legacy history loop (`DEUS_History.js:2383`) | DORMANT (REP-1) | **Replace** with section 1.4. Reactivating it as written would add a per-second walk of all people (NAT-003) and bake V123's 240 s year into the code. Keep its stage names and `updateAgeAppearance`. |
| `checkOldAgeMortality` (`DEUS_Colonists.js:2828`) | DORMANT | **Replace** by one seeded death-age draw; keep the V123 table as the human distribution (data). |
| `progressPregnancies` (`DEUS_Colonists.js:2540`), called only from `DEUS_History.js:2386` | DORMANT (REP-1) | **Replace** by a gestation due-date event (section 3.2). |
| Legacy second-by-second history loop (`DEUS_History.js:2370`, `for (let sec = 1; sec <= totalSeconds; sec++)`) | DORMANT | **Retire.** Its cost is O(seconds × people). Aged-world history (ADR-003 §14.3 Q6) runs the same life blocks in closed form. |
| Historical demographics `D.step` once per history year (`DEUS_History.js:391`) with species profiles (`DEUS_HistoricalDemographics.js:128-136`) | LIVE at New Game only | **Keep** as the deep-history driver, moved to read the catalog life blocks. INV-SIM-01 keeps a standard New Game at Year 0. |

## Lineage

### 2.1 What is recorded

**Rule.** Lineage is stored as **parent links only**. Everything else (siblings, cousins, descent lines) is derived by bounded queries. This is the same shape the code already writes at birth: `motherId`, `fatherId`, `familyId`, `lineageId`, `surname`, `generation`, `parents` (`DEUS_Colonists.js:2644-2650`). Households already carry `familyId` and `lineageId` (`UF_Households.js:78-114`), and incest rules already read parent links (`DEUS_Colonists.js:2974-2976`).

Records (all per-entity, allocated on demand, so they are sparse by construction):

| Record | Fields (bytes) | Held for |
|---|---|---|
| **Living person life block** | id u32, species u8, sex u8, flags u8, originKind u8, birthTime u32, motherId u32, fatherId u32, lineageId u32, householdId u32, bodyMass u32 (g), gestMass u32 (g, section 3), nextDue u32, genome 16 B: **56 bytes** | every tracked individual |
| **Ancestor stub** (dead person) | id u32, species u8, sex u8, causeOfDeath u8, flags u8 (`NOTABLE`, `HISTORY`), birthTime u32, deathTime u32, motherId u32, fatherId u32, lineageId u32, nameRef u32: **32 bytes** | dead people who still anchor a living person's kin within 3 generations, or who are notable |
| **Lineage summary** | lineageId u32, founderId u32, species u8, firstBirth u32, lastBirth u32, bornCount u32, diedCount u32, livingCount u32, maxGeneration u16, trait means 16 B, notable list (u32 each): **about 48 bytes + 4 per notable** | every lineage that has ever had a member |
| **Household** | kept in `UF_Households` records (`UF_Households.js:63`): id, members, home, familyId, lineageId | living households |

**Bounded kinship query.** `kin(id, depth ≤ 3)` walks parent links up to 3 generations and a `childrenOf` index down. The index is a `Map<parentId, childId[]>` held only for living people and live stubs; its size is the number of those records. It is rebuilt from saved parent links on load (a cache, INV: "save truth, rebuild caches").

### 2.2 Compaction of old lineages

**Rule.** When a person dies, a stub replaces the life block. A stub is **folded into its lineage summary** and freed when all hold:
1. no living person has it within 3 generations of ancestry (checked by walking *down* the `childrenOf` index from the stub, bounded at 3 levels), and
2. it is not flagged `NOTABLE` (holder of an office, a named deed, an artifact maker, a historical person with `data.historicalPersonId`, ADR-003 §7.5) or `HISTORY` (referenced by a chronicle or legend record).

**Trigger.** The check runs on the death of each person for their own ancestors (bounded: at most 2 + 4 + 8 = 14 stubs), on the decade clock for stubs queued by earlier deaths, never by scanning all stubs.

**What survives.** Counts, generation depth, trait means and the notable list stay in the summary forever. Individual non-notable ancestors older than 3 generations back from every living descendant are gone; this is an intended loss, and the history-born export (section 2.4) reads only notable stubs and summaries.

**Growth arithmetic.** Assume 20,000 tracked people and a crude birth rate of 35 per 1,000 per year (human `birthChance` 0.36 with 3-year spacing gives about this order).
- Without compaction: 700 stubs per year × 32 B = 22 KB per year, 2.2 MB per century, 22 MB per millennium.
- With compaction: live stubs are bounded by living people × ancestors within 3 generations. With shared ancestors that is about 6 per person (not 14): 20,000 × 6 × 32 B ≈ 3.8 MB, flat over time. Notable stubs: assume 1% of deaths, 7 per year × 32 B, 224 KB per millennium. Lineage summaries: bounded by lineages ever founded; with 5,000 households and splitting at marriage, order 10,000 × 48 B = 480 KB after a millennium.
- The steady state therefore scales with the **living** population, not with elapsed time.

### 2.3 Heritable traits

**People.** The genome is 16 bytes: 8 appearance genes (today only `skinTone` is inherited, `DEUS_Colonists.js:801`, by a coin flip between parents) and 8 trait genes, each a byte. Offspring gene = one parent's value chosen by a seeded draw, with a mutation chance per gene (data). What the trait genes mean (for example ability-score tendencies) is a SOC/personality decision (O2 `MIND-05`, unreviewed); this design reserves the bytes and the rule only. SRD ability scores stay SRD: racial increases come from the SRD race entry, never from genes (DEC-018 principle: SRD numbers are the baseline).

**Animals in buckets.** A herd record keeps a **trait mean vector** (4 bytes per trait, 4 traits: size, coat, temperament, fecundity) instead of per-animal genes. Newborns take the herd mean plus a seeded mutation drawn at promotion. On demotion, an individual's traits fold back into the herd mean weighted by count. Anonymous animals therefore conserve counts and trait means, not individual genomes; section 6 states this as the conservation contract.

**Cross-species offspring.** The SRD has two races that are themselves mixed-parent results (half-elf and half-orc). It does not define offspring for other pairs. Which pairs are fertile and what they produce is OQ-W-02; this design supports any answer with a data table `offspringOf[speciesA][speciesB] → species | null`.

### 2.4 Feed into history and the history-born character mode

- On each birth, death and marriage the `life` service emits one event (`life:born`, `life:died`, `life:paired`) with ids only. The chronicle (today capped at 400 events, `DEUS_History.js:869`, per O2) and future legend records subscribe; lifecycle does not store prose.
- The "history-born D&D character mode" is **not defined in any repository document** (O2 finding G8-6, its OQ-18; unreviewed). This design offers only the data it would read: a notable stub or living person, its lineage summary, its SRD race and class (`DEUS_History.js:493` assigns an SRD class to each materialised citizen, per O2). The mode itself is the Owner's.

## Reproduction and mass

### 3.1 Pairing and mating

**People.**
- Eligibility: `stage = adult` and inside the species' reproductive window (data, section 1.3), not already pregnant, not in a post-partum interval (`birthSpacing` from data).
- Pairing: today's pair-bond and mate jobs stay (`handleMated`, `DEUS_Colonists.js:2424`; the private-room guard `guardMateHandler`, `:2503`). Kin exclusion reads parent links (`:2974-2976`).
- **What changes:** conception chance no longer reads faction population. Today `conceptionChance(pop)` falls to 0 at 200 (`DEUS_Colonists.js:2314-2322`), `twinChance(pop)` (`:2324`) and `gestationSeconds(pop)` (`:2336`) also take the population, and the household gate defaults to "yes" when `UF.Households` is absent (`:2473`). The new chance is `fertility[species] × ageFactor × conditionFactor`, where `conditionFactor` comes from body condition (fed mass against target mass, section 3.3). That is how scarcity lowers births without a cap (DEC-014 §1).
- Households: the gate `canConceiveChild` (`UF_Households.js:957`) stays; when the Households module is missing the answer becomes "no" and a diagnostic, not "yes".

**Animals.** Individuals (L0/L1): a male and a female adult of the same species in the same herd, in the breeding season if the species has one (`life.breedingSeason`; blocked on SIM.50.06 and D-1, and with no season model the rule is "any time"). Buckets (L2): the expected conceptions per coarse step are `fertileFemales × rate × Δt`, resolved with an integer carry per bucket key so no randomness is needed and results are exact and deterministic.

### 3.2 Gestation, litters and spacing

| Parameter | People | Livestock and wildlife | Monsters |
|---|---|---|---|
| gestation (y) | 0.75 for the eight live-bearing races (SRD silent, zoology default; OQ-W-07); dragonborn: egg incubation (SRD says "hatching", no duration: OQ-W-07) | per species data (for example rat 0.06, wolf 0.17, deer 0.55, horse 0.93) | per species, `breeds` only |
| litter | 1; twin chance data (today 0.15/0.05/0 by population, `DEUS_Colonists.js:2324`; becomes a fixed species value) | per species `[min, max]` (rat 6-12, wolf 4-6, deer 1-2) | per species |
| birth spacing (y) | `birthSpacingYears` (`DEUS_HistoricalDemographics.js:128-136`) | per species | per species |

**Trigger.** Conception schedules one `birth` event at `now + gestation` in the due-date queue (section 1.4). No per-tick countdown (today `secondsLeft` is decremented every call, `DEUS_Colonists.js:2547`).

**Birth creates a newborn, not a two-year-old.** Today `giveBirth` builds the child at `age: 2`, stage `child` (`DEUS_Colonists.js:2640`). The new newborn has `birthTime = now` and stage `baby`/`newborn`/`egg`.

### 3.3 Young built from food eaten: the mass rule

**Rule (LIFE-001, REP-2, V140).** A creature's body is matter that came from food. Every gram of food eaten goes to exactly one of three places:
- `growth`: body mass (or gestating mass for a pregnant female),
- `waste`: droppings and urine, deposited into the region's soil-nutrient pool,
- `metabolism`: matter lost as breath and heat. This is a **named sink**, the biological counterpart of burning, which ADR-003 §7.9 already treats as a named sink.

For each meal `eaten = growth + waste + metabolism` holds exactly in integer grams (the remainder of the integer split goes to `waste`). The fractions are species data: growth is high for young, near zero for adults at target mass, and negative in starvation (body mass → metabolism sink).

**Daily intake baseline.** The SRD says a character "needs one pound of food per day" and can go without food for "3 + his or her Constitution modifier" days, then gains exhaustion (`game/data/srd51/rules.json:4403`); a character needs "one gallon of water per day, or two gallons per day if the weather is hot" (same entry). This design uses 1 lb (454 g) a day as the intake of a reference Medium humanoid of 150 lb (the only Medium average weight the SRD states, for dwarves). Other sizes scale by `(mass / 68,039 g)^0.75` (standard allometric scaling, not SRD; a tuning parameter). Water intake follows the SRD gallons the same way.

**Gestation mass.** While pregnant, a share of the mother's `growth` goes to `gestMass` (life block field). At birth, `gestMass` moves to the newborn's `bodyMass` (and splits across a litter); a placenta share goes to remains. If the mother starves, gestation lengthens by data rule, and below a threshold the pregnancy fails: `gestMass` moves to remains.

**Ledger entries** (`ledger.transform(from, to, family, grams, cause)`, [ADR-003 PROPOSED] §7.8 signature; families `organics` and `water` per ADR's Q-MASS list):

| Step | from → to | family | cause |
|---|---|---|---|
| eat | `item.food` (Q-ITEM) or `flora.forage` (Q-OBJ biomass) → `body.stomach` | organics | `eat:<species>` |
| digest | `body.stomach` → `body.tissue` / `body.gestation` / `soil.nutrient` / sink `metabolism` | organics | `digest` |
| drink | `fluid.water` (Q-WATER, Fluid authority **[D-4]**) or `item.water` → `body.water` | water | `drink` |
| excrete, sweat | `body.water` → `soil.moisture` or sink `evaporation` (the rain/evaporation pair) | water | `excrete` |
| birth | `body.gestation` (mother) → `body.tissue` (newborn) + `remains.organic` (placenta) | organics | `birth` |
| starve | `body.tissue` → sink `metabolism` | organics | `starve` |
| predation | `body.tissue` (prey) → `body.stomach` (predator) + `remains.organic` (carcass left) | organics | `predation` |
| death | `body.tissue` + `body.stomach` + `body.gestation` → `remains.organic` (+ `remains.bone`) ; `body.water` → `remains.organic` | organics, water | `death:<cause>` |
| decay (Lane R) | `remains.organic` → `soil.nutrient` + sink `metabolism` (decomposers' breath) ; `remains.bone` persists | organics | `decay:<stage>` |
| harvest (livestock) | `body.tissue` → `item.meat`, `item.hide`, `item.bone` (today's `yields`, for example deer `meat_raw 3, hide 1, bone 2`, catalog `:6261`) | organics | `butcher` |

**Nothing creates matter.** Birth has no source term; immigration moves people from another region's count (section 7); `created` bodies come from remains or items; `spawned` is the only source and it is a named, Owner-approved one. Ore never appears in any entry (LIFE-002): the only mineral-adjacent form is `remains.bone`, which is organic.

**Buckets.** For an L2 bucket the same entries are made once per coarse step with the bucket's totals: `Σ intake`, `Σ growth`, `Σ waste`, `Σ metabolism`, births and deaths as counts × masses. The bucket stores `bodyMassTotal` (u32 g, or u64 for large herds) and `gestMassTotal`, so the totals stay exact however individuals are later drawn (section 6.3).

### 3.4 Soil nutrient: where waste and remains go

There is no soil-nutrient field today (decay gap DEC-3). `soil` is a strata material (`DEUS_Levels.js:1006`) with no nutrient value. This design needs only a sparse pool:
- **Region pool** `nutrient[regionId, z]`: u32 grams, allocated on the first deposit, one entry per region-layer that ever received waste. Waste goes here, not to cells, so herds do not touch thousands of cells.
- **Cell pool** for remains: a hashed chunk map `(area, z, chunk32) → Map<cellIndex, grams>`, allocated only where remains decayed.
- Vegetation (SIM.50.04) draws from these pools later; that is its design, not this one.

Memory: at most 1,024 region-layer entries × 2 layers per region = 2,048 × 8 B ≈ 16 KB per area even if every region has waste; cell entries only where bodies lay.

### 3.5 Livestock specifics

Livestock is ABSENT in code. The design treats a domesticated animal as a wildlife species with `domestic: true` and an owner (faction or household). What changes:
- food comes from fodder items and grazing on owned land (ledger as above),
- breeding may be managed (a DEC-015 plan's occupation mix includes herders; SOC.10.02),
- harvest uses `butcher` above,
- SRD entries for beasts of burden exist (for example `srd:creature:draft-horse`, `game/data/srd51/creatures.json:37834`; goat `:42377`); their size and speed are SRD, their biology is data.

### 3.6 Interface assumptions for sibling lanes (unreviewed)

Lane R (SIM.40.05 decay) and Lane Q (SIM.40.01 support) have no deliverable on their branches (`d9766aa2`, `9103799e`). This design assumes:

| Assumption | Owner lane | What this design needs from it |
|---|---|---|
| IA-R1 | R | A call `decay.enqueueRemains(ref, {organicG, boneG}, cell, cause)` that takes over a corpse's matter and emits `remains.organic → soil.nutrient` transforms on its own slow clock. Today remains are a sprite removed after 12 game hours (`DEUS_Anim.js:1162`; `remainsHours: 12`, catalog `:9922`), leaving nothing. |
| IA-R2 | R | Bone persists as a durable relic stage (V138 "durable relics survive as buried discoveries"). |
| IA-R3 | R | Remains at L2 decay in closed form (ADR-003 §17.3), so this design never ticks corpses. |
| IA-Q1 | Q | Shelter capacity (section 4.4) reads enclosed and roofed cells; Lane Q's support model decides which roofs stand. Natural rock counts as enclosure (V128). |
| IA-Q2 | Q | Collapse events report crushed units through the violent-death hook in section 9 with `cause = collapse`. |

## Carrying capacity

### 4.1 Principle: limits are physical, never a number

DEC-014 §1 and V139 say there is no arbitrary ceiling on total population. Today there are three ceilings:
- conception stops at 200 people per faction (`DEUS_Colonists.js:2315`, and `:2886` in the dormant reproduction step),
- immigration stops at 180 (`DEUS_Colonists.js:3015-3027`, dormant),
- wildlife is capped at each area's starting count (`capFor`, `DEUS_Ecology.js:223-227`, with floors `PREY_FLOOR = 8` and `MONSTER_FLOOR = 2` at `:46-47`), and herds stop at the species' maximum herd size (`:691-692`).

All of them are removed (section 8). A population is instead limited by the physical supply of **food, water, shelter and space** in the region it lives in, and it is pushed back by **famine, disease and predation**. The equilibrium (the carrying capacity K) is an *outcome* measured by tests (section 11), not a parameter.

### 4.2 The region capacity record

**Data.** One record per region that holds population or food, allocated on demand [ADR-003 PROPOSED region grid]:

| Field | Meaning | Written by | Sparse form and size |
|---|---|---|---|
| `forageG` | edible plant biomass standing (g), by diet class (grass, browse, fungus, seeds) | vegetation (SIM.50.04) through ledger events; today plant objects (`objectDiffs`) | 4 × u32 |
| `storedFoodG` | food items in the region (Q-ITEM food types) | item events | u32 |
| `waterAccess` | wet cells reachable and wells/springs (count) | Fluid change feed **[D-4]** | u16 |
| `shelterSlots` | enclosed or roofed standable cells with enough headroom, per size class | strata and object change events (IA-Q1) | 4 × u16 |
| `walkable` | standable cells per layer of the slab | the V133 per-chunk walkability cache | 2 × u16 |
| `demandG` | food demand per day of everyone in the region | bucket and individual changes | u32 |
| `pressure` | last computed ratios (below) | the capacity service | 4 × u16 (fixed-point) |

About 48 bytes per record. At 32 layers an area has 1,024 regions (ADR-003 §5.1); even if every one held population it is 48 KB per area. In practice only regions with creatures or food have a record.

**Trigger.** The record is updated when an input changes (a meal, a harvest, a Fluid wet-cell change, a strata write via `levels:strataChanged` at `DEUS_Levels.js:1558`, a birth or death), by adding the delta. The **ratios** are recomputed only at the region's coarse step (ADR-003 §5.5 schedules only regions that hold state) or when an input changes by more than a threshold. There is no scan of cells: `walkable` and `shelterSlots` come from caches that V133 already requires to be maintained by mutation.

### 4.3 The four ratios

| Ratio | Formula | Effect when below 1 | SRD anchor |
|---|---|---|---|
| food ρF | (forage available to the region's diets + stored food) / (`demandG` × days to next step) | rations = ρF; body mass falls (section 3.3); fertility falls through `conditionFactor`; starvation hazard | "one pound of food per day"; "go without food for a number of days equal to 3 + … Constitution modifier (minimum 1)", then exhaustion (`game/data/srd51/rules.json:4403`; exhaustion `:10533`) |
| water ρW | water available / demand (SRD gallons by size and heat) | the SRD dehydration rule: half water → DC 15 Constitution save or one exhaustion level a day; less → one level automatically | same entry, `rules.json:4403` |
| shelter ρS | `shelterSlots` / (creatures that need shelter) | exposure hazard in cold or heat (reads SIM.50.06 temperature; today `DEUS_Environment.js` temperature per area) | none (SRD has extreme cold/heat rules in the same environment chapter; the hook passes them through, section 9) |
| space ρA | `walkable` × 25 ft² / Σ (creature count × space) | crowding: disease contact rate rises (section 4.5); movement slows | SRD size categories: Tiny 2½ × 2½ ft, Small and Medium 5 × 5 ft, Large 10 × 10 ft, Huge 15 × 15 ft (`game/data/srd51/rules.json:9005`) |

**Famine arithmetic from SRD numbers.** For a Medium humanoid with Constitution modifier 0: with no food, 3 days pass without effect, then one exhaustion level a day; exhaustion level 6 is death (SRD exhaustion table). Death therefore comes on day 9. On half rations each day counts as half a day without food (same SRD entry), so death comes on day 18. The bucket rule uses these numbers: the fraction of a bucket that dies of famine in a step is the fraction whose accumulated deficit days crossed `3 + Con + 6`, with Con from the species' SRD Constitution (people: 10 + racial increase; beasts: the creature's CON in `creatures.json`). Animals whose SRD entry has no age text still have a CON score, so the rule has an SRD anchor for every creature.

**Geometry of shelter (DEC-013).** A shelter slot for a creature needs headroom of its height in whole 2 ft slices: Small (3-4 ft, halfling, gnome) 2 slices; Medium up to 6 ft 3 slices; a 6-7 ft Medium (dragonborn "well over 6 feet") 4 slices; Large a full 10 ft layer on a 2 × 2 cell footprint. **Stale model:** under the code's 1 ft strata these would be 4, 6, 7 and 10 strata of a 5 ft level (so a Large creature needs two levels); the counts above assume WG.00.17 has landed.

### 4.4 Per layer and biome band

DEC-013 splits the 32 layers into five biome bands. Which biomes go in which band is OPEN (Owner), so the capacity inputs are keyed by **biome id**, never by band or layer number; the band only groups the table below. Home layer ranges of the races are OPEN too and are not used here (section 5).

| Band (DEC-013) | Layers | Main food supply for `forageG` | Water | Shelter | Gap today |
|---|---|---|---|---|---|
| Upper-2 (high sky, peaks) | +10..+15 | cliff and cloud-realm flora (biome data OPEN) | rain capture, snow (SIM.50.06) | caves in peaks, V128 natural rock | no flora or wildlife planned above +2 (`DEUS_Wildlife.js:526` plans only 0, -1, -2) |
| Upper-1 (low sky, towers, canopy) | +4..+9 | canopy fruit, nesting fliers | rain capture | canopy, towers | same |
| Surface | 0..+3 | grasses, browse, crops (no crop system loads: the farm hooks call an undefined `UF.Agriculture`, audit F-07) | rivers, lakes, rain | buildings, caves | crops ABSENT |
| Lower-1 (shallow underground) | -8..-1 | fungus and cave flora, prey arriving from above | seepage, springs (SIM.50.02) | natural rock everywhere (V128) | cave flora feeds nothing (O2 G10-5, G10-6: DEEP-04, DEEP-05; unreviewed) |
| Lower-2 (deep caverns) | -16..-9 | deep fungus, chemotrophic life (biome data OPEN) | aquifers | natural rock | same, and no light (O2 G10-2) |

Consequence: until an underground food web exists (DEEP-04/05), ρF underground is near zero for anything that does not eat meat brought down from above. Any race the Owner homes underground cannot sustain itself by this model until then. That is a dependency (section 12), not a reason to assign races to layers.

### 4.5 Limiting mechanisms and anti-snowball pressures

| Mechanism | Rule (bucket and individual alike) | Parameters and sources |
|---|---|---|
| **Famine** | section 4.3 SRD schedule; also lowers conception through `conditionFactor` (fed mass ÷ target mass) | SRD food and exhaustion rules; `conditionFactor` curve is tuning |
| **Thirst** | SRD water rule | SRD |
| **Disease (hook only)** | the capacity service publishes `density = Σ count / walkable` and `contactRate ∝ density × crowding`; the health package (SIM.50.11 follow-ups; O2 G6-1, HEALTH-03) turns it into infections | DEC-014 §4 "epidemic disease in dense settlements"; rate constants belong to the health design |
| **Predation** | predator buckets kill prey buckets in the same region by a saturating (Holling type II) rate: `kills = a × P × N / (1 + a × h × N)` per step, where `a` is attack rate and `h` handling time; kills move mass by the `predation` ledger entry | `a`, `h` per predator-prey pair are tuning data (not SRD); prey lists from the catalog's `kind` (`grazer`, `vermin`, `predator`, `flier`) |
| **Exposure** | shelter ratio × temperature below the species' tolerance → exhaustion or damage via the SRD extreme-cold and extreme-heat rules (hook, section 9) | SRD environment chapter; SIM.50.06 temperature |
| **Logistic strain** (anti-snowball, DEC-014 §4) | a faction's effective food in a region = local supply + imports − transport loss; loss grows with haul distance in regions, so a sprawling faction feeds its far settlements worse | loss per region hop is tuning; SOC.30 (economy) owns hauling |
| **Rebellion, succession crisis** (DEC-014 §4) | not designed here; lifecycle raises `life:died` for office holders (SOC.20.01 offices) and publishes region pressure, which the SOC rebellion model reads | SOC.20.x (O2 GOV-*, unreviewed) |

**No hidden ceiling test.** Section 11 test T-CAP-2 greps the life and capacity modules for numeric population comparisons, and a behaviour test doubles food and checks that population rises.

### 4.6 CPU class

The capacity service does O(1) work per input change (add a delta) and O(diets + species present) per region coarse step. With ADR-003's scheduling a tick visits at most ⌈R/100⌉ L2 regions (R = 1,024 at 32 layers, so at most 11) and on average (active L2 regions)/100. For 200 active populated regions per area that is 2 region steps per tick, each touching perhaps 10 species × 4 diets: about 80 multiply-adds per tick per area. Layer count enters only through R, and only regions with state are counted.

## Nine races and culture plans

### 5.1 The nine slots **[D-6]**

D-6 is a PM decision (the Owner may object): each of the nine SRD races gets its own culture/faction plan slot. DEC-013 §5 says "exactly 9 races"; DEC-015 says each of the 9 races follows an authored plan; SOC.10.03 wants 9 plan files in `game/data/plans/`. **This design does not create any plan file and does not assign any home layer range.**

| Slot | SRD entry | Catalog `people` | Catalog `cultures` | Size / weight (SRD) | Speed | Darkvision | SRD ability increase vs catalog `stats` |
|---|---|---|---|---|---|---|---|
| `human` | `character_options.json:525` | `DEUS_WorldCatalog.json:7307` | `:9308` "Settlers" | Medium, 5 to over 6 ft | 30 ft | none | SRD "each increase by 1"; catalog `stats: {}` (`:7322`) **differs** |
| `dwarf` | `:45` | `:7334` | `:9394` "Stone-holders" | Medium, 4-5 ft, about 150 lb | 25 ft | 60 ft | SRD Con +2; catalog adds `cha: -1` **not SRD** |
| `elf` | `:123` | `:7324` | `:9347` "Grove-keepers" | Medium, under 5 to over 6 ft | 30 ft | 60 ft | SRD Dex +2; catalog adds `con: -1` **not SRD** |
| `halfling` | `:197` | `:7354` | **none** | Small, about 3 ft, about 40 lb | 25 ft | none | Dex +2 (+ Lightfoot Cha +1); catalog matches |
| `dragonborn` | `:366` | `:7364` | **none** | Medium, well over 6 ft, almost 250 lb | 30 ft | none | Str +2, Cha +1; matches |
| `gnome` | `:626` | `:7344` | `:9442` "Tinkers" | Small, 3-4 ft, about 40 lb | 25 ft | 60 ft | SRD Int +2; catalog adds `str: -2` **not SRD** |
| `half-elf` | `:692` | `:7374` | **none** | Medium, 5-6 ft | 30 ft | 60 ft | Cha +2 and two of choice; catalog fixes Dex, Con (a legal choice) |
| `half-orc` | `:810` | `:7385` | **none** | Medium, 5 to well over 6 ft | 30 ft | 60 ft | Str +2, Con +1; matches |
| `tiefling` | `:882` | `:7395` | **none** | Medium, human size | 30 ft | 60 ft | Int +1, Cha +2; matches |

SRD line numbers are in `game/data/srd51/character_options.json`; catalog line numbers are in `game/data/DEUS_WorldCatalog.json`. The four catalog `stats` differences are a data defect for a later lane (section 8, D-08-17): SRD numbers are the baseline (DEC-018 principle, the BRIEF's rules bible).

### 5.2 Population-relevant SRD traits

- **Lifespan and maturity:** section 1.3. Long-lived races (elf, dwarf, gnome) have few births per adult-year (code `birthChance` 0.025 elf, 0.09 dwarf, 0.05 gnome against 0.36 human, `DEUS_HistoricalDemographics.js:128-133`), so they recover slowly from losses. That is a real anti-snowball force and needs no extra rule.
- **Size:** feeds intake (section 3.3), shelter headroom (section 4.3) and space. Small races eat about `(40/150)^0.75 ≈ 0.37` of a Medium ration by the allometric default.
- **Darkvision (60 ft = 12 cells):** six races have it (dwarf, elf, gnome, half-elf, half-orc, tiefling); human, halfling and dragonborn do not (O2 G10-3 notes dragonborn sits on the deepest level in the stale catalog map). Underground, a race without darkvision needs light to work; a later light model (O2 DEEP-01/03) feeds the capacity record as a `workable` factor. This matters for home ranges, which the Owner assigns.
- **Speed:** 25 ft races (dwarf, halfling, gnome) forage and haul over fewer cells per step; the logistics loss of section 4.5 reads speed.

### 5.3 Reconciling nine people species and seven cultures (PLAN-4)

The catalog has nine `people` species that match the SRD races exactly (`game/data/DEUS_WorldCatalog.json:7305-7405`) but seven `cultures` (`:9306`): `human`, `elf`, `dwarf`, `gnome`, `goblin`, `orc`, `automaton`.
- **Four** cultures match SRD races (human, elf, dwarf, gnome).
- **Five** SRD races have no culture: halfling, dragonborn, half-elf, half-orc, tiefling.
- **Three** cultures are not SRD races: `goblin`, `orc`, `automaton`. Goblin and orc exist in the SRD as creatures (`srd:creature:goblin`, `srd:creature:orc`), not as playable races. `automaton` has no SRD entry.
- **Source of the three:** `docs/design/PEOPLES.md:5` records a user decision of 2026-09-19 for eleven factions (Lizardfolk, Dwarves, Elves, Goblins, Gnomes, Humans, Orcs, Kobold, Undead, a tech race, a swarm race). DEC-013 (2026-09-26) later fixed "exactly 9 races", and D-6 picks the nine SRD races. The three extra cultures and PEOPLES.md's eleven are therefore a pre-DEC-013 state.

**Proposal [D-6].** Nine plan slots named after the nine SRD race ids. Each slot has a culture record (five are new stubs; their names, lore and values are Owner TODO per DEC-015 §4). The three non-SRD cultures are **not deleted**: they move to a separate `nonRacePeoples` list that the later lane keeps loading (for monsters-as-societies, if the Owner wants them), outside the nine race slots. OQ-W-04 asks the Owner to confirm or change this.

### 5.4 Home layer ranges stay OPEN

DEC-013 §5 gives each race "one native home layer range", and the race-to-range mapping is an open Owner sub-question. The catalog already contains a placement map `factions.layers` (`game/data/DEUS_WorldCatalog.json:7413-7429`): layer 0 human, elf, halfling, half-elf, half-orc; layer -1 dwarf, gnome; layer -2 tiefling, dragonborn. It predates DEC-013 (it uses the 5-level range). **This design treats it as a stale stand-in, not an Owner assignment,** and every rule here takes a race's home range as data (`plan.homeRange = OPEN`) that WG.62.02 fills after the Owner rules. Soft boundaries (DEC-013 §6) mean the capacity model and migration apply the same rules on every layer.

### 5.5 Links to the DEC-015 plan schema (SOC.10.02-03)

A plan slot reads population state through five named inputs. They are listed so SOC.10.02's schema can reference them by name:

| Plan input | Read from | Used by plan component (DEC-015 §3) |
|---|---|---|
| `pop.total[faction]` | Q-FACTPOP counter (ADR-003 §7.8; today `DEUS_Factions.js:194`, kept by events at `:594-625`) | settlement stage thresholds |
| `pop.byIdentity[faction][craft][civicOffice][class][obligation]` | crowd buckets + tracked individuals (section 6) | class and occupation mix; levies (DEC-014 §3) |
| `pop.ageStructure[faction][ageBand]` | same | labour and levy capacity |
| `region.pressure[regionId]` | the capacity record (section 4.2) | build-order mode (peace / threat / famine); expansion trigger |
| `life.events` (`life:died` for office holders, famine and epidemic flags) | lifecycle hooks (section 9) | failure modes, succession |

Stages beyond town (SET-3, PLAN-3) and the plan files themselves are SOC.10.02-03's work.

## Population LOD

### 6.1 Three kinds of population record [ADR-003 PROPOSED]

| Kind | Who | Record | Steps |
|---|---|---|---|
| **Individual, fine** | tracked units in L0/L1 regions (ADR-003 §7.5: people, named, owned, carrying items, wounded, referenced) | full unit record + life block (section 2.1) | L0 every tick, L1 every 10 ticks |
| **Individual, abstract** | tracked units in L2 regions | ADR's abstract record `{cell, goal, remainingCost, needs}` + life block | the L2 coarse step; lifecycle events by due date |
| **Crowd bucket** | anonymous creatures in L2 regions; and people beyond the individual budget **if the Owner adopts people crowd LOD** (ADR-003 Q14; DEC-014 §2 PM default) | per region: sorted array of `(key, count, bodyMassG, gestMassG, carry)` | the L2 coarse step (closed form) |

### 6.2 Bucket keys (sparse)

- **Wildlife, monsters, livestock:** key = (species u8, ageBand u8, sex u8, layerInSlab u8). ADR-003 §6 names `count[species][ageBand][sex]`; this design adds the layer within the 2-layer slab so cross-layer counts are kept (the ADR's natural-connections row requires the "bucket z-distribution within a slab" to be kept).
- **People (only if adopted):** key = (species, ageBand, sex, layerInSlab, faction u16, craft u8, civicOffice u8, class u8, obligation u8). These are DEC-014 §3's axes plus faction. The key space is large but only non-zero keys are stored.
- **Lineage for people buckets:** each people bucket has a small table `lineageId → count`, capped at the 8 largest lineages plus an `other` residual count. On promotion an individual draws a lineage from this table without replacement; on demotion it adds back. Lineages in the residual are drawn as "unrecorded lineage of this faction", which the Owner may consider an acceptable loss (listed in OQ-W-05).

Entry size: 8 bytes key + 2 count + 8 body mass (u64 for big herds) + 4 gestation mass + 2 carry = 24 bytes. A wildlife region with 5 species × 3 age bands × 2 sexes × 2 layers = 60 keys is 1.4 KB. Dense ADR arrays for 23 species × 4 bands × 2 sexes × 2 bytes would be 368 bytes per region **without** mass; the sparse array is chosen because mass totals are needed for LIFE-001 and most regions hold few species.

### 6.3 Promotion and demotion that conserve counts, mass and lineage

**Promotion (L2 → L1).** For each bucket key, materialise `count` anonymous individuals:
1. RNG = `(worldSeed, regionId, promotionSerial, key)`; same seed and state give identical individuals (DEC-012 §2).
2. Age: drawn uniformly inside the age band; `birthTime = now − age`.
3. Mass: each gets the species' nominal mass for its age; the bucket's residual `bodyMassG − Σ nominal` is split evenly, remainder to the last individual. Σ equals the bucket total exactly. Gestation mass goes to pregnant females the same way (the number of pregnant females is `gestMassG > 0 ? ceil(gestMassG / nominalFetusMass) : 0`, capped by adult females).
4. Death dates and next stage events are drawn as at birth (section 1.4).
5. Placement uses habitat rules; terrain is re-checked (ADR-003 §7.3).
6. People: lineage drawn from the lineage table; household ties are **not** invented (households belong only to tracked individuals).

**Demotion (L1 → L2).** Only anonymous units demote (ADR-003 §7.5). Each adds 1 to its key's count, its mass to `bodyMassG`, its gestation mass to `gestMassG`, its lineage to the lineage table, and its traits to the herd mean. Its unit ID is retired with reason `ABSORBED` (ADR-003 Q-UNITID).

**Conserved on every transition** (checked by the tests in section 11):

| Quantity | Exact? | ADR-003 id |
|---|---|---|
| count per (species, ageBand, sex, layer) | yes | Q-POP |
| tracked individual id set | yes | Q-TRACKED |
| faction population = tracked + bucket members | yes | Q-FACTPOP |
| body mass and gestation mass per region | yes, to the gram | Q-MASS[organics] form `body.*` |
| lineage counts per people bucket (8 named + residual) | yes | new: Q-LINEAGE (proposed) |
| exact ages of anonymous individuals | **no**, by design; re-drawn within the band | — |
| individual animal genomes | **no**, by design; herd trait means are kept | — |

### 6.4 Livestock: owned herds

ADR-003 §7.5 makes every owned or tamed animal tracked. A village with 300 sheep would then hold 300 tracked individuals forever. **Proposal (flag for the ADR owner):** an owned animal is tracked only if it is named, carries a rider or load, is wounded, or is referenced by a job. Other owned animals are counted in an **owned-herd bucket**, a crowd bucket with an `ownerId` (faction or household) in its key. Ownership is then conserved as a count. This is an amendment to a PROPOSED ADR, so it is listed as PROPOSED-W-05 and not assumed by the rest of this design.

### 6.5 The individual budget (DEC-014 §2)

DEC-014 §2 sizes the budget by post-split benchmarks, which do not exist yet (ADR-003 §9.2 is PENDING-K3). The budget is therefore **two parameters**, not a number:
- `N_FINE`: tracked individuals allowed at L0/L1 at once. ADR-003 §5.4's `MAX_L0 = 64` regions already bounds it spatially.
- `N_NAMED`: all tracked individuals in the world (fine + abstract).

Arithmetic to show the orders of magnitude (assumptions labelled, nothing measured):
- *Memory.* A fine person today carries needs, facets, skills, thoughts and up to 16 bonds (`DEUS_Colonists.js:2530`). Assume 2 KB. An abstract record plus life block is about 56 + 64 = 120 bytes of typed data; assume 200 bytes with a name. 2,000 fine people = 4 MB; 50,000 abstract = 10 MB.
- *CPU.* Assume a fine person costs 2 µs per tick and the population share of a 100 ms tick (10 Hz) is 2 ms. Then `N_FINE` ≈ 1,000 at L0, or ≈ 10,000 at L1 (one step per 10 ticks). An abstract person costs O(1) per coarse step (every 100 ticks), so 50,000 abstract individuals cost 500 record updates per tick.
- *Crowd.* One million anonymous people in buckets across 2,000 populated regions at 40 keys each is 80,000 entries × (24 + lineage table 36) bytes ≈ 4.8 MB, and 80,000 / 100 = 800 key updates per tick.

The real values replace these assumptions when SIM.30.04's benchmark exists. How many named individuals the Owner wants the world to hold is a separate design choice (OQ-W-03).

**What `DEUS_History.js:481-518` does today** is the opposite of a budget: every living historical person becomes a full unit at New Game (REP-4). Under this design the history materialiser promotes only notable persons and the people in regions at L0/L1 at start; the rest enter buckets (people crowd LOD permitting) or stay abstract.

### 6.6 Promotion to named roles

DEC-014 §2 promotes crowd members "when entering the player's focus bubble, becoming leaders, heroes, or soldiers in formed armies". Beyond focus, promotion is triggered by **events** only: a plan assigns an office (SOC.20.01), a levy forms an army (DEC-014 §3 obligation level), or a history record names a person. Each promotion takes one individual out of a bucket with the section 6.3 rules and marks it `NOTABLE` if the role is lasting.

## Migration dependencies

SIM.50.07 (animal migration and herds) and people migration (refugees, settlers) need these first. "Blocked" means the named row cannot pass its acceptance without it.

| # | Dependency | Why | Row that provides it | Status |
|---|---|---|---|---|
| M-1 | **A movement model for all units** | Wildlife has no wander, graze or flee in live play: the AI loop is removed (`DEUS_Wildlife.js:1197`; `tick` defined at `:1158`, never called), spawned animals get `ai: null` (`:543`), and off-screen units move only with a goal (`DEUS_World.js:1809`). Migration is movement with a destination; without movement there is none (MIG-1). | SIM.00.04 (one movement model, [ADR-003 PROPOSED]) | blocked |
| M-2 | **A herd entity** with range, season and route | A herd is only an integer on each unit (`DEUS_Wildlife.js:546`) and a home cell (`:314`) (MIG-2) | PROPOSED-W-03 (herd records, section 12) | blocked |
| M-3 | **Seasons** | Seasonal travel needs a season; today "seasons" are quarters of one day (audit F-06) and `time:season` has no listener. SIM.50.06 cannot start before the Owner rules D-1 (MIG-3) | SIM.50.06, **D-1 OWNER_OPEN** | blocked on the Owner |
| M-4 | **LOD regions** | Off-camera herds move as bucket counts between adjacent L2 regions by a deterministic rule (ADR-003 §6 wildlife row); needs the region grid (MIG-4) | SIM.30.01, SIM.30.02 | blocked |
| M-5 | **Carrying-capacity pressure** | The destination is chosen by pressure: a herd leaves a region when ρF or ρW falls below a species threshold and goes to the neighbour with the best forecast ratios | this design (section 4), PROPOSED-W-04 | designed here |
| M-6 | **Cross-layer travel under soft home ranges** | DEC-013 §6: races and animals may travel across all layers. The engine can move a unit between levels (`World.moveUnitToLevel`, `DEUS_World.js:1550`), but wildlife never calls it, and herds are planned only for 0, -1, -2 (`DEUS_Wildlife.js:526`) with a hardcoded cave species list (`:454`, MIG-5). A bucket crossing a slab border is a border crossing (ADR-003 §7.7); natural connections give the edges | WG.00.17 (32 layers), SIM.00.04, WG.62.02 (home ranges, **OPEN**) | blocked |
| M-7 | **Refugees** | A settlement that contracts under famine, war or disease sends people away; today nothing contracts (SET-1) and the live planner only grows | SIM.50.09, DEC-015 failure modes (SOC.10.02) | blocked |
| M-8 | **Settlement founding** | Refugees or surplus people found a site where pressure is low; DEC-015's expansion rules decide where. Today every history site must exist from the start year (`DEUS_HistoricalDemographics.js:311`) and ruins block building (`DEUS_Colonists.js:3733`, SET-4) | SIM.50.09, SOC.10.02, SIM.40.08 (ruin stages) | blocked |
| M-9 | **Immigration without creation** | Today `spawnImmigrants` (`DEUS_Colonists.js:3029`, called from `stepImmigration` at `:3141`, which only the dormant history loop calls, `DEUS_History.js:2426`) creates people from nothing. Under LIFE-001 an immigrant must leave a count somewhere else: another region's bucket, or an off-map pool that is an explicit, logged source | this design (section 3.3); the off-map pool is OQ-W-08 | designed; the pool needs the Owner |
| M-10 | **Mass ledger** | Every move is a transfer of `body.*` mass between regions, which the ledger must accept as a location change, not a transform | WG.65.15 | blocked |

**Migration rule sketch (for SIM.50.07, not a design of it).** At a region's coarse step, a herd or people bucket whose pressure is below its species threshold moves a fraction of its count to the adjacent region (same slab, or across a connection to another slab) with the best forecast ratios. The counts and masses move exactly (section 6.3 fields), and the move is logged as a location change. At L0/L1 the same decision becomes a movement goal for each individual (M-1).
