# People-Side Gap Audit (SIM.50.11)

| | |
|---|---|
| Task | SIM.50.11, People-side gap audit. The ID is proposed in the brief; the coordinator records it in the WBS. Lane O2, brief `tasks/SIM.50.11/gap-audit-people/BRIEF.md`. Follow-up to SIM.50.01 (living-world gap audit, merged `4614dbfa`). |
| Writer / reviewer | Claude (writer). Grok is the independent reviewer, launched later by the PM. This document certifies nothing. |
| Date | 2026-09-26 |
| Base commit | `790387090083848959ce0b95bc560a395336fa3d` (origin/main at launch). `git rev-parse HEAD` when the audit started was `6c0a80083e52323f1e54660574137d76b177172e`. The branch adds only files under `tasks/SIM.50.11/` (the `git diff --name-only` output is in `REPORT.md`), so every `game/` and `docs/` line cited here reads the same at the base and at HEAD. The WBS at the base is already Rev 25 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:4`). |
| Kind of work | Planning audit, docs only. No file in `game/`, `tools/` or `docs/` was changed. No art was requested, made or described as something to generate (DEC-007). |
| Inputs read | `docs/worldgen/DEUS_WORLDGEN_WBS.md` (Rev 25), `docs/society/DEUS_SOCIETY_WBS.md` (Rev 3), `docs/art/DEUS_WORLD_WBS.md` (presentation rows only), `docs/WORK_QUEUE.md` (WB-002), `docs/SLICES.md`, `docs/OWNER_DECISIONS.md` (DEC-001..DEC-022), `docs/VISION.md` (V-rows, open questions, decision log V143..V151), `docs/INVARIANT_REGISTRY.md`, `docs/RISK_REGISTER.md`, `docs/PERFORMANCE_ARCHITECTURE.md`, `docs/adr/` (ADR-001, ADR-002; ADR-003 is not on the base, see Limits), `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md`, `docs/design/` (PERSONALITY, EMERGENT_SOCIETY, CHAIN_OF_COMMAND, AUTONOMOUS_CIVILIZATION, DF_GAP_MAP, TECH_TREE, THEME, PEOPLES, VERTICAL_NATURAL_WORLD), `docs/worldgen/DEUS_CREATURE_ECOLOGY.md`, `docs/systems/` pages for the plugins below, `docs/SRD5_1_COVERAGE_MANIFEST.md`, the SRD 5.1 catalogue in `game/data/srd51/` (rules, creatures, character_options, spells, equipment), `docs/audits/LIVING_WORLD_GAP_AUDIT.md` and its review `tasks/SIM.50.01/gap-audit/review_grok_1953c0a5.md`. Code, read only: every plugin named in the brief plus `DEUS_Talk`, `DEUS_Sheet`, `DEUS_Stance`, `DEUS_Select`, `DEUS_Minimap`, `DEUS_Ownership`, `DEUS_Containers`, `DEUS_Stockpiles`, `DEUS_Jobs`, `DEUS_Items`, `DEUS_World`, `DEUS_Environment`, `DEUS_Ecology`, `DEUS_DayNight`, `DEUS_Fog`, `DEUS_Fire`, `DEUS_NaturalConnections`, `DEUS_Dnd5e`, `DEUS_Core`. |
| Unreviewed inputs | Lane P's SRD spell-effect audit, read with `git show origin/task/lane-p:<path>` at `c9d1ed864cbd1ca0d6f5249e2607e2c833830f01` (unreviewed). Lane M's ADR-003 Rev 3 draft, read with `git show origin/task/lane-m:docs/adr/ADR-003_sim_render_split_and_lod.md` at `2e32f5968f7ed1178ca41602bf74550e4338fff5` (unreviewed, not on the base). Both are used only for assumptions and cross-references, and every use says so. |

## 0. How to read this audit

- **Rating (planning, not code).** Each area is split into sub-elements (listed in its coverage table). A sub-element is **covered** when a WBS row's own scope text names it, and **nominally covered** when only the row's cited source (for example a `docs/SLICES.md` slice) names it, with no scope or definition of done.
  - **FULLY PLANNED**: every sub-element is covered.
  - **PARTLY PLANNED**: at least one sub-element is covered or nominally covered, and at least one is not.
  - **MISSING**: no WBS row covers any sub-element. VISION rows, design documents and DEC entries alone do not count as planning; they are listed as requirements.
- **Code today** (secondary column), as in SIM.50.01: **PRESENT** runs in the live game; **PARTIAL** some of it runs live; **DORMANT** code exists but live play never reaches it; **ABSENT** no code.
- **Severity** follows AGENTS.md: **BLOCKER** means no planned leaf can meet a binding VISION/DEC requirement for this area, or the area cannot work at all without it; **MAJOR** means a VISION or DEC requirement has no leaf, or a leaf is much larger than its row says; **MINOR** is a local defect or documentation gap.
- **Citations.** Code claims cite `file:line` at the base commit. A bare plugin name (`DEUS_Colonists.js:5111`) means `game/js/plugins/`. Planning claims cite a WBS ID, a DEC ID or a V row, usually with the line in the WBS or VISION file. In an evidence table whose first two columns are a citation and a code excerpt, the excerpt is copied verbatim from that line (`\|` in a table is a literal `|`). `node tasks/SIM.50.01/gap-audit/verify_citations.js --commit 790387090083848959ce0b95bc560a395336fa3d --doc tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md` checks every citation and excerpt against the base; its output is in `REPORT.md`.
- **Proposed IDs** are written `PROPOSED-<AREA>-NN` (MIND, GOV, WAR, CUL, KNOW, HEALTH, LOG, REC, MODE, DEEP). None is a minted WBS ID. The coordinator mints IDs, not this audit.
- **Tick cost** uses one cost model (section 2.5): per-tick CPU at the 10 Hz fixed tick (DEC-012), memory per named person, per settlement and per layer, at 32 layers with sparse storage (DEC-013 §3). Every per-operation cost is an assumption, not a measurement, and is written as such. No frame rate is claimed.
- **Owner questions** (section 6) are listed with options and are never answered here. Overlord mode is flagged, not designed.

## 1. Summary

### 1.1 The ten areas

| # | Area | Rating (WBS) | WBS rows that cover part of it | Code today | Biggest gap | Priority |
|---|---|---|---|---|---|---|
| 1 | Individual minds | PARTLY PLANNED | SOC.13.01, WB-002, SIM.00.05 (vital needs); GP.08.01 (moods, relationships, nominal); SIM.40.10 (heritable traits, nominal); SOC.51.01 | PARTIAL | No row plans the event → memory → mood → behaviour loop, relationships, opinions, personality, goals or breaks. In code, mood was wiped on 2026-09-22 and thoughts change nothing (`DEUS_Colonists.js:5111`) | 1 |
| 2 | Government, law, crime, succession | PARTLY PLANNED | SOC.20.01, SOC.21.01, SOC.22.01-.02, SOC.23.01-.03, SOC.33.01, SOC.50.01 | PARTIAL | Law, crime, justice, legitimacy and rebellion have no row (DEC-014 §4 needs rebellions); a dead leader is never replaced in play (`DEUS_Talk.js:672`) | 4 |
| 3 | Diplomacy and war | PARTLY PLANNED | SOC.40.01-.02, SOC.41.01, SOC.42.01, GP.07.01-.02, GP.08.01, WG.62.02, SIM.50.09 | PARTIAL | Relations never change after New Game (`DEUS_Factions.js:546` has only test callers) and no row plans diplomacy (GP.08.01 says "diplomacy has no leaf, Gap 16") or offensive war | 6 |
| 4 | Culture and religion | PARTLY PLANNED | SOC.10.02, SOC.10.03, WG.63.05, WG.63.06 | PARTIAL (religion ABSENT) | No row for belief, religion, rituals, festivals, taboos, funerals or languages | 10 |
| 5 | Knowledge and technology | PARTLY PLANNED | SOC.10.02, SOC.11.01, SOC.12.01, WG.65.17 | PARTIAL | No row for discovery, diffusion or loss; the tech tree is not built (`DEUS_Select.js:924`, `docs/design/TECH_TREE.md:3`) and two designs say unlocks never lock again | 8 |
| 6 | Health | PARTLY PLANNED | SOC.13.01, WB-002, SIM.20.01, SIM.40.10, GP.07.01 (wounds, nominal) | PARTIAL | No row for disease, contagion or epidemics (DEC-014 §4), poison, healers or conditions; the conditions engine's `tick` has no caller (`DEUS_Conditions.js:1117`) | 2 |
| 7 | Travel and logistics | PARTLY PLANNED | SIM.50.08, WG.00.19, WG.00.20, SIM.00.04, SOC.30.02, SOC.32.01, SOC.33.01, WG.62.02, SIM.30.02 | PARTIAL | No row for caravans, trade routes, off-screen travel between settlements, pack animals or supply; live hauling and autonomous jobs never cross a layer (`DEUS_Jobs.js:1412`) | 5 |
| 8 | Records and legends | PARTLY PLANNED | SOC.51.01, SIM.10.01, WG.63.06, WG.65.16, WG.65.17, SIM.40.08, SIM.50.09 | PARTIAL | No world event log, renown, artifact provenance or legends; the chronicle keeps 400 events (`DEUS_History.js:869`); the history-born character mode is defined nowhere | 7 |
| 9 | The player's role per mode | PARTLY PLANNED | WG.00.11, SOC.50.01, SIM.00.03, GP.07.01 (nominal) | PARTIAL | WG.00.11 is a one-line row and OD-16 / VISION Q4 are open; **Overlord mode is not mentioned in any repository document** (flagged, not designed) | 9 |
| 10 | Underground life | PARTLY PLANNED | WG.64.01, WG.64.06, WG.66.01, WG.66.03, WG.68.07-.10, WG.62.02, SIM.50.02 | PARTIAL | No row for a simulation light field, darkvision, light fuel, cave flora succession or underground farming; darkness changes nothing in the simulation, and pools on the deepest level are always lava (`DEUS_Levels.js:1038`) | 3 |

No area is FULLY PLANNED and none is MISSING under the rule in section 0. The ratings hide a large difference in depth. For individual minds, one of eleven sub-elements is covered by a row's own scope text; for government, five of twelve.

### 1.2 Counts

| Item | Count |
|---|---|
| Areas rated | 10 |
| Gaps | 58 (BLOCKER 7, MAJOR 37, MINOR 14) |
| Proposed packages | 57 |
| Owner questions | 26 |
| Documentation mismatches (section 7) | 12 |
| Defects found in passing (section 8) | 8 |

The per-area numbers are in the section of each area and in `people_gap_table.json`.

### 1.3 Findings that decide the order of work

| ID | Severity | Finding | Section |
|---|---|---|---|
| P-01 | BLOCKER | The loop that makes DF/RimWorld stories (an event becomes a memory, memories set mood, mood changes behaviour) has no WBS row. In code the thought log fills from real events, but mood was removed on 2026-09-22 and nothing reads thoughts except one Talk line. | 3.1 |
| P-02 | BLOCKER | Every people-side process that should run during play (aging, pregnancy progress, grief, succession, disease deaths) lives in history code that runs only before play, and only when the New Game start year is above 1. The default start year is 0, so a default game runs none of it, and `time:year` has no listener. | 2.2 |
| P-03 | BLOCKER | Relations between factions are rolled once and never change in play; NPC factions cannot fight each other because combat sides are measured against the player. V18 and DEC-014's anti-snowball pressures cannot happen. | 3.3 |
| P-04 | MAJOR | DEC-014's anti-snowball pressures (rebellions, epidemics, logistical strain, succession crises) are an Owner decision with no WBS row for any of the four. | 3.2, 3.6, 3.7 |
| P-05 | MAJOR | 208 of the 319 SRD spells in Lane P's unreviewed classification have no physical effect (`NONE`). 21 of those act on minds, 48 on conditions and stats, 8 heal and 6 communicate. SIM.60.02's schema covers physical primitives only, so these spells need the people-side models audited here, and no row links them. | 4.2 |
| P-06 | MAJOR | Four of the nine races start below the surface in code (dwarf and gnome on −1, tiefling and dragonborn on −2), but underground darkness changes nothing, there is no farming, and the only natural pools on −2 are lava. Year-0 viability for those factions (WG.90.01) is not planned for. | 3.10 |
| P-07 | MAJOR | The crowd-LOD summary in SIM.30.01 holds population by species and age band only. DEC-014 adds the three identity axes and obligation. No summary field holds mood, relationships, health or knowledge, so promotion to a named individual would produce a blank mind. | 2.4 |

## 2. Shared foundation

### 2.1 How the people modules load

Five people-side modules are not in `game/js/plugins.js`. `DEUS_Core` loads them itself with Node `require()`:

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_Core.js:74` | `const companionPlugins = [` | The companion list: Containers, Stockpiles, Fluid, Conditions, Select, Dnd5e, Callings, HistoricalDemographics, DeathForensics, UF_Households. |
| `DEUS_Core.js:98` | `require(p);` | Loaded as Node modules; the return value is discarded. |
| `DEUS_Conditions.js:65` | `const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});` | Conditions binds to `window` if the module can see it, otherwise to Node's `global`. |
| `UF_Households.js:1022` | `const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});` | Households uses the same pattern. |
| `DEUS_History.js:205` | `PluginManager.loadScript(` | History loads HistoricalDemographics and Callings again as classic scripts, which bind to `window`. |

SIM.50.01 showed with a Node probe that `DEUS_Fluid` (which uses `var UF = UF || {}`) stays unbound under `require()`. The modules above use a different pattern: they bind to `window` when a `window` global is visible inside the module. Whether it is visible inside a Node module under NW.js was **not checked** here (no NW.js run, no probe). The code-today notes below assume these modules are live where the survey traced a live caller; if NW.js hides `window` from `require()`d modules, Conditions and Households would bind to Node's `global` instead, and every "LIVE" note for them would need rechecking in F5.

### 2.2 Year 0 and the history code that never runs in play

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_History.js:371` | `const steps = targetYear <= 1 ? 0 : targetYear;` | History runs one demographic step per year before play, and none when the start year is 0 or 1. |
| `DEUS_History.js:3405` | `if (state.history.demographics) {` | The `world:created` handler returns here, so `iterateWorldHistory` (line 3422) is never reached on the default path. |
| `DEUS_History.js:2383` | `progressAging(1);` | Aging, pregnancy progress and grief are called only from `iterateWorldHistory`. |
| `DEUS_Core.js:345` | `UF.Events.emit("time:year", this.year);` | The yearly event has no listener in `game/js`, so nothing ages, succeeds or falls ill year by year in play. |
| `game/data/DEUS_WorldCatalog.json:7670` | `"simulate": false,` | The older generator with wars, plagues and ruins (`simulate()`) is switched off. |

WG.00.14 (Year-0 contract, INV-SIM-01) and V134 require history to emerge from live simulation. That makes P-02 a blocker for areas 1, 2, 6 and 8: the people processes exist only on a path that the Year-0 rule itself switches off. SIM.10.01 (history and population, DONE-unverified) and SIM.10.02 (simulate-forward as a dev tool) cover the pre-game path, not a live yearly or daily tick. SIM.40.10 plans a shared lifecycle system that would replace it.

### 2.3 Time scale

Minds, health and culture all need durations: how long a memory lasts, how long a disease runs, when a festival falls. The live calendar advances one year per day/night cycle:

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_Core.js:324` | `this.year++; // 1 day/night cycle per year` | V123's compressed year (SIM.50.01 section 2.5). |

VISION Q11 ("how long should a year, a pregnancy, and a childhood be in real play time?", `docs/VISION.md:167`) is open. SIM.50.01 raised the same question for seasons (its D-3). This audit states every duration in ticks of the 10 Hz core (section 2.5) and does not pick a calendar; Owner question OQ-03 records the dependency.

### 2.4 Crowd LOD and the population budget

DEC-014 (OPEN, PM defaults) has no population cap, a named-individual budget "sized by post-split simulation performance benchmarks", crowd counts beyond it, and promotion to individuals "when entering the player's focus bubble, becoming leaders, heroes, or soldiers in formed armies" (`docs/OWNER_DECISIONS.md:205`). Crowd counts keep the three identity axes plus an obligation level (`docs/OWNER_DECISIONS.md:206`).

SIM.30.01's summary schema lists "population by species and age band, resources by type, water volume per basin and Z, fire and fuel, history counters" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:529`). SIM.30.03's test 3 says "Named units and history persons are never lost or duplicated" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:531`). Nothing in either row keeps a person's mind, health, beliefs, knowledge or relationships through a demotion, or says what a promoted person's mind is built from. Each area below has a crowd-LOD line in its package outline for that reason.

### 2.5 Cost model and assumptions (used by every "tick cost" line)

| # | Assumption | Source |
|---|---|---|
| A-1 | One fixed tick at 10 Hz at 1x speed. | DEC-012 §1 (`docs/OWNER_DECISIONS.md:166`) |
| A-2 | 1 tick = 36 game-seconds; 100 ticks = 1 game hour; 2,400 ticks = 1 game day. LOD levels: L0 full every tick, L1 near every 10 ticks, L2 summary every 100 ticks. Region = 32 × 32 cells × a 2-layer slab, so 16 slabs and 1,024 regions per 256 × 256 area at 32 layers. | ADR-003 Rev 3 draft §0 (unreviewed, `origin/task/lane-m` `2e32f596`) |
| A-3 | Whole-simulation CPU budget: 4.50 ms per 16.67 ms frame, which is 270 ms of simulation CPU per real second. Per tick: 27 ms at 1x and 3.4 ms at 8x (80 ticks per second). This audit compares every estimate with the 8x figure, the tighter one. | `docs/PERFORMANCE_ARCHITECTURE.md:308` (frame budget §17) |
| A-4 | Named individuals N = 1,000 (the "1,000+ creature" planning point), split L0 = 150, L1 = 350, L2 = 500. Crowd P = 100,000 anonymous people in S = 200 settlements, K = 40 cohorts per settlement (5 age bands × 8 craft groups). These are planning points, not targets; DEC-014 leaves the budget to benchmarks. Year 0 has 72 founders (SOC principle 3). | `docs/PERFORMANCE_ARCHITECTURE.md:360`; DEC-014 |
| A-5 | Assumed, not measured: 1 µs for one simple per-entity update on typed arrays with no allocation; 2 µs for one event appraisal; 0.1 µs for one spatial-hash probe. SIM.30.04's benches replace these. | assumption |
| A-6 | Sparse storage: people-side state is keyed by entity, settlement or region, never by cell × layer. A layer with no occupied region costs nothing. A region index costs at most 4 B × 1,024 regions = 4 KiB per area. | DEC-013 §3 |
| A-7 | L0 social and work events: about one per named person per 20 game minutes (33 ticks), so about 4.5 events per tick at L0 = 150, each seen by about 4 people (participants plus witnesses). | assumption |

A tick-cost line reads "CPU: … per tick; memory: … per named person / per settlement / per layer". "Negligible" means under 10 µs per tick under these assumptions.

### 2.6 The SRD catalogue is staged, not loaded

| Citation | Excerpt | Meaning |
|---|---|---|
| `game/data/srd51/rules.json:7` | `"dormant": true,` | No plugin loads the SRD rules, creatures, spells or equipment; entries reach play only through an adaptation task (`docs/SRD5_1_COVERAGE_MANIFEST.md`). |

The SRD entries this audit relies on have stable IDs: conditions (`srd:condition:*`, exhaustion at `game/data/srd51/rules.json:10533`), diseases (`srd:rule:diseases`, `game/data/srd51/rules.json:5970`), poisons (`srd:rule:poisons`, `game/data/srd51/rules.json:7597`), madness (`srd:rule:madness`, `game/data/srd51/rules.json:6291`), resting (`game/data/srd51/rules.json:4447`), vision, light, food and water (`srd:rule:adventuring-the-environment`, `game/data/srd51/rules.json:4390`), languages (`game/data/srd51/rules.json:707`), travel pace (`game/data/srd51/rules.json:4331`), mounts and vehicles (`game/data/srd51/rules.json:3004`), and the fantasy-historical pantheons (`game/data/srd51/rules.json:10977`).

### 2.7 The society baseline is not approved

DEC-002 asks the Owner to approve `docs/society/DEUS_SOCIETY_WBS.md` as the frozen baseline and is `OPEN`; if unanswered, "implementation leaves remain blocked" (`docs/OWNER_DECISIONS.md:46`). OD-1 recommends approval (`docs/worldgen/DEUS_WORLDGEN_WBS.md:703`). Every SOC row cited below as coverage is therefore planned but blocked. Several proposed packages extend SOC rows; they inherit the same gate.

## 3. The ten areas

### 3.1 Individual minds (priority 1)

**What the plan and the rules require.**
- V16 (`docs/VISION.md:25`): stories come out of the simulation rather than scripts.
- V23 (`docs/VISION.md:31`): a daily pattern of life plus work chosen by personality traits and skills.
- V94 (`docs/VISION.md:105`): every person has personality traits and values, rolled at birth with culture and family influence; they decide who becomes a friend, rival or partner; "Each person remembers others as opinions shaped by shared events."
- V17 and V42 (`docs/VISION.md:26`, `docs/VISION.md:51`): colonists pursue goals; unhappy or ambitious people leave and found camps.
- V26, V72, V78: relationships, own beds, privacy.
- DEC-014 §3: crowd counts keep the identity axes; nothing about minds.
- Design, not planning: `docs/design/PERSONALITY.md` (bonds, opinions, memories, grief; "design only", line 7; mental breaks out of scope, line 637) and `docs/design/EMERGENT_SOCIETY.md:9-41` (one causal chain; social knowledge separate from world truth; bonds need positive and negative changes and memory limits).

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Vital needs (food, water, rest) | SOC.13.01 (`docs/society/DEUS_SOCIETY_WBS.md:63`), WB-002 Slice 2 (`docs/WORK_QUEUE.md:79`), SIM.00.05 "Colonists needs" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:524`) | yes |
| Other needs (social, comfort, privacy, recreation, faith) | none | no |
| Mood and stress | GP.08.01, only through its source `docs/SLICES.md:75` ("relationships, moods") | nominal |
| Relationships | GP.08.01 (same source); SIM.40.10 covers mating only | nominal |
| Memories of events | none | no |
| Opinions of others | none | no |
| Personality and values | SIM.40.10 "heritable traits" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:543`), not a personality model | nominal |
| Goals and ambitions | none | no |
| The loop: event → memory → mood → behaviour | none | no |
| Mental breaks | none | no |
| Minds at crowd LOD (promotion, demotion) | none (section 2.4) | no |

One of eleven sub-elements is covered by a row's own text; three more are nominal. Rating: **PARTLY PLANNED**.

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_Colonists.js:1548` | `n = u.data.needs = { model: NEEDS_MODEL, day: dayKey(), foodLb: 0, waterGal: 0, daysWithoutFood: 0` | LIVE: needs follow the SRD food, water and exhaustion rules. |
| `DEUS_Colonists.js:5754` | `if (localTicks % NEEDS_EVERY === 15) tickNeeds();` | LIVE: the needs tick runs from the map update every 60 ticks. |
| `DEUS_Colonists.js:5198` | `if (crit) { const j = crit === "cold" ? warmthJob(u) : needJob(u);` | LIVE: a critical need takes priority over work. |
| `DEUS_Jobs.js:375` | `if (noNeeds(unit) \|\| typeof unit.data.needs[key] !== "number") return;` | The "social" relief from talk jobs does nothing, because the SRD needs record has no social value. |
| `DEUS_Colonists.js:5111` | `Objective 2 (2026-09-22) wiped needs, moods, wandering and the` | The comment records that mood was removed. |
| `DEUS_Colonists.js:5614` | `mood: "Fine", moodScore: 0,` | `describe()` hardcodes the mood. |
| `DEUS_ColonyOverseer.js:79` | `get mood() { return "Fine"; },` | The overseer adapter is a stub. |
| `DEUS_Talk.js:259` | `const mood = u && u.data ? u.data.mood : null;` | No code writes `data.mood`, so Talk's mood band is always null. |
| `DEUS_Colonists.js:643` | `if (unit.data.thoughts.length > 20) unit.data.thoughts.pop();` | LIVE: the thought log keeps 20 entries; entries never decay and are never summed. |
| `DEUS_Talk.js:634` | `const thought = Array.isArray(d.thoughts) && d.thoughts[0] && d.thoughts[0].text` | The only reader of thoughts: the newest one's text in a Talk answer. |
| `DEUS_Colonists.js:5470` | `rememberConversation(u, World().unit(job.params.unitId));` | LIVE: finished talk jobs raise a bond. |
| `DEUS_Colonists.js:2525` | `bond = { unitId: b.id, conversations: 0, familiarity: 0, affection: 0 }` | Bonds only go up, up to 16 per person; no decay, no negative bond, no rival. |
| `DEUS_Colonists.js:2415` | `if (!partner.data.partnerId && !u.data.partnerId) {` | At bedtime a partner is set on the first eligible faction member, with no bond or household check. |
| `DEUS_Colonists.js:2652` | `facets: facetsFor(st.seed, ticks()),` | Only newborns get the 10 personality facets; founders and immigrants get none. |
| `DEUS_Colonists.js:628` | `u.data.facets[name] : 50);` | A missing facet reads as 50, so every founder has the same personality. |
| `DEUS_Colonists.js:1488` | `const discipline = Math.round((facet(u, "discipline") - 50) / 25);` | LIVE: a facet shifts bedtime (curiosity and bravery are read too). |
| `DEUS_Colonists.js:587` | `const goalSteps = (u && G && G.planSteps) ? G.planSteps(u) : [];` | Always empty: `UF.Goals` is never defined (the plugin is archived). |
| `DEUS_Colonists.js:2861` | `addThought(kin,` | Grief exists only on death by old age, reached only through the pre-game history loop (section 2.2). |
| `docs/design/PERSONALITY.md:7` | `**Status (2026-09-19 14:30):** design only.` | None of the bond, opinion or memory design is built. |

Code today: **PARTIAL**. Survival needs drive behaviour. Mood is DORMANT, thoughts are a log only, bonds are positive-only, personality exists only for newborns, goals and breaks are ABSENT. Tick: the colonist sweep runs every 30 ticks with at most 4 decisions (`DEUS_Colonists.js:5253`); households reconcile over all world units once a day (`UF_Households.js:1047`).

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G1-1 | BLOCKER | No WBS row plans the event → memory → mood → behaviour loop that V16 and V94 depend on. In code the loop is cut in two places: thoughts are never summed into a mood, and nothing reads mood. | MIND-02, MIND-03, MIND-07 |
| G1-2 | MAJOR | Relationships and opinions have only a nominal row (GP.08.01's slice text). Code keeps positive-only bonds and pairs partners with no bond check; EMERGENT_SOCIETY asks for positive and negative changes, memory limits and separate trust, grievance and affection. | MIND-04 |
| G1-3 | MAJOR | No personality or values model is planned. Founders and immigrants have no facets, so the 72 Year-0 founders all read 50; V94 wants traits and values rolled with culture and family influence. | MIND-05 |
| G1-4 | MAJOR | No row plans goals or ambitions. The goals hook is empty in code; V17 goal pursuit and V42 "unhappy or ambitious colonists leave" need them. | MIND-06 |
| G1-5 | MAJOR | No crowd-LOD summary for minds and no rule for building a promoted person's mind or keeping named relationships through demotion (section 2.4). | MIND-08 |
| G1-6 | MINOR | Non-vital needs are dormant: the social need is written by talk jobs but has no field to change, and nature and comfort have no live job. | MIND-01, MIND-03 |
| G1-7 | MAJOR | AGENTS.md rule 14 requires the simulation to explain itself through the sheet and look views; `describe()` hides facets (`DEUS_Colonists.js:5621`) and hardcodes mood. No row plans "why" panels for minds. | MIND-09 |
| G1-8 | MINOR | Mental breaks have no row and are out of scope in the design (`docs/design/PERSONALITY.md:637`); the choice is the Owner's (OQ-02). | MIND-07 |

**Proposed packages.** Hard prerequisites for all of them: SIM.00.02 (headless core), SIM.00.03 (snapshot and command queue) and SIM.00.04 (units in the core). No people area has to come first (section 5).

- **PROPOSED-MIND-01 Mind state schema, world event record and save** (G1-6, and the base for all MIND packages).
  - Scope: one versioned schema for a person's mind: needs vector (vital and non-vital), mood (valence) and stress, personality facets and values, a bounded memory ring, bounded relationship slots, goals. One typed, append-only world event record (who, what, where, when, witnesses) that memories point to by event ID. Stable IDs only (INV-CORE-04). Save and migration from today's `unit.data` fields (`needs`, `thoughts`, `socialBonds`, `facets`).
  - Depends on: SIM.00.02, SIM.00.03, SOC.10.01, SOC.60.02, SIM.00.06.
  - Acceptance tests: (1) a JSON-Schema validator accepts every mind in a 72-founder fixture world and rejects a fixture with a memory pointing to a missing event; (2) save, load and save again is byte-identical; (3) an old save with `thoughts` and `socialBonds` migrates without loss (counts match). Mutant: a migration that drops `socialBonds` must fail test 3.
  - Tick cost: CPU none per tick (a data package). Memory about 0.6 KiB per named person (needs 8 B, mood and stress 4 B, 24 facets and 10 values 34 B, a 16-entry memory ring of 16 B = 256 B, 24 relationship slots of 12 B = 288 B, 4 goals of 8 B = 32 B; total 622 B), so 0.6 MiB at N = 1,000. Crowd: about 1 KiB per settlement (40 cohorts × 24 B), 0.2 MiB at S = 200. Per layer: nothing; the region index is at most 4 KiB per area (A-6).

- **PROPOSED-MIND-02 Event appraisal: events become memories** (G1-1).
  - Scope: data-driven appraisal rules (event kind × the observer's relation to the subject × personality → memory valence, intensity and half-life). Witness selection by perception: range, same or open-to layer, line of sight, and light level once PROPOSED-DEEP-01/02 exist. Hearsay later arrives as a belief with a source (EMERGENT_SOCIETY's separation of truth and knowledge).
  - Depends on: MIND-01, SIM.00.04; soft: PROPOSED-DEEP-02 (until then, sight is range plus line of sight).
  - Acceptance tests: (1) fixture: A sees friend B die; A gains a memory of kind `witnessed_death` about B with intensity at or above the rule's floor; (2) C, behind a wall on the same layer, gains no memory; (3) D, B's rival, gains a memory of the opposite sign; (4) the same seed and events give byte-identical memories. Mutant: witness selection that ignores line of sight must fail test 2.
  - Tick cost: about 4.5 events per tick at L0 (A-7) × 4 appraisals × 2 µs ≈ 36 µs, plus 4.5 witness queries × about 20 spatial probes × 0.1 µs ≈ 9 µs; L1 and L2 appraise only significant events (births, deaths, crimes, battles), well under 1 µs per tick. Total about 0.05 ms, 1.5% of the 3.4 ms 8x budget. Memory: inside MIND-01's ring.

- **PROPOSED-MIND-03 Mood and stress** (G1-1, G1-6).
  - Scope: mood is a deterministic function of active memories (decayed in closed form, intensity × 2^(−Δt/half-life)) and need deficits; stress integrates sustained low mood and recovers with rest, company and comfort. Recomputed only for persons marked dirty by a new memory or a need crossing a band, never by a full sweep (INV-CORE-03). Durations are in ticks until the Owner answers OQ-03.
  - Depends on: MIND-02.
  - Acceptance tests: (1) mood equals the documented formula on a 50-memory fixture; (2) after a memory's half-life its contribution halves (±1%); (3) sustained negative mood raises stress monotonically and rest lowers it; (4) no person's mood is recomputed without a dirty mark (instrumented counter). Mutant: removing decay must fail test 2; a per-tick full sweep must fail test 4.
  - Tick cost: dirty persons about 18 per tick × 16 memory terms × 0.05 µs ≈ 15 µs. Crowd cohorts: a mood histogram (8 buckets) per cohort stepped at L2, 8,000 cohorts ÷ 100 ticks = 80 updates × 1 µs = 80 µs. About 0.1 ms per tick. Memory: included in MIND-01.

- **PROPOSED-MIND-04 Relationships and opinions** (G1-2).
  - Scope: pairwise records with separate familiarity, affection, trust, grievance and authority; bounded slots per person with an eviction rule that keeps kin, partner and strongest ties; growth and decay from shared events; rivals and grudges; partner formation through `UF.Households.formPair` only (replacing the bedtime shortcut at `DEUS_Colonists.js:2415`).
  - Depends on: MIND-02, SIM.40.10 (pair and kin rules).
  - Acceptance tests: (1) three shared positive events raise affection past the friend band; (2) an assault raises grievance and lowers trust on both sides by rule; (3) an untouched tie decays to acquaintance after its half-life; (4) eviction never drops kin or partner. Mutant: bonds that only increase (today's rule) must fail test 2.
  - Tick cost: updates only on events, about 18 pair updates per tick × 0.2 µs plus slot eviction, under 10 µs. Memory: 288 B per named person (in MIND-01). Crowd: no pairwise records for anonymous people.

- **PROPOSED-MIND-05 Personality and values at birth, founding, arrival and promotion** (G1-3).
  - Scope: facets (the ten existing ones extended, as V94 says) and values, rolled from the world seed with the culture bias from DEC-015 plan data and parental inheritance from SIM.40.10; the same rule for founders, immigrants, newborns and promoted crowd members; slow drift from strong memories.
  - Depends on: MIND-01, SOC.10.03 (plan data with Owner-authored values), SIM.40.10; the model choice is the Owner's (OQ-01).
  - Acceptance tests: (1) no founder reads the default 50 on all facets; (2) over 1,000 simulated births, child facets correlate with the parents' mean within the configured band; (3) culture bias shifts the facet mean by the configured amount (±2); (4) re-rolling the same person from the same seed is identical. Mutant: founders skipped (today's behaviour) must fail test 1.
  - Tick cost: none per tick (runs at birth, founding, arrival, promotion). Memory: 34 B per named person (in MIND-01).

- **PROPOSED-MIND-06 Goals and ambitions** (G1-4).
  - Scope: long-term goals chosen from personality, values, skills and circumstance (found a household, master a craft, hold an office, avenge a wrong, leave and found a camp per V42); a goal turns into duties through the SOC.13.01 scheduler and plan steps from DEC-015; goals end when met, blocked or replaced.
  - Depends on: MIND-03, MIND-05, SOC.13.01, SOC.10.02.
  - Acceptance tests: (1) a person with high ambition and a craft skill gains a mastery goal that produces apprenticeship or work duties; (2) a fixture with sustained stress and high ambition produces a V42 departure with a partner; (3) a goal whose precondition vanishes is dropped within one evaluation. Mutant: goals that never create duties must fail test 1.
  - Tick cost: each named person re-evaluates goals once per game day, staggered: 1,000 ÷ 2,400 ticks ≈ 0.4 evaluations per tick × 20 µs ≈ 8 µs. Memory: 32 B per named person (in MIND-01).

- **PROPOSED-MIND-07 Behaviour coupling and breaks** (G1-1, G1-8).
  - Scope: mood, stress and personality weight the SOC.13.01 duty choice (work pace, rest, company-seeking, refusing an order within the V52 chain), what a person says (V62, V94; speech only over heads, V92) and, if the Owner chooses, bounded breaks (OQ-02).
  - Depends on: MIND-03, MIND-06, SOC.13.01.
  - Acceptance tests: (1) with everything else fixed, a person at mood −80 and one at +80 choose different duty weights by the documented rule; (2) a break fixture triggers only the break kinds the Owner allows; (3) survival still wins over any mood effect (V17). Mutant: coupling removed must fail test 1.
  - Tick cost: one weight lookup per duty decision, about 5 decisions per tick at L0 × 1 µs = 5 µs.

- **PROPOSED-MIND-08 Minds at crowd LOD: summaries, promotion and demotion** (G1-5).
  - Scope: per-cohort mood histogram and need means as part of SIM.30.01's summary; deterministic promotion (a person's facets, values and first memories derived from the seed, settlement, cohort and index, plus the cohort's history counters); demotion folds the person into the cohort and keeps named relationships of persons who stay named.
  - Depends on: SIM.30.01, SIM.30.02, SIM.30.03, MIND-01..05.
  - Acceptance tests: (1) 1,000 random promote and demote cycles on 3 seeds keep cohort totals exact; (2) promoting the same slot twice from the same state is byte-identical; (3) a named person's relationships to other named persons survive the other's demotion and promotion. Mutant: unseeded randomness in promotion must fail test 2.
  - Tick cost: promotion about 50 µs per person; a focus move that promotes 100 people costs 5 ms, so it must be spread over prewarm ticks (at most 20 per tick, 1 ms); demotion about 10 µs per person. Memory: the cohort histogram is in MIND-01's per-settlement figure.

- **PROPOSED-MIND-09 Mind observability and long-run story QA** (G1-7).
  - Scope: text "why" entries in the sheet and look views (current mood with its top three causes, strongest ties, goals; no overhead status text, V92; no art); a headless 100-game-year QA run that measures story yield (relationship changes, departures, grief episodes per 100 person-years) against bands.
  - Depends on: MIND-02..07, OPS.30.01.
  - Acceptance tests: (1) for a fixture person, the "why" entry lists exactly the three largest mood contributions; (2) the QA run's metrics fall inside their bands on 3 seeds. Mutant: appraisal switched off must push "relationship changes per 100 person-years" below its floor and fail test 2.
  - Tick cost: none in play (read on demand); the QA run is offline.

### 3.2 Government, law, crime and succession (priority 4)

**What the plan and the rules require.**
- V52 (`docs/VISION.md:62`): a power structure where one character gives the orders; ranks as a tree of threes; leaders of sites, squads and work groups.
- V71 (`docs/VISION.md:81`): ownership is respected; "Theft, gifting, trade, inheritance and ownership transfer need their own approved rules".
- V139 and DEC-014 §4 (`docs/OWNER_DECISIONS.md:207`): anti-snowball pressures include "regional rebellions" and "dynastic succession crises".
- INV-SOC-03 (`docs/INVARIANT_REGISTRY.md:87`): an office survives its holder's death as a vacancy.
- Design only: the MAGISTRATE office "Law enforcement, trials, dispute arbitration, punishment, property claims" (`docs/society/DEUS_PERSON_AND_INSTITUTIONS.md:123`); `docs/design/EMERGENT_SOCIETY.md:46-47` (theft as a distinct act with motive, risk and witnesses; justice with laws, jurisdiction, evidence and proportional enforcement).

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Offices independent of holders | SOC.20.01 (`docs/society/DEUS_SOCIETY_WBS.md:71`) | yes |
| Year-0 institutional coverage | SOC.21.01 | yes |
| Office workload and specialisation | SOC.22.01, SOC.22.02 | yes |
| Vacancy, deputies, office succession | SOC.23.01, SOC.23.02 (`docs/society/DEUS_SOCIETY_WBS.md:76`) | yes |
| Appointment, council, loyalty | SOC.23.03 | yes |
| Policy decrees (Command mode) | SOC.50.01 | yes (area 9) |
| Law codes and jurisdiction | none | no |
| Crime (theft, assault, murder) | none | no |
| Justice, punishment, detention | none | no |
| Legitimacy, unrest, rebellion | none (DEC-014 §4 only) | no |
| Dynastic succession crises, regency | none (SOC.23.02 is office succession) | no |
| V52 rank tree of threes | none | no |
| Faction fission (V42) | none | no |

Rating: **PARTLY PLANNED** (five of thirteen covered, all SOC rows, all gated by DEC-002, section 2.7).

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_History.js:540` | `u.data.rank = u.id === leaderId ? 1 : 0;` | LIVE once, at New Game: one leader at rank 1, everyone else 0. |
| `DEUS_Talk.js:672` | `else parts.push(say("faction", ["noLeader"], {}, u, "faction.leader", n, adds));` | In play a dead leader is not replaced; Talk says there is no leader. |
| `DEUS_HistoricalDemographics.js:252` | `const chosen = initial[faction.id] === undefined ? (heirs[0] \|\| living[0])` | Heir rule (children first, else the eldest), reached only in the pre-game loop (section 2.2). |
| `DEUS_HistoricalDemographics.js:17` | `Rulers can be minors; isMinor records minority, without simulating a regent.` | No regency. |
| `DEUS_Colonists.js:4806` | `// 0. Leader holds court: the leader goes to the Town Hall during the day` | Inside `autonomousCallingJob`, which has no caller: DORMANT. |
| `DEUS_Containers.js:318` | `if (c.owner.id !== actorId) return { ok: false, reason: "personal_ownership" };` | Someone else's container is refused; there is no crime and no consequence. |
| `DEUS_Items.js:572` | `if (Own && typeof Own.claim === "function" && !Own.ownerOf({ kind: "item", id: it.id })) {` | The first pickup claims an unowned item; taking an owned item is neither refused nor detected, so theft does not exist. |
| `DEUS_Doors.js:172` | `return !!F && typeof F.relation === "function" && F.relation(faction, s.faction) >= FRIENDLY_RELATION;` | LIVE: doors block trespassers physically; trespass is not an offence. |
| `DEUS_Callings.js:63` | `[43, "Sheriff", "High"],` | A calling label with no behaviour (so are Jailor, line 86, and Thief, line 102). |
| `docs/design/CHAIN_OF_COMMAND.md:3` | `Not built yet.` | The V52 rank-tree plugin was never built. |

Code today: **PARTIAL** (a leader flag and title at New Game; law, crime, justice and in-play succession ABSENT). Zero whole-word hits in `game/js/plugins` for office, council, law, crime, theft, murder, justice, punish, jail, prison, heir, rebel and tax (survey count at the base).

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G2-1 | MAJOR | No row plans law, crime or justice. The MAGISTRATE office is described but has no leaf; V71 says theft rules need their own approved rules. In code, theft cannot happen and trespass is only a locked door. | GOV-01, GOV-02, GOV-03 |
| G2-2 | BLOCKER | No row plans legitimacy, unrest or rebellion, which V139 and DEC-014 §4 require as an anti-snowball pressure. | GOV-04 |
| G2-3 | MAJOR | A dead leader is never replaced in play. SOC.23.02 plans office succession, but dynastic crises, contested claims and regency (DEC-014 §4) have no row. | GOV-05 |
| G2-4 | MAJOR | Two hierarchy models are not reconciled: V52's rank tree of threes (CHAIN_OF_COMMAND spec) and SOC.20's offices. No row plans the rank tree. | GOV-06 |
| G2-5 | MINOR | Faction fission (V42) has no row; it needs MIND-06 goals and a founding path. | GOV-05 |
| G2-6 | MINOR | Calling labels such as Sheriff, Jailor and Thief exist with no behaviour, which misleads readers of the sheet and of the docs. | GOV-03 |

**Proposed packages.** All extend SOC rows and inherit DEC-002's gate.

- **PROPOSED-GOV-01 Law codes and jurisdiction as data** (G2-1).
  - Scope: a per-faction law set in DEC-015 plan data (acts that are offences, evidence thresholds, sentences, who judges), jurisdiction by site and office; the engineering side is the schema and lookup; the content is Owner-authored (OQ-05).
  - Depends on: SOC.20.01, SOC.10.02, SOC.10.03.
  - Acceptance tests: (1) schema validation of 9 placeholder law sets (`TEST_` names); (2) a lookup returns the law of the site where the act happened, not the actor's home site. Mutant: jurisdiction taken from the actor's faction must fail test 2.
  - Tick cost: none per tick; about 1 KiB per law set × up to 50 factions.

- **PROPOSED-GOV-02 Crime as intentional acts, with witnesses** (G2-1).
  - Scope: theft, assault and murder as distinct actions chosen with motive (need, grievance, greed) and risk (watchers, light); ownership never silently changes (V71); witnesses form memories and beliefs through MIND-02; an undetected crime stays unknown.
  - Depends on: MIND-02, MIND-06, GOV-01, SIM.00.04; the theft rules need Owner approval (V71).
  - Acceptance tests: (1) fixture: a starving person with low honesty next to an unwatched owned store takes food; a crime record exists, the item's owner is unchanged and it is flagged stolen; (2) with one witness in line of sight, the witness has a memory naming the thief; with the witness behind a wall, nobody does; (3) the hauling planner never takes an owned item without creating a crime record. Mutant: the planner taking the item silently must fail test 3.
  - Tick cost: a motive check added to duty decisions for persons with a motive, about 5 decisions per tick × 1 µs; crime events are rare. Memory: 32 B per open crime record.

- **PROPOSED-GOV-03 Justice: accusation, evidence, trial, sentence, restitution** (G2-1, G2-6).
  - Scope: accusations from witness beliefs, evidence thresholds from GOV-01, a magistrate office (SOC.20.01) that judges, sentences that move real items and people (restitution, detention in a real room, exile, fines in coin per SOC.30), and callings mapped to these roles or removed.
  - Depends on: GOV-01, GOV-02, SOC.23.03, PROPOSED-REC-01.
  - Acceptance tests: (1) a rumour alone cannot convict; (2) a conviction applies the law's sentence; restitution returns the exact item IDs; (3) detention needs a real enclosed room. Mutant: conviction on rumour must fail test 1.
  - Tick cost: open cases stepped once per game day: 200 settlements × up to 10 cases ÷ 2,400 ticks ≈ 1 case step per tick × 10 µs. Memory: about 128 B per open case.

- **PROPOSED-GOV-04 Legitimacy, unrest and rebellion** (G2-2).
  - Scope: per-settlement legitimacy and unrest computed from cohort mood (MIND-03), taxes (SOC.33.01), famine, grievances and the ruler's standing; above a threshold, organised rebellion (a new faction or a seceding site) through WAR-01..04.
  - Depends on: MIND-03, MIND-08, GOV-01, SOC.23.03, SOC.33.01.
  - Acceptance tests: (1) unrest is the documented deterministic function of its inputs; (2) famine alone raises unrest by the configured amount; (3) anti-snowball fixture: a dominant faction with high taxes and famine sees a rebellion within the configured window on 3 seeds. Mutant: unrest that ignores famine must fail test 2.
  - Tick cost: once per settlement per game day: 200 ÷ 2,400 ≈ 0.1 updates per tick × 20 µs. Memory: 32 B per settlement.

- **PROPOSED-GOV-05 Succession, regency, succession crises and faction fission** (G2-3, G2-5).
  - Scope: on a ruler's or office holder's death, apply the culture's succession rule (SOC.23.02) in play; minors get regents; several strong claimants with supporters (MIND-04 ties) cause a crisis that can split the faction; V42 departures found new factions with their own relations.
  - Depends on: SOC.23.02, MIND-04, MIND-06, PROPOSED-REC-01, PROPOSED-WAR-01.
  - Acceptance tests: (1) a leader's death produces a successor within one game day by the culture's rule; (2) a minor heir gets a regent; (3) two claimants of equal support produce a crisis event and, past its threshold, a split with persons conserved. Mutant: no successor chosen (today's behaviour) must fail test 1.
  - Tick cost: event-driven on deaths of office holders; a claimant scan over kin and officers (at most 50) costs under 1 ms per event and is rare.

- **PROPOSED-GOV-06 Rank tree and offices reconciled** (G2-4).
  - Scope: a short design record and schema that maps V52's tree of threes onto SOC.20's offices (who gives which orders), with the V52 numbers as tests; Owner confirms the model (OQ-06).
  - Depends on: SOC.20.01, SOC.21.01.
  - Acceptance tests: (1) eight founders give five rank-1, two rank-2 and one rank-3 members (V52); (2) every office holder has a place in the order chain. Mutant: branching factor 4 must fail test 1.
  - Tick cost: rebalanced on membership changes only, about 0.1 ms per change for 1,000 members.

### 3.3 Diplomacy and war (priority 6)

**What the plan and the rules require.**
- V18 (`docs/VISION.md:27`): factions have relations from allied to hostile. V19: migrants, traders and raiders arrive at map edges.
- DEC-013 §6 (`docs/OWNER_DECISIONS.md:185`): races may travel, trade, migrate and fight across all layers.
- V139 / DEC-014 §2 and §4: soldiers in formed armies are promoted from crowd counts; dominant factions face counter-pressures.
- DEC-018 and DEC-022, GP.07.02: fireballs and blasts breach floors; cross-layer targeting.
- Design only: the ENVOY office "Inter-faction diplomacy, trade caravans, tribute negotiation, boundary pacts." (`docs/society/DEUS_PERSON_AND_INSTITUTIONS.md:125`).

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Military status and mobilisation | SOC.40.01, SOC.40.02 (`docs/society/DEUS_SOCIETY_WBS.md:99`) | yes |
| Garrison and patrol | SOC.41.01 | yes |
| Economic cost of war | SOC.42.01 | yes |
| Combat resolution, cross-layer targeting | GP.07.01, GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:578`) | yes |
| Cross-layer war between races | WG.62.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:196`) | yes (one clause) |
| Settlements shrinking under war | SIM.50.09 | yes (one clause) |
| Diplomacy | GP.08.01 states "diplomacy has no leaf, Gap 16" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:579`) | no |
| Relations that change in play | none | no |
| Treaties, alliances, tribute | none | no |
| War goals, declaration, campaigns | none | no |
| Raids and sieges (V19 arrivals) | none | no |
| Armies at crowd LOD | none (DEC-014 §2 only) | no |
| Conquest, occupation, captives, refugees | none | no |
| Race attitudes | none | no |

Rating: **PARTLY PLANNED** (defence and combat are planned; diplomacy and offensive war are not).

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_Factions.js:212` | `const v = speciesTerm(A.species, B.species) + stanceTerm(A, B) + stanceTerm(B, A) + (rand() * 2 - 1) * spread;` | Relations are rolled once at generation. |
| `DEUS_Factions.js:546` | `Factions.setRelation = function(a, b, value, reason = "") {` | Its only callers are test fixtures; `adjust` and `modifyStanding` have no caller in play. |
| `docs/systems/UF_Factions.md:90` | `Relations don't move by themselves in play yet` | The system page agrees. |
| `DEUS_Factions.js:659` | `if (++contactFrame % CONTACT_EVERY === 0) Factions.checkContact();` | LIVE: factions become "met" when their people come within 12 cells of the player's. |
| `DEUS_Combat.js:1361` | `if (hostiles.length && friendlies.length) {` | Sides are relative to the player, so two NPC factions cannot fight each other. |
| `DEUS_Stance.js:140` | `const isMilitary = tags.includes("hostile") \|\| tags.includes("raider") \|\|` | Only units tagged hostile or raider attack, and only tests set those tags. |
| `DEUS_Stance.js:135` | `const PEACE_YEARS = 10;` | Hostile factions stay indifferent for the first 10 years. |
| `DEUS_History.js:1062` | `record(year, "war",` | Wars, peace, sacks and alliances exist only inside `simulate()`, which is switched off (section 2.2). |
| `DEUS_World.js:4103` | `arrivals: no plugin in plugins.js adds arrivals yet` | The catalog's raider arrivals have no plugin. |
| `game/data/DEUS_WorldCatalog.json:7537` | `"elf\|dwarf": -10,` | Race affinity: 13 species pairs defined; every other pair is 0. |

Code today: **PARTIAL** (static relations, contact and faction aid LIVE; diplomacy, war, raids, sieges, treaties and tribute ABSENT or DORMANT). Tick: contact checks every 120 frames until all factions are met (`DEUS_Factions.js:632`). Persistence: relations and a 200-entry log are saved (`DEUS_Factions.js:249`).

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G3-1 | BLOCKER | Relations never change in play and no row plans it. Without it there is no war, alliance or anti-snowball pressure between factions (V18, V139). | WAR-01 |
| G3-2 | MAJOR | No diplomacy row: GP.08.01 records the gap itself ("Gap 16"). Envoys, treaties, alliances, tribute and trade pacts are designed only as an office description. | WAR-02 |
| G3-3 | MAJOR | Offensive war (goals, declaration, campaigns) has no row; SOC.40 is defensive. In code, NPC factions cannot fight each other at all. | WAR-03, WAR-04 |
| G3-4 | MAJOR | Armies at crowd LOD and off-screen battles have no row, though DEC-014 §2 names soldiers in formed armies. | WAR-04 |
| G3-5 | MAJOR | Raids and sieges (V19) and cross-layer assault (DEC-013 §6: tunnelling up or down, floor breaching via SIM.40.01 and GP.07.02) have no row. | WAR-05 |
| G3-6 | MAJOR | The aftermath of war (conquest, occupation, captives, refugees) has no row; SIM.50.09 names only settlement contraction. | WAR-06 |
| G3-7 | MINOR | Race attitudes are 13 catalog pairs; `docs/design/PEOPLES.md` holds a table for the older eleven peoples; nobody holds a personal attitude to another race. | WAR-01 |

**Proposed packages.**

- **PROPOSED-WAR-01 Relations that change for logged reasons; race attitudes** (G3-1, G3-7).
  - Scope: relation changes only through logged causes (contact, trade, insult, raid, treaty, shared enemy, leaders' opinions from MIND-04); asymmetric grievance memory per faction; a 9 × 9 race-attitude table as Owner data (OQ-09) plus personal attitudes as MIND-04 opinions.
  - Depends on: SIM.00.05 (Factions contact into the core), MIND-04, PROPOSED-REC-01.
  - Acceptance tests: (1) every relation change has a logged cause with an event ID; (2) a raid lowers the victim's relation to the raider by the rule and records a grievance; (3) with no causes, relations do not drift. Mutant: random drift without a cause must fail test 3.
  - Tick cost: event-driven. Memory: 8 B per faction pair; 50 factions = 1,225 pairs ≈ 10 KiB.

- **PROPOSED-WAR-02 Diplomacy: envoys, treaties, alliances, tribute, trade pacts** (G3-2).
  - Scope: envoys as real travellers (ENVOY office), a treaty state machine (proposed, agreed, broken), tribute and trade pacts that move physical goods (LIFE-001, INV-SOC-05), language barriers (PROPOSED-CUL-04).
  - Depends on: WAR-01, GOV-01, SOC.20.01, PROPOSED-LOG-01, PROPOSED-LOG-02, PROPOSED-CUL-04.
  - Acceptance tests: (1) a treaty moves through its states only by recorded acts; (2) tribute transfers the exact goods (mass equal before and after); (3) breaking a treaty lowers the relation and records a grievance. Mutant: tribute without goods moving must fail test 2.
  - Tick cost: each faction leader considers diplomacy once per game day: 50 ÷ 2,400 ≈ 0.02 per tick × 100 µs ≈ 2 µs. Memory: about 64 B per active treaty.

- **PROPOSED-WAR-03 War goals, declaration and campaign planning** (G3-3).
  - Scope: war goals (land, loot, revenge, tribute, succession claims from GOV-05), declaration by the ruler with council support (SOC.23.03), and campaign plans that use DEC-015's threat mode and SOC.40.02 mobilisation.
  - Depends on: WAR-01, GOV-04, SOC.40.02, SOC.10.02.
  - Acceptance tests: (1) war is declared only with a goal and a cause on record; (2) a campaign plan names forces that exist; (3) peace is made when goals are met or the war is lost by rule. Mutant: declaring war on a random neighbour must fail test 1.
  - Tick cost: once per faction per game day, as WAR-02.

- **PROPOSED-WAR-04 Armies and battles at LOD** (G3-3, G3-4).
  - Scope: armies formed from crowd counts with the SOC.10.01 axes and obligation (DEC-014 §3), marching on the route graph (PROPOSED-LOG-01), supplied (PROPOSED-LOG-05); coarse battles resolve on cohort counts off-screen and promote to named fighters in focus (GP.07.01 combat); the dead become remains (SIM.40.10).
  - Depends on: SIM.30.02, SIM.30.03, SOC.40.01, GP.07.01, PROPOSED-LOG-01, PROPOSED-LOG-05.
  - Acceptance tests: (1) a coarse battle conserves persons (living + dead = before); (2) promoting a battle mid-fight is deterministic and keeps totals; (3) the NPC-vs-NPC case works (today impossible). Mutant: casualties not written back to crowd counts must fail test 1.
  - Tick cost: coarse battles stepped every 10 ticks, up to 5 battles × 10 µs ÷ 10 ≈ 5 µs per tick; fine battles use GP.07.01's per-unit cost inside focus. Memory: about 256 B per army.

- **PROPOSED-WAR-05 Raids, sieges and cross-layer assault** (G3-5).
  - Scope: raiding parties and sieges from real factions (V19 arrivals from off-map factions as data); attackers can tunnel through strata, climb ramps and breach floors (SIM.40.01, GP.07.02, WG.00.20); defenders mobilise (SOC.40.02).
  - Depends on: WAR-03, WAR-04, SIM.40.01, SIM.40.02, GP.07.02, WG.00.17, WG.00.20.
  - Acceptance tests: (1) fixture: attackers on layer −3 dig up into a settlement on −2 and the defenders mobilise; (2) a siege that cuts the settlement's supply route raises its famine index; (3) a floor breach by a blast follows SIM.40's attenuation. Mutant: attacker pathing that ignores cross-layer connectors must fail test 1.
  - Tick cost: digging and fighting run as ordinary jobs and combat in focus; the siege state is one record per siege stepped once per game hour, negligible.

- **PROPOSED-WAR-06 Aftermath: conquest, occupation, captives, refugees** (G3-6).
  - Scope: conquered sites change owner and law (GOV-01); captives are held, ransomed, freed or absorbed; refugees move to allied sites (persons conserved); memories of atrocities and liberation (MIND-02) feed later relations.
  - Depends on: WAR-04, GOV-05, SIM.50.09, MIND-02.
  - Acceptance tests: (1) persons are conserved through conquest (none vanish); (2) refugees arrive at a reachable allied site; (3) a massacre leaves memories in witnesses and lowers the relation. Mutant: refugees deleted instead of moved must fail test 1.
  - Tick cost: event-driven; refugee groups travel as PROPOSED-LOG-01 travellers.

<!-- PART C -->
