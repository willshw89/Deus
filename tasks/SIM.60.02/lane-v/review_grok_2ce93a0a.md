# Grok review — SIM.60.02 Lane V (spell-effect schema, baseline, effects, tuning, validator)

Reviewed commit, pasted from `git rev-parse`:

2ce93a0a8602d2957f28df3fda801f95e6ff433b

Branch `task/lane-v`. Writer tip subject: `[claude] SIM.60.02 REPORT.md: scope check of every changed path against allowedPaths`. Checks ran in a fresh clone at `C:\Users\snewt\AppData\Local\Temp\lane-v-review-2ce93a0a` (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach 2ce93a0a8602d2957f28df3fda801f95e6ff433b`). The live worktree was not used for the diff, the gates, or the spot checks. The clone was deleted after the checks. No art was generated.

## Tip check (live worktree)

```
git rev-parse HEAD origin/task/lane-v
2ce93a0a8602d2957f28df3fda801f95e6ff433b
2ce93a0a8602d2957f28df3fda801f95e6ff433b
EXIT=0

git log -12 --format="%H %an %s"
2ce93a0a8602d2957f28df3fda801f95e6ff433b deus-claude [claude] SIM.60.02 REPORT.md: scope check of every changed path against allowedPaths
2e98544d3d344396ea809cc7e09ffcf9125e45af deus-claude [claude] SIM.60.02 REPORT.md and raw gate evidence (worktree and fresh CRLF-default clone at 357df39c)
357df39ca5c9f909bec0a65a1cd1ba24dc89b5cc deus-claude [claude] SIM.60.02 README, LF attributes, Fabricate rubble moves
0489663c4e84436c5b54a725ad05f95c9e81e993 deus-claude [claude] SIM.60.02 WIP: time-domain rule, Q3 classes open, magical-fire consistency
4d94f2b6e46bd5b400b44dc511ff76491162e725 deus-claude [claude] SIM.60.02 WIP: test suite, 46 negative fixtures, 39 mutants
4ef87756729c1f61799e4040b0a12c2b1cb7516a deus-claude [claude] SIM.60.02 WIP: schema, tuning, primitive catalogue and effect data for 121 records
d6dd9bfd7d179ccdb5b8d09aee85e29240468dca deus-claude [claude] SIM.60.02 WIP: validator skeleton and generated SRD baseline
62a43b38719d314da8ae1043e605299bcab7f3fb snewt [ops] SIM.60.02 lane-v launch prompt 20260926_070925 (writer claude)
aae105cd5a4aba668cfec6ce9e05471a2ddec091 snewt [pm] Open lane-v (SIM.60.02): BRIEF.md and lane.json
425b594c146d5f353c10faa11f4b5d47f499b45f snewt Merge task/lane-g1: WG.00.12b merge-gate/check_claims/launcher trust (PM manual merge; Grok VERDICT CLEAN PASS at c51ebb4e)
72f4d8a4519bc79d794a38dbb00635d9e0b4a49f deus-grok [grok] WG.00.12b review c51ebb4e
c51ebb4e22a51c5f981612d0a9f97db9b55c0f28 deus-claude [claude] WG.00.12b REPORT.md: scope check of every changed path against allowedPaths
EXIT=0
```

HEAD matched the reviewed tip, so the review continued. `git status --short` in the same invocation printed only an untracked launcher prompt, `tasks/SIM.60.02/lane-v/launches/20260926_081645_prompt.txt`. That file is not in the reviewed commit and was left unstaged.

## Clone

```
git clone -c core.autocrlf=false C:\Users\snewt\.deus_worktrees\lane-v C:\Users\snewt\AppData\Local\Temp\lane-v-review-2ce93a0a
EXIT=0
git checkout --detach 2ce93a0a8602d2957f28df3fda801f95e6ff433b
HEAD is now at 2ce93a0a [claude] SIM.60.02 REPORT.md: scope check of every changed path against allowedPaths
git rev-parse HEAD
2ce93a0a8602d2957f28df3fda801f95e6ff433b
EXIT=0
```

## Scope

`lane.json` allowedPaths: `docs/schemas/spells/**`, `tools/spells/**`, `tasks/SIM.60.02/**`.

`git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f 2ce93a0a8602d2957f28df3fda801f95e6ff433b` (tabs rendered as `<TAB>`). EXIT=0. 62 paths, every one status `A`.

```
A<TAB>docs/schemas/spells/.gitattributes
A<TAB>docs/schemas/spells/README.md
A<TAB>docs/schemas/spells/effects.json
A<TAB>docs/schemas/spells/primitives.json
A<TAB>docs/schemas/spells/spell_effect.schema.json
A<TAB>docs/schemas/spells/srd_baseline.json
A<TAB>docs/schemas/spells/tuning.json
A<TAB>tasks/SIM.60.02/lane-v/BRIEF.md
A<TAB>tasks/SIM.60.02/lane-v/REPORT.md
A<TAB>tasks/SIM.60.02/lane-v/evidence/gate_fresh_clone.txt
A<TAB>tasks/SIM.60.02/lane-v/evidence/gate_worktree.txt
A<TAB>tasks/SIM.60.02/lane-v/lane.json
A<TAB>tasks/SIM.60.02/lane-v/launches/20260926_070925_prompt.txt
A<TAB>tools/spells/fixtures/baseline_tampered.json
A<TAB>tools/spells/fixtures/catalogue_systems_changed.json
A<TAB>tools/spells/fixtures/catalogue_unmapped.json
A<TAB>tools/spells/fixtures/coverage_duplicate_record.json
A<TAB>tools/spells/fixtures/coverage_missing_record.json
A<TAB>tools/spells/fixtures/coverage_none_record.json
A<TAB>tools/spells/fixtures/coverage_unknown_spell.json
A<TAB>tools/spells/fixtures/effect_key_duplicate.json
A<TAB>tools/spells/fixtures/effect_script_hook.json
A<TAB>tools/spells/fixtures/finite_family_source.json
A<TAB>tools/spells/fixtures/ledger_cause_other_spell.json
A<TAB>tools/spells/fixtures/ledger_class_unknown.json
A<TAB>tools/spells/fixtures/ledger_downstream_unknown.json
A<TAB>tools/spells/fixtures/ledger_gap_unlisted.json
A<TAB>tools/spells/fixtures/ledger_mode_wrong.json
A<TAB>tools/spells/fixtures/ledger_row_unknown.json
A<TAB>tools/spells/fixtures/ledger_sink_name_unknown.json
A<TAB>tools/spells/fixtures/ledger_source_no_cause.json
A<TAB>tools/spells/fixtures/ore_output_source.json
A<TAB>tools/spells/fixtures/ore_output_transform.json
A<TAB>tools/spells/fixtures/owner_open_answered_in_data.json
A<TAB>tools/spells/fixtures/owner_open_unknown.json
A<TAB>tools/spells/fixtures/primitive_audit_missing.json
A<TAB>tools/spells/fixtures/primitive_unknown.json
A<TAB>tools/spells/fixtures/primitive_wrong_system.json
A<TAB>tools/spells/fixtures/q1_case_unknown.json
A<TAB>tools/spells/fixtures/q1_policy_decided.json
A<TAB>tools/spells/fixtures/record_script_hook.json
A<TAB>tools/spells/fixtures/schema_keyword_unsupported.json
A<TAB>tools/spells/fixtures/schema_missing_magical.json
A<TAB>tools/spells/fixtures/seconds_per_tick_set.json
A<TAB>tools/spells/fixtures/srd_field_literal.json
A<TAB>tools/spells/fixtures/srd_number_in_text.json
A<TAB>tools/spells/fixtures/srd_number_literal.json
A<TAB>tools/spells/fixtures/srd_quote_ellipsis.json
A<TAB>tools/spells/fixtures/srd_quote_inexact.json
A<TAB>tools/spells/fixtures/srdref_other_spell.json
A<TAB>tools/spells/fixtures/srdref_unresolved.json
A<TAB>tools/spells/fixtures/srdref_wrong_kind.json
A<TAB>tools/spells/fixtures/srdref_wrong_unit.json
A<TAB>tools/spells/fixtures/systems_mismatch.json
A<TAB>tools/spells/fixtures/tick_count_field.json
A<TAB>tools/spells/fixtures/tick_text.json
A<TAB>tools/spells/fixtures/tick_trigger.json
A<TAB>tools/spells/fixtures/time_domain_wrong.json
A<TAB>tools/spells/fixtures/tuning_ref_unknown.json
A<TAB>tools/spells/fixtures/variant_unknown.json
A<TAB>tools/spells/test_spell_effects.js
A<TAB>tools/spells/validate_spell_effects.js
```

| Prefix | Paths | In allowedPaths |
|---|---|---|
| `docs/schemas/spells/**` | 7 | yes |
| `tasks/SIM.60.02/**` | 6 | yes |
| `tools/spells/**` | 49 (47 fixtures, `test_spell_effects.js`, `validate_spell_effects.js`) | yes |
| Total | 62 | yes |

Forbidden-path diffs, same two commits, each EXIT=0 and empty:

```
git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f 2ce93a0a8602d2957f28df3fda801f95e6ff433b -- game
EXIT=0

git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f 2ce93a0a8602d2957f28df3fda801f95e6ff433b -- docs/audits
EXIT=0

git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f 2ce93a0a8602d2957f28df3fda801f95e6ff433b -- docs/adr
EXIT=0

git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f 2ce93a0a8602d2957f28df3fda801f95e6ff433b -- docs/STATUS.md
EXIT=0
```

`git diff --name-only` of the same range piped through a `WBS` search printed nothing (EXIT=0). `git diff --name-only ... -- tools` piped through a filter that drops `tools/spells/` printed nothing (EXIT=0).

The writer's pasted gates were taken at `357df39ca5c9f909bec0a65a1cd1ba24dc89b5cc`. The diff from that commit to the tip is report and evidence only:

```
git diff --name-status 357df39ca5c9f909bec0a65a1cd1ba24dc89b5cc 2ce93a0a8602d2957f28df3fda801f95e6ff433b
A	tasks/SIM.60.02/lane-v/REPORT.md
A	tasks/SIM.60.02/lane-v/evidence/gate_fresh_clone.txt
A	tasks/SIM.60.02/lane-v/evidence/gate_worktree.txt
EXIT=0
```

Schema, baseline, effects, tuning, catalogue, validator, tests, and fixtures are the same bytes at the tip as at that evidence commit.

## Gate

Run in the clone, foreground, from the clone root. `lane.json` gateTests, in order.

```
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
```

```
$ node tools/spells/validate_spell_effects.js
validated committed data: 121 effect records, 257 primitive instances, 26 rule groups
by basis {"srd":202,"deus":55}; by ledger mode {"policy":24,"none":169,"transform":30,"source":26,"relocate":7,"sink":1}
errors 0
EXIT=0
```

```
$ node tools/spells/validate_spell_effects.js --check
rebuilt docs/schemas/spells/srd_baseline.json from docs/audits/srd_spell_effect_audit.json + game/data/srd51/spells.json + game/data/srd51/rules.json
rebuilt sha256 d84c51d293950786a1d931f208644a0dd5bec6b94a50bbd1d242b7a6457b5702 bytes 499530
committed sha256 d84c51d293950786a1d931f208644a0dd5bec6b94a50bbd1d242b7a6457b5702 bytes 499530
bytes identical: true
baseline spells 319, measures 1683, audit/spells.json fields compared 2972, mismatches 0, quotes checked 391, quote misses 0
EXIT=0
```

```
$ node tools/check_deus_syntax.js
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

These four results match the raw blocks in `tasks/SIM.60.02/lane-v/REPORT.md` (records, instances, basis, ledger modes, baseline sha256, byte length, field and quote counts).

## Spot checks against REPORT

Independent walk of the clone's JSON, plus `require` of `game/js/sim/ledger_defaults.js` and `validate_spell_effects.js` `resolveSrdRef`. Audit record set is `docs/audits/srd_spell_effect_audit.json` (read only).

| Claim | Measured |
|---|---|
| Effect records | 121 |
| Primitive instances | 257 |
| Variants (declared) | 54 |
| `srdRef` pointers | 525, unresolved 0 |
| `tuningRef` pointers | 49 |
| Quote fields (`srdQuote` or key ending in `Quote`) | 283, and 0 fail `entry.text.includes(quote)` against `game/data/srd51/spells.json` |
| JSON numbers in `effects.json` | 0 |
| Dice notation (`NdM`) outside quote fields in `effects.json` | 0 |
| Baseline spells / measure arrays / rule sentences | 319 / 1683 / 2 (`rule:combat-the-order-of-combat`, `condition:petrified`) |
| `spells.json` entries | 327 (319 `spell`, 8 `spell-list`); audit `outOfScope` 8 |
| Audit records needing an effect | 111 physical + 10 `NONE` with a primitive = 121; missing 0, extra 0, duplicate 0 |
| Those 10 `NONE` ids | animate-objects, antimagic-field, contingency, demiplane, dispel-magic, globe-of-invulnerability, magnificent-mansion, mending, rope-trick, secret-chest |
| Records per system | HEAT 23, COLD 10, FORCE 27, WATER 11, EARTH 25, LIGHT 26, LIFE 35, AIR 12, NONE 10. Differs from audit `bySystem` on none of the physical systems |
| Records per primitive | equal to audit `meta.counts.byPrimitive` on all 28 names (diff list empty). Instance counts match REPORT §3 (ignite 29 through castStored 3, sum 257) |
| Basis / magical / lifetimes | srd 202, deus 55; magical true 151, false 106; lifetimes 159 |
| Ledger mode | policy 24, none 169, transform 30, source 26, relocate 7, sink 1 |
| Tuning parameters | 22 (PM_DEFAULT 7, PLACEHOLDER 13, OWNER_OPEN 2) |
| Catalogue primitives | 28 |
| Fixture files | 47 |
| Schema | `$schema` draft 2020-12, `$id` `https://deus.invalid/schemas/spells/spell_effect.schema.json`, `schemaVersion` const `deus-spell-effect/1.0.0`. The only `"number"` types in the schema are tuning-parameter values. Effect objects are closed (`additionalProperties: false` on the instance) |

**Q1–Q4 stay open.** `tuning.json` `ownerQuestions.Q1` through `Q4` are each `status: OWNER_OPEN`. `secondsPerTick.action` and `secondsPerTick.historical` are `value: null`, `status: OWNER_OPEN`, `question: Q2`. The five `conjuredMatterPolicy.cases` rows are `PM_DEFAULT_UNCONFIRMED`, which is the brief's required PM default, with options A–E still listed on each row. Record `ownerOpen` notes: Q1 on 5 records, Q3 on 10 records (12 notes), Q4 on 12 records (14 notes). Inline `{"ownerOpen": ...}` values: Q4 12 (greaseBurns, entangleBurns, thornsBurn, magicalFireFuel, forceBearsLoad), Q1 2 (`temporaryLeavesArea`). A text scan of `docs/schemas/spells` (except the SRD baseline, which holds SRD numbers by design) and `tools/spells` found no tick rate, calendar length, or day/year ratio. The two hits are the negative fixture's own brief line and a validator comment that a year has no length. `1 round = 6 s` appears as the quoted SRD round rule the brief requires, in the baseline rule sentence "A round represents about 6 seconds in the game world."

**LIFE-002 / D-5.** Ledger ore classes are `fe_ore`, `cu_ore`, `ag_ore`, `au_ore`, `pt_ore` (`ledger_defaults.js` sets `ore: true` on those five). None of those names occur in `effects.json`, `tuning.json`, or `primitives.json`. Ledger classes actually used by effects are biomass, humus, rubble, sediment, stone, water, and wood. Conjure sources are food, plants, vegetable matter, stone, crystal, grease, web, ice, and thorns. Wish is `conjureMatter` with material `anyNonMagicObject`, ledger mode `policy`, and no class. Creation has no precious-metal or gem effect. The report's citation that D-5 is an open item at `docs/audits/LIVING_WORLD_GAP_AUDIT.md:803`, and that LIFE-002 is `docs/RISK_REGISTER.md:61`, matches those files. `ledger_defaults.js:80` is the stone-only `break` row; `:98` is the `remains` row.

**DEC-018.** Effect data points at the baseline with `srdRef` (525, all resolved by `resolveSrdRef`) and holds 0 JSON numbers. The `game/` diff is empty, so this commit adds no per-spell code under `game/`. `validate_spell_effects.js` has no `spellId ===` branch.

**DEC-007.** The 62 paths are `.json`, `.js`, `.md`, `.txt`, and `.gitattributes`. This review did not generate, request, or integrate art.

Audit anchors cited by the report were read: schema draft §3.6 is `SRD_SPELL_EFFECT_AUDIT.md:567-1012` (the draft JSON ends at the fence on line 1012); §4.4's phase table (`:1407-1414`) has no `castStored` row; §5–§6 Owner questions are `:1434-1522`; ADR-003 Rev 3 §18.6 is `docs/adr/ADR-003_sim_render_split_and_lod.md:1810-1828` (impulse/blast, ignite and heat flux, light as presentation, conjured matter as Q19).

## Fixtures and mutants actually fail

The suite prints `PASS fixture_*` when the validator rejects the fixture with the expected code. Direct `--fixture` runs in the clone (validator exit is the failure):

```
$ node tools/spells/validate_spell_effects.js --fixture tools/spells/fixtures/ore_output_source.json
ERROR LEDGER_CLASS_UNKNOWN srd:spell:wall-of-stone /effects/0/ledger - material stone maps to stone/object in tuning.json, not fe_ore/object
ERROR ORE_OUTPUT srd:spell:wall-of-stone /effects/0/ledger/class - an effect may not create ore (fe_ore; LIFE-002, D-5)
ERROR LEDGER_SOURCE_SCOPE srd:spell:wall-of-stone /effects/0/ledger/class - source magic may not add to a finite family (fe_ore); the ledger refuses it (allowFinite false)
errors 3 {"LEDGER_CLASS_UNKNOWN":1,"ORE_OUTPUT":1,"LEDGER_SOURCE_SCOPE":1}
EXIT=1
```

```
$ node tools/spells/validate_spell_effects.js --fixture tools/spells/fixtures/srd_number_in_text.json
ERROR SRD_NUMBER_COPIED srd:spell:fireball /effects/3/ledger/note - text "8d6" repeats an SRD value of this spell
errors 1 {"SRD_NUMBER_COPIED":1}
EXIT=1
```

```
$ node tools/spells/validate_spell_effects.js --fixture tools/spells/fixtures/effect_script_hook.json
ERROR SCHEMA_ADDITIONAL srd:spell:fireball /effects/0/onCastScript - property "onCastScript" is not allowed (additionalProperties: false)
errors 1 {"SCHEMA_ADDITIONAL":1}
EXIT=1
```

```
$ node tools/spells/validate_spell_effects.js --fixture tools/spells/fixtures/seconds_per_tick_set.json
ERROR Q2_SECONDS_PER_TICK docs/schemas/spells/tuning.json /parameters/secondsPerTick.action - must stay value null, status OWNER_OPEN, question Q2 (Owner question Q2 is open)
errors 1 {"Q2_SECONDS_PER_TICK":1}
EXIT=1
```

```
$ node tools/spells/validate_spell_effects.js --fixture tools/spells/fixtures/ledger_source_no_cause.json
ERROR SCHEMA_REQUIRED srd:spell:wall-of-stone /effects/0/ledger - missing required property "cause"
ERROR LEDGER_NO_CAUSE srd:spell:wall-of-stone /effects/0/ledger/cause - a ledger source needs a cause
errors 2 {"SCHEMA_REQUIRED":1,"LEDGER_NO_CAUSE":1}
EXIT=1
```

Two further samples, same command form: `srd_quote_inexact` printed `ERROR SRD_QUOTE_INEXACT` for a fireball quote that is not a substring and EXIT=1; `tick_text` printed `ERROR Q2_TICK_LITERAL` and EXIT=1. `tick_text` also printed a Node warning that `NO_COLOR` is ignored because `FORCE_COLOR` is set. That warning comes from this shell's environment. The validator still rejected the fixture.

In-memory mutants (find string occurs once; the file on disk is not edited), each missing the code its fixture expects:

| Mutant | Fixture | Result |
|---|---|---|
| `ruleNoOre` returns immediately | `ore_output_source` | killed; codes left are `LEDGER_CLASS_UNKNOWN`, `LEDGER_SOURCE_SCOPE`; `ORE_OUTPUT` absent |
| `additionalProperties === false` check replaced with `if (false)` | `effect_script_hook` | killed; `SCHEMA_ADDITIONAL` absent |
| numeric `SRD_NUMBER_COPIED` arm replaced with `if (false)` | `srd_number_literal` | killed; `SRD_NUMBER_COPIED` absent (schema type and field-literal errors remain) |
| `secondsPerTick` value check inverted | `seconds_per_tick_set` | killed; error list empty, so `Q2_SECONDS_PER_TICK` is the only check that catches a set value |

The suite's 40 `PASS mutant_*_killed` lines match that behaviour, including `validator_file_unchanged_by_mutation_run`.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

None.

VERDICT: CLEAN PASS
