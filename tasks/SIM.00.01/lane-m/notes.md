# Lane M (SIM.00.01) evidence notes for ADR-003

- Writer: Claude (Lane M), 2026-09-26.
- Worktree: `C:\Users\snewt\.deus_worktrees\lane-m`, branch `task/lane-m`, HEAD at start `477bb3bf`.
- Lane base: `ebeec892`.
- Everything below was run in the foreground. Nothing in `game/` or `tools/` was modified.
- One code probe ran in a temp snapshot outside the repo (§6), as 0018-R §3b allows.

## 1. Session start

```
$ git log --oneline -3
477bb3bf [gemini] Record Lane M launch prompt 20260926_002434
8b2da031 [gemini] Open Lane M (SIM.00.01 / ADR-003): lane.json and BRIEF.md
ebeec892 [gemini] 0018-R §2 DEC-012 sim/render split + LOD (Owner)
EXIT=0
$ git status
On branch task/lane-m ... nothing to commit, working tree clean
EXIT=0
```

These commits since the last review are all `[gemini]` docs and task files. There are no Gemini edits to code, tools or data on this branch.

## 2. The citation baseline is the same code as main

```
$ git diff --stat ebeec892 HEAD -- game tools
(empty)
EXIT=0
$ git rev-parse ebeec892 main HEAD
ebeec89227a6aadb8bd955668cd4c8bc6594aca2
2033e8db96377122a30be7b94fa76cf07512c75f
477bb3bfc13d84424cd659c0a18870e845f7033b
EXIT=0
$ git diff --stat ebeec892 main -- game tools
(empty)
EXIT=0
$ git log --oneline ebeec892..main
2033e8db [gemini] 0019-T §1 Update active workers telemetry after restart relaunch
EXIT=0
$ git diff --stat d1f9cec5 ebeec892 -- game tools
 tools/test_generated_z2_cut_proof.js | 838 ++++++++++++++++++++++++-----------
 1 file changed, 590 insertions(+), 248 deletions(-)
EXIT=0
```

## 3. Tick hooks (PM survey item: 32 aliases in 26 plugins)

```
$ cd game/js/plugins && grep -nE "(Game_Map|Scene_Map)\.prototype\.update\s*=" *.js
DEUS_Anim.js:1506 / DEUS_Colonists.js:5748 / DEUS_ColonyOverseer.js:196 / DEUS_Combat.js:1414 / DEUS_Combat.js:1479 /
DEUS_Containers.js:1323 / DEUS_Core.js:175 / DEUS_Core.js:505 / DEUS_Depth.js:834 / DEUS_Ecology.js:992 /
DEUS_Environment.js:796 / DEUS_Factions.js:657 / DEUS_Factions.js:751 / DEUS_Factions.js:1156 / DEUS_Fire.js:617 /
DEUS_Fluid.js:1016 / DEUS_Fog.js:638 / DEUS_History.js:3662 / DEUS_History.js:3780 / DEUS_Interact.js:885 /
DEUS_Jobs.js:1777 / DEUS_Levels.js:4287 / DEUS_NaturalConnections.js:508 / DEUS_Ownership.js:613 /
DEUS_Projects.js:1596 / DEUS_Select.js:2289 / DEUS_Sheet.js:2252 / DEUS_Talk.js:1938 / DEUS_TimeSpeed.js:189 /
DEUS_TimeSpeed.js:232 / DEUS_Wildlife.js:1195 / DEUS_World.js:2932
EXIT=0
files: 26   EXIT=0
lines: 32   EXIT=0
```

- `plugins.js` has 42 entries, and all 42 have `"status": true`.
- `plugins/` holds 95 files: 52 `DEUS_*.js` and 43 `UF_*.js`. 41 of the `UF_*.js` files are 16-line shims or shorter.

## 4. Clock probe (DEUS_Core minute timer, `DEUS_Core.js:62`, `:304-311`)

```
$ node -e "let t=0,...; for(f=1..600000){ t+=1/60; if(t>=1/6){ t-=1/6; ... } }"
{"frames":600000,"minutes":60000,"framesPerMinuteHistogram":{"10":60000}}
EXIT=0
```

Result: no float drift. The clock counts calls, not elapsed time.

## 5. Screen and tile size

```
$ node -e "const s=require('./data/System.json'); ..."
{"screen":[816,624],"ui":[816,624],"tileSize":48}
EXIT=0
```

Zoom is locked at 1.0 (`DEUS_Camera.js:35-51`). So the view is 17×13 cells.

## 6. `bench_history_sim.js` probe, in a temp snapshot of `ebeec892`

```
$ git archive ebeec892 tools/bench_history_sim.js game/js game/data | tar -x -C %TEMP%/deus_lane_m_probe_ebeec892
EXIT=0   (16M)
$ node tools/bench_history_sim.js --seed 0 --years 100 --runs 1
FAIL: Error: Trial seed=0 years=100 failed: FAIL: Error: History: HistoricalDemographics, Callings and Dnd5e must be loaded before New Game
    at History.generate (DEUS_History:384:44)
    at trial (...\tools\bench_history_sim.js:127:36)
    ...
EXIT=1
```

## 7. Lane K's K3 baseline is absent (so §9 is PENDING-K3)

```
$ ls C:\Users\snewt\.deus_worktrees\lane-k\tasks\WG.00.09b\lane-k\perf
ls: cannot access '.../lane-k/perf': No such file or directory
EXIT=2
$ git -C lane-k log --oneline -1
ef866f10 [gemini] Record Lane K launch prompt 20260926_002423
EXIT=0
```

## 8. No material ledger in the plugins

```
$ grep -il "ledger\|conserv" DEUS_*.js UF_*.js
DEUS_Colonists.js DEUS_ColonyOverseer.js DEUS_DeathForensics.js DEUS_Factions.js DEUS_Fluid.js DEUS_History.js DEUS_Sheet.js
EXIT=0
```

The hits break down as:
- a barter-credit ledger (`DEUS_Colonists.js:648-670`);
- a death log;
- UI window names;
- Fluid's comments.

None of them is a material ledger.

## 9. RMMZ dependency counts (§13), run in `game/js/plugins`

The command was `grep -lE <pattern> DEUS_*.js UF_*.js | wc -l`, with EXIT=0 for each pattern.

| Pattern | Files |
|---|---:|
| `Scene_Map\.prototype\.[A-Za-z_]+ = ` | 20 |
| `Spriteset_Map\.prototype\.[A-Za-z_]+ = ` | 18 |
| `Scene_Boot\.prototype\.start = ` | 39 |
| `Tilemap\.(isWaterTile\|isTileA[0-9]\|TILE_ID_[A-E]\|FLOOR_AUTOTILE_TABLE\|WALL_AUTOTILE_TABLE)` | 16 |
| `\bInput\.\|\bTouchInput\.` | 18 |
| `AudioManager\.\|SoundManager\.` | 8 |
| `DataManager\.(makeSaveContents\|extractSaveContents) = ` | 15 |
| `\$dataMap\b` | 21 |
| `\$dataTilesets` | 5 |
| `\$dataSystem` | 3 |
| `\bWindow_[A-Za-z]+` | 13 |
| `Game_CharacterBase\|Game_Character\b` | 11 |
| `\bnew Bitmap\(` | 23 |
| `module\.exports` | 5 |

Occurrences of `(Input|TouchInput)._currentState`: 73.

**RMMZ globals in real-code files.** Files longer than 20 lines were checked against the RMMZ-global pattern (`Game_*|Scene_*|Sprite*|Window_*|$game*|$data*|PluginManager|DataManager|SceneManager|ImageManager|AudioManager|SoundManager|StorageManager|Graphics|Input|TouchInput|Bitmap|Tilemap|PIXI|JsonEx`):
- 54 files have real code, and 48 of them match (EXIT=0).
- The 6 that match nothing: `DEUS_Callings`, `DEUS_Conditions`, `DEUS_DeathForensics`, `DEUS_Dnd5e`, `DEUS_HistoricalDemographics`, `UF_Time`.
- Nothing under `game/js` or in `index.html` references `UF_Time`. The grep returned no lines.

## 10. Gate tests (lane.json `gateTest`; BRIEF "Verification & Gate")

```
$ node tools/check_deus_syntax.js
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
$ node tools/governance/check_wbs_integrity.js
INTEGRITY AUDIT SUMMARY: 15 passed, 0 failed
EXIT=0
```

## 10b. Rev 2: the review checklist and DEC-013 landed while Rev 1 was being written

```
$ git log --oneline -3   (after the Rev 1 commit)
ddd1b865 [claude] SIM.00.01 ADR-003 sim/render split and LOD simulation (Rev 1, PROPOSED)
f4e3b56d [gemini] 0021-V §3,§6,§7 Lane M review checklist: 9 layers, structural collapse, decay
477bb3bf [gemini] Record Lane M launch prompt 20260926_002434
EXIT=0
$ git log --oneline -3 main
0c1baf8d [gemini] 0021-V §1-§7 DEC-013, 9 layers/races, collapse & decay packages, WBS Rev 19
8e99f6c5 [gemini] 0020-U §4 Align WG.00.09b row with DEC-011 flat layers
2033e8db [gemini] 0019-T §1 Update active workers telemetry after restart relaunch
EXIT=0
$ git diff --stat ebeec892 0c1baf8d -- game tools
(empty)
EXIT=0
```

**Sources read:**
- `tasks/SIM.00.01/lane-m/review_checklist.md` (from `f4e3b56d`).
- The PM inbox `0021-V.md` (in `done/`) and `0021-V-addendum.md`.
- `git show 0c1baf8d:` for `docs/OWNER_DECISIONS.md` (DEC-013, L171-187), `docs/VISION.md` (V137 L131, V138 L132, V128 log L361) and `docs/worldgen/DEUS_WORLDGEN_WBS.md` (WG.00.17 L105, SIM.40.01-.09 L525-533).

**New code facts (checked with `sed -n` / `grep -n`, EXIT=0):**
- Strata material table with support, maxHP and debris: `DEUS_Levels.js:1000-1010`.
- A destroyed stratum becomes air: `:1700-1702`. The debris is only named in the event (`:1720-1722`), with "no item drops in 19A" (`:1001-1002`).
- Change records: `REC = 11`, `:997`; encoder `:1110-1114`.
- Five fixed change maps: `:1137`, `:1141`. Elevation `(minZ + 2) * STRATA`, capped at 24: `:1805`.
- Minimap `Z_LEVELS` / `Z_COUNT`: `DEUS_Minimap.js:59-60`.
- Unsupported airborne builds refused: `DEUS_Colonists.js:3736`.
- Doors ruin/rubble: `DEUS_Doors.js:18`, `:444-451`.
- `abandonedYear` set: `DEUS_HistoricalDemographics.js:521`.
- Per-level allocations:
  - `new Array(cells * 6)`: `DEUS_World.js:605`;
  - Fluid grids/flood/`inQueue`: `DEUS_Fluid.js:179-183`;
  - strata `Uint8Array(n * STRATA)`: `DEUS_Levels.js:1037`.

## 11. Method and caveats

**How the survey was done.**
- Three read-only survey agents collected facts:
  - the RMMZ dependencies;
  - the render plugins' reads and writes;
  - the headless and aggregate state.
- Every `file:line` in the ADR was then printed and checked by the writer with `sed -n` / `grep -n` in this worktree.
- The check caught and corrected these survey mistakes:
  - History `step` and `isRuined` are in `DEUS_HistoricalDemographics.js`, not `DEUS_History.js`.
  - Fluid `fluidCapacityAt` is at `:517-532`.
  - Fluid `revision` is at `:184` and `:671`.
  - The World inventory/equipment defaults are at `:1136-1137`.
  - The Wildlife comment is at `:1197`.
  - Audio is in 8 files, not 9.
- One survey claim was rejected: "`Graphics.frameCount` is presentation-only". In fact DEUS_NaturalConnections gates its fluid and creature steps on it (`:512-515`).

**Corrections to the PM survey.** These are in ADR-003 Appendix A:
- NaturalConnections ignores pause but *does* scale with speed.
- In the default 1×1-area world, Fluid's and Ecology's view-only stepping cover the whole world.
- The `test_strata_foundation.js` range is `:156-243`, and its stubs are no-ops.
- `bench_history_sim.js` exits 1.

**What was not checked:**
- NW.js behaviour of `require`-loaded modules (whether they share the page's realm). §2.5 avoids depending on it.
- `SharedArrayBuffer` availability in NW.js (§12.1 B).
- No game run, no Playtest (F5) and no screenshots: this is a docs-only package with no runtime claim.
