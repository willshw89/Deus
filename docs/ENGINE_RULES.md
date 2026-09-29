# ENGINE_RULES: the one engineering rulebook (Project DEUS)

Rewritten 2026-09-29 (lane-pm-streamline; PM under DEC-042). This file holds every engineering rule. `ENGINEERING_STANDARD.md`, `QUALITY_ENGINEERING_POLICY.md`, `INVARIANT_REGISTRY.md`, `PERFORMANCE_ARCHITECTURE.md`, `AGENT_QUALITY_LEARNING_LOOP.md` and `TEST_CLASSIFICATION.md` now hold only what this file does not. `AGENTS.md` holds the agent rules; `docs/ARCHITECTURE.md` holds the subsystem map. Where a rule here conflicts with an older doc, this file wins. Where it conflicts with an Owner decision in `docs/OWNER_DECISIONS.md`, the decision wins.

## 1. Environment (checked 2026-09-29)
- RPG Maker MZ v1.10.0 (`game/js/rmmz_core.js` says `v1.10.0`) at `C:\Program Files (x86)\Steam\steamapps\common\RPG Maker MZ\`. The editor is `RPGMZ.exe`; the Playtest runtime is its `nwjs-win\nw.exe`, NW.js 0.48.4. Project file: `game/game.rmmzproject`.
- Node.js v24.19.0 at `C:\Program Files\nodejs\`. Host Node runs the headless suites and the tools. It is not the game runtime and cannot see RMMZ globals.
- Shells: Windows PowerShell 5.1 and Git Bash. Never generate RMMZ JSON with `ConvertTo-Json` (§4).
- Canonical working copy: `C:\Users\snewt\OneDrive\Desktop\UF`, branch `main`. Lanes work in `%USERPROFILE%\.deus_worktrees\<lane>` on `task/<lane>`. The folder is inside OneDrive; pause sync during heavy writes or it makes "-conflict" copies.

## 2. Where code goes
- The engine core is read-only: `game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/**`. Never edit them.
- Behaviour lives in two places. `game/js/plugins/DEUS_*.js`: one system per plugin, standard MZ header (`@target MZ`, `@plugindesc [DEUS <System>] ...`, `@help`, `@base` / `@orderAfter` for dependencies). `game/js/sim/**`: host-agnostic CommonJS modules with no RMMZ global, no clock and no `Math.random`; the caller passes data, time and an rng; plugins and Node tests both `require()` them.
- Only `DEUS_Core.js` may alias RMMZ core prototypes in new work. Other plugins register callbacks with `DEUS.Core` or listen on `UF.Events` (`world:created`, `world:areaBuilt`, ...). Most existing plugins alias core methods directly (a 2026-09-29 grep matched 51 of 62 files, some of them the plugin's own subclasses); that is debt, not licence. A plugin that replaces a core method outright lists it under "Replaced core methods" in its `@help`.
- One global namespace: `window.DEUS`, with `window.UF` as its alias (`DEUS_Core.js:269-270`).
- `game/js/plugins/UF_*.js` are 16-line forwarders to the `DEUS_` file of the same name, with two exceptions: `UF_Households.js` (1,073 lines, a real plugin, loaded only by DEUS_Core's companion list) and `UF_Time.js` (589 lines, loaded by nothing in the game; `tools/test_time_domains_proof.js` and `tools/benchmark_performance.js` `require()` it).
- Logic is general, content is data (AGENTS.md Rule 14): materials, species, objects and recipes live in `game/data/DEUS_WorldCatalog.json` and `game/data/sim/*.json`, never as literals in a plugin. Art is reached through the catalogue and `game/data/DEUS_AssetIndex.json`, not by file paths scattered in code.
- All animation is sprite frames (AGENTS.md Rule 12, VISION V108): no code-made motion, squash, sway, rotation or shader effect. Ultima VII art is reference or a `U7_`-prefixed stand-in only (Rule 8).
- Any change to `game/index.html` or `game/package.json` gets a line in `docs/STATUS.md` saying why.

## 3. Plugin loading
- Every plugin the game needs is registered in `game/js/plugins.js` with `status: true`, in dependency order. For new work that is the only load path.
- Not allowed for new work: `require()` companion lists (`DEUS_Core.js:89-105`, `companionPlugins`, loads 11 plugins this way; a companion loaded by `require()` cannot see RMMZ globals unless DEUS_Core first copies them into `global`, and the loop logs only the last error) and `PluginManager.loadScript` chains (`DEUS_Items.js:42-47`, `DEUS_History.js:217-220`, `DEUS_ColonyOverseer.js:49-51`, `DEUS_Camera.js:174-176`). Each existing one is removed in the lane that registers its plugin in `plugins.js`.
- Boot check, to be built: `tools/check_plugin_boot.js` starts the game in NW.js on a snapshot copy and prints one line per `DEUS_*.js` file: registered in `plugins.js` (yes/no), loaded (yes/no), loaded twice (yes/no). It exits non-zero when a registered plugin did not load, when any plugin loaded twice, or when a `DEUS_*.js` file is neither registered nor listed as retired. Until it exists, "the plugin loads" is unproven: `DEUS_Bag` never loaded in the game while its Node test passed 5/5 (audit, 2026-09-29).
- `tools/check_deus_syntax.js` runs host `node -c` over every `DEUS_*.js`. It proves syntax only, not that a plugin loads or runs in NW.js.

## 4. The RMMZ editor overwrites files
The editor keeps the database and plugin list in memory and writes them out when it saves. Protected files: `game/js/plugins.js` and the editor-owned `game/data/*.json` (`Actors`, `Animations`, `Armors`, `Classes`, `CommonEvents`, `Enemies`, `Items`, `MapInfos`, `Map*.json`, `Skills`, `States`, `System`, `Tilesets`, `Troops`, `Weapons`). The `DEUS_*.json` and `UF_*.json` files under `game/data/` are project data the editor does not write.
- Before writing a protected file, confirm the editor is closed: `Get-Process RPGMZ -ErrorAction SilentlyContinue` must return nothing. If it is running, stop and ask the Owner. No tool checked this on 2026-09-29 (audit); the check belongs in the brief of `tools/check_plugin_boot.js` or a sibling.
- After writing one, tell the Owner to reopen the project. The project must still open in the editor and start in Playtest without errors.
- Don't use `ConvertTo-Json` on RMMZ data: PowerShell 5.1 truncates below depth 2 and unwraps one-item arrays (it broke `Map002.json` once). Generate data with Node.
- Map `data` index = `(z * height + y) * width + x`; z 0-3 are tile layers, 4 shadows, 5 region IDs; length = `width * height * 6`. Tile ID ranges: B 0-255, C 256-511, D 512-767, E 768-1023, A5 1536-1663, A1 2048-2815, A2 2816-4351, A3 4352-5887, A4 5888-8191. Autotile ID = range start + kind * 48 + shape; shape 0 is the interior piece. Tile size is `$dataSystem.tileSize` (48).
- Character image names: `$` prefix = one character per file (3x4 frames); no prefix = 8 per file; `!` = object (no 6 px lift). Rows are down, left, right, up.

## 5. Testing
- Tests must be able to fail (AGENTS.md Rule 4). Every check goes through one helper that prints `PASS <name>` or `FAIL <name>: <detail>`; the last line is `RESULT: <n> passed, <m> failed`; any failure gives a non-zero exit code. A log line that announces success without a condition behind it is banned. A tool that cannot exit non-zero is not a check. On 2026-09-29, 9 of the 13 `tools/check_*.js` had no exit path or only a trivial one (`check_120`, `check_area_biomes`, `check_catalog_containers`, `check_furniture_originality`, `check_generator_alignment`, `check_walk_diff`, `check_walk_facings`, `check_wolf_cat`, `check_unready_bitmaps`); they are utilities until fixed.
- Mutants per lane: a lane that adds or changes a suite adds pinned mutants (one fault per copy) and shows that each mutant makes at least one check FAIL. The count goes in the lane report.
- Gate tests: a lane's `tasks/<task>/<lane>/lane.json` `gateTests` (entries `{cmd, args, timeoutSec}`) lists the lane's own suites. The shared list `gate` in `tools/ops/gate_tests.json` is run by `node tools/ops/run_gate.js` and is expected in `gateTests` once it is green; on 2026-09-29 it is not (`tools/test_strata_cuts_and_caves.js` fails on main, 7 fails, PROPOSED-BB-03), so recent manifests (lane-bv, lane-by) name only their own suites. `tools/governance/merge_gate.js` runs only what `gateTests` names, each in a fresh clone; a suite not named there is not run. A suite on `gate_tests.json`'s `quarantine` list refuses the gate. `run_gate.js --census` measures every tracked suite into `tools/ops/quarantine.json`. DEC-035: the PM, or the coordinator for its own fleet, runs the gate tests on the writer tip before any review.
- In PowerShell, capture the exit code as `EXIT=$LASTEXITCODE` directly in the shell after the command, never inside `powershell -Command`, which hides it.
- The in-game harness (`DEUS_Test.js`) turns on only for the exact argument `--deus-test[=suite]` (`--uf-test` is the old alias). RMMZ's Playtest passes `test`, so a loose match would hijack the Owner's F5.
- Check what the player would see, not internal flags: the sprite exists, its bitmap loaded, it is visible, opaque, on screen and at the expected pixel. Visual checks save a screenshot under `game/test_output/`, and the agent opens every one (Rule 5). Fixed seeds; a run repeats exactly.
- Never kill `nw.exe` or `RPGMZ.exe` processes you did not start; stop only the PID you launched. Test on a snapshot copy of `game/` when anyone else may be changing it (`docs/systems/UF_Test.md`, "Running it"). `tools/native_smoke_19a.js` refuses the live `game/` folder for the same reason.

## 6. Definition of Done: the commands behind the three levels
The levels, their criteria and the level each lane type must reach are defined once, in `AGENTS.md` -> Definition of Done (L1 Headless, L2 Bridged, L3 Seen by the Owner; nothing is complete without L3, Rule 2). This section only names the commands that produce the evidence.
| Level | Evidence commands |
|---|---|
| L1 Headless | `node tools/test_<x>.js` exit 0 in a fresh clone (the merge gate's clone counts); mutants shown failing; command lines and real exit codes in the report. |
| L2 Bridged | plugin registered in `game/js/plugins.js`; `run_tests.bat <suite>` or `node tools/run_tests.js [suite] --game <snapshot>` (the `DEUS_Test` harness; exit code from the `RESULT` line in `game/test_output/results.txt`), or a DevTools-driven Playtest on a snapshot in the style of `tools/native_smoke_19a.js`; zero page exceptions, zero `console.error`; every screenshot opened and described; the GAME TRANSLATION block (`tools/ops/GAME_TRANSLATION_TEMPLATE.md`) filled with observed results. |
| L3 Owner | The Owner runs F5 Playtest in the RMMZ editor and watches F8: no new console errors, and the visible result matches the acceptance criteria; the record quotes the Owner. |

Levels 1 and 2 are the writer's; level 3 is the Owner's, and the PM presents it (DEC-042). Review and merge rules: `AGENTS.md` Rules 18 and 19 (the gate is the only door into `main`). Two failed fixes of the same problem: stop and ask (Rule 10).

## 7. Performance and state
- Enforced numbers are the ones `DEUS_Test.js` measures (`perf` suite, 30 s window, `run_tests.bat perf`): average frame time <= 17.0 ms and worst frame < 50 ms, with p50, p99, map size and drawn-event count in the detail. A performance claim without that method (duration, units on screen, machine) is not a number (Rule 3).
- Targets, not enforced: the budgets, tiers and scenarios in `docs/PERFORMANCE_ARCHITECTURE.md` (p99 <= 16.67 ms, max spike <= 33.3 ms, 1,000 entities). A target becomes enforced only when a `DEUS_Test` check measures it.
- No global full-world scans per frame (AGENTS.md Rule 14): never iterate all units, objects, items or cells per frame. Use spatial registries, dirty flags, bounded active queues and event-driven updates. Stable, undisturbed state costs nothing per frame. Caches are derived and discardable; each declares what invalidates it.
- Hot paths (about 1,000 calls per frame or more) allocate nothing: typed arrays, packed integer keys, preallocated scratch objects, plain `for` loops.
- Stable persistent IDs: refer to entities by ID (`Creature #1042`, `Household #83`) across ticks and saves, never by live object reference.
- Versioned saves: save truth, rebuild caches on load. Every save payload carries `saveSchemaVersion`; a shape change increments it and ships an explicit migration. Never serialize sprites, bitmaps, listeners, route tables or spatial grids (`JsonEx` has no cycle detection).
- Explicit time domains: every timer or scheduled condition is tagged `domain: "action" | "historical" | "presentation" | "engine"`. No naked tick counters. `UF_Time.schedule` defaults to `engine` when no domain is given; new code never relies on that default.
- The fixed clocks, stated once: the headless engine tick is 10 Hz (DEC-012); the action-domain round is the 6 s SRD round (`docs/art/DEUS_ASSET_STANDARD.md` AS-SCALE-001, "one sim tick is one 6 s SRD round" means this round, not the engine tick); the calendar is DEC-038 item 8. The cadences in `docs/ENGINEERING_STANDARD.md` and the tiers in `docs/PERFORMANCE_ARCHITECTURE.md` are targets; the old 20 Hz figure (`docs/SRD_CATALOGUE_CROSSWALK.md:60`) is stale.

## 8. Units (DEC-038 item 3; DEC-040 as clarified 2026-09-29; DEC-013)
| Quantity | Unit |
|---|---|
| Mass | integer centipounds (1 = 0.01 lb), everywhere, water included (display gallons: 1 gal = 834 cp). The closed-mass ledger counts the weight of stone, soil, sand, clay, ores, metals and water through their whole life (mined, crafted, rusted, broken, reclaimed); plants, creatures and gases are outside it, and the rule must not complicate soil. |
| Saturation, porosity | integer basis points, 0..10000 (`game/js/sim/hydrology/aquifer.js` already does this). |
| Hydraulic head | integer millistrata (1000 = 1 stratum = 2 ft). |
| Temperature | integer centi-Fahrenheit (7250 = 72.50 F). |
| Time | integer ticks, tagged with a domain (§7). |
| Space | integer cell (x, y, z) and stratum s in 0..4; 1 cell = 5 ft, 1 layer = 10 ft, 1 stratum = 2 ft (DEC-013 item 2, DEC-038 item 3; `art/catalogue/geometry.json` and `DEUS_Levels.js` `STRATA = 5` agree). OPEN with the Owner: the art SOP AS-GLOBAL-018 / AS-SCALE-001 / AS-QTR-001 says 1 layer = 5 ft = 48 px with four 12 px quarters (the DEC-016 `stratumPx` question); the decision log governs until the Owner rules (`docs/STATUS.md` D.5). |

Known deviations, to convert in their own lanes and never silently: `game/js/sim/structural/collapse.js:53` (float lb/cu ft density), `docs/systems/DEUS_Materials.md` "Mass unit" (`mu`, an unconfirmed 1 g proposal; `du` for water), `game/js/plugins/DEUS_Environment.js` (Celsius). New code uses the table.

## 9. Observability
- The simulation explains itself. `DEUS_Sheet` (a creature: need, goal, project, job, why this one, resource chosen, capability breakdown) and `DEUS_Look` (a cell: x y z, level, biome, geology, solid/void/fluid, material, moisture, light, walkable, room) must answer "why did this happen" for any system that ships. If they cannot, the system is not done.
- A reproducible bug report has: world seed, save, x y z, entity ID, time, steps.

## 10. Documentation
Every plugin has `docs/systems/<plugin name>.md`, updated in the same commit as the code, with six sections: 1 Purpose (one paragraph); 2 Public API (every function, event and structure other code may use, with arguments and returns; anything not listed is internal); 3 Events emitted and listened to (name, payload); 4 Save data (what, under which key); 5 Checks (the named checks and what each proves); 6 Status (what works, with evidence; what is missing; known bugs). On 2026-09-29, 20 of the 62 `DEUS_*.js` had no doc (named in `docs/ARCHITECTURE.md`); a lane that touches one writes it. Owner decisions are recorded in `docs/OWNER_DECISIONS.md` by DEC number, and a system cites the DEC it implements.

## 11. Git
- Stage only your own files (`git add <paths>`; never `-A`, `.` or `-a`). The message starts with the agent tag; the seven tags and what each may do are in `AGENTS.md` -> Commit and claim rules. One task per commit. Commit before a risky change.
- `.gitignore` is a whitelist (the project root is also the Dwarf Fortress install). A new top-level project folder is added to it. Secrets and `game/game_runtime.log` are ignored (commit `4aa51e1a`). Derived files (`reference/`, `art/review/`, `game/test_output/`, worker logs) are never committed.
- Push: as `AGENTS.md` -> Commit and claim rules says. A writer pushes only its own lane branch (`git push origin task/<lane>`) when its launch prompt says so; never `main`. Only the integrator pushes `main`, after a merge through the gate (`AGENTS.md` Rule 18).
