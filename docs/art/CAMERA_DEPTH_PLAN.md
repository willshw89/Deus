# Camera, item input and open-space depth plan

Status: **QUEUED / DESIGN ONLY**, 2026-10-02. Owner decisions at 22:27 and 22:32 CT are recorded in [DECISIONS.md](../DECISIONS.md), D-2026-10-02-18 and -19. Fold this into the queued **UI-FULLSCREEN / depth-plan** work after **ORG-0.2 is green**. No implementation, new art or test pass is claimed here. DEC-037 remains in force.

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
| z-1 | About 60% brightness; slight cool tint | Only through open space in the current level |
| z-2 | About 30% brightness | Only where the current level AND z-1 are open |
| z-3 and deeper | Black | Do not render these levels at all; show black beyond the two drawn lower levels |

Every level between the view and a lower surface must be open at that location. A solid intervening cell blocks the lower view even when the cell's art has transparent pixels. The two-level draw limit is relative to the **current** z; it does not impose an absolute world-depth limit or stop simulation below the view. Brightness values belong in a data config so the Owner can tune them. The exact tint color is not specified by this decision.

The renderer must omit lower-level drawing beyond z-2, not render it and then cover it with black. This is the approved way to bound depth draw work; no measured FPS or draw-time improvement is claimed before implementation and testing.

## Required future acceptance checks

1. Exercise wheel zoom in both directions and at the bounds: observed values are only 0.5, 1 and 2; zoom remains anchored toward the cursor.
2. Prove plain wheel never changes z, Shift+wheel changes z, and PgUp/PgDn provide the same level navigation. Inspect the fade-only transition.
3. At 1x, select a 4-px item through its minimum 16x16-screen-px hit area; verify minimum hit size also at 0.5x and 2x. Hover must show the outline and name.
4. Put a mug over a table: overlap selects the mug. Check drag outline/true size at 1x/2x and that item dragging cannot start at 0.5x while look/order still works.
5. Render a fixture with a three-deep open shaft and objects above the view: current z is full brightness, z-1 is cool/shaded, z-2 is darker, z-3 is black, and nothing above current z appears. Open and inspect the fixture screenshots.
6. Use draw instrumentation as well as screenshots to prove **zero draws** for z-3/deeper and above-current-z contents; an invisible or black-covered draw is a failure.
7. Block an intervening level and confirm deeper contents disappear; reopen it and confirm visibility returns. Repeat from another current z to prove the limit is relative to the view.
8. Change the brightness data values and verify the two lower levels respond without code edits, while the draw limit and 1:1 geometry remain unchanged.

The item-on-furniture fixture belongs to ART-SCALE-1, D-2026-10-02-17: table, desk, shelf and counter, with contact anchors, surface heights, free placement, furniture-relative movement and screenshot checks for floating/clipping. It shares the camera above but remains a separate acceptance fixture. All these checks are **planned, not run**.
