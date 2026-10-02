## What changed
- tools/art/verify_specimens_rgb.js: Check art against the pinned base commit (a5255704) instead of the moving origin/main ref to avoid failures when main is updated.

## How I tested it
- node tools/check_deus_syntax.js
- node tools/art/verify_specimens_rgb.js
- node tools/art/test_ground_kept_sets.js
- Ran a mutant where Outside_A2.png slot 0 is replaced with the a5255704 tile, and observed the new failure message:
  [FAIL] Outside_A2.png slot 0 still equals the pre-lane sheets (a5255704)
- Cloned the repository and verified that verify_specimens_rgb.js exits 0 (tests pass) in the fresh clone that contains the fix.

## Evidence
- Syntax check exited 0: Checked 62 DEUS plugin files. Errors: 0
- verify_specimens_rgb.js exited 0:
  [OK] Outside_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
  [OK] Dungeon_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
  [OK] gallery and Outside_D match all 34 kept sets, two Owner masters and three stand-in swatches
  [OK] Outside A2 slots 0/1 and Outside D swatches 0/1 derive from Owner masters and differ from the pre-lane sheets (a5255704)
- Mutant test failure line:
  [FAIL] Outside_A2.png slot 0 still equals the pre-lane sheets (a5255704)

## Not done / known problems
- None.

## Try it in RMMZ
1. Not applicable (tooling only).
Expected: Not applicable.

## Decisions needed
- None.
