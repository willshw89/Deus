# DEUS decisions log

Owner rulings, newest first. Each entry: date, ruling, scope. Earlier decisions (DEC-001 to DEC-089) remain in `docs/OWNER_DECISIONS.md`; where they conflict with an entry here, this file wins.
Add an entry only for an explicit Owner ruling. Agents do not record their own proposals as decisions.

## 2026-10-02

### Owner design rulings, 21:56-22:15 CT

**DESIGN ONLY.** The Owner explicitly authorized recording these requirements and mapping the WBS. They do not launch implementation. ORG-0.2 green is the first prerequisite; the worldgen exit gates below must also pass before leaving worldgen. DEC-037 still freezes faction/society implementation, including after ORG-0.2 green until the Owner lifts it. Existing authorized ORG-0.2 repair/review work continues. No new runtime lane, art production, JSON schema implementation or provider assignment is opened by this record.

| # | Ruling | WBS mapping |
|---|---|---|
| D-2026-10-02-8 | **Scale and equivalent colony development:** cap 200 colonists per faction, about 1,800 total across 9 factions. Full detail near the player; totals-based off-screen simulation without tracking off-screen individuals. Both use the SAME data, recipes, job rates, tech tree and food math. On arrival, expand a colony into individuals consistent with its totals. Required proof: full versus summarized runs of the same colony for several game years on at least 5 seeds, comparing population, food, buildings and techs within an agreed margin; a 1,800-colonist / 60 FPS benchmark on the Owner's laptop, run in CI. These are future targets, not observed performance. | WBS_SIM SIM-4, SIM-5.1 through SIM-5.3; existing SIM.30 and SOC.60 cross-references |
| D-2026-10-02-9 | **Backgrounds and feats:** approved deviation from SRD 5.1 (Owner notes its one feat, Grappler). Homebrew feats are auto-chosen by race; at the Owner-specified SRD feat/ASI levels 4, 8, 12, 16, 19 choose between an ability score improvement and a racial feat. Racial/cultural backgrounds replace SRD Background and the earlier Profession design: culture-flavored skill and tool proficiencies plus ONE job edge, with NO extra ability-score bonuses on top of the SRD race bonuses. Gemini Deep Think drafts; Deus checks the draft against SRD 5.1 and labels the deliberate deviations. Draft contents still require Owner approval. Supersedes D-2026-10-02-6 and older background/profession wording, including AGENTS lane rule 7; D-5's SRD-only race bonuses remain. | WBS_SIM SIM-3, SIM-4.5, SIM-4.6 |
| D-2026-10-02-10 | **Tech tree:** Age of Empires-style age gates, about 60 techs and branching choices that lock each other out. Definition is pure data with a JSON schema. AI societies use the same tree as the player and progress by a scored choice rule. Gemini Deep Think drafts the schema/content proposal; no tech names, values or scoring weights are approved by this instruction. | WBS_SIM SIM-7; society SOC.10.02 design cross-reference |
| D-2026-10-02-11 | **Data-loading research:** Gemini Deep Research examines DF raws, DFHack, Cataclysm DDA JSON and RimWorld Defs. File its output under docs/research/ as input only; copy no GPL/AGPL code. Research is not permission to import source, data or assets. | WBS_SIM SIM-1.1; docs/research/README.md |
| D-2026-10-02-12 | **Before leaving worldgen, hard gates:** all suites green across 5-10 seeds, no fake checks (planned STUB-FIX lane), deterministic hash, load-time budget test, and save/load round trip reproducing the identical hash. **Soft first-follow-on work:** freeze the worldgen data contract, add SRD weight fields, make densities tunable in data, and decouple from RMMZ (WBS-SPLIT). The soft items are not silently added to ORG-0.2's current repair scope or to the worldgen hard exit gates. | WBS_ORG worldgen exit checklist / ORG-4.2; WBS_SPLIT first-follow-on design |
| D-2026-10-02-13 | **Plan from the start:** save-format version and migrations from the first save; art throughput plan with a placeholder art policy; licensing tracking with the SRD CC-BY credit line and a license recorded for every reused repo or asset. Deus keeps watch on licensing. No new art or reuse authorization is granted. | WBS_SIM SIM-0.1; WBS_ORG ORG-3.2/3.3; existing SIM.00.06 / REL.10.03-.04 / REL.20.02 |
| D-2026-10-02-14 | **First playable slice after worldgen:** colonists arrive, gather, build a hut and survive a night. It must be fun before more systems are added. This is the next gameplay priority, not a blanket lift of DEC-037 or permission to implement now. | WBS_SIM SIM-8; WBS_INDEX sequencing |
| D-2026-10-02-15 | **Gemini proposals only:** all Gemini draft/research outputs go in docs/research/. Every proposed item needs explicit Owner approval before becoming a decision. This record approves the requirements above, not unseen Gemini draft content. | docs/research/README.md; all matching WBS documents |

Before a future implementation brief is approved, the Owner must settle the parity margins and exact duration/seed set, benchmark measurement scenario and Owner-laptop CI runner, worldgen suite inventory/5-10 seed list, load-time threshold, hash scope/version, and save/load scenario. Those values are **TBD**, not implicit agent choices. No research draft was supplied with this directive; do not claim a completed draft or SRD/license check.

### Earlier rulings (preserved)

| # | Ruling |
|---|---|
| D-2026-10-02-1 | **Codex is PM.** Codex (strongest OpenAI single agent) writes briefs, assigns writers and reviewers, and tracks the WBS. The Owner approves scope, design decisions and merges. |
| D-2026-10-02-2 | **WBS-ORG replaces the earlier pillar-merge plan.** `docs/WBS_ORG.md` is the plan of record for repo organization and the pillar merge. |
| D-2026-10-02-3 | **Baseline must be green before the pillar merge.** ORG-0.2 must pass before ORG-4.1/4.2/4.3. The expected-red list from ORG-0.1 only gates CI, hygiene and docs lanes (ORG-1, ORG-2, ORG-3); it never excuses failures in a game-logic lane. |
| D-2026-10-02-4 | **After pillars-v1, code is edited in small source modules** under `game/js/src/<pillar>/`, bundled into the pillar plugin files by a build step (`tools/build/merge_pillars.js`, verified by `tools/build/check_pillars.js`). Bundled files are never hand-edited. |
| D-2026-10-02-5 | **Race bonuses come from SRD 5.1 only.** No invented numbers. |
| D-2026-10-02-6 | **SUPERSEDED by D-2026-10-02-9.** Earlier ruling: professions replace SRD backgrounds. Racial/cultural backgrounds now replace both. |
| D-2026-10-02-7 | **Runtime priority remains world loading green** (WBS-ORG ORG-0.1, ORG-0.2, ORG-1.1, ORG-1.2, ORG-4.2). Later Owner instructions authorize isolated support lanes and the design-only recording above. WBS-SIM and WBS-SPLIT implementation remain parked; DEC-037 remains in force. |
