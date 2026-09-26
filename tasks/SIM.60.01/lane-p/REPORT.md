# SIM.60.01 Lane P report: SRD spell-effect audit (design only)

Writer: Claude (claude-opus-5-5), branch `task/lane-p`, 2026-09-26. Reviewer per lane.json: Grok (independent, not yet run). Not merged. This report states what was done and the raw evidence. It does not certify the work.

## What changed

My commits on `task/lane-p`: `dbeb3ccd`, `b427ef9c`, `4d5fcf83`, plus the commit that adds this report. Files:

- `docs/audits/srd_spell_effect_audit.json` (new): one record per `kind: "spell"` entry of `game/data/srd51/spells.json` (319). Each record has:
  - SRD baseline fields, copied or quoted exactly;
  - `systems`, `primitives`, `physicalEffects`, `crossLayer`, `conservation`, `wbsDeps`, `wbsGaps`, `confidence` and `notes`.

  The file also has a `meta` block (counts, enums, primitive-to-system and primitive-to-WBS tables) and `outOfScope` (the 8 `spell-list` entries).
- `docs/audits/SRD_SPELL_EFFECT_AUDIT.md` (new):
  - method, base commit, and counts per system, school and level;
  - classification tables by world system;
  - the design rules, the primitive catalogue, and the JSON Schema 2020-12 draft with five worked examples (fireball, wall of stone, create or destroy water, cone of cold, earthquake);
  - dependencies and the recommended order for SIM.60.02, .03 and .04;
  - conjured matter versus LIFE-001 (the PM default and alternatives);
  - Owner questions Q1 to Q4 (listed, not answered);
  - source disagreements and limits.
- `tasks/SIM.60.01/lane-p/escalation.md` (new): the time-scale disagreement (standing rule 6). Details are below.
- `tasks/SIM.60.01/lane-p/REPORT.md` (this file).

No file outside the allowedPaths changed. No code was committed. Nothing under `game/`, `tools/`, `docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md` or any `*WBS*.md` changed (evidence below).

## Coverage count check

| Count | Value | Source of the number |
|---|---|---|
| Entries in `spells.json` | 327 | `{"spell-list":8,"spell":319} entries 327` (command 1) |
| `kind: "spell"` entries | 319 | same |
| Records in the audit JSON | 319 | gate output `source 319 records 319 missing 0 extra 0 noSystems 0` |
| Spell ids missing from the JSON | 0 | gate output |
| JSON records not in `spells.json` | 0 | gate output |
| Records with an empty `systems` | 0 | gate output |
| `spell-list` entries listed as out of scope | 8 | `outOfScope 8` (command 5) |

## How I tested it (commands run in the foreground; raw output and exit codes)

From the worktree root `C:\Users\snewt\.deus_worktrees\lane-p`, at `4d5fcf837bff8d795b25e022c257b107259daae1`:

```
$ node -e "<count kinds in spells.json>"
{"spell-list":8,"spell":319} entries 327
EXIT=0
$ node -e "<gate one-liner from lane.json gateTests[0], verbatim>"
source 319 records 319 missing 0 extra 0 noSystems 0
EXIT=0
$ node -e "<gate one-liner read from lane.json and executed>"
source 319 records 319 missing 0 extra 0 noSystems 0
EXIT=0
$ node -e "<SRD field and quote check>"
records 319 quotesChecked 389 fieldMismatches 0
EXIT=0
$ node -e "<enum and NONE-reason check>"
bad 0 outOfScope 8
EXIT=0
$ git diff --name-only b612bc7217349bce695e15395bd041f63673b89b..HEAD
docs/audits/SRD_SPELL_EFFECT_AUDIT.md
docs/audits/srd_spell_effect_audit.json
tasks/SIM.60.01/lane-p/BRIEF.md
tasks/SIM.60.01/lane-p/escalation.md
tasks/SIM.60.01/lane-p/lane.json
tasks/SIM.60.01/lane-p/launches/20260926_022444_prompt.txt
EXIT=0
$ git log --format="%h %an %s" b612bc7217349bce695e15395bd041f63673b89b..HEAD
4d5fcf83 deus-claude [claude] SIM.60.01 consistency fixes: ignite implies transform, provisional-classification wording, method checks
b427ef9c deus-claude [claude] SIM.60.01 audit doc: method, counts, system tables, schema draft, worked examples, Owner questions
dbeb3ccd deus-claude [claude] SIM.60.01 WIP: spell-effect audit JSON (319 records) and time-scale escalation
d63425f1 snewt [ops] SIM.60.01 lane-p launch prompt 20260926_022444
e39b20e6 deus-pm [pm] Open lane-p (SIM.60.01): BRIEF.md and lane.json
EXIT=0
$ git diff --name-only d63425f1aab8041aa44c40fd76a20b590f3f7959..HEAD
docs/audits/SRD_SPELL_EFFECT_AUDIT.md
docs/audits/srd_spell_effect_audit.json
tasks/SIM.60.01/lane-p/escalation.md
EXIT=0
$ git diff --stat b612bc7217349bce695e15395bd041f63673b89b..HEAD -- game tools docs/STATUS.md docs/VISION.md docs/OWNER_DECISIONS.md
EXIT=0
```

- BRIEF.md, lane.json and the launch prompt in the base diff come from the PM and ops commits `e39b20e6` and `d63425f1`, not from me.
- The last command printed nothing, meaning no change under `game/`, `tools/` or the named coordinator files.

The "SRD field and quote check" one-liner, so the reviewer can rerun it:

```
node -e "const s=require('./game/data/srd51/spells.json').entries;const a=require('./docs/audits/srd_spell_effect_audit.json');let bad=0,quotes=0;for(const r of a.records){const e=s.find(x=>x.id===r.id);for(const f of ['level','school','ritual','castingTime','range','duration','concentration'])if(r.srd[f]!==e.data[f])bad++;if(JSON.stringify(r.srd.components)!==JSON.stringify(e.data.components))bad++;for(const k of ['area','save','attack','damage'])for(const q of (r.srd[k]||[])){quotes++;const src=q.from==='range'?e.data.range:e.data.description;if(!src.includes(q.quote))bad++}}console.log('records',a.records.length,'quotesChecked',quotes,'fieldMismatches',bad);process.exit(bad?1:0)"
```

### Temporary helper scripts (not committed; the brief allows no committed code)

They live in `C:\Users\snewt\AppData\Local\Temp\lanep\`, outside the repo:

| Script | Purpose |
|---|---|
| `extract.js` | Copies SRD fields and regex-extracts exact quotes |
| `cls1.js`-`cls7.js` | The hand-written classification, as data |
| `assemble.js` | Merges extraction and classification, runs consistency checks, writes the JSON |
| `schema.json`, `examples.json` | The schema draft and the five worked examples shown in the doc |
| `validate.js` | ajv 8.20.0 validation, installed with `npm install ajv@8` in `...\lanep\ajv` only |
| `fill.js` + `doc_template.md` | Fills the doc tables from the JSON and checks every double-quoted phrase against the sources |

Raw runs:

```
$ node extract.js <repo>
EXIT=0
spells 319 badQuotes 0 withArea 115 withSave 117 withAttack 19 withDamage 81 typedNoDiceOnly Alter Self, Animate Objects, Etherealness, Major Image, Mind Blank, Protection from Poison, Silence, Stones[...trimmed]
$ node assemble.js <repo> <temp out> <base> x
records 319 problems 0
{"NONE":208,"LIFE":35,"FORCE":27,"EARTH":25,"LIGHT":26,"HEAT":23,"AIR":12,"COLD":10,"WATER":11} {"targets-through-openings":206,"none":85,"falls/flows-down":15,"breaches-floor":13} {"none":243,"transform":51,"conjured-source":24,"conjured-sink":1} {"HIGH":234,"MEDIUM":79,"LOW":6}
EXIT=0
$ cmp <temp out> docs/audits/srd_spell_effect_audit.json
EXIT=0
$ node fill.js <repo> <temp doc>
filled C:/Users/snewt/AppData/Local/Temp/lanep/doc_check.md unsourced quotes 0 lines 1544
EXIT=0
$ cmp <temp doc> docs/audits/SRD_SPELL_EFFECT_AUDIT.md
EXIT=0
$ node validate.js <repo> <audit json>          (pointer lines omitted)
EXIT=0
srd:spell:fireball: schema valid
srd:spell:wall-of-stone: schema valid
srd:spell:create-or-destroy-water: schema valid
srd:spell:cone-of-cold: schema valid
srd:spell:earthquake: schema valid
negative "conjureMatter with ledger none": rejected
negative "source without cause": rejected
negative "basis srd without srdQuote": rejected
negative "unknown primitive": rejected
negative "bad srd pointer": rejected
negative "explicit footprint without quote": rejected
negative "conjureMatter missing lifetime": rejected
negative "per-spell code hook": rejected
negative "bad system": rejected
failures 0
$ npm ls ajv (temp folder)
ajv@1.0.0 C:\Users\snewt\AppData\Local\Temp\lanep\ajv
`-- ajv@8.20.0
EXIT=0
```

`validate.js` also checks that each example's `srdQuote` is an exact substring of the spell description, that each `/area/n`, `/damage/n` and `/duration` pointer resolves in the audit record, and that the example's `systems` equal the record's.

### The checks can fail (seen)

- **Gate one-liner** (verbatim from lane.json), run in temp copies of the repo layout with a mutated audit JSON:

  ```
  drop-one-record  source 319 records 318 missing 1 extra 0 noSystems 0 EXIT=1
  empty-systems    source 319 records 319 missing 0 extra 0 noSystems 1 EXIT=1
  extra-record     source 319 records 320 missing 0 extra 1 noSystems 0 EXIT=1
  unmodified       source 319 records 319 missing 0 extra 0 noSystems 0 EXIT=0
  ```
- **Assembler consistency checks.** Mutant: Fireball crossLayer set to `targets-through-openings` and conservation to `none`; Knock systems set to `NONE,FORCE`.

  ```
  records 319 problems 3
   - ignite/volumeDamage/terrainEdit with conservation none in Fireball
   - volumeDamage without bf in Fireball
   - NONE mixed with systems in Knock
  EXIT=1
  ```
- **Real failures during the work.**
  - The first full assembly reported 16 problems (EXIT=1), all fixed:
    - 11 double-quoted phrases that were not exact SRD text (misquotes, or non-SRD phrases in quotes);
    - 5 system/primitive mismatches: Ice Storm, Simulacrum (two), Speak with Plants and Storm of Vengeance.
  - The first schema run failed on ajv's `strictRequired` lint (EXIT=1); only that lint was then turned off.
  - The next schema run found one example quote that did not match the SRD (Earthquake: "this spell" instead of "the spell"; EXIT=1). It was fixed.
- **Schema negatives.** The nine negative schema cases above are each rejected.

## Evidence

- No screenshots. This is a design-only lane with no runtime and no art (DEC-007).
- Counts from the JSON `meta.counts`:
  - 111 of 319 spells need a physical system and 208 are `NONE`.
  - Systems: LIFE 35, FORCE 27, LIGHT 26, EARTH 25, HEAT 23, AIR 12, WATER 11, COLD 10.
  - Cross-layer: breaches-floor 13, falls/flows-down 15, targets-through-openings 206, none 85.
  - Conservation: conjured-source 24, conjured-sink 1, transform 51, none 243.
  - Confidence: HIGH 234, MEDIUM 79, LOW 6.

## Escalation (standing rule 6)

`tasks/SIM.60.01/lane-p/escalation.md` (committed in `dbeb3ccd`). Four sources give different game-time scales for spell durations:

| Source | Time scale |
|---|---|
| `DEUS_Core.js:59-61` | 1 real minute = 6 game hours |
| ADR-003 Rev 2 §3.2 | 36 game-seconds per tick |
| VISION V46 and V101 | 1 beat = 1 game minute |
| `SRD5_1_INTEGRATION.md:66` | 6-second action rounds |

- I did not resolve it. I kept working because the classification and the schema do not depend on the rate: durations are stored as SRD seconds, and `secondsPerTick` is left as a named parameter.
- It is Owner question Q2 in the doc.
- If the PM reads rule 6 as "stop entirely", the WIP commit `dbeb3ccd` holds the state at the time the escalation was written.

## Not done / known problems

- The schema draft was checked against the five worked examples and nine negative cases only. No effect data exists for the other 106 physical spells; that is SIM.60.02 work.
- SRD `area`, `save`, `attack` and `damage` are regex extracts stored as exact quotes, plus some hand-set areas. An exact quote can still be incomplete: a second area or damage phrase worded in a way the patterns miss would be absent. The SRD field check above confirms exactness, not completeness.
- `physicalEffects`, the "Added" parts and every classification are the writer's design judgement for the independent review, not SRD text. Six records are LOW confidence (Control Water, Conjure Elemental, Gate, Imprisonment, True Polymorph, Wish).
- The NONE reason groups in doc §2.9 are assigned by keyword. They are a reading aid; each record's own `notes` is authoritative.
- The temp scripts are not committed. A reviewer can check the JSON against `spells.json` with the one-liners above but cannot rerun my extraction. Nothing in `tools/` was used or changed.
- ADR-003 citations are from Rev 2 (`c456cb73`, PROPOSED). Rev 3 is in progress in Lane M and may change the tick, ledger or LOD details cited.
- `spells.json` is `dormant` and `readiness: parsed` for 317 of the spells. The audit quotes it as it is and does not check it against the PDF.
- Not checked: whether any `pre-commit` hook ran on my commits (none reported output).

## Try it in RMMZ

Not applicable. This lane adds documents and data only; nothing loads them in the game.

## Decisions needed

- **Owner** (doc §6, none answered here):
  - Q1: conjured matter and the conservation ledger, five parts (a) to (e), with alternatives A to E in doc §5;
  - Q2: the time scale for spell durations (escalation);
  - Q3: physical effects for acid, lightning conduction, necrotic, radiant and thunder beyond the ruling;
  - Q4: SRD-silent properties of magical substances and barriers.
- **PM:**
  - Owners for the three gaps with no WBS row (G-TEMP stored temperature, G-GAS gas volumes, G-LIGHT simulation light field; doc §4.3).
  - The WBS row SIM.60.01 text says 327 spells, where the brief and this audit use 319 plus 8 spell lists.

## Commit hashes

- HEAD when this report was written (before the report's own commit): `4d5fcf837bff8d795b25e022c257b107259daae1`.
- The report is added in a child commit of that. Its hash and the push result are given in the final hand-off message, because a file cannot contain the hash of the commit that adds it.
