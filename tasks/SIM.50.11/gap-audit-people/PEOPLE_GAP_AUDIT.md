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

### 3.4 Culture and religion (priority 10)

**What the plan and the rules require.**
- V39 (`docs/VISION.md:48`): each faction has its own culture (species, build style, work priorities, personality bias).
- V65 (`docs/VISION.md:75`): Arthurian fantasy with chapels and holy relics; specific lore needs the Owner's approval. AGENTS.md rule 7: no new lore, names or factions without approval.
- DEC-015 §4 (`docs/OWNER_DECISIONS.md:226`): race-specific cultural lore, names and values are Owner-authored; schemas are engineering work.
- Design only: `docs/design/EMERGENT_SOCIETY.md:50` (religion generated from approved content and actor beliefs; no unapproved gods or doctrines), `docs/design/EMERGENT_SOCIETY.md:69-70` (death care; beliefs and religion emerge through social transmission), `docs/design/EMERGENT_SOCIETY.md:74` (learned culture diverges between factions of one people).
- SRD: the fantasy-historical pantheons appendix (`game/data/srd51/rules.json:10977`), the Acolyte background with personality, ideal, bond and flaw tables (`game/data/srd51/character_options.json:7223`), the cleric class (SOC.11.01), and standard and exotic languages (`game/data/srd51/rules.json:707`).

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Culture data slots (values, lore, names per race) | SOC.10.03 (`docs/society/DEUS_SOCIETY_WBS.md:60`), SOC.10.02 (architectural style) | yes (schema slots; content Owner TODO) |
| Cultural place names and toponymy | WG.63.05, WG.63.06 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:211`) | yes |
| Beliefs, religion, deities, clergy | none (SOC.11.01 is the cleric class only) | no |
| Rituals, festivals, holidays | none | no |
| Taboos and customs | none (SOC.10.03 "values", nominal) | nominal |
| Funerals, burial, remembrance | none | no |
| Languages and comprehension | none (WG.63.05 names only) | no |
| Art and cultural works as data | none | no |
| Learned culture and drift | none | no |

Rating: **PARTLY PLANNED**.

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_Colonists.js:337` | `const p = cultureOf(ref).priorities \|\| {};` | LIVE: a species' catalog culture weights job priorities and picks build pieces; it never changes. |
| `DEUS_Factions.js:168` | `const ethos = [pick(cfg.ethos).id];` | LIVE once at New Game: each faction rolls ethos tags, which only set starting relations (line 205). |
| `game/data/DEUS_WorldCatalog.json:7574` | `"id": "pious",` | The only faith-like value, a data tag with no mechanic. |
| `DEUS_Callings.js:61` | `[41, "Cleric", "High"],` | A label; no job or check reads it. |
| `DEUS_Sheet.js:1952` | `this.text("Prayers and blessings may be received at sacred shrines."` | UI text promises shrines that do not exist. |
| `DEUS_History.js:228` | `// Names: syllables from the catalog (factions.names), never a fixed list of proper nouns` | LIVE naming rule for places and founders... |
| `DEUS_History.js:675` | `const human = ["Hawthorne", "Miller", "Baker", "Fletcher", "Blackwood",` | ...which a hardcoded English surname pool breaks. |
| `game/data/df_lexicon.json:3` | `"sylvic":  "sylv-lord",` | A 196 KB six-language lexicon with no reference in `game/js`: DORMANT data. |
| `docs/systems/UF_CultureGrowth.md:94` | `There are no customs, festivals, laws, religion, equipment restrictions` | Even the archived culture module disclaims culture content. |
| `docs/design/THEME.md:335` | `**PROPOSAL T21 A (recommended): two unnamed ways of belief, the chapel and the old stones.**` | An unapproved proposal for belief. |

Code today: **PARTIAL** for culture (static catalog priorities, ethos, names); **ABSENT** for religion, rituals, festivals, taboos, languages and cultural works. Zero whole-word hits in the loaded plugins for god, temple, ritual, festival, holiday, taboo, belief and worship.

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G4-1 | MAJOR | No row plans belief or religion. V65 allows chapels and relics; EMERGENT_SOCIETY asks for beliefs and practices that spread socially; the SRD has pantheons, clerics and the Acolyte background. Content needs the Owner (OQ-10). | CUL-02 |
| G4-2 | MAJOR | No row plans rituals, festivals, funerals, burial or remembrance, which EMERGENT_SOCIETY requests (death care, grief linked to real relationships). | CUL-03 |
| G4-3 | MAJOR | No row plans languages. The SRD's language table and a dormant lexicon exist; diplomacy, trade and speech need comprehension. | CUL-04 |
| G4-4 | MAJOR | No row plans learned culture: practices that a community repeats, teaches and changes, so two factions of one race can diverge (`docs/design/EMERGENT_SOCIETY.md:74`). Code culture is a fixed catalog entry. | CUL-01 |
| G4-5 | MINOR | No row plans cultural works (songs, carvings, tales) as data records tied to real events. Text data only; no art. | CUL-05 |
| G4-6 | MINOR | The live naming rule is broken by a hardcoded surname pool. | CUL-04 |
| G4-7 | MINOR | UI text promises sacred shrines that do not exist. | CUL-02 |

**Proposed packages.** Content (gods, doctrines, customs, names) is Owner-authored; these packages build schemas and mechanics with `TEST_` placeholders only (AGENTS.md rule 7).

- **PROPOSED-CUL-01 Culture state: practices, values and taboos as data that drift** (G4-4).
  - Scope: a per-faction practice vector (what the community does, teaches and forbids) seeded from DEC-015 plan data, changed by repeated practice, contact and leadership, with drift limits; persons hold personal variation (MIND-05).
  - Depends on: SOC.10.03, MIND-05, PROPOSED-KNOW-03 (teaching), PROPOSED-REC-01.
  - Acceptance tests: (1) two factions of one race seeded identically diverge after 100 game years under different circumstances on 3 seeds; (2) a practice that nobody performs for its decay period fades; (3) drift never leaves the declared bounds. Mutant: a culture that never changes (today's behaviour) must fail test 1.
  - Tick cost: once per faction per game day, 50 ÷ 2,400 ≈ 0.02 updates per tick, negligible. Memory: about 64 B per faction.

- **PROPOSED-CUL-02 Beliefs and religion** (G4-1, G4-7).
  - Scope: a personal belief record (which practice, how devout), shared practices and roles (clergy as an office, SOC.20.01), holy places as real buildings, faith as a need (MIND-01) and a mood source (MIND-03); spread by social transmission; SRD cleric spells tied to belief (SOC.11.01). Which gods exist is the Owner's choice (OQ-10). The shrine text is removed or made true.
  - Depends on: MIND-01, MIND-03, SOC.11.01, SOC.20.01, CUL-01; content per OQ-10.
  - Acceptance tests: (1) belief spreads along social ties at the configured rate and not between strangers; (2) a person whose faith need is unmet loses mood by rule; (3) no god name outside the Owner-approved list appears in data (validator). Mutant: spread that ignores ties must fail test 1.
  - Tick cost: piggybacks on MIND-02's social events, about 4.5 transmission checks per tick × 1 µs. Memory: 8 B per named person; per settlement a congregation count per practice, about 32 B.

- **PROPOSED-CUL-03 Rituals, festivals, funerals and remembrance** (G4-2).
  - Scope: calendar-driven observances per culture (depends on the calendar question, OQ-03, and SIM.50.06 seasons), funerals and burial that act on real remains (SIM.40.10) and graves as objects, mourning tied to real relationships (MIND-04).
  - Depends on: CUL-01, CUL-02, SIM.50.06, SIM.40.10, MIND-04.
  - Acceptance tests: (1) a festival day gathers the members who are free, at a real place; (2) a death leads to a burial of that body ID, never a duplicate or a vanished corpse after save and load; (3) only persons with a tie to the dead mourn. Mutant: mourners chosen without ties must fail test 3.
  - Tick cost: scheduled events, a few per settlement per game year; negligible. Memory: about 48 B per grave record.

- **PROPOSED-CUL-04 Languages, comprehension and naming** (G4-3, G4-6).
  - Scope: languages known per person (SRD standard and exotic languages as data), comprehension checks for speech, trade and diplomacy, learning a language by contact, and one naming rule (catalog syllables or the lexicon) replacing the hardcoded pool.
  - Depends on: MIND-01, WG.63.05, PROPOSED-KNOW-03.
  - Acceptance tests: (1) two persons with no shared language cannot complete a trade negotiation without an interpreter; (2) a year of contact teaches a language by the configured rule; (3) no generated name comes from a hardcoded list (validator). Mutant: comprehension check that always passes must fail test 1.
  - Tick cost: one comprehension lookup per conversation event (0.1 µs); negligible. Memory: 4 B per named person (a language bitset).

- **PROPOSED-CUL-05 Cultural works as data** (G4-5).
  - Scope: records of works made by persons (a song about a battle, a carved record of a founding) that reference real events (PROPOSED-REC-01), with a creator, material and owner; they affect mood and renown. No images: any visual need is a text-only "art slot needed" line for the Owner (DEC-007).
  - Depends on: PROPOSED-REC-01, PROPOSED-REC-02, SOC.12.01.
  - Acceptance tests: (1) every work references an existing event ID; (2) a work about a victory raises renown of the named hero. Mutant: a work with a dangling event reference must fail test 1.
  - Tick cost: event-driven; about 64 B per work.

### 3.5 Knowledge and technology (priority 8)

**What the plan and the rules require.**
- V77 and V84 (`docs/VISION.md:87`, `docs/VISION.md:95`): a builder technology tree that unlocks by building; faction-wide building levels.
- DEC-015 §3 (`docs/OWNER_DECISIONS.md:223`): "Technology & Knowledge Paths: Craft and construction unlocks", plus "Expansion & Failure Modes ... societal regression/collapse conditions" (`docs/OWNER_DECISIONS.md:225`).
- V63 (`docs/VISION.md:73`): skills grow by doing, and "a death loses everything they learned".
- Design only: `docs/design/EMERGENT_SOCIETY.md:49` ("Education needs teachers, learners, time, access and actual learning"), `docs/systems/DEUS_SKILLS_AND_PROFICIENCY_STANDARD.md:251` (skills are not inherited; learned through apprenticeship), `docs/design/AUTONOMOUS_CIVILIZATION.md:71` (settlement knowledge updated by observation).

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Tech path in the plan data | SOC.10.02 (`docs/society/DEUS_SOCIETY_WBS.md:59`) | yes |
| Class progression | SOC.11.01 | yes |
| Craft progression apprentice → master | SOC.12.01 (`docs/society/DEUS_SOCIETY_WBS.md:62`) | yes |
| Teaching as an act (teacher, learner, time) | SOC.12.01 names only the progression | nominal |
| Discovery and invention | none | no |
| Diffusion between settlements | none | no |
| Loss of knowledge, dark ages | SOC.10.02 "expansion & collapse rules", not about knowledge | nominal |
| Knowledge stores (books, libraries, scholars) | none | no |
| Rediscovery through archaeology | WG.65.17 "forgotten artifacts" | nominal |

Rating: **PARTLY PLANNED**.

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_Select.js:924` | `if (window.UF && UF.Tech && typeof UF.Tech.canBuild === "function") {` | DORMANT: `UF.Tech` is never defined outside a test stub. |
| `docs/design/TECH_TREE.md:3` | `Design written 2026-09-19 by Claude Code. **Not built.**` | The tech tree is a spec. |
| `DEUS_Colonists.js:423` | `// Population milestones: new plan steps that unlock as the colony grows.` | LIVE: the only unlocks are population milestones. |
| `DEUS_Colonists.js:5372` | `// Skills: one point per five jobs of the kind.` | LIVE: learning by doing, capped at 20. |
| `DEUS_Colonists.js:625` | `skillNames().forEach((name, i) => { out[name] = Math.floor(unit01(worldSeed, SALT.skill, unitId, i) * 6); });` | Newborn skills are seeded random 0-5, not taught. |
| `DEUS_Jobs.js:1610` | `if (unit && window.UF && UF.Proficiency && typeof UF.Proficiency.gainXp === "function") {` | DORMANT: the proficiency module is archived. |
| `DEUS_Colonists.js:5380` | `d.skills[skill] = Math.min(MAX_SKILL, (d.skills[skill] \| 0) + 1);` | Skill lives on the person and is lost with them, unrecorded. |
| `DEUS_Factions.js:670` | `discoverFaction: id => Factions.meet(id),` | LIVE: "met" is the only knowledge a faction has of another. |
| `docs/design/TECH_TREE.md:120` | `Unlocks are permanent: a node never locks again (§12 D4).` | The design rules out loss... |
| `docs/systems/UF_CultureGrowth.md:35` | `a faction's achieved knowledge never shrinks when a building is destroyed or its maker dies` | ...and so does the archived culture module, while DEC-015 asks for regression conditions. |

Code today: **PARTIAL** (learning by doing and population unlocks LIVE; research, teaching, diffusion and loss ABSENT; tech tree DORMANT).

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G5-1 | MAJOR | No knowledge-holder model: nothing says which person, settlement or record knows a technique, so knowledge cannot spread or be lost. | KNOW-01 |
| G5-2 | MAJOR | No row plans discovery or invention; SOC.10.02 lists a tech path but not how a faction first learns a step, and the tech tree is unbuilt. | KNOW-02 |
| G5-3 | MAJOR | Teaching is nominal: SOC.12.01 names apprentice-to-master progression without teachers, time or access; code has no teaching. | KNOW-03 |
| G5-4 | MAJOR | No row plans diffusion between settlements (by trade, migration, captives, captured records). | KNOW-04 |
| G5-5 | MAJOR | Loss and dark ages are unplanned, and two designs forbid them (unlocks permanent) while DEC-015 asks for regression conditions. This conflict needs the Owner (OQ-12). | KNOW-05 |
| G5-6 | MINOR | Knowledge stores (books, libraries, scholars) have no row; scholars exist only as calling labels. | KNOW-01, KNOW-05 |

**Proposed packages.**

- **PROPOSED-KNOW-01 Knowledge holders: persons, settlements and records** (G5-1, G5-6).
  - Scope: techniques as data IDs (from DEC-015 plan data); each named person holds a technique set; each settlement holds the union of its holders plus its records (books, carved instructions as objects); crowd cohorts hold counts of holders.
  - Depends on: SOC.10.02, SOC.12.01, MIND-01, MIND-08.
  - Acceptance tests: (1) a settlement's knowledge equals the union of its holders and records at every save; (2) demoting and promoting holders keeps each technique's holder count. Mutant: a settlement set that is never recomputed after a death must fail test 1.
  - Tick cost: event-driven (learn, death, record made or destroyed). Memory: 200 techniques → 25 B per named person; 5 KiB for 200 settlements; per record object 32 B.

- **PROPOSED-KNOW-02 Discovery and invention** (G5-2).
  - Scope: a technique is first learned by experiment (work near its prerequisites), observation of a foreign practice, or reading a record; chances from plan prerequisites and the person's skills and curiosity; the tech tree (V77) becomes the prerequisite graph of these techniques.
  - Depends on: KNOW-01, SOC.10.02, MIND-05.
  - Acceptance tests: (1) a technique cannot be discovered without its prerequisites; (2) with prerequisites met, discovery happens within the configured window on 3 seeds; (3) identical seeds give identical discovery order. Mutant: discovery that ignores prerequisites must fail test 1.
  - Tick cost: a check on work-completion events of eligible persons, about 1 event per tick × 2 µs.

- **PROPOSED-KNOW-03 Teaching and apprenticeship** (G5-3).
  - Scope: teaching as a duty (SOC.13.01) with a teacher, a learner, time and a place; learning rate from both skills; an apprentice who shadows a master gains the technique only by completed sessions (no copied mastery, per EMERGENT_SOCIETY).
  - Depends on: KNOW-01, SOC.12.01, SOC.13.01, MIND-04 (who teaches whom).
  - Acceptance tests: (1) no learner gains a technique without completed sessions; (2) a better teacher shortens learning by the configured factor; (3) a newborn has no taught technique. Mutant: free skill gain for being near a master must fail test 1.
  - Tick cost: session ends are events, a few per game hour; negligible.

- **PROPOSED-KNOW-04 Diffusion between settlements** (G5-4).
  - Scope: techniques move with people and records along the route graph (PROPOSED-LOG-01): migrants, traders, captives, captured books; a foreign technique observed at contact has a chance to be learned.
  - Depends on: KNOW-01, PROPOSED-LOG-01, PROPOSED-LOG-02, PROPOSED-WAR-06.
  - Acceptance tests: (1) an isolated settlement never gains a technique it cannot discover itself; (2) a trade route carries a technique to the partner within the configured window. Mutant: diffusion that ignores the route graph must fail test 1.
  - Tick cost: checked per contact event between settlements, a few per game day; negligible.

- **PROPOSED-KNOW-05 Loss, dark ages and rediscovery** (G5-5, G5-6).
  - Scope: if the last holder of a technique in a settlement dies and no record survives, the settlement loses it; records decay (SIM.40.07) or are destroyed; archaeology (WG.65.17) can recover a record and so the technique. Whether loss is allowed at all is the Owner's (OQ-12).
  - Depends on: KNOW-01, SIM.40.07, WG.65.17, PROPOSED-REC-04.
  - Acceptance tests: (1) killing the last holder with no record removes the technique from the settlement; (2) an excavated record restores it; (3) with the Owner's "permanent unlocks" option set, nothing is ever lost. Mutant: a technique kept after its last holder and record are gone must fail test 1 (loss option on).
  - Tick cost: an O(1) holder-count check on each death; negligible.

### 3.6 Health (priority 2)

**What the plan and the rules require.**
- V105 (`docs/VISION.md:116`): hit points decide death; large hits wound a body part (bleeding until bound, a hurt arm or leg); healers or rest mend them. VISION Q12 (injuries) is open (`docs/VISION.md:168`).
- V43 (`docs/VISION.md:59`): healing is one of the colony's labors.
- V139 / DEC-014 §4: "epidemic disease in dense settlements" as an anti-snowball pressure.
- SRD rules (section 2.6): conditions, six-level exhaustion, food and water, resting and hit dice, 3 diseases, 14 poisons, madness (`docs/SRD5_1_COVERAGE_MANIFEST.md:88`).
- Design only: the HEALER_DIRECTOR office (public health, quarantine, contagion response) in `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md`; SOC.13.01's inputs in that document include "injury, sickness".

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Hunger, thirst, fatigue arbitration | SOC.13.01, WB-002 | yes |
| Causes of death | SIM.20.01 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:528`) | yes |
| Natural lifespan and death | SIM.40.10 | yes |
| Wounds and bleeding | GP.07.01, only through `docs/SLICES.md:72` ("Body-part wounds, bleeding") | nominal |
| SRD conditions and exhaustion | none | no |
| Disease and contagion | none | no |
| Epidemics across settlements | none (DEC-014 §4 only) | no |
| Poison and venom | none | no |
| Healers, medicine, infirmaries | none | no |
| Magical healing and condition spells | none (SIM.60 covers physical effects; see section 4.2) | no |
| Madness | none | no |

Rating: **PARTLY PLANNED**.

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_Colonists.js:1618` | `if (n.daysWithoutFood > Math.max(1, 3 + conMod)) addExhaustion(u, 1, "hunger");` | LIVE: SRD starvation, checked daily. |
| `DEUS_Colonists.js:1589` | `n.exhaustion = Math.min(6, (n.exhaustion \| 0) + levels);` | LIVE: the six-level ladder... |
| `DEUS_Colonists.js:1594` | `dieOf(u, cause); // level 6 is death (SRD p. 358)` | ...and level 6 kills. |
| `DEUS_Environment.js:651` | `unit.data.hp = Math.max(0, unit.data.hp - coldDmg);` | LIVE: cold damage (heat at line 666). |
| `DEUS_Conditions.js:490` | `add(unit, conditionId, options = {}) {` | The conditions engine: nothing outside the file ever adds a condition. |
| `DEUS_Conditions.js:1159` | `tickAll(units, currentTick = now()) {` | Expiry would run through `tick` (line 1117) via `tickAll`, which has no caller, so timed conditions would never end. |
| `DEUS_Combat.js:773` | `const mod = Cond.attackRollModifiers(attacker, target, {` | LIVE on every attack; in practice only exhaustion and 0-HP unconsciousness can affect it. |
| `DEUS_Conditions.js:926` | `if (this.has(attacker, "poisoned")) disSources.push("attacker_poisoned");` | Poison is wired in but nothing ever poisons anyone. |
| `DEUS_Colonists.js:92` | `require("./UF_Sanitation.js");` | The disease module exists only in `archive/plugins/`, so... |
| `DEUS_Colonists.js:5396` | `S.infect(u, "dysentery");` | ...dysentery from bad water never fires: DORMANT. |
| `DEUS_HistoricalDemographics.js:482` | `if (!cause && rng() < Math.min(1, profile.diseaseMortality + (risk.disease \|\| 0))) cause = "disease";` | A flat yearly disease death rate, pre-game only, with no contagion. |
| `DEUS_Combat.js:889` | `if (remainingDamage >= targetMaxHp) {` | LIVE: massive damage kills outright; otherwise colonists start SRD dying... |
| `DEUS_Colonists.js:1972` | `if (d.failures >= 3) dieOf(u, "wounds");` | ...with death saving throws. No body parts, bleeding or infection. |
| `DEUS_Jobs.js:1162` | `define("stabilize", {` | LIVE: first aid (a Wisdom (Medicine) check). |
| `game/data/DEUS_WorldCatalog.json:11599` | `"jobs": [],` | The "healing" skill has no jobs. |
| `DEUS_Callings.js:31` | `[11, "Medic", "Critical"],` | A label with no medical behaviour. |
| `DEUS_Combat.js:1409` | `if (st.tick % every === 0) regen();` | LIVE, not SRD: every unit regains 1 HP per 100 combat ticks. Short rests and hit dice are ABSENT. |
| `DEUS_Colonists.js:2103` | `if (Number.isFinite(d.hp) && Number.isFinite(d.maxHp) && d.hp >= 1) d.hp = d.maxHp;` | LIVE: a long rest restores all HP. |
| `DEUS_DeathForensics.js:172` | `for (const c of ac) condList.push(typeof c === "string" ? c : c.id \|\| c.name);` | Defect: `Cond.all()` returns an object, so this throws, the error is swallowed and the condition list is always empty. |
| `DEUS_DeathForensics.js:51` | `const deathLedgerRecords = [];` | The death ledger is memory-only and lost on save and load. |

Code today: **PARTIAL**. SRD exhaustion, starvation, thirst, exposure, dying and death saves, first aid and long rest are LIVE; conditions other than exhaustion and unconsciousness, disease, poison, wounds, healers and short rest are DORMANT or ABSENT; the SRD data is staged (section 2.6). Tick: needs every 60 ticks, one pass over colonists; the rescue search is patients × colonists every 30 ticks (`DEUS_Colonists.js:5275`).

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G6-1 | BLOCKER | No row plans disease, contagion or epidemics, which V139 and DEC-014 §4 require as an anti-snowball pressure. The only disease code needs an archived module. | HEALTH-03 |
| G6-2 | MAJOR | No row owns SRD conditions in the simulation. The engine is loaded, but nothing applies conditions and nothing expires them; SIM.00.05's migration list does not name conditions. | HEALTH-01 |
| G6-3 | MAJOR | Wounds are nominal (Slice 7 text only) and the model depends on Q12. | HEALTH-02 |
| G6-4 | MAJOR | No row plans healers, medicine, herbs or infirmaries; the healing skill has no jobs and Medic is a label. | HEALTH-05 |
| G6-5 | MAJOR | No row plans poison or venom; 14 SRD poisons and creature venoms are staged. | HEALTH-04 |
| G6-6 | MAJOR | No row links the SRD healing, restoration, poison and disease spells to the health model (section 4.2); SIM.60.02's schema is for physical primitives. | HEALTH-06 |
| G6-7 | MINOR | Death forensics defects: condition list always empty, ledger not saved, old-age deaths classed as exhaustion (`DEUS_DeathForensics.js:260`). | HEALTH-07 |
| G6-8 | MINOR | Death from cold or heat skips the dying state and death saves (`DEUS_Environment.js:662`). | HEALTH-07 |
| G6-9 | MINOR | SRD short rests and hit-dice spending are absent, and the flat 1-HP regeneration is not an SRD rule. | HEALTH-01 |
| G6-10 | MINOR | SRD madness is staged with no row; whether to use it is the Owner's (OQ-02). | HEALTH-01 |

**Proposed packages.**

- **PROPOSED-HEALTH-01 Conditions, exhaustion and rest in the core** (G6-2, G6-9, G6-10).
  - Scope: one owner for conditions in the headless core, loaded from the SRD appendix PH-A entries as data; apply, stack and expire through a timer wheel keyed by expiry tick (no sweep); SRD short and long rests and hit dice; madness only if the Owner chooses (OQ-02).
  - Depends on: SIM.00.02, SIM.00.05, SOC.11.01.
  - Acceptance tests: (1) a table-driven test applies each of the 15 SRD conditions and checks its SRD effect; (2) a 10-minute condition ends at exactly its expiry tick; (3) a short rest spends hit dice by the SRD rule. Mutant: expiry never scheduled (today's behaviour) must fail test 2.
  - Tick cost: O(expirations) per tick, about 5 × 1 µs. Memory: 16 B per active condition; at 0.1 active conditions per person, 1.6 KiB per 1,000 named. Crowd: per-cohort counts of exhausted and incapacitated, 8 B per cohort.

- **PROPOSED-HEALTH-02 Injuries and wounds** (G6-3).
  - Scope: the Owner's choice under Q12 (OQ-13); at minimum V105's four body regions, bleeding until bound, reduced work and movement, mending by rest or a healer; wounds as mood sources (MIND-02).
  - Depends on: HEALTH-01, GP.07.01, MIND-02.
  - Acceptance tests: (1) a hit above the threshold wounds a region; (2) bleeding drains HP each interval until bound; (3) a leg wound slows movement by the configured factor. Mutant: binding that does not stop bleeding must fail test 2.
  - Tick cost: bleeding persons only, about 8 at L0 × 1 µs per tick. Memory: 16 B per wounded person.

- **PROPOSED-HEALTH-03 Disease, contagion and epidemics** (G6-1).
  - Scope: diseases as data (SRD samples plus Owner-approved additions, OQ-14); named persons carry infection state; crowd settlements run a compartment model (susceptible, exposed, infected, recovered) at L2; spread by contact events (MIND-02), bad water (SIM.50.02) and travel along the route graph (PROPOSED-LOG-01); density raises transmission (DEC-014 §4); quarantine by the healer office.
  - Depends on: HEALTH-01, PROPOSED-LOG-01, SIM.30.01, SIM.30.02, SIM.50.02, MIND-02.
  - Acceptance tests: (1) a seeded outbreak spreads along the contact and route graph; an isolated settlement stays clean; (2) doubling density raises the attack rate by the configured factor; (3) compartment counts always sum to the settlement population; (4) quarantine lowers spread. Mutant: contagion that ignores the graph must infect the isolated settlement and fail test 1.
  - Tick cost: named: one infection check per contact event, about 4.5 × 1 µs per tick. Crowd: 200 settlements × up to 3 active diseases stepped every 100 ticks = 6 updates × 2 µs = 12 µs per tick; route transmission once per game day per edge, about 600 edges ÷ 2,400 = 0.25 per tick. Memory: 8 B per named person, 16 B per settlement per active disease.

- **PROPOSED-HEALTH-04 Poison and venom** (G6-5).
  - Scope: the 14 SRD poisons and creature venoms as data (delivery, save, effect), applied through HEALTH-01; antitoxin; poison crafting only if the Owner allows it.
  - Depends on: HEALTH-01, WG.68.07, SOC.12.01.
  - Acceptance tests: (1) a venomous bite applies the stat block's poison and save; (2) antitoxin gives advantage by the SRD rule. Mutant: a failed save that does not apply the poisoned condition must fail test 1.
  - Tick cost: event-driven; negligible.

- **PROPOSED-HEALTH-05 Care: healers, medicine, infirmaries and herbs** (G6-4).
  - Scope: diagnose and treat as duties (SOC.13.01) with the healing skill; medicine and herbs as real items made from flora (SIM.50.04) and consumed (mass conserved); an infirmary as a room with beds; a healer office for quarantine and triage (SOC.20.01).
  - Depends on: HEALTH-01, HEALTH-02, HEALTH-03, SOC.12.01, SOC.13.01, SOC.20.01, SIM.50.04.
  - Acceptance tests: (1) a patient is treated by the best free healer in range; (2) treatment consumes the named supplies; with none, it fails; (3) recovery in an infirmary is faster by the configured factor. Mutant: treatment without supplies must fail test 2.
  - Tick cost: a patient check once per game hour, up to 20 patients ÷ 100 ticks × 5 µs ≈ 1 µs per tick. Memory: about 32 B per patient record.

- **PROPOSED-HEALTH-06 Magical healing and condition spells** (G6-6).
  - Scope: the entity-level half of the spell schema: SRD healing, restoration, poison, disease and curse spells (Cure Wounds, Lesser and Greater Restoration, Protection from Poison, Contagion, Remove Curse and the rest) act on HEALTH-01..04 state with SRD numbers unchanged (DEC-018); material components are real items.
  - Depends on: SIM.60.02, SOC.11.01, HEALTH-01..04.
  - Acceptance tests: (1) Lesser Restoration ends exactly one of the conditions or diseases the SRD lists; (2) Cure Wounds heals its SRD dice plus modifier, unchanged from the SRD entry; (3) a spell with a consumed component removes that item. Mutant: Restoration ending an unlisted condition must fail test 1.
  - Tick cost: per cast event; negligible.

- **PROPOSED-HEALTH-07 Death forensics and exposure deaths** (G6-7, G6-8). Fold into the existing SIM.20.01 if the coordinator prefers; the outline lists the tests to add.
  - Scope: read `Cond.all()` correctly; save the death ledger (or move it into PROPOSED-REC-01); classify old age separately; route cold and heat damage through the dying state.
  - Depends on: SIM.20.01, HEALTH-01, PROPOSED-REC-01.
  - Acceptance tests: (1) a poisoned person who dies has "poisoned" in the forensic record; (2) the ledger survives save and load; (3) a cold-damage drop to 0 HP starts dying, not instant death. Mutant: the swallowed exception restored must fail test 1.
  - Tick cost: per death event; 64 B per saved ledger record.

### 3.7 Travel and logistics (priority 5)

**What the plan and the rules require.**
- V19 (`docs/VISION.md:28`): migrants, traders and raiders arrive at the edges.
- DEC-013 §6: races travel and trade across all 32 layers. DEC-020 / WG.00.20: ramps, stairs and ladders are multi-Z pathfinding connectors. DEC-019 / WG.00.19: movement by stratum height.
- V139 / DEC-014 §4: "supply/logistical strain" as a counter-pressure.
- V71: trade rules need approval. SOC.33.01 plans tariffs; SOC.30.02 plans coin circulation including colonist purchase.
- `docs/PERFORMANCE_ARCHITECTURE.md:360` §21: off-screen entities travel along abstract regional node graphs.
- SRD: travel pace (`game/data/srd51/rules.json:4331`), mounts and vehicles (`game/data/srd51/rules.json:3004`), carrying capacity.
- Frozen standard, not built: `docs/systems/DEUS_RESOURCE_ECONOMY_STANDARD.md:9` (reach bands in haul-days, trade expeditions).

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Roads as terrain | SIM.50.08 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:551`) | yes |
| Cross-layer connectors and multi-Z pathfinding | WG.00.20 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`), WG.00.19 | yes |
| One movement model in the core | SIM.00.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:523`) | yes |
| Stockpiles and quartermaster | SOC.32.01 | yes |
| Coin circulation, tariffs | SOC.30.02, SOC.33.01 | yes |
| Cross-layer trade between races | WG.62.02 (one clause) | nominal |
| Hauling as work | GP.04.01 (Slice 4) | nominal |
| Off-screen travel between settlements at LOD | SIM.30.02 names populations, not travel | nominal |
| Caravans and trade routes | none | no |
| Markets and exchange | SOC.30.02 "Colonist Purchase" | nominal |
| Pack animals, mounts, vehicles, boats | none | no |
| Supply lines for armies and outposts | none | no |

Rating: **PARTLY PLANNED**.

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_World.js:127` | `areasX: num("AreasX", 1),` | One 256 × 256 area; every settlement shares it. |
| `DEUS_World.js:1628` | `// Off screen, walkers on their own area follow a planned path on their own level, one cell per step` | Off-screen travel is the same cell stepping; there is no abstract travel. |
| `DEUS_World.js:2064` | `const is3D = !!(opts.z3d \|\| gz !== sz \|\| (st.version >= 4));` | LIVE: 3D A* over all five levels... |
| `DEUS_World.js:2067` | `const totalNodes = 5 * n;` | ...sized by level count × area, 327,680 nodes per search. |
| `DEUS_Levels.js:63` | `const SHAPES = Object.freeze({ solid: 1, floor: 2, open: 3, ramp: 4, stairUp: 5, stairDown: 6, stairBoth: 7 });` | Ramps and stairs are the only connectors. |
| `DEUS_Levels.js:2085` | `shaftChance: 0.4, shaftReach: 20,` | Shafts are carved, but A* has no climb or fall edge; ladders are art names only. |
| `DEUS_NaturalConnections.js:31` | `const VERSION = 1, TYPE = "natural_travel", DEPTHS = [0, -1, -2];` | Natural passages go only from the ground down and are not in the A* graph. |
| `DEUS_Jobs.js:1412` | `const candidates = open().filter(j => sameLevel(j.target, unit) && matches(j, filter));` | LIVE: open jobs are same-level only... |
| `DEUS_Stockpiles.js:584` | `const piles = Stockpiles.all(uArea, uZ, factionId)` | ...and so are haul destinations: autonomous work and hauling never cross a layer. |
| `DEUS_Jobs.js:610` | `define("haul", {` | LIVE: two-phase hauling within a settlement. |
| `DEUS_Dnd5e.js:625` | `const maxWeight = Math.round(str * 15 * mult * 10) / 10;` | SRD carrying capacity, enforced on pickup... |
| `DEUS_Items.js:504` | `speedPenalty: curWeight > maxWeight ? 1.5 :` | ...but the speed penalty is never read, and item mass is in kilograms (line 404) against a limit in pounds. |
| `DEUS_World.js:1875` | `R = (window.UF && UF.Roads) \|\| null;` | No loaded plugin defines roads; the roads plugin is archived (`docs/systems/UF_Roads.md:3`)... |
| `DEUS_World.js:1845` | `const STEP_COST = 5, DIAG_COST = 7;` | ...and every step costs the same, so a road would not change a route. |
| `DEUS_Colonists.js:3148` | `function stepMerchantCaravan(ref) {` | A caravan with a pack sheep (line 3190) exists, exported but never called: DORMANT. |
| `DEUS_Colonists.js:648` | `// Internal Barter & Credit Ledger` | LIVE: credits inside the colony; no exchange between factions. |

Code today: **PARTIAL** (hauling inside one settlement on one level and 3D A* over stairs and ramps are LIVE; roads, caravans, markets, pack animals, vehicles, supply and inter-settlement travel are DORMANT or ABSENT). Tick: 4 new path plans per map update; off-screen units step every 16 frames.

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G7-1 | MAJOR | No row plans travel between settlements at LOD: a regional route graph across 32 layers that off-screen travellers, caravans, armies, migrants and disease use. SIM.30.02 names summaries, not travel; §21's regional graphs are not a WBS row. Today's A* reserves arrays sized by levels × area. | LOG-01 |
| G7-2 | MAJOR | Autonomous work and hauling never cross a layer. WG.00.20 plans connectors for movement, but no row plans cross-layer job and haul routing, which home bands spanning up to 8 layers need. | LOG-01 |
| G7-3 | MAJOR | No row plans caravans, trade routes or markets, though V19, SOC.30.02 and SOC.33.01 assume trade exists. | LOG-02, LOG-03 |
| G7-4 | MAJOR | No row plans pack animals, mounts, carts or boats (SRD mounts and vehicles; V43 animal care). | LOG-04 |
| G7-5 | MAJOR | No row plans supply lines or logistical strain (V139). | LOG-05 |
| G7-6 | MINOR | Encumbrance: the speed penalty is computed but never read, and mass units disagree (kg against lb). | LOG-04 |
| G7-7 | MINOR | Roads would not change routes: every step costs the same, and SIM.50.08 plans roads as terrain only. | LOG-01 |
| G7-8 | MINOR | Shafts, ladders and natural passages are not pathfinding edges. | LOG-01 |

**Proposed packages.**

- **PROPOSED-LOG-01 Regional route graph and off-screen travel across 32 layers** (G7-1, G7-2, G7-7, G7-8).
  - Scope: a sparse graph of region portals (ADR-003's 32 × 32 × 2-layer regions) whose edges include stairs, ramps, ladders, shafts and natural passages (WG.00.20), weighted by surface (roads cheaper, SIM.50.08) and hazards; rebuilt only for dirty regions; off-screen travellers advance along edges at L1 or L2; cross-layer job and haul routing uses the same graph; SRD travel pace for speeds.
  - Depends on: SIM.00.04, WG.00.17, WG.00.20, SIM.30.01, SIM.50.08.
  - Acceptance tests: (1) a traveller from layer −6 to +2 reaches the goal through connectors only; (2) an off-screen trip and an on-screen trip over the same route take the same number of ticks (±1 region step); (3) a road edge is chosen over an equal-length rough edge; (4) a change inside one region rebuilds only that region's edges (instrumented counter). Mutant: a graph without shaft or ladder edges must fail test 1 on the shaft fixture.
  - Tick cost: travellers at L1 stepped every 10 ticks, about 300 ÷ 10 = 30 updates × 1 µs = 30 µs per tick; region rebuild about 0.5 ms per dirty region, rare. Memory: about 4 portal nodes × 16 B per traversable region; at most 1,024 regions × 64 B = 64 KiB per area; solid or empty-sky regions with no portals cost nothing (A-6).

- **PROPOSED-LOG-02 Caravans and trade routes** (G7-3).
  - Scope: caravans as real parties with goods, animals and guards, sent from surplus to demand along LOG-01; atomic exchange at arrival (revalidate quantities, ownership, location and willingness, then commit both sides; EMERGENT_SOCIETY); tariffs by SOC.33.01; routes remembered and reused. Trade rules need the Owner (OQ-16).
  - Depends on: LOG-01, LOG-04, SOC.30.02, SOC.33.01, WAR-01.
  - Acceptance tests: (1) a trade commits both sides or neither; mass and coin are conserved; (2) a caravan is sent only with surplus at home and demand at the destination; (3) raiding a caravan moves its goods, never deletes them. Mutant: a half-committed trade must fail test 1.
  - Tick cost: caravans travel as LOG-01 travellers; one route decision per settlement per game day, negligible. Memory: about 64 B per caravan plus its item list.

- **PROPOSED-LOG-03 Markets and exchange** (G7-3).
  - Scope: a market as a place with sellers, buyers and prices from local supply and demand; coin or barter per OQ-16; households buy from producers (SOC.30.02).
  - Depends on: LOG-02, SOC.30.02, MIND-06 (wants).
  - Acceptance tests: (1) scarcity raises the local price by the configured rule; (2) no sale happens without both parties present and willing. Mutant: a price that ignores stock must fail test 1.
  - Tick cost: per transaction event; about 256 B per market.

- **PROPOSED-LOG-04 Pack animals, mounts, carts and boats** (G7-4, G7-6).
  - Scope: SRD mounts and vehicles as data; draft and pack animals from livestock (SIM.40.10, WG.68.14) with capacity and care needs; carts and boats as items with capacity and terrain limits; the speed penalty read in movement; one mass unit.
  - Depends on: LOG-01, SIM.40.10, WG.68.14.
  - Acceptance tests: (1) a cart moves more mass per trip than a person by the SRD rule; (2) a heavily loaded person moves at the SRD encumbered speed; (3) all item masses and limits use one unit (validator). Mutant: the unused speed penalty (today's behaviour) must fail test 2.
  - Tick cost: capacity lookups at haul planning; negligible. Memory: 16 B per vehicle.

- **PROPOSED-LOG-05 Supply for armies, outposts and sieges** (G7-5).
  - Scope: forces and outposts consume food, water and ammunition from carried stores or supply trains along LOG-01; strain rises with distance and route danger; unsupplied forces lose morale (MIND-03) and health (HEALTH-01).
  - Depends on: LOG-01, LOG-02, SOC.32.01, SOC.42.01, WAR-04.
  - Acceptance tests: (1) an army far from its supply consumes stores at the configured rate and suffers when they run out; (2) cutting a supply route raises strain within one game day. Mutant: consumption that does not draw down stores must fail test 1.
  - Tick cost: each army or outpost once per game hour, up to 10 ÷ 100 ticks × 5 µs, negligible.

### 3.8 Records and legends (priority 7)

**What the plan and the rules require.**
- V134 and INV-SIM-01: history is not pre-materialised; it emerges through live simulation.
- V63 (`docs/VISION.md:73`): "the chronicle says who was lost".
- LIFE-003 (`docs/RISK_REGISTER.md:62`): ruins and history must not be erased too fast.
- The brief: records should feed "the history-born D&D character mode". No repository document defines that mode (area 9).

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Per-person life chronicle and biography | SOC.51.01 (`docs/society/DEUS_SOCIETY_WBS.md:110`) | yes |
| History and population records | SIM.10.01 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:526`), SIM.10.02 | yes (pre-game path) |
| Place names from events | WG.63.06 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:212`) | yes |
| Terrain provenance | WG.65.16 | yes |
| Archaeology | WG.65.17 | yes |
| Ruins and traces | SIM.40.08, SIM.50.09 | yes |
| A live history clock during play | none | no |
| One world event log (typed, compacted, saved) | none (SIM.30.01 "history counters" only) | no |
| Renown, reputation, rumour | none | no |
| Artifacts and item provenance | WG.65.17 "forgotten artifacts" | nominal |
| Famous figures and legends | none | no |
| History-born character export | none | no |

Rating: **PARTLY PLANNED**.

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_History.js:861` | `History.addEvent = function(e) {` | LIVE chronicle writer... |
| `DEUS_Combat.js:1064` | `H.addEvent({ type: "death", text, factions: fid ? [fid] : [], area, x, y });` | ...fed by deaths in combat and broken doors (`DEUS_Doors.js:448`) only. |
| `DEUS_History.js:869` | `const keep = (History.config() && History.config().eventsKept) \|\| 400;` | The chronicle keeps 400 text events. |
| `DEUS_HistoricalDemographics.js:216` | `state.events.push({ id: state.nextEventId++, year: state.currentYear, type, factionId, siteId` | The typed ledger (foundings, births, deaths, successions) exists only on the pre-game path. |
| `docs/systems/UF_History.md:92` | `synchronization back into the historical snapshot is not implemented` | Births and deaths in play never reach the ledger. |
| `DEUS_History.js:3660` | `Input.keyMapper[72] = "ufChronicle";` | LIVE: H opens the chronicle. |
| `DEUS_Talk.js:387` | `The newest chronicle event of the unit's faction (at its site first)` | LIVE: "news" reads the chronicle directly; news does not travel between people. |
| `DEUS_History.js:417` | `History.genealogy = function(id, state = UF.World.state) {` | An API with no caller in play. |
| `docs/systems/UF_History.md:98` | `**Roadmap only: requirements prepared under ASTRA-16; implementation NOT STARTED.**` | The lore and genealogy viewer has not been started. |
| `DEUS_HistoricalDemographics.js:259` | `chosen.title = faction.rulerTitle; chosen.wasRuler = true; chosen.pedigreeAnchor = true;` | Rulers are the only notable figures. |
| `DEUS_History.js:547` | `site.ruined = ds.isRuined ? ds.abandonedYear : null;` | `isRuined` is never set true (SIM.50.01 X-7), so no site becomes a ruin. |
| `DEUS_Items.js:288` | `* opts = { mat, q } optional material and quality.` | Items carry no maker, name or history. |
| `DEUS_History.js:493` | `const dnd = Dnd.assignClass(stats, statsSeed, p.id, p.species);` | Every materialised citizen gets an SRD class, the nearest thing to a history-born character; there is no way to pick one as a player character. |
| `DEUS_DeathForensics.js:51` | `const deathLedgerRecords = [];` | The death ledger is not saved (area 6). |

Code today: **PARTIAL** (a thin, capped text chronicle is LIVE; the typed ledger runs pre-game only; renown, artifacts, legends and the history-born export are ABSENT).

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G8-1 | BLOCKER | No row plans a live history clock: the people processes (aging, grief, succession, disease deaths, ledger updates) run only on the pre-game path that a Year-0 game skips (P-02, section 2.2). SIM.40.10 plans the biology, but nothing plans routing live events into the historical record. | REC-01 |
| G8-2 | MAJOR | No row plans one world event log. The chronicle is 400 text lines, the death ledger is not saved, and SOC.51.01 is per person. Memories (MIND-02), crimes (GOV-02), renown and legends all need events with stable IDs. | REC-01 |
| G8-3 | MAJOR | No row plans renown, reputation or rumour (deeds known by others through social spread). | REC-02 |
| G8-4 | MAJOR | Artifacts and item provenance are nominal (WG.65.17's "forgotten artifacts"); items have no maker or history. | REC-03 |
| G8-5 | MAJOR | Site histories and ruins: no site becomes a ruin, and no row ties a ruin to the events that made it (SIM.50.09 and SIM.40.08 cover the physical side). | REC-04 |
| G8-6 | MAJOR | The history-born D&D character mode named in the brief is defined in no repository document; no row plans exporting a historical person as an SRD character. The mode itself is the Owner's (OQ-18). | REC-05 |
| G8-7 | MINOR | Legends and genealogy queries: the API has no caller and the viewer (HIST-11) is not started. | REC-02 |

**Proposed packages.**

- **PROPOSED-REC-01 World event log and live history clock** (G8-1, G8-2).
  - Scope: one append-only, typed event store with stable IDs (deaths, births, pairings, crimes, battles, offices, discoveries, foundings, abandonments), each with participants, place, layer and tick; subscribes to live events and to `time:day` / `time:year` so the historical ledger stays current in play; compaction keeps all deaths, births, battles and offices and trims low-significance events per person beyond a cap; saved; the chronicle and the death ledger become views of it.
  - Depends on: MIND-01 (event record), SIM.00.02, SIM.00.06, SIM.40.10, SOC.51.01.
  - Acceptance tests: (1) a death in play appears in the log, in the person's biography and in the historical ledger; (2) the log survives save and load byte-identical; (3) compaction never drops a death, birth or battle; (4) a 100-game-year run stays under the size cap. Mutant: a live death that never reaches the ledger (today's behaviour) must fail test 1.
  - Tick cost: significant events are rare (A-7 puts about 0.2 per tick at N = 1,000); an append costs about 1 µs. Memory: 32 B per event plus references; with a cap of 64 events per named person and all vital events kept, about 2 MiB for 1,000 named persons; crowd events are aggregated per settlement per game day (about 64 B each).

- **PROPOSED-REC-02 Renown, reputation, rumour and legends** (G8-3, G8-7).
  - Scope: renown per person and faction from logged deeds; rumours travel as beliefs through social ties (MIND-02, MIND-04), can be wrong, and fade; "legend" status for persons whose renown passes a threshold; text-only legends and genealogy queries for the sheet and look views.
  - Depends on: REC-01, MIND-02, MIND-04.
  - Acceptance tests: (1) a deed witnessed by one person spreads to that person's ties at the configured rate and not to strangers; (2) a false rumour can exist alongside the true event and is marked as belief, not truth; (3) the genealogy query returns parents and children from the log. Mutant: rumour spread without ties must fail test 1.
  - Tick cost: piggybacks on MIND-02 social events (about 4.5 × 1 µs per tick). Memory: 4 B renown per person; rumour beliefs share MIND-01's memory ring.

- **PROPOSED-REC-03 Artifacts and item provenance** (G8-4).
  - Scope: notable items (made by a master, used in a logged deed, a relic of a faith) carry a maker, a name slot (Owner-approved naming, AGENTS.md rule 7) and a provenance chain of event IDs; durable relics survive decay and burial (SIM.40.07) and can be found (WG.65.17).
  - Depends on: REC-01, SOC.12.01, SIM.40.07, WG.65.17.
  - Acceptance tests: (1) an item used to kill a named figure gains that event in its chain; (2) the chain survives burial and excavation. Mutant: provenance lost on save must fail test 2.
  - Tick cost: event-driven. Memory: about 64 B per artifact; about 1,000 artifacts per game century ≈ 64 KiB.

- **PROPOSED-REC-04 Site histories and ruins** (G8-5).
  - Scope: each site keeps its founding, rulers, battles and abandonment as event references; an abandoned site becomes a ruin (with SIM.50.09 and SIM.40.08 on the physical side) that later settlers and archaeologists can learn about.
  - Depends on: REC-01, SIM.50.09, SIM.40.08, WG.65.17.
  - Acceptance tests: (1) a site abandoned in play becomes a ruin with its history attached; (2) the ruin's history names real events and persons. Mutant: `isRuined` never set (today's behaviour) must fail test 1.
  - Tick cost: event-driven. Memory: about 256 B per site; 500 sites ≈ 128 KiB.

- **PROPOSED-REC-05 Historical person export (data feed for the history-born mode)** (G8-6).
  - Scope: data only: a read-only export of one historical person as SRD 5.1 character fields (race, class and level from SOC.11.01, ability scores, background built from their logged life, bonds from MIND-04 ties, flaws from MIND-05, equipment and artifacts from REC-03). How and when a player uses it is the Owner's (OQ-18); this package defines no mode.
  - Depends on: REC-01, REC-03, MIND-04, MIND-05, SOC.11.01.
  - Acceptance tests: (1) the export validates against the SRD character fields; (2) every bond in the export names a real tie; (3) exporting the same person twice from the same state is identical. Mutant: a bond with no tie behind it must fail test 2.
  - Tick cost: none (an offline query).

### 3.9 The player's role per mode (priority 9)

**What the plan and the rules require.**
- V4 (`docs/VISION.md:16`): no protagonist; the player is given one generated faction.
- V5 and V17: the player commands the way DF does; orders are never required.
- V125 (`docs/VISION.md:122`): "The player is God (may observe, intervene, alter history, or do absolutely nothing; the world must continue regardless)".
- V29 (`docs/VISION.md:37`): U7-style combat mode, per-character attack modes, click targeting.
- DEC-020 (`docs/OWNER_DECISIONS.md:288`): the camera follows "the player unit" across ramps, which assumes a player unit exists.
- DEC-017 (`docs/OWNER_DECISIONS.md:243`) keeps RMMZ "battle screens", while ADR-001 says DEUS does not use them (`docs/adr/ADR-001-RMMZ-Battle-Stack-Audit.md:37`); see `escalation.md` E3.
- VISION Q4 (`docs/VISION.md:163`) and OD-16 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:718`): possession vs command is open; the recommended default is "Both modes, switchable".
- The docs name three modes: Command, Combat and Incarnate (`docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md:179`, `docs/systems/DEUS_Minimap.md:137`).

**Overlord mode (flagged, not designed).** No WBS row, VISION row, DEC, OD, ADR, system page or design document mentions an Overlord mode. A search of the base for "overlord" (case-insensitive, excluding this lane's folder) finds only: a game title in `docs/design/CRAFTING.md:71`; the word in an unapproved proposal (PE21, PE3) listing terms that must not be used in the swarm and star-born peoples' own names (`docs/design/PEOPLES.md:53`, `docs/design/PEOPLES.md:278`); and a DF-derived ruler title in `game/data/df_entities.json:95` and two tools. What is undefined: what the mode is; what the player can do and see in it; how it relates to Command, Incarnate and V125's "God"; whether it has powers ("intervene, alter history"); how it enters and leaves; and whether the name is final. These are Owner questions OQ-19 and OQ-20. No package below covers Overlord.

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Command mode: orders and policies | SOC.50.01 (`docs/society/DEUS_SOCIETY_WBS.md:109`), WG.00.11 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:99`) | yes (one line each) |
| All player intents through one command queue | SIM.00.03 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:522`) | yes |
| Incarnate mode (possession) | WG.00.11 | yes (one line) |
| Mode switching and input arbitration | WG.00.11 | yes (one line) |
| Combat mode: drafting and combat orders | GP.07.01 via `docs/SLICES.md:72` | nominal |
| Overlord mode | none | no (Owner-designed) |
| V125 God role and its powers | none | no |
| History-born character mode | none | no |

Rating: **PARTLY PLANNED**.

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_ColonyOverseer.js:17` | `The player is an overseer, not a character on the map (VISION V4):` | LIVE: the player has no body on the map. |
| `DEUS_ColonyOverseer.js:169` | `Game_Player.prototype.moveByInput = function() {};` | LIVE: no walking body can be steered. |
| `DEUS_ColonyOverseer.js:296` | `Col.order(selUnit.id, { type: "move", target: { x: mx, y: my } });` | LIVE: right-click moves the selected colonist. |
| `DEUS_Select.js:25` | `Left-drag with no tool: selects all player units inside the box.` | LIVE: box selection and designations (Command mode in practice). |
| `DEUS_Combat.js:53` | `const MODES = ["nearest", "weakest", "strongest", "protect", "defend", "flee", "manual"];` | LIVE for AI: per-unit attack modes... |
| `DEUS_Combat.js:1102` | `Combat.setMode = function(unit, mode) {` | ...but nothing in play calls the setter. |
| `DEUS_Colonists.js:1868` | `const isDrafted = u => !!(u && u.data && (u.data.drafted === true` | Drafting is read but only a test sets it; the overseer adapter sets `drafted: false` (`DEUS_ColonyOverseer.js:75`). |
| `DEUS_Combat.js:1475` | `Input.keyMapper[75] = "ufCombatRaid"; // K` | The only combat key is a debug raid. |
| `DEUS_Minimap.js:421` | `if (m === "command" \|\| m === "combat" \|\| m === "incarnate") {` | A mode setter that nothing calls... |
| `DEUS_Minimap.js:569` | `const modeTag = Minimap.mode === "command" ? "CMD" : (Minimap.mode === "combat" ? "CBT" : "INC");` | ...so the minimap label always reads CMD. |
| `DEUS_Minimap.js:108` | `incarnatedUnitId: null, // For incarnate mode` | DORMANT: never read. |
| `DEUS_Interact.js:493` | `add("follow", "Follow with camera", () => selectColonist(hit, true));` | LIVE: camera follow, which is not possession. |
| `tasks/WG.00.11/state.md:1` | `# Task State: WG.00.11 — Standard New Game Year 0 Contract (INV-SIM-01)` | The WG.00.11 task folder holds the Year-0 contract (now WG.00.14), not the Incarnation layer. |

Code today: **PARTIAL** (Command in practice LIVE; Combat autonomous only; Incarnate and switching DORMANT or ABSENT; Overlord ABSENT).

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G9-1 | MAJOR | WG.00.11 is one line: no list of modes, no switching rules, no input arbitration; the mode state in code is never set. The row's ID also collides with the Year-0 task folder. | MODE-01 |
| G9-2 | MAJOR | Command mode's policy side (SOC.50.01) is one line; the V52 "band orders" design is unbuilt (`docs/design/CHAIN_OF_COMMAND.md:34`). | MODE-02 |
| G9-3 | MAJOR | The player's part in combat (V29 toggle, drafting, click targeting) is nominal; the setter and drafting are dormant; DEC-017 and ADR-001 disagree about battle screens (E3). | MODE-03 |
| G9-4 | MAJOR | Incarnate mode waits on OD-16 / Q4, and it needs a per-person view of what that person knows and sees (MIND and DEEP packages). | MODE-04 |
| G9-5 | MAJOR | Overlord mode, and V125's "God" role it may or may not be, are undefined in every document. Owner-designed: listed as Owner questions only, no package. | none (OQ-19, OQ-20) |

**Proposed packages** (non-Overlord only).

- **PROPOSED-MODE-01 Mode framework and input arbitration** (G9-1).
  - Scope: a mode is a policy on which commands the player may send and what the view shows; every player intent enters the simulation through SIM.00.03's command queue; switching rules and precedence; V125's rule that the world runs the same with no input; the WG.00.11 ID collision recorded for the coordinator.
  - Depends on: SIM.00.03, WG.00.11, OD-16.
  - Acceptance tests: (1) in every mode, a purity lint shows no mode writes simulation state except through the queue; (2) replaying a command log reproduces the state checksum; (3) a run with no input produces the same checksum whichever mode is active. Mutant: a mode that writes a unit's position directly must fail test 1.
  - Tick cost: per command only; no per-tick cost.

- **PROPOSED-MODE-02 Command mode: direct orders and policies** (G9-2).
  - Scope: direct orders to a person, band orders to a leader (V52), and policy decrees through offices (SOC.50.01), all as queued commands that the duty scheduler (SOC.13.01) weighs.
  - Depends on: MODE-01, SOC.20.01, SOC.50.01, SOC.13.01, GOV-06.
  - Acceptance tests: (1) a decree becomes office tasks and then duties; (2) a direct order outranks a band order, and survival outranks both (V17). Mutant: a decree that bypasses the offices must fail test 1.
  - Tick cost: per command.

- **PROPOSED-MODE-03 Combat mode: drafting, attack modes and targeting** (G9-3).
  - Scope: a combat-mode toggle, drafting (drafted people take no work), per-person attack modes reachable from the UI, click targeting including other layers (GP.07.02); on-map or battle-screen per the Owner's answer to E3.
  - Depends on: MODE-01, GP.07.01, GP.07.02, OQ-21.
  - Acceptance tests: (1) a drafted person takes no job; (2) the attack-mode command reaches `setMode`; (3) a click on a visible target on a lower layer issues a legal attack. Mutant: drafting that does not stop job-taking must fail test 1.
  - Tick cost: per command; drafted persons are skipped by job search (a saving).

- **PROPOSED-MODE-04 Incarnate mode: one person, their knowledge** (G9-4).
  - Scope: control of one person while the rest of the colony stays autonomous (V125); the view shows only what that person has seen or heard (MIND-02 beliefs, DEEP-02 vision, light from DEEP-01); release returns the person to autonomy.
  - Depends on: MODE-01, OD-16, MIND-02, DEEP-01, DEEP-02, SIM.30.04 (focus follows the person).
  - Acceptance tests: (1) the incarnate view never shows a unit the person has not perceived; (2) the rest of the faction keeps working (same duty counts as a no-input run); (3) releasing control resumes autonomous duty within one decision. Mutant: a view that shows all units must fail test 1.
  - Tick cost: the person's surroundings join the L0 focus (at most 9 regions); the perception filter reuses DEEP-02 queries.

### 3.10 Underground life (priority 3)

**What the plan and the rules require.**
- DEC-013 (`docs/OWNER_DECISIONS.md:187`): layers −16..+15; below the surface, Lower-1 (−8..−1) and Lower-2 (−16..−9), 16 layers and 10 of the 25 biomes; races have home layer ranges (race-to-band mapping OPEN).
- V132 (`docs/VISION.md:126`): tieflings and dragonborn found on the deepest level, dwarves and gnomes on the next; the code does the same (`DEUS_Factions.js:149`, `DEUS_Factions.js:150`).
- V134 / WG.90.01: a viable living Year-0 world for all nine factions.
- DEC-011: no tint, fog filter or shading overlay for layers; any presentation of darkness is out of scope here.
- Design only: `docs/worldgen/DEUS_CREATURE_ECOLOGY.md:217` (cave beetles, blind fish and bats feeding on subterranean fungi) and `:219` (torchlight and mining lower a cave predator's habitat); `docs/design/VERTICAL_NATURAL_WORLD.md:416` (cave homes need torches and lamps).
- SRD (section 2.6): bright light, dim light and darkness (`game/data/srd51/rules.json:4403`); darkvision on six of the nine races, none on human, halfling and dragonborn (`game/data/srd51/character_options.json:82`); 175 of 317 creatures have darkvision, 7 have Sunlight Sensitivity (`game/data/srd51/creatures.json:16444`); torch 1 hour (`game/data/srd51/equipment.json:4134`), hooded lantern 6 hours per pint of oil (`game/data/srd51/equipment.json:3457`); Light, Daylight, Continual Flame and Darkness spells. No SRD creature has an environment or habitat field, and "Underdark" occurs 0 times.

**Coverage by the WBS.**

| Sub-element | WBS row that names it | Covered? |
|---|---|---|
| Karst caves, fissures | WG.64.01, WG.64.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:223`) | yes |
| Underground heat | WG.64.06 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:228`) | yes |
| Aquifers, cave lakes, underground rivers | WG.66.01, WG.66.03 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:270`), SIM.50.02 | yes |
| Cave creatures, lairs, habitat | WG.68.07-.10 (generic, `docs/worldgen/DEUS_WORLDGEN_WBS.md:308`) | yes (generic) |
| Race home layers | WG.62.02 | yes |
| Food web base underground | WG.68.09 (generic food web) | nominal |
| Cave flora and fungus succession | none (WG.68.01-.02 are the five surface biomes) | no |
| Simulation light field | none (WG.00.22 is presentation catalogue slots for "deep light sources") | no |
| Vision and darkvision | none | no |
| Light sources and fuel | none | no |
| Underground farming | none | no |
| Year-0 viability of underground starts | none (WG.90.01 is the overall gate) | no |

Rating: **PARTLY PLANNED**.

**What exists in code.**

| Citation | Excerpt | Meaning |
|---|---|---|
| `DEUS_Ecology.js:743` | `{ sprout: "cave_mushrooms", matures: ["tower_cap", "glow_caps", "cave_moss"], weights: [5, 3, 2], delay: 120 },` | LIVE: cave sprouts grow into fungus and moss on −1 (the −2 table is line 748)... |
| `DEUS_Ecology.js:843` | `if (sh !== "floor" && sh !== 0) continue; // Must be open cavern floor, not solid cave rock` | ...placed by floor shape alone; light and moisture play no part. |
| `DEUS_Wildlife.js:454` | `const caveSpecies = speciesList().filter(s => ["giant_spider", "bat", "rat", "troll", "bog_horror"].includes(s.id));` | Five cave species, hardcoded, placed once at world creation. |
| `DEUS_Wildlife.js:684` | `const EDIBLE_OBJECTS = new Set(["grass_tuft", "bush", "tall_grass", "reeds", "berry_bush", "wildflowers"]);` | No cave flora is food for wildlife, so the cave food chain has no base. |
| `DEUS_Wildlife.js:656` | `if (DN && typeof DN.phase === "function") return DN.phase();` | Cave animals sleep by the surface day (the phase defaults to z = 0). |
| `DEUS_Levels.js:583` | `water[idx] = 1;` | Each cave pocket gets one small pool; the only natural underground water... |
| `DEUS_Levels.js:1038` | `const fluid = z === -2 ? M_LAVA : M_WATER;` | ...and on the deepest level it is always lava. |
| `DEUS_Factions.js:513` | `f.areaInfo = { ...f.areaInfo, rule: "underground-pocket", biome: null, water: null, disc: 3 };` | Underground homes record no water source. |
| `DEUS_Colonists.js:5230` | `if (UF.Agriculture && UF.Agriculture.planJob && UF.Agriculture.planJob(u)) return true;` | `UF.Agriculture` is never defined: no farming, above or below ground. |
| `DEUS_Colonists.js:4265` | `if (evening() \|\| (window.UF && UF.DayNight && UF.DayNight.isNight && UF.DayNight.isNight())) return null;` | Work stops at surface night, not in underground darkness. |
| `DEUS_Conditions.js:810` | `return !this.has(unit, "blinded") &&` | `canSee` checks conditions only; darkness never counts as heavily obscured. |
| `DEUS_Colonists.js:827` | `d.sight = 8;` | Every colonist has a fixed sight, whatever their race. |
| `DEUS_Fog.js:268` | `// Darkvision 60 ft = 12 grid squares. Superior Darkvision 120 ft = 24 grid squares.` | Darkvision exists only in fog of war... |
| `DEUS_Fog.js:499` | `// Fog of war is temporarily removed from the game per user directive 2026-09-22` | ...which is switched off, so darkvision is DORMANT. |
| `game/data/DEUS_WorldCatalog.json:10173` | `"source": true,` | Campfires are the only light-tagged objects and never burn out: no fuel. |
| `DEUS_Sheet.js:144` | `{ inputs: ["firewood", "fiber"], output: "torch", count: 2 },` | A torch recipe exists, but the catalog has no torch item. |
| `DEUS_DayNight.js:83` | `if (underground(z)) return KEYS[0].tone.slice();` | Render fact (DEC-011): any view of −1 or −2 gets the midnight screen tone (section 8, D-6). |
| `DEUS_DayNight.js:186` | `DayNight.enableGlows = false; // Glow effects disabled for the moment per user directive` | The light-glow renderer, the only place fungus glows, is off. |

Code today: **PARTIAL** (cave fungus, cave herds, pools and underground homes exist; light, darkvision, fuel, farming and a cave food chain are ABSENT or DORMANT). The code has 5 levels, so "underground" is −1 and −2 only (SIM.50.01 F-01).

**Gaps.**

| ID | Severity | Gap | Package |
|---|---|---|---|
| G10-1 | BLOCKER | Year-0 viability of the four underground-starting races is not planned: no farming, no light, no water on the deepest level in code, and nothing in the WBS checks that an underground faction can feed and water itself (WG.90.01 needs a viable living Year-0 world). | DEEP-06 |
| G10-2 | MAJOR | No row plans a simulation light field. Darkness changes nothing in play; work stops by the surface clock. Lane P's audit lists the same gap for 26 LIGHT spells (G-LIGHT, unreviewed). | DEEP-01 |
| G10-3 | MAJOR | No row plans vision and darkvision rules; they exist only in the disabled fog, and sight is a fixed 8 cells. Three of nine races (including dragonborn, placed on the deepest level) have no darkvision. | DEEP-02 |
| G10-4 | MAJOR | No row plans light sources and fuel; the only light never burns out, and the torch has no item. | DEEP-03 |
| G10-5 | MAJOR | No row plans cave flora and fungus succession: WG.68.01-.02 cover the five surface biomes; code grows fungus by floor shape alone. | DEEP-04 |
| G10-6 | MAJOR | No row plans an underground food web: cave flora feeds nothing, the species list is hardcoded, and there is no underground breeding or arrival. | DEEP-05 |
| G10-7 | MINOR | The surface clock drives underground behaviour (animal sleep, work gates). | DEEP-01 |

**Proposed packages.** No package proposes any tint, fog filter, shading overlay or scaling (DEC-011); light is simulation state only. Any art need is a text-only "art slot needed" line for the Owner (DEC-007); none is proposed here.

- **PROPOSED-DEEP-01 Simulation light field** (G10-2, G10-7).
  - Scope: light as simulation state: a sparse registry of light sources per region (fire, torch, lamp, spell, bioluminescence), sky exposure per column from the first opaque stratum above (the same traversal as DEC-021), and a `lightAt(x, y, z)` query that returns bright, dim or dark by the SRD rule; work, perception and animal activity read it instead of the surface clock.
  - Depends on: SIM.00.02, WG.00.17, SIM.40.01 (opacity of strata); SIM.60.02 uses it for LIGHT spells.
  - Acceptance tests: (1) a cell 25 ft from a torch in a sealed cave reads dim, 45 ft reads dark (SRD 20 + 20 ft); (2) the same cell under an open shaft at noon reads bright; (3) removing the torch makes the cell dark within one tick; (4) a sealed cave at surface noon reads dark. Mutant: light that ignores the opaque roof (today's surface-clock rule) must fail test 4.
  - Tick cost: queries on demand, about 35 per tick (witnesses, attacks, work) × up to 16 sources × 0.1 µs ≈ 56 µs. Memory: 16 B per light source; 1,000 sources ≈ 16 KiB; sky-exposure cache 1 B per column per area (64 KiB); layers with no sources cost nothing.

- **PROPOSED-DEEP-02 Vision and darkvision** (G10-3).
  - Scope: SRD senses per race and creature as data (darkvision 30-120 ft, blindsight, Sunlight Sensitivity), perception checks that combine DEEP-01 light with senses (lightly and heavily obscured), used by witnesses (MIND-02), combat and work.
  - Depends on: DEEP-01, SOC.11.01 (race traits).
  - Acceptance tests: (1) in darkness a dwarf sees a target 50 ft away and a human does not; (2) a duergar-type creature in sunlight attacks with disadvantage; (3) the human's attack on an unseen target has disadvantage by the SRD rule. Mutant: darkvision ignored (today's live rule) must fail test 1.
  - Tick cost: one extra table lookup per perception query (0.1 µs). Memory: 1 B per person or creature (sense class).

- **PROPOSED-DEEP-03 Light sources and fuel** (G10-4).
  - Scope: torches, candles, lamps and lanterns as items with SRD radius and burn time; oil and wax as fuel consumed with mass conserved (LIFE-001; burnt fuel goes to the ledger like fire); campfires that need fuel; permanent magical light (Continual Flame) as a source with no fuel.
  - Depends on: DEEP-01, WG.61.02 (ledger), SIM.50.05 (fire).
  - Acceptance tests: (1) a torch lights for exactly its burn time in ticks and then goes out; (2) a lantern consumes one pint of oil per 6 hours (SRD), mass conserved; (3) a campfire with no fuel goes out. Mutant: a campfire that never burns out (today's rule) must fail test 3.
  - Tick cost: expiries through a timer wheel, a few per tick; negligible. Memory: 8 B per burning source.

- **PROPOSED-DEEP-04 Cave flora and fungus ecology** (G10-5).
  - Scope: succession for the ten below-surface biomes, driven by moisture, organic input (detritus and remains washed or carried down, LIFE-001), temperature (WG.64.06) and light, not by surface sunlight; bioluminescent species register as dim light sources (DEEP-01); runs on SIM.50.04's slow clock.
  - Depends on: SIM.50.04, DEEP-01, SIM.50.02, WG.64.06; the energy source is the Owner's (OQ-24).
  - Acceptance tests: (1) a moist cave with organic input grows fungus and a dry sterile one does not; (2) fungal biomass never exceeds the organic input plus any declared source (mass ledger); (3) a glowing species appears as a light source. Mutant: growth from nothing (today's floor-shape rule) must fail test 2.
  - Tick cost: active cave regions on the slow clock, about 20 regions × 50 µs ÷ 100 ticks ≈ 10 µs per tick. Memory: per active region about 64 B.

- **PROPOSED-DEEP-05 Underground food webs and creatures** (G10-6).
  - Scope: WG.68's carrying capacity and food web applied to the two lower bands: cave grazers eat fungus and detritus, predators eat grazers, SRD creatures placed by an Owner-approved habitat table (the SRD has none); breeding and arrivals below ground (SIM.40.10), crowd counts per region.
  - Depends on: WG.68.07-.11, DEEP-04, SIM.40.10, SIM.30.02.
  - Acceptance tests: (1) removing the fungus lowers grazer counts and then predator counts, in that order; (2) overhunting extirpates locally with no respawn (WG.68.11). Mutant: species counts that ignore food (today's fixed placement) must fail test 1.
  - Tick cost: about 500 occupied underground regions stepped every 100 ticks = 5 × 5 µs = 25 µs per tick. Memory: about 32 B per region per band (8 species × 4 B); at most 1,024 regions × 32 B = 32 KiB per area.

- **PROPOSED-DEEP-06 Underground farming and Year-0 viability** (G10-1).
  - Scope: fungus and cave crops with their own growth rules (EMERGENT_SOCIETY asks for underground crops that do not reuse surface sunlight rules), water access below ground (wells into aquifers, SIM.50.02; a non-lava source on the deepest level or a start rule), and a Year-0 viability check for every underground start: food, water and light for the eight founders for a set number of game days with no player input.
  - Depends on: DEEP-01, DEEP-03, DEEP-04, SIM.50.02, WG.62.02, WG.90.01, SIM.50.06; race placement per OQ-23.
  - Acceptance tests: (1) on 20 seeds, every underground faction survives its first 30 game days with no input; (2) a fungus farm yields food only with water and organic input; (3) a start with no reachable water is rejected by worldgen. Mutant: the lava-only deepest level (today's rule) must fail test 3.
  - Tick cost: farm plots on the slow clock, about 16 B per plot; the viability check runs at generation only.

<!-- PART E -->
