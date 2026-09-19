# UF_Skills
Every person has skills that level from 1 to 99 by doing them (VISION V63, user 2026-09-19): the trades (woodcutting, mining, fishing, hunting, foraging, farming, cooking, crafting, smithing, fletching, carpentry, masonry, leatherwork, healing, hauling) and the fighting skills of V64 (attack, strength, defence, ranged, magic, hitpoints). **Building is a faction skill** (V84, 2026-09-19): every member's construction adds to their faction's pool, and nobody has a personal Building level. Jobs and fights give experience; higher levels work faster, find more, make better things, unlock recipes, harder resources and small abilities (V84, `skills.unlocks`), and are what UF_Combat's formulas read. Level-ups are said aloud as short remarks (V92); the chronicle notes milestones, faction Building levels and the deaths of skilled people. UF_Tech (docs/systems/UF_Tech.md) gates work with the unlock table and builds the tech tree on the Building pool.

**V84 update (2026-09-19, Claude Code, design `docs/design/TECH_TREE.md` §2.1-§2.8, §7.2):** faction skills (`scope: "faction"` in `skills.list`), the old-save migration of personal Building xp, `skills.unlocks` (levels and abilities), `levelRate`/`perk`/modifier registries, the spoken level-up remark and its unlock line, `data.skillsLatest`. The drawn gold line and the UF_Visuals bark path are gone (V92). Checks changed: `xp_by_doing`, `level_up_line`, `rate`, `extra_yield`; `skills` 14/14 on snapshots with the change, each changed check seen failing against a sabotaged copy.
Status: built 2026-09-19, checks: `skills` (14 checks, all PASS on two snapshots of `game/` on 2026-09-19, one with the UF_Jobs hook applied to the snapshot's copy and one without; every check seen failing once against a sabotaged copy, see Checks). **Registered in `game/js/plugins.js` on 2026-09-19 at about 11:03** by `tools/register_world_plugins.js` (the Land task; the RMMZ editor was open, so its Plugin Manager holds the older list until the project is reopened): `skills` 14/14 on a fresh snapshot of `game/` afterwards, and both title flows (New Game, Continue on a save from before UF_Skills) reach the map with no error. Not yet run in the editor's Playtest (F5).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Skills.js` · **Catalog:** `skills` (added by `tools/add_skills_catalog.js`) · **Load order:** after `UF_World`, `UF_Jobs`, `UF_Colonists`, `UF_Combat` and `UF_Speech`, before `UF_Look` (registered 2026-09-19: `… UF_Camera > UF_Speech > UF_Skills > UF_Look …`). Contract: `docs/design/WORLD_ARCHITECTURE.md` §1, §2.4, §2.5, §6; the UF_Combat / UF_Skills contract of 2026-09-19 (below).

## The curve
Levels 1-99. The xp at which level L starts is `floor( Σ_{i=1}^{L-1} floor(i + 300 · 2^(i/7)) / 4 )`, computed once at load:

| Level | 2 | 10 | 25 | 50 | 75 | 92 | 99 |
|---|---|---|---|---|---|---|---|
| xp | 83 | 1 154 | 7 842 | 101 333 | 1 210 421 | 6 517 253 | 13 034 431 |

Experience keeps counting past level 99 up to `skills.maxXp` (200 000 000). Values are kept to one decimal.

## The contract with UF_Combat (2026-09-19)
- UF_Combat emits `combat:hit` `{ attacker, target, damage (0 on a miss), hit, style: "accurate"|"aggressive"|"defensive"|"controlled"|"rapid"|"longrange", attackType: "stab"|"slash"|"crush"|"ranged"|"magic" }` after every attack, and `combat:kill` `{ attacker, target }` when a target dies.
- UF_Skills awards per damage point (catalog `skills.combatXp`): melee (stab, slash, crush) accurate → attack 4, aggressive → strength 4, defensive → defence 4, controlled → attack, strength and defence 1.33 each; ranged accurate or rapid → ranged 4, longrange → ranged 2 + defence 2; magic accurate or rapid → magic 2, longrange → magic 1.33 + defence 1 (our extension; the contract names no magic styles); a style the table lacks for that attack type uses `fallback` (accurate). Plus hitpoints 1.33 per damage point. A miss (`hit: false` or damage 0) gives nothing; a non-person attacker gains nothing.
- UF_Combat reads levels with `UF.Skills.level(unit, id)` for every unit. People answer from their experience; anyone else from `data.combatLevels[id]`, then the catalog's `wildlife.species[].combat[id]`, else 1 (hitpoints 10). Wildlife and monsters never level up (`add` does nothing for them).
- A unit's maximum hitpoints is its hitpoints level (+ catalog bonuses, UF_Combat's business); its current hitpoints are `unit.data.hp`. UF_Skills does not create `data.hp`; when a person gains hitpoints levels and `data.hp` is a number, it grows by the levels gained.

## Experience by doing
| Source | Skill | Amount |
|---|---|---|
| `jobs:done(job, unit)` | the job type's skill (`skills.list[].jobs`); a `craft` by its recipe (`recipes.list[].skill` through `recipeSkills`, then `recipes.list[].at` through `recipeAt`, else the `craftDefault` skill, crafting) | `xp.base + xp.perWork × min(job.progress, skills.xp.workCap)`; `job.progress` is the job's work in ticks (it reaches the handler's `work` when the job finishes) |
| `jobs:done` of `build` | building (**the pool of the worker's faction**, V84; a person without a faction gains none, counted in `factionDropped()`), and also carpentry (object tag `wood`) or masonry (tag `stone`) personally | the building xp; the tagged skill gets `xp.buildShare` (0.5) of it |
| `jobs:kill(job, prey, hunter)` | hunting | `10 + 0.15 × job.progress`. `jobs:done` of the same hunt gives no xp (only the extra yield) |
| `combat:hit` | per the contract above | per damage point |

Examples with the catalog of 2026-09-19: chopping an oak (work 240) 29 xp; mining ironstone (300) 35; gathering tall grass (20) 4; roasting meat (90) cooking 19; smelting an iron bar (10) smithing 25; building a stone wall (150) building 20 and masonry 10; a deer (120) hunting 28; a haul 2.

**Job types and their skills.** Every job type defined on 2026-09-19 (UF_Jobs, UF_Interact, UF_Floors, UF_Fire):
| Skill | Job types / recipes |
|---|---|
| woodcutting | `chop`; recipes with skill `woodcutting` (split firewood) |
| mining | `mine`, `quarry`, `dig` |
| fishing | `fish` |
| hunting | `hunt` (through `jobs:kill`) |
| foraging | `gather`, `pick` |
| cooking | recipes with skill `cooking` or at a `fire` |
| crafting | recipes with skill `crafting` or `stonework` (knapped and hafted stone tools, the fiber wrap, the hide cloak); any recipe no other skill claims |
| smithing | recipes with skill `smithing` or `smelting`, or at a `furnace` or `smithy` |
| fletching | recipes with skill `fletching` or `bowyery`, or at a `fletcher` or `bowyer` bench |
| carpentry | recipes with skill `carpentry`; a share of building objects tagged `wood` |
| masonry | recipes with skill `masonry` (none yet); a share of building objects tagged `stone` |
| building | `build`, `dismantle`, `floor` |
| leatherwork | recipes with skill `leatherwork` or `tanning`, or at a `tannery` |
| hauling | `haul`, `fetch`, `douse` (carrying water to a fire) |
| farming, healing | nothing yet: no job type trains them (no sowing, harvesting or tending jobs exist on 2026-09-19); they only come from starting levels |
| attack, strength, defence, ranged, magic, hitpoints | `combat:hit` only |

**Left over (train nothing, catalog `skills.noSkill`):** `move`, `wander`, `equip`, `drink`, `eat`, `sleep`, `talk`, `mate`. The test job types `test_noop` (UF_Jobs suite) and `test_skills_*` (this suite) train nothing either. A plugin that defines a new job type maps it with `UF.Skills.mapJob(type, skillId)` (not saved; call it at load) or through a catalog `jobs` list.

## Effects
- **Bonus-yield level contract (2026-09-19):** the drop location preserves `job.result.at.z` or `job.target.z` from the existing location-selection rules. A missing record-level z falls back to `at.area.z`, then Ground (0); explicit values are not coerced. The z-bearing area handle is passed to `UF.Items.drop`, so an underground bonus cannot silently land at the matching Ground cell. XP, work timing and yield probability are unchanged.
- **Work speed.** `levelRate(unit, jobType, job?)` = `1 + (level − 1) × effects.speedPerLevel` (0.01): 1 at level 1, 1.49 at 50, 1.98 at 99; 1 for a job no skill covers and for anyone who isn't a person. For `build`, `dismantle` and `floor` the level is the faction's Building level. `rate(unit, jobType, job?)` = `levelRate` × the unit's speed abilities that apply to the job (`perk`) × the rate modifiers (`addRateModifier`). UF_Jobs multiplies its per-tick progress by `rate` (the one-line hook in "Needs from others"; `data.workRate` is not touched). Measured in a snapshot with the hook: 1.000 progress per tick at woodcutting 1, 1.980 at 99 (a test job type no ability names); a real chop at woodcutting 30 against 29: ratio 1.1086 (the level-30 ability ×1.10). The V85 work-timing build must take `levelRate` and `perk` separately, not `rate`, or the perk counts twice (TECH_TREE §14 F6).
- **Extra yield.** On `jobs:done` of `gather`, `chop`, `mine`, `quarry`, `fish` (only when the fish was caught) and `hunt`: a chance of `level × effects.extraYield.chancePerLevel` (level / 200) of one more of the first yield (`job.result.yields`' first key with a count; for fishing the caught item's type) dropped with `UF.Items.drop` on the job's cell (`job.target`; the prey's cell `job.result.at` for a hunt; the fisher's cell for fishing). The roll uses the level the work was done at (before the job's xp) and is `mulberry32(hash32(seed, 0x5c12, unitId, jobId))()`: the same job always gives the same answer. The raw `hash32` of sequential job ids is biased (0.44-0.54 against a 0.5 threshold over 2 000 ids, measured 2026-09-19), which is why the draw goes through mulberry32. `job.result.extra = { type, count: 1 }` records it; `skills:extraYield(unit, job, type)` fires.
- **Quality.** `qualityRoll(unit, skillOrRecipeId)` → 0-5 = `floor((level − 1) × 0.0357 + roll × 2.5)`, clamped: level 1 gives 0-2, 50 gives 1-4, 99 gives 3-5 (measured means 0.8, 2.5, 4.2). Seeded by `hash32(seed, 0x5c13, unitId, n)` with `n` = `state.skills.rolls`, a saved counter, so each call differs and a replay repeats. For the crafting phase to call; nothing calls it yet.
- **Requirements.** `meets(unit, req)`: `{ skill, level }`, a map `{ skillId: level }`, or a recipe with `minLevel` (a number = the recipe's own skill, or a map); no requirement = true. No recipe in the catalog has `minLevel`: level requirements live in `skills.unlocks` only (below), and UF_Tech's `catalog_valid` check fails if a recipe or object action carries its own.

## Faction skills (V84)
- A skill with `scope: "faction"` in `skills.list` (on 2026-09-19 only `building`) is never stored on a person. `add(person, "building", xp)` goes to the pool of `person.data.faction` (`addFaction`); `level(person, "building")` and `xp(person, "building")` read that pool; `setLevel` refuses it (`setFactionLevel` sets a pool); `total`, `best` and the death line count personal skills only. It is never rolled as a starting trade (`start.tradeWeight.building` 0, and faction skills are left out of the trade draw).
- **A faction level-up** (`addFaction` crossing one or more levels): one chronicle line per level (`type: "faction_level"`, "The Etha Grove reached Building level 3.", catalog `chronicle.faction`: `every`, `who`, `text`), the faction's leader says `speech.factionRemark` ("We're getting better at building.") through UF_Speech when on screen, and `skills:factionLevelUp(factionId, skillId, level, unit)` fires. The leader is `UF.Command.headOf(fid)` when that exists, else the living member with the highest `data.rank` (ties: the lowest id): `leaderOf(fid)`.
- **Old saves:** at load (`migrateState` → `migrateFactionSkills`), every person's personal xp in a faction skill is added to their faction's pool and removed from them; a person without a faction loses it (counted, one console warning). `state.skills.version` becomes 2. Running it again moves nothing. The pool is the sum of the members' xp (TECH_TREE §12 D2 asks the user whether the sum is right).
- New Game: every pool starts at 0 (Building level 1).

## Personal unlocks and abilities (V84, catalog `skills.unlocks`)
- `actions[jobType][objectId]`, `fish[waterKind]`, `hunt[species]`, `recipes[recipeId]`: the level a person needs in the job's own skill (the object action's skill, fishing, hunting, the recipe's skill); a missing row is level 1. `requirement(kind, id, action?)` reads one row; `requirementOf(job)` answers for a job (the object on its target cell, the water kind of its target cell, the prey's species, its recipe). UF_Tech refuses a job below it; nothing here refuses anything.
- The levels of 2026-09-19 (first-pass tuning of our own, TECH_TREE §2.5): woodcutting: tall cactus 5, fruit tree 10, broadleaf giant 15, blighted tree 20; mining: crystal cluster 10, gold outcrop 20; foraging: cactus 5, small crystals 5; fishing: marsh and swamp 5, brackish 10, salt 15, icy 20, deep 25, blighted 30; smithing: copper bar 5, iron spear and mace 10, iron helmet 15, greaves, iron shield and long sword 20, iron mail 25; leatherwork: sling, leather cap and leggings 5; fletching: bone arrows 5, iron arrows 15; carpentry: wooden shield 5. Everything else 1, every species 1.
- `abilities[]`: `{ id, skill, level, name (a PROPOSAL, TEST_ until approved; never shown), text (shown instead), remark (said at the level-up), effect }`, one effect or a list. Kinds: `speed` (`mul` on `rate` for `jobs`; `tags` = the object's or floor material's tags; `ownRecipes` = crafts of the ability's skill), `yield` (`add` to the extra-yield chance), `saveInput` / `extraOutput` (after a finished craft of the skill: a seeded chance `mulberry32(hash32(seed, 0x5c14, unitId, jobId, the ability's catalog index))` of one input back / `count` more of the output; `tags` pick the item; none when `job.result.outcome` is `burnt` or `wasted`; recorded in `job.result.abilities`, event `skills:ability`), `fail` (`mul` for the failure chance once V85 adds failures: `perk(unit, skill, "fail", job)`), `combat` (for UF_Combat to read through `abilities(unit, { kind: "combat", attackType })`; nothing reads it yet). The 17 abilities of 2026-09-19 are listed in TECH_TREE §2.5.3.
- `unlocksOf(skill)`, `unlocksBetween(skill, from, to)`, `nextUnlock(unit, skill)` list them with a `label` ("Broadleaf giant", "Chopping 10% faster") and a `phrase` ("chop down a broadleaf giant") for the level-up remark and UF_Tech's Skills page.
- Registries for other systems (the Classes draft, V88): `addRateModifier(fn(unit, jobType, job) → factor)`, `addYieldModifier(fn(unit, skillId, job) → added chance)`; each returns an unregister function.

## Starting levels
A person gets a record the moment they appear: on `world:unitAdded` (founders, births, arrivals, anyone added with `data.kind` `"person"` or `"colonist"`) and again on `world:created` for anyone missed. The levels are a pure function of the world seed and the unit id (`mulberry32(hash32(seed, 0x5c11, unitId))`), shaped by (catalog `skills.start`):
- **Life stage**: `data.stage`, else from `data.age` (`stageAges`: baby < 1, child < 12, teen < 18, elder ≥ 60), else adult.

  | Stage | Trades | Trade levels | Attack, strength, defence, ranged | Magic | Hitpoints |
  |---|---|---|---|---|---|
  | baby, child | 0 | – | 1 | 1 | 10 |
  | teen | 1-2 | 3-12 | 1-6 | 1 | 10-12 |
  | adult | 2-3 | 5-30 | 1-15 | 1-3 | 10-15 |
  | elder | 2-3 | 20-45 | 1-12 | 1-3 | 10-15 |

  Every other trade starts at 1; hitpoints are never below 10 (as in the classic model).
- **Culture** (`cultures[species]`): a trade's weight in the draw is `tradeWeight` (farming, healing and hauling 0.5, the rest 1) × (the culture's highest `priorities` entry among the trade's job types, or `craft` for recipe trades, × its highest `chainWeights` entry among the labors whose skill maps to the trade) ^ `cultureExponent` (2). Measured over 300 seeded adults each: mining is a trade for 85-103 dwarves against 35-48 elves, fletching for 95-111 elves against 16-27 dwarves.
- **Species** (`favoured`): elves ranged; dwarves defence and hitpoints; gnomes magic; goblins ranged; orcs strength and attack; automatons defence and hitpoints. A favoured skill rolls twice in its range and keeps the higher (the range itself doesn't change). These are mechanics numbers, not lore.

Typical fresh adult: total level about 100-140, combat level 8-15.

**The old record.** Before V63 the colonists carried `data.skills` (UF_Colonists: 18 names, 0-20, a random 0-5 at the start, one point per five jobs; it only weighted job choices). A save made before UF_Skills has people with `data.skills` and no `data.skillXp`; when it is loaded (`DataManager.extractSaveContents` alias → `migrateState`), each of them gets the rolled starting levels and then every skill the old record names is raised to `1 + round(points × 4.9)` where that is higher (0 → 1, 1 → 6, 4 → 21, 5 → 26, 10 → 50, 15 → 75, 20 → 99), the highest where two old names meet one new skill. Name map (`skills.oldRecord.map`): woodcutting → woodcutting; gathering, foraging → foraging; stonework → mining; building → building; hauling → hauling; hunting → hunting; crafting → crafting; cooking → cooking; smelting, smithing → smithing; bowyery, fletching → fletching; tanning, leatherwork → leatherwork; carpentry → carpentry; fighting → attack, strength and defence; archery → ranged. The old record itself stays in `data.skills` (read by nothing here). People who appear in play are never converted: UF_Colonists still writes a random 0-5 `data.skills` for its colonists and newborns, and converting that noise would give a newborn trades at level 26; the rolled levels win and the old record is ignored (see "Needs from others" for the lines that retire it).

**`data.stats`.** The d20 ability scores UF_History rolls for founders (V53, superseded by V64 on 2026-09-19) are left untouched and unused by UF_Skills: nothing here reads or changes them.

## Level-ups
When `add` crosses one or more levels:
1. **Hitpoints**: `data.hp += levels gained` when `data.hp` is a number (the new maximum comes with the level).
2. **Said aloud** (V92: over heads only speech): `UF.Speech.say(unit, text, { kind: "remark" })` with `skills.speech.text`, "I'm getting better at woodcutting."; when the levels crossed unlock something, a second queued line `speech.unlockRemark` naming at most `unlockMax` (2) of them, then "and more": "I can chop down a broadleaf giant now."; an ability says its own `remark` ("I'm wasting less these days."). Without UF_Speech, or off screen, nothing is drawn: the gold line UF_Skills used to draw and the UF_Visuals bark path were removed on 2026-09-19.
3. **The profile:** `unit.data.skillsLatest = { skill, level, unlocks: [ids], at }` (saved), read by UF_Tech's Skills page ("Latest: woodcutting 15 · Broadleaf giant").
4. **Chronicle**: when the new level passes one of `chronicle.levels` (10, 25, 50, 75, 99), one line through `UF.History.addEvent({ type: "skill_level", text, factions: [faction], area, x, y })`: "Meren of The Solis Company reached woodcutting level 10." (the highest milestone passed; `chronicle.who` "all" = every faction's people, "player" = only the player's).
5. `skills:levelUp(unit, skillId, newLevel)`.

Starting levels, `setLevel` and the migration give no lines, chronicle entries or events.

## Deaths of skilled people
A death is `combat:kill` (its `target`), `anim:death` (UF_Anim's recognition: a kill inside `UF.Combat.onUnitDeath` or a hunt, `data.dead`, or `data.hp <= 0`), or, without UF_Anim, `world:unitRemoved` of a unit with `data.dead === true` or `data.hp <= 0`. A plain removal (a despawn, someone leaving) is not a death. Each person is reported once (a session set of ids plus `data.skillsMourned`). When their total level is above `chronicle.deathMinTotal` (80), one chronicle line of type `death_skilled` names their `deathBest` (3) best skills, leaving out hitpoints: "TEST_Mourned was lost, and all they knew with them: smithing 70, woodcutting 60 and mining 45 (total level 280)."; `skills:lost(unit, best, total)` fires. A child (total 31) is below the threshold.

## API (`UF.Skills`)
| Member | Description |
|---|---|
| `level(unit, id)` → 1-99 | People: from their xp; others: `data.combatLevels[id]`, the species' catalog `combat[id]`, else 1 (hitpoints 10) |
| `xp(unit, id)` → number | People: their xp; others: the xp their level starts at |
| `xpForLevel(L)` / `levelForXp(xp)` | The curve (L clamped to 1-99) |
| `add(unit, id, xp)` → `{ levelsGained, level, xp }` | Adds experience to a person (gives a person without a record their starting levels first); non-people: `levelsGained` 0, nothing changes |
| `setLevel(unit, id, L)` → bool | A person's xp set to the start of level L; no events (tests, tools) |
| `total(unit)` → number | Sum of all 22 levels |
| `best(unit, n, { exclude })` → `[{ id, name, level, xp }]` | The n best by level, then xp, then catalog order |
| `combatLevel(unit)` / `combatLevelFrom({ attack, strength, defence, hitpoints, ranged, magic })` | The classic formula `floor(0.25 × (defence + hitpoints + floor(prayer / 2)) + max(0.325 × (attack + strength), 0.325 × floor(1.5 × ranged), 0.325 × floor(1.5 × magic)))` **with prayer omitted** (there is no prayer skill; its term is 0, the same as prayer level 1 gives). All 1 with hitpoints 10 → 3; all 99 → 113 (not 126: the prayer term is missing); attack 60, strength 70, defence 50, hitpoints 65, ranged 40, magic 1 → 71 |
| `rate(unit, jobType, job?)` → number | Work speed multiplier (Effects); `jobType` may be the job object |
| `qualityRoll(unit, skillOrRecipeId)` → 0-5 | For the crafting phase (Effects) |
| `meets(unit, requirement)` → bool | Recipe and task level requirements (Effects) |
| `skillOfJob(type, job?)` → skill id or null | Which skill a job trains (a `craft` needs the job for its recipe) |
| `mapJob(type, skillId | null)` | Map (or unmap) a job type another plugin defines |
| `jobXp(skillId, job)` → number | The xp a finished job gives |
| `skills()`, `name(id)` | The catalog list; a skill's display name |
| `startLevels(unitLike, seed?)` → `{ stage, levels, trades }` | Pure: the starting levels for `{ id, data: { stage | age, species } }` |
| `stageOf(unit)` | The life stage used |
| `convertOld(record)` → `{ skillId: level }` | The old-record conversion |
| `adopt(unit, { convertOld?, seed?, force? })` → bool | Give a person a record if they have none |
| `migrateState(state)` → count | `adopt` with `convertOld` for every person without a record (the load path) |
| `isPerson(unit)` | `data.kind` is `"colonist"` or `"person"` |
| `lastLine()` | `{ unitId, text, via: "speech" \| "bark" \| "line" \| "none" }` of the newest level-up line |
| `errors`, `errorCount()` | The last 20 errors caught inside the plugin (also on the console) and how many since boot |

## State it saves
- `unit.data.skillXp = { skillId: xp }` for people (skills at 0 xp are left out; about 20 bytes per skill held). `unit.data.skillsFrom = "rolled" | "rolled+old"`. `unit.data.skillsMourned = true` once a death was handled. `unit.data.hp` only changes on hitpoints level-ups.
- `UF.World.state.skills = { version: 1, rolls }` (the quality roll counter).
- Not saved: `mapJob` mappings, the level-up line sprites, the session set of mourned ids.

## Events
- Emits `skills:levelUp(unit, skillId, level)`, `skills:extraYield(unit, job, itemType)`, `skills:lost(unit, best, total)`.
- Listens: `world:unitAdded`, `world:created`, `jobs:done`, `jobs:kill`, `combat:hit`, `combat:kill`, `anim:death`, `world:unitRemoved`. Every handler is wrapped: an error is counted in `errors` and logged, never thrown into the bus.

## Keys and mouse
None.

## Assets used
None. The level-up line is code-drawn text in the game's main font (no bubble, no image). Tests only: `$U7_Townsman` (U7 stand-in) for the test people.

## Checks (suite `skills`)
Seen failing on 2026-09-19 against sabotaged copies in separate snapshots (set 1: curve +1 xp at level 50, trade levels +3, job xp +1 per job, hitpoints 1 per damage; set 2: no line drawn, speed per level × 1.1, `minLevel` compared with `>`, extra-yield chance halved, melee factor 0.33; set 3: old record 4.8 per point, no death dedupe, 0.2 ms busy loop per `jobs:done`, a throw inside `jobs:kill`; set 4: `skillXp` not enumerable). A first sabotage for `saved` (a `toJSON` on the record) did not make it fail: RMMZ's `JsonEx` copies enumerable keys itself and never calls `toJSON`; set 4 replaced it.
| Check | What would make it FAIL |
|---|---|
| `curve` | `xpForLevel` of 2, 10, 50, 92, 99 not 83, 1154, 101333, 6517253, 13034431; not rising from 1 to 99; `levelForXp` wrong at 0, 82, 83, 1153, 1154, 13034430, 13034431, 200 000 000 |
| `starting_levels` | A person in the world without a record, or with less xp than their roll; a roll not repeatable; any person's roll outside their stage's rules (trade count and levels, combat ranges, hitpoints ≥ 10); a test child (age 5) not all 1 with hitpoints 10; a test elder (age 70) not rolled as an elder; over 300 seeded adults, mining not more often a dwarf trade than an elf trade, or fletching not more often an elf trade than a dwarf trade |
| `xp_by_doing` | Synthetic `jobs:done`: chop (240) not woodcutting +29, `cook_meat` (90) not cooking +19, `bar_iron` (10) not smithing +25, a stone wall (150) not building +20 and masonry +10; `jobs:kill` of a hunt (120) not hunting +28; the hunt's `jobs:done` giving any hunting xp; a drink changing the record; a real UF_Jobs job (`test_skills_work`, work 60, mapped to woodcutting) not done or not giving `jobXp` (11-11.3) |
| `combat_xp` | A synthetic `combat:hit` of 10 in the aggressive style (slash) not strength +40 and hitpoints +13.3 (attack and defence +0); controlled (stab) not +13.3 to attack, strength, defence and hitpoints; long range (ranged) not ranged +20 and defence +20; a miss giving xp; a wolf attacker getting a record |
| `level_up_line` | With a colonist on screen at zoom 1, 5 xp at 2 below woodcutting 10: not `levelsGained` 1 and level 10; no `skills:levelUp(unit, "woodcutting", 10)`; the line not "Woodcutting level 10", not via UF_Speech, and no bark or line sprite for that colonist in the tilemap (the line sprite must be visible, centred on the colonist's x within 1 px and more than 40 px above its feet); no `skill_level` chronicle line naming the colonist and "woodcutting level 10"; hitpoints 12 → 13 not taking `data.hp` 12 → 13. The colonist's record and hp are restored afterwards |
| `rate` | `rate(chop)` not 1 at level 1 or not 1.98 at 99; a `cook_meat` craft at cooking 50 not 1.49; a drink or a wolf not 1; measured in UF_Jobs (a job that never finishes, 30 frames at level 1 then 99), a progress ratio that is neither 1.98 (the hook is in) nor 1.00 (not yet); the detail says which |
| `quality_and_meets` | 200 quality rolls at smithing 1 above 2, at 99 outside 3-5, means not rising from 1 to 50 to 99, a `sword_short` roll at 99 below 3, the saved roll counter not +601; `meets` at smithing 29 not false, false, true, true (`{ skill, level: 30 }`, recipe `minLevel` 30, `{ smithing: 29, woodcutting: 1 }`, null) or at 30 not true, true, false |
| `extra_yield` | 200 synthetic chops at woodcutting 99 not giving 70-130 extra logs on the cell, 200 at level 1 more than 5, or the count not equal to the same 200 rolls recomputed |
| `combat_level` | The four known inputs not 71, 3, 113, 50, or `combatLevel` of the test person not `combatLevelFrom` of its levels |
| `old_record_converted` | On a `JsonEx` copy of the state with one added pre-skills colonist (`data.skills` woodcutting 10, gathering 4, stonework 20, fighting 8, archery 3, cooking 0; d20 `data.stats`): `migrateState` not migrating exactly that one; its levels not max(converted 50, 21, 99, 40, 40, 40, 16, 1; rolled); `skillsFrom` not "rolled+old"; `data.stats` or the old record changed; any unit that had a record changed |
| `death_chronicle` | `combat:kill` then an hp-0 removal of a skilled test person not giving exactly one line naming smithing 70, woodcutting 60, mining 45 in that order; an hp-0 removal of another (through UF_Anim's `anim:death` when present) not exactly one line; a line for a killed child (total 31) or for a skilled person removed alive |
| `saved` | A `JsonEx` round-trip of `UF.World.state` not keeping `skillXp` of the test person and the colonist, `makeSaveContents().ufWorld` not holding the live records, or `state.skills` not saved |
| `perf` | 2 000 `jobs:done` or 2 000 `combat:hit` through `UF.Events` averaging over 0.1 ms per event (level-ups included), or `rate()` over 10 µs per call (`performance.now`). Measured 2026-09-19: 0.005-0.009 ms and 0.002-0.007 ms per event, 0.2-0.5 µs per `rate` call |
| `no_errors` | Any uncaught error during the suite (UF_Test's record) or any error caught inside UF_Skills |

Screenshot: `skills.level_up.png` (zoom 1: "Woodcutting level 10" in gold text over the colonist, the camera centred on it).

## Replaced core methods
None, aliases only: `DataManager.extractSaveContents` (after the original: migrate people without a record), `Scene_Boot.prototype.start` (event hooks, suite).

## Needs from others (exact lines)
- **UF_Jobs.js** (the speed effect; without it `rate` is computed but unused), replace the `rateOf` line (line 771 on 2026-09-19) with:
  `    const rateOf = (unit, job) => ((unit.data && unit.data.workRate > 0 ? unit.data.workRate : 1) * toolMultiplier(unit, job) * (window.UF && UF.Skills && typeof UF.Skills.rate === "function" ? UF.Skills.rate(unit, job.type, job) : 1));`
  Tested in a snapshot copy of UF_Jobs.js on 2026-09-19: `skills` 14/14 (measured ratio 1.980), `jobs` and `colonists` fail only the checks they fail without UF_Skills.
- **Registration: done 2026-09-19 (the Land task).** `tools/register_world_plugins.js` has `"UF_Skills"` in `ORDER` after `"UF_Speech"` and before `"UF_Look"` (after UF_Jobs, UF_Colonists and UF_Combat, which come earlier), with the description `UF_Skills: "[UF Skills] Every person has skills (trades and the fighting skills) that level from 1 to 99 by doing them; higher levels work faster, yield more and make better things.",`
- **UF_Visuals.js** (every bark fails in this NW.js; UF_Jobs swallows the error, so no verb bubble has ever shown): in `drawBark`, replace `ctx.roundRect(boxX, boxY, boxW, boxH, 6);` with `if (typeof ctx.roundRect === "function") ctx.roundRect(boxX, boxY, boxW, boxH, 6); else ctx.rect(boxX, boxY, boxW, boxH);`. Until then, and until UF_Speech lands, UF_Skills draws its own line.
- **UF_Colonists.js** (retire the old record, V63 replaces it; line numbers of 2026-09-19):
  - line 282 (`convertPerson`): `        if (!window.UF.Skills) d.skills = skillsFor(state.seed, u.id);`
  - line 885 (`giveBirth`): `                skills: window.UF.Skills ? undefined : skillsFor(st.seed, ticks()),`
  - line 987 (`designationJob`, weight 0-20 as before): `            const skill = window.UF.Skills ? (UF.Skills.level(u, UF.Skills.skillOfJob(j.type, j) || "") - 1) * 20 / 98 : SKILL_OF[j.type] ? ((u.data.skills && u.data.skills[SKILL_OF[j.type]]) || 0) : 0;`
  - line 1218 (the plan's step choice, 1-1.5 as before): `        const score = x => priorityOf(x.spec.type) * (window.UF.Skills ? 1 + (UF.Skills.level(u, UF.Skills.skillOfJob(x.spec.type, x.spec) || "") - 1) / 196 : SKILL_OF[x.spec.type] ? 1 + ((u.data.skills && u.data.skills[SKILL_OF[x.spec.type]]) || 0) / 40 : 1) - x.order * 0.05;`
  - The "one point per five jobs" block in `onDone` can then go.

## Known limits
- Nothing trains farming or healing yet (no such job types); masonry only through stone buildings.
- Recipe `work` values mix ticks (roasting 90) and beats (smithing 8-12), so `perWork` differs by skill (0.1 against 1) to keep the xp per job in the same range; one unit for recipe work would let one number serve.
- `qualityRoll` and `meets` exist but nothing calls them: the crafting phase (V55 chains) and recipe `minLevel`s are future work.
- Level-up lines are drawn only for units on screen; `UF.Speech` takes over when it exists (its `say` is called with `{ kind: "thought" }`; not seen working, UF_Speech doesn't exist yet).
- The chronicle keeps its newest 400 events (UF_History); with `who: "all"` every faction's milestones are written, which may crowd it once every band works (UF_Society). `who: "player"` limits it.
- Combat xp is unchecked against a real UF_Combat fight: the OSRS UF_Combat is being written in parallel; the checks use synthetic `combat:hit` events that follow the contract.
- The death dedupe set is per session; after a load, `data.skillsMourned` (saved) still prevents a second line.
