# HANDOFF: original floor and door art (VISION V56/V57)

**From:** Claude Code / engine · **To:** Gemini / art · **Date:** 2026-09-19 · **Request:** AR-300 construction floors and doors

## What is live in the engine

`UF_Floors` treats floors as A2 ground kinds: plank, flagstone, and rush. `UF_Doors` treats each door as a one-cell UF_Objects object with closed and open character-sheet frames. Current output is intentionally temporary: floors are code-drawn patterns, and wood/stone doors both use stock RMMZ `!Door1` (stone tinted cool gray).

Create art only. Do not edit code, tools, or `game/data/` (AGENTS.md ownership). Put source/review work under `art/` and game-ready PNG plus sidecar under `game/img/`. Tell Claude Code the exact filenames under Notes in `docs/ASSET_REQUESTS.md`; Claude Code will validate and switch catalog image/tile data.

## Doors: two one-cell character sheets

Files:

- `game/img/characters/!$UF_Door_Wood.png` + `!$UF_Door_Wood.json`
- `game/img/characters/!$UF_Door_Stone.png` + `!$UF_Door_Stone.json`

Each PNG is a single-character RMMZ sheet: 3 columns × 4 rows of 48×48 frames, total 144×192. The engine reads row 0, column 0 as **closed** and row 0, column 2 as **open**, with an in-between/ajar frame in column 1. **All animation must happen through the sprite; NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108). Repeat or adapt those three states across the remaining facing rows so the unused rows are still valid. Sidecar: `frameWidth:48`, `frameHeight:48`, bottom-center anchor, `animations.stand:[0]`; record the state columns in a note.

Door requirements:

- Original art in the current V2 flat, high-definition FF6-style 3/4 view: crisp clusters, selective outlines, lively cel shading, readable at 1×, no oblique 2.5D lean, blur, or semi-transparent edge pixels. Generate the source exclusively with **Google Nano Banana II** (`generate_image`, model id `gemini-3.1-flash-image`; AGENTS.md Rule 11, VISION V69, V70, V79, V109) and pack it into the standard RMMZ sheet required by V69/V70.

- The closed frame must fill the cell enough to read as a barrier, with its feet/threshold aligned to the bottom of the cell. The open frame must clearly expose a walkable opening while retaining a jamb/hinge cue.
- Wood: vertical or braced warm planks, iron hinges/latch, sturdy settlement construction—not ornate, modern, or a portcullis.
- Stone: a heavy stone or stone-framed slab with a distinct cooler mass and hardware. It must not look like the wood door recolored.
- Keep the silhouette within one cell. Neighboring cells may contain another door at a two-cell gate, so two copies side by side must not clash.
- No shadows outside the 48×48 frame. No directional light that conflicts when the same row is used on all wall sides.

Review sheets: nearest-neighbor 3× and 8×, plus one in-engine capture showing (a) a closed door with an animal outside and (b) an open door with a person in the doorway. Do not approve from an enlarged image alone; inspect 1×.

## Floors: three A2 autotile blocks

The engine needs one complete 47-shape RMMZ A2 autotile block per kind, ultimately inserted into the project ground A2 sheet in catalog order:

1. `floor_wood` — warm plank floor. Boards should align across joined cells; restrained knots and seams; clearly worked wood, not bare brown soil.
2. `floor_stone` — fitted flagstones. Uneven but walkable slabs; visible joints; clearly constructed, not bare rock or the stone wall texture.
3. `floor_rushes` — woven/laid rush matting. Straw-gold fibers in coherent bundles or weave; clearly a made interior surface, not wild grass or needle litter.

Follow the same A2 block geometry and 47-shape validation used by AR-100. Floors are flat ground: no oblique lean, raised wall, furniture, or object shadow. The inner tile must be quiet enough for beds, items, stance markers, and characters to remain legible. Boundary shapes must make an intentional transition to neighboring dirt/grass without a modern hard outline. Avoid random markings that visibly repeat every 48 pixels. Generate the source exclusively with **Google Nano Banana II** (`generate_image`, model id `gemini-3.1-flash-image`; AGENTS.md Rule 11, VISION V69, V70, V79, V109), then clean and pack it into the standard RMMZ A2 layout required by V69/V70.


Deliver either three correctly laid-out source blocks plus a merged candidate ground sheet, or the merged sheet and enough source to revise one material independently. Name candidate/review files clearly under `art/`; do not overwrite the active ground sheet before Claude Code checks all 47 shapes.

Review images:

- One 5×5 room for each material using at least corners, edges, T joins, isolated cells, and full interior cells.
- A nearest-neighbor 3× review and an actual 1× crop with a bed, dropped item, and person over the floor.
- A mixed screenshot with bare earth beside a half-floored room so the construction progress is obvious.

## Engine integration notes

- Door catalog entries are `door_wood` and `door_stone`; change only their `image`/`characterIndex`/optional sidecar-driven frame data. Keep tags, build costs, HP, and ruin intact.
- Floor ids and culture recipes are data contracts. Do not rename `floor_wood`, `floor_stone`, or `floor_rushes`.
- Doors use frame columns 0 and 2 now. If the delivered state layout differs, call that out rather than silently rearranging it.
- Validate image dimensions and alpha with the asset tools, then ask Claude Code for the ART_STANDARD §8 review and in-engine integration.

## Current stand-ins to replace

| Feature | Current | Problem visible in the checked screenshots |
|---|---|---|
| Wood door | stock `!Door1` character 0 | reads as a generic metal/shutter door |
| Stone door | same stock sheet with `#b8c0c8` tint | not a distinct construction material |
| Plank floor | UF_Tiles `planks` generated pattern | brown, schematic, no authored joins |
| Flagstone floor | UF_Tiles `cracks` generated pattern | schematic cracks only |
| Rush floor | UF_Tiles `needles` generated pattern | can read as ground litter rather than woven flooring |

The 2026-09-19 no-history door capture also shows that the current stock hare test image reads more like a small pink humanoid. That is a general stock-placeholder problem, not part of the door deliverable, but the replacement door review must use an animal silhouette that is unmistakable at 1×.

These are development placeholders. None of the new floor/door art is approved until the user explicitly approves it.
