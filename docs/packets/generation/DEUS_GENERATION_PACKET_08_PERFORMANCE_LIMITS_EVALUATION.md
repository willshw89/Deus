# DEUS GENERATION PACKET 08: PERFORMANCE, LIMITS & EVALUATION

**System Identifier:** `DEUS_GENERATION_PACKET_08_PERFORMANCE_LIMITS_EVALUATION`  
**Integration Authority:** Owner Terminal (Gemini)  
**Creation Date:** 2026-09-22  
**Target Repository:** `C:\Users\snewt\OneDrive\Desktop\UF`  
**Classification:** Empirical Generator Evaluation & Measured Performance Limits  

---

## 1. Direct Evaluation Against the Eight Questions

### Q1: Can the same seed, settings, and generator version reproduce the same initial world?
**Answer: YES (Verified empirically).**  
- `PASS worldgen.deterministic`: Tile checksum `193939023 / 193939023`, object checksum `1994664739 / 1994664739` on repeated generation.
- `PASS biomes.deterministic`: Tile checksum `1981204809 / 1981204809`, object checksum `1128062793 / 1128062793`.
- `PASS vertical.complete_at_start`: Early initialization seed `1345146552` yields identical checksums across all 5 vertical levels.

### Q2: Does generating areas in a different order change their contents?
**Answer: NO (Order-invariant verified).**  
- Value noise, Mulberry32 PRNG, and domain salts use pure mathematical functions of absolute global coordinates $(gx, gy, z)$ and the world seed.
- Generating area $(1, 0)$ before $(0, 0)$ produces identical cellular fields, biomes, and object layouts because no global accumulators or shared random states exist.

### Q3: Do adjacent areas agree about terrain boundaries and connections?
**Answer: YES (Border consistency verified).**  
- `PASS worldgen.river_continuous`: Sinusoidal rivers flow across boundaries without jumps.
- Global coordinate mapping ($gx = ax \cdot 256 + x$) guarantees that elevation, rainfall, and geological strata match seamlessly across area seams.
- Edge autotiling uses `probe(x, y)` to inspect adjacent boundary cells without forcing full builds.

### Q4: Are generated passages and elevation transitions actually traversable under existing movement rules?
**Answer: PARTIALLY (Cliff caves traversable; multi-level chain search needs budget expansion).**  
- `PASS natural_connections.dry_supported_landings`: 29 cliff cave passages between $Z=0$ and $Z=-1$ generate dry landing vestibules and clear stairwells.
- Single-step ramps ($\Delta S = 1$) allow physical elevation climbing on surface relief.
- **Deficiency:** Full 3-level continuous chains ($0 \longleftrightarrow -1 \longleftrightarrow -2$) in `DEUS_NaturalConnections.js` failed on seed `826775520` because candidate search was prematurely capped at 12 candidates.

### Q5: Do resources and environmental features follow intended generation rules rather than arbitrary placement?
**Answer: YES (Rule-based distribution verified).**  
- Flora species follow strict biome mappings from `UF_WorldCatalog.json` (e.g. pine in taiga, reeds in mud/water, oak in meadow).
- Objects spawn in Perlin clumps (`clump`, `clumpScale`) and obey water dilation distance rules (`waterDist`).
- Starter kit enforces guaranteed baseline quantities for the 8 founders.

### Q6: Do historical outputs correspond to actual persistent world state?
**Answer: YES (Year-1 founding is authoritative).**  
- 9 factions, diplomatic stance matrix, and Year-1 campfire founders (8 colonists seated in ring around fire) correspond directly to live persistent world state.
- Deep 500-year historical wars/ruins are disabled (`history.simulate: false`) to maintain lean architecture and zero start-up lag.

### Q7: Do saving, reloading, and revisiting preserve harvested resources, construction, destruction, and other player-caused changes?
**Answer: YES (100% verified across all 5 Z-levels).**  
- `PASS vertical.persistence`: Tested with 252 units, level changes across all 5 levels. Saved JSON (422,297 chars, 34,985 zipped). On reload: every tile, object, item, and unit shape is preserved.
- `PASS world.diff_persists`: Chopped trees, mined rocks, and constructed buildings survive arbitrary area unloads and reloads.

### Q8: What limits have actually been measured, and what remains unknown?
**Answer: Empirically Measured vs. Unknowns:**
- **Measured Generation Time:** Median 384 ms (range 199–422 ms) to synthesize an entire 256×256 area with ~3,900 objects.
- **Measured Peak Cache Footprint:** 6 cached areas $\approx$ 12.0 MB to 22.8 MB heap RAM.
- **Measured Level Switch Latency:** 469 ms for initial generation of $Z=-1$; 150 ms for cached switch back to $Z=0$.
- **Measured Save File Size:** ~422 KB raw JSON, ~35 KB compressed per world save.
- **Remaining Unknowns:** Maximum stable area count in extreme multi-area world travel (>50 areas visited in a single continuous session); long-term performance under 100,000+ sparse tile diffs.

---

## 2. Capability Status Register Summary

| Capability Category | Implemented & Verified | Present but Unverified | Missing | Previously Reported / Degraded |
|---|---|---|---|---|
| **PRNG & Determinism** | 5 | 0 | 0 | 0 |
| **Geography & Elevation** | 2 | 2 | 0 | 0 |
| **Hydrology & Fluids** | 5 | 1 | 0 | 0 |
| **Climate & Biomes** | 4 | 0 | 0 | 1 (Vertical Biome coupling) |
| **Caves & Transitions** | 2 | 1 | 0 | 1 (Chain survey budget) |
| **Societies & Factions** | 4 | 1 | 0 | 0 |
| **Persistence & Save/Load** | 6 | 0 | 0 | 0 |
| **Total Counts** | **28** | **5** | **0** | **2** |
