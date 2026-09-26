#!/usr/bin/env node
"use strict";

/**
 * tools/test_new_game_year0.js
 *
 * Verification suite for INV-SIM-01 / ATK-YEAR0-001: a standard New Game begins at World Year 0.
 *
 * Section A (gating): the New Game setup window and the embark payload (DEUS_FactionMenus.js).
 *   Default year, keyboard decrement clamping at 0, setYear / typed-box / blur edge cases, and the exact
 *   UF.NewGameSetup payload (keys, types, JSON round trip).
 * Section B (gating): the clock's save/load round trip keeps year 0 (DEUS_Core.js makeSaveContents /
 *   extractSaveContents, both the deusTime and the legacy ufTime key).
 * Section C (gating since ATK-YEAR0-002): a headless New Game fed the payload Section A emits, run
 *   through the real World / Factions / History / Levels / HistoricalDemographics plugins. Checks the live clock
 *   year, the saved clock year, and the clock constructor. A check listed in KNOWN_OPEN is reported, not gating,
 *   unless --strict; if one starts passing the suite exits 1 so it gets promoted to gating. None is listed now.
 * Section D (Rule 4): every mutant must be caught by the checks it targets, and Section C gets a
 *   discrimination run proving its checks also pass under an independent minimal implementation.
 *
 * Usage: node tools/test_new_game_year0.js [--strict]
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const STRICT = process.argv.includes("--strict");
const SEED = 424242;
const SEED_MAX = 0x7ffffffe;

// Section C checks that fail on the current code base. The three ATK-YEAR0-002 checks were promoted to gating
// once the runtime fix landed (0859ed3c, Directive 001-F).
const KNOWN_OPEN = new Set();
const NEW_GAME_PLUGINS = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Factions", "DEUS_History", "DEUS_Levels",
    "DEUS_Dnd5e", "DEUS_Callings", "DEUS_HistoricalDemographics"];

function readPlugin(name) {
    return fs.readFileSync(path.join(PLUGINS, name + ".js"), "utf8");
}

// Each anchor must occur exactly once, so a mutant can't silently land on the wrong line.
function applyOverrides(src, overrides, file) {
    for (const [anchor, replacement] of Object.entries(overrides || {})) {
        const hits = src.split(anchor).length - 1;
        if (hits !== 1) throw new Error(`Override anchor found ${hits} times in ${file}: ${anchor.slice(0, 60)}`);
        src = src.replace(anchor, () => replacement);
    }
    return src;
}

//-----------------------------------------------------------------------------
// Section A environment: DEUS_FactionMenus.js against stubbed RMMZ window classes

function fakeInput() {
    const listeners = {};
    return {
        style: {}, value: "", parentNode: null,
        setAttribute() {},
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        fire(type, key) { for (const fn of listeners[type] || []) fn({ key, stopPropagation() {} }); },
        focus() {}, select() {}, blur() {}
    };
}

function createMenusEnv(overrides) {
    const ns = {};
    const env = {
        window: null,
        document: {
            activeElement: null,
            createElement: () => fakeInput(),
            getElementById: () => null,
            head: { appendChild: () => {} },
            body: { style: {}, appendChild(el) { el.parentNode = this; }, removeChild(el) { el.parentNode = null; } }
        },
        Math, parseInt, isNaN, String, Number, JSON, Object,
        Rectangle: function(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; },
        PIXI: { InteractionManager: function() {} },
        PluginManager: { parameters: () => ({}), registerCommand: () => {} },
        SceneManager: { goto: () => {} },
        Graphics: { boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadSystem: () => ({ isReady: () => true }) },
        SoundManager: { playCursor: () => { env._cursorSounds++; }, playOk: () => {}, playCancel: () => {} },
        DataManager: { setupNewGame: () => { env._setupNewGameCalls++; } },
        TouchInput: { clear: () => {} },
        Input: { clear: () => {}, keyMapper: {}, isPressed: key => env._pressed.has(key) },
        $gameSystem: {},
        UF: ns,
        DEUS: ns,
        _pressed: new Set(),
        _cursorSounds: 0,
        _setupNewGameCalls: 0
    };
    env.window = env;
    const rmmzClasses = [
        "Window_Base", "Window_Selectable", "Window_TitleCommand", "Window_SavefileList",
        "Scene_Base", "Scene_Boot", "Scene_Title", "Scene_Map", "Scene_MenuBase", "Scene_Menu",
        "Game_Actor", "Sprite", "Bitmap"
    ];
    for (const name of rmmzClasses) {
        env[name] = vm.runInNewContext(`(function ${name}(){ if (this.initialize) this.initialize(...arguments); })`);
        env[name].prototype.initialize = function() {};
    }
    const sel = env.Window_Selectable.prototype;
    sel.initialize = function() {
        this.innerWidth = 318;
        this.padding = 12;
        this.visible = true;
        this.contents = { fontSize: 16 };
        this.contentsBack = { fillRect: () => {} };
    };
    sel.open = function() {};
    sel.close = function() {};
    sel.isOpen = function() { return false; };
    sel.index = function() { return this._index || 0; };
    sel.select = function(i) { this._index = i; };
    sel.refresh = function() {};
    sel.redrawItem = function() {};
    sel.cursorRight = function() {};
    sel.cursorLeft = function() {};
    sel.cursorPageup = function() {};
    sel.cursorPagedown = function() {};
    sel.itemLineRect = function() { return new env.Rectangle(0, 0, 100, 32); };
    env.Scene_Title.prototype.addWindow = function() {};
    env.Scene_Title.prototype.fadeOutAll = function() {};

    const src = applyOverrides(readPlugin("DEUS_FactionMenus"), overrides, "DEUS_FactionMenus.js");
    vm.runInContext(src, vm.createContext(env), { filename: "DEUS_FactionMenus.js" });
    return env;
}

function newWindow(env, withYearBox) {
    const win = new env.Window_NewGameSetup(new env.Rectangle(0, 0, 350, 285));
    if (withYearBox) win._createYearInputElement();
    return win;
}

function embark(env, win) {
    const scene = new env.Scene_Title();
    scene._newGameSetupWindow = win;
    env.UF.NewGameSetup = { year: "SENTINEL" };
    scene.onNewGameEmbark();
    return env.UF.NewGameSetup;
}

function runSectionA(overrides) {
    const checks = [];
    const check = (name, pass, msg) => checks.push({ name, pass: !!pass, msg });
    const env = createMenusEnv(overrides);

    // A1-A3: defaults (the original three gates; A3 now starts from a sentinel so it can't pass on a leftover value)
    const w0 = newWindow(env, false);
    const defaultYear = w0.currentYear();
    check("window_default_year_is_0", defaultYear === 0, `Window_NewGameSetup.currentYear() === ${defaultYear} (expected 0)`);
    const untouched = embark(env, w0);
    check("embark_year_is_0", untouched.year === 0, `UF.NewGameSetup.year === ${JSON.stringify(untouched.year)} on untouched embark (expected 0)`);
    const fallback = embark(env, null);
    check("fallback_embark_year_is_0", fallback.year === 0, `Fallback UF.NewGameSetup.year === ${JSON.stringify(fallback.year)} when window is null (expected 0)`);

    // A4-A9: keyboard arrows / page keys on the year row
    let w = newWindow(env, true);
    w.select(1);
    env._cursorSounds = 0;
    w.cursorLeft();
    check("key_left_at_0_stays_0", w.currentYear() === 0 && w._yearInput.value === "0" && env._cursorSounds === 0,
        `Left arrow at year 0 -> year ${w._year}, box "${w._yearInput.value}", ${env._cursorSounds} cursor sounds (expected 0, "0", 0)`);

    w.setYear(5);
    env._pressed.add("shift");
    w.cursorLeft();
    env._pressed.delete("shift");
    check("key_shift_left_clamps_to_0", w.currentYear() === 0 && w._yearInput.value === "0",
        `Shift+Left from year 5 -> year ${w._year}, box "${w._yearInput.value}" (expected 0, "0")`);

    w.setYear(3);
    w.cursorPagedown();
    const afterFirstPage = w._year;
    w.cursorPagedown();
    check("key_pagedown_clamps_to_0", afterFirstPage === 0 && w.currentYear() === 0,
        `PageDown from 3 -> ${afterFirstPage}, again -> ${w._year} (expected 0, 0)`);

    w.setYear(1);
    w.cursorLeft();
    check("key_left_reaches_0_from_1", w.currentYear() === 0, `Left arrow from year 1 -> ${w._year} (expected 0)`);

    w.setYear(0);
    w.cursorRight();
    const up = w._year;
    w.cursorLeft();
    check("key_right_left_round_trip", up === 1 && w.currentYear() === 0, `0 -> Right -> ${up} -> Left -> ${w._year} (expected 1, 0)`);

    w.setYear(995);
    env._pressed.add("shift");
    w.cursorRight();
    env._pressed.delete("shift");
    check("key_shift_right_clamps_999", w.currentYear() === 999, `Shift+Right from 995 -> ${w._year} (expected 999)`);

    // A10-A13: setYear (script / self-test entry point)
    w.setYear(50);
    w.setYear(0);
    check("set_year_0_is_0", w.currentYear() === 0 && w._yearInput.value === "0", `setYear(0) -> ${w._year}, box "${w._yearInput.value}" (expected 0, "0")`);
    w.setYear(50);
    w.setYear(-10);
    check("set_year_negative_clamps_0", w.currentYear() === 0, `setYear(-10) -> ${w._year} (expected 0)`);
    const junk = ["abc", undefined, null, ""].map(v => { w.setYear(50); w.setYear(v); return w._year; });
    check("set_year_non_numeric_is_0", junk.every(y => y === 0), `setYear("abc"/undefined/null/"") -> ${junk.join("/")} (expected 0/0/0/0)`);
    w.setYear(1200);
    check("set_year_over_999_clamps", w.currentYear() === 999, `setYear(1200) -> ${w._year} (expected 999)`);

    // A14-A17: typing into the HTML year box
    w.setYear(42);
    w._yearInput.value = "0";
    w._yearInput.fire("input");
    check("typed_0_sets_year_0", w._year === 0 && w.currentYear() === 0, `Typing "0" over 42 -> _year ${w._year}, currentYear ${w.currentYear()} (expected 0, 0)`);

    w.setYear(42);
    w._yearInput.value = "";
    w._yearInput.fire("input");
    w._yearInput.fire("blur");
    check("blur_empty_box_is_0", w.currentYear() === 0 && w._yearInput.value === "0", `Clearing the box then leaving it -> ${w._year}, box "${w._yearInput.value}" (expected 0, "0")`);

    const blurred = ["-5", "abc"].map(v => { w.setYear(42); w._yearInput.value = v; w._yearInput.fire("blur"); return w._year; });
    check("blur_negative_or_garbage_is_0", blurred.every(y => y === 0), `Leaving the box holding "-5"/"abc" -> ${blurred.join("/")} (expected 0/0)`);

    w.setYear(42);
    w._yearInput.value = "0";
    const boxOverStale = w.currentYear();
    check("box_0_overrides_stale_year", boxOverStale === 0, `Box "0" with stale _year 42 -> currentYear ${boxOverStale} (expected 0)`);

    // A18-A21: embark payload
    const envP = createMenusEnv(overrides);
    const payload = embark(envP, newWindow(envP, false));
    const keys = Object.keys(payload).sort().join(",");
    check("embark_payload_shape",
        keys === "faction,fogOfWar,seed,worldSize,year" && typeof payload.year === "number" && Number.isInteger(payload.year) && payload.year === 0
        && payload.faction === "human" && payload.worldSize === 256 && payload.fogOfWar === false
        && Number.isInteger(payload.seed) && payload.seed >= 1 && payload.seed <= SEED_MAX,
        `Untouched payload ${JSON.stringify(payload)} (expected keys faction,fogOfWar,seed,worldSize,year; integer year 0; seed 1..${SEED_MAX})`);
    const reloaded = JSON.parse(JSON.stringify(payload));
    check("embark_payload_json_round_trip", Object.prototype.hasOwnProperty.call(reloaded, "year") && reloaded.year === 0,
        `JSON round trip of payload -> year ${JSON.stringify(reloaded.year)} (expected 0, key present)`);
    check("embark_calls_setup_new_game_once", envP._setupNewGameCalls === 1, `DataManager.setupNewGame called ${envP._setupNewGameCalls} times on one embark (expected 1)`);

    const wT = newWindow(envP, true);
    wT._yearInput.value = "3";
    wT._yearInput.fire("input");
    wT.select(1);
    wT.cursorLeft(); wT.cursorLeft(); wT.cursorLeft(); wT.cursorLeft();
    const typedDown = embark(envP, wT);
    check("typed_then_decremented_embarks_0", typedDown.year === 0, `Typed 3, Left x4, Start -> payload year ${JSON.stringify(typedDown.year)} (expected 0)`);

    const wF = newWindow(envP, true);
    wF._yearInput.value = "12";
    wF._yearInput.fire("input");
    wF._yearInput.value = "0";
    wF._yearInput.fire("input");
    const focused = embark(envP, wF);
    check("embark_with_box_still_focused_is_0", focused.year === 0 && wF._yearInput === null,
        `Typed 12 then 0, Start without leaving the box -> payload year ${JSON.stringify(focused.year)}, box destroyed ${wF._yearInput === null} (expected 0, true)`);

    return { checks, payload };
}

//-----------------------------------------------------------------------------
// Sections B and C environment: real DEUS plugins in a VM, engine classes stubbed to throw if touched

function tilemapStatics() {
    const core = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_core.js"), "utf8");
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    if (start < 0 || table < 0 || end < 2) throw new Error("rmmz_core.js Tilemap statics not found");
    return "function Tilemap() {}\n" + core.slice(start, end);
}

function loadRuntime(names, overridesByPlugin) {
    const ns = {}, errors = [];
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false,
            makeSaveContents: () => ({}), extractSaveContents() {} },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {},
        $gameSystem: {}, $gameMessage: { isBusy: () => false }, ImageManager: {}, Utils: { isOptionValid: () => false },
        document: { title: "" }, addEventListener() {},
        console: { log() {}, warn() {}, error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" ")) }
    };
    env.window = env;
    const sources = names.map(n => applyOverrides(readPlugin(n), (overridesByPlugin || {})[n], n + ".js"));
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    const protoRe = /\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype(?:\.([A-Za-z0-9_]+))?/g;
    for (const s of sources) for (const m of s.matchAll(protoRe)) classes.add(m[1]);
    for (const c of classes) env[c] = function() { throw new Error(`Unexpected engine construction ${c}`); };
    for (const s of sources) for (const m of s.matchAll(protoRe)) {
        if (m[2]) env[m[1]].prototype[m[2]] = () => { throw new Error(`Unexpected engine method ${m[1]}.${m[2]}`); };
    }
    const ctx = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), ctx);
    vm.runInContext(tilemapStatics(), ctx, { filename: "rmmz_core.js#Tilemap-statics" });
    names.forEach((n, i) => vm.runInContext(sources[i], ctx, { filename: n + ".js", timeout: 60000 }));
    return { env, errors };
}

function runSectionB(overridesByPlugin) {
    const checks = [];
    const check = (name, pass, msg) => checks.push({ name, pass: !!pass, msg });
    const { env, errors } = loadRuntime(["DEUS_Core"], overridesByPlugin);
    const clock = env.$ufTime;

    clock.year = 0;
    const contents = env.DataManager.makeSaveContents();
    const saved = contents.deusTime && contents.deusTime.year, legacy = contents.ufTime && contents.ufTime.year;
    check("save_writes_year_0", saved === 0 && legacy === 0, `makeSaveContents at year 0 -> deusTime.year ${JSON.stringify(saved)}, ufTime.year ${JSON.stringify(legacy)} (expected 0, 0)`);

    const onDisk = JSON.parse(JSON.stringify(contents));
    clock.year = 7;
    env.DataManager.extractSaveContents(onDisk);
    check("load_restores_year_0", clock.year === 0, `extractSaveContents of a year-0 save over clock year 7 -> ${JSON.stringify(clock.year)} (expected 0)`);

    clock.year = 7;
    env.DataManager.extractSaveContents({ ufTime: { hour: 8, minute: 0, day: 1, monthIndex: 0, year: 0, showHUD: true } });
    check("legacy_uftime_save_restores_year_0", clock.year === 0, `extractSaveContents of a legacy ufTime-only year-0 save -> ${JSON.stringify(clock.year)} (expected 0)`);

    check("core_loaded_without_errors", errors.length === 0, `console.error calls while loading DEUS_Core: ${errors.length} (expected 0)`);
    return { checks };
}

function runSectionC(payload, overridesByPlugin) {
    const checks = [];
    const check = (name, pass, msg) => checks.push({ name, pass: !!pass, msg });
    const t0 = performance.now();
    const { env, errors } = loadRuntime(NEW_GAME_PLUGINS, overridesByPlugin);
    // The payload Section A's setup window emitted, with a fixed seed so the run is repeatable.
    env.UF.NewGameSetup = { ...JSON.parse(JSON.stringify(payload)), seed: SEED };
    env.$ufTime.year = 777; // sentinel: whatever the clock reads afterwards was written by the New Game pipeline
    const world = env.UF.World.newWorld(env.UF.NewGameSetup.seed);
    const h = world.history || {}, d = h.demographics || {};
    const diag = { startYear: h.startYear, years: h.years, worldAge: h.worldAge, clockYear0: h.clockYear0,
        demographicsCurrentYear: d.currentYear, demographicsStartYear: d.startYear, units: Object.keys(world.units || {}).length };

    check("new_game_pipeline_ran", !!h.demographics && errors.length === 0,
        `world:created listeners built history (${!!h.demographics}) with ${errors.length} console errors${errors.length ? ": " + errors[0].split("\n")[0] : ""}`);
    check("new_game_clock_year_is_0", env.$ufTime.year === 0, `Clock year after a Year 0 New Game: ${env.$ufTime.year} (expected 0)`);
    const saveYear = env.DataManager.makeSaveContents().deusTime.year;
    check("new_game_save_year_is_0", saveYear === 0, `deusTime.year in the first save of a Year 0 New Game: ${saveYear} (expected 0)`);
    const fresh = new env.Game_DEUSTime();
    check("clock_constructor_keeps_year_0", fresh.year === 0, `new Game_DEUSTime() with UF.NewGameSetup.year 0: year ${fresh.year} (expected 0)`);
    return { checks, diag, clockYear: env.$ufTime.year, saveYear, ms: performance.now() - t0 };
}

//-----------------------------------------------------------------------------
// Mutants (Rule 4). Each names the checks that must catch it.

const MENUS_MUTANTS = [
    { name: "default_year_1", kills: ["window_default_year_is_0", "embark_year_is_0"],
      edit: { "this._factionIndex = 0;\n            this._year = 0;": "this._factionIndex = 0;\n            this._year = 1;" } },
    { name: "fallback_year_1", kills: ["fallback_embark_year_is_0"],
      edit: { "this._newGameSetupWindow.currentYear() : 0;": "this._newGameSetupWindow.currentYear() : 1;" } },
    { name: "change_year_floor_1", kills: ["key_left_reaches_0_from_1"],
      edit: { "Math.max(0, Math.min(999, this._year + delta))": "Math.max(1, Math.min(999, this._year + delta))" } },
    { name: "change_year_no_floor", kills: ["key_left_at_0_stays_0", "key_shift_left_clamps_to_0"],
      edit: { "Math.max(0, Math.min(999, this._year + delta))": "Math.min(999, this._year + delta)" } },
    { name: "set_year_floor_1 (pre-hardening code)", kills: ["set_year_0_is_0"],
      edit: { "this._year = isNaN(parsed) ? 0 : Math.max(0, Math.min(999, parsed));": "this._year = Math.max(1, Math.min(999, parsed || 1));" } },
    { name: "current_year_ignores_box_0 (pre-hardening code)", kills: ["box_0_overrides_stale_year"],
      edit: { "parsed >= 0 && parsed <= 999": "parsed >= 1 && parsed <= 999" } },
    { name: "typed_year_floor_1", kills: ["typed_0_sets_year_0"],
      edit: { "this._year = Math.max(0, val);": "this._year = Math.max(1, val);" } },
    { name: "blur_floor_1", kills: ["blur_empty_box_is_0", "blur_negative_or_garbage_is_0"],
      edit: { "if (isNaN(val) || val < 0) {\n                    this._year = 0;": "if (isNaN(val) || val < 1) {\n                    this._year = 1;" } },
    { name: "payload_year_as_string", kills: ["embark_payload_shape"],
      edit: { "year: year,": "year: String(year)," } },
    { name: "payload_drops_year_0", kills: ["embark_payload_json_round_trip"],
      edit: { "year: year,": "year: year || undefined," } }
];

const CORE_MUTANTS = [
    { name: "save_coerces_year_0_to_1", kills: ["save_writes_year_0"],
      edit: { "contents.ufTime = contents.deusTime;": "contents.deusTime.year = contents.deusTime.year || 1; contents.ufTime = contents.deusTime;" } },
    { name: "load_coerces_year_0_to_1", kills: ["load_restores_year_0", "legacy_uftime_save_restores_year_0"],
      edit: { "$ufTime.year = _tData.year;": "$ufTime.year = _tData.year || 1;" } }
];

// Section C mutants: each puts back one way a Year 0 New Game ends up at year 1.
const SECTION_C_MUTANTS = [
    { name: "core_restores_or_1 (pre-ATK-YEAR0-002 code)", kills: ["clock_constructor_keeps_year_0"],
      edit: { DEUS_Core: { "this.year = Number.isInteger(setupYear) && setupYear >= 0 ? setupYear : 0;": "this.year = (window.UF && UF.NewGameSetup && UF.NewGameSetup.year) || 1;" } } },
    { name: "history_founds_year_0_at_1", kills: ["new_game_clock_year_is_0", "new_game_save_year_is_0"],
      edit: { DEUS_History: { "const foundedYear = targetYear === 0 ? 0 : 1;": "const foundedYear = 1;" } } },
    { name: "history_clock_floor_1", kills: ["new_game_clock_year_is_0", "new_game_save_year_is_0"],
      edit: { DEUS_History: { "if (live && window.$ufTime) $ufTime.year = demographics.currentYear;": "if (live && window.$ufTime) $ufTime.year = Math.max(1, demographics.currentYear);" } } }
];

// Not the shipped fix: the smallest edits that carry the setup year straight into the clock. Section C's checks
// must pass under it too, so they pin the contract rather than one implementation.
const SECTION_C_DISCRIMINATION = {
    DEUS_History: { "if (live && window.$ufTime) $ufTime.year = demographics.currentYear;": "if (live && window.$ufTime) $ufTime.year = UF.NewGameSetup.year;" },
    DEUS_Core: { "this.year = Number.isInteger(setupYear) && setupYear >= 0 ? setupYear : 0;": "this.year = (window.UF && UF.NewGameSetup && UF.NewGameSetup.year !== undefined) ? UF.NewGameSetup.year : 1;" }
};

//-----------------------------------------------------------------------------

function print(checks, known) {
    for (const c of checks) {
        const tag = c.pass ? (known && KNOWN_OPEN.has(c.name) ? "FIXED?" : "PASS") : (known && KNOWN_OPEN.has(c.name) ? "OPEN" : "FAIL");
        console.log(`  [${tag}] ${c.name}: ${c.msg}`);
    }
}

function mutantResult(m, checks) {
    const failed = checks.filter(c => !c.pass).map(c => c.name);
    const hit = m.kills.filter(k => failed.includes(k));
    return { caught: hit.length > 0, detail: `${failed.length} failing checks, targeted: ${hit.join(", ") || "none"}` };
}

function main() {
    console.log("=== DEUS NEW GAME YEAR 0 TEST SUITE (INV-SIM-01 / ATK-YEAR0-001) ===");
    const problems = [];

    console.log("\n--- Section A: setup window and embark payload (DEUS_FactionMenus.js) ---");
    const a = runSectionA();
    print(a.checks, false);
    for (const c of a.checks) if (!c.pass) problems.push(`FAIL ${c.name}`);

    console.log("\n--- Section B: clock save/load keeps year 0 (DEUS_Core.js) ---");
    const b = runSectionB();
    print(b.checks, false);
    for (const c of b.checks) if (!c.pass) problems.push(`FAIL ${c.name}`);

    console.log("\n--- Section C: headless New Game fed the Section A payload (DEUS_Core.js, DEUS_History.js) ---");
    const c = runSectionC(a.payload);
    print(c.checks, true);
    console.log(`  history after New Game: ${JSON.stringify(c.diag)} (${c.ms.toFixed(0)} ms)`);
    let cOpen = 0;
    for (const x of c.checks) {
        if (!KNOWN_OPEN.has(x.name)) { if (!x.pass) problems.push(`FAIL ${x.name}`); continue; }
        if (x.pass) problems.push(`FIXED? ${x.name} now passes: drop it from KNOWN_OPEN`);
        else { cOpen++; if (STRICT) problems.push(`FAIL ${x.name} (--strict)`); }
    }

    console.log("\n--- Section D: Rule 4 mutation checks ---");
    for (const m of MENUS_MUTANTS) {
        const r = mutantResult(m, runSectionA(m.edit).checks);
        console.log(`  [${r.caught ? "PASS" : "FAIL"}] mutant ${m.name} caught: ${r.detail}`);
        if (!r.caught) problems.push(`mutant ${m.name} survived`);
    }
    for (const m of CORE_MUTANTS) {
        const r = mutantResult(m, runSectionB({ DEUS_Core: m.edit }).checks);
        console.log(`  [${r.caught ? "PASS" : "FAIL"}] mutant ${m.name} caught: ${r.detail}`);
        if (!r.caught) problems.push(`mutant ${m.name} survived`);
    }
    for (const m of SECTION_C_MUTANTS) {
        const r = mutantResult(m, runSectionC(a.payload, m.edit).checks);
        console.log(`  [${r.caught ? "PASS" : "FAIL"}] mutant ${m.name} caught: ${r.detail}`);
        if (!r.caught) problems.push(`mutant ${m.name} survived`);
    }
    const disc = runSectionC(a.payload, SECTION_C_DISCRIMINATION);
    const discPass = disc.checks.every(x => x.pass);
    console.log(`  [${discPass ? "PASS" : "FAIL"}] section_c_checks_can_pass: with the clock fed the setup year, ${disc.checks.filter(x => x.pass).length}/${disc.checks.length} Section C checks pass (clock year ${disc.clockYear}, save year ${disc.saveYear}; ${disc.ms.toFixed(0)} ms)`);
    if (!discPass) problems.push("section C discrimination run: " + disc.checks.filter(x => !x.pass).map(x => x.name).join(", "));

    const gating = a.checks.length + b.checks.length + (c.checks.length - KNOWN_OPEN.size);
    console.log("\n==================================================");
    if (problems.length) {
        console.error("TEST SUITE FAILED:");
        for (const p of problems) console.error("  " + p);
        console.log("==================================================");
        process.exit(1);
    }
    console.log(`SETUP CONTRACT PASSED: ${gating} gating checks, ${MENUS_MUTANTS.length + CORE_MUTANTS.length + SECTION_C_MUTANTS.length} mutants caught (ATK-YEAR0-001 closure criterion).`);
    if (cOpen) {
        console.log(`INV-SIM-01 END-TO-END NOT MET: ${cOpen} known-open Section C checks fail.`);
        console.log("Run with --strict to gate on INV-SIM-01 end to end.");
    } else {
        console.log("INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.");
    }
    console.log("==================================================");
    process.exit(0);
}

main();
