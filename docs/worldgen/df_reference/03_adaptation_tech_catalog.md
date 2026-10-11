# DF Reference 03 — Extracted Tech Catalog for Adaptation

**Source analysed:** Dwarf Fortress 53.16 Classic (Windows x64 build of 2026-08-03), binary + data files, no source code
**Status:** research reference for DEUS/Endrath world generation — not a spec, not a work item
**Date:** 2026-10-10
**Legal note:** Reverse-engineered for learning and interoperability; implement original systems, do not port code or data wholesale.

---

## 0. How to use this document

This is document 03 of the DF reference set and the one meant to be acted on. Documents 01, 02a and 02b describe what DF does; this one lists the techniques worth taking into DEUS, ranked, with the DEUS hook named for each. It is a catalog, not a plan: nothing here opens a lane, and every "adaptation" paragraph is a suggestion for the Owner and PM to accept, reshape or drop.

### 0.1 Status and citation key

Every statement about the DF binary is a **verified** claim in the adjudicated ledger (`VERIFIED_CLAIMS.md`) unless marked otherwise. The ledger id follows in parentheses, e.g. *(hydrology-05)*, with its primary evidence tag inline, e.g. `[BIN:func 0x140f549b0]`. Three other labels appear:

| Label | Meaning |
|---|---|
| *(id, ledger status inferred)* | the ledger keeps the claim at *inferred*: the mechanics were reproduced but a label or generalisation goes beyond the evidence |
| *(auditor extra)* | observed by a reviewer while verifying something else; one notch below verified |
| `[PUBLIC]` / `[INFERRED]` | public knowledge about DF (wiki, DFHack df-structures), or this document's own inference |

Long report names are shortened in the ids: *gap_stage6* = `gap_stage6_salinity_temperature_pass`, *gap_post* = `gap_post_map_pipeline_order`, *gap_name* = `gap_name_generation_and_seed_streams`, *geology* = `geology_underground`. Document short labels: 01 = `01_triage_architecture.md`, 02a = `02a_core_techniques_physical_world.md`, 02b = `02b_core_techniques_living_world.md`, 04 = `04_evidence_appendix.md`.

Refuted ledger claims are not used. Where a sibling report said one thing and the audit found another (the cold-tile vegetation divisor, the mesh encoding, the openness bias, the geo-biome growth passes, the stage map), the audited reading is used.

### 0.2 Priority key

- **P0** — foundation for M1 (WG.00.25 coarse whole-world generation, WG.00.30 geology-first layer, WG.00.31 biome placement, WG.00.33 headless multi-seed test). Decide these before any field is generated.
- **P1** — shapes M1 data so M3 (WG.63–68) and the DEC-073 spawner can consume it without rework.
- **P2** — valuable, but gated on Owner decisions or on the Year-0 contract; record now, build later.

### 0.3 DEUS vocabulary used below

- **World:** a 3×3 grid of 256×256-tile maps (about 768×768 tiles), deterministic per seed, grid size data-driven (WG.00.25), wrap-stitched on all edges (WG.00.26).
- **Column and strata:** one surface depth is one foot; a z layer is ten feet; `DEPTH_MAX` is 10; a full cell climbs one z (AGENTS.md). Art stays z0–z7 (eight layers, z0 the open surface of a column); the engine range is −16..+15 with natural terrain capped at +11 (WG.00.17) and five depth bands Deep Earth / Caverns / Lowlands / Uplands / Highlands (WG.62.02, DEC-038 band table in `bands.js`).
- **Water rule:** water is placed on the lowest open cells, rock is raised around it, and sea level is the height that leaves (AGENTS.md).
- **Biome stacks:** six (VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD) across the five bands (WG.00.32), placed by a rule engine (WG.00.31), 30 combinations plus 15 transitions in the catalogue (WG.00.34).
- **World cell:** this document's name for a coarse generation cell holding one value per field (the analogue of a DF world tile). A 16×16-tile cell gives a 48×48 cell grid over the 3×3 world; 8×8 gives 96×96. The choice is open.
- **Area / (area, z):** the lazy generation unit (WG.00.46), checksummed per area, with the same output whether built at New Game or later (DEC-070 condition C).

---

## 1. The catalog at a glance

| # | Technique | Priority | Primary DEUS hook |
|---|---|---|---|
| T1 | Layered integer fields on a coarse cell grid; biome derived, never stored | P0 | WG.00.25, WG.00.31, WG.00.34 |
| T2 | Rejection checklist with cheap in-place repair and staged retry | P0 | WG.00.33, sea-level rule |
| T3 | One flat parameter record; defaults scaled by area; presets as deltas; painted overrides | P0 | WG.00.25 (data-driven grid), test fixtures |
| T4 | Named seed streams, derived per concern and per (area, z) | P0 | DEC-070 cond. C, WG.00.46, WG.00.47 |
| T5 | Rivers: carving descent, drainage sweep, loop-erased extraction, flow-ordered trunks | P0 | WG.66.04–06 |
| T6 | Terrain finalisation order; derived fields recomputed after every elevation edit | P0 | WG.67.02/04/05, WG.68.01 (Year-0 state) |
| T7 | Regions by label propagation; two-level kind/biome; size-filtered counts as levers | P1 | WG.00.31, WG.63.01/05 |
| T8 | Geology as shared column stacks; anisotropic seeded flood; least-used-first; scarcity divisor | P1 | WG.00.30, WG.61.01/02, WG.64.03 |
| T9 | Feature layers as parameterised regions; z-budget consumed at realisation | P1 | WG.62.03/04, Caverns band |
| T10 | Overlay placement as a square budget balanced across kinds | P1 | WILD stack, WG.63.03 scars |
| T11 | Vegetation as a derived value; species rows as placement rules; abstract per-region records | P1 | WG.68.07/08/10, DEC-073 designations |
| T12 | Multi-scale lazy realisation; sites as abstract records | P1 | WG.00.46, WG.00.28, WG.62.01 |
| T13 | Names as word indices + language; position tables; two-table theming; select/cull recipes | P1 | WG.63.05/06 |
| T14 | Re-entrant stage machine, time-sliced, with completion flags and honest progress | P1 | headless harness, RMMZ frame budget |
| T15 | Presets plus command-line batch generation for QA | P1 | WG.00.33, Codex Astra |
| T16 | Exports, rejection log, parameter dump on error, periodic snapshots | P1 | WG.00.33, WG.84 QA |
| T17 | History as a year-stepped simulation with an event vocabulary and a stop test | P2 | scenario tool only (WG.00.14, INV-SIM-01) |
| T18 | Procedural content emitted in the hand-authored data format; spheres as semantic glue | P2 | WG.20 catalogue, NAT.07.01 bestiary |

---

## 2. P0 techniques

### T1. Layered integer fields on one coarse grid; biome derived, never stored

**Description.** Generate every climate and terrain layer as a small-integer field on the same coarse grid in one pass, then treat biome as a pure function of those fields evaluated wherever it is needed. No biome array exists; no derived layer is authored.

**Why it works in DF.** One recursive square-subdivision routine fills seven field slots in a single recursion, writing only cells still holding a sentinel and halving its jitter per level `[BIN:func 0x140f554a0]` *(elevation_fields-01, -02)*. Fields are 16-bit slots in a fixed-stride per-tile record *(elevation_fields-03)*; out-of-range values are bounced back inside the range by a random amount rather than clipped *(elevation_fields-09)*, which avoids plateaus at the limits. Coarse mesh seeds come from five equal sub-ranges of [min, max] weighted by five designer numbers *(elevation_fields-05, -06)*, so "mostly lowland, a little highland" needs no change to the fractal. Temperature is a fractal field plus a quadratic latitude term chosen by the pole setting *(elevation_fields-11)*. Biome is computed on demand by a small classifier over elevation, temperature, rainfall, drainage, salinity, a lake flag and latitude `[BIN:func 0x140f51940]` *(biomes_regions-01, -02)*; vegetation is derived too: rainfall above freezing, else rainfall/12, or 0 when drainage is high `[BIN:func 0x140f772a0]` *(gap_stage6-10)*.

**Adaptation to DEUS.** Pick the world-cell size (16×16 tiles → 48×48 cells, or 8×8 → 96×96) and store each field as its own `Int16Array` (structure of arrays suits typed arrays better than DF's per-cell struct). Fields: elevation in feet, rainfall, temperature, drainage, volcanism, and a wildness field for the WILD stack and the DEC-073 danger tier. The classifier takes (cell fields, depth band) and returns one of the 30 stack×band combinations (WG.00.34) from one threshold table that the catalogue, the rule engine (WG.00.31) and gameplay all import. Elevation maps onto the column directly: z = floor(feet / 10), surface depth = feet mod 10. Refine cell heights into per-tile heights with a second displacement pass seeded from the cell's stream (T4), constrained to whole-strata steps between neighbours; that is what gives WG.00.20 its continuous multi-layer hills.

**Pitfalls.**
- Ten-foot quantisation makes any plateau visible as a terrace; keep the bounce, and generate heights in feet before quantising.
- DF only ever generates at world-tile resolution (17..257 per side) *(elevation_fields-04)*; the per-tile refinement is DEUS's own problem.
- Any later pass that edits elevation must trigger recomputation of derived layers (T6).

**Sketch (original).**
```
fields = { elev, rain, temp, drain, volc, wild }  // Int16Array per field, cell grid W×H
seed coarse lattice at spacing S from weighted buckets (per field, per designer weights)
for level in coarse..fine:
    for each new midpoint/centre: value = mean(neighbours) + jitter(level); bounce into [min,max]
temp += latitudeTerm(y, poles, H)
biomeAt(cell, band) = classify(fields[cell], band)      // pure, table-driven, never stored
vegAt(cell)          = derive(rain, temp, drain)        // pure, recomputed on demand
```

**Copy-risk.** The five 20 % buckets, the mesh exponent scheme, the hidden 33..65 evil slot, and the 42-biome decision tree with its thresholds are DF tuning. Author the DEUS classifier from the six stack sheets (WG.00.32), not from DF's table.

---

### T2. Rejection checklist with in-place repair and staged retry

**Description.** Validate the generated world against a numbered checklist, try a cheap global repair before failing, log the shortfall, and on failure restart only the stages that need it.

**Why it works in DF.** The map generator is a re-entrant state machine on a sub-stage word *(params_rejection-13)*; every failing check jumps to a common exit returning 1, the final region check returns 2, and the caller restarts at sub-stage 2 (fields only) or 1 (full re-init) *(params_rejection-14)*. Checks run in a fixed numbered order *(params_rejection-15)* and the UI maps 53 ids onto 27 player-facing names *(params_rejection-16)*. Before rejecting on elevation band minimums, up to three passes shift every non-mountain tile down by a step, recounting after each; shift-up is symmetric *(params_rejection-19)*: the field is re-biased in place, not regenerated. "Not evenly distributed" is a band minimum-count test, not a variance measure *(params_rejection-20)*; an ocean edge is complete when every tile is ocean and partial when at least an eighth are *(params_rejection-22)*. Retries continue the same random stream *(auditor extra)*.

**Adaptation to DEUS.** WG.00.33 already states the acceptance tests (all 30 stack×band combinations reachable, zero natural terrain at +12..+15, seams consistent). Express them, and every future gate, as records `{ id, category, test(world) → shortfall, repair?(world), allowBypass }` in one table read by both the headless test and the in-game generator. The repair step is where the sea-level rule lives: sea level is the height that leaves after water is placed on the lowest open cells (AGENTS.md), so pick it from the ocean/land band minimums after generation and shift the field only when no sea level satisfies them. Add checks DF lacks: seam continuity across the 3×3 wrap (WG.00.26), reachability per depth band, the +11 natural cap. Staged retry: fields-only, fields+hydrology, everything.

**Pitfalls.**
- DF has one allow flag that is written but never read *(auditor extra)*; generate the check table from a single source so ids, names and flags cannot drift.
- DF's pre-erosion and post-erosion band checks use different mountain thresholds *(hydrology-18)*; keep one unit (feet) through the whole pipeline.
- DF's edge-ocean retry loop has no iteration cap *(auditor extra)*; every repair loop needs a budget and a logged exit.

**Sketch (original).**
```
for check in CHECKS (fixed order):
    short = check.test(world)
    if short > 0 and check.repair: check.repair(world, short); short = check.test(world)
    if short > 0 and not allow[check.id]:
        log(check.id, short); return RESTART_FROM(check.stageClass)
```

**Copy-risk.** The 53-id list, its display names, the 33/66 and 100/300 bands and the per-biome minimum fractions are DF's. Keep the pattern (ordered checklist, repair, shortfall, staged restart); write DEUS's own checks.

---

### T3. One flat parameter record, area-scaled defaults, presets as deltas, painted overrides

**Description.** All generation knobs live in one serialisable record with a text round-trip; defaults are functions of map area; presets are the defaults plus a short list of overrides; an optional per-field painted map replaces generation for that field.

**Why it works in DF.** The parameter set is a single flat 0x4c8-byte struct whose serialiser emits every token in a fixed order `[BIN:func 0x140f80330]` *(params_rejection-01)*. The default function scales most minimums by area relative to a 257² reference with a few size-class floors and ceilings *(params_rejection-09, -10)*. The ten presets are compiled in and synthesised from that default function; REGION presets are nothing but constructor + title + dims + defaults, ISLAND presets add explicit overrides *(params_rejection-07, -08)*. Painted rows (PS_EL…PS_SV) supply a field map that the generator copies in instead of generating, and the matching terrain checks are bypassed *(params_rejection-23; elevation_fields-23, ledger status inferred, mechanics confirmed by both reviewers)*.

**Adaptation to DEUS.** The grid is data-driven and "extensible to 4×4" (WG.00.25), so every count-like default must be `scale(k) = k × area / referenceArea` with named floors. One versioned JSON record; presets stored as deltas on the defaults so a default change propagates; a `painted` section holding optional per-field cell grids. The painted path is the testing tool: feed a fixed elevation grid and test hydrology alone, or a fixed climate and test biome placement alone (WG.00.33 fixtures). Write the resolved record into the save alongside the world (T16).

**Pitfalls.**
- Keep defaults and presets in data, not in code paths as DF does; DF's compiled-in presets cannot be edited without a binary change.
- A painted field must still pass the checks that other fields' derivations depend on; DF bypasses them wholesale.

**Sketch (original).** `params = applyDeltas(defaults(area), preset); if params.painted[field]: fields[field] = params.painted[field] else generate(field)`.

**Copy-risk.** The reference area, the specific multipliers and the ten preset override tables are DF content. The shape (flat record, text round-trip, area scaling, deltas, painted overrides) is generic.

---

### T4. Named seed streams per concern and per (area, z)

**Description.** Fold each seed string into its own generator state; give each concern (terrain, history, names, creatures) its own stream; derive chunk streams from coordinates with an injective pairing so any chunk regenerates identically on its own.

**Why it works in DF.** The random system is a stack of MT19937 state buffers selected by a depth word, with push-from-string, push-from-value and push-from-three-values entry points *(gap_name-18)*; push-from-string folds the seed's bytes into a key, and the three-value push seeds from a nested pairing of its arguments *(gap_name-19)*. World init parses four seed strings, logs them, pushes NAME_SEED only to name the world, then pushes SEED for the map *(gap_name-20)*; the Lua object generator pushes and pops its own nested stream so content generation does not perturb the map stream *(auditor extra)*; the three-value push serves feature-layer sub-streams *(gap_name-24, ledger status inferred)*; the Lua layer iterates tables in sorted key order "so the RNG seed is stable" (brief, `globals.lua`). One flaw: pushes and pops are not lexically paired, so the stream current after civilisation placement is not the one the surrounding code expects *(gap_name-22, ledger status inferred; auditor extras)*.

**Adaptation to DEUS.** DEC-070 condition C and WG.00.47 demand that the same seed, cell, tier, z, time window and attempt index give the same result whether an (area, z) is built at New Game or years later. That is exactly a derived-stream rule: `stream(concern, areaX, areaY, z, attempt) = PRNG(mix(worldSeed[concern], areaX, areaY, z, attempt))` with a 64-bit mixing hash (or an injective pairing function) rather than a shared stack. Pass stream objects explicitly into generators; never read a global. Use a small public-domain seedable PRNG in JavaScript (an MT19937 or a modern xorshift-family generator); the algorithm choice is free, the discipline is the point. Record the resolved seeds in the save and in the headless log.

**Pitfalls.**
- Global stack plus early returns is how DF's pop mismatch happened; explicit stream arguments make the mismatch impossible.
- Rejection retries that continue a stream are fine for variety but make a failing seed unreproducible; log the attempt index as part of the stream key.
- Iteration order over JavaScript objects is insertion-ordered but easy to break; iterate sorted keys as DF's Lua does.

**Sketch (original).**
```
streams.terrain = PRNG(fold("terrain:" + seedString))
areaStream(ax, ay, z, k) = PRNG(mix64(streams.terrain.base, ax, ay, z, k))
generateArea(ax, ay, z) uses only areaStream(ax, ay, z, 0) and the already-final coarse fields
```

**Copy-risk.** None in the technique (seeded PRNGs and pairing functions are textbook). Do not copy DF's buffer layout or its string-folding routine.

---

### T5. Rivers: carving descent, drainage sweep, loop-erased extraction, flow-ordered trunks

**Description.** Erode by running many downhill walks that carve a guaranteed descent to the sea; then run water from every land cell to build a drainage graph; then extract ordered river objects from that graph, erasing loops, merging tributaries by flow, and sorting mouth-first.

**Why it works in DF.** Each erosion cycle runs exploratory walks from mountain cells; a walk steps to a random strictly lower neighbour and, when stuck, digs the lowest unvisited non-peak neighbour down to one below itself, so every walk reaches the sea `[BIN:func 0x140f549b0]` *(hydrology-05)*; a per-cycle clip lowers neighbours more than a threshold higher with small probability, sparing chosen peaks *(hydrology-06)*. In the last cycle every land cell, swept from the top down in random order, runs a final walk that writes a river flag and reciprocal link bits *(hydrology-07)*; a walk that bottoms out inland leaves a sink *(hydrology-08)*; river marks are stripped from mountain cells so heads sit at the margins *(hydrology-09)*. Lakes grow from sinks by a lowest-first flood *(hydrology-10, ledger status inferred)* and a majority fixpoint converts river cells surrounded by lake into lake *(hydrology-11)*. Extraction walks the link graph choosing randomly at forks, cuts the path back on revisit, and records ocean, edge and junction exits `[BIN:func 0x140f772f0]` *(hydrology-13)*; flow is the running sum of rainfall *(hydrology-14; -25 inferred, strongly corroborated)*; a tributary with more flow than the receiver at the junction takes over the downstream tail *(hydrology-15)*; rivers are named and sorted mouth-first *(hydrology-16)*.

**Adaptation to DEUS.** WG.66.04 wants drainage derived from the true elevation topography and WG.66.05 wants hierarchical tributaries. The deterministic equivalent of DF's carving is a priority-flood depression fill (Barnes et al., public algorithm), steepest-descent flow direction and rainfall-weighted accumulation; DF's "dig a guaranteed descent" becomes the breach rule for basins that should drain rather than fill, the fill level deciding which basins become lakes (AGENTS.md: water on the lowest open cells). Keep from DF: a protected-peak mask, river connectivity as an explicit per-cell link mask (`Uint8Array`), flow classes in DEUS units, trunk assignment by flow at the junction, and mouth-first ordering so downstream state is final before upstream realisation. At tile level a river carves its channel in one-foot strata with width from the flow class; a z change along a river is a waterfall candidate for WG.63.01.

**Pitfalls.**
- DF traces rivers before the orographic rain pass *(auditor extra)*, so rivers never see final rainfall; in DEUS run climate finalisation first.
- A vestigial reachability pass is computed and discarded *(hydrology-17)*; do not ship dead passes.
- Fixed 120 000-entry frontier buffers with overflow logging *(hydrology-12)*; size frontiers to the map.
- Lake membership by tile count rather than fill level *(hydrology-10, inferred)*; use the fill level.

**Sketch (original).**
```
fill = priorityFloodFill(elev, seaLevel)                    // closed basins raised to spill height
for basin in closedBasins: if shouldDrain(basin): breachLowestRim(basin) else markLake(basin, fillLevel)
dir  = steepestDescent(fill); acc = accumulate(dir, rain)
rivers = extractPaths(dir, acc, minFlow)                     // heads at margins, junction merges by acc
assignTrunk(junction) = branch with greater acc; order = topoSortMouthFirst(rivers)
```

**Copy-risk.** The 1/500 and 1/100 probabilities, the +15 clip, the 150 mountain threshold, the 5000/10000/20000 flow classes and the flag-bit layout are DF implementation details. Use the structure; choose DEUS's thresholds in feet and rainfall units.

---

### T6. Terrain finalisation order; derived fields recomputed after every elevation edit

**Description.** After rivers, run a fixed, almost random-free sequence: coastal ramp, valley flattening, orographic rain, lapse and envelope corrections to temperature, then recompute every derived field (vegetation, salinity) before regions are built.

**Why it works in DF.** Stage 6's first tick runs the coast-to-foothill ramp (BFS distances to coast and to high ground, then a linear pull of lowland) `[BIN:func 0x140f90aa0]` *(elevation_fields-18)*, twice *(gap_stage6-12)*; flattens river cells to the mean of their banks within the lowland band *(gap_stage6-13)*; sweeps each row downwind with a decaying uplift credit *(gap_stage6-15)* from a latitude-band wind table *(elevation_fields-17)*; then in one per-cell loop applies a quadratic elevation lapse *(gap_stage6-05)*, squashes temperatures above the user maximum into a fixed band *(gap_stage6-07)*, caps very wet cells *(gap_stage6-08)*, recomputes vegetation *(gap_stage6-10)* and seeds salinity on ocean only *(gap_stage6-02)*. Two 8-connected ring passes then make salinity a function of Chebyshev distance to the coast *(gap_stage6-03)*, all before the second region build *(gap_stage6-04)*. Mountains are lowered and the land band compressed earlier, right after the initial square counts *(biomes_regions-07, ledger status inferred; mechanics confirmed by both reviewers)*.

**Adaptation to DEUS.** Fix the DEUS cell-level order and write it down once: fields → sea level by band (T2) → coastal ramp (Lowlands ramp from shore to the Uplands band edge) → hydrology (T5) → valley flattening → orographic rain along prevailing wind (WG.67.05 rain shadows) → lapse by z (WG.67.04 names a lapse rate per strata) → envelope squash → humidity–temperature coupling → derived layers: vegetation as the Year-0 climax community and starting succession stage (WG.68.01), soil moisture band from rain and drainage (WG.67.02's four bands), salinity from coast distance (salt, brackish, fresh lakes) → regions (T7) → biome stacks. Make "derived layers are recomputed" a function, not a stage, because WG.65 live geomorphology will edit elevation after Year 0 and must call the same function.

**Pitfalls.**
- DF's coastal salinity rule is purely geometric, which is why it has no inland salt lakes; if DEUS wants endorheic salt lakes add an evaporation term rather than copying the rings.
- The wet-cap and squash constants are tied to DF's unitless temperature; DEUS should express them in its own degrees.

**Sketch (original).** `finalizeTerrain(cells) { ramp(); flattenValleys(); orographic(wind(lat)); lapse(); squash(envelope); wetCap(); recomputeDerived(); }` with `recomputeDerived` also exported for live simulation.

**Copy-risk.** The 221-row wind table, 100..149 ramp band, 1000 lapse divisor, 25-degree squash band, 166 − rain cap and the 100/66/33 rings are DF tuning. Keep the ordering and the "derive after edit" rule.

---

## 3. P1 techniques

### T7. Regions by label propagation; two-level kind/biome; size-filtered counts as design levers

**Description.** Segment the world into regions of connected same-kind cells using a coarse kind (ten values) for connectivity and the fine biome only for content; count only regions above a size threshold; expose the counts as designer targets.

**Why it works in DF.** Regions are 4-connected components of same-kind cells and landmasses 8-connected non-ocean components, built by iterative minimum-label propagation *(biomes_regions-09, ledger status inferred; mechanics reproduced)*. Biomes map to ten region kinds through small tables, hills split from grassland by drainage *(biomes_regions-08)*. A region object carries tile lists, a biome histogram, total and boundary counts, savage subsets, centre, bounding box and alignment flags; a landmass carries area and bounds *(biomes_regions-10)*. A region counts toward the design targets only above a size threshold (lower for mountains bordering lowland, never for lakes) *(biomes_regions-12)*, which stops speckle spoiling the statistics. The builder runs several times *(biomes_regions-13, ledger status inferred)* and the cap on total regions is a rejection *(params_rejection-15, id 31)*.

**Adaptation to DEUS.** Regions are the natural unit for the biome placement rule engine (WG.00.31): run propagation on (stack, band) kind over the cell grid, keep a per-region record `{ id, kind, cells, bbox, centre, histogram, flags }`, and give WG.63.05's physical IDs (`River #83`, `Forest #04`) to these records. The 3×3 wrap means labels must propagate across map seams (WG.00.26). The size threshold is the lever that keeps "all 30 combinations reachable" (WG.00.33) meaningful: count a combination only when a region of it is large enough to host content.

**Pitfalls.**
- DF uses two different biome-to-kind maps, one of which treats lakes as ocean for connectivity *(auditor extra)*; use one map.
- Label propagation to a fixpoint is quadratic in the worst case; a union-find pass is the deterministic replacement.

**Sketch (original).** `label[c] = c; repeat { for each cell, for each 4-neighbour of same kind: unify(min) } until stable; regions = groupBy(label); keep regions with size >= threshold[kind] for counting`.

**Copy-risk.** The ten kinds, the 35/20 thresholds and the 648/192-byte object layouts are DF's. Keep the two-level idea and the threshold lever.

---

### T8. Geology as shared column stacks; anisotropic seeded flood; least-used-first; scarcity divisor

**Description.** Store one column stack (soil cap plus stone bands, each with material, thickness and inclusion lists) per geological province, and only an index per cell. Grow provinces by a seeded flood with per-side resistances so they come out elongated. Choose layer materials least-used-first. Place minerals with one scarcity divisor against per-material frequencies, guaranteeing at least one placement per candidate pass.

**Why it works in DF.** Every tile stores only an int16 index into a vector of geo-biomes *(geology-02)*. Seeds number about one per hundred tiles, each carrying four random resistance values shared by runs of fifty seeds *(geology-04)*; a province's kind is land, shallow ocean, deep ocean or sand desert, with a volcanic variant where volcanism is high *(geology-05)*; growth is a frontier flood that absorbs a same-kind neighbour only when a d4 beats the side's resistance, then one reseed per uncovered region and a second pass *(geology-06)*. A new layer's material is drawn uniformly among the class's inorganics with the lowest usage counter *(geology-08)*. Minerals are placed per inorganic per frame across four inclusion-type passes *(geology-10)*; a candidate is placed when `rand(scarcity) < frequency`, and a pass repeats until something is placed *(geology-09, ledger status inferred on the guarantee's scope)*. The "Mineral occurrence" labels map to scarcity values *(auditor extra)*. A volcano is a cell with volcanism ≥ 100 *(geology-21)*.

**Adaptation to DEUS.** WG.00.30 makes `bands.js` the single band table and `geologyAt(z)` the deep-material rule; T8 adds the horizontal dimension: a per-cell province index into a stack whose rows are keyed by depth band, so `geologyAt(cell, z)` reads `stack[province(cell)].rowFor(band(z))`. Thickness is authored in feet and converted to z at realisation. WG.61.01's deterministic 3D vein generator is where the scarcity divisor belongs: inclusion records on the stack rows become vein seeds whose placed mass is debited once through the WG.61.02 ledger (NAT.02.MASS). Province kind from climate (high volcanism → VOLCANIC stack) is the geology-first input WG.00.30 asks for; WG.64.03's patinas and indicator flora read the same inclusion records.

**Pitfalls.**
- DF's growth runs exactly two passes and can leave cells unassigned *(geology-06, auditor nuance)*; finish with a nearest-province fill.
- One inorganic per frame on the main thread is DF's UI-slicing choice; in DEUS the mineral pass runs in the headless or worker context (T14).

**Sketch (original).**
```
province = Int16Array(cells).fill(-1); seeds = ~cells/100 random unassigned cells with (resistW/N, resistE/S)
grow(frontier): absorb same-kind unassigned neighbour if roll > resistance(side); inherit resistances
fill unassigned by nearest province
stack(p) = soilCap(kind) + bands(kind, band order, thickness in feet), material = leastUsed(class)
for inorganic, pass: for row in stacks matching env: if rand(scarcity) < freq: row.inclusions.push(inorganic, pass)
```

**Copy-risk.** The soil and stone recipes (counts, class alternation, thickness rolls), the 1-per-100 and 50-seed constants, the 5×5 window, and the 100/500/2500/10000/50000 scarcity labels are DF implementation. The two-level model, anisotropic flood, least-used-first and scarcity divisor are structural.

---

### T9. Feature layers as parameterised regions; z-budget consumed at realisation

**Description.** Treat caverns, a magma layer and an underworld as horizontal layers, each tiled into regions that own their own parameters (openness, passage density, water), and spend the z-budget only when a local map is realised.

**Why it works in DF.** The cavern builder computes per tile the first layer's top as the minimum surface elevation in a 5×5 window minus a parameter, then builds up to five layers gated by the cavern count and two bottom-layer flags `[BIN:func 0x140f8a020]` *(geology-16)*. Each layer is tiled into regions by a seeded flood, and each region owns a feature-init object whose water is drawn in the parameter range and whose openness is biased high while passage density is biased low, both clamped to the ranges *(auditor extra correcting the analyst's reading)*. The above-ground z parameter is read only by string-free local-map functions, i.e. the z-stack of a site is assembled at embark *(geology-19, ledger status inferred)*.

**Adaptation to DEUS.** The Caverns band (−10..−5) and the D1 void manifold `voidAt` / `chunkCarveMask` (WG.62.03) already decide where void is; T9 adds a region layer over the cell grid per band so that each cavern region has a character (open dome vs tight passages vs flooded), which `voidAt` reads as parameters instead of per-cell noise. WG.62.04's `magmaAt` / `chambersFor` is the magma-layer analogue with a finite core reservoir. The "z-budget at realisation" rule is exactly WG.00.46's laziness: the coarse pass stores per-cell layer tops in feet; the (area, z) build converts them to strata.

**Pitfalls.**
- DF displays cavern numbers oddly when fewer than three exist *(geology-18, inferred)*; number DEUS bands, not layers.
- DEUS's own void caps (WG.62.03: Deep Earth at most 8 %, Caverns at most 25 % for the seed-18 MIXED case) belong in the check table (T2), not inside the carver.

**Copy-risk.** Bias constants, the 5×5 window and the five-layer scheme are DF's; the region-with-parameters idea is generic.

---

### T10. Overlay placement as a square budget balanced across kinds

**Description.** Place an alignment or hazard overlay (haunted, blessed, corrupted, scarred) on whole regions, drawing down a square budget per size class and always choosing the region kind that has received the least so far.

**Why it works in DF.** Regions are bucketed by size (≥ 100 large, ≥ 25 medium, else small) and processed per bucket against good/evil square budgets reduced by each placed region's size *(biomes_regions-14)*; within a bucket the side with the larger remaining budget goes next, the kind with the fewest already-aligned squares is chosen (random tie-break), then a random region of that kind *(biomes_regions-15)*. The chosen region gets a flag, its cells' evilness is re-rolled into the aligned band, and its populations are rebuilt from matching raws *(biomes_regions-16, ledger status inferred on the raw-flag identities)*. Evil regions can carry a weekly weather emission defined in generated content *(biomes_regions-20)*.

**Adaptation to DEUS.** The WILD stack and the DEC-073 danger tiers want a controllable spread of dangerous or strange regions across all biomes rather than clustered in one; the budget-by-size-class with least-served-kind selection does that with no geometry. The same scheduler serves WG.63.03's rare disaster scars when a scenario is simulated forward, and any later "blessed/cursed ground" layer if the Owner names one.

**Pitfalls.** Budgets in squares favour big regions; keep the size classes so small regions get their share.

**Sketch (original).** `for class in (small, medium, large): while budget[class] > 0 and candidates: kind = argmin(served[kind]) over kinds present; r = random region of kind; apply(r); budget -= r.size; served[kind] += r.size`.

**Copy-risk.** The 25/100 size classes and the 0..32 / 66..100 rolls are DF's; the scheduler is generic.

---

### T11. Vegetation as a derived value; species rows as placement rules; abstract per-region records

**Description.** Never store vegetation; derive it. Let each species row declare where it may occur (biome set, depth band, alignment, frequency) and let generation intersect those rules with each region's facts to produce abstract records, not units.

**Why it works in DF.** Vegetation is a pure function of rainfall, temperature and drainage, recomputed after rainfall changes *(gap_stage6-10; vegetation_wildlife-02, ledger status inferred on the label)*. The wildlife importer intersects each raw's biome flags with the region's biome set, weights by frequency and world size, and gates savage species on regions with untamed cells *(vegetation_wildlife-07, -08)*; it caps distinct animal kinds per region at `min(50, 7 + cells/10)` *(vegetation_wildlife-06)* and appends records through one helper that sums the region's biome histogram over the raw's accepted biomes *(vegetation_wildlife-11)*, writing one rolled count *(auditor extra)*. Boss, aligned and non-surface species are excluded *(vegetation_wildlife-22, ledger status inferred)*; the rare-species option rewrites flags once at raw finalisation *(vegetation_wildlife-14)*.

**Adaptation to DEUS.** DEC-073 replaces populations with spawn designations per (area, z): tier, tables, lair and den anchors, caps. DF's importer is the template for producing them at Year 0: for each region and band, intersect the NAT.07.01 bestiary rows (biome-depth cells, tier, frequency, group size, light and time windows) with the region's facts (stack, band, wildness, water class, landmass size) and emit a designation with a cap scaled by region size. The derived vegetation value seeds WG.68.01's succession stage at climax and WG.67.02's moisture band. Lairs and dens (WG.68.10) are DF's lair-bound beasts: counted and placed, not frequency-rolled. Policy switches are applied once when the bestiary loads, as DF does.

**Pitfalls.**
- DF's reach model pulls a per-raw random home point toward the region centre *(auditor extra)*; it is opaque to designers. Use an explicit "regions served" count per species instead.
- Everything DF does with persistent populations is out of scope under DEC-073; only the Year-0 designation step carries over.

**Copy-risk.** The 7/10/50 cap constants, the raw flag bit layout and the vanilla species tables are DF's. The rules-intersect-facts pattern and the size-scaled cap are generic.

---

### T12. Multi-scale lazy realisation; sites as abstract records

**Description.** Keep three scales: a coarse cell grid generated eagerly, mid-level detail generated when a region is first needed, and tile-level content generated when an area is entered, each deterministic from the coarser scale plus a derived stream.

**Why it works in DF.** Fields exist only at world-tile resolution *(elevation_fields-04)*; cavern z-ranges and the above-ground budget are applied by local-map code, not worldgen *(geology-19, ledger status inferred)*; river exit positions within a tile edge are small integers resolved later *(hydrology-26, ledger status inferred)*; caves are world sites with their own stored seeds *(geology-20, ledger status inferred)*; finalisation processes one site per frame through a site routine *(gap_post-11)*; and the RTTI exposes `site_realization_building_info_*` classes (brief), which `[PUBLIC]` knowledge identifies as the lazily built site layouts.

**Adaptation to DEUS.** This is WG.00.46 (lazy area generation, per-area checksums, `levels:areaGenerated`) and WG.00.28 (per-map LOD) stated as a rule: coarse cells are the truth, areas are a deterministic function of (cells, streams). Sites (WG.62.01 race starts, nine faction camps of eight founders) should exist as abstract records with a seed and a footprint on the cell grid, realised into tiles on first build. The per-area checksum excludes transient spawned creatures (WG.00.47) and includes designations, lairs, dens and notables; checksums are the test that the lazy path and the New Game path agree.

**Pitfalls.** Anything realised early must never be re-derived differently later; the derived-stream rule (T4) plus the "coarse fields final before any area" ordering is what guarantees it.

**Copy-risk.** None in the pattern; DF's site layouts, building tables and feature-init classes are its own content.

---

### T13. Names as word indices plus language; position tables; two-table theming; select/cull recipes

**Description.** Store a name as word indices with a language id and a form type; render English or the invented tongue on demand. Build, once, per-position word tables from a word pool using each word's usage flags; theme a place by pairing a small head-noun table with a mood modifier table built from select and cull groups.

**Why it works in DF.** One routine names everything in worldgen *(gap_name-01)*; the record is two strings, seven word indices, seven parts of speech, a language, a type and a flag *(gap_name-02)*; it takes a head-noun table A and a modifier table B *(gap_name-03)*; 55 name types dispatch to ten form bodies *(gap_name-04)*; the generic body fills "The X" from A then adds "of Y" or an adjective with roughly even odds *(gap_name-05)*; adjectives are ordered by a per-word rank and the name is retried if two slots share a word *(gap_name-07)*. Tables are compiled once per recipe from symbol groups: a noun select list, a modifier select list (empty means all words) and a cull list removed from both *(gap_name-10)*, with 16-bit usage flags routing words into positions at build time *(gap_name-11)*. Neutral, evil and good regions share kind nouns and differ in modifier groups *(gap_name-12, -13)*; landmasses pick nouns by area *(gap_name-14)*; peaks take a random usable language *(gap_name-15)*; an empty position list falls back and logs *(gap_name-08)*.

**Adaptation to DEUS.** WG.63.05 decouples the physical ID from faction names and WG.63.06 evolves names from events; T13 supplies the machinery: a DEUS word pool with usage flags and an adjective rank; one translation table per SRD-race culture; name records on the physical objects as `{ words[], parts[], language, form }`; recipes keyed by (object kind, mood) where mood can come from events (a battle makes "Red" available for the river's human name while the elven name keeps the old recipe). Rendering is a view, so the same record prints in any culture's tongue.

**Pitfalls.** DF's generator has no push/pop of its own and draws from whatever stream is active *(gap_name-23, ledger status inferred)*; give naming its own stream per object id so a renamed world keeps other names stable.

**Sketch (original).** `tables[k] = route(selectUnion(nouns) \ cull), route(selectUnion(mods) \ cull); name = { words: [pick(heads, HEAD), coin ? pick(mods, GENITIVE) : pick(mods, ADJECTIVE)], language }; retry if duplicate word`.

**Copy-risk.** The 2196 words, the 84 symbol groups, the four translation tables and the 68-slot recipe table are Bay 12 text and must not be copied *(gap_name-28, ledger status inferred as a licensing judgement)*. The flag-routing, two-table and select/cull mechanisms are reusable.

---

### T14. Re-entrant stage machine, time-sliced, with completion flags and honest progress

**Description.** Drive generation as `step()` calls on an explicit stage word; run as many steps as fit in a millisecond budget per frame; record phase completion as flags; show progress as "the phase after the highest completed flag" with real counters.

**Why it works in DF.** The map generator runs one sub-stage per call and advances the stage word in its common tail *(params_rejection-13)*; the final checker iterates inside a 100 ms per-frame budget *(params_rejection-25; gap_post-02)*; the prehistory placer records completion in eight phase bytes zeroed with one store on stage change *(gap_post-01)*, and the UI tests them from the highest down so the label names the running phase with no off-by-one *(gap_post-06)*; the year machine is a 17-sub-step counter *(gap_post-08)*; finalisation processes one element per frame with `n / N` counters *(gap_post-11)*. The cumulative terrain labels, by contrast, lag the work by one or more stages *(gap_post-20)*, and the civilisation phase spans many calls despite appearances *(auditor extra)*, so flags beat labels.

**Adaptation to DEUS.** The same `step()` function serves the RMMZ scene (called from `update()` under a frame budget, or from a Web Worker posting progress) and the headless harness that Codex Astra runs (called in a tight loop until done, WG.00.33). Completion flags per stage, zeroed together on restart (T2), feed both the progress UI and the test log. Never infer progress from the stage word alone.

**Pitfalls.** DF slices geology one inorganic per call for UI responsiveness *(geology-10)*; in a worker that slicing is unnecessary and only adds state.

**Copy-risk.** None in the pattern; the label strings, the 100 ms budget and the 5000-entry flush threshold are DF's.

---

### T15. Presets plus command-line batch generation for QA

**Description.** Generate worlds from a named parameter set and a seed without a UI, in batch, so acceptance tests run across many seeds.

**Why it works in DF.** The stage worker that calls the map generator also handles the command-line generation path, referencing the parameter-set and "create world now" strings `[BIN:func 0x140deea70]` (brief anchor map); presets are complete parameter sets *(params_rejection-07)*; the worldgen status block serialises stage, rejection counts, last rejection and the resolved `last_used_*` seeds *(gap_name-25)*, so a batch run leaves a record of what it did and why it failed.

**Adaptation to DEUS.** WG.00.33 is a headless multi-seed test; make it a `tools/` script that takes `--preset`, `--seed`, `--count` and writes one JSON summary per seed (checks passed, shortfalls, rejection ids, resolved seeds, timing, checksums). The nine-faction start solver (WG.62.02) and the seam test (WG.00.26) are consumers of the same batch. Keep the script outside `game/` and never let it become a second load list (AGENTS.md: `plugins.js` is the only load list).

**Copy-risk.** None.

---

### T16. Exports, rejection log, parameter dump on error, periodic snapshots

**Description.** Make generation explain itself: a log line per rejection with the shortfall, a dump of the full parameter record when an internal inconsistency is detected, image and text exports of the finished world, and periodic snapshots of regional state during any forward simulation.

**Why it works in DF.** Each check logs its message and id through one writer that also keeps per-id counters and appends to `map_rejection_log.txt` when an init flag is set *(params_rejection-18, ledger status inferred on minor details)*. A river-sorting inconsistency is treated as a world-gen error: a note is written to `errorlog.txt` and the entire parameter set is dumped through the normal serialiser, once *(params_rejection-24)*. Exports exist for a world map, a detailed map, legends, history, sites and populations, and the parameter set (brief; file markers `-world_map`, `-detailed.bmp`, `-legends`, `-world_history`, `-world_sites_and_pops`, `-world_gen_param`). The history stepper writes a regional snapshot every tenth year *(gap_post-10)*, and the region save is written in named sections *(brief; region save writer `[BIN:func 0x140efd610]`)*.

**Adaptation to DEUS.** The headless run should emit: the resolved parameter record; a rejection log with shortfalls; a per-field PNG of the cell grid (elevation, rain, temperature, drainage, wildness, biome stack, band reachability) rendered from the typed arrays (test-harness renders are not art under DEC-007); a regions JSON with IDs, kinds, bboxes and names; and per-area checksums. These are the artefacts Grok reviews and the Owner inspects. For WG.65.13's long-time catch-up, periodic state snapshots are the playback and the regression fixture.

**Copy-risk.** None in the practice; DF's export formats and legends vocabulary are its own.

---

## 4. P2 techniques

### T17. History as a year-stepped simulation with an event vocabulary and a stop test

**Description.** Simulate history as a year loop of ordered sub-steps producing typed events over abstract actors and sites, with a single stop test at the year boundary and snapshots along the way.

**Why it works in DF.** Prehistory places caves, alignment, beasts, cave populations and civilisations in ordered phases recorded as completion flags *(gap_post-06)*; the year machine runs 17 sub-steps per year and increments the year at sub-step 13 *(gap_post-08)*; one stop test per year considers the end year, a dead-beast percentage after a start year, or the player's "use world now" flag *(gap_post-09)*; ages are recomputed and a regional snapshot written every tenth year *(gap_post-10)*; events and historical figures are polymorphic vectors counted by the UI *(gap_post-18; -19 inferred)*; 153 `history_event_*st` RTTI names exist (134 event classes plus 19 collection classes; the brief's "~70" undercounts, see `04_evidence_appendix.md` §3). `[PUBLIC]` descriptions summarise the result as the Age of Myth → Age of Legends progression.

**Adaptation to DEUS.** Standard New Game begins at Year 0 and history is **not** pre-materialised (WG.00.14, INV-SIM-01); simulating forward is preserved only as a developer, simulation or scenario tool (WBS §1 rule 7). So T17 is not a worldgen stage. It is: (a) the shape of the scenario tool, if the Owner opens one; (b) the event vocabulary for live systems that already need typed, persistent events — WG.63.03 disasters, WG.63.06 toponymic evolution, WG.65.16 provenance; and (c) the structure of WG.65.13's deterministic catch-up (ordered sub-steps per period, one stop test, snapshots as fixtures). Keep actors abstract (faction records, not units) in any forward simulation.

**Pitfalls.** DF's year machine and placer are entangled with stream handling and UI; keep a scenario tool fully headless and seedable from T4.

**Copy-risk.** The sub-step order, phase labels, 300-per-year budgets and the event class list are DF's. The loop shape and stop-test placement are generic.

---

### T18. Procedural content emitted in the hand-authored data format; spheres as semantic glue

**Description.** Let procedural generators emit records in exactly the format hand-authored content uses, so one loader handles both, and tag every generated and authored record with a shared semantic vocabulary so independent generators agree.

**Why it works in DF.** The engine calls a Lua layer with a parameter table (counts of demons, night creatures, mythical entities, evil clouds and rains, a mythical sphere, pre-generated randoms, a token prefix) and the engine helpers `trandom`, `get_random_inorganic` and `raws.register_*` (brief, established; the brief's `one_in`, `generate_from_list` and `get_random_sphere_noun/adjective` are defined in Lua, see `04_evidence_appendix.md` §6). The generators write raw-token text: evil cloud and rain inorganics and regional interactions tagged with region-condition tokens are emitted by `generators.lua` and `evil.lua` *(biomes_regions-20)*; divine and mythical materials are built from templates and keyed by sphere in `materials.lua` *(geology-26, ledger status inferred)*; the Lua generation runs on its own nested stream *(auditor extra)*. The "sphere" vocabulary beyond those helpers (gods, domains, mythical materials) is `[PUBLIC]` knowledge about DF and was not traced here.

**Adaptation to DEUS.** DEUS already has catalogue-first data (WG.20 Master Semantic Asset Catalogue, NAT.07.01 bestiary rows, WG.00.32 stack sheets). The rule to adopt: a generated creature, material, place-name recipe or landmark record is a row in the same JSON schema as an authored one, validated by the same checks, saved in the world save — never a second load list and never a file in `C:\Dev\DEUS` that the game does not load (AGENTS.md). The semantic glue is a small tag vocabulary shared across catalogue rows (biome stack, band, danger tier, element/mood tags) so that a generated landmark name, its indicator flora and its spawn table can be chosen to agree. Spheres proper are a design question for the Owner; the mechanism is just shared tags.

**Pitfalls.** Generated text that bypasses validation is how inconsistencies hide; route it through the same loader and the same T2 checks.

**Copy-risk.** DF's Lua generator scripts and raw token grammar are its content; emit DEUS JSON rows.

---

## 5. Data formats and serialization patterns worth noting

These are shapes, not layouts to copy. Each is given with the DF observation and the DEUS form it suggests.

| Pattern in DF | Evidence | DEUS form |
|---|---|---|
| One fixed-stride record per world tile with a run of int16 field slots and an "unset" sentinel, so one routine can fill many fields | *(elevation_fields-02, -03)* | `Int16Array` per field (SoA); a sentinel only inside generation, never in the save |
| Flags as a separate bit-array object with bounds-checked set/test/clear helpers, carrying river, link, lake, peak, sink and start bits | *(elevation_fields-03 auditor nuance; hydrology-24, inferred; `[PUBLIC]` bit names)* | a `Uint32Array` of per-cell flags with named constants; river links as a 4-bit mask in their own `Uint8Array` |
| Region object: kind, coordinate lists, biome histogram, counts, bbox, centre, alignment flags; landmass: area, bbox | *(biomes_regions-10)* | region JSON `{ id, kind, cells, bbox, centre, histogram, flags, name }` with cells stored as runs |
| River object: parallel per-tile vectors (x, y, flow, exit position) plus end position and flags; mouth-first order | *(hydrology-14, -16)* | river JSON with parallel typed arrays and `downstreamId`; order guaranteed by construction |
| Geology: per-tile int16 province index; provinces saved as count-prefixed records of layers with material, type, top, bottom and inclusion vectors | *(geology-02; -03, inferred on two field labels)* | `province: Int16Array`; `stacks: [{ rows: [{ band, material, topFt, bottomFt, inclusions }] }]` |
| Parameter set as one flat struct with a fixed-order text serialisation and an embedded optional painted-field table | *(params_rejection-01, -23)* | versioned JSON; painted grids as base64 typed arrays |
| Save written in named sections (dims, map, geology, subregions) by one writer in a fixed order | brief, `[BIN:func 0x140efd610]` | sections with their own version fields so a loader can skip or migrate one section |
| Worldgen status serialised with stage, rejection counters, last rejection and the resolved seeds | *(gap_name-25)* | a `worldgen` block in the save with resolved seeds, attempt index and checksums (WG.00.46) |
| Names as word indices, parts of speech, language id and form type | *(gap_name-02)* | `{ words, parts, language, form }` on the physical object; strings rendered, never stored |
| Periodic regional snapshots during forward simulation | *(gap_post-10)* | snapshot files per N periods for WG.65.13 regression and playback |

Sparse-save discipline (WG.00.43: no entry for an unchanged outer level) should apply to all of the above: coarse cells and provinces are small and always saved; per-area tile data is saved only when it differs from the deterministic regeneration.

---

## 6. What NOT to copy

### 6.1 Legal (Bay 12 content and implementation)

- **Text content:** the word list, symbol groups, translation tables and name recipes *(gap_name-28)*; raw files for creatures, plants, inorganics, entities; the Lua generator scripts; help texts and status labels; biome and token vocabularies.
- **Tuning tables:** the 42-biome decision tree thresholds, the 221-row wind table, the latitude blend breakpoints, default parameter formulas and the ten presets, the geology recipes, the scarcity labels, the wildlife caps, the alignment rolls, the river flow classes, the lapse/squash/cap constants, the salinity rings.
- **Implementation detail:** struct layouts and offsets, flag-bit numbering, the RNG buffer layout and string-folding, the 53-id rejection list and its 27-name mapping, the sub-step sequence of the year machine, the decompiled control flow. Anything in this reference that reads like a layout or a constant is there to explain, not to port.
- **Pseudocode in documents 02a, 02b and 03** is original wording of mechanisms; implementing from it is intended. Implementing from the decompilation files in the work directory is not, and those files must not enter the repository.

### 6.2 Design mismatch with DEUS

- **Pre-materialised history.** DF generates centuries before play; DEUS starts at Year 0 (WG.00.14, INV-SIM-01). T17 is a tool shape, not a stage.
- **Persistent wildlife populations.** DF stores and simulates per-region populations; DEUS spawns by rule (DEC-073). Only the Year-0 designation step (T11) carries over.
- **World-tile-only terrain.** DF realises coarse cells into fixed local blocks; DEUS has one-foot strata, stair-free multi-layer slopes (WG.00.20) and a 32-layer column. Per-tile refinement, ramps and cuts are DEUS's own problem.
- **Fixed sea level.** DF fixes the ocean band and shifts the field to fit; DEUS lets sea level be the height that leaves (AGENTS.md).
- **Global RNG stack with unpaired pops**, **two elevation units in one pipeline** and **vestigial passes** *(hydrology-17, -18)*: explicit streams (T4), one unit (feet), no dead code.
- **UI slicing on the main thread** and **cumulative labels that lag the work** *(gap_post-20)*: generate headless or in a worker; report with completion flags (T14).
- **Geometric-only salinity, tile-count lake extent, rivers traced before final rainfall**: order and physics as in T5 and T6.
- **Compiled-in presets**: data, not code (T3).
- **A second load list or generated files outside the game's loader**: `plugins.js` is the only load list; a file enters the live tree only if the game loads it (AGENTS.md).

Every ledger id this document relies on is cited inline at the point of use; the ledger itself (`VERIFIED_CLAIMS.md`) is the index.
