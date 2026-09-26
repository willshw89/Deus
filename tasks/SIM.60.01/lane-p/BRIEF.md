# Lane P Brief: SRD Spell-Effect Audit, design only (SIM.60.01)

**NO ART GENERATION BY ANYONE.** This is a design/audit lane. No code, no art, no image generation.

**Lane:** lane-p | **Task ID:** SIM.60.01 | **Branch:** task/lane-p | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-p` | **Writer:** claude | **Reviewer:** grok (independent, later) | **Base:** main `b612bc7217349bce695e15395bd041f63673b89b` | **Source:** Owner decision 2026-09-26 01:39 CT (DEC-018 in docs/OWNER_DECISIONS.md), PM 0028-AC §5

**allowedPaths** (exact):
- `docs/audits/SRD_SPELL_EFFECT_AUDIT.md`
- `docs/audits/srd_spell_effect_audit.json`
- `tasks/SIM.60.01/lane-p/**`

**FORBIDDEN:** everything else, in particular `game/**` (read only; `game/data/srd51/spells.json` is your main input), `tools/**` (commit no code; ad-hoc node one-liners run from a temp folder are fine for counting), `docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, and `docs/audits/LIVING_WORLD_GAP_AUDIT.md` (Lane O).

## Owner decision (01:39 CT)
SRD spells are hyper-realistic: effects play out physically in the simulation. Fire ignites and spreads; blasts damage structures and can breach floors into lower layers; water floods and flows; cold freezes; earth spells reshape terrain. SRD 5.1 damage, range, saves, area, duration and casting stay the rules baseline; physical consequences are added on top and never replace SRD numbers. It must be data-driven: one spell-effect schema of reusable primitives, no per-spell code.

## Deliverables
1. `docs/audits/srd_spell_effect_audit.json`: one record for every entry in `game/data/srd51/spells.json` with `kind: "spell"` (319 at the base commit; confirm by counting and paste the count; the 8 `spell-list` entries are listed separately as out of scope). Each record: `id`, `name`, SRD baseline fields quoted from the source (level, school, casting time, range, components, duration, concentration, area/shape, save, attack, damage and damage type, higher-level scaling) with `null` where the SRD has none, `systems[]` from {HEAT, FORCE, WATER, COLD, EARTH, LIGHT, LIFE, AIR, NONE} (add a system only with a written reason in the doc), `primitives[]` (draft names from deliverable 2), `physicalEffects` (one or two sentences of what happens in the world), `crossLayer` (none | targets-through-openings | breaches-floor | falls/flows-down), `conservation` (none | conjured-source | conjured-sink | transform), `wbsDeps[]`, `confidence` (HIGH/MEDIUM/LOW) and `notes`. 100% coverage; no invented spells.
2. `docs/audits/SRD_SPELL_EFFECT_AUDIT.md`:
   - Method, base commit (paste `git rev-parse HEAD`), counts per system, per school and per level.
   - Classification tables grouped by world system, citing the JSON.
   - A data-driven spell-effect schema PROPOSAL (JSON Schema 2020-12 draft shown in the doc, not committed as a separate schema file): reusable primitives such as ignite, heat flux, impulse/blast (floor breach via SIM.40.01 support model and cross-layer volume damage, addendum §12), fluid source/sink, temperature/freeze, mass-conserving terrain edit, light emit/darken, growth/decay, with parameters mapped from SRD fields (area shape -> cell footprint in 5-ft squares across 10-ft layers; damage dice -> energy/impulse; duration -> lifetime ticks). Show five worked examples as data (fireball, wall of stone, create or destroy water, cone of cold, earthquake).
   - Dependency ordering: which world systems and WBS rows each primitive needs (fire SIM.50.05, water SIM.50.02, seasons SIM.50.06, collapse SIM.40.01-.02, 32-layer refactor WG.00.17, Lane N in-place switch SIM.00.00, cross-layer targeting per addendum §20, ADR-003 Rev 2 PROPOSED), and a recommended implementation order for SIM.60.02 (schema), SIM.60.03 (runtime) and SIM.60.04 (QA fixtures).
   - Conjured matter vs LIFE-001: present the PM default (conjured matter is an explicit magical source/sink logged in the conservation ledger) and alternatives, as an Owner question.
   - Owner questions, listed and never answered.
3. `tasks/SIM.60.01/lane-p/REPORT.md`: commands with raw EXIT lines, the coverage count check (spells in source vs records in JSON), and the final `git rev-parse HEAD`.

## Gate check (in `tasks/SIM.60.01/lane-p/lane.json`)
A node one-liner: `docs/audits/srd_spell_effect_audit.json` must be a JSON array of records, or an object whose `records` array holds them; one record per `kind: "spell"` entry of spells.json (matched by `id`), no extras, and every record has a non-empty `systems` array. Run it yourself from the repo root before your final commit.

## Acceptance criteria (the Grok reviewer will check these)
- JSON parses; record count equals the number of `kind: "spell"` entries; every id exists in spells.json; SRD fields match the source for a sample the reviewer picks.
- Every spell has at least one system (NONE allowed with a reason); the schema proposal covers every primitive used.
- SRD numbers are never altered; physical effects are additive.
- No file outside allowedPaths changed; no code committed; Owner questions not answered; nothing self-certified.

Commit messages start `[claude] SIM.60.01`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane: K (`game/js/plugins/DEUS_Depth.js`, `game/js/plugins.js` DEUS_Depth block, `DEUS_Minimap.js`, `DEUS_Fog.js`, `DEUS_DayNight.js`, `docs/systems/DEUS_Depth.md`, `docs/systems/DEUS_Minimap.md`, `tools/test_layer_render_flat.js`, `tools/bench_render_layers.js`, `tools/test_minimap.js`, `tasks/WG.00.09b/lane-k/**`), N (`game/js/plugins/DEUS_Levels.js`, `game/js/plugins/DEUS_World.js`, `tools/test_layer_switch_inplace.js`, `tasks/SIM.00.00/lane-n/**`), M (`docs/adr/ADR-003*`, `docs/adr/README.md`, `tasks/SIM.00.01/**`), E (paused), the merged governance/ops tools (`tools/governance/**`, `tools/ops/**`: read only), the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only) and the other new lanes listed in the table at the end of this brief.
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run tests in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin <your branch>` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file. Your REPORT states what you did and the raw evidence. An independent Grok review decides; the PM merges.
6. Stop and write `tasks/<task>/<lane>/escalation.md` (then commit it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.

## New lanes opened together (write sets are disjoint; do not touch another lane's paths)
| Lane | Task | Role | Write set |
|---|---|---|---|
| S | WG.20.02 art catalogue | Claude writer | `art/catalogue/**`, `docs/art/catalogue/**`, `tools/art/build_catalogue.js`, `tools/art/test_catalogue.js`, `tools/art/fixtures/catalogue/**`, `tasks/WG.20.02/lane-s/**` |
| T | WG.32.02 blank templates | Claude writer | `tools/art/make_blank_templates.js`, `tools/art/test_blank_templates.js`, `tools/art/fixtures/templates/**`, `art/templates/**`, `tasks/WG.32.02/lane-t/**` |
| U | WG.41.01 placement + validator | Claude writer | `tools/art/place_art.js`, `tools/art/validate_art.js`, `tools/art/test_place_art.js`, `tools/art/fixtures/place/**`, `docs/art/APPROVALS_FORMAT.md`, `tasks/WG.41.01/lane-u/**` |
| gap-audit | SIM.50.01 living-world gap audit | Claude writer (coordinator-launched) | `docs/audits/LIVING_WORLD_GAP_AUDIT.md`, `tasks/SIM.50.01/gap-audit/**` |
| P | SIM.60.01 SRD spell-effect audit | Claude writer | `docs/audits/SRD_SPELL_EFFECT_AUDIT.md`, `docs/audits/srd_spell_effect_audit.json`, `tasks/SIM.60.01/lane-p/**` |
| M | SIM.00.01 ADR-003 Rev 3 | Claude writer | `docs/adr/ADR-003_sim_render_split_and_lod.md`, `docs/adr/README.md`, `tasks/SIM.00.01/lane-m/**` (not review files) |
| N review | SIM.00.00 in-place switch | Grok reviewer | `tasks/SIM.00.00/lane-n/review_grok_2f2a1ff2.md` only |
