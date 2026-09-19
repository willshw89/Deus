# UF_Factions
Rolls the factions of a new world from the seed (4–7, species by weight, stances, relations from −100 at war to +100 allied, the player's among the playable species) and gives each one its own **area** on habitable land: the player's at the map centre, every other spread apart (VISION V4 and V31 as revised by the user on 2026-09-19: no history, every faction starts as two men and two women dropped into its area). Press **F** for the ledger of the factions your people have met.
Status: built 2026-09-18 (seeded factions, d43e6de), areas added 2026-09-19; checks: `factions` (15 checks).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Factions.js` · **Load order:** after `UF_World` and `UF_WorldGen` (it reads `UF.WorldGen.cellInfo`), before `UF_History` (its `world:created` listener runs first). Contract: `docs/design/WORLD_ARCHITECTURE.md` §2.7, §2.8.

## API (`UF.Factions`)
| Member | Description |
|---|---|
| `generate(state)` → `state.factions` | Rolls the factions from `state.seed` (`mulberry32(hash32(seed, 0xfac7))`), their relations (species affinity + stances + chance, then the "one alliance ≥ 40 and one hostility ≤ −40" guarantee), picks the player's (a species with `playable !== false`), then calls `placeAreas`. Same seed, same factions and areas. Emits `factions:generated`. |
| `placeAreas(state)` → the list or `null` | Sets every faction's `home = { area: {x, y}, x, y }` (the area centre) and `areaInfo`, and `state.viewStart` to the player's centre. Seeded from `hash32(seed, 0xa7ea, attempt)`, separate from the faction roll, so the terrain never changes a name or a relation. Swaps a synthetic state into `UF.World.state` for the call (tests, other seeds). `null` without UF_WorldGen or the catalog. |
| `habitable(cellInfo, species)` → bool | Walkable land (no water, no peak rock, no ground kind with `passable: false`), not in a cursed region unless the species is in `areas.cursedOk`. |
| `areasConfig()`, `waterConfig()` | `catalog.factions.areas` and `catalog.start.kit.water` with their defaults. |
| `lastAreas` | `{ ms, attempts, relaxed, gap, cells }` of the last placement (`cells` = cell lookups). |
| `all()`, `get(id)`, `player()`, `playerId()`, `state()`, `listed()` | The factions; `"player"` is an alias of `playerId` everywhere. `listed()` = the player's and the met ones. |
| `relation(a, b)`, `tierOf(v)`, `tierBetween(a, b)`, `setRelation(a, b, v, reason)`, `adjust(a, b, d, reason)`, `alliesOf(id)`, `enemiesOf(id)` | Relations (symmetric, −100…100) and their tiers (allied ≥ 50, friendly ≥ 15, neutral ≥ −14, hostile ≥ −49, at war). |
| `meet(id)`, `checkContact()` | Contact: an unmet faction is met when one of its units comes within 12 cells of one of the player's (checked every 120 map updates). |
| `speciesName(id)`, `stanceNames(f)`, `config()`, `TIERS`, `LedgerWindow` | Helpers. `window.$factionManager` stays as a thin adapter for the earlier draft's callers. |

### How the areas are placed (`placeAreas`)
1. One coarse grid per area of the world: every 3 cells (a river is at least 3 cells wide, so every river crosses a sampled column), the cell's `UF.WorldGen.cellInfo`, and a two-pass 3-4 chamfer distance to the nearest drinkable water (`start.kit.water.kinds`: fresh, pond, icy, marsh, swamp; not salt, brackish, deep sea or blighted).
2. **The player's**: the habitable cell nearest the map centre within `playerReach` (6) whose disc of `clearDisc` (5) cells is walkable; failing that a disc of 2, failing that any habitable cell there. No random numbers: a function of the terrain only (the start climate keeps the centre temperate, `WORLD_ARCHITECTURE` §3.1).
3. **Every other faction**, in list order: the coarse cells at least `edgeMargin` (12) from the map edge, habitable, at least `minGap` (40) from every centre already placed; the first rule that leaves a cell wins: (a) one of `sites.preferredBiomes[species]` with drinkable water within `start.kit.water.reach − 3` (27) cells, (b) water only, (c) biome only, (d) any; a seeded pick among them whose `clearDisc` disc is walkable. If a pass boxes a faction in, the whole pass restarts with the next seeded stream (16 attempts), then the gap is relaxed by a fifth at a time (recorded in `areaInfo.gap` and `lastAreas.relaxed`; the `areas` check fails on it).
4. In a world of several areas each non-player faction keeps the area it rolled (`home.area`) and the player's is the start area; the rules apply inside each area.

Measured: a Node survey of seeds 1–200 (stubbed RMMZ, the real UF_WorldGen) placed every world in one attempt, never relaxed the gap, smallest pairwise distance 40.0, every area with drinkable water within 30 cells by the coarse estimate; 59 ms on average, 88 ms at most, about 7 700–7 900 cell lookups. Rules used: centre 200, preferred biome + water 648, water only 242.

## State it saves
- `UF.World.state.factions = { version: 3, list: [faction], relations: { "a|b": n }, log: [{ a, b, before, after, reason, day }], playerId }`.
- `faction = { id, name, species, ethos: [id], home: { area: {x, y}, x, y }, areaInfo: { biome, water (coarse cells to drinkable water, or null), rule ("centre" | "preferred+water" | "water" | "preferred" | "habitable"), disc, gap? }, color, isPlayer, met, population }`. `population` starts at the founders' count (`factions.founders`, 4). Other plugins read `home` (UF_History's camps, UF_WorldGen's kit, the ledger).
- `UF.World.state.viewStart = { x, y }`: the player's centre (UF_World's `Game_Player.setupForNewGame` starts the view there; UF_History sets the same cell).

## Catalog fields it reads
`factions.count`, `species` (`id`, `name`, `weight`, `playable`, `groups`), `speciesAffinity`, `ethos`, `sameSpecies`, `randomSpread`, `names`; **`factions.areas`** (`minGap` 40, `edgeMargin` 12, `playerReach` 6, `clearDisc` 5, `cursedOk` [] — the catalog's regions don't mark species as good or evil, so by default no species settles cursed land); **`factions.founders`** (only the count, for `population`); `start.kit.water` (`reach` 30, `kinds`); `sites.preferredBiomes`; `groundKinds[].passable`.

## Events
- Emits `factions:generated(state.factions)`, `factions:relationChanged(a, b, before, after, reason)`, `factions:met(faction)`.
- Listens `world:created(state)` (registered at load; UF_Factions loads before UF_History, so it runs first): `generate(state)`.

## Keys and mouse
**F** toggles the ledger (the player's faction and the factions met so far; relations with the player's on the right).

## Assets used
None drawn: the ledger uses the window skin.

## Checks (suite `factions`)
| Check | FAILs when |
|---|---|
| `generated_with_world` | No catalog `factions` or no `state.factions.list` |
| `count_in_range` | The number of factions is outside `factions.count` |
| `player_faction` | `player()` isn't `playerId`, isn't `isPlayer`, isn't in the list, is of a species with `playable: false`, or `relation("player", its id)` isn't 100 |
| `names_unique` | Two factions share a name |
| `relations_complete` | A pair has no relation or one outside −100…100 |
| `aligned_and_disaligned` | No relation ≥ 40 or none ≤ −40 |
| `relation_symmetric` | `relation(a, b) ≠ relation(b, a)` |
| **`areas`** (2026-09-19, replaces `homes_valid`) | A faction has no area; its centre isn't habitable (`habitable(cellInfo)`); a cell within its disc (`clearDisc`, the player's the disc it was placed with) isn't walkable; a non-player centre is within `edgeMargin` of the edge; two centres are closer than `minGap`; the player's is more than `playerReach` from (128,128) or outside the start area; `state.viewStart` isn't the player's centre; the same seed regenerated gives other areas; the next seed gives the same areas |
| `same_seed_same_factions` | Two generations from the seed differ, or differ from the live world's names or player |
| `new_seed_new_factions` | The next seed gives the same factions |
| `saved_with_world` | A `JsonEx` round-trip changes the factions |
| `unmet_not_listed` | The ledger lists an unmet faction |
| `contact_reveals_faction` | A test scout of ours 3 cells from a test unit of an unmet faction doesn't make it met and listed within 6 s |
| `ledger_opens` | F doesn't show the ledger (screenshot `factions.ledger.png`) |
| `no_errors` | Any uncaught error during the suite |

Removed 2026-09-19: `homes_valid` (other factions' homes not within 24 cells of the map centre): the `areas` check tests the new, stricter rule (40 cells between any two centres).

Seen 2026-09-19 on snapshot copies of the game with the catalog edit: 15/15 PASS (seed 1221429480: an elf grove in conifer forest and one in taiga, an orc band in tropical savanna, the player's dwarves at (128,128); closest pair 63.1; placement 66 ms). Seen failing on a sabotaged copy (the second faction moved 5 cells from the first): `FAIL factions.areas - … closest pair 5.0 (want >= 40); … PROBLEMS: The Vasum Grove and The Ostar League only 5.0 cells apart`.

## Replaced core methods
None, aliases only: `Game_Map.prototype.update` (contact), `Scene_Map.prototype.createAllWindows`, `Scene_Map.prototype.update` (F), `Scene_Boot.prototype.start` (checks).

## Known limits
- Relations don't move by themselves in play yet (no wars, trade or alliances after New Game); `setRelation` / `adjust` are there for the plugins that will.
- The chronicle (H) names every faction, met or not; the ledger (F) only the met ones.
- The ledger's "area x,y" is the area of the world (always 0,0 in a one-area world), not the centre cell.
- `areaInfo.water` is the coarse chamfer estimate; the worldgen `kit_per_area` check measures the real distance on the built map.
- A map with no drinkable water within reach of any valid cell would place a faction by rule (c) or (d) with no water near; never seen in the 200-seed survey, and `kit_per_area` fails if it happens.
