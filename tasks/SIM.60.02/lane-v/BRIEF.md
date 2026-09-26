# Lane V Brief: SIM.60.02 spell-effect schema (data-driven primitives, SRD baseline, effect data, validator)

**NO ART GENERATION BY ANYONE (DEC-007).** Schema, data and a node validator only. No gameplay file changes, no runtime.

**Lane:** lane-v | **Task ID:** SIM.60.02 (Spell-effect schema; `docs/worldgen/DEUS_WORLDGEN_WBS.md` M3.4 row, line ~560) | **Branch:** task/lane-v | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-v` | **Writer:** claude | **Reviewer:** grok (independent attack/mutation review, launched later by the PM; the task is not DONE until that review passes) | **Base:** origin/main `425b594c146d5f353c10faa11f4b5d47f499b45f` | **Source:** Owner-authorised main-chat ops 2026-09-26 (PM launches and merges, 0028-AC A0). WBS dependency SIM.60.01 is DONE on main (Lane P, audit merged, Grok PASS `tasks/SIM.60.01/lane-p/review_grok_c9d1ed86.md`). The audit's section 4.4 says SIM.60.02 has "no dependencies beyond this audit".

**allowedPaths** (exact; mirrored in `tasks/SIM.60.02/lane-v/lane.json`):
- `docs/schemas/spells/**` (the schema, the promoted SRD baseline, the effect data, the tuning table, a README)
- `tools/spells/**` (validator, tests, mutation checks, fixtures)
- `tasks/SIM.60.02/**` (your REPORT and evidence; the launcher also writes its saved prompt under `tasks/SIM.60.02/lane-v/launches/`; leave that alone)

**FORBIDDEN:** everything else. In particular `game/**` (read only: `game/data/srd51/spells.json`, `game/js/sim/ledger*.js`, `game/js/plugins/**`), `docs/audits/**` (read only: the SIM.60.01 audit is Lane P's reviewed deliverable; never edit it), `docs/adr/**`, `docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `tools/**` outside `tools/spells/**` (including `tools/ops/**`, `tools/governance/**`, `tools/sim/**`), `art/**`. **No runtime:** SIM.60.03 (the headless spell-effect runtime) is NOT in scope; do not add any code under `game/`. You do NOT mint WBS IDs, change WBS statuses or answer Owner questions; proposed follow-up work is written `PROPOSED-V-NN`.

## Goal
Turn the SIM.60.01 audit's schema proposal into the frozen, validated contract SIM.60.03 will implement: a JSON Schema (draft 2020-12) of reusable physical primitives, a structured SRD baseline that effects point into (SRD numbers are never copied into effect data), effect data for every physical record, a tuning-coefficient table, and a dependency-free node validator whose every check is seen to fail on a mutant.

## Owner rules and open questions the schema must respect (non-negotiable)
1. **DEC-018** (`docs/OWNER_DECISIONS.md` ~L251-265): SRD 5.1 damage, range, saves, area, duration and casting stay the rules baseline and are never changed; physical consequences are added on top; **no per-spell code** (audit section 3.1 R1 and R11).
2. **LIFE-001 / LIFE-002** (`docs/RISK_REGISTER.md` ~L60-61), Owner ruling D-5 "ore never respawns": no effect may create an ore class. Created or destroyed matter always goes through a **named** ledger source or sink with a cause. The ledger module is on main: `game/js/sim/ledger.js` and `game/js/sim/ledger_defaults.js` (declared sources/sinks `magic`, `world-edge`, `debug-explicit`, `rain`; class and form tables). Use those names; the validator must reject a ledger source/sink name or class that the ledger defaults do not declare (read them with `require` from the tool; never edit them).
3. **Open Owner questions: represent, never decide.** The audit section 6 lists Q1 (conjured matter vs the ledger, DEC-018 open sub-question; parts a-e), Q2 (time scale for spell durations; escalation `tasks/SIM.60.01/lane-p/escalation.md`), Q3 (unnamed damage types: acid, lightning conduction, necrotic, radiant, thunder), Q4 (SRD-silent properties of magical substances). For each, the schema must hold every option as data without choosing:
   - Q2: durations are stored as SRD seconds (1 round = 6 s) with a `timeDomain` tag (`action` or `historical`), and `secondsPerTick` per domain is a **named parameter with no value** (null, `status: OWNER_OPEN`) in the tuning table. Never write a tick rate, a calendar length or a day/year ratio anywhere.
   - Q1: the policy for conjured matter is a data table keyed by case (permanent, temporary-leaves-area, mass change of bodies, planar transfer, summoned bodies) whose default rows are the PM default (named `magic` source/sink with provenance) marked `status: PM_DEFAULT_UNCONFIRMED`.
   - Q3/Q4: primitives that would only exist under a "yes" answer are not added to effect data; list them as `ownerOpen` notes.
   Copy the questions into REPORT.md (verbatim ids, with options); never answer them.
4. Geometry (DEC-013 as amended; D-2): 5-ft squares, 10-ft layers, 2-ft slices, 32 layers -16..+15. The schema must not hard-code a layer count or the old 1-ft strata / z -2..2 limits; areas stay in SRD feet.

## What to build
1. **`docs/schemas/spells/spell_effect.schema.json`**: JSON Schema draft 2020-12, promoted from the audit's draft (`docs/audits/SRD_SPELL_EFFECT_AUDIT.md` section 3.6, ~L567-1013) with the primitive catalogue of sections 3.2-3.5 and the design rules R1-R11 of section 3.1. Reconcile it with ADR-003 Rev 3 section 18.6 (`docs/adr/ADR-003_sim_render_split_and_lod.md` ~L1810-1828; PROPOSED, cite it as such): every primitive maps to one core system in that table or is listed as a gap (audit 4.3: G-TEMP, G-GAS, G-LIGHT). `additionalProperties: false` at the effect level (a per-spell script hook is rejected). Every primitive instance carries `primitive`, `trigger`, `basis` (`srd` with an exact quote pointer, or `deus` with a reason), `magical` (true/false, R10) and a `ledger` block. Schema `$id` and a `schemaVersion` (`deus-spell-effect/1.0.0`). Any change you make to the audit's draft is listed in REPORT.md with the reason (field renamed, tightened, added, dropped).
2. **`docs/schemas/spells/srd_baseline.json`**: the structured SRD baseline, generated mechanically from the `srd` block of each record in `docs/audits/srd_spell_effect_audit.json` (319 records at base; 8 out of scope) and cross-checked against `game/data/srd51/spells.json` (327 spells). Every value is traceable to an exact SRD quote. A mismatch between the audit JSON and `spells.json` goes into REPORT.md as a disagreement; never silently fixed.
3. **`docs/schemas/spells/effects.json`**: effect data for every physical (non-`NONE`) record (111 at base per the audit JSON) and for the `NONE` records that list an entity or meta primitive (10 at base). Built from the audit's `primitives`, `physicalEffects`, `crossLayer` and `conservation` fields and its worked examples (section 3.7). Effects reference SRD values only by pointer into `srd_baseline.json` (for example `{ "srdRef": "fireball.damage[0]" }`), never by copying a number. Count every record you write and reconcile the counts with the audit in REPORT.md.
4. **`docs/schemas/spells/tuning.json`**: the DEUS tuning coefficients the audit names (ignition thresholds, attenuation factors, heat/cold exchange, etc.) as named parameters, each with `value` (or null), `unit`, `status` (`PM_DEFAULT`, `OWNER_OPEN`, `PLACEHOLDER`) and a source citation. `secondsPerTick.action` and `secondsPerTick.historical` are null / `OWNER_OPEN` (Q2).
5. **`docs/schemas/spells/README.md`**: what each file is, the rules R1-R11, how SIM.60.03 consumes it (phases A-F of audit 4.4, not implemented), the open-question table, and the regeneration command.
6. **`tools/spells/validate_spell_effects.js`**: no npm dependencies (write a small in-file validator for the JSON Schema subset you use). Validates `effects.json` against the schema and fails (non-zero exit, named error with record id and path) on at least:
   - any SRD number copied into effect data (a number in an effect that equals an SRD value of that spell without an `srdRef`, and any field named like damage/range/save/area/duration/castingTime holding a literal);
   - any unknown primitive, or a primitive not allowed under the record's systems (audit `meta.primitiveSystems`);
   - any ledger source or sink without a cause, or whose name/class is not declared in `game/js/sim/ledger_defaults.js`;
   - any effect whose output is an ore class (LIFE-002 / D-5);
   - any `basis: "srd"` whose quote is not an exact substring of that spell's SRD text in `game/data/srd51/spells.json`;
   - a per-spell hook / extra property at effect level (`additionalProperties: false`);
   - a timed effect with a literal tick count, or `secondsPerTick` given a value (Q2 stays open);
   - an `srdRef` pointer that does not resolve in `srd_baseline.json`;
   - a physical audit record with no effect entry, or an effect for a spell not in the baseline (coverage 100%).
   `--check` regenerates `srd_baseline.json` in memory from the audit JSON and exits non-zero if the committed file differs (deterministic: stable key order, no timestamps).
7. **`tools/spells/test_spell_effects.js`**: one `PASS <name>` / `FAIL <name>` line per check and a final `RESULT: <n> passed, <m> failed`; exit 0 only when all pass. Covers every validator rule above with a negative fixture under `tools/spells/fixtures/` (and the clean data passing), the `--check` byte-identical rebuild run twice (sha256 equal), and **mutation checks**: apply each mutant to an in-memory copy of the validator source (never edit the real file on disk) and show the suite kills it (`PASS mutant_<name>_killed`); at least one mutant per rule (rule switched off) plus one that ignores `additionalProperties`.

## Inputs (read; cite `file:line` at your base commit)
- `docs/audits/SRD_SPELL_EFFECT_AUDIT.md` (all of section 3, section 4.1-4.4, section 5, section 6, section 7) and `docs/audits/srd_spell_effect_audit.json` (`meta`, `records`, `outOfScope`); `tasks/SIM.60.01/lane-p/REPORT.md`, `escalation.md`, `review_grok_c9d1ed86.md` (the reviewer's minor findings are worth folding in where they touch the schema; list which).
- `game/data/srd51/spells.json`; `game/js/sim/ledger.js`, `game/js/sim/ledger_defaults.js`, `tasks/WG.65.15/lane-l1/LEDGER_API.md`.
- `docs/adr/ADR-003_sim_render_split_and_lod.md` Rev 3 sections 7.8, 7.9, 18 (PROPOSED); `docs/OWNER_DECISIONS.md` DEC-013, DEC-018, DEC-019, DEC-022; `docs/RISK_REGISTER.md` LIFE-001..003.
- Design siblings on main (reviewed): `tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md` (blast propagation, `applyVolumeDamage` inputs, material attenuation) and `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md` (decay primitive). Align names where cheap; list mismatches.

## Tests and commands
- Run in the FOREGROUND from the worktree root: `node tools/spells/test_spell_effects.js`, `node tools/spells/validate_spell_effects.js`, `node tools/spells/validate_spell_effects.js --check`, `node tools/check_deus_syntax.js` (must still exit 0). These are light. **Do not run the NW.js harness (`tools/run_tests.js`) or heavy repo suites.**
- Before your final commit, run every `gateTests` entry of `tasks/SIM.60.02/lane-v/lane.json` exactly as written and paste raw output with `EXIT=` lines in REPORT.md.
- Prove scope: paste `git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD` and show every path matches allowedPaths.

## Deliverables
1. The schema, baseline, effects, tuning and README above; the validator and tests.
2. `tasks/SIM.60.02/lane-v/REPORT.md`: every command with raw `EXIT=` lines; counts (records in baseline, effects written per system and primitive, validator checks, fixtures, mutants killed); the list of changes versus the audit's draft schema; disagreements found (audit JSON vs spells.json, ADR 18.6 vs audit primitive names); the Owner questions Q1-Q4 copied with options (not answered); PROPOSED-V-NN follow-ups (for SIM.60.03 phases, the gaps G-TEMP/G-GAS/G-LIGHT); the scope diff; the final `git rev-parse HEAD`.

## Acceptance criteria (the independent Grok reviewer will check these)
- No file outside allowedPaths changed; zero files under `game/` changed.
- The schema validates all effect data; every physical audit record has an effect entry; no SRD number is copied into effect data; every `basis: srd` quote is exact; every ledger name exists in the ledger defaults; no effect outputs ore.
- Q1-Q4 are represented as data with no value chosen; no tick rate, calendar length or day/year ratio appears anywhere.
- `--check` rebuild is byte-identical; every validator rule fails on its negative fixture and every mutant is killed; all suites exit 0 on the clean data.
- Nothing self-certified; REPORT evidence is raw.

Commit messages start `[claude] SIM.60.02`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane (table below), the merged governance/ops tools (`tools/governance/**`, `tools/ops/**`: read only) and the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only).
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run commands in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin task/lane-v` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file (test-runner `PASS <check>` lines are fine). Your REPORT states what you did and the raw evidence. An independent Grok review decides; the PM merges.
6. Stop and write `tasks/SIM.60.02/lane-v/escalation.md` (then commit and push it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.
7. Your very last output line must be `FINAL SHA: <sha>`, with the sha pasted from `git rev-parse HEAD` after a successful push (or `FINAL SHA: <sha> (push refused)`).

## Live lanes at preparation (write sets are disjoint; do not touch another lane's paths)
| Lane | Task | Role | Write set |
|---|---|---|---|
| K | WG.00.09b depth renderer Fix 2 | Grok reviewer running (writer done) | per `tasks/WG.00.09b/lane-k/lane.json` (`game/js/plugins/DEUS_Depth.js`, `game/js/plugins.js`, minimap/fog/daynight plugins and docs, `tools/test_layer_render_flat.js`, `tools/bench_render_layers.js`, `tools/test_minimap.js`, `tasks/WG.00.09b/lane-k/**`); its reviewer runs NW.js suites on this machine |
| V | SIM.60.02 spell-effect schema | Claude writer | `docs/schemas/spells/**`, `tools/spells/**`, `tasks/SIM.60.02/**` |
| X | WG.33.01 registry/catalogue/atlas integrity checker | Claude writer | `tools/verify_world_state_registry.js`, `tools/test_verify_world_state_registry.js`, `tools/wsr/**`, `tasks/WG.33.01/**` |
| Y | OPS.30.01 GATE runner and quarantine census | Claude writer | `tools/ops/run_gate.js`, `tools/ops/test_run_gate.js`, `tools/ops/quarantine.json`, `tools/ops/fixtures/run_gate/**`, `tasks/OPS.30.01/**` |
| Z | OPS.70.02 secrets scanner and dependency checker | Claude writer | `tools/security/**`, `tasks/OPS.70.02/**` |
| E | WG.00.09a attack plan | PAUSED (do not touch) | `docs/systems/UF_Depth_Attack_Plan.md`, `tasks/DEUS-TSK-FABLE-19C/*` |

