# Why the ORG-0.2 native RESULT counts differ

Recorded 2026-10-03 CT from retained native output, run metadata, snapshot validation, and the cited source SHAs. This note is read-only analysis; it does not call any incomplete run green. A counted check below is a `PASS` or `FAIL` printed **before the first `RESULT:`** in that run's `results.txt`. A suite's entry is not proof that every assertion in it ran.

All five runs requested seed **1920951434**, year **500**, and no Z override. Each called the actual `run_tests.bat` with **no suite name**, so `DEUS_Test.js` selected its default suites (`suites.filter(s => Test.only ? ... : s.isDefault)`, old source line 217). The original and matched-comparison commands were `.\run_tests.bat` from separate disposable clone roots. F1 and G1 called `.\run_tests.bat --game <controlled snapshot/game>` from the ORG-0.2 lane; `--game` chose the game directory, not a different test suite. The old `DEUS_Test.js`, `tools/run_tests.js`, and `run_tests.bat` were unchanged across these SHAs; `git diff 565dc5ae..997528e2 -- game tools/run_tests.js run_tests.bat` shows only `DEUS_Colonists.js`, while `git diff 248fc691..d8b36c53` shows only `DEUS_WorldGen.js` under those paths. F1 and G1 snapshot validations compared all 4,347 game blobs to their stated SHAs and found only the disposable `plugins.js` Seed override. The original baseline report records that same override but does not retain an equivalent all-blob validation.

| Run and source | Counted RESULT | Suites entered before RESULT | Last counted check and stop |
|---|---:|---|---|
| Original controlled baseline, `565dc5ae` ([results](C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/lane-baseline/docs/baseline/evidence/565dc5ae_native_seed1920951434_year500.txt), [report](C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/lane-baseline/docs/baseline/BASELINE_565dc5ae.md)) | **118 pass / 19 fail = 137** | 12: smoke through partial objects | `objects.layer_in_tilemap`; whole-run 180 s watchdog, then RESULT at line 174 |
| Post-(a) F1, `248fc691` ([results](C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/org-0.2-worldgen-green/tasks/ORG-0.2/lane-worldgen-green/evidence/F1_248fc691_post_restart_r1/F1_results.txt), [run metadata](C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/org-0.2-worldgen-green/tasks/ORG-0.2/lane-worldgen-green/evidence/F1_248fc691_post_restart_r1/F1_run.txt), [snapshot check](C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/org-0.2-worldgen-green/tasks/ORG-0.2/lane-worldgen-green/evidence/F1_248fc691_post_restart_r1/F1_snapshot_validation.txt)) | **244 / 16 = 260** | 9: smoke through partial ground | `ground.diag_seam`; whole-run 180 s watchdog, RESULT at line 290 |
| Matched rerun, `565dc5ae` ([results](<C:/Users/snewt/.deus_worktrees/org-setup/scratchpad/org-setup-review/native_comparison_565dc5ae/results.txt>), [run metadata](<C:/Users/snewt/.deus_worktrees/org-setup/scratchpad/org-setup-review/native_comparison_565dc5ae/run.txt>)) | **157 / 25 = 182** | 14: smoke through partial jobs | `jobs.describe_text`; whole-run 180 s watchdog, RESULT at line 226 |
| Matched rerun, `997528e2` ([results](<C:/Users/snewt/.deus_worktrees/org-setup/scratchpad/org-setup-review/native_comparison_997528e2/results.txt>), [run metadata](<C:/Users/snewt/.deus_worktrees/org-setup/scratchpad/org-setup-review/native_comparison_997528e2/run.txt>)) | **224 / 15 = 239** | 7: smoke through partial biomes | `biomes.deterministic`; whole-run 180 s watchdog, RESULT at line 263 |
| Post-(c) G1 review, `d8b36c53` ([results](C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/org-0.2-worldgen-green/tasks/ORG-0.2/lane-worldgen-green/evidence/G1_reviewer_d8b36c53/G1_results.txt), [run metadata](C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/org-0.2-worldgen-green/tasks/ORG-0.2/lane-worldgen-green/evidence/G1_reviewer_d8b36c53/G1_run.txt), [snapshot check](C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/org-0.2-worldgen-green/tasks/ORG-0.2/lane-worldgen-green/evidence/G1_reviewer_d8b36c53/G1_snapshot_validation.txt)) | **259 / 16 = 275** | 10: smoke through partial factions | `factions.unmet_not_listed`; whole-run 180 s watchdog, RESULT at line 310 |

The different totals are **not different fixed suites, flags, or a different runner**. The default suite is open-ended, the smoke suite creates one `smoke.event_drawn.<name>` check for each visible named person (`DEUS_Test.js:310`), and the old watchdog truncates the run wherever 180 s elapses. `248fc691` fixes the `DEUS_Colonists.js:333` `factionId()` lazy-colony reentrancy that had aborted History materialization at `DEUS_History.js:536`; it does not edit the test harness. The baseline output has **two** `smoke.event_drawn` checks and `FAIL colonists.colonists_exist - 2 colonists present`. F1 has **145** `smoke.event_drawn` checks and `PASS colonists.colonists_exist - 145 colonists present`. Those are 143 additional counted smoke checks caused by different generated state, not 143 new test definitions.

The exact **137 → 260** check delta is `+143` smoke checks, `+4` net worldgen checks (F1 reached `kit_seeded`, `peaks_region_250`, `autotile_shapes`, `deterministic`, and `no_errors`, while the baseline's allocation error added `worldgen.suite_completed`), `−1` `ground.no_errors` not reached in F1, and `−23` baseline checks in later factions (17), history (2), and objects (4), which F1 never entered. Other common-suite check totals are unchanged. This accounts for **+123**, exactly `260 − 137`. The baseline's `history.suite_completed` and `worldgen.suite_completed` both report the allocation guard; F1 does not reach history before its watchdog, so F1 alone does not prove that history suite greened.

The same-SHA matched `565dc5ae` rerun reached farther than the original: partial objects had 17 checks instead of four (**+13**), then items counted 20 and jobs counted 12 (**+32**). That is exactly the **+45** from 137 to 182. The jobs output printed `PASS jobs.mine_built_wall` and `FAIL jobs.mine_subterranean_wall` **after** its RESULT; neither is in 157/25. They are late observations, not an extra counted pass and failure.

`997528e2` and F1 have the **same game tree**; the intervening commits changed docs/evidence, not runtime or tests. The matched `997528e2` run stopped one check before F1's end of biomes (`biomes.no_errors` did not run), and never entered F1's tiles (11 checks) or ground (9 checks): `260 − 1 − 11 − 9 = 239`. Statuses of some shared checks differ (for example the timed `ecology.bounded_work`), so the pass/fail split is not a count of repairs. Relative to the matched `565dc5ae` run, the 239 total includes the 143 extra smoke checks and four net extra worldgen checks, but loses one biomes check and 89 later checks from tiles, ground, factions, history, objects, items, and jobs: `182 + 143 + 4 − 1 − 89 = 239`.

G1 entered the same nine suites as F1 and additionally counted `ground.no_errors` (one) and 14 faction checks: **260 + 1 + 14 = 275**. Its changed `DEUS_WorldGen.js` supplies real river models to the existing river checks. Thus `rivers_count` changes FAIL→PASS, while the vacuous empty-list passes `river_not_through_start` and `river_continuous` change PASS→FAIL (G1 reports NaN distances and 465 breaks). The timed `ecology.bounded_work` changes FAIL→PASS (F1 21.745 ms against 20 ms, G1 10.260 ms). These status swaps leave both F1 and G1 at 16 counted failures; G1's +15 checks are not 15 repaired failures.

## Exactly 16 counted failures at each requested SHA

F1 `248fc691`, in output order before `RESULT`:

1. `ecology.renewable_timer`
2. `ecology.bounded_work`
3. `world.path_blocked_fast`
4. `world.path_gives_up_when_crowded`
5. `world.faces_eight_ways`
6. `world.no_path_is_true`
7. `worldgen.rivers_count`
8. `worldgen.kit_per_area`
9. `worldgen.kit_covers_plan`
10. `worldgen.kit_fair`
11. `worldgen.autotile_shapes`
12. `biomes.ocean_rim`
13. `biomes.objects_dense`
14. `biomes.kit_present`
15. `biomes.camps_cleared`
16. `tiles.tileset_names`

G1 `d8b36c53`, in output order before `RESULT`:

1. `ecology.renewable_timer`
2. `world.path_blocked_fast`
3. `world.path_gives_up_when_crowded`
4. `world.faces_eight_ways`
5. `world.no_path_is_true`
6. `worldgen.river_not_through_start`
7. `worldgen.river_continuous`
8. `worldgen.kit_per_area`
9. `worldgen.kit_covers_plan`
10. `worldgen.kit_fair`
11. `worldgen.autotile_shapes`
12. `biomes.ocean_rim`
13. `biomes.objects_dense`
14. `biomes.kit_present`
15. `biomes.camps_cleared`
16. `tiles.tileset_names`

## Which watchdog, which test, and its limit

For all five rows above, `DEUS_Test.js:234` at the old SHAs installed **one 180,000 ms timer for the whole harness run**, and `tools/run_tests.js:14,48-51` had a separate **240,000 ms runner kill** if NW.js had not exited. These five RESULT lines came from the harness's **180 s whole-run watchdog**, not the runner kill. The harness also allowed up to 180 s for the initial map-start wait (`DEUS_Test.js:213-214`); that is separate from the whole-run timer, not a 180 s allowance per test. F1 was in **ground** after `ground.diag_seam`; G1 was in **factions** after `factions.unmet_not_listed`. No named F1/G1 assertion itself timed out, and no `ground.suite_completed` or `factions.suite_completed` failure was counted. The watchdog ended the entire run with exit 2 and left all later suites untested.

The later `8e5ae028` watchdog change is a **different harness regime**, not a retroactive explanation of F1/G1. It makes each suite's budget **180,000 ms** (`DEUS_Test.js:236-267`); a timed-out suite gets a counted `<suite>.suite_completed` failure, late assertions print `LATE` and count nothing, and the next suite runs. Map-start remains 180,000 ms. The updated runner kills after **240,000 ms without `results.txt` progress** or a hard cap derived from `180 s map start + selected suite count × 180 s + 60 s grace` (`tools/run_tests.js:21-24,74-81` at `8e5ae028`), whichever applies. With 26 default suites, that formula is 4,920 s (82 min), not a claim that any run lasted that long. In later W5/W6 evidence, the specific timed-out assertion is `look.suite_completed`: the `look` suite exceeded its 180 s budget after `look.dismantle`; five later look checks were not counted. See [RUN_EVIDENCE.md](C:/Users/snewt/OneDrive/Desktop/UF/scratchpad/overnight-report/RUN_EVIDENCE.md) and [RUN_EVIDENCE.json](C:/Users/snewt/OneDrive/Desktop/UF/scratchpad/overnight-report/RUN_EVIDENCE.json) for those runs.

No old result is a complete default-suite pass. The failure lists above describe only checks reached before each RESULT; they cannot be treated as a fixed regression denominator.
