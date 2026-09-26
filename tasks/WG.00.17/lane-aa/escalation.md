# WG.00.17 lane AA: escalation (2026-09-26)

Writer: Claude (lane AA). Branch `task/lane-aa`. Code under test: `a0e1402ab167c2ac3f9dbcd42970a66dbf58dd34` (pasted from `git rev-parse HEAD`). Base: `5255f1a58a9d95bb7bc08377ef055c366610e486`.

I stopped because of BRIEF "Tests": "If a gate cannot pass without changing a read-only file, stop and write escalation.md with the exact assertion." Standing rule 6 also applies: two sources disagree in a way the BRIEF does not settle.

## E1. `layers_flat.switch_same_frame` fails at -16..+15 and at -4..+4; the assertion is in read-only check code

### The assertion
`game/js/plugins/DEUS_Depth.js` (check code, read only for this lane; not changed on this branch: `git diff 5255f1a5..HEAD -- game/js/plugins/DEUS_Depth.js` is empty).

Line 1902, the planes the check wants after a switch to level `to`:
```js
const r = D.root(), out = { frame, root: !!r, want: [to - 1, to - 2].filter(z => L.isLevel(z)), planes: [], planesOk: false, units: [], missing: [], stale: [] };
```
Line 1922, the judgement:
```js
out.planesOk = out.planes.length === out.want.length && out.planes.every((p, i) => p.z === out.want[i] && p.visible && p.painted);
```
The comment at lines 1893-1895 describes the intent: "Both times the planes are the new view's levels below it (depth 1 on z-1, depth 2 on z-2), shown and painted since they were bound".

### What the renderer does
The same file's renderer (`rebuild`, line 930) binds the depth-2 plane only when the depth-1 level has an open cell in the area:
```js
if (config.maxDepth >= 2 && this.planes[0].level && config.exposes(v.z - 1) && openCells(v.x, v.y, v.z - 1).open > 0) this.bindPlane(this.planes[1], v, v.z - 2);
```

### Why they disagree only now
The check's switch sequence is 0 -> +2 -> +1 -> 0 -> -1 -> 0. On the switch to -1:
- At the base (5 levels, -2..+2), level -3 does not exist, so the check wants `[-2]`. The renderer binds -2 only. They agree.
- With level -3 present (-16..+15, -4..+4), the check wants `[-2, -3]`. The check's fixture scene writes levels -2..+2 only (objects cleared at line 1360: `for (let z = -2; z <= 2; z++)`; column strata at line 1367: `const z = k - 2` for k = 0..4). The pinned world's -2 has no OPEN cell in the area, so the renderer does not bind -3 (nothing on -3 can be seen through a closed -2). The check reports the missing plane.

The renderer's rule is unchanged from the base. The failure comes from the check's `filter(z => L.isLevel(z))` meeting a level that now exists.

### Raw evidence (fresh temp clone of a0e1402a, `%TEMP%\laneaa_clones\tipfull`; full logs in `evidence/`)
| Range | Command | EXIT | Result line |
|---|---|---|---|
| -16..15 | `DEUS_Z_RANGE=-16..15 node tools/test_layer_render_flat.js` | 1 | `run: RESULT: 11 passed, 1 failed (exit 1)` |
| -4..4 | `DEUS_Z_RANGE=-4..4 node tools/test_layer_render_flat.js` | 1 | `run: RESULT: 11 passed, 1 failed (exit 1)` |
| -2..2 (control) | `DEUS_Z_RANGE=-2..2 node tools/test_layer_render_flat.js` | 0 | `run: RESULT: 12 passed, 0 failed (exit 0)` |

The failing part of the line at -16..15 (`evidence/a0e1402a_layers_flat_z-16..15.log`):
```
0->-1 at levels:viewChanged (frame 232): planes -2:shown painted since bound (20 paint(s)) (want levels [-2, -3], shown and painted); 0 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 232): planes -2:shown painted since bound (20 paint(s)) (want levels [-2, -3], shown and painted)
```
At -4..4 (`evidence/a0e1402a_layers_flat_z-4..4.log`):
```
0->-1 at levels:viewChanged (frame 227): planes -2:shown painted since bound (20 paint(s)) (want levels [-2, -3], shown and painted)
```
The control at -2..2 on the same code (`evidence/a0e1402a_layers_flat_z-2..2_control.log`) binds the same single plane, and the check accepts it:
```
0->-1 at levels:viewChanged (frame 208): planes -2:shown painted since bound (20 paint(s))
```
The other 11 layers_flat checks, including `every_view_sees_through`, `flat_no_filters`, `flat_position` and `unit_step_same_frame`, print PASS at both ranges.

### Options (the PM or Owner decides; I have not taken any)
- **(A) Recommended: authorize a one-line edit of the check** so its `want` follows the renderer rule. Depth 2 would be wanted only when level `to - 1` exists, is exposed and has an open cell in the view's area. Example: `[to - 1].concat(L.isLevel(to - 2) && <open cells on to - 1 in the view's area> > 0 ? [to - 2] : []).filter(z => L.isLevel(z))`, using the renderer's own `openCells`. At -2..+2 this gives exactly the base expectation. It needs a PM exception for DEUS_Depth.js check code, which the launch prompt forbids me to change.
- **(B) Change the renderer** (DEUS_Depth.js line 930, which is in allowedPaths): always bind depth 2 when `z - 2` exists. Every underground view would then bind and paint a plane that cannot be seen through a closed level above it. That changes rendering behaviour and cost, which is Lane K / DEC-021 territory and outside this lane's Z-range remit. It would also work against the BRIEF's render budget. Not recommended.
- **(C) Change the fixture scene** so -2 has open cells under the -1 view. That is also check code (lines 1360-1367 onward, read only) and would change what the check proves at every range.

### What I need
A ruling on E1: (A) with an explicit exception for that line or lines, (B), or (C). Or: accept `switch_same_frame` as a known exception at ranges with a level -3, with the gate counts re-stated.

## Other gates on a0e1402a (same clone, same session, raw logs in `evidence/`)
| Gate | -16..15 | -4..4 |
|---|---|---|
| `node tools/test_layer_render_flat.js --suite depth` | EXIT=0, `run: RESULT: 27 passed, 0 failed (exit 0)` | EXIT=0, `run: RESULT: 27 passed, 0 failed (exit 0)` |
| `node tools/test_minimap.js` | EXIT=0, `RESULT: 24 passed, 0 failed (exit 0)` | EXIT=0, `RESULT: 24 passed, 0 failed (exit 0)` |
| `node tools/test_layer_switch_inplace.js` | EXIT=0, `RESULT: 7 passed, 0 failed (exit 0)` | EXIT=0, `RESULT: 7 passed, 0 failed (exit 0)` |
| `node tools/check_deus_syntax.js` | EXIT=0, `Checked 52 DEUS plugin files. Errors: 0` | (range-independent) |
| `node tools/test_palette.js` | EXIT=0, `Palette loaded successfully` | (range-independent) |
| `node tools/test_zrange.js` (all three configurations, 3 NW.js runs at a time) | EXIT=0, `RESULT: 10 passed, 0 failed (exit 0)` | (included) |

These are single runs. The BRIEF's 3 consecutive runs of layers_flat and depth, the provocations (`--provoke --jobs 3`), the whole-suite base/tip diff, and the bench are not run on a0e1402a (see "Not done").

## Findings made on the way (not blocking; for the PM)
- **F2. `UF.World.units()` can return the previous world's units right after a load** (`DEUS_World.js` lines 1419-1423 at the tip; the same function at base 5255f1a5 starts at line 1298). `_unitsCache` is cleared only by addUnit and removeUnit, not when `UF.World.state` is replaced by a load or a New Game. My legacy check first read units through it and saw 5 units missing and 4 moved, varying from run to run (`evidence/ee280d57_test_zrange_under_load.log`). The check now reads `Object.values(state.units)`, and the base-load reference was rebuilt with that. The base commit's own load of the base save then equals the save: 1240 units, cells and items identical. The fix (clear the cache when the state changes) is not a Z-range change, so I left it out of this lane. Proposed follow-up PROPOSED-AA-01.
- **F3. Harness start wait fails under heavy machine load.** `DEUS_Test.js` line 215 (read only) waits 60 frames with an 11 s limit after the map starts. In one full test_zrange run on ee280d57 every play and sim run stopped with `HARNESS timed out after 11000 ms waiting for 60 frames` (`evidence/ee280d57_test_zrange_under_load.log`). The same phases then ran with EXIT=0 alone, and the full run on a0e1402a was 10/10. The load probe beside that run (`evidence/a0e1402a_test_zrange_load_probe.log`, CPU % then nw.exe count every 30 s) shows 88 % CPU and 23 nw.exe at its start, falling to 23 % and 16 nw.exe. The NW.js processes are other lanes' runs. This will go in REPORT.md as the reason for that flake.

## Lane state at this stop
- In place (commits 5255f1a5..a0e1402a, 18 commits, all paths inside allowedPaths): the Z range authority in DEUS_World (data `Z_RANGES`, `state.zRange` saved, legacy saves = -2..+2, `DEUS_Z_RANGE` for a New Game); range-derived consumers in the 20 plugins listed by `git diff --name-only 5255f1a5..HEAD`; chunked sparse baseline storage and diff-only saves; outer layers uniform (stone below, air above; rock above +2 as before); 2 ft strata / 10 ft layers; flat 3D path scratch per reached level; `tools/test_zrange.js` + `tools/zrange/**` with fixtures made at the base.
- Not done: `docs/systems/DEUS_ZRange.md` and the updates to UF_Levels.md, UF_World.md, UF_WorldGen.md and DEUS_Fluid.md; `literal_map.md`; `test_changes.md`; the 3x layers_flat and depth runs; gate provocations and `test_zrange.js --provoke-all` on a0e1402a; the whole-suite base/tip diff (an earlier pair of runs hit the 180 s watchdog on both sides; the biomes suite still needs a base comparison); the bench (base and tip, normal x2, stress x2, -4..4 once, load probe); REPORT.md.
- Owner questions are still open and I have not answered them: the lava-on--2 rule, Q16, the band table. They will be copied into REPORT.md.
- Deleted before this commit, junction-safe with `tools/zrange/clone.js` removeTree: `%TEMP%\laneaa_clones` (every clone), `%TEMP%\laneaa_zr_snap` (two snapshots left by an interrupted run) and `%TEMP%\uf_snapshots\laneaa_{base,smoke,tip}_world`. No nw.exe with `laneaa` in its command line was left running. Logs and small report JSONs remain in `%TEMP%\laneaa`.
