# CRAFTING: OSRS-style production with our own materials (VISION V63, V65, V66)

Written 2026-09-19 by Claude Code (design only: no code, catalog or art was changed for this file). User instruction, 2026-09-19: "Crafting should basically work like OSRS as well, albeit with different ores. The overall theme of this game is arthurian fantasy with scifi elements" (VISION V65, V66).

**Revised 2026-09-19 (review fixes B1, M1–M9).** The themed metals are one decision shared with THEME (P1 = THEME T17) and are down to two, with no fey metal. Wreck-metal is salvaged rather than mined or smelted. The calls and the experience payments now match UF_Skills as built (§3.12). Quality retirement lists every live reader (§5.10). Item numbers use UF_Combat's field names and name every check that changes (§5.2, §6.7). Gathered items drop on the resource's cell (D6). Every step of the default plan is level 1 (D13). The relic bench is reachable on every map (§1.2.1, §2.10). Our own numbers replace the OSRS-identical ones, subject to the new P21 (§3.13). Shape names are one list shared with THEME (P17 = T19). World features are one decision, THEME T16 B (P6).

**What this file is.** The full production design:
- every resource tier with its level, experience, respawn and place in the world;
- every processing chain (smelting, smithing, fletching, crafting, leatherwork, cooking, carpentry, masonry, building, healing);
- the formulas the job system runs, and the workshops;
- how material tiers feed the OSRS-style combat bonuses of V64;
- the catalog schema, the migration of every existing entry, and a phased build plan with art requests.

It is meant to be precise enough to build from without guessing. **This file owns the numbers of items and production:** every item's bonuses, attack speed, wield and wear levels, every level requirement and every experience value. Where one of those numbers here and the catalog later disagree, the catalog is wrong and gets fixed to this file. UF_Combat owns the combat formulas, the styles, the creature blocks and the balance review (D12).

**What it replaces.** `docs/design/COMBAT_CHAINS.md` (2026-09-18) keeps two things:
- Its chain shape: ore → bar → item at a workshop, hide → leather → armour, log → bow, shaft + head + feathers → arrow.
- Its workshop objects.

Its d20 numbers (dice, AC, soak, proficiency) and its random quality (§3) are retired. V64 replaced d20, and V66 replaces quality with material tiers (§5.10 lists every reference to remove).

**Owned elsewhere, used here.** The skill levels, the experience curve and the level-up display are UF_Skills' (V63, `docs/systems/UF_Skills.md`). The accuracy and damage formulas are UF_Combat's (V64, `docs/systems/UF_Combat.md`). This file uses these calls, exactly as UF_Skills builds them (UF_Skills.md → API):
- `UF.Skills.level(unit, id)` → 1–99.
- `UF.Skills.meets(unit, { skill, level })` → bool. Never `meets(unit, "mining", 14)`: a string argument passes every gate today (§3.12).
- `UF.Skills.add(unit, id, xp)`.
- `UF.Skills.rate(unit, jobType, job)` → the V63 work-speed multiplier (1 at level 1, 1.98 at 99). UF_Jobs multiplies every job's progress by it through the hook in UF_Skills.md → "Needs from others".

UF_Combat reads each item's `weapon`, `armor`, `shield` and `ammo` blocks (§5.2).

**The rule for names and numbers.** Mechanics follow OSRS; every name and number is ours (V64: "Our own numbers and names").
- **Names:** no OSRS material or item name is used: no runite, rune, mithril, adamant, "dragon" as a metal, rune essence, blurite, yew/maple/magic logs, snakeskin, hard leather, soft clay, arrowtips, OSRS fish or herb names. Real-world words (copper, tin, iron, silver, gold, oak, flax) are ordinary English.
- **Numbers:** the level ladders, experience values, bars per shape and item bonuses are our own (§3.13; P21 asks the user to confirm).
- **Banned words:** player-visible text never uses the AGENTS.md banned words. The catalog checker's list includes "Guardian" and "Fellowship", so neither may name an item.
- **Approval:** themed names are PROPOSALS until the user approves them (AGENTS rule 7, V65).

**Time units.** 1 beat = 1 second at ×1 (V46). 1 game hour = 60 beats = 1 real minute at ×1; 1 game day = 24 real minutes at ×1. "Hours" below are game hours.

---

## 0. Decisions: what needs the user, what this file decided

### 0.1 PROPOSALS (the user approves or picks; the recommended option is first)
Numbers are kept from the first draft so the review findings still point at the right rows. P2, P3 and P13 are withdrawn.

| # | PROPOSAL | Options (recommended first) | Where it matters |
|---|---|---|---|
| P1 | **The themed metal tiers and their names. One decision, also THEME T17**, which points here. | **A: two themed tiers, five metal tiers in all** (bronze, iron, steel, then the two). **Meteoric iron**, mined at fallen-star sites: name **thunder-iron** · heaven-iron · meteoric iron. **Wreck-metal**, the star-farers' hull metal, salvaged from wrecks (never mined or smelted from ore) and cut and worked only at the relic bench: name **wreck-metal** · hull-metal. · **B: three themed tiers**: A plus a middle tier mined from veins in hallowed (blessed) regions. It is not silver and not made by the fey, and its name is chosen and searched first. It would sit between steel and meteoric iron and shift the ladders of §5.1. | §1.2, §2.2, §2.3, §5 |
| P2 | *Withdrawn:* the fey metal. Merged into P1: A has no fey metal. A metal made by the fey reads as mithril (THEME §2.8), and "moonsilver" is one of the magical materials of the Exalted role-playing game. | – | – |
| P3 | *Withdrawn:* the relic alloy's name. Merged into P1. | – | – |
| P4 | Name of the mined fuel stone (id `coal`) | **coal** · pit coal · sea coal | §1.2, §2.1 |
| P5 | Themed trees (ids `feywood_tree`, `skywood_tree`) | Fey tree: **fairy thorn** · moonthorn · wildthorn. Sky tree: **starwood** · skyroot · glassbark. The real trees ash (woodcutting 12), elm (27) and ancient oak (42) need no name approval, but they are new content. | §1.3, §2.4, §2.8 |
| P6 | Where the themed resources come from | **Decided with THEME T16 B** (one decision; it is an exception to V31's "nothing is built"). Yes: a fallen-star site (§1.8) carries meteoric iron, the wreck, starwood, star-thistle and glowfin. No: the themed resources are rare outcrops and plants scattered in existing biomes (the "fallback" column in §1.8). | §1.8 |
| P7 | Wreck heaps (`relic_heap`) | **Finite per world: a stripped heap never comes back.** Every heap's last charge still gives a relic part (§1.2.1). · Heaps return after 7 game days like other ore. | §1.2.1 |
| P8 | Ore veins | **Deplete and return after a rest, as in OSRS** (times in §1.2). · Finite, as in DF: a worked-out outcrop becomes loose stones for good, as today. | §1.2 |
| P9 | V63's generic "faster work" and "extra produce" effects on gathering | **Gathering uses only the classic success model** (level raises the chance per attempt; one success gives one item) and ignores UF_Skills' speed multiplier and extra-yield roll. Crafting uses UF_Skills' speed multiplier. Farming harvests keep a level-based yield (the life-save roll, §1.7). The mechanism is §3.12 item 3. · Stack both: gathering gets the success model and V63's speed and extra-yield bonuses. | §3.3, §3.4, §3.12 |
| P10 | Gem names | **agate, garnet, carnelian, bloodstone (real stones), moonstone (fey), star-glass (sci-fi)** · the same with sky-crystal · the same with fallen-glass | §1.2, §2.5 |
| P11 | Jewellery | **Goods and gifts, plus circlets worn in the `head` slot; no new slots** · Add neck and ring slots (changes V49's five slots). | §2.5, §5.9 |
| P12 | Silver against the cursed dead | **Silver arrows get ×1.15 accuracy and max hit against creatures with `alignment: "cursed"`** (restless dead, ice wraith). · No special rule. | §5.7 |
| P13 | *Withdrawn:* fey metal smelted only at night. There is no fey metal under P1 A. | – | – |
| P14 | Top leather tier | **No new creature: bog-horror hide tops the ladder.** · Also add the white hart (a rare white deer of blessed regions, from the public-domain Arthurian legends, THEME T14), whose hide makes an extra fey leather at leatherwork 80. | §2.6 |
| P15 | Themed cloth | Fey cloth: **gossamer** · fey-silk. Relic cloth: **starcloth** · relic weave. | §2.5 |
| P16 | Themed fish and herbs | Fish: **glowfin** · lantern eel · star-perch. A web search on 2026-09-19 found a fish called "Watching Glowfin" in the Roblox game *Fisch*; the other two were not searched. Herbs: **moonwort** (a real fern with folklore) and **star-thistle** (also a real plant's name) · sky-nettle. | §1.4, §1.6 |
| P17 | **Item shape names. One list, also THEME T19**, which points here. | **High-medieval shapes, as THEME §1.2 sets the period (about 1100–1300):**<br>- Weapons: dagger, arming sword, falchion, mace, spear, longsword, war hammer, battle axe, war sword (a two-handed sword of war).<br>- Tools: knife, axe, hammer, pick.<br>- Metal armour: helm, great helm, hauberk (a mail shirt), coat of plates, greaves.<br>- Shields: buckler, kite shield, heater shield, round shield.<br>- Leather: cap, jerkin, leggings. Cloth: hood, tunic, breeches.<br>- Ranged: short bow, long bow, sling.<br>Two-word spellings throughout, never OSRS's one-word ones. It renames today's short sword → arming sword, long sword → longsword, iron mail → hauberk, leather armor → jerkin, iron shield → buckler, and wooden shield → round shield.<br>Later, not in C1: coif, padded coat (gambeson), kettle hat, surcoat, lance.<br>· Keep today's names and add the new shapes beside them. | §2.3, §5 |
| P18 | Tools for chopping and mining | **Mining and salvage need a pick. Chopping needs an axe, except on common trees, which bare hands can break down at half speed** (so the first hearth can be built before the first axe). · Tools optional everywhere, as today. | §3.2 |
| P19 | Random quality (V55) | **Retired entirely: an item is defined by its tier and shape.** Claude Code's reading of V66 is recorded in the VISION decision log; this asks the user to confirm it. UF_Skills and UF_Combat both read or write quality today (§5.10), so the V64 run has to agree before C1. · Keep tiers and also roll a quality. | §5.10 |
| P20 | Altar | **Not built now: it waits for a magic design** (V64's magic skill has no spells yet). · Build a plain altar now as a room piece with no recipes. | §4 |
| P21 | **Our own numbers** (V64 locks "our own numbers and names") | **A: every ladder, experience value, bar count and bonus is our own, derived by the rules of §3.13.** No level ladder, experience table or bonus table equals OSRS's (compared from memory, §3.13). · B: allow OSRS-identical numbers where the mechanic is the same. This amends V64's "our own numbers". | §1–§5, §3.13 |

**Name search for P1 (web search, 2026-09-19; a search can miss things).** Rejected names:
- "Sky-iron" is the meteoric metal of the armoured bears in Philip Pullman's *His Dark Materials*, a modern copyrighted work that also has a video game. The first drafts of this file and THEME recommended it.
- "Star iron" is mined at stone circles in *Unicorn Overlord* and is a metal in *StarCrafter*. "Star-Iron" is also on VISION's "Proposed but not approved" list.
- "Fallen iron" is a crafting material in *Final Fantasy XVI*.
- "Moonsilver" (the withdrawn P2) is one of the five magical materials of *Exalted* and a material in a D&D fan supplement.

Candidates for P1:
- **Thunder-iron:** no game material was found. It follows the old belief that thunderstones fall from the sky.
- **Heaven-iron:** no game material was found. Ancient Egyptian named meteoric iron "iron from the sky" (bia-n-pet).
- **Meteoric iron:** the real term. The Minecraft mod Galacticraft uses it, but a real-world term belongs to no game.
- **Wreck-metal:** no game item was found.
- **Hull-metal:** not searched.

### 0.2 Decisions made in this file (design, not lore; say so rather than hide them)
| # | Decision | Why |
|---|---|---|
| D1 | **Bronze replaces copper as the first metal.** 1 copper ore + 1 tin ore + fuel → 1 bronze bar. Copper bars are retired (COMBAT_CHAINS D1 and D2 no longer hold); the copper mace becomes the bronze mace. | A first tier made from two ores gives the start a second outcrop to find. |
| D2 | **Every tree the catalog has today is tier 1 ("common").** Oak, birch, pine, snow fir, palm, swamp tree, mangrove, flat-top, broadleaf giant, fruit tree, dead tree and blighted tree all yield `log` at woodcutting 1. New trees carry tiers 2–6. | The start kit places oaks and V35 needs work to begin at once. The approved oak art (style anchor 2) stays the everyday tree. Rainforest factions keep a choppable forest. |
| D3 | **Tiers are separate item types** (`falchion_steel`, `log_ash`), not a material field on a record. Stacks merge by type, as UF_Items does today. | OSRS model; no per-record fields to save or compare. |
| D4 | **Tier ids are neutral and stable:** `meteoric`, `relic` (wreck-metal), `feywood`, `skywood`. Display names come from the `tiers` table. | P1 and P5 can be answered or changed later without touching an item id, a recipe or a save. |
| D5 | **A failed iron smelt leaves one `slag` item** on the furnace's stand cell (V21: failures are physical). Slag has no use yet; it can be hauled away. | Visible failure, like a burnt fish. |
| D6 | **Each success drops its yield on the resource's own cell**, exactly where today's single yield lands. Haulers and the colonists' `fetch` move it from there. The job stops at its count, when the resource is spent, or when a need or an order interrupts it. *(Revised: the first draft put yields in the gatherer's inventory.)* | There is no carry limit (UF_Items.md, Known limits), so an inventory rule could never stop the job. `fetch` needs items on the ground (UF_Jobs.md line 26). A miner's pack would hide the ore from the smelter's step, and `jobs.travel_and_work` expects the logs on the oak's cell. |
| D7 | **The iron axe becomes one-handed** (the woodcutting tool); the two-handed axe is the new battle axe. COMBAT_CHAINS D5 is withdrawn. | OSRS axes are one-handed tools; the heavy weapon is its own shape. |
| D8 | **Objects are only appended to `catalog.objects`, never inserted or removed.** | UF_Objects stores each cell's object as `index + 1` in the saved grid; reordering would change what old saves show. |
| D9 | **Stumps regrow into saplings and saplings into a tree of the cell's biome** (`regrow.to: "@biome"`), rather than one stump type per tree. | Forests come back the DF way without 17 stump types; themed trees return only where their region allows (§1.3). |
| D10 | **Clothing has no level requirement to wear**; cloth garments carry magic bonuses only for when magic exists. | Everyone wears clothes (V36 tiers); magic has no content yet. |
| D11 | **Drops always drop.** A troll killed by anyone leaves its hide; the level gate is at the tanning rack, not at the kill. | OSRS model; no butchering skill gate for a soldier's kill. |
| D12 | **This file owns item numbers; UF_Combat owns formulas.** Every item's bonuses, attack speed, attack types, styles, hands, reach, range and wield/wear levels are set here. Items use UF_Combat's field names (§5.2). UF_Combat owns accuracy, max hit, styles, ticks, creature blocks and the balance review (tier matchups go to its reviewer). C1 replaces the weapon and armour numbers the V64 run wrote into the catalog, so the V64 run agrees before C1 (§6.7 C0). | The tier ladder generates about 170 items. One owner keeps their numbers consistent, and the combat checks list what changes (§6.7). |
| D13 | **The default plan needs no level above 1.** Every step a fresh band must do (building, crafting, smithing, fletching, leatherwork, hunting) is available at level 1, or has a level-1 fallback (`craftBest` lists, §3.9). Levels gate what comes after the plan. | A scratch run of the real `UF_Skills.startLevels` (2,000 bands of 8 adults per species, 2026-09-19) found that under the first draft's gates, many bands had nobody at the level. Hunting 20 for deer: human 65%, dwarf 80%, elf 46%, goblin 34%, gnome 91%, orc 26% of bands. Building 15 for the smithy: 24, 38, 65, 43, 65 and 54%. Building 10 for the furnace: 15, 27, 57, 32, 56 and 44%. Crafting 2 for the stone pick, the only way to mine under P18: 15–26%. V35 and V67 need work to begin at once. |
| D14 | **Wreck-metal is salvaged, not mined or smelted.** A `salvage` action on wreck heaps (the mining skill, since V63 has no salvage skill; a pick required) gives wreck-metal plates. The relic bench cuts plates into bars; no furnace is involved (§1.2.1, §2.2). | THEME pillar 4: "metal no smith can make". This is one acquisition model for both docs. |

---

## 1. Resources

### 1.1 How every gathering table reads
- **Level**: the skill level needed to try (`UF.Skills.meets(unit, { skill, level })`). Below it the job isn't offered and a designation reports "needs mining 13".
- **XP**: experience per success (never on a failed attempt). The rule behind each column is in §3.13.
- **Chance (low, high)**: the success chance per attempt at the requirement level and at level 99. In between it rises linearly and is capped at 100% (§3.1). A `high` above 1.00 means the chance reaches 100% before 99.
- **Charges**: successes before the resource is spent, rolled once per object from the seed when it's first worked.
- **Regrow**: the depleted state and when it turns back (existing `regrow` mechanism of UF_Objects, in game hours).
- **Cluster**: the existing `clump` / `clumpScale` placement fields (UF_WorldGen §3.6).

### 1.2 Mining (skill `mining`; tool: pick, required, P18)
Attempt every 3 beats of work (tool speed shortens it, §3.2). Every success also rolls the extras. XP = round(h × (15 + 1.6 × level)), where h is 1 for ore and gems, 0.4 for stone, 0.35 for clay and 0.5 for loose gems (§3.13).

| Object (status) | Item per success | Level | XP | Chance (low, high) | Charges | Depleted state → regrow | Extras per success |
|---|---|---|---|---|---|---|---|
| `copper_outcrop` (existing) | `ore_copper` | 1 | 17 | 0.45, 1.58 | 4–8 | `copper_outcrop_worked` → 2 h | stone 10%, gem 0.5% |
| `tin_outcrop` (new) | `ore_tin` | 1 | 17 | 0.45, 1.58 | 4–8 | `tin_outcrop_worked` → 2 h | stone 10%, gem 0.5% |
| `clay_bank` (new) | `clay` | 1 | 6 | 0.60, 1.95 | 6–12 | `clay_bank_worked` → 6 h | – |
| `granite_boulder` (existing, action `quarry`) | `stone` | 1 | 7 | 0.50, 1.76 | 3–6 | `rocks_small` (no regrow, as today) | – |
| `rubble_pillar` (existing, `quarry`) | `stone` | 1 | 7 | 0.50, 1.76 | 2–4 | nothing (as today) | – |
| `crystal_small` (existing, `pick`) | `gem_agate_uncut` | 1 | 8 | 0.50, 1.63 | 1 | nothing (as today) | – |
| `ironstone` (existing) | `ore_iron` | 13 | 36 | 0.40, 1.44 | 4–8 | `ironstone_worked` → 4 h | stone 10%, gem 0.5% |
| `bog_iron` (new) | `ore_iron` | 13 | 36 | 0.40, 1.44 | 2–4 | `bog_iron_worked` → 12 h | – |
| `silver_outcrop` (new) | `ore_silver` | 22 | 50 | 0.35, 1.29 | 3–6 | `silver_outcrop_worked` → 8 h | stone 10%, gem 0.5% |
| `crystal` (existing) | one uncut gem from the gem table below | 26 | 57 | 0.25, 0.99 | 2–4 | `crystal_small` (as today) | – |
| `coal_seam` (new) | `coal` | 29 | 61 | 0.35, 1.19 | 5–10 | `coal_seam_worked` → 6 h | stone 10% |
| `gold_outcrop` (existing) | `ore_gold` (was `gold`) | 37 | 74 | 0.30, 1.05 | 2–5 | `gold_outcrop_worked` → 12 h | gem 1% |
| `meteoric_outcrop` (new, P1) | `ore_meteoric` | 51 | 97 | 0.28, 0.81 | 3–6 | `meteoric_outcrop_worked` → 48 h | gem 2% (star-glass only) |
| `relic_heap` (new, P1; action `salvage`, §1.2.1) | `relic_scrap` (a wreck-metal plate) | 66 | 121 | 0.22, 0.55 | 3–6 | nothing (P7: finite); or `relic_heap_worked` → 168 h | `relic_fibre` 10%, `relic_parts` 5%; the last charge always gives 1 `relic_parts` |

Loose stones, gravel, rubble and old bones (`pick`) stay skill-free one-shot pickups, as today.

With P8's second option (finite veins), every `_worked` state is dropped and the outcrop becomes `rocks_small` as today.

**Gem table** (a `crystal` success, or the "gem" extra of an ore): weights agate 40, garnet 28, carnelian 18, bloodstone 10, moonstone 3 (×10 inside a blessed region), star-glass 1 (only inside a fallen-star site; weight 0 elsewhere). The item is the uncut gem (`gem_<id>_uncut`).

**Pacing check** (calculated with the curve UF_Skills uses, not measured in the game). The model: a miner who always works the best ore they can, with the best pick their level allows, never waits for a regrow, and never salvages (wreck heaps are finite). Results at ×1:

| Mining level | Pure work to reach it |
|---|---|
| 30 | about 2,000 beats (0.55 h) |
| 60 | about 4.4 h |
| 85 | about 32 h |
| 99 | about 102 h (12.7 h at ×8) |

Real colonists also walk, haul, eat and sleep, so a lifetime's work reaches the themed tiers only for dedicated miners, which is the point of V63's "keep them alive".

#### 1.2.1 Salvage (the wreck; D14, P7)
- **The action:** `salvage` on a `relic_heap`. It is a gather action with `skill: "mining"`, `level: 66`, `tool: "pick"`, `needsTool: true`, attempts every 3 beats, and the numbers in the table above. The right-click option reads "salvage" (V38).
- **Yield:** `relic_scrap`, a plate of wreck-metal. It is never smelted. The relic bench cuts it into bars (§2.2).
- **Relic parts** build the relic bench (§2.10), which needs 3. Every heap gives exactly one part on its last charge, plus a 5% chance on any other success. Sentinels (THEME T14) drop one more each (§1.5).
- **Parts per map** (a 100,000-trial scratch simulation, 2026-09-19):
  - One fallen-star site (6–10 heaps of 3–6 charges): at least 6 parts, mean 9.4.
  - The fallback of 6 heaps: at least 6, mean 7.1.
  - The first draft (8–16 heaps of 4–8 charges, 5% chance, bench cost 6): one field gave a mean of 3.6, and only 17% of maps reached 6.

### 1.3 Woodcutting (skill `woodcutting`; tool: axe; bare hands allowed on tier 1 at half speed, P18)
Attempt every 3 beats. A tree whose charges are spent becomes a `stump`, which can still be chopped for 1 common `log` (as today, bare hands allowed). XP = round(20 + 2 × level) (§3.13).

| Tier | Trees | Log item | Level | XP | Chance (low, high) | Logs (charges) |
|---|---|---|---|---|---|---|
| 1 common | `oak`, `pine`, `fir_snow` | `log` | 1 | 22 | 0.45, 1.58 | 3–5 |
| 1 common | `birch`, `tree_savanna`, `tree_swamp`, `mangrove`, `fruit_tree`, `fruit_tree_bare` | `log` | 1 | 22 | 0.45, 1.58 | 2–4 |
| 1 common | `tree_tropical` (broadleaf giant) | `log` | 1 | 22 | 0.45, 1.58 | 4–7 |
| 1 common | `palm`, `dead_tree` (+ `firewood` 50% extra), `tree_cursed` | `log` | 1 | 22 | 0.45, 1.58 | 1–2 |
| 2 | `ash_tree` (new) | `log_ash` | 12 | 44 | 0.40, 1.43 | 4–8 |
| 3 | `elm_tree` (new) | `log_elm` | 27 | 74 | 0.35, 1.19 | 5–9 |
| 4 | `ancient_oak` (new; larger than an oak, V44) | `log_ancient` | 42 | 104 | 0.30, 0.90 | 8–14 |
| 5 | `feywood_tree` (new, P5 "fairy thorn") | `log_feywood` | 57 | 134 | 0.25, 0.62 | 4–8 |
| 6 | `skywood_tree` (new, P5 "starwood") | `log_skywood` | 72 | 164 | 0.22, 0.50 | 4–8 |

**Regrowth (D9):**
- `stump` → `sapling` (new object, passable) after 72 h; `sapling` → a tree of the cell's biome after 144 h.
- The tree is picked from the biome's `plants` entries tagged `tree`, weighted by their chance, seeded by `hash32(seed, x, y, "regrow", count)`.
- `feywood_tree` can only be picked on a blessed cell, and `skywood_tree` only inside a fallen-star site.
- A player's designation may dig out a stump (`chop` it: 1 `log`, as today) to stop regrowth.

**Pacing check** (calculated, same model as mining): woodcutting 30 after about 0.4 h of pure chopping at ×1, 60 after 3.5 h, 85 after 26 h, 99 after 85 h at ×1 (10.6 h at ×8).

### 1.4 Fishing (skill `fishing`; job type `fish`, §3.7)
A fishing spot is any water cell of the listed kinds that a unit can stand beside (the `fish here` right-click option, V38).
- **Attempts:** one every 4 beats. Each attempt rolls the fish the unit can catch there, highest level first, and keeps the first success (OSRS's "try the best fish first").
- **Stock:** each water cell holds 3–6 catches, then rests 6 h (a sparse record, §3.10).
- Blighted water holds no fish.

| Fish | Raw item | Water kinds (`water.surface`) | Method (tool) | Level | XP | Chance (low, high) |
|---|---|---|---|---|---|---|
| Perch | `fish_perch` (was `fish`) | fresh, pond, marsh | line | 1 | 12 | 0.40, 1.20 |
| Sprat | `fish_sprat` | salt, deep, brackish | net | 4 | 16 | 0.45, 1.30 |
| Carp | `fish_carp` | pond, marsh, swamp, fresh | line | 10 | 26 | 0.35, 1.10 |
| Eel | `fish_eel` | swamp, marsh, brackish | trap | 18 | 36 | 0.35, 1.00 |
| Grayling | `fish_grayling` | fresh (rivers only) | line | 26 | 46 | 0.32, 0.95 |
| Mullet | `fish_mullet` | brackish, salt | net | 32 | 56 | 0.30, 0.90 |
| Char | `fish_char` | icy | line | 40 | 68 | 0.30, 0.85 |
| Haddock | `fish_haddock` | deep, salt | line | 48 | 82 | 0.28, 0.80 |
| Conger | `fish_conger` | deep | trap | 60 | 100 | 0.25, 0.70 |
| Glowfin (P16) | `fish_glowfin` | the pond of a fallen-star site (P6); fallback: icy and deep at one tenth of the weight | line | 74 | 130 | 0.20, 0.50 |

Tools (crafting, §2.5): `fishing_line` (line), `fishing_net` (net), `eel_trap` (trap). They are carried, not equipped.

### 1.5 Hunting (skill `hunting`)
- **Prey** (kinds grazer, vermin, flier) are hunted with the attempt model (§3.6).
- **Predators and animals that fight back** (`hunt.flees: false`) turn the hunt into a V64 fight, and the hunter gets the hunting XP on the kill as well as the combat XP.
- **Monsters** are fought, never "hunted"; their drops drop (D11).

New yields are in **bold**. Deer are at hunting 5, and hares give a bone, so bone needles and fishing lines are open at level 1 (D13).

| Species | Kind | Level | XP | Chance (low, high) | Yields |
|---|---|---|---|---|---|
| rat | vermin | 1 | 6 | 0.60, 1.20 | meat_raw 1 |
| hare | grazer | 1 | 22 | 0.40, 1.20 | meat_raw 1, hide 1, **bone 1** |
| fowl | grazer | 1 | 18 | 0.45, 1.20 | meat_raw 1, feathers 4 |
| deer | grazer | 5 | 30 | 0.35, 1.05 | meat_raw 3, hide 1, bone 2, **sinew 1** |
| songbird | flier | 5 | 24 | 0.35, 1.00 | meat_raw 1, feathers 2 |
| bat | flier | 8 | 20 | 0.30, 0.90 | nothing |
| fox | predator | 10 | 36 | 0.35, 1.00 | meat_raw 1, hide 1 |
| wild_sheep | grazer | 12 | 45 | 0.40, 1.10 | meat_raw 2, wool 1, **tallow 1** |
| arctic_fox | predator | 14 | 40 | 0.35, 1.00 | meat_raw 1, hide 1 |
| wildcat | predator | 18 | 50 | 0.30, 0.95 | meat_raw 1, hide 1 |
| jackal | predator | 22 | 58 | 0.30, 0.95 | meat_raw 1, hide 1 |
| hawk | flier | 25 | 64 | 0.25, 0.85 | meat_raw 1, feathers 3 |
| boar | grazer (fights back) | 28 | 90 | fight | meat_raw 3, **heavy_hide 1** (was hide), **tallow 1** |
| serpent | predator (fights back) | 32 | 80 | fight | meat_raw 1, **serpent_skin 1** (was hide) |
| wild_horse | grazer | 35 | 110 | 0.25, 0.85 | meat_raw 4, **heavy_hide 1** (was hide), **sinew 1** |
| wolf | predator (fights back) | 40 | 130 | fight | meat_raw 2, **heavy_hide 1** (was hide) |
| aurochs | grazer (fights back) | 45 | 160 | fight | meat_raw 6, **heavy_hide 2** (was hide 2), bone 3, **tallow 2**, **sinew 1** |
| troll | monster | – | – | fight | meat_raw 4, **troll_hide 2** (was hide 2) |
| giant_spider | predator | – | – | fight | meat_raw 1, **chitin 1**, **spider_silk 2** |
| sand_stalker | monster | – | – | fight | **chitin 2** |
| bog_horror | monster | – | – | fight | **bog_hide 1** |
| restless_dead, ice_wraith | monster | – | – | fight | bone 3 / nothing (unchanged) |
| sentinel (new, only with THEME T14 and T16 B; combat levels from the V64 run) | monster (machine) that stays at its fallen-star site | – | – | fight | **ore_meteoric 1–2, relic_parts 1** |

Snares and pit traps (OSRS Hunter's other half) are not in this design; they fit later as placed objects.

### 1.6 Foraging (skill `foraging`; no tool needed; a sickle speeds it, §3.2)
Attempt every 2 beats.

| Object (status) | Yields per success | Level | XP | Chance (low, high) | Charges | Afterwards |
|---|---|---|---|---|---|---|
| `grass_tuft`, `fern` (existing) | fiber 1 | 1 | 2 | 0.70, 1.50 | 1 | gone (as today) |
| `bush`, `desert_shrub`, `snow_bush` (existing) | fiber 1 | 1 | 3 | 0.70, 1.50 | 1–2 | gone (as today) |
| `reeds` (existing) | straw 1 | 1 | 3 | 0.70, 1.50 | 2 | gone (as today) |
| `berry_bush` (existing) | berries 1 | 1 | 8 | 0.60, 1.50 | 2–4 | `berry_bush_bare` → 48 h (as today) |
| `wild_grain` (existing) | seed_barley 1 + straw 1 | 1 | 5 | 0.60, 1.50 | 1 | gone |
| `yarrow_plant` (new) | yarrow 1 (+ seed_yarrow 25%) | 3 | 10 | 0.55, 1.40 | 1–2 | `yarrow_plant_picked` → 36 h |
| `wheat_wild` (existing) | seed_wheat 1 + straw 1 | 5 | 7 | 0.55, 1.40 | 1 | gone |
| `cactus` (existing) | fruit 1 | 6 | 10 | 0.50, 1.30 | 1 | gone |
| `cactus_tall` (existing; action `chop` becomes `gather`) | fiber 1 | 6 | 8 | 0.50, 1.30 | 2 | gone |
| `fruit_tree` (existing, `gather`) | fruit 1 | 8 | 14 | 0.50, 1.30 | 2–4 | `fruit_tree_bare` → 72 h (as today) |
| `wild_flax` (new) | flax 1 (+ seed_flax 30%) | 10 | 12 | 0.50, 1.30 | 1–2 | `wild_flax_picked` → 48 h |
| `mushrooms` (new) | mushroom 1 | 12 | 16 | 0.50, 1.30 | 1–3 | `mushrooms_picked` → 36 h |
| `comfrey_plant` (new) | comfrey 1 (+ seed 20%) | 14 | 22 | 0.45, 1.20 | 1–2 | picked → 48 h |
| `wild_roots` (new) | root 1 (+ seed_turnip 25%) | 15 | 18 | 0.45, 1.20 | 1–2 | picked → 48 h |
| `betony_plant` (new) | betony 1 (+ seed 20%) | 24 | 34 | 0.40, 1.10 | 1–2 | picked → 60 h |
| `vervain_plant` (new) | vervain 1 (+ seed 20%) | 36 | 48 | 0.35, 1.00 | 1–2 | picked → 72 h |
| `mandrake_plant` (new) | mandrake 1 (+ seed 20%) | 48 | 65 | 0.30, 0.90 | 1 | picked → 96 h |
| `moonwort_plant` (new, P16) | moonwort 1 (+ seed 20%) | 60 | 85 | 0.30, 0.80 | 1 | picked → 96 h |
| `feywood_tree` (`gather`) | gossamer 1 | 60 | 70 | 0.30, 0.80 | 1–2 | `feywood_tree_bare` → 48 h (still choppable) |
| `star_thistle` (new, P16) | star_thistle 1 (+ seed 20%) | 72 | 110 | 0.25, 0.70 | 1 | picked → 120 h |

Wildflowers, lily pads and lichen stay decorative.

### 1.7 Farming (skill `farming`)
- **Till:** `farm_plot` (existing object, no build today) gains `build: { items: {}, work: 3, skill: "farming", level: 1, xp: 3 }` (a designation "till here" or a plan step).
- **Plant:** new job type `plant` `{ seedId }` on an empty plot: needs the seed carried and the crop's level; gives the plant XP; the plot becomes `crop_<id>_1`.
- **Grow:** `crop_<id>_1` regrows into `crop_<id>_2` after half the grow time and into `crop_<id>_3` (ripe) after the other half (the existing regrow list; no new timer code).
- **Harvest:** a `gather` action on `crop_<id>_3`. Every attempt (2 beats) succeeds and yields 1 crop and the harvest XP.
  - The plot has `lives` charges. After each crop, a life-save roll with chance `save` keeps the life; otherwise one life is lost. `save` is low at the requirement and high at 99 (§3.1).
  - At 0 lives the plot returns to `farm_plot` and drops 1–2 seeds of the crop.
  - Expected crops per planting = lives ÷ (1 − save): 3 lives at 45% save give about 5.5 crops, at 75% about 12. This is farming's level-based yield (P9).
- Seasons, weeds, disease and watering are not in this design (DF has seasons; later).

| Crop | Seed item (first source) | Level | Plant XP | Harvest XP per crop | Grow (h) | Lives | Save (low, high) | Use |
|---|---|---|---|---|---|---|---|---|
| turnip | seed_turnip (wild roots) | 1 | 6 | 8 | 48 | 3 | 0.45, 0.75 | food, stew |
| barley | seed_barley (wild grain; was `seeds`) | 1 | 6 | 7 | 60 | 3 | 0.45, 0.75 | flour (2 → 1), straw 50% per crop |
| yarrow | seed_yarrow | 6 | 10 | 12 | 48 | 3 | 0.50, 0.80 | poultice |
| wheat | seed_wheat (wild wheat) | 8 | 10 | 11 | 72 | 3 | 0.45, 0.78 | flour, straw 50% per crop |
| flax | seed_flax (wild flax) | 12 | 13 | 14 | 72 | 3 | 0.45, 0.78 | linen thread, bowstrings |
| comfrey | seed_comfrey | 16 | 18 | 22 | 60 | 3 | 0.50, 0.80 | salve |
| betony | seed_betony | 26 | 28 | 34 | 72 | 3 | 0.50, 0.80 | draught |
| vervain | seed_vervain | 38 | 40 | 48 | 84 | 3 | 0.50, 0.80 | tonic |
| mandrake | seed_mandrake | 50 | 55 | 65 | 96 | 3 | 0.50, 0.80 | philtre |
| moonwort | seed_moonwort | 62 | 75 | 85 | 108 | 3 | 0.50, 0.80 | elixir; the plot must be on `blessed_grass` |
| star-thistle | seed_star_thistle | 74 | 95 | 110 | 120 | 3 | 0.50, 0.80 | serum; the plot must be inside a fallen-star site |

### 1.8 Where resources appear in the world
Chances are per land cell of the biome, added to `biomes.<id>.plants` (UF_WorldGen places them with the existing `clump`/`clumpScale` noise). Region rules extend `regions` (blessed/cursed/savagery), as wildlife already uses `minSavagery` and `alignment`.

| Object | Biomes and chance per cell | Region rule | Cluster (`clump`, `clumpScale`) | Rarity | Fallback when THEME T16 B is "no" |
|---|---|---|---|---|---|
| copper_outcrop | mountain 0.006, desert_rock 0.002 (existing); + desert_badland 0.002, shrubland_temperate 0.001 | – | 0.9, 24 (existing) | common in hills | – |
| tin_outcrop | mountain 0.005, desert_rock 0.002, tundra 0.002, shrubland_temperate 0.001 | – | 0.9, 24 | common in hills | – |
| clay_bank | marsh_temperate_fresh 0.010, marsh_tropical_fresh 0.006, swamp_temperate_fresh 0.004, desert_badland 0.006, lake_fresh (its land cells) 0.02 | – | 0.8, 10 | common by water | – |
| ironstone | mountain 0.02, desert_rock 0.004, desert_badland 0.005 (existing) | – | 0.9, 24 | common in hills | – |
| bog_iron | marsh_temperate_fresh 0.004, swamp_temperate_fresh 0.004, marsh_tropical_fresh 0.002 | – | 0.7, 12 | uncommon (lowland iron) | – |
| silver_outcrop | mountain 0.003, desert_badland 0.001, glacier 0.001 | – | 0.9, 30 | uncommon | – |
| coal_seam | mountain 0.008, desert_badland 0.005, tundra 0.002, taiga 0.001 | – | 0.95, 30 | common in seams | – |
| gold_outcrop | mountain 0.002, desert_badland 0.0015 (existing) | – | 0.9, 30 | rare | – |
| crystal | mountain 0.003, desert_badland 0.001 (existing); 1–3 in each fallen-star site | – | 0.8, 10 | rare | – |
| meteoric_outcrop | only on fallen-star site floors, 4–8 per site | site | – | very rare | glacier, tundra, mountain 0.0004 |
| relic_heap | only in the wreck at a fallen-star site's centre, 6–10 per site | site | – | unique per world | desert_badland, desert_rock, mountain 0.0003 |
| ash_tree | forest_temperate_broadleaf 0.012, forest_temperate_conifer 0.004, grassland_temperate 0.002, shrubland_temperate 0.002, savanna_temperate 0.002 | – | 0.6, 14 | common | – |
| elm_tree | forest_temperate_broadleaf 0.006, grassland_temperate 0.002, marsh_temperate_fresh 0.002 | – | 0.5, 12 | uncommon | – |
| ancient_oak | forest_temperate_broadleaf 0.0008, grassland_temperate 0.0003 | ×3 in primeval regions | 0, – (solitary) | rare | – |
| feywood_tree | any forest or meadow cell 0.003 | blessed only; primeval broadleaf and conifer 0.0004 | 0.6, 8 (groves) | very rare | same |
| skywood_tree | ring around each fallen-star site, 3–6 | site | – | very rare | 3–6 around each meteoric outcrop |
| yarrow_plant | grassland_temperate 0.004, shrubland_temperate 0.003, savanna_temperate 0.002 | – | 0.6, 8 | common | – |
| wild_flax | grassland_temperate 0.004, shrubland_temperate 0.002, grassland_tropical 0.002 | – | 0.7, 8 | common | – |
| mushrooms | forest_temperate_broadleaf 0.006, forest_temperate_conifer 0.005, taiga 0.003, swamp_temperate_fresh 0.004, forest_tropical_moist_broadleaf 0.004 | – | 0.7, 8 | common | – |
| wild_roots | grassland_temperate 0.004, forest_temperate_broadleaf 0.003, shrubland_temperate 0.003, savanna_temperate 0.002 | – | 0.6, 8 | common | – |
| comfrey_plant | forest_temperate_broadleaf 0.003, marsh_temperate_fresh 0.004 | – | 0.6, 8 | uncommon | – |
| betony_plant | forest_temperate_broadleaf 0.002, grassland_temperate 0.002 | – | 0.6, 8 | uncommon | – |
| vervain_plant | grassland_temperate 0.001, shrubland_temperate 0.001 | ×3 in blessed regions | 0.6, 8 | rare | – |
| mandrake_plant | shrubland_tropical 0.001, forest_tropical_dry_broadleaf 0.001 | ×3 in cursed regions | 0.5, 8 | rare | – |
| moonwort_plant | any grass or forest cell 0.004 | blessed only | 0.6, 8 | rare | same |
| star_thistle | fallen-star site floors and rims, 4–8 per site | site | – | very rare | 2–4 around each meteoric outcrop |

**Map minimums** (`start.mapKit.objects`, which UF_Roads already reads; placement by UF_WorldGen is phase C3):
- **Always:** tin_outcrop 5, coal_seam 6, silver_outcrop 3, clay_bank 6, bog_iron 3, ash_tree 20, elm_tree 12, ancient_oak 4, yarrow_plant 10, wild_flax 10, mushrooms 10, wild_roots 10, comfrey_plant 6, betony_plant 4.
- **With T16 B "yes":** the fallen-star sites guarantee the themed resources (at least one site per map).
- **With T16 B "no":** meteoric_outcrop 3, relic_heap 6, feywood_tree 4, skywood_tree 3, moonwort_plant 3, star_thistle 2.

**Start kit** (`start.kit.objects`, every faction area, radius 5–20): add copper_outcrop 1, tin_outcrop 1 and clay_bank 1, so every band can reach bronze without a long trek (V35), and bones_pile 2, so every band has bone for its needles even where no prey herd lives nearby (D13). Today the kit's prey herd is placed near the player's area only (catalog `start.kit.wildlife`).

**The fallen-star site** (a sci-fi element of V65; it exists only if the user says yes to THEME T16 B, the one decision on world features at generation, an exception to V31):

| Count per map | Radius (cells) | Placed | Ground | Contents |
|---|---|---|---|---|
| 1–2, at least 1 | 5–8 | on land, not on water or a rock face, at least 30 cells from every faction area centre, seeded | floor `crater_glass` (new ground kind: fused, glassy earth), rim `scree` | the wreck at the centre (relic_heap 6–10); meteoric_outcrop 4–8 and crystal 1–3 on the floor; star_thistle 4–8 on the floor and rim; skywood_tree 3–6 on the rim; with 40% chance a small pond (`pond` water) on the floor, where glowfin live; with THEME T14's sentinel, 2–4 sentinels that stay on the site |

Placement is one seeded pass in UF_WorldGen after the object pass (catalog `features`, §6.1). Nothing about who crashed or fell is written anywhere; the sci-fi backstory stays unwritten until the user approves one (V65, THEME T1). THEME T16 B also lists vaults, standing stones, barrows and a glass tower. They carry no V66 resources and are designed with relics (THEME T18) and magic (THEME T20).

---

## 2. Processing

### 2.1 Fuel
Items tagged `fuel` carry a `heat`: `log` 1, `firewood` 1, `charcoal` 2, `coal` 3. A recipe with `fuel: { count, heat }` consumes `count` fuel items whose heat is at least `heat`, lowest heat first. Recipes that list coal as an input (the meteoric bar) need no other fuel.

### 2.2 Smelting (skill `smithing`, labor `furnace_operator`, at the `furnace`; work 3 beats)
XP per bar = round(4 + 0.5 × level) (§3.13).

| Recipe | Inputs | Fuel | Output | Level | XP | Success |
|---|---|---|---|---|---|---|
| `charcoal` | 3 firewood | – | 2 charcoal | 1 | 3 | always |
| `smelt_bronze` | 1 ore_copper + 1 ore_tin | 1 (heat 2) | bar_bronze | 1 | 5 | always |
| `smelt_iron` | 1 ore_iron | 1 (heat 2) | bar_iron | 17 | 13 | 60% at level 17, rising linearly to 100% at 50; a failure leaves 1 `slag` and gives 0 XP (D5) |
| `smelt_silver` | 1 ore_silver | 1 (heat 2) | bar_silver | 21 | 15 | always |
| `make_steel` | 1 bar_iron + 1 coal | 1 (heat 2) | bar_steel | 34 | 21 | always (steel is iron re-melted with coal, not smelted from ore) |
| `smelt_gold` | 1 ore_gold | 1 (heat 2) | bar_gold | 38 | 23 | always |
| `smelt_meteoric` | 1 ore_meteoric + 2 coal | – | bar_meteoric | 53 | 31 | always |
| `cut_relic` | 2 relic_scrap | – | bar_relic ("wreck-metal bar", P1) | 72 | 40 | always; at the `relic_bench`, cut, not smelted (D14) |

### 2.3 Smithing (skill `smithing`; at the `smithy` anvil, wreck-metal at the `relic_bench`; a hammer must be carried)
- **Labor:** `weaponsmith` for weapons, tools, arrowheads, nails and fittings; `armorsmith` for armour and shields.
- **Work:** 4 beats per bar in the recipe.
- **Item id:** `<shape>_<tier>`, for example `falchion_steel`. The name is the tier name plus the shape name: "Steel falchion", or "Thunder-iron falchion" under P1 A.

**Level = the tier's base + the shape's offset; XP = bars × the tier's XP per bar,** where XP per bar = round(9 + 0.9 × base) (§3.13).
| Tier | Base level | XP per bar |
|---|---|---|
| bronze | 1 | 10 |
| iron | 17 | 24 |
| steel | 34 | 40 |
| meteoric (P1) | 53 | 57 |
| wreck-metal (P1; id `relic`) | 72 | 74 |

Every recipe, as level / XP. Nails and fittings are made from bronze or iron only and give the same item whichever bar is used. Batches come in dozens (§3.13).

| Shape | Bars | Other input | Offset | bronze | iron | steel | meteoric | wreck-metal |
|---|---|---|---|---|---|---|---|---|
| knife (tool) | 1 | – | +0 | 1 / 10 | 17 / 24 | 34 / 40 | 53 / 57 | 72 / 74 |
| dagger | 1 | – | +0 | 1 / 10 | 17 / 24 | 34 / 40 | 53 / 57 | 72 / 74 |
| axe (tool) | 1 | 1 log | +1 | 2 / 10 | 18 / 24 | 35 / 40 | 54 / 57 | 73 / 74 |
| hammer (tool) | 1 | 1 log | +1 | 2 / 10 | 18 / 24 | 35 / 40 | 54 / 57 | 73 / 74 |
| helm | 1 | – | +1 | 2 / 10 | 18 / 24 | 35 / 40 | 54 / 57 | 73 / 74 |
| arming sword | 1 | – | +2 | 3 / 10 | 19 / 24 | 36 / 40 | 55 / 57 | 74 / 74 |
| arrowheads ×12 | 1 | – | +2 | 3 / 10 | 19 / 24 | 36 / 40 | 55 / 57 | 74 / 74 |
| nails ×12 | 1 | – | +3 | 4 / 10 | 20 / 24 | – | – | – |
| spear | 1 | 1 spear_shaft | +3 | 4 / 10 | 20 / 24 | 37 / 40 | 56 / 57 | 75 / 74 |
| fittings ×4 | 1 | – | +4 | 5 / 10 | 21 / 24 | – | – | – |
| mace | 2 | – | +4 | 5 / 20 | 21 / 48 | 38 / 80 | 57 / 114 | 76 / 148 |
| pick (tool) | 2 | 1 log | +4 | 5 / 20 | 21 / 48 | 38 / 80 | 57 / 114 | 76 / 148 |
| falchion | 2 | – | +5 | 6 / 20 | 22 / 48 | 39 / 80 | 58 / 114 | 77 / 148 |
| great helm | 2 | – | +6 | 7 / 20 | 23 / 48 | 40 / 80 | 59 / 114 | 78 / 148 |
| longsword | 2 | – | +7 | 8 / 20 | 24 / 48 | 41 / 80 | 60 / 114 | 79 / 148 |
| buckler | 2 | – | +7 | 8 / 20 | 24 / 48 | 41 / 80 | 60 / 114 | 79 / 148 |
| war hammer | 2 | 1 log | +8 | 9 / 20 | 25 / 48 | 42 / 80 | 61 / 114 | 80 / 148 |
| greaves | 3 | – | +9 | 10 / 30 | 26 / 72 | 43 / 120 | 62 / 171 | 81 / 222 |
| kite shield | 3 | – | +10 | 11 / 30 | 27 / 72 | 44 / 120 | 63 / 171 | 82 / 222 |
| battle axe | 3 | 1 log | +11 | 12 / 30 | 28 / 72 | 45 / 120 | 64 / 171 | 83 / 222 |
| hauberk | 4 | – | +12 | 13 / 40 | 29 / 96 | 46 / 160 | 65 / 228 | 84 / 296 |
| heater shield | 3 | – | +13 | 14 / 30 | 30 / 72 | 47 / 120 | 66 / 171 | 85 / 222 |
| war sword | 3 | – | +14 | 15 / 30 | 31 / 72 | 48 / 120 | 67 / 171 | 86 / 222 |
| coat of plates | 4 | – | +15 | 16 / 40 | 32 / 96 | 49 / 160 | 68 / 228 | 87 / 296 |

Also at the smithy:
- **Silver arrowheads** ×12: 1 bar_silver, level 22, 15 XP.
- **Untiered utility tools**, made from a bronze or an iron bar (the same item either way; XP by the bar):

| Tool | Bars | Level (bronze / iron) |
|---|---|---|
| chisel | 1 | 2 / 18 |
| sickle | 1 + 1 log | 3 / 19 |
| saw | 2 | 4 / 20 |

### 2.4 Fletching (skill `fletching`)
A knife must be carried. Labor `fletcher` for shafts and arrows, at the `fletcher_bench`; `bowyer` for bows, at the `bowyer_bench`. Work 2 beats.

**Shafts** (1 log → shafts; level = the wood's woodcutting level; XP per log = round(4 + 0.35 × level)):

| Log | Shafts | Level | XP per log |
|---|---|---|---|
| common | 12 | 1 | 4 |
| ash | 18 | 12 | 8 |
| elm | 24 | 27 | 13 |
| ancient | 30 | 42 | 19 |
| feywood | 36 | 57 | 24 |
| skywood | 42 | 72 | 29 |

**Fletched shafts:** 12 arrow_shaft + 12 feathers → 12 fletched_shaft (level 1, 12 XP).

**Arrows:** 12 fletched_shaft + 12 heads → 12 arrows. XP per dozen = round(12 × (1 + 0.1 × level)). Stone and bone heads are knapped (crafting, §2.5); metal heads are smithed (§2.3).
| Arrows | Heads | Level | XP per 12 |
|---|---|---|---|
| arrows_stone | stone_heads | 1 | 13 |
| arrows_bone | bone_heads | 3 | 16 |
| arrows_bronze | arrowheads_bronze | 6 | 19 |
| arrows_iron | arrowheads_iron | 18 | 34 |
| arrows_silver | arrowheads_silver | 22 | 38 |
| arrows_steel | arrowheads_steel | 33 | 52 |
| arrows_meteoric | arrowheads_meteoric | 50 | 72 |
| arrows_relic | arrowheads_relic | 68 | 94 |

**Bows:** cut 1 log of the wood tier into an unstrung bow (`bow_short_<wood>_u`, `bow_long_<wood>_u`), then string it with 1 `bowstring` (crafting, §2.5) at the same level for the same XP again. XP: short round(6 + 1.1 × level), long round(8 + 1.3 × level). The common bows need no training (D13).
| Wood | Short bow level / XP (cut, and again to string) | Long bow level / XP |
|---|---|---|
| common | 1 / 7 | 1 / 9 |
| ash | 14 / 21 | 18 / 31 |
| elm | 29 / 38 | 33 / 51 |
| ancient | 44 / 54 | 48 / 70 |
| feywood (P5) | 59 / 71 | 63 / 90 |
| skywood (P5) | 74 / 87 | 78 / 109 |

### 2.5 Crafting (skill `crafting`)
**Knapping** (anywhere, or at the `workbench`; work 3 beats):
| Recipe | Inputs | Output | Level | XP |
|---|---|---|---|---|
| stone_knife (existing) | 1 stone + 1 fiber | stone_knife | 1 | 8 |
| stone_axe (existing) | 2 stone + 1 log + 1 fiber | stone_axe | 1 | 12 |
| stone_pick (existing) | 2 stone + 1 log + 1 fiber | stone_pick | 1 | 12 |
| stone_hammer (new) | 1 stone + 1 log + 1 fiber | stone_hammer | 1 | 12 |
| stone_heads | 1 stone | 12 stone_heads | 1 | 5 |
| bone_heads | 1 bone | 12 bone_heads | 3 | 8 |
| bone_needle | 1 bone | bone_needle (tool `needle`) | 1 | 4 |
| fishing_line | 2 twine + 1 bone | fishing_line | 1 | 8 |
| fishing_net | 6 twine | fishing_net | 8 | 20 |
| eel_trap | 4 straw + 1 log | eel_trap | 16 | 30 |

**Spinning** (a `spindle` carried, from carpentry §2.8; anywhere; work 2 beats). Level and XP in brackets:
- twine ← 2 fiber (1, 1 XP)
- linen_thread ← 1 flax (5, 3)
- yarn ← 1 wool (14, 5)
- silk_thread ← 1 spider_silk (30, 9)
- gossamer_thread ← 1 gossamer (48, 15; P15)
- **bowstring** ← 2 twine (1, 6), or ← 1 sinew (8, 10), or ← 1 linen_thread (10, 12). It is the same item from any of the three.

**Weaving** (at the `loom`; work 3 beats):
- linen_cloth ← 2 linen_thread (10, 12)
- wool_cloth ← 2 yarn (18, 20)
- silk_cloth ← 2 silk_thread (34, 36)
- gossamer_cloth ← 2 gossamer_thread (52, 55)
- starcloth ← 2 relic_fibre, at the `relic_bench` (66, 80; P15)

**Tailoring** (a needle carried; anywhere; 1 twine per garment; work 3 beats): hood (1 cloth, `head`), breeches (2 cloth, `legs`), tunic (3 cloth, `torso`). The woven wrap stays (6 fiber, level 1, 15 XP, `torso`, clothing tier 1).
| Cloth | Hood level / XP | Breeches | Tunic |
|---|---|---|---|
| linen | 12 / 15 | 13 / 25 | 15 / 40 |
| wool | 20 / 25 | 21 / 40 | 24 / 65 |
| silk | 36 / 45 | 38 / 70 | 42 / 110 |
| gossamer (P15) | 54 / 70 | 56 / 110 | 60 / 170 |
| starcloth (P15) | 68 / 100 | 70 / 160 | 74 / 240 |

Every tunic sets clothing tier 3 (the "tailored" walk sheet, V36).

**Pottery:** shape clay at the `workbench` (an unfired item `<id>_unfired`), then fire it at the `kiln` (fuel 1, heat 1). Work 3 beats each.
| Item | Clay | Shape level / XP | Fire XP | Used for |
|---|---|---|---|---|
| bowl | 1 | 1 / 5 | 6 | stew, salve |
| ring_mould | 1 | 5 / 6 | 6 | jewellery |
| cooking_pot | 2 | 6 / 8 | 10 | pottage (a carried tool at the hearth) |
| jug | 2 | 10 / 10 | 12 | water for dough and remedies (`fill` job, §3.8) |
| pendant_mould | 1 | 10 / 8 | 8 | jewellery |
| bricks ×4 | 2 | 12 / 10 | 12 | brick walls, the kitchen hearth |
| pie_dish | 1 | 14 / 12 | 14 | pies |
| circlet_mould | 2 | 16 / 12 | 12 | jewellery |

**Gem cutting** (a chisel carried; anywhere; work 2 beats): `gem_<id>_uncut` → `gem_<id>`: agate 1 / 15 XP, garnet 16 / 35, carnelian 28 / 55, bloodstone 40 / 75, moonstone 54 / 100, star-glass 68 / 140 (P10).

**Jewellery** (at the `furnace`, the mould carried; work 3 beats; P11):
| Piece | Bars | Silver level / XP | Gold level / XP | Slot |
|---|---|---|---|---|
| ring | 1 | 8 / 18 | 20 / 25 | none (goods) |
| pendant | 1 | 14 / 25 | 26 / 35 | none (goods) |
| circlet | 2 | 20 / 40 | 34 / 55 | `head` (§5.9) |

A gem-set piece adds 1 cut gem: level = max(the piece's level, the gem's cutting level + 4), XP = the piece's XP + the gem's cutting XP. Ids: `ring_silver`, `ring_gold_garnet`, `circlet_silver_moonstone`, … (3 shapes × 2 metals × 7 = 42 items).

### 2.6 Leatherwork (skill `leatherwork`)
**Tanning** (at the `tanning_rack`; a knife speeds it; labor `tanner`; work 3 beats):
| Raw | From | Leather | Level | XP |
|---|---|---|---|---|
| hide | hare, fox, arctic fox, wildcat, jackal, deer | leather | 1 | 5 |
| heavy_hide | boar, wild horse, wolf, aurochs | thick_leather ("boiled leather" when made up) | 14 | 10 |
| serpent_skin | serpent | serpent_leather | 28 | 18 |
| troll_hide | troll | troll_leather | 42 | 30 |
| chitin | giant spider, sand stalker | cured_chitin | 56 | 42 |
| bog_hide | bog horror | bog_leather | 70 | 58 |
| (P14 option b) hart_hide | white hart | hart_leather | 80 | 75 |

**Pieces** (at the `workbench`; a needle carried; 1 twine each; labor `leatherworker`; work 4 beats): cap (1 leather, `head`), leggings (2, `legs`), jerkin (3, `torso`). Plain leather pieces are all level 1, so a fresh band finishes its `armor` step (D13).
| Leather | Cap level / XP | Leggings | Jerkin | Wear needs ranged |
|---|---|---|---|---|
| leather | 1 / 14 | 1 / 22 | 1 / 30 | 1 |
| boiled (thick) | 16 / 26 | 19 / 40 | 23 / 55 | 5 |
| serpent | 30 / 45 | 33 / 68 | 37 / 90 | 12 |
| troll | 44 / 70 | 47 / 105 | 51 / 140 | 25 |
| chitin | 58 / 100 | 61 / 150 | 65 / 200 | 38 |
| bog | 72 / 140 | 75 / 210 | 79 / 280 | 52 |

Also: hide_cloak (existing: 2 hide + 2 fiber, level 1, 20 XP, clothing tier 2) and sling (1 leather + 2 twine, level 4, 15 XP). Every jerkin sets clothing tier 3.

### 2.7 Cooking (skill `cooking`; at the `campfire` (tag `fire`) or the kitchen `hearth` (tags `range` and `fire`); work 3 beats)
**Burning.**
- At the requirement level, a dish burns with chance 0.60 on a campfire and 0.50 at a hearth.
- The chance falls linearly to 0 at the dish's stop level for that station: `burn(L) = b0 × max(0, stop − L) / (stop − level)`.
- A burnt dish becomes `burnt_food` (inedible) and gives 0 XP. A stop level above 99 means the dish never stops burning there.
- Bread and pies need the hearth (its oven).

XP per dish = round(20 + 1.6 × level) (§3.13).

| Dish | Inputs | Level | XP | Heals (HP) | Hunger | Stop: campfire / hearth |
|---|---|---|---|---|---|---|
| Roast meat (`meat_cooked`, existing) | meat_raw | 1 | 22 | 3 | 50 | 32 / 28 |
| Cooked perch | fish_perch | 1 | 22 | 3 | 25 | 30 / 26 |
| Cooked sprat | fish_sprat | 4 | 26 | 4 | 25 | 34 / 30 |
| Bread | dough | 8 | 33 | 5 | 45 | – / 36 |
| Cooked carp | fish_carp | 10 | 36 | 6 | 30 | 42 / 38 |
| Pottage | 2 turnip + 1 barley, cooking_pot carried | 14 | 42 | 7 | 55 | 46 / 42 |
| Cooked eel | fish_eel | 18 | 49 | 8 | 30 | 52 / 48 |
| Stew | meat_raw + root or turnip + bowl | 24 | 58 | 10 | 70 | 58 / 54 |
| Cooked grayling | fish_grayling | 26 | 62 | 9 | 35 | 60 / 56 |
| Cooked mullet | fish_mullet | 32 | 71 | 10 | 35 | 66 / 62 |
| Cooked char | fish_char | 40 | 84 | 12 | 40 | 74 / 70 |
| Meat pie (2 servings) | flour + meat_raw + pie_dish | 44 | 90 | 7 per serving | 40 per serving | – / 76 |
| Cooked haddock | fish_haddock | 48 | 97 | 14 | 45 | 82 / 78 |
| Cooked conger | fish_conger | 60 | 116 | 17 | 50 | 94 / 90 |
| Cooked glowfin (P16) | fish_glowfin | 74 | 138 | 21 | 55 | 104 / 96 |

Preparation (no burn):
- **Flour** at the `quern`: 1 wheat or 2 barley → 1 flour (level 1, 1 XP).
- **Dough:** 1 flour + 1 jug of water → 1 dough + 1 jug (level 1, 1 XP).

Existing foods eaten raw (berries, fruit, mushroom, root, turnip) heal 1 HP. Brewing (a V43 labor) is not in this design.

### 2.8 Carpentry (skill `carpentry`; at the `carpenter_bench`; a saw and a hammer carried (planks need only the saw); labor `carpenter`; work 4 beats)
Planks of a wood tier are at that wood's woodcutting level.
| Product | Inputs | Level | XP |
|---|---|---|---|
| plank | 1 log | 1 | 8 |
| club (existing) | 1 log | 1 | 8 |
| spindle | 1 log | 1 | 4 |
| spear_shaft | 1 log | 3 | 6 |
| chair | 2 plank + 4 nails | 4 | 20 |
| round shield (`shield_round`, was `shield_wood`) | 2 plank + 1 leather | 5 | 20 |
| quarterstaff | 1 log | 8 | 12 |
| table | 3 plank + 4 nails | 8 | 30 |
| plank_ash | 1 log_ash | 12 | 16 |
| bed_frame | 4 plank + 6 nails | 12 | 45 |
| chest | 4 plank + 1 fittings | 16 | 55 |
| door_leaf | 3 plank + 1 fittings + 4 nails | 18 | 60 |
| reinforced round shield (`shield_round_ash`) | 3 plank_ash + 1 fittings | 20 | 55 |
| barrel | 4 plank + 1 fittings | 22 | 65 |
| shelf | 5 plank + 6 nails | 26 | 75 |
| plank_elm | 1 log_elm | 27 | 26 |
| plank_ancient | 1 log_ancient | 42 | 40 |
| fine table | 3 plank_ancient + 4 nails | 45 | 120 |
| fine bed frame | 4 plank_ancient + 6 nails | 50 | 160 |
| plank_feywood | 1 log_feywood | 57 | 58 |
| plank_skywood | 1 log_skywood | 72 | 80 |

Feywood and skywood planks have no furniture yet. They wait for later rooms and the magic design; a later file adds their uses.

### 2.9 Masonry (skill `masonry`; at the `mason_bench`; a hammer and a chisel carried; labor `mason`; work 5 beats)
| Product | Inputs | Level | XP | Used for |
|---|---|---|---|---|
| dressed_stone | 1 stone | 1 | 10 | walls, benches, hearth |
| flagstone ×2 | 1 stone | 5 | 12 | flagstone floors (V56) |
| quern (item, placed by building) | 3 stone | 10 | 35 | flour |
| grave_marker | 4 dressed_stone | 15 | 50 | burials (later) |
| carved_pillar | 3 dressed_stone | 25 | 70 | room value (later) |
| statue | 6 dressed_stone | 30 | 120 | room value (later) |
| altar_stone | 8 dressed_stone | 35 | 150 | the altar (P20) |

### 2.10 Building (skill `building`; the existing `build` job; labor `builder`)
Every buildable object gains `build.level` and `build.xp` (and `build.skill` when it isn't `building`). Work is the object's existing `build.work`. Placing a finished furniture item uses the same job with the item as the material.

Everything the default plan builds is level 1 (D13). The band's own builds earn about 277 building XP in total (13 palisades × 12, plus beds and benches), short of the 1,154 XP that level 10 needs.

| Structure | Object id (status) | Level | Materials | XP |
|---|---|---|---|---|
| Stockpile | stockpile (existing) | 1 | – | 0 |
| Campfire | campfire (existing) | 1 | 3 log + 3 stone | 20 |
| Straw bed | floor_straw (existing) | 1 | 2 straw | 8 |
| Palisade wall | wall_wood (existing) | 1 | 1 log | 12 |
| Work stone | workbench (existing) | 1 | 2 stone + 1 log | 15 |
| Rush floor | ground kind floor_rushes (existing, V56) | 1 | 2 straw | 4 |
| Tanning rack | tanning_rack (existing) | 1 | 3 log + 2 fiber | 20 |
| Bowyer's bench | bowyer_bench (existing) | 1 | 2 log | 25 |
| Fletcher's bench | fletcher_bench (existing) | 1 | 2 log + 1 stone | 25 |
| Weapon rack | weapon_rack (existing) | 1 | as today | 15 |
| Furnace | furnace (existing) | 1 | 6 stone | 50 |
| Smithy (anvil) | smithy (existing) | 1 | 4 stone + 1 log + 3 bar_bronze (was 1 bar_iron) | 60 |
| Rough wooden door | door_wood (existing) | 3 | 1 log | 12 |
| Kiln | kiln (new) | 3 | 8 stone + 2 clay | 50 |
| Plank floor | ground kind floor_wood (existing) | 4 | 1 log (as today; UF_Floors and `cultures.*.floor` unchanged) | 10 |
| Carpenter's bench | carpenter_bench (new) | 6 | 4 log + 1 stone | 30 |
| Flagstone floor | ground kind floor_stone (existing) | 8 | 1 stone (as today; flagstones from masonry are an alternative input) | 14 |
| Stone wall | wall_stone (existing) | 10 | 2 stone | 20 |
| Quern | quern (new) | 10 | 1 quern item | 20 |
| Mason's bench | mason_bench (new) | 12 | 4 stone + 1 log | 35 |
| Loom | loom (new) | 16 | 4 plank + 6 nails + 4 twine | 55 |
| Stone door | door_stone (existing) | 18 | 2 stone | 30 |
| Herbalist's table | herb_table (new) | 20 | 3 plank + 2 dressed_stone | 50 |
| Plank wall | wall_plank (new) | 20 | 2 plank + 4 nails | 35 |
| Wooden bed | bed_wood (new) | 20 | 1 bed_frame + 2 straw | 40 |
| Chair, table, chest, barrel, shelf | furniture objects (new, one each) | the item's carpentry level | the item | 10 |
| Kitchen hearth | hearth (new) | 22 | 6 dressed_stone + 4 bricks | 80 |
| Plank door | door_plank (new) | 22 | 1 door_leaf | 40 |
| Ashlar wall (dressed stone) | wall_ashlar (new) | 30 | 2 dressed_stone | 45 |
| Brick wall | wall_brick (new) | 34 | 6 bricks | 50 |
| Altar | altar (P20, not now) | 35 | 1 altar_stone + 2 bar_gold | 150 |
| Iron-bound door | door_ironbound (new) | 38 | 1 door_leaf + 2 fittings | 70 |
| Fine bed | bed_fine (new) | 45 | 1 fine bed frame + 2 wool_cloth | 110 |
| Castle wall (crenellated) | wall_castle (new) | 50 | 4 dressed_stone | 90 |
| Castle gate | gate_castle (new) | 55 | 2 door_leaf + 4 fittings + 6 dressed_stone | 150 |
| Relic bench | relic_bench (new, P1) | 65 | 3 relic_parts + 4 dressed_stone + 2 bar_steel | 200 |
| Farm plot (till) | farm_plot (existing) | farming 1 | – | 3 farming XP |

Door hit points (V57) rise with the material: rough wood 20, plank 30, stone 40, iron-bound 60, castle gate 120.

### 2.11 Healing (skill `healing`; remedies made at the `herb_table`, labor `healer`; work 3 beats)
| Remedy | Inputs | Level | XP to make | Effect when used |
|---|---|---|---|---|
| bandage | 2 twine | 1 | 4 | heals 2 HP at once (stops bleeding if Q12 brings injuries) |
| yarrow_poultice | 1 yarrow + 1 bandage | 5 | 20 | heals 6 HP over 10 beats |
| comfrey_salve | 1 comfrey + 1 tallow + 1 bowl | 16 | 45 | heals 10 HP (with injuries: a broken bone mends twice as fast) |
| betony_draught | 1 betony + 1 jug of water | 26 | 65 | +3 attack and +3 defence levels for 60 game minutes |
| vervain_tonic | 1 vervain + 1 jug of water | 38 | 85 | +4 strength for 60 minutes |
| mandrake_philtre | 1 mandrake + 1 jug of water | 50 | 110 | restores 25% of max HP |
| moonwort_elixir (P16) | 1 moonwort + 1 jug of water | 62 | 140 | restores 30% of max HP and +5 defence for 30 minutes |
| star_thistle_serum (P16) | 1 star_thistle + 1 jug of water + 1 relic_fibre | 74 | 175 | restores all HP over 20 beats |

- Drinks return the empty jug.
- The two boosting draughts need temporary boosts. UF_Skills has none today (its API has no boost call), so these two wait until it does.
- **Tending** (new job `tend`): a healer walks to a hurt unit and uses one remedy on it. The healer earns healing XP = 1.5 × the HP restored, on top of the XP for making the remedy.

---

## 3. Formulas and the job system

### 3.1 Success chance
`p(L) = clamp(low + (high − low) × (L − R) / (99 − R), 0, 1)`, where `R` is the requirement level and `[low, high]` the entry's `chance`. This is the classic model (the chance is a straight line in level, capped at 100%) anchored at the requirement instead of at level 1, so no constant is ever negative. The same function serves the gathering success, the hunt strike and the farm life-save roll. With its own parameters it also serves the iron smelt: 0.60 at 17, reaching 1.00 at 50.

### 3.2 Tools
- **Tier tool speed:** stone 1.0, bronze 1.1, iron 1.2, steel 1.3, meteoric 1.45, wreck-metal 1.6.
  - Bare hands: 0.5, and only where an action has `bareHands: true` (tier-1 trees, P18). A stone axe is ×2 over bare hands, which today's `jobs.tool_speeds_work` expects.
  - Untiered tools: sickle 1.3 for foraging and harvesting; knife 1.15 for foraging; fishing tools, chisel, saw, needle and spindle 1.0.
- **Choosing a tool:** a tool counts when it is carried or equipped. `UF.Jobs.bestTool(unit, tag)` returns the carried or equipped item with that tool tag and the highest speed whose `tool.req` the unit meets.
  - Axes need woodcutting, and picks need mining, at the tier's use level: stone 1, bronze 1, iron 6, steel 16, meteoric 32, wreck-metal 50.
  - Knives and hammers have no skill requirement as tools.
  - While working, the unit's sprite shows the job's tool (V61; the renderer reads `job.tool`).
- **Compulsory tools:** `needsTool: true` on an action, or a recipe's `needs: [tag]`, makes the tool compulsory (reason "needs a pick"). Otherwise a tool only speeds the work (today's `tool` field on recipes).

### 3.3 A gather job (chop, mine, quarry, gather, salvage, fish, harvest)
- **plan:** the target object has the action.
  - `UF.Skills.meets(unit, { skill: action.skill, level: action.level })`, else `{ ok: false, reason: "needs <skill> <level>" }`.
  - When `needsTool`, `bestTool` must find one, else "needs a <tag>".
  - The stand cell is chosen as today.
- **work:** `action.attempt` beats. Progress per tick is UF_Jobs' `rateOf` (`workRate × toolMultiplier × UF.Skills.rate`); `toolMultiplier` reads `tool.speed` (§6.1). With P9 A, `UF.Skills.rate` returns 1 for gathering types (§3.12 item 3), so only the tool speeds a gatherer.
- **apply** (once per attempt): roll `mulberry32(hash32(seed, unit.id, job.id, job.phase))`. On success:
  1. Drop the yield on the resource's own cell with `UF.Items.drop` (D6).
  2. `UF.Skills.add(unit, action.skill, action.xp)`, and set `job.result.xpPaid = true` (§3.12 item 2).
  3. Roll each `extra`.
  4. Decrement the cell's charges. On first use, roll `charges` from `hash32(seed, area, x, y, "charges")`. At 0 charges the object becomes `action.becomes` and its regrow is scheduled.
  5. Return `"continue"` (UF_Jobs' existing next-phase mechanism), unless the object is spent or `job.params.count` successes have been made.

  A failed roll gives nothing and returns `"continue"`.
- Needs and orders interrupt a gather job as they interrupt any job; the charges stay on the cell for the next worker.
- Actions without a `skill` field (picking up loose stones, gravel, bones) keep today's one-shot behaviour and UF_Skills' own XP for `pick`.

### 3.4 A craft job
- **plan:**
  - The recipe: `UF.Skills.meets(unit, { skill: recipe.skill, level: recipe.level })`, else "needs smithing 36".
  - Every input and the fuel is in the inventory, and every `needs` tool is carried.
  - The station is found by `at`: a tag, or a list of tags in preference order. It is the nearest object with the first tag that exists within 40 cells, as today.
  - An `hours` window, when present ("waits for night").
- **work:** `recipe.work` beats at UF_Jobs' `rateOf`. `UF.Skills.rate(unit, "craft", job)` reads the recipe's `skill`, and `toolMultiplier` takes the best tool among the recipe's `tool` and `needs` tags (1 when there is none).
- **apply:**
  - Consume the inputs and the fuel.
  - Roll success when `success` is set (iron smelting), or burn when `burn` is set (cooking), with the seeded roll of §3.3.
  - On success, give the outputs, `UF.Skills.add(unit, recipe.skill, recipe.xp)` and `job.result.xpPaid = true`. On failure, give the `fail` outputs (slag, burnt food) and no XP.
  - With `job.params.count` (make-X, as OSRS's make-all), return `"continue"` while made < count and the inputs remain.
- Recipe XP is per action; batch outputs (12 arrows, 4 bricks) count as one action.

### 3.5 Build, equip and other checks
- **build:** `meets(unit, { skill: build.skill || "building", level: build.level })` in `plan`; `add(unit, build.skill || "building", build.xp)` and `xpPaid` on completion. Every existing object with `build` gets a level from §2.10. UF_Floors' `floor` job pays the ground kind's `build.xp` the same way (C2).
- **equip:** `UF.Items.equip` refuses an item whose `equip.req` the unit doesn't meet (reason "needs attack 16"). Carrying is always allowed.
- **Wield vs use:** a steel axe carried as a tool needs woodcutting 16; equipped as a weapon it needs attack 16.

### 3.6 Hunting
The existing `hunt` job keeps its stand and re-plan rules.
- **Prey** (kinds grazer, vermin and flier, with `flees: true` or no fight):
  - `work` becomes a strike attempt every 3 beats. A spear speeds it ×1.2.
  - A bow allows attempts from 5 cells without closing in. It spends an arrow per attempt, and a miss drops the arrow, as COMBAT_CHAINS §6.5 describes.
  - Success (`hunt.chance`, §3.1) kills the prey and drops its yields, as `jobs:kill` does today, and gives `hunt.xp` (`add` plus `xpPaid`).
  - A failure lets a fleeing prey run (UF_Wildlife's flee), and the job re-plans.
- **Animals that fight back, and predators,** turn the hunt into a V64 fight (UF_Combat); the kill still gives `hunt.xp`.

### 3.7 Fishing (job type `fish`, UF_Jobs)
`params: { method? }`.
- **plan:**
  - The target is a water cell of a kind that has fish, and the unit stands beside it.
  - The unit carries a tool for a method that catches something there at its level.
  - The cell isn't resting.
- **work:** `fishing.attempt` (4) beats.
- **apply:**
  1. Build the candidate list: fish whose `waters` include the cell's kind, whose method the unit's tools allow, and whose level the unit meets.
  2. Roll each from the highest level down and keep the first success.
  3. Drop the catch on the fisher's cell, pay its XP, and decrement the cell's stock.
  4. Return `"continue"` as in §3.3.

### 3.8 Farming, filling, tending, salvage (new job types and actions)
- `plant { seedId }`: stand on or beside a `farm_plot`; the seed carried; `meets(unit, { skill: "farming", level: crop.level })`; instant work 2 beats; the plot becomes `crop_<id>_1`, plant XP, the regrow chain starts.
- Harvest is the `gather` action of the ripe crop (§1.7); its `skill` is `farming`.
- `fill { itemId }`: at a water cell or a `well`: an empty jug becomes a jug of water (no XP).
- `tend { unitId, remedyId }`: §2.11.
- `salvage` is a gather action (§1.2.1, §3.3), not a new job engine.

### 3.9 The colonists' planner (UF_Colonists)
- **Level-aware targets:** when a plan step needs an item, the colonist looks for sources it can work: the nearest object whose action yields the item and whose level it meets, or the recipe whose level it meets. A step that nobody can do reports "needs smithing 36" in the plan status, and the plan moves on to later steps and comes back to it.
- **`craftBest`** (new plan-step form): `{ "id": "blades", "craftBest": ["sword", "dagger"], "count": 2 }`.
  - It makes the highest tier of the first shape in the list that a colonist meets and whose bars the colony holds or can smelt now. Ties go to the cheaper tier.
  - A list ending in a level-1 shape can always be done (D13). A band without a smith at 3 makes bronze daggers.
- **Input resolution** (COMBAT_CHAINS §8.3) deepens from 3 to 4 steps, since a tipped arrow is log → shafts → fletched shafts → arrows plus heads.
- **Labor weight:** `culture.priorities[labor.priority] × (culture.chainWeights[labor] ?? 1) × (1 + level / 99)`, with the level from `UF.Skills.level`.
- **Tool upgrades** (new step form `upgrade: ["axe", "pick", "knife", "hammer"]`): every worker whose labor uses the tool carries the best tier the colony has or can make and the worker may use.

### 3.10 Seeding and cost (V50)
Every roll is `mulberry32(hash32(seed, …))`, never `Math.random`. Each attempt costs one roll, plus one per extra.
- **Charges and fishing stocks** are sparse records, written only for cells that have been worked and removed when a cell regrows: `UF.World.state.resources = { charges: { "<ax>,<ay>": { "<x>,<y>": n } }, fished: { "<ax>,<ay>": { "<x>,<y>": { left, until } } } }`.
- Crops use the existing regrow list.
- Nothing runs per frame; jobs advance per beat.

### 3.11 Pacing (calculated, not measured)
With UF_Skills' curve (level 30 = 13,363 XP, 50 = 101,333, 70 = 737,627, 85 = 3,258,594, 99 = 13,034,431) and the numbers above, one worker working without a break reaches:
- mining 30 in about 0.55 h at ×1 and mining 99 in about 102 h (12.7 h at ×8);
- woodcutting 30 in about 0.4 h and woodcutting 99 in about 85 h (10.6 h at ×8).

Crafting skills are faster per hour but are limited by materials. If UF_Skills scales its curve, these per-action XP values stay as they are and only the times change.

### 3.12 Changes to UF_Skills (Claude Code, phase C2; line numbers of `game/js/plugins/UF_Skills.js` on 2026-09-19)
This file pays experience per action, and UF_Skills (as built) already pays on `jobs:done`, on `jobs:kill` and on builds. Without these edits every gathering, crafting, building and hunting action would be paid twice.

1. **Calls.** Use the built API: `level(unit, id)`, `meets(unit, { skill, level })`, `add(unit, id, xp)`, `rate(unit, jobType, job)`. There is no `addXp` or `speed`.
   - **The trap:** `meets` (lines 617–632) returns `true` for a string argument, because a string has no `.skill` or `.minLevel` and its character keys match no skill. So `meets(unit, "mining", 14)` passes every gate silently.
   - **Edit:** `meets` returns `false` and records an error in `errors` when `req` is present but not an object.
   - **New check:** `skills.meets_rejects_bad_calls`. It fails when `meets(u, "mining", 14)` is true, or when no error is recorded.
2. **One payment per action.** UF_Jobs sets `job.result.xpPaid = true` whenever it paid through `add` (gather and salvage successes, fish, plant, harvest, craft actions, builds and floors with `build.xp`, the hunt strike). In UF_Skills:
   - `onJobDone` (line 552) returns at once when `job.result && job.result.xpPaid`: no `jobXp`, no build share (line 571), no extra yield.
   - `onKill` (line 580) returns when `job && job.result && job.result.xpPaid`.

   Jobs this file doesn't pay keep UF_Skills' `jobXp` from `skills.list[].xp`: haul, fetch, dig, dismantle, douse, and the skill-free `pick` of loose stones.

   *Considered and rejected:* setting `skills.list[].xp` of the paid skills and `skills.xp.buildShare` to 0. That would also silence the unpaid job types of the same skills (`dig` for mining, `dismantle` for building).
3. **P9 A (gathering ignores V63's speed and extra yield).**
   - Catalog `skills.effects.extraYield.jobs` → `[]`.
   - New catalog key `skills.effects.speedSkip: ["chop", "mine", "quarry", "gather", "pick", "fish", "hunt", "salvage"]`, read in `cfg()` (next to line 141) as a Set.
   - `rate` (line 594) returns 1 for a job type in it. Crafts (`craft`) and builds keep `rate`.
   - With P9 B, both keys stay as they are.
4. **P19 (quality retired).** Remove:
   - `qualityRoll` (lines 602–611, and its export on line 696), `SALT.quality` (line 52), and the default at line 143;
   - catalog `skills.effects.quality`, and the `rolls` counter in `state.skills` (keep `version`);
   - the quality half of the check `quality_and_meets` (lines 918–936).

   The check becomes `meets`. Its `meets` cases stay, rewritten with a recipe of this file instead of `sword_short`. UF_Skills.md changes to match: the Effects "Quality" item, the API row, State, the check row and Known limits.
5. **New job types → skills** (for `skillOfJob`, level-up lines and the unpaid fallback), in the catalog `skills.list[].jobs` lists:
   - `salvage` → mining; `plant` → farming; `tend` → healing.
   - `fill` goes into `skills.noSkill`.
   - Harvest stays the job type `gather`. It pays farming through its action's own `skill`, and the `xpPaid` flag makes UF_Skills' `gather` → foraging mapping irrelevant for it.
6. **`xp_by_doing` expectations** (lines 803–821) change for paid jobs (§6.7). The unpaid types keep them.
7. **Starting levels stay V63's.** This file's gates are set against them (D13, check `plan_gates_met`).

### 3.13 Our own numbers (P21; the rules that make every derived table)
These rules make the tables of §1.2, §1.3, §2.2–§2.4, §2.7 and §5. `tools/add_crafting_tiers.js` (C1) computes from the same rules, and `check_catalog.js` proves the catalog matches.

**Level ladders.**
- Metal smithing bases: 1 / 17 / 34 / 53 / 72.
- Wield, wear and tool-use levels: 1 / 6 / 16 / 32 / 50.
- Ores: 1 (copper, tin, clay, stone), 13 (iron), 22 (silver), 26 (crystal), 29 (coal), 37 (gold), 51 (meteoric), and salvage 66.
- Trees: 1 / 12 / 27 / 42 / 57 / 72.
- Bows: wield 1 / 6 / 16 / 26 / 38 / 50.

**Experience** (L is the requirement level; results are rounded):
- Mining: h × (15 + 1.6 L), with h = 1 for ore and gems, 0.4 for stone, 0.35 for clay, 0.5 for loose gems.
- Woodcutting: 20 + 2 L.
- Smelting: 4 + 0.5 L per bar.
- Smithing: (9 + 0.9 × the tier base) per bar, × bars.
- Fletching:
  - shafts: 4 + 0.35 L per log;
  - fletched shafts: 12 per dozen;
  - arrows: 12 × (1 + 0.1 L) per dozen;
  - short bows: 6 + 1.1 L, and long bows: 8 + 1.3 L, for each of cutting and stringing.
- Cooking: 20 + 1.6 L per dish.

**Batches** are dozens: arrows, heads, shafts, nails. Fittings come in 4s. The shaft counts per log are 12, 18, 24, 30, 36 and 42.

**Bars per shape and offsets** are the table of §2.3. Two shapes need 4 bars (the hauberk and the coat of plates), and the top offset is +15.

**Chains:**
- Steel is an iron bar re-melted with coal (§2.2), not ore.
- Iron smelting succeeds 60% at 17, rising to 100% at 50.
- The meteoric bar takes 2 coal.

**Weapon speed** = 3 + ceil(the shape's iron weight in kg).

**Weapon bonuses at bronze.** The rating r = offset + 4.
- Primary attack = round(1.2 r). Tools take × 0.6.
- Secondary attack = round(0.5 × the primary); the spear takes 0.75 for both secondaries.
- Fixed penalties: −2 for an edge against crush or a point against slash; −4 for daggers and knives against crush, and for hammers against stab and slash.
- Strength = round(r × s). s = 0.6 for daggers and knives, 0.7 for other one-handed weapons of speed ≤ 5, 1.0 for one-handed weapons of speed 6, and 1.2 for two-handed weapons. Tools take × 0.6.

**Armour at bronze.** Coverage C (helm 3, great helm 5, greaves 7, hauberk 12, coat of plates 16, buckler 4, kite shield 7, heater shield 8) × the construction's profile (stab / slash / crush / ranged):

| Construction | Defence profile | Magic attack penalty | Ranged attack penalty | Magic defence |
|---|---|---|---|---|
| plate | 1.0 / 1.1 / 0.8 / 1.0 | −round(1.5 C) | −round(0.4 C) | −max(1, round(0.3 C)) |
| mail | 0.8 / 1.2 / 0.6 / 0.9 | −C | 0 | −1 |
| shield | 1.0 / 1.1 / 0.9 / 1.1 | −C | −round(0.25 C) | −1 |

**Tiers.** Every positive bonus = round(bronze value × the tier factor: 1, 1.45, 2.1, 3.05, 4.4). Negative values stay the same at every tier. The wood factors for bows are 1, 1.7, 2.6, 3.8, 5.2 and 6.8.

**Hand-set values.** Numbers that no rule makes are set by us: fishing, hunting, foraging, farming, crafting, leather, cloth, carpentry, masonry, healing, charges, chances, burn levels, and the stone and wooden items.

**The comparison with OSRS, and its limits.** The OSRS values were compared from memory, not checked against the OSRS wiki. The first draft copied these, and the rules above replace them:
- the tree ladder 1/15/30/45/60/75 with 25 XP for the common tree;
- shaft XP 5–30, and 15-arrow batches;
- short and long bow XP;
- roast meat 30 and bread 40;
- XP per bar 12/24/36/…, and smelting XP 6/12/14/18/22/30;
- steel from 1 iron ore + 2 coal, and a 50% iron smelt;
- bars per shape 1/2/3/5 with +18 for the 5-bar breastplate;
- weapon speeds 4/4/4/5/5/5/6/6/7;
- the bronze helm and greaves bonuses.

Under the rules: no level ladder above level 1 equals OSRS's, no XP table repeats OSRS's sequence, and no bronze armour row equals the OSRS row it replaces. Single small values can coincide (a dagger at speed 4, a war sword at 7).

C1's check `not_osrs_ladders` compares the main ladders against a list typed in from the OSRS wiki at that time.

---

## 4. Workshops
Every workshop is an object with `workplace` and its own tag, which recipes name in `at`. One cell each unless its art is larger (V44).

| Workshop | Object id | Tag (`at`) | Status | Skills and recipes |
|---|---|---|---|---|
| Campfire | campfire | fire | existing | cooking (campfire burn rates) |
| Kitchen hearth | hearth | range, fire | new | cooking (lower burn; bread and pies) |
| Work stone | workbench | workbench | existing | knapping, pottery shaping, leather pieces |
| Furnace | furnace | furnace | existing | smelting, charcoal, steel, jewellery |
| Smithy (anvil) | smithy | smithy | existing | smithing, bronze to meteoric |
| Bowyer's bench | bowyer_bench | bowyer | existing | fletching: bows |
| Fletcher's bench | fletcher_bench | fletcher | existing | fletching: shafts, fletched shafts, arrows |
| Tanning rack | tanning_rack | tannery | existing | leatherwork: tanning |
| Weapon rack | weapon_rack | weapon_rack | existing | storage (no recipes) |
| Loom | loom | loom | new | crafting: weaving |
| Kiln | kiln | kiln | new | crafting: firing pottery and bricks |
| Carpenter's bench | carpenter_bench | carpentry | new | carpentry |
| Mason's bench | mason_bench | masonry | new | masonry |
| Quern | quern | quern | new | cooking: flour |
| Herbalist's table | herb_table | apothecary | new | healing: remedies |
| Relic bench | relic_bench | relic | new (P1) | smithing: cutting wreck-metal plates into bars, and every wreck-metal item; crafting: starcloth. Gem cutting of star-glass may happen here or anywhere. |
| Altar | altar | altar | P20: not now | none until magic is designed |
| Farm plot | farm_plot | plot | existing | farming |
| Well | well | well | existing | `fill` |

Spinning, tailoring, gem cutting and knapping need only carried tools, so they happen anywhere (or at the work stone).

---

## 5. Items and combat

### 5.1 The ladders
| Metal tier | Smithing base | Wield / wear level (attack for weapons, defence for armour, ranged for arrows) | Tool use level | Tool speed | Bonus factor |
|---|---|---|---|---|---|
| stone (tools and a spear only) | – | 1 | 1 | 1.0 | – (own numbers, §5.8) |
| bronze | 1 | 1 | 1 | 1.1 | 1.0 |
| iron | 17 | 6 | 6 | 1.2 | 1.45 |
| steel | 34 | 16 | 16 | 1.3 | 2.1 |
| meteoric (P1) | 53 | 32 | 32 | 1.45 | 3.05 |
| wreck-metal (P1; id `relic`) | 72 | 50 | 50 | 1.6 | 4.4 |

| Wood tier | Woodcutting | Bow wield (ranged) | Bow factor | Best arrows it fires |
|---|---|---|---|---|
| common | 1 | 1 | 1.0 | silver |
| ash | 12 | 6 | 1.7 | steel |
| elm | 27 | 16 | 2.6 | steel |
| ancient | 42 | 26 | 3.8 | meteoric |
| feywood (P5) | 57 | 38 | 5.2 | meteoric |
| skywood (P5) | 72 | 50 | 6.8 | wreck-metal |

Arrow tiers rank stone < bone < bronze < iron < silver < steel < meteoric < wreck-metal.

Leather factors: leather 1.0, boiled 1.6, serpent 2.3, troll 3.1, chitin 4.0, bog 5.0 (wear levels in §2.6). Cloth factors: linen 1.0, wool 1.8, silk 3.0, gossamer 4.4, starcloth 6.0 (no wear level, D10).

**Rule:** every positive bonus of a shape = round(the bronze, leather, linen or common base × the tier's factor); negative numbers (penalties) stay as they are at every tier. Attack speed and attack types don't change with the tier.

### 5.2 The item schema for combat (UF_Combat's field names)
Items carry the blocks UF_Combat reads today (UF_Combat.md → Weapons, and the catalog's current `sword_long`, `mail_iron` and `shield_iron`):
- `weapon { speed, types, styles, hands, reach, bonuses, ranged? }`;
- `armor { slot, bonuses }`;
- `shield { bonuses }`;
- `ammo { …, rangedStrength }`.

Each `bonuses` is `{ attack: { stab, slash, crush, ranged, magic }, defence: { … }, strength, rangedStrength, magicStrength }`, with missing keys counting 0. This file adds `tier`, `shape`, `equip.req` and the new `tool` block.

```json
{
  "id": "falchion_steel", "name": "Steel falchion", "tier": "steel", "shape": "falchion",
  "tags": ["weapon", "melee", "blade"], "stack": 1, "weight": 1.4, "labor": "weaponsmith",
  "equip": { "req": { "attack": 16 } },
  "weapon": {
    "speed": 5, "types": ["slash", "stab"], "styles": ["accurate", "aggressive", "defensive"], "hands": 1, "reach": 1,
    "bonuses": { "attack": { "stab": 2, "slash": 23, "crush": -2, "ranged": 0, "magic": 0 }, "strength": 13 }
  }
}
```
- **`speed`:** the attack interval in UF_Combat's ticks (4 = a dagger's pace, 7 = a war sword's).
- **`types`:** the attack types the styles choose from, the default first.
- **`styles`:**
  - accurate, aggressive, defensive for most melee weapons;
  - plus controlled for the mace, longsword and war sword;
  - the spear: controlled, aggressive, defensive (controlled first);
  - bows and the sling: accurate, rapid, longrange.
- **`weight`** (kg) per shape at iron:

  | Weight (kg) | Shapes |
  |---|---|
  | 0.3 | knife |
  | 0.5 | dagger |
  | 1.0 | hammer |
  | 1.1 | arming sword |
  | 1.4 | axe, falchion, helm |
  | 1.6 | spear, longsword |
  | 1.8 | pick, mace |
  | 2.0 | buckler |
  | 2.4 | great helm |
  | 2.6 | war hammer |
  | 3.0 | battle axe |
  | 3.2 | war sword |
  | 3.5 | heater shield |
  | 4.0 | greaves, kite shield |
  | 10 | hauberk |
  | 12 | coat of plates |

  Tier multiplier: bronze 1.05, iron and steel 1.0, meteoric 0.95, wreck-metal 0.7. Weight sets the attack speed (§3.13); combat reads nothing else from it yet.
- **Tools:** a tool item also has `"tool": { "kind": "axe", "speed": 1.3, "req": { "woodcutting": 16 } }`. This replaces today's `tool: { jobType: multiplier }`; UF_Jobs reads both shapes until C2 lands.
- **Armour:** `armor.slot` is `head`, `torso` or `legs`, and shields use the `shield` block. `bonuses.attack` holds the penalties; `bonuses.defence` holds the defences.
- **Bows:** `weapon.ranged: { range, ammoKind: "arrow", maxAmmoTier: "steel" }`. Today `ranged.ammo` names one item type (`"arrows"`). C4 changes UF_Combat's `ammoOf` to take the highest-tier arrow type in the inventory whose `ammo.kind` matches and whose tier is no higher than `maxAmmoTier`.
- **Arrows:** `"ammo": { "kind": "arrow", "tier": "steel", "rangedStrength": 13 }`. `byMaterial` goes, because records carry no material after C1.
- **Food and remedies:** `"food": { "hunger": 50, "heal": 3 }`; `"remedy": { "heal": 6, "over": 10, "boost": null }`.

### 5.3 Metal weapons and tools (attack stab / slash / crush, then strength; no defence bonuses)
From the rules of §3.13.

| Shape | Types (default first) | Hands | Speed | bronze | iron | steel | meteoric | wreck-metal |
|---|---|---|---|---|---|---|---|---|
| dagger | stab, slash | 1 | 4 | 5/3/-4, str 2 | 7/4/-4, str 3 | 11/6/-4, str 4 | 15/9/-4, str 6 | 22/13/-4, str 9 |
| arming sword | stab, slash | 1 | 5 | 7/4/-2, str 4 | 10/6/-2, str 6 | 15/8/-2, str 8 | 21/12/-2, str 12 | 31/18/-2, str 18 |
| falchion | slash, stab | 1 | 5 | 1/11/-2, str 6 | 1/16/-2, str 9 | 2/23/-2, str 13 | 3/34/-2, str 18 | 4/48/-2, str 26 |
| mace | crush, stab | 1 | 5 | 5/-2/10, str 6 | 7/-2/15, str 9 | 11/-2/21, str 13 | 15/-2/31, str 18 | 22/-2/44, str 26 |
| spear | stab, slash, crush | 1 | 5 | 8/6/6, str 5 | 12/9/9, str 7 | 17/13/13, str 11 | 24/18/18, str 15 | 35/26/26, str 22 |
| longsword | slash, stab | 1 | 5 | 7/13/-2, str 8 | 10/19/-2, str 12 | 15/27/-2, str 17 | 21/40/-2, str 24 | 31/57/-2, str 35 |
| war hammer | crush | 1 | 6 | -4/-4/14, str 12 | -4/-4/20, str 17 | -4/-4/29, str 25 | -4/-4/43, str 37 | -4/-4/62, str 53 |
| battle axe | slash, crush | 2 | 6 | -2/18/9, str 18 | -2/26/13, str 26 | -2/38/19, str 38 | -2/55/27, str 55 | -2/79/40, str 79 |
| war sword | slash, stab | 2 | 7 | 11/22/-2, str 22 | 16/32/-2, str 32 | 23/46/-2, str 46 | 34/67/-2, str 67 | 48/97/-2, str 97 |
| axe (tool) | slash, crush | 1 | 5 | -2/4/2, str 2 | -2/6/3, str 3 | -2/8/4, str 4 | -2/12/6, str 6 | -2/18/9, str 9 |
| pick (tool) | stab, crush | 1 | 5 | 6/-2/3, str 3 | 9/-2/4, str 4 | 13/-2/6, str 6 | 18/-2/9, str 9 | 26/-2/13, str 13 |
| knife (tool) | stab, slash | 1 | 4 | 3/2/-4, str 1 | 4/3/-4, str 1 | 6/4/-4, str 2 | 9/6/-4, str 3 | 13/9/-4, str 4 |
| hammer (tool) | crush | 1 | 4 | -4/-4/4, str 2 | -4/-4/6, str 3 | -4/-4/8, str 4 | -4/-4/12, str 6 | -4/-4/18, str 9 |

### 5.4 Metal armour and shields (defence stab / slash / crush / ranged / magic; attack penalties magic and ranged, the same at every tier)
From the rules of §3.13.

| Shape | Slot | Made as | Magic atk | Ranged atk | bronze | iron | steel | meteoric | wreck-metal |
|---|---|---|---|---|---|---|---|---|---|
| helm | head | plate (coverage 3) | -5 | -1 | 3/3/2/3/-1 | 4/4/3/4/-1 | 6/6/4/6/-1 | 9/9/6/9/-1 | 13/13/9/13/-1 |
| great helm | head | plate (coverage 5) | -8 | -2 | 5/6/4/5/-2 | 7/9/6/7/-2 | 11/13/8/11/-2 | 15/18/12/15/-2 | 22/26/18/22/-2 |
| hauberk | torso | mail (coverage 12) | -12 | 0 | 10/14/7/11/-1 | 15/20/10/16/-1 | 21/29/15/23/-1 | 31/43/21/34/-1 | 44/62/31/48/-1 |
| coat of plates | torso | plate (coverage 16) | -24 | -6 | 16/18/13/16/-5 | 23/26/19/23/-5 | 34/38/27/34/-5 | 49/55/40/49/-5 | 70/79/57/70/-5 |
| greaves | legs | plate (coverage 7) | -11 | -3 | 7/8/6/7/-2 | 10/12/9/10/-2 | 15/17/13/15/-2 | 21/24/18/21/-2 | 31/35/26/31/-2 |
| buckler | shield | shield (coverage 4) | -4 | -1 | 4/4/4/4/-1 | 6/6/6/6/-1 | 8/8/8/8/-1 | 12/12/12/12/-1 | 18/18/18/18/-1 |
| kite shield | shield | shield (coverage 7) | -7 | -2 | 7/8/6/8/-1 | 10/12/9/12/-1 | 15/17/13/17/-1 | 21/24/18/24/-1 | 31/35/26/35/-1 |
| heater shield | shield | shield (coverage 8) | -8 | -2 | 8/9/7/9/-1 | 12/13/10/13/-1 | 17/19/15/19/-1 | 24/27/21/27/-1 | 35/40/31/40/-1 |

Hauberks and coats of plates set clothing tier 3. A two-handed weapon empties the shield slot (COMBAT_CHAINS §6.2 stays).

### 5.5 Leather (defence stab / slash / crush / ranged / magic, and ranged attack)
| Shape | Slot | leather | boiled | serpent | troll | chitin | bog |
|---|---|---|---|---|---|---|---|
| cap | head | 1/1/1/2/1, +1 | 2/2/2/3/2, +2 | 2/2/2/5/2, +2 | 3/3/3/6/3, +3 | 4/4/4/8/4, +4 | 5/5/5/10/5, +5 |
| leggings | legs | 2/2/2/3/1, +2 | 3/3/3/5/2, +3 | 5/5/5/7/2, +5 | 6/6/6/9/3, +6 | 8/8/8/12/4, +8 | 10/10/10/15/5, +10 |
| jerkin | torso | 5/6/7/7/3, +4 | 8/10/11/11/5, +6 | 12/14/16/16/7, +9 | 16/19/22/22/9, +12 | 20/24/28/28/12, +16 | 25/30/35/35/15, +20 |

Hide cloak (existing, torso): 2/3/3/3/1, ranged +1, wear level 1.

### 5.6 Cloth (defence stab / slash / crush / ranged / magic, and magic attack)
| Shape | Slot | linen | wool | silk | gossamer | starcloth |
|---|---|---|---|---|---|---|
| hood | head | 0/0/0/0/2, +2 | 0/0/0/0/4, +4 | 0/0/0/0/6, +6 | 0/0/0/0/9, +9 | 0/0/0/0/12, +12 |
| breeches | legs | 0/0/0/0/3, +3 | 0/0/0/0/5, +5 | 0/0/0/0/9, +9 | 0/0/0/0/13, +13 | 0/0/0/0/18, +18 |
| tunic | torso | 1/1/1/0/5, +5 | 2/2/2/0/9, +9 | 3/3/3/0/15, +15 | 4/4/4/0/22, +22 | 6/6/6/0/30, +30 |

Woven wrap (existing): all 0. The magic numbers do nothing until magic exists (V64's magic skill has no spells yet).

### 5.7 Ranged
| Weapon | Hands | Speed | Range (cells) | Ranged attack by wood: common / ash / elm / ancient / feywood / skywood | Ammunition |
|---|---|---|---|---|---|
| short bow | 2 | 4 | 6 | 7 / 12 / 18 / 27 / 36 / 48 | arrows up to the bow's best tier (§5.1) |
| long bow | 2 | 5 | 8 | 8 / 14 / 21 / 30 / 42 / 54 | same |
| sling (leather) | 1 | 4 | 5 | 4 | stone (ranged strength 2) |

**Arrows**, as ranged strength (ranged level needed to shoot them):

| Arrow | Ranged strength | Ranged level |
|---|---|---|
| stone | 3 | 1 |
| bone | 4 | 1 |
| bronze | 6 | 1 |
| iron | 9 | 6 |
| silver | 11 | 16 |
| steel | 13 | 16 |
| meteoric | 19 | 32 |
| wreck-metal | 30 | 50 |

- **P12:** silver arrows get ×1.15 accuracy and max hit against `alignment: "cursed"` creatures. Silver makes no weapons; circlets are not weapons.
- **Ranges and sight** follow UF_Combat. COMBAT_CHAINS §6.5 stays: line of sight, one shot per attack interval, arrows consumed and misses dropped.

### 5.8 Stone, wood and bone weapons and shields
Each is below the bronze item of its shape (UF_Combat's `equipment` check compares these pairs).

| Item | Types | Hands | Speed | Attack stab / slash / crush | Str | Defence | Wield |
|---|---|---|---|---|---|---|---|
| stone_knife (tool) | stab, slash | 1 | 4 | 2/0/-4 | 1 | – | 1 |
| stone_axe (tool) | slash, crush | 1 | 5 | -2/2/1 | 1 | – | 1 |
| stone_pick (tool) | stab, crush | 1 | 5 | 2/-2/2 | 2 | – | 1 |
| stone_hammer (tool) | crush | 1 | 4 | -4/-4/2 | 1 | – | 1 |
| spear_stone | stab, slash, crush | 1 | 5 | 3/3/2 | 3 | – | 1 |
| club | crush | 1 | 5 | -4/-4/4 | 3 | – | 1 |
| quarterstaff | crush, stab | 2 | 5 | 2/-2/6 | 5 | +2 stab/slash/crush | 1 |
| shield_round (common planks) | – | – | – | – | – | 3/4/3/3/0 | defence 1 |
| shield_round_ash | – | – | – | – | – | 5/7/5/5/0 | defence 6 |

### 5.9 Jewellery (P11)
- **Rings and pendants are goods:** trade value, gifts, and later rank and room value.
- **Circlets are `head` items:**
  - silver circlet: defence 1/1/1/1/2 and magic attack +2;
  - gold circlet: 1/1/1/1/3 and +3;
  - a set gem adds its rank to magic attack: agate 1, garnet 2, carnelian 3, bloodstone 4, moonstone 5, star-glass 6.
- No wear level.
- With P11's second option, rings and pendants get two new slots and small bonuses instead (a V49 change).

### 5.10 Retiring V55's random quality (P19) and the d20 item data
**Precondition.** Quality is live in two plugins that other runs own or are writing: UF_Skills rolls it, and UF_Combat multiplies bonuses by it. P19 is agreed with the V64 run before C1 (§6.7 C0), and the removals below land in the same change. Otherwise either C1's `no_quality_left` check fails on `skills.effects.quality`, or the removal breaks the `quality_and_meets` and combat checks.

Remove, when phase C1 lands (line numbers of 2026-09-19):
- **Catalog:**
  - `combat.quality` (names, bonus, value);
  - every recipe's `quality`, `ability` and `material`;
  - every item type's `quality` and `material` (replaced by `tier` and `shape`);
  - `ammo.byMaterial`, and `skills.effects.quality`;
  - the leftover d20 keys, where they remain: `weapon.damage`, `weapon.ability`, `weapon.properties`, `weapon.versatile`, `weapon.skill`, `armor.ac`, `armor.dexMax`, `armor.soak`, `armor.minStr`, `shield.ac`, and `materials.list[].damage` and `.armor`;
  - the `about` texts that describe them.

  The V64 rewrite owns `combat.baseAC`, `proficiency`, `critical`, `abilities` and `people.*.stats`.
- **UF_Skills** (the edits of §3.12 item 4): `qualityRoll` (lines 602–611, the export on 696), `SALT.quality` (line 52), the default at line 143, `state.skills.rolls`, and the quality half of check `quality_and_meets` (lines 918–936, which rolls recipe `sword_short`).
- **UF_Combat** (with the V64 run), in `game/js/plugins/UF_Combat.js`:
  - `DEFAULTS.quality` (line 80) and `"quality"` in the merged keys (line 124);
  - `qualityMult` (lines 283–287) and its two uses: bonuses (line 317) and ammunition (line 350);
  - `byMaterial` (line 348);
  - the header line 21 ("+ quality").

  In `docs/systems/UF_Combat.md`: line 28 (`byMaterial`) and line 39 (the quality multiplier).
- **Tools:**
  - `tools/check_catalog.js` (untracked and being edited on 2026-09-19; search for `combat.quality` rather than trusting the numbers): the `combat.quality` checks at lines 299–300 and the `combat_rules` self-test mutation at line 400 are replaced by tier checks (§6.7).
  - `tools/add_combat_chains.js` writes `combat.quality` and `quality: true` flags (lines 61, 78–126). It is retired and must not be run again after C1.
- **Code, otherwise:** no other plugin reads `quality`. A grep of `game/js/plugins/UF_*.js` on 2026-09-19 found UF_Skills and UF_Combat only. UF_Items needs no stacking change (D3).
- **Docs:**
  - `docs/design/COMBAT_CHAINS.md`: D7, D8, §2 (dice, AC and soak columns), §3 (all), §6.3–6.4, §8.2 ("then the highest quality" → the highest tier), §9.1 `quality_stacks` and the quality text in `describe`, §9.2 `material_multiplies` and `quality_to_hit`, §9.3 `craft_rolls_quality`, and a status banner pointing here.
  - `docs/design/WORLD_ARCHITECTURE.md` §2.10 "Combat chains" (line 104: `quality (0–5, rolled at craft …)`, `material`, dice and AC).
  - `docs/handoffs/HANDOFF_combat_chains.md` (the item example's `quality`).
  - `docs/systems/UF_Skills.md` (Effects "Quality", the API row `qualityRoll`, State `rolls`, the check row `quality_and_meets`, Known limits).
  - These stay: `docs/design/DF_MECHANICS.md` §2.2 and §9 mention quality as DF's model; they are reference text. "Room quality" in `docs/systems/UF_Floors.md` is a different thing (room value).

---

## 6. Catalog schema, migration and build plan

### 6.1 Schema changes (`game/data/UF_WorldCatalog.json`)
| Section | Change |
|---|---|
| `tiers` (new) | `{ about, list: [{ id, family: "metal" \| "wood" \| "leather" \| "cloth" \| "gem" \| "stone" \| "precious", rank, name, wield, toolUse?, toolSpeed?, factor, smith?, xpPerBar?, bar?, log?, ramp }] }`. `name` holds the display name (P1, P5, P10, P15); `ramp` is the palette ramp the art recolour tool uses (§6.8). |
| `crafting` (new) | `shapes`: the smithing, leather, cloth and bow shapes with bars, offset, other inputs, slot, hands, speed, types, styles, base bonuses, weight, labor and tags (the tables of §2.3 and §5.3–5.7), plus the rules of §3.13. `tools/add_crafting_tiers.js` expands shapes × tiers into ordinary `items.types` and `recipes.list` entries, so every reader keeps reading flat lists; `check_catalog.js` proves the expansion matches. |
| `items.types[]` | + `tier`, `shape`, `equip.req`, the `weapon` / `armor` / `shield` / `ammo` blocks in UF_Combat's shape (§5.2), `tool { kind, speed, req }` (replaces `tool: { jobType: multiplier }`; UF_Jobs reads both shapes until C2 lands), `food.heal`, `fuel.heat`, `remedy`. − the fields of §5.10. |
| `items.aliases` (new) | `{ oldId: newId }` (§6.2), applied by UF_Items when a save loads and by `check_catalog.js` to old references. |
| `recipes.list[]` | + `skill` (V63 id), `level`, `xp`, `needs [tag]`, `fuel { count, heat }`, `success { from, to, fullAt, fail }`, `burn { atReq: { fire, range }, stop: { fire, range }, into }`, `hours [from, to]`, `tier`, `shape`; `at` may be a list; `work` is in beats per action. − `ability`, `quality`, `material`. |
| `objects[]` actions | Gather actions (including `salvage`) gain `skill`, `level`, `xp`, `chance [low, high]`, `attempt` (beats), `charges [min, max]`, `extra { itemId: chance, "@gem": chance }`, `lastCharge { itemId: count }` (the guaranteed relic part), `tool`, `needsTool`, `bareHands`; `yields` becomes per success. `build` gains `level`, `xp`, `skill?`. Objects gain `minSavagery`, `alignment`, `primeval` (multiplier) and `feature` ("fallenStar") for placement rules. `regrow.to` may be `"@biome"` (D9). |
| `wildlife.species[].hunt` | + `level`, `xp`, `chance`; yields per §1.5. |
| `fishing` (new) | `{ attempt: 4, stock: [3, 6], restHours: 6, methods: { line: "fishing_line", net: "fishing_net", trap: "eel_trap" }, fish: [{ id, item, waters, method, level, xp, chance, feature? }] }` |
| `farming` (new) | `{ crops: [{ id, seed, crop, level, plantXp, harvestXp, hours, lives, save, seeds: [1, 2], ground? }] }` |
| `features` (new, THEME T16 B) | `fallenStar` as in §1.8: `count`, `min`, `radius`, `biomesExcluded`, `minDistanceFromAreas`, `ground`, `rim`, `objects`, `ring`, `pond`, `sentinels`. |
| `groundKinds` | + `crater_glass` (T16 B), appended. |
| `labors.list` | skills renamed (§6.5); + miner, woodcutter, fisher, hunter, forager, farmer, cook, crafter, mason, builder, healer, hauler. |
| `colony.skills` | removed; the skill list is UF_Skills' (`catalog.skills`). |
| `skills` | the edits of §3.12: new job types in `list[].jobs`, `fill` in `noSkill`, `effects.speedSkip`, `effects.extraYield.jobs` emptied (P9 A), `effects.quality` removed (P19). |
| `materials.list` | keeps `density`, `hardness`, `value` for later physics; − `damage`, `armor`. |
| `combat.quality` | removed (§5.10). |

### 6.2 Migration: every existing item type (50)
| Old id | New id | Tier / note |
|---|---|---|
| log | log | common wood; fuel heat 1 |
| firewood | firewood | fuel heat 1 |
| stone | stone | – |
| ore_iron | ore_iron | iron |
| ore_copper | ore_copper | bronze input |
| gold | **ore_gold** | alias; gold |
| gem_rough | **gem_agate_uncut** | alias |
| gem_cut | **gem_agate** | alias |
| bar_iron | bar_iron | iron |
| berries, fruit, mushroom, root | same | + `food.heal` 1 |
| seeds | **seed_barley** | alias |
| fiber, straw | same | – |
| meat_raw | meat_raw | – |
| meat_cooked | meat_cooked | named "Roast meat"; heal 3 |
| fish | **fish_perch** | alias |
| hide | hide | leather tier raw |
| bone, wool, feathers | same | – |
| stone_axe, stone_knife, stone_pick | same | stone tier tools (§5.8) |
| fiber_wrap | fiber_wrap | cloth, clothing tier 1 |
| hide_cloak | hide_cloak | leather, clothing tier 2 |
| charcoal | charcoal | fuel heat 2 |
| bar_copper | **retired** | a save's copper bars load as bar_bronze 1:1 (alias) |
| leather | leather | leather tier |
| arrows | **arrows_stone** | alias |
| bow_short | **bow_short_common** | alias; "Short bow" |
| bow_long | **bow_long_common** | alias; "Long bow" |
| sling | sling | leather |
| club | club | wood |
| spear | **spear_stone** | alias (an iron-tipped one in a save stays stone: records carry no material after C1) |
| dagger_iron | dagger_iron | iron |
| sword_short | **sword_iron** | alias; "Iron arming sword" |
| sword_long | **longsword_iron** | alias |
| axe_iron | axe_iron | iron tool, one-handed (D7) |
| mace | **mace_bronze** | alias |
| helmet_leather | **cap_leather** | alias |
| helmet_iron | **helm_iron** | alias |
| armor_leather | **jerkin_leather** | alias |
| mail_iron | **hauberk_iron** | alias |
| leggings_leather | leggings_leather | leather |
| greaves_iron | greaves_iron | iron |
| shield_wood | **shield_round** | alias |
| shield_iron | **buckler_iron** | alias |

### 6.3 Migration: every existing recipe (34)
| Old recipe | New recipe | Skill, level |
|---|---|---|
| stone_knife, stone_axe, stone_pick | same ids | crafting 1, 1, 1 |
| fiber_wrap | same | crafting 1 |
| hide_cloak | same | leatherwork 1 |
| cook_meat | same (output meat_cooked) | cooking 1, burn |
| cook_fish | **cook_perch** | cooking 1, burn |
| split_firewood | same | woodcutting 1, 3 XP |
| charcoal | same | smithing 1 |
| bar_iron | **smelt_iron** (1 ore, not 2) | smithing 17, can fail |
| bar_copper | **retired** → smelt_bronze | smithing 1 |
| leather | **tan_leather** | leatherwork 1 |
| bow_short | **cut_bow_short_common** + **string_bow_short_common** | fletching 1 |
| bow_long | **cut_bow_long_common** + **string_bow_long_common** | fletching 1 |
| arrows_stone, arrows_bone, arrows_iron | same ids, new inputs (12 fletched_shaft + 12 heads → 12) | fletching 1, 3, 18 |
| sling | same (2 twine, not 3 fiber) | leatherwork 4 |
| club | same | carpentry 1 |
| spear_stone | same | carpentry 2 |
| spear_iron | **smith_spear_iron** (1 bar + 1 spear_shaft) | smithing 20 |
| shield_wood | **make_shield_round** (2 plank + 1 leather) | carpentry 5 |
| dagger_iron | **smith_dagger_iron** | smithing 17 |
| sword_short | **smith_sword_iron** (1 bar) | smithing 19 |
| sword_long | **smith_longsword_iron** (2 bars) | smithing 24 |
| axe_iron | **smith_axe_iron** (1 bar + 1 log) | smithing 18 |
| mace | **smith_mace_bronze** (2 bars) | smithing 5 |
| helmet_leather | **make_cap_leather** | leatherwork 1 |
| armor_leather | **make_jerkin_leather** | leatherwork 1 |
| leggings_leather | **make_leggings_leather** | leatherwork 1 |
| helmet_iron | **smith_helm_iron** (1 bar) | smithing 18 |
| mail_iron | **smith_hauberk_iron** (4 bars) | smithing 29 |
| greaves_iron | **smith_greaves_iron** (3 bars) | smithing 26 |
| shield_iron | **smith_buckler_iron** (2 bars) | smithing 24 |

### 6.4 Migration: ore objects, stone objects and trees
| Object | New role |
|---|---|
| copper_outcrop | mining 1, charges, `copper_outcrop_worked` (P8) |
| ironstone | mining 13, charges, `ironstone_worked` |
| gold_outcrop | mining 37, yields `ore_gold`, `gold_outcrop_worked` |
| crystal | mining 26, gem table, becomes `crystal_small` (as today) |
| crystal_small | mining 1 pick, agate |
| granite_boulder, rubble_pillar | quarry, mining 1, charges |
| rocks_small, gravel, rubble, bones_pile | unchanged pickups (bones_pile also joins the start kit, §1.8) |
| oak, birch, pine, fir_snow, fruit_tree, fruit_tree_bare, tree_savanna, tree_swamp, mangrove, tree_tropical, palm, dead_tree, tree_cursed | tier 1 common, woodcutting 1, charges per §1.3, bare hands allowed |
| stump | chop 1 log (as today); regrow → `sapling` 72 h |
| berry_bush, bush, desert_shrub, snow_bush, grass_tuft, fern, reeds, wild_grain, wheat_wild, cactus, cactus_tall | foraging per §1.6 |
| campfire, wall_wood, wall_stone, floor_straw, stockpile, workbench, furnace, smithy, bowyer_bench, fletcher_bench, tanning_rack, weapon_rack, door_wood, door_stone | `build.level` and `build.xp` per §2.10; smithy costs 3 bar_bronze |
| farm_plot | gains `build` (till, farming 1) |
| well | gains the `fill` use |
| bridge, flowers, flowers_purple, flowers_blue, flowers_white, lichen, lily_pad | unchanged (decorative or not gathered) |

**New objects, appended (D8):**
- Resources: tin_outcrop, clay_bank, bog_iron, silver_outcrop, coal_seam, meteoric_outcrop, relic_heap.
- Worked states: the nine `*_worked` states (copper, tin, clay, ironstone, bog iron, silver, coal, gold, meteoric; plus `relic_heap_worked` only with P7's second option; none with P8's second option).
- Trees: ash_tree, elm_tree, ancient_oak, feywood_tree, feywood_tree_bare, skywood_tree, sapling.
- Plants: yarrow_plant, wild_flax, mushrooms, wild_roots, comfrey_plant, betony_plant, vervain_plant, mandrake_plant, moonwort_plant, star_thistle, and their `_picked` states; the 11 crops × 3 stages.
- Workshops: hearth, loom, kiln, carpenter_bench, mason_bench, quern, herb_table, relic_bench.
- Furniture: table, chair, chest, barrel, shelf, bed_wood, bed_fine.
- Walls and doors: wall_plank, wall_ashlar, wall_brick, wall_castle, door_plank, door_ironbound, gate_castle.

### 6.5 Other catalog sections
- **colony.skills → V63 skills:** woodcutting → woodcutting; gathering → foraging; stonework → mining (quarry, mine) and crafting (knapping); building → building; hauling → hauling; foraging → foraging; hunting → hunting; crafting → crafting; cooking → cooking; smelting → smithing; smithing → smithing; bowyery → fletching; fletching → fletching; tanning → leatherwork; leatherwork → leatherwork; carpentry → carpentry; fighting → attack, strength, defence (by combat style); archery → ranged. UF_Skills already converts old 0–20 values (UF_Skills.md → The old record).
- **labors:** furnace_operator, weaponsmith, armorsmith → smithing; bowyer, fletcher → fletching; tanner, leatherworker → leatherwork; carpenter → carpentry; soldier → the combat skills. New labors in §6.1.
- **cultures.<species>.arms.prefer** become shapes, and the arming step takes the highest tier the colony holds:

  | Species | Preferred shapes |
  |---|---|
  | human | sword, spear, bow_short, shield_round |
  | elf | bow_long, spear, dagger |
  | dwarf | battle_axe, mace, heater_shield, helm, hauberk |
  | gnome | sling, bow_short, dagger |
  | goblin | club, spear, sling, dagger |
  | orc | battle_axe, longsword, mace, club |
  | automaton | mace, longsword, kite_shield, helm |

  `chainWeights` keep their labor keys.
- **colony.plan and plans** (every step a fresh band must do is level 1, D13):
  - `bars: bar_iron` → `smelt_bronze` (default, stone, workshop).
  - `blades` → `craftBest`: `["sword", "dagger"]` (default), `["battle_axe", "mace", "dagger"]` (stone), `["dagger"]` (workshop). `spear_stone` stays (forest).
  - `bows` → `bow_short_common` (default, workshop), `bow_long_common` (forest).
  - `armor` → `jerkin_leather` (default, forest, workshop), and `craftBest ["hauberk", "jerkin"]` ×1 (stone).
  - New steps: `hammer` (stone_hammer, count 1) before `smithy`; `needle` (bone_needle, count 2) before `armor`; one `upgrade` step after `smithy`.
- **arrivals.goods:** seeds → seed_barley; gem_cut → gem_garnet (dwarf) and gem_agate (gnome); gold → ore_gold; gem_rough → gem_agate_uncut. Stone tools and the rest are unchanged.
- **start.kit / mapKit:** §1.8.

### 6.6 Saves
- **Item records:** `type` goes through `items.aliases` on load (UF_Items' `DataManager.extractSaveContents` alias, before UF_Jobs reads anything). Drop the `material` and `quality` fields if present.
- **Object grid:** new objects are appended (D8), so old grids keep their meaning. Old ore cells have no charges record and get one on first use.
- **Colony plan state:** plan steps are matched by `id`. Renamed recipes inside steps come from the catalog, so a loaded colony continues with the new plan.

### 6.7 Build plan
Each phase ends with the Definition of Done:
- F5 Playtest;
- its checks seen passing and seen failing;
- a screenshot opened and described;
- a clean F8 console;
- STATUS updated.

| Phase | Owner | Work | Checks it adds (each can fail) |
|---|---|---|---|
| **C0** Approval and agreement | user; Claude Code with the V64 run | The user answers P1–P21 (and THEME T16 B, which answers P6), and the VISION decision log is updated. The V64 run agrees to D12 (this file's item numbers replace the ones it wrote) and P19 (quality goes from UF_Skills and UF_Combat in the same change). The agreement is recorded in STATUS. | – |
| **C1** Data | Claude Code (editor closed first: AGENTS "RMMZ editor safety") | `tools/add_crafting_tiers.js` (idempotent) writes: `tiers`, `crafting.shapes`, expanded items and recipes, new objects appended, aliases, biome and region additions, wildlife yields and hunt levels, `fishing`, `farming`, `features`, labors, cultures, plans, arrivals and the `skills` edits (§3.12). It also makes the §5.10 removals and retires `add_combat_chains.js`. | `check_catalog.js`: `tiers_complete` (every family has contiguous ranks and every tier id used exists), `expansion_matches` (every shape × tier item and recipe exists with the level, XP and bonuses of §2.3 and §5, computed from the §3.13 rules), `levels_in_range` (1–99 everywhere), `recipe_inputs_exist`, `alias_targets_exist`, `no_quality_left` (no `quality`, `ability`, `combat.quality`, `skills.effects.quality` or `byMaterial` key), `objects_append_only` (the first 60 object ids are today's in today's order), `names_not_banned` (existing check, plus an OSRS name list: runite, rune, mithril, adamant, blurite, snakeskin, hard leather, soft clay, arrowtips, …), `not_osrs_ladders` (§3.13), `every_resource_placed` (every gatherable object is in a biome, a region rule, a feature or the kit) |
| **C2** Job hooks | Claude Code | UF_Jobs: attempts and charges (§3.3), drops on the resource's cell, craft levels, XP and the `xpPaid` flag, fuel, success, burn, make-X (§3.4), `bestTool` and `tool.speed`, the `salvage` action, types `plant`, `fill`, `tend`, build levels, equip requirements. UF_Floors: the floor job pays. UF_Skills: §3.12. UF_Colonists: level-aware targets, `craftBest` lists, `upgrade`, input depth 4, labor weights. | Suite `jobs`: `gather_attempts` (a level-1 miner on copper over 300 attempts succeeds 45% ± the binomial band, a level-46 one 97% ±), `below_level_refused` ("needs mining 13" on ironstone at 12), `charges_deplete` (an outcrop with 4 charges becomes its worked state after exactly 4 successes and regrows at due), `yield_on_cell` (every success drops on the resource's cell, none in the pack), `tool_speed` (a steel pick attempts 1.3 / 1.1 as often as bronze over 600 beats), `iron_smelt_fails` (at 17 about 40% of the smelts leave slag, at 50 none), `burn_curve` (meat at cooking 1 on a campfire burns 60% ±, at 32 never), `xp_on_success_only`, `xp_paid_once` (a chop, a craft, a build and a hunt each raise the skill by exactly this file's XP, and UF_Skills adds nothing on `jobs:done` or `jobs:kill`), `make_x_continues` (count 5 makes 5 and stops), `fish_best_first`, `plant_grows_and_harvests` (a turnip plot ripens after 48 emitted hours and yields ≥ 3), `equip_req` (a level-1 fighter can't equip a steel sword), `salvage_last_part` (a heap's last charge always gives a relic part). Suite `skills`: `meets_rejects_bad_calls`, `speed_skip` (P9 A: `rate(chop)` 1 at 99, `rate(craft)` 1.98). Suite `colonists`: `craft_best_tier` (with bronze and iron bars and smithing 20 the step makes an iron arming sword; at smithing 1 a bronze dagger), `upgrade_tools` |
| **C3** World generation | Claude Code | new objects placed by biome and region, fallen-star sites (T16 B), mapKit placement (not placed today), kit ores and bones, `@biome` regrowth | Suite `worldgen`: `new_resources_present` (over 4 seeds every mapKit minimum is met), `features_placed` (fallen-star sites at their counts and distances, none on water), `relic_parts_enough` (on 20 seeds, every map's wreck heaps guarantee at least 3 relic parts: one per heap), `kit_has_bronze` (copper and tin within 20 of every area centre), `kit_has_bone` (bones_pile within 20), `regrow_biome_tree`, `perf` (map build still ≤ 1.5 s). Suite `colonists`: `plan_gates_met` (for 2,000 bands of 8 rolled founders per species, every step of every plan up to `armor` is doable at the band's levels; fails on any step whose best option needs more than the band's best level in its skill), `fresh_band_finishes_plan` (one band of 8 freshly rolled founders per species, live at ×8, finishes the default plan through `armor` within 10 game days; the detail gives the days per species) |
| **C4** Items and combat | Claude Code with the V64 run | Weapon, armour, shield and ammo blocks read by UF_Combat. `ammoOf` reads `ammoKind` and `maxAmmoTier` (§5.2). Equip requirements, P12, arrow tiers per bow. The V64 balance reviewer adds tier matchups (bronze vs iron vs steel at equal levels). | Suite `combat`: `tier_bonus_used` (a steel falchion's max hit exceeds a bronze one's for the same strength), `arrow_tier_limit` (a common short bow refuses steel arrows and takes the best it may), `cursed_bonus` (P12) |
| **C5** Interface | Claude Code | Character sheet skills page (level, XP to next, what each level unlocks, from the catalog). Item tooltips (tier, bonuses, requirements). Workshop panel listing its recipes with the selected colonist's met and unmet levels (V59). Resource look tooltips ("Ironstone: mining 13"). | Suite `sheet`: `skills_page` (22 skills with levels), `recipe_levels_shown`; screenshots of each panel |
| **C6** Art | Gemini makes, Claude Code checks | `docs/handoffs/HANDOFF_crafting.md` and requests AR-1100 to AR-1199 (reserved here; written into `docs/ASSET_REQUESTS.md` once the names are approved), and the recolour tool | `tools/recolor_tiers.js` self-test; each delivery checked against ART_STANDARD §8 |

**Existing checks that C1–C4 change** (line numbers of 2026-09-19). Each is updated in the phase that breaks it and seen failing again against a sabotaged copy.

| Check | Where | What changes |
|---|---|---|
| `combat.max_hit` | UF_Combat.js line 1620 | `sword_long` → `longsword_iron`. The expectation reads the catalog's bonus, so only the id changes. UF_Combat.md's "10 with the catalog's +24" becomes 8 with +12. |
| `combat.styles` | line 1648 | `sword_long` → `longsword_iron` |
| `combat.equipment` | lines 1679–1703 | Ids: `sword_short` → `sword_iron`, `mace` → `mace_bronze`, `bow_short` → `bow_short_common`, `arrows` → `arrows_stone`. The pairs' bonus order holds under §5.3 and §5.8; the expected damage figures are re-run. |
| `combat.creatures` | line 1720 | The veteran's `sword_short`, `mail_iron`, `helmet_iron`, `shield_iron` → `sword_iron`, `hauberk_iron`, `helm_iron`, `buckler_iron`. The new iron items are weaker (arming sword strength 6 against 14, hauberk 15/20/10/16 against 18/22/12/18), so the "≥ 80 wins against a wolf" duel is re-run. If it fails, the V64 balance review decides. |
| `combat.attack_speed` | line 1833 | The one-handed iron axe is 5 ticks (180 updates), not 6 (216). The check uses `battle_axe_iron` (6 ticks) to keep 216. |
| `combat.death`, `perf` and the other fights | lines 1738, 1884–1886, 1923, 2000 | `sword_short`, `sword_long`, `mail_iron`, `shield_iron`, `mace` → the new ids |
| `jobs.tool_speeds_work` | UF_Jobs.js line 1081 | It reads `tool.speed` instead of `tool.chop`. A stone axe (1.0) against bare hands (0.5) is still ×2. |
| `jobs.travel_and_work` | UF_Jobs.md line 58 | "3 logs lie on its cell" → the oak's rolled charges (3–5) in logs lie on its cell (D6). |
| `skills.xp_by_doing` | UF_Skills.js lines 803–821 | Paid jobs (chop, `cook_meat`, the `bar_iron` → `smelt_iron` recipe, the stone wall, the hunt) give this file's XP through UF_Jobs and nothing on `jobs:done`. The synthetic-event cases move to unpaid types. |
| `skills.rate` | — | With P9 A, `rate(chop)` is 1. The check measures a craft instead. |
| `skills.extra_yield` | — | With P9 A, no gather job gives an extra yield. The check asserts none does, or is removed. |
| `skills.quality_and_meets` | UF_Skills.js lines 918–936 | Becomes `meets` (§3.12 item 4). |
| `check_catalog.js` self-tests | lines 299–300, 362–367, 378, 400, 406 | `combat.quality` checks and mutation go. Mutations naming `bar_iron`, `sword_short`, `bow_short`, `mail_iron` move to the new ids. `armor.ac` goes. |

### 6.8 Art needed, by generator group (`docs/handoffs/GENERATOR_PROMPTS.md`)
To keep the count down, Gemini draws **one master per shape**. `tools/recolor_tiers.js` (new, Claude Code) swaps the master's metal, wood, leather or cloth ramp for each tier's `ramp`, offline. Each recoloured file is still reviewed and approved (V11). Themed tiers may get bespoke masters later if the user wants them to look different beyond colour. Until art exists, every new entry uses a tinted existing image (the catalog's `tint`), marked as a stand-in.

Shapes follow THEME §1.2 and the T22 art paragraph: high medieval, no late plate armour. The coat of plates is plates riveted inside a cloth coat (13th century). The helm is drawn as a nasal helm.

| Group | New assets (states) | Count |
|---|---|---|
| Prompt 1 Ground | crater_glass (T16 B); tilled soil for the farm plot | 2 |
| Prompt 2 Trees | ash, elm, ancient oak (larger than an oak), fairy thorn (full and gossamer-picked), starwood, sapling; each standing (the shared stump stays) | 6 masters |
| Prompt 3 Small plants | yarrow, wild flax, mushrooms, wild roots, comfrey, betony, vervain, mandrake, moonwort, star-thistle (each full and picked); crops turnip, barley, wheat, flax and the seven herb crops, three stages each (seedling, growing, ripe) | 10 × 2 + 11 × 3 = 53 frames |
| Prompt 4 Stone and ore | tin, silver, coal seam, bog iron, meteoric outcrop, wreck heap (hull plates half-buried, THEME §2.11), clay bank; one worked-out outcrop (recoloured per ore) | 8 |
| Prompt 5 Buildings and workshops | kitchen hearth (unlit, lit), loom (idle, working), kiln (unlit, lit), carpenter's bench, mason's bench, quern, herbalist's table, relic bench (idle, working); table, chair, chest (closed, open), barrel, shelf, wooden bed, fine bed; plank, ashlar, brick and castle wall sets; plank door, iron-bound door, castle gate (closed, open) | about 25 |
| Prompt 7 Equipment layers | Held: 9 weapon shapes (dagger, arming sword, falchion, mace, spear, longsword, war hammer, battle axe, war sword), 4 tool shapes, quarterstaff, short bow, long bow, sickle, stone hammer. Head: helm, great helm, cap, hood, circlet. Torso: hauberk, coat of plates, jerkin, tunic. Legs: greaves, leggings, breeches. Shield: buckler, kite shield, heater shield, round shield. | 34 masters (tiers by recolour) |
| Prompt 10 Items and icons | See the list under this table. | about 110 masters |

The Prompt 10 items and icons:
- **Ores and metal:** 4 new ores (tin, silver, gold, meteoric), wreck-metal plate, clay, coal, slag, relic parts, relic fibre; bar master.
- **Wood and gems:** log and plank masters; gem uncut and cut masters.
- **Fish and food:** 9 new raw fish, one cooked-fish master, burnt food; flour, dough, bread, pottage, stew, meat pie.
- **Pottery:** 8 pieces (fired and unfired by recolour), jug of water.
- **Farming and herbs:** 7 herbs, seed pouch master, turnip, barley, wheat, flax.
- **Remedies:** bandage, poultice, salve pot, draught flask master.
- **Textiles and leather:** twine, thread and cloth masters; leather and raw-hide masters, sinew, tallow, spider silk, gossamer.
- **Tools:** fishing line, net, eel trap; chisel, saw, sickle, needle, spindle.
- **Jewellery:** ring, pendant and circlet masters.
- **Fletching and smithing parts:** nails, fittings, arrowhead master, arrow shafts, fletched shafts, arrow master, bowstring, spear shaft, unstrung and strung bow masters.
- **Carpentry and masonry parts:** bed frame, door leaf, dressed stone, flagstone, quern stone, statue, pillar, grave marker, altar stone.
- **Equipment:** one ground icon per weapon and armour shape.

The sentinel's art belongs to THEME T14, not to this file.

---

## 7. Not decided here, known limits
- **Owned elsewhere:** the XP curve, starting levels by age and culture, level-up display and boosts are UF_Skills'. The accuracy, max hit, styles and ticks are UF_Combat's. This file's numbers assume UF_Skills' curve, and are recalculated (not re-designed) if it changes.
- **Nothing here has run.** The pacing figures and the band and relic-parts figures are calculations from scratch scripts, not measurements in the game. No balance simulation of the tier bonuses was done: the V64 balance review adds tier matchups, bronze vs iron vs steel at equal levels.
- **The OSRS comparison of §3.13 is from memory.** It was not checked against the OSRS wiki. `not_osrs_ladders` (C1) checks it against a list typed from the wiki.
- **Magic has no content:** cloth and circlet magic bonuses, feywood and skywood planks, and the altar wait for a magic design.
- **Not designed:** seasons for crops, brewing, spoilage, item wear or repair, dyes, glass, snares, taming, boats (the deep-water fish are caught from the shore), trade prices beyond the `value` field, and the later shapes of P17 (coif, padded coat, kettle hat, surcoat, lance).
- **Tree coverage:** tropical and cold maps get the tier-2 to tier-4 trees only through the map minimums' patches. Native tropical and cold tier trees could be added later as twins with the same log items.
- **Waiting for the user:** the themed names, the fallen-star sites, the white hart, and every other PROPOSAL above. Until they are answered, phase C1 does not start.
