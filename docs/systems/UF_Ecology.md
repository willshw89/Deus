# UF_Ecology: the ecology director (census, recovery, monster spawns, plant spread)

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Ecology.js` (version 2, built 2026-09-19 on Codex's version 1) · **Design:** `docs/design/ECOLOGY.md` · **Tuning:** catalog key `ecology` (`tools/add_ecology_catalog.js`) · **Load order:** after `UF_World`, `UF_WorldGen`, `UF_Objects`, `UF_History`, `UF_Wildlife` (its `world:created` listener must run after UF_Wildlife has placed the herds), before `UF_Test`. VISION V74, V75, V83, V85, V68, V80.

**Registration (not applied; the RMMZ editor was open):** `game/js/plugins.js` gets `{"name":"UF_Ecology","status":true,"description":"[UF Ecology] Plants spread and regrow; wildlife and monsters recover under biome caps; ore never returns.","parameters":{}}` right after `UF_Wildlife`, before `UF_Stance`. `tools/register_world_plugins.js`: `"UF_Ecology"` after `"UF_Wildlife"` in `ORDER`, and the same description in `DESCRIPTIONS`. The catalog change is `node tools/add_ecology_catalog.js` (adds the `ecology` key, appends the `sapling` object; every other key asserted unchanged). When `UF_Levels` lands, add `@orderAfter UF_Levels`.

## 1. Purpose
Keeps the world's living things coming back without ever scanning the whole map while the game runs (VISION V74, V75, V83). The ground is cut into **buckets**: one level, one 64×64 block, one biome (the biome of each 4×4 tile's centre sample). A **census** counts, per bucket, the living creatures of every species (by their herd's home cell) and the renewable plants of every kind; it is rebuilt by one full scan at New Game and after a load and is then kept up to date by events, O(1) or O(log n) each. Once per game hour (60 world beats) the **director** services `bucketsPerStep` buckets in a seeded round-robin over every enabled level, whatever is on screen:
- **Births:** a herd below its size (its size when placed; `herd[1]` for herds ecology made) with at least 2 members breeds near a member or its home, after its species' `birthBeats` (hare 2,880 beats, deer 8,640, aurochs 14,400), under the local, level and world caps. Kit herds (V67) breed back to their size even above the bucket's share.
- **Arrivals:** a species with no breeding herd left in a bucket whose share is at least one animal, while the level is below its target, comes back as a herd walking in from a coastal entry cell on the same connected land, heading for a home in the bucket (at most `maxInFlight` groups at once, one per species per `cooldownBeats`).
- **Monsters:** each bucket with monster habitat has a seeded clock (`intervalBeats` 2,160-5,760, i.e. 36-96 hours); when it is due, a roll against the bucket's monster deficit places one group on the bucket's land, at least 60 cells from the player's camp, 40 from any other camp or site, 12 from any person, never in view, under the per-species level cap and the level's `monsterCap`.
- **Plants:** a kind below its target spreads from a random parent to a cell within `seedRadius`; a kind gone from a bucket comes back by seed rain; a harvested cell regrows on its own timer (a gathered tuft after `regrowBeats`, a felled tree through `stump` → `sapling` after `stumpToSaplingBeats` → the tree after `saplingToTreeBeats`); every timer checks the caps when due and waits while a unit stands where the plant would block or while the cell is in view.
- **Minerals never return:** `isRenewable` is false for anything tagged mineral, ore, gem, stone, ruin, building or remains.

Every placement goes through one gate (`canPlaceUnit` / `canPlacePlant`, cheapest test first): bounds and bucket; walkable land (water for water plants) of the right biome and region; not in view (the view rectangle plus `viewMargin`); camp, site and person clearance; not a road, built floor or job target; no object (plants); no unit; walkable (UF_World's grid). Units then pass `UF.World.cellFree` (V68's own test) and are added with `UF.World.addUnit` (never `exact`); a unit the guard moved anyway would be removed and counted as a failure. Plants go through `UF.Objects.setIn` (which `UF.World.setObject` refuses on a stander).

Durations are world beats (V85: 60 beats = 1 game hour at ×1); the director rounds a due time up to the next hour. Action durations (chopping, mining, cooking) belong to the work-timing build, not here.

## 2. Public API (`UF.Ecology`)
| Member | Returns / does |
|---|---|
| `VERSION`, `config` | 2; the resolved `ecology` catalog key over the plugin's defaults |
| `state()` | The saved record (§4), created or migrated on first use |
| `ready()`, `isReady()` | Builds the index and census if needed (true when it could); whether they are current |
| `zOf(o)`, `levels()` | The z helper (`UF.Levels.zOf` when it exists, else `o.z \| 0`); the enabled ecology levels (`[0]` today) |
| `bucketOf(z, area, x, y)` | Bucket key of a cell, or `null` |
| `buckets(z?)`, `bucket(key)`, `index()` | Buckets in service order; one bucket (`key, z, area, bx, by, biomeId, land, water, cells, faunaShare, monsterShare, plantKinds, …`); the whole index |
| `census(key?)` | `{ fauna: { species: n }, plants: { kind: n } }` for a bucket; without a key, every count (`censusCounts()`) |
| `bruteCounts()` | The same numbers by a fresh scan of every unit and object cell, without touching the census (checks only) |
| `plantCells(key, kind)` | `[{ x, y }]` of a kind in a bucket (saplings count for their tree) |
| `herdMembers(hk)`, `levelCount(z, species?)`, `monstersOnLevel(z)`, `worldCount()` | Census reads (`hk` = `"<herd>|<species>"`) |
| `recount()`, `fullScans()` | A diagnostic full rebuild (adds to `fullScans`); the number of full scans since boot |
| `targets(key)` | `{ fauna: { s: { share, local, global, level } }, monsters: {…}, plants: { k: { target, hardCap } }, monsterCap, creatureCap }` |
| `localCap(key, s)`, `globalCap(z, s)`, `levelTarget(z, s)` | The §4.4 numbers of the design |
| `step(hour, { only? })` / `tickHour(hour)` | One director step (what `time:hour` calls); returns the step report `{ hour, buckets, phases, births, arrivals, monsters, germinated, grown, regrown, held, cancelled, attempts, fails, capBlocks, ms }` |
| `serviceBucket(key, hour, { only?: "fauna" \| "monsters" \| "plants", force? })` | One bucket's service (checks); `force` makes every roll succeed, caps still apply |
| `monsterSchedule(key, fromHour, toHour)` | The hours a bucket's monster clock is due. Pure |
| `dryRun(hours, { from?, only?, seedOffset? })` | Runs the director for `hours` from the current state and returns one line per placement, then undoes everything it did (units removed, objects put back, the ecology record restored) |
| `entryCells(z)` | The arrival entry cells `[{ area, x, y, gx, gy, comp }]` |
| `canPlaceUnit(role, speciesId, z, area, x, y)`, `canPlacePlant(kind, z, area, x, y)` | `""` or the reason (`"visible"`, `"camp nine cells"`, `"unit"`, …) |
| `isRenewable(kind)` (v1 name `isRenewableObject`), `censusKind(id)` | §1; the kind a type counts as (`berry_bush_bare` counts as `berry_bush`) |
| `growBeats(kind)`, `resourceHours(kind)` | `{ regrow }` or `{ stumpToSapling, saplingToTree }` in beats; the hours until a harvested cell is back |
| `timers()` (v1 `resources()`), `timerAt(area, x, y, z?)` | The growth timers `{ area, z, x, y, from, to, grow?, due, seq }`, sorted by due hour |
| `scheduleResource(area, x, y, fromId, expectedId, { due?, z? })`, `cancelResource(area, x, y, z?)`, `processResources(hour)` | v1 names over the timers |
| `startSapling(area, x, y, tree, { hour?, z? })` | Test and debug: a sapling on a cell now, growing into `tree` (no gate) |
| `telemetry(key?)`, `lastStep()`, `perf()`, `resetPerf()`, `activity()` | Per-bucket telemetry; the last step report; `{ steps, meanMs, worstMs, perBeatMs, fullScans, indexMs, addUnits, addUnitMeanMs, addUnitWorstMs, setIns, setInWorstMs }`; how often each entry point ran |
| `migrate(v1Record)` | The version-1 record as version 2 (pure) |
| `setEnabled(on)`, `isEnabled()`, `errors`, `errorCount()` | As in version 1 |

## 3. Events
**Emitted:** `ecology:ready` `{ levels, buckets, ms, indexMs }` (New Game) · `ecology:step` and v1's `ecology:hour` (the step report) · `ecology:born` `{ unit, herd, key }` · `ecology:arrived` `{ units, herd, key, entry }` · `ecology:spawned` `{ units, spawned, species, key, kind: "monster" | "arrival" }` (v1 name) · `ecology:germinated` `{ area, z, x, y, kind, key, via: "spread" | "rain" }` · `ecology:grew` `{ area, z, x, y, from, to }` · `ecology:resourceScheduled` (the timer) and `ecology:resourceRegrown` `(area, x, y, kind)` (v1 names). None is player-facing; nothing is written to the chronicle or over heads.

**Listened:** `world:created`, `time:hour`, `world:unitAdded`, `world:unitRemoved`, `world:unitLevelChanged` (five-level, not emitted yet), `objects:changed`, `objects:levelChanged` (five-level), `wildlife:kill` (telemetry).

**Aliases:** `DataManager.extractSaveContents` (migrate v1 → v2; the census is rebuilt on first use after the loaded map is up), `Scene_Boot.prototype.start` (checks). No per-frame hook of any kind.

## 4. Save data: `UF.World.state.ecology` (version 2)
`{ version: 2, createdHour, cursor, lastHour, rng: { counter }, nextHerd, seq, herds: { "<herd>|<species>": { species, key, z, size0, lastBirth, firstHour, origin, kit?, kitCamp?, ecology? } }, buckets: { "<z>|<ax>,<ay>|<bx>,<by>|<biome>": { plantTarget: { kind: n }, next: { monster, fired }, tel: {…} } }, timers: [ { area, z, x, y, from, to, grow?, due, seq } ], inFlight: [ { herd, hk, species, key, z, entry, home, since, units } ], lastArrival: { "<z>|<species>": hour }, stats: {…} }`. The index and census are never saved (they come from the seed and the world). Measured: 32-37 KB in five New Games (`saved` check), far under V50's 3 MB. Version-1 records (`resources`, `areas`) migrate: timers kept with z 0, a tree's timer becomes stump → sapling → tree; area baselines dropped.

## 5. Checks (suite `ecology`, on by default; each one was seen failing through `UF_TEST_PROVOKE=ecology.<name>`)
| Check | Proves | Provocation (seen failing 2026-09-19) |
|---|---|---|
| `census_sparse` | With the clock paused, 600 frames run no ecology code. 168 director steps do no full scan. The kept census equals a brute-force recount. Ecology's own time per step: mean ≤ 0.5 ms, 95th percentile ≤ 2 ms, per beat ≤ 0.05 ms; the worst step and the time spent inside `UF.World.addUnit` / `UF.Objects.setIn` are reported beside it. 1,000 census events average ≤ 0.01 ms | `census_sparse`: a full scan every step (168 scans, mean 2.6 ms) |
| `recovery` | A herd hunted to 2 grows back to its size and stops there; newborns come through `addUnit` with the herd's id and home, the wander AI, on a free cell their species may use. With the bucket filled to its local cap, 30 days bring no birth and no arrival. A species removed from a bucket with a share of at least one animal comes back as a herd at an entry cell heading for the bucket | `recovery` (birth and arrival rates 0), `recovery_cap` (caps skipped: a birth above the local cap) |
| `monster_spawns` | With the level's monsters hunted, 720 hourly steps: every spawn follows a due hour of its bucket's clock (computed twice, equal), stands where its species may, on a cell that was free, out of view, ≥ 60 cells from the player's camp, ≥ 40 from other camps and sites, ≥ 12 from people; counts stay under the local, level and monster caps. The same service replayed with a test camp on the first cell puts the monster ≥ 40 cells away or skips | `monster_spawns`: clearances 0 and candidates next to the nearest camp |
| `plant_spread` | A small plant kind thinned to 2 parents, 20 test units and 4 floor cells around them: 60 services germinate only on empty, walkable cells of the bucket's biome, never under a unit or on a floor, under the hard cap; no `world:objectRefused`. A sapling due with a unit on it waits, and grows into its tree once the unit leaves | `plant_spread`: the occupancy test dropped (germinations under test units) |
| `minerals_finite` | Every catalog object tagged mineral, ore, gem, stone, ruin or remains is not renewable; a 64×64 block mined out stays at 0 minerals through 60 days of steps; no timer aims at a mineral | `minerals_finite`: ore, mineral, gem and stone count as renewable |
| `renewable_timer` | Chop a tree: stump, a timer to a sapling after `stumpToSaplingBeats` (not an hour earlier), then to the tree after `saplingToTreeBeats`; a unit on the cell holds it; no `world:objectRefused` | `renewable_timer`: the stander test skipped (a refused write) |
| `native_regrow_single` | A gathered berry bush has UF_Objects' timer and none from ecology | `native_regrow_single`: ecology schedules one too |
| `deterministic` | With deficits made first, `dryRun(72)` twice from the same state gives the same non-empty lines; a different director seed gives different lines; a real 24-hour run gives the dry run's first 24 hours | `deterministic`: one `Math.random()` in the plant rolls |
| `saved` | JsonEx round trip equal; the save holds the live record; after a simulated load the rebuilt census and the timers, clocks, herds, counter and targets are unchanged; a version-1 record migrates with its timers | `saved`: the buckets dropped from the saved copy |
| `no_errors` | No uncaught error during the suite and nothing caught inside UF_Ecology (the live `time:hour` listener is called once) | `no_errors`: one throw inside the `time:hour` listener |

Screenshots (`test_output/ecology.*.png`): `recovered_herd` (a newborn with the Look label, beside its herd), `monster_spawned` (a spawned monster with the Look label), `plant_spread` (the thinned patch after 30 days: new tufts round the parents, the floor cells, a sapling).

## 6. Status (2026-09-19)
- **Works (snapshot runs, this date):** see the report of the build for the exact runs; the suite passed 10/10 on several New Games with different seeds, and every check was seen failing once through its provocation.
- **Performance:** the step is cheap on average (about 0.2-0.3 ms of ecology's own time, a few µs per beat). Single steps that place a group (an arrival herd, a monster) measured several ms, most of it inside `UF.World.addUnit` (sprite and event creation for the displayed area; up to 3-8 ms per unit seen) and the rest not broken down further; single steps that placed nothing also measured 2-20 ms on this loaded machine (garbage collection or other processes: the phase times inside those steps summed to a fraction of a ms). That is why the check judges the mean and the 95th percentile, not the single worst step.
- **Timing checks depend on the machine:** with three runs in parallel and about 30 other `nw.exe` processes on the machine, `census_sparse` failed its mean (0.53-0.65 ms) or its event average (0.011-0.013 ms) in 5 of 11 runs; run alone it passed.
- **Known limits:**
  - Only the ground (z 0) is enabled. Underground and upper-level tables exist in the catalog but are off until `UF_Levels` and approved underground species exist; `UF.Levels.cellInfo(gx, gy, z)` is asked of the five-level run (design D9).
  - Monster numbers follow the design's caps: a species' level cap is `ceil(level target)`, and the targets come from the same habitat math as generation, so a ground level holds 1-2 of each monster species that has habitat (the level cap of 12 is never reached). Raising `monsters.globalCapScale` raises it; a decision for the user.
  - Arrivals find their way by a land-connectivity map of the sample lattice cut by rivers and ponds; built walls and single blocked cells are not considered, so a group can occasionally stop short of its home (the in-flight record ends after `flightBeats`).
  - Newborns are adult-sized (no juvenile stage or art, design D6). Recovery never happens in view (design D5).
  - The season multiplier reads the real clock, so a check that runs the director hours ahead keeps the current season.
  - Fish stocks are not modelled (design D11).
