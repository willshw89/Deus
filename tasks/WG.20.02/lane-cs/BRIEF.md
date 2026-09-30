# BRIEF: lane-cs (WG.20.02) CARDS-1 & DEC-045 Catalogue Rows

## Metadata
- **Lane**: lane-cs
- **WBS**: WG.20.02
- **Writer**: Codex (OpenAI)
- **Reviewer**: Claude (Anthropic)
- **Worktree**: `C:\Users\snewt\.deus_worktrees\lane-cs`
- **Branch**: `task/lane-cs`
- **Allowed Paths**:
  - `art/catalogue/catalogue.json`
  - `docs/art/cards/TEMPERATE_BATCH1_GENERATIONS.md`
  - `tasks/WG.20.02/lane-cs/**`

## Directives & Source Authorities
- DEC-007 Art Freeze (NO art generation; metadata & generation cards only).
- DEC-045 Moisture Gradient Terrains (V1 damp, V2 base, V3 dry).
- DEC-046 Static First (no animated loops for natural world batch 1).
- Primary reference: `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/CARDS-1_grok_heavy.md`.
- Mail directives: `MSG-PRUNE-PM-021` and `MSG-PRUNE-PM-024` (DISPATCH-1).

## Tasks
1. **Add DEC-045 Catalogue Rows in `art/catalogue/catalogue.json`**:
   - For each gradient terrain kind (dirt, rock, forest-floor, needle-floor, shrub-soil, dry-grass, mud, swamp-mud, stony, scree, sand):
     - `SURFACE_SHARED_TERRAIN_<KIND>_V1_DEFAULT` (damp, status: REQUESTED)
     - `SURFACE_SHARED_TERRAIN_<KIND>_V2_DEFAULT` (base, status: REQUESTED)
     - `SURFACE_SHARED_TERRAIN_<KIND>_V3_DEFAULT` (dry, status: REQUESTED)
   - Uniform terrains stay single A2 rows:
     - `SURFACE_SHARED_TERRAIN_PEAK-ROCK_A2_DEFAULT`
     - `SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT`
     - `ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT`
     - `ALL_SHARED_TERRAIN_MINED-STONE_A2_DEFAULT`
     - `ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT` (or `DUG-EARTH`, align with run 50)
   - Verify `node tools/art/test_catalogue.js` passes.

2. **Apply CARDS-1 Fixes to `docs/art/cards/TEMPERATE_BATCH1_GENERATIONS.md`**:
   - Follow all defect fixes in Section 2 of `CARDS-1_grok_heavy.md`:
     - Settings fragment for runs 1-37, 48-52: `"Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile"`.
     - Retag runs 1-36 per DEC-045 (V1 damp, V2 base, V3 dry; keep _A2_DEFAULT on uniform 25, 37, 48-50).
     - Append Specs gates: `"Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind."`
     - Delete surplus runs 26 and 27 (peak-rock is uniform).
     - Runs 25 and 31: style reference to accepted Rock base tile.
     - Run 37 item text update.
     - Item rewrites for 13-15, 17, 20, 21, 23, 24, 31-33, 49, 50.
     - DEC-046 static first: remove animation sentences from runs 38, 40, 42, 44, 46. Mark runs 39, 41, 43, 45, 47 and 75-79 DEFERRED.
     - Resolve run 50 ID to match catalogue.
     - Add Section 4 (Owner run order) to the top of the file.

3. **Validation**:
   - `node tools/check_deus_syntax.js`
   - `node tools/art/test_catalogue.js`
   - Commit as `[codex] WG.20.02: add DEC-045 catalogue rows and apply CARDS-1 generation card fixes`.

## GAME TRANSLATION
- **Player / World Effect**: Establishes exact catalogue metadata and prompt contracts for the Owner to generate clean, consistent 3-tier moisture autotiles (damp/base/dry) that dynamically reflect simulated hydrological saturation in worldgen.
- **Trigger**: Map generation / elevation and moisture simulation assigning autotiles to cells.
- **Runtime Authority**: `game/js/plugins/DEUS_Levels.js` and `game/js/plugins/DEUS_WorldGen.js`.
- **Simulation Path**: Hydrology moisture grid -> Autotile variant selection (V1/V2/V3) -> RMMZ tilemap rendering.
- **Engine Bridge**: RMMZ autotile layout tables mapping V1/V2/V3 slots to tileset indices.
- **Visible Result**: World tiles visibly shift tone seamlessly based on groundwater and rain saturation without harsh borders.
- **Persistence**: Cell moisture state stored in map save; autotiles rendered dynamically.
- **Failure Without This Lane**: Missing catalogue rows block generation tracking; flawed prompt cards produce broken tiles with borders, wrong scale, or palette leaks.
- **Automated Proof**: `tools/art/test_catalogue.js` passes.
- **In-Game Proof**: N/A for metadata/card phase; subsequent induction lane proves tile rendering.
