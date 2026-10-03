# Owner overnight dispatch, 2026-10-02 / 2026-10-03 CT

Owner instruction received while the PM session was active, for the approximately 23:15–07:00 CT run. This supplement supersedes the old serial-dispatch and watchdog/test-contract prohibitions only to the extent expressly authorized below. It opens no implementation outside ORG-0.2.

Claude at max effort is the sole runtime writer; Grok at xhigh reviews the exact stopped writer SHA. GPT at ultra performs read-only triage in `scratchpad/org-0.2/triage/` and cannot certify Claude's work. Main is protected: no commits, pushes or merges to main; no merges anywhere, force pushes, rebases, squashes or deletions. Normal pushes are authorized only to this lane's `task/org-0.2-worldgen-green` branch. Preserve all previous evidence.

## Ordered work

1. Split the watchdog per suite so the complete default suite list is exercised, retaining bounded failure detection and explicit timeout failures. Do not just remove all watchdogs or report partial coverage as green. The existing 180-second suite budget is the starting contract; make runner budgeting consistent with full-suite execution. Preserve all suite selections and other assertions. Explain the final runner and suite timeout behavior with evidence.
2. Apply the approved river-check contract described in `PROPOSAL_river_checks.md` option A: real hydrology/course/tile data, unchanged river count range and 14-cell start clearance, course-based continuity for source-to-mouth rivers. Fix the NaN start-clearance calculation. Do not fabricate a center for rows a river never crosses. Checks must fail on genuine missing or disconnected water; any gap in the proposed check must be reported rather than disguised. No unrelated threshold or fixture changes.
3. Run every default suite in full with the real `run_tests.bat` entry point on seed **1920951434**, year **500**, no Z override, using fresh controlled snapshots as in the brief. Paste every RESULT line, suite list, source SHA, start/end time CT, process exit, timeout and any unrun suite. The historical global-watchdog results are incomplete comparisons, not complete acceptance.
4. Work through the resulting real failure list, one cause/fix per commit, with a native run after each. Preserve the existing (a)–(f) ordering where applicable. After two unsuccessful fixes to the same defect, park that defect with evidence/attempt notes and move to the next. Do not wait on the sleeping Owner. Frozen faction/society expansion, art and out-of-scope changes remain parked.

The Owner's overnight wording is the authorization for these watchdog and river-contract changes; earlier proposals are not independently an approval. Other suspected wrong tests still require an Owner decision and are parked. A loaded but phase-frozen system may be diagnosed read-only; do not expand faction/society implementation to clear a test.

PM gate-budget alignment, 2026-10-02 23:34 CT: the native gate's enclosing `lane.json` timeout is 5,400 seconds instead of 300. The inspected default list contains 26 suites; 26 x 180 seconds is 4,680 seconds, leaving 720 seconds for boot and teardown. This changes the enclosing full-run allowance, not any assertion or per-suite 180-second watchdog. The writer must still implement and prove bounded per-suite handling and the matching native runner budget. The separate general `run_gate.js` entry remains unchanged. No merge is authorized.

## Evidence and handoff

Use `tasks/ORG-0.2/lane-worldgen-green/evidence/` for committed run evidence and `scratchpad/org-0.2/` for working notes and triage. Update attempt counts, remaining failures, and `scratchpad/org-0.2/HANDOFF.md` at each returned checkpoint. No success or lane closure without actual pasted results, independent review and Deus laptop confirmation. Read the existing fallback SOP in `docs/ops/USAGE.md`; a usage limit requires stopping, a WIP checkpoint/push, logs, handoff and PM reassignment, never concurrent writers.

Native tests are serialized across lanes. Before launching, confirm no other lane's `nw.exe` or test runner is live. ORG-0.3's audit worker may finish its already-started run; do not kill it. This priority lane owns subsequent native runs until it returns to PM. PM coordinates any later slots.

The PM will prepare `docs/ops/MORNING_REPORT.md` at 07:00 CT, including every run result, provider usage that can actually be measured, parked items, and game-translation status. Unknown usage remains unknown; no estimate of subscription capacity is invented.
