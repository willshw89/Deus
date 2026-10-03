# ORG-0.3 cross-family review

Opened 2026-10-02 23:35 CT; completed 2026-10-03 00:00:30 CT.

**VERDICT: FAIL** on the documentation deliverable at the reviewed tip. This is a Codex/GPT-family review of Grok's audit, not a Deus laptop verdict or merge approval.

| Field | Value |
|---|---|
| Lane / branch | ORG-0.3 / `task/lane-plugin-audit` |
| Writer | Grok 4.7 xhigh, commits `566eb5ecc0c8e2b1b989ba1c8f84d4c2bb75af69` and `7a7bf3d4868fb8c4c7e8c714b0fae68e5f3c9da7` |
| Reviewer | Codex/GPT family |
| Exact reviewed HEAD | `7a7bf3d4868fb8c4c7e8c714b0fae68e5f3c9da7` |
| Audited game source | `86ec44c2055f766d17448c8d8f38f800b559059c`, game bytes inherited from `565dc5aead7e068230528d573c395ea21ed5cf5d` |
| Deus verdict | Not checked |

## Blocking findings in the audit deliverable

1. **BLOCKER — the final static gate fails, contrary to the report.** I ran the manifest's exact `git diff --check 565dc5aead7e068230528d573c395ea21ed5cf5d HEAD` at the reviewed HEAD. It exited **2** and produced **212 whitespace diagnostics** (424 output lines including quoted offending lines). Files with diagnostics: `evidence/attempt1/run_meta.txt` 8, `run_tests_stderr.txt` 9, `run_tests_stdout.txt` 72, `evidence/static/hashes_before.txt` 72, and `scan_summary.txt` 51. [PLUGIN_AUDIT.md](../../../docs/architecture/PLUGIN_AUDIT.md) lines 5 and 385 and [REPORT.md](REPORT.md) line 65 claim exit 0. Correct the committed evidence formatting and all three claims, then run the manifest command on the new final tip. Keep the raw diagnostic content accessible; do not silently delete evidence to make the check pass.
2. **BLOCKER — the requested per-file caller inventory is incomplete.** [BRIEF.md](BRIEF.md) step 2 and its acceptance paragraph require each file's globals/classes/exports, engine patches, callbacks/listeners, and **named consumers with source locations**. The 71-row table in the audit gives coupling totals, a patch count, and exports, but no per-file patch/callback names or named callers. `evidence/static/scan_summary.txt` gives some definitions and patch sites; its `consumers` field is largely filename-string matches and reports `code=0` for the files examined, so it cannot supply the required symbol-level callers. The audit itself acknowledges this limitation at lines 50 and 98 of REPORT. Add a compact source-cited caller/patch inventory or explicitly resolve each unknown after a bounded source search. Keep the current uncertainty labels where dynamic use cannot be proved.

## Verified findings and limits

- Independently parsed `game/js/plugins.js` and listed `game/js/plugins/*.js`: **49 entries, 48 unique names, 49 ON, 71 files, 23 unlisted, 0 listed-missing**. `DEUS_StructuralPhysics` is entered twice. Local MZ `PluginManager.setup` at `game/js/rmmz_managers.js:3109-3117` deduplicates that name; `loadScript` at `:3128-3137` injects the script. `DEUS_Core.js:91-132` separately names 11 companions and attempts both `require` and script injection. The audit correctly distinguishes these paths.
- Opened the short flagged plugin sources. `DEUS_Spawners.js` hard-codes z and biome and only logs the promised geology/spawn work; `DEUS_Lighting.js` sets a white placeholder tint but patches real render methods; `DEUS_StructuralPhysics.js` has `hasAnchor() => false` and real update patches; `DEUS_CellularFluids.js` exports `UF.Fluids`, distinct from the loaded `UF.Fluid`. The recommendations are framed as future Owner decisions, and no plugin change is present in this diff.
- `git diff --name-only 565dc5aead7e068230528d573c395ea21ed5cf5d HEAD -- game` returned no paths. I opened `ownership.owned_bed.png` and saw the Straw bed label, 0.5x HUD, and diagonal white streaks; `world.eight_way.png` showed a dark striped -5 level and HUD, not an eight-direction motion proof. I did not attribute those streaks or stripes to a specific plugin.
- Independently counted the committed partial `evidence/attempt1/results.txt`: **48 PASS, 6 FAIL, five suites started, no RESULT line**. `run_meta.txt` records seed **1920951434**, year **500**, process exit **2**. The runner stderr reports an NW exit after 120.0 s with code 0 before harness completion. `DEUS_Test.js:183-184,234` would write a RESULT before its 180 s watchdog exit; the cause of the early exit remains unknown. I did not rerun NW.js or inspect the other nine PNGs.
- The brief requested before/after native runs, but [REPORT.md](REPORT.md) line 75 correctly discloses only one incomplete run. Its line 105 still says native green is required for this docs-only audit. Under the Owner's later expected-red clarification for documentation and CI lanes, inherited game failures are **reported, not a demand to repair ORG-0.2 inside ORG-0.3**. Update that acceptance wording and leave the missing comparison explicit. The existing 72-file before/after hash comparison is useful evidence that the audited plugin bytes did not change; it is not a second native RESULT.

## Checks performed

Read `AGENTS.md`, the governance/review/natural-world/routing/translation rules, lane brief and manifest, both Grok commits, audit, report, source files cited above, static scan excerpt, native result/meta/stderr, and two PNGs. Ran read-only Git status/log/diff commands, an independent PowerShell plugin-list/file count, targeted source searches, `git diff --name-only ... -- game`, and the exact `git diff --check` gate. No code, plugin, test, or harness changes were made; no native process was started. Re-review the corrected writer tip before changing this verdict. Origin remains behind the reviewed local tip; no merge or Deus confirmation is claimed.
