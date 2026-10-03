# DISPLAY-16x9 — 1920×1080 logical display

**Status:** PARKED, 2026-10-03. Owner-requested documentation only. The runtime lane stays parked until ORG-0.2 is green and WORLD-3x3 is complete, then runs immediately after WORLD-3x3, ahead of DATA-RNG, and before further visual baselines. See [the sequence](README.md). **Writer:** Grok. **Reviewer:** Claude (cross-family). This page changes no `System.json`, plugin, test, art, or WBS status. Cited behavior is local main `038a02c3`, read in this filing, and is not a green playtest.

**Why the player cares:** The settlement, HUD, and windows should stay sharp and seated on a 16:9 view, at the usual world zoom and when the player zooms, on a 1080p screen and on a 4K screen.

## What main `038a02c3` does now

`game/data/System.json:1` is a single JSON line (the file ends with a newline). `advanced.screenWidth` and `advanced.uiAreaWidth` are 816. `advanced.screenHeight` and `advanced.uiAreaHeight` are 624. `advanced.screenScale` is 1. `tileSize` on that same object is 48. Those are database fields, not a measured window.

`Scene_Boot.resizeScreen` copies the screen fields into `Graphics.resize` and copies `screenScale` into `Graphics.defaultScale` (`game/js/rmmz_scenes.js:348-372`). `adjustBoxSize` then sets `Graphics.boxWidth` and `boxHeight` to the UI-area fields minus a `boxMargin` of 4 on each side (lines 357-362). `Graphics.initialize` starts width, height, and both box fields at 0 (`game/js/rmmz_core.js:480-517`). On NW.js, `Graphics.initialize` turns stretch mode on (`rmmz_core.js:863-865`); F3 toggles it (lines 968-985). While stretch is on and the screen size is non-zero, `_realScale` is the minimum of the window-to-screen ratios (lines 823-831), so that ratio can be fractional. `adjustWindow` sizes the NW.js window to `Graphics.width * screenScale` by `Graphics.height * screenScale`.

World zoom is a different control. `DEUS_Camera.js:33-36` and the object at lines 58-62 set the live range and discrete levels to 0.5, 1, and 2. `setZoom` still accepts other values inside that closed range (line 93). The file header (line 2) and the plugin help (lines 13 and 25) describe 0.5×–3.0× and levels `[1.0, 0.75, 0.5]`; the constants in force are the 0.5 / 1 / 2 set. The tilemap extent at lines 215-224 is `ceil(Graphics.width / zoom)` by `ceil(Graphics.height / zoom)`. That is the logical world view. Outer display scale is `_realScale`, `screenScale`, and `adjustWindow`.

`git grep -n -E '\b(816|624)\b' 038a02c3 -- game/js/plugins` returned 19 lines in nine files and 20 literals: twelve 816 and eight 624. Seventeen lines are runtime fallbacks. Two lines are test preconditions. None of those plugin hits is only a comment.

| Kind | Where on `038a02c3` | Width and height |
|---|---|---|
| Box, both axes | `DEUS_Bag.js:359-360` | `boxWidth` / `boxHeight` when `Graphics` exists, otherwise 816 / 624. A live value of 0 is kept. |
| Width, then box | `DEUS_Camera.js:339` and `474-475`; `DEUS_Fog.js:556-557`; `DEUS_Levels.js:5179`; `DEUS_Select.js:2221-2222`; `DEUS_TimeSpeed.js:285` | Prefer `width` / `height`, then the box field. A missing `Graphics` or a 0 falls through to the literal. Line 339, Levels, and TimeSpeed are width only. Remembered `sliderX` / `sliderY` at `DEUS_Camera.js:335-337` skip the initial right-edge placement. |
| Box, then width | `DEUS_Depth.js:90`, `95`, `100`, `105` | Prefer the box field, then `width` / `height`, otherwise 816 / 624, then divide by world zoom. |
| One bitmap line | `DEUS_DepthDemo.js:453` | `Graphics.boxWidth \|\| 816` and `boxHeight \|\| 624`. This assumes `Graphics` exists. That sprite sets `bitmap.smooth = false`. |
| Height only | `DEUS_Containers.js:1495` | `boxHeight`, otherwise 624. Width 380 and origin `(44, 82)` at lines 1494-1496 are separate fixed layout. |
| Hard width check | `DEUS_Depth.js:1936`, `2385` | `Graphics.width === 816`, then the suite returns. `depth` and `layers_flat` end `isDefault: false` at lines 2380 and 2685. |

`DEUS_Test.js:302` and `DEUS_Camera.js:601-608` already read live `Graphics` dimensions. `DEUS_Select.js:3392-3400` and `DEUS_FactionMenus.js:724-742` place synthetic or DOM input with `Graphics._realScale` and the canvas rectangle. `DEUS_Fog.js:547` sets the fog bitmap `smooth` flag for cell edges. `DEUS_DepthCues.js:788-794` defines `recommendScale` (2 at width ≥ 1920, 3 at ≥ 2560); its comment says the demo keeps scale 1. The approved outer scale below uses 1× at 1080p and 2× at 4K. `recommendScale` is an unapplied hint with different thresholds.

The same digits also occur outside `game/js/plugins`. `game/package.json:7-8` is the NW.js window width 816 and height 624. Tools and docs contain further matches. This page does not give those a total, and it does not treat them as cleared.

## Owner-approved future behavior

Not started. Every evidence item below is pending.

1. Change only `advanced.screenWidth`, `screenHeight`, `uiAreaWidth`, and `uiAreaHeight` to 1920, 1080, 1920, and 1080. Leave every other byte of `System.json` in place, including `screenScale` and `tileSize`, and keep valid RMMZ JSON. The `game/package.json` window size is outside that edit. Classify it for an explicit ruling.
2. Replace old 816/624 display fallbacks with live `Graphics.width` / `height` or `boxWidth` / `boxHeight`. Do not substitute another magic number. The end report includes the literal search, every file changed, and confirmation that no old display literal remains in the target scope. Classify and surface an unrelated numeric match.
3. Outer window scale is an integer, nearest neighbor, with smoothing off: 1× at 1080p, 2× at 4K, and letterbox on other sizes. World zoom stays 0.5 / 1 / 2. Engine core stays protected: `game/js/libs/`, `game/js/rmmz_*.js`, and `game/js/main.js`. This page leaves the plugin approach around today's fractional `_realScale` path for that later lane.
4. When the usable drawable area is below 1920×1080, a positive integer upscale plus letterboxing cannot fit that framebuffer: integer factors stay at 1× or above, and letterboxing does not crop. The fit rule for that boundary is an implementation-time policy. This page adds no fractional scale and no crop.
5. Check camera and culling counts at world zoom 0.5, 1, and 2 on 48 px tiles. The Owner's theoretical full framebuffer at 1920×1080 is 80×45, 40×22.5, and 20×11.25. Those are targets. They are not measurements from this filing. Camera code ceils `Graphics.width / zoom`, and the depth view prefers the box size, which boot sets 8 px inside the UI area. Verify the UI-obscured viewport and culling margins separately. On the post-WORLD-3x3 green base, take a same-seed before/after overlay at 1× on the start area, seed `1920951434`, year 500, with the same machine, run method, content, and camera, and name the source SHA.
6. Edge-anchor menus, the HUD, the action bar, inventory and containers, and the main windows. Open a screenshot of each, plus the 1× and 2× map views.
7. Replace fixed-coordinate test interactions and readbacks with Graphics-relative values. Preserve the checks and the behavior. Re-record screenshots once in the future lane and retain prior evidence. Native `run_tests.bat` must be green with the same starting pass count plus the explicitly updated coordinate tests. Record ids and counts. Visible-unit-driven dynamic counts are a known risk. They do not relax the gate or drop asserts.

Future consumers are `DEUS_Camera` (zoom and the tilemap window), `DEUS_Depth` and `DEUS_Fog` (zoomed view extent), the HUD and window plugins in the table above, and the test readbacks that assume a fixed screen. Take queued fullscreen, camera, and culling edits by explicit ownership. DEC-037 still freezes faction and society behavior. Hit-testing in `DEUS_FactionMenus.js` stays a display concern for that later lane. Leave `art/sprites/` and `PROVIDER_USAGE_STATUS.json` untouched.

## Acceptance still pending

This filing ran none of these.

- The four `System.json` fields, plus a check that every other byte in that file stayed put.
- The literal-search report, the file list, the in-scope confirmation, and a classification of each out-of-scope 816/624 match.
- 1080p at 1×, 4K at 2×, letterbox on other sizes, nearest neighbor, and a written below-base policy before fit code.
- The three theoretical view counts set beside the measured UI-obscured viewport, plus the seed `1920951434` / year 500 overlay and its SHA.
- Opened screenshots for the named windows and for the 1× and 2× maps.
- Native `run_tests.bat` counts and failing names, the updated coordinate test ids, retained prior baselines, cross-family review, and Deus laptop confirmation. Any required sign-off stays with the Owner.

## Limits of this page

This is a parked plan. It records the `038a02c3` baseline and the Owner's future gate. It is not a pass count, a screenshot review, or a claim that the 816/624 literals are already gone.
