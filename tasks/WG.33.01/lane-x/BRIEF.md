# Lane X Brief: WG.33.01 Manifest <-> Atlas bi-directional integrity checker (World-State Registry <-> art catalogue <-> template slots)

**NO ART GENERATION BY ANYONE (DEC-007).** Checker tooling only. It reads manifests, docs and slot geometry; it never creates, edits, draws, requests or integrates pixels. Tests use synthetic fixtures generated at run time.

**Lane:** lane-x | **Task ID:** WG.33.01 (Manifest <-> Atlas Bi-Directional Integrity Checker; `docs/worldgen/DEUS_WORLDGEN_WBS.md` WG.30 table, line ~155; M5 Stage 2, "not art; workers may build") | **Branch:** task/lane-x | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-x` | **Writer:** claude | **Reviewer:** grok (independent attack/mutation review, launched later by the PM; the task is not DONE until that review passes) | **Base:** origin/main `425b594c146d5f353c10faa11f4b5d47f499b45f` | **Source:** Owner-authorised main-chat ops 2026-09-26 (PM launches and merges, 0028-AC A0). Inputs merged on main: Lane S catalogue (WG.20.01/.02, `tasks/WG.20.02/lane-s/review_grok_65c37d3b.md`), Lane T blank templates (WG.32.01/.02, `tasks/WG.32.02/lane-t/review_grok_9e0b6fc2.md`), Lane U placement/validator (WG.41.01, `tasks/WG.41.01/lane-u/review_grok_5a76043b.md`).

**allowedPaths** (exact; mirrored in `tasks/WG.33.01/lane-x/lane.json`):
- `tools/verify_world_state_registry.js` (the tool name the registry spec gives, `docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md` section 5)
- `tools/test_verify_world_state_registry.js`
- `tools/wsr/**` (fixtures, the committed known-gaps baseline, the generated report, helpers)
- `tasks/WG.33.01/**` (your REPORT and evidence; the launcher also writes its saved prompt under `tasks/WG.33.01/lane-x/launches/`; leave that alone)

**FORBIDDEN:** everything else. In particular `art/**` (read only: `art/catalogue/**` is Lane S's frozen contract `deus-art-catalogue/1.1.0`; `art/templates/**`; `art/APPROVALS.md` is Owner-only), `tools/art/**` (read only; you may `require` or spawn `tools/art/make_blank_templates.js` / `build_catalogue.js` read-only to obtain slot geometry, never edit them), `docs/**` (read only, including `docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md`, which is Gemini's; never edit it), `game/**` (read only: `game/data/UF_WorldCatalog.json`), `tools/ops/**`, `tools/governance/**`. You do NOT mint WBS IDs, change WBS statuses or answer Owner questions; proposed follow-up work is written `PROPOSED-X-NN`.

## Goal
The registry spec (`docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md`, DEUS-WSR-v1.0, Owner directive 2026-09-25) promises "bi-directional traceability": every `VISUAL_REQUIRED`/`VFX_REQUIRED` world state maps to an asset family and a permanent atlas slot, and every atlas slot maps to a consuming world state or a declared non-world-state source. Build the checker that measures this against what is on main today (the art catalogue, the template slot geometry and the runtime WorldCatalog), reports every gap, and fails the gate on any NEW gap or rule violation, so the Owner's art stream (Stage 3) is never asked to paint an orphan slot and no world state silently lacks one.

## Rules to implement (registry section 5, plus the WBS row)
- **WSR-01 Single ownership:** every `stateId` has exactly one `system`, and the system is in the registry schema's `system` enum (section 2).
- **WSR-02 Visual completeness:** `VISUAL_REQUIRED` (and `VFX_REQUIRED`) states have non-null `visualStateId` and `assetFamily`; `SIMULATION_ONLY` states have neither. `*Compositional Assembly*` / `*None (Composed)*` rows (landmarks, WG.63.02) are a declared exemption class; report them, do not fail them.
- **WSR-03 Atlas allocation:** every `visualStateId` resolves to a catalogue entry (by id, `sourceIds`, family or an explicit mapping you document) that owns a paint slot on a sheet, and that slot exists with identical geometry in the template output for that sheet. The spec text also names `game/data/UF_WorldCatalog.json` "active entry" and "WG.30 atlas coordinate"; WG.30.01 has no deliverable yet, so the catalogue's sheets/slots are the atlas of record. Say this in REPORT.md and list it as a disagreement for the Coordinator.
- **WSR-04 No phantom assets:** every catalogue slot traces to a registry `stateId` OR to a declared non-world-state source class (characters, creatures, items, UI, props sourced from WorldCatalog/briefs/AR rows, addendum families). The registry covers natural-world systems only; do not weaken the rule silently: make the scope an explicit, documented parameter, count slots per class, and report the natural-world slots that trace to no state.
- **WSR-05 Performance class:** every state declares a `performanceClass` from the enum. (Per-frame scan enforcement is a runtime concern; record it as not checkable statically.)
- **Manifest <-> atlas (WG.33.01 row):** 100% agreement in both directions between the catalogue manifest (`art/catalogue/catalogue.json` sheets/slots) and the template slot map produced by `tools/art/make_blank_templates.js` (same slot ids, sheet ids, rects; no slot in one and not the other). If placed art exists anywhere the Lane U tools define (`art/APPROVALS.md` rows, placement outputs), every placed region lies inside a catalogue slot; if none exists, say so and test the rule with synthetic fixtures only.

## What to build
1. **`tools/verify_world_state_registry.js`** (no npm dependencies, deterministic, no timestamps in outputs):
   - Parses the registry markdown: the section 2 JSON schema (for enums/required fields) and the section 3 seed table (every row). Parse errors name the line.
   - Loads `art/catalogue/catalogue.json` (+ `geometry.json` for dimensions), obtains the template slot map read-only from Lane T's tool: at base `art/templates/` holds only its README (the sheets are not generated or committed yet), so run `tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out <OS temp dir>` (or its exported `run`) into a fresh temp folder, read the per-sheet JSON sidecars, and delete the temp folder afterwards; never write into `art/`, and reads `game/data/UF_WorldCatalog.json`.
   - Evaluates every rule above, producing structured findings `{rule, severity, stateId|slotId|sheetId, detail, source file:line}`.
   - `--report <dir>` writes `wsr_report.json` and `WSR_REPORT.md` (counts per rule, per system, per asset family, per catalogue class; every gap listed). The committed copy lives at `tools/wsr/report/`.
   - Gate mode (default): exits 1 on any rule violation or gap that is **not** in the committed baseline `tools/wsr/known_gaps.json`, and also exits 1 if a baseline entry no longer occurs (stale baseline: forces the baseline to shrink as gaps close). Each baseline entry carries `rule`, the id, and a one-line `reason` (for example "no catalogue family for snow states: registry allows snow, DEUS_BiomeRegistry forbids snow/ice; conflict recorded by Lane S"). `--strict` ignores the baseline and exits 1 on any gap. `--check` regenerates the report in memory and exits non-zero if the committed report differs.
   - Never prints or writes image data.
2. **`tools/test_verify_world_state_registry.js`**: one `PASS <name>` / `FAIL <name>` line per check and `RESULT: <n> passed, <m> failed`; exit 0 only if all pass. Synthetic fixtures under `tools/wsr/fixtures/` (a mini registry markdown, a mini catalogue, a mini template slot map, a mini WorldCatalog): a clean fixture passes, and one negative fixture per rule fails with the named rule (duplicate stateId / two systems; visual state with null family; visualStateId with no entry; entry with no slot; slot rect differs between catalogue and template; template slot missing from catalogue and vice versa; natural-world slot with no state; missing performanceClass; placed region outside any slot). Baseline behaviour: a new gap fails, a baselined gap passes, a stale baseline entry fails, `--strict` fails on a baselined gap. Determinism: two report runs are byte-identical (sha256). **Mutation checks**: apply each mutant to an in-memory copy of the tool source (never edit the real file on disk) and show the suite kills it (`PASS mutant_<name>_killed`); at least one mutant per rule (rule switched off), one that ignores the baseline staleness check, and one that compares only slot ids (not rects).
3. **`tools/wsr/known_gaps.json`**: the baseline for main at your base commit, every entry with a reason; and **`tools/wsr/report/`**: the committed report for the real repo.

## Inputs (read; cite `file:line` at your base commit)
- `docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md` (all); `docs/worldgen/DEUS_WORLDGEN_WBS.md` WG.33.01, WG.30.01, WG.32.01/.02, WG.20.01/.02, WG.63.02 rows and section 5 M5 stages.
- `art/catalogue/*` (catalogue.json, catalogue.schema.json, geometry.json, mapping.json, conflicts.md, references.json), `docs/art/catalogue/*`, `tasks/WG.20.02/lane-s/BRIEF.md` + `REPORT.md` (the frozen contract), `tools/art/build_catalogue.js`, `tools/art/make_blank_templates.js`, `tasks/WG.32.02/lane-t/REPORT.md`, `tools/art/place_art.js`, `tools/art/validate_art.js`, `docs/art/APPROVALS_FORMAT.md`, `tasks/WG.41.01/lane-u/REPORT.md`.
- `game/data/UF_WorldCatalog.json`, `game/data/DEUS_BiomeRegistry.json`; `docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md`, `docs/worldgen/DEUS_CREATURE_ECOLOGY.md`.

## Tests and commands
- Run in the FOREGROUND from the worktree root: `node tools/test_verify_world_state_registry.js`, `node tools/verify_world_state_registry.js`, `node tools/verify_world_state_registry.js --check`, `node tools/art/test_catalogue.js`, `node tools/art/build_catalogue.js --check`, `node tools/check_deus_syntax.js` (the last three must still exit 0; you changed none of their inputs). **Do not run the NW.js harness (`tools/run_tests.js`).**
- Before your final commit, run every `gateTests` entry of `tasks/WG.33.01/lane-x/lane.json` exactly as written and paste raw output with `EXIT=` lines in REPORT.md.
- Prove scope: paste `git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD` and show every path matches allowedPaths.

## Deliverables
1. The tool, tests, fixtures, baseline and committed report above.
2. `tasks/WG.33.01/lane-x/REPORT.md`: every command with raw `EXIT=` lines; the real-repo counts per rule (states, visual states, states with a slot, catalogue slots by class, slots tracing to a state, manifest/template disagreements), the `--strict` result, test counts and mutants killed; disagreements between the registry spec and what exists (WG.30 atlas vs catalogue sheets; UF_WorldCatalog vs catalogue; snow/ice states vs the biome registry; 9-layer or 1-ft assumptions in the registry text); Coordinator/Owner questions (copied, not answered); PROPOSED-X-NN follow-ups (catalogue entries the registry needs, registry rows the catalogue implies); the scope diff; the final `git rev-parse HEAD`.

## Acceptance criteria (the independent Grok reviewer will check these)
- No file outside allowedPaths changed; nothing under `art/`, `docs/`, `game/` or `tools/art/` changed; no image data created.
- Every WSR rule and the manifest<->template rule is implemented, fails on its negative fixture, and is killed as a mutant; baseline staleness and `--strict` behave as specified; reports are byte-identical across runs.
- Gate mode exits 0 on main with a baseline whose every entry has a reason; `--strict` output on main is recorded raw.
- Nothing self-certified; REPORT evidence is raw.

Commit messages start `[claude] WG.33.01`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane (table below), the merged governance/ops tools (`tools/governance/**`, `tools/ops/**`: read only) and the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only).
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run commands in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin task/lane-x` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file (test-runner `PASS <check>` lines are fine). Your REPORT states what you did and the raw evidence. An independent Grok review decides; the PM merges.
6. Stop and write `tasks/WG.33.01/lane-x/escalation.md` (then commit and push it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.
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

