# HANDOFF: art for the DF-style world, in waves

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-18
**Plan this serves:** `docs/design/DF_MECHANICS.md`. The game is adopting Dwarf Fortress's mechanics (biomes, interactive everything, construction, creatures, people with inner lives), shown in the Ultima VII look.
**Work in wave order.** Each wave matches the engine step that will use it (DF_MECHANICS §14). Art for a later wave can't be tested in game until its engine step lands. Deliver the files anyway, and Claude Code integrates them when the system exists.

**Revised 2026-09-18 (evening):** the world is one 256×256 surface area; there is **no underground**, so nothing cave-related is needed (cave mushrooms, lava, cave creatures are dropped from the lists below). Every asset is designed **with its interaction states** (user rule): `docs/ASSET_INVENTORY.md` lists the states per asset, and `docs/handoffs/HANDOFF_world_generation.md` explains catalog v3 (objects with actions, items, creatures, people, clothing tiers) and how to find what needs art. Where this file and those two disagree, they win.

## Rules for every asset (short version; full rules in ART_STANDARD.md and ASSET_REQUESTS.md)
- **Projection:** flat things (ground, water, floors) are flat top-down. Anything with height leans **up-left at 45°**, footprint at the bottom-right of the frame.
- **Scale:** draw at 1× native (16×16 px per cell), export at exactly **3×** (48×48 per cell). Nothing else.
- **Stand-ins:** U7 art is allowed. Name files `U7_…`, exactly 3×, and list each in `docs/STATUS.md` → Stand-ins with its source shape. **Don't overwrite an existing non-`U7_` file with U7 art**; add a new `U7_` file and note which catalog entry should switch to it.
- **Must read at 1×** (farthest zoom) and under night lighting and fog dimming.
- **No invented lore in names:** generic, descriptive file and display names (`!$U7_Tree_Conifer_A.png`, "Conifer").
- Mark each request in `docs/ASSET_REQUESTS.md` as you go, and say what you checked.

## Wave 1: biomes (engine step 1, next)
Every DF biome becomes a possible starting state for a world block (DF_MECHANICS §3). Each biome needs ground, plants, and (later) creatures that look different from the others.

**1a. Ground tiles (AR-100):** one RMMZ **A2 autotile** sheet (768×576, 8 kinds per row) with the **22 kinds in the catalog's `groundKinds` order** (the engine computes edges, so all 47 shapes must work): meadow, lush grass, dry grass, scrub soil, leaf litter, needle floor, jungle floor, tundra, snow, ice, sand, stony ground, red clay, bare rock, rock face (impassable peaks), mud, swamp mud, dirt, blighted grass (cursed), flowering grass (blessed), ash (cursed forests), scree. Until it exists the engine draws them in code (`UF_GenGround_A2`; the colors in the catalog are the intended palette).

**1b. Water (AR-101):** one RMMZ **A1** sheet, 3 animation frames per kind, **nine kinds in the catalog's `water.surface` order**: fresh (rivers), pond, marsh, swamp, icy, brackish, salt, deep (ocean), blighted (cursed regions). Every autotile piece of every kind filled (the stock sheet is in use until then; a half-empty sheet breaks the coast).

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

Catalog ids these map to: oak, birch, pine, fir_snow, fruit_tree (+ fruit_tree_bare), tree_savanna, tree_swamp, mangrove, tree_tropical, palm, dead_tree, tree_cursed, and `stump` for all of them.

**1d. Small plants (AR-103):** shrub, desert shrub, snow bush, cactus ×2, tall grass, reeds, fern, wildflowers (one image; the engine tints purple/blue/white), lichen patch, wild grain, wild wheat, lily pads (on water), and berry bush (full + picked). Each gathered plant's "after" state is either gone or a second entry (`berry_bush_bare`).

**1e. Region looks (AR-120):** color-shifted variants for **cursed** land (sickly grass, dead trees; grey-purple cast) and **blessed** land (bright, flowering). One variant of temperate grass and forest floor each is enough to start. The engine can also tint.

**How Wave 1 plugs in:** the `biomes` section of `game/data/UF_WorldCatalog.json` exists (catalog v3): each biome lists its ground kind, water kind and plant chances by object id. The biome tables are Claude Code's; you add or replace the images and the `objects` entries (`HANDOFF_world_generation.md` §2).

## Wave 2: things you can pick up, and what actions leave behind (engine step 2)
**Ground items (AR-200, delivered as stand-ins) and AR-201 (tools and clothing):** small sprites (1 cell, low) for items lying on the ground: log, firewood, stone, iron ore, copper ore, gold nugget, rough gem, cut gem, iron bar, berries, fruit, mushrooms, root vegetable, seeds, plant fiber, straw, raw meat, cooked meat, fish, hide, bone, wool, **stone knife, stone axe, stone pick, woven wrap, hide cloak**. The **same image** also appears as the item's icon in container windows (gumps), so it needs to read at 48×48.
**Action states:** tree stump (with 1c), picked bush, worked-out outcrop (loose stones), dug soil (dirt kind), campfire lit/unlit (AR-105), walls intact/ruined (AR-104).

## Wave 3: building (engine step 4)
**Construction (AR-300)**, all in the U7 projection (walls lean up-left), built one segment at a time:
- **Walls** in three materials (log/wood, stone block, mud/earth). Each needs segment pieces: straight (horizontal and vertical), 4 corners, 4 T-junctions, cross, and end caps. The engine picks the piece from the neighbors, like autotiles.
- **Floors:** wood planks, stone flags, packed earth (flat).
- **Door** (wood, closed/open), **stairs up/down**, **ramp**.
- **Campfire** (lit and unlit, 2–3 flame frames; the U7 stand-in exists), **leaf bed**, **straw bed**, **lean-to / tent**.
- The engine draws "planned but not built" segments as a transparent ghost, so no separate art is needed.

## Wave 4: creatures and people (engine step 5)
**People (AR-400):** the 7 faction species in the catalog (humans, elves, dwarves, goblins, orcs, gnomes, automata). Each gets male and female, plain clothing, a **4-facing walk sheet** (sidecar format in ASSET_REQUESTS.md), and children later.
**Wildlife (AR-401):** the 24 species in the catalog's `wildlife.species` (deer, boar, aurochs, wild horse, wild sheep, hare, wild fowl, rat, wolf, jackal, fox, arctic fox, wildcat, serpent, hawk, songbird, bat, giant spider, and the monsters below), each a 4-facing walk sheet **plus a carcass frame** (prey are hunted from day one). Stand-ins exist for 16; variants are tints of shared sheets until originals arrive.
**Monsters (AR-402):** troll, bog horror (swamps, primeval), sand stalker (deserts, wild), restless dead and ice wraith (cursed regions). No D&D product-identity creatures (AGENTS.md).
**Domestic (AR-403):** 4 tameable animals (milk, eggs, wool, pack).

## Wave 5: workshops, furniture, tools (engine steps 4 and later)
**AR-500:** workshops as 3×3 objects (crafter, carpenter, stoneworker, kitchen, tanner, loom, kiln, smelter, forge, still); furniture (table, chair, chest, cabinet, barrel, bin); tools and weapons as item icons (axe, pick, hammer, knife, spear, bow, shovel, bucket).

## How to check your work
- Open every exported image at 1× and 3×. Check the lean, the footprint corner, and the pixel grid (ART_STANDARD §8).
- Once the relevant catalog section exists: `run_tests.bat worldgen` checks that every catalog image file exists, and zooming out in game shows the patches.
- Update `docs/ASSET_REQUESTS.md` (status + what you checked) and `docs/STATUS.md` → Stand-ins for U7-derived files.
