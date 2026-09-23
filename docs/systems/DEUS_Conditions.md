# DEUS_Conditions

The single registry and state engine for the fifteen SRD 5.1 conditions (blinded, charmed, deafened, exhaustion, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious). Every other system (Combat, Dnd5e, World, Colonists, AI) asks `UF.Conditions` instead of judging conditions itself.

**Owner:** delivered by Gemini (DEUS-TSK-GEMINI-03, 2026-09-23); behavioural closure by Fable (DEUS-TSK-FABLE-10, 2026-09-24) · **File:** `game/js/plugins/DEUS_Conditions.js` · **Load order:** after `DEUS_World` and `DEUS_Colonists` (`@orderAfter`). **Not yet registered in `game/js/plugins.js`** (2026-09-24): in the engine, Combat, World and Colonists look the plugin up lazily and run without it; the harnesses below load it themselves.

## 1. Purpose

One source of truth for what a creature can do while a condition holds. Two authorities are reflected, never duplicated: `UF_Colonists` owns the exhaustion level (`Colonists.exhaustion`, `addExhaustion`, `removeExhaustion`) and the 0-hit-point dying record (`unit.data.dying`: death saving throws, `stable`, `wakeAt`); `UF.Conditions.has(unit, "exhaustion")` and `has(unit, "unconscious")` read those. Everything else is stored on the unit as JSON (`unit.data.conditions`), one container per condition holding independent instances, so a spider's bite and a poison cloud each poison the creature on their own clock while the penalty is applied once.

Derived conditions follow the SRD: paralyzed, petrified, stunned and unconscious are also incapacitated; unconscious is also prone.

## 2. Public API (`UF.Conditions`)

State:
- `has(unit, id)`, `get(unit, id)`, `instances(unit, id)` → `[{ id, condition, source, sourceUnitId, startedAt, duration, expiresAt, domain: "action", saveDc, saveAbility, metadata }]` (the 0-hit-point reflection adds `dying` and `stable`), `all(unit)`.
- `add(unit, id, { source, sourceUnit | sourceUnitId, duration, domain, saveDc, saveAbility, metadata, dropHeld })` → the instance. Indefinite is `duration: null` (never `Infinity`, which a save would lose). Instance ids `cond_<id>_<n>` come from a per-unit sequence `unit.data.conditionSeq`, so they stay unique across saves. Exhaustion goes to `UF_Colonists`.
- `remove(unit, id, instanceIdOrSource?)` (one instance; the oldest when unspecified), `clear(unit, id?)`, `standUp(unit)`.
- `tick(unit, tick?)`, `tickAll(units)`: expiries, and the grapple checks below.

What the condition does on infliction (`add`):
- **Drops what it holds** (`DROPS_HELD` = unconscious, petrified): `dropHeldItems(unit)` puts every item in a hand slot (`HELD_SLOTS`: `mainHand`, `offHand` and the older aliases `mainhand`, `offhand`, `weapon`, `shield`, `tool`) on the unit's own square: an equipped item id (DEUS_Items' model) through `Items.putDown`, a type string or `{ type, count }` (older records) through `Items.drop`; the slot is cleared; `condition:dropped_items(unit, [{ slot, itemId, type }])` is emitted. Worn slots are never dropped. **Incapacitated, stunned and paralyzed keep their grip**: no action, no reaction, but nothing falls. `DEUS_Combat`'s `combat:downed` (a colonist dropped to 0 hit points) drops the items the same way.
- **Falls prone** (unconscious).
- **Lets go** (`INCAPACITATING` = incapacitated, stunned, paralyzed, unconscious, petrified): every grapple the creature holds ends at once, before any tick (see grapples).

Capability queries: `canAct`, `canReact`, `canMove`, `canSpeak`, `canHear`, `canSee`, `speedZero`, `speedFactor`, `effects(unit)`; `isStable(unit)` (0 hit points and `dying.stable`, or a `stable` flag on the unit).

Rules:
- `attackRollModifiers(attacker, target, opts)`, `checkModifiers(unit, ability, skill, opts)`, `saveModifiers(unit, ability, opts)` → `{ advantage, disadvantage, autoFail, advSources, disSources }` with SRD cancellation (any advantage against any disadvantage is neither). Instances never stack: one `poisoned` entry however many poisons.
- **Frightened**: `canWillinglyMoveTo(unit, x, y)` refuses any square closer (Chebyshev) to a source of the fear, whether or not the source is in sight. The disadvantage on attack rolls and ability checks applies only while a source is in sight: `fearSourceVisible(unit, opts)` (a source without a unit counts as seen; `opts.fearSourceVisible` forces the answer) through `lineOfSight(a, b)`: the same level and no wall, door or solid rock (`UF.Objects` tags `wall`/`door`, `UF.Levels.shapeAt === "solid"`) on the Bresenham line between them; `setLineOfSight(fn)` installs a better test.
- **Charmed**: `canHarmfullyTarget(actor, target)` is false for the charmed creature against its charmer (Combat refuses the attack; every hostile action must ask it). `charmerHasAdvantageOver(charmer, target)`; `socialCheckModifiers(actor, target, ability, skill, opts)` gives the charmer advantage on persuasion, deception, intimidation and performance (or `opts.social`) against the creature it charmed, on top of the actor's own modifiers (`charmerAdvantage`, source `charmer_social`).
- **Grappled**: speed 0. Ends when the grappler is incapacitated (at once, on infliction), dies (`colonists:died`, `combat:kill`), leaves the world (`world:unitRemoved`), or is farther than one cell: `onUnitMoved(unit)` (call after a move; `tick(victim)` catches it too). The grappler carries the victims it holds in `unit.data.grappling` (ids), so no scan is needed. `releaseGrapples(grappler, reason)` ends all of them.
- **Dying vs stable**: a creature at 0 hit points is unconscious (reflected from `UF_Colonists`); if its dying record is stable it makes no death saving throws and stays unconscious until it is healed or its hours are up (`Colonists.regainConsciousness`), which the harness watches on the real plugin.
- `critOnHit`, `damageMultiplier` (petrified ½), `weightMultiplier` (petrified ×10).

## 3. Events (`UF.Events`)

Emits `condition:added`/`condition:applied(unit, instance)`, `condition:removed(unit, instance)`, `condition:expired(unit, instance)` (instance carries `endedBecause` for grapples), `condition:cleared(unit, id|null)`, `condition:stood_up(unit)`, `condition:dropped_items(unit, list)`. Listens: `combat:downed`, `colonists:died`, `combat:kill`, `world:unitRemoved`.

## 4. Save data

`unit.data.conditions = { [id]: { id, name, instances: [instance] } }`, `unit.data.conditionSeq` (instance counter), `unit.data.grappling` (victim ids on a grappler). All JSON: `duration`/`expiresAt` are numbers or `null`, metadata is the caller's JSON, every stamp is an action tick with `domain: "action"`. A save and load give the same bytes and the same expiries.

## 5. Checks

`node tools/test_conditions_system.js` (Gemini, 55 checks; mutants `stack_effects`, `incapacitated_can_act`, `frightened_ignores_source`, `no_auto_fail_save`): the fifteen definitions, derived conditions, cancellation, auto-fails, movement, prone distances, crits, petrified, ticking and the 12-slot sheet. (Its `stack_effects` mutant never changes behaviour and passes 55/55 both before and after FABLE-10; noted 2026-09-24.)

`node tools/test_conditions_native_closure.js` (DEUS-TSK-FABLE-10; real Objects, Items, Jobs, Colonists, Conditions, Combat and Dnd5e plugins over a World double, live item ids in the hand slots):

| Check | FAILs when |
|---|---|
| `unconscious_drops_held_items` | an axe in `mainHand` and a club in `offHand` are not lying on the creature's square with both slots cleared and one `condition:dropped_items` event of two items, or it can still act or is not prone |
| `petrified_drops_held_items` | the axe is not on the square, the creature is not incapacitated or takes full damage |
| `incapacitated_stunned_paralyzed_keep_grip` | any of the three lets the axe leave the hand or the inventory, or leaves the creature able to act or react |
| `downed_at_zero_hp_drops_items` | `combat:downed` does not drop the held axe, or the creature is not unconscious by the 0-hit-point rule |
| `grapple_ends_when_grappler_incapacitated` | for any of the five incapacitating conditions the victim is still grappled right after the infliction (no tick), the grappler's index is not cleared, or no expiry event fired; a poisoned grappler must keep its hold |
| `grapple_ends_when_grappler_dies_or_leaves` | a dead grappler or one removed from the world keeps its hold, or another grappler's hold ends with it |
| `grapple_ends_when_grappler_moves_away` | `onUnitMoved` after a three-cell move does not end the hold, or `tick` after another move does not |
| `frightened_cannot_approach_visible_or_hidden_source` | a closer square is allowed, or a farther or equidistant one refused, with or without a wall between |
| `frightened_disadvantage_suspended_without_line_of_sight` | in sight the attack or check disadvantage is missing; behind three wall cells it is still applied or the source reads as seen; `opts.fearSourceVisible` does not force it; sight does not return when the wall goes |
| `charmer_social_advantage` | the charmer lacks advantage on persuasion or deception against the charmed creature, or has it against a stranger, on athletics, or when another creature makes the check |
| `charmed_refuses_harm_to_charmer` | the charmed creature may target its charmer, may not target a stranger, the charmer may not target it, or `DEUS_Combat.resolveAttack` resolves against the charmer |
| `stable_dying_skips_death_saves` | after five rounds a stable patient's saves moved, its hit points left 0, it is not unconscious, `isStable` is false, the reflection lacks `stable`, or the unstable control never rolled (or woke on a 20) |
| `stable_stays_unconscious_until_revived` | the patient does not wake when its hours are up with 1 hit point, conscious and able to act |
| `multi_instance_non_stacking_and_isolated_removal` | two poisons give two disadvantage sources, removing one ends the other, or the other does not expire at its own tick with one expiry event |
| `save_load_round_trip` | the record contains Infinity, undefined or NaN, differs after a JSON round trip, loses the expiry, source, metadata, save DC or the indefinite duration, the copy does not behave (frightened, charmed, grappled), expiry ticks differ, or a new instance id collides after the load |
| `timers_tagged_action` | any instance stamp is not `domain: "action"` |
| `plugins_load`, `no_errors` | the API is missing; any console error |

Rule 4 mutants (each exit 1 on 2026-09-24): `stunned_drops_item` (2 fail), `grapple_survives_incapacitated` (1 fails), `frightened_allows_advance` (2 fail), `charmed_allows_attack` (2 fail). Result 2026-09-24 against `e08aae2` plus this plugin: **18/18 (exit 0)**.

## 6. Status (2026-09-24)

Works headless: everything in §5. Not run: the engine (the plugin is unregistered; no F5 observation). `DEUS_World` does not yet call `onUnitMoved` after a step; `tick` on the victim catches a grappler that walked away. Line of sight treats every `door` as closed. A "stabilized" condition does not exist as an instance; stability is `UF_Colonists`' dying record (or a `stable` flag), read through `isStable`.
