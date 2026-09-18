# AUDIT LOG

Claude Code audits Gemini's work here (AGENTS.md → Audits). Newest entry at the top.
Grades: **BLOCKER** (can't ship or show; breaks a locked decision) · **MAJOR** (wrong result; must be fixed before the slice is approved) · **MINOR** (process or cleanup).
Every finding cites evidence. When a finding is fixed, mark it `FIXED <date> <commit>`. Don't delete it.

---

## A2: Gemini changes 2026-09-18, 14:41–14:48 local (uncommitted: UF_Core, UF_ColonyOverseer, UF_Construction, UF_ProcGen, UF_Perspective25D, Actors/System/Map002)
**Audited by:** Claude Code, 2026-09-18
**Evidence used:** `git diff` against `baseline-2026-09-18`; a `UF_Test` smoke run on a snapshot of `game/` taken at 14:48:43; the user's Playtest screenshot of the glade (river, mushrooms, ferns).
**Verdict: FAIL** (A2-1, A2-2, A2-3)

Smoke run (14:48:43 snapshot):
```text
PASS smoke.reached_map - map 2 "The Glade of Genesis"
PASS smoke.player_not_visible
PASS smoke.event_drawn.Adam - at screen (312,234)
PASS smoke.event_drawn.Eve - at screen (541,149)
PASS smoke.event_drawn.Ancient_Fruit_Tree - at screen (408,192)
FAIL smoke.save_serializes - Cannot read property 'name' of undefined; failing save keys: system
PASS smoke.no_errors - none in first ~3 s on map
RESULT: 6 passed, 1 failed (exit 1)
```

| # | Grade | Finding | Evidence | Status |
|---|---|---|---|---|
| A2-1 | MAJOR | **Saving crashes.** `$gameSystem._colonyWindow = this._colonyCard` puts a UI window into `$gameSystem`, which goes into every save. RMMZ's `JsonEx` can't serialize it, so save fails. Fix: keep the window on the scene (`this._colonyCard`) or in a module variable, never on anything that `makeSaveContents` includes. | `UF_ColonyOverseer.js:413`; smoke `save_serializes` FAIL, failing key `system` | OPEN |
| A2-2 | MAJOR | The old autotest actions still run in **normal play**. Every map start opens and closes the paperdoll and a container, runs the Thorgar dialogue including [Join]/[Part], triggers a strange mood, and so on. Line 163 still prints `ALL UF GAMEPLAY SYSTEMS VERIFIED 100% OPERATIONAL!` unconditionally. Fix: delete the whole autotest block and `run_autotest.bat`. `UF_Test.js` + `run_tests.bat` replace them. | `UF_Core.js` `Scene_Map.prototype.start` (~93–165), line 163 | OPEN |
| A2-3 | MAJOR | The glade's ground clutter (mushrooms, ferns, rocks, stumps) is upright RMMZ RTP art placed as tiles, not the U7 projection (V2). Fix: GUIDE_25D §3–4 (U7 stand-in objects drawn as sprites). | User's Playtest screenshot, 2026-09-18 | OPEN |
| A2-4 | MINOR | The HUD shows "ULTIMA FORTRESS" and the unapproved calendar ("1 Deep-Frost"). | User's screenshot, top right | OPEN |
| A2-5 | MINOR | `game/data/*.json` changed while the RMMZ editor was open (RPGMZ.exe running since 13:53). If the user saves in the editor, those changes are overwritten. | ENGINE_RULES §3; process list | OPEN |

Credit: K1 is fixed (`UF_Core.js:84` now matches only `autotest`), the player is hidden (smoke PASS), and the river renders as continuous water (user's screenshot).

---

## A1: Gemini changes 2026-09-18, 14:35–14:38 local (Adam/Eve rebuild, glade map, autotest run)
**Audited by:** Claude Code, 2026-09-18
**Scope:** `scratch/build_true_25d_characters.ps1`, `game/img/characters/$Adam.png`, `$Eve.png`, `$U7_Avatar.png`, `game/data/Map002.json`, `game/js/plugins/UF_Core.js`, `UF_Perspective25D.js`, and the run at 19:38 UTC (`game/game_runtime.log`, `game/test_screenshot.png`)
**Note:** `AGENTS.md` was created at 14:33, during this work. Process findings are recorded for the future, not as blame.
**Verdict: FAIL**

| # | Grade | Finding | Evidence | Status |
|---|---|---|---|---|
| A1-1 | BLOCKER | `$Adam.png`, `$Eve.png`, and `$U7_Avatar.png` are decoded straight from U7 `SHAPES.VGA` (shapes 458, 452, 464): ripped art in `game/`. | `build_true_25d_characters.ps1:74-155`; AGENTS rule 8, VISION V9 | RESOLVED 2026-09-18 by user decision: U7 stand-ins are allowed. Remaining: rename to the `U7_` prefix and list in STATUS → Stand-ins (MINOR). |
| A1-2 | MAJOR | The east-facing row is the west row mirrored horizontally, so the figure leans **up-right**. Everything in the U7 projection leans up-left, so a left-right mirror can never make a valid facing. | `build_true_25d_characters.ps1:107,126-128`; Adam sheet viewed at 4×: the third row (east) leans the wrong way; ART_STANDARD F2/F4 | OPEN |
| A1-3 | MAJOR | Frames are scaled by 1.3×, which gives uneven pixel sizes. | `build_true_25d_characters.ps1:120-124`; ART_STANDARD §2 (integer 3× only) | OPEN |
| A1-4 | MINOR (was MAJOR; acceptable as a stand-in) | "Adam" and "Eve" come from clothed U7 townsfolk (red cap, grey vest). V4 says naked. | Adam sheet viewed at 4× | OPEN |
| A1-5 | MAJOR | The stream renders as a repeating grid of small blue and brown blobs down the right side of the screen. | `game/test_screenshot.png` (19:38 UTC), x≈630–760, full height | FIXED 2026-09-18 (user's screenshot shows continuous water; not committed yet) |
| A1-6 | MAJOR | The player character "Delver" is still on screen and is still the party leader. V4 says there's no protagonist. | Log line `Party leader: Delver`; the third figure at (456,378) in the screenshot | FIXED 2026-09-18 (smoke `player_not_visible` PASS; not committed yet) |
| A1-7 | MAJOR | The autotest still prints success unconditionally and still hijacks Playtest (STATUS K1/K2). It also still exercises rejected content (recruiting Thorgar, the Delver). | `UF_Core.js:84`; log lines "Party size after [Join]", "Integration test completed successfully" | PARTLY FIXED: the Playtest hijack is fixed (line 84). The rest carries over to A2-2. |
| A1-8 | MINOR | The fruit tree (`!$FruitTree.png`) has an isometric diamond base, not the U7 projection. | Screenshot; VISION "Rejected: isometric diamond grids" | OPEN |
| A1-9 | MINOR | Work not claimed in STATUS, no report in the AGENTS format, nothing committed. | `docs/STATUS.md` | OPEN |

**What to do instead (for Gemini):** don't spend more time on U7-derived or AI-generated character sprites before Slice 0 is approved. Slice 1 placeholders are grayboxes (ART_STANDARD §6), generated by the graybox tool once it exists. Decoding U7 shapes is still useful for **measurement**: keep that output in `reference/` or `scratch/`, never in `game/`.

**Useful result:** the decoded frames in the south, west, and north rows clearly lean up-left. That supports ART_STANDARD F4, provided the decoder is right. It still needs checking against a real in-game screenshot.
