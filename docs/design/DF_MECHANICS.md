# DF MECHANICS: what we take from Dwarf Fortress, and how our world state does it

**Written by:** Claude Code, 2026-09-18, at the user's request ("consult DF for all core gameplay mechanics… change our world state to mimic DF mechanics… document what needs assets, with instructions for Gemini").
**Source:** the Dwarf Fortress install in this folder (`data/vanilla`, read by an inventory script; results summarized in §1) plus DF's known design.
**Rule we keep (VISION V9):** we take DF's **mechanics and systems**, which are ideas. We don't copy its text, creature names, or data files into the game. Categories like "temperate broadleaf forest" or "sedimentary stone" are ordinary words and fine to use.

## 1. What DF contains (inventory of `data/vanilla`, 2026-09-18)
| Area | DF has | For us |
|---|---|---|
| Biomes | 77 biome tokens: 18 land types (mountain, glacier, tundra, taiga, 5 forest types, grassland/savanna/shrubland × temperate/tropical, 3 deserts), 9 wetlands (marsh/swamp × temperate/tropical × fresh/salt, mangrove), water bodies (ocean × arctic/temperate/tropical; lake, river, pool × temperate/tropical × fresh/brackish/salt), 3 underground (cavern water, chasm, lava) | §3 Biomes: all of them become starting states for world blocks |
| Region character | Each region also has **savagery** (how wild) and **good/evil**; these decide which creatures and plants appear | §3 Region modifiers (our names: tame / wild / primeval × blessed / neutral / cursed) |
| Creatures | 967 creatures: 354 large roaming wildlife, 107 aquatic, 71 fliers, 63 underground, 107+ vermin, 24 common domestic, 62 pets, 35 trainable, 16 draft animals, 35 pack animals, 4 megabeasts, 4 semi-megabeasts, 24 evil-region and 8 good-region creatures, 8 undead or not-living | §6 Creatures |
| Plants | 225 plants: 72 trees, 41 grasses, 112 crops or shrubs, 17 underground; uses: 76 brewable, 33 millable, 8 thread, 157 grow from seed | §5 Plants |
| Geology | 265 materials: 89 stones (sedimentary, igneous extrusive and intrusive, metamorphic layers), 127 gems, 16 ores, 26 metals, 21 soils, 19 aquifer-bearing layers | §4 Geology |
| Crafting | 159 reactions at 14 raw workshops (smelter, kiln, carpenter, dyer, still, quern, millstone, screw press, craftsman, tanner, soap maker, ashery, kitchen, farmer), plus DF's built-in ones (mason, forge, jeweler, loom, clothier, mechanic, and more) | §10 Crafting |
| Items | 25 weapons, 12 armors, 8 helms, 9 pants, 6 shoes, 3 gloves, 2 shields, 3 ammo, 1 siege ammo, 5 trap parts, 5 toys, 30 tools, food types | §9 Items |
| Civilizations | 6 kinds: mountain, forest, plains, evil, skulking, and underground peoples. Behaviors: siege, ambush, scouts, mercenaries, beast hunters, item thieves, baby snatchers, layer-linked (underground) | §12 Factions (already generated per game; behaviors to add) |
| Bodies | 234 body plans and 38 tissue templates (layered tissues per body part) | §8 Health and combat |

## 2. The world state: how we change it to work like DF
DF simulates **every cell** (what it's made of, what's on it, what liquid is in it) and **every thing** (items, units, buildings, jobs) as data. The screen is just a view of that data. Today our areas are RMMZ maps with tiles and events generated once; they need to become views of a simulation state. The plan:

### 2.1 Cell state (per area and layer; 256×256 cells)
Stored as typed arrays generated from the seed. Only areas that change are saved, compactly, like the fog.
| Field | Values | DF equivalent |
|---|---|---|
| `shape` | open air, floor, wall (solid), ramp, stair up / down / up-down, channel (floor removed) | tile shape |
| `material` | index into the materials table (§4): soil types, stone types, ice, sand, constructed wood/stone | tile material |
| `cover` | none, grass (kind), moss, snow, ash, blood, … | grass / spatter layer |
| `liquid` | none, water, lava; **depth 0–7**; salinity fresh/brackish/salt | liquid designation |
| `flow` | flowing flag and direction | flow |
| `plant` | plant id + growth stage (sapling, grown, fruiting, stump) | plant on tile |
| `designation` | bit flags: dig, channel, fell, gather, till, build, … | designations |
| `biome` | biome id (§3) of this cell | region / biome |
| `temperature` | (later) for freezing, melting, burning | tile temperature |
Explored/visible stays in `UF_Fog`.

### 2.2 Things (lists, saved with the world)
| List | Holds | Notes |
|---|---|---|
| **Items** | id, type, material, quality, wear, location (a cell on the ground / carried by a unit / inside a container / part of a building) | **Items can be dropped and lie on the ground** as visible objects (V21) |
| **Units** | people and creatures (`UF.World.units`): body, attributes, skills, needs, personality, relationships, faction, job | already exists for travel; gets DF's inner life (§7) |
| **Buildings** | id, type, footprint, materials used, **construction progress**, stored items | **built one segment at a time** (V21): a planned wall is a ghost until a unit delivers material and works on it |
| **Jobs** | what, where, materials needed, who's doing it, priority | DF's job queue: designations and orders create jobs; units pick them up |
| **Zones** | stockpiles, farm plots, meeting areas, bedrooms | DF zones and stockpiles |

### 2.3 How the screen shows it
- Ground tiles are chosen from `shape + material + cover + liquid`, with edges computed by the autotile resolver `UF_WorldGen` already has.
- Trees, plants, boulders, items, buildings, and units are sprites (events), created from the state and removed when the state changes (a felled tree becomes a stump plus logs on the ground).
- When anything changes it's written to the state first, then the view updates. This is what makes it saveable and consistent off screen.

### 2.4 Everything is interactive (V25)
Every cell and object type gets **actions** from a data table (catalog `actions`), for example:
| Thing | Actions (result) |
|---|---|
| Tree | look; **fell** → logs + stump; harvest fruit (in season); climb |
| Shrub / berry bush | gather → berries; uproot |
| Grass | cut → fiber |
| Boulder / rock outcrop | quarry → stone; mine ore → ore |
| Soil floor | dig down; till → farm plot; build on it |
| Rock wall (underground) | **mine** → stone + open floor; smooth; engrave |
| Water | drink; fill a container; fish; channel, dam, or drain (§2.5) |
| Item on the ground | pick up; haul to a stockpile; use; eat or drink |
| Building | use; store items; deconstruct → materials back |
| Creature | look; hunt; tame; butcher (dead) |
| Person | look; talk; recruit; give an order |
The player gives orders DF-style (designate an area: "fell these trees") or U7-style (double-click a thing). The colonists carry them out as jobs.

### 2.5 Water and lava you can change, across layers (V22)
DF's fluid rules: each cell holds 0–7 units; liquid spreads to lower neighbors, falls through open cells into the layer below (a hole over a cave pours into it), and pressure pushes it up. Rivers and oceans are sources. Digging a channel next to water floods it; a wall or floor blocks it (a dam); a floodgate lets it through when opened. For us:
- Liquid lives in the cell state (depth 0–7, type, salinity).
- A **fluid update** runs on a fixed tick, only over "active" cells near recent changes (DF does the same), so still water costs nothing.
- **Between layers:** cells with open shape over a cave mouth or channel drain down into the same cell of the layer below. Our layers share cell coordinates (V20), so this maps directly.
- Water depth sets passability: 1–3 wadeable, 4+ swim or blocked. It also shows as depth-shaded water tiles (art AR-110).

## 3. Starting states for world blocks (biomes)
Every area (a 256×256 block) gets its character from world-level fields computed from the seed: **elevation, rainfall, temperature, drainage, salinity (near oceans), savagery, and good/evil**. These are smooth noise over the whole world, so neighboring areas blend into each other. Each **cell** gets a biome from those fields, so an area can hold a forest edge, a marsh, and a lake. The start area is always habitable (temperate); everything else is open.

| Group | Our biomes (every DF biome has one) | Terrain | Typical plants | Typical creatures |
|---|---|---|---|---|
| Cold | Glacier, Tundra, Taiga | ice / snow / frozen soil / conifer floor | lichen, sparse conifers | cold-climate wildlife |
| Temperate forest | Conifer forest, Broadleaf forest | forest floor | pines, oaks, birches, undergrowth | deer-sized grazers, predators, birds |
| Tropical forest | Conifer, Dry broadleaf, Moist broadleaf (rainforest) | rich soil, vines | palms, broadleaf giants | jungle wildlife, fliers |
| Open land | Grassland, Savanna, Shrubland (each temperate and tropical) | grass kinds, dry soil | grasses, scattered trees, shrubs | herds, burrowers, large predators |
| Dry | Sand desert, Rock desert, Badlands | sand, stony ground, red clay | cacti, desert shrubs | desert-adapted creatures |
| High | Mountain | bare rock, scree, snow at peaks | few | mountain creatures |
| Wet | Marsh (fresh/salt × temperate/tropical), Swamp (same), Mangrove | mud, reeds, shallow water | reeds, swamp trees, mangroves | amphibians, water birds |
| Water | Ocean (arctic/temperate/tropical), Lake, River, Pool (each fresh/brackish/salt) | water by depth | aquatic plants | fish, aquatic creatures |
| Underground (layer 1+) | Cavern water, Chasm, Lava | cave floor, rock, underground lakes, chasms (open drops), lava pools | cave fungi (tree-sized and small) | underground creatures |

**Region modifiers:** savagery (**tame / wild / primeval**) raises how many dangerous creatures appear. Good/evil (**blessed / neutral / cursed**) swaps in special plants and creatures and tints the land (for example, cursed forests with dead trees and wrong-colored grass). Nine combinations, each with a visual treatment (art AR-120).

**Other block features:** river networks (a main river now; add tributaries), lakes and ponds, mineral outcrops, cave mouths (done), and **sites**: other factions' camps and settlements (§12), ruins, and lairs (monster homes).

## 4. Geology
Layers of stone under each area, by depth: soil (a few cells deep), then sedimentary, igneous, and metamorphic layers, with **veins and clusters** of ores and gems, and aquifer layers that seep water. The underground layer's rock gets its real material from this. Mining yields that stone or ore. Materials carry properties (hardness, value, color, fire resistance) that later matter for crafting. We make our own list of stones, ores, metals, and gems (real minerals are fine, since they're real-world words), about 30 stones and 20 gems to start.

## 5. Plants
Trees (per biome family), shrubs, grasses, crops, and cave fungi. Each has a **growth cycle** by season (sapling → grown → fruiting → dormant), yields (wood, fruit, fiber, seeds, dye, brewable), and a biome/climate range. Grass regrows. Crops need tilled soil and seasons. Felling a tree leaves a stump and logs (items on the ground).

## 6. Creatures (generated at world start; V24)
- **Wildlife** per biome and savagery: grazers, predators, fliers, burrowers, aquatic. They wander, graze, hunt, flee, sleep, and breed.
- **Vermin:** small, mostly harmless, eat food left out.
- **Monsters:** rare, dangerous, and region-bound (primeval and cursed regions, deep caves), plus a few unique giant creatures with lairs.
- **Domestic animals:** can be tamed, then give milk, eggs, wool, or haul things.
- **Faction members** live at their faction's home area: patrols, hunters, merchants, and raiders (§12).
All are `UF.World` units, so they live and move off screen too (V14). The start area gets tame wildlife near the start and nothing hostile within a safe radius.

## 7. People: inner life and autonomous AI (V17, V23)
- **Needs:** food, drink, sleep, safety, social contact, and more over time (comfort, worship, creativity…). Unmet needs cause bad thoughts.
- **Personality:** traits on 0–100 scales (curiosity, industriousness, bravery, sociability, patience, …) and values. They set **what a person chooses to do** when free, and how they react.
- **Skills:** improve with use; decide how good the work is.
- **Thoughts, emotions, stress:** events leave thoughts ("slept in the rain"). Stress builds and eases, and breaks down at the extremes.
- **Daily pattern:** sleep at night, eat and drink when needed, work in the day, rest and socialize in the evening. Personality shapes it (early risers, loners).
- **Productive work chosen by the colonists themselves:** a planner looks at the colony's needs (shelter, fire, food store, water, tools, safety) and each person's skills and personality, and picks jobs: gather, fell, build the next wall segment, tend the fire, cook. The player can set priorities and designate work, but the colony keeps itself going without input.
- **Relationships:** acquaintance → friend → close friend; romance → spouse; family ties. Grudges.
- **Reproduction (V26):** partners can have children. Pregnancy, birth, infancy, childhood, adulthood, aging, and death, on a timescale the user sets (Q11).
- **Death:** the body stays (an item/unit state). Grief thoughts; burial.

## 8. Health and combat
**Combat works like Ultima VII's (user decision 2026-09-18, VISION V29), not DF's.** From U7 (details to be confirmed against the real game [MEASURE]):
- **Real time.** A **combat mode** toggle; outside combat mode, characters don't start fights.
- **Attack modes per character**, which the fighter follows automatically: attack nearest, weakest, strongest, berserk, protect (a chosen person), defend, flank, flee, and manual.
- **Targeting by clicking** an enemy; your people also fight on their own according to their mode.
- **Hit and damage from stats and equipment:** strength, dexterity, combat skill, weapon damage, armor value. Health as **hit points**; unconscious or dead at 0.
- Fleeing, pursuit, and ranged weapons (bows, thrown) with ammunition.
**Open question Q12:** layer DF-style injuries on top (bleeding, broken or lost limbs, lasting scars and infections from body-part hits), or keep U7's pure hit points? The earlier draft `UF_DFCombat.js` only generates DF-flavored combat text and is not used by this design.
Medicine (later): rest, bandaging, and doctors; with DF-style injuries, also setting bones and treating infections.

## 9. Items
Categories: raw materials (logs, stone, ore, bars, gems, plant fiber, cloth, leather, bone), food and drink, tools, weapons, armor and clothing (by body part and layer), furniture, containers (bag, barrel, chest), toys, instruments, and trade goods. Each has material, quality, and wear. **Items exist as world objects**: they lie on the ground, get carried, and are stored in containers or stockpiles. They show on the map (small sprites) and in U7-style container windows (gumps).

## 10. Construction and crafting
- **Construction (V21):** walls, floors, ramps, stairs, doors, hatches, bridges, roads, from any buildable material. A planned structure is a **ghost** at the site. Workers bring the materials (hauling) and build **one segment at a time**; each segment becomes real when finished. Deconstructing returns the materials. A shelter is walls plus a roof or floor above. A fire is a built campfire that uses fuel and gives light and warmth.
- **Furniture:** bed, table, chair, cabinet, chest, and more. Placing them makes rooms (bedroom, dining room); room quality affects thoughts.
- **Workshops:** each turns inputs into outputs (reactions). A first set for the early game: campfire/kitchen, carpenter, stoneworker, crafter, tanner, loom, forge and smelter (later), kiln, still. Recipes live in a data table (catalog `reactions`).

## 11. Farming and food
Tilling, planting by season, harvesting, cooking, brewing, fishing, hunting, butchering, and gathering wild food. Food spoils. Stockpiles keep it safe from vermin.

## 12. Factions and the wider world (V18, V19)
Already done: factions rolled per game with relations. To add from DF:
- **Settlements** placed in their home areas as sites, with buildings and population as units.
- **Behaviors by type:** traders (caravans), sieges, ambushes, thieves, baby snatchers, scouts, mercenaries, beast hunters, underground peoples who stay on their layer.
- **Arrivals at the map edges (V19):** migrants (who join the colony), visitors, merchants, and raiders. Who comes depends on relations.
- **Relations change** through events (trade, theft, attacks, gifts, marriages), and each faction remembers.
- **History (later):** a short generated history before the game starts, so factions have past wars and alliances.

## 13. Time
- **1 game hour per real minute** at normal speed (user, 2026-09-18); speed-up ×2/×4/×8, never backward.
- Seasons change plants, weather, and temperature. **Open question Q11:** how long is a year, a pregnancy, a childhood? At 1 hour per minute, a DF-length year would take over 100 real hours.

## 14. What exists vs. what's next (build order)
| # | System | State | Needs art (see `docs/handoffs/HANDOFF_df_art.md`) |
|---|---|---|---|
| 0 | Seeded world of areas and layers, factions, fog, day/night, time speed, zoom | **built and tested** | stand-ins in use |
| 1 | **Cell state + biomes** (§2.1, §3), geology basics (§4) | next | Wave 1: terrain and plants per biome |
| 2 | **Interaction layer**: actions on everything, items on the ground, jobs (§2.4, §9) | after 1 | Wave 2: interaction states and ground items |
| 3 | **Colonists as world units with DF inner life and autonomous planner**; colony saves (§7) | after 2 | people variants |
| 4 | **Construction one segment at a time**, campfire, shelter, furniture, workshops (§10) | after 3 | Wave 3: construction |
| 5 | **Starting population**: wildlife, vermin, monsters, faction members at their sites (§6, §12) | after 4 | Wave 4: creatures and people |
| 6 | **Fluids** across layers (§2.5) | after 5 | water depth and lava tiles |
| 7 | **Edge arrivals** and faction behaviors (§12) | after 6 | — |
| 8 | Relationships, **reproduction**, aging (§7) | after 7 | children and elder variants |
| 9 | **U7-style combat** (§8) and health | after 8 | weapons, attack animations, blood/hit effects |
Each row ships with checks (`UF_Test`) and a handoff report for Gemini, per the working rules.
