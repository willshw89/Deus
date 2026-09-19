# WORK_TIMING: every action in world beats, with its own difficulty (VISION V85)

Written 2026-09-19 by Claude Code. **Design only:** no code, catalog or art was changed for this file, and nothing in it has run in the game. The user, 2026-09-19 13:40: "It should also take a different amount of world beats to do different shit. Cooking a smores isnt the same time/difficulty as chopping down a tree or mining ore" (VISION V85).

**Binding decisions it follows:** V85, read with V46 (the world moves on a beat), V48 (every unit follows or makes a decision every beat, and that decision is visible), V50 (budgets), V62 (no status text over heads), V63 (skills 1–99, higher levels work faster and fail less), V64 (combat keeps its own tick), V66 (gathering success rises with level; cooking can burn), V74 (minerals do not come back), V80 (five levels) and V84 (building is a faction level; personal levels unlock work).

**Not decided here.** CRAFTING.md's P1–P21 are proposals, not decisions. Its numbers are used below only as tuning data, and each use is marked. Required levels belong to the progression topic (V84, `skills.unlocks`, being built in parallel by another run on 2026-09-19). This file only reads them. The choices the user makes are W1–W6 in §13.

---

## 0. Summary
- **One unit:** the world beat, 60 map updates. That is one real second at ×1 and one game minute (§3). Work advances only on beat boundaries. Combat keeps its own 36-update tick (V64).
- **Two kinds of action:**
  - **Progress actions** (make, cook, build, carry, eat, sleep) take a fixed number of beats. Skill level, tools and, for construction, the faction's Building level shorten that number.
  - **Attempt actions** (chop, mine, quarry, gather, fish, hunt) repeat a swing every few beats. Each swing lands with a chance that rises with level, and the job ends after enough landed swings. Tools speed the swings. The tool's hardness against the resource's hardness moves the chance.
- **Failure has a cost:**
  - a missed swing costs only time;
  - a low-level cook can burn the meal (the input is used and burnt food is left);
  - a low-level knapper or smelter can waste material.
  - No experience is paid for a failure.
- **Every existing value is converted** (§6). Today some entries are in map updates and some are meant as beats, and the engine counts both as map updates. So smelting an iron bar (10) is over in 0.17 s, while roasting meat (90) takes 1.5 s. After conversion, roasting takes 3 beats. Felling an oak takes about 25 beats bare-handed at level 1, or 8 with a stone axe. Mining ironstone takes about 80 bare-handed, or 22 with a stone pick.
- **The player sees it** in the look tooltip ("Chopping an oak (1/3)") and on the colonist card and character sheet ("Chopping an oak: 1 of 3 strokes landed, 36% a stroke, about 17 beats left"). Nothing floats over the head (V62).

---

## 1. What we learned

### 1.1 Dwarf Fortress (mechanics only, in our words; nothing copied)
Sources read on 2026-09-19: the vanilla reaction and building raws in `data/vanilla` (read-only) and `release notes.txt`.
- **A job's length isn't in the data.** A reaction in the raws names one skill and one workshop, and lists what it uses and what it makes. How long the work takes is set by the engine, and the worker's skill shortens it.
- **Made things almost never fail.** Every product line in the vanilla reaction raws carries a certain chance: 163 of 163 lines were counted on 2026-09-19. In DF, skill mostly buys speed and quality.
- **Material matters for digging and felling.** The release notes of the December 2025 patches say that the pick's material against the wall's material changes digging speed, and that the axe's material against the tree's changes felling speed. Native metals were first too slow to mine and were then tuned.
- **Skill roughly doubles speed.** In the same notes, a top miner ends up about twice as fast as a novice, not more.
- **The body matters.** Lack of drink slows work (the notes moderate that effect), and a hauler's load changes the hauler's speed.

### 1.2 Old School RuneScape (mechanics only; no names or numbers taken)
- The world runs on a fixed tick, and every action takes a set number of ticks.
- **Gathering** (woodcutting, mining, fishing) repeats one attempt every few ticks. Each attempt succeeds with a chance that rises in a straight line with level, from a low value to a high value, capped at certainty. A better tool improves the rate. A success gives one resource and a fixed amount of experience, so a faster gatherer earns experience faster.
- **Cooking** can burn the food. The burn chance falls as the cook's level rises and stops at a stop level. A better cooking station lowers that stop level. A burnt item gives no experience.
- **Making** (smithing, fletching) takes fixed ticks per item and normally does not fail. Some smelting can fail at low levels.

### 1.3 What UF does today (read on 2026-09-19)
| Fact | Evidence |
|---|---|
| Work advances **once per map update**, not per beat: `progress += workRate × tool × skill rate`, and the job applies when `progress ≥ work` | `game/js/plugins/UF_Jobs.js` lines 875–876; `rateOf` line 783 |
| **`UF.Beat` does not exist.** WORLD_ARCHITECTURE §1.7 designs it (60 updates per beat), but no plugin defines it. UF_Fire and UF_Doors fall back to counting 60 updates themselves | grep of `game/js/plugins` for a `UF.Beat` definition: none; `UF_Fire.js` lines 110–113, `UF_Doors.js` lines 41–42 |
| Object actions and the first recipes are in map updates: oak chop 240 (4 s at ×1), ironstone mine 300, cook_meat 90, stone_knife 90, campfire build 120 | catalog `objects[].actions`, `recipes.list`, `objects[].build` |
| The combat-chain recipes and workshops are meant as beats: bar_iron 10, sword_long 12, furnace build 8, smithy 8. The engine counts them as map updates, so a furnace is built in 8 updates (0.13 s) and an iron bar is smelted in 10 updates (0.17 s), faster than roasting meat (90 updates, 1.5 s) | catalog `recipes.about` ("their work is in beats … while the older recipes above them are still in ticks until the beat integration rescales them"); UF_Jobs line 876 |
| Other job types hard-code map updates: drink and eat 60, talk 180, mate 120, sleep 600 or `params.frames` (UF_Colonists passes hours × 3600), hunt 60 by default, dismantle 60, dig 80, fish 200 with its own seeded 2-in-3 catch roll | `UF_Jobs.js` lines 54–56, 463, 528, 568; `UF_Colonists.js` line 949; `UF_Interact.js` lines 50–54, 182–183 |
| UF_Fire already converts: douse work = beats × 60 (fill 1, douse 3) | `UF_Fire.js` line 654, catalog `fire.douse` |
| UF_Floors' `FLOOR_WORK = 4` is meant as beats and is read as 4 map updates | `UF_Floors.js` lines 30, 242 |
| Skill speed: `UF.Skills.rate = 1 + 0.01 × (level − 1)` (1.98 at 99), applied per map update to every job type, gathering included | `UF_Skills.js` line 594; UF_Skills.md → Effects |
| Experience per job = `base + perWork × min(progress, 600)`. `perWork` is 0.1 for tick-valued skills and 1 for beat-valued ones. So building a furnace pays 5.8 building xp against 17 for a campfire | `UF_Skills.js` lines 516–522; UF_Skills.md → Known limits |
| Nothing fails: every craft makes its outputs, and every object action changes the object when its work is done | `UF_Jobs.js` lines 237–241, 393–406 |
| Combat has its own tick: 36 map updates (0.6 s at ×1) | `UF_Combat.js` lines 21, 63 |

---

## 2. The mechanic
Every action a unit does is either a **progress action** or an **attempt action**. Its numbers live in catalog data, not in code.

- **A progress action** has a base length in beats. Each beat of work adds the worker's rate to the job's progress: 1 for a level-1 worker with no tool, more with skill, tools and (for construction) the faction's Building level. When progress reaches the base length, the action finishes. Some progress actions roll once at the end. A low-level cook may burn the meal and a low-level knapper may shatter the stone, and that chance falls to nothing at a stop level.
- **An attempt action** repeats a swing: a stroke of the axe, a blow of the pick, a try at a plant, a cast of the line, a strike at prey. A swing takes a fixed number of beats. Tools make swings come faster. Each swing lands with a chance set by:
  - the worker's level (a straight line from a low value at the requirement level to a high value at 99);
  - the tool's hardness against the resource's hardness.

  The action finishes after enough landed swings. Bigger trees and tougher ores need more. A miss costs only the time.
- **Difficulty is data.** Each action, each resource and each recipe carries:
  - its beats;
  - its required level (the progression topic's data);
  - its chance pair for attempts;
  - its failure (none, burnt, or wasted).

  Skill level shortens progress actions and raises attempt chances. Tools speed both kinds. Materials set the hardness and the number of landed swings.
- **Experience** is paid once per finished action, from the action's nominal beats (the same for a novice and a master). It is never paid for a miss, a burnt meal or wasted material.

---

## 3. The unit: the world beat
- **Length:** 1 beat = 60 map updates. At ×1 that is 1 real second and 1 game minute (V46; WORLD_ARCHITECTURE §1.7; CRAFTING.md "Time units"). 1 game hour = 60 beats. The speed keys run more map updates per frame, so ×8 plays 8 beats per second. Pause stops the beat.
- **Source (one helper):** `UF.Jobs.beatNow()` returns `UF.Beat.count` when UF_TimeSpeed's beat exists. Until then it returns `floor(UF.Time.ticks() / work.beatFrames)`, with `work.beatFrames` = 60 in the catalog. Switching to `UF.Beat` is one line. `UF.Time.ticks()` restarts at boot, so each job's `lastBeat` is reset on load (the existing `extractSaveContents` alias already re-plans active jobs).
- **The grid:** work happens only when `beatNow()` has advanced since the job's `lastBeat`, at most one step per beat. A worker who arrives in mid-beat starts on the next boundary (a wait of under one beat). Between boundaries a working job does nothing, which V50 needs.
- **What is not in beats:**
  - **Combat** stays on its 36-update tick (V64: weapon speeds are in ticks). One beat is 1⅔ combat ticks, and the two clocks are independent.
  - **Walking and its timers** stay in map updates until UF_World moves units one cell per beat (V46, not built). That covers UF_Jobs' `REPLAN_TICKS` (30) and `STALL_TICKS` (300) and UF_Colonists' decision timers (`DECIDE_EVERY`, `AVOID_TICKS`, …). They pace walking and deciding, not work.
- **The one-unit rule:** every duration in job and recipe data is a whole number of beats, from 0 to `work.maxBeats` (30). The exception is sleep, which comes from its caller in hours × 60. The check `work.one_unit` enforces this (§11).

---

## 4. The two models, exactly

### 4.1 Progress actions
```
rate      = workRate × toolSpeed × levelSpeed × perkSpeed        (per beat)
levelSpeed = UF.Skills.rate(unit, jobType, job)  = 1 + 0.01 × (L − 1)       (V63; 1.98 at 99)
construction (build, dismantle, floor) instead: levelSpeed = f(B) × g(T)
     f(B) = 1 + work.build.factionSpeedPerLevel × (B − 1)     B = the faction's Building level (V84), 0.01 → 1.98 at 99
     g(T) = 1 + work.build.tradeSpeedPerLevel × (T − 1)       T = the builder's carpentry (object tag wood) or masonry (tag stone), 0.005 → 1.49 at 99; 1 otherwise
beats needed = ceil(work × work.scale / rate)
```
- `toolSpeed` is today's `UF.Jobs.toolMultiplier`, unchanged: the equipped tool's `tool[jobType]`, or ×1.5 when a craft's `tool` tag matches.
- `perkSpeed` is 1 until the progression topic gives an ability that speeds that skill (V84 "faster work").
- `work.scale` is a global tuning knob, 1 by default.
- **The end roll** (a recipe with `fail`), with `R` the requirement level and `stop` the level where failure ends:
  ```
  failChance(L) = fail.chance × max(0, fail.stop − L) / (fail.stop − R) × perkFail
  ```
  - A success gives the outputs and the experience.
  - A failure applies `fail.outcome` (§4.3) and pays no experience.
  - The roll is `mulberry32(hash32(seed, SALT_FAIL, unitId, jobId))()`.

### 4.2 Attempt actions
```
swing clock: each beat, clock += workRate × toolSpeed × perkSpeed; when clock ≥ attempt: one swing, clock −= attempt
chance(L) = clamp( pLevel(L) × hardF, work.chance.min, 1 )
   pLevel(L) = low + (high − low) × (L − R) / (99 − R)      (R = requirement level; R = 99 gives high)
   hardF     = clamp( 1 + work.hardness.step × (toolH − resH), work.hardness.min, work.hardness.max )   step 0.1, min 0.5, max 1.25
landed = roll < chance,  roll = mulberry32(hash32(seed, SALT_SWING, unitId, jobId, job.attempts))()
the action applies when landed hits = hits;  give up when attempts = ceil(work.chance.capFactor × hits / chance at the job's start)   (capFactor 3)
```
- **Why the level multiplies before the cap.** A high value above 1.00 means the chance reaches 1.00 before level 99. It also cushions a poor tool, because the hardness factor multiplies before the clamp. A woodcutter at level 99 with bare hands on an oak has 1.58 × 0.80 = 1.26 → 1.00.
- **Hardness** is on the same 0–10 scale as the catalog's `materials` (wood 2, stone 5, iron 7):
  - The tool's hardness is its item's `material` hardness (the stone axe is `stone`, 5; the iron axe `iron`, 7).
  - Bare hands count as `work.hardness.bareHands` (1).
  - The resource's hardness is a new `hardness` field on the action (§6.1).

  | Tool against resource hardness | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
  |---|---|---|---|---|---|---|---|---|
  | bare hands (1) | 1.10 | 1.00 | 0.90 | 0.80 | 0.70 | 0.60 | 0.50 | 0.50 |
  | stone tool (5) | 1.25 | 1.25 | 1.25 | 1.20 | 1.10 | 1.00 | 0.90 | 0.80 |
  | iron tool (7) | 1.25 | 1.25 | 1.25 | 1.25 | 1.25 | 1.20 | 1.10 | 1.00 |

  Hunting uses no hardness factor (1.00): hides and armour are combat's business (V64).
- **Level does not speed the swings** (W1, default). The level acts through the chance, as CRAFTING P9 A recommends. Expected time still falls with level: an oak felled bare-handed takes about 25 beats at level 1 and 9 at level 99, about the ×2–3 that DF's miners and V63's 1.98 describe. If W1 goes the other way, `levelSpeed` joins the swing clock.
- **Giving up.** A job that reaches its cap fails with reason "made no headway". The object is unchanged, and UF_Colonists' existing avoid timer keeps the worker off it for a while. With cap factor 3 the chance of giving up is small. It was computed, not measured:

  | Case | Chance of giving up |
  |---|---|
  | oak, bare hands, level 1 (cap 25 swings) | 0.16% |
  | ironstone, bare hands, level 1 (cap 60) | 0.10% |
  | troll (cap 140) | 0.005% |
  | a hopeless 1-hit action at the minimum chance, 0.05 (cap 60) | 4.6% |

- **Landed hits live on the job**, like today's `progress`. A job that is interrupted or re-assigned starts over. That is no worse than today, where `assign` resets progress to 0 (§14).

### 4.3 Failure outcomes
| Outcome | What happens | Used by (existing content) |
|---|---|---|
| `time` | A missed swing: nothing changes but the beats spent | every attempt action |
| `burnt` | The inputs are used. `fail.outputs` (1 `burnt_food`) is **dropped on the crafter's stand cell** so the failure is visible and never lands in the larder. The cook gets no experience. `job.result.outcome = "burnt"` | cook_meat, cook_fish |
| `wasted` | The inputs named in `fail.lose` are used, or every input with `"all"`. The other inputs stay in the inventory, nothing is made, and no experience is paid. `job.result.outcome = "wasted"` | stone_knife, stone_axe, stone_pick (the stone shatters); bar_iron (the ore and charcoal are spent) |

The job still ends `done` with `jobs:done`, because the work was done, badly. UF_Colonists' plan steps count what was made, so they try again with the next input. UF_Skills pays nothing when `job.result.outcome` is `burnt` or `wasted`.

---

## 5. The action table (every action kind)
Chances are the level curve at level 1 and at 99 with a hardness factor of 1 (the per-tool factors are in §4.2). R is the requirement level proposed to the progression topic (W4). "–" means no level applies. Beats are at level 1, no tool, `work.scale` 1.

| Action kind (skill) | Model | Base beats (existing range) | Required level | Chance at 1 / 99 | Failure outcome | Tool modifier | Material modifier |
|---|---|---|---|---|---|---|---|
| Chop a tree, stump, tall cactus or palisade (woodcutting) | attempt | 3 per stroke, 1–4 landed strokes (nominal 3–12) | 1 | 0.45 / 1.00 (curve 0.45 → 1.58) | time | stone axe ×2 strokes, iron axe ×3; hardness 5 / 7 | hardness 1–3; more strokes for bigger trees |
| Mine ore or crystal (mining) | attempt | 4 per blow, 3–5 blows (12–20) | 1 (copper, iron); gold 37, crystal 26 | copper 0.45 / 1.00; iron 0.40 / 1.00; gold 0.30 at 37 / 1.00; crystal 0.25 at 26 / 0.99 | time | stone pick ×2 blows; hardness 5 | hardness 3–7 |
| Quarry stone or pull down a stone wall (mining) | attempt | 4 per blow, 2–3 (8–12) | 1 | 0.50 / 1.00 | time | stone pick ×2 | hardness 5–6 |
| Gather plants, fruit and grain (foraging) | attempt | 2 per try, 1–3 (2–6) | 1 | 0.50–0.70 / 1.00 | time | knife ×1.5 tries; hardness 5 or 7 | hardness 0–1 |
| Pick up loose stones, gravel, bones, rubble, small crystals (foraging) | progress | 1 | – | always | none | pick ×1.5 (no effect at 1 beat) | – |
| Fish (fishing) | attempt | 4 per cast, 1 catch | 1 | 0.40 / 1.00 | time ("nothing bit") | none exist yet | – (per water kind later, CRAFTING §1.4) |
| Hunt prey (hunting) | attempt | 3 per strike, 1–3 (3–9) | 1 | 0.25–0.60 / 0.85–1.00 | time (the prey may bolt: UF_Wildlife's choice) | stone knife ×2 strikes, iron dagger ×2.5 | none |
| Hunt an animal that fights back, or a monster (hunting) | attempt, until UF_Combat turns these hunts into fights (CRAFTING §3.6) | 3, 2–7 (6–21) | 1 | 0.20 / 0.80 (fighters), 0.15 / 0.60 (monsters) | time | as prey | none |
| Cook at a fire (cooking) | progress | 3 | 1 | success 0.60 / 1.00 (burn 0.40 → 0 at 32 for meat, 30 for fish) | burnt | – | per recipe |
| Knap or haft stone tools (crafting) | progress | 3–4 | 1 | success 0.75 (knife) / 0.70 (axe, pick) → 1.00 (waste ends at 15 / 20) | wasted (stone) | – | per recipe |
| Weave, sew (crafting) | progress | 6–8 | 1 | always | none | knife ×1.5 (cloak) | per recipe |
| Split firewood (woodcutting) | progress | 2 | 1 | always | none | axe ×1.5 | – |
| Smelt, burn charcoal (smithing) | progress | 8–10 | 1 | iron bar 0.80 / 1.00 (waste ends at 25); copper bar, charcoal always | wasted (all inputs) | – | per recipe |
| Forge weapons, armour, tools (smithing) | progress | 8–12 | 1 | always | none | – | per recipe (more bars, more beats) |
| Fletch arrows, carve bows (fletching) | progress | 8–12 | 1 | always | none | knife ×1.5 | per recipe |
| Carpentry, leatherwork, tanning | progress | 6–10 | 1 | always | none | knife or axe ×1.5 | per recipe |
| Build (faction Building) | progress, faction-scaled | 1–8 | faction unlock (V77, V84: the tech tree) | always | none | build tools: none exist, ×1 | per structure; carpentry or masonry share |
| Dismantle (faction Building) | progress, faction-scaled | 2 | – | always | none | – | – |
| Lay a floor (faction Building) | progress, faction-scaled | 4 (UF_Floors' value) | – | always | none | – | – |
| Dig the ground (mining) | progress | 3 | – | always | none | none yet (a pick could get `tool.dig` in data) | – |
| Fetch, haul (hauling) | progress | 1 to pick up; haul also 1 to put down | – | always | none | – | – |
| Douse a fire (hauling) | progress | 1 to fill, 3 to douse (catalog `fire.douse`) | – | always | none | – | – |
| Equip | progress | tool 1, clothes 2 | – | always | none | – | – |
| Eat | progress | 1 (berries, fruit, mushrooms, roots), 2 (meat, fish) | – | always | none | – | – |
| Drink, talk, mate | progress | 1, 3, 2 | – | always | none | – | – |
| Sleep | progress | hours × 60 from the caller; 10 by default | – | always | none | – | – |
| Move, wander | travel only | 0 | – | – | – | – | – |

**Order check** (expected beats for a level-1 worker, from §6):

| Action | Expected beats |
|---|---|
| Eat berries | 1 |
| Roast meat | 3 |
| Weave a wrap | 6 |
| Smelt an iron bar | 10 |
| Fell an oak | 8 with a stone axe, 25 bare-handed |
| Mine ironstone | 22 with a stone pick, 80 bare-handed |

A treat is not a tree, and a tree is not an ore vein.

---

## 6. Every existing entry, converted (old value → new)
**Conversion rules** (so no number is picked one at a time):
- A **progress entry in map updates** becomes `round(old ÷ 30)` beats (minimum 1). Dividing by 60 would give the literal seconds. Dividing by 30 keeps the entries in the order they were tuned and puts the longest hand craft (the hide cloak, 8) level with the shortest workshop jobs (8). So no hand craft outlasts forging, and no forge job is shorter than roasting meat.
- A **progress entry already meant as beats** keeps its number. That covers the combat-chain recipes, the workshops, the racks, the doors and floors.
- **Needs actions** (drink, eat, talk, mate, sleep) convert at ÷60, the literal seconds. They are paced against needs that change once per game minute, and V85 is about work, so their real length stays what it is today.
- **Attempt entries:** `hits = max(1, round(old ÷ d))`, with d = 80 for chop, mine and quarry, 20 for gather and 60 for hunt. This keeps the catalog's order: a fruit tree 4 > an oak 3 > a palm 2 > a stump 1. The swing length is per family: chop 3, mine and quarry 4, gather 2, fish 4, hunt 3. The data's `work` becomes the nominal beats, attempt × hits (the time at a 100% chance with no tool). UF_Wildlife's catalog check (`hunt.work > 0`), `tools/check_catalog.js` (`recipe.work > 0`) and the asset inventory keep reading `work` unchanged.
- **Chance pairs** come from CRAFTING.md §1 where a row exists (tuning data, proposals), otherwise from the nearest row of the same family.

### 6.1 Object actions (attempt model)
Expected beats: level 1 (or at R), bare hands; then the best existing tool at the same level; then level 99 with that tool. They are computed from §4.2 and not measured.

| Object | Action | Old `work` (updates) | Attempt | Hits | New `work` (beats) | R | Hardness | Chance pair | Chance L1 / L99 | Exp. beats: bare · best tool · L99 tool |
|---|---|---|---|---|---|---|---|---|---|---|
| oak | chop | 240 | 3 | 3 | 9 | 1 | 3 | 0.45, 1.58 | 0.45 / 1.00 | 25 · 5.3 (iron axe) · 3 |
| birch | chop | 200 | 3 | 3 | 9 | 1 | 2 | 0.45, 1.58 | 0.45 / 1.00 | 22.2 · 5.3 · 3 |
| pine | chop | 240 | 3 | 3 | 9 | 1 | 2 | 0.45, 1.58 | 0.45 / 1.00 | 22.2 · 5.3 · 3 |
| fir_snow | chop | 240 | 3 | 3 | 9 | 1 | 2 | 0.45, 1.58 | 0.45 / 1.00 | 22.2 · 5.3 · 3 |
| fruit_tree | gather | 60 | 2 | 3 | 6 | 1 | 0 | 0.50, 1.30 | 0.50 / 1.00 | 10.9 · 6.4 (stone knife) · 4 |
| fruit_tree | chop | 300 | 3 | 4 | 12 | 1 | 3 | 0.45, 1.58 | 0.45 / 1.00 | 33.3 · 7.1 · 4 |
| fruit_tree_bare | chop | 300 | 3 | 4 | 12 | 1 | 3 | 0.45, 1.58 | 0.45 / 1.00 | 33.3 · 7.1 · 4 |
| tree_savanna | chop | 200 | 3 | 3 | 9 | 1 | 2 | 0.45, 1.58 | 0.45 / 1.00 | 22.2 · 5.3 · 3 |
| tree_swamp | chop | 220 | 3 | 3 | 9 | 1 | 2 | 0.45, 1.58 | 0.45 / 1.00 | 22.2 · 5.3 · 3 |
| mangrove | chop | 220 | 3 | 3 | 9 | 1 | 3 | 0.45, 1.58 | 0.45 / 1.00 | 25 · 5.3 · 3 |
| tree_tropical | chop | 320 | 3 | 4 | 12 | 1 | 3 | 0.45, 1.58 | 0.45 / 1.00 | 33.3 · 7.1 · 4 |
| palm | chop | 160 | 3 | 2 | 6 | 1 | 1 | 0.45, 1.58 | 0.45 / 1.00 | 13.3 · 3.6 · 2 |
| dead_tree | chop | 120 | 3 | 2 | 6 | 1 | 2 | 0.45, 1.58 | 0.45 / 1.00 | 14.8 · 3.6 · 2 |
| tree_cursed | chop | 140 | 3 | 2 | 6 | 1 | 3 | 0.45, 1.58 | 0.45 / 1.00 | 16.7 · 3.6 · 2 |
| stump | chop | 100 | 3 | 1 | 3 | 1 | 2 | 0.45, 1.58 | 0.45 / 1.00 | 7.4 · 1.8 · 1 |
| cactus_tall | chop | 80 | 3 | 1 | 3 | 1 | 1 | 0.45, 1.58 | 0.45 / 1.00 | 6.7 · 1.8 · 1 |
| wall_wood | chop | 120 | 3 | 2 | 6 | 1 | 2 | 0.45, 1.58 | 0.45 / 1.00 | 14.8 · 3.6 · 2 |
| berry_bush | gather | 40 | 2 | 2 | 4 | 1 | 0 | 0.60, 1.50 | 0.60 / 1.00 | 6.1 · 3.6 (stone knife) · 2.7 |
| bush | gather | 40 | 2 | 2 | 4 | 1 | 0 | 0.70, 1.50 | 0.70 / 1.00 | 5.2 · 3 · 2.7 |
| desert_shrub | gather | 40 | 2 | 2 | 4 | 1 | 0 | 0.70, 1.50 | 0.70 / 1.00 | 5.2 · 3 · 2.7 |
| snow_bush | gather | 40 | 2 | 2 | 4 | 1 | 0 | 0.70, 1.50 | 0.70 / 1.00 | 5.2 · 3 · 2.7 |
| cactus | gather | 50 | 2 | 3 | 6 | 1 | 1 | 0.50, 1.30 | 0.50 / 1.00 | 12 · 6.4 · 4 |
| grass_tuft | gather | 20 | 2 | 1 | 2 | 1 | 0 | 0.70, 1.50 | 0.70 / 1.00 | 2.6 · 1.5 · 1.3 |
| reeds | gather | 30 | 2 | 2 | 4 | 1 | 0 | 0.70, 1.50 | 0.70 / 1.00 | 5.2 · 3 · 2.7 |
| fern | gather | 20 | 2 | 1 | 2 | 1 | 0 | 0.70, 1.50 | 0.70 / 1.00 | 2.6 · 1.5 · 1.3 |
| wild_grain | gather | 30 | 2 | 2 | 4 | 1 | 0 | 0.60, 1.50 | 0.60 / 1.00 | 6.1 · 3.6 · 2.7 |
| wheat_wild | gather | 30 | 2 | 2 | 4 | 1 | 0 | 0.55, 1.40 | 0.55 / 1.00 | 6.6 · 3.9 · 2.7 |
| granite_boulder | quarry | 200 | 4 | 3 | 12 | 1 | 6 | 0.50, 1.76 | 0.50 / 1.00 | 48 · 13.3 (stone pick) · 6 |
| rubble_pillar | quarry | 160 | 4 | 2 | 8 | 1 | 5 | 0.50, 1.76 | 0.50 / 1.00 | 26.7 · 8 · 4 |
| wall_stone | quarry | 180 | 4 | 2 | 8 | 1 | 5 | 0.50, 1.76 | 0.50 / 1.00 | 26.7 · 8 · 4 |
| copper_outcrop | mine | 280 | 4 | 4 | 16 | 1 | 4 | 0.45, 1.58 | 0.45 / 1.00 | 50.8 · 16.2 (stone pick) · 8 |
| ironstone | mine | 300 | 4 | 4 | 16 | 1 (W4; CRAFTING proposes 13 once bronze exists) | 6 | 0.40, 1.44 | 0.40 / 1.00 | 80 · 22.2 · 8 |
| gold_outcrop | mine | 360 | 4 | 5 | 20 | 37 (proposal) | 3 | 0.30, 1.05 | – (needs 37); 0.30 at 37 / 1.00 | 83.3 at 37 · 27.8 · 10 |
| crystal | mine | 240 | 4 | 3 | 12 | 26 (proposal) | 7 | 0.25, 0.99 | – (needs 26); 0.25 at 26 / 0.99 | 96 at 26 · 30 · 7.6 |

The hardness values are our own, on the catalog's 0–10 scale. For the minerals they roughly follow the real minerals' scratch hardness: gold is soft, iron ore and granite are hard, and crystal is hardest. The yields, `becomes` and the finite minerals are unchanged (V74). The action applies once, when the last hit lands, exactly as today's single apply.

### 6.2 Pick-up actions (progress model)
| Object | Old `work` (updates) | New `work` (beats) |
|---|---|---|
| rocks_small | 20 | 1 |
| gravel | 20 | 1 |
| crystal_small | 40 | 1 |
| bones_pile | 20 | 1 |
| rubble | 40 | 1 |

### 6.3 Buildings (progress model, faction-scaled; no failure)
| Object | Old `build.work` | Old meaning | New `build.work` (beats) | Trade share | Beats at faction Building 1 / 50 / 99 | At 99 with trade 99 |
|---|---|---|---|---|---|---|
| stockpile | 20 | updates | 1 | – | 1 / 1 / 1 | 1 |
| floor_straw | 60 | updates | 2 | – | 2 / 2 / 2 | 2 |
| wall_wood | 90 | updates | 3 | carpentry | 3 / 3 / 2 | 2 |
| workbench | 80 | updates | 3 | – | 3 / 3 / 2 | 2 |
| campfire | 120 | updates | 4 | – | 4 / 3 / 3 | 3 |
| tanning_rack | 4 | beats | 4 | – | 4 / 3 / 3 | 3 |
| weapon_rack | 4 | beats | 4 | – | 4 / 3 / 3 | 3 |
| door_wood | 4 | beats | 4 | carpentry | 4 / 3 / 3 | 2 |
| door_stone | 4 | beats | 4 | masonry | 4 / 3 / 3 | 2 |
| wall_stone | 150 | updates | 5 | masonry | 5 / 4 / 3 | 2 |
| bowyer_bench | 6 | beats | 6 | – | 6 / 5 / 4 | 4 |
| fletcher_bench | 6 | beats | 6 | – | 6 / 5 / 4 | 4 |
| furnace | 8 | beats | 8 | – | 8 / 6 / 5 | 5 |
| smithy | 8 | beats | 8 | – | 8 / 6 / 5 | 5 |

`bridge`, `farm_plot` and `well` have no `build` today and are unchanged. The trade share uses the object's tags: `wood` → carpentry, `stone` → masonry. That is the same mapping UF_Skills uses for its build experience share (`skills.list[].buildTags`).

### 6.4 Recipes (progress model)
Beats at level 1 / 50 / 99 are `ceil(work / (1 + 0.01 × (L − 1)))` with no tool. "Tool" is the recipe's existing speed tag (×1.5, today's rule). The failure data is new (W3). Success chances come from §4.1: burn at 1 = 0.40, falling to 0 at the stop level.

| Recipe | Old `work` | Old meaning | New `work` (beats) | L1 / L50 / L99 | With its tool at L1 | Failure (new) | Success at L1 / L99 |
|---|---|---|---|---|---|---|---|
| stone_knife | 90 | updates | 3 | 3 / 3 / 2 | – | wasted: `lose {stone: 1}`, 0.25 at 1 → 0 at 15 | 0.75 / 1.00 |
| stone_axe | 120 | updates | 4 | 4 / 3 / 3 | – | wasted: `lose {stone: 2}`, 0.30 → 0 at 20 | 0.70 / 1.00 |
| stone_pick | 120 | updates | 4 | 4 / 3 / 3 | – | wasted: `lose {stone: 2}`, 0.30 → 0 at 20 | 0.70 / 1.00 |
| fiber_wrap | 180 | updates | 6 | 6 / 5 / 4 | – | none | always |
| hide_cloak | 240 | updates | 8 | 8 / 6 / 5 | 6 (knife) | none | always |
| cook_meat | 90 | updates | 3 | 3 / 3 / 2 | – | burnt: `outputs {burnt_food: 1}`, 0.40 → 0 at 32 | 0.60 / 1.00 |
| cook_fish | 90 | updates | 3 | 3 / 3 / 2 | – | burnt: 0.40 → 0 at 30 | 0.60 / 1.00 |
| split_firewood | 60 | updates | 2 | 2 / 2 / 2 | 2 (axe) | none | always |
| charcoal | 8 | beats | 8 | 8 / 6 / 5 | – | none | always |
| bar_iron | 10 | beats | 10 | 10 / 7 / 6 | – | wasted: `lose "all"`, 0.20 → 0 at 25 | 0.80 / 1.00 |
| bar_copper | 8 | beats | 8 | 8 / 6 / 5 | – | none | always |
| leather | 6 | beats | 6 | 6 / 5 / 4 | 4 (knife) | none | always |
| bow_short | 10 | beats | 10 | 10 / 7 / 6 | 7 (knife) | none | always |
| bow_long | 12 | beats | 12 | 12 / 9 / 7 | 8 (knife) | none | always |
| arrows_stone | 8 | beats | 8 | 8 / 6 / 5 | 6 (knife) | none | always |
| arrows_bone | 8 | beats | 8 | 8 / 6 / 5 | 6 (knife) | none | always |
| arrows_iron | 10 | beats | 10 | 10 / 7 / 6 | 7 (knife) | none | always |
| sling | 6 | beats | 6 | 6 / 5 / 4 | – | none | always |
| club | 6 | beats | 6 | 6 / 5 / 4 | 4 (axe) | none | always |
| spear_stone | 8 | beats | 8 | 8 / 6 / 5 | 6 (knife) | none | always |
| spear_iron | 8 | beats | 8 | 8 / 6 / 5 | – | none | always |
| shield_wood | 8 | beats | 8 | 8 / 6 / 5 | 6 (axe) | none | always |
| dagger_iron | 8 | beats | 8 | 8 / 6 / 5 | – | none | always |
| sword_short | 10 | beats | 10 | 10 / 7 / 6 | – | none | always |
| sword_long | 12 | beats | 12 | 12 / 9 / 7 | – | none | always |
| axe_iron | 10 | beats | 10 | 10 / 7 / 6 | – | none | always |
| mace | 8 | beats | 8 | 8 / 6 / 5 | – | none | always |
| helmet_leather | 6 | beats | 6 | 6 / 5 / 4 | 4 (knife) | none | always |
| armor_leather | 10 | beats | 10 | 10 / 7 / 6 | 7 (knife) | none | always |
| leggings_leather | 6 | beats | 6 | 6 / 5 / 4 | 4 (knife) | none | always |
| helmet_iron | 10 | beats | 10 | 10 / 7 / 6 | – | none | always |
| mail_iron | 12 | beats | 12 | 12 / 9 / 7 | – | none | always |
| greaves_iron | 10 | beats | 10 | 10 / 7 / 6 | – | none | always |
| shield_iron | 10 | beats | 10 | 10 / 7 / 6 | – | none | always |

**Failure curves, by level:**

| Recipe | L1 | L10 | L16 | L20 | L25 | L30 | L50 |
|---|---|---|---|---|---|---|---|
| cook_meat, burn | 40% | 28% | 21% | 15% | 9% | 3% | 0 |
| cook_fish, burn | 40% | 28% | 19% | 14% | 7% | 0 | 0 |
| stone_knife, waste | 25% | 9% | 0 | 0 | 0 | 0 | 0 |
| stone_axe and stone_pick, waste | 30% | 16% | 6% | 0 | 0 | 0 | 0 |
| bar_iron, waste | 20% | 13% | 8% | 4% | 0 | 0 | 0 |

**The new item for burnt food:**
- Item `burnt_food`, named "Burnt food" (plain English, not a proper noun; W6).
- Tags `["waste"]`: it is not food, it isn't eaten or counted as food, and UF_Colonists' larder step ignores it.
- It needs a placeholder image (a stock RMMZ icon) and an asset request for Gemini, which the build writes.

### 6.5 Hunting (attempt model; `wildlife.species[].hunt`)
The strike length is 3 beats. The last column is expected beats at level 1 bare-handed, then with a stone knife (×2), then at level 99 with the knife.

| Species | Old `hunt.work` (updates) | Hits | New `hunt.work` (beats) | Chance pair | Kind | Exp. beats |
|---|---|---|---|---|---|---|
| rat | 40 | 1 | 3 | 0.60, 1.20 | prey | 5 · 2.5 · 1.5 |
| hare | 60 | 1 | 3 | 0.40, 1.20 | prey | 7.5 · 3.8 · 1.5 |
| fowl | 60 | 1 | 3 | 0.45, 1.20 | prey | 6.7 · 3.3 · 1.5 |
| deer | 120 | 2 | 6 | 0.35, 1.05 | prey | 17.1 · 8.6 · 3 |
| wild_sheep | 100 | 2 | 6 | 0.40, 1.10 | prey | 15 · 7.5 · 3 |
| fox | 100 | 2 | 6 | 0.35, 1.00 | prey | 17.1 · 8.6 · 3 |
| arctic_fox | 100 | 2 | 6 | 0.35, 1.00 | prey | 17.1 · 8.6 · 3 |
| wildcat | 120 | 2 | 6 | 0.30, 0.95 | prey | 20 · 10 · 3.2 |
| songbird | 90 | 2 | 6 | 0.35, 1.00 | prey | 17.1 · 8.6 · 3 |
| bat | 90 | 2 | 6 | 0.30, 0.90 | prey | 20 · 10 · 3.3 |
| wild_horse | 180 | 3 | 9 | 0.25, 0.85 | prey | 36 · 18 · 5.3 |
| jackal | 150 | 3 | 9 | 0.30, 0.95 | prey | 30 · 15 · 4.7 |
| hawk | 150 | 3 | 9 | 0.25, 0.85 | prey | 36 · 18 · 5.3 |
| serpent | 90 | 2 | 6 | 0.20, 0.80 | fights back | 30 · 15 · 3.8 |
| boar | 150 | 3 | 9 | 0.20, 0.80 | fights back | 45 · 22.5 · 5.6 |
| wolf | 200 | 3 | 9 | 0.20, 0.80 | fights back | 45 · 22.5 · 5.6 |
| giant_spider | 160 | 3 | 9 | 0.20, 0.80 | fights back | 45 · 22.5 · 5.6 |
| aurochs | 240 | 4 | 12 | 0.20, 0.80 | fights back | 60 · 30 · 7.5 |
| sand_stalker | 200 | 3 | 9 | 0.15, 0.60 | monster | 60 · 30 · 7.5 |
| restless_dead | 200 | 3 | 9 | 0.15, 0.60 | monster | 60 · 30 · 7.5 |
| ice_wraith | 300 | 5 | 15 | 0.15, 0.60 | monster | 100 · 50 · 12.5 |
| troll | 400 | 7 | 21 | 0.15, 0.60 | monster | 140 · 70 · 17.5 |
| bog_horror | 400 | 7 | 21 | 0.15, 0.60 | monster | 140 · 70 · 17.5 |

`hunt.flees` and `yields` are unchanged. The hunt handler's fallback for an unknown species (60 updates) becomes `work.jobs.hunt`: attempt 3, hits 1, chance 0.40 and 1.20.

### 6.6 Engine job types
| Type (file) | Old | New (beats) | Where the number lives after the build |
|---|---|---|---|
| move, wander (UF_Jobs) | 0 | 0 | handler |
| fetch (UF_Jobs) | 0 | 1 (pick up) | `work.jobs.fetch` |
| haul (UF_Jobs) | 0 + 0 | 1 (pick up) + 1 (put down) | `work.jobs.haul.beats: [1, 1]` |
| equip (UF_Jobs) | 0 | tool 1, clothes 2 | `work.jobs.equip` |
| drink (UF_Jobs `NEED_WORK`) | 60 | 1 | `work.jobs.drink` |
| eat (UF_Jobs `NEED_WORK`) | 60 | the food's `food.beats`; else 1. meat_raw, fish, meat_cooked 2; berries, fruit, mushroom, root 1 | items, `work.jobs.eat` |
| sleep (UF_Jobs `SLEEP_WORK`, `params.frames`) | 600, or hours × 3600 from UF_Colonists and UF_Ownership | `params.beats`; else `ceil(params.frames ÷ 60)` (hours × 60, so UF_Colonists and UF_Ownership keep working unedited); else 10 | handler |
| talk (UF_Jobs `TALK_WORK`) | 180 | 3 | `work.jobs.talk` |
| mate (UF_Jobs) | 120 | 2 | `work.jobs.mate` |
| hunt (UF_Jobs) | species `hunt.work`, 60 by default | §6.5 | species, `work.jobs.hunt` |
| build, craft, chop, gather, pick, quarry, mine (UF_Jobs) | catalog | §6.1–§6.4 | catalog |
| dismantle (UF_Interact `DISMANTLE_WORK`) | 60 | 2, faction-scaled | `work.jobs.dismantle` |
| dig (UF_Interact `DIG_WORK`) | 80 | 3 (the 1-in-4 stone drop stays; it is a yield, not a failure) | `work.jobs.dig` |
| fish (UF_Interact `FISH_WORK`, `FISH_CATCH_OF`) | 200 and a 2-in-3 catch roll | attempt 4, hits 1, chance 0.40 and 1.20 (the handler's own roll goes, §10.3) | `work.jobs.fish` |
| floor (UF_Floors `FLOOR_WORK`, `params.work`) | 4, read as updates | 4 beats, faction-scaled. The fetch phase stays instant (UF_Floors' choice); the number is unchanged and now means what it was written as | handler |
| douse (UF_Fire) | `fillBeats × 60`, `beats × 60` | 1, 3 (catalog `fire.douse`, already beats) | UF_Fire returns beats (§10.3) |

### 6.7 Experience per job (UF_Skills; the catalog's `skills.list[].xp`)
UF_Skills keeps `xp = base + perWork × min(job.progress, workCap)`:
- UF_Jobs sets `job.progress` to the action's **nominal beats** when the job finishes: `work` for progress actions, attempt × hits for attempt actions. So the formula reads the same number for a novice and a master.
- `perWork` becomes experience per nominal beat, and `workCap` goes from 600 updates to 30 beats.
- The values below keep each skill's typical job near today's experience.
- The one change that isn't close is building. A furnace paid 5.8 because its beat value was multiplied by a per-update rate; it now pays 29, in line with a campfire's 17 and a stone wall's 20.

| Skill | `perWork` old → new | Examples, old xp → new |
|---|---|---|
| woodcutting | 0.1 → 2.5 | oak 29 → 27.5; birch 25 → 27.5; palm 21 → 20; stump 15 → 12.5; split firewood 11 → 10 |
| mining | 0.1 → 2 | ironstone 35 → 37; copper 33 → 37; gold 41 → 45; crystal 29 → 29; granite 25 → 29; rubble pillar 21 → 21; dig 13 → 11 |
| foraging | 0.1 → 1 | grass 4 → 4; berries 6 → 6; cactus 7 → 8; fruit 8 → 8; loose stones 4 → 3; rubble 6 → 3 |
| fishing | 0.1 → 5 | a fish 30 → 30 |
| hunting | 0.15 → 3 | hare 19 → 19; deer 28 → 28; aurochs 46 → 46; troll 70 → 73 |
| cooking | 0.1 → 3 | roast meat 19 → 19 (a burnt one → 0) |
| crafting | 0.1 → 3 | stone knife 14 → 14; stone axe 17 → 17; wrap 23 → 23; cloak 29 → 29 (a wasted one → 0) |
| building (the faction pool under V84) | 0.1 → 3 | stockpile 7 → 8; palisade 14 → 14; campfire 17 → 17; stone wall 20 → 20; door 5.4 → 17; bench 5.6 → 23; furnace, smithy 5.8 → 29 |
| masonry, farming, healing | 0.1 → 3 | masonry only through the build share; farming and healing have no job yet |
| hauling | 0.05 → 1 | haul 2 → 3; douse 11 → 5 |
| smithing, fletching, carpentry, leatherwork | 1 → 1 (already per beat) | iron bar 25 → 25 (a wasted one → 0); long sword 27; stone arrows 18; leather 16; club 16 |

Missed swings, burnt meals, wasted material and given-up jobs pay nothing. The first three end `done` with `job.result.outcome` set, and UF_Skills skips them. A given-up job ends `failed`, which UF_Skills never pays. The extra-yield roll of UF_Skills is unchanged: once per finished gather, chop, mine, quarry, fish or hunt job.

---

## 7. How skill level and the faction Building level change duration
- **Personal skill level (V63)** acts in three ways:
  - It shortens progress actions (×1 at level 1 to ×1.98 at 99).
  - It raises attempt chances (low at the requirement to high at 99).
  - It lowers failure chances to zero at the stop level.
- **The faction's Building level (V84)** replaces the builder's personal building level for `build`, `dismantle` and `floor`: f(B), 1 → 1.98.
  - The builder's own carpentry or masonry adds g(T), 1 → 1.49, for structures tagged wood or stone. This follows V84's reading that "a builder's speed comes from tools and their other skills".
  - No personal building level is read anywhere. If a save still holds one, it changes nothing.
- **Abilities (V84)** that the progression topic grants at milestone levels plug in as `perkSpeed` (§4.1, §4.2) and `perkFail`. Their names are that topic's proposals.
- **Required levels** stop a person from taking the job at all. That is the progression topic's gate, not this file's. This file only anchors the chance at R. If a person below R works anyway (an order, before the gate exists), the chance line continues below `low` and is clamped at the 0.05 floor.

**Worked examples.** Progress actions are exact beats; attempt actions are expected beats. All are computed, not measured.

| Action | L1 | L25 | L50 | L75 | L99 |
|---|---|---|---|---|---|
| Roast meat (3), burn chance | 3 (40%) | 3 (9%) | 3 (0) | 2 (0) | 2 (0) |
| Smelt an iron bar (10), waste chance | 10 (20%) | 9 (0) | 7 | 6 | 6 |
| Forge a long sword (12) | 12 | 10 | 9 | 7 | 7 |
| Fell an oak bare-handed | 25 | 15.5 | 11.1 | 9 | 9 |
| Fell an oak with a stone axe | 8.3 | 5.2 | 4.5 | 4.5 | 4.5 |
| Mine ironstone with a stone pick | 22.2 | 13.6 | 9.7 | 8 | 8 |
| Catch a fish | 10 | 6.7 | 5 | 4 | 4 |
| Hunt a deer with a stone knife | 8.6 | 5.8 | 4.3 | 3.4 | 3 |
| Build a stone wall (5), at faction Building L | 5 | 5 | 4 | 3 | 3 |
| Build a furnace (8), at faction Building L | 8 | 7 | 6 | 5 | 5 |

Whole beats make the shortest jobs step rather than slide. A 3-beat roast drops to 2 beats only from cooking 52 on. Longer jobs show the full factor.

---

## 8. What the player sees (V48, V59, V62)
- **`UF.Jobs.describe(job)` does not change.** "Chopping an oak" stays exactly that, so `jobs.describe_text` and UF_Talk's lines are untouched.
- **`UF.Jobs.label(job, "short" | "long")`** is new and builds on `describe`:

  | State | Short (look tooltip) | Long (colonist card, character sheet) |
  |---|---|---|
  | attempt action, working | "Chopping an oak (1/3)" | "Chopping an oak: 1 of 3 strokes landed, 36% a stroke, about 17 beats left" |
  | fishing | "Fishing (3 casts)" | "Fishing: 3 casts, nothing yet, 40% a cast" |
  | progress action | "Roasting meat (2/3 beats)" | "Roasting meat: beat 2 of 3, 40% chance to burn at cooking 1" |
  | construction | "Building a stone wall (3/5 beats)" | "Building a stone wall: beat 3 of 5 at faction Building 12" |
  | sleep | "Sleeping (120/480 beats)" | "Sleeping: beat 120 of 480" |
  | on the way | "Chopping an oak (on the way)" | "Chopping an oak: on the way" |

  - "About N beats left" is the expected remainder at the current chance and swing rate, rounded.
  - The swing nouns come from `work.nouns`: stroke, blow, try, cast, strike. They are plain English.
  - The beat counts are the beats this worker needs: `ceil(work / rate)` for progress actions.
- **Look tooltip:** UF_Look's unit line (`UF_Look.js` lines 185–188) shows `label(job, "short")` instead of `describe(job)`. Line 1 reads "Meren · Neutral · Chopping an oak (1/3)".
- **Colonist card and character sheet:**
  - While a job is working, UF_Jobs writes `unit.data.intent = { verb, text: label(job, "long"), jobId, since: beat }` each beat. That is the V48 contract from WORLD_ARCHITECTURE §1.7.
  - It clears the intent when the job ends, and only an intent it wrote itself (same `jobId`).
  - UF_Sheet already prefers `data.intent.text` (`UF_Sheet.js` lines 481–487), so the sheet needs no edit.
  - UF_Colonists' card model (line 1423) and UF_ColonyOverseer's adapter (lines 76–79) show `label(job, "long")`.
  - The intent carries no `target`, because UF_Anim reads `intent.target` as a strike target (`UF_Anim.js` lines 1384–1391).
- **Nothing over the head.** No bark, speech or line shows work progress (V62). A burnt meal leaves a visible item on the ground (§4.3). It is not announced.

---

## 9. Data schema (catalog; written by the build with a layout-preserving node script)
A new top-level key, `work`:
```json
"work": {
  "about": "Work timing (docs/design/WORK_TIMING.md, VISION V85): every duration in job and recipe data is in world beats (60 map updates, 1 s at x1).",
  "version": 1,
  "unit": "beat",
  "beatFrames": 60,
  "scale": 1,
  "maxBeats": 30,
  "chance": { "min": 0.05, "capFactor": 3 },
  "hardness": { "bareHands": 1, "step": 0.1, "min": 0.5, "max": 1.25 },
  "build": { "jobs": ["build", "dismantle", "floor"], "factionSpeedPerLevel": 0.01, "tradeSpeedPerLevel": 0.005, "trades": { "wood": "carpentry", "stone": "masonry" } },
  "nouns": { "chop": ["stroke", "strokes"], "mine": ["blow", "blows"], "quarry": ["blow", "blows"], "gather": ["try", "tries"], "fish": ["cast", "casts"], "hunt": ["strike", "strikes"] },
  "jobs": {
    "move": { "beats": 0 }, "wander": { "beats": 0 },
    "fetch": { "beats": 1 }, "haul": { "beats": [1, 1] },
    "equip": { "tool": 1, "wear": 2 },
    "drink": { "beats": 1 }, "eat": { "beats": 1 }, "talk": { "beats": 3 }, "mate": { "beats": 2 }, "sleep": { "beats": 10 },
    "dismantle": { "beats": 2 }, "dig": { "beats": 3 },
    "fish": { "attempt": 4, "hits": 1, "chance": [0.40, 1.20], "hardness": 0 },
    "hunt": { "attempt": 3, "hits": 1, "chance": [0.40, 1.20] }
  }
}
```
Fields added to existing entries (values in §6):
- **`objects[].actions.<chop|gather|quarry|mine>`:** `work` (nominal beats), `attempt`, `hits`, `chance: [low, high]`, `hardness`. `yields` and `becomes` stay. `pick` actions get only the new `work`.
- **`objects[].build.work`:** in beats.
- **`recipes.list[].work`:** in beats; optional `fail: { chance, stop, outcome: "burnt" | "wasted", outputs?, lose?: { itemId: n } | "all" }`.
- **`wildlife.species[].hunt`:** `work` (nominal beats), `attempt`, `hits`, `chance`. `flees` stays.
- **`items.types[].food.beats`:** only where it isn't 1 (meat_raw, fish, meat_cooked: 2).
- **`items.types[]`:** the new `burnt_food` (§6.4).
- **`skills.list[].xp.perWork` and `skills.xp.workCap`:** §6.7.
- **`recipes.about`:** reworded to say every `work` is in beats.

The required level is **not** written here. It belongs to `skills.unlocks` (the progression topic). The engine asks through one adapter (§10.1). Rows that RESOURCE_ATLAS §6 adds later for resources on other levels (`gatherSkill`, `requiredLevel`, `action`, `toolTags`, …) need `attempt`, `hits`, `chance` and `hardness` as well. That is a note for Codex's manifest; this file does not edit it.

---

## 10. Engine changes (for the build; Claude Code's files unless marked)

### 10.1 UF_Jobs.js
- **`beatNow()`:** §3. `job.lastBeat` is reset on load.
- **Resolving the timing spec:** `timingOf(job)` → `{ model, work | beats[phase], attempt, hits, chance, hardness, fail, construction }`. It resolves in this order:
  1. the object action on the target cell;
  2. `build`;
  3. the recipe;
  4. the species' `hunt`;
  5. the food's `beats`;
  6. sleep's `params.beats` / `params.frames`;
  7. `work.jobs[type]`;
  8. the handler's `work`.
- **Handler units:** a handler's `work` is in beats. A handler still written in map updates declares `workUnit: "ticks"`. UF_Jobs converts it (`ceil(n ÷ 60)`) and logs one warning per type, and `work.one_unit` lists such types as problems.
- **The step:** it replaces the per-update `progress += rateOf` of lines 875–876.
  - A working job advances only when `beatNow() > job.lastBeat`.
  - A progress job adds `rate` (§4.1). An attempt job runs its swing clock and swings (§4.2).
  - `jobs:attempt(job, unit, { n, hit, chance })` fires per swing. UF_Anim may time a work stroke to it, and UF_Wildlife may let a missed prey bolt; neither is required.
  - At the end, the fail roll runs (§4.1), then `apply`, then `job.progress = nominal`, then `jobs:done`.
- **New job fields** (saved with the job): `attempts`, `hits`, `beats` (beats worked), `lastBeat`, `outcome`.
- **Old saves:** a state without `jobs.unit === "beat"` resets every active job's `progress`, `attempts` and `hits` to 0 and then sets `jobs.unit = "beat"`. Old progress numbers can't be converted, because beat-valued and update-valued work were counted the same way. The loss is at most one job's work per unit.
- **Adapters, each one function with a default:**

  | Adapter | Reads | Default |
  |---|---|---|
  | `requiredLevel(unit, spec)` | the progression topic's API | the spec's `level`, else 1 |
  | `factionBuildingLevel(factionId)` | the progression topic's faction level | 1, and `work.faction_build_speed` then FAILs with "no faction Building level API" |
  | `perk(unit, skill, "speed" \| "fail")` | the progression topic's abilities | 1 |

- **API additions:**

  | Call | Returns or does |
  |---|---|
  | `beatNow()` | the current beat (§3) |
  | `timingOf(job)` | the resolved timing spec |
  | `chance(unit, job)` | the swing chance now (§4.2) |
  | `expectedBeats(unit, job)` | expected beats left |
  | `status(job)` | `{ model, beatsDone, beatsNeeded, attempts, hits, hitsNeeded, chance, failChance, etaBeats }` |
  | `label(job, form)` | the short or long text (§8) |
  | `simulate(spec, unitLike, { n, seed, jobId0 })` | the pure attempt and fail model with the same rolls, for checks and tuning |

  `work(job, unit)` returns nominal beats.
- **Z (V80):** nothing here reads `z`. Job ids are unique across the five levels, so the seeds stay unique. Resources on other levels carry their own data. The five-level run's z hooks in UF_Jobs are merged with the merge rule.

### 10.2 UF_Skills.js (Claude Code's; the progression run is also editing it: merge rule)
- **`onJobDone`** returns without experience when `job.result.outcome` is `burnt` or `wasted` (the extra-yield roll is skipped too).
- **`rate()` is unchanged.** UF_Jobs no longer calls it for attempt actions (W1) or for construction jobs, which use f(B) × g(T).
- **`jobXp`** is unchanged in code: it reads `job.progress`, which now holds nominal beats. The catalog's `perWork` and `workCap` change (§6.7).
- **UF_Skills.md:** its Effects and Known limits change (the "mix ticks and beats" limit goes).

### 10.3 The smallest edits to other files (each listed in the build's report)
| File (owner, claim on 2026-09-19) | Line(s) | Change |
|---|---|---|
| `UF_Interact.js` (Claude Code; the five-level run adds z hooks: merge rule) | 50–52, 180–183 | `DISMANTLE_WORK` 2 and `DIG_WORK` 3, or read `work.jobs`. The fish handler drops its own catch roll when the attempt engine ran: `const caught = !!(J.timingOf && J.timingOf(job).attempt) \|\| roll !== 0;` |
| `UF_Fire.js` (Claude Code) | 654, 1442 | douse `work` returns beats (`fillBeats`, `beats`) without `× beatFrames()`; its check compares with `cfg.douse.beats` |
| `UF_Look.js` (the five-level run holds it for z: merge rule) | 185–188 | `J.label ? J.label(job, "short") : J.describe(job)` |
| `UF_Colonists.js` (claimed by "Paths and DF life": merge rule) | 1423 | the card model's `job` uses `J.label(job, "long")` |
| `UF_ColonyOverseer.js` (Claude Code) | 76–79 | `currentJob` uses `J.label(j, "long")` |

No edit is needed to:
- UF_Sheet: it reads the intent;
- UF_Floors: 4 now means beats;
- UF_Ownership and UF_Colonists' sleep callers: frames are converted;
- UF_Wildlife: `hunt.work` stays positive.

---

## 11. Checks (suite `work`, registered by UF_Jobs) and how each is provoked to FAIL
The suite runs on a snapshot (`tools/test_snapshot.js`, `tools/run_tests.js work --game <dir>`) in a cleared arena, like `jobs`:
- It runs at ×1 for the screenshot, then ×8.
- Test workers are `data.kind: "person"` with every trade set to 1 by `UF.Skills.setLevel`.
- They have `workRate` 1 and bare hands unless a check equips a tool.

Each check must be seen failing once. The build provokes each on a sabotaged snapshot and quotes the FAIL line.

| Check | FAILs when | Provoke it by |
|---|---|---|
| `one_unit` | `work.unit` is not "beat" or `work.version` is missing; any object action, build, recipe, species hunt or `work.jobs` duration is not a whole number from 0 to `maxBeats` (sleep excepted); an attempt action lacks `attempt`, `hits` or `chance`, or has `low > high` or `low ≤ 0`; a registered handler declares `workUnit: "ticks"` or returns more than `maxBeats` for a probe job | setting `oak.actions.chop.work` back to 240 in the snapshot's catalog (want: `FAIL work.one_unit: … oak.chop work 240 > 30`) |
| `beat_grid` | A test progress job (work 6), sampled every map update, changes `progress` on an update that isn't a beat boundary; adds anything but its rate on a boundary; or doesn't finish on the 6th boundary after work starts | a sabotaged step that adds `rate ÷ 60` every update |
| `relative` | For one level-1 worker, a live roast, oak chop and ironstone mine (fixed job ids) don't take exactly the beats `simulate` predicts for those ids (the live engine is the model); or simulated means over 200 seeded runs aren't ordered eat berries (1) < roast (3) < oak (≈25) < ironstone (≈80) | swapping the oak's and the ironstone's attempt data in the snapshot's catalog |
| `level_speeds` | A 12-beat progress test job doesn't take 12 beats at level 1 and 7 at level 99 (`ceil(12 ÷ 1.98)`); the per-beat progress ratio isn't 1.98 ± 0.005; or the simulated mean for an oak at 99 isn't at most 0.4 × the mean at 1 | `skills.effects.speedPerLevel` = 0 in the snapshot |
| `success_chance` | `chance()` isn't the formula to 1e-9 at levels 1, 50 and 99 for oak bare-handed (0.36, 0.81, 1.00), oak with a stone axe (0.54 at 1) and ironstone with a stone pick (0.36, 0.83, 1.00); 2 000 seeded swings at levels 1 and 50 land outside ±0.035 of the chance; or a chance falls below 0.05 | leaving out the hardness factor (then oak bare L1 is 0.45, want 0.36) |
| `failure_outcomes` | 20 roasts at cooking 1 burn fewer than 2 or more than 15; a burnt roast doesn't use the raw meat, drop 1 `burnt_food` on the stand cell and pay 0 cooking xp; 20 roasts at cooking 40 burn any; 20 stone knives at crafting 1 waste fewer than 1 or more than 11, or a wasted one doesn't use 1 stone and keep the fiber; the oak isn't still standing after a missed stroke | `fail.chance` 0 on cook_meat (want: `0 burnt in 20 at cooking 1`) |
| `tools_matter` | Over 12 beats of chopping a test tree that needs 50 strokes (so it can't fall mid-count), swings bare / stone axe / iron axe aren't 4 / 8 / 12; the hardness factors aren't 0.80 / 1.20 / 1.25 on oak and 0.50 / 0.90 on ironstone (bare / stone pick); or a knife-tagged recipe doesn't progress ×1.5 | a swing clock that ignores `toolMultiplier` |
| `faction_build_speed` | The same stone wall isn't 5 beats at faction Building 1, 3 at 99, and 2 at 99 with masonry 99; setting the builder's own building level to 99 changes anything; or no faction-level reader exists (detail: "no faction Building level API") | reading the personal building level instead |
| `gives_up` | A test action with chance [0, 0] (clamped to 0.05) and `capFactor` 0.5 (cap 10 swings) doesn't fail with "made no headway" after exactly 10 swings with its object unchanged | removing the cap (then the job still works after 20 beats) |
| `seeded` | The same unit and job id on a JsonEx copy don't repeat the same hit and miss string and the same burn result; another job id gives the same 40-swing string; or `Math.random`, replaced by a stub that throws, is called during 200 swings and 40 crafts | a roll that uses `Math.random` |
| `saved` | A job paused after 2 swings and 1 hit doesn't keep `attempts`, `hits`, `progress` and `beats` through JsonEx; the resumed job doesn't finish on the same beat as a control without a save; or a state from before this build (no `jobs.unit`, an active craft at progress 45) doesn't load with progress 0 and `jobs.unit` "beat" | skipping the migration (want: `progress 45 after load`) |
| `label_shown` | With a worker chopping on screen at zoom 1 and the pointer on its cell, the Look tooltip text lacks "Chopping an oak (" and "/3)"; the card job line and UF_Sheet's doing line lack "strokes landed"; `describe(job)` isn't exactly "Chopping an oak"; or any speech, bark or line sprite shows over the worker. Screenshot `work.label.png`, opened and described in the report | leaving UF_Look on `describe` |
| `xp_per_job` | A real oak chop at woodcutting 1 doesn't give 27.5; a burnt roast gives any cooking xp; a good roast doesn't give 19; experience changes between swings; or a douse doesn't give hauling 5 | paying xp per swing |
| `perf` | With 200 active work jobs, the work step averages over 0.02 ms per job per beat (`performance.now`, at least 30 beats), or any work step runs between beat boundaries | a 0.2 ms busy loop per step |
| `no_errors` | Any uncaught error during the suite | a throw inside `jobs:attempt` |

---

## 12. Existing checks the build must update (with the numbers they should expect)
| Suite.check (file, lines) | Today | After |
|---|---|---|
| `jobs.define_and_create` (UF_Jobs 1021–1026) | `test_noop` work 3 inside a 3 s wait | work 1, or a 6 s wait (3 beats is 3 s at ×1) |
| `jobs.travel_and_work` (1038–1047) | progress rate above 0 per update over 30 frames | at least 1 swing over 2 beats; the stump and 3 logs at the end, as now |
| `jobs.tool_speeds_work` (1085–1097) | chop progress per update ×2 | multiplier 2 as now; swings per beat ×2 |
| `skills.xp_by_doing` (UF_Skills 803–822) | chop 240 +29, cook_meat 90 +19, bar_iron 10 +25, stone wall 150 building +20 and masonry +10, hunt 120 +28 | chop 9 +27.5, cook_meat 3 +19, bar_iron 10 +25, stone wall 5 +20 / +10, deer 6 +28; `test_skills_work` work 2 → woodcutting +10 |
| `skills.rate` (UF_Skills 899–916) | measured per update | measured per beat on a progress job; the ratio is still 1.98 |
| `fire.douse` (UF_Fire 1429, 1442) | `phase1Work === beats × beatFrames()` | `=== cfg.douse.beats` (3) |
| `interact` fish (UF_Interact 1022–1032) | `r.caught === (r.roll !== 0)` | a catch after a landed cast; "nothing bit" when the cap is reached |
| `floors.job_lays_floor` (UF_Floors 512) | `params.work = 60` (meant as updates) | still passes: 60 beats is 7.5 s at ×8 inside its 15 s wait. The owner may set it to 2 |
| `colonists.tools_and_clothes`, `colonists.hunts` | contract window 240 s at ×8 | chopping and knapping take longer and can waste. The build re-measures, and reports the time it took against the window rather than widening it silently |

The build runs `work`, `jobs`, `skills`, `colonists`, `interact`, `fire`, `floors`, `anim`, `smoke` and the progression topic's suite on a snapshot, and compares them with an unchanged snapshot.

---

## 13. Decisions for the user (PROPOSALS; the recommended option is first)
| # | Question | Options | Where |
|---|---|---|---|
| W1 | Does level speed up swings as well as raising the chance? | **No: level raises the chance only.** An oak goes from about 25 beats at level 1 to 9 at 99, about ×2.8. This is the same answer as CRAFTING P9 A. · Yes: both, so a master is about ×5–6 faster | §4.2 |
| W2 | How often does a level-1 cook burn food at a campfire? | **40%, falling to 0 at cooking 32 for meat and 30 for fish.** · 60% as CRAFTING §2.7 proposes (the default plan's food step then loses more meat) | §6.4 |
| W3 | Can low-level knapping and iron smelting waste material? | **Yes: knife 25% → 0 at 15; axe and pick 30% → 0 at 20; iron bar 20% → 0 at 25.** · No, only cooking fails | §6.4 |
| W4 | Required levels for today's resources (the progression topic sets them; this is what this file proposes) | **All 1, except gold 37 and crystal 26.** This keeps CRAFTING D13: the default plan needs nothing above level 1. · CRAFTING §1's ladder (ironstone 13, cactus 6, fruit 8, wild wheat 5, deer 5, …) once bronze exists | §6.1 |
| W5 | The pace: 1 beat = 1 game minute, with tick-valued entries divided by 30. An oak takes about 25 game minutes bare-handed at level 1 (8 with a stone axe), roast meat 3, an iron bar 10, a stone wall 5 | **As designed, with `work.scale` to slow or speed all work at once after a playtest.** · Divide by 60 (the literal seconds: everything is half as long, and hand crafts get shorter than forging by a wider margin) | §6 |
| W6 | What a burnt meal leaves | **A "Burnt food" item on the ground by the fire** (visible failure; needs one icon from Gemini) · nothing (the meat is simply lost) | §4.3 |

---

## 14. Not in this design, and known limits
- **Needs slowing work** (DF: thirst, hunger and tiredness) and **load slowing hauling** (DF's encumbrance) were considered and left out. They belong to UF_Colonists' needs and UF_World's walking. They go to STATUS → Backlog if the user wants them.
- **Landed hits live on the job.** An interrupted chop starts over, as today's progress does. A sparse per-cell record of landed hits is the fix if playtests show workers losing much time.
- **Hunting animals that fight back uses the attempt model** until UF_Combat turns those hunts into fights (V64, CRAFTING §3.6).
- **Several workers on one building or recipe** is not designed. One worker, one job, as today.
- **Walking and deciding stay in map updates** until UF_World steps once per beat (V46). The total time of a job is the walk plus the work, and only the work is designed here.
- **Whole beats make short jobs coarse.** A 3-beat job only gets faster from level 52 on, and a 1-beat job never does. Levels show on the longer jobs.
- **Every number here is computed from the formulas.** None is measured in the game. The build's `work` suite and a playtest in the RMMZ editor are the evidence.
- **The progression topic (V84) had not landed** when this was written (2026-09-19: no `UF_Tech.js` or `docs/design/TECH_TREE.md` on disk). The three adapters of §10.1 are the only coupling. Their API names are whatever that build exposes.
