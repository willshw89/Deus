# Lane W Brief: Population design (lineage, lifecycle, carrying capacity, nine races), docs only (SIM.40.10)

**NO ART GENERATION BY ANYONE (DEC-007). NO CODE.** This is a design / documentation lane. No code, no scripts, no tests, no art, no edits outside the allowedPaths below.

**Lane:** lane-w | **Task ID:** SIM.40.10 (shared reproduction and lifecycle for people, livestock, wildlife and monsters, plus population budget and carrying capacity (DEC-014), the nine SRD races with one culture plan each (D-6), and the dependencies migration needs) | **Branch:** task/lane-w | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-w` | **Writer:** claude | **Reviewer:** grok (independent, launched later by the PM; the task is not DONE until that review passes) | **Base:** origin/main `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` | **Source:** Directive 0028-AC A2 item 6 (PM design queue), re-scoped by the PM on 2026-09-26 to align with the SIM.50.01 living-world gap audit.

**allowedPaths** (exact):
- `tasks/SIM.40.10/lane-w/**` (the launcher also writes its saved prompt under `tasks/SIM.40.10/lane-w/launches/`; leave it alone)

**FORBIDDEN:** everything else. In particular `game/**` and `tools/**` (read only; commit no code, scripts or tests; ad-hoc `node -e` one-liners and `git grep` runs for counting are fine), `docs/**` (read only, including `docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/audits/**`, `docs/design/**`, `docs/telemetry/**`), `art/**`. You do NOT mint WBS IDs, change WBS statuses or answer Owner questions. Proposed new work items are written `PROPOSED-W-NN`, never as real IDs. (0028-AC named `docs/design/sim/SIM.40.10_POPULATION_LIFECYCLE.md` as the output path; the PM moved the deliverable into this lane's task folder to keep the write set tight. Do not write under `docs/`.)

## Goal
Design how populations live, grow, die and descend in DEUS so later code lanes (SIM.40.10, SIM.50.07 migration, SIM.50.09 settlements, SOC.10.02-.03 faction plans, SIM.30 LOD) share one reviewed model. The audit found live pregnancy and aging dormant (REP-1), births that create full adults with no food mass (REP-2, LIFE-001), no animal age, sex, litter, gestation or lifespan and no species origin setting (REP-3), fixed caps and no crowd counts instead of DEC-014's budget (REP-4), wildlife movement AI removed (MIG-1), and nine people species in data but only seven cultures (PLAN-4). The PM has decided (D-6, the Owner may object) that each of the nine SRD races gets its own culture/faction plan.

## Inputs (read these; cite them)
- **The SIM.50.01 audit** `docs/audits/LIVING_WORLD_GAP_AUDIT.md` (Grok PASS, merged `4614dbfa`; review `tasks/SIM.50.01/gap-audit/review_grok_1953c0a5.md`). Match its rigor and citation style (`file:line` at your base commit). Its §6 order of work governs sequencing: 1) rule-breach fixes, 2) mass ledger WG.65.15 moved earlier, 3) WG.00.17 32-layer + sparse-memory refactor, 4) core tick and slow clocks (ADR-003, SIM.00.02-.05), 5) material and structure model (not yet in the WBS), 6) SIM.40 support/collapse, 7) SIM.30 LOD regions, 8) SIM.50.02-.10.
- WBS: `docs/worldgen/DEUS_WORLDGEN_WBS.md` (Rev 25 at base; SIM.00, SIM.30, SIM.40, SIM.50, SIM.60, WG.00.17, WG.65.15, GP.07.02), `docs/society/DEUS_SOCIETY_WBS.md` (SOC.*).
- Decisions and rules: `docs/OWNER_DECISIONS.md` (DEC-010 rock ledge support, DEC-011, DEC-012, DEC-013, DEC-014, DEC-015, DEC-018, DEC-019..DEC-022), `docs/VISION.md` (V74, V83, V95, V123, V128, V133, V137, V138, V139, V140, V141, V142), `docs/INVARIANT_REGISTRY.md` (INV-SIM-02, INV-SIM-03), `docs/RISK_REGISTER.md` (LIFE-001..003, NAT-003).
- Existing design docs, read only: `docs/design/` (for example `DURABILITY.md`, `REMAINS.md`, `ECOLOGY.md`, `PEOPLES.md`, `TERRAIN_LEVELS.md`, `VERTICAL_WORLD.md`, `VERTICAL_NATURAL_WORLD.md`, `WORLD_ARCHITECTURE.md`, `TECH_TREE.md`); flag where they disagree with DEC-013 or the audit.
- Code, read only, cite `file:line` at the base commit: `game/js/plugins/DEUS_Levels.js` (materials ~L1006, `writeCell` event ~L1558, constructed-strata flag ~L1602, `applyVolumeDamage`, `effectiveSupport` ~L1940), and the plugins the audit cites for your area.
- The SRD 5.1 data at `game/data/srd51/`.
- Audit sections for this lane: §2.7 focus, LOD and population budget, §3.6 migration (MIG-1..), §3.8 settlements, §4.3 reproduction (REP-1..5), §4.4 faction plans (PLAN-1..4), §5, §6.
- `docs/design/PEOPLES.md`, `docs/design/EMERGENT_SOCIETY.md`, `docs/design/PERSONALITY.md`, `docs/design/AUTONOMOUS_CIVILIZATION.md`, `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md`, `game/data/DEUS_WorldCatalog.json` (`people` ~L7305, `cultures` ~L9306, plans ~L8158), `DEUS_Colonists.js` (pregnancy ~L2482, aging ~L2806, food ~L1521, caps ~L2886), `DEUS_History.js`, `DEUS_HistoricalDemographics.js` (~L128 species profiles), `DEUS_Ecology.js` (~L684-714 herd breeding), `DEUS_Wildlife.js` (~L1197 removed AI), `UF_Households.js`.
- SRD 5.1 races in `game/data/srd51/character_options.json` (entries with kind `race`: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling, plus subraces). Use SRD age/maturity/lifespan, size, speed and darkvision text as the baseline; creature data in `creatures.json` for livestock, wildlife and monsters.
- Unreviewed sibling inputs if present: Lane O2's people-side gap audit (`origin/task/gap-audit-people`, `tasks/SIM.50.11/gap-audit-people/`), Lane R (`origin/task/lane-r`) for remains-to-soil.

## Fixed world rules (apply to every section)
- **Geometry (DEC-013 as amended, Owner ruling D-2):** 32 Z layers, range **-16..+15** (surface 0); **5 ft x 5 ft squares**; **10 ft per layer**; **5 slices (strata) of 2 ft per layer**. The code's 5 levels x 1 ft strata (audit F-01, 22 files) is stale and is replaced by WG.00.17; design against 2-ft slices and 10-ft layers only, and say where a number would differ under the stale model.
- **Sparse storage (DEC-013 §3, Owner ruling D-3):** mandatory for **in-memory state as well as saves**. Memory and save size scale with occupied or changed cells/entities, never with 32 x area. Every data structure you propose states its sparse representation (runs, hashed chunks, on-demand allocation, per-entity records) and its cost.
- **Change-driven (V133, NAT-003):** no per-tick or per-frame full-world scans. Slow processes run on slow clocks (hour/day/season/decade services per the audit §6 step 4 and ADR-003 once signed off).
- **Mass conservation (LIFE-001):** every transformation moves mass between named ledger classes of the mass ledger (WG.65.15, which the audit moves earlier). Nothing is created or deleted except through explicitly modelled sources and sinks (rain/evaporation, conjured matter per DEC-018's PM default), each logged.
- **Ore never respawns (LIFE-002, Owner ruling D-5):** no process may create ore or finite minerals. The live stones-into-ore sprouts (audit VEG-1, F-03) are a bug queued for removal, not a feature.
- **Water authority (PM decision D-4, Owner may object):** the newer solver (`DEUS_Fluid`) becomes the single water authority, wired into the game; the legacy flood fill that creates water (audit WAT-1) is retired. Design against that.
- **Calendar scale (D-1) is OWNER_OPEN.** V123 currently makes 1 game day = 1 year (seasons are 6-hour quarters). Express every duration in abstract game-time units (for example "years of simulated time") plus a mapping table showing what each duration means under D-1 option (a) separate solar day from year and option (b) keep V123. Never choose one.
- **Rendering (DEC-011):** flat 1:1 layer rendering, no filters, tints, fog, shading overlays or scaling. Any visible stage (for example ruin stages) is a catalogue slot name only.
- **Rules bible:** SRD 5.1 at `game/data/srd51/` (`rules.json`, `creatures.json`, `character_options.json`, `spells.json`, `equipment.json`, `magic_items.json`) plus `docs/SRD5_1_COVERAGE_MANIFEST.md`. SRD numbers are the baseline; physical consequences are added on top (DEC-018), never replacing SRD numbers.
- **NO CODE, NO ART.** Docs only. No image generation, drawing, palette colours or art requests of any kind (DEC-007). An art need is written as a text-only line: "art slot needed: <name>, <purpose>" for the Owner.
- **ADR-003** is not on main. Rev 3 is on `origin/task/lane-m` (`docs/adr/ADR-003_sim_render_split_and_lod.md`) and is under independent Grok review: cite it as PROPOSED, read it with `git show origin/task/lane-m:<path>`, and flag every assumption that depends on it.
- Owner rulings and PM decisions from the SIM.50.01 audit (§9) as applied by the PM on 2026-09-26: D-2, D-3, D-5 are Owner rulings; D-4 and D-6 are PM decisions the Owner may still overturn (flag any design choice that depends on them); D-1 is OWNER_OPEN.

## Required content (every row must be answered in the design doc; each maps to one entry in `trace.json`)
| ID | Required content |
|---|---|
| W-01 | **Lifecycle:** birth, growth stages, maturity, aging, elderhood and death per species class (SRD races, livestock, wildlife, monsters); species origin kinds (`breeds`, `spawned`, `created`, `unique`, DEC-014 §5); SRD age and lifespan baselines per race; what reactivates versus replaces the dormant code (REP-1, REP-5, `DEUS_Colonists.js` / `DEUS_History.js`). |
| W-02 | **Lineage:** parents, genealogy and kinship records (sparse, bounded, and how old lineages compact into summary history), heritable traits for people and animals, households, and the feed into history and the history-born character mode. |
| W-03 | **Reproduction and mass:** mating, pairing rules, gestation, litter size and birth spacing per species; young built from food eaten (food mass to body mass), bodies and remains returning to soil via Lane R's decay chain (LIFE-001, REP-2); ledger entries for every step. |
| W-04 | **Carrying capacity:** food, water, shelter and space limits per region and per layer/biome band; anti-snowball pressures and no arbitrary ceilings (DEC-014 §1); famine, disease and predation as the limiting mechanisms; the numbers as parameters with sources. |
| W-05 | **Nine SRD races and culture plans (D-6):** one culture/faction plan slot per SRD race (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling); SRD traits relevant to population (lifespan, maturity, darkvision for underground life, size); reconciling the catalog's nine people species and seven cultures (PLAN-4); DEC-015 plan schema links (SOC.10.02-.03); home layer ranges stay OPEN (DEC-013) and are never assigned. Flag everything that depends on D-6. |
| W-06 | **Population LOD:** individuals near focus versus crowd counts elsewhere (DEC-014, DEC-012, SIM.30.01-.03); exact conservation of people, livestock and wildlife counts and lineage on promotion and demotion; the individual budget. |
| W-07 | **Migration dependencies:** what SIM.50.07 animal migration and people migration need first: a movement model (MIG-1, SIM.00.04), seasons (SIM.50.06, blocked on D-1), regions (SIM.30.01), carrying-capacity pressure, cross-layer travel under soft home ranges (DEC-013); refugees and settlement founding (SIM.50.09). |
| W-08 | **Dormant and conflicting code today:** REP-1..5, MIG-1 and the 200-per-faction cap with `file:line`, and a per-item keep / reactivate / replace recommendation for the later code lane. |
| W-09 | **Health and death hooks:** the minimal interfaces for disease, injury, famine, SRD conditions and exhaustion, and violent death, so the people-side audit (SIM.50.11) and later health packages can attach; no health system is designed here. |
| W-10 | **Sparse storage and cost at 32 layers:** per-individual, per-household, per-herd and per-region memory; lineage storage growth over centuries and its compaction; per-tick CPU class on slow clocks; save representation (D-3). |
| W-11 | **Acceptance tests and fixtures for the later code lanes:** automatable tests (population stays within carrying capacity over long runs, births cost food mass exactly, lineage integrity, LOD promote/demote conserves counts, nine race slots present) each with a mutant that must fail. |
| W-12 | **WBS impact and Owner questions:** PROPOSED packages with real dependency IDs, and Owner questions with options (for example per-race lifespans if SRD text is vague, cross-race offspring rules, how many named individuals the budget holds, the D-6 race-plan slot list). |

For every mechanism: state the rule, the data it reads and writes (with its sparse representation), the trigger (event or slow clock, never a full scan), the ledger entries it makes, the per-tick CPU class and memory at 32 layers (order of magnitude, show the arithmetic and assumptions per DEC-014 population and DEC-012/ADR-003 LOD tiers), and what the SRD says where the SRD has anything to say.

## Deliverables (all under `tasks/SIM.40.10/lane-w/`)
1. `SIM.40.10_POPULATION_LIFECYCLE.md`, the design document. Header: task, base commit (paste `git rev-parse HEAD`), inputs read, method, limits, dependency on PROPOSED ADR-003. It must contain these exact headings (the gate checks them):
- `## Lifecycle`
- `## Lineage`
- `## Reproduction and mass`
- `## Carrying capacity`
- `## Nine races and culture plans`
- `## Population LOD`
- `## Migration dependencies`
- `## Dormant code today`
- `## Health and death hooks`
- `## Sparse storage and cost`
- `## Acceptance tests`
- `## WBS impact`
- `## Owner questions`
   Size: at least 24,000 bytes. Every claim about code cites `file:line` at the base commit; every claim about planning cites a WBS ID, DEC ID, V row, invariant or audit gap ID (for example `LAND-5`, `SUP-1`, `DEC-1`, `REP-2`).
2. `trace.json`: `{ "task": "SIM.40.10", "baseCommit": "<sha>", "requirements": [ { "id": "W-01", "section": "<exact heading text or a phrase that appears verbatim in the doc>", "status": "COVERED|PARTIAL|OWNER_QUESTION", "notes": "..." }, ... ], "proposedPackages": [ { "id": "PROPOSED-W-01", "title": "...", "deps": ["<real WBS ids>"], "acceptanceTests": ["..."] } ], "ownerQuestions": [ { "id": "OQ-W-01", "question": "...", "options": ["..."] } ] }` with exactly 12 requirement records `W-01`..`W-12` in the order above.
3. `REPORT.md`: every command that matters with raw `EXIT=` lines, the gate output, counts (requirements by status, proposed packages, Owner questions) and the final `git rev-parse HEAD` after your last commit.

## Gate check (in `tasks/SIM.40.10/lane-w/lane.json`)
A node one-liner run from the repo root: `trace.json` parses, `task` is `SIM.40.10`, it has exactly the 12 requirement IDs, every status is one of the three words, every `section` string appears verbatim in `SIM.40.10_POPULATION_LIFECYCLE.md`, every required heading is present, there is at least one Owner question, and the doc is at least 24,000 bytes. Run it yourself before your final commit and paste its output in REPORT.md.

## Acceptance criteria (the independent Grok reviewer will check these)
- Lineage, lifecycle, reproduction with food-mass accounting, and carrying capacity are specified per species class with SRD baselines.
- All nine SRD races each have a culture-plan slot (D-6 flagged as a PM decision); home layer ranges left OPEN.
- Population LOD conserves counts and lineage; migration dependencies are explicit (movement model, seasons/D-1, regions).
- Every required row answered; sampled `file:line`, WBS, DEC, V and audit-gap citations all resolve at the base commit.
- Geometry is 32 layers -16..+15, 5-ft squares, 10-ft layers, 2-ft slices everywhere; no 1-ft strata or 5-level assumptions survive except where explicitly marked as the stale code state.
- Sparse storage covers memory and saves; no mechanism needs a full-world scan; tick and memory costs are shown with arithmetic.
- Every matter transformation names its ledger classes; no path creates ore; conjured matter only through logged sources/sinks.
- D-1 left open (durations shown under both options); D-4 and D-6 dependencies flagged; Owner questions listed with options, never answered.
- Proposed packages use `PROPOSED-W-NN`, name real dependency IDs, and each has automatable acceptance tests including a mutant that must fail.
- No file outside allowedPaths changed; no code or art committed; nothing self-certified.

Commit messages start `[claude] SIM.40.10`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane (table below), the merged governance/ops tools (`tools/governance/**`, `tools/ops/**`: read only) and the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only).
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run commands in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin task/lane-w` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file. Your REPORT states what you did and the raw evidence. An independent Grok review decides; the PM merges.
6. Stop and write `tasks/SIM.40.10/lane-w/escalation.md` (then commit and push it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.
7. Your very last output line must be `FINAL SHA: <sha>`, with the sha pasted from `git rev-parse HEAD` after a successful push (or `FINAL SHA: <sha> (push refused)`).

## Live lanes at preparation (write sets are disjoint; do not touch another lane's paths)
| Lane | Task | Role | Write set |
|---|---|---|---|
| S | WG.20.02 art catalogue | Claude writer | `art/catalogue/**`, `docs/art/catalogue/**`, `tools/art/build_catalogue.js`, `tools/art/test_catalogue.js`, `tools/art/fixtures/catalogue/**`, `tasks/WG.20.02/lane-s/**` |
| U | WG.41.01 placement + validator | Claude writer | `tools/art/place_art.js`, `tools/art/validate_art.js`, `tools/art/test_place_art.js`, `tools/art/fixtures/place/**`, `docs/art/APPROVALS_FORMAT.md`, `tasks/WG.41.01/lane-u/**` |
| O2 | SIM.50.11 people-side gap audit | Claude writer | `tasks/SIM.50.11/gap-audit-people/**`, `tasks/SIM.50.11/lane-o2/**` |
| K, M, T, P | reviews of WG.00.09b, SIM.00.01, WG.32.02, SIM.60.01 | Grok reviewers | their own `review_grok_*.md` files only |
| Q | SIM.40.01 structure design | Claude writer | `tasks/SIM.40.01/lane-q/**` |
| R | SIM.40.05 decay cycle design | Claude writer | `tasks/SIM.40.05/lane-r/**` |
| W | SIM.40.10 population design | Claude writer | `tasks/SIM.40.10/lane-w/**` |
Sibling design lanes Q, R and W run in parallel and share interfaces (Q owns support/collapse, R owns decay stages, W owns population). Read the others' branches (`git show origin/task/lane-q:<path>` etc.) if they exist, cite them as unreviewed, and write interface assumptions explicitly rather than waiting.
