# DEUS_Minimap — Strategic Knowledge-Based Multi-Z Minimap

**Plugin:** `game/js/plugins/DEUS_Minimap.js`  
**Compatibility Shim:** `game/js/plugins/UF_Minimap.js`  
**Automated Tests:** `tools/test_minimap.js`, in-engine suite `minimap` (`tools/run_tests.js minimap`)  
**Active Milestone:** TASK UI-MAP-01 (Command, Combat, and Incarnate modes across all 5 Z-levels)  

---

## 1. Core Principle & Knowledge Model

> **The minimap shows known world state, never omniscient truth.**

$$\text{World Truth} \neq \text{Discovered / Known Map State} \neq \text{Currently Visible State}$$

The DEUS minimap acts as the player's primary strategic overview at the locked 1.00x gameplay camera distance, completely eliminating the need for zoom-out while preserving strict information integrity.

### Three Knowledge States

1. **`UNKNOWN`**:
   - The cell has never been explored or revealed.
   - Rendered as flat pitch-dark void (`#06070a`).
   - Zero leaks: undiscovered caverns, underground veins, unspotted enemies, hidden structures, and unrevealed hazards are never drawn.
2. **`DISCOVERED_BUT_NOT_CURRENTLY_VISIBLE`**:
   - The cell was revealed previously by a colonist, party member, or structure, but is currently outside active line-of-sight.
   - Rendered in muted, dimmed remembered terrain colors (~40% reduced brightness and lower saturation).
   - Known static structures (walls, doors, paved floors, roads) remain visible as last seen.
   - Hostile units are **never** shown in this state.
3. **`CURRENTLY_VISIBLE`**:
   - The cell is currently inside the line-of-sight of an active friendly observer.
   - Rendered with maximum clarity in high-contrast categorical information graphics.
   - Real-time dynamic markers (friendlies, selected units, actively spotted hostiles, moving hazards) are displayed.

---

## 2. Multi-Z Layer Architecture

The minimap provides native support across all 5 physical elevation levels in Project DEUS:
- **`Z+2`**: High ridges, mountain peaks, and elevated fortifications.
- **`Z+1`**: Hills, upper defensive ramparts, and second-story roofs/walkways.
- **`Z0`**: Surface ground (settlement, forests, fields, rivers).
- **`Z-1`**: Shallow caverns, mining tunnels, and underground cellars.
- **`Z-2`**: Deep subterranean caverns, magma chambers, and ancient ruins.

### Z-Layer Isolation Contract
- Each Z-level maintains its own independent exploration bitset (`Uint8Array(256 * 256)`).
- Exploring the surface at $Z=0$ **never** reveals subterranean caverns at $Z=-1$ or $Z=-2$.
- Subterranean discovery at $Z=-1$ **never** reveals surface terrain at $Z=0$.
- Players can manually switch the minimap inspection tab to any Z-level (`-2` to `+2`), but unexplored levels read as complete dark void until physically penetrated.
- Vertical transit points (ramps up, stairs down, ladders, vertical shafts) are clearly marked with directional color-coded indicators.

---

## 3. Game Mode Integration

1. **Command Mode (`CMD`)**:
   - Active default for colony / RTS management.
   - Displays shared player faction knowledge: all colonists, watchtowers, campfires, and permanent buildings contribute to vision.
   - Displays active construction project footprints (amber for under construction, green for complete, blue for blueprints).
2. **Combat Mode (`CBT`)**:
   - Focuses on tactical combat awareness.
   - Highlights actively engaged friendlies, selected targets, and currently spotted enemy hostiles.
   - Unspotted enemies remain completely invisible on the minimap.
3. **Incarnate Mode (`INC`)**:
   - Restricts vision strictly to the incarnated character and their immediate adventuring party.
   - Colony-wide omniscient knowledge is stripped away to provide true RPG line-of-sight immersion.

---

## 4. Performance & Caching Architecture

### Hard Performance Rule: Zero Full-World Redraws
The minimap base terrain is **not** redrawn every frame. It uses a **two-tier rendering pipeline**:

```text
┌────────────────────────────────────────────────────────┐
│  Tier 1: 16×16 Chunk-Cached Static Base Bitmap (256×256) │
└──────────────────────────┬─────────────────────────────┘
                           │ Only dirty chunks rebuilt
                           ▼
┌────────────────────────────────────────────────────────┐
│  Tier 2: Dynamic Marker Overlay (Updated per Frame)    │
│  - Friendly unit pips                                  │
│  - Spotted hostile markers                             │
│  - Active project outlines                             │
│  - Viewport camera wireframe box                       │
└────────────────────────────────────────────────────────┘
```

### Chunk Cache Specifics
- The $256 \times 256$ cell world is partitioned into a $16 \times 16$ grid of chunks ($16 \times 16$ cells each, 256 total chunks per Z-level).
- Each chunk corresponds to a $16 \times 16$ pixel region on the base bitmap.
- Invalidation events (e.g. wall placed, rock dug, discovery revealed) mark **only** the affected chunk $(x \gg 4, y \gg 4)$ as dirty.
- Rebuilding 1 chunk takes $< 0.05\text{ ms}$ (updating 256 pixels of `ImageData`).
- During live gameplay without structural changes, **0 chunks are dirty**, resulting in exactly **0.000 ms** base redraw cost.
- Camera panning, tree swaying, unit movement, and cosmetic VFX never dirty the base terrain cache.

---

## 5. Information-Graphic Categorical Palette

The minimap employs clean categorical color blocks inspired by `art/palette/uf.hex`:

| Feature | Visible Color | Remembered (Dim) Color | Hex Reference |
|---|---|---|---|
| **Unknown / Void** | `#06070a` | `#06070a` | Pitch Dark |
| **Meadow / Grass** | `#3b6d3b` | `#1e381e` | Green |
| **Dense Forest** | `#1e4620` | `#102611` | Deep Green |
| **Dirt / Earth** | `#856545` | `#463524` | Brown |
| **Sand / Desert** | `#c29d5b` | `#64512f` | Ochre |
| **Snow / Cold** | `#cbd5e1` | `#64748b` | Off-white |
| **Swamp / Marsh** | `#3e5c46` | `#203024` | Olive Slate |
| **Shallow Water** | `#38bdf8` | `#0284c7` | Light Blue |
| **Deep Water** | `#1d4ed8` | `#1e3a8a` | Deep Blue |
| **Lava / Magma** | `#ea580c` | `#9a3412` | Burning Red-Orange |
| **Natural Cliff / Solid** | `#475569` | `#1e293b` | Slate Rock |
| **Constructed Wall (Wood)**| `#92400e` | `#451a03` | Timber Brown |
| **Constructed Wall (Stone)**| `#94a3b8` | `#475569` | Masonry Light Grey |
| **Constructed Floor / Road**| `#d97706` | `#78350f` | Cobble / Floor Amber |
| **Door** | `#e2e8f0` | `#64748b` | Silver White |
| **Ramp Up** | `#a855f7` | — | Bright Purple Pip |
| **Stair Down** | `#ec4899` | — | Magenta Pip |
| **Friendly Unit** | `#22c55e` | — | Bright Green |
| **Selected Unit** | `#4ade80` | — | Mint Highlight |
| **Spotted Hostile** | `#ef4444` | — | Crimson Red |
| **Camera Viewport** | `#facc15` | — | Yellow Wireframe Box |

---

## 6. Public API Reference

```javascript
// Current active minimap elevation (-2 to +2)
UF.Minimap.activeZ;
UF.Minimap.setActiveZ(z);

// Game mode ("command" | "combat" | "incarnate")
UF.Minimap.mode;
UF.Minimap.setMode("command");

// Discovery inspection
UF.Minimap.isExplored(x, y, z = currentZ);
UF.Minimap.explore(x, y, radius = 0, z = currentZ);
UF.Minimap.exploredCount(z = currentZ);

// Invalidation hooks
UF.Minimap.invalidate(x, y, z = currentZ);
UF.Minimap.invalidateArea(x, y, w, h, z = currentZ);
UF.Minimap.invalidateAll(z = currentZ);

// Diagnostics & performance
UF.Minimap.stats();
// Returns: { dirtyRebuilds, overlayTicks, lastRebuildTimeMs, lastOverlayTimeMs, activeZ, mode, dirtyCount }
```

---

## 7. Interactive UI Controls

The minimap window docks cleanly on the top-right of the screen (`x = Graphics.boxWidth - 174`, `y = 52`) directly beneath the Top Level & Speed Bar:
1. **Header & Mode Readout**: `[ 🗺️ MAP [CMD] ]`.
2. **Minimize Button `[ — ]`**: Collapses the window to a non-intrusive 28 px header bar `[ 🗺️ MINIMAP (Z: 0) [ ▢ ] ]`.
3. **Z-Level Selector Tabs**: Five interactive buttons `[ +2 | +1 | 0 | -1 | -2 ]`. Clicking any tab inspects that elevation.
4. **Click-to-Pan / Drag-to-Pan**: Clicking or dragging anywhere on the minimap viewport immediately centers the camera on that world location.
5. **Camera Viewport Wireframe**: Shows a high-visibility yellow rectangle matching the exact 17×13 tile camera view on the active level.
6. **Input Isolation**: All minimap clicks are intercepted via `Scene_Map.prototype.isAnyWindowUnderMouse` to prevent misclicks on world units.
