"use strict";
// SIM.40.00 tests for the material catalogue. Node only. One PASS or FAIL line per check.
//   node tools/sim/test_materials.js
// Exit 0 only when every check passes. Mutants are applied to in-memory copies. Files on disk are not edited.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const FIX = path.join(__dirname, "fixtures", "materials");
let passed = 0, failed = 0;
function check(name, ok, why) {
    if (ok) { passed++; console.log("PASS " + name); }
    else { failed++; console.log("FAIL " + name + (why ? ": " + why : "")); }
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

const catalogue = readJson(path.join(ROOT, "game", "data", "sim", "materials.json"));
const masses = readJson(path.join(ROOT, "game", "data", "sim", "mass_tables.json"));
const interactions = readJson(path.join(ROOT, "game", "data", "sim", "interactions.json"));
const ledger = require(path.join(ROOT, "game", "js", "sim", "ledger_defaults.js"));
const live = require(path.join(ROOT, "game", "data", "DEUS_WorldCatalog.json"));
const SRC = fs.readFileSync(path.join(ROOT, "game", "js", "sim", "materials.js"), "utf8").replace(/\r\n/g, "\n");

function loadBare(src) {
    const ctx = vm.createContext({});
    vm.runInContext("Math.random = function () { throw new Error('RANDOM'); };", ctx);
    const module = { exports: {} };
    const fn = vm.runInContext("(function (module, exports) {\n" + src + "\n})", ctx, { filename: "materials.js" });
    fn(module, module.exports);
    return module.exports;
}
const M = loadBare(SRC);

function bag(over) {
    return {
        catalogue: over && over.catalogue ? over.catalogue : clone(catalogue),
        masses: over && over.masses ? over.masses : clone(masses),
        interactions: over && over.interactions ? over.interactions : clone(interactions)
    };
}
function errsOf(data) { return M.validate(data, ledger); }
function hasCode(list, code) {
    const prefix = code + ":";
    for (let i = 0; i < list.length; i++) if (list[i].indexOf(prefix) === 0) return true;
    return false;
}
function dig(root, path) {
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const idm = /^([^[]+)\[id=([^\]]+)\]$/.exec(p);
        if (idm) cur = cur[idm[1]].filter(function (row) { return row.id === idm[2]; })[0];
        else if (/^\d+$/.test(p)) cur = cur[Number(p)];
        else cur = cur[p];
    }
    return cur;
}
function parentOf(root, path) {
    const parts = path.split(".");
    const last = parts.pop();
    return { parent: parts.length ? dig(root, parts.join(".")) : root, key: last };
}
function applyCase(spec) {
    const data = bag();
    const steps = spec.steps || [];
    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const at = parentOf(data, s.path);
        if (s.op === "delete") delete at.parent[at.key];
        else if (s.op === "push") at.parent[at.key].push(s.value);
        else at.parent[at.key] = s.value;
    }
    return data;
}

function codeOnly(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/.*$/gm, " ")
        .replace(/"(?:\\.|[^"\\])*"/g, "\"\"")
        .replace(/'(?:\\.|[^'\\])*'/g, "''");
}
function purity(src) {
    const code = codeOnly(src);
    const bad = [];
    if (/\b(window|document|globalThis|process|require|console|Date|fetch|setTimeout|setInterval|nw|XMLHttpRequest|eval|Function|Buffer|localStorage)\b/.test(code)) bad.push("E_HOST");
    if (/\b(LAYER_COUNT|N_LAYERS|LAYERS)\b/.test(code)) bad.push("E_LAYER_COUNT");
    if (/\bSTRATA_FT\b/.test(code)) bad.push("E_ONE_FT");
    if (/Math\.random/.test(code)) bad.push("E_RANDOM");
    return bad;
}
function postingSum(ps) {
    let t = 0;
    for (let i = 0; i < ps.length; i++) t += (ps[i].mu || 0) + (ps[i].unmappedMu || 0);
    return t;
}

const clean = bag();
const cleanErrs = errsOf(clean);
check("clean_validate", cleanErrs.length === 0, cleanErrs.slice(0, 8).join(" | "));

const api = M.createMaterials(clean);
const api2 = M.createMaterials(bag());
check("determinism_checksum", api.checksum() === api2.checksum() && api.checksum() === M.createMaterials(clone(clean)).checksum(), api.checksum());

check("purity_clean", purity(SRC).length === 0, purity(SRC).join(","));
check("mutant_layer_count_killed", purity(SRC + "\nconst LAYER_COUNT = 32;\n").indexOf("E_LAYER_COUNT") >= 0);
check("mutant_one_ft_killed", purity(SRC + "\nconst STRATA_FT = 1;\n").indexOf("E_ONE_FT") >= 0);
check("mutant_host_killed", purity(SRC + "\nwindow.DEUS = 1;\n").indexOf("E_HOST") >= 0);
check("mutant_random_killed", purity(SRC + "\nMath.random();\n").indexOf("E_RANDOM") >= 0);

let oreLeak = 0, massLeak = 0, bomLeak = 0, matter = 0;
const oreNames = {};
Object.keys(ledger.classes).forEach(function (c) { if (ledger.classes[c].ore) oreNames[c] = 1; });
function oreBad(ps, source) {
    if (!ps) return false;
    for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (p.class && oreNames[p.class]) {
            const have = source && source[p.class] ? source[p.class] : 0;
            if (!(p.sameClass === true && have >= p.mu)) return true;
        }
    }
    return false;
}
catalogue.materials.forEach(function (m) {
    if (typeof m.massPerSlice !== "number" || m.massless) return;
    matter++;
    const y = m.yield && m.yield.postings;
    const c = m.collapse && m.collapse.postings;
    if (!y || !c || postingSum(y) !== m.massPerSlice || postingSum(c) !== m.massPerSlice) massLeak++;
    const src = {};
    if (m.ledger && m.ledger.class && oreNames[m.ledger.class]) src[m.ledger.class] = m.massPerSlice;
    if (oreBad(y, src) || oreBad(c, src)) oreLeak++;
    if (m.reclaim && m.reclaim.ledgerClass && oreNames[m.reclaim.ledgerClass]) oreLeak++;
    if (m.decay && m.decay.outputClass && oreNames[m.decay.outputClass]) oreLeak++;
    if (m.bill && m.bill.lines) {
        let s = 0;
        m.bill.lines.forEach(function (ln) { s += ln.mu; });
        if (s !== m.massPerSlice) bomLeak++;
    }
});
Object.keys(masses.objects).forEach(function (id) {
    const o = masses.objects[id];
    if (o.massless) return;
    const src = {};
    (o.lines || []).forEach(function (ln) { if (oreNames[ln.class]) src[ln.class] = (src[ln.class] || 0) + ln.mu; });
    if (!o.yield || !o.collapse || postingSum(o.yield.postings) !== o.massMu || postingSum(o.collapse.postings) !== o.massMu) massLeak++;
    if (oreBad(o.yield.postings, src) || oreBad(o.collapse.postings, src)) oreLeak++;
    if (o.bill) {
        let s = 0;
        o.bill.forEach(function (ln) { s += ln.mu; if (ln.count * masses.items[ln.item].massMu !== ln.mu) bomLeak++; });
        if (s !== o.massMu) bomLeak++;
    }
});
check("slice_mass_conserved", massLeak === 0 && matter > 0, "leaks " + massLeak + " matter " + matter);
check("ore_not_emitted", oreLeak === 0, "leaks " + oreLeak);
check("bills_sum", bomLeak === 0, "leaks " + bomLeak);

const liveItems = live.items.types.map(function (i) { return i.id; }).sort();
const liveObjects = live.objects.map(function (o) { return o.id; }).sort();
check("catalog_items_covered", JSON.stringify(liveItems) === JSON.stringify(masses.catalogIndex.items.slice().sort()));
check("catalog_objects_covered", JSON.stringify(liveObjects) === JSON.stringify(masses.catalogIndex.objects.slice().sort()));

check("mu_unconfirmed", catalogue.mu.status === "PM_DEFAULT_UNCONFIRMED" && catalogue.mu.confirmed === false && catalogue.mu.proposalMuPerKg === 1000);
check("calendar_open", catalogue.calendar.status === "OWNER_OPEN" && catalogue.calendar.dpy == null && catalogue.calendar.tickHz == null);
check("no_save_migration", catalogue.geometry.legacyHalfSlice.implemented === false && catalogue.exemption.implemented === false);
check("no_layer_count_field", catalogue.geometry.layerCount == null);

check("granite_slice", api.massOf("granite", "strata", 1) === 3894000);
check("granite_by_strata_id", api.material(32).id === "granite");
check("stone_item", api.massOf("stone", "item", 2) === 30000);
check("stockpile_massless", api.massOf("stockpile", "object", 1) === 0);
check("water_slice_open", api.massOf("water", "strata", 1) === null);
check("masonry_bill", api.billOfMaterials("masonry").totalMu === 977000);
check("wall_stone_bill", api.billOfMaterials("wall_stone").totalMu === 30000 && api.billOfMaterials("wall_stone").elementMu === 30000);
check("reclaim_iron_trace", api.reclaimTarget("iron").ledgerClass === "fe_trace");
check("reclaim_gold_scrap", api.reclaimTarget("gold").ledgerClass === "au_metal" && api.reclaimTarget("gold").dec028 === "scrap");
check("reclaim_wood_both", api.reclaimTarget("wood").ledgerClass === "humus" && api.reclaimTarget("wood").dec028 === "soil");
check("electrum_matches_ledger", JSON.stringify(api.material("electrum").ledger.composition) === JSON.stringify(ledger.classes.electrum.composition));
check("lava_ratio", (function () {
    const lava = api.material("lava");
    const basalt = api.material("basalt");
    return lava.solidify.duPerBasaltVoxel * lava.kgPerDu === basalt.kgPerSlice && lava.solidify.remainderRubbleKg === lava.kgPerDu;
})());
check("yield_of_granite_sums", (function () {
    const y = api.yieldOf("granite");
    return postingSum(y.postings) === 3894000;
})());
check("rubble_both_shapes", api.yieldOf("rubble").material && api.yieldOf("rubble").object);
check("bad_count_throws", (function () {
    try { api.massOf("stone", "item", -1); return false; } catch (e) { return e.code === "E_AMOUNT"; }
})());
check("zero_count", api.massOf("log", "item", 0) === 0);

const files = fs.readdirSync(FIX).filter(function (f) { return f.endsWith(".json"); }).sort();
check("fixtures_present", files.length >= 16, String(files.length));
files.forEach(function (f) {
    const spec = readJson(path.join(FIX, f));
    const data = applyCase(spec);
    const list = errsOf(data);
    const name = "fixture_" + f.replace(/\.json$/, "");
    check(name, hasCode(list, spec.expect) && list.length > 0, list.slice(0, 4).join(" | "));
});

// In-memory mutants that are not only the fixture files: one extra per rule family, killed locally and by validate.
function kill(name, data, code, localBad) {
    const list = errsOf(data);
    check(name, localBad && hasCode(list, code), (localBad ? "" : "local still clean; ") + list.slice(0, 3).join(" | "));
}
(function () {
    const d = bag();
    const g = d.catalogue.materials.filter(function (m) { return m.id === "granite"; })[0];
    g.yield.postings[0].mu = g.yield.postings[0].mu - 1;
    kill("mutant_yield_short", d, "E_YIELD_MASS", postingSum(g.yield.postings) !== g.massPerSlice);
})();
(function () {
    const d = bag();
    const g = d.catalogue.materials.filter(function (m) { return m.id === "granite"; })[0];
    g.collapse.postings[0].mu = 1;
    kill("mutant_collapse_short", d, "E_COLLAPSE_MASS", postingSum(g.collapse.postings) !== g.massPerSlice);
})();
(function () {
    const d = bag();
    const g = d.catalogue.materials.filter(function (m) { return m.id === "granite"; })[0];
    g.yield.postings.push({ process: "mine", fromClass: "fe_ore", fromForm: "strata", class: "fe_ore", form: "item", mu: 1, sameClass: true });
    const local = oreBad(g.yield.postings, {});
    kill("mutant_ore_yield", d, "E_ORE_OUTPUT", local);
})();
(function () {
    const d = bag();
    d.masses.objects.wall_stone.massMu += 1;
    const o = d.masses.objects.wall_stone;
    let s = 0;
    o.bill.forEach(function (ln) { s += ln.mu; });
    kill("mutant_bom", d, "E_BOM", s !== o.massMu);
})();
(function () {
    const d = bag();
    delete d.masses.items.log;
    kill("mutant_coverage_item", d, "E_COVERAGE", !d.masses.items.log);
})();
(function () {
    const d = bag();
    d.catalogue.materials.filter(function (m) { return m.id === "iron"; })[0].reclaim.ledgerClass = "fe_metal";
    kill("mutant_metal_reclaim", d, "E_METAL_RECLAIM", true);
})();
(function () {
    const d = bag();
    d.catalogue.mu.confirmed = true;
    kill("mutant_mu_confirmed", d, "E_MU_STATUS", d.catalogue.mu.confirmed === true);
})();
(function () {
    const d = bag();
    const w = d.catalogue.materials.filter(function (m) { return m.id === "wood"; })[0];
    w.combustion.ledger.charPerMille = 1;
    const sum = w.combustion.ledger.ashPerMille + w.combustion.ledger.charPerMille;
    kill("mutant_combustion", d, "E_COMBUSTION_MASS", sum !== 1000);
})();

console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
