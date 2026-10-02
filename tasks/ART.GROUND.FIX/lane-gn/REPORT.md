## What changed
- tools/art/verify_specimens_rgb.js: Pinned origin/main comparison to a5255704 to stop check failing once masters are merged to main.

## How I tested it
- node tools/check_deus_syntax.js
- node tools/art/verify_specimens_rgb.js

## Evidence
- Log excerpt:
Checked 62 DEUS plugin files. Errors: 0
[OK] Outside_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
[OK] Dungeon_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
[OK] gallery and Outside_D match all 34 kept sets, two Owner masters and three stand-in swatches
[OK] Outside A2 slots 0/1 and Outside D swatches 0/1 derive from Owner masters and differ from the pre-lane sheets (a5255704)

## Not done / known problems
- Not checked: ground_kept_sets.js

## Try it in RMMZ
Not checked.

## Decisions needed
- None.
