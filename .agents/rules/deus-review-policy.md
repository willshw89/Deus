---
trigger: always_on
description: "DEUS zero self-certification, independent family review, and fail-closed integration."
---

Stub (2026-09-29): the rules live in `AGENTS.md` (Rules 18 and 19; Definition of Done; Commit and claim rules). Read `AGENTS.md` first.
On trigger, Antigravity must hear: nobody approves their own family's work, and a same-family subagent is not an independent reviewer; the reviewer records provider, model, reviewed SHA, commands and real exit codes before any DONE edit; gate tests run on the writer tip in a fresh clone before review (DEC-035).
`tools/governance/merge_gate.js` (`--dry-run`, then the real run, `git merge --no-ff`) is the only door into `main`; a refusal is a blocker for the PM, never permission to merge by hand, weaken a check, or delete local files.
