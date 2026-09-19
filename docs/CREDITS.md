# CREDITS: third-party material and the attribution the game must show

Written 2026-09-18 (Claude Code). Everything listed here must appear in the game's credits screen before any release. Until that screen exists, this file is the record. Owner: Claude Code (engine). Anything new that comes from outside the project is added here with its licence and the exact attribution text the licence requires.

## System Reference Document 5.1 (what is left of the d20 rules)

**Updated 2026-09-19.** The user dropped the d20 combat rules and adopted OSRS-style combat (VISION V64; V47 retired, V53 superseded). The combat rules, weapon and armour data now follow that model with the project's own numbers (`docs/design/COMBAT_CHAINS.md`, `docs/systems/UF_Combat.md`). SRD material is gone from all of these:
- the catalog's `combat`, `items.types` and `wildlife.species` data;
- `UF_Combat.js`;
- `docs/design/COMBAT_CHAINS.md`.

**What still comes from the SRD 5.1** (checked 2026-09-19 by grep of `game/js/plugins`, `game/data/UF_WorldCatalog.json` and `docs/`):
- **Ability scores and their modifiers:**
  - UF_History rolls six ability scores per founder, 4d6 dropping the lowest (`rollStats`, `data.stats`).
  - The catalog's `people[species].stats` shifts those scores per species.
  - UF_Sheet shows the six scores with their modifiers.
  - 26 of the 34 catalog recipes (`recipes.list[].ability`: str, dex, con) name the ability whose modifier the old d20 quality roll added. Nothing reads them since the quality roll became `UF.Skills.qualityRoll` (COMBAT_CHAINS §3), and they can be deleted with a catalog edit of `recipes`.

This is the V53 system, superseded on 2026-09-19 by rolled skill levels (V63). The runs rewriting UF_History and UF_Sheet (2026-09-19) are removing it. **When no ability scores remain in the code, the catalog or the character sheet, delete this whole section.** Nothing else from the SRD is used.

As long as that material ships, the licence (Creative Commons Attribution 4.0 International) requires the following attribution, shown exactly as written:

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

Removed on 2026-09-19, so no longer credited:
- the "Weapons" table (damage dice, properties, ranges);
- the "Armor" table (armor class, Dexterity caps, Strength requirement, the shield's +2);
- attack rolls, proficiency, critical hits, damage rolls and unarmed strikes;
- advantage and disadvantage, and saving throws.

Item names in the game are generic ("Short sword", "Iron mail"); no D&D product-identity names appear (AGENTS.md → Reference vs. shipped content).

## Combat model (not a licence; for the record)
The combat mechanics follow Old School RuneScape's published formulas at the level of game rules:
- effective levels, accuracy and defence rolls, the hit-chance formula and the max-hit formula;
- attack speeds in ticks, combat styles, and the combat-level formula.

The user decided this on 2026-09-19 (VISION V64). Game mechanics are not copied content. No names, text, item data, art or numbers tables from that game are used, and every weapon, armour and creature number in the catalog is the project's own. Nothing needs to be credited, but the rule stands: no names or terms from that game in anything the player reads.

## Not shipped (for completeness)
- Ultima VII shapes are visual references and development stand-ins only (`U7_`-prefixed files, `docs/STATUS.md` → Stand-ins). They are replaced by original art before any release and are not credited here because nothing derived from them ships (AGENTS.md rule 8).
- Dwarf Fortress is a mechanics reference only (`docs/design/DF_MECHANICS.md`); none of its text, data or raws is used.
