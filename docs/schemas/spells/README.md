# Spell-effect schema (SIM.60.02)

- **Task:** SIM.60.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`, M3.4) · **Lane:** lane-v · **Decision:** DEC-018 · **Input:** the SIM.60.01 audit (`docs/audits/SRD_SPELL_EFFECT_AUDIT.md`, `docs/audits/srd_spell_effect_audit.json`)
- **Status:** submitted for independent review. Data and a node validator only: no runtime, no file under `game/`, no art.
- **Schema version:** `deus-spell-effect/1.0.0` (`$id` `https://deus.invalid/schemas/spells/spell_effect.schema.json`, JSON Schema draft 2020-12).

DEC-018: SRD 5.1 damage, range, saves, area, duration and casting stay the rules baseline and are never changed; physical consequences are added on top; a spell is data, with no per-spell code. This folder is that data and its contract. SIM.60.03 (the headless runtime) implements it later.

## Files

| File | What it is | Made by |
|---|---|---|
| `spell_effect.schema.json` | JSON Schema of `effects.json`: one record per spell, each a list of primitive instances. `$defs/tuningFile` and `$defs/primitiveCatalogue` validate the two tables below. | by hand |
| `srd_baseline.json` | The structured SRD baseline that effects point into: the `srd` block of every audit record (319 spells), cross-checked against `game/data/srd51/spells.json`, plus every number phrase of each spell's description as a `measures` entry (exact quote, value, unit) and the two SRD rule sentences effects cite (the round length and the petrified weight). | generated (see below) |
| `effects.json` | Effect data for the 111 physical audit records and the 10 `NONE` records that list an entity or meta primitive: 121 records, 257 primitive instances. | data; the committed JSON is the source of truth (see the REPORT for how it was first authored) |
| `tuning.json` | DEUS tuning: named coefficients, the damage-class, material-class and time-domain tables, the Q1 conjured-matter policy table and the Owner questions Q1-Q4 as data. | by hand |
| `primitives.json` | The 28 primitives: audit systems, WBS rows and gaps, SIM.60.03 phase, the ADR-003 §18.6 row each maps to (or the gap), allowed ledger modes; and the ledger gaps (`PROPOSED-V-01` to `-07`). | by hand |
| `.gitattributes` | Keeps LF line ends in every clone, so the baseline rebuild is byte-identical. | by hand |

Tools, in `tools/spells/`:
- `validate_spell_effects.js`: the dependency-free validator (a JSON Schema subset engine plus the cross-file rules below).
- `test_spell_effects.js`: the test suite (negative fixtures, the rebuild check, mutation checks).
- `fixtures/`: one JSON patch per negative case.

## Commands

Run from the repository root:

```
node tools/spells/validate_spell_effects.js                    # validate; exit 0 only with no error
node tools/spells/validate_spell_effects.js --check            # rebuild srd_baseline.json in memory; exit 1 if the committed file differs
node tools/spells/validate_spell_effects.js --fixture tools/spells/fixtures/ore_output_source.json   # show one negative case failing
node tools/spells/test_spell_effects.js                        # PASS/FAIL per check, RESULT line, exit 0 only if all pass
```

**Regenerating the baseline.** `srd_baseline.json` is a pure function of the audit JSON, `spells.json` and `rules.json`. When one of them changes on purpose, run `node tools/spells/validate_spell_effects.js --write-baseline`, then `--check`, then the validator; pointers in `effects.json` that no longer resolve, or whose unit changed, fail the validator. Key order is fixed by the generator, there are no timestamps, and source hashes are taken after folding CRLF to LF.

## How an effect reads

```json
{
  "key": "blast", "primitive": "volumeDamage", "trigger": "onImpact",
  "basis": "deus", "deusRule": "R4", "deusReason": "...", "magical": false,
  "footprint": {"area": {"srdRef": "fireball.area[0]"}, "origin": "point", "vertical": "volume", "propagation": "aroundCorners", "clip": "solid"},
  "energy": {"damage": {"srdRef": "fireball.damage[0]"}, "use": "rolledTotal", "coefficient": {"tuningRef": "volume.perDamage.fire"}},
  "params": {"applyTo": ["objects", "strata", "structures"], "selection": "footprint", "propagateDown": true, "respectImmunityZones": true},
  "ledger": {"mode": "transform", "cause": "spell:srd:spell:fireball", "moves": [{"row": "break", "from": {"class": "stone", "form": "strata"}, "to": {"class": "rubble", "form": "strata"}}]}
}
```

- **Pointers, never numbers.** `{"srdRef": "<spell>.<field>[i]"}` points into the baseline (`area`, `damage`, `save`, `duration`, `measures`, ...); a pointer into `measures` names its unit, which the validator compares. `{"tuningRef": "<name>"}` points into `tuning.json`. `{"srdQuote": "..."}` is a qualitative SRD term (for example "strong wind"). Effect data holds no number at all.
- **basis.** `srd`: the SRD text states the effect, and `srdQuote` is an exact substring of the spell's text in `spells.json`. `deus`: a consequence DEUS adds under a design rule (`deusRule`) with a `deusReason`.
- **magical** (R10). `true`: a live instance owned by the spell (suppressed by `magicSuppress`, ended by `magicEnd`, over when the spell ends). `false`: a mundane consequence that stays as ordinary world state.
- **ledger.** `none` (optionally `downstream` rows other systems use later, such as `transform:burn`), `transform` (moves that are rows of `game/js/sim/ledger_defaults.js`, or `row: null` with a listed gap), `relocate` (matter moves between cells, class and form unchanged), `source` / `sink` (conjured matter: the effect names a Q1 case, a class, a form and a cause; the source or sink name comes from the Q1 policy row) and `policy` (the Q1 row decides the direction and amount: bodies and planar storage).
- **Geometry.** Areas stay in SRD feet. The schema fixes no layer count and no stratum height; the runtime maps feet onto DEC-013's 5-ft cells, 10-ft layers and 2-ft slices (audit §3.5).
- **Lifetimes** are SRD durations by pointer, in seconds (1 round = 6 s, quoted from the SRD rule in the baseline), with a `timeDomain` tag from `tuning.json` `tables.timeDomain`: rounds, minutes and hours are `action`; days, years and "until dispelled" are `historical`. The tag names a clock; it sets no rate.

## Design rules (audit §3.1) and where each is enforced

| Rule | Meaning | Enforced by |
|---|---|---|
| R1 SRD invariance | SRD numbers are pointers, never copied or changed | `SRD_NUMBER_COPIED`, `SRD_FIELD_LITERAL`, `SRDREF_UNRESOLVED`, `SRDREF_KIND`, `BASELINE_STALE`; the schema allows no numeric literal in an effect |
| R2 Fire | Fire damage ignites unattended flammable objects and cells in the area or the direct target; worn or carried items are excluded; creature-only fire ignites nothing | data (`deusRule: R2`); `SRD_QUOTE_INEXACT` for the SRD clauses |
| R3 Lightning | Lightning ignites like fire; conduction is Q3 | data (`R3`); Q3 notes |
| R4 Blast | Volume damage where the SRD damages objects in an area or describes an explosion, burst, eruption or wave; it propagates down with material attenuation | data (`R4`); `ledger` transform rows |
| R5 Cold | Area cold draws heat and freezes exposed shallow water; SRD freeze clauses win | data (`R5`) |
| R6 Light | SRD light gives `lightEmit`, magical darkness `darken`; heat and sunlight only where stated | data |
| R7 Conjured matter | Created matter is a ledger source with a cause; vanishing matter has a paired sink | `LEDGER_NO_CAUSE`, `Q1_CASE_UNKNOWN`, `LEDGER_NAME_UNKNOWN`, `LEDGER_CLASS_UNKNOWN`, `LEDGER_SOURCE_SCOPE`, `ORE_OUTPUT` |
| R8 Creature-only | Effects on creatures only stay `NONE` | `COVERAGE_*`, `SYSTEMS_MISMATCH`, `PRIMITIVE_COVERAGE` |
| R9 Load | Mass changes of bodies and objects bear on floors (SIM.40.01) | data (`bodyTransform` notes; ledger `policy`) |
| R10 Magical versus mundane | Every instance is tagged | schema (`magical` required) |
| R11 No per-spell code | `additionalProperties: false` at record and instance level | `SCHEMA_ADDITIONAL` |

## Validator rules

Every error is printed `ERROR <CODE> <spell or file> <path> - <message>`; the exit code is 1.

| Code | Rejects |
|---|---|
| `SCHEMA_*` | anything the schema forbids, including a per-spell hook (`SCHEMA_ADDITIONAL`) and a schema keyword the in-file engine does not implement (`SCHEMA_KEYWORD`) |
| `COVERAGE_MISSING`, `COVERAGE_UNKNOWN_SPELL`, `COVERAGE_DUPLICATE` | a physical (or entity/meta `NONE`) audit record with no effect record; a record for a spell not in the baseline or not needing one; two records for one spell |
| `SYSTEMS_MISMATCH` | record systems that differ from the audit |
| `PRIMITIVE_UNKNOWN`, `PRIMITIVE_SYSTEM`, `PRIMITIVE_COVERAGE` | a primitive not in `meta.primitiveSystems`; a physical primitive outside the record's systems; a primitive the audit record does not list, or an audit primitive with no instance |
| `KEY_DUPLICATE`, `VARIANT_UNKNOWN` | duplicate instance keys; undeclared or unused variants |
| `SRD_QUOTE_INEXACT` | any `srdQuote` or `*Quote` that is not an exact substring of the spell's SRD text |
| `SRDREF_UNRESOLVED`, `SRDREF_KIND` | a pointer that does not resolve, points into another spell, or has the wrong kind or unit |
| `SRD_NUMBER_COPIED` | a number (or a number or dice in text) equal to an SRD value of that spell |
| `SRD_FIELD_LITERAL` | a field named like damage, range, save, area, duration, castingTime (or radius, length, depth, ...) holding a literal |
| `Q2_TICK_LITERAL`, `Q2_SECONDS_PER_TICK`, `TIME_DOMAIN` | a tick field or tick-driven trigger, text stating a time scale, `secondsPerTick` given a value, a lifetime tagged against the table |
| `LEDGER_NO_CAUSE`, `LEDGER_NAME_UNKNOWN`, `LEDGER_CLASS_UNKNOWN`, `LEDGER_ROW_UNKNOWN`, `LEDGER_SOURCE_SCOPE`, `LEDGER_MODE`, `Q1_CASE_UNKNOWN` | a ledger change without a cause (or naming another spell); a source, sink or row not declared in `game/js/sim/ledger_defaults.js` (read with `require`); a finite-family source; a ledger mode the primitive does not allow; an unknown Q1 case |
| `ORE_OUTPUT` | any source, move or downstream row whose output is an ore class (LIFE-002, D-5) |
| `TUNING_REF_UNKNOWN`, `OWNER_OPEN_REF` | a tuning name that does not exist; an Owner-open value naming no listed item; a Q3/Q4 "yes-only" primitive already in the data |
| `CATALOGUE_MISMATCH` | a catalogue that drifts from the audit meta or the schema enum, or a primitive with neither an ADR-003 §18.6 row nor a gap |
| `BASELINE_STALE` | a committed baseline that differs from the rebuild, or an audit/spells.json disagreement in its cross-check |

## Open Owner questions (held as data, none answered)

| Id | Question | Where it lives |
|---|---|---|
| Q1 (a-e) | Conjured matter and the conservation ledger (DEC-018 open sub-question) | `tuning.json` `conjuredMatterPolicy.cases` (permanent, temporaryLeavesArea, massChangeOfBodies, planarTransfer, summonedBodies: each the PM default, `magic` source and sink with provenance, status `PM_DEFAULT_UNCONFIRMED`); `ownerQuestions.Q1` (plus `finiteFamilyMatter`); effect ledgers name a case, never a source |
| Q2 | Time scale for spell durations | `tuning.json` `secondsPerTick.action` and `.historical`: value `null`, `OWNER_OPEN`; lifetimes are SRD seconds with a time-domain tag |
| Q3 | Physical effects for damage types DEC-018 does not name (acid, lightning conduction, necrotic, radiant, thunder) | `ownerQuestions.Q3`; `ownerOpen` notes on the records; necrotic and radiant damage classes are `null`/`OWNER_OPEN` |
| Q4 | SRD-silent properties of magical substances and barriers | `ownerQuestions.Q4`; `{"ownerOpen": "Q4", "item": ...}` values (flammable, bearsLoad, heat) and `ownerOpen` notes; no yes-only primitive is in the data |

## How SIM.60.03 consumes this (not implemented here)

The runtime is one core system (ADR-003 §18.6, PROPOSED). On a cast command it reads the spell's record, lets the rules layer roll the SRD numbers it points at (unchanged), and turns each instance into calls on other core systems. The audit's phases (§4.4):

| Phase | Primitives | Needs merged first |
|---|---|---|
| A | `ignite`, `extinguish`, `lightEmit`, `darken`, `surfaceState`, `forceBarrier`, `magicSuppress`, `magicEnd` | SIM.00.03; SIM.50.05 for spread; SIM.00.04 for movement cost |
| B | `volumeDamage`, `impulse` | SIM.40.01, SIM.40.02, GP.07.02, WG.00.17, SIM.00.00 |
| C | `fluidSource`, `fluidSink`, `fluidMove` | SIM.50.02, WG.61.02 |
| D | `heatFlux`, `freezeFluid`, `weatherOverride` | SIM.50.06 and G-TEMP |
| E | `conjureMatter`, `terrainEdit`, `bodyTransform`, `animate`, `objectTransform`, `growth`, `decay`, `extraplanarHold` | SIM.40.01-.02, WG.61.02, WG.65.15, SIM.50.04, SIM.40.10, and the Owner's answer to Q1 |
| F | `gasVolume`, `gasDisperse`, `windField` | G-GAS and SIM.50.06 wind |

`castStored` has no phase in the audit (`primitives.json` marks it `null`; see the REPORT's proposals). No timed effect can ship before Q2 is answered, because `secondsPerTick` is null.
