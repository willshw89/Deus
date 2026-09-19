# HANDOFF: stance rings and the selection ring (VISION V32, revised 2026-09-19)

Written 2026-09-19 by Claude Code for Gemini. The user, 2026-09-19 14:40: "Lets make the selector and squares under creatures a circle instead".

## What changed in the game
- `UF_Stance` now draws every stance marker as a flattened pixel-art ring under the feet: 40×20 under a creature on a 48 px sheet, 80×40 under one on a 96 px sheet. Green friendly, yellow indifferent, red hostile, colours and alpha from the catalog's `stance` entry. A solid darker rim around a filled middle.
- The selected unit gets a bright iron ring, 44×22 (88×44), open in the middle, on the same centre as its stance ring, pulsing through three frames (dim, bright, brightest).
- Both are code-drawn today (`UF_GenStance_*`, `UF_GenSelect`). What they look like in play: `game/test_output/stance.rings_zoom_1.png`, `stance.rings_zoom_23.png`, `stance.rings_zoom_13.png` after `run_tests.bat stance`.

## What to make
Two requests, full spec in `docs/ASSET_REQUESTS.md`:
| Request | Files | Frames |
|---|---|---|
| AR-034 Stance rings | `art/masters/ui_stance_ring_1.png` (120×20), `ui_stance_ring_2.png` (240×40), + sidecars | friendly, indifferent, hostile, side by side; 40×20 / 80×40 each |
| AR-031 Selection ring | `art/masters/ui_select_ring_1.png` (132×22), `ui_select_ring_2.png` (264×44), + sidecars | 3 pulse frames, dim, bright, brightest; 44×22 / 88×44 each |

The rules that matter most:
- **An ellipse exactly twice as wide as tall that touches all four frame edges.** Nothing in the frame's corners. The engine's `ring_shape` check reads the code-drawn rings this way, and the art is reviewed against the same shape.
- **Alpha 0 or 255 only** (ART_STANDARD F5). The stance ring's translucent middle is a 1-px checker of colour and transparent; the engine draws the art at full opacity.
- **It must read at zoom 1/3**, where a 40×20 ring is 13×7 screen pixels. A bare thin ring breaks up there (measured 2026-09-19: 16 of 98 screen pixels changed for a bare ring against 52 of 98 for a filled one), which is why the stance ring has a filled middle.
- **The pulse is brightness only:** the three selection frames have the same outline; only the band's colour changes.
- The palette entries for each colour are in the requests (they match the SEG-16 briefs' ramps).

## Superseded
The square set delivered 2026-09-19 (`art/masters/ui_stance_friendly.png`, `ui_stance_indifferent.png`, `ui_stance_hostile.png`, `ui_target_square.png`) is square, so it no longer matches V32. The engine never loaded it and it was never exported or approved. Keep the files in `art/masters/` for the record, and don't export them. The square briefs in `docs/asset_briefs/SEG-16_ui.md` and the `target_square` / `stance_squares` rows in `HANDOFF_sprites_batch1.md` carry a pointer to this handoff.

## How it plugs in
- Nothing in `game/data/UF_WorldCatalog.json` changes: the ring colours stay the catalog's `stance.colors`, and the rings are interface art, not world objects.
- After the user approves a delivery (a line in `art/APPROVALS.md`), export it unchanged to `game/img/system/UF_StanceRing_1.png`, `UF_StanceRing_2.png`, `UF_SelectRing_1.png`, `UF_SelectRing_2.png`, and write the file names under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.
- Claude Code then switches `UF_Stance` from the generated bitmaps to the files, keeping the placement it uses now: the ellipse's centre 10 px per square above the bottom row of the unit's cell, the stance ring at z = foot row − 50, the selection ring one above it, both under the character. Don't edit `game/js/`.

## Checks before you mark a request DELIVERED
1. `"C:\Program Files\nodejs\node.exe" tools/art_check.js --sidecar art/masters/ui_stance_ring_1.png` (and the other three): palette and alpha 0/255 must pass. Ignore its 3×-grid check for these native-resolution masters.
2. `tools/originality_check.js` on each master (rings are simple shapes, so this should pass easily; run it anyway).
3. A review render in `art/review/`: the rings under a person, a wolf and a 96 px monster on meadow at zoom 1, 2/3 and 1/3, next to the code-drawn rings from the screenshots above. Open it and describe it in the status line.
