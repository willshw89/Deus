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
| `damage(attacker, target, attackResult, opts)` | `{ damage, rolls, type, critical, modifiers, diceRolled }`. Resistance halves and rounds down. Vulnerability doubles. Immunity is 0. |
| `savingThrow(unit, ability, dc, opts)` | d20 + ability modifier + proficiency when `unit.data.saveProficiencies` lists the ability. |
| `initiative(unit, opts)` | d20 + Dexterity modifier. |
| `hitPoints(statBlock, opts)` | The stat block's average, or the hit-dice formula when `opts.rolled` is set. |
| `check`, `passiveCheck`, `contest`, `deathSave`, `jumping`, `fallingDamage` | The matching SRD sentences. `fallingDamage` returns the dice expression and rolls only when an rng is passed. |

`opts.rng` is `() => number` in `[0, 1)`. `opts.roll` or `rules._setTestRoll(n)` fixes the d20. Advantage rolls twice and keeps the higher; disadvantage keeps the lower; both together cancel.

A creature action's `toHit` and damage expression are used as printed. A weapon from `equipment.json` adds the ability modifier once. A critical hit doubles every damage die and does not double the modifier. An unarmed strike is the sentence in `srd:rule:combat-making-an-attack`: 1 + Strength modifier, bludgeoning, and the attacker is proficient.

## Unit mapping

A unit is an SRD creature when `data.srdId`, `data.creature`, or `data.species` matches a `creatures.json` id or name (`wolf` matches Wolf). Its Armor Class, attacks, resistances and hit-point average come from that stat block.

A unit with `data.stats` (or `abilities` or `scores`) and no creature match is a character. Unarmored Armor Class is the baseline 10 + Dexterity stated in the class Unarmored Defense entries. Worn armor and shields are `equipment.json` records. DEUS item ids `mail_iron`, `plate_iron`, `shield_iron` and `shield_wood` name Chain Mail, Plate and Shield. A worn item that is not armor (a tunic in the torso slot) does not change Armor Class.

Proficiency for a character with no `data.level` and no `data.dnd.level` is the level-1 row (+2). A creature attack uses the stat block's to-hit instead of recomputing it.

A unit with neither scores nor a creature match throws `NO_SRD_MAPPING`. An unknown weapon key throws `UNKNOWN_WEAPON`. There is no second formula.

`DEUS_Combat` still owns tick speed, ammunition, the 6-second action round, attack modes, hitsplats and death. It passes the advantage, disadvantage and auto-critical flags that `DEUS_Conditions` already computed. `opts.hit` and `opts.damage` name an outcome for a headless suite; they are not a combat law.

The 12 worn slots `DEUS_Combat` walks are `head`, `neck`, `cloak`, `body`, `hands`, `bracers`, `mainHand`, `offHand`, `feet`, `ring1`, `ring2`, `belt`. Catalog names such as `torso`, `clothes`, `armor`, `weapon` and `shield` read as those slots. The catalog's own `combat.slots` list is 14 names. `DEUS_Sheet` renders 12 slots and ignores a 14-name list.

## Determinism and the loader

`game/js/sim/rules/dice.js` exports `createSeededRng(seed)` (mulberry32). The same seed and the same calls return the same totals. `DEUS_Combat` builds the per-attack rng with `World.mulberry32` from the world seed, `0xc0b7a1`, both unit ids, the tick and a counter.

The plugin reads the JSON and calls `attach(window, createRules(srd))`. A `require` of the module does not publish `UF.Rules` by itself. Headless suites that `eval` the plugin inside `vm` have no `require`; the plugin reaches Node through the host `console` function's realm and reads the files from the working directory. In NW.js, `require` and `__dirname` are used directly.

## What is SRD and what is DEUS

SRD, from `game/data/srd51/`: ability modifiers, proficiency, difficulty classes, armor, weapons, creature stat blocks, cover bonuses (+2 and +5), unarmed damage, critical hits, resistance, vulnerability, immunity, death saves, jumping and falling.

DEUS, not taken from those tables: the 6-second round, weapon tick speed, attack modes, the 12-slot paper doll, item-id aliases, seeded world rng, and colonist dying (owned by `DEUS_Colonists`, with `deathSave` available on the rules object for the SRD sentence).

Open questions and follow-ups are listed in `tasks/SIM.60.05/lane-ab/REPORT.md`. This file does not decide them.
