#!/usr/bin/env node
"use strict";

/**
 * tasks/WG.00.08/probe_skylight_through_fluid.js
 *
 * WG.00.08 criterion 2.2c evidence probe (read-only: nothing on disk is changed). It reuses, by slicing
 * tools/test_strata_cuts_and_caves.js at run time, that suite's own vm harness (setup, newWorld), its MUTANTS table and
 * the water-planting instrumentation of its shafts_keep_fluid check, so the numbers are the check's own numbers, split by
 * seed. For each seed it reports:
 *   - every cave network that rolled a skylight: its node, and for each cell of the 1.2-radius disc which eligibility
 *     condition of the skylight pass (DEUS_Levels.js carveNaturalFeatures) refuses it (lock, wt, minTop, skylightMax,
 *     nearWater). One refused cell refuses the whole skylight, so the carve loop is never reached for it;
 *   - the planted water strata and the rock strata between the chamber roof and that water;
 *   - after generation, with the real code and with the skylight_through_fluid / shaft_through_fluid mutants: planted
 *     water strata that are no longer water, and rock strata under planted water that are no longer solid;
 *   - fluid conservation of the uninstrumented world: fluid strata per level, generator 4 vs generator 5 of the same seed,
 *     and every generator-4 fluid stratum's byte at the same place in generator 5;
 *   - rock under fluid in the uninstrumented world: fluid strata resting on air (generator 4 vs 5), and strata carved
 *     (solid in 4, air in 5) below a fluid stratum of the same column.
 * Usage: node tasks/WG.00.08/probe_skylight_through_fluid.js [--seeds=18,3] [--census-mutant=<suite mutant> | probe_self_test]
 * Exit: 0 when the real code keeps every planted water stratum and the rock under it, loses no fluid and carves nothing
 * under a fluid; 1 otherwise; 2 on a harness problem (a slice or mutant target missing).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..", "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const TEST = path.join(ROOT, "tools", "test_strata_cuts_and_caves.js");
const seedsArg = (process.argv.find(a => a.startsWith("--seeds=")) || "--seeds=18,3").slice(8);
const SEEDS = seedsArg.split(",").map(s => parseInt(s, 10) >>> 0);
// --census-mutant=<suite mutant>: only the fluid census, of a generator with that mutant (shows the census can fail).
const censusMutant = (process.argv.find(a => a.startsWith("--census-mutant=")) || "").slice(16);

function harnessProblem(msg) { console.log(`HARNESS ${msg}`); process.exit(2); }
process.on("uncaughtException", e => harnessProblem(`uncaught: ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`));
const T = fs.readFileSync(TEST, "utf8");
const slice = (a, b) => {
    const i = T.indexOf(a), j = T.indexOf(b, i + a.length);
    if (i < 0 || j <= i) harnessProblem(`slice of ${path.basename(TEST)} missing: ${a.slice(0, 60)}`);
    return T.slice(i, j);
};
// The suite's own pieces.
const MUTANTS = new Function(`${slice("const L_ = ", "\nif (process.argv.includes(\"--mutants\"))")}\nreturn MUTANTS;`)();
if (censusMutant && censusMutant !== "probe_self_test" && !MUTANTS[censusMutant]) harnessProblem(`unknown mutant "${censusMutant}"; known: ${Object.keys(MUTANTS).join(", ")}`);
const PLANT = slice("const plant = `", "`;\n    const inst").slice("const plant = `".length);
const ANCHOR = "        for (const sh of out.shafts) {\n";
const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];
const setup = new Function("fs", "path", "vm", "ROOT", "PLUGINS", "FILES", "performance", "harnessProblem", "quiet", "process",
    `${slice("function setup(sources, tag) {", "\n// A New Game world")}\nreturn setup;`)(fs, path, vm, ROOT, PLUGINS, FILES, performance, harnessProblem, true, process);
const newWorld = new Function("performance", `${slice("function newWorld(env, seed, levelsGen) {", "\nfunction saveJson")}\nreturn newWorld;`)(performance);

// Extra instrumentation (diagnostics only, before the suite's planting): why each skylight is refused or accepted.
const DIAG = `        out.skyDiag = [];
        for (const net of networks) {
            if (!net.skylight) continue;
            const nd = net.skylight.node, d = { network: net.id, level: net.z, x: nd.x, y: nd.y, F: nd.F, h: nd.h, stub: nd.stub,
                cells: 0, fail: { lock: 0, wt: 0, minTop: 0, skylightMax: 0, nearWater: 0 }, overburden: [], ok: true };
            disc(nd.x, nd.y, 1.2, i => {
                d.cells++;
                const ob = top[i] - (nd.F + nd.h);
                d.overburden.push(ob);
                if (lock[i] & (NO_CUT | NO_CAVE)) d.fail.lock++;
                if (wt[i] < 1) d.fail.wt++;
                if (minTop[i] > nd.F) d.fail.minTop++;
                if (ob > CV.skylightMax) d.fail.skylightMax++;
                if (nearWater(i)) d.fail.nearWater++;
            });
            d.ok = Object.keys(d.fail).every(k => d.fail[k] === 0);
            out.skyDiag.push(d);
        }
`;

// probe_self_test (a --census-mutant of the probe's own): after the carve, one fluid stratum on solid becomes air, and
// the solid stratum under another fluid stratum becomes air. The census must report both (exit 1).
const SELF_TEST = [["DEUS_Levels.js", "        out.ms = performance.now() - t0;\n        bs[2].features = out;", `        { let lost = false, under = false;   /* PROBE SELF-TEST */
            for (let i = 0; i < n && !(lost && under); i++) for (let e = 1; e < E_TOP; e++) {
                if (FLUID_B[getE(i, e)] !== 1 || !solidE(i, e - 1)) continue;
                if (!lost) { setE(i, e, M_AIR); lost = true; } else { setE(i, e - 1, M_AIR); under = true; }
                break;
            } }
        out.ms = performance.now() - t0;
        bs[2].features = out;`]];
function sources(mutant, instrument) {
    const s = {};
    for (const f of FILES) s[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    if (mutant) for (const [file, find, replace] of mutant === "probe_self_test" ? SELF_TEST : MUTANTS[mutant]) {
        if (!s[file].includes(find)) harnessProblem(`mutant ${mutant}: target not found in ${file}`);
        s[file] = s[file].replace(find, replace);
    }
    if (instrument) {
        if (!s["DEUS_Levels.js"].includes(ANCHOR)) harnessProblem("the shaft loop to instrument is missing");
        s["DEUS_Levels.js"] = s["DEUS_Levels.js"].replace(ANCHOR, DIAG + PLANT + ANCHOR);
    }
    return s;
}
const LEVELS = [-2, -1, 0, 1, 2], E_TOP = 25;
const isSolidB = v => v !== 0 && (v & 0x40) === 0 && (v & 0x3f) >= 1 && (v & 0x3f) <= 3;
const isFluidB = v => v !== 0 && (v & 0x40) === 0 && ((v & 0x3f) === 4 || (v & 0x3f) === 5);
function world(seed, mutant, instrument, gen) {
    const env = setup(sources(mutant, instrument), `${seed}-${mutant || "real"}${instrument ? "-inst" : ""}${gen ? `-g${gen}` : ""}`);
    newWorld(env, seed, gen);
    const st = env.UF.World.state, a = st.startArea, size = st.size, n = size * size;
    const M = LEVELS.map(z => env.UF.Levels.baseline(z, a.x, a.y).strata.m);
    const get = (i, e) => M[(e / 5) | 0][i * 5 + (e % 5)];
    return { env, size, n, get, F: env.UF.Levels.naturalFeatures(a.x, a.y), errors: env.__errors };
}

let bad = 0;
const t0 = Date.now();
console.log(`=== WG.00.08 2.2c probe: seeds ${SEEDS.join(",")}; suite ${path.relative(ROOT, TEST)}; mutants taken from its MUTANTS table${censusMutant ? `; census only, generator 5 with MUTANT ${censusMutant}` : ""} ===`);
for (const seed of SEEDS) {
    console.log(`--- seed ${seed}`);
    // Uninstrumented: fluid conservation generator 4 -> 5, and the skylights the real generator carves.
    const g4 = world(seed, "", false, 4), g5 = world(seed, censusMutant, false, 0);
    const per4 = {}, per5 = {};
    let moved = 0;
    for (let e = 0; e < E_TOP; e++) for (let i = 0; i < g4.n; i++) {
        const u = g4.get(i, e), v = g5.get(i, e), z = ((e / 5) | 0) - 2;
        if (isFluidB(u)) { per4[z] = (per4[z] || 0) + 1; if (u !== v) moved++; }
        if (isFluidB(v)) per5[z] = (per5[z] || 0) + 1;
    }
    const sum = o => Object.values(o).reduce((p, q) => p + q, 0);
    console.log(`FLUID seed ${seed}: generator 4 fluid strata ${sum(per4)} ${JSON.stringify(per4)}; generator 5 ${sum(per5)} ${JSON.stringify(per5)}; generator-4 fluid strata not the same fluid in generator 5: ${moved}`);
    if (moved || sum(per4) !== sum(per5)) bad++;
    // Rock under fluid: fluid strata resting on air (generator 4 vs 5), and strata carved (solid in 4, air in 5) in a column
    // with a fluid stratum above them in generator 5 (a carve under a pool, whatever lies between).
    let onAir4 = 0, onAir5 = 0, under = 0;
    const underAt = [];
    for (let i = 0; i < g4.n; i++) {
        let fluidAbove = false;
        for (let e = E_TOP - 1; e >= 0; e--) {
            const u = g4.get(i, e), v = g5.get(i, e);
            if (e > 0 && isFluidB(u) && g4.get(i, e - 1) === 0) onAir4++;
            if (e > 0 && isFluidB(v) && g5.get(i, e - 1) === 0) onAir5++;
            if (isFluidB(v)) fluidAbove = true;
            else if (fluidAbove && isSolidB(u) && v === 0) { under++; if (underAt.length < 4) underAt.push(`(${i % g4.size},${(i / g4.size) | 0}) e ${e}`); }
        }
    }
    console.log(`UNDER-FLUID seed ${seed}: fluid strata resting on air: generator 4 ${onAir4}, generator 5 ${onAir5}; strata carved (solid in 4, air in 5) below a fluid stratum of the same column: ${under}${underAt.length ? ` e.g. ${underAt.join("; ")}` : ""}`);
    if (under || onAir5 > onAir4) bad++;
    console.log(`CARVED seed ${seed} (${censusMutant ? `MUTANT ${censusMutant}` : "real"}, uninstrumented): cave networks ${g5.F.caves.length}, shafts ${g5.F.shafts.length}, skylights carved ${g5.F.skylights.length}${g5.F.skylights.length ? ` ${JSON.stringify(g5.F.skylights)}` : ""}`);

    for (const mutant of censusMutant ? [] : ["", "skylight_through_fluid", "shaft_through_fluid"]) {
        const w = world(seed, mutant, true, 0);
        const planted = w.F.planted || [], diag = w.F.skyDiag || [];
        if (!mutant) {
            console.log(`SKYLIGHTS seed ${seed}: networks ${w.F.caves.length} (by level ${JSON.stringify(w.F.caves.reduce((o, c) => (o[c.level] = (o[c.level] || 0) + 1, o), {}))}), rolled a skylight ${diag.length}, eligible ${diag.filter(d => d.ok).length}`);
            for (const d of diag) {
                const why = Object.entries(d.fail).filter(([, v]) => v).map(([k, v]) => `${k} ${v}/${d.cells}`).join(", ");
                console.log(`  network #${d.network} level ${d.level}: node (${d.x},${d.y}) floor F ${d.F} ft, h ${d.h} ft${d.stub ? " (stub)" : ""}; overburden top-(F+h) per disc cell [${d.overburden.join(",")}] (skylightMax 10); ${d.ok ? "ELIGIBLE: the carve loop runs" : `REFUSED before the carve loop: ${why}`}`);
            }
        }
        let waterGone = 0, rockGone = 0, rockUnder = 0, withRock = 0;
        const rows = [];
        for (const p of planted) {
            const i = p.y * w.size + p.x, now = w.get(i, p.e);
            if (now !== 4) waterGone++;
            if (p.solid.length) withRock++;
            let gone = 0;
            for (const k of p.solid) { rockUnder++; if (!isSolidB(w.get(i, k))) { rockGone++; gone++; } }
            if (p.kind === "skylight" && !mutant) rows.push(`(${p.x},${p.y}) water at ${p.e} ft over rock [${p.solid.join(",")}]`);
            if (mutant && (gone || now !== 4)) rows.push(`${p.kind} (${p.x},${p.y}): water at ${p.e} ft now ${now}${gone ? `, ${gone} rock strata under it carved` : ""}`);
        }
        const sky = planted.filter(p => p.kind === "skylight").length, sh = planted.length - sky;
        console.log(`${mutant ? `MUTANT ${mutant}` : "REAL"} seed ${seed}: planted ${sh} shaft + ${sky} skylight water strata (${withRock} skylight columns with rock under the water, ${rockUnder} rock strata); after the carve: planted water no longer water ${waterGone}, rock under it carved ${rockGone}; console.error ${w.errors.length}`);
        for (const r of rows) console.log(`  ${r}`);
        if (!mutant && (waterGone || rockGone || w.errors.length)) bad++;
    }
}
console.log(`TIME ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log(`RESULT: ${bad ? `${bad} problem(s) with the ${censusMutant ? `MUTANT ${censusMutant}` : "real"} code` : censusMutant ? `MUTANT ${censusMutant}: census clean` : "real code: every planted water stratum kept, no rock under it carved, no fluid lost, nothing carved under a fluid"} (exit ${bad ? 1 : 0})`);
process.exit(bad ? 1 : 0);
