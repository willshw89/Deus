"use strict";
// WG.65.15 per-material-class mass ledger (LIFE-001 matter is conserved, LIFE-002 no ore respawn).
//
// A host-agnostic sim module under ADR-003 Rev 3 §2.3-§2.5 (PROPOSED): CommonJS subset, requires only ./ledger_* files,
// names no host global, reads no clock and draws no random numbers. Every amount is a non-negative safe integer and every
// iteration runs in sorted key order, so the same calls give the same checksum. ADR-003 §2.4 sketches the final home as
// game/js/sim/kernel/ledger.js (SIM.00.02 owns that layout); this file and ledger_defaults.js move there by a rename.
//
// Model (ADR-003 §7.8 Q-MASS): amounts are kept per (class, form). A class belongs to one family, or to several by an
// integer composition (electrum = au + ag). After seal(), totals change only by
//   transform  one table row, amount kept, composition kept (element-conserving), never outputs an ore class;
//   recipe     fixed integer proportions balanced per family (alloying, parting);
//   source/sink a declared, data-driven name, each call logged with its cause.
// API, tables and hook-up notes: tasks/WG.65.15/lane-l1/LEDGER_API.md.

const DEFAULTS = require("./ledger_defaults");

const SCHEMA = 1;
const MAX = Number.MAX_SAFE_INTEGER;
const NAME_RE = /^[a-z][a-z0-9_.-]{0,63}$/;
const CAUSE_MAX = 200;
const LOG_LIMIT_MAX = 65536;
const SEP = "|";
const KINDS = ["register", "transform", "recipe", "source", "sink"];

function fail(code, msg) {
    const e = new Error(code + ": " + msg);
    e.name = "LedgerError";
    e.code = code;
    throw e;
}
function show(v) {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "bigint") return String(v) + "n";
    if (typeof v === "symbol") return "a symbol";
    if (typeof v === "object" && v !== null) return Array.isArray(v) ? "an array" : "an object";
    return String(v);
}
function isObj(v) { return typeof v === "object" && v !== null && !Array.isArray(v); }
function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function isAmount(n) { return typeof n === "number" && Number.isSafeInteger(n) && n >= 0; }
function checkAmount(n, what) {
    if (!isAmount(n)) fail("E_AMOUNT", what + ": amount " + show(n) + " is not a non-negative safe integer");
}
function checkName(n, what) {
    if (typeof n !== "string" || !NAME_RE.test(n)) fail("E_CONFIG", what + " name " + show(n) + " must match " + String(NAME_RE));
}
function sortedKeys(o) { return Object.keys(o).sort(); }
function copyData(v) { return JSON.parse(JSON.stringify(v)); }

// Canonical JSON: object keys sorted, integers only. The checksum is FNV-1a over this text (ADR-003 §10.6).
function canon(v) {
    if (v === null) return "null";
    if (typeof v === "number") {
        if (!Number.isSafeInteger(v)) fail("E_SNAPSHOT", "non-integer number " + show(v) + " in canonical data");
        return String(v);
    }
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
    if (isObj(v)) {
        const keys = Object.keys(v).sort();
        return "{" + keys.map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
    }
    return fail("E_SNAPSHOT", "value " + show(v) + " is not JSON-safe");
}
function fnv1a(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        h ^= c & 0xff;
        h = Math.imul(h, 0x01000193) >>> 0;
        h ^= c >>> 8;
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
}

//-----------------------------------------------------------------------------------------------------------------------
// Config: validated and copied once at load. The ledger never reads the caller's objects again.

function normalize(cfg) {
    if (!isObj(cfg)) fail("E_CONFIG", "config must be an object");
    if (cfg.schema !== SCHEMA) fail("E_CONFIG", "config schema must be " + SCHEMA + ", got " + show(cfg.schema));

    if (!isObj(cfg.families)) fail("E_CONFIG", "config.families must be an object");
    const families = {};
    for (const f of sortedKeys(cfg.families)) {
        checkName(f, "family");
        const d = cfg.families[f];
        if (!isObj(d) || typeof d.unit !== "string" || !d.unit) fail("E_CONFIG", "family " + f + " needs a unit string");
        if (d.finite !== undefined && typeof d.finite !== "boolean") fail("E_CONFIG", "family " + f + ": finite must be a boolean");
        families[f] = { unit: d.unit, finite: d.finite === true };
    }
    const famNames = sortedKeys(families);
    if (!famNames.length) fail("E_CONFIG", "config declares no family");

    if (!Array.isArray(cfg.forms) || !cfg.forms.length) fail("E_CONFIG", "config.forms must be a non-empty array");
    const forms = cfg.forms.slice().sort();
    for (let i = 0; i < forms.length; i++) {
        checkName(forms[i], "form");
        if (i && forms[i] === forms[i - 1]) fail("E_CONFIG", "form " + forms[i] + " is declared twice");
    }

    if (!isObj(cfg.classes)) fail("E_CONFIG", "config.classes must be an object");
    const classes = {};
    for (const c of sortedKeys(cfg.classes)) {
        checkName(c, "class");
        const d = cfg.classes[c];
        if (!isObj(d)) fail("E_CONFIG", "class " + c + " must be an object");
        const comp = [];
        if (d.composition !== undefined) {
            if (d.family !== undefined) fail("E_CONFIG", "class " + c + " has both family and composition");
            if (!isObj(d.composition)) fail("E_CONFIG", "class " + c + ": composition must be an object");
            for (const f of sortedKeys(d.composition)) {
                const p = d.composition[f];
                if (!has(families, f)) fail("E_CONFIG", "class " + c + ": unknown family " + show(f) + " in composition");
                if (!Number.isSafeInteger(p) || p < 1 || p > 1000000) fail("E_CONFIG", "class " + c + ": composition part for " + f + " must be an integer 1..1000000, got " + show(p));
                comp.push([f, p]);
            }
            if (!comp.length) fail("E_CONFIG", "class " + c + ": empty composition");
        } else {
            if (typeof d.family !== "string" || !has(families, d.family)) fail("E_CONFIG", "class " + c + ": unknown family " + show(d.family));
            comp.push([d.family, 1]);
        }
        let den = 0;
        for (const e of comp) den += e[1];
        if (!Array.isArray(d.forms) || !d.forms.length) fail("E_CONFIG", "class " + c + ": forms must be a non-empty array");
        const cf = d.forms.slice().sort();
        for (let i = 0; i < cf.length; i++) {
            if (forms.indexOf(cf[i]) < 0) fail("E_CONFIG", "class " + c + ": undeclared form " + show(cf[i]));
            if (i && cf[i] === cf[i - 1]) fail("E_CONFIG", "class " + c + ": form " + cf[i] + " listed twice");
        }
        if (d.ore !== undefined && typeof d.ore !== "boolean") fail("E_CONFIG", "class " + c + ": ore must be a boolean");
        const ore = d.ore === true;
        if (ore && comp.length !== 1) fail("E_CONFIG", "class " + c + ": an ore class must belong to exactly one family");
        let finite = false;
        for (const e of comp) if (families[e[0]].finite) finite = true;
        classes[c] = { comp, den, forms: cf, ore, finite, compKey: canon(comp) };
    }
    const clsNames = sortedKeys(classes);
    if (!clsNames.length) fail("E_CONFIG", "config declares no class");
    const keys = [];
    for (const c of clsNames) for (const f of classes[c].forms) keys.push(c + SEP + f);

    function checkClassForms(where, cls, list) {
        if (typeof cls !== "string" || !has(classes, cls)) fail("E_CONFIG", where + ": unknown class " + show(cls));
        if (!Array.isArray(list) || !list.length) fail("E_CONFIG", where + ": form list for " + cls + " must be a non-empty array");
        for (const f of list) if (classes[cls].forms.indexOf(f) < 0) fail("E_CONFIG", where + ": class " + cls + " has no form " + show(f));
    }

    // Transform rows. Ore guard and composition guard here (config-load time) and again at call time.
    if (!Array.isArray(cfg.transforms)) fail("E_CONFIG", "config.transforms must be an array");
    const transforms = {};
    for (let i = 0; i < cfg.transforms.length; i++) {
        const t = cfg.transforms[i], where = "transform row " + i;
        if (!isObj(t)) fail("E_CONFIG", where + " must be an object");
        checkName(t.id, where + " id");
        checkClassForms(where + " (" + t.id + ")", t.from, t.fromForms);
        checkClassForms(where + " (" + t.id + ")", t.to, t.toForms);
        if (classes[t.to].ore && t.to !== t.from)
            fail("E_ORE_OUTPUT", where + " (" + t.id + ") outputs ore class " + t.to + " from " + t.from + " (LIFE-002: ore is never produced)");
        if (classes[t.from].compKey !== classes[t.to].compKey)
            fail("E_FAMILY", where + " (" + t.id + ") changes the element/family mix: " + t.from + " " + classes[t.from].compKey + " -> " + t.to + " " + classes[t.to].compKey);
        for (const ff of t.fromForms) for (const tf of t.toForms) {
            if (t.from === t.to && ff === tf) fail("E_CONFIG", where + " (" + t.id + ") moves " + t.from + SEP + ff + " onto itself");
            const k = t.from + SEP + ff + ">" + t.to + SEP + tf;
            if (transforms[k] !== undefined) fail("E_CONFIG", where + " (" + t.id + ") repeats the move " + k + " of row " + transforms[k]);
            transforms[k] = t.id;
        }
    }

    // Recipes: integer proportions, balanced per family, no ore output.
    const recipes = {};
    const recipeList = cfg.recipes === undefined ? [] : cfg.recipes;
    if (!Array.isArray(recipeList)) fail("E_CONFIG", "config.recipes must be an array");
    for (let i = 0; i < recipeList.length; i++) {
        const r = recipeList[i], where = "recipe row " + i;
        if (!isObj(r)) fail("E_CONFIG", where + " must be an object");
        checkName(r.id, where + " id");
        if (has(recipes, r.id)) fail("E_CONFIG", where + ": recipe id " + r.id + " is declared twice");
        const bal = {};
        for (const f of famNames) bal[f] = 0;
        const sides = {};
        for (const side of ["inputs", "outputs"]) {
            const list = r[side];
            if (!Array.isArray(list) || !list.length) fail("E_CONFIG", where + " (" + r.id + "): " + side + " must be a non-empty array");
            const seen = {};
            sides[side] = [];
            for (const e of list) {
                if (!Array.isArray(e) || e.length !== 3) fail("E_CONFIG", where + " (" + r.id + "): each " + side + " entry is [class, form, parts]");
                const cls = e[0], form = e[1], parts = e[2];
                checkClassForms(where + " (" + r.id + ")", cls, [form]);
                if (!Number.isSafeInteger(parts) || parts < 1) fail("E_CONFIG", where + " (" + r.id + "): parts for " + cls + " must be a positive integer");
                const cd = classes[cls];
                if (parts % cd.den !== 0) fail("E_CONFIG", where + " (" + r.id + "): parts for " + cls + " must be a multiple of " + cd.den);
                if (side === "outputs" && cd.ore) fail("E_ORE_OUTPUT", where + " (" + r.id + ") outputs ore class " + cls + " (LIFE-002)");
                const k = cls + SEP + form;
                if (seen[k]) fail("E_CONFIG", where + " (" + r.id + "): " + k + " listed twice in " + side);
                seen[k] = true;
                for (const ce of cd.comp) bal[ce[0]] += (side === "inputs" ? 1 : -1) * (parts / cd.den) * ce[1];
                sides[side].push([k, parts]);
            }
        }
        for (const f of famNames) if (bal[f] !== 0) fail("E_FAMILY", where + " (" + r.id + ") is not balanced for family " + f + " (inputs minus outputs = " + bal[f] + ")");
        recipes[r.id] = { inputs: sides.inputs, outputs: sides.outputs };
    }

    // Sources and sinks: data-driven names. A source never outputs ore; it reaches a finite family only with allowFinite.
    function flows(kind, table) {
        if (!isObj(table)) fail("E_CONFIG", "config." + kind + "s must be an object");
        const out = {};
        for (const name of sortedKeys(table)) {
            checkName(name, kind);
            const d = table[name];
            if (!isObj(d)) fail("E_CONFIG", kind + " " + name + " must be an object");
            for (const b of ["allowFinite", "ownerConfirmed"]) if (d[b] !== undefined && typeof d[b] !== "boolean") fail("E_CONFIG", kind + " " + name + ": " + b + " must be a boolean");
            if (kind === "sink" && d.allowFinite !== undefined) fail("E_CONFIG", "sink " + name + ": allowFinite applies to sources only");
            const allowFinite = d.allowFinite === true;
            const wildCls = d.classes === "*";
            const clsList = wildCls ? clsNames : d.classes;
            if (!Array.isArray(clsList) || !clsList.length) fail("E_CONFIG", kind + " " + name + ": classes must be \"*\" or a non-empty array");
            const formsW = d.forms === undefined || d.forms === "*";
            if (!formsW) {
                if (!Array.isArray(d.forms) || !d.forms.length) fail("E_CONFIG", kind + " " + name + ": forms must be \"*\" or a non-empty array");
                for (const f of d.forms) if (forms.indexOf(f) < 0) fail("E_CONFIG", kind + " " + name + ": undeclared form " + show(f));
            }
            const allowed = {};
            let count = 0;
            for (const c of clsList) {
                if (typeof c !== "string" || !has(classes, c)) fail("E_CONFIG", kind + " " + name + ": unknown class " + show(c));
                const cd = classes[c];
                if (kind === "source" && cd.ore) {
                    if (wildCls) continue;
                    fail("E_ORE_OUTPUT", "source " + name + " lists ore class " + c + " (LIFE-002: ore is never produced)");
                }
                if (kind === "source" && cd.finite && !allowFinite) {
                    if (wildCls) continue;
                    fail("E_FINITE_SOURCE", "source " + name + " lists finite class " + c + " without allowFinite");
                }
                for (const f of cd.forms) if (formsW || d.forms.indexOf(f) >= 0) { allowed[c + SEP + f] = true; count++; }
            }
            if (!count) fail("E_CONFIG", kind + " " + name + " allows no (class, form) pair");
            if (d.authority !== undefined && typeof d.authority !== "string") fail("E_CONFIG", kind + " " + name + ": authority must be a string");
            out[name] = { allowed, allowFinite, ownerConfirmed: d.ownerConfirmed === true, authority: d.authority || "" };
        }
        return out;
    }
    const sources = flows("source", cfg.sources);
    const sinks = flows("sink", cfg.sinks);

    let logLimit = 256;
    if (cfg.logLimit !== undefined) {
        if (!Number.isSafeInteger(cfg.logLimit) || cfg.logLimit < 1 || cfg.logLimit > LOG_LIMIT_MAX) fail("E_CONFIG", "logLimit must be an integer 1.." + LOG_LIMIT_MAX);
        logLimit = cfg.logLimit;
    }

    // Per family: the (key, part, den) triples whose amounts make up the family total.
    const famKeys = {};
    for (const f of famNames) famKeys[f] = [];
    const clsFams = {};
    for (const c of clsNames) {
        clsFams[c] = classes[c].comp.map(e => e[0]);
        for (const e of classes[c].comp) for (const form of classes[c].forms) famKeys[e[0]].push([c + SEP + form, e[1], classes[c].den]);
    }

    const cfgOut = { families, famNames, forms, classes, clsNames, keys, transforms, recipes, sources, sinks, logLimit, famKeys, clsFams };
    cfgOut.describe = describeOf(cfgOut);
    cfgOut.fingerprint = fnv1a(canon(cfgOut.describe));
    return cfgOut;
}

function describeOf(c) {
    const classes = {};
    for (const n of c.clsNames) {
        const d = c.classes[n], comp = {};
        for (const e of d.comp) comp[e[0]] = e[1];
        classes[n] = { composition: comp, forms: d.forms.slice(), ore: d.ore, finite: d.finite };
    }
    const transforms = Object.keys(c.transforms).sort().map(k => {
        const p = k.split(">"), a = p[0].split(SEP), b = p[1].split(SEP);
        return { id: c.transforms[k], from: a[0], fromForm: a[1], to: b[0], toForm: b[1] };
    });
    const recipes = {};
    for (const id of sortedKeys(c.recipes)) recipes[id] = { inputs: c.recipes[id].inputs.map(e => e.slice()), outputs: c.recipes[id].outputs.map(e => e.slice()) };
    function flowDesc(t) {
        const out = {};
        for (const n of sortedKeys(t)) out[n] = { allowed: sortedKeys(t[n].allowed), allowFinite: t[n].allowFinite, ownerConfirmed: t[n].ownerConfirmed, authority: t[n].authority };
        return out;
    }
    const families = {};
    for (const f of c.famNames) families[f] = { unit: c.families[f].unit, finite: c.families[f].finite };
    return { schema: SCHEMA, families, forms: c.forms.slice(), classes, transforms, recipes, sources: flowDesc(c.sources), sinks: flowDesc(c.sinks), logLimit: c.logLimit };
}

//-----------------------------------------------------------------------------------------------------------------------

function createLedger(config) {
    const C = normalize(config === undefined ? DEFAULTS : config);
    const zeroCls = () => { const o = {}; for (const c of C.clsNames) o[c] = 0; return o; };

    let S = freshState();
    function freshState() {
        const amt = {};
        for (const k of C.keys) amt[k] = 0;
        // life.src / life.snk: flow totals since seal, flat keys "name|class" (bounded by the table size).
        return { sealed: false, seq: 0, amt, base: null, life: { src: {}, snk: {} }, iv: null, log: [], head: 0 };
    }
    function newInterval(index, st) {
        const startFam = {}, startCls = {};
        for (const f of C.famNames) startFam[f] = famTotalIn(st.amt, f);
        for (const c of C.clsNames) startCls[c] = clsTotalIn(st.amt, c);
        return { index, startFam, startCls, src: zeroCls(), snk: zeroCls(), tin: zeroCls(), tout: zeroCls(), events: 0, summary: {} };
    }

    function famTotalIn(amt, f) {
        let t = 0;
        for (const e of C.famKeys[f]) t += amt[e[0]] / e[2] * e[1];
        return t;
    }
    function clsTotalIn(amt, c) {
        let t = 0;
        for (const f of C.classes[c].forms) t += amt[c + SEP + f];
        return t;
    }
    // A per-class flow map summed over one family (a composite class contributes its share).
    function famFlow(map, f) {
        let t = 0;
        for (const c of C.clsNames) {
            const cd = C.classes[c];
            for (const e of cd.comp) if (e[0] === f) t += map[c] / cd.den * e[1];
        }
        return t;
    }
    function lifeFam(side, f) {
        const per = zeroCls();
        for (const k of Object.keys(side)) per[k.split(SEP)[1]] += side[k];
        return famFlow(per, f);
    }

    function classOf(cls, where) {
        if (typeof cls !== "string" || !has(C.classes, cls)) fail("E_UNKNOWN_CLASS", where + ": unknown class " + show(cls));
        return C.classes[cls];
    }
    function keyOf(cls, form, where) {
        const cd = classOf(cls, where);
        if (typeof form !== "string" || cd.forms.indexOf(form) < 0) fail("E_UNKNOWN_FORM", where + ": class " + cls + " has no form " + show(form));
        return cls + SEP + form;
    }
    function checkCause(cause, where) {
        if (typeof cause !== "string" || !cause.length || cause.length > CAUSE_MAX) fail("E_CAUSE", where + ": cause must be a string of 1.." + CAUSE_MAX + " characters, got " + show(cause));
    }
    function checkMultiple(cls, n, where) {
        const den = C.classes[cls].den;
        if (n % den !== 0) fail("E_MULTIPLE", where + ": amount " + n + " of " + cls + " must be a multiple of " + den + " (composition)");
    }
    function needSealed(where) { if (!S.sealed) fail("E_NOT_SEALED", where + ": the ledger is not sealed yet (register the world, then seal())"); }

    // The one writer. Every amount change and flow counter is validated first and committed after, so a refused call
    // leaves no trace. changes: [[key, delta]]; counters: [[object, key, add]]; entry: the log record.
    function apply(where, cause, changes, counters, entry) {
        const next = {};
        for (const ch of changes) {
            const k = ch[0], cur = next[k] === undefined ? S.amt[k] : next[k], v = cur + ch[1];
            if (v < 0) fail("E_INSUFFICIENT", where + ": " + k + " holds " + cur + ", cannot remove " + (-ch[1]) + " (cause " + show(cause) + ")");
            if (v > MAX) fail("E_OVERFLOW", where + ": " + k + " would exceed Number.MAX_SAFE_INTEGER (cause " + show(cause) + ")");
            next[k] = v;
        }
        const fams = {};
        for (const k of Object.keys(next)) for (const f of C.clsFams[k.split(SEP)[0]]) fams[f] = true;
        for (const f of Object.keys(fams)) {
            let t = 0;
            for (const e of C.famKeys[f]) t += (next[e[0]] === undefined ? S.amt[e[0]] : next[e[0]]) / e[2] * e[1];
            if (t > MAX) fail("E_OVERFLOW", where + ": family " + f + " would exceed Number.MAX_SAFE_INTEGER (cause " + show(cause) + ")");
        }
        const staged = [];
        for (const c of counters) {
            let s = null;
            for (const x of staged) if (x[0] === c[0] && x[1] === c[1]) s = x;
            if (s === null) { s = [c[0], c[1], c[0][c[1]] || 0]; staged.push(s); }
            s[2] += c[2];
            if (s[2] > MAX) fail("E_OVERFLOW", where + ": flow counter " + c[1] + " would exceed Number.MAX_SAFE_INTEGER (cause " + show(cause) + ")");
        }
        let sk = null, sv = null;
        if (S.iv) {
            sk = entry.kind + ":" + entry.ref + ":" + entry.from + ">" + entry.to;
            const cur = S.iv.summary[sk] || [0, 0];
            sv = [cur[0] + 1, cur[1] + entry.amount];
            if (sv[1] > MAX) fail("E_OVERFLOW", where + ": the interval summary would exceed Number.MAX_SAFE_INTEGER");
        }
        // commit
        for (const k of Object.keys(next)) S.amt[k] = next[k];
        for (const s of staged) s[0][s[1]] = s[2];
        if (sk !== null) { S.iv.summary[sk] = sv; S.iv.events++; }
        S.seq++;
        const rec = { seq: S.seq, kind: entry.kind, ref: entry.ref, from: entry.from, to: entry.to, amount: entry.amount, cause };
        if (S.log.length < C.logLimit) S.log.push(rec);
        else { S.log[S.head] = rec; S.head = (S.head + 1) % C.logLimit; }
    }

    //---- world registration --------------------------------------------------------------------------------------------
    function register(cls, form, amount, cause) {
        const where = "register " + show(cls) + "/" + show(form);
        if (S.sealed) fail("E_SEALED", where + ": the ledger is sealed; after seal() matter changes only by transform, recipe, source or sink");
        const k = keyOf(cls, form, where);
        checkAmount(amount, where);
        checkMultiple(cls, amount, where);
        const c = cause === undefined ? "register" : cause;
        checkCause(c, where);
        apply(where, c, [[k, amount]], [], { kind: "register", ref: "register", from: "", to: k, amount });
    }
    function seal() {
        if (S.sealed) fail("E_SEALED", "seal: the ledger is already sealed");
        S.sealed = true;
        S.base = {};
        for (const f of C.famNames) S.base[f] = famTotalIn(S.amt, f);
        S.iv = newInterval(1, S);
    }

    //---- transforms ----------------------------------------------------------------------------------------------------
    function transform(fromCls, fromForm, toCls, toForm, amount, cause) {
        const where = "transform " + show(fromCls) + "/" + show(fromForm) + " -> " + show(toCls) + "/" + show(toForm);
        needSealed(where);
        checkCause(cause, where);
        const kf = keyOf(fromCls, fromForm, where), kt = keyOf(toCls, toForm, where);
        checkAmount(amount, where + " (cause " + show(cause) + ")");
        checkMultiple(fromCls, amount, where);
        const fd = C.classes[fromCls], td = C.classes[toCls];
        if (td.ore && toCls !== fromCls) fail("E_ORE_OUTPUT", where + ": the output " + toCls + " is an ore class; ore is never produced (LIFE-002, cause " + show(cause) + ")");
        if (fd.compKey !== td.compKey) fail("E_FAMILY", where + ": " + fromCls + " and " + toCls + " differ in element/family (cause " + show(cause) + ")");
        const id = C.transforms[kf + ">" + kt];
        if (id === undefined) fail("E_NO_ENTRY", where + ": no transform table row allows this move (cause " + show(cause) + ")");
        const moves = [[kf, -amount], [kt, amount]];
        apply(where, cause, moves, [[S.iv.tout, fromCls, amount], [S.iv.tin, toCls, amount]], { kind: "transform", ref: id, from: kf, to: kt, amount });
    }
    function recipe(id, times, cause) {
        const where = "recipe " + show(id);
        needSealed(where);
        checkCause(cause, where);
        if (typeof id !== "string" || !has(C.recipes, id)) fail("E_NO_ENTRY", where + ": no such recipe (cause " + show(cause) + ")");
        checkAmount(times, where + " times");
        const r = C.recipes[id], changes = [], counters = [];
        for (const side of [r.inputs, r.outputs]) for (const e of side) {
            if (times > 0 && e[1] > Math.floor(MAX / times)) fail("E_OVERFLOW", where + ": " + times + " x " + e[1] + " exceeds Number.MAX_SAFE_INTEGER");
            const n = e[1] * times, cls = e[0].split(SEP)[0];
            if (side === r.inputs) { changes.push([e[0], -n]); counters.push([S.iv.tout, cls, n]); }
            else { changes.push([e[0], n]); counters.push([S.iv.tin, cls, n]); }
        }
        apply(where, cause, changes, counters, { kind: "recipe", ref: id, from: "", to: "", amount: times });
    }

    //---- named sources and sinks ---------------------------------------------------------------------------------------
    function source(name, cls, form, amount, cause) {
        const where = "source " + show(name) + " " + show(cls) + "/" + show(form);
        needSealed(where);
        checkCause(cause, where);
        if (typeof name !== "string" || !has(C.sources, name)) fail("E_UNKNOWN_SOURCE", where + ": " + show(name) + " is not a declared source (cause " + show(cause) + ")");
        const k = keyOf(cls, form, where);
        checkAmount(amount, where + " (cause " + show(cause) + ")");
        checkMultiple(cls, amount, where);
        const cd = C.classes[cls], sd = C.sources[name];
        if (cd.ore) fail("E_ORE_OUTPUT", where + ": " + cls + " is an ore class; no source may produce ore (LIFE-002, cause " + show(cause) + ")");
        if (cd.finite && !sd.allowFinite) fail("E_FINITE_SOURCE", where + ": " + cls + " is finite and source " + name + " has no allowFinite (cause " + show(cause) + ")");
        if (!sd.allowed[k]) fail("E_SOURCE_SCOPE", where + ": source " + name + " is not declared for " + k + " (cause " + show(cause) + ")");
        apply(where, cause, [[k, amount]], [[S.life.src, name + SEP + cls, amount], [S.iv.src, cls, amount]], { kind: "source", ref: name, from: "", to: k, amount });
    }
    function sink(name, cls, form, amount, cause) {
        const where = "sink " + show(name) + " " + show(cls) + "/" + show(form);
        needSealed(where);
        checkCause(cause, where);
        if (typeof name !== "string" || !has(C.sinks, name)) fail("E_UNKNOWN_SINK", where + ": " + show(name) + " is not a declared sink (cause " + show(cause) + ")");
        const k = keyOf(cls, form, where);
        checkAmount(amount, where + " (cause " + show(cause) + ")");
        checkMultiple(cls, amount, where);
        if (!C.sinks[name].allowed[k]) fail("E_SINK_SCOPE", where + ": sink " + name + " is not declared for " + k + " (cause " + show(cause) + ")");
        apply(where, cause, [[k, -amount]], [[S.life.snk, name + SEP + cls, amount], [S.iv.snk, cls, amount]], { kind: "sink", ref: name, from: k, to: "", amount });
    }

    //---- reading -------------------------------------------------------------------------------------------------------
    function total(cls) { classOf(cls, "total"); return clsTotalIn(S.amt, cls); }
    function amount(cls, form) { return S.amt[keyOf(cls, form, "amount")]; }
    function familyTotal(f) {
        if (typeof f !== "string" || !has(C.families, f)) fail("E_UNKNOWN_FAMILY", "familyTotal: unknown family " + show(f));
        return famTotalIn(S.amt, f);
    }
    function totals() {
        const classes = {}, forms = {}, families = {};
        for (const c of C.clsNames) {
            classes[c] = clsTotalIn(S.amt, c);
            forms[c] = {};
            for (const f of C.classes[c].forms) forms[c][f] = S.amt[c + SEP + f];
        }
        for (const f of C.famNames) families[f] = famTotalIn(S.amt, f);
        return { classes, forms, families };
    }

    //---- checks --------------------------------------------------------------------------------------------------------
    // Closure since seal, per family: total now = total at seal + sources - sinks.
    function closureOf(st) {
        const out = [];
        if (!st.sealed) return out;
        for (const f of C.famNames) {
            const now = famTotalIn(st.amt, f), src = lifeFam(st.life.src, f), snk = lifeFam(st.life.snk, f);
            if (now !== st.base[f] + src - snk) out.push({ family: f, sealed: st.base[f], sources: src, sinks: snk, expected: st.base[f] + src - snk, actual: now });
        }
        return out;
    }
    // The per-interval identity: delta(total) = sum(sources) - sum(sinks) per family; per class, transfers in and out too.
    function intervalOf(st) {
        const iv = st.iv, families = [], classes = [];
        let ok = true;
        for (const f of C.famNames) {
            const start = iv.startFam[f], end = famTotalIn(st.amt, f), src = famFlow(iv.src, f), snk = famFlow(iv.snk, f);
            const good = end - start === src - snk;
            if (!good) ok = false;
            families.push({ family: f, start, end, sources: src, sinks: snk, ok: good });
        }
        for (const c of C.clsNames) {
            const start = iv.startCls[c], end = clsTotalIn(st.amt, c);
            const good = end - start === iv.src[c] - iv.snk[c] + iv.tin[c] - iv.tout[c];
            if (!good) ok = false;
            classes.push({ cls: c, start, end, sources: iv.src[c], sinks: iv.snk[c], transfersIn: iv.tin[c], transfersOut: iv.tout[c], ok: good });
        }
        return { index: iv.index, ok, events: iv.events, families, classes, summary: copyData(iv.summary) };
    }
    function interval() { needSealed("interval"); return intervalOf(S); }
    function closeInterval() {
        needSealed("closeInterval");
        const rep = intervalOf(S);
        S.iv = newInterval(S.iv.index + 1, S);
        return rep;
    }
    function check() {
        const closure = closureOf(S);
        const iv = S.sealed ? intervalOf(S) : null;
        const bad = iv ? iv.families.filter(r => !r.ok).concat(iv.classes.filter(r => !r.ok)) : [];
        return { ok: !closure.length && !bad.length, closure, interval: bad };
    }

    // audit(recount): recount = { class: { form: amount } } (form level) or { class: amount } (class level), made by an
    // independent walk of the world. A missing class or form counts as 0. Returns a structured diff; never throws on a
    // mismatch (assertBalanced does).
    function audit(recount) {
        if (!isObj(recount)) fail("E_RECOUNT", "audit: the recount must be an object { class: { form: amount } | amount }");
        const unknown = [], diffs = [], famDiffs = [], counted = {};
        for (const c of sortedKeys(recount)) {
            if (!has(C.classes, c)) { unknown.push(c); continue; }
            const v = recount[c];
            if (typeof v === "number") { checkAmount(v, "audit recount " + c); continue; }
            if (!isObj(v)) fail("E_RECOUNT", "audit: the recount of " + c + " must be an amount or an object of forms");
            for (const f of sortedKeys(v)) {
                if (C.classes[c].forms.indexOf(f) < 0) { unknown.push(c + SEP + f); continue; }
                checkAmount(v[f], "audit recount " + c + SEP + f);
            }
        }
        let checked = 0;
        for (const c of C.clsNames) {
            const v = recount[c];
            if (typeof v === "number") {
                checked++;
                const exp = clsTotalIn(S.amt, c);
                if (v !== exp) diffs.push({ cls: c, form: null, expected: exp, actual: v, delta: v - exp });
                counted[c] = v;
                continue;
            }
            let sum = 0;
            for (const f of C.classes[c].forms) {
                checked++;
                const exp = S.amt[c + SEP + f];
                const act = isObj(v) && v[f] !== undefined ? v[f] : 0;
                sum += act;
                if (act !== exp) diffs.push({ cls: c, form: f, expected: exp, actual: act, delta: act - exp });
            }
            counted[c] = sum;
        }
        for (const c of C.clsNames) {
            const den = C.classes[c].den;
            if (counted[c] % den !== 0) diffs.push({ cls: c, form: null, expected: clsTotalIn(S.amt, c), actual: counted[c], delta: counted[c] - clsTotalIn(S.amt, c), note: "E_MULTIPLE" });
        }
        for (const f of C.famNames) {
            let act = 0;
            for (const c of C.clsNames) for (const e of C.classes[c].comp) if (e[0] === f) act += Math.floor(counted[c] / C.classes[c].den) * e[1];
            const exp = famTotalIn(S.amt, f);
            if (act !== exp) famDiffs.push({ family: f, expected: exp, actual: act, delta: act - exp });
        }
        const internal = check();
        const ok = !diffs.length && !famDiffs.length && !unknown.length && internal.ok;
        return { ok, checked, diffs, families: famDiffs, unknown, closure: internal.closure, interval: internal.interval };
    }
    // assertBalanced(recount): audit() that throws E_UNBALANCED on any mismatch. Without a recount it checks only the
    // ledger's own closure and interval identity.
    function assertBalanced(recount) {
        const rep = recount === undefined ? Object.assign({ checked: 0, diffs: [], families: [], unknown: [] }, check()) : audit(recount);
        if (rep.ok) return rep;
        const lines = [];
        for (const d of rep.diffs) lines.push(d.cls + (d.form === null ? "" : SEP + d.form) + " ledger " + d.expected + " counted " + d.actual + " (" + (d.delta > 0 ? "+" : "") + d.delta + ")");
        for (const d of rep.families) lines.push("family " + d.family + " ledger " + d.expected + " counted " + d.actual);
        for (const u of rep.unknown) lines.push("unknown recount key " + u);
        for (const d of rep.closure) lines.push("closure " + d.family + ": sealed " + d.sealed + " + sources " + d.sources + " - sinks " + d.sinks + " = " + d.expected + ", ledger holds " + d.actual);
        for (const d of rep.interval) lines.push("interval identity " + (d.family || d.cls) + ": start " + d.start + " end " + d.end + " sources " + d.sources + " sinks " + d.sinks);
        return fail("E_UNBALANCED", lines.length + " mismatch(es): " + lines.slice(0, 12).join("; ") + (lines.length > 12 ? "; ..." : ""));
    }

    //---- log, snapshot, checksum ---------------------------------------------------------------------------------------
    function events() {
        const ordered = S.log.length < C.logLimit ? S.log : S.log.slice(S.head).concat(S.log.slice(0, S.head));
        return ordered.map(e => Object.assign({}, e));
    }
    function unconfirmed() {
        const out = [];
        for (const n of sortedKeys(C.sources)) if (!C.sources[n].ownerConfirmed) out.push({ kind: "source", name: n, authority: C.sources[n].authority });
        for (const n of sortedKeys(C.sinks)) if (!C.sinks[n].ownerConfirmed) out.push({ kind: "sink", name: n, authority: C.sinks[n].authority });
        return out;
    }
    function snapshot() {
        const amounts = {};
        for (const k of Object.keys(S.amt)) amounts[k] = S.amt[k];
        return {
            schema: SCHEMA, config: C.fingerprint, sealed: S.sealed, seq: S.seq, amounts,
            base: S.base === null ? null : Object.assign({}, S.base),
            life: copyData(S.life),
            interval: S.iv === null ? null : copyData(S.iv),
            log: events()
        };
    }
    // restore(snapshot): validates everything, rebuilds the state, and replaces it only if all of it is valid.
    function restore(snap) {
        const bad = msg => fail("E_SNAPSHOT", "restore: " + msg);
        if (!isObj(snap)) bad("the snapshot must be an object");
        if (snap.schema !== SCHEMA) bad("schema " + show(snap.schema) + " is not " + SCHEMA);
        if (snap.config !== C.fingerprint) bad("taken with another config (" + show(snap.config) + "; this ledger's is " + C.fingerprint + ")");
        if (Object.keys(snap).length !== 9) bad("unexpected top-level keys");
        if (typeof snap.sealed !== "boolean") bad("sealed must be a boolean");
        if (!isAmount(snap.seq)) bad("seq must be a non-negative safe integer");
        const exact = (o, names, what) => {
            if (!isObj(o)) bad(what + " must be an object");
            const ks = Object.keys(o);
            if (ks.length !== names.length) bad(what + " has " + ks.length + " keys, expected " + names.length);
            for (const k of ks) {
                if (names.indexOf(k) < 0) bad(what + " has unknown key " + show(k));
                if (!isAmount(o[k])) bad(what + "." + k + " = " + show(o[k]) + " is not a non-negative safe integer");
            }
        };
        exact(snap.amounts, C.keys, "amounts");
        const st = freshState();
        st.sealed = snap.sealed;
        st.seq = snap.seq;
        st.amt = {};
        for (const k of Object.keys(snap.amounts)) {
            const cls = k.split(SEP)[0];
            if (snap.amounts[k] % C.classes[cls].den !== 0) bad("amounts." + k + " is not a multiple of " + C.classes[cls].den);
            st.amt[k] = snap.amounts[k];
        }
        for (const f of C.famNames) if (famTotalIn(st.amt, f) > MAX) bad("family " + f + " exceeds Number.MAX_SAFE_INTEGER");
        if (!isObj(snap.life) || Object.keys(snap.life).length !== 2) bad("life must be { src, snk }");
        for (const side of ["src", "snk"]) {
            const t = snap.life[side], table = side === "src" ? C.sources : C.sinks;
            if (!isObj(t)) bad("life." + side + " must be an object");
            for (const k of Object.keys(t)) {
                const p = k.split(SEP);
                if (p.length !== 2 || !has(table, p[0]) || !has(C.classes, p[1])) bad("life." + side + " has an invalid key " + show(k));
                if (!isAmount(t[k]) || t[k] % C.classes[p[1]].den !== 0) bad("life." + side + "." + k + " is not a valid amount");
                st.life[side][k] = t[k];
            }
        }
        if (snap.sealed) {
            exact(snap.base, C.famNames, "base");
            st.base = Object.assign({}, snap.base);
            const iv = snap.interval;
            if (!isObj(iv) || Object.keys(iv).length !== 9) bad("a sealed snapshot needs its interval");
            if (!isAmount(iv.index) || iv.index < 1) bad("interval.index must be a positive integer");
            if (!isAmount(iv.events)) bad("interval.events must be a non-negative safe integer");
            exact(iv.startFam, C.famNames, "interval.startFam");
            for (const m of ["startCls", "src", "snk", "tin", "tout"]) exact(iv[m], C.clsNames, "interval." + m);
            if (!isObj(iv.summary)) bad("interval.summary must be an object");
            const summary = {};
            for (const k of Object.keys(iv.summary)) {
                const v = iv.summary[k];
                if (!Array.isArray(v) || v.length !== 2 || !isAmount(v[0]) || !isAmount(v[1])) bad("interval.summary." + k + " must be [count, amount]");
                summary[k] = [v[0], v[1]];
            }
            st.iv = { index: iv.index, startFam: Object.assign({}, iv.startFam), startCls: Object.assign({}, iv.startCls), src: Object.assign({}, iv.src),
                snk: Object.assign({}, iv.snk), tin: Object.assign({}, iv.tin), tout: Object.assign({}, iv.tout), events: iv.events, summary };
        } else {
            if (snap.base !== null || snap.interval !== null) bad("an unsealed snapshot has no base and no interval");
            if (Object.keys(st.life.src).length || Object.keys(st.life.snk).length) bad("an unsealed snapshot has no source or sink flows");
        }
        if (!Array.isArray(snap.log) || snap.log.length > C.logLimit) bad("log must be an array of at most " + C.logLimit + " entries");
        for (const e of snap.log) {
            if (!isObj(e) || Object.keys(e).length !== 7 || !isAmount(e.seq) || e.seq > snap.seq || KINDS.indexOf(e.kind) < 0 || typeof e.ref !== "string" ||
                typeof e.from !== "string" || typeof e.to !== "string" || !isAmount(e.amount) || typeof e.cause !== "string") bad("log entry " + show(e && e.seq) + " is malformed");
            st.log.push({ seq: e.seq, kind: e.kind, ref: e.ref, from: e.from, to: e.to, amount: e.amount, cause: e.cause });
        }
        if (st.sealed) {
            const cl = closureOf(st);
            if (cl.length) bad("closure broken for family " + cl[0].family + " (sealed + sources - sinks = " + cl[0].expected + ", amounts give " + cl[0].actual + ")");
            if (!intervalOf(st).ok) bad("the interval identity does not hold");
        }
        S = st;
    }
    function checksum() { return fnv1a(canon(snapshot())); }

    return Object.freeze({
        register, seal, isSealed: () => S.sealed,
        transform, recipe, source, sink,
        total, amount, familyTotal, totals,
        audit, assertBalanced, check, interval, closeInterval,
        events, unconfirmed, describe: () => copyData(C.describe),
        snapshot, restore, checksum
    });
}

function defaultConfig() { return copyData(DEFAULTS); }

module.exports = { createLedger, defaultConfig, SCHEMA };
