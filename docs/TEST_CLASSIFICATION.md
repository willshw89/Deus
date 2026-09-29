# TEST_CLASSIFICATION: superseded

> The rules are in `docs/ENGINE_RULES.md` §5. This file was a 637-line list generated on 2026-09-21 by `tools/classify_tests.js`, which sorted 605 scripts by file name (`test_*` = headless, `*_live` = playtest, and so on) without running any of them. It was replaced on 2026-09-26 by measured results and is kept only as this pointer (reduced 2026-09-29).

## Where the live classification is
- `tools/ops/gate_tests.json`: the shared `gate` list every lane's `lane.json` `gateTests` includes, and the `quarantine` list (path + reason) the merge gate refuses.
- `tools/ops/quarantine.json`: the measured census (OPS.30.01 Lane Y): one row per tracked suite with its category (`PASS`, `NEEDS_NWJS`, `KILLED_TIMEOUT`, `FAIL_API_DRIFT`, `FAIL_MISSING_REFERENCE`, `FAIL_OTHER`, ...), the deciding line, exit code and duration. Base `425b594c`, measured 2026-09-26, three runs each.
- A suite that needs the game runtime (`NEEDS_NWJS`) is never run by the headless census; it runs through `run_tests.bat` or a DevTools Playtest harness (ENGINE_RULES §6, level 2).

## How to regenerate it
```text
node tools/ops/run_gate.js --census --out <census.json> [--runs 3]      # measure every tracked suite
node tools/ops/run_gate.js --merge-census <census.json>... --write-quarantine tools/ops/quarantine.json --base <sha>
node tools/ops/run_gate.js --check-lists                                # validate both lists; exit 1 on any violation
```
`tools/classify_tests.js` is not used for classification any more.
