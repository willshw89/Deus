#!/usr/bin/env node
"use strict";
/**
 * tools/zrange/test_switch_depth2.js (WG.00.17, lane AA; PM ruling E1-A, 2026-09-26): the regression test for the
 * depth-2 expectation of layers_flat.switch_same_frame (game/js/plugins/DEUS_Depth.js, the `want` of switchState).
 *
 * Under E1-A the check wants the depth-2 plane (level to - 2) after a switch to level `to` only under the renderer's own
 * rule (Sprite_DepthRoot.prototype.rebuild): level to - 1 exposed (config.exposes) with an open cell in the view's area
 * (openCells). This test runs the real suite, unchanged, through the read-only gate tool
 * (tools/test_layer_render_flat.js --only switch_same_frame) in throwaway clones of a commit (tools/zrange/clone.js,
 * under %TEMP%), at a Z range with a level below -2 (default -4..4, passed as DEUS_Z_RANGE), and judges the check's
 * line against a probe.
 *
 * The probe: a test-only plugin (DEUS_TestSwitchProbe.js, written into the clone's game/js/plugins and registered in the
 * clone's plugins.js; never in game/) records at every levels:viewChanged, without DEUS_Depth's open-cell cache: the
 * frame, whether to - 1 and to - 2 are levels, config.exposes(to - 1), the open cells of level to - 1 in the view's area
 * (UF.Levels.shapeGrid, SHAPES.open) and the planes bound. A switch of the check's sequence is
 *   case (a) when to - 2 is a level and to - 1 is exposed with an open cell: depth 2 is bound and wanted;
 *   case (b) when to - 2 is a level and to - 1 has no open cell: depth 2 is neither bound nor wanted;
 *   "-"      when to - 2 is not a level (the 0->-1 switch at -2..+2).
 * The gate's world is not seeded (each run makes its own). Where -3 exists, an all-air cell of -2 stands on -3's solid
 * top and is a floor (DEUS_Levels derivePacked), so -2 has had no open cell in any run: the 0->-1 switch is case (b)
 * and the other four are case (a) with depth 2 on a level of -2..+2. Each switch is classified from the probe, not
 * assumed. The "open" variants have the probe open one cell of -2 at the first map start (its five strata air over a
 * -3 cell cut to a stone floor; a solid cell with solid neighbours and nobody standing there, at x and y 3..9 of the
 * area: outside every place the fixture scene can be built, whose centre is at least 20 cells from the area's edges),
 * so the 0->-1 switch becomes case (a) with depth 2 on the new level -3.
 *
 * Variants (edits: exact source edits of the clone's DEUS_Depth.js, each target exactly once):
 *   plain           no edit. PASS when switch_same_frame PASSes with both cases seen: every case (a) switch has the planes
 *                   [to - 1, to - 2] at the event and in the first drawn frame (planesOk is exact equality, so depth 2 was
 *                   wanted), every case (b) switch the plane [to - 1] only (so depth 2 was not wanted), and the probe saw
 *                   the same planes.
 *   plain_open      no edit, -2 opened. PASS as plain, with a case (a) switch whose depth-2 level is outside -2..+2 (planes
 *                   [-2, -3] after 0->-1).
 *   a_unbound       provocation for (a): the renderer never binds depth 2. CAUGHT when switch_same_frame FAILs, every case
 *                   (a) switch prints want [to - 1, to - 2] against the plane [to - 1], and no other switch prints a want.
 *   a_unbound_open  the same with -2 opened: the 0->-1 switch must also print want [-2, -3] against [-2].
 *   b_spurious      provocation for (b): the renderer binds depth 2 wherever to - 2 is a level (the rejected option B).
 *                   CAUGHT when switch_same_frame FAILs, every case (b) switch prints want [to - 1] against
 *                   [to - 1, to - 2], and no other switch prints a want.
 *   b_old_want      provocation for (b): the expectation ignores the rule (the want before E1-A). CAUGHT when
 *                   switch_same_frame FAILs, every case (b) switch prints want [to - 1, to - 2] against [to - 1], and no
 *                   other switch prints a want.
 *
 * Usage: node tools/zrange/test_switch_depth2.js [--commit=<rev>] [--z-range=-4..4[,-16..15]] [--variants=plain,a_unbound]
 *                                               [--jobs=n] [--evidence=<dir>] [--keep]
 * Prints PASS/FAIL (plain variants) and CAUGHT/NOT CAUGHT (provocations) per range, then RESULT. Exit: 0 every plain
 * variant passed and every provocation was caught; 1 otherwise; 2 harness problem (no switch_same_frame line, no probe,
 * no cell of -2 opened, an edit target not found exactly once).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");
const { makeClone, removeTree } = require("./clone.js");

const ROOT = path.resolve(__dirname, "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const flag = name => args.includes(`--${name}`);
const RANGES = arg("z-range", "-4..4").split(",").map(s => s.trim()).filter(Boolean);
const JOBS = Math.max(1, Number(arg("jobs", "3")) | 0);
const KEEP = flag("keep");
const EVIDENCE = arg("evidence", "") ? path.resolve(arg("evidence", "")) : "";
const RUN_TIMEOUT = 900000;
const LEGACY = { zMin: -2, zMax: 2 };
const log = (...a) => console.log(...a);

//-----------------------------------------------------------------------------
// The variants

const DEPTH = "DEUS_Depth.js";
// The renderer's depth-2 condition (rebuild) and the check's expectation (switchState), as committed under E1-A.
const RENDER_RULE = "config.maxDepth >= 2 && this.planes[0].level && config.exposes(v.z - 1) && openCells(v.x, v.y, v.z - 1).open > 0";
const CHECK_WANT = "want: [to - 1, to - 2].filter(z => L.isLevel(z) && (z === to - 1 || (config.exposes(to - 1) && openCells(area.x, area.y, to - 1).open > 0)))";
const UNBOUND = [[DEPTH, RENDER_RULE, `false /* PROVOKED a_unbound: depth 2 never bound */ && ${RENDER_RULE}`]];
const VARIANTS = {
    plain: { edits: [], needs: ["a", "b"] },
    plain_open: { edits: [], open: true, needs: ["a", "a_new"] },
    a_unbound: { target: "a", edits: UNBOUND, needs: ["a"] },
    a_unbound_open: { target: "a", edits: UNBOUND, open: true, needs: ["a", "a_new"] },
    b_spurious: { target: "b", edits: [[DEPTH, RENDER_RULE, "config.maxDepth >= 2 && this.planes[0].level /* PROVOKED b_spurious: depth 2 wherever to - 2 is a level (option B) */"]], needs: ["b"] },
    b_old_want: { target: "b", edits: [[DEPTH, CHECK_WANT, "want: [to - 1, to - 2].filter(z => L.isLevel(z)) /* PROVOKED b_old_want: the expectation before E1-A */"]], needs: ["b"] }
};
const NAMES = arg("variants", "") ? arg("variants", "").split(",").map(s => s.trim()).filter(Boolean) : Object.keys(VARIANTS);

//-----------------------------------------------------------------------------
// The probe (test only; its source is written into the clone)

function probePlugin() {
    "use strict";
    const out = process.env.ZR_SD2_PROBE;
    if (!out) return;
    const fs = require("fs");
    const rows = [];
    let opened = null;
    const write = () => { try { fs.writeFileSync(out, JSON.stringify({ range: UF.World && UF.World.zRange ? UF.World.zRange() : null, opened, rows }, null, 1)); } catch (_) { /* the driver reports a missing probe */ } };
    const record = (from, to) => {
        const row = { from, to, frame: Graphics.frameCount };
        try {
            const W = UF.World, L = UF.Levels, D = UF.Depth, v = W.viewLevel();
            row.area = { x: v.x, y: v.y };
            row.level1 = L.isLevel(to - 1);
            row.level2 = L.isLevel(to - 2);
            row.exposes1 = row.level1 ? !!D.config.exposes(to - 1) : false;
            const grid = row.level1 ? L.shapeGrid(to - 1, v.x, v.y) : null;
            let open = 0;
            if (grid) for (let i = 0; i < grid.length; i++) if (grid[i] === L.SHAPES.open) open++;
            row.grid1 = !!grid;
            row.open1 = open;
            const r = D.root();
            row.planes = r ? r.planes.filter(p => p.level).map(p => ({ depth: p.depth, z: p.level.z, visible: !!p.visible })) : null;
        } catch (e) { row.error = String((e && e.message) || e); }
        rows.push(row);
        write();
    };
    // ZR_SD2_OPEN=1: one cell of -2 made open at the first map start, far from any place of the fixture scene. An all-air
    // cell is a floor when the top stratum of the cell below is solid (DEUS_Levels derivePacked), so the -3 cell under it
    // keeps only its bottom stratum (a stone floor) and the -2 cell becomes all air: open.
    const openFar = () => {
        const W = UF.World, L = UF.Levels, v = W.viewLevel();
        const ref = (x, y, z) => ({ area: { x: v.x, y: v.y }, x, y, z });
        opened = { tried: true, area: { x: v.x, y: v.y } };
        for (let y = 3; y <= 9 && !opened.cell; y++) for (let x = 3; x <= 9 && !opened.cell; x++) {
            let solid = true;
            for (let dy = -1; dy <= 1 && solid; dy++) for (let dx = -1; dx <= 1 && solid; dx++) if (L.shapeAt(ref(x + dx, y + dy, -2)) !== "solid") solid = false;
            if (!solid || [-3, -2, -1].some(z => W.standerAt(v.x, v.y, x, y, z))) continue;
            const low = L.setStrata(ref(x, y, -3), { m: ["stone", "air", "air", "air", "air"] }, { cause: "test" });
            const ok = low && L.setStrata(ref(x, y, -2), { m: ["air", "air", "air", "air", "air"] }, { cause: "test" });
            opened.cell = { x, y, z: -2, ok, after: L.shapeAt(ref(x, y, -2)), below: L.shapeAt(ref(x, y, -3)), refusal: ok ? null : JSON.stringify(L.lastRefusal ? L.lastRefusal() : null) };
        }
        write();
    };
    const start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        start.apply(this, arguments);
        UF.Events.on("levels:viewChanged", record);
        write();
    };
    const mapStart = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        mapStart.apply(this, arguments);
        if (process.env.ZR_SD2_OPEN === "1" && !opened) { try { openFar(); } catch (e) { opened = { error: String((e && e.message) || e) }; write(); } }
    };
}

//-----------------------------------------------------------------------------
// Clones and runs

function git(a, cwd) { return execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: Object.assign({}, process.env, { MSYS_NO_PATHCONV: "1" }) }).trim(); }

/** A clone of the commit with the variant's edits and the probe registered (the clone's own files only). */
function prepareClone(sha, name) {
    const v = VARIANTS[name];
    const { dir, head } = makeClone(sha, `sd2_${sha.slice(0, 8)}_${name}`);
    const plugins = path.join(dir, "game", "js", "plugins");
    for (const [file, from, to] of v.edits) {
        const p = path.join(plugins, file), src = fs.readFileSync(p, "utf8");
        const n = src.split(from).length - 1;
        if (n !== 1) throw new Error(`${name}: edit target occurs ${n} times in ${file}: ${from.slice(0, 90)}`);
        fs.writeFileSync(p, src.replace(from, () => to));
    }
    fs.writeFileSync(path.join(plugins, "DEUS_TestSwitchProbe.js"),
        `// Test-only probe written by tools/zrange/test_switch_depth2.js into a throwaway clone. Never part of the game.\n(${probePlugin.toString()})();\n`);
    const pj = path.join(dir, "game", "js", "plugins.js");
    const text = fs.readFileSync(pj, "utf8").replace(/^﻿/, "");
    const list = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    list.push({ name: "DEUS_TestSwitchProbe", status: true, description: "[test only] WG.00.17 E1-A probe", parameters: {} });
    fs.writeFileSync(pj, `// Generated by RPG Maker.\n// Do not edit this file directly.\nvar $plugins =\n[\n${list.map(p => JSON.stringify(p)).join(",\n")}\n];\n`);
    return { dir, head };
}
/** The gate tool, unchanged, in the clone: resolves { status, out, err, secs }. */
function runGate(clone, range, probeFile, open) {
    return new Promise(resolve => {
        const env = Object.assign({}, process.env, { DEUS_Z_RANGE: range, ZR_SD2_PROBE: probeFile, ZR_SD2_OPEN: open ? "1" : "0" });
        delete env.UF_TEST_PROVOKE;
        const t0 = Date.now();
        const child = spawn(process.execPath, [path.join(clone, "tools", "test_layer_render_flat.js"), "--only", "switch_same_frame"], { cwd: clone, env, stdio: ["ignore", "pipe", "pipe"] });
        let out = "", err = "";
        child.stdout.on("data", d => { out += d; });
        child.stderr.on("data", d => { err += d; if (err.length > 1e6) err = err.slice(-1e5); });
        const timer = setTimeout(() => { try { child.kill(); } catch (_) { /* gone */ } }, RUN_TIMEOUT);
        child.on("exit", status => { clearTimeout(timer); resolve({ status, out, err, secs: ((Date.now() - t0) / 1000).toFixed(0) }); });
    });
}

//-----------------------------------------------------------------------------
// Reading the check's line

/** The switches of switch_same_frame's detail: { from, to, frame, event: { planes, want }, drawn: { planes, want, never } }.
 *  want is null where the check printed none (planesOk: the planes are exactly the wanted levels). */
function parseSwitches(detail) {
    const heads = [...detail.matchAll(/(-?\d+)->(-?\d+) at levels:viewChanged \(frame (\d+)\): /g)];
    const planesOf = s => [...s.matchAll(/(-?\d+):(?:shown|HIDDEN) (?:painted|NOT PAINTED) since bound/g)].map(p => Number(p[1]));
    const wantOf = s => { const w = s.match(/\(want levels \[([^\]]*)\], shown and painted\)/); return w ? w[1].split(",").map(x => x.trim()).filter(Boolean).map(Number) : null; };
    return heads.map((m, i) => {
        const chunk = detail.slice(m.index + m[0].length, i + 1 < heads.length ? heads[i + 1].index : detail.length);
        const k = chunk.indexOf("; first drawn frame");
        const ev = k >= 0 ? chunk.slice(0, k) : chunk, dr = k >= 0 ? chunk.slice(k) : "";
        return { from: Number(m[1]), to: Number(m[2]), frame: Number(m[3]), event: { planes: planesOf(ev), want: wantOf(ev) }, drawn: { planes: planesOf(dr), want: wantOf(dr), never: k < 0 || /NEVER DRAWN/.test(dr) } };
    });
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const list = a => (a ? `[${a.join(", ")}]` : "-");
const isNew = z => z < LEGACY.zMin || z > LEGACY.zMax;

/** Judge one run. { ok, harness, text }: a plain variant -> ok means PASS; a provocation -> ok means CAUGHT. */
function judge(name, run, probe) {
    const v = VARIANTS[name];
    const line = [...run.out.matchAll(/^\s*(PASS|FAIL) layers_flat\.(\w+)(?: - (.*))?$/gm)].find(m => m[2] === "switch_same_frame");
    const result = (run.out.match(/^run: (RESULT: .*)$/m) || [null, "no RESULT line"])[1];
    if (!line) return { ok: false, harness: true, text: `switch_same_frame did not run (${result}; exit ${run.status})` };
    if (!probe) return { ok: false, harness: true, text: "the probe wrote nothing" };
    const opened = probe.opened && probe.opened.cell;
    if (v.open && !(opened && opened.ok && opened.after === "open")) return { ok: false, harness: true, text: `no cell of -2 was opened (${JSON.stringify(probe.opened)})` };
    const pass = line[1] === "PASS", sw = parseSwitches(line[3] || "");
    const rows = probe.rows || [];
    const cases = sw.map(s => {
        const row = rows.find(r => r.frame === s.frame && r.from === s.from && r.to === s.to) || null;
        const kind = !row || row.error ? "?" : !row.level2 ? "-" : row.exposes1 && row.open1 > 0 ? "a" : "b";
        return { s, row, kind };
    });
    const probePlanes = c => (c.row && c.row.planes ? c.row.planes.filter(p => p.visible).map(p => p.z) : null);
    const describe = c => `${c.s.from}->${c.s.to} case ${c.kind} (level ${c.s.to - 1}: ${c.row ? `${c.row.grid1 ? `${c.row.open1} open cell(s)` : "no grid"}, exposes ${c.row.exposes1}` : "no probe row"}): planes ${list(c.s.event.planes)} / drawn ${list(c.s.drawn.planes)}` +
        `${c.s.event.want ? `, want ${list(c.s.event.want)}` : ""}${c.s.drawn.want && !same(c.s.drawn.want, c.s.event.want) ? `, drawn want ${list(c.s.drawn.want)}` : ""}; probe planes ${list(probePlanes(c))}`;
    const problems = [];
    if (cases.length !== 5) problems.push(`${cases.length} switch(es) parsed, want 5`);
    if (cases.some(c => c.kind === "?")) problems.push(`no probe row for ${cases.filter(c => c.kind === "?").map(c => `${c.s.from}->${c.s.to}`).join(", ")}`);
    const two = c => [c.s.to - 1, c.s.to - 2], one = c => [c.s.to - 1];
    const seen = { a: cases.filter(c => c.kind === "a").length, b: cases.filter(c => c.kind === "b").length, a_new: cases.filter(c => c.kind === "a" && isNew(c.s.to - 2)).length };
    for (const n of v.needs) if (!seen[n]) problems.push(n === "a_new" ? "no case (a) switch with depth 2 on a level outside -2..+2" : `case (${n}) not seen`);
    if (!v.target) {
        if (!pass) problems.push("switch_same_frame FAILED");
        for (const c of cases) {
            if (c.kind === "?") continue;
            const want = c.kind === "a" ? two(c) : one(c);
            if (!same(c.s.event.planes, want) || !same(c.s.drawn.planes, want)) problems.push(`${c.s.from}->${c.s.to}: planes ${list(c.s.event.planes)} / drawn ${list(c.s.drawn.planes)}, want ${list(want)} (case ${c.kind})`);
            if (!same(probePlanes(c), c.s.event.planes)) problems.push(`${c.s.from}->${c.s.to}: the probe saw planes ${list(probePlanes(c))}`);
        }
    } else {
        if (pass) problems.push("switch_same_frame PASSED");
        const targets = cases.filter(c => c.kind === v.target), others = cases.filter(c => c.kind !== v.target && c.kind !== "?");
        for (const c of targets) {
            const expect = name === "b_spurious" ? { planes: two(c), want: one(c) } : { planes: one(c), want: two(c) };
            if (!same(c.s.event.planes, expect.planes) || !same(c.s.event.want, expect.want)) problems.push(`${c.s.from}->${c.s.to}: planes ${list(c.s.event.planes)} want ${list(c.s.event.want)}, expected planes ${list(expect.planes)} against want ${list(expect.want)}`);
        }
        for (const c of others) if (c.s.event.want || c.s.drawn.want) problems.push(`${c.s.from}->${c.s.to} (case ${c.kind}) also printed a want ${list(c.s.event.want || c.s.drawn.want)}`);
    }
    const openText = opened ? `; -2 opened at (${opened.x},${opened.y})` : "";
    return { ok: problems.length === 0, harness: false, pass, text: `${line[1]} switch_same_frame; case (a) ${seen.a} switch(es) (${seen.a_new} with depth 2 outside -2..+2), case (b) ${seen.b}${openText}; ${cases.map(describe).join(" | ")}${problems.length ? `; PROBLEMS: ${problems.join("; ")}` : ""} [${result}; gate exit ${run.status}; ${run.secs} s]` };
}

//-----------------------------------------------------------------------------
// Main

async function pool(tasks) {
    const out = new Array(tasks.length);
    let next = 0;
    const worker = async () => { while (next < tasks.length) { const k = next++; out[k] = await tasks[k](); } };
    await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, worker));
    return out;
}

async function main() {
    const clones = [];
    let code = 0;
    try {
        for (const n of NAMES) if (!VARIANTS[n]) { console.error(`unknown variant ${n}; known: ${Object.keys(VARIANTS).join(", ")}`); process.exit(2); }
        const sha = git(["rev-parse", arg("commit", "HEAD")], ROOT);
        log(`=== E1-A regression: layers_flat.switch_same_frame depth-2 expectation; commit ${sha}; ranges ${RANGES.join(", ")}; variants ${NAMES.join(", ")}; ${JOBS} run(s) at a time ===`);
        const prepared = {};
        for (const n of NAMES) { prepared[n] = prepareClone(sha, n); clones.push(prepared[n].dir); log(`clone ${n}: ${prepared[n].dir} (HEAD ${prepared[n].head})`); }
        const tmp = path.join(os.tmpdir(), "laneaa_sd2");
        fs.mkdirSync(tmp, { recursive: true });
        const tasks = [];
        for (const range of RANGES) for (const n of NAMES) tasks.push(async () => {
            const probeFile = path.join(tmp, `probe_${n}_${range.replace(/[^\w-]/g, "_")}_${process.pid}.json`);
            fs.rmSync(probeFile, { force: true });
            const run = await runGate(prepared[n].dir, range, probeFile, !!VARIANTS[n].open);
            let probe = null;
            try { probe = JSON.parse(fs.readFileSync(probeFile, "utf8")); } catch (_) { probe = null; }
            if (EVIDENCE) {
                fs.mkdirSync(EVIDENCE, { recursive: true });
                const tag = `sd2_${n}_z${range}`;
                fs.writeFileSync(path.join(EVIDENCE, `${tag}.log`), `${run.out}${run.err ? `\n--- stderr ---\n${run.err.slice(-4000)}` : ""}\nEXIT=${run.status}\n`);
                if (probe) fs.writeFileSync(path.join(EVIDENCE, `${tag}_probe.json`), JSON.stringify(probe, null, 1) + "\n");
            }
            fs.rmSync(probeFile, { force: true });
            return { n, range, j: judge(n, run, probe) };
        });
        const results = await pool(tasks);
        let bad = 0, harness = 0;
        for (const r of results) {
            if (r.j.harness) harness++;
            else if (!r.j.ok) bad++;
            const word = !VARIANTS[r.n].target ? (r.j.ok ? "PASS" : "FAIL") : (r.j.ok ? "CAUGHT" : "NOT CAUGHT");
            log(`${r.j.harness ? "HARNESS" : word} ${r.n} at ${r.range}: ${r.j.text}`);
        }
        code = harness ? 2 : bad ? 1 : 0;
        log(`RESULT: ${results.length - bad - harness} of ${results.length} as required (plain variants PASS, provocations CAUGHT)${harness ? `, ${harness} harness problem(s)` : ""} (exit ${code})`);
    } catch (e) {
        console.error(`HARNESS: ${e.stack || e.message}`);
        code = 2;
    } finally {
        if (!KEEP) for (const d of clones) { try { removeTree(d); } catch (e) { log(`(could not delete ${d}: ${e.message})`); } }
        else for (const d of clones) log(`kept ${d}`);
    }
    process.exit(code);
}
module.exports = { parseSwitches, judge, VARIANTS, RENDER_RULE, CHECK_WANT };
if (require.main === module) main();
