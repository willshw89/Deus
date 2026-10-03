# Re-plan: structure, collapse and building across Z after DEC-083

> **Owner amendment, 2026-10-02 22:35 CT — queued after worldgen green:** [D-2026-10-02-20](../DECISIONS.md) supplies the matter rule for the digging/building work discussed below (including proposed nx4/nx5). Every block/item has `weight_lb`, from SRD where available or a labeled estimate. Mining/building/collapse conserve weight 1:1: block -> stone items -> wall -> rubble. One fixture runs mine -> build -> collapse and compares total weight before/after. No separate mass/world ledger; reclaim/regrowth are later decay using the same weights. The earlier "never converted" / "no rubble" proposal below is superseded where it conflicts with the approved wall-to-rubble path. This weight rule does not change the connectivity support rule or authorize implementation during ORG-0.2.

Proposal of 2026-10-02. Read-only study at main 6eedfd33 (DEC-083 plus its two amendments, `docs/OWNER_DECISIONS.md:1387-1399`). Nothing is committed or staged. OWNER QUESTION = the Owner may want to rule. PM TO CONFIRM = my own choice, change freely. First lane: `BRIEF_nx1.md`. Sources and what I could not check: `NOTES.md`.

## 1. The four rules in one paragraph

Owner, 2026-10-02 (DEC-083 amendments, his words): "I basically just want it to work like minecraft, it'll hold as long as there's something somewhere holding it up, otherwise shit falls, people can still get crushed etc"; "But unlike minecraft I want to be able to drain lakes and shit so water needs to be calculated"; "as does lava". So: (1) structure is pure connectivity: a solid block is held when a chain of face-adjacent solid blocks, across Z too, reaches an anchor; there is no load, span, weight, capacity, HP band or integrity ladder; (2) an unheld piece falls straight down as one rigid body to first contact; matter is moved, never converted, so the closed-mass ledger posts nothing and there is no rubble; what it lands on is crushed; (3) floors and roofs are ordinary solid strata, so mining and blast damage remove them like walls and expose the level below; (4) building is adjacent-block placement across Z: accepted when the new block attaches to a held block, refused otherwise. Water and lava stay calculated and finite (DEUS_Fluid); collapse meets them in two places only: an opened floor or roof lets fluid fall, a landing piece displaces fluid.

## 2. Facts that change the brief (all checked in the repo)

- The cell-write contract named in the task is not on main. lane-dc (merged 062e7e65) is WG.00.45, area-generation speed (`tasks/WG.CELL-WRITE/lane-dc/REPORT.md`); its brief only lists the CELL surfaces as untouched (`BRIEF.md:129`). `commitMatterBatch`, `removeStratum`, `registerMatterParticipant`, `revisionAt`, `world:geometryChanged` and the matter host have zero hits in `game/` and `tools/` (`git grep`). They are lanes du, dv, dw, dx, dy, dz (planned, waves 5-9, behind dd and df). What exists is `setStrata`/`setShape`/the damage API ending in `writeCell` with `levels:*` events (section 4). The new set builds on that and leaves a seam for `commitMatterBatch`.
- A fall changes no (class, form) total, so it needs no ledger post. The accounted-write chain (host parcels, `commitMatterBatch`, collapse postings) leaves the collapse critical path. The old plan put collapse behind 14 serial `DEUS_Levels.js` writers; no lane below edits Levels.
- `DEUS_Fluid` is a companion plugin loaded from `DEUS_Core.js:93`, not listed in `game/js/plugins.js`. That it loads in NW.js without a masked error: not checked.
- The WBS doc has no NAT.02.01.* rows (`git grep`); leaf rows live in `tasks/wbs_registry.json` (NAT.02.01 reopened, NAT.02.01.RUBBLE planned; BRIDGE, WET, PROOF, NAT.02.02 unregistered). Older WBS rows still say capacity or rubble: section 9.
- The board snapshot is stale for dc, do and dm; main shows dc `062e7e65`, do2 `968ac67c`, dm `f01d0454` merged.

## 3. The old lanes (wave, writer > reviewer, size from the plan; states from the board: all `planned` except en)

| Lane | Old role | Verdict | What happens |
|---|---|---|---|
| en | rooted topology (w1, claude>grok, M), MERGED 4bac3eff | KEEP the scaffolding | Keep counter (`rooted.js:79`), resumable job pattern (`:102`, `:491`), address helpers (`reader.js:36`), fixture reader (`:81`), mutation harness (`tools/test_structural_rooted.js`). Span, HP band, ratedLoad and member model are dead; nx3 archives them. |
| eo | load, capacity, ladder (w3, grok>gemini, M) | DROP | The lane is the capacity engine DEC-083 removes (load, capacity, bands, calibration file). Its counted per-tick budget idea lives on in nx1. |
| ep | bounded resumable planner (w4, claude>grok, L) | REPLACE by nx1 (+ nx3 wiring) | Keep: one counter, cursors, deterministic fair service, stable geometry = zero work, unknown is pending. Drop: load evaluation, `CollapsePlan` with 'breach', footprint reserve. |
| eq | commit via `commitMatterBatch` (w8, codex>grok, M) | REPLACE by nx2 | Commit becomes vacate-then-fill through `setStrata`: no postings, no rubble destinations, no `note("collapse")`, no cp transfer. Swap to a `move` op when dx lands. |
| fo | rubble entities (w6, claude>grok, M) | DROP | DEC-083 item 2: no rubble. |
| fr | wet strata in the commit (w14, codex>grok, S) | DROP | Already withdrawn by DEC-067 item 5. Fluid meets a fall through events (section 8). |
| fv | structural save codec (w9, claude>gemini, S) | DROP | Merged into eu by DEC-067. Replaced by a seeds-only save section in nx3. |
| es | runtime on the shared tick (w9, claude>grok, L) | REPLACE by nx3 | Keep: events enqueue only, `UF.Sim.onTick`, no frame hook, stats, PM-made registration commit. |
| et | occupants land, SRD falling damage (w10, claude>gemini, M) | KEEP with changes, split | Pure occupant plan in nx2, binding in nx3. Changes: crush rule (OQ2) replaces "pend if no authority"; same code serves a floor that was mined or blasted (nx4). |
| eu | versioned structural save (w11, claude>gemini, M) | REPLACE by nx3 | No legacy migration: no structural saves exist. Seeds only (section 7). |
| ev | integrity in Look, rubble art, indicators (w12, claude>grok, M) | DROP | Ladder and rubble are gone. Keep a small `explain(ref)` (AGENTS rule 14) in nx3. A stratum-HP indicator (DEC-046) would be a separate Owner call. |
| ew | dry F5 cave-in, adversarial gate (w13, claude>grok, M) | REPLACE by nx3 | Keep the rule "no harness calls collapse directly": mining or damage, events, tick, fall. Mutants no_subscribe, drop_events. |
| fk | wet collapse adapter (w16, claude>grok, L) | DROP | DEC-067 already shrank it; DEC-083 amendment 2 makes the fluid side the existing event path plus lane-fm. Tests live in nx2/nx3. |
| fq | participant: rubble displacement, pore release (w13, claude>gemini, M) | DROP | Withdrawn by DEC-067. Its useful half, a solid placed in fluid displaces it, is lane-fm's goal. |
| fs | wet collapse live (w17, claude>grok, M) | DROP | Withdrawn by DEC-067. |
| ft | barrier breach live (w18, claude>gemini, M) | DROP | Goes with fj. |
| fj | NAT.02.02 barrier integrity and breach (w17, grok>codex, L) | DROP as designed, HOLD | Demand/capacity/calibration is the engine DEC-083 removes. Pressure breaking a dam is a separate Owner question (OQ6); nx6 is the held replacement. |
| fp | proof on a generated world (w19, codex>grok, M) | REPLACE | By the in-engine scenarios of nx3, nx4, nx5 and nx2's baseline census. |

## 4. What exists to reuse, and what must be built

Reuse (each read at 6eedfd33):
- **Strata store**: 5 strata of 2 ft per 5 ft cell, byte = material id with 0x80 constructed, HP byte (`DEUS_Levels.js:1222-1245`, `docs/systems/DEUS_Levels.md` "Strata"). Floors and roofs are strata already (decks are S0 slabs, `DEUS_Floors.js:245`).
- **One writer**: `writeCell` `:1983` stores the record, then emits `levels:strataChanged` `:2004`, `levels:shapeChanged` `:2011`, `levels:cellChanged` via `:3750-3754`; `setStrata` `:2025` (five bytes + HP, `refuseIfStanding` default false); `setShape` `:3638`; damage `applyStrataDamage` `:2185`, `applyVolumeDamage` `:2245`, `sphereDamage` `:2271` (box and sphere, cross levels; 0 HP becomes air, `levels:strataDestroyed`). Nothing in `game/js` outside Levels calls them (`git grep`; only test harnesses do): rule 3's force side exists, its callers (spells) do not.
- **Reads**: `strataAt` `:2070` (allocates), `hasOpaqueOverburden` `:2433`, `getStrataFluidPassage` `:2451` (DOWN/UP/SIDE bits). `effectiveSupport` `:2394` is a diagnostic number, not a rule.
- **Fluid**: listens to the four `levels:*` events (`DEUS_Fluid.js:1238-1241`); `reconcileCellWithStrata` `:1142` moves fluid beyond capacity to the cell above, then 4 neighbours, then `hydro.receiveDisplaced`/`pendingDisplaced` (conserved); `canDrainDown` `:380` reads the DOWN bit, so a mined floor drains a lake one level per Fluid tick.
- **Tick**: `UF.Sim.onTick(name, order, fn)` `DEUS_World.js:585`, 36 game-seconds, no frame hook, no ticks during history (`:565-603`, `game/js/sim/host/tick.js`); loader `UF.Sim.require` `:511`; vm hook `tools/lib/vm_sim_require.js`. `UF.Events.emit` is synchronous, times every listener and swallows handler errors (`DEUS_Core.js:280-297`): handlers must only enqueue.
- **World**: `wrapStep` `:1741` (torus areas), `inWorld` `:761`, `unitsInArea` `:1573`, `standerAt` `:1447` (scans every unit: call once per commit, not per cell), `moveUnitToLevel` `:1819`. Hurting a unit outside combat: `Environment.stepBurning` `:472-492` and `Fire.burnUnit` `:654-665` lower `unit.data.hp`, show a popup and call `Combat.onUnitDeath(unit, null)` (`DEUS_Combat.js:1223`). SRD dice: `rules.fallingDamage(feet)` `game/js/sim/rules/rules.js:744`. `DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md` section 7 already says creatures under a fall take SRD bludgeoning dice and objects are crushed.
- **lane-en kernel**: see row en. **Mining today**: `mine`/`quarry` on a `solid` shape calls `setShape(target, "floor")` (`DEUS_Jobs.js:478-481`, four strata) with a "mine" matter note; a built wall object is dismantled to items. Floors and roofs cannot be mined; "Dig" (`DEUS_Interact.js:152-262`) only retiles ground to dirt.
- **Building today**: `build` job places an object at `job.target` including z (`DEUS_Jobs.js:720-776`); non-ground floors are refused (`DEUS_Floors.js:354-355`); rooms get a strata deck at z+1 (`:245`); colonist plans refuse "unsupported airborne construction" by `walkable` (`DEUS_Colonists.js:3775`). No DEUS_Construction* or DEUS_Placement* file exists (Glob); `game/js/sim/placement/encounters.js` is creature placement.
- **Ledger**: per (class, form) totals, `transform` `game/js/sim/ledger.js:423`; `reclaim.note("collapse")` `reclaim.js:815` posts the 56 "collapse" rows of `materials.json`; wall removal calls it (`DEUS_Objects.js:412-415`, `DEUS_Walls.js:73`). A fall must call none of these.
- Not reusable: Levels' flood BFS (`:3952`, area-wide 2-D, lane-dz removes it); NaturalConnections' stairwell chains (walk links, start area only, `DEUS_NaturalConnections.js:137-143`); `terrainStats` floor components.

Must be built: connectivity kernel, fall plan, dirty queue and service; Levels and object reader; fall commit; occupant plan; runtime plugin and save section; vertical mining; cross-Z building; fluid interface tests; archive of the span and rubble code.

## 5. The new lane set (5 lanes, 1 held; the old set was 16 plus fp)

Order: nx1 > nx2 > nx3 > nx4 > nx5. No lane edits `DEUS_Levels.js`. Merged dependencies used: lane-en (4bac3eff), lane-db (1899d5ea, sim loader and vm hook), lane-dm (f01d0454, tick), lane-dc (062e7e65, makes a real-Levels vm run affordable, about 3.2 s per area). Not needed: do2 (no mass in a move). Ids are placeholders; WBS ids carry a collision check at mint (PM TO CONFIRM): NAT.02.05 and NAT.02.06 have zero `git grep -w` hits; NAT.02.03 and .04 are avoided because old briefs use them for the withdrawn runtime.

| Lane | WBS | Title | Writer > reviewer | Depends | Owns | Tests (headless; mutants) and in-engine scenario | Size |
|---|---|---|---|---|---|---|---|
| nx1 | NAT.02.01 p2 of 3 | Pure connectivity kernel: held/falls verdicts, bounded resumable search, fall plan, dirty queue and service | claude > grok | en | `game/js/sim/structural/{block_reader,counter,connectivity,fall,queue}.js`, `index.js`, `tools/test_structural_connectivity.js`, `docs/systems/DEUS_Structural.md` | 29 checks, 28 mutants, legacy controls (span-limited and flag-trusting predicates must fail); unlimited reach, unlimited weight, ring falls, neck cut, 6-connected, cross-Z, unknown is not air, wrap, budget and resume, never falls on budget, early exit, rigid fall, first contact, 3 Z ranges, zero idle work, purity. No in-engine scenario (no consumer). | M |
| nx2 | NAT.02.01 p3 of 3 | Levels and object reader, fall commit, occupant plan, fluid interface, on real Levels and Fluid in a vm | grok > codex | nx1, db, dc | `structural/{levels_reader,commit,occupants}.js`, `index.js`, `tools/test_structural_levels.js`, `tools/test_structure_fluid.js` | Census (moved, not converted, no matter note), vacate-then-fill order, rollback, events once with cause, wall-and-deck room still held (regression), floor mined drains a lake, slab into a pool conserves water, occupant plan, baseline census (no unanchored natural rock in generator 5, 3 seeds); 14 mutants. | L |
| nx3 | NAT.02.01.BRIDGE | `DEUS_Structural` runtime: events, dirty set, shared tick, commit, occupants, seeds-only save, `explain` | claude > grok | nx2, dm, db | `game/js/plugins/DEUS_Structural.js` (sole writer), `tools/test_structural_runtime.js`, `tools/test_collapse_ingame.js`, archive moves of `rooted.js`, `support.js`, `collapse.js` and their tests, drop the pkg2 block of `tools/test_package_proofs_ingame.js` | Idle zero work over 10,000 ticks, per-tick bound, no frame hook, enqueue-only handlers, one commit per tick, save and load of seeds, crush, items, fluid pool; mutants no_subscribe, drop_events, frame_hook, convert_to_item, uncapped_commit. In-engine `collapse_cave_in` on a snapshot (screenshot opened and described). PM HOST commit registers the plugin. | L |
| nx4 | NAT.02.05 | Mine and dig floors and roofs; blast blow-out; occupants on a vanished floor | codex > grok | nx3 | `DEUS_Jobs.js`, `DEUS_Interact.js`, `tools/test_dig_vertical.js`, `docs/systems/DEUS_Jobs.md` | Dig down and mine ceiling remove one stratum; matter note once; last support mined drops the ceiling; floor mined lets water fall; `applyVolumeDamage` through a deck drops units; world floor undiggable. In-engine `dig_through_floor`. | M |
| nx5 | NAT.02.06 | Build above and below: attachment rule, builder reach, floors and roofs on any level | claude > codex | nx1, nx3, nx4 | `DEUS_Jobs.js`, `DEUS_Interact.js`, `DEUS_Floors.js`, `DEUS_Colonists.js:3775`, `tools/test_build_vertical.js`, docs | Attached block accepted incl. up and down, unattached refused, placing never drops anything else, builder stands below to roof, deck over walls holds, matter note once. In-engine `build_room_above`. | L |
| nx6 (HELD) | NAT.02.02 re-spec | Water pressure damages barrier strata (fluid side, HP only) | grok > codex | nx3, ec | `game/js/sim/hydrology/*` or Fluid, decided later | Only if OQ6 says keep it. | S-M |

Possible merge if the PM wants fewer lanes: nx4 + nx5 (both edit Jobs and Interact), at the cost of a very large review.

Rules to lanes: rule 1 = nx1, nx2, nx3; rule 2 = nx2 (census, no postings), nx3 (spy), plus the edits to dp, dr, dt, dx in section 9; rule 3 = nx4 (the force side, `applyVolumeDamage`, already exists; nx3 handles what falls); rule 4 = nx5 on nx1's `wouldBeHeld`. Critical path: the first live collapse is three lanes away (nx3) instead of wave 13 behind the Levels chain.

Lane scopes (goal, then what is in; everything else is out):
- **nx1 goal**: given any block reader, say held or falls, plan the fall, and schedule checks within a budget, with no engine code. In: the five modules, additive exports, the doc section, `BRIEF_nx1.md`'s tests. Out: Levels, objects, commit, occupants, plugin, archive of old code.
- **nx2 goal**: the real Levels strata (plus wall and door objects) behind that reader, a fall committed through `setStrata`, and every claim about matter, events and fluid proved on real Levels and Fluid in a node vm (harness pattern of `tools/test_strata_fluid_reconciliation.js:43-130`, which already loads World, WorldGen, Tiles, Objects, Levels, Floors and Fluid with the real event bus). The reader takes `levels`, `objects`, `isKnown` as injected objects, because `game/js/sim/**` may not name `UF` or `window` (ADR-003 s2.3). In: reader, commit with rollback, occupant plan (pure), the two test files. Out: the plugin, the tick, save, jobs, UI.
- **nx3 goal**: the first live collapse. In: the plugin (subscribe to `levels:strataChanged` and wall/door object changes, enqueue only; one `UF.Sim.onTick("structure", ...)` handler; commit; occupant binding via `World.unitsInArea`, `Items.atIn`, `Objects`, the Environment hurt convention; `contents.deusStructural`; `UF.Structural.{enabled, mode, explain, stats}`), archive of the old span and rubble modules and tests, the in-engine scenario on a snapshot copy (`docs/systems/DEUS_Test.md`: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js --game <copy>`). Out: any Levels edit; mining and building verbs.
- **nx4 goal**: rule 3 for the player. In: "Dig down" and "Mine ceiling" jobs (stand cell below or above, one stratum per action, never the world floor), matter note "mine" once, yields; a headless test that `applyVolumeDamage` removes a deck or floor stratum and the structure and fluid react. Out: spells, blast attenuation (ADR-003 s18 is not built; `sphereDamage` hits everything in the sphere).
- **nx5 goal**: rule 4 for the player. In: the attachment rule (`wouldBeHeld`), builder reach to the tile above or below, constructed floors and roofs at any z (replace `DEUS_Floors.js:354-355` refusal and the `DEUS_Colonists.js:3775` airborne rule), a "Build above/below" menu on any level, matter note "build" once, a Look line from `explain`. Out: rebuilding walls as strata (OQ5).
- **nx6 (held)**: only if OQ6 keeps it; HP damage to barrier strata from head differential through `applyStrataDamage`, no capacity.

## 6. Bounded connectivity (kernel nx1, reader nx2)

- **Block**: one solid stratum `(x, y, g)`, `g = 5*(z+16)+s`. Six neighbours in the fixed order down, N, E, S, W, up; wrap across area edges is the reader's job (torus). Solid = stone, soil, wood, constructed or not, HP above 0. Air, water, lava are not solid. Wall and door objects are added by the nx2 reader as solid voxels from the cell's standing surface to S4 (PM TO CONFIRM; a data switch `anchors` makes them anchors instead).
- **Anchor**: a solid block on the lowest stratum of the world's range (read from `UF.World`, never a constant), or one the reader certifies (pinned block; later a cached natural column from UNIFORM chunks and `colTopsOf`, `DEUS_Levels.js:2407`). Nothing else counts: no flags, no HP, no material, no span (OWNER QUESTION 1).
- **Check**: iterative depth-first search from a seed, down first, with a visited set; stops at the first anchor, so a cave roof over rock costs one read per stratum (160 at most). A component that is exhausted with no anchor and no unknown neighbour falls, and the visited set is exactly the component. A ring cannot hold itself.
- **Cost**: every state or anchor read is charged to one per-tick counter, default 512 reads (PM TO CONFIRM; ADR-003 s9.1 `support.work_per_tick` is 0 when nothing changes). Jobs resume from cursors; running out of budget is `pending`, never `falls`. A search past 65,536 visits is held with a diagnostic; a piece over 20,000 blocks does not fall (PM TO CONFIRM).
- **Triggers**: changes only. The adapter turns each `levels:strataChanged` (and structural object change) into changed voxels; seeds are the solid neighbours of removed blocks and the placed block. Queue dedupes, FIFO by tick then `(g, y, x)`; seeds already settled in the same epoch are skipped; up to 4 jobs share the budget round-robin; a commit bumps the epoch and restarts jobs whose visited set it touched. Idle queue costs zero reads, no scan of units, cells or areas.
- **Edge and unloaded**: a neighbour in an ungenerated area or level reads `unknown` (the reader must never force generation: it asks an injected `isKnown`; lane-dd's `areaGenerated` wires it in a 3x3 world, the shipped 1x1 grid has no unknown areas). Unknown is neither air nor an anchor: a component with no anchor that touches unknown is held as `unknown_edge` with a watch list and is re-queued when that area appears. Never fall over what we cannot see.
- **Placement** uses the same check on a virtual block (`wouldBeHeld`); adding a block never makes another fall (tested).

## 7. The fall step

- **Plan (nx1, pure)**: drop = the smallest gap between any piece block and the first non-piece solid below it, positions inside the piece counting as free (cost at most blocks x (drop+1)); the bottom is the world floor; unknown below means no fall. Output: vacated and filled voxel lists, the contact block.
- **Commit (nx2)**: group blocks by cell, build the final 11-byte record per affected cell (moved bytes keep their HP and constructed flag; the source cell's connector code is cleared and stairs become plain blocks, PM TO CONFIRM), then write through `setStrata(..., { cause: "structural:fall" })`: first the cells that are only vacated, then cells that receive blocks, canonical order `(z, y, x)`; keep the before-records and restore them in reverse if any write is refused. Vacating first lets water displaced upward use the space just opened. One synchronous commit, so Fluid never ticks between writes, and no state is in flight.
- **Cost**: a commit is atomic; its cell count (about 8 ops per cell) is charged to the tick counter and may run it into debt that later ticks repay. At most 1 commit per tick, lowest piece first (PM TO CONFIRM); a cascade of landings runs one per tick.
- **Nothing is posted**: no matter note, no ledger call, no item; a census of solid strata by material byte before and after must match, and a spy on `UF.Matter` must see zero calls (DEC-083 item 2, DEC-040).
- **Occupants (plan nx2, binding nx3)**: after the commit, one pass over units of the changed (area, z) levels. A unit in a cell that now derives `solid` is crushed: `rules.fallingDamage` dice for the drop (minimum 10 ft, so 1d6), death through the Environment/Fire convention with cause "crushed", survivors moved to the nearest standable cell (3 cells, then one level up or down), else killed. A unit with no standing surface (rider, or its floor was mined) falls to the first standable cell in its column with SRD falling damage. Items relocate the same way and are never destroyed; non-structural objects break to their ruin items (Doors precedent, `DEUS_Doors.js:444`); structural objects in the piece are removed and their ruin is placed in the landing column (OQ2, OQ3, OQ5).
- **Save**: nothing is ever in flight. `contents.deusStructural = { v: 1, seeds: [[ax, ay, x, y, g], ...] }` holds only checks not yet done (pattern of `DEUS_Fluid.js:1303-1315`); load restarts them from the seeds. Outcomes are identical, timing can differ by a tick, an ADR-003 s10.7 exception to record (PM TO CONFIRM; the alternative is to drain the queue on save).

## 8. Fall meets fluid: the interface, and the fluid lanes that change

What the fall commit owes DEUS_Fluid, using the writes and published changes that exist:
1. Every vacated and every filled cell is written through `setStrata`, so each publishes `levels:strataChanged`, `levels:shapeChanged`, `levels:cellChanged` after its record is stored (`DEUS_Levels.js:1989-2012`). Fluid then runs `reconcileCellWithStrata` and wakes the cell and its six neighbours (`DEUS_Fluid.js:1228-1241`).
2. `cause` is `structural:fall` (or the mining or damage cause), so displacement can be attributed; vacate first, fill second (section 7); after the commit one `structure:fell` event lists the changed cells (optional batched reconcile for lane-ec).
3. The fall code never reads or writes fluid. A mined or blown-out floor needs nothing beyond the normal write: the DOWN bit opens and water falls.
4. Known limit, read not run: displacement is one step (above, 4 neighbours) then the typed store, which has no return path until lane-ec routes it to `credit` (`docs/systems/DEUS_WaterAuthority.md:264`). A big slab landing in a lake may strand water in `pendingDisplaced`. nx2's `test_structure_fluid.js` measures it; if material, a one-lane fix goes into the `DEUS_Fluid.js` writer chain (ec, ec2, fm, ee ...).
5. Checks that pin the interface (nx2, real Fluid): `slab_into_pool_conserves_water` (grid plus hydro mass plus `pendingDisplaced` equal before and after; lava the same, never mixed), `floor_mined_lake_drains_down`, `vacate_wakes_neighbours`, `no_fluid_write_by_fall` (spy on `Fluid.setCell` from the commit), with mutants `fall_deletes_displaced`, `fill_before_vacate`, `skip_event`.
6. Later, when dx and fm have merged, the same fall is one `commitMatterBatch` of `move` ops: fm's participant then prepares displacement for the filled cells and wakes the vacated neighbours inside the batch, instead of Fluid's event-driven reconcile. The contract nx2's tests pin (water conserved, the fall writes no fluid, vacate wakes) does not change; only the writer behind the seam does.

Fluid lanes that change: **fm** (participant in `commitMatterBatch`) already promises that a placed solid displaces fluid and a removal wakes neighbours: add a move op and two checks (move into a pool, vacate wakes); **ec** and **ec2** (facade cutover): keep listening to the `levels:*` events or the batch feed, and add nx2's fluid test to their gates; **eg** (Levels stops storing fluid): same gate; **fk, fq, fr, fs** dropped; **fj, ft** dropped (OQ6); **em** (integrated acceptance): drop deps es, ew, fj, fk and its collapse scenarios, depend on nx3. **dx**: add a `move` op (no posting), delete `::collapse_posting_breaks_to_rubble` and `::collapse_form_is_held`.

## 9. Other lanes and records that change

- **di** (caves, wave 11) depends on en and checks `::carved_spans_supported` with `rooted.js`: depend on nx1 instead and check "no solid component without an anchor in carved caves". **dp** drops "catalogue collapse postings to held"; **dt** drops its obsidian collapse posting; **dr** drops natural rubble registration and `note("collapse")` once-only (DEC-083 item 2); **du** keeps parcels but no rubble `entityRef`; **ds** already cut; **er/fl** integrity-ladder art rows are obsolete.
- **Keep-green gate**: add `tools/test_structural_levels.js` (nx2) to the gates of dw, dx, dy, dz, eg, ec, ec2, fm so a Levels change cannot silently drop the events or the `setStrata` contract the structure relies on.
- **Records (DEC-051 sync, PM)**: `tasks/wbs_registry.json` (NAT.02.01 parts and `closesWhen`; NAT.02.01.RUBBLE withdrawn; register BRIDGE, NAT.02.05, NAT.02.06; NAT.02.02 held); WBS rows SIM.40.00, .01, .02, .03, .04, WG.65.04, PM-3 and revision log; `docs/worldgen/NW_ID_CROSSWALK.md`; `docs/systems/DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md` (rules 4-6 and sections 5-7: spans, debris); `DEUS_CONSTRUCTION_LIFECYCLE_SPEC.md` s7 (maxSpan, "load-bearing walls"); ADR-003 s16.3-16.4 and s10.7 (DEC-010, OPEN with default "lateral connectivity is sufficient", is answered by the DEC-083 amendment); DEC-065 item 2 (already marked superseded); Build Board lane states.

## 10. OWNER QUESTIONS (each with my default)

1. **Anchors.** DECISION: Only the bottom of the world (Default). Natural rock that is completely cut free will fall.
2. **Crush.** DECISION: Lethal. If a unit is crushed by falling rock or a collapsing room, they die instantly (Owner 2026-10-01).
3. **Riders.** DECISION: Ride it down and take fall damage (Default).
4. **Fall speed.** DECISION: Single tick instant fall (Default).
5. **Walls.** DECISION: Walls act as solid blocks in the connectivity graph. If unanchored, they fall and break into ruins (Default).
6. **Water pressure.** DECISION: Drop it. Dams stand until mined/blasted (Default).
7. **Placement.** DECISION: Refuse placement if it attaches to nothing (Default).
8. **Mining floors and roofs.** One 2 ft stratum per action (default), or the whole 10 ft cell like a wall?

## 11. PM TO CONFIRM (my own choices)

1. Six-connectivity, face neighbours only.
2. Solid means a stratum with a solid material and HP above 0.
3. Unknown is held with a watch, never a fall.
4. Numbers: 512 reads per tick, 4 active jobs, 65,536 visits per search, 20,000 blocks per fall, 1 commit per tick, 8 ops per written cell. None is measured.
5. Depth-first, down first, canonical queue order.
6. The piece falls rigid, as one body.
7. Landing is instant; no in-flight state.
8. Save is seeds only.
9. Objects are voxels (switchable to anchors); wall and door tags only; doors count open or closed.
10. Connector codes of fallen cells are cleared.
11. No ledger post, no matter note; the census invariant is the proof.
12. Fluid interface through existing events, no Fluid edit unless nx2's test shows stranded water.
13. `setStrata` now; a `commitMatterBatch` `move` op later through a writer seam.
14. Non-structural objects (trees, furniture) whose floor vanishes break to remains.
15. `UF.Structural.mode` "observe" logs verdicts without committing, for the first play sessions.
16. DEUS_Structural is registered in `plugins.js` by the PM (editor closed, DEC-059), not through the DEUS_Core companion list that masks load errors.
17. nx3 archives the span and rubble code under `archive/` (prune rule: archive, never delete).
18. Reviewers are grok and codex only; no Gemini lane (the Gemini CLI cannot run as a worker, AUDIT_LOG A13-7).
19. WBS ids as in section 5; new tests joined to other lanes' gates as in section 9.

## 12. Risks

1. **Objects versus strata.** Houses are wall objects plus a strata deck; without the object overlay the first check drops every deck onto its room. nx2's room regression and the `anchors` switch cover it.
2. **Floaters in the baseline.** Generator 5 cuts and caves may leave unanchored natural rock; the first edit next to one would drop it. nx2 runs a census on 3 seeds; if it finds any, report to the Owner (OQ1 alternative or a generator fix).
3. **Levels chain drift.** dx, dy, dz, eg change the write path under the new code; the keep-green gate in section 9 is the guard.
4. **Event cost.** A commit emits about 9 events per cell (3 writes, 6 face-exposed) to every listener; a 5,000-cell fall would hitch. The size cap and the debt rule bound the average, not the spike.
5. **`standerAt` scans every unit**; occupant code must do one pass per commit.
6. **Fluid stranding** (section 8 item 4) and the companion-loader risk for DEUS_Fluid.
7. **Save timing** differs by a tick after load (seeds restart); ADR-003 s10.7 needs a recorded exception.
8. **3x3 worlds**: the `isKnown` seam depends on lane-dd; cross-area connectivity and wrap are tested only in fixtures until then.
9. **Owner expectations** on crush lethality and wall behaviour (OQ2, OQ3, OQ5) change nx2 and nx3 content.
10. **Old checks lose meaning**: `tools/test_structural_collapse.js` and the pkg2 proof assert rubble and fake-ledger semantics; they pass today (exit 0, run 2026-10-02) and must be archived with the code (nx3), or they certify the wrong model.
