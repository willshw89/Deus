# STATUS: what's actually true right now

Update this whenever reality changes. Write only what you've checked, and say how you checked it.

**Last updated:** 2026-09-18 by Claude Code
**Current slice:** Slice 0 (IN PROGRESS since 2026-09-18)
**Roles:** Claude Code = engine and features; Gemini = art only (AGENTS.md → Two agents)

## In progress (claims)
Format: `- <agent> | <task> | <files/folders> | since <date>`
- (none)

## Verified working (checks on a snapshot of the game, 2026-09-18)
`run_tests.bat` → about 100 checks PASS; the one FAIL is K7. Suites: smoke, world, underground, worldgen, factions, fog, daynight, timespeed, camera, colony.
- **New Game rolls everything fresh from a random seed:** surface, caves, factions, the pond, the river, and the pair's names. Only the pair itself is fixed: a man and a woman in the middle of the start area (event 1 and 2), with generated names (e.g. "Braric and Wilia"). There's no fixed tree.
- **Water:** a pond at a random direction and distance (10–30 cells) from the pair, and one river at a random place in the world (never through the start), continuous across areas. Water edges are computed to match the editor.
- **Objects:** trees, bushes, and rocks from the catalog in seeded patches (800 per area max), kept off water. Colonists eat from the nearest `<food>` source (berry bushes).
- **Underground layer** (V20): under every 256×256 area there's a cave layer with the same cells: rock plus caverns and tunnels (about 40% open). There are 4 random cave mouths per area plus one about 16 cells from the start, each with a chamber below. Units walk through them. The view switches layers with `,` (up) and `.` (down) at the same cell, and each layer has its own fog. Rock blocks movement (region 250).
- **Factions** (V18): 4–7 per world from the seed (species, stances, homes on the surface or underground, relations −100 to +100, at least one strong alliance and one serious hostility), saved; press **F** for the ledger.
- **Day and night:** light follows the clock (1 game hour per real minute); caves have constant light; sight shrinks at night. No clock on screen (user choice).
- **Time speed:** `]` faster (×2, ×4, ×8), `[` slower, never below ×1 or backward. The colony's timers run on game time. Measured ×4 = about ×3.1 on this machine (CPU-bound).
- **Colonist movement:** one walk at a time; new orders replace old ones (fixed 2026-09-18: orders used to stack and make them jitter).
- **Fog of war** (`UF_Fog`): unexplored cells are black, explored-but-unseen cells are dim, and Adam and Eve reveal it (plus any world unit with `data.faction = "player"`). It follows zoom and is saved per area (~11 KB).
- **Zoom** (`UF_Camera`): mouse wheel, `-` / `+`; levels 1, ⅔ (the start), ⅓.
- **Units travel between areas**, and so does the view (`UF_World`; 15 checks).
- Saving works (`save_serializes`), but see K7.

## Plugins registered in `game/js/plugins.js` (2026-09-18, by Claude Code)
`… UF_ProcGen > UF_World > UF_WorldGen > UF_Factions > UF_Fog > UF_DayNight > UF_TimeSpeed > UF_Camera > UF_Test` (UF_Visuals lighting off; UF_Core clock HUD off)
**The RMMZ editor has been open since 14:57 with an older plugin list in memory. Close it without saving and reopen it before saving anything in it.**

## Known problems
- **K7 Colonist state isn't saved** (`smoke.colony_state_in_save` FAIL). `$colonyManager` lives outside the save; after loading, Adam and Eve's needs, thoughts, and jobs are lost. Fix: move colonists onto `UF.World` units (`unit.data`).
- **K3 Projection isn't U7 yet:** `UF_Perspective25D` lifts height straight up (36 px), and sprites anchor at the bottom center, so leaning objects look shifted right of their cell. Fix: GUIDE_25D §3 plus the sidecar anchor loader.
- **K2 Old fake autotest still present:** `UF_Core.js` still has the ungated map-start test block and the unconditional "100% OPERATIONAL" line (line 163), plus `run_autotest.bat` (A2-2).
- **K9 Concurrent code edits:** Gemini edited engine files while Claude Code worked, breaking boot three times on 2026-09-18 (duplicate lines; `loadScript("UF_Factions.js")` → `UF_Factions.js.js`). Each was fixed and committed (272bfc0, 0133225).
- **K10** `Map002.json` is Gemini's baked 256×256 world. Nothing uses it any more; the seeded world replaced it (user decision 2026-09-18).
- ~~K11~~ `UF_Factions.js`: replaced 2026-09-18 by the seeded faction generator (d43e6de).
- Art quality issues are tracked in `docs/ASSET_REQUESTS.md` and `docs/handoffs/HANDOFF_world_generation.md` (red fruit tree canopy, broken pine, boulders drawn as slabs).
- **K12** Gemini is replacing the object images (`!$TimberOak`, `!$PineTree`, …) with U7 stand-ins under their existing names (not yet committed). Stand-ins should use the `U7_` prefix (AGENTS rule 8), which also keeps them out of git, and the catalog entries switch to the new names.
- Fixed 2026-09-18: `UF_ColonyOverseer` snapped the camera to (120,122) on every map load, which broke layer and area changes. Colonists also matched another area's event 1 as "Adam".

## Engine queue (Claude Code)
The build order is `docs/design/DF_MECHANICS.md` §14:
1. **Cell state + biomes** (all DF starting states, distinct features)
2. Interaction layer (everything interactive, items on the ground, jobs)
3. Colonists as world units with DF inner life and personality-driven work; the colony saves (fixes K7)
4. Construction one segment at a time, fire, shelter, furniture, workshops
5. Starting population: wildlife, monsters, faction members
6. Fluids across layers
7. Edge arrivals and faction behaviors
8. Relationships, children, aging
9. U7-style combat
Side items: projection fix + sprite anchors (K3), look cursor, removing the old autotest (K2).
Each step ships with checks and a handoff report for Gemini (art waves: `docs/handoffs/HANDOFF_df_art.md`).

## Stand-ins (U7-derived, dev only; replace before release; AGENTS rule 8)
Format: `- <file> | source | used for`
- `game/img/characters/$U7_Adam_T0.png`, `$U7_Eve_T0.png`, `$Adam.png`, `$Eve.png` | SHAPES.VGA shapes 458 / 452, 3×, transposed E/W, unclad | Adam and Eve Tier 0 Naked start
- `game/img/characters/$U7_Adam_T1.png`, `$U7_Eve_T1.png` | SHAPES.VGA shapes 458 / 452, 3×, transposed E/W, woven fiber/grass wraps | Tier 1 Primitive Attire
- `game/img/characters/$U7_Adam_T2.png`, `$U7_Eve_T2.png` | SHAPES.VGA shapes 458 / 452, 3×, transposed E/W | Tier 2 Peasant/fur attire
- `game/img/characters/$U7_Adam_T3.png`, `$U7_Eve_T3.png` | SHAPES.VGA shapes 462 / 463, 3×, transposed E/W | Tier 3 Fighter/tailored armor
- `game/img/characters/!$TimberOak.png` | SHAPES.VGA shape 181, 3×, collision-aligned anchor | Broadleaf timber oak
- `game/img/characters/!$PineTree.png` | SHAPES.VGA shape 306, 3×, collision-aligned anchor | Conifer pine tree
- `game/img/characters/!$FruitTree.png` | SHAPES.VGA shape 328, 3×, collision-aligned anchor | Ancient fruit tree
- `game/img/characters/!$GraniteBoulder.png` | SHAPES.VGA shape 342, 3×, collision-aligned anchor | Granite boulder
- `game/img/characters/!$IronstoneDeposit.png` | SHAPES.VGA shape 341, 3×, collision-aligned anchor | Ironstone outcrop
- `game/img/characters/!$BerryBush.png` | SHAPES.VGA shape 672, 3×, collision-aligned anchor | Berry bush
- `game/img/characters/!$Campfire.png` | SHAPES.VGA shape 739, 3×, collision-aligned anchor | Campfire hearth
- `game/img/characters/$U7_*.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png`, `game/img/system/u7_gumps/`, `u7_gump_*.png`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `U7_Faces.png`, `game/img/tilesets/U7_Fortress_B.png` | earlier extraction, sources not recorded | unused or unknown

## Environment
- Node.js v24.19.0 at `C:\Program Files\nodejs\`. Git repo at the project root (whitelist `.gitignore`).
- `run_tests.bat [suite]` runs the checks. It keeps running without window focus and reads its result from `game/test_output/results.txt`.

## Decisions waiting on the user
- Q1–Q8 in `docs/VISION.md` (Q5 facings and Q6 scale are still needed for the art standard)

## Backlog (not scheduled)
- (empty)
