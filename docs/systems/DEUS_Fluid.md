# DEUS Fluid Simulation System Specification (`DEUS_Fluid.js`)

**Status:** `COMPLETED — VERIFIED` (2026-09-23)  
**Task ID:** `DEUS-TSK-GEMINI-08`  
**Subsystem Authority:** `UF.Fluid` (`game/js/plugins/DEUS_Fluid.js`)  
**Binding Standards:** `AGENTS.md` (Rules 1, 2, 3, 4, 14), `docs/ENGINEERING_STANDARD.md`, `docs/ARCHITECTURE.md`

---

## 1. Executive Summary & Core Mandate

`DEUS_Fluid.js` implements a high-performance, strictly conserved 0..7 volumetric fluid dynamics engine across the physical Z-levels of the world's Z range (WG.00.17, `docs/systems/DEUS_ZRange.md`: `UF.World.zRange()`, -16..+15 for new worlds, -2..+2 for a save made before it; the legacy range when the file runs without the World, a node test of it alone) for both **water** (freshwater) and **lava** (magma).

### Core Architectural Principle
> **"Stable state costs almost nothing. Change creates work."**
> A settled lake, a calm reservoir, or an undisturbed underground magma chamber costs effectively **0 ms CPU** per simulation tick. Fluid cells only enter active processing when physical change occurs (e.g. wall breached, door opened, liquid added, floor channeled).

### Key Performance Capabilities
1. **Active Dirty-Cell Set**: A 256×256 world of 32 levels contains 2,097,152 cells (327,680 at five), but an active waterfall or breached room processes only its active cells (e.g. 50–200 cells), never scanning all cells or Z-levels.
2. **Bounded Processing Budget**: Throttled at a default budget of `512` cells per tick, ensuring zero frame drops and a rock-solid **60 FPS** even at **4× simulation speed** during catastrophic breaches.
3. **Strict Mass Conservation**: Zero fluid duplication or deletion in closed chambers ($V_{\text{final}} \equiv V_{\text{initial}}$ across arbitrary simulation steps).

---

## 2. Liquid Depth Classes & Semantics

Every cell holds an integer depth from `0` to `7`, bit-packed into a compact `Uint8Array` per area level.

| Depth | Type | Movement Class | Walkability | Pathfinding Step Cost | Visual & Physical Effect |
|:---:|:---:|:---:|:---:|:---:|:---|
| **0** | `null` | `"dry"` | Walkable | $1.0\times$ (Normal) | Dry ground / open air. Zero liquid. |
| **1–2** | `water` | `"shallow"` | Walkable | $1.1\times$ | Ankle-deep water. Splash audio; translucent overlay ($\alpha \approx 0.44–0.54$). |
| **3–4** | `water` | `"wading"` | Walkable | $2.0\times$ | Knee/waist-deep water. Units wade at half speed. Alpha $\approx 0.63–0.72$. |
| **5–6** | `water` | `"deep"` | Impassable (`opts.canSwim` required) | $3.0\times$ (if swim) | Chest-deep water. Non-swimmers cannot enter. Alpha $\approx 0.81–0.91$. |
| **7** | `water` | `"submerged"` | Impassable (`opts.canSwim` required) | $4.0\times$ (if swim) | Full tile depth / submerged head height. Full alpha ($1.0$). Extinguishes fires. |
| **1–7** | `lava` | `"lethal"` | Impassable (`opts.lavaImmune` required) | N/A (Blocked) | Molten rock. Lethal hazard; burns units, incinerates combustible items. |

---

## 3. Data Representation & Memory Layout

Each map area `(ax, ay)` manages one grid per level **that has had fluid** (sparse since WG.00.17: a level's grid and its flood cache are made on the first write of fluid to it, `gridFor`; a level without fluid costs nothing and `getFloodGrid` answers it with a shared read-only grid of zeros). A grid cell:
- Low 4 bits (`val & 0x07`): Liquid depth (`0` to `7`).
- High 4 bits (`(val >> 4) & 0x0F`): Liquid type (`0` = none, `1` = water, `2` = lava).

```text
Memory footprint per 256x256 level: 64 KB (Uint8Array)
Before WG.00.17: 5 grids made up front, 320 KB per area; now 64 KB (and 64 KB of flood cache) per level with fluid
```

### Fast $O(1)$ Deduplicated Queue
The active queue uses a flat integer indexing schema:
$$\text{cellId} = (z - z_{\min}) \times (\text{size} \times \text{size}) + (y \times \text{size} + x)$$
($z_{\min}$: the area's origin, the world's lowest level when the area's data was made.) Accompanied by `inQueue`, the `Set` of queued cell ids (WG.00.17; before, a byte map `Uint8Array(5 * size * size)` of every level):
- Pushes are $O(1)$ and skipped if `inQueue.has(cellId)`.
- Dequeues use an advancing `head` pointer ($O(1)$ amortized) with periodic compaction, creating **zero GC memory churn** during simulation.

---

## 4. Simulation Dynamics & Flow Rules

Every simulation step (`stepArea(ax, ay, budget)`) pops up to `budget` cells from the active queue and executes two sequential priority checks:

### Priority 1: Vertical Gravity Downward Transfer
1. Liquid in cell $(x, y, z)$ checks if cell $(x, y, z - 1)$ can receive fluid.
2. Conditions for downward flow:
   - $z > z_{\min}$ (not on the lowest level of the world's Z range).
   - Cell below $(x, y, z - 1)$ is not a solid rock wall or barrier.
   - Floor boundary is open, excavated, or channeled (shape $\ne$ `solid`).
3. If valid:
   $$\text{transferAmt} = \min(D_{\text{source}}, 7 - D_{\text{below}})$$
   - Source loses `transferAmt`, destination gains `transferAmt`.
   - Both cells and their 6 orthogonal 3D neighbors are enqueued into the dirty set.

### Priority 2: Lateral Equalization (Horizontal Flow)
1. Occurs only if liquid remains in the source cell ($D_{\text{source}} > 1$) and downward transfer did not drain the cell.
2. Checks the 4 cardinal neighbors in deterministic order: North $(0,-1)$, East $(1,0)$, South $(0,1)$, West $(-1,0)$.
3. For each neighbor $N$:
   - Must be in map bounds and not blocked by a solid wall, cliff, or closed door.
   - Types must match (or neighbor must be dry; water and lava do not cross-contaminate in V1).
   - If $D_{\text{source}} > D_N + 1$:
     $$\text{transferAmt} = \left\lfloor \frac{D_{\text{source}} - D_N}{2} \right\rfloor$$
     - Exact 1-to-1 transfer preserves strict volume conservation.
     - Equilibrium is reached when $|D_{\text{source}} - D_N| \le 1$.
     - When equilibrium is reached across all neighbors, no cells re-enter the queue, and simulation seamlessly settles into quiescence.

---

## 5. Event-Driven Wakeups ("Change Creates Work")

Fluid cells are never polled by scanning the map. They are woken up exclusively by state changes:
1. `levels:cellChanged`: Fired when miners excavate rock, explosives detonate, or a wall is demolished. Wakes the cell and all 6 orthogonal 3D neighbors.
2. `levels:shapeChanged`: Fired when a floor is channeled into an open shaft or stairs are carved.
3. `doors:opened` / `doors:closed` / `doors:broken`: Fired when doors change passage state, instantly waking adjacent liquid reservoirs.
4. `UF.Fluid.setCell(area, x, y, z, type, depth)`: Direct gameplay or script placement wakes the modified cell and its 6 neighbors.

---

## 6. Persistence & Save / Load Schema

`DEUS_Fluid.js` hooks into `DataManager.makeSaveContents` and `DataManager.extractSaveContents`:
- **Sparse Storage**: Only cells with `depth > 0` are serialized:
  ```json
  [
    [ax, ay, z, x, y, type, depth],
    [0, 0, -1, 32, 32, 1, 7]
  ]
  ```
- **Dynamic Resumption**: Upon loading, `extractSaveContents` populates the `Uint8Array` grids and automatically enqueues all non-zero cells and their neighbors into `activeQueue`, allowing active flows to resume without hitching or state loss.

---

## 7. Public API Reference (`UF.Fluid`)

| Method | Parameters | Returns | Description |
|:---|:---|:---|:---|
| `depthAt` | `(area, x, y, z)` or `(ax, ay, x, y, z)` | `number` (0..7) | Reads fluid depth at specified cell. |
| `typeAt` | `(area, x, y, z)` or `(ax, ay, x, y, z)` | `"water"` \| `"lava"` \| `null` | Reads fluid type string at specified cell. |
| `setCell` | `(area, x, y, z, type, depth)` | `void` | Sets depth/type and wakes cell + 6 neighbors. |
| `movementClass` | `(ref)` | `string` | Returns `"dry"`, `"shallow"`, `"wading"`, `"deep"`, `"submerged"`, or `"lethal"`. |
| `walkable` | `(ax, ay, x, y, opts)` | `boolean` | Returns true if cell is passable for unit according to fluid depth/type. |
| `isFlooded` | `(ref)` | `{ flooded: boolean, type: string, depth: number }` | Backward-compatible query for legacy callers. |
| `isSubmerged` | `(ref)` | `boolean` | True if water depth $\ge 7$. |
| `getFloodGrid`| `(area, z)` | `Uint8Array` or `null` | Returns visual overlay grid (1=water, 2=lava); a shared read-only grid of zeros for a level of the range without fluid; `null` outside the range. |
| `step` | `(area, budget)` | `number` | Steps dirty queue for area up to budget. |
| `tick` | `(budget)` | `number` | Steps simulation for active view level. |
| `diagnostics` | `(ax, ay)` | `object` | Returns active queue length, volume, and timing metrics; `gridsAllocated` (level grids made: only levels that had fluid) and `bytes` (their bytes plus about 8 B a queued flag), WG.00.17. |
| `reset` | `none` | `void` | Clears all allocated grids and resets queue state. |
