# ORG-0.4 - out-of-lane failure handoff

Owner authority: 2026-10-03 08:33 CT. Status: triage filed; no runtime repair started. Codex/GPT PM owns this document. Runtime writer, exact file claims and cross-family reviewer must be assigned before repairs; they may not overlap ORG-0.2's active files. Deus verifies. No merge or main push is authorized. DEC-037 remains in force outside the Owner's explicit rulings.

## Baseline and acceptance

Controlled seed 1920951434, age 500, 1x1 grid of 256x256 tiles. W16 source `40ef50c8b79f1e26eeb03e5e2e4222af39d1488b`: **RESULT: 469 passed, 60 failed (exit 1)**. W17 source `89914c0fbe4602163a8c6ac2847f9e7b163306e9`: **RESULT: 462 passed, 66 failed (exit 1)**, run 2026-10-03 08:48:22-09:02:41 CT. Both entered 26 default suites. W16 has 529 unique named checks and W17 has 528; neither duplicates names.

ORG-0.2 green requires all in-lane checks passing and no out-of-lane PASS-to-FAIL or omitted check versus W16. This log transfers 29 inherited out-of-lane failures for separate work; it does not count them as passes, waive new regressions or permit unrelated fixes in ORG-0.2. The eight additional W17 failures below are unresolved regression concerns, not accepted baseline additions.

## Named failures

| Check | W16 | W17 |
|---|---|---|
| `jobs.travel_and_work` | FAIL | FAIL |
| `jobs.hunt` | FAIL | FAIL |
| `jobs.mine_built_wall` | FAIL | FAIL |
| `jobs.mine_subterranean_wall` | FAIL | FAIL |
| `wildlife.by_biome` | FAIL | FAIL |
| `wildlife.start_kit_herd` | FAIL | FAIL |
| `wildlife.kit_every_area` | FAIL | FAIL |
| `wildlife.none_too_near_start` | FAIL | FAIL |
| `wildlife.wanders` | FAIL | FAIL |
| `wildlife.flees_hunter` | FAIL | FAIL |
| `wildlife.saved` | FAIL | FAIL |
| `wildlife.perf` | FAIL | FAIL |
| `combat.suite_completed` | FAIL | FAIL |
| `timespeed.no_speedup_while_paused` | FAIL | FAIL |
| `look.asset_line_names_status` | FAIL | FAIL |
| `look.menu_creates_designation` | FAIL | FAIL |
| `look.menu_precedence` | FAIL | FAIL |
| `look.build_submenu` | FAIL | FAIL |
| `look.dig_and_fish` | FAIL | FAIL |
| `look.designation_done_by_colonist` | FAIL | FAIL |
| `look.hunt_and_haul_options` | FAIL | FAIL |
| `look.saved` | FAIL | FAIL |
| `environment.diurnal_cycle` | FAIL | FAIL |
| `faction_menus.factions_list_12` | FAIL | FAIL |
| `faction_menus.suite_completed` | FAIL | FAIL |
| `jobs.tool_speeds_work` | FAIL | PASS |
| `stance.marker_follows` | FAIL | PASS |
| `look.cancel_designation` | FAIL | PASS |
| `daynight.wall_blocks_glowing_light` | FAIL | OMITTED, not a pass |
| `factions.contact_reveals_faction` | PASS | FAIL: regression concern |
| `jobs.build` | PASS | FAIL: regression concern |
| `jobs.craft_at_workplace` | PASS | FAIL: regression concern |
| `jobs.drink_and_eat` | PASS | FAIL: regression concern |
| `wildlife.drawn_and_tinted` | PASS | FAIL: regression concern |
| `timespeed.speeds_up` | PASS | FAIL: regression concern |
| `look.window_follows_mouse` | PASS | FAIL: regression concern |
| `environment.hypothermia_recovering` | PASS | FAIL: regression concern |

Among the 29 inherited failures, W17 still fails 25, passes three and omits one. Combat's 8-second and FactionMenus' 5-second local suite-completion timeouts persist and omit later assertions. The day/night check only runs when its glow layer and a visible campfire exist; the W17 result does not identify the failed precondition. Its disappearance is not a pass.

W17 ran with possible independent native-test overlap. No evidence establishes contention as the cause of any status change. The only game-source delta from W16 to W17 is the approved autotile test oracle; a fresh quiet full run and named-check comparison are required before a no-regression claim.

## Scope corrections and parked check

- `objects.perf_dense` remains in ORG-0.2: its assertion lives in the already-authorized `DEUS_Objects.js`. The older W16 failure table's out-of-lane label is stale.
- `factions.areas` is now narrowly in ORG-0.2 for the Owner-approved camp/home/40-tile-spacing contract. Unrelated faction contact behavior remains here.
- The ORG-0.2 `DEUS_FactionMenus.js` exception covers only the year-500 setup default and its default test. The two existing menu failures above remain here.
- Distinct same-type items in both hands are parked by the Owner. Preserve a visible skipped/expected-failure record linked to this lane when the ORG-0.2 fixture is updated; never replace it with unconditional success. No repair has been made in this filing.

## Evidence and next work

The ORG-0.2 branch contains `tasks/ORG-0.2/lane-worldgen-green/evidence/W16_40ef50c8_full_perf_on/W16_results.txt` and its historical `W16_failures.md`. W17 raw output is **local evidence, not committed**, under ignored `scratchpad/org-0.2/diag/`. Authority is recorded in `tasks/ORG-0.2/lane-worldgen-green/OWNER_20261003_0833.md` and the current lane manifest. Those cross-branch references are provenance, not files added to this docs branch.

First triage separates missing-fixture/camp knock-ons, timing instability and independent defects. Preserve W16 check names, report omissions, and record new full-run evidence after each authorized repair. Cross-family review and Deus confirmation remain required before closure. No native test, screenshot, performance measurement or gameplay claim is supplied by this document-only commit.
