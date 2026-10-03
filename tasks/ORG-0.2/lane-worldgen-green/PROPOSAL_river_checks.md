# ORG-0.2 proposal: the two row-based river checks (Owner decision needed; nothing applied)

Writer Claude (deus-claude), 2026-10-02, after the F2 run at 21:34:58-21:37:59 CT. Source SHA 093a1f41 (item (c) commit). This is a proposal only: no assertion, threshold, fixture or watchdog was changed. The only test change made in this lane is the Owner-approved one: the worldgen suite reads `WorldGen.riverModels(st)` again instead of a literal `[]`.

## 1. What the controlled run measures (seed 1920951434, year 500, source 093a1f41)

```text
PASS worldgen.rivers_count - 2 river(s) (catalog count 1-2) at columns 235 (half-width 1), 28 (half-width 1)
FAIL worldgen.river_not_through_start - river(s) pass NaN, NaN cells from the start (keep away 14)
FAIL worldgen.river_continuous - 465 break(s); first: river at column 235: row 0 dry
```

Headless measurement on the same seed (`evidence/C_rivers/C_diag_rivers_seed1920951434_prefix.txt`, reproducible with `evidence/C_rivers/diag_rivers.js`):

- The hydrology macro grid is 16 x 16 nodes; node elevations run 0.135..0.834 (median 0.492); 56 nodes are at or above the 0.6 source floor; 25 are at or below sea level 0.3. Two rivers are planned, none fails.
- River #0: source node (14,7) at elevation 0.834, 6 macro nodes to the sea; cut course of 70 points over x 156..235, rows 41..118; it crosses 78 of the area's 256 rows.
- River #1: source node (1,11) at elevation 0.709, 5 macro nodes to the sea; 48 points over x 28..90, rows 182..222; 41 rows crossed.
- Neither course crosses row 128, the start row. The nearest point of river #0 to the start cell (128,128) is about 30 cells away (x 156 on row 118); river #1 is more than 50 cells away.

## 2. Why the two checks fail against a world that matches the current river design

The checks (DEUS_WorldGen.js at 093a1f41, lines 2263-2264 and 2268-2284, quoted in section 4) were written for the earlier river model: north-south meanders with a finite `center(gy)` on every row, running through the whole world. WG.HYDRO.04 (merged as 529497b4 under DEC-093) and the WG.WORLDGEN.06 bridge (2c23b61b) replaced those with A* rivers that run from a high source down to the sea or a terminal lake; the catalogue's `rivers.about` text still describes the old model. With the restored real input:

- `river_not_through_start` computes `Math.abs(Math.round(r.center(128)) - 128)`. `center(128)` is `NaN` for a river that never crosses row 128, so the gap is `NaN`, `NaN > 14` is false, and the check fails although both rivers keep far more than 14 cells from the start.
- `river_continuous` takes `col = Math.round(r.center(0))`, which is `NaN`; `NaN < 0 || NaN >= 256` is false, so the row loop runs over all 256 rows and every row the course never crosses is reported dry. The 465 breaks are mostly those rows (the headless estimate was 178 and 215 never-crossed rows); the rest are "jump" entries on crossed rows where the course's first crossing moves along an east-west run by more than `2 * halfWidth + 1` cells, which is how a meandering polyline behaves and not a gap in the water.

These are real failures of the row-by-row contract, not of the adapter: the adapter reports the carved course exactly, with `NaN` where the course does not exist. Inventing a column on rows a river never reaches would be fake data, which the Owner excluded.

## 3. Options

- **A (recommended). Keep the hydrology design and restate the two checks for it.** Same intent, same `keepAwayFromStart` (14), same count range, same "ocean and lake tiles count as water" rule, but measured along the carved course instead of row by row. Exact text in section 5. This is a test change and needs the Owner's approval before anyone applies it.
- **B. Keep the checks and change the world so every river crosses every row.** That needs `game/js/sim/worldgen/DEUS_Hydrology.js` (not in this lane's allowed paths) or re-adding the full-height meanders that WG.WORLDGEN.06 was told to remove. Not started.
- **C. Record both checks as expected-red** until A or B is decided.

## 4. Current code (093a1f41, `game/js/plugins/DEUS_WorldGen.js`)

```js2262:             const rivers = WorldGen.riverModels(st);
2263:             const gaps = rivers.map(r => Math.abs(Math.round(r.center(a.y * size + mid)) - (a.x * size + mid)));
2264:             t.check("river_not_through_start", gaps.every(g => g > cat.rivers.keepAwayFromStart), `river(s) pass ${gaps.join(", ")} cells from the start (keep away ${cat.rivers.keepAwayFromStart})`);
2265:             const [cMin, cMax] = cat.rivers.count;
2266:             t.check("rivers_count", rivers.length >= 1 && rivers.length >= cMin && rivers.length <= cMax,
2267:                 `${rivers.length} river(s) (catalog count ${cMin}-${cMax}) at columns ${rivers.map(r => `${r.anchorX} (half-width ${r.halfWidth})`).join(", ")}`);
2268:             // Continuity: each river is water on every row of the start area, and consecutive rows touch (ocean/lake cells count as water).
2269:             const breaks = [];
2270:             for (const r of rivers) {
2271:                 const col = Math.round(r.center(a.y * size)) - a.x * size;
2272:                 if (col < 0 || col >= size) continue;
2273:                 let prev = null;
2274:                 for (let y = 0; y < size; y++) {
2275:                     const c = Math.round(r.center(a.y * size + y)) - a.x * size;
2276:                     if (c < -r.halfWidth || c >= size + r.halfWidth) { prev = null; continue; }
2277:                     let wet = false;
2278:                     for (let x = Math.max(0, c - r.halfWidth); x <= Math.min(size - 1, c + r.halfWidth); x++) if (isWaterTile(here.data[y * size + x])) wet = true;
2279:                     if (!wet) breaks.push(`river at column ${r.anchorX}: row ${y} dry`);
2280:                     else if (prev !== null && Math.abs(c - prev) > 2 * r.halfWidth + 1) breaks.push(`river at column ${r.anchorX}: jump ${prev}->${c} at row ${y}`);
2281:                     prev = c;
2282:                 }
2283:             }
2284:             t.check("river_continuous", breaks.length === 0, breaks.length ? `${breaks.length} break(s); first: ${breaks[0]}` : `${rivers.length} river(s) wet on every row of area (${a.x},${a.y}) with no jumps`);
```

## 5. Proposed replacement for option A (not applied)

Replaces lines 2263-2264 (the gap and the first check) and 2268-2284 (the continuity loop and check). `rivers_count` at 2265-2267 is untouched. `isWater(gx, gy)` is the adapter's rasterized-tile lookup, the same raster the area build paints; `course` is the carved polyline in unwrapped tile coordinates.

```js
            // Nearest river tile to the start, from the carved raster: a hydrology river runs from its source to the sea
            // or a lake and need not cross the start row at all.
            const keep = cat.rivers.keepAwayFromStart;
            const gaps = rivers.map(r => {
                let nearest = Infinity;
                for (let dy = -keep; dy <= keep; dy++) for (let dx = -keep; dx <= keep; dx++) {
                    if (r.isWater(a.x * size + mid + dx, a.y * size + mid + dy)) nearest = Math.min(nearest, Math.max(Math.abs(dx), Math.abs(dy)));
                }
                return nearest;   // Infinity: no tile of this river within keep of the start
            });
            t.check("river_not_through_start", gaps.every(g => g > keep),
                `river(s) pass ${gaps.map(g => g === Infinity ? `more than ${keep}` : g).join(", ")} cells from the start (keep away ${keep})`);
            const [cMin, cMax] = cat.rivers.count;
            t.check("rivers_count", rivers.length >= 1 && rivers.length >= cMin && rivers.length <= cMax,
                `${rivers.length} river(s) (catalog count ${cMin}-${cMax}) at columns ${rivers.map(r => `${r.anchorX} (half-width ${r.halfWidth})`).join(", ")}`);
            // Continuity: every point of each river's carved course that lies in the start area is water on the built map
            // within the river's half-width (ocean/lake cells count as water). Tile connectivity of the raster itself is
            // proven by tools/test_hydrology.js (micro_connected: every river's tiles join its source to its mouth, 4-connected).
            const breaks = [];
            const worldW = W.state.areasX * size, worldH = W.state.areasY * size;
            const wrap = (v, n) => ((Math.round(v) % n) + n) % n;
            for (const r of rivers) {
                for (const p of r.course) {
                    const x = wrap(p.x, worldW) - a.x * size, y = wrap(p.y, worldH) - a.y * size;
                    if (x < 0 || x >= size || y < 0 || y >= size) continue;
                    let wet = false;
                    for (let yy = Math.max(0, y - r.halfWidth); yy <= Math.min(size - 1, y + r.halfWidth); yy++)
                        for (let xx = Math.max(0, x - r.halfWidth); xx <= Math.min(size - 1, x + r.halfWidth); xx++)
                            if (isWaterTile(here.data[yy * size + xx])) wet = true;
                    if (!wet) breaks.push(`river at column ${r.anchorX}: dry at (${x},${y})`);
                }
            }
            t.check("river_continuous", breaks.length === 0, breaks.length ? `${breaks.length} break(s); first: ${breaks[0]}` : `${rivers.length} river(s) wet along their whole course in area (${a.x},${a.y})`);
```

Notes for the decision:

- The old "jump" rule compared the river's column on consecutive rows; along a carved polyline consecutive course points are at most a few tiles apart by construction (the cut stops at pieces of 3 tiles), so a per-row jump test has no meaning there. If the Owner wants a jump rule kept, a threshold on the distance between consecutive in-area course points (for example `3 + 2 * halfWidth + 1`) is a new threshold and should be ruled on explicitly.
- A river whose whole course lies outside the start area adds no break; `rivers_count` still counts it, as before.
- With option A the F2 world is expected to pass `river_not_through_start` (both rivers more than 14 cells away) and `river_continuous` is expected to measure the built map's water along the two courses; whether the volumetric column rules (ramps and solid cells paint no water, DEUS_WorldGen.md section 2) leave a dry course point is exactly what the check would then report. No prediction of PASS is made here.

## 6. The `river_continuous_between_areas` check

Unchanged and not exercised: the controlled world is a single area (`AreasX`/`AreasY` 1), so `W.inWorld(a.x, a.y + 1)` is false and the check does not run.