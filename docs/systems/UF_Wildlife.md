# UF_Wildlife
Wild creatures from `catalog.wildlife` placed with the world as ordinary world units: herds per area by biome share and region tier (evaluated per sample point), a prey herd 24–40 cells from the start (`start.kit.wildlife`), one monster herd per lair site. At runtime: a seeded, throttled wander AI for every unit with `data.ai === "wander"` (creatures and faction people), prey that steps away from a hunter, `unit.data.tint` applied to unit sprites, and `data.through` fliers that pass through everything.
Status: built 2026-09-18, checks: `wildlife` (15 checks) plus `wildlife_seeds` (1 check, on request only). Not yet registered in the real `game/js/plugins.js` (Claude Code registers it after `UF_Colonists`, before `UF_Stance`; WORLD_ARCHITECTURE §5). Tested on snapshots with `--plugins UF_Tiles,UF_Objects,UF_Items,UF_Jobs,UF_Wildlife`.

**File:** `game/js/plugins/UF_Wildlife.js` · **Load order:** after `UF_World`, `UF_WorldGen`, `UF_Objects`, `UF_Factions`, `UF_History` (their `world:created` listeners run first), before `UF_Test`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §2.4 and §5.7.

## How herds are placed (on `world:created`)
1. Each area is sampled on an 8×8 grid (64 `UF.WorldGen.cellInfo` calls): the biome and the savagery / alignment tier of every point. The sample keeps the biome shares, the tier shares and the dominant tiers (for reports and the look label).
2. Per species: `expected = Σ_points(weight[biome_p] × savageryScale[savagery_p]) / 64`, counting only points whose region the species allows (`minSavagery` met, `alignment` matched). With one tier over the whole area this is exactly `Σ(weight[biome] × share) × savageryScale[savagery]`; with mixed tiers each point counts with its own. **Revised 2026-09-18 (same day):** the first version used the *dominant* tier for the whole area. A 24-seed sweep (`wildlife_seeds`) measured 53–125 creatures with 2 seeds below the contract's 60, both tame-dominant start areas whose wild outskirts counted for nothing; per-point evaluation gives 64–121 over the same seeds, none below 60, and places monster herds on the wild fringe of a tame-centred area (the dominant-tier rule gave every monster `expected` 0 there). `herds = floor(expected × K + roll)` with `roll = unit(hash32(seed, 0x1d, ax, ay, speciesIndex))` and `K = mid(herdsPerArea) / typical`, where `typical` is the mean over the catalog's land biomes of the summed weights of the unrestricted species (4.8 with the 2026-09-18 catalog, so K ≈ 3.95). So a *typical* area totals `herdsPerArea` herds (14–24); the start area, always temperate and rich in weights, gets more (19–41 planned over the sweep).
3. A herd center: up to 96 seeded candidate cells that are walkable land, in a biome where the species has weight, in a region the species itself allows (monsters only on wild/primeval or cursed cells), not on a blocking object (`UF.Objects.blocksIn`, which peeks the area once), and at least `startSafeRadius` + 3 (predators and monsters: `predatorFreeRadius` + 3) cells from the start. No cell found → the herd is dropped (counted in `lastSpawn.dropped`). Members (`herd: [min, max]`, seeded) stand within 3 cells on cells that pass the same test without the +3, else on the center.
4. **Start kit**: the first species of `start.kit.wildlife.species` with weight in the start biome (else the first that finds a cell, else the first on any walkable cell, flagged `data.kitFallback`), one herd at a seeded angle and distance in `kit.distance`, units flagged `data.kit = true`.
5. **Lairs**: for each `UF.History.sites()` entry with `kind === "lair"` and not ruined, one herd of the first monster species with weight in that cell's biome whose region rule holds there, within 4 cells of the site, subject to `predatorFreeRadius`. Skipped when `UF.History.sites` doesn't exist.

Unit record (`UF.World.addUnit`): `{ name: species.name, image: { characterName: species.image, characterIndex: 0 }, area, x, y, dir, data: { kind: "creature", species, tags: [species.kind], tint?: "#rrggbb", through: kind === "flier", ai: "wander", home: {x, y} (the herd center), wander: species.wander, herd: n (world-unique herd number), faction: null, kit?: true, lair?: siteId } }`.

## API (`UF.Wildlife`)
| Member | Description |
|---|---|
| `species()` | The catalog species list (copies) with `index`, `tintValue`, `prey` (grazer/vermin/flier), `dangerous` (predator/monster) |
| `speciesById(id)` | One species entry or `null` |
| `speciesOf(unitOrIdOrEvent)` | The species of a creature unit (`data.kind === "creature"`), else `null` |
| `creatures()` | Every unit with `data.kind === "creature"` in the world |
| `isPrey(unitOrIdOrEvent)` | `true` for grazer/vermin/flier creatures |
| `nearestPrey(x, y, radius = 40, allowPredators = false, area?)` | The nearest prey unit within `radius` cells of `(x, y)` in the area on screen (or `area`); predators count when `allowPredators`; monsters never. `null` if none |
| `hunterOf(unitOrIdOrEvent)` | The unit assigned to a live `hunt` job (`UF.World.state.jobs.list`, `params.unitId` = this unit, `assigned` set, state not done/failed/cancelled), else `null` |
| `describe(unitOrIdOrEvent)` | `{ name, species, kind, prey, flees, herd, text }` where `text` is `"Deer · grazer · prey"`; `null` for non-creatures |
| `allowedAt(speciesId, gx, gy)` | May the species stand on world cell `(gx, gy)`: walkable, biome weight > 0, region rule holds |
| `allowedInRegion(speciesId, { savagery, alignment })` | The region rule alone |
| `plan(state?)` | The pure spawn plan: `{ herds: [{ species, area, home, cells, dirs, origin: "biome"\|"kit"\|"lair" }], dropped, lairsSkipped, kitFallback, samples }`. Same state → same plan |
| `spawn(state?)` | Adds the plan's creatures as units and returns the report (what the `world:created` listener does) |
| `lastSpawn` | `{ herds, creatures, dropped, lairs, lairsSkipped, kit: { species, x, y, area, members }, kitFallback, bySpecies, samples, ms, error }` of the last spawn; `samples["ax,ay"] = { savagery, alignment (dominant), savageryShares, alignmentShares, shares (biomes), expectedHerds (per species), K }` |
| `unitSpec(species, area, x, y, herd, dir, home, extra?)` | The `addUnit` spec for one creature (tests use it too) |
| `areaSample(ax, ay)`, `expectedHerds(speciesId, sample)`, `herdScale()` | The placement math, for tests and tuning. `areaSample` returns `{ shares, savagery, alignment, savageryShares, alignmentShares, points: [{ biomeId, savagery, alignment }] }` |
| `perf()` / `resetPerf()` | `{ ticks, avgMs }` of the AI ticks |
| `PREY_KINDS`, `DANGEROUS_KINDS`, `KINDS`, `WANDER_EVERY` (90), `WANDER_CHANCE` (0.35), `FLEE_EVERY` (30), `FLEE_RANGE` (6), `HERD_SPREAD` (3) | Constants |

**Wander AI** (`Game_Map.update` alias, after UF_World and UF_Jobs): every 90 map updates, for every unit with `data.ai === "wander"`, no `goal`, no job (`data.jobId` or `UF.Jobs.of`), in the area on screen or one of its 8 neighbors: with probability 0.35 (`hash32(seed, 0x77, unitId, frame)`) it is sent (`UF.World.sendUnit`) to a seeded cell within `data.wander` of `data.home` that it can reach (on screen: `$gameMap.isPassable`, not a water tile, no event on it; off screen: `cellInfo.walkable` and no blocking object; fliers: any cell of the area). Otherwise it stays put.
**Flee** (every 30 map updates): each creature whose species has `hunt.flees` and whose hunter (`hunterOf`) is in the same area within 6 cells (Chebyshev) steps to the 4-neighbor that gains the most distance from the hunter and can be entered (`Game_Event.canPass` on screen, `cellInfo` + objects off screen). One cell per 30 updates, so a walking hunter (16 frames per cell) gains on it: a hunt takes chasing but ends.

## State it saves
Nothing of its own. Creatures are ordinary units in `UF.World.state.units` (`data` as above). Hunters are read from `UF.World.state.jobs` (UF_Jobs' state). Caches: the species table (rebuilt from the catalog), `lastSpawn`, AI perf counters.

## Events
Emits `wildlife:spawned(report)` after the `world:created` spawn. Listens: `world:created` (registered at plugin load).

## Keys and mouse
None.

## Assets used
All are U7 stand-ins (`$U7_*`, 3× scale, `img/characters`), to be replaced by AR-401 (the catalog's `wildlife.about` names it; the request rows still need writing in `docs/ASSET_REQUESTS.md`). Each unit sheet needs 4 facings × stand/walk (3 columns × 4 rows, `$` sheet) and an alive/dead state for prey (the kill drops items today; a corpse image is not used yet).

| Asset | Species (catalog `wildlife.species[].image`, tint) | Status |
|---|---|---|
| `$U7_Deer` (576×768, 192 px frames) | deer | U7 stand-in |
| `$U7_Dog` (288×384) | boar (#7a5a40), jackal (#d0b080) | U7 stand-in |
| `$U7_Ox` (576×768) | aurochs (#6a4a30) | U7 stand-in |
| `$U7_Horse` (576×768) | wild_horse | U7 stand-in |
| `$U7_Sheep` (288×384) | wild_sheep | U7 stand-in |
| `$U7_Hare` (144×192, grey-brown) | hare | U7 stand-in |
| `$U7_Chicken` (144×192, gold) | fowl (#c0a080) | U7 stand-in |
| `$U7_Rat` (144×192) | rat | U7 stand-in |
| `$U7_Wolf` (288×384) | wolf | U7 stand-in |
| `$U7_Fox` (288×384) | fox, arctic_fox (#e8f0ff) | U7 stand-in |
| `$U7_Cat` (288×384) | wildcat (#b09070) | U7 stand-in |
| `$U7_Serpent` (288×384) | serpent | U7 stand-in |
| `$U7_Hawk` (288×384) | hawk (flier, `through`) | U7 stand-in |
| `$U7_WildBird` (144×192) | songbird (flier) | U7 stand-in |
| `$U7_CaveBat` (288×384) | bat (flier) | U7 stand-in |
| `$U7_CaveSpider` (288×384) | giant_spider, sand_stalker (#e8d090) | U7 stand-in |
| `$U7_Troll` (144×192, no sidecar) | troll, bog_horror (#70b070) | U7 stand-in |
| `$U7_Skeleton` (144×192, no sidecar) | restless_dead, ice_wraith (#a0d8ff) | U7 stand-in |
| `$U7_Townsman` | `TEST_hunter` units in the `wildlife` suite only | U7 stand-in (listed for its own uses) |
| `!$TimberOak` (catalog object `oak`) | placed by the suite for the flier pass-through check only | original (UF_Objects' asset) |

## Checks (suite `wildlife`)
| Check | What would make it FAIL |
|---|---|
| `catalog_species` | A species without id/name/image, an image file missing from `img/characters`, a kind outside grazer/vermin/flier/predator/monster, no `hunt: { work > 0, flees: boolean }`, a bad `herd` range, an unknown biome / yield item / tier id, a tint that isn't `#rrggbb`, duplicate ids, or `start.kit.wildlife` naming an unknown species |
| `names_clean` | A species name or id containing a banned Ultima/DF/D&D word |
| `spawned_with_world` | No spawn report (the listener didn't run), an error in it, fewer than 60 creature units or fewer than 3 species in the world |
| `by_biome` | Any creature (checked with `cellInfo` at its cell) in a biome where its species has weight 0, or on an unwalkable cell |
| `start_kit_herd` | Fewer than 2 prey of the kit species within `kit.distance[1]` + 3 of the start, fewer than 2 flagged `data.kit`, any of them not prey, or one nearer than `distance[0]` − 4 |
| `none_too_near_start` | Any creature within `startSafeRadius` of the start, or any predator/monster within `predatorFreeRadius` |
| `monsters_only_wild` | A placed monster whose own cell's region is below its `minSavagery` or not its `alignment`; or the tame/neutral start region allowing a troll or the restless dead |
| `deterministic` | `plan(state)` twice giving different herds, or no herds |
| `drawn_and_tinted` | Test boar/deer/hawk sprites missing, invisible or without opaque pixels; boar tint ≠ its species tint; deer tint ≠ 0xffffff; hawk not `through` (data, `isThrough`, or unable to step into an oak cell); deer `through` or the oak cell passable |
| `nearest_prey` | `nearestPrey` not returning the deer at radius 6, not the wolf with `allowPredators`, or something at radius 1 |
| `wanders` | None of 4 test hares (ai wander, radius 4) leaves its cell within 15 s, or one ends up more than 5 cells from home |
| `flees_hunter` | With a hunt job (via `UF.Jobs.create` when loaded, else a raw record) assigned to a hunter 2 cells east: the hare never picks a goal, its goal isn't farther from where the hunter stood at that moment, it doesn't move within 4 s, `hunterOf` doesn't resolve both hunters, or the boar (`flees: false`) moves |
| `saved` | A creature's `species/home/herd/tags/tint/ai` changed through a `JsonEx` round-trip of `UF.World.state`, a tinted creature lost its tint, or `DataManager.makeSaveContents().ufWorld.units` lacks it |
| `perf` | Fewer than 6 AI ticks in 182 frames, or an average tick over 1 ms with every unit in the world simulated |
| `no_errors` | Any uncaught error during the suite |
Screenshots: `wildlife.test_herd.png` (the map centre at zoom 1:1 with the tinted boar, the deer and the hawk among the start events and, since UF_History's 2026-09-18 18:51 revision, the player faction's home site and its people), `wildlife.herd_in_view.png` (the kit hare herd where it was placed, zoom 2/3).

**Suite `wildlife_seeds`** (on request: `--suite wildlife_seeds`, about 50 ms): `population_over_seeds` plans 24 fixed synthetic seeds with `plan(state)` (swapping `UF.World.state` the way UF_History's checks do) and FAILS when any seed plans fewer than 60 creatures; its detail lists per seed the dominant tiers, the tame share, herds, creatures, monster herds and dropped herds. Run it after any change to the placement math or to `catalog.wildlife`.

Observed 2026-09-18:
- seed 508810878 (dominant-tier version, tame/neutral): 65 creatures of 12 species in 20 herds, 0 dropped, 0 lair herds, 195 ms; AI tick avg 0.173 ms with 144 units.
- seed 1407852320 (per-point version, tame/neutral, 2 lair herds): 73 creatures of 11 species in 22 herds, 0 dropped, 214 ms; 2 monsters placed on cells whose own region allows them; AI tick avg 0.126 ms with 176 units.
- `wildlife_seeds`, 24 seeds: dominant-tier version 53–125 creatures (mean 93.5), 2 seeds below 60; per-point version 64–121 (mean 90.7), 0 below 60, 19–41 herds, 0–3 monster herds per seed, at most 1 herd dropped. The floor (64) is still close to the contract's 60: raising `wildlife.herdsPerArea` or `savageryScale.tame` in the catalog (Claude Code owns it) is the lever if a wider margin is wanted.

## Replaced core methods
None, aliases only: `Game_Map.prototype.update` (AI ticks), `Sprite_Character.prototype.update` (tint), `Game_Event.prototype.isThrough` (inherited method, aliased on `Game_Event`; `data.through` units are through), `Scene_Boot.prototype.start` (checks).

## Known limits
- Off-screen creatures move in straight lines (UF_World), so wander goals off screen are checked only at the target cell.
- A wanderer whose path is blocked keeps trying for 300 frames (UF_World's stuck limit) before dropping the goal; dense forests make herds drift slowly.
- Fleeing is one step per 30 map updates in the best of 4 directions; a cornered hare (no neighbor farther from the hunter) stands still. Fleeing never crosses area edges.
- `herdsPerArea` is met by a *typical* area (mean land biome); rich temperate areas hold more herds, deserts fewer. Tune `wildlife.herdsPerArea` or the species weights in the catalog, not code. Population per seed varies with the biome mix of the 64 sample points (64–121 creatures over the 24-seed sweep).
- The spawn calls `UF.Objects.blocksIn` before the map is loaded, which builds the start area once through `peekArea` (about 200 ms); `DataManager.loadMapData` builds it again for the map. The build is deterministic, so both agree.
- Lair herds need `UF.History.sites()` returning `{ kind, area, x, y, ruined }`; when the history plugin doesn't provide it, none are placed (no error).
- Corpses: a kill (UF_Jobs `hunt`) removes the unit and drops items; there is no dead-animal image yet (AR-401 should include one per prey species).
- No day/night behavior, no predator hunting of prey, no breeding; herds don't migrate between areas.
