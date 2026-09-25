# DEUS — RUNTIME OBSERVABILITY & DIAGNOSTICS (v1)
**Authoritative Runtime Observability Standard**
**Integration Authority:** Gemini / Antigravity
**Approved by Owner Directive:** 2026-09-25

---

## 1. Observability vs. Profiling: Fundamental Distinction

Project DEUS maintains a clear distinction between **Observability** and **Profiling**:

| Capability | Core Question | Target Outcome | Primary Tools |
|---|---|---|---|
| **OBSERVABILITY** | *"What was the entire system doing when this specific state, bug, or event occurred?"* | Full contextual explanation, state transparency, causal tracing | `UF_Sheet`, `UF_Look`, `L.stats()`, state dumps |
| **PROFILING** | *"Where and how are CPU cycles, GPU draw calls, and heap memory being consumed?"* | Frame-time budgets, allocation reduction, hotspot elimination | Node `--prof`, Chrome DevTools, `PERF_*` benchmarks |

---

## 2. In-Engine Observability Architecture

To ensure the simulation can explain itself at any instant, DEUS provides three native inspection surfaces:

### A. The Contextual Hover Inspector (`UF_Look`)
Hovering any world cell in development mode provides a live HUD tooltip detailing:
- **Spatial Position:** Coordinates `(x, y)`, macro-Z level (`-2..+2`), and elevation in feet.
- **Physical Composition:** Rock material at top stratum, soil type, and biome tag.
- **Fluid Status:** Fluid type, 5-step semantic depth (1..5), temperature, and volume.
- **Occlusion & Lighting:** Overburden status (`hasOpaqueOverburden`), clearance height (`continuousAirHeight`).
- **Asset Provenance:** Asset file name, catalog status, and WBS request ID (e.g. `!$Oak.png — original (AR-021)`).

### B. Deep Entity & Colonist Inspector (`UF_Sheet`)
Inspecting any entity or colonist opens a 4-page retro-CRPG character sheet:
- **Page 1 (Record):** D&D 5.1 SRD ability scores, hit die, level, current calling, AC, saving throws.
- **Page 2 (Inventory & Equipment):** Equipped gear, weight, encumbrance, held items, container contents.
- **Page 3 (Mage Spells / Abilities):** Prepared spells, spell slots, active supernatural auras.
- **Page 4 (Priest Prayers / Social):** Faction alignment, household membership, kinship links, personal history log.

### C. World Generation Diagnostic Telemetry (`L.stats()`)
Querying `UF.Levels.naturalFeatures(ax, ay)` returns complete generation diagnostics:
- Macro-Z cut and cave counts by elevation.
- Massif cells, cap cells, and carved strata volume.
- Shaft count, skylight locations, and multi-Z connection paths.
- Baseline memory footprint (strata arrays, connector bitmasks, biome arrays, surface grids).

---

## 3. Unhandled Exception & Crash Capture

During development and testing, all unhandled exceptions are caught by `DEUS_Core.js` and enriched with simulation context:
- Active world seed and generator version.
- Current camera position and active macro-Z level.
- Ticking subsystem and active job ID.
- Last 10 player inputs and mouse click targets.
- Output formatted as structured JSON written to `scratch/last_crash_context.json`.
