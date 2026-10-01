# Architecture Decision Record (ADR) — Project DEUS RMMZ Integration

**Document Reference**: `docs/rmmz/architecture-decisions.md`  
**Status**: APPROVED / ARCHITECTURAL BASELINE  
**Integration Authority**: Single designated integration authority for shared canonical commits  
**Repository Root**: `C:\Users\snewt\OneDrive\Desktop\UF`  
**Installed Target Engine**: RPG Maker MZ v1.10.00 (`RPGMZ.exe` v1.10.0.0, Core Scripts v1.10.0, NW.js v0.48.4)  

---

## 1. Context and Problem Statement

Project DEUS requires a complex, multi-system simulation: autonomous colony management, 2.5D axonometric projection, dynamic volumetric strata (5 levels), discrete multi-domain time, fine-grained physical resources, and SRD 5.1 capability resolution. 

RPG Maker MZ (RMMZ) provides a battle-tested desktop runtime shell (Chromium/NW.js), WebGL rendering via PixiJS, audio/asset management, font rendering, and windowing. However, RMMZ is fundamentally designed for 2D tile-grid JRPGs with static maps, single-character avatar movement, and synchronous turn-based or event-driven interaction.

This audit establishes explicit architectural boundaries between the neutral simulation engine and RPG Maker MZ.

---

## 2. Decision Topics & Directives

### 2.1 Neutral Simulation versus RPG Maker Integration
- **Decision**: The core simulation (World, WorldGen, Entities, Time, Capabilities, Jobs, Inventory, Resources, Construction, Pathfinding, AI, Combat) must remain **engine-neutral plain JavaScript** (`UF_*.js` / `DEUS_*.js`).
- **Rationale**:
  1. Simulation rules must be 100% testable in headless Node.js test harnesses without requiring DOM, WebGL, or NW.js execution.
  2. Presentation never defines simulation truth. A closed UI window, an off-screen entity, or an occluded sprite cannot alter game rules or inventory counts.
  3. No circular subsystem coupling: Simulation never queries UI elements or Pixi display trees.
- **Enforcement**: Domain logic depends only on lower-tier simulation modules (`DATA -> CORE -> SERVICES -> EXECUTION -> PRESENTATION`).

### 2.2 Bridge Ownership (`WF_MZBridge` / Engine Hook Gateway)
- **Decision**: All invasive prototype hooks and engine monkey-patching into RMMZ classes (`Scene_Boot`, `Scene_Title`, `Scene_Map`, `DataManager`, `StorageManager`, `Game_Map`, `Game_Player`) must be owned exclusively by a single gateway boundary.
- **Rationale**:
  In uncontrolled plugin architectures, multiple plugins alias the same prototype methods (e.g. `Game_Map.prototype.update`), leading to alias ordering bugs, recursive loops, duplicate listeners, and un-debuggable stack traces.
- **Directive**:
  - In the historical WAYFARER proof framework, `packages/mz-core/src/WF_MZBridge.js` served as this exclusive hook.
  - In the unified canonical DEUS project (`C:\Users\snewt\OneDrive\Desktop\UF`), `DEUS_Core.js` acts as the authoritative engine integration gateway.
  - Domain plugins must NEVER independently alias `rmmz_*.js` prototypes directly; they register callbacks with `DEUS.Core` or emit lifecycle events (`world:created`, `world:areaBuilt`).

### 2.3 Map and World-Data Responsibilities
- **Core Question**: Should DEUS treat RPG Maker maps as primary world representation, or host maps with neutral simulation data driving rendering?
- **Decision**: RPG Maker maps are **host maps and entry points only**. Neutral world data drives simulation, collision, passability, and rendering.
- **Rationale**:
  - A standard RMMZ map is a static 2D grid stored in JSON (`Map001.json`). DEUS operates on a 256×256 continuous world across 5 volumetric strata (Surface, Canopy, Soil, Cavern, Deep Underworld), totaling > 327,000 cells per macro-area.
  - Disk-backed RMMZ maps cannot efficiently store dynamic voxel states, moisture grids, mineral strata, and emergent structures.
  - `DEUS_World.js` intercepts `DataManager.loadMapData` and dynamically synthesizes an in-memory `$dataMap` projection of the active viewing area. The editor map (`Map001.json`, "The Bastion of Kraghold") exists strictly as a host container and tileset reference template for the RMMZ engine.

### 2.4 Render-Layer Ownership & 2.5D Projection
- **Decision**: The Pixi display tree hierarchy is owned by `Spriteset_Map`, but custom 2.5D axonometric projection, dynamic depth sorting, and canopy occlusion are owned by `DEUS_Perspective25D.js` and `DEUS_Tiles.js`.
- **Directives**:
  1. Standard RMMZ depth sorting (`Tilemap.prototype._compareChildOrder`: `a.z - b.z` then `a.y - b.y`) is augmented by calculated topological keys:
     $$\text{DepthKey} = (Z \times 10000) + (Y \times 100) + X$$
  2. Dwarf-Fortress-Style Black Wall-Top Convention: For 2-grid-high walls (48×96 px), the upper 48 px cap displays flat near-black (`#08080C` to `#121218`) with minimal edge definition, creating an unbroken horizontal black occlusion line connecting with DEUS darkness language.
  3. No code-driven after-effects: All animations must come from sprite sheet stepping (Nano Banana Pro); no shader wobbling, procedural scaling, or sine-wave swaying.

### 2.5 Input Routing & Interception Boundaries
- **Decision**: Strict layered input hierarchy. Every input event has an unambiguous owner:
  1. **OS / Window Layer**: Captures raw mouse, keyboard, gamepad, and touch events via `Graphics`, `Input`, and `TouchInput`.
  2. **UI & Window Layer**: Custom UI windows (`WindowLayer`, `Window_Base`, `Sprite_Clickable`, Colony Overseer cards) test hit bounds first. If a click falls inside an active window rect, it is consumed (`TouchInput.consumeClick()`), preventing pass-through.
  3. **World / Entity Interaction Layer**: If no UI element consumed the event, `DEUS_Interact` / `DEUS_ColonyOverseer` converts canvas pixels to 3D world coordinates ($X, Y, Z$) using axonometric inverse projection, performing entity selection or cell designation.
  4. **Player Avatar Layer**: Keyboard / Gamepad directional input routes to avatar movement only when Colony Overseer direct-control mode is active.

### 2.6 Persistence & Save-State Boundaries
- **Decision**: Save state must strictly serialize persistent mutable domain data. Never serialize temporary caches, live functions, or Pixi objects.
- **Directives**:
  1. `JsonEx._encode` has NO cycle detection. Any circular reference triggers an unhandled `Error: Object too deep` at depth 100.
  2. Sprites, textures, Bitmaps, DOM nodes, event listeners, pathfinding route tables, and spatial acceleration grids must NEVER be placed in `contents.ufWorld`.
  3. Rule: **Save truth, rebuild cache**. Persistent state saves entity IDs, positions, biological ages, inventory items, and map differential deltas. On `extractSaveContents`, route caches and spatial hash maps are recomputed from scratch.
  4. Versioned schema: Every save payload must contain an explicit `saveSchemaVersion` (e.g. `saveSchemaVersion: 1`) to support forward schema migrations.

### 2.7 MechanicsLab-Only Tooling vs. OriginalGame Production Restrictions
- **Decision**: Strict physical and logical isolation between development/experimental tools and the production game:
  - **MechanicsLab** (`games/MechanicsLab`, decommissioned per user directive 2026-09-22): Archived to `archive/MechanicsLab_backup.zip`. Contained experimental proofs, camera tests, and isolated licensed reference parsers.
  - **OriginalGame / DEUS** (`c:\Users\snewt\OneDrive\Desktop\UF\game`): The single authoritative production game.
  - Production Restrictions: Zero licensed reference code, raw extractors, or development-only test harnesses may ship in the production build. All shipped game content must pass `tools/originality_check.js`.

### 2.8 Generated Plugin Copies & Forwarding
- **Decision**: Single source of truth for plugin implementation:
  - All substantive plugin implementations reside in `game/js/plugins/DEUS_*.js`.
  - Legacy `UF_*.js` files serve strictly as lightweight backward-compatibility forwarders pointing to `DEUS_*.js`.
  - Plugin metadata (`@plugindesc`) and descriptions in `game/js/plugins.js` must adhere to the standardized `[DEUS <System>]` format.

### 2.9 Dynamic Asset Loading & Defensive Error Handling
- **Decision**: Implement defensive asset pre-validation and graceful fallbacks for missing assets.
- **Rationale**:
  `ImageManager.isReady()` throws a fatal `LoadError` if any bitmap fails to load, halting the entire game loop.
- **Directive**:
  - The engine must register placeholder fallback textures (`$Standin_48x48.png`) when an asset request is pending.
  - `tools/generate_asset_inventory.js` must be run continuously to audit all catalog references against physical disk files.

### 2.10 Deployment Differences (Desktop NW.js vs. Web / Mobile)
- **Decision**: Target Desktop NW.js as the primary deployment platform for Project DEUS.
- **Directives**:
  - Node.js filesystem features (`require('fs')`, `require('path')`) are permitted in desktop tooling, tests, and desktop playtest saves (`StorageManager.saveToLocalFile`).
  - Web deployments (if ever enabled) must route through `localforage` (IndexedDB) and cannot access Node APIs.

### 2.11 Performance Limitations & Frame Budgets
- **Decision**: Hard budget of 16.6 ms per frame (60 FPS):
  1. **No global full-world scans every frame**: Hard performance invariant. All entity lookups, item searches, and resource proximity tests must query spatial hash buckets.
  2. **Entity Ticking**: Synthetic probes prove that up to 1,000 entities can update in < 2 ms. When entity count exceeds 1,000, tick execution must be staggered across 4 distinct time slices (250 entities per frame).
  3. **Rendering**: WebGL draw call batching in PixiJS requires texture atlas packing. Autonomous art pipeline must pack sprites into 144×192 or packed sheet formats (80–100% useful area).

### 2.12 Unresolved Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation Strategy |
|---|---|---|---|
| Window Focus Throttling | NW.js / Chromium halts scene updates when window is minimized or occluded | HIGH | Launch test harnesses with `--disable-background-timer-throttling` and `--disable-renderer-backgrounding`. In production, keep simulation clock tied to high-resolution timestamp deltas. |
| Save File Size Bloat | Save file exceeds RMMZ's 50 KB warning limit under large colonies | MEDIUM | Rely on `pako` deflate (demonstrated 91% compression ratio). Store only differential changes (`objectDiffs`) rather than full 256×256 tile arrays. |
| In-Memory Map Rebuild Stutter | Dynamic generation of 256×256 area during map transfer causes frame drop | LOW | Area generation is cached in `World.buildCache`. Level switching reuses cached builds (`reused: true`), eliminating duplicate generation latency. |
| RMMZ Editor Database Overwrites | Editor overwrites `plugins.js` or `data/*.json` in memory when saved | HIGH | Strict agent protocol: Confirm editor is closed before modifying `data/*.json` or `plugins.js`. Prompt user to restart `RPGMZ.exe` after programmatic updates. |

