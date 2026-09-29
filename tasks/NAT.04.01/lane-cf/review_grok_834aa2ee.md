# Independent Grok Review — NAT.04.01 / lane-cf (attempt 2)

- Writer: Gemini (commit author `deus-ops <deus-ops@local.invalid>`)
- Reviewer: Grok
- Reviewed commit: `834aa2ee2facaa7e1267bdc95d9c9d4932202459`
- Parent: `fe193188` (`[grok] NAT.04.01 Independent review of soil engine bridge (commit fb8ffd36)`)
- Merge base with `origin/main`: `809d119ac77ba8f311dc1a000f71dcc5d7330650`
- Branch: `task/lane-cf`
- Worktree: `C:\Users\snewt\.deus_worktrees\lane-cf`
- Review date: 2026-09-29

Authority: the lane brief, the attempt-1 review `review_grok_fb8ffd36.md`, DEC-037, DEC-040 as clarified 2026-09-29, AGENTS.md Rules 9, 12 and 14, DEC-007 (no art). No product code was edited. Measurements are from the committed files at `834aa2ee`, the gate commands below, and one temporary Node probe that was deleted after the run. NW.js was not started. The working tree was clean apart from the untracked launch prompt under `tasks/NAT.04.01/lane-cf/launches/`.

## 1. Commit and scope

`git rev-parse HEAD` at the start of the review was `834aa2ee2facaa7e1267bdc95d9c9d4932202459`, the same SHA as `origin/task/lane-cf`. Commit date 2026-09-29 13:40:58 -0500. Subject: `[gemini] NAT.04.01 Repair soil bridge per Grok review D1-D8 (Attempt 2): loose mass, cascade mirroring, datum elevation, events, persistence`.

`git diff --stat fe193188..HEAD` (this attempt only):

```text
 docs/systems/DEUS_SimBridge.md             |  47 ++---
 docs/systems/UF_Levels.md                  |   5 +
 game/js/plugins/DEUS_Levels.js             |  28 ++-
 game/js/plugins/DEUS_SimBridge.js          | 283 ++++++++++++++++++++++++-----
 tasks/NAT.04.01/lane-cf/REPORT.md          | 204 ++++++++++-----------
 tasks/NAT.04.01/lane-cf/editor_edits.patch |  21 +++
 tasks/NAT.04.01/lane-cf/lane.json          |   1 +
 tools/check_plugin_boot.js                 |  73 ++++++--
 tools/test_package_proofs_ingame.js        |  68 ++++++-
 tools/test_soil_bridge.js                  | 197 +++++++++++++-------
 10 files changed, 664 insertions(+), 263 deletions(-)
```

Every path is inside `lane.json` `allowedPaths`. The diff contains no `game/js/rmmz_*.js`, no `game/js/main.js`, and no `game/js/libs/`. `game/js/plugins.js` is unchanged. `game/js/sim/geomorphology/**` is unchanged. `game/data/UF_WorldCatalog.json` is unchanged. `DEUS_SimBridge` does not appear in `game/js/plugins.js`. `tasks/NAT.04.01/lane-cf/editor_edits.patch` is the unapplied edit for both of those files.

## 2. Gate commands

Run on `834aa2ee` in this worktree, foreground, 2026-09-29.

| Command | Exit | Result |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | 63 DEUS plugin files, 0 errors |
| `node tools/test_soil_geomorphology.js` | 0 | 136 passed, 0 failed |
| `node tools/test_soil_bridge.js` | 0 | 23 passed, 0 failed |
| `node tools/test_soil_bridge.js --mutation-sweep` | 0 | 5/5 children exited 1; sweep printed `ALL MUTANTS CAUGHT: PASS` |
| `node tools/check_plugin_boot.js` | 0 | 42 plugin files exist; log section skipped (`allowEmptyLog: true`) |
| `node tools/check_plugin_boot.js --self-test` | 0 | printed `Self-test PASSED` |

`game/game_runtime.log` is absent in this worktree. The default boot check prints `NOTE: game_runtime.log is empty or not yet generated (allowed by options).` and exits 0. These exits are the gate results. They are not the verdict. Section 4 is what a call of this bridge does, and section 5 is why the passing suite still misses the brief.

## 3. What already holds from attempt 1

Measured on the gate fixture (columns `(10,10)` stone/stone/soil/soil/air, `(11,10)` stone/stone/air/air/air, `(12,10)` stone/stone/soil/air/air), with the same mock shape the gate uses, `zMin` hardcoded to -16.

- Feed lengths 2, 0 and 1. Stone, air, wood, water and lava stay out. A sand/gravel column and a rubble column come in as horizon C, `loose: true`, `solidMassCp` 0, `looseMassCp` 300,000. Surface soil is O/A (bulk 3,750, porosity 4,500, field capacity 3,500, solid 187,500). Buried soil is B (bulk 4,750, porosity 3,800, field capacity 4,000, solid 237,500). Those numbers match `HORIZON_SPECS` in `soil.js`.
- `groundElevationProvider(11,10)` returned 164. `stratumTopElevationFt(0, 1)` is 164. `stratumAtElevationFt(164)` is `{z:0, s:2}`. `groundElevationProvider(50,50)` and `(999,999)` returned null.
- A quiet `tickArea` returned false, left `getTickCount()` at 0, and wrote no debug line.
- `interact:dug` on the fed `(10,10)` column set the O/A cell loose (`looseMassCp` 187,500, `solidMassCp` 0) and left `dirtySlope` holding `10,10,0,3`. The first working tick moved 29,412 cp onto a new engine cell `11,10,0,2`. A second working tick ran while the slope queue was still non-empty and added no further transfer. World total stayed 1,512,500 cp. Debug lines were `[DEUS_SimBridge] Mass tick N: before=1512500 cp, after=1512500 cp, delta=0`. Levels `(11,10)` became `stone,stone,soil,air,air`. One `soil:cascade` fired.
- `--mutant=no_mirror` exits 1 with `FAIL: DEUS_Levels stratum material updated to soil on receiving cell (11,10)` and `FAIL: Loose sediment cascade event recorded`. That pair watches the Levels strings.
- `--mutant=tick_when_quiet`, `--mutant=skip_provider`, and `--mutant=save_without_engine` each exit 1 on an assertion that reads engine or `World.state` state.
- `saveToWorldState` set `World.state.soil['0,0']` to the kernel JSON and `World.state.soilSchemaVersion` to 1. Reload restored the total.
- `DEUS_World.js` assigns `contents.ufWorld = World.state` (the same object). A wrapper that then sets `state.soil` still has that property on `contents.ufWorld`. The assignment order in `DEUS_SimBridge.js` is safe once the plugin actually loads after `DEUS_World`.
- `setStratumMaterial` in `DEUS_Levels.js` (lines 4928–4953) copies raw material bytes, keeps `M_BUILT` on the edited stratum when it was constructed, and passes the existing HP array into `setStrata`. The gate never loads `DEUS_Levels.js`. Its mock implements a separate `setStratumMaterial`.
- `world:levelTileChanged` is parsed in the order `DEUS_World.js` emits it (`{x:ax, y:ay, z}`, cell x, cell y, layer, tileId). The probe's emit of that order dirtied `12,10,0,0`.
- The boot check fails a listed name whose file is missing, fails `[CORE] Companion plugin DEUS_Bag NOT loaded`, and fails two `[CORE] Synchronously loaded companion plugin DEUS_Bag` lines. The self-test covers those three and an empty log.
- The writer diff stays inside the lane's allowed paths and does not edit engine core files. `node tools/test_soil_geomorphology.js` is still 136 passed, 0 failed.

## 4. What a play of this commit does

`feedColumnFromLevels` occurs once in `DEUS_SimBridge.js`, at its definition. Nothing in the plugin, `Scene_Map.prototype.update`, or a world-load listener calls it. `world:created` is not hooked. An `interact:dug` on an engine that was never fed leaves `strata.size === 0`, `getHighestStratumAt` null, and one dirty id `x,y,0,0`. The next `tickArea` visits that missing id and moves 0 cp.

`game/js/plugins.js` lists 42 active plugins. `DEUS_Levels` ends at line 244. The next entry is `DEUS_Ownership`. `DEUS_SimBridge` is not in the list, so the `DataManager`, `Scene_Map`, `UF.Events`, and `UF.Look` hooks inside the plugin IIFE do not run in a normal boot. `loadSoilKernel` reaches the kernel only through `require`. The source contains no `PluginManager.loadScript`. A plugins.js script-tag load does not define `__dirname`; the paths that work in `node tools/test_soil_bridge.js` are the CommonJS `__dirname` and `process.cwd()/game/js/sim/...`.

`getTickFrames` reads `$ufWorldCatalog.soil.tickFrames` and otherwise returns 10. The catalog's root object has no `soil` key (`catalog.soil` is undefined). The only `"soil"` object in the file is an art pattern. `editor_edits.patch` would add `"soil": { "tickFrames": 10 }` at the root and would insert the plugin object after line 244. Neither edit is in the tree. The frame counter sits on `Scene_Map.prototype.update`. It does not call `UF.Time.schedule`, and it does not pass `domain: "action"`. The words `domain: "action"` appear in comments.

## 5. Defects

### D1. The area is never fed, so the bridge the player would run is empty

The brief's first behavior is: for each column in the active area, build `SoilStratum` records from `DEUS_Levels` and tick those. The plugin creates an engine the first time `getEngine` runs and never fills it. The gate calls `feedColumnFromLevels` itself, then loosens a cell by emitting `interact:dug`. That is why section 3 has a cascade. A boot of this commit does not make that call.

A fed column also treats "highest stratum in the engine" as the ground surface. Rock is correctly left out of the mass, and it is also left out of the column. A stack whose materials are soil then stone is fed as one O/A cell at s=0. `getHighestStratumAt` then returns that soil, because the stone lid was never added, and `processSlopeStability` will shed it. The world's surface and the kernel's surface disagree on any column where rock sits above soil or loose fill.

### D2. The cascade event and the Levels mirror describe the arrival only

On the measured dig, the only `soil:cascade` payload was:

```text
{ x: 11, y: 10, z: 0, s: 2, massCp: 29412, toX: 11, toY: 10 }
```

`x,y` and `toX,toY` are the cell that gained mass. The source `(10,10)` is not in the event. The brief's payload is `{x, y, z, s, massCp, toX, toY}` for a move from one column to another.

Levels `(10,10)` stayed `stone,stone,soil,soil,air` after 29,412 cp left it. The mirror writes the arrival with `setStratumMaterial(..., "soil")` and writes `air` only when that stratum's loose mass and solid mass are both 0 (`DEUS_SimBridge.js` lines 304–327). A partial slide does not lower the source code. Sand, gravel and rubble arrivals are stored as the material key `soil`.

`levels:strataDestroyed` is emitted as one object, `{ area, x, y, z, stratum, material, ... }` (`DEUS_Levels.js` lines 2047–2050). The same shape is what `DEUS_Levels.js` line 6236 listens for (`e.z`, `e.x`, `e.stratum`). The bridge listens for `(destroyedArray, area)` and returns unless the first argument is an array (`DEUS_SimBridge.js` lines 457–464). The probe's object payload left `dirtySlope` empty. The same probe's array payload, which the game does not emit, set the dirty bit. The doc's section 4 repeats the array signature.

### D3. `UF.Look` callers do not read the wrapped function

`getSoilInfo` on a fed sand cell returned horizon C, moisture 0 bp, loose 300,000 cp, solid 0 cp, slope Stable. After the plugin wrapped `UF.Look.cellAt`, `Look.cellAt(10,10)` returned text `Meadow · Soil: C · Moist: 0bp · Loose: 300000cp · Solid: 0cp · Slope: Stable`.

`Look.inspect` and `Look.describeCell` do not call `Look.cellAt`. They call the `cellAt` closed over inside `DEUS_Look.js` (inspect at lines 408–417, local `cellAt` at line 335, export at line 565). The probe's `describeCell` stayed `["Oak", "Meadow", "art"]` and `inspect` stayed the same three lines. `DEUS_Ownership.js` hooks `describeCell` and `inspect` because those are the functions `Look.show` and `DEUS_Interact.js` `infoLines` use.

The cursor sprite does not read `describeCell` either. `Sprite_UFLookTip.update` (line 460) passes `nameAt` to `setTip`, and `setTip` (lines 480–486) keeps only the first clause of line 0, split on ` · `. A soil clause appended after ` · ` would be dropped on the way to the screen. `slopeStatus` is the string `Active` when the single global `lastCascadeEvent` destination equals the cell, and `Stable` otherwise. The last cascade's mass and source are not on the line.

`UF_Sheet` is untouched, which matches the brief.

### D4. `double_load` is still a check the test fails by hand

`MUTANTS.double_load` is not read by `loadSoilKernel`. The gate does this (`tools/test_soil_bridge.js` lines 276–280):

```javascript
if (SimBridge.MUTANTS.double_load) {
    check('Double load negative control caught duplicate companion load', false, '(MUTANT double_load active)');
} else {
    check('Double load negative control caught duplicate companion load', doubleLoadCaught);
}
```

`--mutant=double_load` exits 1 and prints `FAIL: Double load negative control caught duplicate companion load (MUTANT double_load active)`. The same run's boot-check call is given two `Synchronously loaded companion plugin DEUS_SimBridge` lines and reports the duplicate. That detection runs when the mutant is off as well, which is why the unmutated suite passes Test 7. Turning the flag on does not load the plugin twice. It forces the assertion false. The attempt-1 review named this exact block.

`check_plugin_boot.js` as a CLI passes `allowEmptyLog: true` (line 198). A missing log is a pass. `runChecks` on the real plugin list with `DEUS_Levels` removed from the array, and a one-line boot log that has no companion error, returned true. Deleting a name from `plugins.js` makes the check quieter. The self-test's missing-file case uses the mock name `DEUS_NonExistentPlugin_XYZ`. It does not edit `game/js/plugins.js`, and this worktree has no launch log for the check to read. The report's "0 boot errors" is this empty-log pass.

### D5. The Level 2 proof does not dig a bank, and the picture it names is not in the tree

`tools/test_package_proofs_ingame.js` lines 161–207 build two `SoilStratum` cells by hand: loose sand at `(px+1, py, s=2)` with 150,000 cp, and a full solid sand cell at `(px+2, py, s=0)`. It emits `interact:dug` on the foot cell. It does not call `digCell`. It then `markDirty` on the bank and calls `tickArea` once. The success check is `postCascadeMass === initialSoilMass`.

The same geometry, run on `GeomorphologyEngine` directly: steep surface 165.000 ft, floor surface 162.000 ft, difference 3.000 ft. `tan(34°) * 5` is 3.373 ft. `processSlopeStability` returned with `sedimentTransfers === 0`. Both cells kept their mass (150,000 and 300,000). The mass check passes when nothing moves. After that, the harness writes tile id 2816 into a 3×3 of `$dataMap.data` and screenshots. That paint is the visible change.

The comment says seed 1337. The suite never assigns a world seed. The report names `proof_pkg4_soil_before_dig.png` and `proof_pkg4_soil_after_cascade.png`. Neither file is under `art/review` or `AppData\Local\Temp\uf_snapshots\pkg_proofs\test_output`. The only package-4 image on disk is `art/review/package_proofs.proof_pkg4_soil_geomorphology.png`, 201,340 bytes, mtime 2026-09-29 13:03:44, SHA-256 `A5B0F7163FA2CFD2F82167840B8A45A1255A1C8B5DC5B2B0C29C32C663FB25B0`. That is the file attempt 1 already hashed, 37 minutes before commit `834aa2ee`.

I opened it. It is one Ground-level playtest frame: the colonist grid with green bars, the red banner and wooden chest near the middle, the oak on the lower right, the minimap reading explored 3%, speed 1×, and a BAG button. Beside the oak is a 3×3 block of near-black tiles, with a gray checker to its right. There is no UF.Look tooltip, no second frame, and no console. There is no playtest log of `getTotalMass().total` in this worktree.

The gate's own "200,000 cp sand bank" does not slide either. After the dig tick has already written `soil` at `(11,10)` s=2, Test 5 replaces stratum `10,10,0,3` with 200,000 cp of loose sand. That `addStratum` dropped the engine total from 612,500 cp to a different total, 654,412 cp, because the dug O/A cell (158,088 cp still on it) was replaced. The conservation loop starts after the replacement. Sand surface was 167.33 ft and the neighbor surface was 164.31 ft, difference 3.02 ft, under the 3.37 ft repose limit. The following ticks left `sedimentTransfers` at 1 (the earlier dig) and added no `soil:cascade`. `materials11[2] === "soil"` was already true. Test 5's mirror assertion passes because Test 4 moved 29,412 cp of dug topsoil, which is a real transfer, and the comment attributes it to the sand bank that stayed put.

### D6. The six YES lines and two doc sentences describe a session this commit does not contain

`tasks/NAT.04.01/lane-cf/REPORT.md` answers all six game-translation lines YES, including playable verification with seed 1337 and the two screenshots named in D5.

From this review:

- The soil kernel on main is still the Level 1 engine. This commit does not change it. The kernel suite still passes (136/0).
- `DEUS_SimBridge.js` can build a loose column, tick it, mirror an arrival, and round-trip `World.state.soil` when a test calls those methods. It is not registered, it does not feed an area, and its Look hook does not reach `describeCell`.
- Digging in the game emits `interact:dug` from `digCell` (`DEUS_Interact.js` line 262). The listener loosens a stratum only when that stratum is already in the engine.
- The save helper writes `World.state.soil` when called. The `DataManager` hook that would call it is installed only if the plugin file is evaluated during boot.
- The playtest evidence named in the report was not produced by this commit.

`docs/systems/DEUS_SimBridge.md` has six numbered sections. These sentences disagree with the file they describe: area init calls `feedColumnFromLevels` (nothing does); the kernel is loaded with `PluginManager.loadScript` (the plugin never calls it); `levels:strataDestroyed` is `(destroyed, area)` (the game emits one object); the Look hover shows the soil line (section 6). `docs/systems/UF_Levels.md` names `strataMaterialsAt`, `setStratumMaterial`, and `soilSchemaVersion = 1`. That schema sentence matches the helper. It does not match a save file from a boot that never loads the plugin.

The provider formula `(e + 1) * 2` matches the kernel when the world's `zMin` is -16, which is `DEUS_World.js` `Z_RANGES.default` and is what the gate mock hardcodes. `worldStrataElevationAt` counts strata from the world's own `zMin`. For `zMin = -4` (`Z_RANGES.test`) the index of z=0, s=1 is `(0 - (-4)) * 5 + 1 = 21`, and `(21 + 1) * 2` is 44 ft. The kernel top of that same floor is 164 ft. The suite never builds a world with `zMin` -4.

## 6. Resubmission

A passing resubmission needs the play path measured, not another passing print of the current suite.

1. On area load, and when a column's strata change, feed that column. Soil and loose material only, with the horizon specs section 3 measured. The stratum the kernel is willing to shed has to be the world's top solid stratum. A rock lid above soil has to keep that soil from being treated as the surface. Stone, air, wood, water and lava still do not become loose mass.
2. Register `DEUS_SimBridge` in `game/js/plugins.js` immediately after the `DEUS_Levels` object that ends at line 244, with the editor closed. `editor_edits.patch` already states that insertion. Put `soil.tickFrames` in `game/data/UF_WorldCatalog.json` itself. That file is an allowed path; the patch is not a substitute for the edit. Load `game/js/sim/geomorphology/soil.js` as a page script so `window.DEUS.Sim.Soil` exists before the plugin body runs. Tag the tick with `domain: "action"` (the `UF.Time.schedule` form the rest of the game uses, or the same tag on the timer the plugin actually arms), one call per `soil.tickFrames`, and only while that area's dirty queues are non-empty. Leave the `DEUS_Core.js` companion array alone.
3. `markDirty` on `interact:dug` and on `world:levelTileChanged`, using the cell and the level z the event carries. `levels:strataDestroyed` must handle the object `DEUS_Levels.js` emits, with `stratum` taken from that object. There is still no water-table emit in `DEUS_Fluid.js`; do not invent one.
4. Mirror the loose-mass change. The arrival's Levels material is the material that moved (sand stays sand). A source that lost mass has its loose stratum lowered in the same tick, including a partial departure. `soil:cascade` carries the source `(x, y, z, s)` and the destination `(toX, toY)` and the centipounds that moved. `soil:moisture` stays.
5. Hook `UF.Look.describeCell` and `UF.Look.inspect`, which are the functions `Look.show` and the interact menu call. The line shows kind, horizon, moisture basis points, loose cp, solid cp, and the last cascade. `setTip` keeps only the first clause of line 0, so a clause placed after ` · ` on the name does not reach the cursor. Leave `UF_Sheet` alone.
6. Delete the `if (MUTANTS.double_load) check(..., false)` branch. `double_load` fails because a boot log shows the same plugin taken through `require` and `loadScript`, using the `[CORE] Synchronously loaded companion plugin` line `DEUS_Core.js` writes. `no_mirror`, `tick_when_quiet`, `skip_provider`, and `save_without_engine` can stay on the assertions they already have. Split the gate so the 200,000 cp bank is steep enough to move, and the Levels assertion reads the bank's own transfer. The dig tick's 29,412 cp is a separate case. A save in the middle of a cascade, then load, then the remaining ticks, matches a run that was not saved.
7. `check_plugin_boot.js` passes on a real `game/game_runtime.log` from a launch of this branch. A missing log fails the default command. A registered plugin whose file is missing fails. Show that run. Removing a name from `plugins.js` is not the failure.
8. Level 2: record the seed and the cell. Dig one cell at the foot of a loose bank through `UF.Interact`, on a bank whose height difference is past the repose limit (the committed proof is 3.00 ft against 3.37 ft and moves 0 cp). Advance ticks. Capture before and after. The playtest log shows `getTotalMass().total` before and after. F8 has no errors. The picture comes from the Levels mirror, not from writing tile 2816 into `$dataMap.data`. The PNG already in `art/review` is the attempt-1 frame.
9. Where `zMin` is not -16, the provider returns kernel feet (`stratumTopElevationFt` of the floor), so `stratumAtElevationFt` names the band directly above that floor. The default world (`zMin` -16) already does this. The test-range world (`zMin` -4) must too.
10. Fill the six YES/NO lines from those runs. Make `DEUS_SimBridge.md` describe the code that shipped, including the real `levels:strataDestroyed` payload and the real load path.

VERDICT: FAIL
