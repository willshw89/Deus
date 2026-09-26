# Lane M Brief addendum: ADR-003 Rev 3 (SIM.00.01), PM relaunch after Grok FAIL

**NO ART GENERATION BY ANYONE.** This is an architecture document lane. No code, no art, no image generation.

**Lane:** lane-m | **Task ID:** SIM.00.01 | **Branch:** task/lane-m | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-m` | **Writer:** claude | **Reviewer:** grok (new independent review after this run) | **Base:** task/lane-m at `8e2fed138cf4ef822bb4d7adc34f3b509ebe3563` (contains the Grok review) with main at `b612bc7217349bce695e15395bd041f63673b89b` for citations

This addendum supersedes the Rev 2 instructions in `tasks/SIM.00.01/lane-m/BRIEF.md` where they conflict. Everything else in BRIEF.md (nine required sections, zero-code rule, file:line citations) still applies.

**allowedPaths** (exact, unchanged):
- `docs/adr/ADR-003_sim_render_split_and_lod.md`
- `docs/adr/README.md`
- `tasks/SIM.00.01/lane-m/**` (except the review files `review_grok_*.md`, which are the reviewer's and must not be edited)

**FORBIDDEN:** everything else, in particular `game/**`, `tools/**`, `docs/worldgen/**`, `docs/art/**`, `docs/society/**`, `docs/OWNER_DECISIONS.md`, `docs/VISION.md`, `docs/STATUS.md`, every `*WBS*.md`.

## Why this run
The independent Grok review `tasks/SIM.00.01/lane-m/review_grok_c456cb73.md` (commit `8e2fed138cf4ef822bb4d7adc34f3b509ebe3563`) returned `VERDICT: FAIL` on ADR-003 Rev 2, mainly because Rev 2 specifies 9 layers (-4..+4) and the old band table, while the Owner amended DEC-013 to 32 layers. Read that review in full first. ADR-003 stays PROPOSED until Owner plus PM sign-off.

## Required changes (Rev 3)
1. Address every finding in the review, in order. Add a "Rev 3 change log" table at the top of the ADR mapping each review finding (by its number/heading) to the section and lines that address it, or to an explicit disagreement with reasons. Do not edit the review.
2. 32 layers: retarget A5.1, A15 and every Z assumption to 32 continuous layers, default range -16..+15, surface 0, 320 ft (5-ft squares, 10-ft layers, 5 strata of 2 ft), and the amended five bands (LOWER2 -16..-9, LOWER1 -8..-1, SURFACE 0..+3, UPPER1 +4..+9, UPPER2 +10..+15; PM defaults, OPEN for the Owner). State that storage and LOD scale past 32. Keep the UNIFORM-chunk sparse storage pattern the review praised.
3. Budgets: define 32-layer memory and save-size budgets that grow with occupied or MIXED cells, not with 32 x area, and require fixtures and harnesses at both 9 and 32 layers. Mark numbers that depend on Lane K's benchmarks as PENDING-K3 with the exact measurement that will fill them.
4. Adopt DEC-017 (docs/OWNER_DECISIONS.md on main) as a new section 13 "Engine Exit Path": RMMZ stays the shell for menus, dialogue, save, database and battle; the fallback map renderer is a custom multi-layer PixiJS renderer inside Scene_Map only, decided with the Owner after the Lane K normal/stress baselines and the 32-vs-5-layer occlusion benchmark. Show how the sim/render boundary makes that swap possible without touching the sim core.
5. Reflect the Owner decisions recorded on main since Rev 2 wherever they touch the sim/render boundary, LOD or storage: DEC-016 (scale chart), DEC-018 (hyper-realistic SRD spell effects as sim-core consumers: ignite, blast/floor breach, fluid source/sink, freeze, terrain edit), DEC-019 (stratum height presentation and movement), DEC-020 (seamless ramps and camera follow), DEC-021 (occlusion: draw cost follows exposed area), DEC-022 (cross-layer targeting and volume damage). Cite each DEC by id and heading; do not restate or change the decisions.
6. Re-verify every file:line citation against main `b612bc7217349bce695e15395bd041f63673b89b` (game/ and tools/ are the evidence) and fix the ones the review found wrong (e.g. the WBS SIM.00.01 row pointer and the Factions CONTACT line).
7. Update `docs/adr/README.md` (ADR-003 status stays PROPOSED, Rev 3).
8. Write `tasks/SIM.00.01/lane-m/REPORT_REV3.md`: commands with raw EXIT lines, the finding-to-fix table, citations re-checked (count true/false before and after), final `git rev-parse HEAD`.

## Acceptance criteria (the next Grok reviewer will check these)
- No 9-layer default remains except where explicitly described as the legacy/test configuration.
- 32-layer budgets and 9/32-layer harness requirements exist; DEC-017 section 13 exists.
- Every review finding is addressed or explicitly disputed.
- Citations sampled by the reviewer are true at `b612bc7217349bce695e15395bd041f63673b89b`.
- No file outside allowedPaths changed; ADR remains PROPOSED; nothing self-certified.

Commit messages start `[claude] SIM.00.01 Rev 3`.

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
