// bench_render_layers.js - WG.00.09b Lane K (K3): per-frame cost of the layer rendering, the level switches and the lower
// levels' units, measured in the real engine (nw.exe) on a disposable snapshot copy of game/.
//
// The tool makes a snapshot with tools/test_snapshot.js --no-run, writes an instrumentation plugin (DEUS_BenchRender.js)
// into the COPY only (never into game/), registers it before the test harness, and runs its suite through
// tools/run_tests.js. The plugin wraps engine and DEUS functions with timers (per frame: the frame interval, the engine
// tick, update and render parts, draw calls, UF.Events traffic) and drives a scenario:
//   --scenario normal (default): steady views +2, +1, Ground and -1 (a fixture cut down to -2 in view), the planes off and
//                                on, a pan, minimap tab switches, and six level switches with their stalls.
//   --scenario stress (Directive 0019-T sec. 2): 1x zoom, every visible cell of the +2 view filled with a unit on the level
//                                visible there (+2, +1 or the ground through the openings), all of them fighting: walking,
//                                sword swings, arrows and spells with their effects; 30 s by day, 30 s by night.
// Output: tasks/WG.00.09b/lane-k/perf/baseline_<sha8>.json (normal) or stress_baseline_<sha8>.json (stress), one file with
// every run (--runs n, default 1 normal / 2 stress) and a summary per phase: median, p95 and worst frame interval and the
// fps they imply, the tick and its parts.
//
// Machine load (WG.00.09b Fix 1, P3; DEC-017 hygiene): every run carries a machineLoad block: the CPU % of the whole machine
// sampled once a second while the run lasts (os.cpus() idle/total time deltas over all logical CPUs, the same quantity as
// \Processor(_Total)\% Processor Time), min / median / max per phase and overall; the concurrent AI worker count (the PM's
// filter, this session included) and the other nw.exe processes at start, every 15 s and at the end; and a label: "quiet"
// (overall median CPU <= 25 % and no other nw.exe seen) or "loaded". The numbers are reported with it and judged separately.
//
// Usage: node tools/bench_render_layers.js [--scenario normal|stress] [--runs n] [--rev <git rev>] [--allow-dirty] [--append]
//                                          [--pre-log <file>] [--keep]
//   --rev      measure an older revision: every file under game/ that differs between <rev> and HEAD is taken from <rev> in the
//              copy (only copied folders: js/, data/). The output name then carries that revision's sha8.
//   --append   add the run(s) to the existing output file of this scenario and sha instead of writing a new _<n> file.
//   --pre-log  the load-probe log of the wait before this run (below): stored in machineLoad.preRun.
//   --keep     keep the snapshot folder (by default each run's own folder is deleted after its numbers are read).
//        node tools/bench_render_layers.js --load-probe --log <file> [--probe-seconds 30] [--poll-seconds 120]
//                                          [--total-wait-seconds 1800] [--max-seconds 540]
//   Before a run (Fix 1 section 3.3): samples the CPU for 30 s and counts the other nw.exe. Quiet (median <= 25 %, no other
//   nw.exe): exit 0. Otherwise it waits --poll-seconds and samples again, for at most --max-seconds in this call (exit 3: call
//   it again) and --total-wait-seconds since the first attempt in the log (exit 0: run anyway, labelled loaded). Every attempt
//   is appended to the log (JSON lines). Nothing is ever killed or paused to make the machine quiet.
// Exit: 0 all runs finished and wrote their numbers; 1 a run finished without numbers; 2 harness problem.
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync, execFileSync } = require("child_process");

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };

//-----------------------------------------------------------------------------
// Machine load: CPU % from os.cpus() time deltas, the AI workers and the other nw.exe (PowerShell CIM, the PM's filter).

function cpuTimes() { let idle = 0, total = 0; for (const c of os.cpus()) { const t = c.times; idle += t.idle; total += t.user + t.nice + t.sys + t.idle + t.irq; } return { idle, total }; }
/** Sample the machine's CPU % once a second until stop(); samples are { t: epoch ms at the end of the second, cpu }. */
function cpuSampler() {
    const samples = [];
    let last = cpuTimes();
    const timer = setInterval(() => {
        const now = cpuTimes(), dt = now.total - last.total;
        if (dt > 0) samples.push({ t: Date.now(), cpu: +(100 * (1 - (now.idle - last.idle) / dt)).toFixed(1) });
        last = now;
    }, 1000);
    return { samples, stop: () => clearInterval(timer) };
}
const stats3 = arr => { if (!arr.length) return { samples: 0, min: null, median: null, max: null }; const s = arr.slice().sort((a, b) => a - b); return { samples: s.length, min: s[0], median: s[Math.floor((s.length - 1) / 2)], max: s[s.length - 1] }; };
const PS_PROCS = [
    "$all = @(Get-CimInstance Win32_Process)",
    "$w = @($all | Where-Object { ($_.Name -eq 'claude.exe' -and $_.CommandLine -match ' -p ') -or $_.Name -eq 'grok.exe' -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'codex\\.js.* exec') }).Count",
    "$nw = @($all | Where-Object { $_.Name -eq 'nw.exe' } | ForEach-Object { [pscustomobject]@{ pid = $_.ProcessId; ppid = $_.ParentProcessId; cmd = [string]$_.CommandLine } })",
    "[pscustomobject]@{ workers = $w; nw = $nw } | ConvertTo-Json -Compress -Depth 3"
].join("; ");
/** { at, aiWorkers, otherNwExe, otherNw } now. own: { profile: a string in the command line of this run's own nw.exe
 *  processes, rootPid: the nw.exe this tool started }. A process is this run's own when its command line names the profile
 *  or its parent chain reaches rootPid; every other nw.exe is listed with its command line (first 160 characters). */
function procsOf(at, own, out) {
    const j = JSON.parse(String(out).trim());
    const nw = j.nw ? [].concat(j.nw) : [];
    const byPid = new Map(nw.map(p => [p.pid, p]));
    const isOwn = p => {
        if (!own) return false;
        if (own.profile && String(p.cmd || "").includes(own.profile)) return true;
        for (let q = p, n = 0; q && n < 16; q = byPid.get(q.ppid), n++) if (own.rootPid && q.pid === own.rootPid) return true;
        return false;
    };
    const others = nw.filter(p => !isOwn(p));
    return { at, aiWorkers: j.workers, otherNwExe: others.length, otherNw: others.map(p => ({ pid: p.pid, ppid: p.ppid, cmd: String(p.cmd || "").slice(0, 160) })) };
}
const PS_ARGS = ["-NoProfile", "-NonInteractive", "-Command", PS_PROCS];
function procs(own) {
    const at = new Date().toISOString();
    try { return procsOf(at, own, execFileSync("powershell", PS_ARGS, { encoding: "utf8", windowsHide: true, timeout: 60000 })); }
    catch (e) { return { at, aiWorkers: null, otherNwExe: null, otherNw: [], error: e.message.split("\n")[0] }; }
}
/** The same without blocking the event loop (the checks during a run: the CPU sampler and the DevTools socket keep going). */
function procsAsync(own) {
    const at = new Date().toISOString();
    return new Promise(resolve => require("child_process").execFile("powershell", PS_ARGS, { encoding: "utf8", windowsHide: true, timeout: 60000 }, (err, out) => {
        if (err) return resolve({ at, aiWorkers: null, otherNwExe: null, otherNw: [], error: err.message.split("\n")[0] });
        try { resolve(procsOf(at, own, out)); } catch (e) { resolve({ at, aiWorkers: null, otherNwExe: null, otherNw: [], error: e.message }); }
    }));
}
const LOAD_NOTE = "aiWorkers: PowerShell CIM, claude.exe with ' -p ', grok.exe, node.exe running codex.js exec (the PM's filter); the session running this bench counts as 1. otherNwExe: nw.exe processes that are not this run's own (own: the command line names this run's profile folder, or the parent chain reaches the nw.exe the tool started); otherNw lists them with their command lines.";

if (args.includes("--load-probe")) {
    // The pre-run wait (Fix 1 section 3.3). Never kills or pauses anything.
    const log = opt("--log", null);
    if (!log) { console.error("HARNESS: --load-probe needs --log <file>"); process.exit(2); }
    const probeS = Number(opt("--probe-seconds", "30")), pollS = Number(opt("--poll-seconds", "120")), totalS = Number(opt("--total-wait-seconds", "1800")), maxS = Number(opt("--max-seconds", "540"));
    const read = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8").split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : []);
    const sleepMs = ms => new Promise(r => setTimeout(r, ms));
    (async () => {
        const began = Date.now();
        for (;;) {
            const prior = read(), first = prior.length ? Date.parse(prior[0].at) : Date.now();
            const p0 = procs(null), s = cpuSampler();
            await sleepMs(probeS * 1000 + 200);
            s.stop();
            const c = stats3(s.samples.map(x => x.cpu)), p1 = procs(null);
            const quiet = c.median !== null && c.median <= 25 && p0.otherNwExe === 0 && p1.otherNwExe === 0;
            const waited = (Date.now() - first) / 1000;
            const attempt = { at: p0.at, probeSeconds: probeS, cpu: c, aiWorkers: [p0.aiWorkers, p1.aiWorkers], otherNwExe: [p0.otherNwExe, p1.otherNwExe], quiet, waitedSeconds: +waited.toFixed(0) };
            fs.appendFileSync(log, JSON.stringify(attempt) + "\n");
            console.log(`LOAD-PROBE ${attempt.at}: CPU median ${c.median} % (min ${c.min}, max ${c.max}, ${c.samples} samples), AI workers ${attempt.aiWorkers.join("/")}, other nw.exe ${attempt.otherNwExe.join("/")} -> ${quiet ? "QUIET" : "loaded"}; waited ${attempt.waitedSeconds} s since the first attempt`);
            if (quiet) { console.log("exit 0 (quiet: run now)"); process.exit(0); }
            if (waited + pollS >= totalS) { console.log(`exit 0 (waited ${attempt.waitedSeconds} s of ${totalS}: run anyway; the run is labelled by its own load)`); process.exit(0); }
            if ((Date.now() - began) / 1000 + pollS + probeS > maxS) { console.log(`exit 3 (this call's ${maxS} s are used up: call --load-probe again)`); process.exit(3); }
            await sleepMs(pollS * 1000);
        }
    })();
    return;
}

const scenario = opt("--scenario", "normal");
if (!["normal", "stress"].includes(scenario)) { console.error(`HARNESS: unknown scenario "${scenario}"`); process.exit(2); }
const runs = Math.max(1, parseInt(opt("--runs", scenario === "stress" ? "2" : "1"), 10) || 1);
const rev = opt("--rev", null);
const root = path.resolve(__dirname, "..");
const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();

const headSha = git("rev-parse", "HEAD");
const measuredSha = rev ? git("rev-parse", rev) : headSha;
const sha8 = measuredSha.slice(0, 8);
const dirty = git("status", "--porcelain", "--", "game/").length > 0;
if (dirty && !rev && !args.includes("--allow-dirty")) {
    console.error("HARNESS: game/ has uncommitted changes; commit first (the output is named after the commit) or pass --allow-dirty");
    process.exit(2);
}
const outDir = path.join(root, "tasks", "WG.00.09b", "lane-k", "perf");
fs.mkdirSync(outDir, { recursive: true });
// An existing result is never overwritten (a diagnostic run once replaced a two-run baseline): the next free _<n> suffix is
// used instead, unless --force; --append adds the new run(s) to it.
const outBase = path.join(outDir, `${scenario === "stress" ? "stress_baseline" : "baseline"}_${sha8}${dirty && !rev ? "_dirty" : ""}`);
const append = args.includes("--append");
let outFile = `${outBase}.json`;
for (let n = 2; fs.existsSync(outFile) && !append && !args.includes("--force"); n++) outFile = `${outBase}_${n}.json`;
const preLog = opt("--pre-log", null);
const keepSnapshot = args.includes("--keep");

//-----------------------------------------------------------------------------
// The in-engine plugin (written into the snapshot copy only).

const PLUGIN = String.raw`//=============================================================================
// DEUS_BenchRender.js - GENERATED by tools/bench_render_layers.js into a snapshot copy. Not part of the game.
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [bench] WG.00.09b Lane K instrumentation (snapshot copies only).
 */
(() => {
    "use strict";
    // DEUS_Test loads after this plugin: UF.Test is read at Scene_Boot.start, and nothing is installed outside a harness run.
    const Test = () => (window.UF && UF.Test && UF.Test.active ? UF.Test : null);
    const fs = require("fs");
    const OUT = process.env.BENCH_OUT, SCENARIO = process.env.BENCH_SCENARIO || "normal";
    const now = () => performance.now();

    //-------------------------------------------------------------------------
    // Timers: acc[key] ms and cnt[key] calls in the current frame; frames[] one record per engine tick.
    const acc = Object.create(null), cnt = Object.create(null);
    const add = (key, ms) => { acc[key] = (acc[key] || 0) + ms; cnt[key] = (cnt[key] || 0) + 1; };
    const wrapped = new WeakSet();
    function wrap(obj, name, key) {
        if (!obj) return false;
        const orig = obj[name];
        if (typeof orig !== "function" || wrapped.has(orig)) return false;
        const f = function() { const t = now(); try { return orig.apply(this, arguments); } finally { add(key, now() - t); } };
        wrapped.add(f);
        obj[name] = f;
        return true;
    }
    const wraps = [];
    const tryWrap = (obj, name, key) => { if (wrap(obj, name, key)) wraps.push(key); };

    let recording = null;     // { phase, frames: [] } while a phase records
    let lastStart = 0, drawCalls = 0, tickStart = 0, tickFrames = 0;
    const counters = () => recording && recording.counters ? recording.counters() : null;
    function onTickStart() {
        const t = now();
        const dt = lastStart ? t - lastStart : 0;
        lastStart = t;
        tickStart = t;
        for (const k in acc) delete acc[k];
        for (const k in cnt) delete cnt[k];
        drawCalls = 0;
        return dt;
    }
    function onTickEnd(dt) {
        const tick = now() - tickStart;
        tickFrames++;
        if (!recording) return;
        const parts = {};
        for (const k in acc) parts[k] = +acc[k].toFixed(3);
        const calls = {};
        for (const k in cnt) calls[k] = cnt[k];
        const rec = { dt: +dt.toFixed(3), tick: +tick.toFixed(3), draws: drawCalls, parts, calls, at: Date.now() };
        const c = counters();
        if (c) rec.counts = c;
        recording.frames.push(rec);
    }
    function installTick() {
        const app = Graphics._app;
        if (!app || app.__benchTick) return;
        app.__benchTick = true;
        const ticker = app.ticker, orig = Graphics._onTick;
        ticker.remove(orig, Graphics);
        Graphics._onTick = function(deltaTime) { const dt = onTickStart(); try { orig.call(this, deltaTime); } finally { onTickEnd(dt); } };
        ticker.add(Graphics._onTick, Graphics);
        // Render (CPU side: transforms and draw submission) and the WebGL draw calls it issues.
        tryWrap(app, "render", "render");
        const gl = app.renderer && app.renderer.gl;
        if (gl) {
            for (const fn of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
                const o = gl[fn];
                if (typeof o === "function") gl[fn] = function() { drawCalls++; return o.apply(this, arguments); };
            }
        }
    }

    // Engine and plugin functions (wrapped after every plugin has loaded, at Scene_Boot.start).
    function installWraps() {
        tryWrap(SceneManager, "updateMain", "update");
        tryWrap(Scene_Map.prototype, "updateMain", "update.map");
        tryWrap(Spriteset_Map.prototype, "update", "update.spriteset");
        tryWrap(Spriteset_Map.prototype, "updateTilemap", "update.spriteset.tilemap");
        tryWrap(Sprite_Character.prototype, "update", "update.characters");
        tryWrap(Tilemap.prototype, "_addAllSpots", "paint.tilemaps");
        tryWrap(Tilemap.CombinedLayer.prototype, "render", "render.tilemap_layers");
        tryWrap(Sprite_Character.prototype, "render", "render.characters");
        if (window.UF) {
            if (UF.World) tryWrap(UF.World, "update", "update.map.world");
            if (UF.Events) tryWrap(UF.Events, "emit", "events");
            if (UF.Fog && UF.Fog.Sprite) tryWrap(UF.Fog.Sprite.prototype, "update", "update.fog");
            if (UF.Fog) tryWrap(UF.Fog, "refresh", "update.fog.refresh");
            if (UF.DayNight && UF.DayNight.GlowLayer) tryWrap(UF.DayNight.GlowLayer.prototype, "update", "update.daynight_glow");
            if (UF.Minimap) tryWrap(UF.Minimap, "processDirty", "update.minimap.chunks");
        }
        // Count world:* events (each listener of each costs a log line in DEUS_Core's emit).
        const E = window.UF && UF.Events;
        if (E) {
            const inner = E.emit;
            E.emit = function(name) {
                if (typeof name === "string") { const k = name.startsWith("world:") ? "events.world" : "events.other"; cnt[k] = (cnt[k] || 0) + 1; if (name.startsWith("world:")) cnt["events.world.listeners"] = (cnt["events.world.listeners"] || 0) + ((this._listeners[name] || []).length); }
                return inner.apply(this, arguments);
            };
        }
    }
    // Instances made per scene: the depth root, the minimap sprite, the depth plane tilemaps.
    function installSceneWraps(scene) {
        const r = window.UF && UF.Depth && UF.Depth.root ? UF.Depth.root() : null;
        if (r) {
            const P = Object.getPrototypeOf(r);
            tryWrap(P, "update", "update.spriteset.tilemap.depth");
            tryWrap(P, "lateUpdate", "update.depth_late");
            tryWrap(P, "render", "render.depth");
            const plane = r.planes && r.planes[0];
            if (plane && plane._tilemap) tryWrap(Object.getPrototypeOf(plane._tilemap), "_addAllSpots", "paint.depth_planes");
            // The parts of the depth root's frame (names that do not exist in an older revision are skipped).
            for (const n of ["scanUnits", "updateMask", "updateUnits"]) tryWrap(P, n, "depth.root." + n);
            if (plane) {
                const PP = Object.getPrototypeOf(plane);
                for (const n of ["updatePlane", "updateEntities", "placeEntities", "placeUnits", "sortEntities", "rebuildItems", "rebuildWalls", "rebuildUnits"]) tryWrap(PP, n, "depth.plane." + n);
                if (plane._objectLayer) tryWrap(Object.getPrototypeOf(plane._objectLayer), "update", "depth.plane.objectLayer");
                if (plane._tilemap) { const TP = Object.getPrototypeOf(plane._tilemap); tryWrap(TP, "updateTransform", "depth.plane.tilemapTransform"); }
            }
        }
        const mm = scene && scene._deusMinimap;
        if (mm) {
            const P = Object.getPrototypeOf(mm);
            tryWrap(P, "update", "update.minimap");
            tryWrap(P, "updateOverlay", "update.minimap.overlay");
            tryWrap(P, "drawChrome", "update.minimap.chrome");
            tryWrap(P, "render", "render.minimap");
        }
        const ss = scene && scene._spriteset;
        if (ss && ss._ufFog) tryWrap(Object.getPrototypeOf(ss._ufFog), "render", "render.fog");
        if (ss && ss._ufGlowLayer) tryWrap(Object.getPrototypeOf(ss._ufGlowLayer), "render", "render.daynight_glow");
    }

    let T = null;
    // The stress driver runs once per frame in Scene_Map.update, before the scene's own update.
    let benchDriver = null;
    const _Scene_Map_update_bench = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        if (benchDriver) benchDriver();
        _Scene_Map_update_bench.call(this);
    };
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        T = Test();
        if (!T) return;
        installWraps();
        registerSuite();
    };
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if (!T) return;
        installTick();
        installSceneWraps(this);
    };

    //-------------------------------------------------------------------------
    // Summaries

    const q = (arr, p) => { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
    const r3 = v => (v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(3));
    function summarize(phase, frames, extra) {
        const dts = frames.map(f => f.dt).filter(v => v > 0), ticks = frames.map(f => f.tick);
        const med = q(dts, 0.5), p95 = q(dts, 0.95), worst = dts.length ? Math.max(...dts) : null;
        const partKeys = new Set();
        for (const f of frames) for (const k in f.parts) partKeys.add(k);
        const parts = {};
        for (const k of [...partKeys].sort()) {
            const v = frames.map(f => f.parts[k] || 0);
            parts[k] = { median: r3(q(v, 0.5)), p95: r3(q(v, 0.95)), max: r3(Math.max(...v)), mean: r3(v.reduce((a, b) => a + b, 0) / v.length) };
        }
        const draws = frames.map(f => f.draws);
        const out = {
            phase, frames: frames.length,
            // Wall-clock span of the phase (epoch ms, the same clock as the tool's CPU samples: machineLoad.cpu.byPhase).
            wallStart: frames.length ? frames[0].at : null, wallEnd: frames.length ? frames[frames.length - 1].at : null,
            frameMs: { median: r3(med), p95: r3(p95), worst: r3(worst) },
            fps: { atMedian: med ? r3(1000 / med) : null, atP95: p95 ? r3(1000 / p95) : null, atWorst: worst ? r3(1000 / worst) : null },
            over16_7: dts.filter(v => v > 16.7).length, over33_4: dts.filter(v => v > 33.4).length, over50: dts.filter(v => v > 50).length,
            tickMs: { median: r3(q(ticks, 0.5)), p95: r3(q(ticks, 0.95)), worst: r3(ticks.length ? Math.max(...ticks) : null) },
            drawCalls: { median: q(draws, 0.5), p95: q(draws, 0.95), max: draws.length ? Math.max(...draws) : null },
            parts
        };
        const withCounts = frames.filter(f => f.counts);
        if (withCounts.length) {
            const peak = {};
            for (const f of withCounts) for (const k in f.counts) peak[k] = Math.max(peak[k] || 0, f.counts[k]);
            out.peak = peak;
        }
        const ev = frames.map(f => f.calls["events.world"] || 0), evl = frames.map(f => f.calls["events.world.listeners"] || 0);
        out.worldEventsPerFrame = { median: q(ev, 0.5), p95: q(ev, 0.95), max: ev.length ? Math.max(...ev) : 0, listenerCallsMedian: q(evl, 0.5), listenerCallsMax: evl.length ? Math.max(...evl) : 0 };
        return Object.assign(out, extra || {});
    }

    //-------------------------------------------------------------------------
    // Scenario helpers

    const result = { scenario: SCENARIO, startedAt: new Date().toISOString(), phases: [], switches: [], notes: [], environment: {} };
    async function record(t, phase, nFrames, counters, extra) {
        recording = { phase, frames: [], counters };
        await t.waitFrames(nFrames);
        const frames = recording.frames;
        recording = null;
        const s = summarize(phase, frames, extra);
        result.phases.push(s);
        T.write(` + "`BENCH ${phase}: ${frames.length} frames, frame median ${s.frameMs.median} ms (p95 ${s.frameMs.p95}, worst ${s.frameMs.worst}), tick median ${s.tickMs.median} ms, draw calls median ${s.drawCalls.median}`" + String.raw`);
        return s;
    }
    function proofWindow(W, L, area, size) {
        const S = L.surfaceGrid(area.x, area.y), COLS = 17, ROWS = 13;
        let best = null;
        for (let wy = 0; wy + ROWS <= size; wy += 2) for (let wx = 0; wx + COLS <= size; wx += 2) {
            let n0 = 0, n1 = 0, n2 = 0;
            for (let y = wy; y < wy + ROWS; y++) for (let x = wx; x < wx + COLS; x++) { const s = S[y * size + x]; if (s === 0) n0++; else if (s === 1) n1++; else n2++; }
            const score = Math.min(n0, n1, n2) * 1000 + n1 + n2;
            if (!best || score > best.score) best = { wx, wy, n0, n1, n2, score };
        }
        return { best, center: { x: best.wx + 8, y: best.wy + 6 } };
    }
    function fixtureCut(W, L, area, near, maxR) {
        const size = W.state.size, g0 = L.shapeGrid(0, area.x, area.y), g1 = L.shapeGrid(1, area.x, area.y), g2 = L.shapeGrid(2, area.x, area.y);
        const at = (g, x, y) => (g && x >= 0 && y >= 0 && x < size && y < size ? g[y * size + x] : 0);
        const FLOOR = L.SHAPES.floor, OPEN = L.SHAPES.open;
        const ok = (x, y) => at(g0, x, y) === FLOOR && at(g1, x, y) === OPEN && at(g2, x, y) === OPEN && !W.standerAt(area.x, area.y, x, y, 0);
        for (let r = 0; r <= maxR; r++) for (let y = near.y - r; y <= near.y + r; y++) for (let x = near.x - r; x <= near.x + r; x++) {
            if (Math.max(Math.abs(x - near.x), Math.abs(y - near.y)) !== r || x < 2 || y < 2 || x > size - 5 || y > size - 4) continue;
            let fits = true;
            for (let dy = 0; dy < 2 && fits; dy++) for (let dx = 0; dx < 3 && fits; dx++) fits = ok(x + dx, y + dy);
            if (!fits) continue;
            const cells = [];
            for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) cells.push({ x: x + dx, y: y + dy });
            for (const c of cells) L.setShape({ area, x: c.x, y: c.y, z: -2 }, "floor", { material: "stone" });
            L.setShape({ area, x: cells[0].x, y: cells[0].y, z: -1 }, "floor", { material: "stone" });
            for (const c of cells.slice(1)) L.setShape({ area, x: c.x, y: c.y, z: -1 }, "open");
            for (const c of cells) L.setShape({ area, x: c.x, y: c.y, z: 0 }, "open");
            return { cells, center: { x: x + 1, y: y + 1 } };
        }
        return null;
    }
    function depthCounts() {
        const r = window.UF && UF.Depth && UF.Depth.root ? UF.Depth.root() : null;
        let planeUnits = 0, planeSprites = 0;
        if (r) for (const p of r.planes) if (p.visible && p.level) { for (const s of p._units.values()) if (s.visible) planeUnits++; for (const c of p._entities.children) if (c.visible) planeSprites++; }
        const ss = SceneManager._scene && SceneManager._scene._spriteset;
        let chars = 0;
        if (ss && ss._characterSprites) for (const s of ss._characterSprites) if (s.visible && s.parent) chars++;
        return { unitsOnScreenLevel: chars, unitsOnLowerPlanes: planeUnits, lowerPlaneSprites: planeSprites };
    }

    //-------------------------------------------------------------------------
    // The suite

    function registerSuite() {
        T.suite("bench_layers", async t => {
            const W = UF.World, L = UF.Levels, D = UF.Depth;
            const scene = () => SceneManager._scene;
            result.environment = {
                screen: ` + "`${Graphics.width}x${Graphics.height}`" + String.raw`,
                depth: D ? D.describe() : "no UF.Depth",
                depthApi: D ? Object.keys(D).sort() : [],
                units: W.units().length,
                wraps: wraps.slice()
            };
            try { const gl = Graphics._app.renderer.gl, dbg = gl.getExtension("WEBGL_debug_renderer_info"); result.environment.gl = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)); } catch (e) { result.environment.gl = "unreadable"; }
            const size = W.state.size, area = W.viewLevel();
            if (UF.Environment && UF.Environment.setWeather) UF.Environment.setWeather({ x: area.x, y: area.y }, "clear");
            if (window.$gameScreen) $gameScreen.changeWeather("none", 0, 0);
            if (UF.Time && UF.Time.setForTest) UF.Time.setForTest(12, 0);
            if (UF.Time && UF.Time.setMultiplier) UF.Time.setMultiplier(1);
            const pw = proofWindow(W, L, area, size);
            const goTo = async (z, c) => {
                const t0 = now(), f0 = Graphics.frameCount;
                const okSwitch = L.setView(z, { center: c || pw.center });
                await t.waitUntil(() => !L.switching() && L.view() === z && scene() instanceof Scene_Map && scene().isStarted(), 30000, ` + "`view ${z}`" + String.raw`);
                return { ok: okSwitch, ms: now() - t0, frames: Graphics.frameCount - f0 };
            };
            const ok = await (SCENARIO === "stress" ? stress(t, W, L, D, area, size, pw, goTo) : normal(t, W, L, D, area, size, pw, goTo));
            result.finishedAt = new Date().toISOString();
            result.errors = UF.Test.errors.slice(0, 5);
            if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
            t.check("bench_finished", ok && result.phases.length > 0 && !!OUT, ` + "`${result.phases.length} phase(s), ${result.switches.length} switch(es) written to ${OUT}`" + String.raw`);
            t.check("no_errors", UF.Test.errors.length === 0, UF.Test.errors.length ? ` + "`${UF.Test.errors.length} error(s), first: ${UF.Test.errors[0]}`" + String.raw` : "none");
        }, { isDefault: false });
    }

    //-------------------------------------------------------------------------
    // CPU profile of a phase. Node's inspector module is not available inside nw.exe, so the tool runs V8's sampling
    // profiler over the DevTools protocol: this side logs BENCH_PROFILE_START / BENCH_PROFILE_STOP and waits for the tool's
    // acknowledgement in window.__benchProfilerReady / __benchProfilerDone. The aggregated profile is in the tool's report.
    async function profiled(t, label, wait) {
        console.log("BENCH_PROFILE_START " + label);
        try { await t.waitUntil(() => window.__benchProfilerReady === label, 8000, "the profiler to start"); }
        catch (e) { result.notes.push("profile " + label + ": the tool did not start the profiler (" + e.message + ")"); await wait(); return null; }
        const f0 = Graphics.frameCount, t0 = now();
        await wait();
        const frames = Graphics.frameCount - f0, wall = now() - t0;
        console.log("BENCH_PROFILE_STOP " + label + " " + frames + " " + wall.toFixed(1));
        try { await t.waitUntil(() => window.__benchProfilerDone === label, 30000, "the profiler to stop"); }
        catch (e) { result.notes.push("profile " + label + ": no stop acknowledgement (" + e.message + ")"); }
        return { label: label, updates: frames, wallMs: +wall.toFixed(1), where: "report.runs[].profiles[\"" + label + "\"]" };
    }
    async function recordFor(t, phase, ms, counters, extra) {
        recording = { phase: phase, frames: [], counters: counters };
        const t0 = now();
        await t.waitUntil(() => now() - t0 >= ms, ms + 60000, phase);
        const frames = recording.frames;
        recording = null;
        const s = summarize(phase, frames, Object.assign({ wallMs: +(now() - t0).toFixed(1) }, extra || {}));
        result.phases.push(s);
        T.write("BENCH " + phase + ": " + frames.length + " frames in " + (now() - t0).toFixed(0) + " ms, frame median " + s.frameMs.median + " ms (p95 " + s.frameMs.p95 + ", worst " + s.frameMs.worst + "), tick median " + s.tickMs.median + " ms, draw calls median " + s.drawCalls.median + (s.peak ? ", peak " + JSON.stringify(s.peak) : ""));
        return s;
    }

    async function normal(t, W, L, D, area, size, pw, goTo) {
        const cut = fixtureCut(W, L, area, pw.center, 60);
        result.notes.push(cut ? "fixture cut at (" + cut.cells[0].x + "," + cut.cells[0].y + ") 3x2, ground and -1 open over a -2 floor" : "no fixture cut (no 3x2 low-ground block within 60 cells)");
        const c = cut ? cut.center : pw.center;
        await goTo(2, c);
        await t.waitFrames(30);
        // 1. The planes' own cost on +2 with the simulation paused (DEUS_TimeSpeed): interleaved on/off rounds, the rest still.
        if (D && UF.Time && UF.Time.pause) {
            UF.Time.pause();
            await t.waitFrames(10);
            for (let round = 1; round <= 2; round++) {
                D.setEnabled(true); await t.waitFrames(10);
                await record(t, "paused_+2_planes_on_r" + round, 90, depthCounts, { view: 2, simulation: "paused" });
                D.setEnabled(false); await t.waitFrames(10);
                await record(t, "paused_+2_planes_off_r" + round, 90, depthCounts, { view: 2, simulation: "paused" });
            }
            D.setEnabled(true);
            UF.Time.resume();
            await t.waitFrames(10);
        }
        // 2. Steady views with the simulation running: timing, then a CPU profile of 90 more frames.
        for (const z of [2, 1, 0, -1]) {
            const sw = await goTo(z, c);
            await t.waitFrames(20);
            const s = await record(t, "steady_" + L.label(z), 150, depthCounts, { view: z, switchMs: +sw.ms.toFixed(1) });
            s.profile = await profiled(t, "steady_" + L.label(z), () => t.waitFrames(90));
        }
        // 3. A pan on +2: the planes repaint every 48 px.
        await goTo(2, c);
        await t.waitFrames(20);
        recording = { phase: "pan_+2", frames: [], counters: depthCounts };
        for (let i = 0; i < 6; i++) { $gameMap.scrollRight(1); await t.waitFrames(8); }
        for (let i = 0; i < 6; i++) { $gameMap.scrollLeft(1); await t.waitFrames(8); }
        { const fr = recording.frames; recording = null; result.phases.push(summarize("pan_+2", fr, { view: 2, tiles: 12 })); }
        // 4. Minimap tab switches (a tab visit rebuilds whatever is dirty, 8 chunks a frame).
        const M = window.UF && UF.Minimap;
        if (M) {
            const follow = M.followCameraZ;
            M.followCameraZ = false;
            recording = { phase: "minimap_tabs", frames: [], counters: () => ({ minimapDirty: M.stats().dirtyCount }) };
            for (const z of [1, 0, -1, -2, 2, 1, 0, -1, -2, 2]) { M.activeZ = z; await t.waitFrames(12); }
            const fr = recording.frames; recording = null;
            result.phases.push(summarize("minimap_tabs", fr, { visits: 10 }));
            M.followCameraZ = follow;
        }
        // 5. Level switches: +2 -> +1 -> Ground -> -1 -> Ground -> +1 -> +2, each recorded from the request to 30 frames after.
        for (const z of [1, 0, -1, 0, 1, 2]) {
            const from = L.view(), name = "switch_" + from + "_to_" + z;
            recording = { phase: name, frames: [], counters: depthCounts };
            const sw = await goTo(z, c);
            await t.waitFrames(30);
            const fr = recording.frames; recording = null;
            const s = summarize(name, fr, { from: from, to: z });
            const ls = L.stats && L.stats().lastSwitch;
            const ds = D ? D.stats() : null;
            result.switches.push({ from: from, to: z, requestToStartedMs: +sw.ms.toFixed(1), requestToStartedFrames: sw.frames, levelsLastSwitch: ls || null,
                worstFrameMs: s.frameMs.worst, framesOver33: s.over33_4, framesOver50: s.over50,
                depth: ds ? { rebuilds: ds.rebuilds, peeks: ds.peeks, lastPeekMs: r3(ds.lastPeekMs), lastPaintMs: r3(ds.lastPaintMs), canvasesMade: ds.canvasesMade, canvasesDestroyed: ds.canvasesDestroyed, layersAlive: ds.layersAlive } : null });
            result.phases.push(s);
        }
        return true;
    }

    //-------------------------------------------------------------------------
    // Directive 0019-T sec. 2: the worst-case combat stress. 1x zoom; every walkable visible cell of the +2 view holds a unit on
    // the level visible there (+2 itself, +1 through the open air of +2, the ground through both); all of them fight. Fixed seed.

    const PLACEHOLDERS = {
        arrow: { size: "12x4 px", color: "#8b5a2b", note: "arrow in flight: no arrow or projectile sprite exists in the game (no asset)" },
        spellOrb: { size: "10x10 px", color: "#ff7a1a", note: "spell projectile in flight: no spell projectile exists in the game (no asset)" },
        impactLower: { size: "24x24 px, 18 frames", color: "#ffd24a", note: "impact on a lower-level target: RMMZ animations need a Game_Event, which only the viewed level has" }
    };
    const ANIM = { slash: 6, pierce: 11, fire: 66 }; // RMMZ Animations.json (Effekseer): Slash Physical, Pierce Physical, Fire One 1
    const SHEETS = ["$UF_Human_Male_AR600", "$UF_Human_Female_AR600", "$UF_Orc_Male_AR600", "$UF_Elf_Male_AR600", "$UF_Dwarf_Male_AR600", "$UF_Goblin_Male_AR600"];
    function mulberry32(a) { return function() { a |= 0; a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

    async function stress(t, W, L, D, area, size, pw, goTo) {
        const rng = mulberry32(0x5eed0019);
        const C = UF.Combat, I = UF.Items;
        await goTo(2, pw.center);
        await t.waitFrames(20);
        const g = { 2: L.shapeGrid(2, area.x, area.y), 1: L.shapeGrid(1, area.x, area.y), 0: L.shapeGrid(0, area.x, area.y) };
        const OPEN = L.SHAPES.open, SOLID = L.SHAPES.solid;
        const walkable = code => code !== OPEN && code !== SOLID && code !== 0;
        const dx0 = Math.floor($gameMap.displayX()), dy0 = Math.floor($gameMap.displayY());
        const cols = Math.ceil($gameMap.screenTileX()), rows = Math.ceil($gameMap.screenTileY());
        const cells = [];
        for (let y = dy0; y < dy0 + rows; y++) for (let x = dx0; x < dx0 + cols; x++) {
            const wx = ((x % size) + size) % size, wy = ((y % size) + size) % size, i = wy * size + wx;
            let z = null;
            if (walkable(g[2][i])) z = 2;
            else if (g[2][i] === OPEN && walkable(g[1][i])) z = 1;
            else if (g[2][i] === OPEN && g[1][i] === OPEN && walkable(g[0][i])) z = 0;
            if (z !== null && !W.standerAt(area.x, area.y, wx, wy, z)) cells.push({ x: wx, y: wy, z: z });
        }
        const units = [];
        for (let k = 0; k < cells.length; k++) {
            const cell = cells[k], role = k % 3;
            const data = { kind: "test", through: true, inventory: [], thoughts: [], combatLevels: { attack: 60, strength: 60, defence: 60, hitpoints: 99, ranged: 60, magic: 60 },
                equipment: role === 0 ? { weapon: "sword_short" } : role === 1 ? { weapon: "bow_short" } : {} };
            const u = W.addUnit({ name: "TEST_stress_" + k, image: { characterName: SHEETS[k % SHEETS.length], characterIndex: 0 }, area: { x: area.x, y: area.y }, x: cell.x, y: cell.y, z: cell.z, dir: 2, exact: true, data: data });
            if (role === 1 && I && I.give) I.give("arrows", 999, u.id);
            units.push({ u: u, role: role, home: { x: cell.x, y: cell.y }, next: 20 + Math.floor(rng() * 60), target: null });
        }
        const byLevel = { 2: [], 1: [], 0: [] };
        for (const s of units) byLevel[s.u.z].push(s);
        for (const z of [2, 1, 0]) { const list = byLevel[z]; for (let i = 0; i < list.length; i++) list[i].target = list.length > 1 ? list[(i + 1) % list.length].u : null; }
        result.stress = { cells: cells.length, units: units.length, byLevel: { "+2": byLevel[2].length, "+1": byLevel[1].length, "0": byLevel[0].length }, roles: { melee: units.filter(s => s.role === 0).length, archers: units.filter(s => s.role === 1).length, casters: units.filter(s => s.role === 2).length },
            window: { x: dx0, y: dy0, cols: cols, rows: rows }, seed: "0x5eed0019", zoom: UF.Camera && UF.Camera.zoom ? UF.Camera.zoom() : 1,
            effectPaths: {
                walk: "UF.World.sendUnit ping-pong (one cell east and back): viewed level through RMMZ event movement and DEUS_Anim walk frames; lower levels through the DEUS_Depth walk tween and walk frames",
                melee: "UF.Combat.resolveAttack (bypassGcd) with sword_short: DEUS_Anim attack/hurt one-shots from the AR-600 sheets, DEUS_Combat hitsplats and action bars (viewed level only); plus RMMZ animation 6 Slash Physical (Effekseer; its flash timing flashes the target) on the viewed level",
                arrows: "UF.Combat.resolveAttack with bow_short and arrows (attack one-shot on the viewed level); the arrow in flight is a placeholder (see placeholders); impact: RMMZ animation 11 Pierce Physical on the viewed level, the placeholder impact on lower levels",
                spells: "data.casting = { targetId } (DEUS_Anim cast frames, viewed level only); a placeholder spell orb in flight; on arrival UF.Combat.resolveAttack({ spell: true }) and RMMZ animation 66 Fire One 1 (impact; its flash timings are the hit flash) on the viewed level, the placeholder impact on lower levels",
                lowerLevels: "DEUS_Depth draws only the walk and stand frames of lower-level units; their attacks resolve in the simulation, but the game draws no attack frames, splats, bars or RMMZ animations off the viewed level (the bench adds only its placeholders there)"
            },
            placeholders: PLACEHOLDERS, deaths: 0, attacks: 0, animations: 0 };
        // Flying things and lower-level impacts: bench-only solid-colour sprites (PIXI.Texture.WHITE, tinted), in the tilemap for
        // the viewed level (above the characters) or in the lower plane's entity container (masked and sorted with it).
        const flights = [], impacts = [];
        const z9 = 9999;
        const px = (x, y) => ({ x: ($gameMap.adjustX(x) + 0.5) * 48, y: ($gameMap.adjustY(y) + 0.5) * 48 });
        const hostOf = z => {
            const ss = SceneManager._scene && SceneManager._scene._spriteset;
            if (!ss) return null;
            if (z === L.view()) return ss._tilemap;
            const r = D && D.root ? D.root() : null;
            const p = r ? r.planes.find(q => q.level && q.level.z === z) : null;
            return p ? p._entities : null;
        };
        const solid = (w, h, color) => { const s = new PIXI.Sprite(PIXI.Texture.WHITE); s.width = w; s.height = h; s.tint = color; s.anchor.set(0.5, 0.5); s.z = z9; return s; };
        const evOf = u => (W.eventOf ? W.eventOf(u.id) : null);
        const animate = (u, id) => { const ev = u.z === L.view() ? evOf(u) : null; if (ev && window.$gameTemp) { $gameTemp.requestAnimation([ev], id); result.stress.animations++; return true; } return false; };
        const heal = u => { if (u && u.data) { if (u.data.dead) result.stress.deaths++; u.data.hp = u.data.maxHp || u.data.hp; } };
        const attack = (s, opts) => { if (!s.target || !C || !C.resolveAttack) return; C.resolveAttack(s.u, s.target, Object.assign({ bypassGcd: true }, opts || {})); result.stress.attacks++; heal(s.target); };
        const impactAt = u => {
            const host = hostOf(u.z);
            if (!host) return;
            const sp = solid(24, 24, 0xffd24a), p = px(u.x, u.y);
            sp.x = p.x; sp.y = p.y; host.addChild(sp);
            impacts.push({ sp: sp, left: 18 });
        };
        const launch = (s, kind) => {
            const host = hostOf(s.u.z);
            if (!host || !s.target) return;
            const sp = kind === "arrow" ? solid(12, 4, 0x8b5a2b) : solid(10, 10, 0xff7a1a);
            host.addChild(sp);
            flights.push({ sp: sp, s: s, kind: kind, from: { x: s.u.x, y: s.u.y }, to: s.target, t: 0, dur: kind === "arrow" ? 20 : 30 });
        };
        let frame = 0;
        const drive = () => {
            frame++;
            for (const s of units) {
                const u = s.u;
                if (!u || !u.data || u.data.dead) continue;
                if (!u.goal) W.sendUnit(u.id, { area: { x: area.x, y: area.y }, x: u.x === s.home.x ? (s.home.x + 1) % size : s.home.x, y: s.home.y, z: u.z });
                if (frame < s.next) continue;
                if (s.role === 0) { attack(s); if (s.target) animate(s.target, ANIM.slash); s.next = frame + 40 + Math.floor(rng() * 20); }
                else if (s.role === 1) { attack(s); launch(s, "arrow"); s.next = frame + 60 + Math.floor(rng() * 20); }
                else { u.data.casting = s.target ? { targetId: s.target.id } : true; launch(s, "orb"); s.next = frame + 90 + Math.floor(rng() * 30); }
            }
            for (let i = flights.length - 1; i >= 0; i--) {
                const f = flights[i];
                f.t++;
                const a = px(f.from.x, f.from.y), b = px(f.to.x, f.to.y), k = Math.min(1, f.t / f.dur);
                f.sp.x = a.x + (b.x - a.x) * k;
                f.sp.y = a.y + (b.y - a.y) * k;
                if (f.t < f.dur) continue;
                if (f.sp.parent) f.sp.parent.removeChild(f.sp);
                f.sp.destroy();
                flights.splice(i, 1);
                if (f.kind === "orb") attack(f.s, { spell: true });
                if (!animate(f.to, f.kind === "arrow" ? ANIM.pierce : ANIM.fire)) impactAt(f.to);
            }
            for (let i = impacts.length - 1; i >= 0; i--) {
                if (--impacts[i].left > 0) continue;
                const sp = impacts[i].sp;
                if (sp.parent) sp.parent.removeChild(sp);
                sp.destroy();
                impacts.splice(i, 1);
            }
        };
        const ssNow = () => SceneManager._scene && SceneManager._scene._spriteset;
        const counters = () => {
            const c = depthCounts(), ss = ssNow();
            c.projectilesAlive = flights.length;
            c.rmmzAnimationsAlive = ss && ss._animationSprites ? ss._animationSprites.length : 0;
            c.placeholderImpactsAlive = impacts.length;
            c.effectSpritesAlive = c.rmmzAnimationsAlive + c.placeholderImpactsAlive + c.projectilesAlive;
            c.unitsDrawn = c.unitsOnScreenLevel + c.unitsOnLowerPlanes;
            return c;
        };
        benchDriver = () => { const t0 = now(); drive(); add("bench.driver", now() - t0); };
        await t.waitFrames(90); // every unit in combat before the clock starts
        UF.Time.setForTest(12, 0);
        await t.waitFrames(10);
        await recordFor(t, "stress_day_30s", 30000, counters, { hour: 12 });
        const pDay = await profiled(t, "stress_day", () => t.waitFrames(120));
        UF.Time.setForTest(22, 0);
        await t.waitFrames(30);
        await recordFor(t, "stress_night_30s", 30000, counters, { hour: 22 });
        const pNight = await profiled(t, "stress_night", () => t.waitFrames(120));
        benchDriver = null;
        result.profiles = [pDay, pNight].filter(Boolean);
        result.stress.glowLayer = (() => { const ss = ssNow(); const gl = ss && ss._ufGlowLayer; return gl ? { visible: gl.visible, children: gl.children.length } : null; })();
        return result.phases.length >= 2;
    }
})();
`;

//-----------------------------------------------------------------------------
// Snapshot, instrumentation, runs

/** Delete a snapshot folder. Its asset folders are junctions to the real game/ folders: unlink them, never recurse into them. */
function removeSnapshot(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isSymbolicLink() || fs.lstatSync(p).isSymbolicLink()) fs.unlinkSync(p);
        else fs.rmSync(p, { recursive: true, force: true });
    }
    fs.rmdirSync(dir);
}

function makeSnapshot(name) {
    const dir = path.join(os.tmpdir(), "uf_snapshots", name);
    const r = spawnSync(process.execPath, [path.join(__dirname, "test_snapshot.js"), "--name", name, "--plugins", "DEUS_Depth", "--dir", dir, "--no-run"], { encoding: "utf8" });
    if (r.status !== 0) { console.error(r.stdout, r.stderr); throw new Error("snapshot failed"); }
    if (rev) {
        const changed = git("diff", "--name-only", rev, "HEAD", "--", "game/").split(/\r?\n/).filter(Boolean);
        for (const f of changed) {
            const rel = f.replace(/^game\//, "");
            const top = rel.split("/")[0];
            if (!["js", "data"].includes(top)) throw new Error(`--rev: ${f} differs but ${top}/ is a junction to the real folder in a snapshot`);
            const dst = path.join(dir, rel);
            let content = null;
            try { content = execFileSync("git", ["show", `${rev}:${f}`], { cwd: root, maxBuffer: 256 * 1024 * 1024 }); } catch (e) { content = null; }
            if (content === null) { fs.rmSync(dst, { force: true }); console.log(`  --rev: ${rel} absent at ${rev}, removed from the copy`); }
            else { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, content); console.log(`  --rev: ${rel} taken from ${rev}`); }
        }
    }
    // Register the bench plugin before the test harness (plugins.js may have come from --rev: keep UF_Test last).
    fs.writeFileSync(path.join(dir, "js", "plugins", "DEUS_BenchRender.js"), PLUGIN);
    const pluginsFile = path.join(dir, "js", "plugins.js");
    const text = fs.readFileSync(pluginsFile, "utf8").replace(/^﻿/, "");
    const list = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)).filter(p => p.name !== "DEUS_BenchRender");
    const tests = list.filter(p => p.name === "UF_Test" || p.name === "DEUS_Test");
    const rest = list.filter(p => !tests.includes(p));
    if (!tests.some(p => p.name === "UF_Test")) tests.push({ name: "UF_Test", status: true, description: "[UF_Test]", parameters: {} });
    for (const p of tests) p.status = true;
    const out = [...rest, { name: "DEUS_BenchRender", status: true, description: "[bench] generated", parameters: {} }, ...tests];
    fs.writeFileSync(pluginsFile, `// Generated by RPG Maker.\n// Do not edit this file directly.\nvar $plugins =\n[\n${out.map(p => JSON.stringify(p)).join(",\n")}\n];\n`);
    return dir;
}

// One harness run of the suite, as tools/run_tests.js does it (same nw.exe, same flags, the RESULT line decides), plus a
// DevTools port: the suite's BENCH_PROFILE_START/STOP console markers start and stop V8's sampling profiler (500 us).
const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const RUN_TIMEOUT_MS = 300000;
const net = require("net");
const { spawn } = require("child_process");
const sleep = ms => new Promise(res => setTimeout(res, ms));
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });

function aggregateProfile(p, updates, wallMs) {
    const byId = new Map(), parent = new Map(), self = new Map();
    for (const n of p.nodes) { byId.set(n.id, n); for (const c of n.children || []) parent.set(c, n.id); }
    const deltas = p.timeDeltas || [];
    for (let i = 0; i < p.samples.length; i++) {
        const dt = (deltas[i + 1] !== undefined ? deltas[i + 1] : (deltas[i] || 0)) / 1000;
        self.set(p.samples[i], (self.get(p.samples[i]) || 0) + dt);
    }
    const fileOf = n => { const u = n.callFrame.url || ""; return u ? decodeURIComponent(u.split("/").pop()) : n.callFrame.functionName || "(native)"; };
    const keyOf = n => `${n.callFrame.functionName || "(anonymous)"} ${fileOf(n)}:${n.callFrame.lineNumber + 1}`;
    const selfByKey = new Map(), inclByKey = new Map(), selfByFile = new Map(), inclByFile = new Map();
    let total = 0;
    for (const [id, ms] of self) {
        const n = byId.get(id);
        if (!n) continue;
        total += ms;
        const k = keyOf(n), f = fileOf(n);
        selfByKey.set(k, (selfByKey.get(k) || 0) + ms);
        selfByFile.set(f, (selfByFile.get(f) || 0) + ms);
        // inclusive: each distinct function (and script) on the stack gets the sample once
        const seen = new Set(), seenFiles = new Set();
        for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
            const cn = byId.get(cur);
            if (!cn) break;
            const ck = keyOf(cn), cf = fileOf(cn);
            if (!seen.has(ck)) { seen.add(ck); inclByKey.set(ck, (inclByKey.get(ck) || 0) + ms); }
            if (!seenFiles.has(cf)) { seenFiles.add(cf); inclByFile.set(cf, (inclByFile.get(cf) || 0) + ms); }
        }
    }
    const per = updates > 0 ? updates : 1;
    const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ fn: k, ms: +v.toFixed(1), msPerUpdate: +(v / per).toFixed(3) }));
    return { updates, wallMs, sampledMs: +total.toFixed(1), samples: p.samples.length, topSelf: top(selfByKey, 40), topInclusive: top(inclByKey, 60), selfByScript: top(selfByFile, 30), inclusiveByScript: top(inclByFile, 30) };
}

async function runGame(dir, env, label) {
    const resultsFile = path.join(dir, "test_output", "results.txt");
    fs.rmSync(resultsFile, { force: true });
    const port = await freePort();
    const profileName = `uf_test_profile_${process.pid}_${Date.now()}`;
    const profileDir = path.join(os.tmpdir(), profileName);
    const noThrottle = ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion"];
    // Machine load (Fix 1, P3): processes before the game starts, then the CPU every second and the processes every 15 s.
    const own = { profile: profileName, rootPid: null };
    const loadStart = procs(own), cpu = cpuSampler(), during = [];
    const procTimer = setInterval(() => { procsAsync(own).then(p => during.push({ at: p.at, aiWorkers: p.aiWorkers, otherNwExe: p.otherNwExe, otherNw: p.otherNw, error: p.error })); }, 15000);
    const child = spawn(NW, [dir, `--user-data-dir=${profileDir}`, ...noThrottle, "--deus-test=bench_layers", `--remote-debugging-port=${port}`], { env, stdio: ["ignore", "ignore", "ignore"] });
    own.rootPid = child.pid;
    const profiles = {}, notes = [];
    let exited = false, exitCode = null;
    const exitP = new Promise(res => child.on("exit", code => { exited = true; exitCode = code; res(); }));
    const killer = setTimeout(() => { notes.push(`no exit after ${RUN_TIMEOUT_MS / 1000} s: nw.exe killed`); try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" }); } catch (e) { /* gone */ } }, RUN_TIMEOUT_MS);
    const t0 = Date.now();
    // DevTools: find the page, then answer the suite's profile markers.
    let ws = null;
    try {
        let target = null;
        for (let k = 0; k < 120 && !target && !exited; k++) {
            await sleep(500);
            try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = list.find(t => t.type === "page" && /index\.html/.test(t.url)) || null; } catch (e) { /* not up yet */ }
        }
        if (!target) throw new Error("no DevTools page target");
        ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("DevTools socket error")); });
        let nextId = 1;
        const pending = new Map();
        const send = (method, params = {}) => new Promise((res, rej) => {
            if (!ws || ws.readyState !== 1) return rej(new Error("DevTools socket closed"));
            const id = nextId++;
            pending.set(id, m => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
            ws.send(JSON.stringify({ id, method, params }));
        });
        const setFlag = (name, value) => send("Runtime.evaluate", { expression: `window.${name} = ${JSON.stringify(value)}` });
        let chain = Promise.resolve();
        ws.onmessage = ev => {
            const m = JSON.parse(ev.data);
            if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
            if (m.method !== "Runtime.consoleAPICalled") return;
            const text = String(m.params.args[0] && m.params.args[0].value);
            let mm;
            if ((mm = text.match(/^BENCH_PROFILE_START (\S+)/))) {
                const lab = mm[1];
                chain = chain.then(async () => {
                    await send("Profiler.enable");
                    await send("Profiler.setSamplingInterval", { interval: 500 });
                    await send("Profiler.start");
                    await setFlag("__benchProfilerReady", lab);
                }).catch(e => notes.push(`profile ${lab} start: ${e.message}`));
            } else if ((mm = text.match(/^BENCH_PROFILE_STOP (\S+) (\d+) ([\d.]+)/))) {
                const lab = mm[1], updates = Number(mm[2]), wallMs = Number(mm[3]);
                chain = chain.then(async () => {
                    const r = await send("Profiler.stop");
                    profiles[lab] = aggregateProfile(r.profile, updates, wallMs);
                    await setFlag("__benchProfilerDone", lab);
                }).catch(e => notes.push(`profile ${lab} stop: ${e.message}`));
            }
        };
        await send("Runtime.enable");
    } catch (e) {
        notes.push(`DevTools: ${e.message} (the run continues without profiles)`);
    }
    await exitP;
    clearTimeout(killer);
    cpu.stop();
    clearInterval(procTimer);
    const loadEnd = procs(own);
    try { if (ws) ws.close(); } catch (e) { /* closed */ }
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) { /* still locked */ }
    const text = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, "utf8") : "";
    const m = text.match(/^RESULT: (\d+) passed, (\d+) failed \(exit (\d)\)$/m);
    return { status: m ? Number(m[3]) : 2, text, profiles, notes, seconds: +((Date.now() - t0) / 1000).toFixed(1), nwExit: exitCode,
        load: { start: loadStart, end: loadEnd, during, cpuSamples: cpu.samples } };
}

/** The machineLoad block of a run: the CPU per phase (a 1 s sample counts for a phase when its second overlaps the phase) and overall. */
function machineLoad(load, phases, preRun) {
    const byPhase = {};
    for (const p of phases) {
        if (!Number.isFinite(p.wallStart) || !Number.isFinite(p.wallEnd)) continue;
        const c = stats3(load.cpuSamples.filter(s => s.t > p.wallStart && s.t - 1000 < p.wallEnd).map(s => s.cpu));
        byPhase[p.phase] = c;
        p.cpuPercent = c;
    }
    const overall = stats3(load.cpuSamples.map(s => s.cpu));
    const nwCounts = [load.start.otherNwExe, ...load.during.map(d => d.otherNwExe), load.end.otherNwExe].filter(n => Number.isFinite(n));
    const otherNwMax = nwCounts.length ? Math.max(...nwCounts) : null;
    const quiet = overall.median !== null && overall.median <= 25 && otherNwMax === 0;
    return {
        label: quiet ? "quiet" : "loaded",
        labelRule: "quiet: overall median CPU <= 25 % and no other nw.exe at the start, in any 15 s check or at the end; otherwise loaded (WG.00.09b Fix 1 section 3.3)",
        method: "CPU: os.cpus() idle/total time deltas over all logical CPUs, one sample a second from before nw.exe starts to after it exits (the same quantity as \\Processor(_Total)\\% Processor Time); a sample counts for a phase when its second overlaps the phase's wall span. " + LOAD_NOTE,
        startedAt: load.start.at, finishedAt: load.end.at,
        start: { aiWorkers: load.start.aiWorkers, otherNwExe: load.start.otherNwExe, otherNw: load.start.otherNw, error: load.start.error },
        end: { aiWorkers: load.end.aiWorkers, otherNwExe: load.end.otherNwExe, otherNw: load.end.otherNw, error: load.end.error },
        during: load.during, otherNwExeMax: otherNwMax,
        cpu: { intervalMs: 1000, overall, byPhase, samples: load.cpuSamples },
        preRun: preRun || null
    };
}

(async () => {
    console.log(`=== bench_render_layers: scenario ${scenario}, ${runs} run(s), measuring ${sha8}${rev ? ` (--rev ${rev})` : ""}${dirty && !rev ? " with uncommitted changes" : ""} ===`);
    const report = { task: "WG.00.09b", lane: "lane-k", scenario, measuredSha, headSha, dirty: dirty && !rev,
        machine: { host: os.hostname(), cpus: os.cpus().length, cpu: os.cpus()[0] && os.cpus()[0].model, totalMemGb: +(os.totalmem() / 2 ** 30).toFixed(1) },
        method: "nw.exe harness (DEUS_Test, --deus-test=bench_layers, background throttling off, the same flags as tools/run_tests.js) on a snapshot copy of game/. Per engine tick (Graphics._onTick): the frame interval (tick start to tick start), the tick duration (update + render submission), wrapped update and render parts (ms per tick; 'update' can run 0, 1 or 2 times per tick: RMMZ's fixed 60 Hz step), WebGL draw calls. Medians and p95 over the ticks of a phase. CPU profiles: V8 sampling profiler over the DevTools protocol, 500 us interval; ms per update = sampled ms / simulation updates in the profiled window. Machine load: runs[].machineLoad (Fix 1, P3).",
        runs: [] };
    // --append: the runs already in the file stay; the new ones are numbered after them.
    let prior = null;
    if (append && fs.existsSync(outFile)) {
        prior = JSON.parse(fs.readFileSync(outFile, "utf8"));
        if (prior.measuredSha !== measuredSha || prior.scenario !== scenario) { console.error(`HARNESS: --append: ${path.relative(root, outFile)} is for ${prior.scenario} ${prior.measuredSha}`); process.exit(2); }
        report.runs = prior.runs;
    }
    const preRun = preLog && fs.existsSync(preLog) ? fs.readFileSync(preLog, "utf8").split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : null;
    const newRuns = [];
    let failures = 0, harness = 0;
    for (let i = 0; i < runs; i++) {
        const runNo = report.runs.length + 1;
        const name = `lanek_bench_${scenario}_${sha8}_${process.pid}_${Date.now()}`;
        const dir = makeSnapshot(name);
        const json = path.join(dir, "test_output", "bench.json");
        fs.rmSync(json, { force: true });
        const env = Object.assign({}, process.env, { BENCH_OUT: json, BENCH_SCENARIO: scenario });
        delete env.UF_TEST_PROVOKE;
        console.log(`  run ${runNo}: snapshot ${dir}`);
        const r = await runGame(dir, env, name);
        for (const line of r.text.split(/\r?\n/)) if (/^(BENCH|PASS|FAIL|ERROR|HARNESS|RESULT)/.test(line)) console.log(`  run ${runNo}: ${line}`);
        for (const n of r.notes) console.log(`  run ${runNo}: note: ${n}`);
        const data = fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, "utf8")) : null;
        if (!keepSnapshot) { try { removeSnapshot(dir); } catch (e) { console.log(`  run ${runNo}: could not remove ${dir}: ${e.message}`); } }
        if (!data) { console.error(`  run ${runNo}: no numbers written (exit ${r.status}, ${r.seconds} s)`); if (r.status === 2) harness++; else failures++; continue; }
        data.run = runNo;
        data.wallSeconds = r.seconds;
        data.exit = r.status;
        data.machineLoad = machineLoad(r.load, data.phases || [], i === 0 ? preRun : null);
        data.profiles = r.profiles;
        data.toolNotes = r.notes;
        report.runs.push(data);
        newRuns.push(data);
        const ml = data.machineLoad;
        console.log(`  run ${runNo}: machine load ${ml.label}: CPU overall median ${ml.cpu.overall.median} % (min ${ml.cpu.overall.min}, max ${ml.cpu.overall.max}, ${ml.cpu.overall.samples} samples); AI workers ${ml.start.aiWorkers} at start, ${ml.end.aiWorkers} at the end; other nw.exe ${ml.start.otherNwExe} / max ${ml.otherNwExeMax} / ${ml.end.otherNwExe}`);
        if (r.status !== 0) failures++;
    }
    report.writtenAt = new Date().toISOString();
    if (prior) report.firstWrittenAt = prior.firstWrittenAt || prior.writtenAt;
    if (newRuns.length) {
        fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
        console.log(`wrote ${path.relative(root, outFile)} (${report.runs.length} run(s), ${newRuns.length} new)`);
    } else console.log("no run produced numbers: nothing written");
    for (const run of newRuns) {
        for (const p of run.phases) console.log(`  run ${run.run} ${p.phase.padEnd(26)} frame median ${String(p.frameMs.median).padStart(7)} p95 ${String(p.frameMs.p95).padStart(7)} worst ${String(p.frameMs.worst).padStart(8)} ms (${p.fps.atMedian} fps at the median)  tick ${p.tickMs.median} ms  draws ${p.drawCalls.median}  CPU ${p.cpuPercent ? `${p.cpuPercent.min}/${p.cpuPercent.median}/${p.cpuPercent.max} %` : "-"}${p.peak ? `  peak ${JSON.stringify(p.peak)}` : ""}`);
        for (const [lab, pr] of Object.entries(run.profiles || {})) console.log(`  run ${run.run} profile ${lab}: ${pr.samples} samples, ${pr.sampledMs} ms over ${pr.updates} updates; top scripts (self) ${pr.selfByScript.slice(0, 5).map(e => `${e.fn} ${e.msPerUpdate}`).join(", ")} ms/update`);
    }
    const code = newRuns.length === runs && failures === 0 ? 0 : (harness ? 2 : 1);
    console.log(`exit ${code}`);
    process.exit(code);
})();
