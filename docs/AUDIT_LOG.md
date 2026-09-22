# AUDIT LOG

Claude Code audits Gemini's work here (AGENTS.md → Audits). Newest entry at the top.
Grades: **BLOCKER** (can't ship or show; breaks a locked decision) · **MAJOR** (wrong result; must be fixed before the slice is approved) · **MINOR** (process or cleanup).
Every finding cites evidence. When a finding is fixed, mark it `FIXED <date> <commit>`. Don't delete it.

---

## A7: World Generation Source & Systems Audit (2026-09-22)

**Audited by:** `deus-research` (Read-Only Systems Specialist) & Coordinated by Gemini.
**Scope:** Deep exhaustive source code and test harness audit of Project DEUS World Generation systems (`DEUS_World.js`, `DEUS_WorldGen.js`, `DEUS_NaturalConnections.js`, `DEUS_Factions.js`, `DEUS_Levels.js`, `DEUS_History.js`, `UF_WorldCatalog.json`).
**Native Editor Playtest:** `NOT RUN` (Verification conducted strictly via headless Node.js runners and snapshot `nw.exe` harnesses; RMMZ editor F5/F8 not run during audit).

### Evidence Categorization
1. **Snapshot runtime results:**
   - `natural_connections.generated_chain` runtime `FAIL` in snapshot test runner: candidate search capped at 12 (`survey: { candidates: 16639, tested: 12 }`), finding 0 full 3-level shafts $(0 \to -1 \to -2)$ on seed 826775520, leaving `saved.chains` empty despite 29 cliff cave links generating.
2. **Headless assertion results:**
   - `worldgen` suite: 22/22 PASS (`worldgen.deterministic`, `worldgen.autotile_shapes`, `worldgen.river_continuous`, `worldgen.kit_present`, `worldgen.kit_covers_plan`, `worldgen.camps_cleared`).
   - `biomes` suite: PASS (`biomes.all_biomes_reachable`, `biomes.world_variety`, `biomes.region_tiers_exist`, `biomes.lakes_or_rivers`).
   - `world` suite: PASS (`world.seeded`, `world.in_area_map`, `world.view_crosses_edge`, `world.diff_persists`).
   - `factions` suite: PASS (`factions.generated_with_world`, `factions.layer_distribution`, `factions.relations_complete`, `factions.areas`).
   - `vertical` persistence suite: PASS (`vertical.persistence` hash validation on Z=-1/-2).
3. **Harness / bootstrap failures before assertions (Five Broken Generation Harnesses):**
   - `tools/test_column_landforms.js`: FAILS at line 192 (`TypeError: Cannot read properties of undefined (reading 'surfaceElevationAt')`).
   - `tools/test_vertical_worldgen_proof.js`: FAILS at line 238 (`TypeError: Cannot read properties of undefined (reading 'baseline')`).
   - `tools/test_seamless_map_edges.js`: FAILS at line 159 (`TypeError: Cannot read properties of undefined (reading 'valueNoise')`).
   - `tools/test_geology_strata.js`: FAILS at line 107 (`TypeError: Cannot read properties of undefined (reading 'geologyAt')`).
   - `tools/test_round_world.js`: FAILS at line 161 (`Error: ENOENT: no such file or directory, open '...game/js/plugins/UF_Roads.js'`).
4. **Screenshots inspected by the auditor:**
   - `game/test_output/smoke.map.png`: 8 founders seated around lit campfire in grassy clearing with starter resources.
   - `stance.stance_markers.png`, `stance.selection_ring.png`: Green halo ellipse grounded under unit feet.
   - `overseer.card.png`: Left card window retired; right sheet open on single selection.
   - `timespeed.time_controls.png`: Bottom bar HUD widgets centered at screen bottom.
5. **Measurements without diagnosed causes (Exact Measurement Context):**
   - Timing measurements from `UF_Fire.md`: Layer 0.056–0.060 ms/frame (max 0.78–1.23 ms), beat 0.39–0.88 ms (max 1.42 ms), total frame 0.065–0.067 ms. Measured on AMD Ryzen 7 8845HS / NVIDIA RTX 4060 laptop under `nw.exe` test run with 100 burning cells at zoom 1/3 over 150 frames. *Not generalized into a performance guarantee.*
   - Level baseline dimensions: 65,536 cells per level ($256 \times 256$), across 5 persistent levels ($-2$ to $+2$).
6. **Starting-state contract (Preserved):**
   - 8 founders per faction (4 men, 4 women, adults 18–40) in alternating ring facing lit campfire at camp center (`PPP / PFP / PPP`).
   - Guaranteed starter resource kit in radius [5, 20] covering initial colony needs.
   - 11 cultural factions placed across layers (surface, -1, -2).
   - Faction home spacing rules (`minGap: 40`, `edgeMargin: 12`, player within `playerReach: 6` of map center).
   - Contract source references: `WORLD_ARCHITECTURE.md` §2.7, §3.7, §5.8; `DEUS_History.js` L13-39; `DEUS_Factions.js` L335-550; `DEUS_WorldGen.js` L881-932. Baseline contract preserved.

### Clarifications Where Earlier Claims Exceeded Evidence
- `game/js/plugins/DEUS_Fluid.js` is **MISSING** (not on disk, not registered in `plugins.js`). Fluid mechanics exist only as BFS flooding/lava solidification in `DEUS_Levels.js` and cross-layer connection flow in `DEUS_NaturalConnections.js`. Continuous 1–7 cellular automata fluid volume is not present.
- 500–600 year history simulation in `DEUS_History.js` is dormant behind `history.simulate: false`. The canonical starting state is Year-1 campfire founding.
- Geological rock strata (`WorldGen.geologyAt`) and single-step natural ramps (`DEUS_Levels.js:796-816`) exist in code but lacked isolated assertion verification in the modern test runner.
- Perimeter ocean rim parameter `continentRim: 0.06` is not factored into `fieldsFor` elevation falloff.

### Audit Findings Table

| # | Grade | Finding | Evidence | Status |
|---|---|---|---|---|
| A7-1 | MAJOR | Missing Standalone Cellular Fluid Plugin (`DEUS_Fluid.js`) | Referenced in plugin architecture docs, but file is missing from `game/js/plugins/` and unregistered in `plugins.js`. Partial fluid BFS in `DEUS_Levels.js` and connection flow in `DEUS_NaturalConnections.js`. | OPEN: Standalone cellular fluid simulation remains to be implemented. |
| A7-2 | MAJOR | Five Legacy Generation Harnesses Fail During Bootstrap Before Assertions | `test_column_landforms.js`, `test_vertical_worldgen_proof.js`, `test_seamless_map_edges.js`, `test_geology_strata.js`, and `test_round_world.js` crash on obsolete `UF_*` prefixes, uninitialized globals, or missing files before running checks. | OPEN: Assigned to Fable in isolated working copy for harness recovery. |
| A7-3 | MAJOR | Demonstrated Regression on Seed-424242 Underground Fixture | GEN3 cavern synthesis yields 41.4%–46.3% solid earth on Z=-1 compared to GEN2 baseline fixture of 83.53% solid / 36 distinct chambers. Pre-vertical fixture metadata differs. | OPEN: Scope of affected real saves requires further verification. |
| A7-4 | MINOR | Unforced Perimeter Ocean Rim Falloff | Catalog `"continentRim": 0.06` is defined, but `WorldGen.fieldsFor` does not apply radial edge-dampening math. Perimeter ocean depends on raw noise dipping $< 0.30$. | OPEN: Bounded generation compatibility task needed. |
| A7-5 | MINOR | Historical 500–600 Year Simulation Present But Deactivated | Complete simulation engine in `DEUS_History.js` is dormant behind `history.simulate: false` per user directive (Year-1 campfire founding active). Earlier claim of active historical simulation overstated. | DOCUMENTED: Contract clarified; Year-1 campfire founding is canonical. |
| A7-6 | MINOR | Natural Connection Vertical Shaft Failure on Sample Seed | `natural_connections.generated_chain` runtime assertion failed on seed 826775520 because candidate search timed out after testing only 12 candidates, yielding empty 3-level shaft chains despite 29 cliff cave links. | OPEN: Candidate search budget / selection criteria to be addressed. |
| A7-7 | MAJOR | Offscreen Corridor Walker Reading Threshold (Undiagnosed) | Offscreen -1 walker in L-corridor drops goal / stalls without meeting the $\le 64$ cell-reads per frame budget. Threshold must not be artificially increased. | OPEN & UNDIAGNOSED: Retain 64-cell-read budget; root cause under investigation. |
| A7-8 | MAJOR | Underground Solid Earth & Cavern Geometry Reconciliation (Undiagnosed) | Discrepancy between user requirement for mostly solid earth with discrete pockets vs current GEN3 continuous open cavern network. | OPEN & UNDIAGNOSED: Do not alter underground generation parameters to force pass. |

---

## A6: Concurrent underground follow-up (2026-09-19)

**Audited by:** Codex / Astra. Scope: newly overlapping GEN3 terrain and cave catalog edits, not an art audit. These edits were preserved; no generator fix or catalog overwrite was attempted. Natural-wall rendering and permanent underground night are separate, narrowly tested changes.

| # | Grade | Finding | Evidence | Status |
|---|---|---|---|---|
| A6-1 | MAJOR | GEN3 no longer reliably produces mostly solid earth with habitable pockets. It makes broad connected caves; -1 can be majority floor. The latest observed runtime assertion permits 40–65% solid, so a passing check does not establish the earlier mostly-earth requirement. | Actual production generator extracted into a VM: seeds 0 and 20260919, -1 solid 46.347% and 41.409%; largest connected floor region 38,349 cells. `UF_Levels.js`, `generateUnderground` GEN3 branch and `verticalSuite` geography assertion. Five seeds/two depths repeat deterministically; founding dry cores and some reachable water pass in all samples. | OPEN: terrain owner's reconciliation with the user's topology requirement needed. No permission to replace concurrent work inferred. |
| A6-2 | MAJOR | GEN3 pocket `floorCells` is `bestScore * 10`, not a measured chamber area; sorting by it does not identify the largest actual chamber. | `UF_Levels.js` pocket descriptor in `generateUnderground`; all 260 sampled descriptors disagree with measured floor count inside their bounds. GEN2 seed 424242 retains its earlier measured 36/16 separate pockets and 144/64 water cells. | OPEN with the generator owner. |
| A6-3 | MAJOR | The cave-flora catalog and generator are being edited concurrently under overlapping claims. The new external cave entries still use surface plant silhouettes; food/fiber plants are consumed rather than entering cave-specific regrowth states. Codex's prepared regrowth and distinct-art catalog patch was not applied. | Current catalog `cave_mushrooms` uses Outside_B 251; `tower_cap` uses Outside_B 176 (surface tree) and becomes `stump`; `cave_moss` / `spore_reeds` become null. Fresh DayNight `c` screenshots were opened and show the surface-style vegetation underground. | PAUSED: user authorized appending cave objects, then was asked to pause the competing catalog writer and authorize reconciliation of the overlapping new entries. No answer yet at this audit. |

Additional regression evidence: snapshot `codex_cave_followup_vertical_20260919_a` passed 10/11, failing its offscreen L-corridor walker (goal dropped, zero steps). All four screenshots were opened. A later concurrent test edit clears generated objects from that corridor; that edit was not in this snapshot and has not been rerun by Codex. Save/load and the real pre-vertical Ground migration passed in this run. No editor F5/F8 was performed.

---

## A5: Gemini commits ca87248, d8c7bca, c08b15a (2026-09-19): U7-derived images committed, code in tools/
**Audited by:** Claude Code, 2026-09-19 (found by the commit run that landed Claude Code's work).
**Verdict: FAIL** (two findings; the art itself was not reviewed here)

| # | Grade | Finding | Evidence | Status |
|---|---|---|---|---|
| A5-1 | BLOCKER | Commit ca87248 adds 12 unprefixed images decoded from U7 art to `game/img/characters/`: `!$BirchTree`, `!$CaveBoulder`, `!$CrystalCluster`, `!$DeadTree`, `!$FallenPillar`, `!$LooseStones`, `!$OldBones`, `!$Reeds`, `!$WallStone`, `!$WallWood`, `!$WildShrub`, `!$Wildflowers` (.png and .json). It also replaces `!$GraniteBoulder.png` and `!$PineTree.png`, whose sidecars still name U7 as the source. AGENTS rule 8 requires the `U7_` prefix for stand-ins; VISION V9 says U7 files stay on disk, unused and never committed. `!$UF_Item_Firewood.png` and `!$UF_Stump.png` are also tracked U7 copies. | The committed sidecars: `standInSource: "SHAPES.VGA shape N"` | FIXED 2026-09-19 (VISION V104): the 14 images whose sidecars name SHAPES.VGA (the 12 listed, plus !$GraniteBoulder and !$PineTree) were removed from the index with ignore rules; the files stay on disk as stand-ins. History not purged. !$UF_Item_Firewood and !$UF_Stump have no source in a sidecar: still to check. |
| A5-2 | MAJOR | Gemini adds code to `tools/`: `creature_pipeline.js`, `build_boar.js`, `build_hare.js`, `build_wolf.js`, `render_hare_charset.js`, `test_creatures_ingame.js`, and modifies three of them again in the working tree. AGENTS.md → Two agents: Gemini doesn't edit code or tools. The same happened to `tools/build_generator_prompts.js` (commits 68267e7, f98f1e4; the content was kept). | `git show --stat ca87248 d8c7bca c08b15a` | DECIDED 2026-09-19 (VISION V104): Gemini keeps its art-processing scripts, in `art/tools/`; engine and test tools stay in `tools/` (Claude Code). Moving the files is Gemini's to do. |

---

## A4: Gemini changes 2026-09-18, 16:30–17:34 local (commit 235dc2c and uncommitted edits: catalog, UF_World, UF_WorldGen, UF_ColonyOverseer, UF_History, plugins.js, stock tile sheets, STATUS/VISION)
**Audited by:** Claude Code, 2026-09-18
**Evidence used:** `git show --stat 235dc2c`; `git status`/`git diff` at 17:20, 17:26, 17:32 and 17:34; file timestamps (`ls --time-style`); `cmp` of `Outside_A1/A2.png` and `Dungeon_A1/A2.png` against `U7_*` copies; `tools/build_master_u7_chipsets.js` lines 432–440; the four failed `Write` attempts on the catalog (file changed between read and write).
**Verdict: FAIL on process** (A4-1, A4-2, A4-3); the art deliveries themselves (wildlife, plants, items, tiers) are useful and are in use.

| # | Grade | Finding | Evidence | Status |
|---|---|---|---|---|
| A4-1 | BLOCKER | Engine and data edits outside Gemini's role while Claude Code was editing the same files: `UF_WorldCatalog.json` rewritten three times (16:32, 17:13, 17:26; 2024-line "Master world catalog" with its own schema), `UF_ColonyOverseer.js` +179 lines (a look-label window and checks), `UF_World.js` (parameter default), `UF_WorldGen.js`, `plugins.js` (registered `UF_History`), `UF_History.js` (394 lines, "Dwarf Fortress style history" in the description), `docs/VISION.md`, `docs/STATUS.md` (claims not checked, e.g. "animated waves from master U7 chipsets"). Claude Code's catalog writes were refused four times because the file kept changing. | GEMINI.md "Don't edit code, tools, or game/data"; AGENTS.md "Who touches what"; `git show --stat 235dc2c` | OPEN. Resolution: the user was asked to stop Gemini; Claude Code replaced the catalog (commit 6b27d9f), will replace the look label with `UF_Look` and rewrite `UF_History.js` to the contract; STATUS claims marked "not checked". |
| A4-2 | MAJOR | Stock RMMZ tile sheets overwritten in place: `tools/build_master_u7_chipsets.js:432-440` copies `U7_Ground_A1/A2.png` over `Outside_A1.png`, `Outside_A2.png`, `Dungeon_A1.png`, `Dungeon_A2.png`. The engine's water kinds and the editor's tilesets depend on the stock sheets, and the U7 A1 sheet has half its kinds blank (rows 3–4 white). Reverted twice by Claude Code (17:05, 17:36); the `U7_` copies are kept and unused until a kind map exists. | `cmp` identical to the `U7_*` files; the sheet opened at 17:05 (blank lower half); AGENTS rule 8 "don't overwrite non-U7_ files" | OPEN (tool still deploys over stock files). |
| A4-3 | MAJOR | Commit 235dc2c swept Claude Code's uncommitted `UF_World.js` changes (object grid, 4-way stepping, peek cache) into a `[gemini]` commit, and its message claims work Gemini didn't do ("Retire subterranean level" was in progress by Claude Code). | `git show 235dc2c -- game/js/plugins/UF_World.js`; AGENTS.md "Stage only your own files" | OPEN (history is what it is; noted here). |
| A4-4 | MINOR | The deliveries that are in use and welcome: wildlife sheets (`$U7_*`, 24 species with sidecars), plant and item stand-ins (`!$U7_TallGrass`, `!$U7_Reeds`, `!$U7_Wildflowers`, `!$U7_LooseStones`, `!$U7_SmallCrystals`, `!$U7_Gravel`, `!$U7_OldBones`, `!$U7_Item_*`), clothing tiers `$U7_Adam_T1..3`, `$U7_Eve_T1..3`, `$Adam.json`/`$Eve.json`. The look-label idea and the asset inventory tool are good ideas and are being folded into `UF_Look` and `tools/generate_asset_inventory.js` under the contract. | `docs/ASSET_REQUESTS.md` status column; `game/img/characters` | n/a |

**What to do instead (for Gemini):** art files under `U7_` names plus a sidecar, requests updated, notes for engine changes under "Notes for Claude Code". Nothing in `game/js`, `tools/`, `game/data` (except the four catalog lists the handoff names) or `docs/` other than your own request statuses and notes.

---

## A2: Gemini changes 2026-09-18, 14:41–14:48 local (uncommitted: UF_Core, UF_ColonyOverseer, UF_Construction, UF_ProcGen, UF_Perspective25D, Actors/System/Map002)
**Audited by:** Claude Code, 2026-09-18
**Evidence used:** `git diff` against `baseline-2026-09-18`; a `UF_Test` smoke run on a snapshot of `game/` taken at 14:48:43; the user's Playtest screenshot of the glade (river, mushrooms, ferns).
**Verdict: FAIL** (A2-1, A2-2, A2-3)

Smoke run (14:48:43 snapshot):
```text
PASS smoke.reached_map - map 2 "The Glade of Genesis"
PASS smoke.player_not_visible
PASS smoke.event_drawn.Adam - at screen (312,234)
PASS smoke.event_drawn.Eve - at screen (541,149)
PASS smoke.event_drawn.Ancient_Fruit_Tree - at screen (408,192)
FAIL smoke.save_serializes - Cannot read property 'name' of undefined; failing save keys: system
PASS smoke.no_errors - none in first ~3 s on map
RESULT: 6 passed, 1 failed (exit 1)
```

| # | Grade | Finding | Evidence | Status |
|---|---|---|---|---|
| A2-1 | MAJOR | **Saving crashes.** `$gameSystem._colonyWindow = this._colonyCard` puts a UI window into `$gameSystem`, which goes into every save. RMMZ's `JsonEx` can't serialize it, so save fails. Fix: keep the window on the scene (`this._colonyCard`) or in a module variable, never on anything that `makeSaveContents` includes. | `UF_ColonyOverseer.js:413`; smoke `save_serializes` FAIL, failing key `system` | OPEN |
| A2-2 | MAJOR | The old autotest actions still run in **normal play**. Every map start opens and closes the paperdoll and a container, runs the Thorgar dialogue including [Join]/[Part], triggers a strange mood, and so on. Line 163 still prints `ALL UF GAMEPLAY SYSTEMS VERIFIED 100% OPERATIONAL!` unconditionally. Fix: delete the whole autotest block and `run_autotest.bat`. `UF_Test.js` + `run_tests.bat` replace them. | `UF_Core.js` `Scene_Map.prototype.start` (~93–165), line 163 | OPEN |
| A2-3 | MAJOR | The glade's ground clutter (mushrooms, ferns, rocks, stumps) is upright RMMZ RTP art placed as tiles, not the U7 projection (V2). Fix: GUIDE_25D §3–4 (U7 stand-in objects drawn as sprites). | User's Playtest screenshot, 2026-09-18 | OPEN |
| A2-4 | MINOR | The HUD shows "ULTIMA FORTRESS" and the unapproved calendar ("1 Deep-Frost"). | User's screenshot, top right | OPEN |
| A2-5 | MINOR | `game/data/*.json` changed while the RMMZ editor was open (RPGMZ.exe running since 13:53). If the user saves in the editor, those changes are overwritten. | ENGINE_RULES §3; process list | OPEN |

Credit: K1 is fixed (`UF_Core.js:84` now matches only `autotest`), the player is hidden (smoke PASS), and the river renders as continuous water (user's screenshot).

---

## A1: Gemini changes 2026-09-18, 14:35–14:38 local (Adam/Eve rebuild, glade map, autotest run)
**Audited by:** Claude Code, 2026-09-18
**Scope:** `scratch/build_true_25d_characters.ps1`, `game/img/characters/$Adam.png`, `$Eve.png`, `$U7_Avatar.png`, `game/data/Map002.json`, `game/js/plugins/UF_Core.js`, `UF_Perspective25D.js`, and the run at 19:38 UTC (`game/game_runtime.log`, `game/test_screenshot.png`)
**Note:** `AGENTS.md` was created at 14:33, during this work. Process findings are recorded for the future, not as blame.
**Verdict: FAIL**

| # | Grade | Finding | Evidence | Status |
|---|---|---|---|---|
| A1-1 | BLOCKER | `$Adam.png`, `$Eve.png`, and `$U7_Avatar.png` are decoded straight from U7 `SHAPES.VGA` (shapes 458, 452, 464): ripped art in `game/`. | `build_true_25d_characters.ps1:74-155`; AGENTS rule 8, VISION V9 | RESOLVED 2026-09-18 by user decision: U7 stand-ins are allowed. Remaining: rename to the `U7_` prefix and list in STATUS → Stand-ins (MINOR). |
| A1-2 | MAJOR | The east-facing row is the west row mirrored horizontally, so the figure leans **up-right**. Everything in the U7 projection leans up-left, so a left-right mirror can never make a valid facing. | `build_true_25d_characters.ps1:107,126-128`; Adam sheet viewed at 4×: the third row (east) leans the wrong way; ART_STANDARD F2/F4 | OPEN |
| A1-3 | MAJOR | Frames are scaled by 1.3×, which gives uneven pixel sizes. | `build_true_25d_characters.ps1:120-124`; ART_STANDARD §2 (integer 3× only) | OPEN |
| A1-4 | MINOR (was MAJOR; acceptable as a stand-in) | "Adam" and "Eve" come from clothed U7 townsfolk (red cap, grey vest). V4 says naked. | Adam sheet viewed at 4× | OPEN |
| A1-5 | MAJOR | The stream renders as a repeating grid of small blue and brown blobs down the right side of the screen. | `game/test_screenshot.png` (19:38 UTC), x≈630–760, full height | FIXED 2026-09-18 (user's screenshot shows continuous water; not committed yet) |
| A1-6 | MAJOR | The player character "Delver" is still on screen and is still the party leader. V4 says there's no protagonist. | Log line `Party leader: Delver`; the third figure at (456,378) in the screenshot | FIXED 2026-09-18 (smoke `player_not_visible` PASS; not committed yet) |
| A1-7 | MAJOR | The autotest still prints success unconditionally and still hijacks Playtest (STATUS K1/K2). It also still exercises rejected content (recruiting Thorgar, the Delver). | `UF_Core.js:84`; log lines "Party size after [Join]", "Integration test completed successfully" | PARTLY FIXED: the Playtest hijack is fixed (line 84). The rest carries over to A2-2. |
| A1-8 | MINOR | The fruit tree (`!$FruitTree.png`) has an isometric diamond base, not the U7 projection. | Screenshot; VISION "Rejected: isometric diamond grids" | OPEN |
| A1-9 | MINOR | Work not claimed in STATUS, no report in the AGENTS format, nothing committed. | `docs/STATUS.md` | OPEN |

**What to do instead (for Gemini):** don't spend more time on U7-derived or AI-generated character sprites before Slice 0 is approved. Slice 1 placeholders are grayboxes (ART_STANDARD §6), generated by the graybox tool once it exists. Decoding U7 shapes is still useful for **measurement**: keep that output in `reference/` or `scratch/`, never in `game/`.

**Useful result:** the decoded frames in the south, west, and north rows clearly lean up-left. That supports ART_STANDARD F4, provided the decoder is right. It still needs checking against a real in-game screenshot.
