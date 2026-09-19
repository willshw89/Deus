# UF_Outposts
Autonomous creature AI for constructing and expanding faction outposts, multi-size buildings of diverse archetypes, and multi-storey structures across vertical Z axes. Implements DF-inspired settlement growth, concentric expansion parcel allocation with street corridor buffers, cultural material customization (Dwarf stone, Elf rushes, Human wood), multi-level structural support integrity, vertical stair pairing, and a 6-phase construction pipeline executed by autonomous faction members.

Status: built 2026-09-19. Checks: `outposts` (12 checks, all PASS on snapshot `outposts_test`; provoked failure run 0/12 PASS; regressions `smoke` 13/13, `stance` 22/22, `timespeed` 20/20 PASS).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Outposts.js` · **Load order:** after `UF_World`, `UF_Objects`, `UF_Floors`, `UF_Doors`, `UF_Jobs`, `UF_Colonists`, `UF_Factions`; before `UF_Test`.

---

## 1. System Overview & Architecture

`UF_Outposts` endows both the player colony and non-player factions with the autonomous capacity to evaluate outpost needs, survey surrounding land for expansion parcels, generate architectural blueprints, and execute multi-storey construction across vertical Z-axes.

### Core Pillars
1. **Autonomous Needs Evaluation**: Periodic assessment of population versus bed capacity, storage volume, workshop availability, and defensive watchtower coverage.
2. **Expansion Parcel Allocation**: Concentric ring scanning outward from the outpost hearth `(home.x, home.y)` up to a max radius (default 40 tiles). Enforces a strict `STREET_BUFFER = 2` between building boundaries to guarantee walkable transit corridors where paths never route through building walls.
3. **Procedural Building Blueprints**: Archetype generation spanning dimensions $4\times 4$ up to $10\times 8$, adapting wall, door, floor, and interior furnishing choices to faction culture (Dwarven granite/slate, Elven living timber/rushes, Human timber/planks).
4. **Multi-Level Z-Axis Construction**:
   - $z = 0$ (Ground): Foundation clearance, cultural flooring, perimeter walls, south-centered doorways, and interior layout.
   - $z = +1, +2$ (Upper Storeys): Supported upper living quarters, defensive battlements, and interior stairways. Enforces Dwarf Fortress structural integrity: upper floor tiles require supporting walls, pillars, or solid rock directly beneath on $z - 1$.
   - $z = -1$ (Subterranean Cellars): Excavated root cellars, cold food storage, and defensive vaults accessed via down-stairs.
5. **6-Phase Construction Pipeline**:
   1. `clearance`: Dispatches jobs to fell blocking trees (`chop`) and quarry obstructive rocks (`mine`).
   2. `foundation`: Lays cultural flooring beneath the entire interior and wall footprint.
   3. `walls`: Erects perimeter walls (48×96 rendering, V73 standard) with centered entrance apertures.
   4. `doors`: Installs swinging doors in entrance openings via `UF.Doors`.
   5. `stairs`: Mounts vertical transit connectors (`stairs_up` and `stairs_down`) at identical $(x, y)$ coordinates across adjacent Z-levels.
   6. `furnishing`: Places interior amenities (straw beds, workbenches, dining tables, storage chests).

---

## 2. Blueprints, Dimensions & Archetypes

Buildings vary procedurally within archetype-specific dimension ranges:

| Archetype | Dimensions ($W \times H$) | Z Range | Primary Purpose | Interior Amenities |
|---|---|---|---|---|
| `dwelling` | $4\times 4$ to $6\times 6$ | $z = 0$ | Colonist/NPC sleeping quarters | Straw beds (1–2), nightstand, personal chest |
| `longhouse` | $8\times 5$ to $10\times 6$ | $z = 0$ | Communal barracks & dining hall | Multiple beds (4–6), dining tables, benches |
| `workshop` | $5\times 5$ to $7\times 7$ | $z = 0$ | Material crafting & processing | Workbench, forge/furnace, tool racks |
| `storehouse` | $6\times 6$ to $8\times 8$ | $z = 0, -1$ | Stockpile storage & logistics | Crates, barrels, shelves, open stockpile tiles |
| `watchtower` | $4\times 4$ to $5\times 5$ | $z = 0, +1, +2$ | Perimeter defense & scouting | Vertical stairs, parapet walls, weapon racks |
| `cellar` | $4\times 4$ to $6\times 6$ | $z = -1$ | Cold storage & defensive refuge | Down-stairs, stone walls, cellar storage |

### Cultural Materials Matrix

| Faction / Culture | Wall Type | Door Type | Floor Kind | Accent / Furniture |
|---|---|---|---|---|
| **Dwarf** (Mountain Folk) | `wall_stone` | `door_stone` | `floor_stone` | Stone tables, iron-bound chests |
| **Elf** (Woodland Folk) | `wall_wood` | `door_wood` | `floor_rushes` | Woven mats, wooden benches |
| **Human** (Frontier Folk) | `wall_wood` | `door_wood` | `floor_wood` | Straw beds, timber workbenches |

---

## 3. Structural Support Integrity across Z-Axes

Upper storey construction adheres strictly to Dwarf Fortress structural rules:
- **Support Rule**: Any floor or wall tile erected on level $z > 0$ must have a supporting structural element (a wall, pillar, or solid terrain tile) at $(x, y, z - 1)$.
- **Integrity Validation**: Before placing upper floor tiles or upper walls, `UF.Outposts.validateSupport(area, x, y, z)` checks the underlying cell. If the underlying tile is empty air, the build is flagged as structurally unsupported and halted until supporting foundations are placed.
- **Vertical Stair Alignment**: When building multi-level structures, `stairs_up` placed at $(x, y, z)$ automatically pairs with `stairs_down` placed at $(x, y, z + 1)$ with identical footprint anchors, enabling units to transition vertically between levels.

---

## 4. Expansion Parcels & Street Corridors

To prevent settlement sprawl from creating dead-end mazes or trapping units inside wall courtyards:
- `findExpansionParcel(outpost, width, height, opts)` scans in expanding concentric rings around the outpost hearth.
- Evaluates candidate rectangular plots for:
  1. Flat, dry land (avoids water, deep chasms, and steep cliffs).
  2. Clear separation from existing building parcels: candidate bounding box $[x - B, y - B, W + 2B, H + 2B]$ with buffer $B = 2$ must not overlap any existing parcel.
  3. No conflict with protected start kit objects (`start.kit.objects`) or essential map kit monuments.
  4. Immediate reservation upon allocation to prevent concurrent building collisions.

---

## 5. API Reference (`UF.Outposts`)

| Method / Property | Description |
|---|---|
| `outpost(factionId)` | Retrieves or initializes the outpost state record for a faction in the active area. |
| `generate(blueprint)` | Generates the structural layout and floor plan for a building blueprint. |
| `findParcel(outpost, w, h, opts)` | Locates an expansion parcel in concentric rings adhering to the 2-cell street buffer. |
| `evaluate(factionId)` | Evaluates settlement needs (bed deficit, storage, workshop, defense) and initiates expansion. |
| `process(outpost)` | Advances building phases across the outpost, verifies support, and posts jobs to `UF.Jobs`. |
| `materials(factionId, archetype)` | Resolves cultural material definitions (walls, doors, floors) for the faction. |
| `stats(factionId)` | Computes real-time statistics (total buildings, population, beds, active projects). |
| `validateSupport(area, x, y, z)` | Verifies structural support integrity beneath an upper-level tile ($z > 0$). |

---

## 6. Save Data & Persistence

Outpost records persist across sessions in the world state under `UF.World.state.outposts`:
```json
{
  "version": 1,
  "factions": {
    "faction_player": {
      "factionId": "faction_player",
      "center": { "x": 128, "y": 128 },
      "radius": 16,
      "parcels": [
        { "id": "bld_1", "x": 120, "y": 120, "w": 5, "h": 5, "z": 0, "archetype": "dwelling", "stage": "complete" }
      ],
      "buildings": [ ... ],
      "needs": { "bedDeficit": 0, "needsWorkshop": false, "needsStorehouse": false, "needsTower": false },
      "lastEvalBeat": 1200
    }
  }
}
```
State serialization and restoration are handled via `JsonEx` on world save/load hooks.

---

## 7. Test Suite (`outposts`, 12 Checks)

Run with:
```powershell
& "C:\Program Files\nodejs\node.exe" tools/test_snapshot.js --name outposts_test --plugins UF_Outposts --suite outposts
```

| Check | Validates | Provocation Trigger (`UF_TEST_PROVOKE`) |
|---|---|---|
| `archetype_dimensions` | Blueprints adhere to archetype dimension constraints ($4\times 4$ to $10\times 8$). | `outposts.archetype_dimensions` |
| `perimeter_and_doors` | 1-tile wide perimeter walls erected with centered entrance door aperture. | `outposts.perimeter_and_doors` |
| `culture_materials` | Dwarves build stone, Elves build rushes/wood, Humans build wood planks. | `outposts.culture_materials` |
| `clearance_dispatch` | Blocking trees/rocks on blueprint footprint trigger `chop`/`mine` clearance jobs. | `outposts.clearance_dispatch` |
| `floor_and_wall_build` | Foundation flooring, 48×96 perimeter walls, and doors properly erected. | `outposts.floor_and_wall_build` |
| `vertical_stairs_placed` | `stairs_up` at $(x,y,z)$ correctly aligns with `stairs_down` at $(x,y,z+1)$. | `outposts.vertical_stairs_placed` |
| `upper_floor_support` | Floating upper floors without underlying walls/pillars trigger structural failure. | `outposts.upper_floor_support` |
| `vertical_ascent_and_build` | Multi-storey watchtower successfully erected across vertical Z-levels. | `outposts.vertical_ascent_and_build` |
| `expansion_territory` | Allocated building parcels maintain $\ge 2$-cell street corridors. | `outposts.expansion_territory` |
| `npc_faction_autonomy` | Non-player faction outposts independently assess needs and build structures. | `outposts.npc_faction_autonomy` |
| `save_round_trip` | Outpost registry, parcels, and stages survive save/load round-trip intact. | `outposts.save_round_trip` |
| `perf_budget` | Outpost expansion evaluation executes within 15 ms performance budget (measured $\le 0.10$ ms). | `outposts.perf_budget` |

All 12 checks pass cleanly in under 5 seconds. Provocation test (`UF_TEST_PROVOKE="outposts.all"`) confirmed exit code 1 with 0 passed, 12 failed, satisfying Rule 4.
Visual confirmation verified via Rule 5 screenshots `outposts.dwelling_constructed.png` and `outposts.tower_constructed.png`.
