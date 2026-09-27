"use strict";

// Headless host only. Every simulation function below comes from the repository;
// engine drawing calls have no pixels, files, audio, network, or scene execution.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "../..");
const REGISTERED = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Tiles",
    "DEUS_Factions", "DEUS_History", "DEUS_Objects", "DEUS_Items", "DEUS_Jobs", "DEUS_Wildlife",
    "DEUS_Ecology", "DEUS_Levels", "DEUS_NaturalConnections"];
// Core's desktop companion loader loads these modules outside plugins.js.
const COMPANIONS = ["DEUS_Dnd5e", "DEUS_Callings", "DEUS_HistoricalDemographics", "DEUS_Fluid", "DEUS_Containers"];

function read(relative) { return fs.readFileSync(path.join(ROOT, relative), "utf8"); }
function createRuntime(stage = () => {}, hooks = {}) {
    const registration = {};
    vm.runInNewContext(read("game/js/plugins.js"), registration, { timeout: 1000 });
    const rows = registration.$plugins;
    for (const name of REGISTERED) {
        if (rows.filter(p => p.name === name && p.status === true).length !== 1) {
            throw new Error(`Required enabled plugin missing/duplicated: ${name}`);
        }
    }
    const names = rows.filter(p => REGISTERED.includes(p.name) && p.status).map(p => p.name).concat(COMPANIONS);
    const catalog = JSON.parse(read("game/data/UF_WorldCatalog.json"));
    const errors = [], warnings = [], logs = [], events = [], calls = [];
    const describe = a => a.map(x => x && x.stack || String(x)).join(" ");
    const ns = {};
    const forbidden = name => function() { throw new Error(`Unexpected headless host call: ${name}`); };
    const context2d = { createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(0) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {} };
    const env = {
        window: null, UF: ns, DEUS: ns, performance,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        $dataTilesets: JSON.parse(read("game/data/Tilesets.json")),
        PluginManager: { parameters: name => (rows.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false,
            makeSaveContents: () => ({}), extractSaveContents() {} },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {},
        $gameMessage: { isBusy: () => false },
        ImageManager: { loadTileset: forbidden("image load"), loadCharacter: forbidden("character load") },
        Utils: { isOptionValid: () => false },
        document: { title: "", createElement(name) {
            if (name !== "canvas") throw new Error(`Unexpected DOM element: ${name}`);
            return { getContext: () => context2d }; // no canvas, pixels, or exported image
        } },
        addEventListener() {},
        console: { log: (...a) => logs.push(describe(a)), warn: (...a) => warnings.push(describe(a)),
            error: (...a) => errors.push({ stage: hooks.currentStage ? hooks.currentStage() : "unknown", message: describe(a) }) }
    };
    env.window = env;
    const sources = names.map(n => read(`game/js/plugins/${n}.js`));
    // This regex constructs the engine host, never an acceptance proof. Unexpected
    // engine execution throws; generation, events, RNG and paths are never stubbed.
    const proto = /\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype(?:\.([A-Za-z0-9_]+))?/g;
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    for (const src of sources) for (const m of src.matchAll(proto)) classes.add(m[1]);
    for (const name of classes) env[name] = forbidden(name);
    for (const src of sources) for (const m of src.matchAll(proto)) {
        if (m[2]) env[m[1]].prototype[m[2]] = forbidden(`${m[1]}.${m[2]}`);
    }
    env.Scene_Boot.prototype.start = function() {};
    env.Bitmap = class { constructor(width, height) { this.width = width; this.height = height; this.context = context2d; this._baseTexture = { update() {} }; } };
    const ctx = vm.createContext(env);
    // Lexical intrinsics avoid the VM global-proxy cost in the actual generator.
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int16Array", "Int32Array", "Uint32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), ctx);
    // Use the stock engine's complete tile classification/autotile tables, as the
    // existing headless worldgen harnesses do; no copies of the generation logic.
    const core = read("game/js/rmmz_core.js");
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    if (start < 0 || table < start || end < table) throw new Error("Stock Tilemap statics unavailable");
    vm.runInContext("function Tilemap() {}\n" + core.slice(start, end), ctx);
    const generators = new Map();
    for (let i = 0; i < names.length; i++) {
        stage(`load:${names[i]}`);
        vm.runInContext(sources[i], ctx, { filename: names[i] + ".js", timeout: 30000 });
        if (names[i] === "DEUS_Core") {
            const original = env.UF.Events.emit;
            env.UF.Events.emit = function(name, ...args) {
                events.push(name);
                return original.call(this, name, ...args);
            };
        }
        if (names[i] === "DEUS_World") {
            const original = env.UF.World.registerGenerator;
            env.UF.World.registerGenerator = function(name, fn, order, opts) {
                generators.set(name, { order, levels: opts && opts.levels });
                return original.call(this, name, function(c) {
                    calls.push({ name, z: c.z, ax: c.areaX, ay: c.areaY });
                    if (hooks.generator) return hooks.generator(name, fn, c);
                    return fn(c);
                }, order, opts);
            };
        }
    }
    stage("boot");
    env.DataManager.onLoad(catalog);
    env.Scene_Boot.prototype.start.call({});
    return { env, ctx, errors, warnings, logs, events, calls, generators, names };
}

module.exports = { ROOT, createRuntime, REGISTERED, COMPANIONS };
