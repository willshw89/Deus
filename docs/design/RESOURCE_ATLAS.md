# Five-level resource and biome atlas

**Date:** 2026-09-19

**Status:** approved design target from VISION V82-V83; not implemented

**Scope:** make every distinct resource role represented in Dwarf Fortress, Ultima VII and Old School RuneScape available in an appropriate part of UF's five-level world, while using original data, names, balance and presentation.

This is the content and generation contract for `VERTICAL_WORLD.md`. It does not copy source raws, prose, setting-specific names, quest objects, art, maps or numeric balance. Real materials and ordinary terms such as granite, iron, garlic, ginseng, pearl and clay are not setting lore and may retain their ordinary names.

## 1. What "every resource" means

The implementation must build a **resource coverage manifest**. Every raw material, gathered product and production input found in the three reference sets receives exactly one manifest result:

1. `canonical`: a UF resource with distinct behavior, use, tier, habitat or extraction method;
2. `variantOf`: a named material variant that shares mechanics but remains discoverable and tradeable, such as a particular stone, timber, fish or gemstone;
3. `aliasOf`: a duplicate source name mapped to the same real or generic material;
4. `producedBy`: a processed good made from available raw resources rather than spawned as a natural node; or
5. `excluded`: only for a quest-only key object, currency, joke item, named artifact or other thing that is not a replenishable/gatherable resource. Each exclusion needs a written reason.

No source row may silently disappear. A generated coverage report must count all manifest inputs and results and fail on an unmapped row.

"Every resource" therefore preserves every distinct **gameplay function**, not three duplicated databases. It includes the full range of real stone and gem variants as variants, the full range of plant/animal yields, and every materially different gathering or processing route. It does not require copied proprietary fantasy names. A source-specific fantasy tier becomes an original UF material with the same broad progression role only after its name and theme are approved under V9 and V65.

### 1.1 Availability guarantee

- Every canonical raw resource marked `worldRequired` has at least one legal source in every New Game.
- Every required variant marked `worldRequired` has at least one deposit, organism population or habitat patch. Very rare variants may have only one guarded patch.
- Every processed resource has all raw inputs and at least one valid production path available in the world; processed goods do not need to exist before someone makes them.
- Every skill in V63 has renewable practice material at low levels and appropriate higher-level materials somewhere in the world.
- Every faction start still receives V67's nearby construction minimum. World coverage is separate from, and much broader than, the start kit.
- A required resource may be difficult, dangerous, hidden, skill-gated or deep. "Available" does not mean visible or safe at the start.

### 1.2 Reasonable distribution and spawn rate

Availability is not satisfied by putting every source in one remote pile. Each biome region has data-driven `initialDensity`, `minimumPopulation`, `targetPopulation`, `softCap`, `hardCap`, `recoveryRate` and `spawnInterval` values for each eligible renewable resource and enemy population.

- Common construction, food and fuel sources are distributed through every compatible region, with the stronger V67 guarantee around each faction start.
- Uncommon resources appear in several separated patches when their biome area permits. Rare resources may be singular, but their scarcity must be intentional and reported by the coverage audit.
- Enemies are spread across legal danger habitats and levels. One region cannot consume the whole world's population cap.
- Ongoing ecology services every level and biome region in a seeded weighted round-robin, including off-screen levels. The visible level receives no spawn-rate advantage.
- Recovery probability rises with the deficit below the region target and stops at the hard cap. This avoids both empty worlds and sudden swarms.
- New units and blocking plants obey V68, faction-start protection, settlement distance and local line-of-sight/pop-in rules.
- Open-air cells on `+1/+2` receive only creatures and resources whose movement/habitat allows them there, such as fliers, nests, fruit, branches or canopy growth.
- Exact numeric rates live in the catalog and are tuned from telemetry. "Reasonable" must be demonstrated with distribution histograms and long seeded simulations, not asserted from a single screenshot.

## 2. All five levels are generated at New Game

Generation is not lazy. Before play begins, the engine creates, validates and commits seeded baselines for all `327,680` cells (`5 x 256 x 256`):

| z | Generated baseline | Ecological/geological identity |
|---:|---|---|
| `+2` | air, sunlight/exposure, tall-tree crown cells, high ledges and vertical traversal masks | upper canopy, open sky and high-exposure zones derived from the ground biome |
| `+1` | air, trunk/branch cells, canopy paths, raised natural points and vertical traversal masks | lower canopy, cliff-face and open-air zones derived from the ground biome |
| `0` | terrain, climate, surface water, surface biomes, flora, fauna and starting areas | the complete surface biome mosaic |
| `-1` | soil/earth strata, roots, aquifers, upper stone, shallow caves, earth biomes and their ecology | distinct upper-earth biome mosaic |
| `-2` | hard-rock geology, deep domains, caverns, lakes, chasms, magma, Hell, deposits and deep ecology | distinct deep-world biome mosaic |

The two upper levels are fully allocated and checksummed at generation even though most cells begin as open air. Their biome/exposure tags are derived from `z=0` because sky above a desert and canopy above a rainforest should not become unrelated worlds.

### 2.1 Atomic generation transaction

The player never enters a partially built world. New Game performs this deterministic transaction:

1. derive the surface climate fields, geology columns and water table from the world seed;
2. allocate and fill all five terrain baselines;
3. assign the `z=0`, `z=-1` and `z=-2` biome mosaics, plus derived `z=+1/+2` exposure zones;
4. place water, magma, caves, openings and vertical connector opportunities as one aligned column system;
5. place natural resource sources from the manifest's legal level/biome/depth rules;
6. place renewable flora, fauna, fish and monster populations under habitat caps;
7. place faction starts and V67 start guarantees without overwriting natural blockers or units;
8. run coverage, reachability, containment, spawn-safety and progression audits;
9. deterministically repair missing coverage using the seed plus an audit salt, then rerun every affected audit;
10. store a checksum for each level and commit the complete world state; only then enter play.

If the bounded repair attempts cannot produce a valid world, New Game reports the failed invariant and seed. It does not continue with an incomplete world or generate a missing level later.

The immutable natural baseline may be reconstructed from the seed when loading a save, with only sparse changes stored. That is save compression, not lazy world generation: all five baselines and their checksums must have been generated and validated before the first playable frame.

## 3. Biome atlas

Biome boundaries are irregular regions driven by coherent fields, not rectangular rooms. All biome names below are generic working labels.

### 3.1 Surface biomes (`z=0`)

Every world contains usable regions from every major surface family so their required resources can exist. Temperature, rainfall, drainage, salinity, elevation, wildness and region character produce local variants.

| Family | Included regions | Characteristic resources |
|---|---|---|
| Cold | glacier, tundra, taiga | ice, snow, lichen, cold herbs, conifer timber, fur, cold-water fish |
| Temperate forest | conifer and broadleaf forest | softwood, hardwood, resin, bark, berries, fruit, mushrooms, game animals |
| Tropical forest | dry broadleaf, moist broadleaf and dense rainforest | tropical hardwoods, vines, fibers, dyes, fruit, medicinal and poisonous plants |
| Open land | temperate/tropical grassland, savanna and shrubland | grasses, grain relatives, fiber, herbs, herd animals, clay/sand exposures |
| Wetland | fresh/brackish/salt marsh and swamp, mangrove | reeds, peat, mud, blood moss, mandrake, fish, amphibious and waterfowl products |
| Dry | sand desert, rock desert and badland | glass sand, salt, clay, cactus/succulent products, dry herbs, exposed stone |
| High | mountain, scree and snow peak | exposed stone, early outcrops, high herbs, mountain timber and animal products |
| Fresh water | rivers, lakes, pools and their banks | drinking water, freshwater fish, reeds, clay, pearls/shells where eligible |
| Marine | arctic, temperate and tropical coast/ocean | salt water, fish, shellfish, seaweed, coral, shells, pearls |

Each surface region also carries the approved `tame/wild/primeval` and `blessed/neutral/cursed` modifiers. Modifiers alter density and eligible original flora/fauna; they do not replace the physical biome.

### 3.2 Upper-earth biomes (`z=-1`)

`z=-1` is not a single brown cave map. It is a full earth-biome mosaic aligned with surface drainage, climate and bedrock.

| Earth biome | Terrain and hazard | Main resources |
|---|---|---|
| Rooted loam | deep roots, soft earth, occasional collapse | loam, roots, tubers, earthworms/invertebrates, shallow stone |
| Clay bed | dense wet or fire clay | pottery clay, fire clay, pigment earth, groundwater pockets |
| Sand and gravel bed | loose, draining or water-bearing sediments | sand colors, gravel, glass sand, placer metals/gems |
| Peat earth | wet organic soil and gas-prone pockets | peat fuel, moss, fungi, preserved organic material |
| Aquifer earth | seeping or pressurized water-bearing soil/stone | groundwater, wet clay, dissolved salts, cave fish near openings |
| Chalk and karst | limestone/chalk with sinkholes and solution caves | limestone, chalk, gypsum, flux stone, calcite, cave pools |
| Salt and evaporite | dry salt beds and brine pockets | rock salt, potash-like salts, gypsum, saltpeter and brine |
| Frozen earth | permafrost, buried ice and frozen silt | ice, frozen peat, cold roots, preserved remains |
| Ash and tuff | old volcanic deposits and warm cracks | volcanic ash, tuff, pumice, sulfur traces, glass-making additives |
| Shallow cave | mud pockets, small chambers and dim ecology | cave mud, common stone/ore, fungi, moss, insects, bats and webs |

Ordinary stone and common ore may cross several earth biomes where their host geology permits. Biome identity changes likelihood, extraction conditions and associated resources; it never paints an impossible ore into the wrong host rock.

### 3.3 Deep-world biomes (`z=-2`)

`z=-2` holds several gated domains on the same physical level. Their `depthBand` and barriers preserve descent progression even though UF does not have dozens of maps.

| Deep biome | Terrain and hazard | Main resources |
|---|---|---|
| Deep mine belt | intact hard rock with dense seams; no prebuilt historical mine | broad ores, coal, flux, industrial stone and rare metal deposits |
| Crystal cavern | large voids, fragile shelves and reflective formations | quartz families, crystals, ornamental stone and common-to-precious gems |
| Fungal forest | mud, spores and tree-sized fungus ecology | edible/brewable/dye fungi, fungal timber/fiber, silk and cave animal products |
| Subterranean lake | fresh, brackish or saline deep water | cave fish, shellfish, cave pearls, algae, salts and water |
| Chasm | open drops, bridges needed, exposed faces | cliff deposits, nests, guano, rare veins and flying-creature products |
| Fossil and bone bed | ancient sediment and mineralized remains | fossils, bone, shell, limestone, oil-bearing or resinous material where approved |
| Deep salt cavern | dry voids or brine chambers | salt, gypsum, borax-like fluxes, saltpeter and unusual crystals |
| Magma chamber | extreme heat, magma and volcanic gas | magma, obsidian, basalt, brimstone, volcanic ash and heat-gated minerals |
| Frozen deep cavern | deep ice, cold water and unstable frozen shelves | ice crystal, cold fungi, preserved organic resources and cold-creature products |
| Hell | the deepest hot hostile domain, separated by hard barriers and dangerous routes | brimstone, ash, volcanic glass, heat crystal, infernal monster hide/horn/ichor and rare magical essence |

"Deep mine" means mineable natural geology, not an abandoned or inhabited mine. V31 still forbids generated historical sites and prebuilt structures. Colonists and other factions turn it into a mine during play.

Hell is a generic fantasy biome explicitly requested by the user. Its creatures, material names, lore and visuals must be original and require ordinary content approval; the generator contract only reserves its environmental and resource roles.

### 3.4 Upper zones (`z=+1` and `z=+2`)

Upper zones are derived from the surface column:

- lower canopy and upper canopy;
- open sky over each climate family;
- exposed mountain/cliff air;
- tall trunk, branch and crown cells;
- flyways and nests;
- sunlight, wind, rain and snow exposure;
- legal support and headroom for bridges, roofs, towers and additional storeys.

Natural upper resources are chiefly fruit, nuts, leaves, bark, sap/resin, branches, nests, eggs, feathers, honey/wax and flying creatures. They belong to one multi-level plant or habitat entity rather than duplicated resource nodes.

## 4. Canonical resource families and placement

The manifest stores individual resources and variants. This table is the mandatory family-level coverage audit.

| Family | Canonical coverage | Natural/renewable source and primary level |
|---|---|---|
| Earth and aggregate | topsoil, loam, silt, mud, peat, sand colors, gravel, clay families, fire clay, chalk, gypsum, salt, ash, tuff, pumice | surface exposures and `-1` earth biomes; special deep beds on `-2` |
| Layer stone | sedimentary, intrusive/extrusive igneous and metamorphic variants; limestone/flux stone, slate, marble, granite, basalt, obsidian and other real stones | `-1` upper bedrock and the full host-rock range on `-2` |
| Fuel and heat | firewood, peat, lignite/coal; charcoal, coke-like fuel, oil, fat/tallow and wax as gathered or processed fuels | plants/animals on `0..+2`, peat on `-1`, coal on `-1/-2`; processed at workshops |
| Base/alloy metals | copper, tin, iron, lead, zinc, nickel, bismuth and their eligible ores; bronze, brass, steel and other alloys as recipes | common metals begin at `-1`; larger/rarer seams at `-2` |
| Precious/rare metals | silver, gold, platinum, aluminum and other reference metals with actual crafting/trade roles | sparse deep veins, placer deposits where geologically legal; chiefly `-2` |
| Fantasy metal tiers | every source tier with a distinct progression role, converted to approved original UF ore/bar families | guarded rare deposits on `-2`; Hell or magical domains only where the approved material calls for it |
| Gems and crystals | the full real gemstone/mineral variant range; rough/cut states; quartz, crystal, ornamental, precious and rare classes | placer/upper occurrences on `-1`; veins, clusters and crystal caverns on `-2` |
| Wood and tree products | softwood, common hardwood, flexible bow wood, tropical hardwood, dense construction wood, ancient/redwood-scale timber, magical/charged wood roles; logs, branches, bark, resin, sap, fruit and nuts | tree species across `0..+2`; roots may occupy `-1`; processed planks and charcoal |
| Field and garden plants | grains, vegetables, roots/tubers, legumes, herbs, flowers, fruit, berries, hops, bushes, orchard and hardwood saplings | farmable or wild on suitable `0` biomes; seeds remain renewable |
| Fibers and dyes | flax-like bast fiber, cotton-like fiber, reeds/rushes, straw, vine fiber, dye plants, pigments and mordant minerals | `0`, especially open land/wetland/tropical regions; some cave fungus fiber on `-2` |
| Fungi and spores | edible, poisonous, brewable, dye, fiber and timber-scale fungi | shallow caves on `-1`; fungal forest and wet caverns on `-2` |
| Marine/aquatic plants | seaweed, kelp-like plants, algae and coral/nursery resources | surface marine/freshwater on `0`; deep lake variants on `-2` |
| Food animals | meat cuts, fish, shellfish, eggs, milk and edible organs | surface and cave fauna, farms, fisheries and marine/deep-water habitats |
| Animal materials | hide/leather, fur, wool/hair, feathers/down, bone/skull, teeth/tusks, horn/antler, hoof, shell/chitin, scales, sinew, fat/tallow, blood, venom/poison, silk/web, wax/honey, manure and useful organs | creature species on all habitat-bearing levels; renewable by population rules |
| Water and natural liquids | fresh, brackish and salt water; snow/ice; groundwater; brine; magma | `0`, `-1` and `-2` according to hydrology and heat |
| Magical reagents | pearl, blood moss, garlic, ginseng, mandrake, nightshade, spider silk/web, volcanic ash/sulfur; generic blood catalyst, arcane scale, frost organ/heart, rune/essence crystal | shore/wetland/crop/forest sources on `0`; webs on `-1/-2`; volcanic and creature sources on `-2` |
| Monster and Hell yields | chitin, hide, scales, horn, bone, venom, ichor, ash, brimstone, volcanic glass, heat crystal and rare essence roles | monster populations in legal surface/deep habitats; infernal subset only in Hell on `-2` |
| Fertilizer and chemistry | ash, potash-like salts, lime, saltpeter, charcoal, sulfur/brimstone, guano, manure, soap fat and lye inputs | by-products from wood, animals, caves and `-1/-2` minerals |
| Archaeological/natural remains | fossils, petrified wood, old bone and shell beds | natural deposits on `-1/-2`; no prebuilt ruins or named artifacts at generation |

### 4.1 Wood progression without copied tiers

The source references distinguish ordinary, specialist, tropical, high-level and exceptional trees. UF keeps those roles as biome-linked wood properties rather than copying a source game's ladder:

- common softwood: fast-growing fuel and basic construction;
- common hardwood: ordinary furniture, tools and structures;
- flexible wood: bows, handles and sprung mechanisms;
- tropical hardwood: durable, slower-growing furniture/construction;
- dense ancient wood: high-level construction and equipment;
- charged or magical wood: rare original fantasy recipes after approval.

Individual real tree species may be variants. A variant is not mechanically redundant when it changes climate, growth time, yield, strength, flexibility, value, color or recipes.

### 4.2 Ore and metal progression without copied fantasy names

The fixed real-material core is:

- copper + tin -> bronze;
- iron + carbon fuel -> steel;
- lead, zinc, nickel and bismuth for alloys and specialist recipes;
- silver, gold and platinum for trade, decoration, ritual and equipment components;
- aluminum and other rare reference metals only where their extraction method and theme make sense.

Higher fantasy tiers use temporary internal ids such as `fantasy_ore_tier_1..3`, never borrowed player-facing names. Their final names, properties and Arthurian/science-fiction relationship require user approval. All tier roles still receive deposits in the manifest so crafting progression cannot dead-end.

### 4.3 Reagent coverage

The Ultima VII manuals describe a compact reagent economy. UF preserves its acquisition variety with ordinary or original equivalents:

| Functional source | UF resource | Placement |
|---|---|---|
| aquatic pearl | black pearl or pearl variant | marine beds, shellfish and selected deep lakes |
| swamp/dead-tree moss | blood moss | wetland surface, rooted/shallow damp earth |
| cultivated bulb | garlic | surface crop/wild herb |
| medicinal root | ginseng | temperate forest and farm crop |
| wet-earth root | mandrake | wetland and damp `-1` earth |
| poisonous mushroom/herb | nightshade | cursed/damp surface and cave variants |
| web fiber | spider silk | spider/web habitats on `0/-1/-2` |
| volcanic powder | volcanic ash and brimstone | ash/tuff earth; magma/Hell on `-2` |
| blood-grown mineral role | blood catalyst or bloodstone powder | original creature/mineral processing recipe |
| ritual scale role | arcane scale | approved magical reptiles/monsters |
| cold-creature organ role | frost heart or frost organ | cold surface or frozen deep cavern creature yield |

This table maps mechanics, not prose or setting lore from the manuals.

## 5. Production coverage

A resource is not covered if it exists only as an icon. Each produced family requires an executable chain with skill, tool/workshop, inputs, outputs and by-products.

| Inputs | Required production roles |
|---|---|
| logs/branches | firewood, planks, handles, bows, shafts, charcoal, ash/potash |
| stone/clay/sand | blocks, cut stone, pottery, brick, mortar/lime, glass |
| ore/fuel/flux | metal bars, alloys, tools, weapons, armor and fittings |
| rough gems/crystal | cut gems, lenses, jewelry, charged components where approved |
| grain/root/fruit/hops | flour, bread, meals, animal feed, beer/ale, wine/cider and other approved drinks |
| milk/eggs/meat/fish | cooked meals, cheese/butter, preserved food and cooking by-products |
| fiber/wool/hair/silk | thread, cloth, rope, clothing, bags, bowstrings and furnishings |
| hide/fur | leather, parchment, clothing, armor and containers |
| bone/horn/shell/chitin | tools, ornaments, ammunition/weapon parts and armor components |
| fat/ash/lye/wax | tallow, soap, candles, sealants and fuel |
| herbs/reagents/venom | medicine, poison, dyes and approved magical recipes |

Recipes are faction-filtered by V76/V77 and skill-gated by V63/V66. Different factions may exploit different subsets first, but the physical world contains the sources needed for all approved trees.

## 6. Resource registry contract

Each manifest-backed resource record needs at least:

```text
id, displayName, family, variantOf,
sourceRefs[], naturalOrProduced, renewable,
allowedZ[], biomeTags[], depthBands[], hostMaterials[],
rarity, patchShape, minWorldCount, localCap,
gatherSkill, requiredLevel, action, toolTags[],
yieldTable[], processingRecipes[], byproducts[],
habitatRules, respawnRules, progressionTags[], worldRequired
```

Rules:

- `allowedZ` and `biomeTags` are both required for natural placement.
- Mineral `hostMaterials` prevent geologically impossible free-floating ore.
- `minWorldCount > 0` makes the generation audit responsible for availability.
- `worldRequired=false` is allowed only for optional procedural variants, quest/artifact outputs or future content and needs a reason.
- `renewable=true` requires a habitat, season/population rule and cap.
- `renewable=false` mineral nodes never reappear through V74 ecology.
- Extraction must produce physical items and alter or deplete the source.
- Placement calls the V68 guard and cannot overlap an impassable entity, a unit, an unsafe faction start or an incompatible liquid/shape.

## 7. Coverage solver and progression safety

Normal generation places resources by weighted geology and habitat. The coverage solver then audits the result:

1. count each required natural source and renewable founding population;
2. verify each occurrence matches `allowedZ`, biome, host material, cell shape and liquid rules;
3. verify at least one source is reachable in principle through the approved progression graph;
4. verify every produced resource has a satisfiable chain back to natural sources;
5. verify every faction's starting region satisfies V67 without consuming the world's only rare deposit;
6. place deterministic reserve patches for missing required resources in legal candidate cells, preferring undiscovered and distant locations for rare resources;
7. fail generation if no legal placement or production path exists.

The solver guarantees existence, not immediate access. A deep metal may require mining skill, pumps, heat-safe construction, combat or a long expedition. A resource is not considered reachable if it is behind an impossible aquifer, completely enclosed without a diggable face, or separated by magma when no pre-magma material can solve the route.

## 8. Renewal and depletion

- Stone, ore, gems, coal, salt beds, fossils and other geological deposits are finite.
- Trees, crops, wild plants, fungi, seaweed and reagent plants regrow or reproduce only in compatible habitat and below local caps.
- Fish, prey, livestock, monsters and source creatures reproduce or respawn under V74/V75 population, safety and habitat rules.
- Animal products replenish through living populations, not by respawning carcass items.
- A renewable source waits rather than overwriting an occupant or blocking construction.
- Overharvesting can locally exhaust a renewable population. Seed banks, migration, husbandry or habitat recovery can restore it.
- Hell and deep monster populations also obey caps; rarity is not implemented as an unbounded spawn lottery.

### 8.1 Five-level ecology director

The ecology director maintains a small persisted cursor over `(z, biomeRegion)` buckets. On each scheduled ecology step it advances through a bounded number of buckets rather than scanning all cells.

For a renewable resource bucket:

1. read the living/mature count and pending regrowth count;
2. compare it with the biome-specific minimum, target and hard cap;
3. if below target, schedule a bounded number of germination, growth, migration or reproduction attempts;
4. select seeded habitat candidates from the region index and reject occupied, visible-pop-in, protected or otherwise illegal cells;
5. persist successes, failures and the next eligible time.

For an enemy bucket, the same deficit model chooses only species allowed by z, biome, depth band, region character and danger tier. Entry may come from a map edge, vertical connector, natural den/habitat or undiscovered space as the species permits. It never appears inside a protected settlement, beside a player character, or on an impassable cell merely to satisfy a quota.

Finite geology participates only in initial distribution and depletion telemetry. It has no recovery bucket. If testing shows a finite resource is too scarce, its next generation version changes the initial density or guarantee; a live save does not grow replacement ore from nothing.

Telemetry per bucket records initial count, current count, births/regrowth, spawned enemies, failed attempts, harvests/kills, cap blocks and elapsed recovery time. Tuning reviews compare layers and biome regions so a large map cannot remain empty while one region is saturated.

## 9. Persistence and performance

- The five generated baselines, biome assignments, resource placements and checksums are deterministic from the versioned seed.
- Saves store version, seed, checksums, depleted-node state, sparse terrain mutations, entities and scheduled ecology events.
- Changing the manifest or generation version never silently reshuffles deposits in an existing save.
- Resource lookup uses per-level/per-region indexes. Gathering, ecology and AI never scan `327,680` cells per beat.
- Coverage auditing happens during New Game or explicit development validation, not during ordinary play.
- New Game time, save size, load time, memory, beat cost and level-switch latency must be measured in RMMZ against V50 before implementation is called working.

## 10. Implementation gates

This design does not authorize skipping the current slice or editing around active claims.

Phase-2 progress on 2026-09-19: `RESOURCE_MANIFEST.json` and `tools/check_resource_manifest.js` now encode and validate the five-level contract, 156 canonical resources, 11,538 dynamically audited local DF mappings (265 inorganic records, 225 plant records and 11,048 material roles inherited across 767 creature records), 116 explicit U7/OSRS reference roles and 11 provisional population profiles. Three non-spawning creature placeholders with no material definition are reasoned exclusions. The successful manifest check and deliberately failing mutations are development-tool evidence only. The manifest remains `design-input-not-live`; none of these rows are generated, replenished or playtested in RMMZ yet. `RESOURCE_MANIFEST.md` records the schema and the known coverage gaps.

1. Create the source-to-canonical coverage manifest and an unmapped-row checker.
2. Add the resource registry schema and original canonical entries; obtain approval for original fantasy tier names.
3. Implement all-five-level atomic generation and per-level checksums.
4. Implement the three biome mosaics and derived upper exposure zones.
5. Implement legal placement, coverage repair and reachability audits.
6. Connect gathering, depletion, production, skills, faction trees and ecology.
7. Add only the assets requested by accepted catalog entries, through `docs/ASSET_REQUESTS.md` and the art approval gate.

## 11. Acceptance checks

Every automated check must first be seen failing after its relevant invariant is deliberately broken.

| Check | Required observation |
|---|---|
| `resources.manifest_complete` | Every source row maps to exactly one canonical/variant/alias/produced/excluded result; an unmapped fixture fails |
| `resources.five_at_start` | All five 256x256 baselines and checksums exist before the first playable frame; a deferred level fails |
| `resources.biome_layers` | `z=0`, `z=-1` and `z=-2` use distinct biome tables and legal cell assignments |
| `resources.earth_biomes` | Every required upper-earth family occurs and has its terrain/water/resource rules |
| `resources.deep_biomes` | Deep mine, crystal, fungus, lake, chasm, salt, magma and Hell domains occur; a world missing one required family fails |
| `resources.family_coverage` | Every mandatory family in section 4 has at least one valid source or satisfiable production chain |
| `resources.variant_coverage` | Every `worldRequired` stone, gem, plant, animal and aquatic variant meets `minWorldCount` |
| `resources.legal_placement` | No deposit/population violates z, biome, host, shape, liquid, occupancy or start-safety constraints |
| `resources.progression_reachable` | Every required source is reachable in principle; an impossible enclosing barrier fails |
| `resources.processing_graph` | Every produced resource traces to available raw inputs without a missing or cyclic prerequisite |
| `resources.renewal` | Eligible populations recover below cap; a finite mineral never respawns |
| `resources.mapwide_rates` | A long seeded run services every eligible `(z, biomeRegion)` bucket, recovers depleted renewable populations toward target, respects local/global caps and produces no protected/visible/blocked spawn |
| `resources.distribution` | Common sources occur across compatible regions, rare-source counts match the manifest, and per-level/region histograms expose clumping or empty eligible regions |
| `resources.seed_repeat` | Same version/seed yields identical level, biome and resource checksums; another seed changes them |
| `resources.save_roundtrip` | Depletion, regrowth timers, populations and five-level placements survive save/load |
| `resources.budgets` | RMMZ playtest records all-level generation time, memory, save size and simulation costs against V50 |

## 12. Reference evidence and boundaries

The references establish categories and acquisition/production roles only.

- Local DF read-only raws inventory `265` inorganic materials (`21` soils, `25` layer stones, `58` minerals, `127` gems and `26` metals) and `225` plants. The summarized audit is in `DF_MECHANICS.md` section 1; the raw sources are under `data/vanilla/vanilla_materials/objects/` and `data/vanilla/vanilla_plants/objects/`.
- DF's soil, aquifer, stone-family, ore-host, gem, plant-use and creature-product tags justify the geological, plant and animal families above. UF does not import their records.
- The locally installed Ultima VII manuals describe mining/ore, timber/planks, grain/flour/bread, dairy, meat/fish, sheep/wool, thread/cloth, glass, wine, armor materials and reagent acquisition. The reagent mapping in section 4.3 condenses those roles into ordinary or original resources.
- Old School RuneScape reference coverage is organized around its gathering skills (Mining, Woodcutting, Fishing, Farming and Hunter), material-tier production and resource categories. The implementation manifest should use official Jagex material announcements where available and the OSRS Wiki only as an index for the complete variant list.
- Working web references used for this design: `https://oldschool.runescape.wiki/w/Woodcutting`, `https://oldschool.runescape.wiki/w/Farming`, `https://oldschool.runescape.wiki/w/Hunter`, `https://oldschool.runescape.com/polls/2017/1348`, `https://oldschool.runescape.com/polls/2023/1655`, and `https://oldschool.runescape.com/polls/2025/1708`.

No player-facing entry may use DF or Ultima signature terminology, RuneScape fantasy material names, or another game's copied description. Generic real-world material names remain acceptable.
