# art/templates: blank template sheets

This folder will hold the blank template sheets made from the art catalogue by `tools/art/make_blank_templates.js` (WG.32.02). It is reserved: the sheets are generated and committed in a later PM-launched run, after the catalogue (`art/catalogue/catalogue.json`, Lane S) is on `main`. Until then this README is the only file here.

## What a template is

A template contains no art (DEC-007). Each sheet PNG holds only:

- one flat background: alpha 0 by default, or `#FF00FF` with `--bg magenta`;
- 1-px grid lines every `gridPx` of the sheet;
- a 1-px outline on every catalogue paint slot, at the slot's exact `x, y, w, h`;
- stratum guide ticks on geometry-derived slots (edge/cliff strips, ramps, wall faces), placed from `stratumPx` in the geometry file;
- one label per slot: `<4-digit slot index> <scaleRow short code>`.

Grid lines, outlines and ticks are `#00FFFF`; labels are `#FFFF00`. Neither colour is in `art/palette/deus_master_world_palette_v1.hex`.

## Files (after the final run)

- `<sheetId>.png`: one per catalogue sheet.
- `<sheetId>.json`: the sidecar. Per slot it gives the slot id, entry id, scale row, frame class, footprint, anchor, rect, frames, envelope, paper-doll data, tick rows and label. It also records the background, the colours, `stratumPx`, the geometry and catalogue sha256, and the PNG's sha256.
- `INDEX.md`: every sheet and slot, plus the entries that get no paint slot (variant rows; frame classes the Owner has not sized yet).

## Regenerating

```
node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out art/templates
```

Rerun it after any catalogue or geometry change. Reruns are byte-identical. When a sheet leaves the catalogue, the generator deletes that sheet's template pair. It keeps this README.

The generator will not overwrite a template PNG that has been changed since it wrote it (`OUT_DIR_MODIFIED_TEMPLATE`). It also refuses to run if this folder holds any file it did not write. Keep painted work outside this folder.
