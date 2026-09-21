# SRD 5.1 Integration Specification — Project DEUS

## 1. Official Source & Licensing
- **Source Document**: System Reference Document 5.1 (`SRD_CC_v5.1.pdf`), provided officially by Wizards of the Coast LLC.
- **License**: Creative Commons Attribution 4.0 International License ("CC-BY-4.0").
- **Attribution Notice**: Embedded in `docs/LEGAL.md`, `docs/CREDITS.md`, and all datasets in `game/data/srd5_1/`:
  > "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode."
- **License Boundary**: Non-SRD fifth-edition content, D&D Beyond expansions, and Product Identity (e.g. mind flayers, beholders, displacer beasts) are strictly banned from Project DEUS.

---

## 2. Core Architectural Philosophy
```text
DEUS LIVING WORLD
      ↓
CREATURE INTENDS ACTION
      ↓
ROUTINE OR UNCERTAIN?
      ↓
├─ ROUTINE: DEUS CAPABILITY RESOLVER (UF_Proficiency.js)
│    └─ Continuous work rate, zero d20 spam, predictable quality & yield
│
└─ UNCERTAIN / COMBAT: SRD 5.1 D20 RESOLVER (UF_Rules.js)
     └─ d20 + ability mod + proficiency + circumstance vs DC / AC
```
SRD 5.1 provides the **common mechanical rules language**. Project DEUS provides the **autonomous physical simulation**.

---

## 3. Data Directory Organization (`game/data/srd5_1/`)

| File | Count | Source Pages | Purpose |
|---|---|---|---|
| `abilities.json` | 6 | 76–77 | Six core stats, modifier formula $\lfloor(score - 10)/2\rfloor$, 6-tier DC ladder |
| `skills.json` | 18 | 77–79 | 18 SRD skills with default abilities, decoupled for contextual ability routing |
| `tools.json` | 36 | 68–71 | 17 artisan's tools, 6 specialist kits, 2 gaming sets, 10 musical instruments, vehicles |
| `weapons.json` | 37 | 66 | 10 simple melee, 4 simple ranged, 18 martial melee, 5 martial ranged |
| `weapon_properties.json` | 11 | 64–65 | 11 weapon properties (ammunition, finesse, reach, versatile, heavy, etc.) |
| `armor.json` | 13 | 64 | 3 light armor, 5 medium armor, 4 heavy armor, 1 shield |
| `damage_types.json` | 13 | 97–98 | Acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder |
| `conditions.json` | 15 | 358–360 | 15 conditions with machine-readable rule flags and 6-level exhaustion ladder |
| `combat_actions.json` | 10 | 92–94 | Attack, cast a spell, dash, disengage, dodge, help, hide, ready, search, use an object |
| `spells.json` | 319 | 114–194 | Complete spell database parsed with level, school, ritual, components, range, duration, concentration |
| `rules_reference.json` | — | 62–104 | Creature sizes, cover (+2/+5/total), jumping, falling, suffocation, resting, object AC/HP |
| `classes_reference.json` | 12 | 8–55 | 12 reference classes with hit dice, save proficiencies, and standard proficiency ladder |
| `species_reference.json` | 9+4 | 3–7 | 9 base races and 4 subraces with sizes, base speeds, and darkvision distances |
| `monsters_reference.json` | 313 | 261–403 | 199 main monsters + 114 appendix beasts and creatures |
| `magic_items_reference.json`| 243 | 206–253 | 243 magic items with categories, rarities, and attunement requirements |

---

## 4. Systems Adopted, Adapted, and Rejected

### Adopted Exactly (SRD_EXACT)
- **Six Abilities & Formula**: STR, DEX, CON, INT, WIS, CHA with $\lfloor(score - 10)/2\rfloor$.
- **Standard DC Ladder**: Very Easy (5), Easy (10), Medium (15), Hard (20), Very Hard (25), Nearly Impossible (30).
- **Advantage / Disadvantage**: Roll 2 d20s and take higher/lower; multiple instances do not stack; mutual presence cancels to a single roll.
- **Passive Checks**: $10 + \text{mod} + \text{prof} \pm 5$ for advantage/disadvantage.
- **Saving Throws**: Six ability saves with automatic failure conditions (e.g. Paralyzed on STR/DEX saves).
- **Armor Class Foundations**: Unarmored $10 + \text{Dex}$, Light $\text{Base} + \text{Dex}$, Medium $\text{Base} + \min(\text{Dex}, 2)$, Heavy $\text{Base}$, Shield $+2$.
- **Critical Hits**: Doubled damage dice on natural 20 or hit within 5 ft against paralyzed/unconscious targets.
- **Death Saving Throws**: 3 successes to stabilize, 3 failures for death, natural 1 counts as 2 failures, natural 20 revives at 1 HP.

### Adapted for DEUS (SRD_ADAPTED)
- **Same-Z Combat Invariant**: All ordinary melee, ranged, and spell attacks require `UF.Space.sameZ(attacker, defender)`.
- **Discrete Multi-Domain Time**: 1 tactical combat round $\approx 6$ Action Seconds. Resting and combat durations use domain-tagged Action timers, immune to accelerated historical clock compression.
- **Routine Civilian Labor**: Continuous work rates ($1.0 + \text{cap} \times 0.15$) determined by capability; d20 rolls strictly reserved for uncertain outcomes.
- **Material Layering**: SRD equipment definitions supply form and combat rules; DEUS materials (bronze, iron, steel, oak, granite) and craftsmanship supply physical item weight, durability, condition, and market value.
- **Physical Inventory**: Carrying capacity ($\text{STR} \times 15\text{ lbs}$) informs creature hauling, but DEUS physical container slots, hauling reservations, and ground cell stacking remain authoritative.

### Rejected / Excluded (NOT APPROPRIATE)
- Abstract party/faction global inventory (items must exist physically).
- Universal character levels for civilian professions (colonists gain learned competency ranks and emergent titles).
- Tabletop market prices as economic simulation (DEUS economy emerges from local resource availability and labor).
- Non-SRD 5e content and Wizards Product Identity.

---

## 5. Core Rules Resolver Architecture (`UF_Rules.js`)
The centralized service `UF.Rules` exposes:
- `UF.Rules.modifier(score)`
- `UF.Rules.dc(tierKey)`
- `UF.Rules.check(unit, abilityKey, dc, opts)`
- `UF.Rules.passiveCheck(unit, abilityKey, profId, opts)`
- `UF.Rules.save(unit, abilityKey, dc, opts)`
- `UF.Rules.contest(unitA, abilityA, unitB, abilityB, opts)`
- `UF.Rules.armorClass(unit)`
- `UF.Rules.attack(attacker, defender, weaponKey, opts)`
- `UF.Rules.damage(attacker, defender, attackResult, opts)`
- `UF.Rules.deathSave(unit, opts)`
- `UF.Rules.jumping(unit, type, running)`
- `UF.Rules.fallingDamage(distanceFeet)`
