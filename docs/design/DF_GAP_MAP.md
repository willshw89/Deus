# DF GAP MAP: every Dwarf Fortress system against UF, with the next waves

**Written by:** Claude Code, 2026-09-19, for the user's instruction of 13:40 ("continue working on pulling DF mechanics, bones, spawns, entities, resources, build/skill/technology trees, etc. Gemini can handle the art") and the request that came with it: "It should also take a different amount of world beats to do different shit. Cooking a smores isnt the same time/difficulty as chopping down a tree or mining ore" (recorded by the lead as VISION V85).
**What this file is:** a design and status map. It changes no code, data or art. Nothing here authorizes work outside the current slice (AGENTS rule 1); the waves in §10 are an order of work for the user to approve.
**Rule it keeps (VISION V28, V9, AGENTS rule 7):** DF's mechanics are described in plain words. No DF text, raw tokens, creature names or numbers go into `game/`, and none are proposed here as content. New player-visible names are never decided here.

## 0. How to read it

**Status**
- **done**: the DF mechanic works in UF at the scope VISION sets for it, a named `UF_Test` check proves it, and that check **passed in this session's run** (§11). The scope is ours, not DF's full depth: "done" never means "as deep as DF".
- **partial**: some of it works and a check proves that part; the missing part is named.
- **none**: no current plugin does it. Data sitting in the catalog with no code reading it, or a design document, still counts as none. The evidence for "none" is a search of `game/js/plugins/UF_*.js` on 2026-09-19 (legacy plugins excluded, see §9 B7).
- **legacy**: code from before the world contract (written 2026-09-18 by Gemini) that no current system calls. It never counts as done.

**Columns:** *Proof* names `suite.check` (the check list of each suite is in its `docs/systems/` page). *Governs* is the VISION row, or **needs a user decision** with the question. *Needs first* is what has to exist before the row can move. *Wave* points at §10.

**Sources read for this file (2026-09-19):**
- DF, read-only: the raw folders `data/vanilla/vanilla_creatures`, `vanilla_bodies`, `vanilla_materials`, `vanilla_entities`, `vanilla_reactions`, `vanilla_items`, `vanilla_plants`, `vanilla_buildings` (browsed by file and by counting which kinds of tags occur, to see which mechanics DF data drives); `release notes.txt`, all major releases from 0.31.01 (2010-04-01) to 53.16 (2026-08-05). Release-note systems are cited by version and date only.
- UF: the header of every plugin in `game/js/plugins/` (50 files), every page in `docs/systems/`, `docs/design/DF_MECHANICS.md`, `CRAFTING.md`, `VERTICAL_WORLD.md`, `RESOURCE_ATLAS.md`, `CHAIN_OF_COMMAND.md`, `WORLD_ARCHITECTURE.md`, `COMBAT_CHAINS.md`, `THEME.md` (headings), `docs/STATUS.md`, `docs/VISION.md`, and `game/data/UF_WorldCatalog.json` (read with Node).
- A full test run on a snapshot of `game/` (§11).

**Not checked:** nothing in this file was tried in the RMMZ editor's Playtest (F5) or its console (F8).

## 1. At a glance

| # | DF system | UF status | Proof (this session's run, §11) | Governs | Wave |
|---|---|---|---|---|---|
| 2.1 | Surface terrain, biomes, region character | **done** (surface only) | `worldgen` 22/22, `biomes` 12/12, `tiles` 11/11 | V27, V30 | – |
| 2.2 | Materials and geology | partial | `objects.apply_chop`; catalog `materials` (7 entries) | V66, V82 | 6 |
| 2.3 | Z-levels, digging down, caverns, magma | none | `world.one_layer` passes (one layer) | V80, V82 | 6 |
| 2.4 | Fluids (flow, depth, pressure, dams) | none | – | V22, V80 | 6 |
| 2.5 | Seasons and calendar | partial (calendar only) | `daynight.clock_running` | Q11 open | 3 |
| 2.6 | Weather | none | – | V80 (VERTICAL_WORLD §6.3) | 3 |
| 2.7 | Temperature | none (a climate field only) | `biomes.all_biomes_reachable` | needs a user decision | 6 |
| 2.8 | Fire | **done** | `fire` 10/10 | V21, V25 | – |
| 2.9 | Plant growth and regrowth | partial | `objects.regrow`, `ecology.renewable_timer` | V74, V83 | 1 |
| 2.10 | Animal population recovery, monster spawns | partial | `ecology.prey_replenishes`, `ecology.monster_replenishes` | V74, V75, V83 | 1 |
| 3.1 | Wildlife behaviour | **done** | `wildlife` 22/22 (twice, §9 B1) | V24, V48 | – |
| 3.2 | Vermin | partial | `wildlife.catalog_species` | V24 | 3 |
| 3.3 | Bodies, tissues and wounds | none | – | **Q12 open** | 5 |
| 3.4 | Death, corpses, remains, rot | partial | `anim.death_frames_and_remains`, `anim.remains_saved` (`anim` 8/9) | V58, V28 | 1 |
| 3.5 | Butchery | partial (instant yields) | `jobs.hunt`, `combat.death` | V28, CRAFTING D11 | 1 |
| 3.6 | Hunting | **done** (as a work job) | `jobs.hunt`, `colonists.hunts`, `wildlife.flees_hunter` | V35 | – |
| 3.7 | Taming, husbandry, breeding, pets | none | – | V43 (animal care) | 3 |
| 3.8 | Fishing | partial | `look.dig_and_fish` | V38, V63 | 3 |
| 3.9 | Megabeasts, unique beasts | none | – | needs a user decision (lore) | 7 |
| 3.10 | Undead, evil regions, curses | partial (cursed regions only) | `wildlife.monsters_only_wild` | needs a user decision (THEME T20, T21) | 7 |
| 4.1 | Needs | partial | `colonists.thirst_makes_drink_job`, `hunger_makes_food_job` | V17, V23 | 2 |
| 4.2 | Thoughts, moods, stress | partial | `colonists.birth_thought_awarded`, `intimacy_awards_thought` | V23 | 2 |
| 4.3 | Personality | partial | `colonists.personality_differs` | V23, V39 | 2 |
| 4.4 | Relationships | none (no lasting ties) | – | V26 | 2 |
| 4.5 | Children, pregnancy, growing up, aging | partial | `colonists.pregnancy_*`, `childbirth_spawns_baby` | V26, V40, **Q11 open** | 2 |
| 4.6 | Daily routine and sleep | partial | `ownership.exhausted_uses_owned_bed` | V23, V72 | 2 |
| 4.7 | Skills that grow by doing | **done** (OSRS model) | `skills` 14/14 | V63, V84 | 1 |
| 4.8 | **Work time and difficulty per action** | partial | `skills.rate`, `jobs.tool_speeds_work` | **V85** | 1 |
| 4.9 | Ownership | partial (unregistered) | `ownership` 9/9 | V71, V72 | 1 |
| 5.1 | Jobs, designations, labors | partial | `jobs` 17/17, `look.menu_creates_designation` | V5, V34, V43 | 2 |
| 5.2 | Work orders and the manager | none | – | V5 | 4 |
| 5.3 | Workshops and production chains | partial | `jobs.craft_at_workplace`, `jobs.fetch_and_craft` | V55, V66 | 1 |
| 5.4 | Construction | partial | `jobs.build`, `doors`, `walls`, `floors` | V21, V56, V57, V73 | 6 |
| 5.5 | Mining and digging | partial (surface outcrops) | `skills.xp_by_doing`, `look.dig_and_fish` | V80 | 6 |
| 5.6 | Felling trees, gathering plants | **done** | `objects.apply_chop`, `objects.regrow`, `jobs.travel_and_work` | V35 | – |
| 5.7 | Farming | none | – | V43 | 3 |
| 5.8 | Cooking, brewing, food quality, spoilage | partial (cooking only) | `jobs.craft_at_workplace`, `colonists.hunts` | V35, V66 | 3 |
| 5.9 | Stockpiles and hauling | partial | `jobs.haul`; FAIL `look.hunt_and_haul_options` | V21 | 3 |
| 5.10 | Development and technology | none | – | V76, V77, V84 | 1 |
| 6.1 | Rooms and room value | partial | `floors.room_detection` | V56, V72 | 2 |
| 6.2 | Doors | **done** (no locks) | `doors` 12/12 | V57 | – |
| 6.3 | Roads, bridges, wells, sites | partial (not registered) | `roads` 11/11 with UF_Roads added to a snapshot | V51 | 2 |
| 6.4 | Traps | none | – | needs a user decision | 6 |
| 6.5 | Mechanisms, machines, power, pumps, carts | none | – | V22, V80 | 6 |
| 6.6 | Wealth and what it attracts | none | – | needs a user decision | 4 |
| 6.7 | Taverns, drink, performances | none | – | needs a user decision | 7 |
| 6.8 | Libraries, scholars, writing | none | – | needs a user decision | 7 |
| 6.9 | Health care and hospitals | none (regeneration only) | `combat.regen` | V43 (healing), Q12 | 5 |
| 6.10 | Burial, memorials, ghosts | none | – | needs a user decision | 7 |
| 7.1 | Civilizations and factions | **done** | `factions` 15/15, `history` 16/16 | V18, V31, V39 | – |
| 7.2 | Every faction lives and builds | none (others wander) | `colonists.people_became_colonists` (player only) | V51 | 2 |
| 7.3 | Positions, nobles, ranks, orders | partial (a leader, no orders) | `history.stats_and_ranks` | V52 | 2 |
| 7.4 | Diplomacy and relations | partial (fixed relations) | `factions.relation_symmetric`, `relations_complete` | V18 | 4 |
| 7.5 | Reputation and rumours | none | – | V18 | 4 |
| 7.6 | Trade and caravans | none (catalog data only) | `spawn.after_play` detail "arrivals: no plugin in plugins.js adds arrivals yet" | V19 | 4 |
| 7.7 | Migrants, visitors, residents | none (catalog data only) | same | V19, **Q2 open** | 4 |
| 7.8 | Military and squads | partial (attack modes) | `combat.retaliate`, `combat.styles` | V43, V64 | 5 |
| 7.9 | Sieges, raids, ambushes | none | – | V19, V43 | 5 |
| 7.10 | Justice and crime | none | – | V71 (theft rules need approval) | 7 |
| 7.11 | Religion and temples | none | – | needs a user decision (THEME T20, T21) | 7 |
| 7.12 | Artifacts and creative trances | none (legacy only) | – | needs a user decision | 7 |
| 7.13 | History, chronicle, legends | partial | `history.add_event`, `chronicle_opens` | V31, V63 | 4 |
| 7.14 | Guilds and petitions | none | – | needs a user decision | 7 |
| 7.15 | The world keeps living off screen | partial (one area, all simulated) | `wildlife.perf` (an AI tick over every unit in the world) | V14, V50, V51 | 6 |
| 8 | Inspect, designate, unit sheet, pause and speed | **done** | `sheet` 13/13, `timespeed` 20/20, `overseer` 6/6, `look` 17/21 | V13, V33, V34, V59 | – |

Counts: 9 done, 29 partial, 27 none (65 rows).

## 2. The world: ground, materials, levels, fluids, climate

### 2.1 Surface terrain, biomes and region character: **done** (surface only)
- **DF:** every map block's biome comes from world fields (elevation, rainfall, temperature, drainage, salinity, savagery, good/evil); rivers, lakes and coasts; regions are tame or wild, blessed or cursed, and that decides plants and creatures (the plant and creature raws carry biome and region conditions).
- **UF:** `UF_WorldGen.js` classifies every cell from eight seeded fields into every DF land and water biome, with three savagery tiers and three alignment tiers, rivers, lakes, an ocean rim and dense plant and stone objects; `UF_Tiles.js` draws the catalog's ground kinds (26 entries on 2026-09-19, the three floor kinds included).
- **Proof:** `worldgen` 22/22, `biomes` 12/12 (`all_biomes_reachable`, `world_variety`, `region_tiers_exist`, `lakes_or_rivers`), `tiles` 11/11.
- **Governs:** V27, V30, V67 (the start kit: `worldgen.kit_per_area`, `kit_covers_plan`, `kit_fair`).
- **Missing:** the upper-earth and deep biome tables of V82 (`RESOURCE_ATLAS.md` §3.2–3.4); a biome-appropriate kit (the kit places oaks and grass tufts on tundra too: `docs/systems/UF_WorldGen.md`, Known limits).

### 2.2 Materials and geology: partial
- **DF:** every stone, ore, gem, metal and soil is a material with physical properties (density, hardness, value, and heat properties: counting tag occurrences in the material raws, 114 give a heat capacity and 170 a melting point), laid in soil, sedimentary, igneous and metamorphic layers with veins and clusters.
- **UF:** catalog `materials` holds 7 materials (wood, stone, bone, leather, copper, bronze, iron) with density, hardness, value, damage and armour factors, read by combat items. Stone and ore exist only as surface objects (`granite_boulder`, `ironstone`, `copper_outcrop`, `gold_outcrop`, `crystal`) that yield items when worked (`objects.apply_chop` proves the object-to-item path).
- **Governs:** V66 (tiers), V82 (every resource role, the manifest Codex is building: `docs/design/RESOURCE_MANIFEST.json`, claimed in STATUS).
- **Needs first:** the five levels (2.3), the resource manifest, the crafting proposals P1, P4, P8, P10 (`CRAFTING.md` §0.1, not approved).

### 2.3 Z-levels, digging down, caverns and magma: none
- **DF:** many z-levels; digging, channeling, stairs and ramps; three cavern layers with their own plants and creatures; magma and a sealed bottom.
- **UF:** one 256×256 surface layer (`world.one_layer` passes, which proves the absence). `UF_Levels.js` does not exist yet; the five-level engine is being built by another run (STATUS, claim of 13:20). The design is `docs/design/VERTICAL_WORLD.md`; the condensed cavern and deep domains are `RESOURCE_ATLAS.md` §3.3.
- **Governs:** V80, V82, V83.
- **Needs first:** the five-level engine slices 1–2 (state, migration, connectors). Every system that places, moves or saves anything takes `z` from one helper until then.

### 2.4 Fluids: none
- **DF:** water and magma held as depth 0–7 per cell; flow down first, then sideways; pressure; sources, aquifers, dams, floodgates, pumps, wells.
- **UF:** water is fixed tiles (`Outside_A1` autotiles). Nothing flows. `UF_Roads.js` places wells and bridges at generation; units can drink and fish at water.
- **Governs:** V22, V80 (VERTICAL_WORLD §6.1–6.2).
- **Needs first:** 2.3, and the world beat (§9 B2) for a scheduled flow queue.

### 2.5 Seasons and the calendar: partial (calendar only)
- **DF:** a year of four seasons; crops grow only in their seasons, trees fruit and drop leaves, caravans come in set seasons, water freezes in winter.
- **UF:** `UF_Core.js` (legacy clock, still the game's clock) keeps 12 months of 28 days and names four seasons; `daynight.clock_running` passes. **No system reads the season.** The month names in `UF_Core.js` lines 234–239 are on VISION's "Proposed but not approved" list; they are not shown (the `ShowClockHUD` parameter of `UF_Core` is `"false"` in `plugins.js`, and `daynight.no_time_display` passes). The catalog's `arrivals.seasons` multipliers exist but nothing reads them.
- **Governs:** **Q11 open** (how long a year is in real play).
- **Needs first:** Q11; the world beat (B2).

### 2.6 Weather: none
- **DF:** rain, snow, fog, evil weather in cursed regions; rain fills and snow covers exposed cells.
- **UF:** nothing (the only match for "weather" is in UF_Speech's generated talk).
- **Governs:** V80 (VERTICAL_WORLD §6.3: rain and snow fall only on exposed cells).
- **Needs first:** 2.5; roofs (5.4) so "exposed" means something.

### 2.7 Temperature: none (a climate field only)
- **DF:** every cell and item has a temperature; materials melt, freeze, boil and burn at their own points; creatures suffer heat and cold.
- **UF:** a temperature field chooses the biome at generation (`UF_WorldGen.fields`); fire is its own cell state (2.8). Nothing else.
- **Governs:** needs a user decision: whether cell temperature is wanted beyond biomes and fire (VERTICAL_WORLD §6.3 already limits it to cells near a source).
- **Needs first:** 2.3 (magma), 2.5 (seasons).

### 2.8 Fire: **done**
- **DF:** fire spreads by flammability, consumes fuel, turns things to ash; creatures flee and burn.
- **UF:** `UF_Fire.js`: burning cells spread to neighbours by the catalog's rules, trees become stumps, wooden walls rubble, grass burns out, stone stops it, units in fire are hurt and walk out, the colony douses fires near its camp.
- **Proof:** `fire` 10/10 (§11): `spreads_in_grass`, `stone_stops`, `tree_to_stump`, `wall_to_rubble`, `items_destroyed`, `units_hurt`, `douse`, `seeded_and_saved`, `perf`. Screenshot `fire.grass_fire_spreading.png` (opened): flames on a band of grass cells beside a grey stone block, the world paused, the tooltip reading "Grassland · Tame, Neutral · Ash".
- **Governs:** V21, V25. **Missing:** smoke, heat to neighbours, burning items as fuel.

### 2.9 Plant growth and regrowth: partial
- **DF:** plants grow from seed through stages; trees grow from saplings; shrubs regrow; underground plants have their own layer.
- **UF:** picked bushes and fruit trees regrow after catalog hours (`UF_Objects.js`, `objects.regrow`); felled trees and cleared plants return after 28, 7 and 3 game days (`UF_Ecology.js`, `ecology.renewable_timer`, `renewable_only`, `native_regrow_single`). No saplings or growth stages; trees never spread.
- **Governs:** V74, V83 (the ecology director that services every level and biome bucket fairly: `RESOURCE_ATLAS.md` §8.1).
- **Needs first:** registration of `UF_Ecology` (editor closed); the five levels for the full director.

### 2.10 Animal population recovery and monster spawns: partial
- **DF:** wildlife populations per region move in and out over time; monsters appear by region (savagery, evil) and some creatures come up from the caverns.
- **UF:** `UF_Ecology.js` every six game hours tries the area on screen plus one rotating area: prey recover toward the area's first population, monsters spawn only in biomes and regions the catalog allows, both capped, away from camps, sites, people and the view; spawns go through `UF.World.addUnit` (V68).
- **Proof:** `ecology.prey_replenishes`, `monster_replenishes`, `hard_cap`, `deterministic_safe_cell`, `bounded_work` (§11); V68 itself: `spawn` (§11).
- **Missing:** V83's fair service of every `(z, biome)` bucket and distribution telemetry; fish and fliers of the upper air; not registered in `plugins.js`.
- **Governs:** V74, V75, V83. This is the "spawns" part of the user's 13:40 instruction; the DF-mechanics run has claimed it (STATUS, 13:45).

## 3. Creatures and bodies

### 3.1 Wildlife behaviour: **done**
- **DF:** herds wander, graze, flee; creatures keep day or night hours (counting tag occurrences in the creature raws: 142 day-active, 54 night-active, 21 twilight-active); predators hunt; some beasts fight back.
- **UF:** `UF_Wildlife.js`: herds by biome and region, a start-kit herd near every campfire, wander, flee from hunters, and (the creature-AI run of 2026-09-19) sleep cycles, grazing, flight from nearby predators, herd alarm, predators that kill and feed, defensive retaliation.
- **Proof:** `wildlife` 22/22 twice (§11): on the 13:29 file in the main run, and on the live file of 13:46 in `gapmap_live2`, including `activity_cycles`, `herbivore_graze`, `environmental_flee`, `herd_alarm`, `predator_hunt`, `defensive_retaliation`. Between 13:34 and 13:46 the live file did not parse (§9 B1). The file is claimed by another session; this file does not touch it.
- **Governs:** V24, V48.

### 3.2 Vermin: partial
- **DF:** small creatures that eat unguarded food and are caught by cats and traps.
- **UF:** the `rat` species (kind `vermin`) wanders; it eats nothing (`wildlife.catalog_species` proves the kind exists).
- **Needs first:** food stores that can be reached (5.9).

### 3.3 Bodies, tissues and wounds: none
- **DF:** 234 body plans, each part made of tissue layers; hits cut or bruise layers, break bones, sever parts, cause bleeding, pain, infection and permanent loss.
- **UF:** OSRS hitpoints only (`UF_Combat.js`, `combat.max_hit`, `combat.death`). `UF_DFCombat.js` is legacy (it writes combat text and is called only by the old autotest block in `UF_Core.js`, line 149).
- **Governs:** **Q12 open** and V64's own note: "DF-style injuries by body part stay open: the user decides whether wounds sit on top of hitpoints".
- **Needs first:** the user's answer.

### 3.4 Death, corpses, remains and rot: partial
- **DF:** a body stays as an item, rots, gives off rot when left in the open, leaves bones and a skull, can be butchered or buried; bones and skulls become crafts.
- **UF:** a death plays the sheet's death frames and the remains stay on the ground for `anim.remainsHours` game hours, saved (`UF_Anim.js`; `anim.death_frames_and_remains`, `anim.remains_saved` passed, §11; the same suite's `pooled_and_perf` failed on timing, median 0.3250 ms against a 0.3 ms budget at 31 % machine load). A `bones_pile` object can be picked for 2 bone. There is no corpse item, no rot, no burial.
- **Governs:** V58 (remains stay a while), V28. The DF-mechanics run has claimed `UF_Remains.js`, `docs/design/REMAINS.md` and the catalog key `remains` (STATUS, 13:45).

### 3.5 Butchery: partial (instant yields)
- **DF:** a carcass is carried to a butcher, whose work splits it into meat, fat, bones, skull, hide and organs by the body plan; fat renders to tallow; bones and hides feed crafts.
- **UF:** a hunt's kill or a combat death drops the species' `yields` at once on the cell (deer 3 meat, 1 hide, 2 bone; 20 of 23 species give no bone). Proof: `jobs.hunt` (1 raw meat and 1 hide land on the prey's cell), `combat.death` (yields added on its cell).
- **Governs:** V28; `CRAFTING.md` D11 (drops always drop, the level gate is at the rack) is a design decision in a file the user has not approved.
- **Needs first:** 3.4 (a carcass item). Claimed with `UF_Remains.js`.

### 3.6 Hunting: **done** (as a work job)
- **DF:** hunters track and shoot wild animals, which flee.
- **UF:** `hunt` jobs (`UF_Jobs.js`) re-plan every 30 ticks as the prey moves; prey flee; colonists hunt when hungry or for the plan; hunting gains experience.
- **Proof:** `jobs.hunt`, `colonists.hunts`, `wildlife.flees_hunter`, `skills.xp_by_doing` (§11).
- **Missing:** the kill is work, not combat (`docs/systems/UF_Combat.md`, "Hunting isn't combat"); ranged hunting with ammunition.

### 3.7 Taming, husbandry, breeding and pets: none
- **DF:** tame animals are kept in pastures, bred, milked (16 tag occurrences in the creature raws), shorn, and their eggs gathered (84 occurrences); some are trained for war or hunting; pack animals and mounts; pets adopt owners.
- **UF:** nothing. "tame" in `UF_Wildlife.js` is the region tier. The catalog's `arrivals.kinds.traders.packSpecies` names pack animals, read by no code.
- **Governs:** V43 ("animal care" labor), V71 (animals are ownable).
- **Needs first:** pens (rooms or zones, 6.1), a food economy (wave 3).

### 3.8 Fishing: partial
- **DF:** fishing at water yields fish from the region's fish populations; fish must be cleaned before cooking.
- **UF:** the `fish` job (`UF_Interact.js` lines 173–190) catches a fish with a fixed seeded chance at any water cell; cooking fish exists (`cook_fish`); fishing gains experience only when a fish is caught.
- **Proof:** `look.dig_and_fish` (§11).
- **Missing:** fish populations that deplete and recover (V83), water kinds that matter.

### 3.9 Megabeasts and unique beasts: none
- **DF:** a few unique giant creatures (4 megabeasts and 4 semi-megabeasts in the raws) live in lairs and attack settlements; generated one-off beasts come from the deep.
- **UF:** monsters are ordinary species (`troll`, `bog_horror`, and others). `UF_History.js`'s switched-off generator has a yearly beast chance; nothing in play.
- **Governs:** needs a user decision: a unique beast is lore (a named creature, AGENTS rule 7). THEME T14/T15 hold creature proposals.

### 3.10 Undead, evil regions and curses: partial (cursed regions only)
- **DF:** evil regions raise the dead, carry harmful weather and turn creatures; necromancers raise corpses; cursed people become beasts under the moon or drink blood.
- **UF:** cursed regions exist with their own ground, plants and monsters (`restless_dead`, `ice_wraith` only where the region allows: `wildlife.monsters_only_wild`). Nothing rises, nothing turns.
- **Governs:** needs a user decision (THEME T20/T21, magic and faith; V65 theme).

## 4. People: inner life

### 4.1 Needs: partial
- **DF:** hunger, thirst, sleep, plus needs that come from personality and values (company, prayer, making things, seeing family, and many more); unmet needs cause distraction and stress.
- **UF:** colonists have hunger, thirst, sleep, social and nature (`UF_Colonists.js`); each drives a physical job. **Only the player's faction has needs** (founders of other factions have `ai: "wander"`, `UF_History.js` lines 1369 and 1451).
- **Proof:** `colonists.thirst_makes_drink_job`, `colonists.hunger_makes_food_job`, `ownership.exhausted_uses_owned_bed`, `ownership.survival_and_danger_win` (§11).
- **Governs:** V17, V23, V51.

### 4.2 Thoughts, moods and stress: partial
- **DF:** events leave memories that lift or lower mood; stress builds and eases; breakdowns at the extreme (tantrums, depression, madness).
- **UF:** thoughts with a strength move a mood score from −100 to 100 with seven mood words; the newest 8 are kept (`UF.Colonists.addThought`). Nothing accumulates stress, nothing breaks down, nothing reads room value or food quality.
- **Proof:** `colonists.birth_thought_awarded`, `intimacy_awards_thought`, `expecting_thought_awarded` (§11; the two reproduction checks print the newest thought rather than the one they matched, so this run's `intimacy_awards_thought` detail reads "Expecting a baby!" and `expecting_thought_awarded` reads "Made love with partner."; the conditions themselves test the right thought).
- **Governs:** V23, V56 (a floored room is a good thought).

### 4.3 Personality: partial
- **DF:** dozens of facets, plus values and beliefs, plus life dreams; they set needs, reactions and choices.
- **UF:** 10 seeded facets (0–100) with a culture bias; they change laziness, curiosity, bravery and discipline in decisions.
- **Proof:** `colonists.personality_differs`.
- **Missing:** values, beliefs, dreams, facet-driven needs. **Governs:** V23, V39.

### 4.4 Relationships: none (no lasting ties)
- **DF:** acquaintances, friends, lovers, spouses, rivals and grudges that build over time; families; divorce and affairs since 0.47.01 (2020-01-29).
- **UF:** no relationship record. At night each colonist picks any eligible adult of the other gender within 40 cells (`UF_Colonists.js` `nightlyMateJob`, lines 769–780); a birth records the parents (lineage). UF_Talk's "family" keyword reads what exists.
- **Governs:** V26, V78 (privacy for intimacy). **Needs first:** nothing; this is in reach now (wave 2).

### 4.5 Children, pregnancy, growing up and aging: partial
- **DF:** pregnancy, birth, infancy, childhood (children play and learn), adulthood, old age and death of age.
- **UF:** conception, a 3-day pregnancy, birth of a unit through `UF.World.addUnit`, baby, child and teen sprites. Age rises one year per 7 game days **only below 18** (`UF_Colonists.js` lines 911–914): adults never age, nobody becomes an elder by aging, nobody dies of age. Player's faction only.
- **Proof:** `colonists.pregnancy_conceived`, `pregnancy_progresses`, `childbirth_spawns_baby`, `child_sprite_updates`, `teen_sprite_updates` (§11).
- **Governs:** V26, V40, **Q11 open** (how long a year, a pregnancy and a childhood are).

### 4.6 Daily routine and sleep: partial
- **DF:** people sleep when tired, in their own bed if they have one; eat at meal times; idle, socialise and attend to needs in free time.
- **UF:** sleep hours and meal hours shifted by discipline; talk in the evening; `UF_Ownership.js` makes an exhausted colonist walk to their own bed, with hunger and danger first.
- **Proof:** `ownership.bed_assignment`, `exhausted_uses_owned_bed`, `survival_and_danger_win` (§11). `UF_Ownership` is not registered.
- **Governs:** V23, V48, V72.

### 4.7 Skills that grow by doing: **done** (OSRS model)
- **DF:** skills rise with use, raise speed and quality; teaching and demonstrations since 0.47.01.
- **UF:** `UF_Skills.js`: 22 skills from 1 to 99 on the OSRS-style curve, experience from jobs and hits, work speed, extra yield, quality rolls, level requirements, a chronicle line when a skilled person dies.
- **Proof:** `skills` 14/14 (`curve`, `xp_by_doing`, `rate`, `extra_yield`, `death_chronicle`, `saved`).
- **Missing (V84, claimed by the DF-mechanics run):** unlocks of recipes, resources and abilities by level; the faction Building level; nothing trains farming or healing; `qualityRoll` and `meets` are called by nothing yet (`docs/systems/UF_Skills.md`, Known limits).

### 4.8 Work time and difficulty per action (V85, the user's request of 13:40): partial
- **DF:** every job has its own duration; the worker's skill shortens it; tools and materials matter (harder stone digs slower).
- **What V85 asks:** each action has a base duration in world beats and a difficulty per action and per material or recipe: a required level, a success chance per attempt that rises with level, and a failure cost; one unit, the world beat.
- **UF today:** a job's progress rises once per map update (60 per second at ×1) by `workRate × tool × skill rate` (`UF_Jobs.js` line 783, `progress +=` at line 875), and finishes at the action's `work`. The `work` numbers are in two different units:

  | Action (catalog, 2026-09-19) | `work` | at ×1 today |
  |---|---|---|
  | chop an oak | 240 | 4.0 s |
  | mine ironstone | 300 | 5.0 s |
  | quarry a granite boulder | 200 | 3.3 s |
  | gather tall grass | 20 | 0.3 s |
  | roast meat at a fire | 90 | 1.5 s |
  | build a campfire | 120 | 2.0 s |
  | smelt an iron bar | 10 | 0.17 s |
  | forge a long sword | 12 | 0.2 s |
  | build a furnace | 8 | 0.13 s |
  | build a door | 4 | 0.07 s |

  The combat-chain entries (every recipe at a furnace, smithy, bench or rack, and those workshops' builds) were written in beats (`COMBAT_CHAINS.md` D9) and are read as map updates, so a sword is forged 20 times faster than an oak is felled. Actions do differ in time, but no action can fail, no recipe has a level requirement (`skills.quality_and_meets` proves `meets` works; nothing calls it), and there is no world beat (§9 B2).
- **Proof:** `skills.rate` (measured progress ratio 1.98 at level 99 in UF_Jobs), `jobs.tool_speeds_work` (the stone axe doubles chopping), §11.
- **Governs:** V85, V46, V48, V63, V66, V84.
- **Needs first:** a world-beat clock (B2), then one conversion of every `work` value to beats with difficulty data. Claimed by the DF-mechanics run (`UF_Jobs.js` work timing, `docs/design/WORK_TIMING.md`, after the progression build).

### 4.9 Ownership: partial (unregistered)
- **DF:** rooms, beds, furniture and items are assigned to people; others' items are theirs; theft is a crime.
- **UF:** `UF_Ownership.js` (Codex): owners on world things, bed claims, owner text in the look tooltip, destroyed beds clear.
- **Proof:** `ownership` (§11). **Not registered** in `plugins.js` (STATUS, Known problems).
- **Governs:** V71 (theft, gifts, trade and inheritance need their own approved rules), V72.

## 5. Work and production

### 5.1 Jobs, designations and labors: partial
- **DF:** designations become jobs; each person has labors switched on or off; a job goes to an idle person with the labor.
- **UF:** every act is a `UF_Jobs.js` job with a target cell; right-click any cell for designations (`UF_Interact.js`); colonists choose needs, then designations, then the society plan. The catalog has 9 labors for the combat chains, read only for starting-skill weights.
- **Proof:** `jobs` 17/17, `look.menu_creates_designation`, `look.designation_done_by_colonist`, `colonists.plan_starts_immediately` (§11). **FAIL this run:** `colonists.every_job_is_physical`: "185 colonist jobs finished in the run … 1 changed NOTHING; … first with no change: dig #178", and `look.saved`: "dig #14 after a JsonEx round-trip: missing" (a designation lost in the save; it failed the same way before, `docs/systems/UF_World.md` §6).
- **Missing:** per-person labor switches (V43), the faction menu of V49.
- **Governs:** V5, V17, V34, V35, V43, V49.

### 5.2 Work orders and the manager: none
- **DF:** standing orders with amounts and conditions (0.43.01, 2016-05-09), repeat orders, limits per workshop.
- **UF:** nothing; the society plan (catalog `colony.plan`) is the only production order, and only for the player's faction.
- **Needs first:** 5.3 with real chains.

### 5.3 Workshops and production chains: partial
- **DF:** workshops turn inputs into outputs (159 reactions at the raw workshops plus the built-in ones); chains from ore to bar to weapon, hide to leather to armour, plant to thread to cloth, wood to charcoal.
- **UF:** 34 recipes and 9 workshop objects; a craft fetches inputs and stands at the workplace. The combat-chain phase 2 (quality and material on item records, the `arm` step) is not built (`COMBAT_CHAINS.md` §9).
- **Proof:** `jobs.fetch_and_craft`, `jobs.craft_needs_workplace`, `jobs.craft_at_workplace` (§11).
- **Governs:** V55, V66; the OSRS tiers wait on `CRAFTING.md` P1–P21 (**not approved**), V76 (culture arsenals).

### 5.4 Construction: partial
- **DF:** walls, floors, stairs, ramps, roofs, bridges, doors, hatches, fortifications, supports; built from delivered materials; deconstruction returns them; unsupported building collapses.
- **UF:** one object per cell built from items on the cell (`UF_Jobs` `build`), walls drawn two squares tall (`UF_Walls.js`), doors (`UF_Doors.js`), floors (`UF_Floors.js`), dismantling (`UF_Interact`).
- **Proof:** `jobs.build`, `look.dismantle`, `walls` 7/7, `doors` 12/12, `floors` 11/11 (§11).
- **Missing:** roofs, stairs, ramps, bridges built in play, supports and collapse (VERTICAL_WORLD §5); a build refused because a unit stands on the site still uses up the items (`docs/systems/UF_World.md` §6, `UF_Jobs.js` line 351, found by reading).
- **Governs:** V21, V56, V57, V73, V80.

### 5.5 Mining and digging: partial (surface outcrops)
- **DF:** digging through soil and stone, veins and clusters, channels and stairs.
- **UF:** `mine` on surface outcrops, `quarry` on boulders; `dig` turns a cell's ground to dirt with a small chance of a stone (`UF_Interact.js` lines 152–170). This run's `colonists.every_job_is_physical` failure is a `dig` job that changed nothing.
- **Proof:** `look.dig_and_fish`, `skills.xp_by_doing` (§11).
- **Governs:** V80. **Needs first:** 2.3.

### 5.6 Felling trees and gathering plants: **done**
- **DF:** trees cut to logs; shrubs and wild plants gathered.
- **UF:** chop, gather and pick actions yield items on the cell and change the object (oak to stump plus 3 logs), with regrowth for bushes and fruit trees.
- **Proof:** `objects.apply_chop`, `objects.regrow`, `jobs.travel_and_work`, `colonists.plan_starts_immediately` (§11).

### 5.7 Farming: none
- **DF:** tilled plots, crops by season and ground, planting, harvesting, seeds, fertilising, underground crops.
- **UF:** `UF_Roads.js` places farm-plot objects beside living sites at generation (`roads.farms_and_wells`); the object has no actions. No sow, tend or harvest job exists, so the farming skill cannot train (`docs/systems/UF_Skills.md`).
- **Governs:** V43. **Needs first:** 2.5 (seasons) for crop timing; `CRAFTING.md` §1.7 has a design, not approved.

### 5.8 Cooking, brewing, food quality and spoilage: partial (cooking only)
- **DF:** kitchens combine ingredients into meals of rising value; stills brew drinks from plants; food rots unless stored in barrels; better food makes better thoughts (53.11, 2026-03-04, strengthened it).
- **UF:** raw meat and fish are cooked at a fire; colonists eat raw food when no fire is near.
- **Proof:** `jobs.craft_at_workplace` (1 cooked meat, no raw left), `colonists.hunts` (a `cook_meat` craft follows the hunt) (§11).
- **Missing:** drink other than water, brewing, meals from several ingredients, spoilage, food quality. **Governs:** V35, V66 (cooking can burn food).

### 5.9 Stockpiles and hauling: partial
- **DF:** stockpiles by category, bins and barrels, haulers, wheelbarrows and carts.
- **UF:** a stockpile object with `stores` tags; the plan's larder step hauls food; `haul` jobs move a stack; designations to haul.
- **Proof:** `jobs.haul` (§11). **FAIL this run:** `look.hunt_and_haul_options`: `"MISSING" -> no job item null to (null,null)` (the haul designation made no job; the same check failed without other changes before, `docs/systems/UF_World.md` §6).
- **Missing:** categories, containers, carry limits (`docs/systems/UF_Items.md`), hauling of everything to where it belongs.

### 5.10 Development and technology: none
- **DF:** there is no builder tech tree. Each civilization's entity file lists which jobs, buildings and reactions it may use (202 job and 313 reaction permission tags in the entity file), and a civilization's development rises by progress triggers (population, production, trade, wealth); noble positions appear as a fortress grows.
- **UF:** cultures differ in wall, door, floor, plan, priorities, chain weights and preferred arms (catalog `cultures`); nothing is locked or unlocked.
- **Governs:** V76 (per-culture trees from existing data, no invented lore), V77 (build N of X unlocks Y, visible in the UI, leaders plan only unlocked work), V84 (faction Building level). Claimed by the DF-mechanics run (`UF_Tech.js`, `docs/design/TECH_TREE.md`, catalog key `tech`).

## 6. Places, rooms and fixtures

### 6.1 Rooms and room value: partial
- **DF:** rooms are defined from furniture; value comes from furniture, floors, engravings and contents; a room's value sets the owner's thoughts and nobles' demands.
- **UF:** `UF_Floors.js` finds small enclosed rooms, lays cultural floors and exposes a value (`UF.Rooms.value`, line 147); nothing reads the value.
- **Proof:** `floors` 11/11 (§11): `room_detection`, `job_lays_floor`, `colonist_takes_one`. Its `perf` check passed in this run (room scan 0.880 ms against 2 ms) after failing at 2.520 ms in its build runs (STATUS K19); it varies from run to run.
- **Governs:** V56, V72, V78 (privacy needs an occupancy query).

### 6.2 Doors: **done** (no locks)
- **DF:** doors keep animals and enemies out, can be locked, and broken by attackers.
- **UF:** `UF_Doors.js`: a door in every settlement gap, opens for its faction and allies, shuts out animals and strangers, can be built and broken.
- **Proof:** `doors` 12/12 (§11): `faction_passes`, `ally_passes`, `animal_blocked`, `stranger_blocked`, `damage_breaks`, `player_can_build`. Screenshot `doors.closed_animal_outside.png` (opened): a square of two-square wooden walls with a closed door in its north side, a pink animal on a yellow stance square just north of the door, and the colonists on green squares beside a campfire to the north-west. **Missing:** locks and keys (V57 "later").

### 6.3 Roads, bridges, wells and sites: partial
- **DF:** sites with roads, bridges, wells and fields in world generation.
- **UF:** `UF_Roads.js` joins living sites with roads and plank bridges and gives each a well and farm plots. **It is not in `game/js/plugins.js`** (the live list has no `UF_Roads`; the main run answered `HARNESS no suite named "roads"`), so nothing draws roads in the game today. With V31 there are no sites at New Game but the bare camps.
- **Proof:** `roads` 11/11 on a second snapshot with `UF_Roads` added (§11). **Governs:** V31, V51.

### 6.4 Traps: none
- **DF:** cage, stone-fall and weapon traps on paths; creatures that see traps avoid them; invaders learn where deaths happened (53.01, 2025-11-03).
- **UF:** nothing. **Governs:** needs a user decision (traps are not named in VISION; VERTICAL_WORLD §7.4 lists them among defences).

### 6.5 Mechanisms, machines, power, pumps and carts: none
- **DF:** levers and pressure plates link to doors, bridges and floodgates; water and wind power; gears and axles; pumps; minecarts and wheelbarrows (0.34.08, 2012-05-14).
- **UF:** nothing. **Governs:** V22, V80 (VERTICAL_WORLD §2 "Power and machines", "Hauling", slice 5). **Needs first:** 2.3, 2.4.

### 6.6 Wealth and what it attracts: none
- **DF:** every item and building has a value; the fortress's created wealth draws migrants, nobles, thieves, sieges and beasts.
- **UF:** no item has a value (0 of 50 item types); materials have a `value` factor that nothing reads.
- **Governs:** needs a user decision (whether wealth drives arrivals and threats, and what counts).

### 6.7 Taverns, drink and performances: none
- **DF:** taverns serve drink; performances of poetry, music and dance; drunkenness (0.42.01, 2015-12-01).
- **UF:** nothing. **Governs:** needs a user decision.

### 6.8 Libraries, scholars and writing: none
- **DF:** scholars advance knowledge, write it down, scribes copy, visitors bring knowledge (0.42.01).
- **UF:** nothing. **Governs:** needs a user decision.

### 6.9 Health care and hospitals: none (regeneration only)
- **DF:** doctors diagnose, clean, suture, set bones, operate; patients rest in hospital beds.
- **UF:** 1 hitpoint per game hour for every living unit (`combat.regen`, §11). The healing skill exists but no job trains it.
- **Governs:** V43 (healing labor), Q12 (only needed if wounds exist).

### 6.10 Burial, memorials and ghosts: none
- **DF:** the dead are buried in coffins or remembered on slabs; unburied dead can return as ghosts that haunt.
- **UF:** nothing (UF_Anim's "ghost" is its name for a playing death animation). **Governs:** needs a user decision (ghosts are a supernatural rule; THEME T20/T21).

## 7. Society and the world outside

### 7.1 Civilizations and factions: **done**
- **DF:** several civilizations with species, values, relations and home sites.
- **UF:** `UF_Factions.js` rolls 4–7 factions from the seed with species, stances, relations from war to alliance and an area each; `UF_History.js` gives each eight founders around a lit campfire (V4, V31).
- **Proof:** `factions` 15/15 (`same_seed_same_factions`, `relations_complete`, `areas`), `history` 16/16 (`campfire_start`, `founders`, `nothing_built`, `no_years`) (§11).

### 7.2 Every faction lives and builds: none (others wander)
- **DF:** every site has its own people working and living (off screen, simplified).
- **UF:** only the player's faction runs needs, jobs and the society plan; other founders wander around their camp (`ai: "wander"`). `UF_Society.js` is claimed by the paths-and-DF-life run and does not exist yet.
- **Proof of the gap:** `colonists.people_became_colonists` (only the player's people are converted).
- **Governs:** V51, V23, V42.

### 7.3 Positions, nobles, ranks and orders: partial (a leader, no orders)
- **DF:** positions (30 position tags in the entity file: leaders, managers, law keepers, priests…) appointed by election or rank, with duties, demands and mandates.
- **UF:** every faction's founders have one leader (`data.rank` 1, with a title) and seven others (`data.rank` 0) whose `data.superior` is the leader (`UF_History.js` lines 1370–1384). V52's tree of threes (five at rank 1, two at rank 2, one at rank 3 for eight founders) is not built, and nobody gives an order.
- **Proof:** `history.stats_and_ranks` (§11).
- **Governs:** V52 (tree of threes; rank names per faction are proposals: `docs/design/rank_names.proposal.json`). The build spec is `docs/design/CHAIN_OF_COMMAND.md` (`UF_Command.js`), which waits for 7.2.

### 7.4 Diplomacy and relations: partial (fixed relations)
- **DF:** diplomats, peace and war, tribute, alliance.
- **UF:** relations are rolled at generation; the F ledger lists met factions; `UF.Factions.adjust` exists and no code in play calls it.
- **Proof:** `factions.relation_symmetric`, `relations_complete`, `contact_reveals_faction` (§11).

### 7.5 Reputation and rumours: none
- **DF:** deeds spread as rumours and give reputation (0.40.01, 2014-07-07).
- **UF:** nothing.

### 7.6 Trade and caravans: none (catalog data only)
- **DF:** caravans come by season to a depot, trade goods by value, and bring what the fortress lacks.
- **UF:** catalog `arrivals` (kinds `migrants`, `traders`, `raiders`, with sizes, chances per season and relation) is written for a `UF_Arrivals` plugin that does not exist. The `spawn.after_play` check says so in its detail: "arrivals: no plugin in plugins.js adds arrivals yet" (`UF_World.js` line 2461; seen in this run, §11).
- **Governs:** V19, V71 (trade rules need approval). **Needs first:** item values (6.6).

### 7.7 Migrants, visitors and residents: none (catalog data only)
- **DF:** migrant waves, visitors who ask to stay, citizenship (0.42.01).
- **UF:** births only. The `arrivals.kinds.migrants` data is unread.
- **Governs:** V19, **Q2 open** (births, migrants, or both).

### 7.8 Military and squads: partial (attack modes)
- **DF:** squads with leaders, uniforms, schedules, training, patrols, alerts and burrows.
- **UF:** every unit fights in an attack mode (nearest, weakest, strongest, protect, defend, flee, manual) and a combat style. No squads, uniforms, training, patrols or guard duty; the weapon rack and the plan's `arm` step are inert.
- **Proof:** `combat.retaliate`, `combat.styles`, `combat.equipment` (§11).
- **Governs:** V43 (guards on walls, squads), V64.

### 7.9 Sieges, raids and ambushes: none
- **DF:** invaders arrive in waves, dig, build and break through (53.01), use siege engines, take captives.
- **UF:** the K key spawns a hostile for testing (`UF.Combat.testRaid`); `arrivals.kinds.raiders` is unread data.
- **Needs first:** 7.6/7.7's arrival plugin, 7.8, and the five levels for climbing and digging.

### 7.10 Justice and crime: none
- **DF:** crimes (theft, violence, broken mandates), witnesses, a sheriff, punishment; interrogation and plots since 0.47.01.
- **UF:** nothing. **Governs:** V71 says theft, gifts, trade and inheritance need their own approved rules.

### 7.11 Religion and temples: none
- **DF:** gods per civilization, prayer as a need, temples and priests who comfort the stressed (0.47.01).
- **UF:** nothing. **Governs:** needs a user decision (THEME T20/T21, and V65 allows chapels and holy relics as theme).

### 7.12 Artifacts and creative trances: none (legacy only)
- **DF:** a craftsperson is sometimes seized by a creative trance, claims a workshop, gathers materials and makes a unique named artifact, or goes mad if they can't; artifacts are coveted and stolen (0.44.01).
- **UF:** nothing current. Legacy: `UF_Crafting.js` lines 313–323 hold a function that picks one of three fixed item texts with `Math.random` and builds a line using the banned term (§9 B7); only the old autotest block in `UF_Core.js` (line 159) calls it, and the function it tries to show the line with (`UF_Visuals.spawnBarkAtPlayer`) is defined nowhere, so the line is never shown.
- **Governs:** needs a user decision (player text must name the mechanic neutrally; artifact names are lore).

### 7.13 History, chronicle and legends: partial
- **DF:** a generated history of figures, wars and sites; legends to browse.
- **UF:** by V31 no history is generated; the chronicle (H) records play: founding lines, deaths, skill milestones.
- **Proof:** `history.add_event`, `history.chronicle_opens`, `skills.death_chronicle` (§11).
- **Missing:** a figure-by-figure legends view.

### 7.14 Guilds and petitions: none
- **DF:** guilds and religions petition for halls and temples (0.47.01).
- **UF:** nothing. **Governs:** needs a user decision.

### 7.15 The world keeps living off screen: partial
- **DF:** "world activation" (0.40.01): births, deaths, site founding, invasions keep running in the whole world.
- **UF:** one area, so every unit is in the area on screen and every unit's AI runs (`wildlife.perf`: "10 AI ticks … with 130 units in the world"). What DF runs off screen (other sites living, founding, invading) doesn't exist (7.2, 7.9). Off-screen levels will need scheduled simulation (V80, VERTICAL_WORLD §7.2).
- **Governs:** V14, V50, V51, V80.

## 8. Interface-level DF features: **done**
Look under the cursor, right-click designations, a unit and object sheet with an inventory grid, pause and speed, stance squares, fog of war (switched off for development).
**Proof (§11):** `look` 17/21 (the 4 failures, listed in §11, are about the tooltip's asset-status line, a haul designation and a dig designation lost in a save round-trip; the designation ones count against 5.1 and 5.9), `sheet` 13/13, `timespeed` 20/20, `overseer` 6/6, `stance` 19/19, `fog` 1/1, `daynight` 9/9, `talk` 13/13, `speech` 14/14.

## 9. Blockers across rows
- **B1. The live game did not boot from 13:34 to 13:46 (resolved by its owner).** `game/js/plugins/UF_Wildlife.js` as modified at 13:34:57 (1688 lines) failed `node --check`: `SyntaxError: Unexpected token ')'` at line 1688. A snapshot made from `game/` at 13:38 (`%TEMP%\uf_snapshots\gapmap_all`) reached no scene in `smoke` or `world` (`HARNESS timed out after 30000 ms waiting for the map scene to start`, `current scene: none`). The file is claimed by the creature-AI session and this file's author didn't touch it. The main run (§11) therefore used that session's previous version (13:29, 1655 lines, parses; in a snapshot taken at 13:29 it was the only plugin that differed from the 13:43 `game/`). The owner's next save (13:46:17) parses, and a fresh snapshot of `game/` with it (`%TEMP%\uf_snapshots\gapmap_live2`) passed `smoke` 13/13 and `wildlife` 22/22. Lesson for every agent: an edit that leaves a plugin unparsable stops the user's Playtest at once, so run `node --check` before each save lands in `game/`.
- **B2. There is no world beat.** No plugin defines `UF.Beat` (UF_Anim, UF_Doors and UF_Fire read it if it exists). Units decide on frame timers (STATUS K16). V46, V48 and V85 all need it, and so do fluids, seasons and scheduled off-screen work.
- **B3. The five-level engine has not landed** (`UF_Levels.js` does not exist). Rows 2.2–2.4, 2.7, 5.4, 5.5, 6.4, 6.5, 7.9 and 7.15 wait for it.
- **B4. Three finished plugins are not registered:** `UF_Ecology`, `UF_Ownership` (the editor was open; STATUS, Known problems) and `UF_Roads` (its own page says "Not yet registered"; checked in the live `plugins.js` on 2026-09-19).
- **B5. Only the player's faction lives** (7.2), which caps rows 4.1–4.6 and 7.3 at "partial".
- **B6. Open user questions that rows wait on:** Q2 (population growth), Q3 (failure), Q11 (timescale), Q12 (wounds), `CRAFTING.md` P1–P21, THEME T20/T21 (magic and faith), V71's rules for theft, gifts, trade and inheritance, the rank names (V52).
- **B7. Legacy plugins are registered and claim DF systems they don't provide.** `UF_DFCombat` (combat text only), `UF_Crafting` (a workshop window and the trance line above), `UF_DFWorld` (profiles of unapproved races, VISION "Proposed but not approved"), `UF_NPCSchedules`, `UF_Construction`, `UF_Gumps`, `UF_Dialogue`, and `UF_Core`'s map-start block, which runs whenever Node's `require` exists and still prints "ALL UF GAMEPLAY SYSTEMS VERIFIED 100% OPERATIONAL!" to `game_runtime.log` (STATUS K2). None of them counts as done here; `UF_Crafting.js` and `UF_Core.js` also use `Math.random`.

## 10. Priority order for the next waves
The order follows three rules: what blocks other rows first, what the user asked for most recently (V84 at 13:35, V85 and the DF-mechanics instruction at 13:40), and nothing that waits on an open user question until the question is answered. Each wave is a proposal for the user; none starts without approval (AGENTS rule 6).

| Wave | Rows | Why now | Needs first |
|---|---|---|---|
| **0. Unblock** | B4 (register `UF_Ecology`, `UF_Ownership`, `UF_Roads` with the editor closed), B2 (one world-beat clock); B1 is already resolved | Finished work isn't in the game; V85 and V48 need a beat | the editor closed |
| **1. Progression and the DF-mechanics claim (in flight since 13:45)** | 4.7 unlocks and the faction Building level (V84); **4.8 work time and difficulty in beats (V85)**; 5.10 culture permissions and the builder tree (V76, V77); 3.4–3.5 remains, carcasses and butchery, bones; 2.9–2.10 the ecology director (V83); 5.3 the recipes they unlock | The user's three newest requests; everything later levels and times itself through these | wave 0; V85's conversion comes after the progression build (STATUS claim) |
| **2. People who live** | 7.2 every faction runs the society (V51); 7.3 the chain of command (V52, designed); 4.4 lasting relationships; 4.2 stress and moods that read 6.1 room value; 4.5 aging, elders, death of age; 4.6; 5.1 labors per person | "I want these characters living lives and building" (user, 2026-09-19, STATUS claim); V51 is the largest gap by count of rows it caps | wave 1's timing; Q11 for aging speed |
| **3. Food and the year** | 2.5 seasons, 2.6 weather, 5.7 farming, 5.8 brewing, meals, spoilage, 3.7 husbandry, 3.8 fish populations, 3.2 vermin, 5.9 stockpile categories | DF's economy runs on food; farming and animal care are V43 labors that nothing trains | Q11; wave 2's society planner |
| **4. The world outside** | 7.6 traders, 7.7 migrants, 6.6 values and wealth, 7.4 relations that change, 7.5 reputation, 7.13 legends, 5.2 work orders | V19; the catalog's `arrivals` data is already written for it | Q2; V71's trade rules |
| **5. Fighting and healing** | 7.8 squads, uniforms, guards on walls; 7.9 raids and sieges; 6.9 healing; 3.3 wounds | V43's military; threats from wave 4's raiders | Q12 for wounds; wave 4 |
| **6. Up and down** | 2.3 digging and caverns, 2.2 geology, 2.4 fluids, 2.7 temperature and magma, 5.4 stairs, ramps, roofs and supports, 5.5, 6.4 traps, 6.5 machines, 7.15 off-screen levels | V80, V82 | the five-level engine (B3) |
| **7. Institutions and the uncanny** | 6.7 taverns, 6.8 libraries, 6.10 burial and ghosts, 7.10 justice, 7.11 religion, 7.12 artifacts and creative trances, 7.14 guilds, 3.9 unique beasts, 3.10 undead and curses | Deep DF texture; each one needs lore or rules the user hasn't approved | the user's decisions in §12 |

## 11. The evidence run (2026-09-19, this session)
**Snapshot:** `%TEMP%\uf_snapshots\gapmap_run`, made from `game/` at 13:43 local time (the suites ran 13:43–13:51) with `tools/test_snapshot.js --plugins UF_Ecology,UF_Ownership --no-run`, then `UF_Wildlife.js` replaced by the 13:29 version (B1). Plugins, in order: the live `plugins.js` list, then `UF_Ecology`, `UF_Ownership`, `UF_Test`. Each suite ran through `tools/run_tests.js <suite> --game <snapshot>` (a scratch driver, `gapmap_run.js`, in Claude Code's scratchpad). Seeds are random per launch.

| Suite | Result | FAIL lines and notes (copied from the results files, trimmed) |
|---|---|---|
| smoke | 13/13 | |
| world | 26/26 | |
| worldgen | 22/22 | |
| biomes | 12/12 | |
| tiles | 11/11 | |
| objects | 17/17 | |
| items | 15/15 | |
| jobs | 17/17 | `hunt`, `open_job_taken` and `saved`, which earlier runs failed (`docs/systems/UF_World.md` §6), passed |
| colonists | 20/21 | `FAIL colonists.every_job_is_physical - 185 colonist jobs finished in the run: … 1 changed NOTHING; without a target cell: 0; first with no change: dig #178` |
| overseer | 6/6 | |
| wildlife | 22/22 | on the 13:29 `UF_Wildlife.js` (B1); also 22/22 on the live file of 13:46 in `gapmap_live2`, with `smoke` 13/13 there |
| factions | 15/15 | |
| history | 16/16 | |
| stance | 19/19 | |
| fog | 1/1 | fog is off (V37): only `disabled_whole_map_visible` runs |
| daynight | 9/9 | |
| timespeed | 20/20 | |
| look | 17/21 | `FAIL look.cell_lines` and `FAIL look.asset_line_names_status` (the tooltip's asset-status line); `FAIL look.hunt_and_haul_options - … "MISSING" -> no job item null to (null,null)`; `FAIL look.saved - dig #14 after a JsonEx round-trip: missing` |
| combat | 16/16 | |
| skills | 14/14 | |
| fire | 10/10 | |
| doors | 12/12 | |
| floors | 11/11 | `perf` room scan 0.880 ms (budget 2) |
| walls | 7/7 | |
| roads | not run in the main snapshot | `HARNESS no suite named "roads"` (not registered). Second snapshot `%TEMP%\uf_snapshots\gapmap_roads` (the same `game/` with `UF_Roads` added and the 13:29 `UF_Wildlife.js`): 11/11 |
| sheet | 13/13 | |
| speech | 14/14 | |
| talk | 13/13 | |
| anim | 8/9 | `FAIL anim.pooled_and_perf - … UF_Anim per frame over 120 frames median 0.3250 ms … budget 0.3 ms for the median and the best batch; machine CPU load during the window 31 %` |
| ecology | 10/10 | `UF_Ecology` added to the snapshot (not registered, B4) |
| ownership | 9/9 | `UF_Ownership` added to the snapshot (not registered, B4) |
| spawn | 6/6 | not a default suite; its `after_play` detail ends "arrivals: no plugin in plugins.js adds arrivals yet" |

Totals: 32 suites run (31 on the main snapshot, `roads` on the second), 29 without a failure; 6 checks failed (colonists 1, look 4, anim 1). Screenshots opened for this file: `fire\fire.grass_fire_spreading.png` and `doors\doors.closed_animal_outside.png` (described in 2.8 and 6.2), and `anim\anim.remains.png`, which is not cited as proof: its test remains can't be told apart by eye, and it shows the work labels "Fetching", "Hunting", "Gathering" floating over colonists, the V62 problem STATUS already lists.

**The run could fail and did:** the first attempt (snapshot `gapmap_all`, the live `UF_Wildlife.js`) reached no map (`smoke: RESULT: 0 passed, 0 failed (exit 2)`), which is how B1 was found.

## 12. Decisions for the user
1. **Wounds (Q12):** keep OSRS hitpoints only, or add DF-style body-part injuries on top (rows 3.3, 6.9).
2. **Timescale (Q11):** how long a year, a season, a pregnancy and a childhood last in real play (rows 2.5, 4.5, 5.7).
3. **Population (Q2):** births only, or migrants too (row 7.7).
4. **Wealth:** should the colony's made value draw arrivals and threats, as in DF (row 6.6)?
5. **Supernatural rules:** unique beasts, undead, curses, ghosts, creative trances, religion (rows 3.9, 3.10, 6.10, 7.11, 7.12). Each needs lore approval (THEME T14, T15, T20, T21).
6. **Institutions:** taverns, libraries, guilds, justice (rows 6.7, 6.8, 7.10, 7.14): in or out.
7. **Traps and machines** (rows 6.4, 6.5): in or out; if in, they come after the five levels.
8. **The wave order in §10.**
