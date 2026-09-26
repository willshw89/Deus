# SIM.60.02 Lane V REPORT: spell-effect schema, SRD baseline, effect data, tuning table, validator

- **Task:** SIM.60.02 (spell-effect schema, `docs/worldgen/DEUS_WORLDGEN_WBS.md` M3.4) · **Lane:** lane-v · **Branch:** `task/lane-v` · **Writer:** Claude · **Reviewer:** Grok (independent; not yet run)
- **Base:** `425b594c146d5f353c10faa11f4b5d47f499b45f` (origin/main at lane open) · **Date:** 2026-09-26
- **Status:** submitted for independent review. The writer does not certify this work; the Grok review decides.
- **No art** (DEC-007): no image was generated, requested, edited or integrated. **No runtime:** nothing under `game/` changed (scope diff at the end).

## 1. What was built

| Path | Content |
|---|---|
| `docs/schemas/spells/spell_effect.schema.json` | JSON Schema draft 2020-12, `$id` `https://deus.invalid/schemas/spells/spell_effect.schema.json`, `schemaVersion` `deus-spell-effect/1.0.0`. Record and instance objects are closed (`additionalProperties: false`). Every instance requires `key`, `primitive`, `trigger`, `basis`, `magical`, `ledger`; each of the 28 primitives has a closed `params` definition. `$defs/tuningFile` and `$defs/primitiveCatalogue` validate the two tables. |
| `docs/schemas/spells/srd_baseline.json` | Generated. 319 spells from the audit's `srd` blocks, cross-checked against `spells.json`; 1,683 `measures` (every number phrase of each description, as an exact quote with value and unit); 2 SRD rule sentences (round length, petrified weight). |
| `docs/schemas/spells/effects.json` | 121 records (111 physical + 10 `NONE` with an entity or meta primitive), 257 primitive instances, 54 variants, 525 `srdRef` pointers, 49 `tuningRef` pointers, 283 quote fields, 0 numeric literals. |
| `docs/schemas/spells/tuning.json` | 22 named parameters, 3 tables (damage class, material class, time domain), the Q1 conjured-matter policy table (5 cases), and Q1-Q4 as data. |
| `docs/schemas/spells/primitives.json` | The 28 primitives with audit systems/WBS/gaps, SIM.60.03 phase, ADR-003 §18.6 mapping or gap, allowed ledger modes; the ledger gaps `PROPOSED-V-01` to `-07`. |
| `docs/schemas/spells/README.md` | Files, commands, R1-R11 and where each is enforced, validator codes, open-question table, SIM.60.03 phases A-F. |
| `docs/schemas/spells/.gitattributes` | `*.json text eol=lf`, `*.md text eol=lf`: the system gitconfig here sets `core.autocrlf=true` for fresh clones; this keeps the baseline byte-identical in any clone. |
| `tools/spells/validate_spell_effects.js` | Dependency-free validator: a JSON Schema subset engine (it refuses any keyword it does not implement) plus 26 rule groups; `--check`, `--write-baseline`, `--fixture`. |
| `tools/spells/test_spell_effects.js` | 98 checks: clean data, 47 negative fixtures, CLI exit codes, `--check` twice, 40 in-memory mutants of the validator. |
| `tools/spells/fixtures/*.json` | 47 negative fixtures (JSON patches applied in memory). |
| `tasks/SIM.60.02/lane-v/REPORT.md`, `evidence/` | This report and the raw gate output (worktree and fresh clone). |

**How `effects.json` was first authored.** A temporary helper outside the repository (`%TEMP%\lanev\author_lib.js`, `author_a.js`, `author_b.js`, `author.js`; not committed, as Lane P did for SIM.60.01) wrote the JSON: it looks up each SRD number by its quoted phrase in the baseline and emits the pointer, orders keys, and copies `systems` from the audit record. Committing it would put per-spell code in the repository (R11), so the committed JSON is the source of truth and is edited directly from now on. The fixtures were written the same way (`make_fixtures.js`); the committed fixture files are the artefacts.

## 2. Commands and raw evidence

Every `gateTests` entry of `tasks/SIM.60.02/lane-v/lane.json`, exactly as written, run in the FOREGROUND from the worktree root at the deliverable commit (full output: `tasks/SIM.60.02/lane-v/evidence/gate_worktree.txt`, pasted here unedited):

```
# worktree: /c/Users/snewt/.deus_worktrees/lane-v
$ git rev-parse HEAD
357df39ca5c9f909bec0a65a1cd1ba24dc89b5cc
EXIT=0
$ git status --short
?? tasks/SIM.60.02/lane-v/evidence/
EXIT=0
$ node --version
v24.19.0
EXIT=0

$ node tools/spells/test_spell_effects.js
PASS clean_data_passes
PASS fixture_baseline_tampered
PASS fixture_catalogue_systems_changed
PASS fixture_catalogue_unmapped
PASS fixture_coverage_duplicate_record
PASS fixture_coverage_missing_record
PASS fixture_coverage_none_record
PASS fixture_coverage_unknown_spell
PASS fixture_effect_key_duplicate
PASS fixture_effect_script_hook
PASS fixture_finite_family_source
PASS fixture_ledger_cause_other_spell
PASS fixture_ledger_class_unknown
PASS fixture_ledger_downstream_unknown
PASS fixture_ledger_gap_unlisted
PASS fixture_ledger_mode_wrong
PASS fixture_ledger_row_unknown
PASS fixture_ledger_sink_name_unknown
PASS fixture_ledger_source_no_cause
PASS fixture_ore_output_source
PASS fixture_ore_output_transform
PASS fixture_owner_open_answered_in_data
PASS fixture_owner_open_unknown
PASS fixture_primitive_audit_missing
PASS fixture_primitive_unknown
PASS fixture_primitive_wrong_system
PASS fixture_q1_case_unknown
PASS fixture_q1_policy_decided
PASS fixture_record_script_hook
PASS fixture_schema_keyword_unsupported
PASS fixture_schema_missing_magical
PASS fixture_seconds_per_tick_set
PASS fixture_srd_field_literal
PASS fixture_srd_number_in_text
PASS fixture_srd_number_literal
PASS fixture_srd_quote_ellipsis
PASS fixture_srd_quote_inexact
PASS fixture_srdref_other_spell
PASS fixture_srdref_unresolved
PASS fixture_srdref_wrong_kind
PASS fixture_srdref_wrong_unit
PASS fixture_systems_mismatch
PASS fixture_tick_count_field
PASS fixture_tick_text
PASS fixture_tick_trigger
PASS fixture_time_domain_wrong
PASS fixture_tuning_ref_unknown
PASS fixture_variant_unknown
PASS fixture_count_at_least_30
PASS every_rule_has_a_negative_fixture
PASS cli_fixture_exits_1_with_named_error
PASS cli_clean_exits_0
PASS check_rebuild_run1_exit0
PASS check_rebuild_run2_exit0
PASS check_rebuild_sha256_equal_twice
PASS check_rebuild_equals_committed_file
PASS in_memory_rebuild_equals_committed_file
PASS mutant_rule_schema_off_killed - by fixture_effect_script_hook
PASS mutant_rule_coverage_off_killed - by fixture_coverage_duplicate_record
PASS mutant_rule_systems_off_killed - by fixture_systems_mismatch
PASS mutant_rule_primitiveKnown_off_killed - by fixture_primitive_unknown
PASS mutant_rule_primitiveSystem_off_killed - by fixture_primitive_wrong_system
PASS mutant_rule_primitiveCoverage_off_killed - by fixture_primitive_audit_missing
PASS mutant_rule_keys_off_killed - by fixture_effect_key_duplicate
PASS mutant_rule_variants_off_killed - by fixture_variant_unknown
PASS mutant_rule_srdQuotes_off_killed - by fixture_srd_quote_ellipsis
PASS mutant_rule_srdRefs_off_killed - by fixture_srdref_other_spell
PASS mutant_rule_srdNumberCopied_off_killed - by fixture_srd_number_in_text
PASS mutant_rule_srdFieldLiteral_off_killed - by fixture_srd_field_literal
PASS mutant_rule_noTickLiterals_off_killed - by fixture_tick_count_field
PASS mutant_rule_secondsPerTickOpen_off_killed - by fixture_seconds_per_tick_set
PASS mutant_rule_timeDomain_off_killed - by fixture_time_domain_wrong
PASS mutant_rule_ledgerCause_off_killed - by fixture_ledger_cause_other_spell
PASS mutant_rule_ledgerNames_off_killed - by fixture_ledger_downstream_unknown
PASS mutant_rule_ledgerClasses_off_killed - by fixture_ledger_class_unknown
PASS mutant_rule_ledgerRows_off_killed - by fixture_ledger_gap_unlisted
PASS mutant_rule_noOre_off_killed - by fixture_ore_output_source
PASS mutant_rule_sourceScope_off_killed - by fixture_finite_family_source
PASS mutant_rule_ledgerMode_off_killed - by fixture_ledger_mode_wrong
PASS mutant_rule_tuningRefs_off_killed - by fixture_tuning_ref_unknown
PASS mutant_rule_ownerOpen_off_killed - by fixture_owner_open_answered_in_data
PASS mutant_rule_catalogue_off_killed - by fixture_catalogue_systems_changed
PASS mutant_rule_baselineFresh_off_killed - by fixture_baseline_tampered
PASS mutant_schema_ignores_additionalProperties_killed - by fixture_effect_script_hook
PASS mutant_schema_ignores_required_killed - by clean_data_passes
PASS mutant_schema_ignores_const_killed - by clean_data_passes
PASS mutant_schema_ignores_unknown_keywords_killed - by fixture_schema_keyword_unsupported
PASS mutant_srd_numbers_skip_text_killed - by fixture_srd_number_in_text
PASS mutant_srd_numbers_skip_literals_killed - by fixture_srd_number_literal
PASS mutant_srdref_allows_other_spell_killed - by fixture_srdref_other_spell
PASS mutant_srdref_ignores_unit_killed - by fixture_srdref_wrong_unit
PASS mutant_cause_allows_other_spell_killed - by fixture_ledger_cause_other_spell
PASS mutant_ore_check_transforms_only_killed - by fixture_ore_output_source
PASS mutant_seconds_per_tick_accepts_value_killed - by fixture_seconds_per_tick_set
PASS mutant_tick_text_patterns_off_killed - by fixture_tick_text
PASS mutant_baseline_minute_seconds_changed_killed - by clean_data_passes
PASS mutant_baseline_drops_dice_measures_killed - by clean_data_passes
PASS validator_file_unchanged_by_mutation_run
RESULT: 98 passed, 0 failed
EXIT=0

$ node tools/spells/validate_spell_effects.js
validated committed data: 121 effect records, 257 primitive instances, 26 rule groups
by basis {"srd":202,"deus":55}; by ledger mode {"policy":24,"none":169,"transform":30,"source":26,"relocate":7,"sink":1}
errors 0
EXIT=0

$ node tools/spells/validate_spell_effects.js --check
rebuilt docs/schemas/spells/srd_baseline.json from docs/audits/srd_spell_effect_audit.json + game/data/srd51/spells.json + game/data/srd51/rules.json
rebuilt sha256 d84c51d293950786a1d931f208644a0dd5bec6b94a50bbd1d242b7a6457b5702 bytes 499530
committed sha256 d84c51d293950786a1d931f208644a0dd5bec6b94a50bbd1d242b7a6457b5702 bytes 499530
bytes identical: true
baseline spells 319, measures 1683, audit/spells.json fields compared 2972, mismatches 0, quotes checked 391, quote misses 0
EXIT=0

$ node tools/check_deus_syntax.js
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

The same four gates in a fresh throwaway clone under `%TEMP%` with the machine's default config (system `core.autocrlf=true`), detached at the same commit (full output: `evidence/gate_fresh_clone.txt`). Trimmed to the result lines (copied from the file, not retyped):

```
$ git rev-parse HEAD
357df39ca5c9f909bec0a65a1cd1ba24dc89b5cc
i/lf    w/lf    attr/text eol=lf      	docs/schemas/spells/srd_baseline.json
i/lf    w/crlf  attr/                 	tools/spells/validate_spell_effects.js
RESULT: 98 passed, 0 failed
EXIT=0
errors 0
EXIT=0
bytes identical: true
EXIT=0
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

In that clone the `.js` files checked out with CRLF; the mutation runner folds CRLF before matching its find strings, and every mutant was still killed. The JSON checked out LF (the new `.gitattributes`), so the rebuild is byte-identical there too.

Other commands run during the work (all foreground, all exit 0 unless stated): `node tools/spells/validate_spell_effects.js --write-baseline` (once, to create the baseline; `wrote docs/schemas/spells/srd_baseline.json sha256 d84c51d293950786a1d931f208644a0dd5bec6b94a50bbd1d242b7a6457b5702 bytes 499530`), a lifetime/time-domain consistency probe (`lifetimes 159 mismatch 0`, then turned into the `TIME_DOMAIN` rule), a numeric-literal probe over `effects.json` (`numeric literals in effects.json: 0`), and a grep for time-scale phrases over every committed file of this lane (no match outside the two negative fixtures that must be rejected; see §8). The NW.js harness (`tools/run_tests.js`) was not run.

## 3. Counts and reconciliation with the audit

**Baseline.** 319 spells = the audit's 319 records = `spells.json`'s 319 `kind: "spell"` entries; the 8 `spell-list` entries are listed in `outOfScope` (327 entries in all). Cross-check: 2,972 copied fields compared (level, school, ritual, castingTime, range, components, duration, concentration, name, atHigherLevels), **0 mismatches**; 391 quotes checked (389 audit quotes + 2 rule quotes), **0 misses**. `spells.json` sha256 `7372eccda0bcfd3c27e77822ef5226422b238955636ad69bbbae69ef78d58e94` equals the audit's `meta.source.sha256`.

**Coverage.** Records needing effects: 111 physical (audit: 111) + 10 `NONE` with an entity or meta primitive (audit: 10; Animate Objects, Antimagic Field, Contingency, Demiplane, Dispel Magic, Globe of Invulnerability, Magnificent Mansion, Mending, Rope Trick, Secret Chest) = **121 records written**. The validator rejects a missing, duplicate or extra record (`COVERAGE_*`).

**Records by system** (a record counts once under each of its systems; the audit's figures are over all 319 records, and `NONE` differs only because 198 `NONE` records take no effect record):

| System | Effect records | Audit records |
|---|---|---|
| HEAT | 23 | 23 |
| COLD | 10 | 10 |
| FORCE | 27 | 27 |
| WATER | 11 | 11 |
| EARTH | 25 | 25 |
| LIGHT | 26 | 26 |
| LIFE | 35 | 35 |
| AIR | 12 | 12 |
| NONE | 10 | 208 (10 with a primitive) |

**Primitives** (records per primitive equal the audit's `meta.counts.byPrimitive` exactly, because `PRIMITIVE_COVERAGE` enforces the audit's per-record list; instances are higher where a spell has variants or an SRD and an added part):

| Primitive | Audit records | Effect records | Instances |
|---|---|---|---|
| ignite | 20 | 20 | 29 |
| extinguish | 4 | 4 | 4 |
| heatFlux | 18 | 18 | 21 |
| freezeFluid | 3 | 3 | 3 |
| volumeDamage | 14 | 14 | 22 |
| impulse | 12 | 12 | 17 |
| forceBarrier | 9 | 9 | 13 |
| conjureMatter | 14 | 14 | 19 |
| terrainEdit | 5 | 5 | 5 |
| surfaceState | 16 | 16 | 18 |
| fluidSource | 5 | 5 | 6 |
| fluidSink | 1 | 1 | 1 |
| fluidMove | 1 | 1 | 5 |
| gasVolume | 7 | 7 | 8 |
| gasDisperse | 1 | 1 | 1 |
| windField | 4 | 4 | 6 |
| weatherOverride | 3 | 3 | 3 |
| lightEmit | 24 | 24 | 26 |
| darken | 4 | 4 | 4 |
| growth | 2 | 2 | 3 |
| decay | 2 | 2 | 2 |
| bodyTransform | 16 | 16 | 20 |
| animate | 6 | 6 | 6 |
| objectTransform | 2 | 2 | 2 |
| magicSuppress | 2 | 2 | 2 |
| magicEnd | 3 | 3 | 3 |
| extraplanarHold | 5 | 5 | 5 |
| castStored | 3 | 3 | 3 |
| **total** | 206 listings | 206 | **257** |

**Instances by basis:** srd 202; deus 55 (R2 25, R4 12, R5 7, R3 5, DEC-018 6). **By ledger mode:** none 169, source 26, sink 1, transform 30, relocate 7, policy 24. **magical:** true 151, false 106. **Triggers:** onCast 98, continuous 101, perRound 14, onImpact 13, onTrigger 10, onCommand 9, onHit 6, onEnd 5, onDestroyed 1. 159 instances carry a lifetime, 40 an energy block.

**Tuning.** 22 parameters (PM_DEFAULT 7, PLACEHOLDER 13, OWNER_OPEN 2: the two `secondsPerTick`); damage-class table 13 rows (PM_DEFAULT 10, PLACEHOLDER 1 acid, OWNER_OPEN 2 necrotic and radiant); material-class table 12 rows (PM_DEFAULT 5, PLACEHOLDER 5, OWNER_OPEN 2 precious metal and gem); time-domain table 9 rows (PM_DEFAULT, a tag only).

**ADR-003 §18.6 mapping** (`primitives.json`): 16 primitives map to a row (12 named by the row, 4 inferred: extinguish, fluidMove, weatherOverride, darken); 12 have no row and are listed as gaps (forceBarrier, surfaceState, gasVolume, gasDisperse, windField, bodyTransform, animate, objectTransform, magicSuppress, magicEnd, extraplanarHold, castStored). Audit gaps carried: G-TEMP (heatFlux, freezeFluid), G-GAS (gasVolume, gasDisperse), G-LIGHT (lightEmit, darken).

**Validator and tests.** 26 rule groups (`ruleSchema` plus 25 cross-file rules), 47 negative fixtures (every rule group has at least one; `every_rule_has_a_negative_fixture` checks it), 40 mutants (26 rule-off mutants, one per rule group, plus 14 targeted ones including `schema_ignores_additionalProperties`): **40 of 40 killed**, 98 of 98 checks pass.

## 4. Changes versus the audit's draft schema (§3.6, `SRD_SPELL_EFFECT_AUDIT.md:567-1012`)

| Change | Reason |
|---|---|
| The root is a file (`schemaVersion`, `baseline`, `tuning`, `primitives`, `records[]`), not one record per document; `$id` renamed from `spell_effect.draft.json`; `schemaVersion` `deus-spell-effect/1.0.0` added | brief deliverable 1; one validated file of all records |
| JSON-pointer strings (`/area/0`) replaced by `{"srdRef": "<spell>.<field>[i]"}` into the promoted baseline, with an optional `unit` checked against the measure | brief format (`fireball.damage[0]`); a pointer must resolve in `srd_baseline.json`; units catch wrong indexes |
| Every SRD number in the draft's params and worked examples became a pointer: `thicknessIn` 6/3, `panels` 10, `volumeGallons` and `perSlotAboveGallons` 10, `massLimitLb`, `distanceFt`, `widthFt` 10, fissure `count` "1d6" and `depthDice`, `thawAfterSeconds`, `dispelsDarknessUpToLevel`, gas `disperse` mph and rounds, light `brightFt`/`dimFt` | R1 and the brief: no SRD number in effect data. The baseline gained `measures` (every number phrase of a description as an exact quote) so these have something to point at |
| DEUS numbers moved to `tuning.json` by name: `movementCostFactor` 2 (dropped: difficult terrain is the SRD rule; spell-specific costs point at SRD measures), freeze `maxDepthFt` 2 (`freeze.maxDepthFromCold`), `coefficientRef` strings (now `tuningRef` objects) | one tuning table; effect data carries no literal |
| heatFlux `sign: 1/-1` became `direction: add/remove`; forceBarrier `immuneToDamage` became `invulnerable` | no numeric literal in effects; a flag named like "damage" would trip the damage-literal rule |
| `basis: added` renamed `deus`; `deus` requires `deusRule` (an audit §3.1 rule or DEC-018) and `deusReason`; `srdQuote` is required for `srd` and forbidden for `deus` | brief ("`deus` with a reason") |
| `trigger` lost `perTick`, gained `continuous`, `onHit`, `onCommand`; `schedule` (SRD round numbers by pointer) added | Q2: nothing may be tick-driven while the tick is unset; the SRD's own round structure (Storm of Vengeance) |
| `key` added to every instance; `ownerOpen` notes and `notes` added to records | stable references for fixtures and SIM.60.04; Q3/Q4 "yes-only" primitives are notes, not data (brief) |
| `params` required and closed for all 28 primitives (the draft had 14 definitions covering 15 primitives); new for the other 13: fluidMove, windField, weatherOverride, darken, growth, decay, bodyTransform, animate, objectTransform, magicSuppress, magicEnd, extraplanarHold, castStored | R11: a closed object per primitive leaves no room for a hook |
| volumeDamage `damageType` removed (read from the pointed-at damage entry; the physical class is `tuning.json` `tables.damageClass`), `attenuation: materialTable` const removed (always SIM.40.01's table), `selection` added | no copied SRD type; SIM.40.01 §8.3 owns the tables |
| forceBarrier `destroyedBy` strings became objects with an exact `breakerQuote` and a `threshold` pointer; `bearsLoad` (and conjured `flammable`, light `heat`) became a flag: boolean or `{"ownerOpen": "Q4", "item": ...}` | Prismatic Wall's SRD thresholds; Q4 held as data |
| conjureMatter `material` dropped `metal`, `gem`, `wood` and added `plants`, `thorns`, `vegetableMatter`, `anyNonMagicObject`; `spanRule` free text became `span` pointer + `spanQuote`; `permanence` may be an Owner-open value | metal and gem are finite families the ledger refuses as a magic source (Q1 `finiteFamilyMatter`); wood was unused |
| footprint number fields became `dims` of pointers; `srdQuote` in footprints removed; `count`, `movesWith` and origins `aboveCaster`, `object`, `creature` added | R1 |
| lifetime `srd: "/duration"` / `seconds + srdQuote` became `duration` (a pointer, or an SRD turn-relative term) and a required `timeDomain`, checked against `tables.timeDomain` | Q2: SRD seconds plus a tag; no literal seconds |
| ledger `family` enum (stone, soilSediment, organics, water, metal, mixed) and free-text `fromForm`/`toForm` replaced by ledger `class`/`form` of `ledger_defaults.js` and `moves` naming transform rows; modes `relocate` and `policy` added; `q1Case` and `downstream` added; `provenanceTag` renamed `provenance`; `cause` limited to 200 characters | brief: every ledger name and class must exist in `ledger_defaults.js`; LEDGER_API §4.2 cause limit; Q1 as a table |
| Worked examples: Wall of Stone `magical` false → true | audit §3.4 names a non-permanent Wall of Stone as a magical effect, and the SRD Antimagic Field makes objects "created by magic" wink out; it becomes mundane when permanent |
| Worked examples: Earthquake fissures `trigger: perRound` → `onCast` with `delay: startOfCastersNextTurn` | the SRD opens the fissures once, at the start of the caster's next turn |
| Worked examples: Wall of Stone variant ids `panels10x10`/`panels10x20` → `thickPanels`/`thinPanels` | the ids repeated SRD numbers |

## 5. Disagreements and findings

**Audit JSON versus `spells.json`:** none (0 of 2,972 fields, 0 of 391 quotes). Nothing was fixed silently.

**ADR-003 Rev 3 §18.6 (PROPOSED, `docs/adr/ADR-003_sim_render_split_and_lod.md:1810-1828`) versus the audit's primitives:**
1. The row "impulse / blast" maps impulse to volume damage (`:1819`). The audit's impulse is also lifts, holds and inverted gravity (Levitate, Telekinesis, Reverse Gravity), which are unit and object movement (WG.00.19, GP.07.02), not volume damage.
2. The row "ignite, heat flux" puts heat flux under Fire (`:1818`); the audit also needs Environment (SIM.50.06) and a stored temperature field (G-TEMP) for chilling, melting and drying.
3. The row "light; growth / decay" says light is presentation (`:1823`); the audit needs a simulation light field (G-LIGHT) for vision and darkness.
4. 12 primitives have no row (§3); 4 are covered only by inference (§3).
5. The row's "burning is a named sink (§7.9)" has no counterpart in `ledger_defaults.js`, which declares no gas or outgas sink (`LEDGER_API.md` §10 notes the same; `PROPOSED-V-06`).
6. The ADR calls the conjured-matter question Q19; the audit calls it Q1. Same question.

**Audit conservation values versus `ledger_defaults.js`** (the ledger is the brief's authority for names; the audit's classification is kept, and these are the places the ledger's tables give a different entry):
- Animate Dead, Create Undead, Finger of Death, Raise Dead, Revivify: the audit says `transform` (remains to creature). In the ledger a body is the `creature` form alive or dead (row `remains`, biomass creature → humus, `ledger_defaults.js:98`), so these move no matter: ledger `none` with a note.
- Passwall: the audit says `transform` (suppressed and restored). The ledger has no held form; ledger `none` with a note (`PROPOSED-V-04`).
- Disintegrate: the ledger has no dust class; moves to sediment and humus with `row: null`, gap `PROPOSED-V-03`.
- Blast damage to wood: `break` exists for stone only (`ledger_defaults.js:80`); wood moves use `row: null`, gap `PROPOSED-V-01`.
- Awaken (plant to creature) and Simulacrum (snow to creature to meltwater): no row; gap `PROPOSED-V-02`. Animate Objects keeps the object form (the ledger has no creature form for wood, stone or metal; `PROPOSED-V-07`).
- Flesh to Stone and petrification: organic to stone crosses families, which the ledger refuses as a transform (`E_FAMILY`); ledger `policy` under Q1(c).
- Blight: the dead plant stays biomass in object form, so ledger `none` with downstream `litter`, `fell`, `burn`.

**Audit internal:** §4.4 gives `castStored` no SIM.60.03 phase (`SRD_SPELL_EFFECT_AUDIT.md:1405-1414`); `primitives.json` records `phase: null` (`PROPOSED-V-09`).

**Sibling designs** (reviewed, on main):
- SIM.40.01 §8.2 (`tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md:576`): the `Volume.damage` event `{centre, radiusHf, energy, damageType, falloff, propagation, srdArea, source}` is fed by this schema (energy = the pointed-at damage × `volume.perDamage.<type>`, which is 1 as in §8.2; type from the pointer; falloff from the effect or `volume.falloff.default`; propagation and SRD area from the footprint). `radiusHf` is a runtime conversion from SRD feet. Its physical classes fire/impact/cold/none are `tables.damageClass`.
- SIM.40.01 names forms `STRATUM_NATURAL`, `STRATUM_BUILT`, `LOOSE`, `HELD`, `BODY` and families `mineral`, `organic`, `metal:<element>`, `water` in kg (§9.1, `:664-678`); the ledger on main uses classes and forms in `mu` (`ledger_defaults.js`). This data uses the ledger's names. SIM.40.01's `conjured_stone` material is the ledger class `stone`; its source name `conjured:wall-of-stone` (§9.2 row 12, `:695`) is `magic` with cause `spell:srd:spell:wall-of-stone` here.
- SIM.40.05 (`tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md`): its CONJURED source and sink (`:424`) are the ledger's `magic`; Gentle Repose pausing the remains clock (`:386`) is `decay` mode `pause`; Creation residue sunk at expiry (`:424`) is the provenance-following paired sink; Fabricate on rubble (`:690`) is now in Fabricate's moves (`pick`, `build`).

**Brief citation:** the brief cites "Owner ruling D-5 'ore never respawns'". `docs/OWNER_DECISIONS.md` has no D-5; D-5 is an open decision item in `docs/audits/LIVING_WORLD_GAP_AUDIT.md:803`. The no-ore rule stands anyway on LIFE-002 (`docs/RISK_REGISTER.md:61`), ADR-003 §7.8 and `ledger_defaults.js` (ore only from world generation), so no escalation was needed.

**Inputs read beyond the brief's list:** `game/data/srd51/rules.json` (read only), for two SRD sentences effects need: "A round represents about 6 seconds in the game world." (`srd:rule:combat-the-order-of-combat`, the seconds conversion) and the petrified condition's weight sentence (`srd:condition:petrified`, Flesh to Stone and Prismatic Spray). The audit lists `rules.json` as an input (§1.1). Its sha256 is recorded in the baseline.

**The SIM.60.01 review's minor findings** (`tasks/SIM.60.01/lane-p/review_grok_c9d1ed86.md`):
- Finding 1 (quotes with an ellipsis are not one substring): folded in. Every quote field here must be an exact substring of the spell's SRD text (`SRD_QUOTE_INEXACT`), and `fixture_srd_quote_ellipsis` shows an ellipsis quote failing.
- Finding 2 (Control Water and Storm of Vengeance list `volumeDamage` with `falls/flows-down`): folded in. Their volume damage is objects-only with `propagateDown: false` (the vortex and the acid rain and bolts on objects).
- Finding 3 (WBS row statuses and `SIM.00.00`): not schema-related, and WBS files are outside this lane's write set; not folded.

## 6. Owner questions (copied; none answered)

From `docs/audits/SRD_SPELL_EFFECT_AUDIT.md` §5-§6 (`:1434-1522`). Where they live in the data is in the README's table.

- **Q1. Conjured matter and the conservation ledger (DEC-018 open sub-question).** Options (audit §5): **A** PM default: an explicit magical source or sink with a named cause, logged like rain and evaporation, temporary matter with a paired sink at the end; **B** borrowed matter drawn from the surroundings as a transform; **C** temporary only: all conjured matter is magical and vanishes; **D** outside the ledger; **E** hybrid: permanent matter an A-style source, temporary matter a magical form outside Q-MASS tracked by provenance. Parts:
  - **Q1(a)** permanent conjured matter (Create Water, Create Food and Water, Goodberry, a permanent Wall of Stone, Wish's object, Plant Growth's yield): a named source, and limits?
  - **Q1(b)** temporary matter that leaves its area or changes form (flood water, melt, storm rain, Creation's metal, feast food): does the sink follow it, leave it, or does it become permanent?
  - **Q1(c)** mass changes of bodies and objects (Enlarge/Reduce, petrification, polymorph forms, new or restored bodies): does the ledger track creature tissue, and does the SRD weight bear on floors?
  - **Q1(d)** planar travel and extradimensional storage: ledger imports and exports?
  - **Q1(e)** summoned bodies: outside Q-MASS? Does Conjure Elemental consume its matter?
  - Held as `tuning.json` `conjuredMatterPolicy` (five cases, each the PM default `magic` source and sink with provenance, status `PM_DEFAULT_UNCONFIRMED`); `ownerQuestions.Q1`, which adds the item `finiteFamilyMatter` (Creation's precious metals, gems, adamantine and mithral, and Wish's object; the ledger defaults refuse a magic source for finite families, so these are not in the effect data); two `{"ownerOpen": "Q1", ...}` permanence values (Ice Storm's hail, Sleet Storm's ground ice); and 5 record `ownerOpen` notes. Every conjured-matter ledger entry names a case, never a source name.
- **Q2. Time scale for spell durations.** The sources disagree (`tasks/SIM.60.01/lane-p/escalation.md`). Options, by source: the world clock of `DEUS_Core.js:59-61` and ADR-003 Rev 2 §3.2; the VISION V46 and V101 beat; a separate SRD action clock (`docs/SRD5_1_INTEGRATION.md:66`); another rate the Owner sets. Sub-question: do SRD rounds and minutes run on a separate action clock or on one world clock? Held as `secondsPerTick.action` and `secondsPerTick.historical`, both `null`, `OWNER_OPEN`. No rate is written anywhere in this lane's files.
- **Q3. Damage types DEC-018 does not name.** Options for each: no physical effect beyond the SRD, or an effect the Owner specifies. Items: acid corrosion; lightning conduction through water or metal; necrotic areas killing plants; radiant and sunlight effects on plants; thunder damaging structures beyond Shatter and Thunderwave. Held as `ownerQuestions.Q3`, 12 record `ownerOpen` notes on 10 records, and the necrotic and radiant damage classes (`null`, `OWNER_OPEN`).
- **Q4. SRD-silent properties of magical substances and barriers.** Options: yes or no (or which, for magical fire). Items: does Grease burn; do Entangle's vines burn; does Wall of Thorns burn; does magical fire (Wall of Fire, Flaming Sphere, Fire Shield, Produce Flame, Flame Blade) consume fuel, leave ash or light tinder; does a horizontal Wall of Force, a Forcecage or a Resilient Sphere bear load; does Reverse Gravity lift loose water; does Flaming Sphere fall into a shaft; does a Resilient Sphere fall with its floor. Held as `ownerQuestions.Q4`, 12 `{"ownerOpen": "Q4", ...}` values in effect params (flammable, bearsLoad, heat) and 14 `ownerOpen` notes on 12 records; `OWNER_OPEN_REF` rejects a yes-only primitive in the data (`fixture_owner_open_answered_in_data`).

## 7. Proposed follow-ups (not WBS ids; the PM decides)

| Id | Proposal |
|---|---|
| PROPOSED-V-01 | Ledger row breaking non-stone solids (wood, timber) into loose debris under blast or impact (SIM.40.01's "broken timber"). |
| PROPOSED-V-02 | Ledger rows between remains or other matter and creature bodies (awakened plants, a simulacrum's snow) and back. |
| PROPOSED-V-03 | A dust class, or a mapping of dust to existing mineral and organic classes, for Disintegrate. |
| PROPOSED-V-04 | A held form for spell-suppressed matter (Passwall). |
| PROPOSED-V-05 | A form, or a named import and export, for extradimensional storage (after Q1(d)). |
| PROPOSED-V-06 | A named gas or outgas sink so burning closes (ADR-003 §7.9; LEDGER_API Q5). |
| PROPOSED-V-07 | A creature form or rule for animated objects (Animate Objects, True Polymorph object forms). |
| PROPOSED-V-08 | G-TEMP: a stored per-cell and per-object temperature field (21 heatFlux and 3 freezeFluid instances here); sets the `heat.*` and `freeze.*` placeholders. |
| PROPOSED-V-09 | Assign `castStored` to a SIM.60.03 phase (audit §4.4 omits it); phase A with the other meta primitives is the natural fit. |
| PROPOSED-V-10 | ADR-003 §18.6 rows for the 12 unmapped primitives and the 4 inferred ones (the ADR's owner). |
| PROPOSED-V-11 | G-GAS: gas and smoke volumes (density, drift, wind dispersal, sinking through openings). |
| PROPOSED-V-12 | G-LIGHT: a simulation light field for vision and darkness, separate from WG.00.18 presentation. |
| PROPOSED-V-13 to -18 | SIM.60.03 phases A to F as in the README (each behind its world system; Q2 before any timed effect ships, Q1 before phase E). |
| PROPOSED-V-19 | SIM.60.04 fixtures keyed to effect keys: fireball floor breach (`fireball#blast`), flood down a stairwell (`control-water#floodWater`), lake freeze (`cone-of-cold#freezeWater`, `freezing-sphere#freezeWater`), wall of stone against the mass ledger (`wall-of-stone#thickPanels`), SRD stat invariance, Cloudkill down a shaft, Gust of Wind on a torch and a Fog Cloud, Antimagic Field gapping a Wall of Fire, Dispel Magic on a non-permanent Wall of Stone, Silence protecting objects from Shatter, Creation metal after smelting (after Q1). |
| PROPOSED-V-20 | Before any record becomes gameplay input, verify it against the rendered SRD page (the readiness policy: 317 of the 319 spells are `parsed`, not `verified`). |
| PROPOSED-V-21 | Set the SIM.40.01-owned placeholders (`volume.materialTables`, `ignite.threshold`) and `wind.fanFactor` with their owners on the SIM.60.04 fixtures (ADR Q18). |

## 8. Limits and known problems

- The effect data is design on top of the SRD. The `srd` parts are exact quotes; the `deus` parts (55 instances) are additions under the audit's rules and are not SRD. Parameters such as `falloff`, `excludeWornCarried`, `vertical` and `propagation` are readings of the SRD text, checked by eye, not by a rule.
- `measures` are found by a regular expression. A number the pattern misses cannot be pointed at (and would not be caught if typed as a word); every measure the data points at was checked through its unit. Measures are indexed by position, so a change to the extractor or to a description moves indexes; the unit check and `--check` catch that, and fixing it means re-pointing.
- Two negative fixtures necessarily contain a tick count (`tick_count_field.json`: `"ticks": 17`; `tick_text.json`: "TEST: lasts 5 ticks") so that the Q2 rules can be seen to reject them. Neither is a rate; no rate, calendar length or day/year ratio appears in the schema, data, tuning, catalogue, README or code.
- The time-domain tag table (`tables.timeDomain`, PM_DEFAULT) assigns rounds, minutes and hours to `action` and days and longer to `historical`. It sets no rate, but if the Owner rules one clock (Q2 `actionClock`), the table becomes moot.
- The validator implements a JSON Schema subset (no `patternProperties`, `$dynamicRef`, `format`, `unevaluatedProperties`, and others); it rejects a schema that uses one (`SCHEMA_KEYWORD`). The schema was not also run through an external validator such as ajv in this lane.
- `SRD_NUMBER_COPIED` compares against the numbers of the record's own spell; a number from another spell's text would not be caught by that rule (the schema still allows no numeric literal in an effect).
- The mutation suite takes about 20 seconds; each mutant is killed by the first failing check, recorded on its PASS line.
- Not done here (out of scope): any runtime (SIM.60.03), fixtures against a running world (SIM.60.04), verification of SRD records against the PDF, WBS or status edits.

## 9. Scope

Run at `2e98544d3d344396ea809cc7e09ffcf9125e45af` (the commit that added this report; the only later commit changes this file, `tasks/SIM.60.02/lane-v/REPORT.md`, which is already in the list):

```
$ git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD
docs/schemas/spells/.gitattributes
docs/schemas/spells/README.md
docs/schemas/spells/effects.json
docs/schemas/spells/primitives.json
docs/schemas/spells/spell_effect.schema.json
docs/schemas/spells/srd_baseline.json
docs/schemas/spells/tuning.json
tasks/SIM.60.02/lane-v/BRIEF.md
tasks/SIM.60.02/lane-v/REPORT.md
tasks/SIM.60.02/lane-v/evidence/gate_fresh_clone.txt
tasks/SIM.60.02/lane-v/evidence/gate_worktree.txt
tasks/SIM.60.02/lane-v/lane.json
tasks/SIM.60.02/lane-v/launches/20260926_070925_prompt.txt
tools/spells/fixtures/baseline_tampered.json
tools/spells/fixtures/catalogue_systems_changed.json
tools/spells/fixtures/catalogue_unmapped.json
tools/spells/fixtures/coverage_duplicate_record.json
tools/spells/fixtures/coverage_missing_record.json
tools/spells/fixtures/coverage_none_record.json
tools/spells/fixtures/coverage_unknown_spell.json
tools/spells/fixtures/effect_key_duplicate.json
tools/spells/fixtures/effect_script_hook.json
tools/spells/fixtures/finite_family_source.json
tools/spells/fixtures/ledger_cause_other_spell.json
tools/spells/fixtures/ledger_class_unknown.json
tools/spells/fixtures/ledger_downstream_unknown.json
tools/spells/fixtures/ledger_gap_unlisted.json
tools/spells/fixtures/ledger_mode_wrong.json
tools/spells/fixtures/ledger_row_unknown.json
tools/spells/fixtures/ledger_sink_name_unknown.json
tools/spells/fixtures/ledger_source_no_cause.json
tools/spells/fixtures/ore_output_source.json
tools/spells/fixtures/ore_output_transform.json
tools/spells/fixtures/owner_open_answered_in_data.json
tools/spells/fixtures/owner_open_unknown.json
tools/spells/fixtures/primitive_audit_missing.json
tools/spells/fixtures/primitive_unknown.json
tools/spells/fixtures/primitive_wrong_system.json
tools/spells/fixtures/q1_case_unknown.json
tools/spells/fixtures/q1_policy_decided.json
tools/spells/fixtures/record_script_hook.json
tools/spells/fixtures/schema_keyword_unsupported.json
tools/spells/fixtures/schema_missing_magical.json
tools/spells/fixtures/seconds_per_tick_set.json
tools/spells/fixtures/srd_field_literal.json
tools/spells/fixtures/srd_number_in_text.json
tools/spells/fixtures/srd_number_literal.json
tools/spells/fixtures/srd_quote_ellipsis.json
tools/spells/fixtures/srd_quote_inexact.json
tools/spells/fixtures/srdref_other_spell.json
tools/spells/fixtures/srdref_unresolved.json
tools/spells/fixtures/srdref_wrong_kind.json
tools/spells/fixtures/srdref_wrong_unit.json
tools/spells/fixtures/systems_mismatch.json
tools/spells/fixtures/tick_count_field.json
tools/spells/fixtures/tick_text.json
tools/spells/fixtures/tick_trigger.json
tools/spells/fixtures/time_domain_wrong.json
tools/spells/fixtures/tuning_ref_unknown.json
tools/spells/fixtures/variant_unknown.json
tools/spells/test_spell_effects.js
tools/spells/validate_spell_effects.js
EXIT=0

$ git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD -- game
EXIT=0

$ git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD | node scope_check.js   (temp script: each path against lane.json allowedPaths as globs)
paths 62, outside allowedPaths 0, {"docs/schemas/spells/**":7,"status A":62,"tasks/SIM.60.02/**":6,"tools/spells/**":49}
EXIT=0
```

Every path matches `docs/schemas/spells/**` (7), `tools/spells/**` (49) or `tasks/SIM.60.02/**` (6); the diff for `game` is empty. `BRIEF.md`, `lane.json` and the launch prompt were added by the PM and ops commits on this branch (`aae105cd`, `62a43b38`), not by the writer. The same scope checker, fed four probe paths, reported `game/data/x.json` and `tools/other/x.js` as OUTSIDE and exited 1, so it can fail.

Commits on this branch since the base, the PM and ops commits included (pasted from `git log --format="%h %s" 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD`):

```
2e98544d [claude] SIM.60.02 REPORT.md and raw gate evidence (worktree and fresh CRLF-default clone at 357df39c)
357df39c [claude] SIM.60.02 README, LF attributes, Fabricate rubble moves
0489663c [claude] SIM.60.02 WIP: time-domain rule, Q3 classes open, magical-fire consistency
4d94f2b6 [claude] SIM.60.02 WIP: test suite, 46 negative fixtures, 39 mutants
4ef87756 [claude] SIM.60.02 WIP: schema, tuning, primitive catalogue and effect data for 121 records
d6dd9bfd [claude] SIM.60.02 WIP: validator skeleton and generated SRD baseline
62a43b38 [ops] SIM.60.02 lane-v launch prompt 20260926_070925 (writer claude)
aae105cd [pm] Open lane-v (SIM.60.02): BRIEF.md and lane.json
```

The final pushed commit is given by the last line of the writer's session output (`FINAL SHA: ...`), pasted from `git rev-parse HEAD` after the push.
