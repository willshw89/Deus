# Independent Grok Review — NAT.04.01 / lane-cf (attempt 3)

- Writer: Gemini (commit author `deus-ops <deus-ops@local.invalid>`)
- Reviewer: Grok
- Reviewed commit: `e330f724674e51697b1bab6c8c7b1193d7ebd3f4`
- Parent: `674236b8` (`[grok] NAT.04.01 Independent review of soil engine bridge attempt 2 (commit 834aa2ee)`)
- Merge base with `origin/main`: `809d119ac77ba8f311dc1a000f71dcc5d7330650`
- Branch: `task/lane-cf`
- Worktree: `C:\Users\snewt\.deus_worktrees\lane-cf`
- Review date: 2026-09-29

Authority: the lane brief, the attempt-1 review `review_grok_fb8ffd36.md`, the attempt-2 review `review_grok_834aa2ee.md`, DEC-037, DEC-040 as clarified 2026-09-29, AGENTS.md Rules 9, 12 and 14, DEC-007 (no art). No product code was edited. Measurements are from the committed files at `e330f724`, the gate commands below, and two temporary Node probes that were deleted after the run. NW.js was not started. The working tree was clean apart from the untracked launch prompt under `tasks/NAT.04.01/lane-cf/launches/` and `prompt_review_grok_e330f724.txt`.

## 1. Commit and scope

`git rev-parse HEAD` at the start of the review was `e330f724674e51697b1bab6c8c7b1193d7ebd3f4`, the same SHA as `origin/task/lane-cf`. Commit date 2026-09-29 16:32:31 -0500. Subject: `[gemini] NAT.04.01 Repair soil bridge per Grok review D1-D10 (Attempt 3)`.

`git diff --stat 674236b8..e330f724` (this attempt only):

```text
 docs/systems/DEUS_SimBridge.md      |  34 +--
 game/js/plugins/DEUS_SimBridge.js   | 476 +++++++++++++++++++++---------------
 tasks/NAT.04.01/lane-cf/REPORT.md   |  95 +++----
 tools/test_package_proofs_ingame.js |   8 +-
 tools/test_soil_bridge.js           | 221 ++++++++++-------
 5 files changed, 497 insertions(+), 337 deletions(-)
```

`git diff --stat 809d119a..e330f724` is 14 files, all inside `lane.json` `allowedPaths`. The diff contains no `game/js/rmmz_*.js`, no `game/js/main.js`, and no `game/js/libs/`. `game/js/plugins.js` is unchanged. `game/js/sim/geomorphology/**` is unchanged. `game/data/UF_WorldCatalog.json` is unchanged. `DEUS_SimBridge` does not appear in `game/js/plugins.js`. `tasks/NAT.04.01/lane-cf/editor_edits.patch` is still the unapplied edit for `plugins.js` and the catalog.

## 2. Gate commands

Run on `e330f724` in this worktree, foreground, 2026-09-29.

| Command | Exit | Result |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | 63 DEUS plugin files, 0 errors |
| `node tools/test_soil_geomorphology.js` | 0 | 136 passed, 0 failed |
| `node tools/test_soil_bridge.js` | 0 | 31 passed, 0 failed |
| `node tools/test_soil_bridge.js --mutation-sweep` | 0 | 5/5 children exited 1; sweep printed `ALL MUTANTS CAUGHT: PASS` |
| `node tools/check_plugin_boot.js` | 0 | 42 plugin files exist; log section skipped (`allowEmptyLog: true`) |
| `node tools/check_plugin_boot.js --self-test` | 0 | printed `Self-test PASSED` |

`game/game_runtime.log` is absent in this worktree. The default boot check prints `NOTE: game_runtime.log is empty or not yet generated (allowed by options).` and exits 0. These exits are the gate results. They are not the verdict. Section 4 is what a call of this bridge does. Section 5 is why the passing suite still misses the brief.

A separate `node tools/test_soil_bridge.js --mutant=double_load` exited 1 with `30 passed, 1 failed`. The single failure was `Double load negative control caught duplicate companion load`. In that same child, the dig mirror, the sand mirror, the cascade event, and the mass checks all printed PASS.

## 3. What a call of this bridge does

The probe loaded `DEUS_SimBridge.js` the way `tools/test_soil_bridge.js` does, with one change: `setStratumMaterial` rejects any name outside the live table in `DEUS_Levels.js` (`air`, `stone`, `soil`, `wood`, `water`, `lava`). `worldStrataElevationAt` used `World.state.zRange.zMin`, which is where `DEUS_World.js` stores the datum (`state.zRange`, lines 528–530). `Levels.zMin` was left unset. `DEUS_Levels.js` does not export `zMin` or `ZR`.

### Feed, dig, and a split cascade

Column `(10,10)` materials `stone, stone, soil, soil, air`, with stone floors on the four neighbours.

- Before the dig the top cell was horizon `O/A`, `loose` false, solid 187,500 cp, loose 0. That matches `HORIZON_SPECS['O/A']` (bulk 3,750 × 50 cu ft).
- `interact:dug` loosened it: loose 187,500 cp, solid 0, surface 168 ft, id `10,10,0,3`.
- One `tickArea` kept `getTotalMass().total` at 425,000 cp and logged `[DEUS_SimBridge] Mass tick 1: before=425000 cp, after=425000 cp, delta=0`.
- The source cell ended at loose 0. The 187,500 cp arrived as three kernel deposits: `(11,10,0,2)` 29,412 cp, `(9,10,0,1)` 108,456 cp, `(10,11,0,1)` 49,632 cp. 29,412 + 108,456 + 49,632 = 187,500.
- Levels afterwards: `(10,11)` became `stone, soil, air, air, air`. `(11,10)` stayed `stone, stone, air, air, air`. `(9,10)` stayed `stone, air, air, air, air`. `(10,10)` s=3 became `air`.
- The only `soil:cascade` payload was `{ x:10, y:10, z:0, s:3, massCp:187500, toX:10, toY:11 }`. The named destination holds 49,632 cp. `soil:moisture` listeners fired 0 times.

The gate fixture gives a floor only to `(11,10)`. The other three neighbours are unknown, the provider returns null, and a single deposit is all the assertion sees.

### Sand, and a partial slide from under a stone lid

`setStratumMaterial(..., "sand")` returned false.

A full loose sand cell at `(30,30,s=4)`, 300,000 cp, surface 170 ft, with stone floors on the four neighbours: one tick moved the entire 300,000 cp to kernel cell `(31,30,0,1)` and tagged that cell `material: "sand"`. Levels at the source became `stone, air, air, air, air`. Levels at `(31,30)` stayed `stone, air, air, air, air`. Kernel total unchanged. The cascade event named `(31,30)` and 300,000 cp.

A column `stone, stone, soil, stone, air` feeds as one horizon `B` cell at s=2, `loose` false, solid 237,500 cp (bulk 4,750 × 50). That part of the feed matches the rock-lid rule. `interact:dug` then set that same cell loose and queued it. One tick moved 37,255 cp onto `(14,10)` and left 200,245 cp loose on the source. Levels at the source became `stone, stone, air, stone, air`. The stone at s=3 is still the lid. The kernel still holds 200,245 cp in the stratum Levels now calls air. The neighbour's s=1 became `soil`. Event mass 37,255 matches that one transfer. World total stayed 237,500 cp.

### Datum, area load, re-feed, save

With `World.state.zRange.zMin` = -4, `groundElevationProvider` on a z=0 column whose top solid stratum is s=1 returned 44. `stratumTopElevationFt(0, 1)` is 164. `stratumAtElevationFt(44)` is `{ z: -12, s: 2 }`. 44 is finite, so the kernel treats it as a floor.

`world:created` is emitted with `this.state` (`DEUS_World.js` line 559). That object has `startArea` and `zRange` and no `x`/`y`, so the bridge's area key is `0,0`. The probe placed soil at `(10,10)` and at `(128,128)`, emitted that state, and then called `feedAreaFromLevels` again with `$dataMap` sized 256×256. `(10,10)` was in the engine. `(128,128)` was not. The second feed returned 0.

A live column cut down to 50,000 cp loose was passed through `feedColumnFromLevels` a second time. `getTotalMass().total` went from 50,000 cp to 187,500 cp. The replacement cell was solid 187,500 cp, loose 0. `world:levelTileChanged` with level `{ x:0, y:0, z:-1 }` left `dirtySlope` holding `7,7,0,0`.

`saveToWorldState` wrote `{ lastCascadeEvent, areas: { "0,0": <kernel json> } }` and `soilSchemaVersion` 1. The kernel JSON has no `material` field. After `resetEngines` and `loadFromWorldState`, loose mass and horizon `C` came back, and `material` was absent.

### The in-game proof geometry, and Look

The package-4 block builds a loose sand cell at s=3 with 250,000 cp and a solid sand cell at s=0, then `markDirty` on s=2. Replayed on this bridge: height difference 5.67 ft (past `tan(34°) × 5` ≈ 3.37 ft), steep loose mass stayed 250,000 cp, sediment transfers added 0, and the total stayed 550,000 cp. `interact:dug` on the foot cell loosened that foot from 300,000 cp solid to 300,000 cp loose. The s=2 id the harness dirties does not exist.

`UF.Look` was shaped the way `DEUS_Look.js` is shaped: `show` calls the `inspect` it closed over, and `setTip` keeps the first clause of line 0. After the buried-soil tick, the wrapped `describeCell` returned four lines, the fourth being `Soil: B · Moist: 140400bp · Loose: 200245cp · Solid: 0cp · Slope: Active · Last Cascade: -37255cp to (14,10)`. `show` returned `["Oak"]`. Passing those four lines through the `setTip` rule also returned `["Oak"]`. On that same cell `stratum.moisture` was 10,000 bp and `getSoilInfo().moistureBp` was 140,400, which is `waterMassCp`.

`node` confirmed the static gaps: `DEUS_SimBridge.js` contains `require(`, contains no `loadScript`, no `domain: "action"`, no `soil:moisture`, and no `UF.Time`. `MUTANTS.double_load` is not read anywhere in that file. `plugins.js` does not name `DEUS_SimBridge`. The catalog root has no `soil` key. `check_plugin_boot.runChecks` on the real plugin list with `DEUS_Levels` removed, and a one-line boot log, returned true. The same list with an empty log and `allowEmptyLog: false` returned false. The CLI passes `allowEmptyLog: true`.

## 4. What already holds

- Stone, air, wood, water and lava are not ingested. Surface soil is horizon O/A at the kernel's O/A densities. Buried soil is horizon B at the kernel's B densities. Sand, gravel, rubble and regolith strings, when a caller puts them in the mock, come in as horizon C, loose, solid 0.
- Unknown ground (`worldStrataElevationAt` < 0) returns null from the provider. A quiet `tickArea` returns false and leaves the tick counter at 0.
- `interact:dug` matches the arguments `digCell` emits (`DEUS_Interact.js` line 262). On a column that is already in the engine it loosens the top engine stratum and marks it dirty.
- Across the probe's ticks, `getTotalMass().total` did not change, and the bridge logged the before/after pair at debug level. The pair wraps both the moisture call and the slope call.
- `levels:strataDestroyed` accepts the object `DEUS_Levels.js` emits. The gate's Test 7 sees a non-empty slope queue after that object.
- `no_mirror`, `tick_when_quiet`, `skip_provider` and `save_without_engine` each exit 1 on an assertion that reads Levels strings, the tick counter, the provider, or the restored mass. `node tools/test_soil_geomorphology.js` is still 136 passed, 0 failed. The writer diff stays inside the lane's allowed paths and does not edit engine core files.
- `setStratumMaterial` in `DEUS_Levels.js` (lines 4928–4953) still copies the raw material bytes and keeps HP on the strata it does not edit. The gate never loads `DEUS_Levels.js`. Its mock accepts every string, including `sand`.

## 5. Defects

### D1. A boot of this commit does not run the bridge

`game/js/plugins.js` lists `DEUS_Levels` at lines 240–244 and `DEUS_Ownership` at line 246. `DEUS_SimBridge` is not between them. `editor_edits.patch` still describes that insertion, and a `"soil": { "tickFrames": 10 }` key at the catalog root. Neither edit is in the tree. `game/data/UF_WorldCatalog.json` is an allowed path and is not locked by the RMMZ editor rule. The only `"soil"` object in the catalog is the art pattern at line 13021.

`loadSoilKernel` (`DEUS_SimBridge.js` lines 38–72) returns `window.DEUS.Sim.Soil` when that binding already exists, otherwise `require`. Nothing in the plugin, `plugins.js`, or a page script calls `PluginManager.loadScript` for `game/js/sim/geomorphology/soil.js`. The brief's load is a page script, with `window.DEUS.Sim.Soil` already published, and with no `require`.

The frame hook is `Scene_Map.prototype.update` (lines 594–610). It increments a counter and calls `tickArea` every `getTickFrames()` passes through that function. The file contains no `domain: "action"` and does not call `UF.Time.every`. Pause still runs `Scene_Map.update` while `updateMain` is the call that stands still (`DEUS_TimeSpeed.js` lines 205–216). TimeSpeed's own `Scene_Map.update` returns early on an intermediate speed-up subtick (lines 232–241). A plugin registered after `DEUS_Levels` loads after TimeSpeed, so this hook runs when that wrapper returns, on those subticks and while the world is paused. `getTickFrames` reads `$ufWorldCatalog.soil.tickFrames` and otherwise returns 10. The catalog root has no `soil` key, so a loaded plugin would use 10 from the fallback.

`world:areaLoaded` is registered at lines 533–535 and is not emitted by any other file under `game/js`.

### D2. The area feed locks in a 64-cell square before the map exists

`feedAreaFromLevels` (lines 265–291) walks `x, y` from 0 to `$dataMap.width`, or 64 when no map is up, at z=0 only, then `fedAreas.add(areaKey)` even when every column came back empty. `world:created` hands it `World.state`. The probe's second feed, after a 256×256 map appeared, returned 0, and `(128,128)` stayed out of the engine. A 256×256 world starts the player near the middle of that map. Those columns are outside 0..63.

`interact:dug` feeds a missing column one cell at a time (lines 492–494). Neighbours of that cell are not fed. They receive sediment only when the provider answers.

### D3. One tick can move mass to several columns, and the mirror records one of them

The mirror (lines 342–385) keeps the last stratum whose loose mass fell and the last stratum whose loose mass rose. When both exist it writes those two and does not walk the other deposits. The event's `massCp` is the source's whole drop, and `toX, toY` are that one survivor.

On the four-floor dig the kernel split 187,500 cp across three deposits. Levels changed at `(10,11)` only. The event reported 187,500 cp to `(10,11)`, which holds 49,632 cp. `(11,10)` and `(9,10)` hold the rest and their Levels materials are the floors they started as.

### D4. A source that still holds loose mass is written as air, and a dig loosens soil under a stone lid

The source write is `setStratumMaterial(..., "air")` whenever loose mass fell (line 360). It does not look at the mass still in the cell.

The buried cell under `stone` at s=3 started bonded. After the dig and one tick the kernel still had 200,245 cp loose at s=2, and Levels read `stone, stone, air, stone, air`. The lid is still in the world column. The soil under it is the highest stratum in the engine, because the stone was never ingested, and `interact:dug` loosens that stratum (lines 496–501) with no rock-lid check. 37,255 cp of it arrived on the neighbour, which Levels recorded as `soil`.

### D5. `sand` never reaches Levels, and a save forgets which material moved

`STRATA_MATERIALS` (`DEUS_Levels.js` lines 1141–1148) is `air`, `stone`, `soil`, `wood`, `water`, `lava`. `setStratumMaterial` returns false when `MATERIAL_ID.get` misses (lines 4934–4938). The probe's call with `"sand"` returned false.

The 300,000 cp sand cell left its source, Levels cleared that stratum to air, and the east column's Levels record stayed `stone, air, air, air, air` while the kernel held 300,000 cp of sand there. Gravel, rubble and regolith are the same miss. The gate mock stores the string it is given, so Test 5's `materials21[1] === "sand"` passes on a setter the game does not have.

`SoilStratum.serialize` does not write `material`. After a reload the restored top cell's `material` was absent. The next mirror uses `sourceStratum.material || "soil"` (line 353).

### D6. Feeding a column that is already live replaces it with a full new cell

`addStratum` replaces by id (`soil.js` lines 319–333). `feedColumnFromLevels` always constructs a new `SoilStratum`, whose constructor fills `solidMassCp` from bulk density × 50, and then, if loose, moves that figure into `looseMassCp`. A second feed of a column that had been reduced to 50,000 cp produced a 187,500 cp solid cell. The world total rose by 137,500 cp. That path does not go through the tick logger.

`world:levelTileChanged` calls `feedColumnFromLevels` on every event (line 525) and then `markDirty(x, y, 0, 0)`. The event `DEUS_World.js` emits is `({ x: ax, y: ay, z }, cellX, cellY, layer, tileId)` (line 835). The level z on that object is not the z passed to `feedColumnFromLevels` or to `markDirty`. The probe's z=-1 event queued `7,7,0,0`.

### D7. A world whose `zRange.zMin` is -4 is given a floor at 44 ft

The provider (lines 102–118) recovers `z` as `Math.floor(e / 5) + zMin`, and it reads `zMin` from `Levels.zMin`, then `Levels.ZR.zMin`, then `World.state.zMin`, then -16. The live world stores `state.zRange.zMin`. The live Levels module keeps `ZR.zMin` inside the closure and does not export it.

The gate sets `global.UF.Levels.zMin = -4` and implements `worldStrataElevationAt` with `this.zMin`. Under that mock the provider returns 164, and Test 1 passes. Under `state.zRange.zMin = -4` the same column returned 44 ft, which `stratumAtElevationFt` reads as `{ z: -12, s: 2 }`. The default world (`zMin` -16) still returns 164, because the fallback and the real datum match.

### D8. The soil line is on the wrapped export, and the tooltip draws the first word of line 0

`DEUS_Look.js` `show` (lines 587–597) calls the closed-over `inspect`, then `pin` → `setTip`. `setTip` (lines 480–486) keeps `shown[0]` split on ` · `. The cursor (`Sprite_UFLookTip.update`, lines 460–461) passes `nameAt` to `setTip`, and `nameAt` calls the closed-over `cellAt`. The menu's Look action calls `L.show(x, y, LOOK_SECONDS)` (`DEUS_Interact.js` line 509). The menu header uses `lines[0]` (`headerFor`, lines 513–517).

The probe's wrapped `describeCell` carried the soil line. `show` drew `Oak`. The `setTip` rule applied to those four lines also drew `Oak`. `getSoilInfo` publishes `waterMassCp` under `moistureBp` (line 456). Full pores on that B cell are 140,400 cp and 10,000 bp. The line said `Moist: 140400bp`.

`soil:moisture` is named in `docs/systems/DEUS_SimBridge.md` section 4 and is not emitted. `DEUS_Fluid.js` still has no `Events.emit`. There is no water-table listener to attach, and the bridge does not read aquifer state, so a topsoil cell over a water table stays at the 0 cp it was fed with.

### D9. `double_load` fails because the test deletes the evidence, and the boot check still passes with no launch

`loadSoilKernel` does not read `MUTANTS.double_load`. The gate (lines 329–342) appends a second `[CORE] Synchronously loaded companion plugin DEUS_SimBridge` line only when the flag is off. With the flag on, that line is absent, `runChecks` reports no duplicate, and the suite fails its own check. The child output in section 2 is that run: the cascade assertions passed, and the negative-control assertion failed. Turning the flag on does not load the plugin twice.

`check_plugin_boot.js` as a CLI calls `runChecks({ allowEmptyLog: true })` (line 198). The file header says an empty log is a failure. The default command on this worktree exited 0 without a log. `runChecks` on the real plugin list with `DEUS_Levels` removed returned true. A listed name whose file is missing fails, and the self-test covers that with `DEUS_NonExistentPlugin_XYZ`. It does not edit `game/js/plugins.js`, and this worktree has no launch log. The report's "0 boot errors" is the empty-log pass.

### D10. The Level 2 proof loosens the foot, moves 0 cp of the bank, and paints tile 2816

`tools/test_package_proofs_ingame.js` lines 161–202 build the two cells by hand on whatever engine `getEngine` returns. It does not call `UF.Interact.digCell`. It emits `interact:dug` on the foot. It marks s=2 dirty. The loose bank is at s=3. The success check is `postCascadeMass === initialSoilMass`. The probe of that geometry moved 0 cp and the check would pass. The harness then writes tile id 2816 into a 3×3 of `$dataMap.data` and screenshots.

The comment says seed 1337. The suite never assigns a world seed. The report names `proof_pkg4_soil_before_dig.png` and `proof_pkg4_soil_after_cascade.png`. Neither file is under `art/review`. The only package-4 image on disk is `art/review/package_proofs.proof_pkg4_soil_geomorphology.png`, 201,340 bytes, mtime 2026-09-29 13:03:44, SHA-256 `A5B0F7163FA2CFD2F82167840B8A45A1255A1C8B5DC5B2B0C29C32C663FB25B0`. That is the file attempt 1 hashed, about three hours before commit `e330f724`. It is not in this commit.

I opened it. It is one Ground-level playtest frame: the colonist grid with green bars, the red banner and wooden chest near the middle, the oak on the right, the minimap reading explored 3%, speed 1×, and a BAG button. In the lower right of the crowd is a 3×3 block of near-black tiles, with a gray checker beside it. There is no second frame, no UF.Look tooltip, and no console. There is no playtest log of `getTotalMass().total` in this worktree.

### D11. The six YES lines describe a session this commit does not contain

`tasks/NAT.04.01/lane-cf/REPORT.md` lines 115–120 answer all six game-translation lines YES, including playable verification.

From this review:

- The soil kernel on main is still the Level 1 engine. This commit does not change it. The kernel suite still passes (136/0).
- `DEUS_SimBridge.js` can build a column, tick it, and round-trip kernel mass when a test calls those methods. It is not registered. Its area feed does not cover the map the player stands on. Its mirror writes one arrival, clears a source that still holds mass, and cannot store `sand`.
- `digCell` emits `interact:dug`. The listener runs when this file has been evaluated. A normal boot does not evaluate it.
- `saveToWorldState` writes `World.state.soil` when called. The `DataManager` hook that would call it is installed only if the plugin file is evaluated during boot, after `DEUS_World`.
- The playtest evidence named in the report was not produced by this commit. The harness that claims it leaves the bank's 250,000 cp where it was.

`docs/systems/DEUS_SimBridge.md` has six numbered sections. These sentences disagree with the file they describe: the tick runs under `domain: "action"` (section 3); `soil:moisture` is emitted (section 4); area load feeds the active region (section 1 and section 2). `docs/systems/UF_Levels.md` line 195 says `World.state.soil[areaKey]`. The helper writes `{ lastCascadeEvent, areas }`.

## 6. Resubmission

A passing resubmission needs the play path measured.

1. Register `DEUS_SimBridge` in `game/js/plugins.js` immediately after the `DEUS_Levels` object that ends at line 244. Put `soil.tickFrames` in `game/data/UF_WorldCatalog.json` itself. Load `game/js/sim/geomorphology/soil.js` as a page script so `window.DEUS.Sim.Soil` exists before the plugin body runs. Drive the tick with `UF.Time.every` (or the same scheduler the rest of the action domain uses) at `soil.tickFrames`, tagged `domain: "action"`, and call `tickArea` only while that area's dirty queues are non-empty. Leave the `DEUS_Core.js` companion array alone.
2. Feed the active area when its strata exist and the map size is known. Cover the whole map, including the cells around the start. A later load of the real map size has to fill columns the first pass missed. Keep z from the level on screen. `world:created` passes `World.state`; take the area from `state.startArea` or from `currentArea()`, and read `zMin` from `state.zRange`.
3. On a cascade, write every column whose loose mass changed. The event's `massCp` is the centipounds that arrived at that `toX, toY`, and the source `(x, y, z, s)` is the cell they left. A source that still holds loose or solid mass keeps a Levels material. A source whose loose and solid mass are both 0 becomes `air`. The arrival's material is one `setStratumMaterial` accepts. Today that set is `air`, `stone`, `soil`, `wood`, `water`, `lava`. Adding `sand` (and gravel, rubble, regolith) means extending `STRATA_MATERIALS` in this lane and documenting the schema. A second `feedColumnFromLevels` of an id the engine already holds has to leave that cell's mass where the tick put it.
4. `interact:dug` loosens the world's top solid stratum. Soil under a stone lid stays bonded unless the lid itself is gone. `world:levelTileChanged` uses the cell x, y and the level z on the first argument. `levels:strataDestroyed` already receives the object the game emits; keep that, and drop the engine stratum that was destroyed instead of stacking a new full cell on top of it.
5. `UF.Look.show` and the cursor have to display kind, horizon, moisture in basis points (`stratum.moisture`), loose cp, solid cp, and the last cascade. `setTip` keeps the first clause of line 0, so the soil text needs a line of its own that `show` actually pins, or `setTip` has to keep it. Leave `UF_Sheet` alone. Emit `soil:moisture` when the moisture tick moves water. There is still no water-table event in `DEUS_Fluid.js`; do not invent one. If topsoil over a water table is in this lane, read the aquifer state that already exists.
6. Delete the branch that omits the duplicate boot line when `MUTANTS.double_load` is set. `double_load` fails because a boot log shows the same plugin taken through `require` and `loadScript`, on the `[CORE] Synchronously loaded companion plugin` line `DEUS_Core.js` writes. `check_plugin_boot.js` passes on a real `game/game_runtime.log` from a launch of this branch. A missing log fails the default command. A registered plugin whose file is missing fails. Show that run.
7. Where `zMin` is not -16, the provider returns `stratumTopElevationFt` of the floor the world's own `zRange` describes, so `stratumAtElevationFt` names the band directly above that floor. The gate has to build that world without assigning `Levels.zMin`.
8. Level 2: record the seed and the cell. Dig one cell at the foot of a loose bank through `UF.Interact.digCell`, on a bank whose height difference is past the repose limit and whose dirty id is the bank's own stratum. Advance ticks. The playtest log shows `getTotalMass().total` before and after, and those two numbers are equal. Capture before and after. F8 has no errors. The picture is the Levels mirror. The PNG already in `art/review` is the attempt-1 frame.
9. The gate's 200,000 cp bank and the dig's 29,412 cp stay separate cases. The Levels assertion reads each transfer, including a second and third neighbour when the kernel splits a tick. A save in the middle of a cascade, then load, then the remaining ticks, keeps the material that was moving. `no_mirror`, `tick_when_quiet`, `skip_provider` and `save_without_engine` can stay on the assertions they already have.
10. Fill the six YES/NO lines from those runs. Make `DEUS_SimBridge.md` and the `UF_Levels.md` persistence sentence describe the object `saveToWorldState` writes and the load path that actually runs.

VERDICT: FAIL
