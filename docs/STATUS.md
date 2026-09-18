# STATUS: what's actually true right now

Update this whenever reality changes. Write only what you've checked, and say how you checked it.

**Last updated:** 2026-09-18 by Claude Code
**Current slice:** Slice 0 (IN PROGRESS since 2026-09-18)
**Roles:** Claude Code = engine and features; Gemini = art only (AGENTS.md → Two agents)

## In progress (claims)
Format: `- <agent> | <task> | <files/folders> | since <date>`
- (none)

## Verified working (checks run on the real game folder, 2026-09-18)
`run_tests.bat` → 50+ checks PASS. Suites: smoke, world, worldgen, fog, camera.
- **New Game starts a fresh seeded world** (a new random seed each game, `UF_World`). The start area is 256×256 (area (3,3) of a 6×6 grid).
- **Adam and Eve are in the middle** with the fruit tree: tree (128,128), Adam (126,129), Eve (130,129), inside a clearing of radius 8 (`UF_WorldGen` + `data/UF_WorldCatalog.json` → `start`).
- **Generated world:** one river north to south, 5 cells east of the clearing and continuous across areas, with water edges computed to match the editor. Trees, bushes, and rocks come from the catalog in seeded patches (800-object cap per area).
- **Fog of war** (`UF_Fog`): unexplored cells are black, explored-but-unseen cells are dim, and Adam and Eve reveal it (plus any world unit with `data.faction = "player"`). It follows zoom and is saved per area (~11 KB).
- **Zoom** (`UF_Camera`): mouse wheel, `-` / `+`; levels 1, ⅔ (the start), ⅓.
- **Units travel between areas**, and so does the view (`UF_World`; 15 checks).
- Saving works (`save_serializes`), but see K7.

## Plugins registered in `game/js/plugins.js` (2026-09-18, by Claude Code)
`… UF_ProcGen > UF_Factions > UF_World > UF_WorldGen > UF_Fog > UF_Camera > UF_Test`
**The RMMZ editor has been open since 14:57 with the old plugin list in memory. Close it without saving and reopen it, or its next save will erase these five.**

## Known problems
- **K7 Colonist state isn't saved** (`smoke.colony_state_in_save` FAIL). `$colonyManager` lives outside the save; after loading, Adam and Eve's needs, thoughts, and jobs are lost. Fix: move colonists onto `UF.World` units (`unit.data`).
- **K3 Projection isn't U7 yet:** `UF_Perspective25D` lifts height straight up (36 px), and sprites anchor at the bottom center, so leaning objects look shifted right of their cell. Fix: GUIDE_25D §3 plus the sidecar anchor loader.
- **K2 Old fake autotest still present:** `UF_Core.js` still has the ungated map-start test block and the unconditional "100% OPERATIONAL" line (line 163), plus `run_autotest.bat` (A2-2).
- **K9 Concurrent code edits:** Gemini edited engine files while Claude Code worked, breaking boot three times on 2026-09-18 (duplicate lines; `loadScript("UF_Factions.js")` → `UF_Factions.js.js`). Each was fixed and committed (272bfc0, 0133225).
- **K10** `Map002.json` is Gemini's baked 256×256 world. Nothing uses it any more; the seeded world replaced it (user decision 2026-09-18).
- **K11** `UF_Factions.js` (Gemini's draft) is registered and loads without errors. Not reviewed. It will be reviewed and adopted or replaced when factions are built (V18).
- Art quality issues are tracked in `docs/ASSET_REQUESTS.md` and `docs/handoffs/HANDOFF_world_generation.md` (red fruit tree canopy, broken pine, boulders drawn as slabs).

## Engine queue (Claude Code, in order)
1. **Colonists as world units** (K7), then **autonomous goals** (V17): Adam and Eve survive, then gather and build shelter without input, and the colony state saves.
2. **Factions** (V18) generated with the world, with relations, reviewing Gemini's `UF_Factions.js` first.
3. **Arrivals at the map edges** (V19): migrants, traders, and raiders appear along the edges at any time, depending on factions.
4. Projection fix + sprite sidecar anchors (K3); look cursor (Slice 0 deliverable 7); remove the old autotest (K2).
Each feature ships with a handoff report for Gemini in `docs/handoffs/`.

## Stand-ins (U7-derived, dev only; replace before release; AGENTS rule 8)
Format: `- <file> | source | used for`
- `game/img/characters/$Adam.png`, `$Eve.png` | SHAPES.VGA shapes 458 / 452, 3×, transposed east/west (Gemini) | Adam, Eve. Should be renamed with the `U7_` prefix.
- `game/img/characters/!$FruitTree.png` | SHAPES.VGA shape 670, 3× (Gemini) | Fruit tree. Red, noisy canopy: palette to be checked.
- `game/img/characters/$U7_*.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png`, `game/img/system/u7_gumps/`, `u7_gump_*.png`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `U7_Faces.png`, `game/img/tilesets/U7_Fortress_B.png` | earlier extraction, sources not recorded | unused or unknown

## Environment
- Node.js v24.19.0 at `C:\Program Files\nodejs\`. Git repo at the project root (whitelist `.gitignore`).
- `run_tests.bat [suite]` runs the checks. It keeps running without window focus and reads its result from `game/test_output/results.txt`.

## Decisions waiting on the user
- Q1–Q8 in `docs/VISION.md` (Q5 facings and Q6 scale are still needed for the art standard)

## Backlog (not scheduled)
- (empty)
