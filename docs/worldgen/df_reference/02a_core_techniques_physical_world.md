# DF Reference 02a — Core Generation Techniques: The Physical World

**Source analysed:** Dwarf Fortress 53.16 Classic (Windows x64 build of 2026-08-03), binary + data files, no source code
**Status:** research reference for DEUS/Endrath world generation — not a spec, not a work item
**Date:** 2026-10-10
**Legal note:** Reverse-engineered for learning and interoperability; implement original systems, do not port code or data wholesale.

---

## 0. How to read this document

### 0.1 Status key and citation form

Every statement about what *this binary* does is backed by a claim in the adjudicated ledger (`VERIFIED_CLAIMS.md`). Citations give the evidence tag and the ledger claim id, e.g. `[BIN:func 0x140f554a0] (EF-01)`. A claim id with no other label is a ledger claim of status **verified** (reproduced independently by analyst and auditor). Other labels:

| Label | Meaning |
|---|---|
| (none, ledger id given) | ledger status *verified* |
| `[PUBLIC]` | well-known public knowledge (DF wiki, DFHack df-structures, raw files); not established from the binary |
| `[INFERRED]` | ledger status *inferred*, or a detail that exists in the ledger only as an auditor's verdict/extra note rather than as a kept claim; mechanics are usually real but a label, purpose or generalisation goes beyond the evidence |

Claims the ledger *refuted* are not presented; where the refuted analyst text had a correct core, only the corrected reading is given and it is labelled `[INFERRED]` unless a separate verified claim covers it.

Ledger report abbreviations: **PR** params_rejection · **EF** elevation_fields · **HY** hydrology · **BR** biomes_regions · **GU** geology_underground · **VW** vegetation_wildlife · **S6** gap_stage6_salinity_temperature_pass · **PM** gap_post_map_pipeline_order · **NS** gap_name_generation_and_seed_streams.

Document short labels used in cross-references: **01** = `01_triage_architecture.md`, **02b** = `02b_core_techniques_living_world.md`, **03** = `03_adaptation_tech_catalog.md` (its techniques are T1…T18), **04** = `04_evidence_appendix.md`.

### 0.2 Where the physical world is built: the stage machine

The map generator is one re-entrant function driven once per frame by a stage worker while a global 16-bit sub-stage word is in 1..9; each call runs exactly one sub-stage and advances the word `[BIN:func 0x140f4a790]` (PR-13, GU-22). A failed check jumps to a common exit returning 1 (the final region check returns 2); the worker bumps the "(N rejected)" counter and resets the stage to 2 (regenerate fields only; the RNG stream simply continues) or to 1 for code 2 (full re-init) `[BIN:func 0x140df09a3]` (PR-14).

| Stage | Physical-world work done in that stage | Ledger |
|---|---|---|
| 1 | clear world, allocate the W×H tile grid, run the Lua procedural-object generator | PR-13 |
| 2 | **field synthesis**: sentinel clear, mesh seeding, border lines, edge-ocean retry, volcanism hotspots, interior fractal fill | PR-13, EF-05, EF-08 |
| 3 | **terrain checks**: latitude term on temperature, peaks, elevation bands with ±10 repair, edge-ocean rejection, 33/66 evenness, initial biome squares, vegetation seed, volcano count; then elevation compression | PR-15, PR-20, EF-11…EF-15, BR-07 `[INFERRED]` |
| 4 | first region build and "<Biome> region count" checks; river-start candidates; **erosion cycles** (one per tick) | HY-01, HY-03, BR-13 `[INFERRED]` |
| 5 | **lakes** from sinks, majority fixpoint, **loop-erased river extraction** | HY-01, HY-11, HY-12 |
| 6 | **terrain finalisation** (slope ramp, volcano cones, valley flattening, orographic rain, slope ramp again, temperature corrections, vegetation recompute, salinity rings), second region build, SUBREGION_MAX, parameter dump; later ticks: **geology/mineral slices**, then the **cavern/feature-layer builder** | S6-04, S6-09, S6-12, BR-13 `[INFERRED]`, GU-10, GU-16, GU-01 `[INFERRED]` for the geology-before-caverns order |
| 7 | post-erosion elevation-band re-check | HY-18 |
| 8 | **wildlife importer** plus one per-tile initialisation pass | VW-05, PM-01 |
| 9 | final region-count checks, then the **prehistory placer** (caves → good/evil → megabeasts → other beasts → cave pops → cave civs → civilisations), then the year loop | PM-02, PM-03, PM-06 |

The UI's cumulative status list ("Preparing elevation…", "Setting temperature…", "Running rivers…", "Forming lakes", "and minerals…", "Growing vegetation…", "Verifying terrain…", "Importing wildlife…") is chosen by `stage >= N` thresholds `[BIN:string 0x1718c30]` (PR-25) and in most cases names work done one or two stages later than the label appears (PM-20). Do not read the labels as the pipeline.

### 0.3 The world-tile record (the data model everything below writes into)

World tiles are 112-byte records reached through a column-pointer array; width and height live on the world object; the climate fields are 16-bit signed shorts at a fixed base inside the record, one per *slot* `[BIN:func 0x140f4c2cc]` (EF-03). Flags are a bounds-checked bit-array object, not a plain word (EF-03).

| Slot / field | Role | How it is produced | Ledger |
|---|---|---|---|
| slot 0 | elevation | fractal; repaired, compressed, eroded, ramped | EF-02, BR-07 |
| slot 1 | rainfall | fractal; orographic sweep | EF-02, S6-15 |
| slot 2 | vegetation | **derived**, never generated | PR-20, S6-10 |
| slot 3 | temperature | fractal + latitude term; lapse/squash/wet-cap in stage 6 | EF-11, S6-09 |
| slot 4 | evilness | hidden fractal slot, fixed range 33..65; re-rolled by good/evil placement | EF-10 `[INFERRED]` naming, BR-16 `[INFERRED]` |
| slot 5 | drainage | fractal | EF-02 |
| slot 6 | volcanism | fractal (+ hotspot seeds) | EF-15 |
| slot 7 | savagery | fractal; no later placement step | BR-19 |
| salinity | ocean-distance rings 100/66/33/0 | stage 6 | S6-01…S6-03 |
| region id, landmass id | int32 labels written by the region builder | stage 4/6 | GU-02, BR-22 `[INFERRED]` naming |
| geo_index | int16 index into the geo-biome list | stage 6 | GU-02 |
| flag bits | 0 river, 2 sink, 4 scratch, 5–8 river links, 13 chosen peak, 14 lake, 15 brook, 17 final-river start | | HY-24 `[INFERRED]`, HY-20, EF-03 |

Slot identities 2 = vegetation and 4 = evilness are not named anywhere in the binary; they follow the public `region_map_entry` order and are consistent with every use found `[PUBLIC]` (EF-24). Unset cells carry the sentinel −30000 (EF-02).

Copy-risk: the record stride, slot order and flag-bit numbers are DF's layout, quoted as evidence; DEUS keeps each field in its own typed array with named flag constants (03 §5).

### 0.4 Randomness

Every field, river and placement draw comes from an MT19937 generator whose raw 32-bit output is reduced to `[0,n)` by `(raw mod 0x7fffffff) / (0x7fffffff/n + 1)`, with `n <= 1` returning 0; the fractal routine inlines this reduction and the rest of worldgen calls a wrapper `[BIN:func 0x140071ec0]` (EF-22, GU-25). The generator is a *stack* of MT states selected by a depth word: push-from-string XOR-folds the seed string's bytes into a short key and expands it with the standard MT recurrence; push-from-value is `init_genrand`; a three-value push combines three integers with a nested pairing function (NS-18, NS-19). World init pushes a stream from **SEED** at its very end (NS-20), and the map stages run on that stream — region, river and peak names included — since the generator itself contains no push or pop `[INFERRED]` (NS-23); the prehistory placer pushes a **HISTORY_SEED** stream when it starts placing megabeasts (PM-13). **NAME_SEED** is used only to name the world (NS-20). Rejection retries do not reseed — attempts differ because the stream keeps running (PR-14).

Copy-risk: the reduction formula, the buffer stacking and the seed folding are implementation details; use any good PRNG with your own stream discipline (one named stream per concern, push/pop paired lexically).

---

## 1. Fractal field generation

### 1.1 What DF does

**One routine, seven fields.** All climate fields are produced at world-tile resolution (17/33/65/129/257 tiles per side; nothing in the stage touches a finer grid) by a single recursive square-subdivision midpoint-displacement routine `[BIN:func 0x140f554a0]` (EF-01, EF-04). The routine takes a square, sets its four edge midpoints to `(a + b + rand01) >> 1` plus a jitter `random(2v+1) − v`, sets the centre to `(c1 + c2 + c3 + c4 + rand0..3) >> 2` plus the same jitter, halves the jitter amplitude for the next level with a floor of 1, and recurses into the four quadrants that still contain interior points (EF-01). It fills seven slots in one recursion — elevation, rainfall, temperature, evilness, drainage, volcanism, savagery — skipping the vegetation slot, and writes only cells still holding the −30000 sentinel (EF-02). Random rounding (the extra 0/1 and 0..3 bits) keeps integer means from drifting downwards.

**Bounds are a randomised bounce, not a clip.** While a value is below the slot minimum it becomes `min + random(min − value)`; while above the maximum it becomes `max − random(value − max)` `[BIN:func 0x140f556d0]` (EF-09). This is what prevents flat plateaus at the parameter limits.

**Mesh seeding (coarse-to-fine).** Before the recursion, the map generator seeds a lattice of grid points. `step0 = min(W−1, H−1)`; the step is halved while it exceeds 8 and while fewer than `maxMesh` levels exist, where `maxMesh = max(1, the six *_FREQUENCY mesh values)` `[BIN:func 0x140f4b274]` (EF-05). At each level and each new grid point, a user slot whose mesh value exceeds the level (and is not 1) receives an **independent weighted-range draw**; at level 0 without weighting it receives a uniform draw in `[min,max]`; otherwise it is displaced from its already-seeded neighbours by the interior variance block, which is halved per level (EF-05). The editor labels the mesh value 1 as "Ignore" and 2..6 as 2×2 … 32×32; the editor caps the value at 2/3/4/5/6 for worlds ≤17/33/65/129/257 (EF-04, EF-05). A mesh value *m* therefore places independent seeds at spacing `(dim−1)/2^(m−1)` and lets the fractal fill below that (EF-05).

**Weighted Range.** The `[min,max]` interval is cut into five equal buckets (boundaries at 20/40/60/80 %); a bucket is chosen by walking the five user weights with `random(sum)` and the value is drawn uniformly inside it `[BIN:func 0x140f4b11e]` (EF-06). This is the designer's histogram knob: "mostly lowland with some mountains" is a weight vector, not a change to the fractal.

**Variance.** X-Variance shapes the top and bottom border rows and Y-Variance the left and right border columns, each generated first as a one-dimensional fractal line (EF-07 `[INFERRED]` as a whole claim; the border assignment itself was verified by both auditors). The interior does **not** use a combined block: it copies the X-variance block when `W−1 <= H−1` and the Y-variance block otherwise, then halves it per level `[INFERRED]` (auditor reading recorded against EF-07). For square worlds only X-Variance ever shapes the interior.

**Borders and edge oceans.** If `COMPLETE_OCEAN_EDGE_MIN >= 3` the four corners are set to elevation 50; after the four border lines are generated, `COMPLETE_OCEAN_EDGE_MIN` whole borders chosen at random are overwritten to 50 (EF-08). A border is *complete* if every tile is below 100 and *partial* if at least `length/8` tiles are (EF-08, PR-22). If the partial or complete counts fall short of their minimums the generator jumps back and regenerates — and because the retry entry precedes the mesh-seeding loop, **every coarse seed of every slot is re-rolled**, not just the borders; the retry has no iteration cap `[INFERRED]` (auditor note under EF-08) and runs only when the elevation mesh value is ≤1 and the elevation minimum is below 100 (EF-08).

**Hidden evilness slot.** Slot 4 has a fixed range 33..65 and variance `dim·200/257` per axis and is seeded uniformly at every mesh corner `[BIN:func 0x140f4b1e8]` (mechanics verified under EF-10; the name "evilness" is `[PUBLIC]`/`[INFERRED]`). Nothing moves a tile out of the neutral band until a region is made good or evil (BR-18).

**Volcanism hotspots.** When the VOLCANISM mesh value is 1, fifteen random tiles receive the volcanism maximum and fifteen the minimum before the interior fill `[BIN:func 0x140f4c938]` (EF-15).

**Interior fill.** Every square of side `finest step` is handed to the fractal routine (EF-01, EF-20).

Copy-risk: the paragraphs above describe the field synthesis closely enough to port it step for step. The mechanism (fractal with bounce, histogram-driven coarse seeds, border-first islands with a retry) is generic; the five-bucket split, the 1..6 mesh scheme, the hidden 33..65 slot, the fifteen hotspots and the sea-level-50 corners are Bay 12 tuning and stay here as description only.

**Temperature and poles (stage 3).** Temperature is a user-parameterised fractal field to which a quadratic latitude term is added afterwards. With `D200 = max(1, 200·H²/257²)` and `D150 = max(1, 150·H²/257²)`, rows on the cold half lose `(H/2 − y)²/D200` and rows on the warm half gain `(y − H/2)²/D150`; the north mode uses the row directly, the south mode mirrors it, the both-poles mode folds it about the equator, and no-pole skips the term `[BIN:func 0x140f4ca87]` (EF-11). POLE is encoded 0 none, 1 NORTH_OR_SOUTH, 2 NORTH_AND_OR_SOUTH, 3 NORTH, 4 SOUTH, 5 NORTH_AND_SOUTH; the "or" variants are rolled at random into a concrete mode (EF-11, PR-06). No seasonal temperature exists at this stage (EF-11). The arithmetic implies roughly −82 at a pole edge and +110 at the far warm edge for any world size; the warm overshoot is squashed later (S6-07, §1.1 "stage 6").

**Peaks (stage 3).** Tiles at elevation ≥400 are clamped to 399 and tiles ≥380 are collected as peak candidates; the candidate count is compared with `PEAK_NUMBER_MIN` ("Not enough peaks") `[BIN:string 0x173ef40]` (EF-12, PR-21 — both `[INFERRED]` as whole claims because the analyst described the pick as random). `min(PEAK_NUMBER_MIN, candidates)` peaks are chosen, raised to exactly 400, flagged with bit 13 and recorded as peak objects; the auditors read the pick as *farthest-point sampling* — a random first peak, then each further peak maximising its minimum Manhattan distance to the chosen set `[INFERRED]`. Chosen peaks are exempt from erosion and cliff clipping (EF-19, HY-05).

**Elevation bands and the ±10 repair (stage 3).** Bands are low <100, mid 100..299, high ≥300 (EF-13). The mid count is tested against `ELEVATION_RANGES.mid`; if low is short, up to three passes subtract 10 from every tile below 300 (floor 1) and recount; if high is short, up to three passes add 10 to tiles in `[100,400)` with a cap of 399 (so chosen peaks remain the only 400 tiles and ocean is never raised); only when the pass budget is exhausted do the "after shift down/up" rejections fire `[BIN:func 0x140f4d1df]` (EF-13, PR-19). The field is re-biased in place, not regenerated.

**Evenness checks (stage 3).** One pass classifies rainfall, drainage, savagery and volcanism into bands <33 / 33..65 / ≥66 and compares each field's three counts with the `*_RANGES` minimums; the same pass histograms the derived biome for the "Initial <biome> square count" tests and computes the vegetation slot. No variance measure is involved — "evenly distributed" means every band reaches its minimum square count `[BIN:func 0x140f4d75f]` (PR-20, EF-14). "Flat/rough areas" is the drainage check (HY-22).

**Volcano count (stage 3).** Tiles with volcanism ≥100 are counted against `VOLCANO_MIN` ("Not enough volcanos") `[BIN:string 0x173f300]` (EF-15, GU-21).

**Elevation compression (end of stage 3).** Right after the initial square counts, elevation ≥300 becomes `elevation − 150` and 100..299 becomes `100 + (elevation − 100)·0.25` clamped to 100..149; ocean is untouched (BR-07 — ledger status `[INFERRED]` only because the analyst over-stated where the pre-compression classifier is used; both auditors reproduced the arithmetic). From this point on **≥150 means mountain**, and the later code (river starts, the post-erosion "high" band, the stage-9 cave candidates) all uses 150 (HY-04, HY-18; GU-20 `[INFERRED]`).

Copy-risk: the latitude term, peak numbers, band edges, ±10 repair and compression arithmetic above are DF's constants in DF's unitless elevation; the ideas (latitude as a soft term, farthest-point peaks, repair before reject, one mountain threshold after compression) carry over in feet.

**Stage 6 edits to the fields.** The first tick of stage 6 is a near-deterministic finalisation that runs before the second region build (S6-04, S6-09):

- *Mountain-Slope*, twice (at stage entry and after the orographic sweep) `[BIN:func 0x140f90aa0]` (S6-12): lowland tiles (100..149) adjacent to ocean (<100) or high ground (≥150) seed two breadth-first distance fields (to coast and to mountain) over 8-connected lowland, using two 120 000-entry wavefront buffers ("Mountain-Slope Overflow" when full); each lowland tile is then pulled into `target ± (30/(dO+dM) + 2)` with `target = (150·dO + 100·dM)/(dO + dM)` and a missing distance counting as 50 (EF-18). The effect is a coast-to-foothill ramp from 100 to 150.
- *Volcano cones*: the 3×3 around each volcano peak is raised by `10 + random(5)` (cap 249) and given volcanism ≥90; the centre and the peak's height record are raised further with caps 250 and 280 (S6-14 `[INFERRED]`: the numbers are verified but the centre/height update applies to every peak record, not only volcanoes). This is the only RNG in the pass.
- *River-valley flattening*: each river tile (bit 0, not bit 15) takes the mean elevation of its in-bounds non-river 8-neighbours, clamped to 100..149 `[BIN:func 0x140f4f505]` (S6-13).
- *Orographic precipitation* (if `OROGRAPHIC_PRECIPITATION`): per row, a signed wind is read from a 221-entry latitude-band table indexed by the row folded or mirrored per pole mode and rescaled to a 257-row reference `[BIN:func 0x140655f00]` (EF-17); the row is swept from the upwind edge carrying an uplift credit `c <= |wind|`. On a tile that is *rising* and is either ≥150 or has drainage ≥50, rainfall gains `10·c` (cap 100) and `c` increments; otherwise rainfall loses `10·c` (floor 0) and `c` decrements (EF-16 `[INFERRED]` as stated; S6-15 verified the direction, credit and ±10·c rules; HY-22 verified the drainage ≥50 term). "Rising" is measured against the elevation of the last tile that charged the credit, which is reset to 0 once the credit drains, so descent is judged against the ridge crest and any qualifying tile restarts accumulation (S6-15). The wind table's shape: polar easterlies over the first fifth of the reference rows, mid-latitude westerlies rising to a maximum and falling back, trades near the equator, calm beyond (EF-17); the no-pole mode uses the same two-hemisphere fold as the both-poles mode `[INFERRED]` (auditor note under EF-17).
- *Temperature corrections*, in one row-major loop with no RNG, order lapse → squash → wet cap `[BIN:func 0x140f4f880]` (S6-09): land tiles lose `(elevation − 100)²/1000` (at most 22 at the maximum compressed elevation) (S6-05); if the result exceeds the user TEMPERATURE maximum `P > 0`, it becomes `P + min(25, 25·(t − P)/P)` so the final ceiling is `P + 25` (S6-06, S6-07); if rainfall ≥66 and `t < 150`, `t = min(t, 166 − rainfall)` (S6-08). The TEMPERATURE minimum is not referenced in the block (S6-07).
- *Vegetation recompute* and *salinity* (see §2.1 and §5.1).

Copy-risk: the stage-6 formulas above (ramp pull, cone raise, lapse, squash, wet cap, uplift credit) are given at porting precision because they are the verified claims; every constant in them is DF's. Reuse the order and the idea of each correction, and set Endrath's values in feet and Endrath degrees (03, T6).

**Periodic erosion of extremes.** When `PERIODICALLY_ERODE_EXTREMES` is set, in every erosion cycle each land tile tests each 4-neighbour with probability 1/100: a neighbour more than 15 higher that is not a chosen peak is cut down to `tile + 15` `[BIN:func 0x140f4eb76]` (EF-19, HY-06).

**Painted overrides.** A pointer in the parameter struct to per-field hand-painted maps (serialised as PS_EL/PS_RF/PS_TP/PS_DR/PS_VL/PS_SV rows) suppresses clearing, seeding and generation of that slot and bypasses the terrain checks that read it (PR-23; EF-23 `[INFERRED]` as stated, but the auditors found the stage-2 clear copying the supplied map into the slot).

### 1.2 Original pseudocode sketch

```
generate_fields(world, P):
    for every tile, every slot: value = UNSET
    for slot in user_slots:                      # elevation, rain, temperature, drainage, volcanism, savagery
        copy P.range[slot], P.border_var[slot]      # min/max and the two border variances (var_x, var_y)
        buckets[slot] = BUCKETS equal sub-ranges of P.range[slot]
    hidden_slot: fixed narrow neutral range, small variance

    steps = [min(W,H) - 1]; while steps[-1] > FINEST and len(steps) < max_levels: steps.append(steps[-1] / 2)
    for level, step in enumerate(steps):
        for each new lattice point at spacing step:
            hidden_slot(x,y) = uniform(neutral range)
            for slot in user_slots:
                if P.mesh[slot] > level and P.mesh[slot] != IGNORE:
                    value = uniform inside bucket chosen by weights        # weighted range
                elif level == 0:
                    value = uniform(min, max)
                else:
                    value = bounce(mean(seeded neighbours) + jitter(var_level))

    retry:
        clear the border slots
        if P.complete_edges >= 3: corners = SEA - margin
        fractal_line(top row, var_x); fractal_line(bottom row, var_x)
        fractal_line(left col, var_y); fractal_line(right col, var_y)
        force P.complete_edges random borders to sea level
        if elevation mesh is IGNORE and elevation.min < SEA:
            complete = borders entirely below SEA; partial = borders with >= PARTIAL_FRACTION below SEA
            if partial < P.partial_min or complete < P.complete_min: goto retry   # re-rolls all seeds
    if P.mesh[volcanism] is IGNORE: scatter a few max and a few min hotspots
    for each square of side steps[-1]: fractal(square, interior variance)

fractal(square, var):
    v = max(1, var / 2) per slot
    for slot in generated_slots (only UNSET cells):
        edge midpoints = bounce(((a + b + rand01) >> 1) + rand(-v..v))
        centre        = bounce(((c1 + c2 + c3 + c4 + rand0_3) >> 2) + rand(-v..v))
    recurse into the four quadrants with v

bounce(x): while x < lo: x = lo + rand(lo - x);  while x > hi: x = hi - rand(x - hi)

validate_terrain(world):
    temperature += latitude_term(row, pole_mode)             # quadratic, scaled by (H/REFERENCE_DIM)^2
    clamp elevation >= PEAK_CAP to PEAK_CAP-1; candidates = tiles >= PEAK_CANDIDATE
    reject if candidates < P.peak_min; pick min(P.peak_min, candidates) peaks far apart; mark them
    bands: low < SEA, high >= HIGH; repair by up to REPAIR_PASSES global -STEP / +STEP shifts; reject if still short
    edge oceans: count per border; reject if partial/complete short
    for each of rain, drainage, savagery, volcanism: histogram into LOW / MID / HIGH bands; reject if any band short
    histogram derived biome (pre-compression classifier); reject if any initial square count short
    vegetation = derive(rain, temperature, drainage)
    volcanoes = tiles with volcanism >= VOLCANIC; reject if < P.volcano_min
    compress elevation: >= HIGH -> e - MOUNTAIN_DROP; SEA..HIGH-1 -> SEA + (e - SEA) * LOWLAND_SQUASH, clamp to lowland band

finalise_terrain(world):
    slope_ramp(); volcano_cones(); flatten_river_valleys()
    if P.orographic: for each row: wind = band_table[latitude]; sweep downwind with uplift credit
    slope_ramp()
    for each tile: lapse -> squash to Tmax + SQUASH_BAND -> wet cap; vegetation = derive(...); salinity seed
    salinity rings; build_regions()
```

### 1.3 Parameters that steer it

| Parameter (user-facing) | Effect in this stage | Ledger |
|---|---|---|
| `[FIELD:min:max:xvar:yvar]` ×6 | range and border variances per field; defaults elevation 1..400, others 0..100, temperature 25..75; default variance elevation `w·800/257`, others `w·400/257` | PR-02, PR-10 |
| `[FIELD_FREQUENCY:mesh:w1..w5]` ×6 | mesh 1 = Ignore (no weighting; also enables the edge-ocean retry and the volcanism hotspots), 2..6 = 2×2..32×32 independent weighted seeds; five bucket weights | EF-05, EF-06, EF-08, EF-15 |
| `POLE` | 0 none … 5 both; drives the latitude term, the wind fold and the tropical test | EF-11, PR-06, BR-04 |
| `PEAK_NUMBER_MIN` | candidates (≥380) required; peaks chosen | EF-12 |
| `PARTIAL_OCEAN_EDGE_MIN`, `COMPLETE_OCEAN_EDGE_MIN` | borders forced to sea level; retry and rejection thresholds; islands use 0/4 | EF-08, PR-22, PR-08 |
| `ELEVATION_RANGES low:mid:high` | minimum tiles in <100 / 100..299 / ≥300 before repair; re-used post-erosion with high = ≥150 | PR-04, EF-13, HY-18 |
| `RAIN/DRAINAGE/SAVAGERY/VOLCANISM_RANGES` | minimum tiles per 33/66 band | PR-20 |
| `VOLCANO_MIN` | tiles with volcanism ≥100 | EF-15 |
| `OROGRAPHIC_PRECIPITATION` | enables the wind sweep | S6-24 |
| `PERIODICALLY_ERODE_EXTREMES` | enables the 1 % cliff clip per cycle | EF-19 |
| `PS_EL … PS_SV` | painted field maps that replace generation and bypass checks for that field | PR-23 |

Presets: region presets are nothing but dimensions plus an area-scaling default function (reference area 257²); island presets add explicit overrides (four complete ocean edges, lower minimums) (PR-07, PR-08, PR-09). Default frequencies ship with mesh 1, i.e. weighting disabled (PR-10).

### 1.4 Rejection criteria that police it

| id | Message (help text paraphrased) | Test | Ledger |
|---|---|---|---|
| 0 | LACK OF PEAKS | candidates ≥380 < `PEAK_NUMBER_MIN` | EF-12, PR-15 |
| 1–5 | MEDIUM / LOW / HIGH ELEVATION (before and after shift) | band counts vs `ELEVATION_RANGES` after ≤3 shift passes | PR-19, EF-13 |
| 6 | LACK OF EDGE OCEANS | partial (≥1/8 below 100) and complete (all) borders vs minimums | PR-22 |
| 7–10 | RAINFALL / DRAINAGE / SAVAGERY / VOLCANISM "not evenly distributed" | 33/66 band minimums | PR-20 |
| 11–19 | <Biome> REJECTION ("Initial <biome> square count fails by") | pre-compression classifier histogram vs `REGION_COUNTS.squares` | PR-15, PR-05 |
| 20 | LACK OF VOLCANOS | volcanism ≥100 count vs `VOLCANO_MIN` | GU-21 |

All checks consult a per-id allow flag ("ALLOW THIS REJECTION TYPE" / "ALLOW ALL REJECTS") and log the shortfall to `map_rejection_log.txt` when `LOG_MAP_REJECTS` is on (PR-17 `[INFERRED]`, PR-18 `[INFERRED]`; the allow array and memset are verified for ids 0–51).

### 1.5 Verified vs public vs inferred; copy-risk

- **Verified:** the single fractal routine and its stencil, the bounce, the seven-slot write, the sentinel, mesh/level logic, weighted-range buckets, border-first generation and forced sea-level borders, edge retry re-rolling all seeds, the hidden fixed-range slot's mechanics, the latitude term and POLE encoding, the band repair, 33/66 evenness, volcanism hotspots and volcano counting, the orographic ±10·credit rule and its "rising" semantics, the wind table shape, Mountain-Slope, the cliff clip, the stage-6 temperature chain, valley flattening.
- **Public:** the names of slots 2/4; default ranges as *wiki knowledge* (they are also verified from the default function, PR-10).
- **Inferred:** X/Y-variance roles as a whole claim (interior block choice is an auditor reading), farthest-point peak selection, the volcano-cone scope, the purpose of the squash/wet cap (S6-23), the painted-override feature's intended use.
- **Copy-risk:** the 20 % bucket widths and 1..6 mesh scheme, the 33/65 neutral range, 380/400 peak numbers, 15-hotspot count, 10-per-step rain and the 221-row wind table, the 100..149 ramp band, `(e−100)²/1000`, `Tmax+25`, `166−rain` are Bay 12 tuning. Reuse the *mechanisms* (fractal with bounce, histogram-driven seeding, border-first islands, latitude as a soft term, credit-based rain shadow, BFS coastal ramp) with Endrath's own constants and Endrath-named grounds.

---

## 2. Rivers, erosion, lakes, drainage and salinity

### 2.1 What DF does

**Erosion is rivers.** Stage 4 runs `EROSION_CYCLE_COUNT + 1` cycles, one per frame `[BIN:func 0x140f4e1d5]` (HY-01, HY-02). On the first tick the generator builds the first region set and runs the "<Biome> region count" checks, then scans every tile with elevation ≥150 into a river-start candidate list and rejects with "Not enough river start points before erosion" if the count is below `RIVER_MINS[0]` `[BIN:string 0x173f3d0]` (HY-03, HY-04). The candidate list is frozen after that first tick; later cycles draw from it even if the tiles have since been eroded `[INFERRED]` (auditor note under HY-03). In every non-final cycle `min(RIVER_MINS[1], candidates)` **exploratory** walks are started from random candidates (HY-03).

**The walk/carve routine** `[BIN:func 0x140f549b0]` (HY-05): starting from a tile, repeatedly pick uniformly among 4-neighbours that are strictly lower and not chosen peaks and step there; if none exists, step to the lowest unvisited non-peak neighbour and **dig it down to current − 1** (neighbours at ≥250 are never dug, so the highest ground is inert); if that falls below 100, clamp to 100 and — in final mode — mark the tile as a **sink** (flag bit 2) and stop (HY-05, HY-08). In exploratory mode each visited tile above sea level is additionally lowered by 1 with probability ≈1/500, and nothing but the lowered terrain is left behind (HY-05). This is the entire erosion model: channels cut toward the sea plus a weak random lowering; there is no diffusion or thermal smoothing beyond the optional cliff clip (§1.1).

Copy-risk: the carve rule as stated is portable line for line. Take the guarantee it provides (every walk reaches the sea) and nothing else; the 1/500 and 1/100 probabilities, the 250 ceiling and the dig-to-current−1 step are DF's constants, and 03 T5 replaces the walk with priority-flood filling.

**Final placement.** In the last cycle, levels are swept from `min(elevation maximum parameter, 249)` down to 101; at each level every tile with that elevation and no river is collected (≈1000 per sweep, the level repeating if more exist), visited in random order, given flag bit 17 (final-river start) and run in **final mode**, which writes `has_river` (bit 0) and reciprocal link bits (5 N, 6 S, 7 E, 8 W) along the path and links into any river it joins `[BIN:func 0x140f4e99e]` (HY-07). After the last cycle, river marks and links are stripped from every tile with elevation ≥150, so river heads sit at mountain margins (HY-09).

**Lakes (stage 5).** For every sink tile a lake routine runs `[BIN:func 0x140f53750]` (HY-08). The verified parts: a lowest-first (priority) flood absorbs frontier tiles that are not chosen peaks, clearing river/sink bits inside, counting members and members with rainfall <10; a trimming phase removes the highest `2·elevation − rainfall` eligible tiles until the remainder is below `members/2 − dry/2`; lake tiles receive flag bit 14 and lose `has_river` (HY-10 `[INFERRED]` as a whole). Auditor readings recorded in the ledger `[INFERRED]`: the flood stops as soon as its frontier touches ocean or an existing lake; a majority absorption of adjacent river tiles precedes trimming; the lake bit is set only where tile temperature ≥0 (so freezing basins get no lakes); thin or border lake tiles are demoted back to river tiles linked to adjacent water. A verified fixpoint then converts any river tile whose 8-neighbourhood has strictly more lake than river tiles into lake, until nothing changes `[BIN:func 0x140f530f0]` (HY-11). Lakes are formed **before** rivers are extracted, whatever the UI order suggests (HY-01; BR extra).

**Loop-erased extraction** `[BIN:func 0x140f772f0]` (HY-12, HY-13). The "Loop Erase River" strings are overflow reports for a double-buffered 120 000-entry frontier; the randomness is the shared worldgen MT (HY-12). Lakes get `has_river` plus all four links; links are made reciprocal; a BFS from ocean/edge sinks marks reachable river tiles but the next pass clears the mark unused — vestigial in this build (HY-17). Then, repeatedly: pick an unprocessed river tile adjacent to a bit-17 start, with no processed neighbour and exactly one link (second pass: more than one); trace it, choosing a random link at forks; **if the step lands on a tile already in the current path, cut the path back to it** (loop erasure); landing on another river's processed tile records a junction exit; ocean neighbours or the map edge record exits; a dead end or more than 1 000 000 steps deletes the temp river (HY-13). A quirk: the start scan examines only the west, north and east neighbours for the bit-17 mark (HY-13).

**River objects and flow.** Each traced path becomes a river object holding x/y path vectors, a per-tile **flow** vector that is the running sum of tile rainfall along the path, a per-tile exit-position vector, and an end position chosen at random among exits `[BIN:func 0x140f78956]` (HY-14, HY-25 `[INFERRED]` for "flow = rainfall", strongly corroborated). **Tributary merging:** when a river's exit lands on land or a lake, the river there is looked up, the new river's flow is added from the junction downstream, and if the new flow exceeds the receiver's flow at the junction the new river **takes over the receiver's downstream tail** (trunk swap) and continues down the chain (HY-15). Finishing: trailing ocean tiles are trimmed into the end position, empty rivers deleted, each river named, downstream rivers resolved by end position and the set **topologically sorted mouth-first** (HY-16); the stage-6 block later raises a world-gen error "Error sorting rivers" (parameter dump to errorlog.txt) if the order is inconsistent (HY-16, PR-24). River names use the unrestricted word pool with name type 20 (NS-14). A brook generator grows uphill walks from random river tiles, marks them bit 15 and splices them to the parent river `[INFERRED]` (auditor finding; bit 15 = brook is verified via the embark screen, HY-20).

Copy-risk: the trace rules, the trunk swap and the mouth-first sort are described at implementation depth. The transferable part is the data flow — link graph in, ordered river objects with flow and a downstream id out; the frontier sizes, step caps, neighbour-scan quirk and 264-byte object are DF's.

**Embark classes.** Flow ≥10 000 "River", ≥5 000 "Minor River", below that "Brook" if bit 15 is set, else "Stream" (HY-20); ≥20 000 "Major River" `[INFERRED]` (auditor note, consistent with df-structures `[PUBLIC]`).

**Drainage.** Drainage is an independent fractal field with no hydrological simulation behind it. Its verified roles are: the "Flat/rough" 33/66 evenness check; ≥50 as the alternative uplift condition in the orographic sweep; ≥75 as the "no vegetation when frozen" rule; the biome classifier's 10/33/50/66/75 splits (swamp vs forest, hills vs grassland, badland/rock/sand deserts, glacier vs tundra); and the heavy-aquifer rule `drainage % 20 == 7` (HY-22, BR-02, BR-08, GU-15).

**Salinity (stage 6).** Per-tile salinity is written once, in the stage-6 terrain block, and never again in the generator (S6-01). It is seeded 100 for ocean (elevation <100) and 0 for land with no RNG and no rainfall, drainage or lake input (S6-02); two 8-connected ring passes then set land tiles touching a 100 to 66 and land tiles touching a 66 to 33, so `salinity = {100, 66, 33, 0}[min(3, Chebyshev distance to the nearest ocean tile)]` (S6-03). Everything is final before the second region build (S6-04). Consequences through the classifier (BR-02, BR-03): a lake touching the ocean is saltwater, one two tiles away brackish, all others fresh; saltwater swamps and marshes and mangroves exist only on coast tiles; lake tiles never hold 100 because nothing lowers a tile below 100 after carving (S6-16, S6-17 `[INFERRED]`). The lake routine's dry-member trimming has nothing to do with salinity (HY-26 `[INFERRED]`, salinity half refuted).

### 2.2 Original pseudocode sketch

```
erode(world):                                      # N = P.erosion_cycles + 1 cycles, one per frame
    on first cycle:
        build_regions(); check initial region counts
        starts = tiles with elevation >= MOUNTAIN; reject if |starts| < P.river_min_pre
    if cycle < last:
        repeat min(P.river_desired, |starts|): walk(random(starts), final = false)
    else:
        for L from min(elev_max, CARVE_CEIL - 1) down to SEA + 1:
            for t in shuffled(tiles with elevation == L and no river):
                mark t START; walk(t, final = true)
    if P.erode_extremes: for each land tile, each neighbour: with p = CLIP_P clip cliffs > STEP to tile + STEP
    after last cycle: strip river marks from tiles >= MOUNTAIN

walk(p, final):
    path = []
    loop:
        if not final and elev(p) > SEA and rand() < SMALL: elev(p) -= 1
        visit(p); path.push(p); stop at the map edge
        lower = 4-neighbours strictly lower than p, not protected peaks
        if lower: q = random(lower)
            if q is RIVER or is visited: if final: link(p, q); finalise(path); return  else: cleanup; return
        else:
            q = lowest unvisited non-peak neighbour below CARVE_CEIL, or stop
            elev(q) = elev(p) - 1
            if elev(q) < SEA: elev(q) = SEA; if final: mark q SINK; break
        p = q
    if final: for consecutive path tiles: mark RIVER and set mutual link bits

form_water_bodies(world):
    for each SINK: lake = priority_flood(lowest frontier first; stop on ocean/lake contact; trim by score); mark LAKE
    fixpoint: river tile with more LAKE than river 8-neighbours -> LAKE
    extract_rivers():
        lakes link in every direction; make links reciprocal
        while a start tile exists (unprocessed, next to a START mark, 1 link then >1):
            trace: random link at forks; revisit -> cut path back; other river -> junction; ocean/edge -> exits
            river = {path, flow = prefix_sum(rainfall), end = random(exits)}
            if end is land/lake: receiver = river_at(end); receiver.flow[j..] += river.flow
                if river.flow > receiver.flow[j]: river takes receiver's tail (trunk swap); continue downstream
        trim ocean tails; delete empties; name; resolve downstream; sort mouth-first

assign_salinity(world):
    salinity = SALT where elevation < SEA else FRESH
    ring: FRESH next to SALT -> BAND_1;  ring: FRESH next to BAND_1 -> BAND_2     # Chebyshev rings
```

### 2.3 Parameters that steer it

| Parameter | Effect | Ledger |
|---|---|---|
| `EROSION_CYCLE_COUNT` | number of exploratory cycles (+1 final); default 250, pocket island 10 | HY-02, PR-10, PR-08 |
| `RIVER_MINS a:b` | *a* = minimum river-start candidates (≥150) before erosion; *b* = exploratory walks per cycle ("Desired River Start Locations (Post-Erosion)" is approximate) | HY-03 |
| `PERIODICALLY_ERODE_EXTREMES` | 1 % cliff clip per cycle | HY-06 |
| elevation maximum (`[ELEVATION:min:max:…]`) | upper bound of the final sweep (capped at 249) | HY-07 |
| `ELEVATION_RANGES` | re-checked after erosion with high = ≥150 | HY-18 |
| `PEAK_NUMBER_MIN` (indirectly) | chosen peaks are immune to carving and clipping | HY-05, EF-19 |

There is **no** salinity, lake or drainage parameter; salinity is purely geometric (S6-02, S6-03).

### 2.4 Rejection criteria that police it

| id | Message | Test | Ledger |
|---|---|---|---|
| 30 | LACK OF RIVERS ("Not enough river start points before erosion") | candidates ≥150 < `RIVER_MINS[0]`; bypassed with a painted elevation map | HY-03, PR-15 |
| 32–34 | MEDIUM / LOW / HIGH ELEVATION ("… altitude locations after erosion") | post-erosion band counts vs `ELEVATION_RANGES`, high band ≥150; low check only when an ocean-edge minimum >0 | HY-18 |
| — | "Error sorting rivers" world-gen error (not a map rejection) | downstream river not yet processed; parameter dump once | HY-16, PR-24 |

### 2.5 Verified vs public vs inferred; copy-risk

- **Verified:** cycle structure and parameters, candidate threshold 150, the carve rule and the 1/500 lowering, the final-sweep order and flag bit 17, sinks, the ≥150 strip, the majority fixpoint, the loop-erase trace rules, river object layout and running-sum flow, trunk swap, mouth-first sort, the vestigial BFS, the post-erosion re-check, embark thresholds 5000/10000 and the bit-15 brook test, the salinity seed and rings and their timing.
- **Public:** the `world_river` layout and flag names (HY-23); "Major River" at 20 000 corroborated by df-structures.
- **Inferred:** lake extent rules beyond the verified core, bit-role names (corroborated by public Bay 12 names), flow-as-rainfall as the reason for the 5000/10000 scale, the exit-position vector, the frozen candidate list, the brook generator.
- **Copy-risk:** 1/500, 1/100, +15, 150/249/250, ≤1000 per sweep, 5000/10000/20000, `members/2 − dry/2`, `2·elev − rain` and the two-ring 100/66/33 scheme are Bay 12 numbers. The transferable ideas are: erosion as repeated carving walks that guarantee descent to the sea, a final "water from every tile" sweep that merges into a drainage tree, loop-erased path extraction with flow-ordered trunk swap, and salinity as a coast-distance transform. An original design can replace the first two with priority-flood depression filling plus steepest-descent flow accumulation, and derive salinity from an evaporation ratio if inland salt lakes are wanted (DF's geometric rule is why it has none).

---

## 3. Biome derivation, regions and subregions, good/evil, savagery

### 3.1 What DF does

**Biome is never stored.** One small classifier derives a world-tile biome on demand from elevation, rainfall, temperature, drainage, salinity, the lake flag and pole/latitude `[BIN:func 0x140f51940]` (BR-01; 135 direct call sites). Decision order and constants (BR-02, BR-03):

1. lake flag → LAKE (salinity <33 fresh, 33..65 brackish, ≥66 salt; tropical variant by zone);
2. elevation ≥150 → MOUNTAIN;
3. elevation <100 → OCEAN (tropical if in the tropical zone, arctic if temperature ≤−5, else temperate);
4. temperature ≤−5 → GLACIER if drainage ≥75 else TUNDRA;
5. rainfall ≥66: drainage <33 → swamp (salt ≥66 → saltwater variants; mangrove needs tropical, salt ≥66 and drainage <10), else forest (temperate: TAIGA if temperature <10, BROADLEAF only if rainfall ≥75 and temperature ≥65, else CONIFER; tropical: CONIFER if rainfall <75, else DRY or MOIST broadleaf by the latitude blend);
6. rainfall 33..65: drainage <33 → MARSH (salt ≥66 else fresh) else SHRUBLAND;
7. rainfall 20..32 → SAVANNA; 10..19 → GRASSLAND;
8. rainfall <10 → desert: drainage ≥66 BADLAND, 33..65 ROCK, <33 SAND.

A **pre-compression twin** with mountain ≥300 and no lake test exists and is the one used for the stage-3 "Initial <biome> square count" histogram (BR-07 `[INFERRED]` as a whole; the twin and its wrapper call are verified).

Copy-risk: the eight-step tree above is the complete classifier and could be transcribed as is. It is here because its thresholds are verified claims, not as a table to adopt; the DEUS classifier is authored from the six stack sheets (03, T1), and the only thing to carry over is "derive the biome from the fields at the point of use".

**Tropical / temperate split.** Two booleans, *tropical-zone* and *deep-tropics*, come from temperature ≥75 / ≥85 when there are no poles, or from a 257-row-scaled latitude (row, mirrored row, or row folded about the equator) with zone >170 and deep ≥200 when there are (BR-04). A **blend helper** returns 100 for worlds ≤65 rows or no poles, 100 outside latitude 171..220, `(184 − lat)·16 − rainfall` for 171..190, 0 for 191..200 and `rainfall + (lat − 207)·16` for 201..220, clamped 0..100 (BR-05); a land tile is tropical iff tropical-zone and (blend <66 or deep-tropics), so rainfall shifts the local tropic line. Water biomes (ocean, lake) use the zone flag alone (BR-04). One branch — savanna — compares the blend against 6 instead of 66, which makes savanna's tropical band *narrower* (it turns tropical a few rows deeper), not wider (BR-06 `[INFERRED]`: the constant is verified, its purpose is not).

**Biome → region kind.** Wrappers map the 42 world-tile biomes onto 10 region kinds — 0 swamp, 1 desert, 2 forest, 3 mountains, 4 ocean, 5 lake, 6 glacier, 7 tundra, 8 grassland, 9 hills — with grassland/savanna/shrubland becoming HILLS when drainage ≥50; the order matches the `REGION_COUNTS` tokens with lake skipped (BR-08). The wrapper the region builder uses for *connectivity* has no lake case and treats lake tiles as ocean kind, so a lake touching the sea merges into the ocean region and lakes are holes in landmasses; the kind recorded on a region object comes from a different wrapper (lake = 5) applied to its first scanned tile (BR-09 `[INFERRED]`).

**Region segmentation.** The subregion builder `[BIN:func 0x140f52100]` initialises each tile's region label to its own index and its landmass label likewise (−1 for ocean-kind), then propagates minimum labels until stable: landmass labels merge across all 8 neighbours; region labels merge only across the 4 orthogonal neighbours and only between tiles of the same kind (BR-09 `[INFERRED]`; the propagation itself was reproduced). Regions are therefore 4-connected same-kind components and landmasses 8-connected non-ocean components. Each `world_region` stores kind, x/y tile lists, a 42-bin biome histogram, `totalnum`, `totalboundnum` (tiles adjacent to a 100..149 non-lake tile), savage subsets, centre/bbox, `is_evil`, `is_good`, `evilgood_pic`, `has_bogeymen`, `dead_veg_chance`; each landmass stores area, bbox and tile lists (BR-10). Regions are named at creation from a per-kind symbol set (neutral recipe: NAME_<kind> nouns, modifiers from all words minus a cull list) and landmasses from small-island / island / continent sets by area ≤5 / <100 / ≥100 (NS-12, NS-14; BR-11 `[INFERRED]` for the symbol identities, which NS later verified).

**Counting regions.** A region counts toward "<Biome> region count" only if it has ≥35 tiles, or for mountains ≥20 tiles bordering lowland; lake regions never count (BR-12). The builder runs at least three times — before erosion (initial region counts), inside the river generator, and after the stage-6 terrain finalisation for the SUBREGION_MAX test (BR-13 `[INFERRED]` as stated "twice"; the three call sites are verified). "Too many distinct subregions (over by …)" fires when the region vector reaches `SUBREGION_MAX` (BR-13).

**Good/evil placement.** It is invoked from inside the prehistory placer (phase B), not from the map generator's own stage list (BR-17, PM-06). Regions are bucketed by tile count — ≥100 large, ≥25 medium, ≥1 small — and processed small → medium → large against the matching `GOOD/EVIL_SQ_COUNTS`, which are *square budgets* reduced by each placed region's size (BR-14). Within a bucket: alignment = evil if the evil budget remaining ≥ the good budget remaining; candidate kinds = kinds present in the bucket with the fewest squares already given that alignment (random tie-break); a random region of that kind is made evil or good (BR-15). Make-evil sets `is_evil` and re-rolls every tile's evilness to `66 + rand(35)`; make-good sets `is_good` and re-rolls to `rand(33)`; both rebuild the region's populations from GOOD/EVIL-tagged raws and roll a picture variant; make-evil rolls `has_bogeymen` at 1-in-10 (BR-16 `[INFERRED]`: flags and rolls verified, the raw-flag semantics not). Evil regions are renamed with an evil modifier recipe and good regions with a good one (NS-13). The evil weather layer is data: `EVIL_CLOUD_NUMBER` / `EVIL_RAIN_NUMBER` drive Lua-generated materials and regional interactions tagged `[IS_REGION:EVIL_ONLY]` that emit weekly or animate the dead `[LUA:data/init/generators.lua:generate_random_interactions]` (BR-20).

Copy-risk: the alignment scheduler is described at porting depth; the budget-by-size-class with least-served-kind selection is a generic scheduler (03, T10), while the 25/100 size classes, the 0..32 and 66..100 rolls and the 1-in-10 bogeyman roll are DF's numbers.

**Savagery.** There is no savagery placement step. The fractal field is used via 33/66 bands for the evenness rejection, per-region savage counts, creature gating in the wildlife importer (§5), civilisation blocking at ≥66 (help text), and the basic-mode "Natural savagery" option (BR-19, VW-08). The "Surroundings" label is a 3×3 grid of savagery × evilness at 33/66: Serene/Calm/Sinister, Mirthful/Wilderness/Haunted, Joyous Wilds/Untamed Wilds/Terrifying; neutral evilness is the hidden slot's 33..65 default, so only placed regions leave the middle column (BR-18).

### 3.2 Original pseudocode sketch

```
classify(tile, world):
    if tile.is_lake:            return LAKE[salinity band][tropical_zone]
    if elev >= MOUNTAIN:        return MOUNTAIN
    if elev <  SEA:             return OCEAN[tropical_zone ? T : (temp <= FREEZE ? ARCTIC : TEMPERATE)]
    if temp <= FREEZE:          return drainage >= HIGH_DRAIN ? GLACIER : TUNDRA
    tropical = zone(lat or temp) and (blend(lat, rain) < BLEND_CUT or deep(lat or temp))
    by rain band: wet -> swamp/forest split on drainage; moderate -> marsh/shrub; dry -> savanna/grass; arid -> deserts by drainage

build_regions(world):
    label[t] = t;  land[t] = ocean_kind(t) ? -1 : t
    repeat until no change:
        for each tile, each 8-neighbour: unify land labels to the minimum
        for each tile, each 4-neighbour of the same kind: unify region labels to the minimum
    group tiles by label  -> Region{kind, tiles, bbox, biome_hist, tile_count, edge_count, savage counts, name}
    group tiles by land   -> Landmass{area, bbox, name by area class}

count_regions(regions): kind counted if tile_count >= MIN_TILES, or (mountain and edge_count >= MIN_BOUND); lakes never

place_alignment(regions, budget[good|evil][small|medium|large]):
    for bucket in (small, medium, large):
        while (budget.good > 0 or budget.evil > 0) and candidates remain:
            side  = budget.evil >= budget.good ? evil : good
            kinds = kinds present in bucket with minimal squares already given 'side'
            r     = random region of random(kinds)
            make(side, r); budget[side] -= r.size; given[side][r.kind] += r.size; remove r

make(side, r): r.flag = side; r.rename(side recipe)
               for t in r.tiles: t.evilness = side == evil ? EVIL_BASE + rand(EVIL_SPAN) : rand(GOOD_SPAN)
               rebuild r.populations from raws tagged 'side'
```

### 3.3 Parameters that steer it

| Parameter | Effect | Ledger |
|---|---|---|
| `REGION_COUNTS:<biome>:a:b:c` ×9 | *a* minimum initial square count (pre-compression classifier), *b* minimum initial region count (regions ≥35 tiles), *c* minimum final region count (stage 9); biomes SWAMP, DESERT, FOREST, MOUNTAINS, OCEAN, GLACIER, TUNDRA, GRASSLAND, HILLS (lake has no row) | PR-05, BR-12 |
| `SUBREGION_MAX` | cap on the region vector after the post-river build; default 2750 | BR-13 `[INFERRED]` (the size test itself was reproduced by both auditors), PR-10 |
| `GOOD_SQ_COUNTS` / `EVIL_SQ_COUNTS s:m:l` | square budgets per size bucket (small <25, medium 25..99, large ≥100 tiles) | BR-14 |
| `POLE` | pole mode for the tropical test and the latitude blend | BR-04 |
| `SAVAGERY_RANGES`, `[SAVAGERY:min:max:…]` | band minimums and field range (the "Natural savagery" basic option's mapping onto these was not traced) | BR-19 |
| `EVIL_CLOUD_NUMBER`, `EVIL_RAIN_NUMBER` | counts of Lua-generated evil weather materials | BR-20 |

Default `REGION_COUNTS` scale with area (square fractions such as A/64 for swamp and desert, A/8 for mountains/ocean/grassland/hills) and are zero for worlds below 65² (`[INFERRED]`: the confirmed part of the auditor verdict on the refuted PR-11); the per-biome region multipliers quoted in the analyst report were refuted and the corrected multipliers exist only as auditor notes `[INFERRED]` — they are DF tuning, deliberately not reproduced in this set; consult the ledger verdict for the numbers.

### 3.4 Rejection criteria that police it

| id | Message | Test | Ledger |
|---|---|---|---|
| 11–19 | <Biome> REJECTION ("Initial <biome> square count fails by") | stage 3 histogram of the pre-compression classifier vs `REGION_COUNTS.a` | PR-15, BR-07 |
| 21–29 | <Biome> REJECTION ("<Biome> region count fails by") | stage 4 count of qualifying regions vs `REGION_COUNTS.b` | PR-15, BR-12 |
| 31 | TOO MANY REGIONS ("Too many distinct subregions (over by") | regions ≥ `SUBREGION_MAX` after the stage-6 build | BR-13 |
| 43–51 | <Biome> REJECTION ("Final <biome> region count fails by") | stage 9 prehistory init vs `REGION_COUNTS.c`; returns code 2 → full re-init | PR-15, PM-02 |

The nine final checks run in the stage-9 stepper's init block before any placement (PM-04 `[INFERRED]` as a whole; the nine strings and code-2 path are verified).

### 3.5 Verified vs public vs inferred; copy-risk

- **Verified:** the classifier's existence as a pure function, every threshold in its tree, the blend helper's arithmetic, the tropical/deep flags, the 42→10 kind tables and the drainage ≥50 hills split, the `world_region`/`world_landmass` fields, the 35/20/never counting rule, good/evil bucketing and the budget scheduler, the invocation from the placer, the Surroundings grid, savagery's uses, the evil-weather Lua chain.
- **Public:** DFHack's re-implementation of the same thresholds (BR-23), the biome enum numbering above 41 (BR-21 `[INFERRED]`).
- **Inferred:** region connectivity details (lakes as ocean-kind), region naming symbol identities (later verified under NS), the savanna "6" being a bug, the elevation-compression claim's scope, the make-evil/good raw-flag semantics, tile field names for region/landmass ids.
- **Copy-risk:** the band constants (10/20/33/66/75 rainfall, 10/33/50/66/75 drainage, −5/10/65/75/85 temperature, 171/184/191/207/220 latitude breakpoints), 0.25 compression, 35/20 region minimums, 25/100 size classes and the 0..32 / 66..100 alignment rolls encode Bay 12's biome design. Reuse the *shape*: derive biome from fields at paint time; segment on a coarse kind and keep a fine biome for content; count only regions above a speckle threshold; balance an alignment overlay with a square budget scheduled across kinds.

---

## 4. Geology and the underground

### 4.1 What DF does

**Two-level model.** Every world tile stores only an int16 `geo_index` into a vector of *geo-biomes*, each a stack of layers (type, material, thickness, mineral inclusion lists) `[BIN:func 0x1403d42c0]` (GU-02). The builder is one function entered repeatedly in ~50 ms slices during the later ticks of stage 6; the feature-layer (cavern) builder runs once when the slicer's progress counter reaches its total, and the generator then advances to stage 7 (GU-01 `[INFERRED]` for the order as the analyst stated it — the auditors read geology **before** caverns; GU-10 verified the slicing).

**Seeding and growth.** `(W·H)/100` seeds are placed at random unassigned tiles; each seed carries four random values in 0..3 re-rolled only every 50 seeds `[BIN:func 0x140f8b7c0]` (GU-04). The *kind* of a seed is 0 land, 2 deep ocean (ocean biome with elevation <50), 4 shallow ocean, 6 sand desert (biome 26), each +1 when the tile's volcanism ≥90 `[BIN:func 0x140f89f30]` (GU-05). Growth is a double-buffered frontier flood (120 000-entry buffers): a 4-neighbour is absorbed only if unassigned, of the same kind, and a d4 roll exceeds the seed's per-side resistance (one value for west/north, another for east/south — anisotropic), inheriting the index and the values (GU-06). The outer loop runs **exactly two passes**: random seeds + flood, then one reseed per still-uncovered region id + flood; tiles can remain unassigned (GU-06 verdict, `[INFERRED]`). The shared-and-inherited resistances are what give geology its streaky bands `[INFERRED]`.

**Layer stacking.** The analyst's recipe was refuted; the auditors' reading of the two jump tables `[BIN:func 0x140f8d9f0]` is recorded as a verdict and is given here as `[INFERRED]`: land and deep-ocean kinds get four one-level soil layers (SOIL or SOIL_OCEAN); sand-desert *and shallow-ocean* kinds get a single SOIL_SAND cap of thickness 1..3; the stone stack is twelve layers — five of the kind's primary sedimentary class, six rolled 50/50 between METAMORPHIC and IGNEOUS_INTRUSIVE, then a final IGNEOUS_INTRUSIVE; volcanic kinds start with IGNEOUS_EXTRUSIVE and draw ten layers uniformly from the three deep classes before the final intrusive layer; every stone layer spans `2 + rand(5)` units of top-minus-bottom. **Material choice is verified:** among inorganics of the required class, those with the lowest usage counter (separate counters for land and ocean kinds) are kept and one is picked uniformly; the counter is then incremented (cap 1000) — least-used-first balancing `[BIN:func 0x140d930c0]` (GU-08). The layer-type enum has nine values (SOIL, SEDIMENTARY, METAMORPHIC, IGNEOUS_EXTRUSIVE, IGNEOUS_INTRUSIVE, SOIL_OCEAN, SOIL_SAND, SEDIMENTARY_OCEAN_SHALLOW, SEDIMENTARY_OCEAN_DEEP); the embark screen counts the three soil types as soil (GU-12).

**Minerals.** Inclusion types are VEIN = 1, CLUSTER = 2, CLUSTER_SMALL = 3, CLUSTER_ONE = 4 (GU-10). The builder handles one inorganic index per call across four passes, one per inclusion type, in the order CLUSTER, VEIN, CLUSTER_SMALL, CLUSTER_ONE (GU-10). For each layer, a matcher returns the frequency of an `ENVIRONMENT` entry whose class matches the layer type, or an `ENVIRONMENT_SPEC` entry whose host equals the layer material; candidates are batched 100 at a time and each is placed iff `rand(MINERAL_SCARCITY) < frequency`, with the batch re-rolled until something is placed (GU-09 `[INFERRED]`: the roll, batching and repeat loop are verified; the guarantee is per *call*, i.e. per (inorganic, pass), not per batch — a trailing partial batch is only rolled when nothing was placed earlier). Later passes also nest `ENVIRONMENT_SPEC` placements inside inclusions already present `[INFERRED]`. With `MINERAL_SCARCITY <= 1` the roll is 0 and everything with frequency >0 is placed (GU-09). Raw-side vocabulary: `ENVIRONMENT:<class>:<inclusion>:<freq>` with classes ALL_STONE, IGNEOUS_ALL, IGNEOUS_INTRUSIVE, IGNEOUS_EXTRUSIVE, SEDIMENTARY, METAMORPHIC, ALLUVIAL, SOIL, SOIL_OCEAN, SOIL_SAND; `ENVIRONMENT_SPEC:<host>:<inclusion>:<freq>` `[RAW:inorganic_stone_mineral.txt:ENVIRONMENT]` (GU-23 `[INFERRED]` for the census; vanilla has 146 ENVIRONMENT and 132 ENVIRONMENT_SPEC placements, dominated by CLUSTER_SMALL at frequency 100). Inorganic flag bits set by the raw parser carry the class (SEDIMENTARY, the two ocean sedimentary classes, the two igneous classes, METAMORPHIC, AQUIFER, SOIL, SOIL_OCEAN, SOIL_SAND) (GU-11 `[INFERRED]`: the class bits were reproduced by both auditors; the analyst's "generic stone marker" bit was not).

Copy-risk: the layer recipe and the mineral pass above are specified closely enough to re-implement DF's geology. Keep the shape — a shared column catalogue indexed per tile, least-used-first material choice, one scarcity divisor against per-material frequencies — and author Endrath's own recipes from the band table (03, T8); the layer counts, thickness roll, class alternation and batch size are Bay 12's.

**Soil and aquifers (display-time derivation).** The embark readout is computed from the geo-biome stack, not stored: soil depth labels are the count of soil-class layers — 1 "Little soil", 2 "Some soil", 3 "Deep soil", 4 "Very deep soil", 5+ "Extremely deep soil" (GU-13); aquifer type is decided per tile as **heavy iff `drainage % 20 == 7`**, else light; both kinds among a selection give "Varied aquifer"; aquifer layers within the top 2 z-levels are ignored (GU-15). Clay is a FIRED_MAT reaction match, sand the SOIL_SAND flag, flux the FLUX reaction class, and "Shallow" means found above the first aquifer layer (GU-14 `[INFERRED]`).

**Caverns, magma sea, underworld = feature layers.** The feature-layer builder `[BIN:func 0x140f8a020]` computes per tile the first cavern top as the minimum surface elevation over a 5×5 world-tile window minus `LEVELS_ABOVE_LAYER_1`, then builds up to five layers: caverns 0..2 gated by `CAVERN_LAYER_COUNT`, layer 3 (magma) by `HAVE_BOTTOM_LAYER_1` (or by `HAVE_BOTTOM_LAYER_2` alone — "Bottom Layer (Forces Magma)"), layer 4 (underworld) by `HAVE_BOTTOM_LAYER_2` (GU-16). `LEVELS_ABOVE_LAYER_2..5` and `LEVELS_AT_BOTTOM` are subtracted inside this builder to give per-layer elevations per tile; `LEVELS_ABOVE_GROUND` is read only by local-map (embark) code, so the z-budget above ground is applied at site realisation (GU-19 `[INFERRED]`). Each layer is tiled into regions by a seeded flood (one jittered seed per tile, random priority 0..3) and each region gets a `feature_init` object with `water = WATER_MIN + rand(range)` and openness/passage-density min/max drawn as biased random percentages clamped to the parameter ranges; the auditors read **openness as biased high** (mostly 60..100) and **passage density as biased low** (mostly 0..40), i.e. mostly open caverns with sparse passages `[INFERRED]` (the analyst's "both biased low" was refuted). Displayed cavern numbering makes the deepest cavern "3" when fewer than three exist (GU-18 `[INFERRED]`). RTTI confirms the class family `feature_init_subterranean_from_layerst`, `feature_init_magma_core_from_layerst`, `feature_init_underworld_from_layerst`, plus point features (`_cavest`, `_pitst`, `_magma_poolst`, `_volcanost`, `_deep_special_tubest`, `_deep_surface_portalst`) `[BIN:rtti feature_init_underworld_from_layerst]` (GU-16). Adamantine (`DEEP_SPECIAL`, `WAFERS`) and slade (`DEEP_SURFACE`) are raw tokens; their tubes and portals are not placed in the world-tile pass `[INFERRED]` (GU-23, GU inference). Divine and mythical materials come from the Lua layer with no `ENVIRONMENT` token, so they are not part of mineral placement (GU-26 `[INFERRED]`).

Copy-risk: the feature-layer builder is described down to its gating and bias rules; the window size, the five-layer scheme and the bias percentages are DF's, the region-with-its-own-parameters idea is the part to keep (03, T9).

**Caves.** Caves are placed by the prehistory placer (stage 9 phase A): candidate tiles with elevation ≥150 passing a border/adjacency predicate and a clear flag bit 3 are collected; counts are compared with `MOUNTAIN_CAVE_MIN` and then `NON_MOUNTAIN_CAVE_MIN` with rejections "Not enough mountain/low-lying cave locations" (plus "after location check" variants); each cave is a world site of type 2 with its own RNG seeds and a size `CAVE_MIN_SIZE + rand(max(MIN,MAX) − MIN + 1)` (GU-20 `[INFERRED]` as a whole; the mechanics were reproduced by both auditors).

**Volcanoes.** A volcano is a world tile whose volcanism ≥100, collected in stage 3 and rejected against `VOLCANO_MIN` (GU-21); the stage-6 cone pass raises its surroundings (S6-14) and its peak record is named with NAME_VOLCANO (NS-15). Geo-biome kind becomes "volcanic" at volcanism ≥90 (GU-05).

### 4.2 Original pseudocode sketch

```
geology(world):
    geo[*] = NONE
    for s in 0 .. W*H/SEED_DENSITY:
        if s % GROUP == 0: resistance = four small random values
        (x,y) = random tile with geo == NONE
        geo[x,y] = new_biome(kind(tile), s); frontier.push(x, y, resistance)
    grow(frontier)
    for each region id with uncovered tiles: seed one more biome there; grow(frontier)   # exactly one reseed pass

grow(frontier):
    while frontier: for cell in frontier, for side in W,E,N,S:
        n = neighbour(cell, side)
        if geo[n] == NONE and kind(n) == kind(cell) and roll(RESIST_DIE) > cell.resistance[side]:
            geo[n] = geo[cell]; next.push(n with cell's resistances)

kind(tile): base by climate (land / deep sea / shallow sea / sand desert); +volcanic if volcanism high

stack(biome):
    soil cap by kind (count and thickness recipe)
    stone layers: primary surface class first, then basement classes rolled, then a fixed basement layer
    each layer: material = random among least-used inorganics of that class (separate land/ocean counters), bump counter

minerals(inorganic i, inclusion pass p):        # one inorganic per frame, four passes
    for each biome, layer: f = frequency(i's class rule matches the layer class, or i's host rule matches the layer material, p)
        if f > 0: batch.add(layer, f)
    for each full batch: repeat { for c in batch: if rand(P.scarcity) < c.f: layer.add_inclusion(i, p) } until placed_this_call

feature_layers(world):
    top1[x,y] = min elevation over a WINDOW-sized neighbourhood - P.depth_to_layer[1]
    for L in caverns[0..count-1], magma if bottom_1 or bottom_2, underworld if bottom_2:
        regions = seeded_flood(one jittered seed per tile, random priority)
        for each region: params = LayerRegionParams(kind_of(L))
            params.water    = uniform(P.water_range)
            params.openness = biased percentage pair, clamped to P.openness_range, sorted
            params.passage  = biased percentage pair, clamped to P.passage_range, sorted

caves(world): candidates = mountain tiles passing border test; require >= P.mountain_cave_min; place CAVE sites sized in P.cave_size_range
              repeat for low-lying candidates with P.lowland_cave_min
volcanoes:    tiles with volcanism >= VOLCANIC; require >= P.volcano_min
readout(tile): soil depth = #soil layers; shallow clay/sand = above first aquifer; heavy aquifer iff heavy_rule(drainage)
```

### 4.3 Parameters that steer it

| Parameter | Effect | Ledger |
|---|---|---|
| `MINERAL_SCARCITY` | divisor in `rand(scarcity) < frequency`; default 100 in this build; the basic "Mineral occurrence" labels map Very rare / Rare / Sparse / Frequent / Everywhere onto 50000 / 10000 / 2500 / 500 / 100 `[INFERRED]` (auditor correction of the public values) | GU-09, PR-10 |
| `CAVERN_LAYER_COUNT` | 0..3 cavern layers | GU-16 |
| `CAVERN_LAYER_OPENNESS_MIN/MAX`, `CAVERN_LAYER_PASSAGE_DENSITY_MIN/MAX`, `CAVERN_LAYER_WATER_MIN/MAX` | clamp ranges for each cavern region's random percentages | GU-16; the clamping and bias behaviour `[INFERRED]` |
| `HAVE_BOTTOM_LAYER_1/2` | magma layer; underworld layer (and forces magma) | GU-16 |
| `LEVELS_ABOVE_LAYER_1..5`, `LEVELS_AT_BOTTOM` | per-layer depth offsets consumed by the feature-layer builder | GU-16, GU-19 |
| `LEVELS_ABOVE_GROUND` | consumed at embark/local-map time only | GU-19 |
| `CAVE_MIN_SIZE`, `CAVE_MAX_SIZE`, `MOUNTAIN_CAVE_MIN`, `NON_MOUNTAIN_CAVE_MIN` | cave site size and required counts | GU-20 |
| `VOLCANO_MIN` | volcanism ≥100 tiles required | GU-21 |
| `ALL_CAVES_VISIBLE`, `SHOW_EMBARK_TUNNEL`/`M_POOL`/`M_PIPE` | visibility flags (not traced here) | PR-01 |

### 4.4 Rejection criteria that police it

| id | Message | Test | Ledger |
|---|---|---|---|
| 20 | LACK OF VOLCANOS | volcanism ≥100 count < `VOLCANO_MIN` | GU-21 |
| 35–36 | LACK OF MOUNTAIN CAVES ("Not enough mountain cave locations", "… after location check") | mountain-cave candidates < `MOUNTAIN_CAVE_MIN` | GU-20 `[INFERRED]`, PR-16 |
| 37–38 | LACK OF LOW-LYING CAVES | low-lying candidates < `NON_MOUNTAIN_CAVE_MIN` | GU-20 `[INFERRED]`, PR-16 |

Geology and minerals themselves have no rejection; they can only run out of candidates silently. The cave rejections live in the stage-9 placer, so a cave failure costs a full re-init (code 2) (PM-02).

### 4.5 Verified vs public vs inferred; copy-risk

- **Verified:** the per-tile `geo_index` and the geo-biome vector, seed density and the 50-seed resistance groups, kind derivation, the anisotropic two-pass flood, least-used-first material selection, inclusion codes and the per-inorganic four-pass slicing, the scarcity roll and batching, the nine-type layer enum and soil counting, soil-depth labels, the heavy-aquifer rule, the 5×5-minus-offset cavern top and the layer gating, volcano definition, the stage machine.
- **Public:** df-structures names for the layer/biome records and `world_site_type` CAVE = 2; the broad cavern/magma sea/underworld picture.
- **Inferred:** the geology-before-caverns order, the save layout's field names, the corrected layer recipe, the "per call" placement guarantee and nesting, flag-bit vocabulary, clay/sand/flux derivation, cavern numbering, the biased-high/biased-low randomisation, the z-budget split between worldgen and embark, cave placement details, the raw census and where divine/mythical materials come from.
- **Copy-risk:** 1-per-100 seeds, 50-seed groups, 4 soil + 12 stone layers, `2 + rand(5)` thickness, 50/50 class alternation, 100-candidate batches, the 5×5 window, `drainage % 20 == 7`, the bias constants and the scarcity presets are DF's recipe. Reuse the shape: a shared column catalogue indexed per tile; an anisotropic seeded flood with per-region reseed; climate-derived column kinds with authored recipes; least-used-first fairness; one scarcity divisor with per-material frequencies; feature layers as regions carrying their own designer-clamped parameters; display labels derived from the column rather than stored.

---

## 5. Vegetation field, plant distribution, wildlife and beast placement

### 5.1 What DF does

**Vegetation is derived, not generated.** A 72-byte leaf helper returns rainfall when temperature >−5; otherwise 0 when drainage ≥75, else **rainfall/12** `[BIN:func 0x140f772a0]` (S6-10; the analyst's "/6" was refuted). It is written to slot 2 during the stage-3 evenness pass (PR-20) and recomputed in stage 6 after the orographic sweep and the temperature corrections, inside the same loop (S6-09, S6-10; VW-02 `[INFERRED]` only for the "Growing vegetation…" attribution). The embark "Trees:" label buckets the value at 10/33/66 into Scarce / Sparse / Woodland / Heavily Forested, and prints nothing for freezing tiles (VW-04). Two tempting strings — "No Suitable Vegetation" and " by growing vegetation" — are not world generation (VW-03).

**Plant and creature raws as placement rules.** Vanilla ships 225 plants (72 TREE, 41 GRASS, 112 shrubs); FREQUENCY and CLUSTERSIZE appear only on shrubs; WET/DRY, GOOD/EVIL/SAVAGE and UNDERGROUND_DEPTH (17 plants, all within cavern layers 1..3) are the other placement tokens; 169 plants name a single BIOME token, most often ANY_TROPICAL or ANY_TEMPERATE `[RAW:vanilla_plants/objects/plant_*.txt:BIOME]` (VW-20). Vanilla creatures number 767, 382 with BIOME, 737 with POPULATION_NUMBER (modes 15:30, 5:10, 250:500 for vermin), 559 with CLUSTER_NUMBER, 188 with FREQUENCY, 63 with UNDERGROUND_DEPTH, 8 GOOD, 24 EVIL, 8 SAVAGE, 4 MEGABEAST and 4 SEMIMEGABEAST, 0 TITAN/FEATURE_BEAST (procedural) `[RAW:vanilla_creatures/objects/creature_*.txt]` (VW-21). The extinct pack has 200 definitions, 100 of them `CREATURE_CLASS:REAL_WORLD_EXTINCT` and 99 SAVAGE (VW-16).

**The wildlife importer (stage 8).** One 7.7 KB function `[BIN:func 0x140f5c390]` runs in stage 8 and calls the population-add helper 23 times (VW-05). Its verified rules:

- Candidate filter: raws whose UNDERGROUND_DEPTH range brackets the surface; boss raws (HAS_ANY_MEGABEAST / SEMIMEGABEAST / FEATURE_BEAST / TITAN / UNIQUE_DEMON), DOES_NOT_EXIST, entity races and GOOD/EVIL raws are excluded — good and evil populations are built by the make-good/make-evil rebuilds instead (VW-22 `[INFERRED]` for the flag names; the bit tests are verified).
- Per region, a biome-id list is built from the region's histogram, "has untamed tiles" is set if any tile has savagery ≥66, and salinity ≥66 / ≥33 bands are read per tile for water-type flags (VW-08, S6-19).
- A raw must carry a BIOME flag matching at least one of the region's biome ids (any-match) (VW-07, VW-11).
- A per-raw *reach* = `FREQUENCY × max(W,H)·100/257 / 100`, forced to 10 000 for UBIQUITOUS creatures; the auditors read the mechanism as a random home point per raw pulled toward the region centre by the reach and accepted if it lands inside the region's bounding box, with nearest-region trackers for a final sweep (VW-07 verified for the weight formula and biome test; the geometry is `[INFERRED]`).
- SAVAGE creatures are imported only into regions with an untamed (savagery ≥66) tile (VW-08).
- The cap on distinct wild animal kinds per region is `min(50, 7 + region_tiles/10)` — the 53.16 release-note change "Wilderness creature type number further depends on the size of each region" `[DOC:release notes.txt:62]` (VW-06).
- A top-up fills each plant category (tree/grass/bush) to 7 kinds and each creature category to the cap; the analyst's "random picks with the MT" was refuted — the auditors read deterministic consumption of distance-sorted tracker lists `[INFERRED]`.
- Population records are typed: plants 5 tree, 6 grass, 7 bush; creatures 0 animal (LARGE_ROAMING or HAS_ANY_LARGE_PREDATOR), 1 vermin, with two further vermin sub-types 3 and 4 (type codes `[INFERRED]` from the auditor verdict on the refuted VW-09; the analyst's names for 3/4 were refuted and the sub-type names remain `[INFERRED]`).
- The population-add helper sums the region's biome histogram over the raw's accepted biomes to get a square count and logs "Region Pop: Null Square Count" / "Null Pop Num" to errorlog.txt when zero (VW-11). The analyst's claim that a count *range* is stored was refuted; the auditors read a single rolled count = `roll[POPULATION_NUMBER] × squares`, raised to `roll[CLUSTER_NUMBER] × squares` if smaller, floored at squares and capped at 10 000 000 `[INFERRED]`.

Copy-risk: the importer's filter, reach, gate and cap are listed at porting depth. The pattern — species rows as placement rules intersected with region facts, a size-scaled cap and a diversity floor — is generic (03, T11); the 7/10/50 cap, the 257 reference, the 10 000 ubiquitous reach and the count roll are DF's.

**Real-world-extinct option.** `REAL_WORLD_EXTINCT` 0..4 maps to "extinct here too" / "savage islands and very small savage biomes" / "untamed wilds only" / "any wilderness" / "pets and work animals" (VW-13). It is applied at raw finalisation: creatures with the class get flag 119; value 0 sets DOES_NOT_EXIST; ≥3 clears SAVAGE unless the caste is an animal person; 4 also promotes exotic pet/mount flags to common (VW-14). Value 1 is enforced inside the importer: such a creature is skipped unless the region is on a landmass of area <100 or has ≤5 tiles; the final fill pass has no exemption (VW-15).

**Beast and population placement (stage 9 prehistory).** After the map is accepted, one 43 KB placer `[BIN:func 0x140f60c30]` runs in phases whose completion flags the UI reads in order: caves → good/evil → megabeasts → other beasts → cave pops → cave civs → civilisations (PM-06). It reads `MEGABEAST_CAP` as a loop count, `TITAN_NUMBER` with candidate regions excluding ocean and lake kinds, `DEMON_NUMBER` and the night-creature/interaction counts, places civilisations, then `SEMIMEGABEAST_CAP` (VW-17). Megabeast placement pushes the HISTORY_SEED RNG stream (PM-13). Living megabeasts are tracked in a list consulted by the `BEAST_END_YEAR` stop rule: once the year reaches the check year, with more than three beasts placed, history stops when the living list is no larger than `total × (100 − pct)/100` (minimum 1) (VW-19, PM-09). Civilisation founding imports resources from the region populations and rejects the map with "Placed farming entity without orchard/non-orchard crops" when a farming entity ends up with an empty orchard or field-crop list (VW-18). Good/evil placement (§3.1) rebuilds the affected regions' populations from GOOD/EVIL raws (BR-16 `[INFERRED]`). "Making cave pops…" (cavern populations by UNDERGROUND_DEPTH) was not traced.

### 5.2 Original pseudocode sketch

```
vegetation(tile):
    if tile.temp > FREEZE: return tile.rain
    return 0 if tile.drainage >= HIGH_DRAIN else tile.rain / COLD_DIVISOR
# run once after the climate fields, again after every pass that changes rainfall or temperature

import_wildlife(world):
    scale = max(W, H) / REFERENCE_DIM
    creatures = [c for c in raws if surface(c) and not boss(c) and exists(c) and not aligned(c) and not entity_race(c)]
    plants    = [p for p in raws if surface(p) and not aligned(p)]
    for region in world.regions:
        facts = {untamed: any(tile.savagery >= WILD), small_land: landmass(region).area < ISLAND,
                 biomes: ids present in region.histogram, water: bands of tile salinity}
        for raw in plants + creatures:
            if raw.biomes ∩ facts.biomes == ∅: continue
            if raw.savage_only and not facts.untamed: continue
            if policy == SMALL_ISLANDS_ONLY and raw.extinct and not (facts.small_land or region.tiles <= TINY): continue
            reach = raw.ubiquitous ? HUGE : scale * raw.frequency
            if home_point(raw) pulled toward region.centre by reach lands in region.bbox:
                add_population(region, category(raw), raw)
            else remember nearest region for the final sweep
        cap = min(CAP_MAX, CAP_BASE + region.tiles / CAP_DIV)
        top up each plant category to PLANT_FLOOR and each creature category to cap from the trackers
    region.finalise()

add_population(region, kind, raw):
    squares = Σ region.histogram[b] for b in raw.biomes;  log an error if squares == 0 or pop number == 0
    record = {kind, raw, count = f(raw.pop_range, raw.group_range, squares)}
    region.populations.append(record)

prehistory(world):
    place caves (mountain, then low-lying)                      -> rejections
    place good/evil regions (square budgets)                    -> rebuild those regions' populations
    push HISTORY stream; for i < P.boss_cap: lair + beast in a candidate region; track in living list
    for i < P.titan_count: candidate region not ocean/lake; demon and night-creature counts -> generators
    cave pops; cave civs; civilisations (crops from region populations; reject if a farming civ has none)
    for i < P.lesser_boss_cap: as megabeasts
```

### 5.3 Parameters that steer it

| Parameter | Effect | Ledger |
|---|---|---|
| (none for vegetation) | derived from rainfall, temperature and drainage; shaped indirectly by `[RAINFALL…]`, `[TEMPERATURE…]`, `[DRAINAGE…]`, `OROGRAPHIC_PRECIPITATION`, `POLE` | S6-10 |
| `REAL_WORLD_EXTINCT` 0..4 | extinct-creature policy applied at raw finalisation and in the importer; default 2 | VW-13, VW-14, VW-15 |
| raw tokens `BIOME`, `FREQUENCY`, `UBIQUITOUS`, `SAVAGE`, `GOOD`/`EVIL`, `UNDERGROUND_DEPTH`, `POPULATION_NUMBER`, `CLUSTER_NUMBER`, `LARGE_ROAMING`, `LARGE_PREDATOR` | the importer's filter, reach, gating and record type | VW-07, VW-08, VW-22 |
| world size | reach scales with `max(W,H)/257`; the per-region kind cap with region tiles | VW-06, VW-07 |
| `MEGABEAST_CAP`, `SEMIMEGABEAST_CAP`, `TITAN_NUMBER`, `DEMON_NUMBER`, `*_NUMBER` night creatures | counts placed by the prehistory placer; defaults scale with area (the constants are DF tuning, held in the ledger) | VW-17, PR-09, PR-10 |
| `BEAST_END_YEAR year:pct` | history stop rule on the share of dead megabeasts | VW-19, PM-09 |
| `TOTAL_CIV_NUMBER`, `PLAYABLE_CIVILIZATION_REQUIRED` | civilisation placement (outside this document's scope) | PR-01 |

### 5.4 Rejection criteria that police it

| id | Message | Test | Ledger |
|---|---|---|---|
| 52 | FARMING CIVILIZATION PLACED WITHOUT CROPS ("Placed farming entity without orchard / non-orchard crops") | after all entities are founded, a farming/orchard entity has an empty crop list; help text: "Civilizations use available plants in their surroundings as their initial crops." `[BIN:string 0x1719f20]` | VW-18 |
| 39–42 | UNABLE TO PLACE ENOUGH CIVILIZATIONS / NO CIVILIZATIONS AVAILABLE / UNABLE TO PLACE CONTROLLABLE CIVILIZATION | civ placement failures in the same placer (outside this document) | PR-15, PR-16 |

Vegetation and wildlife have no direct rejection; vegetation reaches the rejection system only through civ crops, and the "Importing wildlife" stage can only log population errors.

### 5.5 Verified vs public vs inferred; copy-risk

- **Verified:** the derivation formula (including /12), where it runs, the Trees label, the importer's identity and stage, the reach formula and biome any-match, the SAVAGE gate, the region-size cap and its release note, the population-add helper's square count and errors, the extinct option's values and its finaliser/importer enforcement, the raw censuses, the placer's parameter reads and crop rejection, the BEAST_END_YEAR check.
- **Public:** the `world_population` record family and the public creature-flag order (the engine's own table differs by two pre-biome bits, so public bit numbers must be shifted `[INFERRED]`).
- **Inferred:** the "Growing vegetation…" label attribution, the home-point/reach geometry, the deterministic top-up, the single rolled count, vermin sub-type names, the boss-flag names, the shared population builder used at play time (VW-24).
- **Copy-risk:** −5/75/÷12, 10/33/66, 7 + tiles/10 capped at 50, 7 kinds per plant category, the 257 reference, 10 000 for ubiquitous, 1-in-10 bogeymen, 66..100 / 0..32 evil/good rolls, and the raw token semantics are Bay 12 tuning and content. Reuse the shape: one pure vegetation function re-run after its inputs change; regions as the population unit with species declared as biome sets plus frequency, surface band, alignment and size class; a size-dependent species cap; a diversity floor; a policy applied once at data finalisation; crops drawn from local populations with an empty list treated as a hard failure; boss creatures counted and lair-bound rather than frequency-rolled.

---

## 6. Cross-cutting notes

**Order matters and the UI hides it.** Terrain edits → climate corrections → derived fields → salinity → regions is the verified stage-6 order (S6-04, S6-09); lakes form before rivers are extracted (HY-01); rivers are traced on *pre*-orographic rainfall because the sweep runs in stage 6 (EF extra, `[INFERRED]`); the stage labels lag the work (PM-20). A port should keep a written stage order and name UI phases after what actually runs.

**Three elevation vocabularies.** The field stage uses 1..400 with bands 100/300 and peaks 380/400; after compression the lowland is 100..149 and mountains ≥150; the river stage never carves above 249 and the cone pass caps at 250/280 (EF-13, BR-07, HY-05, S6-14). Endrath's one-foot/ten-foot rule (AGENTS.md) argues for one unit from the start.

**Repair before reject.** The ±10 band shift (PR-19), the edge-ocean retry (EF-08) and the SUBREGION_MAX cap (BR-13) are cheap global repairs or hard caps placed *before* expensive stages; the expensive final checks (stage 9) are the only ones that force a full re-init (PR-14).

**What this document does not cover.** Civilisation and site placement, the year loop, names beyond their call sites, and the local-map (embark) realisation of caverns, rivers and veins (documents 02b and later). Open questions carried from the ledger that touch the physical world: what sets river flag bit 15 (S6 open question); the exact "surrounded by ocean" rule for dwarf placement (BR-24 refuted premise; the landmass tally loop in the placer is the lead); the consumer of the per-tile direction nibbles written in stage 8 (S6-21/22 `[INFERRED]`); how per-tile feature-layer elevations become cavern z-ranges at embark (GU-19); the cave-population pass (VW open question).
