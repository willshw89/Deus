# DEUS Rules

`game/js/sim/rules/` is the SRD 5.1 combat law (Owner ruling DEC-027). It is a pure CommonJS module: no host globals, no clock, no file reads, and no unseeded rolls. `DEUS_Combat.js` loads it once and sets `window.UF.Rules`. Tests construct it with `createRules(srd)`.

## API

`createRules(srd, opts)` reads the parsed catalogues (`creatures`, `equipment`, `rules`, `characterOptions`). `attach(root, rules)` sets `root.UF.Rules`.

| Call | Result |
|---|---|
| `abilityModifier(score)` | Modifier from the Ability Scores and Modifiers table (`srd:rule:using-ability-scores-ability-scores-and-modifiers`). Scores outside 1–30 use that entry's "subtract 10, divide by 2, round down" sentence. |
| `proficiencyBonus(levelOrCr)` | Character Advancement for levels, Proficiency Bonus by Challenge Rating for challenge ratings. |
| `dc(nameOrNumber)` | Typical Difficulty Classes (`srd:rule:using-ability-scores-ability-checks`). |
| `armorClass(unit)` | `{ ac, breakdown, baseAC, dexMod, effectiveDex, shieldAC, category, stealthDisadv }`. |
| `attack(attacker, target, weaponKey, opts)` | `{ hit, roll, natural, total, attackMod, abilityMod, effectiveAC, critical, fumble, advantage, disadvantage, sameZViolation }`. |
| `damage(attacker, target, attackResult, opts)` | `{ damage, rolls, type, critical, modifiers, riders, diceRolled }`. Immunity is 0. Resistance halves and rounds down, then vulnerability doubles (`srd:rule:combat-damage-and-healing`: "Resistance and then vulnerability are applied after all other modifiers"). A printed rider is rolled with its own type. |
| `savingThrow(unit, ability, dc, opts)` | For a creature, d20 plus the stat block's printed `savingThrows` bonus when that ability is listed. Otherwise d20 + ability modifier + proficiency when `unit.data.saveProficiencies` lists the ability. |
| `initiative(unit, opts)` | d20 + Dexterity modifier. |
| `hitPoints(statBlock, opts)` | The stat block's printed average. The hit-dice formula is rolled only when `opts.rolled` is set. `DEUS_Combat.maxHp` uses the average. |
| `check`, `passiveCheck`, `contest`, `deathSave`, `jumping`, `fallingDamage` | The matching SRD sentences. `fallingDamage` returns the dice expression and rolls only when an rng is passed. |

`opts.rng` is `() => number` in `[0, 1)`. `opts.roll` or `rules._setTestRoll(n)` fixes the d20. Advantage rolls twice and keeps the higher; disadvantage keeps the lower; both together cancel.

A creature action's `toHit` and damage expression are used as printed. A weapon from `equipment.json` adds the ability modifier once. A critical hit doubles every damage die and does not double the modifier. An unarmed strike is the sentence in `srd:rule:combat-making-an-attack`: 1 + Strength modifier, bludgeoning, and the attacker is proficient.

## Unit mapping

`game/js/sim/rules/species_map.js` maps every catalog wildlife species to an SRD 5.1 creature. A `direct` row is the same creature. A `proxy` row is `PM_DEFAULT` (the Owner may re-map it). The row stores `species`, `srdId`, `kind`, and a one-line reason. Runtime hit points, Armor Class, attacks, resistances and printed saves come from that stat block through `hitPoints`, not from `wildlife.species[].combat`.

A natural attack uses the mapped creature's own printed action when the catalog key (`bite`, `claws`, `unarmed`) is not the action's name. A boar's stab is the Boar's Tusk. A hare's stab is the Weasel's Bite.

A humanoid with no ability scores uses the SRD Commoner (`srd:creature:commoner`): Armor Class 10, 4 hit points, and the Club when the attack is unarmed. That covers `species: "human"` and a unit that only carries `combatLevels` (the render bench). A real SRD weapon on that unit uses the weapon with the Commoner's ability scores. A unit with `data.stats`, `data.abilities` or `data.scores` is a character instead, and a character's `data.maxHp` or `data.dnd.hpMax` is the hit point maximum.

Class Unarmored Defense is applied only when `data.unarmoredDefense` is `"barbarian"` or `"monk"`. The monk feature (`srd:class:monk`) does not apply while a shield is wielded. The barbarian feature allows a shield.

A unit with neither scores, nor a catalog species, nor the humanoid default throws `NO_SRD_MAPPING`. An unknown species throws `NO_SRD_MAPPING`. An unknown weapon key throws `UNKNOWN_WEAPON`. An unmapped armor id whose name contains leather, mail, plate or shield throws `UNKNOWN_ARMOR`. `fiber_wrap`, `hide_cloak` and `common_clothes` are listed non-armor and do not change Armor Class. `armor_leather` is SRD Leather.

Proficiency for a character with no `data.level` and no `data.dnd.level` is the level-1 row (+2). A creature attack uses the stat block's to-hit instead of recomputing it.

`DEUS_Combat` still owns tick speed, ammunition, the 6-second action round, attack modes, hitsplats and death. It ranks the "strongest" target by challenge rating, or by character level when the unit is not a creature. It passes the advantage, disadvantage and auto-critical flags that `DEUS_Conditions` already computed. `opts.hit` and `opts.damage` name an outcome for a headless suite. That amount still goes through `UF.Rules.damage`, so resistance, immunity and vulnerability apply. `DEUS_Test.js` still passes `legacy: true` on that call; removing the dead option is PROPOSED-AB-04.

The 12 worn slots `DEUS_Combat` walks are `head`, `neck`, `cloak`, `body`, `hands`, `bracers`, `mainHand`, `offHand`, `feet`, `ring1`, `ring2`, `belt`. Catalog names such as `torso`, `clothes`, `armor`, `weapon` and `shield` read as those slots. The catalog's own `combat.slots` list is 14 names. `DEUS_Sheet` renders 12 slots and ignores a 14-name list.

## Determinism and the loader

`game/js/sim/rules/dice.js` exports `createSeededRng(seed)` (mulberry32). The same seed and the same calls return the same totals. `DEUS_Combat` builds the per-attack rng with `World.mulberry32` from the world seed, `0xc0b7a1`, both unit ids, the tick and a counter.

The plugin reads the JSON and calls `attach(window, createRules(srd))`. A `require` of the module does not publish `UF.Rules` by itself. If that publish did not happen, `rulesApi()` throws `RULES_NOT_PUBLISHED` instead of keeping a private engine. Headless suites that `eval` the plugin inside `vm` have no `require`; the plugin reaches Node through the host `console` function's realm and reads the files from the working directory. In NW.js, `require` and `__dirname` are used directly.

## What is SRD and what is DEUS

SRD, read from `game/data/srd51/`: ability modifiers, proficiency, difficulty classes, armor, weapons, creature stat blocks (including the printed hit-point average and printed saving throws), cover bonuses (+2 and +5), unarmed damage, critical hits, resistance, vulnerability, immunity, and falling. Death-save thresholds (success on 10 or higher, three successes, three failures, a 1 counts as two failures, a 20 restores 1 hit point) are parsed from `srd:rule:combat-damage-and-healing`. The long jump distance is the Strength score named in `srd:rule:adventuring-movement`; a standing long jump is half of that. The high jump base is the "3 + your Strength modifier" sentence in the same entry.

DEUS, not taken from those tables: the 6-second round, weapon tick speed, attack modes, the 12-slot paper doll, item-id aliases, seeded world rng, and colonist dying (owned by `DEUS_Colonists`, with `deathSave` available on the rules object for the SRD sentence).

Open questions and follow-ups are listed in `tasks/SIM.60.05/lane-ab/REPORT.md`. This file does not decide them.
