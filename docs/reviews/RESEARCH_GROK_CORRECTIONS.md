# Research-correction independent review — Grok 4.7

VERDICT: CLEAN PASS

| Field | Value |
|---|---|
| Reviewer | Grok 4.7 xhigh (xAI). Cross-family reviewer. Not the writer. |
| Writer | Codex / GPT (OpenAI). Commit identity `deus-pm <deus-pm@local.invalid>`. Subject tagged `[codex]`. |
| Writer SHA | `2e44668b0af95caea1734fb7b9b10e10389c845e` |
| Parent | `2bdf3f2f3baaae10fcefc54416cb29c847d0d9a7` (prior Grok FAIL review) |
| Named source SHA | `798ac01c148206dfc226c0697818c94c0f3d8581` |
| Branch | `task/github-tech-inventory` |
| Review date | 2026-10-03 |
| Worktree | `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\github-tech-inventory` |
| Corrected docs | `docs/research/GITHUB_TECH_INVENTORY.md`, `docs/research/SPRITE_BENCH_FINDINGS.md` |
| Prior review | `docs/reviews/RESEARCH_GROK_798ac01c.md` remains VERDICT: FAIL. This review does not edit it. |

Goal: independently check the writer's correction of the two research docs against the five requested fixes, using the tree at `798ac01c` for the cited sources, and say whether the corrected docs overclaim or point at the wrong lines. This is a docs-lane re-review of that correction. It does not replace the prior FAIL, certify a native run, or issue a Deus claim check.

## Scope and controlling rules

Reviewed the single correction commit `2e44668` against its parent `2bdf3f2f`. The diff is four line replacements in the two research docs. No game, engine, art, task, or lane file is in that diff.

Controlling Owner limits, read from `AGENTS.md` and `docs/DECISIONS.md:52` (D-2026-10-02-3): no merge, no force-push, no deletion, no commit or push to `main`. The expected-red list gates CI, hygiene, and docs lanes only. ORG-2 owns the native slot. This lane is a docs review, so `run_tests.bat` was not run and no native RESULT is claimed. `AGENTS.md` §2's general "reviewers run the tests" rule yields to that exemption here. The only review file written for commit is this one. Search notes stay under `scratchpad/research-rereview/` (gitignored). The prior FAIL limits remain: this pass did not reread all 51 inventory rows.

## Commit boundary

```text
git rev-parse HEAD
2e44668b0af95caea1734fb7b9b10e10389c845e
HEAD_EXIT:0

git rev-parse --abbrev-ref HEAD
task/github-tech-inventory
BRANCH_EXIT:0

git log -1 --format="%H%n%an <%ae>%n%cn <%ce>%n%s%n%ci"
2e44668b0af95caea1734fb7b9b10e10389c845e
deus-pm <deus-pm@local.invalid>
deus-pm <deus-pm@local.invalid>
[codex] Correct inventory scope and source citations after Grok review
2026-10-03 00:51:53 -0500
exit 0

git rev-parse HEAD^
2bdf3f2f3baaae10fcefc54416cb29c847d0d9a7
PARENT_EXIT:0

git merge-base --is-ancestor 798ac01c148206dfc226c0697818c94c0f3d8581 HEAD
ANCESTOR_798_EXIT:0

git diff --stat 2bdf3f2f3baaae10fcefc54416cb29c847d0d9a7 2e44668b0af95caea1734fb7b9b10e10389c845e
 docs/research/GITHUB_TECH_INVENTORY.md | 6 +++---
 docs/research/SPRITE_BENCH_FINDINGS.md | 2 +-
 2 files changed, 4 insertions(+), 4 deletions(-)
STAT_EXIT:0

git diff --exit-code 798ac01c148206dfc226c0697818c94c0f3d8581 2e44668b0af95caea1734fb7b9b10e10389c845e -- game/js/plugins/DEUS_World.js game/js/plugins/DEUS_Ecology.js docs/systems/DEUS_RESOURCE_ECONOMY_STANDARD.md tools/bench_render_layers.js tasks/WG.00.09b/lane-k/REPORT.md game/js/libs/effekseer.min.js game/js/rmmz_core.js
SOURCE_SAME_EXIT:0
```

Cited source paths are identical between `798ac01c` and the writer SHA, so line numbers read in the worktree are the lines at `798ac01c`. The prior review blob is identical at the parent and at the writer SHA:

```text
git rev-parse 2bdf3f2f3baaae10fcefc54416cb29c847d0d9a7:docs/reviews/RESEARCH_GROK_798ac01c.md
97fbcfe366aabd2b5533b315d2f222acc36cdc56
git rev-parse 2e44668b0af95caea1734fb7b9b10e10389c845e:docs/reviews/RESEARCH_GROK_798ac01c.md
97fbcfe366aabd2b5533b315d2f222acc36cdc56
BLOB_EXIT:0
```

## Corrections

### 1. The GitHub negative is now a docs-and-tasks search, and the engine headers are acknowledged

`docs/research/GITHUB_TECH_INVENTORY.md:3` now says a `github.com` URL search of tracked `docs/` and `tasks/` at `798ac01c`, excluding this inventory's new license links, found only the project's own remote. It says that is not an absence claim for other paths or all Git history, and it names pre-cutoff third-party URLs at `game/js/libs/effekseer.min.js:3` and `game/js/rmmz_core.js:1062`.

```text
git grep -n -i -I "github.com" 798ac01c148206dfc226c0697818c94c0f3d8581 -- docs tasks
GREP_EXIT:0
```

Hits at that SHA:

| Path | Line | URL |
|---|---:|---|
| `docs/OWNER_DECISIONS.md` | 84 | `https://github.com/willshw89/Deus.git` |
| `docs/archive/STATUS_LEDGER_20260930.md` | 34 | `https://github.com/willshw89/Deus.git` |
| `tasks/SIM.40.01/lane-q/REPORT.md` | 43 | `https://github.com/willshw89/Deus.git` |
| `docs/research/GITHUB_TECH_INVENTORY.md` | 7–13 | the seven new license links (pixijs, pako, localForage, EffekseerForWebGL, stb, nw.js, nodejs) |
| `docs/research/GITHUB_TECH_INVENTORY.md` | 3 | the word `github.com` in the old method sentence, not a URL |

`git grep -a -l -i "github.com"` on the same trees returned only those four files (`BINAWARE_EXIT:0`). No other tracked `docs/` or `tasks/` file at `798ac01c` contains `github.com`. After the seven license links are set aside, the only `github.com` URL is the project's own remote. The narrowed claim matches that search.

The two named headers, read after the source-sameness check above:

```3:3:game/js/libs/effekseer.min.js
 *  https://github.com/effekseer/EffekseerForWebGL
```

```1061:1062:game/js/rmmz_core.js
// This is based on Darsain's FPSMeter which is under the MIT license.
// The original can be found at https://github.com/Darsain/fpsmeter.
```

```text
git log -1 --format="%H %ci %s" 798ac01c148206dfc226c0697818c94c0f3d8581 -- game/js/libs/effekseer.min.js
940ac9172c21cddb2d5f3f15aa4512d4d274408b 2026-09-18 14:42:59 -0500 Baseline: project state as found on 2026-09-18 before guardrail work
EFF_LOG_EXIT:0

git log -1 --format="%H %ci %s" 798ac01c148206dfc226c0697818c94c0f3d8581 -- game/js/rmmz_core.js
940ac9172c21cddb2d5f3f15aa4512d4d274408b 2026-09-18 14:42:59 -0500 Baseline: project state as found on 2026-09-18 before guardrail work
CORE_LOG_EXIT:0
```

Both last changes are before the 2026-10-02 00:00 CT cutoff. The sentence's "such as" does not claim those two comments are the only third-party engine URLs. "Those comments do not establish a new Gemini adoption" does not say the bundled libraries are absent. The old absolute Git-history negative is gone.

### 2. The typed-array row now points at the map-object field

`docs/research/GITHUB_TECH_INVENTORY.md:24` now says the purpose is compact per-cell object type IDs, and that `DEUS_World.js:1258-1259` creates the `Uint16Array` and `:1269` assigns it to `ufObjects`. It no longer cites `DEUS_WorldGen.js:1490`.

```1258:1269:game/js/plugins/DEUS_World.js
        // Map objects (plants, stones, buildings): one type number per cell, drawn and simulated by UF_Objects, not events.
        const objects = new Uint16Array(cells);
        let nextEventId = tpl ? tpl.events.length : 1; // keep template event IDs unchanged

        const map = {
            autoplayBgm: false, autoplayBgs: false, battleback1Name: "", battleback2Name: "",
            bgm: { name: "", pan: 0, pitch: 100, volume: 90 }, bgs: { name: "", pan: 0, pitch: 100, volume: 90 },
            disableDashing: false, displayName: "", encounterList: [], encounterStep: 30,
            width: size, height: size, note: "",
            parallaxLoopX: true, parallaxLoopY: true, parallaxName: "", parallaxShow: false, parallaxSx: 0, parallaxSy: 0,
            scrollType: 3, specifyBattleback: false, tilesetId: CONFIG.tilesetId,
            data, events, ufArea: { x: ax, y: ay, z }, ufObjects: objects
```

Line 1258 is the type-number comment. Line 1259 allocates the `Uint16Array`. Line 1269 assigns that array to `ufObjects`. The range citation matches those lines. Packet 04 at `docs/packets/generation/DEUS_GENERATION_PACKET_04_CLIMATE_BIOMES_ECOLOGY_RESOURCES.md:29` says storage is `$dataMap.ufObjects` (a `Uint16Array(65536)`). The purpose text now matches the comment and that storage sentence. The status cell still says this map-object array is not the planned SIM-1 entity store. That WBS comparison was not re-audited in this pass.

`docs/PERFORMANCE_ARCHITECTURE.md:187-190`, still cited as a historical mention, is the general typed-array pattern list (`Uint8Array`, `Int32Array`, `Float32Array` for grid storage). It is not the `ufObjects` allocation. The current-code pointer in the corrected cell is `DEUS_World.js`, which is the array the row describes.

### 3. Ecology cites the 5–15 and 5–10 bands

`docs/research/GITHUB_TECH_INVENTORY.md:55` now says `docs/systems/DEUS_RESOURCE_ECONOMY_STANDARD.md:213-231` specifies a 5–15-year mature-tree band and 5–10-year selective-logging canopy recovery, and that `DEUS_Ecology.js:733-760` matures sprouts over 120–180 beats.

```220:224:docs/systems/DEUS_RESOURCE_ECONOMY_STANDARD.md
  - *Mature Tree:* $5\text{–}15\ \text{years}$ (Produces $10\ \text{timber units}$).
  - *Ancient / Landmark:* $16\text{–}50+\ \text{years}$ (Produces $25\ \text{timber units}$).
- **Regeneration Differential:**
  $$\Delta \text{Trees} = \left( T_{\text{mature}} \times K_{\text{dispersion}} \times S_{\text{soil}} \times C_{\text{climate}} \right) - H_{\text{harvest}}$$
- **Anti-Clear-Cutting Invariant:** Selective logging leaves seed trees that regenerate canopy in $5\text{–}10\ \text{years}$. Total clear-cutting strips the local seed bank, requiring windborne migration across decades ($25\text{–}50\ \text{years}$) to re-establish forest cover.
```

Both requested bands are inside the cited range. The same paragraph also states a 25–50-year clear-cut recovery. The corrected sentence does not deny that figure. The old "15-year target" compression is gone.

`DEUS_Ecology.js:733` says resources mature over 2–3 minutes. Inside `:733-760`, the sprout delays are 120, 150, and 180 beats, including `delay: 180` at line 756. Line 761 repeats `delay: 180` one line past the cited end. The cited span already contains the 120–180 beat range the sentence reports.

### 4. Sprite anchors are the FPS formula and the stress transcription

`docs/research/SPRITE_BENCH_FINDINGS.md:25` now links `tools/bench_render_layers.js#L332` and `tasks/WG.00.09b/lane-k/REPORT.md#L178`.

```332:332:tools/bench_render_layers.js
            fps: { atMedian: med ? r3(1000 / med) : null, atP95: p95 ? r3(1000 / p95) : null, atWorst: worst ? r3(1000 / worst) : null },
```

`med` is the median frame interval built just above. The link text `1000 / median frame interval` is the `atMedian` expression on line 332, rounded by `r3`. Line 327 remains `const out = {` and is no longer cited.

`tasks/WG.00.09b/lane-k/REPORT.md:165` is still the heading `## F2.5 Benchmark on c2184c94`. The stress transcription begins at line 178 and continues through 181:

```178:181:tasks/WG.00.09b/lane-k/REPORT.md
  run 1 stress_day_30s    frame median  63.03 p95 190.27  worst 311.125 ms (15.865 fps at the median)  tick 61.25 ms   draws 182  CPU 11.8/15.3/27 %
  run 1 stress_night_30s  frame median 71.635 p95 180.825 worst 344.78  ms (13.96 fps at the median)   tick 67.075 ms  draws 174  CPU 10.9/13.7/19.2 %
  run 2 stress_day_30s    frame median  67.21 p95 204.98  worst 511.975 ms (14.879 fps at the median)  tick 64.23 ms   draws 210  CPU 10.9/13.9/22.8 %
  run 2 stress_night_30s  frame median 67.675 p95 323.495 worst 535.365 ms (14.777 fps at the median)  tick 66.105 ms  draws 203  CPU 10.7/14.2/27.1 %
```

`#L178` is the first of those four lines. The sprite table pads some of the same figures to three decimals (63.030, 190.270, 344.780, 13.960, 67.210, 204.980). The JSON file was not re-parsed in this pass. The prior FAIL review recorded those JSON values; this pass checks that the corrected anchor lands on the report block that transcribes them.

### 5. No million-sprite GPU claim and no RENDER lane

The correction hunk in `SPRITE_BENCH_FINDINGS.md` changes only the two anchors. The note still says the searched records do not substantiate a benchmark of one million animated sprites, that the FPS figures are derived from measured intervals and are not an independent GPU frame-rate measurement, and that the runs must not be described as Radeon 780M GPU results. `docs/research/SPRITE_BENCH_FINDINGS.md:37` still says this evidence review neither opens another lane nor changes the existing WG.RENDER.02 plan. The correction diff names only the two research docs. No RENDER lane file was added.

## Unperformed checks

- `run_tests.bat` was not run. No native NW.js RESULT line was produced. No suite, seed, screenshot, or FPS measurement from this session is claimed. ORG-2 owns the native slot. D-2026-10-02-3 is why a missing native run is not treated as a docs-lane failure.
- No Deus claim check. This file is not a Deus CONFIRMED, PARTIAL, or FALSE verdict.
- No full 51-row reread. Rows outside the three changed inventory lines and the one changed sprite line were not re-audited. Prior "what held" checks, including license fetches and the Lane K JSON parse, were not repeated.
- No merge, force-push, file delete, or `main` commit or push. No author research doc was edited by this review.

VERDICT: CLEAN PASS
