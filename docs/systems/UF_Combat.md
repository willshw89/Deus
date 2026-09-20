# UF_Combat
Real-time combat on the map in the OSRS model with our own numbers and words (VISION V64, user 2026-09-19: "lets drop the d20 combat rule, and adopt OSRS combat"; the d20 rules of V47 are retired). Fights run in ticks on the map (V45). Each attack rolls accuracy against defence from levels, styles and equipment bonuses. A hit deals a seeded 0..max hit. Units fight by the Ultima VII attack modes (V29), each in an OSRS style. Hitsplats and a health bar show the fight. Attack, hurt and death motion come only from the sprite sheets (V58, V60, V61, played by UF_Anim).
Status: rewritten 2026-09-19 by Claude Code, replacing Gemini's d20 engine. Checks: `combat` (16 checks). Runs of 2026-09-19:
- **Working snapshot** (the new plugin and the converted catalog): `combat` 16/16, `anim` 9/9, `wildlife` 15/15, `smoke` 13/13; `jobs` 14/17 and `colonists` 20/21. A baseline snapshot with the old d20 UF_Combat and the old catalog fails the same checks: jobs `hunt`, `stalled_fails` and `saved` (plus a flaky `open_job_taken`), and colonists `plan_reads_the_site`.
- **After the copy back, a fresh snapshot of `game/`:** `smoke` 13/13, `anim` 9/9, `combat` 16/16, `fire` 10/10 (its `units_hurt` goes through `addPopup` and `playHitAnimation`).
- **Final plugin, another fresh snapshot:** `smoke` 13/13, `combat` 16/16. `perf`: 0.322 ms per frame with 100 fighters; a normal-play tick over the 166 units of the area took 0.16 ms.
- **UF_Skills registered in a snapshot (the Land task will register it):** `skills` 14/14 and `combat` 16/16 (`perf` 0.443 ms per frame).
- **Land task, 2026-09-19 about 11:03:** UF_Skills registered in the real `game/js/plugins.js` (after UF_Speech, before UF_Look). A fresh snapshot of `game/` afterwards: `combat` 16/16 (`perf` 0.315 ms per frame), `skills` 14/14, `smoke` 13/13. A real New Game from the title, 90 s at x4 (21,012 map updates): no errors, and `UF.Combat.errors` stayed empty, but no fight happened (0 `combat:hit`). The `plugins.js` description of UF_Combat still reads "On-map d20 combat engine …".

The `perf` average varies between runs from 0.23 to 0.44 ms per frame against the 0.5 ms budget.

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Combat.js` · **Load order:** after `UF_World`, `UF_Items`, `UF_Wildlife`, `UF_Stance`, before `UF_Anim` (which wraps four of its functions), `UF_Skills` and `UF_Test`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §1, §2.4, §4, §6; the UF_Combat / UF_Skills contract of 2026-09-19 (below). Data: catalog `combat`, `items.types[]` `weapon` / `armor` / `shield` / `ammo` blocks, `wildlife.species[].combat` (tables in `docs/design/COMBAT_CHAINS.md` §2 and below).

## The model
**Ticks.** One combat tick = `combat.tickFrames` map updates (36 = 0.6 s at ×1). The loop runs from a `Game_Map.update` alias, so it stops while paused and speeds up with the speed keys (UF_TimeSpeed plays more map updates per frame). The counters are `UF.World.state.combat.updates` and `.tick`. Nothing reads `Graphics.frameCount` for simulation.

**Levels.** Skill ids are `attack`, `strength`, `defence`, `ranged`, `magic` and `hitpoints`. `level(unit, id)` works down this list:
1. A creature (a unit whose `data.species` has a `wildlife.species[].combat` block) uses the block, and never levels up.
2. Everyone else gets `UF.Skills.level(unit, id)` when UF_Skills exists and it answers ≥ 1.
3. Else `unit.data.combatLevels[id]`.
4. Else the catalog's `combat.people` defaults (all 1, hitpoints 10).
5. Else 1.

The 10-hitpoint default in step 4 is ours. The contract says "else 1", but 1 would make a person without UF_Skills die to one punch. UF_Skills itself never gives hitpoints below 10.

**Hitpoints.** The maximum is the creature block's `hitpoints`, or the person's hitpoints level. The current value is `unit.data.hp`. `data.maxHp` is a cache of the maximum, written whenever UF_Combat reads hitpoints. Hitpoints are set up on first use (an attack, `calcAC`, `hp()`). A unit at 0 dies (`onUnitDeath`). **Regeneration:** every `combat.regen.everyTicks` ticks (100 = 60 s at ×1 = one game hour on the clock), every living unit that has `data.hp` and is below its maximum gains `regen.hp` (1).

**One attack** (`resolveAttack`). The effective level is `level + style bonus + combat.levelOffset (8)`.
- **A** (max attack roll) = effective attack × (the equipment's attack bonus for the attack type + 64). Ranged attacks use ranged instead of attack; magic uses magic.
- **D** (max defence roll) = effective defence × (the defender's defence bonus for that attack type + 64). The defender's style counts: defensive +3, controlled +1, longrange +3.
- **Against magic:** a person's effective defence is `floor(0.7 × magic) + floor(0.3 × (defence + style bonus)) + 8` (`combat.magicDefence`), and a creature's is `magic + style bonus + 8`.
- **The rolls:** `a` = uniform 0..A and `d` = uniform 0..D, both seeded. The attack hits when `a > d`, so hit chance = `1 − (D + 2) / (2(A + 1))` when A > D, else `A / (2(D + 1))`. That is exact for integer rolls (`UF.Combat.hitChance`).
- **Max hit:** `floor(0.5 + effective strength × (strength bonus + 64) / 640)` (`maxHitFor`). Ranged uses effective ranged and ranged strength: the equipment's, plus the arrows' `ammo.rangedStrength` (`byMaterial` when the item record has a `material`), else the weapon's `ranged.ammoStrength`. Magic uses effective magic and magic strength. A creature adds its `maxHitBonus`.
- **Damage:** a hit deals a seeded uniform 0..max hit, capped at the target's current hitpoints. A miss deals 0.
- **Seeding:** `mulberry32(hash32(worldSeed, 0xc0b7a1, attackerId, targetId, tick, seq))`, where `seq` is a saved counter that goes up once per attack.

**Styles** (`combat.styles`; the `accuracy` bonus goes to the attack, ranged or magic level used). accurate: accuracy +3. aggressive: strength +3. defensive: defence +3. controlled: +1 to each. rapid: attack speed −1 tick. longrange: defence +3 and range +2 cells. For ranged and magic, the accuracy bonus also feeds the max hit, as in the classic model. The default style is `unit.data.combat.style` when the weapon offers it; else accurate for melee (the weapon's first style when accurate isn't offered, e.g. the spear: controlled), rapid for ranged, and `combat.creatureStyle` (controlled) for creatures. With controlled, a creature's effective levels are level + 9, the classic model's number for non-player creatures.

**Weapons.**
- **Held weapon:** the `weapon` slot, or `tool` when `weapon` is empty (`combat.aliases`). It gives `speed` (ticks), `types` (the attack type used is `data.combat.attackType` if the weapon offers it, else the first), `styles`, `reach`, `bonuses` and optionally `ranged: { range, ammo, ammoStrength? }`.
- **Unarmed:** 4 ticks, crush, fists.
- **Creatures:** a natural weapon from the block (`attackSpeed`, `attackType`; ranged and magic creatures reach `range`, default 5 cells).
- **Ammunition:** a bow or sling needs its `ammo` item type in the unit's inventory and uses one per shot (`UF.Items.consume`). Out of ammunition, the unit fights with its fists; `describe` then says `outOfAmmo`.
- **Equipment bonuses:** the sum over the five slots (`head`, `weapon`, `shield`, `torso`, `legs`; the old `tool` and `clothes` keys count when the new slot is empty). Each block's `bonuses = { attack: {stab, slash, crush, ranged, magic}, defence: {…}, strength, rangedStrength, magicStrength }`, with missing keys counting 0. An item record with a `quality` (0-5, crafting phase 2) multiplies its item's bonuses by `combat.quality.bonus[quality]`.
- **Slot values:** a number (an item record id held by the unit; one it no longer holds counts for nothing) or an item type id (a string: test units and old data).

**Attack modes** (Ultima VII, V29) are in `unit.data.combat.mode`. The defaults are `combat.defaultModes`: hostile units `nearest`, prey whose species has `hunt.flees` `flee`, everyone else `defend`.
- `nearest`, `weakest` (lowest current hitpoints), `strongest` (highest fighting level): seek an enemy within `combat.aggroRadius` (8 cells, Chebyshev) and keep it. Ties go to the fewest steps; exact ties are broken by a seeded hash.
- `protect`: attack an enemy that is attacking someone on the unit's side, preferring whoever attacks `data.combat.protectId`.
- `defend`: only hit back.
- `flee`: run `fleeRadius + 2` cells away from any enemy within `fleeRadius` (5); never hit back.
- `manual`: only the target it is given (`engage`); never hits back on its own.

**Sides.** A unit tagged `hostile` is hostile. Otherwise `UF.Stance.of`: colonists, the player's faction and allies are friendly; monsters and factions at war are hostile. Hostile units seek friendly ones and friendly units in a seeking mode seek hostile ones. Indifferent units (wildlife, neutral factions) seek nobody.

**The loop, per tick** (every occupied map/level, grouped by area and z):
1. Seeking, as above. A current target is kept while it lives within `combat.leash` (16 cells).
2. Each unit with a target attacks when the target is in reach and `tick ≥ data.combat.nextAttackTick`, then waits its weapon speed (+ the style's speed) in ticks. Melee reach is the 4 orthogonal neighbours (4-way movement, WORLD_ARCHITECTURE §1.6); ranged reach is Chebyshev ≤ range.
3. Out of reach, a unit walks with `UF.World.sendUnit` to the free orthogonal neighbour of its target that is fewest steps away. A colonist busy with a job only fights what is in reach.
4. **Retaliation & Faction Aid:** a unit attacked while it has no living target takes the attacker as its target (cancelling any non-combat colonist job with reason `"attacked"`). Its first swing comes after `ceil(speed / 2)` ticks. Units in `flee` or `manual` mode, and units with `data.combat.retaliate === false`, don't hit back. When any faction member is attacked, `aidFaction(victim, attacker, tick)` is called: living same-faction members in the same area within `combat.aidRadius` (10) who are not already fighting a living enemy or in `flee`/`manual` mode acquire the attacker as `targetId` and cancel non-combat jobs to come to their aid (`combat:aid`).

**Feedback** (interface, timed in real milliseconds so it reads the same at ×8).
- **Hitsplats:** a red splat with the damage in white, or a blue splat with 0 for a miss or a zero hit. They sit over the target's body for `display.splatMs` (1000). Up to `display.maxSplats` (4) stack on a unit (centre, above, lower left, lower right); a fifth replaces the oldest. A killing blow's splat stays over the cell after the unit is gone. A unit removed without dying (a despawn) takes its splats with it.
- **Health bar:** `barWidth` (30) × 4 px, green over red with a black rim, 9 px above the unit's head (the first opaque row of its sprite frame). It shows on any unit that attacked or was attacked within `display.barHideMs` (6000).
- **Bitmaps:** every splat bitmap is drawn in code once per damage number and cached (`UF_GenHitsplat`); the two bar bitmaps are made once (`UF_GenHealthBar`). Each splat and each bar keeps one pooled sprite for its whole life.
- **Where it's drawn:** one container in the tilemap at z 900 000 (over every unit, under the fog), so it zooms with the map.
- **No floating text popups and no code-made motion** (no lunge, recoil, jump, flash or fall): `playAttackAnimation` turns the attacker to face its target, and `playHitAnimation` only shows the bar.

**Death** (`onUnitDeath(victim, killer)`), in this order:
1. The unit is marked `_isDying` and `dead` with `hp` 0.
2. Its species `yields` drop on its cell, and so does equipment written as a type id. Carried items drop when the unit is removed (UF_Items).
3. A colonist's or person's death goes into the chronicle (`UF.History.addEvent({ type: "death", text: "<name> (fighting level N) was killed by a wolf." })`). UF_Skills adds its own line when the person was skilled.
4. `combat:kill` is emitted and the unit is removed. UF_Anim plays the death from the sheet and keeps the remains.

## API (`UF.Combat`)
| Member | Description |
|---|---|
| `resolveAttack(attacker, target, opts?)` → `{ hit, damage, rolled, maxHit, attackRoll, defenceRoll, chance, style, attackType, speed, weapon, rolls, killed }` or null | One attack now, ignoring range and timer. `opts.rng` is a `() → [0,1)` for tests and tools. Emits `combat:hit`, and `combat:kill` through `onUnitDeath` |
| `onUnitDeath(victim, killer?)` → bool | Death, as above (kept name; UF_Anim wraps it) |
| `playAttackAnimation(attacker, target)` / `playHitAnimation(target, attacker?)` | Kept names that UF_Anim wraps to play the sheet's attack and hurt columns. Here they turn the attacker to face its target and show the bars; no motion |
| `addPopup(cellX, cellY, text)` | Kept name: a hitsplat on the unit standing on that cell, showing the first number in `text` (else a blue 0). No text is drawn. UF_Fire uses it for burns |
| `popups` (getter) | The hitsplats showing now: `[{ unitId, damage, born }]` |
| `calcAC(unit, attackType = "slash")` → number | Kept name (UF_Fire calls it): the unit's max defence roll against that type. Also sets up its hitpoints |
| `spawnHostile(speciesId = "wolf", x?, y?)` → unit | A hostile creature from the catalog (image, tint, kind, combat block), `data.ai "combat"`, tag `hostile`, mode `nearest`. Without x/y it lands near the view centre at a seeded offset |
| `testRaid()` → `[unit]` | Two hostile wolves (the debug key) |
| `describeAttack(attacker, target?)` → `{ A, D, chance, maxHit, speed, range, style, attackType, weapon, weaponType, ranged, ammo, outOfAmmo }` | Every number of an attack, without rolling |
| `describe(unit)` → `{ combatLevel, levels, hp, maxHp, mode, style, attackType, weapon, speed, range, maxHit, ammo, outOfAmmo, bonuses, targetId, inCombat }` | For the character sheet |
| `level(unit, skillId)`, `maxHp(unit)`, `hp(unit)` | Levels as above; the maximum; current hitpoints (set up on first use) |
| `combatLevel(unit)` | `floor(0.25 × (defence + hitpoints) + 0.325 × max(attack + strength, floor(1.5 × ranged), floor(1.5 × magic)))`. Same as `UF.Skills.combatLevel` (no prayer term) |
| `bonusesOf(unit)`, `weaponOf(unit)`, `styleOf(unit)`, `modeOf(unit)`, `sideOf(unit)` | The parts `describeAttack` uses |
| `defenceRoll(unit, attackType)` | Max defence roll |
| `hitChance(A, D)`, `maxHitFor(effectiveStrength, bonus)`, `roll({ A, D, maxHit }, rng)` → `{ a, d, hit, rolled }` | The formulas |
| `duel(a, b, seed, maxTicks = 3000)` → `{ winner: "a" \| "b" \| null, ticks, hpA, hpB }` | A fight of two units worked out in ticks from their current numbers, without touching them (balance, tests) |
| `setMode(unit, mode)`, `setStyle(unit, style)`, `setAttackType(unit, type)`, `engage(attacker, target)`, `disengage(unit)` | Orders (the faction menu of V49 and click targeting will call these) |
| `factionOf(unit)` | Resolves canonical faction ID for a unit (returns player ID for player/colonists) |
| `callFactionAid(victim, attacker, tick)` → `[helperUnits]` | Summons nearby same-faction members within `aidRadius` (10) to target the attacker and join the fight |
| `inCombat(unit)` → bool | A living target, or an attack made or taken within the last 10 ticks (6 s at ×1) |
| `tick()`, `updates()`, `state()`, `config()` | Counters, the saved state, the catalog block merged over the defaults |
| `layer()` | The map's hitsplat layer (`visibleSprites()`, `allChildren()`, `poolSizes()`), for tests. `fxOf(unitId)`, `clearFx()`, `splatBitmap(n)`, `barBitmaps()`, `headOf(sprite)`, `framePixels(bitmap, rect)` |
| `enabled` | false stops the loop |
| `debug`, `debugKeysOn()` | The K key's gate (below) |
| `testFilter` | Tests only: a `Set` of unit ids; while set, the loop looks at those units and no others |
| `stats` | `{ attacks, hits, kills, ticks }` since boot |
| `perf` | `{ updates, simMs, simWorst, ticks, tickMs, tickWorst, drawUpdates, drawMs, drawWorst, drawOver1, frameReads, splatBitmaps }` (`performance.now`) |
| `errors` | The last 20 errors caught inside the plugin |
| `TYPES`, `SKILLS`, `STYLES`, `MODES`, `SLOTS` | The id lists |

## The contract with UF_Skills (2026-09-19)
- **Emits** `combat:hit` `{ attacker, target, damage (0 on a miss), hit, style, attackType }` (exactly these six keys) after every attack, `combat:kill` `{ attacker, target }` when a target dies, and `combat:aid` `{ victim, attacker, helpers }` when faction aid is summoned. `attacker` is `null` for a death without a killer (fire).
- **Reads** levels through `UF.Skills.level(unit, id)`, as above. Creature blocks come first, so a wolf never asks UF_Skills.
- **Hitpoints:** the maximum is the hitpoints level. UF_Skills raises `data.hp` by the levels gained.

## State it saves
- `UF.World.state.combat = { updates, tick, seq, spawns }`: the map-update and tick counters, the attack counter used by the seeding, and the spawn counter for `spawnHostile`.
- `unit.data.hp` (current hitpoints), `unit.data.maxHp` (cache), `unit.data._isDying` / `unit.data.dead` (set at death).
- `unit.data.combat = { mode?, style?, attackType?, targetId, nextAttackTick, lastTick, chase?, fleeFrom?, fleeTick?, protectId?, retaliate? }` on units that took part in a fight (about 100 bytes each).
- Not saved: hitsplats and bars (`fx`), the pooled sprites, caches.

## Events
- **Emits:** `combat:hit`, `combat:kill`, `combat:aid` as in the contract.
- **Listens:** `world:unitRemoved`, to drop the hitsplats of a unit removed without dying.

## Keys and mouse
**K** spawns two hostile wolves near the view centre (`testRaid`), but only while `UF.Test.active`, after `UF.Combat.debug = true` is typed in the F8 console, or when the game was launched with `--uf-debug`. In the editor's Playtest it does nothing until the flag is set. It is mapped as `Input.keyMapper[75] = "ufCombatRaid"`.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `UF_GenHitsplat` (code-drawn, one per damage number) | red splat with the number, blue splat with 0 | generated. No art request yet: the spec is in the 2026-09-19 build report for `docs/ASSET_REQUESTS.md` (a red splat and a blue splat, each 28 × 24 px without the number, which stays code-drawn) |
| `UF_GenHealthBar` (code-drawn, 2 bitmaps) | health bar rim, red and green | generated; interface, may stay code-drawn |
| each unit's own sheet | read (never changed) to find the head row for the bar | whatever the unit uses |
| `$U7_Wolf`, `$U7_Troll`, `$U7_Townsman` and the other species images (by catalog id) | `spawnHostile` and the suite's test units | U7 stand-ins (STATUS → Stand-ins) |

## Checks (suite `combat`)
Levels in these checks come from `data.combatLevels` on test units. With UF_Skills loaded, the suite makes `UF.Skills.level` answer from them for `kind: "test"` units, and restores it afterwards. Test units stand in a free 14 × 8 block near the map centre, away from other units. `testFilter` keeps the world's own units out of the loop during the suite. Each check was seen failing once, against three sabotaged copies of the plugin in a separate snapshot on 2026-09-19 (FAIL lines in the build report):
- **A:** `a > d × 0.9`, max-hit divisor 600, aggressive ignored, an unseeded random reference, regeneration +2.
- **B:** weapon bonuses ignored, creature levels +30, the blue splat drawn red, the bar under the head, no yields.
- **C:** attack timer +1 tick, no retaliation, a jump on every attack, `state.combat` not enumerable, a 0.6 ms busy loop per drawing update, an error reported inside the plugin.
- **D:** a 6 px lunge on every attack through a `Sprite_Character.updatePosition` alias. This set was made against the final `no_code_motion` check, whose first form sampled after the frame and misread walking units on frames with two updates.

| Check | What would make it FAIL |
|---|---|
| `hit_chance` | 100 000 seeded rolls (`roll`) for A/D = 1850/576, 768/1344, 4000/4000 off the formula by more than 1 point; `hitChance` of the first two not exactly `1 − 578/3702` and `768/2690` |
| `max_hit` | `maxHitFor` of (71, 50), (9, 0), (110, 100), (68, 24) not 13, 1, 28, 9. A strength-60 aggressive unit with a long sword: max hit not `floor(0.5 + 71 × (bonus + 64) / 640)` (10 with the catalog's +24). Over 3000 `resolveAttack`s against a defence-1 dummy: any damage above it, the largest not equal to it, or any value in 0..max never seen |
| `styles` | Long sword, levels 60: the aggressive max hit not above the accurate one; the defensive defence roll not above the accurate one; the accurate attack roll not above the aggressive one. Four attacks in aggressive, defensive, controlled, accurate not giving `combat:hit` with those styles in that order; the payload not exactly `attacker, target, damage, hit, style, attackType` with the right units, a number, a boolean, a valid type, and damage 0 on a miss |
| `equipment` | Expected damage per tick (chance × max hit / 2 / speed) against a wolf at levels 40. Fails when these are not higher than the second item of each pair: iron short sword vs stone knife, iron dagger vs stone knife, iron axe vs stone axe, copper mace vs wooden club. Also when a short bow with 3 arrows doesn't use one per shot (3 → 2 → 1 → 0, ranged attacks) and then fight with fists (crush, `outOfAmmo "arrows"`) |
| `creatures` | Any wildlife species without all ten contract keys; the hare not 1s with 2 hitpoints; the wolf's fighting level outside 15-25 or the troll's outside 60-80; the wolf, troll and wildcat not stab, crush and slash; a level-1 colonist (10 hp, fists) winning more than 20 of 100 seeded duels with a wolf; a level-40 colonist in iron (short sword, mail, helmet, iron shield) winning fewer than 80 |
| `hitsplats` | A forced hit not showing exactly one splat with its damage number, from the cached bitmap for that number, red at its left edge, centred on the unit's x within 2 px and within 80 px above its feet. A forced miss not showing one blue 0. Seven more attacks not leaving 4 splats in 4 different slots. Any splat left on the unit after 65 frames (~1 s). The old popup layer present; a layer sprite with a bitmap that is not a cached splat or bar; `addPopup(…, "MISS")` not making a 0 splat |
| `health_bar` | After a hit: no bar, the green width not `round(30 × hp / max)`, not again after the hitpoints change, the bar not ending above the head (its first opaque row, found by the check itself) or more than 16 px above it, not centred within 1 px, not green over red, a bar on a bystander who never fought, or hiding outside 5.5-6.8 s after the last hit |
| `attack_speed` | Through the loop at ×1: the gaps between an unarmed unit's attacks not exactly 144 map updates (4 ticks × 36), an iron axe's not 216; the same gaps in `Graphics.frameCount` off by more than 2 |
| `retaliate` | A hostile unit 4 cells from a friendly one never choosing it and walking up to attack it within 20 s; the friendly one (mode `defend`) not taking the hostile as its target and hitting back after the first hit; a `flee` unit taking a target or not recording whom it flees from; a `manual` unit taking a target |
| `no_code_motion` | The 12 fighters of the speed, retaliation and screenshot fights and a probe hit by direct `playAttackAnimation` / `playHitAnimation` calls, checked at ≥ 500 position updates. Each watched sprite has a test-only wrapper on its own `updatePosition` that compares, right as the sprite sets its position, the position every plugin gave it with its event's screen position, against the first update's offset. FAILS on any offset change (a lunge or recoil), any rotation, scale, blend flash, `_combatOffset` / `_combatAnim`, or jump |
| `death` | A wolf at 1 hp hit with a forced hit: not killed and removed, its catalog yields not added on its cell, not exactly one `combat:kill` with the right attacker and target after a `combat:hit` of damage 1. A killed test person not removed, or no chronicle `death` line naming both units (when UF_History is loaded) |
| `regen` | With the tick counter moved to one tick before a multiple of 100: a unit at 17/20 not at 18 after that tick, not still at 18 one tick later, or a unit at 20/20 changed |
| `saved` | `makeSaveContents().ufWorld` not the live world; after a `JsonEx` round trip, a unit's `data.combat`, `hp` or `maxHp` differ, or `state.combat` differs |
| `perf` | 100 test units fighting in 50 pairs (short swords, 99 hp) at ×1 and the farthest zoom (all in view): the loop plus the drawing above 0.5 ms per frame on average over 360 frames (`performance.now`), fewer than 50 attacks, or fewer than 50 health bars drawn. The detail also gives the worst single update, drawing updates over 1 ms, the tick cost, and the cost of a tick with no test filter over every unit in the area (normal play; reported, not part of the condition) |
| `no_math_random` | `js/plugins/UF_Combat.js` not readable, shorter than 5000 characters, or containing the unseeded random call |
| `no_errors` | Any uncaught error during the suite (UF_Test's record) or any error caught inside UF_Combat |

Screenshot `combat.fight_zoom1.png`: a guard in iron and a scout against a troll, and a hunter against a wolf, mid-fight at zoom 1 (hitsplats and bars).

## Replaced core methods
None; aliases only: `Game_Map.prototype.update` (the loop), `Scene_Map.prototype.update` (the K key), `Spriteset_Map.prototype.createCharacters` (the layer), `Scene_Boot.prototype.start` (the suite). The old aliases of `Sprite_Character.prototype.update` and `updatePosition` (the lunge, recoil and fall) and the `Spriteset_Map.createLowerLayer` popup layer are gone.

## Known limits
- **Hooks not applied yet.** The lines in other plugins that this needs are in the 2026-09-19 build report ("hooks"):
  - UF_Colonists should skip its decisions while `UF.Combat.inCombat(unit)`, so a colonist in a fight isn't sent to work.
  - UF_Wildlife's wander should skip units in combat.
  - UF_Sheet still shows the six d20 scores.

  UF_Fire needs nothing: its `units_hurt` check (commit 3ad42b5) already expects a hitsplat through `addPopup` and no code-made motion.
- **Colonists with a job don't chase.** Until the UF_Colonists hook lands, a colonist in the middle of a job only fights what is in reach, and may be sent back to work mid-fight.
- **Not built yet:**
  - Line of sight (ranged units shoot through trees and walls).
  - Thrown weapons, and arrows recovered from the ground.
  - Magic weapons and spells: only creatures use the magic attack type (the ice wraith).
  - Choosing the attack type that suits the target best.
  - DF-style injuries by body part: V64 leaves them open; the user decides (VISION Q12).
- **Hunting isn't combat.** The `hunt` job (UF_Jobs) kills prey by working, as before. Prey never fights back.
- **Five-map integration (Codex, 2026-09-19):** each tick groups the world unit registry by area and z, then seeks/chases/fights within each group regardless of the viewed map. `engage` and direct `resolveAttack` refuse cross-level/area targets; movement goals and death drops retain z. Debug spawns and damage UI use the viewed level; lingering splat anchors cannot leak to another level. Ground API defaults remain unchanged. Snapshot `codex_zcore_integration_20260919_a`, `z_integration` passed 11/11, including real map-update attacks on all five levels while viewing Ground, cross-level refusal and underground equipment drops. Combat's full legacy regression suite is pending this integration; no editor F5/F8 check yet.
- **Timing measured, not played.** The combat numbers (weapon and creature tables) are first-pass balance. The duels say a level-1 colonist loses to a wolf every time and a level-40 one in iron wins every time; nothing between has been tuned against play.
- **Perf spikes.** The `perf` check's averages hold, but single updates spike (up to about 5 ms drawing, 3-5 ms for a tick of 100 fighters). The spikes are rare: the detail counts drawing updates over 1 ms, 3-5 in 360 frames. Probably garbage collection; not investigated further.
- **Not run in the RMMZ editor's Playtest (F5).** Not checked at ×8 speed.
