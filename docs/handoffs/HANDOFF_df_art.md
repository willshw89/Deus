# HANDOFF: art for the DF-style world, in waves

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-18
**Plan this serves:** `docs/design/DF_MECHANICS.md`. The game is adopting Dwarf Fortress's mechanics (biomes, interactive everything, construction, creatures, people with inner lives), shown in the Ultima VII look.
**Work in wave order.** Each wave matches the engine step that will use it (DF_MECHANICS §14). Art for a later wave can't be tested in game until its engine step lands. Deliver the files anyway, and Claude Code integrates them when the system exists.

## Rules for every asset (short version; full rules in ART_STANDARD.md and ASSET_REQUESTS.md)
- **Projection:** flat things (ground, water, floors) are flat top-down. Anything with height leans **up-left at 45°**, footprint at the bottom-right of the frame.
- **Scale:** draw at 1× native (16×16 px per cell), export at exactly **3×** (48×48 per cell). Nothing else.
- **Stand-ins:** U7 art is allowed. Name files `U7_…`, exactly 3×, and list each in `docs/STATUS.md` → Stand-ins with its source shape. **Don't overwrite an existing non-`U7_` file with U7 art**; add a new `U7_` file and note which catalog entry should switch to it.
- **Must read at 1×** (farthest zoom) and under night lighting and fog dimming.
- **No invented lore in names:** generic, descriptive file and display names (`!$U7_Tree_Conifer_A.png`, "Conifer").
- Mark each request in `docs/ASSET_REQUESTS.md` as you go, and say what you checked.

## Wave 1: biomes (engine step 1, next)
Every DF biome becomes a possible starting state for a world block (DF_MECHANICS §3). Each biome needs ground, plants, and (later) creatures that look different from the others.

**1a. Ground tiles (AR-100):** RMMZ **A2 autotile** kinds (the engine computes edges, so all 47 shapes must work). One kind each:
| # | Ground | Used by |
|---|---|---|
| 1 | Temperate grass | grassland, forest edges |
| 2 | Tropical grass (lusher, bluer green) | tropical grassland, forests |
| 3 | Dry grass (yellow) | savanna |
| 4 | Shrubland soil (patchy) | shrubland |
| 5 | Forest floor (leaf litter) | broadleaf forests |
| 6 | Needle floor | conifer forests, taiga |
| 7 | Tundra (frozen moss) | tundra |
| 8 | Snow | peaks, glacier edges, winter (later) |
| 9 | Ice | glacier, frozen water |
| 10 | Sand | sand desert, beaches |
| 11 | Stony ground | rock desert |
| 12 | Red clay | badlands |
| 13 | Bare rock / scree | mountains |
| 14 | Mud | marshes |
| 15 | Swamp mud (dark) | swamps, mangrove |
| 16 | Dirt (bare, dug) | paths, dug soil, farm plots |

**1b. Water (AR-101):** RMMZ **A1** animated autotiles, 3 frames each: fresh water (rivers, lakes), brackish, salt (sea), **deep ocean**, murky swamp water, and **lava** (for caves).

**1c. Trees (AR-102):** object sheets (`!$` files), states **standing** and **stump** (a felled log item comes in Wave 2). Two to three variants per family:
| Family | Variants | Biomes |
|---|---|---|
| Temperate broadleaf (oak-like, birch-like, maple-like) | 3 | broadleaf forest, grassland edges |
| Conifer (pine-like, spruce-like, fir-like) | 3 | conifer forest, taiga, mountains |
| Tropical broadleaf (large-leaf canopy) | 3 | tropical forests |
| Palm | 2 | tropical coasts, tropical grassland |
| Acacia-like (flat top) | 1 | savanna |
| Mangrove (roots in water) | 1 | mangrove swamp |
| Swamp tree (drooping) | 1 | swamps |
| Dead tree | 2 | cursed regions, badlands |
| Giant cave mushroom | 3 | underground |

**1d. Small plants (AR-103):** shrub (desert), cactus ×2, reeds, fern, wildflowers ×2, cave mushrooms ×2, lichen patch, and berry bush (exists; keep).

**1e. Region looks (AR-120):** color-shifted variants for **cursed** land (sickly grass, dead trees; grey-purple cast) and **blessed** land (bright, flowering). One variant of temperate grass and forest floor each is enough to start. The engine can also tint.

**How Wave 1 plugs in:** Claude Code is adding a `biomes` section to `game/data/UF_WorldCatalog.json` in engine step 1. Each biome lists its ground tile, water tile, and plant list (by object id), exactly like the current `objects` list (see `HANDOFF_world_generation.md` §2). Deliver the images now. Once the section exists, you can add plants to biomes yourself, the same way you add objects today.

## Wave 2: things you can pick up, and what actions leave behind (engine step 2)
**Ground items (AR-200):** small sprites (1 cell, low) for items lying on the ground: log (felled wood), stone block, ore chunk, gem, rubble, berries, fruit, plant fiber bundle, seeds, meat, fish, bone, hide, clay, sand pile. The **same image** also appears as the item's icon in container windows (gumps), so it needs to read at 48×48.
**Action states:** tree stump (with 1c), harvested bush, cut grass, dug soil (use 1a #16), mined rock face (underground).

## Wave 3: building (engine step 4)
**Construction (AR-300)**, all in the U7 projection (walls lean up-left), built one segment at a time:
- **Walls** in three materials (log/wood, stone block, mud/earth). Each needs segment pieces: straight (horizontal and vertical), 4 corners, 4 T-junctions, cross, and end caps. The engine picks the piece from the neighbors, like autotiles.
- **Floors:** wood planks, stone flags, packed earth (flat).
- **Door** (wood, closed/open), **stairs up/down**, **ramp**.
- **Campfire** (lit and unlit, 2–3 flame frames; the U7 stand-in exists), **leaf bed**, **straw bed**, **lean-to / tent**.
- The engine draws "planned but not built" segments as a transparent ghost, so no separate art is needed.

## Wave 4: creatures and people (engine step 5)
**People (AR-400):** the 7 faction species in the catalog (humans, elves, dwarves, goblins, orcs, gnomes, automata). Each gets male and female, plain clothing, a **4-facing walk sheet** (sidecar format in ASSET_REQUESTS.md), and children later.
**Wildlife (AR-401), start with these archetypes:** small grazer (hare-like), medium grazer (deer-like), large grazer (herd animal), small predator (fox-like), large predator (wolf/bear-like), bird (ground), bird (flying), burrower, amphibian, reptile, fish (shown in water), and vermin (rodent, insect). Underground: cave crawler, cave bat, cave predator.
**Monsters (AR-402):** 4 generic, region-bound dangers (primeval, cursed, deep caves, a unique giant). No D&D product-identity creatures (AGENTS.md).
**Domestic (AR-403):** 4 tameable animals (milk, eggs, wool, pack).

## Wave 5: workshops, furniture, tools (engine steps 4 and later)
**AR-500:** workshops as 3×3 objects (crafter, carpenter, stoneworker, kitchen, tanner, loom, kiln, smelter, forge, still); furniture (table, chair, chest, cabinet, barrel, bin); tools and weapons as item icons (axe, pick, hammer, knife, spear, bow, shovel, bucket).

## How to check your work
- Open every exported image at 1× and 3×. Check the lean, the footprint corner, and the pixel grid (ART_STANDARD §8).
- Once the relevant catalog section exists: `run_tests.bat worldgen` checks that every catalog image file exists, and zooming out in game shows the patches.
- Update `docs/ASSET_REQUESTS.md` (status + what you checked) and `docs/STATUS.md` → Stand-ins for U7-derived files.
