# UF_Jobs
Jobs are the only way a unit changes the world: a job names a type, a target cell and parameters; the assigned unit walks to a stand cell, works there for the job's `work` ticks (tools multiply its rate), then the type's `apply` changes the world (chop, gather, pick, quarry, mine, haul, fetch, build, craft, equip, hunt, drink, eat, sleep, talk, move, wander). Open jobs with no owner are designations anyone may take. Status: built 2026-09-18, checks: `jobs` (17 checks, all PASS on a snapshot copy 2026-09-18; `smoke` on the same kind of snapshot: 6 passed, 1 failed = the known `colony_state_in_save`).

**Owner:** Claude Code (jobs agent) · **File:** `game/js/plugins/UF_Jobs.js` · **Load order:** after `UF_World`, `UF_Objects`, `UF_Items`; before `UF_Colonists` and `UF_Test` (WORLD_ARCHITECTURE §5). Not yet registered in the real `game/js/plugins.js` (Claude Code registers it when the editor is closed); tests ran with `--plugins UF_Tiles,UF_Objects,UF_Items,UF_Jobs`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §2.5, §5.5.

## API (`UF.Jobs`)
### Five-level seam (2026-09-19)

Targets, stands, moving-unit goals and result locations carry `z` beside `area`: `{ area: { x, y }, x, y, z }`. Area-taking Objects/Items APIs receive `{ x, y, z }` handles. Missing z means Ground; an explicit record z takes precedence over area.z. Integer levels -2 through +2 are accepted; unsupported nonzero levels, null, strings, fractions and out-of-range levels are refused. `create` without a target area uses the viewed level; an omitted target with an owner uses that owner's cell and level.

`assign`, `take`, `standFor`, planning and advancement require the worker and target on the same level until connector routing exists. Stand normalization preserves an explicit stand z, then a level in its area handle, then the target level. Diagonal stands retain the live eight-way/no-corner-cutting rules and pass z into both corner checks. Off-screen passability uses `World.walkable(..., { z })`; water queries use saved tiles through `World.getTile(..., z)` rather than surface biome classification when available.

All active jobs advance on every map update regardless of which level is displayed. Arriving at matching x/y on another floor cannot start work. Hunt/talk/mate replanning follows the subject's z, and final application checks the subject again so a floor change between replans cannot kill prey, change social needs or consume another floor's item. Haul delivery/cancellation, build materials, object actions, crafting workplaces and hunt yields retain their respective levels. Cross-level refusal goes through the ordinary failed-job state rather than throwing a console error.

The recovered vertical changes were merged into the live plugin, retaining diagonal work stands, eight-way facing, tool/skill rate calculation and V92's removal of overhead job barks. No new work-timing or HP/yield formula was introduced by this merge.

Narrow validation on 2026-09-19: 13 Node-VM checks ran the actual plugin with engine doubles, covering five-floor progress while switching view, create defaults/invalid z, assign/take isolation, stands and diagonal z, travel and worker teleport, custom-stand inheritance, moving-target replanning, last-moment cross-floor refusal, hunt yields, building materials, cancelled hauling, save-record round-trip and a deliberately removed final subject-level guard that the test detects. This is contract evidence only; RMMZ snapshot regression and F5 evidence must be recorded separately.

- `define(type: string, handler)` → the handler. `handler = { verb: string, plan(job, unit) → { ok: bool, stand: {area?, x, y} | null, reason? }, work: number | (job, unit) → number, apply(job, unit) → void | "continue", cancel?(job, unit), describe?(job) → string, replanEvery?: ticks }`. `stand: null` = work where the unit stands (instant when `work` is 0). `apply` returning `"continue"` starts the next phase (`job.phase + 1`, progress 0, planned again). `replanEvery` re-runs `plan` that often (moving targets). Registering a type again replaces it.
- `types()` → registered type names; `handler(type)` → the handler or `null`.
- `create({ type, target: {area?, x, y}, params?, owner?: unitId, priority?: number })` → the job or `null` (unknown type, or no target and no owner). `target.area` defaults to the area on screen; with `owner` and no target, the owner's cell. An `owner` is assigned at once (`assign`), so `job.state` is already `"travel"`, `"work"` or `"failed"` (with `reason`) when `create` returns; without an owner the job is `"open"`.
- `assign(jobId, unitId)` → the job or `null`. Cancels the unit's current job with reason `"replaced"`, sets `assigned`, plans the stand cell now (a failing plan leaves the job `"failed"` with a `reason`). Emits `jobs:assigned`.
- `take(unitId, filter?)` → the nearest open job in the unit's area that the unit can do now (highest `priority` first, then Manhattan distance, then id; at most the 8 nearest are tried), assigned; else `null`. A job whose plan fails (needs items, walled in) stays open with its `reason` noted. `filter` = a function or `{ field: value }`.
- `cancel(jobId, reason = "cancelled")` → bool. The job ends `"failed"` with that reason (a haul puts down what it carried where the carrier stands).
- `list(filter?)` → jobs (all states; finished ones are pruned past the last 40). `open()` → open unassigned jobs. `of(unitId)` → the unit's active job (`travel` or `work`) or `null`. `get(jobId)`.
- `describe(job)` → card/label text: "Chopping an oak", "Gathering tall grass", "Picking up loose stones", "Quarrying a granite boulder", "Hauling a stone", "Fetching a log", "Building a campfire", "Weaving a fiber wrap" (recipe name as a gerund), "Taking up a stone axe" / "Putting on a woven wrap", "Hunting a hare", "Drinking", "Eating berries", "Sleeping", "Talking with <name>", "Walking", "Wandering". Names come from the catalog.
- `standFor(target, unit, adjacentOnly)` → the stand cell or `null`; `standable(area, x, y, unitId?)`; `isWaterAt(area, x, y)`; `toolMultiplier(unit, job)`; `work(job, unit)`; `update()` (the per-tick step, run by the `Game_Map.update` alias).

Stand cell: the target cell when it's standable (inside the area, some direction passable by `Game_Map.isPassable` including UF_Objects' blocking, not a water tile, no other unit or solid event there; off-screen areas use `UF.Objects.blocksIn` and `UF.WorldGen.cellInfoLocal(...).walkable`) and `adjacentOnly` is false; else the standable 4-neighbor nearest to the unit; else `null` → the job fails ("can't reach it"). Object actions, move, sleep, eat and fetch/haul may stand on the target; drink, hunt, talk, building an impassable object and crafting at a workplace always stand beside it.

Per map update (`Game_Map.update` alias, after UF_World has moved the units): for each active job, (re)plan when needed; if the unit isn't on the stand cell, `UF.World.sendUnit` it there once (no re-send while its goal is the stand); when it stands there and its event isn't mid-step, work starts: the event faces the target (4 facings), `setStepAnime(true)`, one bark of the verb through `UF_Visuals.bark` when present; then `progress += (unit.data.workRate || 1) × toolMultiplier` per tick; at `progress ≥ work`, `apply` runs and the job is `"done"` (`jobs:done(job, unit)`). Tool multiplier: `equipment.tool`'s item type `tool[jobType]` (stone axe: chop ×2), else for `craft` ×1.5 when the equipped tool carries the recipe's `tool` tag, else 1. Blocked: `world:unitBlocked` for the unit, or 300 ticks on the same cell while travelling (an enclosed unit never reports a block because `findDirectionTo` returns 0), each count one; the first re-plans (maybe another stand cell), the second fails the job ("can't reach it"). A unit that leaves the world releases its job: back to `"open"` (owned jobs fail, "the worker is gone"). Time speed and pause come for free (`UF.Time` ticks).

Built-in types (`params`):
| Type | plan / stand | work | apply |
|---|---|---|---|
| `chop`, `gather`, `pick`, `quarry`, `mine` | the object on the target cell has that action ("nothing to chop there") | the action's `work` | `UF.Objects.applyIn` (yields dropped on the cell, `becomes`) |
| `move`, `wander` | target cell or its neighbor | 0 | nothing |
| `fetch` `{ itemId }` | the item's cell (it must lie on the ground: "the item is gone", "someone else carries it") | 0 | `UF.Items.pickUp` into the inventory |
| `haul` `{ itemId, to: {area, x, y} }` | phase 0 as fetch; phase 1 the `to` cell | 0 + 0 | pick up, `"continue"`, `putDown` at `to` |
| `build` `{ objectId }` | the object has `build`; every `build.items` count lies on the target cell (`UF.Items.count`), else `"needs items"`; stand beside it when the object isn't passable | `build.work` | consumes the items from the cell's stacks, `UF.Objects.setIn` |
| `craft` `{ recipeId }` | `catalog.recipes.list` entry; every input in the inventory (`"needs plant fiber"`); with `at`, the nearest object with that tag within 40 cells of the crafter that has a free neighbor (`"needs a fire"`), and `job.target` becomes that cell | recipe `work` | `consumeFrom` the inputs, `give` the outputs |
| `equip` `{ itemId }` | the item is carried and has `tool` or `wear`; instant | 0 | `equipment.tool` / `equipment.clothes` = the item id; `wear` also sets `data.tier` and calls `UF.Colonists.setTier` when present |
| `hunt` `{ unitId }` | the prey exists, is in the hunter's area and ≤ 40 cells away (Chebyshev), else "the prey is gone / left the area / got away"; stand beside it; re-planned every 30 ticks (`job.target` follows the prey) | species `hunt.work` (60 when unknown) | drops the species' `yields` on the prey's cell, `removeUnit`, `jobs:kill(job, prey, hunter)` |
| `drink` | the target is a water cell (tile on screen, `cellInfo.water` off screen); stand beside it | 60 | `needs.thirst = max(0, thirst − 65)` |
| `eat` `{ itemId }` | the item has `food` and is in the inventory (instant place) or lies on the target cell | 60 | consumes 1; hunger − `food.hunger`, thirst − `food.thirst` |
| `sleep` `{ frames? }` | target cell (a bed) or its neighbor | `frames` or 600 | `needs.sleep = 5` |
| `talk` `{ unitId }` | the other unit is in the area within 40 cells; stand beside it; re-planned every 30 ticks | 180 | social − 55 on both |
Needs are only touched on units that have `data.needs`.

## State it saves
- `UF.World.state.jobs = { nextId, list: [job] }`, `job = { id, type, target: { area: {x,y}, x, y }, params, owner, assigned, priority, progress, phase, state: "open"|"travel"|"work"|"done"|"failed", reason, created, finished?, planned, plannedAt, stand: {area, x, y}|null, blocked, stall, barked, result? }`. `params` may gain `objectName`, `preyName`, `otherName`, `itemType` (names kept for labels after the thing is gone). After a load every active job is planned again (stand cells and the stall record are reset).
- `unit.data.equipment: { tool: itemId|null, clothes: itemId|null }`, `unit.data.tier` (equip), `unit.data.needs.*` (drink/eat/sleep/talk), `unit.data.inventory` (through UF_Items).
- Handlers live in code, never in the state.

## Events (UF.Events)
- Emits `jobs:created(job)`, `jobs:assigned(job, unit)`, `jobs:done(job, unit)`, `jobs:failed(job)` (also for `cancel`), `jobs:kill(job, prey, hunter)`.
- Listens: `world:unitBlocked` (counts a block), `world:unitRemoved` (releases the job).

## Keys and mouse
None (UF_Interact creates the designations; UF_Colonists decides the colonists' jobs).

## Assets used
- No images of its own. Barks use `UF_Visuals.bark` (code-drawn bubble). Everything a job touches is catalog content drawn by UF_Objects / UF_Items.
- Tests only: `$U7_Townsman`, `$U7_Ranger` (test units), `$U7_Hare` (test prey), all U7 stand-ins; the stock `Outside_A1` water autotile (2048) for one test cell.

## Checks (suite `jobs`, default)
| Check | FAILs when |
|---|---|
| `define_and_create` | A custom type (`work` 3, `stand` null) created with an owner isn't done within 3 s or its `apply` didn't run once, a built-in type is missing, `jobs:created`/`jobs:done` didn't fire, or `of(worker)` isn't null afterwards |
| `travel_and_work` | Chopping an oak 4 cells north: the worker didn't reach state `work` on a cell adjacent to the oak, didn't move, isn't facing north with step animation on, `progress` didn't rise at > 0 per tick over 30 frames, the oak isn't a stump at the end, or 3 logs don't lie on its cell |
| `haul` | 2 stones hauled to another cell: the stack wasn't in the worker's inventory on the way, or isn't on the ground at the target cell (holder null, 2 stones there, inventory empty) |
| `fetch_and_craft` | Fetching 1 stone and 1 fiber doesn't put both in the inventory, or crafting `stone_knife` doesn't leave exactly a knife (inputs used up) |
| `craft_needs_workplace` | With no `fire` object within 40 cells, `cook_meat` doesn't fail with reason "needs a fire" (when a generated site campfire is within 40 cells, the job must instead be travelling with a stand cell; the detail says which case ran) |
| `tool_speeds_work` | After an `equip` of a stone axe, `equipment.tool` isn't the axe, `toolMultiplier` isn't 2, or the measured chop progress per tick isn't twice the rate measured without a tool |
| `equip_clothes` | Equipping a fiber wrap doesn't set `tier` 1 and `equipment.clothes` (keeping the tool) |
| `hunt` | A test hare 5 cells east: the hunter didn't work from a cell adjacent to the hare, the hare unit still exists, 1 raw meat and 1 hide aren't on its cell, or `jobs:kill` didn't fire once |
| `build` | Without items the job isn't `failed` with reason exactly "needs items"; with 3 logs + 3 stones on the cell no campfire appears, items remain, or the worker stands on the campfire |
| `craft_at_workplace` | With the campfire built, `cook_meat` doesn't finish at the campfire's cell leaving 1 cooked meat and no raw meat |
| `open_job_taken` | With two open gather designations, `take(helper)` doesn't return the nearest one, its owner isn't null, the grass isn't gathered (fiber on the cell), or the far one doesn't stay open |
| `describe_text` | The texts aren't "Chopping an oak", "Hunting a hare", "Weaving a fiber wrap", "Building a campfire", "Gathering tall grass" |
| `drink_and_eat` | A drink at a water tile placed for the test doesn't take thirst 80 → 15 from a cell adjacent to (not on) the water, or eating carried berries doesn't take hunger 60 → 35 and use 1 berry |
| `blocked_fails` | A chop on an oak walled in by four oaks isn't `failed` at once with a non-empty reason |
| `stalled_fails` | A `move` job of a unit boxed in by four oaks doesn't fail with a reason containing "reach" after ≥ 600 ticks (two 300-tick stalls) with the unit still in place |
| `saved` | `JsonEx` round-trip of `UF.World.state` doesn't keep `jobs` identical (a done chop included) or `makeSaveContents().ufWorld.jobs` isn't the live list |
| `no_errors` | Any uncaught error during the suite |

Screenshot: `jobs.jobs_working.png` (zoom 1, ×1 speed: the test worker in the stand cell south of the oak, facing it, mid-chop; the bark isn't visible, see limits). The suite runs at ×8 (`UF.Time.setLevel(3)`) after `travel_and_work` and resets the speed and zoom at the end; it clears a 21×11 arena south of the pair of generated objects and restores them. Seen failing (2026-09-18): `describe_text` and `suite_completed` on a first run (test bug); on a sabotaged snapshot copy (tool multiplier forced to 1, hunt yields dropped, build reason changed) `tool_speeds_work`, `hunt`, `build` FAIL with the numbers in their details while the other 14 pass.

## Replaced core methods
None, aliases only: `Game_Map.prototype.update`, `DataManager.extractSaveContents`, `Scene_Boot.prototype.start`.

## Known limits
- Path finding is UF_World's: `findDirectionTo` (A* over 200 iterations, then straight). A stand cell far away through dense forest may stall; the job then fails after two 300-tick stalls (10 s at ×1) rather than finding a long way round.
- A unit standing next to a tree on its west/east/north side draws under the canopy (same foot row; the sprite order isn't this plugin's). Barks from `UF_Visuals.bark` sit at z 9 in the tilemap, below characters and objects, so they're hidden behind anything on screen; a visible verb bubble needs UF_Visuals to raise its z (needs from others).
- `take` tries only the 8 nearest open jobs and only jobs in the unit's own area; `open()` filters the whole list each call (fine at tens of jobs).
- Finished jobs are kept for readers and pruned past 40; `list()` is not a history.
- `hunt` doesn't chase across area edges; a prey that leaves the area fails the hunt. Prey that flee are UF_Wildlife's job; with the prey standing still (the test) a hunt is a walk and 60 ticks of work.
- Craft without `at` happens wherever the crafter stands; there is no carry limit, so `fetch` never fails for weight.
- `sleep` doesn't check that the target is a bed; UF_Colonists picks the cell.
- Reasons are plain English strings for the card ("needs items", "needs a fire", "can't reach it", "the prey got away"); UF_Colonists compares `"needs items"` and `"needs a "` prefixes, nothing else is promised.

## Transactional builds, legal lifts and clean refusals (2026-09-22, DEUS-TSK-FABLE-04)

- **`build` verifies, places, then consumes.** `apply` first checks the cell: an object of the target type already standing means another builder got there (nothing is consumed), and materials missing from the cell (a haul took them while the builder worked) fail the job with "needs items" before anything is placed. Then it calls `Objects.setIn`; only a placement the world accepted consumes the `build.items` from the cell (`consumeBuildItems`, with the same substitutes as before: `log` for `wood`, `fiber` for `straw`, `rocks_small` for `stone`). A refused placement (a unit on the square, VISION V68) fails the job with the world's reason ("<name> is standing there" from `World.lastObjectRefusal`, else "the square is taken") and leaves every material on the cell. Before this, the materials were consumed first and a refusal destroyed them.
- **A handler's `apply` may return `false`** for a recoverable refusal it explained in `job.reason`: `finish` fails the job with that reason, without the console error a thrown error produces. `fetch` and `haul` use it for "the item is gone", "someone else carries it", "too heavy to lift" and "can't carry it".
- **Legal lift.** `pickUpNow` lifts `legalLift(job, unit, item)` of a ground stack: the job's `params.count` (the whole stack when it names none), never more than the stack holds, never more than keeps the carrier unencumbered (`Items.encumbrance(unit).encumbered`, the SRD's STR × 5 lb threshold, a third of the STR × 15 lb capacity, minus what it carries), because `step` fails an encumbered carrier in transit. A smaller lift splits the stack on its cell (`Items.create` + `Items.consume`): the carried part becomes the job's `params.itemId` and is reserved for the carrier, the rest stays on the cell and is released for another carrier. A stack of which not even one unit may be lifted fails the job with "too heavy to lift" and touches nothing. A cancelled haul still puts the carried part down at the carrier's feet, where it merges with a same stack; nothing disappears or duplicates.
- Checks: `node tools/test_project_construction_loop.js` (real Objects, Items, Jobs, Projects and Colonists plugins in a vm): `build_refused_keeps_materials`, `build_success_consumes_once`, `build_verifies_materials_at_apply`, `partial_haul_by_weight`, `second_carrier_and_cancel_conserve`, `too_heavy_aborts_without_pickup`, plus the project-side checks. Rule 4: `--mutant=consume_first` and `--mutant=no_split` make the run FAIL.
- Limits: `params.count` defaults to the whole stack so existing stockpile and larder hauls keep moving stacks; a planner that wants a fixed amount names it. Container items (`UF.Containers.takeItem`) are not split.
