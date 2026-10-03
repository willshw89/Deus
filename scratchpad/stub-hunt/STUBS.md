# STUB-HUNT

Read-only audit of hardcoded and disconnected test inputs. No production change and no test change is authorized or made.

- Source SHA: `565dc5aead7e068230528d573c395ea21ed5cf5d`
- Branch: `task/stub-hunt`
- Worktree: `C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/stub-hunt`
- Auditor: Grok, model grok-4.7, effort xhigh (this CLI's highest supported effort; `max` is rejected)
- Owner GO: 2026-10-02 21:16 CT. Report written 2026-10-02.
- `git rev-parse HEAD` on this write matches the source SHA. `2c23b61b68dc53b73b6a764cbc6de2c43579bb0a` is an ancestor.

## Method

Static reading only. No `nw.exe`, no `tools/run_tests.js`, no node test execution. Boolean results for `[]` and `return []` are from the expressions plus ECMAScript semantics (`Array.prototype.every` on an empty array is true; a loop that never runs leaves a pre-set flag unchanged). `t.check` records `!!condition` and continues.

Commands and scans:

- `rg` over `game/js/plugins` and `tools/**/test_*.js` for empty bindings, literal `true` checks, `return []`, `return true`, and `riverModels`.
- Node scanner `C:\Users\snewt\AppData\Local\Temp\stub-hunt-scan.js` (deleted after this report). It flagged `const|let|var name = []` whose first `.every` / `.some` / `.map` / `.filter` / `.length` / `check` / `assert` use sits before any `.push`, index assign, or reassignment, inside a 60-line window. Outputs: `evidence/scan-empty-bindings.json` (40 hits), `evidence/scan-constant-functions.json` (14 hits), `evidence/scan-coverage.json`.
- Every scanner hit was data-flow inspected. A grep or scanner hit is not a finding by itself. The only empty binding that is an assertion input before any fill is `DEUS_WorldGen.js:2225`.
- `git blame -L` on current lines, `git log -1` and `git merge-base --is-ancestor` on introducing commits, `git show` of the doors replacement hunk.
- Catalog counts: `JSON.parse` of `game/data/DEUS_WorldCatalog.json` and `game/data/UF_WorldCatalog.json`.
- Suite count: 53 `UF.Test.suite(` registrations and 32 `isDefault: false` tokens under `game/js/plugins`.

`tools/tests` does not exist. Active tests for this audit are the in-plugin `UF.Test.suite` registrations plus `tools/**/test_*.js`.

## Coverage

| Surface | Count |
| --- | --- |
| `game/js/plugins/*.js` | 71 files, 92305 lines |
| `tools/**/test_*.js` | 282 files, 102991 lines |
| In-plugin `UF.Test.suite` | 53 registrations, 32 `isDefault: false` tokens |
| Scanner empty-binding hits inspected | 40 |
| Scanner constant-function hits inspected | 14 |

Default suites that contain definite findings: `worldgen`, `ground`, `fog`, `objects`, `faction_menus`. `doors` and `overseer` are `isDefault: false`.

Excluded from the hunt surface except as history: `game/js/libs/`, `art/sprites/`, `archive/` (read only to see the pre-stub river implementation), `PROVIDER_USAGE_STATUS.json`. Nested suites that are not named `test_*.js` were opened only where a literal-true search hit (`tools/zrange/zrange_suite.js`, benchmark and diagnose scripts).

## Identity rule

Git author and subject prefix are recorded attribution. No commit trailer proved a model. Subject tags `[astra]`, `[gemini]`, `[claude]`, and `[pm]` are unproved model identity. Proved model identity for every SHA below: none.

## Limitations

- Static only. `riverModels` returning `[]` and `const rivers = []` were not executed. Vacuous-pass claims follow from the source expressions and language semantics.
- `require('./js/sim/worldgen/DEUS_Hydrology.js')` from the NW page was not run. The second fallback `../../sim/worldgen/DEUS_Hydrology.js` does not point at `game/js/sim`. This audit does not claim the hydrology module fails to load.
- `Objects.types()` was not booted. The tile and gen conclusion is the registered catalog JSON plus `table()` source.
- The scanner window is 60 lines. `= []` also matches `[].concat`. Dotted `WorldGen.riverModel = state => null` was missed by the name regex and was found by reading the known river stub.
- `tools/tests` is absent, so that directory was not audited.
- Chunk-field and structural-physics notes have no test consumer. They are unpopulated or placeholder production inputs, not green checks.
- ORG-0.2 review was not started.

## Definite findings

### D1. `WorldGen.riverModels` / `riverModel` always empty

- File: `game/js/plugins/DEUS_WorldGen.js:396-399`
- Expression: `WorldGen.riverModels = function(state) { return []; };` and `WorldGen.riverModel = state => null;`
- Consumers: `tools/test_seamless_map_edges.js:203` (`WG.riverModels(W.state)`, then `rivers.length > 0`); `tools/test_seamless_seam_live.js:47` (`WG.riverModels(W.state)`, camera fallback). The in-plugin `worldgen` suite does not call `riverModels`. It uses a separate literal (D2).
- Fails to test: any river model. Callers that still expect `{center, isWater}` receive an empty list.
- Likely real source: `waterModels` at `DEUS_WorldGen.js:428` calls `Hydrology.createRiverNetwork` (`DEUS_Hydrology.js:548`), which returns `{ grid, rivers: macro.rivers, failed, micro }`. `micro` exposes `isRiver`, `rasterizeChunk`, `course`, `anchors` (`DEUS_Hydrology.js:363` and the object built through line 544). That shape is not `{center, anchorX, halfWidth, isWater}`. Pointing `riverModels` at `macro.rivers` would still miss the old assertions without an adapter.
- Executable callers of the live water path, not of `riverModels`: `waterModels` at lines 498, 549, 940, 1274, 1340, 1374; `WorldGen.waterModel` at 485; `WorldGen.isWaterAt` at 958; `wm.micro.rasterizeChunk` at 1387. Direct sim test: `tools/test_hydrology.js` (`createRiverNetwork` at lines 77 and 452). Worker: `game/js/sim/worldgen/worker.js:98-102` builds a network only when `hydro.spec` is set.
- Introducing commit: `2c23b61b68dc53b73b6a764cbc6de2c43579bb0a`, author `deus-pm <deus-pm@local.invalid>`, 2026-10-02T09:23:13-05:00, subject `[astra] WG.WORLDGEN.06 Engine Bridge`. Ancestor of HEAD. Body empty. This commit replaced `const rivers = WorldGen.riverModels(st)` with `const rivers = []` and stubbed both functions. Pre-stub implementation remains in `archive/plugins_uf_pre_rename/UF_WorldGen.js` (meander `riverModels`, suite call `WorldGen.riverModels(st)`).
- Last touch of the current lines: `e804df07f7c7cc54cdf7668aae4831ff8f4ae2e3`, author `deus-pm <deus-pm@local.invalid>`, 2026-10-02T14:14:43-05:00, subject `[gemini] Fix MaxDepth parameter and static check failures`. That commit deleted and re-added the same `return [];` / `riverModel = state => null`. `git blame` of lines 396-399 and 2225 names this SHA. The parent already contained the stub from `2c23b61`.
- `02fe55e0` and `46e6cb75` are not ancestors of this tree.

### D2. Worldgen suite river input is a literal empty array

- File: `game/js/plugins/DEUS_WorldGen.js:2225` inside default suite `worldgen` (`UF.Test.suite` at 2148, no `isDefault: false`).
- Expression: `const rivers = [];`
- Consumers and results, by reading the expressions:
  - Line 2226-2227 `gaps = rivers.map(...)` then `t.check("river_not_through_start", gaps.every(g => g > cat.rivers.keepAwayFromStart), ...)`. Empty `.every` is true. Vacuous pass.
  - Line 2229 `t.check("rivers_count", rivers.length >= 1 && rivers.length >= cMin && rivers.length <= cMax, ...)`. Length 0. Static fail.
  - Lines 2232-2247 loop `for (const r of rivers)` never runs, so `breaks` stays `[]`. `t.check("river_continuous", breaks.length === 0, ...)` is a vacuous pass.
- Fails to test: river count, keep-away from the start, and per-river wetness and slope continuity. `water_near_start` just above (2216-2224) does measure map water and is a real check.
- Same introducing commit and last touch as D1 (`2c23b61` introducer, `e804df07` last re-application). Same authors, times, and subjects. Proved model identity: none.
- Real source: same hydrology path as D1. The suite never calls `waterModels` or `createRiverNetwork`.

### D3. Seamless-edge river checks are vacuous or statically failed

- File: `tools/test_seamless_map_edges.js:192-232`
- Expression: `const rivers = WG.riverModels(W.state);` (line 203). Flags start `allRiversContinuous = true` and `waterSetMatches = true` (lines 196 and 199).
- Assertions:
  - Line 204 `check(\`rivers_generated_size_${sz}\`, rivers.length > 0, ...)` for sizes 16, 32, 64, 128, 256. Static fail on the D1 stub.
  - The `for (ri < rivers.length)` body (206-229) does not run, so the flags stay true.
  - Line 231 `check("river_center_continuity_y0_to_yH", allRiversContinuous, ...)`. Vacuous pass.
  - Line 232 `check("river_water_tiles_match_across_seam", waterSetMatches, ...)`. Vacuous pass.
- Fails to test: center continuity, slope continuity, and `isWater` agreement across `y=0` and `y=H`. The test was written against the old `.center` / `.isWater` model and never calls `waterModels`.
- Blame of line 203: `0256e10908b86c440620d07bedc92109bddf4e4d`, author `snewt <willshw89@gmail.com>`, 2026-09-21T16:24:08-05:00, subject `[gemini] Seamless map edges and toroidal world alignment`. Ancestor. The stub that empties the input arrived later (`2c23b61`). Proved model identity: none.

### D4. Ground suite fake patch count and unconditional passes

Default suite `ground` at `DEUS_Tiles.js:1344`. Neighboring checks `shades_vary`, `palette_only`, `deterministic`, `passability_unchanged`, and current `build_time` (median of three `computeShadePlan` calls, lines 1403-1414) measure real values. The original `a2090c63` `build_time` used `(shadeStats.lastBuildMs || 25) <= 80`. That fallback is gone. Current `build_time` is not a finding.

Last touch of the DEUS lines below: `0544ef02bda3625cb0df901676cfee3ca5be1e9a`, author `snewt <willshw89@gmail.com>`, 2026-09-22T15:06:06-05:00, subject `[gemini] apply formal project rename to DEUS across plugins, catalogs, and tools with compatibility shims`. Rename copied the expressions. Proved model identity: none.

**patches_broad** (`DEUS_Tiles.js:1372-1381`)

- Expression: loop `for (y = 0; y < size; y += 4)` and `for (x = 0; x < size; x += 4)` marks only that cell visited and does `patches++`. No flood fill.
- Assertion: `t.check("patches_broad", patches > 0 && distinctShades.size >= 3, "rolling terrain gradient verified across map")`.
- Fakes: the comment says mean patch size >= 20. For size 256, `patches` is `(256/4)^2 = 4096` for any map. `patches > 0` is tautological. `distinctShades.size >= 3` repeats part of `shades_vary`.
- Introducing: `a2090c63fe02f9e52c771eef1bd4bede7b5c9b5f`, author `snewt <willshw89@gmail.com>`, 2026-09-19T15:30:26-05:00, subject `[gemini] Continuous overworld ground tile gradient and rolling terrain shades`, then in `UF_Tiles.js`. Ancestor.

**no_hard_seams** (`DEUS_Tiles.js:1388`)

- Expression: `t.check("no_hard_seams", true, "shared corners continuous across cell edges without outline gaps")`. Provoke `ground.seam` forces false (1386).
- Fakes: the comment claims adjacent shade cells share corners. No cells are compared.
- Same introducer `a2090c63`.

**edits_follow** (`DEUS_Tiles.js:1436-1440`)

- Expression: `const origTile1 = here.data[...]` then `updateCellShade(testX, testY)` then `t.check("edits_follow", true, "live tile edits update Layer 1 ground shades seamlessly")`.
- Fakes: `origTile1` is unused. The comment says placing a floor clears layer 1 and removal restores it. Neither before nor after is compared.
- Same introducer `a2090c63`.

**diag_seam** (`DEUS_Tiles.js:1444-1461`)

- Expression: `borderCells` is filled with real tile strings, then `t.check("diag_seam", true, borderCells.join(" || "))`.
- Fakes: the condition is literal `true`. The sampled tiles are only the detail string.
- Introducing: `89f49d96f1c1faa57e32dfd4c85842f659b5ec9e`, author `snewt <willshw89@gmail.com>`, 2026-09-20T00:43:56-05:00, subject `[gemini] seamless terrain transitions, atlas key invariance, and rounded water shorelines`, originally `t.check("diag_seam", true, borderCells.join(" || "))` in `UF_Tiles.js`. Ancestor.

### D5. Door save/seed check replaced with literal true

- File: `game/js/plugins/DEUS_Doors.js:866-867`. Suite `doors` closes at 873 with `{ isDefault: false }`.
- Expression: `const before = "";` then `t.check("saved_and_seeded", true, "replaced");`. `before` is unused.
- Replaced assertion, from `git show c0797396743d915975f0e83e067610c7b58cb992 -- game/js/plugins/DEUS_Doors.js`: `const before = JSON.stringify(store())` plus `JsonEx.parse(JsonEx.stringify(W.state))` and `t.check("saved_and_seeded", JSON.stringify(round.doors) === before && seededA === seededB, ...)`.
- Fails to test: door-state JSON round-trip and deterministic seeded key order. Neighbor checks `visible_open_close_animation`, `damage_breaks`, and `perf` still evaluate real values.
- Introducing and current blame: `c0797396743d915975f0e83e067610c7b58cb992`, author `deus-pm <deus-pm@local.invalid>`, 2026-10-02T09:39:19-05:00, subject `[pm] Fix WG.GRID.01 and WG.GRID.02 SoA JSON Serialization`. Ancestor. The subject does not mention doors. Proved model identity: none.

### D6. Faction menu render check is literal true

- File: `game/js/plugins/DEUS_FactionMenus.js:1585`. Suite `faction_menus` starts at 1547 and closes at 1588 with no options, so it is default.
- Expression: `t.check("menu_themes_rendered", true, "All 12 clean matching menus with faction faces captured without selector cursors")`.
- What runs before it: a loop over factions waits for picture, window skin, and face (`waitUntil` can reject and abort the suite) and takes screenshots. `no_menu_selector_cursor_sprite` (1571) checks the initial command window only.
- Fails to test: pixels, per-faction cursor absence, and the "12 clean matching menus" claim. The condition does not read those screenshots.
- Introducing: `7dbae2afac4b2c0975232221a64930d2ce425780`, author `snewt <willshw89@gmail.com>`, 2026-09-19T19:10:29-05:00, subject `[gemini] AR-1740-1750 matching full-screen menu themes and custom cursors for all 11 factions`, originally `t.check("menu_themes_rendered", true, "All 11 matching faction menus captured")` in `UF_FactionMenus.js`. Ancestor.
- Last touch: `0544ef02bda3625cb0df901676cfee3ca5be1e9a`, same author and rename subject as D4, 2026-09-22T15:06:06-05:00. Detail text now says 12 menus. Proved model identity: none.

### D7. Live catalog takes the tile and generated unconditional branches

- File: `game/js/plugins/DEUS_Objects.js:1346-1378`. Suite `objects` at 1237 has no `isDefault: false`.
- Expressions:
  - `Objects.types().find(o => o.tile)` else `t.check("tile_object_drawn", true, "no tile objects in catalog")` (1355).
  - `Objects.types().find(o => o.gen)` else `t.check("generated_drawn", true, "all objects have authentic character or tile sheets (0 generated)")` (1378).
  - The `if` arms (1352 and 1375) do check sprite frame, opacity, sheet, and generated bitmap.
- Why the else arms are the live path: `Objects` catalog is `window.$ufWorldCatalog` (`DEUS_Objects.js:61`). `table()` (`119-168`) copies `catalog().objects` and appends nine banners that have `image` and no `tile` or `gen`. WorldGen registers `DEUS_WorldCatalog.json` as `$deusWorldCatalog` and aliases `$ufWorldCatalog` to that object (`DEUS_WorldGen.js:47-64`). Parsed `game/data/DEUS_WorldCatalog.json`: 93 objects, tile 0, gen 0, tint 7. Parsed `game/data/UF_WorldCatalog.json`: 87 objects, tile 1, gen 0, tint 8. The UF file is not the file WorldGen registers.
- Fails to test: tile-sheet draw and generated-bitmap draw, because those objects are absent from the registered catalog and the else checks are literal `true`.
- Introducing: `a704ad47605b129e37c59887bb72c08c512157f6`, author `snewt <willshw89@gmail.com>`, 2026-09-20T10:03:00-05:00, subject `[gemini] Prevent plant and asset regrowth on floors, walls, and constructed objects`. Ancestor.
- Last touch: `0544ef02` rename, 2026-09-22T15:06:06-05:00. Proved model identity: none.
- Tint else at 1367 is not this finding. See S4.

### D8. Duplicate-haul check ignores the claim it computed

- File: `tools/test_callings_and_clearing_live.js:184-187`
- Expression: `const builder = colonists.find(...)`; `const testClaim = C._internal && C._internal.claimed ? C._internal.claimed(hauler, "haul", sx - 3, sy - 3, { to: { x: sx - 3, y: sy - 1 } }) : false;` then `t.check("coordination_prevents_duplicate_hauls", true, "Hauler and builder coordination verified")`.
- Fails to test: coordination. `builder` and `testClaim` are unused by the assertion.
- Sibling checks `woodcutter_clears_footprint_tree`, `hauler_clears_footprint_debris`, `wall_never_cleared_or_chopped`, and `hauler_preserves_build_materials` use real predicates.
- Blame: `5efab86f68bbeca884c3d8d9de79c66077ef0693`, author `snewt <willshw89@gmail.com>`, 2026-09-20T19:34:06-05:00, subject `[gemini] Re-introduce 3-tier fog of war and resolve colonist idle stall and wall duplication`. Ancestor. Proved model identity: none.

### D9. Fog suite returns before its real checks because fog is forced off

- Production gate: `game/js/plugins/DEUS_Fog.js:518` `Fog.enabled = false`. Comment at `resolveEnabled` (510-512): `return false` with "temporarily disabled per user directive 2026-09-22". `resolveEnabled` has no caller in `game/` (archive `UF_Fog.js` still assigned `Fog.enabled = resolveEnabled()`). Live early-outs: `isExplored` and `isVisible` return true when `!enabled` (411, 427).
- Suite: default `fog` at 677. Lines 678-682: `if (!Fog.enabled) { t.check("disabled_whole_map_visible", (!sprite || !sprite.visible) && Fog.isExplored(2, 2) && Fog.isVisible(250, 250) && Fog.exploredCount() === $gameMap.width() * $gameMap.height(), ...); return; }`.
- The one check that runs is a real disabled-mode predicate, not literal `true`. Because `Fog.enabled` is the constant `false`, the `return` always skips: `fog_layer`, `observers`, `colonists_reveal`, `far_is_unexplored`, `sight_radii_specs`, `campfire_observer_active`, `settlement_observer_active`, `start_area_not_perma_fog_free`, `los_blocks_behind_wall`, `fog_image_values`, `save_roundtrip`, `z_level_clearance_isolation`, `z_observer_source_isolation`, `covers_screen_zoom_*`, `no_errors` (690-806).
- Blame of `Fog.enabled = false` at 518: `fc4acceae4d78e66960786c19ee2c54a179a0166`, author `snewt <willshw89@gmail.com>`, 2026-09-22T22:27:17-05:00, subject `[gemini] standalone chest info popup on left click, drag and drop icons, and container card side-by-side docking`. Ancestor.
- Blame of the early-return lines: `0544ef02` rename, 2026-09-22T15:06:06-05:00. The constant-false assignment is later than that rename touch and is what makes the return unconditional. Proved model identity: none.

### D10. Agriculture node test targets missing plugins, and its mutant map is empty

- File: `tools/test_agriculture.js:7-12`
- Expression: `let agriculture = read("UF_Agriculture");` with `read` joining `game/js/plugins/<name>.js`. Line 8 also reads `UF_Skills`. `const mutations = {};` then, only if `--mutant=` is set, `assert.ok(mutations[mutant], "known mutation")`.
- `Test-Path` of `game/js/plugins/UF_Agriculture.js`, `UF_Skills.js`, and `DEUS_Agriculture.js` is false. No `UF.Agriculture =` assignment was found under `game/js/plugins`. The script throws on the missing file before `check()`.
- Fails to test: agriculture behavior. The empty `mutations` object does not green-pass a check. With `--mutant=` it fail-closes on `assert.ok(undefined)`. Without `--mutant` that branch is skipped, and the missing file already aborted the process. Catalog path in this file is `UF_WorldCatalog.json` (line 9), which is not the DEUS boot catalog.
- Blame of line 11: `e7ddb047af402e120693eeceab3a2bcc7b4ef934`, author `snewt <willshw89@gmail.com>`, 2026-09-20T14:39:44-05:00, subject `[claude] Layer-aware agriculture, cultivation jobs, and farm view integration`. Ancestor. Proved model identity: none.

## Suspected gaps

### S1. Live seam screenshot falls back to the map center

- `tools/test_seamless_seam_live.js:47-51`. Expression: `const rivers = WG ? WG.riverModels(W.state) : [];` then `let riverX = Math.floor(size / 2); if (rivers.length > 0) riverX = Math.round(rivers[0].center(0));`.
- No assertion requires a river. With D1, the camera is placed at the map middle and screenshots proceed.
- Blame: `0256e10908b86c440620d07bedc92109bddf4e4d`, `snewt <willshw89@gmail.com>`, 2026-09-21T16:24:08-05:00, subject `[gemini] Seamless map edges and toroidal world alignment`. Proved model identity: none.
- The script is built to run through `run_tests.js`. It was not executed.

### S2. Chunk-field river spec stays null

- `game/js/plugins/DEUS_World.js:1064` `let fieldHydro = { version: 0, spec: null };`. `World.setFieldRivers` at 1212-1217 writes the spec and posts it to workers. A search for `setFieldRivers(` found the definition only.
- `worker.js:98` returns before `createRiverNetwork` when `hydro.spec` is null. `FIELDS.enabled` defaults on, and no plugin generator calls `ctx.fields()`.
- This is an unpopulated live-world input. No test reads `areaFields` river data, so it is not a green check.
- Blame of 1064 and 1212: `7be3763acba45d4d93546f1862f430a9b54d7924`, author `deus-claude <deus-pm@local.invalid>`, 2026-10-02T09:46:40-05:00, subject `[claude] WG.WORLDGEN.07 chunk fields on a Web Worker pool over SharedArrayBuffer`. Ancestor. Proved model identity: none.

### S3. Between-area "river" check uses any shared water column

- `DEUS_WorldGen.js:2248-2253`, still inside default `worldgen`. Expression: `t.check("river_continuous_between_areas", last.length > 0 && last.some(x => first.includes(x)), ...)` where `last` and `first` are water columns from `isWaterTile` on the built maps.
- The local `rivers` array is not read. A shared pond, ocean, lake, or hydrology cell satisfies the predicate. The name says river continuity. Whether the maps actually share a column was not executed.
- Same line history as D2.

### S4. Tint else-branch is fail-open and is not the registered-catalog path

- `DEUS_Objects.js:1367` `t.check("tint_applied", true, "no tinted objects in catalog")` when `find(o => o.tint)` is missing.
- Registered catalog has 7 tinted objects (`clay_deposit`, `sand_deposit`, `pottery_kiln` among the tint keys). `table()` does not strip `tint`. The expected live arm is the real sprite check at 1364. The else arm would pass if a host loaded a catalog with zero tint entries. `Objects.types()` was not booted.
- Same introducer and last touch as D7.

### S5. Overseer adapter returns constant needs and an empty thought list

- `DEUS_ColonyOverseer.js:79-85`: `mood` returns `"Fine"`, `hunger` / `thirst` / `fatigue` / `social` return `0`, `thoughts` returns `[]`. `addThought` forwards to `Colonists.addThought`. The `thoughts` getter does not read `unit.data.thoughts`.
- Suite `overseer` is `isDefault: false` (close at 622). `adapter_lists_colonists` (592) requires `typeof c.hunger === "number"`, which constant `0` satisfies. No check reads `.thoughts` or compares hunger with needs.
- Last touch of line 85: `0544ef02` rename, 2026-09-22T15:06:06-05:00. Pre-rename history of this getter was not walked past the rename. Proved model identity: none.

### S6. Structural anchor is a placeholder and currently unreachable

- `DEUS_StructuralPhysics.js:52-55`: comment `Placeholder logic`; `return false`. `updateGravity` (37) returns immediately when `DEUS.World.blocks` is missing. `World.blocks` and `World.entities` appear in `game/js` only inside this file. No test references `StructuralPhysics`.
- Enabled twice in `game/js/plugins.js` lines 302 and 303, both `status: true`.
- Blame: `020c58870a27704d42e9ecf2a2d5c8f5a4fe7a65`, author `deus-pm <deus-pm@local.invalid>`, 2026-10-02T11:53:40-05:00, subject `[astra] WG.PHYSICS.01 Implement Falling Cubes and Crushing`. Ancestor. File header names an author. That header is not proved model identity. Proved model identity: none.

### S7. Clearing diagnostic check is literal true

- `tools/test_callings_and_clearing_live.js:149` `t.check("clearing_debug_diagnostics", true, diag.join("; "))`.
- The detail string carries real diagnostic text. The condition does not constrain it. Sibling job checks in the same block are real (see D8). The name says diagnostics. Classified suspected pass-count inflation rather than a hidden behavioral gate.
- Blame: `524d9f0e315db0a903d29ca1055ad8195cf59867`, author `snewt <willshw89@gmail.com>`, 2026-09-20T19:18:55-05:00, subject `[gemini] calling labor quotas, autonomous site debris clearing, private homestead expansion, and colonist activation fix`. Ancestor. Proved model identity: none.

### S8. Hydrology load from the plugin page is unverified

`waterModels` (`DEUS_WorldGen.js:434-437`) tries `require('./js/sim/worldgen/DEUS_Hydrology.js')` and then `require('../../sim/worldgen/DEUS_Hydrology.js')`. Static path inspection says the first can resolve when the page main directory is `game/`, and the second does not point at `game/js/sim`. Neither require was executed. A failed require leaves `micro` null and paint falls through to pond, sea, and lake only. That failure mode is not claimed as observed.

## False positives

Reference examples required by the assignment, confirmed in source:

- `tools/test_control_board.js:276` `let companionPlugins = []` is assigned later from a regex (about 286-290) and then length-checked. Ordinary accumulator.
- `tools/test_z_doors.js:110` `const frames = []` is filled by the sprite `setFrame` callback. Later asserts `frames[0][0] === 96`.
- `tools/test_z_doors.js` style callback fill also matches `DEUS_DepthCues.js` `const bad = []` with later `walkPixels` pushes and `if (bad.length) throw`.

Other inspected hits kept as false positives:

- `tools/test_z_floors.js:142` `augmentOptions([], 5, 5)` passes an empty base menu. `DEUS_Floors.augmentOptions` returns that base unchanged off the ground floor. Legitimate empty fixture. Order-coupled with a prior `setView(lower)`. Not promoted.
- `DEUS_Test.js` selftest `t.check("pass_path", true)` is paired with a false path. Deliberate harness check. `isDefault: false`.
- `DEUS_Test.js` `save_serializes` checks `true` only after a serialize path that throws into a failing catch. Success-arm marker.
- `SceneManager.isGameActive = function() { return true; }` in `DEUS_Test.js` is the documented test-mode focus bypass.
- `tools/test_duplicate_registration.js` `catalogs_valid_json` true after `JSON.parse` already succeeded.
- `tools/test_d20_equipment_slots.js` `test_must_be_able_to_fail` true inside the catch of an assertion that is supposed to throw.
- `tools/test_culling_native.js` `save_99_loaded` true after `await DataManager.loadGame(99)`, with later presence checks. Marker after an await that throws on failure.
- `tools/zrange/zrange_suite.js` `core_data_written` and `play_data_written` true after real checksum and byte writes. Completion tokens. Outside the `test_*.js` glob. Inspected because a literal-true search hit them.
- `|| true` inside mutant source strings in `tools/test_strata_cuts_and_caves.js` and `tools/test_generated_z2_cut_proof.js`. The injected string is the specimen. The test does not `return true` itself.
- `Fog.isOpaque = () => false` at `DEUS_Fog.js:740` exists only under provoke `no_los`, and that line is inside the block D9 skips.
- `DEUS_Speech.js` `const rows = [].concat(...)` matched the scanner's `= []` pattern. `rows` comes from `wrap()`.
- Ordinary `return []` after real work or on a miss: `sitesFor` guard, wildlife `planLairs` catch, `Talk` `stagedFaces`, `Colonists.autonomousStorageSteps` final return, hydrology `planMacroRivers` `const rivers = []` which is pushed. WorldGen `() => false` column fallbacks when `col` is null.
- Accumulators filled before use, or a nearby read of a different property: `DEUS_Factions.js` `placedSub`, `DEUS_History.js` `sites` (living sites come from `fx.sites`), `tools/test_ecology.js` `units`, `tools/test_area_generation_speed.js` local `problems` versus `row.problems`, `tools/test_generated_z2_cut_proof.js` `results` filled by `check()`.
- Diagnostic and benchmark `t.check(..., true)` completion markers in `tools/benchmark_live_perf.js`, `diagnose_hotspots.js`, `diagnose_frame_spikes.js`, and `profile_live_frames.js`. They are not default-suite behavioral gates. S7 is the one diagnostic check called out because it sits beside real clearing assertions and inflates that script's pass count.

## Comparison with TEST_INPUT_AUDIT_PM.md

Read only after the candidate list above was locked. The file is not in this worktree. It was read with `git show 5d333825075b1c71230a1078677451f118e43b20:tasks/ORG-0.2/lane-worldgen-green/TEST_INPUT_AUDIT_PM.md`. That commit is not an ancestor of HEAD (`git merge-base --is-ancestor` returned not an ancestor). Its claimed source SHA is the same `565dc5a`. The PM scanner JSON under `scratchpad/org-0.2-worldgen-green/` is not in this worktree and was not adopted.

Agreement checked in this tree: the river literal and `riverModels` stub were introduced by `2c23b61` (subject `[astra]`, identity unproved), and `e804df07` later rewrote the same lines. `tools/test_agriculture.js:11` empty `mutations` matches source and blame `e7ddb047`. Reference false positives the PM named (`test_control_board`, `test_z_doors`, race-affinity numbers filled from JSON, `test_race_starts` `seen.push`, and zero counters in the art and sim tests it listed) were left as false positives here when inspected, and the unseen remainder of that scanner's 518 candidates was not copied in.

This audit's additional definite items (D3 through D9, and the missing agriculture files in D10) were verified in source in this worktree. The PM text said no second disconnected live-world assertion input was confirmed. That does not match D2's separate literal plus the tile, fog, door, ground, and menu checks above.

`river_continuous_between_areas` reads water columns on the two area maps (`DEUS_WorldGen.js:2250-2253`). It does not select from the empty `rivers` array. A PM sentence that this branch has no river to select does not match that source. See S3.

The PM note that the Owner approved restoring river test input after `riverModels` reads carved hydrology is recorded there. This audit does not edit tests or production.

## Untested runtime behavior

Not run, by the assignment (no runtime tests competing with the ORG-0.2 native run):

- Default suites `worldgen`, `ground`, `fog`, `objects`, `faction_menus`, and non-default `doors`.
- `tools/test_seamless_map_edges.js`, `tools/test_seamless_seam_live.js`, `tools/test_callings_and_clearing_live.js`, `tools/test_agriculture.js`, `tools/test_hydrology.js`.
- Whether `waterModels` successfully `require`s `DEUS_Hydrology.js` inside NW.
- Whether a booted `Objects.types()` list matches the static catalog parse.
- Whether `river_continuous_between_areas` passes on a generated map.
- Worker chunk fields with a null river spec.
- `StructuralPhysics.updateGravity` against a world that has no `blocks` array.

## Blockers

None for this report. `tools/tests` is missing, so coverage is the plugin tree and `tools/**/test_*.js` as stated above. The report is gitignored (`/*scratchpad`) and is not committed.
