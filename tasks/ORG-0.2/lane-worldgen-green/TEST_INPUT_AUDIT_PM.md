# ORG-0.2: PM audit of hardcoded empty test inputs

Owner request and inspection: 2026-10-02. Source inspected: canonical main `565dc5aead7e068230528d573c395ea21ed5cf5d`. Read-only findings; no assertions, runtime code, faction/society code or thresholds were changed by this audit. Grok's separate read-only audit was interrupted before a final verdict and is not counted as independent confirmation.

## Introducing commit

`git blame -w -M -L 2225,2225 -- game/js/plugins/DEUS_WorldGen.js` traces the river-test literal `[]` to **`2c23b61b68dc53b73b6a764cbc6de2c43579bb0a`**, 2026-10-02 09:23:13 CT. Subject: **`[astra] WG.WORLDGEN.06 Engine Bridge`**. Recorded Git author and committer: `deus-pm <deus-pm@local.invalid>`. The commit subject attributes the work to Astra; Git metadata alone does not independently establish which provider process wrote it.

The introducing diff replaces `const rivers = WorldGen.riverModels(st);` with `const rivers = [];`. The same commit changes `WorldGen.riverModels` to return `[]` and `WorldGen.riverModel` to return `null`, while moving water generation to the hydrology network. Thus the test input and former public adapter were disconnected from generated water.

The requested ordinary `git log -L 2225,2225:game/js/plugins/DEUS_WorldGen.js` also identifies the later `e804df07f7c7cc54cdf7668aae4831ff8f4ae2e3` rewrite (2026-10-02 14:14:43 CT, `[gemini] Fix MaxDepth parameter and static check failures`). Whitespace-aware blame and the introducing diff identify `2c23b61b...` as the original change. `git log -G 'const rivers = \[\];' main -- game/js/plugins/DEUS_WorldGen.js` was also checked.

## Findings with real consumers

| Classification | Input and source | Consumer and effect |
|---|---|---|
| Confirmed disconnected test input | `game/js/plugins/DEUS_WorldGen.js:2225`, `const rivers = [];` | `rivers_count` at 2229 always fails its positive minimum. `river_not_through_start` at 2227 passes because `gaps.every(...)` sees no elements. `river_continuous` at 2247 sees an unpopulated `breaks` list because its river loop never executes. The between-area continuity branch has no river to select. |
| Related disconnected production adapter, same change | `game/js/plugins/DEUS_WorldGen.js:396`, `WorldGen.riverModels` returns `[]`; `riverModel` returns `null` | Calling the adapter instead of the test literal is insufficient until it reports the actual hydrology/tile data. This is part of the Owner-approved item-(c) repair, not another independent test case. |
| Additional empty mutation registry / coverage gap | `tools/test_agriculture.js:11`, `const mutations = {};` | Line 12 reads `mutations[mutant]` into `assert.ok(..., "known mutation")`. No registry entries are assigned elsewhere in that file; every named `--mutant=` request fails before testing a mutation. Without that argument the branch is skipped. This does not make the ordinary agriculture assertions pass vacuously. Read-only finding in frozen scope; no correction authorized. Blame: `e7ddb047a`, recorded author `snewt`, 2026-09-20 14:39:44 CT. |

No second disconnected live-world assertion input was confirmed among the candidates inspected. This is a bounded grep-based result, not a statement that all repository assertions are sound.

## Checked candidates that are not stubs

- `tools/society/test_race_class_affinity.js:1224`: `numbers = []` is populated by `jsonNumbers(canonical, "", numbers)` before checking that no JSON numbers exist.
- `tools/test_race_starts.js:536`: `seen = []` receives `reader.seen` via `seen.push.apply` before its bounds assertion.
- `tools/test_control_board.js:276`: `companionPlugins = []` is assigned from the actual source declaration; the missing-declaration path explicitly records a failure.
- `tools/test_z_doors.js:110`: `frames = []` is populated by the sprite `setFrame` callback before `frames[0][0]` is asserted.
- Zero-initialized counters in `tools/art/test_blank_templates.js`, `tools/art/test_blob_edges.js`, `tools/sim/test_global_spawn_density.js`, `tools/sim/test_water_open_cp.js`, `tools/test_aquifer_seepage.js`, and `tools/test_z_flora.js` are incremented, accumulated, used as loop/budget counters or diagnostics. Their initial zero alone is not a stubbed game result.

## Search method, artifacts and limits

PM first ran `rg -n --glob '*.js' 'const\s+\w+\s*=\s*(\[\]|\{\}|0)\s*;' game/js/plugins tools` (2,306 matches, mostly ordinary initialization). Then `node scratchpad/org-0.2-worldgen-green/audit_empty_test_inputs.js` scanned 412 tracked files: plugin JS including embedded suites, plus tool/test-directory/fixture JS. It collected 4,480 simple declarations, 518 candidates with a nearby assertion and 1,874 assertion lines containing literal empty values/zero. An additional tracked `game/**/*.js` test-name search found only the already-included `test_build_vertical_ingame.js`.

The candidate scan looks 80 following lines after a declaration and marks obvious writes before the first nearby assertion. It can miss multi-variable declarations, distant assertions, indirect helper data flow, scopes, assignments outside declarations and dormant test snapshots. Candidates are not findings without reading their use. Expected literal values, intentional empty-input tests, loop indices and accumulators were not automatically labelled false tests. This was not a full AST/data-flow audit or runtime mutation campaign. Historical task snapshots and archived copies were not enumerated as active tests.

Local reproducible candidate data: `scratchpad/org-0.2-worldgen-green/empty_test_inputs_candidates.json`; generator: `scratchpad/org-0.2-worldgen-green/audit_empty_test_inputs.js` in the canonical workspace's ignored operations scratchpad. The findings above include source lines so they remain directly checkable without those local helpers. No game test was executed for this static audit.

## Owner approval retained

The Owner approved only restoring the river test input after `WorldGen.riverModels` reads actual carved hydrology/tile data. All count, distance and continuity assertions and thresholds stay unchanged; newly exposed failures must be reported or repaired in the world. Item (a) continues first. This audit grants no permission for agriculture/faction/society implementation or unrelated test changes.
