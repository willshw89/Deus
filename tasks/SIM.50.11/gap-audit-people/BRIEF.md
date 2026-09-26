# Lane O2 Brief: People-Side Gap Audit, docs only (SIM.50.11)

**NO ART GENERATION BY ANYONE (DEC-007).** This is a documentation / audit lane. No code, no art, no image generation, no edits outside the allowedPaths below.

**Lane:** lane-o2 | **Task ID:** SIM.50.11 (proposed ID: SIM.50.02 through SIM.50.10 are already the nine living-world systems in the WBS, so this audit takes the next free SIM.50 number; the coordinator records it in the WBS, not you) | **Branch:** task/gap-audit-people | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-o2` | **Writer:** claude | **Reviewer:** grok (independent, launched later by the PM watch; the task is not DONE until that review passes) | **Base:** origin/main `790387090083848959ce0b95bc560a395336fa3d` | **Source:** Owner ops request 2026-09-26 (main chat), follow-up to SIM.50.01 (living-world gap audit, merged `4614dbfa`, Grok PASS `tasks/SIM.50.01/gap-audit/review_grok_1953c0a5.md`)

**allowedPaths** (exact):
- `tasks/SIM.50.11/gap-audit-people/**`
- `tasks/SIM.50.11/lane-o2/**` (the launcher writes its saved prompt under `launches/` here; you may leave it alone)

**FORBIDDEN:** everything else. In particular `game/**` and `tools/**` (read only; commit no code, no scripts, no tests; ad-hoc `node -e` one-liners or `git grep` runs for counting are fine), `docs/**` (read only, including `docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/audits/**`, `docs/telemetry/**`), `art/**`. You do NOT mint WBS IDs, change WBS statuses or answer Owner questions.

## Goal
The Owner's design goal is Dwarf Fortress / RimWorld-style emergent stories: "the world IS the game." SIM.50.01 audited the physical living world (water, erosion, vegetation, fire, seasons and weather, migration, people reshaping land, settlement growth and abandonment, rare disasters). This audit does the same for the **people side**: is the WBS planning enough of the minds, societies and history that make stories emerge, and what packages are missing?

## Inputs (read these; cite them)
- The current WBS docs (Rev 23 or later): `docs/worldgen/DEUS_WORLDGEN_WBS.md` (Rev 24 at base; a pending coordinator commit records Rev 25, which only closes SIM.00.00 and SIM.50.01), `docs/society/DEUS_SOCIETY_WBS.md` (SOC.*), `docs/art/DEUS_WORLD_WBS.md` (for presentation-only rows; do not audit art).
- Decisions and rules: `docs/OWNER_DECISIONS.md` (DEC-001..DEC-022; especially DEC-011 flat 1:1 rendering, DEC-012 sim/render split and LOD, DEC-013 32 layers / 9 races / home layers / biome bands, DEC-014 population budget and crowd LOD, DEC-015 faction development plans, DEC-018 hyper-realistic SRD spells), `docs/VISION.md`, `docs/INVARIANT_REGISTRY.md`, `docs/RISK_REGISTER.md`, `docs/adr/` (ADR-003 if present).
- The rules bible: SRD 5.1 at `game/data/srd51/` (`rules.json`, `creatures.json`, `character_options.json`, `spells.json`, `equipment.json`, `magic_items.json`) and `docs/SRD5_1_COVERAGE_MANIFEST.md`. Use it for races, conditions, diseases, poisons, exhaustion, healing, languages, deities/planes if present, creature habitats (Underdark), vision (darkvision) and light rules.
- `docs/audits/LIVING_WORLD_GAP_AUDIT.md` (SIM.50.01, the style and rigor to match) and its review.
- Optional, unreviewed: Lane P's in-progress SRD spell-effect audit on `origin/task/lane-p` (read with `git show origin/task/lane-p:<path>`; say it is unreviewed if you cite it).
- Code, read only, where it helps rate reality against plan (for example `game/js/plugins/DEUS_Colonists.js`, `DEUS_Factions.js`, `DEUS_History.js`, `DEUS_HistoricalDemographics.js`, `UF_Households.js`, `DEUS_Callings.js`, `DEUS_Conditions.js`, `DEUS_DeathForensics.js`, `DEUS_Combat.js`, `DEUS_Wildlife.js`, `DEUS_Levels.js`). Every claim about code cites `file:line` at the base commit; every claim about planning cites a WBS ID, DEC ID or V row.

## The ten areas to rate
Rate each as **FULLY PLANNED**, **PARTLY PLANNED** or **MISSING** in the WBS (planning, not code), citing the WBS IDs that cover it. Give a short "code today" note (PRESENT / PARTIAL / DORMANT / ABSENT, with `file:line`) as a secondary column.

1. **Individual minds** (HIGHEST PRIORITY; rank it first): needs, moods, relationships, memories, personalities, opinions, goals; the event-to-memory-to-mood-to-behaviour loop that makes DF/RimWorld stories.
2. **Government, law, crime and succession.**
3. **Diplomacy and war** between factions and among the 9 SRD races (DEC-013).
4. **Culture and religion** (beliefs, rituals, festivals, taboos, art-as-culture data only, deities per SRD if present).
5. **Knowledge and technology**: discovery, spread, teaching, and loss (dark ages, lost techniques); tie to DEC-015 plans.
6. **Health**: disease, injury, poison, infection, healers, medicine, SRD conditions and exhaustion; epidemics across settlements.
7. **Travel and logistics**: roads, caravans, trade routes, supply, pack animals, cross-layer routes.
8. **Records and legends**: the world remembering its history (events, artifacts, famous figures, ruins) and feeding the history-born D&D character mode.
9. **The player's role per mode** (Command, Combat, Incarnate and any others the docs define). **Overlord mode is Owner-designed: flag what the WBS says and what is undefined; do NOT design it.**
10. **Underground life** across the ~16 below-surface layers of the 32-layer world (layers -16..+15, 10 ft each, 5 ft squares, 2 ft strata per DEC-013): cave flora and fungus, creatures and food chains, underground water, darkness, darkvision, and light sources (fire, magic, bioluminescence) and their fuel.

## Deliverables (all under `tasks/SIM.50.11/gap-audit-people/`)
1. `PEOPLE_GAP_AUDIT.md`, the report:
   - Header: task, base commit (paste `git rev-parse HEAD`), inputs read, method, limits.
   - Summary table: area, rating, WBS IDs, code today, biggest gap, priority.
   - One section per area: what the WBS / DEC / V rows require; what exists (cited); numbered gaps with severity (BLOCKER / MAJOR / MINOR as in AGENTS.md); and a **proposed WBS package outline** for each gap: proposed IDs (write them as `PROPOSED-<area>-NN`, never as real minted IDs), scope, dependencies (real WBS IDs), acceptance tests (automatable, with a mutant that must fail), and **sim tick cost at 32 layers with sparse storage** (per-tick CPU class and memory per entity / per settlement / per layer, stated assumptions about population per DEC-014 and LOD tiers per DEC-012/ADR-003; order of magnitude is fine, show the arithmetic).
   - **Interactions** section: how each area couples to the nine living-world systems (SIM.50.02-.10) and to the coupled systems (SIM.40 collapse/decay/reproduction, DEC-015 plans), and to hyper-realistic SRD spells (DEC-018, SIM.60.01-.04), for example disease vs Cure/Lesser Restoration, crime vs Charm/Detect Thoughts, war vs Fireball breaching floors, underground light vs Light/Daylight/Continual Flame.
   - A recommended order of work across the ten areas (individual minds first unless you show a hard dependency that must precede it).
   - **Owner questions**: listed with options, never answered.
2. `people_gap_table.json`, the machine-readable table: a JSON object `{ "task": "SIM.50.11", "baseCommit": "<sha>", "areas": [ ... ] }` with exactly 10 area records, in the order above, each with: `n` (1-10), `area`, `rating` (one of `FULLY PLANNED`, `PARTLY PLANNED`, `MISSING`), `wbsIds[]`, `decIds[]`, `srdRefs[]`, `codeToday` (`PRESENT|PARTIAL|DORMANT|ABSENT`), `codeCitations[]`, `gaps[]` (each `{ id, severity, text }`), `proposedPackages[]` (each `{ id, title, scope, deps[], acceptanceTests[], tickCost }`), `interactions` (`{ livingWorld[], spells[] }`), `ownerQuestions[]`, `priority` (1 = highest). Area 9 has `proposedPackages` only for non-Overlord gaps; Overlord items go in `ownerQuestions`.
3. `REPORT.md`: every command you ran that matters, with raw `EXIT=` lines; the gate check output; counts (areas, gaps, proposed packages, Owner questions); and the final `git rev-parse HEAD` after your last commit.

## Gate check (in `tasks/SIM.50.11/gap-audit-people/lane.json`)
A node one-liner run from the repo root: `people_gap_table.json` parses, has exactly 10 areas numbered 1-10, every rating is one of the three words, every area has at least one `wbsIds` entry or is rated `MISSING`, and `PEOPLE_GAP_AUDIT.md` is at least 8,000 bytes. Run it yourself before your final commit and paste its output in REPORT.md.

## Acceptance criteria (the Grok reviewer will check these)
- All ten areas rated with WBS/DEC citations that exist at the base commit; a reviewer sample of cited WBS IDs and `file:line` citations all resolve.
- Individual minds ranked highest priority, with the fullest package outline.
- Every gap has a proposed package with deps, automatable acceptance tests and a tick-cost estimate at 32 layers with sparse storage.
- Interactions with SIM.50.02-.10 and DEC-018 covered.
- Overlord mode flagged, not designed. Owner questions listed, not answered. No proposed ID collides with a real WBS ID.
- No file outside allowedPaths changed; no code or art committed; nothing self-certified.

## Constraints to restate
- **DEC-011:** flat 1:1 rendering, no filters. Any presentation idea (for example showing moods or darkness underground) must not propose tints, fog filters, shading overlays or scaling.
- **DEC-007:** no art generation, by anyone; do not ask for or tell anyone to make art. Any art need is written as a text-only "art slot needed" line for the Owner.
- **Docs only:** no code, scripts or tests committed.

Commit messages start `[claude] SIM.50.11`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane (table below), the merged governance/ops tools (`tools/governance/**`, `tools/ops/**`: read only) and the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only).
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run tests in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin task/gap-audit-people` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file. Your REPORT states what you did and the raw evidence. An independent Grok review decides; the PM merges.
6. Stop and write `tasks/SIM.50.11/gap-audit-people/escalation.md` (then commit and push it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.
7. Your very last output line must be `FINAL SHA: <sha>`, with the sha pasted from `git rev-parse HEAD` after a successful push (or `FINAL SHA: <sha> (push refused)`).

## Live lanes at launch (write sets are disjoint; do not touch another lane's paths)
| Lane | Task | Role | Write set |
|---|---|---|---|
| S | WG.20.02 art catalogue | Claude writer | `art/catalogue/**`, `docs/art/catalogue/**`, `tools/art/build_catalogue.js`, `tools/art/test_catalogue.js`, `tools/art/fixtures/catalogue/**`, `tasks/WG.20.02/lane-s/**` |
| T | WG.32.02 blank templates | Claude writer | `tools/art/make_blank_templates.js`, `tools/art/test_blank_templates.js`, `tools/art/fixtures/templates/**`, `art/templates/**`, `tasks/WG.32.02/lane-t/**` |
| U | WG.41.01 placement + validator | Claude writer | `tools/art/place_art.js`, `tools/art/validate_art.js`, `tools/art/test_place_art.js`, `tools/art/fixtures/place/**`, `docs/art/APPROVALS_FORMAT.md`, `tasks/WG.41.01/lane-u/**` |
| P | SIM.60.01 SRD spell-effect audit | Claude writer | `docs/audits/SRD_SPELL_EFFECT_AUDIT.md`, `docs/audits/srd_spell_effect_audit.json`, `tasks/SIM.60.01/lane-p/**` |
| M | SIM.00.01 ADR-003 Rev 3 | Claude writer | `docs/adr/ADR-003_sim_render_split_and_lod.md`, `docs/adr/README.md`, `tasks/SIM.00.01/lane-m/**` (not review files) |
| O2 | SIM.50.11 people-side gap audit | Claude writer (this lane) | `tasks/SIM.50.11/gap-audit-people/**`, `tasks/SIM.50.11/lane-o2/**` |
