# DEUS_Projects

Settlement projects: the colony-level planner that measures what the settlement lacks (shelter, food, sheltered beds, storage), picks the one need worth acting on (the settlement brain, DEUS-TSK-FABLE-06), opens a project from that need's blueprint, reserves the project's cells, and posts ordinary open `UF_Jobs` jobs for the current phase. The planner never orders a unit around: its jobs are open designations, taken by whoever takes open jobs: the founders through `UF_Colonists`' decision loop (`decide`, restored 2026-09-23 under DEUS-TSK-FABLE-03; it takes project jobs before the society plan), or the player through overseer orders and `UF.Jobs.assign`.

**Owner:** Claude Code (Fable) · **File:** `game/js/plugins/DEUS_Projects.js` · **Load order:** after `DEUS_Jobs` and `DEUS_Colonists`; before `DEUS_Test`. Delivered 2026-09-22 under DEUS-TSK-FABLE-02; the settlement brain 2026-09-23 under DEUS-TSK-FABLE-06. Registered in `game/js/plugins.js` after `DEUS_Colonists` (2026-09-23).

## 1. Purpose

One source of truth for settlement-level deficits and blueprint construction. `UF_Colonists` keeps its society plan (the step list around the hearth: hearth, larder, knives, clothes, the 7×7 town shelter, door, chest, beds, workshops). This plugin adds the deficit-driven layer beside it: it reads the plan's cells and the camp ring as reserved ground, so the two never compete for a cell, and it counts whatever the plan builds (a door set into walls, beds, stockpiles) as supply, so a plan-built shelter closes the deficit without a project. While this plugin is enabled, `UF_Colonists` skips the plan's shelter, door, beds and chest steps (DEUS-TSK-FABLE-03), so those come from projects.

Timing is explicit: every timer carries `domain: "action"` and counts map updates (the same count `UF.Time.ticks()` keeps, so speed-up and pause carry over). Nothing scans the world per frame: the per-update cost is one tick comparison plus a look at the (usually zero or one) active projects' recheck timers.

## 2. Public API (`UF.Projects`)

Configuration comes from `catalog.colony.projects` when present, else the defaults below (`Projects.config()` returns the merged object).

| Key | Default | Meaning |
|---|---:|---|
| `cadenceTicks` | 3000 | map updates between full cycles (~50 s at 60 updates/s) |
| `startDelayTicks` | 120 | first cycle this long after the colony exists or a save loads |
| `perShelter`, `perStockpile` | 8, 8 | colonists per communal shelter / stockpile |
| `scanRadius` | 24 | cells around the hearth counted as the settlement |
| `siteSearchRadius` | 40 | Chebyshev distance searched for a footprint |
| `margin` | 1 | free ring kept around a footprint |
| `materialRadius` | 40 | how far a haul or harvest may reach from the site |
| `maxOpenJobs` | 12 | posted jobs alive at once per project |
| `harvestPerMaterial` | 2 | harvest jobs alive at once per missing material |
| `jobPriority` | 0 | `UF_Jobs` priority of posted jobs (0 = like any designation) |
| `recheckTicks` | 60 | a build square somebody stands on is looked at again after this |
| `retryTicks` | 9000 | a cell whose jobs failed three times waits this long |
| `targetReserveDays` | 3 | food: colonist-days of nutrition the settlement keeps within reach |
| `slotsPerColonist` | 8 | storage: item slots each colonist needs |
| `slotsPerStockpileCell` | 8 | storage: what one stockpile cell counts as (a chest counts its `maxSlots`) |
| `forageJobs` | 4 | food: gather jobs a food cache keeps alive at once |
| `reserveMarginDays` | 0.5 | food: a cache forages this far past the target, so one meal does not reopen a cache at once |
| `kindCooldownTicks` | 6000 | a kind that could not open, or whose forage found nothing, waits this long |
| `severity` | shelter 3, food 2, foodCritical 4, bed 1.5, storage 1 | the brain's weight per deficit |
| `survivalBonus` | foodCritical 5, shelter 2 | added to the utility of a critical food or an unmet shelter deficit |
| `blueprints` | the four below | blueprint records, overridable per id (`null` switches one off) |

Blueprints (`kind` `footprint`: a square site chosen outside the camp; `kind` `task`: cells chosen inside settlement space, or none at all):
- `communal_shelter` (deficit `shelter`, footprint `size 5`): `wall wall_wood`, `door door_wood` (south middle, `(origin.x+2, origin.y+4)`), `hearth campfire` (centre), `bed floor_straw` (the 8 interior cells); phases `site → walls → hearth → beds`; capacity `{ shelter: 1, bed: 8 }`. Geometry is derived from `size`, so a catalog blueprint with another size gets the matching perimeter, centre and interior.
- `communal_stockpile` (deficit `storage`, footprint `size 3`): `fill stockpile` with `stores ["wood","stone","metal","material"]`; phases `site → stockpile`; capacity `{ storage: 72 }` (9 cells × `slotsPerStockpileCell`).
- `bedding_expansion` (deficit `bed`, task): `bed floor_straw` on up to 16 free sheltered cells (`sheltered()`, nearest the hearth first); one phase `beds`; capacity `{ bed: cells }`.
- `food_cache` (deficit `food`, task): phase `larder` builds a `stockpile` with `stores ["food"]` at the existing larder (the first `colony.stockpiles` entry storing food) or a chosen 1×1 site; phase `forage` hauls loose food into it and gathers wild food until the reserve holds; capacity `{ food: the deficit at opening }`.

- `evaluateDeficits(area?)` → `{ area, site, radius, population, shelter, food, bed, storage, evaluatedAt: { domain, tick } }` or `null` (no colony); each row is `{ needed, current, deficit, unit }`. `area` defaults to the colony's; another settlement's area resolves through `colony.settlements`. Population = units with `data.kind === "colonist"` in the area. One `Objects.findIn` scan of `building`-tagged objects within `scanRadius` of the hearth, one `Items.find` of `food`-tagged stacks in the same radius, and the containers `UF.Containers.all` lists there:
  - `shelter`: a `door` tag with at least two `wall`-tagged 4-neighbours; needed `ceil(population / perShelter)`.
  - `food` (unit `colonist-days`): nutrition in pounds of the SRD daily need, `food.nutrition × count` of each stack (never its weight), in larders (`larderLb`), containers (`containerLb`), on the ground (`groundLb`) and in the packs of the settlement's living colonists (`carriedLb`), divided by the population; needed `targetReserveDays`; also `lb`, `deficitLb` and `critical` (under one colonist-day). Two sums answer two questions (DEUS-TSK-FABLE-07): `totalAccessibleNutrition` (all four; "can we survive?", the one the deficit uses, since a colonist eats from its own pack first) and `communalStoredNutrition` (larders and containers only, also `storedLb` and `communalDays`; "what is deposited?", for logistics). Every stack is counted once wherever it lies (a pack and the pouch in it, a container and a cell), so a deposit moves food without adding any. The dead are neither population nor holders; their packs follow the corpse.
  - `bed`: `bed`-tagged objects on sheltered cells only (`unsheltered` counts the rest); needed `population`.
  - `storage` (unit `slots`): container `maxSlots` (`containerSlots`) plus passable, non-container `stockpile`-tagged cells (`stockpileCells`) × `slotsPerStockpileCell`; needed `population × slotsPerColonist`.
- `explain(area?)` → "Shelter 0/1 (needs 1 more) · Food 1/3 days (needs 2 more) · Beds 3/8 (needs 5 more) · Storage 8/64 (needs 56 more) slots · 8 colonists within 24 of (128,128); next: communal_shelter (utility 5.0)". For `UF_Look` / `UF_Sheet`.
- `brain()` → `{ deficits, candidates: [{ kind, deficit, total, needed, unit, inFlightCapacity, inFlightProjects, unmet, fraction, severity, bonus, utility, cooled, eligible }], chosen }` sorted by utility. For each blueprint: `unmet = max(0, deficit − Σ capacity[deficit] of active projects)` (so a need one project already covers never opens another: a shelter in flight covers 8 beds, no bedding opens beside it); `utility = severity × min(1, unmet / needed) + bonus − activeOfKind × 10` when `unmet > 0`, else `−∞`; `bonus` is `survivalBonus.foodCritical` for food under one colonist-day (with `severity.foodCritical`) plus `survivalBonus.shelter` for an unmet shelter; `eligible` needs `unmet > 0`, no cooldown on the kind and a positive utility (the active-project penalty keeps a second project of a kind from opening beside one in flight: a food cache forages until the reserve holds whatever the deficit grew to, the next shelter waits for the first); `chosen` is the first eligible candidate.
- `deficits` → `["shelter", "food", "bed", "storage"]`. `sheltered()` → the sheltered cells: the camp's interior inside its ring (`colony.radius − 1` around the hearth) and the bed cells of every finished communal shelter.
- `tick()` → runs a full cycle now: `{ deficits, brain, opened: [ids], advanced: [{ id, phase, total, done, todo, blocked, posted, waiting, standers, reserveDays? }] }`. A cycle opens at most one project, the brain's `chosen` kind (a kind that returns no project is cooled for `kindCooldownTicks`), then advances every active project.
- `open(kind, { origin?, count?, deficits?, utility? })` → the project or `null` (no colony, unknown blueprint, no valid footprint, no free sheltered cell). `origin` fixes a footprint project's site; `count` bounds a bedding project's beds (default the bed deficit, at most 16); `deficits` is the evaluation to size the capacity from.
- `advance(id)` → that project's advance summary now (or `null`).
- `cancel(id, reason?)` → bool; cancels the project's live jobs through `UF.Jobs.cancel`.
- `list(filter?)`, `get(id)`, `active()`, `state()` (the saved record below), `blueprint(kind)`, `blueprints()`.
- `reservedAt(area, x, y)` → the id of the active project whose footprint holds the cell, else `null`. Other planners (households, roads, plazas) should consult it before claiming ground.
- `footprint(project)` → the project's cells (the square of a footprint project, the chosen cells of a task project); `cells(project, phase?)` → `[{ x, y, object, state }]` with `state` `done | clear | build | blocked` for the phase (default: the current one).
- `describe(idOrProject)` → "Communal shelter #1 at (140,120)-(144,124): phase 2/4 walls, 9/16 cells, 3 jobs open, 2 taken, waiting for log".
- `setEnabled(on)`, `isEnabled()`; `timers` (the tagged cadence and start delay); `_internal` (pure helpers for tests: `chooseSite`, `siteValid`, `reservedCellSet`, `cellStatus`, `canFullyClear`, `clearAction`, `relativeCells`, `harvestSources`, `foodSources`, `shelteredCells`, `beddingCells`, `larderCell`, `capacityFor`, `brain`, `coolKind`, `onMapUpdate`, `onLoaded`, `now`).

**Choosing a footprint** (`chooseSite`): rings of Chebyshev distance 1… `siteSearchRadius` around the hearth; candidates in a ring are ordered by `World.hash32(seed, cx, cy, salt)` (no `Math.random`); the first valid origin wins. Valid: every cell of the footprint plus `margin` lies at least one cell inside the area, is not water (`UF.Jobs.isWaterAt`), has walkable ground (`World.walkable` with `ground: true`), is not reserved (the camp ring `colony.radius + 1` around the hearth, every `build` step's cells of `colony.plan`, `colony.stockpiles`, other active projects' footprints plus margin), and holds no constructed object; a natural object is fine when it is passable or has a harvest action `UF_Jobs` knows (`chop`, `gather`, `pick`, `quarry`, `mine`, `dismantle`).

**Advancing a project**: finished jobs are dropped from its maps (a failure counts against the cell; three failures pause the cell for `retryTicks`; a job `UF_Colonists` cancelled for a survival need, reason `survival: …` at supper, bedtime, exhaustion or unconsciousness, is the worker's interruption and never counts: the job is posted again at the next advance, and the reservations `UF_Jobs` released go to whoever takes it). For each cell of the phase, `cellStatus` reads the world: `done` (holds the target, or nothing to clear in the site phase), `clear` (a natural object with a harvest action that `canFullyClear`: one job of that action, so a tree is chopped and a shrub gathered, and a stump chopped after), `build` (the target object is missing), `blocked` (another building, or an object no job clears; reported, never removed). `canFullyClear(t)` follows the harvest's `becomes` chain: the remainder must be passable or clearable in turn, so an oak (stump, choppable) clears and a berry bush (bare bush, no action) does not; `siteValid` uses the same query, so such a footprint is never chosen (DEUS-TSK-FABLE-04). A `build` cell gets a `build` job once every `build.items` count lies on it (with `UF_Jobs`' substitutes: `log` for `wood`, `fiber` for `straw`, `rocks_small` for `stone`); otherwise `haul` jobs, one per source stack, from the nearest unclaimed ground stacks within `materialRadius` that do not lie on a reserved footprint. A haul asks for exactly what the cell still needs (`params.count`, splitting a bigger stack on its cell first); how much of it one carrier lifts is `UF_Jobs`' legal-lift rule (`docs/systems/UF_Jobs.md`), and what stays behind is hauled next. When no stack covers the need, up to `harvestPerMaterial` harvest jobs go to the nearest catalog objects whose action yields the material (an oak for logs, a shrub for fiber, loose stones for stone), outside every reserved footprint. A square somebody stands on is skipped and rechecked after `recheckTicks`. When no cell is `todo` or `blocked`, the phase steps and `advance` runs again at once for the new phase (bounded by the number of phases), so its first jobs are posted in the same update rather than at the next cadence cycle; after the last phase the project is `done`. A stockpile cell's build job carries `params.stores` (the blueprint's list), which `UF_Colonists` registers in `colony.stockpiles` on completion.

A `food_cache`'s `forage` phase has no cells. Each advance re-evaluates the deficits and is complete when the reserve reaches the target plus `reserveMarginDays`; otherwise it posts `haul` jobs for loose `food` stacks within `materialRadius` (not in a larder or container, not reserved) to the larder, and keeps up to `forageJobs` gather jobs alive on the nearest catalog objects whose harvest yields a `food` item (`foodSources`: berry bushes, fruit trees, cactus, glow caps, cave mushrooms) outside every reserved cell. A cycle that posts nothing while no job is open counts as blocked (`no wild food within reach` or `wild food is spoken for`); three in a row cancel the project and cool its kind for `kindCooldownTicks`.

Posted jobs are open (`owner null`) with `params.project` (the id) and `params.phase`; hauls also carry `params.material`. The maps `jobs` (cell → job id), `hauls` (item id → `{ job, cell, type, count }`) and `harvests` (cell → `{ job, material }`) keep one live job per cell and per item. Once a colonist takes a job, `UF_Jobs`' reservation manager reserves the target cell and the item for that unit, as for any job.

## 3. Events (`UF.Events`)

- Emits `projects:evaluated(deficits, brain)` (each cycle), `projects:opened(project)`, `projects:sited(project)`, `projects:jobPosted(project, job)`, `projects:phase(project)`, `projects:done(project)`, `projects:cancelled(project, reason)`.
- Listens: `jobs:done`, `jobs:failed` (a job with `params.project` marks that project for an advance on the next map update).

## 4. Save data

`UF.World.state.colony.projects = { version: 1, nextId, list: [project], cooldowns?: { kind: tick } }` (inside the colony record, so it rides in `contents.ufWorld`).

`project = { id, kind, deficit, state: "active" | "done" | "cancelled", phase, origin: { area: { x, y }, x, y, z }, size (0 for a task project), margin, phases: [{ name, task, cells: [{ x, y, object, stores }] }] | null (footprint projects derive their cells from the blueprint), larder: { x, y } | null, capacity: { deficit: amount }, utility, created: { domain: "action", tick }, sited: {…}, finished: {…} | null, jobs: { "x,y": jobId }, hauls: { itemId: { job, cell, type, count } }, harvests: { "x,y": { job, material } }, failed: { "x,y": { count, reason, retryAt } }, blocked: { cell, reason, since } | null, blockedCycles, recheck: { domain, tick } | null, reason, log: [{ tick, text }] }`. Everything is JSON-safe (ids only, no object references); the harness checks a JSON round trip is identical and that the restored record is usable. Runtime caches (`nextRunAt`, the dirty set, the yield index) are rebuilt after `DataManager.extractSaveContents`.

## 5. Checks

Headless (`node tools/test_settlement_projects.js`; exit 0/1/2): runs the real `DEUS_Objects.js`, `DEUS_Items.js`, `DEUS_Jobs.js` and `DEUS_Projects.js` in a Node vm against a World double (one 64×64 ground area, object grid, water cells, units walking one cell per update) with the real catalog, a camp ring with two gaps, three straw beds, eight founders and material stacks in the open; a minimal idle loop takes open jobs and steps a colonist off a reserved cell.

| Check | FAILs when |
|---|---|
| `plugin_loads` | the API or the tagged cadence timer is missing |
| `no_unseeded_random` | the source contains `Math.random` |
| `deficit_year1` | 8 founders don't give shelter 0/1, beds 3/8, storage 0/64 slots, food 0/3 days (critical) |
| `deficit_reads_world` | a door set into the ring's gap doesn't make the shelter count 1, or removing it doesn't restore 0 |
| `cadence_coarse` | 3000 map updates don't run exactly one evaluation |
| `project_opened_and_sited` | a cycle doesn't open exactly one active communal shelter at the chooser's predicted origin, size 5, phase 0, footprint and margin inside the area, off water, outside the ring and the plan's cells, reserved at its corners and not elsewhere |
| `site_deterministic` | the same seed picks a different origin |
| `site_avoids_water` | with water at distance 6..14 from the hearth the footprint centre is closer than 18 or touches water |
| `phase_site_clears` | the oak and shrub planted on the footprint don't get exactly a `chop` and a `gather` open job, or the phase doesn't step to 1 with the footprint clear |
| `hauls_and_reservations` | fewer than 4 hauls, two hauls on one item or one cell, a haul not to a perimeter cell of the reserved footprint, more than `maxOpenJobs` jobs, or the taken haul's cell and item aren't reserved for its colonist and against another |
| `save_load_roundtrip` | the record isn't JSON-safe (functions, undefined, NaN, class instances), differs after a save/load through the DataManager aliases, or isn't usable (reservation, description) afterwards |
| `walls_then_door` | phase 2 isn't reached, 15 walls and the south door aren't standing, logs aren't accounted for (16 used plus one per placement the world refused), a second project opens |
| `hearth_and_beds_complete` | the project doesn't finish with the campfire at the centre and 8 straw beds, or the deficit doesn't read shelter 1/1 and beds 11 with nothing new opened |
| `no_errors` | any console error during the run |

Rule 4 (`--mutant=<name>` patches the plugin in memory; the run must FAIL): `deficit_zero` (deficits always 0), `no_reserve` (`reservedAt` always null), `no_jobs` (nothing posted), `save_drift` (a function in the record), `cadence_zero` (a cycle every update), `phase_order` (hearth before walls). All six failed with exit 1 on 2026-09-22.

Construction loop (`node tools/test_project_construction_loop.js`, DEUS-TSK-FABLE-04; real Objects, Items, Jobs, Projects and Colonists plugins, the founders take every job themselves): `clearability_query`, `unclearable_site_rejected` (a berry bush on the first choice moves the chooser; a project there reports the cell blocked), `phase_readvance_immediate` (the walls phase's first haul is posted in the same tick the phase begins), `shelter_completed_by_founders`, `materials_conserved` (logs 19, straw or fiber 16, stone 3 used, harvest yields counted, nothing lost to refused placements), `advance_recursion_bounded`, and the `UF_Jobs` checks listed in `docs/systems/UF_Jobs.md`. Rule 4: `--mutant=no_readvance` and `--mutant=shallow_clear` (plus `consume_first`, `no_split` for Jobs) make the run FAIL.

The four shelter harnesses above and the survival harness switch the other three blueprints off in their in-memory catalog (`colony.projects.blueprints`), so they prove the shelter loop alone and a fixture without food does not open a food cache first.

Settlement brain (`node tools/test_multi_deficit_settlement.js`, DEUS-TSK-FABLE-06; real Objects, Items, Jobs, Projects and Colonists plugins; fixtures with a camp ring, an optional door, beds inside the ring, a registered larder, stockpile cells, ground food and wild food):

| Check | FAILs when |
|---|---|
| `plugins_load` | the API lacks `brain`, the four deficits or the four blueprints |
| `deficits_measured_by_nutrition` | 20 berries + 4 rations in the larder and 8 fruit on the ground (8 lb of nutrition, 12.4 lb by weight) don't read food 1/3 colonist-days, storage 8/64, beds 3/8 (sheltered only), shelter 0/1 |
| `brain_ranks_by_utility` | the candidates aren't shelter, food, bedding, stockpile in that order with the utilities the documented formula gives, or the cycle doesn't open the shelter with capacity `{ shelter 1, bed 8 }` |
| `no_project_spam` | twelve cycles with nobody working open anything but one shelter, one food cache and one stockpile, or a bedding project opens while the shelter in flight covers the beds |
| `critical_food_first` | with no food and a shelter, the food cache doesn't outrank everything, or its larder phase isn't one stockpile cell storing food |
| `food_cache_forages_to_target` | the founders don't finish the project with the larder built and registered and the reserve at or above the 0.5-day target of that fixture |
| `duplicate_prevention_beds` | four missing beds don't give one bedding project of capacity 4 on four sheltered cells, or six more cycles open a second |
| `bedding_built_by_founders` | the founders don't lay the four beds (beds 8/8) |
| `storage_project_builds_stockpile` | the founders don't build the 3×3 stockpile with all nine cells registered with stores, or storage doesn't reach 80/64 with one stockpile project only |
| `no_errors` | any console error during the run |

Rule 4 mutants: `no_dup_prevention` (in-flight capacity ignored: shelters, caches and bedding pile up; 3 checks fail), `no_priority` (every utility 0: bedding opens first; 2 checks fail), `weight_not_nutrition` (food measured by weight: 12.4 lb reads 1.55 days; 1 check fails). All three exited 1 on 2026-09-23.

Settlement closure (`node tools/test_autonomous_settlement_closure.js [--hourTicks=600] [--mutant=…]`, DEUS-TSK-FABLE-07; real Objects, Items, Jobs, Projects and Colonists plugins; the calendar `$ufTime` runs one minute every `hourTicks / 60` updates, DEUS_Core's 600 an hour by default; `DEUS_Objects` regrows the bushes and trees on the calendar's `time:hour`; the driver never assigns or orders: eight founders arrive at 19:30 with three rations each, an empty larder, logs, stone and straw in the open, sixty fruit trees and forty berry bushes within 28 cells, one shelter per twelve colonists so two newcomers make a bedding need):

| Check | FAILs when |
|---|---|
| `test_clock_hook` | `UF.Time.setForTest` (the block cut from `DEUS_Test.js`) does not set 08:00 day 1, reset the minute timer and leave the calendar running, clamp 30:-5 to 23:00, or refuse (`null`) when `UF.Test` is inactive |
| `carried_nutrition_counted` | 24 rations in the packs don't read 24 lb of nutrition (48 lb by weight), 3 colonist-days, deficit 0, communal 0 |
| `removal_raises_deficit` | taking one pack's rations away doesn't raise the deficit by exactly their nutrition |
| `deposit_moves_not_adds` | putting a pack's rations in the larder changes the total, or doesn't move them from `carriedLb` to `communalStoredNutrition` |
| `no_double_count` | the plugin's total differs from an independent walk over every stack in the world |
| `shelter_first` | the brain's first choice isn't the shelter (food covered by the packs, storage a lesser need) |
| `shelter_completed_autonomously` | the shelter isn't done within 14 days with 16 walls and door, 8 beds and the hearth, or any `assign`/`order` call was made, or no project job was done |
| `stockpile_built_and_registered` | the 3×3 stockpile isn't done with 9 cells standing and registered, storage ≥ 64 |
| `food_cache_restores_reserve` | no food cache is done with gather jobs done and food in the larder |
| `resources_conserved_founding` | logs, straw, stone and food after the founding aren't start + harvest yields − build costs − meals |
| `no_unneeded_bedding` | a bedding project exists or the bedding candidate has anything unmet while the shelter's beds cover eight |
| `save_load_roundtrip` | the project record differs after a DataManager round trip, a founder can't be found by id, or eight more jobs aren't done within three days |
| `maintenance_stable` | over two quiet days more than one project is active, more than 40 jobs live, more than four projects (any but a food cache) open, anyone dies, or meals and rests stop |
| `food_disturbance_recovers` | with every scrap of food removed at 21:00 the row isn't critical, or no new food cache restores the reserve within four days |
| `storage_disturbance_recovers` | with the stockpile's nine cells removed the deficit doesn't reappear, or one replacement isn't built and registered within four days |
| `bedding_when_population_grows` | two newcomers don't give a bed deficit of exactly 2, one bedding project of capacity 2, two beds laid |
| `survival_interruptions_recovered` | no project job was cancelled `survival: …` during the run, or any such cancellation was seen counted against a cell, or a project is still active |
| `long_rest_one_night` | no long rest was observed or the longest exceeded 12 calendar hours |
| `nobody_died` | anyone died |
| `resources_conserved_end`, `no_errors` | the ledger doesn't balance since the newcomers; any console error |

Rule 4 mutants (run with `--hourTicks=3600`, each exit 1 on 2026-09-23): `carried_not_counted` (packs left out: 5 checks fail), `survival_counts_as_failure` (a bedtime cancellation counted against the cell: 1 fails), `no_autonomy` (`UF_Jobs.take` skips project jobs: 11 fail). Results 2026-09-23: `--hourTicks=3600` 22/22 (exit 0); the default 600 (the engine's calendar) 16/22: every long rest lasts 48.0 calendar hours and all eight founders die of thirst on days 7–8 (`docs/AUDIT_LOG.md` A8, `UF_Colonists`' `TICKS_PER_HOUR`).

In-game (`UF.Test` suite `settlement`, not in the default run: `node tools/test_snapshot.js --name settlement --suite settlement`): `colony_present`; `clock_set_for_test` (`UF.Time.setForTest(8, 0)` and the calendar moves on); `carried_food_counted` (two rations given to a founder add 2 lb to `carriedLb` and the total, in the larder they move to `communalStoredNutrition`, removed they leave the total as before); `autonomous_work_done` (at the top speed step, no order given: at least eight project jobs done by colonists and a project opened); `project_completed_unattended` (some project finished within 140 s); `survival_interruptions_not_failures`; `save_reload_equivalent` (`DataManager.saveGame` to slot 19, `loadGame`, `Scene_Map` again: identical project record and a job finished afterwards); screenshot `settlement.site.png`; `no_errors`.

In-game (`UF.Test` suite `projects`, not in the default run: `node tools/test_snapshot.js --name projects --plugins DEUS_Projects --suite projects`): `colony_present`, `deficits_year1`, `project_opened` (after the suite's cycle, one project more at most than the plugin's own first cycle opened, no kind twice, every active project answering a deficit that was open with a positive capacity, and the brain reporting one candidate per blueprint), `site_reserved` (a footprint project's first cell reserved and its centre outside the ring; a task project's chosen cells reserved, or its larder standing), `jobs_posted` (open, unowned), `job_assigned_in_engine` (a posted job assigned to the nearest colonist through `UF.Jobs.assign`, the overseer's order path, plans a stand cell and reserves its target), `job_done_in_engine` (at ×8 the colonist walks there and finishes it within 60 s: the object on the cell changes and the project's cell leaves the `clear` state), `saved`, `no_errors`; screenshot `projects.site.png` centred on the footprint. The suite assigns the job directly so the check does not wait on the decision sweep. Observed 2026-09-23 on snapshot copies: 9/9, with the founders' start reading `Food 3/3 days` and the brain ranking `communal_shelter:5.0 bedding_expansion:1.5 communal_stockpile:0.5 food_cache:-`, so the shelter opened first in the real world; an earlier run failed `job_done_in_engine` because the assigned worker's sleep window covered the start hour and `UF_Colonists`' rest preemption cancelled the job (`survival: rest`), which the suite cannot avoid without a sleep-window query.

## 6. Status (2026-09-23)

Works (evidence in the harness output and `docs/STATUS.md` → DEUS-TSK-FABLE-02, -04, -06): deficits for the locked start, deterministic siting outside the camp and the society plan, four phases posting clear/haul/build/harvest jobs that the real `UF_Jobs` executes and the founders take, save/load round trip, coarse cadence; the brain choosing one project per cycle across shelter, food, beds and storage, with in-flight capacity keeping a covered need from opening a second project; food caches, bedding and stockpiles built by the founders in the harness.

Known limits and findings:
- **Overlap with the society plan.** `UF_Colonists`' plan also builds a 7×7 shelter, a door and 8 beds around the hearth. Both can run: the project reserves other ground and counts the plan's results as supply, so whichever finishes first closes the deficit; a plan shelter finished while a project is active does not cancel the project (it completes what it reserved). Whether the plan's `shelter`/`door`/`beds` steps should retire in favour of this planner is the coordinator's decision.
- Fixed 2026-09-23 (DEUS-TSK-FABLE-04): `UF_Jobs` build now places before it consumes and verifies the materials at apply time, so a refused placement costs nothing; `UF_Jobs` lifts only the legal part of a stack, so whole-stack hauls no longer fail `encumbered`; a phase steps into the next one at once; a footprint whose objects cannot be fully cleared (berry bushes) is never chosen.
- Autonomous taking: `UF_Colonists`' `decide` (DEUS-TSK-FABLE-03) takes project jobs before the society plan, so project hauls come before knives and clothes are crafted; `jobPriority` 0 keeps them level with player designations.
- Only the primary colony record is planned; `colony.settlements` are read for deficits but get no projects.
- Sheltered space is what this planner knows: the camp's interior and finished communal shelters. `UF_Rooms`' enclosure detection is not consulted, so a player-built room's beds count as unsheltered until that is wired.
- The food row counts nutrition the settlement can eat (packs, larders, containers, ground), not what it will eat: eight suppers take a colonist-day off the reserve every day, so in a quiet settlement the brain opens a food cache about once a day that forages it back to the target plus `reserveMarginDays`; that daily cache is the maintenance rhythm, never two at once (closure harness `maintenance_stable`). Food sources are catalog objects with a harvest `UF_Jobs` handles and that regrow through `DEUS_Objects`; hunting and fishing are not sources yet.
- **BLOCKER outside this plugin (2026-09-23, `docs/AUDIT_LOG.md` A8):** `UF_Colonists` sizes the long rest at `8 × TICKS_PER_HOUR (3600)` = 28,800 map updates, while DEUS_Core's calendar runs 600 updates an hour, so a night's rest lasts 48 calendar hours; the closure harness on the engine's clock sees every founder die of thirst by day 8. With the calendar the constant assumes (`--hourTicks=3600`) the whole closure passes. The fix is one constant in `DEUS_Colonists.js` (claimed by Gemini, not touched here).
- The in-game `projects` and `settlement` suites exercise whatever the brain opens first (the shelter in the observed world, then the stockpile); the food cache and bedding kinds and the disturbance recoveries are proven headless only (§5).
- Doors: the hearth and beds are built after the door closes the ring; colonists pass their own doors through `UF_Doors.canUnitPass`. Not exercised by the headless harness (no doors plugin in the sandbox).
