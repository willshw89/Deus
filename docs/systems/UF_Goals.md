# UF_Goals

## Purpose

Persistent, three-horizon personal ambitions and lifelong **Destiny** system, added 2026-09-19. Every sentient creature possesses a deterministic Destiny—their ultimate life purpose and transcendent calling that actively drives their overall decision making, work priorities, candidate job selection in the planner, combat defense tendencies, and idle thoughts. In addition, a person chooses a seeded professional interest from their existing skills, facets and species culture, then pursues personal equipment, acquaintances, a furnished home, professional development and (for some people) parenthood. These are motives for physical work, not rewards handed out by a timer. Animal entries explicitly summarize existing wildlife behavior: they do **not** add animal needs, change wildlife control, or fix its offscreen/Z limitations. Non-sentient animals do not receive a Destiny.

File: `game/js/plugins/UF_Goals.js`. Load after World, Colonists and Skills; Households and CultureGrowth are optional. Register before UF_Test. It neither edits the catalog nor creates art. No named lore is introduced.

## Destiny System

Every sentient creature (`person`, `colonist`, sapient species, or creature with intelligence >= 6) is deterministically assigned one of 12 core Destiny archetypes based on the world seed, creature identity, and personality traits:
1. `great_artificer`: "The Master Artificer" — *"To forge creations that endure long after stone has turned to dust."* (Creation: crafting, smithing, building).
2. `legendary_guardian`: "The Legendary Guardian" — *"To stand as an unbreakable shield between peril and my kin."* (Protection: combat defense, faction aid, vigilance).
3. `grand_lorekeeper`: "The Grand Lorekeeper" — *"To seek the hidden truths of the world and preserve the ancient records."* (Discovery: exploration, conversations, research).
4. `dynastic_founder`: "The Dynastic Founder" — *"To build a flourishing homestead whose hearth shelters generations to come."* (Dynasty: home building, family, lineage).
5. `beast_communer`: "The Warden of the Wilds" — *"To walk in balance with the primal earth and master the ways of beasts."* (Harmony: nature, foraging, wildlife tracking).
6. `master_cultivator`: "The Master of the Harvest" — *"To turn barren soils into boundless abundance and nourish all living folk."* (Abundance: farming, agriculture, cooking).
7. `worldstrider_delver`: "The Deep Worldstrider" — *"To delve into the deepest strata of the world and bridge realms across the abyss."* (Exploration: mining, quarrying, deep layer traversal).
8. `high_sovereign`: "The Sovereign of Order" — *"To forge order out of chaos and lead my people toward a glorious era."* (Mastery: civic construction, leadership, community unity).
9. `wealth_accumulator`: "The Master of Treasures" — *"To uncover precious veins, amass shining relics, and build an empire of gold."* (Abundance: precious mining, luxury craft).
10. `hearth_tender`: "The Keeper of the Hearth" — *"To bring warmth to the weary, comfort to the grieving, and light to the dark."* (Harmony: hospitality, cooking, caretaking).
11. `shadow_operative`: "The Phantom of the Shadows" — *"To walk unseen, strike without a whisper, and master the art of subtlety."* (Mastery: stealth, scouting, hunting).
12. `monument_builder`: "The Builder of Eternity" — *"To raise towering stoneworks that stand undaunted through the turning of ages."* (Creation: monumental stone architecture).

### Behavioral Integration
- **Work Priorities (`UF.Goals.priorities`)**: Multiplies job weights according to `destiny.jobAffinities`.
- **Candidate Job Selection (`UF.Goals.choosePlan`)**: Adds alignment bonuses to candidate plans matching the creature's Destiny.
- **Leisure & Thoughts (`UF.Colonists.idleJob`)**: Inspires reflective thoughts matching the creature's destiny during idle moments.
- **Combat Protection (`UF.Combat.aidFaction`)**: Creatures with protective destinies (guardians, hearth tenders) respond to faction aid calls across an extended radius (+4 tiles).

## Public API

`UF.Goals` accepts a unit record or numeric world unit ID:

- `ensure(unit)` returns the existing `unit.data.lifeGoals` or initializes one with deterministic Destiny assignment for sentient creatures. It does not reroll a saved aspiration or destiny. Non-creatures return null. Unit-added events defer person initialization until facets exist because History/Colonists finish a founder after adding it to World.
- `destinyOf(unit)` returns the creature's active Destiny object `{id, title, category, motto, jobAffinities, target, targetLabel, progress, fulfilled, fulfilledAt, thought}` or null for non-sentient creatures.
- `DESTINIES` exposes the immutable catalog of the 12 Destiny archetypes.
- `isSentient(unit)` returns boolean indicating if a creature is sentient and qualifies for a Destiny.
- `refresh(unit)` reevaluates factual progress and returns the saved record. Goals that have actually been achieved remain in the achievement history even after an item is lost or a child dies.
- `describe(unit)` returns `{unitId,name,z,mode,capability,destiny,profession,short,medium,long,achievements,household,limits}`. Goal arrays and destiny are copied.
- `capability(unit)` returns `{mode,planningBudget,intelligence}`.
- `planSteps(unit)` returns bounded, fresh concrete steps: `{id,craft,each:true,equip,goalOwner,goalId,goalKind}`.
- `priorities(unit)` returns bounded job-type weights representing the chosen profession, outstanding home goal, and Destiny job affinities.
- `choosePlan(unit,candidates)` returns a stably sorted **copy** of candidate records `{step,spec,order,score}`, incorporating Destiny alignment bonuses.
- `refreshBatch()` reevaluates at most 24 world units, across all Z levels, on the shared `time:minute` event; it refuses while `UF.Time.paused`.
- `showSelected()` opens the goals window for the current Sheet unit, Select primary, or Overseer selection; returns whether it opened. `selected()` resolves that unit. `window()` returns the scene's goals window or null; `Window` exposes its class.
- `onDone(job,unit)` and `onFailed(job)` are event handlers exposed for focused tests/integration.
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

- **F7 Goals Window (`Window_UFGoals`)**: Toggles the selected creature's panel. Displays the creature's Destiny title, motto, and milestone progress/fulfillment status prominently in gold text at the top, followed by current job/need, medium/long term aspirations, and household completion.
- **Character Profile Sheet ("goals" tab in `UF_ProfileTabs.js`)**: Displays the Destiny title, motto, and milestone progress status under the goals tab alongside professional aspirations and achievements.

## Checks and status — 2026-09-19

`node tools/test_goals.js` runs actual plugin source with engine doubles: **19/19 passed** (expanded from 14 checks with 5 Destiny checks: `destiny_assigned_to_sentient`, `destiny_stable_across_saves`, `destiny_influences_priorities`, `destiny_influences_choose_plan`, and `destiny_progress_and_achievement`). Covers deterministic/save-stable goals, seeded career variation, adult/intelligence bounds, observational animals without navigation mutation or manufactured destinies, actual personal tool ownership, real skill progression, real home/child evidence, level-scoped conversations, failure backoff, owner filtering while preserving culture scores, pause/all-layer batching, founder initialization after facets, and Destiny-driven work priorities, candidate plan ranking, and milestone progression.

Observed source-mutation failures: `--mutant=owner` (13/19), `--mutant=physical` (10/19), `--mutant=backoff` (13/19), `--mutant=age` (13/19), `--mutant=destiny` (16/19). All mutants verified able to fail with nonzero exit.

Runtime suite `goals`: persistent aspiration, destiny assignment, a real craft job consuming materials and producing the desired carried tool, profession not completed by elapsed time, save-record identity with preserved destiny, other-owner candidate refusal, selected-unit readout, and no new harness errors: **8/8 passed**. Screenshot `game/test_output/goals.selected_goals.png` inspected: shows clean readout with Destiny title, motto, milestone target and progress, current activity, and aspirations with zero overlapping or text clipping.

