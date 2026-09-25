# STATUS: Project DEUS Current Operational State
**Project Formal Name:** DEUS  
**Last Updated:** 2026-09-25 (Directive 001-F)  
**Coordinator & Integration Authority:** Gemini / Antigravity  
**Reporting Policy:** Immediate notification on commits, failures, defects, crashes, or power events; routine pulse every 15 minutes.  
**Historical Ledger:** All completed historical records prior to 2026-09-25 are archived in [`docs/archive/STATUS_LEDGER_20260925.md`](docs/archive/STATUS_LEDGER_20260925.md).

---

## 1. Hardware, Remote & Execution State
- **Hardware Status:** `GREEN` (Clean restarts 17:16/17:18; no Kernel-Power 41).
- **Heavy Job Cap:** Formally **LIFTED** as of 2026-09-25 per Owner decision.
- **Automatic Tripwire:** Any instant power loss automatically reinstates `MAX_SIMULTANEOUS_HEAVY_LOCAL_JOBS = 1` until explicitly lifted by the Owner. Any power event must be reported immediately.
- **Remote Git Origin:** Formally configured and live per DEC-005: `origin = https://github.com/willshw89/Deus.git` (private remote). Verified clean clone with 10,259 tracked files, fsck clean, checks pass.
- **Origin in Sync:** **YES** (`main` pushed to `origin/main` at `2d967d0d`).
- **Backup State:** **COMPLETE** (Whitelisted `game/img` fully and tracked `game/data/df_*.json` per Directive 001-F sec 7; commit `258a2c60`).
- **Pre-Execution Checkpoint Discipline:** Before launching any heavy execution, workers must checkpoint in `tasks/<task-id>/state.md`, save all open files, verify git branch/worktree, and commit uncommitted work.
- **Migration Freeze:** The physical copy to `C:\Dev\DEUS` is frozen until all active writers commit and pause at a synchronized freeze point.

---

## In progress
- **Lane A (Claude / Fable):** WG.00.08 Follow-up: adding `shaft_prescan_removed` mutant in `tools/test_strata_cuts_and_caves.js` (Directive 001-F sec 3).
- **Lane B (Claude / Fable):** WG.00.11 ATK-YEAR0-001 hardening suite committed (`37ac57da`). Awaiting Grok signoff.
- **Lane C1 (Claude CLI):** WG.00.12 External backup infrastructure committed (`4a3a56f8`). Ready for integration (step 1).
- **Lane C2 (Claude CLI):** WG.00.12 Machine governance enforcement committed (`58b0fcad`, 88/88 PASS). ACCEPTED for Grok attack. Hook installation held.
- **Lane C3 (Claude CLI):** WG.00.12 Palette ADR-002 revision & commit d1fbeab review committed (`70dad27`). Ready for integration (step 2).
- **Lane D (Grok PM):** Adversarial review delivered (verdicts recorded).
- **Lane E (Grok Writer / Claude Reviewer):** WG.00.09 Follow-up: Grok revising `UF_Depth_Attack_Plan.md` against review `38875ae0` (Blocker CR-19C-B1, M1-M8).
- **Lane F (Claude CLI):** WG.00.12 OneDrive absolute link rewrite tool & dry-run diff committed (`23559316`).
- **Lane G (Claude CLI):** WG.00.11 Follow-up: Test maintenance across `test_new_game_year0.js`, `test_history_materialization_and_world_age.js`, `test_historical_carrying_capacity.js` (Directive 001-F sec 2).

---

## 2. Active Parallel Work Lanes (DEUS Directive 001-F)

| Lane | Objective & WBS ID | Provider / Model | Worker Task ID & Branch | Worktree Path | Last Output / mtime | Current Gate & Status |
|---|---|---|---|---|---|---|
| **Lane A** | **WG.00.08 Exit Criteria** (`WG.00.08`) | Claude CLI (Fable) / `claude-opus-5-5` | `task/lane-a` (base `9f320da2`) | `C:\Users\snewt\.deus_worktrees\lane-a` | 2026-09-25 17:09:20 | **STATUS: FOLLOW-UP ACTIVE.**<br>• 27/27 roster accepted. Adding `shaft_prescan_removed` mutant in `tools/test_strata_cuts_and_caves.js` and proving it caught. ATK-19B-002 & WG.00.08 stay open until caught & DEC-001. |
| **Lane B** | **ATK-YEAR0-001 Hardening** (`WG.00.11`) | Claude CLI (Fable) / `claude-opus-5-5` | Committed `37ac57da`<br>`task/lane-b` | `C:\Users\snewt\.deus_worktrees\lane-b` | 2026-09-25 16:52:25 | **STATUS: WRITER COMMITTED.**<br>• 27 gating checks + 12 mutants pass. Section C checks kept failing as open evidence for `ATK-YEAR0-002`. Awaiting Grok closure signoff. |
| **Lane C1** | **Consolidation Infrastructure** (`WG.00.12`) | Claude CLI (Codex failover) / `claude-opus-5-5` | Committed `4a3a56f8`<br>`task/lane-c1` | `C:\Users\snewt\.deus_worktrees\lane-c1` | 2026-09-25 16:52:25 | **STATUS: WRITER COMMITTED.**<br>• Authored `tools/backup_project.ps1`. Integration order step 1. |
| **Lane C2** | **Governance check_claims.js** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | Committed `58b0fcad`<br>`task/lane-c2` | `C:\Users\snewt\.deus_worktrees\lane-c2` | 2026-09-25 17:02:39 | **STATUS: ACCEPTED FOR GROK ATTACK.**<br>• 88/88 checks pass, 22 mutants killed. Hook installation held until lane branches integrated. Integration order step 3. |
| **Lane C3** | **Palette ADR Revision & Review** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | Committed `70dad27`<br>`task/lane-c3` | `C:\Users\snewt\.deus_worktrees\lane-c3` | 2026-09-25 16:54:51 | **STATUS: WRITER COMMITTED.**<br>• Revised ADR-002 (uf.hex canonical for runtime now); d1fbeab review completed. Integration order step 2. |
| **Lane D** | **Adversarial Review** | Grok (PM instance) / `grok-4.7` | Via Owner | Main checkout | 2026-09-25 16:48:00 | **STATUS: DELIVERED.**<br>• ATK-19B-001 CLOSED; ATK-19B-002 KEEP OPEN (F2); ATK-YEAR0-001 KEEP OPEN (F1); WG.00.08 stays REVIEW. |
| **Lane E** | **WG.00.09 DEFINE / PRE-ATTACK** (`WG.00.09`) | Grok CLI (Writer) / Claude (Reviewer) | `task/lane-e` | `C:\Users\snewt\.deus_worktrees\lane-e` | 2026-09-25 16:58:00 | **STATUS: REVISION ACTIVE.**<br>• Grok revising `UF_Depth_Attack_Plan.md` against review `38875ae0` (Blocker CR-19C-B1: live tilemap opacity, M1-M8). Claude re-reviews. |
| **Lane F** | **OneDrive-Link Migration Prep** (`WG.00.12`) | Claude CLI / `claude-opus-5-5` | Committed `23559316`<br>`task/lane-f` | `C:\Users\snewt\.deus_worktrees\lane-f` | 2026-09-25 16:52:09 | **STATUS: WRITER COMMITTED.**<br>• Link rewrite scanner & dry-run diff ready. Applied at freeze point. |
| **Lane G** | **ATK-YEAR0-002 Runtime Fix & Test Maint** (`WG.00.11`) | Claude CLI / `claude-opus-5-5` | `task/lane-g` (base `0859ed3c`) | `C:\Users\snewt\.deus_worktrees\lane-g` | 2026-09-25 17:13:46 | **STATUS: TEST MAINTENANCE ACTIVE.**<br>• Engine fix committed `0859ed3c` (Core line `>= 0 ? setupYear : 0`). Updating Section C KNOWN_OPEN/Section D anchor, updating world_age assertions, re-freezing carrying capacity SHA. |

---

## 3. Strict File-Ownership Matrix (No Overlapping Write Sets)

| Lane / Owner | Exclusive File Whitelist (Full Paths) | Access Policy |
|---|---|---|
| **Gemini (Coordinator)** | `docs/STATUS.md`<br>`docs/archive/STATUS_LEDGER_*.md`<br>`docs/WORK_QUEUE.md`<br>`docs/CANONICAL_ROLES.md`<br>`docs/AGENT_UTILIZATION_POLICY.md`<br>`docs/OWNER_DECISIONS.md`<br>`docs/worldgen/DEUS_WORLDGEN_WBS.md`<br>`docs/telemetry/*`<br>`baseline/*` | **Exclusive Writer.** WBS coordination, integration authority, pulse reports, baseline records. Zero engine code. |
| **Lane A (Claude / Fable)** | `tools/test_strata_cuts_and_caves.js`<br>`tasks/WG.00.08/*` | **Exclusive Writer (Worktree lane-a).** Adding & proving `shaft_prescan_removed` mutant. |
| **Lane B (Claude / Fable)** | `game/js/plugins/DEUS_FactionMenus.js`<br>`tools/test_new_game_year0.js`<br>`tasks/WG.00.11/*` | **Exclusive Writer (Worktree lane-b).** Hardening committed (`37ac57da`). |
| **Lane C1 (Claude CLI)** | `tools/backup_project.ps1`<br>`tasks/WG.00.12/state.md` | **Exclusive Writer (Worktree lane-c1).** External backup script committed (`4a3a56f8`). |
| **Lane C2 (Claude CLI)** | `tools/governance/check_claims.js`<br>`tools/governance/test_check_claims.js`<br>`tasks/WG.00.12/c2_governance_state.md` | **Exclusive Writer (Worktree lane-c2).** Machine governance checker committed (`58b0fcad`). |
| **Lane C3 (Claude CLI)** | `docs/adr/ADR-002-Palette-Canonicalization.md`<br>`tasks/WG.00.12/c3_commit_review_d1fbeab.md`<br>`tasks/WG.00.12/c3_state.md` | **Exclusive Writer (Worktree lane-c3).** ADR-002 runtime canonicalization committed (`70dad27`). |
| **Lane D (Grok)** | `tasks/WG.00.12/grok_adversarial_review.md`<br>`tasks/WG.00.08/defects.jsonl` (closure lines only) | **Exclusive Writer.** Adversarial review findings, defect verification, and closure signatures. |
| **Lane E (Grok CLI / Claude)** | `docs/systems/UF_Depth_Attack_Plan.md`<br>`tasks/DEUS-TSK-FABLE-19C/*` | **Exclusive Writer (Worktree lane-e).** Depth renderer specification revision (Grok) and re-review (Claude). |
| **Lane F (Claude CLI)** | `tools/migration/rewrite_onedrive_links.js`<br>`docs/migration/*`<br>`tasks/lane-f/state.md` | **Exclusive Writer (Worktree lane-f).** Link scanner, dry-run diff preparation. |
| **Lane G (Claude CLI)** | `game/js/plugins/DEUS_Core.js`<br>`game/js/plugins/DEUS_History.js`<br>`game/js/plugins/DEUS_HistoricalDemographics.js`<br>`game/js/plugins/DEUS_FactionMenus.js`<br>`game/js/plugins/DEUS_Test.js`<br>`tools/test_new_game_year0.js`<br>`tools/test_history_materialization_and_world_age.js`<br>`tools/test_historical_carrying_capacity.js`<br>`tasks/lane-g/state.md` | **Exclusive Writer (Worktree lane-g).** Runtime Year 0 engine implementation and test suite maintenance per 001-F. |
| **FROZEN / READ-ONLY** | `C:\Dev\DEUS`<br>`game/js/plugins/DEUS_Levels.js`<br>`game/js/plugins/DEUS_World.js`<br>`game/js/plugins/DEUS_WorldGen.js`<br>`game/js/plugins/DEUS_Fluid.js`<br>`game/js/rmmz_*.js` | **Strictly Read-Only.** Core engine files locked during parallel consolidation. |

---

## 4. Open Defects & Blockers

| Defect / Finding ID | Task / WBS | Severity | Title & Requirement | Status | Owner |
|---|---|:---:|---|:---:|:---:|
| **BLOCKER-BACKUP** | `WG.00.12` | `BLOCKER` | Migration to `C:\Dev\DEUS` backup requirement: private GitHub remote live (DEC-005), `game/img` fully whitelisted (388 assets) and `game/data/df_*.json` tracked (commit 258a2c60; 10,259 tracked files pushed to origin). | `RESOLVED` | Owner / Lane C1 |
| **ATK-19B-001** | `WG.00.08` | `MAJOR` | continuousAirHeight counts fluid strata as open air clearance. | `CLOSED` | Grok (verified on `2e4571a`) |
| **ATK-19B-002** | `WG.00.08` | `MAJOR` | Shafts and skylights carve rock below fluid. Skylight fix verified, but shaft guard (`DEUS_Levels.js:2498`) untested (F2); rock under shaft plants must be recorded & `shaft_prescan_removed` caught. | `OPEN` (Review F2) | Lane A / Grok |
| **ATK-YEAR0-001** | `WG.00.11` | `MAJOR` | Standard New Game defaults to Year 1; INV-SIM-01 requires World Year 0. Edge-case hardening committed in Lane B (`37ac57da`). | `OPEN` (Awaiting Grok Signoff) | Lane B / Grok |
| **ATK-YEAR0-002** | `WG.00.11` | `MAJOR` | Standard New Game Year 0 runs clock, history, and first save at Year 1. Core `|| 1` -> `?? 0`, History startYear 0, Demographics startYear 0. Assigned to Lane G. | `OPEN` (Assigned Lane G) | Lane G / Grok |
| **A10-1** | `WG.00.08` | `MAJOR` | Native playtest proof of Z-2 ravine cut. Awaiting Owner decision DEC-001 in `docs/OWNER_DECISIONS.md`. | `OPEN` | Owner / Grok |

---

## 5. Model Availability & Failover State
- **Claude / Fable:** `AVAILABLE` (Active implementer on Lane A, Lane B, Lane C1/C2/C3, Lane E reviewer, Lane F, Lane G).
- **Grok:** `AVAILABLE` (Active adversarial reviewer on Lane A, Lane B, Lane D, Lane G; specification author on Lane E).
- **OpenAI Codex:** `EXHAUSTED` (Failover triggered; consolidation lanes reassigned to Claude subagents per Directive 001 sec 8.8).
- **Gemini / Antigravity:** `AVAILABLE` (Coordinator, integration authority, dispatcher. Zero engine code edits).

---

## Stand-ins (U7-derived files: unused by the catalog since 2026-09-19; dev only, never committed, deleted before release; AGENTS rule 8)
**Placeholders are stock RPG Maker MZ art** (VISION V9, user 2026-09-19: "stock is fine"; the U7 files lean and clash with the flat HD FF6 look). Checked 2026-09-19 by Claude Code: no image, tile, people image or tier in `game/data/UF_WorldCatalog.json` names a U7 file or a U7-derived file without the prefix (grep, and the inventory check `catalog_no_standins`). What the catalog draws instead:
1. Units (wildlife, faction people, the start pair and its clothing tiers): `$UF_Stock_<Sheet>_<i>` sheets, one character cut out of a stock 8-character sheet (People1–4, Actor1–3, Nature, Monster, Evil, Vehicle, SF_*), or `$UF_Stock_BigMonster1_r1` (one row of `$BigMonster1`, always facing the viewer). Made by **`tools/extract_stock_characters.js`**; `--check --alias "$Adam=People1_4,$Eve=People1_5"` verifies all 52 against the RMMZ install's stock sheets (RESULT PASS, 2026-09-19). The same tool's `--alias` wrote stock People1 characters 4 and 5 over `$Adam.png` and `$Eve.png`, which UF_Colonists hard-codes for grown colonists without tier sheets (the UF_Anim and UF_Combat tests name `$Adam` too); the U7 originals are kept beside them as `.u7bak.png`. Their `.json` sidecars still name SHAPES.VGA 458 / 452 (the frame geometry, 48×48 with facings S W E N, still fits).
2. Items: `!$UF_Icon_<n>` sheets, stock IconSet icons cut by **`tools/extract_stock_icons.js`** (`--check`: 37 of 37 match), and Gemini's own `!$UF_Item_*` drawings for log, stone, iron and copper ore, berries, straw and meat.
3. Objects: stock `Outside_B` / `Outside_C` / `Inside_C` tiles with tints, `!Door1`, the wall sets, and Gemini's own flat `!$UF_*` drawings (berry bush, fern, campfire, rubble, straw bed, work stone, furnace, smithy).
`tools/generate_asset_inventory.js` counts the two tools' cuts as stock RMMZ only after comparing their pixels with the stock source (check `stock_cuts_verified`).

**Not swapped yet: the catalog swap does not reach three places** (checked 2026-09-19 11:20 by Claude Code with `tools/generate_asset_inventory.js`, which since then also reads the RMMZ editor data; its checks `runtime_no_standins` and `rmmz_data_no_standins` FAIL until these change):
1. Drawn in play by plugin code: `U7_Faces` (UF_Dialogue 271, the portrait of the old keyword dialogue; UF_Gumps 215, the paperdoll, which the I key opens on the map per UF_Gumps 347–352 with EnablePaperdoll "true"; read from the code, not tried in play) and the four container backgrounds `u7_gump_chest`, `u7_gump_barrel`, `u7_gump_backpack`, `u7_gump_sack` (UF_Gumps 104–108, when an event with a container note or the OpenContainer command opens one). Both plugins are enabled in plugins.js. Needs a code change (a stock face sheet such as `People1` in place of `U7_Faces`, a plain or code-drawn container window in place of the gumps), which waits until game/js may be edited again.
2. The RMMZ editor data: Actors.json actors 2–9 (face `U7_Faces` 0–7; map sprites `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith` for actors 2, 5 and 8), Map001 "The Bastion of Kraghold" (6 event pages: `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith`, `$U7_Goblin`) and Map002 "The Glade of Genesis" (336 event pages: `!$PineTree`, `!$GraniteBoulder`, `!$IronstoneDeposit`, `!$BerryBush`, `!$TimberOak`, `!$FruitTree`, `!$Campfire`). Not drawn in a new game as far as checked (the party is actor 1 only, with no face or sprite, System.json; UF_ColonyOverseer 141–142 turns the menu off; UF_World starts a new game in a generated area, map 1000, because StartInWorld defaults to true and StartTemplateMapId to 0; the only transfers in the plugins go to generated areas, UF_World 1617 and 1703, and no map event or common event has a Transfer Player command), but the editor shows them. Changing them edits editor-managed files, so the editor must be closed first.
3. Test-suite fixtures (listed per line below): a code change in each plugin's UF.Test.suite block. The UF_Look suite also expects the oak to draw `!$TimberOak` and the savanna tree `!$U7_Flat-toptree` (UF_Look 546 and 555–560), which the catalog no longer does.

`game/img/system/Window.png` (the skin of every window) is not a stand-in: `buildU7WindowSkin` in tools/generate_all_u7_assets.js (lines 361–477) draws it from fixed colours and arithmetic, with no SHAPES.VGA data; rebuilt from that code 2026-09-19 and compared: 0 of 36,864 pixels differ. `U7_Window.png` is a byte copy the same tool made (line 586) and counts as a stand-in by its name only. The inventory therefore classes Window.png as original (AR-033).

The U7 files below stay on disk (never committed) and nothing in the catalog draws them. The inventory tool reads this list: every backticked file on a bullet line counts as a U7 stand-in wherever it is used, so U7-derived files without the prefix must be named here. Format: `- <files> | source | what still names them`.
- People: every `$U7_*` person sheet (`$U7_Adam*`, `$U7_Eve*`, `$U7_Townsman.png`, `$U7_Townswoman.png`, `$U7_Guard.png`, `$U7_Ranger.png`, `$U7_Goblin.png`, `$U7_Orc.png`, `$U7_Gnome.png`, `$U7_DwarfGuard.png`, `$U7_Miner.png`, `$U7_Blacksmith.png`, `$U7_Fighter*`, `$U7_Automaton.png` and the rest), and without the prefix `$Adam.u7bak.png`, `$Eve.u7bak.png` (the U7 files that were $Adam.png and $Eve.png, byte-identical to each other) and `$People1.png` | SHAPES.VGA 458 / 452 (Adam, Eve, tiers 0–2), 462 / 463 (tier 3), 720 (guard), 265 (townsman, `$People1.png`), 460 (ranger); 3×, E/W transposed | RMMZ editor data (not drawn in play, see above): `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith` (Actors.json actors 2, 5, 8 and Map001 events), `$U7_Goblin` (a Map001 event); test suites (grep of game/js/plugins at 11:20): `$U7_Townsman`, `$U7_Ranger`, `$U7_Guard`, `$U7_Goblin` (UF_Factions, UF_Fire, UF_Interact, UF_Items, UF_Jobs, UF_Look, UF_Objects, UF_Roads, UF_Skills, UF_Stance, UF_Talk fallback, UF_TimeSpeed, UF_Wildlife, UF_World), `$People1` (UF_Floors 457)
- Creatures: every `$U7_*` creature sheet (`$U7_Deer.png`, `$U7_Wolf.png`, `$U7_Dog.png`, `$U7_Hare.png`, `$U7_Fox.png`, `$U7_Horse.png`, `$U7_Sheep.png`, `$U7_Ox.png`, `$U7_Aurochs.png`, `$U7_Chicken.png`, `$U7_WildBird.png`, `$U7_Hawk.png`, `$U7_Rat.png`, `$U7_Bat.png`, `$U7_CaveBat.png`, `$U7_Serpent.png`, `$U7_Snake.png`, `$U7_Cat.png`, `$U7_Spider.png`, `$U7_CaveSpider.png`, `$U7_CaveCrawler.png`, `$U7_CaveLurker.png`, `$U7_Troll.png`, `$U7_BogHorror.png`, `$U7_Skeleton.png`) | SHAPES.VGA 811, 498, 716, 523, 970, 537, 510, 496, 495, 555, 865, 493, 530, 502, 500, 727 and others, 3×, E/W transposed (AR-401 to AR-403) | test suites only: `$U7_Hare` (UF_Colonists, UF_Doors, UF_Interact, UF_Jobs, UF_Stance, UF_Talk fallback), `$U7_Troll` (UF_Stance). The combat rewrite of 2026-09-19 (UF_Combat.js, 10:59) draws spawned hostiles from the catalog species image, no longer `$U7_Wolf` / `$U7_CaveSpider`
- Objects without the prefix: `!$TimberOak.png`, `!$PineTree.png`, `!$FruitTree.png`, `!$BirchTree.png`, `!$SwampTree.png`, `!$DeadTree.png`, `!$TreeStump.png`, `!$BerryBush.png`, `!$WildShrub.png`, `!$TallGrass.png`, `!$Reeds.png`, `!$Wildflowers.png`, `!$GraniteBoulder.png`, `!$IronstoneDeposit.png`, `!$CaveBoulder.png`, `!$LooseStones.png`, `!$CrystalCluster.png`, `!$IronOreVein.png`, `!$CaveMouth.png`, `!$CaveLadder.png`, `!$FallenPillar.png`, `!$OldBones.png`, `!$StrawBed.png`, `!$WallStone.png`, `!$WallWood.png`, `!$Campfire.png` | SHAPES.VGA shapes 181, 306, 328, 310, 332, 325, 313, 672, 619, 321, 323, 314, 342, 341, 343, 353, 747, 916, 389, 705, 360, 650, 683, 365, 362, 739 (each file's sidecar `standInSource`), 3× | RMMZ editor data (not drawn in play, see above): Map002 events, 336 pages (`!$GraniteBoulder` 85, `!$PineTree` 82, `!$IronstoneDeposit` 64, `!$BerryBush` 57, `!$TimberOak` 46, `!$FruitTree` 1, `!$Campfire` 1); test suites: `!$TimberOak` (UF_Look 546, 562–566)
- Objects with the prefix: every `!$U7_*` object sheet (`!$U7_TimberOak.png`, `!$U7_PineTree.png`, `!$U7_FruitTree.png`, `!$U7_Flat-toptree.png`, `!$U7_Broadleafgiant.png`, `!$U7_Swamptree.png`, `!$U7_Deadtree.png`, `!$U7_TreeStump.png`, `!$U7_Shrub.png`, `!$U7_TallGrass.png`, `!$U7_Reeds.png`, `!$U7_Wildflowers.png`, `!$U7_LooseStones.png`, `!$U7_Gravel.png`, `!$U7_GraniteBoulder.png`, `!$U7_CaveBoulder.png`, `!$U7_MalachiteOutcrop.png`, `!$U7_GoldVeinOutcrop.png`, `!$U7_IronOreVein.png`, `!$U7_CrystalSpire.png`, `!$U7_SmallCrystals.png`, `!$U7_OldBones.png`, `!$U7_FallenPillar.png`, `!$U7_StrawBed.png`, `!$U7_WallStone.png`, `!$U7_WallWood.png`, `!$U7_CaveMouth.png`, `!$U7_CaveLadder.png`) | SHAPES.VGA, 3×, collision-aligned anchors (AR-021 to AR-023, AR-044, AR-102, AR-103) | test suites only: `!$U7_Flat-toptree` (UF_Look 555, 560), `!$U7_Shrub` (UF_Look 564)
- Items: the 23 `!$U7_Item_*.png` sheets (WoodLog, Firewood, RoughStone, IronOre, LeadOre, Blackrock, GoldNugget, MetalBar, RoughGem, CutGem, PlantFiber, WoolFleece, StrawBundle, SeedPouch, WildBerries, TreeFruit, CaveMushroom, RootVegetable, RawMeat, HaunchMeat, RiverFish, AnimalBone, LeatherHide), and without the prefix `!$UF_Item_Firewood.png`, `!$UF_Item_Fish.png` (byte-identical to U7 item sheets) | SHAPES.VGA item shapes, 3× (AR-200) | nothing
- Ground: `game/img/tilesets/U7_Ground_A1.png`, `U7_Ground_A2.png`, `U7_Outside_A1.png`, `U7_Outside_A2.png`, `U7_Dungeon_A1.png`, `U7_Dungeon_A2.png`, `U7_Fortress_B.png`, `U7_Glade_B.png` | SHAPES.VGA flat shapes 4, 23, 5 and others, 3× (AR-001) | nothing (the catalog's tileset is the code-drawn UF_GenGround_A2 with stock Outside_A1, Outside_B and Outside_C)
- UI still drawn in play: `game/img/faces/U7_Faces.png` (8 portraits), `game/img/system/u7_gump_*.png` (container gumps; `gump_test.png`, `gump_backpack.png`, `gump_barrel.png`, `gump_sack.png` below are byte copies) | FACES.VGA and GUMPS.VGA shapes 0, 1, 2, 5, by tools/extract_u7_assets.ps1 (lines 83–180) | drawn in play: UF_Dialogue 271 and UF_Gumps 215 (faces), UF_Gumps 104–108 (gumps); RMMZ editor data: Actors.json faces of actors 2–9. Not swapped: a code change, see above
- UI and other extractions, unused: `game/img/system/U7_Window.png`, `U7_Cursor.png`, `U7_Select.png`, `U7_Pointer.png`, `U7_HandPointer.png`, `game/img/system/u7_gumps/`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png` | earlier extraction, sources not recorded | nothing

## Backlog (not scheduled)
- AUDIT_LOG A10-3 (level -1's natural objects do not survive a load and land on dug floors) and A10-4 (level -1's flood grid floods solid rock): both before 19A, found by the 19A native smoke.
- V132 (user, 2026-09-24): racial spawn levels at world generation (Z-2 tiefling, dragonborn; Z-1 dwarf, gnome; Z0 human, half-orc; Z+1 halfling, half-elf; Z+2 elf), initial anchors only. `DEUS_Factions.js` `getZForSpecies` and the catalog layer lists still follow the 2026-09-22 rule (everyone else on Z0). Queued after the FABLE-19A gate; needs an assignment (DEUS_Factions / catalog / History placement).
- "DEUS — DEPTH VISUAL TUNING BRIEF" (user, 2026-09-24; VISION decision log): 5 ft per level, H = 120 ft with 160 / 90 ft presets, 4 % colour steps per level, blur off, screenshots of 3–5 visible levels. Queued behind 19A; depths 3–4 need 19B geometry and the 19C compositor.
- Wildlife standing inside hills (23 animals on the ground's solid hill cells at seed 20260923, the same on 2d5fc47): placement or roaming ignores the ground's column shapes.
