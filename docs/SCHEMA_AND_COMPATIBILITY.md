# DEUS — SCHEMA & SAVE COMPATIBILITY GOVERNANCE (v1)
**Authoritative Data Schema & Save State Standard**
**Integration Authority:** Gemini / Antigravity
**Approved by Owner Directive:** 2026-09-25

---

## 1. Executive Summary
DEUS features a deep, persistent world simulation. To ensure game states remain coherent, uncorrupted, and migratable across engine revisions, all persistent data structures follow strict schema versioning, non-destructive migration rules, and the fundamental separation of **simulation truth** from **transient runtime caches**.

---

## 2. Fundamental Save Architecture: Truth vs. Cache

> *"Save truth, rebuild caches."*

When saving game state to disk (`saveJson` / RMMZ `DataManager.saveGame`):
- **SAVE TRUTH (Persistent State):**
  - Strata byte arrays (`m`, `hp`, `connector`, `biome`, `surface`, `caps`).
  - Fluid volumes, temperatures, and dynamic fluid cells.
  - Entity records (colonists, creatures, items, containers, factions) identified by stable IDs.
  - Active world time, historical calendar, weather seeds, and simulation flags.
- **DO NOT SAVE CACHES (Rebuilt upon Load):**
  - Pixi.js textures, sprite objects, bitmaps, and display meshes.
  - Derived walkability matrices, pathfinding grid caches, and spatial search trees.
  - Legacy derived compatibility views (`shapeAt` grids, roof occlusion bitmaps).
  - Volatile UI selections, cursor hover states, and temporary particle pools.

---

## 3. Schema Versioning Pattern

Every saved DEUS world state includes an explicit root version header:

```json
{
  "saveSchemaVersion": 5,
  "gameVersion": "0.1.0-alpha",
  "savedAt": "2026-09-25T14:30:00Z",
  "worldSeed": 18,
  "generatorVersion": 5,
  "subsystems": {
    "world": { "version": 3, "data": { ... } },
    "strata": { "version": 5, "data": { ... } },
    "fluid": { "version": 2, "data": { ... } },
    "entities": { "version": 1, "data": { ... } }
  }
}
```

---

## 4. Lifecycle Stages & Compatibility Obligations

| Development Stage | Current Status | Save Compatibility Obligation | Migration Policy |
|---|---|---|---|
| **PRE-ALPHA** | **ACTIVE (Current)** | Experimental; schema evolution prioritized over backward compatibility. | Breaking saves permitted when explicitly documented in `docs/VISION.md` and `saveSchemaVersion` bumped. |
| **ALPHA** | Future Milestone | Stability; player-created settlements preserved across minor patches. | Non-destructive schema migrations required for all minor updates. |
| **BETA / RELEASE** | Future Milestone | Release Contract; 100% forward compatibility guaranteed across minor releases. | Strict automated migrations; zero unversioned data mutations permitted. |

---

## 5. Non-Destructive Migration Architecture

All schema migrations are registered in an authoritative migrations table within `DEUS_Core.js`:

```javascript
const SCHEMA_MIGRATIONS = {
    // Migrate from schema v4 (cell-based caves) to v5 (strata-based cuts and caves)
    4: function migrate_v4_to_v5(st) {
        // Upgrade baseline descriptors without corrupting player digs
        if (st.levels) {
            for (const z of Object.keys(st.levels)) {
                if (st.levels[z].gen < 5) st.levels[z].gen = 5;
            }
        }
        st.saveSchemaVersion = 5;
        return st;
    }
};

function migrateSaveState(st) {
    while (st.saveSchemaVersion < CURRENT_SCHEMA_VERSION) {
        const fn = SCHEMA_MIGRATIONS[st.saveSchemaVersion];
        if (!fn) throw new Error(`Missing migration from save schema ${st.saveSchemaVersion}`);
        st = fn(st);
    }
    return st;
}
```

---

## 6. Schema Verification & Regression Testing

Every task that touches persistent data structures must include automated round-trip serialization tests:
1. Generate test world state.
2. Serialize state to JSON string: `json = saveJson(env)`.
3. Load serialized state into a fresh environment: `st2 = loadJson(freshEnv, json)`.
4. Assert:
   - Checksums across all strata layers match bit-for-bit.
   - Entity counts, IDs, and positions match exactly.
   - Heap memory does not leak during save/load cycles.
   - `saveJson` character size does not unexpectedly swell.
