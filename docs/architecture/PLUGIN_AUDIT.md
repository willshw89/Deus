# Plugin audit (ORG-0.3)

Writer: Grok 4.7, effort xhigh. Reviewer: Codex/GPT. This document is an inventory. It does not disable, merge, or move any plugin. Recommendations are for a later Owner-approved lane. Proposed pillar names are input for a future pillar map. They are not an approved map and this lane does not start pillar work.

Checkpoint the audit was written from: `86ec44c2055f766d17448c8d8f38f800b559059c` on `task/lane-plugin-audit`. Runtime source of the game bytes: that commit, which inherits committed base `565dc5aead7e068230528d573c395ea21ed5cf5d`. `git diff --stat 565dc5aead7e068230528d573c395ea21ed5cf5d HEAD -- game/` is empty, and `git diff --check` on that range exits 0. Gemini produced no audit text. The assignment log in the lane report is the historical record of that park.

## What was measured

`game/js/plugins.js` is 49 entries, every `status` true, zero OFF, zero listed names whose file is missing. `DEUS_StructuralPhysics` is entered twice, at indexes 46 and 47. Unique listed names: 48. Files in `game/js/plugins/*.js`: 71. Not listed: 23. The hypothesis "72 plugins" is not the count. A 72-file hash manifest is `plugins.js` plus those 71 files.

Absent names that the brief asked about, with the live file that does exist called out:

| Asked name | On disk |
|---|---|
| `Move8.js`, `UF_Move8.js` | absent. Live file is `DEUS_Move8.js` (unlisted). Listed 8-direction plugin is `DEUS_Movement8D.js`. |
| `CombatRT.js`, `CombatUI.js` | absent. Live files are `DEUS_CombatRT.js` and `DEUS_CombatUI.js` (both unlisted). |
| `DepthCues.js` | absent. Live file is `DEUS_DepthCues.js` (unlisted). |
| `WorldItems.js` | absent. Live file is `DEUS_WorldItems.js` (unlisted). |
| `DEUS_Simulation_Core.js` | absent from this lane and from the main worktree at the capture below. No `*Simulation_Core*` path was found under main. |

## How a file gets into the process

Vocabulary used below:

- **Configured.** `plugins.js` lists the name with `status: true`. That is not proof the file executed.
- **Observed.** This run produced a log line, a suite registration, or a check result that only that file's code produces.
- **Inferred.** A loader calls it, or it sits in the same `PluginManager.setup` batch as files that did execute, and this run has no line that names that file.
- **Unknown.** No boot loader was found, or a search that would prove a caller was not finished.

Local RPG Maker MZ, not the MV sample, decides the list. `game/js/main.js` `onScriptLoad` calls `PluginManager.setup($plugins)` after the engine scripts load (`main.js` around lines 83–86). `PluginManager.setup` (`game/js/rmmz_managers.js` 3109–3117) keeps an entry only when `plugin.status` is true and `Utils.extractFileName(plugin.name)` is not already in `_scripts`. It then `setParameters` and `loadScript`. The second `DEUS_StructuralPhysics` entry is configured and is not loaded again. `loadScript` (3128–3137) injects `js/plugins/<name>.js` with `async = false` and `defer = true`. `SceneManager.initialize` calls `checkPluginErrors` once (1926–1928, body at 1951–1953), which drains `PluginManager._errorUrls`. That call is at startup, before companion `loadScript`s that run from plugin code. A map that appears does not prove a later script tag succeeded.

The MV reference `PluginManager.setup` / `loadScript` (rpgtkoolmv corescript, MIT) filters on status and injects `js/plugins/<name>.js`. It was read as a pattern only. The MZ behavior above is from the local engine.

`DEUS_Core.js` (index 1) also loads companions. The list at lines 91–106 is `DEUS_Containers`, `DEUS_Bag`, `DEUS_Stockpiles`, `DEUS_Fluid`, `DEUS_Conditions`, `DEUS_Select`, `DEUS_Dnd5e`, `DEUS_Callings`, `DEUS_HistoricalDemographics`, `DEUS_DeathForensics`, `UF_Households`. For each name it `require`s `./js/plugins/<name>.js`, then `./game/js/plugins/<name>.js`, then `./<name>.js`. The logged error is the last failure, so an earlier path can fail silently. After that, if `window.__deus_loaded_<name>` is unset, it sets the flag and calls `PluginManager.loadScript(name)` (lines 127–131). `require` and `loadScript` are different paths. A successful `require` does not stop the script-tag injection.

Other loaders:

- `DEUS_Items.js` calls `PluginManager.loadScript("DEUS_Containers")` and `PluginManager.loadScript("DEUS_Dnd5e")` when those names are not already in `_scripts` (scanner: lines 43–47 region).
- `DEUS_History.js` calls `PluginManager.loadScript` for ``DEUS_${name}`` with names `HistoricalDemographics` and `Callings` (line 218). `getDemographics` (lines 138–145) also `require`s `DEUS_HistoricalDemographics.js` on several relative paths. `History.generate` throws at line 399 if HistoricalDemographics, Callings, and Dnd5e are missing.
- `DEUS_ColonyOverseer.js` line 51 calls `PluginManager.loadScript("DEUS_Select")` with no `__deus_loaded_` guard.
- `DEUS_World.js` exposes `UF.Sim.require`, which resolves `game/js/sim/<name>.js`. The scanner's `Sim.require(` pattern missed the local `simRequire("host/tick")` call. The runtime log is the authority for which modules resolved.
- `DEUS_World.js` and `DEUS_Colonists.js` `require` paths named `UF_Callings.js`. The live plugin file is `DEUS_Callings.js`. `archive/plugins/UF_Callings.js` is a separate 17-line file. Whether those `UF_Callings` requires threw during this run was not logged.

`DEUS_Core.js` lines 284–285 and again 480–481 set `window.UF = window.DEUS`. `DEUS_AssetStreaming.js` lines 10–11 do `var UF = UF || {}; UF.Assets = ...` before that rebind. `DEUS_Look.js` line 624 later sets `window.UF.Assets` to Look's status object. `DEUS_TimeSpeed.js` line 144 replaces `window.UF.Time` with the speed controller. Core's clock object remains `$ufTime` / `$deusTime` (Core lines 476–478). `DEUS_Test.js` `installTestClock` (lines 62–77) adds `setForTest` onto the existing `UF.Time` while the harness is active. It does not replace the object.

## Lexer used for coupling counts

TypeScript is not installed in this lane (`require("typescript")` is `MODULE_NOT_FOUND`; no global `tsc`). It was not installed, and no package file was edited. The Apache-2.0 TypeScript wiki page "Using the Compiler API", section "Traversing the AST with a little linter" (`delint`, `ts.createSourceFile`, `ts.forEachChild`, `getLineAndCharacterOfPosition`), was opened before the scanner. The stand-in is not that API.

`scratchpad/lane-plugin-audit/diag_plugin_scan.js` is a diagnostic lexer. It masks each character as code, comment, string/template text, or regex. Comments and strings are excluded from the code counts and reported separately as non-code hits. Regex-versus-division is a heuristic (previous token, keyword, or opener punctuation). Counts in the table are **token occurrences / distinct lines / distinct names** on the code projection, for `Game_`, `$game`, `Sprite_`, `Scene_`, `Window_`, and `PIXI`. A token is not a call. A filename hit is not a consumer: callers say `UF.Households`, not `UF_Households.js`. The scanner's "consumers" field is mostly filename strings and is not used below as proof that a file is dead. A zero grep count is not proof of death. The full per-file dump, including non-code counts, patch assignment lines, and suite registration strings, is `tasks/ORG-0.3/lane-plugin-audit/evidence/static/scan_summary.txt`. Self-test of the lexer passed. This is not a symbol index. Exports below are the assignment sites the lexer recorded, not a proof that every method on that object was called.

| File | Lines | Listed | Patches | Game_ | $game | Sprite_ | Scene_ | Window_ | PIXI | Exports |
|---|---:|---|---:|---|---|---|---|---|---|---|
| DEUS_Anim.js | 2716 | 25:ON | 7 | 2/2/1 | 23/16/2 | 7/6/2 | 6/6/2 | 0/0/0 | 0/0/0 | window.UF.Anim |
| DEUS_AssetStreaming.js | 47 | 0:ON | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 6/4/1 | UF.Assets |
| DEUS_Bag.js | 743 | unlisted | 3 | 0/0/0 | 6/6/1 | 6/4/1 | 8/7/1 | 10/6/2 | 0/0/0 | UF.Window_UFBag, UF.Sprite_UFBagButton, UF.Bag |
| DEUS_Callings.js | 407 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Callings |
| DEUS_Camera.js | 623 | 29:ON | 13 | 9/9/2 | 24/13/2 | 7/6/2 | 11/11/2 | 0/0/0 | 0/0/0 | window.UF.Camera |
| DEUS_CellularFluids.js | 87 | 45:ON | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | window.UF.World, window.UF.Fluids |
| DEUS_Colonists.js | 5921 | 19:ON | 2 | 2/2/1 | 0/0/0 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.ECS, window.UF.Colonists |
| DEUS_ColonyOverseer.js | 625 | 6:ON | 23 | 6/6/3 | 32/21/3 | 3/3/2 | 14/14/2 | 11/9/3 | 0/0/0 | window.UF.Overseer |
| DEUS_Combat.js | 3197 | 24:ON | 4 | 4/3/1 | 15/7/3 | 2/2/1 | 6/5/2 | 0/0/0 | 0/0/0 | window.UF.Combat |
| DEUS_CombatRT.js | 69 | unlisted | 2 | 6/4/1 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | — |
| DEUS_CombatUI.js | 72 | unlisted | 2 | 0/0/0 | 0/0/0 | 0/0/0 | 6/4/1 | 0/0/0 | 0/0/0 | — |
| DEUS_Conditions.js | 1187 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Conditions, DEUS.Conditions |
| DEUS_Containers.js | 1569 | unlisted | 3 | 0/0/0 | 4/2/1 | 2/2/1 | 8/7/1 | 7/4/2 | 0/0/0 | UF.Containers, DEUS.Containers, UF.ItemDrag |
| DEUS_Core.js | 661 | 1:ON | 9 | 6/5/3 | 8/5/4 | 0/0/0 | 16/16/3 | 2/1/2 | 0/0/0 | window.UF.Events, window.UF.Time |
| DEUS_Culling.js | 532 | 30:ON | 9 | 4/4/3 | 4/4/1 | 12/12/2 | 4/4/2 | 0/0/0 | 1/1/1 | UF.Culling, UF.Camera, UF.Camera |
| DEUS_DayNight.js | 664 | 27:ON | 4 | 2/2/1 | 29/24/3 | 6/6/2 | 7/7/2 | 0/0/0 | 3/1/1 | window.UF.DayNight |
| DEUS_DeathForensics.js | 545 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.DeathForensics, UF.Forensics, DEUS.DeathForensics |
| DEUS_Depth.js | 2688 | 42:ON | 78 | 0/0/0 | 72/43/3 | 61/59/3 | 15/15/2 | 0/0/0 | 22/21/1 | UF.DepthOcclusion, window.UF.Depth |
| DEUS_DepthCues.js | 1091 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | DEUS.DepthCues, UF.DepthCues |
| DEUS_DepthDemo.js | 524 | unlisted | 1 | 0/0/0 | 0/0/0 | 0/0/0 | 4/4/1 | 0/0/0 | 0/0/0 | DEUS.DepthDemo, UF.DepthDemo |
| DEUS_Dnd5e.js | 844 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Dnd5e, DEUS.Dnd5e |
| DEUS_Doors.js | 875 | 14:ON | 2 | 2/2/1 | 22/15/2 | 3/2/1 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Doors |
| DEUS_Ecology.js | 1242 | 22:ON | 2 | 4/3/1 | 5/3/1 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Ecology |
| DEUS_Environment.js | 952 | 39:ON | 2 | 2/2/1 | 9/5/2 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Environment |
| DEUS_FactionMenus.js | 1864 | 41:ON | 37 | 4/4/1 | 5/4/1 | 0/0/0 | 52/50/7 | 35/33/5 | 5/4/1 | window.UF.NewGameSetup |
| DEUS_Factions.js | 1846 | 10:ON | 7 | 2/2/1 | 2/1/1 | 0/0/0 | 13/13/2 | 8/7/2 | 0/0/0 | window.UF.Factions |
| DEUS_Fire.js | 1781 | 36:ON | 6 | 5/5/3 | 24/15/2 | 4/3/2 | 2/2/1 | 0/0/0 | 0/0/0 | — |
| DEUS_Floors.js | 925 | 17:ON | 1 | 0/0/0 | 4/3/1 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Rooms, window.UF.Floors |
| DEUS_FlowFields.js | 176 | 4:ON | 0 | 0/0/0 | 7/4/1 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | window.UF.Pathfinding |
| DEUS_Fluid.js | 1344 | unlisted | 3 | 7/6/1 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Fluid |
| DEUS_Fog.js | 810 | 26:ON | 3 | 2/2/1 | 59/35/3 | 3/3/1 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Fog |
| DEUS_Generator.js | 315 | 18:ON | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Generator |
| DEUS_HistoricalDemographics.js | 687 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.HistoricalDemographics |
| DEUS_History.js | 4227 | 11:ON | 5 | 0/0/0 | 11/9/1 | 0/0/0 | 10/10/2 | 4/3/2 | 0/0/0 | window.UF.History |
| DEUS_Interact.js | 1185 | 33:ON | 6 | 0/0/0 | 16/12/2 | 3/3/1 | 9/9/2 | 8/7/3 | 0/0/0 | window.UF.Interact |
| DEUS_Items.js | 1852 | 15:ON | 2 | 0/0/0 | 17/12/2 | 4/3/1 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Items |
| DEUS_Jobs.js | 2370 | 16:ON | 2 | 2/2/1 | 18/12/2 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Jobs |
| DEUS_LayerOverlays.js | 1333 | unlisted | 0 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | 0/0/0 | 2/2/1 | DEUS.LayerOverlays, UF.LayerOverlays |
| DEUS_Levels.js | 6733 | 37:ON | 13 | 4/4/2 | 128/81/4 | 6/6/3 | 25/25/2 | 1/1/1 | 0/0/0 | window.UF.Levels |
| DEUS_Lighting.js | 43 | 43:ON | 4 | 0/0/0 | 3/1/1 | 0/0/0 | 0/0/0 | 0/0/0 | 3/3/1 | — |
| DEUS_Look.js | 800 | 32:ON | 2 | 0/0/0 | 21/14/2 | 3/3/1 | 5/5/2 | 1/1/1 | 0/0/0 | window.UF.Look, window.UF.Assets |
| DEUS_Mint.js | 497 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Mint |
| DEUS_Move8.js | 97 | unlisted | 5 | 1/1/1 | 3/2/1 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | — |
| DEUS_Movement8D.js | 655 | 3:ON | 16 | 23/23/4 | 38/28/2 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | — |
| DEUS_NaturalConnections.js | 569 | 40:ON | 5 | 0/0/0 | 14/6/3 | 0/0/0 | 6/6/2 | 1/1/1 | 0/0/0 | UF.NaturalConnections |
| DEUS_Objects.js | 1537 | 12:ON | 3 | 3/3/1 | 48/29/2 | 4/3/2 | 4/4/2 | 0/0/0 | 0/0/0 | window.UF.Objects, window.UF.Sidecars |
| DEUS_Ownership.js | 772 | 38:ON | 4 | 2/2/1 | 1/1/1 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Ownership |
| DEUS_Perspective25D.js | 133 | 5:ON | 12 | 10/10/1 | 18/13/2 | 6/6/1 | 0/0/0 | 0/0/0 | 0/0/0 | — |
| DEUS_Projects.js | 1781 | 20:ON | 2 | 2/2/1 | 8/3/2 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Projects |
| DEUS_Select.js | 4083 | unlisted | 9 | 0/0/0 | 75/65/3 | 6/6/3 | 13/13/2 | 10/6/5 | 0/0/0 | DEUS.SelectX, UF.SelectX, UF.SelectX, window.DEUS.Select, window.UF.Select, window.UF.Target, window.UF.Tech |
| DEUS_Sheet.js | 3155 | 34:ON | 6 | 0/0/0 | 28/16/4 | 0/0/0 | 10/10/2 | 6/5/2 | 0/0/0 | window.UF.Sheet |
| DEUS_Spawners.js | 58 | 48:ON | 1 | 2/2/1 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | DEUS.Spawners |
| DEUS_Speech.js | 1402 | 31:ON | 5 | 8/5/4 | 17/9/4 | 3/3/1 | 3/3/2 | 0/0/0 | 0/0/0 | window.UF.Speech, UF.Visuals, UF.Visuals |
| DEUS_Stance.js | 1053 | 23:ON | 3 | 5/5/2 | 14/10/3 | 4/4/1 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Stance |
| DEUS_Stockpiles.js | 750 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Stockpiles, DEUS.Stockpiles |
| DEUS_Structural.js | 778 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Structural |
| DEUS_StructuralPhysics.js | 105 | 46:ON,47:ON | 2 | 0/0/0 | 0/0/0 | 2/2/1 | 2/2/1 | 0/0/0 | 0/0/0 | DEUS.StructuralPhysics |
| DEUS_Talk.js | 2502 | 35:ON | 5 | 0/0/0 | 3/1/1 | 0/0/0 | 7/7/2 | 0/0/0 | 0/0/0 | window.UF.Talk |
| DEUS_Taming.js | 241 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | DEUS.Taming, UF.Taming |
| DEUS_Test.js | 796 | 44:ON | 3 | 0/0/0 | 15/11/2 | 0/0/0 | 4/4/2 | 0/0/0 | 0/0/0 | window.DEUS.Test, window.UF.Test, UF.Time, window.UF.NewGameSetup |
| DEUS_Tiles.js | 1510 | 9:ON | 1 | 0/0/0 | 8/6/2 | 0/0/0 | 3/3/2 | 0/0/0 | 0/0/0 | window.UF.Tiles |
| DEUS_TimeSpeed.js | 608 | 28:ON | 6 | 2/2/1 | 16/14/4 | 3/3/1 | 12/12/2 | 1/1/1 | 0/0/0 | window.UF.Time |
| DEUS_Visuals.js | 307 | 2:ON | 4 | 6/6/2 | 16/12/2 | 4/4/2 | 0/0/0 | 0/0/0 | 0/0/0 | — |
| DEUS_Walls.js | 387 | 13:ON | 1 | 0/0/0 | 10/8/2 | 1/1/1 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.Walls |
| DEUS_Wildlife.js | 2900 | 21:ON | 4 | 4/4/2 | 20/14/2 | 2/2/1 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.ECS, window.UF.Wildlife |
| DEUS_World.js | 5062 | 7:ON | 16 | 21/20/4 | 116/83/2 | 2/2/1 | 9/9/2 | 0/0/0 | 0/0/0 | window.UF.World, window.UF.Space, window.UF.Sim |
| DEUS_WorldGen.js | 2553 | 8:ON | 1 | 0/0/0 | 6/6/2 | 0/0/0 | 2/2/1 | 0/0/0 | 0/0/0 | window.UF.WorldGen |
| DEUS_WorldItems.js | 129 | unlisted | 3 | 6/5/1 | 10/8/1 | 0/0/0 | 4/3/1 | 0/0/0 | 0/0/0 | DEUS.WorldItems, UF.WorldItems |
| UF_Households.js | 1074 | unlisted | 1 | 0/0/0 | 0/0/0 | 0/0/0 | 4/3/1 | 0/0/0 | 0/0/0 | UF.Households |
| UF_Time.js | 590 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | UF.Time |
| test_build_vertical_ingame.js | 49 | unlisted | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | — |

Coupling cells read as tokens/lines/names. `Listed` is the `plugins.js` index and ON/OFF, or `unlisted`. `Patches` is the count of `.prototype` assignments the lexer saw, which includes assignments inside the plugin's own classes.

## plugins.js order

Index, then name. All 49 entries are `status: true`. Parameters are empty except where noted. The committed `DEUS_World` parameters do not contain `Seed`. The official run inserted `Seed` only in a disposable copy.

| Index | Name | Load this run | Class | Recommendation | Proposed pillar |
|---:|---|---|---|---|---|
| 0 | DEUS_AssetStreaming | inferred injection | STUB | DISABLE | — |
| 1 | DEUS_Core | observed (`[CORE] UF_Core plugin loaded successfully!`) | CORE SIM | KEEP | P1 shared clock and core state |
| 2 | DEUS_Visuals | inferred injection | RENDER-UI | KEEP | P4 presentation |
| 3 | DEUS_Movement8D | inferred injection | CORE SIM | KEEP | P3 colony simulation |
| 4 | DEUS_FlowFields | inferred injection | UNKNOWN | DISABLE | — |
| 5 | DEUS_Perspective25D | inferred injection | RENDER-UI | Owner decision | — |
| 6 | DEUS_ColonyOverseer | observed suite `overseer` | RENDER-UI | KEEP | P5 player interface |
| 7 | DEUS_World | observed suites `world`, `spawn`; check `world.in_area_map` seed 1920951434 | WORLDGEN | KEEP | P2 world generation |
| 8 | DEUS_WorldGen | observed suites `worldgen`, `biomes` | WORLDGEN | KEEP | P2 world generation |
| 9 | DEUS_Tiles | observed suites `tiles`, `ground` | WORLDGEN | KEEP | P2 world generation |
| 10 | DEUS_Factions | observed suites `factions`, `skins` | CORE SIM | KEEP, do not extend | P3 colony simulation |
| 11 | DEUS_History | observed suite `history` registered; the history suite body did not run | CORE SIM | KEEP | P3 colony simulation |
| 12 | DEUS_Objects | observed suite `objects` | CORE SIM | KEEP | P3 colony simulation |
| 13 | DEUS_Walls | observed suite `walls` | CORE SIM | KEEP | P3 colony simulation |
| 14 | DEUS_Doors | observed suite `doors` | CORE SIM | KEEP | P3 colony simulation |
| 15 | DEUS_Items | observed suite `items` | CORE SIM | KEEP | P3 colony simulation |
| 16 | DEUS_Jobs | observed suites `dig_through_floor`, `jobs` | CORE SIM | KEEP | P3 colony simulation |
| 17 | DEUS_Floors | observed suite `floors` | CORE SIM | KEEP | P3 colony simulation |
| 18 | DEUS_Generator | inferred injection; callers exist | RENDER-UI | KEEP | P4 presentation |
| 19 | DEUS_Colonists | observed suite `colonists` | CORE SIM | KEEP | P3 colony simulation |
| 20 | DEUS_Projects | observed suites `projects`, `settlement` | CORE SIM | KEEP | P3 colony simulation |
| 21 | DEUS_Wildlife | observed suites `wildlife`, `wildlife_seeds` | CORE SIM | KEEP | P3 colony simulation |
| 22 | DEUS_Ecology | observed suite `ecology` | CORE SIM | KEEP | P3 colony simulation |
| 23 | DEUS_Stance | observed suite `stance` | RENDER-UI | KEEP | P4 presentation |
| 24 | DEUS_Combat | observed suite `combat` | CORE SIM | KEEP | P3 colony simulation |
| 25 | DEUS_Anim | observed suite `anim` | RENDER-UI | KEEP | P4 presentation |
| 26 | DEUS_Fog | observed suite `fog` | RENDER-UI | KEEP | P4 presentation |
| 27 | DEUS_DayNight | observed suite `daynight` | RENDER-UI | KEEP | P4 presentation |
| 28 | DEUS_TimeSpeed | observed suite `timespeed` | RENDER-UI | KEEP | P1 shared clock and core state |
| 29 | DEUS_Camera | observed suite `camera` | RENDER-UI | KEEP | P4 presentation |
| 30 | DEUS_Culling | observed suite `culling` | RENDER-UI | KEEP | P4 presentation |
| 31 | DEUS_Speech | observed suites `speech`, `overhead` | RENDER-UI | KEEP | P4 presentation |
| 32 | DEUS_Look | observed: `ownership.inspection_visible` printed a Look line | RENDER-UI | KEEP | P5 player interface |
| 33 | DEUS_Interact | suite name `look` is also registered here; which registration won is not isolated | RENDER-UI | KEEP | P5 player interface |
| 34 | DEUS_Sheet | observed suite `sheet` | RENDER-UI | KEEP | P5 player interface |
| 35 | DEUS_Talk | observed suite `talk` | RENDER-UI | KEEP | P5 player interface |
| 36 | DEUS_Fire | observed suite `fire` | CORE SIM | KEEP | P3 colony simulation |
| 37 | DEUS_Levels | observed suites `vertical`, `natural_walls`, `flooding`, `strata`, `sparse_outer` | WORLDGEN | KEEP | P2 world generation |
| 38 | DEUS_Ownership | observed suite `ownership` | CORE SIM | KEEP | P3 colony simulation |
| 39 | DEUS_Environment | observed suite `environment` | CORE SIM | KEEP | P3 colony simulation |
| 40 | DEUS_NaturalConnections | observed suite `natural_connections` | WORLDGEN | KEEP | P2 world generation |
| 41 | DEUS_FactionMenus | observed suites `faction_menus`, `title`, `load`, `setup` | RENDER-UI | KEEP, do not extend | P5 player interface |
| 42 | DEUS_Depth | observed suites `depth`, `layers_flat` | RENDER-UI | KEEP | P4 presentation |
| 43 | DEUS_Lighting | inferred injection | STUB | DISABLE | — |
| 44 | DEUS_Test | observed suites `selftest`, `smoke`, `perf`, `native_starting_gear`, `native_survival_dying`, `native_perf_4x_benchmark` | TEST-DEMO | KEEP | P6 test harness |
| 45 | DEUS_CellularFluids | inferred injection | DUPLICATE and STUB | DISABLE | — |
| 46 | DEUS_StructuralPhysics | inferred injection of the first entry | STUB | DISABLE | — |
| 47 | DEUS_StructuralPhysics | configured duplicate; MZ does not load it | DUPLICATE | DISABLE with the first entry | — |
| 48 | DEUS_Spawners | inferred injection | STUB | DISABLE | — |

"Inferred injection" means the name was in this setup batch and later plugins in the same batch left their own evidence. It is not a per-file log. Script-tag failure after `checkPluginErrors` would not be printed as a plugin error by that one early check.

## Files not listed in plugins.js

| File | Lines | Load this run | Class | Recommendation | Proposed pillar |
|---|---:|---|---|---|---|
| DEUS_Containers.js | 1569 | observed Core require | CORE SIM | KEEP | P3 colony simulation |
| DEUS_Bag.js | 743 | observed Core require | RENDER-UI | KEEP | P5 player interface |
| DEUS_Stockpiles.js | 750 | observed Core require | CORE SIM | KEEP | P3 colony simulation |
| DEUS_Fluid.js | 1344 | observed Core require | CORE SIM | KEEP | P3 colony simulation |
| DEUS_Conditions.js | 1187 | observed Core require | CORE SIM | KEEP | P3 colony simulation |
| DEUS_Select.js | 4083 | Core require failed; suite `select` observed four times | RENDER-UI | KEEP | P5 player interface |
| DEUS_Dnd5e.js | 844 | observed Core require | CORE SIM | KEEP | P3 colony simulation |
| DEUS_Callings.js | 407 | observed Core require | CORE SIM | KEEP | P3 colony simulation |
| DEUS_HistoricalDemographics.js | 687 | Core require failed; presence inferred | CORE SIM | KEEP | P3 colony simulation |
| DEUS_DeathForensics.js | 545 | observed Core require | CORE SIM | KEEP | P3 colony simulation |
| UF_Households.js | 1074 | observed Core require | CORE SIM | KEEP, do not extend | P3 colony simulation |
| DEUS_CombatRT.js | 69 | not boot-loaded | UNKNOWN | do not enable | — |
| DEUS_CombatUI.js | 72 | not boot-loaded | UNKNOWN | do not enable | — |
| DEUS_Move8.js | 97 | not boot-loaded | DUPLICATE | do not enable | — |
| DEUS_DepthCues.js | 1091 | not boot-loaded | RENDER-UI | leave unlisted | — |
| DEUS_DepthDemo.js | 524 | not boot-loaded | TEST-DEMO | leave unlisted | — |
| DEUS_LayerOverlays.js | 1333 | not boot-loaded | RENDER-UI | leave unlisted | — |
| DEUS_Mint.js | 497 | not boot-loaded | UNKNOWN | leave unlisted | — |
| DEUS_Structural.js | 778 | not boot-loaded | CORE SIM | Owner decides whether to register | — |
| DEUS_Taming.js | 241 | not boot-loaded | UNKNOWN | leave unlisted | — |
| DEUS_WorldItems.js | 129 | not boot-loaded | UNKNOWN | Owner decides whether to register | — |
| UF_Time.js | 590 | not boot-loaded | DUPLICATE | leave in place, do not register | — |
| test_build_vertical_ingame.js | 49 | not boot-loaded | TEST-DEMO | leave unlisted | — |

Core's observed require log (`game_runtime.log` in the disposable snapshot, 2026-10-03T04:01:35Z):

```text
[CORE] Synchronously loaded companion plugin DEUS_Containers
[CORE] Synchronously loaded companion plugin DEUS_Bag
[CORE] Synchronously loaded companion plugin DEUS_Stockpiles
[CORE] Synchronously loaded companion plugin DEUS_Fluid
[CORE] Synchronously loaded companion plugin DEUS_Conditions
[CORE] Companion plugin DEUS_Select NOT loaded: Cannot find module './DEUS_Select.js'
[CORE] Synchronously loaded companion plugin DEUS_Dnd5e
[CORE] Synchronously loaded companion plugin DEUS_Callings
[CORE] Companion plugin DEUS_HistoricalDemographics NOT loaded: Cannot find module './DEUS_HistoricalDemographics.js'
[CORE] Synchronously loaded companion plugin DEUS_DeathForensics
[CORE] Synchronously loaded companion plugin UF_Households
```

The `require` stack on the two failures is the snapshot `index.html`. The files exist at `js/plugins/`. The relative paths Core tries do not match NW's module resolution from that page. `DEUS_Select.js` still ran: `AVAILABLE SUITES` contains the name `select` four times. That count matches two script injections (Core's `loadScript`, and ColonyOverseer's unguarded `loadScript`) times two `registerSelectChecks` calls (`DEUS_Select.js` 2681 on the boot hook, and 4079 at end of file, which registers `UF.Test.suite("select"` at 3381). The four registrations are observed. The 2×2 explanation is inferred.

`DEUS_HistoricalDemographics.js` has no own log line. History refuses New Game at line 399 without it, Callings, and Dnd5e. Callings and Dnd5e were require-loaded. The run reached a map with founders (the history start capture below did not take the "no year-1 history" skip in `DEUS_History.js` 3832–3835). HistoricalDemographics is therefore inferred loaded through History's own require or `loadScript`, not through the failed Core require.

## Simulation modules

These are not `plugins.js` entries. `UF.Sim.require` resolved these paths during the run (observed):

- `js/sim/worldgen/worker.js`
- `js/sim/worldgen/DEUS_Biomes.js`
- `js/sim/worldgen/DEUS_Hydrology.js`
- `js/sim/geology/caves.js` (from WorldGen)
- `js/sim/host/tick.js`
- `js/sim/structural/index.js` (from Jobs)

Every other file under `game/js/sim/` is unknown at runtime for this run. The list is in `scan_summary.txt` under `SIM`. That includes `sim/society/DEUS_Militia.js`, `DEUS_Quartermaster.js`, `DEUS_Treasury.js`, and `identity.js`, `sim/spawner/`, `sim/combat_rt/`, `sim/taming/`, and `sim/world_items/`. They are not faction-plugin files. DEC-037 still forbids implementing faction or society features. This audit does not load them and does not extend them.

## Flagged files

### Short listed files

`DEUS_AssetStreaming.js` (47 lines) wraps `PIXI.Assets.backgroundLoad` and `unload`. It patches no engine prototype. A search of `game/js/plugins` found `UF.Assets.backgroundLoad` only at the definition (`DEUS_AssetStreaming.js` 17). Core's `window.UF = window.DEUS` abandons the object created by `var UF` if both files evaluate in order, and Look then writes a different `UF.Assets`. No runtime probe read `window.UF.Assets`'s identity. Recommendation DISABLE in a future lane. Uncertainty remains until that identity is read at runtime.

`DEUS_Lighting.js` (43 lines) patches `Spriteset_Map.createLowerLayer` and `update`, creates a quarter-size `PIXI.RenderTexture`, and adds a sprite with `PIXI.BLEND_MODES.ADD`. `updateLighting` (lines 36–41) sets `tint` to `0xFFFFFF` and does not sample a LUT. It is a stub with a real render side effect. It overlaps DayNight, which owns the celestial cycle and is observed. Recommendation DISABLE. MERGE INTO `DEUS_DayNight` is the worse option: the placeholder ADD sprite is not DayNight's lighting model. White diagonal streaks appear in later screenshots. Lighting was not isolated as their source.

`DEUS_Spawners.js` (58 lines) aliases `Game_Map.prototype.setup` and calls `carveGeology` / `onChunkLoad` with hardcoded `z = -1` and biome `"temperate"` (lines 46–55). Both functions `console.log`. The real spawner lives under `game/js/sim/spawner/` and was not in the observed `UF.Sim.require` list. Recommendation DISABLE.

`DEUS_CellularFluids.js` (87 lines) does `window.UF.World = window.UF.World || { ticks: 0, state: {} }` (line 14), so it does not replace World if World already exists (World is index 7, this file is index 45). It wraps `UF.World.update` if that function exists, and sets `window.UF.Fluids` (line 83). `UF.Fluids` is a different object from `UF.Fluid`, which `DEUS_Fluid.js` line 1285 assigns and which was require-loaded. A plugins search found `UF.Fluids` only inside CellularFluids. Recommendation DISABLE CellularFluids. KEEP `DEUS_Fluid.js`.

`DEUS_StructuralPhysics.js` (105 lines) looks for `DEUS.Core.update` (lines 21–26). That is not how Core exposes its tick. The fallback patches `Scene_Map.prototype.update` and `Sprite_Character.prototype.update`. `hasAnchor` (lines 52–56) returns `false`. The body walks `DEUS.World.blocks`, which is not the world model `DEUS_World.js` publishes as `UF.World`. The second plugins.js entry does not load. `DEUS_Structural.js` is a different, unlisted plugin (`UF.Structural` at line 764). Jobs' observed structural work is `sim/structural/index.js`, not this stub. Recommendation DISABLE StructuralPhysics. Do not merge it into `DEUS_Structural.js`.

`DEUS_FlowFields.js` (176 lines) is over the 150-line cut and was still inspected. It builds a `FlowField` class and assigns `UF.Pathfinding.requestFlowField` / `getFlowDir` (lines 156–167). A plugins search for `requestFlowField` and `getFlowDir` hit only this file. `DEUS_Movement8D.js` is the live 8-direction path (patches on `distancePerFrame`, `moveStraight`, `moveDiagonally`, `findDirectionTo`, and player input). Zero callers do not prove the file can never be reached by a string built at runtime. Classification UNKNOWN. Recommendation DISABLE, with that uncertainty.

`DEUS_Perspective25D.js` (133 lines) is the only plugins file that assigns `Game_CharacterBase.prototype.screenY` (line 44) and `screenZ`. It also returns early from `Sprite_Character.update` for offscreen sprites, which overlaps `DEUS_Culling.js` (index 30, observed). The header says pure 2D. The screenshots show a top-down tile map and a HUD. That does not prove the screenY/screenZ lean is gone, and it does not prove the file failed to evaluate. Recommendation: Owner decision. It is live render code if the inferred injection evaluated. It is not classified as a stub.

`DEUS_Generator.js` (315 lines) has no engine patch and no suite. `DEUS_Colonists.js` 732 and `DEUS_ColonyOverseer.js` 505 call `UF.Generator` when it is present. KEEP.

### Unlisted short and duplicate candidates

`DEUS_CombatRT.js` (69), `DEUS_CombatUI.js` (72), and `DEUS_Move8.js` (97) are not in `plugins.js` and have no Core companion entry. Each `require`s a sim module and returns if that require fails, then patches `Game_Map`, `Scene_Map`, or `Game_CharacterBase`. `tools/combat_rt/test_combat_rt.js` lines 609–611 require Move8, CombatRT, and CombatUI. That is test-only. `DEUS_Combat.js` (index 24) is the observed combat plugin. `DEUS_Movement8D.js` is the listed 8-direction plugin. Recommendation: do not enable these three. MOVE TO `archive/` only if the Owner confirms that path is abandoned. Product intent is UNKNOWN.

`DEUS_WorldItems.js` (129) is unlisted. The header says not to register it from a plugin-list edit in this kind of lane. It `require`s `../sim/world_items` and, if that loads, patches `canPass`, `canPassDiagonally`, and `Scene_Map.update`. `tools/world_items/test_world_items.js` line 642 requires the plugin. Not boot-loaded. Owner decides whether a future lane registers it.

`DEUS_DepthCues.js` exports `UF.DepthCues` (line 1089). `DEUS_DepthDemo.js` is the demo driver (`UF.DepthDemo`, and it string-references DepthCues). `DEUS_LayerOverlays.js` exports `UF.LayerOverlays`. `DEUS_Depth.js` line 84 and `DEUS_Select.js` use `UF.LayerOverlays` only when present. None of the three were boot-loaded. Leave them unlisted until the Owner asks for a registration lane. DepthDemo is TEST-DEMO.

`DEUS_Mint.js` exports `UF.Mint` (line 494). No boot loader was found. A full consumer index was not finished, so "no callers" is not claimed. Leave unlisted. UNKNOWN.

`DEUS_Taming.js` exports `UF.Taming` (line 235) and requires `sim/taming`. Not boot-loaded. `sim/taming` was not in the observed require log. Leave unlisted. Owner decides. Do not implement taming here.

`DEUS_Structural.js` is unlisted. `DEUS_Floors.js` 324 and 381 use `UF.Structural` when present and say a solid neighbour attaches with `checked` false when the plugin is absent. `DEUS_Interact.js` 442–444 calls `UF.Structural.explain` when present. The structural module that actually resolved this run is `sim/structural` via Jobs. Recommendation: Owner decides whether to register `DEUS_Structural.js`. Do not treat StructuralPhysics as its substitute.

`test_build_vertical_ingame.js` (49 lines) is unlisted TEST-DEMO. The lexer saw window names `test_build_room_above` and `runSuite`. It did not load at boot. Leave unlisted.

`UF_Time.js` (590 lines) in `game/js/plugins` is a multi-domain clock that assigns `UF.Time` (line 569). It is not in `plugins.js` and not in the Core companion list. The live clock at boot is Core's `$ufTime`, and the live `UF.Time` name after index 28 is TimeSpeed's controller. `archive/plugins/UF_Time.js` is a different 17-line shim. `tools/benchmark_performance.js` line 40 and `tools/test_time_domains_proof.js` line 39 require the live `game/js/plugins/UF_Time.js`. Recommendation: leave the file in place, do not register it, and do not archive it while those tools require that path.

`DEUS_Culling.js` assigns `UF.Camera` at line 414 inside a test and restores it at line 527. That is not a boot replacement of `DEUS_Camera.js`. The plugin export is `UF.Culling` (line 312). KEEP.

### Factions, menus, households (DEC-037)

DEC-037 forbids new faction and society work. This lane does not add any.

`DEUS_Factions.js` is configured ON at index 10 and observed: suites `factions` and `skins` registered. It patches `Game_Map.update`, `Scene_Map.createAllWindows` / `update`, and `Scene_Boot.start`, and exports `UF.Factions` (line 91). KEEP as already wired. Do not extend.

`DEUS_FactionMenus.js` is configured ON at index 41 and observed: suites `faction_menus`, `title`, `load`, `setup`. It owns `window.UF.NewGameSetup` (line 287), which `DEUS_Test.js` 204 fills with the requested year when the harness is active. KEEP as already wired. Do not extend.

`UF_Households.js` is not in `plugins.js`. Core require-loaded it (observed). It exports `UF.Households` at line 1032 and patches `Scene_Boot.start` at 1064. Callers that tolerate a missing plugin and use it when present include `DEUS_Colonists.js` (many sites, including `formPair` at 2605 and `reconcile` at 2864), `DEUS_Projects.js` 591 and 1382, `DEUS_Ownership.js` 290, `DEUS_NaturalConnections.js` 100, `DEUS_Levels.js` 3883, `DEUS_History.js` 1707, `DEUS_Containers.js` 320, `DEUS_Doors.js` 581, and `DEUS_Environment.js` 311. KEEP as an already-wired boot companion. Do not extend. Core's comment at lines 102–104 says to register it in `plugins.js` when the editor is closed and then drop the companion line. That registration is a future lane, not this one.

`DEUS_Simulation_Core.js` is absent. It is not configured, not a companion, and not a sim module that resolved. Unproven and not a working-tree-only file on this lane or on main at capture.

## Main worktree supplement

Read-only capture rechecked 2026-10-02 23:15:44 -05:00. Main worktree `C:\Users\snewt\OneDrive\Desktop\UF`, HEAD `038a02c35922df825fd7d47d948d7747d4e56755`. Status:

```text
 M docs/STATUS.md
 M docs/VISION.md
 M game/package.json
?? docs/WBS_INDEX.md
?? docs/WBS_ORG.md
?? docs/WBS_SPLIT.md
?? docs/baseline/
```

The brief's "uncommitted WorldGen and untracked Simulation_Core" is stale at this capture. `git -C main diff --quiet -- game/js/plugins/DEUS_WorldGen.js` exits 0. Git blob id of `DEUS_WorldGen.js` is `31024e3e3d286992dda363172cac005b772c3af0` on both main and this lane. `DEUS_Simulation_Core.js` is absent. No file matching `*Simulation_Core*` was found under main.

`game/package.json` differs. SHA-256 of the working-tree bytes: main `51ace1f645ac6929bcd65096348e093590ba46c754a308f7186ffe48177c3c04`, this lane `e76d868a3f9860acb09ee17653168815e4af118455defac1342f4d3667220ede`. Git blob ids: main `46e573bdfe618fd09fe538cf50a2e8384609f70a`, lane `fa92374c4a8d5376ece228acba03d926ca491f1b`. Those main bytes were not copied, executed, or used as the audit source. Other dirty main paths are docs, outside the plugin supplement.

## Native run (attempt 1)

One official run. A second identical run after the docs was not started. Plugin bytes did not change (below). The run is red. There is no RESULT line. ORG-0.2's 259 pass / 16 fail and the baseline report's 224/11 and 118/19 are other sources. They are not this run.

| Field | Value |
|---|---|
| Source SHA | `86ec44c2055f766d17448c8d8f38f800b559059c` |
| Start | 2026-10-02 23:01:34 -05:00 |
| End | 2026-10-02 23:03:34 -05:00 |
| Exit | 2 |
| Year | `DEUS_TEST_YEAR=500`, observed `HARNESS New Game year 500 (requested 500)` |
| Snapshot | `scratchpad/lane-plugin-audit/snapshot-seed1920951434` (disposable; not committed) |
| Seed override | only `DEUS_World.parameters.Seed` = `1920951434` in the copy's `plugins.js` |
| NW working directory | the snapshot (`game_runtime.log` stayed there) |
| Command | `run_tests.bat --game <snapshot>` |
| RESULT line | none |

`tools/test_snapshot.js` was not used. It rewrites `plugins.js`. The lane helper `scratchpad/lane-plugin-audit/make_snapshot.js` copies `js`, `data`, `index.html`, and `package.json`, junctions the other asset directories, and inserts only that Seed parameter. Validation reverts that one block and compares to the pre-image. Recorded result: PASS. Source `plugins.js` SHA-256 `e5f36442b8fa05da2ae56179c22017341d62f5e9247a7c6497b626355fde197f`. Snapshot `plugins.js` SHA-256 `84a4a38ce14ff64bbe0859ce00def9268028d1de220b4cdb0d9b19381c36e87e`. 49 entries. No missing plugin files. After the run, all 72 hashes in `hashes_before.txt` (`plugins.js` plus 71 plugin files) still match the live tree: 72 ok, 0 mismatch, 0 missing.

No `nw.exe` was running before the launch. None was killed. The runner's stderr says:

```text
HARNESS: nw.exe exited after 120.0 s with code 0 before the harness finished.
HARNESS: results file has no RESULT line (the run didn't finish).
```

`DEUS_Test.js` writes `RESULT:` inside `finish` (line 183) and only then schedules `process.exit` (line 184). The 180000 ms watchdog (line 234) would have written `watchdog: whole run took longer than 180 s` plus a RESULT line. This run ended at 120.0 s with NW exit code 0 and no RESULT line. The cause is unknown. The runner text mentions another agent killing `nw.exe`. This writer did not kill any process. No `process.exit(0)` and no 120000 ms timer were found in `DEUS_Test.js`, `tools/run_tests.js`, `main.js`, or `package.json`. `main.js` `hookNwjsClose` quits the NW app on window close, which can exit 0. That is an open hypothesis, not a finding.

Partial log only, from `results.txt`. These counts are not a RESULT line:

- Suites started: smoke, ownership, ecology, colonists, world. World stopped at the shot line for `world.eight_way.png`.
- PASS lines: 48. FAIL lines: 6.
- FAIL `ecology.renewable_timer` — chop left `oak_stump`; grown stayed 0.
- FAIL `ecology.native_regrow_single` — both timers 0; cell `berry_bush_bare`.
- FAIL `colonists.colonists_exist` — detail text `2 colonists present`.
- FAIL `world.path_blocked_fast` — no `world:unitBlocked` within 90 frames.
- FAIL `world.path_gives_up_when_crowded` — no give-up within 304 frames.
- FAIL `world.path_replans` — arrived in 12 steps; the check wanted a detour past 14.
- `world.in_area_map` passed with seed 1920951434. That is the observed proof that `DEUS_World` read the snapshot Seed parameter.

`AVAILABLE SUITES` also listed many suites that never started, including history, factions, depth, and the `isDefault: false` native suites. Default-suite registration on `Scene_Boot.start` is why names appear before their suite body runs. A printed name proves the registration code ran. It does not prove the suite body ran.

## Screenshots

All 11 PNGs under `tasks/ORG-0.3/lane-plugin-audit/evidence/attempt1/` were inspected. Times are local write times on 2026-10-02. They are evidence of what the frame showed. They are not a plugin classification.

| File | Bytes | Time | What the frame showed |
|---|---:|---|---|
| history.start_zoom1.png | 151394 | 11:02:03 PM | Home camp, two figures, red banner, sparse grass, HUD, paused. The on-screen zoom readout was described as 0.5x. |
| history.start_zoom23.png | 151316 | 11:02:03 PM | Same camp family as zoom1. Byte size differs, so the files are not identical. The description also said 0.5x. The zoom control is not proven to have moved. |
| history.start_other.png | 230296 | 11:02:03 PM | A different camp: many similar figures on brown soil beside stone and snow-dusted trees, black void wedges, paused. |
| smoke.map.png | 117328 | 11:02:07 PM | The same pair and banner, grass, clock reading 1x Speed rather than paused. No error printer. |
| ownership.owned_bed.png | 190576 | 11:02:10 PM | Grass, figures, label "Straw bed", white diagonal streaks, 0.5x, 1x Speed. |
| ecology.replenished_prey.png | 275278 | 11:02:12 PM | Water, stone, snow-dusted trees, a figure labelled Deer, white streaks. |
| ecology.replenished_monster.png | 284043 | 11:02:12 PM | Snow-dusted trees, a figure labelled Troll, checkerboard and black terrain, white streaks. |
| world.unit_in_view.png | 89912 | 11:02:21 PM | Repeating dark stone at 2.0x. The check text said a sprite was created. The frame description did not identify a distinct character sprite. |
| world.round_seam_wrap.png | 70709 | 11:02:22 PM | Dark stone field at 2.0x. Linear marks read as terrain cracks rather than the later diagonal overlay. |
| world.path_around_wall.png | 176638 | 11:02:49 PM | Level label +2, orange roof, black voids, mixed terrain, one figure, white diagonal streaks, 0.5x. |
| world.eight_way.png | 70208 | 11:03:34 PM | Level label -5, a full frame of repeating dark vertical stripes, 1x, HUD. It does not show eight directions. Last shot; the log ends on this SHOT line. |

The three `history.start_*.png` files are the Scene_Map start capture in `DEUS_History.js` 3786–3840. Capture is armed when `UF.Test.only` is unset (this run passed no `--only`). They are not the history suite. `SUITE history` never printed. `UF.Time.pause()` in that capture is TimeSpeed's pause, which is further evidence TimeSpeed's `UF.Time` object was the one in use.

HUD on these frames shows a level label, a zoom control, a speed readout, and a bottom letter bar. That is consistent with Camera, TimeSpeed, and the selection/overseer chrome being on screen. It does not attribute each widget to one file, and it does not prove Perspective25D is idle.

## Gates

| Check | Result |
|---|---|
| `git diff --check 565dc5ae HEAD` | exit 0 |
| `run_tests.bat --game <snapshot>` seed 1920951434 / year 500 | exit 2, no RESULT line, red |
| `node tools/ops/run_gate.js --check-lists` | exit 1, `CHECK-LISTS: 122 violation(s)` |
| `node tools/ops/run_gate.js` default mode | not run. Default mode executes suites and is not read-only. |
| `node tools/ops/run_gate.js --screen` | not run |
| `node tools/run_tests.js` against the live `game/` | not run. That path writes `game/test_output`. |

The 122 check-list violations are pre-existing list hygiene on this source (unlisted tracked suites, `NEEDS_NWJS_IN_GATE`, `NEEDS_NWJS_UNRECORDED`). They are not a plugin-byte change and they are not a native RESULT. The full list is `tasks/ORG-0.3/lane-plugin-audit/evidence/static/check_lists.txt`.

## Owner decisions this inventory asks for

No decision below was executed.

1. DISABLE in a future lane, if the Owner agrees: `DEUS_AssetStreaming`, `DEUS_Lighting`, `DEUS_Spawners`, `DEUS_CellularFluids`, `DEUS_StructuralPhysics` (both plugins.js entries), `DEUS_FlowFields`. FlowFields and AssetStreaming stay uncertain until a runtime probe or an out-of-tree caller is shown.
2. Leave the duplicate unlisted movement/combat files unloaded (`DEUS_Move8`, `DEUS_CombatRT`, `DEUS_CombatUI`) unless the Owner wants them archived.
3. Decide separately whether to register `DEUS_Structural.js`, `DEUS_WorldItems.js`, `DEUS_Taming.js`, `DEUS_DepthCues.js`, `DEUS_LayerOverlays.js`, or `DEUS_Mint.js`. This audit does not register them.
4. `DEUS_Perspective25D.js` stays until the Owner chooses. Size and the "pure 2D" header are not a classification.
5. KEEP `DEUS_Factions`, `DEUS_FactionMenus`, and `UF_Households` as already wired. DEC-037 stands. Do not extend them in the lane that applies the disable list.
6. `UF_Time.js` stays on disk while `tools/benchmark_performance.js` and `tools/test_time_domains_proof.js` require it. Do not register it beside TimeSpeed.
7. The white diagonal streaks and the 120 s NW exit code 0 are unexplained. They are not assigned to a plugin.

Pillars named above are labels for a future map only: P1 shared clock and core state, P2 world generation, P3 colony simulation, P4 presentation, P5 player interface, P6 test harness.

## Acceptance

Native green: no. Cross-family review: not run. Deus CONFIRMED: not issued. This document can be reviewed while those gates stay open. The writer does not pass, merge, tag, or close the lane.
