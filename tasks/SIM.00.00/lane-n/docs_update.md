# SIM.00.00 (Lane N): system-doc changes for the integrator

`docs/` is outside Lane N's allowed paths, so these edits are proposed here and not made. ENGINE_RULES §2 asks for every
system to be documented in `docs/systems/`; the text below is ready to paste. Line numbers are as of `main` 8e99f6c5.

## docs/systems/UF_Levels.md

Line 53 (`setView` row), replace the description with:

> Shows level z in place (SIM.00.00): the map scene, its Spriteset and the simulation keep running; keeps the cursor and
> the camera (or centres on `center`). Without a started map scene it falls back to a transfer.

Line 56 (`switching()` row), replace the description with:

> A switch is in progress: from the request until the Spriteset rebinds to the new level (the next frame), or until
> Scene_Map.start for a transfer.

Line 59 (`stats()` row): in `lastSwitch`, replace `{ from, to, ms, frames, reused, follow }` with

> `{ from, to, ms, frames, renderFrames, reused, follow, inPlace, swapMs, rebindMs, fogMs, workMs, syncBuilds, events }`
> (`ms`: performance.now from the request to completion; `frames`: Scene_Map updates between; `renderFrames`:
> Graphics.frameCount between; `swapMs` / `rebindMs` / `fogMs`: the in-place swap, the Spriteset rebind, the fog refresh;
> `workMs` their sum; `syncBuilds` 1 when the swap had to build the level; a transfer fallback records only the first six)

Line 259, replace the bullet with:

> - A switch happens in place (SIM.00.00, 2026-09-26): `UF.World.switchViewInPlace` puts the level's build (prewarmed)
>   on screen as `$dataMap`, sets `$gameMap` up on it and places the view; the cursor cell and the display position are
>   kept (or centred on a followed unit); the zoom stays; `state.view` is recorded at once. The Scene_Map and its
>   Spriteset stay: at the start of the Spriteset's next update `UF.World.rebindSpriteset` gives the tilemap the new
>   level's data and tileset and swaps the event sprites, before any layer updates, so tiles, units, objects, items,
>   fog and depth planes all change level in the same frame; then the fog is refreshed and `levels:viewChanged` fires.
>   The simulation never pauses (every map update advances `UF.Time.ticks()` by one). No autosave, the image cache is
>   kept. Without a started map scene (or during a transfer) it falls back to the old transfer with no fade.
> - **Prewarm:** a map load (New Game, a loaded save, an area transfer) holds its start until every level of the view's
>   area is built, one build per frame of the load (`UF.World.prewarmStep({ all: true })` in `Scene_Map.isReady`); in
>   play one step a frame (a build, a walk grid or image requests) keeps the ring z±1, z±2 warm. The view's level and its
>   ring are pinned in the peek cache. A switch therefore never builds a level; if one ever has to,
>   `UF.World.viewSwitchStats().syncBuilds` counts it.

Line 300 (`switch_time` row), replace "(performance.now from the key frame to Scene_Map.start)" with
"(performance.now from the key frame to the switch's completion: the Spriteset rebind in place, Scene_Map.start for a
transfer)". Measured on 2026-09-26, seed 18: ground → -1 24 ms, -1 → ground 23 ms (main: 463 ms and 136 ms).

Add under the checks: the SIM.00.00 harness `node tools/test_layer_switch_inplace.js` (7 checks, 8 mutants, perf JSON);
see its header.

## docs/systems/UF_World.md

Line 27 (`peekArea` row), append: "The view's level and the levels a switch can land on (z±1, z±2) are pinned: eviction
skips them."

Line 40, replace "`adoptBuild(ax,ay,z,map)`, `cachedBuild(ax,ay,z=0)`, `refreshUnitEvents(map,ax,ay,z=0)`,
`reconcileEvents()` support view switching." with:

> `adoptBuild(ax,ay,z,map)`, `cachedBuild(ax,ay,z=0)`, `refreshUnitEvents(map,ax,ay,z=0)`, `reconcileEvents()` support
> view switching. In-place level switch (SIM.00.00): `switchViewInPlace(ax,ay,z,x,y,dir)` → `{ mapId, level, built, ms,
> events, added }` or null (no started map scene / a transfer under way: transfer instead); `rebindSpriteset(ss)` binds a
> Spriteset_Map's tilemap and event sprites to `$dataMap` (called by UF_Levels at the start of the Spriteset's update;
> event sprites of the level that left are removed, not destroyed); `viewSwitchStats()` → `{ switches, syncBuilds,
> rebinds, last, lastRebind: { ms, dropped, added, split: { tiles, drop, create, add, events } } }`. Prewarm:
> `prewarmStep({ all })` does one unit of work (a level build, its walk grid, or its image requests) for the view's ring
> z±1, z±2 (or every level of its area) and returns `{ z, did, ms }` or null when warm; `coldLevels()` lists ring levels
> without a build a switch may show; `prewarmStats()`; `prewarmConfig.enabled`. A build may be shown when it was on screen
> before or was made by the prewarm, for the current world state; builds made only for off-screen reads are never shown.

Line 72 ("Map loading"), append: "Level switches no longer load a map: they happen in place (see UF_Levels). A map load
waits in `Scene_Map.isReady` until every level of the view's area is prewarmed (one build a frame)."

Line 43 (`transferView`), append: "UF_Levels uses it only when an in-place switch isn't possible."

## Events

`world:areaBuilt` / `world:levelBuilt` now also fire when a level is shown in place (from `rebindSpriteset`, the frame
after the switch), as they did on the map load of a transfer.
