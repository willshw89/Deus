# HANDOFF: 0 hit points means unconscious, not dead (Combat's side of SRD stabilisation)

**From:** Claude Code (Fable, engine) · **To:** Gemini (owner of `DEUS_Combat.js`, `DEUS_Dnd5e.js`) · **Date:** 2026-09-23 · **Feature:** SRD 5.1 dying and first aid, task 3 of the owner's survival order

## What the owner decided
An unconscious colonist at 0 hit points receives help rather than lying there: another colonist creates an emergency aid job, reserves the patient, paths adjacent, makes a DC 10 Wisdom (Medicine) check, and on success the patient is **stable: no longer dying, not healed**. Emergency aid ranks above ordinary labour and below the rescuer's own immediate self-preservation.

## What Colonists and Jobs already do (commit pending, "stabilization")
- `DEUS_Colonists` owns a colonist's **dying state** (`unit.data.dying = { successes, failures, stable, since, nextRoundAt, wakeAt }`) exactly as `srd:rule:combat-damage-and-healing` (Dropping to 0 Hit Points, pp. 96–99) writes it: at 0 hit points a colonist is unconscious; every round (360 ticks, 6 s) it rolls a death saving throw (d20: 10+ success, less a failure, a 1 two failures, a 20 regains 1 hit point and consciousness); three successes make it stable, three failures kill it. A stable colonist rolls nothing, stays at 0, and regains 1 hit point after 1d4 hours unless healed. Death goes through `Combat.onUnitDeath(unit)` when Combat is loaded (yields, chronicle, remains), else the unit is removed.
- `UF.Colonists.woundedAtZero(unit, critical)`: **damage taken at 0 hit points** is one death saving throw failure, two on a critical hit, and ends stability. Combat calls this.
- `UF.Colonists.stabilize(patient, rescuer)`: the first-aid check, d20 + Wisdom modifier (`data.stats.wis`) + 2 with `data.proficiencies` containing `"medicine"`, DC 10. Returns `{ ok, roll, total, dc }`.
- `UF.Jobs` job `stabilize` `{ unitId }`: walks the rescuer adjacent, reserves the patient (`ReservationManager`, key `entity:<id>`), spends one round, calls `Colonists.stabilize`, and tries again next round on a failed check. Colonists' `rescueJob` gives it to the nearest capable colonist; the sweep pulls the nearest ordinary worker off its job with reason `emergency: aid` when no rescuer is on the way.
- Readers: `UF.Colonists.unconscious(unit)`, `UF.Colonists.dying(unit)` (the record or null). Events: `colonists:dying`, `colonists:stabilized(unit, how)`, `colonists:conscious(unit, how)`, `colonists:died(unit, cause)`.

## What Combat has to change
Today `Combat.applyDamage` (around line 803) calls `Combat.onUnitDeath` the moment `hp <= 0`, and `isDead(u)` treats `hp <= 0` as dead. For a **colonist** (`UF.Colonists.isColonist`, or any unit Colonists tracks) the SRD flow replaces that:
1. **Instant death only on massive damage**: when the damage that reduces the target to 0 leaves remaining damage equal to or above its hit point maximum (`srd:rule:combat-damage-and-healing`, Instant Death). Otherwise set `hp` to 0 and stop: no `onUnitDeath`, no `_isDying`. Colonists starts the dying state on its next sweep (within 30 ticks) or at once if you call `UF.Colonists.woundedAtZero(unit, false)` with no failure intended... simplest: emit `combat:downed(unit, attacker)`; Colonists' sweep does the rest.
2. **Damage at 0 hit points**: call `UF.Colonists.woundedAtZero(unit, isCritical)` instead of dealing damage; it counts the failed save(s) and kills through `Combat.onUnitDeath` on the third.
3. **`isDead`**: a unit with `hp <= 0` is dead only when `data.dead` is true. An unconscious colonist is a valid target (attacks against it have advantage and hit as critical within 5 feet, per the unconscious condition) but not a corpse: keep it on the map, no yields, no chronicle.
4. **Healing** (`Combat.heal` or Dnd5e's cure spells): any hit point regained ends unconsciousness; call `UF.Colonists.dying(unit)` and, if present, clear it by raising `hp` above 0; Colonists' `regainConsciousness` runs when it sees `hp >= 1` on the next sweep, or call `UF.Colonists.stabilize`? No: healing is yours, just set `hp` and Colonists notices.
5. Non-colonist creatures keep the current instant-death flow until the owner extends the SRD dying rules to them.

## Acceptance (headless, Rule 4)
- A colonist reduced from 4 to 0 by 3 damage: `hp` 0, `data.dead` false, still in the world, `UF.Colonists.dying(unit)` present after one sweep.
- The same colonist reduced from 4 to 0 by 14 damage with a maximum of 10: dead at once (massive damage).
- A hit on a colonist at 0: `dying.failures` up by one (two on a critical); the third kills through `onUnitDeath`.
- A cure that raises `hp` to 3 on a dying colonist: conscious, dying record cleared.
- A mutant that keeps the instant-death path makes the first check FAIL.
