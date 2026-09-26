# Lane R Brief: Decay cycle design (decay, reclamation, weathering, decay-to-geology), docs only (SIM.40.05)

**NO ART GENERATION BY ANYONE (DEC-007). NO CODE.** This is a design / documentation lane. No code, no scripts, no tests, no art, no edits outside the allowedPaths below.

**Lane:** lane-r | **Task ID:** SIM.40.05 (one design covering SIM.40.05 decay, SIM.40.06 nature reclaiming, SIM.40.07 item weathering and burial, SIM.40.08 deep-history decay, and the long-run test SIM.40.09 needs) | **Branch:** task/lane-r | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-r` | **Writer:** claude | **Reviewer:** grok (independent, launched later by the PM; the task is not DONE until that review passes) | **Base:** origin/main `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` | **Source:** Directive 0028-AC A2 item 6 (PM design queue), re-scoped by the PM on 2026-09-26 to align with the SIM.50.01 living-world gap audit.

**allowedPaths** (exact):
- `tasks/SIM.40.05/lane-r/**` (the launcher also writes its saved prompt under `tasks/SIM.40.05/lane-r/launches/`; leave it alone)

**FORBIDDEN:** everything else. In particular `game/**` and `tools/**` (read only; commit no code, scripts or tests; ad-hoc `node -e` one-liners and `git grep` runs for counting are fine), `docs/**` (read only, including `docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/audits/**`, `docs/design/**`, `docs/telemetry/**`), `art/**`. You do NOT mint WBS IDs, change WBS statuses or answer Owner questions. Proposed new work items are written `PROPOSED-R-NN`, never as real IDs. (0028-AC named `docs/design/sim/SIM.40.05_DECAY_RECLAMATION.md` as the output path; the PM moved the deliverable into this lane's task folder to keep the write set tight. Do not write under `docs/`.)

## Goal
Design the full matter cycle of abandonment and time in DEUS: built objects decay through ruin stages to rubble and scrap, rubble and organics weather into soil and sediment, sediment is buried and over very long times becomes rock, and metals rust into mineral traces that never become ore. Ruins must stay recognisable long enough to matter (LIFE-003) and must be re-foundable. The audit found no structure decay, maintenance or abandonment state (DEC-1), no item weathering (DEC-2), remains that vanish and organics that never return to soil (DEC-3, LIFE-001), no deep-history physical sites (DEC-4), burned items that vanish with no ash or carbon (FIR-3), no live abandonment or re-founding and no lasting ruins (SET-1, SET-2, SET-4), and no mass ledger (F-04).

## Inputs (read these; cite them)
- **The SIM.50.01 audit** `docs/audits/LIVING_WORLD_GAP_AUDIT.md` (Grok PASS, merged `4614dbfa`; review `tasks/SIM.50.01/gap-audit/review_grok_1953c0a5.md`). Match its rigor and citation style (`file:line` at your base commit). Its §6 order of work governs sequencing: 1) rule-breach fixes, 2) mass ledger WG.65.15 moved earlier, 3) WG.00.17 32-layer + sparse-memory refactor, 4) core tick and slow clocks (ADR-003, SIM.00.02-.05), 5) material and structure model (not yet in the WBS), 6) SIM.40 support/collapse, 7) SIM.30 LOD regions, 8) SIM.50.02-.10.
- WBS: `docs/worldgen/DEUS_WORLDGEN_WBS.md` (Rev 25 at base; SIM.00, SIM.30, SIM.40, SIM.50, SIM.60, WG.00.17, WG.65.15, GP.07.02), `docs/society/DEUS_SOCIETY_WBS.md` (SOC.*).
- Decisions and rules: `docs/OWNER_DECISIONS.md` (DEC-010 rock ledge support, DEC-011, DEC-012, DEC-013, DEC-014, DEC-015, DEC-018, DEC-019..DEC-022), `docs/VISION.md` (V74, V83, V95, V123, V128, V133, V137, V138, V139, V140, V141, V142), `docs/INVARIANT_REGISTRY.md` (INV-SIM-02, INV-SIM-03), `docs/RISK_REGISTER.md` (LIFE-001..003, NAT-003).
- Existing design docs, read only: `docs/design/` (for example `DURABILITY.md`, `REMAINS.md`, `ECOLOGY.md`, `PEOPLES.md`, `TERRAIN_LEVELS.md`, `VERTICAL_WORLD.md`, `VERTICAL_NATURAL_WORLD.md`, `WORLD_ARCHITECTURE.md`, `TECH_TREE.md`); flag where they disagree with DEC-013 or the audit.
- Code, read only, cite `file:line` at the base commit: `game/js/plugins/DEUS_Levels.js` (materials ~L1006, `writeCell` event ~L1558, constructed-strata flag ~L1602, `applyVolumeDamage`, `effectiveSupport` ~L1940), and the plugins the audit cites for your area.
- The SRD 5.1 data at `game/data/srd51/`.
- Audit sections for this lane: §2.5 clocks, §2.6 conservation, §3.2 erosion and sediment, §3.3 vegetation, §3.4 fire (FIR-3), §3.8 settlements (SET-1..4), §4.2 decay (DEC-1..4), §4.1 (interfaces to collapse), §5, §6, §8 (X-7 `isRuined` never set).
- `docs/design/DURABILITY.md`, `docs/design/REMAINS.md`, `docs/design/ECOLOGY.md`, `game/data/DEUS_WorldCatalog.json` (remains ~L9922, `weatherResistance`, `corrosionResistance`, burned-wall rubble ~L10246), `DEUS_Anim.js` (~L1162), `DEUS_History.js` (~L1508), `DEUS_HistoricalDemographics.js` (~L319), `DEUS_Objects.js` (~L266).
- SRD 5.1 where relevant: object HP/AC by material (`rules.json`), rust effects (for example the rust monster in `creatures.json`), and spells that age, decay or restore (for example Mending, Wall of Stone, Stone Shape, Move Earth).
- Unreviewed sibling input if present: Lane Q (`origin/task/lane-q`, `tasks/SIM.40.01/lane-q/`) for the material model and collapse interface.

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
| R-01 | **Decay drivers:** material class, exposure (rain, freeze-thaw and snow per SIM.50.06, standing water per SIM.50.02, burial, fire damage), maintenance and abandonment state (who counts as maintaining; when a site becomes abandoned); per-material rates as parameters with defaults and their sources. |
| R-02 | **Structure stages:** intact -> weathered -> overgrown -> collapsed ruin -> rubble/scrap -> buried mound -> soil/sediment -> rock (lithification over geological time), per material; roofs fail before walls; what each stage is in the strata/object model and which catalogue slot name marks it (DEC-011, names only). |
| R-03 | **Metals and items:** organics rot to soil and nutrients; wood and textiles; bone; stone items; metals corrode to rust and mineral-trace material that is never ore and never feeds ore veins (LIFE-002, D-5); durable relics and buried finds; remains no longer vanish (DEC-3). |
| R-04 | **Fire residue:** burned matter leaves ash and charcoal with conserved mass (FIR-3) and how ash then weathers into soil; the link to SIM.50.05's ash beds. |
| R-05 | **Decay-driven collapse hand-off:** how decay lowers member strength and hands off to SIM.40.01/.02 collapse with localized support rechecks (interface contract with Lane Q stated explicitly). |
| R-06 | **Nature reclaiming:** vegetation invasion of abandoned cells (SIM.50.04, overturning the current `DEUS_Objects.js` rule that keeps plants off built cells), sediment burial (SIM.50.03), underground variants (cave fungus, flooding) across the 16 below-surface layers. |
| R-07 | **Ruins, abandonment and re-founding (LIFE-003, SIM.50.09):** when and how a settlement becomes a physical ruin (fixing the X-7 gap in design), which traces must survive and for how long (foundations, vaults, mounds, roads), salvage of stone and scrap with conserved mass, and re-founding on existing foundations (SET-4). |
| R-08 | **Deep history and LOD:** summary decay for fast-forward and off-focus regions (SIM.40.08, SIM.30.02, DEC-012), slow clocks (NAT-003), and the calendar mapping under both D-1 options (durations in abstract years plus a mapping table). |
| R-09 | **Matter ledger long-run test:** a deterministic long-run fixture (a site aged through every stage over at least 10,000 simulated years) proving every ledger class total is exact at every checkpoint, zero ore delta, and trace retention per LIFE-003; mutants that must fail (a leak, an ore creation, an over-erasure). |
| R-10 | **Sparse storage and cost at 32 layers:** representation of decay state (per structure and per region, not per cell per tick), scheduling on slow clocks, memory per site/region/layer, per-tick CPU class, save representation (D-3). |
| R-11 | **Acceptance tests and fixtures for the later code lanes:** automatable tests for SIM.40.05-.09 each with a mutant that must fail. |
| R-12 | **WBS impact and Owner questions:** PROPOSED packages with real dependency IDs (including the material model prerequisite, WG.65.15 ledger, SIM.40.01), and Owner questions with options (for example decay speeds, how long ruins stay recognisable, whether lithification is in scope). |

For every mechanism: state the rule, the data it reads and writes (with its sparse representation), the trigger (event or slow clock, never a full scan), the ledger entries it makes, the per-tick CPU class and memory at 32 layers (order of magnitude, show the arithmetic and assumptions per DEC-014 population and DEC-012/ADR-003 LOD tiers), and what the SRD says where the SRD has anything to say.

## Deliverables (all under `tasks/SIM.40.05/lane-r/`)
1. `SIM.40.05_DECAY_CYCLE.md`, the design document. Header: task, base commit (paste `git rev-parse HEAD`), inputs read, method, limits, dependency on PROPOSED ADR-003. It must contain these exact headings (the gate checks them):
- `## Decay drivers`
- `## Structure stages`
- `## Metals and items`
- `## Fire residue`
- `## Decay-driven collapse`
- `## Nature reclaiming`
- `## Ruins and re-founding`
- `## Deep history and LOD`
- `## Matter ledger long-run test`
- `## Sparse storage and cost`
- `## Acceptance tests`
- `## WBS impact`
- `## Owner questions`
   Size: at least 24,000 bytes. Every claim about code cites `file:line` at the base commit; every claim about planning cites a WBS ID, DEC ID, V row, invariant or audit gap ID (for example `LAND-5`, `SUP-1`, `DEC-1`, `REP-2`).
2. `trace.json`: `{ "task": "SIM.40.05", "baseCommit": "<sha>", "requirements": [ { "id": "R-01", "section": "<exact heading text or a phrase that appears verbatim in the doc>", "status": "COVERED|PARTIAL|OWNER_QUESTION", "notes": "..." }, ... ], "proposedPackages": [ { "id": "PROPOSED-R-01", "title": "...", "deps": ["<real WBS ids>"], "acceptanceTests": ["..."] } ], "ownerQuestions": [ { "id": "OQ-R-01", "question": "...", "options": ["..."] } ] }` with exactly 12 requirement records `R-01`..`R-12` in the order above.
3. `REPORT.md`: every command that matters with raw `EXIT=` lines, the gate output, counts (requirements by status, proposed packages, Owner questions) and the final `git rev-parse HEAD` after your last commit.

## Gate check (in `tasks/SIM.40.05/lane-r/lane.json`)
A node one-liner run from the repo root: `trace.json` parses, `task` is `SIM.40.05`, it has exactly the 12 requirement IDs, every status is one of the three words, every `section` string appears verbatim in `SIM.40.05_DECAY_CYCLE.md`, every required heading is present, there is at least one Owner question, and the doc is at least 24,000 bytes. Run it yourself before your final commit and paste its output in REPORT.md.

## Acceptance criteria (the independent Grok reviewer will check these)
- The full chain object -> ruin stages -> rubble/scrap -> soil/sediment -> rock is specified with per-material rules and conserved mass at every step.
- Metals end as rust/mineral traces; no path creates ore (LIFE-002, D-5); burned matter leaves ash/charcoal (FIR-3).
- Ruins, abandonment and re-founding satisfy LIFE-003 with named trace-retention rules.
- The long-run ledger test is concrete enough for SIM.40.09 to implement, with mutants.
- Every required row answered; sampled `file:line`, WBS, DEC, V and audit-gap citations all resolve at the base commit.
- Geometry is 32 layers -16..+15, 5-ft squares, 10-ft layers, 2-ft slices everywhere; no 1-ft strata or 5-level assumptions survive except where explicitly marked as the stale code state.
- Sparse storage covers memory and saves; no mechanism needs a full-world scan; tick and memory costs are shown with arithmetic.
- Every matter transformation names its ledger classes; no path creates ore; conjured matter only through logged sources/sinks.
- D-1 left open (durations shown under both options); D-4 and D-6 dependencies flagged; Owner questions listed with options, never answered.
- Proposed packages use `PROPOSED-R-NN`, name real dependency IDs, and each has automatable acceptance tests including a mutant that must fail.
- No file outside allowedPaths changed; no code or art committed; nothing self-certified.

Commit messages start `[claude] SIM.40.05`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane (table below), the merged governance/ops tools (`tools/governance/**`, `tools/ops/**`: read only) and the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only).
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run commands in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin task/lane-r` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file. Your REPORT states what you did and the raw evidence. An independent Grok review decides; the PM merges.
6. Stop and write `tasks/SIM.40.05/lane-r/escalation.md` (then commit and push it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.
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
