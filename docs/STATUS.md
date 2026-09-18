# STATUS: what's actually true right now

Update this whenever reality changes. Write only what you've checked, and say how you checked it.

**Last updated:** 2026-09-18 by Claude Code (audit of the files on disk)
**Current slice:** none. Slice 0 is waiting for the user's go-ahead.

## In progress (claims)
Format: `- <agent> | <task> | <files/folders> | since <date>`
- (none)

## What exists (audit 2026-09-18)
- **14 UF plugins** in `game/js/plugins/UF_*.js` (about 4,800 lines), written in an earlier session. **UNVERIFIED.** Some were built for directions the user has since rejected (see VISION). Don't assume any of it works; recheck whatever a slice reuses.
- **Autotest:** `run_autotest.bat` plus a block in `UF_Core.js` (lines ~69–237). The line `ALL UF GAMEPLAY SYSTEMS VERIFIED 100% OPERATIONAL!` (line 203) prints unconditionally, so none of that output counts as evidence.
- **Last screenshot** (`game/test_screenshot.png`, from the run at 2026-09-18 19:21 UTC): grass, a tree that isn't in the U7 projection, and one small dark sprite on a light-green square. Adam and Eve aren't visible, although the log says their images loaded.
- **Character sheets** in `game/img/characters/` are RMMZ 3×4 sheets (4 facings, 48×48 cells). No 8-facing art exists.
- **`UF_Perspective25D.js`** offsets height straight up by 36 px per level. That doesn't match the U7 up-and-left lean (`ART_STANDARD.md` F2).
- **Leftovers from rejected directions** (Wayfarer, Delver, Deepdelve, Thorgar, Kaldurath, …) in 18 files: most UF plugins, `Actors.json`, `Map001.json`, `df_creatures.json`, `df_entities.json`, `Armors.json`.
- **Can't ship** (AGENTS rule 8, VISION V9). Leave it in place until the user decides:
  - Extracted U7 images: `game/img/characters/$U7_*.png`, `!$U7_FruitTree.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png`; `game/img/system/u7_gumps/`, `u7_gump_*.png`, `gump_*.png`, `paperdoll_*.png`
  - DF-derived data: `game/data/df_*.json` (includes the lexicon parsed from DF raws)
  - The game window title "Ultima Fortress" (`game/package.json`, `launch_demo.bat`)
- **Portraits** in `game/img/faces/`: Gemini images of unapproved characters.
- **`tools/`**: PowerShell scripts from the earlier session, unverified. `tools/asset_prompt_catalog.md` is superseded by `docs/ART_STANDARD.md`.
- **Stray files at the root:** `avatar_464_grid.png`, `shapes_contact_sheet.png`, `test_shape464.png`.
- No git repo, no Node, no Python.

## Known problems
- **K1: Playtest closes by itself about 4–5 s after the map loads.** Cause (from reading the code, 2026-09-18): `UF_Core.js:84` turns autotest mode on for any argument containing `test`. RMMZ's Playtest passes `test`, so every playtest runs the autotest, which calls `nw.App.quit()` at frame 240 (`UF_Core.js:232-237`). The log confirms `nwArgs: ["test"]`. Fix: match only `--autotest` (Slice 0, deliverable 2). Not yet fixed.
- **K2:** The autotest reports success unconditionally (above).
- **K3:** Height offset doesn't match U7 (above).
- **K4:** Adam and Eve aren't visible in the last screenshot even though the log reports them as loaded. Cause not investigated.

## Decisions waiting on the user
- Go-ahead for Slice 0
- Q1–Q6 in `docs/VISION.md` (Q5 and Q6 are needed during Slice 0)
- What to do with the can't-ship files: move them to `reference/` (recommended) or delete them
- Whether to strip the rejected-direction content from the plugins now or during the slices that touch them

## Backlog (not scheduled)
- (empty)
