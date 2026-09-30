# NAT.03.01 / lane-cw writer report

Date: 2026-09-30. Writer: Codex / OpenAI. Branch: `task/lane-cw`.
Implementation SHA: `9d8515d86b548c5a84d2fee6259198f3b615677e`.
Status: writer implementation submitted for independent Grok / xAI review;
no approval, WBS closure, merge or push by this writer.

## What changed

- `game/js/plugins/DEUS_Fluid.js`: one budget across dirty areas and hydro lake
  visits; explicit zero-work tick; dirty-area rotation; range rebasing and
  preservation of dormant outer-layer records; common coordinate parsing;
  caller-z walkability; capacity-aware placement; typed reconciliation;
  saved fallback displacement; missing-key reset and failed-require payload
  retention; actual mass-deletion mutant; shared passage adapters.
- `game/js/sim/hydro/index.js`: prebuilt global/per-area lake indexes and
  evaporation-only schedules; measured work/probe counters; typed displaced
  lava in hydro v2 with v1 water migration; no grid-mass bitwise narrowing;
  shared Fluid barriers for rain, lateral/upward spill and seep columns.
- `docs/systems/DEUS_Fluid.md`: replaced unsupported completion and performance
  claims with observed contracts, wiring, save migration and D2/playtest gaps.
- `tools/test_fluid_correctness_lane_cw.js`: 23 deterministic behavior cases,
  each paired with a targeted mutant that must fail the named assertion.
- `tasks/NAT.03.01/lane-cw/lane.json`: added the requested correctness suite as
  an integration gate; kept existing syntax and strata gates and reviewer role.
- Lane report, work log and evidence: bounded writer handoff and test provenance.

The work-budget unit is a dequeued fluid cell or scheduled lake visit. Both share
the caller's allowance. Seep probes inside a fluid item remain bounded by the
live Z span and are reported separately in `cost().examined`; this is not a
millisecond limit. Definition/import/index rebuilds, diagnostics and save scans
are explicit non-tick operations. Range rebasing visits queued state once on
range change, not every frame.

## How I tested it

Working-tree runs: the new correctness suite reported 46 passing checks (23
behavior cases plus 23 killed mutants). The existing strata suite reported 36
passing assertions and 5/5 killed mutants. Water dynamics and namespace attach
regressions passed. The syntax gate reported 62 plugin files, zero syntax errors.
These are writer-run headless results, not an independent review.

Fresh-clone execution on implementation SHA
`9d8515d86b548c5a84d2fee6259198f3b615677e`, Node v24.19.0, started
2026-09-30 19:02 UTC. Clone was made with
`git clone --no-local --single-branch --branch task/lane-cw`; its path is
`C:/Users/snewt/AppData/Local/Temp/deus-lane-cw-9d8515d8-1790794694833`.
It had clean tracked/untracked status before and after the gates. All five
unmutated command runs exited zero; the final strata run ended at
2026-09-30 19:04:49 UTC.

| Command | Observed outcome | Log |
|---|---|---|
| `node tools/check_deus_syntax.js` | EXIT=0; 62 plugin files, 0 syntax errors | [syntax](evidence/syntax.log) |
| `node tools/test_fluid_correctness_lane_cw.js` | EXIT=0; 23 behavior cases + 23 mutants; 46 passed, 0 failed | [correctness](evidence/correctness.log) |
| `node tools/test_strata_fluid_reconciliation.js` | EXIT=0; 36 assertions passed, 0 failed; 5/5 mutants detected | [strata](evidence/strata.log) |
| `node tools/sim/test_water_dynamics.js` | EXIT=0; 9-/32-layer cases and negative controls; 0 failures | [water dynamics](evidence/water_dynamics.log) |
| `node tools/sim/test_fluid_attach.js` | EXIT=0; attach/flood-accessor cases and negative control; 0 failures | [attach](evidence/attach.log) |
| `node tools/test_fluid_correctness_lane_cw.js --case=i_real_mass_deletion --mutant=mass_delete` | Expected EXIT=1; 4 remaining vs 5 initial | [deletion mutant](evidence/mass_deletion_mutant.log) |

Additional source checks: `node --check game/js/sim/hydro/index.js`,
`node --check tools/test_fluid_correctness_lane_cw.js`, and `git diff --check`
returned zero. The plugin syntax gate does not enumerate sim modules, so the
explicit hydro check and runtime loading in the suite cover that file.

The initial scheduling change revisited an area within one tick, exposing six
water-suite failures (seep resume and spring depletion at both ranges). Running
the unchanged suite against sources from starting SHA `939b98c3` passed. Limiting
the scheduler to one pass per initially active area restored the suite; waiter
and spring wakeup functions were not changed. The final committed code also
advances hydro outlet time on positive-budget calls with a zero lake share.

## Evidence

No screenshot was produced. Editor F5/F8 and visual inspection: NOT RUN, as the
brief assigns this lane foundational correctness and defers playable proof to
D2 integration. Fresh-clone gate logs above include command, implementation SHA,
Node version, UTC start/end, working directory and real exit status. Trailing
spaces in captured output are stripped for repository whitespace checks.

Observed working-tree log excerpts:

```text
Checked 62 DEUS plugin files. Errors: 0
RESULT: 46 passed, 0 failed
TOTAL CHECKS: 36
PASSED: 36
FAILED: 0
MUTANT VERIFICATION: 5/5 mutants detected.
RESULT: PASS (0 failed)
```

The standalone deletion control, copied from its fresh-clone log:

```text
RESULT: 0 passed, 1 failed
FAIL i_real_mass_deletion: destination lost mass under deletion mutant
4 !== 5
EXIT=1
```

That failure is expected test evidence; it runs only against the explicit
mutation switch. The unmutated lane suite exits zero.

## Not done / known problems

- D2 still owns authority across `sim/hydro`, `sim/hydrology` and Levels' legacy
  flood behavior. No files under `sim/hydrology` were edited.
- **D2 pending item — displaced liquid:** keep `hydro.displaced` (water),
  `hydro.displacedLava`, and unavailable-hydro `pendingDisplaced` typed and saved.
  No deletion or automatic return was added. The eventual store/return design
  and water/lava reaction products remain open.
- Waiter/spring wakeup policy is unchanged; this lane makes no broader wakeup
  correctness claim. No new pressure or reaction simulation was added.
- If hydro cannot require, its opaque saved payload is preserved but is not
  simulated or included in live hydro mass diagnostics. A later process with
  working hydro imports it. Unknown future-schema interpretation while hydro
  is available is outside this fix.
- F5 playtest, F8 console check, screenshot proof, renderer behavior, engine FPS
  and GC measurements are NOT RUN. Existing `Sprite_UFFloodOverlay` is restricted
  to views z=-1/-2 in the inspected source; this lane does not extend it.
- `docs/STATUS.md` and `docs/VISION.md` are coordinator-owned and excluded by
  this manifest. `WORK_LOG.md` records the local claim/exception; coordinator
  status reconciliation is pending. `docs/systems/DEUS_WaterDynamics.md` is also
  outside the whitelist and retains older scheduling/schema descriptions; the
  updated Fluid document states this lane's contract.
- Independent review, coordinator integration via `merge_gate`, and Owner
  acceptance remain outstanding. Passing writer tests do not close the lane.

## Try it in RMMZ

Proposed follow-up only; these steps were NOT RUN:

1. On an isolated integration copy after the D2 bridge decision, open
   `game/game.rmmzproject`, start editor Playtest (F5), and pause simulation.
2. Use an approved test basin and adjacent porous column with known water/lava
   placement. Record source/receiver z, capacity, type and depth. Compare the
   area-object spellings and World walkability at those exact coordinates.
3. Resume, close/open the test door, and inspect rain/spill/seep outcomes. Shrink
   a liquid cell's capacity with a different liquid above it. Observe depth,
   type and the typed displaced totals.
4. Save to an unused slot, reload, and inspect the same records/totals. Inspect
   F8 throughout and capture/open screenshots of the relevant moments.

Expected: compatible queries and caller-z passability; closed barriers stop
transfers; reconciliation retains both liquid totals; save/load preserves the
typed state. Visibility depends on the eventual D2 bridge and approved test art.
No observed RMMZ outcome is claimed here.

## Decisions needed

- D2: final fluid authority, displaced-liquid store/return behavior and reactions.
- Independent Grok / xAI review at the implementation SHA, followed by the
  coordinator's normal integration and Owner playtest gate.
- Coordinator: reconcile global status and the out-of-whitelist WaterDynamics
  note with the bounded contracts and limitations in this report.

## GAME TRANSLATION

WBS / Lane: NAT.03.01 / lane-cw.

Approved scope / Owner authorization reference: direct Owner writer assignment,
2026-09-30; MSG-PRUNE-PM-034 and `BRIEF.md`; design-independent fixes (a)-(i).

Writer SHA / evidence date: `9d8515d86b548c5a84d2fee6259198f3b615677e` /
2026-09-30. Later handoff commits change report/evidence only.

Translation Class: C FOUNDATIONAL / INDIRECT.

Player / World Effect: protects fluid depth/type/passability/save state from
coordinate disagreement, capacity loss, type substitution and save contamination;
shares simulation work across queued areas. These are headless-observed
foundations for stable pools, barriers and saved liquids, not a playable claim.

Trigger: `Fluid.tick/step`, `setCell`, range expansion, geometry-change events,
hydro rain/spill/seep, and DataManager save/load.

Runtime Authority: Fluid owns this solver's sparse packed grids and dirty queues;
`sim/hydro` owns its aquifer/atmosphere/typed displaced stores. Unified world
authority with `sim/hydrology` and legacy Levels flood data remains D2's decision.

Simulation Path: `DEUS_Fluid.js` parsing, area scheduling, `stepArea`,
`reconcileCellWithStrata` and save hooks -> `sim/hydro/index.js` indexed lake
scheduling, `deliver`, `seepFrom`, typed mass and import/export. Existing
`permeability.js` is consumed unchanged. The brief lists `pressure.js` and
`evaporation.js`, but those files do not exist in this checkout's `sim/hydro`;
evaporation is in `index.js` and no pressure solver was created.

Engine Bridge: existing `Game_Map.update` -> `Fluid.tick`, Levels query/event
adapters, World walkability and DataManager aliases remain. The actual flood
overlay consumer is `DEUS_Levels.js:Sprite_UFFloodOverlay`, which reads
`getFloodGrid` and Fluid depth. The brief's `DEUS_Visuals.js` consumer attribution
was not substantiated by code inspection. D2 unification is not implemented.

Visible Result: no live visual result observed. The corrected data would prevent
wrong-depth movement tests, disappearing saved liquid, lava relabeled as water
and per-area multiplication of simulation work. Existing rendering was not run.

Persistence: Fluid schema 1 records retained across legacy-range loads; optional
hydro v2 adds `displacedLava` with v1 water migration; optional tagged
`pendingDisplaced` preserves typed fallback amounts. Absent top-level keys reset;
failed hydro require preserves an isolated opaque payload. The new suite proves
both key aliases, isolation, outer-layer retention and typed round trips.

Failure Without This Lane: work scales with the number of queued areas despite
the caller budget; lake lists are rebuilt every tick; outer-layer records are
discarded; area overloads disagree; capacity reconciliation overwrites another
type or loses/relabels displaced lava; loading old saves leaves previous liquid
state; failed hydro require discards its saved payload; large water totals wrap;
hydro enters object barriers.

Automated Proof: exact commands, outcomes and logs in How I tested it and Evidence.
Lane fixtures use 8x8 areas, controlled strata/object geometry, nonzero area
coordinates, 9-/32-layer expansion, 20 queued areas, 2,000 read-only allocated
areas and 20,000 registered lake cells. Each of 23 cases has a targeted negative
control, with assertion failures required (syntax/runtime errors do not count
as killed mutants). The existing seeded Levels suite uses seed 20260923 and
proves real Levels/Fluid capacity, height alias and event delivery headlessly;
the attach suite exercises real flood accessors. This is separate from playable
RMMZ proof.

In-Game Proof: NOT RUN. Proposed isolated-playtest steps above; no screenshots,
live console evidence, player interaction result or engine performance evidence.

CONSUMED BY GAME SYSTEMS:

- `DEUS_Levels.js`: physical-height/query aliases and flood grids. Headless strata
  suite `levels_alias_phys_height`, capacity, gravity, displacement and save
  checks; attach suite `flood_uses_solver`/`volume_across_flood_fills`. Corruption
  would give incorrect heights, flood types or persistence.
- `DEUS_Levels.js:Sprite_UFFloodOverlay`: grid and depth presentation. Source path
  inspected, actual sprite rendering NOT RUN; corruption could display missing
  pools or incorrect liquid opacity/type.
- `DEUS_World.js`: `Fluid.walkable(...,{z,canSwim,lavaImmune})` at movement and
  World passability sites. Direct Fluid predicates tested; complete movement
  integration NOT RUN. Wrong z could allow entry into deep water or lava.
- `DataManager`: both Fluid save key aliases. Controlled alias hooks tested by
  this lane; real editor save-slot workflow NOT RUN.
- `DEUS_WorldGen.js`: strata mutations reach the real Levels events exercised
  by the existing reconciliation fixture; complete generated-world lake behavior
  is not proven by this lane.

GAME BRIDGE STATUS

Simulation implemented: YES — bounded fixes in committed code with headless
assertions and targeted failure proofs; no authority consolidation.

Engine bridge implemented: YES — existing Fluid/Levels/World/DataManager hooks
remain and selected Levels/Fluid contracts run headlessly. D2 bridge unification
and full live movement/save integration: NO.

Presentation implemented: NO — no presentation change; existing limited Levels
overlay identified in source, live behavior not checked.

Input/player interaction implemented: NO — foundation-only lane, existing World
consumer named but no input implementation or player demonstration.

Save/load implemented: YES — controlled hook tests plus real Levels fixture
serialization; editor save-slot workflow not run.

Playable verification performed: NO — NOT RUN, as specified by the brief.

Remaining step before player can experience it: independent review and authorized
integration of these fixes, D2 authority/bridge decisions, then editor F5/F8
proof and Owner acceptance with approved content. No next lane is opened here.
