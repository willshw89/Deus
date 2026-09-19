# COMBAT CHAINS: from the ground to the weapon (VISION V55), the phase-2 spec

Written 2026-09-18 (night) by Claude Code. User instruction: "Lets build combat. Including fletching, smithing, etc." (VISION V55). Contract paragraph: `docs/design/WORLD_ARCHITECTURE.md` §2.10 "Combat chains". This file is exact enough to implement phase 2 from without guessing; where a number here and the catalog disagree, the catalog is wrong and gets fixed to this file.

**Status.** Phase 1 (this file, the catalog data, `tools/check_catalog.js`, `docs/CREDITS.md`) landed 2026-09-18 night. Phase 2 (code: ranged attacks, the five equipment slots, crafting quality and material on item records, arming through the society plan) starts when the UF_Combat core (attack modes, d20 to-hit, DF-style body-part injuries; another agent, same night) lands, and is built from §9.

**Sources.** Dice, weapon properties, armor class values and the attack rules come from the System Reference Document 5.1 (CC-BY-4.0; the attribution text is in `docs/CREDITS.md`), tables **"Weapons"** and **"Armor"** (Equipment) and the rules under **"Using Ability Scores"** and **"Combat → Making an Attack"**. The chain itself (ore → bar → blade, hide → leather → armor, log → bow, shaft + tip + feathers → arrow) is Dwarf Fortress's idea with our numbers; no DF or D&D name, term or data is used (AGENTS.md → Reference vs. shipped content; `tools/check_catalog.js` scans every string for the banned list).

**Where the data lives.** `game/data/UF_WorldCatalog.json`: `materials` (§1), `items.types` (§2), `combat` (§3, §6), `recipes.list` (§4), `objects` (§5), `labors` and `cultures.<species>.chainWeights/arms` (§7), `colony.plan` / `colony.plans.*` (§8), `wildlife.species[].yields` (feathers), `colony.skills`. Added by `tools/add_combat_chains.js` (idempotent; keeps every other entry byte for byte); validated by `tools/check_catalog.js` (18 checks, self-test 45 cases).

## 0. Decisions made in this file (say so, don't hide them)
| # | Decision | Why |
|---|---|---|
| D1 | **Bronze has no recipe.** The materials table keeps the `bronze` row (multipliers fixed) but there is no tin ore in the catalog, so nothing makes it. A tin ore later adds one recipe (`bar_copper` + tin → `bar_bronze`) and nothing else changes. | Inventing "copper + bone ash = bronze" would be fake chemistry in a game that follows DF's material logic. |
| D2 | **Copper is used by the mace** (`mace` = 2 copper bars + 1 log at the smithy, material copper ×0.9). Everything else metal is iron. | Gives `ore_copper` / `bar_copper` a consumer; a cast copper head on a haft is the earliest real metal weapon. |
| D3 | **Ranges are SRD feet ÷ 10, not ÷ 5** (1 cell = 5 ft, then halved): short bow 8/32 cells, long bow 15/60, sling 6/24, thrown spear and dagger 2/6. | Units see 8 cells (`data.sight`), the map is dense with objects, and at zoom 1 the screen is 17 × 13 cells; SRD's 64-cell long range for a short bow would be four screens. A shooter still needs to see its target (§6.5), so the normal ranges sit at or near sight. |
| D4 | **Crossbows are not in phase 2.** Gnomes prefer the sling and the short bow instead (`cultures.gnome.arms`). | One ammunition type (arrows, plus stones for the sling) keeps the ranged code small; a light crossbow (1d8, 16/64 cells, loading) plus bolts is one item pair and one recipe later. |
| D5 | **The iron axe is two-handed** (no shield), as is every bow; the SRD battleaxe is versatile, ours is simplified to two hands. | The task's rule; also what the AR-600 `held` layer can show. |
| D6 | **The stone pick fights as a handaxe-class tool: 1d6, STR.** The SRD has no simple pick. | It is a tool first; giving it 1d8 (SRD war pick, martial) would make the miner the best fighter. |
| D7 | **Head and leg pieces are +1 AC each and carry a `soak`** (damage taken off a hit that lands on that body part: leather 1, iron 2). The torso piece carries the SRD armor value (leather 11 → `ac 1`, hide 12 → `ac 2` with `dexMax 2`, chain mail 16 → `ac 6` with `dexMax 0`). | The SRD has no helmets or greaves; DF has body parts. Full leather = 13 + DEX, full iron = 18 (plate-level), which matches the SRD's spread. `soak` is data now and is applied when the combat core's injuries land (§6.4). |
| D8 | **Quality names:** crude, rough, plain, sound, fine, flawless (0–5). | Plain English; not DF's ladder. |
| D9 | **Work is in beats** on every new recipe and workshop (craft 6–12, build 4–8; WORLD_ARCHITECTURE §1.7). The older recipes and objects are still in ticks until the beat integration (STATUS K16) rescales them; `recipes.about` says so. Until then a new craft finishes in 6–12 ticks under the tick engine. | The task's rule; mixing units is flagged in the file itself so the rescale skips these entries. |
| D10 | **The work stone gained the tag `workbench`** so recipes can name it (`at: "workbench"`); its tags were `building, workplace` only. | `at` matches a tag; `workplace` is shared with the campfire. |
| D11 | **Intermediate plan steps** (`leather`, `firewood`, `charcoal`, `bars`, `bowyer`, `fletcher`, `rack`) sit between the steps the task named, and the forest plan gains `workstone`. | Today's planner fetches inputs only from the ground, objects and prey (UF_Colonists §"craft step"); bars and charcoal come from recipes, so a step must make them first. Phase 2 also adds input resolution (§8.3), but the explicit steps keep every variant workable on today's engine. |
| D12 | **The `arm` step** is a new step kind: `{ "id": "arm", "arm": ["weapon"], "share": 0.5, "first": ["soldier"] }`. Today's `planStatus` treats an unknown kind as done ("nothing to do"); phase 2 implements it (§8.2). | Same shape as the other steps: `id` plus one kind key and its parameters. |

## 1. Materials (`catalog.materials.list`)
| id | kind | density (kg/L) | hardness (0–10) | value | damage × | armor × | Where it comes from |
|---|---|---|---|---|---|---|---|
| wood | wood | 0.6 | 2 | 1 | 0.7 | 0.8 | `log` (trees) |
| stone | stone | 2.7 | 5 | 1 | 0.8 | 0.9 | `stone` (loose stones, boulders, quarrying) |
| bone | bone | 1.8 | 3 | 1 | 0.75 | 0.8 | `bone` (deer, aurochs, restless dead) |
| leather | leather | 0.9 | 1 | 2 | 0.5 | 1.0 | `leather` ← `hide` at the tanning rack |
| copper | copper | 8.9 | 4 | 3 | 0.9 | 0.9 | `bar_copper` ← `ore_copper` at the furnace |
| bronze | bronze | 8.3 | 6 | 5 | 1.0 | 1.0 | no recipe (D1) |
| iron | iron | 7.9 | 7 | 6 | 1.1 | 1.1 | `bar_iron` ← `ore_iron` at the furnace |

Rules: `damage` multiplies the rolled weapon dice (before the ability modifier; §6.4). For a **melee** hit it is the weapon's material; for a **ranged** hit it is the **ammunition's** material (the bow's wood does not matter; the arrow's tip does). `armor` multiplies an armor piece's `ac` bonus when the piece is made of another material than its type's default (phase 2 has no such recipe, so it is informational; `round half up`). `value` is for trade later. `density × volume` is not used yet; `weight` is stored per item type in kg instead (§2).

## 2. Items (`catalog.items.types`)
Every made item has `material` (its default; the recipe's `material` overrides it on the item record at craft, §3) and `weight` (kg). New records get `quality` (§3). Images are tinted reuses of existing `!$U7_Item_*` sheets until AR-511 (the inventory tool marks them as stand-ins).

### 2.1 Weapons (`weapon` block; slot `weapon`)
`weapon = { damage, ability, hands, reach, skill, properties, versatile?, ranged? }`. `ability`: `str`, `dex`, or `finesse` (the better of STR and DEX). `hands: 2` = no shield (§6.2). `ranged = { range, long, ammo, thrown? }` in cells (§6.5). SRD row = the "Weapons" table entry the dice come from.

| id | Name | SRD row | Dice | Ability | Properties | Hands | Range (cells) | Material | kg | Recipe (inputs → at, labor, beats) |
|---|---|---|---|---|---|---|---|---|---|---|
| stone_knife | Stone knife (existing tool) | dagger | 1d4 | finesse | finesse, light | 1 | – | stone | 0.3 | existing `stone_knife` |
| stone_axe | Stone axe (existing tool) | handaxe | 1d6 | str | – | 1 | – | stone | 1.4 | existing `stone_axe` |
| stone_pick | Stone pick (existing tool) | handaxe-class (D6) | 1d6 | str | – | 1 | – | stone | 1.8 | existing `stone_pick` |
| club | Club | club | 1d4 | str | light | 1 | – | wood | 0.9 | 1 log → workbench, carpenter, 6 |
| spear | Spear | spear | 1d6 (1d8 two-handed) | str | thrown, versatile | 1 | 2 / 6 thrown | stone (default) or iron | 1.4 | `spear_stone`: 1 log + 1 stone + 1 fiber → workbench, carpenter, 8 · `spear_iron`: 1 log + 1 bar_iron + 1 fiber → smithy, weaponsmith, 8 |
| dagger_iron | Iron dagger | dagger | 1d4 | finesse | finesse, light, thrown | 1 | 2 / 6 thrown | iron | 0.5 | 1 bar_iron + 1 leather → smithy, weaponsmith, 8. Also a tool: `hunt 2.5, gather 1.5, craft 1.5` (a better knife; tag `knife`) |
| sword_short | Short sword | shortsword | 1d6 | finesse | finesse, light | 1 | – | iron | 0.9 | 2 bar_iron + 1 leather → smithy, weaponsmith, 10 |
| sword_long | Long sword | longsword | 1d8 (1d10 two-handed) | str | versatile | 1 | – | iron | 1.4 | 3 bar_iron + 1 leather → smithy, weaponsmith, 12 |
| axe_iron | Iron axe | battleaxe (D5) | 1d8 | str | two-handed | 2 | – | iron | 1.8 | 2 bar_iron + 1 log → smithy, weaponsmith, 10. Also a tool: `chop 3` |
| mace | Copper mace | mace | 1d6 | str | – | 1 | – | copper | 1.8 | 2 bar_copper + 1 log → smithy, weaponsmith, 8 |
| bow_short | Short bow | shortbow | 1d6 | dex | ammunition, two-handed | 2 | 8 / 32, ammo `arrows` | wood | 0.9 | 1 log + 2 fiber → bowyer, bowyer, 10 |
| bow_long | Long bow | longbow | 1d8 | dex | ammunition, heavy, two-handed | 2 | 15 / 60, ammo `arrows` | wood | 0.9 | 2 log + 2 fiber → bowyer, bowyer, 12 |
| sling | Sling | sling | 1d4 | dex | ammunition | 1 | 6 / 24, ammo `stone` | leather | 0.1 | 3 fiber + 1 leather → workbench, leatherworker, 6 |

Not included from the task's SRD list: warhammer (no hammer item yet; a `hammer_iron` 1d8 str is one row + one recipe when wanted), light crossbow (D4). The `skill` of every melee weapon is `fighting`, of every ranged weapon `archery` (§6.3).

### 2.2 Armor (`armor` block; slots `head`, `torso`, `legs`) and shields (`shield` block; slot `shield`)
`armor = { slot, ac, dexMax (null = no cap), soak, minStr? }`; `shield = { ac }`.

| id | Name | Slot | ac | dexMax | soak | SRD derivation | Material | kg | Recipe |
|---|---|---|---|---|---|---|---|---|---|
| fiber_wrap | Woven wrap (existing) | torso | 0 | – | 0 | clothing | – | 0.5 | existing |
| hide_cloak | Hide cloak (existing) | torso | 2 | 2 | 1 | hide 12 + DEX (max 2) | leather | 5.4 | existing |
| armor_leather | Leather armor | torso | 1 | – | 1 | leather 11 + DEX | leather | 4.5 | 4 leather + 2 fiber → workbench, leatherworker, 10; `wear.tier 3` |
| mail_iron | Iron mail | torso | 6 | 0 | 2 | chain mail 16, STR 13 (`minStr`) | iron | 25 | 5 bar_iron + 1 leather → smithy, armorsmith, 12; `wear.tier 3` |
| helmet_leather | Leather cap | head | 1 | – | 1 | D7 | leather | 0.5 | 2 leather → workbench, leatherworker, 6 |
| helmet_iron | Iron helmet | head | 1 | – | 2 | D7 | iron | 1.4 | 2 bar_iron + 1 leather → smithy, armorsmith, 10 |
| leggings_leather | Leather leggings | legs | 1 | – | 1 | D7 | leather | 0.9 | 2 leather + 1 fiber → workbench, leatherworker, 6 |
| greaves_iron | Iron greaves | legs | 1 | – | 2 | D7 | iron | 2.7 | 2 bar_iron + 1 leather → smithy, armorsmith, 10 |
| shield_wood | Wooden shield | shield | 2 | – | – | shield +2 | wood | 2.7 | 2 log + 1 leather → workbench, carpenter, 8 |
| shield_iron | Iron shield | shield | 2 | – | – | shield +2 | iron | 5.0 | 2 bar_iron + 1 log → smithy, armorsmith, 10 |

The SRD's chain shirt (13 + DEX max 2), ring mail (14) and plate (18) are not items; they are the reference points D7 calibrates against (full iron = 18). `wear.tier 3` on the two torso armors switches a human colonist to the tier-3 ("tailored") walk sheet until the AR-600 armor layer exists.

### 2.3 Ammunition and intermediates
| id | Name | Tags | Stack | Material | kg | Block | Recipe |
|---|---|---|---|---|---|---|---|
| arrows | Arrows | ammo, arrow | 24 | stone (default), bone or iron by recipe | 0.05 | `ammo: { for: ["bow_short", "bow_long"] }`, quality | `arrows_stone`: 1 log + 3 feathers + 1 stone → 12 (fletcher, fletcher, 8) · `arrows_bone`: … + 1 bone → 12 (8) · `arrows_iron`: … + 1 bar_iron → 12 (10) |
| (stone) | Stone (existing) | – | 10 | – | – | the sling's ammunition (`sling.weapon.ranged.ammo = "stone"`; no `ammo` block, the existing entry is untouched) | – |
| charcoal | Charcoal | fuel, material, charcoal | 10 | – | 0.5 | – | 3 firewood → 2 (furnace, furnace_operator, 8) |
| bar_iron | Iron bar (existing) | metal, material | 10 | – | – | – | 2 ore_iron + 1 charcoal → 1 (furnace, furnace_operator, 10) |
| bar_copper | Copper bar | metal, material | 10 | copper | 2.0 | – | 2 ore_copper + 1 charcoal → 1 (furnace, furnace_operator, 8) |
| leather | Leather | leather, material | 5 | leather | 1.0 | – | 1 hide → 1 (tannery, tanner, 6; a knife speeds it) |
| feathers | Feathers | feathers, material | 20 | – | 0.1 | – | wildlife yields: fowl 4, songbird 2, hawk 3 (plus their meat) |

A quiver is a stack of arrows in the inventory (§6.5). Bars, charcoal and leather have no quality (`quality: false` on their recipes).

## 3. Quality (rolled at craft)
- **Roll:** `d20 + floor(skill / 2) + abilityModifier(recipe.ability)`, with `skill` = the crafter's `data.skills[recipe.skill]` (0–20) and the ability from `data.stats` (V53; `finesse` never appears on recipes). Seeded: `mulberry32(hash32(seed, unitId, jobId, "quality"))`, never `Math.random` (WORLD_ARCHITECTURE §1.3).
- **Quality** = the number of `combat.quality.thresholds` (`[5, 10, 15, 20, 25]`) the roll **exceeds**: roll ≤ 5 → 0, 6–10 → 1, 11–15 → 2, 16–20 → 3, 21–25 → 4, ≥ 26 → 5. A novice (skill 0, modifier 0) makes quality 0–3, mostly 1–2; a master (skill 20, +10) with +2 makes 2–5.
- **Names** (`combat.quality.names`): crude, rough, plain, sound, fine, flawless. Shown on the character sheet and the look label as "a fine iron dagger".
- **Effects** (`combat.quality.toHit` / `.ac` / `.value`, indexed 0–5): to hit `[-1, 0, 0, 0, +1, +1]` for weapons; AC `[-1, 0, 0, 0, +1, +1]` for armor and shields (each worn piece adds its own modifier); value `[0.5, 0.8, 1, 1.2, 1.5, 2]` × the material's value, for trade later. Ammunition quality applies its to-hit modifier to the shot.
- **Storage:** the item record gains `material` (id) and `quality` (0–5) when the recipe has `quality: true`; `material` comes from `recipe.material`, else the type's `material`. One roll per craft job, applied to the whole output (a batch of 12 arrows shares one quality).
- **Stacks:** `UF.Items.drop/putDown/give` merge only items whose `type`, `material` and `quality` all match (records without them merge as today). This is the one UF_Items behaviour change that touches existing items (they have neither field, so nothing changes for them).

## 4. The chain from the ground (`catalog.recipes.list`)
Recipe fields: `id, name, inputs, outputs, work (beats), at (object tag), labor, skill, ability, material?, quality, tool?`. `at` is the tag of the workshop the crafter stands beside (UF_Jobs' craft handler already does this: nearest object with that tag within 40 cells, stand on a free neighbour, "needs a <tag>" when none). `labor` is the labor that may take the job (§7); `skill` grows by one per five jobs (UF_Colonists) and feeds the quality roll.

```
trees ──chop──▶ log ──split_firewood (anywhere, axe)──▶ firewood ──charcoal (furnace)──▶ charcoal
ironstone ──mine──▶ ore_iron ─┬─bar_iron (furnace: 2 ore + 1 charcoal)──▶ bar_iron
copper_outcrop ──mine──▶ ore_copper ─┴─bar_copper (furnace)──▶ bar_copper ──mace (smithy)──▶ mace
bar_iron ──smithy (weaponsmith)──▶ dagger_iron, sword_short, sword_long, axe_iron, spear (iron)
bar_iron ──smithy (armorsmith)──▶ helmet_iron, mail_iron, greaves_iron, shield_iron
log ──bowyer bench (bowyer)──▶ bow_short, bow_long
log + feathers (fowl, songbird, hawk) + stone | bone | bar_iron ──fletcher bench (fletcher)──▶ arrows ×12
hide (any prey) ──tanning rack (tanner)──▶ leather ──workbench (leatherworker)──▶ armor_leather, helmet_leather, leggings_leather, sling
log ──workbench (carpenter)──▶ club, spear (stone tip), shield_wood
```
Every `at` tag matches exactly one workshop object (§5) except `workbench` (the existing work stone, D10). `tool` (knife, axe) only speeds the job (UF_Jobs ×1.5), never required. The full list with numbers is §2; the checker proves every input and output exists.

## 5. Workshops (`catalog.objects`; one cell each, VISION V44)
| id | Name | Tags | Build (items → work in beats) | Ruin | Placeholder now | Art |
|---|---|---|---|---|---|---|
| furnace | Furnace | building, workplace, furnace | 6 stone → 8 | rubble | stock `Outside_B` 148 (stone ring), tint `#e0b898` | AR-510 |
| smithy | Smithy | building, workplace, smithy | 4 stone + 1 log + 1 bar_iron → 8 | rubble | stock `Inside_C` 404 (anvil) | AR-510 |
| bowyer_bench | Bowyer's bench | building, workplace, bowyer | 2 log → 6 | rubble | stock `Inside_C` 403 (tongs, bows, quiver) | AR-510 |
| fletcher_bench | Fletcher's bench | building, workplace, fletcher | 2 log + 1 stone → 6 | rubble | stock `Inside_C` 403, tint `#c8d8f0` | AR-510 |
| tanning_rack | Tanning rack | building, workplace, tannery | 3 log + 2 fiber → 4 | rubble | stock `Outside_B` 149 (frame with a stretched hide) | AR-510 |
| weapon_rack | Weapon rack | building, stockpile, weapon_rack | 2 log → 4 | rubble | stock `Inside_C` 400 (rack with swords) | AR-510 |
| workbench | Work stone (existing) | building, workplace, **workbench** (D10) | 2 stone + 1 log → 80 ticks | rubble | stock `Outside_C` 285 | AR-104 |

All are impassable (crafters stand beside them; `workshops_one_cell` in the checker fails a passable workplace). The weapon rack is a stockpile for `weapon, armor, shield, ammo` (the plan's `rack` step carries `stores`); items are put on its cell from a neighbour (§9.4). Tile ids follow UF_Objects' rect formula (`id % 256`, right half = 128 + row × 8 + col − 8; C sheets add 256), and `tile.sheet` may name any sheet in `img/tilesets/` (UF_Objects loads it by name). The smithy needs an iron bar, so the plan smelts bars before it (§8). A `gen:` placeholder was not used because UF_Objects only draws generators it has code for (`gen "x" has no generator` fails its suite).

## 6. Equipment and combat rules (`catalog.combat`)
### 6.1 Slots
`unit.data.equipment = { head, weapon, shield, torso, legs }` (item ids or null). What each accepts: `head` ← `armor.slot === "head"`; `torso` ← `armor.slot === "torso"` (armor and clothing: every clothing item has an `armor` block with `ac 0` or more); `legs` ← `armor.slot === "legs"`; `weapon` ← anything with `weapon` or `tool`; `shield` ← `shield`. **Aliases** (`combat.aliases`): `equipment.tool` reads as `equipment.weapon`, `equipment.clothes` as `equipment.torso`, until every reader is moved; `UF.Items.equip` writes the new keys and mirrors them to the old ones for one build, so UF_Jobs' `toolMultiplier` (reads `equipment.tool`) and UF_Colonists (`equippedItem(u, "clothes")`, `tier`) keep working. `wear.tier` still sets `data.tier` and the walk sheet (UF_Colonists.setTier).

### 6.2 Hands, versatile, thrown
- `weapon.hands === 2` (both bows, the iron axe): equipping it unequips the shield; equipping a shield while a two-handed weapon is held fails ("needs both hands").
- `versatile` (spear 1d8, long sword 1d10): the two-handed dice are used when the `shield` slot is empty.
- `thrown` (spear, iron dagger): a ranged attack with the weapon itself as ammunition; it leaves the `weapon` slot and lands on the target's cell (hit) or within 1 cell of it (miss), as a ground item that keeps its material and quality. STR is the ability (SRD: thrown melee weapons use the melee ability).

### 6.3 Attack roll
`d20 + abilityModifier + proficiency + qualityToHit(weapon) [+ qualityToHit(ammo)] vs AC`. `abilityModifier` = `floor((score − 10) / 2)` of `weapon.ability` (`finesse` = max of STR and DEX; unarmed and no-weapon tools use STR; ranged and thrown per the block). `proficiency = combat.proficiency.base + floor(skill / combat.proficiency.perSkill)` = 2 + floor(skill / 5) with `skill = data.skills[weapon.skill]` (`fighting` melee, `archery` ranged; the labor `soldier` trains `fighting`). Natural 20 (`combat.critical.hit`) hits and doubles the dice; natural 1 (`combat.critical.miss`) misses. Advantage/disadvantage: roll twice, take the better/worse (the combat core's rules for flanking, prone and unseen; long range adds disadvantage, §6.5).

### 6.4 Damage and AC
- Damage = `round(diceRoll × material.damage) + abilityModifier`, minimum 1 on a hit; the material is the weapon's for melee and the **ammunition's** for shots. Unarmed: `combat.unarmed.flat` (1) + STR modifier. Criticals double the dice before the multiplier.
- `AC = combat.baseAC (10) + min(DEXmod, torso.armor.dexMax ?? +∞) + head.ac + torso.ac + legs.ac + shield.ac + Σ qualityAC(each worn piece)`. Unworn slots add 0. A torso piece with `minStr` worn by someone below it: −2 to hit and speed halved (SRD: heavy armor Strength). Examples: naked DEX 12 → 11; woven wrap → 11; hide cloak DEX 16 (+3, capped 2) → 14; leather armor + cap + leggings DEX 14 → 10 + 2 + 3 = 15; iron mail + helmet + greaves + iron shield → 10 + 0 + 6 + 1 + 1 + 2 = 20 (+1 per fine piece).
- **`soak`** (D7): when the combat core lands a hit on a body part (head, torso, arms, legs, hands, feet), the piece covering it (head → head, torso and arms → torso, legs and feet → legs) takes `soak` off the damage before injuries are computed (not before HP loss). Hands and arms use the torso piece's soak.

### 6.5 Ranged attacks
- **Range** in cells (D3): `ranged.range` normal, `ranged.long` with disadvantage (`combat.ranged.longRangeDisadvantage`). Distance = Chebyshev cells. A target beyond `long` cannot be shot. A shooter must **see** the target: distance ≤ `data.sight` (8 for colonists) or the target is already its combat target (the combat core's memory), so the long bow's 15 matters for return fire and for guards on walls with more sight, not for spotting.
- **Line of sight:** Bresenham from the shooter's cell to the target's; every intermediate cell must hold no object that is impassable and not `under` (`combat.ranged.losBlockedBy`; trees and walls block, grass, beds and stockpiles do not); units in between do not block (they may be hit later; not in phase 2). No LoS → no shot ("no clear shot"); the attack mode then closes in.
- **Rate:** one shot per beat (`combat.ranged.shotsPerBeat`), the `attack` animation frames of AR-600.
- **Ammunition:** the weapon's `ranged.ammo` type must be in the shooter's inventory (any stack; the quiver is a stack). Each shot consumes 1 (`UF.Items.consumeFrom`). Out of ammunition → the unit switches to its melee weapon if it carries one, else unarmed, and its intent text says "out of arrows".
- **Misses** drop the arrow (or sling stone) on a cell within `combat.ranged.missScatter` (1) of the target, seeded; hits destroy the arrow (stones are recovered on the target's cell). Dropped ammunition keeps its material and quality; hauling it back is an ordinary `fetch`.
- Thrown weapons: §6.2.

### 6.6 What the character sheet shows (V49, later)
Each slot's item with name, material and quality ("a fine iron dagger"), the computed AC with its parts, the weapon's dice and range, the ammunition count. Phase 2 only exposes the numbers through `UF.Items.acOf(unit)` and `UF.Combat.describe(unit)`; drawing is the sheet's build.

## 7. Labors and cultures (`catalog.labors`, `catalog.cultures`)
| Labor | Skill | Recipes it owns |
|---|---|---|
| furnace_operator | smelting | charcoal, bar_iron, bar_copper |
| weaponsmith | smithing | spear_iron, dagger_iron, sword_short, sword_long, axe_iron, mace |
| armorsmith | smithing | helmet_iron, mail_iron, greaves_iron, shield_iron |
| bowyer | bowyery | bow_short, bow_long |
| fletcher | fletching | arrows_stone, arrows_bone, arrows_iron |
| tanner | tanning | leather |
| leatherworker | leatherwork | sling, helmet_leather, armor_leather, leggings_leather |
| carpenter | carpentry | club, spear_stone, shield_wood |
| soldier | fighting | (no recipe; jobs `attack`, `guard`; first to be armed) |

`colony.skills` gained `smelting, smithing, bowyery, fletching, tanning, leatherwork, carpentry, fighting, archery` (appended, so existing seeded skills keep their values: `skillsFor` is index-based).

**Labor gating (phase 2, V43):** a colonist takes a chain recipe only when `data.labors` includes the recipe's `labor`, or when `data.labors` is absent (everyone may do everything until the labors build assigns them). The planner's weight for a chain job = `culture.priorities[labor.priority] × (culture.chainWeights[labor] ?? 1) × (1 + skill / 20)`.

**Culture weights** (`cultures.<species>.chainWeights`, missing = 1) and **arms** (`arms.prefer` = weapon/armor ids the arming step hands out first; `arms.scavenge` 0–1 = how strongly the culture prefers taking weapons from the ground, racks and the fallen over crafting them):
| Culture | chainWeights | arms.prefer | scavenge |
|---|---|---|---|
| human (Settlers) | balanced (none) | sword_short, spear, bow_short, shield_wood | 0.2 |
| elf (Grove-keepers) | bowyer 1.5, fletcher 1.5, tanner 1.2, leatherworker 1.2, furnace_operator 0.6, weaponsmith 0.6, armorsmith 0.6 | bow_long, spear, dagger_iron | 0.1 |
| dwarf (Stone-holders) | furnace_operator 1.5, weaponsmith 1.5, armorsmith 1.5, bowyer 0.6, fletcher 0.6 | axe_iron, mace, shield_iron, helmet_iron, mail_iron | 0.1 |
| gnome (Tinkers) | fletcher 1.3, weaponsmith 1.2, armorsmith 1.2, carpenter 1.2 (crossbows later, D4) | sling, bow_short, dagger_iron | 0.3 |
| goblin (Scavengers) | furnace_operator 0.5, weaponsmith 0.5, armorsmith 0.5, tanner 1.2, leatherworker 1.2 | club, spear, sling, dagger_iron | 1.0 (scavenged weapons) |
| orc (War-bands) | weaponsmith 1.3, bowyer 0.7, fletcher 0.7 | axe_iron, sword_long, mace, club (heavy weapons) | 0.5 |
| automaton (Foundry-minds) | furnace_operator 1.4, armorsmith 1.4, weaponsmith 1.2, tanner 0.3, leatherworker 0.3, bowyer 0.5, fletcher 0.5 | mace, sword_long, shield_iron, helmet_iron | 0 |

## 8. Society plan steps (`colony.plan`, `colony.plans.forest / stone / workshop`)
### 8.1 The steps
Cells are relative to the site centre and collide with no existing step (the checker's `plan_steps` fails a shared cell). Appended after each variant's last step (the task said "after pick"; in the stone plan `pick` is third and the axe last, so "after the tool chain" is the working rule; the forest plan has no work stone and gains `workstone` first).

| Step id | Kind | default (human, goblin, orc) | forest (elf) | stone (dwarf) | workshop (gnome, automaton) |
|---|---|---|---|---|---|
| workstone | build workbench (−3, 0) | (already in the plan) | added | (already) | (already) |
| tannery | build tanning_rack (−3, −1) | yes | yes | yes | yes |
| leather | craft leather, count 4 | yes | yes | yes | yes |
| bowyer | build bowyer_bench (−3, 1) | yes | yes | – | yes |
| bows | craft, count 2 | bow_short | bow_long | – | bow_short |
| fletcher | build fletcher_bench (−3, 2) | yes | yes | – | yes |
| arrows | craft arrows_stone, count 24 | yes | yes | – | yes |
| firewood | craft split_firewood, count 6 | yes | – | yes | yes |
| furnace | build furnace (3, −1) | yes | – | yes | yes |
| charcoal | craft charcoal, count 4 | yes | – | yes | yes |
| bars | craft bar_iron, count 4 | yes | – | yes | yes |
| smithy | build smithy (3, 0) | yes | – | yes | yes |
| blades | craft, count 2 | sword_short | spear_stone | axe_iron | dagger_iron |
| armor | craft | armor_leather ×2 | armor_leather ×2 | mail_iron ×1 | armor_leather ×2 |
| rack | build weapon_rack (3, 1), stores weapon, armor, shield, ammo | yes | yes | yes | yes |
| arm | arm ["weapon"], share 0.5, first ["soldier"] | yes | yes | yes | yes |

Done conditions are the existing ones: `build` = every cell holds the object (or is skipped: another building, ruin or water there); `craft` with `count` = the colony holds that many (packs + ground within the site's radius + 2, `colonyCount`); counts that get consumed (`firewood`, `charcoal`, `bars`, `leather`) come back as undone when stock drops, which is what keeps the furnace running. Elves never smith in the plan (their chainWeights say why); dwarves never fletch.

### 8.2 The `arm` step (phase 2, UF_Colonists)
`{ "id": "arm", "arm": [tags], "share": 0.5, "first": [labor ids] }`. **Done** when at least `ceil(share × adults)` adult colonists (stage `adult`/`elder`, or everyone while stages don't exist) are armed: for each tag in `arm`, the matching slot holds an item carrying that tag (`weapon` → `equipment.weapon` item has tag `weapon`; `armor` → `torso`; `shield` → `shield`). Stone tools carry `tool`, not `weapon`, so knives and axes do not count. **Behaviour** when undone: an unarmed colonist whose labors include one in `first` (else any unarmed colonist, soldiers first, then the highest `fighting` skill) takes the best free item: `culture.arms.prefer` order, then the highest quality; sources in order: its own pack, the weapon rack / stockpiles storing `weapon`, the ground within the site (radius + 2), each an `equip` job (rack and ground: `fetch` then `equip`). Scavenging (`arms.scavenge`) adds a roll before crafting: with that chance the colonist looks for a dropped weapon within 30 cells before the plan's craft steps are considered. Nothing here is per-creature behaviour; the faction menu (V49) later toggles `arm` on and off.

### 8.3 Input resolution (phase 2, UF_Colonists `craftStepJob`)
When a craft step's input is missing and no ground item, object action or prey yields it, but a recipe outputs it, the colonist takes that recipe first (its inputs resolved the same way, depth ≤ 3, cycles cut). This is what lets `blades` run without an explicit `bars` step and what makes off-screen societies (V51) produce arms with the same plan. The explicit intermediate steps (D11) stay.

### 8.4 Hauling to the rack
Crafted weapons, armor, shields and ammunition that a colonist does not equip are hauled to the nearest stockpile whose `stores` include their tag (the `rack` step's `weapon_rack`), the way food goes to the larder (`stock` steps). UF_Colonists registers stockpiles from any built object with the `stockpile` tag, not only `stockpile` itself (today: `if (step.build !== "stockpile") continue;` at UF_Colonists.js ~346).

## 9. Phase-2 code checklist (build from this, add these checks)
### 9.1 UF_Items (`docs/systems/UF_Items.md`)
- `slotFor(itemType) → "head" | "weapon" | "shield" | "torso" | "legs" | null` by §6.1.
- `equip(unitId, itemId) → { ok, reason? }`: item carried; slot from `slotFor`; two-hands rule (§6.2); `minStr` allowed (penalty applies in combat); writes `equipment[slot]`, mirrors `tool`/`clothes` aliases; `wear.tier` → `data.tier` + `UF.Colonists.setTier`; emits `items:equipped(unit, item, slot)`. `unequip(unitId, slot)`; `equipped(unitId) → { slot: item | null }`.
- `acOf(unitId) → { ac, parts: { base, dex, head, torso, legs, shield, quality } }` (§6.4).
- Item records: `material?`, `quality?`; `create/give` accept them; `drop/putDown/give` merge only on equal type + material + quality (§3); `describe` says "12 × fine iron-tipped arrows" (quality name + material adjective + name; plain quality omits the name).
- Migration: `equipment: { tool, clothes }` on old saves → `{ head: null, weapon: tool, shield: null, torso: clothes, legs: null, tool, clothes }` on load (`DataManager.extractSaveContents` alias, before UF_Jobs reads it).
- Checks to add to suite `items`: `slot_for` (each of 5 slots + a null for berries), `equip_two_hands` (a long bow refuses a shield and drops it when equipped after), `ac_of` (the five worked examples of §6.4 give 11, 11, 14, 15, 20), `quality_stacks` (12 plain + 12 fine arrows stay two stacks; 12 + 12 plain merge to 24), `alias_mirror` (`equipment.tool === equipment.weapon` after `equip`), `save_migrates_equipment`.

### 9.2 UF_Combat (the core plus these)
- `UF.Combat.attack(attacker, target)` reads `weapon.damage/versatile/ability/skill`, material (§1), quality (§3), `acOf` (§6.4), soak on the landed part (§6.4); unarmed from `combat.unarmed`.
- `UF.Combat.rangedAttack(attacker, target)`: range, sight, LoS, one shot per beat, ammunition consumed, miss scatter, thrown weapons (§6.2, §6.5); `UF.Combat.lineOfSight(area, x0, y0, x1, y1) → bool` (Bresenham, `losBlockedBy`), `UF.Combat.inRange(attacker, target) → "normal" | "long" | false`.
- Attack modes (U7, V29) pick ranged when the unit holds a ranged weapon with ammunition and the target is in range with LoS, else close to melee reach.
- `UF.Combat.describe(unit)` → the sheet's numbers (§6.6).
- Checks to add to suite `combat`: `weapon_dice_used` (a short sword hit on AC 0 deals 1–6 × 1.1 → 1–7 + mod over 200 seeded rolls, never 0), `material_multiplies` (stone vs iron spear means differ by ≈ 0.3 × 3.5 over 500 rolls), `quality_to_hit` (a crude weapon hits AC 15 less often than a fine one over 500 rolls, both within the binomial band), `ranged_range` (8 cells hits, 9 is long, 33 is refused for a short bow), `los_blocked_by_tree` (an oak on the line → no shot; tall grass → shot), `ammo_consumed` (12 arrows → 11 after a shot; 0 → "out of arrows" and a melee swing), `miss_drops_arrow` (with a forced miss an `arrows` item lies within 1 cell of the target), `thrown_spear_lands` (the spear leaves the slot and lies on the target's cell on a hit), `soak_applied` (an iron helmet turns a 2-damage head hit into 0 injury damage, HP still −2), `no_errors`.

### 9.3 UF_Jobs (small)
- `craft.apply`: when the recipe has `quality: true`, roll §3 once (seeded from `seed, unit.id, job.id`) and give the outputs with `material` (recipe's, else the type's) and `quality`; when `quality: false` give plain records. `equip.apply` → `UF.Items.equip` (the old direct write goes). `describe` for equip: "Taking up a fine iron dagger".
- Labor gating in `take` for chain recipes (§7) once `data.labors` exists; nothing else, since `at`/`labor` are carried by the recipe.
- Checks to add to suite `jobs`: `craft_rolls_quality` (a `dagger_iron` craft yields a record with `material "iron"` and `quality` 0–5; the same seed gives the same quality twice), `craft_at_smithy` (a smithy object 3 cells away: the job stands beside it and "needs a smithy" without it), `equip_uses_items_equip` (equipping a shield fills `equipment.shield`).

### 9.4 UF_Colonists (plan steps only)
- The `arm` step (§8.2), input resolution (§8.3), hauling to any `stockpile`-tagged object (§8.4), labor weights (§7). No new per-unit behaviour outside the plan and the labors.
- Checks to add to suite `colonists`: `arm_step_counts_weapons` (two colonists, one holding a club in `weapon`, one a stone axe: `planStatus` says 1/N), `arm_equips_from_rack` (a sword on the weapon rack cell and an unarmed colonist → an `equip` job finishes with the sword in `equipment.weapon`), `craft_resolves_inputs` (a `blades` step with no bars but ore and charcoal on the ground → a `bar_iron` craft precedes the sword), `plan_length_matches_template` (already `plan_reads_the_site`; the template now has 27 steps in the default plan).

### 9.5 Tools and docs
- `tools/check_catalog.js` stays green (`RESULT PASS 18 checks`) and is added to `tools/run_all_suites.js`'s pre-flight.
- `docs/systems/UF_Items.md`, `UF_Jobs.md`, `UF_Colonists.md`, `UF_Combat.md` gain the API lines above; `docs/STATUS.md` records the measured results; `docs/CREDITS.md` is shown in the game's credits before release.

## 10. Known limits of phase 1 (not done)
- No code changed: nothing equips into five slots, shoots, or rolls quality yet. Today's engine already builds the six workshops and runs every recipe here through the generic `build` and `craft` handlers (the plan steps will make colonists do so once the earlier steps are done); the `arm` step is inert ("nothing to do"); `work` on the new entries is in beats while the engine still counts ticks (D9).
- The workshop and item art is stock tiles and tinted stand-ins (AR-510, AR-511); the held-weapon and shield layers of AR-600 are requested as AR-512.
- No warhammer, crossbow, bolts, bronze or per-item durability; `density` and `hardness` are unused numbers until then.
- Not run in Playtest: this phase changes data and docs only; the checker, the inventory tool and a JSON round-trip are the evidence (see the report).
