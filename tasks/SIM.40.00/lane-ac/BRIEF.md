# Lane AC Brief: SIM.40.00 material and constructed-strata model (data catalogue, mass tables, pure module, validator)

**NO ART GENERATION BY ANYONE (DEC-007).** Data, a pure sim module, a validator, tests and a doc only. Never generate, draw, edit, request or integrate art, and never tell anyone to.

**Lane:** lane-ac | **Task ID:** SIM.40.00 (Material and constructed-strata model; `docs/worldgen/DEUS_WORLDGEN_WBS.md` M3 row, line ~535) | **Branch:** task/lane-ac | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ac` | **Writer:** grok | **Reviewer:** claude (independent attack/mutation review, launched later by the PM; the task is not DONE until that review passes) | **Base:** origin/main `092c0181949c8cb2568d86546e7e03132445df9c` | **Source:** Directive 0062-BK and Owner ruling DEC-028 (matter conserved by weight, closed-loop reclamation); WBS lists no dependency. Design inputs are merged and reviewed: SIM.40.01 structural support design (Lane Q, `d655c122`, Grok CLEAN PASS), SIM.40.05 decay cycle design (Lane R, `7f07ee48`), WG.65.15 mass ledger (Lane L1, `1f683b94`). PM brief prepared 2026-09-26 by main-chat ops for the Owner. Provider note: Codex is usage-limited until Sep 29 21:34 CT and Claude is at 95% of its weekly limit, so this lane is written by Grok and reviewed by Claude.

**allowedPaths** (exact; mirrored in `tasks/SIM.40.00/lane-ac/lane.json`):
- `game/data/sim/**` (NEW: the material catalogue and mass tables, plus a README)
- `game/js/sim/materials.js` (NEW: pure host-agnostic reader/validator of the catalogue)
- `tools/sim/test_materials.js`, `tools/sim/fixtures/materials/**` (NEW: tests, negative fixtures, mutation checks)
- `docs/systems/DEUS_Materials.md` (NEW)
- `tasks/SIM.40.00/**` (REPORT and evidence; the launcher saves its prompt under `tasks/SIM.40.00/lane-ac/launches/`; leave that alone)

**FORBIDDEN:** everything else. In particular `game/js/sim/ledger*` (read only: SIM.40.11 wires the ledger later; never edit it), `tools/sim/test_ledger*.js`, `game/js/plugins/**` (read only; most are Lane AA's live write set; **no wiring into gameplay in this package**), `game/data/**` outside `game/data/sim/**` (read only: `DEUS_ResourceRegistry.json`, `DEUS_WorldCatalog.json`/`UF_WorldCatalog.json`, `srd51/*`), `game/js/sim/rules/**` (Lane AB), `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/adr/**`, `docs/audits/**`, `tasks/SIM.40.01/**`, `tasks/SIM.40.05/**`, `tasks/WG.65.15/**` (reviewed deliverables: read only), `tools/**` outside the tool paths above, `art/**`. You do NOT mint WBS IDs, change WBS statuses or answer Owner questions; proposed follow-up work is written `PROPOSED-AC-NN`.

## Goal
Turn the reviewed designs into the data contract every matter-moving system will use: one catalogue of materials (natural, loose, constructed) with physical properties, integer mass per form (per 2-ft slice of a 5-ft square for strata; per item type; per object/structure element), support/span properties for the SIM.40.01 support model, decay/reclamation outputs consistent with SIM.40.05 and DEC-028, and a mapping of every material onto the ledger's classes and families, so that SIM.40.11 can wire mining, building, collapse, decay and reclamation to `game/js/sim/ledger*` with exact weights.

## Owner rules (non-negotiable)
1. **DEC-028** (`docs/OWNER_DECISIONS.md` ~L377-388): every material, block, item and structure carries an invariant weight; mining yields items of equal aggregate weight; building consumes exact weight; collapse yields debris of identical weight; reclamation turns stone/masonry rubble into solid stone, wood/organic/corpses/bone into soil, and metals into rust/scrap or trace mineral veins, **never virgin ore**; items in active, claimed or enclosed structures are exempt (record the exemption as a rule the consumers apply; do not implement it).
2. **DEC-023 / LIFE-002** ore never respawns: no row in your data may output an ore class; the ledger's finite families (`fe`, `cu`, `ag`, `au`, `pt`, `gem`) stay finite.
3. **Geometry** (DEC-013 as amended, D-2): 5-ft squares, 10-ft layers, **2-ft strata** (five slices per layer), 32 layers. Masses are per 2-ft slice; legacy 1-ft saves need a documented conversion rule (state it; do not implement save migration).
4. **Ledger units** (`game/js/sim/ledger_defaults.js` L9-10; `tasks/WG.65.15/lane-l1/REPORT.md` Q2 ~L434, PROPOSED-L1-03 ~L452): "mu" is an integer mass unit whose size SIM.40.00/SIM.40.01 set. Propose a size (for example 1 mu = 1 kg) as a named parameter with `status: PM_DEFAULT_UNCONFIRMED`, and list it as an Owner/PM question in REPORT.md. All masses are non-negative safe integers.
5. **Open Owner questions: represent, never decide** (D-1 calendar scale for decay durations stays OWNER_OPEN; any value the designs mark OWNER_OPEN stays null with that status).

## Inputs (read; cite `file:line` at your base commit)
- `tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md` section 2 "Material model" (2.1 today's materials and the gap, 2.2 the property set, 2.3 natural, 2.4 loose, 2.5 constructed assemblies, 2.6 exact storage of loose matter, 2.7 id allocation, 2.8 PROPOSED-Q-01 input to this package), section 3 (buildings as strata), 4.3-4.5 (span capacity, load and capacity, natural rock), 6.3-6.4 (equal-mass conversion, talus), 7.4 (what Lane Q gives Lane R per material), 8.3 (blast tables); its review `review_grok_fd256fc5.md`.
- `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md` (decay classes, rust rows, NOBLE never corrodes) and `review_grok_9a2908fb.md`.
- `game/js/sim/ledger.js`, `game/js/sim/ledger_defaults.js`, `tasks/WG.65.15/lane-l1/LEDGER_API.md` (classes, forms, families, compositions, transform rows).
- `game/data/DEUS_ResourceRegistry.json` (conservedClasses ~L500-507), `game/data/DEUS_WorldCatalog.json` (item and object types), `docs/audits/LIVING_WORLD_GAP_AUDIT.md` F-03/F-04 and section 2.4, `docs/adr/ADR-003_sim_render_split_and_lod.md` section 7.8 (PROPOSED), `docs/systems/DEUS_PHYSICAL_WORLD_SIMULATION_SPEC.md`.

## What to build
1. **`game/data/sim/materials.json`**: one record per material: stable id (SIM.40.01 2.7), kind (`natural` / `loose` / `constructed`), ledger `class` and `family` (or integer `composition` for alloys, matching the ledger), density (kg/m3 with a cited source or `PLACEHOLDER`), `massPerSlice` in mu for one 2-ft slice of a 5-ft square (computed from density and the mu size, the rule written in the README), support properties from SIM.40.01 (bearing capacity, max unsupported span in squares, weight class), porosity/permeability placeholder for later seepage (SIM.50.02), flammability and combustion products (mass-conserving, into the organic/ash rows the ledger has), decay path (SIM.40.05 class), mined/broken yield (which loose material and how many mu per slice: equal weight), reclamation target per DEC-028, and `status` per value (`SOURCED`, `PM_DEFAULT`, `OWNER_OPEN`, `PLACEHOLDER`). Cover at least the stones, soils, sand, gravel, clay, wood species, the five metals and the ledger's alloys, rubble, sediment, ash/charcoal, bone, ice and every material the SIM.40.01 tables name.
2. **`game/data/sim/mass_tables.json`**: integer mass (mu) per item type and per object/structure element, keyed by the ids in `DEUS_WorldCatalog.json` (read only). Coverage: every catalogue item/object type made of matter has a row, or is listed as `massless` with a reason (for example an effect). Constructed assemblies (walls, floors, doors, beams) give their bill of materials per element so building consumes exact weight.
3. **`game/data/sim/interactions.json`**: the interaction matrix for stone, wood, soil and metals (what bears on what, what burns, what rusts, what erodes), consistent with SIM.40.01 and SIM.40.05.
4. **`game/data/sim/README.md`**: file meanings, units, the mu rule, the 1-ft to 2-ft conversion rule, how SIM.40.11 consumes the data, open questions.
5. **`game/js/sim/materials.js`**: pure CommonJS module in the style of `game/js/sim/ledger.js` (no host globals, no clock, no randomness, sorted iteration): `createMaterials(data)` returning getters (`material(id)`, `massOf(id, form, count)`, `yieldOf(id)`, `reclaimTarget(id)`, `billOfMaterials(elementId)`) and `validate(data, ledgerDefaults)` returning a list of named errors.
6. **`tools/sim/test_materials.js`** (one `PASS <name>` / `FAIL <name>` line per check, final `RESULT: <n> passed, <m> failed`, exit 0 only when all pass), with negative fixtures under `tools/sim/fixtures/materials/`: every ledger class/family referenced exists in `ledger_defaults.js` (read with `require`, never edited); alloy compositions match the ledger; every mass is a positive safe integer; mined yield and collapse output conserve mass exactly; no reclamation, decay, combustion or yield output is an ore class; metals reclaim to rust/scrap/trace only; catalogue coverage for items and objects; bills of materials sum exactly; no layer count or 1-ft strata hard-coded; purity scan of `materials.js` (seen to fail on a mutant); determinism (two loads give identical checksums); **mutation checks** on in-memory copies (at least one mutant per rule killed). `node tools/sim/test_ledger.js` must still pass unchanged (117/0 at base).

## Tests and commands
- FOREGROUND, from the worktree root: `node tools/sim/test_materials.js`, `node tools/sim/test_ledger.js`, `node tools/check_deus_syntax.js`. These are light. **Do not run the NW.js harness (`tools/run_tests.js`).**
- Before your final commit run every `gateTests` entry of `tasks/SIM.40.00/lane-ac/lane.json` exactly as written and paste raw output with `EXIT=` lines in REPORT.md.
- Prove scope: paste `git diff --name-only 092c0181949c8cb2568d86546e7e03132445df9c..HEAD` and show every path matches allowedPaths.

## Deliverables
1. The data files, README, module, doc and tests above.
2. `tasks/SIM.40.00/lane-ac/REPORT.md`: every command with raw `EXIT=` lines; counts (materials, item/object rows, massless rows with reasons, checks, fixtures, mutants killed); the value-status census (how many SOURCED / PM_DEFAULT / OWNER_OPEN / PLACEHOLDER); disagreements between SIM.40.01, SIM.40.05, the ledger defaults and the catalogue (never silently fixed); Owner/PM questions (mu size, anything else) with options, not answered; `PROPOSED-AC-NN` follow-ups for SIM.40.11 and SIM.50.02; the scope diff; the final `git rev-parse HEAD`.

## Acceptance criteria (the independent Claude reviewer will check these)
- No file outside allowedPaths changed; zero edits to `game/js/sim/ledger*` or any plugin.
- Every material maps onto the ledger; every mass is an integer and conserved through yield/collapse/bills of materials; nothing outputs ore; catalogue coverage is complete or each gap is reasoned.
- Open values keep their status; no calendar length or tick rate is chosen.
- All suites exit 0 on clean data; every negative fixture fails; every mutant is killed. Nothing self-certified; REPORT evidence is raw.

Commit messages start `[grok] SIM.40.00`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane (table below), the merged governance/ops tools (`tools/governance/**`, `tools/ops/**`: read only) and the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only).
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run commands in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin task/lane-ac` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file (test-runner `PASS <check>` lines are fine). Your REPORT states what you did and the raw evidence. An independent Claude review decides; the PM merges.
6. Stop and write `tasks/SIM.40.00/lane-ac/escalation.md` (then commit and push it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.
7. Your very last output line must be `FINAL SHA: <sha>`, with the sha pasted from `git rev-parse HEAD` after a successful push (or `FINAL SHA: <sha> (push refused)`).

## Live lanes at preparation (write sets are disjoint; do not touch another lane's paths)
| Lane | Task | Role | Write set |
|---|---|---|---|
| Y | OPS.30.01 GATE runner and quarantine census | Claude writer | `tools/ops/run_gate.js`, `tools/ops/test_run_gate.js`, `tools/ops/quarantine.json`, `tools/ops/fixtures/run_gate/**`, `tasks/OPS.30.01/**` |
| Z | OPS.70.02 secrets scanner and dependency checker (resume 1) | Claude writer | `tools/security/**`, `tasks/OPS.70.02/**` (+ three PM security-fix grants) |
| AA | WG.00.17 32-layer Z range, sparse storage | Claude writer | 22 `game/js/plugins/*.js` files (Levels, World, Fluid, WorldGen, Minimap, Depth, Environment, DayNight, Ecology, Wildlife, History, Colonists, Doors, Fire, Floors, Items, Jobs, Objects, Ownership, Walls, UF_Households, HistoricalDemographics), 5 `docs/systems` files, `tools/test_zrange.js`, `tools/zrange/**`, `tasks/WG.00.17/**` |
| AB | SIM.60.05 SRD 5.1 combat rules engine | Grok writer | `game/js/sim/rules/**`, `game/js/plugins/DEUS_Combat.js`, `tools/rules/**`, four `tools/test_srd_*`/`test_d20_*` proofs, `docs/systems/UF_Combat.md`, `docs/systems/DEUS_Rules.md`, `tasks/SIM.60.05/**` |
| E | WG.00.09a attack plan | PAUSED (do not touch) | `docs/systems/UF_Depth_Attack_Plan.md`, `tasks/DEUS-TSK-FABLE-19C/*` |