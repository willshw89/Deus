# Lane U escalation: interface points between Lane U and Lane S (WG.41.01)

Writer: claude, 2026-09-26. Standing rule 6: where two sources disagree in a way the brief does not settle, write it down and do not resolve Owner questions. I did not stop the lane. Where the brief is silent, the tools follow Lane S's catalogue schema, because the brief says "Lane S owns the schema". Every point below needs the PM to confirm it or redirect me. Points 3 and 5 also have an Owner side.

Sources compared:
- the BRIEF's catalogue contract `deus-art-catalogue/1.1.0`;
- Lane S's working tree read at `task/lane-s` 11755296 plus uncommitted changes (`art/catalogue/catalogue.json`, `docs/art/catalogue/SCHEMA.md`, `tools/art/build_catalogue.js`), read only on 2026-09-26;
- my first implementation.

## 1. What "a geometry-derived slot whose height does not match stratumPx/layerPx" means

- **BRIEF refusal rule:** "a geometry-derived slot (edge strip, wall face, ramp) whose height does not match `stratumPx`/`layerPx`".
- **BRIEF slot sizing rule:** "slot h = 48*ceil(hMax/48) per frame; geometry-derived pieces ... take their heights from stratumPx/layerPx".
- **Lane S SCHEMA.md:**
  - `GEOM_STRATUM_k` height = the shortest to the tallest run of k consecutive strata (19..20, 38..39, 57..58, 76..77, 96).
  - `GEOM_RAMP_k` = tilePx + the same runs (67..68 ... 144), marked **PROPOSED**.
  - Slots are rounded up to the 48 grid.
- **My first version** required the slot height itself to be the first k strata added up (19, 38, ...). It would have refused every Lane S strip and ramp. The independent pre-review found this.
- **Now implemented:**
  - Each frame's drawn height must be one of the allowed values: a run of k strata for `GEOM_STRATUM_k`, tilePx + a run for `GEOM_RAMP_k`, layerPx for `GEOM_LAYER_FACE`.
  - The entry's envelope must lie inside that range.
  - The slot only has to be tall enough.
  - `GEOM_TILE` frames must be tilePx square, and `GEOM_FRAME_<class>` frames must equal the frame class.
  - Every value comes from `geometry.json`.
- **Needs:** PM confirmation of this reading. The ramp convention (top tile plus the rise) is PROPOSED in Lane S and may need the Owner.

## 2. Which slots are "tile-class" (must be 100% opaque)

- The BRIEF says "a tile-class slot not 100% opaque" is refused and does not define tile-class.
- Lane S calls `RMMZ_TILE_48`, `RMMZ_AUTOTILE_A1..A4` and `RMMZ_FACE_144` its "tile-class rows". But it uses `RMMZ_TILE_48` for items and effects (icons on transparent backgrounds). It also uses `GEOM_TILE` for rim shadows and height shading marked `groupType: OVERLAY`. Neither kind can be 100% opaque.
- **Now implemented:** tile-class = scaleRow `GEOM_TILE` or `RMMZ_AUTOTILE_A1..A4`, excluding `groupType: OVERLAY`.
- **Needs:** PM confirmation of that set. One detail is open: whether any RMMZ A2 autotiles are meant to have transparent parts. If so, they would need `groupType: OVERLAY` or a narrower rule.

## 3. Runtime export targets

- The BRIEF gives `runtime {kind, file, index|tileId}` and lists no kinds.
- **Now implemented (Lane S vocabulary):**
  - `NONE` = atlas only.
  - `RMMZ_TILESET` + `tileId`: B-E and A5 single tiles, and A1-A4 whole autotile blocks at shape 0. Positions follow `Tilemap` in `game/js/rmmz_core.js`.
  - `RMMZ_CHARACTER` + `index`: 3x4-frame blocks.
  - `RMMZ_FACE`: square cells, 4 across.
  - A missing file, `tileId` or `index` is reported `RUNTIME_PENDING`: the file is placed in the atlas but not exported, and the run is not refused.
- **Open, with an Owner side:** Lane S maps 152 single-frame props and items (beds, chests, ...) to `!$` character sheets at index 0. Which cells of the 3x4 block a single frame should fill is not specified (one cell, or the same frame in all 12). The tools report these as `RUNTIME_PENDING` rather than guess a layout.
- Runtime files hold only the placed parts; the rest is transparent. Lane S points some entries at stock files such as `img/tilesets/Outside_A2.png`. Copying such a partial export over `game/img` would blank every tile that was not placed. The tools mark these files `partial: true` and warn. No brief says who merges runtime exports into `game/img`, or how.

## 4. Lane S data that the tools would refuse (read-only probe, not a test)

The probe loaded Lane S's working-tree catalogue with the lane-u tools, reading only:
- `loadContext` accepted it: geometry and palette hashes match.
- `checkCatalogue` found 0 slot errors.
- All 2,052 slotted geometry-row entries meet the rules in point 1.
- A runtime plan with every slot filled gives 263 pending targets and 10 contradictions. The run is refused only if the entries involved are actually placed:
  - 8 target clashes: several creatures share one stock block. Examples: `ALL_SHARED_CREATURE_HARE_V1_DEFAULT` and `..._BOAR_V1_DEFAULT` both map to `img/characters/$UF_Stock_Nature_2.png` index 0; fox, jackal and deer map to `$UF_Stock_Nature_3.png`; hawk and bat map to `$UF_Stock_Vehicle_2.png`. These record which stand-in the engine loads today, but two approved files cannot both be exported to one block.
  - 2 size mismatches: one slot mapped to a single `Outside_B.png` tile, and one A1 entry whose slot size differs from its kind's block.
- **For Lane S / PM:** give shared stand-ins a unique target, or `NONE` until a real target exists.

## 5. alphaMode OWNER_OPEN

- Lane S marks 60 entries `alphaMode: OWNER_OPEN` (rim shadows, shading, veins, hanging props). The BRIEF says to refuse non-binary alpha "unless ... OWNER_OPEN and the Owner has ruled; until then refuse".
- There is no field or file where a ruling would be recorded, so the tools refuse non-binary alpha for every entry.
- **Needs:** the Owner to rule, and the PM to name where the ruling is recorded. Supporting it needs a code change and a test.

## Status

Nothing is blocked. The gate output on the fixtures is in REPORT.md. The points above decide whether the tools, as they are, fit the real catalogue in the later PM-launched run.
