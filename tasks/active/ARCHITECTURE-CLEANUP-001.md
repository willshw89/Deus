# ARCHITECTURE-CLEANUP-001: Project DEUS Architectural Streamlining & System Pruning

**Task ID:** ARCHITECTURE-CLEANUP-001  
**Target Repository:** `C:\Users\snewt\OneDrive\Desktop\UF`  
**Date:** 2026-09-22  
**Status:** IN PROGRESS  
**Integration Authority:** Gemini / Antigravity (collaborative architecture maintenance)

---

## 1. Baseline & Recoverability

Before executing any file modifications, an exhaustive cryptographic SHA-256 pre-change inventory of all 11,334 files across the repository was captured outside the workspace:
- **External Inventory Path:** `C:\Users\snewt\.gemini\antigravity\brain\28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0\pre-change-inventory.json`
- **Total Files Tracked:** 11,334
- **Verification Hash Baseline:** Generated 2026-09-22 13:10:29 UTC.

### Rollback Strategy
If any regression occurs:
1. Files listed in the pre-change inventory can be restored from the external baseline record.
2. No git commits or pushes are created.
3. RPG Maker core scripts (`rmmz_*.js`, `libs/`, `main.js`) and third-party dependencies are strictly untouched.

---

## 2. Objective 1: Remove Creature-Menu Subsystems

Completely remove the following 6 subsystems from active runtime and development:
1. **Needs:** Hunger, thirst, sleep, social, need gauges, sleep schedules, thoughts, and mood calculations.
2. **Skills:** Trade and combat skill levels 1–99, XP tracking, and skill progression formulas.
3. **Personality:** Psychological facet sliders, quirks, and personality models.
4. **Goals:** 3-horizon personal goals (destiny, aspirations, achievements), F7 goal window, and goal generation loops.
5. **Family:** Household genealogy, marriage, pregnancy, household expansion, and family tabs.
6. **Culture:** Faction community practices, remembered knowledge, and cultural growth tech.

### Retired & Deleted Plugins (Creature-Menu Subsystems)
- `game/js/plugins/UF_ProfileTabs.js`: Retired and removed from `plugins.js`. Unit left-click inspection reverts to lean, native `UF_Sheet.js` (now `DEUS_Sheet.js`) focusing purely on creature identity, calling/profession, inventory/equipment, and physical health/vitals.
- `game/js/plugins/UF_Goals.js`: Retired and removed from `plugins.js`.
- `game/js/plugins/UF_CultureGrowth.js`: Retired and removed from `plugins.js`.
- `game/js/plugins/UF_Skills.js`: Retired and removed from `plugins.js`.
- `game/js/plugins/UF_Households.js`: Retired and removed from `plugins.js`.
- `game/js/plugins/UF_DFWorld.js`: Personality/naming generation pruned or retired; pure name generation migrated to lean utility if needed.

### Pruning within Core Plugins
- `UF_Sheet.js` (now `DEUS_Sheet.js`): Strip need gauges, thoughts, personality facets, family references, and skill displays. Keep identity, inventory, equipment, and health.
- `UF_Colonists.js` (now `DEUS_Colonists.js`): Strip `tickNeeds()`, `progressAging()`, `progressPregnancies()`, `stepFactionReproduction()`, `ensureColonistsGeneticsAndAging()`.

---

## 3. Objective 2: Wipe the AI Subsystem

Completely wipe autonomous AI decision loops, background schedulers, planners, and behavior trees from the active runtime:

### Autonomous AI Removed
- `UF_Colonists.js`:
  - Wipe autonomous decision loop: `scan()`, `decide()`, `autonomousFrontierProgression`.
  - Wipe survival AI routines: `findFood()`, `findDrink()`, `findSleep()`, `takePlanStep()`, `preemptForNeeds()`.
  - Wipe population/spawning AI: `stepImmigration()`, `stepMerchantCaravan()`.
- `UF_Wildlife.js`:
  - Wipe autonomous wander/flee/graze runtime update loop (`stepWander`, `stepFlee`, `stepGraze`, `stepHunt`).
- `UF_NPCSchedules.js`: Deleted (legacy 24-hr event routine AI).
- `UF_Outposts.js` & `UF_SettlementPillars.js`: Retired (autonomous outpost AI).
- `UF_Dialogue.js`: Deleted (legacy Kaldurath NPC dialogue).

### Core Capabilities Preserved (Non-AI)
- **Movement & Pathfinding:** 8-directional movement, collision, passability, and A* pathfinding preserved as a neutral navigation engine for player-directed orders.
- **Player Input & Direct Control:** Mouse click selection, right-click context menu, order assignment (`order(move)`), and manual unit commands.
- **Manual Job Execution:** `UF_Jobs.js` (now `DEUS_Jobs.js`) preserved as the neutral execution engine. When player designates a task (chop, mine, build, haul, move), workers execute designated jobs deterministically.
- **Rendering & Presentation:** Sprite animations, 2.5D axonometric projection, camera tracking, day/night cycles, fog of war, and UI inspectors.
- **World & Data:** Grid coordinates, chunk loading, tile layers, terrain arrays, object registry, and inventory/equipment systems.

---

## 4. Objective 3: Rename Project-Owned References to DEUS

Rename project-owned references across code, manifests, configs, and active documentation to `DEUS` / `deus`:

### Plugin Renaming (`game/js/plugins/UF_*.js` -> `game/js/plugins/DEUS_*.js`)
| Current Plugin | New Plugin Name | Status / Action |
|---|---|---|
| `UF_Core.js` | `DEUS_Core.js` | Rename & update namespace |
| `UF_World.js` | `DEUS_World.js` | Rename & update namespace |
| `UF_WorldGen.js` | `DEUS_WorldGen.js` | Rename & update namespace |
| `UF_Tiles.js` | `DEUS_Tiles.js` | Rename & update namespace |
| `UF_Objects.js` | `DEUS_Objects.js` | Rename & update namespace |
| `UF_Walls.js` | `DEUS_Walls.js` | Rename & update namespace |
| `UF_Floors.js` | `DEUS_Floors.js` | Rename & update namespace |
| `UF_Doors.js` | `DEUS_Doors.js` | Rename & update namespace |
| `UF_Items.js` | `DEUS_Items.js` | Rename & update namespace |
| `UF_Jobs.js` | `DEUS_Jobs.js` | Rename & update namespace (Manual Job Execution preserved) |
| `UF_Colonists.js` | `DEUS_Colonists.js` | Rename, strip autonomous AI & needs |
| `UF_Wildlife.js` | `DEUS_Wildlife.js` | Rename, strip autonomous wander loop |
| `UF_Movement8D.js` | `DEUS_Movement8D.js` | Rename & update namespace |
| `UF_Perspective25D.js` | `DEUS_Perspective25D.js` | Rename & update namespace |
| `UF_ColonyOverseer.js` | `DEUS_ColonyOverseer.js` | Rename & update namespace (Player camera & selection preserved) |
| `UF_Construction.js` | `DEUS_Construction.js` | Rename & update namespace |
| `UF_Combat.js` | `DEUS_Combat.js` | Rename & update namespace |
| `UF_Anim.js` | `DEUS_Anim.js` | Rename & update namespace |
| `UF_Fog.js` | `DEUS_Fog.js` | Rename & update namespace |
| `UF_DayNight.js` | `DEUS_DayNight.js` | Rename & update namespace |
| `UF_TimeSpeed.js` | `DEUS_TimeSpeed.js` | Rename & update namespace |
| `UF_Camera.js` | `DEUS_Camera.js` | Rename & update namespace |
| `UF_Speech.js` | `DEUS_Speech.js` | Rename & update namespace |
| `UF_Look.js` | `DEUS_Look.js` | Rename & update namespace |
| `UF_Interact.js` | `DEUS_Interact.js` | Rename & update namespace |
| `UF_Sheet.js` | `DEUS_Sheet.js` | Rename, strip needs/skills/goals/family/culture |
| `UF_Levels.js` | `DEUS_Levels.js` | Rename & update namespace |
| `UF_Environment.js` | `DEUS_Environment.js` | Rename & update namespace |
| `UF_NaturalConnections.js` | `DEUS_NaturalConnections.js` | Rename & update namespace |
| `UF_FactionMenus.js` | `DEUS_FactionMenus.js` | Rename & update namespace |
| `UF_Visuals.js` | `DEUS_Visuals.js` | Rename & update namespace |
| `UF_Gumps.js` | `DEUS_Gumps.js` | Rename & update namespace |
| `UF_Crafting.js` | `DEUS_Crafting.js` | Rename & update namespace |
| `UF_Factions.js` | `DEUS_Factions.js` | Rename & update namespace |
| `UF_History.js` | `DEUS_History.js` | Rename & update namespace |
| `UF_Ecology.js` | `DEUS_Ecology.js` | Rename & update namespace |
| `UF_Stance.js` | `DEUS_Stance.js` | Rename & update namespace |
| `UF_DFCombat.js` | `DEUS_DFCombat.js` | Rename & update namespace |
| `UF_Fire.js` | `DEUS_Fire.js` | Rename & update namespace |
| `UF_FireSafety.js` | `DEUS_FireSafety.js` | Rename & update namespace |
| `UF_Ownership.js` | `DEUS_Ownership.js` | Rename & update namespace |
| `UF_Generator.js` | `DEUS_Generator.js` | Rename & update namespace |
| `UF_Talk.js` | `DEUS_Talk.js` | Rename & update namespace |
| `UF_BootstrapData.js` | `DEUS_BootstrapData.js` | Rename & update namespace |
| `UF_Test.js` | `DEUS_Test.js` | Rename & update namespace |
| `UF_ProfileTabs.js` | *RETIRED* | Subsystems removed per Objective 1 |
| `UF_Goals.js` | *RETIRED* | Subsystems removed per Objective 1 |
| `UF_CultureGrowth.js` | *RETIRED* | Subsystems removed per Objective 1 |
| `UF_Skills.js` | *RETIRED* | Subsystems removed per Objective 1 |
| `UF_Households.js` | *RETIRED* | Subsystems removed per Objective 1 |
| `UF_DFWorld.js` | *RETIRED* | Subsystems removed per Objective 1 |
| `UF_Dialogue.js` | *RETIRED* | Obsolete prototype removed |
| `UF_NPCSchedules.js` | *RETIRED* | Obsolete prototype removed |

### Catalog & Data Renaming
- `game/data/UF_WorldCatalog.json` -> `game/data/DEUS_WorldCatalog.json`
- Global catalog variable: `$deusWorldCatalog` (with backward-compatible alias `$ufWorldCatalog = $deusWorldCatalog`).
- Global time variable: `$deusTime` (with backward-compatible alias `$ufTime = $deusTime`).
- Root namespace: `window.DEUS` (with `window.UF = window.DEUS` alias during transitional phase).

### Ambiguous Token Decisions & Preserved Elements
- **RPG Maker MZ core engine scripts (`game/js/rmmz_*.js`, `game/js/libs/`, `game/js/main.js`):** STRICTLY UNTOUCHED.
- **Stand-In Reference Assets (`U7_*` sprite files in `game/img/`):** PRESERVED per AGENTS.md Rule 8.
- **Historical Provenance / Credits (`docs/LEGAL.md`, `docs/CREDITS.md`):** Historical references to original games (Ultima VII, Dwarf Fortress) preserved truthfully as attribution.

---

## 5. Verification & Test Plan

1. **Syntax Integrity:**
   - Execute `node -c` across all newly renamed and modified `DEUS_*.js` plugins to guarantee valid JavaScript syntax.
2. **Registry Configuration:**
   - Validate `game/js/plugins.js` lists all active plugins with status `true` and correct dependency ordering.
3. **Core Smoke Tests:**
   - Run `tools/run_tests.js smoke` to verify engine bootstrap, world rendering, tile loading, and core systems.
4. **Character Sheet & Inspection Tests:**
   - Verify unit left-click inspection displays the streamlined sheet cleanly with zero reference errors to retired tabs or subsystems.
5. **Manual Job & Navigation Verification:**
   - Verify neutral movement, pathfinding, player designations, and manual job execution remain 100% operational.
6. **Editor Safety Notice:**
   - Inform user to reload project in RPG Maker MZ editor after `plugins.js` and `game/data/` updates.

