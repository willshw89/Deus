# Camera, item input and open-space depth plan

Status: **QUEUED / DESIGN ONLY**, 2026-10-02. Owner decisions at 22:27, 22:32 and 23:54 CT are recorded in [DECISIONS.md](../DECISIONS.md), D-2026-10-02-18, -19 and -26. Fold this into the queued **UI-FULLSCREEN / depth-plan** work after **ORG-0.2 is green**. No implementation, new art or test pass is claimed here. DEC-037 remains in force.

## Camera and controls

| Zoom | Purpose | Approximate visible tiles at 1920x1080 | Item dragging |
|---|---|---|---|
| 0.5x | Overview; look and order | 80x45 | Disabled |
| 1x | Default colony view | 40x22 | Enabled |
| 2x | Close work | 20x11 | Enabled |

The allowed zoom set is exactly **0.5x, 1x, 2x**. The Owner's explicit 0.5x overview is the exception to the accompanying "whole-number steps only" wording; do not introduce intermediate zoom values. Plain mouse wheel changes zoom toward the cursor and **never changes z**. Shift+wheel changes z, with PgUp/PgDn as backups. Level switching uses the already queued **fade-only transition**.

Each item's hit area is at least **16x16 screen pixels**, regardless of its sprite dimensions or the zoom. Hover shows an outline and the item name. If items/furniture overlap under the cursor, select the smallest item first (mug before table). A dragged item follows the cursor at true size under the shared camera, retaining its outline. Dragging is unavailable at 0.5x; look and order remain available. Zoomed container windows and a hold-to-magnify key remain optional later work.

## Depth through holes, cliffs, chasms and stairwells

This amends DEC-011's earlier prohibition on depth shading while retaining its **flat 1:1 geometry between levels**. All drawn levels use the same camera zoom. Depth introduces no per-level scaling, projection offset, parallax or blur. [DEUS_Depth.md](../systems/DEUS_Depth.md) describes the existing system; its old unshaded behavior is not a claim that this queued design has been implemented.

| Level relative to view | Planned appearance | Draw rule |
|---|---|---|
| Above current z | Invisible | Never draw |
| Current z | Full brightness | Normal current-level drawing |
| z-1 | About 60% brightness; about 50% desaturated; cool blue cast | Only through open space in the current level |
| z-2 | About 30% brightness; mostly gray with a cool blue cast | Only where the current level AND z-1 are open |
| z-3 and deeper | Black | Do not render these levels at all; show black beyond the two drawn lower levels |

Every level between the view and a lower surface must be open at that location. A solid intervening cell blocks the lower view even when the cell's art has transparent pixels. The two-level draw limit is relative to the **current** z; it does not impose an absolute world-depth limit or stop simulation below the view. Brightness values belong in a data config so the Owner can tune them. The exact cool-blue color value remains unspecified. Water, lava, colonists and enemies retain some identifying tint instead of becoming uniformly gray.

At a drop edge, the current floor gets a 2–4 px dark rim and a short shadow onto the lower level. After ART-WIRE-WALLS, lower wall faces use the Owner's cliff art. Wall-face height remains an Owner choice between 48 and 96 px; this plan does not change the existing size tables or approve new art.

The renderer must omit lower-level drawing beyond z-2, not render it and then cover it with black; it must never draw every lower level and darken afterward. Bake the static depth grade into cached chunks and rebake affected chunks only when digging, building or collapse changes them. Moving sprites alone receive a live tint. No measured FPS or draw-time improvement is claimed before implementation and testing.

## Required future acceptance checks

1. Exercise wheel zoom in both directions and at the bounds: observed values are only 0.5, 1 and 2; zoom remains anchored toward the cursor.
2. Prove plain wheel never changes z, Shift+wheel changes z, and PgUp/PgDn provide the same level navigation. Inspect the fade-only transition.
3. At 1x, select a 4-px item through its minimum 16x16-screen-px hit area; verify minimum hit size also at 0.5x and 2x. Hover must show the outline and name.
4. Put a mug over a table: overlap selects the mug. Check drag outline/true size at 1x/2x and that item dragging cannot start at 0.5x while look/order still works.
5. Render a fixture looking from z0 into a three-deep open shaft, with objects above the view: current z is full brightness, z-1 is about 60% brightness/50% desaturated with a cool blue cast, z-2 is about 30% brightness and mostly gray, z-3 is black, and nothing above current z appears. Check the 2–4 px dark rim, short shadow and lower cliff-art wall faces when ART-WIRE-WALLS is available; water, lava, colonists and enemies retain some identifying tint. Open and inspect the screenshot, then provide the z0-into-shaft image for Owner review.
6. Use draw instrumentation as well as screenshots to prove **zero draws** for z-3/deeper and above-current-z contents; drawing all lower levels then darkening or covering them is a failure.
7. Block an intervening level and confirm deeper contents disappear; reopen it and confirm visibility returns. Repeat from another current z to prove the limit is relative to the view.
8. Change the brightness data values and verify the two lower levels respond without code edits, while the draw limit and 1:1 geometry remain unchanged.
9. Show that unchanged static chunks do not rebake each frame; digging, building and collapse dirty/rebake only affected chunks. Moving sprites receive live tint without forcing static chunk rebakes.
10. On the same seed and scene, capture performance-overlay readings before and after the future depth change. Report the recorded SHA and frame, tick, draw, worldgen/load milliseconds and heap readings without claiming a gain or pass threshold that has not been measured or approved.

The item-on-furniture fixture belongs to ART-SCALE-1, D-2026-10-02-17: table, desk, shelf and counter, with contact anchors, surface heights, free placement, furniture-relative movement and screenshot checks for floating/clipping. It shares the camera above but remains a separate acceptance fixture. All these checks are **planned, not run**.
