# REMAINS: carcasses, butchery, decay and bones

**Written by:** Claude Code, 2026-09-19, for the lead's task "design remains" (user 2026-09-19 13:40: "continue working on pulling DF mechanics, bones, spawns, entities, resources, build/skill/technology trees, etc."; user 2026-09-19 13:40, VISION V85: "It should also take a different amount of world beats to do different shit").
**Status:** design only. Nothing in this file is built. No code, catalog, asset request or handoff was changed by the run that wrote it.
**Binding:** VISION V28 (DF mechanics as mechanics, never DF text, tokens, names or numbers), V9 and AGENTS rule 7 (new player-visible names are proposals), V48/V50 (beats, budgets), V58/V60 (sprite frames only, no code-made motion), V63/V66/V84 (skills, crafting, level unlocks), V68 (placement), V71 (ownership), V74 (renewables), V80 (five levels, `z` everywhere), V81 (small things under a square), V85 (every action has its own beats and difficulty).
**Not binding:** `docs/design/CRAFTING.md` P1-P21 and its D-rows are proposals the user has not approved. This file lines up with its ids where that costs nothing (`bone_needle`, `bone_heads`, `tallow`) and says so where it differs (§0, R1).

**What was read.** DF (read-only, nothing copied): `data/vanilla/vanilla_bodies/objects/tissue_template_default.txt` (which tissues are structural, which rot), `vanilla_materials/objects/material_template_default.txt` (skin, fat, muscle, bone, organ templates; which rot; what each becomes), `vanilla_reactions/objects/reaction_other.txt` (tanning, rendering fat, soap from tallow, bone carving), `release notes.txt` (butchery, corpse rot and disappearance, refuse, burial, thoughts about the dead). Ours: `game/js/plugins/UF_Jobs.js`, `UF_Anim.js`, `UF_Combat.js`, `UF_Wildlife.js`, `UF_World.js`, `UF_Items.js`, `UF_Skills.js`, `UF_Colonists.js`, `UF_Look.js`, `UF_Interact.js`, `UF_Ownership.js`, `UF_Objects.js`, `UF_Core.js`; `docs/systems/UF_Anim.md`, `UF_Jobs.md`, `UF_Items.md`, `UF_Skills.md`, `UF_Look.md`, `UF_Interact.md`; `docs/design/DF_MECHANICS.md`, `CRAFTING.md`, `VERTICAL_WORLD.md`, `RESOURCE_ATLAS.md`, `WORLD_ARCHITECTURE.md`; `docs/ENGINE_RULES.md`, `docs/ART_STANDARD.md`; the live catalog `game/data/UF_WorldCatalog.json`.

Line numbers below are of the working tree as read on 2026-09-19 between 13:40 and 13:58. Other runs are editing `UF_Jobs.js`, `UF_Wildlife.js` and others right now, and the numbers moved while this was written (UF_Jobs' `finish` went from line 807 to 805). Each hook is also given by the code it anchors on; the build re-reads the file and uses the anchor.

---

## 0. Decisions for the user (recommended option first)
| # | Question | Options | Why the recommendation |
|---|---|---|---|
| R1 | What does a kill leave? | **A: every death of a creature or a person leaves remains. A creature's products (meat, hide, bone...) come from butchering the carcass, whoever or whatever killed it: a hunt, a fight, a predator, fire.** · B: only hunts leave carcasses; fights and predators keep dropping the products at once. | One rule for every kill is the DF mechanic and keeps the game consistent. CRAFTING D11 ("drops always drop") meant "no skill gate on a kill's products"; A keeps that intent (butchery has no level gate, and bare hands are allowed, R3) and reads D11 as "the carcass always lies there". B keeps UF_Combat's `death` check passing unchanged (§9.3). |
| R2 | Which skill does butchering train? | **A: `hunting`** (V63's skill list unchanged). · B: a new skill named "butchery" (adds a skill to V63's list). | A needs no new skill. DF has a separate butcher skill; V63 lists none. |
| R3 | Does butchering need a tool? | **A: No. A carried knife works at 2× speed, an axe at 1.5×, bare hands at 0.5×** (catalog `remains.butcher.tools`). · B: a cutting tool is required (`needsTool: true`, one value), which is the brief's "anyone with a knife". | Under B, a band with no knife can't eat what it kills. The colony plan puts `knives` 3rd and `food` 6th (`colony.plan`), but hunger can send a colonist hunting before any knife exists. CRAFTING P18 lets bare hands fell common trees at half speed for the same reason (V35, V67: work begins at once). |
| R4 | People's remains | **A: never butchered, by anyone; they stay, marked for burial (a later topic).** · B: cultures may differ (needs approved culture data, V76; no lore invented here). | Nothing approved says any culture does otherwise. |
| R5 | Unease from rot and bodies | **A: a cheap version now. Colonists within 4 cells of a rotting carcass, or 6 cells of a person's body, get a thought once per 6 game hours, stronger for kin (§3.10).** · B: nothing until rooms and burial exist. | Costs one pass per game hour over a handful of carcasses (§7). DF's version is indoor-only; we have no room detection in this plugin, so ours is a short outdoor radius. |
| R6 | Numbers | **Our own tuning:** size classes, decay hours, butcher strokes and chances, experience (tables §3.4-§3.6). | V28: no DF numbers. They are catalog values, changed without code. |
| R7 | Who owns butchered products? | **A: nobody (unowned), like every other gathered item today; the carcass records who killed it.** · B: claimed for the killer's faction through `UF.Ownership.claim` (UF_Ownership.js:153). | V71 says ownership is recorded "where applicable" and forbids inferring theft or transfer rules; gathering claims nothing today, so A changes nothing. |
| R8 | Bone goods without a use yet | **A: build the needle, fishhooks and arrowheads now** (the brief asks for them). Their consumers come with CRAFTING C1/C2 (sewing with a needle, fishing lines, arrows from heads). · B: only the needle now. | A gives the bone economy a start; §14 lists each item that has no consumer yet. Bone meal waits for farming (no farming job exists: `docs/systems/UF_Skills.md`, "farming, healing: nothing yet"). |

## 1. The mechanic in Dwarf Fortress (our words)
In DF a creature that dies leaves its body in the world as a physical thing, and pieces cut off in a fight lie as separate pieces. A worker carries a hunted or slaughtered animal to a butcher's workshop and cuts it up. What comes out depends on what the body is made of and how big it is: the soft tissues give meat and organ cuts, fat, and the skin as a raw hide; the hard tissues give bones, a skull, teeth, horns, hooves, hair, feathers or shell. A bigger body gives proportionally more of each. Soft tissue rots with time unless it is kept cold. Rotten pieces are useless, spread a stench in enclosed spaces, and upset the people who see or smell them. Once the flesh is gone, only the hard parts remain, as loose bones and a skull. Those are raw material: carvers make ammunition, armour pieces, jewellery and trinkets from them, fat is rendered into tallow for soap, and hides go to the tanner. The remains of people are handled differently. Most peoples never butcher them. Their friends and kin are distressed until the body is laid to rest in a coffin or a tomb, and leaving the dead unburied has lasting consequences. Small bodies left outdoors eventually disappear.

## 2. What UF does today (2026-09-19)
**Three kill paths, all of which drop the species' `yields` on the death cell at once:**
| Path | Where | What it does |
|---|---|---|
| A hunt job | `UF_Jobs.js:446-479`, `define("hunt", ...)`; `apply` at :465 drops `yields` with `I.drop(prey.area, prey.x, prey.y, ...)` (:472), then `W.removeUnit(prey.id)` (:474), `job.result = { prey, species, at, yields, items }` (:475), `emit("jobs:kill", ...)` (:476) | yields on the prey's cell, the unit gone |
| A fight, and fire (UF_Fire calls it on a burn death, `UF_Fire.js:530`) | `UF_Combat.js:609`, `Combat.onUnitDeath`: yields drop at :623, equipment written as type ids drops, `combat:kill` at :654, `w.removeUnit(victim.id)` at :655 | same, plus equipment |
| A predator's kill (claimed file, not edited) | `UF_Wildlife.js` predator tick (at 13:46: drops at :1044, `emit("wildlife:kill", { predator, prey })` at :1047, `W.removeUnit(bestPrey.id)` at :1048); `prey.data.hp` is set ≤ 0 first | same, no function to wrap |

**Remains today.** `UF_Anim` wraps `UF.World.removeUnit` (`UF_Anim.js:1507`). When a death's unit sheet has death columns, it keeps the last death frame lying on the cell for `anim.remainsHours` (12) game hours (`UF.World.state.anim.remains`, entries `{ x, y, image, index, frame, dir, until, tint? }`, no area and no `z`), then it vanishes. No sheet in the live catalog has death columns (`docs/systems/UF_Anim.md`, Assets used), so **a kill leaves nothing visible today**. It emits `anim:death(unit, entry)` just before the removal (`UF_Anim.js:1087`, `:1107`).

**Bone today.** Item `bone` (stock icon 298). Species yields with bone: deer 2, aurochs 3, restless dead 3. Object `bones_pile` ("Old bones", stock tile `Outside_C` 281, `pick` → 2 bone; the campfire's ruin). Recipe `arrows_bone` takes 1 bone. There is no skull, fat, tallow, needle or hook.

**`jobs.hunt`: why it failed, and that it passes now.** The failing runs on 2026-09-19 (snapshots `land`, `paths_jobs`, `sprites_run`, `final_jobs`, `remains_probe_all`) all read `on its cell: 0 raw meat, 0 hide`, and the hunter stood at (128,135), (129,135) or (130,135) against `the hare at (128,135)`: it wasn't beside the cell the check looked at. The probe run at 13:26 logged where the items were made: `meat_raw#26 created ... at (136,135)`, eight cells east of the hare's start (128,135). Two faults in the test caused it, not in the hunt:
1. The test hare was `data: { kind: "creature", species: "hare" }`. UF_Wildlife treats `kind: "creature"` as a real animal (`speciesOf`, `UF_Wildlife.js:539`), and a hare flees a hunter within 6 cells (`FLEE_RANGE`). The hunter chased it and killed it elsewhere, and the meat and hide dropped there.
2. The check counted items on the hare's **starting** cell (`hareAt`), not the death cell. And the colonists weren't switched off; in one run (`final_jobs2`) `jobs:kill fired 4x`, most likely colonists hunting at the same time (inferred from the count, not traced).

The working-tree `UF_Jobs.js` (modified 2026-09-19 12:53, not by this run) fixed both: the hare is `kind: "test"` (Wildlife leaves it alone), the colonists are switched off for the suite (`Col.setEnabled(false)`), and the check counts on `deathAt = hunt.result.at`. **Evidence from this run:** `jobs` on a fresh snapshot of the live tree at about 13:55, `PASS jobs.hunt - hunt #20 state done, progress 60; hunter worked from (127,135) next to the hare at (128,135); hare unit gone true; on its cell: 1 raw meat, 1 hide; jobs:kill fired 1x`, `RESULT: 17 passed, 0 failed`. An earlier run at 13:40 on a snapshot with the committed `UF_Wildlife.js` (the live one didn't parse then: `SyntaxError: Unexpected token ')'` at `UF_Wildlife.js:1688`, fixed by its owner by 13:46) also passed 17/17. How it keeps passing once remains exist is in §9.2.

## 3. UF's version

### 3.1 The life of a body
```
death ─► FRESH ──(freshHours)──► ROTTING ──(rotHours)──► BONES ──(bonesDays)──► gone      (animals)
           │ butcher: every product   │ collect: hard parts only   │ collect: hard parts only
           ▼                          ▼                            ▼
     items on the carcass cell   bone, skull, feathers, wool   bone, skull, feathers, wool
people: FRESH ─► ROTTING ─► BONES (stays, marked for burial; burial is a later topic, §12)
```
Every stage change happens at a game minute fixed at death (§3.6) and is saved. Nothing about a carcass is decided per frame.

### 3.2 Which deaths leave remains
- **A death** is a removal (`world:unitRemoved`, emitted inside `World.removeUnit`, `UF_World.js:845`) where any of these holds: the unit id is inside one of UF_Remains' own kill scopes (its wraps of the hunt `apply` and of `UF.Combat.onUnitDeath`), `data.dead === true`, `data.hp <= 0`, or `UF.Anim.isDeath(unit)` (`UF_Anim.js:1052`) while UF_Anim is loaded. Any other removal leaves nothing: a despawn, a unit leaving, a test cleaning up.
- **The body** is looked up in this order:
  1. a **person** when `data.kind` is `"colonist"` or `"person"` (the rule UF_Combat uses for the chronicle, `UF_Combat.js:638`): person remains (§3.9);
  2. a **creature** whose `data.species` has an entry in catalog `remains.bodies` (§4.1): an animal carcass, unless the entry says `leaves: false` (the ice wraith leaves nothing);
  3. anything else (test units without a species, the anim suite's `$TEST_` bodies, `UF_Anim.js:1766-1770`): nothing.
- **Placement:** the unit's own cell, `{ area, x, y, z }`. A carcass never blocks movement (it's drawn under units, V68 isn't touched), and several can share a cell.

### 3.3 The record (saved) and `z`
```json
{
  "id": 12, "kind": "animal", "species": "deer", "name": "Deer", "unitId": 345,
  "faction": null, "kin": null,
  "killedBy": { "unitId": 17, "faction": "player" }, "cause": "hunt",
  "area": { "x": 0, "y": 0 }, "x": 131, "y": 140, "z": 0,
  "size": "medium", "died": 1234567,
  "stage": "fresh", "at": { "rotting": 1236007, "bones": 1238887, "gone": 1279207 },
  "parts": { "meat_raw": 3, "hide": 1, "bone": 2, "skull": 1, "fat": 1 },
  "look": { "image": "$UF_Stock_Nature_3", "index": 0, "dir": 4, "animEntry": false },
  "job": null, "burial": null
}
```
- `cause`: `hunt` (the hunt wrap), `combat` (the `onUnitDeath` wrap), `predator` (`wildlife:kill`), `fire` (UF_Fire's `fire:unitBurned(u, dmg, died)` with `died` true, emitted just before its `onUnitDeath` call, `UF_Fire.js:528-530`), `other`. `killedBy`: `null` when nobody killed it.
- `died` and `at.*` are **game minutes** (`UF.Anim.nowMinutes()`, `UF_Anim.js:1023`: UF_Core's calendar, 12 months × 28 days; without UF_Core, a saved counter `state.remains.clock`). `null` means never (a frozen body, §3.6; a person's bones).
- `parts`: what can still be taken (§3.4). Rotting removes the perishable parts. A predator's meal removes meat (§3.4).
- A person also has `kin: { motherId, fatherId }` copied from the unit, and `burial: "pending"`.
- **`z`** comes from one helper, the only place that decides a level until UF_Levels lands (V80): `const zOf = o => (o && Number.isInteger(o.z) ? o.z : 0);`. The view's level is `viewZ()`: `0` today, and one line changes it to UF_Levels' current level when that API exists (`docs/systems/UF_Levels.md`, when written). Every index is keyed by `z` (§5.3). Jobs carry `z` in `params.z` as well as `target.z`, because `UF.Jobs.create` copies only `area, x, y` of a target today (`UF_Jobs.js:583`). Items are dropped through one helper `dropAt(cell, type, n)` that calls `UF.Items.drop(area, x, y, type, n)` today and passes `z` once UF_Items takes it.
- **Falling (V80, later):** a body that dies over an `open` cell on `z = +1/+2` (a flier, a unit on a canopy) falls to the supporting level below. `landingZ(cell)` is `z` today and becomes UF_Levels' support query when it exists.

### 3.4 Products by body size
**Rule:** products = the size class's `parts` (bone, skull, fat) ∪ the species' existing catalog `yields` (meat, hide, feathers, wool, bone), where **a species value wins over the size default** so that today's tuned yields stay; then a body entry's own `parts` override (a spider has no bones). Meat and hide come only from the species' `yields`, which already grow with size.

| Size class | parts | species (our classification, mechanics only) |
|---|---|---|
| tiny | none | rat, songbird, bat |
| small | bone 1 | hare, fowl, fox, arctic fox, wildcat, jackal, hawk, serpent |
| medium | bone 2, skull 1, fat 1 | deer, wild sheep, wolf, boar, giant spider (no bones), restless dead (starts as bones, no fat), people |
| large | bone 3, skull 1, fat 2 | wild horse, troll, sand stalker (no bones) |
| huge | bone 4, skull 1, fat 3 | aurochs, bog horror |
| (none) | no remains | ice wraith |

What each species gives when butchered fresh, with the catalog of 2026-09-19:
| Species | Products |
|---|---|
| rat | meat 1 |
| songbird | meat 1, feathers 2 |
| bat | nothing (the carcass rots; nothing to butcher) |
| hare | meat 1, hide 1, bone 1 |
| fowl / hawk | meat 1, feathers 4 / 3, bone 1 |
| fox, arctic fox, wildcat, jackal, serpent | meat 1, hide 1, bone 1 |
| deer | meat 3, hide 1, bone 2, skull 1, fat 1 |
| wild sheep | meat 2, wool 1, bone 2, skull 1, fat 1 |
| wolf | meat 2, hide 1, bone 2, skull 1, fat 1 |
| boar | meat 3, hide 1, bone 2, skull 1, fat 1 |
| giant spider | meat 1 |
| restless dead | bone 3, skull 1 (it is bones from the start) |
| wild horse | meat 4, hide 1, bone 3, skull 1, fat 2 |
| troll | meat 4, hide 2, bone 3, skull 1, fat 2 |
| sand stalker | nothing yet (CRAFTING proposes chitin) |
| aurochs | meat 6, hide 2, bone 3 (the species' own 3 wins over huge's 4), skull 1, fat 3 |
| bog horror | bone 4, skull 1, fat 3 |

- **Perishable parts** (catalog `remains.perishable`): `meat_raw`, `fat`, `hide`. They are gone once the carcass rots. Bone, skull, feathers and wool keep (hard tissue and hair don't rot).
- **Predator kills:** the predator eats first. `remains.feed[predator's size]` meat (small 1, medium 2, large 3, huge 4) comes off the carcass's meat at creation.
- **No skill roll changes the counts.** Butchery is always complete. Skill changes how long it takes (§3.5). That keeps a hare at exactly 1 meat and 1 hide, which `jobs.hunt` counts. The V63 "yield more" effect still reaches hunts through UF_Skills' existing extra-yield roll (§3.5).

### 3.5 Butchering: the job, its time and its difficulty (V85)
**Job type `butcher`** (defined by UF_Remains with `UF.Jobs.define`; UF_Jobs is not edited). `params: { carcassId, z, butcher? }`, target = the carcass cell.
- **plan:** the carcass exists, isn't a person, has something in `parts` for its stage, and isn't reserved by another job (`carcass.job` is null or this job). Then it stands **beside** the carcass (`UF.Jobs.standFor(target, unit, true)`, the hunt's rule), because the jobs suite checks that the hunter worked from the next cell. Failure reasons: "the carcass is gone", "nothing left to take", "needs a knife" (only with `needsTool: true`), "can't reach it". At the first plan it computes the time and stores it in `params.butcher` (below), so a reload never rolls again.
- **work (V85: beats, and a success chance per attempt that rises with level):** the carcass's size row gives `strokes` (successes needed), `beats` per attempt and `chance: [at level 1, at level 99]`. A rotting or bones carcass uses the `collect` row instead.
  ```
  level    = UF.Skills.level(unit, remains.butcher.skill)          // 1 for anyone who isn't a person
  p        = chance[0] + (chance[1] - chance[0]) × (level − 1) / 98
  attempts = number of seeded draws until `strokes` successes (cap strokes × 20)
             rng = UF.World.mulberry32(UF.World.hash32(seed, SALT_BUTCHER, jobId, carcassId, phase))
  tool     = best carried cutting tool: tag "knife" 2, tag "axe" 1.5, none 0.5
  ticks    = ceil(attempts × beats × beatTicks() / tool)            // beatTicks() = UF.Beat.frames, else 60
  ```
  A failed attempt costs its time only (V85's "time only"). For the `butcher` job type, UF_Jobs' own multipliers are 1: `butcher` is deliberately not mapped with `UF.Skills.mapJob`, so `UF.Skills.rate` returns 1, and no item has `tool.butcher`. `data.workRate` still applies.
- **What the numbers give** (our tuning, catalog `remains.sizes[*].butcher`):

  | Size | strokes | beats per attempt | chance at 1 → 99 | expected time at level 1 with a knife | bare hands |
  |---|---|---|---|---|---|
  | tiny | 1 | 1 | 0.90 → 1.00 | 0.6 beats | 2.2 beats |
  | small | 2 | 1 | 0.80 → 1.00 | 1.3 beats | 5 beats |
  | medium | 3 | 2 | 0.70 → 0.98 | 4.3 beats | 17 beats |
  | large | 5 | 2 | 0.60 → 0.95 | 8.3 beats | 33 beats |
  | huge | 8 | 2 | 0.50 → 0.90 | 16 beats | 64 beats |
  | collect (rotting, bones) | 1 | 1 | 1.00 | 0.5 beats | 2 beats |

  For comparison with today's catalog, where 1 beat = 60 map updates = 1 game minute at ×1: roasting meat is 1.5 beats, chopping an oak 4, mining 5. A hare takes about as long as roasting a steak, a deer about as long as felling an oak, an aurochs four times that (the user's V85 example: "cooking a smores isnt the same time/difficulty as chopping down a tree").
- **apply:** drops the stage's `parts` on the carcass cell with `dropAt` (CRAFTING D6: yields lie where the work was done; haulers and `fetch` move them), removes the carcass, clears UF_Anim's lying frame on that cell (`UF.Anim.clearRemains(e => e.x === c.x && e.y === c.y && e.image === c.look.image)`, `UF_Anim.js:1039`), pays `strokes × xpPerStroke` experience to `remains.butcher.skill` with `UF.Skills.add` (`UF_Skills.js:498`) once (`params.butcher.xpPaid`), sets `job.result = { carcass, species, at, products, items, yields: products }`, and emits `remains:butchered`.
- **cancel / fail:** `carcass.job = null`. If the carcass is eligible (below), an open designation is made again, so a hunter pulled away by hunger (`UF_Colonists.js` scan, "too hungry to go on") doesn't strand the meat.
- **describe:** fresh, "Butchering a deer"; rotting or bones, "Collecting deer bones".

**The hunter butchers his own kill (the hunt chain).** UF_Remains wraps the hunt handler (`UF.Jobs.handler("hunt")`, the object `UF_Jobs.js:446` registers) at runtime:
- `apply` (phase 0): opens a kill scope for the prey (§6, the diversion), runs the original, then, if the kill made a carcass with something to take, stores `params.carcassId` and returns `"continue"`. UF_Jobs' `finish` (`UF_Jobs.js:805-829`, the `"continue"` branch at :815) moves the job to phase 1 and plans it again. No carcass (no body entry, a test unit, the ice wraith): the original result stands and the hunt is done as today.
- `plan`, `work`, `describe`, `cancel` in phase ≥ 1: the `butcher` rules above, on the same job. `work` in phase 1 is `ceil(ticks × UF.Jobs.toolMultiplier(unit, job) × UF.Skills.rate(unit, "hunt", job))`, which cancels UF_Jobs' own multipliers for the hunt type (`UF_Jobs.js:763`, `:783`), so the time is the same as a `butcher` job by the same worker. Phase 1 sets `job.barked = true` so UF_Visuals doesn't bark "Hunting" again.
- `apply` (phase 1): the `butcher` apply, keeping the phase-0 `job.result` fields (`at` above all, which `jobs.hunt` and UF_Skills' extra yield read) and setting `yields` to the products. So `jobs:done` of the hunt comes after the butchering, and UF_Skills' existing extra-yield roll on hunts (`UF_Skills.js:525-555`, first yield of `job.result.yields` at `job.result.at`) still adds its chance of one more meat.
- `jobs:kill` still fires once, in phase 0, from the original apply.

**Who else butchers: open designations.** An open `butcher` job (no owner) is made when a carcass appears with something to take and it isn't a person, **and** (a) the killer is a unit of the player's faction, or (b) the carcass lies within `designate.radius` (default: `colony.huntRadius`, 45) of `UF.Colonists.site()` in the same area and on the same `z`. Victims of kind `test` never get an automatic designation, so other suites' test kills don't send colonists across their arenas (the `remains` suite designates explicitly). The right-click menu makes one on any carcass (§3.11). Colonists take designations through `designationJob` (`UF_Colonists.js:982`) with `priority: designate.priority` (2); `priorityOf("butcher")` defaults to 1. Carcasses away from the colony just rot. Other factions' sites butcher nothing until their societies run jobs (the "Paths and DF life" work, `UF_Society.js`, not built yet).

**A butchering place (later).** DF butchers at a workshop. No catalog object has a `butcher` tag on 2026-09-19, so butchery happens at the carcass. The catalog already holds `butcher.place: { tag: "butcher", radius: 30, speed: 1.5 }`, unused until such an object exists. Then a carcass within the radius is carried there first (a carried carcass, size-scaled carry speed) and butchered at 1.5× speed, with the products dropping at the place. The object's name is a proposal (§11).

### 3.6 Decay by game time
- **Stage times are fixed at death** and saved in `at`: `rotting = died + round(freshHours × 60 / rate)`, `bones = rotting + round(rotHours × 60 / rate)`, `gone = bones + bonesDays × 1440` (animals; `bonesDays` 0 means gone straight after rotting, as for tiny bodies that leave no bones). People: `gone = null`.
- **Durations** (game hours at `rate` 1; 1 game hour = 1 real minute at ×1):

  | Size | fresh | rotting | bones lie |
  |---|---|---|---|
  | tiny | 6 h | 12 h | nothing left |
  | small | 12 h | 24 h | 7 days |
  | medium | 24 h | 48 h | 28 days |
  | large | 36 h | 72 h | 28 days |
  | huge | 48 h | 96 h | 56 days |
  | person | 24 h | 72 h | until burial |
- **`rate`** (how fast it rots) = the death cell's biome factor × its level factor, read **once at death** (`UF.WorldGen.cellInfoLocal(ax, ay, x, y).biomeId`; no lookups afterwards). Biomes: glacier 0 (frozen: it stays fresh, `at.rotting = null`), tundra 0.25, taiga 0.5, mountain 0.5, desert sand/rock/badland 0.75 (dry), tropical moist forest, tropical marshes and swamps and mangrove 1.5, everything else 1. Levels: `z = -1` 0.75, `z = -2` 0.5. Our numbers.
- **Restless dead** start at `bones` (`bodies.restless_dead.startStage`).
- **Scheduling (V50):** a binary min-heap of `{ at, id }` (ties by id), rebuilt from the saved list on load and never saved. UF_Remains listens to `time:minute` (`UF_Core.js:297`; one event per game minute, and one per clock jump such as `AddTime`). On each it pops every entry with `at <= nowMinutes()`, at most 200 per call (the rest wait for the next minute), and applies the change. It does no work while nothing is due. Without UF_Core it counts map updates like UF_Anim does. A **stage change** sets `stage`; at `rotting` it deletes the perishable parts, hands the look over from UF_Anim's lying frame to its own (§3.11), and emits `remains:stage(c, from, to)`. At `gone` it removes the record and emits `remains:removed(c, "crumbled")`.
- **Cap:** 400 animal carcasses and 200 people (`remains.cap`). A new animal carcass past the cap removes the oldest in `bones`, else the oldest `rotting`, else the oldest `fresh` without a job (`remains:removed(c, "cap")`). People are never dropped for an animal. At the people cap, the oldest person in `bones` goes, with a chronicle-free `remains:removed(c, "cap")`. §14 lists this as a limit.

### 3.7 Bones, skulls and the other hard parts
Rotting and bones carcasses keep their hard parts (`bone`, `skull`, `feathers`, `wool` where the species had them). **Collecting** them is the same `butcher` job with the `collect` row (1 stroke, 1 beat, no difficulty). It's offered in the menu as "Collect the deer bones" and designated like butchery. The items drop on the cell as ordinary items (`bone`, the new `skull`), so the existing haul, fetch and stockpile code moves them. Bones left alone crumble away at `gone`. That's DF's disappearance of old outdoor remains, and it keeps saves bounded. The world's existing `bones_pile` objects are unchanged.

### 3.8 Bone and fat work (V66)
Recipes are appended to `recipes.list`. `work` is in map updates (what UF_Jobs reads today) = `beats` × 60. `beats` and `minLevel` are the V85/V84 fields: WORK_TIMING.md adopts `beats` when it converts the job data, and `UF.Skills.meets` reads `minLevel` (not enforced by UF_Jobs until CRAFTING C2 or WORK_TIMING lands). Ids match CRAFTING §2.5 where it names them.

| id | name | inputs | outputs | beats (work) | at | tool (speeds it) | skill, minLevel | consumer |
|---|---|---|---|---|---|---|---|---|
| `bone_needle` | Carve a bone needle | bone 1 | bone_needle 1 | 2 (120) | anywhere | knife | crafting 1 | CRAFTING's sewing and leather pieces carry a needle (C1/C2); none today |
| `bone_hook` | Carve bone fishhooks | bone 1 | bone_hook 3 | 2 (120) | anywhere | knife | crafting 2 | CRAFTING's `fishing_line` (it takes "1 bone" as the hook); none today |
| `bone_heads` | Carve bone arrowheads | bone 1 | bone_heads 12 | 3 (180) | anywhere | knife | crafting 3 | CRAFTING's arrows from heads (C1); today `arrows_bone` still takes 1 bone |
| `render_fat` | Render fat | fat 2 | tallow 1 | 3 (180) | `fire` | – | cooking 1 | CRAFTING's `comfrey_salve`; candles and soap later (§12) |

Bone meal (from bone or a skull, for fields) is designed but not added: no farming job exists. It is one item and one recipe once farming lands (§12). Experience comes from UF_Skills' existing craft formula (`xp.base + xp.perWork × work`) for the recipe's skill, as for every recipe today.

### 3.9 People's remains
- A person's death makes `kind: "person"` remains with `parts: {}`, `burial: "pending"`, the person's `name`, `faction`, `unitId` and `kin`. They are never butchered and never designated (R4). Their carried items drop as today (UF_Items on `world:unitRemoved`), and UF_Combat still writes the chronicle line.
- They go fresh, then rotting, then bones, on the person row of §3.6, and **stay in the bones stage until burial**, a later topic (§12). Nothing else happens to them yet.
- Look: the AR-600 death frame when the person's sheet has one (UF_Anim draws it while fresh), else the stock placeholder of §10.

### 3.10 Unease (R5, cheap)
Once per game hour (`time:hour`, `UF_Core.js:306`), for carcasses **in the view's area and `z` only** (the level index, §5.3) that are rotting, or are a person's fresh or rotting body, UF_Remains finds the colonists (`UF.Colonists.list()`, same area and `z`) within the radius. For each, at most once per `cooldownHours` (6) per kind, it adds a thought through `UF.Colonists.addThought` (`UF_Colonists.js:193`, public):
- rot within 4 cells: "Caught the stench of rotting flesh." (−3);
- a person's body within 6 cells: "Saw the body of {name}." (−6);
- kin (the dead's mother, father, or child, by `motherId`/`fatherId`): "Grieved over the body of {name}." (−12).

The cooldown stamp is `unit.data.remainsThought = { rot: minute, body: minute }`, saved with the unit. The cost is carcasses in view × colonists, once per game hour (§7). Off-screen areas and levels get no thoughts: a known limit, cheap by design.

### 3.11 Look, menu and drawing
- **Drawing:** a pooled sprite layer in the tilemap, like UF_Items' (`Sprite_UFItemLayer`). `z` = foot row − 2, so remains draw above flat objects and stance squares and under items (foot − 1) and units (foot), the same depth UF_Anim uses for its lying frame. Only the view's area and `z` are drawn, and the visible set is rebuilt only when the view moves by a cell, the zoom or level changes, or the remains change (a version counter). A **fresh** carcass whose death UF_Anim recorded (`look.animEntry`) is drawn by UF_Anim, and UF_Remains draws nothing for it. UF_Remains sets that entry's `until` to the carcass's `at.rotting` in its `anim:death` listener, so the lying frame lasts exactly the fresh stage. Every other stage and carcass is drawn by UF_Remains from `remains.look` (§10). No motion, no fading, no rotation (V58, V60); a stage's tint is a fixed colour.
- **Look tooltip:** the carcass is line 1 when no unit stands on the cell: "Deer carcass · fresh", "Deer carcass · rotting", "Deer bones", "Body of Alald · rotting". It goes in the same way UF_Ownership already decorates the tooltip without editing UF_Look: aliases of `UF.Look.inspect` and `UF.Look.describeCell` plus `UF.Look.TipSprite.prototype.update` (UF_Look.js:278, :412, :410; the precedent is `UF_Ownership.js:431-458`, `hookLook`). Items on the cell move to line 1 after the carcass text ("Deer carcass · fresh · 1 × Bone").
- **Right-click menu:** "Butcher the deer carcass" (fresh), "Collect the deer bones" (rotting or bones), none for people. UF_Interact builds its list in a closure (`optionsFor`, `UF_Interact.js:431`), so an alias of the public `UF.Interact.optionsFor` wouldn't reach the menu. The no-edit route is an alias of `UF.Interact.MenuWindow.prototype.initialize(rect, options, header, cell)` (`UF_Interact.js:503-504`, exported at :577; the mouse path opens it through `Interact.open`, :701). It inserts the option before "Look" when the cell holds a carcass and grows `rect.height` by one row. The choice calls `UF.Interact.designate({ type: "butcher", target, params })`, so it gets the usual marker and "Cancel designation". The cleaner route, a provider list in `optionsFor` and `subjectAt`, is an edit to UF_Interact and UF_Look (§6.2, E5), the owners' call.

## 4. Catalog (appended by a layout-preserving node script, `tools/add_remains_catalog.js`)
The script re-reads the catalog right before writing, adds only the key `remains`, appends the new `items.types` and `recipes.list` entries (never reordering or changing others), and asserts that every other key and entry is byte-identical before and after. It refuses to run if any of its ids already exist with different content.

### 4.1 Key `remains`
```json
"remains": {
  "about": "Carcasses, butchery, decay and bones (UF_Remains; docs/design/REMAINS.md). Sizes, hours, strokes, chances and experience are our own tuning (VISION V28).",
  "v": 1,
  "cap": { "animals": 400, "people": 200 },
  "sizes": {
    "tiny":   { "parts": { "bone": 0, "skull": 0, "fat": 0 }, "butcher": { "strokes": 1, "beats": 1, "chance": [0.9, 1.0],  "xpPerStroke": 2 }, "decay": { "freshHours": 6,  "rotHours": 12, "bonesDays": 0 } },
    "small":  { "parts": { "bone": 1, "skull": 0, "fat": 0 }, "butcher": { "strokes": 2, "beats": 1, "chance": [0.8, 1.0],  "xpPerStroke": 2 }, "decay": { "freshHours": 12, "rotHours": 24, "bonesDays": 7 } },
    "medium": { "parts": { "bone": 2, "skull": 1, "fat": 1 }, "butcher": { "strokes": 3, "beats": 2, "chance": [0.7, 0.98], "xpPerStroke": 2 }, "decay": { "freshHours": 24, "rotHours": 48, "bonesDays": 28 } },
    "large":  { "parts": { "bone": 3, "skull": 1, "fat": 2 }, "butcher": { "strokes": 5, "beats": 2, "chance": [0.6, 0.95], "xpPerStroke": 2 }, "decay": { "freshHours": 36, "rotHours": 72, "bonesDays": 28 } },
    "huge":   { "parts": { "bone": 4, "skull": 1, "fat": 3 }, "butcher": { "strokes": 8, "beats": 2, "chance": [0.5, 0.9],  "xpPerStroke": 2 }, "decay": { "freshHours": 48, "rotHours": 96, "bonesDays": 56 } }
  },
  "collect": { "strokes": 1, "beats": 1, "chance": [1, 1], "xpPerStroke": 1 },
  "bodies": {
    "rat": { "size": "tiny" }, "songbird": { "size": "tiny" }, "bat": { "size": "tiny" },
    "hare": { "size": "small" }, "fowl": { "size": "small" }, "fox": { "size": "small" }, "arctic_fox": { "size": "small" },
    "wildcat": { "size": "small" }, "jackal": { "size": "small" }, "hawk": { "size": "small" }, "serpent": { "size": "small" },
    "deer": { "size": "medium" }, "wild_sheep": { "size": "medium" }, "wolf": { "size": "medium" }, "boar": { "size": "medium" },
    "giant_spider": { "size": "medium", "parts": { "bone": 0, "skull": 0, "fat": 0 } },
    "restless_dead": { "size": "medium", "parts": { "fat": 0 }, "startStage": "bones" },
    "wild_horse": { "size": "large" }, "troll": { "size": "large" },
    "sand_stalker": { "size": "large", "parts": { "bone": 0, "skull": 0, "fat": 0 } },
    "aurochs": { "size": "huge" }, "bog_horror": { "size": "huge" },
    "ice_wraith": { "leaves": false }
  },
  "person": { "size": "medium", "butcher": false, "burial": true, "decay": { "freshHours": 24, "rotHours": 72, "bonesDays": null } },
  "perishable": ["meat_raw", "fat", "hide"],
  "rot": {
    "biomes": { "glacier": 0, "tundra": 0.25, "taiga": 0.5, "mountain": 0.5, "desert_sand": 0.75, "desert_rock": 0.75, "desert_badland": 0.75,
      "forest_tropical_moist_broadleaf": 1.5, "marsh_tropical_fresh": 1.5, "marsh_tropical_salt": 1.5, "swamp_tropical_fresh": 1.5, "swamp_tropical_salt": 1.5, "swamp_mangrove": 1.5 },
    "levels": { "-2": 0.5, "-1": 0.75 }
  },
  "butcher": { "jobType": "butcher", "skill": "hunting", "needsTool": false, "tools": { "knife": 2, "axe": 1.5, "none": 0.5 }, "huntChain": true,
    "place": { "tag": "butcher", "radius": 30, "speed": 1.5 } },
  "designate": { "playerKills": true, "radius": null, "priority": 2 },
  "feed": { "tiny": 0, "small": 1, "medium": 2, "large": 3, "huge": 4 },
  "unease": { "cooldownHours": 6,
    "rot":  { "radius": 4, "text": "Caught the stench of rotting flesh.", "strength": -3 },
    "body": { "radius": 6, "text": "Saw the body of {name}.", "strength": -6 },
    "kin":  { "text": "Grieved over the body of {name}.", "strength": -12 } },
  "look": { "tile": { "sheet": "Outside_C", "id": 281 }, "tints": { "fresh": "#d87070", "rotting": "#9a9a60", "bones": null },
    "person": { "image": "Damage1", "index": 0, "row": 2, "col": 2 } }
}
```
`designate.radius: null` means `colony.huntRadius`. A species missing from `bodies` (a species added later) gets `medium` and a warning in the suite's catalog check, so a new creature never silently leaves nothing.

### 4.2 Appended item types (`items.types`)
| id | name | image (stock placeholder, §10) | tint | tags | stack | other |
|---|---|---|---|---|---|---|
| `skull` | Skull | `!$UF_Icon_17` | `#e8e0d0` | bone, skull, material | 5 | material bone, weight 0.5 |
| `fat` | Fat | `!$UF_Icon_267` | `#f0e0b0` | fat, material, raw | 10 | weight 0.5 (not food; it's rendered) |
| `tallow` | Tallow | `!$UF_Icon_211` | `#f0e8c8` | tallow, material | 10 | weight 0.5 |
| `bone_needle` | Bone needle | `!$UF_Icon_225` | `#e8e0d0` | tool, needle, bone | 5 | material bone, weight 0.05 |
| `bone_hook` | Bone fishhook | `!$UF_Icon_294` | `#e8e0d0` | hook, bone | 10 | material bone, weight 0.02 |
| `bone_heads` | Bone arrowheads | `!$UF_Icon_298` | `#c8c0b0` | arrowhead, bone | 24 | material bone, weight 0.01 |
They satisfy UF_Items' `catalog_types` rules (a `!$` image, stack ≥ 1, a tags array, `#rrggbb` tint), and `images_exist` once the stock icons are cut (`tools/extract_stock_icons.js --only 17,211,225,267,294`; 298 exists). None has `tool` or `wear`, so none can be equipped; the needle works as a recipe `tool` tag when CRAFTING uses one.

### 4.3 Appended recipes (`recipes.list`)
```json
{ "id": "bone_needle", "name": "Carve a bone needle", "inputs": { "bone": 1 }, "outputs": { "bone_needle": 1 }, "work": 120, "beats": 2, "at": null, "tool": "knife", "skill": "crafting", "minLevel": 1, "material": "bone" },
{ "id": "bone_hook", "name": "Carve bone fishhooks", "inputs": { "bone": 1 }, "outputs": { "bone_hook": 3 }, "work": 120, "beats": 2, "at": null, "tool": "knife", "skill": "crafting", "minLevel": 2, "material": "bone" },
{ "id": "bone_heads", "name": "Carve bone arrowheads", "inputs": { "bone": 1 }, "outputs": { "bone_heads": 12 }, "work": 180, "beats": 3, "at": null, "tool": "knife", "skill": "crafting", "minLevel": 3, "material": "bone" },
{ "id": "render_fat", "name": "Render fat", "inputs": { "fat": 2 }, "outputs": { "tallow": 1 }, "work": 180, "beats": 3, "at": "fire", "skill": "cooking", "minLevel": 1 }
```
UF_Jobs' `describe` makes "Carving a bone needle", "Carving bone fishhooks", "Carving bone arrowheads", "Rendering fat". UF_Colonists' `cookRecipeFor` only picks recipes whose output is food, so `render_fat` never replaces roasting.

## 5. `UF.Remains`: API, events, indexes

### 5.1 API
| Member | What it does |
|---|---|
| `get(id)`, `list(filter?)`, `byUnit(unitId)` | A record / records matching a filter / the remains of a dead unit |
| `at(area, x, y, z = viewZ())`, `inView()` | Records on a cell / records in the view's area and `z` |
| `create(spec)` | Make remains without a death (tests, scripted scenes): `{ species \| person: unit-like, area, x, y, z?, cause?, killedBy?, died? }`; returns the record |
| `kill(victim, killer, cause)` | For plugins that kill outside UF_Combat (the predator tick, E2): marks the death, removes the unit, makes the carcass; no yields drop |
| `feed(id, amount, eaterId?)` | A predator or scavenger eats meat off a carcass; returns what was eaten |
| `productsOf(recordOrSpec, stage?)` | What butchering or collecting gives at a stage |
| `butcherPlan(unit, record)` | `{ level, chance, attempts, beats, ticks, tool }` for that worker (look card, tests) |
| `designate(id, priority?)` | The open `butcher` job for a carcass (one per carcass) |
| `remove(id, reason)`, `clear(filter?)` | Remove one / many (tests) |
| `bodyOf(speciesId)`, `sizes()` | The body entry with its size row / the size table |
| `describe(x, y)` | The look text for a cell on screen, or `null` |
| `step()` | Run the decay scheduler now (tests) |
| `install()`, `installed` | Re-apply every wrap (at load, boot and map start) / which wraps are in |
| `stats`, `perf`, `errors` | Counters (created, butchered, stages, removed by reason, diverted, takenBack) / timings / the last 20 errors caught |
| constants | `STAGES` `["fresh","rotting","bones"]`, `SALT_BUTCHER`, `HEAP_CATCHUP` 200 |

### 5.2 Events
- Emits `remains:created(record, unit)`, `remains:stage(record, from, to)`, `remains:butchered(record, job, unit, itemIds)`, `remains:removed(record, reason)` with `reason` `"butchered" | "crumbled" | "cap" | "cleared"` (and `"buried"` later).
- Listens to `world:unitRemoved` (deaths), `anim:death` (UF_Anim's lying-frame entry), `wildlife:kill` (the predator path, §6), `time:minute` (decay), `time:hour` (unease), `world:created` (a new world: empty state, indexes reset), `jobs:failed` (a butcher job lost: `carcass.job = null`, designate again if eligible).

### 5.3 Indexes (rebuilt from the state, never saved)
`byId` (Map), `byCell` (key `ax,ay,z,x,y` → ids), `byLevel` (key `ax,ay,z` → Set of ids, used by drawing and unease), `byUnit` (dead unit id → id), the decay heap. They are rebuilt on load (`DataManager.extractSaveContents` alias), on `world:created`, and on any change to the list.

## 6. Hooks into other plugins (aliases from UF_Remains; no other file edited)
### 6.1 The hooks
| # | Hook point (file:line, anchor) | How | Why |
|---|---|---|---|
| H1 | `UF_World.js:839-847` `World.removeUnit`, emits `world:unitRemoved` at :845 | listener (no wrap; UF_Anim already wraps `removeUnit`, and a second wrapper would make UF_Anim wrap again at every boot, because it checks only the outermost function, `UF_Anim.js:1507`) | the one place every death passes through |
| H2 | `UF_Jobs.js:446-479` the hunt handler (`plan` :449, `work` :460, `apply` :465, `describe` :478), got with `UF.Jobs.handler("hunt")`; re-wrapped after any `UF.Jobs.define("hunt")` (`UF_Jobs.js:206`) at boot and map start | wraps of `plan`, `work`, `apply`, `describe`, `cancel`, phase-aware; the original runs for phase 0 | the kill scope, and the hunter's butcher phase through `finish`'s `"continue"` (`UF_Jobs.js:815`) |
| H3 | `UF_Combat.js:609` `Combat.onUnitDeath` (yields drop at :623) | wrap: a kill scope around the original (UF_Anim wraps it too, `UF_Anim.js:1532`; the two compose) | fights and fire deaths leave carcasses, and their yields aren't dropped |
| H4 | `UF_Items.js:223` `Items.drop(area, x, y, typeId, count)` | wrap: **inside a kill scope only**, a drop on the victim's cell of a type in the victim's species `yields` and exactly that count is swallowed (recorded as `stats.diverted`); every other call goes straight through, and equipment still drops | the carcass holds the products; nothing is created and then taken back on these paths |
| H5 | `UF_Wildlife.js` predator kill (13:46: `I.drop(bestPrey...)` :1044, `emit("wildlife:kill", ...)` :1047, `W.removeUnit(bestPrey.id)` :1048), claimed file | `wildlife:kill` listener: **take-back**. From the prey's cell it removes up to `yields[id]` of each yield type, newest item ids first (`UF.Items.consume`), then the removal at :1048 makes the carcass with the predator's meal taken off | the only kill path with no function to wrap; E2 would replace this |
| H6 | `UF_Anim.js:1107` `emit("anim:death", u, entry)`; `:1052` `isDeath`; `:1039` `clearRemains`; `:1023` `nowMinutes` | listener; reads | the lying frame lasts the fresh stage; UF_Anim's death rule counts as a death; the same game-minute clock |
| H7 | `UF_Look.js:278` `inspect`, `:412` `describeCell`, `:410` `TipSprite` | aliases, the pattern of `UF_Ownership.js:431-458` | the tooltip names the carcass |
| H8 | `UF_Interact.js:503-504` `Window_UFContextMenu.initialize`, exported as `MenuWindow` (:577) | alias that inserts the option and grows the rect by one row | "Butcher the deer carcass" / "Collect the deer bones" |
| H9 | `UF_Skills.js:498` `add`; `level`; `rate`; `:172` `mapJob` (deliberately **not** used for `butcher`) | calls | butcher experience and chance; phase-1 time cancels the hunt rate |
| H10 | `UF_Colonists.js:193` `addThought` (public), `site()`, `list()`; `:982` `designationJob` takes open jobs | calls; no alias | unease; the designation radius; who butchers |
| H11 | `UF_Core.js:297` `time:minute`, `:306` `time:hour` | listeners | decay and unease on game time |
| H12 | `UF_Jobs.js` `standFor` (:148), `toolMultiplier` (:763), `create` (:583) | calls | stand beside; cancel the hunt's tool multiplier; designations |

**Wrap rule** (so the wraps don't pile up across boots, map starts and other plugins' re-wraps): every UF_Remains wrapper carries `_ufRemains = true` and `_ufOrig = original` (UF_Anim's field name), and before wrapping a function UF_Remains walks the `_ufOrig` chain looking for its own marker. UF_Anim checks only the outermost function (`isWrap`, `UF_Anim.js:1477`; `wrapHunt` at :1483), so at the first boot after UF_Remains wraps the hunt `apply`, UF_Anim adds one more layer of its own. Its `dying` guard (`!dying.has(preyId)`, :1489) makes that inner second layer a no-op, and nothing grows after that.

### 6.2 Edits in other files: needed or wanted (listed here, not made)
| # | File (owner) | Change | Needed? |
|---|---|---|---|
| E1 | `UF_Combat.js` check 11 `death` (:1921-1944; the V64 run's file) | "the species yields drop" becomes: yields on the cell **or**, with `UF.Remains` loaded, a fresh carcass on the cell whose `productsOf` includes every yield. About 3 lines. | **Yes, before registration under R1-A:** without it `combat.death` fails with `dropsOk false` (§9.3). |
| E2 | `UF_Wildlife.js` predator kill (claimed) | Call `UF.Remains.kill(bestPrey, u, "predator")` when it exists, instead of dropping yields and removing the prey | Wanted; H5's take-back covers it until then |
| E3 | `UF_Colonists.js` `foodJob` (:698) | A fresh carcass within `FOOD_ITEM_RADIUS` counts like "a fresh kill": the hungry colonist butchers it | Wanted. Without it, a hunter pulled away by hunger in the butcher phase leaves the job to a colonist who isn't hungry (§14) |
| E4 | catalog `skills.effects.extraYield.jobs` (UF_Skills' key) | add `"butcher"` so a designated butcher gets V63's "yield more" roll too (hunts already do) | Wanted; the user decides whether butchery should roll extra at all |
| E5 | `UF_Look.js` `subjectAt` (:203), `UF_Interact.js` `optionsFor` (:431) | one provider list each (`Look.subjects`, `Interact.providers`) that later plugins can use | Optional; replaces H7/H8's aliases with a public extension point |
| E6 | catalog `anim.about` | still says remains fade over the last hour; UF_Anim never fades them (`docs/systems/UF_Anim.md`, "Wanted in other files") | Pre-existing, not caused here |

## 7. Scheduling and budgets (V50)
| Work | When | Cost bound | Budget (the `remains.perf` check) |
|---|---|---|---|
| Death → record | at each death | O(1) plus one biome lookup | inside the kill call |
| Decay | `time:minute` | peek the heap; O(k log n) for k changes | ≤ 0.05 ms per game minute with 600 records and nothing due; ≤ 2 ms for 100 changes in one minute |
| Drawing | per frame | a lookup of the view's level index; a rebuild only on view move, zoom, level or version change | median ≤ 0.3 ms over 120 frames with 200 carcasses in view at zoom ⅓ |
| Unease | `time:hour` | carcasses in view × colonists | ≤ 0.5 ms per game hour with 50 rotting carcasses and 100 colonists |
| Save | on save | about 250 bytes per record | ≤ 200 KB at both caps (600 records) |
| Randomness | butcher attempts only | seeded `mulberry32(hash32(...))` | no `Math.random`; nothing reads `Graphics.frameCount` |

## 8. Save format and old saves
- `UF.World.state.remains = { v: 1, nextId, list: [record], clock? }`, saved with the world (`contents.ufWorld`). `clock` is only there without UF_Core.
- **Old saves:** no `remains` key, so it's created empty on first use. UF_Anim's `state.anim.remains` entries are untouched. Items that old hunts dropped stay items. Hunt jobs saved in phase 0 finish under the new rules. No past death gets a carcass after the fact.
- **A save made with UF_Remains, loaded without it:** `state.remains` rides along unread. Open `butcher` jobs fail with UF_Jobs' "unknown job type". A hunt saved in phase 1 fails with "the prey is gone", and that carcass's products are lost. Documented, not prevented.
- **Catalog changes:** a record whose species left the catalog keeps its `size` and `parts`, so it still decays and butchers. `v` is there for the first migration.

## 9. Checks (suite `remains`) and what happens to other suites

### 9.1 The suite
The suite makes its units on a cleared arena south of the map centre (the jobs suite's pattern), switches the colonists off (`UF.Colonists.setEnabled(false)`) and gives creatures `ai: "none"` so nothing wanders. It restores everything at the end. **Every check is seen failing** through a behaviour fault, not by ANDing a flag into the verdict: `UF_TEST_PROVOKE=remains.<check>` (the switch pattern of `UF_Ownership.js:78-84`: inert unless UF_Test is active and the launcher sets the variable) breaks the mechanism the check measures. The build runs each fault once in a snapshot and quotes the FAIL line in `docs/systems/UF_Remains.md`.

| Check | What it does | FAILS when | Provoked by (the fault) |
|---|---|---|---|
| `remains.carcass_after_kill` | Four deaths: a deer by `UF.Combat.resolveAttack` at 1 hp, a hare by a hunt (read at `remains:created`, before the butcher phase), a hare by the predator path (the same sequence the Wildlife tick runs: hp ≤ 0, yields dropped, `wildlife:kill`, `removeUnit`), and a `kind: "person"` unit with an equipped `sword_short` by combat. Also a record made with `create({ ..., z: -1 })`. | not exactly one record per death at the death cell with `z` 0; the wrong `stage`, `size` or `parts` (the §3.4 table); any species-yield item on a death cell; the person's sword not dropped, or the person record without `burial: "pending"` or with parts; a test unit without a species leaving a record; the `z: -1` record found by `at(..., 0)` or not by `at(..., -1)` | the H4 diversion off (the yields drop as well) |
| `remains.butcher_yields` | For rat, hare, deer, wild horse and aurochs: a fresh carcass, butchered by a level-1 test worker with a stone knife; the deer again bare-handed | the items on the cell not equal to `productsOf` (the §3.4 table); totals not rising tiny < small < medium < large < huge; `ticks` not `ceil(attempts × beats × 60 / tool)` for the job's own `attempts` (tool 2 with the knife, 0.5 bare-handed); the record not removed; `remains:butchered` not once each | every body read as `small` |
| `remains.decay_stages` | A deer carcass on a temperate cell and one on a glacier cell. The clock is moved with `$ufTime.advanceMinute` to one minute before `at.rotting`, then past it, then a `JsonEx` round trip of `makeSaveContents()` with the loaded copy swapped in, then past `at.bones` and `at.gone`. A person record alongside. A colonist 3 cells from the rotting deer and one 8 cells away. | a stage early or late by a minute; perishables not gone at `rotting`, or bone/skull gone; `remains:stage` not once per change; the loaded copy's `at` values changed or the heap not rebuilt; the animal not removed at `gone`; the person not still in `bones`; the glacier carcass not still fresh; the near colonist without "Caught the stench..." or the far one with it; a second thought inside the cooldown | stage times recomputed from the load time instead of read from `at` |
| `remains.bones_collectable` | A deer taken to `bones`, and a boar to `rotting`; an open `butcher` job each, taken with `UF.Jobs.take` by a test worker | the bones deer not giving bone 2 and skull 1 as ground items; the rotting boar giving meat, fat or hide; the job not using the `collect` row; the records not removed | the collect apply dropping nothing |
| `remains.bone_recipes` | A real colonist (from `UF.Colonists.list()`, decisions off) given 1 bone and a stone knife crafts `bone_needle` through a `craft` job; a test worker makes `bone_heads` from 1 bone; and `render_fat` from 2 fat at a campfire built for the check | not 1 bone_needle in the colonist's inventory with the bone consumed; not 12 bone_heads; no tallow; any new recipe or item id not resolving in the catalog | `bone_needle`'s output removed from the in-memory recipe |
| `remains.hunt_flow` | The jobs suite's hunt, rebuilt with the remains in: a `kind: "test"` hare 5 cells from a knife-carrying hunter; the same with a hunter who has no tool | the hunt not reaching phase 1 with a carcass; not done; not exactly 1 meat, 1 hide, 1 bone on `hunt.result.at`; the hunter not beside that cell; `jobs:kill` not once; the carcass still there; the bare-handed phase 1 not taking 4× the knife's time per attempt (120 against 30 map updates) | the phase chain off (the hunt ends at phase 0 with the carcass untouched) |
| `remains.no_errors` | – | any uncaught error during the suite (`t.errorsSoFar()`), or anything in `UF.Remains.errors` | a throw in the `time:minute` handler |
| `remains.perf` | 400 animal and 200 person records spread over the map with mixed stage times, 200 of them in view at zoom ⅓; 100 due in the same game minute; 50 rotting near 100 colonists | any budget of §7 exceeded. The detail gives median, mean and worst over 120 frames and the machine's CPU load during the window (`os.cpus`), as `anim.pooled_and_perf` does | a whole-list scan every frame plus a 0.5 ms busy-wait |

Screenshots (zoom 1; the build opens every one before citing it): `remains.carcass_fresh` (a deer carcass, a hare carcass and a person's body on the arena), `remains.stages` (fresh, rotting and bones side by side), `remains.butchered` (the products lying on the cell, the worker beside it).

### 9.2 `jobs.hunt` with UF_Remains loaded: expected to pass unchanged
The check (`UF_Jobs.js`, the `hunt` block) waits for the hunt to be `done`, then counts `meat_raw` and `hide` on `hunt.result.at` and checks the hunter is at Manhattan distance 1 from it. With UF_Remains:
1. The test hare (`kind: "test"`, `species: "hare"`) has a body entry, so the kill makes a carcass. The hunt's own drops are diverted (H4), so the job continues into phase 1 instead of finishing.
2. The test worker carries the `stone_knife` it crafted in `fetch_and_craft`. Phase 1 takes `attempts × 60 / 2` map updates (2-3 attempts at chance 0.8), about 10 frames at the suite's ×8, far inside the 10 s wait. Without the knife it would still finish, at 0.5×.
3. Phase 1 stands beside the carcass (`standFor(..., true)`): the hunter is already on a neighbour cell and stays there, so the distance is still 1.
4. The hare's products are meat 1 and hide 1 (the species' own yields win) plus bone 1. The check counts only meat and hide, so it sees exactly 1 and 1. `job.result.at` is kept from phase 0.
5. `jobs:kill` fires once, from the original apply in phase 0.

The only chance of a FAIL is the one that exists today: UF_Skills' extra-yield roll (`level × 0.005` = 0.5 % at level 1, seeded by unit and job id) can add a second meat. The build confirms this by running `jobs` in the snapshot with UF_Remains registered and quoting the `jobs.hunt` line.

### 9.3 Other suites to re-run in the same snapshot
| Suite | Expected |
|---|---|
| `combat` | **`death` FAILS under R1-A until E1**: the wolf's meat and hide are pending in its carcass, not on the cell (`dropsOk false`; on a clean arena the detail reads `meat_raw 0 -> 0, hide 0 -> 0`). Everything else is unchanged. |
| `anim` | unchanged: its units are `kind: "test"` without a species, so they make no remains and UF_Anim's `remainsHours` expectations hold |
| `jobs` | 17/17 expected (§9.2) |
| `colonists` | the hunt in its sequence now includes a butcher phase (1-5 beats) before the cooking; within its window by design; re-run and compare with a control run |
| `skills`, `items`, `look`, `wildlife`, `smoke`, `fire` | expected unchanged; `look` covers the menu alias (option count on carcass-free cells unchanged) |

## 10. Placeholder art and asset requests
**Placeholders (stock RPG Maker MZ, V9), chosen after viewing crops at 3× in this run** (scratch contact sheets of IconSet rows 0, 11-18, the stock `Damage1` character block, `Outside_C` tile 281 at 4×, and the stock `Damage3`, `!Other1` and `!Other2` sheets):
| What | Placeholder | Notes |
|---|---|---|
| animal carcass, fresh | stock tile `Outside_C` 281 (the `bones_pile` look: a grey skull and skeleton) tinted `#d87070` | reads as "remains here" at any size; UF_Anim's species death frame replaces it when the species' AR-401/AR-600 sheet has death columns |
| animal carcass, rotting | the same tile tinted `#9a9a60` | |
| bones (animal and person) | the same tile, untinted | |
| a person's body, fresh and rotting | stock `Damage1.png` (already in `game/img/characters`), character block 0, row 2, column 2: a red-haired man lying face down; rotting adds the `#9a9a60` tint | the AR-600 human death frame replaces it when delivered |
| skull | IconSet 17 (grey skull and crossbones), tinted | as `!$UF_Icon_17` |
| fat | IconSet 267 (white egg shape), tinted cream | |
| tallow | IconSet 211 (a round pot), tinted | |
| bone needle | IconSet 225 (a quill: thin, pointed) | |
| bone fishhook | IconSet 294 (a curved fang shape) | |
| bone arrowheads | IconSet 298 (the bone icon), a darker tint | |
The unused candidates, for the record: `!Other1` has black-and-red splash stains, and `Damage3` has collapsed monsters in chibi style. Neither reads as a carcass.

**Asset requests to append to `docs/ASSET_REQUESTS.md`** (the build re-reads it and takes the next free numbers; on 2026-09-19 the five-level run used AR-1200..1219, so AR-1300..1302 are proposed). Every stock asset used above is named in the Status column (CLAUDE.md), and the art follows ART_STANDARD §2 sizes, palette `art/palette/uf.hex`, binary alpha, anchor bottom-centre, one sidecar per sheet:
| Proposed id | Asset | Spec | Replaces |
|---|---|---|---|
| AR-1300 | **Animal remains by body plan and size**, 8 sheets `!$UF_Remains_<plan>_<size>.png`: quadruped small, medium, large, huge; bird small; serpent small; spider medium; biped large (troll) | one row of 3 frames: `fresh` (the body on its side, a small dark stain, no gore detail), `rotting` (sunken, greyed flesh, ribs showing), `bones` (a loose skeleton and skull); sidecar `animations: { fresh: [0], rotting: [1], bones: [2] }`, `under: true`; 48×48 frames for small and medium (lying length per §2: small 14-30 px, medium 36-44 px), 96×96 for large and huge (72-80 px long); V81: small bodies leave open ground around them | stock `Outside_C` 281 tinted (fresh, rotting, bones) |
| AR-1301 | **People's remains**, 2 sheets: `!$UF_Remains_person_tall` (humans, elves, orcs; 44-48 px lying) and `_short` (dwarves, goblins, gnomes; 34-40 px) | the same three frames; plain undyed clothes so any culture reads right; the fresh frame is only a fallback where a species has no AR-600 death frame | stock `Damage1` block 0, row 2, column 2, and `Outside_C` 281 |
| AR-1302 | **Butchery and bone goods** on the AR-200 item standard (48×48 ground frame with the item 10-20 px on row 47, a 32×32 icon, `!$UF_Item_<Name>` charset and sidecar): skull, fat, tallow, bone needle, bone fishhooks, bone arrowheads | skull 12-16 px; fat a pale lump 12-16; tallow a cake or small crock 14-18; needle 10-14 px thin; hooks 8-12; arrowheads a small cluster 12-16 | IconSet 17, 267, 211, 225, 294, 298 |

**Handoff:** one section "Remains and bones" in `docs/handoffs/HANDOFF_df_mechanics.md` (re-read before writing; only that section), telling Gemini the three requests, the sheet and sidecar layout, and how a delivered sheet plugs in with no code: `remains.look` gains `bySize: { "<plan>_<size>": "!$UF_Remains_<plan>_<size>" }` and `person: "!$UF_Remains_person_tall"` (Claude Code switches the catalog on integration), and species death frames arrive through AR-401/AR-600 as today.

## 11. Words shown to the player
Generic words, no approval needed per the brief: carcass, remains, body, bones, skull, fat, tallow, bone needle, bone fishhook(s), bone arrowheads, bone meal; "Butchering a deer", "Collecting deer bones", "Butcher the deer carcass", "Collect the deer bones", "Deer carcass · fresh / rotting", "Body of {name}"; recipe names in §4.3; the three unease texts in §3.10 (plain English, written here, not taken from DF).
**Proposals (need the user):** R1-R8 (§0); the name of a future butchering place (**butcher's block** · butchering table · shambles); a skull used as a trophy or decoration (not designed; would need approved culture data, V76). No DF, U7, OSRS or D&D names appear anywhere in this design.

## 12. Gap-map entries (for `docs/design/DF_GAP_MAP.md`; the lead pastes them)
| DF mechanic | UF after this design | Gap |
|---|---|---|
| Burial: coffins, tombs, graves, memorials; distress until laid to rest | people's remains stay with `burial: "pending"` | a burial job and a grave zone or object (CRAFTING §2.9 already lists `grave_marker`, "burials (later)"), mourning, a chronicle line |
| Butcher's workshop; carrying bodies to it | butchery at the carcass | a butchering-place object, carrying carcasses (`butcher.place` is in the catalog, unused) |
| Refuse piles for bones and rotten remains | bones crumble away after `bonesDays` | refuse zones and hauling remains there |
| Stench in enclosed rooms | an outdoor radius, the view's level only | room detection (the rooms and floors work) to make it indoor-only, as DF does |
| Scavengers and vermin eating remains; predators eating kills | predators' first meal is taken at the kill | UF_Wildlife calling `UF.Remains.feed` for feeding and scavenging (E2) |
| Severed parts and wound pieces | none | with DF-style injuries, which V64 left open for the user |
| Teeth, horns, hooves, hair, shells as products | bone, skull, feathers, wool | more hard-part items and their crafts |
| Bone crafts: armour pieces, trinkets, bone meal | needle, hooks, arrowheads | bone armour (CRAFTING §5.8), trade goods, bone meal once farming exists |
| Tallow into soap and candles | tallow only | lye and ash, light sources |
| Food spoiling in stores | carcasses rot; items never spoil | item spoilage (UF_Items has none) |
| Remains burning in fires | none | a UF_Fire rule for carcasses |
| Bodies falling between levels | `landingZ` returns `z` | UF_Levels' support query (V80) |
| Culture rules about which bodies may be butchered | people never, animals always | approved culture data (V76) |

## 13. Build plan and registration (for the build run; nothing done here)
| Step | Content | Proof |
|---|---|---|
| B1 | `game/js/plugins/UF_Remains.js`: death detection (H1, H3, H4, H5), records, state and save, the heap, the drawing layer with the stock placeholders; `tools/add_remains_catalog.js` (§4); cut icons 17, 211, 225, 267, 294 with `tools/extract_stock_icons.js --only ...` | `carcass_after_kill`, `decay_stages`, `perf`, `no_errors` |
| B2 | the `butcher` job, the hunt chain (H2), designations, the look and menu aliases (H7, H8) | `butcher_yields`, `bones_collectable`, `hunt_flow`; `jobs`, `combat` (with E1 applied, or R1-B), `anim`, `colonists`, `look` in the same snapshot |
| B3 | bone and fat recipes, unease, `docs/systems/UF_Remains.md`, the three asset requests, the handoff section, the gap-map rows | `bone_recipes`; the screenshots opened and described |

Every step runs in a snapshot (`tools/test_snapshot.js --name <label> --plugins UF_Remains --no-run`, then `tools/run_tests.js remains --game <dir>`), is `node --check`ed, and is copied to `game/` only after its suites pass (compare `game/`'s file with the snapshot's starting copy right before copying). A smoke run and `repro_title.js newgame` follow on a fresh snapshot.
**Registration for the lead:**
- `game/js/plugins.js`: `{"name":"UF_Remains","status":true,"description":"[UF Remains] Carcasses after every kill, butchery by body size, decay by game time (fresh, rotting, bones), bones and skulls, people's remains kept for burial.","parameters":{}}` after `UF_Fire`, before `UF_Test`. It must load after `UF_Jobs`, `UF_Items`, `UF_Combat`, `UF_Anim`, `UF_Skills`, `UF_Look` and `UF_Interact`; with UF_Levels, after it.
- `tools/register_world_plugins.js`: `ORDER` gets `"UF_Remains"` between `"UF_Fire"` and `"UF_Test"`. `DESCRIPTIONS` gets `UF_Remains: "[UF Remains] Carcasses after every kill, butchery by body size, decay by game time (fresh, rotting, bones), bones and skulls, people's remains kept for burial.",`
- Under R1-A, E1 (the `combat.death` check) goes in first, or `combat` fails on registration.

## 14. Known limits and open points
- **Items with no consumer yet:** skull, tallow (outside CRAFTING's salve proposal), bone needle, bone fishhooks, bone arrowheads (R8). Their consumers are CRAFTING C1/C2 (not approved) and farming (not built).
- **Recipe level gates** (`minLevel`) aren't enforced until UF_Jobs checks them (CRAFTING C2 or WORK_TIMING.md). Butchery has no level gate at all (R1, D13).
- **Hunger during the butcher phase:** UF_Colonists' `foodJob` doesn't know carcasses (E3). A hunter cancelled by hunger leaves an open designation for a colonist who isn't hungry. The meat still arrives, later.
- **Other factions** don't butcher until their societies run jobs. Their kills rot where they fall.
- **Unease** is only for the view's area and level, outdoors, colonists only. DF's version is indoor and applies to everyone.
- **One stock placeholder for every animal size** until AR-1300. Size shows only in the tooltip.
- **The predator path takes items back** (H5) instead of never making them, until E2. Between the drop and the take-back no frame is drawn, but `items:changed` fires twice for each item.
- **UF_Anim's extra wrap layer** at the first boot (§6.1) is harmless but real.
- **The cap** removes the oldest bones first, and at the people cap the oldest person's bones go without a chronicle line.
- **The numbers** (sizes, hours, strokes, chances, factors, experience, tints) are first guesses. They are catalog values for the user to tune (R6).
- **WORK_TIMING.md** doesn't exist yet. This design uses V85's shape (`beats`, `chance`, time-only failure) and converts to UF_Jobs' tick-based `work` in one helper (`beatTicks()`), so the switch to the beat engine is local.
- Not run in the RMMZ editor's Playtest (F5); nothing is built.
