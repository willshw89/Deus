# UF_Goals

## Purpose

Persistent, three-horizon personal ambitions, added 2026-09-19. A person chooses a seeded professional interest from their existing skills, facets and species culture, then pursues personal equipment, acquaintances, a furnished home, professional development and (for some people) parenthood. These are motives for physical work, not rewards handed out by a timer. Animal entries explicitly summarize existing wildlife behavior: they do **not** add animal needs, change wildlife control, or fix its offscreen/Z limitations.

File: `game/js/plugins/UF_Goals.js`. Load after World, Colonists and Skills; Households and CultureGrowth are optional. Register before UF_Test. It neither edits the catalog nor creates art. No named lore is introduced.

## Public API

`UF.Goals` accepts a unit record or numeric world unit ID:

- `ensure(unit)` returns the existing `unit.data.lifeGoals` or initializes one. It does not reroll a saved aspiration. Non-creatures return null. Unit-added events defer person initialization until facets exist because History/Colonists finish a founder after adding it to World.
- `refresh(unit)` reevaluates factual progress and returns the saved record. Goals that have actually been achieved remain in the achievement history even after an item is lost or a child dies.
- `describe(unit)` returns `{unitId,name,z,mode,capability,profession,short,medium,long,achievements,household,limits}`. Goal arrays are copied; optional household information comes from `UF.Households.describe(UF.Households.of(unit))`. `short` identifies the actual assigned job first, then an unmet need or idle intention. It is not an overhead label.
- `capability(unit)` returns `{mode,planningBudget,intelligence}`. Known-age adults (`Number.isFinite(age) && age >= 18`, not baby/child/teen) are `sapient`; young or unknown-age people are `developing`, with no personal manufacturing dispatch. People have 1–3 concurrent planning slots based on their existing `data.stats.int`, not a fixed species ceiling. Animals are `instinctive_observation`, budget 0. This is planning capacity, not intelligence simulation.
- `planSteps(unit)` returns bounded, fresh concrete steps: `{id,craft,each:true,equip,goalOwner,goalId,goalKind}`. The initial personal tool recipe comes from existing catalog recipes (`stone_knife`, `stone_axe`, `stone_pick`); no missing recipe is invented. All steps require their owner's personal inventory, not shared stock. Failed steps back off in world minutes. Young/unknown-age people and animals return no steps.
- `priorities(unit)` returns bounded job-type weights representing the chosen profession and outstanding home goal.
- `choosePlan(unit,candidates)` returns a stably sorted **copy** of candidate records `{step,spec,order,score}`. It preserves a caller-supplied culture score and adds bounded personal/specialty bonuses once. A step with a different `goalOwner` is excluded. Missing score starts at 1. This is ranking only: it does not dispatch work, interrupt jobs, or override needs/orders.
- `refreshBatch()` reevaluates at most 24 world units, across all Z levels, on the shared `time:minute` event; it refuses while `UF.Time.paused`.
- `showSelected()` opens the goals window for the current Sheet unit, Select primary, or Overseer selection; returns whether it opened. `selected()` resolves that unit. `window()` returns the scene's goals window or null; `Window` exposes its class. No selection means no window opens.
- `onDone(job,unit)` and `onFailed(job)` are event handlers exposed for focused tests/integration. Normal integrations should emit Jobs events, not call these a second time.
- `VERSION = 1`, `BATCH = 24`.

### Required Colonists integration

The Colonists planner must explicitly consume `planSteps(unit)` and `choosePlan(unit,candidates)` after its survival/home-return/player-designation decisions. It must filter `goalOwner` in execution and compute a personal `each` step only for that owner. Merely aliasing `UF.Colonists.decide` does not work: its internal loop uses the closed-over function.

Goal steps do not replace the material-acquisition/build/craft pipeline. The existing planner produces gather/chop/mine/fetch/craft/equip jobs from them. Profession ranking influences useful existing work; there is no unlimited practice crafting, instant XP, automatic combat training, forced partnership or trade executor.

## Events

Listens to `world:unitAdded`, `world:created`, `colonists:ready`, `time:minute`, `jobs:done`, `jobs:failed`, `skills:levelUp`, and `colonists:born`.

- Successful same-level `talk` jobs count repeated conversations with the same person for both participants. Three conversations resolve the acquaintance goal. This records actual contact, not a complete friendship/opinion model.
- Skills progress reads `UF.Skills.level`, never the legacy `data.skills` scores.
- Equipment completes only when an actual positive-count matching item is held by the owner.
- Home completes only when `Households.describe(...).complete === true`, not when a building plan claims it finished.
- Parenthood completes when an actual world unit names this person as mother or father. The achieved record survives later removal of that child. Old saves without surviving child records or previously recorded achievements cannot reconstruct unknown lineage here.
- Failed goal work backs off 5, 10, 20, 40, 80, then at most 120 world minutes. Explicit-order/replacement/survival cancellations do not penalize the ambition. Existing job cancellation/stall handling remains authoritative.

No events are emitted by this plugin. No wall-clock timer controls simulation.

## Save data

Each unit stores `data.lifeGoals = {version,mode,capability,profession,short,medium,long,achievements,contacts,failures,evaluatedAt}` in the existing World save. Profession has `{id,label,skill,startingLevel,targetLevel}`. Goals contain `{id,kind,label,state,progress,target,created,completedAt?,recipe?,item?,skill?,blockedReason?}`. Achievements retain at most 32 entries. Failures store attempts, retry world minute and reason. Unit navigation remains in `unit.goal`, untouched.

Initialization is lazy for old saves; load resets only the batch cursor. It does not relocate units, change inventory, or regenerate families. Unknown future record versions are preserved rather than rerolled.

## Readout

F7 toggles the selected creature's panel only when that key is unmapped. Plain G retains Gather. The panel starts below the existing top HUD, shows current work, medium/long goals and available household completion, and explicitly labels animals as observational. It is a read-only overlay, not an editor for goals. No text is placed over creatures.

## Checks and status — 2026-09-19

`node tools/test_goals.js` runs actual plugin source with engine doubles: 14/14 passed (expanded from the initial 12 checks). Covers deterministic/save-stable goals, seeded career variation, adult/intelligence bounds, observational animals without navigation mutation, actual personal tool ownership, real skill progression, real home/child evidence, level-scoped conversations, failure backoff, owner filtering while preserving culture scores, pause/all-layer batching, and founder initialization after facets. Follow-up checks reject unknown/null/nonfinite/string ages and prove 60 paused readout refreshes do not invent progress. Reading an actual inventory change made while paused may resolve the corresponding equipment goal, but no unrelated ambition.

Observed source-mutation failures: `--mutant=owner` 11/12, `--mutant=physical` 9/12, `--mutant=backoff` 11/12. These commands deliberately return nonzero and are not production switches.

On the expanded suite, `--mutant=age` failed the unknown-age check (13/14), and `--mutant=physical` also failed the paused readout check (10/14). No production-code change was needed for these additional checks. No per-frame goal cache was added: the root planner is removing the unnecessary goal expansion from its build-cell reservation query, avoiding stale progress-cache semantics.

Runtime suite `goals`: persistent aspiration, a real craft job consuming materials and producing the desired carried tool, profession not completed by elapsed time, save-record identity, other-owner candidate refusal, selected-unit readout, and no new harness errors. Snapshot `codex_goals_20260919_a` passed 7/7. Its screenshot was opened: a goals panel shows a hunter's completed stone knife, acquaintance progress, home, skill target and parenthood; its title was partly under the old top HUD. The panel was moved below that HUD. Fresh snapshot `codex_goals_20260919_b` also passed 7/7; its opened `test_output/goals.selected_goals.png` shows the complete title, a cook's completed knife, acquaintance 0/3, home, Cooking 1/5, and parenthood, with the existing profile behind the overlay. All text is readable and no goals appear overhead. Both runs record zero new harness errors; this is not an editor F8 observation.

Limits: these source/runtime checks do not establish the root Colonists integration, complete village autonomy, universal animal goals, trade, or a long-duration economy. The runtime craft check explicitly dispatches the returned recipe through Jobs. Editor F5/F8 remains untested; no slice approval is claimed.
