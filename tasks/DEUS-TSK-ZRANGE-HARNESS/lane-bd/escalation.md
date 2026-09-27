# Escalation: DEUS-TSK-ZRANGE-HARNESS scope 3

Lane BD stopped. The harness loads. One existing check fails for a reason the Z-range doc does not decide. The assertion was not changed.

## Check

`tools/test_vertical_worldgen_proof.js` Test 3, the post-simulation dry landing.

Seed 1234, size 96, area (0, 0), generator 4, live `UF.World.zRange()` `-2..+2` (state has no `zRange`).

First cliff-cave mouth `(72, 24, z=0)`. Terminus `(72, 22)`.

The baseline check on that landing passed:

`Subterranean stair landing has natural water cleared in the z=-1 baseline (wet vestibule cells: 0)`

The next check failed.

Expected: `!!termCellNeg1 && !termCellNeg1.water` (the landing is dry: `cellAt.water` is falsy).

Actual:

```
Info: landing cell at z=-1 after fluid simulation: water=true, flooded=true, floodType=water
FAIL: Subterranean stair landing is dry after the fluid simulation (cellAt.water=true, flooded=true, floodType=water)
```

Suite result: `15 passed, 1 failed, 15 skipped`. Exit 1.

## Why this is not a frame rewrite

Scope 3 allows an expectation change only when a check fails because it hard-codes the pre-WG.00.17 frame (zMin -2, 5 levels, 1 ft strata, 5 ft layers). This check does not. It asks that one carved landing be dry after `Levels.cellAt`.

`docs/systems/DEUS_ZRange.md` sections that were in scope:

- Line 12: a range is a frozen `{ zMin, zMax }`.
- Line 39: `legacy` is `-2..+2`, 5 layers. A state with no `zRange` uses it. The live API on this run is that range.
- Line 44: a state without `zRange` is a legacy world and gets `-2..+2`.
- Lines 90-92: `UF.Space` is 5 ft cells, 2 ft strata, 5 strata a layer, 10 ft a layer. The strata record is still five strata a cell. Elevation is `e = (z - zMin) x 5 + s`.

None of those lines say whether a cliff-cave landing's `cellAt.water` is set, or that the flood grid's reach changed with the 2 ft stratum.

`DEUS_Levels.js` `cellAt` (lines 4895-4907) sets `water` when `waterAt` is set or `isFlooded` reports type `"water"`. `isFlooded` / `floodTypeAt` (lines 3977-4008) read the z=-1/-2 flood grid from `computeFloods` when `UF.Fluid` is absent. The baseline array for the 3x3 vestibule is dry (`wet vestibule cells: 0`). `cellAt.water` is the flood grid, not the baseline.

The check's own comment (this file, lines 479-484) already records the failure: since commit `4eebef2` (2026-09-21), before WG.00.17 (`bdf45b4c`, 2026-09-26), the flood BFS spreads natural z=-1 pools onto the connected cavern floor and reaches this landing. The comment says the check is asserted and is never skipped or faked.

That comment is older than the Z-range authority. Loading the real plugins made the check run again. It failed the way the comment describes. Scope 3 says not to edit it.

## Not done here

No plugin edit. No weakened assertion. No skip. The column suite is green; this one check keeps the vertical suite at exit 1.

Open conflict, not decided here: Task 11's dry-landing promise versus the flood BFS in `DEUS_Levels.js`. Which side should move is a plugin question. See PROPOSED-BD-02 in REPORT.md.
