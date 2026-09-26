"use strict";
/**
 * tools/zrange/blast_tables.js (WG.00.17, lane AA): the before/after fixture of the sphere damage geometry (ADR-003
 * R13; BRIEF P4). The blast fixture of tools/zrange/zrange_suite.js fills a 7 x 7 block of cells on -2, -1 and the
 * ground with stone and fires spheres of radius 3, 5 and 7 ft round the middle of S2 of the -1 cell at the block's
 * centre (constant falloff, damage far above any HP). This file computes, from the geometry alone, which strata such a
 * sphere destroys when a stratum is `stratumFt` feet high (1 before WG.00.17, 2 after, DEC-013) and a cell 5 ft
 * across: a stratum is hit when the distance from the sphere's centre to the stratum's middle is at most the radius
 * (the rule of DEUS_Levels sphereDamage). Keys: "dx,dy,dz,s" (dx, dy cells from the centre column, dz levels from -2
 * (0 = -2, 1 = -1, 2 = the ground), s the stratum), sorted as strings like the suite's.
 *
 * node tools/zrange/blast_tables.js prints both tables' sizes and the strata hit per level.
 */
const CELL_FT = 5, STRATA = 5, RADII = [3, 5, 7];

function blastTable(stratumFt, radii = RADII) {
    const out = {};
    const ec = 1 * STRATA + 2;   // the centre: -1 (dz 1), S2
    for (const R of radii) {
        const hits = [];
        for (let dz = 0; dz <= 2; dz++) for (let s = 0; s < STRATA; s++) {
            const de = ((dz * STRATA + s) - ec) * stratumFt;
            for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
                const h2 = (dx * CELL_FT) ** 2 + (dy * CELL_FT) ** 2;
                if (h2 > R * R) continue;
                if (h2 + de * de <= R * R) hits.push(`${dx},${dy},${dz},${s}`);
            }
        }
        out[R] = hits.sort();
    }
    return out;
}
module.exports = { blastTable, RADII };

if (require.main === module) {
    for (const ft of [1, 2]) {
        const t = blastTable(ft);
        for (const R of RADII) {
            const byLevel = {};
            for (const k of t[R]) { const dz = Number(k.split(",")[2]); byLevel[dz - 2] = (byLevel[dz - 2] || 0) + 1; }
            console.log(`${ft} ft strata, radius ${R} ft: ${t[R].length} strata hit; by level ${JSON.stringify(byLevel)}`);
        }
    }
}
