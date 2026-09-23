# SRD 5.1 catalogue crosswalk: `game/data/srd5_1/` against `game/data/srd51/`

**Written by:** Claude Code (Fable), 2026-09-22, for the project coordinator. **Task:** record-level crosswalk between the legacy SRD folder (`game/data/srd5_1/`, 15 files, committed 2026-09-21 in `bd59943`) and the dormant content library (`game/data/srd51/`, catalogue manifest plus six category files, first built 2026-09-22 in `e70783e`; contract `docs/SRD5_1_COVERAGE_MANIFEST.md`).
**Generator:** `node tools/srd_extract/crosswalk_srd5_1.js` writes `tools/srd_extract/reports/crosswalk_srd5_1.json` (1,080 legacy records, one object each, with every field-level difference; per-file and per-class counts; the reconciliations of section 3; the appendices of sections 7 and 8). The script is deterministic: two runs produced the same SHA-256 (`590b1d32…`), and the report records the SHA-256 of all 22 input files. It reads both folders and writes nothing else. Neither folder was edited; no id was renamed or aliased in place.

**Result in one paragraph.** All 1,080 legacy records were examined; 1,067 map to a catalogue entry, 13 do not (11 lines of `magic_items_reference.json` that are not item names, and the two DEUS engine invariants of `rules_reference.json`, which have no SRD counterpart by design). Nine records state an SRD fact the page contradicts: eight spells whose header lines straddle a page break (components and concentration recorded as `false`) and the object hit-point table (two cells). The catalogue holds 320 entries with no legacy counterpart, all of them content the legacy folder never covered (adventuring gear, mounts, vehicles, trade goods, subclasses, the background, the feat, spell lists, hazards, the rule chapters, two appendices, four creatures and eight magic items). 54 legacy page citations name the wrong page. Nothing at runtime reads either folder.

## 1. Per-file summary

| Legacy file | Records | Matched | Match method | Class 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| `abilities.json` (6 abilities + `modifierFormula` + `standardDCLadder`) | 8 | 8 | manual table 8 | 2 | 0 | 0 | 6 | 0 | 0 |
| `armor.json` | 13 | 13 | exact name 13 | 0 | 13 | 0 | 0 | 0 | 0 |
| `classes_reference.json` (12 classes + `standardProficiencyBonusByLevel`) | 13 | 13 | exact name 12, manual table 1 | 0 | 1 | 12 | 0 | 0 | 0 |
| `combat_actions.json` | 10 | 10 | manual table 10 | 0 | 0 | 0 | 10 | 0 | 0 |
| `conditions.json` | 15 | 15 | exact name 15 | 0 | 1 | 14 | 0 | 0 | 0 |
| `damage_types.json` | 13 | 13 | manual table 13 | 0 | 0 | 0 | 13 | 0 | 0 |
| `magic_items_reference.json` | 243 | 232 | exact name 232, none 11 | 0 | 232 | 0 | 0 | 0 | 11 |
| `monsters_reference.json` | 313 | 313 | exact name 310, slug 3 | 0 | 313 | 0 | 0 | 0 | 0 |
| `rules_reference.json` (18 sub-records, section 3.6) | 18 | 16 | manual table 16, none 2 | 1 | 1 | 3 | 12 | 1 | 0 |
| `skills.json` | 18 | 18 | manual table 18 | 0 | 0 | 0 | 18 | 0 | 0 |
| `species_reference.json` (9 races + 4 nested subraces) | 13 | 13 | exact name 12, alias 1 | 0 | 13 | 0 | 0 | 0 | 0 |
| `spells.json` | 319 | 319 | exact name 319 | 0 | 0 | 311 | 0 | 8 | 0 |
| `tools.json` | 36 | 36 | exact name 36 | 0 | 29 | 7 | 0 | 0 | 0 |
| `weapon_properties.json` | 11 | 11 | manual table 11 | 0 | 0 | 0 | 11 | 0 | 0 |
| `weapons.json` | 37 | 37 | exact name 37 | 0 | 0 | 37 | 0 | 0 | 0 |
| **Total** | **1,080** | **1,067** | exact 986, slug 3, alias 1, manual 77, none 13 | **3** | **603** | **384** | **70** | **9** | **11** |

Class labels: 1 equivalent; 2 more complete in the new catalogue; 3 contains DEUS-specific fields or overrides; 4 split or merged representation; 5 conflicting; 6 missing or unresolved.

If the legacy `id` field itself is counted as a DEUS-specific field (the literal reading of the class 3 definition; see section 2.3), the totals become 1: 3, 2: 547, 3: 440, 4: 70, 5: 9, 6: 11 (`counts.byClassificationIfKeyIsDeusField` in the JSON). The 56 records that move are the 13 armors, the 13 races and subraces, 29 tools and the Exhaustion condition.

## 2. Classification rules applied

### 2.1 Matching
Each legacy record was matched to at most one catalogue entry, by the first method that succeeded, restricted to the catalogue kind that the legacy file corresponds to (`monsters_reference` to `creature`, `magic_items_reference` to `magic-item`, `spells` to `spell`, `weapons`/`armor`/`tools` to `weapon`/`armor`/`tool`, `classes_reference` to `class`, `species_reference` to `race` and its nested subraces to `subrace`, `conditions` to `condition`):
- **exact name**: `toPlain(name)` equal after case and whitespace folding (curly apostrophes and dashes fold to ASCII; hyphen runs are kept).
- **slug**: `stableId(kind, legacyName)` from `tools/srd_extract/lib/srd_text.js` equals the entry id. This is the id the catalogue assembler would have given the legacy name; it absorbs the legacy file's hyphen artifacts (`Half---Red Dragon Veteran` becomes `srd:creature:half-red-dragon-veteran`).
- **alias**: one entry, `Lightfoot Halfling` (legacy subrace name) to `srd:subrace:lightfoot` (the printed heading on page 5 is "Lightfoot"). The table is `ALIASES` in the script.
- **manual table**: for legacy files whose records are digests of a rule chapter rather than named SRD records (abilities, skills, combat actions, damage types, weapon properties, the sub-objects of `rules_reference.json`, the two ladders). Each mapping is in section 3.6; the script verifies the legacy facts against the matched entry's text (heading present, skill listed under the ability, bonus values, formulas, table rows).
- **none**: no catalogue entry has the name. Unmatched records are class 6, except the two DEUS-only invariants (section 2.3).

Matches were computed, never assumed: every `matchedNewId` in the JSON comes from one of the four methods above.

### 2.2 Comparison
For every matched record the script compares each legacy field with the catalogue's structured `data` or, for digests, with the entry text, and files the outcome in one of these buckets (`differences` in the JSON):
- `sameFields`: identical values.
- `representation`: same fact, different encoding. Treated as representation, not conflict: number vs printed string (hit die 12 vs `1d12`; `2½ by 2½ ft.` vs 2.5), ability ids vs names (`str` vs Strength), cost strings vs `{amount, unit}`, `"disadvantage"` vs `true`, `0` weight where the table prints a blank (Sling, Dice set, Playing card set, Vehicles), `"0"`/`"none"` damage where the table prints a dash (Net), the legacy hyphen artifact `----foot` vs `-foot`, capitalisation, a legacy value that is a truncated prefix of the printed text (four reaction casting times, 30 magic item rarity lines), the shield's `baseAC: 2, isBonusAC: true` vs `{base: 0, bonus: 2}`, `darkvisionFeet: 0` for a race without the trait.
- `legacyMissingValue`: the legacy field is empty or null where the page prints a value (126 spell material descriptions, 4 spell ranges, 12 spell durations). Counted towards class 2, not class 5, because no wrong fact is asserted.
- `deusFields`: fields whose values are not SRD facts: rule flags on conditions, `actionEconomyType`, `durationDomain`, `source`, `rangeFeet` (spells), `handsRequired` and melee `normalRangeFeet/longRangeFeet` (derived, not printed), `primaryAbility` (the SRD 5.1 has no Quick Build text; `grep -l "Quick Build" tools/srd_extract/cache/page_*.txt` finds nothing), `gridCells` (creature sizes), `category` on skills and on the six kits and the vehicles row of the tools table (the page has no such groups), paraphrased `description` strings (abilities, damage types, combat actions, weapon properties, cover), `abbreviation`, `historicalTimeWarning`, and the whole of `spatialInvariant` and `timeDomains`.
- `newOnly`: what the catalogue entry has and the legacy record lacks (full text, stat blocks, spell descriptions, class tables, traits, item descriptions and tables, spell-list classes).
- `conflicts`: an SRD fact stated differently on both sides, with the catalogue entry's `source.pages`. For spells the printed header lines are quoted from the entry text (`printedHeader`), and four of them were checked against the page cache directly (section 7).
- `pageCitation`: the legacy `sourcePage` against the entry's pages. A wrong page is reported (section 4) but is not a class 5 conflict, because a page number is a citation, not a rule.

### 2.3 Classification (exactly one class per record)
Precedence: **6** no match > **5** any conflict > **4** relation many-to-one or one-to-many > **3** any DEUS-specific field > **2** any `newOnly` or `legacyMissingValue` > **1**.
- A record with DEUS-specific fields and a conflict is class 5 with the fields listed (`deusFields` in appendix A), as the assignment requires; DEUS-specific fields alone are class 3.
- Class 4 outranks class 3 because the assignment's own examples of class 4 (weapon properties) also carry paraphrased descriptions; the JSON keeps `deusFields` on those records so nothing is hidden.
- **Legacy key policy.** The legacy `id` (`acid_arrow`, `alchemists_supplies`, `hill_dwarf`) is reported as the record's key (`legacyKey`), not classified as a field. Every legacy key differs from the catalogue id (snake_case vs `srd:<kind>:<slug>`), and the keys follow no single rule (`arcanist_s_magic_aura` keeps the possessive as `_s`, `alchemists_supplies` drops it), so any bridge between the two schemes has to be a table, which the JSON's `records[].legacyKey`/`matchedNewId` pairs already are. The counts under the other policy are in section 1.
- **DEUS-only records.** `rules_reference.spatialInvariant` (grid cell 5 ft, z step 5 ft, `same_z_only`) and `rules_reference.timeDomains` (20 Hz tick, 6 action seconds per round, 2 historical hours per real second) are engine invariants, not SRD facts; no catalogue entry can hold them. They are class 3 with `matchedNewId: null` and `deusOnly: true`, so that class 6 stays reserved for SRD records without a counterpart and for lines that are not records.

## 3. Count reconciliations

### 3.1 Creatures: legacy 313, catalogue 317
All 313 legacy names match a creature entry (310 exact, 3 by slug). No creature is in the legacy file and absent from the catalogue. The four the legacy file lacks:

| Catalogue id | Name | Pages | Section |
|---|---|---|---|
| `srd:creature:werebear` | Werebear | 326–327 | Monsters (A to Z), Lycanthropes |
| `srd:creature:werewolf` | Werewolf | 328–329 | Monsters (A to Z), Lycanthropes |
| `srd:creature:bandit` | Bandit | 396–397 | Appendix MM-B: Nonplayer Characters |
| `srd:creature:bandit-captain` | Bandit Captain | 397 | Appendix MM-B: Nonplayer Characters |

The legacy file has Wereboar, Wererat and Weretiger but skipped the first and last lycanthrope, and has 19 of the 21 NPCs. The manifest's "199 + 114 = 313" expectation therefore came from the legacy count, not from the pages; the catalogue's 317 is inside its tolerance of 5 (`docs/SRD5_1_COVERAGE_MANIFEST.md` section 4).

Misnamed in the legacy file (hyphen artifact of the 2026-09-21 extraction, matched by slug): `Half---Red Dragon Veteran` (Half-Red Dragon Veteran, p321), `Will---o’---Wisp` (Will-o’-Wisp, p355), `Saber---Toothed Tiger` (Saber-Toothed Tiger, p388). The same artifact sits in the size line of Assassin, Cultist, Cult Fanatic and Thug (`any non---good alignment`, pp396–402). All 313 size/type/alignment lines agree with the printed line after folding (309 identical, 4 with the artifact); all 313 legacy page numbers fall inside the entry's pages. Every legacy creature record is class 2: it holds name, size line and page, the catalogue holds the full stat block.

### 3.2 Magic items: legacy 243, catalogue 240
232 legacy records are items and match by exact name (all class 2: the legacy holds name, category and a rarity line, the catalogue the full description, structured rarity/attunement and tables; 30 legacy rarity lines are truncated prefixes of the printed line). 11 legacy lines are not item names (class 6, appendix B): `Location`, `Thunder` (twice), `Medium undead, neutral evil`, `Large beast, unaligned`, `Legendary`, `Potions of Healing`, `Speak with animals`, `Spinel`, `Portable ram`, `While holding it, you gain a +2 bonus to`. 243 − 11 = 232.

The eight real items the legacy file lacks (240 − 232):

| Catalogue id | Name | Pages | How the legacy file lost it |
|---|---|---|---|
| `srd:magic-item:amulet-of-proof-against-detection-and-location` | Amulet of Proof against Detection and Location | 207 | heading wrapped; the legacy record is named `Location` |
| `srd:magic-item:armor-of-vulnerability` | Armor of Vulnerability | 209 | heading tail `of Vulnerability` became the rarity line of the `Thunder` record |
| `srd:magic-item:potion-of-growth` | Potion of Growth | 234 | heading tail `of Growth` became the rarity line of the `Legendary` record |
| `srd:magic-item:potion-of-speed` | Potion of Speed | 235 | heading tail `of Speed` became the rarity line of the second `Thunder` record |
| `srd:magic-item:ring-of-djinni-summoning` | Ring of Djinni Summoning | 235 | heading tail became the rarity line of `Speak with animals` |
| `srd:magic-item:ring-of-shooting-stars` | Ring of Shooting Stars | 237 | heading tail became the rarity line of `Spinel` |
| `srd:magic-item:rod-of-absorption` | Rod of Absorption | 239–240 | heading tail became the rarity line of `Portable ram` |
| `srd:magic-item:stone-of-good-luck-luckstone` | Stone of Good Luck (Luckstone) | 246 | absent; no fragment either |

The assignment expected the +1/+2/+3 items to be class 4 (several legacy records to one entry). They are not: the legacy file already has one record each for `Ammunition, +1, +2, or +3`, `Armor, +1, +2, or +3`, `Shield, +1, +2, or +3`, `Wand of the War Mage, +1, +2, or +3` and `Weapon, +1, +2, or +3`, each matching one catalogue entry whose `data.rarities` structures the three rarities (Crystal Ball and Horn of Valhalla likewise). No magic item is class 4 and none conflicts.

### 3.3 Spells: legacy 319, catalogue 319 spells plus 8 spell lists
Name by name, the two sets are identical: 319 exact-name matches, no legacy spell without a catalogue entry, no catalogue spell without a legacy record (the JSON's `reconciliations.spells`). The eight `spell-list` entries (`srd:spell-list:bard-spells` … `wizard-spells`, pp105–113) have no legacy counterpart; the catalogue also writes each spell's `data.classes` from them, which no legacy record has.

Per spell the script compared level, school, ritual, casting time, range, the three component flags, material description, duration and concentration:
- 311 spells are class 3: every legacy spell carries `actionEconomyType`, `durationDomain`, `source` and the derived `rangeFeet`.
- 8 spells are class 5 (appendix A). All eight have their header block split across a page break in the source (pages 118–119, 129–130, 133–134, 135–136, 136–137, 158–159, 190–191, 191–192) and, in the same records, empty `rangeText` or `duration`, consistent with the 2026-09-21 parser not reading the lines that continue on the next page. The values it left at `false` (components, concentration) are wrong on the page.
- Legacy values missing where the page prints one: material description 126 spells (the legacy sets `material: true` but `materialDescription: null`, for example Acid Arrow), range 4 (Arcane Lock, Delayed Blast Fireball, Wall of Stone, Water Walk), duration 12 (those four plus Clone, Disintegrate, Divine Favor, Gentle Repose, Guardian of Faith, Levitate, Plane Shift, Vicious Mockery).
- Representation only: 16 ranges with the `----foot` artifact; 4 truncated reaction casting times (Counterspell, Feather Fall, Shield: `1 reaction, which you take when you`; Hellish Rebuke: `1 reaction, which you take in`).
- New only, every spell: `data.description`, `data.classes`, `text`; `data.atHigherLevels` on 92.
- All 319 legacy page numbers fall inside the entry's pages.

### 3.4 Equipment
| Kind | Legacy file | Legacy | Catalogue | Matched | Conflicts | Class |
|---|---|---:|---:|---:|---:|---|
| weapon | `weapons.json` | 37 | 37 | 37 | 0 | 3 × 37 (`handsRequired` derived on all; melee `normalRangeFeet/longRangeFeet` derived on 22; the 15 thrown/ammunition ranges agree with the property detail) |
| armor | `armor.json` | 13 | 13 | 13 | 0 | 2 × 13 (AC, Dex rule, Strength minimum, stealth, weight, cost all agree) |
| tool | `tools.json` | 36 | 36 | 36 | 0 | 2 × 29, 3 × 7 (`category: kits` on the six kits and `vehicles` on the vehicles row: the table has no such groups) |
| gear | none | 0 | 99 | – | – | no legacy counterpart |
| mount | none | 0 | 8 | – | – | no legacy counterpart |
| vehicle | none | 0 | 20 | – | – | no legacy counterpart |
| trade-good | none | 0 | 13 | – | – | no legacy counterpart |

The 11 `weapon_properties.json` records have no equipment entry of their own; they map to `srd:rule:equipment-weapon-properties` (pp64–65) and each is carried by the weapon entries' `data.properties` (`relatedNewIds` lists the carriers; Range is carried as the `range a/b` detail of the ammunition and thrown properties). All 36 tool records cite page 68; the tools table is on page 70 (section 4).

### 3.5 Character options
| Kind | Legacy | Catalogue | Matched | Notes |
|---|---:|---:|---:|---|
| class | 12 | 12 | 12 | class 3 × 12: hit die and saving throws agree (representation only); `primaryAbility` is not an SRD field |
| `standardProficiencyBonusByLevel` | 1 | – | 1 | agrees with the Character Advancement table (`srd:rule:beyond-1st-level`, p56) at all 20 levels; class 2 (the table adds experience points) |
| race | 9 | 9 | 9 | class 2 × 9: size, speed, darkvision (from the trait text), subrace lists agree |
| subrace | 4 | 4 | 4 | class 2 × 4; `Lightfoot Halfling` by alias to `Lightfoot` (p5) |
| subclass | 0 | 12 | – | no legacy counterpart |
| background | 0 | 1 | – | no legacy counterpart (Acolyte, pp60–61) |
| feat | 0 | 1 | – | no legacy counterpart (Grappler, p75) |

### 3.6 Rules: legacy digests against the catalogue's rule, table, hazard, condition and appendix entries
Legacy: conditions 15, combat actions 10, damage types 13, skills 18, abilities 6 (+2 ladders), `rules_reference` 18 sub-records, weapon properties 11, `standardProficiencyBonusByLevel` 1 (in `classes_reference.json`) = 94 records. Catalogue: rule 114, table 17, hazard 28, condition 15, appendix 2 = 176 entries.

| Legacy records | Catalogue entry holding the source text | Pages | Relation | Class | What the script verified |
|---|---|---|---|---|---|
| `abilities.json` abilities × 6 | `srd:rule:using-ability-scores` (related `…-using-each-ability`) | 76 (79–83) | many-to-one | 4 | each ability is in the six-ability list; `defaultSkills` equals the skills list on p77 for all six; five of the six `description` strings add words the page does not print (Strength's matches) |
| `abilities.json` `modifierFormula` | `srd:table:ability-scores-and-modifiers` | 76 | one-to-one | 1 | `floor((score − 10) / 2)` reproduces all 16 rows |
| `abilities.json` `standardDCLadder` | `srd:table:typical-difficulty-classes` | 77 | one-to-one | 1 | six rows equal (capitalisation differs) |
| `skills.json` × 18 | `srd:rule:using-ability-scores-ability-checks` (related `…-using-each-ability`) | 77–79 | many-to-one | 4 | every skill is listed under its `defaultAbility`; `category` is DEUS |
| `classes_reference.json` `standardProficiencyBonusByLevel` | `srd:rule:beyond-1st-level` (Character Advancement table) | 56 | one-to-one | 2 | bonus equal at all 20 levels |
| `combat_actions.json` × 10 | `srd:rule:combat-actions-in-combat` | 93–94 | many-to-one | 4 | all ten headings present; descriptions are paraphrases |
| `damage_types.json` × 13 | `srd:rule:combat-damage-and-healing` (Damage Types, p97) | 96–99 | many-to-one | 4 | all thirteen listed; descriptions are paraphrases |
| `weapon_properties.json` × 11 | `srd:rule:equipment-weapon-properties` | 64–65 | many-to-one | 4 | all eleven property paragraphs present; descriptions are paraphrases |
| `conditions.json` × 15 | `srd:condition:<name>` | 358–359 | one-to-one | 3 × 14, 2 × 1 | names match; Exhaustion `levels` equal the six rows of `srd:table:exhaustion`; the other 14 carry rule flags (read against the printed bullets by the author: none contradicts them; `affectsMovement`/`affectsActions` on Blinded are interpretations the page does not state) |
| `rules_reference.json` `spatialInvariant`, `timeDomains` | none (DEUS-only) | – | none | 3 | – |
| `rules_reference.json` `creatureSizes` × 6 | `srd:table:size-categories-combat` (related `srd:table:size-categories` p254, `srd:rule:monsters-size`) | 92 | many-to-one | 4 | `spaceFeet` equals the printed space for all six; `gridCells` is DEUS |
| `rules_reference.json` `cover` × 3 | `srd:rule:combat-cover` | 96 | many-to-one | 4 | +2 and +5 to AC and Dexterity saves as printed; total cover "can’t be targeted directly" |
| `rules_reference.json` `jumping` | `srd:rule:adventuring-movement` (Jumping subsection) | 84–85 | one-to-one | 2 | all four formulas present as printed |
| `rules_reference.json` `falling`, `suffocation`, `environmentSurvival` | `srd:rule:adventuring-the-environment` | 86–87 | many-to-one | 4 | 1d6 per 10 ft, max 20d6, lands prone; breath 1 + Con (min 30 s), Con rounds (min 1); 1 lb food, 3 + Con days (the legacy string omits the printed "minimum 1"), 1 or 2 gallons, DC 15 |
| `rules_reference.json` `resting` | `srd:rule:adventuring-resting` | 87 | one-to-one | 3 | 1 h, 8 h, one long rest per 24 h as printed; `historicalTimeWarning` is DEUS |
| `rules_reference.json` `objects.acByMaterial` | `srd:table:object-armor-class` | 203 | one-to-one | 1 | all seven AC values equal |
| `rules_reference.json` `objects.hpBySize` | `srd:table:object-hit-points` | 203 | one-to-one | 5 | two of eight cells differ (appendix A) |

Catalogue rules entries with no legacy counterpart: 104 of the 114 rules (by chapter: Equipment 23, Monsters 22, Magic Items 20, Beyond 1st Level 5, Using Ability Scores 5, Combat 5, Traps 5, Spellcasting 4, Madness 4, Adventuring 2, Diseases 2, Objects 2, Poisons 2, Races 1, Feats 1, the Conditions introduction 1); 12 of the 17 tables (Travel Pace p84; Damage Severity by Level and Trap Save DCs and Attack Bonuses p196; Short-Term, Long-Term and Indefinite Madness pp201–202; Poisons price table p204; Size Categories p254, the same facts as the p92 table the legacy sizes map to; Hit Dice by Size and Proficiency Bonus by Challenge Rating p256; Experience Points by Challenge Rating p258; Exhaustion p358, whose rows the legacy Exhaustion record carries); all 28 hazards (8 traps, 3 diseases, 3 forms of madness, 14 poisons); both appendices (Fantasy-Historical Pantheons pp360–362, The Planes of Existence pp363–365); 0 of the 15 conditions. The full list with ids and pages is `newWithoutLegacy.rules` in the JSON.

Totals across all categories: 1,005 of the 1,325 catalogue entries are named as the match of at least one legacy record; 320 are not (creatures 4, magic items 8, spell lists 8, equipment 140, character options 14, rules 146).

## 4. Page citation differences (54 legacy records)
Checked against the page cache (`tools/srd_extract/cache/page_NNN.txt`): "Actions in Combat" is the first line of page 93; Petrified through Unconscious are on page 359; the Ranger, Rogue, Sorcerer, Warlock and Wizard class features start on pages 35, 39, 42, 46 and 52; "Hill Dwarf" is the first line of page 4; Padded's table row and description are both on page 63; the tools table with "Alchemist’s supplies 50 gp 8 lb." is on page 70.

| Legacy file | Records | Legacy page | Page(s) in the catalogue and cache |
|---|---:|---|---|
| `tools.json` | 36 (all) | 68 | 70 |
| `conditions.json` | 6 (Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious) | 358 | 359 |
| `combat_actions.json` | 5 (Attack, Cast a Spell, Dash, Disengage, Dodge) | 92 | 93–94 |
| `classes_reference.json` | 5 (Ranger 34, Rogue 38, Sorcerer 41, Warlock 45, Wizard 49) | as listed | 35–37, 39–40, 42–44, 46–51, 52–55 |
| `species_reference.json` | 1 (Hill Dwarf) | 3 | 4 |
| `armor.json` | 1 (Padded) | 64 | 63 |

All 313 creature, 319 spell and 37 weapon citations agree. `magic_items_reference.json` records carry no page.

## 5. Consumers of the legacy folder
Search: `grep -rIl "srd5_1"` over the repository (all `*.js`, `*.json`, `*.md`, `*.bat`, `*.html`, `*.txt`, `*.ps1`, `*.cmd`, excluding `.git/`, `node_modules/` and the folder itself), plus the spellings `srd5.1`, `SRD5_1`, `srd51` and the fifteen file names. The lead's list (one tool, four docs) is confirmed; nothing else reads the folder.

| Consumer | What it reads |
|---|---|
| `tools/test_srd_parity.js` | All 15 files (`REQUIRED_FILES`, line 30). Asserts existence, `metadata.sourceDocument`/`license`/`attribution`, and counts: 6 abilities, 18 skills, 36 tools (17 artisan), 13 damage types, 11 properties, 37 weapons (10/4/18/5), 13 armors (3/5/4/1), 15 conditions (Exhaustion with 6 levels), 10 actions, 319 spells (unique ids, valid school/level, `durationDomain` on every spell), 12 classes, 9 species, **313 monsters, 243 magic items** (lines 160–164: the two counts sections 3.1 and 3.2 show to be wrong), and the DEUS invariants `rules_reference.spatialInvariant` (5, 5, `same_z_only`) and `timeDomains.actionSecondsPerRound` (6). Not called by `run_tests.bat` (no `srd` line in it). |
| `docs/CREDITS.md` line 7 | Names `game/data/srd5_1/` (with `game/js/plugins/UF_Rules.js` and `docs/SRD5_1_INTEGRATION.md`) as the codified rules language. |
| `docs/SRD5_1_INTEGRATION.md` sections 1 and 3 | The folder's own description and count table (it states 313 and 243). |
| `docs/SRD5_1_COVERAGE_MANIFEST.md` lines 70 and 163 | The spells count basis (319) and the two-folder decision left to the coordinator. |
| `docs/STATUS.md` line 10 and lines 979–997 | The crosswalk claim (this task) and the 2026-09-21 delivery record listing the 15 files. |

Not consumers, recorded for context: no plugin under `game/js/plugins/` and nothing in `game/js/plugins.js` names the folder; the three `DataManager._databaseFiles.push` calls in the plugins load `DEUS_WorldCatalog.json`, a template map and a `DEUS_Look` index. `tools/test_srd_rules_proof.js`, `tools/test_srd_equipment_proof.js` and `tools/test_srd_combat_proof.js` load `game/js/plugins/UF_Conditions.js`, `UF_Rules.js` and `UF_Combat.js`, not the data; `UF_Rules.js` and `UF_Conditions.js` were moved to `archive/plugins/` in commit `0544ef0` (the DEUS rename), so those suites cannot currently run, and `DEUS_Combat.js` (lines 517–522, 698–700) only checks for a `window.UF.Rules` that nothing defines. `DEUS_Dnd5e.js` lines 442–452 hardcode the nine races' ability score increases with the comment "from SRD 5.1 species reference" rather than reading the file (a duplicated fact, relevant to rule 14, not a reader).

## 6. Treatment plan for the legacy folder

### Option A: compatibility alias table only
Publish the 1,067 `legacyKey → matchedNewId` pairs (they are already in the JSON) as a small alias file and leave both folders as they are. Cost: near zero. It does not remove the second source of truth (rule 14), does not carry the DEUS-specific fields anywhere new, and leaves the nine wrong facts, the eleven non-item lines, the twelve missing records and the 54 wrong citations in a file that documents call authoritative.

### Option B: projection script
Add `tools/project_srd5_1.js` that regenerates the 15 legacy files from `game/data/srd51/` in their present shapes and keys, taking SRD facts from the catalogue and DEUS-specific fields from a hand-maintained overlay (spell routing can be derived from casting time and duration; condition flags, `primaryAbility`, skill and tool categories, `spatialInvariant`, `timeDomains`, the paraphrased descriptions cannot). Fixes the conflicts, the garbage lines and the missing records mechanically and keeps `test_srd_parity.js` alive (its 313/243 assertions must change to 317/240). Cost: the overlay is a third file to keep in step, and the project still ships two SRD folders, one generated. The dormancy contract of `srd51` (manifest section 9: entries reach gameplay only by explicit adaptation into DEUS catalogs) argues against a generated folder that looks like data the engine may load.

### Option C: staged migration (recommended)
1. Freeze `game/data/srd5_1/` (no edits; it stays until step 5) and treat `tools/srd_extract/reports/crosswalk_srd5_1.json` as the alias table for anything that still speaks legacy keys.
2. Move the DEUS-specific content into DEUS's own data, keyed by `srd:` ids: spell routing (`actionEconomyType`, `durationDomain`), condition flags, `handsRequired`, tool and skill groupings, `primaryAbility` if it is wanted at all, and the two engine invariants, which belong in an engine config rather than an SRD file. This is the `adapted` readiness path the manifest already defines (section 6), and the sole place where the 384 class 3 records carry anything worth keeping.
3. Retire `tools/test_srd_parity.js` in favour of `tools/validate_srd_catalog.js` (which already checks 317 and 240 against the manifest) plus a small parity check of the new DEUS data against the catalogue; update `docs/STATUS.md` in the same commit so its "100/100 PASS" line does not outlive the file.
4. Rewrite the four documents: `docs/CREDITS.md` line 7 and `docs/SRD5_1_INTEGRATION.md` section 3 to point at `game/data/srd51/` and the DEUS adaptation data; fold the useful parts of `SRD5_1_INTEGRATION.md` (sections 2, 4, 5 are design, not data) into `docs/systems/` or keep the file with its section 3 replaced by a pointer to this crosswalk.
5. Delete `game/data/srd5_1/` with the user's approval (it was created by a user directive on 2026-09-21; removing it is the user's call under rules 6 and 7), keeping this crosswalk and the JSON as the record of what it contained.

Why C over A and B: it ends with one SRD source (rule 14), keeps `srd51` dormant and verbatim, and puts DEUS's routing decisions with DEUS data where the engine will actually read them; nothing at runtime reads the legacy folder today, so the migration costs no engine change.

Risks of C:
- The class 3 fields encode design decisions (timing domains, condition flags, the same-Z invariant) that must be carried deliberately in step 2, not dropped; the JSON lists every one (`deusFields`).
- Any DEUS code that copied legacy values by hand may carry the nine wrong facts (eight spells' components and concentration, object hit points 5/10 instead of 4/5); `archive/plugins/DEUS_Rules.js` and `DEUS_Dnd5e.js` should be grepped for them before revival.
- `test_srd_parity.js` is cited in `STATUS.md` and `CREDITS.md`; retiring it removes checks the user was shown as passing, so the replacement check must exist first (rule 4).
- The docs to rewrite in step 4 describe the legacy folder as "authoritative"; changing that wording is a coordinator/user decision, not an engineering one.
- No id in either folder may be renamed to bridge the schemes; the catalogue ids are contractually stable (manifest section 5) and the assembler refuses duplicates. The bridge is the alias table, nothing else.

## 7. Appendix A: class 5 records (9), with page citations
Each spell record also carries the DEUS-specific fields `actionEconomyType`, `durationDomain`, `source`, `rangeFeet` (listed per the class 5 rule). "Page prints" quotes the header lines of the catalogue entry text, which is the `pdftotext` page cache; the four marked † were also read directly in `tools/srd_extract/cache/` (page 137 line 1 "Duration: Concentration, up to 1 minute"; page 134 line 1 "Range: 150 feet Components: V, S, M (a tiny ball of bat guano and sulfur) Duration: Concentration, up to 1 minute"; page 191 line 1 "Range: 120 feet Components: V, S, M (a small block of granite) Duration: Concentration, up to 10 minutes"; page 192 line 1 "Range: 30 feet Components: V, S, M (a piece of cork) Duration: 1 hour").

| # | Legacy record | Catalogue id, pages | Field | Legacy value | Page prints |
|---|---|---|---|---|---|
| 1 | `spells.json` `arcane_lock` | `srd:spell:arcane-lock`, 118–119 | components V/S/M | false / false / false | "Components: V, S, M (gold dust worth at least 25 gp, which the spell consumes)"; the record also has range "" (page: "Range: Touch") and duration "" (page: "Duration: Until dispelled") |
| 2 | `spells.json` `contagion` | `srd:spell:contagion`, 129–130 | components V/S | false / false | "Component: V, S" (the page's own typo, preserved by the catalogue) |
| 3 | `spells.json` `delayed_blast_fireball` † | `srd:spell:delayed-blast-fireball`, 133–134 | components V/S/M; concentration | false / false / false; false | "Components: V, S, M (a tiny ball of bat guano and sulfur)"; "Duration: Concentration, up to 1 minute"; range "" (page: "Range: 150 feet"), duration "" |
| 4 | `spells.json` `disintegrate` | `srd:spell:disintegrate`, 135–136 | components V/S/M | false / false / false | "Components: V, S, M (a lodestone and a pinch of dust)"; duration "" (page: "Duration: Instantaneous") |
| 5 | `spells.json` `divine_favor` † | `srd:spell:divine-favor`, 136–137 | concentration | false | "Duration: Concentration, up to 1 minute"; duration "" |
| 6 | `spells.json` `levitate` | `srd:spell:levitate`, 158–159 | components V/S/M; concentration | false / false / false; false | "Components: V, S, M (either a small leather loop or a piece of golden wire bent into a cup shape with a long shank on one end)" (page 159 line 1); "Duration: Concentration, up to 10 minutes"; duration "" |
| 7 | `spells.json` `wall_of_stone` † | `srd:spell:wall-of-stone`, 190–191 | components V/S/M; concentration | false / false / false; false | "Components: V, S, M (a small block of granite)"; "Duration: Concentration, up to 10 minutes"; range "" (page: "Range: 120 feet"), duration "" |
| 8 | `spells.json` `water_walk` † | `srd:spell:water-walk`, 191–192 | components V/S/M | false / false / false | "Components: V, S, M (a piece of cork)"; range "" (page: "Range: 30 feet"), duration "" (page: "Duration: 1 hour") |
| 9 | `rules_reference.json` `objects.hpBySize` | `srd:table:object-hit-points`, 203 | `medium.fragile`; `large.fragile` | 5; 10 | "Fragile 2 (1d4) 3 (1d6) 4 (1d8) 5 (1d10)" (page 203 reading-order line 44): Medium fragile is 4 (1d8), Large fragile is 5 (1d10); the other six cells (2/5, 3/10, 18, 27) agree |

The page decides in all nine cases: the catalogue value is the printed one.

## 8. Appendix B: class 6 records (11), all in `magic_items_reference.json`
No legacy record of any other file is unresolved. Pages are those of the catalogue entry the fragment came from.

| Index | Legacy `name` | `category` | `rarityLine` | Origin |
|---:|---|---|---|---|
| 3 | `Location` | Wondrous item | uncommon (requires attunement) | second line of the wrapped heading "Amulet of Proof against Detection and Location" (p207); the record's type and rarity are that amulet's |
| 10 | `Thunder` | Armor | of Vulnerability | last row of the Armor of Resistance damage-type table (pp208–209) read as a name; the rarity line is the tail of the heading "Armor of Vulnerability" (p209), which has no legacy record |
| 52 | `Medium undead, neutral evil` | Armor | Class 20 | size line of the Avatar of Death stat block inside Deck of Many Things (pp216–218); "Class 20" is its "Armor Class 20" line split at the word Armor |
| 73 | `Large beast, unaligned` | Armor | Class 11 | size line of the Giant Fly stat block inside Figurine of Wondrous Power (pp221–223); "Class 11" is its "Armor Class 11" line |
| 142 | `Legendary` | Potion | of Growth | last rarity cell of the Potion of Giant Strength table (p234); the rarity line is the tail of "Potion of Growth" (p234), which has no legacy record |
| 144 | `Potions of Healing` | Potion | of … Rarity HP Regained | caption and header of the Potion of Healing table (p234); the item itself is legacy index 143 |
| 150 | `Thunder` | Potion | of Speed | last row of the Potion of Resistance table (p235); the rarity line is the tail of "Potion of Speed" (p235), which has no legacy record |
| 154 | `Speak with animals` | Ring | of Djinni Summoning | last spell of the Ring of Animal Influence list (p235); the rarity line is the tail of "Ring of Djinni Summoning" (p235), which has no legacy record |
| 165 | `Spinel` | Ring | of Shooting Stars | last gem row of the Ring of Resistance table (p237); the rarity line is the tail of "Ring of Shooting Stars" (p237), which has no legacy record |
| 180 | `Portable ram` | Rod | of Absorption | last row of the Robe of Useful Items table (p239); the rarity line is the tail of "Rod of Absorption" (pp239–240), which has no legacy record |
| 201 | `While holding it, you gain a +2 bonus to` | Armor | Class, saving throws, and spell attack rolls. | a sentence of Staff of Power (pp243–244) split at "Armor Class"; the item itself is legacy index 200 |

## 9. How this was produced, and what was not done
- Commands: `node tools/srd_extract/crosswalk_srd5_1.js` (twice, same SHA-256 `590b1d3228fea369…`); `node -e` queries over the two folders and the report; `grep`/`sed` over `tools/srd_extract/cache/` for the citations in sections 4 and 7; `git log` on both folders (read-only). No git command changed state; no `npm`, no `nw.exe`, no network.
- Script output (trimmed): `legacy records: 1080 (from 15 files), new entries: 1325 / by classification: 1=3 2=603 3=384 4=70 5=9 6=11 / by match method: manual table=77, exact name=986, alias=1, slug=3, none=13 / new entries without a legacy counterpart: 320 / page citation mismatches: 54; class 5 records: 9; class 6 records: 11`.
- Not done: the condition rule flags were read against the printed bullets by the author, not checked by the script; the legacy `rangeFeet` was checked only where the range is "N feet" (all agree); the catalogue's own text was taken as the page (its stagers reconcile against the page cache, but no entry is `verified` by a person, manifest section 11), so section 7 quotes the cache for four of the nine conflicts and the catalogue text for the rest; the descriptions the legacy paraphrases (abilities, damage types, actions, properties, cover) were classified as DEUS wording, not judged for accuracy one by one.
- Files written by this task: `tools/srd_extract/crosswalk_srd5_1.js`, `tools/srd_extract/reports/crosswalk_srd5_1.json`, `docs/SRD_CATALOGUE_CROSSWALK.md`. Nothing under `game/` was touched.
