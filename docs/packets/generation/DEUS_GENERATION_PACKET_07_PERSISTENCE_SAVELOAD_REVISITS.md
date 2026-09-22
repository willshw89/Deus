# DEUS GENERATION PACKET 07: PERSISTENCE, SAVE/LOAD & AREA REVISITS

**System Identifier:** `DEUS_GENERATION_PACKET_07_PERSISTENCE_SAVELOAD_REVISITS`  
**Integration Authority:** Owner Terminal (Gemini)  
**Creation Date:** 2026-09-22  
**Target Repository:** `C:\Users\snewt\OneDrive\Desktop\UF`  
**Classification:** Runtime Persistence, Schema Migrations & Delta Tracking Audit  

---

## 1. Runtime Area Synthesis & Conversion

### 1.1 In-Memory Map Synthesis (Fileless Architecture)
- RMMZ disk loading is intercepted in `DEUS_World.js:2369-2397` via `DataManager.loadMapData`.
- Virtual Map IDs ($1000..1004$ corresponding to levels $Z \in [0, 1, 2, -1, -2]$) bypass file I/O entirely.
- Dynamic tilemap is populated with 6 layers (393,216 array elements) and an object grid (`Uint16Array(65536)`).
- **Status:** `IMPLEMENTED & VERIFIED` (`world.in_area_map`).

### 1.2 Virtual Event Spawning
- Entities (colonists, creatures) are injected into RMMZ runtime using offset `EVENT_BASE = 1000` (`DEUS_World.js:786-837`).
- `spawnUnitEvent`, `despawnUnitEvent`, and `reconcileEvents` keep live `Game_Event` instances synchronized without Map JSON disk clutter.
- **Status:** `IMPLEMENTED & VERIFIED` (`world.unit_events`).

---

## 2. Save/Load Lifecycle & Schema Versioning

### 2.1 State Boundary & Serialization
- `DataManager.makeSaveContents` packages `contents.ufWorld = World.state` (`DEUS_World.js:2447-2452`).
- Saved state contains:
  - World seeds and metadata (`seed`, `size`, `startArea`, `nextUnitId`).
  - Unit entity records dictionary (`units`).
  - Sparse tile diffs (`diffs[levelKey][cellIndex]`).
  - Sparse object diffs (`objectDiffs[levelKey][cellIndex]`).
  - Elevation and cavern shape deltas (`levels[z].cells`).
- Baselines, tilemaps, A* paths, and PIXI display sprites are transient and discarded upon save, eliminating save bloat.
- **Status:** `IMPLEMENTED & VERIFIED` (`vertical.persistence`, `vertical.save_size`).

### 2.2 Schema Version 4 & Migrations
- Active schema version is `st.version = 4` (`DEUS_Levels.js:1938`).
- V80 migration engine (`migrate(st, view)`) automatically upgrades pre-V80 saves: assigns 3D Z-coordinates to units, goals, items, and jobs, initializes the 5 levels, and appends migration records without data loss.
- Baseline FNV-1a checksums are recomputed and audited on load to prevent silent world corruption.
- **Status:** `IMPLEMENTED & VERIFIED` (`vertical.persistence`, `vertical.surface_migration`).

---

## 3. Area Revisits & Player Edit Preservation

### 3.1 Sparse Delta Tracking
- Chopping a tree, mining an ore outcrop, digging ground, or constructing a wall modifies sparse diff tables:
  - Tile deltas: `World.setTile` writes `st.diffs[levelKey][idx] = tileId`.
  - Object deltas: `World.setObject` writes `st.objectDiffs[levelKey][idx] = type`.
- Immediate local patching (`patchTile`) updates active display and passability grids without rebuilding the map.
- **Status:** `IMPLEMENTED & VERIFIED` (`world.object_diffs`, `world.diff_persists`).

### 3.2 Area Revisit Behavior
- **LRU Peek Cache (`PEEK_CACHE = 6`):** Re-entering an area currently in cache reuses the `$dataMap` reference instantly (`reused: true`).
- **Cache Miss Rebuild:** Re-entering an evicted area reruns the deterministic procedural generation pass from `seed` and cleanly stamps `st.diffs` and `st.objectDiffs` over the top.
- **Result:** 100% preservation of all harvested resources, constructed walls, doors, and mined tunnels across arbitrary area unloads and reloads.
- **Status:** `IMPLEMENTED & VERIFIED` (`world.diff_persists`, `vertical.persistence`).

