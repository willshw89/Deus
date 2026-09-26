# HANDOFF: engine-side work from Fable (DEUS-TSK-FABLE-16 and -18), 2026-09-24

For: Gemini, engine owner under `docs/DIVISION_OF_LABOR.md` (Fire, Environment, Levels, WorldGen, World pathfinding, Core).
From: Fable (DEUS-TSK-FABLE-18). No art is needed for items 1 to 5.

Fable no longer writes to the engine files listed here, so this work is yours to apply, change or drop.

## 1. FABLE-16's engine part, as a patch

`docs/handoffs/patches/FABLE-16_engine_side.patch` holds FABLE-16's finished changes to the files that are now yours. They were made in an isolated worktree between 09:25 and 11:36 and never reached the live tree. The patch is based on `c8be6a8`. HEAD's code for these files is unchanged since then (checked at `e054707` and `391d128`), and `git apply --check` passes on a clean checkout of HEAD.

| File | What it does |
|---|---|
| `DEUS_Fire.js` | `sourceTypes` accepts a type's `id` when it has no `typeId`. A burning unit carries its fire (`d.lastFire = { key, beat, provenance }`, stamped on every burn), so a colonist who walks out burning and dies later still names the fire. A running flame's cell joins that fire (`ignite(..., { carried })`) instead of starting a new `direct` one. Adds `noteCasualty(unit, provenance, beat)` (each casualty listed once per fire, whichever path the death took). Guards `W.isDisplayed`, and the namespace keeps an existing `window.UF`. |
| `DEUS_Environment.js` | A unit killed by its burns records `deathCause = "fire"`. The running flame passes `carried: d.lastFire`. |
| `DEUS_DeathForensics.js` | Fire provenance only when the primary cause is fire (a burning unit killed by a blow died of the blow). Falls back to `d.lastFire` within 60 beats. The death text uses `UF.Fire.describeProvenance`, and the casualty is listed through `noteCasualty`. |
| `DEUS_Core.js` | Adds `UF_Households` as a companion (it is not in `plugins.js`). Companions that must live on the page (`DEUS_DeathForensics`, `UF_Households`) are evaluated in the page's global scope, not `require`d. `require` runs them in NW.js's Node context, where `window.UF` is Node's own global: an NW.js probe on 2026-09-24 found `UF.Households` and `UF.DeathForensics` missing from the page. A companion that fails to load now logs the error; the old loop swallowed every error. |
| `DEUS_History.js` | From ground generator 5, a camp stands on valley ground only (`UF.Levels.surfaceElevationAt(...) === 0`), never walled inside a +1/+2 hill. |
| `DEUS_Levels.js`, `DEUS_WorldGen.js` | The z=0 volumetric terrain column (FABLE-16 part 3): hills solid down to the ground, 48×96 ground cliffs with the black cap, ramps, and dig repaint. Spec: `docs/handoffs/HANDOFF_z0_cliffs.md`. |
| `docs/systems/UF_Fire.md`, `UF_Levels.md`, `UF_WorldGen.md` | Their pages. |
| `tools/test_hearth_containment_and_provenance.js` | 16 checks, including the `spread_forgets_origin` mutant. |
| `tools/test_volumetric_terrain_column.js` | 40 checks, with mutants. |
| `docs/handoffs/HANDOFF_z0_cliffs.md` | Art handoff for the cliffs (AR-2100..2102, below). |

**Evidence, and what isn't checked.** In the FABLE-16 worktree before that session ended: `test_volumetric_terrain_column` 40/40, `test_column_landforms` 35/0 (2 skipped), `test_upper_elevation_terrain` 19/1, `test_vertical_worldgen_proof` 15/1 (15 skipped). Without the Fire, Environment and DeathForensics part, `test_hearth_containment_and_provenance` gives 12 passed and 4 failed (`damaged_hearth_escapes_with_provenance`, `open_fire_escape_through_beat`, `burns_death_after_fleeing_names_fire`, `running_flame_joins_its_fire`), observed 2026-09-24 in the FABLE-18 worktree. Those four are what the patch fixes. The full engine suite has **not** been re-run with the patch applied on today's HEAD.

**Live tree.** The live working copy holds older, partial drafts of some of these files, uncommitted since this morning: `DEUS_Fire.js` (3 of the patch's hunks), `DEUS_Core.js`, `DEUS_Levels.js`, `DEUS_WorldGen.js`. It also holds untracked copies of the two harnesses and `HANDOFF_z0_cliffs.md` that differ from the patch's. The patch supersedes them. `git apply` refuses files that already exist, so decide what to keep before applying.

**Asset requests for the cliffs.** These belong with the Levels part. They were written into the live `docs/ASSET_REQUESTS.md` but left out of Fable's FABLE-18 commit; add them when the Levels part lands. The text is the hunk under "AR-2100 to AR-2102 Ground cliffs and ground ramps" in the live tree's `docs/ASSET_REQUESTS.md`.

## 2. Pathfinding does not look at fire after planning

`DEUS_World.js` `planPath` refuses burning squares (`isFire` in `enterable`). But `stepAlongPath` / `stepOpen` never check fire, so a unit walks a path it planned before a fire spread onto it. In the harness, a colonist on a reflex run walked straight into a line of burning straw laid across its planned route.

Fable's workaround is at the behavior layer (`DEUS_Colonists.js` `rerouteAroundFire`): on `fire:ignited`, colonists whose remaining `World.pathOf` path crosses a burning square are sent to the same goal again. It covers colonists only. Wildlife and other units still walk into new fire.

Requests:
- a fire check in `stepOpen`, or marking a path stale when a square on it ignites;
- an optional cost for squares beside fire, so a rerouted path keeps a gap from the flames. Today the fresh path may hug the fire, and a non-reflex worker passing beside it gets the "fire nearby" cancel.

## 3. Two plugins defined the job type `douse`

`DEUS_Jobs.js` defined `douse` (put out a burning friend, FABLE-12) and `DEUS_Fire.js` `defineDouse()` defines `douse` (carry water to a burning square). Fire loads later in both `plugins.js` and the soak bundle, so Fire's definition replaced the colonists'. Every attempt to douse a burning friend ran the square handler and failed "the fire is out". The FABLE-12 torture suite missed it because it stubs `UF.Fire`.

Fable renamed its job `douse_ally` in `DEUS_Jobs.js`, `DEUS_Colonists.js` and the harnesses. Your `douse` is unchanged, and `DEUS_Sheet.js` line 759 (the carried-water display) still reads your `douse`. There's nothing for you to change. Suggestion: have `UF_Jobs.define` warn when a type is defined twice.

## 4. `Items.detach` is now exported (one line in `DEUS_Items.js`)

`UF_Containers.putItem` detaches through `Items.detach` when it exists. It didn't exist, so `putItem` only cleared the item's fields and left its id in the carrier's `data.inventory`. Every haul into a chest left a phantom copy of the chest's stack in the hauler's pack:
- It counted toward weight: encumbered founders failed every fetch "too heavy to lift", about 20,000 failures in a 6-day soak.
- Hunger read it as food carried: "the food moved", 159 failures.

Fable exported the existing internal `detach` (claimed in `docs/STATUS.md`). Saves made before the fix may still hold phantom ids. A load-time sweep (drop inventory ids whose item's `holder` is not the unit) would clean them, if you want one.

## 5. `UF.Agriculture` is referenced but does not exist

`DEUS_Colonists.js` confirms `farm_till`, `farm_plant`, `farm_tend` and `farm_harvest` jobs through `UF.Agriculture.confirmedJob`, but no plugin defines `UF.Agriculture` (searched `game/js/plugins/` on 2026-09-24). There is no farming today.

## 6. Food supply over 30 days (for the owner's decision; see Fable's report)

The 30-day native soak (`node tools/test_native_survival_soak.js --days=30`, with the FABLE-18 fixes) runs out of food on day 9 or 10. Founders die from day 17; all 8 are dead by day 22.
- Around the camp (40 squares) there were 19 berry bushes (2 berries = 0.2 lb per pick, regrowing in 48 h), 1 fruit tree (0.75 lb per 72 h) and 11 wild grain (yields seeds, not food). That is about 2 lb a day against 8 founders eating 8 lb a day.
- The soak now emits `time:hour` / `time:day` as `DEUS_Core` does, so regrowth runs. That did not change the outcome.
- `--wildlife` loads `DEUS_Wildlife`, `DEUS_Ecology` and `DEUS_Combat` for hunting. Its 30-day result is in Fable's FABLE-18 report.
