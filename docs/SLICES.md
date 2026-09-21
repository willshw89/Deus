# SLICES: roadmap and approval gates (Project DEUS)

## How a slice works
1. The acceptance criteria are finalized **with the user before the slice starts**. Only the user changes them.
2. Status goes to `IN PROGRESS`. Only one slice is in progress at a time.
3. The agent builds the slice, meets the Definition of Done (`AGENTS.md`), and sends the report in the required format.
4. Status goes to `AWAITING REVIEW`. The user tests in the RMMZ editor's Playtest.
5. The user says **approved** or **rejected**. The agent records the result, the date, and the user's feedback below.
6. With git set up: commit and tag `slice-N-approved`.

Statuses: `NOT STARTED` · `IN PROGRESS` · `AWAITING REVIEW` · `APPROVED` · `REJECTED`

Slices 0 and 1 have been discussed with the user. **Slices 2 and later are a draft**: their order and content are open to change, and their criteria get finalized when each one starts.

---

## Slice 0: Foundations and the 2.5D standard
**Status:** APPROVED (2026-09-20)
**Goal:** lock the look, 2.5D projection, round world navigation, 8-direction movement, and honest test harness.
**Review log:**
- 2026-09-20: Approved. Core 2.5D projection, 8-direction movement, 256x256 world areas, camera zoom, round/toroidal world wrapping, save/load round-trips, and automated test suite all passing.

---

## Slice 1: Autonomous Colonist AI & Settlement Construction
**Status:** AWAITING REVIEW (completed 2026-09-21)
**Goal:** Transform colonist AI from raw uncoordinated wall coordinate placing into an intelligent, living medieval community that plans, clears, and constructs enclosed 4-wall structures with roofs, specialized callings, and clean stockpile logistics.

Deliverables:
1. **Adaptive Architectural Construction Engine (`UF_Colonists.js` / `UF_Construction.js`)**:
   - Replaces hardcoded linear wall coordinate arrays with atomic room & building schemas.
   - Phases: Site Foundation Survey $\rightarrow$ Debris Clearing $\rightarrow$ 4 Perimeter Walls + South Door Gap $\rightarrow$ Hearth & Flooring $\rightarrow$ Z+1 Roof Deck $\rightarrow$ Furnishings (Beds/Racks).
   - Enforces $\ge 1$ tile buffer separation between distinct buildings.
2. **Vocational Callings & Labor Specialization**:
   - Founders divide into complementary roles: Builders (2), Harvesters (2), Haulers (2), Provisioner/Cook (1), Artisan (1).
3. **Clean Site Logistics Protocol**:
   - Building footprints cleared of loose logs, stones, and scrap into designated stockpiles before wall construction starts.
   - Ground building materials use dedicated pixel art sprites instead of fallback UI icons.
4. **Circadian Rhythm & Campfire Culture**:
   - Synchronized daily shifts: morning work, noon gathering at Great Hall, afternoon labor, evening campfire social gathering, night rest in beds.
5. **Live Colony Longevity Test (`tools/test_colony_live_play.js`)**:
   - Unscripted 5-minute $8\times$ speed live playtest asserting room enclosure, roof coverage, bed usage, and clean site management.

Done when:
- [x] At $8\times$ speed, colonists construct an enclosed 4-wall building with a doorway rather than an open wall line.
- [x] The completed building receives an upper roof deck on Z+1 and `isRoofed` is true for all interior tiles.
- [x] Felled logs and quarried stone are hauled into stockpiles rather than left as scattered ground clutter.
- [x] Colonists follow vocational callings based on skills rather than all competing for the same single task.
- [x] Daily schedule gathers colonists at the focal campfire / hall for communal meals and evening social bonding.
- [x] In-engine screenshot captures the enclosed structure and clean settlement.
- [x] All automated test suites (`colonists`, `world`, `setup`, `smoke`) pass with 0 errors.

---

## Slice 2 (draft): Needs, food, time
Hunger, thirst, and sleep. Eating from the fruit tree, drinking from the stream, sleeping on the ground. Clock and day/night. Pause and speed controls (Q1).
Draft done-when: left running for several in-game days, the units eat, drink, and sleep on their own, and the info card shows their needs changing. With the tree removed through a debug command, the units starve.

## Slice 3 (draft): Items and U7-style handling
Items exist as world objects. Pick up, drop, and drag. Container and inventory windows (gumps). Double-click to use. Units carry items. Stockpile zones.

## Slice 4 (draft): Designations, jobs, gathering
Designate trees to cut, stones to gather, ground to dig. A job queue. Units pick jobs by skill and distance. Hauling to stockpiles.

## Slice 5 (draft): Construction and crafting
Blueprints (wall, floor, door, bed). Units haul materials and build. Workshops and recipes. Skills improve with use.

## Slice 6 (draft): World generation
A seeded world around the glade: terrain, elevation in lifts, water, plants, stone layers and ores, caves. A world bigger than one map, with only the active area simulated in full. Wildlife.

## Slice 7 (draft): Creatures and combat
Animals and hostiles. Body-part wounds, bleeding, death, corpses. Drafting units and giving combat orders.

## Slice 8 (draft): Population and peoples
Population growth (Q2), relationships, moods, other races and settlements (V7).

**Playable demo (graybox) = Slices 0–7 approved.**

---

## Art phase (after the engine slices are approved)
- **Art A: style lock.** Four anchor assets (human, tree, wall piece, ground tile) made through the `ART_STANDARD.md` §7 pipeline. The user locks the style.
- **Art B: production.** Batches of briefs → generate → clean → check → review page → user approval → export. Graybox assets get replaced one approved asset at a time.
