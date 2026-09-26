# DEUS_Colonists: the decision order and the reflex layer

The colonists' autonomous behaviour lives in `game/js/plugins/DEUS_Colonists.js` (`UF.Colonists`). The older systems record, `docs/systems/UF_Colonists.md`, describes the settlement plan, households, sleep preferences and the daily needs (SRD 5.1, DEUS-TSK-FABLE-05); this page describes what decides a colonist's next act and the reflexes that sit above every project and routine (DEUS-TSK-FABLE-11, 2026-09-24), the escape routes, alarms, refuges and the aid for a burning friend (DEUS-TSK-FABLE-12, 2026-09-24), and how the idle look for work without scanning the job list every tick.

**Owner:** Gemini's plugin; the decision order, the hazard and threat reflexes, `assess`, the move hook, the alarm and the idle scan bound by Fable. Related: `UF.Jobs.lethalHazardAt / inLethalHazard / fireNear / safeCellNear / carriesWater / isAflame`, the `extinguish` and `douse` jobs and routed `move` jobs (`DEUS_Jobs.js`), `world:unitMoved` (`DEUS_World.js`), `UF.Conditions.onUnitMoved` (`docs/systems/DEUS_Conditions.md`).

## 1. The order

`decide(u)` runs for an idle colonist (a colonist with a job is left to it); `scan()` interrupts a busy colonist in the same order. `assess(u)` reports the rung without acting: `{ priority: 1..9, name, detail }`, for `UF_Sheet` and the harnesses.

| Rung | Name | Idle colonist | Busy colonist (scan) |
|---|---|---|---|
| 1 | `unable` | unconscious at 0 hit points, or `UF.Conditions.canAct` false (paralyzed, petrified, stunned): nothing | its job is UF_Colonists' dying/sleep business |
| 2 | `hazard` | standing in fire, lava or deep water: a routed `move` to the safe square that costs least to reach (`UF.Jobs.safeCellNear`, `params.reflex "hazard"`, `params.route`); fire or lava on a neighbouring square with a calm square reachable (`detail "fire nearby"`): the same, to the calm square; aflame on safe ground: the `extinguish` job (drop and roll, or a douse with water beside or carried) | any job that is not a reflex is cancelled `emergency: lethal hazard` (in a hazard) or `emergency: fire nearby` at once, every sweep, and the colonist decides on the next update; `UF_Jobs.step` fails a job in a hazard on its own as well |
| 3 | `threat` | hit by a hostile lately, or alarmed (`combat:hit` or an alarm within `THREAT_TICKS` 300): an armed colonist not set to flee stands its ground (faces the attacker, engages it through UF_Combat when it is within one square, raises the alarm; no job, UF_Combat has it), the rest run for a refuge (`refugeFor`: within two of the hearth or of the nearest armed friend, whichever is nearer, that lies farther from the attacker; `params.reflex "threat"`, `params.refuge`), or for the square farthest from the attacker within `FLEE_RADIUS` 8 when no refuge qualifies | work is cancelled `emergency: threat` once per `PREEMPT_EVERY`; reflexes, emergencies and need jobs are not |
| 4 | `aid` | a burning colonist that cannot put itself out nearby: the `douse` job (`douseJob`, `detail "douse"`); a dying, unstable colonist nearby: the `stabilize` job (`rescueJob`, `detail "stabilize"`) | the nearest ordinary worker is pulled off its job `emergency: aid`, burning patients first |
| 5 | `critical` | the acute daily needs (`urgent`: bedtime rest, thirst and hunger after the last meal hour, exhaustion 5), a meal hour with the day's food or water short (`meal`), starvation past the SRD grace days, hypothermia (`warmthJob`: a square within two of the nearest fire, `params.reflex "warmth"`) | labour is cancelled `survival: <need>` once per `PREEMPT_EVERY`, never a job that serves the need |
| 6 | `orders` | a draft (`data.drafted`) or a manual combat mode: nothing, `UF_Combat` has the colonist | not preempted |
| 7 | `work` | a settlement project job (`projectJob`), any open designation (`designationJob`), stepping off a reserved square; the look at the open jobs is bounded (§4) | idle strolls are cancelled `work: preempt idle` when work is open |
| 8 | `routine` | the rest of the day's food, water and rest (`needJob`) | |
| 9 | `idle` | stroll, explore, inspect, talk, sit by the fire (`idleJob`) | |

Rung 8 sits below work by decision (DEUS-TSK-FABLE-11): a colonist eats and drinks at a meal hour, after the last meal hour, or when nothing else calls, and works otherwise. `tools/test_survival_needs_loop.js` (Gemini) was aligned to this order in `28b0e5b` (19/19).

## 2. Hazards, routes and the flames

`UF.Jobs.lethalHazardAt(area, x, y)` → `{ kind }` or null: `UF.Fire.isBurning` on the square, a passable object tagged `fire`/`lit` on it (a hearth or kiln is impassable and never stood in), `UF.Levels.isLavaAt`, or `UF.Levels.isFlooded` with lava or deep water (`deep`/`depth ≥ 2`). `inLethalHazard(unit)` adds `{ kind: "burning", where: "self" }` for a unit aflame (`UF.Environment.isBurning` or `data.burning`). `fireNear(area, x, y)` → the fire or lava on one of the eight squares beside, with its square, or null. `isAflame(unit)`; `carriesWater(unit)`: an item whose type has `liquid: "water"`, or the tags `water` + `container`/`drink` (no such item is in the catalog yet).

`safeCellNear(unit, radius = 8, opts)` (DEUS-TSK-FABLE-12) is a cost search from the unit's square over standable squares within the radius, four ways: a step costs 1, a step through a lethal hazard `HAZARD_STEP_COST` 25, so the way round is taken whenever one exists within reach and the least fire is crossed when none does. The goal holds no hazard and nobody else; from a hazard square any such goal will do (out of the flames first), from safe ground only a calm one (no fire or lava beside it). `opts.preferWater` (a burning colonist) goes up to `WATER_DETOUR` 3 farther for a square beside water. Squares expand in cost order, ties by y then x: deterministic. Returns `{ area, x, y, z, route: [{ x, y }, ...], cost, calm, throughHazard }`. Bounded by the radius (at most 289 squares) and only run for a colonist in or beside a hazard.

A `move` job with `params.route` walks it a waypoint at a time (`DEUS_Jobs.js`, `moveHandler`): the stand is the first waypoint not yet reached (`params.routeIndex`), and `apply()` continues the job until the last, so the sprite never cuts across the flames. A reflex move (`params.reflex`) runs however laden: the encumbrance rule in the plan and in `step()` is skipped for it.

`hazardOf(u)` (Colonists) is `inLethalHazard`, else `fireNear` with a calm escape found (`{ kind, where: "near", escape }`): a colonist with no calm square within reach keeps at its work rather than thrash. `UF_Jobs.step`: before any planning, a job whose worker is in a lethal hazard fails `emergency: lethal hazard` unless `params.reflex` is set; a cancelled haul puts what it carries down at the worker's feet as ever (the hauler in the torture suite leaves its five logs on the burning square).

The `extinguish` job (`UF_Jobs`): stands where the unit is, `method` `water` (30 ticks: a water square beside, or water carried) or `roll` (120 ticks), then `UF.Environment.extinguishUnit`; `result { extinguished, method }`.

The `douse` job (`UF_Jobs`, DEUS-TSK-FABLE-12): emergency aid for a burning friend who cannot put itself out (`params.unitId`; unconscious, unable to act, or at exhaustion 5). The patient is reserved for the rescuer as in `stabilize`; the stand is a hazard-free square beside the patient; `method` `water` (30 ticks) when the rescuer carries water or water lies beside the patient or the stand, else `smother` (120 ticks); then `UF.Environment.extinguishUnit`; `result { extinguished, method, patientId }`. An emergency job (`params.emergency`: needs do not interrupt it), not a reflex: a rescuer whose own square catches fire runs like anyone. `burningPatientsFor(u)` lists such friends within `RESCUE_RADIUS` 40; `douseJob(u)` takes the nearest nobody is helping; a colonist itself aflame helps nobody.

## 3. Threats, the alarm and the move hook

`combat:hit` on a colonist from a non-colonist (or a colonist tagged hostile) records `data.threat = { attackerId, at }` (JSON, saved). `threatOf(u)` forgets it once old, or the attacker dead, on another level or beyond the radius: `THREAT_RADIUS` 12 for a hit and for the unarmed, `ALARM_RADIUS` 24 for an armed colonist that was alarmed.

Standing ground (`standGround`, an armed colonist not set to flee): `faceUnit` turns it to the attacker (`unit.dir`, and the event's direction on screen); `UF.Combat.engage` when the attacker is within one square (the combat loop fights from there: its weapon is drawn in effect; a foe farther off is met when it closes); `raiseAlarm` once per attacker per `THREAT_TICKS`: the colony remembers it (`colony.alarm = { attackerId, x, y, at, by }`), every colonist within `ALARM_RADIUS` of the attacker learns it (`data.threat = { attackerId, at, alarm: true }`, unless struck itself), and `colonists:alarm (by, attacker, told)` is emitted. A thought is left once per threat (`data.threat.stood`).

Running (`refugeFor(u, attacker)`, the unarmed): the refuges are the hearth and every armed, conscious friend within `REFUGE_RADIUS` 24; only one that lies farther from the attacker than the colonist stands qualifies (never a run through the foe); the nearest such refuge is taken, and the square within two of it that is farthest from the attacker (standable, no hazard, nobody on it). With none, the FABLE-11 fallback: the square farthest from the attacker within `FLEE_RADIUS`. The run is a `move` with `params.reflex "threat"` and `params.refuge` ("the hearth" or "an armed friend").

`DEUS_World` emits `world:unitMoved(u, from, to)` from every square change (`stepAlongPath`, the off-screen step, `moveUnitToArea`, the on-screen sync when the event's square changed). `UF.Colonists.onUnitMoved(u, from, to)` hands it to `UF.Conditions.onUnitMoved` when the unit grapples or is grappled, so a grappler that steps out of reach lets go the moment it moves, and a victim shoved out of reach is free.

## 4. The idle and the job list

The open job list is never scanned every tick (DEUS-TSK-FABLE-12). `openJobs()` reads `UF.Jobs.open()` at most once per map update and filters the cached records by their live state (one taken or withdrawn since the read is left out), so a sweep over eight idle colonists costs one read. A colonist that looked and found nothing (`projectJob`, `designationJob`) waits `IDLE_SCAN_INTERVAL` 60 ticks before looking again (`lastIdleScan`), and an empty list is empty for everyone: after a read that found it empty nobody looks for the interval. A job posted for anyone (`jobs:created` without an owner) or one back in the pool after its worker lost it (`jobs:failed` without an owner) clears every wait at once, so the idle still take a posted job within the next update or sweep. The same gate applies to the sweep's "work: preempt idle" look for colonists on idle business.

Measured (2026-09-24): `tools/test_autonomous_project_dispatch.js` `idle_scan_bounded` 2 `UF.Jobs.open()` calls in 120 updates with eight idle founders (39 before this task); the torture suite 5 in 300 updates, and a chop posted taken after 2 updates.

## 5. Checks

`node tools/test_hazard_reflex.js [--mutant=…]` (DEUS-TSK-FABLE-11; real Objects, Items, Jobs, Colonists, Conditions, Environment, Combat over a World double that emits `world:unitMoved` and stands in for UF_Fire and UF_Levels):

| Check | FAILs when |
|---|---|
| `hauling_settler_on_fire_drops_job_and_flees` | a hauler stepping onto a burning row does not lose the haul `emergency: lethal hazard`, no `move` with `reflex "hazard"` follows within 40 updates, its target burns, or it does not end on safe ground; `assess` on the burning square is not 2 |
| `work_resumes_only_from_safe_ground` | with fire closing in again, the settler's first ordinary job begins on a burning or hazardous square |
| `does_not_flee_into_fire` | with nine burning squares around it the flight target is not at distance 2, burns, or the settler ends on fire |
| `burning_triggers_self_extinguish` | a settler aflame on open ground does not `roll`, one beside the pond does not `water`, either is still burning after 400 updates |
| `grappler_step_breaks_grapple` | after the grappler's second step (distance 2) the victim is still grappled (no `Conditions.tick` runs in this harness) |
| `threat_response_run_or_hold` | the unarmed does not run farther from the wolf (`assess` 3, "runs"), the armed one's chop is not cancelled `emergency: threat` or it takes work (`assess` 3, "holds ground") |
| `priority_order_assessed` | `assess` does not read 1..9 for a state built per rung |
| `save_load_preserves_reflex_state` | a flight saved mid-way is not JSON-clean, the units or the reflex job differ after the round trip, the threat is lost, or the flight does not end safe |
| `plugins_load`, `no_errors` | the API is missing; any console error |

Rule 4 mutants (each exit 1 on 2026-09-24): `ignores_fire_while_hauling` (3 fail), `flees_into_fire` (2 fail), `grapple_persists_on_step` (2 fail). Result 2026-09-24: **10/10 (exit 0)**.

`node tools/test_hazard_torture_live.js [--mutant=…]` (DEUS-TSK-FABLE-12; the same plugins over a World double whose walker paths round water and blocking objects as the game's does, not round fire, and ignites a unit stepping onto a burning square as UF_Fire does; DEUS_Environment's own loop burns the units, one beat per 60 updates; UF_Combat's loop runs, with creatures in manual mode):

| Check | FAILs when |
|---|---|
| `fire_under_hauler_drops_load_and_douses` | a hauler carrying five logs (35 lb, unencumbered) stepping onto a burning band beside the pond keeps the haul, does not leave its five logs on the burning square, still carries any, is not aflame, gets no routed `move` to a safe square beside water, does not `extinguish` with `water`, is still burning or in a hazard after 400 updates, is not on a calm square after 300 more, or steps into fire again |
| `choked_escape_uses_corridor` | with every square within two burning but a bent corridor, the worker's `assess` is not 2 "fire nearby", its chop is not cancelled `emergency: fire nearby`, the reflex route is shorter than the corridor, any step lands in fire, or it does not end unburnt on a calm square |
| `burning_ally_doused_by_water_carrier` | a paralyzed friend aflame (`canAct` false, `assess` 1) does not make a colonist at work six squares off (`assess` 4 "douse") lose its chop `emergency: aid` and `douse` it with `water` from the skin it carries; the friend is still burning after 400 updates or dead |
| `burning_ally_doused_from_pond_or_smothered` | a rescuer with nothing beside the pond does not douse with `water`; one with no water does not `smother`; any of the three friends dies |
| `armed_holds_and_alarms_unarmed_runs_to_friend` | the armed settler at work beside the wolf is not `assess` 3 "holds ground", keeps its chop, does not face west (dir 4), is not engaged on the wolf, holds a job, or no alarm names the wolf and tells at least two; the armed friend six squares off is not alarmed, not "holds ground", or moves after it stood; the unarmed one struck is not `assess` 3 "runs", does not run for "an armed friend" to a square within two of it and farther from the wolf, or is not farther after 200 updates |
| `grapple_breaks_on_two_square_displacement_all_directions` | any of the 128 two-step runs (grappler stepping or victim shoved, eight directions from eight sides) is held beyond one square or released within it |
| `idle_scan_bounded_and_wakes_on_post` | more than 6 `UF.Jobs.open()` calls in 300 updates with eight idle founders and no open job, none at all, or a chop posted is not taken within 61 updates |
| `save_load_mid_route_flight_finishes` | a corridor flight saved at a waypoint is not JSON-clean, the units or the route differ after the round trip, or the flight does not finish unburnt on a calm square |
| `plugins_load`, `no_errors` | the API is missing; any console error |

Rule 4 mutants (each exit 1 on 2026-09-24): `panics_into_fire_when_choked` (a step through fire costs 1: 2 fail, the route runs north through the flames), `unarmed_charges_threat` (the refuge is a square beside the foe: 1 fails), `ignores_burning_ally` (`douseJob` returns null: 2 fail). Result 2026-09-24: **10/10 (exit 0)**.

`tools/test_stabilization.js` reads the Medicine check's result at `jobs:done` (the finished job is pruned from `UF_Jobs`' list before the check runs since the idle fallback): 12/12.

## 5b. A named bed (DEUS-TSK-FABLE-16, 2026-09-24)

`UF.Colonists.claimBedAt(unit, { area, z, x, y })` claims one particular standing bed for the colonist: refused (`null`) when no bed stands there, the cell is on another level, or another living colonist holds it; else `data.bed` becomes that cell (the earlier claim lapses with it, so the communal bed a household member held is free for the next claimant), `UF.Ownership.assignBed` is told when present, the claim index is invalidated and `colonists:bedClaimed` is emitted. `DEUS_Projects` uses it when a household moves into its cottage.

## 6. Known limits

- No water container item exists in the catalog: the torture suite adds a harness-only `TEST_waterskin` (`liquid: "water"`); a real one is the catalog owner's to add, and a skin is not emptied by a douse.
- An armed colonist engages only a foe within one square; a foe farther off is faced and met when it closes (UF_Combat's own reaction to a hit stands).
- An alarm lasts `THREAT_TICKS` 300 (half a game hour) per attacker; armed colonists within 24 of the attacker take no work meanwhile.
- A colonist with no calm square within `FLEE_RADIUS` of a fire beside it keeps working; one in fire with no safe square within reach stays and logs a thought.
- Drowning relies on `UF.Levels.isFlooded` reporting `deep`/`depth` (no such flood exists in the current world); `warmthJob` needs `UF.Environment` loaded.
- The torture suite's World double is not the game's pathfinder; DEUS_Environment's weather can rain a fire out in the sandbox after a few beats, which the ally scenes finish well before. Headless only: no F5 playtest of these scenes.
