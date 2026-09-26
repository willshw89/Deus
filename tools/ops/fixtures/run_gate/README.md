# tools/ops/fixtures/run_gate: fixtures for tools/ops/test_run_gate.js (OPS.30.01)

`test_run_gate.js` copies these files into synthetic git repos under the OS temp folder and runs
`tools/ops/run_gate.js` against those repos. Nothing here is run in this repository, and the files are named so the
census does not pick them up (`run_gate.js` only enumerates `test_*.js` files; it also does not follow references into
this folder, see `SCREEN_NOT_FOLLOWED`).

| Folder | Contents |
|---|---|
| `suites/` | Synthetic suites, copied to `tools/test_<name>.js`. Each writes `<file name>.ran` into `RUN_GATE_FIXTURE_MARKERS` when it runs. The expected category is in the first comment line. |
| `helpers/` | Files the suites reach: a sleeper child, a module with a changed API, a helper and a launcher that name the NW.js harness, and a stand-in game plugin that names the harness in comments only. |
| `lists/` | `gate_*.json`: gate lists for gate mode. `cl_*.json`: gate and quarantine lists for `--check-lists`, one valid pair and one file per violation. |

No fixture starts the NW.js harness, even when run: the files that name it only print or write their marker.
`hang.js` and its sleeper end by themselves after 10 minutes if a kill ever fails.
