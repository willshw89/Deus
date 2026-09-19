# UF_FireSafety

Date: 2026-09-19. A bounded colony-planner adapter for local firefighting and physical clearance beside cooking fires. It uses the existing Fire and Jobs systems; it does not grant water, remove fuel or extinguish flames merely because a colony has a safety policy. Player colonists and NPC settlement adults can respond on their own level while that level is off screen.

File: `game/js/plugins/UF_FireSafety.js`. Load after `UF_Fire` and `UF_Colonists`; Households and Ownership are optional integrations. No engine core, art or catalog changes are required by this module. Root coordinates registration and the small Fire/Colonists integration seams.

## Public API (`UF.FireSafety`)

| Member | Contract |
|---|---|
| `eligible(unit)` | Whether this is an extant, living colonist or settlement person with a recorded finite age of at least 18, a settlement record, no active Combat state, hunger/thirst below 75 and sleep need below 85. Burning, severe/critical hypothermia and heatstroke also refuse dispatch so urgent environmental care retains priority. Unknown ages and children do not become firefighters. |
| `respond(unit)` | Return an assigned ordinary `douse` Job, or null. Validate nearby fire, faction, water and both walking legs before cancelling routine work. Preserves explicit orders, existing dousing, combat, eating, drinking, sleeping, mating, hunting and fleeing. |
| `prevent(unit)` | For an eligible idle worker, return an assigned ordinary clearance Job beside its settlement fire or household hearth, or null. Uses existing object actions and their work, yields and transformations. |
| `hearthPreparation(unit, ref)` | Return `{safe:true}`, `{safe:false,spec}` for the next required clearance Job specification, or `{safe:false,reason}` when clearance cannot safely proceed. The full cell ref is `{area:{x,y},x,y,z}`. It examines the four orthogonal neighbors and requires the same level. It creates no Job and changes no object itself. |
| `LIMIT` | Three simultaneously assigned active douse responders per faction, settlement and level. |

`UF.Fire.douse(area,x,y,opts)` additionally accepts `opts.faction`: an explicitly supplied faction is retained on the Job; omission preserves the existing player-faction default. This lets an NPC settlement use the real douse handler without giving it a player designation.

## Planning and execution

`UF_Colonists.scan` offers a fire response before continuing ordinary assigned work. Its usual adult decision path checks bodily needs before `respond` and `prevent`. Its build planner calls `hearthPreparation` before creating or supplying a fire-tagged building: clearance becomes a normal plan Job, while an unsafe/unreachable clearance prevents that candidate from being built. These are explicit integration hooks, not aliases of closure-local planners.

Response considers burning cells on the worker's own area and z. A fire must be within 40 cells of the worker and local to the settlement: within `max(20, settlement.radius + 4)` of its site, or within five cells of its household's main building/annex footprint. It prioritizes burning buildings, beds and stores, then distance with deterministic coordinate ties, examining at most six candidates. It will not steal another faction's douse Job or an already assigned response.

Before preemption, the existing douse handler must produce a valid water-side stand. The exact path from worker to water and then from water to a nonburning stand beside the fire must both exist. Paths may not be partial, end on another cell, or cross current flames. All refs retain z; neither the camera nor the worker is transferred between levels. A failed preflight leaves the worker's current Job intact.

Successful dispatch creates or adopts the faction's ordinary douse Job, marks `params.fireSafety` and `params.siteId`, and assigns the worker. The existing handler walks to water, performs its configured filling work, walks to the fire, performs its configured dousing work and then calls the real Fire extinguish path. A filled-water record and Job progress are not a new inventory bucket item.

Hearth preparation permits only existing action handlers whose catalog action explicitly changes or removes its object. Harvesting an object into the same object is not clearance. Flammable buildings, walls, doors, beds, stockpiles and ruins are never removed by this policy. Public/unowned fuel, the worker's own property and its faction's property can be cleared; another unit's or faction's property cannot. The action's normal stand and exact safe path must be available. An existing active Job on that cell prevents duplicate prevention work.

An action that changes a tree to a flammable stump is only one step: subsequent evaluation must clear the remaining fuel before `safe:true`. No immunity flag is installed on a hearth or neighboring cells.

## Scheduling, saves and bounds

There is no new persistent state schema, event listener or independent simulation clock. Job records, fire state and actual object changes use their existing saved systems. Response attempts are throttled per worker for 120 simulation ticks, with the in-memory throttle reset when the world-state object changes. At most eight camp/household hearth candidates are inspected for prevention. Exact path probes have a 3,000-node budget.

Normal Colonists/Jobs updates obey the existing pause/speed mechanism. Direct API calls are diagnostic/planner operations and do not themselves enforce a UI pause. The source-only tests call Jobs updates directly and therefore are not pause tests.

## Checks and observed evidence

Run `"C:\Program Files\nodejs\node.exe" tools/test_fire_safety.js`.

Observed 2026-09-19: **25 passed, 0 failed**. The Node VM executes the actual complete `UF_FireSafety`, `UF_Fire` and `UF_Jobs` sources. Terrain/path movement, object application, Ownership, settlement lookup and engine classes are explicit doubles. Checks include NPC off-screen water/filling/dousing work, independent operation on all five levels, known adulthood, dying/nonpositive health, combat and critical-needs preservation, burning/severe thermal-condition preservation, explicit/protected Jobs, both path legs, partial/wrong/burning paths, locality, faction Job ownership, responder caps, retry bounds, physical clearance, household annex hearths and duplicate work.

Eight actual-source mutations were run in memory; no production file was sabotaged:

| Command suffix | Removed protection | Observed result |
|---|---|---|
| `--mutant=ordered` | Explicit-order preservation | 24 passed, 1 failed; exit 1 |
| `--mutant=second_leg` | Water-to-fire exact path | 24 passed, 1 failed; exit 1 |
| `--mutant=ownership` | Other-owner clearance refusal | 24 passed, 1 failed; exit 1 |
| `--mutant=adulthood` | Finite adult age | 24 passed, 1 failed; exit 1 |
| `--mutant=limit` | Three-responder limit | 24 passed, 1 failed; exit 1 |
| `--mutant=changing_fuel` | Action must change/remove fuel | 24 passed, 1 failed; exit 1 |
| `--mutant=faction` | Explicit faction in the real Fire.douse API | 23 passed, 2 failed; exit 1 |
| `--mutant=thermal` | Burning/severe thermal-condition guard | 24 passed, 1 failed; exit 1 |

Root's independent NW.js snapshot `fire_safety_20260919_b`, using test-only `tools/fixtures/UF_FireSafetyRuntime.js`, passed **7/7** with fixed seed `20260919`. The results file was read by this document's author. Real runtime evidence includes a busy NPC on z=-1 replacing ordinary work while the displayed map remained Ground, fetching real water and completing dousing before a wooden wall burned out; an ordinary gather Job physically clearing grass beside a campfire; a forced escape-risk control showing that restored adjacent grass still catches; RMMZ serialization retaining fire and completed Job records; and no harness-captured new errors. The arena and ignition were deliberately prepared; this is not a claim that every generated settlement has usable water. This snapshot predates the narrow thermal-eligibility guard; the latter has the actual-source test and mutation above, not a separate runtime thermal-care claim.

Root produced and reported opening both screenshots in `C:/Users/snewt/AppData/Local/Temp/uf_snapshots/fire_safety_20260919_b/test_output/`:

- `fire_safety.saved_wooden_wall.png`: reported blue-lit cavern with the preserved wooden wall and NPC profile.
- `fire_safety.clearance_and_hazard_control.png`: reported restored grass burning beside the contained campfire after the forced-risk control.

This document's author did not independently open those two runtime images. Root owns their visual acceptance. The first runtime attempt was 5/7 because the fixture expected cancelled Jobs to have a `cancelled` state instead of the real `failed` state, and changed speed without explicitly resuming its paused world. Root corrected those fixture expectations; no production behavior was weakened to pass them.

## Status and known limits

Source and the above snapshot checks have run. Editor F5/F8 acceptance and user slice approval remain unperformed; there is no claim of full Definition of Done.

- Clearance reduces adjacent fuel; it does not guarantee that a colony survives fire. Distant fires, inaccessible water, occupied stands, critical needs, active orders/combat and the three-responder emergency-dispatch cap can prevent a response. Ordinary player douse designations may assign additional workers outside this adapter.
- A rejected path through current flames does not trigger an alternate-route search around those flames. The bounded exact-path probe can conservatively refuse an otherwise reachable distant route.
- Terrain or occupancy can change after preflight. Normal Jobs planning/failure behavior remains responsible for that later change.
- Prevention inspects orthogonal neighbors and existing camp/household hearths. It does not clear arbitrary terrain, install fireproof materials, create wells or plan fire departments.
- Already stored fire spread/damage advances off screen through Fire. This adapter does not change the older Fire restriction that contained-source escapes and accidental starts are sampled only for the displayed area.
- Unknown-age adults in old saves remain ineligible until their age is actually recorded; inspection does not invent it.
- Existing `UF_Fire.md` descriptions of player-only camp response predate this optional adapter. The new settlement response applies only when this plugin and the explicit Colonists hooks are loaded.

## Try it in RMMZ

After root registers the adapter with the editor closed, reopen the project and run F5. Use a settlement with a recorded adult, reachable nearby water and an existing flammable object. A routine worker should fetch water and douse a nearby fire; an explicitly ordered worker or a critically hungry/thirsty worker should retain its higher-priority activity. Inspect the worker's profile for its current action. Observe existing camp/hearth vegetation being removed through gathering/chopping work, not instant deletion. Check F8 while performing these steps. Do not use a valuable save to deliberately start a fire.
