# Symbol coupling inventory (ORG-0.3)

Generated at 2026-10-03T05:17:48.186Z by `scratchpad/lane-plugin-audit/caller_index.js`.
This file is the caller index. `scan_summary.txt` consumers are filename-oriented and are not this index.
Search roots: `game/js` except `game/js/libs`, `tools`, and `archive`. Scanned JS files: 1337. Skipped larger than 2 MB: none.
A hit is a bounded identifier on the code projection. Comments, strings, and regex text are excluded. Archive hits are historical files, not this branch's live `game/` load. Tool hits are test or tool consumers.
A name with no external code hit is `no-call-found-after-defined-search`. That is not a dead-file label. Dynamic `UF[` / `DEUS[` or `window["UF"]` sites are unresolved and block a proof of absence.
Dynamic bracket sites found (capped at 40): game/js/plugins/DEUS_History.js:219.
Loader rows are quoted plugin ids in non-comment text. They are load edges, not symbol callers.

## DEUS_Anim.js

Source lines: 2716.
Exports:
- `UF.Anim` at game/js/plugins/DEUS_Anim.js:1813
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Anim.js:1811
- namespace object `window/root.UF` at game/js/plugins/DEUS_Anim.js:1812
Engine prototype patches:
- `Sprite_Character.prototype.update` at game/js/plugins/DEUS_Anim.js:706
- `Sprite_Character.prototype.updateCharacterFrame` at game/js/plugins/DEUS_Anim.js:729
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Anim.js:1404
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Anim.js:1412
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Anim.js:1506
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_Anim.js:1707
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Anim.js:1816
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Sprite_Character.prototype.update` saved to `_Sprite_Character_update` at game/js/plugins/DEUS_Anim.js:705
- `Sprite_Character.prototype.updateCharacterFrame` saved to `_Sprite_Character_updateCharacterFrame` at game/js/plugins/DEUS_Anim.js:728
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Anim.js:1403
- `Spriteset_Map.prototype.update` saved to `_Spriteset_Map_update` at game/js/plugins/DEUS_Anim.js:1411
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Anim.js:1505
- `Scene_Map.prototype.start` saved to `_Scene_Map_start` at game/js/plugins/DEUS_Anim.js:1706
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Anim.js:1815
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Anim.js:1121
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:unitAdded"` at game/js/plugins/DEUS_Anim.js:1702
- `on` `"world:unitImageChanged"` at game/js/plugins/DEUS_Anim.js:1703
Classes:
- `AnimLayer` at game/js/plugins/DEUS_Anim.js:1194
Named functions at brace depth 0 or 1 (capped at 40):
- `report` at game/js/plugins/DEUS_Anim.js:142
- `sidecar` at game/js/plugins/DEUS_Anim.js:153
- `objectSidecar` at game/js/plugins/DEUS_Anim.js:177
- `unitInfo` at game/js/plugins/DEUS_Anim.js:189
- `forgetInfos` at game/js/plugins/DEUS_Anim.js:231
- `refreshIndex` at game/js/plugins/DEUS_Anim.js:243
- `play` at game/js/plugins/DEUS_Anim.js:274
- `carrying` at game/js/plugins/DEUS_Anim.js:287
- `geoOf` at game/js/plugins/DEUS_Anim.js:296
- `pickUnit` at game/js/plugins/DEUS_Anim.js:316
- `faceCastTarget` at game/js/plugins/DEUS_Anim.js:423
- `rmmzPick` at game/js/plugins/DEUS_Anim.js:431
- `setBodyFrame` at game/js/plugins/DEUS_Anim.js:443
- `equippedType` at game/js/plugins/DEUS_Anim.js:459
- `toolHelps` at game/js/plugins/DEUS_Anim.js:476
- `jobTool` at game/js/plugins/DEUS_Anim.js:487
- `fileExists` at game/js/plugins/DEUS_Anim.js:512
- `layerSheet` at game/js/plugins/DEUS_Anim.js:527
- `usableLayer` at game/js/plugins/DEUS_Anim.js:541
- `wantedLayers` at game/js/plugins/DEUS_Anim.js:553
- `syncLayers` at game/js/plugins/DEUS_Anim.js:578
- `arrange` at game/js/plugins/DEUS_Anim.js:647
- `releaseLayers` at game/js/plugins/DEUS_Anim.js:655
- `inertTimer` at game/js/plugins/DEUS_Anim.js:674
- `stopCombatMotion` at game/js/plugins/DEUS_Anim.js:684
- `stepUnits` at game/js/plugins/DEUS_Anim.js:736
- `objectInfo` at game/js/plugins/DEUS_Anim.js:783
- `objectState` at game/js/plugins/DEUS_Anim.js:830
- `objectGeo` at game/js/plugins/DEUS_Anim.js:854
- `registryOf` at game/js/plugins/DEUS_Anim.js:869
- `animOf` at game/js/plugins/DEUS_Anim.js:885
- `track` at game/js/plugins/DEUS_Anim.js:891
- `untrack` at game/js/plugins/DEUS_Anim.js:918
- `stepObjects` at game/js/plugins/DEUS_Anim.js:933
- `wrapObjectLayer` at game/js/plugins/DEUS_Anim.js:988
- `sheetRect` at game/js/plugins/DEUS_Anim.js:1042
- `remainsBitmap` at game/js/plugins/DEUS_Anim.js:1055
- `animState` at game/js/plugins/DEUS_Anim.js:1071
- `remainsHours` at game/js/plugins/DEUS_Anim.js:1079
- `nowMinutes` at game/js/plugins/DEUS_Anim.js:1085
- 20 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.Anim` (export, this file :1813):
  - plugin game/js/plugins/DEUS_Culling.js:136 (1 code hit; lines 136)
  - plugin game/js/plugins/DEUS_Fire.js:674 (2 code hits; lines 674,1597)
  - plugin game/js/plugins/DEUS_Sheet.js:3038 (1 code hit; lines 3038)
  - plugin game/js/plugins/DEUS_World.js:3952 (3 code hits; lines 3952,3973,3989)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:1795 (1); archive/plugins_uf_pre_rename/UF_Fire.js:535 (2); archive/plugins_uf_pre_rename/UF_Sheet.js:2081 (1); archive/plugins_uf_pre_rename/UF_Skills.js:1013 (1); archive/plugins_uf_pre_rename/UF_World.js:2489 (3); archive/plugins/DEUS_Skills.js:1014 (1)
- `AnimLayer` (class, this file :1194):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:1180 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:175 quotes `DEUS_Anim`
- tool tools/diagnose_hotspots.js:36 quotes `DEUS_Anim.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Anim`
- tool tools/test_all_animated_objects_live.js:91 quotes `DEUS_Anim.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_AssetStreaming.js

Source lines: 47.
Exports:
- `UF.Assets` at game/js/plugins/DEUS_AssetStreaming.js:11 fallback (`||`)
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- `UF.Assets.backgroundLoad` at game/js/plugins/DEUS_AssetStreaming.js:17
- `UF.Assets.unload` at game/js/plugins/DEUS_AssetStreaming.js:34
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- `UF.Assets` (export, fallback at :11): callers of this name are indexed under game/js/plugins/DEUS_Look.js:624. Also assigned or declared in game/js/plugins/DEUS_Look.js:624. A hit names the identifier; it does not prove which assignment ran. Not labeled dead.
Unqualified property names (length >= 10; may be a different binding):
- `backgroundLoad` from `UF.Assets.backgroundLoad` at :17: no-call-found-after-defined-search outside this file. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:6 quotes `DEUS_AssetStreaming`

## DEUS_Bag.js

Source lines: 743.
Exports:
- `UF.Window_UFBag` at game/js/plugins/DEUS_Bag.js:703
- `UF.Sprite_UFBagButton` at game/js/plugins/DEUS_Bag.js:704
- `UF.Bag` at game/js/plugins/DEUS_Bag.js:706
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Bag.js:34
- namespace object `window/root.UF` at game/js/plugins/DEUS_Bag.js:35
Engine prototype patches:
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_Bag.js:576
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Bag.js:586
- `Scene_Map.prototype.processMapTouch` at game/js/plugins/DEUS_Bag.js:652
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Scene_Map.prototype.createAllWindows` saved to `_Scene_Map_createAllWindows` at game/js/plugins/DEUS_Bag.js:575
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Bag.js:585
- `Scene_Map.prototype.processMapTouch` saved to `_Scene_Map_processMapTouch` at game/js/plugins/DEUS_Bag.js:651
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Bag.js:491
- `TouchInput.x` saved to `mx` at game/js/plugins/DEUS_Bag.js:561
- `TouchInput.y` saved to `my` at game/js/plugins/DEUS_Bag.js:562
- `TouchInput.x` saved to `dropX` at game/js/plugins/DEUS_Bag.js:606
- `TouchInput.y` saved to `dropY` at game/js/plugins/DEUS_Bag.js:607
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `Window_UFBag` at game/js/plugins/DEUS_Bag.js:92
- `Sprite_UFBagButton` at game/js/plugins/DEUS_Bag.js:535
Named functions at brace depth 0 or 1 (capped at 40):
- `getActiveUnit` at game/js/plugins/DEUS_Bag.js:61
module.exports assignments: game/js/plugins/DEUS_Bag.js:740
Named consumers outside this file:
- `UF.Window_UFBag` (export, this file :703): no-call-found-after-defined-search. Not labeled dead.
- `UF.Sprite_UFBagButton` (export, this file :704): no-call-found-after-defined-search. Not labeled dead.
- `UF.Bag` (export, this file :706):
  - tool tools/test_creature_inventory_black_box.js:318 (2 code hits; lines 318,323)
  - tool tools/test_sack_ui_and_loose_items.js:63 (3 code hits; lines 63,69,70)
- `Window_UFBag` (class, this file :92):
  - tool tools/test_bag_and_racial_banners.js:193 (1 code hit; lines 193)
  - tool tools/test_sack_ui_and_loose_items.js:72 (1 code hit; lines 72)
- `Sprite_UFBagButton` (class, this file :535): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:93 quotes `DEUS_Bag`

## DEUS_Callings.js

Source lines: 407.
Exports:
- `UF.Callings` at game/js/plugins/DEUS_Callings.js:401
- namespace object `window/root.UF` at game/js/plugins/DEUS_Callings.js:400
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `slugify` at game/js/plugins/DEUS_Callings.js:112
- `decayRate` at game/js/plugins/DEUS_Callings.js:136
- `getWeights` at game/js/plugins/DEUS_Callings.js:145
- `sampleCallings` at game/js/plugins/DEUS_Callings.js:153
- `factionPopulation` at game/js/plugins/DEUS_Callings.js:184
- `assignCallings` at game/js/plugins/DEUS_Callings.js:205
- `callingIdOf` at game/js/plugins/DEUS_Callings.js:220
- `isLeader` at game/js/plugins/DEUS_Callings.js:227
- `isBuilder` at game/js/plugins/DEUS_Callings.js:233
- `isWoodcutter` at game/js/plugins/DEUS_Callings.js:238
- `isMiner` at game/js/plugins/DEUS_Callings.js:243
- `isHauler` at game/js/plugins/DEUS_Callings.js:248
- `isCook` at game/js/plugins/DEUS_Callings.js:253
- `isForager` at game/js/plugins/DEUS_Callings.js:258
- `isCrafter` at game/js/plugins/DEUS_Callings.js:263
- `isSmith` at game/js/plugins/DEUS_Callings.js:269
- `isSmelter` at game/js/plugins/DEUS_Callings.js:273
- `isTanner` at game/js/plugins/DEUS_Callings.js:277
- `isBowyer` at game/js/plugins/DEUS_Callings.js:281
- `isFletcher` at game/js/plugins/DEUS_Callings.js:285
- `isCarpenter` at game/js/plugins/DEUS_Callings.js:289
- `isMason` at game/js/plugins/DEUS_Callings.js:293
- `isPotter` at game/js/plugins/DEUS_Callings.js:297
- `isLeatherworker` at game/js/plugins/DEUS_Callings.js:301
- `assignFounderQuotas` at game/js/plugins/DEUS_Callings.js:306
module.exports assignments: game/js/plugins/DEUS_Callings.js:404
Named consumers outside this file:
- `UF.Callings` (export, this file :401):
  - plugin game/js/plugins/DEUS_Colonists.js:826 (5 code hits; lines 826,827,2822)
  - plugin game/js/plugins/DEUS_History.js:123 (6 code hits; lines 123,124,130)
  - plugin game/js/plugins/DEUS_World.js:1937 (1 code hit; lines 1937)
  - tool tools/test_callings_system.js:294 (1 code hit; lines 294)
  - tool tools/test_history_materialization_and_world_age.js:72 (3 code hits; lines 72,131,132)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Callings.js:401 (1); archive/plugins_uf_pre_rename/UF_Colonists.js:747 (5); archive/plugins_uf_pre_rename/UF_History.js:116 (4); archive/plugins_uf_pre_rename/UF_World.js:1065 (1); archive/plugins/DEUS_Callings.js:401 (1)
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:99 quotes `DEUS_Callings`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_Callings`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_Callings`
- tool tools/sim/test_underground_year0.js:31 quotes `DEUS_Callings`
- tool tools/society/test_person_identity.js:32 quotes `DEUS_Callings`
- tool tools/society/test_person_identity.js:262 quotes `DEUS_Callings.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_Callings`
- tool tools/test_native_survival_soak.js:70 quotes `DEUS_Callings.js`
- tool tools/test_new_game_year0.js:40 quotes `DEUS_Callings`
- tool tools/test_sim_tick.js:33 quotes `DEUS_Callings`
- tool tools/test_survival_regressions.js:73 quotes `DEUS_Callings.js`
- tool tools/test_volumetric_terrain_column.js:125 quotes `DEUS_Callings.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:37 quotes `DEUS_Callings`
- archive quotes omitted from the live list (2 hits)

## DEUS_Camera.js

Source lines: 623.
Exports:
- `UF.Camera` at game/js/plugins/DEUS_Camera.js:165
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Camera.js:163
- namespace object `window/root.UF` at game/js/plugins/DEUS_Camera.js:164
Engine prototype patches:
- `Game_Map.prototype.screenTileX` at game/js/plugins/DEUS_Camera.js:171
- `Game_Map.prototype.screenTileY` at game/js/plugins/DEUS_Camera.js:176
- `Game_Map.prototype.canvasToMapX` at game/js/plugins/DEUS_Camera.js:181
- `Game_Map.prototype.canvasToMapY` at game/js/plugins/DEUS_Camera.js:186
- `Game_CharacterBase.prototype.isNearTheScreen` at game/js/plugins/DEUS_Camera.js:192
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Camera.js:207
- `Spriteset_Map.prototype.updateUfZoom` at game/js/plugins/DEUS_Camera.js:212
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Camera.js:245
- `Scene_Map.prototype.updateCameraZoomInput` at game/js/plugins/DEUS_Camera.js:250
- `Scene_Map.prototype.updateScene` at game/js/plugins/DEUS_Camera.js:282
- `Scene_Map.prototype.createDisplayObjects` at game/js/plugins/DEUS_Camera.js:527
- `Scene_Map.prototype.isAnyWindowUnderMouse` at game/js/plugins/DEUS_Camera.js:536
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Camera.js:553
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_Map.prototype.screenTileX` saved to `_Game_Map_screenTileX` at game/js/plugins/DEUS_Camera.js:170
- `Game_Map.prototype.screenTileY` saved to `_Game_Map_screenTileY` at game/js/plugins/DEUS_Camera.js:175
- `Game_Map.prototype.canvasToMapX` saved to `_Game_Map_canvasToMapX` at game/js/plugins/DEUS_Camera.js:180
- `Game_Map.prototype.canvasToMapY` saved to `_Game_Map_canvasToMapY` at game/js/plugins/DEUS_Camera.js:185
- `Spriteset_Map.prototype.update` saved to `_Spriteset_Map_update` at game/js/plugins/DEUS_Camera.js:206
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Camera.js:244
- `Scene_Map.prototype.updateScene` saved to `_Scene_Map_updateScene` at game/js/plugins/DEUS_Camera.js:281
- `Scene_Map.prototype.createDisplayObjects` saved to `_Scene_Map_createDisplayObjects` at game/js/plugins/DEUS_Camera.js:526
- `Scene_Map.prototype.isAnyWindowUnderMouse` saved to `_Scene_Map_isAnyWindowUnderMouse` at game/js/plugins/DEUS_Camera.js:535
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Camera.js:552
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Camera.js:143
- `TouchInput.x` saved to `mx` at game/js/plugins/DEUS_Camera.js:447
- `TouchInput.y` saved to `my` at game/js/plugins/DEUS_Camera.js:448
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Camera.js:611
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `Sprite_UFZoomSlider` at game/js/plugins/DEUS_Camera.js:311
Named functions at brace depth 0 or 1 (capped at 40):
- `registerChecks` at game/js/plugins/DEUS_Camera.js:558
Named consumers outside this file:
- `UF.Camera` (export, this file :165): Also assigned or declared in game/js/plugins/DEUS_Culling.js:414, game/js/plugins/DEUS_Culling.js:527. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Anim.js:1896 (10 code hits; lines 1896,2021,2602,2657,2707)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:596 (2 code hits; lines 596)
  - plugin game/js/plugins/DEUS_Combat.js:2569 (10 code hits; lines 2569,2632,3134,3149,3184)
  - plugin game/js/plugins/DEUS_Culling.js:67 (5 code hits; lines 67,404,414,527)
  - plugin game/js/plugins/DEUS_DayNight.js:347 (3 code hits; lines 347,580)
  - plugin game/js/plugins/DEUS_Depth.js:89 (13 code hits; lines 89,94,99,104,759)
  - plugin game/js/plugins/DEUS_Fire.js:1062 (12 code hits; lines 1062,1409,1469,1744,1756,1772)
  - plugin game/js/plugins/DEUS_Fog.js:555 (11 code hits; lines 555,792,794,798,803)
  - plugin game/js/plugins/DEUS_History.js:3840 (6 code hits; lines 3840,3844,3856,3922)
  - plugin game/js/plugins/DEUS_Interact.js:971 (2 code hits; lines 971)
  - plugin game/js/plugins/DEUS_Items.js:1466 (13 code hits; lines 1466,1654,1674,1763,1781,1845)
  - plugin game/js/plugins/DEUS_Jobs.js:2131 (4 code hits; lines 2131,2362)
  - plugin game/js/plugins/DEUS_Levels.js:4995 (4 code hits; lines 4995,5614,5887)
  - plugin game/js/plugins/DEUS_Look.js:593 (8 code hits; lines 593,654,686,739)
  - plugin game/js/plugins/DEUS_Objects.js:896 (13 code hits; lines 896,1289,1312,1485,1496,1522)
  - plugin game/js/plugins/DEUS_Select.js:1849 (16 code hits; lines 1849,1894,1965,1996,2027,2081,3404,3933)
  - plugin game/js/plugins/DEUS_Sheet.js:2607 (1 code hit; lines 2607)
  - plugin game/js/plugins/DEUS_Speech.js:779 (1 code hit; lines 779)
  - plugin game/js/plugins/DEUS_Stance.js:803 (13 code hits; lines 803,804,916,947,953,954,956,974,1044)
  - plugin game/js/plugins/DEUS_Talk.js:117 (1 code hit; lines 117)
  - plugin game/js/plugins/DEUS_Test.js:544 (1 code hit; lines 544)
  - plugin game/js/plugins/DEUS_Tiles.js:1463 (10 code hits; lines 1463,1467,1471,1477,1502)
  - plugin game/js/plugins/DEUS_Wildlife.js:2559 (6 code hits; lines 2559,2839,2855)
  - plugin game/js/plugins/DEUS_World.js:4071 (7 code hits; lines 4071,4072,4135,4622)
  - plugin game/js/plugins/DEUS_WorldGen.js:2399 (11 code hits; lines 2399,2403,2535,2537,2545)
  - tool tools/bench_viewport_culling.js:71 (10 code hits; lines 71,121,219,220,221,233)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:274 (3 code hits; lines 274)
  - tool tools/fixtures/UF_ZFlora.js:75 (2 code hits; lines 75)
  - tool tools/test_camera_zoom.js:46 (1 code hit; lines 46)
  - tool tools/test_zoom_depth_coverage.js:119 (1 code hit; lines 119)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:1878 (10); archive/plugins_uf_pre_rename/UF_Camera.js:79 (1); archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:492 (2); archive/plugins_uf_pre_rename/UF_Combat.js:1745 (10); archive/plugins_uf_pre_rename/UF_DayNight.js:341 (3); archive/plugins_uf_pre_rename/UF_Fire.js:907 (12); archive/plugins_uf_pre_rename/UF_Fog.js:528 (11); archive/plugins_uf_pre_rename/UF_History.js:3397 (6); archive/plugins_uf_pre_rename/UF_Interact.js:915 (2); archive/plugins_uf_pre_rename/UF_Items.js:1049 (13); archive/plugins_uf_pre_rename/UF_Jobs.js:1483 (4); archive/plugins_uf_pre_rename/UF_Levels.js:2061 (4); archive/plugins_uf_pre_rename/UF_Look.js:591 (8); archive/plugins_uf_pre_rename/UF_Objects.js:707 (13); archive/plugins_uf_pre_rename/UF_Roads.js:790 (4); archive/plugins_uf_pre_rename/UF_Select.js:1212 (12); archive/plugins_uf_pre_rename/UF_Sheet.js:1657 (1); archive/plugins_uf_pre_rename/UF_Skills.js:850 (6); archive/plugins_uf_pre_rename/UF_Speech.js:777 (1); archive/plugins_uf_pre_rename/UF_Stance.js:738 (13); archive/plugins_uf_pre_rename/UF_Talk.js:117 (1); archive/plugins_uf_pre_rename/UF_Tiles.js:1449 (10); archive/plugins_uf_pre_rename/UF_Wildlife.js:1498 (6); archive/plugins_uf_pre_rename/UF_World.js:2608 (7); archive/plugins_uf_pre_rename/UF_WorldGen.js:1613 (11); archive/plugins/DEUS_Roads.js:791 (4); archive/plugins/DEUS_Select.js:1212 (12); archive/plugins/DEUS_Skills.js:851 (6)
- `Sprite_UFZoomSlider` (class, this file :311): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:204 quotes `DEUS_Camera`
- tool tools/bench_viewport_culling.js:318 quotes `DEUS_Camera`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Camera`
- tool tools/run_all_suites.js:24 quotes `DEUS_Camera`
- archive quotes omitted from the live list (2 hits)

## DEUS_CellularFluids.js

Source lines: 87.
Exports:
- `UF.World` at game/js/plugins/DEUS_CellularFluids.js:14 fallback (`||`)
- `UF.Fluids` at game/js/plugins/DEUS_CellularFluids.js:83
- namespace object `window/root.UF` at game/js/plugins/DEUS_CellularFluids.js:13
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- `UF.World.update` at game/js/plugins/DEUS_CellularFluids.js:18
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `simulateFluids` at game/js/plugins/DEUS_CellularFluids.js:29
Named consumers outside this file:
- `UF.World` (export, fallback at :14): callers of this name are indexed under game/js/plugins/DEUS_World.js:469. Also assigned or declared in game/js/plugins/DEUS_World.js:469. A hit names the identifier; it does not prove which assignment ran. Not labeled dead.
- `UF.Fluids` (export, this file :83): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:301 quotes `DEUS_CellularFluids`

## DEUS_Colonists.js

Source lines: 5921.
Exports:
- `UF.ECS` at game/js/plugins/DEUS_Colonists.js:48 fallback (`||`)
- `UF.Colonists` at game/js/plugins/DEUS_Colonists.js:5819
- namespace object `window/root.UF` at game/js/plugins/DEUS_Colonists.js:47
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Colonists.js:5817
- namespace object `window/root.UF` at game/js/plugins/DEUS_Colonists.js:5818
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Colonists.js:5842
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Colonists.js:5887
Engine object patches (not prototype):
- `DataManager.makeSaveContents` at game/js/plugins/DEUS_Colonists.js:60
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Colonists.js:66
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Colonists.js:5830
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Colonists.js:5841
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Colonists.js:5886
- `DataManager.makeSaveContents` saved to `_DataManager_makeSaveContents` at game/js/plugins/DEUS_Colonists.js:59
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Colonists.js:65
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents_identity` at game/js/plugins/DEUS_Colonists.js:5829
Namespace property patches:
- `UF.ECS.hp` at game/js/plugins/DEUS_Colonists.js:69
- `UF.ECS.hunger` at game/js/plugins/DEUS_Colonists.js:70
- `UF.ECS.stance` at game/js/plugins/DEUS_Colonists.js:71
- `UF.ECS.isColonist` at game/js/plugins/DEUS_Colonists.js:72
- `UF.ECS.isWildlife` at game/js/plugins/DEUS_Colonists.js:73
Listeners and commands:
- `on` `"world:unitAdded"` at game/js/plugins/DEUS_Colonists.js:5858
- `on` `"world:unitRemoved"` at game/js/plugins/DEUS_Colonists.js:5859
- `on` `"combat:kill"` at game/js/plugins/DEUS_Colonists.js:5860
- `on` `"combat:hit"` at game/js/plugins/DEUS_Colonists.js:5861
- `on` `"world:unitMoved"` at game/js/plugins/DEUS_Colonists.js:5862
- `on` `"objects:changed"` at game/js/plugins/DEUS_Colonists.js:5863
- `on` `"objects:changed"` at game/js/plugins/DEUS_Colonists.js:5864
- `on` `"projects:done"` at game/js/plugins/DEUS_Colonists.js:5865
- `on` `"colonists:immigrated"` at game/js/plugins/DEUS_Colonists.js:5866
- `on` `"world:unitAdded"` at game/js/plugins/DEUS_Colonists.js:5867
- `on` `"world:created"` at game/js/plugins/DEUS_Colonists.js:5868
- `on` `"jobs:done"` at game/js/plugins/DEUS_Colonists.js:5872
- `on` `"jobs:failed"` at game/js/plugins/DEUS_Colonists.js:5876
- `on` `"jobs:created"` at game/js/plugins/DEUS_Colonists.js:5881
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `nodeRequire` at game/js/plugins/DEUS_Colonists.js:121
- `loadIdentity` at game/js/plugins/DEUS_Colonists.js:137
- `sourcesOf` at game/js/plugins/DEUS_Colonists.js:235
- `colonyState` at game/js/plugins/DEUS_Colonists.js:264
- `standingOrders` at game/js/plugins/DEUS_Colonists.js:420
- `populationMilestoneSteps` at game/js/plugins/DEUS_Colonists.js:486
- `autonomousStorageSteps` at game/js/plugins/DEUS_Colonists.js:507
- `effectivePlan` at game/js/plugins/DEUS_Colonists.js:566
- `nameFor` at game/js/plugins/DEUS_Colonists.js:646
- `facetsFor` at game/js/plugins/DEUS_Colonists.js:658
- `skillsFor` at game/js/plugins/DEUS_Colonists.js:665
- `moodOf` at game/js/plugins/DEUS_Colonists.js:675
- `addThought` at game/js/plugins/DEUS_Colonists.js:679
- `colonistLedger` at game/js/plugins/DEUS_Colonists.js:694
- `awardCredits` at game/js/plugins/DEUS_Colonists.js:701
- `spendCredits` at game/js/plugins/DEUS_Colonists.js:708
- `setTier` at game/js/plugins/DEUS_Colonists.js:720
- `variationFor` at game/js/plugins/DEUS_Colonists.js:738
- `tiersFor` at game/js/plugins/DEUS_Colonists.js:758
- `homeSiteFor` at game/js/plugins/DEUS_Colonists.js:773
- `siteRadius` at game/js/plugins/DEUS_Colonists.js:796
- `planTemplate` at game/js/plugins/DEUS_Colonists.js:800
- `makePlan` at game/js/plugins/DEUS_Colonists.js:806
- `getCallings` at game/js/plugins/DEUS_Colonists.js:825
- `geneticsFor` at game/js/plugins/DEUS_Colonists.js:838
- `personRecord` at game/js/plugins/DEUS_Colonists.js:859
- `ensurePersonIdentity` at game/js/plugins/DEUS_Colonists.js:862
- `migratePersonIdentities` at game/js/plugins/DEUS_Colonists.js:867
- `convertPerson` at game/js/plugins/DEUS_Colonists.js:877
- `setupColony` at game/js/plugins/DEUS_Colonists.js:933
- `ensureSettlementActors` at game/js/plugins/DEUS_Colonists.js:996
- `adoptSiteStockpiles` at game/js/plugins/DEUS_Colonists.js:1051
- `freeCellNear` at game/js/plugins/DEUS_Colonists.js:1072
- `gridOf` at game/js/plugins/DEUS_Colonists.js:1089
- `scanObjects` at game/js/plugins/DEUS_Colonists.js:1098
- `sitePiece` at game/js/plugins/DEUS_Colonists.js:1132
- `getClaimedTargets` at game/js/plugins/DEUS_Colonists.js:1140
- `isObjectClaimed` at game/js/plugins/DEUS_Colonists.js:1154
- `objectSourceNear` at game/js/plugins/DEUS_Colonists.js:1162
- `foodObjectNear` at game/js/plugins/DEUS_Colonists.js:1181
- 131 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.ECS` (export, this file :48): Also assigned or declared in game/js/plugins/DEUS_Wildlife.js:80 fallback. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Wildlife.js:80 (15 code hits; lines 80,934,943,969,988,1088,1119,1155,1282,1536,2184,2335)
- `UF.Colonists` (export, this file :5819):
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:62 (1 code hit; lines 62)
  - plugin game/js/plugins/DEUS_Combat.js:421 (4 code hits; lines 421,482,871,1186)
  - plugin game/js/plugins/DEUS_Conditions.js:230 (4 code hits; lines 230,499,566,612)
  - plugin game/js/plugins/DEUS_Containers.js:1473 (1 code hit; lines 1473)
  - plugin game/js/plugins/DEUS_DeathForensics.js:450 (6 code hits; lines 450,451,452,453,454,455)
  - plugin game/js/plugins/DEUS_Dnd5e.js:693 (3 code hits; lines 693,774,832)
  - plugin game/js/plugins/DEUS_Doors.js:737 (9 code hits; lines 737,738,780)
  - plugin game/js/plugins/DEUS_Environment.js:68 (2 code hits; lines 68,295)
  - plugin game/js/plugins/DEUS_Fire.js:679 (3 code hits; lines 679,881,1406)
  - plugin game/js/plugins/DEUS_Floors.js:615 (3 code hits; lines 615,678,822)
  - plugin game/js/plugins/DEUS_Fog.js:731 (4 code hits; lines 731)
  - plugin game/js/plugins/DEUS_History.js:1704 (8 code hits; lines 1704,1705,1711,2997,4005)
  - plugin game/js/plugins/DEUS_Interact.js:306 (5 code hits; lines 306,335,374,1130,1135)
  - plugin game/js/plugins/DEUS_Jobs.js:1023 (8 code hits; lines 1023,1340,1388,1389,2112)
  - plugin game/js/plugins/DEUS_Look.js:153 (3 code hits; lines 153)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:106 (6 code hits; lines 106,341,349,443)
  - plugin game/js/plugins/DEUS_Ownership.js:58 (2 code hits; lines 58,648)
  - plugin game/js/plugins/DEUS_Projects.js:1382 (1 code hit; lines 1382)
  - plugin game/js/plugins/DEUS_Select.js:375 (1 code hit; lines 375)
  - plugin game/js/plugins/DEUS_Sheet.js:2607 (1 code hit; lines 2607)
  - plugin game/js/plugins/DEUS_Speech.js:781 (2 code hits; lines 781,1344)
  - plugin game/js/plugins/DEUS_Talk.js:112 (1 code hit; lines 112)
  - plugin game/js/plugins/DEUS_Test.js:371 (3 code hits; lines 371,451,631)
  - plugin game/js/plugins/DEUS_World.js:1625 (2 code hits; lines 1625,4808)
  - plugin game/js/plugins/DEUS_WorldGen.js:1512 (2 code hits; lines 1512,2201)
  - plugin game/js/plugins/UF_Households.js:28 (1 code hit; lines 28)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:15 (1 code hit; lines 15)
  - tool tools/fixtures/UF_SleepRuntime.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_SocietyRuntime.js:17 (1 code hit; lines 17)
  - tool tools/test_autonomous_project_dispatch.js:200 (1 code hit; lines 200)
  - tool tools/test_autonomous_settlement_closure.js:201 (1 code hit; lines 201)
  - tool tools/test_autonomous_work_recovery.js:229 (1 code hit; lines 229)
  - tool tools/test_bag_and_racial_banners.js:157 (1 code hit; lines 157)
  - tool tools/test_build_vertical.js:359 (4 code hits; lines 359,690)
  - tool tools/test_collapse_ingame.js:88 (3 code hits; lines 88)
  - tool tools/test_combat_dying_integration.js:187 (1 code hit; lines 187)
  - tool tools/test_conditions_native_closure.js:197 (1 code hit; lines 197)
  - tool tools/test_cooperative_building_and_offspring_pairbonding.js:381 (2 code hits; lines 381,418)
  - tool tools/test_faction_construction_and_homes.js:239 (6 code hits; lines 239,267,289,326,348,352)
  - tool tools/test_faction_founder_pairbonding.js:427 (1 code hit; lines 427)
  - tool tools/test_faction_reproduction.js:258 (1 code hit; lines 258)
  - tool tools/test_family_integration.js:89 (1 code hit; lines 89)
  - tool tools/test_hazard_reflex.js:214 (1 code hit; lines 214)
  - tool tools/test_hazard_torture_live.js:253 (1 code hit; lines 253)
  - tool tools/test_households.js:159 (2 code hits; lines 159,163)
  - tool tools/test_material_refining_and_tech_pacing.js:291 (1 code hit; lines 291)
  - tool tools/test_multi_deficit_settlement.js:174 (1 code hit; lines 174)
  - tool tools/test_native_survival_soak.js:251 (1 code hit; lines 251)
  - tool tools/test_population_growth_and_immigration.js:280 (7 code hits; lines 280,321,336,357,381,427,483)
  - tool tools/test_project_construction_loop.js:205 (1 code hit; lines 205)
  - tool tools/test_sanitation_system.js:239 (3 code hits; lines 239,269,334)
  - tool tools/test_second_by_second_history.js:351 (14 code hits; lines 351,366,395,449,475,500,567,599,672,702,732,766)
  - tool tools/test_settlement_domestic_housing.js:250 (1 code hit; lines 250)
  - tool tools/test_settlement_expansion_multi_dwelling.js:230 (1 code hit; lines 230)
  - tool tools/test_settlement_pillars.js:436 (1 code hit; lines 436)
  - tool tools/test_stabilization.js:175 (1 code hit; lines 175)
  - tool tools/test_starter_kit_and_stockpile.js:70 (2 code hits; lines 70,124)
  - tool tools/test_survival_needs_loop.js:196 (1 code hit; lines 196)
  - tool tools/test_survival_regressions.js:290 (5 code hits; lines 290,373,440,519,670)
  - tool tools/test_worldgen_quickfixes.js:118 (1 code hit; lines 118)
  - tool tools/test_z_floors.js:132 (1 code hit; lines 132)
  - tool tools/test_z_ownership.js:45 (1 code hit; lines 45)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:28 (1); archive/plugins_uf_pre_rename/UF_Colonists.js:4593 (1); archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:56 (1); archive/plugins_uf_pre_rename/UF_Doors.js:694 (9); archive/plugins_uf_pre_rename/UF_Environment.js:66 (2); archive/plugins_uf_pre_rename/UF_Fire.js:540 (3); archive/plugins_uf_pre_rename/UF_FireSafety.js:37 (3); archive/plugins_uf_pre_rename/UF_Floors.js:396 (3); archive/plugins_uf_pre_rename/UF_Fog.js:705 (4); archive/plugins_uf_pre_rename/UF_Goals.js:241 (4); archive/plugins_uf_pre_rename/UF_History.js:1472 (8); archive/plugins_uf_pre_rename/UF_Households.js:27 (7); archive/plugins_uf_pre_rename/UF_Interact.js:304 (5); archive/plugins_uf_pre_rename/UF_Jobs.js:762 (7); archive/plugins_uf_pre_rename/UF_Look.js:153 (3); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:103 (6); archive/plugins_uf_pre_rename/UF_Outposts.js:58 (1); archive/plugins_uf_pre_rename/UF_Ownership.js:58 (2); archive/plugins_uf_pre_rename/UF_Perspective25D.js:217 (3); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:414 (1); archive/plugins_uf_pre_rename/UF_Sanitation.js:16 (1); archive/plugins_uf_pre_rename/UF_Select.js:116 (1); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:58 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:1657 (1); archive/plugins_uf_pre_rename/UF_Speech.js:779 (2); archive/plugins_uf_pre_rename/UF_Talk.js:112 (1); archive/plugins_uf_pre_rename/UF_World.js:3345 (1); archive/plugins_uf_pre_rename/UF_WorldGen.js:1039 (2); archive/plugins/DEUS_Agriculture.js:28 (1); archive/plugins/DEUS_FireSafety.js:37 (3); archive/plugins/DEUS_Goals.js:241 (4); archive/plugins/DEUS_Households.js:27 (7); archive/plugins/DEUS_Outposts.js:58 (1); archive/plugins/DEUS_ProfileTabs.js:414 (1); archive/plugins/DEUS_Sanitation.js:16 (1); archive/plugins/DEUS_Select.js:116 (1); archive/plugins/DEUS_SettlementPillars.js:58 (1)
Unqualified property names (length >= 10; may be a different binding):
- `isColonist` from `UF.ECS.isColonist` at :72: plugin game/js/plugins/DEUS_Combat.js:419 (6); plugin game/js/plugins/DEUS_Look.js:153 (2); plugin game/js/plugins/DEUS_NaturalConnections.js:345 (1); plugin game/js/plugins/DEUS_Ownership.js:448 (2); plugin game/js/plugins/DEUS_Projects.js:322 (8); plugin game/js/plugins/DEUS_Select.js:484 (9); plugin game/js/plugins/DEUS_Wildlife.js:84 (1); tool tools/select_xlayer/test_xlayer_select.js:305 (1); tool tools/test_agriculture.js:62 (1); tool tools/test_natural_connections.js:75 (1); tool tools/test_z_ownership.js:46 (1)
- `isWildlife` from `UF.ECS.isWildlife` at :73: plugin game/js/plugins/DEUS_Wildlife.js:85 (17)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:139 quotes `DEUS_Colonists`
- tool tools/bench_vertical_worldgen.js:158 quotes `DEUS_Colonists`
- tool tools/diagnose_hotspots.js:32 quotes `DEUS_Colonists.js`
- tool tools/fix_colonists_checks.js:19 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:234 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:241 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:261 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:265 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:269 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:277 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:286 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:324 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:328 quotes `DEUS_Colonists.js`
- tool tools/profile_live_frames.js:332 quotes `DEUS_Colonists.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Colonists`
- tool tools/run_all_suites.js:24 quotes `DEUS_Colonists`
- tool tools/society/test_person_identity.js:32 quotes `DEUS_Colonists`
- tool tools/test_autonomous_project_dispatch.js:44 quotes `DEUS_Colonists.js`
- tool tools/test_autonomous_project_dispatch.js:199 quotes `DEUS_Colonists.js`
- tool tools/test_autonomous_settlement_closure.js:48 quotes `DEUS_Colonists.js`
- tool tools/test_autonomous_settlement_closure.js:200 quotes `DEUS_Colonists.js`
- tool tools/test_autonomous_work_recovery.js:41 quotes `DEUS_Colonists.js`
- tool tools/test_autonomous_work_recovery.js:228 quotes `DEUS_Colonists.js`
- tool tools/test_build_vertical.js:115 quotes `DEUS_Colonists.js`
- tool tools/test_build_vertical.js:274 quotes `DEUS_Colonists.js`
- tool tools/test_combat_dying_integration.js:137 quotes `DEUS_Colonists.js`
- tool tools/test_combat_dying_integration.js:156 quotes `DEUS_Colonists.js`
- tool tools/test_conditions_native_closure.js:36 quotes `DEUS_Colonists.js`
- tool tools/test_conditions_native_closure.js:192 quotes `DEUS_Colonists.js`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:20 quotes `DEUS_Colonists`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:262 quotes `DEUS_Colonists`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:265 quotes `DEUS_Colonists`
- tool tools/test_cooperative_homestead_construction.js:192 quotes `DEUS_Colonists.js`
- tool tools/test_faction_construction_and_homes.js:13 quotes `DEUS_Colonists`
- tool tools/test_faction_construction_and_homes.js:230 quotes `DEUS_Colonists`
- tool tools/test_faction_construction_and_homes.js:233 quotes `DEUS_Colonists`
- tool tools/test_faction_founder_pairbonding.js:197 quotes `DEUS_Colonists.js`
- tool tools/test_family_integration.js:86 quotes `DEUS_Colonists.js`
- tool tools/test_hazard_reflex.js:44 quotes `DEUS_Colonists.js`
- tool tools/test_hazard_reflex.js:209 quotes `DEUS_Colonists.js`
- tool tools/test_hazard_torture_live.js:46 quotes `DEUS_Colonists.js`
- tool tools/test_hazard_torture_live.js:248 quotes `DEUS_Colonists.js`
- tool tools/test_live_town_center_progression.js:158 quotes `DEUS_Colonists.js`
- tool tools/test_material_refining_and_tech_pacing.js:288 quotes `DEUS_Colonists.js`
- tool tools/test_multi_deficit_settlement.js:35 quotes `DEUS_Colonists.js`
- tool tools/test_multi_deficit_settlement.js:173 quotes `DEUS_Colonists.js`
- tool tools/test_native_survival_soak.js:84 quotes `DEUS_Colonists.js`
- tool tools/test_native_survival_soak.js:98 quotes `DEUS_Colonists.js`
- tool tools/test_native_survival_soak.js:104 quotes `DEUS_Colonists.js`
- tool tools/test_project_construction_loop.js:44 quotes `DEUS_Colonists.js`
- tool tools/test_project_construction_loop.js:204 quotes `DEUS_Colonists.js`
- tool tools/test_second_by_second_history.js:17 quotes `DEUS_Colonists`
- tool tools/test_settlement_domestic_housing.js:51 quotes `DEUS_Colonists.js`
- tool tools/test_settlement_domestic_housing.js:247 quotes `DEUS_Colonists.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:44 quotes `DEUS_Colonists.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:229 quotes `DEUS_Colonists.js`
- tool tools/test_stabilization.js:36 quotes `DEUS_Colonists.js`
- tool tools/test_stabilization.js:174 quotes `DEUS_Colonists.js`
- tool tools/test_stockpiles_designation.js:187 quotes `DEUS_Colonists.js`
- tool tools/test_survival_needs_loop.js:42 quotes `DEUS_Colonists.js`
- tool tools/test_survival_needs_loop.js:195 quotes `DEUS_Colonists.js`
- tool tools/test_survival_regressions.js:87 quotes `DEUS_Colonists.js`
- tool tools/test_survival_regressions.js:118 quotes `DEUS_Colonists.js`
- tool tools/test_survival_regressions.js:124 quotes `DEUS_Colonists.js`
- tool tools/test_survival_regressions.js:130 quotes `DEUS_Colonists.js`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_Colonists`
- archive quotes omitted from the live list (2 hits)

## DEUS_ColonyOverseer.js

Source lines: 625.
Exports:
- `UF.Overseer` at game/js/plugins/DEUS_ColonyOverseer.js:530
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_ColonyOverseer.js:528
- namespace object `window/root.UF` at game/js/plugins/DEUS_ColonyOverseer.js:529
Engine prototype patches:
- `Game_Player.prototype.moveByInput` at game/js/plugins/DEUS_ColonyOverseer.js:169
- `Scene_Map.prototype.createMenuButton` at game/js/plugins/DEUS_ColonyOverseer.js:172
- `Scene_Map.prototype.isMenuEnabled` at game/js/plugins/DEUS_ColonyOverseer.js:173
- `Scene_Map.prototype.callMenu` at game/js/plugins/DEUS_ColonyOverseer.js:174
- `Window_MapName.prototype.open` at game/js/plugins/DEUS_ColonyOverseer.js:177
- `Sprite_Destination.prototype.update` at game/js/plugins/DEUS_ColonyOverseer.js:180
- `Scene_Map.prototype.processMapTouch` at game/js/plugins/DEUS_ColonyOverseer.js:183
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_ColonyOverseer.js:186
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_ColonyOverseer.js:196
- `Scene_Map.prototype.updateOverseerControls` at game/js/plugins/DEUS_ColonyOverseer.js:224
- `Scene_Map.prototype.isAnyWindowUnderMouse` at game/js/plugins/DEUS_ColonyOverseer.js:322
- `Game_Player.prototype.updateScroll` at game/js/plugins/DEUS_ColonyOverseer.js:328
- `Window_UFColonistCard.prototype.constructor` at game/js/plugins/DEUS_ColonyOverseer.js:353
- `Window_UFColonistCard.prototype.initialize` at game/js/plugins/DEUS_ColonyOverseer.js:355
- `Window_UFColonistCard.prototype.refresh` at game/js/plugins/DEUS_ColonyOverseer.js:362
- `Window_UFColonistCard.prototype.drawNeedGauge` at game/js/plugins/DEUS_ColonyOverseer.js:444
- `Window_UFColonistCard.prototype.drawPortrait` at game/js/plugins/DEUS_ColonyOverseer.js:455
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_ColonyOverseer.js:522
- `Game_System.prototype.getExploredGrid` at game/js/plugins/DEUS_ColonyOverseer.js:543
- `Game_System.prototype.isTileExplored` at game/js/plugins/DEUS_ColonyOverseer.js:548
- `Game_System.prototype.exploreTile` at game/js/plugins/DEUS_ColonyOverseer.js:553
- `Sprite_Character.prototype.update` at game/js/plugins/DEUS_ColonyOverseer.js:562
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_ColonyOverseer.js:583
Engine object patches (not prototype):
- `TouchInput._x` at game/js/plugins/DEUS_ColonyOverseer.js:601
- `TouchInput._y` at game/js/plugins/DEUS_ColonyOverseer.js:602
Engine members read or saved:
- `Scene_Map.prototype.start` saved to `_Scene_Map_start` at game/js/plugins/DEUS_ColonyOverseer.js:185
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_ColonyOverseer.js:195
- `Scene_Map.prototype.createAllWindows` saved to `_Scene_Map_createAllWindows` at game/js/plugins/DEUS_ColonyOverseer.js:521
- `Sprite_Character.prototype.update` saved to `_Sprite_Character_update` at game/js/plugins/DEUS_ColonyOverseer.js:561
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_ColonyOverseer.js:582
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `ColonyManager` at game/js/plugins/DEUS_ColonyOverseer.js:106
Named functions at brace depth 0 or 1 (capped at 40):
- `adapterFor` at game/js/plugins/DEUS_ColonyOverseer.js:70
- `colonistAt` at game/js/plugins/DEUS_ColonyOverseer.js:202
- `Window_UFColonistCard` at game/js/plugins/DEUS_ColonyOverseer.js:348
- `registerChecks` at game/js/plugins/DEUS_ColonyOverseer.js:588
Named consumers outside this file:
- `UF.Overseer` (export, this file :530):
  - plugin game/js/plugins/DEUS_Sheet.js:3059 (7 code hits; lines 3059,3063,3086,3088,3094,3106)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:426 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:2102 (7)
- `ColonyManager` (class, this file :106):
  - plugin game/js/plugins/DEUS_Select.js:2646 (2 code hits; lines 2646)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:100 (2); archive/plugins_uf_pre_rename/UF_Select.js:1893 (2); archive/plugins/DEUS_Select.js:1893 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:59 quotes `DEUS_ColonyOverseer`
- tool tools/run_all_suites.js:24 quotes `DEUS_ColonyOverseer`
- archive quotes omitted from the live list (2 hits)

## DEUS_Combat.js

Source lines: 3197.
Exports:
- `UF.Combat` at game/js/plugins/DEUS_Combat.js:151
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Combat.js:149
- namespace object `window/root.UF` at game/js/plugins/DEUS_Combat.js:150
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Combat.js:1845
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Combat.js:1915
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Combat.js:2529
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Combat.js:2545
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Combat.js:1844
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Combat.js:1914
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Combat.js:2528
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Combat.js:2544
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:unitRemoved"` at game/js/plugins/DEUS_Combat.js:1963
- `on` `"colonists:exhaustion"` at game/js/plugins/DEUS_Combat.js:1966
- `on` `"combat:hit"` at game/js/plugins/DEUS_Combat.js:2604
- `on` `"combat:kill"` at game/js/plugins/DEUS_Combat.js:2605
- `on` `"combat:aid"` at game/js/plugins/DEUS_Combat.js:3100
Classes:
- `Sprite_UFCombatFx` at game/js/plugins/DEUS_Combat.js:2238
Named functions at brace depth 0 or 1 (capped at 40):
- `report` at game/js/plugins/DEUS_Combat.js:153
- `notifyCombatRt` at game/js/plugins/DEUS_Combat.js:163
- `bootCombatRtPresentation` at game/js/plugins/DEUS_Combat.js:171
- `nodeRequire` at game/js/plugins/DEUS_Combat.js:203
- `bootRules` at game/js/plugins/DEUS_Combat.js:216
- `partyApi` at game/js/plugins/DEUS_Combat.js:273
- `tamedFriendly` at game/js/plugins/DEUS_Combat.js:293
- `tamedBody` at game/js/plugins/DEUS_Combat.js:307
- `prepareTamed` at game/js/plugins/DEUS_Combat.js:312
- `applyTamedOrder` at game/js/plugins/DEUS_Combat.js:322
- `rulesApi` at game/js/plugins/DEUS_Combat.js:336
- `cfg` at game/js/plugins/DEUS_Combat.js:352
- `speciesById` at game/js/plugins/DEUS_Combat.js:368
- `creatureBlock` at game/js/plugins/DEUS_Combat.js:378
- `itemType` at game/js/plugins/DEUS_Combat.js:382
- `cstate` at game/js/plugins/DEUS_Combat.js:398
- `cd` at game/js/plugins/DEUS_Combat.js:409
- `isColonist` at game/js/plugins/DEUS_Combat.js:419
- `challengeRank` at game/js/plugins/DEUS_Combat.js:443
- `rankLabel` at game/js/plugins/DEUS_Combat.js:457
- `maxHp` at game/js/plugins/DEUS_Combat.js:466
- `ensureHp` at game/js/plugins/DEUS_Combat.js:493
- `slotItem` at game/js/plugins/DEUS_Combat.js:512
- `resolveItem` at game/js/plugins/DEUS_Combat.js:539
- `qualityMult` at game/js/plugins/DEUS_Combat.js:554
- `cached` at game/js/plugins/DEUS_Combat.js:562
- `unarmedProfile` at game/js/plugins/DEUS_Combat.js:574
- `ammoOf` at game/js/plugins/DEUS_Combat.js:580
- `weaponOf` at game/js/plugins/DEUS_Combat.js:595
- `tamedWeaponProfile` at game/js/plugins/DEUS_Combat.js:602
- `computeWeapon` at game/js/plugins/DEUS_Combat.js:610
- `styleOf` at game/js/plugins/DEUS_Combat.js:642
- `attackTypeOf` at game/js/plugins/DEUS_Combat.js:649
- `styleBonus` at game/js/plugins/DEUS_Combat.js:653
- `numbers` at game/js/plugins/DEUS_Combat.js:662
- `attackRng` at game/js/plugins/DEUS_Combat.js:719
- `speedOf` at game/js/plugins/DEUS_Combat.js:730
- `modeOf` at game/js/plugins/DEUS_Combat.js:734
- `factionOf` at game/js/plugins/DEUS_Combat.js:752
- `retaliate` at game/js/plugins/DEUS_Combat.js:767
- 40 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.Combat` (export, this file :151):
  - plugin game/js/plugins/DEUS_Anim.js:119 (2 code hits; lines 119,1833)
  - plugin game/js/plugins/DEUS_Colonists.js:114 (1 code hit; lines 114)
  - plugin game/js/plugins/DEUS_Containers.js:1455 (3 code hits; lines 1455,1456)
  - plugin game/js/plugins/DEUS_Environment.js:67 (1 code hit; lines 67)
  - plugin game/js/plugins/DEUS_Fire.js:659 (7 code hits; lines 659,1592,1614,1631)
  - plugin game/js/plugins/DEUS_Jobs.js:1717 (10 code hits; lines 1717,1721,1851,1852,1856,1998)
  - plugin game/js/plugins/DEUS_Levels.js:5581 (7 code hits; lines 5581,6145,6146)
  - plugin game/js/plugins/DEUS_Ownership.js:59 (1 code hit; lines 59)
  - plugin game/js/plugins/DEUS_Structural.js:396 (2 code hits; lines 396,410)
  - plugin game/js/plugins/DEUS_Test.js:449 (1 code hit; lines 449)
  - plugin game/js/plugins/DEUS_Wildlife.js:1347 (4 code hits; lines 1347,1388,1435,1474)
  - plugin game/js/plugins/DEUS_World.js:2103 (8 code hits; lines 2103,3989,4725,4726,4832,4833)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:137 (2 code hits; lines 137,185)
  - tool tools/fixtures/UF_ZIntegration.js:63 (1 code hit; lines 63)
  - tool tools/rules/test_srd_rules.js:418 (2 code hits; lines 418,443)
  - tool tools/sim/test_wildlife_rules_damage.js:180 (3 code hits; lines 180,183,229)
  - tool tools/taming_party/test_tamed_party_combat.js:706 (7 code hits; lines 706,828,830,841,858,866)
  - tool tools/test_build_vertical.js:365 (1 code hit; lines 365)
  - tool tools/test_combat_dying_integration.js:185 (1 code hit; lines 185)
  - tool tools/test_conditions_native_closure.js:197 (1 code hit; lines 197)
  - tool tools/test_conditions_system.js:242 (1 code hit; lines 242)
  - tool tools/test_d20_equipment_slots.js:243 (4 code hits; lines 243,284,290,311)
  - tool tools/test_hazard_reflex.js:214 (1 code hit; lines 214)
  - tool tools/test_hazard_torture_live.js:253 (1 code hit; lines 253)
  - tool tools/test_srd_combat_proof.js:148 (22 code hits; lines 148,149,150,151,152,153,159,160,161,201,207,219)
  - tool tools/test_structural_runtime.js:390 (1 code hit; lines 390)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:354 (3); archive/plugins_uf_pre_rename/UF_Anim.js:109 (2); archive/plugins_uf_pre_rename/UF_Colonists.js:77 (1); archive/plugins_uf_pre_rename/UF_Combat.js:122 (1); archive/plugins_uf_pre_rename/UF_Environment.js:65 (1); archive/plugins_uf_pre_rename/UF_Fire.js:520 (7); archive/plugins_uf_pre_rename/UF_FireSafety.js:33 (3); archive/plugins_uf_pre_rename/UF_Levels.js:2414 (7); archive/plugins_uf_pre_rename/UF_Ownership.js:59 (1); archive/plugins_uf_pre_rename/UF_Wildlife.js:1009 (2); archive/plugins_uf_pre_rename/UF_World.js:1224 (8); archive/plugins/DEUS_Agriculture.js:354 (3); archive/plugins/DEUS_FireSafety.js:33 (3)
- `Sprite_UFCombatFx` (class, this file :2238):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Combat.js:1490 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:169 quotes `DEUS_Combat`
- tool tools/combat_rt/test_combat_rt.js:644 quotes `DEUS_Combat.js`
- tool tools/diagnose_hotspots.js:37 quotes `DEUS_Combat.js`
- tool tools/profile_live_frames.js:350 quotes `DEUS_Combat.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Combat`
- tool tools/rules/test_srd_rules.js:12 quotes `DEUS_Combat.js`
- tool tools/sim/test_wildlife_rules_damage.js:16 quotes `DEUS_Combat.js`
- tool tools/taming_party/test_tamed_party_combat.js:24 quotes `DEUS_Combat.js`
- tool tools/test_combat_dying_integration.js:138 quotes `DEUS_Combat.js`
- tool tools/test_combat_dying_integration.js:157 quotes `DEUS_Combat.js`
- tool tools/test_conditions_native_closure.js:36 quotes `DEUS_Combat.js`
- tool tools/test_conditions_native_closure.js:195 quotes `DEUS_Combat.js`
- tool tools/test_conditions_system.js:60 quotes `DEUS_Combat.js`
- tool tools/test_conditions_system.js:230 quotes `DEUS_Combat.js`
- tool tools/test_d20_equipment_slots.js:128 quotes `DEUS_Combat.js`
- tool tools/test_hazard_reflex.js:44 quotes `DEUS_Combat.js`
- tool tools/test_hazard_reflex.js:213 quotes `DEUS_Combat.js`
- tool tools/test_hazard_torture_live.js:46 quotes `DEUS_Combat.js`
- tool tools/test_hazard_torture_live.js:252 quotes `DEUS_Combat.js`
- tool tools/test_srd_combat_proof.js:141 quotes `DEUS_Combat.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_CombatRT.js

Source lines: 69.
Exports:
- none assigned as UF/DEUS member or Imported flag
Engine prototype patches:
- `Game_Map.prototype.__deusCombatRt` at game/js/plugins/DEUS_CombatRT.js:60
- `Game_Map.prototype.update` at game/js/plugins/DEUS_CombatRT.js:62
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_Map.prototype.update` saved to `prev` at game/js/plugins/DEUS_CombatRT.js:61
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `loadMod` at game/js/plugins/DEUS_CombatRT.js:28
Named consumers outside this file:
- no UF/DEUS export, Imported flag, or class was assigned. Coupling is the prototype patches and listeners above, if any. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- no quoted id found outside this file in the searched roots

## DEUS_CombatUI.js

Source lines: 72.
Exports:
- none assigned as UF/DEUS member or Imported flag
Engine prototype patches:
- `Scene_Map.prototype.__deusCombatUi` at game/js/plugins/DEUS_CombatUI.js:59
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_CombatUI.js:61
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Scene_Map.prototype.update` saved to `prev` at game/js/plugins/DEUS_CombatUI.js:60
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `loadMod` at game/js/plugins/DEUS_CombatUI.js:23
Named consumers outside this file:
- no UF/DEUS export, Imported flag, or class was assigned. Coupling is the prototype patches and listeners above, if any. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- no quoted id found outside this file in the searched roots

## DEUS_Conditions.js

Source lines: 1187.
Exports:
- `UF.Conditions` at game/js/plugins/DEUS_Conditions.js:1169
- `DEUS.Conditions` at game/js/plugins/DEUS_Conditions.js:1170
- namespace object `window/root.UF` at game/js/plugins/DEUS_Conditions.js:66
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Conditions.js:67
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- `on` `"combat:downed"` at game/js/plugins/DEUS_Conditions.js:1175
- `on` `"colonists:died"` at game/js/plugins/DEUS_Conditions.js:1181
- `on` `"combat:kill"` at game/js/plugins/DEUS_Conditions.js:1182
- `on` `"world:unitRemoved"` at game/js/plugins/DEUS_Conditions.js:1183
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `ensureStore` at game/js/plugins/DEUS_Conditions.js:215
- `isDead` at game/js/plugins/DEUS_Conditions.js:223
- `exhaustionOf` at game/js/plugins/DEUS_Conditions.js:228
- `isUnconsciousZeroHp` at game/js/plugins/DEUS_Conditions.js:240
- `dropHeldItems` at game/js/plugins/DEUS_Conditions.js:261
- `grappleIndex` at game/js/plugins/DEUS_Conditions.js:295
- `noteGrapple` at game/js/plugins/DEUS_Conditions.js:300
- `endGrapples` at game/js/plugins/DEUS_Conditions.js:310
- `releaseGrapplesHeldBy` at game/js/plugins/DEUS_Conditions.js:329
- `chebyshevDist` at game/js/plugins/DEUS_Conditions.js:340
- `findUnit` at game/js/plugins/DEUS_Conditions.js:349
Named consumers outside this file:
- `UF.Conditions` (export, this file :1169):
  - plugin game/js/plugins/DEUS_Colonists.js:1718 (3 code hits; lines 1718,1763,1962)
  - plugin game/js/plugins/DEUS_Combat.js:263 (5 code hits; lines 263,769,811,870,2037)
  - plugin game/js/plugins/DEUS_DeathForensics.js:168 (2 code hits; lines 168)
  - plugin game/js/plugins/DEUS_Dnd5e.js:678 (2 code hits; lines 678,759)
  - plugin game/js/plugins/DEUS_World.js:1615 (2 code hits; lines 1615,2000)
  - tool tools/rules/bind.js:30 (1 code hit; lines 30)
  - tool tools/test_conditions_native_closure.js:197 (1 code hit; lines 197)
  - tool tools/test_conditions_system.js:241 (1 code hit; lines 241)
  - tool tools/test_hazard_reflex.js:214 (1 code hit; lines 214)
  - tool tools/test_hazard_torture_live.js:253 (1 code hit; lines 253)
  - tool tools/test_srd_combat_proof.js:264 (6 code hits; lines 264,265,272,273,274,289)
  - tool tools/test_srd_rules_proof.js:31 (1 code hit; lines 31)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Conditions.js:41 (1); archive/plugins_uf_pre_rename/UF_Rules.js:51 (1); archive/plugins/DEUS_Conditions.js:41 (1); archive/plugins/DEUS_Rules.js:51 (1)
- `DEUS.Conditions` (export, this file :1170): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:96 quotes `DEUS_Conditions`
- tool tools/test_conditions_native_closure.js:36 quotes `DEUS_Conditions.js`
- tool tools/test_conditions_native_closure.js:193 quotes `DEUS_Conditions.js`
- tool tools/test_conditions_system.js:59 quotes `DEUS_Conditions.js`
- tool tools/test_conditions_system.js:229 quotes `DEUS_Conditions.js`
- tool tools/test_hazard_reflex.js:44 quotes `DEUS_Conditions.js`
- tool tools/test_hazard_reflex.js:210 quotes `DEUS_Conditions.js`
- tool tools/test_hazard_torture_live.js:46 quotes `DEUS_Conditions.js`
- tool tools/test_hazard_torture_live.js:249 quotes `DEUS_Conditions.js`
- tool tools/test_native_survival_soak.js:82 quotes `DEUS_Conditions.js`
- tool tools/test_srd_combat_proof.js:140 quotes `DEUS_Conditions.js`
- tool tools/test_srd_equipment_proof.js:20 quotes `DEUS_Conditions.js`
- tool tools/test_srd_rules_proof.js:26 quotes `DEUS_Conditions.js`
- tool tools/test_survival_regressions.js:85 quotes `DEUS_Conditions.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_Containers.js

Source lines: 1569.
Exports:
- `UF.Containers` at game/js/plugins/DEUS_Containers.js:118
- `DEUS.Containers` at game/js/plugins/DEUS_Containers.js:119
- `UF.ItemDrag` at game/js/plugins/DEUS_Containers.js:939
- namespace object `window/root.UF` at game/js/plugins/DEUS_Containers.js:44
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Containers.js:116
- namespace object `window/root.UF` at game/js/plugins/DEUS_Containers.js:117
Engine prototype patches:
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_Containers.js:1492
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Containers.js:1505
- `Scene_Map.prototype.isAnyWindowUnderMouse` at game/js/plugins/DEUS_Containers.js:1516
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Scene_Map.prototype.createAllWindows` saved to `_Scene_Map_createAllWindows` at game/js/plugins/DEUS_Containers.js:1491
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Containers.js:1504
- `Scene_Map.prototype.isAnyWindowUnderMouse` saved to `_Scene_Map_isAnyWindowUnderMouse` at game/js/plugins/DEUS_Containers.js:1515
- `TouchInput.x` saved to `_downX` at game/js/plugins/DEUS_Containers.js:580
- `TouchInput.y` saved to `_downY` at game/js/plugins/DEUS_Containers.js:581
- `TouchInput.x` saved to `x` at game/js/plugins/DEUS_Containers.js:615
- `TouchInput.y` saved to `y` at game/js/plugins/DEUS_Containers.js:616
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Containers.js:670
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Containers.js:1412
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Containers.js:1465
Namespace property patches:
- none
Listeners and commands:
- dynamic `.on(` at game/js/plugins/DEUS_Containers.js:50 (name not a literal; unknown)
Classes:
- `Sprite_UFDragIcon` at game/js/plugins/DEUS_Containers.js:492
- `Window_UFContainerCard` at game/js/plugins/DEUS_Containers.js:978
Named functions at brace depth 0 or 1 (capped at 40):
- `containerState` at game/js/plugins/DEUS_Containers.js:123
- `reindex` at game/js/plugins/DEUS_Containers.js:132
- `resolveActiveUnit` at game/js/plugins/DEUS_Containers.js:945
module.exports assignments: game/js/plugins/DEUS_Containers.js:1528
Named consumers outside this file:
- `UF.Containers` (export, this file :118):
  - plugin game/js/plugins/DEUS_Bag.js:40 (4 code hits; lines 40,41)
  - plugin game/js/plugins/DEUS_Colonists.js:510 (12 code hits; lines 510,2109,2199,2268,2271,2280,2310,3860,3861,3865,4584,4741)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:279 (1 code hit; lines 279)
  - plugin game/js/plugins/DEUS_Items.js:344 (3 code hits; lines 344,753,760)
  - plugin game/js/plugins/DEUS_Jobs.js:679 (5 code hits; lines 679,714,753,775,1095)
  - plugin game/js/plugins/DEUS_Projects.js:484 (2 code hits; lines 484,1099)
  - plugin game/js/plugins/DEUS_Select.js:408 (4 code hits; lines 408,2856,3121,3240)
  - plugin game/js/plugins/DEUS_Sheet.js:576 (2 code hits; lines 576,2336)
  - plugin game/js/plugins/DEUS_Stockpiles.js:80 (1 code hit; lines 80)
  - tool tools/test_native_survival_soak.js:255 (1 code hit; lines 255)
  - tool tools/test_physical_inventory_proof.js:105 (1 code hit; lines 105)
  - tool tools/test_stockpiles_designation.js:189 (1 code hit; lines 189)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:444 (10); archive/plugins_uf_pre_rename/UF_Containers.js:116 (1); archive/plugins_uf_pre_rename/UF_Items.js:195 (3); archive/plugins_uf_pre_rename/UF_Jobs.js:507 (3); archive/plugins_uf_pre_rename/UF_Resources.js:51 (1); archive/plugins/DEUS_Containers.js:116 (1); archive/plugins/DEUS_Resources.js:51 (1)
- `DEUS.Containers` (export, this file :119):
  - plugin game/js/plugins/DEUS_WorldItems.js:79 (1 code hit; lines 79)
- `UF.ItemDrag` (export, this file :939):
  - plugin game/js/plugins/DEUS_Bag.js:41 (1 code hit; lines 41)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:237 (2 code hits; lines 237)
  - plugin game/js/plugins/DEUS_Sheet.js:1430 (1 code hit; lines 1430)
- `Sprite_UFDragIcon` (class, this file :492): no-call-found-after-defined-search. Not labeled dead.
- `Window_UFContainerCard` (class, this file :978): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:92 quotes `DEUS_Containers`
- plugin game/js/plugins/DEUS_Items.js:43 quotes `DEUS_Containers`
- plugin game/js/plugins/DEUS_Items.js:44 quotes `DEUS_Containers`
- tool tools/test_chest_left_click_info.js:126 quotes `DEUS_Containers.js`
- tool tools/test_duplicate_registration.js:126 quotes `DEUS_Containers`
- tool tools/test_faction_starting_gear.js:91 quotes `DEUS_Containers`
- tool tools/test_faction_starting_gear.js:138 quotes `DEUS_Containers.js`
- tool tools/test_native_survival_soak.js:76 quotes `DEUS_Containers.js`
- tool tools/test_stockpiles_designation.js:183 quotes `DEUS_Containers.js`
- tool tools/test_survival_regressions.js:79 quotes `DEUS_Containers.js`
- tool tools/world_items/test_world_items.js:640 quotes `DEUS_Containers.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_Core.js

Source lines: 661.
Exports:
- `UF.Events` at game/js/plugins/DEUS_Core.js:286
- `UF.Time` at game/js/plugins/DEUS_Core.js:482 fallback (`||`)
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Core.js:284
- namespace object `window/root.UF` at game/js/plugins/DEUS_Core.js:285
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Core.js:480
- namespace object `window/root.UF` at game/js/plugins/DEUS_Core.js:481
Engine prototype patches:
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Core.js:138
- `Scene_Title.prototype.start` at game/js/plugins/DEUS_Core.js:158
- `Scene_Map.prototype.isReady` at game/js/plugins/DEUS_Core.js:183
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_Core.js:193
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Core.js:210
- `Game_System.prototype.windowOpacity` at game/js/plugins/DEUS_Core.js:268
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Core.js:560
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_Core.js:606
- `Scene_Boot.prototype.updateDocumentTitle` at game/js/plugins/DEUS_Core.js:624
Engine object patches (not prototype):
- `DataManager.setupNewGame` at game/js/plugins/DEUS_Core.js:147
- `SceneManager.catchException` at game/js/plugins/DEUS_Core.js:250
- `SceneManager.onError` at game/js/plugins/DEUS_Core.js:257
- `DataManager.makeSaveContents` at game/js/plugins/DEUS_Core.js:503
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Core.js:526
- `DataManager.setupNewGame` at game/js/plugins/DEUS_Core.js:551
- `Graphics.printError` at game/js/plugins/DEUS_Core.js:645
Engine members read or saved:
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Core.js:137
- `Scene_Title.prototype.start` saved to `_Scene_Title_start` at game/js/plugins/DEUS_Core.js:157
- `Scene_Map.prototype.isReady` saved to `_Scene_Map_isReady` at game/js/plugins/DEUS_Core.js:181
- `Scene_Map.prototype.start` saved to `_Scene_Map_start` at game/js/plugins/DEUS_Core.js:192
- `Scene_Map.prototype.update` saved to `_Scene_Map_update_log` at game/js/plugins/DEUS_Core.js:209
- `Game_System.prototype.windowOpacity` saved to `_Game_System_windowOpacity` at game/js/plugins/DEUS_Core.js:267
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Core.js:559
- `Scene_Map.prototype.createAllWindows` saved to `_Scene_Map_createAllWindows` at game/js/plugins/DEUS_Core.js:605
- `Scene_Boot.prototype.updateDocumentTitle` saved to `_Scene_Boot_updateDocumentTitle` at game/js/plugins/DEUS_Core.js:623
- `DataManager.setupNewGame` saved to `origSetup` at game/js/plugins/DEUS_Core.js:146
- `SceneManager.catchException` saved to `_SceneManager_catchException` at game/js/plugins/DEUS_Core.js:249
- `SceneManager.onError` saved to `_SceneManager_onError` at game/js/plugins/DEUS_Core.js:256
- `DataManager.makeSaveContents` saved to `_DataManager_makeSaveContents` at game/js/plugins/DEUS_Core.js:502
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Core.js:525
- `DataManager.setupNewGame` saved to `_DataManager_setupNewGame` at game/js/plugins/DEUS_Core.js:550
- `Graphics.printError` saved to `_Graphics_printError` at game/js/plugins/DEUS_Core.js:644
Namespace property patches:
- `UF.Time.ticksPerMinute` at game/js/plugins/DEUS_Core.js:483
- `UF.Time.ticksPerHour` at game/js/plugins/DEUS_Core.js:484
- `UF.Time.ticksPerDay` at game/js/plugins/DEUS_Core.js:485
- `UF.Time.ticksForMinutes` at game/js/plugins/DEUS_Core.js:486
- `UF.Time.ticksForHours` at game/js/plugins/DEUS_Core.js:487
- `UF.Time.ticksForDays` at game/js/plugins/DEUS_Core.js:488
- `UF.Time.minutesFromTicks` at game/js/plugins/DEUS_Core.js:489
- `UF.Time.hoursFromTicks` at game/js/plugins/DEUS_Core.js:490
- `UF.Time.daysFromTicks` at game/js/plugins/DEUS_Core.js:491
- `UF.Time.ticksForGameMinutes` at game/js/plugins/DEUS_Core.js:492
- `UF.Time.ticksForGameHours` at game/js/plugins/DEUS_Core.js:493
- `UF.Time.ticksForGameDays` at game/js/plugins/DEUS_Core.js:494
- `UF.Time.gameMinutesFromTicks` at game/js/plugins/DEUS_Core.js:495
- `UF.Time.gameHoursFromTicks` at game/js/plugins/DEUS_Core.js:496
- `UF.Time.gameDaysFromTicks` at game/js/plugins/DEUS_Core.js:497
Listeners and commands:
- `on` `"world:initializing"` at game/js/plugins/DEUS_Core.js:142
- `on` `"world:created"` at game/js/plugins/DEUS_Core.js:143
- `on` `"world:areaBuilt"` at game/js/plugins/DEUS_Core.js:144
- `addEventListener` `"error"` at game/js/plugins/DEUS_Core.js:630
- `registerCommand` `"SetTime"` at game/js/plugins/DEUS_Core.js:614
- `registerCommand` `"AddTime"` at game/js/plugins/DEUS_Core.js:618
Classes:
- `Game_UFTime` at game/js/plugins/DEUS_Core.js:324
- `Window_UFClockHUD` at game/js/plugins/DEUS_Core.js:572
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- `UF.Events` (export, this file :286):
  - plugin game/js/plugins/DEUS_Anim.js:124 (7 code hits; lines 124,1700,1702,1703)
  - plugin game/js/plugins/DEUS_Camera.js:118 (3 code hits; lines 118,119)
  - plugin game/js/plugins/DEUS_Colonists.js:164 (21 code hits; lines 164,3079,3080,5854,5858,5859,5860,5861,5862,5863,5864,5865)
  - plugin game/js/plugins/DEUS_Combat.js:159 (13 code hits; lines 159,1961,1963,1966,2604,2605,3100,3113,3179,3180)
  - plugin game/js/plugins/DEUS_Conditions.js:70 (9 code hits; lines 70,71,1174,1175,1181,1182,1183)
  - plugin game/js/plugins/DEUS_Containers.js:47 (6 code hits; lines 47,50)
  - plugin game/js/plugins/DEUS_DeathForensics.js:394 (4 code hits; lines 394,462,535)
  - plugin game/js/plugins/DEUS_Depth.js:1701 (5 code hits; lines 1701,2467,2535,2581,2663)
  - plugin game/js/plugins/DEUS_Doors.js:50 (9 code hits; lines 50,572,574,575,579,613,614)
  - plugin game/js/plugins/DEUS_Ecology.js:73 (9 code hits; lines 73,940,942,943,946,959,960)
  - plugin game/js/plugins/DEUS_Environment.js:80 (6 code hits; lines 80,81,806,807)
  - plugin game/js/plugins/DEUS_Factions.js:70 (10 code hits; lines 70,592,593,594,601,611,619)
  - plugin game/js/plugins/DEUS_Fire.js:84 (16 code hits; lines 84,1369,1371,1372,1467,1608,1611,1759)
  - plugin game/js/plugins/DEUS_Floors.js:78 (11 code hits; lines 78,759,761,762,763,764,765,766,776)
  - plugin game/js/plugins/DEUS_History.js:187 (16 code hits; lines 187,3168,3169,3467,3468,3746,3748,4189,4195)
  - plugin game/js/plugins/DEUS_Interact.js:105 (3 code hits; lines 105)
  - plugin game/js/plugins/DEUS_Items.js:55 (6 code hits; lines 55,76)
  - plugin game/js/plugins/DEUS_Jobs.js:74 (11 code hits; lines 74,2005,2027,2029,2033,2145,2356)
  - plugin game/js/plugins/DEUS_Levels.js:288 (19 code hits; lines 288,5554,5555,5563,5564,5565,5572,5575,6139,6140,6143,6144)
  - plugin game/js/plugins/DEUS_Look.js:60 (3 code hits; lines 60)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:195 (7 code hits; lines 195,227,277,278,279)
  - plugin game/js/plugins/DEUS_Objects.js:64 (12 code hits; lines 64,1192,1194,1198,1202,1219,1220,1419,1421,1440)
  - plugin game/js/plugins/DEUS_Ownership.js:62 (10 code hits; lines 62,563,565,566,567,568,576,577)
  - plugin game/js/plugins/DEUS_Projects.js:154 (14 code hits; lines 154,1609,1612,1613,1734,1772)
  - plugin game/js/plugins/DEUS_Select.js:381 (4 code hits; lines 381,382,1674)
  - plugin game/js/plugins/DEUS_Sheet.js:206 (6 code hits; lines 206,2540,2541)
  - plugin game/js/plugins/DEUS_Speech.js:239 (7 code hits; lines 239,1237,1320)
  - plugin game/js/plugins/DEUS_Stockpiles.js:67 (6 code hits; lines 67,68,72,73)
  - plugin game/js/plugins/DEUS_Structural.js:511 (10 code hits; lines 511,766,767,768,769,770,772)
  - plugin game/js/plugins/DEUS_Talk.js:119 (3 code hits; lines 119)
  - plugin game/js/plugins/DEUS_Taming.js:237 (3 code hits; lines 237,238)
  - plugin game/js/plugins/DEUS_Tiles.js:1282 (3 code hits; lines 1282)
  - plugin game/js/plugins/DEUS_TimeSpeed.js:59 (7 code hits; lines 59,460,461,550,551)
  - plugin game/js/plugins/DEUS_Wildlife.js:94 (12 code hits; lines 94,1055,2326,2327,2328,2333,2334,2341)
  - plugin game/js/plugins/DEUS_World.js:161 (23 code hits; lines 161,785,1859,1860,1861,1862,1863,1864,1865,1877,4146,4147)
  - plugin game/js/plugins/UF_Households.js:42 (11 code hits; lines 42,1047,1049,1050,1051,1052,1053,1054,1059,1060)
  - plugin game/js/plugins/UF_Time.js:56 (7 code hits; lines 56,582,583,584)
  - tool tools/fixtures/UF_SocietyRuntime.js:83 (1 code hit; lines 83)
  - tool tools/fixtures/UF_ZIntegration.js:64 (1 code hit; lines 64)
  - tool tools/sim/test_fluid_attach.js:272 (1 code hit; lines 272)
  - tool tools/sim/test_living_world_rules.js:769 (1 code hit; lines 769)
  - tool tools/taming_party/test_tamed_party_combat.js:622 (1 code hit; lines 622)
  - tool tools/test_agriculture.js:40 (3 code hits; lines 40,72)
  - tool tools/test_autonomous_project_dispatch.js:88 (3 code hits; lines 88,255,257)
  - tool tools/test_autonomous_settlement_closure.js:91 (6 code hits; lines 91,209,284,289,296,314)
  - tool tools/test_autonomous_work_recovery.js:84 (2 code hits; lines 84,295)
  - tool tools/test_build_vertical.js:318 (4 code hits; lines 318,377,725,802)
  - tool tools/test_callings_system.js:293 (1 code hit; lines 293)
  - tool tools/test_collapse_ingame.js:165 (5 code hits; lines 165,167,168,191,192)
  - tool tools/test_column_landforms.js:480 (4 code hits; lines 480,481,487,488)
  - tool tools/test_combat_dying_integration.js:211 (1 code hit; lines 211)
  - tool tools/test_conditions_native_closure.js:78 (4 code hits; lines 78,208,294,323)
  - tool tools/test_culture_growth.js:80 (4 code hits; lines 80,154,164,214)
  - tool tools/test_ecology.js:117 (3 code hits; lines 117,124,160)
  - tool tools/test_faction_founder_pairbonding.js:172 (1 code hit; lines 172)
  - tool tools/test_faction_reproduction.js:199 (3 code hits; lines 199,247,389)
  - tool tools/test_family_integration.js:155 (1 code hit; lines 155)
  - tool tools/test_goals.js:33 (1 code hit; lines 33)
  - tool tools/test_hazard_reflex.js:90 (6 code hits; lines 90,225,226,367,368,393)
  - tool tools/test_hazard_torture_live.js:92 (8 code hits; lines 92,265,266,267,460,461,462,491)
  - tool tools/test_hearth_containment_and_provenance.js:238 (1 code hit; lines 238)
  - tool tools/test_lazy_area_generation.js:358 (4 code hits; lines 358,412)
  - tool tools/test_liquid_depth_simulation.js:134 (1 code hit; lines 134)
  - tool tools/test_material_refining_and_tech_pacing.js:150 (1 code hit; lines 150)
  - tool tools/test_multi_deficit_settlement.js:74 (1 code hit; lines 74)
  - tool tools/test_native_survival_soak.js:311 (11 code hits; lines 311,312,322,323,341,342,343,344)
  - tool tools/test_natural_connections_no_mint.js:320 (1 code hit; lines 320)
  - tool tools/test_project_construction_loop.js:87 (6 code hits; lines 87,287,288,289,328,329)
  - tool tools/test_regrowth_construction_guard.js:220 (1 code hit; lines 220)
  - tool tools/test_sanitation_system.js:257 (7 code hits; lines 257,261,294,355,401,445,483)
  - tool tools/test_settlement_domestic_housing.js:96 (10 code hits; lines 96,253,327,331,332,333,334,335,336,385)
  - tool tools/test_settlement_expansion_multi_dwelling.js:87 (7 code hits; lines 87,303,308,315,320,323,344)
  - tool tools/test_settlement_projects.js:84 (9 code hits; lines 84,189,253,272,274,330)
  - tool tools/test_sim_tick.js:150 (3 code hits; lines 150,225)
  - tool tools/test_srd_combat_proof.js:103 (3 code hits; lines 103,287,306)
  - tool tools/test_stabilization.js:75 (5 code hits; lines 75,214,218,219,220)
  - tool tools/test_strata_cuts_and_caves.js:548 (3 code hits; lines 548,899)
  - tool tools/test_strata_fluid_reconciliation.js:174 (1 code hit; lines 174)
  - tool tools/test_strata_foundation.js:356 (2 code hits; lines 356,938)
  - tool tools/test_structural_levels.js:891 (3 code hits; lines 891,901,905)
  - tool tools/test_structural_runtime.js:288 (4 code hits; lines 288,292,329,406)
  - tool tools/test_survival_needs_loop.js:84 (6 code hits; lines 84,251,252,253,328,330)
  - tool tools/test_vertical_worldgen_proof.js:131 (3 code hits; lines 131,134,600)
  - tool tools/test_z_fire.js:138 (2 code hits; lines 138,141)
  - tool tools/test_z_floors.js:62 (1 code hit; lines 62)
  - tool tools/test_z_ownership.js:63 (2 code hits; lines 63,129)
  - tool tools/zrange/test_switch_depth2.js:140 (1 code hit; lines 140)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:38 (5); archive/plugins_uf_pre_rename/UF_Anim.js:114 (7); archive/plugins_uf_pre_rename/UF_Camera.js:72 (3); archive/plugins_uf_pre_rename/UF_Colonists.js:117 (14); archive/plugins_uf_pre_rename/UF_Combat.js:130 (12); archive/plugins_uf_pre_rename/UF_Conditions.js:37 (3); archive/plugins_uf_pre_rename/UF_Construction.js:42 (3); archive/plugins_uf_pre_rename/UF_Containers.js:47 (6); archive/plugins_uf_pre_rename/UF_Core.js:276 (6); archive/plugins_uf_pre_rename/UF_Crafting.js:289 (2); archive/plugins_uf_pre_rename/UF_CultureGrowth.js:53 (8); archive/plugins_uf_pre_rename/UF_Doors.js:50 (9); archive/plugins_uf_pre_rename/UF_Ecology.js:73 (9); archive/plugins_uf_pre_rename/UF_Environment.js:78 (6); archive/plugins_uf_pre_rename/UF_Factions.js:70 (10); archive/plugins_uf_pre_rename/UF_Fire.js:67 (16); archive/plugins_uf_pre_rename/UF_Floors.js:53 (11); archive/plugins_uf_pre_rename/UF_Goals.js:461 (11); archive/plugins_uf_pre_rename/UF_History.js:132 (13); archive/plugins_uf_pre_rename/UF_Households.js:41 (11); archive/plugins_uf_pre_rename/UF_Interact.js:103 (3); archive/plugins_uf_pre_rename/UF_Items.js:46 (6); archive/plugins_uf_pre_rename/UF_Jobs.js:72 (8); archive/plugins_uf_pre_rename/UF_Levels.js:132 (15); archive/plugins_uf_pre_rename/UF_Look.js:60 (3); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:187 (10); archive/plugins_uf_pre_rename/UF_Objects.js:57 (12); archive/plugins_uf_pre_rename/UF_Outposts.js:65 (3); archive/plugins_uf_pre_rename/UF_Ownership.js:62 (10); archive/plugins_uf_pre_rename/UF_Proficiency.js:50 (5); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:405 (3); archive/plugins_uf_pre_rename/UF_Resources.js:43 (6); archive/plugins_uf_pre_rename/UF_Rules.js:47 (3); archive/plugins_uf_pre_rename/UF_Select.js:122 (3); archive/plugins_uf_pre_rename/UF_Sheet.js:110 (3); archive/plugins_uf_pre_rename/UF_Skills.js:60 (21); archive/plugins_uf_pre_rename/UF_Speech.js:239 (7); archive/plugins_uf_pre_rename/UF_Talk.js:119 (3); archive/plugins_uf_pre_rename/UF_Tiles.js:1270 (3); archive/plugins_uf_pre_rename/UF_Time.js:56 (8); archive/plugins_uf_pre_rename/UF_TimeSpeed.js:59 (7); archive/plugins_uf_pre_rename/UF_Wildlife.js:60 (6); archive/plugins_uf_pre_rename/UF_World.js:146 (15); archive/plugins/DEUS_Agriculture.js:38 (5); archive/plugins/DEUS_Conditions.js:37 (3); archive/plugins/DEUS_Construction.js:42 (3); archive/plugins/DEUS_Containers.js:47 (6); archive/plugins/DEUS_Crafting.js:289 (2); archive/plugins/DEUS_CultureGrowth.js:53 (8); archive/plugins/DEUS_Goals.js:461 (11); archive/plugins/DEUS_Households.js:41 (11); archive/plugins/DEUS_Outposts.js:65 (3); archive/plugins/DEUS_Proficiency.js:50 (5); archive/plugins/DEUS_ProfileTabs.js:405 (3); archive/plugins/DEUS_Resources.js:43 (6); archive/plugins/DEUS_Rules.js:47 (3); archive/plugins/DEUS_Select.js:122 (3); archive/plugins/DEUS_Skills.js:60 (21); archive/plugins/DEUS_Time.js:56 (8)
- `UF.Time` (export, fallback at :482): callers of this name are indexed under game/js/plugins/DEUS_Test.js:64, game/js/plugins/DEUS_TimeSpeed.js:144, game/js/plugins/UF_Time.js:569. Also assigned or declared in game/js/plugins/DEUS_Test.js:64, game/js/plugins/DEUS_TimeSpeed.js:144, game/js/plugins/UF_Time.js:569. A hit names the identifier; it does not prove which assignment ran. Not labeled dead.
- `Game_UFTime` (class, this file :324):
  - tool tools/governance/fixtures/invariants/INV-SIM-01/game/js/plugins/DEUS_Core.js:1 (1 code hit; lines 1)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Core.js:296 (2)
- `Window_UFClockHUD` (class, this file :572):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Core.js:428 (1)
Unqualified property names (length >= 10; may be a different binding):
- `ticksPerMinute` from `UF.Time.ticksPerMinute` at :483: plugin game/js/plugins/DEUS_Colonists.js:195 (8); plugin game/js/plugins/DEUS_TimeSpeed.js:101 (3); tool tools/test_autonomous_work_recovery.js:193 (2); tool tools/test_conditions_native_closure.js:155 (2); tool tools/test_hazard_reflex.js:169 (2); tool tools/test_hazard_torture_live.js:209 (2); tool tools/test_settlement_domestic_housing.js:233 (1); tool tools/test_settlement_expansion_multi_dwelling.js:215 (1)
- `ticksPerHour` from `UF.Time.ticksPerHour` at :484: plugin game/js/plugins/DEUS_Colonists.js:191 (9); plugin game/js/plugins/DEUS_TimeSpeed.js:100 (3); tool tools/test_autonomous_work_recovery.js:193 (2); tool tools/test_conditions_native_closure.js:155 (2); tool tools/test_hazard_reflex.js:169 (2); tool tools/test_hazard_torture_live.js:209 (2); tool tools/test_settlement_domestic_housing.js:233 (1); tool tools/test_settlement_expansion_multi_dwelling.js:215 (1)
- `ticksPerDay` from `UF.Time.ticksPerDay` at :485: plugin game/js/plugins/DEUS_TimeSpeed.js:102 (3); sim game/js/sim/decay/validate.js:181 (1); tool tools/test_autonomous_work_recovery.js:193 (1); tool tools/test_conditions_native_closure.js:155 (1); tool tools/test_hazard_reflex.js:169 (1); tool tools/test_hazard_torture_live.js:209 (1)
- `ticksForMinutes` from `UF.Time.ticksForMinutes` at :486: plugin game/js/plugins/DEUS_Colonists.js:203 (3); plugin game/js/plugins/DEUS_TimeSpeed.js:103 (3); tool tools/test_autonomous_work_recovery.js:194 (1); tool tools/test_conditions_native_closure.js:156 (1); tool tools/test_hazard_reflex.js:170 (1); tool tools/test_hazard_torture_live.js:210 (1)
- `ticksForHours` from `UF.Time.ticksForHours` at :487: plugin game/js/plugins/DEUS_Colonists.js:199 (6); plugin game/js/plugins/DEUS_TimeSpeed.js:104 (3); tool tools/test_autonomous_work_recovery.js:194 (2); tool tools/test_conditions_native_closure.js:156 (2); tool tools/test_hazard_reflex.js:170 (2); tool tools/test_hazard_torture_live.js:210 (2); tool tools/test_settlement_domestic_housing.js:233 (1); tool tools/test_settlement_expansion_multi_dwelling.js:215 (1)
- `ticksForDays` from `UF.Time.ticksForDays` at :488: plugin game/js/plugins/DEUS_TimeSpeed.js:105 (3)
- `minutesFromTicks` from `UF.Time.minutesFromTicks` at :489: plugin game/js/plugins/DEUS_TimeSpeed.js:106 (3)
- `hoursFromTicks` from `UF.Time.hoursFromTicks` at :490: plugin game/js/plugins/DEUS_TimeSpeed.js:107 (3); tool tools/test_autonomous_work_recovery.js:194 (1); tool tools/test_conditions_native_closure.js:156 (1); tool tools/test_hazard_reflex.js:170 (1); tool tools/test_hazard_torture_live.js:210 (1)
- `daysFromTicks` from `UF.Time.daysFromTicks` at :491: plugin game/js/plugins/DEUS_TimeSpeed.js:108 (3)
- `ticksForGameMinutes` from `UF.Time.ticksForGameMinutes` at :492: plugin game/js/plugins/DEUS_TimeSpeed.js:109 (3)
- `ticksForGameHours` from `UF.Time.ticksForGameHours` at :493: plugin game/js/plugins/DEUS_TimeSpeed.js:110 (3)
- `ticksForGameDays` from `UF.Time.ticksForGameDays` at :494: plugin game/js/plugins/DEUS_TimeSpeed.js:111 (3)
- `gameMinutesFromTicks` from `UF.Time.gameMinutesFromTicks` at :495: plugin game/js/plugins/DEUS_TimeSpeed.js:112 (3)
- `gameHoursFromTicks` from `UF.Time.gameHoursFromTicks` at :496: plugin game/js/plugins/DEUS_TimeSpeed.js:113 (3)
- `gameDaysFromTicks` from `UF.Time.gameDaysFromTicks` at :497: plugin game/js/plugins/DEUS_TimeSpeed.js:114 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:12 quotes `DEUS_Core`
- tool tools/capture_pre_migration_baseline.js:106 quotes `DEUS_Core.js`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_Core`
- tool tools/performance/census_boot_load.js:64 quotes `DEUS_Core.js`
- tool tools/profile_live_frames.js:228 quotes `DEUS_Core.js`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_Core`
- tool tools/sim/test_underground_year0.js:30 quotes `DEUS_Core`
- tool tools/society/test_person_identity.js:31 quotes `DEUS_Core`
- tool tools/test_build_vertical.js:268 quotes `DEUS_Core.js`
- tool tools/test_combat_dying_integration.js:132 quotes `DEUS_Core.js`
- tool tools/test_combat_dying_integration.js:151 quotes `DEUS_Core.js`
- tool tools/test_control_board.js:275 quotes `DEUS_Core.js`
- tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:183 quotes `DEUS_Core.js`
- tool tools/test_duplicate_registration.js:166 quotes `DEUS_Core.js`
- tool tools/test_generated_z2_cut_proof.js:350 quotes `DEUS_Core.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_Core`
- tool tools/test_lazy_area_generation.js:31 quotes `DEUS_Core`
- tool tools/test_native_survival_soak.js:224 quotes `DEUS_Core.js`
- tool tools/test_natural_connections_no_mint.js:173 quotes `DEUS_Core.js`
- tool tools/test_new_game_year0.js:39 quotes `DEUS_Core`
- tool tools/test_new_game_year0.js:318 quotes `DEUS_Core`
- tool tools/test_region_seam_continuity.js:204 quotes `DEUS_Core.js`
- tool tools/test_sim_tick.js:32 quotes `DEUS_Core`
- tool tools/test_sim_tick.js:99 quotes `DEUS_Core`
- tool tools/test_sim_tick.js:104 quotes `DEUS_Core`
- tool tools/test_sim_tick.js:485 quotes `DEUS_Core`
- tool tools/test_strata_cuts_and_caves.js:306 quotes `DEUS_Core.js`
- tool tools/test_strata_fluid_reconciliation.js:122 quotes `DEUS_Core.js`
- tool tools/test_strata_foundation.js:251 quotes `DEUS_Core.js`
- tool tools/test_structural_levels.js:700 quotes `DEUS_Core.js`
- tool tools/test_structural_runtime.js:268 quotes `DEUS_Core.js`
- tool tools/test_structure_fluid.js:170 quotes `DEUS_Core.js`
- tool tools/test_survival_regressions.js:255 quotes `DEUS_Core.js`
- tool tools/test_volumetric_terrain_column.js:236 quotes `DEUS_Core.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:35 quotes `DEUS_Core`
- tool tools/worldgen/test_vertical_biome_coupling.js:36 quotes `DEUS_Core`
- archive quotes omitted from the live list (2 hits)

## DEUS_Culling.js

Source lines: 532.
Exports:
- `UF.Culling` at game/js/plugins/DEUS_Culling.js:312
- `UF.Camera` at game/js/plugins/DEUS_Culling.js:414
- `UF.Camera` at game/js/plugins/DEUS_Culling.js:527
- namespace object `window/root.UF` at game/js/plugins/DEUS_Culling.js:55
Engine prototype patches:
- `Sprite_Character.prototype.update` at game/js/plugins/DEUS_Culling.js:335
- `Sprite_Character.prototype.setCharacter` at game/js/plugins/DEUS_Culling.js:347
- `Sprite_Character.prototype.destroy` at game/js/plugins/DEUS_Culling.js:354
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Culling.js:360
- `Spriteset_Map.prototype.findTargetSprite` at game/js/plugins/DEUS_Culling.js:364
- `Spriteset_Map.prototype.destroy` at game/js/plugins/DEUS_Culling.js:371
- `Sprite_Balloon.prototype.update` at game/js/plugins/DEUS_Culling.js:376
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Culling.js:390
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_Culling.js:396
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Sprite_Character.prototype.update` saved to `characterUpdate` at game/js/plugins/DEUS_Culling.js:334
- `Sprite_Character.prototype.setCharacter` saved to `setCharacter` at game/js/plugins/DEUS_Culling.js:346
- `Sprite_Character.prototype.destroy` saved to `destroyCharacter` at game/js/plugins/DEUS_Culling.js:353
- `Spriteset_Map.prototype.update` saved to `spritesetUpdate` at game/js/plugins/DEUS_Culling.js:359
- `Spriteset_Map.prototype.findTargetSprite` saved to `findTargetSprite` at game/js/plugins/DEUS_Culling.js:363
- `Spriteset_Map.prototype.destroy` saved to `spritesetDestroy` at game/js/plugins/DEUS_Culling.js:370
- `Sprite_Balloon.prototype.update` saved to `balloonUpdate` at game/js/plugins/DEUS_Culling.js:375
- `Scene_Boot.prototype.start` saved to `bootStart` at game/js/plugins/DEUS_Culling.js:389
- `Scene_Map.prototype.start` saved to `mapStart` at game/js/plugins/DEUS_Culling.js:395
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Culling.js:301
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `view` at game/js/plugins/DEUS_Culling.js:64
- `inside` at game/js/plugins/DEUS_Culling.js:82
- `bucketKey` at game/js/plugins/DEUS_Culling.js:88
- `axisBuckets` at game/js/plugins/DEUS_Culling.js:97
- `unlink` at game/js/plugins/DEUS_Culling.js:111
- `index` at game/js/plugins/DEUS_Culling.js:118
- `moved` at game/js/plugins/DEUS_Culling.js:129
- `detach` at game/js/plugins/DEUS_Culling.js:150
- `register` at game/js/plugins/DEUS_Culling.js:159
- `place` at game/js/plugins/DEUS_Culling.js:171
- `makeOwner` at game/js/plugins/DEUS_Culling.js:192
- `refresh` at game/js/plugins/DEUS_Culling.js:222
- `release` at game/js/plugins/DEUS_Culling.js:259
- `withActiveSprites` at game/js/plugins/DEUS_Culling.js:276
- `withAllSprites` at game/js/plugins/DEUS_Culling.js:286
- `installLifecycle` at game/js/plugins/DEUS_Culling.js:294
- `registerChecks` at game/js/plugins/DEUS_Culling.js:401
Named consumers outside this file:
- `UF.Culling` (export, this file :312):
  - plugin game/js/plugins/DEUS_Depth.js:1403 (1 code hit; lines 1403)
  - plugin game/js/plugins/DEUS_Test.js:546 (1 code hit; lines 546)
  - tool tools/bench_viewport_culling.js:62 (14 code hits; lines 62,70,78,79,172,186,200,206,211)
  - tool tools/occlusion/bench_occlusion.js:85 (3 code hits; lines 85,97)
  - tool tools/occlusion/live_occlusion.js:84 (4 code hits; lines 84,118,150)
- `UF.Camera` (export, this file :527): Also assigned or declared in game/js/plugins/DEUS_Camera.js:165. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Anim.js:1896 (10 code hits; lines 1896,2021,2602,2657,2707)
  - plugin game/js/plugins/DEUS_Camera.js:165 (1 code hit; lines 165)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:596 (2 code hits; lines 596)
  - plugin game/js/plugins/DEUS_Combat.js:2569 (10 code hits; lines 2569,2632,3134,3149,3184)
  - plugin game/js/plugins/DEUS_DayNight.js:347 (3 code hits; lines 347,580)
  - plugin game/js/plugins/DEUS_Depth.js:89 (13 code hits; lines 89,94,99,104,759)
  - plugin game/js/plugins/DEUS_Fire.js:1062 (12 code hits; lines 1062,1409,1469,1744,1756,1772)
  - plugin game/js/plugins/DEUS_Fog.js:555 (11 code hits; lines 555,792,794,798,803)
  - plugin game/js/plugins/DEUS_History.js:3840 (6 code hits; lines 3840,3844,3856,3922)
  - plugin game/js/plugins/DEUS_Interact.js:971 (2 code hits; lines 971)
  - plugin game/js/plugins/DEUS_Items.js:1466 (13 code hits; lines 1466,1654,1674,1763,1781,1845)
  - plugin game/js/plugins/DEUS_Jobs.js:2131 (4 code hits; lines 2131,2362)
  - plugin game/js/plugins/DEUS_Levels.js:4995 (4 code hits; lines 4995,5614,5887)
  - plugin game/js/plugins/DEUS_Look.js:593 (8 code hits; lines 593,654,686,739)
  - plugin game/js/plugins/DEUS_Objects.js:896 (13 code hits; lines 896,1289,1312,1485,1496,1522)
  - plugin game/js/plugins/DEUS_Select.js:1849 (16 code hits; lines 1849,1894,1965,1996,2027,2081,3404,3933)
  - plugin game/js/plugins/DEUS_Sheet.js:2607 (1 code hit; lines 2607)
  - plugin game/js/plugins/DEUS_Speech.js:779 (1 code hit; lines 779)
  - plugin game/js/plugins/DEUS_Stance.js:803 (13 code hits; lines 803,804,916,947,953,954,956,974,1044)
  - plugin game/js/plugins/DEUS_Talk.js:117 (1 code hit; lines 117)
  - plugin game/js/plugins/DEUS_Test.js:544 (1 code hit; lines 544)
  - plugin game/js/plugins/DEUS_Tiles.js:1463 (10 code hits; lines 1463,1467,1471,1477,1502)
  - plugin game/js/plugins/DEUS_Wildlife.js:2559 (6 code hits; lines 2559,2839,2855)
  - plugin game/js/plugins/DEUS_World.js:4071 (7 code hits; lines 4071,4072,4135,4622)
  - plugin game/js/plugins/DEUS_WorldGen.js:2399 (11 code hits; lines 2399,2403,2535,2537,2545)
  - tool tools/bench_viewport_culling.js:71 (10 code hits; lines 71,121,219,220,221,233)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:274 (3 code hits; lines 274)
  - tool tools/fixtures/UF_ZFlora.js:75 (2 code hits; lines 75)
  - tool tools/test_camera_zoom.js:46 (1 code hit; lines 46)
  - tool tools/test_zoom_depth_coverage.js:119 (1 code hit; lines 119)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:1878 (10); archive/plugins_uf_pre_rename/UF_Camera.js:79 (1); archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:492 (2); archive/plugins_uf_pre_rename/UF_Combat.js:1745 (10); archive/plugins_uf_pre_rename/UF_DayNight.js:341 (3); archive/plugins_uf_pre_rename/UF_Fire.js:907 (12); archive/plugins_uf_pre_rename/UF_Fog.js:528 (11); archive/plugins_uf_pre_rename/UF_History.js:3397 (6); archive/plugins_uf_pre_rename/UF_Interact.js:915 (2); archive/plugins_uf_pre_rename/UF_Items.js:1049 (13); archive/plugins_uf_pre_rename/UF_Jobs.js:1483 (4); archive/plugins_uf_pre_rename/UF_Levels.js:2061 (4); archive/plugins_uf_pre_rename/UF_Look.js:591 (8); archive/plugins_uf_pre_rename/UF_Objects.js:707 (13); archive/plugins_uf_pre_rename/UF_Roads.js:790 (4); archive/plugins_uf_pre_rename/UF_Select.js:1212 (12); archive/plugins_uf_pre_rename/UF_Sheet.js:1657 (1); archive/plugins_uf_pre_rename/UF_Skills.js:850 (6); archive/plugins_uf_pre_rename/UF_Speech.js:777 (1); archive/plugins_uf_pre_rename/UF_Stance.js:738 (13); archive/plugins_uf_pre_rename/UF_Talk.js:117 (1); archive/plugins_uf_pre_rename/UF_Tiles.js:1449 (10); archive/plugins_uf_pre_rename/UF_Wildlife.js:1498 (6); archive/plugins_uf_pre_rename/UF_World.js:2608 (7); archive/plugins_uf_pre_rename/UF_WorldGen.js:1613 (11); archive/plugins/DEUS_Roads.js:791 (4); archive/plugins/DEUS_Select.js:1212 (12); archive/plugins/DEUS_Skills.js:851 (6)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:210 quotes `DEUS_Culling`
- tool tools/bench_viewport_culling.js:319 quotes `DEUS_Culling`
- tool tools/bench_viewport_culling.js:321 quotes `DEUS_Culling`
- tool tools/test_culling_native.js:49 quotes `DEUS_Culling`
- tool tools/test_culling_native.js:51 quotes `DEUS_Culling`

## DEUS_DayNight.js

Source lines: 664.
Exports:
- `UF.DayNight` at game/js/plugins/DEUS_DayNight.js:115
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_DayNight.js:113
- namespace object `window/root.UF` at game/js/plugins/DEUS_DayNight.js:114
Engine prototype patches:
- `Game_Screen.prototype.update` at game/js/plugins/DEUS_DayNight.js:121
- `Spriteset_Map.prototype.createUpperLayer` at game/js/plugins/DEUS_DayNight.js:462
- `Scene_Map.prototype.createDisplayObjects` at game/js/plugins/DEUS_DayNight.js:471
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_DayNight.js:481
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_Screen.prototype.update` saved to `_Game_Screen_update` at game/js/plugins/DEUS_DayNight.js:120
- `Spriteset_Map.prototype.createUpperLayer` saved to `_Spriteset_Map_createUpperLayer` at game/js/plugins/DEUS_DayNight.js:461
- `Scene_Map.prototype.createDisplayObjects` saved to `_Scene_Map_createDisplayObjects` at game/js/plugins/DEUS_DayNight.js:470
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_DayNight.js:480
Namespace property patches:
- `UF.Fog.observers` at game/js/plugins/DEUS_DayNight.js:134
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `Sprite_UFClock` at game/js/plugins/DEUS_DayNight.js:146
- `Sprite_UFGlowLayer` at game/js/plugins/DEUS_DayNight.js:192
Named functions at brace depth 0 or 1 (capped at 40):
- `registerChecks` at game/js/plugins/DEUS_DayNight.js:486
Named consumers outside this file:
- `UF.DayNight` (export, this file :115):
  - plugin game/js/plugins/DEUS_Colonists.js:4346 (18 code hits; lines 4346,4586,4831,4882,5043,5117)
  - plugin game/js/plugins/DEUS_Environment.js:62 (1 code hit; lines 62)
  - plugin game/js/plugins/DEUS_Wildlife.js:753 (3 code hits; lines 753,1695,2677)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:3377 (18); archive/plugins_uf_pre_rename/UF_DayNight.js:114 (1); archive/plugins_uf_pre_rename/UF_Environment.js:60 (1); archive/plugins_uf_pre_rename/UF_Wildlife.js:655 (2)
- `Sprite_UFClock` (class, this file :146):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_DayNight.js:145 (3)
- `Sprite_UFGlowLayer` (class, this file :192):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_DayNight.js:190 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:187 quotes `DEUS_DayNight`
- tool tools/register_world_plugins.js:15 quotes `DEUS_DayNight`
- tool tools/run_all_suites.js:24 quotes `DEUS_DayNight`
- tool tools/zrange/scan_z_literals.js:20 quotes `DEUS_DayNight`
- archive quotes omitted from the live list (2 hits)

## DEUS_DeathForensics.js

Source lines: 545.
Exports:
- `UF.DeathForensics` at game/js/plugins/DEUS_DeathForensics.js:444
- `UF.Forensics` at game/js/plugins/DEUS_DeathForensics.js:445
- `DEUS.DeathForensics` at game/js/plugins/DEUS_DeathForensics.js:446
- namespace object `window/root.UF` at game/js/plugins/DEUS_DeathForensics.js:428
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_DeathForensics.js:429
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- `UF.Colonists.deathLedger` at game/js/plugins/DEUS_DeathForensics.js:451
- `UF.Colonists.mortalitySummary` at game/js/plugins/DEUS_DeathForensics.js:452
- `UF.Colonists.recordEvent` at game/js/plugins/DEUS_DeathForensics.js:453
- `UF.Colonists.recentEvents` at game/js/plugins/DEUS_DeathForensics.js:454
- `UF.Colonists.resetDeathLedger` at game/js/plugins/DEUS_DeathForensics.js:455
Listeners and commands:
- `on` `"colonists:died"` at game/js/plugins/DEUS_DeathForensics.js:465
- `on` `"combat:kill"` at game/js/plugins/DEUS_DeathForensics.js:468
- `on` `"colonists:dying"` at game/js/plugins/DEUS_DeathForensics.js:471
- `on` `"colonists:stabilized"` at game/js/plugins/DEUS_DeathForensics.js:476
- `on` `"colonists:conscious"` at game/js/plugins/DEUS_DeathForensics.js:481
- `on` `"colonists:exhaustion"` at game/js/plugins/DEUS_DeathForensics.js:486
- `on` `"combat:hit"` at game/js/plugins/DEUS_DeathForensics.js:491
- `on` `"jobs:done"` at game/js/plugins/DEUS_DeathForensics.js:498
- `on` `"jobs:failed"` at game/js/plugins/DEUS_DeathForensics.js:516
- `on` `"world:unitMoved"` at game/js/plugins/DEUS_DeathForensics.js:523
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `ticks` at game/js/plugins/DEUS_DeathForensics.js:55
- `gameDay` at game/js/plugins/DEUS_DeathForensics.js:60
- `gameTimeStr` at game/js/plugins/DEUS_DeathForensics.js:70
- `copyArea` at game/js/plugins/DEUS_DeathForensics.js:87
- `zOf` at game/js/plugins/DEUS_DeathForensics.js:91
- `recordEvent` at game/js/plugins/DEUS_DeathForensics.js:102
- `recentEvents` at game/js/plugins/DEUS_DeathForensics.js:128
- `updateSafePosition` at game/js/plugins/DEUS_DeathForensics.js:135
- `getSafePosition` at game/js/plugins/DEUS_DeathForensics.js:146
- `classifyDeath` at game/js/plugins/DEUS_DeathForensics.js:161
- `recordDeath` at game/js/plugins/DEUS_DeathForensics.js:283
- `deathLedger` at game/js/plugins/DEUS_DeathForensics.js:402
- `mortalitySummary` at game/js/plugins/DEUS_DeathForensics.js:406
- `resetDeathLedger` at game/js/plugins/DEUS_DeathForensics.js:420
- `linkColonists` at game/js/plugins/DEUS_DeathForensics.js:449
- `hookLifecycleEvents` at game/js/plugins/DEUS_DeathForensics.js:461
module.exports assignments: game/js/plugins/DEUS_DeathForensics.js:542
Named consumers outside this file:
- `UF.DeathForensics` (export, this file :444):
  - plugin game/js/plugins/DEUS_Colonists.js:1641 (19 code hits; lines 1641,5472,5473,5494,5495,5504,5505,5771,5775,5779,5783)
  - plugin game/js/plugins/DEUS_Combat.js:1232 (2 code hits; lines 1232)
  - plugin game/js/plugins/DEUS_Fire.js:700 (1 code hit; lines 700)
  - tool tools/test_hearth_containment_and_provenance.js:198 (1 code hit; lines 198)
  - tool tools/test_native_survival_soak.js:256 (1 code hit; lines 256)
- `UF.Forensics` (export, this file :445): no-call-found-after-defined-search. Not labeled dead.
- `DEUS.DeathForensics` (export, this file :446): no-call-found-after-defined-search. Not labeled dead.
Unqualified property names (length >= 10; may be a different binding):
- `deathLedger` from `UF.Colonists.deathLedger` at :451: plugin game/js/plugins/DEUS_Colonists.js:5770 (3); tool tools/test_hearth_containment_and_provenance.js:330 (1)
- `mortalitySummary` from `UF.Colonists.mortalitySummary` at :452: plugin game/js/plugins/DEUS_Colonists.js:5774 (3); tool tools/test_native_survival_soak.js:427 (4)
- `recordEvent` from `UF.Colonists.recordEvent` at :453: plugin game/js/plugins/DEUS_Colonists.js:5472 (9)
- `recentEvents` from `UF.Colonists.recentEvents` at :454: plugin game/js/plugins/DEUS_Colonists.js:5778 (3); tool tools/test_native_survival_soak.js:449 (2)
- `resetDeathLedger` from `UF.Colonists.resetDeathLedger` at :455: no-call-found-after-defined-search outside this file. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:101 quotes `DEUS_DeathForensics`
- tool tools/test_hearth_containment_and_provenance.js:36 quotes `DEUS_DeathForensics.js`
- tool tools/test_hearth_containment_and_provenance.js:196 quotes `DEUS_DeathForensics.js`
- tool tools/test_native_survival_soak.js:83 quotes `DEUS_DeathForensics.js`
- tool tools/test_survival_regressions.js:86 quotes `DEUS_DeathForensics.js`

## DEUS_Depth.js

Source lines: 2688.
Exports:
- `UF.DepthOcclusion` at game/js/plugins/DEUS_Depth.js:333
- `UF.Depth` at game/js/plugins/DEUS_Depth.js:1778
- namespace object `window/root.UF` at game/js/plugins/DEUS_Depth.js:332
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Depth.js:1776
- namespace object `window/root.UF` at game/js/plugins/DEUS_Depth.js:1777
Engine prototype patches:
- `DepthCanvasLayer.prototype.constructor` at game/js/plugins/DEUS_Depth.js:383
- `DepthCanvasLayer.prototype.initialize` at game/js/plugins/DEUS_Depth.js:384
- `DepthCanvasLayer.prototype.release` at game/js/plugins/DEUS_Depth.js:394
- `DepthCanvasLayer.prototype.destroy` at game/js/plugins/DEUS_Depth.js:400
- `DepthCanvasLayer.prototype.setBitmaps` at game/js/plugins/DEUS_Depth.js:404
- `DepthCanvasLayer.prototype.clear` at game/js/plugins/DEUS_Depth.js:407
- `DepthCanvasLayer.prototype.size` at game/js/plugins/DEUS_Depth.js:414
- `DepthCanvasLayer.prototype.isReady` at game/js/plugins/DEUS_Depth.js:415
- `DepthCanvasLayer.prototype.render` at game/js/plugins/DEUS_Depth.js:416
- `DepthCanvasLayer.prototype.addRect` at game/js/plugins/DEUS_Depth.js:417
- `DepthCanvasLayer.prototype.flush` at game/js/plugins/DEUS_Depth.js:433
- `DepthTilemap.prototype.constructor` at game/js/plugins/DEUS_Depth.js:453
- `DepthTilemap.prototype.initialize` at game/js/plugins/DEUS_Depth.js:454
- `DepthTilemap.prototype._createLayers` at game/js/plugins/DEUS_Depth.js:463
- `DepthTilemap.prototype._updateBitmaps` at game/js/plugins/DEUS_Depth.js:476
- `DepthTilemap.prototype._addSpot` at game/js/plugins/DEUS_Depth.js:484
- `DepthTilemap.prototype._addAllSpots` at game/js/plugins/DEUS_Depth.js:490
- `DepthTilemap.prototype.update` at game/js/plugins/DEUS_Depth.js:506
- `DepthTilemap.prototype.hasWater` at game/js/plugins/DEUS_Depth.js:518
- `Sprite_DepthPlane.prototype.constructor` at game/js/plugins/DEUS_Depth.js:781
- `Sprite_DepthPlane.prototype.initialize` at game/js/plugins/DEUS_Depth.js:782
- `Sprite_DepthPlane.prototype.destroy` at game/js/plugins/DEUS_Depth.js:818
- `Sprite_DepthPlane.prototype.releaseCanvases` at game/js/plugins/DEUS_Depth.js:825
- `Sprite_DepthPlane.prototype.bind` at game/js/plugins/DEUS_Depth.js:837
- `Sprite_DepthPlane.prototype.refresh` at game/js/plugins/DEUS_Depth.js:853
- `Sprite_DepthPlane.prototype.clearEntities` at game/js/plugins/DEUS_Depth.js:854
- `Sprite_DepthPlane.prototype.takeSprite` at game/js/plugins/DEUS_Depth.js:863
- `Sprite_DepthPlane.prototype.releaseSprite` at game/js/plugins/DEUS_Depth.js:870
- `Sprite_DepthPlane.prototype.entityWindow` at game/js/plugins/DEUS_Depth.js:872
- `Sprite_DepthPlane.prototype.inEntityWindow` at game/js/plugins/DEUS_Depth.js:881
- `Sprite_DepthPlane.prototype.beginScan` at game/js/plugins/DEUS_Depth.js:888
- `Sprite_DepthPlane.prototype.seeUnit` at game/js/plugins/DEUS_Depth.js:889
- `Sprite_DepthPlane.prototype.endScan` at game/js/plugins/DEUS_Depth.js:925
- `Sprite_DepthPlane.prototype.updateEntities` at game/js/plugins/DEUS_Depth.js:928
- `Sprite_DepthPlane.prototype.sortEntities` at game/js/plugins/DEUS_Depth.js:951
- `Sprite_DepthPlane.prototype.rebuildItems` at game/js/plugins/DEUS_Depth.js:984
- `Sprite_DepthPlane.prototype.rebuildWalls` at game/js/plugins/DEUS_Depth.js:1009
- `Sprite_DepthPlane.prototype.placeUnits` at game/js/plugins/DEUS_Depth.js:1050
- `Sprite_DepthPlane.prototype.placeEntities` at game/js/plugins/DEUS_Depth.js:1090
- `Sprite_DepthPlane.prototype.entityCounts` at game/js/plugins/DEUS_Depth.js:1124
- `Sprite_DepthPlane.prototype.unprojected` at game/js/plugins/DEUS_Depth.js:1130
- `Sprite_DepthPlane.prototype.updatePlane` at game/js/plugins/DEUS_Depth.js:1134
- `Sprite_DepthPlane.prototype.applyLook` at game/js/plugins/DEUS_Depth.js:1160
- `Sprite_DepthRoot.prototype.constructor` at game/js/plugins/DEUS_Depth.js:1175
- `Sprite_DepthRoot.prototype.initialize` at game/js/plugins/DEUS_Depth.js:1176
- `Sprite_DepthRoot.prototype.destroy` at game/js/plugins/DEUS_Depth.js:1226
- `Sprite_DepthRoot.prototype.releaseCanvases` at game/js/plugins/DEUS_Depth.js:1230
- `Sprite_DepthRoot.prototype.rebuild` at game/js/plugins/DEUS_Depth.js:1237
- `Sprite_DepthRoot.prototype.levelShown` at game/js/plugins/DEUS_Depth.js:1275
- `Sprite_DepthRoot.prototype.sync` at game/js/plugins/DEUS_Depth.js:1282
- `Sprite_DepthRoot.prototype.bindPlane` at game/js/plugins/DEUS_Depth.js:1288
- `Sprite_DepthRoot.prototype.skipsMainCell` at game/js/plugins/DEUS_Depth.js:1309
- `Sprite_DepthRoot.prototype.repaintMain` at game/js/plugins/DEUS_Depth.js:1312
- `Sprite_DepthRoot.prototype.update` at game/js/plugins/DEUS_Depth.js:1317
- `Sprite_DepthRoot.prototype.lateUpdate` at game/js/plugins/DEUS_Depth.js:1380
- `Sprite_DepthRoot.prototype.updateUnits` at game/js/plugins/DEUS_Depth.js:1389
- `Sprite_DepthRoot.prototype.updateExposure` at game/js/plugins/DEUS_Depth.js:1416
- `Sprite_DepthRoot.prototype.columnVisited` at game/js/plugins/DEUS_Depth.js:1468
- `Sprite_DepthRoot.prototype.cellExposed` at game/js/plugins/DEUS_Depth.js:1474
- `Sprite_DepthRoot.prototype.columnOpenTo` at game/js/plugins/DEUS_Depth.js:1482
- `Sprite_DepthRoot.prototype.cellCovered` at game/js/plugins/DEUS_Depth.js:1492
- `Sprite_DepthRoot.prototype.noteExposureChange` at game/js/plugins/DEUS_Depth.js:1499
- `Sprite_DepthRoot.prototype.updateMask` at game/js/plugins/DEUS_Depth.js:1513
- `Sprite_DepthRoot.prototype.scanUnits` at game/js/plugins/DEUS_Depth.js:1545
- `Sprite_DepthRoot.prototype.unitCandidates` at game/js/plugins/DEUS_Depth.js:1571
- `Sprite_DepthRoot.prototype.refreshLevel` at game/js/plugins/DEUS_Depth.js:1597
- `Sprite_DepthRoot.prototype.dirtyObjects` at game/js/plugins/DEUS_Depth.js:1608
- `Sprite_DepthRoot.prototype.itemChanged` at game/js/plugins/DEUS_Depth.js:1614
- `Sprite_DepthRoot.prototype.shapeChanged` at game/js/plugins/DEUS_Depth.js:1626
- `Sprite_DepthRoot.prototype.invalidateBelow` at game/js/plugins/DEUS_Depth.js:1634
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Depth.js:1664
- `Spriteset_Map.prototype.updateTilemap` at game/js/plugins/DEUS_Depth.js:1674
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Depth.js:1680
- `Scene_Map.prototype.terminate` at game/js/plugins/DEUS_Depth.js:1687
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_Depth.js:1694
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Depth.js:1781
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_Depth.js:2359
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_Depth.js:2371
Engine object patches (not prototype):
- `Tilemap.prototype` at game/js/plugins/DEUS_Depth.js:452
Engine members read or saved:
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Depth.js:1663
- `Spriteset_Map.prototype.updateTilemap` saved to `_Spriteset_Map_updateTilemap` at game/js/plugins/DEUS_Depth.js:1673
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Depth.js:1679
- `Scene_Map.prototype.terminate` saved to `_Scene_Map_terminate` at game/js/plugins/DEUS_Depth.js:1686
- `Scene_Map.prototype.start` saved to `_Scene_Map_start` at game/js/plugins/DEUS_Depth.js:1693
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Depth.js:1780
- `Scene_Map.prototype.start` saved to `realStart` at game/js/plugins/DEUS_Depth.js:2358
- `Graphics.frameCount` saved to `_ufTargetFrame` at game/js/plugins/DEUS_Depth.js:904
- `Graphics.frameCount` saved to `_ufTargetFrame` at game/js/plugins/DEUS_Depth.js:919
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Depth.js:1646
Namespace property patches:
- none
Listeners and commands:
- `on` `"levels:shapeChanged"` at game/js/plugins/DEUS_Depth.js:1704
- `on` `"levels:cellChanged"` at game/js/plugins/DEUS_Depth.js:1705
- `on` `"world:levelTileChanged"` at game/js/plugins/DEUS_Depth.js:1706
- `on` `"world:tileChanged"` at game/js/plugins/DEUS_Depth.js:1707
- `on` `"world:levelBuilt"` at game/js/plugins/DEUS_Depth.js:1709
- `on` `"world:areaBuilt"` at game/js/plugins/DEUS_Depth.js:1710
- `on` `"world:created"` at game/js/plugins/DEUS_Depth.js:1711
- `on` `"objects:levelChanged"` at game/js/plugins/DEUS_Depth.js:1713
- `on` `"objects:changed"` at game/js/plugins/DEUS_Depth.js:1714
- `on` `"items:changed"` at game/js/plugins/DEUS_Depth.js:1715
- `on` `"world:unitLevelChanged"` at game/js/plugins/DEUS_Depth.js:1718
- `on` `"world:unitAreaChanged"` at game/js/plugins/DEUS_Depth.js:1719
- `on` `"world:unitAdded"` at game/js/plugins/DEUS_Depth.js:1721
- `on` `"world:unitImageChanged"` at game/js/plugins/DEUS_Depth.js:1722
- `on` `"levels:viewChanged"` at game/js/plugins/DEUS_Depth.js:2467
- `on` `"world:unitMoved"` at game/js/plugins/DEUS_Depth.js:2535
Classes:
- `extends` at game/js/plugins/DEUS_Depth.js:687
Named functions at brace depth 0 or 1 (capped at 40):
- `depthViewWidth` at game/js/plugins/DEUS_Depth.js:88
- `depthViewHeight` at game/js/plugins/DEUS_Depth.js:93
- `maxDepthTilemapWidth` at game/js/plugins/DEUS_Depth.js:98
- `maxDepthTilemapHeight` at game/js/plugins/DEUS_Depth.js:103
- `takeCanvas` at game/js/plugins/DEUS_Depth.js:348
- `returnCanvas` at game/js/plugins/DEUS_Depth.js:362
- `DepthCanvasLayer` at game/js/plugins/DEUS_Depth.js:381
- `DepthTilemap` at game/js/plugins/DEUS_Depth.js:451
- `openCells` at game/js/plugins/DEUS_Depth.js:529
- `seamRanges` at game/js/plugins/DEUS_Depth.js:543
- `patchOpenCell` at game/js/plugins/DEUS_Depth.js:550
- `shapesReset` at game/js/plugins/DEUS_Depth.js:566
- `forceNearest` at game/js/plugins/DEUS_Depth.js:580
- `preloadSheet` at game/js/plugins/DEUS_Depth.js:593
- `preloadArea` at game/js/plugins/DEUS_Depth.js:600
- `sheetOf` at game/js/plugins/DEUS_Depth.js:614
- `rowOf` at game/js/plugins/DEUS_Depth.js:645
- `itemFrame` at game/js/plugins/DEUS_Depth.js:655
- `connectorFrame` at game/js/plugins/DEUS_Depth.js:669
- `objectLayerClass` at game/js/plugins/DEUS_Depth.js:684
- `Sprite_DepthPlane` at game/js/plugins/DEUS_Depth.js:779
- `fillWindow` at game/js/plugins/DEUS_Depth.js:873
- `windowPieces` at game/js/plugins/DEUS_Depth.js:959
- `exposurePieces` at game/js/plugins/DEUS_Depth.js:967
- `Sprite_DepthRoot` at game/js/plugins/DEUS_Depth.js:1173
- `writeCullBounds` at game/js/plugins/DEUS_Depth.js:1402
- `wrappedCell` at game/js/plugins/DEUS_Depth.js:1462
- `installMainSkip` at game/js/plugins/DEUS_Depth.js:1651
- `hookEvents` at game/js/plugins/DEUS_Depth.js:1700
- `sceneKind` at game/js/plugins/DEUS_Depth.js:1816
- `sceneCut` at game/js/plugins/DEUS_Depth.js:1836
- `sceneCentre` at game/js/plugins/DEUS_Depth.js:1842
- `buildScene` at game/js/plugins/DEUS_Depth.js:1864
- `harnessStop` at game/js/plugins/DEUS_Depth.js:1912
- `need` at game/js/plugins/DEUS_Depth.js:1917
- `sheetsReady` at game/js/plugins/DEUS_Depth.js:1921
- `subtree` at game/js/plugins/DEUS_Depth.js:1928
- `registerChecks` at game/js/plugins/DEUS_Depth.js:1932
module.exports assignments: game/js/plugins/DEUS_Depth.js:331
Named consumers outside this file:
- `UF.DepthOcclusion` (export, this file :333): no-call-found-after-defined-search. Not labeled dead.
- `UF.Depth` (export, this file :1778):
  - plugin game/js/plugins/DEUS_Select.js:1485 (2 code hits; lines 1485,1504)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:185 (1 code hit; lines 185)
  - tool tools/occlusion/bench_occlusion.js:85 (4 code hits; lines 85,87)
  - tool tools/occlusion/compare_planes.js:81 (4 code hits; lines 81,83)
  - tool tools/occlusion/live_occlusion.js:84 (5 code hits; lines 84,86)
  - tool tools/test_zoom_depth_coverage.js:120 (1 code hit; lines 120)
  - tool tools/zrange/test_switch_depth2.js:104 (1 code hit; lines 104)
- `extends` (class, this file :687):
  - plugin game/js/plugins/DEUS_Bag.js:92 (2 code hits; lines 92,535)
  - plugin game/js/plugins/DEUS_Camera.js:311 (1 code hit; lines 311)
  - plugin game/js/plugins/DEUS_Combat.js:2238 (1 code hit; lines 2238)
  - plugin game/js/plugins/DEUS_Containers.js:492 (2 code hits; lines 492,978)
  - plugin game/js/plugins/DEUS_Core.js:572 (1 code hit; lines 572)
  - plugin game/js/plugins/DEUS_DayNight.js:146 (2 code hits; lines 146,192)
  - plugin game/js/plugins/DEUS_FactionMenus.js:341 (1 code hit; lines 341)
  - plugin game/js/plugins/DEUS_Factions.js:685 (1 code hit; lines 685)
  - plugin game/js/plugins/DEUS_Fire.js:1030 (1 code hit; lines 1030)
  - plugin game/js/plugins/DEUS_Fog.js:523 (1 code hit; lines 523)
  - plugin game/js/plugins/DEUS_History.js:3513 (1 code hit; lines 3513)
  - plugin game/js/plugins/DEUS_Interact.js:574 (2 code hits; lines 574,818)
  - plugin game/js/plugins/DEUS_Items.js:1437 (1 code hit; lines 1437)
  - plugin game/js/plugins/DEUS_Levels.js:4411 (3 code hits; lines 4411,4647,5168)
  - plugin game/js/plugins/DEUS_Look.js:423 (1 code hit; lines 423)
  - plugin game/js/plugins/DEUS_Objects.js:853 (1 code hit; lines 853)
  - plugin game/js/plugins/DEUS_Select.js:1839 (5 code hits; lines 1839,2191,2292,2338,2412)
  - plugin game/js/plugins/DEUS_Sheet.js:1174 (1 code hit; lines 1174)
  - plugin game/js/plugins/DEUS_Speech.js:473 (1 code hit; lines 473)
  - plugin game/js/plugins/DEUS_Stance.js:439 (1 code hit; lines 439)
  - plugin game/js/plugins/DEUS_TimeSpeed.js:272 (1 code hit; lines 272)
  - plugin game/js/plugins/DEUS_Visuals.js:59 (2 code hits; lines 59,182)
  - tool tools/art/validate_art.js:71 (1 code hit; lines 71)
  - tool tools/bestiary/build_bestiary.js:65 (1 code hit; lines 65)
  - tool tools/governance/fixtures/invariants/INV-SIM-01/game/js/plugins/DEUS_FactionMenus.js:1 (1 code hit; lines 1)
  - tool tools/governance/merge_gate.js:145 (1 code hit; lines 145)
  - tool tools/ops/run_gate.js:191 (1 code hit; lines 191)
  - tool tools/security/check_dependencies.js:59 (1 code hit; lines 59)
  - tool tools/security/scan_secrets.js:191 (1 code hit; lines 191)
  - tool tools/society/test_quartermaster.js:857 (4 code hits; lines 857,872,1041,1139)
  - tool tools/srd_browser/selftest.js:79 (3 code hits; lines 79,84,85)
  - tool tools/test_agriculture.js:46 (7 code hits; lines 46,48)
  - tool tools/test_conditions_system.js:190 (1 code hit; lines 190)
  - tool tools/test_ecology.js:48 (2 code hits; lines 48,49)
  - tool tools/test_faction_reproduction.js:69 (4 code hits; lines 69,70,71,74)
  - tool tools/test_fire_safety.js:71 (6 code hits; lines 71)
  - tool tools/test_fluid_correctness_lane_cw.js:69 (1 code hit; lines 69)
  - tool tools/test_goals.js:19 (3 code hits; lines 19)
  - tool tools/test_natural_connections.js:78 (6 code hits; lines 78)
  - tool tools/test_z_fire.js:57 (6 code hits; lines 57,58)
  - tool tools/test_z_flora.js:37 (4 code hits; lines 37)
  - tool tools/test_zoom_depth_coverage.js:76 (1 code hit; lines 76)
  - tool tools/verify_world_state_registry.js:162 (1 code hit; lines 162)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Combat.js:1490 (1); archive/plugins_uf_pre_rename/UF_Core.js:428 (1); archive/plugins_uf_pre_rename/UF_Crafting.js:112 (1); archive/plugins_uf_pre_rename/UF_DayNight.js:145 (2); archive/plugins_uf_pre_rename/UF_DFWorld.js:378 (1); archive/plugins_uf_pre_rename/UF_Dialogue.js:218 (1); archive/plugins_uf_pre_rename/UF_FactionMenus.js:318 (1); archive/plugins_uf_pre_rename/UF_Factions.js:714 (1); archive/plugins_uf_pre_rename/UF_Fire.js:875 (1); archive/plugins_uf_pre_rename/UF_Fog.js:497 (1); archive/plugins_uf_pre_rename/UF_Goals.js:511 (1); archive/plugins_uf_pre_rename/UF_Gumps.js:87 (2); archive/plugins_uf_pre_rename/UF_History.js:3084 (1); archive/plugins_uf_pre_rename/UF_Interact.js:525 (2); archive/plugins_uf_pre_rename/UF_Items.js:1020 (1); archive/plugins_uf_pre_rename/UF_Levels.js:1678 (3); archive/plugins_uf_pre_rename/UF_Look.js:423 (1); archive/plugins_uf_pre_rename/UF_Objects.js:665 (1); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:293 (1); archive/plugins_uf_pre_rename/UF_Select.js:1164 (5); archive/plugins_uf_pre_rename/UF_Sheet.js:941 (1); archive/plugins_uf_pre_rename/UF_Skills.js:391 (1); archive/plugins_uf_pre_rename/UF_Speech.js:473 (1); archive/plugins_uf_pre_rename/UF_Stance.js:377 (1); archive/plugins_uf_pre_rename/UF_TimeSpeed.js:254 (1); archive/plugins_uf_pre_rename/UF_Visuals.js:59 (2); archive/plugins/DEUS_Crafting.js:112 (1); archive/plugins/DEUS_DFWorld.js:378 (1); archive/plugins/DEUS_Dialogue.js:218 (1); archive/plugins/DEUS_Goals.js:511 (1); archive/plugins/DEUS_Gumps.js:87 (2); archive/plugins/DEUS_ProfileTabs.js:293 (1); archive/plugins/DEUS_Select.js:1164 (5); archive/plugins/DEUS_Skills.js:391 (1); archive/plugins/UF_FogOfWar.js:67 (1)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:282 quotes `DEUS_Depth`
- tool tools/bench_combat_srd.js:65 quotes `DEUS_Depth`
- tool tools/bench_render_layers.js:684 quotes `DEUS_Depth`
- tool tools/layer_overlays/test_layer_overlays.js:591 quotes `DEUS_Depth.js`
- tool tools/occlusion/compare_planes.js:59 quotes `DEUS_Depth.js`
- tool tools/occlusion/test_occlusion_culling.js:22 quotes `DEUS_Depth.js`
- tool tools/test_layer_render_flat.js:75 quotes `DEUS_Depth`
- tool tools/zrange/literal_map.js:180 quotes `DEUS_Depth.js`
- tool tools/zrange/literal_map.js:182 quotes `DEUS_Depth.js`
- tool tools/zrange/scan_z_literals.js:20 quotes `DEUS_Depth`
- tool tools/zrange/test_switch_depth2.js:75 quotes `DEUS_Depth.js`

## DEUS_DepthCues.js

Source lines: 1091.
Exports:
- `DEUS.DepthCues` at game/js/plugins/DEUS_DepthCues.js:1088
- `UF.DepthCues` at game/js/plugins/DEUS_DepthCues.js:1089
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_DepthCues.js:1087
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `defaultState` at game/js/plugins/DEUS_DepthCues.js:91
- `isDefaultState` at game/js/plugins/DEUS_DepthCues.js:107
- `setToggle` at game/js/plugins/DEUS_DepthCues.js:117
- `scaleAllowed` at game/js/plugins/DEUS_DepthCues.js:126
- `setScale` at game/js/plugins/DEUS_DepthCues.js:130
- `setLightMode` at game/js/plugins/DEUS_DepthCues.js:136
- `setBlur` at game/js/plugins/DEUS_DepthCues.js:142
- `setDayLength` at game/js/plugins/DEUS_DepthCues.js:149
- `dayLengthFraction` at game/js/plugins/DEUS_DepthCues.js:162
- `setDimSteps` at game/js/plugins/DEUS_DepthCues.js:167
- `setCamera` at game/js/plugins/DEUS_DepthCues.js:173
- `setParallaxStep` at game/js/plugins/DEUS_DepthCues.js:180
- `rampParams` at game/js/plugins/DEUS_DepthCues.js:186
- `bakeAllRamps` at game/js/plugins/DEUS_DepthCues.js:198
- `clampByte` at game/js/plugins/DEUS_DepthCues.js:204
- `metrics` at game/js/plugins/DEUS_DepthCues.js:210
- `idealRamp` at game/js/plugins/DEUS_DepthCues.js:220
- `forceMonotone` at game/js/plugins/DEUS_DepthCues.js:243
- `bakeSwatch` at game/js/plugins/DEUS_DepthCues.js:271
- `applyRamp` at game/js/plugins/DEUS_DepthCues.js:280
- `applyRampAtLayer` at game/js/plugins/DEUS_DepthCues.js:286
- `bakeSwatchBook` at game/js/plugins/DEUS_DepthCues.js:292
- `nightParams` at game/js/plugins/DEUS_DepthCues.js:302
- `applyNight` at game/js/plugins/DEUS_DepthCues.js:306
- `columnAt` at game/js/plugins/DEUS_DepthCues.js:322
- `surfacePx` at game/js/plugins/DEUS_DepthCues.js:327
- `isOpen` at game/js/plugins/DEUS_DepthCues.js:331
- `tileSlotForDrop` at game/js/plugins/DEUS_DepthCues.js:337
- `cliffFaces` at game/js/plugins/DEUS_DepthCues.js:343
- `dropShadows` at game/js/plugins/DEUS_DepthCues.js:391
- `shadowCoverage` at game/js/plugins/DEUS_DepthCues.js:436
- `parallaxOffset` at game/js/plugins/DEUS_DepthCues.js:448
- `cameraEase` at game/js/plugins/DEUS_DepthCues.js:456
- `unitOrigin` at game/js/plugins/DEUS_DepthCues.js:469
- `hpBars` at game/js/plugins/DEUS_DepthCues.js:479
- `spellDraws` at game/js/plugins/DEUS_DepthCues.js:499
- `selectionView` at game/js/plugins/DEUS_DepthCues.js:526
- `layerMarkers` at game/js/plugins/DEUS_DepthCues.js:543
- `cutawayCells` at game/js/plugins/DEUS_DepthCues.js:561
- `cutawayCoverage` at game/js/plugins/DEUS_DepthCues.js:579
- 20 more function declarations are in caller_inventory.json
module.exports assignments: game/js/plugins/DEUS_DepthCues.js:1086
Named consumers outside this file:
- `DEUS.DepthCues` (export, this file :1088):
  - plugin game/js/plugins/DEUS_DepthDemo.js:32 (1 code hit; lines 32)
- `UF.DepthCues` (export, this file :1089): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- tool tools/depth_demo/test_depth_demo.js:821 quotes `DEUS_DepthCues.js`

## DEUS_DepthDemo.js

Source lines: 524.
Exports:
- `DEUS.DepthDemo` at game/js/plugins/DEUS_DepthDemo.js:518
- `UF.DepthDemo` at game/js/plugins/DEUS_DepthDemo.js:519
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_DepthDemo.js:517
Engine prototype patches:
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_DepthDemo.js:470
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `colorFor` at game/js/plugins/DEUS_DepthDemo.js:38
- `buildDemoScene` at game/js/plugins/DEUS_DepthDemo.js:44
- `buildBenchmarkScene` at game/js/plugins/DEUS_DepthDemo.js:97
- `benchmarkCases` at game/js/plugins/DEUS_DepthDemo.js:157
- `stateFromCase` at game/js/plugins/DEUS_DepthDemo.js:184
- `roundMs` at game/js/plugins/DEUS_DepthDemo.js:195
- `benchmark` at game/js/plugins/DEUS_DepthDemo.js:199
- `assetNeeds` at game/js/plugins/DEUS_DepthDemo.js:237
- `bundleData` at game/js/plugins/DEUS_DepthDemo.js:254
- `loadBundledJson` at game/js/plugins/DEUS_DepthDemo.js:285
- `currentState` at game/js/plugins/DEUS_DepthDemo.js:299
- `reset` at game/js/plugins/DEUS_DepthDemo.js:303
- `setToggle` at game/js/plugins/DEUS_DepthDemo.js:308
- `setScale` at game/js/plugins/DEUS_DepthDemo.js:312
- `setLightMode` at game/js/plugins/DEUS_DepthDemo.js:316
- `setDayLength` at game/js/plugins/DEUS_DepthDemo.js:320
- `setDimSteps` at game/js/plugins/DEUS_DepthDemo.js:324
- `applyCanvasScale` at game/js/plugins/DEUS_DepthDemo.js:330
- `hudLines` at game/js/plugins/DEUS_DepthDemo.js:359
- `cssColor` at game/js/plugins/DEUS_DepthDemo.js:372
- `paintOverlay` at game/js/plugins/DEUS_DepthDemo.js:377
- `overlayTick` at game/js/plugins/DEUS_DepthDemo.js:438
- `installMap` at game/js/plugins/DEUS_DepthDemo.js:465
- `loadJsonXhr` at game/js/plugins/DEUS_DepthDemo.js:481
module.exports assignments: game/js/plugins/DEUS_DepthDemo.js:516
Named consumers outside this file:
- `DEUS.DepthDemo` (export, this file :518): no-call-found-after-defined-search. Not labeled dead.
- `UF.DepthDemo` (export, this file :519): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- tool tools/depth_demo/test_depth_demo.js:822 quotes `DEUS_DepthDemo.js`

## DEUS_Dnd5e.js

Source lines: 844.
Exports:
- `UF.Dnd5e` at game/js/plugins/DEUS_Dnd5e.js:841
- `DEUS.Dnd5e` at game/js/plugins/DEUS_Dnd5e.js:842
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Dnd5e.js:42
- namespace object `window/root.UF` at game/js/plugins/DEUS_Dnd5e.js:43
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `mulberry32` at game/js/plugins/DEUS_Dnd5e.js:50
- `hash32` at game/js/plugins/DEUS_Dnd5e.js:59
- `hashString` at game/js/plugins/DEUS_Dnd5e.js:69
- `statMod` at game/js/plugins/DEUS_Dnd5e.js:75
- `formatMod` at game/js/plugins/DEUS_Dnd5e.js:79
- `rollAlignment` at game/js/plugins/DEUS_Dnd5e.js:410
Named consumers outside this file:
- `UF.Dnd5e` (export, this file :841):
  - plugin game/js/plugins/DEUS_Colonists.js:2729 (1 code hit; lines 2729)
  - plugin game/js/plugins/DEUS_History.js:153 (8 code hits; lines 153,154,160,3041,3279)
  - plugin game/js/plugins/DEUS_Items.js:587 (2 code hits; lines 587,605)
  - plugin game/js/plugins/DEUS_Sheet.js:834 (10 code hits; lines 834,2065,2107,2120,2156,2169)
  - plugin game/js/plugins/DEUS_Test.js:450 (1 code hit; lines 450)
  - tool tools/test_combat_dying_integration.js:186 (1 code hit; lines 186)
  - tool tools/test_conditions_native_closure.js:197 (1 code hit; lines 197)
  - tool tools/test_conditions_system.js:243 (1 code hit; lines 243)
- `DEUS.Dnd5e` (export, this file :842): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:98 quotes `DEUS_Dnd5e`
- plugin game/js/plugins/DEUS_Items.js:46 quotes `DEUS_Dnd5e`
- plugin game/js/plugins/DEUS_Items.js:47 quotes `DEUS_Dnd5e`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_Dnd5e`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_Dnd5e`
- tool tools/sim/test_underground_year0.js:31 quotes `DEUS_Dnd5e`
- tool tools/society/test_person_identity.js:32 quotes `DEUS_Dnd5e`
- tool tools/test_combat_dying_integration.js:133 quotes `DEUS_Dnd5e.js`
- tool tools/test_combat_dying_integration.js:152 quotes `DEUS_Dnd5e.js`
- tool tools/test_conditions_native_closure.js:36 quotes `DEUS_Dnd5e.js`
- tool tools/test_conditions_native_closure.js:196 quotes `DEUS_Dnd5e.js`
- tool tools/test_conditions_system.js:61 quotes `DEUS_Dnd5e.js`
- tool tools/test_conditions_system.js:231 quotes `DEUS_Dnd5e.js`
- tool tools/test_duplicate_registration.js:126 quotes `DEUS_Dnd5e`
- tool tools/test_faction_starting_gear.js:91 quotes `DEUS_Dnd5e`
- tool tools/test_faction_starting_gear.js:139 quotes `DEUS_Dnd5e.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_Dnd5e`
- tool tools/test_native_survival_soak.js:69 quotes `DEUS_Dnd5e.js`
- tool tools/test_new_game_year0.js:40 quotes `DEUS_Dnd5e`
- tool tools/test_sim_tick.js:33 quotes `DEUS_Dnd5e`
- tool tools/test_survival_regressions.js:72 quotes `DEUS_Dnd5e.js`
- tool tools/test_volumetric_terrain_column.js:125 quotes `DEUS_Dnd5e.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:37 quotes `DEUS_Dnd5e`

## DEUS_Doors.js

Source lines: 875.
Exports:
- `UF.Doors` at game/js/plugins/DEUS_Doors.js:629
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Doors.js:627
- namespace object `window/root.UF` at game/js/plugins/DEUS_Doors.js:628
Engine prototype patches:
- `Game_CharacterBase.prototype.isMapPassable` at game/js/plugins/DEUS_Doors.js:272
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Doors.js:633
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_CharacterBase.prototype.isMapPassable` saved to `_Game_CharacterBase_isMapPassable` at game/js/plugins/DEUS_Doors.js:271
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Doors.js:632
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:created"` at game/js/plugins/DEUS_Doors.js:574
- `on` `"world:areaBuilt"` at game/js/plugins/DEUS_Doors.js:575
- `on` `"world:levelBuilt"` at game/js/plugins/DEUS_Doors.js:579
- `on` `"objects:changed"` at game/js/plugins/DEUS_Doors.js:613
- `on` `"objects:levelChanged"` at game/js/plugins/DEUS_Doors.js:614
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `store` at game/js/plugins/DEUS_Doors.js:57
- `parseKey` at game/js/plugins/DEUS_Doors.js:59
- `isDoorType` at game/js/plugins/DEUS_Doors.js:64
- `doorAt` at game/js/plugins/DEUS_Doors.js:67
- `playerFactionId` at game/js/plugins/DEUS_Doors.js:76
- `ensureDoor` at game/js/plugins/DEUS_Doors.js:80
- `patternFor` at game/js/plugins/DEUS_Doors.js:118
- `isWallAt` at game/js/plugins/DEUS_Doors.js:131
- `isBetweenBottomWalls` at game/js/plugins/DEUS_Doors.js:144
- `orientationAt` at game/js/plugins/DEUS_Doors.js:151
- `canUnitPass` at game/js/plugins/DEUS_Doors.js:164
- `lockDoor` at game/js/plugins/DEUS_Doors.js:186
- `unlockDoor` at game/js/plugins/DEUS_Doors.js:201
- `openDoor` at game/js/plugins/DEUS_Doors.js:213
- `toggleHeld` at game/js/plugins/DEUS_Doors.js:234
- `tilePasses` at game/js/plugins/DEUS_Doors.js:261
- `groundFreeIgnoringDoor` at game/js/plugins/DEUS_Doors.js:290
- `isWater` at game/js/plugins/DEUS_Doors.js:333
- `unitAt` at game/js/plugins/DEUS_Doors.js:339
- `cultureForFaction` at game/js/plugins/DEUS_Doors.js:343
- `siteDoorId` at game/js/plugins/DEUS_Doors.js:348
- `wallMaterialAt` at game/js/plugins/DEUS_Doors.js:352
- `doorMaterialForWalls` at game/js/plugins/DEUS_Doors.js:362
- `perimeter` at game/js/plugins/DEUS_Doors.js:370
- `placeAt` at game/js/plugins/DEUS_Doors.js:378
- `retryPending` at game/js/plugins/DEUS_Doors.js:421
- `placeSite` at game/js/plugins/DEUS_Doors.js:436
- `placeAll` at game/js/plugins/DEUS_Doors.js:457
- `damage` at game/js/plugins/DEUS_Doors.js:470
- `frameFor` at game/js/plugins/DEUS_Doors.js:491
- `syncSprites` at game/js/plugins/DEUS_Doors.js:508
- `augmentOptions` at game/js/plugins/DEUS_Doors.js:533
- `hookInteract` at game/js/plugins/DEUS_Doors.js:546
- `hookEvents` at game/js/plugins/DEUS_Doors.js:571
- `registerChecks` at game/js/plugins/DEUS_Doors.js:640
Named consumers outside this file:
- `UF.Doors` (export, this file :629):
  - plugin game/js/plugins/DEUS_Anim.js:809 (2 code hits; lines 809,832)
  - plugin game/js/plugins/DEUS_DayNight.js:243 (6 code hits; lines 243,245)
  - plugin game/js/plugins/DEUS_Fluid.js:336 (1 code hit; lines 336)
  - plugin game/js/plugins/DEUS_Fog.js:181 (6 code hits; lines 181,183)
  - plugin game/js/plugins/DEUS_Interact.js:401 (1 code hit; lines 401)
  - plugin game/js/plugins/DEUS_Levels.js:3937 (7 code hits; lines 3937,3939,4018)
  - plugin game/js/plugins/DEUS_Look.js:287 (1 code hit; lines 287)
  - plugin game/js/plugins/DEUS_Movement8D.js:210 (2 code hits; lines 210,251)
  - plugin game/js/plugins/DEUS_World.js:2532 (4 code hits; lines 2532,4152)
  - plugin game/js/plugins/UF_Households.js:602 (2 code hits; lines 602,1014)
  - tool tools/fixtures/UF_SocietyRuntime.js:96 (1 code hit; lines 96)
  - tool tools/test_z_doors.js:50 (1 code hit; lines 50)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:795 (2); archive/plugins_uf_pre_rename/UF_DayNight.js:237 (6); archive/plugins_uf_pre_rename/UF_Doors.js:586 (1); archive/plugins_uf_pre_rename/UF_Fog.js:181 (6); archive/plugins_uf_pre_rename/UF_Households.js:1126 (2); archive/plugins_uf_pre_rename/UF_Interact.js:399 (1); archive/plugins_uf_pre_rename/UF_Levels.js:1243 (7); archive/plugins_uf_pre_rename/UF_Look.js:287 (1); archive/plugins_uf_pre_rename/UF_Movement8D.js:210 (2); archive/plugins_uf_pre_rename/UF_Outposts.js:758 (16); archive/plugins_uf_pre_rename/UF_World.js:1612 (4); archive/plugins/DEUS_Households.js:1126 (2); archive/plugins/DEUS_Outposts.js:758 (16)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:109 quotes `DEUS_Doors`
- tool tools/register_world_plugins.js:14 quotes `DEUS_Doors`
- tool tools/test_native_survival_soak.js:74 quotes `DEUS_Doors.js`
- tool tools/test_survival_regressions.js:77 quotes `DEUS_Doors.js`
- tool tools/test_volumetric_terrain_column.js:126 quotes `DEUS_Doors.js`
- tool tools/test_z_doors.js:49 quotes `DEUS_Doors.js`
- tool tools/zrange/provocations.js:12 quotes `DEUS_Doors.js`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_Doors`
- archive quotes omitted from the live list (2 hits)

## DEUS_Ecology.js

Source lines: 1242.
Exports:
- `UF.Ecology` at game/js/plugins/DEUS_Ecology.js:1002
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Ecology.js:1000
- namespace object `window/root.UF` at game/js/plugins/DEUS_Ecology.js:1001
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Ecology.js:1009
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Ecology.js:1028
Engine object patches (not prototype):
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Ecology.js:1022
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update_ecology` at game/js/plugins/DEUS_Ecology.js:1008
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Ecology.js:1027
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Ecology.js:1021
Namespace property patches:
- none
Listeners and commands:
- `on` `"objects:changed"` at game/js/plugins/DEUS_Ecology.js:942
- `on` `"time:hour"` at game/js/plugins/DEUS_Ecology.js:943
- `on` `"world:created"` at game/js/plugins/DEUS_Ecology.js:946
- `on` `"floors:laid"` at game/js/plugins/DEUS_Ecology.js:959
- `on` `"floors:groundChanged"` at game/js/plugins/DEUS_Ecology.js:960
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `report` at game/js/plugins/DEUS_Ecology.js:82
- `provoked` at game/js/plugins/DEUS_Ecology.js:89
- `fnv` at game/js/plugins/DEUS_Ecology.js:99
- `hash32` at game/js/plugins/DEUS_Ecology.js:108
- `mulberry32` at game/js/plugins/DEUS_Ecology.js:115
- `blankState` at game/js/plugins/DEUS_Ecology.js:127
- `state` at game/js/plugins/DEUS_Ecology.js:143
- `speciesOf` at game/js/plugins/DEUS_Ecology.js:165
- `population` at game/js/plugins/DEUS_Ecology.js:170
- `ensureArea` at game/js/plugins/DEUS_Ecology.js:186
- `initializeBaselines` at game/js/plugins/DEUS_Ecology.js:210
- `capFor` at game/js/plugins/DEUS_Ecology.js:223
- `isRenewableObject` at game/js/plugins/DEUS_Ecology.js:233
- `resourceHours` at game/js/plugins/DEUS_Ecology.js:245
- `isConstructedOrPaved` at game/js/plugins/DEUS_Ecology.js:254
- `startSapling` at game/js/plugins/DEUS_Ecology.js:272
- `resourceIndex` at game/js/plugins/DEUS_Ecology.js:293
- `cancelResource` at game/js/plugins/DEUS_Ecology.js:299
- `scheduleResource` at game/js/plugins/DEUS_Ecology.js:308
- `currentObjectId` at game/js/plugins/DEUS_Ecology.js:332
- `standerAt` at game/js/plugins/DEUS_Ecology.js:337
- `processResources` at game/js/plugins/DEUS_Ecology.js:344
- `onObjectChanged` at game/js/plugins/DEUS_Ecology.js:391
- `activeSites` at game/js/plugins/DEUS_Ecology.js:424
- `protectedReason` at game/js/plugins/DEUS_Ecology.js:431
- `campCellBlocked` at game/js/plugins/DEUS_Ecology.js:457
- `candidateValid` at game/js/plugins/DEUS_Ecology.js:463
- `speciesFor` at game/js/plugins/DEUS_Ecology.js:474
- `findCandidate` at game/js/plugins/DEUS_Ecology.js:481
- `memberCell` at game/js/plugins/DEUS_Ecology.js:497
- `attemptSpawn` at game/js/plugins/DEUS_Ecology.js:509
- `processArea` at game/js/plugins/DEUS_Ecology.js:561
- `spreadPlants` at game/js/plugins/DEUS_Ecology.js:570
- `stepBreeding` at game/js/plugins/DEUS_Ecology.js:661
- `isOreSproutOutcome` at game/js/plugins/DEUS_Ecology.js:741
- `pickWeighted` at game/js/plugins/DEUS_Ecology.js:765
- `stepBeat` at game/js/plugins/DEUS_Ecology.js:775
- `cursorArea` at game/js/plugins/DEUS_Ecology.js:895
- `tickHour` at game/js/plugins/DEUS_Ecology.js:905
- `hookEvents` at game/js/plugins/DEUS_Ecology.js:939
- 1 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.Ecology` (export, this file :1002):
  - plugin game/js/plugins/DEUS_Taming.js:108 (1 code hit; lines 108)
  - tool tools/sim/test_living_world_rules.js:446 (1 code hit; lines 446)
  - tool tools/sim/test_ore_sprout.js:94 (1 code hit; lines 94)
  - tool tools/taming/test_taming.js:647 (4 code hits; lines 647,661,664,666)
  - tool tools/test_ecology.js:217 (1 code hit; lines 217)
  - tool tools/test_regrowth_construction_guard.js:228 (9 code hits; lines 228,229,405,406,415,446,483,487)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Ecology.js:984 (1)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:157 quotes `DEUS_Ecology`
- tool tools/diagnose_hotspots.js:34 quotes `DEUS_Ecology.js`
- tool tools/sim/test_living_world_rules.js:389 quotes `DEUS_Ecology.js`
- tool tools/sim/test_living_world_rules.js:445 quotes `DEUS_Ecology.js`
- tool tools/sim/test_ore_sprout.js:13 quotes `DEUS_Ecology.js`
- tool tools/sim/test_ore_sprout.js:93 quotes `DEUS_Ecology.js`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_Ecology`
- archive quotes omitted from the live list (2 hits)

## DEUS_Environment.js

Source lines: 952.
Exports:
- `UF.Environment` at game/js/plugins/DEUS_Environment.js:790
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Environment.js:788
- namespace object `window/root.UF` at game/js/plugins/DEUS_Environment.js:789
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Environment.js:798
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Environment.js:815
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Environment.js:797
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Environment.js:814
Namespace property patches:
- none
Listeners and commands:
- `on` `"fire:unitBurned"` at game/js/plugins/DEUS_Environment.js:807
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `envState` at game/js/plugins/DEUS_Environment.js:86
- `getWeather` at game/js/plugins/DEUS_Environment.js:103
- `setWeather` at game/js/plugins/DEUS_Environment.js:126
- `fieldToCelsius` at game/js/plugins/DEUS_Environment.js:148
- `ambientTemperature` at game/js/plugins/DEUS_Environment.js:175
- `heatSourceRadiance` at game/js/plugins/DEUS_Environment.js:270
- `unitThermal` at game/js/plugins/DEUS_Environment.js:351
- `clothingInsulation` at game/js/plugins/DEUS_Environment.js:368
- `speciesResistances` at game/js/plugins/DEUS_Environment.js:401
- `updateWetness` at game/js/plugins/DEUS_Environment.js:420
- `stepBurning` at game/js/plugins/DEUS_Environment.js:472
- `igniteUnit` at game/js/plugins/DEUS_Environment.js:525
- `extinguishUnit` at game/js/plugins/DEUS_Environment.js:548
- `stepUnitThermal` at game/js/plugins/DEUS_Environment.js:561
- `syncWeatherVisuals` at game/js/plugins/DEUS_Environment.js:689
- `updateEnvironment` at game/js/plugins/DEUS_Environment.js:722
- `hookEvents` at game/js/plugins/DEUS_Environment.js:805
- `registerTestSuite` at game/js/plugins/DEUS_Environment.js:827
Named consumers outside this file:
- `UF.Environment` (export, this file :790):
  - plugin game/js/plugins/DEUS_Colonists.js:1600 (2 code hits; lines 1600,1919)
  - plugin game/js/plugins/DEUS_DeathForensics.js:183 (2 code hits; lines 183)
  - plugin game/js/plugins/DEUS_Depth.js:1948 (6 code hits; lines 1948,2393)
  - plugin game/js/plugins/DEUS_Jobs.js:1150 (4 code hits; lines 1150,1235,1263,1296)
  - plugin game/js/plugins/DEUS_Look.js:278 (2 code hits; lines 278,364)
  - plugin game/js/plugins/DEUS_Sheet.js:806 (1 code hit; lines 806)
  - tool tools/occlusion/bench_occlusion.js:92 (3 code hits; lines 92)
  - tool tools/occlusion/compare_planes.js:94 (3 code hits; lines 94)
  - tool tools/occlusion/live_occlusion.js:97 (3 code hits; lines 97)
  - tool tools/test_hazard_reflex.js:214 (1 code hit; lines 214)
  - tool tools/test_hazard_torture_live.js:184 (2 code hits; lines 184,253)
  - tool tools/test_native_survival_soak.js:388 (3 code hits; lines 388,389)
  - tool tools/test_second_by_second_history.js:827 (1 code hit; lines 827)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:130 (3); archive/plugins_uf_pre_rename/UF_Environment.js:787 (1); archive/plugins_uf_pre_rename/UF_Look.js:278 (2); archive/plugins_uf_pre_rename/UF_Sheet.js:705 (1); archive/plugins/DEUS_Agriculture.js:130 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:264 quotes `DEUS_Environment`
- tool tools/apply_deus_rename.js:78 quotes `DEUS_Environment`
- tool tools/apply_deus_rename.js:80 quotes `DEUS_Environment`
- tool tools/apply_deus_rename.js:82 quotes `DEUS_Environment`
- tool tools/audio/test_validate_audio_standard.js:106 quotes `DEUS_Environment.js`
- tool tools/bench_vertical_worldgen.js:154 quotes `DEUS_Environment`
- tool tools/diagnose_hotspots.js:35 quotes `DEUS_Environment.js`
- tool tools/profile_live_frames.js:362 quotes `DEUS_Environment.js`
- tool tools/test_hazard_reflex.js:44 quotes `DEUS_Environment.js`
- tool tools/test_hazard_reflex.js:211 quotes `DEUS_Environment.js`
- tool tools/test_hazard_torture_live.js:46 quotes `DEUS_Environment.js`
- tool tools/test_hazard_torture_live.js:250 quotes `DEUS_Environment.js`
- tool tools/test_native_survival_soak.js:80 quotes `DEUS_Environment.js`
- tool tools/test_second_by_second_history.js:20 quotes `DEUS_Environment`
- tool tools/test_survival_regressions.js:83 quotes `DEUS_Environment.js`
- tool tools/zrange/scan_z_literals.js:20 quotes `DEUS_Environment`
- archive quotes omitted from the live list (2 hits)

## DEUS_FactionMenus.js

Source lines: 1864.
Exports:
- `UF.NewGameSetup` at game/js/plugins/DEUS_FactionMenus.js:287
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_FactionMenus.js:285
- namespace object `window/root.UF` at game/js/plugins/DEUS_FactionMenus.js:286
Engine prototype patches:
- `Scene_Title.prototype.start` at game/js/plugins/DEUS_FactionMenus.js:97
- `InteractionManager.prototype.setCursorMode` at game/js/plugins/DEUS_FactionMenus.js:181
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_FactionMenus.js:194
- `Scene_Title.prototype.start` at game/js/plugins/DEUS_FactionMenus.js:203
- `Window_TitleCommand.prototype.makeCommandList` at game/js/plugins/DEUS_FactionMenus.js:209
- `Scene_Title.prototype.createCommandWindow` at game/js/plugins/DEUS_FactionMenus.js:217
- `Scene_Title.prototype.newGameSetupWindowRect` at game/js/plugins/DEUS_FactionMenus.js:240
- `Scene_Title.prototype.commandNewGame` at game/js/plugins/DEUS_FactionMenus.js:250
- `Scene_Title.prototype.onNewGameEmbark` at game/js/plugins/DEUS_FactionMenus.js:268
- `Scene_Title.prototype.onNewGameCancel` at game/js/plugins/DEUS_FactionMenus.js:308
- `Scene_Title.prototype.terminate` at game/js/plugins/DEUS_FactionMenus.js:323
- `Scene_Title.prototype.isBusy` at game/js/plugins/DEUS_FactionMenus.js:331
- `Window_TitleCommand.prototype.drawItemBackground` at game/js/plugins/DEUS_FactionMenus.js:1217
- `Window_TitleCommand.prototype.lineHeight` at game/js/plugins/DEUS_FactionMenus.js:1221
- `Scene_Title.prototype.commandWindowRect` at game/js/plugins/DEUS_FactionMenus.js:1225
- `Window_TitleCommand.prototype.initialize` at game/js/plugins/DEUS_FactionMenus.js:1237
- `Window_TitleCommand.prototype.select` at game/js/plugins/DEUS_FactionMenus.js:1244
- `Window_TitleCommand.prototype.drawItem` at game/js/plugins/DEUS_FactionMenus.js:1250
- `Window_TitleCommand.prototype.refreshCursor` at game/js/plugins/DEUS_FactionMenus.js:1266
- `Window_TitleCommand.prototype.update` at game/js/plugins/DEUS_FactionMenus.js:1271
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_FactionMenus.js:1277
- `Window_Base.prototype.loadWindowskin` at game/js/plugins/DEUS_FactionMenus.js:1291
- `Scene_MenuBase.prototype.createBackground` at game/js/plugins/DEUS_FactionMenus.js:1308
- `Scene_MenuBase.prototype.start` at game/js/plugins/DEUS_FactionMenus.js:1326
- `Scene_MenuBase.prototype.applyFactionTheme` at game/js/plugins/DEUS_FactionMenus.js:1341
- `Window_SavefileList.prototype.initialize` at game/js/plugins/DEUS_FactionMenus.js:1398
- `Window_SavefileList.prototype.refreshCursor` at game/js/plugins/DEUS_FactionMenus.js:1407
- `Window_SavefileList.prototype._updateCursor` at game/js/plugins/DEUS_FactionMenus.js:1415
- `Window_SavefileList.prototype._makeCursorAlpha` at game/js/plugins/DEUS_FactionMenus.js:1422
- `Window_SavefileList.prototype.update` at game/js/plugins/DEUS_FactionMenus.js:1427
- `Window_SavefileList.prototype.select` at game/js/plugins/DEUS_FactionMenus.js:1437
- `Window_SavefileList.prototype.drawItemBackground` at game/js/plugins/DEUS_FactionMenus.js:1447
- `Window_SavefileList.prototype.drawTitle` at game/js/plugins/DEUS_FactionMenus.js:1475
- `Game_Actor.prototype.faceName` at game/js/plugins/DEUS_FactionMenus.js:1491
- `Game_Actor.prototype.faceIndex` at game/js/plugins/DEUS_FactionMenus.js:1499
- `Window_Base.prototype.drawFace` at game/js/plugins/DEUS_FactionMenus.js:1506
- `Scene_Menu.prototype.update` at game/js/plugins/DEUS_FactionMenus.js:1526
Engine object patches (not prototype):
- `Input.value` at game/js/plugins/DEUS_FactionMenus.js:483
- `Input.value` at game/js/plugins/DEUS_FactionMenus.js:541
- `Input.value` at game/js/plugins/DEUS_FactionMenus.js:1162
- `TouchInput._x` at game/js/plugins/DEUS_FactionMenus.js:1665
- `TouchInput._y` at game/js/plugins/DEUS_FactionMenus.js:1666
- `TouchInput._x` at game/js/plugins/DEUS_FactionMenus.js:1671
- `TouchInput._y` at game/js/plugins/DEUS_FactionMenus.js:1672
- `Input.value` at game/js/plugins/DEUS_FactionMenus.js:1697
- `Input.value` at game/js/plugins/DEUS_FactionMenus.js:1700
- `TouchInput._x` at game/js/plugins/DEUS_FactionMenus.js:1707
- `TouchInput._y` at game/js/plugins/DEUS_FactionMenus.js:1708
- `TouchInput._x` at game/js/plugins/DEUS_FactionMenus.js:1751
- `TouchInput._y` at game/js/plugins/DEUS_FactionMenus.js:1752
- `Input._latestButton` at game/js/plugins/DEUS_FactionMenus.js:1763
- `Input._pressedTime` at game/js/plugins/DEUS_FactionMenus.js:1764
- `TouchInput._x` at game/js/plugins/DEUS_FactionMenus.js:1775
- `TouchInput._y` at game/js/plugins/DEUS_FactionMenus.js:1776
- `TouchInput._triggerX` at game/js/plugins/DEUS_FactionMenus.js:1777
- `TouchInput._triggerY` at game/js/plugins/DEUS_FactionMenus.js:1778
- `Input._latestButton` at game/js/plugins/DEUS_FactionMenus.js:1795
- `Input._pressedTime` at game/js/plugins/DEUS_FactionMenus.js:1796
Engine members read or saved:
- `Scene_Title.prototype.start` saved to `_Scene_Title_start` at game/js/plugins/DEUS_FactionMenus.js:96
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_FactionMenus.js:193
- `Scene_Title.prototype.start` saved to `_Scene_Title_start` at game/js/plugins/DEUS_FactionMenus.js:202
- `Scene_Title.prototype.createCommandWindow` saved to `_Scene_Title_createCommandWindow` at game/js/plugins/DEUS_FactionMenus.js:216
- `Scene_Title.prototype.terminate` saved to `_Scene_Title_terminate` at game/js/plugins/DEUS_FactionMenus.js:322
- `Scene_Title.prototype.isBusy` saved to `_Scene_Title_isBusy` at game/js/plugins/DEUS_FactionMenus.js:330
- `Window_TitleCommand.prototype.initialize` saved to `_Window_TitleCommand_initialize` at game/js/plugins/DEUS_FactionMenus.js:1236
- `Window_TitleCommand.prototype.select` saved to `_Window_TitleCommand_select` at game/js/plugins/DEUS_FactionMenus.js:1243
- `Window_TitleCommand.prototype.update` saved to `_Window_TitleCommand_update` at game/js/plugins/DEUS_FactionMenus.js:1270
- `Scene_Map.prototype.start` saved to `_Scene_Map_start` at game/js/plugins/DEUS_FactionMenus.js:1276
- `Window_Base.prototype.loadWindowskin` saved to `_Window_Base_loadWindowskin` at game/js/plugins/DEUS_FactionMenus.js:1290
- `Scene_MenuBase.prototype.createBackground` saved to `_Scene_MenuBase_createBackground` at game/js/plugins/DEUS_FactionMenus.js:1307
- `Scene_MenuBase.prototype.start` saved to `_Scene_MenuBase_start` at game/js/plugins/DEUS_FactionMenus.js:1325
- `Window_SavefileList.prototype.initialize` saved to `_Window_SavefileList_initialize` at game/js/plugins/DEUS_FactionMenus.js:1397
- `Window_SavefileList.prototype.update` saved to `_Window_SavefileList_update` at game/js/plugins/DEUS_FactionMenus.js:1426
- `Window_SavefileList.prototype.select` saved to `_Window_SavefileList_select` at game/js/plugins/DEUS_FactionMenus.js:1436
- `Game_Actor.prototype.faceName` saved to `_Game_Actor_faceName` at game/js/plugins/DEUS_FactionMenus.js:1490
- `Game_Actor.prototype.faceIndex` saved to `_Game_Actor_faceIndex` at game/js/plugins/DEUS_FactionMenus.js:1498
- `Window_Base.prototype.drawFace` saved to `_Window_Base_drawFace` at game/js/plugins/DEUS_FactionMenus.js:1505
- `Scene_Menu.prototype.update` saved to `_Scene_Menu_update` at game/js/plugins/DEUS_FactionMenus.js:1525
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_FactionMenus.js:1593
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_FactionMenus.js:1613
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_FactionMenus.js:1632
- `TouchInput._x` saved to `_triggerX` at game/js/plugins/DEUS_FactionMenus.js:1777
- `TouchInput._y` saved to `_triggerY` at game/js/plugins/DEUS_FactionMenus.js:1778
Namespace property patches:
- none
Listeners and commands:
- `on` `"factions:generated"` at game/js/plugins/DEUS_FactionMenus.js:1284
- `addEventListener` `"keydown"` at game/js/plugins/DEUS_FactionMenus.js:587
- `addEventListener` `"keyup"` at game/js/plugins/DEUS_FactionMenus.js:597
- `addEventListener` `"input"` at game/js/plugins/DEUS_FactionMenus.js:600
- `addEventListener` `"blur"` at game/js/plugins/DEUS_FactionMenus.js:610
- `addEventListener` `"focus"` at game/js/plugins/DEUS_FactionMenus.js:623
- `addEventListener` `"keydown"` at game/js/plugins/DEUS_FactionMenus.js:674
- `addEventListener` `"keyup"` at game/js/plugins/DEUS_FactionMenus.js:684
- `addEventListener` `"input"` at game/js/plugins/DEUS_FactionMenus.js:687
- `addEventListener` `"focus"` at game/js/plugins/DEUS_FactionMenus.js:698
- `addEventListener` `"blur"` at game/js/plugins/DEUS_FactionMenus.js:704
- `setHandler` `"embark"` at game/js/plugins/DEUS_FactionMenus.js:233
- `setHandler` `"cancel"` at game/js/plugins/DEUS_FactionMenus.js:234
Classes:
- `Window_NewGameSetup` at game/js/plugins/DEUS_FactionMenus.js:341
Named functions at brace depth 0 or 1 (capped at 40):
- `safeFaction` at game/js/plugins/DEUS_FactionMenus.js:86
- `registerChecks` at game/js/plugins/DEUS_FactionMenus.js:1546
Named consumers outside this file:
- `UF.NewGameSetup` (export, this file :287): Also assigned or declared in game/js/plugins/DEUS_Test.js:204. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Core.js:331 (4 code hits; lines 331,347)
  - plugin game/js/plugins/DEUS_Factions.js:131 (3 code hits; lines 131)
  - plugin game/js/plugins/DEUS_History.js:3469 (2 code hits; lines 3469)
  - plugin game/js/plugins/DEUS_Levels.js:4789 (2 code hits; lines 4789)
  - plugin game/js/plugins/DEUS_Test.js:204 (5 code hits; lines 204,205)
  - plugin game/js/plugins/DEUS_World.js:3844 (3 code hits; lines 3844)
  - tool tools/capture_pre_migration_baseline.js:132 (1 code hit; lines 132)
  - tool tools/dev/sim_forward.js:180 (1 code hit; lines 180)
  - tool tools/governance/fixtures/invariants/INV-SIM-01/game/js/plugins/DEUS_Core.js:3 (2 code hits; lines 3)
  - tool tools/occlusion/bench_occlusion.js:78 (2 code hits; lines 78)
  - tool tools/occlusion/compare_planes.js:75 (2 code hits; lines 75)
  - tool tools/occlusion/live_occlusion.js:77 (2 code hits; lines 77)
  - tool tools/sim/test_sim_forward_guard.js:164 (1 code hit; lines 164)
  - tool tools/sim/test_underground_year0.js:98 (1 code hit; lines 98)
  - tool tools/society/test_person_identity.js:448 (1 code hit; lines 448)
  - tool tools/test_19b_performance_determinism.js:127 (17 code hits; lines 127,128,129,130,142,143,144,174,175,176,205,206)
  - tool tools/test_build_vertical.js:286 (1 code hit; lines 286)
  - tool tools/test_generated_z2_cut_proof.js:369 (1 code hit; lines 369)
  - tool tools/test_history_materialization_and_world_age.js:158 (1 code hit; lines 158)
  - tool tools/test_native_survival_soak.js:258 (1 code hit; lines 258)
  - tool tools/test_natural_connections_no_mint.js:187 (1 code hit; lines 187)
  - tool tools/test_new_game_year0.js:146 (4 code hits; lines 146,148,345,347)
  - tool tools/test_region_seam_continuity.js:219 (1 code hit; lines 219)
  - tool tools/test_sim_tick.js:218 (1 code hit; lines 218)
  - tool tools/test_strata_cuts_and_caves.js:320 (2 code hits; lines 320,546)
  - tool tools/test_strata_fluid_reconciliation.js:149 (1 code hit; lines 149)
  - tool tools/test_strata_foundation.js:264 (2 code hits; lines 264,920)
  - tool tools/test_structural_levels.js:711 (1 code hit; lines 711)
  - tool tools/test_structural_runtime.js:295 (1 code hit; lines 295)
  - tool tools/test_structure_fluid.js:181 (1 code hit; lines 181)
  - tool tools/test_survival_regressions.js:672 (1 code hit; lines 672)
  - tool tools/test_volumetric_terrain_column.js:266 (1 code hit; lines 266)
  - tool tools/worldgen/test_vertical_biome_coupling.js:317 (1 code hit; lines 317)
  - tool tools/zrange/bench_queries.js:89 (1 code hit; lines 89)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Core.js:302 (2); archive/plugins_uf_pre_rename/UF_FactionMenus.js:277 (1); archive/plugins_uf_pre_rename/UF_Factions.js:130 (3); archive/plugins_uf_pre_rename/UF_Fog.js:481 (3); archive/plugins_uf_pre_rename/UF_History.js:317 (3); archive/plugins_uf_pre_rename/UF_World.js:360 (3)
- `Window_NewGameSetup` (class, this file :341):
  - tool tools/governance/fixtures/invariants/INV-SIM-01/game/js/plugins/DEUS_FactionMenus.js:1 (1 code hit; lines 1)
  - tool tools/test_new_game_year0.js:138 (1 code hit; lines 138)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_FactionMenus.js:233 (4)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:276 quotes `DEUS_FactionMenus`
- tool tools/performance/census_boot_load.js:72 quotes `DEUS_FactionMenus.js`
- tool tools/test_new_game_year0.js:132 quotes `DEUS_FactionMenus`
- tool tools/test_new_game_year0.js:132 quotes `DEUS_FactionMenus.js`
- tool tools/test_new_game_year0.js:133 quotes `DEUS_FactionMenus.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_Factions.js

Source lines: 1846.
Exports:
- `UF.Factions` at game/js/plugins/DEUS_Factions.js:91
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Factions.js:89
- namespace object `window/root.UF` at game/js/plugins/DEUS_Factions.js:90
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Factions.js:657
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_Factions.js:742
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Factions.js:751
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Factions.js:760
- `Window_Base.prototype.loadWindowskin` at game/js/plugins/DEUS_Factions.js:1112
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Factions.js:1156
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Factions.js:1485
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Factions.js:656
- `Scene_Map.prototype.createAllWindows` saved to `_Scene_Map_createAllWindows` at game/js/plugins/DEUS_Factions.js:741
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Factions.js:750
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Factions.js:759
- `Window_Base.prototype.loadWindowskin` saved to `_Window_Base_loadWindowskin` at game/js/plugins/DEUS_Factions.js:1111
- `Scene_Map.prototype.update` saved to `_Scene_Map_update_skins` at game/js/plugins/DEUS_Factions.js:1155
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start_skins` at game/js/plugins/DEUS_Factions.js:1484
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Factions.js:1493
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:created"` at game/js/plugins/DEUS_Factions.js:593
- `on` `"factions:born"` at game/js/plugins/DEUS_Factions.js:594
- `on` `"factions:immigrated"` at game/js/plugins/DEUS_Factions.js:601
- `on` `"combat:kill"` at game/js/plugins/DEUS_Factions.js:611
- `on` `"world:unitRemoved"` at game/js/plugins/DEUS_Factions.js:619
Classes:
- `Window_FactionLedger` at game/js/plugins/DEUS_Factions.js:685
Named functions at brace depth 0 or 1 (capped at 40):
- `hash32` at game/js/plugins/DEUS_Factions.js:46
- `mulberry32` at game/js/plugins/DEUS_Factions.js:58
- `foundersCount` at game/js/plugins/DEUS_Factions.js:271
- `withWorldState` at game/js/plugins/DEUS_Factions.js:287
- `makeHabitable` at game/js/plugins/DEUS_Factions.js:302
- `placeAreas` at game/js/plugins/DEUS_Factions.js:323
- `registerChecks` at game/js/plugins/DEUS_Factions.js:765
- `assetExists` at game/js/plugins/DEUS_Factions.js:938
- `cultureEntry` at game/js/plugins/DEUS_Factions.js:951
- `skinPlan` at game/js/plugins/DEUS_Factions.js:1019
- `buildStandIn` at game/js/plugins/DEUS_Factions.js:1042
- `isPerson` at game/js/plugins/DEUS_Factions.js:1185
- `faceStageOf` at game/js/plugins/DEUS_Factions.js:1191
- `ofCulturePeople` at game/js/plugins/DEUS_Factions.js:1203
- `openingPath` at game/js/plugins/DEUS_Factions.js:1270
- `frameOrnament` at game/js/plugins/DEUS_Factions.js:1331
- `skinChecks` at game/js/plugins/DEUS_Factions.js:1490
Named consumers outside this file:
- `UF.Factions` (export, this file :91):
  - plugin game/js/plugins/DEUS_Colonists.js:333 (18 code hits; lines 333,374,2808,2809,2854,2855,2949,3112,5691,5745,5903)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:209 (7 code hits; lines 209,465,567)
  - plugin game/js/plugins/DEUS_Combat.js:755 (6 code hits; lines 755,756,761)
  - plugin game/js/plugins/DEUS_Doors.js:182 (3 code hits; lines 182,344,708)
  - plugin game/js/plugins/DEUS_FactionMenus.js:118 (9 code hits; lines 118,119,1297,1299,1368,1369)
  - plugin game/js/plugins/DEUS_Fire.js:870 (4 code hits; lines 870,1405)
  - plugin game/js/plugins/DEUS_Floors.js:257 (3 code hits; lines 257,615,699)
  - plugin game/js/plugins/DEUS_Fog.js:348 (3 code hits; lines 348)
  - plugin game/js/plugins/DEUS_History.js:3019 (23 code hits; lines 3019,3420,3427,3485,3571,3612,3654,3672,3765,3766,3891,3893)
  - plugin game/js/plugins/DEUS_Interact.js:369 (2 code hits; lines 369,478)
  - plugin game/js/plugins/DEUS_Look.js:242 (1 code hit; lines 242)
  - plugin game/js/plugins/DEUS_Ownership.js:485 (3 code hits; lines 485)
  - plugin game/js/plugins/DEUS_Select.js:487 (1 code hit; lines 487)
  - plugin game/js/plugins/DEUS_Sheet.js:204 (1 code hit; lines 204)
  - plugin game/js/plugins/DEUS_Stance.js:128 (2 code hits; lines 128,673)
  - plugin game/js/plugins/DEUS_Talk.js:109 (1 code hit; lines 109)
  - plugin game/js/plugins/DEUS_Wildlife.js:2504 (3 code hits; lines 2504)
  - plugin game/js/plugins/DEUS_World.js:2030 (9 code hits; lines 2030,2080,2092,2093)
  - plugin game/js/plugins/DEUS_WorldGen.js:2104 (9 code hits; lines 2104,2146,2286,2307,2341,2346,2523)
  - plugin game/js/plugins/UF_Households.js:281 (2 code hits; lines 281)
  - tool tools/bench_history_sim.js:123 (1 code hit; lines 123)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:20 (1 code hit; lines 20)
  - tool tools/fixtures/UF_ZZ_OldSaveFixture.js:45 (2 code hits; lines 45,87)
  - tool tools/test_bag_and_racial_banners.js:154 (1 code hit; lines 154)
  - tool tools/test_callings_system.js:320 (1 code hit; lines 320)
  - tool tools/test_cooperative_building_and_offspring_pairbonding.js:282 (1 code hit; lines 282)
  - tool tools/test_faction_founder_pairbonding.js:209 (5 code hits; lines 209,263,301,386,417)
  - tool tools/test_faction_reproduction.js:259 (1 code hit; lines 259)
  - tool tools/test_hist_metadata_contracts.js:46 (1 code hit; lines 46)
  - tool tools/test_historical_carrying_capacity.js:155 (1 code hit; lines 155)
  - tool tools/test_population_growth_and_immigration.js:269 (4 code hits; lines 269,382,428,484)
  - tool tools/test_production_history_demographics.js:125 (1 code hit; lines 125)
  - tool tools/test_starter_kit_and_stockpile.js:67 (1 code hit; lines 67)
  - tool tools/test_z_floors.js:128 (1 code hit; lines 128)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:267 (18); archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:362 (4); archive/plugins_uf_pre_rename/UF_Combat.js:585 (6); archive/plugins_uf_pre_rename/UF_Doors.js:171 (3); archive/plugins_uf_pre_rename/UF_FactionMenus.js:119 (9); archive/plugins_uf_pre_rename/UF_Factions.js:90 (1); archive/plugins_uf_pre_rename/UF_Fire.js:715 (4); archive/plugins_uf_pre_rename/UF_Floors.js:220 (3); archive/plugins_uf_pre_rename/UF_Fog.js:318 (3); archive/plugins_uf_pre_rename/UF_History.js:3000 (19); archive/plugins_uf_pre_rename/UF_Interact.js:367 (2); archive/plugins_uf_pre_rename/UF_Look.js:242 (1); archive/plugins_uf_pre_rename/UF_Outposts.js:57 (1); archive/plugins_uf_pre_rename/UF_Ownership.js:485 (3); archive/plugins_uf_pre_rename/UF_Select.js:166 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:108 (1); archive/plugins_uf_pre_rename/UF_Skills.js:470 (4); archive/plugins_uf_pre_rename/UF_Stance.js:126 (2); archive/plugins_uf_pre_rename/UF_Talk.js:109 (1); archive/plugins_uf_pre_rename/UF_Wildlife.js:1443 (3); archive/plugins_uf_pre_rename/UF_World.js:1151 (9); archive/plugins_uf_pre_rename/UF_WorldGen.js:1322 (9); archive/plugins/DEUS_Outposts.js:57 (1); archive/plugins/DEUS_Select.js:166 (1); archive/plugins/DEUS_Skills.js:470 (4)
- `Window_FactionLedger` (class, this file :685):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Factions.js:714 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:85 quotes `DEUS_Factions`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_Factions`
- tool tools/register_world_plugins.js:14 quotes `DEUS_Factions`
- tool tools/run_all_suites.js:23 quotes `DEUS_Factions`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_Factions`
- tool tools/sim/test_underground_year0.js:30 quotes `DEUS_Factions`
- tool tools/society/test_person_identity.js:31 quotes `DEUS_Factions`
- tool tools/society/test_race_class_affinity.js:27 quotes `DEUS_Factions.js`
- tool tools/test_callings_system.js:311 quotes `DEUS_Factions.js`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:262 quotes `DEUS_Factions`
- tool tools/test_faction_construction_and_homes.js:230 quotes `DEUS_Factions`
- tool tools/test_faction_founder_pairbonding.js:193 quotes `DEUS_Factions.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_Factions`
- tool tools/test_lazy_area_generation.js:441 quotes `DEUS_Factions.js`
- tool tools/test_lazy_area_generation.js:445 quotes `DEUS_Factions.js`
- tool tools/test_native_survival_soak.js:68 quotes `DEUS_Factions.js`
- tool tools/test_new_game_year0.js:39 quotes `DEUS_Factions`
- tool tools/test_sim_tick.js:32 quotes `DEUS_Factions`
- tool tools/test_survival_regressions.js:71 quotes `DEUS_Factions.js`
- tool tools/test_volumetric_terrain_column.js:125 quotes `DEUS_Factions.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:36 quotes `DEUS_Factions`
- archive quotes omitted from the live list (2 hits)

## DEUS_Fire.js

Source lines: 1781.
Exports:
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Fire.js:1360
- namespace object `window/root.UF` at game/js/plugins/DEUS_Fire.js:1361
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Fire.js:617
- `Game_CharacterBase.prototype.isMapPassable` at game/js/plugins/DEUS_Fire.js:736
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Fire.js:1166
- `MW.prototype.initialize` at game/js/plugins/DEUS_Fire.js:1214
- `MW.prototype.setOptions` at game/js/plugins/DEUS_Fire.js:1226
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Fire.js:1384
Engine object patches (not prototype):
- `DataManager.createGameObjects` at game/js/plugins/DEUS_Fire.js:1377
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Fire.js:616
- `Game_CharacterBase.prototype.isMapPassable` saved to `_Game_CharacterBase_isMapPassable` at game/js/plugins/DEUS_Fire.js:735
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Fire.js:1165
- `MW.prototype.initialize` saved to `init` at game/js/plugins/DEUS_Fire.js:1213
- `MW.prototype.setOptions` saved to `setOptions` at game/js/plugins/DEUS_Fire.js:1224
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Fire.js:1383
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Fire.js:1172
- `DataManager.createGameObjects` saved to `_DataManager_createGameObjects` at game/js/plugins/DEUS_Fire.js:1376
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:objectChanged"` at game/js/plugins/DEUS_Fire.js:1371
- `on` `"world:levelObjectChanged"` at game/js/plugins/DEUS_Fire.js:1372
- `on` `"fire:ignited"` at game/js/plugins/DEUS_Fire.js:1467
- `on` `"fire:unitBurned"` at game/js/plugins/DEUS_Fire.js:1608
Classes:
- `Sprite_UFFireLayer` at game/js/plugins/DEUS_Fire.js:1030
Named functions at brace depth 0 or 1 (capped at 40):
- `hash01` at game/js/plugins/DEUS_Fire.js:104
- `conf` at game/js/plugins/DEUS_Fire.js:113
- `ruleForType` at game/js/plugins/DEUS_Fire.js:143
- `sourceTypes` at game/js/plugins/DEUS_Fire.js:159
- `isHearthType` at game/js/plugins/DEUS_Fire.js:173
- `sourceRecord` at game/js/plugins/DEUS_Fire.js:177
- `sourceInfoAt` at game/js/plugins/DEUS_Fire.js:189
- `fireState` at game/js/plugins/DEUS_Fire.js:209
- `migrateProvenance` at game/js/plugins/DEUS_Fire.js:223
- `parseKey` at game/js/plugins/DEUS_Fire.js:249
- `index` at game/js/plugins/DEUS_Fire.js:264
- `indexAdd` at game/js/plugins/DEUS_Fire.js:277
- `indexRemove` at game/js/plugins/DEUS_Fire.js:286
- `burningIn` at game/js/plugins/DEUS_Fire.js:293
- `calendarNow` at game/js/plugins/DEUS_Fire.js:312
- `provenanceFor` at game/js/plugins/DEUS_Fire.js:328
- `dropBurning` at game/js/plugins/DEUS_Fire.js:349
- `pruneFires` at game/js/plugins/DEUS_Fire.js:361
- `ignite` at game/js/plugins/DEUS_Fire.js:374
- `stopDouseJobsFor` at game/js/plugins/DEUS_Fire.js:397
- `extinguish` at game/js/plugins/DEUS_Fire.js:411
- `burnOut` at game/js/plugins/DEUS_Fire.js:436
- `groundKindAt` at game/js/plugins/DEUS_Fire.js:451
- `autotileShape` at game/js/plugins/DEUS_Fire.js:456
- `reshape` at game/js/plugins/DEUS_Fire.js:463
- `setGround` at game/js/plugins/DEUS_Fire.js:476
- `sourceCells` at game/js/plugins/DEUS_Fire.js:492
- `onObjectChanged` at game/js/plugins/DEUS_Fire.js:509
- `beat` at game/js/plugins/DEUS_Fire.js:522
- `safeBeat` at game/js/plugins/DEUS_Fire.js:605
- `standableIn` at game/js/plugins/DEUS_Fire.js:630
- `safeCellNear` at game/js/plugins/DEUS_Fire.js:637
- `burnUnit` at game/js/plugins/DEUS_Fire.js:654
- `flee` at game/js/plugins/DEUS_Fire.js:710
- `hurtUnits` at game/js/plugins/DEUS_Fire.js:719
- `standBeside` at game/js/plugins/DEUS_Fire.js:761
- `findWater` at game/js/plugins/DEUS_Fire.js:775
- `retarget` at game/js/plugins/DEUS_Fire.js:794
- `defineDouse` at game/js/plugins/DEUS_Fire.js:818
- `douse` at game/js/plugins/DEUS_Fire.js:861
- 9 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `Sprite_UFFireLayer` (class, this file :1030):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Fire.js:875 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:246 quotes `DEUS_Fire`
- tool tools/diagnose_hotspots.js:40 quotes `DEUS_Fire.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Fire`
- tool tools/test_fire_safety.js:6 quotes `DEUS_Fire`
- tool tools/test_hearth_containment_and_provenance.js:35 quotes `DEUS_Fire.js`
- tool tools/test_hearth_containment_and_provenance.js:195 quotes `DEUS_Fire.js`
- tool tools/test_native_survival_soak.js:81 quotes `DEUS_Fire.js`
- tool tools/test_settlement_domestic_housing.js:51 quotes `DEUS_Fire.js`
- tool tools/test_settlement_domestic_housing.js:249 quotes `DEUS_Fire.js`
- tool tools/test_survival_regressions.js:84 quotes `DEUS_Fire.js`
- tool tools/test_z_fire.js:71 quotes `DEUS_Fire.js`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_Fire`
- archive quotes omitted from the live list (2 hits)

## DEUS_Floors.js

Source lines: 925.
Exports:
- `UF.Rooms` at game/js/plugins/DEUS_Floors.js:462
- `UF.Floors` at game/js/plugins/DEUS_Floors.js:785
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Floors.js:460
- namespace object `window/root.UF` at game/js/plugins/DEUS_Floors.js:461
Engine prototype patches:
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Floors.js:799
Engine object patches (not prototype):
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Floors.js:791
Engine members read or saved:
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Floors.js:798
- `DataManager.extractSaveContents` saved to `_extractSaveContents` at game/js/plugins/DEUS_Floors.js:790
Namespace property patches:
- none
Listeners and commands:
- `on` `"objects:changed"` at game/js/plugins/DEUS_Floors.js:761
- `on` `"objects:levelChanged"` at game/js/plugins/DEUS_Floors.js:762
- `on` `"world:tileChanged"` at game/js/plugins/DEUS_Floors.js:763
- `on` `"world:levelTileChanged"` at game/js/plugins/DEUS_Floors.js:764
- `on` `"levels:shapeChanged"` at game/js/plugins/DEUS_Floors.js:765
- `on` `"world:created"` at game/js/plugins/DEUS_Floors.js:766
- `on` `"time:day"` at game/js/plugins/DEUS_Floors.js:776
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `matterNote` at game/js/plugins/DEUS_Floors.js:43
- `matterCover` at game/js/plugins/DEUS_Floors.js:60
- `supportedArea` at game/js/plugins/DEUS_Floors.js:72
- `floorState` at game/js/plugins/DEUS_Floors.js:82
- `isFloorAt` at game/js/plugins/DEUS_Floors.js:88
- `kindAt` at game/js/plugins/DEUS_Floors.js:100
- `isWater` at game/js/plugins/DEUS_Floors.js:106
- `inBounds` at game/js/plugins/DEUS_Floors.js:112
- `isBarrier` at game/js/plugins/DEUS_Floors.js:116
- `isGap` at game/js/plugins/DEUS_Floors.js:126
- `cellWalkableForRoom` at game/js/plugins/DEUS_Floors.js:131
- `cacheFor` at game/js/plugins/DEUS_Floors.js:143
- `invalidate` at game/js/plugins/DEUS_Floors.js:149
- `computeRoom` at game/js/plugins/DEUS_Floors.js:152
- `roomAt` at game/js/plugins/DEUS_Floors.js:177
- `roomFromHouse` at game/js/plugins/DEUS_Floors.js:187
- `roomValue` at game/js/plugins/DEUS_Floors.js:204
- `hasOpaqueOverburden` at game/js/plugins/DEUS_Floors.js:217
- `isRoofed` at game/js/plugins/DEUS_Floors.js:223
- `applyRoofedUpperDeck` at game/js/plugins/DEUS_Floors.js:247
- `cellRef` at game/js/plugins/DEUS_Floors.js:329
- `levelExists` at game/js/plugins/DEUS_Floors.js:340
- `strataOf` at game/js/plugins/DEUS_Floors.js:344
- `fillOf` at game/js/plugins/DEUS_Floors.js:349
- `structuralObjectAt` at game/js/plugins/DEUS_Floors.js:354
- `solidBlockAt` at game/js/plugins/DEUS_Floors.js:359
- `blockNeighbours` at game/js/plugins/DEUS_Floors.js:367
- `attachment` at game/js/plugins/DEUS_Floors.js:383
- `slabCheck` at game/js/plugins/DEUS_Floors.js:411
- `placement` at game/js/plugins/DEUS_Floors.js:426
- `writeSlab` at game/js/plugins/DEUS_Floors.js:442
- `slabAt` at game/js/plugins/DEUS_Floors.js:453
- `shapeAt` at game/js/plugins/DEUS_Floors.js:464
- `reshapeAround` at game/js/plugins/DEUS_Floors.js:470
- `setGround` at game/js/plugins/DEUS_Floors.js:481
- `setFloor` at game/js/plugins/DEUS_Floors.js:493
- `removeFloor` at game/js/plugins/DEUS_Floors.js:503
- `canLay` at game/js/plugins/DEUS_Floors.js:513
- `consumeGround` at game/js/plugins/DEUS_Floors.js:532
- `defineJobType` at game/js/plugins/DEUS_Floors.js:541
- 9 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.Rooms` (export, this file :462):
  - plugin game/js/plugins/DEUS_Environment.js:451 (1 code hit; lines 451)
  - tool tools/test_second_by_second_history.js:805 (3 code hits; lines 805,806,807)
  - tool tools/test_z_floors.js:62 (1 code hit; lines 62)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Environment.js:449 (1); archive/plugins_uf_pre_rename/UF_Floors.js:271 (1)
- `UF.Floors` (export, this file :785):
  - plugin game/js/plugins/DEUS_Colonists.js:3770 (11 code hits; lines 3770,3782,3784,3904,3950)
  - plugin game/js/plugins/DEUS_Ecology.js:257 (1 code hit; lines 257)
  - plugin game/js/plugins/DEUS_Environment.js:63 (1 code hit; lines 63)
  - plugin game/js/plugins/DEUS_History.js:1486 (4 code hits; lines 1486,1940,2109,2296)
  - plugin game/js/plugins/DEUS_Interact.js:423 (3 code hits; lines 423,555)
  - plugin game/js/plugins/DEUS_Jobs.js:820 (1 code hit; lines 820)
  - plugin game/js/plugins/DEUS_Objects.js:261 (1 code hit; lines 261)
  - plugin game/js/plugins/DEUS_Select.js:378 (1 code hit; lines 378)
  - plugin game/js/plugins/test_build_vertical_ingame.js:10 (2 code hits; lines 10)
  - plugin game/js/plugins/UF_Households.js:891 (1 code hit; lines 891)
  - tool tools/smoke_19a_playtest.js:181 (4 code hits; lines 181,184)
  - tool tools/test_build_vertical.js:359 (2 code hits; lines 359,676)
  - tool tools/test_regrowth_construction_guard.js:275 (6 code hits; lines 275,281,298,409,438,508)
  - tool tools/test_strata_foundation.js:301 (2 code hits; lines 301,748)
  - tool tools/test_z_floors.js:62 (1 code hit; lines 62)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:2813 (10); archive/plugins_uf_pre_rename/UF_Ecology.js:257 (1); archive/plugins_uf_pre_rename/UF_Environment.js:61 (1); archive/plugins_uf_pre_rename/UF_Floors.js:565 (1); archive/plugins_uf_pre_rename/UF_History.js:1254 (4); archive/plugins_uf_pre_rename/UF_Households.js:1379 (2); archive/plugins_uf_pre_rename/UF_Objects.js:182 (1); archive/plugins_uf_pre_rename/UF_Outposts.js:59 (1); archive/plugins_uf_pre_rename/UF_Select.js:119 (1); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:168 (1); archive/plugins/DEUS_Households.js:1379 (2); archive/plugins/DEUS_Outposts.js:59 (1); archive/plugins/DEUS_Select.js:119 (1); archive/plugins/DEUS_SettlementPillars.js:168 (1)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:127 quotes `DEUS_Floors`
- tool tools/capture_pre_migration_baseline.js:114 quotes `DEUS_Floors.js`
- tool tools/performance/census_boot_load.js:70 quotes `DEUS_Floors.js`
- tool tools/register_world_plugins.js:14 quotes `DEUS_Floors`
- tool tools/sim/test_reclaim.js:366 quotes `DEUS_Floors.js`
- tool tools/test_19b_performance_determinism.js:101 quotes `DEUS_Floors.js`
- tool tools/test_build_vertical.js:98 quotes `DEUS_Floors.js`
- tool tools/test_build_vertical.js:100 quotes `DEUS_Floors.js`
- tool tools/test_build_vertical.js:102 quotes `DEUS_Floors.js`
- tool tools/test_build_vertical.js:104 quotes `DEUS_Floors.js`
- tool tools/test_build_vertical.js:106 quotes `DEUS_Floors.js`
- tool tools/test_build_vertical.js:109 quotes `DEUS_Floors.js`
- tool tools/test_build_vertical.js:274 quotes `DEUS_Floors.js`
- tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:44 quotes `DEUS_Floors.js`
- tool tools/test_generated_z2_cut_proof.js:363 quotes `DEUS_Floors.js`
- tool tools/test_natural_connections_no_mint.js:86 quotes `DEUS_Floors.js`
- tool tools/test_region_seam_continuity.js:42 quotes `DEUS_Floors.js`
- tool tools/test_second_by_second_history.js:19 quotes `DEUS_Floors`
- tool tools/test_strata_cuts_and_caves.js:203 quotes `DEUS_Floors.js`
- tool tools/test_strata_fluid_reconciliation.js:43 quotes `DEUS_Floors.js`
- tool tools/test_strata_foundation.js:139 quotes `DEUS_Floors.js`
- tool tools/test_strata_foundation.js:161 quotes `DEUS_Floors.js`
- tool tools/test_structural_levels.js:705 quotes `DEUS_Floors.js`
- tool tools/test_structural_runtime.js:273 quotes `DEUS_Floors.js`
- tool tools/test_structure_fluid.js:175 quotes `DEUS_Floors.js`
- tool tools/test_z_floors.js:54 quotes `DEUS_Floors.js`
- tool tools/zrange/bench_queries.js:24 quotes `DEUS_Floors.js`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_Floors`
- archive quotes omitted from the live list (2 hits)

## DEUS_FlowFields.js

Source lines: 176.
Exports:
- `UF.Pathfinding` at game/js/plugins/DEUS_FlowFields.js:16 fallback (`||`)
- namespace object `window/root.UF` at game/js/plugins/DEUS_FlowFields.js:15
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- `UF.Pathfinding.requestFlowField` at game/js/plugins/DEUS_FlowFields.js:156
- `UF.Pathfinding.getFlowDir` at game/js/plugins/DEUS_FlowFields.js:167
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `FlowField` at game/js/plugins/DEUS_FlowFields.js:32
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- `UF.Pathfinding` (export, this file :16): no-call-found-after-defined-search. Not labeled dead.
- `FlowField` (class, this file :32): no-call-found-after-defined-search. Not labeled dead.
Unqualified property names (length >= 10; may be a different binding):
- `requestFlowField` from `UF.Pathfinding.requestFlowField` at :156: no-call-found-after-defined-search outside this file. Not labeled dead.
- `getFlowDir` from `UF.Pathfinding.getFlowDir` at :167: no-call-found-after-defined-search outside this file. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:43 quotes `DEUS_FlowFields`
- tool tools/ops/update_plugins.js:16 quotes `DEUS_FlowFields`

## DEUS_Fluid.js

Source lines: 1344.
Exports:
- `UF.Fluid` at game/js/plugins/DEUS_Fluid.js:1285
- `Imported.DEUS_Fluid` at game/js/plugins/DEUS_Fluid.js:52
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Fluid.js:68
- namespace object `window/root.UF` at game/js/plugins/DEUS_Fluid.js:68
- namespace object `window/root.UF` at game/js/plugins/DEUS_Fluid.js:70
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Fluid.js:72
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Fluid.js:1322
- `Game_Map.prototype.setup` at game/js/plugins/DEUS_Fluid.js:1329
Engine object patches (not prototype):
- `DataManager.makeSaveContents` at game/js/plugins/DEUS_Fluid.js:1304
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Fluid.js:1313
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Fluid.js:1321
- `Game_Map.prototype.setup` saved to `_Game_Map_setup` at game/js/plugins/DEUS_Fluid.js:1328
- `DataManager.makeSaveContents` saved to `_DataManager_makeSaveContents` at game/js/plugins/DEUS_Fluid.js:1303
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Fluid.js:1312
Namespace property patches:
- none
Listeners and commands:
- `on` `"levels:cellChanged"` at game/js/plugins/DEUS_Fluid.js:1238
- `on` `"levels:shapeChanged"` at game/js/plugins/DEUS_Fluid.js:1239
- `on` `"levels:strataChanged"` at game/js/plugins/DEUS_Fluid.js:1240
- `on` `"levels:strataDestroyed"` at game/js/plugins/DEUS_Fluid.js:1241
- `on` `"world:areaBuilt"` at game/js/plugins/DEUS_Fluid.js:1244
- `on` `"world:levelBuilt"` at game/js/plugins/DEUS_Fluid.js:1245
- `on` `"doors:opened"` at game/js/plugins/DEUS_Fluid.js:1248
- `on` `"doors:closed"` at game/js/plugins/DEUS_Fluid.js:1258
- `on` `"doors:broken"` at game/js/plugins/DEUS_Fluid.js:1268
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `bindSharedNamespace` at game/js/plugins/DEUS_Fluid.js:65
- `zRange` at game/js/plugins/DEUS_Fluid.js:88
- `parseCoords` at game/js/plugins/DEUS_Fluid.js:100
- `workBudget` at game/js/plugins/DEUS_Fluid.js:146
- `syncRange` at game/js/plugins/DEUS_Fluid.js:153
- `getDepth` at game/js/plugins/DEUS_Fluid.js:193
- `getType` at game/js/plugins/DEUS_Fluid.js:197
- `packVal` at game/js/plugins/DEUS_Fluid.js:201
- `typeName` at game/js/plugins/DEUS_Fluid.js:205
- `typeCode` at game/js/plugins/DEUS_Fluid.js:211
- `areaKey` at game/js/plugins/DEUS_Fluid.js:217
- `getMapSize` at game/js/plugins/DEUS_Fluid.js:221
- `getAreaData` at game/js/plugins/DEUS_Fluid.js:234
- `gridFor` at game/js/plugins/DEUS_Fluid.js:260
- `zeroGrid` at game/js/plugins/DEUS_Fluid.js:271
- `cellIdOf` at game/js/plugins/DEUS_Fluid.js:277
- `decodeCellId` at game/js/plugins/DEUS_Fluid.js:283
- `coordsOf` at game/js/plugins/DEUS_Fluid.js:292
- `enqueueCell` at game/js/plugins/DEUS_Fluid.js:298
- `wakeCellAndNeighbors` at game/js/plugins/DEUS_Fluid.js:321
- `checkObjBarrier` at game/js/plugins/DEUS_Fluid.js:330
- `isObjectBarrier` at game/js/plugins/DEUS_Fluid.js:344
- `isBarrier` at game/js/plugins/DEUS_Fluid.js:360
- `canDrainDown` at game/js/plugins/DEUS_Fluid.js:380
- `fluidCanPassLaterally` at game/js/plugins/DEUS_Fluid.js:407
- `stepArea` at game/js/plugins/DEUS_Fluid.js:447
- `lakeShare` at game/js/plugins/DEUS_Fluid.js:1026
- `loadHydroModule` at game/js/plugins/DEUS_Fluid.js:1032
- `sumWaterGrid` at game/js/plugins/DEUS_Fluid.js:1045
- `writeWaterCell` at game/js/plugins/DEUS_Fluid.js:1058
- `levelsApi` at game/js/plugins/DEUS_Fluid.js:1089
- `makeHydroIO` at game/js/plugins/DEUS_Fluid.js:1094
- `hydroSession` at game/js/plugins/DEUS_Fluid.js:1134
- `reconcileCellWithStrata` at game/js/plugins/DEUS_Fluid.js:1142
- `cancelAttachWait` at game/js/plugins/DEUS_Fluid.js:1211
- `liveNamespace` at game/js/plugins/DEUS_Fluid.js:1218
- `setupEventHooks` at game/js/plugins/DEUS_Fluid.js:1222
- `attachFluid` at game/js/plugins/DEUS_Fluid.js:1283
- `ensureAttached` at game/js/plugins/DEUS_Fluid.js:1291
module.exports assignments: game/js/plugins/DEUS_Fluid.js:1341
Named consumers outside this file:
- `UF.Fluid` (export, this file :1285):
  - plugin game/js/plugins/DEUS_DeathForensics.js:193 (2 code hits; lines 193)
  - plugin game/js/plugins/DEUS_Levels.js:2460 (45 code hits; lines 2460,2461,4294,4295,4313,4314,4316,4334,4335,4348,4349,4360)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:522 (1 code hit; lines 522)
  - plugin game/js/plugins/DEUS_Test.js:545 (1 code hit; lines 545)
  - plugin game/js/plugins/DEUS_World.js:2831 (6 code hits; lines 2831,2832,3491,3492)
  - tool tools/sim/test_fluid_attach.js:155 (8 code hits; lines 155,163,165,183,189,267,274,277)
  - tool tools/sim/test_living_world_rules.js:357 (5 code hits; lines 357,762,764,775,838)
  - tool tools/sim/test_water_dynamics.js:95 (1 code hit; lines 95)
  - tool tools/test_build_vertical.js:387 (3 code hits; lines 387)
  - tool tools/test_liquid_depth_simulation.js:74 (6 code hits; lines 74,75,113,131)
  - tool tools/test_natural_connections_no_mint.js:189 (3 code hits; lines 189,230,332)
  - tool tools/test_strata_fluid_reconciliation.js:173 (1 code hit; lines 173)
  - tool tools/test_structural_runtime.js:384 (1 code hit; lines 384)
  - tool tools/test_structure_fluid.js:297 (3 code hits; lines 297,298,300)
  - tool tools/zrange/zrange_suite.js:204 (3 code hits; lines 204)
- `Imported.DEUS_Fluid` (imported-flag, this file :52): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:95 quotes `DEUS_Fluid`
- tool tools/performance/census_boot_load.js:68 quotes `DEUS_Fluid.js`
- tool tools/sim/test_fluid_attach.js:17 quotes `DEUS_Fluid.js`
- tool tools/sim/test_fluid_attach.js:71 quotes `DEUS_Fluid.js`
- tool tools/sim/test_fluid_attach.js:72 quotes `DEUS_Fluid.js`
- tool tools/sim/test_fluid_attach.js:292 quotes `DEUS_Fluid.js`
- tool tools/sim/test_living_world_rules.js:348 quotes `DEUS_Fluid.js`
- tool tools/sim/test_living_world_rules.js:352 quotes `DEUS_Fluid.js`
- tool tools/sim/test_living_world_rules.js:715 quotes `DEUS_Fluid.js`
- tool tools/sim/test_living_world_rules.js:716 quotes `DEUS_Fluid.js`
- tool tools/sim/test_living_world_rules.js:856 quotes `DEUS_Fluid.js`
- tool tools/sim/test_water_dynamics.js:85 quotes `DEUS_Fluid.js`
- tool tools/test_build_vertical.js:274 quotes `DEUS_Fluid.js`
- tool tools/test_liquid_depth_simulation.js:126 quotes `DEUS_Fluid.js`
- tool tools/test_liquid_depth_simulation.js:127 quotes `DEUS_Fluid.js`
- tool tools/test_natural_connections_no_mint.js:87 quotes `DEUS_Fluid.js`
- tool tools/test_sparse_outer_save.js:162 quotes `DEUS_Fluid.js`
- tool tools/test_strata_fluid_reconciliation.js:43 quotes `DEUS_Fluid.js`
- tool tools/test_strata_fluid_reconciliation.js:133 quotes `DEUS_Fluid.js`
- tool tools/test_strata_fluid_reconciliation.js:135 quotes `DEUS_Fluid.js`
- tool tools/test_strata_fluid_reconciliation.js:141 quotes `DEUS_Fluid.js`
- tool tools/test_structural_levels.js:705 quotes `DEUS_Fluid.js`
- tool tools/test_structural_runtime.js:273 quotes `DEUS_Fluid.js`
- tool tools/test_structure_fluid.js:175 quotes `DEUS_Fluid.js`
- tool tools/zrange/scan_z_literals.js:20 quotes `DEUS_Fluid`

## DEUS_Fog.js

Source lines: 810.
Exports:
- `UF.Fog` at game/js/plugins/DEUS_Fog.js:517
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Fog.js:515
- namespace object `window/root.UF` at game/js/plugins/DEUS_Fog.js:516
Engine prototype patches:
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Fog.js:628
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Fog.js:638
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Fog.js:671
Engine object patches (not prototype):
- `Bitmap.smooth` at game/js/plugins/DEUS_Fog.js:547
- `DataManager.makeSaveContents` at game/js/plugins/DEUS_Fog.js:644
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Fog.js:650
- `DataManager.createGameObjects` at game/js/plugins/DEUS_Fog.js:659
Engine members read or saved:
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Fog.js:627
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Fog.js:637
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Fog.js:670
- `DataManager.makeSaveContents` saved to `_DataManager_makeSaveContents` at game/js/plugins/DEUS_Fog.js:643
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Fog.js:649
- `DataManager.createGameObjects` saved to `_DataManager_createGameObjects` at game/js/plugins/DEUS_Fog.js:658
Namespace property patches:
- `UF.World.state.fog` at game/js/plugins/DEUS_Fog.js:119
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `Sprite_UFFog` at game/js/plugins/DEUS_Fog.js:523
Named functions at brace depth 0 or 1 (capped at 40):
- `currentZ` at game/js/plugins/DEUS_Fog.js:91
- `encode` at game/js/plugins/DEUS_Fog.js:123
- `decode` at game/js/plugins/DEUS_Fog.js:130
- `flush` at game/js/plugins/DEUS_Fog.js:138
- `ensureMap` at game/js/plugins/DEUS_Fog.js:142
- `isOpaque` at game/js/plugins/DEUS_Fog.js:161
- `mark` at game/js/plugins/DEUS_Fog.js:211
- `unitRace` at game/js/plugins/DEUS_Fog.js:261
- `colonistSightRadius` at game/js/plugins/DEUS_Fog.js:281
- `resolveEnabled` at game/js/plugins/DEUS_Fog.js:510
- `registerChecks` at game/js/plugins/DEUS_Fog.js:676
Named consumers outside this file:
- `UF.Fog` (export, this file :517):
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:549 (7 code hits; lines 549,554,572,573)
  - plugin game/js/plugins/DEUS_DayNight.js:132 (20 code hits; lines 132,133,134,273,529,533,538,546,602,609)
  - plugin game/js/plugins/DEUS_FactionMenus.js:298 (5 code hits; lines 298,299,1857)
  - plugin game/js/plugins/DEUS_Levels.js:5041 (8 code hits; lines 5041,5845,5846,5847)
  - plugin game/js/plugins/DEUS_Look.js:379 (2 code hits; lines 379,410)
  - plugin game/js/plugins/DEUS_Test.js:287 (2 code hits; lines 287)
  - tool tools/fixtures/UF_SleepRuntime.js:49 (2 code hits; lines 49)
  - tool tools/fixtures/UF_SocietyRuntime.js:72 (2 code hits; lines 72)
  - tool tools/test_layer_switch_inplace.js:163 (1 code hit; lines 163)
  - tool tools/test_seamless_map_edges.js:159 (1 code hit; lines 159)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:445 (7); archive/plugins_uf_pre_rename/UF_DayNight.js:131 (20); archive/plugins_uf_pre_rename/UF_FactionMenus.js:286 (5); archive/plugins_uf_pre_rename/UF_Fog.js:491 (1); archive/plugins_uf_pre_rename/UF_Levels.js:2621 (5); archive/plugins_uf_pre_rename/UF_Look.js:379 (2); archive/plugins_uf_pre_rename/UF_Test.js:251 (2)
- `Sprite_UFFog` (class, this file :523):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Fog.js:497 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:181 quotes `DEUS_Fog`
- tool tools/diagnose_hotspots.js:41 quotes `DEUS_Fog.js`
- tool tools/profile_live_frames.js:356 quotes `DEUS_Fog.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Fog`
- tool tools/run_all_suites.js:24 quotes `DEUS_Fog`
- tool tools/test_seamless_map_edges.js:155 quotes `DEUS_Fog.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_Generator.js

Source lines: 315.
Exports:
- `UF.Generator` at game/js/plugins/DEUS_Generator.js:28 fallback (`||`)
- `Imported.UF_Generator` at game/js/plugins/DEUS_Generator.js:22
- namespace object `window/root.UF` at game/js/plugins/DEUS_Generator.js:25
Engine prototype patches:
- none
Engine object patches (not prototype):
- `ImageManager.loadCharacter` at game/js/plugins/DEUS_Generator.js:283
- `ImageManager.loadFace` at game/js/plugins/DEUS_Generator.js:299
Engine members read or saved:
- `ImageManager.loadCharacter` saved to `_ImageManager_loadCharacter` at game/js/plugins/DEUS_Generator.js:282
- `ImageManager.loadFace` saved to `_ImageManager_loadFace` at game/js/plugins/DEUS_Generator.js:298
Namespace property patches:
- `UF.Generator.HAIR_RAMPS` at game/js/plugins/DEUS_Generator.js:38
- `UF.Generator._bitmapCache` at game/js/plugins/DEUS_Generator.js:39
- `UF.Generator.pool` at game/js/plugins/DEUS_Generator.js:70
- `UF.Generator.clothingIndexForUnit` at game/js/plugins/DEUS_Generator.js:74
- `UF.Generator.armorSheetForUnit` at game/js/plugins/DEUS_Generator.js:131
- `UF.Generator.specFor` at game/js/plugins/DEUS_Generator.js:144
- `UF.Generator.applyToUnit` at game/js/plugins/DEUS_Generator.js:214
- `UF.Generator.setOutfit` at game/js/plugins/DEUS_Generator.js:262
- `UF.Generator.syncEquipmentToPortrait` at game/js/plugins/DEUS_Generator.js:272
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `loadPool` at game/js/plugins/DEUS_Generator.js:43
Named consumers outside this file:
- `UF.Generator` (export, this file :28):
  - plugin game/js/plugins/DEUS_Colonists.js:117 (4 code hits; lines 117,732,733)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:505 (3 code hits; lines 505,506)
  - tool tools/test_dynamic_armor_reflection.js:69 (16 code hits; lines 69,70,71,84,85,97,98,110,111,123,124,136)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:90 (7); archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:402 (3); archive/plugins_uf_pre_rename/UF_Generator.js:28 (17)
- `Imported.UF_Generator` (imported-flag, this file :22):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Generator.js:22 (1)
Unqualified property names (length >= 10; may be a different binding):
- `HAIR_RAMPS` from `UF.Generator.HAIR_RAMPS` at :38: tool tools/bake_generator_pool.js:7 (1); tool tools/test_dynamic_armor_reflection.js:7 (1); tool tools/test_generator_combinations.js:19 (9)
- `_bitmapCache` from `UF.Generator._bitmapCache` at :39: no-call-found-after-defined-search outside this file. Not labeled dead.
- `clothingIndexForUnit` from `UF.Generator.clothingIndexForUnit` at :74: tool tools/test_dynamic_armor_reflection.js:69 (7)
- `armorSheetForUnit` from `UF.Generator.armorSheetForUnit` at :131: plugin game/js/plugins/DEUS_ColonyOverseer.js:505 (2); tool tools/test_dynamic_armor_reflection.js:70 (8)
- `applyToUnit` from `UF.Generator.applyToUnit` at :214: plugin game/js/plugins/DEUS_Colonists.js:3359 (2)
- `syncEquipmentToPortrait` from `UF.Generator.syncEquipmentToPortrait` at :272: plugin game/js/plugins/DEUS_Colonists.js:732 (2); tool tools/test_dynamic_armor_reflection.js:71 (1)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:133 quotes `DEUS_Generator`
- tool tools/bench_vertical_worldgen.js:259 quotes `DEUS_Generator`
- tool tools/test_dynamic_armor_reflection.js:65 quotes `DEUS_Generator.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_HistoricalDemographics.js

Source lines: 687.
Exports:
- `UF.HistoricalDemographics` at game/js/plugins/DEUS_HistoricalDemographics.js:685
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `jsonSafe` at game/js/plugins/DEUS_HistoricalDemographics.js:35
- `namesValid` at game/js/plugins/DEUS_HistoricalDemographics.js:44
- `profilesValid` at game/js/plugins/DEUS_HistoricalDemographics.js:47
- `sha256` at game/js/plugins/DEUS_HistoricalDemographics.js:58
- `canonicalProfileData` at game/js/plugins/DEUS_HistoricalDemographics.js:113
- `demographicColumns` at game/js/plugins/DEUS_HistoricalDemographics.js:158
- `matchesDefaultProfiles` at game/js/plugins/DEUS_HistoricalDemographics.js:196
- `deriveSiteCapacity` at game/js/plugins/DEUS_HistoricalDemographics.js:214
- `alive` at game/js/plugins/DEUS_HistoricalDemographics.js:223
- `lifespan` at game/js/plugins/DEUS_HistoricalDemographics.js:224
- `ancestor` at game/js/plugins/DEUS_HistoricalDemographics.js:227
- `kinshipRelated` at game/js/plugins/DEUS_HistoricalDemographics.js:247
- `emit` at game/js/plugins/DEUS_HistoricalDemographics.js:263
- `partner` at game/js/plugins/DEUS_HistoricalDemographics.js:267
- `fertile` at game/js/plugins/DEUS_HistoricalDemographics.js:275
- `pair` at game/js/plugins/DEUS_HistoricalDemographics.js:279
- `succession` at game/js/plugins/DEUS_HistoricalDemographics.js:306
- `create` at game/js/plugins/DEUS_HistoricalDemographics.js:329
- `validate` at game/js/plugins/DEUS_HistoricalDemographics.js:426
- `conditionsValid` at game/js/plugins/DEUS_HistoricalDemographics.js:529
- `step` at game/js/plugins/DEUS_HistoricalDemographics.js:536
- `simulate` at game/js/plugins/DEUS_HistoricalDemographics.js:604
- `summary` at game/js/plugins/DEUS_HistoricalDemographics.js:621
- `migrate` at game/js/plugins/DEUS_HistoricalDemographics.js:631
Named consumers outside this file:
- `UF.HistoricalDemographics` (export, this file :685):
  - plugin game/js/plugins/DEUS_History.js:138 (7 code hits; lines 138,139,145,453)
  - tool tools/dev/sim_forward.js:246 (3 code hits; lines 246,247,249)
  - tool tools/sim/test_sim_forward_guard.js:281 (1 code hit; lines 281)
  - tool tools/test_hist_metadata_contracts.js:48 (1 code hit; lines 48)
  - tool tools/test_historical_carrying_capacity.js:160 (1 code hit; lines 160)
  - tool tools/test_history_materialization_and_world_age.js:89 (3 code hits; lines 89,168,169)
  - tool tools/test_history.js:29 (3 code hits; lines 29,115,116)
  - tool tools/test_production_history_demographics.js:131 (1 code hit; lines 131)
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:100 quotes `DEUS_HistoricalDemographics`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_HistoricalDemographics`
- tool tools/dev/sim_forward.js:27 quotes `DEUS_HistoricalDemographics.js`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_HistoricalDemographics`
- tool tools/sim/test_underground_year0.js:31 quotes `DEUS_HistoricalDemographics`
- tool tools/society/test_person_identity.js:32 quotes `DEUS_HistoricalDemographics`
- tool tools/test_hist_metadata_contracts.js:32 quotes `DEUS_HistoricalDemographics.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_HistoricalDemographics`
- tool tools/test_native_survival_soak.js:71 quotes `DEUS_HistoricalDemographics.js`
- tool tools/test_new_game_year0.js:40 quotes `DEUS_HistoricalDemographics`
- tool tools/test_sim_tick.js:33 quotes `DEUS_HistoricalDemographics`
- tool tools/test_survival_regressions.js:74 quotes `DEUS_HistoricalDemographics.js`
- tool tools/test_volumetric_terrain_column.js:125 quotes `DEUS_HistoricalDemographics.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:37 quotes `DEUS_HistoricalDemographics`
- tool tools/zrange/scan_z_literals.js:22 quotes `DEUS_HistoricalDemographics`

## DEUS_History.js

Source lines: 4227.
Exports:
- `UF.History` at game/js/plugins/DEUS_History.js:212
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_History.js:210
- namespace object `window/root.UF` at game/js/plugins/DEUS_History.js:211
Engine prototype patches:
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_History.js:3724
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_History.js:3733
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_History.js:3743
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_History.js:3828
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_History.js:3851
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Scene_Map.prototype.createAllWindows` saved to `_Scene_Map_createAllWindows` at game/js/plugins/DEUS_History.js:3723
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_History.js:3732
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_History.js:3742
- `Scene_Map.prototype.start` saved to `_Scene_Map_start_capture` at game/js/plugins/DEUS_History.js:3827
- `Scene_Map.prototype.update` saved to `_Scene_Map_update_capture` at game/js/plugins/DEUS_History.js:3850
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:created"` at game/js/plugins/DEUS_History.js:3468
- `on` `"world:created"` at game/js/plugins/DEUS_History.js:3748
- `on` `"history:event"` at game/js/plugins/DEUS_History.js:4189
Classes:
- `Window_UFChronicle` at game/js/plugins/DEUS_History.js:3513
Named functions at brace depth 0 or 1 (capped at 40):
- `hash32` at game/js/plugins/DEUS_History.js:98
- `mulberry32` at game/js/plugins/DEUS_History.js:110
- `getCallings` at game/js/plugins/DEUS_History.js:122
- `getDemographics` at game/js/plugins/DEUS_History.js:137
- `getDnd5e` at game/js/plugins/DEUS_History.js:152
- `getItems` at game/js/plugins/DEUS_History.js:167
- `withWorldState` at game/js/plugins/DEUS_History.js:229
- `makeNamer` at game/js/plugins/DEUS_History.js:245
- `kindsFor` at game/js/plugins/DEUS_History.js:265
- `kindConfig` at game/js/plugins/DEUS_History.js:270
- `placeSite` at game/js/plugins/DEUS_History.js:285
- `placeHome` at game/js/plugins/DEUS_History.js:334
- `campCell` at game/js/plugins/DEUS_History.js:615
- `nameTable` at game/js/plugins/DEUS_History.js:666
- `personName` at game/js/plugins/DEUS_History.js:674
- `founderSurnames` at game/js/plugins/DEUS_History.js:690
- `found` at game/js/plugins/DEUS_History.js:715
- `simulate` at game/js/plugins/DEUS_History.js:903
- `rollStats` at game/js/plugins/DEUS_History.js:1149
- `settle` at game/js/plugins/DEUS_History.js:1164
- `seedStarterChest` at game/js/plugins/DEUS_History.js:2776
- `placeCamps` at game/js/plugins/DEUS_History.js:2816
- `spawnFounders` at game/js/plugins/DEUS_History.js:2923
- `spawnSettled` at game/js/plugins/DEUS_History.js:3180
- `piecesFor` at game/js/plugins/DEUS_History.js:3349
- `registerChecks` at game/js/plugins/DEUS_History.js:3759
Named consumers outside this file:
- `UF.History` (export, this file :212):
  - plugin game/js/plugins/DEUS_Colonists.js:370 (4 code hits; lines 370,774)
  - plugin game/js/plugins/DEUS_Combat.js:1257 (1 code hit; lines 1257)
  - plugin game/js/plugins/DEUS_Doors.js:438 (7 code hits; lines 438,458,483,484,590,658)
  - plugin game/js/plugins/DEUS_Ecology.js:66 (1 code hit; lines 66)
  - plugin game/js/plugins/DEUS_Factions.js:1196 (1 code hit; lines 1196)
  - plugin game/js/plugins/DEUS_Floors.js:171 (3 code hits; lines 171,634,699)
  - plugin game/js/plugins/DEUS_Look.js:307 (2 code hits; lines 307,393)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:122 (6 code hits; lines 122,146)
  - plugin game/js/plugins/DEUS_Talk.js:110 (1 code hit; lines 110)
  - plugin game/js/plugins/DEUS_Wildlife.js:470 (1 code hit; lines 470)
  - plugin game/js/plugins/DEUS_WorldGen.js:1152 (7 code hits; lines 1152,1154,2341,2347,2495)
  - tool tools/bench_history_sim.js:129 (1 code hit; lines 129)
  - tool tools/test_bag_and_racial_banners.js:155 (2 code hits; lines 155,156)
  - tool tools/test_callings_system.js:321 (2 code hits; lines 321,323)
  - tool tools/test_cooperative_building_and_offspring_pairbonding.js:283 (2 code hits; lines 283,286)
  - tool tools/test_faction_founder_pairbonding.js:210 (8 code hits; lines 210,271,302,305,387,388,418,419)
  - tool tools/test_faction_starting_gear.js:147 (1 code hit; lines 147)
  - tool tools/test_hist_metadata_contracts.js:47 (1 code hit; lines 47)
  - tool tools/test_historical_carrying_capacity.js:155 (1 code hit; lines 155)
  - tool tools/test_history_materialization_and_world_age.js:73 (4 code hits; lines 73,142,160,161)
  - tool tools/test_native_survival_soak.js:250 (1 code hit; lines 250)
  - tool tools/test_production_history_demographics.js:125 (1 code hit; lines 125)
  - tool tools/test_second_by_second_history.js:342 (40 code hits; lines 342,347,364,365,370,393,394,396,447,448,451,473)
  - tool tools/test_sim_tick.js:227 (1 code hit; lines 227)
  - tool tools/test_starter_kit_and_stockpile.js:68 (2 code hits; lines 68,69)
  - tool tools/test_survival_regressions.js:669 (1 code hit; lines 669)
  - tool tools/test_volumetric_terrain_column.js:535 (4 code hits; lines 535,537,540)
  - tool tools/test_z_floors.js:127 (1 code hit; lines 127)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:304 (4); archive/plugins_uf_pre_rename/UF_Combat.js:857 (2); archive/plugins_uf_pre_rename/UF_Doors.js:406 (7); archive/plugins_uf_pre_rename/UF_Ecology.js:66 (1); archive/plugins_uf_pre_rename/UF_Factions.js:1232 (1); archive/plugins_uf_pre_rename/UF_Floors.js:146 (3); archive/plugins_uf_pre_rename/UF_History.js:156 (1); archive/plugins_uf_pre_rename/UF_Look.js:307 (2); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:119 (6); archive/plugins_uf_pre_rename/UF_Outposts.js:869 (15); archive/plugins_uf_pre_rename/UF_Roads.js:58 (1); archive/plugins_uf_pre_rename/UF_Skills.js:475 (8); archive/plugins_uf_pre_rename/UF_Talk.js:110 (1); archive/plugins_uf_pre_rename/UF_Wildlife.js:408 (1); archive/plugins_uf_pre_rename/UF_WorldGen.js:921 (7); archive/plugins/DEUS_Outposts.js:869 (15); archive/plugins/DEUS_Roads.js:58 (1); archive/plugins/DEUS_Skills.js:475 (8)
- `Window_UFChronicle` (class, this file :3513):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_History.js:3084 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:91 quotes `DEUS_History`
- tool tools/bench_history_sim.js:113 quotes `DEUS_History`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_History`
- tool tools/register_world_plugins.js:14 quotes `DEUS_History`
- tool tools/run_all_suites.js:23 quotes `DEUS_History`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_History`
- tool tools/sim/test_sim_forward_guard.js:142 quotes `DEUS_History`
- tool tools/sim/test_underground_year0.js:30 quotes `DEUS_History`
- tool tools/society/test_person_identity.js:31 quotes `DEUS_History`
- tool tools/test_callings_system.js:312 quotes `DEUS_History.js`
- tool tools/test_combat_dying_integration.js:139 quotes `DEUS_History.js`
- tool tools/test_combat_dying_integration.js:158 quotes `DEUS_History.js`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:22 quotes `DEUS_History`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:262 quotes `DEUS_History`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:267 quotes `DEUS_History`
- tool tools/test_faction_construction_and_homes.js:230 quotes `DEUS_History`
- tool tools/test_faction_founder_pairbonding.js:194 quotes `DEUS_History.js`
- tool tools/test_faction_starting_gear.js:141 quotes `DEUS_History.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_History`
- tool tools/test_native_survival_soak.js:72 quotes `DEUS_History.js`
- tool tools/test_new_game_year0.js:39 quotes `DEUS_History`
- tool tools/test_second_by_second_history.js:16 quotes `DEUS_History`
- tool tools/test_sim_tick.js:32 quotes `DEUS_History`
- tool tools/test_survival_regressions.js:75 quotes `DEUS_History.js`
- tool tools/test_volumetric_terrain_column.js:125 quotes `DEUS_History.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:36 quotes `DEUS_History`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_History`
- archive quotes omitted from the live list (2 hits)

## DEUS_Interact.js

Source lines: 1185.
Exports:
- `UF.Interact` at game/js/plugins/DEUS_Interact.js:787
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Interact.js:785
- namespace object `window/root.UF` at game/js/plugins/DEUS_Interact.js:786
Engine prototype patches:
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Interact.js:916
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Interact.js:921
- `Scene_Map.prototype.updateOverseerControls` at game/js/plugins/DEUS_Interact.js:931
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Interact.js:937
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Interact.js:945
Engine object patches (not prototype):
- `TouchInput._x` at game/js/plugins/DEUS_Interact.js:975
- `TouchInput._y` at game/js/plugins/DEUS_Interact.js:976
- `TouchInput._x` at game/js/plugins/DEUS_Interact.js:1051
- `TouchInput._y` at game/js/plugins/DEUS_Interact.js:1052
Engine members read or saved:
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Interact.js:915
- `Spriteset_Map.prototype.update` saved to `_Spriteset_Map_update` at game/js/plugins/DEUS_Interact.js:920
- `Scene_Map.prototype.updateOverseerControls` saved to `_updateOverseerControls` at game/js/plugins/DEUS_Interact.js:930
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Interact.js:936
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Interact.js:944
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Interact.js:680
- `Graphics.frameCount` saved to `swallowFrame` at game/js/plugins/DEUS_Interact.js:693
- `Graphics.frameCount` saved to `swallowFrame` at game/js/plugins/DEUS_Interact.js:719
- `Graphics.frameCount` saved to `swallowFrame` at game/js/plugins/DEUS_Interact.js:746
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Interact.js:752
- `Graphics.frameCount` saved to `frame` at game/js/plugins/DEUS_Interact.js:849
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Interact.js:907
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Interact.js:1015
Namespace property patches:
- none
Listeners and commands:
- `setHandler` `"pick"` at game/js/plugins/DEUS_Interact.js:689
- `setHandler` `"cancel"` at game/js/plugins/DEUS_Interact.js:690
Classes:
- `Window_UFContextMenu` at game/js/plugins/DEUS_Interact.js:574
- `Sprite_UFDesignation` at game/js/plugins/DEUS_Interact.js:818
- `DesignationMarkers` at game/js/plugins/DEUS_Interact.js:840
Named functions at brace depth 0 or 1 (capped at 40):
- `defineJobTypes` at game/js/plugins/DEUS_Interact.js:125
- `autotileShape` at game/js/plugins/DEUS_Interact.js:201
- `diggable` at game/js/plugins/DEUS_Interact.js:225
- `reshapeGround` at game/js/plugins/DEUS_Interact.js:238
- `digCell` at game/js/plugins/DEUS_Interact.js:256
- `designations` at game/js/plugins/DEUS_Interact.js:273
- `designationsAt` at game/js/plugins/DEUS_Interact.js:277
- `designate` at game/js/plugins/DEUS_Interact.js:285
- `cancelAt` at game/js/plugins/DEUS_Interact.js:292
- `selectedColonistId` at game/js/plugins/DEUS_Interact.js:310
- `nearestColonistId` at game/js/plugins/DEUS_Interact.js:319
- `personalJob` at game/js/plugins/DEUS_Interact.js:330
- `stockpileFor` at game/js/plugins/DEUS_Interact.js:346
- `cultureWall` at game/js/plugins/DEUS_Interact.js:373
- `buildOptions` at game/js/plugins/DEUS_Interact.js:392
- `verticalOptions` at game/js/plugins/DEUS_Interact.js:422
- `structureLine` at game/js/plugins/DEUS_Interact.js:443
- `lookLines` at game/js/plugins/DEUS_Interact.js:452
- `selectColonist` at game/js/plugins/DEUS_Interact.js:458
- `infoLines` at game/js/plugins/DEUS_Interact.js:473
- `optionsFor` at game/js/plugins/DEUS_Interact.js:487
- `headerFor` at game/js/plugins/DEUS_Interact.js:562
- `purgeGraveyard` at game/js/plugins/DEUS_Interact.js:626
- `measureWidth` at game/js/plugins/DEUS_Interact.js:636
- `registerChecks` at game/js/plugins/DEUS_Interact.js:954
Named consumers outside this file:
- `UF.Interact` (export, this file :787):
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:302 (1 code hit; lines 302)
  - plugin game/js/plugins/DEUS_Doors.js:547 (7 code hits; lines 547,792,813,823)
  - plugin game/js/plugins/DEUS_Fire.js:459 (10 code hits; lines 459,1205,1479,1483,1484,1486,1487)
  - plugin game/js/plugins/DEUS_Floors.js:465 (9 code hits; lines 465,729,739,904)
  - plugin game/js/plugins/DEUS_Jobs.js:2085 (2 code hits; lines 2085)
  - plugin game/js/plugins/DEUS_Levels.js:6130 (3 code hits; lines 6130)
  - plugin game/js/plugins/DEUS_Look.js:632 (1 code hit; lines 632)
  - plugin game/js/plugins/DEUS_Select.js:376 (1 code hit; lines 376)
  - plugin game/js/plugins/DEUS_Sheet.js:944 (5 code hits; lines 944,1425,2512,2558,2607)
  - plugin game/js/plugins/DEUS_Talk.js:115 (1 code hit; lines 115)
  - tool tools/test_build_vertical.js:359 (2 code hits; lines 359,676)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:216 (1); archive/plugins_uf_pre_rename/UF_Doors.js:508 (7); archive/plugins_uf_pre_rename/UF_Fire.js:316 (10); archive/plugins_uf_pre_rename/UF_Floors.js:274 (9); archive/plugins_uf_pre_rename/UF_Interact.js:732 (1); archive/plugins_uf_pre_rename/UF_Levels.js:2889 (3); archive/plugins_uf_pre_rename/UF_Look.js:629 (1); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:303 (3); archive/plugins_uf_pre_rename/UF_Select.js:117 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:817 (5); archive/plugins_uf_pre_rename/UF_Talk.js:115 (1); archive/plugins/DEUS_ProfileTabs.js:303 (3); archive/plugins/DEUS_Select.js:117 (1)
- `Window_UFContextMenu` (class, this file :574):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Interact.js:525 (3)
- `Sprite_UFDesignation` (class, this file :818):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Interact.js:763 (3)
- `DesignationMarkers` (class, this file :840):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Interact.js:785 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:228 quotes `DEUS_Interact`
- tool tools/profile_live_frames.js:388 quotes `DEUS_Interact.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Interact`
- tool tools/run_all_suites.js:24 quotes `DEUS_Interact`
- tool tools/test_build_vertical.js:118 quotes `DEUS_Interact.js`
- tool tools/test_build_vertical.js:120 quotes `DEUS_Interact.js`
- tool tools/test_build_vertical.js:274 quotes `DEUS_Interact.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_Items.js

Source lines: 1852.
Exports:
- `UF.Items` at game/js/plugins/DEUS_Items.js:104
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Items.js:102
- namespace object `window/root.UF` at game/js/plugins/DEUS_Items.js:103
Engine prototype patches:
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Items.js:1577
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Items.js:1587
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Items.js:1576
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Items.js:1586
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Items.js:1572
Namespace property patches:
- none
Listeners and commands:
- dynamic `.on(` at game/js/plugins/DEUS_Items.js:76 (name not a literal; unknown)
Classes:
- `Sprite_UFItemLayer` at game/js/plugins/DEUS_Items.js:1437
Named functions at brace depth 0 or 1 (capped at 40):
- `matterNote` at game/js/plugins/DEUS_Items.js:58
- `typeTable` at game/js/plugins/DEUS_Items.js:124
- `itemState` at game/js/plugins/DEUS_Items.js:254
- `areaCells` at game/js/plugins/DEUS_Items.js:263
- `indexAdd` at game/js/plugins/DEUS_Items.js:273
- `indexRemove` at game/js/plugins/DEUS_Items.js:282
- `ready` at game/js/plugins/DEUS_Items.js:292
- `changed` at game/js/plugins/DEUS_Items.js:304
- `itemsOnCell` at game/js/plugins/DEUS_Items.js:309
- `inventoryArray` at game/js/plugins/DEUS_Items.js:316
- `placeOnCell` at game/js/plugins/DEUS_Items.js:321
- `detach` at game/js/plugins/DEUS_Items.js:330
- `canMerge` at game/js/plugins/DEUS_Items.js:352
- `isFactionCreature` at game/js/plugins/DEUS_Items.js:1346
- `giveFactionStartingKit` at game/js/plugins/DEUS_Items.js:1363
- `sidecarOf` at game/js/plugins/DEUS_Items.js:1406
- `registerChecks` at game/js/plugins/DEUS_Items.js:1592
Named consumers outside this file:
- `UF.Items` (export, this file :104):
  - plugin game/js/plugins/DEUS_Anim.js:121 (2 code hits; lines 121,1833)
  - plugin game/js/plugins/DEUS_Bag.js:39 (2 code hits; lines 39)
  - plugin game/js/plugins/DEUS_Colonists.js:112 (1 code hit; lines 112)
  - plugin game/js/plugins/DEUS_Combat.js:126 (3 code hits; lines 126,260,2552)
  - plugin game/js/plugins/DEUS_Conditions.js:266 (1 code hit; lines 266)
  - plugin game/js/plugins/DEUS_Containers.js:54 (1 code hit; lines 54)
  - plugin game/js/plugins/DEUS_Depth.js:656 (4 code hits; lines 656,985,1997,2595)
  - plugin game/js/plugins/DEUS_Environment.js:66 (1 code hit; lines 66)
  - plugin game/js/plugins/DEUS_Fire.js:81 (2 code hits; lines 81,1397)
  - plugin game/js/plugins/DEUS_Floors.js:40 (1 code hit; lines 40)
  - plugin game/js/plugins/DEUS_Generator.js:85 (3 code hits; lines 85,86)
  - plugin game/js/plugins/DEUS_History.js:168 (14 code hits; lines 168,169,175,537,1619,1652,1654,3055,3302)
  - plugin game/js/plugins/DEUS_Interact.js:101 (1 code hit; lines 101)
  - plugin game/js/plugins/DEUS_Jobs.js:72 (2 code hits; lines 72,2102)
  - plugin game/js/plugins/DEUS_Levels.js:5887 (1 code hit; lines 5887)
  - plugin game/js/plugins/DEUS_Look.js:296 (4 code hits; lines 296,383,644,664)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:443 (1 code hit; lines 443)
  - plugin game/js/plugins/DEUS_Objects.js:485 (7 code hits; lines 485,488,519,1423)
  - plugin game/js/plugins/DEUS_Ownership.js:175 (1 code hit; lines 175)
  - plugin game/js/plugins/DEUS_Projects.js:151 (2 code hits; lines 151,1700)
  - plugin game/js/plugins/DEUS_Select.js:372 (2 code hits; lines 372,1370)
  - plugin game/js/plugins/DEUS_Sheet.js:201 (1 code hit; lines 201)
  - plugin game/js/plugins/DEUS_Stockpiles.js:79 (1 code hit; lines 79)
  - plugin game/js/plugins/DEUS_Structural.js:417 (1 code hit; lines 417)
  - plugin game/js/plugins/DEUS_Test.js:365 (1 code hit; lines 365)
  - plugin game/js/plugins/DEUS_Wildlife.js:1497 (1 code hit; lines 1497)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:185 (1 code hit; lines 185)
  - tool tools/fixtures/UF_CapturePreVertical.js:24 (1 code hit; lines 24)
  - tool tools/fixtures/UF_SocietyRuntime.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_ZFlora.js:14 (1 code hit; lines 14)
  - tool tools/fixtures/UF_ZIntegration.js:14 (1 code hit; lines 14)
  - tool tools/occlusion/live_occlusion.js:84 (2 code hits; lines 84,86)
  - tool tools/rules/bind.js:27 (1 code hit; lines 27)
  - tool tools/sim/test_wildlife_rules_damage.js:171 (1 code hit; lines 171)
  - tool tools/taming_party/test_tamed_party_combat.js:623 (1 code hit; lines 623)
  - tool tools/test_agriculture.js:42 (2 code hits; lines 42,68)
  - tool tools/test_autonomous_project_dispatch.js:200 (1 code hit; lines 200)
  - tool tools/test_autonomous_settlement_closure.js:201 (1 code hit; lines 201)
  - tool tools/test_autonomous_work_recovery.js:229 (1 code hit; lines 229)
  - tool tools/test_bag_and_racial_banners.js:115 (14 code hits; lines 115,141,171,178,179,191,207,222,224,226,235,252)
  - tool tools/test_build_vertical.js:359 (2 code hits; lines 359,676)
  - tool tools/test_collapse_ingame.js:72 (1 code hit; lines 72)
  - tool tools/test_column_landforms.js:198 (1 code hit; lines 198)
  - tool tools/test_conditions_native_closure.js:197 (1 code hit; lines 197)
  - tool tools/test_creature_inventory_black_box.js:162 (4 code hits; lines 162,267,301,302)
  - tool tools/test_d20_equipment_slots.js:160 (3 code hits; lines 160,196,259)
  - tool tools/test_duplicate_registration.js:175 (1 code hit; lines 175)
  - tool tools/test_equipment_drag.js:25 (1 code hit; lines 25)
  - tool tools/test_extraction_difficulty.js:142 (1 code hit; lines 142)
  - tool tools/test_faction_starting_gear.js:146 (1 code hit; lines 146)
  - tool tools/test_hazard_reflex.js:214 (1 code hit; lines 214)
  - tool tools/test_hazard_torture_live.js:253 (1 code hit; lines 253)
  - tool tools/test_material_recipes.js:113 (1 code hit; lines 113)
  - tool tools/test_material_substitution.js:96 (47 code hits; lines 96,97,98,99,100,101,102,103,125,126,127,128)
  - tool tools/test_multi_deficit_settlement.js:174 (1 code hit; lines 174)
  - tool tools/test_native_survival_soak.js:254 (1 code hit; lines 254)
  - tool tools/test_physical_inventory_proof.js:104 (1 code hit; lines 104)
  - tool tools/test_project_construction_loop.js:205 (1 code hit; lines 205)
  - tool tools/test_resource_node_materials.js:128 (1 code hit; lines 128)
  - tool tools/test_settlement_domestic_housing.js:250 (1 code hit; lines 250)
  - tool tools/test_settlement_expansion_multi_dwelling.js:230 (1 code hit; lines 230)
  - tool tools/test_settlement_projects.js:196 (1 code hit; lines 196)
  - tool tools/test_srd_combat_proof.js:116 (1 code hit; lines 116)
  - tool tools/test_stabilization.js:175 (1 code hit; lines 175)
  - tool tools/test_starter_kit_and_stockpile.js:50 (7 code hits; lines 50,54,58,78,84,87,88)
  - tool tools/test_stockpiles_designation.js:189 (1 code hit; lines 189)
  - tool tools/test_structural_runtime.js:384 (1 code hit; lines 384)
  - tool tools/test_survival_needs_loop.js:196 (1 code hit; lines 196)
  - tool tools/test_survival_regressions.js:288 (1 code hit; lines 288)
  - tool tools/test_unified_capability_proof.js:102 (1 code hit; lines 102)
  - tool tools/zrange/zrange_suite.js:52 (1 code hit; lines 52)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:28 (1); archive/plugins_uf_pre_rename/UF_Anim.js:111 (2); archive/plugins_uf_pre_rename/UF_Colonists.js:75 (1); archive/plugins_uf_pre_rename/UF_Combat.js:97 (2); archive/plugins_uf_pre_rename/UF_Construction.js:38 (1); archive/plugins_uf_pre_rename/UF_Containers.js:54 (1); archive/plugins_uf_pre_rename/UF_CultureGrowth.js:49 (4); archive/plugins_uf_pre_rename/UF_Environment.js:64 (1); archive/plugins_uf_pre_rename/UF_Fire.js:64 (2); archive/plugins_uf_pre_rename/UF_Floors.js:40 (1); archive/plugins_uf_pre_rename/UF_Generator.js:85 (3); archive/plugins_uf_pre_rename/UF_Goals.js:24 (1); archive/plugins_uf_pre_rename/UF_History.js:1387 (5); archive/plugins_uf_pre_rename/UF_Interact.js:99 (1); archive/plugins_uf_pre_rename/UF_Items.js:76 (1); archive/plugins_uf_pre_rename/UF_Jobs.js:70 (2); archive/plugins_uf_pre_rename/UF_Levels.js:2663 (1); archive/plugins_uf_pre_rename/UF_Look.js:296 (4); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:516 (1); archive/plugins_uf_pre_rename/UF_Objects.js:372 (7); archive/plugins_uf_pre_rename/UF_Outposts.js:56 (1); archive/plugins_uf_pre_rename/UF_Ownership.js:175 (1); archive/plugins_uf_pre_rename/UF_Proficiency.js:53 (1); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:463 (3); archive/plugins_uf_pre_rename/UF_Resources.js:50 (1); archive/plugins_uf_pre_rename/UF_Rules.js:52 (9); archive/plugins_uf_pre_rename/UF_Sanitation.js:15 (1); archive/plugins_uf_pre_rename/UF_Select.js:113 (1); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:57 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:105 (1); archive/plugins_uf_pre_rename/UF_Skills.js:58 (2); archive/plugins_uf_pre_rename/UF_Wildlife.js:1126 (1); archive/plugins/DEUS_Agriculture.js:28 (1); archive/plugins/DEUS_Construction.js:38 (1); archive/plugins/DEUS_Containers.js:54 (1); archive/plugins/DEUS_CultureGrowth.js:49 (4); archive/plugins/DEUS_Goals.js:24 (1); archive/plugins/DEUS_Outposts.js:56 (1); archive/plugins/DEUS_Proficiency.js:53 (1); archive/plugins/DEUS_ProfileTabs.js:463 (3); archive/plugins/DEUS_Resources.js:50 (1); archive/plugins/DEUS_Rules.js:52 (9); archive/plugins/DEUS_Sanitation.js:15 (1); archive/plugins/DEUS_Select.js:113 (1); archive/plugins/DEUS_SettlementPillars.js:57 (1); archive/plugins/DEUS_Skills.js:58 (2)
- `Sprite_UFItemLayer` (class, this file :1437):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Items.js:1020 (4)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:115 quotes `DEUS_Items`
- tool tools/register_world_plugins.js:14 quotes `DEUS_Items`
- tool tools/run_all_suites.js:23 quotes `DEUS_Items`
- tool tools/sim/test_reclaim.js:367 quotes `DEUS_Items.js`
- tool tools/test_agriculture.js:8 quotes `DEUS_Items`
- tool tools/test_autonomous_project_dispatch.js:41 quotes `DEUS_Items.js`
- tool tools/test_autonomous_project_dispatch.js:196 quotes `DEUS_Items.js`
- tool tools/test_autonomous_settlement_closure.js:48 quotes `DEUS_Items.js`
- tool tools/test_autonomous_settlement_closure.js:197 quotes `DEUS_Items.js`
- tool tools/test_autonomous_work_recovery.js:41 quotes `DEUS_Items.js`
- tool tools/test_autonomous_work_recovery.js:225 quotes `DEUS_Items.js`
- tool tools/test_build_vertical.js:273 quotes `DEUS_Items.js`
- tool tools/test_column_landforms.js:180 quotes `DEUS_Items.js`
- tool tools/test_combat_dying_integration.js:135 quotes `DEUS_Items.js`
- tool tools/test_combat_dying_integration.js:154 quotes `DEUS_Items.js`
- tool tools/test_conditions_native_closure.js:36 quotes `DEUS_Items.js`
- tool tools/test_conditions_native_closure.js:190 quotes `DEUS_Items.js`
- tool tools/test_duplicate_registration.js:168 quotes `DEUS_Items.js`
- tool tools/test_extraction_difficulty.js:17 quotes `DEUS_Items.js`
- tool tools/test_faction_starting_gear.js:140 quotes `DEUS_Items.js`
- tool tools/test_hazard_reflex.js:44 quotes `DEUS_Items.js`
- tool tools/test_hazard_reflex.js:207 quotes `DEUS_Items.js`
- tool tools/test_hazard_torture_live.js:46 quotes `DEUS_Items.js`
- tool tools/test_hazard_torture_live.js:246 quotes `DEUS_Items.js`
- tool tools/test_material_recipes.js:110 quotes `DEUS_Items.js`
- tool tools/test_material_substitution.js:65 quotes `DEUS_Items.js`
- tool tools/test_multi_deficit_settlement.js:35 quotes `DEUS_Items.js`
- tool tools/test_multi_deficit_settlement.js:170 quotes `DEUS_Items.js`
- tool tools/test_native_survival_soak.js:75 quotes `DEUS_Items.js`
- tool tools/test_project_construction_loop.js:41 quotes `DEUS_Items.js`
- tool tools/test_project_construction_loop.js:201 quotes `DEUS_Items.js`
- tool tools/test_resource_node_materials.js:17 quotes `DEUS_Items.js`
- tool tools/test_settlement_domestic_housing.js:51 quotes `DEUS_Items.js`
- tool tools/test_settlement_domestic_housing.js:244 quotes `DEUS_Items.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:44 quotes `DEUS_Items.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:226 quotes `DEUS_Items.js`
- tool tools/test_settlement_projects.js:40 quotes `DEUS_Items.js`
- tool tools/test_settlement_projects.js:193 quotes `DEUS_Items.js`
- tool tools/test_stabilization.js:36 quotes `DEUS_Items.js`
- tool tools/test_stabilization.js:171 quotes `DEUS_Items.js`
- tool tools/test_stockpiles_designation.js:182 quotes `DEUS_Items.js`
- tool tools/test_structural_runtime.js:273 quotes `DEUS_Items.js`
- tool tools/test_survival_needs_loop.js:42 quotes `DEUS_Items.js`
- tool tools/test_survival_needs_loop.js:192 quotes `DEUS_Items.js`
- tool tools/test_survival_regressions.js:78 quotes `DEUS_Items.js`
- tool tools/test_vertical_worldgen_proof.js:235 quotes `DEUS_Items.js`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_Items`
- archive quotes omitted from the live list (2 hits)

## DEUS_Jobs.js

Source lines: 2370.
Exports:
- `UF.Jobs` at game/js/plugins/DEUS_Jobs.js:1936
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Jobs.js:1934
- namespace object `window/root.UF` at game/js/plugins/DEUS_Jobs.js:1935
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Jobs.js:2012
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Jobs.js:2041
Engine object patches (not prototype):
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Jobs.js:2019
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Jobs.js:2011
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Jobs.js:2040
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Jobs.js:2018
Namespace property patches:
- none
Listeners and commands:
- `on` `"levels:strataChanged"` at game/js/plugins/DEUS_Jobs.js:2005
- `on` `"world:unitBlocked"` at game/js/plugins/DEUS_Jobs.js:2029
- `on` `"world:unitRemoved"` at game/js/plugins/DEUS_Jobs.js:2033
- dynamic `.on(` at game/js/plugins/DEUS_Jobs.js:2145 (name not a literal; unknown)
Classes:
- `ReservationManager` at game/js/plugins/DEUS_Jobs.js:141
Named functions at brace depth 0 or 1 (capped at 40):
- `matterNote` at game/js/plugins/DEUS_Jobs.js:77
- `matterCover` at game/js/plugins/DEUS_Jobs.js:94
- `jobState` at game/js/plugins/DEUS_Jobs.js:127
- `isWaterIn` at game/js/plugins/DEUS_Jobs.js:220
- `occupiedIn` at game/js/plugins/DEUS_Jobs.js:252
- `standableIn` at game/js/plugins/DEUS_Jobs.js:280
- `unitDistance` at game/js/plugins/DEUS_Jobs.js:305
- `octileDistance` at game/js/plugins/DEUS_Jobs.js:311
- `standFor` at game/js/plugins/DEUS_Jobs.js:323
- `standForReach` at game/js/plugins/DEUS_Jobs.js:364
- `define` at game/js/plugins/DEUS_Jobs.js:424
- `verticalStratum` at game/js/plugins/DEUS_Jobs.js:572
- `pickPhasePlan` at game/js/plugins/DEUS_Jobs.js:678
- `legalLift` at game/js/plugins/DEUS_Jobs.js:698
- `pickUpNow` at game/js/plugins/DEUS_Jobs.js:713
- `consumeBuildItems` at game/js/plugins/DEUS_Jobs.js:807
- `placementOf` at game/js/plugins/DEUS_Jobs.js:819
- `lethalHazardAt` at game/js/plugins/DEUS_Jobs.js:1122
- `inLethalHazard` at game/js/plugins/DEUS_Jobs.js:1146
- `fireNear` at game/js/plugins/DEUS_Jobs.js:1158
- `safeCellNear` at game/js/plugins/DEUS_Jobs.js:1177
- `carriesWater` at game/js/plugins/DEUS_Jobs.js:1226
- `standBesideSafe` at game/js/plugins/DEUS_Jobs.js:1239
- `create` at game/js/plugins/DEUS_Jobs.js:1398
- `byId` at game/js/plugins/DEUS_Jobs.js:1436
- `of` at game/js/plugins/DEUS_Jobs.js:1440
- `unitEvent` at game/js/plugins/DEUS_Jobs.js:1445
- `stopWorking` at game/js/plugins/DEUS_Jobs.js:1449
- `fail` at game/js/plugins/DEUS_Jobs.js:1454
- `cancel` at game/js/plugins/DEUS_Jobs.js:1475
- `release` at game/js/plugins/DEUS_Jobs.js:1483
- `plan` at game/js/plugins/DEUS_Jobs.js:1496
- `assign` at game/js/plugins/DEUS_Jobs.js:1524
- `matches` at game/js/plugins/DEUS_Jobs.js:1554
- `list` at game/js/plugins/DEUS_Jobs.js:1559
- `take` at game/js/plugins/DEUS_Jobs.js:1566
- `describe` at game/js/plugins/DEUS_Jobs.js:1585
- `toolMultiplier` at game/js/plugins/DEUS_Jobs.js:1600
- `workOf` at game/js/plugins/DEUS_Jobs.js:1685
- `startWork` at game/js/plugins/DEUS_Jobs.js:1692
- 9 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.Jobs` (export, this file :1936):
  - plugin game/js/plugins/DEUS_Anim.js:120 (2 code hits; lines 120,1833)
  - plugin game/js/plugins/DEUS_Colonists.js:111 (11 code hits; lines 111,4047,4429,4594,5909)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:63 (1 code hit; lines 63)
  - plugin game/js/plugins/DEUS_Combat.js:786 (13 code hits; lines 786,787,789,837,838,840,1430)
  - plugin game/js/plugins/DEUS_Containers.js:1472 (1 code hit; lines 1472)
  - plugin game/js/plugins/DEUS_DeathForensics.js:302 (2 code hits; lines 302)
  - plugin game/js/plugins/DEUS_Doors.js:335 (3 code hits; lines 335)
  - plugin game/js/plugins/DEUS_Ecology.js:817 (1 code hit; lines 817)
  - plugin game/js/plugins/DEUS_Environment.js:435 (3 code hits; lines 435,436)
  - plugin game/js/plugins/DEUS_Fire.js:82 (2 code hits; lines 82,1397)
  - plugin game/js/plugins/DEUS_Floors.js:41 (1 code hit; lines 41)
  - plugin game/js/plugins/DEUS_Interact.js:102 (1 code hit; lines 102)
  - plugin game/js/plugins/DEUS_Levels.js:3958 (2 code hits; lines 3958,4113)
  - plugin game/js/plugins/DEUS_Look.js:185 (1 code hit; lines 185)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:37 (1 code hit; lines 37)
  - plugin game/js/plugins/DEUS_Ownership.js:57 (2 code hits; lines 57,642)
  - plugin game/js/plugins/DEUS_Projects.js:152 (3 code hits; lines 152,1629,1700)
  - plugin game/js/plugins/DEUS_Select.js:373 (1 code hit; lines 373)
  - plugin game/js/plugins/DEUS_Sheet.js:203 (1 code hit; lines 203)
  - plugin game/js/plugins/DEUS_Speech.js:1239 (8 code hits; lines 1239,1240,1315,1344)
  - plugin game/js/plugins/DEUS_Stockpiles.js:81 (1 code hit; lines 81)
  - plugin game/js/plugins/DEUS_Talk.js:111 (1 code hit; lines 111)
  - plugin game/js/plugins/DEUS_Taming.js:124 (1 code hit; lines 124)
  - plugin game/js/plugins/DEUS_Test.js:452 (1 code hit; lines 452)
  - plugin game/js/plugins/DEUS_Wildlife.js:827 (4 code hits; lines 827,2645)
  - plugin game/js/plugins/DEUS_World.js:3989 (1 code hit; lines 3989)
  - plugin game/js/plugins/test_build_vertical_ingame.js:10 (2 code hits; lines 10,21)
  - plugin game/js/plugins/UF_Households.js:350 (1 code hit; lines 350)
  - tool tools/fixtures/UF_CapturePreVertical.js:25 (1 code hit; lines 25)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:15 (1 code hit; lines 15)
  - tool tools/fixtures/UF_SleepRuntime.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_SocietyRuntime.js:17 (1 code hit; lines 17)
  - tool tools/sim/test_living_world_rules.js:585 (2 code hits; lines 585,638)
  - tool tools/taming/test_taming.js:627 (5 code hits; lines 627,652,653,654,655)
  - tool tools/test_agriculture.js:68 (1 code hit; lines 68)
  - tool tools/test_autonomous_project_dispatch.js:200 (1 code hit; lines 200)
  - tool tools/test_autonomous_settlement_closure.js:201 (1 code hit; lines 201)
  - tool tools/test_autonomous_work_recovery.js:229 (1 code hit; lines 229)
  - tool tools/test_build_vertical.js:359 (2 code hits; lines 359,676)
  - tool tools/test_callings_system.js:296 (1 code hit; lines 296)
  - tool tools/test_column_landforms.js:197 (1 code hit; lines 197)
  - tool tools/test_combat_dying_integration.js:188 (1 code hit; lines 188)
  - tool tools/test_conditions_native_closure.js:197 (1 code hit; lines 197)
  - tool tools/test_dig_vertical.js:27 (1 code hit; lines 27)
  - tool tools/test_extraction_difficulty.js:144 (1 code hit; lines 144)
  - tool tools/test_faction_founder_pairbonding.js:176 (1 code hit; lines 176)
  - tool tools/test_fire_safety.js:85 (1 code hit; lines 85)
  - tool tools/test_hazard_reflex.js:214 (1 code hit; lines 214)
  - tool tools/test_hazard_torture_live.js:253 (1 code hit; lines 253)
  - tool tools/test_material_recipes.js:114 (1 code hit; lines 114)
  - tool tools/test_multi_deficit_settlement.js:174 (1 code hit; lines 174)
  - tool tools/test_native_survival_soak.js:252 (1 code hit; lines 252)
  - tool tools/test_natural_connections.js:76 (5 code hits; lines 76,98,101)
  - tool tools/test_physical_inventory_proof.js:107 (1 code hit; lines 107)
  - tool tools/test_profile_tabs.js:82 (1 code hit; lines 82)
  - tool tools/test_project_construction_loop.js:205 (1 code hit; lines 205)
  - tool tools/test_settlement_domestic_housing.js:250 (1 code hit; lines 250)
  - tool tools/test_settlement_expansion_multi_dwelling.js:230 (1 code hit; lines 230)
  - tool tools/test_settlement_projects.js:196 (1 code hit; lines 196)
  - tool tools/test_stabilization.js:175 (1 code hit; lines 175)
  - tool tools/test_stockpiles_designation.js:189 (1 code hit; lines 189)
  - tool tools/test_survival_needs_loop.js:196 (1 code hit; lines 196)
  - tool tools/test_survival_regressions.js:271 (7 code hits; lines 271,272,273,274,289,518,634)
  - tool tools/test_unified_capability_proof.js:104 (1 code hit; lines 104)
  - tool tools/test_vertical_worldgen_proof.js:242 (1 code hit; lines 242)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:28 (1); archive/plugins_uf_pre_rename/UF_Anim.js:110 (2); archive/plugins_uf_pre_rename/UF_Colonists.js:74 (11); archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:57 (1); archive/plugins_uf_pre_rename/UF_Combat.js:613 (13); archive/plugins_uf_pre_rename/UF_Construction.js:39 (1); archive/plugins_uf_pre_rename/UF_CultureGrowth.js:228 (3); archive/plugins_uf_pre_rename/UF_Doors.js:303 (3); archive/plugins_uf_pre_rename/UF_Ecology.js:800 (1); archive/plugins_uf_pre_rename/UF_Environment.js:433 (3); archive/plugins_uf_pre_rename/UF_Fire.js:65 (2); archive/plugins_uf_pre_rename/UF_FireSafety.js:21 (1); archive/plugins_uf_pre_rename/UF_Floors.js:41 (1); archive/plugins_uf_pre_rename/UF_Goals.js:23 (1); archive/plugins_uf_pre_rename/UF_Households.js:476 (1); archive/plugins_uf_pre_rename/UF_Interact.js:100 (1); archive/plugins_uf_pre_rename/UF_Jobs.js:1408 (1); archive/plugins_uf_pre_rename/UF_Levels.js:1264 (2); archive/plugins_uf_pre_rename/UF_Look.js:185 (1); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:35 (1); archive/plugins_uf_pre_rename/UF_Outposts.js:55 (1); archive/plugins_uf_pre_rename/UF_Ownership.js:57 (2); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:434 (4); archive/plugins_uf_pre_rename/UF_Resources.js:392 (1); archive/plugins_uf_pre_rename/UF_Sanitation.js:13 (1); archive/plugins_uf_pre_rename/UF_Select.js:114 (2); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:55 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:107 (1); archive/plugins_uf_pre_rename/UF_Skills.js:723 (1); archive/plugins_uf_pre_rename/UF_Speech.js:1237 (8); archive/plugins_uf_pre_rename/UF_Talk.js:111 (1); archive/plugins_uf_pre_rename/UF_Wildlife.js:727 (4); archive/plugins_uf_pre_rename/UF_World.js:2526 (1); archive/plugins/DEUS_Agriculture.js:28 (1); archive/plugins/DEUS_Construction.js:39 (1); archive/plugins/DEUS_CultureGrowth.js:228 (3); archive/plugins/DEUS_FireSafety.js:21 (1); archive/plugins/DEUS_Goals.js:23 (1); archive/plugins/DEUS_Households.js:476 (1); archive/plugins/DEUS_Outposts.js:55 (1); archive/plugins/DEUS_ProfileTabs.js:434 (4); archive/plugins/DEUS_Resources.js:392 (1); archive/plugins/DEUS_Sanitation.js:13 (1); archive/plugins/DEUS_Select.js:114 (2); archive/plugins/DEUS_SettlementPillars.js:55 (1); archive/plugins/DEUS_Skills.js:724 (1)
- `ReservationManager` (class, this file :141):
  - plugin game/js/plugins/DEUS_Colonists.js:4047 (6 code hits; lines 4047,4429,4594)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:3078 (6); archive/plugins_uf_pre_rename/UF_Jobs.js:116 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:121 quotes `DEUS_Jobs`
- tool tools/diagnose_hotspots.js:31 quotes `DEUS_Jobs.js`
- tool tools/profile_live_frames.js:338 quotes `DEUS_Jobs.js`
- tool tools/register_world_plugins.js:14 quotes `DEUS_Jobs`
- tool tools/run_all_suites.js:23 quotes `DEUS_Jobs`
- tool tools/sim/test_living_world_rules.js:583 quotes `DEUS_Jobs.js`
- tool tools/sim/test_reclaim.js:364 quotes `DEUS_Jobs.js`
- tool tools/test_agriculture.js:8 quotes `DEUS_Jobs`
- tool tools/test_autonomous_project_dispatch.js:42 quotes `DEUS_Jobs.js`
- tool tools/test_autonomous_project_dispatch.js:197 quotes `DEUS_Jobs.js`
- tool tools/test_autonomous_settlement_closure.js:48 quotes `DEUS_Jobs.js`
- tool tools/test_autonomous_settlement_closure.js:198 quotes `DEUS_Jobs.js`
- tool tools/test_autonomous_work_recovery.js:41 quotes `DEUS_Jobs.js`
- tool tools/test_autonomous_work_recovery.js:226 quotes `DEUS_Jobs.js`
- tool tools/test_build_vertical.js:111 quotes `DEUS_Jobs.js`
- tool tools/test_build_vertical.js:113 quotes `DEUS_Jobs.js`
- tool tools/test_build_vertical.js:273 quotes `DEUS_Jobs.js`
- tool tools/test_column_landforms.js:182 quotes `DEUS_Jobs.js`
- tool tools/test_combat_dying_integration.js:136 quotes `DEUS_Jobs.js`
- tool tools/test_combat_dying_integration.js:155 quotes `DEUS_Jobs.js`
- tool tools/test_conditions_native_closure.js:36 quotes `DEUS_Jobs.js`
- tool tools/test_conditions_native_closure.js:191 quotes `DEUS_Jobs.js`
- tool tools/test_dig_vertical.js:53 quotes `DEUS_Jobs.js`
- tool tools/test_dig_vertical.js:59 quotes `DEUS_Jobs.js`
- tool tools/test_extraction_difficulty.js:20 quotes `DEUS_Jobs.js`
- tool tools/test_fire_safety.js:7 quotes `DEUS_Jobs`
- tool tools/test_hazard_reflex.js:44 quotes `DEUS_Jobs.js`
- tool tools/test_hazard_reflex.js:208 quotes `DEUS_Jobs.js`
- tool tools/test_hazard_torture_live.js:46 quotes `DEUS_Jobs.js`
- tool tools/test_hazard_torture_live.js:247 quotes `DEUS_Jobs.js`
- tool tools/test_live_town_center_progression.js:160 quotes `DEUS_Jobs.js`
- tool tools/test_material_recipes.js:111 quotes `DEUS_Jobs.js`
- tool tools/test_multi_deficit_settlement.js:35 quotes `DEUS_Jobs.js`
- tool tools/test_multi_deficit_settlement.js:171 quotes `DEUS_Jobs.js`
- tool tools/test_native_survival_soak.js:78 quotes `DEUS_Jobs.js`
- tool tools/test_natural_connections.js:90 quotes `DEUS_Jobs.js`
- tool tools/test_natural_connections_no_mint.js:87 quotes `DEUS_Jobs.js`
- tool tools/test_project_construction_loop.js:42 quotes `DEUS_Jobs.js`
- tool tools/test_project_construction_loop.js:202 quotes `DEUS_Jobs.js`
- tool tools/test_settlement_domestic_housing.js:51 quotes `DEUS_Jobs.js`
- tool tools/test_settlement_domestic_housing.js:245 quotes `DEUS_Jobs.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:44 quotes `DEUS_Jobs.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:227 quotes `DEUS_Jobs.js`
- tool tools/test_settlement_projects.js:41 quotes `DEUS_Jobs.js`
- tool tools/test_settlement_projects.js:194 quotes `DEUS_Jobs.js`
- tool tools/test_stabilization.js:36 quotes `DEUS_Jobs.js`
- tool tools/test_stabilization.js:172 quotes `DEUS_Jobs.js`
- tool tools/test_stockpiles_designation.js:184 quotes `DEUS_Jobs.js`
- tool tools/test_survival_needs_loop.js:42 quotes `DEUS_Jobs.js`
- tool tools/test_survival_needs_loop.js:193 quotes `DEUS_Jobs.js`
- tool tools/test_survival_regressions.js:81 quotes `DEUS_Jobs.js`
- tool tools/test_survival_regressions.js:106 quotes `DEUS_Jobs.js`
- tool tools/test_vertical_worldgen_proof.js:237 quotes `DEUS_Jobs.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:37 quotes `DEUS_Jobs`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_Jobs`
- archive quotes omitted from the live list (2 hits)

## DEUS_LayerOverlays.js

Source lines: 1333.
Exports:
- `DEUS.LayerOverlays` at game/js/plugins/DEUS_LayerOverlays.js:1329
- `UF.LayerOverlays` at game/js/plugins/DEUS_LayerOverlays.js:1331
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_LayerOverlays.js:1328
- namespace object `window/root.UF` at game/js/plugins/DEUS_LayerOverlays.js:1330
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `wipe` at game/js/plugins/DEUS_LayerOverlays.js:135
- `take` at game/js/plugins/DEUS_LayerOverlays.js:171
- `takeList` at game/js/plugins/DEUS_LayerOverlays.js:183
- `cellKey` at game/js/plugins/DEUS_LayerOverlays.js:196
- `prepareOpaque` at game/js/plugins/DEUS_LayerOverlays.js:200
- `opaqueAt` at game/js/plugins/DEUS_LayerOverlays.js:220
- `pointVisible` at game/js/plugins/DEUS_LayerOverlays.js:226
- `cellVisible` at game/js/plugins/DEUS_LayerOverlays.js:239
- `unitMarked` at game/js/plugins/DEUS_LayerOverlays.js:244
- `shiftOf` at game/js/plugins/DEUS_LayerOverlays.js:254
- `unitLift` at game/js/plugins/DEUS_LayerOverlays.js:293
- `footOf` at game/js/plugins/DEUS_LayerOverlays.js:299
- `writeBar` at game/js/plugins/DEUS_LayerOverlays.js:315
- `pushRec` at game/js/plugins/DEUS_LayerOverlays.js:325
- `base` at game/js/plugins/DEUS_LayerOverlays.js:335
- `damageHex` at game/js/plugins/DEUS_LayerOverlays.js:354
- `emitUnit` at game/js/plugins/DEUS_LayerOverlays.js:359
- `emitStatus` at game/js/plugins/DEUS_LayerOverlays.js:502
- `emitSpell` at game/js/plugins/DEUS_LayerOverlays.js:518
- `emitWorldEffect` at game/js/plugins/DEUS_LayerOverlays.js:545
- `cmp` at game/js/plugins/DEUS_LayerOverlays.js:559
- `rebuild` at game/js/plugins/DEUS_LayerOverlays.js:571
- `sync` at game/js/plugins/DEUS_LayerOverlays.js:601
- `reset` at game/js/plugins/DEUS_LayerOverlays.js:618
- `stats` at game/js/plugins/DEUS_LayerOverlays.js:628
- `tally` at game/js/plugins/DEUS_LayerOverlays.js:643
- `findBar` at game/js/plugins/DEUS_LayerOverlays.js:661
- `nowMs` at game/js/plugins/DEUS_LayerOverlays.js:669
- `makeBenchUnits` at game/js/plugins/DEUS_LayerOverlays.js:674
- `buriedOpaque` at game/js/plugins/DEUS_LayerOverlays.js:692
- `shaftOpaque` at game/js/plugins/DEUS_LayerOverlays.js:696
- `benchmark` at game/js/plugins/DEUS_LayerOverlays.js:701
- `placeDot` at game/js/plugins/DEUS_LayerOverlays.js:820
- `noteSpells` at game/js/plugins/DEUS_LayerOverlays.js:838
- `idHash` at game/js/plugins/DEUS_LayerOverlays.js:843
- `lock` at game/js/plugins/DEUS_LayerOverlays.js:851
- `makeSprite` at game/js/plugins/DEUS_LayerOverlays.js:859
- `barBitmaps` at game/js/plugins/DEUS_LayerOverlays.js:870
- `rangeBitmap` at game/js/plugins/DEUS_LayerOverlays.js:902
- `numberBitmap` at game/js/plugins/DEUS_LayerOverlays.js:917
- 14 more function declarations are in caller_inventory.json
module.exports assignments: game/js/plugins/DEUS_LayerOverlays.js:1327
Named consumers outside this file:
- `DEUS.LayerOverlays` (export, this file :1329): no-call-found-after-defined-search. Not labeled dead.
- `UF.LayerOverlays` (export, this file :1331):
  - plugin game/js/plugins/DEUS_Depth.js:84 (1 code hit; lines 84)
  - plugin game/js/plugins/DEUS_Select.js:1511 (1 code hit; lines 1511)
  - tool tools/occlusion/live_occlusion.js:234 (1 code hit; lines 234)
Loader edges (quoted id, not symbol callers):
- tool tools/layer_overlays/test_layer_overlays.js:607 quotes `DEUS_LayerOverlays.js`
- tool tools/occlusion/live_occlusion.js:61 quotes `DEUS_LayerOverlays`
- tool tools/occlusion/live_occlusion.js:62 quotes `DEUS_LayerOverlays`
- tool tools/select_xlayer/test_xlayer_select.js:21 quotes `DEUS_LayerOverlays.js`
- tool tools/select_xlayer/test_xlayer_select.js:319 quotes `DEUS_LayerOverlays.js`

## DEUS_Levels.js

Source lines: 6733.
Exports:
- `UF.Levels` at game/js/plugins/DEUS_Levels.js:5540
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Levels.js:5538
- namespace object `window/root.UF` at game/js/plugins/DEUS_Levels.js:5539
Engine prototype patches:
- `Scene_Boot.prototype.isReady` at game/js/plugins/DEUS_Levels.js:625
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Levels.js:4709
- `Spriteset_Map.prototype.updateParallax` at game/js/plugins/DEUS_Levels.js:4718
- `Game_Map.prototype.parallaxName` at game/js/plugins/DEUS_Levels.js:4744
- `Game_Player.prototype.performTransfer` at game/js/plugins/DEUS_Levels.js:5017
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Levels.js:5030
- `Scene_Map.prototype.onTransfer` at game/js/plugins/DEUS_Levels.js:5057
- `Scene_Map.prototype.shouldAutosave` at game/js/plugins/DEUS_Levels.js:5062
- `Scene_Map.prototype.start` at game/js/plugins/DEUS_Levels.js:5068
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Levels.js:5136
- `Scene_Map.prototype.createDisplayObjects` at game/js/plugins/DEUS_Levels.js:5241
- `Scene_Map.prototype.isAnyWindowUnderMouse` at game/js/plugins/DEUS_Levels.js:5247
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Levels.js:5594
Engine object patches (not prototype):
- `ImageManager.loadTileset` at game/js/plugins/DEUS_Levels.js:568
- `DataManager.onLoad` at game/js/plugins/DEUS_Levels.js:618
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Levels.js:4919
Engine members read or saved:
- `Scene_Boot.prototype.isReady` saved to `_Scene_Boot_isReady` at game/js/plugins/DEUS_Levels.js:624
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters_naturalWalls` at game/js/plugins/DEUS_Levels.js:4708
- `Spriteset_Map.prototype.updateParallax` saved to `_Spriteset_Map_updateParallax` at game/js/plugins/DEUS_Levels.js:4717
- `Game_Map.prototype.parallaxName` saved to `_Game_Map_parallaxName` at game/js/plugins/DEUS_Levels.js:4743
- `Game_Player.prototype.performTransfer` saved to `_Game_Player_performTransfer` at game/js/plugins/DEUS_Levels.js:5016
- `Spriteset_Map.prototype.update` saved to `_Spriteset_Map_update_inPlace` at game/js/plugins/DEUS_Levels.js:5029
- `Scene_Map.prototype.onTransfer` saved to `_Scene_Map_onTransfer` at game/js/plugins/DEUS_Levels.js:5056
- `Scene_Map.prototype.shouldAutosave` saved to `_Scene_Map_shouldAutosave` at game/js/plugins/DEUS_Levels.js:5061
- `Scene_Map.prototype.start` saved to `_Scene_Map_start` at game/js/plugins/DEUS_Levels.js:5067
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Levels.js:5135
- `Scene_Map.prototype.createDisplayObjects` saved to `_Scene_Map_createDisplayObjects` at game/js/plugins/DEUS_Levels.js:5240
- `Scene_Map.prototype.isAnyWindowUnderMouse` saved to `_Scene_Map_isAnyWindowUnderMouse` at game/js/plugins/DEUS_Levels.js:5246
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Levels.js:5593
- `ImageManager.loadTileset` saved to `_ImageManager_loadTileset` at game/js/plugins/DEUS_Levels.js:567
- `DataManager.onLoad` saved to `_DataManager_onLoad` at game/js/plugins/DEUS_Levels.js:617
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Levels.js:4918
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Levels.js:5231
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Levels.js:5523
- `Graphics.frameCount` saved to `f0` at game/js/plugins/DEUS_Levels.js:6556
- `Graphics.frameCount` saved to `f` at game/js/plugins/DEUS_Levels.js:6560
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:initializing"` at game/js/plugins/DEUS_Levels.js:5555
- `on` `"world:created"` at game/js/plugins/DEUS_Levels.js:5563
- `on` `"levels:shapeChanged"` at game/js/plugins/DEUS_Levels.js:5564
- `on` `"levels:cellChanged"` at game/js/plugins/DEUS_Levels.js:5565
- `on` `"objects:levelChanged"` at game/js/plugins/DEUS_Levels.js:5572
- `on` `"objects:changed"` at game/js/plugins/DEUS_Levels.js:5575
- `on` `"objects:changed"` at game/js/plugins/DEUS_Levels.js:6139
- `on` `"objects:levelChanged"` at game/js/plugins/DEUS_Levels.js:6140
- `on` `"levels:strataDestroyed"` at game/js/plugins/DEUS_Levels.js:6625
- `on` `"levels:cellChanged"` at game/js/plugins/DEUS_Levels.js:6626
Classes:
- `Sprite_UFFloodOverlay` at game/js/plugins/DEUS_Levels.js:4411
- `Sprite_UFNaturalWalls` at game/js/plugins/DEUS_Levels.js:4647
- `Sprite_UFLevelPlate` at game/js/plugins/DEUS_Levels.js:5168
Named functions at brace depth 0 or 1 (capped at 40):
- `depthBandOf` at game/js/plugins/DEUS_Levels.js:124
- `mountainLevel` at game/js/plugins/DEUS_Levels.js:128
- `couplingActive` at game/js/plugins/DEUS_Levels.js:133
- `kindIndexFromFields` at game/js/plugins/DEUS_Levels.js:141
- `kindIndexFromColumn` at game/js/plugins/DEUS_Levels.js:154
- `kindGrid` at game/js/plugins/DEUS_Levels.js:158
- `discardBaselineCache` at game/js/plugins/DEUS_Levels.js:184
- `columnBiomeId` at game/js/plugins/DEUS_Levels.js:189
- `paintProvinceBiomes` at game/js/plugins/DEUS_Levels.js:202
- `paintColumnBiomes` at game/js/plugins/DEUS_Levels.js:226
- `paintSubstrate` at game/js/plugins/DEUS_Levels.js:238
- `zrResync` at game/js/plugins/DEUS_Levels.js:307
- `mixPart` at game/js/plugins/DEUS_Levels.js:328
- `hashFinish` at game/js/plugins/DEUS_Levels.js:344
- `hash32_3` at game/js/plugins/DEUS_Levels.js:350
- `hash32_4` at game/js/plugins/DEUS_Levels.js:355
- `hash32_6` at game/js/plugins/DEUS_Levels.js:360
- `valueNoise` at game/js/plugins/DEUS_Levels.js:373
- `fnvBytes` at game/js/plugins/DEUS_Levels.js:385
- `maskTable` at game/js/plugins/DEUS_Levels.js:398
- `looks` at game/js/plugins/DEUS_Levels.js:422
- `startCompose` at game/js/plugins/DEUS_Levels.js:439
- `composeReady` at game/js/plugins/DEUS_Levels.js:450
- `sourceOf` at game/js/plugins/DEUS_Levels.js:460
- `interiorOf` at game/js/plugins/DEUS_Levels.js:476
- `drawPiece` at game/js/plugins/DEUS_Levels.js:482
- `compose` at game/js/plugins/DEUS_Levels.js:500
- `tileBase` at game/js/plugins/DEUS_Levels.js:579
- `registerTileset` at game/js/plugins/DEUS_Levels.js:593
- `levelGen` at game/js/plugins/DEUS_Levels.js:645
- `generateUnderground` at game/js/plugins/DEUS_Levels.js:650
- `surfaceElevation` at game/js/plugins/DEUS_Levels.js:784
- `cliffCaveMouthsForArea` at game/js/plugins/DEUS_Levels.js:820
- `resolveDescZRange` at game/js/plugins/DEUS_Levels.js:889
- `generateBaseline` at game/js/plugins/DEUS_Levels.js:911
- `levelArrays` at game/js/plugins/DEUS_Levels.js:929
- `finishBaseline` at game/js/plugins/DEUS_Levels.js:1087
- `surfaceGridFor` at game/js/plugins/DEUS_Levels.js:1099
- `coresReady` at game/js/plugins/DEUS_Levels.js:1110
- `markAreaSeen` at game/js/plugins/DEUS_Levels.js:1115
- 155 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.Levels` (export, this file :5540):
  - plugin game/js/plugins/DEUS_Colonists.js:1243 (3 code hits; lines 1243)
  - plugin game/js/plugins/DEUS_Combat.js:2553 (4 code hits; lines 2553,2554)
  - plugin game/js/plugins/DEUS_Conditions.js:716 (1 code hit; lines 716)
  - plugin game/js/plugins/DEUS_DayNight.js:253 (3 code hits; lines 253,346,513)
  - plugin game/js/plugins/DEUS_Depth.js:81 (1 code hit; lines 81)
  - plugin game/js/plugins/DEUS_Doors.js:138 (1 code hit; lines 138)
  - plugin game/js/plugins/DEUS_Ecology.js:816 (1 code hit; lines 816)
  - plugin game/js/plugins/DEUS_Environment.js:424 (1 code hit; lines 424)
  - plugin game/js/plugins/DEUS_Factions.js:485 (6 code hits; lines 485,507,810)
  - plugin game/js/plugins/DEUS_Floors.js:92 (8 code hits; lines 92,118,135,209,219,225,248,323)
  - plugin game/js/plugins/DEUS_Fluid.js:363 (4 code hits; lines 363,387,428,629)
  - plugin game/js/plugins/DEUS_Fog.js:101 (2 code hits; lines 101,191)
  - plugin game/js/plugins/DEUS_Interact.js:511 (1 code hit; lines 511)
  - plugin game/js/plugins/DEUS_Jobs.js:225 (20 code hits; lines 225,226,227,229,230,233,234,441,460,505,573,609)
  - plugin game/js/plugins/DEUS_Look.js:341 (1 code hit; lines 341)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:36 (1 code hit; lines 36)
  - plugin game/js/plugins/DEUS_Objects.js:257 (2 code hits; lines 257,285)
  - plugin game/js/plugins/DEUS_Select.js:391 (10 code hits; lines 391,392,1005,3857,3858,3867,3868)
  - plugin game/js/plugins/DEUS_Structural.js:282 (3 code hits; lines 282,417,511)
  - plugin game/js/plugins/DEUS_Test.js:367 (1 code hit; lines 367)
  - plugin game/js/plugins/DEUS_Wildlife.js:509 (7 code hits; lines 509,586,2435,2436,2461)
  - plugin game/js/plugins/DEUS_World.js:2817 (12 code hits; lines 2817,3485,3486,3493,3494,3495,3496,3497)
  - plugin game/js/plugins/DEUS_WorldGen.js:709 (17 code hits; lines 709,730,925,944,1175,1213,1544,1692,1783,1926,2185,2186)
  - plugin game/js/plugins/UF_Households.js:453 (3 code hits; lines 453,770,882)
  - tool tools/bench_history_sim.js:121 (1 code hit; lines 121)
  - tool tools/bench_vertical_worldgen.js:281 (2 code hits; lines 281,328)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:185 (1 code hit; lines 185)
  - tool tools/capture_pre_migration_baseline.js:128 (1 code hit; lines 128)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:15 (1 code hit; lines 15)
  - tool tools/fixtures/UF_SleepRuntime.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_SocietyRuntime.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_ZFlora.js:14 (1 code hit; lines 14)
  - tool tools/fixtures/UF_ZIntegration.js:14 (1 code hit; lines 14)
  - tool tools/occlusion/bench_occlusion.js:85 (2 code hits; lines 85,87)
  - tool tools/occlusion/compare_planes.js:81 (2 code hits; lines 81,83)
  - tool tools/occlusion/live_occlusion.js:84 (2 code hits; lines 84,86)
  - tool tools/sim/test_living_world_rules.js:171 (2 code hits; lines 171,629)
  - tool tools/sim/test_underground_year0.js:95 (4 code hits; lines 95,100)
  - tool tools/smoke_19a_playtest.js:41 (1 code hit; lines 41)
  - tool tools/test_19b_performance_determinism.js:126 (5 code hits; lines 126,141,173,204,218)
  - tool tools/test_32_levels_generation.js:109 (1 code hit; lines 109)
  - tool tools/test_area_generation_speed.js:183 (3 code hits; lines 183,255,257)
  - tool tools/test_bag_and_racial_banners.js:153 (1 code hit; lines 153)
  - tool tools/test_build_vertical.js:359 (2 code hits; lines 359,676)
  - tool tools/test_callings_system.js:297 (1 code hit; lines 297)
  - tool tools/test_collapse_ingame.js:72 (1 code hit; lines 72)
  - tool tools/test_column_landforms.js:196 (1 code hit; lines 196)
  - tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:227 (9 code hits; lines 227,250,251,252,253,308,324,332)
  - tool tools/test_dig_vertical.js:32 (1 code hit; lines 32)
  - tool tools/test_faction_founder_pairbonding.js:179 (1 code hit; lines 179)
  - tool tools/test_generated_z2_cut_proof.js:371 (1 code hit; lines 371)
  - tool tools/test_geology_strata.js:228 (1 code hit; lines 228)
  - tool tools/test_hist_metadata_contracts.js:45 (1 code hit; lines 45)
  - tool tools/test_historical_carrying_capacity.js:155 (1 code hit; lines 155)
  - tool tools/test_layer_switch_inplace.js:120 (1 code hit; lines 120)
  - tool tools/test_lazy_area_generation.js:251 (23 code hits; lines 251,275,286,319,330,363,382,395,434,470,473,484)
  - tool tools/test_liquid_depth_simulation.js:133 (1 code hit; lines 133)
  - tool tools/test_natural_connections_no_mint.js:184 (4 code hits; lines 184,230,331,386)
  - tool tools/test_production_history_demographics.js:125 (1 code hit; lines 125)
  - tool tools/test_region_seam_continuity.js:242 (1 code hit; lines 242)
  - tool tools/test_regrowth_construction_guard.js:159 (2 code hits; lines 159,477)
  - tool tools/test_sparse_outer_save.js:172 (4 code hits; lines 172,237,309,389)
  - tool tools/test_starter_kit_and_stockpile.js:66 (1 code hit; lines 66)
  - tool tools/test_strata_cuts_and_caves.js:347 (25 code hits; lines 347,462,464,479,489,492,493,514,516,568,569,570)
  - tool tools/test_strata_fluid_reconciliation.js:172 (1 code hit; lines 172)
  - tool tools/test_strata_foundation.js:271 (7 code hits; lines 271,301,305,310,315,897,919)
  - tool tools/test_structural_levels.js:810 (2 code hits; lines 810,849)
  - tool tools/test_structural_runtime.js:384 (1 code hit; lines 384)
  - tool tools/test_structure_fluid.js:297 (3 code hits; lines 297,298,301)
  - tool tools/test_survival_regressions.js:520 (2 code hits; lines 520,604)
  - tool tools/test_upper_elevation_terrain.js:111 (1 code hit; lines 111)
  - tool tools/test_vertical_worldgen_proof.js:241 (1 code hit; lines 241)
  - tool tools/test_volumetric_terrain_column.js:264 (1 code hit; lines 264)
  - tool tools/test_worldgen_quickfixes.js:69 (3 code hits; lines 69,140,160)
  - tool tools/worldgen/test_vertical_biome_coupling.js:146 (11 code hits; lines 146,147,149,153,204,242,245,263,264,265,267)
  - tool tools/zrange/bench_queries.js:88 (1 code hit; lines 88)
  - tool tools/zrange/test_switch_depth2.js:104 (2 code hits; lines 104,124)
  - tool tools/zrange/zrange_suite.js:52 (1 code hit; lines 52)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:109 (2); archive/plugins_uf_pre_rename/UF_Combat.js:1729 (4); archive/plugins_uf_pre_rename/UF_DayNight.js:247 (3); archive/plugins_uf_pre_rename/UF_Doors.js:127 (1); archive/plugins_uf_pre_rename/UF_Ecology.js:799 (1); archive/plugins_uf_pre_rename/UF_Environment.js:422 (1); archive/plugins_uf_pre_rename/UF_Factions.js:503 (7); archive/plugins_uf_pre_rename/UF_Floors.js:67 (6); archive/plugins_uf_pre_rename/UF_Fog.js:101 (2); archive/plugins_uf_pre_rename/UF_Households.js:842 (1); archive/plugins_uf_pre_rename/UF_Interact.js:468 (1); archive/plugins_uf_pre_rename/UF_Jobs.js:189 (15); archive/plugins_uf_pre_rename/UF_Levels.js:2377 (1); archive/plugins_uf_pre_rename/UF_Look.js:341 (1); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:34 (1); archive/plugins_uf_pre_rename/UF_Objects.js:178 (2); archive/plugins_uf_pre_rename/UF_Outposts.js:1272 (12); archive/plugins_uf_pre_rename/UF_Select.js:132 (10); archive/plugins_uf_pre_rename/UF_Wildlife.js:447 (7); archive/plugins_uf_pre_rename/UF_World.js:2214 (5); archive/plugins_uf_pre_rename/UF_WorldGen.js:601 (10); archive/plugins/DEUS_Agriculture.js:109 (2); archive/plugins/DEUS_Households.js:842 (1); archive/plugins/DEUS_Outposts.js:1272 (12); archive/plugins/DEUS_Select.js:132 (10)
- `Sprite_UFFloodOverlay` (class, this file :4411):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Levels.js:1678 (2)
- `Sprite_UFNaturalWalls` (class, this file :4647):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Levels.js:1803 (2)
- `Sprite_UFLevelPlate` (class, this file :5168):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Levels.js:2190 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:252 quotes `DEUS_Levels`
- tool tools/bench_vertical_worldgen.js:96 quotes `DEUS_Levels`
- tool tools/capture_pre_migration_baseline.js:114 quotes `DEUS_Levels.js`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_Levels`
- tool tools/performance/census_boot_load.js:67 quotes `DEUS_Levels.js`
- tool tools/sim/test_living_world_rules.js:169 quotes `DEUS_Levels.js`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_Levels`
- tool tools/sim/test_underground_year0.js:30 quotes `DEUS_Levels`
- tool tools/society/test_person_identity.js:31 quotes `DEUS_Levels`
- tool tools/test_19b_performance_determinism.js:57 quotes `DEUS_Levels`
- tool tools/test_19b_performance_determinism.js:101 quotes `DEUS_Levels.js`
- tool tools/test_32_levels_generation.js:86 quotes `DEUS_Levels.js`
- tool tools/test_32_levels_generation.js:87 quotes `DEUS_Levels.js`
- tool tools/test_area_generation_speed.js:18 quotes `DEUS_Levels.js`
- tool tools/test_area_generation_speed.js:141 quotes `DEUS_Levels.js`
- tool tools/test_area_generation_speed.js:142 quotes `DEUS_Levels.js`
- tool tools/test_build_vertical.js:273 quotes `DEUS_Levels.js`
- tool tools/test_column_landforms.js:181 quotes `DEUS_Levels.js`
- tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:43 quotes `DEUS_Levels.js`
- tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:95 quotes `DEUS_Levels.js`
- tool tools/test_extraction_difficulty.js:16 quotes `DEUS_Levels.js`
- tool tools/test_fluid_correctness_lane_cw.js:461 quotes `DEUS_Levels`
- tool tools/test_generated_z2_cut_proof.js:96 quotes `DEUS_Levels.js`
- tool tools/test_generated_z2_cut_proof.js:363 quotes `DEUS_Levels.js`
- tool tools/test_geology_strata.js:34 quotes `DEUS_Levels.js`
- tool tools/test_layer_switch_inplace.js:85 quotes `DEUS_Levels.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_Levels`
- tool tools/test_lazy_area_generation.js:31 quotes `DEUS_Levels`
- tool tools/test_lazy_area_generation.js:135 quotes `DEUS_Levels`
- tool tools/test_lazy_area_generation.js:25 quotes `DEUS_Levels.js`
- tool tools/test_lazy_area_generation.js:763 quotes `DEUS_Levels.js`
- tool tools/test_native_survival_soak.js:67 quotes `DEUS_Levels.js`
- tool tools/test_natural_connections_no_mint.js:86 quotes `DEUS_Levels.js`
- tool tools/test_new_game_year0.js:39 quotes `DEUS_Levels`
- tool tools/test_region_seam_continuity.js:42 quotes `DEUS_Levels.js`
- tool tools/test_region_seam_continuity.js:58 quotes `DEUS_Levels.js`
- tool tools/test_region_seam_continuity.js:66 quotes `DEUS_Levels.js`
- tool tools/test_region_seam_continuity.js:68 quotes `DEUS_Levels.js`
- tool tools/test_region_seam_continuity.js:71 quotes `DEUS_Levels.js`
- tool tools/test_resource_node_materials.js:16 quotes `DEUS_Levels.js`
- tool tools/test_sim_tick.js:32 quotes `DEUS_Levels`
- tool tools/test_sparse_outer_save.js:13 quotes `DEUS_Levels.js`
- tool tools/test_sparse_outer_save.js:162 quotes `DEUS_Levels.js`
- tool tools/test_sparse_outer_save.js:163 quotes `DEUS_Levels.js`
- tool tools/test_strata_cuts_and_caves.js:101 quotes `DEUS_Levels.js`
- tool tools/test_strata_cuts_and_caves.js:203 quotes `DEUS_Levels.js`
- tool tools/test_strata_cuts_and_caves.js:1084 quotes `DEUS_Levels.js`
- tool tools/test_strata_cuts_and_caves.js:1085 quotes `DEUS_Levels.js`
- tool tools/test_strata_fluid_reconciliation.js:43 quotes `DEUS_Levels.js`
- tool tools/test_strata_fluid_reconciliation.js:137 quotes `DEUS_Levels.js`
- tool tools/test_strata_fluid_reconciliation.js:139 quotes `DEUS_Levels.js`
- tool tools/test_strata_foundation.js:139 quotes `DEUS_Levels.js`
- tool tools/test_strata_foundation.js:145 quotes `DEUS_Levels.js`
- tool tools/test_strata_foundation.js:146 quotes `DEUS_Levels.js`
- tool tools/test_strata_foundation.js:149 quotes `DEUS_Levels.js`
- tool tools/test_strata_foundation.js:150 quotes `DEUS_Levels.js`
- tool tools/test_strata_foundation.js:160 quotes `DEUS_Levels.js`
- tool tools/test_strata_foundation.js:165 quotes `DEUS_Levels.js`
- tool tools/test_structural_levels.js:705 quotes `DEUS_Levels.js`
- tool tools/test_structural_runtime.js:273 quotes `DEUS_Levels.js`
- tool tools/test_structure_fluid.js:175 quotes `DEUS_Levels.js`
- tool tools/test_survival_regressions.js:70 quotes `DEUS_Levels.js`
- tool tools/test_survival_regressions.js:136 quotes `DEUS_Levels.js`
- tool tools/test_upper_elevation_terrain.js:108 quotes `DEUS_Levels.js`
- tool tools/test_vertical_worldgen_proof.js:236 quotes `DEUS_Levels.js`
- tool tools/test_volumetric_terrain_column.js:75 quotes `DEUS_Levels.js`
- tool tools/test_volumetric_terrain_column.js:81 quotes `DEUS_Levels.js`
- tool tools/test_volumetric_terrain_column.js:88 quotes `DEUS_Levels.js`
- tool tools/test_volumetric_terrain_column.js:93 quotes `DEUS_Levels.js`
- tool tools/test_volumetric_terrain_column.js:103 quotes `DEUS_Levels.js`
- tool tools/test_volumetric_terrain_column.js:108 quotes `DEUS_Levels.js`
- tool tools/test_volumetric_terrain_column.js:126 quotes `DEUS_Levels.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:35 quotes `DEUS_Levels`
- tool tools/worldgen/test_vertical_biome_coupling.js:36 quotes `DEUS_Levels`
- tool tools/zrange/bench_queries.js:24 quotes `DEUS_Levels.js`
- tool tools/zrange/provocations.js:8 quotes `DEUS_Levels.js`
- tool tools/zrange/scan_z_literals.js:20 quotes `DEUS_Levels`
- archive quotes omitted from the live list (2 hits)

## DEUS_Lighting.js

Source lines: 43.
Exports:
- none assigned as UF/DEUS member or Imported flag
Engine prototype patches:
- `Spriteset_Map.prototype.createLowerLayer` at game/js/plugins/DEUS_Lighting.js:12
- `Spriteset_Map.prototype.createLightmap` at game/js/plugins/DEUS_Lighting.js:17
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Lighting.js:31
- `Spriteset_Map.prototype.updateLighting` at game/js/plugins/DEUS_Lighting.js:36
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Spriteset_Map.prototype.createLowerLayer` saved to `_Spriteset_Map_createLowerLayer` at game/js/plugins/DEUS_Lighting.js:11
- `Spriteset_Map.prototype.update` saved to `_Spriteset_Map_update` at game/js/plugins/DEUS_Lighting.js:30
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- no UF/DEUS export, Imported flag, or class was assigned. Coupling is the prototype patches and listeners above, if any. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:290 quotes `DEUS_Lighting`

## DEUS_Look.js

Source lines: 800.
Exports:
- `UF.Look` at game/js/plugins/DEUS_Look.js:623
- `UF.Assets` at game/js/plugins/DEUS_Look.js:624
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Look.js:621
- namespace object `window/root.UF` at game/js/plugins/DEUS_Look.js:622
Engine prototype patches:
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_Look.js:544
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Look.js:630
Engine object patches (not prototype):
- `TouchInput._x` at game/js/plugins/DEUS_Look.js:656
- `TouchInput._y` at game/js/plugins/DEUS_Look.js:657
- `TouchInput._x` at game/js/plugins/DEUS_Look.js:743
- `TouchInput._y` at game/js/plugins/DEUS_Look.js:744
- `TouchInput._x` at game/js/plugins/DEUS_Look.js:768
- `TouchInput._y` at game/js/plugins/DEUS_Look.js:769
- `TouchInput._x` at game/js/plugins/DEUS_Look.js:776
- `TouchInput._y` at game/js/plugins/DEUS_Look.js:777
Engine members read or saved:
- `Scene_Map.prototype.createAllWindows` saved to `_Scene_Map_createAllWindows` at game/js/plugins/DEUS_Look.js:543
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Look.js:629
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Look.js:439
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Look.js:539
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Look.js:575
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Look.js:773
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `Sprite_UFLookTip` at game/js/plugins/DEUS_Look.js:423
Named functions at brace depth 0 or 1 (capped at 40):
- `loadIndexIfPresent` at game/js/plugins/DEUS_Look.js:87
- `statusByName` at game/js/plugins/DEUS_Look.js:102
- `indexEntry` at game/js/plugins/DEUS_Look.js:109
- `overseerAdapterOf` at game/js/plugins/DEUS_Look.js:156
- `unitAt` at game/js/plugins/DEUS_Look.js:163
- `jobTextOf` at game/js/plugins/DEUS_Look.js:184
- `imageOfType` at game/js/plugins/DEUS_Look.js:194
- `faceOfSubject` at game/js/plugins/DEUS_Look.js:235
- `subjectAt` at game/js/plugins/DEUS_Look.js:271
- `tierName` at game/js/plugins/DEUS_Look.js:315
- `groundName` at game/js/plugins/DEUS_Look.js:321
- `biomeName` at game/js/plugins/DEUS_Look.js:326
- `cellAt` at game/js/plugins/DEUS_Look.js:335
- `nameAt` at game/js/plugins/DEUS_Look.js:377
- `inspect` at game/js/plugins/DEUS_Look.js:408
Named consumers outside this file:
- `UF.Look` (export, this file :623):
  - plugin game/js/plugins/DEUS_Ecology.js:1152 (4 code hits; lines 1152,1156,1174,1177)
  - plugin game/js/plugins/DEUS_Interact.js:103 (1 code hit; lines 103)
  - plugin game/js/plugins/DEUS_Levels.js:6127 (6 code hits; lines 6127,6129)
  - plugin game/js/plugins/DEUS_Ownership.js:517 (5 code hits; lines 517,699,702,704)
  - plugin game/js/plugins/DEUS_Select.js:374 (2 code hits; lines 374,2024)
  - plugin game/js/plugins/DEUS_Sheet.js:2519 (2 code hits; lines 2519,2725)
  - plugin game/js/plugins/DEUS_Talk.js:116 (1 code hit; lines 116)
  - plugin game/js/plugins/DEUS_Test.js:425 (3 code hits; lines 425,428)
  - tool tools/test_build_vertical.js:636 (2 code hits; lines 636,644)
  - tool tools/test_farm_view.js:31 (2 code hits; lines 31)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Ecology.js:1134 (4); archive/plugins_uf_pre_rename/UF_FarmView.js:107 (1); archive/plugins_uf_pre_rename/UF_Interact.js:101 (1); archive/plugins_uf_pre_rename/UF_Levels.js:2886 (6); archive/plugins_uf_pre_rename/UF_Look.js:620 (1); archive/plugins_uf_pre_rename/UF_Ownership.js:517 (5); archive/plugins_uf_pre_rename/UF_Select.js:115 (2); archive/plugins_uf_pre_rename/UF_Sheet.js:1584 (2); archive/plugins_uf_pre_rename/UF_Talk.js:116 (1); archive/plugins/DEUS_FarmView.js:108 (1); archive/plugins/DEUS_Select.js:115 (2)
- `UF.Assets` (export, this file :624): Also assigned or declared in game/js/plugins/DEUS_AssetStreaming.js:11 fallback. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_AssetStreaming.js:11 (4 code hits; lines 11,17,34)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Look.js:621 (1)
- `Sprite_UFLookTip` (class, this file :423):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Look.js:423 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:222 quotes `DEUS_Look`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Look`
- tool tools/run_all_suites.js:24 quotes `DEUS_Look`
- archive quotes omitted from the live list (2 hits)

## DEUS_Mint.js

Source lines: 497.
Exports:
- `UF.Mint` at game/js/plugins/DEUS_Mint.js:494
- namespace object `window/root.UF` at game/js/plugins/DEUS_Mint.js:492
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Mint.js:493
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `fault` at game/js/plugins/DEUS_Mint.js:24
- `isRecord` at game/js/plugins/DEUS_Mint.js:30
- `has` at game/js/plugins/DEUS_Mint.js:34
- `copy` at game/js/plugins/DEUS_Mint.js:38
- `positiveSafeInteger` at game/js/plugins/DEUS_Mint.js:42
- `nonNegativeSafeInteger` at game/js/plugins/DEUS_Mint.js:46
- `add` at game/js/plugins/DEUS_Mint.js:50
- `multiply` at game/js/plugins/DEUS_Mint.js:56
- `gcd` at game/js/plugins/DEUS_Mint.js:62
- `lcm` at game/js/plugins/DEUS_Mint.js:71
- `fraction` at game/js/plugins/DEUS_Mint.js:75
- `sumFractions` at game/js/plugins/DEUS_Mint.js:92
- `sameComponents` at game/js/plugins/DEUS_Mint.js:107
- `compileAuthority` at game/js/plugins/DEUS_Mint.js:112
- `createEngine` at game/js/plugins/DEUS_Mint.js:209
module.exports assignments: game/js/plugins/DEUS_Mint.js:495
Named consumers outside this file:
- `UF.Mint` (export, this file :494):
  - tool tools/society/test_minting_engine.js:50 (1 code hit; lines 50)
Loader edges (quoted id, not symbol callers):
- tool tools/society/test_minting_engine.js:13 quotes `DEUS_Mint.js`

## DEUS_Move8.js

Source lines: 97.
Exports:
- none assigned as UF/DEUS member or Imported flag
Engine prototype patches:
- `Game_CharacterBase.prototype.__deusMove8` at game/js/plugins/DEUS_Move8.js:58 (source text `GB.prototype.__deusMove8`; local assigned from `root.Game_CharacterBase at 56`)
- `Game_CharacterBase.prototype.distancePerFrame` at game/js/plugins/DEUS_Move8.js:61 (source text `GB.prototype.distancePerFrame`; local assigned from `root.Game_CharacterBase at 56`)
- `Game_CharacterBase.prototype.moveStraight` at game/js/plugins/DEUS_Move8.js:76 (source text `GB.prototype.moveStraight`; local assigned from `root.Game_CharacterBase at 56`)
- `Game_CharacterBase.prototype.moveDiagonally` at game/js/plugins/DEUS_Move8.js:83 (source text `GB.prototype.moveDiagonally`; local assigned from `root.Game_CharacterBase at 56`)
- `Game_CharacterBase.prototype.deusDir8` at game/js/plugins/DEUS_Move8.js:89 (source text `GB.prototype.deusDir8`; local assigned from `root.Game_CharacterBase at 56`)
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_CharacterBase.prototype.distancePerFrame` saved to `prevDist` at game/js/plugins/DEUS_Move8.js:60 (source text `GB.prototype.distancePerFrame`; local assigned from `root.Game_CharacterBase at 56`)
- `Game_CharacterBase.prototype.moveStraight` saved to `prevStraight` at game/js/plugins/DEUS_Move8.js:74 (source text `GB.prototype.moveStraight`; local assigned from `root.Game_CharacterBase at 56`)
- `Game_CharacterBase.prototype.moveDiagonally` saved to `prevDiag` at game/js/plugins/DEUS_Move8.js:81 (source text `GB.prototype.moveDiagonally`; local assigned from `root.Game_CharacterBase at 56`)
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `loadMod` at game/js/plugins/DEUS_Move8.js:25
Named consumers outside this file:
- no UF/DEUS export, Imported flag, or class was assigned. Coupling is the prototype patches and listeners above, if any. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- no quoted id found outside this file in the searched roots

## DEUS_Movement8D.js

Source lines: 655.
Exports:
- none assigned as UF/DEUS member or Imported flag
Engine prototype patches:
- `Game_CharacterBase.prototype.initMembers` at game/js/plugins/DEUS_Movement8D.js:150
- `Game_CharacterBase.prototype.dir8` at game/js/plugins/DEUS_Movement8D.js:156
- `Game_CharacterBase.prototype.setDirection` at game/js/plugins/DEUS_Movement8D.js:163
- `Game_CharacterBase.prototype.setDir8` at game/js/plugins/DEUS_Movement8D.js:173
- `Game_CharacterBase.prototype.faceToward8` at game/js/plugins/DEUS_Movement8D.js:180
- `Game_CharacterBase.prototype.distancePerFrame` at game/js/plugins/DEUS_Movement8D.js:188
- `Game_CharacterBase.prototype.updateMove` at game/js/plugins/DEUS_Movement8D.js:198
- `Game_CharacterBase.prototype.canPassDiagonally` at game/js/plugins/DEUS_Movement8D.js:264
- `Game_CharacterBase.prototype.moveDiagonally` at game/js/plugins/DEUS_Movement8D.js:319
- `Game_CharacterBase.prototype.moveStraight` at game/js/plugins/DEUS_Movement8D.js:329
- `Game_CharacterBase.prototype.moveInDirection8D` at game/js/plugins/DEUS_Movement8D.js:338
- `Game_Player.prototype.getInputDirection` at game/js/plugins/DEUS_Movement8D.js:364
- `Game_Player.prototype.executeMove` at game/js/plugins/DEUS_Movement8D.js:368
- `Game_Character.prototype.findDirection8DTo` at game/js/plugins/DEUS_Movement8D.js:491
- `Game_Character.prototype.findDirectionTo` at game/js/plugins/DEUS_Movement8D.js:628
- `Game_Follower.prototype.chaseCharacter` at game/js/plugins/DEUS_Movement8D.js:636
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_CharacterBase.prototype.initMembers` saved to `_Game_CharacterBase_initMembers` at game/js/plugins/DEUS_Movement8D.js:149
- `Game_CharacterBase.prototype.setDirection` saved to `_Game_CharacterBase_setDirection` at game/js/plugins/DEUS_Movement8D.js:162
- `Game_CharacterBase.prototype.distancePerFrame` saved to `_Game_CharacterBase_distancePerFrame` at game/js/plugins/DEUS_Movement8D.js:187
- `Game_CharacterBase.prototype.updateMove` saved to `_Game_CharacterBase_updateMove` at game/js/plugins/DEUS_Movement8D.js:197
- `Game_CharacterBase.prototype.moveDiagonally` saved to `_Game_CharacterBase_moveDiagonally` at game/js/plugins/DEUS_Movement8D.js:316
- `Game_CharacterBase.prototype.moveStraight` saved to `_Game_CharacterBase_moveStraight` at game/js/plugins/DEUS_Movement8D.js:328
- `Game_Character.prototype.findDirectionTo` saved to `_Game_Character_findDirectionTo` at game/js/plugins/DEUS_Movement8D.js:627
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `AStarNode` at game/js/plugins/DEUS_Movement8D.js:387
- `AStarNodePool` at game/js/plugins/DEUS_Movement8D.js:399
- `PriorityQueue` at game/js/plugins/DEUS_Movement8D.js:418
- `PriorityQueuePool` at game/js/plugins/DEUS_Movement8D.js:466
Named functions at brace depth 0 or 1 (capped at 40):
- `isWallTile` at game/js/plugins/DEUS_Movement8D.js:206
- `hasOppositeWallsAt` at game/js/plugins/DEUS_Movement8D.js:229
- `wallCountAt` at game/js/plugins/DEUS_Movement8D.js:238
- `isDoorwayTile` at game/js/plugins/DEUS_Movement8D.js:248
Named consumers outside this file:
- `AStarNode` (class, this file :387): no-call-found-after-defined-search. Not labeled dead.
- `AStarNodePool` (class, this file :399): no-call-found-after-defined-search. Not labeled dead.
- `PriorityQueue` (class, this file :418): no-call-found-after-defined-search. Not labeled dead.
- `PriorityQueuePool` (class, this file :466): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:33 quotes `DEUS_Movement8D`
- tool tools/ops/update_plugins.js:3 quotes `DEUS_Movement8D`
- archive quotes omitted from the live list (2 hits)

## DEUS_NaturalConnections.js

Source lines: 569.
Exports:
- `UF.NaturalConnections` at game/js/plugins/DEUS_NaturalConnections.js:405
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_NaturalConnections.js:400
- namespace object `window/root.UF` at game/js/plugins/DEUS_NaturalConnections.js:401
Engine prototype patches:
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_NaturalConnections.js:420
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_NaturalConnections.js:422
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_NaturalConnections.js:424
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_NaturalConnections.js:428
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_NaturalConnections.js:434
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Scene_Boot.prototype.start` saved to `_boot` at game/js/plugins/DEUS_NaturalConnections.js:419
- `Spriteset_Map.prototype.createCharacters` saved to `_characters` at game/js/plugins/DEUS_NaturalConnections.js:421
- `Spriteset_Map.prototype.update` saved to `_update` at game/js/plugins/DEUS_NaturalConnections.js:423
- `Scene_Map.prototype.createAllWindows` saved to `_windows` at game/js/plugins/DEUS_NaturalConnections.js:427
- `Scene_Map.prototype.update` saved to `_sceneUpdate` at game/js/plugins/DEUS_NaturalConnections.js:433
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_NaturalConnections.js:404
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `PassageMarkers` at game/js/plugins/DEUS_NaturalConnections.js:369
Named functions at brace depth 0 or 1 (capped at 40):
- `validCell` at game/js/plugins/DEUS_NaturalConnections.js:45
- `dry` at game/js/plugins/DEUS_NaturalConnections.js:51
- `free` at game/js/plugins/DEUS_NaturalConnections.js:58
- `neighbor` at game/js/plugins/DEUS_NaturalConnections.js:61
- `exactPath` at game/js/plugins/DEUS_NaturalConnections.js:68
- `state` at game/js/plugins/DEUS_NaturalConnections.js:75
- `links` at game/js/plugins/DEUS_NaturalConnections.js:76
- `list` at game/js/plugins/DEUS_NaturalConnections.js:77
- `at` at game/js/plugins/DEUS_NaturalConnections.js:81
- `endpoints` at game/js/plugins/DEUS_NaturalConnections.js:82
- `protectedCell` at game/js/plugins/DEUS_NaturalConnections.js:90
- `generationReservations` at game/js/plugins/DEUS_NaturalConnections.js:95
- `reserved` at game/js/plugins/DEUS_NaturalConnections.js:116
- `anchorFor` at game/js/plugins/DEUS_NaturalConnections.js:120
- `generate` at game/js/plugins/DEUS_NaturalConnections.js:137
- `validateTravel` at game/js/plugins/DEUS_NaturalConnections.js:198
- `defineJob` at game/js/plugins/DEUS_NaturalConnections.js:207
- `travel` at game/js/plugins/DEUS_NaturalConnections.js:236
- `traverse` at game/js/plugins/DEUS_NaturalConnections.js:252
- `isWater` at game/js/plugins/DEUS_NaturalConnections.js:290
- `stepCreatures` at game/js/plugins/DEUS_NaturalConnections.js:299
- `showFeedback` at game/js/plugins/DEUS_NaturalConnections.js:327
- `selectedPlayer` at game/js/plugins/DEUS_NaturalConnections.js:340
- `orderSelected` at game/js/plugins/DEUS_NaturalConnections.js:348
- `hook` at game/js/plugins/DEUS_NaturalConnections.js:407
- `registerChecks` at game/js/plugins/DEUS_NaturalConnections.js:441
Named consumers outside this file:
- `UF.NaturalConnections` (export, this file :405):
  - tool tools/bench_vertical_worldgen.js:281 (1 code hit; lines 281)
  - tool tools/test_natural_connections_no_mint.js:214 (1 code hit; lines 214)
  - tool tools/test_natural_connections.js:101 (1 code hit; lines 101)
  - tool tools/test_vertical_worldgen_proof.js:243 (1 code hit; lines 243)
  - tool tools/worldgen/test_vertical_biome_coupling.js:323 (1 code hit; lines 323)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:105 (3); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:468 (1); archive/plugins/DEUS_Agriculture.js:105 (3)
- `PassageMarkers` (class, this file :369):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_NaturalConnections.js:433 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:270 quotes `DEUS_NaturalConnections`
- tool tools/bench_vertical_worldgen.js:138 quotes `DEUS_NaturalConnections`
- tool tools/test_natural_connections.js:91 quotes `DEUS_NaturalConnections.js`
- tool tools/test_natural_connections_no_mint.js:87 quotes `DEUS_NaturalConnections.js`
- tool tools/test_natural_connections_no_mint.js:180 quotes `DEUS_NaturalConnections.js`
- tool tools/test_vertical_worldgen_proof.js:238 quotes `DEUS_NaturalConnections.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:37 quotes `DEUS_NaturalConnections`
- archive quotes omitted from the live list (2 hits)

## DEUS_Objects.js

Source lines: 1537.
Exports:
- `UF.Objects` at game/js/plugins/DEUS_Objects.js:1184
- `UF.Sidecars` at game/js/plugins/DEUS_Objects.js:1185
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Objects.js:1182
- namespace object `window/root.UF` at game/js/plugins/DEUS_Objects.js:1183
Engine prototype patches:
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Objects.js:1065
- `Game_Map.prototype.isPassable` at game/js/plugins/DEUS_Objects.js:1082
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Objects.js:1226
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Objects.js:1064
- `Game_Map.prototype.isPassable` saved to `_Game_Map_isPassable` at game/js/plugins/DEUS_Objects.js:1081
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Objects.js:1225
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:objectChanged"` at game/js/plugins/DEUS_Objects.js:1194
- `on` `"world:levelObjectChanged"` at game/js/plugins/DEUS_Objects.js:1198
- `on` `"time:hour"` at game/js/plugins/DEUS_Objects.js:1202
- `on` `"floors:laid"` at game/js/plugins/DEUS_Objects.js:1219
- `on` `"floors:groundChanged"` at game/js/plugins/DEUS_Objects.js:1220
- `on` `"objects:changed"` at game/js/plugins/DEUS_Objects.js:1419
Classes:
- `Sprite_UFObjectLayer` at game/js/plugins/DEUS_Objects.js:853
Named functions at brace depth 0 or 1 (capped at 40):
- `matterNote` at game/js/plugins/DEUS_Objects.js:81
- `matterCover` at game/js/plugins/DEUS_Objects.js:98
- `matterCovered` at game/js/plugins/DEUS_Objects.js:103
- `table` at game/js/plugins/DEUS_Objects.js:119
- `gridOf` at game/js/plugins/DEUS_Objects.js:198
- `typeIdIn` at game/js/plugins/DEUS_Objects.js:210
- `blocksAt` at game/js/plugins/DEUS_Objects.js:216
- `absHour` at game/js/plugins/DEUS_Objects.js:236
- `regrowList` at game/js/plugins/DEUS_Objects.js:241
- `isConstructedOrPaved` at game/js/plugins/DEUS_Objects.js:253
- `scheduleRegrow` at game/js/plugins/DEUS_Objects.js:334
- `processRegrow` at game/js/plugins/DEUS_Objects.js:347
- `setIn` at game/js/plugins/DEUS_Objects.js:378
- `materialOfObject` at game/js/plugins/DEUS_Objects.js:433
- `applyIn` at game/js/plugins/DEUS_Objects.js:477
- `findIn` at game/js/plugins/DEUS_Objects.js:536
- `describeIn` at game/js/plugins/DEUS_Objects.js:573
- `loadSidecar` at game/js/plugins/DEUS_Objects.js:586
- `bitmapFor` at game/js/plugins/DEUS_Objects.js:661
- `frameFor` at game/js/plugins/DEUS_Objects.js:669
- `isWallCell` at game/js/plugins/DEUS_Objects.js:704
- `wallMaskAt` at game/js/plugins/DEUS_Objects.js:715
- `frameForWall` at game/js/plugins/DEUS_Objects.js:723
- `updateChestAnimations` at game/js/plugins/DEUS_Objects.js:787
- `openChestAt` at game/js/plugins/DEUS_Objects.js:814
- `closeChestAt` at game/js/plugins/DEUS_Objects.js:821
- `isChestOpenAt` at game/js/plugins/DEUS_Objects.js:830
- `getVariantForCell` at game/js/plugins/DEUS_Objects.js:835
- `hookEvents` at game/js/plugins/DEUS_Objects.js:1191
- `registerChecks` at game/js/plugins/DEUS_Objects.js:1236
module.exports assignments: game/js/plugins/DEUS_Objects.js:1531
Named consumers outside this file:
- `UF.Objects` (export, this file :1184):
  - plugin game/js/plugins/DEUS_Anim.js:122 (2 code hits; lines 122,1833)
  - plugin game/js/plugins/DEUS_Colonists.js:113 (1 code hit; lines 113)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:280 (1 code hit; lines 280)
  - plugin game/js/plugins/DEUS_Conditions.js:716 (1 code hit; lines 716)
  - plugin game/js/plugins/DEUS_Containers.js:53 (10 code hits; lines 53,1054,1055,1409,1410,1458,1459)
  - plugin game/js/plugins/DEUS_DayNight.js:235 (3 code hits; lines 235,344,551)
  - plugin game/js/plugins/DEUS_Depth.js:685 (6 code hits; lines 685,701,1865,1997)
  - plugin game/js/plugins/DEUS_Doors.js:37 (1 code hit; lines 37)
  - plugin game/js/plugins/DEUS_Ecology.js:63 (2 code hits; lines 63,1039)
  - plugin game/js/plugins/DEUS_Environment.js:65 (1 code hit; lines 65)
  - plugin game/js/plugins/DEUS_Fire.js:80 (2 code hits; lines 80,1397)
  - plugin game/js/plugins/DEUS_Floors.js:39 (1 code hit; lines 39)
  - plugin game/js/plugins/DEUS_Fluid.js:332 (1 code hit; lines 332)
  - plugin game/js/plugins/DEUS_Fog.js:171 (1 code hit; lines 171)
  - plugin game/js/plugins/DEUS_History.js:1169 (11 code hits; lines 1169,1696,2818,4029)
  - plugin game/js/plugins/DEUS_Interact.js:100 (1 code hit; lines 100)
  - plugin game/js/plugins/DEUS_Jobs.js:71 (2 code hits; lines 71,2102)
  - plugin game/js/plugins/DEUS_Levels.js:3932 (6 code hits; lines 3932,4017,5568,5614,5720,5887)
  - plugin game/js/plugins/DEUS_Look.js:283 (4 code hits; lines 283,390,644,664)
  - plugin game/js/plugins/DEUS_Movement8D.js:208 (2 code hits; lines 208,250)
  - plugin game/js/plugins/DEUS_Ownership.js:56 (2 code hits; lines 56,642)
  - plugin game/js/plugins/DEUS_Projects.js:150 (2 code hits; lines 150,1629)
  - plugin game/js/plugins/DEUS_Select.js:371 (5 code hits; lines 371,409,2857,3122,3241)
  - plugin game/js/plugins/DEUS_Sheet.js:202 (1 code hit; lines 202)
  - plugin game/js/plugins/DEUS_Stockpiles.js:78 (1 code hit; lines 78)
  - plugin game/js/plugins/DEUS_Structural.js:222 (4 code hits; lines 222,223,259,417)
  - plugin game/js/plugins/DEUS_Walls.js:43 (1 code hit; lines 43)
  - plugin game/js/plugins/DEUS_Wildlife.js:291 (25 code hits; lines 291,811,854,1208,1673,1924,2574,2575,2576,2601,2602,2604)
  - plugin game/js/plugins/DEUS_World.js:1406 (17 code hits; lines 1406,1725,1727,1840,1868,2532,3989,4144,4535,4991,4992)
  - plugin game/js/plugins/test_build_vertical_ingame.js:28 (1 code hit; lines 28)
  - plugin game/js/plugins/UF_Households.js:29 (1 code hit; lines 29)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:15 (1 code hit; lines 15)
  - tool tools/fixtures/UF_SleepRuntime.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_SocietyRuntime.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_ZFlora.js:14 (1 code hit; lines 14)
  - tool tools/fixtures/UF_ZIntegration.js:14 (1 code hit; lines 14)
  - tool tools/occlusion/bench_occlusion.js:198 (4 code hits; lines 198,200,201)
  - tool tools/occlusion/live_occlusion.js:84 (2 code hits; lines 84,86)
  - tool tools/smoke_19a_playtest.js:137 (3 code hits; lines 137)
  - tool tools/test_autonomous_project_dispatch.js:111 (3 code hits; lines 111,124,200)
  - tool tools/test_autonomous_settlement_closure.js:110 (3 code hits; lines 110,123,201)
  - tool tools/test_autonomous_work_recovery.js:103 (4 code hits; lines 103,116,145,229)
  - tool tools/test_bag_and_racial_banners.js:129 (1 code hit; lines 129)
  - tool tools/test_build_vertical.js:359 (2 code hits; lines 359,676)
  - tool tools/test_collapse_ingame.js:72 (1 code hit; lines 72)
  - tool tools/test_conditions_native_closure.js:97 (3 code hits; lines 97,110,197)
  - tool tools/test_ecology.js:170 (2 code hits; lines 170,218)
  - tool tools/test_extraction_difficulty.js:141 (1 code hit; lines 141)
  - tool tools/test_hazard_reflex.js:109 (3 code hits; lines 109,122,214)
  - tool tools/test_hazard_torture_live.js:98 (4 code hits; lines 98,144,157,253)
  - tool tools/test_material_refining_and_tech_pacing.js:314 (1 code hit; lines 314)
  - tool tools/test_multi_deficit_settlement.js:93 (3 code hits; lines 93,106,174)
  - tool tools/test_native_survival_soak.js:273 (7 code hits; lines 273,418,455,464)
  - tool tools/test_physical_inventory_proof.js:103 (1 code hit; lines 103)
  - tool tools/test_project_construction_loop.js:111 (3 code hits; lines 111,129,205)
  - tool tools/test_regrowth_construction_guard.js:227 (38 code hits; lines 227,270,271,272,280,282,301,304,309,328,329,333)
  - tool tools/test_resource_node_materials.js:127 (1 code hit; lines 127)
  - tool tools/test_round_world.js:185 (1 code hit; lines 185)
  - tool tools/test_settlement_domestic_housing.js:115 (4 code hits; lines 115,130,157,250)
  - tool tools/test_settlement_expansion_multi_dwelling.js:106 (4 code hits; lines 106,119,146,230)
  - tool tools/test_settlement_projects.js:105 (3 code hits; lines 105,118,196)
  - tool tools/test_stabilization.js:94 (3 code hits; lines 94,107,175)
  - tool tools/test_stockpiles_designation.js:189 (1 code hit; lines 189)
  - tool tools/test_structural_levels.js:811 (2 code hits; lines 811,859)
  - tool tools/test_structural_runtime.js:384 (1 code hit; lines 384)
  - tool tools/test_survival_needs_loop.js:104 (3 code hits; lines 104,117,196)
  - tool tools/test_vertical_worldgen_proof.js:209 (13 code hits; lines 209,210,502,503,504,505,582,585,586,587,588)
  - tool tools/test_volumetric_terrain_column.js:264 (1 code hit; lines 264)
  - tool tools/test_z_flora.js:113 (1 code hit; lines 113)
  - tool tools/zrange/zrange_suite.js:52 (1 code hit; lines 52)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:28 (1); archive/plugins_uf_pre_rename/UF_Anim.js:112 (2); archive/plugins_uf_pre_rename/UF_Colonists.js:76 (1); archive/plugins_uf_pre_rename/UF_Construction.js:37 (1); archive/plugins_uf_pre_rename/UF_Containers.js:53 (1); archive/plugins_uf_pre_rename/UF_CultureGrowth.js:48 (10); archive/plugins_uf_pre_rename/UF_DayNight.js:229 (3); archive/plugins_uf_pre_rename/UF_Doors.js:37 (1); archive/plugins_uf_pre_rename/UF_Ecology.js:63 (2); archive/plugins_uf_pre_rename/UF_Environment.js:63 (1); archive/plugins_uf_pre_rename/UF_Fire.js:63 (2); archive/plugins_uf_pre_rename/UF_FireSafety.js:21 (1); archive/plugins_uf_pre_rename/UF_Floors.js:39 (1); archive/plugins_uf_pre_rename/UF_Fog.js:171 (1); archive/plugins_uf_pre_rename/UF_History.js:937 (11); archive/plugins_uf_pre_rename/UF_Households.js:28 (1); archive/plugins_uf_pre_rename/UF_Interact.js:98 (1); archive/plugins_uf_pre_rename/UF_Jobs.js:69 (2); archive/plugins_uf_pre_rename/UF_Levels.js:1238 (6); archive/plugins_uf_pre_rename/UF_Look.js:283 (4); archive/plugins_uf_pre_rename/UF_Movement8D.js:208 (2); archive/plugins_uf_pre_rename/UF_Objects.js:964 (1); archive/plugins_uf_pre_rename/UF_Outposts.js:54 (1); archive/plugins_uf_pre_rename/UF_Ownership.js:56 (2); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:196 (1); archive/plugins_uf_pre_rename/UF_Resources.js:49 (1); archive/plugins_uf_pre_rename/UF_Roads.js:57 (1); archive/plugins_uf_pre_rename/UF_Sanitation.js:14 (1); archive/plugins_uf_pre_rename/UF_Select.js:112 (1); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:56 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:106 (1); archive/plugins_uf_pre_rename/UF_Skills.js:565 (1); archive/plugins_uf_pre_rename/UF_Walls.js:43 (1); archive/plugins_uf_pre_rename/UF_Wildlife.js:229 (21); archive/plugins_uf_pre_rename/UF_World.js:694 (17); archive/plugins/DEUS_Agriculture.js:28 (1); archive/plugins/DEUS_Construction.js:37 (1); archive/plugins/DEUS_Containers.js:53 (1); archive/plugins/DEUS_CultureGrowth.js:48 (10); archive/plugins/DEUS_FireSafety.js:21 (1); archive/plugins/DEUS_Households.js:28 (1); archive/plugins/DEUS_Outposts.js:54 (1); archive/plugins/DEUS_ProfileTabs.js:196 (1); archive/plugins/DEUS_Resources.js:49 (1); archive/plugins/DEUS_Roads.js:57 (1); archive/plugins/DEUS_Sanitation.js:14 (1); archive/plugins/DEUS_Select.js:112 (1); archive/plugins/DEUS_SettlementPillars.js:56 (1); archive/plugins/DEUS_Skills.js:565 (1)
- `UF.Sidecars` (export, this file :1185):
  - plugin game/js/plugins/DEUS_Anim.js:179 (1 code hit; lines 179)
  - plugin game/js/plugins/DEUS_Depth.js:577 (2 code hits; lines 577)
  - plugin game/js/plugins/DEUS_Sheet.js:294 (1 code hit; lines 294)
  - plugin game/js/plugins/DEUS_Walls.js:155 (3 code hits; lines 155,156)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:169 (1); archive/plugins_uf_pre_rename/UF_Objects.js:965 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:198 (1); archive/plugins_uf_pre_rename/UF_Walls.js:110 (3)
- `Sprite_UFObjectLayer` (class, this file :853):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Objects.js:665 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:97 quotes `DEUS_Objects`
- tool tools/capture_pre_migration_baseline.js:114 quotes `DEUS_Objects.js`
- tool tools/register_world_plugins.js:14 quotes `DEUS_Objects`
- tool tools/run_all_suites.js:23 quotes `DEUS_Objects`
- tool tools/sim/test_reclaim.js:365 quotes `DEUS_Objects.js`
- tool tools/test_19b_performance_determinism.js:101 quotes `DEUS_Objects.js`
- tool tools/test_autonomous_project_dispatch.js:40 quotes `DEUS_Objects.js`
- tool tools/test_autonomous_project_dispatch.js:195 quotes `DEUS_Objects.js`
- tool tools/test_autonomous_settlement_closure.js:48 quotes `DEUS_Objects.js`
- tool tools/test_autonomous_settlement_closure.js:196 quotes `DEUS_Objects.js`
- tool tools/test_autonomous_work_recovery.js:41 quotes `DEUS_Objects.js`
- tool tools/test_autonomous_work_recovery.js:224 quotes `DEUS_Objects.js`
- tool tools/test_build_vertical.js:273 quotes `DEUS_Objects.js`
- tool tools/test_conditions_native_closure.js:36 quotes `DEUS_Objects.js`
- tool tools/test_conditions_native_closure.js:189 quotes `DEUS_Objects.js`
- tool tools/test_cooperative_homestead_construction.js:194 quotes `DEUS_Objects.js`
- tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:42 quotes `DEUS_Objects.js`
- tool tools/test_extraction_difficulty.js:18 quotes `DEUS_Objects.js`
- tool tools/test_generated_z2_cut_proof.js:363 quotes `DEUS_Objects.js`
- tool tools/test_hazard_reflex.js:44 quotes `DEUS_Objects.js`
- tool tools/test_hazard_reflex.js:206 quotes `DEUS_Objects.js`
- tool tools/test_hazard_torture_live.js:46 quotes `DEUS_Objects.js`
- tool tools/test_hazard_torture_live.js:245 quotes `DEUS_Objects.js`
- tool tools/test_multi_deficit_settlement.js:35 quotes `DEUS_Objects.js`
- tool tools/test_multi_deficit_settlement.js:169 quotes `DEUS_Objects.js`
- tool tools/test_native_survival_soak.js:73 quotes `DEUS_Objects.js`
- tool tools/test_natural_connections_no_mint.js:86 quotes `DEUS_Objects.js`
- tool tools/test_project_construction_loop.js:40 quotes `DEUS_Objects.js`
- tool tools/test_project_construction_loop.js:200 quotes `DEUS_Objects.js`
- tool tools/test_region_seam_continuity.js:42 quotes `DEUS_Objects.js`
- tool tools/test_resource_node_materials.js:18 quotes `DEUS_Objects.js`
- tool tools/test_round_world.js:181 quotes `DEUS_Objects.js`
- tool tools/test_seamless_map_edges.js:152 quotes `DEUS_Objects.js`
- tool tools/test_settlement_domestic_housing.js:51 quotes `DEUS_Objects.js`
- tool tools/test_settlement_domestic_housing.js:243 quotes `DEUS_Objects.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:44 quotes `DEUS_Objects.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:225 quotes `DEUS_Objects.js`
- tool tools/test_settlement_projects.js:39 quotes `DEUS_Objects.js`
- tool tools/test_settlement_projects.js:192 quotes `DEUS_Objects.js`
- tool tools/test_stabilization.js:36 quotes `DEUS_Objects.js`
- tool tools/test_stabilization.js:170 quotes `DEUS_Objects.js`
- tool tools/test_stockpiles_designation.js:181 quotes `DEUS_Objects.js`
- tool tools/test_strata_cuts_and_caves.js:203 quotes `DEUS_Objects.js`
- tool tools/test_strata_fluid_reconciliation.js:43 quotes `DEUS_Objects.js`
- tool tools/test_strata_foundation.js:139 quotes `DEUS_Objects.js`
- tool tools/test_structural_levels.js:705 quotes `DEUS_Objects.js`
- tool tools/test_structural_runtime.js:273 quotes `DEUS_Objects.js`
- tool tools/test_structure_fluid.js:175 quotes `DEUS_Objects.js`
- tool tools/test_survival_needs_loop.js:42 quotes `DEUS_Objects.js`
- tool tools/test_survival_needs_loop.js:191 quotes `DEUS_Objects.js`
- tool tools/test_survival_regressions.js:76 quotes `DEUS_Objects.js`
- tool tools/test_volumetric_terrain_column.js:126 quotes `DEUS_Objects.js`
- tool tools/test_z_flora.js:7 quotes `DEUS_Objects`
- tool tools/test_z_flora.js:46 quotes `DEUS_Objects.js`
- tool tools/zrange/bench_queries.js:24 quotes `DEUS_Objects.js`
- tool tools/zrange/scan_z_literals.js:22 quotes `DEUS_Objects`
- archive quotes omitted from the live list (2 hits)

## DEUS_Ownership.js

Source lines: 772.
Exports:
- `UF.Ownership` at game/js/plugins/DEUS_Ownership.js:607
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Ownership.js:605
- namespace object `window/root.UF` at game/js/plugins/DEUS_Ownership.js:606
Engine prototype patches:
- `Tip.prototype.update` at game/js/plugins/DEUS_Ownership.js:533
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Ownership.js:613
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Ownership.js:630
Engine object patches (not prototype):
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Ownership.js:624
Engine members read or saved:
- `Tip.prototype.update` saved to `update` at game/js/plugins/DEUS_Ownership.js:532
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Ownership.js:612
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Ownership.js:629
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Ownership.js:623
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:created"` at game/js/plugins/DEUS_Ownership.js:565
- `on` `"colonists:ready"` at game/js/plugins/DEUS_Ownership.js:566
- `on` `"world:unitAdded"` at game/js/plugins/DEUS_Ownership.js:567
- `on` `"world:unitRemoved"` at game/js/plugins/DEUS_Ownership.js:568
- `on` `"objects:changed"` at game/js/plugins/DEUS_Ownership.js:576
- `on` `"objects:levelChanged"` at game/js/plugins/DEUS_Ownership.js:577
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `provoked` at game/js/plugins/DEUS_Ownership.js:101
- `report` at game/js/plugins/DEUS_Ownership.js:107
- `state` at game/js/plugins/DEUS_Ownership.js:117
- `normalizeEntity` at game/js/plugins/DEUS_Ownership.js:129
- `normalizeOwner` at game/js/plugins/DEUS_Ownership.js:141
- `keyOf` at game/js/plugins/DEUS_Ownership.js:152
- `entryOf` at game/js/plugins/DEUS_Ownership.js:164
- `ownerOf` at game/js/plugins/DEUS_Ownership.js:169
- `firstOwnerOf` at game/js/plugins/DEUS_Ownership.js:174
- `sameOwner` at game/js/plugins/DEUS_Ownership.js:185
- `claim` at game/js/plugins/DEUS_Ownership.js:189
- `release` at game/js/plugins/DEUS_Ownership.js:206
- `isBedId` at game/js/plugins/DEUS_Ownership.js:227
- `bedFromEntry` at game/js/plugins/DEUS_Ownership.js:239
- `clearUnitBed` at game/js/plugins/DEUS_Ownership.js:244
- `bedOf` at game/js/plugins/DEUS_Ownership.js:250
- `assignBed` at game/js/plugins/DEUS_Ownership.js:261
- `unassignBed` at game/js/plugins/DEUS_Ownership.js:281
- `cleanClaims` at game/js/plugins/DEUS_Ownership.js:306
- `areaBeds` at game/js/plugins/DEUS_Ownership.js:336
- `reconcileArea` at game/js/plugins/DEUS_Ownership.js:348
- `reconcile` at game/js/plugins/DEUS_Ownership.js:375
- `thresholds` at game/js/plugins/DEUS_Ownership.js:394
- `priorityReason` at game/js/plugins/DEUS_Ownership.js:399
- `sleepFrames` at game/js/plugins/DEUS_Ownership.js:411
- `preflightSleep` at game/js/plugins/DEUS_Ownership.js:422
- `scheduleSleep` at game/js/plugins/DEUS_Ownership.js:436
- `scanSleep` at game/js/plugins/DEUS_Ownership.js:466
- `ownerName` at game/js/plugins/DEUS_Ownership.js:477
- `describeAt` at game/js/plugins/DEUS_Ownership.js:491
- `stripOwnership` at game/js/plugins/DEUS_Ownership.js:498
- `decorateLines` at game/js/plugins/DEUS_Ownership.js:506
- `hookLook` at game/js/plugins/DEUS_Ownership.js:516
- `onObjectsChanged` at game/js/plugins/DEUS_Ownership.js:546
- `hookEvents` at game/js/plugins/DEUS_Ownership.js:562
- `registerChecks` at game/js/plugins/DEUS_Ownership.js:640
Named consumers outside this file:
- `UF.Ownership` (export, this file :607):
  - plugin game/js/plugins/DEUS_Colonists.js:3463 (12 code hits; lines 3463,3495,3646,3651,4278,5508,5579,5580)
  - plugin game/js/plugins/DEUS_Containers.js:55 (1 code hit; lines 55)
  - plugin game/js/plugins/DEUS_Doors.js:596 (1 code hit; lines 596)
  - plugin game/js/plugins/DEUS_Items.js:461 (2 code hits; lines 461,688)
  - plugin game/js/plugins/DEUS_Jobs.js:988 (1 code hit; lines 988)
  - plugin game/js/plugins/UF_Households.js:30 (1 code hit; lines 30)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:17 (2 code hits; lines 17)
  - tool tools/fixtures/UF_SleepRuntime.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_SocietyRuntime.js:29 (5 code hits; lines 29,99,126,128)
  - tool tools/test_family_integration.js:328 (1 code hit; lines 328)
  - tool tools/test_z_ownership.js:56 (1 code hit; lines 56)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:29 (1); archive/plugins_uf_pre_rename/UF_Colonists.js:2690 (10); archive/plugins_uf_pre_rename/UF_Containers.js:55 (1); archive/plugins_uf_pre_rename/UF_Doors.js:557 (1); archive/plugins_uf_pre_rename/UF_FireSafety.js:56 (2); archive/plugins_uf_pre_rename/UF_Households.js:29 (2); archive/plugins_uf_pre_rename/UF_Items.js:298 (2); archive/plugins_uf_pre_rename/UF_Jobs.js:727 (1); archive/plugins_uf_pre_rename/UF_Outposts.js:789 (3); archive/plugins_uf_pre_rename/UF_Ownership.js:606 (1); archive/plugins/DEUS_Agriculture.js:29 (1); archive/plugins/DEUS_Containers.js:55 (1); archive/plugins/DEUS_FireSafety.js:56 (2); archive/plugins/DEUS_Households.js:29 (2); archive/plugins/DEUS_Outposts.js:789 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:258 quotes `DEUS_Ownership`
- tool tools/diagnose_hotspots.js:39 quotes `DEUS_Ownership.js`
- tool tools/test_family_integration.js:87 quotes `DEUS_Ownership.js`
- tool tools/test_z_ownership.js:55 quotes `DEUS_Ownership.js`
- tool tools/zrange/scan_z_literals.js:22 quotes `DEUS_Ownership`
- archive quotes omitted from the live list (2 hits)

## DEUS_Perspective25D.js

Source lines: 133.
Exports:
- none assigned as UF/DEUS member or Imported flag
Engine prototype patches:
- `Game_CharacterBase.prototype.initMembers` at game/js/plugins/DEUS_Perspective25D.js:30
- `Game_CharacterBase.prototype.elevation` at game/js/plugins/DEUS_Perspective25D.js:35
- `Game_CharacterBase.prototype.setElevation` at game/js/plugins/DEUS_Perspective25D.js:39
- `Game_CharacterBase.prototype.screenY` at game/js/plugins/DEUS_Perspective25D.js:44
- `Game_CharacterBase.prototype.groundScreenY` at game/js/plugins/DEUS_Perspective25D.js:52
- `Game_CharacterBase.prototype.groundScreenX` at game/js/plugins/DEUS_Perspective25D.js:58
- `Sprite_Character.prototype.update` at game/js/plugins/DEUS_Perspective25D.js:70
- `Game_CharacterBase.prototype.screenZ` at game/js/plugins/DEUS_Perspective25D.js:100
- `Sprite_Character.prototype.updatePosition` at game/js/plugins/DEUS_Perspective25D.js:108
- `Sprite_Character.prototype.updateOther` at game/js/plugins/DEUS_Perspective25D.js:116
- `Game_CharacterBase.prototype.isPriorityAbove` at game/js/plugins/DEUS_Perspective25D.js:123
- `Game_CharacterBase.prototype.isPriorityBelow` at game/js/plugins/DEUS_Perspective25D.js:127
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_CharacterBase.prototype.initMembers` saved to `_Game_CharacterBase_initMembers` at game/js/plugins/DEUS_Perspective25D.js:29
- `Sprite_Character.prototype.update` saved to `_Sprite_Character_update` at game/js/plugins/DEUS_Perspective25D.js:69
- `Sprite_Character.prototype.updatePosition` saved to `_Sprite_Character_updatePosition` at game/js/plugins/DEUS_Perspective25D.js:107
- `Sprite_Character.prototype.updateOther` saved to `_Sprite_Character_updateOther` at game/js/plugins/DEUS_Perspective25D.js:115
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- no UF/DEUS export, Imported flag, or class was assigned. Coupling is the prototype patches and listeners above, if any. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:49 quotes `DEUS_Perspective25D`
- tool tools/profile_live_frames.js:368 quotes `DEUS_Perspective25D.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_Projects.js

Source lines: 1781.
Exports:
- `UF.Projects` at game/js/plugins/DEUS_Projects.js:1590
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Projects.js:1588
- namespace object `window/root.UF` at game/js/plugins/DEUS_Projects.js:1589
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Projects.js:1596
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Projects.js:1618
Engine object patches (not prototype):
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Projects.js:1602
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Projects.js:1595
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Projects.js:1617
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Projects.js:1601
Namespace property patches:
- none
Listeners and commands:
- `on` `"jobs:done"` at game/js/plugins/DEUS_Projects.js:1612
- `on` `"jobs:failed"` at game/js/plugins/DEUS_Projects.js:1613
- `on` `"projects:opened"` at game/js/plugins/DEUS_Projects.js:1734
- `on` `"jobs:done"` at game/js/plugins/DEUS_Projects.js:1734
- `on` `"jobs:assigned"` at game/js/plugins/DEUS_Projects.js:1734
- `on` `"jobs:failed"` at game/js/plugins/DEUS_Projects.js:1734
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `config` at game/js/plugins/DEUS_Projects.js:167
- `colony` at game/js/plugins/DEUS_Projects.js:181
- `projectState` at game/js/plugins/DEUS_Projects.js:185
- `log` at game/js/plugins/DEUS_Projects.js:199
- `hearthId` at game/js/plugins/DEUS_Projects.js:209
- `relativeCells` at game/js/plugins/DEUS_Projects.js:221
- `phaseSpec` at game/js/plugins/DEUS_Projects.js:245
- `hearthCellOf` at game/js/plugins/DEUS_Projects.js:252
- `reservedAt` at game/js/plugins/DEUS_Projects.js:278
- `clearAction` at game/js/plugins/DEUS_Projects.js:290
- `canFullyClear` at game/js/plugins/DEUS_Projects.js:298
- `isWater` at game/js/plugins/DEUS_Projects.js:308
- `groundOk` at game/js/plugins/DEUS_Projects.js:312
- `standerOn` at game/js/plugins/DEUS_Projects.js:317
- `cellStatus` at game/js/plugins/DEUS_Projects.js:325
- `reservedCellSet` at game/js/plugins/DEUS_Projects.js:346
- `shelteredCells` at game/js/plugins/DEUS_Projects.js:365
- `nextToFire` at game/js/plugins/DEUS_Projects.js:378
- `beddingCells` at game/js/plugins/DEUS_Projects.js:387
- `siteValid` at game/js/plugins/DEUS_Projects.js:403
- `chooseSite` at game/js/plugins/DEUS_Projects.js:418
- `settlementFor` at game/js/plugins/DEUS_Projects.js:442
- `wallNeighbours` at game/js/plugins/DEUS_Projects.js:453
- `evaluateDeficits` at game/js/plugins/DEUS_Projects.js:472
- `phaseOf` at game/js/plugins/DEUS_Projects.js:571
- `householdsOf` at game/js/plugins/DEUS_Projects.js:590
- `explain` at game/js/plugins/DEUS_Projects.js:650
- `larderCell` at game/js/plugins/DEUS_Projects.js:663
- `stockpileCellFor` at game/js/plugins/DEUS_Projects.js:673
- `tidyParcel` at game/js/plugins/DEUS_Projects.js:709
- `capacityFor` at game/js/plugins/DEUS_Projects.js:750
- `open` at game/js/plugins/DEUS_Projects.js:764
- `cancel` at game/js/plugins/DEUS_Projects.js:837
- `ownJobIds` at game/js/plugins/DEUS_Projects.js:849
- `staleReason` at game/js/plugins/DEUS_Projects.js:880
- `refusedAt` at game/js/plugins/DEUS_Projects.js:906
- `reconcile` at game/js/plugins/DEUS_Projects.js:913
- `retrying` at game/js/plugins/DEUS_Projects.js:965
- `postJob` at game/js/plugins/DEUS_Projects.js:973
- `countOnCell` at game/js/plugins/DEUS_Projects.js:986
- 21 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.Projects` (export, this file :1590):
  - plugin game/js/plugins/DEUS_Colonists.js:820 (6 code hits; lines 820,821,5204,5233)
  - plugin game/js/plugins/DEUS_Stockpiles.js:698 (1 code hit; lines 698)
  - plugin game/js/plugins/DEUS_Test.js:644 (1 code hit; lines 644)
  - plugin game/js/plugins/UF_Households.js:688 (5 code hits; lines 688,689)
  - tool tools/test_autonomous_project_dispatch.js:200 (1 code hit; lines 200)
  - tool tools/test_autonomous_settlement_closure.js:201 (1 code hit; lines 201)
  - tool tools/test_autonomous_work_recovery.js:229 (1 code hit; lines 229)
  - tool tools/test_multi_deficit_settlement.js:174 (1 code hit; lines 174)
  - tool tools/test_native_survival_soak.js:253 (1 code hit; lines 253)
  - tool tools/test_project_construction_loop.js:205 (1 code hit; lines 205)
  - tool tools/test_settlement_domestic_housing.js:250 (1 code hit; lines 250)
  - tool tools/test_settlement_expansion_multi_dwelling.js:230 (1 code hit; lines 230)
  - tool tools/test_settlement_projects.js:196 (1 code hit; lines 196)
  - tool tools/test_stabilization.js:175 (1 code hit; lines 175)
  - tool tools/test_stockpiles_designation.js:189 (1 code hit; lines 189)
  - tool tools/test_survival_needs_loop.js:196 (1 code hit; lines 196)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:145 quotes `DEUS_Projects`
- tool tools/test_autonomous_project_dispatch.js:43 quotes `DEUS_Projects.js`
- tool tools/test_autonomous_project_dispatch.js:198 quotes `DEUS_Projects.js`
- tool tools/test_autonomous_settlement_closure.js:48 quotes `DEUS_Projects.js`
- tool tools/test_autonomous_settlement_closure.js:199 quotes `DEUS_Projects.js`
- tool tools/test_autonomous_work_recovery.js:41 quotes `DEUS_Projects.js`
- tool tools/test_autonomous_work_recovery.js:227 quotes `DEUS_Projects.js`
- tool tools/test_multi_deficit_settlement.js:35 quotes `DEUS_Projects.js`
- tool tools/test_multi_deficit_settlement.js:172 quotes `DEUS_Projects.js`
- tool tools/test_native_survival_soak.js:79 quotes `DEUS_Projects.js`
- tool tools/test_project_construction_loop.js:43 quotes `DEUS_Projects.js`
- tool tools/test_project_construction_loop.js:203 quotes `DEUS_Projects.js`
- tool tools/test_settlement_domestic_housing.js:51 quotes `DEUS_Projects.js`
- tool tools/test_settlement_domestic_housing.js:246 quotes `DEUS_Projects.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:44 quotes `DEUS_Projects.js`
- tool tools/test_settlement_expansion_multi_dwelling.js:228 quotes `DEUS_Projects.js`
- tool tools/test_settlement_projects.js:42 quotes `DEUS_Projects.js`
- tool tools/test_settlement_projects.js:195 quotes `DEUS_Projects.js`
- tool tools/test_settlement_projects.js:309 quotes `DEUS_Projects.js`
- tool tools/test_stabilization.js:36 quotes `DEUS_Projects.js`
- tool tools/test_stabilization.js:173 quotes `DEUS_Projects.js`
- tool tools/test_stockpiles_designation.js:186 quotes `DEUS_Projects.js`
- tool tools/test_survival_needs_loop.js:42 quotes `DEUS_Projects.js`
- tool tools/test_survival_needs_loop.js:194 quotes `DEUS_Projects.js`
- tool tools/test_survival_regressions.js:82 quotes `DEUS_Projects.js`

## DEUS_Select.js

Source lines: 4083.
Exports:
- `DEUS.SelectX` at game/js/plugins/DEUS_Select.js:280
- `UF.SelectX` at game/js/plugins/DEUS_Select.js:281
- `UF.SelectX` at game/js/plugins/DEUS_Select.js:284
- `DEUS.Select` at game/js/plugins/DEUS_Select.js:3366
- `UF.Select` at game/js/plugins/DEUS_Select.js:3368
- `UF.Target` at game/js/plugins/DEUS_Select.js:3369
- `UF.Tech` at game/js/plugins/DEUS_Select.js:3751 fallback (`||`)
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Select.js:279
- namespace object `window/root.UF` at game/js/plugins/DEUS_Select.js:283
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Select.js:3365
- namespace object `window/root.UF` at game/js/plugins/DEUS_Select.js:3367
Engine prototype patches:
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Select.js:2563
- `Scene_Map.prototype.createDisplayObjects` at game/js/plugins/DEUS_Select.js:2692
- `Scene_Map.prototype.isAnyWindowUnderMouse` at game/js/plugins/DEUS_Select.js:2708
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Select.js:2726
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Select.js:2734
- `Scene_Map.prototype.terminate` at game/js/plugins/DEUS_Select.js:2740
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Select.js:2748
- `Scene_Map.prototype.updateOverseerControls` at game/js/plugins/DEUS_Select.js:3093
Engine object patches (not prototype):
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Select.js:1584
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:2283
- `TouchInput._x` at game/js/plugins/DEUS_Select.js:2755
- `TouchInput._y` at game/js/plugins/DEUS_Select.js:2756
- `Input._latestButton` at game/js/plugins/DEUS_Select.js:2766
- `Input._latestButton` at game/js/plugins/DEUS_Select.js:2769
- `Input._latestButton` at game/js/plugins/DEUS_Select.js:2774
- `Input._latestButton` at game/js/plugins/DEUS_Select.js:2778
- `TouchInput._x` at game/js/plugins/DEUS_Select.js:2982
- `TouchInput._y` at game/js/plugins/DEUS_Select.js:2983
- `TouchInput._onMouseDown` at game/js/plugins/DEUS_Select.js:3084
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3102
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3108
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3132
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3140
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3147
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3180
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3205
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3217
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3238
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3256
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3272
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3285
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3293
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:3303
- `TouchInput._x` at game/js/plugins/DEUS_Select.js:3913
- `TouchInput._y` at game/js/plugins/DEUS_Select.js:3914
- `TouchInput._x` at game/js/plugins/DEUS_Select.js:3948
- `TouchInput._y` at game/js/plugins/DEUS_Select.js:3949
- `TouchInput._x` at game/js/plugins/DEUS_Select.js:4039
- `TouchInput._y` at game/js/plugins/DEUS_Select.js:4040
- `TouchInput._currentState` at game/js/plugins/DEUS_Select.js:4041
Engine members read or saved:
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Select.js:2562
- `Scene_Map.prototype.createDisplayObjects` saved to `_Scene_Map_createDisplayObjects` at game/js/plugins/DEUS_Select.js:2691
- `Scene_Map.prototype.isAnyWindowUnderMouse` saved to `_Scene_Map_isAnyWindowUnderMouse` at game/js/plugins/DEUS_Select.js:2707
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Select.js:2725
- `Spriteset_Map.prototype.update` saved to `_Spriteset_Map_update` at game/js/plugins/DEUS_Select.js:2733
- `Scene_Map.prototype.terminate` saved to `_Scene_Map_terminate` at game/js/plugins/DEUS_Select.js:2739
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Select.js:2747
- `Scene_Map.prototype.updateOverseerControls` saved to `_updateOverseerControls` at game/js/plugins/DEUS_Select.js:3092
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Select.js:930
- `TouchInput.y` saved to `my` at game/js/plugins/DEUS_Select.js:949
- `DataManager.extractSaveContents` saved to `prev` at game/js/plugins/DEUS_Select.js:1583
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Select.js:2305
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Select.js:2351
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Select.js:2442
- `TouchInput._onMouseDown` saved to `_TouchInput_onMouseDown` at game/js/plugins/DEUS_Select.js:3083
- `Graphics._canvas` saved to `canvas` at game/js/plugins/DEUS_Select.js:3393
Namespace property patches:
- `UF.Tech.canBuild` at game/js/plugins/DEUS_Select.js:3753
- `UF.Tech.canBuild` at game/js/plugins/DEUS_Select.js:3763
Listeners and commands:
- `on` `"world:unitAdded"` at game/js/plugins/DEUS_Select.js:1677
- `on` `"world:unitRemoved"` at game/js/plugins/DEUS_Select.js:1678
- `on` `"world:unitMoved"` at game/js/plugins/DEUS_Select.js:1679
- `on` `"world:unitAreaChanged"` at game/js/plugins/DEUS_Select.js:1680
- `on` `"world:unitLevelChanged"` at game/js/plugins/DEUS_Select.js:1681
- `on` `"levels:viewChanged"` at game/js/plugins/DEUS_Select.js:1690
- `setHandler` `"ok"` at game/js/plugins/DEUS_Select.js:2454
- `setHandler` `"cancel"` at game/js/plugins/DEUS_Select.js:2478
Classes:
- `Sprite_UFSelectOverlay` at game/js/plugins/DEUS_Select.js:1839
- `Sprite_UFSelectToolbar` at game/js/plugins/DEUS_Select.js:2191
- `Sprite_UFSelectStatus` at game/js/plugins/DEUS_Select.js:2292
- `Window_UFGroupStrip` at game/js/plugins/DEUS_Select.js:2338
- `Window_UFWallPicker` at game/js/plugins/DEUS_Select.js:2412
- `UnitSelectionMarkers` at game/js/plugins/DEUS_Select.js:2491
Named functions at brace depth 0 or 1 (capped at 40):
- `getProvokeString` at game/js/plugins/DEUS_Select.js:293
- `isProvoked` at game/js/plugins/DEUS_Select.js:304
- `xlayerProvoked` at game/js/plugins/DEUS_Select.js:314
- `getConfig` at game/js/plugins/DEUS_Select.js:357
- `copyArea` at game/js/plugins/DEUS_Select.js:386
- `viewZ` at game/js/plugins/DEUS_Select.js:390
- `findUnitAt` at game/js/plugins/DEUS_Select.js:401
- `isPlayerUnit` at game/js/plugins/DEUS_Select.js:477
- `initKeys` at game/js/plugins/DEUS_Select.js:497
- `bitsetEncode` at game/js/plugins/DEUS_Select.js:524
- `bitsetDecode` at game/js/plugins/DEUS_Select.js:530
- `zoneHasCell` at game/js/plugins/DEUS_Select.js:537
- `zoneRemoveCell` at game/js/plugins/DEUS_Select.js:547
- `zoneCountCells` at game/js/plugins/DEUS_Select.js:562
- `ensureSelectState` at game/js/plugins/DEUS_Select.js:576
- `planKey` at game/js/plugins/DEUS_Select.js:598
- `addPlan` at game/js/plugins/DEUS_Select.js:603
- `removePlan` at game/js/plugins/DEUS_Select.js:619
- `hasPlanAt` at game/js/plugins/DEUS_Select.js:632
- `getPlans` at game/js/plugins/DEUS_Select.js:639
- `clearPlans` at game/js/plugins/DEUS_Select.js:646
- `setTargetedTile` at game/js/plugins/DEUS_Select.js:668
- `clearTargetedTile` at game/js/plugins/DEUS_Select.js:677
- `targetedTile` at game/js/plugins/DEUS_Select.js:680
- `getSelectedUnits` at game/js/plugins/DEUS_Select.js:684
- `setSelection` at game/js/plugins/DEUS_Select.js:696
- `clearSelection` at game/js/plugins/DEUS_Select.js:729
- `selectSingleTile` at game/js/plugins/DEUS_Select.js:747
- `selectTileRectangle` at game/js/plugins/DEUS_Select.js:765
- `clearTileSelection` at game/js/plugins/DEUS_Select.js:827
- `isTileSelected` at game/js/plugins/DEUS_Select.js:835
- `getSelectedTiles` at game/js/plugins/DEUS_Select.js:848
- `getSelectedTileBox` at game/js/plugins/DEUS_Select.js:852
- `primaryUnit` at game/js/plugins/DEUS_Select.js:856
- `syncOverseerSelection` at game/js/plugins/DEUS_Select.js:870
- `setTool` at game/js/plugins/DEUS_Select.js:888
- `setStatus` at game/js/plugins/DEUS_Select.js:907
- `pointerOverUI` at game/js/plugins/DEUS_Select.js:929
- `isMapBusy` at game/js/plugins/DEUS_Select.js:965
- `cancelBox` at game/js/plugins/DEUS_Select.js:975
- 27 more function declarations are in caller_inventory.json
module.exports assignments: game/js/plugins/DEUS_Select.js:288
Named consumers outside this file:
- `DEUS.SelectX` (export, this file :280): no-call-found-after-defined-search. Not labeled dead.
- `UF.SelectX` (export, this file :284): no-call-found-after-defined-search. Not labeled dead.
- `DEUS.Select` (export, this file :3366): no-call-found-after-defined-search. Not labeled dead.
- `UF.Select` (export, this file :3368):
  - plugin game/js/plugins/DEUS_Bag.js:72 (1 code hit; lines 72)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:248 (16 code hits; lines 248,254,255,257,258,260,261,277)
  - plugin game/js/plugins/DEUS_Containers.js:962 (1 code hit; lines 962)
  - plugin game/js/plugins/DEUS_LayerOverlays.js:249 (1 code hit; lines 249)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:341 (1 code hit; lines 341)
  - plugin game/js/plugins/DEUS_Sheet.js:2311 (6 code hits; lines 2311,2525)
  - tool tools/select_xlayer/test_xlayer_select.js:322 (2 code hits; lines 322,742)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Goals.js:504 (1); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:405 (1); archive/plugins_uf_pre_rename/UF_Select.js:2436 (1); archive/plugins/DEUS_Goals.js:504 (1); archive/plugins/DEUS_Select.js:2437 (1)
- `UF.Target` (export, this file :3369):
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:140 (7 code hits; lines 140,141,310,311)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:120 (10); archive/plugins_uf_pre_rename/UF_Select.js:1417 (4); archive/plugins/DEUS_Select.js:1417 (4)
- `UF.Tech` (export, this file :3751):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Select.js:723 (11); archive/plugins/DEUS_Select.js:723 (11)
- `Sprite_UFSelectOverlay` (class, this file :1839):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Select.js:1164 (2); archive/plugins/DEUS_Select.js:1164 (2)
- `Sprite_UFSelectToolbar` (class, this file :2191):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Select.js:1440 (2); archive/plugins/DEUS_Select.js:1440 (2)
- `Sprite_UFSelectStatus` (class, this file :2292):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Select.js:1548 (2); archive/plugins/DEUS_Select.js:1548 (2)
- `Window_UFGroupStrip` (class, this file :2338):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Select.js:1594 (2); archive/plugins/DEUS_Select.js:1594 (2)
- `Window_UFWallPicker` (class, this file :2412):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Select.js:1668 (2); archive/plugins/DEUS_Select.js:1668 (2)
- `UnitSelectionMarkers` (class, this file :2491):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Select.js:1746 (2); archive/plugins/DEUS_Select.js:1746 (2)
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_ColonyOverseer.js:50 quotes `DEUS_Select`
- plugin game/js/plugins/DEUS_ColonyOverseer.js:51 quotes `DEUS_Select`
- plugin game/js/plugins/DEUS_Core.js:97 quotes `DEUS_Select`
- tool tools/select_xlayer/test_xlayer_select.js:20 quotes `DEUS_Select.js`
- tool tools/select_xlayer/test_xlayer_select.js:318 quotes `DEUS_Select.js`
- tool tools/test_ludeon_planning.js:53 quotes `DEUS_Select`
- tool tools/test_ludeon_planning.js:54 quotes `DEUS_Select`
- archive quotes omitted from the live list (5 hits)

## DEUS_Sheet.js

Source lines: 3155.
Exports:
- `UF.Sheet` at game/js/plugins/DEUS_Sheet.js:2466
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Sheet.js:2464
- namespace object `window/root.UF` at game/js/plugins/DEUS_Sheet.js:2465
Engine prototype patches:
- `Scene_Map.prototype.createAllWindows` at game/js/plugins/DEUS_Sheet.js:2473
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Sheet.js:2488
- `Scene_Map.prototype.isAnyWindowUnderMouse` at game/js/plugins/DEUS_Sheet.js:2553
- `Menu.prototype.setOptions` at game/js/plugins/DEUS_Sheet.js:2582
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Sheet.js:2593
Engine object patches (not prototype):
- `TouchInput._currentState` at game/js/plugins/DEUS_Sheet.js:2246
- `TouchInput._x` at game/js/plugins/DEUS_Sheet.js:2646
- `TouchInput._y` at game/js/plugins/DEUS_Sheet.js:2647
- `TouchInput._x` at game/js/plugins/DEUS_Sheet.js:2698
- `TouchInput._y` at game/js/plugins/DEUS_Sheet.js:2699
- `TouchInput._triggerX` at game/js/plugins/DEUS_Sheet.js:2706
- `TouchInput._triggerY` at game/js/plugins/DEUS_Sheet.js:2707
Engine members read or saved:
- `Scene_Map.prototype.createAllWindows` saved to `_Scene_Map_createAllWindows` at game/js/plugins/DEUS_Sheet.js:2472
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Sheet.js:2487
- `Scene_Map.prototype.isAnyWindowUnderMouse` saved to `_isAny` at game/js/plugins/DEUS_Sheet.js:2552
- `Menu.prototype.setOptions` saved to `_setOptions` at game/js/plugins/DEUS_Sheet.js:2581
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Sheet.js:2592
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Sheet.js:1382
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Sheet.js:1439
- `ImageManager.faceHeight` saved to `fh` at game/js/plugins/DEUS_Sheet.js:1722
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Sheet.js:2253
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Sheet.js:2608
Namespace property patches:
- none
Listeners and commands:
- `on` `"select:changed"` at game/js/plugins/DEUS_Sheet.js:2541
Classes:
- `Window_UFSheet` at game/js/plugins/DEUS_Sheet.js:1174
Named functions at brace depth 0 or 1 (capped at 40):
- `darkvisionOf` at game/js/plugins/DEUS_Sheet.js:191
- `config` at game/js/plugins/DEUS_Sheet.js:219
- `fileExists` at game/js/plugins/DEUS_Sheet.js:245
- `itemIconSpec` at game/js/plugins/DEUS_Sheet.js:264
- `objectIconSpec` at game/js/plugins/DEUS_Sheet.js:270
- `frameRect` at game/js/plugins/DEUS_Sheet.js:279
- `renderIcon` at game/js/plugins/DEUS_Sheet.js:307
- `iconFor` at game/js/plugins/DEUS_Sheet.js:359
- `genFace` at game/js/plugins/DEUS_Sheet.js:403
- `faceOfObject` at game/js/plugins/DEUS_Sheet.js:488
- `faceSpecOf` at game/js/plugins/DEUS_Sheet.js:500
- `unitAt` at game/js/plugins/DEUS_Sheet.js:542
- `objectKind` at game/js/plugins/DEUS_Sheet.js:556
- `subjectAt` at game/js/plugins/DEUS_Sheet.js:567
- `isPlayersFaction` at game/js/plugins/DEUS_Sheet.js:583
- `isPlayersColonist` at game/js/plugins/DEUS_Sheet.js:590
- `unitKind` at game/js/plugins/DEUS_Sheet.js:594
- `wildSpecies` at game/js/plugins/DEUS_Sheet.js:602
- `itemName` at game/js/plugins/DEUS_Sheet.js:607
- `objectName` at game/js/plugins/DEUS_Sheet.js:612
- `resolveEquip` at game/js/plugins/DEUS_Sheet.js:623
- `equipmentOf` at game/js/plugins/DEUS_Sheet.js:637
- `statsOf` at game/js/plugins/DEUS_Sheet.js:649
- `gridSlots` at game/js/plugins/DEUS_Sheet.js:659
- `factionLine` at game/js/plugins/DEUS_Sheet.js:666
- `doingOf` at game/js/plugins/DEUS_Sheet.js:676
- `pluralName` at game/js/plugins/DEUS_Sheet.js:692
- `countedName` at game/js/plugins/DEUS_Sheet.js:701
- `placeName` at game/js/plugins/DEUS_Sheet.js:713
- `equippedIds` at game/js/plugins/DEUS_Sheet.js:730
- `loadOf` at game/js/plugins/DEUS_Sheet.js:746
- `loadText` at game/js/plugins/DEUS_Sheet.js:777
- `fittedLoadText` at game/js/plugins/DEUS_Sheet.js:786
- `unitModel` at game/js/plugins/DEUS_Sheet.js:792
- `stockpileCells` at game/js/plugins/DEUS_Sheet.js:887
- `cellModel` at game/js/plugins/DEUS_Sheet.js:903
- `buildModel` at game/js/plugins/DEUS_Sheet.js:970
- `layoutFor` at game/js/plugins/DEUS_Sheet.js:986
- `consumeClick` at game/js/plugins/DEUS_Sheet.js:2245
- `interactBusy` at game/js/plugins/DEUS_Sheet.js:2511
- 6 more function declarations are in caller_inventory.json
module.exports assignments: game/js/plugins/DEUS_Sheet.js:2467
Named consumers outside this file:
- `UF.Sheet` (export, this file :2466):
  - plugin game/js/plugins/DEUS_Bag.js:310 (27 code hits; lines 310,311,523,594,595,624,665,707,710,711,712,716)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:132 (17 code hits; lines 132,133,145,146,148,249,263,264,411,458,608)
  - plugin game/js/plugins/DEUS_Containers.js:523 (43 code hits; lines 523,524,627,672,948,1030,1065,1066,1078,1119,1227,1241)
  - plugin game/js/plugins/DEUS_Factions.js:1491 (1 code hit; lines 1491)
  - plugin game/js/plugins/DEUS_Select.js:720 (48 code hits; lines 720,722,724,735,736,2655,2656,2668,2670,2671,2828,2830)
  - plugin game/js/plugins/DEUS_Talk.js:1602 (1 code hit; lines 1602)
  - plugin game/js/plugins/DEUS_Test.js:366 (1 code hit; lines 366)
  - plugin game/js/plugins/DEUS_WorldGen.js:1660 (1 code hit; lines 1660)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:45 (4 code hits; lines 45,46)
  - tool tools/fixtures/UF_SocietyRuntime.js:135 (6 code hits; lines 135,137)
  - tool tools/test_conditions_system.js:244 (1 code hit; lines 244)
  - tool tools/test_creature_inventory_black_box.js:155 (1 code hit; lines 155)
  - tool tools/test_d20_equipment_slots.js:204 (4 code hits; lines 204,216,317)
  - tool tools/test_faction_starting_gear.js:148 (1 code hit; lines 148)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:318 (2); archive/plugins_uf_pre_rename/UF_Factions.js:1527 (1); archive/plugins_uf_pre_rename/UF_Goals.js:502 (9); archive/plugins_uf_pre_rename/UF_Sheet.js:1532 (1); archive/plugins_uf_pre_rename/UF_Talk.js:1602 (1); archive/plugins/DEUS_Goals.js:502 (9)
- `Window_UFSheet` (class, this file :1174):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Sheet.js:941 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:234 quotes `DEUS_Sheet`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Sheet`
- tool tools/test_conditions_system.js:62 quotes `DEUS_Sheet.js`
- tool tools/test_conditions_system.js:232 quotes `DEUS_Sheet.js`
- tool tools/test_d20_equipment_slots.js:127 quotes `DEUS_Sheet.js`
- tool tools/test_faction_starting_gear.js:142 quotes `DEUS_Sheet.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_Spawners.js

Source lines: 58.
Exports:
- `DEUS.Spawners` at game/js/plugins/DEUS_Spawners.js:23 fallback (`||`)
- `Imported.DEUS_Spawners` at game/js/plugins/DEUS_Spawners.js:20
Engine prototype patches:
- `Game_Map.prototype.setup` at game/js/plugins/DEUS_Spawners.js:47
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_Map.prototype.setup` saved to `alias_Game_Map_setup` at game/js/plugins/DEUS_Spawners.js:46
Namespace property patches:
- `DEUS.Spawners.carveGeology` at game/js/plugins/DEUS_Spawners.js:27
- `DEUS.Spawners.onChunkLoad` at game/js/plugins/DEUS_Spawners.js:37
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- `DEUS.Spawners` (export, this file :23): no-call-found-after-defined-search. Not labeled dead.
- `Imported.DEUS_Spawners` (imported-flag, this file :20): no-call-found-after-defined-search. Not labeled dead.
Unqualified property names (length >= 10; may be a different binding):
- `carveGeology` from `DEUS.Spawners.carveGeology` at :27: no-call-found-after-defined-search outside this file. Not labeled dead.
- `onChunkLoad` from `DEUS.Spawners.onChunkLoad` at :37: no-call-found-after-defined-search outside this file. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:304 quotes `DEUS_Spawners`

## DEUS_Speech.js

Source lines: 1402.
Exports:
- `UF.Speech` at game/js/plugins/DEUS_Speech.js:684
- `UF.Visuals` at game/js/plugins/DEUS_Speech.js:725
- `UF.Visuals` at game/js/plugins/DEUS_Speech.js:726
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Speech.js:682
- namespace object `window/root.UF` at game/js/plugins/DEUS_Speech.js:683
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Speech.js:723
- namespace object `window/root.UF` at game/js/plugins/DEUS_Speech.js:724
Engine prototype patches:
- `Spriteset_Map.prototype.createLowerLayer` at game/js/plugins/DEUS_Speech.js:737
- `Game_Map.prototype.setup` at game/js/plugins/DEUS_Speech.js:747
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Speech.js:763
- `Bitmap.prototype.initialize` at game/js/plugins/DEUS_Speech.js:1207
- `Bitmap.prototype.initialize` at game/js/plugins/DEUS_Speech.js:1210
Engine object patches (not prototype):
- `DataManager.setupNewGame` at game/js/plugins/DEUS_Speech.js:752
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Speech.js:757
Engine members read or saved:
- `Spriteset_Map.prototype.createLowerLayer` saved to `_Spriteset_Map_createLowerLayer` at game/js/plugins/DEUS_Speech.js:736
- `Game_Map.prototype.setup` saved to `_Game_Map_setup` at game/js/plugins/DEUS_Speech.js:746
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Speech.js:762
- `Bitmap.prototype.initialize` saved to `_init` at game/js/plugins/DEUS_Speech.js:1206
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Speech.js:365
- `DataManager.setupNewGame` saved to `_DataManager_setupNewGame` at game/js/plugins/DEUS_Speech.js:751
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Speech.js:756
- `Graphics.frameCount` saved to `f0` at game/js/plugins/DEUS_Speech.js:865
- `Graphics.frameCount` saved to `f1` at game/js/plugins/DEUS_Speech.js:880
Namespace property patches:
- `UF.Visuals.bark` at game/js/plugins/DEUS_Speech.js:727
- `UF.Visuals.bark` at game/js/plugins/DEUS_Speech.js:728
Listeners and commands:
- `on` `"world:unitBlocked"` at game/js/plugins/DEUS_Speech.js:1237
Classes:
- `Sprite_UFSpeechLayer` at game/js/plugins/DEUS_Speech.js:473
Named functions at brace depth 0 or 1 (capped at 40):
- `cfg` at game/js/plugins/DEUS_Speech.js:79
- `wrap` at game/js/plugins/DEUS_Speech.js:128
- `refOf` at game/js/plugins/DEUS_Speech.js:167
- `characterOf` at game/js/plugins/DEUS_Speech.js:197
- `aliveRef` at game/js/plugins/DEUS_Speech.js:211
- `canShowNow` at game/js/plugins/DEUS_Speech.js:224
- `snapshot` at game/js/plugins/DEUS_Speech.js:242
- `say` at game/js/plugins/DEUS_Speech.js:256
- `victim` at game/js/plugins/DEUS_Speech.js:306
- `startNext` at game/js/plugins/DEUS_Speech.js:311
- `dropUtt` at game/js/plugins/DEUS_Speech.js:329
- `dropSpeakerLines` at game/js/plugins/DEUS_Speech.js:346
- `frameStep` at game/js/plugins/DEUS_Speech.js:361
- `tick` at game/js/plugins/DEUS_Speech.js:371
- `acquire` at game/js/plugins/DEUS_Speech.js:400
- `release` at game/js/plugins/DEUS_Speech.js:439
- `draw` at game/js/plugins/DEUS_Speech.js:448
- `headOf` at game/js/plugins/DEUS_Speech.js:588
- `clear` at game/js/plugins/DEUS_Speech.js:615
- `lines` at game/js/plugins/DEUS_Speech.js:631
- `isSpeaking` at game/js/plugins/DEUS_Speech.js:638
- `visualsBarksOn` at game/js/plugins/DEUS_Speech.js:689
- `routedBark` at game/js/plugins/DEUS_Speech.js:696
- `routeBarks` at game/js/plugins/DEUS_Speech.js:720
- `registerChecks` at game/js/plugins/DEUS_Speech.js:772
Named consumers outside this file:
- `UF.Speech` (export, this file :684):
  - plugin game/js/plugins/DEUS_Environment.js:69 (1 code hit; lines 69)
  - plugin game/js/plugins/DEUS_Talk.js:1433 (2 code hits; lines 1433,2388)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Environment.js:67 (1); archive/plugins_uf_pre_rename/UF_Skills.js:443 (1); archive/plugins_uf_pre_rename/UF_Speech.js:683 (1); archive/plugins_uf_pre_rename/UF_Talk.js:1433 (2); archive/plugins/DEUS_Skills.js:443 (1)
- `UF.Visuals` (export, this file :726):
  - plugin game/js/plugins/DEUS_Colonists.js:2849 (10 code hits; lines 2849,2850,2851,3171,3173,3297,3299)
  - tool tools/test_population_growth_and_immigration.js:419 (1 code hit; lines 419)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:1994 (10); archive/plugins_uf_pre_rename/UF_Skills.js:454 (3); archive/plugins_uf_pre_rename/UF_Speech.js:723 (18); archive/plugins/DEUS_Skills.js:454 (3)
- `Sprite_UFSpeechLayer` (class, this file :473):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Speech.js:473 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:216 quotes `DEUS_Speech`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Speech`
- archive quotes omitted from the live list (2 hits)

## DEUS_Stance.js

Source lines: 1053.
Exports:
- `UF.Stance` at game/js/plugins/DEUS_Stance.js:117
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Stance.js:115
- namespace object `window/root.UF` at game/js/plugins/DEUS_Stance.js:116
Engine prototype patches:
- `Spriteset_Map.prototype.createCharacters` at game/js/plugins/DEUS_Stance.js:606
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Stance.js:613
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Stance.js:622
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Spriteset_Map.prototype.createCharacters` saved to `_Spriteset_Map_createCharacters` at game/js/plugins/DEUS_Stance.js:605
- `Spriteset_Map.prototype.update` saved to `_Spriteset_Map_update` at game/js/plugins/DEUS_Stance.js:612
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Stance.js:621
- `Graphics.frameCount` saved to `frame` at game/js/plugins/DEUS_Stance.js:500
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Stance.js:585
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- `Sprite_UFStanceMarker` at game/js/plugins/DEUS_Stance.js:439
- `StanceMarkers` at game/js/plugins/DEUS_Stance.js:482
Named functions at brace depth 0 or 1 (capped at 40):
- `stanceOfUnit` at game/js/plugins/DEUS_Stance.js:124
- `isColonistEvent` at game/js/plugins/DEUS_Stance.js:154
- `stanceOfCharacter` at game/js/plugins/DEUS_Stance.js:164
- `frameWidthOf` at game/js/plugins/DEUS_Stance.js:197
- `paintSquare` at game/js/plugins/DEUS_Stance.js:214
- `paintGlowingRing` at game/js/plugins/DEUS_Stance.js:280
- `registerChecks` at game/js/plugins/DEUS_Stance.js:627
Named consumers outside this file:
- `UF.Stance` (export, this file :117):
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:246 (3 code hits; lines 246)
  - plugin game/js/plugins/DEUS_Combat.js:1385 (1 code hit; lines 1385)
  - plugin game/js/plugins/DEUS_Look.js:274 (1 code hit; lines 274)
  - plugin game/js/plugins/DEUS_Select.js:377 (1 code hit; lines 377)
  - plugin game/js/plugins/DEUS_Sheet.js:667 (1 code hit; lines 667)
  - plugin game/js/plugins/DEUS_Talk.js:113 (1 code hit; lines 113)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:199 (3); archive/plugins_uf_pre_rename/UF_Combat.js:977 (1); archive/plugins_uf_pre_rename/UF_Look.js:274 (1); archive/plugins_uf_pre_rename/UF_Select.js:118 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:566 (1); archive/plugins_uf_pre_rename/UF_Stance.js:115 (1); archive/plugins_uf_pre_rename/UF_Talk.js:113 (1); archive/plugins/DEUS_Select.js:118 (1)
- `Sprite_UFStanceMarker` (class, this file :439):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Stance.js:377 (4)
- `StanceMarkers` (class, this file :482):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Stance.js:418 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:163 quotes `DEUS_Stance`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Stance`
- tool tools/run_all_suites.js:24 quotes `DEUS_Stance`
- archive quotes omitted from the live list (2 hits)

## DEUS_Stockpiles.js

Source lines: 750.
Exports:
- `UF.Stockpiles` at game/js/plugins/DEUS_Stockpiles.js:119
- `DEUS.Stockpiles` at game/js/plugins/DEUS_Stockpiles.js:120
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Stockpiles.js:63
- namespace object `window/root.UF` at game/js/plugins/DEUS_Stockpiles.js:64
Engine prototype patches:
- none
Engine object patches (not prototype):
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Stockpiles.js:741
Engine members read or saved:
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Stockpiles.js:740
Namespace property patches:
- none
Listeners and commands:
- dynamic `.on(` at game/js/plugins/DEUS_Stockpiles.js:73 (name not a literal; unknown)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `stockpileState` at game/js/plugins/DEUS_Stockpiles.js:128
- `reindex` at game/js/plugins/DEUS_Stockpiles.js:137
Named consumers outside this file:
- `UF.Stockpiles` (export, this file :119):
  - plugin game/js/plugins/DEUS_Colonists.js:1264 (2 code hits; lines 1264,4604)
  - plugin game/js/plugins/DEUS_History.js:2891 (1 code hit; lines 2891)
  - plugin game/js/plugins/DEUS_Jobs.js:775 (2 code hits; lines 775,794)
  - plugin game/js/plugins/DEUS_Projects.js:527 (3 code hits; lines 527,674,1322)
  - tool tools/test_starter_kit_and_stockpile.js:109 (2 code hits; lines 109,116)
  - tool tools/test_stockpiles_designation.js:189 (1 code hit; lines 189)
- `DEUS.Stockpiles` (export, this file :120): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:94 quotes `DEUS_Stockpiles`
- tool tools/test_native_survival_soak.js:77 quotes `DEUS_Stockpiles.js`
- tool tools/test_stockpiles_designation.js:185 quotes `DEUS_Stockpiles.js`
- tool tools/test_survival_regressions.js:80 quotes `DEUS_Stockpiles.js`

## DEUS_Structural.js

Source lines: 778.
Exports:
- `UF.Structural` at game/js/plugins/DEUS_Structural.js:764
- namespace object `window/root.UF` at game/js/plugins/DEUS_Structural.js:84
Engine prototype patches:
- none
Engine object patches (not prototype):
- `DataManager.makeSaveContents` at game/js/plugins/DEUS_Structural.js:729
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Structural.js:735
Engine members read or saved:
- `DataManager.makeSaveContents` saved to `_DataManager_makeSaveContents` at game/js/plugins/DEUS_Structural.js:728
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Structural.js:734
Namespace property patches:
- none
Listeners and commands:
- `on` `"levels:strataChanged"` at game/js/plugins/DEUS_Structural.js:767
- `on` `"objects:changed"` at game/js/plugins/DEUS_Structural.js:768
- `on` `"objects:levelChanged"` at game/js/plugins/DEUS_Structural.js:769
- `on` `"world:areaGenerated"` at game/js/plugins/DEUS_Structural.js:770
- `on` `"world:created"` at game/js/plugins/DEUS_Structural.js:772
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `sim` at game/js/plugins/DEUS_Structural.js:90
- `freshStats` at game/js/plugins/DEUS_Structural.js:121
- `reset` at game/js/plugins/DEUS_Structural.js:133
- `noteError` at game/js/plugins/DEUS_Structural.js:138
- `stamp` at game/js/plugins/DEUS_Structural.js:146
- `enqueue` at game/js/plugins/DEUS_Structural.js:149
- `pull` at game/js/plugins/DEUS_Structural.js:157
- `wrapCell` at game/js/plugins/DEUS_Structural.js:178
- `forNeighbours` at game/js/plugins/DEUS_Structural.js:188
- `removed` at game/js/plugins/DEUS_Structural.js:194
- `placed` at game/js/plugins/DEUS_Structural.js:199
- `onStrataChanged` at game/js/plugins/DEUS_Structural.js:205
- `structuralType` at game/js/plugins/DEUS_Structural.js:221
- `onObjectChanged` at game/js/plugins/DEUS_Structural.js:227
- `onAreaGenerated` at game/js/plugins/DEUS_Structural.js:241
- `objectsAdapter` at game/js/plugins/DEUS_Structural.js:258
- `makeReader` at game/js/plugins/DEUS_Structural.js:279
- `read` at game/js/plugins/DEUS_Structural.js:289
- `newJob` at game/js/plugins/DEUS_Structural.js:294
- `restart` at game/js/plugins/DEUS_Structural.js:298
- `visit` at game/js/plugins/DEUS_Structural.js:304
- `step` at game/js/plugins/DEUS_Structural.js:313
- `worldRange` at game/js/plugins/DEUS_Structural.js:345
- `planFall` at game/js/plugins/DEUS_Structural.js:353
- `matterCover` at game/js/plugins/DEUS_Structural.js:390
- `kill` at game/js/plugins/DEUS_Structural.js:395
- `hurt` at game/js/plugins/DEUS_Structural.js:406
- `bindOccupants` at game/js/plugins/DEUS_Structural.js:416
- `commit` at game/js/plugins/DEUS_Structural.js:500
- `invalidate` at game/js/plugins/DEUS_Structural.js:539
- `finish` at game/js/plugins/DEUS_Structural.js:554
- `commitReady` at game/js/plugins/DEUS_Structural.js:575
- `service` at game/js/plugins/DEUS_Structural.js:586
- `onTick` at game/js/plugins/DEUS_Structural.js:623
- `explain` at game/js/plugins/DEUS_Structural.js:639
- `saveSection` at game/js/plugins/DEUS_Structural.js:701
- `loadSection` at game/js/plugins/DEUS_Structural.js:714
Named consumers outside this file:
- `UF.Structural` (export, this file :764):
  - plugin game/js/plugins/DEUS_Floors.js:324 (1 code hit; lines 324)
  - plugin game/js/plugins/DEUS_Interact.js:444 (1 code hit; lines 444)
  - plugin game/js/plugins/test_build_vertical_ingame.js:10 (2 code hits; lines 10)
  - tool tools/test_build_vertical.js:326 (3 code hits; lines 326,359,676)
  - tool tools/test_collapse_ingame.js:72 (1 code hit; lines 72)
  - tool tools/test_structural_runtime.js:338 (2 code hits; lines 338,384)
Loader edges (quoted id, not symbol callers):
- tool tools/test_build_vertical.js:825 quotes `DEUS_Structural`
- tool tools/test_build_vertical.js:826 quotes `DEUS_Structural`
- tool tools/test_build_vertical.js:274 quotes `DEUS_Structural.js`
- tool tools/test_collapse_ingame.js:243 quotes `DEUS_Structural`
- tool tools/test_collapse_ingame.js:244 quotes `DEUS_Structural`
- tool tools/test_collapse_ingame.js:60 quotes `DEUS_Structural.js`
- tool tools/test_collapse_ingame.js:61 quotes `DEUS_Structural.js`
- tool tools/test_collapse_ingame.js:224 quotes `DEUS_Structural.js`
- tool tools/test_dig_vertical.js:46 quotes `DEUS_Structural.js`
- tool tools/test_structural_runtime.js:77 quotes `DEUS_Structural.js`
- tool tools/test_structural_runtime.js:289 quotes `DEUS_Structural.js`

## DEUS_StructuralPhysics.js

Source lines: 105.
Exports:
- `DEUS.StructuralPhysics` at game/js/plugins/DEUS_StructuralPhysics.js:17 fallback (`||`)
- `Imported.DEUS_StructuralPhysics` at game/js/plugins/DEUS_StructuralPhysics.js:14
Engine prototype patches:
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_StructuralPhysics.js:30
- `Sprite_Character.prototype.update` at game/js/plugins/DEUS_StructuralPhysics.js:87
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_StructuralPhysics.js:29
- `Sprite_Character.prototype.update` saved to `_Sprite_Character_update` at game/js/plugins/DEUS_StructuralPhysics.js:86
Namespace property patches:
- `DEUS.Core.update` at game/js/plugins/DEUS_StructuralPhysics.js:23
- `DEUS.StructuralPhysics.updateGravity` at game/js/plugins/DEUS_StructuralPhysics.js:36
- `DEUS.StructuralPhysics.hasAnchor` at game/js/plugins/DEUS_StructuralPhysics.js:52
- `DEUS.StructuralPhysics.handleCrushing` at game/js/plugins/DEUS_StructuralPhysics.js:58
- `DEUS.StructuralPhysics.moveToAdjacentFreeSpace` at game/js/plugins/DEUS_StructuralPhysics.js:77
- `DEUS.StructuralPhysics.spawnCorpse` at game/js/plugins/DEUS_StructuralPhysics.js:81
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- `DEUS.StructuralPhysics` (export, this file :17): no-call-found-after-defined-search. Not labeled dead.
- `Imported.DEUS_StructuralPhysics` (imported-flag, this file :14): no-call-found-after-defined-search. Not labeled dead.
Unqualified property names (length >= 10; may be a different binding):
- `updateGravity` from `DEUS.StructuralPhysics.updateGravity` at :36: no-call-found-after-defined-search outside this file. Not labeled dead.
- `handleCrushing` from `DEUS.StructuralPhysics.handleCrushing` at :58: no-call-found-after-defined-search outside this file. Not labeled dead.
- `moveToAdjacentFreeSpace` from `DEUS.StructuralPhysics.moveToAdjacentFreeSpace` at :77: no-call-found-after-defined-search outside this file. Not labeled dead.
- `spawnCorpse` from `DEUS.StructuralPhysics.spawnCorpse` at :81: no-call-found-after-defined-search outside this file. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:302 quotes `DEUS_StructuralPhysics`
- plugins-list game/js/plugins.js:303 quotes `DEUS_StructuralPhysics`

## DEUS_Talk.js

Source lines: 2502.
Exports:
- `UF.Talk` at game/js/plugins/DEUS_Talk.js:1872
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Talk.js:1870
- namespace object `window/root.UF` at game/js/plugins/DEUS_Talk.js:1871
Engine prototype patches:
- `MW.prototype.initialize` at game/js/plugins/DEUS_Talk.js:1906
- `MW.prototype.setOptions` at game/js/plugins/DEUS_Talk.js:1918
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_Talk.js:1938
- `Scene_Map.prototype.terminate` at game/js/plugins/DEUS_Talk.js:1944
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Talk.js:1950
Engine object patches (not prototype):
- `TouchInput._x` at game/js/plugins/DEUS_Talk.js:2129
- `TouchInput._y` at game/js/plugins/DEUS_Talk.js:2130
- `TouchInput._x` at game/js/plugins/DEUS_Talk.js:2134
- `TouchInput._y` at game/js/plugins/DEUS_Talk.js:2135
- `TouchInput._x` at game/js/plugins/DEUS_Talk.js:2465
- `TouchInput._y` at game/js/plugins/DEUS_Talk.js:2466
- `TouchInput._x` at game/js/plugins/DEUS_Talk.js:2469
- `TouchInput._y` at game/js/plugins/DEUS_Talk.js:2470
Engine members read or saved:
- `MW.prototype.initialize` saved to `_init` at game/js/plugins/DEUS_Talk.js:1905
- `MW.prototype.setOptions` saved to `_setOptions` at game/js/plugins/DEUS_Talk.js:1917
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_Talk.js:1937
- `Scene_Map.prototype.terminate` saved to `_Scene_Map_terminate` at game/js/plugins/DEUS_Talk.js:1943
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Talk.js:1949
- `Graphics.height` saved to `gh` at game/js/plugins/DEUS_Talk.js:1118
- `ImageManager.faceHeight` saved to `ph` at game/js/plugins/DEUS_Talk.js:1197
- `Graphics.height` saved to `gh` at game/js/plugins/DEUS_Talk.js:1301
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Talk.js:1373
- `SceneManager._scene` saved to `s` at game/js/plugins/DEUS_Talk.js:1466
- `TouchInput.x` saved to `lastPX` at game/js/plugins/DEUS_Talk.js:1784
- `TouchInput.y` saved to `lastPY` at game/js/plugins/DEUS_Talk.js:1785
- `TouchInput.y` saved to `py` at game/js/plugins/DEUS_Talk.js:1800
- `TouchInput._y` saved to `py` at game/js/plugins/DEUS_Talk.js:2128
- `Graphics.height` saved to `gh` at game/js/plugins/DEUS_Talk.js:2138
- `TouchInput._y` saved to `py` at game/js/plugins/DEUS_Talk.js:2462
Namespace property patches:
- none
Listeners and commands:
- `addEventListener` `"keydown"` at game/js/plugins/DEUS_Talk.js:1929
Classes:
- `TalkScreen` at game/js/plugins/DEUS_Talk.js:1112
Named functions at brace depth 0 or 1 (capped at 40):
- `fileExists` at game/js/plugins/DEUS_Talk.js:163
- `isAlive` at game/js/plugins/DEUS_Talk.js:194
- `isTalkable` at game/js/plugins/DEUS_Talk.js:198
- `isOwn` at game/js/plugins/DEUS_Talk.js:217
- `stageOf` at game/js/plugins/DEUS_Talk.js:222
- `stanceOf` at game/js/plugins/DEUS_Talk.js:234
- `modeOf` at game/js/plugins/DEUS_Talk.js:254
- `moodBand` at game/js/plugins/DEUS_Talk.js:258
- `partnerOf` at game/js/plugins/DEUS_Talk.js:271
- `childrenOf` at game/js/plugins/DEUS_Talk.js:284
- `superiorOf` at game/js/plugins/DEUS_Talk.js:293
- `rulerOf` at game/js/plugins/DEUS_Talk.js:298
- `leaderOf` at game/js/plugins/DEUS_Talk.js:312
- `membersOf` at game/js/plugins/DEUS_Talk.js:315
- `doingOf` at game/js/plugins/DEUS_Talk.js:321
- `bestSkill` at game/js/plugins/DEUS_Talk.js:336
- `tradeOf` at game/js/plugins/DEUS_Talk.js:351
- `homeOf` at game/js/plugins/DEUS_Talk.js:358
- `knownFactions` at game/js/plugins/DEUS_Talk.js:376
- `newsFor` at game/js/plugins/DEUS_Talk.js:388
- `topNeed` at game/js/plugins/DEUS_Talk.js:411
- `directionWord` at game/js/plugins/DEUS_Talk.js:421
- `whereText` at game/js/plugins/DEUS_Talk.js:428
- `topicKw` at game/js/plugins/DEUS_Talk.js:451
- `contextFor` at game/js/plugins/DEUS_Talk.js:459
- `listJoin` at game/js/plugins/DEUS_Talk.js:478
- `fill` at game/js/plugins/DEUS_Talk.js:484
- `say` at game/js/plugins/DEUS_Talk.js:514
- `sayIn` at game/js/plugins/DEUS_Talk.js:518
- `greetLine` at game/js/plugins/DEUS_Talk.js:539
- `titleOf` at game/js/plugins/DEUS_Talk.js:552
- `nameLine` at game/js/plugins/DEUS_Talk.js:562
- `jobLine` at game/js/plugins/DEUS_Talk.js:577
- `familyLine` at game/js/plugins/DEUS_Talk.js:597
- `homeLine` at game/js/plugins/DEUS_Talk.js:613
- `siteLine` at game/js/plugins/DEUS_Talk.js:619
- `moodLine` at game/js/plugins/DEUS_Talk.js:628
- `needLine` at game/js/plugins/DEUS_Talk.js:638
- `othersLine` at game/js/plugins/DEUS_Talk.js:641
- `newsLine` at game/js/plugins/DEUS_Talk.js:646
- 33 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.Talk` (export, this file :1872):
  - plugin game/js/plugins/DEUS_Factions.js:1491 (1 code hit; lines 1491)
  - plugin game/js/plugins/DEUS_Select.js:970 (1 code hit; lines 970)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Factions.js:1527 (1); archive/plugins_uf_pre_rename/UF_Select.js:514 (1); archive/plugins_uf_pre_rename/UF_Talk.js:1871 (1); archive/plugins/DEUS_Select.js:514 (1)
- `TalkScreen` (class, this file :1112):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Talk.js:1112 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:240 quotes `DEUS_Talk`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Talk`
- archive quotes omitted from the live list (2 hits)

## DEUS_Taming.js

Source lines: 241.
Exports:
- `DEUS.Taming` at game/js/plugins/DEUS_Taming.js:234
- `UF.Taming` at game/js/plugins/DEUS_Taming.js:235
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Taming.js:36
- namespace object `window/root.UF` at game/js/plugins/DEUS_Taming.js:37
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:created"` at game/js/plugins/DEUS_Taming.js:238
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `loadSim` at game/js/plugins/DEUS_Taming.js:39
- `loadHumanoidTypes` at game/js/plugins/DEUS_Taming.js:56
- `rulesOf` at game/js/plugins/DEUS_Taming.js:88
- `engineOf` at game/js/plugins/DEUS_Taming.js:92
- `speciesOfUnit` at game/js/plugins/DEUS_Taming.js:101
- `installEcologyAlias` at game/js/plugins/DEUS_Taming.js:107
- `installJobsAlias` at game/js/plugins/DEUS_Taming.js:123
- `installHosts` at game/js/plugins/DEUS_Taming.js:141
- `noEngine` at game/js/plugins/DEUS_Taming.js:146
Named consumers outside this file:
- `DEUS.Taming` (export, this file :234): no-call-found-after-defined-search. Not labeled dead.
- `UF.Taming` (export, this file :235):
  - tool tools/taming/test_taming.js:613 (1 code hit; lines 613)
Loader edges (quoted id, not symbol callers):
- tool tools/taming/test_taming.js:16 quotes `DEUS_Taming.js`

## DEUS_Test.js

Source lines: 796.
Exports:
- `DEUS.Test` at game/js/plugins/DEUS_Test.js:51
- `UF.Test` at game/js/plugins/DEUS_Test.js:52
- `UF.Time` at game/js/plugins/DEUS_Test.js:64
- `UF.NewGameSetup` at game/js/plugins/DEUS_Test.js:204
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Test.js:37
- namespace object `window/root.UF` at game/js/plugins/DEUS_Test.js:38
Engine prototype patches:
- `Scene_Boot.prototype.startNormalGame` at game/js/plugins/DEUS_Test.js:200
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Test.js:624
- `Spriteset_Map.prototype.update` at game/js/plugins/DEUS_Test.js:729
Engine object patches (not prototype):
- `SceneManager.catchException` at game/js/plugins/DEUS_Test.js:108
- `SceneManager.updateMain` at game/js/plugins/DEUS_Test.js:119
- `SceneManager.isGameActive` at game/js/plugins/DEUS_Test.js:189
- `TouchInput._x` at game/js/plugins/DEUS_Test.js:426
- `TouchInput._y` at game/js/plugins/DEUS_Test.js:427
- `Graphics._onTick` at game/js/plugins/DEUS_Test.js:592
- `Graphics._onTick` at game/js/plugins/DEUS_Test.js:728
Engine members read or saved:
- `Spriteset_Map.prototype.update` saved to `origSpritesetUpdate` at game/js/plugins/DEUS_Test.js:623
- `SceneManager.catchException` saved to `_catchException` at game/js/plugins/DEUS_Test.js:107
- `SceneManager.updateMain` saved to `_updateMain` at game/js/plugins/DEUS_Test.js:118
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Test.js:249
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Test.js:402
- `Graphics._onTick` saved to `origOnTick` at game/js/plugins/DEUS_Test.js:591
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Test.js:772
Namespace property patches:
- `UF.Time.setForTest` at game/js/plugins/DEUS_Test.js:65
Listeners and commands:
- `addEventListener` `"error"` at game/js/plugins/DEUS_Test.js:104
- `addEventListener` `"unhandledrejection"` at game/js/plugins/DEUS_Test.js:105
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `installTestClock` at game/js/plugins/DEUS_Test.js:62
- `finish` at game/js/plugins/DEUS_Test.js:163
- `run` at game/js/plugins/DEUS_Test.js:211
Named consumers outside this file:
- `DEUS.Test` (export, this file :51): no-call-found-after-defined-search. Not labeled dead.
- `UF.Test` (export, this file :52):
  - plugin game/js/plugins/DEUS_Anim.js:1820 (3 code hits; lines 1820,1829)
  - plugin game/js/plugins/DEUS_Camera.js:555 (3 code hits; lines 555,559)
  - plugin game/js/plugins/DEUS_Colonists.js:3201 (7 code hits; lines 3201,3228,5890,5898)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:585 (3 code hits; lines 585,589)
  - plugin game/js/plugins/DEUS_Combat.js:1371 (8 code hits; lines 1371,1908,2547,2551)
  - plugin game/js/plugins/DEUS_Culling.js:393 (3 code hits; lines 393,402)
  - plugin game/js/plugins/DEUS_DayNight.js:483 (3 code hits; lines 483,487)
  - plugin game/js/plugins/DEUS_Depth.js:1784 (14 code hits; lines 1784,1913,1933,1963,2378,2382,2683)
  - plugin game/js/plugins/DEUS_Doors.js:570 (6 code hits; lines 570,637,641)
  - plugin game/js/plugins/DEUS_Ecology.js:90 (5 code hits; lines 90,1030,1038)
  - plugin game/js/plugins/DEUS_Environment.js:818 (4 code hits; lines 818,828)
  - plugin game/js/plugins/DEUS_FactionMenus.js:197 (6 code hits; lines 197,1547,1590,1607,1629)
  - plugin game/js/plugins/DEUS_Factions.js:762 (9 code hits; lines 762,766,922,1487,1841)
  - plugin game/js/plugins/DEUS_Fire.js:1389 (3 code hits; lines 1389,1396)
  - plugin game/js/plugins/DEUS_Floors.js:757 (6 code hits; lines 757,804,808)
  - plugin game/js/plugins/DEUS_Fog.js:673 (3 code hits; lines 673,677)
  - plugin game/js/plugins/DEUS_History.js:3756 (5 code hits; lines 3756,3786,3884)
  - plugin game/js/plugins/DEUS_Interact.js:948 (3 code hits; lines 948,955)
  - plugin game/js/plugins/DEUS_Items.js:1589 (3 code hits; lines 1589,1604)
  - plugin game/js/plugins/DEUS_Jobs.js:2044 (4 code hits; lines 2044,2051,2101)
  - plugin game/js/plugins/DEUS_Levels.js:5599 (7 code hits; lines 5599,5606,5607,5608,5609,5610)
  - plugin game/js/plugins/DEUS_Look.js:632 (3 code hits; lines 632,633)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:415 (5 code hits; lines 415,420,442)
  - plugin game/js/plugins/DEUS_Objects.js:1229 (3 code hits; lines 1229,1237)
  - plugin game/js/plugins/DEUS_Ownership.js:102 (5 code hits; lines 102,633,641)
  - plugin game/js/plugins/DEUS_Projects.js:1620 (4 code hits; lines 1620,1628,1699)
  - plugin game/js/plugins/DEUS_Select.js:2680 (5 code hits; lines 2680,3380,3381)
  - plugin game/js/plugins/DEUS_Sheet.js:2596 (6 code hits; lines 2596,2597,2604)
  - plugin game/js/plugins/DEUS_Speech.js:766 (4 code hits; lines 766,773,1342)
  - plugin game/js/plugins/DEUS_Stance.js:137 (5 code hits; lines 137,624,672)
  - plugin game/js/plugins/DEUS_Talk.js:121 (4 code hits; lines 121,1960,1963)
  - plugin game/js/plugins/DEUS_Tiles.js:1295 (4 code hits; lines 1295,1302,1344)
  - plugin game/js/plugins/DEUS_TimeSpeed.js:414 (3 code hits; lines 414,418)
  - plugin game/js/plugins/DEUS_Walls.js:296 (3 code hits; lines 296,300)
  - plugin game/js/plugins/DEUS_Wildlife.js:2379 (4 code hits; lines 2379,2401,2864)
  - plugin game/js/plugins/DEUS_World.js:3942 (4 code hits; lines 3942,4878,5058)
  - plugin game/js/plugins/DEUS_WorldGen.js:2038 (4 code hits; lines 2038,2148,2409)
  - tool tools/bench_viewport_culling.js:59 (3 code hits; lines 59,279,281)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:19 (6 code hits; lines 19,516)
  - tool tools/fixtures/UF_CapturePreVertical.js:17 (1 code hit; lines 17)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:9 (6 code hits; lines 9,13,14)
  - tool tools/fixtures/UF_SleepRuntime.js:10 (6 code hits; lines 10,15,16)
  - tool tools/fixtures/UF_SocietyRuntime.js:10 (6 code hits; lines 10,15,16)
  - tool tools/fixtures/UF_ZFlora.js:12 (3 code hits; lines 12,13)
  - tool tools/fixtures/UF_ZIntegration.js:12 (6 code hits; lines 12,13,75,76)
  - tool tools/fixtures/UF_ZZ_OldSaveFixture.js:29 (3 code hits; lines 29,44)
  - tool tools/occlusion/bench_occlusion.js:81 (2 code hits; lines 81,250)
  - tool tools/occlusion/compare_planes.js:78 (2 code hits; lines 78,160)
  - tool tools/occlusion/live_occlusion.js:80 (1 code hit; lines 80)
  - tool tools/test_autonomous_settlement_closure.js:416 (1 code hit; lines 416)
  - tool tools/test_build_vertical.js:673 (1 code hit; lines 673)
  - tool tools/test_collapse_ingame.js:69 (1 code hit; lines 69)
  - tool tools/test_layer_switch_inplace.js:117 (1 code hit; lines 117)
  - tool tools/test_worldgen_quickfixes.js:81 (1 code hit; lines 81)
  - tool tools/test_z_floors.js:149 (1 code hit; lines 149)
  - tool tools/zrange/zrange_suite.js:23 (1 code hit; lines 23)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:1802 (3); archive/plugins_uf_pre_rename/UF_Camera.js:171 (3); archive/plugins_uf_pre_rename/UF_Colonists.js:2345 (7); archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:481 (3); archive/plugins_uf_pre_rename/UF_Combat.js:964 (8); archive/plugins_uf_pre_rename/UF_DayNight.js:477 (3); archive/plugins_uf_pre_rename/UF_Dialogue.js:516 (3); archive/plugins_uf_pre_rename/UF_Doors.js:531 (6); archive/plugins_uf_pre_rename/UF_Ecology.js:90 (5); archive/plugins_uf_pre_rename/UF_Environment.js:815 (4); archive/plugins_uf_pre_rename/UF_FactionMenus.js:198 (6); archive/plugins_uf_pre_rename/UF_Factions.js:791 (9); archive/plugins_uf_pre_rename/UF_Fire.js:1170 (3); archive/plugins_uf_pre_rename/UF_Floors.js:538 (6); archive/plugins_uf_pre_rename/UF_Fog.js:647 (3); archive/plugins_uf_pre_rename/UF_Goals.js:538 (3); archive/plugins_uf_pre_rename/UF_Gumps.js:406 (3); archive/plugins_uf_pre_rename/UF_History.js:3315 (5); archive/plugins_uf_pre_rename/UF_Interact.js:893 (3); archive/plugins_uf_pre_rename/UF_Items.js:1172 (3); archive/plugins_uf_pre_rename/UF_Jobs.js:1446 (3); archive/plugins_uf_pre_rename/UF_Levels.js:2432 (5); archive/plugins_uf_pre_rename/UF_Look.js:629 (3); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:478 (5); archive/plugins_uf_pre_rename/UF_Objects.js:1008 (3); archive/plugins_uf_pre_rename/UF_Outposts.js:1735 (3); archive/plugins_uf_pre_rename/UF_Ownership.js:102 (5); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:410 (3); archive/plugins_uf_pre_rename/UF_Roads.js:574 (3); archive/plugins_uf_pre_rename/UF_Select.js:1916 (5); archive/plugins_uf_pre_rename/UF_Sheet.js:1647 (3); archive/plugins_uf_pre_rename/UF_Skills.js:714 (3); archive/plugins_uf_pre_rename/UF_Speech.js:764 (4); archive/plugins_uf_pre_rename/UF_Stance.js:556 (3); archive/plugins_uf_pre_rename/UF_Talk.js:121 (4); archive/plugins_uf_pre_rename/UF_Test.js:51 (1); archive/plugins_uf_pre_rename/UF_Tiles.js:1281 (4); archive/plugins_uf_pre_rename/UF_TimeSpeed.js:378 (3); archive/plugins_uf_pre_rename/UF_Walls.js:249 (3); archive/plugins_uf_pre_rename/UF_Wildlife.js:1318 (4); archive/plugins_uf_pre_rename/UF_World.js:2479 (4); archive/plugins_uf_pre_rename/UF_WorldGen.js:1256 (4); archive/plugins/DEUS_Dialogue.js:516 (3); archive/plugins/DEUS_Goals.js:539 (3); archive/plugins/DEUS_Gumps.js:406 (3); archive/plugins/DEUS_Outposts.js:1736 (3); archive/plugins/DEUS_ProfileTabs.js:410 (3); archive/plugins/DEUS_Roads.js:575 (3); archive/plugins/DEUS_Select.js:1916 (5); archive/plugins/DEUS_Skills.js:715 (3)
- `UF.Time` (export, this file :64): Also assigned or declared in game/js/plugins/DEUS_Core.js:482 fallback, game/js/plugins/DEUS_TimeSpeed.js:144, game/js/plugins/UF_Time.js:569. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Anim.js:2206 (7 code hits; lines 2206,2208,2214,2698)
  - plugin game/js/plugins/DEUS_Colonists.js:187 (29 code hits; lines 187,192,196,200,204,340,349,359,683,5844)
  - plugin game/js/plugins/DEUS_Combat.js:137 (19 code hits; lines 137,1668,1827,2570,2571,2948,3185)
  - plugin game/js/plugins/DEUS_Conditions.js:76 (3 code hits; lines 76)
  - plugin game/js/plugins/DEUS_Core.js:482 (18 code hits; lines 482,483,484,485,486,487,488,489,490,491,492,493)
  - plugin game/js/plugins/DEUS_DayNight.js:156 (18 code hits; lines 156,157,515,526,543,545,657)
  - plugin game/js/plugins/DEUS_Depth.js:1944 (8 code hits; lines 1944,1950,2390,2396)
  - plugin game/js/plugins/DEUS_Doors.js:54 (10 code hits; lines 54,615,654,656)
  - plugin game/js/plugins/DEUS_Factions.js:1491 (1 code hit; lines 1491)
  - plugin game/js/plugins/DEUS_Fire.js:1397 (1 code hit; lines 1397)
  - plugin game/js/plugins/DEUS_Floors.js:774 (7 code hits; lines 774,891,893)
  - plugin game/js/plugins/DEUS_History.js:3832 (4 code hits; lines 3832,3834,3837,3846)
  - plugin game/js/plugins/DEUS_Interact.js:1083 (4 code hits; lines 1083,1176)
  - plugin game/js/plugins/DEUS_Jobs.js:122 (7 code hits; lines 122,2175,2361)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:274 (16 code hits; lines 274,302,446,495,502,505,506,508,560)
  - plugin game/js/plugins/DEUS_Ownership.js:89 (3 code hits; lines 89)
  - plugin game/js/plugins/DEUS_Projects.js:164 (22 code hits; lines 164,1669,1673,1705,1736,1737,1741,1766,1769)
  - plugin game/js/plugins/DEUS_Sheet.js:2607 (1 code hit; lines 2607)
  - plugin game/js/plugins/DEUS_Speech.js:240 (5 code hits; lines 240,362,780,1344)
  - plugin game/js/plugins/DEUS_Talk.js:114 (1 code hit; lines 114)
  - plugin game/js/plugins/DEUS_TimeSpeed.js:144 (4 code hits; lines 144,237,238)
  - plugin game/js/plugins/DEUS_World.js:4808 (1 code hit; lines 4808)
  - plugin game/js/plugins/UF_Households.js:40 (3 code hits; lines 40)
  - plugin game/js/plugins/UF_Time.js:569 (5 code hits; lines 569,571,574,580)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:200 (9 code hits; lines 200,201,425)
  - tool tools/benchmark_performance.js:99 (2 code hits; lines 99,110)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:39 (7 code hits; lines 39,43,51,52,63)
  - tool tools/fixtures/UF_SleepRuntime.js:59 (4 code hits; lines 59,63)
  - tool tools/fixtures/UF_SocietyRuntime.js:73 (4 code hits; lines 73,122,134)
  - tool tools/fixtures/UF_ZFlora.js:15 (6 code hits; lines 15,16,113)
  - tool tools/occlusion/bench_occlusion.js:90 (6 code hits; lines 90,91)
  - tool tools/occlusion/compare_planes.js:84 (6 code hits; lines 84,85)
  - tool tools/occlusion/live_occlusion.js:87 (6 code hits; lines 87,88)
  - tool tools/smoke_19a_playtest.js:104 (14 code hits; lines 104,178,335,401,429)
  - tool tools/test_autonomous_settlement_closure.js:412 (1 code hit; lines 412)
  - tool tools/test_build_vertical.js:726 (10 code hits; lines 726,781,783)
  - tool tools/test_collapse_ingame.js:139 (11 code hits; lines 139,146,173,175)
  - tool tools/test_conditions_system.js:224 (1 code hit; lines 224)
  - tool tools/test_goals.js:99 (3 code hits; lines 99,100,106)
  - tool tools/test_layer_switch_inplace.js:140 (12 code hits; lines 140,188,273,291)
  - tool tools/test_material_refining_and_tech_pacing.js:149 (1 code hit; lines 149)
  - tool tools/test_time_domains_proof.js:60 (43 code hits; lines 60,68,71,72,73,76,77,78,97,116,124,133)
  - tool tools/zrange/zrange_suite.js:81 (18 code hits; lines 81,82,423,424,434,435)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:2186 (7); archive/plugins_uf_pre_rename/UF_Colonists.js:139 (14); archive/plugins_uf_pre_rename/UF_Combat.js:1200 (14); archive/plugins_uf_pre_rename/UF_Core.js:420 (3); archive/plugins_uf_pre_rename/UF_CultureGrowth.js:52 (3); archive/plugins_uf_pre_rename/UF_DayNight.js:155 (18); archive/plugins_uf_pre_rename/UF_Doors.js:54 (10); archive/plugins_uf_pre_rename/UF_Factions.js:1527 (1); archive/plugins_uf_pre_rename/UF_Fire.js:1178 (1); archive/plugins_uf_pre_rename/UF_FireSafety.js:28 (3); archive/plugins_uf_pre_rename/UF_Floors.js:555 (7); archive/plugins_uf_pre_rename/UF_Goals.js:40 (5); archive/plugins_uf_pre_rename/UF_History.js:3389 (4); archive/plugins_uf_pre_rename/UF_Households.js:39 (3); archive/plugins_uf_pre_rename/UF_Interact.js:1027 (4); archive/plugins_uf_pre_rename/UF_Jobs.js:97 (7); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:266 (22); archive/plugins_uf_pre_rename/UF_Ownership.js:89 (3); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:414 (1); archive/plugins_uf_pre_rename/UF_Resources.js:99 (3); archive/plugins_uf_pre_rename/UF_Sanitation.js:284 (3); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:64 (3); archive/plugins_uf_pre_rename/UF_Sheet.js:1657 (1); archive/plugins_uf_pre_rename/UF_Skills.js:907 (2); archive/plugins_uf_pre_rename/UF_Speech.js:240 (5); archive/plugins_uf_pre_rename/UF_Talk.js:114 (1); archive/plugins_uf_pre_rename/UF_Time.js:569 (5); archive/plugins_uf_pre_rename/UF_TimeSpeed.js:126 (4); archive/plugins_uf_pre_rename/UF_World.js:3345 (1); archive/plugins/DEUS_CultureGrowth.js:52 (3); archive/plugins/DEUS_FireSafety.js:28 (3); archive/plugins/DEUS_Goals.js:40 (5); archive/plugins/DEUS_Households.js:39 (3); archive/plugins/DEUS_ProfileTabs.js:414 (1); archive/plugins/DEUS_Resources.js:99 (3); archive/plugins/DEUS_Sanitation.js:284 (3); archive/plugins/DEUS_SettlementPillars.js:64 (3); archive/plugins/DEUS_Skills.js:908 (2); archive/plugins/DEUS_Time.js:569 (5)
- `UF.NewGameSetup` (export, this file :204): Also assigned or declared in game/js/plugins/DEUS_FactionMenus.js:287. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Core.js:331 (4 code hits; lines 331,347)
  - plugin game/js/plugins/DEUS_FactionMenus.js:287 (1 code hit; lines 287)
  - plugin game/js/plugins/DEUS_Factions.js:131 (3 code hits; lines 131)
  - plugin game/js/plugins/DEUS_History.js:3469 (2 code hits; lines 3469)
  - plugin game/js/plugins/DEUS_Levels.js:4789 (2 code hits; lines 4789)
  - plugin game/js/plugins/DEUS_World.js:3844 (3 code hits; lines 3844)
  - tool tools/capture_pre_migration_baseline.js:132 (1 code hit; lines 132)
  - tool tools/dev/sim_forward.js:180 (1 code hit; lines 180)
  - tool tools/governance/fixtures/invariants/INV-SIM-01/game/js/plugins/DEUS_Core.js:3 (2 code hits; lines 3)
  - tool tools/occlusion/bench_occlusion.js:78 (2 code hits; lines 78)
  - tool tools/occlusion/compare_planes.js:75 (2 code hits; lines 75)
  - tool tools/occlusion/live_occlusion.js:77 (2 code hits; lines 77)
  - tool tools/sim/test_sim_forward_guard.js:164 (1 code hit; lines 164)
  - tool tools/sim/test_underground_year0.js:98 (1 code hit; lines 98)
  - tool tools/society/test_person_identity.js:448 (1 code hit; lines 448)
  - tool tools/test_19b_performance_determinism.js:127 (17 code hits; lines 127,128,129,130,142,143,144,174,175,176,205,206)
  - tool tools/test_build_vertical.js:286 (1 code hit; lines 286)
  - tool tools/test_generated_z2_cut_proof.js:369 (1 code hit; lines 369)
  - tool tools/test_history_materialization_and_world_age.js:158 (1 code hit; lines 158)
  - tool tools/test_native_survival_soak.js:258 (1 code hit; lines 258)
  - tool tools/test_natural_connections_no_mint.js:187 (1 code hit; lines 187)
  - tool tools/test_new_game_year0.js:146 (4 code hits; lines 146,148,345,347)
  - tool tools/test_region_seam_continuity.js:219 (1 code hit; lines 219)
  - tool tools/test_sim_tick.js:218 (1 code hit; lines 218)
  - tool tools/test_strata_cuts_and_caves.js:320 (2 code hits; lines 320,546)
  - tool tools/test_strata_fluid_reconciliation.js:149 (1 code hit; lines 149)
  - tool tools/test_strata_foundation.js:264 (2 code hits; lines 264,920)
  - tool tools/test_structural_levels.js:711 (1 code hit; lines 711)
  - tool tools/test_structural_runtime.js:295 (1 code hit; lines 295)
  - tool tools/test_structure_fluid.js:181 (1 code hit; lines 181)
  - tool tools/test_survival_regressions.js:672 (1 code hit; lines 672)
  - tool tools/test_volumetric_terrain_column.js:266 (1 code hit; lines 266)
  - tool tools/worldgen/test_vertical_biome_coupling.js:317 (1 code hit; lines 317)
  - tool tools/zrange/bench_queries.js:89 (1 code hit; lines 89)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Core.js:302 (2); archive/plugins_uf_pre_rename/UF_FactionMenus.js:277 (1); archive/plugins_uf_pre_rename/UF_Factions.js:130 (3); archive/plugins_uf_pre_rename/UF_Fog.js:481 (3); archive/plugins_uf_pre_rename/UF_History.js:317 (3); archive/plugins_uf_pre_rename/UF_World.js:360 (3)
Unqualified property names (length >= 10; may be a different binding):
- `setForTest` from `UF.Time.setForTest` at :65: plugin game/js/plugins/DEUS_Depth.js:1950 (4); plugin game/js/plugins/DEUS_Projects.js:1705 (2); tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:200 (4); tool tools/occlusion/bench_occlusion.js:91 (2); tool tools/occlusion/compare_planes.js:85 (2); tool tools/occlusion/live_occlusion.js:88 (2); tool tools/test_autonomous_settlement_closure.js:413 (4)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:296 quotes `DEUS_Test`
- tool tools/add_test_plugin.js:12 quotes `DEUS_Test`
- tool tools/bench/combat_srd/self_test.js:159 quotes `DEUS_Test.js`
- tool tools/benchmark_live_perf.js:34 quotes `DEUS_Test.js`
- tool tools/bench_combat_srd.js:79 quotes `DEUS_Test`
- tool tools/bench_combat_srd.js:81 quotes `DEUS_Test`
- tool tools/bench_combat_srd.js:70 quotes `DEUS_Test.js`
- tool tools/bench_render_layers.js:704 quotes `DEUS_Test`
- tool tools/bench_render_layers.js:706 quotes `DEUS_Test`
- tool tools/bench_viewport_culling.js:318 quotes `DEUS_Test`
- tool tools/bench_viewport_culling.js:320 quotes `DEUS_Test`
- tool tools/diagnose_frame_spikes.js:20 quotes `DEUS_Test.js`
- tool tools/diagnose_hotspots.js:100 quotes `DEUS_Test.js`
- tool tools/occlusion/live_occlusion.js:63 quotes `DEUS_Test`
- tool tools/profile_live_frames.js:402 quotes `DEUS_Test.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Test`
- tool tools/render_birds_eye_showcase.js:16 quotes `DEUS_Test.js`
- tool tools/test_ally_movement_exclusive_action_square.js:35 quotes `DEUS_Test.js`
- tool tools/test_autonomous_settlement_closure.js:48 quotes `DEUS_Test.js`
- tool tools/test_building_variety_live.js:37 quotes `DEUS_Test.js`
- tool tools/test_build_vertical.js:823 quotes `DEUS_Test`
- tool tools/test_callings_and_clearing_live.js:43 quotes `DEUS_Test.js`
- tool tools/test_collapse_ingame.js:241 quotes `DEUS_Test`
- tool tools/test_continuous_frontier_progression.js:38 quotes `DEUS_Test.js`
- tool tools/test_cooperative_homestead_construction.js:39 quotes `DEUS_Test.js`
- tool tools/test_dwarves_ingame.js:88 quotes `DEUS_Test.js`
- tool tools/test_elves_ingame.js:90 quotes `DEUS_Test.js`
- tool tools/test_factions_live.js:18 quotes `DEUS_Test.js`
- tool tools/test_fog_z_level_live.js:38 quotes `DEUS_Test.js`
- tool tools/test_golden_art_review_live.js:67 quotes `DEUS_Test.js`
- tool tools/test_greater_z_roof_live.js:39 quotes `DEUS_Test.js`
- tool tools/test_human_dwarf_8d_live.js:98 quotes `DEUS_Test.js`
- tool tools/test_human_female_variations_live.js:32 quotes `DEUS_Test.js`
- tool tools/test_human_male_live_ingame.js:32 quotes `DEUS_Test.js`
- tool tools/test_human_male_variations_live.js:32 quotes `DEUS_Test.js`
- tool tools/test_layer_switch_inplace.js:424 quotes `DEUS_Test`
- tool tools/test_light_wall_occlusion_live.js:25 quotes `DEUS_Test.js`
- tool tools/test_live_town_center_progression.js:41 quotes `DEUS_Test.js`
- tool tools/test_ludeon_planning.js:54 quotes `DEUS_Test`
- tool tools/test_ludeon_planning.js:58 quotes `DEUS_Test.js`
- tool tools/test_menu_ingame.js:18 quotes `DEUS_Test.js`
- tool tools/test_package_proofs_ingame.js:20 quotes `DEUS_Test.js`
- tool tools/test_post_town_hall_progression.js:38 quotes `DEUS_Test.js`
- tool tools/test_round_world_live.js:34 quotes `DEUS_Test.js`
- tool tools/test_seamless_seam_live.js:35 quotes `DEUS_Test.js`
- tool tools/test_sim_loader.js:293 quotes `DEUS_Test`
- tool tools/test_sim_tick.js:423 quotes `DEUS_Test`
- tool tools/test_snapshot.js:61 quotes `DEUS_Test`
- tool tools/test_snapshot.js:65 quotes `DEUS_Test`
- tool tools/test_standard_4d_ingame.js:30 quotes `DEUS_Test.js`
- tool tools/test_standard_8d_ingame.js:34 quotes `DEUS_Test.js`
- tool tools/test_temperate_arid_transition_live.js:44 quotes `DEUS_Test.js`
- tool tools/test_tilesets_live.js:12 quotes `DEUS_Test.js`
- tool tools/test_town_hall_ai_live.js:48 quotes `DEUS_Test.js`
- tool tools/test_underground_room.js:12 quotes `DEUS_Test.js`
- tool tools/test_unpartnered_shelter_progression.js:40 quotes `DEUS_Test.js`
- tool tools/test_water_ingame.js:12 quotes `DEUS_Test.js`
- tool tools/test_zrange.js:132 quotes `DEUS_Test`
- archive quotes omitted from the live list (2 hits)

## DEUS_Tiles.js

Source lines: 1510.
Exports:
- `UF.Tiles` at game/js/plugins/DEUS_Tiles.js:484
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Tiles.js:482
- namespace object `window/root.UF` at game/js/plugins/DEUS_Tiles.js:483
Engine prototype patches:
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Tiles.js:1288
Engine object patches (not prototype):
- `ImageManager.loadTileset` at game/js/plugins/DEUS_Tiles.js:410
- `Tilemap.isWaterTile` at game/js/plugins/DEUS_Tiles.js:508
- `DataManager.onLoad` at game/js/plugins/DEUS_Tiles.js:533
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Tiles.js:1284
Engine members read or saved:
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Tiles.js:1269
- `ImageManager.loadTileset` saved to `_ImageManager_loadTileset` at game/js/plugins/DEUS_Tiles.js:409
- `DataManager.onLoad` saved to `_DataManager_onLoad` at game/js/plugins/DEUS_Tiles.js:532
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_Tiles.js:1240
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents_shades` at game/js/plugins/DEUS_Tiles.js:1283
Namespace property patches:
- `UF.World.buildArea` at game/js/plugins/DEUS_Tiles.js:1250
Listeners and commands:
- `on` `"world:tileChanged"` at game/js/plugins/DEUS_Tiles.js:1256
- `on` `"world:initializing"` at game/js/plugins/DEUS_Tiles.js:1282
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `hash32` at game/js/plugins/DEUS_Tiles.js:71
- `texelByTones` at game/js/plugins/DEUS_Tiles.js:93
- `texel` at game/js/plugins/DEUS_Tiles.js:129
- `paintBlock` at game/js/plugins/DEUS_Tiles.js:134
- `generatedGround` at game/js/plugins/DEUS_Tiles.js:163
- `parseShadeKey` at game/js/plugins/DEUS_Tiles.js:194
- `paintShadeTile` at game/js/plugins/DEUS_Tiles.js:209
- `getPairDef` at game/js/plugins/DEUS_Tiles.js:305
- `initShadeAtlas` at game/js/plugins/DEUS_Tiles.js:333
- `getOrAllocateShadeTile` at game/js/plugins/DEUS_Tiles.js:379
- `registerTileset` at game/js/plugins/DEUS_Tiles.js:489
- `smoothstep` at game/js/plugins/DEUS_Tiles.js:547
- `computeShadePlan` at game/js/plugins/DEUS_Tiles.js:552
- `applyGroundShades` at game/js/plugins/DEUS_Tiles.js:1218
- `updateCellShade` at game/js/plugins/DEUS_Tiles.js:1233
- `ensureBuildHook` at game/js/plugins/DEUS_Tiles.js:1246
- `resetWorldShades` at game/js/plugins/DEUS_Tiles.js:1272
- `registerChecks` at game/js/plugins/DEUS_Tiles.js:1301
Named consumers outside this file:
- `UF.Tiles` (export, this file :484):
  - plugin game/js/plugins/DEUS_Colonists.js:3784 (1 code hit; lines 3784)
  - plugin game/js/plugins/DEUS_Depth.js:1865 (1 code hit; lines 1865)
  - plugin game/js/plugins/DEUS_Fire.js:452 (5 code hits; lines 452,464,477,1514)
  - plugin game/js/plugins/DEUS_Floors.js:65 (1 code hit; lines 65)
  - plugin game/js/plugins/DEUS_History.js:1863 (1 code hit; lines 1863)
  - plugin game/js/plugins/DEUS_Interact.js:219 (8 code hits; lines 219,226,239,257,1091,1096,1097,1098)
  - plugin game/js/plugins/DEUS_Levels.js:5712 (2 code hits; lines 5712)
  - plugin game/js/plugins/DEUS_Look.js:337 (2 code hits; lines 337,664)
  - plugin game/js/plugins/DEUS_Objects.js:275 (1 code hit; lines 275)
  - plugin game/js/plugins/DEUS_WorldGen.js:1194 (14 code hits; lines 1194,1375,2194,2195,2361,2386)
  - tool tools/bench_shades.js:53 (3 code hits; lines 53,58,59)
  - tool tools/inspect_65_40_sim.js:80 (3 code hits; lines 80,90,92)
  - tool tools/inspect_65_40.js:37 (2 code hits; lines 37,39)
  - tool tools/inspect_border_tiles.js:60 (1 code hit; lines 60)
  - tool tools/scratch_inspect.js:35 (2 code hits; lines 35,36)
  - tool tools/test_strata_cuts_and_caves.js:1177 (1 code hit; lines 1177)
  - tool tools/test_volumetric_terrain_column.js:264 (1 code hit; lines 264)
  - tool tools/test_worldgen_quickfixes.js:61 (1 code hit; lines 61)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:113 (3); archive/plugins_uf_pre_rename/UF_Colonists.js:2815 (1); archive/plugins_uf_pre_rename/UF_Fire.js:309 (5); archive/plugins_uf_pre_rename/UF_Floors.js:42 (1); archive/plugins_uf_pre_rename/UF_History.js:1631 (1); archive/plugins_uf_pre_rename/UF_Interact.js:217 (8); archive/plugins_uf_pre_rename/UF_Look.js:337 (2); archive/plugins_uf_pre_rename/UF_Objects.js:196 (1); archive/plugins_uf_pre_rename/UF_Roads.js:56 (1); archive/plugins_uf_pre_rename/UF_Tiles.js:479 (1); archive/plugins_uf_pre_rename/UF_WorldGen.js:943 (19); archive/plugins/DEUS_Agriculture.js:113 (3); archive/plugins/DEUS_Roads.js:56 (1)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:79 quotes `DEUS_Tiles`
- tool tools/bench_vertical_worldgen.js:151 quotes `DEUS_Tiles`
- tool tools/capture_pre_migration_baseline.js:114 quotes `DEUS_Tiles.js`
- tool tools/performance/census_boot_load.js:69 quotes `DEUS_Tiles.js`
- tool tools/register_world_plugins.js:14 quotes `DEUS_Tiles`
- tool tools/run_all_suites.js:23 quotes `DEUS_Tiles`
- tool tools/test_19b_performance_determinism.js:101 quotes `DEUS_Tiles.js`
- tool tools/test_build_vertical.js:273 quotes `DEUS_Tiles.js`
- tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:41 quotes `DEUS_Tiles.js`
- tool tools/test_generated_z2_cut_proof.js:363 quotes `DEUS_Tiles.js`
- tool tools/test_natural_connections_no_mint.js:86 quotes `DEUS_Tiles.js`
- tool tools/test_region_seam_continuity.js:42 quotes `DEUS_Tiles.js`
- tool tools/test_seamless_map_edges.js:154 quotes `DEUS_Tiles.js`
- tool tools/test_strata_cuts_and_caves.js:203 quotes `DEUS_Tiles.js`
- tool tools/test_strata_fluid_reconciliation.js:43 quotes `DEUS_Tiles.js`
- tool tools/test_strata_foundation.js:139 quotes `DEUS_Tiles.js`
- tool tools/test_structural_levels.js:705 quotes `DEUS_Tiles.js`
- tool tools/test_structural_runtime.js:273 quotes `DEUS_Tiles.js`
- tool tools/test_structure_fluid.js:175 quotes `DEUS_Tiles.js`
- tool tools/test_volumetric_terrain_column.js:124 quotes `DEUS_Tiles.js`
- tool tools/zrange/bench_queries.js:24 quotes `DEUS_Tiles.js`
- archive quotes omitted from the live list (2 hits)

## DEUS_TimeSpeed.js

Source lines: 608.
Exports:
- `UF.Time` at game/js/plugins/DEUS_TimeSpeed.js:144
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_TimeSpeed.js:142
- namespace object `window/root.UF` at game/js/plugins/DEUS_TimeSpeed.js:143
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_TimeSpeed.js:189
- `Scene_Map.prototype.updateMain` at game/js/plugins/DEUS_TimeSpeed.js:210
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_TimeSpeed.js:232
- `Scene_Map.prototype.createDisplayObjects` at game/js/plugins/DEUS_TimeSpeed.js:392
- `Scene_Map.prototype.isAnyWindowUnderMouse` at game/js/plugins/DEUS_TimeSpeed.js:399
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_TimeSpeed.js:412
Engine object patches (not prototype):
- `SceneManager.determineRepeatNumber` at game/js/plugins/DEUS_TimeSpeed.js:148
- `SceneManager.update` at game/js/plugins/DEUS_TimeSpeed.js:159
- `SceneManager.updateInputData` at game/js/plugins/DEUS_TimeSpeed.js:176
- `SceneManager.updateEffekseer` at game/js/plugins/DEUS_TimeSpeed.js:182
- `DataManager.createGameObjects` at game/js/plugins/DEUS_TimeSpeed.js:221
- `TouchInput._x` at game/js/plugins/DEUS_TimeSpeed.js:567
- `TouchInput._y` at game/js/plugins/DEUS_TimeSpeed.js:568
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_TimeSpeed.js:188
- `Scene_Map.prototype.updateMain` saved to `_Scene_Map_updateMain` at game/js/plugins/DEUS_TimeSpeed.js:209
- `Scene_Map.prototype.update` saved to `_Scene_Map_update` at game/js/plugins/DEUS_TimeSpeed.js:231
- `Scene_Map.prototype.createDisplayObjects` saved to `_Scene_Map_createDisplayObjects` at game/js/plugins/DEUS_TimeSpeed.js:391
- `Scene_Map.prototype.isAnyWindowUnderMouse` saved to `_Scene_Map_isAnyWindowUnderMouse` at game/js/plugins/DEUS_TimeSpeed.js:398
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_TimeSpeed.js:411
- `SceneManager.determineRepeatNumber` saved to `_determineRepeatNumber` at game/js/plugins/DEUS_TimeSpeed.js:147
- `SceneManager.update` saved to `_SceneManager_update` at game/js/plugins/DEUS_TimeSpeed.js:158
- `SceneManager.updateInputData` saved to `_SceneManager_updateInputData` at game/js/plugins/DEUS_TimeSpeed.js:175
- `SceneManager.updateEffekseer` saved to `_SceneManager_updateEffekseer` at game/js/plugins/DEUS_TimeSpeed.js:181
- `DataManager.createGameObjects` saved to `_DataManager_createGameObjects` at game/js/plugins/DEUS_TimeSpeed.js:220
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_TimeSpeed.js:259
- `Graphics.frameCount` saved to `f0` at game/js/plugins/DEUS_TimeSpeed.js:446
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_TimeSpeed.js:556
Namespace property patches:
- none
Listeners and commands:
- `on` `"time:paused"` at game/js/plugins/DEUS_TimeSpeed.js:460
- `on` `"time:resumed"` at game/js/plugins/DEUS_TimeSpeed.js:461
- `addEventListener` `"keydown"` at game/js/plugins/DEUS_TimeSpeed.js:264
Classes:
- `Sprite_UFTimeControls` at game/js/plugins/DEUS_TimeSpeed.js:272
Named functions at brace depth 0 or 1 (capped at 40):
- `registerChecks` at game/js/plugins/DEUS_TimeSpeed.js:417
Named consumers outside this file:
- `UF.Time` (export, this file :144): Also assigned or declared in game/js/plugins/DEUS_Core.js:482 fallback, game/js/plugins/DEUS_Test.js:64, game/js/plugins/UF_Time.js:569. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Anim.js:2206 (7 code hits; lines 2206,2208,2214,2698)
  - plugin game/js/plugins/DEUS_Colonists.js:187 (29 code hits; lines 187,192,196,200,204,340,349,359,683,5844)
  - plugin game/js/plugins/DEUS_Combat.js:137 (19 code hits; lines 137,1668,1827,2570,2571,2948,3185)
  - plugin game/js/plugins/DEUS_Conditions.js:76 (3 code hits; lines 76)
  - plugin game/js/plugins/DEUS_Core.js:482 (18 code hits; lines 482,483,484,485,486,487,488,489,490,491,492,493)
  - plugin game/js/plugins/DEUS_DayNight.js:156 (18 code hits; lines 156,157,515,526,543,545,657)
  - plugin game/js/plugins/DEUS_Depth.js:1944 (8 code hits; lines 1944,1950,2390,2396)
  - plugin game/js/plugins/DEUS_Doors.js:54 (10 code hits; lines 54,615,654,656)
  - plugin game/js/plugins/DEUS_Factions.js:1491 (1 code hit; lines 1491)
  - plugin game/js/plugins/DEUS_Fire.js:1397 (1 code hit; lines 1397)
  - plugin game/js/plugins/DEUS_Floors.js:774 (7 code hits; lines 774,891,893)
  - plugin game/js/plugins/DEUS_History.js:3832 (4 code hits; lines 3832,3834,3837,3846)
  - plugin game/js/plugins/DEUS_Interact.js:1083 (4 code hits; lines 1083,1176)
  - plugin game/js/plugins/DEUS_Jobs.js:122 (7 code hits; lines 122,2175,2361)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:274 (16 code hits; lines 274,302,446,495,502,505,506,508,560)
  - plugin game/js/plugins/DEUS_Ownership.js:89 (3 code hits; lines 89)
  - plugin game/js/plugins/DEUS_Projects.js:164 (22 code hits; lines 164,1669,1673,1705,1736,1737,1741,1766,1769)
  - plugin game/js/plugins/DEUS_Sheet.js:2607 (1 code hit; lines 2607)
  - plugin game/js/plugins/DEUS_Speech.js:240 (5 code hits; lines 240,362,780,1344)
  - plugin game/js/plugins/DEUS_Talk.js:114 (1 code hit; lines 114)
  - plugin game/js/plugins/DEUS_Test.js:64 (5 code hits; lines 64,65,74,543)
  - plugin game/js/plugins/DEUS_World.js:4808 (1 code hit; lines 4808)
  - plugin game/js/plugins/UF_Households.js:40 (3 code hits; lines 40)
  - plugin game/js/plugins/UF_Time.js:569 (5 code hits; lines 569,571,574,580)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:200 (9 code hits; lines 200,201,425)
  - tool tools/benchmark_performance.js:99 (2 code hits; lines 99,110)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:39 (7 code hits; lines 39,43,51,52,63)
  - tool tools/fixtures/UF_SleepRuntime.js:59 (4 code hits; lines 59,63)
  - tool tools/fixtures/UF_SocietyRuntime.js:73 (4 code hits; lines 73,122,134)
  - tool tools/fixtures/UF_ZFlora.js:15 (6 code hits; lines 15,16,113)
  - tool tools/occlusion/bench_occlusion.js:90 (6 code hits; lines 90,91)
  - tool tools/occlusion/compare_planes.js:84 (6 code hits; lines 84,85)
  - tool tools/occlusion/live_occlusion.js:87 (6 code hits; lines 87,88)
  - tool tools/smoke_19a_playtest.js:104 (14 code hits; lines 104,178,335,401,429)
  - tool tools/test_autonomous_settlement_closure.js:412 (1 code hit; lines 412)
  - tool tools/test_build_vertical.js:726 (10 code hits; lines 726,781,783)
  - tool tools/test_collapse_ingame.js:139 (11 code hits; lines 139,146,173,175)
  - tool tools/test_conditions_system.js:224 (1 code hit; lines 224)
  - tool tools/test_goals.js:99 (3 code hits; lines 99,100,106)
  - tool tools/test_layer_switch_inplace.js:140 (12 code hits; lines 140,188,273,291)
  - tool tools/test_material_refining_and_tech_pacing.js:149 (1 code hit; lines 149)
  - tool tools/test_time_domains_proof.js:60 (43 code hits; lines 60,68,71,72,73,76,77,78,97,116,124,133)
  - tool tools/zrange/zrange_suite.js:81 (18 code hits; lines 81,82,423,424,434,435)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:2186 (7); archive/plugins_uf_pre_rename/UF_Colonists.js:139 (14); archive/plugins_uf_pre_rename/UF_Combat.js:1200 (14); archive/plugins_uf_pre_rename/UF_Core.js:420 (3); archive/plugins_uf_pre_rename/UF_CultureGrowth.js:52 (3); archive/plugins_uf_pre_rename/UF_DayNight.js:155 (18); archive/plugins_uf_pre_rename/UF_Doors.js:54 (10); archive/plugins_uf_pre_rename/UF_Factions.js:1527 (1); archive/plugins_uf_pre_rename/UF_Fire.js:1178 (1); archive/plugins_uf_pre_rename/UF_FireSafety.js:28 (3); archive/plugins_uf_pre_rename/UF_Floors.js:555 (7); archive/plugins_uf_pre_rename/UF_Goals.js:40 (5); archive/plugins_uf_pre_rename/UF_History.js:3389 (4); archive/plugins_uf_pre_rename/UF_Households.js:39 (3); archive/plugins_uf_pre_rename/UF_Interact.js:1027 (4); archive/plugins_uf_pre_rename/UF_Jobs.js:97 (7); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:266 (22); archive/plugins_uf_pre_rename/UF_Ownership.js:89 (3); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:414 (1); archive/plugins_uf_pre_rename/UF_Resources.js:99 (3); archive/plugins_uf_pre_rename/UF_Sanitation.js:284 (3); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:64 (3); archive/plugins_uf_pre_rename/UF_Sheet.js:1657 (1); archive/plugins_uf_pre_rename/UF_Skills.js:907 (2); archive/plugins_uf_pre_rename/UF_Speech.js:240 (5); archive/plugins_uf_pre_rename/UF_Talk.js:114 (1); archive/plugins_uf_pre_rename/UF_Time.js:569 (5); archive/plugins_uf_pre_rename/UF_TimeSpeed.js:126 (4); archive/plugins_uf_pre_rename/UF_World.js:3345 (1); archive/plugins/DEUS_CultureGrowth.js:52 (3); archive/plugins/DEUS_FireSafety.js:28 (3); archive/plugins/DEUS_Goals.js:40 (5); archive/plugins/DEUS_Households.js:39 (3); archive/plugins/DEUS_ProfileTabs.js:414 (1); archive/plugins/DEUS_Resources.js:99 (3); archive/plugins/DEUS_Sanitation.js:284 (3); archive/plugins/DEUS_SettlementPillars.js:64 (3); archive/plugins/DEUS_Skills.js:908 (2); archive/plugins/DEUS_Time.js:569 (5)
- `Sprite_UFTimeControls` (class, this file :272):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_TimeSpeed.js:254 (3)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:196 quotes `DEUS_TimeSpeed`
- tool tools/diagnose_hotspots.js:38 quotes `DEUS_TimeSpeed.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_TimeSpeed`
- tool tools/run_all_suites.js:24 quotes `DEUS_TimeSpeed`
- archive quotes omitted from the live list (2 hits)

## DEUS_Visuals.js

Source lines: 307.
Exports:
- none assigned as UF/DEUS member or Imported flag
Engine prototype patches:
- `Game_Event.prototype.setupPage` at game/js/plugins/DEUS_Visuals.js:148
- `Game_Event.prototype.update` at game/js/plugins/DEUS_Visuals.js:161
- `Spriteset_Map.prototype.createUpperLayer` at game/js/plugins/DEUS_Visuals.js:220
- `Game_Screen.prototype.update` at game/js/plugins/DEUS_Visuals.js:247
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_Event.prototype.setupPage` saved to `_Game_Event_setupPage` at game/js/plugins/DEUS_Visuals.js:147
- `Game_Event.prototype.update` saved to `_Game_Event_update` at game/js/plugins/DEUS_Visuals.js:160
- `Spriteset_Map.prototype.createUpperLayer` saved to `_Spriteset_Map_createUpperLayer` at game/js/plugins/DEUS_Visuals.js:219
- `Game_Screen.prototype.update` saved to `_Game_Screen_update` at game/js/plugins/DEUS_Visuals.js:246
Namespace property patches:
- none
Listeners and commands:
- `registerCommand` `"Bark"` at game/js/plugins/DEUS_Visuals.js:298
Classes:
- `Sprite_UFBark` at game/js/plugins/DEUS_Visuals.js:59
- `Sprite_UFRoofBuilding` at game/js/plugins/DEUS_Visuals.js:182
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- `Sprite_UFBark` (class, this file :59):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Visuals.js:59 (2)
- `Sprite_UFRoofBuilding` (class, this file :182):
  - no live-root hit. Archive-only hits are below. Not labeled dead.
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Visuals.js:184 (2)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:23 quotes `DEUS_Visuals`
- tool tools/run_all_suites.js:24 quotes `DEUS_Visuals`
- tool tools/test_fluid_correctness_lane_cw.js:461 quotes `DEUS_Visuals`
- archive quotes omitted from the live list (2 hits)

## DEUS_Walls.js

Source lines: 387.
Exports:
- `UF.Walls` at game/js/plugins/DEUS_Walls.js:289
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Walls.js:287
- namespace object `window/root.UF` at game/js/plugins/DEUS_Walls.js:288
Engine prototype patches:
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Walls.js:293
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Walls.js:292
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `wallMaterialOf` at game/js/plugins/DEUS_Walls.js:49
- `matterNote` at game/js/plugins/DEUS_Walls.js:56
- `wallAt` at game/js/plugins/DEUS_Walls.js:73
- `ensureWall` at game/js/plugins/DEUS_Walls.js:86
- `collapse` at game/js/plugins/DEUS_Walls.js:97
- `isWallCell` at game/js/plugins/DEUS_Walls.js:101
- `maskAt` at game/js/plugins/DEUS_Walls.js:115
- `frameIndexAt` at game/js/plugins/DEUS_Walls.js:129
- `sidecarFor` at game/js/plugins/DEUS_Walls.js:154
- `sourceFrame` at game/js/plugins/DEUS_Walls.js:160
- `drawWoodFace` at game/js/plugins/DEUS_Walls.js:171
- `drawStoneFace` at game/js/plugins/DEUS_Walls.js:182
- `twoSquareBitmap` at game/js/plugins/DEUS_Walls.js:193
- `visualCells` at game/js/plugins/DEUS_Walls.js:209
- `baseAt` at game/js/plugins/DEUS_Walls.js:213
- `patchObjectLayer` at game/js/plugins/DEUS_Walls.js:227
- `registerChecks` at game/js/plugins/DEUS_Walls.js:299
Named consumers outside this file:
- `UF.Walls` (export, this file :289):
  - plugin game/js/plugins/DEUS_Objects.js:413 (3 code hits; lines 413,414)
  - tool tools/sim/test_living_world_rules.js:585 (1 code hit; lines 585)
  - tool tools/test_z_walls.js:25 (1 code hit; lines 25)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Walls.js:242 (1)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:103 quotes `DEUS_Walls`
- tool tools/performance/census_boot_load.js:71 quotes `DEUS_Walls.js`
- tool tools/sim/test_living_world_rules.js:584 quotes `DEUS_Walls.js`
- tool tools/sim/test_reclaim.js:368 quotes `DEUS_Walls.js`
- tool tools/test_walls_ingame.js:23 quotes `DEUS_Walls.js`
- tool tools/test_z_walls.js:23 quotes `DEUS_Walls.js`
- tool tools/zrange/scan_z_literals.js:22 quotes `DEUS_Walls`
- archive quotes omitted from the live list (2 hits)

## DEUS_Wildlife.js

Source lines: 2900.
Exports:
- `UF.ECS` at game/js/plugins/DEUS_Wildlife.js:80 fallback (`||`)
- `UF.Wildlife` at game/js/plugins/DEUS_Wildlife.js:2323
- namespace object `window/root.UF` at game/js/plugins/DEUS_Wildlife.js:79
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_Wildlife.js:2321
- namespace object `window/root.UF` at game/js/plugins/DEUS_Wildlife.js:2322
Engine prototype patches:
- `Game_Map.prototype.update` at game/js/plugins/DEUS_Wildlife.js:1621
- `Sprite_Character.prototype.update` at game/js/plugins/DEUS_Wildlife.js:1630
- `Game_Event.prototype.isThrough` at game/js/plugins/DEUS_Wildlife.js:1639
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_Wildlife.js:2377
Engine object patches (not prototype):
- `DataManager.makeSaveContents` at game/js/plugins/DEUS_Wildlife.js:2352
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_Wildlife.js:2358
Engine members read or saved:
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_Wildlife.js:1620
- `Sprite_Character.prototype.update` saved to `_Sprite_Character_update` at game/js/plugins/DEUS_Wildlife.js:1629
- `Game_Event.prototype.isThrough` saved to `_Game_Event_isThrough` at game/js/plugins/DEUS_Wildlife.js:1638
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_Wildlife.js:2376
- `DataManager.makeSaveContents` saved to `_DataManager_makeSaveContents` at game/js/plugins/DEUS_Wildlife.js:2351
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_Wildlife.js:2357
- `Graphics.frameCount` saved to `f0` at game/js/plugins/DEUS_Wildlife.js:2624
- `Graphics.frameCount` saved to `fr0` at game/js/plugins/DEUS_Wildlife.js:2657
Namespace property patches:
- none
Listeners and commands:
- `on` `"world:created"` at game/js/plugins/DEUS_Wildlife.js:2327
- `on` `"combat:kill"` at game/js/plugins/DEUS_Wildlife.js:2328
- `on` `"world:unitAdded"` at game/js/plugins/DEUS_Wildlife.js:2334
- `on` `"world:unitRemoved"` at game/js/plugins/DEUS_Wildlife.js:2341
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `fnv` at game/js/plugins/DEUS_Wildlife.js:123
- `mix32` at game/js/plugins/DEUS_Wildlife.js:132
- `hash32` at game/js/plugins/DEUS_Wildlife.js:137
- `mulberry32` at game/js/plugins/DEUS_Wildlife.js:147
- `rngNext` at game/js/plugins/DEUS_Wildlife.js:157
- `speciesList` at game/js/plugins/DEUS_Wildlife.js:169
- `tierIndex` at game/js/plugins/DEUS_Wildlife.js:192
- `tierMap` at game/js/plugins/DEUS_Wildlife.js:199
- `allowedInRegion` at game/js/plugins/DEUS_Wildlife.js:208
- `herdScale` at game/js/plugins/DEUS_Wildlife.js:217
- `worldDims` at game/js/plugins/DEUS_Wildlife.js:231
- `kitConfig` at game/js/plugins/DEUS_Wildlife.js:245
- `campsOf` at game/js/plugins/DEUS_Wildlife.js:257
- `campRuleOk` at game/js/plugins/DEUS_Wildlife.js:266
- `cellOk` at game/js/plugins/DEUS_Wildlife.js:280
- `areaSample` at game/js/plugins/DEUS_Wildlife.js:298
- `expectedHerds` at game/js/plugins/DEUS_Wildlife.js:333
- `findHerdCenter` at game/js/plugins/DEUS_Wildlife.js:349
- `makeHerd` at game/js/plugins/DEUS_Wildlife.js:361
- `planArea` at game/js/plugins/DEUS_Wildlife.js:379
- `planKit` at game/js/plugins/DEUS_Wildlife.js:411
- `planLairs` at game/js/plugins/DEUS_Wildlife.js:469
- `planUnderground` at game/js/plugins/DEUS_Wildlife.js:508
- `planWorld` at game/js/plugins/DEUS_Wildlife.js:579
- `unitSpec` at game/js/plugins/DEUS_Wildlife.js:598
- `spawnWorld` at game/js/plugins/DEUS_Wildlife.js:618
- `withdrawnFromWild` at game/js/plugins/DEUS_Wildlife.js:690
- `sameTamingOwner` at game/js/plugins/DEUS_Wildlife.js:694
- `tamingMod` at game/js/plugins/DEUS_Wildlife.js:702
- `currentDayPhase` at game/js/plugins/DEUS_Wildlife.js:752
- `shouldSleep` at game/js/plugins/DEUS_Wildlife.js:758
- `cellGroundAndBiome` at game/js/plugins/DEUS_Wildlife.js:785
- `cellFill` at game/js/plugins/DEUS_Wildlife.js:791
- `allowedCell` at game/js/plugins/DEUS_Wildlife.js:799
- `isVegetationAt` at game/js/plugins/DEUS_Wildlife.js:810
- `hasJob` at game/js/plugins/DEUS_Wildlife.js:825
- `eventAtNt` at game/js/plugins/DEUS_Wildlife.js:832
- `walkableFor` at game/js/plugins/DEUS_Wildlife.js:843
- `alarmedWithin` at game/js/plugins/DEUS_Wildlife.js:893
- `calmedAfter` at game/js/plugins/DEUS_Wildlife.js:897
- 77 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.ECS` (export, this file :80): Also assigned or declared in game/js/plugins/DEUS_Colonists.js:48 fallback. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Colonists.js:48 (28 code hits; lines 48,62,69,70,71,72,73,1605,1637,1703,2030,2172)
- `UF.Wildlife` (export, this file :2323):
  - plugin game/js/plugins/DEUS_Anim.js:1450 (1 code hit; lines 1450)
  - plugin game/js/plugins/DEUS_Colonists.js:1363 (1 code hit; lines 1363)
  - plugin game/js/plugins/DEUS_Ecology.js:64 (1 code hit; lines 64)
  - plugin game/js/plugins/DEUS_Taming.js:102 (1 code hit; lines 102)
  - plugin game/js/plugins/DEUS_Test.js:657 (1 code hit; lines 657)
  - tool tools/sim/test_wildlife_rules_damage.js:218 (1 code hit; lines 218)
  - tool tools/taming/test_taming.js:572 (2 code hits; lines 572,643)
  - tool tools/test_ecology.js:220 (1 code hit; lines 220)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:1436 (1); archive/plugins_uf_pre_rename/UF_Colonists.js:1237 (1); archive/plugins_uf_pre_rename/UF_Ecology.js:64 (1); archive/plugins_uf_pre_rename/UF_Goals.js:194 (6); archive/plugins_uf_pre_rename/UF_Wildlife.js:1307 (1); archive/plugins/DEUS_Goals.js:194 (6)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:151 quotes `DEUS_Wildlife`
- tool tools/diagnose_hotspots.js:33 quotes `DEUS_Wildlife.js`
- tool tools/profile_live_frames.js:344 quotes `DEUS_Wildlife.js`
- tool tools/register_world_plugins.js:15 quotes `DEUS_Wildlife`
- tool tools/run_all_suites.js:24 quotes `DEUS_Wildlife`
- tool tools/sim/test_wildlife_rules_damage.js:15 quotes `DEUS_Wildlife.js`
- tool tools/taming/test_taming.js:17 quotes `DEUS_Wildlife.js`
- tool tools/test_creatures_ingame.js:44 quotes `DEUS_Wildlife.js`
- tool tools/test_d20_equipment_slots.js:129 quotes `DEUS_Wildlife.js`
- tool tools/zrange/scan_z_literals.js:21 quotes `DEUS_Wildlife`
- archive quotes omitted from the live list (2 hits)

## DEUS_World.js

Source lines: 5062.
Exports:
- `UF.World` at game/js/plugins/DEUS_World.js:469
- `UF.Space` at game/js/plugins/DEUS_World.js:470
- `UF.Sim` at game/js/plugins/DEUS_World.js:718 fallback (`||`)
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_World.js:467
- namespace object `window/root.UF` at game/js/plugins/DEUS_World.js:468
Engine prototype patches:
- `Uint16Array.prototype.toJSON` at game/js/plugins/DEUS_World.js:133
- `Float32Array.prototype.toJSON` at game/js/plugins/DEUS_World.js:134
- `Int32Array.prototype.toJSON` at game/js/plugins/DEUS_World.js:135
- `Uint8Array.prototype.toJSON` at game/js/plugins/DEUS_World.js:136
- `Game_Player.prototype.moveStraight` at game/js/plugins/DEUS_World.js:3708
- `Game_Player.prototype.moveDiagonally` at game/js/plugins/DEUS_World.js:3714
- `Game_Player.prototype.performTransfer` at game/js/plugins/DEUS_World.js:3720
- `Game_Event.prototype.isCollidedWithEvents` at game/js/plugins/DEUS_World.js:3730
- `Game_Event.prototype.isCollidedWithPlayerCharacters` at game/js/plugins/DEUS_World.js:3743
- `Game_Player.prototype.isCollidedWithEvents` at game/js/plugins/DEUS_World.js:3750
- `Scene_Map.prototype.isReady` at game/js/plugins/DEUS_World.js:3808
- `Spriteset_Map.prototype.createTilemap` at game/js/plugins/DEUS_World.js:3819
- `Game_Player.prototype.setupForNewGame` at game/js/plugins/DEUS_World.js:3836
- `Game_Map.prototype.setup` at game/js/plugins/DEUS_World.js:3918
- `Game_Map.prototype.update` at game/js/plugins/DEUS_World.js:3930
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_World.js:3939
Engine object patches (not prototype):
- `DataManager.loadMapData` at game/js/plugins/DEUS_World.js:3775
- `DataManager.createGameObjects` at game/js/plugins/DEUS_World.js:3825
- `DataManager.makeSaveContents` at game/js/plugins/DEUS_World.js:3876
- `DataManager.extractSaveContents` at game/js/plugins/DEUS_World.js:3884
Engine members read or saved:
- `Game_Player.prototype.moveStraight` saved to `_Game_Player_moveStraight` at game/js/plugins/DEUS_World.js:3707
- `Game_Player.prototype.moveDiagonally` saved to `_Game_Player_moveDiagonally` at game/js/plugins/DEUS_World.js:3713
- `Game_Player.prototype.performTransfer` saved to `_Game_Player_performTransfer` at game/js/plugins/DEUS_World.js:3719
- `Game_Event.prototype.isCollidedWithEvents` saved to `_Game_Event_isCollidedWithEvents` at game/js/plugins/DEUS_World.js:3729
- `Game_Event.prototype.isCollidedWithPlayerCharacters` saved to `_Game_Event_isCollidedWithPlayerCharacters` at game/js/plugins/DEUS_World.js:3742
- `Scene_Map.prototype.isReady` saved to `_Scene_Map_isReady` at game/js/plugins/DEUS_World.js:3807
- `Spriteset_Map.prototype.createTilemap` saved to `_Spriteset_Map_createTilemap` at game/js/plugins/DEUS_World.js:3818
- `Game_Player.prototype.setupForNewGame` saved to `_Game_Player_setupForNewGame` at game/js/plugins/DEUS_World.js:3835
- `Game_Map.prototype.setup` saved to `_Game_Map_setup` at game/js/plugins/DEUS_World.js:3917
- `Game_Map.prototype.update` saved to `_Game_Map_update` at game/js/plugins/DEUS_World.js:3929
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_World.js:3938
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_World.js:1347
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_World.js:1671
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_World.js:1685
- `SceneManager._scene` saved to `scene` at game/js/plugins/DEUS_World.js:3589
- `DataManager.loadMapData` saved to `_DataManager_loadMapData` at game/js/plugins/DEUS_World.js:3774
- `DataManager.createGameObjects` saved to `_DataManager_createGameObjects` at game/js/plugins/DEUS_World.js:3824
- `DataManager.makeSaveContents` saved to `_DataManager_makeSaveContents` at game/js/plugins/DEUS_World.js:3875
- `DataManager.extractSaveContents` saved to `_DataManager_extractSaveContents` at game/js/plugins/DEUS_World.js:3883
- `Graphics.frameCount` saved to `f0` at game/js/plugins/DEUS_World.js:4069
- `Graphics.frameCount` saved to `f0` at game/js/plugins/DEUS_World.js:4305
- `Graphics.frameCount` saved to `fD` at game/js/plugins/DEUS_World.js:4387
Namespace property patches:
- none
Listeners and commands:
- `on` `"time:minute"` at game/js/plugins/DEUS_World.js:785
- `on` `"time:hour"` at game/js/plugins/DEUS_World.js:1860
- `on` `"colonists:exhaustion"` at game/js/plugins/DEUS_World.js:1861
- `on` `"condition:applied"` at game/js/plugins/DEUS_World.js:1862
- `on` `"condition:removed"` at game/js/plugins/DEUS_World.js:1863
- `on` `"condition:stood_up"` at game/js/plugins/DEUS_World.js:1864
- `on` `"condition:cleared"` at game/js/plugins/DEUS_World.js:1865
- `on` `"world:unitBlocked"` at game/js/plugins/DEUS_World.js:4237
- `on` `"world:unitAdded"` at game/js/plugins/DEUS_World.js:4816
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `checkZRange` at game/js/plugins/DEUS_World.js:184
- `parseZRange` at game/js/plugins/DEUS_World.js:190
- `newWorldZRange` at game/js/plugins/DEUS_World.js:198
- `zResync` at game/js/plugins/DEUS_World.js:213
- `hash32` at game/js/plugins/DEUS_World.js:281
- `mulberry32` at game/js/plugins/DEUS_World.js:298
- `makeEventData` at game/js/plugins/DEUS_World.js:311
- `chunkLayout` at game/js/plugins/DEUS_World.js:487
- `liveChunkState` at game/js/plugins/DEUS_World.js:501
- `resetChunkState` at game/js/plugins/DEUS_World.js:510
- `layoutNow` at game/js/plugins/DEUS_World.js:515
- `chunkInside` at game/js/plugins/DEUS_World.js:519
- `chunkAt` at game/js/plugins/DEUS_World.js:522
- `areaChunkBox` at game/js/plugins/DEUS_World.js:525
- `markChunkTerrain` at game/js/plugins/DEUS_World.js:534
- `ensureChunkTerrain` at game/js/plugins/DEUS_World.js:542
- `isFaunaSpec` at game/js/plugins/DEUS_World.js:627
- `acceptFauna` at game/js/plugins/DEUS_World.js:632
- `simHost` at game/js/plugins/DEUS_World.js:650
- `simResolve` at game/js/plugins/DEUS_World.js:662
- `simRequire` at game/js/plugins/DEUS_World.js:692
- `registerMatterOpener` at game/js/plugins/DEUS_World.js:705
- `matterOpeners` at game/js/plugins/DEUS_World.js:712
- `simTickModule` at game/js/plugins/DEUS_World.js:734
- `simAbsMinute` at game/js/plugins/DEUS_World.js:736
- `armSimClock` at game/js/plugins/DEUS_World.js:741
- `runSimTicks` at game/js/plugins/DEUS_World.js:746
- `onSimMinute` at game/js/plugins/DEUS_World.js:759
- `onTick` at game/js/plugins/DEUS_World.js:766
- `tickCount` at game/js/plugins/DEUS_World.js:775
- `tickStats` at game/js/plugins/DEUS_World.js:777
- `fieldModule` at game/js/plugins/DEUS_World.js:1067
- `stopFieldPool` at game/js/plugins/DEUS_World.js:1084
- `onFieldMessage` at game/js/plugins/DEUS_World.js:1088
- `fieldWorkers` at game/js/plugins/DEUS_World.js:1100
- `fieldJob` at game/js/plugins/DEUS_World.js:1127
- `finishFieldJob` at game/js/plugins/DEUS_World.js:1153
- `patchTile` at game/js/plugins/DEUS_World.js:1340
- `pinView` at game/js/plugins/DEUS_World.js:1525
- `preloadImages` at game/js/plugins/DEUS_World.js:1534
- 55 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.World` (export, this file :469): Also assigned or declared in game/js/plugins/DEUS_CellularFluids.js:14 fallback. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Anim.js:118 (2 code hits; lines 118,1833)
  - plugin game/js/plugins/DEUS_Bag.js:38 (2 code hits; lines 38)
  - plugin game/js/plugins/DEUS_Camera.js:561 (8 code hits; lines 561,562)
  - plugin game/js/plugins/DEUS_CellularFluids.js:14 (6 code hits; lines 14,17,18,22,30)
  - plugin game/js/plugins/DEUS_Colonists.js:110 (2 code hits; lines 110,5899)
  - plugin game/js/plugins/DEUS_ColonyOverseer.js:64 (1 code hit; lines 64)
  - plugin game/js/plugins/DEUS_Combat.js:125 (5 code hits; lines 125,137,2552)
  - plugin game/js/plugins/DEUS_Conditions.js:76 (7 code hits; lines 76,267,351)
  - plugin game/js/plugins/DEUS_Containers.js:52 (1 code hit; lines 52)
  - plugin game/js/plugins/DEUS_Culling.js:295 (1 code hit; lines 295)
  - plugin game/js/plugins/DEUS_DayNight.js:69 (4 code hits; lines 69,230,343,513)
  - plugin game/js/plugins/DEUS_DeathForensics.js:56 (4 code hits; lines 56,301)
  - plugin game/js/plugins/DEUS_Depth.js:80 (1 code hit; lines 80)
  - plugin game/js/plugins/DEUS_Doors.js:36 (1 code hit; lines 36)
  - plugin game/js/plugins/DEUS_Ecology.js:62 (5 code hits; lines 62,1011,1039)
  - plugin game/js/plugins/DEUS_Environment.js:60 (1 code hit; lines 60)
  - plugin game/js/plugins/DEUS_FactionMenus.js:122 (20 code hits; lines 122,123,473,518,1333,1334,1841,1845,1846)
  - plugin game/js/plugins/DEUS_Factions.js:288 (10 code hits; lines 288,525,586,636,768,965,1491,1492)
  - plugin game/js/plugins/DEUS_Fire.js:79 (2 code hits; lines 79,1397)
  - plugin game/js/plugins/DEUS_Floors.js:38 (1 code hit; lines 38)
  - plugin game/js/plugins/DEUS_Fluid.js:222 (2 code hits; lines 222,346)
  - plugin game/js/plugins/DEUS_Fog.js:92 (11 code hits; lines 92,110,119,166,323,415,446,473)
  - plugin game/js/plugins/DEUS_Generator.js:219 (6 code hits; lines 219,249,250)
  - plugin game/js/plugins/DEUS_HistoricalDemographics.js:25 (9 code hits; lines 25,34,218,225)
  - plugin game/js/plugins/DEUS_History.js:206 (38 code hits; lines 206,230,401,428,432,445,603,604,652,899,1165,1683)
  - plugin game/js/plugins/DEUS_Interact.js:99 (1 code hit; lines 99)
  - plugin game/js/plugins/DEUS_Items.js:79 (2 code hits; lines 79,1605)
  - plugin game/js/plugins/DEUS_Jobs.js:70 (2 code hits; lines 70,2102)
  - plugin game/js/plugins/DEUS_Levels.js:72 (2 code hits; lines 72,285)
  - plugin game/js/plugins/DEUS_Look.js:58 (1 code hit; lines 58)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:35 (1 code hit; lines 35)
  - plugin game/js/plugins/DEUS_Objects.js:62 (2 code hits; lines 62,1277)
  - plugin game/js/plugins/DEUS_Ownership.js:55 (2 code hits; lines 55,642)
  - plugin game/js/plugins/DEUS_Projects.js:149 (3 code hits; lines 149,1629,1700)
  - plugin game/js/plugins/DEUS_Select.js:370 (1 code hit; lines 370)
  - plugin game/js/plugins/DEUS_Sheet.js:200 (1 code hit; lines 200)
  - plugin game/js/plugins/DEUS_Speech.js:163 (3 code hits; lines 163)
  - plugin game/js/plugins/DEUS_Stance.js:166 (12 code hits; lines 166,176,397,398,596,597,673)
  - plugin game/js/plugins/DEUS_Stockpiles.js:77 (1 code hit; lines 77)
  - plugin game/js/plugins/DEUS_Structural.js:179 (9 code hits; lines 179,259,280,346,396,410,417,641)
  - plugin game/js/plugins/DEUS_Talk.js:108 (1 code hit; lines 108)
  - plugin game/js/plugins/DEUS_Taming.js:114 (2 code hits; lines 114,129)
  - plugin game/js/plugins/DEUS_Test.js:364 (3 code hits; lines 364,448,542)
  - plugin game/js/plugins/DEUS_Tiles.js:556 (17 code hits; lines 556,1248,1249,1250,1255,1256,1257,1258,1337,1338,1348,1418)
  - plugin game/js/plugins/DEUS_TimeSpeed.js:466 (9 code hits; lines 466,467,472,473,474,475,552)
  - plugin game/js/plugins/DEUS_Walls.js:44 (1 code hit; lines 44)
  - plugin game/js/plugins/DEUS_Wildlife.js:91 (1 code hit; lines 91)
  - plugin game/js/plugins/DEUS_WorldGen.js:148 (62 code hits; lines 148,251,485,494,721,851,873,882,893,894,920,922)
  - plugin game/js/plugins/test_build_vertical_ingame.js:13 (1 code hit; lines 13)
  - plugin game/js/plugins/UF_Households.js:23 (1 code hit; lines 23)
  - tool tools/art/test_multi_variant_topology.js:219 (2 code hits; lines 219,234)
  - tool tools/bench_history_sim.js:119 (1 code hit; lines 119)
  - tool tools/bench_vertical_worldgen.js:281 (2 code hits; lines 281,328)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:121 (2 code hits; lines 121,185)
  - tool tools/benchmark_performance.js:49 (1 code hit; lines 49)
  - tool tools/capture_pre_migration_baseline.js:129 (1 code hit; lines 129)
  - tool tools/check_120.js:14 (1 code hit; lines 14)
  - tool tools/dev/sim_forward.js:183 (1 code hit; lines 183)
  - tool tools/fixtures/UF_CapturePreVertical.js:12 (3 code hits; lines 12,13,18)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:10 (3 code hits; lines 10,15)
  - tool tools/fixtures/UF_SleepRuntime.js:11 (3 code hits; lines 11,12,17)
  - tool tools/fixtures/UF_SocietyRuntime.js:11 (3 code hits; lines 11,12,17)
  - tool tools/fixtures/UF_ZFlora.js:14 (1 code hit; lines 14)
  - tool tools/fixtures/UF_ZIntegration.js:14 (1 code hit; lines 14)
  - tool tools/fixtures/UF_ZZ_OldSaveFixture.js:45 (1 code hit; lines 45)
  - tool tools/inspect_65_40_sim.js:48 (1 code hit; lines 48)
  - tool tools/inspect_65_40.js:27 (1 code hit; lines 27)
  - tool tools/inspect_border_tiles.js:47 (1 code hit; lines 47)
  - tool tools/occlusion/bench_occlusion.js:85 (3 code hits; lines 85,87)
  - tool tools/occlusion/compare_planes.js:81 (3 code hits; lines 81,83)
  - tool tools/occlusion/live_occlusion.js:84 (3 code hits; lines 84,86)
  - tool tools/rules/test_srd_rules.js:656 (3 code hits; lines 656,671,673)
  - tool tools/sim/test_fluid_attach.js:268 (2 code hits; lines 268,273)
  - tool tools/sim/test_living_world_rules.js:170 (3 code hits; lines 170,362,770)
  - tool tools/sim/test_sim_forward_guard.js:166 (1 code hit; lines 166)
  - tool tools/sim/test_underground_year0.js:96 (5 code hits; lines 96,99,100)
  - tool tools/sim/test_wildlife_rules_damage.js:168 (1 code hit; lines 168)
  - tool tools/smoke_19a_playtest.js:41 (1 code hit; lines 41)
  - tool tools/society/test_person_identity.js:450 (3 code hits; lines 450,485,494)
  - tool tools/taming_party/test_tamed_party_combat.js:632 (8 code hits; lines 632,647,704,705,839,840,853,854)
  - tool tools/taming/test_taming.js:639 (2 code hits; lines 639,663)
  - tool tools/test_19b_performance_determinism.js:125 (5 code hits; lines 125,140,172,203,217)
  - tool tools/test_32_levels_generation.js:108 (1 code hit; lines 108)
  - tool tools/test_area_generation_speed.js:155 (1 code hit; lines 155)
  - tool tools/test_bag_and_racial_banners.js:152 (2 code hits; lines 152,192)
  - tool tools/test_build_vertical.js:288 (5 code hits; lines 288,359,676)
  - tool tools/test_callings_system.js:292 (1 code hit; lines 292)
  - tool tools/test_collapse_ingame.js:72 (1 code hit; lines 72)
  - tool tools/test_column_landforms.js:195 (1 code hit; lines 195)
  - tool tools/test_combat_dying_integration.js:161 (2 code hits; lines 161,184)
  - tool tools/test_conditions_system.js:225 (1 code hit; lines 225)
  - tool tools/test_creature_inventory_black_box.js:158 (4 code hits; lines 158,173,178,184)
  - tool tools/test_d20_equipment_slots.js:169 (5 code hits; lines 169,170,183,244,297)
  - tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:220 (13 code hits; lines 220,221,246,248,249,301,302,304,305,321,322,327)
  - tool tools/test_duplicate_registration.js:174 (1 code hit; lines 174)
  - tool tools/test_ecology.js:53 (2 code hits; lines 53,219)
  - tool tools/test_equipment_drag.js:107 (1 code hit; lines 107)
  - tool tools/test_faction_founder_pairbonding.js:171 (1 code hit; lines 171)
  - tool tools/test_faction_reproduction.js:257 (1 code hit; lines 257)
  - tool tools/test_faction_starting_gear.js:145 (1 code hit; lines 145)
  - tool tools/test_generated_z2_cut_proof.js:370 (2 code hits; lines 370,371)
  - tool tools/test_geology_strata.js:204 (3 code hits; lines 204,216,294)
  - tool tools/test_hist_metadata_contracts.js:44 (1 code hit; lines 44)
  - tool tools/test_historical_carrying_capacity.js:154 (5 code hits; lines 154,191,461)
  - tool tools/test_history_materialization_and_world_age.js:104 (3 code hits; lines 104,155,171)
  - tool tools/test_layer_switch_inplace.js:120 (1 code hit; lines 120)
  - tool tools/test_lazy_area_generation.js:207 (22 code hits; lines 207,342,362,381,396,414,416,423,424,438,439,471)
  - tool tools/test_liquid_depth_simulation.js:132 (1 code hit; lines 132)
  - tool tools/test_material_refining_and_tech_pacing.js:141 (9 code hits; lines 141,164,216,232,243,298,309,312,313)
  - tool tools/test_native_survival_soak.js:248 (1 code hit; lines 248)
  - tool tools/test_natural_connections_no_mint.js:188 (4 code hits; lines 188,331,341,351)
  - tool tools/test_new_game_year0.js:347 (1 code hit; lines 347)
  - tool tools/test_physical_inventory_proof.js:102 (1 code hit; lines 102)
  - tool tools/test_production_history_demographics.js:124 (2 code hits; lines 124,295)
  - tool tools/test_profile_tabs.js:132 (1 code hit; lines 132)
  - tool tools/test_region_seam_continuity.js:221 (2 code hits; lines 221,242)
  - tool tools/test_regrowth_construction_guard.js:191 (3 code hits; lines 191,219,224)
  - tool tools/test_round_world.js:184 (1 code hit; lines 184)
  - tool tools/test_seamless_map_edges.js:158 (1 code hit; lines 158)
  - tool tools/test_sim_loader.js:265 (2 code hits; lines 265)
  - tool tools/test_sim_tick.js:166 (3 code hits; lines 166,231,378)
  - tool tools/test_sparse_outer_save.js:170 (3 code hits; lines 170,191,209)
  - tool tools/test_srd_combat_proof.js:124 (7 code hits; lines 124,195,196,250,349,350,368)
  - tool tools/test_starter_kit_and_stockpile.js:65 (1 code hit; lines 65)
  - tool tools/test_stockpiles_designation.js:54 (3 code hits; lines 54,55,175)
  - tool tools/test_strata_cuts_and_caves.js:322 (14 code hits; lines 322,336,347,454,455,458,493,547,563,564,609,907)
  - tool tools/test_strata_fluid_reconciliation.js:150 (1 code hit; lines 150)
  - tool tools/test_strata_foundation.js:266 (10 code hits; lines 266,289,301,305,311,315,367,372,373,919)
  - tool tools/test_structural_levels.js:713 (8 code hits; lines 713,807,812,834,838)
  - tool tools/test_structural_runtime.js:297 (4 code hits; lines 297,384)
  - tool tools/test_structure_fluid.js:183 (5 code hits; lines 183,298,302)
  - tool tools/test_survival_regressions.js:287 (6 code hits; lines 287,372,439,517,603,667)
  - tool tools/test_unified_capability_proof.js:101 (1 code hit; lines 101)
  - tool tools/test_upper_elevation_terrain.js:112 (1 code hit; lines 112)
  - tool tools/test_volumetric_terrain_column.js:264 (1 code hit; lines 264)
  - tool tools/test_worldgen_quickfixes.js:56 (1 code hit; lines 56)
  - tool tools/worldgen/test_vertical_biome_coupling.js:129 (6 code hits; lines 129,148,205,243,266,319)
  - tool tools/zrange/bench_queries.js:88 (1 code hit; lines 88)
  - tool tools/zrange/test_switch_depth2.js:100 (5 code hits; lines 100,104,124)
  - tool tools/zrange/zrange_suite.js:52 (1 code hit; lines 52)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:28 (1); archive/plugins_uf_pre_rename/UF_Anim.js:108 (2); archive/plugins_uf_pre_rename/UF_Camera.js:177 (7); archive/plugins_uf_pre_rename/UF_Colonists.js:73 (2); archive/plugins_uf_pre_rename/UF_ColonyOverseer.js:58 (1); archive/plugins_uf_pre_rename/UF_Combat.js:96 (2); archive/plugins_uf_pre_rename/UF_Construction.js:36 (1); archive/plugins_uf_pre_rename/UF_Containers.js:52 (1); archive/plugins_uf_pre_rename/UF_CultureGrowth.js:30 (1); archive/plugins_uf_pre_rename/UF_DayNight.js:69 (4); archive/plugins_uf_pre_rename/UF_Doors.js:36 (1); archive/plugins_uf_pre_rename/UF_Ecology.js:62 (5); archive/plugins_uf_pre_rename/UF_Environment.js:58 (1); archive/plugins_uf_pre_rename/UF_FactionMenus.js:123 (11); archive/plugins_uf_pre_rename/UF_Factions.js:306 (10); archive/plugins_uf_pre_rename/UF_FarmView.js:18 (1); archive/plugins_uf_pre_rename/UF_Fire.js:62 (2); archive/plugins_uf_pre_rename/UF_FireSafety.js:21 (1); archive/plugins_uf_pre_rename/UF_Floors.js:38 (1); archive/plugins_uf_pre_rename/UF_Fog.js:92 (11); archive/plugins_uf_pre_rename/UF_Generator.js:219 (6); archive/plugins_uf_pre_rename/UF_Goals.js:21 (1); archive/plugins_uf_pre_rename/UF_History.js:151 (35); archive/plugins_uf_pre_rename/UF_Households.js:26 (1); archive/plugins_uf_pre_rename/UF_Interact.js:97 (1); archive/plugins_uf_pre_rename/UF_Items.js:52 (2); archive/plugins_uf_pre_rename/UF_Jobs.js:68 (2); archive/plugins_uf_pre_rename/UF_Levels.js:129 (1); archive/plugins_uf_pre_rename/UF_Look.js:58 (1); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:33 (1); archive/plugins_uf_pre_rename/UF_Objects.js:55 (2); archive/plugins_uf_pre_rename/UF_Outposts.js:53 (1); archive/plugins_uf_pre_rename/UF_Ownership.js:55 (2); archive/plugins_uf_pre_rename/UF_Proficiency.js:52 (1); archive/plugins_uf_pre_rename/UF_Resources.js:48 (1); archive/plugins_uf_pre_rename/UF_Roads.js:55 (3); archive/plugins_uf_pre_rename/UF_Sanitation.js:12 (1); archive/plugins_uf_pre_rename/UF_Select.js:111 (1); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:54 (1); archive/plugins_uf_pre_rename/UF_Sheet.js:104 (1); archive/plugins_uf_pre_rename/UF_Skills.js:57 (2); archive/plugins_uf_pre_rename/UF_Speech.js:163 (3); archive/plugins_uf_pre_rename/UF_Stance.js:163 (12); archive/plugins_uf_pre_rename/UF_Talk.js:108 (1); archive/plugins_uf_pre_rename/UF_Tiles.js:544 (17); archive/plugins_uf_pre_rename/UF_TimeSpeed.js:430 (9); archive/plugins_uf_pre_rename/UF_Walls.js:44 (1); archive/plugins_uf_pre_rename/UF_Wildlife.js:57 (1); archive/plugins_uf_pre_rename/UF_World.js:350 (1); archive/plugins_uf_pre_rename/UF_WorldGen.js:130 (34); archive/plugins/DEUS_Agriculture.js:28 (1); archive/plugins/DEUS_Construction.js:36 (1); archive/plugins/DEUS_Containers.js:52 (1); archive/plugins/DEUS_CultureGrowth.js:30 (1); archive/plugins/DEUS_FarmView.js:19 (1); archive/plugins/DEUS_FireSafety.js:21 (1); archive/plugins/DEUS_Goals.js:21 (1); archive/plugins/DEUS_Households.js:26 (1); archive/plugins/DEUS_Outposts.js:53 (1); archive/plugins/DEUS_Proficiency.js:52 (1); archive/plugins/DEUS_Resources.js:48 (1); archive/plugins/DEUS_Roads.js:55 (3); archive/plugins/DEUS_Sanitation.js:12 (1); archive/plugins/DEUS_Select.js:111 (1); archive/plugins/DEUS_SettlementPillars.js:54 (1); archive/plugins/DEUS_Skills.js:57 (2)
- `UF.Space` (export, this file :470):
  - plugin game/js/plugins/DEUS_Colonists.js:170 (1 code hit; lines 170)
  - plugin game/js/plugins/DEUS_Combat.js:130 (1 code hit; lines 130)
  - plugin game/js/plugins/DEUS_Levels.js:1340 (2 code hits; lines 1340)
  - tool tools/taming_party/test_tamed_party_combat.js:609 (1 code hit; lines 609)
  - tool tools/test_geology_strata.js:218 (2 code hits; lines 218)
  - tool tools/test_srd_combat_proof.js:89 (1 code hit; lines 89)
  - tool tools/test_srd_equipment_proof.js:13 (2 code hits; lines 13,25)
  - tool tools/test_srd_rules_proof.js:14 (1 code hit; lines 14)
  - tool tools/test_strata_foundation.js:318 (4 code hits; lines 318,367)
  - tool tools/zrange/zrange_suite.js:274 (1 code hit; lines 274)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:123 (1); archive/plugins_uf_pre_rename/UF_Combat.js:101 (1); archive/plugins_uf_pre_rename/UF_Rules.js:50 (1); archive/plugins_uf_pre_rename/UF_World.js:351 (1); archive/plugins/DEUS_Rules.js:50 (1)
- `UF.Sim` (export, this file :718):
  - plugin game/js/plugins/DEUS_Jobs.js:1964 (6 code hits; lines 1964,1967,2006)
  - plugin game/js/plugins/DEUS_Structural.js:92 (7 code hits; lines 92,147,773)
  - plugin game/js/plugins/DEUS_WorldGen.js:827 (3 code hits; lines 827,828)
  - plugin game/js/plugins/test_build_vertical_ingame.js:10 (1 code hit; lines 10)
  - tool tools/test_build_vertical.js:321 (6 code hits; lines 321,326,332,686)
  - tool tools/test_collapse_ingame.js:80 (3 code hits; lines 80)
  - tool tools/test_lazy_area_generation.js:739 (3 code hits; lines 739)
  - tool tools/test_sim_loader.js:158 (4 code hits; lines 158,174,185,239)
  - tool tools/test_sim_tick.js:140 (6 code hits; lines 140,228,233,236)
  - tool tools/test_structural_runtime.js:278 (14 code hits; lines 278,279,332,339,343,348,435,437,438,517,522,523)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:67 quotes `DEUS_World`
- tool tools/bench_vertical_worldgen.js:156 quotes `DEUS_World`
- tool tools/capture_pre_migration_baseline.js:114 quotes `DEUS_World.js`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_World`
- tool tools/diagnose_hotspots.js:30 quotes `DEUS_World.js`
- tool tools/lib/vm_sim_require.js:38 quotes `DEUS_World`
- tool tools/performance/census_boot_load.js:65 quotes `DEUS_World.js`
- tool tools/register_world_plugins.js:14 quotes `DEUS_World`
- tool tools/run_all_suites.js:23 quotes `DEUS_World`
- tool tools/sim/test_living_world_rules.js:168 quotes `DEUS_World.js`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_World`
- tool tools/sim/test_underground_year0.js:30 quotes `DEUS_World`
- tool tools/society/test_person_identity.js:31 quotes `DEUS_World`
- tool tools/test_19b_performance_determinism.js:101 quotes `DEUS_World.js`
- tool tools/test_32_levels_generation.js:86 quotes `DEUS_World.js`
- tool tools/test_area_generation_speed.js:141 quotes `DEUS_World.js`
- tool tools/test_build_vertical.js:820 quotes `DEUS_World`
- tool tools/test_build_vertical.js:273 quotes `DEUS_World.js`
- tool tools/test_collapse_ingame.js:238 quotes `DEUS_World`
- tool tools/test_combat_dying_integration.js:134 quotes `DEUS_World.js`
- tool tools/test_combat_dying_integration.js:153 quotes `DEUS_World.js`
- tool tools/test_d20_equipment_slots.js:126 quotes `DEUS_World.js`
- tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:39 quotes `DEUS_World.js`
- tool tools/test_duplicate_registration.js:167 quotes `DEUS_World.js`
- tool tools/test_faction_starting_gear.js:137 quotes `DEUS_World.js`
- tool tools/test_generated_z2_cut_proof.js:363 quotes `DEUS_World.js`
- tool tools/test_geology_strata.js:34 quotes `DEUS_World.js`
- tool tools/test_geology_strata.js:177 quotes `DEUS_World.js`
- tool tools/test_layer_switch_inplace.js:421 quotes `DEUS_World`
- tool tools/test_layer_switch_inplace.js:85 quotes `DEUS_World.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_World`
- tool tools/test_lazy_area_generation.js:31 quotes `DEUS_World`
- tool tools/test_lazy_area_generation.js:147 quotes `DEUS_World`
- tool tools/test_native_survival_soak.js:65 quotes `DEUS_World.js`
- tool tools/test_natural_connections_no_mint.js:86 quotes `DEUS_World.js`
- tool tools/test_new_game_year0.js:39 quotes `DEUS_World`
- tool tools/test_region_seam_continuity.js:119 quotes `DEUS_World`
- tool tools/test_region_seam_continuity.js:42 quotes `DEUS_World.js`
- tool tools/test_region_seam_continuity.js:60 quotes `DEUS_World.js`
- tool tools/test_round_world.js:180 quotes `DEUS_World.js`
- tool tools/test_seamless_map_edges.js:151 quotes `DEUS_World.js`
- tool tools/test_sim_loader.js:27 quotes `DEUS_World.js`
- tool tools/test_sim_loader.js:127 quotes `DEUS_World.js`
- tool tools/test_sim_loader.js:151 quotes `DEUS_World.js`
- tool tools/test_sim_loader.js:228 quotes `DEUS_World.js`
- tool tools/test_sim_tick.js:32 quotes `DEUS_World`
- tool tools/test_sim_tick.js:99 quotes `DEUS_World`
- tool tools/test_sim_tick.js:117 quotes `DEUS_World`
- tool tools/test_sim_tick.js:376 quotes `DEUS_World`
- tool tools/test_sparse_outer_save.js:162 quotes `DEUS_World.js`
- tool tools/test_strata_cuts_and_caves.js:203 quotes `DEUS_World.js`
- tool tools/test_strata_fluid_reconciliation.js:43 quotes `DEUS_World.js`
- tool tools/test_strata_foundation.js:139 quotes `DEUS_World.js`
- tool tools/test_structural_levels.js:705 quotes `DEUS_World.js`
- tool tools/test_structural_runtime.js:273 quotes `DEUS_World.js`
- tool tools/test_structure_fluid.js:175 quotes `DEUS_World.js`
- tool tools/test_survival_regressions.js:68 quotes `DEUS_World.js`
- tool tools/test_upper_elevation_terrain.js:107 quotes `DEUS_World.js`
- tool tools/test_volumetric_terrain_column.js:124 quotes `DEUS_World.js`
- tool tools/test_worldgen_quickfixes.js:17 quotes `DEUS_World.js`
- tool tools/test_worldgen_quickfixes.js:52 quotes `DEUS_World.js`
- tool tools/test_zrange.js:129 quotes `DEUS_World`
- tool tools/worldgen/test_vertical_biome_coupling.js:35 quotes `DEUS_World`
- tool tools/worldgen/test_vertical_biome_coupling.js:36 quotes `DEUS_World`
- tool tools/zrange/bench_queries.js:24 quotes `DEUS_World.js`
- tool tools/zrange/provocations.js:8 quotes `DEUS_World.js`
- tool tools/zrange/scan_z_literals.js:20 quotes `DEUS_World`
- archive quotes omitted from the live list (2 hits)

## DEUS_WorldGen.js

Source lines: 2553.
Exports:
- `UF.WorldGen` at game/js/plugins/DEUS_WorldGen.js:245
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_WorldGen.js:243
- namespace object `window/root.UF` at game/js/plugins/DEUS_WorldGen.js:244
Engine prototype patches:
- `Scene_Boot.prototype.start` at game/js/plugins/DEUS_WorldGen.js:2036
Engine object patches (not prototype):
- `DataManager.onLoad` at game/js/plugins/DEUS_WorldGen.js:54
Engine members read or saved:
- `Scene_Boot.prototype.start` saved to `_Scene_Boot_start` at game/js/plugins/DEUS_WorldGen.js:2035
- `DataManager.onLoad` saved to `_DEUS_WorldGen_DataManager_onLoad` at game/js/plugins/DEUS_WorldGen.js:53
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `fnv` at game/js/plugins/DEUS_WorldGen.js:83
- `mix` at game/js/plugins/DEUS_WorldGen.js:92
- `hash32` at game/js/plugins/DEUS_WorldGen.js:97
- `mulberry32` at game/js/plugins/DEUS_WorldGen.js:111
- `corner` at game/js/plugins/DEUS_WorldGen.js:127
- `valueNoise` at game/js/plugins/DEUS_WorldGen.js:146
- `autotileShape` at game/js/plugins/DEUS_WorldGen.js:196
- `shapeTable` at game/js/plugins/DEUS_WorldGen.js:213
- `dims` at game/js/plugins/DEUS_WorldGen.js:250
- `compiled` at game/js/plugins/DEUS_WorldGen.js:268
- `plantTable` at game/js/plugins/DEUS_WorldGen.js:292
- `fieldsFor` at game/js/plugins/DEUS_WorldGen.js:322
- `classify` at game/js/plugins/DEUS_WorldGen.js:365
- `waterModels` at game/js/plugins/DEUS_WorldGen.js:428
- `noiseLattice` at game/js/plugins/DEUS_WorldGen.js:504
- `rowOf` at game/js/plugins/DEUS_WorldGen.js:511
- `along` at game/js/plugins/DEUS_WorldGen.js:517
- `resolve` at game/js/plugins/DEUS_WorldGen.js:597
- `loadCaves` at game/js/plugins/DEUS_WorldGen.js:824
- `caveSeed` at game/js/plugins/DEUS_WorldGen.js:849
- `carveVoidManifold` at game/js/plugins/DEUS_WorldGen.js:889
- `kitEntries` at game/js/plugins/DEUS_WorldGen.js:1029
- `resourceOf` at game/js/plugins/DEUS_WorldGen.js:1047
- `sitesFor` at game/js/plugins/DEUS_WorldGen.js:1151
- `groundColumns` at game/js/plugins/DEUS_WorldGen.js:1174
- `groundPalette` at game/js/plugins/DEUS_WorldGen.js:1193
- `columnReader` at game/js/plugins/DEUS_WorldGen.js:1211
- `paintGround` at game/js/plugins/DEUS_WorldGen.js:1240
- `bindChunkState` at game/js/plugins/DEUS_WorldGen.js:1309
- `floraAllowed` at game/js/plugins/DEUS_WorldGen.js:1314
- `sealChunkPopulation` at game/js/plugins/DEUS_WorldGen.js:1320
- `finishChunkPopulation` at game/js/plugins/DEUS_WorldGen.js:1325
- `realizeChunkTerrain` at game/js/plugins/DEUS_WorldGen.js:1331
- `generate` at game/js/plugins/DEUS_WorldGen.js:1365
- `needsCaveLight` at game/js/plugins/DEUS_WorldGen.js:1658
- `year0PlantFloor` at game/js/plugins/DEUS_WorldGen.js:1671
- `fungalFoodTypeIds` at game/js/plugins/DEUS_WorldGen.js:1677
- `settleUndergroundYear0` at game/js/plugins/DEUS_WorldGen.js:1691
- `quietCampLava` at game/js/plugins/DEUS_WorldGen.js:1782
- `placeForageKit` at game/js/plugins/DEUS_WorldGen.js:1859
- 2 more function declarations are in caller_inventory.json
Named consumers outside this file:
- `UF.WorldGen` (export, this file :245):
  - plugin game/js/plugins/DEUS_Ecology.js:65 (4 code hits; lines 65,621)
  - plugin game/js/plugins/DEUS_Environment.js:61 (1 code hit; lines 61)
  - plugin game/js/plugins/DEUS_Factions.js:318 (4 code hits; lines 318,325,805,821)
  - plugin game/js/plugins/DEUS_Fire.js:457 (1 code hit; lines 457)
  - plugin game/js/plugins/DEUS_Floors.js:468 (3 code hits; lines 468)
  - plugin game/js/plugins/DEUS_History.js:240 (3 code hits; lines 240)
  - plugin game/js/plugins/DEUS_Interact.js:202 (1 code hit; lines 202)
  - plugin game/js/plugins/DEUS_Jobs.js:243 (5 code hits; lines 243,295,489,523,1642)
  - plugin game/js/plugins/DEUS_Levels.js:159 (8 code hits; lines 159,793,1267,1285,1684,2840,3804,5423)
  - plugin game/js/plugins/DEUS_Look.js:337 (1 code hit; lines 337)
  - plugin game/js/plugins/DEUS_Objects.js:462 (1 code hit; lines 462)
  - plugin game/js/plugins/DEUS_Tiles.js:554 (2 code hits; lines 554,555)
  - plugin game/js/plugins/DEUS_Wildlife.js:92 (1 code hit; lines 92)
  - plugin game/js/plugins/DEUS_World.js:549 (1 code hit; lines 549)
  - tool tools/bench_history_sim.js:124 (1 code hit; lines 124)
  - tool tools/bench_vertical_worldgen.js:352 (1 code hit; lines 352)
  - tool tools/check_area_biomes.js:22 (1 code hit; lines 22)
  - tool tools/fixtures/UF_ZFlora.js:14 (1 code hit; lines 14)
  - tool tools/fixtures/UF_ZIntegration.js:14 (1 code hit; lines 14)
  - tool tools/inspect_65_40_sim.js:51 (2 code hits; lines 51,58)
  - tool tools/sim/test_wildlife_rules_damage.js:169 (1 code hit; lines 169)
  - tool tools/test_callings_system.js:295 (1 code hit; lines 295)
  - tool tools/test_column_landforms.js:199 (1 code hit; lines 199)
  - tool tools/test_extraction_difficulty.js:143 (1 code hit; lines 143)
  - tool tools/test_faction_founder_pairbonding.js:173 (1 code hit; lines 173)
  - tool tools/test_geology_strata.js:227 (1 code hit; lines 227)
  - tool tools/test_native_survival_soak.js:249 (1 code hit; lines 249)
  - tool tools/test_resource_node_materials.js:129 (1 code hit; lines 129)
  - tool tools/test_round_world.js:186 (1 code hit; lines 186)
  - tool tools/test_seamless_map_edges.js:157 (1 code hit; lines 157)
  - tool tools/test_strata_cuts_and_caves.js:1159 (2 code hits; lines 1159,1177)
  - tool tools/test_survival_regressions.js:668 (1 code hit; lines 668)
  - tool tools/test_upper_elevation_terrain.js:113 (1 code hit; lines 113)
  - tool tools/test_volumetric_terrain_column.js:264 (1 code hit; lines 264)
  - tool tools/test_worldgen_quickfixes.js:56 (1 code hit; lines 56)
  - tool tools/test_z_flora.js:56 (6 code hits; lines 56,65,84,93,115,133)
  - tool tools/worldgen/test_vertical_biome_coupling.js:153 (2 code hits; lines 153,245)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Agriculture.js:136 (1); archive/plugins_uf_pre_rename/UF_Ecology.js:65 (4); archive/plugins_uf_pre_rename/UF_Environment.js:59 (1); archive/plugins_uf_pre_rename/UF_Factions.js:336 (4); archive/plugins_uf_pre_rename/UF_Fire.js:314 (1); archive/plugins_uf_pre_rename/UF_Floors.js:277 (3); archive/plugins_uf_pre_rename/UF_History.js:173 (3); archive/plugins_uf_pre_rename/UF_Interact.js:200 (1); archive/plugins_uf_pre_rename/UF_Jobs.js:207 (5); archive/plugins_uf_pre_rename/UF_Levels.js:614 (4); archive/plugins_uf_pre_rename/UF_Look.js:337 (1); archive/plugins_uf_pre_rename/UF_Objects.js:350 (1); archive/plugins_uf_pre_rename/UF_Roads.js:59 (1); archive/plugins_uf_pre_rename/UF_Tiles.js:542 (2); archive/plugins_uf_pre_rename/UF_Wildlife.js:58 (1); archive/plugins_uf_pre_rename/UF_WorldGen.js:226 (1); archive/plugins/DEUS_Agriculture.js:136 (1); archive/plugins/DEUS_Roads.js:59 (1)
Loader edges (quoted id, not symbol callers):
- plugins-list game/js/plugins.js:73 quotes `DEUS_WorldGen`
- tool tools/bench_vertical_worldgen.js:119 quotes `DEUS_WorldGen`
- tool tools/capture_pre_migration_baseline.js:114 quotes `DEUS_WorldGen.js`
- tool tools/dev/sim_forward.js:40 quotes `DEUS_WorldGen`
- tool tools/performance/census_boot_load.js:66 quotes `DEUS_WorldGen.js`
- tool tools/register_world_plugins.js:14 quotes `DEUS_WorldGen`
- tool tools/run_all_suites.js:23 quotes `DEUS_WorldGen`
- tool tools/sim/test_sim_forward_guard.js:28 quotes `DEUS_WorldGen`
- tool tools/sim/test_underground_year0.js:30 quotes `DEUS_WorldGen`
- tool tools/society/test_person_identity.js:31 quotes `DEUS_WorldGen`
- tool tools/test_19b_performance_determinism.js:101 quotes `DEUS_WorldGen.js`
- tool tools/test_32_levels_generation.js:86 quotes `DEUS_WorldGen.js`
- tool tools/test_area_generation_speed.js:141 quotes `DEUS_WorldGen.js`
- tool tools/test_build_vertical.js:273 quotes `DEUS_WorldGen.js`
- tool tools/test_column_landforms.js:179 quotes `DEUS_WorldGen.js`
- tool tools/test_deep_cuts_and_mountain_cap_wg0041.js:40 quotes `DEUS_WorldGen.js`
- tool tools/test_extraction_difficulty.js:15 quotes `DEUS_WorldGen.js`
- tool tools/test_generated_z2_cut_proof.js:363 quotes `DEUS_WorldGen.js`
- tool tools/test_geology_strata.js:34 quotes `DEUS_WorldGen.js`
- tool tools/test_ground_shades_prototype.js:20 quotes `DEUS_WorldGen.js`
- tool tools/test_lazy_area_generation.js:30 quotes `DEUS_WorldGen`
- tool tools/test_lazy_area_generation.js:31 quotes `DEUS_WorldGen`
- tool tools/test_native_survival_soak.js:66 quotes `DEUS_WorldGen.js`
- tool tools/test_natural_connections_no_mint.js:86 quotes `DEUS_WorldGen.js`
- tool tools/test_new_game_year0.js:39 quotes `DEUS_WorldGen`
- tool tools/test_region_seam_continuity.js:42 quotes `DEUS_WorldGen.js`
- tool tools/test_region_seam_continuity.js:63 quotes `DEUS_WorldGen.js`
- tool tools/test_resource_node_materials.js:15 quotes `DEUS_WorldGen.js`
- tool tools/test_round_world.js:182 quotes `DEUS_WorldGen.js`
- tool tools/test_seamless_map_edges.js:153 quotes `DEUS_WorldGen.js`
- tool tools/test_sim_tick.js:32 quotes `DEUS_WorldGen`
- tool tools/test_sparse_outer_save.js:162 quotes `DEUS_WorldGen.js`
- tool tools/test_strata_cuts_and_caves.js:101 quotes `DEUS_WorldGen.js`
- tool tools/test_strata_cuts_and_caves.js:203 quotes `DEUS_WorldGen.js`
- tool tools/test_strata_fluid_reconciliation.js:43 quotes `DEUS_WorldGen.js`
- tool tools/test_strata_foundation.js:139 quotes `DEUS_WorldGen.js`
- tool tools/test_structural_levels.js:705 quotes `DEUS_WorldGen.js`
- tool tools/test_structural_runtime.js:273 quotes `DEUS_WorldGen.js`
- tool tools/test_structure_fluid.js:175 quotes `DEUS_WorldGen.js`
- tool tools/test_survival_regressions.js:69 quotes `DEUS_WorldGen.js`
- tool tools/test_upper_elevation_terrain.js:109 quotes `DEUS_WorldGen.js`
- tool tools/test_vertical_worldgen_proof.js:234 quotes `DEUS_WorldGen.js`
- tool tools/test_volumetric_terrain_column.js:68 quotes `DEUS_WorldGen.js`
- tool tools/test_volumetric_terrain_column.js:98 quotes `DEUS_WorldGen.js`
- tool tools/test_volumetric_terrain_column.js:113 quotes `DEUS_WorldGen.js`
- tool tools/test_volumetric_terrain_column.js:124 quotes `DEUS_WorldGen.js`
- tool tools/test_worldgen_quickfixes.js:16 quotes `DEUS_WorldGen.js`
- tool tools/test_worldgen_quickfixes.js:55 quotes `DEUS_WorldGen.js`
- tool tools/test_z_flora.js:7 quotes `DEUS_WorldGen`
- tool tools/test_z_flora.js:45 quotes `DEUS_WorldGen.js`
- tool tools/worldgen/test_vertical_biome_coupling.js:35 quotes `DEUS_WorldGen`
- tool tools/worldgen/test_vertical_biome_coupling.js:36 quotes `DEUS_WorldGen`
- tool tools/zrange/bench_queries.js:24 quotes `DEUS_WorldGen.js`
- tool tools/zrange/scan_z_literals.js:20 quotes `DEUS_WorldGen`
- archive quotes omitted from the live list (2 hits)

## DEUS_WorldItems.js

Source lines: 129.
Exports:
- `DEUS.WorldItems` at game/js/plugins/DEUS_WorldItems.js:76
- `UF.WorldItems` at game/js/plugins/DEUS_WorldItems.js:77
- namespace object `window/root.DEUS` at game/js/plugins/DEUS_WorldItems.js:28
- namespace object `window/root.UF` at game/js/plugins/DEUS_WorldItems.js:29
Engine prototype patches:
- `Game_CharacterBase.prototype.canPass` at game/js/plugins/DEUS_WorldItems.js:85
- `Game_CharacterBase.prototype.canPassDiagonally` at game/js/plugins/DEUS_WorldItems.js:96
- `Scene_Map.prototype.update` at game/js/plugins/DEUS_WorldItems.js:112
Engine object patches (not prototype):
- none
Engine members read or saved:
- `Game_CharacterBase.prototype.canPass` saved to `prevPass` at game/js/plugins/DEUS_WorldItems.js:83
- `Game_CharacterBase.prototype.canPassDiagonally` saved to `prevDiag` at game/js/plugins/DEUS_WorldItems.js:94
- `Scene_Map.prototype.update` saved to `prevUpdate` at game/js/plugins/DEUS_WorldItems.js:111
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `loadSim` at game/js/plugins/DEUS_WorldItems.js:31
module.exports assignments: game/js/plugins/DEUS_WorldItems.js:127
Named consumers outside this file:
- `DEUS.WorldItems` (export, this file :76):
  - plugin game/js/plugins/DEUS_Containers.js:1543 (2 code hits; lines 1543,1555)
- `UF.WorldItems` (export, this file :77): no-call-found-after-defined-search. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- tool tools/world_items/test_world_items.js:639 quotes `DEUS_WorldItems.js`
- tool tools/world_items/test_world_items.js:642 quotes `DEUS_WorldItems.js`

## UF_Households.js

Source lines: 1074.
Exports:
- `UF.Households` at game/js/plugins/UF_Households.js:1032
- namespace object `window/root.DEUS` at game/js/plugins/UF_Households.js:1029
- namespace object `window/root.UF` at game/js/plugins/UF_Households.js:1030
Engine prototype patches:
- `Scene_Boot.prototype.start` at game/js/plugins/UF_Households.js:1064
Engine object patches (not prototype):
- `DataManager.extractSaveContents` at game/js/plugins/UF_Households.js:1068
Engine members read or saved:
- `Scene_Boot.prototype.start` saved to `boot` at game/js/plugins/UF_Households.js:1063
- `DataManager.extractSaveContents` saved to `extract` at game/js/plugins/UF_Households.js:1067
Namespace property patches:
- none
Listeners and commands:
- `on` `"colonists:ready"` at game/js/plugins/UF_Households.js:1049
- `on` `"colonists:born"` at game/js/plugins/UF_Households.js:1050
- `on` `"time:day"` at game/js/plugins/UF_Households.js:1051
- `on` `"objects:changed"` at game/js/plugins/UF_Households.js:1052
- `on` `"objects:levelChanged"` at game/js/plugins/UF_Households.js:1053
- `on` `"jobs:done"` at game/js/plugins/UF_Households.js:1054
- `on` `"world:unitRemoved"` at game/js/plugins/UF_Households.js:1059
- `on` `"combat:kill"` at game/js/plugins/UF_Households.js:1060
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- `state` at game/js/plugins/UF_Households.js:50
- `context` at game/js/plugins/UF_Households.js:58
- `all` at game/js/plugins/UF_Households.js:66
- `of` at game/js/plugins/UF_Households.js:67
- `resolve` at game/js/plugins/UF_Households.js:68
- `structures` at game/js/plugins/UF_Households.js:69
- `members` at game/js/plugins/UF_Households.js:73
- `remember` at game/js/plugins/UF_Households.js:77
- `join` at game/js/plugins/UF_Households.js:89
- `make` at game/js/plugins/UF_Households.js:100
- `merge` at game/js/plugins/UF_Households.js:110
- `ancestors` at game/js/plugins/UF_Households.js:123
- `closeKin` at game/js/plugins/UF_Households.js:135
- `partnerId` at game/js/plugins/UF_Households.js:140
- `pairReason` at game/js/plugins/UF_Households.js:141
- `formPair` at game/js/plugins/UF_Households.js:155
- `generations` at game/js/plugins/UF_Households.js:193
- `reconcile` at game/js/plugins/UF_Households.js:209
- `ensureTownHallHomes` at game/js/plugins/UF_Households.js:254
- `object` at game/js/plugins/UF_Households.js:347
- `ref` at game/js/plugins/UF_Households.js:348
- `dry` at game/js/plugins/UF_Households.js:349
- `hash` at game/js/plugins/UF_Households.js:355
- `designFor` at game/js/plugins/UF_Households.js:360
- `dimensions` at game/js/plugins/UF_Households.js:400
- `layout` at game/js/plugins/UF_Households.js:401
- `footprintOK` at game/js/plugins/UF_Households.js:447
- `findPlot` at game/js/plugins/UF_Households.js:477
- `ensureHome` at game/js/plugins/UF_Households.js:558
- `ensureExpansion` at game/js/plugins/UF_Households.js:566
- `syncHome` at game/js/plugins/UF_Households.js:581
- `callingFor` at game/js/plugins/UF_Households.js:613
- `assignHome` at game/js/plugins/UF_Households.js:696
- `releaseHome` at game/js/plugins/UF_Households.js:719
- `isHoused` at game/js/plugins/UF_Households.js:730
- `planSteps` at game/js/plugins/UF_Households.js:736
- `strictEnclosure` at game/js/plugins/UF_Households.js:878
- `demands` at game/js/plugins/UF_Households.js:898
- `describe` at game/js/plugins/UF_Households.js:910
- `isEnclosed` at game/js/plugins/UF_Households.js:919
- 10 more function declarations are in caller_inventory.json
module.exports assignments: game/js/plugins/UF_Households.js:1071
Named consumers outside this file:
- `UF.Households` (export, this file :1032):
  - plugin game/js/plugins/DEUS_Colonists.js:571 (34 code hits; lines 571,1204,1295,2427,2438,2540,2604,2605,2641,2864,2927,3028)
  - plugin game/js/plugins/DEUS_Containers.js:320 (1 code hit; lines 320)
  - plugin game/js/plugins/DEUS_Doors.js:581 (1 code hit; lines 581)
  - plugin game/js/plugins/DEUS_Environment.js:311 (1 code hit; lines 311)
  - plugin game/js/plugins/DEUS_History.js:1707 (4 code hits; lines 1707,1708,1712)
  - plugin game/js/plugins/DEUS_Levels.js:3883 (1 code hit; lines 3883)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:100 (3 code hits; lines 100)
  - plugin game/js/plugins/DEUS_Ownership.js:290 (1 code hit; lines 290)
  - plugin game/js/plugins/DEUS_Projects.js:591 (2 code hits; lines 591,1382)
  - tool tools/fixtures/UF_SocietyRuntime.js:17 (1 code hit; lines 17)
  - tool tools/test_column_landforms.js:186 (4 code hits; lines 186,188,190)
  - tool tools/test_cooperative_building_and_offspring_pairbonding.js:322 (3 code hits; lines 322,380,417)
  - tool tools/test_faction_construction_and_homes.js:293 (6 code hits; lines 293,341,342,373,374,386)
  - tool tools/test_faction_founder_pairbonding.js:354 (1 code hit; lines 354)
  - tool tools/test_faction_reproduction.js:276 (1 code hit; lines 276)
  - tool tools/test_family_compounds_and_shops.js:153 (1 code hit; lines 153)
  - tool tools/test_family_integration.js:89 (1 code hit; lines 89)
  - tool tools/test_households.js:62 (1 code hit; lines 62)
  - tool tools/test_material_refining_and_tech_pacing.js:271 (1 code hit; lines 271)
  - tool tools/test_natural_connections.js:87 (1 code hit; lines 87)
  - tool tools/test_population_growth_and_immigration.js:415 (1 code hit; lines 415)
  - tool tools/test_profile_tabs.js:127 (1 code hit; lines 127)
  - tool tools/test_second_by_second_history.js:423 (5 code hits; lines 423,501,503,573,621)
  - tool tools/test_settlement_domestic_housing.js:250 (1 code hit; lines 250)
  - tool tools/test_vertical_worldgen_proof.js:244 (1 code hit; lines 244)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Colonists.js:505 (34); archive/plugins_uf_pre_rename/UF_Containers.js:317 (1); archive/plugins_uf_pre_rename/UF_Doors.js:542 (1); archive/plugins_uf_pre_rename/UF_Environment.js:309 (1); archive/plugins_uf_pre_rename/UF_FireSafety.js:40 (1); archive/plugins_uf_pre_rename/UF_Goals.js:286 (1); archive/plugins_uf_pre_rename/UF_History.js:1475 (4); archive/plugins_uf_pre_rename/UF_Households.js:1570 (2); archive/plugins_uf_pre_rename/UF_Levels.js:1189 (1); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:97 (3); archive/plugins_uf_pre_rename/UF_Ownership.js:290 (1); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:422 (3); archive/plugins_uf_pre_rename/UF_Resources.js:52 (1); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:59 (1); archive/plugins/DEUS_Containers.js:317 (1); archive/plugins/DEUS_FireSafety.js:40 (1); archive/plugins/DEUS_Goals.js:286 (1); archive/plugins/DEUS_Households.js:1570 (2); archive/plugins/DEUS_ProfileTabs.js:422 (3); archive/plugins/DEUS_Resources.js:52 (1); archive/plugins/DEUS_SettlementPillars.js:59 (1)
Loader edges (quoted id, not symbol callers):
- plugin game/js/plugins/DEUS_Core.js:105 quotes `UF_Households`
- tool tools/test_callings_system.js:313 quotes `UF_Households.js`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:21 quotes `UF_Households`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:262 quotes `UF_Households`
- tool tools/test_cooperative_building_and_offspring_pairbonding.js:266 quotes `UF_Households`
- tool tools/test_cooperative_homestead_construction.js:193 quotes `UF_Households.js`
- tool tools/test_faction_construction_and_homes.js:14 quotes `UF_Households`
- tool tools/test_faction_construction_and_homes.js:230 quotes `UF_Households`
- tool tools/test_faction_construction_and_homes.js:234 quotes `UF_Households`
- tool tools/test_faction_founder_pairbonding.js:195 quotes `UF_Households.js`
- tool tools/test_family_compounds_and_shops.js:8 quotes `UF_Households.js`
- tool tools/test_family_integration.js:86 quotes `UF_Households.js`
- tool tools/test_live_town_center_progression.js:159 quotes `UF_Households.js`
- tool tools/test_material_refining_and_tech_pacing.js:268 quotes `UF_Households.js`
- tool tools/test_no_loadscript_shims.js:24 quotes `UF_Households.js`
- tool tools/test_second_by_second_history.js:18 quotes `UF_Households`
- tool tools/test_settlement_domestic_housing.js:51 quotes `UF_Households.js`
- tool tools/test_settlement_domestic_housing.js:248 quotes `UF_Households.js`
- tool tools/test_town_hall_ai_live.js:72 quotes `UF_Households.js`
- tool tools/test_town_hall_ai_live.js:74 quotes `UF_Households.js`
- tool tools/test_town_hall_ai_live.js:76 quotes `UF_Households.js`
- tool tools/zrange/scan_z_literals.js:22 quotes `UF_Households`

## UF_Time.js

Source lines: 590.
Exports:
- `UF.Time` at game/js/plugins/UF_Time.js:569
- namespace object `window/root.UF` at game/js/plugins/UF_Time.js:53
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- `on` `"time:paused"` at game/js/plugins/UF_Time.js:583
- `on` `"time:resumed"` at game/js/plugins/UF_Time.js:584
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- `UF.Time` (export, this file :569): Also assigned or declared in game/js/plugins/DEUS_Core.js:482 fallback, game/js/plugins/DEUS_Test.js:64, game/js/plugins/DEUS_TimeSpeed.js:144. A hit names the identifier; it does not prove which assignment ran.
  - plugin game/js/plugins/DEUS_Anim.js:2206 (7 code hits; lines 2206,2208,2214,2698)
  - plugin game/js/plugins/DEUS_Colonists.js:187 (29 code hits; lines 187,192,196,200,204,340,349,359,683,5844)
  - plugin game/js/plugins/DEUS_Combat.js:137 (19 code hits; lines 137,1668,1827,2570,2571,2948,3185)
  - plugin game/js/plugins/DEUS_Conditions.js:76 (3 code hits; lines 76)
  - plugin game/js/plugins/DEUS_Core.js:482 (18 code hits; lines 482,483,484,485,486,487,488,489,490,491,492,493)
  - plugin game/js/plugins/DEUS_DayNight.js:156 (18 code hits; lines 156,157,515,526,543,545,657)
  - plugin game/js/plugins/DEUS_Depth.js:1944 (8 code hits; lines 1944,1950,2390,2396)
  - plugin game/js/plugins/DEUS_Doors.js:54 (10 code hits; lines 54,615,654,656)
  - plugin game/js/plugins/DEUS_Factions.js:1491 (1 code hit; lines 1491)
  - plugin game/js/plugins/DEUS_Fire.js:1397 (1 code hit; lines 1397)
  - plugin game/js/plugins/DEUS_Floors.js:774 (7 code hits; lines 774,891,893)
  - plugin game/js/plugins/DEUS_History.js:3832 (4 code hits; lines 3832,3834,3837,3846)
  - plugin game/js/plugins/DEUS_Interact.js:1083 (4 code hits; lines 1083,1176)
  - plugin game/js/plugins/DEUS_Jobs.js:122 (7 code hits; lines 122,2175,2361)
  - plugin game/js/plugins/DEUS_NaturalConnections.js:274 (16 code hits; lines 274,302,446,495,502,505,506,508,560)
  - plugin game/js/plugins/DEUS_Ownership.js:89 (3 code hits; lines 89)
  - plugin game/js/plugins/DEUS_Projects.js:164 (22 code hits; lines 164,1669,1673,1705,1736,1737,1741,1766,1769)
  - plugin game/js/plugins/DEUS_Sheet.js:2607 (1 code hit; lines 2607)
  - plugin game/js/plugins/DEUS_Speech.js:240 (5 code hits; lines 240,362,780,1344)
  - plugin game/js/plugins/DEUS_Talk.js:114 (1 code hit; lines 114)
  - plugin game/js/plugins/DEUS_Test.js:64 (5 code hits; lines 64,65,74,543)
  - plugin game/js/plugins/DEUS_TimeSpeed.js:144 (4 code hits; lines 144,237,238)
  - plugin game/js/plugins/DEUS_World.js:4808 (1 code hit; lines 4808)
  - plugin game/js/plugins/UF_Households.js:40 (3 code hits; lines 40)
  - tool tools/bench/combat_srd/DEUS_BenchCombatSrd.js:200 (9 code hits; lines 200,201,425)
  - tool tools/benchmark_performance.js:99 (2 code hits; lines 99,110)
  - tool tools/fixtures/UF_FireSafetyRuntime.js:39 (7 code hits; lines 39,43,51,52,63)
  - tool tools/fixtures/UF_SleepRuntime.js:59 (4 code hits; lines 59,63)
  - tool tools/fixtures/UF_SocietyRuntime.js:73 (4 code hits; lines 73,122,134)
  - tool tools/fixtures/UF_ZFlora.js:15 (6 code hits; lines 15,16,113)
  - tool tools/occlusion/bench_occlusion.js:90 (6 code hits; lines 90,91)
  - tool tools/occlusion/compare_planes.js:84 (6 code hits; lines 84,85)
  - tool tools/occlusion/live_occlusion.js:87 (6 code hits; lines 87,88)
  - tool tools/smoke_19a_playtest.js:104 (14 code hits; lines 104,178,335,401,429)
  - tool tools/test_autonomous_settlement_closure.js:412 (1 code hit; lines 412)
  - tool tools/test_build_vertical.js:726 (10 code hits; lines 726,781,783)
  - tool tools/test_collapse_ingame.js:139 (11 code hits; lines 139,146,173,175)
  - tool tools/test_conditions_system.js:224 (1 code hit; lines 224)
  - tool tools/test_goals.js:99 (3 code hits; lines 99,100,106)
  - tool tools/test_layer_switch_inplace.js:140 (12 code hits; lines 140,188,273,291)
  - tool tools/test_material_refining_and_tech_pacing.js:149 (1 code hit; lines 149)
  - tool tools/test_time_domains_proof.js:60 (43 code hits; lines 60,68,71,72,73,76,77,78,97,116,124,133)
  - tool tools/zrange/zrange_suite.js:81 (18 code hits; lines 81,82,423,424,434,435)
  - archive-only (not a live game/ load): archive/plugins_uf_pre_rename/UF_Anim.js:2186 (7); archive/plugins_uf_pre_rename/UF_Colonists.js:139 (14); archive/plugins_uf_pre_rename/UF_Combat.js:1200 (14); archive/plugins_uf_pre_rename/UF_Core.js:420 (3); archive/plugins_uf_pre_rename/UF_CultureGrowth.js:52 (3); archive/plugins_uf_pre_rename/UF_DayNight.js:155 (18); archive/plugins_uf_pre_rename/UF_Doors.js:54 (10); archive/plugins_uf_pre_rename/UF_Factions.js:1527 (1); archive/plugins_uf_pre_rename/UF_Fire.js:1178 (1); archive/plugins_uf_pre_rename/UF_FireSafety.js:28 (3); archive/plugins_uf_pre_rename/UF_Floors.js:555 (7); archive/plugins_uf_pre_rename/UF_Goals.js:40 (5); archive/plugins_uf_pre_rename/UF_History.js:3389 (4); archive/plugins_uf_pre_rename/UF_Households.js:39 (3); archive/plugins_uf_pre_rename/UF_Interact.js:1027 (4); archive/plugins_uf_pre_rename/UF_Jobs.js:97 (7); archive/plugins_uf_pre_rename/UF_NaturalConnections.js:266 (22); archive/plugins_uf_pre_rename/UF_Ownership.js:89 (3); archive/plugins_uf_pre_rename/UF_ProfileTabs.js:414 (1); archive/plugins_uf_pre_rename/UF_Resources.js:99 (3); archive/plugins_uf_pre_rename/UF_Sanitation.js:284 (3); archive/plugins_uf_pre_rename/UF_SettlementPillars.js:64 (3); archive/plugins_uf_pre_rename/UF_Sheet.js:1657 (1); archive/plugins_uf_pre_rename/UF_Skills.js:907 (2); archive/plugins_uf_pre_rename/UF_Speech.js:240 (5); archive/plugins_uf_pre_rename/UF_Talk.js:114 (1); archive/plugins_uf_pre_rename/UF_Time.js:569 (5); archive/plugins_uf_pre_rename/UF_TimeSpeed.js:126 (4); archive/plugins_uf_pre_rename/UF_World.js:3345 (1); archive/plugins/DEUS_CultureGrowth.js:52 (3); archive/plugins/DEUS_FireSafety.js:28 (3); archive/plugins/DEUS_Goals.js:40 (5); archive/plugins/DEUS_Households.js:39 (3); archive/plugins/DEUS_ProfileTabs.js:414 (1); archive/plugins/DEUS_Resources.js:99 (3); archive/plugins/DEUS_Sanitation.js:284 (3); archive/plugins/DEUS_SettlementPillars.js:64 (3); archive/plugins/DEUS_Skills.js:908 (2); archive/plugins/DEUS_Time.js:569 (5)
Loader edges (quoted id, not symbol callers):
- tool tools/test_no_loadscript_shims.js:24 quotes `UF_Time.js`
- archive quotes omitted from the live list (3 hits)

## test_build_vertical_ingame.js

Source lines: 49.
Exports:
- none assigned as UF/DEUS member or Imported flag
Engine prototype patches:
- none
Engine object patches (not prototype):
- none
Engine members read or saved:
- none
Namespace property patches:
- none
Listeners and commands:
- none matched (`.on("literal")`, `addEventListener`, `setHandler`, `PluginManager.registerCommand`)
Classes:
- none
Named functions at brace depth 0 or 1 (capped at 40):
- none
Named consumers outside this file:
- no UF/DEUS export, Imported flag, or class was assigned. Coupling is the prototype patches and listeners above, if any. Not labeled dead.
Loader edges (quoted id, not symbol callers):
- no quoted id found outside this file in the searched roots
