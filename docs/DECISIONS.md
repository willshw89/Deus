# DEUS decisions log

Owner rulings, newest first. Each entry: date, ruling, scope. Earlier decisions (DEC-001 to DEC-089) remain in `docs/OWNER_DECISIONS.md`; where they conflict with an entry here, this file wins.
Add an entry only for an explicit Owner ruling. Agents do not record their own proposals as decisions.

## 2026-10-02

| # | Ruling |
|---|---|
| D-2026-10-02-1 | **Codex is PM.** Codex (strongest OpenAI single agent) writes briefs, assigns writers and reviewers, and tracks the WBS. The Owner approves scope, design decisions and merges. |
| D-2026-10-02-2 | **WBS-ORG replaces the earlier pillar-merge plan.** `docs/WBS_ORG.md` is the plan of record for repo organization and the pillar merge. |
| D-2026-10-02-3 | **Baseline must be green before the pillar merge.** ORG-0.2 must pass before ORG-4.1/4.2/4.3. The expected-red list from ORG-0.1 only gates CI, hygiene and docs lanes (ORG-1, ORG-2, ORG-3); it never excuses failures in a game-logic lane. |
| D-2026-10-02-4 | **After pillars-v1, code is edited in small source modules** under `game/js/src/<pillar>/`, bundled into the pillar plugin files by a build step (`tools/build/merge_pillars.js`, verified by `tools/build/check_pillars.js`). Bundled files are never hand-edited. |
| D-2026-10-02-5 | **Race bonuses come from SRD 5.1 only.** No invented numbers. |
| D-2026-10-02-6 | **Professions replace SRD backgrounds.** |
| D-2026-10-02-7 | **Current sole priority: world loading green** (WBS-ORG ORG-0.1, ORG-0.2, ORG-1.1, ORG-1.2, ORG-4.2). **WBS-SIM and WBS-SPLIT are parked.** |
