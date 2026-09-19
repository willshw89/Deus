# TECH_TREE: faction Building level and technology, personal skill unlocks, culture permissions

Design written 2026-09-19 by Claude Code. **Not built.** This is the spec for one build: a new plugin `UF_Tech.js` and the changes it needs in `UF_Skills.js` (Claude Code's file, in the same STATUS claim as this design).

The user's words (2026-09-19):
- 13:35: "I want everything in the game to level up like runescape, including crafting, building, etc, but building/tech should be faction-wide. Skills should unlock abilities and crafts and stuff as they level" (VISION V84).
- Earlier: "I want builder tech trees like Warcraft III. Don't copy, copy the concept. Like, your faction builds a certian about of X, Y unlocks" (V77), and "Different factions should have different development trees, weapons, etc" (V76).
- 13:40: "It should also take a different amount of world beats to do different shit. Cooking a smores isnt the same time/difficulty as chopping down a tree or mining ore" (V85). Work timing has its own design, `docs/design/WORK_TIMING.md` (written 2026-09-19 at about 13:57 by a sibling run of the same claim). It reads this topic's data through three adapters (its §10.1). §2.8 here fixes that interface so the two files never hold the same number twice.

Decisions it implements: V84, V77, V76, V63 and V66 (level requirements gate what a person may make, gather or use), V85 (interface only), V80 (everything carries `z`), V92 (over-head text is only speech: level-ups are spoken remarks, the numbers go to the profile and the chronicle), V86 (drag-marked designations obey the same gates), V28 (DF's mechanics, never its text or data), V9 and AGENTS rule 7 (every new name is a proposal; §11), V50 (budgets), V17 (orders are never required; nothing here gives orders, see CHAIN_OF_COMMAND.md). It leaves room for V87 (eleven peoples: more cultures) and V88 (classes opened by buildings, `docs/design/classes_draft_a.md`), which build on it.

Contract rules: `docs/design/WORLD_ARCHITECTURE.md` §1 (state in `UF.World.state` or `unit.data`, seeded randomness, no per-frame scans, budgets), `docs/ENGINE_RULES.md` §2 and §6.

---

## 0. In short
- **Two kinds of skill.** Every skill in `catalog.skills.list` is either personal (21 of them: the trades and the fighting skills, as today) or faction-wide (one: **Building**). Both use the same 1–99 curve.
- **Building belongs to the faction.** Every member's finished construction (`build`, `floor`, `dismantle`) adds its building xp to the faction's pool, not to the person. Nobody has a personal Building level. Construction speed is the faction's Building level times the builder's carpentry or masonry, as WORK_TIMING.md §4.1 defines it. Old saves move every person's building xp into their faction's pool. Faction level-ups go to the chronicle, and the band's leader remarks on them aloud.
- **Culture permissions (V76).** Each culture (the catalog's culture ids: human, elf, dwarf, gnome, goblin, orc, automaton) has a fixed list of buildings, floors and recipes it may ever make, derived from data that already exists (its plan variant, its wall, later wall, door and floor, its preferred arms, and what those need). Its arsenal is what those recipes make. Nothing outside the list ever unlocks for it.
- **The tech tree (V77).** Seven unlock nodes shared by all cultures, each permitting some buildings and recipes. A node's requirements are the faction's Building level, counts of structures the faction has completed ("build 6 walls, the furnace unlocks"), members' skill levels, other nodes and stock held. Unlocks are permanent and announced. Leaders plan only unlocked work. The content is existing catalog ids only; the upper Building levels have nothing to unlock until new content lands.
- **Personal unlocks (V84).** `catalog.skills.unlocks` gives, per skill, the level at which each recipe and each workable resource (trees, rocks, ores, fishing waters, plants, prey) becomes available, plus small abilities at milestone levels (faster work, less waste, more yield, a combat special for a weapon style).
- **Gating, by alias.** The build menu shows unlocked buildings, greys locked ones with their requirement and hides what the culture never builds. A person below a job's level can't take it (`UF.Jobs.take` passes them over and the right-click menu says who qualifies). Crafting refuses locked recipes. The society plan skips locked steps. Wraps from UF_Tech enforce every gate. The planner skips locked steps cleanly only with a two-line hook in UF_Colonists, which is requested from that file's owner (§7.3).
- **Views.** A level-up is a short spoken remark that names what the new level unlocks ("I'm getting better at woodcutting." then "I can chop down a broadleaf giant now."). The numbers go to the profile, not over the head (V92). The character sheet gets a Skills page (each skill's level, progress and next unlock, and the person's latest level-up). A new Unlocks view (key U) shows the faction's Building level and its unlocked and next nodes with progress.

---

## 1. The mechanics we learn from

### 1.1 Dwarf Fortress (read in `data/vanilla`, described in our own words)
In DF a civilization type carries a permission list that never changes in play. It names the jobs its people know, the special workshops they may put up, the reactions (recipes) those workshops may run, and the weapons, armour, clothing, tools, toys and ammunition its people make and carry, each marked common or rare. Flags say which materials it works with (wooden weapons, animal products, underground timber) and where it likes to live. A workshop definition gives its footprint, the cell where the work happens, the labour that builds it and the items it is built from. A reaction names the workshop it runs at, the skill it trains, what it consumes and what it makes (the entity file holds 202 job permissions and 313 reaction permissions across its civilizations, counted 2026-09-19 in `vanilla_entities/objects/entity_default.txt`; workshops are in `vanilla_buildings/objects/building_custom.txt`, reactions in `vanilla_reactions/objects/`). A civilization never learns a new workshop. What grows is the fortress: its people's skills rise by working, which mostly speeds work and raises quality rather than gating it. The site gathers knowledge over time: scholars advance knowledge branches (`release notes.txt:1883-1886`), and fighters pick up training know-how by doing (`:2764`). New kinds of locations open when enough people of a kind are present, such as guildhalls petitioned for by labourers (`:1215`).

### 1.2 Old School RuneScape (mechanics only; no names, numbers or text)
Every gathering spot and every recipe has a level requirement in one skill. Below it the action simply isn't available; at it, it is. Levels come from experience on a fixed curve by doing the skill. The level-up message tells the player what the new level allows. Higher levels also make the work faster and more reliable (V85 carries that part).

### 1.3 What UF takes
| From | Mechanic | UF form |
|---|---|---|
| DF | A fixed per-civilization permission list for workshops, recipes and arsenal | `tech.cultures[culture]`, derived from existing culture and plan data (§2.3) |
| DF | The settlement's own accumulated work opens new things | The faction Building pool and structure counts drive the unlock nodes (§2.2, §2.4) |
| DF | A recipe names its workshop and its skill | Already in `recipes.list[].at` and `.skill`; unchanged |
| OSRS | A hard level gate on each resource and recipe | `skills.unlocks` (§2.5), checked when a job is taken |
| OSRS | The level-up message names what's new | The level-up remark and the profile's latest line (§2.7) |
| V84 (user) | Abilities at set levels | `skills.unlocks.abilities` (§2.5.3), small and data-driven |
| V77 (user, Warcraft III as a concept only) | Build N of X unlocks Y | `requires.built` on a node (§2.4) |

---

## 2. UF's version

### 2.1 Personal skills and faction skills
`catalog.skills.list[]` gains `scope: "person" | "faction"` (missing = `"person"`). On 2026-09-19 only `building` becomes `"faction"`. A faction skill:
- keeps its entry, name, `jobs` list (`build`, `dismantle`, `floor`) and `xp` rule, so `jobXp` gives the same amount per job as today;
- is never stored on a person. `UF.Skills.add(person, "building", xp)` routes to the pool of `person.data.faction`;
- reads, for a person, as their faction's level: `UF.Skills.level(person, "building")` = the faction level (so `meets` and any old reader keep working);
- is left out of the personal total, `best()`, the death line and the personal milestone lines;
- is never rolled as a starting trade (`skills.start.tradeWeight.building` = 0; the draw already drops zero weights, UF_Skills.js line 311).

**Speed of building work.** V84's reading (open to correction) is that a builder's speed comes from tools and their other skills. WORK_TIMING.md §4.1 and §7 turn that into `f(B) × g(T)`: `f(B) = 1 + 0.01 × (B − 1)` for the faction's Building level B, and `g(T) = 1 + 0.005 × (T − 1)` for the builder's carpentry (structures tagged `wood`) or masonry (tagged `stone`). This design adopts it and adds no second rule:
- **Until V85 lands**, UF_Jobs multiplies by `UF.Skills.rate` (UF_Jobs.js lines 777-783). For a `build`, `dismantle` or `floor` job, `rate` already reads the building level, and after this change `level(person, "building")` is the faction's. So `rate` gives `f(B)` with no new formula. `g(T)` arrives with V85.
- The carpentry and masonry share of the building xp (`xp.buildShare` 0.5, UF_Skills.js lines 563-574) stays personal. It is how those two skills grow.

### 2.2 The faction Building pool
- **State:** `UF.World.state.skills.factions[factionId] = { building: xp }` (§4). Keyed by faction id, so it survives the death of every builder: the faction's knowledge stays when a person dies.
- **Sources:** `jobs:done` of `build`, `floor` and `dismantle` by a person whose `data.faction` is set. The amount is today's `jobXp("building", job)` = `5 + 0.1 × min(job.progress, 600)`. On 2026-09-19 that is campfire 17, wooden wall 14, stone wall 20, straw bed 11, work stone 13, stockpile 7, and 5.4–5.8 for the workshops and doors (their `work` is 4–8, already in beats; V85 converts the rest, §2.8). A person without a faction gains nothing and the amount is counted in `perf().dropped`.
- **Level-up:** when the pool crosses one or more levels:
  1. the chronicle gets one line per level-up, `UF.History.addEvent({ type: "faction_level", text: "The Solis Company reached Building level 3.", factions: [fid] })` (catalog `skills.chronicle.faction`: `every: 1`, `who: "all"`, see §12 D9);
  2. the band's leader remarks on it aloud (V92: speech, not a notice): `UF.Speech.say(leader, "We're getting better at building.", { kind: "remark" })` (catalog `skills.speech.factionRemark`) when UF_Speech exists and the leader is on screen. UF_Speech returns null otherwise, and nothing else is drawn over anyone's head. The leader is `UF.Command.headOf(fid)` when UF_Command exists; otherwise the living member of the faction with the highest `data.rank`, ties to the lowest id (UF_History makes the founders' leader rank 1 and everyone else 0). The level number itself is in the chronicle line and the Unlocks view;
  3. `skills:factionLevelUp(factionId, "building", level, unit)` fires. UF_Tech listens and evaluates the tree (§2.4).
- **New Game:** every faction's pool starts at 0 (level 1). The founders roll no Building trade (§2.1).
- **Old saves** (loaded through the `DataManager.extractSaveContents` alias, UF_Skills.js line 679, after `migrateState`): for each person holding `skillXp.building`, the xp is added to their faction's pool and the key is deleted. `state.skills.version` goes to 2 so it runs once. The pool is the sum of the members' xp (V84 says "move"). Example: two members with 1 154 (level 10) and 83 (level 2) give a pool of 1 237, which is level 10. §12 D2 asks whether the sum is right. A person with no faction loses theirs (counted, reported once on the console).

### 2.3 Culture permissions (V76)
**The rule.** A culture may ever build or make only what its own data already points to, closed over what those things need:
1. every building and recipe in its plan variant (`colony.plans[culture.plan]`, or `colony.plan` for `"default"`);
2. its `wall`, `laterWall` and `door` when they have a `build` cost, and its `floor.kind` (a UF_Floors ground kind), plus campfire and stockpile;
3. the recipes that make every item in its `arms.prefer`;
4. the shared survival set: `stone_knife`, `stone_axe`, `stone_pick`, `fiber_wrap`, `hide_cloak`, `cook_meat`, `cook_fish`, `split_firewood`;
5. closure: the workshop objects whose tag is a permitted recipe's `at`; a recipe for every input that some recipe makes (bars, charcoal, leather), when none is permitted yet; the same for a permitted building's `build.items`;
6. completion: a permitted armour piece permits the other armour pieces of the same labour and material (the leather set, the iron set); a permitted ammunition recipe permits the other ammunition at the same bench whose inputs the culture can make.

A tool (`tools/add_tech_catalog.js`, §13) computes the lists and writes them into `tech.cultures` as plain data. The runtime reads only the lists, so the user can edit them. `--check` recomputes and prints any difference. The result for the catalog of 2026-09-19 (computed by a scratch run of the rule that day):

| Culture (catalog name) | Wall / later / door / floor | Buildings it never builds | Weapons | Armour and shields | Recipes it never makes |
|---|---|---|---|---|---|
| human (Settlers) | wall_wood / wall_stone / door_wood / floor_wood | door_stone | short bow, spear, short sword | leather set, wooden shield | bar_copper, bow_long, sling, club, dagger_iron, sword_long, axe_iron, mace, the iron armour set |
| elf (Grove-keepers) | wall_wood / wall_wood / door_wood / floor_wood | wall_stone, door_stone | long bow, spear, iron dagger | leather set | bar_copper, bow_short, sling, club, shield_wood, sword_short, sword_long, axe_iron, mace, the iron armour set |
| dwarf (Stone-holders) | wall_stone / wall_stone / door_stone / floor_stone | wall_wood, door_wood, bowyer_bench, fletcher_bench | iron axe, copper mace | iron set (helmet, mail, greaves, shield) | every bow, sling and arrow; club, both spears, shield_wood, dagger_iron, both swords, the leather armour set |
| gnome (Tinkers) | wall_wood / wall_stone / door_wood / floor_stone | door_stone | short bow, sling, iron dagger | leather set | bar_copper, bow_long, club, both spears, shield_wood, both swords, axe_iron, mace, the iron armour set |
| goblin (Scavengers) | rubble_pillar (not buildable, §14 F1) / wall_wood / door_stone / floor_rushes | wall_stone, door_wood | short bow, club, spear, sling, iron dagger, short sword | leather set | bar_copper, bow_long, shield_wood, sword_long, axe_iron, mace, the iron armour set |
| orc (War-bands) | wall_wood / wall_stone / door_wood / floor_rushes | door_stone | short bow, club, short sword, long sword, iron axe, copper mace | leather set | bow_long, sling, both spears, shield_wood, dagger_iron, the iron armour set |
| automaton (Foundry-minds) | wall_stone / wall_stone / door_stone / floor_stone | wall_wood, door_wood | short bow, iron dagger, long sword, copper mace | leather set and iron set | bow_long, sling, club, both spears, shield_wood, sword_short, axe_iron |

Every recipe in the catalog is permitted to at least one culture (checked by the same run). The **arsenal** is what the permitted recipes make. It limits what a culture makes, not what its people may wield: scavenging (`cultures.*.arms.scavenge`) and trade still bring in other gear (§12 D5).

**New peoples (V87).** The "Eleven peoples" run appends cultures (lizardfolk, kobolds, the undead, the star-born and the swarm; the automata may become the star-born's constructs). The rule above runs on whatever cultures the catalog holds. After that run adds a culture, `tools/add_tech_catalog.js` derives its lists, and `tech.catalog_valid` fails for any culture without a `tech.cultures` entry. A faction keeps the culture id saved in `state.tech` (§4.1), so a later rename in the peoples data doesn't silently change a saved faction's tree.

### 2.4 The technology tree (V77)
**Nodes.** One list of nodes in `tech.nodes`, shared by all cultures. A node permits buildings, floors and recipes (placeholders `@wall`, `@door`, `@laterWall`, `@floor` resolve to the culture's own). What a node gives a faction is its permits **intersected with the culture's list**. A node that gives a culture nothing still unlocks for it, silently, when its requirements are met, so the graph stays connected. Node names are proposals and are not shown in play until approved (§11). Until then the UI names a node by what it permits ("Furnace and 3 recipes").

| Node id | Proposed name | After | Requires | Permits |
|---|---|---|---|---|
| `camp` | Campcraft | – | nothing (unlocked at world creation, silently) | campfire, stockpile, floor_straw, workbench, weapon_rack, `@wall`, `@door`, `@floor`; the survival set, club, spear_stone |
| `hides` | Hide-working | camp | Building 2; 1 workbench built | tanning_rack; leather, sling, helmet_leather, armor_leather, leggings_leather, shield_wood |
| `bows` | Bow-making | camp | Building 2; 1 workbench built | bowyer_bench, fletcher_bench; bow_short, bow_long, arrows_stone, arrows_bone |
| `smelting` | Smelting | camp | Building 3; 6 structures tagged `wall` built | furnace; charcoal, bar_copper, bar_iron |
| `forge` | Forge-work | smelting | Building 3; 1 furnace built | smithy; spear_iron, dagger_iron, sword_short, axe_iron, mace, arrows_iron |
| `armoury` | Armour-smithing | forge | Building 5; 1 smithy built; a member with smithing 10. **Dwarf override:** Building 4, no member requirement (their plan's armour step needs it) | helmet_iron, shield_iron, greaves_iron, mail_iron, sword_long |
| `stonework` | Stone-building | camp | Building 5; 12 structures tagged `wall` built; 20 stone held | `@laterWall`, door_stone |

**Requirements** (`requires`, all must hold):
- `level`: the faction's Building level;
- `built`: completed structures: `{ objectId: n }`, `{ "tag:wall": n }` (any object with that tag), a floor kind id (`floor_wood`), each optionally `{ count, z: [lo, hi] }` to count only some levels (§2.9);
- `members`: `{ skillId: level }` (one member at that level) or `{ skillId: { level, count } }`;
- `stock`: `{ itemId: n }` held by the faction: its members' inventories plus the items within its camp radius + 2 (the rule UF_Colonists' `colonyCount` uses, UF_Colonists.js line 1049);
- `classes`: `{ classId: { tier, count } }`, read through `UF.Classes.count(fid, classId, minTier)` when UF_Classes exists (V88; the Classes draft asks for exactly this criterion, `classes_draft_a.md` line 628). Without UF_Classes the requirement is unmet, and the Unlocks view says why;
- `after`: node ids that must be unlocked first.

The same evaluator answers any requirement record. So a class's opening criteria (V88: "building a temple for acolytes") can reuse it through `UF.Tech.meets(factionId, requires)`.

**Counting structures.** A `jobs:done` of `build` (object id) or `floor` (kind) by a member counts once for the worker's faction. A cell counts once per object id (`cells` in §4): building, dismantling and rebuilding on the same cell doesn't farm the count. Dismantling doesn't lower it. Unlocks are permanent: a node never locks again (§12 D4). Old saves count once at load: the objects tagged `building` (not `ruin`) within the faction's site radius + 8, on every level of that footprint (§4.2).

**Plan reachability.** A band must never wait forever on its own plan (the lesson of CRAFTING.md D13). So every building and recipe in a culture's plan must be permitted, for that culture, by at least one node that has no `members`, `stock` or `classes` requirement. That node's `level` and `built` requirements must be reachable by the plan's own construction. (A later node may permit the same thing again with other requirements; for dwarves, `stonework` repeats their wall and door, which `camp` already gives.) A scratch simulation (2026-09-19) walked every culture's plan in order with the catalog's build xp, unlocking nodes as their requirements were met:

| Culture | Plan | Building level from the plan's own builds | Nodes on the way (Building level when unlocked) | Plan steps left waiting |
|---|---|---|---|---|
| human, goblin, orc | default | 4 (282 xp) | camp 1, smelting 3, hides 3, bows 3, forge 3 | none |
| elf | forest | 3 (211 xp) | camp 1, smelting 3, hides 3, bows 3 | none |
| dwarf | stone | 4 (348 xp) | camp 1, smelting 4, hides 4, bows 4 (gives dwarves nothing), forge 4, armoury 4 | none |
| gnome | workshop | 4 (282 xp) | camp 1, hides 3, bows 3, smelting 3, forge 3 | none |
| automaton | workshop | 4 (360 xp) | camp 1, hides 4, bows 4, smelting 4, forge 4 | none |

WORK_TIMING.md §6.7 changes the building xp per structure when V85 lands (per nominal beat: stockpile 8, wooden wall 14, work stone 14, campfire 17, doors, tanning rack and weapon rack 17, stone wall 20, bowyer's and fletcher's benches 23, furnace and smithy 29). The same simulation with those values: human, goblin, orc and gnome reach Building 5 (389 xp), with the forge at 4; elves reach 3 (272); dwarves 5 (421), with the armoury at 5; automata 5 (467). No culture has a plan step left waiting. So the node levels hold under both today's numbers and V85's.

The simulation checks order, not pacing. Nothing past Building 5 exists in today's catalog, so levels 6–99 unlock nothing yet (the Unlocks view says "Nothing further to unlock yet"). New content (CRAFTING.md if approved, the V80 stairs and ramps, RESOURCE_ATLAS resources) adds nodes; `tech.catalog_valid` re-runs this simulation on every catalog change (§9). Houses built by UF_Society add building xp beyond the plan, which is how elves and others reach `armoury` and `stonework`.

**Evaluation.** Only the faction's *frontier* is evaluated: nodes not unlocked whose `after` nodes are. It runs on the events that can change a requirement, and only for frontier nodes that mention that requirement (indexes by kind, object, tag and skill, built at load):
- `skills:factionLevelUp`: nodes with a `level`;
- a structure counted: nodes whose `built` names that object, tag or kind;
- `skills:levelUp(unit, skill, level)` of a member: nodes whose `members` names that skill;
- `time:hour`: nodes with a `stock` requirement whose other requirements already hold (at most one stock count per such node per game hour);
- `world:created` and load: all nodes, silently.

**Announcing an unlock.** Unless silent: one chronicle line (`type: "tech_unlock"`, "The Solis Company can now build a Furnace and make Charcoal, Copper bar and Iron bar."), the leader's spoken remark ("We can build a furnace now.", kind `remark`, V92), and `tech:unlocked(factionId, nodeId, node)`. For the player's faction the chronicle line is always written; for the others it follows `tech.chronicle.who` (default `"all"`).

**Plans (V77 "society plans").** A node may carry `permits.planSteps: [step]`, steps appended to the faction's society plan when it unlocks. None are added in this build. One proposal for the user (§12 D6): `stonework` adds a step that rebuilds the shelter in the culture's `laterWall`, which is what `laterWall` in the culture data already implies.

### 2.5 Personal unlocks (V84): `catalog.skills.unlocks`
One table holds every personal level requirement. The skill is never repeated in it: it comes from the job type (`skills.list[].jobs`) or from the recipe (`skillOfJob("craft", recipe)`, UF_Skills.js lines 157-170), so a requirement can't disagree with the skill that trains it. Levels are first-pass tuning numbers of our own (not lore, not OSRS's; §12 D7). Rules used: everything the start kit (V67) and the plans' early steps need is level 1 (CRAFTING.md D13); later plan gear may wait for a skilled member; everything else rises with the object's existing `work` or its place in the chain.

#### 2.5.1 Workable resources (object ids by action; water kinds for fishing; species for hunting)
| Skill (job types) | Level 1 | Higher |
|---|---|---|
| woodcutting (`chop`) | oak, birch, pine, fir_snow, palm, dead_tree, stump, tree_savanna, tree_swamp, mangrove, wall_wood | cactus_tall 5, fruit_tree and fruit_tree_bare 10 (chop 300), tree_tropical 15 (chop 320), tree_cursed 20 (blighted region) |
| mining (`mine`, `quarry`) | copper_outcrop, ironstone (both are start-kit ores and the plan needs iron bars), granite_boulder, rubble_pillar, wall_stone | crystal 10, gold_outcrop 20 (mine 360) |
| foraging (`gather`, `pick`) | berry_bush, bush, desert_shrub, snow_bush, grass_tuft, reeds, fern, wild_grain, wheat_wild, fruit_tree (gather); rocks_small, gravel, rubble, bones_pile | cactus 5, crystal_small 5 |
| fishing (`fish`, by the water kind of the target cell: `UF.Tiles.waterKindOfTile(UF.World.getTile(ax, ay, x, y, 0))`, UF_Tiles.js line 178 and UF_World.js line 487; the kinds are the `water.surface` keys) | fresh, pond | marsh 5, swamp 5, brackish 10, salt 15, icy 20, deep 25, blighted 30 |
| hunting (`hunt`, by species) | every `wildlife.species` id, all 1 in this build | none yet: the colonists' prey search can't skip prey it may not hunt until the UF_Colonists hook of §7.3 lands |

`dig` and `dismantle` have no requirement.

#### 2.5.2 Recipes (level in the recipe's own skill)
| Skill | Recipes and levels |
|---|---|
| crafting | stone_knife 1, stone_axe 1, stone_pick 1, fiber_wrap 1, hide_cloak 1 |
| cooking | cook_meat 1, cook_fish 1 |
| woodcutting | split_firewood 1 |
| smithing | charcoal 1, bar_iron 1, dagger_iron 1, sword_short 1, axe_iron 1 (each a plan step somewhere), bar_copper 5, spear_iron 10, mace 10, helmet_iron 15, greaves_iron 20, shield_iron 20, sword_long 20, mail_iron 25 |
| leatherwork | leather 1, armor_leather 1, sling 5, helmet_leather 5, leggings_leather 5 |
| fletching | bow_short 1, bow_long 1, arrows_stone 1, arrows_bone 5, arrows_iron 15 |
| carpentry | club 1, spear_stone 1, shield_wood 5 |

The one plan step above level 1 is the stone plan's `armor` (mail_iron, smithing 25): a dwarf band makes mail only when a member reaches 25; the plan skips the step for everyone below it and goes on (§2.6). How many dwarf bands start with such a smith is not measured; the build measures it over 2 000 seeded bands with the real `startLevels`, as CRAFTING.md D13 did, and reports it (§12 D7).

#### 2.5.3 Abilities
Small perks at milestone levels, data only. One effect kind each, from a closed set that UF_Skills applies:

| Kind | Effect | Applied where |
|---|---|---|
| `speed` | `mul` on the work rate for `jobs` (optionally only objects with `tags`, or recipes of the ability's skill) | `UF.Skills.perk(unit, skill, "speed", job)`. Until V85 lands, `rate()` multiplies it in (UF_Jobs.js line 777 is the only path UF_Jobs has); after V85, UF_Jobs reads it as WORK_TIMING's `perkSpeed` and uses `levelRate()` for the level part, so it is never counted twice (§2.8) |
| `yield` | `add` to the extra-yield chance for `jobs` | `extraYield` (UF_Skills.js line 543) |
| `saveInput` | `chance` that a finished craft of the skill gives one input back (optionally only inputs with `tags`) | `onJobDone` of `craft` (UF_Skills.js line 552), seeded per job; skipped when V85 marks the job `burnt` or `wasted` |
| `extraOutput` | `chance` of `count` more of the output (optionally only outputs with `tags`) | the same |
| `fail` | `mul` on the chance that the skill's work fails (a burnt meal, a shattered stone, a wasted smelt) | `UF.Skills.perk(unit, skill, "fail", job)`, WORK_TIMING's `perkFail`; no effect until V85 adds failures |
| `combat` | `{ attackType, every, effect: "accuracyTwice" \| "maxHitMul", value }` | read by UF_Combat through `UF.Skills.abilities(unit, { kind: "combat" })`; needs UF_Combat's owner (§7.3) |

Every ability also carries `text` (what the profile shows until its name is approved) and `remark` (a first-person sentence said aloud at the level-up, V92).

| Skill, level | Id | Proposed name (§11) | Effect | Shown until the name is approved |
|---|---|---|---|---|
| woodcutting 30 | `wc_swing` | Clean Swing | speed ×1.10 on `chop` | Chopping 10% faster |
| woodcutting 60 | `wc_heartwood` | Heartwood Eye | yield +0.10 on `chop` | More logs when chopping |
| mining 30 | `mn_pick` | Steady Pick | speed ×1.10 on `mine`, `quarry` | Mining 10% faster |
| mining 60 | `mn_seam` | Seam Sense | yield +0.10 on `mine` | More ore when mining |
| foraging 20 | `fg_picker` | Keen Picker | speed ×1.15 on `gather`, `pick` | Gathering 15% faster |
| fishing 25 | `fs_line` | Patient Line | speed ×1.15 on `fish` | Fishing 15% faster |
| hunting 30 | `hn_step` | Quiet Step | speed ×1.15 on `hunt` | Hunting 15% faster |
| cooking 20 | `ck_heat` | Even Heat | speed ×1.15 on cooking crafts; fail ×0.5 (burning, once V85 has it) | Cooking 15% faster |
| crafting 25 | `cr_thrift` | Thrifty Hands | saveInput 0.10 | Sometimes saves material |
| smithing 35 | `sm_frugal` | Frugal Forge | saveInput 0.10 on inputs tagged `metal` | Sometimes saves a bar |
| fletching 30 | `fl_straight` | Straight Fletching | extraOutput 0.15, +2, outputs tagged `ammo` | Sometimes 2 extra arrows |
| leatherwork 25 | `lw_cut` | Clean Cut | saveInput 0.10 on inputs tagged `leather` or `hide` | Sometimes saves leather |
| carpentry 25 | `cp_pace` | Joiner's Pace | speed ×1.10 on `build`/`floor` of objects or kinds tagged `wood` | Wooden building 10% faster |
| masonry 25 | `ms_plumb` | Plumb Line | speed ×1.10 on `build`/`floor` tagged `stone` | Stone building 10% faster |
| attack 40 | `at_thrust` | Twin Thrust | combat: `stab`, every 4th attack rolls accuracy twice | Every 4th stab aims twice |
| strength 40 | `st_weight` | Crushing Weight | combat: `crush`, every 5th hit max hit ×1.10 | Every 5th crushing blow hits harder |
| ranged 40 | `rg_draw` | Steady Draw | combat: `ranged`, every 5th shot rolls accuracy twice | Every 5th shot aims twice |

Skills with no ability yet: farming, healing, hauling, defence, magic, hitpoints, and building (faction). The rolls for `saveInput` and `extraOutput` are `mulberry32(hash32(seed, 0x5c14, unitId, jobId))()`: the same job always gives the same answer, like the extra-yield roll. Remarks are plain first-person sentences (for example `wc_swing`: "My swing's getting cleaner."; `cr_thrift`: "I'm wasting less these days."). They are text, not names, and the build writes one per ability.

**Classes (V88).** The Classes draft grants abilities by class tier as well as by skill level. It uses the same record shape and the same effect kinds, and reads them through the same `UF.Skills.abilities(unit)` and `perk()`. The only difference is the source (a class tier instead of `skill` and `level`). This design builds only the skill-level source.

### 2.6 Gating
One question answers every gate: `UF.Tech.canWork(unit, job)` → `{ ok, reason, need }`. It checks, in order:
1. **Culture** (the unit's faction's culture): a `build` of an object, a `floor` of a kind, or a `craft` of a recipe that the culture never makes: reason "Stone-holders don't make short bows" (the culture's catalog `name`, already approved data).
2. **Faction unlock:** permitted but not unlocked: reason "not unlocked yet: needs Building level 3 (now 2), 6 walls built (4/6)".
3. **Personal level** (`skills.unlocks`): reason "needs woodcutting 15" (the unit's level is below the requirement).

Units that aren't people (wildlife, monsters) and units without a faction are never gated. The gates, all installed by UF_Tech at `Scene_Boot.start` (file and line of each hook: §7):
- **Job taking.** UF_Tech wraps the `plan` function of the handlers of `chop`, `gather`, `pick`, `quarry`, `mine`, `fish`, `hunt`, `build`, `floor` and `craft`. `UF.Jobs.take` dry-runs `plan` for each candidate unit (UF_Jobs.js line 738), so an unqualified person passes over the job (it stays open, `job.reason` = the reason) and the next person who qualifies takes it. UF_Colonists' `designationJob` takes designations only through `take`, so a designation is never lost. A job created for one person (an order, a plan job) fails at once with the reason. A job type defined later goes through the same wrap (UF_Tech also wraps `UF.Jobs.define`).
- **Right-click menu, who qualifies.** Each object action (`Chop down …`, `Mine …`) and `Fish here` whose requirement is above 1 gets a suffix: `· woodcutting 15: Mira, Tob +2` (the player's colonists at or above it, nearest first, at most 2 names) or `· woodcutting 15: nobody yet`. The option stays enabled: the designation waits until someone qualifies.
- **Build menu.** In the "Build here" submenu, unlocked buildings stay as they are. Locked but permitted ones are disabled (greyed by `Window_Command`) with the requirement in the label: `Furnace — 6 stone · Building 3 (now 2), 6 walls (4/6)`. Choosing a disabled option does nothing (UF_Interact.js lines 628-629 and 662). Buildings the culture never makes are left out. Order: the culture's wall first (as today), then unlocked, then locked.
- **Crafting.** The `craft` wrap refuses a recipe the culture never makes, one not unlocked, and one above the crafter's level.
- **The society plan.** `UF.Tech.stepLocked(unit, step)` is true when the step's building or recipe fails 1 or 2 for the unit's faction, or when its recipe fails 3 for that unit. The planner skips such a step for that unit, and another member who qualifies still takes it (a hook in UF_Colonists, §7.3). The public `UF.Colonists.planStatus(fid?)` gains `locked: true` and `lockReason` for faction-locked steps, which is what the views and CHAIN_OF_COMMAND's head pass read, so leaders plan only unlocked work.

Everything already built stays usable: a workshop that exists is used whatever the tree says. The gates act on new work only.

**Drag-marked designations (V86, the UF_Select run).** A rectangle makes the same open jobs as the right-click menu, so the same gates apply with nothing extra: a locked building is refused, and a tree above everyone's level waits for someone who qualifies. For its preview ("N cells will be marked"), UF_Select can count the cells that pass with `UF.Tech.canWorkObject` (and `allows` for buildings) and show how many wait on a level. That is its choice.

### 2.7 Views and text
- **Level-up remark** (personal, UF_Skills `onLevelUp`, UF_Skills.js lines 485-496). V92 allows only speech over heads, and says "A level-up is said aloud as a short remark by the person". So the person says, through `UF.Speech.say(unit, text, { kind: "remark" })`:
  1. `skills.speech.remark`, "I'm getting better at {skill}." (the skill name in lower case);
  2. when the levels crossed unlock something, a second queued line: `skills.speech.unlockRemark`, "I can {unlocks} now.", for example "I can chop down a broadleaf giant now." or "I can forge a long sword and forge iron greaves now." An action unlock reads as the menu's verb and the object ("chop down a broadleaf giant", "mine a gold outcrop"); a recipe as its catalog name ("forge a long sword"); water as "fish in salt water"; prey as "hunt a deer". At most 2 things, then "and more". An ability says its own `remark` instead ("My swing's getting cleaner.").

  Nothing else is drawn over the head. UF_Skills' own gold-text fallback (`Sprite_UFSkillLine`, UF_Skills.js lines 386-440) and the UF_Visuals bark path (lines 454-461) are removed, and without UF_Speech a level-up is silent over the head. The level number and the unlock go to the profile: `unit.data.skillsLatest = { skill, level, unlocks: [ids], at }` (saved, about 60 bytes), which the Skills page shows. They also go to the chronicle at the milestone levels, as today (10, 25, 50, 75, 99).
- **Faction level-up and unlock remarks:** the leader's lines of §2.2 and §2.4; the numbers are in the chronicle and the Unlocks view.
- **Skills page on the character sheet** (any person, including strangers; not animals). The sheet has no pages today (UF_Sheet.md, Known limits). UF_Tech adds a tab pair `Inventory | Skills` at the right end of the title row of the page's main section (the `Inventory` grid title in inventory mode). In skills mode the panel keeps the header (face, name, faction, doing) and shows 22 rows of 18 px: first `Building (faction)` with the faction's level, then the 21 personal skills in catalog order. Each row shows the name, the level, a 3 px progress bar to the next level, and on the right, dimmed, the next unlock: `next 15: Broadleaf giant (+1)`, or `—`. The footer shows the latest level-up, `Latest: woodcutting 15 · Broadleaf giant` (V92: the profile carries what the head doesn't), else `Total level 132 · combat level 12`. Clicking a row puts that skill's whole unlock list in the footer. Height: header 78 + tabs 18 + 22 × 18 + footer 18 = 510 px, inside the panel's 514 px of contents (816 × 624 screen, panel top 82).
- **Unlocks view** (key U, `Input.keyMapper[85] = "ufTechUnlocks"`; no plugin mapped 85 on 2026-09-19; Escape, a right-click or U again closes it). A `Window_Base` in the map's window layer, centred, for the player's faction:
  - `Unlocks — The Solis Company (Settlers)`;
  - `Building level 4` with a bar and `282 / 388 xp`;
  - `Built:` the four largest counts (`13 Wooden wall · 2 Stockpile · 1 Campfire · 1 Work stone`);
  - `Unlocked:` one line per node, named by what it gave (approved name once there is one);
  - `Next:` each frontier node with every requirement and its progress, met ones ticked: `Furnace and 3 recipes — Building level 3 (4 ✓) · 6 walls built (13 ✓)`, `5 recipes — Building level 5 (4) · 1 Smithy built (0) · a member with smithing 10 (best 3)`;
  - `Later:` how many nodes lie beyond the frontier;
  - Tab turns pages when the text is taller than the window.
  The texts are generic words, not names.

### 2.8 Work time and difficulty (V85): the interface
V85: every action has its own number of world beats and its own difficulty (a required level, a success chance per attempt that rises with level, and a failure cost). WORK_TIMING.md designs durations, success and failure: progress actions (a length in beats, a rate per beat) and attempt actions (swings with a chance anchored at the required level), with outcomes `time`, `burnt` and `wasted`. It says that required levels belong to this topic and only reads them (WORK_TIMING.md §0 and §6). This file fixes where each number lives:

| Number | Lives in | Read by |
|---|---|---|
| The level needed to try an action or recipe | `skills.unlocks` (§2.5) only | UF_Tech's gates; WORK_TIMING's chance line and fail line (as R) |
| Base beats, swings, chance pair, hardness, failure | WORK_TIMING's data (§9 there) on the object actions, recipes and builds | UF_Jobs (WORK_TIMING §10.1) |
| The faction's Building level | `state.skills.factions` (§2.2) | the construction factor `f(B)` |
| Speed and failure perks; waste and output perks | `skills.unlocks.abilities` (`speed`, `fail`, `saveInput`, `extraOutput`, `yield`) | `perk()` (as `perkSpeed` and `perkFail`), `onJobDone`, `extraYield` |

**WORK_TIMING's three adapters (its §10.1) and the calls that answer them:**
| Adapter | Answered by |
|---|---|
| `requiredLevel(unit, spec)` | `UF.Skills.requirementOf(job)` → `{ skill, level }` (level 1 when no row exists) |
| `factionBuildingLevel(factionId)` | `UF.Skills.factionLevel(factionId, "building")` |
| `perk(unit, skill, "speed" \| "fail")` | `UF.Skills.perk(unit, skill, kind, job?)` → the product of the unit's matching abilities (1 when none) |

**One count only.** Today `UF.Skills.rate` is the only multiplier UF_Jobs applies (UF_Jobs.js lines 777-783), so this build puts the speed perks into `rate`. WORK_TIMING §4.1 multiplies `levelSpeed × perkSpeed`, so its build must take `levelSpeed` from the new `UF.Skills.levelRate` (the level alone) rather than `rate`. Otherwise the perk counts twice (§14 F6).

`tech.catalog_valid` fails if a recipe or object action carries its own `level` or `minLevel` (as CRAFTING.md §6.1 proposes). If CRAFTING's C1 is approved, its tool writes its levels into `skills.unlocks` instead.

Today's work values show why V85 is needed. They mix frame ticks and beats: chopping an oak 240 ticks, mining ironstone 300 ticks, fishing 200 ticks, gathering tall grass 20 ticks, roasting meat 90 ticks, building a wooden wall 90 ticks, but smelting an iron bar 10 beats, building a furnace 8 beats, laying a floor 4 beats. The building xp per job is `5 + perWork × work`, so V85's conversion (WORK_TIMING §6.7: building `perWork` 0.1 → 3 per nominal beat) changes the faction's xp per structure. §2.4 shows that the node levels hold with both sets of numbers. The plan-reachability simulation in `tech.catalog_valid` (§9) re-checks them on every catalog change.

The user's example in their own terms: roasting food is a short progress action (3 beats in WORK_TIMING §7) that a novice may burn, with nothing to unlock (cooking 1). Felling a tree is a run of axe swings whose count grows with the tree, and the tougher trees need a woodcutting level first (§2.5.1). Mining ore is the same with a pick, and gold needs mining 20. This file sets the "needs level N first" part, and WORK_TIMING sets the "how long and how sure" part.

### 2.9 z (V80)
Designed with z from the start. Until UF_Levels lands, one helper gives z 0: `const zOf = ref => (window.UF && UF.Levels && typeof UF.Levels.zOf === "function") ? UF.Levels.zOf(ref) : (ref && Number.isInteger(ref.z) ? ref.z : 0);`. Swapping the helper is a one-line change.
- A counted structure is keyed by `(area, x, y, z)` (§4).
- `requires.built` can count only some levels: `{ "tag:wall": { count: 4, z: [1, 2] } }` ("4 walls on an upper level").
- `permits.levels: [z, …]` lets a node gate construction and digging on a level (for example, building on +1 and +2, or digging into −1 and −2). The schema has it; **no node uses it** until the user decides (§12 D8), because V80 doesn't say whether vertical access is earned.
- Every object lookup in the gates goes through `objectAt(cell)` = `UF.Objects.atIn(cell.area, cell.x, cell.y, zOf(cell))`; today's `atIn` ignores the fourth argument.
- Workable resources on −1 and −2 (RESOURCE_ATLAS) get their rows in `skills.unlocks` when they become objects. Codex's manifest check can then assert every resource has a level (§14 F4).

---

## 3. Catalog data (`game/data/UF_WorldCatalog.json`)

### 3.1 Changes inside `skills` (UF_Skills' key)
```json
"list": [ …, { "id": "building", "name": "Building", "kind": "trade", "scope": "faction", "jobs": ["build", "dismantle", "floor"], "xp": { "base": 5, "perWork": 0.1 } }, … ],
"start": { …, "tradeWeight": { …, "building": 0 } },
"speech": { …, "remark": "I'm getting better at {skill}.", "unlockRemark": "I can {unlocks} now.", "unlockMax": 2, "factionRemark": "We're getting better at {skill}." },
"chronicle": { …, "faction": { "every": 1, "who": "all", "text": "{faction} reached {skill} level {level}." } },
"unlocks": {
  "about": "…",
  "actions": { "chop": { "oak": 1, "tree_tropical": 15, … }, "mine": { … }, "quarry": { … }, "gather": { … }, "pick": { … } },
  "fish": { "fresh": 1, "salt": 15, … },
  "hunt": { "deer": 1, … },
  "recipes": { "stone_knife": 1, "sword_long": 20, … },
  "abilities": [ { "id": "wc_swing", "skill": "woodcutting", "level": 30, "name": "TEST_Clean_Swing", "text": "Chopping 10% faster", "remark": "My swing's getting cleaner.", "effect": { "kind": "speed", "jobs": ["chop"], "mul": 1.1 } }, … ]
}
```
Only the paths named here change; the rest of `skills` stays byte-identical (the tool asserts it).

### 3.2 New key `tech`
```json
"tech": {
  "about": "…",
  "cultures": {
    "human": { "buildings": ["campfire", …], "floors": ["floor_wood"], "recipes": ["stone_knife", …], "rule": "derived 2026-09-19 (TECH_TREE.md §2.3)", "overrides": {} },
    "dwarf": { …, "overrides": { "armoury": { "requires": { "level": 4, "built": { "smithy": 1 } } } } },
    …
  },
  "nodes": [
    { "id": "camp", "name": "TEST_Campcraft", "root": true, "after": [], "requires": {},
      "permits": { "buildings": ["campfire", "stockpile", "floor_straw", "workbench", "weapon_rack", "@wall", "@door"], "floors": ["@floor"], "recipes": ["stone_knife", …], "levels": [], "planSteps": [] } },
    { "id": "smelting", "name": "TEST_Smelting", "after": ["camp"], "requires": { "level": 3, "built": { "tag:wall": 6 } }, "permits": { "buildings": ["furnace"], "recipes": ["charcoal", "bar_copper", "bar_iron"] } },
    …
  ],
  "text": {
    "chronicle": "{faction} can now {what}.", "speech": "We can {what} now.",
    "menuLocked": "{cost} · {needs}", "notCulture": "{culture} don't make {thing}", "notUnlocked": "not unlocked yet: {needs}", "needsLevel": "needs {skill} {level}"
  },
  "chronicle": { "who": "all" },
  "stockEveryHours": 1,
  "keys": { "unlocks": 85 }
}
```
`overrides[nodeId]` replaces the named keys of that node for that culture (`requires`, or `permits` additions and removals).

---

## 4. State and save format

### 4.1 Saved state
- `UF.World.state.skills = { version: 2, rolls, factions: { [factionId]: { building: xp } } }` (xp to one decimal, capped at `skills.maxXp`).
- `UF.World.state.tech = { version: 1, factions: { [factionId]: { culture, unlocked: { nodeId: tick }, built: { key: count }, cells: { key: { "ax,ay": [packed, …] } }, stockAt: { nodeId: hour } } } }`, where
  - `key` is an object id or a floor kind id; tag counts are not stored but summed from the object ids when evaluated;
  - `packed = ((z + 2) × 256 + y) × 256 + x` (z −2..2 gives 0..327 679);
  - `culture` is set at creation from `UF.Factions.get(fid).species` and kept, so a later change to faction data doesn't change a saved faction's tree;
  - `tick` is `UF.Beat.count` when it exists, else the job clock.
- People: `unit.data.skillXp` no longer holds `building`. `unit.data.skillsLatest = { skill, level, unlocks: [ids], at }` holds the latest personal level-up for the profile (§2.7).
- Size: 7 factions × about 2 000 structures × about 7 bytes ≈ 100 KB at the far end; a new world is well under 1 KB. Within V50's 3 MB.
- Not saved: indexes, the menu decoration, the views' state.

### 4.2 Migration
- **Personal Building xp → pool:** §2.2 (UF_Skills, once, `state.skills.version` 1 → 2).
- **No `state.tech`:** created at load. Each faction gets its culture, `camp` unlocked, and structure counts from one bounded scan per faction: objects tagged `building` and not `ruin` within its site's radius + 8, on every level that exists under that footprint (z 0 only before V80). Then every node is evaluated **silently**: no chronicle lines or speech for what an old save already earned.
- **Saves made before V80** carry no z: the helper reads 0.
- A migrated save must match a fresh evaluation: the `tech.saved` check compares them.

---

## 5. Events
| Event | Payload | Emitted by |
|---|---|---|
| `skills:factionLevelUp` | `(factionId, skillId, level, unit)` | UF_Skills |
| `skills:ability` | `(unit, abilityId, job, result)` for `saveInput` and `extraOutput` rolls that hit | UF_Skills |
| `tech:unlocked` | `(factionId, nodeId, node, { silent })` | UF_Tech |
| `tech:counted` | `(factionId, key, count, cell)` | UF_Tech |
| `tech:refused` | `(job, unit, reason)`, at most once per job and unit | UF_Tech |

UF_Tech listens to `world:created`, `jobs:done`, `skills:factionLevelUp`, `skills:levelUp`, `time:hour`, `world:unitRemoved` (drops a dead member from the "who qualifies" cache). Every handler is wrapped in try/catch; errors are counted (`errors`, `errorCount()`), logged and never thrown into the bus (the UF_Skills pattern).

---

## 6. Scheduling and cost (V50)
- **Nothing runs per frame** while the Unlocks view and the skills page are closed. No whole-map or whole-level scans at any time. The one bounded scan is the load migration (§4.2), once per faction.
- **Per job:** one `jobs:done` handler: count (a Set lookup), add xp, evaluate the indexed frontier nodes (≤ 7 nodes × ≤ 5 requirements). Budget ≤ 0.05 ms per event, measured in `tech.perf`.
- **Per gate:** `canWork` runs in the job's `plan` (at assignment, dry runs, replans), not per tick: a Map lookup for the culture, one for the unlock, `UF.Skills.level` (a binary search over 99). Budget ≤ 5 µs per call. `UF.Skills.rate` stays in its budget of 10 µs per call with abilities (the abilities of each skill are pre-grouped at load: ≤ 2 per skill).
- **Per game hour:** the stock count only for frontier nodes with a `stock` requirement whose other requirements hold (none on a fresh world).
- **Menu:** decoration when a menu opens or a submenu is set (≤ 1 ms per open, ≤ 30 colonists compared).
- **Views:** the skills page rebuilds its rows on the sheet's own 15-frame check and redraws only when its signature (level and whole percent of each skill, plus the faction xp) changed. The Unlocks view redraws on `tech:*` and `skills:factionLevelUp` events and on page turns; it creates its bitmap once per map scene.

---

## 7. Hooks: where UF_Tech and UF_Skills attach
Line numbers are of the files in `game/` on 2026-09-19 at 14:01. UF_Jobs.js and UF_Colonists.js changed at 13:58 that day (another run's V92 edits), and the five-level run is editing UF_Jobs, UF_Interact, UF_Look and UF_Objects for z. So each hook also names its function; find it by name if the numbers have moved.

### 7.1 Runtime wraps by UF_Tech (no other file edited)
| File, line | Function | What UF_Tech does |
|---|---|---|
| UF_Jobs.js 915 (`Jobs.handler`), handlers defined at 222-248 (`objectAction`: chop, gather, pick, quarry, mine), 322 (`build`), 365 (`craft`), 446 (`hunt`); UF_Interact.js 173 (`fish`); UF_Floors.js 219 (`floor`) | each handler's `plan(job, unit)` | Wrapped at `Scene_Boot.start`: `canWork` first; on refusal return `{ ok: false, reason }`, else call the original |
| UF_Jobs.js 209 / 913 | `UF.Jobs.define` | Wrapped so a gated type defined later is wrapped too |
| UF_Jobs.js 729-746 | `take` | Not wrapped: its dry run (line 738) calls the wrapped `plan`, which is what passes over unqualified people |
| UF_Interact.js 574-605 | `UF.Interact.open(x, y, at)` | Wrapped (as UF_Sheet does, UF_Sheet.js 1324-1334): after the original, decorate the window's options and `setOptions` when anything changed |
| UF_Interact.js 539 | `UF.Interact.MenuWindow.prototype.setOptions` | Wrapped: decorate the list (the build submenu arrives here) |
| UF_Interact.js 431 | `UF.Interact.optionsFor` | Wrapped: the same decoration, so tests and UF_Sheet see what the player sees |
| UF_Colonists.js 1060 (`planStatus`, game copy), `planStatus: planStatusOf` in the bands run's copy | `UF.Colonists.planStatus(fid?)` | Wrapped: adds `locked` and `lockReason` per step |
| UF_Sheet.js 683 (`Window_UFSheet`, exported as `UF.Sheet.Window`, line 1090): `redraw` 1040, `processPanelTouch` 787, `update` 736 | the panel window | Wrapped on the prototype: tab strip, skills page drawing and layout, tab and row clicks, the page's own signature check |
| — | `Input.keyMapper[85]`, `Scene_Map.prototype.update`, `Scene_Map.prototype.createAllWindows` | Core aliases: the U key, the Unlocks window |
| — | `DataManager.extractSaveContents`, `Scene_Boot.prototype.start` | Core aliases: migration (§4.2); hooks, wraps, the `tech` suite |

### 7.2 Changes inside UF_Skills.js (Claude Code's file, this claim; merge rule: compare with the snapshot copy before copying back)
| Line | Function | Change |
|---|---|---|
| 105-153 | `cfg` | Read `scope`, the `unlocks` block (indexes by action and object, water kind, species, recipe; abilities grouped by skill), the new `speech` templates, `chronicle.faction` |
| 209-219 | `level` | A faction skill: the level of `unit.data.faction`'s pool (1 without a faction) |
| 221-236 | `xp`, `setLevel` | A faction skill: the pool's xp; `setLevel` returns false (tests use the new `setFactionLevel`) |
| 237-244 | `total`, `best` | Personal skills only |
| 298-331 | `startLevels` | No change of code: `tradeWeight.building` 0 drops it from the draw (line 311) |
| 371-379, 679-690 | `migrateState`, the load alias | Move personal building xp into the pools once (§2.2) |
| 386-468 | `Sprite_UFSkillLine`, `drawLine`, `sayOverHead` | V92: speech only. `sayOverHead` keeps the `UF.Speech.say` path with kind `remark`; the drawn gold line and the UF_Visuals bark path go |
| 485-496 | `onLevelUp` | The remark and the unlock remark (§2.7); `data.skillsLatest` |
| 498-514 | `add` | Route a faction skill to `addFaction`; faction level-ups (§2.2); rate and xp modifiers (below) |
| 525-550 | `extraYield` | + the `yield` abilities and yield modifiers |
| 552-575 | `onJobDone` | `saveInput` and `extraOutput` rolls after a craft; no rolls when `job.result.outcome` is `burnt` or `wasted` (V85) |
| 594-601 | `rate` | `rate = levelRate × perk(speed) × rate modifiers`. `levelRate` is today's formula, split out and exported. Construction needs no special case: the building level read is the faction's (§2.1) |
| 617-632 | `meets` | Unchanged; `requirementOf(job)` feeds it |
| 638-652 | `onDeath` | The death line lists personal skills only |
| 692-706 | the API | §8.2 |
| 720-1053 | suite `skills` | `xp_by_doing`: the stone wall's building xp is checked on the faction's pool; `old_record_converted`: a converted building level lands in the pool; `death_chronicle`: totals over 21 skills; `level_up_line`: the remark through UF_Speech and no drawn line (V92) |

**Modifier registries, also asked for by the Classes draft** (`classes_draft_a.md` §3.2: "Owner of the change: UF_Skills (the V84 unlock work)"). The skill-level abilities are the first provider of the first two, so building those two now costs nothing extra:
- `addRateModifier(fn(unit, jobType, job) → factor)`, multiplied into `rate`;
- `addYieldModifier(fn(unit, skillId, job) → addedChance)`, added inside `extraYield`.

The Classes draft also asks for `addXpModifier`, `addSealFilter` and `rollLevel`, which nothing in this design uses. §12 D11 asks whether this build adds them (about 20 lines, tested with a synthetic provider) or leaves them to the Classes build.

### 7.3 Needs from others (exact lines; each owner applies them, or the UF_Tech build does after the claim is released and the user agrees)
- **UF_Colonists.js** (claimed by the "Paths and DF life" run; its bands copy is in `%TEMP%\uf_snapshots\bands_f19_jobs`). Without these edits the job wraps still keep every locked or unqualified job from being done, but a planner can spend its look-ahead of 3 steps on steps it may not do. Its `give` then marks the target to avoid for a while (bands copy, `give`).
  1. Next to `deferred` (bands copy line 1447): `const techLocked = (u, step) => !!(window.UF.Tech && typeof UF.Tech.stepLocked === "function" && UF.Tech.stepLocked(u, step));`
  2. In `planJob`, the skip (bands copy line 1665; game copy line 1203): `if (status[i].done || deferred(c.plan[i]) || techLocked(u, c.plan[i])) continue;`
  3. In `objectSourceNear` and `foodObjectNear` (game copy lines 411-419; bands copy 639): add `&& (!window.UF.Tech || UF.Tech.canWorkObject(u, t, action))` to the `scanObjects` predicate, so a gatherer never walks to a tree above their level.
  4. In `preyNear` and `preyYielding` (game copy 482, 500; bands copy 756): the same for `hunt`. Needed only when a species gets a hunting level above 1.
- **UF_Society.js** (new, same run): pick house pieces the faction may build: `UF.Tech.allows(fid, "building", id)`; fall back to the culture wall.
- **UF_Command.js** (CHAIN_OF_COMMAND.md §3.2, not built): the head's pass skips plan steps with `locked: true`.
- **UF_Combat.js** (owner: the V64 run): read `UF.Skills.abilities(attacker, { kind: "combat", attackType })` in the attack roll to apply `accuracyTwice` and `maxHitMul`, counting attacks per unit in `unit.data.combatCount`. Until then the combat abilities are shown and announced but change nothing, and the report says so.
- **UF_Jobs.js, the V85 build** (WORK_TIMING §4.1 and §10.2): take `levelSpeed` from `UF.Skills.levelRate` and `perkSpeed` from `UF.Skills.perk`, not `levelSpeed` from `rate`, which already holds the perks after this build.
- **UF_Look.js / UF_Sheet.js** (backlog, not this build): a designation's `job.reason` in the look text ("Marked: chop (needs woodcutting 15)").

---

## 8. API

### 8.1 `UF.Tech`
| Member | Returns |
|---|---|
| `cultureOf(factionId)` | the culture id (`state.tech.factions[fid].culture`, else the faction's species) |
| `permits(factionId)` | `{ buildings: Set, floors: Set, recipes: Set, arsenal: Set }` for the culture |
| `allows(factionId, kind, id)` | `{ ok, reason, node, missing }`; `kind`: `"building"`, `"floor"`, `"recipe"` |
| `canWork(unit, job)` / `canWorkObject(unit, objectType, action)` | `{ ok, reason, need: { skill, level } \| null }` |
| `stepLocked(unit, step)` | bool (§2.6) |
| `qualified(requirement, factionId?)` | the members at or above `{ skill, level }`, nearest first |
| `unlocked(factionId)`, `isUnlocked(factionId, nodeId)`, `frontier(factionId)` | node ids |
| `progress(factionId, nodeId)` | `[{ kind, what, have, want, met }]` |
| `built(factionId, key)` | a count (`"tag:wall"` sums the tagged object ids); `tally(factionId, key)` is the same call under the name the Classes draft uses |
| `level(factionId)` | the faction's Building level (the Classes draft's name; = `UF.Skills.factionLevel(fid, "building")`) |
| `meets(factionId, requires)` | `{ ok, missing: [{ kind, what, have, want }] }` for any requirement record (§2.4), for other systems such as class openings (V88) |
| `leaderOf(factionId)` | the unit that speaks for the faction, or null |
| `evaluate(factionId, { silent })` | the nodes unlocked by this call |
| `grant(factionId, nodeId, { silent })` | test and debug: unlock a node now |
| `openUnlocks()`, `closeUnlocks()`, `isUnlocksOpen()`, `unlocksWindow()` | the view |
| `sheetPage(win?)`, `setSheetPage(page)` | `"inventory"` or `"skills"` |
| `decorate(options, cell)` | the menu decoration as a pure function |
| `errors`, `errorCount()`, `perf()`, `resetPerf()` | `{ events, evalMs, maxEvalMs, gates, gateMs, dropped }` |

### 8.2 New in `UF.Skills`
| Member | Returns |
|---|---|
| `isFactionSkill(id)` | bool |
| `factionLevel(fid, id)`, `factionXp(fid, id)`, `addFaction(fid, id, xp, unit?)`, `setFactionLevel(fid, id, L)` | as for people; `addFaction` returns `{ levelsGained, level, xp }` |
| `requirement(kind, id, action?)` | `{ skill, level }` or null; `kind`: `"action"` (with the action), `"fish"`, `"hunt"`, `"recipe"` |
| `requirementOf(job)` | `{ skill, level }` for a job (object action on its target cell, water kind, species, recipe); `{ skill, level: 1 }` when the table has no row; null for jobs no skill covers. WORK_TIMING's `requiredLevel` adapter |
| `levelRate(unit, jobType, job?)` | the level factor alone, `1 + (L − 1) × speedPerLevel` (today's `rate`) |
| `perk(unit, skillId, "speed" \| "fail", job?)` | the product of the unit's matching abilities, 1 when none. WORK_TIMING's `perk` adapter |
| `addRateModifier(fn)`, `addYieldModifier(fn)` | the registries of §7.2 |
| `unlocksOf(skillId)` | `[{ level, kind, id, text }]` sorted by level |
| `unlocksBetween(skillId, from, to)` | the entries with `from < level ≤ to` |
| `nextUnlock(unit, skillId)` | `{ level, entries }` or null |
| `abilities(unit, filter?)` | the unit's active ability records |
| `latest(unit)` | `data.skillsLatest` (§2.7) |
| `lastFactionLine()` | `{ factionId, unitId, text, via }` |

`rate(unit, jobType, job?)` stays, and now returns `levelRate × perk(speed) × the rate modifiers`.

---

## 9. Checks (suite `tech`, UF_Test; plus the changed `skills` checks)
Every check goes through `t.check(name, condition, detail)` and prints `PASS` or `FAIL <name>: <detail>`. The suite pauses the colonists' decisions (`UF.Colonists.setEnabled(false)`) except in `plan_gated`, and saves and restores `state.tech`, `state.skills.factions`, the test units and any objects it places. Test people are named `TEST_…` and use the player's faction unless stated. **Provoking a FAIL:** before the build is reported, each check is run once against a sabotaged copy in its own snapshot (the "Provoke" column), and the FAIL line is quoted in the report.

| Check | What it proves (FAIL when not) | Provoke |
|---|---|---|
| `tech.catalog_valid` | Every id in `tech` (permits, `built` keys and tags, `members` skills, `stock` items, `after`, culture lists, overrides) and in `skills.unlocks` exists in the catalog; the graph of `after` edges plus built-dependencies (X needs a built Y that only a later node permits) has no cycle; for every culture every permitted building, floor and recipe is permitted by some node and every node is reachable; every recipe, every object action, every water kind and every species has a level; no recipe or object action carries its own `level` or `minLevel`; the plan-reachability simulation (§2.4) leaves no culture's plan step waiting on the faction, with only nodes free of `members`, `stock` and `classes` requirements counted as reachable | A snapshot catalog with each of: node permit `furnace_x`; `forge.after = ["armoury"]`; `crystal` removed from `unlocks.actions.mine`; `smelting.requires.level` 9 (the plan can't reach it) |
| `tech.faction_building_xp` | Two members finish synthetic `build` jobs of `wall_wood` (progress 90): the pool rises by exactly 28.0; neither person has `skillXp.building`; `level(person, "building")` equals the faction level; carpentry +7 each (personal share). On a `JsonEx` copy of the state with two people holding 1 154 and 83 building xp and `state.skills.version` 1: the migration makes the pool +1 237, removes both keys, sets version 2, and a second run changes nothing | Route `add` of a faction skill to the person |
| `tech.faction_levelup` | Pool set 5 xp below level 3, the leader moved on screen: one build gives level 3; exactly one `skills:factionLevelUp(fid, "building", 3)`; one chronicle line naming the faction and "Building level 3"; `UF.Speech.lines(leader)` holds "We're getting better at building." (kind remark) and `lastFactionLine()` names the leader's id with `via: "speech"`; no other sprite over the leader's head (V92) | Remove the chronicle call |
| `tech.counts_structures` | 3 builds of `wall_wood` on 3 distinct cells: `built(fid, "wall_wood")` +3 and `built(fid, "tag:wall")` +3; a rebuild on one of those cells after dismantling: +0; a build by a member of another faction counts for that faction only; a failed build: +0; a cell with z 1 (or z 0 through the helper before UF_Levels) is keyed with its z | Disable the per-cell set |
| `tech.unlock_fires` | A fresh faction (Building 2, 5 walls): `smelting` locked; the 6th wall with the level still 2: locked; level 3: unlocked, and in the other order too (level first, then the 6th wall); exactly one `tech:unlocked`; the chronicle line and the leader's line name the furnace; dismantling walls afterwards leaves it unlocked | Evaluate only on level-ups |
| `tech.menu_gated` | "Build here" on a free cell of a fresh world: `Furnace` present, disabled, with "Building 3 (now 1)" in its label; a building the culture never makes absent; `UF.Interact.choose("Furnace")` returns null and creates no job; after `grant(fid, "smelting")` it's enabled and choosing it makes an open `build` job. Screenshot `tech.menu_gated.png` | Decoration skips `enabled: false` |
| `tech.skill_gates_jobs` | A placed `tree_tropical` (woodcutting 15) with an open `chop` designation; colonist A (woodcutting 1, nearest) and B (woodcutting 20): `take(A)` doesn't return it and `job.reason` is "needs woodcutting 15"; `take(B)` does, and B finishes it; the menu label on the tree names B and not A; a chop created for A as owner fails with that reason; the same for a `mine` of `gold_outcrop` (20) and a `fish` on a `salt` cell (15) when the map has one (skipped with a note, not passed, when it doesn't) | Compare with `>` in the level test |
| `tech.recipe_gated` | A smith with the inputs for `sword_long` beside a placed smithy: the craft's `plan` refuses at smithing 5 ("needs smithing 20"); at 20 with `armoury` locked it refuses ("not unlocked yet"); after `grant` it passes. A person of a dwarf faction (a real one, or a synthetic `state.tech` faction with culture `dwarf`) is refused `bow_short` ("… don't make …") | Skip the culture test |
| `tech.plan_gated` | The player's plan set for the check to [the `smithy` step, a `stockpile` step on a free cell] (restored after); `forge` locked: 60 planner calls for every colonist never give a job with `params.plan` = the smithy step, and `planStatus()` marks it `locked`; after `grant(fid, "forge")` some colonist gets a smithy-step job. The detail names the path in use: the UF_Colonists hook (§7.3) or the job-wrap fallback | Neither hook nor wrap for `build` |
| `tech.ability_applies` | Measured in UF_Jobs over 30 frames with a chop that never finishes: progress per tick at woodcutting 30 over 29 = 1.29 × 1.10 / 1.28 ≈ 1.109 (± 0.01), against ≈ 1.008 without the ability; `perk(unit, "woodcutting", "speed", chop)` 1.10 at 30 and 1 at 29, and `levelRate` without it; 400 synthetic `stone_knife` crafts at crafting 25 give 22–58 refunds (10% of 400 ± 3 σ, σ = 6) that equal the same seeded rolls recomputed, and 0 at crafting 24 | Ability level compared with `>` |
| `tech.levelup_names_unlock` | A colonist on screen, woodcutting 14 → 15 by `add`: `UF.Speech.lines(unit)` holds "I'm getting better at woodcutting." then "I can chop down a broadleaf giant now." (kind remark), and `latest(unit)` is woodcutting 15 with `tree_tropical`; crafting 24 → 25: the second line is the ability's remark; woodcutting 15 → 16: only the first line; in every case no `Sprite_UFSkillLine` or bark sprite is in the tilemap (V92) | Drop the unlock remark |
| `tech.culture_differs` | Two factions of different cultures (from the world, else a synthetic one): their permitted lists equal the catalog's and differ; the dwarf's build submenu has no `Bowyer's bench`, the human's has it; a dwarf member is refused `bow_short`, a human member isn't | `cultureOf` always returns `human` |
| `tech.saved` | A `JsonEx` round-trip of `UF.World.state` keeps `state.tech` (unlocked, built, cells) and `state.skills.factions` exactly; `makeSaveContents().ufWorld` holds them; a pre-tech copy (no `state.tech`, personal building xp) migrates to the same unlocks as `evaluate` on the live state, with no announcement | Make `state.tech` non-enumerable |
| `tech.views_show` | Skills page: the sheet opened on a colonist and the Skills tab clicked through the real input path; 22 row rectangles each with drawn pixels; the woodcutting row's model text has "next 15" when the level is below 15; the first row reads "Building (faction)" and the faction level; the Inventory tab brings the grid back. Unlocks view: U pressed (`Input` state) shows the window with the faction name, "Building level N", the unlocked nodes' texts and every frontier node's requirement texts equal to `progress()`; Escape closes it. Screenshots `tech.skills_page.png` and `tech.unlocks_view.png` (zoom 1) | The page's draw returns before drawing rows |
| `tech.perf` | 2 000 synthetic `jobs:done` builds average ≤ 0.05 ms per event; `canWork` ≤ 5 µs per call; `UF.Skills.rate` ≤ 10 µs with abilities; with both views closed, UF_Tech adds 0 work per frame (its update counter unchanged over 120 frames) | A 0.2 ms busy loop in the handler |
| `tech.no_errors` | No uncaught error during the suite (UF_Test's record), `UF.Tech.errorCount()` and `UF.Skills.errorCount()` unchanged | A throw inside the `jobs:done` handler |

Every screenshot is opened and described before it's cited (AGENTS rule 5). The suites to re-run after the build, on snapshots: `tech`, `skills`, `jobs`, `colonists`, `look` (UF_Interact), `sheet`, `smoke`.

---

## 10. Placeholder art and asset requests
The feature works with no new image: text, code-drawn tabs and bars, the window skin in use (`img/system/Window.png`, AR-033 / AR-800), and the greyed text `Window_Command` already draws for disabled options. Two requests go to `docs/ASSET_REQUESTS.md` (next free numbers, appended) and to the tech section of `docs/handoffs/HANDOFF_df_mechanics.md` when the build lands. Both follow the Shared spec and ART_STANDARD (FF6-style HD pixel art, `art/palette/uf.hex`, alpha 0 or 255, 4× raw canvas on `#FF00FF`):

| Request | Spec | Placeholder until delivered | How it plugs in |
|---|---|---|---|
| **Skill icons** | 22 icons of 16 × 16 px (21 personal skills and the faction's Building), one sheet `img/system/UF_SkillIcons.png` of 8 × 3 cells (128 × 48, the last 2 cells empty) in catalog order (`skills.list`), sidecar `UF_SkillIcons.json` `{ "frameWidth": 16, "frameHeight": 16, "order": ["woodcutting", …] }`. Each is one centred glyph, a tool or symbol for its skill (an axe, a pick, a hook, …), readable on the window's dark oak | none: rows start with text | The skills page draws the icon left of each row when the file exists (`fs.existsSync` in NW.js, as UF_Sheet does for faces) |
| **Tech badges** | 4 badges of 16 × 16: unlocked (a tick), next (an open arrow), locked (a padlock), not for this culture (a crossed circle), sheet `img/system/UF_TechBadges.png` 64 × 16 with sidecar | text glyphs: ✓ for unlocked, ○ for next, none for locked | Before each node line in the Unlocks view; the padlock before disabled build options |

Neither replaces a stock asset (the rule in CLAUDE.md about stock assets doesn't add a row).

---

## 11. Names that are proposals (AGENTS rule 7, V9)
None of these shows in play until the user approves it. Until then the catalog stores each as a `TEST_` name (`TEST_Campcraft`, `TEST_Clean_Swing`), as AGENTS rule 7 and the Classes draft do. The UI never shows a `TEST_` name: it uses the descriptive text given in §2.4 and §2.5.3 instead. Approving a name means writing it without the prefix.

- **Node names:** Campcraft, Hide-working, Bow-making, Smelting, Forge-work, Armour-smithing, Stone-building.
- **Ability names:** Clean Swing, Heartwood Eye, Steady Pick, Seam Sense, Keen Picker, Patient Line, Quiet Step, Even Heat, Thrifty Hands, Frugal Forge, Straight Fletching, Clean Cut, Joiner's Pace, Plumb Line, Twin Thrust, Crushing Weight, Steady Draw. OSRS's attack-style words (such as "lunge", "hack", "smash", "pound", "jab", "swipe") and D&D's "True Strike" were avoided. No web search was done for the rest.

Plain labels, not names: "Building (faction)", "Unlocks", "Skills", "Inventory", "Next", "Later", "Built".

---

## 12. Decisions for the user
| # | Question | Proposed | Alternative |
|---|---|---|---|
| D1 | V84's reading: no personal Building level at all; construction speed = the faction's Building level × the builder's carpentry or masonry (WORK_TIMING §4.1) | Yes (recorded as Claude Code's reading in V84; the speed rule is WORK_TIMING's) | Personal Building levels too, with the faction level as the sum |
| D2 | Old saves: how personal building xp joins the pool | The sum of the members' xp (V84 says "move") | The highest member's xp (a smaller jump: with 8 members at level 20, the sum is level 39, the highest is level 20) |
| D3 | New Game: the pool starts at 0 and Building is no longer rolled as a starting trade (this changes the seeded trade rolls of every new world) | Yes | Keep rolling it and move the founders' rolled xp into the pool at New Game |
| D4 | Structure counts | Ever built, once per cell; unlocks never lock again | Standing structures only (needs ownership of buildings, Codex's UF_Ownership, and a count that falls when one is destroyed) |
| D5 | Culture permission rule (§2.3) and whether it limits wielding | The derived lists; limits making only | Hand-edited lists; or also limit wielding |
| D6 | Nodes that add plan steps | None now; proposal: Stone-building makes bands rebuild their shelter in the later wall | — |
| D7 | Personal levels (§2.5): gate fruit tree 10, broadleaf giant 15, blighted tree 20; mail at smithing 25 while it's the dwarves' plan armour | As in §2.5 | CRAFTING.md D2: every existing tree at 1 (tougher trees come as new content); mail at 1 |
| D8 | Should moving to other levels be earned (build on +1/+2, dig into −1/−2 only after a node)? | Not gated; the schema supports it (§2.9) | Gate them on the Building level |
| D9 | Chronicle volume | Every faction's Building level-up and unlock, for every faction | The player's faction only, or milestones (every 5 levels) |
| D10 | The key for the Unlocks view | U | A button on the faction ledger (F) |
| D11 | The Classes draft (V88) asks this UF_Skills work for `addXpModifier`, `addSealFilter` and `rollLevel` too | Leave those three to the Classes build (nothing here uses them) and build only the rate and yield registries that the abilities use | Add all five now, so UF_Skills is opened once |

---

## 13. Build plan and registration

1. Claim check in `docs/STATUS.md` (UF_Skills.js, UF_Tech.js, the catalog keys `tech` and `skills.unlocks`).
2. `tools/add_tech_catalog.js`: a layout-preserving node script. It re-reads the catalog right before writing, derives `tech.cultures` (§2.3), and writes `tech` plus the `skills` paths of §3.1. It asserts every other key and every other path of `skills` parses back unchanged. `--check` recomputes and prints differences. It runs first on a snapshot, then on `game/` only after the suites pass there.
3. UF_Skills.js changes (§7.2) in the snapshot's copy; then the `skills` suite.
4. `UF_Tech.js`; `docs/systems/UF_Tech.md` (the six sections of ENGINE_RULES §2); `docs/systems/UF_Skills.md` updated.
5. Snapshot tests:
   - `"C:\Program Files\nodejs\node.exe" tools/test_snapshot.js --name tech --plugins UF_Tech --no-run`
   - `"C:\Program Files\nodejs\node.exe" tools/run_tests.js tech --game <snapshot dir>`, then `skills`, `jobs`, `colonists`, `look`, `sheet`, `smoke`
   - the title flow on a snapshot with UF_Tech: `"C:\Program Files\nodejs\node.exe" C:\Users\snewt\AppData\Local\Temp\claude\c--Users-snewt-OneDrive-Desktop-UF\33d11f06-f10e-4b14-b7ab-ba5caf8458e8\scratchpad\repro_title.js newgame tech`, and Continue on a save from before the change.
6. Provoke each check once (§9), quote the FAIL lines, restore.
7. Before copying into `game/`, compare `game/`'s UF_Skills.js with the copy the snapshot started from, and re-apply the changes onto a changed version. `node --check` every copied file. Smoke on a fresh snapshot afterwards.
8. Registration, for the lead to apply while the RMMZ editor is closed (AGENTS.md → RMMZ editor safety):
   - `game/js/plugins.js`, after `UF_Sheet`: `{"name":"UF_Tech","status":true,"description":"[UF Tech] Faction technology: culture permissions, the Building level and build-N-of-X unlocks, skill-level gates on work and crafts, the skills page and the Unlocks view.","parameters":{}}`
   - `tools/register_world_plugins.js` `ORDER`: `"UF_Tech"` after `"UF_Sheet"`, before `"UF_Talk"`.
   - `DESCRIPTIONS`: `UF_Tech: "[UF Tech] Faction technology: culture permissions, the Building level and build-N-of-X unlocks, skill-level gates on work and crafts, the skills page and the Unlocks view.",`
   - Header: `@base UF_World`, `@orderAfter UF_Skills`, `@orderAfter UF_Interact`, `@orderAfter UF_Sheet`.
9. Art: the two rows of §10 in ASSET_REQUESTS.md (append only, re-read first) and the tech section in HANDOFF_df_mechanics.md.

---

## 14. Findings made while designing
- **F1 (MAJOR by the AUDIT_LOG scale; not written there, since this task edits only this file):** the goblin culture's `wall` is `rubble_pillar` (`catalog.cultures.goblin.wall`), which has no `build` block (`catalog.objects` → `rubble_pillar`: only a `quarry` action). UF_Colonists' `makePlan` still substitutes it into the shelter step (UF_Colonists.js line 257: it checks only that the object type exists), and `buildStepJob` returns nothing for an object without `build` (line 1108). So a goblin band's shelter step can never be built by the band, unless UF_Society takes the step over (bands copy, `deferred`). This design uses the goblins' `laterWall` (`wall_wood`) as their buildable wall. The fix belongs in the catalog (a buildable goblin wall, which would be new content for the user to approve) or in `makePlan` (check `build`), not here. Not run in the game; read from the code and data on 2026-09-19.
- **F2:** CRAFTING.md §2.10 (proposals, not approved) gives each building a personal `build.level`. Under V84 building is faction-wide, so those levels, if approved, become node `requires.level` values here, not personal requirements.
- **F3:** CRAFTING.md §3.12 plans its own UF_Skills changes (phase C2). This design's UF_Skills changes come first, since V84 is approved; C2 then rebases on them.
- **F4:** RESOURCE_ATLAS / the resource manifest (Codex) lists resources by level and biome. When those become objects, each needs a row in `skills.unlocks`; `tech.catalog_valid` fails until it has one. Codex's `tools/check_resource_manifest.js` could check the same.
- **F5:** `UF_Construction.js` and `UF_Crafting.js` (older plugins, still registered) keep their own build and craft queues outside UF_Jobs; UF_Tech doesn't gate them. STATUS already notes their designations as untested.
- **F6:** WORK_TIMING.md §10.2 says "`rate()` is unchanged" and uses it as `levelSpeed`, with the perks as a separate `perkSpeed`. After this build `rate` includes the speed perks, because it's the only multiplier UF_Jobs applies today. So the V85 build takes `levelSpeed` from `UF.Skills.levelRate` (§2.8, §7.3). Whichever build lands second checks this. `tech.ability_applies` measures the ratio, and a doubled perk shows as about 1.22 instead of 1.109.
- **F7:** V92 (over-head text is only speech; "level-up notices are not drawn over heads") makes UF_Skills' current level-up line non-compliant on every path (UF_Skills.js lines 386-468). With UF_Speech it says the notice "Woodcutting level 10" as a thought. Without it, UF_Skills uses UF_Visuals' bark where the canvas has `roundRect`, or else draws the gold text itself. This build replaces all three with the spoken remark (§2.7). The `skills` suite's `level_up_line` check and its screenshot change with it.
