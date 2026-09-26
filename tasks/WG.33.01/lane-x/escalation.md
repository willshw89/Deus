# WG.33.01 Lane X: escalation (non-blocking; work continues)

**Writer:** claude · **Date:** 2026-09-26 · **Branch:** task/lane-x · **Base:** main `425b594c146d5f353c10faa11f4b5d47f499b45f`

Standing rule 6 asks for this file when a read-only shared file is broken or two sources disagree in a way the BRIEF does not settle. Neither item below needs a file outside my allowedPaths: the checker's job is to measure and report exactly these disagreements (BRIEF: "reports every gap"; every baselined gap carries a reason). So I keep building the checker and record both items as gaps with reasons. The PM or Coordinator decides the fixes. I fix nothing outside allowedPaths.

## X-E1. Two of the six lane.json gate commands already fail at the base commit

At `425b594c`, before any change of mine:

```
$ node tools/art/build_catalogue.js --check
WARN UNVERIFIED_ABSENT reference/u7_shapes_0_31.png (untracked third-party reference not present in this checkout)
DIFF art/catalogue/catalogue.json
DIFF art/catalogue/conflicts.md
CHECK: FAILED (2 file(s) differ from a fresh build)
EXIT=1

$ node tools/art/test_catalogue.js
FAIL catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: art/catalogue/catalogue.json, art/catalogue/conflicts.md; catalogue.json sha256 9bc98b86a8c8e504...
46/47 checks passed
EXIT=1
```

Cause, from an in-memory rebuild (nothing written): `catalogue.json` pins the sha256 of `docs/worldgen/DEUS_WORLDGEN_WBS.md` (committed `50c7dae4…`, now `c6f4cf11…`), and `conflicts.md` cites WBS lines 678 and 718, which moved to 679 and 719. Commit `79038709` ("[gemini] Record WBS Rev 25 …") edited the WBS after the catalogue was built. This is the merge hazard Lane S reported (the catalogue pins coordinator docs).

The BRIEF says these commands "must still exit 0; you changed none of their inputs". I changed none of their inputs, but they do not exit 0 at the base. The fix is a rebuild (`node tools/art/build_catalogue.js`), which writes `art/catalogue/**` and `docs/art/catalogue/**`. Both are outside my allowedPaths, so the fix belongs to the PM. My REPORT pastes their raw output with `EXIT=1`.

## X-E2. The blank-template generator refuses the real catalogue, so the manifest <-> template rule cannot reach 100% on main

`node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out <OS temp dir>` exits 2 at the base and writes nothing (`REFUSED: 963 problem(s); nothing written`):

- 948 × `STRATUM_HEIGHT_MISMATCH`. Every `GEOM_STRATUM_1..4` slot (EDGE, RAMPSIDE and WALLFACE heights H1 to H4, 237 of each) is 48 or 96 px high, because the catalogue rounds slot heights up to the 48 grid (`docs/art/catalogue/SCHEMA.md` §2: "Slots round up to the 48 grid"). Lane T's generator wants the exact stratum height, 19/38/57/76 px. This is Lane T escalation E4/E2 (`tasks/WG.32.02/lane-t/escalation.md`), which was left for the "final run" and never ruled on.
- 15 × `SHEET_INVALID`. The tree sheets (`RMMZ_UF-OAK`, `RMMZ_UF-PINE`, … 288x384, 288x576, 432x576) are not 3 x 4 frames of an active frame class.

What the checker does: it runs the generator once on the whole catalogue in an OS temp folder and records every refusal as a `MANIFEST_TEMPLATE` gap (sheet- or slot-level) with the generator's code and message. Refused sheets cannot be compared, so the checker also runs the generator once per unrefused sheet, on a single-sheet copy of the catalogue in the temp folder. Then it compares each of those sheets slot by slot. A sheet's template depends only on that sheet, its slotted entries, the geometry and the palette, so the per-sheet split changes no rect. The committed baseline lists every refusal with this reason. Once the PM or Lane S/T settle E4 and the tree-sheet sizes, the refusals stop occurring, and the stale-baseline check forces those baseline entries out.

**Needs (PM / Lane S / Lane T):** decide whether catalogue stratum slots are grid-rounded (then the generator changes) or exact (then the catalogue changes), and how tree character sheets fit the frame classes. Until then, the manifest <-> template rule is measured only on the sheets the generator accepts.
