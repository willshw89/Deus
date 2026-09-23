# HANDOFF: apply the SRD exhaustion effects in World, Combat and Dnd5e

**From:** Claude Code (Fable, engine) · **To:** Gemini (owner of `DEUS_World.js`, `DEUS_Combat.js`, `DEUS_Dnd5e.js`) · **Date:** 2026-09-23 · **Feature:** SRD 5.1 exhaustion, task 1 of the owner's survival order (effects → food data → stabilisation → native test)

## The rule
**`DEUS_Colonists` owns exhaustion state; World, Combat and Dnd5e read it.** No subsystem keeps its own exhaustion counter, timer or copy. Read the level each time it matters, or refresh a cache on the event below.

## The contract (already in `DEUS_Colonists.js`, commit 5f0b6f7)
- `UF.Colonists.exhaustion(unit)` → the level, 0–6 (0 for any unit that is not a colonist or has no SRD needs record).
- `UF.Colonists.exhaustionEffects(unit)` →
  `{ level, text, disadvantageOnChecks, speedFactor, disadvantageOnAttacksAndSaves, hpMaxFactor, dead }`
  with, per SRD p. 358 (`srd:condition:exhaustion`), cumulative from level 1 up:

| Level | Effect | Field | Who applies it |
|---|---|---|---|
| 1 | disadvantage on ability checks | `disadvantageOnChecks: true` | Dnd5e (every d20 ability check it rolls) |
| 2 | speed halved | `speedFactor: 0.5` | World (unit movement) |
| 3 | disadvantage on attack rolls and saving throws | `disadvantageOnAttacksAndSaves: true` | Combat (attacks), Dnd5e (saves) |
| 4 | hit point maximum halved | `hpMaxFactor: 0.5` | Combat (`Combat.maxHp`), Dnd5e where it derives hit points |
| 5 | speed 0 | `speedFactor: 0` | World; Colonists already gives such a colonist no work and only the rest |
| 6 | death | `dead: true` | Colonists already kills (`data.dead`, `hp` 0, `colonists:died`, unit removed) |

- Event `colonists:exhaustion(unit, level, cause)` fires on every change, `cause` one of `hunger`, `thirst`. Use it to refresh anything cached (an event's move speed, a hit point bar).
- The state lives in `unit.data.needs` (`model: "srd"`, `exhaustion`, `fromNeeds`); treat it as read-only outside Colonists.

## What each owner does
1. **World, movement.** Apply `speedFactor` to the colonist's movement. RMMZ move speeds are steps of ×2, so speed 4 halves to 3. `speedFactor` 0 needs no special movement handling beyond not moving (Colonists issues no jobs at level 5, and the long rest is taken in place). Apply where the unit's event gets its `moveSpeed` (`unitEventData`) and when `sendUnit` starts a walk, and refresh on `colonists:exhaustion`.
2. **Combat.** Attack rolls made by a unit with `disadvantageOnAttacksAndSaves` roll with disadvantage (the lower of two d20s, the same way an existing disadvantage source is applied). `Combat.maxHp(unit)` returns the base maximum times `hpMaxFactor`; clamp `data.hp` to it when the level rises to 4, and let it grow back when the level falls (do not heal on the way down, the SRD leaves current hit points alone).
3. **Dnd5e.** Ability checks and saving throws it resolves take disadvantage per the two flags. Any hit-point derivation it exposes multiplies by `hpMaxFactor`.

## Acceptance (headless, Rule 4: each check must be able to fail)
Add to your own harness, with a colonist whose `data.needs.exhaustion` is set directly through `UF.Colonists.needsOf(unit)`:
- level 2 → the unit's event move speed is one step below its base; level 0 again → base restored.
- level 3 → an attack roll takes the lower of two seeded d20s (assert against the same seeded rolls); level 2 → a single roll.
- level 4 → `Combat.maxHp` is half the base and `data.hp` is clamped; level 3 again → the maximum is back, current hit points unchanged.
- level 1 → an ability check resolved by Dnd5e uses disadvantage.
- At least one mutant (a subsystem ignoring the flags) makes the run FAIL.

## Not in this task
Zero hit points, death saving throws and stabilisation (task 3, `HANDOFF_srd_dying_and_stabilization.md` when it lands). Food weights (task 2).
