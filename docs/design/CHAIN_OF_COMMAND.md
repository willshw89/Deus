# CHAIN OF COMMAND: the leader gives the band its orders

Design written 2026-09-19 by Claude Code. Not built yet. This is the spec for one build of a new plugin, `UF_Command`.

The user's words (2026-09-19 afternoon): "I want a societal hierarchy where one character within a faction gives orders to others."
Decisions it implements (docs/VISION.md): V52 (the leader decides what the band works on and orders each member; members obey unless hunger, thirst, exhaustion or danger comes first; orders are spoken over the head and shown on the sheet; the player's orders enter at the top), V62 (orders are over-head text), V4 (every band starts as eight peasants around a lit campfire, one of them the leader), V17 (orders are never required), V23 (work chosen by skills and personality), V63 (skills 1–99), V64 (combat levels). Contract rules: docs/design/WORLD_ARCHITECTURE.md §1 (state in `UF.World.state` / `unit.data`, seeded randomness, budgets), §2.10 "Societies and rank".

**Build after:** the bands run lands (every faction's band runs UF_Colonists' loop: `state.societies[factionId]`, jobs with `params.faction`), and UF_Speech is registered. §6.2 lists exactly what UF_Command needs from those.

**Art:** none. Lines are text drawn by UF_Speech, the sheet and the menu are text. No handoff and no ASSET_REQUESTS entry.

---

## 0. In short
- Each band has one leader: the unit UF_History made `rank` 1 with no `superior`. Everyone else in the band has `superior` = the leader.
- Every 10 game minutes the leader reviews the band: danger at camp, the player's wishes, food, the next steps of the society plan. It turns that into a short task list and gives each free member the task they suit best (skills, distance). An order is a record on the member (`data.order`).
- A member's turn goes: danger, survival (thirst, hunger, exhaustion, night), then its order, then its own choice. The order makes ordinary UF_Jobs jobs, found with the same finders the plan uses.
- The leader says the orders over its head ("Wenna, cut us some wood."). The member's sheet shows the order and who gave it.
- When the leader dies, the eldest adult of the band takes over, with the same rank and title.
- The player sits above the leader: designations and a "band orders" menu go to the leader; a direct order to one colonist goes straight to that colonist and outranks the leader.

---

## 1. Who commands

### 1.1 The band and its leader
- A **band** is the living members of one faction's society: `UF.Colonists.members(factionId)` (the player's colonists, or another faction's people running the colonist loop).
- The **leader** is the member with `data.superior === null` and the highest `data.rank` (≥ 1). UF_History sets this at New Game (`spawnFounders`: one founder `rank: 1` with a `title` from `factions.founders.titles`; the other seven `rank: 0`, `superior` = the leader).
- UF_Command caches the leader's id in `state.command.bands[factionId].leaderId` and checks it at every review. The truth stays on the units (`rank`, `superior`).
- The leader works like everyone else (its own loop). Reviewing is thinking, not a job: it does not stop the leader's work and does not need the leader near anyone.
- New members join the tree: on `world:unitAdded` (births, arrivals) and at every review, a band member other than the leader whose `superior` is null or points to a unit that is gone gets `superior` = the leader.
- The player's band has a leader too and runs the same rules (V52: "The player's faction keeps its ranks too"). See §5.3 for how the player's orders sit on top.

### 1.2 What `rank` means
`rank` is the height of a unit in the command tree: 0 = commands nobody, 1 = commands members, 2 = commands leaders, 3 = commands leaders of leaders. Today every band has one leader at 1 and members at 0. The retired settling code (ruler 2, site leader 1, commoner 0) fits the same meaning, so nothing is renumbered. `title` is a word from the catalog, separate from rank.

### 1.3 Succession
**Trigger.** The leader is gone: its unit no longer exists, or `data.dead` is true, or `data.hp <= 0`, or its faction changed. Checked on `world:unitRemoved`, `combat:kill`, `anim:death` for a unit with `rank ≥ 1`, and at the start of every review (so a missed event can't leave a band headless).

**Rule** (deterministic, no roll). Among the band's living members whose `superior` was the old leader:
1. adults and elders (`stage` adult or elder, else `age ≥ 18`) first; if there are none, teens; if there are none, the band has no leader (§1.5);
2. the highest `rank` (matters only once there are several levels);
3. the eldest (`data.age`; equal ages: the smaller `data.born`);
4. the highest total skill level (`UF.Skills.total(unit)`; skipped when UF_Skills is absent);
5. the lowest unit id.

**Effects.**
- The new leader gets the old leader's `rank`, `title` and `superior` (null for a band head). Every member whose `superior` was the old leader now names the new one.
- `state.history.rulers[factionId]`: the open record gets `to` = `UF.History.currentYear()`; a new record `{ name, title, from: currentYear, to: null, unitId }` is pushed. Through `UF.History.addRuler(factionId, record)` if UF_History has it, else written directly in the documented shape (WORLD_ARCHITECTURE §2.7).
- One chronicle line: `UF.History.addEvent({ type: "succession", text, factions: [factionId] })`, text "Tamsin became Reeve of The Ostwyn League after Dorar died." ("was lost" when removed without a death, "left" when the faction changed).
- The new leader says one line (kind "remark"): "I will lead us now."
- Orders the old leader gave stand until they end (each keeps `byName`). The new leader reviews at once (a forced review, §3.1).
- `command:succession(factionId, newLeader, { id, name })` is emitted.

### 1.4 Later: more ranks (not built now)
V52 names a ruler, then leaders of sites, squads and work groups, then everyone else. The design grows into that without changing the order record or the member side:
- Every commander (anyone with subordinates) reviews only its **direct** subordinates and gives them orders. A member only obeys its `superior` (or "player", or an ancestor in its chain, §4.5).
- An order to a commander is a **group order**: "your group works on X". The commander turns it into member orders at its next review. The player's band focus (§5.3) is the first group order and works exactly this way.
- `state.command.bands[factionId]` is really the group record of the band's head. With more levels it becomes `state.command.groups[commanderId] = { kind: "band" | "site" | "squad" | "work", focus, lastReview, tasks, avoid }`. Squads (V43) are groups whose orders are guard and follow; work groups are bound to one task kind.
- An order passed down gets `via: [ids above the giver]`, so the sheet can say "From: Reeve Dorar (for Chief Zorette)".
- Succession runs inside each group with the same rule; a vacancy is filled from the level below.
Build only one level now. Nothing in §2–§5 may assume there is only one.

### 1.5 A band without a leader
No reviews, no new orders. Standing orders run out. Members live on their own loop (V17). The sheet says "No leader". A leader appears again only through succession (for example a teen who comes of age at the next review, since teens are candidates when no adult is left).

---

## 2. What an order is

### 2.1 The record: `unit.data.order`
Saved with the unit. `null` when the member has no order.

| Field | Type | Meaning |
|---|---|---|
| `id` | number | `state.command.nextOrderId++` |
| `kind` | string | one of the 12 task kinds (§2.2). A player's direct order keeps the job type instead (`move`, `drink`, `chop`…) |
| `by` | unit id or `"player"` | who gave it |
| `byName`, `byTitle` | string, string or null | kept for the sheet after the giver is gone |
| `via` | [unit id] | later ranks only (§1.4); `[]` now |
| `faction` | faction id | the member's faction when it was given |
| `at` | number | game minute it was given (§2.4) |
| `until` | number | game minute it expires |
| `anchor` | `{ area, x, y }` | where the work is: the plan step's cell, the designation's cell, the prey's cell, the post, or the camp centre |
| `target` | `{ area, x, y }` or null | the current target cell (the first job's target, then updated per job) |
| `thing` | string or null | what it is about, for the line and the sheet: an object name ("oak"), an item ("berries"), a step label ("hearth"), a prey species ("deer") |
| `unitId` | unit id or null | hunt: the prey; follow: the unit to follow |
| `item` | item type id or null | the item the order is for (gather, chop, quarry, haul) |
| `step` | plan step id or null | the society plan step it serves (jobs get `params.plan`) |
| `recipeId` | string or null | craft and cook |
| `jobId` | job id or null | a designation this order hands out (§5.3) |
| `radius` | number | work area around `anchor` (catalog `workRadius`, 12) |
| `count` | number | jobs to finish; 0 = until the step is done or nothing is left in the work area |
| `done`, `misses`, `fails` | numbers | jobs finished under it; decisions in a row that found nothing to do; its jobs that failed |
| `state` | `"given"` / `"working"` / `"paused"` | for the sheet |
| `pause` | null / `"thirst"` / `"hunger"` / `"sleep"` / `"night"` / `"danger"` | why it's paused |
| `preempt` | bool | cancel the member's own-choice job at once (guard for danger, player channel) instead of waiting for it to end |

When an order ends, `data.order` becomes `null` and `data.lastOrder = { kind, thing, by, byName, end, reason, at, endedAt }` with `end` one of `done`, `expired`, `impossible`, `replaced`, `cancelled`.

### 2.2 Task kinds and how each maps onto jobs and the plan
"Maker" is how the member turns the order into its next job (§4.2). All finders are UF_Colonists' own, limited to `radius` around `anchor` (§6.2).

| Kind | Jobs it makes | Plan link | Skill (V63) | Anchor / target | Ends `done` when | Default minutes / count |
|---|---|---|---|---|---|---|
| `gather` | `gather`, `pick` on objects whose action yields `item` (food plants when `item` is null) | stock step (food); craft or build inputs (fiber, straw) | foraging | the camp, or the object | `count` jobs done, or the step met | 120 / 4 |
| `chop` | `chop` on trees (objects whose `chop` yields logs) | build and craft inputs that need logs (walls, campfire, workbench, firewood) | woodcutting | the tree | `count` trees | 120 / 2 |
| `hunt` | `hunt { unitId }`; if that prey is gone, the nearest prey in the work area | stock step with `hunt: true`; inputs from prey (hide) | hunting | the prey's cell | one kill | 180 / 1 |
| `fish` | `fish` (UF_Interact's type) at a water cell with a standable neighbour | stock step (food) | fishing | the water cell | `count` casts | 120 / 3 |
| `quarry` | `quarry`, `mine`, and `pick` of loose stones, on objects yielding `item` (stone, ore) | build and craft inputs of stone or ore | mining | the boulder or outcrop | `count` jobs | 120 / 2 |
| `haul` | `haul`, `fetch` | build steps (materials to the cell), the stock step (food to the larder), loose items to a stockpile | hauling | the item's cell | nothing left to haul in the work area | 60 / 0 |
| `build` | whatever `stepSpec(u, step)` returns for a build step: `build`, or the `haul` / `chop` / `quarry` / `gather` its materials need; or the designation job itself | build steps; UF_Society's house jobs | building | the step's first unbuilt cell | the step is done (or the designation is done) | 240 / 0 |
| `cook` | the cooking `craft` at the hearth (`cookSpec`), after `fetch` of raw food | the stock step (raw food on hand) | cooking | the hearth | no raw food left in reach | 60 / 0 |
| `craft` | whatever `stepSpec(u, step)` returns for a craft step (`fetch`, `gather`, `chop`, `hunt` of inputs, then `craft`, then `equip`) | craft steps (knives, axe, clothes, cloaks…) | the recipe's skill | the workplace, or the member | the step is met | 120 / 0 |
| `guard` | `guard` (new job type, §6.4): stand at the post and keep watch | none now (the plan's later `arm` step) | none (no xp) | a post between the camp and the threat | time up, or the threat gone | 60 / 0 |
| `rest` | `sleep` at the member's sleep spot (bed, hearth, camp) | none | none | the bed or hearth | woken | until the wake hour / 1 |
| `follow` | `follow { unitId }` (new job type, §6.4): stay beside that unit | none | none | the unit | time up | 30 / 0 |

Survival jobs (`drink`, `eat`, `sleep` for need) and `talk`, `mate` are never ordered.

**Who can get which kind:** babies and children get no orders. Teens: gather, haul, fish, cook, rest, follow. Elders: all but hunt, quarry, guard. Adults: all. (Catalog `command.stages`.)

### 2.3 How an order ends
| End | When |
|---|---|
| `done` | the goal in §2.2 is met (checked on `jobs:done` of a job with `params.order`) |
| `expired` | game minute ≥ `until`; or a work order when the member's work hours end (the leader's orders only; §3.2 gives `rest` at bedtime) |
| `impossible` | the maker found nothing to do `missesToEnd` (2) decisions in a row with `done` = 0, or `failsToEnd` (2) of its jobs failed for a reason that isn't a pause. The reason is kept ("nothing left to chop there", "can't reach it", "the prey got away"). If `done` ≥ 1 when the misses run out, the end is `done` instead. |
| `replaced` | a new order from a higher giver: the player over the leader, or the leader's forced order (guard for danger) over its own earlier one |
| `cancelled` | the giver is no longer valid (§4.5), or the member left the band |

A job cancelled because of survival or danger ("too thirsty to go on", "too hungry to go on", "danger nearby") pauses the order; it does not count as a fail.

After `impossible` the band record notes it: `avoid[memberId][kind] = now + avoidMinutes` (30). The leader won't give that member that kind until then. `command:orderEnded(order, member, end)` is emitted for every end.

### 2.4 Game time
`UF.Time.ticks()` restarts at 0 on every boot, so it can't stamp saved orders. Orders use the **game minute** from the saved clock:
`now() = (((year × 12 + monthIndex) × 28 + (day − 1)) × 24 + hour) × 60 + minute` from `$ufTime`.
If the clock moves backwards (tests call `$ufTime.setTime`), an order with `at > now` gets `at = now` and `until` shifted by the same amount. The display is `hh:mm` of `now % 1440`.

### 2.5 Band state: `UF.World.state.command`
Its own key. UF_Command never writes into `state.societies` (the bands run owns it).
```
state.command = {
  version: 1,
  nextOrderId: 1,
  bands: {
    [factionId]: {
      leaderId,                  // cached; checked at every review
      slot,                      // 0..reviewEvery-1: the minute of the cycle this band reviews on
      lastReview,                // game minute
      focus: null | { kind, at, until },   // the player's group order (player's band only)
      standDown: false,          // player's band only: the leader gives no orders
      tasks: [ { kind, weight, slots, anchor, thing, item, step, recipeId, jobId } ],  // last review, ≤ 16
      avoid: { [memberId]: { [kind]: untilMinute } },
      counts: { given, done, expired, impossible, replaced, cancelled, successions }
    }
  }
}
```
Created lazily at the first review after societies exist, so load order against `world:created` doesn't matter. About 1 KB per band.

---

## 3. How the leader decides

### 3.1 Cadence
- Each band reviews once every `reviewEvery` (10) game minutes: when `now() % reviewEvery === slot`, on `time:minute`. `slot = (factionIndex × 3) % reviewEvery`, so 7 factions get 7 different minutes and at most one review runs per game minute.
- A band that missed its minute (the clock was set) reviews when `now() − lastReview ≥ reviewEvery + 5`.
- **Forced reviews** (queued, still at most one per game minute, bands in faction-list order): succession; the player sets a focus or stands down; a player designation (`interact:designated`); a threat enters the camp's guard radius (the danger sweep, §4.3).
- 10 game minutes is 10 s at ×1, 1.25 s at ×8.

### 3.2 Reading the band
Everything read here already exists in state. Weights and numbers are catalog `command.weights` (defaults below).

| Signal | Task | Weight | Slots |
|---|---|---|---|
| Threats within `guardRadius` (16) of the camp centre: a unit of a dangerous wildlife species (`UF.Wildlife` `dangerous`: predator, monster), or a person of a faction whose `UF.Factions.tierBetween` with this one is hostile or at war | `guard`, post = the free cell 3 cells from the camp centre toward the threat | 120 | min(threats, ceil(free adults / 3)); `preempt: true` |
| The player's open designations (`UF.Jobs.open()` with `params.faction` = the band's faction, made by UF_Interact) | the designation's kind (chop→chop, gather/pick→gather, quarry/mine/dig→quarry, build→build, haul→haul, hunt→hunt, fish→fish; other types are left for members to take themselves), `jobId` | 100 | 1 each, at most 8 |
| The player's band focus (§5.3) | the focus kind | 80 | every free member except one kept on food when food is below one per head |
| Start of the band's sleep window (`colony.sleepHours`, or the daily run's schedule) | `rest` | 70 | everyone free |
| A member with sleep ≥ 60 or mood Stressed or worse, in work hours | `rest`, that member | 65 | 1 each |
| Other open jobs of the faction (UF_Society's house builds: `params.society`) | `build` / `haul`, `jobId` | 60 | 1 each, at most 4 |
| Raw food at the camp ≥ 2 and a fire (the society's hearth) | `cook` | 55 | 1 |
| Plan step i of the first 3 undone steps (`UF.Colonists.planStatus(factionId)`): build | `build`, `step` | (50 − 5i) × the culture's priority for build | walls: min(unbuilt cells, 2); one-cell pieces: 1 |
| Plan step i: craft | `craft` (or `cook` for a cooking recipe), `step` | (50 − 5i) × the culture's priority for craft | `each` steps: one per member who lacks it, given to that member; `count` steps: 1 |
| Plan step i: build materials missing (the step's `build.items` not on its cells and none on the ground within 20 of the camp) | `chop` (logs), `quarry` (stone, ore), `gather` (fiber, straw) with `item` | (45 − 5i) × the culture's priority for that kind | 1 per missing item type |
| Food short: stock S (food in the larder, in the band's packs, and on the ground within the camp radius + 2) below T = members × `foodPerHead` (2) | `food` (resolved per member, below) | 40 + 30 × (T − S) / T | ceil(free × (T − S) / (2T)) |
| Loose items within the camp radius + 8, not on a stockpile, 4 stacks or more, and a stockpile exists | `haul` | 35 | 1 |
| Nothing else | no order: the member keeps its own choice (V17) | | |

In the band's leisure and sleep hours only `guard` and `rest` are given. Anchors within `dangerRadius` (6) of a threat are skipped.

**Food per member.** A `food` slot becomes, for the member it goes to: `hunt` if prey stands within `colony.huntRadius` of the camp and the member's hunting level ≥ their foraging level (or the culture's hunt priority > 1); else `fish` if the `fish` job type exists, water is within 30 of the camp and fishing ≥ foraging; else `gather`.

### 3.3 Handing out orders
1. **Free members:** in the band, not the leader, stage allowed for at least one task, no live order, `UF.Colonists.survival(u)` is null, not asleep, not running a player's direct order (`params.ordered`). Members busy with their own choice count as free: the order starts when their current job ends, unless the task is `preempt`.
2. **Score** every (task, free member) pair the stage rules allow and `avoid` doesn't block:
   `score = weight × (1 + (level − 1) / 50) × continuity / (1 + distance / 30)`
   - `level` = `UF.Skills.level(member, skill of the kind)` (1–99; 1 when UF_Skills is absent or the kind has no skill), so a level-99 woodcutter scores about 3× a beginner for `chop` (V63).
   - `continuity` = 1.25 when the member's `lastOrder` was the same kind and ended `done`, else 1 (fewer switches).
   - `distance` = Chebyshev cells from the member to the task's anchor.
3. **Greedy:** sort pairs by score (high first), then task index, then member id. Walk the list; give the pair when the task still has a slot and the member is still free. Stop at `maxOrdersPerReview` (8) orders or when no free member or slot is left.
4. **Give:** make the record (§2.1: `at = now`, `until = now + minutes`, `anchor`, `thing`, `count` from the catalog kind unless the task set one), emit `command:order`, then speak (§5.1). A `preempt` order cancels the member's own-choice job with the reason "called away" (never a need job).
5. Store the task list in `bands[fid].tasks` for the sheet, the checks and the next review.

Targets are **not** searched at review time. The member's maker finds them on its next turn (§4.2). That search replaces the plan search the member would have done anyway, so it adds no cost.

**Determinism.** The review reads only state, the catalog and the seed. Ties break by task index and unit id. The only varied choice, which line template to speak, is `hash32(seed, 0xc0de, order.id) % variants`. Nothing uses `Math.random`, `Date.now` or `Graphics.frameCount`.

### 3.4 Cost budget (7 factions × 8 people = 56 members)
- **Reviews:** 7 per 10 game minutes, never two in one game minute. Each one costs ≤ 0.5 ms: one `planStatus(factionId)` (the bands run caches it for 30 ticks), one pass over the faction's open jobs, the threat list (shared, §4.3), ≤ 16 tasks × 7 members of scoring. At ×8 that is about 0.09 reviews per frame, so about 0.05 ms per frame on average.
- **Member side:** without an order, one field check. With one, the maker is a single search within `radius` (12) of the anchor (≤ 625 cells) instead of the plan's 60-cell search.
- **Danger sweep:** every 30 ticks, one pass over the area's units to list threats, then per band member a check against that short list.
- **Budget:** UF_Command's own work (performance.now around its update alias, its event handlers, reviews and the decider) ≤ 0.1 ms per frame on average at ×8 over 60 s, and no single map update above 2 ms. The bands' `UF.Colonists.perf().avgMs` stays within its own 1 ms budget with UF_Command loaded.

---

## 4. How members obey

### 4.1 Order of precedence in a member's turn
1. **Danger** (UF_Command's decider in slot `"first"`, §4.3).
2. **Survival** (UF_Colonists): thirst, hunger (or a meal hour with food stored), exhaustion (sleep ≥ threshold), night (in the sleep window with sleep > 40). The urgent pre-emption stays as it is (a running non-need job is cancelled at threshold + 25).
3. **A player's direct order.** This is a running job made by `UF.Colonists.order`, so the loop doesn't decide while it runs. The urgent pre-emption still applies to it, as today.
4. **The leader's order** (UF_Command's decider in slot `"afterSurvival"`, §4.2).
5. **Own wants and own choice:** social, nature, walk home, open designations, the plan, idle. The lazy roll only applies here; an order is not skipped for laziness.

Social and nature needs wait behind an order. The leader gives work orders only in work hours, and the evening leisure hours meet those needs (the daily run's schedule).

### 4.2 The member's turn with an order
```
orderDecider(u):                       // slot "afterSurvival", runs inside withSociety(societyOf(u))
  o = u.data.order;  if (!o) return null
  if (!validGiver(u, o))                          { end(u, "cancelled", "not my leader"); return null }
  if (now() >= o.until)                           { end(u, "expired"); return null }
  if (o.by !== "player" && o.kind !== "rest" && o.kind !== "guard" && !UF.Colonists.workHours(u))
                                                  { end(u, "expired", "the day's work is done"); return null }
  spec = MAKER[o.kind](u, o)                      // §2.2; null = nothing to do in the work area
  if (!spec) { o.misses++; if (o.misses >= missesToEnd) end(u, o.done ? "done" : "impossible", reasonFor(o)); return null }
  spec.params = Object.assign({}, spec.params, { order: o.id, faction: u.data.faction })
  if (o.step) spec.params.plan = o.step
  job = UF.Colonists.give(u, spec)                // claims and the failed-target memory apply as for any job
  if (!job) { o.misses++; ...same as above...; return null }
  o.misses = 0; o.state = "working"; o.pause = null; o.target = job.target || o.target
  return job
```
A designation order's maker is different: if the designation job is still `open`, `UF.Jobs.assign(o.jobId, u.id)`; if it is `done`, end `done`; otherwise end `impossible`.

`jobs:done` with `params.order`: `o.done++`, then check the goal (§2.2). `jobs:failed` with `params.order`: a pause reason sets `o.state = "paused"` and `o.pause`; any other reason is `o.fails++`.

When a survival job starts while an order stands, UF_Command sets `o.state = "paused"` and `o.pause` from `UF.Colonists.survival(u)` (read at the member's next scan). The order picks up again at the next decision after the need is met.

### 4.3 Danger
- **Threats** are listed every 30 ticks, once per area: units of a dangerous wildlife species that are alive, and people of factions at hostile or war tier with the band (`UF.Factions.tierBetween`).
- **A member is in danger** when a threat is within `dangerRadius` (6) cells, unless the member is on a `guard` order or its current job hunts that very unit.
- **In danger:** a running order job is cancelled ("danger nearby"), the order pauses with `pause: "danger"`, and the member walks back to a free cell beside its hearth (a `move` job with `params.retreat`, made by the slot `"first"` decider). When no threat is within range any more, the order resumes at the next decision.
- **At the camp:** a threat within `guardRadius` of the camp forces a review, which hands out `guard` orders (§3.2).
- Fighting is UF_Combat's. A guard stands its post and keeps watch; whether it strikes depends on UF_Combat's AI (see §8).

### 4.4 Finished, impossible, expired
See §2.3. After any end, the member takes its own choice at once (its next decision comes within one scan), and the leader can give a new order at its next review. The leader is told through `bands[fid].avoid` and the counts; nothing is spoken for an ending.

### 4.5 Only one's own faction
- A member obeys an order only when `validGiver` holds: the order's `faction` equals the member's faction, and `by` is the member's current `superior`, or an ancestor in its chain (later ranks), or `"player"` with the member in the player's faction, or a former leader of the same band whose order is still running (orders outlive a dead leader, §1.3).
- `UF.Command.give(member, spec, { by })` refuses (returns null) when `by` is a unit of another faction, when `by` is not the member's superior or an ancestor, or when `by` is `"player"` and the member isn't the player's.
- The review only reads `UF.Colonists.members(factionId)` of its own faction and only designations with its own `params.faction`.
- Every job an order makes carries `params.faction` = the member's faction, so UF_Jobs' faction rule (from the bands run) also holds.
- The "Band orders" menu (§5.3) is offered only on the player's own leader.

---

## 5. What the player sees

### 5.1 The leader's spoken lines (V62)
- `UF.Speech.say(leader, text, { kind: "order", queue: true })`. Plain text over the leader's head in the "order" colour of the speech catalog. UF_Speech decides whether it shows (on screen, zoom); UF_Command records the line either way in a session log (`UF.Command.lines()`).
- **One review makes at most 3 lines.** Orders are grouped by kind and thing:
  - one member: the kind's line with `{name}`;
  - two: "{a} and {b}, {verb}.";
  - three or more: "You {n}, {verb}." (n as a word: three … eight);
  - every free member got the same kind (a focus, bedtime): "Everyone, {verb}!".
- Lines stay at most 40 characters (UF_Speech wraps at 22 per row). If the version with `{thing}` is longer, the version without it is used.
- Templates (catalog `command.lines`, our own wording, plain and a little old-fashioned to fit V65, no names from other games; the variant is picked by the order id):

| Kind | Lines | Group verb |
|---|---|---|
| gather | "{name}, gather {thing}." · "{name}, go and forage." | gather {thing} |
| chop | "{name}, cut us some wood." · "{name}, fell that {thing}." | cut wood |
| hunt | "{name}, hunt the {thing}." · "{name}, bring us meat." | go hunting |
| fish | "{name}, go and fish." · "{name}, see what the water gives." | fish |
| quarry | "{name}, break us some stone." · "{name}, work that {thing}." | break stone |
| haul | "{name}, carry the {thing} in." · "{name}, fetch and carry." | fetch and carry |
| build | "{name}, raise the {thing}." · "{name}, work on the {thing}." | build the {thing} |
| cook | "{name}, see to the fire." · "{name}, cook for us." | cook |
| craft | "{name}, make a {thing}." · "{name}, set to your crafting." | make {thing} |
| guard | "{name}, keep watch." · "{name}, guard the camp." | keep watch |
| rest | "{name}, rest now." · "Enough, {name}. Rest." | rest (band line: "Enough for today. Rest.") |
| follow | "{name}, follow me." · "{name}, with me." | follow me |
| (succession) | "I will lead us now." (kind "remark") | |

`{name}` is the member's name. `{thing}` is the order's `thing` in lower case. Names come from the generators; nothing else is invented. The checks scan every line for the banned words of AGENTS.md.

### 5.2 The sheet (UF_Sheet)
UF_Sheet builds its model inside its own closure, so UF_Command can't wrap it. UF_Sheet gains one small hook (§6.3): `UF.Sheet.addUnitLines(fn)`, where `fn(unit)` returns text lines that the panel draws in its existing "state lines" section (and folds into its redraw signature). UF_Command's lines:

| Who | Lines |
|---|---|
| A member with an order | `Order: Cut wood (1 of 2 done)` · `From: Chief Zorette at 14:20, until 16:20` |
| … paused | `Order: Cut wood · paused: thirsty` (hungry, tired, night, danger) |
| … from the player | `Order: Walk there · from you` |
| A member without one | `Order: none (own choice)` · `Last: Cut wood, done` when there is a `lastOrder` |
| The leader | `Leads: 7 of The Ostwyn League` · `Band orders: Quarry stone (from you, until 18:00)`, `Band orders: as the leader sees fit`, or `Band orders: none (stood down)` |
| A band without a leader | `No leader` |

The same lines show for strangers (you can hear their leader too).

### 5.3 The player's orders enter at the top
There are three ways in. They combine in one order of precedence: **the player's direct order > the player's orders to the leader (designations, band focus) > the leader's own reading of the band > the member's own choice.** Danger and survival stay above all of them, as in §4.1.

1. **Designating work (right-click a cell, UF_Interact).** Designations are open jobs with the player's `params.faction`. They are the player's orders to the leader: the next review (forced within one game minute) hands each one to the best-suited free member as an order with `jobId` (weight 100, §3.2), and the leader says so ("Wenna, fell that oak."). A member with no order still takes designations on its own, as today. Nothing about designating changes for the player.
2. **Commanding the leader.** Right-click the player's leader: UF_Interact's menu gains **"Band orders…"** (only on the player's own leader), a submenu with Cut wood, Gather food, Hunt, Fish, Quarry stone, Fetch and carry, Build (the plan), Guard the camp, Rest, Follow me, **As you see fit** (clears the focus) and **Stand down** (the leader gives no orders until another choice; `standDown`). A focus lasts `focusMinutes` (240) and makes a forced review. The leader turns it into member orders (weight 80) and speaks the band line ("Everyone, break stone!"). The focus never takes the last food gatherer while food is below one per head. Stand down gives the player DF-style direct control: members live on their own loop and take designations themselves.
3. **A direct order to one colonist** (select a colonist, click the ground; "Drink here", "Eat" and other personal jobs, all through `UF.Colonists.order`). UF_Command wraps `UF.Colonists.order` and records `data.order = { by: "player", kind: <job type>, count: 1, … }`, ending with that job. The leader never gives that member a new order while it runs, and a leader's order the member had is `replaced`. As today, the job starts at once and only the urgent pre-emption interrupts it.

The player's orders only ever reach the player's faction (`UF.Colonists.order` already refuses other factions' people; the "Band orders…" option only appears on the player's leader).

---

## 6. Hooks and files

### 6.1 New files
- `game/js/plugins/UF_Command.js`: the plugin (reviews, orders, succession, danger, lines, the menu wrap, the sheet lines, the two job types, the `command` suite).
- `docs/systems/UF_Command.md`: the system doc (WORLD_ARCHITECTURE §8 template).
- Catalog key `command` in `game/data/UF_WorldCatalog.json` (a layout-preserving node script that re-reads the file right before writing, changes only `command`, and asserts every other top-level key is unchanged):
```
"command": {
  "about": "...",
  "reviewEvery": 10, "maxOrdersPerReview": 8, "focusMinutes": 240,
  "workRadius": 12, "dangerRadius": 6, "guardRadius": 16, "foodPerHead": 2,
  "missesToEnd": 2, "failsToEnd": 2, "avoidMinutes": 30, "maxLinesPerReview": 3, "maxLineChars": 40,
  "stages": { "teen": ["gather","haul","fish","cook","rest","follow"],
              "elder": ["gather","chop","fish","haul","build","cook","craft","rest","follow"] },
  "weights": { "guard": 120, "designation": 100, "focus": 80, "rest": 70, "tired": 65, "societyJob": 60,
               "cook": 55, "plan": 50, "planStep": 5, "material": 45, "foodBase": 40, "foodShort": 30, "haul": 35 },
  "kinds": { "gather": { "skill": "foraging", "minutes": 120, "count": 4 }, "chop": { "skill": "woodcutting", "minutes": 120, "count": 2 },
             "hunt": { "skill": "hunting", "minutes": 180, "count": 1 }, "fish": { "skill": "fishing", "minutes": 120, "count": 3 },
             "quarry": { "skill": "mining", "minutes": 120, "count": 2 }, "haul": { "skill": "hauling", "minutes": 60, "count": 0 },
             "build": { "skill": "building", "minutes": 240, "count": 0 }, "cook": { "skill": "cooking", "minutes": 60, "count": 0 },
             "craft": { "skill": "crafting", "minutes": 120, "count": 0 }, "guard": { "skill": null, "minutes": 60, "count": 0 },
             "rest": { "skill": null, "minutes": 600, "count": 1 }, "follow": { "skill": null, "minutes": 30, "count": 0 } },
  "lines": { "<kind>": ["...", "..."], "verbs": { "<kind>": "..." }, "two": "{a} and {b}, {verb}.", "many": "You {n}, {verb}.",
             "all": "Everyone, {verb}!", "restAll": "Enough for today. Rest.", "succeed": "I will lead us now." }
}
```

### 6.2 What the bands run must expose first
Checked against the bands run's working copy of UF_Colonists.js on 2026-09-19 (`%TEMP%\uf_snapshots\bands_r8`). It already has `members(fid)`, `allMembers()`, `society(fid)`, `societyOf(u)`, `isMember(u)`, `planStatus(fid)`, `site(fid)`, `culture(fid)`, `playerFactionId()`, `order(...)` limited to the player's colonists, `perf()`, and `params.faction` on jobs. Its `scan()` calls the private `decide(u)`, so wrapping the public `UF.Colonists.decide` would not reach the loop. UF_Command needs these on `UF.Colonists`, each running inside `withSociety(societyOf(u))`:

| Member | Returns | What it wraps |
|---|---|---|
| `addDecider(slot, fn)` | – | `decide(u)` becomes: freeing a trapped unit → deciders of slot `"first"` → survival (the thirst, hunger, sleep and night part of `needJob`) → deciders of slot `"afterSurvival"` → wants (the social and nature part of `needJob`) → `homeJob` → `designationJob` → plan (with the lazy roll) → `idleJob`. `fn(u)` returns a job or null. |
| `survival(u)` | `"thirst"` / `"hunger"` / `"sleep"` / `"night"` / null | the same thresholds and hours `needJob` uses |
| `workHours(u)` | bool | the daily run's schedule; without it, not in the sleep window and not 19:00–22:00 |
| `give(u, spec)` | job or null | the private `give` (claims, the failed-target memory, the ring gap) |
| `stepSpec(u, stepId)` | `{ type, target, params }` or null | `buildStepJob` / `craftStepJob` / `stockStepJob` for that step of u's society; makes no job |
| `find(u, what, opts)` | a spec or null | `what`: `"source"` (an object action yielding `opts.item`, optional `opts.actions`), `"food"` (a food plant), `"prey"` (optional `opts.yields`), `"water"` (a water cell with a standable neighbour, for `fish`), `"cook"` (`cookSpec`), `"sleep"` (the sleep spot of `sleepJob`), `"haul"` (a loose item and a stockpile that stores one of its tags; the destination through `UF.Interact.stockpileFor` when present). All take `opts.near` and `opts.radius`. |

Also needed (already in the bands run's brief): jobs carry `params.faction` and `UF.Jobs.take` honours it; `UF.Colonists.order` refuses anyone who isn't the player's colonist.

If the bands run lands without some of these, the UF_Command build adds them to UF_Colonists.js in one edit (thin wrappers around existing private functions, about 60 lines), after checking in docs/STATUS.md that no run holds the file. If one does, it asks the user first.

### 6.3 Small edits in other files (made by the UF_Command build)
- **UF_Sheet.js** (Claude Code's; no run holds it): `UF.Sheet.addUnitLines(fn)`. It keeps a provider list; `unitModel(u)` sets `m.stateLines` to the providers' lines (capped at `MAX_STATE_LINES`, each provider in try/catch) and adds them to `m.sig`. The layout and drawing of `stateLines` already exist. About 10 lines.
- **UF_Society.js** (only if registered): when `window.UF.Command` exists, skip its own leader bark for a new house (the leader's order lines replace it); keep its chronicle line. Its open build jobs are handed out by the leader as `build` orders (weight 60) with no change there.
- **UF_History.js** (optional): `addRuler(factionId, { unitId, name, title, from })`, which closes the open record and pushes the new one. Without it UF_Command writes `state.history.rulers` directly.
- **tools/register_world_plugins.js**: `UF_Command` in ORDER after UF_Sheet, before UF_Test. The RMMZ editor rule applies (AGENTS.md).

### 6.4 What UF_Command.js hooks
Core aliases (no replaced core methods):
- `Scene_Boot.prototype.start`: hook the events, define the job types, register the deciders, wrap `UF.Colonists.order` and UF_Interact, add the sheet provider, and register the `command` suite when `UF.Test.active`. Then call the original.
- `Game_Map.prototype.update`: the danger sweep every 30 ticks, the missed-review fallback, the forced-review queue, and the perf meter.

Runtime wraps (plugin objects, not core):
- `UF.Colonists.order`: after the original returns a job, record the player's order (§5.3).
- `UF.Interact.optionsFor`, `UF.Interact.open`, `UF.Interact.MenuWindow.prototype.setOptions`: add "Band orders…" on the player's leader's cell, the same three wraps UF_Sheet uses for "Inventory". Each is idempotent and only touches a top-level list.

Registered through APIs:
- `UF.Colonists.addDecider("first", dangerDecider)` and `UF.Colonists.addDecider("afterSurvival", orderDecider)`.
- `UF.Jobs.define("guard", …)`: `plan` = stand on or beside `target` (`UF.Jobs.standFor`); `work` = `params.minutes × 60` ticks; `replanEvery` 120 (face the nearest threat); `apply` does nothing; `describe` "Keeping watch".
- `UF.Jobs.define("follow", …)`: `plan` = the followed unit exists in the area (else fail "they are gone"), stand = a standable neighbour of it; `replanEvery` 30; `work` = `params.minutes × 60` ticks; `apply` does nothing; `describe` "Following <name>".
- `UF.Skills.mapJob("guard", null)`, `UF.Skills.mapJob("follow", null)`: no experience.
- `UF.Sheet.addUnitLines(commandLines)`.

Events listened: `time:minute` (review cadence), `time:hour` (expiry sweep of all orders), `jobs:done`, `jobs:failed`, `world:unitAdded` (new members join the tree), `world:unitRemoved`, `combat:kill`, `anim:death` (succession), `interact:designated` (forced review), `world:created` (clear session caches).
Events emitted: `command:review(factionId, { tasks, orders })`, `command:order(order, member, giver)`, `command:orderEnded(order, member, end)`, `command:succession(factionId, newLeader, old)`, `command:focus(factionId, focus)`.

### 6.5 API (`UF.Command`)
| Member | Description |
|---|---|
| `now()` | the game minute (§2.4) |
| `leaderOf(factionId)`, `bandOf(unit)` | the leader unit or null; the faction id of the unit's band or null |
| `orderOf(unit)` | `data.order` or null |
| `give(member, spec, { by })` | gives an order (spec: `kind`, `anchor?`, `unitId?`, `item?`, `step?`, `recipeId?`, `jobId?`, `count?`, `minutes?`, `thing?`, `preempt?`); null when refused (§4.5) |
| `end(member, how, reason?)` | ends the member's order |
| `review(factionId, { dry })` | runs a review now; `dry` returns `{ tasks, assignments }` without giving anything |
| `setFocus(kind or null)`, `focus()`, `standDown(on)` | the player's band only |
| `successorOf(factionId)` | who would succeed now (pure) |
| `succeed(factionId)` | runs the succession now; the new leader or null |
| `lines()`, `log()` | this session's spoken lines `{ minute, leaderId, text, orderIds, shown }` and orders given and ended (tests) |
| `threats(area)` | the current threat list |
| `perf()`, `resetPerf()`, `config()`, `KINDS` | cost meter, catalog settings with defaults, the 12 kinds |

### 6.6 Load order
`… UF_Jobs > UF_Colonists > UF_Wildlife > UF_Society > … > UF_Combat > UF_Skills > UF_Speech > … > UF_Interact > UF_Sheet > UF_Command > UF_Test`.

---

## 7. Checks (suite `command`)
Run on a snapshot (docs/systems/UF_Test.md): New Game, clock set to 08:00, ×8 where it says so. Each check must be seen failing once. The last column is how the builder provokes that failure (on a snapshot copy only).

| Check | FAILs when | Seen failing by |
|---|---|---|
| `one_leader_per_band` | a society without exactly one living leader (rank ≥ 1, superior null), `bands[fid].leaderId` differs from it, or another member's `superior` isn't that leader | setting one member's `superior` to null in the test |
| `leaders_give_orders` | within 40 s at ×8, a band's leader hasn't given orders to at least half of its free adults; or an order has a kind outside the 12, `by` other than the leader, another faction, `at > now`, `until ≤ at`, or no anchor | `reviewEvery` set to 100000 |
| `orders_follow_need` | on the player's band with every food item removed (larder, packs, ground within 30 of the camp) and a forced review: no food order (gather, hunt or fish); then with 12 food items in the larder and another forced review: no fewer food orders than before, or no non-food order | `foodShort` and `foodBase` weights set to 0 |
| `skills_pick_the_worker` | two free members at equal distance from one chop task, woodcutting 60 and 1 (`UF.Skills.setLevel`): the order doesn't go to the 60; levels swapped: it doesn't go to the other | the skill factor forced to 1 |
| `members_obey` | an order `{ kind: chop, anchor: an oak 6 cells away, count: 1 }` given to a member M busy with its own plan job: within 5 s at ×8 M's job isn't a `chop` with `params.order` = the order id; the oak isn't a stump afterwards; the order didn't end `done`; or, over 30 s under a count-3 order, fewer than 80% of M's non-survival jobs carried `params.order` | the decider not registered |
| `survival_first` | M on a count-3 chop order with thirst set to 90: no `drink` job within 8 s, or the order is gone instead of `paused: thirst`; after drinking, no job with `params.order` within 8 s; the same for hunger 90 (a food job) and sleep 90 (a `sleep` job) | the order decider registered in slot `"first"` |
| `danger_first` | a test wolf placed 4 cells from M on an order: within 3 s the order job isn't cancelled or the order isn't `paused: danger`; M isn't at least 3 cells farther from the wolf within 10 s; after the wolf is removed, no job with `params.order` within 8 s | `dangerRadius` set to 0 |
| `impossible_and_finished` | a chop order in a work area whose only tree is removed: it doesn't end `impossible` with a reason within 6 s, M's next job still carries `params.order`, or `avoid[M].chop` isn't set; a gather order with count 2 on two berry bushes doesn't end `done` after exactly 2 gathers | `missesToEnd` set to 1000 |
| `expiry` | a guard order with `until = now + 5` isn't `expired` 6 game minutes later; with the clock set to the start of the sleep window, a running work order doesn't end `expired` or no `rest` orders follow at the next review | the expiry test removed from the decider |
| `succession` | in a non-player band with ages set so that the eldest adult isn't the lowest id, the leader removed with `data.dead = true`: within 2 game minutes the new leader isn't the one the rule in §1.3 picks (computed in the check); its rank, title or superior differ from the old leader's; a member names someone else as superior; `history.rulers[fid]` lacks the closed and the new record; there isn't exactly one `succession` chronicle event naming both; or the new leader gives no order at its next review. Then the same on the player's band | successor = the lowest unit id |
| `no_cross_faction` | over the suite, an order (session log) whose giver's faction differs from the member's (other than `"player"` on the player's own); a job with `params.order` whose `params.faction` isn't its unit's; `UF.Command.give(member of B, spec, { by: leader of A })` isn't null; `give(member of B, spec, { by: "player" })` isn't null; "Band orders…" appears on another faction's leader | the faction test in `give` removed |
| `player_orders_at_top` | (a) a player designation (chop, `UF.Interact.designate`) isn't handed by the player's leader to a player member as an order with that `jobId` within 2 game minutes; (b) after `UF.Colonists.order(M, move)`, `M.data.order.by` isn't `"player"`, or the leader gives M an order while that job runs (3 reviews); (c) "Band orders…" → "Quarry stone" on the leader (`UF.Interact.open` + `choose`): the next review gives quarry orders to fewer than half the free members; (d) "Stand down": any order in the next 2 reviews | `focus` weight set to 0 (fails (c)) |
| `spoken` | UF_Speech is missing; with the player's leader on screen, a review that gave orders made no `say` of kind `"order"` (UF.Speech.lines(leader) empty within 2 frames); a line doesn't name the member(s) or say "Everyone"/"You n"; is longer than 40 characters; matches no catalog template; holds a banned word; or a review made more than 3 lines | `say` called with kind `"remark"` |
| `sheet_shows_order` | `UF.Sheet.open(M)` on an ordered member: its model's `stateLines` lack `Order: <kind label>` or `From: <leader name>`; on a member with no order they lack `Order: none`; on the leader they lack `Leads:` | the sheet provider not registered |
| `deterministic` | `review(fid, { dry: true })` twice on the live state, and once on a JsonEx copy, give different tasks or assignments; the chosen line variant differs for the same seed and order id; UF_Command.js contains `Math.random`, `Date.now` or `Graphics.frameCount` (`performance.now` only inside the perf meter) | a `Math.random()` tie-break |
| `saved` | a JsonEx round-trip of `UF.World.state` changes `state.command` or any `data.order`; after loading that copy through `DataManager.extractSaveContents`, a member with an order doesn't start a job with `params.order` within 5 s | orders kept in a plugin Map instead of `unit.data` |
| `perf` | 60 s at ×8 with the New Game bands (7 × 8 when the seed gives 7 factions; the detail says how many): UF_Command averages more than 0.1 ms per frame, one map update takes more than 2 ms, a game minute has more than one review, or `UF.Colonists.perf().avgMs` exceeds 1 ms | `reviewEvery` 1 with every band on slot 0 |
| `no_errors` | an uncaught error during the suite | a thrown error in a test decider |

**Screenshots** (the builder opens and describes each): the player's camp at zoom 1 with the leader's order line over its head and the named member walking to the work; the sheet open on that member showing `Order:` and `From:`; another band's camp at zoom ⅔ with its leader speaking.

Also run: `colonists`, `jobs`, `society` (if registered), `sheet`, `speech`, `look`, `smoke`, on the same snapshot. The existing checks must still pass.

---

## 8. Not in this build
- More than one level of command (§1.4 describes how it grows).
- Labors (V43) and the faction menu (V49) as a filter on who may get which kind.
- Disobedience from personality or mood. Every member obeys, subject to §4.1.
- The leader walking over to far members, or needing to be within earshot. Orders reach the whole band; the line shows over the leader.
- Guards fighting. A guard stands and keeps watch; striking is UF_Combat's AI.
- Night watches, patrols, and squads.
- Splits (V42): who leads a group that leaves.
- The colonist card (UF_ColonyOverseer) and the look tooltip showing the order. The sheet shows it in this build.
- Orders across areas. There is one surface area today.

---

## 9. Open questions for the user
1. **Should your own band's leader give your colonists orders by default?** Proposed: yes, as V52 says ("The player's faction keeps its ranks too"), with **Stand down** in the leader's "Band orders…" menu for direct control. The alternative is off by default for your band, on for everyone else.
2. **Who succeeds a dead leader?** Proposed: the eldest adult, then the most skilled, then the lowest id. Alternatives: the most skilled first; the leader's partner; or, for your band only, you choose.
3. **What does a member do in danger?** Proposed: the minimal rule in §4.3. Any band member within 6 cells of a predator, monster or enemy walks back to its hearth, and its order waits. The alternative is that orders only pause and the reaction to danger waits for the combat work.
