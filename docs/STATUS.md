# STATUS: Project DEUS Control Board

**Project Formal Name:** DEUS  
**Last Updated:** 2026-09-30 (DEC-054..059)  
**Phase:** Natural World v1 build, straight through with no per-package Owner gate (DEC-058/059). The world is named Emerys (DEC-054). Soil deferred; flora, fauna and monsters placed by seeded rules per biome cell and danger tier (DEC-057). Fire, seasons/weather, migration, rare geological events and structure decay deferred (DEC-059). Art: PixelLab-native layout (DEC-055), the PM picks what goes in game (DEC-056), the Owner generates all art (DEC-007).  
**PM & Integration Authority:** Claude; **Coordinator / Proposer:** Gemini / Antigravity (DEC-042/DEC-048)  
**Status view (DEC-085 item 8, 2026-10-01):** lane and wave status lives on the Build Board (the claude.ai artifact the PM maintains) and in the live telemetry. This page is not updated per lane or per merge; it keeps the stable description of the live systems below.  
**Historical Ledger:** Pre-prune operational history is archived in [`docs/archive/STATUS_LEDGER_20260930.md`](archive/STATUS_LEDGER_20260930.md) (and [`docs/archive/STATUS_LEDGER_20260925.md`](archive/STATUS_LEDGER_20260925.md)).

---

## 0. Active Lanes

### In progress

- 2026-10-02: ORG-0.2 is the only active lane under the Owner's latest direction. Claude is the sole runtime writer on task/org-0.2-worldgen-green, with Grok reviewing. Codex PM recorded the dispatch and usage policy; its documentation claim is released. Main, stashes and the backup branch are protected. World-load acceptance is not established; all side questions remain queued. See tasks/ORG-0.2/lane-worldgen-green/OWNER_FOLLOWUP.md.

| Lane | Task | Writer -> reviewer | State |
|---|---|---|---|
| gp | OPS.MAIN.GREEN | claude -> grok | MERGED 86a51589 |
| gq | NAT.02.01 nx1 | gemini -> grok | MERGED |
| gn | ART.GROUND.FIX | gemini -> codex | OBSOLETE (PM Hotfix) |
| dr | NAT.02.MASS part 4 | codex -> grok | MERGED |
| gr | OPS.FLOW.CUT | grok -> codex | OUT-OF-SCOPE (Failed) |
| dd | WG.CELL-WRITE part 3 | grok -> codex | Writing (grok) |
| dp | NAT.02.MASS part 3 | codex -> grok | MERGED |
| nx2 | NAT.02.01 part 3 | grok -> codex | MERGED |
| fi | WG.65.04 | claude -> grok | MERGED |

## 1. Live Systems
The following subsystems are actively loaded by `game/js/plugins.js` (42 plugins) or invoked as live companions / modules by `DEUS_Core.js`:

### A. Active Plugins (in exact `plugins.js` load order)
| Plugin | Canonical File | System Authority / Role |
|---|---|---|
| `DEUS_Core` | `game/js/plugins/DEUS_Core.js` | Foundation systems; Rule 14 time tags NOT IMPLEMENTED; see section 4; deterministic RNG, spatial queries, and engine hooks |
| `DEUS_Visuals` | `game/js/plugins/DEUS_Visuals.js` | High-DPI scaling, viewport rendering, 2D foot-Y sorting, pixel-crisp display |
| `DEUS_Movement8D` | `game/js/plugins/DEUS_Movement8D.js` | 8-directional movement, Octile A* pathfinding, corner collision, diagonal slide |
| `DEUS_Perspective25D` | `game/js/plugins/DEUS_Perspective25D.js` | 2D foot-Y depth sorting, canopy occlusion |
| `DEUS_ColonyOverseer` | `game/js/plugins/DEUS_ColonyOverseer.js` | RTS camera panning, designation markers, unit selection |
| `DEUS_World` | `game/js/plugins/DEUS_World.js` | Seeded multi-level procedural world persistence, coordinate translation, area state |
| `DEUS_WorldGen` | `game/js/plugins/DEUS_WorldGen.js` | Perlin elevation/moisture synthesis, geological strata, biome boundaries |
| `DEUS_Tiles` | `game/js/plugins/DEUS_Tiles.js` | Dynamic terrain autotiling, biome transitions, elevation cliffs |
| `DEUS_Factions` | `game/js/plugins/DEUS_Factions.js` | 11 cultural factions, cultural identities, diplomatic relations |
| `DEUS_History` | `game/js/plugins/DEUS_History.js` | Historical demographic generation, settlement founding, founder genealogies |
| `DEUS_Objects` | `game/js/plugins/DEUS_Objects.js` | Catalog-driven world objects, multi-state interaction cycles (intact/ruined/harvested) |
| `DEUS_Walls` | `game/js/plugins/DEUS_Walls.js` | Structural 2-tile wall systems with black wall-top occlusion convention |
| `DEUS_Doors` | `game/js/plugins/DEUS_Doors.js` | Cultural architectural doors, faction access control, open/closed states |
| `DEUS_Items` | `game/js/plugins/DEUS_Items.js` | Physical item instances, stack limits, weight/bulk, spatial ground items |
| `DEUS_Jobs` | `game/js/plugins/DEUS_Jobs.js` | Labor designations, haul/harvest/mine tasks, workstation reservations |
| `DEUS_Floors` | `game/js/plugins/DEUS_Floors.js` | Walkable floor surfaces, structural ceilings, dug earth, mined stone |
| `DEUS_Generator` | `game/js/plugins/DEUS_Generator.js` | Procedural entity and site generator |
| `DEUS_Colonists` | `game/js/plugins/DEUS_Colonists.js` | Colonist agency, hunger/thirst/sleep needs, pathfinding execution |
| `DEUS_Projects` | `game/js/plugins/DEUS_Projects.js` | Construction projects, bill-of-materials tracking |
| `DEUS_Wildlife` | `game/js/plugins/DEUS_Wildlife.js` | Ecosystem fauna, herd migration, predator/prey behavior, hunting |
| `DEUS_Ecology` | `game/js/plugins/DEUS_Ecology.js` | Flora propagation, seasonal growth cycles, biomass regathering |
| `DEUS_Stance` | `game/js/plugins/DEUS_Stance.js` | Combat readiness stances, tactical postures, engagement radius |
| `DEUS_Combat` | `game/js/plugins/DEUS_Combat.js` | D&D 5.1 SRD combat rules, turn/action economy, damage calculation |
| `DEUS_Anim` | `game/js/plugins/DEUS_Anim.js` | Universal 12-sprite character animations, static frame playback |
| `DEUS_Fog` | `game/js/plugins/DEUS_Fog.js` | Atmospheric fog density, elevation visibility obscuration |
| `DEUS_DayNight` | `game/js/plugins/DEUS_DayNight.js` | Astronomical clock, solar elevation, ambient light transitions |
| `DEUS_TimeSpeed` | `game/js/plugins/DEUS_TimeSpeed.js` | Engine tick pacing, pause, 1x, 2x, 5x simulation speed controls |
| `DEUS_Camera` | `game/js/plugins/DEUS_Camera.js` | Viewport camera tracking, edge panning, minimap sync |
| `DEUS_Culling` | `game/js/plugins/DEUS_Culling.js` | Viewport culling, zero-allocation entity visibility filtering |
| `DEUS_Speech` | `game/js/plugins/DEUS_Speech.js` | Overhead comic dialogue bubbles, barks, shouts, localized text display |
| `DEUS_Look` | `game/js/plugins/DEUS_Look.js` | Inspection tooltips, asset provenance and status lookup |
| `DEUS_Interact` | `game/js/plugins/DEUS_Interact.js` | World interaction triggers, door toggling, chest search, harvesting |
| `DEUS_Sheet` | `game/js/plugins/DEUS_Sheet.js` | 4-page retro CRPG character sheet (Stats, Gear, Spells, Prayers) |
| `DEUS_Talk` | `game/js/plugins/DEUS_Talk.js` | Conversational dialogue trees, keyword inquiry, topic progression |
| `DEUS_Fire` | `game/js/plugins/DEUS_Fire.js` | Thermodynamic fire propagation, heat transfer, flammable combustion |
| `DEUS_Levels` | `game/js/plugins/DEUS_Levels.js` | 32-level vertical volume authority, subterranean deep cuts, bedrock floors |
| `DEUS_Ownership` | `game/js/plugins/DEUS_Ownership.js` | Zone ownership, faction claims, private dwelling attribution |
| `DEUS_Environment` | `game/js/plugins/DEUS_Environment.js` | Weather simulation, precipitation, ambient temperature modulation |
| `DEUS_NaturalConnections` | `game/js/plugins/DEUS_NaturalConnections.js` | Multi-level ramps, natural slopes, vertical transition stairwells |
| `DEUS_FactionMenus` | `game/js/plugins/DEUS_FactionMenus.js` | Cultural UI framing, faction diplomacy screens, relation matrices |
| `DEUS_Depth` | `game/js/plugins/DEUS_Depth.js` | Multi-Z exposure depth shading, vertical strata occlusion |
| `DEUS_Test` | `game/js/plugins/DEUS_Test.js` | In-engine diagnostic suite, headless validation harnesses |

### B. Core Companions & Live Simulation Modules
The following 11 companion plugins are loaded synchronously by `DEUS_Core.js:89-104` in the desktop runtime, along with live simulation modules:

| Subsystem | Canonical Path | Description |
|---|---|---|
| `DEUS_Containers` | `game/js/plugins/DEUS_Containers.js` | Chests, sacks, stockpiles, and item storage authority (loaded by `DEUS_Core.js:90`) |
| `DEUS_Bag` | `game/js/plugins/DEUS_Bag.js` | Mobile containers, inventory sacks, worn pouches (loaded by `DEUS_Core.js:91`) |
| `DEUS_Stockpiles` | `game/js/plugins/DEUS_Stockpiles.js` | Ground storage zones, bulk material piles (loaded by `DEUS_Core.js:92`) |
| `DEUS_Fluid` | `game/js/plugins/DEUS_Fluid.js` | Hydrostatic pressure, surface water flow, aquifer simulation (loaded by `DEUS_Core.js:93`) |
| `DEUS_Conditions` | `game/js/plugins/DEUS_Conditions.js` | Status conditions, bodily fatigue, environmental exposures (loaded by `DEUS_Core.js:94`) |
| `DEUS_Select` | `game/js/plugins/DEUS_Select.js` | Multi-unit drag selection, squad designations (loaded by `DEUS_Core.js:95`) |
| `DEUS_Dnd5e` | `game/js/plugins/DEUS_Dnd5e.js` | SRD 5.1 ability score rolling, class hit dice, proficiency math (loaded by `DEUS_Core.js:96`) |
| `DEUS_Callings` | `game/js/plugins/DEUS_Callings.js` | Labor vocational specializations, builder/harvester assignments (loaded by `DEUS_Core.js:97`) |
| `DEUS_HistoricalDemographics` | `game/js/plugins/DEUS_HistoricalDemographics.js` | Colonist demographic cohorts, age distribution, lineage data (loaded by `DEUS_Core.js:98`) |
| `DEUS_DeathForensics` | `game/js/plugins/DEUS_DeathForensics.js` | Cause of death analysis, fatal wound logging (loaded by `DEUS_Core.js:99`) |
| `UF_Households` | `game/js/plugins/UF_Households.js` | Kinship, family groupings, domestic dwelling allocation (loaded by `DEUS_Core.js:103`) |
| `DEUS_Minimap` | `game/js/plugins/DEUS_Minimap.js` | Overhead radar map rendering (loaded dynamically by `DEUS_Camera.js:624`) |
| `sim/hydro` | `game/js/sim/hydro/` | Deep aquifer and hydraulic simulation modules (required by `DEUS_Fluid.js:984`) |
| `sim/rules` | `game/js/sim/rules/` | SRD 5.1 mechanics and ability score resolution (required by `DEUS_Combat.js`) |
| `sim/ledger` | `game/js/sim/ledger.js` | Closed-mass matter conservation ledger (DEC-040; verified by gate suites) |

---

## 2. Frozen Systems (Loaded, Postponed, or Pending Archival)
Subsystems preserved in the repository whose runtime expansion or feature additions are frozen pending the completion of Natural World v1:

### A. Phase-Locked Systems
| Subsystem | File / Path | Freeze Authority | Current Status |
|---|---|---|---|
| Civilization & Colonists | `DEUS_Colonists.js`, `DEUS_ColonyOverseer.js`, `DEUS_Jobs.js`, `DEUS_Ownership.js` | DEC-037 Natural World Lock | Code loaded; feature development frozen |
| Factions & Society | `DEUS_Factions.js`, `DEUS_FactionMenus.js`, `DEUS_History.js` | DEC-037 Natural World Lock | Code loaded; societal expansion frozen |
| Economy & Coinage | `DEUS_Mint.js` | DEC-040 / DEC-037 | Candidate for lifecycle weight ledger when economy unfreezes |

### B. Unwired Plugins (Scheduled for Archival in L4)
The following 9 plugins in `game/js/plugins/` are not loaded in `plugins.js` and have no active runtime imports:
- `DEUS_Move8.js`
- `DEUS_DepthCues.js`
- `DEUS_DepthDemo.js`
- `DEUS_CombatRT.js`
- `DEUS_CombatUI.js`
- `DEUS_LayerOverlays.js`
- `DEUS_Mint.js`
- `DEUS_Taming.js`
- `DEUS_WorldItems.js`

### C. Secondary Clock (Scheduled for Archival in L3)
- `UF_Time.js` (`game/js/plugins/UF_Time.js`): Unloaded second clock; scheduled for L3 archival.

### D. Shims / Forwarders (41 Files Scheduled for Archival in L2)
The following 41 sixteen-line `PluginManager.loadScript` forwarders remain in `game/js/plugins/` until L2 archival:
`UF_Anim.js`, `UF_Camera.js`, `UF_Colonists.js`, `UF_ColonyOverseer.js`, `UF_Combat.js`, `UF_Core.js`, `UF_DayNight.js`, `UF_Doors.js`, `UF_Ecology.js`, `UF_Environment.js`, `UF_FactionMenus.js`, `UF_Factions.js`, `UF_Fire.js`, `UF_Floors.js`, `UF_Fog.js`, `UF_Generator.js`, `UF_History.js`, `UF_Interact.js`, `UF_Items.js`, `UF_Jobs.js`, `UF_Levels.js`, `UF_Look.js`, `UF_Minimap.js`, `UF_Movement8D.js`, `UF_NaturalConnections.js`, `UF_Objects.js`, `UF_Ownership.js`, `UF_Perspective25D.js`, `UF_Select.js`, `UF_Sheet.js`, `UF_Speech.js`, `UF_Stance.js`, `UF_Talk.js`, `UF_Test.js`, `UF_Tiles.js`, `UF_TimeSpeed.js`, `UF_Visuals.js`, `UF_Walls.js`, `UF_Wildlife.js`, `UF_World.js`, `UF_WorldGen.js`.

---

## 3. In Review
Active tasks, open branches, and pending review submissions:

### A. Active Lanes in Review / In Flight
| Branch | Lane / Task | Scope | Status |
|---|---|---|---|
| `task/lane-db` | `lane-db` (`WG.00.44`) | Sim loader & test hook scanner (7cc12f1f) | MERGE READY (Step 1): Grok review `c727ebed` CLEAN PASS; all 6 gates exit 0 |
| `task/lane-dc` | `lane-dc` (`WG.CELL-WRITE`) | Fixed-arity hash speed optimization | MERGE READY (Step 2): Codex review `ab1e36ec` CLEAN PASS; idle-host speed median 3004.8 ms <= 5000 ms |
| `task/lane-do` | `lane-do` (`NAT.02.MASS`) | Conserved mass centipound tables | MERGE READY (Step 3): Grok review `5b4b8bcc` CLEAN PASS; full zrange matrix 7 pass |
| `task/lane-co` | `lane-co` (`OPS.PRUNE.02`) | L2: Archive 41 `UF_*.js` shims & retarget tools | In Review: Grok review `cc3f12d1` CLEAN PASS, 10/10 gates PASS |
| `task/lane-ct` | `lane-ct` (`OPS.PRUNE.05`) | G05: Rule-4 Test Failure Path Fixes across 16 harnesses | In Review: Grok review `4e3f45ee` CLEAN PASS, merge_gate dry-run PASS |
| `task/lane-cu` | `lane-cu` (`OPS.PRUNE.06`) | G06: L6 Docs Archival & Canonical Renaming (33 live, 15 archive) | In Review: Grok review `190392c5` CLEAN PASS, 15,175 preservation assertions pass |
| `task/art-temperate-induction` | Parked Induction | 64 temperate batch 1 assets (Outside_A2, Dungeon_A2, V8 props) | PARKED at `90c82ac5` pending QA & Owner YEA; catalogue slot: rebase over the lane-cu merge before its next catalogue write (G02 wave 5) |
| `task/lane-a` | `lane-a` (`WG.00.08`) | WG.00.08 Exit Criteria | In Review (`16fec107`) |
| `task/lane-bd` | `lane-bd` (`DEUS-TSK-ZRANGE-HARNESS`) | Z-Range harness verification | In Flight (`3ea1ab69`) |
| `task/lane-bj` | `lane-bj` | WG.84.01 20-seed procedural worldgen QA | AUDIT DELIVERED / DEFECT EVIDENCE (d134315d) |
| `task/lane-bp` | `lane-bp` | Fluid boundary review | In Flight (`79bf40be`) |
| `task/lane-ca` | `lane-ca` | Strata boundary review | In Flight (`000341d8`) |
| `task/lane-ce` | `lane-ce` | World generation test harness | In Flight (`7d7bba11`); catalogue slot: it changes catalogue.json, build_catalogue.js, ASSET_REQUESTS.md and UF_WorldCatalog.json, so it rebases over the lane-cu merge and waits for the slot (G02 wave 5) |
| `task/lane-cf` | `lane-cf` | Natural connections verification | In Flight (`5e60e59b`) |
| `task/lane-cl` | `lane-cl` | Autotile seam testing | In Flight (`b7d22aaf`) |
| `task/lane-e` | `lane-e` (`WG.00.09`) | Pre-attack on depth rendering | PAUSED at 05948e9c |
| `task/lane-h` | `lane-h` (`WG.00.08`) | Z-2 cut proof & fluid hardening | In Review (`e3af4cfa`) |
| `task/lane-pm-streamline` | `lane-pm-streamline` | PM tooling streamlining | In Flight (`472de247`); catalogue slot: it changes ASSET_REQUESTS.md and 10 other catalogue-pinned files, so it rebases over the lane-cu merge and waits for the slot (G02 wave 5) |
| `task/lane-pg` | `lane-pg` (`WG.20.03`) | RMMZ-format catalogue rows for the PM's art scope (72 rows, 20 re-forms, AR-2200..AR-2205; rows only, no art); writer claude; files: lane.json allowedPaths | Merged 2026-10-01 (`239fe4da`, Grok CLEAN PASS, MiniMax answerability MERGE YES); the catalogue slot is released |

**Catalogue slot (WORK-GATE G02 section 4, wave 5).** One writer at a time changes `art/catalogue/**`, `docs/art/catalogue/**`, `tools/art/build_catalogue.js`, `docs/ASSET_REQUESTS.md`, or a file that `art/catalogue/catalogue.json` pins under `sources` (55 files, among them `AGENTS.md`, `docs/OWNER_DECISIONS.md`, `docs/worldgen/DEUS_WORLDGEN_WBS.md` and `game/data/UF_WorldCatalog.json`). After each such change lands on main, the PM runs `node tools/art/build_catalogue.js --check` in a clean clone of main (in main's working tree the git-ignored `art/prompts/*.json` files make it fail); on DIFF, the next slot write is the PM's pin refresh. merge_gate tests the lane tip, not main after the merge, so nothing else writes the slot while a lane holds it. External branches (`task/art-temperate-induction`, `task/lane-ce`, `task/lane-pm-streamline`; `task/lane-cs` is reference only) rebase over the lane-cu merge before their next slot write and write only as the named holder. Holder: `lane-pg` (WG.20.03, catalogue rows), from its launch on 2026-10-01 to its merge; the PM makes no slot write meanwhile (governance records to pinned files wait). Then the PM (governance records and pin refreshes). Next after that: `lane-fl` (ART.NAT.01, wave 5), from launch to merge. **Accepted residual (WORK-GATE verdict on the deadline records, item C):** no tool enforces this one-writer rule. Until one does, the PM's duty after each pin refresh, and after each merge that touches a slot path or a pinned file, is: run `node tools/art/build_catalogue.js --check` in a clean clone of main; record the result and the current holder in this section; and compare `git log -3 --format=%h:%s -- art/catalogue/catalogue.json` with the holder named here. A writer that is not the holder stops that lane until the PM has rebuilt and refreshed the pins.

### B. Merged or Reference Branches
| Branch | Lane / Task | Scope | Status |
|---|---|---|---|
| `task/lane-cq` | `lane-cq` (`OPS.PRUNE.01`) | L1: STATUS.md control board + `tools/test_control_board.js` | Merged to main `1b1ee241` (historical reviews 4a5fc62a / 6f53ca64 / 4f92e516) |
| `task/lane-cr` | `lane-cr` (`OPS.PRUNE.PACE`) | PACE telemetry & budget rate governor (`tools/ops/pace.js`) | Merged to main `cb3428f8` |
| `task/lane-cs2` | `lane-cs2` (`WG.20.02`) | CARDS-1 fixes & DEC-045 catalogue moisture rows | Merged to main `29e33685` |
| `task/lane-cw` | `lane-cw` (`NAT.03.01`) | DEUS_Fluid & sim/hydro correctness (items a-h) | Superseded by `lane-cw2` (manifest tampered) / Reference |
| `task/lane-cw2` | `lane-cw2` (`NAT.03.01`) | DEUS_Fluid & sim/hydro correctness (items a-h), PM-repackaged | Merged to main `5247cdbd` |
| `task/lane-cx` | `lane-cx` (`WG.00.42`) | WorldGen quick fixes: start_in_middle, ground-view timeout, one level-key scheme | Merged to main `4f16a6c9` |
| `task/lane-cs` | `lane-cs` (`WG.20.02`) | CARDS-1 fixes & DEC-045 catalogue moisture rows | Superseded by `lane-cs2` / Reference; never merged and never writes the catalogue again (G02 wave 5) |
| `task/lane-b` | `lane-b` (`WG.00.11`) | ATK-YEAR0-001 Hardening | Integrated / Reference (`ed757456`) |
| `task/lane-bb` | `lane-bb` | Subterranean volume review | Merged to main; worktree pruned |
| `task/lane-bt` | `lane-bt` | Strata boundary review | Merged to main; worktree pruned |
| `task/lane-bu` | `lane-bu` | Worldgen review & QA tests | Merged to main; worktree pruned |
| `task/lane-bv` | `lane-bv` | Physical space review | Merged to main; worktree pruned |
| `task/lane-bw` | `lane-bw` | Climate review | Merged to main; worktree pruned |
| `task/lane-by` | `lane-by` | Matter review | Merged to main; worktree pruned |
| `task/lane-bz` | `lane-bz` | Tooling & blank templates | Merged to main; worktree pruned |
| `task/lane-cm` | `lane-cm` (`WG.00.41`) | Deep cuts & DEC-030 mountain cap ceiling (+11) | Merged to main (`7bbe7f6c`) |

---

## 4. Defect / Unproved
Tracked defects, unverified contracts, and quarantined checks:

| Issue / Contract | Reference | Description | Status |
|---|---|---|---|
| Rule 14 Multi-Domain Time | `game/js/plugins/DEUS_Core.js` | AGENTS.md Rule 14 multi-domain time tags are not implemented by the running clock. | KNOWN DEFECT (Reported, preserved) |
| Z-2 Cut Proof Quarantine | `tools/test_generated_z2_cut_proof.js` | Quarantined in `gate_tests.json`: exits 1 on main; Lane H rework in progress. | QUARANTINED |
| ATK-YEAR0-001 | `tasks/WG.00.08/defects.jsonl` | Year 0 world age materialization edge cases. | OPEN |
| `NAT.02.01` | `tasks/NAT.02.01/lane-bv` | kernel is a stub (no rubble, no ledger posting); review `fdb5c0a0` missed it | REOPENED (2026-10-01, WORK-GATE G02): rebuilt as NAT.02.01 parts 1-6, first lane-en; PKG-02 reopened in `tasks/wbs_registry.json` |
| NaturalConnections in-game suite | `tasks/NAT.03.02/lane-el/evidence/f5_base_seed7/results.txt` | Fails at main before lane-el and unchanged by it: seed 7 `dry_supported_landings`, `invalid_f6_keeps_order`, `reverse_traversal`, `keyboard_order_moves_unit`; seed 20260919 `generated_chain` (so the liquid checks do not run on that seed) | KNOWN DEFECT (recorded 2026-10-01 by the PM, lane-el amendment 2; a fix needs its own lane) |
| `L8 loose files on main` | PM check 2026-09-30 | cited commit does not exist in any repo; AG records NOT DONE | UNPROVED / NOT DONE |
| Climate Hold Disposition | `tasks/NAT.05.01/lane-bw` | DEC-037 Natural World phase lock: climate deferred pending upstream water/soil authorities per DEC-037 (NAT.03.01 / NAT.04.01); soil itself deferred by DEC-057, climate deferred with flora (DEC-057/059) | FROZEN / PENDING GATES |
| Legacy unresolved issues | `docs/archive/STATUS_LEDGER_20260930.md#4` | Legacy unresolved issues (ledger section 4): closure UNVERIFIED; migration grants no cleanup permission | UNVERIFIED |

---

## 5. Archived Systems
Files moved to `archive/` per Owner prune rulings (verified absent from `game/`):

| Original Path | Archive Path | Ruling |
|---|---|---|
| `game/js/plugins/DEUS_Agriculture.js` | `archive/plugins/DEUS_Agriculture.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_BootstrapData.js` | `archive/plugins/DEUS_BootstrapData.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Construction.js` | `archive/plugins/DEUS_Construction.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Crafting.js` | `archive/plugins/DEUS_Crafting.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_CultureGrowth.js` | `archive/plugins/DEUS_CultureGrowth.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_DFCombat.js` | `archive/plugins/DEUS_DFCombat.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_DFWorld.js` | `archive/plugins/DEUS_DFWorld.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Dialogue.js` | `archive/plugins/DEUS_Dialogue.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_FarmView.js` | `archive/plugins/DEUS_FarmView.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_FireSafety.js` | `archive/plugins/DEUS_FireSafety.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Goals.js` | `archive/plugins/DEUS_Goals.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Gumps.js` | `archive/plugins/DEUS_Gumps.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Households.js` | `archive/plugins/DEUS_Households.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_NPCSchedules.js` | `archive/plugins/DEUS_NPCSchedules.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Outposts.js` | `archive/plugins/DEUS_Outposts.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Proficiency.js` | `archive/plugins/DEUS_Proficiency.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_ProfileTabs.js` | `archive/plugins/DEUS_ProfileTabs.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Resources.js` | `archive/plugins/DEUS_Resources.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Roads.js` | `archive/plugins/DEUS_Roads.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Rules.js` | `archive/plugins/DEUS_Rules.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Sanitation.js` | `archive/plugins/DEUS_Sanitation.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_SettlementPillars.js` | `archive/plugins/DEUS_SettlementPillars.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Skills.js` | `archive/plugins/DEUS_Skills.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Time.js` | `archive/plugins/DEUS_Time.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Agriculture.js` | `archive/plugins/UF_Agriculture.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_BootstrapData.js` | `archive/plugins/UF_BootstrapData.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Callings.js` | `archive/plugins/UF_Callings.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Conditions.js` | `archive/plugins/UF_Conditions.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Construction.js` | `archive/plugins/UF_Construction.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Containers.js` | `archive/plugins/UF_Containers.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Crafting.js` | `archive/plugins/UF_Crafting.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_CultureGrowth.js` | `archive/plugins/UF_CultureGrowth.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_DFCombat.js` | `archive/plugins/UF_DFCombat.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_DFWorld.js` | `archive/plugins/UF_DFWorld.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Dialogue.js` | `archive/plugins/UF_Dialogue.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_FarmView.js` | `archive/plugins/UF_FarmView.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_FireSafety.js` | `archive/plugins/UF_FireSafety.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_FogOfWar.js` | `archive/plugins/UF_FogOfWar.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Goals.js` | `archive/plugins/UF_Goals.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Gumps.js` | `archive/plugins/UF_Gumps.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_NPCSchedules.js` | `archive/plugins/UF_NPCSchedules.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Outposts.js` | `archive/plugins/UF_Outposts.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_ProcGen.js` | `archive/plugins/UF_ProcGen.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Proficiency.js` | `archive/plugins/UF_Proficiency.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_ProfileTabs.js` | `archive/plugins/UF_ProfileTabs.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Resources.js` | `archive/plugins/UF_Resources.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Roads.js` | `archive/plugins/UF_Roads.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Rules.js` | `archive/plugins/UF_Rules.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Sanitation.js` | `archive/plugins/UF_Sanitation.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_SettlementPillars.js` | `archive/plugins/UF_SettlementPillars.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Skills.js` | `archive/plugins/UF_Skills.js` | Owner 2026-09-30 prune ruling |

---

## Stand-ins
The U7 files below stay on disk and nothing in the catalog draws them. The inventory tool reads this list: every backticked file on a bullet line counts as a U7 stand-in wherever it is used, so U7-derived files without the prefix must be named here. Format: `- <files> | source | historical usage notes: what still names them`.
- People: every `$U7_*` person sheet (`$U7_Adam*`, `$U7_Eve*`, `$U7_Townsman.png`, `$U7_Townswoman.png`, `$U7_Guard.png`, `$U7_Ranger.png`, `$U7_Goblin.png`, `$U7_Orc.png`, `$U7_Gnome.png`, `$U7_DwarfGuard.png`, `$U7_Miner.png`, `$U7_Blacksmith.png`, `$U7_Fighter*`, `$U7_Automaton.png` and the rest), and without the prefix `$Adam.u7bak.png`, `$Eve.u7bak.png` (the U7 files that were $Adam.png and $Eve.png, byte-identical to each other) and `$People1.png` | SHAPES.VGA 458 / 452 (Adam, Eve, tiers 0â€“2), 462 / 463 (tier 3), 720 (guard), 265 (townsman, `$People1.png`), 460 (ranger); 3Ã—, E/W transposed | RMMZ editor data (not drawn in play, see above): `$U7_Miner`, `$U7_DwarfGuard`, `$U7_Blacksmith` (Actors.json actors 2, 5, 8 and Map001 events), `$U7_Goblin` (a Map001 event); test suites (grep of game/js/plugins at 11:20): `$U7_Townsman`, `$U7_Ranger`, `$U7_Guard`, `$U7_Goblin` (UF_Factions, UF_Fire, UF_Interact, UF_Items, UF_Jobs, UF_Look, UF_Objects, UF_Roads, UF_Skills, UF_Stance, UF_Talk fallback, UF_TimeSpeed, UF_Wildlife, UF_World), `$People1` (UF_Floors 457)
- Creatures: every `$U7_*` creature sheet (`$U7_Deer.png`, `$U7_Wolf.png`, `$U7_Dog.png`, `$U7_Hare.png`, `$U7_Fox.png`, `$U7_Horse.png`, `$U7_Sheep.png`, `$U7_Ox.png`, `$U7_Aurochs.png`, `$U7_Chicken.png`, `$U7_WildBird.png`, `$U7_Hawk.png`, `$U7_Rat.png`, `$U7_Bat.png`, `$U7_CaveBat.png`, `$U7_Serpent.png`, `$U7_Snake.png`, `$U7_Cat.png`, `$U7_Spider.png`, `$U7_CaveSpider.png`, `$U7_CaveCrawler.png`, `$U7_CaveLurker.png`, `$U7_Troll.png`, `$U7_BogHorror.png`, `$U7_Skeleton.png`) | SHAPES.VGA 811, 498, 716, 523, 970, 537, 510, 496, 495, 555, 865, 493, 530, 502, 500, 727 and others, 3Ã—, E/W transposed (AR-401 to AR-403) | test suites only: `$U7_Hare` (UF_Colonists, UF_Doors, UF_Interact, UF_Jobs, UF_Stance, UF_Talk fallback), `$U7_Troll` (UF_Stance). The combat rewrite of 2026-09-19 (UF_Combat.js, 10:59) draws spawned hostiles from the catalog species image, no longer `$U7_Wolf` / `$U7_CaveSpider`
- Objects without the prefix: `!$TimberOak.png`, `!$PineTree.png`, `!$FruitTree.png`, `!$BirchTree.png`, `!$SwampTree.png`, `!$DeadTree.png`, `!$TreeStump.png`, `!$BerryBush.png`, `!$WildShrub.png`, `!$TallGrass.png`, `!$Reeds.png`, `!$Wildflowers.png`, `!$GraniteBoulder.png`, `!$IronstoneDeposit.png`, `!$CaveBoulder.png`, `!$LooseStones.png`, `!$CrystalCluster.png`, `!$IronOreVein.png`, `!$CaveMouth.png`, `!$CaveLadder.png`, `!$FallenPillar.png`, `!$OldBones.png`, `!$StrawBed.png`, `!$WallStone.png`, `!$WallWood.png`, `!$Campfire.png` | SHAPES.VGA shapes 181, 306, 328, 310, 332, 325, 313, 672, 619, 321, 323, 314, 342, 341, 343, 353, 747, 916, 389, 705, 360, 650, 683, 365, 362, 739 (each file's sidecar `standInSource`), 3Ã— | RMMZ editor data (not drawn in play, see above): Map002 events, 336 pages (`!$GraniteBoulder` 85, `!$PineTree` 82, `!$IronstoneDeposit` 64, `!$BerryBush` 57, `!$TimberOak` 46, `!$FruitTree` 1, `!$Campfire` 1); test suites: `!$TimberOak` (UF_Look 546, 562â€“566)
- Objects with the prefix: every `!$U7_*` object sheet (`!$U7_TimberOak.png`, `!$U7_PineTree.png`, `!$U7_FruitTree.png`, `!$U7_Flat-toptree.png`, `!$U7_Broadleafgiant.png`, `!$U7_Swamptree.png`, `!$U7_Deadtree.png`, `!$U7_TreeStump.png`, `!$U7_Shrub.png`, `!$U7_TallGrass.png`, `!$U7_Reeds.png`, `!$U7_Wildflowers.png`, `!$U7_LooseStones.png`, `!$U7_Gravel.png`, `!$U7_GraniteBoulder.png`, `!$U7_CaveBoulder.png`, `!$U7_MalachiteOutcrop.png`, `!$U7_GoldVeinOutcrop.png`, `!$U7_IronOreVein.png`, `!$U7_CrystalSpire.png`, `!$U7_SmallCrystals.png`, `!$U7_OldBones.png`, `!$U7_FallenPillar.png`, `!$U7_StrawBed.png`, `!$U7_WallStone.png`, `!$U7_WallWood.png`, `!$U7_CaveMouth.png`, `!$U7_CaveLadder.png`) | SHAPES.VGA, 3Ã—, collision-aligned anchors (AR-021 to AR-023, AR-044, AR-102, AR-103) | test suites only: `!$U7_Flat-toptree` (UF_Look 555, 560), `!$U7_Shrub` (UF_Look 564)
- Items: the 23 `!$U7_Item_*.png` sheets (WoodLog, Firewood, RoughStone, IronOre, LeadOre, Blackrock, GoldNugget, MetalBar, RoughGem, CutGem, PlantFiber, WoolFleece, StrawBundle, SeedPouch, WildBerries, TreeFruit, CaveMushroom, RootVegetable, RawMeat, HaunchMeat, RiverFish, AnimalBone, LeatherHide), and without the prefix `!$UF_Item_Firewood.png`, `!$UF_Item_Fish.png` (byte-identical to U7 item sheets) | SHAPES.VGA item shapes, 3Ã— (AR-200) | nothing
- Ground: `game/img/tilesets/U7_Ground_A1.png`, `U7_Ground_A2.png`, `U7_Outside_A1.png`, `U7_Outside_A2.png`, `U7_Dungeon_A1.png`, `U7_Dungeon_A2.png`, `U7_Fortress_B.png`, `U7_Glade_B.png` | SHAPES.VGA flat shapes 4, 23, 5 and others, 3Ã— (AR-001) | nothing (the catalog's tileset is the code-drawn UF_GenGround_A2 with stock Outside_A1, Outside_B and Outside_C)
- UI still drawn in play: `game/img/faces/U7_Faces.png` (8 portraits), `game/img/system/u7_gump_*.png` (container gumps; `gump_test.png`, `gump_backpack.png`, `gump_barrel.png`, `gump_sack.png` below are byte copies) | FACES.VGA and GUMPS.VGA shapes 0, 1, 2, 5, by tools/extract_u7_assets.ps1 (lines 83â€“180) | drawn in play: UF_Dialogue 271 and UF_Gumps 215 (faces), UF_Gumps 104â€“108 (gumps); RMMZ editor data: Actors.json faces of actors 2â€“9. Not swapped: a code change, see above
- UI and other extractions, unused: `game/img/system/U7_Window.png`, `U7_Cursor.png`, `U7_Select.png`, `U7_Pointer.png`, `U7_HandPointer.png`, `game/img/system/u7_gumps/`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png` | earlier extraction, sources not recorded | nothing

