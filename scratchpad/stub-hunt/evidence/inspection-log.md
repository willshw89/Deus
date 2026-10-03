# STUB-HUNT inspection log

Source SHA verified this write: `565dc5aead7e068230528d573c395ea21ed5cf5d` (`git rev-parse HEAD`).
Branch `task/stub-hunt`. Static only. No nw.exe, no run_tests.js, no node test execution.

## Scanner outputs already on disk

- `scan-coverage.json`: pluginFiles 71, pluginLines 92305, testFiles 282, testLines 102991, emptyHits 40, constHits 14.
- `scan-empty-bindings.json`: 40 `= []` hits. Data-flow review left one assertion input: `game/js/plugins/DEUS_WorldGen.js:2225` `const rivers = []`.
- `scan-constant-functions.json`: 14 hits. Most are an `if (...) return false` followed by `return true`. Sole-body returns kept: `riverModels` `return []`, `Fog.resolveEnabled` `return false` (no live caller), `StructuralPhysics.hasAnchor` `return false`, `Test` `isGameActive` `return true` (documented focus bypass). `WorldGen.riverModel = state => null` was missed by the name regex and found by reading lines 396-399.

Scanner script lived at `C:\Users\snewt\AppData\Local\Temp\stub-hunt-scan.js` and is deleted with this report. It is not a deliverable.

## Commands this closing pass

- `rg` of river, tile, door, fog, object, faction, agriculture, and structural expressions. Line numbers in `STUBS.md` were re-read.
- `git blame -L` on WorldGen 396-399 and 2225, Tiles 1381/1388/1440/1461, Doors 867, FactionMenus 1585, Objects 1355/1378, Fog 518/682, seamless 203, seam live 47, callings 149/187, agriculture 11, World 1064/1212, StructuralPhysics 55, ColonyOverseer 85.
- `git log -1` and `git merge-base --is-ancestor` for `2c23b61`, `e804df07`, `a2090c63`, `89f49d96`, `c07973967`, `7dbae2af`, `a704ad47`, `fc4accea`, `0256e109`, `5efab86f`, `524d9f0e`, `e7ddb047`, `7be3763a`, `020c5887`, `0544ef02`. All are ancestors. Recorded author, author-time, and subject are in `STUBS.md`. No trailer proved a model.
- `git show c07973967 -- game/js/plugins/DEUS_Doors.js` shows `saved_and_seeded` changed from a `JSON.stringify(store())` / `JsonEx` round-trip to `const before = ""` and `t.check("saved_and_seeded", true, "replaced")`.
- `node` parse: `DEUS_WorldCatalog.json` objects 93, tile 0, gen 0, tint 7. `UF_WorldCatalog.json` objects 87, tile 1, gen 0, tint 8.
- `Test-Path` false: `game/js/plugins/UF_Agriculture.js`, `UF_Skills.js`, `DEUS_Agriculture.js`.
- Suite counter: 53 `UF.Test.suite(` and 32 `isDefault: false` tokens under `game/js/plugins`.
- `setFieldRivers(` call search: definition only (`DEUS_World.js:1212`).
- `resolveEnabled` in `game/js/plugins/DEUS_Fog.js:510` has no caller. Archive `UF_Fog.js` still assigns `Fog.enabled = resolveEnabled()`.
- `World.blocks` / `World.entities` under `game/js`: only `DEUS_StructuralPhysics.js`.
- `createRiverNetwork` callers: `DEUS_WorldGen.js:458`, `worker.js:102` (after `if (!hydro.spec) return null`), `tools/test_hydrology.js:77` and `:452`.
- `waterModels(` callers inside `DEUS_WorldGen.js`: 498, 549, 940, 958 (`isWaterAt`), 1274, 1340, 1374. `rasterizeChunk` at 1387.

## Classification decisions recorded after data-flow

Definite: D1 riverModels stub, D2 worldgen `rivers = []`, D3 seamless vacuous flags plus failing length checks, D4 patches_broad / no_hard_seams / edits_follow / diag_seam, D5 doors `saved_and_seeded`, D6 menu_themes_rendered, D7 tile_object_drawn and generated_drawn else arms on the registered catalog, D8 coordination_prevents_duplicate_hauls, D9 fog early return under constant `Fog.enabled = false`, D10 agriculture missing files and empty mutations map.

Suspected: seam-live camera fallback, null fieldHydro spec, between-area water-column check, tint else fail-open, overseer constant needs, structural hasAnchor placeholder, clearing_debug_diagnostics, unverified hydrology require.

False positives include the required references `test_control_board.js:276` and `test_z_doors.js:110`, plus the accumulators and success-arm markers listed in `STUBS.md`.

## PM file

`TEST_INPUT_AUDIT_PM.md` is absent from this worktree. Compared after candidates were locked via `git show 5d333825075b1c71230a1078677451f118e43b20:tasks/ORG-0.2/lane-worldgen-green/TEST_INPUT_AUDIT_PM.md`. That commit is not an ancestor. Findings in `STUBS.md` were not copied from it except agriculture `mutations`, which was re-read at `tools/test_agriculture.js:11`.
