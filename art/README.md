# art/: the original-art pipeline

Rewritten 2026-09-18 (night) by Claude Code when the asset briefs moved to `docs/asset_briefs/`. The rules come from `docs/ART_STANDARD.md` (binding), `docs/GUIDE_25D.md` (the lean, the faces, the transposed facings), `docs/ASSET_REQUESTS.md` (the requests, the AR-600 sheet standard, the status flow), `GEMINI.md` and `AGENTS.md` (who does what). Where this file and those disagree, they win.

**Start at `docs/asset_briefs/INDEX.md`.** It lists the segments (one file per family of assets), the working order (the four style anchors first, approved one by one), the delivery procedure from generation to the request row, the checker commands, and the rules that override the older brief template.

The look (user decisions 2026-09-18 night; `docs/VISION.md` V2, V9, V44): high-resolution 2.5D oblique art in the manner of the reference squares, every asset inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1; no 16×16 upscaling), the palette `art/palette/uf.hex` only, height leaning up and to the left at 45° with the top, south and east faces visible, micro-dithered shading, flat magenta `#FF00FF` background on masters, alpha 0 or 255, no baked ground shadow. The Ultima VII shapes are the reference and the development stand-ins; nothing copied from them ships (AGENTS.md rule 8).

## Folders

| Path | What is there | Who writes it |
|---|---|---|
| `docs/asset_briefs/SEG-*.md` (not in `art/`) | The briefs: one segment per family, every asset in Gemini's schema with the 48×48 precisions. `INDEX.md` there is the entry point. | **Claude Code** (checked with `tools/check_briefs.js`); Gemini reads |
| `art/briefs/FABLE_ASSET_BRIEF.md` | Gemini's brief template: its §6 is the schema the briefs use. The rest of the file (16×16 canvas, anchor `[12, 15]`, the 16×16 "Wave 1" masters) is superseded by `docs/asset_briefs/INDEX.md` → "Rules that override Gemini's own brief file". The 26 briefs of the 16×16 style that sat beside it were deleted on 2026-09-18. | **Gemini** |
| `art/u7_reference_squares/` | The reference squares: one decoded shape fitted into a 48×48 square, with a `_4x` copy that shows the pixels, listed in `catalog.json`. Reference and development stand-ins only. | Claude Code (the extraction tools) |
| `art/review/u7_square_composite.png` | The composite the user approved on 2026-09-18: fourteen reference squares each contained in one tile. Open it before the first brief. `art/review/` also holds the review page and per-asset review images (a master at 1× and 4× next to the person reference, on grass; ART_STANDARD §5 step 6). | **Gemini** (review images), Claude Code (page tool) |
| `art/palette/uf.hex` | The 256-colour project palette. Every index a brief cites is verified against this file. | Claude Code |
| `art/raw/<id>/` | Every generation output for one asset: one view per file, flat magenta background, the reference square and the approved anchors attached to the request (ART_STANDARD §5 step 3). | **Gemini** |
| `art/masters/<id>.png` + `<id>.json` | The cleaned master at native size (48×48, or the sheet, block or strip size the brief's Deliver line gives), palette-snapped, alpha 0/255, on the anchor `[24, 47]`, with its sidecar (§5 step 4). No clean tool exists on 2026-09-18, so this is done by hand. The 16×16 masters already in this folder (`settler_male_16x16`, the oak, the stump and the rest of the earlier standard's batch) are superseded (STATUS K17) and are not anchors. | **Gemini** |
| `art/APPROVALS.md` | The approval log: id, date, approved or rejected, reason. | **User only** (§5 step 7). Nobody else writes a line there. |
| `game/img/...` | The export: the approved master copied with no scaling (§5 step 8), plus the same sidecar; `!$` names for objects and items, `$` for creatures, people and layers, tileset sheets for ground and water, `faces/` and `system/` for portraits and UI. The table in `INDEX.md` → Delivery procedure says which catalog field or plugin picks each family up. | Gemini copies after the user's approval line; Claude Code wires what is outside the four catalog lists |

## Rules that bite

- **ALL GENERATION TASKS ARE TO UTILIZE GOOGLE NANO BANANA II** (AGENTS.md Rule 11, VISION V69, V70, V79, V109): Every visual asset across all categories (characters, creatures, wildlife, monsters, terrain, autotiles, world objects, items, equipment layers, portraits, facesets, icons, and UI) MUST originate exclusively from Google Nano Banana II (`generate_image`). No other generator model is allowed, and no agent is permitted to type in sprites pixel-by-pixel in code.
- **ALL ANIMATION MUST HAPPEN THROUGH THE SPRITE. NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108): All animations across every entity and environmental feature must be delivered and played as distinct pixel sprite animation frames on the sprite sheets. Never rely on programmatic distortion, shader warps, squashing/stretching, or code-driven after-effects.
- **Claim before you start** (AGENTS.md → Two agents): a line under "In progress" in `docs/STATUS.md`. Remove it when you report.
- **Anchors first.** The four anchors of `docs/asset_briefs/SEG-01_style_anchors.md` are made one at a time and each approved by the user before the next; nothing else starts until all four are approved (ART_STANDARD §5 step 2).
- **Only four catalog lists are Gemini's:** `objects`, `items.types`, `wildlife.species`, `people` (`docs/handoffs/HANDOFF_world_generation.md` §2). Everything else in `game/data/UF_WorldCatalog.json`, and all of `game/js/` and `tools/`, is Claude Code's. Engine needs go under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.

- **Nothing ships from the reference games** (AGENTS.md → Reference vs. shipped content): no copied shapes, no proper nouns or signature words in file names, display names, sidecars or tooltips. Generic, descriptive names; placeholder names start with `TEST_`; no invented lore.
- **Every sheet has a sidecar** of the same name: `frameWidth`, `frameHeight`, `anchor`, `facings`, `animations`, and `layer`, `species`, `stage` or `slot` where the brief says. The brief's Deliver line gives the values.
- **Check before you say delivered:** `"C:\Program Files\nodejs\node.exe" tools\art_check.js --sidecar art\masters\<id>.png` (`--type tileset` for a ground or water block, `--type face` for a face sheet). Paste its lines into the delivery note; until the tool has a 48-native mode (STATUS K17) ignore its `grid` line and nothing else. Write "not checked" for anything you did not run.
- **Mark the request row** `DELIVERED` with the backticked file name; that is how `tools/generate_asset_inventory.js` links the file to the request.
- **Commit your own files only:** `git add <paths>`, message starting `[gemini]`, one segment or one asset per commit. Never `git add -A`.
- **Say what you checked.** "Verified" needs evidence you produced and looked at in the session (AGENTS.md rule 3).
