# DEUS decisions log

Owner rulings, newest first. Each entry: date, ruling, scope. Earlier decisions (DEC-001 to DEC-089) remain in `docs/OWNER_DECISIONS.md`; where they conflict with an entry here, this file wins.
Add an entry only for an explicit Owner ruling. Agents do not record their own proposals as decisions.

## 2026-10-02

| # | Ruling |
|---|---|
| D-2026-10-02-1 | **Codex is PM.** Codex (strongest OpenAI single agent) writes briefs, assigns writers and reviewers, and tracks the WBS. The Owner approves scope, design decisions and merges. |
| D-2026-10-02-2 | **WBS-ORG replaces the earlier pillar-merge plan.** `docs/WBS_ORG.md` is the plan of record for repo organization and the pillar merge. |
| D-2026-10-02-3 | **Baseline must be green before the pillar merge.** ORG-0.2 must pass before ORG-4.1/4.2/4.3. The expected-red list from ORG-0.1 only gates CI, hygiene and docs lanes (ORG-1, ORG-2, ORG-3); it never excuses failures in a game-logic lane. |
| D-2026-10-02-4 | **After pillars-v1, code is edited in small source modules** under `game/js/src/<pillar>/`, bundled into the pillar plugin files by a build step (`tools/build/merge_pillars.js`, verified by `tools/build/check_pillars.js`). Bundled files are never hand-edited. |
| D-2026-10-02-5 | **Race bonuses come from SRD 5.1 only.** No invented numbers. |
| D-2026-10-02-6 | **Professions replace SRD backgrounds.** |
| D-2026-10-02-7 | **Current sole priority: world loading green** (WBS-ORG ORG-0.1, ORG-0.2, ORG-1.1, ORG-1.2, ORG-4.2). **WBS-SIM and WBS-SPLIT are parked.** |
| D-2026-10-02-8 | **Race and vegetation canvas scales** below were specified by the Owner at 19:56 CT. Feet anchor at bottom-center; race width is capped at 48 px. Implementation is parked until ORG-0.2 world-load green. |
| D-2026-10-02-9 | **Tree footprint and canopy rules:** only the trunk blocks movement (one tile, two for ancient trees); canopy overhang is walkable beneath, sorts by trunk base Y, and fades to about 40% opacity when a colonist, building or cursor is beneath it. All art uses the same High Top-Down camera. |
| D-2026-10-02-10 | **Doors are 48x96 px**, one tile wide and two tiles tall (Owner, 20:01 CT). This is a canvas decision; it does not certify the current doorway clearance. |
| D-2026-10-02-11 | **ART-SCALE-1 remains parked.** When unparked: Grok writes, Claude reviews; renderer supports per-sprite canvases, bottom-center anchors, separate multi-tile footprints and canopy fade. Acceptance is a map screenshot of every race beside every tree size, delivered to the Owner. No art generation or implementation starts from this log. |
| D-2026-10-02-12 | **Cutaway/opening rules** (Owner, 20:01 CT): sprites taller than one level are clipped or faded by the level-above cutaway; units seen through openings on lower levels are clipped to the opening. Same High Top-Down camera for all art. |

### Art canvas scale details (Owner, 2026-10-02 19:56 CT)

| Race | Canvas, px |
|---|---|
| Halfling, Gnome | 48x48 |
| Dwarf | 48x60 |
| Human, Elf, Half-elf, Tiefling | 48x72 |
| Half-orc, Dragonborn | 48x96 |

| Vegetation stage | Starting canvas, px |
|---|---|
| Saplings, shrubs | 48x48 to 48x72; one tile |
| Young, fruit, birch | 96x144 |
| Mature oak/pine | 144x192 to 144x240 |
| Ancient/landmark | 192x288 or larger |

Vegetation sizes are starting points; the Owner will tune them in game. Doors use 48x96 px canvases. All implementation remains parked until the world loads green.

### Wall-face proposal and current-code evidence (2026-10-02 20:01 CT)

**Pending Owner confirmation, not an adopted standard:** the Owner proposed a 96 px vertical wall face for one z-level so a 48x96 door and the tallest races fit beneath a lintel.

Read-only PM inspection of canonical main `565dc5aead7e068230528d573c395ea21ed5cf5d`: `game/js/plugins/DEUS_Levels.js:4527-4548` defines `NATURAL_WALL_SPEC` as width 48, height 96, capHeight 48. `naturalWallBitmap()` fills the upper 48 px cap and draws four 24x24 material-face quadrants into the lower 48 px. Thus the current natural wall/cliff **total frame is 96 px; the vertical material face is 48 px**. `Sprite_UFNaturalWalls.update()` calls `naturalWallBitmap()` at line 4681 and assigns that bitmap at line 4685. `Sprite_DepthPlane.prototype.rebuildWalls()` in `game/js/plugins/DEUS_Depth.js:1021` consumes `L.naturalWallFrame()` without enlarging it. `game/js/plugins/DEUS_Walls.js:14-16` describes the same lower-face/upper-top split for constructed walls; `TILE` is 48 at line 30 and `drawWoodFace()` fills one TILE of face at line 172.

If the existing 48 px cap is retained, a 96 px vertical face implies a 144 px total wall frame. This is a consequence of the current drawing convention, not an approved renderer change. No game files were changed or playtest run for this read-only answer. The decision-log seed above was taken from Deus's setup branch `org/setup-2026-10-02` at `2ffa0d3a5aa6649d0a8eed0ea7c52edc1c8e4442`; this documentation-branch copy awaits cross-family review and reconciliation with that branch before integration.
