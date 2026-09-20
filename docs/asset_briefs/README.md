# Asset briefs for Gemini (started 2026-09-18)

This folder holds the prompts Gemini draws from: one `SEG-<nn>_<family>.md` file per family of assets, each a list of briefs in the format of `art/briefs/FABLE_ASSET_BRIEF.md` §6 with the HD FF6 48×48 precisions (48×48 at native resolution, anchor `[24, 47]`, palette-only ramps from `art/palette/uf.hex`). `INDEX.md` lists the segments and the order to work them.

**MANDATORY GENERATION & ANIMATION RULES:**
- **ALL GENERATION TASKS ARE TO UTILIZE GOOGLE NANO BANANA II** (AGENTS.md Rule 11, VISION V69, V70, V79, V109). Every visual asset must originate exclusively from Google Nano Banana II (`generate_image`, model id `gemini-3.1-flash-image`). No other model is allowed.
- **ALL ANIMATION MUST HAPPEN THROUGH THE SPRITE; NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108). All motion across all assets must be delivered as discrete sprite animation frames on the sheets. No programmatic distortion, squashing/stretching, sine sway, or shader warps.

Work one segment at a time: open it, open the reference square each brief names, deliver every brief in it (`art/masters/<id>.png` + `.json`), then move to the next. Where an older brief in `art/briefs/` disagrees with one here, the one here wins.

The ids in the headings are the catalog's (`game/data/UF_WorldCatalog.json`); the AR numbers are the rows of `docs/ASSET_REQUESTS.md`. Do not rename either.
Writers: after editing a brief, run the checker and fix every FAIL before reporting; read every WARN.
    "C:\Program Files\nodejs\node.exe" tools\check_briefs.js
    "C:\Program Files\nodejs\node.exe" tools\check_briefs.js --coverage --summary   (every catalog id needs a brief)
Rules and output: `docs/systems/CHECK_BRIEFS.md`. Delivered files are then checked with `tools/art_check.js` (`docs/systems/ART_CHECK.md`).
Owner of this folder: Claude Code (the briefs); Gemini writes only under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.
