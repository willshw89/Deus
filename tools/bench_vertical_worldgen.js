#!/usr/bin/env node
"use strict";

// DEUS-TSK-ASTRA-03. Production sources/data are read once and never written.
// Timers and observation hooks are injected at checked anchors in memory only.
// Fresh realms include the populated-world initialization listeners. Disposing
// the realm releases intentional world caches before the weak retention check.
// This is headless generation, not editor startup, rendering, or game FPS.
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm");
const crypto = require("crypto");
const { performance } = require("perf_hooks");
const { setImmediate } = require("timers");
const { spawn, spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "game/test_output/bench_vertical_worldgen.json");
const SIZE = 256, ZS = [-2, -1, 0, 1, 2];
const DEFAULT_NW = "C:/Program Files (x86)/Steam/steamapps/common/RPG Maker MZ/nwjs-win/nw.exe";
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const sha = data => crypto.createHash("sha256").update(data).digest("hex");
const clone = data => JSON.parse(JSON.stringify(data));
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

function parseArgs(args) {
    const out = { seeds: [0, 424242, 20260919], runs: 2, runtime: "node", nw: DEFAULT_NW, profile: false, json: false };
    for (let i = 0; i < args.length; i++) {
        const key = args[i];
        if (["--profile", "--json", "--selftest", "--help"].includes(key)) { out[key.slice(2)] = true; continue; }
        assert(["--seed", "--runs", "--runtime", "--nw"].includes(key), `Unknown argument ${key}`);
        const value = args[++i];
        assert(value !== undefined && !value.startsWith("--"), `Missing value for ${key}`);
        if (key === "--seed" || key === "--runs") {
            const n = Number(value), seed = key === "--seed";
            assert(/^\d+$/.test(value) && Number.isSafeInteger(n) && n >= (seed ? 0 : 1) && n <= (seed ? 2147483647 : 1000), `Invalid ${key}: ${value}`);
            if (seed) out.seeds = [n]; else out.runs = n;
        } else if (key === "--runtime") {
            assert(["node", "nw", "both"].includes(value), "--runtime must be node, nw, or both"); out.runtime = value;
        } else out.nw = path.resolve(value);
    }
    return out;
}

function once(source, anchor, replacement) {
    assert(source.split(anchor).length === 2, `Source anchor drift/ambiguity: ${anchor.slice(0, 100)}`);
    return source.replace(anchor, replacement);
}
function bridge(source, code) {
    const i = source.lastIndexOf("})();");
    assert(i > 0 && !source.slice(i + 5).trim(), "Plugin IIFE anchor drift");
    return source.slice(0, i) + "\n" + code + "\n" + source.slice(i);
}
function section(source, begin, end) {
    assert(source.split(begin).length === 2 && source.split(end).length === 2, `Section anchor drift: ${begin}`);
    const a = source.indexOf(begin), b = source.indexOf(end, a);
    assert(b > a, `Section end missing: ${end}`);
    return source.slice(a, b);
}

// Keep source order from plugins.js, including population, founding and ecology.
// Presentation-only plugins are not needed to execute the newWorld call.
const MODULES = ["Core", "Movement8D", "World", "WorldGen", "Tiles", "Factions", "History", "Objects",
    "Walls", "Doors", "Items", "Jobs", "Floors", "Generator", "Colonists", "Wildlife", "Ecology",
    "Stance", "Combat", "TimeSpeed", "Fire", "Levels", "Ownership", "Environment", "NaturalConnections"];
function sourceBundle() {
    const files = {};
    const read = name => (files[name] = fs.readFileSync(path.join(ROOT, name), "utf8"));
    const listEnv = {};
    vm.runInNewContext(read("game/js/plugins.js"), listEnv);
    const selected = new Set(MODULES.concat(["Containers", "Dnd5e"]).map(n => "DEUS_" + n));
    const plugins = listEnv.$plugins.filter(p => p.status && selected.has(p.name));
    assert(MODULES.every(n => plugins.some(p => p.name === "DEUS_" + n)), "Enabled generation plugin set changed; review bootstrap");
    plugins.push(...["Containers", "Dnd5e"].filter(n => !plugins.some(p => p.name === "DEUS_" + n))
        .map(name => ({ name: "DEUS_" + name, parameters: {} })));
    const excluded = listEnv.$plugins.filter(p => p.status && !selected.has(p.name)).map(p => p.name);
    for (const name of excluded) {
        const source = read(`game/js/plugins/${name}.js`);
        assert(!/\.on\s*\(\s*["']world:(created|initializing)["']|\.newWorld\s*=/.test(source),
            `Excluded plugin ${name} has initialization callbacks; review bootstrap`);
    }
    for (const p of plugins) read(`game/js/plugins/${p.name}.js`);
    const catalog = JSON.parse(read("game/data/UF_WorldCatalog.json"));
    const tilesets = JSON.parse(read("game/data/Tilesets.json"));
    const system = JSON.parse(read("game/data/System.json"));
    const generatorPool = JSON.parse(read("game/data/UF_GeneratorPool.json"));
    const core = read("game/js/rmmz_core.js");
    const harnessSource = read("tools/bench_vertical_worldgen.js");
    const tileSource = section(core, "Tilemap.TILE_ID_B = 0;", "Tilemap.Layer = function()");
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
    return { files, plugins, excluded, catalog, tilesets, system, generatorPool, tileSource, harnessSource,
        provenance: { gitHead: head.status === 0 ? head.stdout.trim() : null,
            sources: Object.keys(files).map(file => ({ path: file, sha256: sha(files[file]) })) } };
}

function prepareSource(name, source, detailed) {
    let code = "";
    if (name === "DEUS_Levels") {
        assert(/const GEN = 3;/.test(source), "Generator version changed; review vertical profiler phase boundaries");
        code = `window.__levelsBench = {gen: GEN, boot() {registerTileset(); hookWorld();}};
const originalBaseline = generateBaseline;
generateBaseline = function(seed, gen, z, ax, ay, size) {
 const before = __probe.memory(), t = performance.now();
 const result = originalBaseline.apply(this, arguments);
 __probe.layer(z, result, performance.now()-t, before, __probe.memory()); return result;
};`;
        if (detailed) {
            const anchor = "        // GEN >= 3: Continuous rolling cavern network with interconnected halls, corridors, and natural pillars";
            source = once(source, anchor, "        const __ug = __probe.start();\n" + anchor);
            const noise = "        for (let y = BORDER; y < size - BORDER; y++) {";
            // Only GEN3's body has this exact loop header.
            source = once(source, noise, "        __probe.objects(provinces, 'provinces'); __probe.mark(__ug, 'underground.biomes.'+z);\n" + noise);
            const cut = source.indexOf(anchor);
            let tail = source.slice(cut);
            const pockets = "        const divisions = z === -1 ? 6 : 4, span = size / divisions;";
            tail = once(tail, pockets, "        __probe.mark(__ug, 'underground.noise.'+z);\n" + pockets);
            const end = '        if (provoked("underground_biomes"))';
            tail = once(tail, end, "        __probe.mark(__ug, 'underground.pockets_and_sources.'+z);\n" + end);
            source = source.slice(0, cut) + tail;
        }
    } else if (name === "DEUS_WorldGen") {
        code = `window.__worldGenBench = {compiled};`;
        const anchor = "        // Neighbors outside this area come from the same pure function, wrapping around the toroidal world.";
        source = once(source, anchor, "        __probe.surface({biome,ground,water,flags,align}, m);\n" + anchor);
        if (detailed) {
            const begin = "        // 1. Classify every cell once.";
            source = once(source, begin, "        const __surface = __probe.start();\n" + begin);
            source = once(source, anchor, "        __probe.mark(__surface, 'surface.climate_biomes_rivers');\n" + anchor);
            const distance = "        // Distance to water (0 = water, up to WATER_DIST_MAX), one dilation, for keeping objects off the banks.";
            source = once(source, distance, "        __probe.mark(__surface, 'surface.autotiles');\n" + distance);
            const start = "        // 3. The start (section 3.8): clearing, note, and the pair as events 1 and 2 until UF_Colonists exists.";
            source = once(source, start, "        __probe.mark(__surface, 'surface.water_distance');\n" + start);
            const finish = "        WorldGen.kitLog[`${ctx.areaX},${ctx.areaY}`] = kitLog;";
            source = once(source, finish, "        __probe.mark(__surface, 'surface.objects_sites_kits');\n" + finish);
        }
        // Registering the original callback occurs before a tail bridge, so wrap
        // its registration rather than replacing only the exported function.
        const reg = 'UF.World.registerGenerator("uf_worldgen", generate, 10);';
        source = once(source, reg, 'UF.World.registerGenerator("uf_worldgen", __probe.wrap("surface.total", generate), 10);');
    } else if (name === "DEUS_NaturalConnections") {
        code = `window.__connectionsBench = {boot: hook};
generate = __probe.wrap('connectivity.total', generate);`;
        if (detailed) {
            const begin = "        const candidates = [];";
            source = once(source, begin, "        const __conn = __probe.start();\n" + begin);
            const test = "        const candidatePool = candidates.slice(0, 30);";
            source = once(source, test, "        __probe.objects(candidates, 'connection_candidates'); __probe.objects(reservations, 'connection_reservations');\n        __probe.mark(__conn, 'connectivity.candidate_survey');\n" + test);
            const cliffs = "        const cliffMouths = levels.cliffCaveMouths ? levels.cliffCaveMouths(area) : [];";
            source = once(source, cliffs, "        __probe.mark(__conn, 'connectivity.shaft_tests_and_chains');\n" + cliffs);
            const end = '        saved.status = (saved.chains.length || saved.links.length) ? "ready" : "blocked";';
            source = once(source, end, "        __probe.mark(__conn, 'connectivity.cliff_caves');\n" + end);
        }
    } else if (name === "DEUS_Tiles") {
        // Preserve shade key allocation and layer-1 IDs; canvas uploads are inert.
        code = "window.__tilesBench = {boot() {registerTileset(); ensureBuildHook();}};";
    } else if (name === "DEUS_Environment") {
        code = "window.__environmentBench = {boot: hookEvents};";
    } else if (name === "DEUS_World") {
        code = "window.__worldBench = {boot: wrapRegrowth};";
    } else if (name === "DEUS_Colonists") {
        code = "window.__colonistsBench = {boot: guardMateHandler};";
    }
    return code ? bridge(source, code) : source;
}

function memory() {
    const m = process.memoryUsage();
    return { heapUsed: m.heapUsed, external: m.external, arrayBuffers: m.arrayBuffers === undefined ? null : m.arrayBuffers, rss: m.rss };
}
function delta(a, b) {
    return Object.fromEntries(Object.keys(a).map(k => [k, a[k] === null || b[k] === null ? null : b[k] - a[k]]));
}
function tracker() {
    assert(typeof WeakRef === "function", "WeakRef required for release verification");
    const refs = [], seen = new WeakSet(), totals = {}, phases = {};
    const output = { layers: {}, surface: null };
    let stage = "bootstrap";
    const track = (value, kind, bytes = 0) => {
        if (!value || typeof value !== "object" || seen.has(value)) return;
        seen.add(value); refs.push({ ref: new WeakRef(value), kind, bytes, stage });
        const t = totals[`${stage}.${kind}`] || (totals[`${stage}.${kind}`] = { count: 0, bytes: 0 });
        t.count++; t.bytes += bytes;
    };
    const api = {
        output, phases, memory, stage(value) { stage = value; },
        types: {}, start: () => ({ time: performance.now() }),
        mark(token, name) { const n = performance.now(); phases[name] = (phases[name] || 0) + n - token.time; token.time = n; },
        objects(value, kind) { track(value, kind); },
        wrap(name, fn) { return function() { const t = performance.now(); try { return fn.apply(this, arguments); }
            finally { phases[name] = (phases[name] || 0) + performance.now() - t; } }; },
        layer(z, result, ms, before, after) {
            assert(!output.layers[z], `Layer ${z} unexpectedly regenerated`);
            output.layers[z] = { result, ms, memory: { before, after, delta: delta(before, after) } };
            track(result, `layer_${z}`); if (result.pockets) track(result.pockets, "pockets");
        },
        surface(arrays, compiled) {
            track(compiled, "biome_compilation"); track(arrays, "surface_categories");
            output.surface = { arrays, biomeIds: compiled.biomeIds.slice(), groundIds: compiled.groundIds.slice(), waterKeys: compiled.waterKeys.slice() };
        },
        release() { output.layers = {}; output.surface = null; },
        allocationSummary() { return clone(totals); },
        retention() {
            const live = refs.filter(r => r.ref.deref() !== undefined);
            return { tracked: refs.length, survivingBuffers: live.filter(r => r.kind === "buffer").length,
                survivingBufferBytes: live.filter(r => r.kind === "buffer").reduce((n, r) => n + r.bytes, 0),
                survivingObjects: live.filter(r => r.kind !== "buffer" && r.kind !== "view").length,
                survivingViews: live.filter(r => r.kind === "view").length,
                kinds: [...new Set(live.map(r => `${r.stage}.${r.kind}`))] };
        }
    };
    for (const Type of [Uint8Array, Uint8ClampedArray, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array]) {
        api.types[Type.name] = new Proxy(Type, { construct(target, args) {
            const value = Reflect.construct(target, args); track(value, "view"); track(value.buffer, "buffer", value.buffer.byteLength); return value;
        } });
    }
    return api;
}

function environment(bundle, probe) {
    const errors = [], namespace = {};
    const env = { performance, Math, ...probe.types, __probe: probe, UF: namespace, DEUS: namespace,
        $ufWorldCatalog: clone(bundle.catalog), $dataTilesets: clone(bundle.tilesets),
        console: { log() {}, warn() {}, error(...args) { errors.push(args.map(a => String(a && a.stack || a)).join(" ")); } },
        PluginManager: { parameters(name) { return (bundle.plugins.find(p => p.name === name) || {}).parameters || {}; }, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, extractMetadata(o) { o.meta = {}; }, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        ImageManager: {},
        Graphics: { frameCount: 0, width: 816, height: 624, boxWidth: 816, boxHeight: 624 },
        Tilemap: {}, $gameMap: { mapId: () => 0 }, $gamePlayer: { reserveTransfer() {} },
        $gameSystem: {}, $gameTemp: {}, $gameSwitches: { value: () => false }, $gameVariables: { value: () => 0 },
        $dataSystem: clone(bundle.system), $dataGeneratorPool: clone(bundle.generatorPool), $dataMap: null, $gameParty: { members: () => [] },
        Utils: { isOptionValid: () => false, isNwjs: () => false }, require: undefined, process: undefined, nw: undefined,
        document: { title: "", addEventListener() {}, removeEventListener() {} }
    };
    function canvas() {
        const context = { createImageData(w, h) { return { width: w, height: h, data: new probe.types.Uint8ClampedArray(w * h * 4) }; },
            putImageData() {}, drawImage() {}, clearRect() {}, fillRect() {}, save() {}, restore() {}, scale() {},
            getImageData(x, y, w, h) { return this.createImageData(w, h); } };
        return { width: 0, height: 0, getContext: () => context };
    }
    env.document.createElement = tag => { assert(tag === "canvas", `Unexpected DOM work: ${tag}`); return canvas(); };
    env.Bitmap = function(w, h) { this.width = w; this.height = h; this.canvas = canvas(); this.context = this.canvas.getContext(); this._baseTexture = { update() {} }; };
    env.$deusWorldCatalog = env.$ufWorldCatalog; env.window = env;
    // Definition-only engine classes. No scene, sprite, clock or AI tick runs.
    const names = new Set(["Sprite", "Window_Base", "Rectangle", "Scene_Boot", "Scene_Map", "Scene_Title", "Spriteset_Map", "Game_CharacterBase", "Game_Character", "Game_Event", "Game_Player", "Game_Map", "Game_System"]);
    for (const plugin of bundle.plugins) {
        const source = bundle.files[`game/js/plugins/${plugin.name}.js`];
        for (const match of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) names.add(match[1]);
    }
    for (const name of names) env[name] = function() {};
    for (const plugin of bundle.plugins) for (const match of bundle.files[`game/js/plugins/${plugin.name}.js`].matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g)) {
        env[match[1]].prototype[match[2]] = function() {};
    }
    return { env, errors };
}

function loadWorld(bundle, mode, probe, detailed = true) {
    const loaded = environment(bundle, probe), env = loaded.env;
    const sources = [bundle.tileSource, ...bundle.plugins.map(p => {
        const source = prepareSource(p.name, bundle.files[`game/js/plugins/${p.name}.js`], detailed);
        return p.name === "DEUS_Generator" ? source : "{ const UF = window.UF;\n" + source + "\n}";
    })];
    const bindings = ["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "performance", "window", "Tilemap", "$ufWorldCatalog", "$deusWorldCatalog", "$dataTilesets", "__probe", ...Object.keys(probe.types)];
    if (mode === "node-vm") {
        const context = vm.createContext(env);
        // Contextified Math lookups distort CPU measurements. Bind the same
        // native objects lexically, as in bench_underground_gen.js.
        vm.runInContext(bindings.map(k => `const ${k} = globalThis.${k};`).join(" "), context);
        sources.forEach((source, i) => vm.runInContext(source, context, { filename: i ? bundle.plugins[i - 1].name : "Tilemap statics", timeout: 10000 }));
    } else {
        // Native Function bindings, without a `with` lookup on every operation.
        // Globals assigned during plugin loading use live local slots on the
        // isolated window. No property is installed on NW's real global object.
        const dynamic = ["$deusTime", "$ufTime", "Game_DEUSTime", "UF_Dir8", "$factionManager", "$dataMap", "$ufWorldCatalog", "$deusWorldCatalog"];
        const keys = Object.keys(env).filter(k => !dynamic.includes(k));
        const slots = dynamic.map(k => `let ${k} = window.${k}; Object.defineProperty(window, '${k}', {configurable:true, get:()=>${k}, set:v=>{${k}=v;}});`).join("\n");
        Function(...keys, slots + "\n" + sources.join("\n"))(...keys.map(k => env[k]));
    }
    env.__environmentBench.boot(); env.__connectionsBench.boot(); env.__levelsBench.boot();
    env.__colonistsBench.boot(); env.__tilesBench.boot(); env.__worldBench.boot();
    assert(env.UF.World && env.UF.Levels && env.UF.NaturalConnections, "Production generation bootstrap incomplete");
    return loaded;
}

function bytesSignature(bytes) {
    let h = 2166136261;
    for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i], 16777619) >>> 0;
    return { bytes: bytes.length, fnv1a: h.toString(16).padStart(8, "0"), sha256: sha(bytes) };
}
function arraySignature(array, encoding = "u8") {
    if (!array) return null;
    const width = encoding === "f64le" ? 8 : encoding === "u32le" ? 4 : 1;
    const buffer = Buffer.allocUnsafe(array.length * width);
    for (let i = 0; i < array.length; i++) {
        if (width === 8) { assert(Number.isFinite(array[i]), "Invalid elevation value"); buffer.writeDoubleLE(array[i], i * width); }
        else if (width === 4) buffer.writeUInt32LE(array[i] >>> 0, i * width);
        else buffer[i] = array[i];
    }
    return Object.assign({ encoding, cells: array.length }, bytesSignature(buffer));
}
function metadataSignature(value) { return bytesSignature(Buffer.from(JSON.stringify(value), "utf8")); }
function verifySignature(expected, actual, context) {
    assert(JSON.stringify(expected) === JSON.stringify(actual), `Checksum/metadata divergence: ${context || "world"}`);
}
function verifyRetention(retention) {
    assert(retention.survivingBuffers === 0 && retention.survivingViews === 0 && retention.survivingObjects === 0,
        `Post-release retention: ${JSON.stringify(retention)}`);
}
function lastResortGC(gc) {
    // The Node concurrent optimizer can retain disposed VM contexts. V8's
    // last-resort collector releases that work before checking reachability.
    // This runs after generation; optimization stays enabled while measuring.
    // Bundled NW 0.48 uses its ordinary collector, without newer V8 options.
    if (process.versions.nw) gc();
    else gc({ type: "major", execution: "sync", flavor: "last-resort" });
}
async function collect(gc, lastResort = false) {
    await nextTurn();
    if (lastResort) lastResortGC(gc); else if (typeof gc === "function") gc();
    await nextTurn();
    if (lastResort) lastResortGC(gc); else if (typeof gc === "function") gc();
}

// This synchronous frame owns every strong production reference. It must return
// only detached JSON/scalars before its caller crosses the GC boundary.
function measureWorld(bundle, opts, mode, probe, seed, detailed) {
    const bootstrapStart = performance.now(), loaded = loadWorld(bundle, mode, probe, detailed);
    const env = loaded.env, W = env.UF.World, L = env.UF.Levels;
    const bootstrapMs = performance.now() - bootstrapStart;
    probe.stage("initialization");
    const before = memory(), start = performance.now();
    W.newWorld(seed, SIZE);
    const initializationMs = performance.now() - start, after = memory();
    assert(W.state.seed === seed && W.state.size === SIZE, "Production seed/size changed");
    assert(loaded.errors.length === 0, `Initialization logged errors: ${loaded.errors.join("\n")}`);
    assert(W.state.naturalConnections, "NaturalConnections initializer did not execute");
    // Founding normally builds Ground. Explicitly measure deferred surface work
    // if a future production initializer leaves it lazy; never add it to newWorld.
    const surfaceWasBuiltDuringInitialization = !!probe.output.surface;
    const initializationPhases = clone(probe.phases);
    const deferredStart = performance.now();
    const surfaceMap = W.cachedBuild(0, 0, 0) || W.peekArea(0, 0, 0);
    const deferredSurfaceMs = performance.now() - deferredStart;
    assert(probe.output.surface, "Actual surface generator was not reached");
    const phases = clone(probe.phases), layers = [], checksums = {};
    probe.stage("diagnostic");
    const diagnosticStart = performance.now();
    // Climate fields are ephemeral in resolve(). Re-query the original public
    // field API outside all generation timers. Preserve all Float64 bits.
    const climate = Object.fromEntries(["e", "r", "t", "d", "v", "sav", "al", "sal"].map(k => [k, new probe.types.Float64Array(SIZE * SIZE)]));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const fields = env.UF.WorldGen.fields(x, y), i = y * SIZE + x;
        for (const key of Object.keys(climate)) climate[key][i] = fields[key];
    }
    const climateChecksums = Object.fromEntries(Object.entries(climate).map(([key, a]) => [key, arraySignature(a, "f64le")]));
    for (const z of ZS) {
        const measured = probe.output.layers[z];
        assert(measured && measured.result.shape.length === SIZE * SIZE, `Missing layer ${z}`);
        const b = measured.result, arrays = { shape: arraySignature(b.shape), material: arraySignature(b.material),
            water: arraySignature(b.water), biome: arraySignature(b.biome), elevation: null };
        const metadata = { z, gen: W.state.levels[z].gen, size: SIZE, area: { x: 0, y: 0 },
            pockets: b.pockets || null, biomeIds: null, groundIds: null, waterKeys: null };
        if (z === 0) {
            const surface = probe.output.surface;
            for (const [key, value] of Object.entries(surface.arrays)) arrays[key] = arraySignature(value);
            arrays.elevation = climateChecksums.e;
            arrays.tiles = arraySignature(surfaceMap.data, "u32le");
            arrays.objects = arraySignature(surfaceMap.ufObjects, "u32le");
            metadata.biomeIds = surface.biomeIds; metadata.groundIds = surface.groundIds; metadata.waterKeys = surface.waterKeys;
        }
        let solid = 0, floor = 0, open = 0, sourceFluid = 0;
        for (let i = 0; i < b.shape.length; i++) { solid += b.shape[i] === L.SHAPES.solid; floor += b.shape[i] === L.SHAPES.floor;
            open += b.shape[i] === L.SHAPES.open; sourceFluid += !!(b.water && b.water[i]); }
        checksums[z] = { arrays, metadata: metadataSignature(metadata) };
        layers.push({ z, generationMs: measured.ms + (z === 0 ? phases["surface.total"] || 0 : 0),
            baselineMs: measured.ms, surfaceGenerationMs: z === 0 ? phases["surface.total"] : null,
            status: z > 0 ? "open_air_baseline; hills_and_plateaus_absent" : z === 0 ? "surface_generated" : "caverns_and_source_patches",
            elevationStatus: z === 0 ? "diagnostic_resample_of_production_climate" : "not_present",
            biomeStatus: arrays.biome ? "present" : "not_present", checksums: checksums[z], memory: measured.memory,
            topology: { solidCells: solid, floorCells: floor, openCells: open, sourceFluidCells: sourceFluid } });
    }
    const connection = clone(W.state.naturalConnections);
    probe.objects(W.state.naturalConnections, "connections");
    probe.objects(W.state.naturalConnections.links, "connection_links");
    probe.objects(W.state.naturalConnections.chains, "connection_chains");
    const signature = { layers: checksums, climate: climateChecksums, connections: metadataSignature(connection) };
    const result = { seed, initializationMs, bootstrapMs, diagnosticMs: performance.now() - diagnosticStart,
        layers, phases, connections: { generationMs: phases["connectivity.total"], record: connection,
            repair: { status: "not_present", ms: null }, upperLayerConnections: { status: "not_present", ms: null } },
        surfaceWasBuiltDuringInitialization, initializationPhases, deferredSurfaceMs, signature,
        population: { units: W.units().length, factions: W.state.factions.list.length, sites: W.state.history.sites.length },
        memory: { before, afterInitialization: after, delta: delta(before, after), allocations: probe.allocationSummary() } };
    assert(loaded.errors.length === 0, `Generation logged errors: ${loaded.errors.join("\n")}`);
    probe.release();
    return clone(result);
}

async function benchmarkRuntime(bundle, opts, mode, gc = global.gc) {
    assert(typeof gc === "function", "GC must be exposed for strict retention checks");
    const start = performance.now(), rows = [];
    for (const seed of opts.seeds) {
        const runs = [];
        let expected;
        for (let run = 1; run <= opts.runs; run++) {
            await collect(gc);
            const probe = tracker();
            const sample = measureWorld(bundle, opts, mode, probe, seed, true);
            await collect(gc, true);
            // Collect after the async helper has returned as well: suspended
            // collector frames can temporarily retain a disposed VM context.
            lastResortGC(gc);
            sample.memory.afterRelease = memory(); sample.memory.retention = probe.retention();
            verifyRetention(sample.memory.retention);
            if (run === 1) expected = sample.signature;
            verifySignature(expected, sample.signature, `seed ${seed} run ${run}`); sample.run = run; runs.push(sample);
        }
        rows.push({ seed, deterministic: opts.runs > 1 ? true : null, signature: expected, runs,
            averageInitializationMs: runs.reduce((n, r) => n + r.initializationMs, 0) / runs.length });
    }
    return { runtime: mode, versions: Object.assign({}, process.versions), elapsedMs: performance.now() - start,
        collection: mode === "node-vm" ? "Synchronous major last-resort GC after release and event-loop boundaries; outside generation timers" : "Ordinary exposed GC after release and event-loop boundaries; outside generation timers", rows };
}

async function runNW(bundle, opts) {
    assert(fs.existsSync(opts.nw), `NW.js executable not found: ${opts.nw}`);
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "deus_vertical_bench_"));
    const resultPath = path.join(temporary, "result.json"), inputPath = path.join(temporary, "input.json");
    fs.writeFileSync(inputPath, JSON.stringify({ bundle, opts }));
    fs.writeFileSync(path.join(temporary, "package.json"), JSON.stringify({ name: "deus-vertical-benchmark", main: "index.html",
        window: { show: false }, "chromium-args": "--js-flags=--expose-gc" }));
    const toolPath = path.join(temporary, "bench_tool.cjs");
    fs.writeFileSync(toolPath, bundle.harnessSource);
    // Direct CommonJS evaluation avoids NW14's external-module realpath failure
    // on restricted Windows ancestor directories. All tool imports are builtins.
    fs.writeFileSync(path.join(temporary, "driver.js"), `const fs=require('fs');let finished=false;
function finish(value){if(finished)return;finished=true;fs.writeFileSync(${JSON.stringify(resultPath)},JSON.stringify(value));nw.App.quit();}
function fail(error){finish({ok:false,error:String(error&&error.stack||error)});}
window.addEventListener('error',e=>fail(e.error||e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));
try {
const input=JSON.parse(fs.readFileSync(${JSON.stringify(inputPath)},'utf8'));
const source=fs.readFileSync(${JSON.stringify(toolPath)},'utf8').replace(/^#![^\\n]*\\n/,'');
const mod={exports:{}};
Function('require','module','exports','__filename','__dirname',source)(require,mod,mod.exports,${JSON.stringify(__filename)},${JSON.stringify(__dirname)});
mod.exports.benchmarkRuntime(input.bundle,input.opts,'nw-native',global.gc||window.gc).then(result=>finish({ok:true,result})).catch(fail);
}catch(error){fail(error);}`);
    fs.writeFileSync(path.join(temporary, "index.html"), '<!doctype html><meta charset="utf-8"><script src="driver.js"></script>');
    const start = performance.now();
    await new Promise((resolve, reject) => {
        const child = spawn(opts.nw, [temporary, `--user-data-dir=${path.join(temporary, "profile")}`, "--js-flags=--expose-gc",
            "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
            { cwd: temporary, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        child.stderr.on("data", data => { stderr = (stderr + data.toString()).slice(-8000); });
        const timeout = setTimeout(() => {
            if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
            else child.kill();
            child.stderr.destroy(); child.unref();
            reject(new Error(`NW timed out; stopped only this launch's process tree. Diagnostics: ${temporary}`));
        }, Math.max(60000, opts.runs * opts.seeds.length * 15000));
        child.on("error", error => { clearTimeout(timeout); reject(error); });
        child.on("exit", (code, signal) => {
            clearTimeout(timeout); fs.writeFileSync(path.join(temporary, "stderr.txt"), stderr);
            if (code !== 0 || signal || !fs.existsSync(resultPath)) reject(new Error(`NW exit ${code}/${signal}, diagnostics: ${temporary}`));
            else resolve();
        });
    });
    const payload = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    assert(payload.ok, `NW benchmark failed: ${payload.error}; diagnostics: ${temporary}`);
    payload.result.launchAndRuntimeMs = performance.now() - start;
    payload.result.diagnosticDirectory = temporary;
    return payload.result;
}

function table(headers, rows) {
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
    const line = "+-" + widths.map(w => "-".repeat(w)).join("-+-") + "-+";
    const row = r => "| " + r.map((v, i) => String(v).padEnd(widths[i])).join(" | ") + " |";
    return [line, row(headers), line, ...rows.map(row), line].join("\n");
}
function summary(report) {
    const rows = [];
    for (const runtime of report.runtimes) for (const row of runtime.rows) {
        const average = fn => (row.runs.reduce((n, r) => n + fn(r), 0) / row.runs.length).toFixed(2);
        rows.push([runtime.runtime, row.seed, ...ZS.map(z => average(r => r.layers.find(l => l.z === z).generationMs)),
            average(r => r.connections.generationMs), average(r => r.initializationMs), row.deterministic === null ? "1 run" : row.deterministic ? "PASS" : "FAIL",
            row.runs.reduce((n, r) => n + r.memory.retention.survivingBuffers, 0)]);
    }
    return table(["Runtime", "Seed", "Z-2 ms", "Z-1 ms", "Z0 ms", "Z+1 ms", "Z+2 ms", "Links ms", "newWorld ms", "Repeat", "Live buffers"], rows);
}

async function selftest(bundle) {
    const checks = [];
    const check = (name, pass) => checks.push({ name, pass: !!pass });
    const rejects = fn => { try { fn(); return false; } catch (_) { return true; } };
    for (const args of [["--seed", "-1"], ["--seed", "2147483648"], ["--seed", "1.2"], ["--seed"],
        ["--runs", "0"], ["--runs", "x"], ["--runs", "1001"], ["--runtime", "invalid"], ["--unknown"]]) {
        check(`reject_${args.join('_')}`, rejects(() => parseArgs(args)));
    }
    check("seed_zero_valid", parseArgs(["--seed", "0"]).seeds[0] === 0);
    for (const name of ["Levels", "WorldGen", "NaturalConnections"]) {
        const source = bundle.files[`game/js/plugins/DEUS_${name}.js`];
        const anchor = name === "Levels" ? "const GEN = 3;" : name === "WorldGen" ? "// 1. Classify every cell once." : "const candidatePool = candidates.slice(0, 30);";
        check(`anchor_drift_${name}`, rejects(() => prepareSource(`DEUS_${name}`, source.replace(anchor, "// TEST_ANCHOR_DRIFT"), true)));
    }
    const bytes = new Uint8Array([1, 2, 3]), expected = arraySignature(bytes); bytes[1] ^= 1;
    check("terrain_byte_mutation", rejects(() => verifySignature(expected, arraySignature(bytes))));
    check("layer_metadata_divergence", rejects(() => verifySignature({ z: 0, gen: 3 }, { z: 1, gen: 3 })));
    check("checksum_divergence", rejects(() => verifySignature(expected, Object.assign({}, expected, { fnv1a: "00000000" }))));
    const a = new Float64Array([1]), b = new Float64Array([1 + Number.EPSILON]);
    check("float64_bit_divergence", rejects(() => verifySignature(arraySignature(a, "f64le"), arraySignature(b, "f64le"))));
    const probe = tracker();
    let held = new probe.types.Uint8Array(1024);
    let object = { name: "TEST_CONNECTION" }; probe.objects(object, "connection");
    await collect(global.gc, true);
    lastResortGC(global.gc);
    const retained = probe.retention();
    check("retained_buffer_fails", retained.survivingBuffers === 1 && retained.survivingBufferBytes === 1024 && rejects(() => verifyRetention(retained)));
    check("retained_object_detected", retained.survivingObjects === 1);
    held.fill(1); held = null; object.name = "TEST_RELEASE"; object = null;
    await collect(global.gc, true);
    lastResortGC(global.gc);
    check("released_buffers_and_objects_collect", !rejects(() => verifyRetention(probe.retention())));
    // Actual production run, with and without inner timers. Mutants above use
    // the same verification paths as real repeated/cross-runtime comparisons.
    let oracle;
    for (const detailed of [false, true]) {
        const p = tracker(), result = measureWorld(bundle, {}, "node-vm", p, 0, detailed);
        await collect(global.gc, true);
        lastResortGC(global.gc);
        check(`production_release_${detailed}`, !rejects(() => verifyRetention(p.retention())));
        if (!detailed) oracle = result.signature;
        else check("instrumentation_preserves_production_output", !rejects(() => verifySignature(oracle, result.signature)));
    }
    return { passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks };
}

async function main(args) {
    const started = performance.now(), opts = parseArgs(args);
    if (opts.help) {
        console.log("Usage: node tools/bench_vertical_worldgen.js [--seed 0..2147483647] [--runs 1..1000] [--runtime node|nw|both] [--nw path] [--profile] [--json] [--selftest]");
        console.log("Defaults: seeds 0,424242,20260919; two fresh worlds per seed; Node VM. JSON artifact always written; --json prints JSON stdout and tables stderr.");
        return 0;
    }
    if (typeof global.gc !== "function" && !process.versions.nw) {
        const child = spawnSync(process.execPath, ["--expose-gc", __filename, ...args], { cwd: process.cwd(), stdio: "inherit", windowsHide: true });
        if (child.error) throw child.error;
        return child.status === null ? 2 : child.status;
    }
    const bundle = sourceBundle();
    if (opts.selftest) {
        const result = await selftest(bundle);
        if (opts.json) console.log(JSON.stringify(result));
        else { result.checks.forEach(c => console.log(`${c.pass ? "PASS" : "FAIL"} vertical_bench.${c.name}`)); console.log(`RESULT: ${result.passed} passed, ${result.failed} failed`); }
        return result.failed ? 1 : 0;
    }
    const report = { schemaVersion: 1, task: "DEUS-TSK-ASTRA-03", createdAt: new Date().toISOString(), status: "running",
        configuration: { seeds: opts.seeds, runs: opts.runs, size: SIZE, zLevels: ZS, runtime: opts.runtime, profile: opts.profile },
        provenance: bundle.provenance, machine: { platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model },
        method: { timer: "performance.now()", domain: "engine", freshRealmEveryRun: true,
            snapshot: "All source/data bytes and the NW harness are frozen at entry; concurrent working-tree edits cannot change these samples. Provenance hashes identify the snapshot, not necessarily the files at exit.",
            loadedPlugins: bundle.plugins.map(p => p.name),
            excludedPlugins: bundle.excluded,
            initialization: "Full public World.newWorld(seed,256) including production founding, population, ecology, inventory and NaturalConnections callbacks in the declared headless bootstrap.",
            phaseAccounting: "Layer timers, surface generation, and connectivity are nested in newWorld and can overlap through lazy map builds. Do not sum them. Diagnostics/GC/source loading are outside newWorld.",
            surface: "Real WorldGen categorical arrays and map tile/object data; Float64 climate fields are resampled through the production API outside generation timing.",
            absent: "GEN3 upper layers are OPEN; no upper biome/elevation arrays or connectivity repair pass. Cliff-cave survey still runs separately.",
            memory: "heapUsed deltas are net GC-sensitive changes, not total allocation. Constructor proxies track typed views/backing buffers; weak object probes track layer/province/biome/connection containers. All must collect after complete realm release; this is not a long-play leak test.",
            exclusions: ["Editor/renderer/scene boot and game ticks", "Canvas/GPU uploads (shade calculation and tile IDs retained)", "Animation image/sidecar loading", "Optional filesystem timing logs (require unavailable to production code)"] },
        runtimes: [] };
    try {
        if (opts.runtime !== "nw") report.runtimes.push(await benchmarkRuntime(bundle, opts, "node-vm"));
        if (opts.runtime !== "node") report.runtimes.push(await runNW(bundle, opts));
        if (report.runtimes.length === 2) {
            const [node, nw] = report.runtimes;
            assert(node.rows.length === nw.rows.length, "Cross-runtime row count differs");
            node.rows.forEach((r, i) => { assert(r.seed === nw.rows[i].seed, "Cross-runtime seed differs"); verifySignature(r.signature, nw.rows[i].signature, `Node/NW seed ${r.seed}`); });
            report.crossRuntimeDeterministic = true;
        }
        report.status = "pass";
    } catch (e) { report.status = "fail"; report.error = String(e.stack || e); }
    report.workingTreeChangesDuringRun = bundle.provenance.sources.filter(s => sha(fs.readFileSync(path.join(ROOT, s.path))) !== s.sha256).map(s => s.path);
    report.sourcesUnchangedDuringRun = report.workingTreeChangesDuringRun.length === 0;
    report.elapsedMs = performance.now() - started;
    report.defaultBudget = { limitMs: 15000, measuredMs: report.elapsedMs, underLimit: report.elapsedMs < 15000,
        enforced: opts.runtime === "node" && opts.runs === 2 && opts.seeds.join(",") === "0,424242,20260919",
        scope: "Benchmark process including source loading, diagnostics and GC; parent launch/output overhead must additionally be measured externally" };
    if (report.defaultBudget.enforced && !report.defaultBudget.underLimit) { report.status = "fail"; report.error = "Default benchmark exceeded 15000 ms"; }
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true }); fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + "\n");
    const write = value => opts.json ? console.error(value) : console.log(value);
    write(summary(report));
    write("GEN3 upper layers: OPEN baseline; plateau/hill generation absent. Times overlap within newWorld. Rendering and animation loading excluded.");
    if (opts.profile) for (const runtime of report.runtimes) for (const row of runtime.rows) for (const sample of row.runs) {
        write(`${runtime.runtime} seed=${row.seed} run=${sample.run}`);
        write(table(["Phase", "ms"], Object.entries(sample.phases).map(([name, ms]) => [name, ms.toFixed(3)])));
        write(`Retention: ${JSON.stringify(sample.memory.retention)}`);
    }
    if (report.crossRuntimeDeterministic) write("Node/NW bit-for-bit checksums: PASS");
    write(`RESULT: ${report.status.toUpperCase()} | ${report.elapsedMs.toFixed(1)} ms | JSON ${OUTPUT}`);
    if (opts.json) console.log(JSON.stringify(report));
    if (report.error) console.error(report.error);
    return report.status === "pass" ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(e => { console.error(`BENCHMARK ERROR: ${e.stack || e}`); process.exitCode = 2; });
module.exports = { main, parseArgs, sourceBundle, prepareSource, tracker, loadWorld, measureWorld, benchmarkRuntime, verifySignature, verifyRetention, arraySignature, selftest };
