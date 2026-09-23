# SRD 5.1 Content Library: coverage manifest and catalogue contract

**Owner directive:** 2026-09-22 ("DEUS — COMPLETE SRD 5.1 CONTENT LIBRARY"). **Written by:** Claude Code (Fable), 2026-09-22.
**Source:** `SRD_CC_v5.1.pdf` at the project root, 403 pages, SHA-256 `2504d2a0abb0a4d491a939be4f17910a2dde0312570ab8d208080225ccf0a1f0`, CC-BY-4.0.
**Status of the library:** DORMANT. Nothing in `game/data/srd51/` is loaded by any plugin, referenced by `game/data/DEUS_WorldCatalog.json`, spawned into the world or written into saves. Entries become gameplay only when an explicit adaptation task copies what it needs into DEUS's own catalogs.

This document is the contract that the extraction tools, the staging files, the assembled catalogue, the validator and the developer browser all follow. `tools/validate_srd_catalog.js` reads the **Expected counts** table below and fails when the catalogue disagrees with it.

## 1. Attribution (required by CC-BY-4.0)
Every generated file carries this statement in its `metadata.license.attribution`:

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

Player-facing use of any entry also needs the statement in the game credits (`docs/CREDITS.md` already carries it).

## 2. Pipeline and files
| Step | Tool | Reads | Writes |
|---|---|---|---|
| 1. Page cache | `node tools/srd_extract/extract_pages.js` (`--check` verifies the cache is reproducible) | the PDF, `pdftotext` (xpdf 4.06, shipped with Git for Windows at `C:\Program Files\Git\mingw64\bin`) | `tools/srd_extract/cache/page_NNN.txt` (reading order), `page_NNN.layout.txt` (physical layout), `manifest.json`, `sections.json`, `headings.json` |
| 2. Staging | `node tools/srd_extract/stage_<category>.js` | the cache | `tools/srd_extract/staging/staging_<category>.json` |
| 3. Catalogue | `node tools/build_srd_catalog.js` | the staging files | `game/data/srd51/<category>.json`, `game/data/srd51/catalogue_manifest.json` |
| 4. Validation | `node tools/validate_srd_catalog.js` | the catalogue, this document, `game/img/system/IconSet.png`, `game/js/plugins.js` | exit 0 or a list of failures |
| 5. Browser | `node tools/srd_browser/serve.js` (or open `tools/srd_browser/index.html`) | the catalogue | nothing |

Shared helpers: `tools/srd_extract/lib/srd_text.js` (`normalizeText`, `toPlain`, `stripFooter`, `splitLayoutColumns`, `parseDice`, `findDice`, `slugify`, `stableId`, `paragraphs`, `headingCandidates`).

Text normalisation applied to the cache (recorded in `cache/manifest.json` → `normalization`): CRLF to LF; the PDF's three- or four-character hyphen artifact (hyphen, soft hyphen, U+2010, sometimes U+2011) to `-`; soft hyphens removed; one U+2028 to a line break; the unmappable glyph U+008A (493 occurrences: the empty spell-slot cells of the class tables and one dash on page 90, "where the adversaries are—how far away") to an em dash; the grave accent that one font emits for apostrophes (10 occurrences, "Thieves` Cant", "can`t") to U+2019; U+2212 minus to `-`. Typographic quotes, dashes, bullets and fractions are kept as printed. `toPlain` folds them to ASCII for search and slugs only.

Reading-order pages merge the lines of a paragraph, which also merges consecutive stat-block traits into one line. Structure (stat blocks, tables, spell headers) is therefore parsed from the layout pages, column by column (`splitLayoutColumns`, left column then right column), unwrapping lines back into paragraphs. Prose descriptions may be taken from the reading-order pages.

Layout caveat (measured by the spells stager): pdftotext pads the right column to an absolute character column in its raw output, so every character the normalisation removes from a hyphen in the left column moves that line's right-column text three columns left. A stager must therefore cut columns at the space gap nearest the page's usual gutter (a plausibility window), never at a fixed offset; the monsters and spells stagers do this and reconcile every line against the reading-order page. A raw, unnormalised layout variant of the cache would remove the shift and is a candidate follow-up.

## 3. Section map (page ranges verified 2026-09-22 by reading the first lines of every boundary page; the PDF has no table of contents)
| Section | Pages | Category | Stager |
|---|---|---|---|
| Legal information | 1 | meta | (manifest only) |
| Races | 3–7 | character-options | `stage_character_options.js` |
| Classes | 8–55 | character-options | `stage_character_options.js` |
| Beyond 1st Level: multiclassing, alignment, languages, inspiration, backgrounds (Acolyte) | 56–61 | character-options | `stage_character_options.js` |
| Equipment | 62–74 | equipment | `stage_equipment.js` |
| Feats (Grappler) | 75 | character-options | `stage_character_options.js` |
| Using Ability Scores | 76–83 | rules | `stage_rules.js` |
| Adventuring (the chapter title is not in the extracted text; the chapter starts at "Time") | 84–89 | rules | `stage_rules.js` |
| Combat | 90–99 | rules | `stage_rules.js` |
| Spellcasting | 100–104 | rules | `stage_rules.js` |
| Spell Lists | 105–113 | spells (class lists) | `stage_spells.js` |
| Spell Descriptions | 114–194 | spells | `stage_spells.js` |
| Traps | 195–198 | rules (hazard) | `stage_rules.js` |
| Diseases | 199–200 | rules (hazard) | `stage_rules.js` |
| Madness | 201–202 | rules (hazard) | `stage_rules.js` |
| Objects | 203 | rules | `stage_rules.js` |
| Poisons | 204–205 | rules (hazard) | `stage_rules.js` |
| Magic Items | 206–253 | magic-items | `stage_magic_items.js` |
| Monsters: stat block rules | 254–260 | rules | `stage_rules.js` |
| Monsters (A to Z) | 261–357 | creatures | `stage_monsters.js` |
| Appendix PH-A: Conditions | 358–359 | rules (condition) | `stage_rules.js` |
| Appendix PH-B: Fantasy-Historical Pantheons | 360–362 | rules (appendix) | `stage_rules.js` |
| Appendix PH-C: The Planes of Existence | 363–365 | rules (appendix) | `stage_rules.js` |
| Appendix MM-A: Miscellaneous Creatures | 366–394 | creatures | `stage_monsters.js` |
| Appendix MM-B: Nonplayer Characters | 395–403 | creatures | `stage_monsters.js` |

The assignment quoted equipment as 63–76 and rules as 62–113; the pages themselves put the equipment chapter at 62–74, the one-page Feats section at 75, and the rules chapters at 76–113 plus 195–205, 254–260 and 358–365.

## 4. Expected counts
`expected` is the number the assignment or the SRD's own structure names; `tolerance` is how far the validator lets the catalogue differ before failing. A count outside the tolerance is a finding, never something to pad.

| category | kind | expected | tolerance | basis |
|---|---|---|---|---|
| creatures | creature | 313 | 5 | assignment: 199 in Monsters (A to Z) plus 114 in the appendices |
| spells | spell | 319 | 2 | assignment; the 2026-09-21 `srd5_1/spells.json` also holds 319 |
| spells | spell-list | 8 | 0 | one list per casting class: bard, cleric, druid, paladin, ranger, sorcerer, warlock, wizard |
| equipment | weapon | 37 | 0 | the weapons table on page 66 |
| equipment | armor | 13 | 0 | the armor table on page 64 (12 armors and the shield) |
| equipment | gear | 99 | 2 | the adventuring gear table (pages 69–70): 99 priced rows, 16 of them sub-rows under Ammunition, Arcane focus, Druidic focus and Holy symbol (first estimate was 60) |
| equipment | tool | 36 | 0 | the tools table (page 70): artisan's tools, kits, gaming sets, instruments, vehicles, each sub-row counted |
| equipment | mount | 8 | 0 | mounts and other animals (pages 71–72): camel, donkey or mule, elephant, draft horse, riding horse, mastiff, pony, warhorse (first estimate was 5) |
| equipment | vehicle | 20 | 1 | tack, harness, drawn and waterborne vehicles (pages 71–72), each saddle counted (first estimate was 14) |
| equipment | trade-good | 13 | 0 | the trade goods table (page 73) |
| magic-items | magic-item | 240 | 1 | one heading per item on pages 206–253, the +1/+2/+3 items being single entries; the assignment's 243 came from the 2026-09-21 reference file, which lists about ten lines that are not items |
| character-options | race | 9 | 0 | dwarf, elf, halfling, human, dragonborn, gnome, half-elf, half-orc, tiefling |
| character-options | subrace | 4 | 0 | hill dwarf, high elf, lightfoot halfling, rock gnome |
| character-options | class | 12 | 0 | barbarian to wizard |
| character-options | subclass | 12 | 0 | one archetype per class in the SRD |
| character-options | background | 1 | 0 | acolyte |
| character-options | feat | 1 | 0 | grappler |
| rules | condition | 15 | 0 | Appendix PH-A |
| rules | rule | 114 | 5 | one entry per second-level heading: 62 in the rules chapters (76–104, 195–205, 254–260), 24 in the equipment chapter, 20 in the magic item rules (206–208) and 8 in the character-option chapters (racial traits, Beyond 1st Level, feats intro); first estimate was 40 |
| rules | hazard | 28 | 0 | 8 traps, 3 diseases, 3 forms of madness, 14 poisons |
| rules | table | 17 | 0 | standalone reference tables: ability scores and modifiers, typical DCs, travel pace, size categories (twice), trap DCs, damage severity, three madness tables, object AC, object HP, poison prices, hit dice by size, proficiency bonus and XP by challenge rating, exhaustion |
| rules | appendix | 2 | 0 | pantheons, planes |

## 5. Stable IDs
`srd:<kind>:<slug>` from `stableId(kind, name, variant)`: lower case, ASCII, hyphen separated, typographic punctuation folded, e.g. `srd:creature:aboleth`, `srd:weapon:crossbow-light`, `srd:magic-item:bag-of-tricks-gray`, `srd:subclass:path-of-the-berserker`, `srd:condition:blinded`, `srd:rule:combat-the-order-of-combat`. Variants (colours, sizes, "+1/+2/+3") use the third argument. IDs are unique across the whole catalogue; the assembler refuses duplicates instead of renaming them.

Kinds: `creature`, `spell`, `spell-list`, `weapon`, `armor`, `gear`, `tool`, `mount`, `vehicle`, `trade-good`, `magic-item`, `race`, `subrace`, `class`, `subclass`, `background`, `feat`, `condition`, `rule`, `hazard`, `table`, `appendix`.

Categories (browser filters and output files): `creatures`, `spells`, `equipment`, `magic-items`, `character-options`, `rules`.

## 6. Entry schema (every entry, every category)
```json
{
  "id": "srd:creature:aboleth",
  "category": "creatures",
  "kind": "creature",
  "name": "Aboleth",
  "source": { "document": "SRD 5.1", "pages": [261, 262], "section": "Monsters (A to Z)", "heading": "Aboleth" },
  "text": "Full text of the entry as printed, paragraphs separated by blank lines.",
  "data": { "...kind-specific structured fields (section 7)..." },
  "dice": [ { "text": "4d8 + 2", "count": 4, "sides": 8, "modifier": 2, "average": 20 } ],
  "readiness": "parsed",
  "notes": [ "parser warnings, e.g. 'legendary actions block not found'" ]
}
```
- `text` is verbatim after normalisation: no paraphrase, no omissions, tables included as their rows.
- `dice` lists every dice expression found in `text` (from `findDice`).
- `notes` is empty for a clean parse.

### Readiness tags
| tag | meaning | who sets it |
|---|---|---|
| `extracted` | name, source pages and full text captured; `data` incomplete (a required field of section 7 could not be parsed) | stager |
| `parsed` | every required field of section 7 filled by the stager; not compared with the page by a person | stager |
| `verified` | compared with the PDF page by a person and confirmed; `verifiedBy` and `verifiedAt` recorded | a later review pass, never a stager |
| `adapted` | a DEUS adaptation exists; `adaptation.deusId` names it | an adaptation task, never this pipeline |

### Staging file shape (`tools/srd_extract/staging/staging_<category>.json`)
```json
{ "metadata": { "generator": "tools/srd_extract/stage_<category>.js", "generatedAt": "...", "category": "creatures",
                "source": { "file": "SRD_CC_v5.1.pdf", "sha256": "...", "pages": [[261, 357], [366, 403]] },
                "cache": { "generatedAt": "...from cache/manifest.json..." },
                "license": { "id": "CC-BY-4.0", "attribution": "..." } },
  "entries": [ ... ],
  "warnings": [ { "page": 262, "message": "..." } ] }
```
The catalogue files under `game/data/srd51/` have the same shape plus `metadata.assembledBy`, `metadata.schemaVersion` and `metadata.dormant: true`, and each entry gains `icon` (section 8).

## 7. Required `data` fields per kind (what `parsed` means)
- **creature**: `size`, `type` (with `subtype` when printed in parentheses), `alignment`, `armorClass { value, note }`, `hitPoints { average, formula }`, `speed { walk, fly, swim, burrow, climb, hover }` (feet, absent modes omitted), `abilities { str, dex, con, int, wis, cha }` (scores), `savingThrows {}`, `skills {}`, `damageVulnerabilities []`, `damageResistances []`, `damageImmunities []`, `conditionImmunities []`, `senses { ..., passivePerception }`, `languages`, `challenge { rating, xp }`, `traits [ { name, text } ]`, `actions [ { name, text, attack? } ]`, `reactions []`, `legendaryActions { intro, options [ { name, text } ] }` when printed. `attack` when the action is a weapon attack: `{ type, toHit, reach, range, target, hit: { average, dice, damageType }, extra }`.
- **spell**: `level` (0 for cantrips), `school`, `ritual`, `castingTime`, `range`, `components { verbal, somatic, material, materialDescription }`, `duration`, `concentration`, `description`, `atHigherLevels` (null when absent), `classes []` (from the spell lists).
- **spell-list**: `class`, `spells [ { level, names [] } ]`.
- **weapon**: `weaponCategory` (simple or martial), `rangeType` (melee or ranged), `cost { amount, unit }`, `damage { dice, type }` (null for the net), `weight { lb }` (null for the sling, printed without one), `properties [ { name, detail } ]`.
- **armor**: `armorCategory` (light, medium, heavy, shield), `cost`, `ac { base, dexModifier: "full" | "max2" | "none", bonus }`, `strength` (minimum or null), `stealthDisadvantage`, `weight`.
- **gear, tool, mount, vehicle, trade-good**: `cost`, `weight` (null when the table prints none), `group` (the table's sub-heading, null for rows under none), `description` (the item's paragraph from the descriptions text when one exists, else null).
- **magic-item**: `itemType` (armor, weapon, wondrous item, potion, ring, rod, scroll, staff, wand), `typeDetail` (the parenthetical restriction or null), `rarity` (common, uncommon, rare, very rare, legendary, artifact, varies), `attunement { required, restriction }`, `description`, `tables [ { caption, columns, rows } ]`.
- **race / subrace**: `traits [ { name, text } ]`, `abilityScoreIncrease`, `size`, `speed`, `languages`, `parent` (subraces), `subraces []` (races).
- **class**: `hitDie`, `savingThrows []`, `proficiencies { armor, weapons, tools, skills }`, `startingEquipment`, `classTable { columns, rows }`, `features [ { name, level, text } ]`, `subclasses []`.
- **subclass**: `parentClass`, `features [ { name, level, text } ]`.
- **background**: `skillProficiencies`, `languages`, `equipment`, `feature { name, text }`, `characteristics` (tables).
- **feat**: `prerequisite`, `benefits []`.
- **condition**: `effects []` (one string per bullet), `table` for exhaustion.
- **rule / hazard / appendix**: `headingPath []` (chapter, section, subsection), `tables []`.
- **table**: `caption`, `columns []`, `rows [][]`, `headingPath []`.

## 8. Placeholder icons
Each catalogue entry gets `icon: { set: "IconSet", index }` from the kind map in `tools/build_srd_catalog.js`. The set is the stock RPG Maker MZ `game/img/system/IconSet.png` (512×800 px, 16 columns × 25 rows = indices 0–399). The validator checks every index against the sheet's real dimensions. These are development placeholders for the browser only; a shipped adaptation needs original art (AGENTS.md rule 11) and a request in `docs/ASSET_REQUESTS.md`.

## 9. Dormancy rules (checked by the validator)
- No entry of `game/js/plugins.js` and no `DataManager._databaseFiles` push in any plugin names a file under `game/data/srd51/`.
- `game/data/DEUS_WorldCatalog.json` contains no `srd:` id.
- The catalogue writes nothing into `game/save/`.

## 10. Known gaps and decisions for the coordinator
- A second SRD folder now exists: `game/data/srd5_1/` (2026-09-21, fifteen files, no committed extraction tool, references without full text for creatures and magic items) next to `game/data/srd51/` (this library). Rule 14 wants one source of truth per concept; which folder is canonical, and whether `tools/test_srd_parity.js` moves to the new one, is the coordinator's call. This library does not modify `srd5_1`.
- The two glyph rules in section 2 (U+008A to em dash, grave accent to apostrophe) rest on the text context of every occurrence, not on a rendered page: PDF rendering is not available on this machine. The class tables' slot cells and the page 90 sentence leave no other reading, but a check against the PDF in a viewer would close the point.
- Counts in section 4 were first estimates and were corrected to the numbers measured on the pages during the first build (gear, mounts, vehicles, magic items, rules, hazards, tables); the validator holds the catalogue to them from now on.

## 11. First build, 2026-09-22
`node tools/validate_srd_catalog.js`: 36 passed, 0 failed. `node tools/srd_browser/selftest.js`: 111 passed, 0 failed, 1 skipped (fixture and real catalogue). 1,325 entries: 1,311 `parsed`, 14 `extracted`, 0 `verified`, 0 `adapted`. Every stager reconciles its entries against the reading-order pages (creatures 5,219/5,219 lines, spells 319/319 bag-of-words segments, equipment and magic items 154/154 and 761/761 paragraphs).

The 14 `extracted` entries and why:
- `srd:tool:vehicles-land-or-water` (p70) and `srd:vehicle:barding` (p71–72): the table prints `*` and `×4` instead of coin amounts; kept verbatim.
- Nine magic items whose d20/d100 tables could not be recovered row by row from the layout (text is complete, `data.tables[].rows` empty, raw lines kept): Apparatus of the Crab (p208), Bag of Beans (p209), Efreeti Bottle (p220), Horn of Valhalla (p226), Iron Flask (p228), Manual of Golems (p229), Necklace of Prayer Beads (p231), Robe of Useful Items (p239), Wand of Wonder (p249).
- `srd:subclass:oath-of-devotion` (p32) and `srd:subclass:the-fiend` (p50): one feature each has no level sentence in the source ("Oath Spells", "Expanded Spell List").
- `srd:rule:magic-items-artifacts` (p252): the heading has no prose of its own.

Known limits of this build: rows of in-item tables are kept as printed lines where a table wraps (Half-Dragon Template, Confusion, Teleport); source typos are preserved, never corrected ("3nd level" in Animal Messenger, "Component:" on page 129, "1r50" in Iron Flask where the PDF prints an en dash as "r"); nothing has been compared with the rendered PDF by a person, so no entry is `verified`.
