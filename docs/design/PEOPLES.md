# PEOPLES: the eleven peoples of the world (VISION V87)

Written 2026-09-19 by Claude Code (design) for the engineers who fill `game/data/UF_WorldCatalog.json` and build the mechanics, for Gemini (through `docs/handoffs/HANDOFF_peoples.md` and `docs/ASSET_REQUESTS.md`), and for the user, who approves every name and rule marked PROPOSAL.

**Decided by the user.** On 2026-09-19 at 13:42 the user said: "Factions I want to see implemented: Lizardfolk, Dwarves, Elves, Goblins, Gnomes, Humans, Orcs, Kobold, Undead, A "protoss" or tech race, A "Zerg" race" (VISION V87). The standing rules still apply: V4 and V31 (eight founders, four men and four women, around a lit campfire; nothing built, no years simulated), V7 (many races), V9 (original setting and names), V18 (relations from allied to hostile), V26 (children), V39 and V76 (a culture and an arsenal per faction), V44 (sizes against the 48 px square), V52 (ranks), V65 (Arthurian fantasy with relics of a fallen star-faring past), V67 (every area holds the resources to start), V80 (five levels), V84 (faction-wide building and tech), AGENTS rule 7 (no invented lore without approval).

**Not decided.** Every name for the two invented peoples, every new rule, number and variation in this file. Each is marked **PROPOSAL PEn** with the recommended option first; §12 lists them in order so the user can answer by number ("PE1 A, PE6 yes").

**Read with it.** `docs/design/THEME.md` (T1–T25, especially T1 A "misunderstood wonders", T2 A in-world words, T4 elves as the fey, T6 orcs as "Ogres", T7 the automata, T10 the banned-name check, T16 B wrecks); `docs/design/CRAFTING.md` (P1 the themed metal tiers, D14 wreck-metal salvage, §4 the relic bench); `docs/design/CHAIN_OF_COMMAND.md` §1.7 and §10 (rank names per culture: the naming run writes the sets; this file proposes none); `docs/design/VERTICAL_WORLD.md` §7.1 (movement profiles) and `docs/design/RESOURCE_ATLAS.md` §3 (biomes per level); `docs/design/CLASSES.md` (V88, being written by another run: classes differ by people).

**Written against** the working-tree catalog `game/data/UF_WorldCatalog.json` of 2026-09-19 11:55 (146 052 bytes): seven species in `factions.species` (human, elf, dwarf, goblin, orc, gnome, automaton), the matching `people` and `cultures` entries, 23 wildlife species (among them `restless_dead`, a monster of cursed regions). Nothing in `game/` was changed for this file.

**Reviewed** on 2026-09-19 (about 14:10–14:40) by a second Claude Code pass against the catalog of 13:58 (146 065 bytes; `people`, `cultures` and `factions` unchanged since 11:55) and the code. The review fixed this file in place, and §14 lists every change. It also merged in the naming run's options: that run wrote its proposals while this file did not yet exist.

## 0. In short

| People | id | Size (final art) | Moves | Born | Needs | Home (level) | Start |
|---|---|---|---|---|---|---|---|
| Humans | `human` | 44–48 px, 48 frame | walk | live | all five | grassland, broadleaf (0) | V4 campfire |
| Elves | `elf` | 44–48 px, 48 frame | walk, climb trees | live, rarely | all five, nature strong | forests (0; tree branches +1) | V4 campfire |
| Dwarves | `dwarf` | 34–40 px, 48 frame | walk | live | all five | mountain, rock desert (0, favour −1) | V4 campfire, then dig down |
| Gnomes | `gnome` | 34–40 px, 48 frame | walk | live | all five | conifer, hills (0) | V4 campfire |
| Goblins | `goblin` | 34–40 px, 48 frame | walk, climb | live, often, twins | all five, eats anything | swamp, badland (0) | V4 campfire |
| Orcs | `orc` | 44–48 px, 48 frame (52–58 px in a 96 frame only with THEME T6 A, PE9) | walk | live | all five, hungry | tropical savanna, badland (0) | V4 campfire |
| Lizardfolk | `lizardfolk` | **54–60 px, 96 frame** | walk, **swim** | **eggs, a clutch** | warmth; eats rarely | marsh and swamp (0) | V4 campfire |
| Kobolds | `kobold` | **26–32 px, 48 frame** | walk, climb, **burrow** | **eggs, a clutch** | all five; sleeps by day | hills, rock (0, favour −1) | V4 campfire, then dig down |
| Undead | `undead` | the body they were | walk, **under water** | **none: raised from remains** | **none** (no food, drink, sleep) | cursed land (PE13; 0, crypts −1) | V4 campfire |
| Star-born (working words) | `starborn` | 46–48 px, slender, 48 frame | walk | live, very rarely; **constructs are made** | **light** instead of food | open, dry land (0) | V4 campfire |
| Swarm (working words) | `swarm` | **castes 20 px to 80 px** | walk; castes **swim, burrow, fly** | **the breeder lays eggs in the mound** | **biomass** (anything organic) | warm, lush land; spreads anywhere | V4 campfire (**PE6**, a change to V4, would make it the breeder and seven workers around a mound seed) |

The automaton people (`automaton`) stops being rolled as a faction of its own and becomes the star-born's constructs (§4). Its id, sheets and culture stay for old saves.

---

## 1. Rules that bind all eleven

### 1.1 The concept, never the source
The user's words "protoss" and "Zerg" name a **concept** only (V87, V9). The two peoples below are built from the concept and from public nature and folklore, never from StarCraft:

| Concept the user named | What we build from | Never (names, terms, looks, mechanics) |
|---|---|---|
| An ancient tech race of crystal, light and mind | THEME pillar 4 (the fallen stars), the glass fortress of *Preiddeu Annwfn* (THEME §1.3), real crystal and light | Protoss, Terran, Zerg, Xel'Naga, Aiur, Khala, Nexus, Pylon (or any crystal that "powers" nearby buildings), warp-in or warp gates, probes, zealots, templar, archons, carriers, psi blades or any blade of light from the wrist, regenerating shields, nerve-cord head tendrils, mouthless faces, **gold armour with blue-cyan glow** (their colour scheme), floating or flying craft (THEME §2.11: nothing flies); also their other unit and building names used as our words: Stalker, Dragoon, Reaver, Observer, Immortal, Colossus, Sentry, Oracle, Arbiter, Mothership, Gateway, Stargate, Forge, Photon Cannon, **Fleet Beacon** (a Protoss building, checked 2026-09-19), Assimilator; **robot warriors in their makers' own shape** (SC2's Purifiers are robots the Protoss built in the Protoss form, checked 2026-09-19); **straight glowing channels of blue or cyan light on smooth pale panels** (the look of the Purifiers and of Halo's Forerunner works) |
| A bio-organic swarm that breeds, adapts and spreads | Real social insects: the termite mound and its egg-laying breeder, worker and soldier castes, the swarming of bees (an old colony splits and a new breeder founds a new nest), the replacement breeders termites raise when theirs dies | Zerg, the Swarm (as a name), Overmind, Overlord, Queen, Broodmother, Brood Lord, broodling, larva/larvae from a hatchery, Hatchery, Lair and Hive as named buildings, drones, zerglings, hydralisks, mutalisks, ultralisks, spawning pool, nydus worm, **creep** or any ground carpet that buildings require, burrowing in place to hide, eating other species to take their "essence" (**so the swarm never gains a caste or a trait from what it eats**, PE14), **purple-brown carapace with glowing red or orange eyes** (their colour scheme); also their other unit and building names used as our words: **Devourer** (a Brood War Zerg air unit, checked 2026-09-19), Guardian (also on AGENTS' list), Scourge, Defiler, Lurker, Baneling, Roach, Infestor, Viper, Swarm Host, Corruptor, **Spire** and Greater Spire, **Hydralisk Den, Queen's Nest, Infestation Pit** (Zerg buildings, checked 2026-09-19), Evolution Chamber, Extractor, Spine and Spore Crawler; **a fleshy, veined, pulsing living building** (the Zerg look of their structures): the mound is built earth |

Other works kept at arm's length (from memory, not checked against the works in this session):
- **Lizardfolk:** no Argonians or Hist trees (The Elder Scrolls), no spawning pools, Slann, Saurus, Skinks or Kroxigor (Warhammer's Lizardmen). "Lizardfolk" itself is generic fantasy and is also in the D&D SRD 5.1 (CC-BY-4.0), so the word is safe.
- **Kobolds:** no named kobold gods (D&D's Kurtulmak is product identity), no DF kobold thieves copied as-is, no Dota 2 "Meepo". The kobold of German mine folklore (the spirit that miners blamed for the ore they named cobalt) is public domain and is where ours come from.
- **Undead:** no DF necromancer towers, "secrets of life and death", "thralls" or "husks"; no Tolkien barrow-wights. The raised dead are called **the risen** (a plain word, PE13).
- **The swarm:** no Tyranids (hive fleets, synapse creatures, gaunts, genestealers, Norn-Queen; no bone-white plates over purple or red flesh), no Xenomorph life cycle (face-huggers, chest-bursters) and no crested queen with a hanging egg sac (Aliens), no Dragon Age darkspawn "Blight" and broodmothers, no "Skitters" (Falling Skies' six-legged insect-like aliens, checked 2026-09-19; the caste that was called "skitter" here is now the **darter**).
- **The star-born:** no Halo Forerunners or "Precursors", no Mass Effect Protheans, no Elder Scrolls Dwemer, no "Starborn" (Starfield). "Star-born" is a working word of this file only and never reaches player text (the naming run found the Starfield collision too).
- **Undead:** also no Warcraft III Scourge building words ("Crypt", "Necropolis", "Ziggurat"; from memory) as group words.

PROPOSAL **PE21** adds these works' **coined** words (Protoss, Zerg, Zergling, Hydralisk, Mutalisk, Ultralisk, Overmind, Xel'Naga, Aiur, Khala, Pylon, Nydus, Argonian, Hist, Slann, Kroxigor, Tyranid, Genestealer, Xenomorph, Forerunner, Prothean, Dwemer, Starborn, Hivekin, Kurtulmak, Meepo) to the banned-name check that THEME T10 proposes, so no player text or generated name can ever contain them. The **ordinary English words** in the lists above (queen, drone, hive, nest, den, pit, pool, spire, beacon, forge, gateway, carrier, templar, zealot, archon, stalker, devourer, larva, brood, creep, swarm, overlord, blight, thrall, husk) are banned only for the swarm's and the star-born's own names, group words, castes, buildings and items. They are never banned globally: "Queen" is the female head in several rank-name sets (`rank_names.proposal.json` lines 14, 27, 55, 81, 122) and in THEME's tables, and "Forge" is an ordinary word elsewhere. ("Guardian" is already banned everywhere by AGENTS' list.)

### 1.2 Words the player reads
THEME T2 A (recommended there, not yet approved): player text uses in-world words only. For the peoples this means: *light, crystal, construct, automaton, the old works, the fallen stars, the mound, eggs, the risen*. Never *alien, technology, energy, power, psionic, robot, program*. This file uses design words ("tech race", "psionic", "biomass") only where it talks to engineers; every such word is marked *(design word)* where it could leak.

### 1.3 Ids and names
- The ids of the five new peoples are `lizardfolk`, `kobold`, `undead`, `starborn`, `swarm`. They follow V87's own words, never reach player text, and never change once saves hold them.
- Every display name of an invented people is a PROPOSAL. Until the user approves one, the catalog carries it with the `TEST_` prefix (AGENTS rule 7): the data run writes `TEST_Glassfolk` and `TEST_Teemers` (the recommended options of PE1 and PE2). "Lizardfolk", "Kobolds" and "Undead" are the user's own generic words and go in as they are.
- The founding line of the chronicle reads the species' display name in lower case ("Eight lizardfolk of The Caerwyn Fen settled by Pendoc."); `history.no_years` requires that shape, so display names must be plural nouns. That is why the swarm needs a noun ("Teemers"), not "the Teeming".
- Rank names per culture belong to the naming run (CHAIN_OF_COMMAND §10). Until it adds sets for the five new cultures they use its `default` set.

### 1.4 What every people shares
Everything the simulation already does for every faction stays the same for all eleven unless §3 says otherwise: the V4/V31 start, the V52 tree of ranks, V63/V84 skills and the faction Building level, V77 tech tree (UF_Tech, keyed by culture id), V51 society plan, V56/V57 floors and doors, V64 combat, V68 spawn guard, V71 ownership. A people differs through data first (`people`, `cultures`, `factions.species`) and through the later mechanics in §7 only where data cannot express it.

---

## 2. What a people is in data

### 2.1 Today (read by the engine now)
| Key | Read by | What it sets |
|---|---|---|
| `factions.species[]` (`id`, `name`, `weight`, `playable`, `groups`) | UF_Factions | whether and how often the people founds a faction, its plural name, its faction-name group words, whether the player can be given it |
| `factions.speciesAffinity["a|b"]` | UF_Factions | the relation term between two peoples (§5) |
| `factions.areas.cursedOk` | UF_Factions | peoples allowed to settle cursed regions (none today) |
| `sites.preferredBiomes[id]` | UF_Factions | biomes tried first when placing a non-player area |
| `people[id]` (`images`, `tint`, `stats`, `names`) | UF_History, UF_Colonists | founder sheets (round-robin), a multiplicative tint, d20-era stat shifts still used by `rollStats`. `names` (start, male, female syllables) is **read now**, but only for the other factions' founders (UF_History `nameTable`, lines 394–401); UF_Colonists renames the player's founders and every newborn from the shared `start.names` (`nameFor`, lines 160–168) |
| `cultures[id]` (`wall`, `laterWall`, `door`, `floor`, `priorities`, `facetBias`, `plan`, `chainWeights`, `arms`) | UF_Colonists, UF_Doors, UF_Floors, UF_Skills | build pieces, work weights, personality, plan variant (`default`, `forest`, `stone`, `workshop`), labour weights, preferred arms (no plugin reads `arms` yet). **UF_Colonists reads only the player's faction's culture** (`cultureOf`, lines 147–151); UF_Skills reads every unit's culture for its starting trades (`cultureFactor`, lines 281–295) |
| `skills.start.favoured[id]` | UF_Skills | **fighting skills only** (attack, strength, defence, ranged, magic, hitpoints) are rolled twice at birth and the higher kept (lines 322–327). A trade skill such as `mining` or `crafting` listed there does nothing; a people's trades lean through its culture's `priorities` and `chainWeights` instead |
| `sites.bySpecies[id]` | UF_History's older generator only | site kinds by size (switched off with V31) |
| `sheet.faces[id]` | UF_Sheet | stock portraits per species and gender; a missing species gets a code-drawn silhouette (UF_Sheet lines 329–335), so new peoples work without it |

**Only the player's faction lives today.** Every other faction's founders are `kind: "person"` units with `ai: "wander"` (UF_History line 1369): they walk around their campfire and do not eat, mate, build or use their culture (UF_Wildlife's wander AI moves them; that file is another session's and may add rest cycles). UF_Colonists turns only the player's founders into colonists who do all of that. The "Paths and DF life" run (STATUS claim, new `UF_Society.js`) is giving every faction daily life. §7 and §10 say what that means for the peoples that live differently.

### 2.2 Proposed: what the mechanics waves add to `people[id]`
One block per people, read by a new plugin (§10: `UF_Peoples.js`, Claude Code's) through aliases on UF_Colonists, UF_History, UF_Jobs and UF_Levels, so no claimed file is edited for it. Missing keys mean "as humans", so a save or a people without the block behaves as today.

```json
"life":   { "lifespan": [60, 80], "stages": { "baby": 2, "child": 12, "teen": 18, "elder": 60 },
            "birth": "live", "gestation": 1.0, "fertility": 1.0, "twins": 0.02,
            "clutch": null, "incubation": null, "nest": null },
"needs":  { "hunger": 1, "thirst": 1, "sleep": 1, "social": 1, "nature": 1, "warmth": 0, "light": 0, "eats": "food" },
"senses": { "sight": 8, "night": 0.5, "active": "day" },
"move":   ["walk"],
"size":   { "px": [44, 48], "frame": 48 }
```
- `stages` are the first age (in years) of the next stage: baby until 2, child until 12, teen until 18, adult until 60, elder after. `lifespan` is the seeded range of death by old age.
- `gestation`, `incubation` are multiples of the human gestation (3 game days in UF_Colonists today, a placeholder while VISION Q11, the life timescale, is open). `fertility` multiplies the conception chance (0.5 per mating in UF_Colonists today).
- `birth`: `live`, `eggs` (a clutch in a nest object, §3.7), `mound` (the swarm, §3.11) or `none` (the undead, §3.9).
- `needs` multiply the rates in `colony.needs` (hunger 0.18, thirst 0.24, sleep 0.10, social 0.15, nature 0.12 per game minute); `warmth` and `light` are new needs (0 = the people doesn't have it); `eats` is what fills hunger (`food`, `biomass`, `none`).
- `senses.sight` is the look radius in cells (colonists carry `sight: 8` today); `night` is the share of it kept at night and below ground (1.0 = sees in the dark); `active` is `day`, `night` or `shifts` (sets the sleep window that is `colony.sleepHours` [22, 6] for everyone today).
- `move` lists movement profiles. `walk`, `swim`, `climb` and `fly` are VERTICAL_WORLD §7.1's walkers, swimmers, climbers and fliers. `burrow` (kobolds and borers dig soil as they go, §3.8) and `wade_bottom` (the undead, §3.9) are new here and need adding to that contract.

---

## 3. The peoples

Each section gives the body, movement, senses, life, reproduction, needs, home, culture, relations, unique mechanics and placeholder. Culture blocks are in the catalog's own shape and use only ids that exist on 2026-09-19: walls `wall_wood`, `wall_stone`, `rubble_pillar`; doors `door_wood`, `door_stone`; floors `floor_wood` (log), `floor_stone` (stone), `floor_rushes` (straw); plans `default`, `forest`, `stone`, `workshop`; arms from `items.types`.

### 3.1 Humans (`human`), unchanged in data
- **Theme:** the knightly kingdoms (THEME T3). **Body:** 44–48 px, the person reference of ART_STANDARD §2.
- **Moves:** walk. **Senses:** sight 8, night 0.5, active by day.
- **Life:** 60–80 years; baby to 2, child to 12, teen to 18, elder from 60. Live birth, gestation 1.0, fertility 1.0, twins 2%.
- **Needs:** the five at 1.0. **Home:** `grassland_temperate`, `forest_temperate_broadleaf`, `savanna_temperate`, `shrubland_temperate` (the catalog's `preferredBiomes`), level 0.
- **Unique:** none on purpose. Humans are the baseline every other people is measured against; their strength is that no biome or level penalises them.
- **Culture, stats, arms, placeholders:** unchanged (`Settlers`; People4_6, People4_5, People3_5, People2_1; founders wear the tier-0 clothing sheets).

### 3.2 Elves (`elf`), unchanged in data
- **Theme:** the fey court under THEME T4 A (pending). **Body:** 44–48 px, slender.
- **Moves:** walk; **climb** trees to the trunk and heavy branches on level +1 (VERTICAL_WORLD §4.3: a mature tree's trunk and heavy branches are on +1; its crown, light branches and canopy are on +2). **Senses:** sight 10, night 0.7, day.
- **Life:** 300–400 years; baby to 2, child to 16, teen to 30, elder from 250. Live birth, gestation 1.5, fertility 0.3 (few children, each precious).
- **Needs:** hunger 0.9, thirst 1, sleep 0.8, social 1, **nature 1.5**.
- **Home:** the catalog's four (temperate broadleaf, tropical moist broadleaf, temperate conifer, taiga), level 0 and the branches on +1.
- **Unique:** branch paths (wave 1, after UF_Levels); long life and slow births (wave 1). The senses, needs and climbing are this file's proposals (PE23). If the user picks THEME T4 A with the cold-iron motif, `cultures.elf.arms` loses `dagger_iron` (PE22).

### 3.3 Dwarves (`dwarf`), unchanged in data
- **Body:** 34–40 px, broad. **Moves:** walk. **Senses:** sight 7, **night 1.0** (they see below ground), day.
- **Life:** 150–180 years; baby to 2, child to 14, teen to 25, elder from 120. Live birth, gestation 1.2, fertility 0.6.
- **Needs:** hunger 1.1, thirst 1.2, sleep 0.9, social 1, nature 0.5.
- **Home:** `mountain`, `desert_rock`, `taiga` on level 0; they **favour level −1** (V80 gives the levels; the preference and the dig-down step are PE23). They start at the V4 campfire on the ground at the foot of the hills (the V67 kit is only guaranteed on level 0), and their plan's first stage after shelter digs a stair down and moves the hearth into a dug room on −1 (wave 1, after UF_Levels; §7).
- **Unique:** the dig-down plan step; the smithing chain weights they already have.

### 3.4 Gnomes (`gnome`), unchanged in data
- **Theme:** hoard-keepers of the hills under THEME T5 A (pending). **Body:** 34–40 px. **Moves:** walk. **Senses:** sight 7, night 1.0, day and dusk.
- **Life:** 200–250 years; baby to 2, child to 16, teen to 30, elder from 170. Live birth, gestation 1.2, fertility 0.5.
- **Needs:** hunger 0.8, thirst 0.9, sleep 1, social 1.2, nature 0.8.
- **Home:** `forest_temperate_conifer`, `mountain`, `shrubland_temperate`, level 0; burrow homes on −1 later (PE23).
- **Unique:** relic gathering from wrecks once THEME T16 B lands (later); this puts them at odds with the star-born (§5).

### 3.5 Goblins (`goblin`), unchanged in data
- **Body:** 34–40 px, wiry. **Moves:** walk, **climb** (walls and trees: they get over a palisade, so a wall alone does not keep them out; V57's doors keep out "strangers", and this weakens that for goblins, so it needs the user's yes, PE23). **Senses:** sight 7, night 1.0, **active by night** (PE23).
- **Life:** 35–50 years; baby to 1, child to 6, teen to 10, elder from 30. Live birth, gestation 0.6, fertility 1.6, twins 25%: the fastest-growing of the peoples that give birth.
- **Needs:** hunger 1.2, thirst 1, sleep 1, social 1.1, nature 0.6; they eat spoiled food without a bad thought (once food spoils in the game).
- **Home:** the four biomes in the catalog (swamp, badland, shrubland, salt marsh), level 0.
- **Unique:** fast breeding and night habits (wave 1); full scavenging of arms (`arms.scavenge` 1, data already).

### 3.6 Orcs (`orc`): one art change
- **Theme:** the giant-blooded clans (THEME T6 A would show them as "Ogres"; the id stays `orc`).
- **Body:** 44–48 px as ART_STANDARD §2 says today, **unless** the user chooses THEME T6 A (the giant-blooded clans shown as "Ogres"). Then they become **52–58 px tall and broad, in a 96 × 96 frame** (PE9 B). No user message asks for bigger orcs: V87 only names them, and the only reason to grow them is T6's giant blood, which is still pending. With the frame change, orc sheets are 96 × 96 on the AR-600 grid and need their own gear layers. The stock placeholders stay 48 px until art arrives.
- **Moves:** walk. **Senses:** sight 7, night 0.8, day.
- **Life:** 45–60 years; baby to 1, child to 8, teen to 14, elder from 40. Live birth, gestation 0.8, fertility 1.3.
- **Needs:** **hunger 1.4**, thirst 1.1, sleep 1, social 1, nature 0.8.
- **Home:** the catalog's four (tropical savanna and shrubland, rock desert, badland), level 0.
- **Unique:** size and appetite (wave 1 for the appetite, wave 3 for the art).

### 3.7 Lizardfolk (`lizardfolk`), new
- **Theme:** fen-folk of the old wild (THEME pillar 3): marsh and mere, reed halls on stilts, patient hunters of fish and fowl. Generic fantasy; no named lore.
- **Body:** a tall, long-tailed, scaled biped with a blunt snout; **54–60 px tall, the tail reaching the ground behind, in a 96 × 96 frame**, footprint one cell (it overhangs the cell above, as ART_STANDARD F4 allows). Hatchlings 18–24 px, young 30–40 px (48 frame).
- **Moves:** walk; **swim** through fresh, pond, marsh and swamp water (not the open sea), at walking speed, carrying no more than they hold in hand. No other people swims today (water blocks every unit).
- **Senses:** sight 7, night 0.5, **active by day**. **Cold-blooded:** they wake slow; see Needs.
- **Life:** 60–90 years; hatchling to 1, child to 8, teen to 14, elder from 60.
- **Reproduction: eggs, a clutch.** After mating, a female lays a clutch of **2–5 eggs** in a **nest** (a new object: a mound of warm mud and rushes, built on land within 3 cells of water; the plan builds one when a female is ready). Incubation 1.0 (as long as a human gestation). An egg is a physical object (V21, V25): it can be carried, stolen, eaten or broken. **PROPOSAL PE17:** the nest's warmth decides each hatchling's sex, as it does in real crocodiles: a nest in the sun (no roof, no tree on the cell) hatches mostly males, a shaded or roofed nest mostly females (70/30 either way). A nest left with nobody within 6 cells for a day loses one egg (chilled). The band guards its nests: an adult of the band stands nest duty the way a soldier stands guard (V43).
- **Needs:** hunger 0.5 (big meals, seldom), thirst 0.8, sleep 1, social 0.7, nature 1.2, and a new **warmth** need (1.0): it rises at night and in cold biomes and is filled by standing on a sunlit cell by day ("basking") or next to a fire. Above its threshold a lizardfolk works at 0.6 speed and moves one cell per two beats. In tundra, taiga and glacier they are always cold.
- **Home:** `swamp_tropical_fresh`, `marsh_tropical_fresh`, `swamp_mangrove`, `swamp_temperate_fresh`, `marsh_temperate_fresh`, level 0, with drinkable water close (`start.kit.water`: UF_Factions places every area with drinkable water within 30 cells when the map has such a place; it prefers this, it does not guarantee it).
- **Start:** V4 as written: eight founders, four men and four women, around a lit campfire (the fire is their first warmth).
- **Culture (data, wave 0):**
```json
"lizardfolk": {
  "name": "Fen-dwellers",
  "wall": "wall_wood", "laterWall": "wall_wood", "door": "door_wood",
  "floor": { "kind": "floor_rushes", "item": "straw", "count": 2 },
  "priorities": { "hunt": 1.5, "gather": 1.2, "build": 0.9, "chop": 0.9, "craft": 0.9, "quarry": 0.5, "mine": 0.4 },
  "facetBias": { "patience": 20, "natureAffinity": 15, "bravery": 10, "sociability": -5 },
  "plan": "forest",
  "chainWeights": { "tanner": 1.3, "leatherworker": 1.3, "weaponsmith": 0.7, "fletcher": 0.6, "bowyer": 0.5, "furnace_operator": 0.5, "armorsmith": 0.5 },
  "arms": { "prefer": ["spear", "club", "shield_wood", "sling"], "scavenge": 0.3 }
}
```
  `stats`: con +2, str +1, int −1, cha −1. `skills.start.favoured`: defence, hitpoints (recommended; `skills` is outside this run's keys). A fishing priority joins when a fish job exists (CRAFTING §3.7; UF_Jobs has none on 2026-09-19).
- **Relations:** wary of the dry-land peoples, rivals of goblins in the swamps, bitter with kobolds (both lay eggs, and each is the other's egg-thief in the stories the simulation can make), hostile to the undead and the swarm (§5).
- **Unique mechanics:** swim (wave 1), warmth and basking (wave 1), eggs, nests and nest warmth (wave 1). All code; none is data-only.
- **Placeholder:** `$UF_Stock_Monster_2`, tint `#a8d888` (§9).

### 3.8 Kobolds (`kobold`), new
- **Theme:** the little miners of the hills. The name and the mining come from German folklore (public domain): the kobold haunted the mines, and the miners named cobalt after it. The small, scaled, egg-laying body is **not** from folklore; it is the generic fantasy kobold found in many games and in the D&D SRD 5.1 (CC-BY-4.0; we use no SRD text). Small, many, quick, easily frightened, clever with snares.
- **Body:** a small scaled biped with a short tail and a doggish snout; **26–32 px tall** in a 48 × 48 frame (between a child and a dwarf). Hatchlings 12–16 px.
- **Moves:** walk; **climb**; **burrow**: they dig through soil, clay, sand and loam (never stone) at twice the digging speed of others and walk the one-cell tunnel they leave (VERTICAL_WORLD's digging on −1). A burrow is a real tunnel that stays (no hiding in place, §1.1).
- **Senses:** sight 6, night 1.0, **active by night** (they sleep 08:00–16:00).
- **Life:** 20–30 years; hatchling to 1, child to 3, teen to 5, elder from 20. The shortest-lived of the peoples that grow old.
- **Reproduction: eggs, a clutch.** A clutch of **3–6 eggs** in a nest of rushes that must lie **within 2 cells of a heat source** (a lit campfire, a furnace, later magma-warm rock on −2). Incubation 0.7. Eggs away from heat chill: each day without heat, a seeded 1 in 3 is lost. So kobold camps crowd their hearths, and a band that loses its fire loses its young.
- **Needs:** hunger 1.1, thirst 1, sleep 1, **social 1.3** (they live packed together), nature 0.4.
- **Home:** `mountain`, `desert_rock`, `shrubland_temperate`, `taiga` on level 0; they **favour level −1** (V80), where the RESOURCE_ATLAS §3.2 earth biomes they like are clay bed, chalk and karst, and shallow cave. Start and descent as the dwarves (§3.3).
- **Start:** V4 as written.
- **Culture (data, wave 0):**
```json
"kobold": {
  "name": "Tunnellers",
  "wall": "rubble_pillar", "laterWall": "wall_stone", "door": "door_wood",
  "floor": { "kind": "floor_rushes", "item": "straw", "count": 2 },
  "priorities": { "mine": 1.6, "quarry": 1.3, "craft": 1.2, "pick": 1.2, "build": 1.0, "hunt": 0.7, "chop": 0.7 },
  "facetBias": { "industriousness": 15, "curiosity": 10, "sociability": 10, "tidiness": -10, "bravery": -20 },
  "plan": "stone",
  "chainWeights": { "furnace_operator": 1.2, "fletcher": 1.1, "weaponsmith": 0.9, "bowyer": 0.8, "armorsmith": 0.6 },
  "arms": { "prefer": ["sling", "spear", "dagger_iron", "helmet_leather"], "scavenge": 0.6 }
}
```
  `stats`: dex +2, int +1, str −2, con −1. `skills.start.favoured`: ranged (recommended; `mining` there would do nothing, §2.1: their mining comes from `priorities.mine` 1.6, which UF_Skills squares with `cultureExponent` 2 for the starting trades). The label is spelt "Tunnellers", in the project's British spelling.
- **Relations:** rivals of dwarves and gnomes under the hills (the folklore of kobolds vexing miners), easy with goblins and orcs, bad with lizardfolk, hostile to the undead and the swarm.
- **Unique mechanics:** burrow (wave 1, after UF_Levels), eggs by a heat source (wave 1), night habits (wave 1), **ore-sense** (PE18: the look shows ore outcrops through rock within 4 cells of a kobold on −1 and −2; wave 2), snares when traps exist (later).
- **Placeholder:** `$UF_Stock_Nature_4` and `$UF_Stock_Actor3_4`, tint `#d09060` (§9).

### 3.9 Undead (`undead`), new
- **Theme:** the dead of the waste land (THEME T13 would call the cursed regions "Waste"). They hold together in bands, dig crypts, keep oaths no living man remembers, and grow by raising the dead.
- **Body: the body they were.** A risen human stays 44–48 px, a risen dwarf 34–40 px, a risen orc the orc's size (§3.6); the founders are risen humans (44–48 px, 48 frame). Bodies **decay** in three stages: *fresh* (as in life, grey-skinned), *rotting* (after 30 days) and *bone* (after 120 days, a skeleton 2 px thinner). The catalog's `restless_dead` monster (46 px) is the wild, unbound kind of the same thing.
- **Moves:** walk, and **walk under water** (PE19): they don't breathe, so water cells are passable for them at one step per three beats, and they come out on the far bank. A river is no wall to the dead.
- **Senses:** sight 7, night 1.0, **active by night**. **PROPOSAL (part of PE13, optional):** in daylight on an open cell their attack and defence levels count 10% lower.
- **Life:** **no aging, no old age.** A risen keeps the age it died at; the look label reads "risen 12 days ago". They end only by destruction.
- **Reproduction: none. They raise the dead from remains** (ties to the remains-and-bones build, UF_Remains):
  - A **raiser** (a member with the magic skill at level 10 or more; the V88 class that opens this belongs to CLASSES.md) takes a **raise** job on a corpse or a bone pile.
  - A **corpse** (UF_Remains keeps it until it rots away) rises *fresh*: the body, species, sex and size of the dead, **half its combat levels, none of its trade skills**, a new name only if the dead had none. A corpse of the band's own dead rises too: the undead lose nobody for good while the body lies near.
  - **Bones** (a person's bones as UF_Remains records them, REMAINS §3.9) rise as a *bone* risen of the kind they came from: combat levels at a quarter, and the `restless_dead` resistances (stab and ranged high, crush low). A map-made `bones_pile` object records no kind; it rises as a bone risen human.
  - Each raiser binds at most **1 + floor(magic level / 10)** risen. A risen whose raiser dies stands idle until another raiser with a free bond takes it; one nobody takes within 3 days collapses into bones.
  - No founder can start as a raiser: UF_Skills' adult roll for magic is 1–3, and favouring magic only rolls it twice. So the band's first task is to train a raiser. That keeps the undead from snowballing on day one. How magic is trained belongs to CLASSES.md and ABILITIES.md (V88); until one of them gives a way, the undead cannot raise anyone.
- **Needs: none of the five.** No food, no drink, no sleep, no social, no nature. They don't **heal** by rest either: a damaged risen **mends** at a crypt (a room of theirs with a door) by using bone items (1 bone per 3 hitpoints). So bone is the undead's food: they hunt and butcher for bones and raid graves and battlefields for remains.
- **Home:** **cursed land** (`regions.alignment` cursed) of any biome, level 0; their crypts go down to −1. V87 does not tie the undead to cursed land: this is this file's proposal (PE13), drawn from the catalog's existing cursed regions and their `restless_dead`. Data can **allow** cursed land now (`factions.areas.cursedOk: ["undead"]`) but cannot **prefer** it: `preferredBiomes` are biomes, and cursed is a region character, so the undead's area lands on cursed ground only by chance until UF_Factions reads a preferred alignment (wave 1, a small change, §7). Fallback biomes: `desert_badland`, `swamp_temperate_fresh`, `tundra`, `shrubland_temperate`. Later (wave 2, needs a per-cell region override that THEME T18 also needs) the land around an undead camp turns cursed a little each season (PE13: a new world rule the user decides).
- **Start:** V4 as written: eight risen, four men and four women, around a lit campfire. They see in the dark and need no warmth, so the fire is simply V4's hearth: it marks the camp and boils bones clean. PE6 keeps this.
- **Culture (data, wave 0):**
```json
"undead": {
  "name": "The Unquiet",
  "wall": "wall_stone", "laterWall": "wall_stone", "door": "door_stone",
  "floor": { "kind": "floor_stone", "item": "stone", "count": 1 },
  "priorities": { "mine": 1.4, "quarry": 1.4, "build": 1.3, "craft": 1.0, "chop": 0.8, "hunt": 0.3, "pick": 0.3, "gather": 0.2 },
  "facetBias": { "discipline": 25, "patience": 25, "sociability": -25, "natureAffinity": -25, "cheerfulness": -30 },
  "plan": "stone",
  "chainWeights": { "armorsmith": 1.3, "weaponsmith": 1.3, "furnace_operator": 1.1, "fletcher": 0.8, "bowyer": 0.8, "tanner": 0.2, "leatherworker": 0.2 },
  "arms": { "prefer": ["sword_long", "spear", "shield_iron", "helmet_iron", "mail_iron"], "scavenge": 0.8 }
}
```
  `stats`: con +2, wis +1, dex −1, cha −3. `skills.start.favoured`: defence, magic (recommended). Names: the founders were people and use the shared `start.names`; the risen keep the names they had.
- **Relations:** hostile to every living people (§5); they ignore the wild `restless_dead` and those ignore them (wave 2; UF_Wildlife is another session's file, so this goes in as an alias from UF_Peoples or as a request to its owner).
- **Unique mechanics:** no needs (wave 1), raise from remains, bonds, bone mending and decay (wave 2, after UF_Remains), under-water walking (wave 1, after UF_Levels' movement profiles), preferred cursed land (wave 1), spreading blight (wave 2), daylight weakness (wave 2, optional).
- **Placeholder:** `$UF_Stock_Evil_7` and `$UF_Stock_Monster_3`, tint `#c8d0c0` (§9).

### 3.10 The star-born (`starborn`, working words), new; and their constructs
- **Theme (PROPOSAL PE4, lore):** **A (recommended):** the last of the star-faring people whose age fell (THEME pillar 4). Few, very old, quiet; they keep the knowledge of crystal and light and the silent machines that still follow their orders. Under THEME T1 A the common folk see them through the romances (the people of the glass tower), and player text never explains where they came from unless the user approves a backstory. **B:** a people the star-farers made, never star-farers themselves.
- **Display name (PROPOSAL PE1):** **A (recommended): "Glassfolk"**, after the glass fortress of *Preiddeu Annwfn* that THEME §1.3 ties to the wrecks (a web search on 2026-09-19 found no game race of that name). **B: "Sky-wrights"**, the naming run's pick: the makers of the ships that fell, named the way medieval folk named makers (shipwright, wheelwright). Its script and web checks found no clash, but the name says they built the old works, which is lore (PE4 A). **C: "Lightkin"** (no game race found). **D:** the user names them. Rejected: "Starfallen" (a race of that name exists in a published homebrew supplement on GM Binder, found 2026-09-19) and "Starborn" (Starfield's, from memory). The catalog carries `TEST_Glassfolk` until the user decides.
- **Body:** tall-seeming and slender, long-limbed, a smaller head than a human's, skin like pale polished stone with faint seams of light; **46–48 px** in a 48 × 48 frame. Their gear is smooth manufactured shapes among hand-made things (THEME §2.11). **Colours (for the art):** ivory, slate grey and clear-to-smoky quartz, with THEME's pale relic light (`#E7E7FF`, `#CECEFF` on the project palette) only in thin seams. **Never gold armour with blue-cyan glow, never glowing eyes or blades** (§1.1). The light is near-white, never saturated blue or cyan, and it follows the natural fracture lines of stone and crystal. It never runs in straight glowing channels over smooth pale panels, which is the look of SC2's Purifiers and Halo's Forerunner works (§1.1). The skin reads as matte stone, not as plating.
- **Moves:** walk. They don't fly and don't float.
- **Senses:** sight 9, night 0.6, active by day. **Faint self-light:** each one lights its own cell and the eight around it at night (a light source of radius 1, once light is simulated; VERTICAL_WORLD §6.3). **Shared sight (the concept's "mind", PE16):** a star-born sees what any other star-born of its band within 24 cells sees, and a commander's order reaches its members at once instead of being walked over and spoken (CHAIN_OF_COMMAND §5.1); their spoken lines still float over their heads (V62), because the player needs to read them.
- **Life:** 700–1000 years; baby to 3, child to 30, teen to 60, elder from 600. Live birth, **gestation 3.0, fertility 0.1**: a star-born band grows by its constructs, not its children.
- **Needs:** **no hunger; a light need instead** (rate 1.0 at the hunger rate). It is filled by standing on a sky-lit cell by day (VERTICAL_WORLD §6.3's sky light on exposed cells) or within 2 cells of a lit fire or a crystal cluster (`crystal`, `crystal_small`) at night. Crystal clusters are natural map objects that are never built. They feed only the star-born standing by them, and nothing ever needs to stand in a crystal's range to be built or to work (§1.1: no pylons). Thirst 0.5, sleep 0.4 (a short stillness, standing), social 0.8, nature 0.6. They never cook or hunt for themselves.
- **Home:** open, dry land under a wide sky: `desert_rock`, `desert_sand`, `mountain`, `tundra`, level 0. No extra crystal at the start. V67 gives every faction "the same minimum amounts", and their first night's light is V4's campfire, so they need nothing more. Crystal near them comes only from the map.
- **Start:** V4 as written: eight star-born, four men and four women, around a lit campfire (their first night's light). No constructs at the start.
- **Constructs:** see §4. The star-born make them; the band's constructs work, fight and guard, never hold a rank above 1 and never lead. A construct never has its makers' shape: robots built in their makers' form are SC2's Purifiers (§1.1). Constructs keep the automaton's own look (THEME T7).
- **Culture (data, wave 0):**
```json
"starborn": {
  "name": "Light-keepers",
  "wall": "wall_stone", "laterWall": "wall_stone", "door": "door_stone",
  "floor": { "kind": "floor_stone", "item": "stone", "count": 1 },
  "priorities": { "craft": 1.5, "mine": 1.3, "pick": 1.2, "build": 1.1, "gather": 0.6, "chop": 0.6, "hunt": 0.3 },
  "facetBias": { "patience": 25, "curiosity": 15, "discipline": 10, "sociability": -5, "ambition": -10 },
  "plan": "workshop",
  "chainWeights": { "armorsmith": 1.2, "furnace_operator": 1.2, "weaponsmith": 1.1, "carpenter": 0.8, "tanner": 0.4, "leatherworker": 0.4 },
  "arms": { "prefer": ["spear", "sword_long", "bow_long", "shield_iron"], "scavenge": 0 }
}
```
  The `workshop` plan stocks food with `hunt: false`, which suits a people that doesn't eat. `stats`: int +2, wis +2, str −2, con −1. `skills.start.favoured`: magic (recommended; `crafting` there would do nothing, §2.1. Their craft lean comes from `priorities.craft` 1.5). Their later arsenal (crystal edges, wreck-metal) comes from the CRAFTING tiers (P1) and the relic bench, through UF_Tech (V76, V77).
- **Relations:** cool but civil with humans and elves, at odds with gnomes (who gather relics from the star-born's wrecks) and goblins (who strip the wrecks), bound to the constructs, hostile to the undead and the swarm (§5).
- **Unique mechanics:** light need and self-light (wave 1), shared sight (wave 2, after the chain of command), constructs (wave 2, after UF_Tech and the relic bench), rare births (wave 1).
- **Placeholder:** `$UF_Stock_Evil_5` and `$UF_Stock_Evil_3`, tint `#e8ecff` (§9). Both stock figures wear gold and blue, the very scheme the real art must avoid: they are placeholders only and must never be given to a generator as a reference.

### 3.11 The swarm (`swarm`, working words), new
- **Theme (PROPOSAL PE4, lore):** **A (recommended):** living cargo of a fallen star gone wild (THEME pillar 4, and T1 D's falling stars can later seed new mounds). **B:** a native plague of the waste land. Player text never explains it unless the user approves.
- **Display name (PROPOSAL PE2):** **A (recommended): "Teemers"** (from *teeming*; no game race or faction of that name found on 2026-09-19). **B: "Teemkin"**, the naming run's pick: "teem" first meant "to breed, bring forth young" (Old English *teman*, which that run checked on Etymonline); no use found on the web. **C: "Gnawers"** (not searched). **D:** the user names them. Rejected: "Hivekin" (used in the Roblox game Deepwoken, found 2026-09-19), "Mound-folk" (a folklore name for the hidden folk of the mounds, found 2026-09-19, which clashes with elves as the fey), "Swarm" (the Zerg's own name). The catalog carries `TEST_Teemers` until the user decides.
- **Words (PROPOSAL PE3):** the breeder is **the Dam** (the old stock-breeder's word for a mother animal); its structure is **the mound**; the castes are **worker, darter, soldier, brute, flier, borer, diver**. "Darter" replaces "skitter": Falling Skies' insect-like aliens are the Skitters (§1.1). "Brute" is a plain word but also Halo's name for a people; B is "breaker". Never queen, broodmother, hatchery, larva, drone, overlord, creep, devourer (§1.1). The life stages are **egg, nymph, grown**. Nymph is the real termite word, but in this Arthurian setting a player may read it as a water spirit of myth; B is "grub".
- **Body: castes from small to large** (all one cell of footprint, V44):

| Caste | Job | Size (final art) | Frame | Moves |
|---|---|---|---|---|
| Worker | gathers biomass, builds and tends the mound, carries eggs | 20–26 px long, 14–18 tall | 48 × 48 | walk, climb |
| Darter | fast hunter and scout | 28–34 px long | 48 × 48 | walk, climb (2 cells per beat on open ground) |
| Soldier | guards the mound and the Dam, fights | 36–44 px long, 30–36 tall | 48 × 48 | walk |
| Flier | scouts, hunts birds and bats | 24–32 px wingspan | 48 × 48 | fly (V68's flier exception) |
| Borer | tunnels soil on −1 for new chambers | 30–38 px long | 48 × 48 | walk, burrow (soil only, real tunnels) |
| Diver | fishes, crosses rivers | 32–40 px long | 48 × 48 | walk, swim |
| Brute | breaks walls and doors (V57: doors can be broken) | 64–80 px wide, 56–72 tall | 96 × 96 | walk, 1 cell per 2 beats |
| **The Dam** | lays every egg; the band's head | 88–96 px wide, 56–64 tall, a swollen body | 96 × 96 | crawls 1 cell per 4 beats, stays in the mound |
| Mound (an object, not a unit) | stores biomass, holds the egg cells, the Dam's home | 96 wide, 80–96 tall, **2 × 2 cells of footprint** | 96 × 96 | – |
| Egg (object) | – | 12–16 px | 48 × 48 | – |

  **Colours (for the art):** natural insect colours, ochre, olive and bone chitin with dark banding like a wasp or a beetle, wet dark red only inside mouths. **Never purple-brown carapace, never glowing eyes, never bone-white plates over purple or red flesh** (§1.1). **Shapes:** the mound is packed earth, chewed wood and clay like a real termite mound, with ridges and chimneys; it is never a fleshy, veined or pulsing living building. The Dam is shaped like a real termite queen: a head and thorax of worker proportions on a huge, pale, banded abdomen. She is never a crested monster with a hanging egg sac (the Aliens queen).
- **Senses:** sight 5 (workers) to 10 (fliers), night 1.0 (smell and touch), **active in shifts**: a third of the mound rests at any hour, in the mound, so the swarm never sleeps as a whole.
- **Life:** workers 2–4 years, darters and fliers 2–3, soldiers, borers and divers 3–5, brutes 5–8, the Dam 40–60. Egg → **nymph** (small, stays in the mound and eats) → grown; no teen or elder stage.
- **Reproduction: the Dam lays eggs in the mound.**
  - Eggs cost biomass stored in the mound: **1 egg per 6 biomass**, at most **3 eggs a day**, only while the mound holds at least 6. Incubation 0.5, then a nymph for 0.5 more.
  - **Which caste hatches** is chosen by the mound's needs when the egg is laid: workers while stores are low; soldiers while an enemy is within 16 cells or a soldier fell in the last day; darters while no prey is within 20 cells; borers, divers and fliers only when the mound has **adapted** to them (below); a brute only at 40 or more members.
  - **If the Dam dies,** the mound raises a new Dam from a nymph if it has one (termites raise replacement breeders); with no nymph the mound lays no more and dies out as its members age. Killing the Dam is how a swarm is beaten, and it is guarded for that reason.
- **Adapts (PROPOSAL PE14): the mound raises what its land and its losses call for.** This is how real colonies adapt: ant colonies, for example, raise more soldiers after fights with rival colonies. The swarm never gains anything from *what* it eats, so there is no "essence" (§1.1); the design's first draft adapted by diet, which is that very StarCraft mechanic, and this review replaced it. The mound keeps a small saved tally of what its members meet: foraging trips stopped by water or a cliff, raids stopped by a wall or a closed door, members lost (and to which attack type), and prey that got away. Two effects:
  - **Caste unlocks:** divers after foragers have been stopped by water 20 times; fliers after 20 foraging trips have ended where walkers cannot reach (across water, up a cliff, or prey that flies); borers after the mound first stands on or next to −1 soil (a dug stair or a cave mouth); brutes after raids have been stopped 3 times by a wall or a closed door (V57).
  - **Traits:** each new hatchling's combat levels shift by up to ±15% toward the last season's losses. Many members lost to stab and slash give more defence; much prey escaping gives more speed and less defence; many lost to crushing blows give more hitpoints. The shift is seeded from the tally, so the same history gives the same hatchlings.
- **Spreads (PROPOSAL PE15): budding, the way bees swarm.** When a mound holds 30 or more members, 60 or more stored biomass and a nymph, a new Dam and seven workers leave to found a new mound at least `factions.areas.minGap` (40) cells away on land they can reach. The new mound is a new faction of the same people (V42's split, which already exists as a design for people who drift off), hostile to its parent at first (rival colonies). A world cap of **4 mounds** keeps V50's budget and the map sane.
- **Needs: biomass.** **Hunger 1.6** filled by anything organic: food items, raw meat, fish, hides, bones, carcasses, corpses (UF_Remains), and plants grazed straight off the map (grass tufts, reeds, berries off bushes, which then regrow, V74). Thirst 1. **No sleep** (the shifts rest instead), **no social, no nature.** They never cook. A mound's surroundings are visibly grazed bare (V21).
- **Home:** anywhere it can spread. Preferred for the first mound: warm, lush land, `forest_tropical_moist_broadleaf`, `swamp_tropical_fresh`, `marsh_tropical_fresh`, `grassland_tropical`, `savanna_tropical`, level 0. Budded mounds may settle any walkable land within reach, and borers may carry a mound to −1 (shallow cave, fungal forest on −2 later; RESOURCE_ATLAS §3.2, §3.3).
- **Start (PROPOSAL PE6, a V4 variation that needs the user's yes and code):** instead of four men and four women around a campfire, **the Dam and seven workers around a mound seed** (a small mound object on the centre cell, `PPP` / `PMP` / `PPP` with M the mound seed): no genders (the Dam lays alone, workers don't breed), no campfire. The seed is one cell; when it grows into the 2 × 2 mound, it may only take cells where no unit stands (V68). Until the user decides and the code lands, the swarm starts exactly as V4 says (eight founders around a campfire), with the placeholder sheets. This is a change to a user decision (V4), not a data-only variation.
- **Culture (data, wave 0):**
```json
"swarm": {
  "name": "Comb-builders",
  "wall": "rubble_pillar", "laterWall": "rubble_pillar", "door": "door_wood",
  "floor": { "kind": "floor_rushes", "item": "straw", "count": 2 },
  "priorities": { "hunt": 1.8, "gather": 1.6, "pick": 1.2, "build": 1.0, "chop": 0.6, "mine": 0.6, "quarry": 0.3, "craft": 0.1 },
  "facetBias": { "discipline": 40, "bravery": 30, "tidiness": 20, "curiosity": -20, "cheerfulness": -10 },
  "plan": "default",
  "chainWeights": { "furnace_operator": 0, "weaponsmith": 0, "armorsmith": 0, "bowyer": 0, "fletcher": 0, "tanner": 0, "leatherworker": 0, "carpenter": 0 },
  "arms": { "prefer": [], "scavenge": 0 }
}
```
  The culture label was "Devourers" in the first draft. The Devourer is a StarCraft: Brood War Zerg unit (checked 2026-09-19), so it is gone; "Comb-builders" is the naming run's clean option (fungus-growing termites build combs inside their mounds too). `chainWeights` are 0: the only reader, UF_Skills, takes any number as the weight (`typeof cw[lab.id] !== "number"`, line 290), and trades weighted 0 drop out of the starting draw (`.filter(p => p.w > 0)`, line 311). The first draft's 0.1 guarded against a reader that doesn't exist. `rubble_pillar` and `door_wood` stand in for grown walls and a grown door until a mound plan and pieces exist (wave 2). They use **no tools or arms**: castes fight with their bodies (a creature-style combat block per caste, like `wildlife.species[].combat`), which needs code. `stats`: str +1, con +1, dex +1, int −3, cha −4. `skills.start.favoured`: attack, hitpoints. **They don't talk** (the talk window answers "It does not answer.") and don't trade. **Names:** members have no personal names; the look label shows the caste and the mound ("a soldier of The Caerwyn Mound"); needs code, so until then they take names from `start.names`.
- **Relations:** at war with everyone, rival mounds included (§5).
- **Unique mechanics:** everything above except the culture is code (wave 2): mound, Dam, eggs and castes, caste choice, adapting, budding, biomass diet, shifts, natural weapons, no speech, no names, the PE6 start.
- **Placeholder:** `$UF_Stock_SF_Monster_6` and `$UF_Stock_Monster_7` for the grown castes, tint `#b8c878`; in wave 2 the Dam `$UF_Stock_BigMonster2_r3` and the mound `$UF_Stock_BigMonster2_r2` (§9). All four are exactly the looks the real art must avoid. SF_Monster_6 is a spiky purple beast with red eyes, and the tint leaves it dark purple (tint_b preview, opened in review). Monster_7 is a red-purple winged demon, and BigMonster2_r2 is a fleshy mass of tentacles and pods. They are placeholders only and must never be given to a generator as references.

---

## 4. The automaton people becomes the star-born's constructs

V87 records Claude Code's reading: the existing automaton people becomes the constructs of the star-born rather than a separate faction. THEME T7 A (pending) recommended the opposite (keep automata as their own unplayable faction). **PE5** asks the user to settle it. If the V87 reading stands, this is exactly what changes.

**Kept, for save compatibility** (a save made before the change may hold a faction of species `automaton`, its founders, its camp and its culture):
- The id `automaton` everywhere.
- `factions.species` entry `automaton`: stays in the list, with `name` "Automata", `playable: false`, `groups`. UF_Factions' `speciesName(id)` and the player check read it; removing it would break an old save's ledger and chronicle.
- `people.automaton` (the images `$UF_Stock_SF_People3_4`, `_6`, `_7` and `stats`): unchanged; construct units use it.
- `cultures.automaton` ("Foundry-minds"): unchanged; an old save's automaton faction keeps it, and in wave 2 construct units use its `priorities` for their own work choice.
- `sites.bySpecies.automaton`, `sites.preferredBiomes.automaton`, `factions.speciesAffinity["automaton|goblin"]`, `skills.start.favoured.automaton`: unchanged.
- Old automaton factions keep working as they do today. No migration runs.

**Changed:**
1. **No new automaton factions are rolled.** Its `weight` becomes 0, and its `about` says "the star-born's constructs (VISION V87, 2026-09-19); not rolled as a faction; kept for saves".
   - **Finding:** a weight of 0 does not work today. `game/js/plugins/UF_Factions.js` lines 94 and 96 read `it.weight || 1`, so 0 counts as 1 and the automaton would still be rolled as often as the gnome. The fold therefore needs a two-line change there (treat a defined weight as itself; skip a weight of 0). UF_Factions is Claude Code's file; the change is small, and the data run makes it under the merge rule, with a check (§11) that over 500 seeds no new automaton faction appears.
2. **A link from the star-born:** `people.starborn.constructs: "automaton"` (read in wave 2).
3. **Construct units** (wave 2) are units with `data.species: "automaton"`, `data.construct: true`, `data.faction` the star-born faction, no gender, no age stage (always adult, never elder), rank 1 only (never a commander or the head), no needs but **charge**: a slow need filled at a crystal cluster or by a star-born's **kindle** job. They don't reproduce, don't sleep, don't eat, and can't swim (they sink and are lost).
4. **How constructs come to be** (wave 2, PE16): **made** at the relic bench (CRAFTING §4, new with P1) from wreck-metal plates and a crystal by a star-born with crafting 40, one construct per 3 star-born in the band at most; or **woken** at a wreck (THEME T16 B, if approved) by a star-born's kindle job. The V77 tech tree decides when a star-born faction can build the relic bench.
5. **The look label** of a construct: "a construct of The Morance Vigil" (in-world word per THEME T2 A; "automaton" is also allowed there).
6. **Rank names:** CHAIN_OF_COMMAND §10's three "Foundry-minds" sets then serve only old saves' automaton factions. The naming run decides whether one of them moves to the star-born's culture (constructs never rank above 1, so they never show a rank-2+ name themselves).

---

## 5. Relations defaults

UF_Factions adds, for every pair of factions, the species term (`speciesAffinity`), both sides' ethos terms and a seeded spread of ±30 (`randomSpread`), clamped to −100…100; same-species pairs get `sameSpecies` (+10). Tiers: allied ≥ 50, friendly ≥ 15, neutral ≥ −14, hostile ≥ −49, at war below. The existing 14 pairs stay as they are. New pairs (PROPOSAL PE10; `factions.speciesAffinity` is outside this run's claimed keys, so the data run extends its claim or leaves them for the owner):

| Pair | Term | Why |
|---|---|---|
| lizardfolk\|human | −10 | wary of the dry-land folk who drain fens |
| lizardfolk\|elf | +5 | both of the old wild |
| lizardfolk\|dwarf | −10 | |
| lizardfolk\|goblin | −20 | rivals for the same swamps |
| lizardfolk\|orc | −15 | |
| lizardfolk\|kobold | −30 | egg-layers, each the other's egg-thief |
| kobold\|human | −15 | |
| kobold\|elf | −15 | |
| kobold\|dwarf | −35 | rival miners under the hills |
| kobold\|gnome | −25 | rival burrowers |
| kobold\|goblin | +10 | |
| kobold\|orc | +5 | |
| kobold\|starborn | −10 | |
| starborn\|human | +5 | |
| starborn\|elf | +10 | two old peoples |
| starborn\|gnome | −15 | gnomes gather the star-born's relics |
| starborn\|goblin | −30 | goblins strip the wrecks |
| starborn\|orc | −10 | |
| undead\|human, elf, dwarf, gnome, lizardfolk, kobold | −60 each | the living and the dead |
| undead\|goblin | −45 | goblins trade in bones |
| undead\|orc | −50 | |
| undead\|starborn | −45 | |
| swarm\|every other people | −70 each (10 pairs) | it eats everything |
| undead\|swarm | −70 | it eats the remains the undead raise |

Pairs not listed (lizardfolk\|gnome, lizardfolk\|starborn, starborn\|dwarf) are 0. The first draft also gave pairs with the `automaton` (starborn +40, undead −20, swarm −40). They are dropped because they can never apply: relations are rolled once, when a world is made (UF_Factions `generate`); new worlds roll no automaton faction (§4), and an old save's world holds none of the new peoples.

**Always hostile?** With ethos terms up to +30 on each side and the spread of +30, a −70 pair can still roll as high as +20 in a rare world (two trading, scholarly factions). **There is a second path, found in review:** V18's guarantee in UF_Factions (lines 171–182) sets the best pair of a world to +60 whenever no pair reaches +40. When the undead or the swarm are in that pair, they become **allied**. The critic's estimate replays the roll with the §5 and §8.1 numbers over 20 000 seeds (a scratch script with a generic seeded random, so the rate is an estimate, not the game's exact worlds). In it, 2.67% of worlds ally a pair with the undead or the swarm, and 2.41% of worlds do so through that forcing alone. Three small code changes (wave 1) close both paths. `factions.species[].ethos` limits a people's ethos rolls (the swarm only `warlike` or `expansionist`; the undead no `traders`). `factions.species[].sameSpecies` overrides the +10 for its own kind (swarm −40, so rival mounds fight; undead +20). And the V18 forcing picks its best pair among pairs without the undead or the swarm. Until then the undead and the swarm are hostile in almost every world, not in every one.

---

## 6. Sizes for ART_STANDARD §2 (PROPOSAL PE9)

Rows to add or change in ART_STANDARD §2 once the user approves. Everything stands on the bottom-centre of its frame.

| Thing | Final size | Frame |
|---|---|---|
| Orc | 44–48 px tall (unchanged); **only with THEME T6 A:** 52–58 px tall, broad | 48 × 48; with T6 A 96 × 96 |
| Lizardfolk | 54–60 px tall, tail to the ground | 96 × 96 |
| Lizardfolk hatchling / young | 18–24 / 30–40 px | 48 × 48 |
| Kobold | 26–32 px tall | 48 × 48 |
| Kobold hatchling | 12–16 px | 48 × 48 |
| Undead (risen) | the size of the people it was; a bone risen 2 px thinner | that people's frame |
| Star-born | 46–48 px tall, slender | 48 × 48 |
| Construct (the automaton row) | 44–48 px (unchanged: ART_STANDARD §2 groups the automaton with humans) | 48 × 48 |
| Swarm worker / darter / flier | 20–26 long / 28–34 long / 24–32 wingspan | 48 × 48 |
| Swarm soldier / borer / diver | 36–44 / 30–38 / 32–40 px long | 48 × 48 |
| Swarm brute | 64–80 wide, 56–72 tall | 96 × 96 |
| The Dam | 88–96 wide, 56–64 tall | 96 × 96 |
| Mound (object, 2 × 2 cells) | 96 wide, 80–96 tall | 96 × 96 |
| Egg, clutch in a nest (objects) | 12–16 px each; nest 36–44 wide | 48 × 48 |

96 × 96 people sheets are new: the AR-600 layered compositor and the gear layers (AR-900 to AR-903) are drawn for 48 × 48 bodies today, so lizardfolk gear (and orc gear with T6 A) needs its own 96 × 96 layers. The Dam and the brute are 1-cell units whose sprites overhang the cells beside them as well as above. The wild horse and aurochs (72 px long in 96 × 96) already do that; ART_STANDARD F4 only mentions overhang above, so its wording should say so. That is an art cost the user should weigh in PE9. The stock placeholders are all 48-px figures, so until art arrives kobolds look as big as humans and lizardfolk and orcs no bigger.

---

## 7. Unique mechanics: what data can do now, what waits for code

"Wave 0" is data only (this run). "Wave 1" is the life-cycle plugin after UF_Levels, UF_Tech and UF_Remains land. "Wave 2" is the peoples that live differently. Systems named are the plugins each touches; every code change goes through aliases from the new `UF_Peoples.js` where the file is claimed by another run.

| Mechanic | Peoples | Systems touched | Now (data only)? | Wave |
|---|---|---|---|---|
| New peoples roll, found a faction, get a culture, sheets, names, relations | all five new | UF_Factions, UF_History, UF_Colonists, UF_Doors, UF_Floors, UF_Skills | **yes** (`factions.species`, `people`, `cultures`; plus the recommended `sites.preferredBiomes`, `speciesAffinity`, `skills.start.favoured`). A culture's walls, floors, doors, plan and priorities act only in the player's faction today (§2.1); the other factions' founders wander | 0 |
| **The V87 life guard:** no conception for a people whose `life.birth` is `none` (undead) or `mound` (swarm); no hunger for `needs.hunger` 0 | undead, swarm | UF_Colonists (reproduction, needs) and whatever gives every faction daily life (`UF_Society.js`, the "Paths and DF life" run) | no | **1, first slice. It must land with or before every faction gets daily life** (§10) |
| Undead may settle cursed land | undead | UF_Factions `habitable` | **yes** (`factions.areas.cursedOk: ["undead"]`, outside this run's keys) | 0 |
| The automaton is no longer rolled | automaton | UF_Factions lines 94, 96 | no: weight 0 reads as 1 | 0 (a two-line fix) |
| Draw peoples without repeats until all are used, so a world shows more different peoples | all | UF_Factions `weighted` | no | 0 or 1 (PE8) |
| Undead prefer cursed land (PE13) | undead | UF_Factions `placeAreas` (a preferred alignment) | no | 1 |
| Per-people ethos limits, same-kind relation, and V18's forced +60 pair never falling on the undead or the swarm (§5) | undead, swarm | UF_Factions | no | 1 |
| Life stages, lifespans, death of old age, gestation, fertility, twins | all | UF_Colonists (reproduction is hard-coded: 3-day gestation, 0.5 conception, human `$Baby`/`$Child_*`/`$Teen_*` sheets, aging stops at 18; lines 761–942), UF_Skills `start.stageAges` (global) | no | 1 |
| Eggs, clutch, nest objects, incubation, chill, nest warmth decides sex | lizardfolk, kobold | UF_Colonists, UF_Objects (new nest and egg objects), UF_Items (egg item), UF_Fire (heat source) | no | 1 |
| Need rates per people; warmth and light needs; biomass diet; no needs | all; lizardfolk; star-born; swarm; undead | UF_Colonists needs and jobs | no (`colony.needs` is global) | 1 |
| Night and shift activity, night sight, sight radius | goblin, kobold, undead, swarm; all | UF_Colonists `sleepWindow` (global `sleepHours`), `sight` (fixed 8) | no | 1 |
| Movement profiles: swim, climb, burrow, fly, under-water walking | lizardfolk; goblin, kobold, elf; kobold, swarm borer; swarm flier; undead | UF_Jobs pathing, UF_Levels connectors (VERTICAL_WORLD §7.1) | no | 1 (after UF_Levels) |
| Dig-down start for dwarves and kobolds | dwarf, kobold | a plan step (colony.plans) and UF_Levels stairs | no | 1 |
| (Dropped in review: a per-people start kit. V67 gives every faction the same minimum, and nothing here needs more: the star-born's first light is the campfire, and water within 30 cells is already preferred for every area. Proposing it again would mean changing V67.) | – | – | – | – |
| 96 × 96 people sheets with gear layers | orc, lizardfolk, brute, Dam | UF_Anim compositor | no | 3 (art) |
| Raise the dead from corpses and bones; bonds; decay; bone mending | undead | UF_Remains (corpses, bone piles), UF_Jobs (raise, mend), UF_Skills (magic level), UF_Combat (resistances), UF_Classes (the raiser class, V88) | no | 2 (after UF_Remains) |
| Spreading blight around an undead camp | undead | UF_WorldGen per-cell region override (also THEME T18) | no | 2 |
| Wild restless dead ignore the undead faction | undead | UF_Wildlife (another session's file: a request to its owner or an alias) | no | 2 |
| The mound, the Dam, eggs, nymphs, caste choice, shifts | swarm | new objects, UF_Colonists (founders and births), UF_History (the PE6 start), UF_Combat (natural weapons per caste) | no | 2 |
| Pressure tally (trips stopped by water or cliffs, raids stopped by walls and doors, losses by attack type, prey escaped), caste unlocks and trait shifts (PE14) | swarm | UF_Jobs (failed paths and hunts), UF_Combat (deaths), UF_Doors and UF_Walls (blocked raids) | no | 2 |
| Budding into new mounds | swarm | UF_Factions (a new faction in play), V42's split | no | 2 |
| No speech, no names, no trade | swarm | UF_Talk, UF_History namer, UF_Arrivals | no | 2 |
| Light need, self-light, shared sight, instant orders | star-born | UF_Colonists, light (VERTICAL_WORLD §6.3), UF_Command (CHAIN_OF_COMMAND) | no | 1 (light), 2 (sight, orders) |
| Constructs made or woken; charge; kindle | star-born, automaton | UF_Tech (relic bench unlock), UF_Jobs, UF_Colonists | no | 2 |
| Ore-sense | kobold | UF_Look (the five-level run holds it now) | no | 2 |
| Canopy paths | elf | UF_Levels trees | no | 1 |

**What a player sees after wave 0 alone** (corrected in review against the code):
- All eleven peoples can be rolled. Each founds its area with eight founders around a campfire, in stock placeholder sheets with its tint, a group word and its relations.
- **Other factions don't live yet.** Their founders wander around their fire (UF_History line 1369, `ai: "wander"`): they neither eat nor breed nor build, whatever their people. Their cultures show only in their starting trades (UF_Skills).
- **The player's faction is the only one that lives,** and it lives by human rules whatever its people (UF_Colonists lines 761–942). Its members eat, drink and sleep on the global rates and mate nightly (conception 0.5, 3 days). Every child is born on the human `$Baby` sheet, grows through `$Child_*` and `$Teen_*`, and at 18 takes the human `$Adam`/`$Eve` sheet with no tint. Its names come from the shared `start.names`. A lizardfolk or kobold player would therefore see live births of human-looking children within days, against V87; that is why PE7 now recommends none of the five new peoples playable in wave 0.
- **The player can still be given a non-playable people.** When a world rolls no playable faction, UF_Factions picks from all of them (lines 184–190). The critic's estimate puts this at 0.72% of worlds; in 0.32% of worlds the people given is the undead, the star-born or the swarm.
- **When every faction gets daily life** (the "Paths and DF life" run), the undead and the swarm would eat and bear human babies unless the V87 life guard above lands first.
- STATUS must say all of this in plain words while it is true.

---

## 8. Data for wave 0

### 8.1 `factions.species` (appended; the automaton entry changed as §4 says)
```json
{ "id": "lizardfolk", "name": "Lizardfolk", "weight": 2, "playable": false, "groups": ["Fen", "Mere", "Clutch", "Tribe"] },
{ "id": "kobold",     "name": "Kobolds",    "weight": 2, "playable": false, "groups": ["Sett", "Seam", "Drift"] },
{ "id": "undead",     "name": "Undead",     "weight": 1, "playable": false, "groups": ["Cairn", "Wake", "Knell"] },
{ "id": "starborn",   "name": "TEST_Glassfolk", "weight": 1, "playable": false, "groups": ["Vigil", "Watch", "Keep"] },
{ "id": "swarm",      "name": "TEST_Teemers",   "weight": 1, "playable": false, "groups": ["Mound", "Mass", "Seethe"] }
```
- **Group words changed in review** (PE20). The first draft's kobold "Den, Nest, Pit" are Zerg building words (Hydralisk Den, Queen's Nest, Infestation Pit; checked 2026-09-19). Its undead "Barrow" is Tolkien's barrow-wights and a goblin rank proposal, "Crypt" a Warcraft III Undead building (from memory), and "Host" THEME T8's orc group word. Its star-born "Spire" is a Zerg building, "Beacon" the Protoss Fleet Beacon (checked 2026-09-19), "Vault" Fallout's and THEME T18's relic vaults, and "Lantern" a THEME T8 heraldic charge. The new sets are the naming run's recommended options, whose script and web checks found them clean.
- **Playable (PROPOSAL PE7, recommendation changed in review):** none of the five new peoples is playable until its life cycle works: lizardfolk and kobolds after wave 1's eggs, the undead, star-born and swarm after wave 2. As the player's faction, any of them would live by human rules (§7): live births, human-looking children and human names, which contradicts V87. The first draft made lizardfolk and kobolds playable at once, although its own reason for holding back the other three applies to them too. The user may still want some or all playable at once (PE7 B, C).
- **Weights (PROPOSAL PE8):** with these weights (total 19 without the automaton) and today's 4–7 factions per world, a Node calculation (2026-09-19) gives each people's chance to appear in a world: humans 60%, elves, dwarves, goblins, orcs, lizardfolk and kobolds 45% each, gnomes, undead, star-born and swarm 26% each; on average 4.35 different peoples per world. Drawing without repeats until all are used would make every world show 4–7 different peoples; raising `factions.count` to 6–9 would give 5.4 on average but needs room: `minGap` 40 on a 256-cell map.

### 8.2 `people` (appended)
```json
"lizardfolk": { "images": ["$UF_Stock_Monster_2"], "tint": "#a8d888", "stats": { "con": 2, "str": 1, "int": -1, "cha": -1 } },
"kobold":     { "images": ["$UF_Stock_Nature_4", "$UF_Stock_Actor3_4"], "tint": "#d09060", "stats": { "dex": 2, "int": 1, "str": -2, "con": -1 } },
"undead":     { "images": ["$UF_Stock_Evil_7", "$UF_Stock_Monster_3"], "tint": "#c8d0c0", "stats": { "con": 2, "wis": 1, "dex": -1, "cha": -3 } },
"starborn":   { "images": ["$UF_Stock_Evil_5", "$UF_Stock_Evil_3"], "tint": "#e8ecff", "stats": { "int": 2, "wis": 2, "str": -2, "con": -1 }, "constructs": "automaton" },
"swarm":      { "images": ["$UF_Stock_SF_Monster_6", "$UF_Stock_Monster_7"], "tint": "#b8c878", "stats": { "str": 1, "con": 1, "dex": 1, "int": -3, "cha": -4 } }
```
Name syllable tables (PROPOSAL PE20; not yet run through THEME T10's collision list, which must happen before they go in; until then these peoples use `start.names`):
- lizardfolk: start `ssa, keth, zhi, vesh, ruk, hass, tzi, isk, sha, ozz, tesk`; male `ak, ess, ith, ukk, ox`; female `a, issa, eth, ish, esh`. ("sith" and "thal" were dropped from a first draft: Star Wars' Sith, Doctor Who's Thals.)
- kobold: start `kip, snik, dek, yip, rikk, tak, mik, nob, gek, tib`; male `ik, ok, ek, a`; female `i, ya, eka, ip`.
- star-born: start `ael, ilu, ora, sae, vei, luma, eon, iri, tae, ny`; male `an, el, ion, ar, os`; female `a, ia, ele, ine, ys`.
- undead: none (the dead keep their living names; founders use `start.names`).
- swarm: none (no personal names, §3.11; interim `start.names`).

### 8.3 `cultures` (appended)
The five blocks in §3.7–§3.11. No existing culture changes.

### 8.4 Recommended, outside this run's claimed keys
| Key | Values | Owner's go-ahead needed because |
|---|---|---|
| `sites.preferredBiomes` | lizardfolk: `swamp_tropical_fresh, marsh_tropical_fresh, swamp_mangrove, swamp_temperate_fresh, marsh_temperate_fresh`; kobold: `mountain, desert_rock, shrubland_temperate, taiga`; undead: `desert_badland, swamp_temperate_fresh, tundra, shrubland_temperate`; starborn: `desert_rock, desert_sand, mountain, tundra`; swarm: `forest_tropical_moist_broadleaf, swamp_tropical_fresh, marsh_tropical_fresh, grassland_tropical, savanna_tropical` | not in the claim; without it new areas are placed by the water-only rule, which still works |
| `factions.speciesAffinity` | the pairs of §5 | not in the claim; without it every new pair is 0 (neutral before ethos and spread) |
| `factions.areas.cursedOk` | `["undead"]` | not in the claim; without it the undead never settle cursed land |
| `skills.start.favoured` | lizardfolk `defence, hitpoints`; kobold `ranged`; undead `defence, magic`; starborn `magic`; swarm `attack, hitpoints` (fighting skills only: UF_Skills ignores trade skills there, §2.1) | not in the claim; missing keys mean no favoured skills |
| `sheet.faces` | lizardfolk `Monster` 2, kobold `Nature` 4, undead `Evil` 7, starborn `Evil` 5, swarm none (they don't talk). These are the stock face sets the catalog already uses for other species; the review did not open the faces themselves | not in the claim (UF_Sheet's key); without it the sheet draws a silhouette |
| `sites.bySpecies` | lizardfolk `camp, camp, village`; kobold `warren, warren, hold`; undead `hold, hold, hold`; starborn `hold, hold, hold`; swarm `lair, lair, lair` | only the switched-off older generator reads it |

Note: the player's faction always starts at the map centre (UF_Factions, `playerReach` 6), whatever its people's preferred biomes; a player given lizardfolk may start on dry grassland, with water guaranteed within 30 cells by the kit.

---

## 9. Placeholders: stock figures, looked at

Seen on 2026-09-19 from the RPG Maker MZ install's own sheets (`newdata/img/characters`, the source `tools/extract_stock_characters.js` cuts from): contact sheets of the down-facing and left-facing middle frames of every figure of Monster, SF_Monster, Evil, Nature, People1–4, Actor1–3, SF_People1–3, SF_Actor1–3, Vehicle, SF_Vehicle and Damage1, and of every row of `$BigMonster1` and `$BigMonster2`, plus tinted previews of the candidates at 3× next to a human (People4_6) with the 48 px square marked. Figures already used by wildlife were avoided where possible, so a people is not mistaken for a monster: Monster_1 (the troll), Monster_4 (arctic fox), Monster_5 (ice wraith), Monster_6 (restless dead), SF_Monster_2 (giant spider), BigMonster1_r1 (bog horror).

| People | Cut | The figure (as seen) | Tint and what it did | Fit |
|---|---|---|---|---|
| Lizardfolk | `$UF_Stock_Monster_2` | Monster.png figure 2: a blue-furred, snouted wolf-man with fangs and a tail, in blue armour | `#a8d888`: fur reads as green scales; the armour stays blue-grey | the only snouted, tailed biped in the stock sheets; furry ears give it away; one figure for both sexes |
| Kobold | `$UF_Stock_Nature_4` | Nature.png figure 4: a cat-eared girl with a tail, red and white dress | `#d09060`: rust-brown skin and hair | a small beast-person look, but full 48 px height |
| Kobold | `$UF_Stock_Actor3_4` | Actor3.png figure 4: a black-hooded, masked figure | `#d09060`: a brown hooded miner | reads as sneaky and furtive |
| Undead | `$UF_Stock_Evil_7` | Evil.png figure 7: a faceless figure in a brown hooded robe | `#c8d0c0`: a grey-brown hood | the plain risen (the founders) |
| Undead | `$UF_Stock_Monster_3` | Monster.png figure 3: black armour with yellow trim, horned helm, magenta eyes | `#c8d0c0`: barely changes | the armed risen |
| Star-born | `$UF_Stock_Evil_5` | Evil.png figure 5: a pale blue-skinned figure with a gold tiara and blue and gold robes | `#e8ecff`: slightly paler | otherworldly; gold and blue is the scheme the art must avoid (§3.10) |
| Star-born | `$UF_Stock_Evil_3` | Evil.png figure 3: white hair, a glowing gold visor, small blue sparks | `#e8ecff` | "mind and light" |
| Constructs | `$UF_Stock_SF_People3_4`, `_6`, `_7` (unchanged) | SF_People3.png figures 4, 6, 7: capsule-chested walkers in dark grey, white and olive | none | already the automaton's; SF_People3_0 (a blue crystal-bodied walker on wheels, also SF_Monster_4) is a candidate for a crystal construct later |
| Swarm (grown castes) | `$UF_Stock_SF_Monster_6` | SF_Monster.png figure 6: a spiky, horned, clawed purple beast with red eyes (also the sand stalker's, which is tinted `#e8d090`) | `#b8c878`: still dark purple with red eyes (review, tint_b preview), distinct from the sand stalker | the most insect-like figure in the stock sheets, but it has the colours the art must avoid |
| Swarm (grown castes) | `$UF_Stock_Monster_7` | Monster.png figure 7: a winged, clawed red-purple demon with a tail | `#b8c878`: muddier | a fighter caste |
| Swarm Dam (wave 2) | `$UF_Stock_BigMonster2_r3` | `$BigMonster2` row 3 (120 px frames): a red, spiny, crab-clawed horror on a coiled body | `#c8d890`: barely changes | the swollen breeder |
| Swarm mound (wave 2) | `$UF_Stock_BigMonster2_r2` | `$BigMonster2` row 2: a mass of blue-green tentacles and dark pods | barely changes | a living mound with egg pods |

No stock sheet has a lizard-person, a kobold or an insect; every choice above is a stand-in by silhouette and tint only. **Never give these to a generator as references:** the star-born's two (gold and blue), the swarm's four (purple, red-eyed, and a fleshy tentacle mass for the mound) and the undead's Monster_3 (magenta eyes). Each one shows a look this file bans for the final art. `HANDOFF_peoples.md` and `GENERATOR_PROMPTS.md` must say so. The new cuts (all but SF_Monster_6, SF_People3_4/6/7, which exist) are made with `node tools/extract_stock_characters.js --only Monster_2,Nature_4,Actor3_4,Evil_7,Monster_3,Evil_5,Evil_3,Monster_7` (and `BigMonster2_r2,BigMonster2_r3` in wave 2); per CLAUDE.md each gets a replacement request naming the stock asset in `docs/ASSET_REQUESTS.md`.

---

## 10. Build plan

| Wave | What | Files | Waits for |
|---|---|---|---|
| 0 | Catalog entries (§8), stock cuts (§9), asset requests and `HANDOFF_peoples.md`, the generator prompts rebuilt; the two-line weight fix in UF_Factions | catalog `people`, `cultures`, `factions.species`; `game/img/characters/$UF_Stock_*`; `docs/ASSET_REQUESTS.md`; `docs/handoffs/`; `UF_Factions.js` | the user's editor closed for the catalog edit; this design's PE5 and PE7 |
| 1 | **First slice: the V87 life guard** (§7: no births for the undead and the swarm, no hunger for the undead), which must land with or before the "Paths and DF life" run gives every faction daily life. Then `UF_Peoples.js` (new, Claude Code): `people[id].life`, `needs`, `senses`, `move`, `size`; eggs and nests; night and shift windows; movement profiles; undead preferred alignment, per-people ethos and the V18 forcing change in UF_Factions; dig-down plan step | new `UF_Peoples.js`; aliases on UF_Colonists, UF_History, UF_Jobs, UF_Levels, and on `UF_Society.js` once it exists; small edits in UF_Factions | the guard: only the DF-life run's timing (agree it with that run). The rest: UF_Levels, UF_Tech, UF_Remains landed; the running bands and campfire runs out of UF_Colonists and UF_History |
| 2 | The undead's raising and mending, the swarm's mound, the star-born's light, sight and constructs, kobold ore-sense | `UF_Peoples.js`, new objects and items in the catalog, UF_Combat creature blocks for castes | wave 1; UF_Command (chain of command) for shared orders; the relic bench (CRAFTING P1) for constructs |
| 3 | Final art for the five new peoples (and 96 × 96 orcs only with THEME T6 A), faces (AR-700), age stages (AR-601) | Gemini, `docs/ASSET_REQUESTS.md` | the user's approval of PE9 and the style anchors |

---

## 11. Checks (suite `peoples`)

Every check must be able to fail; each line says how to provoke the FAIL once.

| Check | Wave | FAILs when | Provoke it by |
|---|---|---|---|
| `species_complete` | 0 | a `factions.species` id has no `people` or `cultures` entry, a culture names a wall, door, floor, plan or arms id the catalog lacks, or an image file is missing in `img/characters` | a copy of the catalog with `cultures.kobold.door` set to `door_glass` |
| `every_people_founds` | 0 | for each of the eleven peoples (the automaton is not one of them), a synthetic New Game with that people forced into the roll does not give it a faction with an area, a camp, a lit campfire and eight founders of that species on the ring | forcing a species with an empty `images` list |
| `automaton_not_rolled` | 0 | over seeds 1–500, any new faction has species `automaton` | the catalog copy with automaton `weight: 1`, or the unfixed `it.weight || 1` |
| `old_save_automaton` | 0 | a saved world holding an automaton faction loses its species name, its culture or its founders on load | a save copy whose automaton entry was deleted from the catalog |
| `names_clean` | 0 | a display name, group word, culture label or generated founder name contains a banned coined word (AGENTS list, THEME §3.3, PE21's coined list), or a star-born or swarm name, group word, culture label or caste word contains one of §1.1's ordinary words (queen, hive, nest, den, pit, spire, beacon, devourer…) | a swarm group word "Hatchery", or a kobold group word "Zergling", in a catalog copy |
| `relations_new_pairs` | 0 | over seeds 1–200, the mean relation of pairs with the undead or the swarm is above −40 | a catalog copy with `swarm|human` at +70 |
| `never_allied` | 1 | over seeds 1–500, any pair with the undead or the swarm is allied. In wave 0 this **would fail on the design's own data**: V18's forcing allies such a pair in about 2.4% of worlds (§5), so it waits for the forcing change | the unchanged forcing (UF_Factions lines 171–182) |
| `v87_life_guard` | 1 (first slice) | over 10 game days with conception forced (`_forceConceive`), an undead or swarm member conceives or gives birth, or an undead's hunger rises; run on the player's faction and on another faction once every faction lives | the guard removed, or `people.undead.life.birth` set to `live` in a catalog copy |
| `playable_fallback` | 0 | over seeds 1–2000, the player is given a people marked `playable: false` in a world that also rolled a faction of a playable people (the fallback may happen only when none was rolled); the check also prints how often the fallback happened | in a snapshot copy, UF_Factions' pool (line 189) set to `list` |
| `life_stages` | 1 | a newborn of a people ages or reaches adulthood off its `life.stages`, or an adult outlives `lifespan[1]` | a people with `stages.child` 0 |
| `eggs_hatch` | 1 | a lizardfolk or kobold mating does not produce a nest with a clutch in range, eggs hatch before incubation, or kobold eggs away from heat do not chill | a kobold nest placed 5 cells from any fire |
| `needs_by_people` | 1 | an undead's hunger, thirst or sleep rises, a star-born's hunger rises, or a swarm member fills hunger from a non-organic item | an undead with `needs.hunger` 1 |
| `movement_profiles` | 1 | a lizardfolk cannot cross a 3-cell river, a human can, or an undead cannot walk its bottom | removing `swim` from lizardfolk |
| `raise_dead` | 2 | a raise on a corpse does not give a risen of the corpse's species with half its combat levels, a raiser exceeds its bonds, or an unbound risen does not collapse | a raiser with magic 1 raising a second risen |
| `mound_breeds` | 2 | the Dam lays without stored biomass, lays more than 3 a day, the chosen caste ignores a threat within 16 cells, or a mound without its Dam and nymph still lays | an enemy placed 8 cells from a mound whose next egg is a worker |
| `mound_buds` | 2 | a mound past the budding thresholds does not bud, buds under minGap, or the world passes 4 mounds | a fifth mound forced by lowering the cap check |

Every screenshot a check takes is opened and described before a report cites it (AGENTS rule 5).

---

## 12. Decisions needed (recommended option first)

1. **PE1** The star-born's display name: A "Glassfolk" / B "Sky-wrights" (the naming run's pick; it implies they built the old works, PE4 A) / C "Lightkin" / D the user names them. "Star-born" itself is Starfield's Starborn and never reaches player text.
2. **PE2** The swarm's display name: A "Teemers" / B "Teemkin" (the naming run's pick) / C "Gnawers" / D the user names them.
3. **PE3** The swarm's words: the Dam, the mound; castes worker, **darter** (was "skitter": Falling Skies' aliens), soldier, brute (also Halo's Brutes; B "breaker"), flier, borer, diver; stages egg, nymph (B "grub": a nymph is also a water spirit of myth), grown. Yes / change some.
4. **PE4** Lore: A the star-born are the last star-farers and the swarm came down with a fallen star / B the star-born were made by the star-farers and the swarm is a plague of the waste land. Player text explains neither without approval.
5. **PE5** The automaton becomes the star-born's constructs, kept for saves and no longer rolled (§4; needs the two-line UF_Factions weight fix) / keep automata as their own unplayable faction (THEME T7 A).
6. **PE6** **A change to V4, a user decision** ("which starts like every other faction"): the swarm starts as its Dam and seven workers around a mound seed, with no campfire and no genders; this needs code. Every other people keeps V4 exactly. Yes / no. Until you answer yes and the code lands, the swarm starts as V4 says.
7. **PE7** Playable (recommendation changed in review): A none of the five new peoples is playable until its life cycle works (lizardfolk and kobolds after wave 1, the undead, star-born and swarm after wave 2), because as the player's faction they would give live birth to human-looking children with human names (§7) / B lizardfolk and kobolds playable now, knowing that / C all eleven playable at once. Under every option, about 0.7% of worlds roll no playable faction and the player is given a non-playable one (UF_Factions lines 184–190; 0.32% the undead, star-born or swarm, the critic's estimate).
8. **PE8** Weights 2, 2, 1, 1, 1 for the new peoples and 0 for the automaton; draw peoples without repeats so each world shows 4–7 different ones; keep `factions.count` 4–7 / raise it to 6–9.
9. **PE9** Sizes (§6): kobolds 26–32 px; lizardfolk 54–60 px in 96 × 96 frames (with their own 96 × 96 gear layers); swarm castes 20–80 px; the Dam and a 2 × 2 mound. Orcs: A keep 44–48 px as ART_STANDARD §2 says (no user message asks for bigger orcs) / B 52–58 px in 96 × 96 frames, only together with THEME T6 A's giant-blooded "Ogres". Yes / keep lizardfolk at human size.
10. **PE10** Relations (§5): the undead and the swarm hostile to all; the other new pairs as listed; ethos limits and a same-kind term for the swarm (−40) and the undead (+20); and V18's forced +60 pair (UF_Factions lines 171–182) never falls on the undead or the swarm (without that, 2.4% of worlds ally one of them, the critic's estimate). Yes / change pairs.
11. **PE11** Lifespans and stages (§3): humans 60–80 as the measure; elves 300–400, dwarves 150–180, gnomes 200–250, goblins 35–50, orcs 45–60, lizardfolk 60–90, kobolds 20–30, star-born 700–1000 with very few births, the undead ageless, swarm castes 2–8 and the Dam 40–60. How long a year is stays VISION Q11.
12. **PE12** Needs: the undead have none of the five and mend with bone; the star-born need light instead of food; the swarm eats any organic matter, rests in shifts and has no social or nature need; lizardfolk need warmth and bask. Yes / change.
13. **PE13** The undead. A raiser needs magic 10 and binds 1 + magic/10 risen (how magic is trained is CLASSES.md's). A corpse rises with half its combat levels and no trade skills; bones rise weaker; an unbound risen collapses after 3 days. Risen bodies decay: fresh, then rotting at 30 days, bone at 120 days. Their home is cursed land: this file's idea, since V87 doesn't say it; allowed now through `cursedOk`, preferred later. The land around an undead camp turns cursed a little each season (wave 2, a new world rule). The player-facing word is "the risen" (also the title of the 2009 game *Risen*, from memory; B "the raised"). Optional: daylight costs them 10% of attack and defence. Yes / change / no daylight rule / no spreading curse.
14. **PE14** (rewritten in review) The swarm adapts to what it meets, never to what it eats, since adapting by eating is StarCraft's "essence" mechanic (§1.1). Caste unlocks: divers after foragers are stopped by water 20 times; fliers after 20 trips end where walkers can't reach; borers after reaching −1 soil; brutes after raids are stopped 3 times by walls or doors. Hatchlings' combat levels shift up to ±15% toward the last season's losses. Yes / no.
15. **PE15** The swarm spreads by budding (30 members, 60 biomass and a nymph; a new Dam and seven workers found a mound at least 40 cells away as a new, rival faction), at most 4 mounds per world. Yes / change the numbers.
16. **PE16** The star-born: shared sight within 24 cells and instant orders; faint self-light; constructs made at the relic bench from wreck-metal and crystal (crafting 40, one per 3 star-born) or woken at wrecks if THEME T16 B is approved. Crystals are natural and never power anything built, and constructs never copy their makers' shape (§1.1). Yes / change.
17. **PE17** Lizardfolk: they swim; eggs in a clutch of 2–5 in a nest near water; the nest's warmth decides the hatchlings' sex, as in real crocodilians. Yes / no to the warmth rule.
18. **PE18** Kobolds: eggs must lie within 2 cells of a fire or furnace; they work by night; they burrow through soil; ore-sense within 4 cells below ground. Yes / change.
19. **PE19** The undead walk along the bottom of water. Yes / no.
20. **PE20** Group words (§8.1, changed in review to the naming run's clean sets): Fen, Mere, Clutch, Tribe / Sett, Seam, Drift / Cairn, Wake, Knell / Vigil, Watch, Keep / Mound, Mass, Seethe. Culture labels: Fen-dwellers, Tunnellers, The Unquiet, Light-keepers, **Comb-builders** (was "Devourers", a StarCraft Zerg unit). Also the culture blocks and stat shifts of §3.7–§3.11, and the syllable tables of §8.2 after the THEME T10 collision run. The naming run's alternatives: Fen-hunters, Revenants, Still-minds, Land-eaters; group words Clutch/Mere/Fen/Bask and Skep/Comb/Cast/Throng. Yes / change.
21. **PE21** (scope narrowed in review) Add the coined words of §1.1 (Protoss, Zerg, Hydralisk, Pylon, Khala, Argonian, Tyranid, Xenomorph, Forerunner, Dwemer, Starborn, Hivekin and the rest) to THEME T10's banned-name check for all player text. The ordinary words (queen, hive, nest, spire, templar, carrier…) are banned only for the swarm's and the star-born's own names, castes, buildings and items, because "Queen" is a rank name in several proposed sets. Yes / no.
22. **PE22** If THEME T4 A with cold iron is chosen, the elves drop the iron dagger from their preferred arms. Yes / no.
23. **PE23** (new in review) The traits §3.1–§3.6 give the existing six peoples, which no VISION row covers. Sight and night sight: dwarves, gnomes and goblins see in the dark; elves see 10 cells. Need rates: elves nature 1.5, orcs hunger 1.4, gnomes social 1.2, and the rest. Goblins are active by night and climb walls and palisades, so a wall alone no longer keeps them out. Elves climb trees to the branches on +1. Dwarves and kobolds get the dig-down plan step; gnomes get burrow homes on −1. Yes / change / keep the existing six exactly like humans.

---

## 13. Evidence behind this file
- The catalog keys `people`, `cultures`, `factions`, `start`, `sites`, `objects`, `groundKinds`, `items.types`, `colony`, `skills.start`, `combat.people`, `wildlife.species` were read with Node on 2026-09-19 from the working-tree file (11:55).
- Code read: `UF_Factions.js` lines 85–199 (the roll, the `it.weight || 1` finding at 94 and 96, the player at the centre) and 240–330 (`habitable`, `cursedOk`, `preferredBiomes`); `UF_Colonists.js` lines 755–955 (mating, conception at 0.5, a 3-day pregnancy, the human baby, child and teen sheets, aging only to 18, the global sleep window) and line 272 (`sight = 8`); `docs/systems/UF_History.md` (founders counts, the campfire from `sites.founding.kind`, both global); `docs/systems/UF_Factions.md`.
- Stock figures: contact sheets and tinted previews made from the RPG Maker MZ install's sheets with a scratch Node script on 2026-09-19 and opened with the Read tool (§9). They are scratch files, not kept in the repo.
- Name searches (web, 2026-09-19; a search can miss things): "Glassfolk", "Lightkin", "the Teeming", "Teemers": no game race or faction found. "Starfallen": a race in a homebrew supplement on GM Binder. "Hivekin": used in the Roblox game Deepwoken. "Mound-folk": a folklore term for the hidden folk. From memory, not searched: Starfield's Starborn, Dragon Age's Blight and broodmothers, Warhammer's spawning pools, The Elder Scrolls' Hist, StarCraft's terms in §1.1.
- Chances of each people appearing (§8.1): a Node calculation from the proposed weights and `factions.count` [4, 7], 2026-09-19. The review recomputed three of them by hand (1/19 → 25.6%, 2/19 → 45.3%, 3/19 → 60.4%), which match.
- **Review, 2026-09-19.** Code read: `UF_Factions.js` 87–190 (the weight finding at 94 and 96 confirmed, the V18 forcing at 171–182, the player's pool at 184–190); `UF_History.js` 394–401 (`nameTable` reads `people[id].names`), 1294 and 1369 (other factions' founders are `ai: "wander"` persons); `UF_Colonists.js` 139–151 (`cultureOf` is the player's culture), 160–168 (`nameFor` uses `start.names`), 222–228 (clothing tiers for humans only), 761–942 (reproduction and aging, with `$Adam`/`$Eve` at 18); `UF_Skills.js` 281–295 and 305–327 (chainWeights 0 is honoured, favoured applies to fighting skills only); `UF_Sheet.js` 294–335 (faces fall back to a silhouette); `UF_World.js` 1706–1720 (a save holds the whole world state, factions included, so old automaton factions load as saved).
- **Review estimate** (scratch `relsim.js` in the session scratchpad; it replays UF_Factions' roll with a generic seeded random over 20 000 seeds, so the rates are estimates): "worlds where a pair with the undead or the swarm is allied (>=50): 2.67%; of them made allied by the V18 forcing: 2.41%" and "worlds where the player is given a non-playable people: 0.72%; the undead, star-born or swarm: 0.32%". With the forcing switched off in the script (its `--sabotage` run), the forced share printed 0.00% and the line "NONE forced alliances", so the counter can read both ways.
- **Review web checks** (2026-09-19; a web search is not a trademark search): the Devourer is a Brood War Zerg air unit (Liquipedia, StarCraft Wiki); the Fleet Beacon is a Protoss building (Liquipedia); the Hydralisk Den, Queen's Nest and Infestation Pit are Zerg buildings (Liquipedia, StarCraft Wiki); Falling Skies' Skitters are six-legged, insect-like aliens (Falling Skies Wiki, Wikipedia); SC2's Purifiers are robots the Protoss built in their own form (StarCraft Wiki). From memory, not searched: the Zerg Spire, Warcraft III's Crypt, the Purifiers' white-and-cyan look, Halo's Brutes, the 2009 game *Risen*.
- **Review images opened with Read:** `contact_Monster.png`, `contact_Evil.png`, `contact_SF_Monster.png`, `contact_Nature.png`, `contact_BigMonster2.png`, `tint_a.png`, `tint_b.png` (scratchpad `peoples/`). The §9 descriptions match what is visible, except that SF_Monster_6 tinted `#b8c878` still reads dark purple with red eyes, not olive.

## 14. What the review changed (2026-09-19)
- **IP:** "Devourers" (a Zerg unit) became "Comb-builders". The group words Den, Nest, Pit, Spire, Beacon, Vault, Lantern, Barrow, Crypt and Host became the naming run's clean sets. The caste "skitter" (Falling Skies) became "darter". PE14's adapting by diet (StarCraft's "essence" mechanic, which §1.1 already banned) became adapting to terrain and losses. §1.1 gained the missing StarCraft unit and building names, the Purifier/Forerunner look, the Zerg living-building look, the Tyranid and Aliens-queen looks, and "Skitters". The star-born art gained rules for near-white light along fracture lines and for constructs that never copy their makers. The swarm art gained an earthen mound and a termite-queen Dam. The swarm placeholders are marked as never-a-reference. PE21 now bans only coined words globally, so "Queen" stays usable in rank names.
- **Code facts:** §2.1 now says that only the player's faction lives; that `people[id].names` is read (for other factions' founders); that `skills.start.favoured` covers fighting skills only (kobold `mining` and star-born `crafting` removed); and that chainWeights 0 works (the swarm's 0.1 became 0). §7's "what a player sees" was rewritten: children look human, names come from `start.names`, and the non-playable fallback exists.
- **VISION consistency:** PE7 now recommends no new people playable in wave 0 (V87's eggs and no births). A V87 life guard was added as wave 1's first slice, due before every faction lives. The per-people start kit was dropped (V67). PE6 is marked as a change to V4. The undead's cursed land is no longer attributed to V87. The orc size change now depends on THEME T6 A: the "user's brief ('large')" it cited does not exist.
- **Relations:** V18's forcing can ally the undead or the swarm (2.4% of worlds, estimate), so PE10 and wave 1 now include a fix. The `relations_new_pairs` check was split so it cannot fail on the design's own data in wave 0; `never_allied`, `v87_life_guard` and `playable_fallback` were added. The pairs with the automaton were dropped as inert. starborn|dwarf is now listed as 0.
- **Accuracy:** construct size 44–48 (was 40–48); elves climb to +1's branches (the canopy is +2); `burrow` and `wade_bottom` are marked as new movement profiles; kobold theme honesty (the scaled body is generic fantasy, not folklore); "Tunnellers" in British spelling; raisers cannot start at magic 10 at all; bones from map `bones_pile` rise as humans; the undead campfire line no longer contradicts their night sight; the lizardfolk water rule is "preferred", not "guaranteed".
- **Merged from the naming run:** PE1 B "Sky-wrights", PE2 B "Teemkin", and the PE20 alternatives.
- **New decision:** PE23, the existing six peoples' new traits, which no VISION row covered.
