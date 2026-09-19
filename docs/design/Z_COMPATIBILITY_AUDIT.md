# Five-map Z compatibility: integration gate

Date: 2026-09-19. Codex / Astra team. Scope requested by the user: focus on Z-axis plugins and preserve operation of the other systems.

## Required result

Exactly five persistent **256x256 maps** at z=-2, -1, 0, +1, +2, aligned at the same horizontal coordinates: 327,680 cells total. All five maps simulate concurrently in real time. Rendering and input can focus on one map; the other four maps must not freeze. Creatures, needs, jobs, combat, fire, resource renewal and spawning continue on the common world clock. Sparse/scheduled simulation is an implementation technique, not permission to stop a map when it is not viewed. User explicitly reconfirmed this contract on 2026-09-19; see VISION V80/V102 and its Decision log.

## What is actually installed

Read-only audit on 2026-09-19 found no `game/js/plugins/UF_Levels.js` and no git history for that file. The live World remains the 2D version-3 implementation. `docs/systems/UF_Levels.md` describes a **snapshot**, not installed gameplay; `docs/handoffs/RESUME_claude.md` records that copy-back never happened. Do not register Levels alone: it depends on the coherent World/Objects/Items/Jobs/Look seam.

Recoverable source exists in:

`C:/Users/snewt/AppData/Local/Temp/claude/c--Users-snewt-OneDrive-Desktop-UF/33d11f06-f10e-4b14-b7ab-ba5caf8458e8/scratchpad/vlv/`

Use `work/` relative to `orig/` as merge input. `merged/` is older; **do not run the old copyback/merge scripts**. World, Objects and Jobs now have newer concurrent edits. Core owners must merge individual changes onto current source, not replace these files wholesale. Historical `out_r3` / `out_rep` logs are not fresh compatibility evidence.

Recovered V1 has no functional stairs/routes, digging, support or falling; upper maps are air, not V91 stacked terrain. Its fail-closed `currentArea() === null` away from Ground prevents some legacy corruption but leaves several systems paused. That pause fails the required final result above.

## Compatibility findings and ownership

Line numbers refer to the source inspected on 2026-09-19 before this compatibility patch; use the named functions if subsequent edits move them.

| System | Finding | Required integration work |
|---|---|---|
| World / Objects / Items / Jobs | Live versions lack the complete z seam. Jobs at-cell, target creation and stand dispatch discard z (`UF_Jobs.js` atCell, create, take, step). | Land the seam together; preserve current work timing, pathfinding, spawn guard and item edits. Test all five maps and old saves. |
| Doors | Cell keys, occupant checks and cellFree wrapper omitted z. | This pass adds level-safe keys/forwarding/guards. Remove the recovered Levels boot dispatcher that bypasses Doors for nonzero z; otherwise friendly underground doors stay blocked. |
| Floors / Rooms | Surface tile kind IDs cannot paint structural level floors; caches/room identities omitted z. | This pass isolates rooms, preserves job refs and refuses unsupported non-ground construction before resources are consumed. Add a constructed-floor adapter updating shape/material/support before enabling it. |
| Ownership / beds / Walls | Claims and beds omitted z; wall lookups could silently read Ground with legacy APIs. | This pass hardens owned plugins. Full save/game tests on the integrated core still required. Visual roof overhang is y-1 on the **same** z, not a collision cell on z+1. |
| Fire | Cell/wetness keys and hurtUnits matched x/y only (`UF_Fire.js` keyOf, hurtUnits). | This pass isolates levels and keeps all stored fires advancing independently of view when the seam is available. New campfire escapes/random ignitions remain view-scoped, so the strict all-map gate is still open. No vertical spread policy is added. |
| Outposts | `UF_Outposts.js` stage execution around 696-742 loops cellsByZ but passes the Ground `building.area` to Objects; no upper floor shape is built. | BLOCKER: use actual level handles, establish floor/support first, and prevent ground writes from upper/cellar stages. Existing tower tests do not prove multi-map construction. Owner: Claude. |
| Combat | `resolveAttack` around 541 directly changes HP without a level guard; onUnitDeath around 617-629 reconstructs x/y-only area for drops. `runTick` uses currentArea. | Guard direct attacks, preserve victim z for every drop, and run decisions across active units on all maps independently of view. Guarding only engage is insufficient. |
| Wildlife | Registry threat/herd/prey scans compare area x/y only (825-839, 875-896, 972-990); offscreen walkability around 647 uses surface biome/terrain. tick depends on currentArea. | Filter by complete location, use level terrain, and schedule all-map AI without a view gate. Owner: separate creature-AI session. |
| Colonists | Resource/water/bed searches pass u.area without u.z; prey/mates ignore z; claims/bed reservations collide; birth around 846 omits z. | Preserve full references through food, sleep, mate, job, claim and birth flows. Child must spawn on mother's map at a valid cell. Owner: Claude. |
| Skills | extraYield around 540 passes at.area without at.z to Items.drop. | Bonus resources must appear at the same level as the completed job. Owner: Claude. |
| Ecology | Resource/spawn indices omit z; only objects:changed is consumed, not objects:levelChanged. | Spawn/regrowth scheduling for every map with layer-appropriate rules and populations; never consume Ground state for a nonzero request. Owner: Claude ecology v2. |
| Talk / Speech | Talk's representative selection compares x/y-only area; Speech uses eventOf(id), not a view-gated runtime currentArea loop. | Fix Talk filtering. Verify Speech with level-filtered events; do not blanket-pause speech based on stale docs. |

## Required integration tests

### Added founding requirement: dwarves (user, 2026-09-19)

New worlds must contain a dwarven faction with a real underground starting camp on z=-1 or z=-2. Dwarven founding locations never use Ground or the upper layers. Other peoples retain their current policy until directed otherwise. This does not forbid later travel above ground.

Pending the optional user choice between one camp and settlements on both underground layers, use one suitable starting camp selected deterministically from the allowed levels. Do not invent an extra faction, lore, doubled population or established fortress. Keep the existing founder-count and basic-start rules, with layer-appropriate safe floor, food/water and construction resources. Faction home, history site, campfire, founder units, spawn reservations, resource kit and saved view (if the player is dwarven) must all carry the same actual z.

Read-only evidence in the current source: Factions uses weighted random species selection, so a dwarf faction is not guaranteed. Dwarf is playable, with weight 2; setting its weight to 0 is not a safe exclusion because the current weighted helper treats zero as 1. History creates sites from the x/y-only home and sends founders to the legacy World.addUnit, so setting only home.z still creates surface founders. WorldGen's resource kit is also Ground-oriented. The implementation therefore belongs in the coordinated Factions/History/WorldGen/core merge, not a metadata-only late patch. Existing saves should not have their surface factions silently moved by this new-world rule.

Add checks: across fixed seeds at least one dwarf faction exists; every dwarf founding site/unit/camp/kit is on an allowed map and valid walkable cell; no dwarf founders or dwarf-camp kit are written into Ground diffs; identical x/y on other maps remains independent; save/load preserves the faction and z; the dwarven faction continues operating while another map is viewed. No claim of implementation until those tests run on the actual five-map core.

### Core and consumer checks

1. New Game creates/checksums all five 256x256 maps. Same seed regenerates their baselines, save/load preserves changed terrain, units, jobs, items and ownership. A legacy Ground save migrates without moving records.
2. Place different objects, units, beds, room geometry, items and jobs at identical x/y on all five maps. Queries, deletion, damage, ownership, reservations and save/load never cross maps.
3. Keep the view on one map while all five have creatures walking, working, needing food/sleep and fighting, fires burning, and renewal/spawn queues due. Advance the real world clock; each map progresses. Switch view twice; results must not depend on what was rendered. Pause and speed changes apply to all five together.
4. Direct cross-level attack refuses without HP/ammo/XP changes. Death and skill bonus yields retain z. A predator below prey does not hunt or scare that prey through the floor.
5. Hunt/talk/mate jobs replan after a target changes level. Until cross-map routing exists they refuse or remain pending; they never complete from identical x/y on another map.
6. Underground births remain underground; assigned beds and sleep jobs select the correct map. Ownership cleanup on one map leaves the other four alone.
7. Construct an upper storey/cellar through the real outpost worker flow. Assert valid support and floor shapes, correct stair endpoints, and unchanged Ground diffs except explicit Ground stages.
8. Run vertical, smoke, world, spawn, objects, items, jobs, colonists, wildlife, combat, skills, ecology, doors, floors, walls, ownership, fire, look, interact and camera suites against a coherent immutable snapshot. Open every capture; document existing failures separately. Provoke actual z-loss defects and observe relevant failures.
9. After editor/plugin registration coordination, run RMMZ F5 and inspect F8 through switching, construction, combat, save and reload. No approval/completion claim until this is observed and the user reviews it.

## Evidence limits for this pass

Node VM contract tests use actual owned-plugin source with legacy/seam test doubles. They test safety and level isolation, **not** concurrent execution of five real maps. Snapshot runtime results and remaining blockers are recorded in STATUS after the checks finish. No core takeover or editor registration is implied by these patches.

Final results of this pass: 59 VM contracts passed, with real source z-loss mutations observed failing. Twelve Ground runtime suites passed 182 checks in disposable snapshots, with Ownership registered in the copies. Their `world.one_layer` check explicitly confirms the old core. This preserves current Ground behavior in the exercised paths; it cannot prove the uninstalled five-map system. Runtime image limitations and exact snapshot names are recorded in STATUS. RMMZ F5/F8 and complete five-map integration remain untested.
