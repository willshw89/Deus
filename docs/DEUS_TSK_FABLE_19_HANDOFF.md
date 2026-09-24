# DEUS-TSK-FABLE-19: Global Five-Layer Vertical Exposure + WorldGen Cuts

**Document ID:** `DEUS-TSK-FABLE-19`  
**Delegated by:** Gemini (DEUS Integration Coordinator)  
**Assigned to:** Fable (Claude Code — Systems, Autonomous Behavior & Depth Specialist)  
**Authority:** Project Owner Directive (2026-09-24)  
**Status:** READY TO EXECUTE  

---

Copy and paste the entire block below directly into Fable's (Claude Code's) terminal/agent session:

```text
================================================================================
DEUS CONCRETE TASK ASSIGNMENT: DEUS-TSK-FABLE-19
GLOBAL FIVE-LAYER VERTICAL EXPOSURE + WORLDGEN CUTS
================================================================================
Role: Systems & Depth Architecture Specialist (Fable)
Co-Engineer: Gemini (Integration Coordinator & World Art Authority)
Working Directory: c:\Users\snewt\OneDrive\Desktop\UF
Authority Documents:
- docs/STATUS.md
- docs/VISION.md
- docs/systems/DEUS_Depth.md
- docs/art/DEUS_BIOME_IDENTITY_STANDARD.md
- docs/art/DEUS_WORLD_WBS.md
================================================================================

1. TEMPORARY OWNERSHIP BOUNDARY & DELEGATION
Per Project Owner Directive (2026-09-24), Gemini as DEUS Integration Coordinator
formally delegates this task to Fable with temporary, narrowly bounded ownership over:
  1. Vertical depth rendering (game/js/plugins/DEUS_Depth.js)
  2. Vertical exposure / natural cut generation in worldgen (game/js/plugins/DEUS_WorldGen.js, DEUS_World.js)
  3. Depth-mask caching, chunk-local exposure structures, and dirty invalidation
  4. Native proof, test suites, and documentation

Fable is NOT authorized to redesign:
  - Biome identities or canonical biome registry (DEUS_BiomeRegistry.json)
  - Biome map macro-distribution
  - Structural physics invariants or collapse algorithms
  - Fluid propagation rules
  - Combat, colony AI, needs, jobs, or history
  - D&D 5.1 SRD systems
  - Architectural conventions or settlement placement unrelated to terrain cuts

================================================================================
2. OWNER GOAL & PHILOSOPHY
================================================================================
DEUS has five physically adjacent Z levels:
  Z+2 (Highest alpine / mountain crest / canopy tops)
  Z+1 (Upper terraces / rock shelves / raised terrain)
  Z0  (Canonical ground surface)
  Z-1 (Shallow subterranean / bedrock / cellar / cavern)
  Z-2 (Deep magma-adjacent / solid deep foundation)

KEEP:
  - The existing five-Z biome identities and vertical hooks from DW.01.04
  - The existing macro biome layout (TEMP, WET, ARID, HIGH, VOLC)
  - The existing terrain generation logic wherever possible
  - The physical support/mass rules (cuts carve material away; zero floating natural slabs)
  - The existing world seed determinism

ADD:
  - Natural world-generation cuts and openings that reveal lower physical Z levels.
  - Make SEEING LOWER Z LEVELS a GLOBAL WORLD RENDERING RULE that functions
    everywhere in the gameworld (wilderness, settlements, ravines, buildings with
    openings, destroyed structures, shafts), not only on a test map.

THIS DIRECTIVE SUPERSEDES THE EARLIER TWO-LOWER-LAYER VISUAL CAP.

================================================================================
3. FIVE-LAYER DEPTH VISIBILITY & OCCLUSION RULES
================================================================================
Remove the current arbitrary maximum of two lower visible planes (maxDepth: 2).

When viewing Z+2, geometry may potentially be visible from:
  Z+2 = Active (depth 0, 1.000 scale, crisp, unshifted)
  Z+1 = Depth 1
  Z0  = Depth 2
  Z-1 = Depth 3
  Z-2 = Depth 4
provided the vertical line of sight is physically open.

When viewing Z+1:
  Z+1 = Active
  Z0  = Depth 1
  Z-1 = Depth 2
  Z-2 = Depth 3

When viewing Z0:
  Z0  = Active
  Z-1 = Depth 1
  Z-2 = Depth 2

There are only five supported physical levels (Z+2 through Z-2). Do NOT invent
additional Z planes.

OCCLUSION RULE:
For each XY position, start at active Z.
If opaque physical terrain or a completed opaque structure occupies that cell:
  -> STOP. Nothing beneath that cell is visible.
If that cell is open air:
  -> Continue to the next lower Z.
Continue until:
  A. Opaque visible geometry is encountered
  OR
  B. Z-2 is reached.

Masking must propagate through all lower levels: a solid cell on Z-1 blocks Z-2
beneath it, while an adjacent cell where Z-1 is also open air permits viewing Z-2.

================================================================================
4. WORLDGEN VERTICAL CUTS (MESO-SCALE & PHYSICAL MASS)
================================================================================
Add natural vertical openings during world generation to make DEUS terrain
visibly three-dimensional:
  - Cliff edges, ravines, canyons, erosion cuts, sinkholes, natural shafts,
    cave mouths, collapsed ground, volcanic fissures, deep stream cuts,
    stepped terraces, fractured mountain faces, wetland channels.

PHYSICAL MASS RULES:
  - A cut CARVES material away from a solid vertical stack.
  - It does NOT create floating upper terrain or random unsupported slabs.
  - Example carve:
      Before: Z+2 SOLID, Z+1 SOLID, Z0 SOLID, Z-1 SOLID, Z-2 SOLID
      Carve:  Z+2 AIR,   Z+1 AIR,   Z0 SOLID, Z-1 SOLID, Z-2 SOLID (shallow ravine)
      Deep:   Z+2 AIR,   Z+1 AIR,   Z0 AIR,   Z-1 AIR,   Z-2 SOLID (deep chasm)
      Terrace: Z+2 AIR,  Z+1 SOLID, Z0 SOLID, ...

MESO-SCALE SHAPES (NO SWISS CHEESE):
  - Cuts must be generated as coherent regional features (extending across many
    cells, coherent width and depth, tapering/terracing logically with elevation).
  - AVOID isolated random 1-tile holes.
  - Ordinary settlement-capable flat terrain must remain intact nearby.

CUT DEPTH DISTRIBUTION:
  - Shallow cut: exposes next Z only (~60% of cuts)
  - Medium cut: exposes 2 levels (~25% of cuts)
  - Deep cut: exposes 3 levels (~12% of cuts)
  - Very deep / Rare: exposes all the way to Z-2 from Z+2 (~3% of cuts; rare and justified)

================================================================================
5. BIOME-SPECIFIC CUT FORMS (RESPECT DW.01.04 IDENTITY)
================================================================================
Use the canonical material identities from DEUS_BiomeRegistry.json:
  - TEMP: Rolling ravines, limestone cuts, stream valleys, karst sinkholes.
  - WET: Channels, eroded bog banks, saturated depressions, peat cuts, flooded sink features.
  - ARID: Arroyos, canyon cuts, dry washes, mesas, deep sedimentary ravines.
  - HIGH: Fractured cliff systems, deep chasms, stepped rock shelves, fault cuts.
  - VOLC: Fissures, collapsed lava tubes, caldera breaks, basalt cracks, geothermal openings.

A ravine cut in a Temperate biome remains Temperate; its exposed walls and floor
display Temperate Z+1, Z0, Z-1, and Z-2 materials per the canonical vertical hooks.
Do NOT convert a cut into a different biome.

================================================================================
6. STRUCTURAL, FLUID & PATHFINDING AUTHORITY
================================================================================
- SIMULATION AUTHORITY: Cuts operate on actual authoritative solid volume, open air,
  terrain, and Z geometry. They must not be a fake visual-only layer.
- FLUIDS: Generated cuts expose legitimate vertical routes. Streams reaching a cut
  can flow downward if existing fluid rules permit. Do not visually fake waterfalls
  over solid geometry.
- PATHFINDING: Cuts create impassable vertical drops unless traversed by ramps,
  natural slopes, constructed stairs, or bridges. VISIBLE != REACHABLE.
- MUTATION AFTER WORLDGEN: System must respond to later excavation, mining,
  structural collapse, destroyed floors, or cave-ins via existing dirty invalidation.

================================================================================
7. GLOBAL DEPTH RENDERING ARCHITECTURE & PERFORMANCE
================================================================================
- APPLIES GLOBALLY: Entire overworld, settlements, wilderness, caves, buildings.
  Zero hardcoded map IDs; zero manual exposure markers.
- PERFORMANCE MANDATE: Do NOT render five complete world maps every frame.
  * Render currently visible chunks / viewport only (+ 48px padding).
  * Use cached lower-layer render textures / canvas layers.
  * Implement an Exposure Depth Cache: chunk-local query answering for (x,y,activeZ)
    which lower Z is first physically visible.
  * Recompute masks only when geometry changes.
  * A region with no exposure to lower levels pays zero lower compositing cost.

DEPTH TREATMENT PROGRESSION (TUNABLE PARAMETERS):
All lower planes project around the SAME camera-focus origin (viewport center):
  projectedScreen = centre + (unprojectedScreen - centre) * depthScale
Suggested test progression (evaluate via native screenshots, do not freeze blindly):
  Depth 0 (Active): Scale 1.000, Strength 1.00, Blur 0, Normal saturation
  Depth 1:          Scale ~0.96, Strength ~0.90, Very light blur (0.6px), Slight desat
  Depth 2:          Scale ~0.91, Strength ~0.80, Light blur (1.2px), Moderate desat
  Depth 3:          Scale ~0.86, Strength ~0.70, Medium blur (1.8px), Reduced contrast
  Depth 4:          Scale ~0.81, Strength ~0.60, Strongest depth treatment
CAUTION: Avoid making Z-2 look like a miniature toy diorama. Adjust scaling if needed.

ENTITIES ON DEEP LEVELS:
Visible lower-level trees, rocks, items, units, and walls inherit their plane's
projection and depth treatment. Fog-of-war / LOS rules remain strictly enforced
(do not reveal hidden underground enemies merely because air is open).

================================================================================
8. SAVE / LOAD COMPATIBILITY
================================================================================
Worldgen cuts are represented in authoritative world geometry and persist via
normal geometry save/load routines. Do NOT save giant rendered exposure bitmaps;
rebuild runtime caches upon map load.

================================================================================
9. CONFIGURATION & DEBUG TOOLING
================================================================================
Expose configuration in DEUS_Depth.js and DEUS_WorldGen.js:
  - cutFrequency, maxCutDepth, featureWeights, minCutWidth, maxCutWidth,
    featureLength, terraceProbability, rareDeepCutProbability.
Developer overlays (toggleable via debug keys):
  - Cut footprint, generated cut depth, exposed Z masks, chunk cache state.

================================================================================
10. VERIFICATION, TESTS & FIVE-LAYER PROOF
================================================================================
1. AUTOMATED TESTS — WORLDGEN (tools/test_worldgen_cuts.js or in existing harness):
   - Determinism: same seed -> identical cuts; different seed -> different cuts.
   - Physical validity: cuts carve material away; zero unsupported upper slabs.
   - Depth boundaries: cuts never drop below Z-2.
   - Depth distribution: shallow vs deep cuts expose correct stacks.
   - Biome fidelity: cuts maintain biome identity.
   - Settlement viability: ordinary flat terrain remains intact nearby.

2. AUTOMATED TESTS — RENDERING (tools/test_depth_global.js or expanded depth suite):
   - Z+2 reveals Z+1, Z0, Z-1, and Z-2 through cumulative air openings.
   - First opaque lower level stops downward visibility.
   - Masking and entity depth inheritance across all 4 lower planes.
   - Active plane geometry remains strictly 1:1 and unaffected.
   - Projection origin remains locked to viewport center.

3. GOLDEN WORLDGEN PROOF SEED:
   Generate one deterministic seed containing:
     A. Shallow 1-level cut
     B. 2-level ravine
     C. 3-level canyon
     D. Rare opening exposing Z-2 from Z+2
     E. Stepped terrace
     F. Bridge spanning lower layer
     G. Water adjacent to vertical exposure
     H. Flat settlement-capable terrain intact nearby

4. NATIVE RMMZ FIVE-LAYER SCREENSHOT:
   Capture an actual native screenshot at official 1.00x zoom with camera active
   on Z+2, in one view containing visible portions of Z+2, Z+1, Z0, Z-1, and Z-2.

================================================================================
11. REQUIRED FABLE RETURN FORMAT
================================================================================
When returning the task to Gemini (Integration Coordinator), provide:
  1. HEAD before work
  2. Architecture inspected
  3. Worldgen files changed
  4. Renderer files changed
  5. Cut-generation algorithm
  6. Biome-specific cut rules
  7. Determinism behavior & verification
  8. Five-layer mask & compositing architecture
  9. Final depth visual parameters (scale, blur, contrast, brightness per level)
  10. Cache and invalidation strategy
  11. Worldgen test log excerpt
  12. Depth rendering test log excerpt
  13. Native snapshot / harness results
  14. Five-layer screenshot path & visual description
  15. Performance impact (frame times across 5 active planes)
  16. Save/load behavior
  17. Known limitations / edge cases
  18. List of files changed
  19. Commit hash
  20. Rollback instructions

================================================================================
12. STOP CONDITION
================================================================================
After:
  - Natural vertical cuts are generated globally and deterministically
  - All five Z layers can be exposed where geometry permits
  - Lower-layer visibility works everywhere with bounded performance
  - Automated tests pass (worldgen and depth rendering)
  - Native RMMZ proof screenshot exists

STOP.
Do NOT expand the Z range beyond Z+2 through Z-2.
Do NOT begin unrelated world-generation or settlement work.
Hand off to Gemini for Coordinator Review.
================================================================================
```
