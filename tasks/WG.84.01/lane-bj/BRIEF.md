# Lane BJ Brief: WG.84.01 Multi-Seed Procedural WorldGen QA

**NO ART OR AUDIO WORK.**

**Lane:** lane-bj | **Task:** WG.84.01 | **Branch:** task/lane-bj | **Writer:** codex (gpt-6-astra ultra) | **Reviewer:** grok | **Base:** main `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0`

## WBS row
> Multi-Seed Procedural WorldGen QA. Headless audit over 20 randomized seeds checking stability, viability, and errors.

## Scope
Create a deterministic, bounded, headless audit that runs the real registered procedural worldgen path over exactly 20 distinct seeds. For each seed, record stage completion, reproducibility, fatal/runtime errors, and concrete viability invariants derived from existing world contracts. Fail with the seed and stage. Do not modify production plugins or data.

The harness must reject a real defect through targeted provocations or mutants. It must not pass by scanning source strings, stubbing away world generation, replacing the production path with fixtures, swallowing exceptions, or reducing the seed count. Document the entry point, invariants, time/memory observations, and limitations in REPORT.md.

## Allowed paths
- `tools/worldgen_qa/**`
- `tasks/WG.84.01/**`

## Gates
- `node tools/worldgen_qa/test_multiseed_worldgen_qa.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio. Never touch `art/**`, `game/img/**`, or audio paths.
2. Write only in allowedPaths. Record any required out-of-scope production fix as an escalation in this task folder.
3. Do not answer open owner questions or change WBS/status, owner decisions, provider status, plugin registration, ops/governance files, or another lane.
4. Run all gates and provocations in the foreground. Do not weaken existing checks. Commit all work on this branch; do not merge or push.
5. Independent Grok review is required after PM reruns the recorded gates.