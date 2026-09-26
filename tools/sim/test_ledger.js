"use strict";
// WG.65.15 unit, purity and mutation tests for game/js/sim/ledger*.js (node only; never NW.js).
//   node tools/sim/test_ledger.js            all checks, purity and mutants
//   node tools/sim/test_ledger.js --quiet    only FAIL lines and the RESULT line
// Prints one "PASS <name>" or "FAIL <name>: <why>" line per check and "RESULT: <n> passed, <m> failed"; exit 0 only if
// every check passes. The ledger is always loaded into a bare vm context (ECMAScript built-ins only, Math.random throws,
// Date removed), so every unit check is also a dynamic purity check (ADR-003 §2.5, §2.7). Mutants are applied to
// in-memory copies of the module text; the files on disk are never edited.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SIM = path.join(ROOT, "game", "js", "sim");
const QUIET = process.argv.includes("--quiet");
const LEDGER_FILES = fs.readdirSync(SIM).filter(f => /^ledger/.test(f)).sort();
const REAL = {};
// CRLF is folded to LF so that the mutant find strings match on a checkout with core.autocrlf=true.
for (const f of LEDGER_FILES) REAL[f] = fs.readFileSync(path.join(SIM, f), "utf8").replace(/\r\n/g, "\n");

//=======================================================================================================================
// Loader: a bare vm context and a require() that resolves only ./ledger* files (ADR-003 §2.5 loader shape).

function bareContext() {
    // DONT_CONTEXTIFY (node >= 22.8) gives the new context an ordinary global object: the same built-ins, but no
    // interceptor on every global read, which makes the ledger about 10 times faster here than in a contextified sandbox.
    const ctx = vm.constants && vm.constants.DONT_CONTEXTIFY !== undefined ? vm.createContext(vm.constants.DONT_CONTEXTIFY) : vm.createContext({});
    // A V8 context also carries a built-in console; it is removed too, so only ECMAScript built-ins remain.
    vm.runInContext('"use strict"; Math.random = function () { throw new Error("PURITY: Math.random called"); }; delete globalThis.Date; delete globalThis.console;', ctx);
    return ctx;
}
function loadLedger(overrides) {
    const ctx = bareContext(), cache = {};
    function load(file) {
        if (cache[file]) return cache[file].exports;
        const src = overrides && overrides[file] !== undefined ? overrides[file] : REAL[file];
        if (src === undefined) throw new Error("PURITY: no module " + file);
        const module = { exports: {} };
        cache[file] = module;
        const fn = vm.runInContext("(function (module, exports, require) {" + src + "\n})", ctx, { filename: file });
        fn(module, module.exports, req);
        return module.exports;
    }
    function req(spec) {
        if (typeof spec !== "string" || !/^\.\/ledger[a-z0-9_]*(\.js)?$/.test(spec)) throw new Error("PURITY: require(" + JSON.stringify(spec) + ") refused");
        return load(spec.slice(2).replace(/\.js$/, "") + ".js");
    }
    const L = load("ledger.js");
    return { L, D: load("ledger_defaults.js"), ctx };
}

//=======================================================================================================================
// Static purity scan: tokenizes the source (comments, strings, template text and regex bodies are not scanned; template
// ${expressions} are) and fails on any ADR-003 §2.3 identifier, on require() of anything but ./ledger*, and on any Math
// member outside ADR-003 §10.4's exact list.

const FORBIDDEN = new Set(["window", "document", "globalThis", "self", "global", "process", "nw", "localStorage", "setTimeout",
    "setInterval", "requestAnimationFrame", "performance", "Date", "PIXI", "Graphics", "Input", "TouchInput", "SceneManager",
    "DataManager", "StorageManager", "ImageManager", "AudioManager", "SoundManager", "PluginManager", "Utils", "JsonEx",
    "Tilemap", "Bitmap", "UF", "DEUS"]);
// Beyond the ADR list: ways to reach the global object or host APIs without naming a forbidden global.
const EXTRA = new Set(["eval", "Function", "constructor", "import", "export", "console", "Buffer", "__dirname", "__filename",
    "setImmediate", "queueMicrotask", "WebAssembly"]);
const PREFIXES = ["$game", "$data", "$uf", "$deus", "Game_", "Scene_", "Sprite", "Spriteset_", "Window_"];
const MATH_OK = new Set(["abs", "min", "max", "floor", "ceil", "round", "trunc", "sign", "imul", "clz32"]);
const REQ_OK = /^\.\/ledger[a-z0-9_]*(\.js)?$/;
const REGEX_AFTER = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "instanceof", "yield", "await"]);

function tokenize(src) {
    const out = [];
    let i = 0;
    const n = src.length;
    function regexOk() {
        const p = out.length ? out[out.length - 1] : null;
        if (!p) return true;
        if (p.t === "num" || p.t === "str" || p.t === "tpl" || p.t === "re") return false;
        if (p.t === "id") return REGEX_AFTER.has(p.v);
        return !(p.v === ")" || p.v === "]" || p.v === "}");
    }
    function scan(stopAtBrace) {
        let depth = 0;
        while (i < n) {
            const c = src[i];
            if (c === "/" && src[i + 1] === "/") { const e = src.indexOf("\n", i); i = e < 0 ? n : e; continue; }
            if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); if (e < 0) throw new Error("unterminated comment"); i = e + 2; continue; }
            if (/\s/.test(c)) { i++; continue; }
            if (c === "'" || c === '"') {
                let j = i + 1, v = "";
                while (j < n && src[j] !== c) {
                    if (src[j] === "\\") { v += src[j + 1]; j += 2; continue; }
                    if (src[j] === "\n") throw new Error("unterminated string");
                    v += src[j]; j++;
                }
                if (j >= n) throw new Error("unterminated string");
                i = j + 1;
                out.push({ t: "str", v });
                continue;
            }
            if (c === "`") {
                i++;
                for (;;) {
                    if (i >= n) throw new Error("unterminated template");
                    if (src[i] === "\\") { i += 2; continue; }
                    if (src[i] === "`") { i++; break; }
                    if (src[i] === "$" && src[i + 1] === "{") { i += 2; scan(true); continue; }
                    i++;
                }
                out.push({ t: "tpl" });
                continue;
            }
            if (c === "/" && regexOk()) {
                let j = i + 1, inClass = false;
                for (;;) {
                    if (j >= n || src[j] === "\n") throw new Error("unterminated regex");
                    if (src[j] === "\\") { j += 2; continue; }
                    if (inClass) { if (src[j] === "]") inClass = false; }
                    else if (src[j] === "[") inClass = true;
                    else if (src[j] === "/") break;
                    j++;
                }
                j++;
                while (j < n && /[A-Za-z]/.test(src[j])) j++;
                i = j;
                out.push({ t: "re" });
                continue;
            }
            if (/[A-Za-z_$]/.test(c)) {
                let j = i + 1;
                while (j < n && /[\w$]/.test(src[j])) j++;
                out.push({ t: "id", v: src.slice(i, j) });
                i = j;
                continue;
            }
            if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) {
                let j = i + 1;
                while (j < n && /[\w.]/.test(src[j])) j++;
                out.push({ t: "num" });
                i = j;
                continue;
            }
            if (c === "{") depth++;
            if (c === "}") {
                if (stopAtBrace && depth === 0) { i++; return; }
                depth--;
            }
            out.push({ t: "p", v: c });
            i++;
        }
        if (stopAtBrace) throw new Error("unterminated template expression");
    }
    scan(false);
    return out;
}
function purityViolations(src) {
    let toks;
    try { toks = tokenize(src); } catch (e) { return ["tokenizer: " + e.message]; }
    const v = [];
    for (let k = 0; k < toks.length; k++) {
        const t = toks[k];
        if (t.t !== "id") continue;
        const prev = toks[k - 1], next = toks[k + 1];
        const isProp = prev && prev.t === "p" && prev.v === ".";
        if (FORBIDDEN.has(t.v) || EXTRA.has(t.v)) v.push("forbidden identifier " + t.v);
        else if (PREFIXES.some(p => t.v.indexOf(p) === 0)) v.push("forbidden identifier " + t.v);
        if (t.v === "require" && !isProp) {
            const a = toks[k + 1], b = toks[k + 2], c = toks[k + 3];
            if (!(a && a.v === "(" && b && b.t === "str" && REQ_OK.test(b.v) && c && c.v === ")")) v.push("require() of something other than a ./ledger* string");
        }
        if (t.v === "Math" && !isProp) {
            if (next && next.v === "." && toks[k + 2] && toks[k + 2].t === "id") { if (!MATH_OK.has(toks[k + 2].v)) v.push("Math." + toks[k + 2].v + " is not on the ADR-003 §10.4 list"); }
            else v.push("Math used other than as Math.<exact function>");
        }
    }
    return v;
}

//=======================================================================================================================
// Assertions and helpers (independent of the module: own canonical JSON, own table walks).

function show(v) { try { return typeof v === "bigint" ? v + "n" : JSON.stringify(v); } catch (e) { return String(v); } }
function stable(v) {
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
    return JSON.stringify(v);
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || "value") + ": expected " + show(b) + ", got " + show(a)); }
function ok(v, msg) { if (!v) throw new Error(msg); }
function same(a, b, msg) { const x = stable(a), y = stable(b); if (x !== y) throw new Error((msg || "data") + " differ:\n  " + x.slice(0, 300) + "\n  " + y.slice(0, 300)); }
function throwsCode(fn, code, msg) {
    let err = null;
    try { fn(); } catch (e) { err = e; }
    if (!err) throw new Error((msg || "call") + ": expected " + code + ", nothing was thrown");
    if (err.code !== code) throw new Error((msg || "call") + ": expected " + code + ", got " + (err.code || "") + " " + String(err.message).slice(0, 160));
    return err;
}
const METALS = ["fe", "cu", "ag", "au", "pt"];

function suite(L, D) {
    const checks = [];
    const T = (name, fn) => checks.push([name, fn]);
    const cfg = () => L.defaultConfig();
    function world(config) {
        const l = L.createLedger(config);
        l.register("stone", "strata", 10000, "worldgen");
        l.register("stone", "object", 500, "worldgen");
        l.register("wood", "object", 300, "worldgen");
        l.register("wood", "item", 100, "worldgen");
        l.register("fe_ore", "strata", 800, "worldgen");
        l.register("fe_metal", "item", 200, "worldgen");
        l.register("steel", "item", 50, "worldgen");
        l.register("cu_ore", "strata", 400, "worldgen");
        l.register("cu_metal", "item", 100, "worldgen");
        l.register("ag_metal", "item", 60, "worldgen");
        l.register("au_metal", "item", 40, "worldgen");
        l.register("pt_ore", "strata", 20, "worldgen");
        l.register("water", "fluid", 700, "worldgen");
        l.register("biomass", "object", 900, "worldgen");
        l.register("humus", "strata", 100, "worldgen");
        l.register("gem", "strata", 30, "worldgen");
        l.register("electrum", "item", 20, "worldgen");
        l.seal();
        return l;
    }
    const recountOf = l => JSON.parse(JSON.stringify(l.totals().forms));
    const rowKey = r => r.from + "|" + r.fromForm + ">" + r.to + "|" + r.toForm;

    //---- default tables ----------------------------------------------------------------------------------------------
    T("defaults_minimum_classes_and_forms", () => {
        const d = L.createLedger().describe();
        for (const c of ["stone", "rubble", "soil", "sediment", "ash", "charcoal", "wood", "biomass", "water", "gem", "fe_trace", "cu_trace", "ag_trace", "steel", "electrum"])
            ok(d.classes[c], "class " + c + " missing");
        for (const m of METALS) {
            ok(d.classes[m + "_ore"] && d.classes[m + "_ore"].ore === true, m + "_ore must be an ore class");
            ok(d.classes[m + "_metal"] && d.classes[m + "_metal"].ore === false, m + "_metal missing");
            same(d.classes[m + "_ore"].composition, { [m]: 1 }, m + "_ore composition");
        }
        for (const f of ["strata", "item", "object", "ruin", "fluid", "ice", "creature"]) ok(d.forms.indexOf(f) >= 0, "form " + f + " missing");
        ok(d.classes.water.forms.indexOf("ice") >= 0 && d.classes.water.forms.indexOf("fluid") >= 0, "water needs fluid and ice forms");
        same(d.classes.electrum.composition, { ag: 1, au: 1 }, "electrum composition");
        same(d.classes.steel.composition, { fe: 1 }, "steel counts toward iron");
        for (const f of ["fe", "cu", "ag", "au", "pt", "gem"]) eq(d.families[f].finite, true, "family " + f + " finite");
    });
    T("defaults_no_row_outputs_ore", () => {
        const d = L.createLedger().describe();
        ok(d.transforms.length > 50, "too few transform rows: " + d.transforms.length);
        for (const r of d.transforms) ok(!d.classes[r.to].ore || r.to === r.from, "row " + rowKey(r) + " outputs ore");
        for (const id of Object.keys(d.recipes)) for (const o of d.recipes[id].outputs) ok(!d.classes[o[0].split("|")[0]].ore, "recipe " + id + " outputs ore");
    });
    T("defaults_rows_keep_elements", () => {
        const d = L.createLedger().describe();
        for (const r of d.transforms) same(d.classes[r.from].composition, d.classes[r.to].composition, "row " + rowKey(r));
        for (const id of Object.keys(d.recipes)) {
            const bal = {};
            for (const [side, sign] of [["inputs", 1], ["outputs", -1]]) for (const e of d.recipes[id][side]) {
                const cd = d.classes[e[0].split("|")[0]], den = Object.values(cd.composition).reduce((a, b) => a + b, 0);
                for (const f of Object.keys(cd.composition)) bal[f] = (bal[f] || 0) + sign * e[1] / den * cd.composition[f];
            }
            for (const f of Object.keys(bal)) eq(bal[f], 0, "recipe " + id + " balance of " + f);
        }
    });
    T("defaults_sources_never_ore_or_finite", () => {
        const d = L.createLedger().describe();
        for (const n of Object.keys(d.sources)) for (const k of d.sources[n].allowed) {
            const c = d.classes[k.split("|")[0]];
            ok(!c.ore, "source " + n + " allows ore " + k);
            ok(!c.finite, "source " + n + " allows finite " + k);
        }
        ok(d.sinks["world-edge"].allowed.indexOf("fe_ore|strata") >= 0, "sinks may remove ore");
        for (const n of ["magic", "world-edge", "debug-explicit"]) { ok(d.sources[n], "source " + n + " missing"); ok(d.sinks[n], "sink " + n + " missing"); }
        same(d.sources.rain.allowed, ["water|fluid"], "rain scope");
        same(d.sinks.evaporation.allowed, ["water|fluid"], "evaporation scope");
    });
    T("defaults_magic_flagged_unconfirmed", () => {
        const l = L.createLedger(), d = l.describe();
        for (const t of [d.sources.magic, d.sinks.magic]) {
            eq(t.ownerConfirmed, false, "magic ownerConfirmed");
            ok(/DEC-018/.test(t.authority) && /NOT confirmed/.test(t.authority), "magic authority must cite DEC-018 and say it is not confirmed: " + t.authority);
        }
        const u = l.unconfirmed().map(x => x.kind + ":" + x.name);
        ok(u.indexOf("source:magic") >= 0 && u.indexOf("sink:magic") >= 0, "unconfirmed() must list magic: " + u.join(","));
    });
    T("defaults_decay_chain_rows", () => {
        const keys = new Set(L.createLedger().describe().transforms.map(rowKey));
        for (const k of ["stone|object>stone|ruin", "stone|ruin>rubble|strata", "rubble|strata>soil|strata", "rubble|strata>sediment|strata",
            "soil|strata>sediment|strata", "sediment|strata>soil|strata", "sediment|strata>stone|strata", "wood|object>wood|ruin", "wood|ruin>humus|strata"])
            ok(keys.has(k), "decay row " + k + " missing");
        for (const k of ["stone|object>soil|strata", "stone|object>sediment|strata", "stone|ruin>soil|strata", "stone|ruin>sediment|strata", "rubble|strata>stone|strata",
            "soil|strata>stone|strata", "soil|strata>rubble|strata", "sediment|strata>rubble|strata", "rubble|strata>stone|ruin", "stone|ruin>stone|object",
            "humus|strata>wood|ruin", "ash|strata>wood|item"])
            ok(!keys.has(k), "skip/reverse row " + k + " must not exist");
    });
    T("defaults_rust_rows_keep_element", () => {
        const rows = L.createLedger().describe().transforms.filter(r => r.id === "rust");
        for (const m of ["fe", "cu", "ag"]) ok(rows.some(r => r.from === m + "_metal" && r.to === m + "_trace"), "rust row for " + m);
        ok(rows.some(r => r.from === "steel" && r.to === "fe_trace"), "steel rusts to fe_trace");
        for (const r of rows) eq(r.to.split("_")[0], r.from === "steel" ? "fe" : r.from.split("_")[0], "rust element of " + rowKey(r));
        ok(!rows.some(r => r.from === "au_metal" || r.from === "pt_metal"), "gold and platinum do not rust");
    });
    T("defaults_module_is_frozen", () => {
        for (const o of [D, D.families, D.classes, D.classes.fe_ore, D.transforms, D.transforms[0], D.transforms[0].toForms, D.sources, D.sources.magic, D.sinks.magic, D.recipes[0].inputs])
            ok(Object.isFrozen(o), "a defaults object is not frozen");
        const c = L.defaultConfig();
        c.transforms.length = 0;
        ok(L.defaultConfig().transforms.length > 50, "defaultConfig() must return an independent copy");
    });
    T("defaults_deterministic_describe_and_checksum", () => {
        same(L.createLedger().describe(), L.createLedger().describe(), "describe");
        eq(world().checksum(), world().checksum(), "checksum of the same calls");
    });

    //---- config validation at load -------------------------------------------------------------------------------------
    T("config_rejects_ore_output_row", () => {
        for (const [from, to] of [["stone", "fe_ore"], ["cu_ore", "fe_ore"], ["fe_metal", "fe_ore"], ["fe_trace", "fe_ore"]]) {
            const c = cfg();
            c.transforms.push({ id: "sprout", from, fromForms: [c.classes[from].forms[0]], to, toForms: ["strata"] });
            throwsCode(() => L.createLedger(c), "E_ORE_OUTPUT", "row " + from + " -> " + to);
        }
    });
    T("config_rejects_ore_output_recipe", () => {
        const c = cfg();
        c.recipes.push({ id: "transmute", inputs: [["fe_metal", "item", 1]], outputs: [["fe_ore", "item", 1]] });
        throwsCode(() => L.createLedger(c), "E_ORE_OUTPUT", "recipe");
    });
    T("config_rejects_ore_source_list", () => {
        const c = cfg();
        c.sources.magic.classes = ["stone", "fe_ore"];
        throwsCode(() => L.createLedger(c), "E_ORE_OUTPUT", "magic listing fe_ore");
        const d = cfg();
        d.sources.sprout = { classes: ["cu_ore"], forms: ["object"], allowFinite: true };
        throwsCode(() => L.createLedger(d), "E_ORE_OUTPUT", "new source listing cu_ore even with allowFinite");
    });
    T("config_finite_source_needs_flag", () => {
        const c = cfg();
        c.sources.magic.classes = ["fe_metal"];
        throwsCode(() => L.createLedger(c), "E_FINITE_SOURCE", "magic listing fe_metal");
        c.sources.magic.allowFinite = true;
        const l = L.createLedger(c);
        l.seal();
        l.source("magic", "fe_metal", "item", 5, "spell:creation");
        eq(l.familyTotal("fe"), 5, "fe after an allowed finite source");
        throwsCode(() => l.source("magic", "fe_ore", "item", 5, "x"), "E_ORE_OUTPUT", "ore is never allowed");
    });
    T("config_rejects_cross_element_row", () => {
        for (const [from, ff, to, tf] of [["fe_metal", "item", "cu_trace", "strata"], ["stone", "strata", "wood", "item"], ["electrum", "item", "au_metal", "item"], ["water", "fluid", "stone", "strata"]]) {
            const c = cfg();
            c.transforms.push({ id: "bad", from, fromForms: [ff], to, toForms: [tf] });
            throwsCode(() => L.createLedger(c), "E_FAMILY", from + " -> " + to);
        }
    });
    T("config_rejects_unbalanced_recipe", () => {
        const c = cfg();
        c.recipes.push({ id: "cheat", inputs: [["au_metal", "item", 1], ["ag_metal", "item", 1]], outputs: [["electrum", "item", 4]] });
        throwsCode(() => L.createLedger(c), "E_FAMILY", "au 1 + ag 1 -> electrum 4");
        const d = cfg();
        d.recipes.push({ id: "odd", inputs: [["au_metal", "item", 1]], outputs: [["electrum", "item", 1]] });
        throwsCode(() => L.createLedger(d), "E_CONFIG", "electrum parts not a multiple of 2");
    });
    T("config_rejects_malformed", () => {
        const cases = [
            c => { c.transforms.push({ id: "x", from: "unobtainium", fromForms: ["item"], to: "stone", toForms: ["item"] }); },
            c => { c.transforms.push({ id: "x", from: "stone", fromForms: ["fluid"], to: "stone", toForms: ["item"] }); },
            c => { c.transforms.push({ id: "x", from: "stone", fromForms: ["object"], to: "stone", toForms: ["ruin"] }); },
            c => { c.transforms.push({ id: "x", from: "stone", fromForms: ["item"], to: "stone", toForms: ["item"] }); },
            c => { c.transforms.push({ id: "Bad Name", from: "stone", fromForms: ["item"], to: "stone", toForms: ["strata"] }); },
            c => { delete c.schema; },
            c => { c.classes.stone.family = "nope"; },
            c => { c.classes.electrum.composition.au = 1.5; },
            c => { c.classes.fe_ore = { composition: { fe: 1, cu: 1 }, forms: ["strata"], ore: true }; },
            c => { c.logLimit = 0; },
            c => { c.sinks.magic.allowFinite = true; },
            c => { c.sources.rain.forms = ["lake"]; },
            c => { c.forms.push("strata"); },
            c => { c.classes.stone.forms = []; }
        ];
        cases.forEach((mut, i) => { const c = cfg(); mut(c); throwsCode(() => L.createLedger(c), "E_CONFIG", "malformed case " + i); });
        throwsCode(() => L.createLedger(null), "E_CONFIG", "null config");
        throwsCode(() => L.createLedger([]), "E_CONFIG", "array config");
    });
    T("config_is_copied_at_load", () => {
        const c = cfg(), l = L.createLedger(c), before = stable(l.describe());
        c.transforms.push({ id: "sprout", from: "stone", fromForms: ["strata"], to: "fe_ore", toForms: ["strata"] });
        c.classes.fe_ore.ore = false;
        c.sources.magic.classes = ["fe_ore"];
        c.sources.magic.allowFinite = true;
        eq(stable(l.describe()), before, "describe after the caller mutated its config");
        l.register("stone", "strata", 10);
        l.seal();
        throwsCode(() => l.transform("stone", "strata", "fe_ore", "strata", 1, "sprout"), "E_ORE_OUTPUT", "transform");
        throwsCode(() => l.source("magic", "fe_ore", "strata", 1, "x"), "E_ORE_OUTPUT", "source");
    });
    T("config_sources_are_data_driven", () => {
        const a = cfg();
        delete a.sources.magic;
        const la = L.createLedger(a);
        la.seal();
        throwsCode(() => la.source("magic", "stone", "object", 1, "spell"), "E_UNKNOWN_SOURCE", "magic removed from the table");
        const b = cfg();
        b.sources.magic.classes = ["water"];
        b.sources.magic.forms = ["fluid"];
        const lb = L.createLedger(b);
        lb.seal();
        throwsCode(() => lb.source("magic", "stone", "object", 1, "spell:wall_of_stone"), "E_SOURCE_SCOPE", "magic limited to water");
        lb.source("magic", "water", "fluid", 3, "spell:create_water");
        eq(lb.total("water"), 3, "water after create_water");
        const c = cfg();
        c.sources.conjure = { classes: ["stone"], forms: ["object"] };
        const lc = L.createLedger(c);
        lc.seal();
        lc.source("conjure", "stone", "object", 4, "spell:wall_of_stone");
        eq(lc.total("stone"), 4, "a renamed conjure source");
    });

    //---- register and seal ---------------------------------------------------------------------------------------------
    T("register_and_totals", () => {
        const l = world();
        eq(l.total("stone"), 10500, "stone");
        eq(l.amount("stone", "object"), 500, "stone object");
        eq(l.familyTotal("mineral"), 10500, "mineral");
        eq(l.familyTotal("au"), 50, "au = au_metal 40 + electrum 20 / 2");
        eq(l.familyTotal("ag"), 70, "ag = ag_metal 60 + electrum 20 / 2");
        eq(l.familyTotal("fe"), 1050, "fe = ore 800 + metal 200 + steel 50");
        const t = l.totals();
        eq(t.classes.electrum, 20, "totals().classes");
        eq(t.forms.fe_ore.strata, 800, "totals().forms");
        eq(t.families.organic, 1400, "totals().families organic");
        throwsCode(() => l.total("unobtainium"), "E_UNKNOWN_CLASS", "total of unknown class");
        throwsCode(() => l.familyTotal("mithral"), "E_UNKNOWN_FAMILY", "unknown family");
    });
    T("seal_enforced", () => {
        const l = world();
        eq(l.isSealed(), true, "isSealed");
        throwsCode(() => l.register("stone", "strata", 1, "late"), "E_SEALED", "register after seal");
        throwsCode(() => l.seal(), "E_SEALED", "seal twice");
        const u = L.createLedger();
        u.register("stone", "object", 10);
        throwsCode(() => u.transform("stone", "object", "stone", "ruin", 1, "decay"), "E_NOT_SEALED", "transform before seal");
        throwsCode(() => u.source("magic", "stone", "object", 1, "spell"), "E_NOT_SEALED", "source before seal");
        throwsCode(() => u.sink("magic", "stone", "object", 1, "spell"), "E_NOT_SEALED", "sink before seal");
        throwsCode(() => u.recipe("alloy.electrum", 1, "smith"), "E_NOT_SEALED", "recipe before seal");
        throwsCode(() => u.closeInterval(), "E_NOT_SEALED", "closeInterval before seal");
        throwsCode(() => u.interval(), "E_NOT_SEALED", "interval before seal");
        eq(u.total("stone"), 10, "nothing moved before seal");
    });
    T("register_rejects_unknown_class_and_form", () => {
        const l = L.createLedger();
        throwsCode(() => l.register("mithral", "item", 1), "E_UNKNOWN_CLASS", "class");
        throwsCode(() => l.register("stone", "fluid", 1), "E_UNKNOWN_FORM", "form");
        throwsCode(() => l.register("stone", "strata", 1, ""), "E_CAUSE", "empty cause");
    });

    //---- amounts -------------------------------------------------------------------------------------------------------
    T("amount_rejects_non_integers", () => {
        const bad = [1.5, 0.5, NaN, Infinity, -Infinity, -1, -0.5, "5", null, undefined, Math.pow(2, 53), 1e300, {}, [], true, BigInt(5)];
        for (const v of bad) {
            const l = world();
            const e = throwsCode(() => L.createLedger().register("stone", "strata", v, "worldgen:test"), "E_AMOUNT", "register " + show(v));
            ok(/stone/.test(e.message) && /worldgen:test/.test(e.message), "the error names the class and cause: " + e.message);
            const t = throwsCode(() => l.transform("stone", "object", "stone", "ruin", v, "decay:test"), "E_AMOUNT", "transform " + show(v));
            ok(/stone/.test(t.message) && /decay:test/.test(t.message), "the error names class and cause: " + t.message);
            for (const e2 of [throwsCode(() => l.source("magic", "stone", "object", v, "spell:x"), "E_AMOUNT", "source " + show(v)),
                throwsCode(() => l.sink("magic", "stone", "object", v, "spell:x"), "E_AMOUNT", "sink " + show(v))])
                ok(/stone/.test(e2.message) && /spell:x/.test(e2.message), "the error names the class and cause: " + e2.message);
            const e3 = throwsCode(() => l.recipe("alloy.electrum", v, "smith:x"), "E_AMOUNT", "recipe times " + show(v));
            ok(/alloy\.electrum/.test(e3.message) && /smith:x/.test(e3.message), "the error names the recipe and cause: " + e3.message);
        }
    });
    T("amount_zero_allowed", () => {
        const l = world(), c0 = l.total("stone");
        l.transform("stone", "object", "stone", "ruin", 0, "decay");
        l.source("magic", "stone", "object", 0, "spell");
        eq(l.total("stone"), c0, "zero changes nothing");
    });
    T("amount_overflow_rejected", () => {
        const MAX = Number.MAX_SAFE_INTEGER;
        const a = L.createLedger();
        a.register("stone", "strata", MAX);
        throwsCode(() => a.register("stone", "strata", 1), "E_OVERFLOW", "class key");
        throwsCode(() => a.register("rubble", "strata", 1), "E_OVERFLOW", "family mineral");
        a.register("water", "fluid", MAX - 2);
        a.seal();
        throwsCode(() => a.source("rain", "water", "fluid", 3, "storm"), "E_OVERFLOW", "source");
        a.source("rain", "water", "fluid", 2, "storm");
        eq(a.total("water"), MAX, "water at MAX");
        throwsCode(() => a.transform("water", "fluid", "water", "ice", MAX + 1, "freeze"), "E_AMOUNT", "beyond MAX is not an amount");
        const b = L.createLedger();
        b.register("au_metal", "item", MAX - 1);
        b.register("ag_metal", "item", 10);
        b.seal();
        throwsCode(() => b.recipe("alloy.electrum", Math.floor(MAX / 2) + 1, "smith"), "E_OVERFLOW", "recipe times x parts");
        // A composite key can pass MAX while its families stay below it (each holds half), so the key check is needed.
        const c = L.createLedger();
        c.register("electrum", "item", MAX - 1);
        throwsCode(() => c.register("electrum", "item", 2), "E_OVERFLOW", "electrum key beyond MAX");
    });
    T("composite_amounts_are_multiples", () => {
        const l = world();
        throwsCode(() => L.createLedger().register("electrum", "item", 3), "E_MULTIPLE", "register 3 electrum");
        throwsCode(() => l.transform("electrum", "item", "electrum", "object", 1, "build"), "E_MULTIPLE", "transform 1 electrum");
        throwsCode(() => l.sink("magic", "electrum", "item", 1, "spell"), "E_MULTIPLE", "sink 1 electrum");
        l.transform("electrum", "item", "electrum", "object", 4, "build");
        eq(l.familyTotal("au"), 50, "au unchanged by a form move");
    });

    //---- transforms ----------------------------------------------------------------------------------------------------
    T("transform_conserves_totals", () => {
        const l = world(), cs = l.checksum();
        l.transform("stone", "object", "stone", "ruin", 200, "decay:abandoned");
        eq(l.amount("stone", "object"), 300, "object after");
        eq(l.amount("stone", "ruin"), 200, "ruin after");
        eq(l.total("stone"), 10500, "class total unchanged");
        eq(l.familyTotal("mineral"), 10500, "family unchanged");
        ok(l.checksum() !== cs, "checksum changes");
        eq(l.check().ok, true, "internal check");
        const e = l.events().pop();
        same([e.kind, e.ref, e.from, e.to, e.amount, e.cause], ["transform", "decay", "stone|object", "stone|ruin", 200, "decay:abandoned"], "log entry");
    });
    T("transform_needs_a_table_row", () => {
        const l = world();
        const e = throwsCode(() => l.transform("soil", "strata", "stone", "strata", 1, "cheat:soil_to_stone"), "E_NO_ENTRY", "soil -> stone");
        ok(/cheat:soil_to_stone/.test(e.message), "the error names the cause");
        throwsCode(() => l.transform("stone", "strata", "stone", "strata", 1, "noop"), "E_NO_ENTRY", "a move onto itself");
    });
    T("transform_insufficient_is_atomic", () => {
        const l = world(), cs = l.checksum(), n = l.events().length;
        throwsCode(() => l.transform("stone", "object", "stone", "ruin", 501, "decay"), "E_INSUFFICIENT", "too much");
        eq(l.checksum(), cs, "no trace of the refused call");
        eq(l.events().length, n, "no log entry");
        throwsCode(() => l.transform("gem", "strata", "gem", "item", 31, "mine"), "E_INSUFFICIENT", "gem");
    });
    T("transform_ore_output_refused_at_call", () => {
        const l = world();
        throwsCode(() => l.transform("stone", "strata", "fe_ore", "strata", 1, "ecology:sprout"), "E_ORE_OUTPUT", "stone -> fe_ore");
        throwsCode(() => l.transform("cu_ore", "strata", "fe_ore", "strata", 1, "x"), "E_ORE_OUTPUT", "cu_ore -> fe_ore");
        throwsCode(() => l.transform("fe_metal", "item", "fe_ore", "item", 1, "x"), "E_ORE_OUTPUT", "fe_metal -> fe_ore");
        throwsCode(() => l.transform("fe_trace", "strata", "fe_ore", "strata", 0, "x"), "E_ORE_OUTPUT", "even 0 units");
    });
    T("transform_element_change_refused_at_call", () => {
        const l = world();
        throwsCode(() => l.transform("fe_metal", "item", "cu_trace", "strata", 1, "rust"), "E_FAMILY", "fe -> cu");
        throwsCode(() => l.transform("stone", "strata", "wood", "item", 1, "x"), "E_FAMILY", "mineral -> organic");
        throwsCode(() => l.transform("electrum", "item", "au_metal", "item", 2, "x"), "E_FAMILY", "electrum -> au by transform");
    });
    T("ore_moves_form_and_only_decreases", () => {
        const l = world(), ore = () => l.total("fe_ore");
        l.transform("fe_ore", "strata", "fe_ore", "item", 300, "mine");
        eq(ore(), 800, "mining keeps the ore total");
        eq(l.amount("fe_ore", "item"), 300, "ore item");
        l.transform("fe_ore", "item", "fe_metal", "item", 100, "smelt");
        eq(ore(), 700, "smelting lowers ore");
        eq(l.familyTotal("fe"), 1050, "smelting keeps Fe");
        l.sink("world-edge", "fe_ore", "item", 50, "trader:left_map");
        eq(ore(), 650, "a sink lowers ore");
        eq(l.familyTotal("fe"), 1000, "Fe lowered only by the sink");
        for (const n of ["magic", "world-edge", "debug-explicit"]) throwsCode(() => l.source(n, "fe_ore", "strata", 1, "respawn"), "E_ORE_OUTPUT", n + " ore source");
        throwsCode(() => l.transform("fe_ore", "item", "fe_ore", "strata", 1, "backfill"), "E_NO_ENTRY", "no ore row back into strata");
    });
    T("rust_keeps_element", () => {
        const l = world();
        l.transform("fe_metal", "item", "fe_trace", "strata", 30, "decay:rust");
        eq(l.familyTotal("fe"), 1050, "Fe total unchanged");
        eq(l.total("fe_ore"), 800, "ore total unchanged");
        eq(l.total("fe_trace"), 30, "trace");
        eq(l.total("fe_metal"), 170, "metal");
        l.transform("steel", "item", "fe_trace", "strata", 10, "decay:rust");
        eq(l.familyTotal("fe"), 1050, "steel rust keeps Fe");
        l.transform("cu_metal", "item", "cu_trace", "strata", 7, "decay:patina");
        eq(l.familyTotal("cu"), 500, "Cu total unchanged");
        l.transform("ag_metal", "item", "ag_trace", "strata", 3, "decay:tarnish");
        eq(l.familyTotal("ag"), 70, "Ag total unchanged");
        throwsCode(() => l.transform("au_metal", "item", "au_trace", "strata", 1, "rust"), "E_UNKNOWN_CLASS", "gold has no trace class");
        throwsCode(() => l.transform("fe_trace", "strata", "fe_metal", "item", 1, "unrust"), "E_NO_ENTRY", "trace does not turn back");
    });
    T("decay_chain_conserves_mass", () => {
        const l = world(), m = () => l.familyTotal("mineral");
        const steps = [["stone", "object", "stone", "ruin", 400], ["stone", "ruin", "rubble", "strata", 400], ["rubble", "strata", "soil", "strata", 150],
            ["rubble", "strata", "sediment", "strata", 250], ["soil", "strata", "sediment", "strata", 50], ["sediment", "strata", "soil", "strata", 20],
            ["sediment", "strata", "stone", "strata", 280]];
        for (const s of steps) { l.transform(s[0], s[1], s[2], s[3], s[4], "decay:" + s[0] + ">" + s[2]); eq(m(), 10500, "mineral after " + s.join(" ")); }
        eq(l.amount("stone", "strata"), 10280, "lithified back to rock");
        eq(l.total("rubble") + l.total("soil") + l.total("sediment"), 120, "what is still in the chain");
        eq(l.check().ok, true, "internal check");
    });
    T("decay_chain_skip_and_reverse_refused", () => {
        const l = world();
        l.transform("stone", "object", "stone", "ruin", 100, "decay");
        l.transform("stone", "ruin", "rubble", "strata", 50, "decay");
        for (const s of [["stone", "object", "soil", "strata"], ["stone", "ruin", "soil", "strata"], ["stone", "ruin", "sediment", "strata"],
            ["rubble", "strata", "stone", "strata"], ["soil", "strata", "rubble", "strata"], ["stone", "ruin", "stone", "object"], ["rubble", "strata", "stone", "ruin"]])
            throwsCode(() => l.transform(s[0], s[1], s[2], s[3], 1, "skip"), "E_NO_ENTRY", s.join(" "));
    });
    T("fire_leaves_ash_and_charcoal", () => {
        const l = world(), o = () => l.familyTotal("organic");
        const o0 = o();
        l.transform("wood", "object", "ash", "strata", 30, "fire:burnout");
        l.transform("wood", "object", "charcoal", "strata", 70, "fire:burnout");
        l.transform("biomass", "object", "ash", "strata", 90, "fire:wildfire");
        l.transform("charcoal", "strata", "ash", "strata", 10, "fire:reburn");
        eq(o(), o0, "organic mass unchanged");
        eq(l.total("ash"), 130, "ash");
        eq(l.total("charcoal"), 60, "charcoal");
    });
    T("water_freezes_and_thaws", () => {
        const l = world();
        l.transform("water", "fluid", "water", "ice", 300, "freeze");
        eq(l.amount("water", "ice"), 300, "ice");
        l.transform("water", "ice", "water", "fluid", 100, "thaw");
        eq(l.familyTotal("water"), 700, "water unchanged");
    });
    T("electrum_recipe_conserves_gold_and_silver", () => {
        const l = world();
        l.recipe("alloy.electrum", 10, "smith:alloy");
        eq(l.total("electrum"), 40, "electrum");
        eq(l.total("au_metal"), 30, "au_metal");
        eq(l.familyTotal("au"), 50, "au family");
        eq(l.familyTotal("ag"), 70, "ag family");
        l.recipe("part.electrum", 5, "smith:part");
        eq(l.total("electrum"), 30, "electrum after parting");
        eq(l.familyTotal("au"), 50, "au family after parting");
        const cs = l.checksum();
        throwsCode(() => l.recipe("alloy.electrum", 36, "smith"), "E_INSUFFICIENT", "not enough gold");
        eq(l.checksum(), cs, "no partial recipe");
        throwsCode(() => l.recipe("transmute", 1, "x"), "E_NO_ENTRY", "unknown recipe");
        throwsCode(() => l.recipe("toString", 1, "x"), "E_NO_ENTRY", "prototype name");
        l.recipe("alloy.electrum", 0, "smith:none");
        eq(l.total("electrum"), 30, "times 0");
        const e = l.events().pop();
        same([e.kind, e.ref, e.amount], ["recipe", "alloy.electrum", 0], "recipe log entry");
    });
    T("cause_required", () => {
        const l = world();
        for (const c of ["", undefined, null, 5, "x".repeat(201)]) {
            throwsCode(() => l.transform("stone", "object", "stone", "ruin", 1, c), "E_CAUSE", "transform cause " + show(c));
            throwsCode(() => l.source("magic", "stone", "object", 1, c), "E_CAUSE", "source cause " + show(c));
            throwsCode(() => l.sink("magic", "stone", "object", 1, c), "E_CAUSE", "sink cause " + show(c));
            throwsCode(() => l.recipe("alloy.electrum", 1, c), "E_CAUSE", "recipe cause " + show(c));
        }
    });

    //---- sources and sinks ---------------------------------------------------------------------------------------------
    T("source_undeclared_name_refused", () => {
        const l = world(), cs = l.checksum();
        for (const n of ["sprout", "", undefined, "toString", "constructor", "__proto__", "Magic"])
            throwsCode(() => l.source(n, "stone", "object", 1, "x"), "E_UNKNOWN_SOURCE", "source " + show(n));
        for (const n of ["nowhere", "hasOwnProperty", "constructor", "rain"])
            throwsCode(() => l.sink(n, "stone", "object", 1, "x"), "E_UNKNOWN_SINK", "sink " + show(n));
        throwsCode(() => l.source("evaporation", "water", "fluid", 1, "x"), "E_UNKNOWN_SOURCE", "a sink name is not a source");
        eq(l.checksum(), cs, "refusals leave no trace");
    });
    T("source_ore_refused_at_call", () => {
        const l = world();
        for (const m of METALS) for (const n of ["magic", "world-edge", "debug-explicit", "rain"])
            throwsCode(() => l.source(n, m + "_ore", "strata", 1, "respawn"), "E_ORE_OUTPUT", n + " " + m + "_ore");
    });
    T("source_finite_refused", () => {
        const l = world();
        for (const c of ["fe_metal", "steel", "cu_metal", "au_metal", "pt_metal", "fe_trace", "gem"])
            throwsCode(() => l.source("magic", c, l.describe().classes[c].forms[0], 1, "spell:creation"), "E_FINITE_SOURCE", "magic " + c);
        throwsCode(() => l.source("magic", "electrum", "item", 2, "spell:creation"), "E_FINITE_SOURCE", "magic electrum");
    });
    T("source_sink_scope", () => {
        const l = world();
        throwsCode(() => l.source("rain", "soil", "strata", 1, "storm"), "E_SOURCE_SCOPE", "rain soil");
        throwsCode(() => l.source("rain", "water", "item", 1, "storm"), "E_SOURCE_SCOPE", "rain into a jug");
        throwsCode(() => l.sink("evaporation", "stone", "strata", 1, "sun"), "E_SINK_SCOPE", "evaporating stone");
        throwsCode(() => l.sink("evaporation", "water", "ice", 1, "sun"), "E_SINK_SCOPE", "evaporation of ice is not declared");
    });
    T("magic_source_and_sink_logged_with_cause", () => {
        const l = world();
        l.source("magic", "stone", "object", 25, "spell:wall_of_stone#7");
        eq(l.total("stone"), 10525, "stone after wall_of_stone");
        let e = l.events().pop();
        same([e.kind, e.ref, e.from, e.to, e.amount, e.cause], ["source", "magic", "", "stone|object", 25, "spell:wall_of_stone#7"], "source log entry");
        l.sink("magic", "water", "fluid", 5, "spell:destroy_water#8");
        e = l.events().pop();
        same([e.kind, e.ref, e.from, e.to, e.amount, e.cause], ["sink", "magic", "water|fluid", "", 5, "spell:destroy_water#8"], "sink log entry");
        const iv = l.interval();
        same(iv.summary["source:magic:>stone|object"], [1, 25], "interval summary of the magic source");
        same(iv.summary["sink:magic:water|fluid>"], [1, 5], "interval summary of the magic sink");
        const fam = iv.families.find(r => r.family === "mineral");
        same([fam.start, fam.end, fam.sources, fam.sinks], [10500, 10525, 25, 0], "mineral interval row");
        eq(l.check().ok, true, "closure");
        l.source("rain", "water", "fluid", 11, "weather:rain");
        l.sink("evaporation", "water", "fluid", 4, "weather:sun");
        eq(l.familyTotal("water"), 702, "water = 700 - 5 + 11 - 4");
    });
    T("sink_can_lower_ore_and_is_atomic", () => {
        const l = world();
        l.sink("world-edge", "fe_ore", "strata", 10, "river:carried_off");
        eq(l.total("fe_ore"), 790, "ore lowered");
        const cs = l.checksum();
        throwsCode(() => l.sink("magic", "gem", "strata", 31, "spell"), "E_INSUFFICIENT", "too much");
        eq(l.checksum(), cs, "no trace");
    });

    //---- audit ---------------------------------------------------------------------------------------------------------
    T("audit_clean_recount", () => {
        const l = world(), rep = l.audit(recountOf(l));
        eq(rep.ok, true, "ok");
        eq(rep.diffs.length + rep.families.length + rep.unknown.length, 0, "no diffs");
        eq(rep.checked, Object.values(l.describe().classes).reduce((a, c) => a + c.forms.length, 0), "every (class, form) checked");
        eq(l.assertBalanced(recountOf(l)).ok, true, "assertBalanced returns the report");
        eq(l.assertBalanced().ok, true, "assertBalanced without a recount");
    });
    T("audit_detects_every_class_and_form", () => {
        const l = world(), d = l.describe();
        for (const c of Object.keys(d.classes)) {
            const den = Object.values(d.classes[c].composition).reduce((a, b) => a + b, 0);
            for (const f of d.classes[c].forms) {
                const r = recountOf(l);
                r[c][f] += den;
                const rep = l.audit(r);
                eq(rep.ok, false, "audit ok with " + c + "|" + f + " off");
                eq(rep.diffs.length, 1, "diff count for " + c + "|" + f);
                same([rep.diffs[0].cls, rep.diffs[0].form, rep.diffs[0].delta], [c, f, den], "diff for " + c + "|" + f);
                same(rep.families.map(x => x.family).sort(), Object.keys(d.classes[c].composition).sort(), "family diffs for " + c);
                const e = throwsCode(() => l.assertBalanced(r), "E_UNBALANCED", "assertBalanced " + c + "|" + f);
                ok(e.message.indexOf(c + "|" + f) >= 0, "message names " + c + "|" + f + ": " + e.message.slice(0, 120));
            }
        }
    });
    T("audit_detects_form_shift", () => {
        const l = world(), r = recountOf(l);
        r.stone.object -= 5;
        r.stone.ruin += 5;
        const rep = l.audit(r);
        eq(rep.ok, false, "ok");
        same(rep.diffs.map(x => x.form).sort(), ["object", "ruin"], "form diffs");
        eq(rep.families.length, 0, "no family diff for a form shift");
    });
    T("audit_class_level_recount", () => {
        const l = world(), r = JSON.parse(JSON.stringify(l.totals().classes));
        eq(l.audit(r).ok, true, "class-level recount");
        r.rubble += 1;
        const rep = l.audit(r);
        same([rep.ok, rep.diffs.length, rep.diffs[0].cls, rep.diffs[0].form], [false, 1, "rubble", null], "class-level diff");
        r.rubble -= 1;
        r.electrum += 1;
        ok(l.audit(r).diffs.some(x => x.cls === "electrum" && x.note === "E_MULTIPLE"), "odd electrum count flagged");
    });
    T("audit_missing_counts_as_zero_and_unknown_keys", () => {
        const l = world();
        const rep = l.audit({});
        eq(rep.ok, false, "empty recount");
        eq(rep.diffs.length, 17, "every registered (class, form) differs");
        const u = l.audit(Object.assign(recountOf(l), { unobtainium: 5 }));
        same([u.ok, u.unknown], [false, ["unobtainium"]], "unknown class");
        const r = recountOf(l);
        r.stone.fluid = 3;
        same(l.audit(r).unknown, ["stone|fluid"], "unknown form");
    });
    T("audit_rejects_bad_recount_values", () => {
        const l = world();
        throwsCode(() => l.audit({ stone: { strata: 1.5 } }), "E_AMOUNT", "float count");
        throwsCode(() => l.audit({ stone: -1 }), "E_AMOUNT", "negative class count");
        throwsCode(() => l.audit({ stone: "5" }), "E_RECOUNT", "string count");
        throwsCode(() => l.audit("x"), "E_RECOUNT", "not an object");
        throwsCode(() => l.audit(null), "E_RECOUNT", "null");
    });

    //---- interval identity ---------------------------------------------------------------------------------------------
    T("interval_identity_and_close", () => {
        const l = world();
        l.transform("stone", "object", "stone", "ruin", 40, "decay");
        l.transform("stone", "ruin", "rubble", "strata", 30, "decay");
        l.source("magic", "stone", "object", 9, "spell");
        l.sink("world-edge", "rubble", "strata", 4, "landslide:off_map");
        l.source("rain", "water", "fluid", 6, "rain");
        const iv = l.interval();
        eq(iv.ok, true, "identity holds");
        const m = iv.families.find(r => r.family === "mineral");
        same([m.start, m.end, m.sources, m.sinks, m.end - m.start], [10500, 10505, 9, 4, 5], "mineral delta = sources - sinks");
        const st = iv.classes.find(r => r.cls === "stone"), ru = iv.classes.find(r => r.cls === "rubble");
        same([st.transfersIn, st.transfersOut, st.sources, st.end - st.start], [40, 70, 9, -21], "stone class row");
        same([ru.transfersIn, ru.sinks, ru.end - ru.start], [30, 4, 26], "rubble class row");
        eq(iv.events, 5, "events in the interval");
        const closed = l.closeInterval();
        eq(closed.index, 1, "first interval index");
        const next = l.interval();
        same([next.index, next.events, next.families.find(r => r.family === "mineral").start, Object.keys(next.summary).length], [2, 0, 10505, 0], "next interval starts clean");
    });

    //---- snapshot, restore, checksum -----------------------------------------------------------------------------------
    function busy(l) {
        l.transform("stone", "object", "stone", "ruin", 40, "decay");
        l.transform("fe_metal", "item", "fe_trace", "strata", 5, "rust");
        l.recipe("alloy.electrum", 3, "smith");
        l.source("magic", "stone", "object", 9, "spell");
        l.sink("evaporation", "water", "fluid", 6, "sun");
        return l;
    }
    T("snapshot_is_json_safe", () => {
        const s = busy(world()).snapshot(), j = JSON.stringify(s);
        eq(stable(JSON.parse(j)), stable(s), "JSON round trip");
        ok(!/NaN|Infinity|undefined/.test(j), "no non-JSON values");
    });
    T("restore_round_trip_and_continue", () => {
        const a = busy(world()), b = L.createLedger();
        b.restore(JSON.parse(JSON.stringify(a.snapshot())));
        eq(b.checksum(), a.checksum(), "checksum after restore");
        same(b.totals(), a.totals(), "totals after restore");
        same(b.events(), a.events(), "log after restore");
        eq(b.isSealed(), true, "sealed after restore");
        for (const l of [a, b]) { busy(l); l.closeInterval(); busy(l); }
        eq(b.checksum(), a.checksum(), "checksum after the same calls on both");
        eq(b.check().ok, true, "restored ledger balances");
    });
    T("restore_ignores_key_order", () => {
        const a = busy(world()), s = JSON.parse(JSON.stringify(a.snapshot()));
        const rev = o => { const r = {}; for (const k of Object.keys(o).reverse()) r[k] = o[k]; return r; };
        s.amounts = rev(s.amounts);
        s.interval.src = rev(s.interval.src);
        s.interval.startCls = rev(s.interval.startCls);
        const b = L.createLedger();
        b.restore(rev(s));
        eq(b.checksum(), a.checksum(), "checksum after restoring reversed keys");
    });
    T("restore_rejects_tampering", () => {
        const a = busy(world());
        const tampers = [
            ["float amount", s => { s.amounts["stone|strata"] += 0.5; }],
            ["negative amount", s => { s.amounts["gem|item"] = -1; }],
            // the same, with the class and family totals kept, so only the amount check can see it
            ["float pair", s => { s.amounts["stone|strata"] += 0.5; s.amounts["stone|object"] -= 0.5; }],
            ["negative pair", s => { s.amounts["gem|item"] = -1; s.amounts["gem|strata"] += 1; }],
            ["unknown key", s => { s.amounts["mithral|item"] = 1; }],
            ["missing key", s => { delete s.amounts["stone|strata"]; }],
            ["odd electrum", s => { s.amounts["electrum|item"] += 1; }],
            ["config", s => { s.config = "00000000"; }],
            ["schema", s => { s.schema = 2; }],
            ["closure: amount", s => { s.amounts["stone|strata"] += 1; s.interval.startFam.mineral += 1; s.interval.startCls.stone += 1; }],
            ["closure: base", s => { s.base.mineral += 1; }],
            ["closure: life", s => { s.life.src["magic|stone"] += 1; s.interval.src.stone += 1; }],
            ["interval family identity", s => { s.interval.startFam.mineral += 1; }],
            ["interval class identity", s => { s.interval.startCls.stone += 1; }],
            ["life key", s => { s.life.src["sprout|stone"] = 1; }],
            ["summary", s => { s.interval.summary.x = [1]; }],
            ["log too long", s => { while (s.log.length <= 256) s.log.push(s.log[0]); }],
            ["log entry", s => { s.log[0].extra = 1; }],
            ["unsealed with flows", s => { s.sealed = false; s.base = null; s.interval = null; }],
            ["extra top-level key", s => { s.more = 1; }]
        ];
        for (const [name, t] of tampers) {
            const s = JSON.parse(JSON.stringify(a.snapshot()));
            t(s);
            const b = world(), cs = b.checksum();
            throwsCode(() => b.restore(s), "E_SNAPSHOT", "tamper " + name);
            eq(b.checksum(), cs, "a refused restore leaves the ledger as it was (" + name + ")");
        }
        const other = cfg();
        other.logLimit = 128;
        throwsCode(() => L.createLedger(other).restore(JSON.parse(JSON.stringify(a.snapshot()))), "E_SNAPSHOT", "another config");
    });
    T("restore_unsealed_snapshot", () => {
        const a = L.createLedger();
        a.register("stone", "strata", 50);
        const b = L.createLedger();
        b.restore(JSON.parse(JSON.stringify(a.snapshot())));
        eq(b.isSealed(), false, "unsealed");
        b.register("stone", "object", 5);
        b.seal();
        eq(b.familyTotal("mineral"), 55, "register and seal after restore");
    });
    T("checksum_deterministic_and_pure", () => {
        const a = busy(world()), b = busy(world());
        eq(a.checksum(), b.checksum(), "same calls, same checksum");
        const s1 = stable(a.snapshot());
        eq(a.checksum(), a.checksum(), "checksum twice");
        eq(stable(a.snapshot()), s1, "checksum does not change state");
        ok(/^[0-9a-f]{8}$/.test(a.checksum()), "8 hex digits: " + a.checksum());
    });
    // logLimit 1 plus a final padding call makes the log and seq identical, so only the amounts differ.
    function padded(pairs) {
        const c = cfg();
        c.logLimit = 1;
        const l = L.createLedger(c);
        for (const p of pairs) l.register(p[0], p[1], p[2], "w");
        l.register("stone", "strata", 0, "pad");
        return l;
    }
    T("checksum_sees_every_class", () => {
        const d = L.createLedger().describe();
        for (const c of Object.keys(d.classes)) {
            const den = Object.values(d.classes[c].composition).reduce((a, b) => a + b, 0);
            for (const f of d.classes[c].forms) {
                const x = padded([[c, f, den]]).checksum(), y = padded([[c, f, 2 * den]]).checksum(), z = padded([[c, f, den]]).checksum();
                ok(x !== y, "checksum ignores " + c + "|" + f);
                eq(x, z, "checksum of equal ledgers");
            }
        }
    });
    T("checksum_sees_which_class_holds_what", () => {
        const x = padded([["stone", "strata", 5], ["rubble", "strata", 3]]).checksum();
        const y = padded([["stone", "strata", 3], ["rubble", "strata", 5]]).checksum();
        ok(x !== y, "swapped amounts give the same checksum");
        const u = padded([["water", "fluid", 12], ["water", "ice", 21]]).checksum();
        const v = padded([["water", "fluid", 21], ["water", "ice", 12]]).checksum();
        ok(u !== v, "swapped forms give the same checksum");
    });

    //---- log -----------------------------------------------------------------------------------------------------------
    T("log_is_bounded", () => {
        const c = cfg();
        c.logLimit = 16;
        const l = L.createLedger(c);
        l.register("water", "fluid", 10);
        l.seal();
        for (let i = 0; i < 2000; i++) l.transform("water", i % 2 ? "ice" : "fluid", "water", i % 2 ? "fluid" : "ice", 3, "cycle#" + i);
        const ev = l.events();
        eq(ev.length, 16, "events kept");
        same([ev[0].seq, ev[15].seq, ev[15].cause], [1986, 2001, "cycle#1999"], "the newest 16, oldest first");
        eq(l.snapshot().log.length, 16, "snapshot log");
        eq(Object.keys(l.interval().summary).length, 2, "summary keyed by row, not by cause");
        eq(l.interval().events, 2000, "interval counts every event");
    });

    return checks;
}

function runSuite(mod) {
    const results = [];
    for (const [name, fn] of suite(mod.L, mod.D)) {
        try { fn(); results.push([name, true, ""]); } catch (e) { results.push([name, false, String(e && e.message || e).split("\n")[0].slice(0, 300)]); }
    }
    return results;
}

//=======================================================================================================================
// Mutants: [name, file, find, replace]. Each find must occur exactly once in the real text.

const MUTANTS = [
    ["transform_drops_1_unit", "ledger.js", "const moves = [[kf, -amount], [kt, amount]];", "const moves = [[kf, -amount], [kt, amount - 1]];"],
    ["transform_adds_1_unit", "ledger.js", "const moves = [[kf, -amount], [kt, amount]];", "const moves = [[kf, -amount], [kt, amount + 1]];"],
    ["source_skips_name_check", "ledger.js", '!has(C.sources, name)) fail("E_UNKNOWN_SOURCE"', 'false) fail("E_UNKNOWN_SOURCE"'],
    ["sink_skips_name_check", "ledger.js", '!has(C.sinks, name)) fail("E_UNKNOWN_SINK"', 'false) fail("E_UNKNOWN_SINK"'],
    ["ore_output_allowed_at_load", "ledger.js", "if (classes[t.to].ore && t.to !== t.from)", "if (false && classes[t.to].ore && t.to !== t.from)"],
    ["ore_output_allowed_at_call", "ledger.js", "if (td.ore && toCls !== fromCls)", "if (false)"],
    ["ore_source_allowed_at_call", "ledger.js", 'if (cd.ore) fail("E_ORE_OUTPUT", where + ": " + cls + " is an ore class; no source', 'if (false) fail("E_ORE_OUTPUT", where + ": " + cls + " is an ore class; no source'],
    ["ore_source_allowed_at_load", "ledger.js", 'if (kind === "source" && cd.ore) {', "if (false) {"],
    ["ore_recipe_output_allowed", "ledger.js", 'if (side === "outputs" && cd.ore)', "if (false)"],
    ["rust_changes_element_in_defaults", "ledger_defaults.js", 'for (const m of RUSTING) ROWS.push(["rust", m + "_metal", ["item", "object", "ruin"], m + "_trace", ["strata"]]);',
        'for (const m of RUSTING) ROWS.push(["rust", m + "_metal", ["item", "object", "ruin"], (m === "fe" ? "cu" : m) + "_trace", ["strata"]]);'],
    ["element_check_removed_at_load", "ledger.js", "if (classes[t.from].compKey !== classes[t.to].compKey)", "if (false)"],
    ["element_check_removed_at_call", "ledger.js", "if (fd.compKey !== td.compKey)", "if (false)"],
    ["recipe_balance_unchecked", "ledger.js", 'if (bal[f] !== 0) fail("E_FAMILY"', 'if (false) fail("E_FAMILY"'],
    ["finite_source_allowed_at_call", "ledger.js", "if (cd.finite && !sd.allowFinite)", "if (false)"],
    ["finite_source_allowed_at_load", "ledger.js", 'if (kind === "source" && cd.finite && !allowFinite) {', "if (false) {"],
    ["seal_not_enforced_for_register", "ledger.js", 'if (S.sealed) fail("E_SEALED", where', 'if (false) fail("E_SEALED", where'],
    ["seal_not_enforced_for_calls", "ledger.js", "function needSealed(where) { if (!S.sealed)", "function needSealed(where) { if (false)"],
    ["float_accepted", "ledger.js", 'function isAmount(n) { return typeof n === "number" && Number.isSafeInteger(n) && n >= 0; }', 'function isAmount(n) { return typeof n === "number" && n >= 0; }'],
    ["negative_accepted", "ledger.js", 'function isAmount(n) { return typeof n === "number" && Number.isSafeInteger(n) && n >= 0; }', 'function isAmount(n) { return typeof n === "number" && Number.isSafeInteger(n); }'],
    ["overflow_unchecked", "ledger.js", 'if (v > MAX) fail("E_OVERFLOW", where + ": " + k', 'if (false) fail("E_OVERFLOW", where + ": " + k'],
    ["family_overflow_unchecked", "ledger.js", 'if (t > MAX) fail("E_OVERFLOW", where + ": family "', 'if (false) fail("E_OVERFLOW", where + ": family "'],
    ["insufficient_unchecked", "ledger.js", 'if (v < 0) fail("E_INSUFFICIENT"', 'if (false) fail("E_INSUFFICIENT"'],
    ["composite_multiple_unchecked", "ledger.js", 'if (n % den !== 0) fail("E_MULTIPLE"', 'if (false) fail("E_MULTIPLE"'],
    ["cause_unchecked", "ledger.js", 'if (typeof cause !== "string" || !cause.length || cause.length > CAUSE_MAX)', "if (false)"],
    ["audit_ignores_a_class", "ledger.js", "        let checked = 0;\n        for (const c of C.clsNames) {\n", "        let checked = 0;\n        for (const c of C.clsNames) {\n            if (c === \"wood\") { counted[c] = clsTotalIn(S.amt, c); continue; }\n"],
    ["audit_ignores_families", "ledger.js", "if (act !== exp) famDiffs.push", "if (false) famDiffs.push"],
    ["closure_check_disabled", "ledger.js", "if (now !== st.base[f] + src - snk)", "if (false)"],
    ["interval_family_identity_disabled", "ledger.js", "const good = end - start === src - snk;", "const good = true;"],
    ["interval_class_identity_disabled", "ledger.js", "const good = end - start === iv.src[c] - iv.snk[c] + iv.tin[c] - iv.tout[c];", "const good = true;"],
    ["checksum_ignores_key_order", "ledger.js", "const keys = Object.keys(v).sort();", "const keys = Object.keys(v);"],
    ["checksum_commutative", "ledger.js", "        h ^= c & 0xff;\n        h = Math.imul(h, 0x01000193) >>> 0;\n        h ^= c >>> 8;\n        h = Math.imul(h, 0x01000193) >>> 0;\n", "        h = (h + c) >>> 0;\n"],
    ["checksum_ignores_a_class", "ledger.js", "function checksum() { return fnv1a(canon(snapshot())); }", 'function checksum() { const s = snapshot(); delete s.amounts["gem|strata"]; return fnv1a(canon(s)); }'],
    ["restore_accepts_bad_amounts", "ledger.js", 'if (!isAmount(o[k])) bad(what', "if (false) bad(what"],
    ["restore_skips_closure", "ledger.js", "if (cl.length) bad(\"closure broken", "if (false) bad(\"closure broken"],
    ["log_unbounded", "ledger.js", "if (S.log.length < C.logLimit) S.log.push(rec);", "if (true) S.log.push(rec);"],
    ["refused_call_leaves_trace", "ledger.js", "        const next = {};\n        for (const ch of changes) {", "        S.seq++;\n        const next = {};\n        for (const ch of changes) {"],
    ["defaults_ore_sprout_row", "ledger_defaults.js", '["solidify", "lava", ["fluid"], "stone", ["strata"]],', '["solidify", "lava", ["fluid"], "stone", ["strata"]],\n    ["sprout", "stone", ["strata"], "fe_ore", ["object"]],'],
    ["defaults_decay_skip_row", "ledger_defaults.js", '["solidify", "lava", ["fluid"], "stone", ["strata"]],', '["solidify", "lava", ["fluid"], "stone", ["strata"]],\n    ["compact", "rubble", ["strata"], "stone", ["strata"]],'],
    ["defaults_magic_marked_confirmed", "ledger_defaults.js", 'classes: "*", forms: "*", allowFinite: false, ownerConfirmed: false,\n        authority: "PM default for DEC-018', 'classes: "*", forms: "*", allowFinite: false, ownerConfirmed: true,\n        authority: "PM default for DEC-018'],
    ["defaults_magic_allows_finite", "ledger_defaults.js", 'classes: "*", forms: "*", allowFinite: false, ownerConfirmed: false,\n        authority: "PM default for DEC-018', 'classes: "*", forms: "*", allowFinite: true, ownerConfirmed: false,\n        authority: "PM default for DEC-018'],
    ["defaults_not_frozen", "ledger_defaults.js", "module.exports = deepFreeze({", "module.exports = ({"],
    ["hidden_math_random_caught_dynamically", "ledger.js", "function createLedger(config) {\n", 'function createLedger(config) {\n    Reflect.get(Reflect.getPrototypeOf(function () {}), "constr" + "uctor")("return Ma" + "th.ran" + "dom()")();\n']
];

//=======================================================================================================================

let passed = 0, failed = 0;
function report(name, good, detail) {
    if (good) { passed++; if (!QUIET) console.log("PASS " + name + (detail ? " (" + detail + ")" : "")); }
    else { failed++; console.log("FAIL " + name + (detail ? ": " + detail : "")); }
}
function count(hay, needle) { let n = 0, i = 0; while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; } return n; }

const t0 = process.hrtime.bigint();
console.log("WG.65.15 ledger tests; node " + process.version + "; files: " + LEDGER_FILES.map(f => "game/js/sim/" + f).join(", "));

// 1. Unit checks on the real module, loaded into the bare context.
let real;
try { real = loadLedger(); } catch (e) { report("load_in_bare_vm_context", false, e.message); }
if (real) {
    report("load_in_bare_vm_context", true, "ECMAScript built-ins only; Math.random throws; Date removed");
    const probe = vm.runInContext('[typeof window, typeof document, typeof process, typeof require, typeof global, typeof self, typeof setTimeout, typeof console, typeof Date, (function(){ try { Math.random(); return "returned"; } catch (e) { return "threw"; } })()].join(",")', real.ctx);
    report("purity_dynamic_context_is_bare", probe === "undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,threw", probe);
    const results = runSuite(real);
    for (const r of results) report(r[0], r[1], r[1] ? "" : r[2]);
}

// 2. Static purity scan of every ledger* file, and of mutants of it.
for (const f of LEDGER_FILES) {
    const v = purityViolations(REAL[f]);
    report("purity_static_" + f.replace(/\W/g, "_"), v.length === 0, v.length ? v.slice(0, 5).join("; ") : "no ADR-003 §2.3 identifier, only ./ledger* requires, Math within §10.4");
}
{
    const clean = REAL["ledger.js"];
    const probes = [
        ["window", "\nwindow.x = 1;\n"],
        ["math_random", "\nconst r = Math.random();\n"],
        ["math_random_computed", '\nconst r = Math["random"]();\n'],
        ["date", "\nconst t = Date.now();\n"],
        ["require_fs", '\nconst fs = require("fs");\n'],
        ["global_in_template", "\nconst s = `${process.pid}`;\n"],
        ["math_sin", "\nconst s = Math.sin(1);\n"],
        ["rmmz_global", "\nconst m = $gameMap;\n"],
        ["facade", "\nconst u = UF.World;\n"],
        ["function_constructor", '\nconst g = Function("return this")();\n']
    ];
    for (const [name, add] of probes) {
        const v = purityViolations(clean + add);
        report("purity_mutant_" + name + "_detected", v.length > 0, v.length ? v[0] : "the static scan missed it");
    }
    const quiet = purityViolations(clean + '\n// window Date process Math.random()\nconst s1 = "window.Date process";\nconst s2 = `Math.random() ${1 + 2}`;\nconst re = /window/;\n');
    report("purity_static_ignores_comments_strings_regex", quiet.length === 0, quiet.length ? quiet.join("; ") : "names inside comments, strings, template text and a regex are not flagged");
}

// 3. Mutants: each must make at least one unit check fail (or fail to load).
if (real && failed === 0) {
    for (const [name, file, find, repl] of MUTANTS) {
        const n = count(REAL[file], find);
        if (n !== 1) { report("mutant_" + name + "_killed", false, "the find text occurs " + n + " times in " + file); continue; }
        const text = REAL[file].replace(find, () => repl);
        let res;
        try { res = runSuite(loadLedger({ [file]: text })); } catch (e) { report("mutant_" + name + "_killed", true, "module failed to load: " + String(e.message).slice(0, 100)); continue; }
        const dead = res.filter(r => !r[1]);
        let extra = "";
        if (name === "hidden_math_random_caught_dynamically") extra = "; static scan of the mutant: " + (purityViolations(text).length ? "flagged" : "clean, so only the bare vm context catches it");
        report("mutant_" + name + "_killed", dead.length > 0, dead.length ? dead.length + " check(s) fail, e.g. " + dead.slice(0, 3).map(r => r[0]).join(", ") + (dead[0] ? " [" + dead[0][2].slice(0, 90) + "]" : "") + extra : "no check failed: the mutant SURVIVED");
    }
} else if (real) {
    console.log("SKIP mutants: the unit checks must pass on the real module first");
    failed++;
}

const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log("mutants: " + MUTANTS.length + "; run time " + ms.toFixed(0) + " ms");
console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
