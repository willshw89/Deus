# DEUS — TASK ASSIGNMENT: DEUS-TSK-FABLE-19B
# WG.00.08 — NATURAL CUTS + ALL-Z CAVE NETWORKS

**Agent:** Fable / Claude Code  
**Role:** Bounded implementation agent  
**Coordinator / Review Authority:** Gemini  

**Prerequisites:**
- `WG.00.06 / FABLE-19A`: Five-Strata Geometry — `FROZEN / ACCEPTED` [commit `edba004`]
- `WG.00.07`: Fluid ↔ Strata Reconciliation — `FROZEN / ACCEPTED` [commit `2f47203`]

---

## 1. OBJECTIVE

Implement deterministic meso-scale natural vertical terrain features directly on the authoritative five-strata physical world:

- ravines
- canyons
- chasms
- sinkholes
- fissures
- stream cuts
- stepped terraces
- cave mouths
- cave passages
- cave chambers
- branches
- dead ends
- shafts
- multi-Z cave connections

Cuts and caves must exist as **PHYSICAL STRATA GEOMETRY**.

Do not implement visual depth compositing. That is `WG.00.09 / FABLE-19C`.

---

## 2. AUTHORITATIVE GEOMETRY

Five strata per macro-Z cell remain the **ONLY** mutable terrain authority.

Natural carving:
$$\text{solid stratum} \to \text{air stratum}$$

through the canonical Levels writer/generator path.

Do **NOT** create:
- parallel cave geometry
- parallel cut masks used as authoritative terrain
- secondary mutable shape grids

Legacy shape APIs remain derived views.

---

## 3. PARTIAL-HEIGHT NATURAL CUTS

Cuts must use the actual 1/5-stratum resolution.

Generate meaningful examples of:
- `HEIGHT_1_OF_5`
- `HEIGHT_2_OF_5`
- `HEIGHT_3_OF_5`
- `HEIGHT_4_OF_5`
- `HEIGHT_5_OF_5`

where geology calls for them.

Terrain should not consist only of whole 5-ft stair-step drops.

Use partial-height strata to create:
- eroded banks
- ravine shoulders
- stepped terraces
- canyon ledges
- broken slopes
- fissure lips
- sinkhole rims

while remaining compatible with future art/rendering.

---

## 4. DEEP CUT DISTRIBUTION

Do **NOT** guarantee giant Z-2 chasms in every world.

Desired distribution:
- **COMMON:** shallow partial-height relief.
- **LESS COMMON:** cuts spanning roughly one macro-Z transition.
- **UNCOMMON:** features exposing Z-1.
- **RARE BUT REAL:** features reaching/exposing Z-2.

The generator must nevertheless have deterministic regression seeds proving that the feature class genuinely exists.

At minimum acceptance must identify generated-world coordinates for:
- **A.** Z0 → Z-1 exposure.
- **B.** Z-1 → Z-2 exposure.
- **C.** At least one traceable generated geological feature connecting from the upper world down to Z-2.

These must be generated features. Do not satisfy acceptance with hand-edited fixtures.

---

## 5. CUT SHAPES

Cuts must not simply be square vertical holes.

Generate coherent shapes with:
- varying width
- varying length
- shoulders
- bends
- taper
- partial-height ledges
- local ramps/slopes where appropriate
- geological continuity

They should read structurally as terrain formations even before final art.

---

## 6. BIOME-SPECIFIC CUTS

- **TEMP:** limestone ravines, sinkholes, karst cuts, stream/river erosion, limestone clefts.
- **WET:** drainage cuts, peat-collapse hollows, wet sinkholes, water-cut channels.
- **ARID:** arroyos, canyons, slot chasms, dry washes, stepped erosional terraces.
- **HIGH:** fault chasms, granite clefts, steep rock cuts, scree/terrace transitions.
- **VOLC:** fissures, lava-tube collapse, caldera fractures, broken basalt cuts.

These are geological tendencies. Do not make them absolute exclusivity rules.

---

## 7. CAVES ON ALL FIVE MACRO-Z LEVELS

Caves must be possible on:
- **Z+2**
- **Z+1**
- **Z0**
- **Z-1**
- **Z-2**

Do **NOT** treat cave generation as only an underground Z-1/Z-2 system.

A cave network may occur inside suitable rock mass at any macro-Z.

Generate coherent networks containing combinations of:
- passages
- chambers
- branches
- dead ends
- shafts
- mouths
- ramps/slopes where physically valid

Ordinary cave-free terrain must remain common. Do not Swiss-cheese the world.

---

## 8. CAVE PHYSICAL CLEARANCE

A cave is not merely a cell marked `OPEN`.

Clearance must be measured from continuous **AIR** volume.

Add or use an efficient physical query equivalent to:
```javascript
continuousAirHeight(...)
```
or another repository-conforming name.

It should be possible to determine actual continuous vertical clearance in feet/strata across adjacent macro-Z bands.

**IMPORTANT:**
A cell containing:
$$1\text{ solid rock stratum} + 4\text{ air strata}$$
provides only approximately 4 ft of vertical clearance. Do **NOT** automatically classify that as a normal full-height cave passage.

Do **NOT** hard-code Human, Dwarf, Elf, etc. clearance requirements into 19B. 19B supplies **PHYSICAL CLEARANCE DATA**. Creature-specific navigation can consume that later.

---

## 9. MULTI-Z CAVE CLEARANCE

Normal cave chambers/passages may require continuous AIR spanning adjacent macro-Z cells.

Example:
$$\text{upper air strata in } Z-1 + \text{lower air strata in } Z0$$
may form one continuous physical void.

Queries must reason about continuous vertical AIR rather than treating each 5-ft macro cell as an isolated cave box.

---

## 10. PHYSICAL CAVE ROOFS

Cave roofs are real material.

A cave with intact overburden must have physical solid strata above it.

`hasOpaqueOverburden` or its canonical successor must report the correct state.

Mining, spell damage or later collapse that breaches the roof must naturally change exposure because the strata changed.

Do not store a separate boolean such as `isCaveRoof = true` as a competing physical authority.

---

## 11. Z+2 CAVE RULE

There is no Z+3. Do **NOT** invent a sixth macro-Z plane.

If a physically roofed cave must exist within Z+2, use a minimal canonical **TOP-OVERBURDEN / CEILING-CAP** representation.

It must be capable of carrying at least the semantics needed for:
- material
- thickness
- opacity
- solid HP/damage where appropriate
- roof/support interpretation
- visibility/exposure

This cap exists only because the finite modeled world ends at Z+2. Keep it minimal. Do not turn it into another general Z layer. Document the exact representation.

---

## 12. MULTI-Z CAVE NETWORKS

Multi-Z networks are allowed and should occur rarely.

Connections may include:
- natural ramps
- sloped passages
- shafts
- sinkholes
- collapsed openings

A network may connect several macro-Z levels. Such networks must remain coherent rather than appearing as unrelated chambers stacked vertically.

---

## 13. SUPPORT SCOPE

Do **NOT** implement the future full support/collapse simulator. That is outside 19B.

World generation must simply avoid obviously impossible unsupported natural mass.

Use existing physical/support queries where appropriate.

Natural ceilings/overhangs may exist where physically anchored into surrounding mass. Do not enforce a simplistic rule that every solid stratum must have a solid stratum directly beneath it; that would forbid legitimate:
- cave ceilings
- arches
- ledges
- overhangs

The future support system will model bounded span/support behavior.

For 19B:
- avoid floating disconnected islands
- preserve plausible anchored mass
- test for disconnected unsupported components

Do not create structural simulation.

---

## 14. FLUID CONTRACT

Use `WG.00.07`. Do not create a parallel cave-fluid system.

Cuts/caves simply create/change physical capacity and passages.

`WG.00.07` handles:
- 0..7 conserved fluid volume
- strata-derived capacity
- downward flow gates
- lateral flow gates
- dirty/active processing

It is acceptable for generated caves/cuts to intersect existing water/lava systems where the current generator already supports this.

Do **NOT** make these new features mandatory in 19B:
- bespoke waterfall renderer
- rapids renderer
- water-table simulator
- pressure
- aquifers
- steam
- evaporation

Those are outside this task.

---

## 15. WORLDGEN PIPELINE

Integrate cuts and caves at a deterministic point in generation where:
- host geology is known
- biome is known
- physical strata can be carved
- subsequent readers receive final authoritative geometry

Document pipeline order explicitly. Do not make cut/cave outcome dependent on frame timing or iteration order.

---

## 16. PERFORMANCE

Cuts/caves are primarily **WORLD-GENERATION** work.

Stable generated geometry must have effectively no additional ordinary per-frame simulation cost.

Avoid:
- full-world scans every frame
- runtime cave graph regeneration
- runtime cut regeneration

Persistent metadata should be minimal.

Report:
- generation-time impact
- memory impact
- save impact if any

Stay within existing area memory expectations unless a documented exception is necessary.

---

## 17. ALLOWED EDIT PATHS

Prefer bounded changes to:
- `game/js/plugins/DEUS_WorldGen.js`
- `game/js/plugins/DEUS_Levels.js`
- `tools/test_strata_cuts_and_caves.js` (NEW)
- `docs/systems/UF_Levels.md`
- `docs/systems/UF_WorldGen.md`
- `docs/STATUS.md`

If another path is genuinely required: **STOP and report why before broadening ownership.**

Do **NOT** modify:
- `game/js/plugins.js`
- RMMZ core files
- depth renderer
- art pipeline
- resource economy
- character systems

---

## 18. REQUIRED TESTS

Create:
```text
tools/test_strata_cuts_and_caves.js
```

Test at minimum:
- **A.** Deterministic same-seed generation
- **B.** Different seeds produce different valid layouts
- **C.** Partial-height cuts 1/5..5/5 exist
- **D.** Generated Z0 → Z-1 exposure exists in known regression seed
- **E.** Generated Z-1 → Z-2 exposure exists in known regression seed
- **F.** Generated multi-level feature reaching Z-2 exists
- **G.** Shallow features are statistically more common than Z-2 deep cuts
- **H.** Caves exist at Z+2, Z+1, Z0, Z-1, Z-2 across the deterministic regression seed set
- **I.** Cave-free terrain remains substantial
- **J.** Ordinary traversable terrain remains substantial
- **K.** Physical cave overburden behaves correctly
- **L.** Roof breach changes overburden/exposure query
- **M.** Continuous-air-height query correctly distinguishes 4 ft, 5 ft, and >5 ft multi-Z clearance
- **N.** Multi-Z cave connectivity works
- **O.** No disconnected floating natural islands
- **P.** Fluid reconciliation suite still passes
- **Q.** Strata foundation suite still passes

Include Rule-4/mutation controls proving critical tests fail when corresponding rules are broken.

---

## 19. REGRESSION SUITES

Must still pass:
```powershell
node tools/test_strata_foundation.js
# Expected baseline: 26 checks pass, 23/23 mutants detected.

node tools/test_strata_fluid_reconciliation.js
# Expected baseline: 36 checks pass, 5/5 mutants detected.

node tools/test_liquid_depth_simulation.js
# Expected baseline: 21 checks pass, 7/7 mutants detected.
```

If repository reality differs, report actual baseline before changing anything.

---

## 20. REQUIRED GENERATED-WORLD EVIDENCE

Return exact seed + coordinates for representative generated examples:
1. shallow partial-height cut
2. Z0 → Z-1 cut
3. Z-1 → Z-2 cut
4. multi-level feature reaching Z-2
5. Z+2 cave
6. Z+1 cave
7. Z0 cave
8. Z-1 cave
9. Z-2 cave
10. multi-Z cave network
11. intact physical cave roof
12. roof-breach test

These must be produced by worldgen, not hand-edited after generation.

---

## 21. DO NOT DO

Do **NOT** implement:
- five-Z visual compositing
- depth parallax
- depth color recession
- blur
- world art
- tilesets
- support/collapse simulation
- resource deposits
- faction spawn changes
- advanced hydrology

unless specifically required to preserve an existing interface.

---

## 22. REQUIRED FABLE RETURN

Return:
1. HEAD before work
2. repository facts inspected
3. generation pipeline decision
4. files changed
5. cut-generation algorithm
6. cave-generation algorithm
7. cave-clearance model
8. Z+2 ceiling-cap model
9. exact regression seeds/coordinates
10. feature-frequency statistics
11. performance
12. memory impact
13. tests
14. mutant results
15. regression results
16. known limitations
17. commit hash

Then **STOP**. Do not start FABLE-19C. Do not start art work. Do not modify the WBS ordering.
