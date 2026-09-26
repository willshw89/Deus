# WG.32.02 Lane T: escalation (non-blocking; work continued)

**Writer:** claude · **Date:** 2026-09-26 · **Branch:** task/lane-t

Standing rule 6 says to stop and escalate when two sources disagree in a way the brief does not settle. The first item below is a contradiction inside the BRIEF itself. I did not stop the lane. Each choice below takes one line to reverse, and the generator works under either reading. The PM should rule before the final run against `art/catalogue/catalogue.json`.

## E1. The fixture's 4096x4096 ATLAS is not a multiple of 48

- BRIEF, Dependency: the fixture "must have at least: one 4096x4096 ATLAS".
- BRIEF, contract `sheets[]`: "ATLAS sides are multiples of 48 and at most 4096".
- 4096 = 85 x 48 + 16, so no sheet can meet both.

**What I did:** the fixture uses 4096x4096 (`ATLAS_SIDE` in `tools/art/fixtures/templates/build_fixture.js`), because the fixture list names that size. The generator enforces only the 4096 upper bound. For a sheet side that is not a multiple of its `gridPx`, it draws the partial last cell (the grid closes at the last pixel column/row) and says so in INDEX.md.

**Alternative:** set `ATLAS_SIDE = 4080` (85 x 48) in `build_fixture.js`, change the `4096x4096 ATLAS` line in the `fixture_contract` check to match, and regenerate the fixture (`node tools/art/fixtures/templates/build_fixture.js`). No generator change is needed. The generator could also be made to refuse ATLAS sides that are not multiples of `tilePx` (one line in `checkCatalogue`), if the PM wants the template tool to enforce that contract rule too.

## E2. Stratum order, and what `GEOM_STRATUM_<d>` means

The BRIEF gives `stratumPx: [19,19,19,19,20]`. It does not say whether index 0 is the lowest or the highest stratum. It lists the scale rows `GEOM_STRATUM_1..5` without saying whether `<d>` means "d strata high" or "the d-th stratum".

**What the generator assumes** (stated in its header and in INDEX.md):
- `stratumPx[0]` is the lowest stratum.
- A `GEOM_STRATUM_<d>` slot (ramp cell or edge/cliff strip) has frame height `stratumPx[0] + ... + stratumPx[d-1]`, so 19, 38, 57, 76, 96 with the default split.
- A `GEOM_LAYER_FACE` slot has frame height `layerPx`.
- Ticks mark the top row of each stratum, counted up from the bottom of each frame row.

Under the other order the heights would be 20, 39, 58, 77, 96. If Lane S's catalogue uses a different reading, the final run refuses with `STRATUM_HEIGHT_MISMATCH` and names the entry. It does not draw wrong templates silently. **Needs:** PM or Lane S confirmation of the order and the meaning of `<d>`.

## E3. How geometry-derived slots are recognised

The generator finds edge strips, ramps and wall faces only through `scaleRow` (`GEOM_STRATUM_<d>`, `GEOM_LAYER_FACE`), because `scaleRow` is the only contract field that marks them. If Lane S uses other row ids for these pieces, they are drawn as ordinary slots: they get no ticks and no stratum-height check. **Needs:** Lane S to use these row ids for strips, ramps and wall faces, or the PM to name the field that marks them. At the final run, check INDEX.md's "Stratum ticks" column: it must be filled for every ramp, strip and wall-face slot.

## E4. Frame-class slots are exact frames, not rounded to 48

The contract's slot rule is `h = 48*ceil(hMax/48)` per frame. The fixture requirement, though, is that turning TALL_MEDIUM on "adds the 48x64 slots", and the RMMZ blocks are 3 x 4 exact frames. The generator therefore requires creature/character slots to be exactly `frames.cols x frame w` by `frames.rows x frame h` of their frame class, so TALL_MEDIUM gives 48x64 per frame and not 48x96. For other slots it checks only that the envelope fits in one frame (`ENVELOPE_EXCEEDS_SLOT`). It does not recompute the 48-rounding rule; that stays Lane S's job.
