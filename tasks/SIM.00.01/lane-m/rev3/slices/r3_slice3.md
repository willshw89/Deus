### C449 ADR:1425 docs/OWNER_DECISIONS.md:178-181 (bare, file from 2 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **The governing scale** (`:178-181`): §15.0.
   178  2. **Governing Geometry & Scale:**
   179  - 1 square / cell = 5 ft × 5 ft (D&D movement standard).
   180  - 1 Z layer = 10 ft tall (equivalent to 2 cubes).
   181  - 5 strata per layer = 2 ft per stratum (5 strata × 2 ft = 10 ft).

### C450 ADR:1426 docs/OWNER_DECISIONS.md:182 (bare, file from 3 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **Mandatory sparse storage** (`:182`): §15.3 to §15.5.
   182  3. **Mandatory Sparse Storage:** Memory, state arrays, and save size must scale with occupied cells/entities, NOT with 32 × area. Empty sky and untouched solid rock cost near zero.

### C451 ADR:1427 docs/OWNER_DECISIONS.md:183 (bare, file from 4 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **Cross-layer blasts** (`:183`): §18.
   183  4. **Cross-Layer Blast & Structural Damage:** Explosions and blasts (e.g. fireball) damage floors and propagate damage to the layer below depending on floor material, thickness, and attenuation. `applyVolumeDamage` propa

### C452 ADR:1428 docs/OWNER_DECISIONS.md:186-191 (bare, file from 5 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **Five bands across the 32 layers** (`:186-191`): §5.1. Which biomes and races go in which band is OPEN (`:194-195`).
   186  7. **Five Vertical Biome Bands Spanning 32 Layers:** The 25 pipeline biomes are partitioned into 5 vertical bands of 5 biomes each across the 32 layers (-16..+15, surface at 0):
   187  - **Lower-2 (Deep Caverns):** Layers -16..-9 (8 layers, 5 biomes)
   188  - **Lower-1 (Shallow Underground):** Layers -8..-1 (8 layers, 5 biomes)
   189  - **Surface:** Layers 0..+3 (4 layers: ground, hills, low buildings; 5 biomes)
   190  - **Upper-1 (Low Sky / Towers / Canopy):** Layers +4..+9 (6 layers, 5 biomes)
   191  - **Upper-2 (High Sky / Peaks / Cloud Realm):** Layers +10..+15 (6 layers, 5 biomes)

### C453 ADR:1428 docs/OWNER_DECISIONS.md:194-195 (bare, file from 5 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **Five bands across the 32 layers** (`:186-191`): §5.1. Which biomes and races go in which band is OPEN (`:194-195`).
   194  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
   195  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).

### C454 ADR:1430 docs/VISION.md:130 OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: V136 records the same ruling (`docs/VISION.md:130`). WG.00.17 does the legacy refactor and lists ADR-003 as an input (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`). This section is that input. The core itself is range-agnostic from Increment 1 (§15.2).
   130  | V136 | **Thirty-Two Z Layers, Governing Scale, Home Layer Ranges & Five Vertical Biome Bands** (user directives 2026-09-26: "32 layers supersede 9", DEC-013 amended, Directive 0021-V Addendum §12–§13; supersedes 9-laye

### C455 ADR:1430 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: V136 records the same ruling (`docs/VISION.md:130`). WG.00.17 does the legacy refactor and lists ADR-003 as an input (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`). This section is that input. The core itself is range-agnostic from Increment 1 (§15.2).
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper

### C456 ADR:1436 game/js/plugins/DEUS_Levels.js:993 OK
section: 15.0 The governing scale
claim: | Cell | 5 ft × 5 ft | `CELL_FT = 5` (`DEUS_Levels.js:993`): agrees | `cellFt = 5` |
   993  const STRATA = 5, CELL_FT = 5;

### C457 ADR:1437 game/js/plugins/DEUS_Levels.js:993 OK
section: 15.0 The governing scale
claim: | Strata per layer | 5 | `STRATA = 5` (`DEUS_Levels.js:993`): agrees | `strataPerLayer = 5` |
   993  const STRATA = 5, CELL_FT = 5;

### C458 ADR:1438 game/js/plugins/DEUS_Levels.js:985-986 OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
   985  // Strata (DEUS-TSK-FABLE-19A): the one geometry authority. Every 5 ft cell of every level is five 1 ft strata,
   986  // S0 (bottom) .. S4 (top). A stratum is two bytes: its material (id in the low 6 bits, 0 = air; 0x80 = constructed)

### C459 ADR:1438 game/js/plugins/DEUS_Levels.js:1790-1791 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
  1790  *     a sphere around the middle of that stratum; a stratum takes damage x falloff(distance / radius) when its middle
  1791  *     is within the radius (a cell is 5 ft across, a stratum 1 ft high). It crosses levels the same way.

### C460 ADR:1438 game/js/plugins/DEUS_Levels.js:1833 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
  1833  const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;

### C461 ADR:1438 game/js/plugins/DEUS_Levels.js:1835 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
  1835  const e0 = Math.max(0, Math.floor(pe - radius)), e1 = Math.min(24, Math.floor(pe + radius));

### C462 ADR:1438 game/js/plugins/DEUS_Levels.js:1845 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;

### C463 ADR:1440 game/js/plugins/DEUS_Levels.js:1787 OK
section: 15.0 The governing scale
claim: | World height | 320 ft at 32 layers | 25 ft: 5 levels on one elevation scale of 25 strata, 0..24 (`DEUS_Levels.js:1787`) | (zMax − zMin + 1) × 10 ft |
  1787  *     25 strata of a column are one elevation scale, e = (z + 2) * 5 + s, 0..24), takes the damage.

### C464 ADR:1445 docs/OWNER_DECISIONS.md:230-235 OK
section: 15.0 The governing scale
claim: - **The core has no pixels.** Pixel sizes are presentation. The scale chart governs them (DEC-016, "The scale chart is the governing size authority for the art catalogue, templates and placement", `docs/OWNER_DECISIONS.md:230-235`), and DEC-016 itself says sim distances follow DEC-013. How many pixels a stratum is (`stratumPx`) is an Owner question under DEC-016, and the core doesn't depend on the answer.
   230  ### Decision `DEC-016`: The scale chart is the governing size authority for the art catalogue, templates and placement
   231  - **Date Logged:** 2026-09-26
   232  - **Decider:** Owner (00:11 CT, "the most important is the scale chart"; relayed by PM 0019-S/0028-AC)
   233  - **Status:** `DECIDED`
   234  - **Ruling:** Every catalogue entry's pixel size, envelope, footprint and anchor derive from the scale chart (`art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`, whose numeric source is `game/data/DEUS_ScaleRegistry.json`; th
   235  - **Open:** If "the scale chart" means a different file, the Owner names it and DEC-016 is amended.

### C465 ADR:1449 game/js/plugins/DEUS_Fluid.js:50 OK
section: 15.0 The governing scale
claim: - **Fluid depth.** The integer units stay (0..7 per full cell, `DEUS_Fluid.js:50`), but a full cell is now 10 ft deep, so one unit is 10/7 ft. V135 labels the five fluid depth states 1 to 5 ft, for 1 ft strata (`docs/VISION.md:129`). That is Q17.
    50  const DEPTH_MAX = 7;

### C466 ADR:1449 docs/VISION.md:129 OK
section: 15.0 The governing scale
claim: - **Fluid depth.** The integer units stay (0..7 per full cell, `DEUS_Fluid.js:50`), but a full cell is now 10 ft deep, so one unit is 10/7 ft. V135 labels the five fluid depth states 1 to 5 ft, for 1 ft strata (`docs/VISION.md:129`). That is Q17.
   129  | V135 | **Canonical 5-Step Fluid Depth Standard for Water and Lava** (user directive 2026-09-25): Exactly 5 visible, semantic depth states for water and 5 for lava, matching the 5 physical 1 ft strata per 5 ft cell (1 f

### C467 ADR:1452 game/js/plugins/DEUS_Levels.js:985-986 OK
section: 15.0 The governing scale
claim: **Who changes the legacy 1 ft assumptions.** This ADR doesn't edit code. The comments at `DEUS_Levels.js:985-986` and `:1790-1791`, and the sphere math, belong to whichever lands first: WG.00.17, which already refactors the range, or SIM.00.05/terrain, which ports them to the core. Either way the change is recorded with a before/after fixture (R13).
   985  // Strata (DEUS-TSK-FABLE-19A): the one geometry authority. Every 5 ft cell of every level is five 1 ft strata,
   986  // S0 (bottom) .. S4 (top). A stratum is two bytes: its material (id in the low 6 bits, 0 = air; 0x80 = constructed)

### C468 ADR:1452 game/js/plugins/DEUS_Levels.js:1790-1791 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: **Who changes the legacy 1 ft assumptions.** This ADR doesn't edit code. The comments at `DEUS_Levels.js:985-986` and `:1790-1791`, and the sphere math, belong to whichever lands first: WG.00.17, which already refactors the range, or SIM.00.05/terrain, which ports them to the core. Either way the change is recorded with a before/after fixture (R13).
  1790  *     a sphere around the middle of that stratum; a stratum takes damage x falloff(distance / radius) when its middle
  1791  *     is within the radius (a cell is 5 ft across, a stratum 1 ft high). It crosses levels the same way.

### C472 ADR:1459 game/js/plugins/DEUS_Levels.js:61 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
    61  const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);

### C473 ADR:1459 game/js/plugins/DEUS_Levels.js:150 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
   150  const isLevel = z => (Number.isInteger(z) && z >= -2 && z <= 2) || (provoked("five_levels") && z === 3);

### C474 ADR:1459 game/js/plugins/DEUS_Levels.js:998 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
   998  const LEVEL_KEY = ["-2", "-1", "0", "1", "2"];

### C475 ADR:1459 game/js/plugins/DEUS_Levels.js:1137 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1137  deltas.levels = [new Map(), new Map(), new Map(), new Map(), new Map()];

### C476 ADR:1459 game/js/plugins/DEUS_Levels.js:1141 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1141  for (let li = 0; li < 5; li++) {

### C477 ADR:1459 game/js/plugins/DEUS_Levels.js:1038 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1038  const fluid = z === -2 ? M_LAVA : M_WATER;

### C478 ADR:1459 game/js/plugins/DEUS_Levels.js:1285 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1285  if (!st || !isLevel(z) || z < -2 || z > 2 || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return 0;

### C479 ADR:1459 game/js/plugins/DEUS_Levels.js:1588 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1588  if (!isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return refuse(`level ${ref && ref.z} or cell (${r.x},${r.y}) doesn't exist`);

### C480 ADR:1459 game/js/plugins/DEUS_Levels.js:1627 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1627  if (!st || !isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return null;

### C481 ADR:1459 game/js/plugins/DEUS_Levels.js:1732 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1732  if (!Number.isInteger(z) || z < -2 || z > 2 || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return `level ${z} or cell (${x},${y}) doesn't exist`;

### C482 ADR:1459 game/js/plugins/DEUS_Levels.js:1828 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1828  if (![c.x, c.y, c.z, cs].every(Number.isInteger) || cs < 0 || cs >= STRATA || c.z < -2 || c.z > 2) return { ok: false, reason: "center needs integer x, y, z (-2..2) and s (0..4)" };

### C483 ADR:1459 game/js/plugins/DEUS_Levels.js:3024 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  3024  if (!isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return refuse(`level ${ref && ref.z} or cell (${r.x},${r.y}) doesn't exist`);

### C484 ADR:1459 game/js/plugins/DEUS_Levels.js:3097 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  3097  if (nz < -2 || nz > 2) continue;

### C485 ADR:1459 game/js/plugins/DEUS_Levels.js:3117 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  3117  if (nz < -2 || nz > 2) continue;

### C486 ADR:1459 game/js/plugins/DEUS_Levels.js:1805 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1805  const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);

### C487 ADR:1459 game/js/plugins/DEUS_Levels.js:1813 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1813  for (let s = 0; s < STRATA; s++) { const e = (z + 2) * STRATA + s; if (e >= e0 && e <= e1) hits.push([s, damage]); }

### C488 ADR:1459 game/js/plugins/DEUS_Levels.js:1833 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1833  const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;

### C489 ADR:1459 game/js/plugins/DEUS_Levels.js:1835 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1835  const e0 = Math.max(0, Math.floor(pe - radius)), e1 = Math.min(24, Math.floor(pe + radius));

### C490 ADR:1459 game/js/plugins/DEUS_Levels.js:1845 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;

### C491 ADR:1459 game/js/plugins/DEUS_Levels.js:1873 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1873  if (f > 0) return (qZ + 2) * STRATA + f - 1;

### C492 ADR:1459 game/js/plugins/DEUS_Levels.js:1876 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1876  if (SOLID_B[rdM[rdO + 4]] === 1) return (qZ + 2) * STRATA - 1;

### C493 ADR:1459 game/js/plugins/DEUS_Levels.js:1765 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1765  const levelOfElevation = e => Math.floor(e / STRATA) - 2;

### C494 ADR:1460 game/js/plugins/DEUS_Fluid.js:56-58 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids allocated up front (`:173`, `:186-190`); "Bottom of the world (-2)" (`:291`) |
    56  const Z_MIN = -2;
    57  const Z_MAX = 2;
    58  const Z_LEVELS = 5; // -2, -1, 0, 1, 2

### C495 ADR:1460 game/js/plugins/DEUS_Fluid.js:173 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids allocated up front (`:173`, `:186-190`); "Bottom of the world (-2)" (`:291`) |
   173  const totalCells = Z_LEVELS * n;

### C496 ADR:1460 game/js/plugins/DEUS_Fluid.js:186-190 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids allocated up front (`:173`, `:186-190`); "Bottom of the world (-2)" (`:291`) |
   186  // Pre-allocate 5 Z-levels
   187  for (let z = Z_MIN; z <= Z_MAX; z++) {
   188  data.grids.set(z, new Uint8Array(n));
   189  data.floodGrids.set(z, new Uint8Array(n));
   190  }

### C497 ADR:1460 game/js/plugins/DEUS_Fluid.js:291 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids allocated up front (`:173`, `:186-190`); "Bottom of the world (-2)" (`:291`) |
   291  if (z <= Z_MIN) return false; // Bottom of the world (-2)

### C499 ADR:1464 game/js/plugins/DEUS_Levels.js:1037 OK
section: 15.1 Where the range is fixed today
claim: - the strata baseline, a `Uint8Array(n × 5)` per level (`DEUS_Levels.js:1037`);
  1037  const n = size * size, m = new Uint8Array(n * STRATA), conn = new Uint8Array((n + 1) >> 1);

### C500 ADR:1465 game/js/plugins/DEUS_Fluid.js:173 OK
section: 15.1 Where the range is fixed today
claim: - fluid grids, flood caches and `inQueue` for every level (`DEUS_Fluid.js:173`, `:179-189`);
   173  const totalCells = Z_LEVELS * n;

### C501 ADR:1465 game/js/plugins/DEUS_Fluid.js:179-189 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: - fluid grids, flood caches and `inQueue` for every level (`DEUS_Fluid.js:173`, `:179-189`);
   179  grids: new Map(),       // z -> Uint8Array(n)
   180  floodGrids: new Map(),  // z -> Uint8Array(n) (legacy visual cache: 1=water, 2=lava)
   181  queue: [],              // cell indices: (zIdx * n + idx)
      ...
   188  data.grids.set(z, new Uint8Array(n));
   189  data.floodGrids.set(z, new Uint8Array(n));

### C502 ADR:1466 game/js/plugins/DEUS_World.js:605 OK
section: 15.1 Where the range is fixed today
claim: - map builds per level (`DEUS_World.js:605`, `:613`).
   605  const data = new Array(cells * 6).fill(0);

### C503 ADR:1466 game/js/plugins/DEUS_World.js:613 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: - map builds per level (`DEUS_World.js:605`, `:613`).
   613  const objects = new Uint16Array(cells);

### C504 ADR:1468 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 OK
section: 15.1 Where the range is fixed today
claim: At 32 layers these grow 32/5 times. WG.00.17's row already requires sparse storage (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`). The chunk format of §15.3 is the target, so WG.00.17 should use it, or a layout that ports to it one to one.
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper

### C505 ADR:1481 docs/OWNER_DECISIONS.md:177 OK
section: 15.2 In the core the range is data
claim: | test | −4..+4 (9 layers) | the second range of every core test. DEC-013 requires 9-layer runs (`docs/OWNER_DECISIONS.md:177`), and so does WG.00.17 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`) |
   177  1. **Thirty-Two Z Layers:** The world simulation and presentation expand to 32 vertical Z layers (superseding 9 layers; formerly -2..+2). Total vertical headroom: 320 ft. The Z-range refactor targets 32 as the default ga

### C506 ADR:1481 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 OK
section: 15.2 In the core the range is data
claim: | test | −4..+4 (9 layers) | the second range of every core test. DEC-013 requires 9-layer runs (`docs/OWNER_DECISIONS.md:177`), and so does WG.00.17 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`) |
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper

### C510 ADR:1514 game/js/plugins/DEUS_Levels.js:997 OK
section: 15.4 Memory
claim: | Stratum HP | inside the changed-cell records (`DEUS_Levels.js:997`) | 5,120 B, only once a stratum is damaged |
   997  const REC = 11, REC_M = 1, REC_HP = 6;       // a changed cell: [connector, m0..m4, hp0..hp4]

### C517 ADR:1545 docs/worldgen/DEUS_WORLDGEN_WBS.md:196 OK
section: 15.6 LOD across 32 layers
claim: - **Home layer ranges** (DEC-013 item 5; WG.62.02, `docs/worldgen/DEUS_WORLDGEN_WBS.md:196`). A race's home band is simulated at L2 by coarse rules unless tracked units there are in focus.
   196  | **WG.62.02** | Race Home-Layer Assignment in WorldGen | Fable | Procedural spawn placement and native habitat generation for 9 races across 32 Z layers (-16..+15) and 5 vertical biome bands (Lower-2 -16..-9, Lower-1 -8

### C518 ADR:1553 docs/VISION.md:131 OK
section: 16. Structural Integrity & Collapse (V137)
claim: V137 is at `docs/VISION.md:131` (from directive 0021-V §6). The WBS packages are SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536`). SIM.40.01 sets the numbers (spans, capacities). It now also names blast propagation, which §18 covers. This ADR fixes where the system lives, how it runs, and what it must conserve.
   131  | V137 | **Structural Integrity, Load-Bearing Architecture & Mass-Conserving Collapse** (user directive 2026-09-26, Directive 0021-V §6): Solid terrain, constructed walls, floors, and roofs possess material-dependent str

### C519 ADR:1553 docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536 OK
section: 16. Structural Integrity & Collapse (V137)
claim: V137 is at `docs/VISION.md:131` (from directive 0021-V §6). The WBS packages are SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536`). SIM.40.01 sets the numbers (spans, capacities). It now also names blast propagation, which §18 covers. This ADR fixes where the system lives, how it runs, and what it must conserve.
   533  | SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and ve
   534  | SIM.40.02 | **Collapse event simulation** (downward cascading, rubble/talus mass conservation LIFE-001, V95 impact damage, deep-history DEC-012) | PLANNED | Directive 0021-V §6; V137; LIFE-001; V95 | dep: SIM.40.01 | C
   535  | SIM.40.03 | **Colonist structural behaviour** (props, pillars, avoid dangerous excavation) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok | Colonist builders and miners respect structural suppor
   536  | SIM.40.04 | **Collapse QA & fixtures** (deterministic cave-in, tall tower +1..+4, mass conservation, perf bound) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok (mutation) | Automated test suite:

### C520 ADR:1559 game/js/plugins/DEUS_Levels.js:1000-1010 OK
section: 16.1 What exists
claim: - **A strata material table** with `support` (0..1 at full HP), `maxHP`, `debris` and a damage `resist` per type for stone, soil and wood (`DEUS_Levels.js:1000-1010`: the comment at `:1000-1002`, the table at `:1003-1010`).
  1000  // Material table. Diagnostic values, not balanced: maxHP in HP points; resist multiplies incoming damage by damage
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).
      ...
  1009  { id: M_LAVA, key: "lava", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }
  1010  ].map(m => Object.freeze(Object.assign(m, { resist: Object.freeze(m.resist) }))));

### C521 ADR:1559 game/js/plugins/DEUS_Levels.js:1000-1002 (bare, file from 0 line(s) back) OK
section: 16.1 What exists
claim: - **A strata material table** with `support` (0..1 at full HP), `maxHP`, `debris` and a damage `resist` per type for stone, soil and wood (`DEUS_Levels.js:1000-1010`: the comment at `:1000-1002`, the table at `:1003-1010`).
  1000  // Material table. Diagnostic values, not balanced: maxHP in HP points; resist multiplies incoming damage by damage
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).

### C522 ADR:1559 game/js/plugins/DEUS_Levels.js:1003-1010 (bare, file from 0 line(s) back) OK
section: 16.1 What exists
claim: - **A strata material table** with `support` (0..1 at full HP), `maxHP`, `debris` and a damage `resist` per type for stone, soil and wood (`DEUS_Levels.js:1000-1010`: the comment at `:1000-1002`, the table at `:1003-1010`).
  1003  const STRATA_MATERIALS = Object.freeze([
  1004  { id: M_AIR, key: "air", solid: false, fluid: false, maxHP: 0, support: 0, debris: null, resist: {} },
  1005  { id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble", resist: { impact: 0.5, dig: 1, blast: 1, fire: 0.1 } },
  1006  { id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, support: 0.5, debris: "loose_earth", resist: { impact: 1, dig: 2, blast: 1.5, fire: 0.2 } },
  1007  { id: M_WOOD, key: "wood", solid: true, fluid: false, maxHP: 60, support: 0.7, debris: "broken_timber", resist: { impact: 1, dig: 1, blast: 1.2, fire: 2 } },
  1008  { id: M_WATER, key: "water", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} },
  1009  { id: M_LAVA, key: "lava", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }
  1010  ].map(m => Object.freeze(Object.assign(m, { resist: Object.freeze(m.resist) }))));

### C523 ADR:1561 game/js/plugins/DEUS_Levels.js:1709-1725 OK
section: 16.1 What exists
claim: - `damageCell` writes one cell and emits `levels:strataDamaged` / `levels:strataDestroyed` (`DEUS_Levels.js:1709-1725`).
  1709  function damageCell(st, ax, ay, x, y, z, hits, damageType, source) {
  1710  const i = y * st.size + x, ref = { area: { x: ax, y: ay }, x, y, z };
  1711  const rec = currentRecord(st, z, ax, ay, i);
      ...
  1724  }
  1725  return results;

### C524 ADR:1562 game/js/plugins/DEUS_Levels.js:1783-1794 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - `applyVolumeDamage` is documented at `:1783-1794`, and its signature is at `:1795`. It calls `damageCell` from its box form (`:1815`) and from its sphere form, `sphereDamage` (`:1849`).
  1783  /**
  1784  * Damage a volume. Two forms:
  1785  *   applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact"[, { source }]):
      ...
  1793  * skipped, destroyed: [{ x, y, z, stratum, material }], levels } or { ok: false, reason }.
  1794  */

### C525 ADR:1562 game/js/plugins/DEUS_Levels.js:1795 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - `applyVolumeDamage` is documented at `:1783-1794`, and its signature is at `:1795`. It calls `damageCell` from its box form (`:1815`) and from its sphere form, `sphereDamage` (`:1849`).
  1795  function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {

### C526 ADR:1562 game/js/plugins/DEUS_Levels.js:1815 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - `applyVolumeDamage` is documented at `:1783-1794`, and its signature is at `:1795`. It calls `damageCell` from its box form (`:1815`) and from its sphere form, `sphereDamage` (`:1849`).
  1815  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C527 ADR:1562 game/js/plugins/DEUS_Levels.js:1849 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - `applyVolumeDamage` is documented at `:1783-1794`, and its signature is at `:1795`. It calls `damageCell` from its box form (`:1815`) and from its sphere form, `sphereDamage` (`:1849`).
  1849  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C528 ADR:1564 game/js/plugins/DEUS_Levels.js:1001-1002 OK
section: 16.1 What exists
claim: - **A destroyed stratum becomes air with no debris placed** (`DEUS_Levels.js:1001-1002`, `:1700-1702`; §1.4).
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).

### C529 ADR:1564 game/js/plugins/DEUS_Levels.js:1700-1702 (bare, file from 0 line(s) back) OK
section: 16.1 What exists
claim: - **A destroyed stratum becomes air with no debris placed** (`DEUS_Levels.js:1001-1002`, `:1700-1702`; §1.4).
  1700  out.destroyed = true;
  1701  out.debris = mat.debris;
  1702  rec[REC_M + s] = M_AIR;

### C534 ADR:1630 docs/VISION.md:132 OK
section: 17. Decay & Reclamation (V138)
claim: V138 is at `docs/VISION.md:132` (from directive 0021-V §7). The geology end state is directive 0021-V §8. The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
   132  | V138 | **Urban Decay, Nature Reclamation & Weathering** (user directive 2026-09-26, Directive 0021-V §7, LIFE-001..003): Abandoned and unmaintained structures decay physically over time rather than remaining static. Ro

### C535 ADR:1630 docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541 OK
section: 17. Decay & Reclamation (V138)
claim: V138 is at `docs/VISION.md:132` (from directive 0021-V §7). The geology end state is directive 0021-V §8. The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
   537  | SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Gro
   538  | SIM.40.06 | **Nature reclaiming** (vegetation invasion, soil/sediment burial, visible stages: intact -> weathered -> overgrown -> collapsed -> buried mound) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | dep: SIM.40
   539  | SIM.40.07 | **Item weathering & burial** (rot, rust, sediment burial, durable relics, LIFE-001 mass conservation, LIFE-002 no ore creation) | PLANNED | Directive 0021-V §7; V138; LIFE-001; LIFE-002 | dep: SIM.40.05 | C
   540  | SIM.40.08 | **Deep-history decay integration** (summary-level decay for fast-forward, LIFE-003 trace retention) | PLANNED | Directive 0021-V §7; V138; DEC-012; LIFE-003 | SIM.40.05, dep: SIM.30.02 | Claude → Grok | Dee
   541  | SIM.40.09 | **Decay QA & fixtures** (deterministic aging fixture, mass conservation, no ore creation, perf bound) | PLANNED | Directive 0021-V §7; V138 | SIM.40.06, SIM.40.07, dep: SIM.40.08 | Claude → Grok (mutation) 

### C536 ADR:1630 docs/RISK_REGISTER.md:60-62 OK
section: 17. Decay & Reclamation (V138)
claim: V138 is at `docs/VISION.md:132` (from directive 0021-V §7). The geology end state is directive 0021-V §8. The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
    60  | `LIFE-001` | Physical Matter Leakage in Lifecycle | Simulation | Matter silently deleted or leaked when constructions collapse, erode, or naturalize. | `CRITICAL` | Breaks mass-conservation; world hollows out over cent
    61  | `LIFE-002` | Accidental Finite Resource Respawning | Simulation / Economy | Naturalization or pedogenesis accidentally fabricating fresh metal ore veins (Fe, Cu, Ag, Au, Pt). | `CRITICAL` | Destroys economic scarcity; 
    62  | `LIFE-003` | Historical Over-Erasure | Narrative / World | Naturalization erasing meaningful player/faction historical geography too rapidly or completely. | `MAJOR` | World history feels impermanent; ruins feel generi

### C538 ADR:1637 game/js/plugins/DEUS_Doors.js:444 OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
   444  const O = Objects(), type = O && O.type(s.objectId), ruin = type && type.ruin ? type.ruin : "rubble";

