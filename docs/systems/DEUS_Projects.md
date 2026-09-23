# DEUS_Projects

Settlement projects: the colony-level planner that measures what the settlement lacks (shelter, beds, stockpiles), opens a project for a deficit it has a blueprint for, reserves the project's footprint, and posts ordinary open `UF_Jobs` jobs for the current phase. The planner never orders a unit around: its jobs are open designations, taken by whoever takes open jobs. In the current tree that is the player through overseer orders or `UF.Jobs.assign`, because `UF_Colonists`' autonomous decision loop (`decide`, `scan`) was wiped on 2026-09-22 under Objective 2 (commit 0544ef0, `docs/STATUS.md` → Architecture Cleanup); when a decision loop returns, its open-designation step picks these jobs up unchanged.

**Owner:** Claude Code (Fable) · **File:** `game/js/plugins/DEUS_Projects.js` · **Load order:** after `DEUS_Jobs` and `DEUS_Colonists`; before `DEUS_Test`. Delivered 2026-09-22 under DEUS-TSK-FABLE-02. Registration in `game/js/plugins.js` is pending the RMMZ editor being closed (ENGINE_RULES §3); until then the plugin is loaded only by the harness and by `tools/test_snapshot.js --plugins DEUS_Projects`.

## 1. Purpose

One source of truth for settlement-level deficits and blueprint construction. `UF_Colonists` keeps its society plan (the step list around the hearth: hearth, larder, knives, clothes, the 7×7 town shelter, door, chest, beds, workshops). This plugin adds the deficit-driven layer beside it: it reads the plan's cells and the camp ring as reserved ground, so the two never compete for a cell, and it counts whatever the plan builds (a door set into walls, beds, stockpiles) as supply, so a plan-built shelter closes the deficit without a project.

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
| `blueprints` | `communal_shelter` | blueprint records, overridable per id |

Blueprint `communal_shelter`: `size 5`, `wall wall_wood`, `door door_wood` (south middle, `(origin.x+2, origin.y+4)`), `hearth campfire` (centre, `(origin.x+2, origin.y+2)`), `bed floor_straw` (the 8 interior cells around the centre), `deficit "shelter"`, phases `site → walls → hearth → beds`. Geometry is derived from `size`, so a catalog blueprint with another size gets the matching perimeter, centre and interior.

- `evaluateDeficits(area?)` → `{ area, site, radius, population, shelter: { needed, current, deficit }, bed: {…}, stockpile: {…}, evaluatedAt: { domain, tick } }` or `null` (no colony). `area` defaults to the colony's; another settlement's area resolves through `colony.settlements`. Population = units with `data.kind === "colonist"` in the area. Supply is one `Objects.findIn` scan of `building`-tagged objects within `scanRadius` of the hearth: a bed is a `bed` tag, a stockpile a `stockpile` tag, a shelter a `door` tag with at least two `wall`-tagged 4-neighbours. Needed: shelters `ceil(population / perShelter)`, beds `population`, stockpiles `max(1, ceil(population / perStockpile))`; all 0 with no population.
- `explain(area?)` → "Shelter 0/1 (needs 1 more) · Beds 3/8 (needs 5 more) · Stockpiles 0/1 (needs 1 more) · 8 colonists within 24 of (128,128)". For `UF_Look` / `UF_Sheet`.
- `tick()` → runs a full cycle now: `{ deficits, opened: [ids], advanced: [{ id, phase, total, done, todo, blocked, posted, waiting, standers }] }`. A cycle opens at most one project per blueprint whose deficit exceeds the active projects of that kind, then advances every active project.
- `open(kind, { origin? })` → the project or `null` (no colony, unknown blueprint, no valid footprint). Without `origin` the footprint is chosen (below).
- `advance(id)` → that project's advance summary now (or `null`).
- `cancel(id, reason?)` → bool; cancels the project's live jobs through `UF.Jobs.cancel`.
- `list(filter?)`, `get(id)`, `active()`, `state()` (the saved record below), `blueprint(kind)`, `blueprints()`.
- `reservedAt(area, x, y)` → the id of the active project whose footprint holds the cell, else `null`. Other planners (households, roads, plazas) should consult it before claiming ground.
- `footprint(project)` → the footprint cells; `cells(project, phase?)` → `[{ x, y, object, state }]` with `state` `done | clear | build | blocked` for the phase (default: the current one).
- `describe(idOrProject)` → "Communal shelter #1 at (140,120)-(144,124): phase 2/4 walls, 9/16 cells, 3 jobs open, 2 taken, waiting for log".
- `setEnabled(on)`, `isEnabled()`; `timers` (the tagged cadence and start delay); `_internal` (pure helpers for tests: `chooseSite`, `siteValid`, `reservedCellSet`, `cellStatus`, `relativeCells`, `harvestSources`, `onMapUpdate`, `onLoaded`, `now`).

**Choosing a footprint** (`chooseSite`): rings of Chebyshev distance 1… `siteSearchRadius` around the hearth; candidates in a ring are ordered by `World.hash32(seed, cx, cy, salt)` (no `Math.random`); the first valid origin wins. Valid: every cell of the footprint plus `margin` lies at least one cell inside the area, is not water (`UF.Jobs.isWaterAt`), has walkable ground (`World.walkable` with `ground: true`), is not reserved (the camp ring `colony.radius + 1` around the hearth, every `build` step's cells of `colony.plan`, `colony.stockpiles`, other active projects' footprints plus margin), and holds no constructed object; a natural object is fine when it is passable or has a harvest action `UF_Jobs` knows (`chop`, `gather`, `pick`, `quarry`, `mine`, `dismantle`).

**Advancing a project**: finished jobs are dropped from its maps (a failure counts against the cell; three failures pause the cell for `retryTicks`). For each cell of the phase, `cellStatus` reads the world: `done` (holds the target, or nothing to clear in the site phase), `clear` (a natural object with a harvest action that `canFullyClear`: one job of that action, so a tree is chopped and a shrub gathered, and a stump chopped after), `build` (the target object is missing), `blocked` (another building, or an object no job clears; reported, never removed). `canFullyClear(t)` follows the harvest's `becomes` chain: the remainder must be passable or clearable in turn, so an oak (stump, choppable) clears and a berry bush (bare bush, no action) does not; `siteValid` uses the same query, so such a footprint is never chosen (DEUS-TSK-FABLE-04). A `build` cell gets a `build` job once every `build.items` count lies on it (with `UF_Jobs`' substitutes: `log` for `wood`, `fiber` for `straw`, `rocks_small` for `stone`); otherwise `haul` jobs, one per source stack, from the nearest unclaimed ground stacks within `materialRadius` that do not lie on a reserved footprint. A haul asks for exactly what the cell still needs (`params.count`, splitting a bigger stack on its cell first); how much of it one carrier lifts is `UF_Jobs`' legal-lift rule (`docs/systems/UF_Jobs.md`), and what stays behind is hauled next. When no stack covers the need, up to `harvestPerMaterial` harvest jobs go to the nearest catalog objects whose action yields the material (an oak for logs, a shrub for fiber, loose stones for stone), outside every reserved footprint. A square somebody stands on is skipped and rechecked after `recheckTicks`. When no cell is `todo` or `blocked`, the phase steps and `advance` runs again at once for the new phase (bounded by the number of phases), so its first jobs are posted in the same update rather than at the next cadence cycle; after the last phase the project is `done`.

Posted jobs are open (`owner null`) with `params.project` (the id) and `params.phase`; hauls also carry `params.material`. The maps `jobs` (cell → job id), `hauls` (item id → `{ job, cell, type, count }`) and `harvests` (cell → `{ job, material }`) keep one live job per cell and per item. Once a colonist takes a job, `UF_Jobs`' reservation manager reserves the target cell and the item for that unit, as for any job.

## 3. Events (`UF.Events`)

- Emits `projects:evaluated(deficits)` (each cycle), `projects:opened(project)`, `projects:sited(project)`, `projects:jobPosted(project, job)`, `projects:phase(project)`, `projects:done(project)`, `projects:cancelled(project, reason)`.
- Listens: `jobs:done`, `jobs:failed` (a job with `params.project` marks that project for an advance on the next map update).

## 4. Save data

`UF.World.state.colony.projects = { version: 1, nextId, list: [project] }` (inside the colony record, so it rides in `contents.ufWorld`).

`project = { id, kind, state: "active" | "done" | "cancelled", phase, origin: { area: { x, y }, x, y, z }, size, margin, created: { domain: "action", tick }, sited: {…}, finished: {…} | null, jobs: { "x,y": jobId }, hauls: { itemId: { job, cell, type, count } }, harvests: { "x,y": { job, material } }, failed: { "x,y": { count, reason, retryAt } }, blocked: { cell, reason, since } | null, recheck: { domain, tick } | null, reason, log: [{ tick, text }] }`. Everything is JSON-safe (ids only, no object references); the harness checks a JSON round trip is identical and that the restored record is usable. Runtime caches (`nextRunAt`, the dirty set, the yield index) are rebuilt after `DataManager.extractSaveContents`.

## 5. Checks

Headless (`node tools/test_settlement_projects.js`; exit 0/1/2): runs the real `DEUS_Objects.js`, `DEUS_Items.js`, `DEUS_Jobs.js` and `DEUS_Projects.js` in a Node vm against a World double (one 64×64 ground area, object grid, water cells, units walking one cell per update) with the real catalog, a camp ring with two gaps, three straw beds, eight founders and material stacks in the open; a minimal idle loop takes open jobs and steps a colonist off a reserved cell.

| Check | FAILs when |
|---|---|
| `plugin_loads` | the API or the tagged cadence timer is missing |
| `no_unseeded_random` | the source contains `Math.random` |
| `deficit_year1` | 8 founders don't give shelter 0/1, beds 3/8, stockpiles 0/1 |
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

In-game (`UF.Test` suite `projects`, not in the default run: `node tools/test_snapshot.js --name projects --plugins DEUS_Projects --suite projects`): `colony_present`, `deficits_year1`, `project_opened` (exactly one project, whether the suite's cycle or the plugin's own first cycle opened it), `site_reserved` (outside the ring), `jobs_posted` (open, unowned), `job_assigned_in_engine` (a posted job assigned to the nearest colonist through `UF.Jobs.assign`, the overseer's order path, plans a stand cell and reserves its target), `job_done_in_engine` (at ×8 the colonist walks there and finishes it within 60 s: the object on the cell changes and the project's cell leaves the `clear` state), `saved`, `no_errors`; screenshot `projects.site.png` centred on the footprint. Autonomous pick-up cannot be observed in-game while `UF_Colonists` decides nothing (Objective 2); the first run's `job_taken_by_colonist` check failed for that reason and was replaced by the two assignment checks.

## 6. Status (2026-09-22)

Works (evidence in the harness output and `docs/STATUS.md` → DEUS-TSK-FABLE-02): deficits for the locked start, deterministic siting outside the camp and the society plan, four phases posting clear/haul/build/harvest jobs that the real `UF_Jobs` executes, save/load round trip, coarse cadence.

Known limits and findings:
- **Overlap with the society plan.** `UF_Colonists`' plan also builds a 7×7 shelter, a door and 8 beds around the hearth. Both can run: the project reserves other ground and counts the plan's results as supply, so whichever finishes first closes the deficit; a plan shelter finished while a project is active does not cancel the project (it completes what it reserved). Whether the plan's `shelter`/`door`/`beds` steps should retire in favour of this planner is the coordinator's decision.
- Fixed 2026-09-23 (DEUS-TSK-FABLE-04): `UF_Jobs` build now places before it consumes and verifies the materials at apply time, so a refused placement costs nothing; `UF_Jobs` lifts only the legal part of a stack, so whole-stack hauls no longer fail `encumbered`; a phase steps into the next one at once; a footprint whose objects cannot be fully cleared (berry bushes) is never chosen.
- **No autonomous taker in the current tree.** `UF_Colonists`' decision loop is wiped (Objective 2, 2026-09-22), so posted jobs wait for overseer orders or `UF.Jobs.assign`. The in-game run on 2026-09-22 (real 256 world, seed of the run) sited the shelter at (117,127)–(121,131), 9 cells from the hearth, and posted `gather`/`pick` clearing jobs; nobody took them in 30 s at ×8. When the loop returns, note that open designations came before the society plan in its decision (`designationJob` before `planJob`), so project hauls would be taken before knives and clothes are crafted; `jobPriority` 0 keeps them level with player designations.
- Only the primary colony record is planned; `colony.settlements` are read for deficits but get no projects.
- Only the shelter deficit has a blueprint; bed and stockpile deficits are reported, not built. A stockpile blueprint is a catalog addition (`colony.projects.blueprints`).
- Doors: the hearth and beds are built after the door closes the ring; colonists pass their own doors through `UF_Doors.canUnitPass`. Not exercised by the headless harness (no doors plugin in the sandbox).
