# Lane BD Brief: DEUS-TSK-ZRANGE-HARNESS repair the stale vm harnesses of tools/test_column_landforms.js and tools/test_vertical_worldgen_proof.js

**LAUNCH GATE MET (PM, 2026-09-27 ~13:10 CT):** Owner request 12:51 CT (team idle; get fix lanes and unblocked work going). Follow-up PROPOSED-BB-01 from Lane BB (inbox 0145-EO). Both tests exit 1 on main at `ecc7b8984a0ab1a919595c792f98a60f18872f73` before running one check. Routing: writer grok-4.7 xhigh (multi-agent on); reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034; Pro takes the merge gate back once it resets). Not a WBS row: PM ops task id `DEUS-TSK-ZRANGE-HARNESS` (same pattern as DEUS-TSK-GEOLOGY-GATE).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-bd | **Task ID:** DEUS-TSK-ZRANGE-HARNESS | **Branch:** task/lane-bd | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-bd` | **Writer:** grok (grok-4.7 xhigh) | **Reviewer:** gemini (non-author) | **Size:** S-M | **Base:** origin/main `ecc7b8984a0ab1a919595c792f98a60f18872f73`

## PM diagnosis (verify it yourself first)
On main both tests die while loading the plugins:
```
DEUS_Levels.js:72
    const CORE = window.UF.World.Z_RANGES.legacy;
TypeError: Cannot read properties of undefined (reading 'legacy')
```
Cause: each test installs a hand-written `UF.World` stub (no `Z_RANGES`, no `UF.Space`) and then requires `DEUS_Levels.js`. Since WG.00.17 (commit `bdf45b4c`, 2026-09-26, "Z range authority in DEUS_World") `DEUS_Levels.js` reads `UF.World.Z_RANGES.legacy` at load and `UF.Space` (GRID_SIZE_FEET, STRATUM_FEET) later. Both tests were last changed in `27d509c6` (2026-09-22). Lane BB fixed the same fault in `tools/test_geology_strata.js` by loading the real `DEUS_World.js` (see branch `origin/task/lane-bb`, commit `11e4d630`, and `setup()` in `tools/test_strata_foundation.js`). Use that pattern.

## allowedPaths (exact; mirrored in `tasks/DEUS-TSK-ZRANGE-HARNESS/lane-bd/lane.json`)
- `tools/test_column_landforms.js`
- `tools/test_vertical_worldgen_proof.js`
- `tasks/DEUS-TSK-ZRANGE-HARNESS/**`
Every plugin, every other test and all data are READ-ONLY. This is a harness repair: no gameplay code changes.

## Lanes running at the same time (their files are off limits to you)
- BB (DEUS-TSK-GEOLOGY-GATE FIX2): `tools/test_geology_strata.js`, `tools/test_strata_foundation.js`
- BD (DEUS-TSK-ZRANGE-HARNESS): `tools/test_column_landforms.js`, `tools/test_vertical_worldgen_proof.js`
- BE (WG.00.21): `game/js/plugins/DEUS_Depth.js`, `game/js/plugins/DEUS_Culling.js`, `tools/occlusion/**`, `docs/systems/DEUS_OcclusionCulling.md`
- BF (WG.00.36): `game/js/plugins/DEUS_Select.js`, `game/js/plugins/DEUS_LayerOverlays.js`, `docs/systems/UF_Select.md`, `tools/select_xlayer/**`
- BG (WG.00.39): `game/js/sim/combat_rt/**`, `game/js/plugins/DEUS_CombatRT.js`, `game/js/plugins/DEUS_Combat.js`, `game/js/sim/taming/**`, `game/js/plugins/DEUS_Taming.js`, `tools/taming_party/**`, `docs/systems/DEUS_TamedPartyCombat.md`
- BH (SOC.10.03): the nine `game/data/plans/<race>.plan.json` files, `tools/plans/test_race_plans.js`
Each lane's `tasks/<task>/**` folder is its own. Everything not in your allowedPaths is read-only.

## Docs to read (only these)
- the two tests, `tools/test_strata_foundation.js` (`setup()`), and Lane BB's `tools/test_geology_strata.js` at `origin/task/lane-bb` (read with `git show origin/task/lane-bb:tools/test_geology_strata.js`)
- `docs/systems/DEUS_ZRange.md` sections 1-3 and 7 (range object, configurations, legacy -2..+2 core, `UF.Space` scale: 2 ft strata, 10 ft layers)
- only the parts of `DEUS_World.js`, `DEUS_WorldGen.js`, `DEUS_Levels.js` the checks call (read only)

## Scope
1. Replace each stale hand-written `UF.World` stub with a vm sandbox that loads the real plugins the checks need (DEUS_World.js before DEUS_WorldGen.js and DEUS_Levels.js, plus any other plugin a check calls), with only the RMMZ engine stubs they touch. Keep each test dependency-free and runnable from the repo root as `node tools/<test>.js`.
2. Keep every existing check and its meaning. Never weaken an assertion. Keep any existing mutant/provoke mode working.
3. The 32-layer frame is Owner-decided (DEC-013: 32 layers -16..+15, 2 ft strata, 10 ft layers) and implemented by WG.00.17 (`docs/systems/DEUS_ZRange.md`). If, once the harness loads, a check fails only because it hard-codes the pre-WG.00.17 frame (zMin -2, 5 levels, 1 ft strata, 5 ft layers), re-derive the expectation from the documented rule through the live API (`UF.World.zRange()`, `UF.Space.*`), not from observed output, and keep it exact. Name every such change in REPORT.md with the doc line that decides it. If a check fails for any other reason (behaviour that no doc explains), do NOT change it: record exact expected/actual output and the deciding doc lines in `tasks/DEUS-TSK-ZRANGE-HARNESS/lane-bd/escalation.md`, commit, push, stop.
4. Add a harness self-check to each test that fails loudly (exit 1, clear message) if a plugin fails to load, plus a mutant that proves it (for example `--mutant=no_world`).
5. REPORT.md: root cause with the commit, what changed per test, raw gate output with EXIT values, mutant results, PROPOSED-BD-NN follow-ups (for example other tests with the same stale stub, found by read-only search; do not fix them here).

## Acceptance
- Both tests exit 0 on your tip, or a scope-3 escalation.
- New load mutants exit 1.
- Every lane.json gate test passes, output pasted in REPORT.md.
- The independent Gemini review passes. Only then can the task be marked DONE (by Gemini).

## Gate tests
- `node tools/test_column_landforms.js`
- `node tools/test_vertical_worldgen_proof.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only. Never touch `art/**` (including the untracked `art/sprites/`) or `game/img/**`.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BD-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the raw output with EXIT values into `tasks/DEUS-TSK-ZRANGE-HARNESS/lane-bd/REPORT.md`.
6. Never weaken an existing assertion or gate (no loosened ranges, no removed checks, no try/catch that turns a failure into a pass, no quarantine/delisting). Keep `node tools/check_deus_syntax.js` passing. Every new check has a mutant or provocation that makes it FAIL.
7. Do not merge; do not self-certify. The PM runs your gate tests on your tip first (Owner rule, 2026-09-27 11:26 CT); an independent review by a different AI family (Gemini) then decides. Any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-bd`); never main, never force, never set DEUS_INTEGRATOR. Never edit `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, any WBS file, `docs/agents/PROVIDER_USAGE_STATUS.json`, `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `tools/ops/**` or `tools/governance/**`. A plugin registration you need goes in REPORT.md as a Registration request.
9. Final output line: `FINAL SHA: <sha>`.
