# COMBAT CHAINS: from the ground to the weapon (VISION V55), the phase-2 spec

Written 2026-09-18 (night) by Claude Code. User instruction: "Lets build combat. Including fletching, smithing, etc." (VISION V55). Contract paragraph: `docs/design/WORLD_ARCHITECTURE.md` §2.10 "Combat chains". This file is exact enough to implement phase 2 from without guessing; where a number here and the catalog disagree, the catalog is wrong and gets fixed to this file.

**Status.** Phase 1 (this file, the catalog data, `tools/check_catalog.js`, `docs/CREDITS.md`) landed 2026-09-18 night. **Converted to OSRS-model combat 2026-09-19** (user: "lets drop the d20 combat rule, and adopt OSRS combat"; VISION V64, V47 retired). The weapon, armour, shield and ammunition blocks now carry attack speeds, attack types, styles and equipment bonuses instead of SRD dice and AC (§2, §6). The UF_Combat core is rewritten to that model (`docs/systems/UF_Combat.md`). Phase 2 is still to build: the five equipment slots in UF_Items, crafting quality and material on item records, arming through the society plan (§9).

**Sources.** The combat rules follow the OSRS model (accuracy and defence rolls from effective levels and equipment bonuses, max hits from effective strength and strength bonus, attack speeds in ticks, combat styles), with our own numbers and words (VISION V64). No SRD dice, armor class or ability scores remain in this file or in the catalog's combat data. The chain itself (ore → bar → blade, hide → leather → armor, log → bow, shaft + tip + feathers → arrow) is Dwarf Fortress's idea with our numbers. No DF, D&D or OSRS name, term or data is used in anything the player reads (AGENTS.md → Reference vs. shipped content; `tools/check_catalog.js` scans every string for the banned list).

**Where the data lives.** `game/data/UF_WorldCatalog.json`: `materials` (§1), `items.types` (§2), `combat` (§3, §6), `recipes.list` (§4), `objects` (§5), `labors` and `cultures.<species>.chainWeights/arms` (§7), `colony.plan` / `colony.plans.*` (§8), `wildlife.species[].yields` (feathers), `colony.skills`. Added by `tools/add_combat_chains.js` (idempotent; keeps every other entry byte for byte); validated by `tools/check_catalog.js` (18 checks, self-test 45 cases).

## 0. Decisions made in this file (say so, don't hide them)
| # | Decision | Why |
|---|---|---|
| D1 | **Bronze has no recipe.** The materials table keeps the `bronze` row (multipliers fixed) but there is no tin ore in the catalog, so nothing makes it. A tin ore later adds one recipe (`bar_copper` + tin → `bar_bronze`) and nothing else changes. | Inventing "copper + bone ash = bronze" would be fake chemistry in a game that follows DF's material logic. |
| D2 | **Copper is used by the mace** (`mace` = 2 copper bars + 1 log at the smithy, material copper ×0.9). Everything else metal is iron. | Gives `ore_copper` / `bar_copper` a consumer; a cast copper head on a haft is the earliest real metal weapon. |
| D3 | **Ranges are short** (revised 2026-09-19): short bow 6 cells, long bow 8, sling 5, one range each (the longrange style adds 2). | Units see 8 cells (`data.sight`), the map is dense with objects, and at zoom 1 the screen is 17 × 13 cells, so the long bow's range sits at sight. |
| D4 | **Crossbows are not in phase 2.** Gnomes prefer the sling and the short bow instead (`cultures.gnome.arms`). | One ammunition type (arrows, plus stones for the sling) keeps the ranged code small; a crossbow (a slow ranged weapon with high ranged attack) plus bolts is one item pair and one recipe later. |
| D5 | **The iron axe is two-handed** (no shield), as is every bow. | The task's rule; also what the AR-600 `held` layer can show. |
| D6 | **Stone tools are weak weapons** (revised 2026-09-19): the stone knife, axe and pick have small attack bonuses and a strength bonus of 1-3, and the axe and pick are slow (5 ticks). | They are tools first; the miner must not be the best fighter. |
| D7 | **Armour is defence bonuses per attack type** (revised 2026-09-19; the d20 AC values and `soak` are gone). Metal gives more defence against slash and stab than against crush, and costs ranged and magic attack; leather is even, with a little magic defence. | Classic-model armour. DF-style injuries by body part stay an open question (VISION V64, Q12); a damage-reduction key comes back only if the user wants wounds on top of hitpoints. |
| D13 | **Material tiers are in each item's own bonuses** (2026-09-19): iron beats bronze beats copper beats stone within a weapon class (iron dagger over stone knife, iron axe over stone axe, copper mace over wooden club). `materials.list[].damage` and `.armor` are no longer read by combat. | One place for each number; the `combat.equipment` check compares the classes. A bronze item, when tin exists, gets bonuses between the copper and the iron one. |
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

Rules (revised 2026-09-19, D13): `damage` and `armor` are **no longer read by combat**. Each item type's bonuses already carry its material's tier (§2). The one place a material still changes a fight is arrows: `ammo.byMaterial` gives the ranged strength of stone, bone and iron tips (§2.3). The two columns stay as data for a later material-swap recipe. `value` is for trade later. `density × volume` is not used yet; `weight` is stored per item type in kg instead (§2).

## 2. Items (`catalog.items.types`)
Every made item has `material` (its default; the recipe's `material` overrides it on the item record at craft, §3) and `weight` (kg). New records get `quality` (§3). Images are tinted reuses of existing `!$U7_Item_*` sheets until AR-511 (the inventory tool marks them as stand-ins).

### 2.1 Weapons (`weapon` block; slot `weapon`)
Revised 2026-09-19 (OSRS model, VISION V64). The block is `weapon = { speed, types, styles, hands, reach, bonuses, ranged? }`:
- `speed`: attack speed in ticks (1 tick = 36 map updates = 0.6 s at ×1).
- `types`: the attack types it can use, the first being the default (`stab`, `slash`, `crush`, `ranged`, `magic`).
- `styles`: the combat styles it offers (`accurate`, `aggressive`, `defensive`, `controlled`; ranged weapons `accurate`, `rapid`, `longrange`).
- `hands`: 2 means no shield (§6.2).
- `bonuses = { attack: { stab, slash, crush, ranged, magic }, defence?: {…}, strength?, rangedStrength?, magicStrength? }`: missing keys count 0.
- `ranged = { range (cells), ammo (item type id), ammoStrength? (ranged strength when the ammunition type has no ammo block) }`.

The old `damage`, `ability`, `properties`, `versatile` and `skill` keys are gone. Which skill a fight trains comes from the style (UF_Skills).

| id | Name | Speed | Types | Styles | Attack stab / slash / crush / ranged / magic | Strength | Hands | Range | Material | kg | Recipe (inputs → at, labor, beats) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| stone_knife | Stone knife (existing tool) | 4 | stab, slash | acc, agg, def | 3 / 1 / −4 / 0 / 0 | 1 | 1 | – | stone | 0.3 | existing `stone_knife` |
| stone_axe | Stone axe (existing tool) | 5 | slash, crush | acc, agg, def | −2 / 3 / 1 / 0 / 0 | 3 | 1 | – | stone | 1.4 | existing `stone_axe` |
| stone_pick | Stone pick (existing tool) | 5 | stab, crush | acc, agg, def | 3 / −2 / 1 / 0 / 0 | 3 | 1 | – | stone | 1.8 | existing `stone_pick` |
| club | Club | 4 | crush | acc, agg, def | −4 / −4 / 5 / 0 / 0 | 5 | 1 | – | wood | 0.9 | 1 log → workbench, carpenter, 6 |
| spear | Spear | 5 | stab, crush | controlled, def | 6 / 3 / 3 / 0 / 0 | 8 | 1 | – | stone (default) or iron | 1.4 | `spear_stone`: 1 log + 1 stone + 1 fiber → workbench, carpenter, 8 · `spear_iron`: 1 log + 1 bar_iron + 1 fiber → smithy, weaponsmith, 8 |
| dagger_iron | Iron dagger | 4 | stab, slash | acc, agg, def | 9 / 4 / −4 / 0 / 0 | 10 | 1 | – | iron | 0.5 | 1 bar_iron + 1 leather → smithy, weaponsmith, 8. Also a tool: `hunt 2.5, gather 1.5, craft 1.5` (a better knife; tag `knife`) |
| sword_short | Short sword | 4 | stab, slash | acc, agg, def | 11 / 8 / −2 / 0 / 0 | 14 | 1 | – | iron | 0.9 | 2 bar_iron + 1 leather → smithy, weaponsmith, 10 |
| sword_long | Long sword | 5 | slash, stab | acc, agg, controlled, def | 12 / 18 / −2 / 0 / 0 | 24 | 1 | – | iron | 1.4 | 3 bar_iron + 1 leather → smithy, weaponsmith, 12 |
| axe_iron | Iron axe | 6 | slash, crush | acc, agg, def | −2 / 20 / 12 / 0 / 0 | 28 | 2 | – | iron | 1.8 | 2 bar_iron + 1 log → smithy, weaponsmith, 10. Also a tool: `chop 3` |
| mace | Copper mace | 4 | crush, stab | acc, agg, controlled, def | 2 / −2 / 8 / 0 / 0 | 10 | 1 | – | copper | 1.8 | 2 bar_copper + 1 log → smithy, weaponsmith, 8 |
| bow_short | Short bow | 4 (rapid 3) | ranged | acc, rapid, longrange | 0 / 0 / 0 / 10 / 0 | (arrows) | 2 | 6, ammo `arrows` | wood | 0.9 | 1 log + 2 fiber → bowyer, bowyer, 10 |
| bow_long | Long bow | 6 (rapid 5) | ranged | acc, rapid, longrange | 0 / 0 / 0 / 15 / 0 | (arrows) | 2 | 8, ammo `arrows` | wood | 0.9 | 2 log + 2 fiber → bowyer, bowyer, 12 |
| sling | Sling | 4 (rapid 3) | ranged | acc, rapid, longrange | 0 / 0 / 0 / 6 / 0 | ranged 4 (`ammoStrength`) | 1 | 5, ammo `stone` | leather | 0.1 | 3 fiber + 1 leather → workbench, leatherworker, 6 |

**What the numbers do** (levels 40, accurate, against a wolf; the `combat.equipment` check prints them), in expected damage per tick:

| Class | Weaker item | Stronger item |
|---|---|---|
| knives | stone knife 0.494 | iron dagger 0.606 |
| swords | (stone knife 0.494) | iron short sword 0.610 |
| axes | stone axe 0.395 | iron axe 0.486 |
| crushing | wooden club 0.498 | copper mace 0.604 |

The long sword and the iron axe trade speed for a bigger hit: they pull ahead at higher strength levels. Not included: a warhammer (no hammer item yet; one row and one recipe when wanted) and the crossbow (D4). Thrown spears and daggers are not in the combat model (the old `thrown` data is gone); they come back with a throwing rule.

### 2.2 Armor (`armor` block; slots `head`, `torso`, `legs`) and shields (`shield` block; slot `shield`)
Revised 2026-09-19. `armor = { slot, bonuses }`; `shield = { bonuses }`. The bonuses have the same shape as a weapon's; armour mostly carries `defence`, and metal pieces carry negative `attack` bonuses for ranged and magic. The old `ac`, `dexMax`, `soak` and `minStr` are gone (D7).

| id | Name | Slot | Defence stab / slash / crush / ranged / magic | Attack penalties | Material | kg | Recipe |
|---|---|---|---|---|---|---|---|
| fiber_wrap | Woven wrap (existing) | torso | 1 / 1 / 1 / 1 / 0 | – | – | 0.5 | existing |
| hide_cloak | Hide cloak (existing) | torso | 4 / 5 / 5 / 5 / 1 | magic −1 | leather | 5.4 | existing |
| armor_leather | Leather armor | torso | 8 / 9 / 10 / 9 / 3 | magic −2 | leather | 4.5 | 4 leather + 2 fiber → workbench, leatherworker, 10; `wear.tier 3` |
| mail_iron | Iron mail | torso | 18 / 22 / 12 / 18 / −2 | ranged −4, magic −12 | iron | 25 | 5 bar_iron + 1 leather → smithy, armorsmith, 12; `wear.tier 3` |
| helmet_leather | Leather cap | head | 2 / 3 / 3 / 2 / 1 | – | leather | 0.5 | 2 leather → workbench, leatherworker, 6 |
| helmet_iron | Iron helmet | head | 6 / 7 / 5 / 6 / −1 | ranged −1, magic −4 | iron | 1.4 | 2 bar_iron + 1 leather → smithy, armorsmith, 10 |
| leggings_leather | Leather leggings | legs | 3 / 4 / 4 / 4 / 1 | – | leather | 0.9 | 2 leather + 1 fiber → workbench, leatherworker, 6 |
| greaves_iron | Iron greaves | legs | 9 / 10 / 7 / 9 / −2 | ranged −2, magic −6 | iron | 2.7 | 2 bar_iron + 1 leather → smithy, armorsmith, 10 |
| shield_wood | Wooden shield | shield | 4 / 5 / 3 / 5 / 0 | magic −2 | wood | 2.7 | 2 log + 1 leather → workbench, carpenter, 8 |
| shield_iron | Iron shield | shield | 10 / 12 / 8 / 11 / −2 | ranged −2, magic −6 | iron | 5.0 | 2 bar_iron + 1 log → smithy, armorsmith, 10 |

Full iron (mail, helmet, greaves, shield) adds +43 stab, +51 slash, +32 crush and +44 ranged defence. `wear.tier 3` on the two torso armors switches a human colonist to the tier-3 ("tailored") walk sheet until the AR-600 armor layer exists.

### 2.3 Ammunition and intermediates
| id | Name | Tags | Stack | Material | kg | Block | Recipe |
|---|---|---|---|---|---|---|---|
| arrows | Arrows | ammo, arrow | 24 | stone (default), bone or iron by recipe | 0.05 | `ammo: { for: ["bow_short", "bow_long"], rangedStrength: 7, byMaterial: { stone: 7, bone: 8, iron: 12 } }` (2026-09-19: the ranged strength the arrow adds to the shot's max hit; `byMaterial` once item records carry a material), quality | `arrows_stone`: 1 log + 3 feathers + 1 stone → 12 (fletcher, fletcher, 8) · `arrows_bone`: … + 1 bone → 12 (8) · `arrows_iron`: … + 1 bar_iron → 12 (10) |
| (stone) | Stone (existing) | – | 10 | – | – | the sling's ammunition (`sling.weapon.ranged.ammo = "stone"`, ranged strength 4 from the sling's `ammoStrength`; no `ammo` block, the existing entry is untouched) | – |
| charcoal | Charcoal | fuel, material, charcoal | 10 | – | 0.5 | – | 3 firewood → 2 (furnace, furnace_operator, 8) |
| bar_iron | Iron bar (existing) | metal, material | 10 | – | – | – | 2 ore_iron + 1 charcoal → 1 (furnace, furnace_operator, 10) |
| bar_copper | Copper bar | metal, material | 10 | copper | 2.0 | – | 2 ore_copper + 1 charcoal → 1 (furnace, furnace_operator, 8) |
| leather | Leather | leather, material | 5 | leather | 1.0 | – | 1 hide → 1 (tannery, tanner, 6; a knife speeds it) |
| feathers | Feathers | feathers, material | 20 | – | 0.1 | – | wildlife yields: fowl 4, songbird 2, hawk 3 (plus their meat) |

A quiver is a stack of arrows in the inventory (§6.5). Bars, charcoal and leather have no quality (`quality: false` on their recipes).

## 3. Quality (rolled at craft)
Revised 2026-09-19 (V63 skills, V64 combat):
- **Roll:** `UF.Skills.qualityRoll(crafter, recipeId)` → 0-5 from the crafter's skill level for the recipe (level 1 gives 0-2, 50 gives 1-4, 99 gives 3-5; seeded from the world seed, the unit and a saved counter; `docs/systems/UF_Skills.md` → Effects). The old d20 + ability roll and `combat.quality.thresholds` are gone.
- **Names** (`combat.quality.names`): crude, rough, plain, sound, fine, flawless. Shown on the character sheet and the look label as "a fine iron dagger".
- **Effects** (`combat.quality.bonus` / `.value`, indexed 0-5): `bonus` `[0.8, 0.9, 1, 1.1, 1.2, 1.3]` multiplies every bonus of the item (UF_Combat reads `record.quality`; arrows' ranged strength too); `value` `[0.5, 0.8, 1, 1.2, 1.5, 2]` × the material's value, for trade later.
- **Storage:** the item record gains `material` (id) and `quality` (0–5) when the recipe has `quality: true`; `material` comes from `recipe.material`, else the type's `material`. One roll per craft job, applied to the whole output (a batch of 12 arrows shares one quality).
- **Stacks:** `UF.Items.drop/putDown/give` merge only items whose `type`, `material` and `quality` all match (records without them merge as today). This is the one UF_Items behaviour change that touches existing items (they have neither field, so nothing changes for them).

## 4. The chain from the ground (`catalog.recipes.list`)
Recipe fields: `id, name, inputs, outputs, work (beats), at (object tag), labor, skill, material?, quality, tool?`. `at` is the tag of the workshop the crafter stands beside (UF_Jobs' craft handler already does this: nearest object with that tag within 40 cells, stand on a free neighbour, "needs a <tag>" when none). `labor` is the labor that may take the job (§7); `skill` names the trade: since 2026-09-19 UF_Skills (V63) gives the crafter experience for the job and rolls the quality from their level (§3).

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
`unit.data.equipment = { head, weapon, shield, torso, legs }` (item ids or null). What each accepts: `head` ← `armor.slot === "head"`; `torso` ← `armor.slot === "torso"` (armor and clothing: every clothing item has an `armor` block with its slot and defence bonuses); `legs` ← `armor.slot === "legs"`; `weapon` ← anything with `weapon` or `tool`; `shield` ← `shield`. **Aliases** (`combat.aliases`): `equipment.tool` reads as `equipment.weapon`, `equipment.clothes` as `equipment.torso`, until every reader is moved; `UF.Items.equip` writes the new keys and mirrors them to the old ones for one build, so UF_Jobs' `toolMultiplier` (reads `equipment.tool`) and UF_Colonists (`equippedItem(u, "clothes")`, `tier`) keep working. `wear.tier` still sets `data.tier` and the walk sheet (UF_Colonists.setTier).

### 6.2 Hands
- `weapon.hands === 2` (both bows, the iron axe): equipping it unequips the shield; equipping a shield while a two-handed weapon is held fails ("needs both hands"). The d20 `versatile` dice and `thrown` attacks are gone (2026-09-19).

### 6.3 Accuracy (revised 2026-09-19, OSRS model; UF_Combat is the code, `docs/systems/UF_Combat.md` the full rules)
- **Effective level** = level + style bonus + 8. The level is attack for stab, slash and crush, ranged for ranged, magic for magic. Levels come from UF_Skills (V63) for people and from `wildlife.species[].combat` for creatures.
- **Style bonus:** accurate +3, controlled +1; aggressive, defensive, rapid and longrange add nothing to accuracy.
- **A** (max attack roll) = effective level × (the attack bonus of everything worn and held for that attack type + 64).
- **D** (max defence roll) = effective defence × (the defender's defence bonus for that type + 64). The effective defence counts the defender's style: defensive +3, controlled +1, longrange +3. Against magic, a person's effective defence blends 0.7 × magic and 0.3 × defence.
- **The roll:** seeded integers 0..A and 0..D; a hit when the attack roll is higher. So hit chance = `1 − (D + 2) / (2(A + 1))` when A > D, else `A / (2(D + 1))`.
- There are no critical hits.

### 6.4 Damage (revised 2026-09-19)
- **Max hit** = `floor(0.5 + effective strength × (strength bonus + 64) / 640)`. Effective strength = strength + (aggressive 3, controlled 1) + 8. Ranged uses the ranged level and the ranged strength (arrows' `ammo.rangedStrength`, the sling's `ammoStrength`). Creatures add `maxHitBonus`.
- A hit deals a seeded uniform 0..max hit, capped at the target's hitpoints; a miss deals 0.
- Hitpoints are a skill (the hitpoints level is the maximum).
- **Attack speed:** each weapon's `speed` in ticks (unarmed 4); rapid is 1 tick faster.
- **Armour** is defence bonuses (§2.2). There is no AC, dexterity cap, strength requirement or soak.
- DF-style injuries by body part are an open question (VISION V64, Q12).

### 6.5 Ranged attacks (revised 2026-09-19)
- **Range** in cells (D3): `ranged.range`, +2 in the longrange style; distance = Chebyshev cells. Out of range, the shooter walks closer.
- **Ammunition:** the weapon's `ranged.ammo` type must be in the shooter's inventory (any stack; the quiver is a stack). Each shot uses 1 (`UF.Items.consume`). Out of ammunition → the unit fights with its fists (the `combat.equipment` check covers it); switching to a carried melee weapon comes with the phase-2 equipment code.
- **Not built yet:** line of sight (trees and walls do not block shots yet), recovering arrows from the ground, thrown weapons.

### 6.6 What the character sheet shows (V49, later)
- Each slot's item with name, material and quality ("a fine iron dagger").
- The unit's fighting level, combat levels, hitpoints, style, attack type, weapon speed, max hit and range.
- The bonuses of what it wears and holds, and the ammunition count.

All of it is in `UF.Combat.describe(unit)` (2026-09-19); drawing it is the sheet's build.

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
| soldier | attack, strength, defence, ranged (V63/V64: the combat style decides which) | (no recipe; jobs `attack`, `guard`; first to be armed) |

`colony.skills` gained `smelting, smithing, bowyery, fletching, tanning, leatherwork, carpentry, fighting, archery` (appended, so existing seeded skills keep their values: `skillsFor` is index-based). Since 2026-09-19 the skills are UF_Skills' (VISION V63, levels 1-99): the old names map onto the new skills there (fighting → attack, strength and defence; archery → ranged; `docs/systems/UF_Skills.md`).

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
`{ "id": "arm", "arm": [tags], "share": 0.5, "first": [labor ids] }`. **Done** when at least `ceil(share × adults)` adult colonists (stage `adult`/`elder`, or everyone while stages don't exist) are armed: for each tag in `arm`, the matching slot holds an item carrying that tag (`weapon` → `equipment.weapon` item has tag `weapon`; `armor` → `torso`; `shield` → `shield`). Stone tools carry `tool`, not `weapon`, so knives and axes do not count. **Behaviour** when undone: an unarmed colonist whose labors include one in `first` (else any unarmed colonist, soldiers first, then the highest fighting level, `UF.Combat.combatLevel`) takes the best free item: `culture.arms.prefer` order, then the highest quality; sources in order: its own pack, the weapon rack / stockpiles storing `weapon`, the ground within the site (radius + 2), each an `equip` job (rack and ground: `fetch` then `equip`). Scavenging (`arms.scavenge`) adds a roll before crafting: with that chance the colonist looks for a dropped weapon within 30 cells before the plan's craft steps are considered. Nothing here is per-creature behaviour; the faction menu (V49) later toggles `arm` on and off.

### 8.3 Input resolution (phase 2, UF_Colonists `craftStepJob`)
When a craft step's input is missing and no ground item, object action or prey yields it, but a recipe outputs it, the colonist takes that recipe first (its inputs resolved the same way, depth ≤ 3, cycles cut). This is what lets `blades` run without an explicit `bars` step and what makes off-screen societies (V51) produce arms with the same plan. The explicit intermediate steps (D11) stay.

### 8.4 Hauling to the rack
Crafted weapons, armor, shields and ammunition that a colonist does not equip are hauled to the nearest stockpile whose `stores` include their tag (the `rack` step's `weapon_rack`), the way food goes to the larder (`stock` steps). UF_Colonists registers stockpiles from any built object with the `stockpile` tag, not only `stockpile` itself (today: `if (step.build !== "stockpile") continue;` at UF_Colonists.js ~346).

## 9. Phase-2 code checklist (build from this, add these checks)
### 9.1 UF_Items (`docs/systems/UF_Items.md`)
- `slotFor(itemType) → "head" | "weapon" | "shield" | "torso" | "legs" | null` by §6.1.
- `equip(unitId, itemId) → { ok, reason? }`: item carried; slot from `slotFor`; two-hands rule (§6.2); writes `equipment[slot]`, mirrors `tool`/`clothes` aliases; `wear.tier` → `data.tier` + `UF.Colonists.setTier`; emits `items:equipped(unit, item, slot)`. `unequip(unitId, slot)`; `equipped(unitId) → { slot: item | null }`.
- (2026-09-19: no `acOf`. The fighting numbers of what a unit wears and holds are `UF.Combat.bonusesOf(unit)` and `UF.Combat.describe(unit)`, which already read the five slots and the `tool`/`clothes` aliases.)
- Item records: `material?`, `quality?`; `create/give` accept them; `drop/putDown/give` merge only on equal type + material + quality (§3); `describe` says "12 × fine iron-tipped arrows" (quality name + material adjective + name; plain quality omits the name).
- Migration: `equipment: { tool, clothes }` on old saves → `{ head: null, weapon: tool, shield: null, torso: clothes, legs: null, tool, clothes }` on load (`DataManager.extractSaveContents` alias, before UF_Jobs reads it).
- Checks to add to suite `items`: `slot_for` (each of 5 slots + a null for berries), `equip_two_hands` (a long bow refuses a shield and drops it when equipped after), `quality_stacks` (12 plain + 12 fine arrows stay two stacks; 12 + 12 plain merge to 24), `alias_mirror` (`equipment.tool === equipment.weapon` after `equip`), `save_migrates_equipment`.

### 9.2 UF_Combat (rewritten 2026-09-19 to the OSRS model; `docs/systems/UF_Combat.md`)
- **Done 2026-09-19:** the attack itself (accuracy and defence rolls from levels, styles and every slot's bonuses; max hit; attack speed in ticks; quality multiplies bonuses once item records carry it); ranged attacks by range with ammunition used per shot and a fall-back to fists; U7 attack modes with OSRS styles; retaliation; `describe(unit)` for the sheet (§6.6); checks `hit_chance`, `max_hit`, `attack_speed`, `styles`, `equipment` (the item tiers and the bow's arrows), `creatures` and ten more.
- **Still to build:** line of sight (`UF.Combat.lineOfSight(area, x0, y0, x1, y1) → bool`: Bresenham over cells whose objects are impassable and not `under`; trees and walls block, grass, beds and stockpiles do not); switching to a carried melee weapon when out of ammunition (with UF_Items' `equip`); recovering arrows (a miss leaves the arrow within 1 cell of the target, seeded); thrown weapons (a throwing rule first). Checks to add then: `los_blocked_by_tree` (an oak on the line → no shot; tall grass → shot), `out_of_ammo_switches` (0 arrows and a sword in the pack → the sword is equipped and swung), `miss_drops_arrow`.

### 9.3 UF_Jobs (small)
- `craft.apply`: when the recipe has `quality: true`, roll §3 once (seeded from `seed, unit.id, job.id`) and give the outputs with `material` (recipe's, else the type's) and `quality`; when `quality: false` give plain records. `equip.apply` → `UF.Items.equip` (the old direct write goes). `describe` for equip: "Taking up a fine iron dagger".
- Labor gating in `take` for chain recipes (§7) once `data.labors` exists; nothing else, since `at`/`labor` are carried by the recipe.
- Checks to add to suite `jobs`: `craft_rolls_quality` (a `dagger_iron` craft yields a record with `material "iron"` and `quality` 0–5; the same seed gives the same quality twice), `craft_at_smithy` (a smithy object 3 cells away: the job stands beside it and "needs a smithy" without it), `equip_uses_items_equip` (equipping a shield fills `equipment.shield`).

### 9.4 UF_Colonists (plan steps only)
- The `arm` step (§8.2), input resolution (§8.3), hauling to any `stockpile`-tagged object (§8.4), labor weights (§7). No new per-unit behaviour outside the plan and the labors.
- Checks to add to suite `colonists`: `arm_step_counts_weapons` (two colonists, one holding a club in `weapon`, one a stone axe: `planStatus` says 1/N), `arm_equips_from_rack` (a sword on the weapon rack cell and an unarmed colonist → an `equip` job finishes with the sword in `equipment.weapon`), `craft_resolves_inputs` (a `blades` step with no bars but ore and charcoal on the ground → a `bar_iron` craft precedes the sword), `plan_length_matches_template` (already `plan_reads_the_site`; the template now has 27 steps in the default plan).

### 9.5 Tools and docs
- `tools/check_catalog.js` stays green and is added to `tools/run_all_suites.js`'s pre-flight. On 2026-09-19 it moved to the OSRS-model blocks: `weapon_dice` became `weapon_blocks`, `armor_slots` and `combat_rules` check bonuses instead of AC, and `creature_combat` is new, for 19 checks. It reports one problem not caused by combat: `workshops_one_cell`, because `farm_plot` is passable. That problem also makes most self-tests fail (each self-test expects only its own check to fail); with `farm_plot` fixed in a scratch copy, 52 of the 53 self-tests pass.
- `docs/systems/UF_Items.md`, `UF_Jobs.md`, `UF_Colonists.md`, `UF_Combat.md` gain the API lines above; `docs/STATUS.md` records the measured results; `docs/CREDITS.md` is shown in the game's credits before release.

## 10. Known limits (phase 1, and after the 2026-09-19 conversion)
- The weapon, armour and creature numbers are a first balance pass (the `combat.equipment` and `combat.creatures` checks print what they do); nothing between level 1 and level 40 has been tuned against play.
- No code changed: nothing equips into five slots, shoots, or rolls quality yet. Today's engine already builds the six workshops and runs every recipe here through the generic `build` and `craft` handlers (the plan steps will make colonists do so once the earlier steps are done); the `arm` step is inert ("nothing to do"); `work` on the new entries is in beats while the engine still counts ticks (D9).
- The workshop and item art is stock tiles and tinted stand-ins (AR-510, AR-511); the held-weapon and shield layers of AR-600 are requested as AR-512.
- No warhammer, crossbow, bolts, bronze or per-item durability; `density` and `hardness` are unused numbers until then.
- Not run in Playtest: this phase changes data and docs only; the checker, the inventory tool and a JSON round-trip are the evidence (see the report).
