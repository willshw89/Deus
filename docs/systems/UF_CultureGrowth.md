# UF_CultureGrowth

Date: 2026-09-19. A small learned-culture layer over the existing physical jobs and seven catalog culture profiles. Confirmed work leaves persistent faction knowledge and individual practice. Parents and household experience influence a child's tastes, while each child retains deterministic individual variation. Species capabilities, personal facets, skill XP and cultural experience remain separate.

This is not a technology-permission system. Remembering that someone made a sword does not unlock a recipe, create equipment, or give another person skill XP. New factions, life cycles, justice, theft and trade are outside this module.

## Public API (`UF.CultureGrowth`)

| Function | Contract |
|---|---|
| `state()` | `World.state.cultureGrowth`, initialized lazily; null without a world. |
| `ensureFaction(idOrFactionOrUnit)` | Existing faction's learned record or null for an unknown faction. `"player"` resolves to the actual faction ID. |
| `ensurePerson(unit)` | Persistent practice/taste record for a `person` or `colonist`, or null. Reattaches `unit.data.preferences` to its saved preference map; never writes facets or skills. |
| `domainOf(jobOrType)` | Building, gathering, woodcutting, mining, crafting, cooking, smithing, hauling or hunting domain, or null. Craft recipes determine cooking/smithing versus general crafting. |
| `priorityFor(unit,jobOrType)` | Modest learned-practice/taste factor in `[0.8,1.28]`; unknown/survival activities return 1. Does not apply the existing catalog priority again. |
| `recordJob(job,unit)` | True only when a completed, not-yet-counted job has physical evidence and its worker/level matches. Updates practices, confirmed knowledge and bounded apprentice observation. |
| `inherit(child,mother,father)` | Idempotent taste inheritance; returns child's record. Parents influence tastes, household practice adds exposure and the child's seeded variation remains. Saves parent IDs/generation, never copies skills. |
| `rankCandidates(unit,candidates)` | Returns new candidate records sorted by updated score. Input rows are `{step,spec,order,score}`. `score` must include the caller's existing culture/skill/order weighting; absent score defaults to 1. Adds `cultureReason` when a conditional profile policy applies. Does not mutate input records, create work or test work feasibility. |
| `professionFor(unit)` | Highest-practised domain after at least three confirmed jobs; null before then. This is descriptive experience, not a compulsory class or assigned labor. |
| `describeFaction(id)` | `{id,species,mechanic,generations,practices:[{domain,count}],knowledge:[key],professions:{domain:livingCount}}`, or null. |
| `mechanicFor(idOrFactionOrUnit)` | `{species,id,text}` describing the available candidate policy. Unknown profiles use individual practice only. |
| `initialize()` | Add missing faction/person records; does not reset existing knowledge or tastes. |
| `DOMAINS` | Copy of the nine supported practice-domain IDs. |

### Confirming work

- Build: the completed job must identify a real buildable object and the requested object must stand on the exact target cell and level.
- Craft: its actual `result.items` must identify distinct, existing output stacks held by the worker; all required recipe outputs must be present in the result counts.
- Gather/chop/mine/quarry/hunt: nonempty `result.yields` must be valid catalog items and still exist in sufficient quantities at the target cell/level. A result-less job is not credited.
- Fetch: the actual item must be held by the worker. Haul: the actual result stack must be at the destination cell/level.
- A job must be `done`, have a positive integer ID and, when assigned, identify the supplied worker. Cross-level/area completions are refused.
- Floor/eat and other jobs currently lack sufficient result evidence for this module and do not add knowledge. Merely proposing or failing a job creates no achievement.

Knowledge keys are `recipe:<catalogId>`, `building:<catalogId>` and `work:<domain>`. Only the first evidence record is stored per key, so a faction's achieved knowledge never shrinks when a building is destroyed or its maker dies. This does not assert that facilities, tools or qualified workers still exist.

### Seven bounded candidate policies

These are first planning differences, not full implementations of all approved peoples. Only **already feasible candidates** are ranked, after critical needs; they cannot authorize a locked recipe or make a missing resource available.

| Existing profile | Actual policy and condition |
|---|---|
| Human | Successful work observed by a less-practised adult of the same faction/site, within six cells on the same level, adds bounded exposure. That adult prefers a corresponding feasible practice job. No observer receives items, completed-work credit, knowledge keys or XP. |
| Elf | A regrowing source gains preference over a destructive candidate only when both supply at least one identical resource. Regrowth is read from the source or its harvested replacement. |
| Dwarf | A ready candidate for a construction project already being worked by another resident of the same site/faction/level gains preference. Does not merge unrelated sites' housing projects. |
| Gnome | Among available practice domains, prefer the least-practised domain in the local site's living population when their experience totals differ. |
| Goblin | Prefer fetching/hauling an existing product over crafting that same output, not over crafting a different needed item. |
| Orc | Prefer equipment production when competing with explicitly `step.optional === true` construction. Beds and critical shelter must not be marked optional. |
| Legacy automaton | After a successful recipe, favour more of that recipe until three jobs have completed; when another recipe is feasible, rotate after the third. A missing alternative cannot stall production. |

Policy bonuses are modest (`0.25` or `0.35` score), not absolute overrides. Stronger material/skill/goal priorities can win. New domestic content or future life-cycle capabilities remain their owners' work; no egg, hive, undead or special reproduction mechanics are claimed here.

Project identity is read from `spec.params.householdId`, `household`, `project`, then corresponding step fields/step ID, then `params.plan`. Household practice uses `unit.data.householdId` or `unit.data.household` (ID or `{id}`), scoped by faction. Coordinates always come from the actor/target, never the camera.

## Events

Listens to `world:created`, `colonists:ready`, `jobs:done(job,unit)`, `colonists:born(child,mother,father)` and `world:unitRemoved(unit)`. Events register during `Scene_Boot.start`. Removal preserves practice history; a person is marked deceased only when `unit.data.dead` is true, so test cleanup or migration is not mislabeled death.

Emits `culture:practice(unit,domain,knowledgeKey)` after confirmed, deduplicated work and `culture:inherited(child,parentIds)` once per child. No overhead text or artwork is created.

## Save data

`UF.World.state.cultureGrowth = { version:1, factions, people, households }`.

- Faction records: `{id,species,practices,knowledge,generations}`. Knowledge value `{by,tick,generation}` records its first observed maker; `generations` is the greatest observed lineage depth.
- Person records keyed by stable unit ID: `{id,faction,species,preferences,practices,exposure,generation,parents,lastJob,inherited,batch,deceased?}`. Preferences range 0–100, initialized deterministically around 50. Successful work nudges its preference by 0.25. Birth blends parent mean (55%) and individual prior (45%), household exposure and additional deterministic variation; inherited preferences are clamped to 5–95.
- Household records: `{practices}` keyed by `factionId:householdId`. These are observations, not household ownership or membership authority.
- `lastJob` is a single monotonic job-ID watermark per person; duplicate or older completion notifications are ignored. No unbounded completed-job list is saved. Assumes the existing Jobs registry's monotonic IDs and one active job per worker.
- `unit.data.preferences` mirrors the canonical person preference map. Reinitializing after a plain JSON load reconnects it without resetting data.

Records contain IDs and plain values, no unit references or cycles. Dead people's practice/parent records remain for lineage continuity. Old saves lazily acquire missing records; they do not receive invented prior achievements or parentage.

## Checks

Run with `"C:\Program Files\nodejs\node.exe" tools/test_culture_growth.js`. This runs the real plugin in a Node VM with explicit World, Objects, Items and Events doubles; it is not RMMZ Playtest.

Observed 2026-09-19: **18 passed, 0 failed**. Checks cover deterministic/additive initialization, invalid/failed completion refusal, exact object/output proof, duplicate completions, actor-level isolation, actual yield presence, divergence of same-species factions, all seven policies changing selected work under applicable conditions, parental and household influence without copied skills, lineage across two generations, death/save continuity, bounded watermark storage and priority ranges.

Behavior mutations observed in the same session:

- `--mutate-evidence`: removes completed-result validation; **14 passed, 4 failed**, exit 1.
- `--mutate-inheritance`: removes the parental contribution; **17 passed, 1 failed**, exit 1.
- `--mutate-policies`: bypasses the seven candidate policies; **11 passed, 7 failed**, exit 1. Each actual-choice policy check fails.

The first save-fixture run omitted normal world initialization, so reinitializing after load added six missing empty faction records and the exact-JSON assertion failed. The fixture now initializes all factions before capture, matching normal creation; no production save behavior was weakened.

## Status and limits

Implemented and source-contract tested in this module. Planner and registration integration are coordinated by the lead; **live integration, RMMZ runtime screenshots, editor F5 and F8 are not checked by this module's author**. No image files were created or changed. No visual acceptance is claimed.

This records learned work rather than a complete culture simulation. There are no customs, festivals, laws, religion, equipment restrictions, migrations, inheritance transfers, trade contracts or justice here. Profession is derived from experience, not a new class system. Some policy conditions require later feasible alternatives (for example optional furnishings); absence of alternatives correctly leaves the plan unchanged. Household authority, safe adult reproduction and child-only goals are implemented by their owning modules, not by this one.
