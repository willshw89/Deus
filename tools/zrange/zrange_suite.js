"use strict";
/**
 * tools/zrange/zrange_suite.js (WG.00.17, lane AA): the in-game half of tools/test_zrange.js. The driver writes
 * `(${zrangeSuitePlugin.toString()})();` into a snapshot copy as js/plugins/DEUS_TestZRange.js (registered after
 * DEUS_Test) and runs the suite "zrange" through tools/run_tests.js. Never part of the game.
 *
 * One NW.js run does one phase (process.env.ZR_PHASE), because DEUS_Test stops a run after 180 s, New Game included:
 *   core    the range and its levels, single_authority (in-game part), elevation_math, feet_2ft_10ft, sparse_memory (the
 *           storage, the split of a sky chunk), path_scratch_bounded, the New Game timing and heap, and the data the
 *           driver compares across commits and ranges: the core levels' checksums and cell hashes, the matter census
 *   play    extreme_layers_work (a unit stands, walks and paths on the top and bottom levels, the view switches there in
 *           place and stepping stops at the ends), sparse_save (fresh-world save sizes, a change high and low, save and
 *           load), then ZR_UPDATES map updates of simulation and the census again
 *   legacy  loads a save file (ZR_SAVE) written by the base commit and checks it plays at its own range; saves and
 *           loads it again
 *   make_legacy  (run on the base commit) writes the legacy save fixture and its fingerprint to ZR_OUT_DIR
 * Every phase writes test_output/zrange_report.json (numbers) besides the PASS/FAIL lines. The suite also runs on the
 * base commit (no range authority there: the legacy range is assumed) for the data the driver compares.
 */
function zrangeSuitePlugin() {
    "use strict";
    const T = window.UF && window.UF.Test;
    if (!T || !T.active) return;
    const fs = require("fs"), path = require("path");
    const outDir = path.join(nw.__dirname || process.cwd(), "test_output");
    const PHASE = (process.env.ZR_PHASE || "core").trim();
    const UPDATES = Math.max(0, Number(process.env.ZR_UPDATES || "3000") | 0);
    const report = { phase: PHASE, made: new Date().toISOString(), env: { DEUS_Z_RANGE: process.env.DEUS_Z_RANGE || null }, data: {}, timing: {} };
    const writeReport = () => { try { fs.writeFileSync(path.join(outDir, "zrange_report.json"), JSON.stringify(report, null, 1)); } catch (_) { /* reported by the driver */ } };

    // New Game timing: DataManager.setupNewGame (the world, its levels, history) and the first map start.
    const tBoot = performance.now();
    const _setup = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        const a = performance.now();
        const r = _setup.apply(this, arguments);
        report.timing.setupNewGameMs = +(performance.now() - a).toFixed(1);
        report.timing.setupNewGameAtMs = +(a - tBoot).toFixed(1);
        return r;
    };
    const _mapStart = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _mapStart.apply(this, arguments);
        if (report.timing.firstMapStartMs === undefined) report.timing.firstMapStartMs = +(performance.now() - tBoot).toFixed(1);
    };

    const fnvStep = (h, v) => Math.imul((h ^ (v & 255)) >>> 0, 16777619) >>> 0;
    const hex = h => (h >>> 0).toString(16).padStart(8, "0");

    T.suite("zrange", async t => {
        const W = UF.World, L = UF.Levels, O = UF.Objects, I = UF.Items;
        const tip = typeof W.zRange === "function";
        const LEG = { zMin: -2, zMax: 2 };
        const zr = tip ? W.zRange() : LEG, levels = tip ? W.levels().slice() : [-2, -1, 0, 1, 2];
        const CORE = [-2, -1, 0, 1, 2];
        const consoleErrors = [], realError = console.error;
        console.error = function(...a) { consoleErrors.push(a.map(x => (x && x.stack) || String(x)).join(" ").slice(0, 300)); return realError.apply(this, a); };
        const errors0 = t.errorsSoFar().length;
        const settled = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && !(L.switching && L.switching());
        await t.waitUntil(settled, 60000, "the map to settle");
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        const st = W.state, size = st.size, v0 = W.viewLevel(), area = { x: v0.x, y: v0.y };
        Object.assign(report.data, { tip, range: { zMin: zr.zMin, zMax: zr.zMax }, levels: levels.length, seed: st.seed, savedZRange: st.zRange === undefined ? null : st.zRange,
            view: { x: v0.x, y: v0.y, z: v0.z, px: $gamePlayer.x, py: $gamePlayer.y } });
        const ref = (x, y, z) => ({ area, x, y, z });
        const freeCol = (x, y, zs) => zs.every(z => !W.standerAt(area.x, area.y, x, y, z));
        // A block of cells (w x h) whose columns no unit stands on at the given levels, scanning from a start corner.
        function findBlock(w, h, zs, x0 = 8, y0 = 8) {
            for (let y = y0; y + h < size - 8; y += 3) for (let x = x0; x + w < size - 8; x += 3) {
                let ok = true;
                for (let dy = 0; dy < h && ok; dy++) for (let dx = 0; dx < w && ok; dx++) if (!freeCol(x + dx, y + dy, zs)) ok = false;
                if (ok) return { x, y };
            }
            return null;
        }
        const saveCell = (x, y, z) => { const s = L.strataAt(ref(x, y, z)); return { x, y, z, m: s.bytes.slice(), hp: s.hp.slice(), connector: s.connector || 0 }; };
        const restoreCell = c => L.setStrata(ref(c.x, c.y, c.z), { m: c.m, hp: c.hp, connector: c.connector }, { cause: "test" });
        const gcNow = () => { if (typeof window.gc === "function") { window.gc(); window.gc(); window.gc(); return true; } if (typeof global !== "undefined" && typeof global.gc === "function") { global.gc(); global.gc(); return true; } return false; };
        const heap = () => { const gc = gcNow(); return { gc, usedJSHeapSize: performance.memory ? performance.memory.usedJSHeapSize : null, nodeHeapUsed: process.memoryUsage ? process.memoryUsage().heapUsed : null }; };
        const pause = () => { if (UF.Time && UF.Time.pause && !UF.Time.paused) UF.Time.pause(); };
        const resume = () => { if (UF.Time && UF.Time.resume && UF.Time.paused) UF.Time.resume(); };

        //---------------------------------------------------------------- the matter census (base and tip; read only)
        // Every stratum of every cell of the core levels (-2..+2) by material byte; every map object on the core levels
        // (cached builds, else a peek) by object id; every item by type; every unit by kind; the ceiling caps (strata of
        // rock above +2: at the legacy range the caps' thickness, at a taller range the rock strata of the levels above +2);
        // at a taller range also the levels outside the core, by material byte.
        function census() {
            const c = { strata: {}, outer: {}, objects: {}, items: {}, units: {}, capStrata: 0, capColumns: 0, fluidStrata: 0 };
            const add = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
            const t0 = performance.now();
            for (const z of CORE) {
                for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                    const s = L.strataAt(ref(x, y, z));
                    for (let k = 0; k < 5; k++) if (s.bytes[k]) add(c.strata, `${s.bytes[k]}`);
                }
                const map = W.peekArea(area.x, area.y, z);
                for (let i = 0; i < map.ufObjects.length; i++) { const o = map.ufObjects[i]; if (o) add(c.objects, `${o}`); }
            }
            if (tip) {
                for (const z of levels) {
                    if (z >= -2 && z <= 2) continue;
                    const ci = L.chunkInfo(area.x, area.y, z), b = L.baseline(z, area.x, area.y);
                    if (!ci.mixedNow) {   // every chunk UNIFORM: 1024 cells of one code (the palette's)
                        const s = L.strataAt(ref(0, 0, z));
                        for (let k = 0; k < 5; k++) if (s.bytes[k]) add(c.outer, `${z}:${s.bytes[k]}`, size * size);
                        continue;
                    }
                    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                        const s = L.strataAt(ref(x, y, z));
                        for (let k = 0; k < 5; k++) if (s.bytes[k]) { add(c.outer, `${z}:${s.bytes[k]}`); if (z > 2) c.capStrata++; }
                    }
                    void b;
                }
            }
            // The caps above the top level (the whole cap at the legacy range).
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                const cap = L.capAt ? L.capAt(area, x, y) : null;
                if (cap) { c.capStrata += cap.thickness; c.capColumns++; }
            }
            for (const k in c.strata) { const b = Number(k); if ((b & 63) === 4 || (b & 63) === 5) c.fluidStrata += c.strata[k]; }
            const items = (st.items && st.items.byId) || {};
            for (const id in items) { const it = items[id]; add(c.items, `${it.type || it.typeId || it.id}:${it.z | 0}`, it.count || it.qty || 1); }
            for (const u of W.units()) add(c.units, `${(u.data && (u.data.species || u.data.kind)) || "?"}:${u.z | 0}`);
            c.ms = +(performance.now() - t0).toFixed(0);
            return c;
        }

        //---------------------------------------------------------------- core-level hashes (base and tip)
        function coreHashes() {
            const out = { checksums: {}, regenerated: {}, baseline: {}, cells: {}, shapes: {} };
            for (const z of CORE) {
                out.checksums[z] = st.levels[String(z)] ? st.levels[String(z)].checksum : null;
                out.regenerated[z] = L.checksum(z);
                const b = L.baseline(z, area.x, area.y);
                let hb = 2166136261 >>> 0;
                const m = b.strata.m, cn = b.conn;   // the dense bytes (at the tip: the store's compat copy, built on this read)
                for (let i = 0; i < m.length; i++) hb = fnvStep(hb, m[i]);
                for (let i = 0; i < cn.length; i++) hb = fnvStep(hb, cn[i]);
                out.baseline[z] = hex(hb);
                let hc = 2166136261 >>> 0, hs = 2166136261 >>> 0;
                for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                    const s = L.strataAt(ref(x, y, z));
                    for (let k = 0; k < 5; k++) { hc = fnvStep(hc, s.bytes[k]); hc = fnvStep(hc, s.hp[k]); }
                    hc = fnvStep(hc, s.connector ? s.connector.length : 0);
                    hs = fnvStep(hs, L.shapeCodeAt(area.x, area.y, x, y, z));
                }
                out.cells[z] = hex(hc);
                out.shapes[z] = hex(hs);
            }
            return out;
        }

        //---------------------------------------------------------------- the blast fixture (base and tip)
        // A 7 x 7 block of cells made full stone on -2, -1 and the ground; spheres of radius 3, 5 and 7 ft round -1's S2
        // at the block's centre destroy every stratum they reach (constant falloff, damage far above any HP). Each
        // stratum destroyed is recorded as "dx,dy,dz,s"; the driver compares with the 1 ft (base) and 2 ft (tip) tables.
        async function blastFixture() {
            const b = findBlock(7, 7, [-2, -1, 0], 20, 20);
            if (!b) return { error: "no free 7x7 block" };
            const cx = b.x + 3, cy = b.y + 3, zs = [-2, -1, 0], saved = [];
            for (const z of zs) for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) saved.push(saveCell(b.x + dx, b.y + dy, z));
            const out = { block: b, center: { x: cx, y: cy, z: -1, s: 2 }, radii: {} };
            for (const R of [3, 5, 7]) {
                for (const z of zs) for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) L.setStrata(ref(b.x + dx, b.y + dy, z), { m: ["stone", "stone", "stone", "stone", "stone"], connector: 0 }, { cause: "test" });
                const r = L.applyVolumeDamage({ center: { area, x: cx, y: cy, z: -1, s: 2 }, radius: R, damage: 1e9, damageType: "dig", falloff: "constant" });
                out.radii[R] = { ok: r.ok, strataDestroyed: r.strataDestroyed, levels: r.levels, hits: (r.destroyed || []).map(d => `${d.x - cx},${d.y - cy},${d.z + 2},${d.stratum}`).sort() };
            }
            for (const c of saved) restoreCell(c);
            return out;
        }

        //================================================================ phases
        if (PHASE === "make_legacy") { await makeLegacy(); finishPhase(); return; }
        if (PHASE === "legacy") { await legacyLoad(); finishPhase(); return; }
        if (PHASE === "core") await corePhase();
        else if (PHASE === "play") await playPhase();
        finishPhase();

        function finishPhase() {
            console.error = realError;
            const errs = t.errorsSoFar().slice(errors0);
            report.data.errors = { harness: errs, console: consoleErrors };
            t.check("no_errors", errs.length === 0 && consoleErrors.length === 0, `harness errors ${errs.length}${errs.length ? ` (first: ${errs[0]})` : ""}; console.error ${consoleErrors.length}${consoleErrors.length ? ` (first: ${consoleErrors[0]})` : ""}`);
            writeReport();
        }

        //---------------------------------------------------------------- core
        async function corePhase() {
            pause();
            report.data.heapAfterNewGame = heap();
            report.data.pathScratchAtStart = tip ? W.pathScratchStats() : null;
            if (tip) {
                report.data.memory = L.strataMemory(area.x, area.y);
                delete report.data.memory.perLevel;
                report.data.memoryPerLevel = {};
                const pm = L.strataMemory(area.x, area.y).perLevel;
                for (const z in pm) report.data.memoryPerLevel[z] = { dir: pm[z].dir, strata: pm[z].strata, connectors: pm[z].connectors, chunks: pm[z].chunks, mixedChunks: pm[z].mixedChunks };
                report.data.palette = L.paletteInfo();
                report.data.fluid = window.UF.Fluid && window.UF.Fluid.diagnostics ? window.UF.Fluid.diagnostics() : "UF.Fluid not bound in this build";
                report.data.levelEntries = Object.keys(st.levels).map(Number).sort((p, q) => p - q);
            } else {
                report.data.memoryBase = L.strataMemory(area.x, area.y);
            }
            writeReport();

            //------------------------------------------------ single_authority (in-game part)
            if (tip) {
                const probe = [zr.zMin - 1, zr.zMin, zr.zMin + 1, -2, 0, 2, zr.zMax - 1, zr.zMax, zr.zMax + 1];
                const bad = [], rows = [];
                const objType = O.types().find(o => o.passable === true) || O.types()[0], itemType = I.types()[0];
                for (const z of [...new Set(probe)]) {
                    const want = z >= zr.zMin && z <= zr.zMax;
                    const lv = { x: area.x, y: area.y, z };
                    let threw = false;
                    try { const u = W.addUnit({ name: "TEST_zr_probe", image: { characterName: "People1", characterIndex: 2 }, area, x: 4, y: 4, z, exact: true, data: { kind: "test" } }); W.removeUnit(u.id); } catch (e) { threw = true; }
                    const id = W.areaMapId(area.x, area.y, z), back = id ? W.levelOfMapId(id) : null;
                    const dropped = I.drop(lv, 4, 5, itemType.id, 1);
                    const dropOk = dropped.length > 0;
                    for (const it of dropped) I.remove(it.id);
                    const objSet = O.setIn(lv, 5, 4, objType.id);
                    if (objSet) O.setIn(lv, 5, 4, null);
                    const got = {
                        isLevel: W.isLevel(z), inWorld: W.inWorld(area.x, area.y, z), levelsIsLevel: L.isLevel(z), label: L.label(z) !== "", mapId: !!id && !!back && back.z === z,
                        addUnit: !threw, itemsDrop: dropOk, objectsSetIn: !!objSet, strataAt: !!L.strataAt(ref(4, 4, z)), shapeAt: L.shapeAt(ref(4, 4, z)) !== "",
                        levelsList: levels.includes(z)
                    };
                    const wrong = Object.keys(got).filter(k => got[k] !== want);
                    rows.push(`${z}: ${wrong.length ? `WRONG ${wrong.join("/")}` : want ? "accepted" : "refused"}`);
                    if (wrong.length) bad.push(z);
                }
                const listOk = levels.length === zr.zMax - zr.zMin + 1 && levels[0] === zr.zMin && levels[levels.length - 1] === zr.zMax && JSON.stringify(L.LEVELS) === JSON.stringify(levels);
                report.data.authorityProbe = rows;
                t.check("single_authority_ingame", bad.length === 0 && listOk,
                    `range ${zr.zMin}..${zr.zMax} (${levels.length} levels; UF.Levels.LEVELS the same list ${listOk}); probes (isLevel, inWorld, Levels.isLevel, label, map id round trip, addUnit, Items.drop, Objects.setIn, strataAt, shapeAt, level list): ${rows.join("; ")}`);
            }

            //------------------------------------------------ elevation_math
            if (tip) {
                const zs = [...new Set([zr.zMin, zr.zMin + 1, -2, -1, 0, 1, 2, zr.zMax - 1, zr.zMax])];
                const blk = findBlock(1, 1, zs, 12, 40);
                const bad = [], seen = [];
                let maxE = -1;
                for (const z of zs) {
                    const c0 = saveCell(blk.x, blk.y, z);
                    for (const s of [0, 2, 4]) {
                        const m = [0, 1, 2, 3, 4].map(k => (k <= s ? "stone" : "air"));
                        L.setStrata(ref(blk.x, blk.y, z), { m, connector: 0 }, { cause: "test" });
                        const want = (z - zr.zMin) * 5 + s, e = L.worldStrataElevationAt(ref(blk.x, blk.y, z));
                        const run0 = L.airRunAt(area, blk.x, blk.y, want), runUp = s < 4 ? L.airRunAt(area, blk.x, blk.y, want + 1) : null;
                        const dmg = L.applyVolumeDamage(area, blk.x, blk.y, z, s, blk.x, blk.y, z, s, 1e9, "dig");
                        const after = L.strataAt(ref(blk.x, blk.y, z));
                        const destroyedOk = dmg.ok && dmg.strataDestroyed === 1 && JSON.stringify(dmg.levels) === JSON.stringify([z]) && after.materials[s] === "air" && after.materials.slice(0, s).every(mm => mm === "stone");
                        if (e !== want || run0 !== 0 || (runUp !== null && runUp < 1) || !destroyedOk) bad.push(`${z}/S${s}: elevation ${e} (want ${want}), airRun ${run0}/${runUp}, box damage ${JSON.stringify({ ok: dmg.ok, n: dmg.strataDestroyed, levels: dmg.levels })}`);
                        if (want > maxE) maxE = want;
                        seen.push(`${z}/S${s}=${e}`);
                    }
                    restoreCell(c0);
                }
                const top = zr.zMax, topE = (top - zr.zMin) * 5 + 4;
                report.data.elevation = { cell: blk, samples: seen, maxElevation: maxE, topElevation: topE };
                t.check("elevation_math", bad.length === 0 && maxE === topE && (levels.length <= 5 || topE > 24),
                    `e = (z - ${zr.zMin}) * 5 + s on cell (${blk.x},${blk.y}) of levels ${zs.join(", ")}: worldStrataElevationAt, airRunAt at e (0) and e + 1 (air above), a one-stratum box damage at e destroys exactly (z, s); highest elevation ${maxE} (the top S4: ${topE}${topE > 24 ? ", past the old cap 24" : ""}); ${bad.length ? `WRONG: ${bad.join(" | ")}` : "all agree"}`);
            }

            //------------------------------------------------ feet_2ft_10ft (constants at the tip; the blast table everywhere)
            const blast = await blastFixture();
            report.data.blast = blast;
            if (tip) {
                const S = UF.Space;
                const ok = S.GRID_SIZE_FEET === 5 && S.FEET_PER_CELL === 5 && S.STRATUM_FEET === 2 && S.STRATA_PER_LAYER === 5 && S.Z_STEP_FEET === 10;
                t.check("feet_constants", ok, `UF.Space: cell ${S.GRID_SIZE_FEET} ft (per cell ${S.FEET_PER_CELL}), stratum ${S.STRATUM_FEET} ft, ${S.STRATA_PER_LAYER} strata a layer, Z_STEP_FEET ${S.Z_STEP_FEET} (DEC-013: 5 / 2 / 5 / 10)`);
            }
            writeReport();

            //------------------------------------------------ sparse_memory: outer levels UNIFORM, the split of one sky chunk
            if (tip) {
                const mem = L.strataMemory(area.x, area.y);
                const caps2 = L.baseline(2, area.x, area.y).caps || new Map();
                // The chunks the materialized cap rock must occupy above +2 (at a range taller than the legacy one).
                const want = {};
                if (zr.zMax > 2) for (const [i, code] of caps2) {
                    const x = i % size, y = (i - x) / size, th = (code >> 8) & 255;
                    for (let k = 0; k < th; k++) { const z = 3 + ((k / 5) | 0); if (z > zr.zMax) break; (want[z] = want[z] || new Set()).add(((y >> 5) * Math.ceil(size / 32)) + (x >> 5)); }
                }
                const outer = levels.filter(z => z < -2 || z > 2), wrong = [];
                let outerDir = 0, outerMixed = 0, outerMixedBytes = 0;
                for (const z of outer) {
                    const ci = L.chunkInfo(area.x, area.y, z), pl = mem.perLevel[z];
                    outerDir += pl.dir;
                    outerMixed += pl.mixedChunks;
                    outerMixedBytes += pl.strata + pl.connectors;
                    const expect = want[z] ? want[z].size : 0;
                    const mixedAt = ci.kinds.map((k, c) => (k === 1 ? c : -1)).filter(c => c >= 0);
                    const expectAt = want[z] ? [...want[z]].sort((p, q) => p - q) : [];
                    if (pl.mixedChunks !== expect || JSON.stringify(mixedAt) !== JSON.stringify(expectAt) || ci.split !== 0) wrong.push(`${z}: ${pl.mixedChunks} MIXED (want ${expect}), split ${ci.split}`);
                }
                report.data.sparse = { outerLevels: outer.length, outerDirBytes: outerDir, outerMixedChunks: outerMixed, outerMixedBytes, capColumns: caps2.size, chunksPerLevel: mem.perLevel[0].chunks,
                    totalBytes: mem.total, dirBytes: mem.dir, mixedBytes: mem.strata + mem.connectors, coreMixedChunks: mem.mixedChunks - outerMixed };
                t.check("sparse_outer_uniform", wrong.length === 0,
                    `${outer.length} levels outside -2..+2: directory ${outerDir} B (${mem.perLevel[levels[0]].chunks} chunks x 2 B a level), MIXED chunks ${outerMixed} (${outerMixedBytes} B: the rock of ${caps2.size} generated ceiling-cap columns rising above +2, ${Object.keys(want).length ? Object.keys(want).map(z => `+${z}: ${want[z].size}`).join(", ") : "none at this range"}), every other chunk UNIFORM; ${wrong.length ? `WRONG: ${wrong.join("; ")}` : "as expected"}; whole area: ${mem.total} B (directory ${mem.dir} B, MIXED arrays ${mem.strata + mem.connectors} B, shape grids ${mem.shapeGrids} B)`);

                // The first write to a sky cell splits exactly one chunk; its revert leaves nothing (no record, no entry).
                const zs = zr.zMax > 2 ? Math.min(12, zr.zMax) : 2;
                const blk = findBlock(1, 1, [zs], 60, 60);
                const before = L.chunkInfo(area.x, area.y, zs), c0 = saveCell(blk.x, blk.y, zs), entryBefore = !!st.levels[String(zs)];
                const skyBefore = L.strataAt(ref(blk.x, blk.y, zs));
                L.setStrata(ref(blk.x, blk.y, zs), { m: ["wood", "air", "air", "air", "air"], connector: 0 }, { constructed: true, cause: "test" });
                const after = L.chunkInfo(area.x, area.y, zs), entryAfter = JSON.stringify(st.levels[String(zs)] || null);
                const changed = after.kinds.map((k, c) => (k !== before.kinds[c] ? c : -1)).filter(c => c >= 0);
                restoreCell(c0);
                const back = L.chunkInfo(area.x, area.y, zs), entryBack = !!st.levels[String(zs)];
                const splitOk = skyBefore.materials.every(m => m === "air") && after.split === before.split + 1 && changed.length === 1 && after.records === before.records + 1 &&
                    back.split === before.split && back.records === before.records && entryBack === entryBefore;
                report.data.split = { level: zs, cell: blk, before: { split: before.split, mixedNow: before.mixedNow, records: before.records }, after: { split: after.split, mixedNow: after.mixedNow, records: after.records, changedChunks: changed }, entry: entryAfter, entryAfterRevert: entryBack };
                t.check("sparse_split_one_chunk", splitOk,
                    `sky cell (${blk.x},${blk.y}) on ${zs >= 0 ? "+" : ""}${zs} (air ${skyBefore.materials.every(m => m === "air")}): a wooden deck splits ${changed.length} chunk(s) [${changed.join(", ")}] (split ${before.split} -> ${after.split}, MIXED now ${before.mixedNow} -> ${after.mixedNow}, records ${before.records} -> ${after.records}); saved entry ${entryAfter.length} B ${entryAfter}; reverted: split ${back.split}, records ${back.records}, entry ${entryBack ? "KEPT" : "gone"} (had one before: ${entryBefore})`);
            }
            report.data.heapAfterChecks = heap();

            //------------------------------------------------ path_scratch_bounded
            if (tip) {
                const g = findBlock(24, 1, [0], 70, 100);
                let res = null, path = null;
                if (g) {
                    // A straight walk on the ground from the block's west end to its east end.
                    path = W.findPath(area, g.x, g.y, g.x + 20, g.y, { z: 0 });
                    res = W.pathScratchStats();
                }
                report.data.pathScratch = { from: g, pathLength: path ? path.length : null, stats: res };
                t.check("path_scratch_bounded", !!res && !!path && res.lastSearchLayers.length >= 1 && res.lastSearchLayers.length <= 3 && res.layersAllocated < levels.length,
                    res ? `a 3D search on the ground from (${g.x},${g.y}) to (${g.x + 20},${g.y}): path ${path ? path.length : "none"} cells; its scratch reached level(s) [${res.lastSearchLayers.join(", ")}] of ${levels.length}; layers with scratch arrays since boot ${res.layersAllocated} (${res.bytesPerLayer} B each), heap ${res.heapEntries} entries` : `no free ground row found (${JSON.stringify(g)})`);
            }

            //------------------------------------------------ data for the driver: hashes of the core levels, the census
            report.data.core = coreHashes();
            writeReport();
            report.data.census = census();
            report.data.heapAfterCensus = heap();
            resume();
            t.check("core_data_written", true, `range ${zr.zMin}..${zr.zMax}, seed ${st.seed}: checksums ${JSON.stringify(report.data.core.checksums)}; census ${report.data.census.ms} ms`);
        }

        //---------------------------------------------------------------- play
        async function playPhase() {
            pause();
            const fresh = DataManager.makeSaveContents();
            const partBytes = c => ({ levels: JSON.stringify(c.ufWorld.levels).length, zRange: JSON.stringify(c.ufWorld.zRange === undefined ? null : c.ufWorld.zRange).length,
                fluid: c.deusFluid ? JSON.stringify(c.deusFluid).length : 0, fluidAlias: c.ufFluid ? JSON.stringify(c.ufFluid).length : 0, total: JsonEx.stringify(c).length });
            report.data.saveFresh = partBytes(fresh);
            if (tip) {
                //------------------------------------------------ sparse_save: a change high and low, then save and load
                const zHi = Math.min(12, zr.zMax), zLo = Math.max(-14, zr.zMin);
                const blk = findBlock(1, 1, [zHi, zLo], 90, 90);
                const cHi = saveCell(blk.x, blk.y, zHi), cLo = saveCell(blk.x, blk.y, zLo);
                const lv0 = JSON.stringify(st.levels).length;
                L.setStrata(ref(blk.x, blk.y, zHi), { m: ["wood", "air", "air", "air", "air"], connector: 0 }, { constructed: true, cause: "test" });
                const lv1 = JSON.stringify(st.levels).length;
                L.setStrata(ref(blk.x, blk.y, zLo), { m: ["stone", "air", "air", "air", "air"], connector: 0 }, { cause: "test" });
                const lv2 = JSON.stringify(st.levels).length;
                const recHi = JSON.stringify(st.levels[String(zHi)]), recLo = JSON.stringify(st.levels[String(zLo)]);
                const hiNow = L.strataAt(ref(blk.x, blk.y, zHi)), loNow = L.strataAt(ref(blk.x, blk.y, zLo));
                const infoHi = L.chunkInfo(area.x, area.y, zHi), infoLo = L.chunkInfo(area.x, area.y, zLo);
                // Save and load (fresh game objects, a new Scene_Map), as a player's save would.
                const json = JsonEx.stringify(DataManager.makeSaveContents());
                const savedScene = SceneManager._scene;
                DataManager.createGameObjects();
                DataManager.extractSaveContents(JsonEx.parse(json));
                SceneManager.goto(Scene_Map);
                let timedOut = false;
                await t.waitUntil(() => SceneManager._scene !== savedScene && settled() && SceneManager._scene._spriteset, 60000, "the loaded game's map").catch(() => { timedOut = true; });
                await t.waitFrames(3);
                pause();
                const st2 = W.state, zr2 = W.zRange();
                const hi2 = L.strataAt(ref(blk.x, blk.y, zHi)), lo2 = L.strataAt(ref(blk.x, blk.y, zLo));
                const sameCell = (a, b) => JSON.stringify([a.bytes, a.hp, a.connector]) === JSON.stringify([b.bytes, b.hp, b.connector]);
                const roundOk = !timedOut && zr2.zMin === zr.zMin && zr2.zMax === zr.zMax && sameCell(hi2, hiNow) && sameCell(lo2, loNow) && hi2.changed && lo2.changed &&
                    JSON.stringify(L.chunkInfo(area.x, area.y, zHi).kinds) === JSON.stringify(infoHi.kinds) && JSON.stringify(L.chunkInfo(area.x, area.y, zLo).kinds) === JSON.stringify(infoLo.kinds);
                report.data.saveChanges = { levels: { zHi, zLo }, cell: blk, bytes: { before: lv0, afterHigh: lv1, afterLow: lv2 }, records: { high: recHi, low: recLo }, roundTrip: roundOk };
                // Each change adds only its own record (and a level entry for a level outside the core): at most 80 B.
                const addHi = lv1 - lv0, addLo = lv2 - lv1;
                t.check("sparse_save_changes", addHi > 0 && addHi <= 80 && addLo > 0 && addLo <= 80 && roundOk,
                    `a deck on ${zHi >= 0 ? "+" : ""}${zHi} and a dug stratum on ${zLo} at (${blk.x},${blk.y}): levels JSON ${lv0} -> ${lv1} (+${addHi} B: ${recHi}) -> ${lv2} (+${addLo} B: ${recLo}); save and load (${json.length} characters): range ${zr2.zMin}..${zr2.zMax}, both cells identical ${sameCell(hi2, hiNow) && sameCell(lo2, loNow)}, their chunks' kinds identical, ${timedOut ? "LOAD TIMED OUT" : "loaded"}`);
                restoreCell(cHi); restoreCell(cLo);
                report.data.saveAfterRevert = { levels: JSON.stringify(W.state.levels).length, entries: Object.keys(W.state.levels).map(Number).sort((p, q) => p - q) };

                //------------------------------------------------ extreme_layers_work
                await extremeLayers();
            }
            //------------------------------------------------ simulation, then the census again
            resume();
            if (UF.Time && UF.Time.setLevel) UF.Time.setLevel(UF.Time.speeds ? UF.Time.speeds.length - 1 : 4);
            const f0 = W._frame, tick0 = UF.Time && UF.Time.ticks ? UF.Time.ticks() : null, r0 = performance.now();
            await t.waitUntil(() => W._frame - f0 >= UPDATES, 150000, `${UPDATES} map updates`).catch(() => {});
            pause();
            if (UF.Time && UF.Time.setLevel) UF.Time.setLevel(0);
            report.data.simulation = { updates: W._frame - f0, ticks: tick0 === null ? null : UF.Time.ticks() - tick0, realMs: +(performance.now() - r0).toFixed(0) };
            report.data.censusAfter = census();
            resume();
            t.check("play_data_written", true, `after ${report.data.simulation.updates} map updates (${report.data.simulation.realMs} ms): census ${report.data.censusAfter.ms} ms`);
        }

        async function extremeLayers() {
            const top = zr.zMax, bot = zr.zMin, zs = [top, bot];
            const px = $gamePlayer.x, py = $gamePlayer.y;
            // A 7 x 5 deck on the top level and a 7 x 5 room dug on the bottom level, round the view.
            const x0 = Math.max(4, Math.min(size - 12, px - 3)), y0 = Math.max(4, Math.min(size - 10, py - 2));
            const saved = [];
            for (const z of zs) for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 7; dx++) {
                saved.push(saveCell(x0 + dx, y0 + dy, z));
                L.setStrata(ref(x0 + dx, y0 + dy, z), z === top ? { m: ["wood", "air", "air", "air", "air"], connector: 0 } : { m: ["stone", "air", "air", "air", "air"], connector: 0 },
                    z === top ? { constructed: true, cause: "test" } : { cause: "test" });
            }
            const shapesOk = zs.every(z => { for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 7; dx++) if (L.shapeAt(ref(x0 + dx, y0 + dy, z)) !== "floor") return false; return true; });
            const img = { characterName: "People1", characterIndex: 2 };
            const units = {}, pathInfo = {};
            for (const z of zs) {
                units[z] = W.addUnit({ name: `TEST_zr_${z}`, image: img, area, x: x0, y: y0 + 2, z, exact: true, data: { kind: "test" } });
                const p = W.findPath(area, x0, y0 + 2, x0 + 6, y0 + 2, { z });
                pathInfo[z] = { length: p ? p.length : null, layers: W.pathScratchStats().lastSearchLayers };
            }
            resume();
            const rows = [], shots = [];
            let ok = shapesOk;
            for (const z of zs) {
                // Show the level (in place), walk the unit across it, step past the end.
                const sw0 = L.stats().switches;
                const okSet = L.setView(z);
                await t.waitUntil(() => settled() && L.view() === z, 30000, `the view on ${z}`).catch(() => {});
                const last = L.stats().lastSwitch;
                W.sendUnit(units[z].id, { area, x: x0 + 6, y: y0 + 2, z });
                await t.waitUntil(() => { const u = W.unit(units[z].id); return !!u && !u.goal; }, 30000, `the unit on ${z} to walk`).catch(() => {});
                const u = W.unit(units[z].id);
                const arrived = !!u && u.x === x0 + 6 && u.y === y0 + 2 && (u.z | 0) === z;
                const ev = $gameMap._events[W.EVENT_BASE + units[z].id];
                const stepped = z === top ? L.up() : L.down();
                await t.waitFrames(5);
                const stillThere = L.view() === z;
                shots.push(t.screenshot(`extreme_${z >= 0 ? "p" : "m"}${Math.abs(z)}`));
                const plate = L.plateText();
                const good = okSet && L.view() === z && L.stats().switches === sw0 + 1 && !!last && last.to === z && last.inPlace === true && arrived && !!ev && stepped === false && stillThere && !!pathInfo[z].length;
                if (!good) ok = false;
                rows.push(`${z}: setView ${okSet} (in place ${last && last.inPlace}, frames ${last && last.frames}), plate "${plate}", unit ${arrived ? "walked" : "DID NOT ARRIVE"} to (${x0 + 6},${y0 + 2}) (event ${ev ? "on screen" : "MISSING"}), ` +
                    `path ${pathInfo[z].length} cells (scratch on [${pathInfo[z].layers.join(",")}]), ${z === top ? "up" : "down"} past the end ${stepped === false && stillThere ? "refused" : "NOT REFUSED"}`);
            }
            L.setView(0);
            await t.waitUntil(() => settled() && L.view() === 0, 30000, "the ground").catch(() => {});
            pause();
            for (const z of zs) if (W.unit(units[z].id)) W.removeUnit(units[z].id);
            for (const c of saved) restoreCell(c);
            report.data.extreme = { deck: { x0, y0 }, rows, path: pathInfo, screenshots: shots };
            t.check("extreme_layers_work", ok,
                `top ${top} (a wooden deck) and bottom ${bot} (a dug room), 7 x 5 cells at (${x0},${y0}), floors ${shapesOk}: ${rows.join("; ")}`);
        }

        //---------------------------------------------------------------- legacy fixture: make (base) and load (tip)
        function fingerprint() {
            const fp = { range: { zMin: zr.zMin, zMax: zr.zMax }, seed: st.seed, cells: {}, changed: {}, units: [], items: [] };
            for (const z of CORE) {
                let h = 2166136261 >>> 0, changed = 0;
                for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                    const s = L.strataAt(ref(x, y, z));
                    for (let k = 0; k < 5; k++) { h = fnvStep(h, s.bytes[k]); h = fnvStep(h, s.hp[k]); }
                    h = fnvStep(h, s.connector ? s.connector.length : 0);
                    if (s.changed) changed++;
                }
                fp.cells[z] = hex(h);
                fp.changed[z] = changed;
            }
            fp.units = W.units().map(u => `${u.id}:${u.name}:${u.area.x},${u.area.y},${u.x},${u.y},${u.z | 0}`).sort();
            const items = (st.items && st.items.byId) || {};
            fp.items = Object.keys(items).map(id => { const it = items[id]; return `${id}:${it.type || it.typeId}:${it.area ? `${it.area.x},${it.area.y}` : ""},${it.x},${it.y},${it.z | 0}:${it.count || it.qty || 1}`; }).sort();
            return fp;
        }
        async function makeLegacy() {
            pause();
            // Changes on every core level, so the load has saved records to read: a dug cell below, a deck above, a wall on
            // the ground, an item and a unit on each level.
            const blk = findBlock(5, 1, CORE, 30, 30);
            const img = { characterName: "People1", characterIndex: 2 }, itemType = I.types()[0];
            CORE.forEach((z, k) => {
                const x = blk.x + k, y = blk.y;
                if (z < 0) L.setStrata(ref(x, y, z), { m: ["stone", "air", "air", "air", "air"], connector: 0 }, { cause: "test" });
                else if (z > 0) L.setStrata(ref(x, y, z), { m: ["wood", "air", "air", "air", "air"], connector: 0 }, { constructed: true, cause: "test" });
                else L.setStrata(ref(x, y, z), { m: ["stone", "stone", "stone", "stone", "stone"], connector: 0 }, { constructed: true, cause: "test" });
                I.drop({ x: area.x, y: area.y, z }, x, y + 2, itemType.id, 3);
                W.addUnit({ name: `TEST_legacy_${z}`, image: img, area, x, y: y + 3, z, exact: true, data: { kind: "test" } });
            });
            const contents = DataManager.makeSaveContents();
            const json = JsonEx.stringify(contents);
            const outDirFx = process.env.ZR_OUT_DIR || outDir;
            fs.mkdirSync(outDirFx, { recursive: true });
            fs.writeFileSync(path.join(outDirFx, "legacy_save.json"), json);
            const fp = fingerprint();
            fp.madeBy = "tools/zrange/zrange_suite.js make_legacy";
            fp.block = blk;
            fs.writeFileSync(path.join(outDirFx, "legacy_fingerprint.json"), JSON.stringify(fp, null, 1));
            report.data.legacyMade = { bytes: json.length, block: blk, changed: fp.changed, units: fp.units.length, items: fp.items.length };
            t.check("legacy_fixture_written", json.length > 0, `${json.length} characters of save JSON, ${fp.units.length} units, ${fp.items.length} items, changed cells ${JSON.stringify(fp.changed)}, range ${zr.zMin}..${zr.zMax}`);
            resume();
        }
        async function legacyLoad() {
            const file = process.env.ZR_SAVE, fpFile = process.env.ZR_FINGERPRINT;
            const json = fs.readFileSync(file, "utf8"), want = JSON.parse(fs.readFileSync(fpFile, "utf8"));
            // Load a save into fresh game objects: the fingerprint is taken right after the state is read (before the map
            // starts, so nothing has moved), then the map is shown.
            const once = async text => {
                const savedScene = SceneManager._scene;
                DataManager.createGameObjects();
                DataManager.extractSaveContents(JsonEx.parse(text));
                const r = W.zRange(), s2 = W.state;
                const fp = { range: { zMin: r.zMin, zMax: r.zMax }, stateRange: s2.zRange === undefined ? "absent" : s2.zRange, levels: W.levels().length };
                const cells = fingerprintLive();
                SceneManager.goto(Scene_Map);
                let timedOut = false;
                await t.waitUntil(() => SceneManager._scene !== savedScene && settled() && SceneManager._scene._spriteset, 90000, "the loaded game's map").catch(() => { timedOut = true; });
                await t.waitFrames(3);
                const shown = W.viewLevel();
                return { timedOut, fp, cells, shown: shown ? { x: shown.x, y: shown.y, z: shown.z } : null };
            };
            const first = await once(json);
            const fpNow = first.cells;
            const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
            const firstOk = !first.timedOut && first.fp.range.zMin === -2 && first.fp.range.zMax === 2 && same(fpNow.cells, want.cells) && same(fpNow.changed, want.changed) && same(fpNow.units, want.units) && same(fpNow.items, want.items);
            report.data.legacyFirst = { load: first, cellsMatch: same(fpNow.cells, want.cells), changed: fpNow.changed, unitsMatch: same(fpNow.units, want.units), itemsMatch: same(fpNow.items, want.items),
                units: fpNow.units.length, items: fpNow.items.length, cells: fpNow.cells, want: want.cells };
            // Play a little, save, load again: the world as saved comes back at the same range.
            resume();
            await t.waitFrames(30);
            const atSave = fingerprintLive(), resaved = JsonEx.stringify(DataManager.makeSaveContents());
            const second = await once(resaved);
            const fp2 = second.cells;
            const secondOk = !second.timedOut && second.fp.range.zMin === -2 && second.fp.range.zMax === 2 && same(fp2, atSave) && W.levels().length === 5;
            report.data.legacySecond = { load: { timedOut: second.timedOut, fp: second.fp, shown: second.shown }, cellsSame: same(fp2.cells, atSave.cells), unitsSame: same(fp2.units, atSave.units), itemsSame: same(fp2.items, atSave.items) };
            delete first.cells;
            t.check("legacy_save_loads", firstOk && secondOk,
                `base save (${json.length} characters) loaded: range ${first.fp.range.zMin}..${first.fp.range.zMax} (${first.fp.levels} levels; saved zRange ${JSON.stringify(first.fp.stateRange)}), every cell of -2..+2 ${same(fpNow.cells, want.cells) ? "identical" : `DIFFERENT ${JSON.stringify(fpNow.cells)} vs ${JSON.stringify(want.cells)}`}, changed cells ${JSON.stringify(fpNow.changed)} (base ${JSON.stringify(want.changed)}), units ${same(fpNow.units, want.units) ? `identical (${fpNow.units.length})` : "DIFFERENT"}, items ${same(fpNow.items, want.items) ? `identical (${fpNow.items.length})` : "DIFFERENT"}; ` +
                `after 30 frames of play saved and loaded again: range ${second.fp.range.zMin}..${second.fp.range.zMax}, saved zRange ${JSON.stringify(second.fp.stateRange)}, the world as saved ${same(fp2, atSave) ? "identical (cells, units, items)" : "DIFFERENT"}${first.timedOut || second.timedOut ? ", A LOAD TIMED OUT" : ""}`);
            resume();
        }
        // The fingerprint of the world now loaded (the state and area may be other objects than at the suite's start).
        function fingerprintLive() {
            const st2 = W.state, v = W.viewLevel(), a2 = { x: v.x, y: v.y }, sz = st2.size;
            const fp = { cells: {}, changed: {}, units: [], items: [] };
            for (const z of CORE) {
                let h = 2166136261 >>> 0, changed = 0;
                for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
                    const s = L.strataAt({ area: a2, x, y, z });
                    for (let k = 0; k < 5; k++) { h = fnvStep(h, s.bytes[k]); h = fnvStep(h, s.hp[k]); }
                    h = fnvStep(h, s.connector ? s.connector.length : 0);
                    if (s.changed) changed++;
                }
                fp.cells[z] = hex(h);
                fp.changed[z] = changed;
            }
            fp.units = W.units().map(u => `${u.id}:${u.name}:${u.area.x},${u.area.y},${u.x},${u.y},${u.z | 0}`).sort();
            const items = (st2.items && st2.items.byId) || {};
            fp.items = Object.keys(items).map(id => { const it = items[id]; return `${id}:${it.type || it.typeId}:${it.area ? `${it.area.x},${it.area.y}` : ""},${it.x},${it.y},${it.z | 0}:${it.count || it.qty || 1}`; }).sort();
            return fp;
        }
    }, { isDefault: false });
}
module.exports = { zrangeSuitePlugin };
