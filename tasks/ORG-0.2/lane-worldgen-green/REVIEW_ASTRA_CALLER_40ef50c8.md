# ORG-0.2 independent Astra review: save-caller delta

**Review date:** 2026-10-03, CT (UTC-05:00). Source/evidence inspection began at approximately 06:29 CT.

**NARROW DELTA VERDICT: PASS. Overall ORG-0.2 acceptance: FAIL. Deus: NOT CHECKED.**

This verdict covers only Claude's added save preparation call and its changed system-documentation row. It is not a lane closure, merge authorization, performance acceptance, or review of a Codex/GPT report or earlier Codex review.

## Reviewer, independence and source boundary

- Reviewer: OpenAI Codex, **GPT-6-astra, ultra reasoning effort**, in the specifically assigned strongest-model source-review session. No additional model, provider, subagent or native runtime was launched by this reviewer.
- Writer: Claude Fable 5.1 at max effort, as assigned. The inspected Git record names `deus-claude <deus-claude@local.invalid>` as author and committer and includes the Claude Fable 5.1 co-author trailer. This reviewer is independent of the Claude writer; it is not independent of the GPT family and supplies no certification of GPT-authored documents.
- Runtime under review: `40ef50c8b79f1e26eeb03e5e2e4222af39d1488b`, compared with `d5d641bfc83da15bc21a80c8abd115c8aa53cecb` **only for `game/` and `docs/systems/`**. Intervening evidence and handoff commits are outside the source verdict.
- Diff: four added lines in `game/js/plugins/DEUS_Test.js:956-959` (three comment lines and one guarded call), plus the `perf_overlay` row in `docs/systems/DEUS_Test.md:54`. No assertion, threshold, timeout, save-isolation condition or engine-core change occurs in this delta.
- Worktree: `C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/org-0.2-worldgen-green`; branch `task/org-0.2-worldgen-green`; initial branch tip `8b7b6247eac8015f2db18939adc3716a15b97630`.
- Authority read: canonical `AGENTS.md` and its worktree difference, the five persistent `.agents/rules/deus-*.md` rules, STATUS, the latest A13 audit and relevant prior findings, SLICES, relevant VISION/OWNER_DECISIONS/CANONICAL_ROLES material, ENGINE_RULES, the lane manifest/brief, and the current MODEL FALLBACK / CROSSLOAD SOP. The current assignment authorizes this additional review artifact only; no manifest, STATUS, HANDOFF, REPORT, USAGE or runtime edit is made.

## Source findings

**No blocking defect found in the narrow delta.** The added call repairs the caller's omission of the normal save preparation step; it does not conceal the load failure or alter the protected engine.

1. **The failure mechanism and repair match the stock lifecycle.** `Game_System.initialize` sets `_bgmOnSave` and `_bgsOnSave` to null (`rmmz_objects.js:189-190`). `onBeforeSave` records both audio objects, save count, version and frame count (`351-356`). `DataManager.saveGame` immediately builds save contents and does not itself call that hook (`rmmz_managers.js:345-352`). After loading, `onAfterLoad` passes the saved audio objects to `playBgm` and `playBgs` (`rmmz_objects.js:359-362`); `playBgm` reads `bgm.name` (`rmmz_managers.js:1169`). `AudioManager.saveBgm/saveBgs` return an empty, non-null audio object even when no audio is playing (`1415-1446`). Therefore the missing preparation call explains the null-name exception, and placing it immediately before `saveGame` supplies the required state. Both `Scene_Save.executeSave` and `Scene_Base.executeAutosave` already use that order (`rmmz_scenes.js:2375-2379`, `235-239`). The existing Projects and Levels test callers also do so (`DEUS_Projects.js:1763`, `DEUS_Levels.js:6737-6742`).

2. **The guard still dominates the new call and the write.** `DEUS_Test.js:946-954` requires filesystem/save-directory APIs, `DEUS_TEST_DISPOSABLE_SAVES === "1"`, an empty save directory, and no existing slot 1. The new call sits inside `if (!refused)` and the existing `try`, immediately before the awaited save. A refusal skips both preparation and save; a preparation exception reaches the existing catch without executing the save. The directory check covers metadata and backups by rejecting every entry. The guard is unchanged from `d5d641bf`. This is a guard on this fixture, not a security boundary or a global prevention of other engine/autosave writes: the opt-in declares disposability, and stock `StorageManager.saveToLocalFile` has its own filesystem operations (`rmmz_managers.js:644-665`). No claim that arbitrary paths or concurrent external writers are safe is made.

3. **The two load assertions remain distinct and can fail.** `load_data_recorded` still requires permitted execution, successful save/load and a positive recorded data-load duration (`DEUS_Test.js:972-974`). `load_to_map_recorded` still requires a non-null later map-render endpoint greater than the data endpoint (`975-976`). The unchanged Core instrumentation records that endpoint only after an actual `app.render` call with a started `Scene_Map` different from both the entry and resolve scenes (`DEUS_Core.js:647-663`, `689-701`). Its clock is `performance.now()` (`579`), so restoring `Graphics.frameCount` in `onAfterLoad` does not fabricate a shorter or positive load duration. The change does not assign either metric or force a check to pass. The existing ticker/pause cleanup remains in `finally` (`DEUS_Test.js:977-980`).

4. **The scope is a harness lifecycle correction.** `perf_overlay` remains non-default (`DEUS_Test.js:984`), with unchanged manual map transition and wait. The hook's save-count/version/frame/audio updates are the normal lifecycle's effects in the declared disposable fixture. No new gameplay implementation, save schema or engine-core patch is introduced. The changed documentation row names the two existing load checks, the preparation hook and guard; it does not justify upgrading lane acceptance. Its references to prior transition failures are historical, not a claim that P4/C3 still throw.

The checks establish timing endpoints, not complete persisted-world equality, all menu-load behavior or a general no-exception guarantee. In particular the existing to-map predicate does not separately require `loadErr` to be empty; a later error after a metric has been recorded is not ruled out by the predicate alone. The inspected C3 and P4 result details explicitly report a completed transition. This existing coverage limit is not changed by the four-line repair and is not a reason to certify broader save/load behavior.

## Actual inspections and evidence

**No new test was run in this review.** No `run_tests.bat`, Node test, native Playtest, gate, mutation or provider launch was executed. The work consisted of Git diff/history/hash checks, source and retained evidence reads, and opening one existing PNG. Existing execution results below are attributed to their recorded runs rather than to this reviewer.

Commands used included `git show --format=fuller --stat 40ef50c8`, the scoped `git diff d5d641bf 40ef50c8 -- game/ docs/systems/`, `git diff --name-only 40ef50c8 -- game/`, `git rev-parse <sha>:<path>`, `git hash-object -- <path>`, `rg` and numbered PowerShell source reads. The only game file changed between the source pair is `DEUS_Test.js`. The working-tree game diff against `40ef50c8` was empty.

I independently compared the reviewed commit's blob IDs with both the current worktree files and the retained C3 snapshot files. All five pairs matched:

| File | Blob at runtime `40ef50c8`, current worktree and C3 snapshot |
|---|---|
| `game/js/plugins/DEUS_Test.js` | `81aa17b2ec9bc60409afd4e809fd8b8b703ba4e4` |
| `game/js/plugins/DEUS_Core.js` | `995c1d58ddaeaf099afae6aaddc6c3fc7a38d664` |
| `game/js/rmmz_objects.js` | `09dc869eb4e8c8343998405e7eca6391c064199f` |
| `game/js/rmmz_scenes.js` | `0e861e0807198754198f86d438508708b554f6d8` |
| `game/js/rmmz_managers.js` | `13d7a90f5fa09b1997976f5b2b507516f127dad4` |

Evidence paths in the table are relative to `tasks/ORG-0.2/lane-worldgen-green/evidence/`.

| Existing evidence inspected | Source and recorded outcome | What it establishes here |
|---|---|---|
| `P3_d5d641bf_perf_overlay/P3_results.txt` | Prior runtime `d5d641bf`: 12 passed / 1 failed, exit 1; data load 347.23 ms, to-map null-name exception | Actual prior failure of the unchanged endpoint check; consistent with the source mechanism |
| `M5_d5d641bf_saveguard/M5_results.txt` and before/after save hash files | Prior runtime: intentional 11/2 refusal with three pre-existing files; inspected before/after hash text identical | Historical populated-directory negative evidence for the unchanged guard; not a new run on `40ef50c8` |
| `M6_d5d641bf_saveguard_noOptIn/M6_results.txt` | Prior runtime: intentional 11/2 refusal without opt-in | Historical absent-opt-in negative evidence; not rerun |
| `P4_40ef50c8_perf_overlay/P4_run.txt`, `P4_results.txt` | Writer run 2026-10-03 05:25:24-05:26:11 CT, runtime `40ef50c8`: 13/0, exit 0; data 442.77 ms, to-map 6571.35 ms | Positive writer evidence, kept distinct from independent C3 |
| `CODEX_C3_40ef50c8_0600/C3_prelaunch.txt`, `C3_run.txt`, `C3_snapshot_validation.txt`, `C3_results.txt` | Existing independent-of-Claude Codex run 2026-10-03 05:59:43-06:00:30 CT: 13/0, exit 0; data 348.98 ms, to-map 6572.25 ms | Focused native `run_tests.bat perf_overlay --game <snapshot>` evidence on the source above; not executed by this Astra session |
| `W16_40ef50c8_full_perf_on/W16_run.txt`, `W16_results.txt` | Writer full default run 2026-10-03 05:26:50-05:39:37 CT: 469/60, exit 1 | Overall lane remains red; all 26 default suites entered, but combat and faction_menus hit their local waits and omit later checks; `perf_overlay` is not a default suite |
| `CODEX_C4_40ef50c8_0602/C4_profile_metadata.json` | Separate DevTools supplement, same declared source; profile window 2026-10-03 06:03:48.138-06:03:52.383 CT, eventual focused result 13/0 | Kept separate from the required C3 native entry-point evidence; no profile/performance conclusion is certified here |

C3's prelaunch record says save and test_output were absent. Its recorded full-snapshot validation lists 4,347 game blobs with only the authorized `plugins.js` seed override differing. I independently rehashed only the five listed files, not all 4,347. C3 records seed 1920951434, requested/actual year 500, retained snapshot/profile, perf enabled before boot and disposable-save opt-in. The current handoff's no-Z-override requirement was not independently rerun.

Existing screenshot opened in this review: `CODEX_C3_40ef50c8_0600/C3_perf_overlay.overlay.png`. It shows a dense grid of humanoid sprites with green bars on rainy grass, bushes, boulders and a red/gold banner; Ground, 1x Speed and 1.0x zoom controls are visible. The overlay visibly reports load about 349.0 ms data and 6572.3 ms to map. This supports that a map and load readout were captured; the identity of the newly started map comes from the source predicate and run output, not from the still image alone. No screenshot was produced or altered by this reviewer.

Trimmed real output read from C3:

```text
PASS perf_overlay.load_to_map_recorded - map transition after the load completed; load-to-first-map-draw 6572.25 ms (this suite's own SceneManager.goto(Scene_Map) transition; a data-only load without a transition is not covered)
RESULT: 13 passed, 0 failed (exit 0)
```

Trimmed real output read from W16:

```text
FAIL combat.suite_completed - timed out after 8000 ms waiting for the action bar cooldown to complete [at chrome-extension://njgcanhfjdabfmnlmpmdedalocpafnhl/js/plugins/DEUS_Test.js:137:57]
FAIL faction_menus.suite_completed - timed out after 5000 ms waiting for UF_Menu_deus and UF_Faces_deus_1 assets ready [at chrome-extension://njgcanhfjdabfmnlmpmdedalocpafnhl/js/plugins/DEUS_Test.js:137:57]
RESULT: 469 passed, 60 failed (exit 1)
```

## GAME TRANSLATION: this delta only

**Class C, foundational/indirect assurance. CONSUMED BY GAME SYSTEMS:** the test invokes stock `Game_System` and `DataManager` persistence and the existing `Scene_Map`/Core perf render consumer.

| Required field | Narrow trace |
|---|---|
| Player / World Effect | The focused diagnostic can save and return to a rendered map without its own missing-audio-preparation exception. No new world feature is provided. |
| Trigger | Explicit non-default `perf_overlay` run with perf enabled, disposable opt-in and an empty save directory. |
| Runtime Authority | `DEUS_Test.js:959` calls the existing `Game_System.onBeforeSave`; stock save/load remains authoritative. |
| Simulation Path | Existing game state plus prepared `Game_System` audio/frame/version fields is serialized and loaded. World-state equality is not proved by this delta. |
| Engine Bridge | `DataManager.loadGame` -> explicit `SceneManager.goto(Scene_Map)` -> `onAfterLoad` -> started-map wait -> Core's first-map-render endpoint. |
| Visible Result | Existing C3 screenshot contains the map and populated load readout, as described above. |
| Persistence | Existing RMMZ format and disposable slot 1; no schema change. The normal preparation hook populates its normal fields. |
| Failure Without This Lane | Prior P3 resolves data load but throws on null audio during `onAfterLoad`, leaving the to-map metric absent. |
| Automated Proof | P3 negative and P4/C3 positive retained native outputs; no new automated execution here. |
| In-Game Proof | Existing C3 harness capture opened; no new interactive/editor F5/F8 or Deus verification. |

Status for this bounded correction: **Simulation implemented: NO new simulation change. Engine bridge implemented: YES**, existing save/load/map bridge with its caller preparation corrected. **Presentation implemented: NO new presentation change**; existing overlay observed in C3. **Input/player interaction implemented: NO new input. Save/load implemented: YES**, this caller uses the existing lifecycle; complete persistence correctness remains unverified. **Playable verification performed: NO by this reviewer**; existing focused native harness evidence inspected, Owner/editor and Deus acceptance absent.

## Not done / known problems and handoff

- Overall lane acceptance stays **FAIL**, with W16's 60 failures and incomplete assertion coverage in the two locally aborted suites. No merge gate was run here, and no acceptance or merge is authorized.
- Camp-spacing and same-type equipment issues remain the prior Grok findings; their two-attempt stops remain in force. They were not repaired or re-reviewed as part of this delta. Grok's null-BGM finding was used as a lead and independently checked against source; this narrow review does not rewrite or certify that prior full review.
- No new no-opt-in, populated-directory, malformed-save, concurrent-save, menu-load, cold-restart, frame-budget or complete world-state round-trip test was performed. Historical guard negatives remain explicitly historical.
- No source, engine, manifest, existing evidence, runtime log, HANDOFF, REPORT or USAGE file was edited. No process was started/stopped for testing, no cleanup/move/delete occurred, and no main/merge/rebase/force action was taken. Only this unique review artifact is written and staged for a normal task-branch commit/push under this reviewer's own per-command Codex identity.
- RMMZ F5/F8 and Deus checks remain outstanding; no editor action was taken. The narrow 13/0 focused result cannot supply the required all-green lane result or Deus confirmation.

**Final disposition: PASS for Claude's `d5d641bf -> 40ef50c8` save-caller delta only; overall ORG-0.2 FAIL; Deus NOT CHECKED. Runtime source remains `40ef50c8b79f1e26eeb03e5e2e4222af39d1488b`.**
