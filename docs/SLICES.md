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
**Status:** IN PROGRESS (user go-ahead 2026-09-18)
**Goal:** lock the look and an honest test process before building gameplay on top of them.

Deliverables:
1. Tooling: Node.js LTS installed; git repo with a `.gitignore` (`ENGINE_RULES.md` §7).
2. A real test harness (`ENGINE_RULES.md` §6) replacing the autotest block in `UF_Core.js`. This also fixes the "crash" (STATUS K1).
3. U7 reference measurements: facts F1–F7, human height, and lifts per story in `ART_STANDARD.md`, measured and tagged, with screenshots in `reference/u7/`.
4. User decisions Q5 (facings) and Q6 (scale), recorded in `VISION.md`.
5. The graybox tool (`ART_STANDARD.md` §6).
6. Test map "Projection Yard": flat grass; graybox boxes 1, 2, 4, and 8 lifts tall; a 5-cell wall; a 2×2 tree; two human grayboxes walking around.
7. **The look cursor** (added by the user 2026-09-18, VISION V13). The cursor is how the player looks around, like DF's look mode:
   - A cell cursor drawn on the ground as an outline of the cell (bright yellow for now), always visible.
   - It moves with the arrow keys and numpad in **8 directions**, repeating while a key is held. It also follows the mouse (hover moves it to the cell under the pointer); holding the pointer at a screen edge keeps it moving that way.
   - **The camera follows the cursor.** No separate free-pan camera; the old WASD/edge-pan code is removed or routed through the cursor.
   - It moves freely over everything (walls, water, units) and stops at the map edges.
   - A small **look panel** names what's under it: terrain, plus any object or unit (e.g. "Grass. Fruit tree." or "Grass. Adam: idle, hungry").
   - Build hint (no engine change): the invisible `$gamePlayer` *is* the cursor. Give it `through`, move it in 8 directions, and draw the outline at its cell. RMMZ already scrolls the camera to follow the player.
8. **A world of areas** (set by the user 2026-09-18, VISION V14). Split between the two agents:
   - **8a, core (Claude Code): `UF_World`.** The world is a grid of 256×256 areas, generated at runtime from a seed plus saved changes, with no map files. It keeps a world-level unit registry: units in the area on screen are drawn as events, and units elsewhere keep moving in a simplified simulation. Units and the view cross area edges. Save/load included. API: `docs/systems/UF_World.md`.
   - **8b, content (Claude Code since the 2026-09-18 role change; Gemini started a `df_wilderness_generator`).** A seeded placeholder generator registered through `UF.World.registerGenerator` (grass variety, tree clusters, rocks, the river continuing across areas) until real world generation in Slice 6. Also convert Adam and Eve from glade events into `UF.World` units so they survive leaving the start area.
9. **Camera zoom** (added by the user 2026-09-18, VISION V15). `UF_Camera`: zoom levels 1, ⅔, ⅓ (3×, 2×, 1× native pixels, all exact) with the mouse wheel and the − / + keys. Starts at ⅔. The view stays centered while zooming, and mouse clicks map to the right cell at every level. Built, 10 checks pass (`docs/systems/UF_Camera.md`).

Done when:
- [ ] Everything with height leans the same way at the same angle (screenshot + user)
- [ ] A walking figure is hidden behind a box when it's north or west of it and in front when it's south or east, with no popping while it moves between (check + user)
- [ ] Movement works in all 8 directions, and nothing cuts diagonally through a wall corner (check)
- [ ] The figure's facing mark matches its movement direction (check + user)
- [ ] The test output lists PASS/FAIL per check, and the report shows at least one check failing when it should
- [ ] Playtest from the RMMZ editor runs for 5+ minutes without closing or erroring (user)
- [ ] Cursor visible on its cell at start (check `cursor.visible`)
- [ ] Cursor moves one cell for each of the 8 directions (check `cursor.moves_8_dirs`, using simulated input)
- [ ] After moving the cursor 40 cells east, it's still on screen and the camera has scrolled (check `cursor.camera_follows`)
- [ ] The cursor can reach all four map corners and passes over the tree and the river (check `cursor.reaches_corners`)
- [ ] With the cursor on the fruit tree, the look panel names it (check `cursor.look_names_tree`)
- [ ] Each area is 256×256, and the same seed gives the same area twice (checks `world.area_size`, `world.seeded`)
- [ ] A unit walking in another area crosses into the area on screen and appears (check `world.unit_enters_view`)
- [ ] A unit on screen walks out of the area, disappears from the screen, and keeps existing in the neighbor area (check `world.unit_leaves_view`)
- [ ] The view crosses an area edge and lands on the matching cell of the neighbor area (check `world.view_crosses_edge`)
- [ ] A tile changed in an area is still changed after leaving and coming back, and after save/load (checks `world.diff_persists`, `world.save_roundtrip`)
- [ ] Zooming out shows more cells at each level, the view stays centered, and a click maps to the cell under the pointer at every level (checks `camera.*`, plus the user)
- [ ] Moving the cursor by keyboard and by mouse both feel responsive (user)

**Review log:**

---

## Slice 1: The glade
**Status:** REJECTED (2026-09-18). Redo after Slice 0.
Why the earlier attempt was rejected: Adam and Eve weren't in the 2.5D projection. Broken extractions showed up in their place (wall slabs, a red creature). Areas rendered as a black void, and the tiles looked like "gibberish". In the last screenshot Adam and Eve weren't visible at all, and Playtest closed after a few seconds.

Deliverables: the fixed starting glade (size TBD, around 30×30) with a stream, the fruit tree, and the man and woman as grayboxes. No player character on screen; the view is a camera. Camera pan, unit selection with an info card, and click-to-move with 8-direction pathfinding.

Done when:
- [ ] New Game opens the glade directly
- [ ] The man, woman, and tree are visible, all in the projection (screenshot + user)
- [ ] No player character is visible; WASD/arrow keys and screen-edge panning move the camera
- [ ] Clicking a unit selects it (visible outline) and opens its info card
- [ ] Clicking the ground with a unit selected makes it walk there, diagonals included
- [ ] A unit behind the tree is handled by the cutaway rule decided in this slice (user)
- [ ] Save, then load: units come back in the same places (check)

**Review log:**
- 2026-09-18: rejected by the user. Wrong perspective, broken sprites, unreadable tiles.

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
