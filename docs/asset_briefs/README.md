# Asset briefs for Gemini (started 2026-09-18)

This folder holds the prompts Gemini draws from: one `SEG-<nn>_<family>.md` file per family of assets, each a list of briefs in the format of `art/briefs/FABLE_ASSET_BRIEF.md` §6 with the 2026-09-18 night precisions (48×48 at native resolution, anchor `[24, 47]`, U7 2.5D projection, palette-only ramps from `art/palette/uf.hex`). `INDEX.md` lists the segments and the order to work them.
Work one segment at a time: open it, open the reference square each brief names, deliver every brief in it (`art/masters/<id>.png` + `.json`), then move to the next. Where an older brief in `art/briefs/` disagrees with one here, the one here wins.
The ids in the headings are the catalog's (`game/data/UF_WorldCatalog.json`); the AR numbers are the rows of `docs/ASSET_REQUESTS.md`. Do not rename either.
Writers: after editing a brief, run the checker and fix every FAIL before reporting; read every WARN.
    "C:\Program Files\nodejs\node.exe" tools\check_briefs.js
    "C:\Program Files\nodejs\node.exe" tools\check_briefs.js --coverage --summary   (every catalog id needs a brief)
Rules and output: `docs/systems/CHECK_BRIEFS.md`. Delivered files are then checked with `tools/art_check.js` (`docs/systems/ART_CHECK.md`).
Owner of this folder: Claude Code (the briefs); Gemini writes only under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.
