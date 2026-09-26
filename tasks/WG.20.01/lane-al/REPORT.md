# WG.20.01 lane-al report

Writer: grok. Reviewer: gemini, not this lane. This report does not certify the work.

No art was generated. No image prompts. Deliverables are markdown, JSON and Node.

## Files

- `docs/art/DEUS_ASSET_STANDARD.md` — normative standard, 119 rule ids, appendices A–C.
- `game/data/UF_AssetStandard.json` — `schemaVersion` `deus-asset-standard/1.1.0`. Same 119 rule ids. `outfitMatrix` length 135. `summons` length 29.
- `game/data/UF_SpellVisualTable.schema.json` — JSON Schema draft 2020-12 (`$schema` is `https://json-schema.org/draft/2020-12/schema`). Six example rows: Fire Bolt, Fireball, Cone of Cold, Lightning Bolt, Shield, Cure Wounds. Not the 319-spell table.
- `tools/art/validate_asset_standard.js` — coverage checker. Reads the catalogue, the standard, the spell schema and `game/data/srd51/spells.json`. Does not write files and does not read pixels.
- `tools/art/test_validate_asset_standard.js` and `tools/art/fixtures/asset_standard/**` — each check has a passing case and a mutant that the check must reject.
- `tasks/WG.20.01/lane-al/BRIEF_ADDENDUM_A1.md` — Owner addenda A1–A9. A1–A6 were already in the standard at the PM merge. This resume adds A7–A9 and the later amendments, in the Addendum A1 section below.

`art/catalogue/**` was not modified.

## Addenda applied

- **A1 (12:41 CT).** 9 races × 15 outfits = 135 art variants of race-neutral outfit ids. Shared light / medium / heavy silhouettes. Pose grid is marked **PM-proposed, Owner may amend**. Weapon angles are eight pre-drawn cels. Deforming pieces (cape, long robe, large shield, bow mid-draw) have a frame for every pose.
- **A2 (12:42 CT).** Per-race face background. Seven-layer stack. Expressions 0–7 in fixed order on the 144 px, 4×2 sheet. Anchors recorded; collar line y = 108 matches the current portrait baker.
- **A3 (12:43 CT).** One item id per SRD item. Art key `<itemId>__<race>`, fallback `__human`, then nothing. The 135 outfits are variants, not new items.
- **A4 (12:46 CT).** One 32×32 icon grid, 16 columns. Rarity is an overlay. Resource nodes have four states, a harvest animation, a drop, and six biome variants. Animation is the default. Static assets name a closed exception. Clock is 150 ms.
- **A5 (12:49 CT).** 29 entity spells derived from `game/data/srd51/spells.json` (see below). Each has summon-in, dismiss and a controller marker.
- **A6 (12:52 CT).** Remains, drawn carry (replaces V89 for this standard), vehicles and riding poses, body-variety loci, child and working stooped elder, drawn night plus an optional crisp tint hook with blur forced off, world map / minimap / banners, readable props, accessibility minimum 16 px, file-name patterns and a style-bible spec with no image.

## Summon derivation

Source: `game/data/srd51/spells.json`, `kind === "spell"` (319). Fields: `name`, `data.description`, `data.atHigherLevels`. Creature ids: `game/data/srd51/creatures.json` by exact name.

Include when the name starts with `Conjure `, `Animate ` or `Wall of `, or the name is in the named list in the standard, or the description matches `you conjure` or `you summon`. Exclude Gate (a portal), Magnificent Mansion (a dwelling) and Web (a cube of webbing), because those sentences do not create a creature or a field token.

Count: **29**. Category spells keep one slot and the sim picks the stat block at cast. Find Familiar's 15 forms and Find Steed's 5 forms are creature ids that exist in `creatures.json`. Create Undead's higher-level sentence names ghast, wight and mummy.

## Reconciliation

Owner rulings win. The full conflict list is Appendix A in the standard and the copy below. In short: DEC-030's six biomes, five depth bands and 15 transitions replace five biomes, 25 sets and 10 transitions. DEC-013's 32 layers, 5 ft cell, 10 ft layer and nine races stay; its band ranges do not. DEC-011 forbids filters; the 12:52 night hook is the only tint, and blur stays off. Four directions (12:38) replace 8-way sheets. Spell composition (12:39) replaces per-spell animations. Carry is drawn. `uf.hex` is the runtime palette now; the master palette is the target (ADR-002). The scale chart is the registry plus the strip (DEC-016).

The charter's 58 logical-action tokens are mapped onto the required rows. The brief's "45" is the subset that also sits on families F01–F14. The crosswalk's 7×17 spell taxonomy is kept as aliases of the four-phase composition. The material heading says 18 and the list names 20; icon slots use the 20 names.

## Catalogue coverage

`node tools/art/validate_asset_standard.js --json` against `art/catalogue/catalogue.json`. The shell redirect stored UTF-16; the summary object is the same as the text run below. Default exit is 0. `--strict` would exit 1 because of the 11 legacy filenames. Nothing was written under `art/` or `game/img/`.

Entry status is violate if any rule violates, otherwise unknown if any rule is unknown, otherwise pass. Most entries are unknown because animation rows are not on the catalogue record, or because the band id is still a DEC-013 token (`LOWER2`, `TEMP`, and the rest). That is a coverage gap, not a pass.

```
entries 10089 pass 216 violate 11 unknown 9862
rule-results pass 10926 violate 11 unknown 9921
global-violations 0
```

Per category (entries, pass, violate, unknown):

| Category | Entries | Pass | Violate | Unknown |
|---|---:|---:|---:|---:|
| CHARACTER | 47 | 0 | 0 | 47 |
| CONNECTOR | 42 | 7 | 0 | 35 |
| CREATURE | 48 | 0 | 0 | 48 |
| DECAY | 100 | 0 | 0 | 100 |
| EDGE | 3480 | 0 | 0 | 3480 |
| EFFECT | 4 | 4 | 0 | 0 |
| EQUIPMENT | 34 | 27 | 7 | 0 |
| FACE | 52 | 48 | 4 | 0 |
| FLORA | 22 | 0 | 0 | 22 |
| FURNITURE | 9 | 9 | 0 | 0 |
| HANGING | 30 | 0 | 0 | 30 |
| ITEM | 61 | 61 | 0 | 0 |
| LIGHT | 20 | 0 | 0 | 20 |
| RAMP | 2900 | 0 | 0 | 2900 |
| RAMPSIDE | 2900 | 0 | 0 | 2900 |
| REMAINS | 4 | 3 | 0 | 1 |
| RIMSHADOW | 20 | 0 | 0 | 20 |
| SHADE | 25 | 0 | 0 | 25 |
| STONE | 12 | 6 | 0 | 6 |
| STRUCTURE | 21 | 21 | 0 | 0 |
| TERRAIN | 42 | 14 | 0 | 28 |
| TOP | 145 | 0 | 0 | 145 |
| TREE | 16 | 0 | 0 | 16 |
| VEIN | 4 | 4 | 0 | 0 |
| WALLFACE | 30 | 0 | 0 | 30 |
| WATER | 10 | 1 | 0 | 9 |
| WORKSHOP | 11 | 11 | 0 | 0 |

The 11 violations are all **AS-STYLE-001**, legacy filenames that predate `<itemId>__<race>` and `UF_Faces_<race>_<n>`:

- `$UF_Layer_bow_short.png`, `$UF_Layer_club.png`, `$UF_Layer_shield_wood.png`, `$UF_Layer_spear.png`, `$UF_Layer_stone_axe.png`, `$UF_Layer_stone_knife.png`, `$UF_Layer_stone_pick.png`
- `UF_Faces_Human_Female_Adult.png`, `UF_Faces_Human_Female_Elder.png`, `UF_Faces_Human_Male_Adult.png`, `UF_Faces_Human_Male_Elder.png`

Globals all passed: 135 outfits, child and working elder, 29 summon spells, spell-schema examples, six banners, four readable props, night hook off with blur false, remains set.

## Gate output

`node tools/art/test_validate_asset_standard.js`

```
RESULT: 94 passed, 0 failed
```

The run printed `PASS` for every good case and every mutant (94 lines) and then that result line. Exit 0.

`node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

Exit 0. This lane did not edit any plugin.

## Appendix A (copy)

Owner rulings win.

1. Five biomes (identity standard line 49; palette standard line 44; worldgen WBS OD-6) vs DEC-030's six: VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD.
2. The lattice and the overworld production charter count a different six (Temperate, Wetland, Arid, Highland, Cold, Volcanic). Highland is a depth band. WILD is a biome. DEC-030 wins.
3. DEC-013's 25 pipeline biomes vs DEC-030's 30.
4. Ten transitions (identity standard line 286) vs fifteen DEC-030 pairs. The lattice's fifteen pairs are the wrong set.
5. The five-Z model (Z+2..Z−2) vs 32 layers. A 9-layer test may remain. It is not the world.
6. DEC-013 band ranges (Lower-2 −16..−9 through Upper-2 +10..+15), still in `geometry.json`, vs DEC-030 Deep Earth through Highlands, air reserved at +12..+15.
7. V64 / OSRS combat text in VISION and several design docs vs DEC-027. SRD 5.1 wins. V64 is retired.
8. Eight-way sheets (VISION V3, AR-600, RMMZ asset spec lines 49 and 101, generator prompts rule 10) vs Owner 12:38. Four directions, rows S, W, E, N. Diagonals are mined, not standard. Movement code that stays 8-direction is not a sheet rule.
9. Alpha, tint, ColorMatrix, LUT seasons, additive VFX and blur vs DEC-011. Drawn frames and ramps win. The 12:52 night hook allows optional per-pixel or per-tile tint, blur off, default off.
10. Invisible at 20% alpha and poisoned as a tint pulse (charter and crosswalk) vs a drawn contour and a drawn ramp.
11. Giant sockets "scaled by 2.0×" vs authored large frames.
12. The generator's east-from-west mirror vs authored asymmetrical gear.
13. F14 left unsplit vs a requirement that sleep, prone, unconscious and dead are different frames. The family id is still open.
14. `DEUS_Anim` ignores `carry` (V89) vs A6. Carry is drawn. The plugin was not edited.
15. Face layout of adult/elder by sex vs the eight expression indexes.
16. Eleven painted face cultures vs nine races. Classification of the extra cultures is open.
17. `uf.hex` is canonical for runtime now. The master hex is the target. The catalogue path points at the master file. Ramp ids are the vocabulary.
18. Crosswalk 7×17 spell profiles vs the four-phase composition. Older names are aliases.
19. Material heading says 18. The list names 20. Icons use the 20.
20. Worldgen WBS `BIOME_Z_...` vs catalogue `BAND_BIOME_...`. This standard uses the six-field catalogue pattern with DEC-030 tokens.
21. `geometry.json` marks `LARGE_LONG` proposed. The lane brief requires 96×48. This standard adopts 96×48 and does not edit geometry.
22. No snow biome (identity standard line 42) vs a required drawn snow weather overlay. Weather is not a biome. The look of COLD is open.
23. Charter: children do not do heavy labour. The child template still has the work rows.
24. WG.00.01 visual charter, WG.00.02 48 px 1:1, WG.00.03 42 px human, WG.00.04 five biomes (superseded), WG.00.05 palette target.

## Appendix B (copy)

Not answered.

1. Face cultures that are not the nine races (goblin, orc, lizardfolk, kobold, undead, starborn, swarm, automaton-like-starborn, plus skin aliases serpentkin, demon, swarmer, dark_dwarf, dark_gnome): full humanoid paper-doll, or the monster set?
2. How many age steps, and is there a teen stage? Child, adult and a stooped working elder are required. Infant and adolescent stay in the charter and are not frozen here.
3. Dedicated WBS leaves for this standard and the per-category follow-ups. No id is minted.
4. Also open: the look of COLD and of WILD; where `HIGH_*` ramps go; Huge and Gargantuan frame multiples; balding-mask count; dragonborn scale-colour steps; whether DEC-016's chart means a different file; which race lives on which layer; whether `TALL_MEDIUM` and the small-race readability floor turn on; whether F14 stays one family id; how remembered fog is drawn without a desaturation filter.

Four directions are decided. They are not an open question.

## Appendix C (copy)

| What exists | Count | Notes |
|---|---:|---|
| Catalogue sheets / entries | 207 / 10089 | Ids match the six-field shape. Bands are pre-DEC-030. 9792 MISSING, 196 EXISTING_UNAPPROVED, 52 STAND_IN, 49 STOCK. |
| Character / creature / equipment / face | 47 / 48 / 34 / 52 | Character, creature and equipment facings in the catalogue are already S, W, E, N. |
| Paper-doll rows | 34 | legs 1, torso 2, head 3, back 4, shield 5, held 6. Human male T0 × 28, human female T0 × 6. |
| Sidecars | 688 JSON | 157 have eight facings. Legacy. Mine S, W, E, N. |
| `$gen_*` PNGs | 474 files, 242 names | Pool is 116 human keys. Baker order: skin, cloth, hair, beard. East is mirrored. |
| `UF_Faces_*` | 37 PNGs | Old layout, not the eight expressions. |
| `$UF_Layer_*` | 24 PNGs | No `__<race>` suffix. |

Reusable: 48 px grid, 3×4 S/W/E/N charsets, 144 face cells, paper-doll z-order, 18-slot order, 42 px human, SRD ids. Legacy: 8-way sidecars, `$gen_*` mirrors, layer names without a race, old face layout, DEC-013 band ids.

## Follow-ups

No WBS ids. No art.

- `PROPOSED-AL-01` — regenerate catalogue ids onto DEC-030 bands and biomes.
- `PROPOSED-AL-02` — mine the 157 eight-way sidecars down to S, W, E, N.
- `PROPOSED-AL-03` — generator parts for nine races, hair-back, greying ramps, racial parts, no east mirror.
- `PROPOSED-AL-04` — body templates beyond human T0, and the 135 outfit layers.
- `PROPOSED-AL-05` — rename layer and face files to the patterns in AS-STYLE-001.
- `PROPOSED-AL-06` — fill the 319 spell-visual rows. Stay out of Lane V's `docs/schemas/spells/**` and `tools/spells/**`.
- `PROPOSED-AL-07` — add the new ramp ids to the palette registry.
- `PROPOSED-AL-08` — faction piece kits for the six profiles.
- `PROPOSED-AL-09` — resource-node states for six biomes.
- `PROPOSED-AL-10` — child and working-elder templates.
- `PROPOSED-AL-11` — the WBS leaves in Appendix B item 3, when the Owner wants them.

## Addendum A1

Resume on `task/lane-al` after the PM merge `ad674159` (writer tip `dc6696e9` is an ancestor). No art was generated. No image prompt was run. `promptSpecTemplates` is a field list with sources. `prosePrompt` is null.

A1 through A6 were already encoded (135 outfits, face stack, race-neutral item ids, icon grid, 29 summon rows, remains, carry, vehicles, child and working elder, night hook, map, props, file names). This pass keeps those gates and applies A7, A8 and A9. Later rulings amend earlier sentences. They do not delete the old rule ids.

- **A1, amended by A9.** The 135 outfit ids stay race-neutral. Pixels are custom per race (`pixels: custom-per-race`). The silhouette name is the slot pattern. Weapons, tools and accessories are one silhouette, a race ramp and a decal slot (**AS-GEAR-001**).
- **A7 (12:56 and 12:57 CT).** Eleven player-selectable window skins: `deus`, `deus-dark`, and one per race. RMMZ 192×192 regions, opaque pixels. Religion pieces with an open deity list (no invented pantheon). Farming stages, food, underground kit, traps, lore visuals, optional event scenes, designation overlays. Marketing is a later note, `required: false`.
- **A8 (12:59, 13:01, 13:02, 13:03 CT).** Tamed and bound art, cages and pens. No creature equipment slots, no barding, no crafted creature gear. Collar, saddle and harness are visual markers with no slot and no stats; whether they are wanted at all is Appendix B. Variety floors for six biomes and for `DEEP` and `CAVERN`. Hair 12 per body type, 3 balding overlays, 8 facial-hair parts plus `dwarf-plait`, face-gene counts. Seasons on variety pieces are palette-swap frames (PM, Owner may amend). Every non-face entity needs an icon and a 144×144 portrait.
- **A9 (13:14 through 13:24 CT).** Head grid of 12 frames and a head anchor on every body frame (236 frames). Elder reuses adult garb, gear and hair via offsets. Mirror is an offline W-to-E bake of a symmetric, light-neutral layer. Pose rows prone, unconscious, sleep, sit, sneak, climb. **AS-BIOME-005** flags a canonical biome set that is not the six DEC-030 ids. Creature squares from 1×1 through 4×4, largest sheet 768×768. Slot templates and a 2048 atlas (42×42). Pipeline rejects off-size output and does not scale. Field templates, generation log, yield, template versions, generator adapters, routing and a golden test set are schemas. Generators are `unassigned`. Style tune is optional and later. No registry, catalogue or tool file outside `allowedPaths` was edited.

`game/data/DEUS_BiomeRegistry.json` and `docs/art/DEUS_BiomeRegistry.json` still list `TEMP`, `WET`, `ARID`, `HIGH`, `VOLC`. Catalogue `biomes.canonical` is the same five, and all 10,089 entry biome tokens are `SHARED`. The checker reports those three lists. It does not rewrite them. Mapping `HIGH` and `WILD` is Appendix B, not a guess in this lane.

Catalogue rows that have no icon or portrait field are `unknown` for **AS-PORT-001**, not a pass. That moved 139 former passes (items, equipment that already passed, structures, furniture, workshops, veins, and the stone rows that had passed) into unknown. The 11 filename violations are unchanged.

### Catalogue coverage (this pass)

`node tools/art/validate_asset_standard.js` against `art/catalogue/catalogue.json`. Exit 0. `--json` carries the same summary object. `--strict` would exit 1 because violations are non-zero (11 filenames plus 3 biome-set globals). Nothing was written under `art/` or `game/img/`.

```
entries 10089 pass 77 violate 11 unknown 10001
rule-results pass 10985 violate 11 unknown 10195
global-violations 3
global violate AS-BIOME-005 game/data/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC
global violate AS-BIOME-005 docs/art/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC
global violate AS-BIOME-005 catalogue canonical TEMP,WET,ARID,HIGH,VOLC
```

| Category | Entries | Pass | Violate | Unknown |
|---|---:|---:|---:|---:|
| CHARACTER | 47 | 0 | 0 | 47 |
| CONNECTOR | 42 | 7 | 0 | 35 |
| CREATURE | 48 | 0 | 0 | 48 |
| DECAY | 100 | 0 | 0 | 100 |
| EDGE | 3480 | 0 | 0 | 3480 |
| EFFECT | 4 | 4 | 0 | 0 |
| EQUIPMENT | 34 | 0 | 7 | 27 |
| FACE | 52 | 48 | 4 | 0 |
| FLORA | 22 | 0 | 0 | 22 |
| FURNITURE | 9 | 0 | 0 | 9 |
| HANGING | 30 | 0 | 0 | 30 |
| ITEM | 61 | 0 | 0 | 61 |
| LIGHT | 20 | 0 | 0 | 20 |
| RAMP | 2900 | 0 | 0 | 2900 |
| RAMPSIDE | 2900 | 0 | 0 | 2900 |
| REMAINS | 4 | 3 | 0 | 1 |
| RIMSHADOW | 20 | 0 | 0 | 20 |
| SHADE | 25 | 0 | 0 | 25 |
| STONE | 12 | 0 | 0 | 12 |
| STRUCTURE | 21 | 0 | 0 | 21 |
| TERRAIN | 42 | 14 | 0 | 28 |
| TOP | 145 | 0 | 0 | 145 |
| TREE | 16 | 0 | 0 | 16 |
| VEIN | 4 | 0 | 0 | 4 |
| WALLFACE | 30 | 0 | 0 | 30 |
| WATER | 10 | 1 | 0 | 9 |
| WORKSHOP | 11 | 0 | 0 | 11 |

The other global checks passed, including 135 outfits, 29 summon spells, 11 skins, gene counts, the 12-frame head grid, 236 elder offsets, and the field templates.

### Gate output (this pass)

`node tools/art/test_validate_asset_standard.js`

```
RESULT: 171 passed, 0 failed
```

Exit 0. Each check printed `PASS` for the good record and for the mutant (171 lines) before that result line.

`node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

Exit 0. This pass did not edit a plugin.

### Follow-ups added

- `PROPOSED-AL-12` — biome registry and catalogue canonical-set fix to the six DEC-030 ids. Do not guess `HIGH` → `COLD` or a source token for `WILD` here.
- `PROPOSED-AL-13` — sizing manifest, blank template generator, slot map, atlas packer and lookup file.
- `PROPOSED-AL-14` — generation log, yield store, and routing re-benchmark on the golden test set.
- `PROPOSED-AL-15` — icon and 144 px portrait for every non-face entity.
- `PROPOSED-AL-16` — the 11 window skins and the hair, balding and face-gene part expansion.
