# DEUS_Colonists: the decision order and the reflex layer

The colonists' autonomous behaviour lives in `game/js/plugins/DEUS_Colonists.js` (`UF.Colonists`). The older systems record, `docs/systems/UF_Colonists.md`, describes the settlement plan, households, sleep preferences and the daily needs (SRD 5.1, DEUS-TSK-FABLE-05); this page describes what decides a colonist's next act and the reflexes that sit above every project and routine (DEUS-TSK-FABLE-11, 2026-09-24).

**Owner:** Gemini's plugin; the decision order, the hazard and threat reflexes, `assess` and the move hook by Fable. Related: `UF.Jobs.lethalHazardAt / inLethalHazard / safeCellNear` and the `extinguish` job (`DEUS_Jobs.js`), `world:unitMoved` (`DEUS_World.js`), `UF.Conditions.onUnitMoved` (`docs/systems/DEUS_Conditions.md`).

## 1. The order

`decide(u)` runs for an idle colonist (a colonist with a job is left to it); `scan()` interrupts a busy colonist in the same order. `assess(u)` reports the rung without acting: `{ priority: 1..9, name, detail }`, for `UF_Sheet` and the harnesses.

| Rung | Name | Idle colonist | Busy colonist (scan) |
|---|---|---|---|
| 1 | `unable` | unconscious at 0 hit points, or `UF.Conditions.canAct` false (paralyzed, petrified, stunned): nothing | its job is UF_Colonists' dying/sleep business |
| 2 | `hazard` | standing in fire, lava or deep water: a `move` to the nearest safe square (`UF.Jobs.safeCellNear`, `params.reflex "hazard"`); aflame on safe ground: the `extinguish` job (drop and roll, or a douse beside water) | any job that is not a reflex is cancelled `emergency: lethal hazard` at once, every sweep, and the colonist decides on the next update; `UF_Jobs.step` fails such a job on its own as well |
| 3 | `threat` | hit by a hostile lately (`combat:hit`, within `THREAT_TICKS` 300 and `THREAT_RADIUS` 12): an armed colonist not set to flee holds its ground for `UF_Combat` (takes no work), the rest run to the square farthest from the attacker within `FLEE_RADIUS` 8 (`params.reflex "threat"`) | work is cancelled `emergency: threat` once per `PREEMPT_EVERY`; reflexes, emergencies and need jobs are not |
| 4 | `aid` | a dying, unstable colonist nearby: the `stabilize` job (`rescueJob`) | the nearest ordinary worker is pulled off its job `emergency: aid` |
| 5 | `critical` | the acute daily needs (`urgent`: bedtime rest, thirst and hunger after the last meal hour, exhaustion 5), a meal hour with the day's food or water short (`meal`), starvation past the SRD grace days, hypothermia (`warmthJob`: a square within two of the nearest fire, `params.reflex "warmth"`) | labour is cancelled `survival: <need>` once per `PREEMPT_EVERY`, never a job that serves the need |
| 6 | `orders` | a draft (`data.drafted`) or a manual combat mode: nothing, `UF_Combat` has the colonist | not preempted |
| 7 | `work` | a settlement project job (`projectJob`), any open designation (`designationJob`), stepping off a reserved square | idle strolls are cancelled `work: preempt idle` when work is open |
| 8 | `routine` | the rest of the day's food, water and rest (`needJob`) | |
| 9 | `idle` | stroll, explore, inspect, talk, sit by the fire (`idleJob`) | |

Rung 8 sits below work by decision (DEUS-TSK-FABLE-11): a colonist eats and drinks at a meal hour, after the last meal hour, or when nothing else calls, and works otherwise. `tools/test_survival_needs_loop.js` (Gemini) still encodes the earlier "needs first at any hour" order with a calendar that never moves; see §4.

## 2. Hazards

`UF.Jobs.lethalHazardAt(area, x, y)` → `{ kind }` or null: `UF.Fire.isBurning` on the square, an object tagged `fire`/`lit` on it, `UF.Levels.isLavaAt`, or `UF.Levels.isFlooded` with lava or deep water (`deep`/`depth ≥ 2`). `inLethalHazard(unit)` adds `{ kind: "burning", where: "self" }` for a unit aflame (`UF.Environment.isBurning` or `data.burning`). `safeCellNear(unit, radius)` walks rings by Chebyshev distance (then y, x) for a standable square with no hazard and nobody on it: deterministic.

`UF_Jobs.step`: before any planning, a job whose worker is in a lethal hazard fails `emergency: lethal hazard` unless `params.reflex` is set; a cancelled haul puts what it carries down at the worker's feet as ever.

The `extinguish` job (`UF_Jobs`): stands where the unit is, `method` `water` (30 ticks, a water square beside) or `roll` (120 ticks), then `UF.Environment.extinguishUnit`; `result { extinguished, method }`.

## 3. Threats and the move hook

`combat:hit` on a colonist from a non-colonist (or a colonist tagged hostile) records `data.threat = { attackerId, at }` (JSON, saved). `threatOf(u)` forgets it once old, or the attacker dead, on another level or beyond `THREAT_RADIUS`.

`DEUS_World` emits `world:unitMoved(u, from, to)` from every square change (`stepAlongPath`, the off-screen step, `moveUnitToArea`, the on-screen sync when the event's square changed). `UF.Colonists.onUnitMoved(u, from, to)` hands it to `UF.Conditions.onUnitMoved` when the unit grapples or is grappled, so a grappler that steps out of reach lets go the moment it moves.

## 4. Checks

`node tools/test_hazard_reflex.js [--mutant=…]` (real Objects, Items, Jobs, Colonists, Conditions, Environment, Combat over a World double that emits `world:unitMoved` and stands in for UF_Fire and UF_Levels):

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

Rule 4 mutants (each exit 1 on 2026-09-24): `ignores_fire_while_hauling` (2 fail), `flees_into_fire` (1 fails), `grapple_persists_on_step` (1 fails). Result 2026-09-24: **10/10 (exit 0)**.

`tools/test_stabilization.js` reads the Medicine check's result at `jobs:done` (the finished job is pruned from `UF_Jobs`' list before the check runs since the idle fallback): 12/12.

Known effect (probed 2026-09-24, the current tree against a worktree at `2f22f9e`): `tools/test_survival_needs_loop.js` (Gemini's) drops from 18/19 to 14/19 with the new order, deterministically.

| Check | Why |
|---|---|
| `drinks_a_gallon_a_day`, `eats_a_pound_a_day` | its calendar stays at 10:00, so no meal hour ever comes; founders #4 and #5 work the open shelter project instead of drinking first (rung 8) and drink at 19:00 in a later scene |
| `labor_resumes_after_supper` | at 19:00 the project has no open job in either tree (`projectJob` null); the baseline hauler had taken the last gather 11 updates after supper, the current one meets none and holds the idle fallback's fire-gathering `move` for the whole 900-update wait, so the check's "no job and nothing open" clause never fires |
| `long_rest_rules` | the shifted timeline leaves founder #8 at (47,33) east of the pond when the scene begins; it finishes a drink at (47,32), its bed is at (34,32), and the harness's walker drops the goal at the first water square, so the sleep stalls `can't reach it` (the baseline had #8 at (32,29) inside the camp) |

The order is the packet's; the harness encodes the earlier "needs first at any hour" and walks in straight lines. Either it advances its clock through a meal hour and paths around the pond, or the coordinator restores needs above work.
