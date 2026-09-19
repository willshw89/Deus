# HANDOFF: Codex continues the engine work alongside Claude Code

Written by Claude Code on 2026-09-19 at about 14:40, at HEAD `1c6c394`. The tree keeps changing. Where this file and `docs/STATUS.md` disagree, STATUS is right.

## 1. Rules (AGENTS.md is binding)
- Read in this order: `AGENTS.md`, `docs/STATUS.md`, `docs/AUDIT_LOG.md`, `docs/SLICES.md`, `docs/VISION.md`, `docs/ENGINE_RULES.md`, `docs/ART_STANDARD.md`, `docs/systems/`, `docs/ASSET_REQUESTS.md`.
- You do engine work under Claude Code's rules: code, tools, tests, `docs/systems/` and your own design docs. Never touch `art/`, `game/img/`, or Gemini's status cells in `docs/ASSET_REQUESTS.md`.
- Claim before you start. Add a line under "In progress" in STATUS: `- Codex | <task> | <files> | since 2026-09-19 HH:MM`. Before editing any file, grep STATUS for it; if it is claimed, leave it. Remove your claim when you report.
- One task per commit, with a message that starts `[codex]`. Stage with `git add <paths>` only, never `git add -A`, `git add .` or `git commit -a`. If a file also holds another agent's uncommitted lines, stage only your own hunk or leave the file out.
- Test on snapshots, never on the live `game/` (the user playtests it). Run `node tools/test_snapshot.js --name <n> --no-run`, copy your files into `%TEMP%\uf_snapshots\<n>\js\plugins\`, then run `node tools/run_tests.js <suite> --game %TEMP%\uf_snapshots\<n>`. `--plugins A,B` registers plugins in the copy. Never kill an `nw.exe` you didn't start.
- Every check must be able to fail. Plant the defect once in a snapshot, see the FAIL, and quote it in your report.
- Open every screenshot you cite and say what is in it.
- **The RMMZ editor is open (2026-09-19).** Don't write `game/js/plugins.js` or any editor file in `game/data/` (Actors, Map*, System, …) until the user says the editor is closed. Afterwards, tell the user to reopen the project. `game/data/UF_WorldCatalog.json` isn't editor-managed, but many runs edit it. Change only a key your task owns, with a node script that re-reads the file right before it writes and asserts that every other top-level key is unchanged. Never use `ConvertTo-Json`.
- The engine core is read-only: `game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/`.
- Player text never uses Ultima, DF, OSRS or D&D product-identity names or signature terms. Invent no lore; placeholder names start with `TEST_`.
- Never commit U7-derived files: `U7_*`, `$U7_*`, `!$U7_*`, `*.u7bak.png`, `reference/`, or the unprefixed files in STATUS → Stand-ins.
- No hand-typed sprites (V69). Placeholders are duplicated stock RMMZ assets (V9, and the user on 2026-09-19 at 13:15: "Feel free to use duplicate RMMZ assets"). Each gets a request in `docs/ASSET_REQUESTS.md` that names the stock asset.
- Never delete an earlier art style's work (style changes are reversible trials).
- If two fixes for the same problem fail, stop, write down what you know and ask the user (rule 10).
- Report in AGENTS.md's format, with absolute dates.

## 2. Who owns what (2026-09-19, 14:40)
| Owner | Files | Notes |
|---|---|---|
| Claude Code: five-level world, **running now** in snapshots | `UF_Levels.js` (new), `UF_World.js`, `UF_Objects.js`, `UF_Items.js`, `UF_Jobs.js`, `UF_Camera.js`, `UF_Look.js`, `UF_Interact.js`, `UF_Tiles.js`, `UF_Fog.js` (one line), `docs/design/VERTICAL_BUILD_PLAN.md`, `docs/systems/UF_Levels.md`, `docs/handoffs/HANDOFF_vertical.md` | Slice V1 is built (`UF_Levels.md`, 14:34) and is being copied back. V2 and V3 aren't built. |
| Claude Code: other live runs (STATUS claims since 13:45) | `UF_Ecology.js` (v2 over your v1), `UF_Skills.js`, `UF_Movement8D.js`, `UF_Anim.js`, `UF_Factions.js`, `UF_Talk.js`, `UF_Sheet.js`, `UF_WorldGen.js`; new Remains, Tech, Select, Personality, Durability, Containers and Classes plugins; catalog keys `people`, `cultures`, `factions.*`, ground kinds, `select`, `personality`, `remains`, `ecology`, `tech`, `skins`, `faces` | |
| Claude Code: finished runs whose claims are still in STATUS | `UF_History.js`, `UF_Colonists.js`, `UF_Roads.js`, `tools/register_world_plugins.js`, `UF_Society.js` (never written), and those systems' `docs/systems/` pages | Treat them as claimed until the lines go. |
| Claude Code: uncommitted, no claim line | V92: `UF_Speech.js`, `UF_Skills.js`, `UF_Jobs.js`, `UF_NPCSchedules.js`, `UF_Colonists.js`. Carry run (V89): `UF_Sheet.js` and its doc, `UF_Anim.md`, `UF_ColonyOverseer.js` and its doc | |
| Another Claude Code session | `UF_Wildlife.js`, `docs/systems/UF_Wildlife.md` (creature AI) | |
| Gemini | `art/`, `game/img/`, `GEMINI.md`, `art/APPROVALS.md`, the catalog `objects` list; its edits in `UF_Visuals.js`, `UF_Stance.js` and `UF_TimeSpeed.js` (K18); its scripts in `tools/` (`creature_pipeline.js`, `build_boar.js`, `process_nano_banana_*.js`, …) | |
| **Codex (you)** | `UF_Doors.js`, `UF_Floors.js`, `UF_Walls.js`, `UF_Ownership.js` and their `docs/systems/` pages; `docs/design/VERTICAL_WORLD.md`, `RESOURCE_ATLAS.md`, `RESOURCE_MANIFEST.md` and `RESOURCE_MANIFEST.json`; `tools/add_doors_catalog.js`, `add_floors_catalog.js`, `check_resource_manifest.js` | `UF_Floors.js` has an uncommitted 24-line test-arena edit (12:31) by an unrecorded author. |
| Unclaimed (claim one before you take it) | `UF_Gumps.js`, `UF_Dialogue.js`, `UF_Fire.js`, `tools/originality_check.js` | |

## 3. What landed on 2026-09-19, and what's left
Claude Code's commits: `d1890a9` stock RMMZ placeholders (V9) · `69c13ab` whole-area paths and the V68 spawn guard · `55d3d3c` no-history start, eight founders around a lit campfire · `b776275` UF_Skills (V63) and OSRS-style UF_Combat (V64) · `2583030` UF_Speech (V62) and the UF_Talk rework · `521b539` UF_Sheet (V59) · `9e4078e` sprite-only UF_Anim (V58, V60, V61) · `90ec803` the U7 style dataset exporter · `34340ff` CHAIN_OF_COMMAND.md · `51d61e2` CRAFTING.md and THEME.md drafts · `2820e38` seven plugins registered · `4e9a30a` `*.u7bak.png` ignored · `019d2c2` a UF_Look fixture fix.
None of this has run in F5 Playtest. The editor holds an older plugin list, so the user must close it without saving and reopen it before touching the Plugin Manager or pressing F5.

Left undone, condensed from the run reports:
- **Bands, society and daily life (V51).** The session limit cut the bands phase, and society and daily life never ran. The last untested working copies are `UF_Colonists.js` and `UF_Jobs.js` in `%TEMP%\uf_snapshots\bands_f19_colr\js\plugins\` (11:24). UF_Command (V52) depends on this work. `docs/design/CHAIN_OF_COMMAND.md` §6.2 lists the hooks `UF.Colonists` must expose.
- **Skills and combat.** The `UF_Jobs` rateOf hook isn't applied, so work speed doesn't grow with level. UF_Sheet has no skills page. `UF_Visuals.bark` throws because NW.js has no `roundRect`. Hunting still kills by job, not through combat.
- **Talk.** The social need is never eased. Portraits are placeholders (AR-700).
- **Spawn guard.** `UF_Jobs` build apply ignores what `O.setIn` returns, so a refused build uses up its items and builds nothing.
- **Start.** Founders face 4 ways. The kit ignores the biome (grass tufts on tundra).
- **Stock swap.** People images ignore gender (`UF_History` picks `images[i % n]`). UF_Sheet draws only one tile of a big object. U7 names are still in the test fixtures of 16 plugins.
- **U7 art drawn at runtime:** `UF_Gumps.js` lines 104–107 and 215, and `UF_Dialogue.js` line 271 (`U7_Faces`, `u7_gump_*`). U7 names in the editor data: `Actors.json` (actors 2–9), `Map001.json` (6 event pages), `Map002.json` (336 pages of unprefixed U7 sheets).
- **`tools/originality_check.js`** is untracked and has no system doc. It misses copies: I ran it on 2026-09-19, and `!$U7_TreeStump.png`, a U7 extraction, graded PASS at 0.490. `!$U7_GraniteBoulder.png` FAILs, as it should.
- **Nano Banana pipeline.** The research finished; all four build steps failed. There is no API client, no flat cleaner and no RMMZ spec step. Gemini now generates with Antigravity's `generate_image` (3 references at most, JPEG output, a small quota) and cleans with its own per-asset scripts.
- **Registration.** `UF_Ownership` and `UF_Ecology` aren't in `game/js/plugins.js`. The ORDER list in `register_world_plugins.js` has no `UF_Walls`, so running the tool moves UF_Walls in front of UF_World.
- **Failing checks, as last reported on 2026-09-19:**
  - jobs: `hunt`, `open_job_taken`, `stalled_fails` (it still expects the old 600-tick pressing), `saved`
  - look: `saved`, `hunt_and_haul_options` (flaky)
  - colonists: `plan_reads_the_site`
  - doors: 7 FAIL on the spawn-guard tree ("no door gets placed"), after 12/12 earlier
  - floors: room scan at 2.52 ms against a 2 ms budget (stopped under rule 10)
  - anim: `pooled_and_perf` (depends on machine load), `death_frames_and_remains`
  - wildlife: `spawned_with_world` (depends on the seed)
  - `check_catalog.js`: `farm_plot` in `workshops_one_cell`
- **Git findings.** Gemini's `ca87248` committed 12 unprefixed U7-derived images, plus new versions of `!$GraniteBoulder.png` and `!$PineTree.png` whose sidecars still name U7 shapes. It is still unsettled whether the tracked `!$UF_Item_Firewood.png` and `!$UF_Stump.png` are U7 copies. `game/img/tilesets/U7_Glade_B.png` has been tracked since `940ac91`.

## 4. Your queue (in order)
| # | Task | Files | Depends on | Done when |
|---|---|---|---|---|
| 1 | Update your vertical design for V91 and review the build plan | `docs/design/VERTICAL_WORLD.md` only | none. Do it first: the five-level run copies back soon. | §1 and §4 describe stacked terrain (read `docs/design/TERRAIN_LEVELS.md`). A new section, "Review of VERTICAL_BUILD_PLAN (Codex, 2026-09-19)", lists each conflict with the plan's §0 (D1–D8) and §8, by section. Don't edit the plan. Answer `docs/design/ECOLOGY.md` §14 D1 (should v2 be built in place in your `UF_Ecology.js`?) in your report. |
| 2 | Make the originality check catch copies | `tools/originality_check.js`, new `docs/systems/ORIGINALITY_CHECK.md` | none | Every `U7_` file in `game/img/characters/` and every unprefixed file in STATUS → Stand-ins FAILs, `!$U7_TreeStump.png` included. `art/masters/oak.png`, `bone.png` and `human_male_stand.png` still PASS. `--selftest` passes, and you've seen it fail. Put its output for the tracked files in §3 → Git findings in your report, without `git rm`. The index and reports stay in `reference/`. |
| 3 | Stop drawing U7 art at runtime | `UF_Gumps.js`, `UF_Dialogue.js`, a new `docs/systems/` page for each | none | A stock face sheet (e.g. `game/img/faces/People1.png`) and a code-drawn container window replace `U7_Faces` and `u7_gump_*`. `node tools/generate_asset_inventory.js` reports `runtime_no_standins` PASS, and FAIL on a snapshot with `U7_Faces` put back. Both plugins are registered already. |
| 4 | Take U7 names out of the fixtures you may touch (test code only) | `UF_Fire.js` lines 1330, 1331, 1422; `UF_Floors.js` line 507 (`$People1` is U7-derived) | none | The fixtures use the catalog's `$UF_Stock_*` people. The `fire` and `floors` suites pass and can still fail. Other plugins' fixtures belong to whoever holds their claims. |
| 5 | Your open items | `UF_Doors.js`, `UF_Floors.js` | none | Rerun `doors` on a fresh snapshot and fix the 7 FAILs if they come back. Settle the uncommitted `UF_Floors.js` edit: if it's yours, finish and commit it; if not, leave it and say so. Don't retry the room-scan budget (rule 10). |
| 6 | Flat art cleaner (STATUS engine queue item d) | new `tools/clean_art.js`, new `docs/systems/CLEAN_ART.md` | none | It `require`s `tools/make_25d.js` without editing it. Steps: magenta and fringe removal; scale from the subject's height (ART_STANDARD §2; creatures out of range are rejected, never rescaled); snap to `art/palette/uf.hex`; binary alpha; bottom-centre anchor; 8 facing rows and the 20-column sheet (§4); a provenance sidecar. `--selftest` breaks each step once. Gemini's scripts stay as they are. |
| 7a | Editor work (**ask the user first**) | `game/data/Actors.json`, `Map001.json`, `Map002.json`, `game/js/plugins.js` | the user confirms the editor is closed | The U7 names are gone (or Map002 is retired; nothing uses it, K10), UF_Ownership is registered and `rmmz_data_no_standins` passes. The UF_Walls ORDER fix in `tools/register_world_plugins.js` is Claude Code's (claimed file). |
| 7b | Bands, society and daily life (V51), then UF_Command (V52) | `UF_Colonists.js`, `UF_Jobs.js`, `UF_History.js`, new `UF_Society.js` and `UF_Command.js` | no claim on these files in STATUS, and the user gives you the task | Spec: `docs/design/WORLD_ARCHITECTURE.md` §2.10 and `CHAIN_OF_COMMAND.md` §6–§7. UF_Command also needs the answers to §9, and it uses `TEST_Rank` names until §10 is approved. |
| 7c | Z in UF_Doors | `UF_Doors.js` | `UF_Levels.js` committed | Per `VERTICAL_BUILD_PLAN.md` §8, `cellKey` carries z, and a door can't be built on z ≠ 0. |

## 5. Waiting on the user
- **Q12:** DF-style injuries, or hit points only (VISION → Open questions)?
- **Chain of command:** questions 1–9 in `CHAIN_OF_COMMAND.md` §9, and the rank names in §10 (also in `docs/design/rank_names.proposal.json`).
- **Crafting:** proposals P1–P21 in `CRAFTING.md` §0.1 (P2, P3 and P13 are withdrawn).
- **Theme:** decisions T1–T25 in `THEME.md` §5, and the changes F1–F10 in §4.
- **Style anchors:** `art/APPROVALS.md` records the human_male anchor as approved "via automated review policy". `docs/handoffs/STYLE_TRAINING.md` §6 step 3 asks whether the four anchors stand or are redrawn with the LoRA.
- **U7 files in git:** `git rm --cached`, ignore rules, and whether to purge history, for the files in §3 → Git findings.
- **Also:** the game title (K15); adding Codex to AGENTS.md's role table; ECOLOGY D1; the floors room-scan budget; whether to generate art through the API (the key would come only from an environment variable).
