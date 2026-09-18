# STATUS: what's actually true right now

Update this whenever reality changes. Write only what you've checked, and say how you checked it.

**Last updated:** 2026-09-18 by Claude Code
**Current slice:** Slice 0 (IN PROGRESS since 2026-09-18)

## In progress (claims)
Format: `- <agent> | <task> | <files/folders> | since <date>`
- (none. Claude Code finished the harness and released its claim on `UF_Core.js`, which is Gemini's to clean up per AUDIT_LOG A2-2.)

## Queue for Gemini (in this order)
1. **AUDIT_LOG A2 findings:** save crash (A2-1), delete the old autotest block and `run_autotest.bat` (A2-2), then A2-4 and A2-5.
2. **Slice 0 deliverables 7–8:** the look cursor and the larger (≥128×128) seeded world. Spec and checks are in `docs/SLICES.md`. Add the checks as a `UF_Test` suite (see `docs/systems/UF_Test.md`).
3. **2.5D:** follow `docs/GUIDE_25D.md` §4 in order (decoder proof, projection fix, Projection Yard, glade stand-ins). This also covers AUDIT_LOG A1-2, A1-3, A1-8, and A2-3.

Commit each item as `[gemini] ...` and run `run_tests.bat` before reporting.

## Tools
- **Test harness** (Claude Code, 2026-09-18): `game/js/plugins/UF_Test.js`, `tools/run_tests.js`, `run_tests.bat`. Docs: `docs/systems/UF_Test.md`. Verified on a snapshot copy of the game: the `selftest` suite exits 1 with its deliberate FAIL, and the `smoke` suite ran 7 checks (6 PASS, 1 FAIL = A2-1).
  **Not yet registered in the real `game/js/plugins.js`**, because the RMMZ editor is open (ENGINE_RULES §3). Until then, `run_tests.bat` stops with "UF_Test is not registered". To register: add `UF_Test` in the editor's Plugin Manager (last in the list, ON) and save, or close the editor and let an agent add it.
- **Node.js v24.19.0** at `C:\Program Files\nodejs\` (installed 2026-09-18). Shells opened before the install may not have it on PATH; `run_tests.bat` falls back to the full path.

## What exists (audit 2026-09-18)
- **UF plugins** in `game/js/plugins/UF_*.js`, written in the earlier session and being changed by Gemini now. **UNVERIFIED** except where a `UF_Test` check says otherwise. Some parts were built for rejected directions (see VISION).
- **Old autotest:** `run_autotest.bat` plus a block in `UF_Core.js` (`Scene_Map.prototype.start`, ~lines 93–165). It still runs its actions in normal play, and it still prints `ALL UF GAMEPLAY SYSTEMS VERIFIED 100% OPERATIONAL!` unconditionally (line 163). Its output is not evidence (A2-2).
- **Character sheets** in `game/img/characters/` are RMMZ 3×4 sheets (4 facings, 48×48 cells).
- **`UF_Perspective25D.js`** offsets height straight up by 36 px per level. The U7 projection needs up **and** left, 12 px per lift (GUIDE_25D §3).
- **Leftovers from rejected directions** (Wayfarer, Delver, Deepdelve, Thorgar, Kaldurath, …) in most UF plugins, `Actors.json`, `Map001.json`, `df_creatures.json`, `df_entities.json`, and `Armors.json`.
- **DF-derived data:** `game/data/df_*.json` (includes the lexicon parsed from DF raws). Reference only; excluded from git; must be replaced before release.
- **Portraits** in `game/img/faces/`: Gemini images of unapproved characters.
- **`tools/`**: earlier PowerShell scripts (unverified), plus `run_tests.js` and `add_test_plugin.js` (Claude Code). `tools/asset_prompt_catalog.md` is superseded by `docs/ART_STANDARD.md`.
- **Stray files at the root:** `avatar_464_grid.png`, `shapes_contact_sheet.png`, `test_shape464.png`, and `scratch/` (U7 decoding scripts and previews; fine as reference, excluded from git).
- **Git:** repo at the project root since 2026-09-18, whitelist `.gitignore`, baseline tagged `baseline-2026-09-18`. Repo-local identity: `snewt <willshw89@gmail.com>`. Gemini's changes since the baseline are **not committed yet**.
- No Python.

## Stand-ins (U7-derived, dev only; replace before release; AGENTS rule 8)
Format: `- <file> | source (U7 file, shape, frames) | used for`
- `game/img/characters/$Adam.png`, `$Eve.png` | SHAPES.VGA shapes 458 / 452 | Adam, Eve. **Rename to the `U7_` prefix** (A1-1). East row is mirrored (A1-2); scale is 1.3× (A1-3).
- `game/img/characters/$U7_*.png`, `!$U7_FruitTree.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png` | earlier extraction, sources not recorded (some were wrong shapes) | unknown. Re-verify before use.
- `game/img/system/u7_gumps/`, `u7_gump_*.png`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `U7_Faces.png`, `game/img/tilesets/U7_Fortress_B.png` | earlier extraction, sources not recorded | gumps, faces, tiles.

## Known problems
- **K1:** ~~Playtest closes by itself.~~ Fixed by Gemini at `UF_Core.js:84` (matches only `autotest`). Checked by reading the code; not yet confirmed in an editor Playtest.
- **K2:** The old autotest reports success unconditionally and runs its actions in normal play (A2-2).
- **K3:** The height offset doesn't match U7 (above).
- **K4:** ~~Adam and Eve not visible.~~ Visible (smoke `event_drawn` PASS, 14:48 snapshot). They're U7 stand-ins with problems A1-2 and A1-3.
- **K5:** ~~The stream renders as a grid of blobs.~~ Continuous water in the user's screenshot, 2026-09-18.
- **K6:** ~~The player "Delver" is on screen.~~ Hidden (smoke `player_not_visible` PASS, 14:48 snapshot).
- **K7:** **Saving crashes** (A2-1): `UF_ColonyOverseer.js:413` stores a window on `$gameSystem`.
- **K8:** Ground clutter is upright RMMZ RTP art, not the U7 projection (A2-3).

## Decisions waiting on the user
- Q1–Q6 in `docs/VISION.md` (Q5 facings and Q6 scale are needed during Slice 0)
- Final world size (Slice 0 deliverable 8 needs at least 128×128)
- Whether to strip rejected-direction content from the plugins now or in the slices that touch them

## Backlog (not scheduled)
- (empty)
