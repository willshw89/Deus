# UF_History
Simulates 500–600 years of the factions' past from the world seed on every New Game, after UF_Factions: every faction starts in year 0 with one site and a ruler; then populations grow, sites are founded and grow (camp → village → town, or holds, warrens), rulers succeed one another, hostile pairs go to war, lost wars turn sites into ruins, peace, alliances and trade move the relations, plagues cut populations, beasts make lairs. The result is `UF.World.state.history`; the generator stamps the sites into the world and people (units of kind `person`) stand at every living site. Status: built 2026-09-18 (rewrite of Gemini's draft of the same day, which followed no contract and named the reference game in its description), checks: `history` (11 checks, all PASS on a snapshot copy 2026-09-18; `smoke` on the same kind of snapshot: see Checks).

**Owner:** Claude Code (history agent) · **File:** `game/js/plugins/UF_History.js` · **Load order:** after `UF_World`, `UF_WorldGen`, `UF_Factions`; before `UF_Objects`, `UF_Wildlife`, `UF_Test` (WORLD_ARCHITECTURE §5). Already registered in the real `game/js/plugins.js` (the entry's description still shows the draft's text until the editor re-reads the file). Tested with `--plugins UF_Tiles,UF_Objects,UF_Items`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §2.7, §3.7, §5.8.

## API (`UF.History`)
- `generate(state)` → `state.history` (see State) or `null` without a catalog or factions. Deterministic from `state.seed` (`mulberry32(hash32(seed, 0x4157))`); reads terrain through `UF.WorldGen.cellInfo`, swapping `UF.World.state` for the duration when `state` isn't the live world (tests, other seeds). Updates `state.factions`: each faction's `home` (its first living site), `population`, and `relations` (drifted by wars, peace, alliances, trade, sacks; the "one alliance ≥ 40 and one hostility ≤ −40" guarantee re-applied). Doesn't spawn people.
- `spawnPeople(state)` → the units added: at every living faction site, `sites.peoplePerSite` (rolled from `hash32(seed, 0x9e0b)`) units on free cells inside the ring, images round-robin from `catalog.people[species].images`, `data: { kind: "person", faction, species, ai: "wander", home: {x, y} (the site cell), wander: radius + 2, site: siteId, tint? }`. Only for the live world (`UF.World.state === state`).
- `sitesIn(ax, ay)` → `[{ ...site, radius, pieces: [{ dx, dy, object: objectId }] }]` for the area, or `[]` without a history. Layout per site from `catalog.sites.kinds[site.kind]`: `ring` on the Chebyshev square at `radius` (clockwise from the top-left corner) minus `gaps` evenly spaced 2-cell openings (the first at the middle of the top side), `center` at (0,0), `inside` objects at seeded cells inside (`hash32(seed, 0x5173, site.id)`; the center and its 4 neighbors stay free). Ring pieces come first. UF_WorldGen calls this for every area build and stamps the pieces (§3.7).
- `pieces(site)` → the same layout for one site; `sites()` → all sites (copy); `siteById(id)`.
- `events({ faction?, type?, site?, since? })` → the matching events, oldest first. Types: `founding`, `growth`, `succession`, `plague`, `beast`, `war`, `peace`, `war_end`, `sack`, `alliance`, `trade`.
- `summary()` → per non-player faction `{ id, name, species, population, sites: [{id, name, kind}] (living), ruins: [{id, name, year}], wars: n, ruler: {name, title, since} | null }`.
- `siteAt(x, y, area?)` → the site whose disc (`radius + 1`, Chebyshev) covers the cell of the area on screen (or `area`), else `null`. `describeSite(x, y, area?)` → one line for the look label: `"<name>, a <kind> of <faction> (founded year N)"`, `"Ruins of <name>, once of <faction> (sacked in year N)"`, `"<name> (a beast's lair, year N)"`, or `null`.
- `factionName(id)`, `config()` (`catalog.history`), `sitesConfig()` (`catalog.sites`), `current()` (the live history or `null`), `lastRun` (`{ ms, years, factions, sites, events }` of the last `generate`).
- `toggleChronicle()` → shows/hides the chronicle window (`chronicleWindow()`, class `ChronicleWindow`).

How a year goes (in this order, for each faction then each pair): population × (1 + `growthPerYear`) up to `populationCap`, shared equally among the living sites; a site whose share passes a `sites.growth` threshold takes the next kind of `sites.bySpecies[species]`; when the faction's founding timer (`siteFoundEvery`) elapses, it has fewer than `maxSitesPerFaction` living sites and population ≥ 30 × (living + 1), a new site is placed within 60 cells of one of its sites; a ruler whose reign (`rulerReign`) ended is succeeded; `plagueChancePerYear` → −20…−50 % population; `beastChancePerYear` → a `lair` site (faction `null`) within 60 cells of one of its sites, at most one lair per faction in the world. Pairs at war: `peaceChancePerYear` ends it (relation + `relationDrift.peace`); when its length (`warLength`) runs out, `sackChance` makes the weaker side's (lower population) newest living site a ruin (`ruined = year`, kind `ruin`, population × 0.6, relation + `relationDrift.sack`; a faction with only that site first founds a replacement, so every faction always has a living site; if no cell is found the war ends with nothing won). Pairs not at war: relation ≤ −15 and `warChancePerYear` → war (relation + `relationDrift.war`); else relation ≥ 15 and `allianceChancePerYear` → alliance; else relation ≥ 0 and `tradeChancePerYear` → trade. Site cells: a walkable cell (`cellInfo`) whose whole disc of the largest radius the site can grow to (+1) is walkable, in `sites.preferredBiomes[species]` if one is found in 200 tries (then 200 tries without the biome rule), ≥ `sites.minDistanceFromStart` from the start cell of the start area, ≥ 24 cells from every other site, and at least radius + 2 cells from the area edge. In a one-area world every site is in the start area; with more areas each faction uses the provisional home area UF_Factions rolled. All names (sites, rulers, people) are built from `catalog.factions.names` syllables; nothing is hard-coded.

## State it saves
- `UF.World.state.history = { version: 1, years, events: [{ year, type, text, factions: [id], site: id | null }], sites: [{ id, faction: id | null, kind, area: {x, y}, x, y, founded, pop, ruined: year | null, name }], rulers: { [factionId]: [{ name, title, from, to }] }, wars: [{ a, b, from, until, to, sacked: siteId | null }] }`. The newest `history.eventsKept` (400) events are kept; year-0 foundings are never dropped.
- In `UF.World.state.factions`: `home`, `population`, `relations` (rewritten by `generate`).
- Person units in `UF.World.state.units` (`unit.data` as above).
- Nothing else; `sitesIn` layouts are recomputed from the seed and the site id.

## Events (UF.Events)
- Emits `history:generated(history)` at the end of `generate`.
- Listens `world:created(state)` (registered at load, after UF_Factions' listener because UF_Factions loads first): `generate(state)`, then `spawnPeople(state)`.

## Keys and mouse
- **H** (`Input.keyMapper[72] = "ufChronicle"`) toggles the chronicle window on the map: title (`Chronicle of N years`), one row per faction (name in the faction color; living sites, ruins, wars, current ruler), then the 20 most recent events (`Year N` + one sentence). Same style as UF_Factions' ledger (`Window_Base`, opacity 240, `addChild` to the scene).

## Assets used
| Asset | What for | Status |
|---|---|---|
| `catalog.people[species].images` (`$U7_Townsman`, `$U7_Ranger`, `$U7_Guard`, `$U7_Goblin`, `$U7_Skeleton`) with `tint` | Person units at the sites (`spawnPeople`) | U7 stand-ins (catalog entries, found by `tools/generate_asset_inventory.js`); the tint needs UF_Wildlife's `Sprite_Character` alias to show |
| `catalog.sites.kinds[*].ring/center/inside` objects (`wall_wood`, `wall_stone`, `rubble`, `rubble_pillar`, `campfire`, `floor_straw`, `stockpile`, `bones_pile`) | Site layouts stamped by UF_WorldGen | Catalog object entries (their own art status is in `docs/ASSET_INVENTORY.md`) |
| none drawn by this plugin | The chronicle window uses the window skin only | – |

## Checks (suite `history`, default)
| Check | FAILs when |
|---|---|
| `generated_with_world` | No `history` in the world state, or the catalog lacks `history`/`sites` |
| `simulated` | `years` outside `history.years`, the history for `seed + 1` is identical, fewer than 50 events, an event text or site name contains a reference-game or product-identity word (`avatar`, `britannia`, `guardian`, `lord british`, `iolo`, `dupre`, `shamino`, `fellowship`, `moongate`, `urist`, `armok`, `strange mood`, `fey mood`, `dwarf fortress`, `ultima`, `beholder`, `mind flayer`, `illithid`, `displacer beast`, `githyanki`), or a faction has no year-0 founding event |
| `sites_placed` | A non-player faction has no site, a site center is on a cell `cellInfo` calls unwalkable, a site in the start area is within `minDistanceFromStart` of the start, or a faction's `home` isn't one of its living sites |
| `wars_and_ruins` | Over seeds `seed`, `seed + 1`, `seed + 2` (fresh synthetic states with `UF.Factions.generate` + `generate`) there is no war or no ruined site at all |
| `deterministic` | Regenerating from a fresh synthetic state with the same seed gives a different history (years, events, sites, rulers) or different relations |
| `saved` | `JsonEx` round-trip of the world state loses or changes the history |
| `stamped_in_world` | `UF.World.buildArea` of the first non-lair site's area doesn't hold every piece's object type in `ufObjects` at `site + (dx, dy)`, or the layout has no ring piece |
| `people_at_sites` | No living site, no person units, a living site has fewer than `peoplePerSite[0]` persons within `radius + 2`, a person has an unknown faction, or no image |
| `chronicle_opens` | Setting `Input._currentState.ufChronicle` (the H key) for a frame doesn't show the window, or a second press doesn't hide it (screenshot `history.chronicle.png`) |
| `describe_site` | `describeSite` on a site cell doesn't name the site, or describes the start cell |
| `no_errors` | Any uncaught error during the suite |

Seen 2026-09-18 on a snapshot copy: all 11 PASS (three runs, seeds 1289205803, 1052841229 and 1803739206; 511/536/572 years, 346/369/400 events, 30/28/31 sites, 121 and 88 persons at 18 and 14 living sites in the last two). Seen failing: `suite_completed` on the first run (a `peoplePerSite` lookup in the wrong catalog section; fixed). `smoke` on the same kind of snapshot 2026-09-18: 6 passed, 1 failed (`colony_state_in_save`, the known failure until UF_Colonists lands). Screenshots opened: `history.chronicle.png` (the window over the map: title, six faction rows, twenty events) and `history.site_in_view.png` (a stone-walled town: ring with two openings, campfire in the middle, straw beds, stockpiles, seven people inside).

## Replaced core methods
None, aliases only: `Scene_Map.prototype.createAllWindows`, `Scene_Map.prototype.update`, `Scene_Boot.prototype.start`.

## Known limits
- Wars are frequent (10–87 per world over three runs of 511–572 years with 6 factions and the catalog's chances; one faction reached 48 wars), because `relationDrift.war` (−25) keeps hostile pairs hostile; tune `warChancePerYear` / `relationDrift` in the catalog, not in code.
- People stand still until UF_Wildlife's wander AI exists (`data.ai = "wander"` is set); their `tint` also waits for UF_Wildlife's sprite alias.
- A `ruin` keeps its ruin layout (radius 5) whatever size the site had; a sacked town leaves a smaller footprint than it had.
- Site cells are checked against `cellInfo` (biome, water, peaks) only; the generator's plants are cleared from the disc, but a river within radius + 1 would have made the cell unwalkable, so sites never sit on water.
- Older saves without `history` get no sites and an empty chronicle; nothing regenerates on load (the units and objects of that world would not match).
- With more than one area the placement uses the provisional home areas from UF_Factions and only checks the start distance in the start area.
