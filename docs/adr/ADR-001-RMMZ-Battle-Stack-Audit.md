# ADR-001: Read-Only Audit of RMMZ Battle Stack & Project DEUS Combat Architecture
**Status:** ACCEPTED  
**Date:** 2026-09-25  
**Author:** Claude (Subagent, Lane C / WG.00.12 Failover)  
**Reviewer:** Gemini (Coordinator / Integration Authority)  
**Context:** WG.00.12 Non-Moving Consolidation & Subsystem Tooling  

---

## 1. Context & Problem Statement

Project DEUS is built upon the RPG Maker MZ runtime, which provides a default JRPG turn-based combat subsystem (`BattleManager`, `Scene_Battle`, `Game_Action`, `Game_Troop`). Project DEUS requires retro-CRPG tactical combat grounded in D&D 5.1 SRD rules, physical terrain elevation, multi-Z visibility, and real-time-with-pause / on-map tactical execution directly within `Scene_Map`.

This audit evaluates the native RMMZ battle stack, documents how DEUS interacts with or bypasses it, and provides architectural boundaries for future combat leaves.

---

## 2. RMMZ Native Battle Subsystem Analysis

### A. Native Core Components
1. **`BattleManager` (`game/js/rmmz_managers.js:2502-3000`)**:
   - Manages state machine: `initMembers()`, `setup()`, `startBattle()`, `update()`, `updatePhase()`, `endBattle()`.
   - Hardcoded around JRPG phased turn execution: `input` -> `turn` -> `action` -> `turnEnd` -> `battleEnd`.
   - Strongly coupled to `$gameTroop` and `$gameParty`.
2. **`Scene_Battle` (`game/js/rmmz_scenes.js:2830-3400`)**:
   - Creates decoupled full-screen battle stage (`Spriteset_Battle`).
   - Windowing: `Window_PartyCommand`, `Window_ActorCommand`, `Window_BattleStatus`, `Window_BattleLog`.
   - Completely unloads or freezes the active tilemap simulation during encounters.
3. **`Game_Action` (`game/js/rmmz_objects.js:1540-1980`)**:
   - Evaluates damage formulas via `eval()` (`item.damage.formula`).
   - Applies state additions/removals, elemental weaknesses, and variance.

---

## 3. Project DEUS Decoupled Combat Model

Project DEUS does **NOT** use `Scene_Battle` or standard `BattleManager` transitions.

### A. On-Map Spatial Combat (`Scene_Map`)
- **Spatial Positioning**: All combatants (colonists, bandits, wildlife, monsters) exist as entities/events on the active multi-Z map grid (`DEUS_World.js`, `DEUS_Combat.js`).
- **D&D 5.1 SRD Action Economy**: Governed by `DEUS_Dnd5e.js` (Action, Bonus Action, Reaction, Movement speed in 5 ft increments).
- **Physical Elevation Advantage**: Tactical calculations incorporate strata elevation difference (`Levels.worldStrataElevationAt`), high-ground attack bonuses, and low-ground cover penalties.
- **Weapon Reach & Line-of-Sight**: Melee reach (5 ft / 10 ft reach) and ranged trajectories (longbow, recurve bow) trace raycast visibility across five-strata terrain without entering a separate scene.
- **Death & Forensic Tracking**: Controlled by `DEUS_DeathForensics.js` (tracked by weapon type, damage type: slashing, piercing, bludgeoning, fire, falling).

---

## 4. Architectural Decisions & Boundaries

1. **Keep RMMZ Battle Files Completely Read-Only**:
   - Under AGENTS.md Rule 9, `game/js/rmmz_*.js` remains unmodified.
   - Do NOT attempt to bend or alias `Scene_Battle` into an on-map tactical interface.
2. **On-Map Combat Subsystem Isolation**:
   - All combat logic remains strictly encapsulated in `game/js/plugins/DEUS_Combat.js`, `DEUS_Dnd5e.js`, and `DEUS_Stance.js`.
   - Combat animations execute purely through sprite character animation sheets (`!$filename.png`, 12-sprite layout; AGENTS.md Rule 11 & 12).
3. **Zero Allocation in Combat Updates**:
   - Combat target acquisition and distance evaluation must avoid allocating temporary objects or vectors inside per-frame updates.
   - Target queries utilize `DEUS_Spatial.js` spatial hashing.
4. **Conclusion & Roadmap Alignment**:
   - The RMMZ battle stack is safely decoupled and inert during live map play.
   - Future tactical combat tasks (e.g. Faction Raids, Colonist Defense) will build exclusively upon `DEUS_Combat.js` on `Scene_Map`.
