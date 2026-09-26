# SIM.00.00 (Lane N): escalations

Lane N needs no hook in DEUS_Depth or DEUS_Minimap for the in-place switch: both follow the level on screen by
themselves, and the tests pass without any change to them. The points below are for their owners (Lane K / the PM).
Evidence: `tools/test_layer_switch_inplace.js` runs of 2026-09-26, `perf/tip/layer_switch_perf.json`, and reading the code.

## E1. DEUS_Minimap redraws a level over 32 frames after a Z change (Lane K)

`Minimap.activeZ` follows the view in its own update (DEUS_Minimap.js ~L606-612), in the same frame as the switch; the HUD
shows that level's own base bitmap at once (checked: `new_level_shown_at_once` compares `hud._baseSprite.bitmap` with
`Minimap.baseBitmap()`). But the `activeZ` setter marks all 256 chunks of the level dirty (`markAllChunksDirty`,
~L412-417) and `processDirty(8)` redraws 8 a frame (~L616), so a level's picture is brought up to date over 32 frames
(about half a second): the last drawn state (or the dark fill on a first visit) shows until then. Same on `main`. If the
minimap must be current in the first frame, it needs either a larger budget on a Z change or per-level bitmaps kept
current while off screen. Minimap also takes its area from `UF.World.currentArea()`, which is the ground only (null off
the ground, falling back to area 0,0): fine in the 1x1 world, wrong for other areas in a multi-area world off the ground.

## E2. DEUS_Fog.refresh costs about 1.3 s on the ground of the seed-18 world (fog owner)

Fog of war is disabled in play (directive 2026-09-22; `Fog.setEnabled` forces false), so play is not affected. The
lane's switch calls `UF.Fog.refresh()` when it completes, so a fog that is enabled shows the new level's visible cells
at once instead of up to 20 frames later (DEUS_Fog refreshes every 20 frames by itself). With the fog forced on in the
test, that refresh took 1276-1333 ms on the ground and 1-2 ms on the other levels (769 units on the ground; `fogMs` of the
round-2 rows in `perf/tip/layer_switch_perf.json` and `evidence/layer_switch_perf.json`), and DEUS_Fog's own periodic
refresh would cost the same every 20 frames. Before the fog is enabled again its
refresh needs to be made cheap (observer scan and line-of-sight marking). Note on `main`: the first frame after a switch
with the fog on shows the whole view dark (screenshot `perf/main/layer_switch_inplace.fog_on_Ground.png`), because the
visible set is empty until the next periodic refresh.

## E3. DEUS_Depth still draws the `deus` preset (scale and blur) under +1/+2 (Lane E / Lane K)

Not a SIM.00.00 matter, seen in the evidence: the +2 screenshots (`evidence/layer_switch_inplace.2_p2.png`) show the
levels below scaled and blurred. DEC-011 (Owner, 2026-09-25) asks for 1:1 layers with no blur, scale or filter. Depth
needs no hook for the in-place switch: its root rebinds its planes when the view level changes (per-frame check in
`Sprite_DepthRoot.update`) and on `world:levelBuilt` / `world:areaBuilt`, which the rebind emits; its `peekArea` reads
hit the prewarmed, pinned builds (0 `buildArea` calls during every switch).

## E4. Coordinator: the lane's BRIEF.md and lane.json were emptied at 00:28 on 2026-09-26

Both files under `tasks/SIM.00.00/lane-n/` were 0 bytes (mtime 00:28 local) when `git status` was run after the first code
edits, although the brief had been read with its content at the start of the session and Lane N never wrote them. They
were restored from HEAD (`git checkout HEAD -- tasks/SIM.00.00/lane-n/BRIEF.md tasks/SIM.00.00/lane-n/lane.json`); the
committed versions from 6e8e839c are unchanged. Something outside this session truncated them (compare DEF-COORD-INJECT-01).
