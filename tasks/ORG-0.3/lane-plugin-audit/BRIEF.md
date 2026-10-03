# ORG-0.3 / lane-plugin-audit

Owner authorized this read-only plugin audit on 2026-10-02 alongside ORG-0.2. Writer: Grok, strongest available single-agent model at highest effort. Reviewer: Claude, strongest model at highest effort, after the writer stops. Codex is PM. No code changes, plugin disabling, moves, cleanup or pillar implementation in this lane.

```text
BUDGET UPDATE (Owner, Fri Oct 2 6:53 PM CT): Owner has max/pro plans on all providers. Loosen budget, not process.
- PM (Codex): strongest OpenAI model at its highest single-agent effort.
- Writers: strongest model at highest effort for every lane except trivial mechanical ones (those stay High).
- Reviewers: strongest model, highest effort. Gemini Pro preferred over Flash.
- Parallel lanes: up to 3–4 at once after pillars-v1, still only with zero shared files.
- Unchanged: one writer per lane, cross-family review, Deus claim check before merge, tests must reach RESULT, no multi-agent "swarm" modes, no self-certification.
```

The Owner's later 19:32 CT limit takes precedence: at most two active lane worktrees plus main. ORG-0.2 and this read-only lane are the active assignments. No swarms, subagents, fallback writer or self-review. The Owner-adopted 19:27 plan reserves CI, rulebook, docs structure, ignores and root cleanup to Deus's setup branch; do not duplicate them.

## Goal, base and provenance

Branch: `task/lane-plugin-audit`. Base/runtime source SHA: `565dc5aead7e068230528d573c395ea21ed5cf5d`. Worktree: `C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/lane-plugin-audit`. Know which plugin files are loaded, used, duplicated, stubbed or unknown before the parked pillar merge.

Audit the committed base and explicitly separate the Owner's current working-tree supplement. The reported count of 72 is a hypothesis to measure, not a fixed success condition. Main contains uncommitted WorldGen/package changes and an untracked Simulation_Core. Record file hashes, Git status and capture time for that supplement; never represent uncommitted bytes as the branch SHA. Read main only. Do not execute tests or write evidence into main. For any test fixture override, record exact seed/year and changed disposable files; never call that an untouched commit.

## Allowed and forbidden files

Writer outputs: `docs/architecture/PLUGIN_AUDIT.md` and `tasks/ORG-0.3/lane-plugin-audit/REPORT.md` plus evidence under that task directory. Throwaway investigation scripts and snapshots belong only under `scratchpad/lane-plugin-audit/` in this lane and are not production changes. PM bootstrap `docs/ci/WORKTREES.md` and lane manifest/brief must be preserved.

All game code/data, `plugins.js`, engine core/libs, images/art, PROVIDER_USAGE_STATUS.json, other worktrees/local files, setup-branch files, rules, CI and ignore files are read-only. No deletions, force-push, reset, stash, worktree removal, git mv or branch changes. DEC-037 forbids new faction/society work. Never infer dead code solely from absence in plugins.js: Core loads companions and World loads simulation modules separately.

## REFERENCES (required for any non-trivial technique)

- PM selects 1–3 real GitHub repos or files before the lane starts and lists them here with exact URLs and the specific file/function to learn from.
- Writer must open and read each reference before writing code, and cite in REPORT.md which reference pattern each new function follows.
- References are for patterns only: no copying code from GPL/AGPL repos (e.g. OpenFrontIO); MIT/BSD/Apache code may be adapted with attribution in a comment.
- If no suitable reference exists, the writer says so and stops for PM guidance instead of inventing one.
- Writers must not cite a repo they did not actually open.

PM searched once for this lane and opened these references and their licenses on 2026-10-02:

1. https://github.com/rpgtkoolmv/corescript/blob/master/js/rpg_managers/PluginManager.js — `PluginManager.setup` and `PluginManager.loadScript`: list/status filtering, ordered loading and separate script injection. License: MIT, verified at https://github.com/rpgtkoolmv/corescript/blob/master/LICENSE. This is MV reference code; prove actual MZ behavior from the local read-only engine and DEUS loaders. No replacement engine code.
2. https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API — the “Traversing the AST with a little linter” example: `delint`, `ts.createSourceFile`, `ts.forEachChild`, `getLineAndCharacterOfPosition`; distinguish executable identifiers from comments/strings and keep exact line evidence. License: Apache-2.0, verified at https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt. The opened page explicitly covers API versions 6.0 and earlier; do not assume a 7.x API or install dependencies/change package files. Existing tooling or careful grep is acceptable if limitations are reported. Patterns only unless an allowed adaptation is attributed.

Local authorities: `game/js/plugins.js`, read-only `PluginManager.setup/loadScript` in `game/js/rmmz_managers.js`, `game/js/plugins/DEUS_Core.js` companion loader, `DEUS_World.js` simulation module loader, `tools/run_tests.js`, `DEUS_Test.js`, current `.agents/rules` and Owner instructions. Read the baseline report via `git show origin/task/lane-baseline:docs/baseline/BASELINE_565dc5ae.md`; do not change that branch.

## Steps

1. Inventory every actual plugin file: lines; listed/not listed; ON/OFF; exact plugins.js load-order index; separately prove companion/module/test-only loading. Also list plugins.js entries whose file is absent. Record the exact file set and actual counts, including working-tree-only files.
2. For each file, list top-level globals, classes, exported UF/window aliases, engine method patches, callbacks/listeners and named consumers. Grep real executable call sites with file/line citations; distinguish definitions, comments, strings, test-only consumers, data-driven/event consumers and unresolved dynamic references. A zero grep count alone does not prove a file dead.
3. Count executable references matching `Game_*`, `$game*`, `Sprite_*`, `Scene_*`, `Window_*`, `PIXI`; report the precise pattern/parser, treatment of comments/strings and whether counts are token occurrences or distinct sites. Keep raw counts reproducible. Classify CORE SIM / WORLDGEN / RENDER-UI / TEST-DEMO / DUPLICATE / STUB / UNKNOWN, with evidence; file names and size alone are not classifications.
4. Explicitly inspect test/demo files: `test_build_vertical_ingame.js`, `DEUS_DepthDemo.js`, `DEUS_Test.js`. Inspect duplicate candidates: Move8/Movement8D; CellularFluids/Fluid; Combat/CombatRT/CombatUI; Lighting/DayNight; Structural/StructuralPhysics; Depth/DepthCues/Perspective25D. Inspect the <150-line candidates: Lighting, AssetStreaming, Spawners, CellularFluids, CombatRT, CombatUI, Move8, StructuralPhysics, WorldItems, FlowFields. If absent, say absent.
5. Inspect Factions, FactionMenus and UF_Households for actual boot-time loading under DEC-037. Specifically check the untracked `DEUS_Simulation_Core.js` through plugins.js, companion loaders, entry scripts and runtime/module loading; report proven, unproven and working-tree-only status separately.
6. For each flagged file, recommend KEEP / DISABLE / MERGE INTO <file> / MOVE TO archive/ with call-site evidence and uncertainty. Supply a proposed pillar for each KEEP file, as future PILLAR_MAP input. This is a recommendation, not an approved map or pillar-build start.
7. Record `run_tests.bat` before and after the audit under identical conditions in disposable copies. Preserve real raw output, per-suite counts, exit and missing RESULT/coverage. Verify production file hashes unchanged before/after. Do not run native test jobs at the same time as Claude's final acceptance run; coordinate via PM. The diagnostic baseline is red, so do not manufacture a green verdict or mask additional failures.
8. Write findings and a compact list of Owner decisions. Commit only explicitly named output paths with writer identity `deus-grok` and subject `[grok]`; push only this branch normally and verify exact origin SHA. Stop for Claude review and Deus check. No merge, tag or closure by the writer.

## Acceptance and report

`docs/architecture/PLUGIN_AUDIT.md` covers every measured file, actual load paths, definitions and callers, coupling counts/method, classifications and recommendations. REPORT includes Task ID, branch, origin-visible full SHA, audited source SHA and working-tree hash provenance, files changed, exact temporary helper names and reference patterns (or no new functions), commands, before/after raw RESULT lines, all untested behavior and needed decisions.

Claude independently reads the full report and actual source/call sites, runs the stated checks and gives `VERDICT: PASS | PASS_WITH_NITS | FAIL` with BLOCKING items. Done only after that review and delivery to the Owner; code changes remain unauthorized. Step 4 of the Owner's proposal (disable/archive approved files) is a separate small change lane only after explicit Owner approval; duplicates are not merged here.

## Stop and escalate

Stop for inaccessible code, unavailable authentication/model, missing required references, disputed provenance or any need to edit game logic. Do not bypass permissions or downgrade. After two failed lane attempts, bring one clear question to the Owner. Report “not checked” instead of guessing runtime liveness, abandonment or dead-code status.
