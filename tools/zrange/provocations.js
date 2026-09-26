"use strict";
/**
 * tools/zrange/provocations.js (WG.00.17, lane AA): one provocation per check of tools/test_zrange.js. Each is an exact
 * source edit in the snapshot copy of a plugin (the target must occur exactly once), run on the configurations and
 * phases it needs; the named check must FAIL (`node tools/test_zrange.js --provoke=<name>` or `--provoke-all`).
 * scanEdit: the edit is made in a copy of the plugins that the static scan reads (single_authority's static half).
 */
const L = "DEUS_Levels.js", W = "DEUS_World.js";
const PROVOCATIONS = {
    // A range literal put back: DEUS_Doors' validator bound to -2..+2 again. Only the static scan sees it.
    literal_reinserted: { check: "single_authority", configs: ["-4..4"], phases: ["core"],
        scanEdit: ["DEUS_Doors.js", "    const validZ = z => Number.isInteger(z) && (z === 0 || !!(World() && typeof World().isLevel === \"function\" && World().isLevel(z)));",
            "    const validZ = z => Number.isInteger(z) && z >= -2 && z <= 2;"] },
    // The authority accepts one level past the top: the in-game probe must see zMax + 1 accepted.
    authority_past_top: { check: "single_authority", configs: ["-4..4"], phases: ["core"],
        edits: [[W, "    const isLevel = z => Number.isInteger(z) && z >= zSync().zMin && z <= zr.zMax;", "    const isLevel = z => Number.isInteger(z) && z >= zSync().zMin && z <= zr.zMax + 1; /* PROVOKED */"]] },
    // The old elevation cap: a box damage above elevation 24 is clipped away.
    elevation_cap_24: { check: "elevation_math", configs: ["-16..15"], phases: ["core"],
        edits: [[L, "const e0 = Math.max(0, elevationOf(minZ, minS)), e1 = Math.min(r.n * STRATA - 1, elevationOf(maxZ, maxS));", "const e0 = Math.max(0, elevationOf(minZ, minS)), e1 = Math.min(24, elevationOf(maxZ, maxS)); /* PROVOKED */"]] },
    // 1 ft strata again.
    stratum_one_foot: { check: "feet_2ft_10ft", configs: ["-4..4"], phases: ["core"],
        edits: [[W, "        STRATUM_FEET: 2,       // DEC-013 (1 ft before WG.00.17)", "        STRATUM_FEET: 1, /* PROVOKED */"]] },
    // The levels outside the core stored dense: every chunk split to arrays.
    outer_dense: { check: "sparse_memory", configs: ["-16..15", "-2..2"], phases: ["core"],
        edits: [[L, "        uniformStore(b, z < CORE.zMin ? STONE_CELL : AIR_CELL, size);\n", "        uniformStore(b, z < CORE.zMin ? STONE_CELL : AIR_CELL, size);\n        for (let c = 0; c < b.dir.length; c++) splitChunk(b, c); /* PROVOKED */\n"]] },
    // Every level gets its save entry at New Game (the dense save layout).
    entries_for_every_level: { check: "sparse_save", configs: ["-16..15", "-4..4"], phases: ["play"],
        edits: [[L, "        for (const z of CORE_LEVELS) if (!st.levels[String(z)]) st.levels[String(z)] = { z, gen: g, checksum: null, strata: {} };",
            "        for (const z of World().levels()) if (!st.levels[String(z)]) st.levels[String(z)] = { z, gen: g, checksum: null, strata: {} }; /* PROVOKED */"]] },
    // A save without a range is read as a new world (the default range), not as the legacy one.
    legacy_read_as_default: { check: "legacy_save_loads", configs: [], phases: ["legacy"],
        edits: [[W, "        else if (st.zRange === undefined) r = Z_RANGES.legacy;", "        else if (st.zRange === undefined) r = Z_RANGES.default; /* PROVOKED */"]] },
    // The generator changed: every cave passage a little wider.
    generator_changed: { check: "old_layers_identical", configs: ["-4..4"], phases: ["core"],
        edits: [[L, "nodeGap: [7, 13], chamberR: [2.5, 5.5], passageHalf: [0.7, 1.3],", "nodeGap: [7, 13], chamberR: [2.5, 5.5], passageHalf: [0.7, 1.4], /* PROVOKED */"]] },
    // Matter destroyed at New Game: a stone cell of -2's border rock becomes air (a change record; the baselines stay).
    matter_destroyed: { check: "matter_unchanged", configs: ["-4..4"], phases: ["core", "play"],
        edits: [[L, "    function onWorldCreated(st) {\n        ensureWorldLevels(st);",
            "    function onWorldCreated(st) {\n        ensureWorldLevels(st);\n        setStrata({ area: { x: 0, y: 0 }, x: 0, y: 0, z: -2 }, { m: [\"air\", \"air\", \"air\", \"air\", \"air\"] }); /* PROVOKED */"]] },
    // View stepping stops one level short of the top.
    stepping_short: { check: "extreme_layers_work", configs: ["-4..4"], phases: ["play"],
        edits: [[L, "        const r = zrSync(), to = Math.max(r.zMin, Math.min(r.zMax, z + dz));", "        const r = zrSync(), to = Math.max(r.zMin, Math.min(r.zMax - 1, z + dz)); /* PROVOKED */"]] },
    // The 3D search makes scratch for every level of the range.
    scratch_every_level: { check: "path_scratch_bounded", configs: ["-16..15"], phases: ["core"],
        edits: [[W, "        AS3.searchLayers = 0;\n        AS3.lastLayers = [];\n        return AS3.gen;",
            "        AS3.searchLayers = 0;\n        AS3.lastLayers = [];\n        for (let li = 0; li < zSync().levels.length; li++) layerScratch(li); /* PROVOKED */\n        return AS3.gen;"]] }
};
module.exports = { PROVOCATIONS };
