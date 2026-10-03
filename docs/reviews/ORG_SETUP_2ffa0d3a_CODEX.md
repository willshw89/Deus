# Codex/GPT review of org/setup-2026-10-02

Reviewed source: 2ffa0d3a5aa6649d0a8eed0ea7c52edc1c8e4442. Date: 2026-10-02. Writer: Grok (Deus), explicitly confirmed by Owner. Reviewer: Codex/GPT; cross-family. Verdict: CHANGES REQUIRED. Owner will repair the findings on this branch. No PR opened because the requested pass condition is not met; no merge. This verdict reviews source 2ffa0d3a, not Codex-authored documentation added after it.

## Findings for the Owner

1. **MAJOR: executable fixture files are excluded from syntax CI.** tools/ci/syntax_check.js:31 skips every directory named fixtures, though the header and workflow claim every tools/**/*.js file. The observed run skips 53 JS files. Some are deliberately invalid governance test inputs, but others execute: tools/art/fixtures/templates/build_fixture.js is required by tools/art/test_blank_templates.js:37 and is also a CLI (the test itself tells users to rerun it at line 944). tools/fixtures also contains runnable UF_CapturePreVertical, UF_FireSafetyRuntime, UF_SleepRuntime, UF_SocietyRuntime, UF_ZFlora, UF_ZIntegration and UF_ZZ_OldSaveFixture plugins. A syntactically invalid tools/fixtures/real_runner.js returned exit 0 in the failure probe. The same invalid source at tools/runner.js returned exit 1. Replace the blanket directory exclusion with documented, narrow exceptions for deliberate malformed inputs; keep executable fixture code covered. Evidence: scratchpad/org-setup-review/ci_probes.json and its preserved synthetic fixture tree.
2. **MINOR: diff whitespace check fails.** git diff --check 565dc5ae 2ffa0d3a exits 2 on .gitignore:85-97, reporting CRLF additions as trailing whitespace. Normalize those new lines to the file's existing convention; do not normalize unrelated files.
3. **Current-policy alignment needed before integration.** AGENTS.md and WBS routing should reflect the later 21:16/21:20 Owner instructions: isolated concurrent authorized lanes, ORG-0.2 top priority, direct Codex-to-Gemini dispatch, Gemini only narrow writing with references, and no direct main commits. Older one-lane/Owner-relay statements do not govern this session. Link the fallback SOP in docs/ops/USAGE.md (currently on task/org-0.2-worldgen-green) when integrating. Do not copy a stale policy over newer Owner instructions.

## CI coverage: exactly what it does and does not check

.github/workflows/ci.yml runs two Node commands on Ubuntu/Node 20: node tools/ci/syntax_check.js and node tools/ci/check_root.js. It parses top-level game/js/plugins/*.js and tools/**/*.js except the exclusions, and rejects disallowed root .js/.png/.zip files. It does not execute plugin logic, tools' behavioral tests, tools/ops/run_gate.js, run_tests.bat/NW.js, controlled seed/year acceptance, RMMZ F5/F8, asset/data correctness, WBS/claim invariants, or merge_gate. It also does not syntax-check game/js/sim/**, game/js/plugins.js or JSON. These limits should be explicit; they are not proof that the scoped syntax/root-hygiene job is broken in every respect. The executable-fixture omission above is the demonstrated false negative within its promised scope. Protected game/js/libs/ remains intentionally untouched.

## Checks actually run

- node tools/ci/syntax_check.js: 1039 files checked (71 plugins, 968 tools), 0 failed; 53 fixture JS files skipped; exit 0.
- node tools/ci/check_root.js: 0 disallowed files; exit 0.
- Failure probes: valid input exit 0; malformed ordinary tool exit 1; malformed executable fixture incorrectly exit 0; disallowed root TEST_bad.PNG exit 1.
- git diff --check 565dc5ae 2ffa0d3a: exit 2, finding above.
- Native run, 21:47:10-21:50:12 CT: source 2ffa0d3a game snapshot, sole fixture override DEUS_World.parameters.Seed=1920951434, DEUS_TEST_YEAR=500, no suite argument or Z override. From setup worktree: .\run_tests.bat --game C:\Users\snewt\.deus_worktrees\org-setup\scratchpad\org-setup-review\snapshot_2ffa0d3a\game.

```text
HARNESS watchdog: whole run took longer than 180 s
HARNESS current scene: Scene_Map
RESULT: 152 passed, 25 failed (exit 2)
```

The native result is red/incomplete: 14 suites entered; stopped during jobs after jobs.equip_clothes. It is not CI success and not a new regression attribution to docs/CI code. Source 2ffa0d3a has the unfixed runtime inherited from 565dc5ae. A fresh controlled baseline on 565dc5ae returned 157/25, stopped five passes later in jobs. Dynamic assertions and the global wall-clock watchdog prevent comparing raw totals as a fixed suite size. No timeout/assertion changes were made.

The 25 native failures, copied from the actual result through RESULT:
- ecology.renewable_timer
- ecology.native_regrow_single
- colonists.colonists_exist
- world.path_blocked_fast
- world.path_gives_up_when_crowded
- world.faces_eight_ways
- world.no_path_is_true
- worldgen.rivers_count
- worldgen.kit_per_area
- worldgen.kit_covers_plan
- worldgen.kit_fair
- worldgen.suite_completed
- biomes.ocean_rim
- biomes.objects_dense
- biomes.kit_present
- biomes.camps_cleared
- tiles.tileset_names
- history.generated_with_world
- history.suite_completed
- objects.apply_chop
- objects.perf
- objects.perf_dense
- items.images_exist
- items.find_sorted
- jobs.travel_and_work

Raw evidence: scratchpad/org-setup-review/native_snapshot_2ffa0d3a/{run.txt,stdout.txt,stderr.txt,results.txt}. Three contact sheets were opened, covering every capture. They show the unfixed two-colonist start beside the banner, rain/grass/trees, a second crowded history start, path-test walls, and rock-filled seam views. These are native harness captures, not editor F5/F8 or stable-playability proof. No Deus laptop verdict has been issued.

## Requested HANDOFF template

Codex wrote docs/ops/HANDOFF_TEMPLATE.md after this review. It records checkpoint/base SHA, exact acceptance criteria, stopped-process evidence, current/untested work, native counts and failure names, seed/year, hazards and resume gates. It is new Codex-authored documentation and still needs a different-family review; this report does not self-certify it. The Owner's explicit SOP remains the authority.