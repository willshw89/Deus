"use strict";
// SIM.40.00 material catalogue reader (DEC-028, matter conserved by weight).
//
// Host-agnostic sim module in the same sense as game/js/sim/ledger.js: CommonJS, no host global, no clock, no randomness.
// It does not load files and it does not post to the ledger. Callers pass the catalogue, the mass tables and the
// interaction matrix. validate(data, ledgerDefaults) returns named errors; it does not throw for a bad catalogue.
// Amounts are non-negative safe integers. Iteration is sorted. The same data gives the same checksum.
//
// mu size is a proposal on the catalogue (PM_DEFAULT_UNCONFIRMED). This file does not choose a calendar scale.

var SCHEMA = 1;
var MAX = Number.MAX_SAFE_INTEGER;
var STATUS = { SOURCED: 1, PM_DEFAULT: 1, PM_DEFAULT_UNCONFIRMED: 1, OWNER_OPEN: 1, PLACEHOLDER: 1 };
var KINDS = { natural: 1, loose: 1, constructed: 1, none: 1 };
var RUST_TO = { fe_metal: "fe_trace", cu_metal: "cu_trace", ag_metal: "ag_trace", steel: "fe_trace" };
var NOBLE = { au_metal: 1, pt_metal: 1, electrum: 1 };

function isObj(v) { return typeof v === "object" && v !== null && !Array.isArray(v); }
function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function sortedKeys(o) { return Object.keys(o).sort(); }
function isInt(n) { return typeof n === "number" && Number.isSafeInteger(n); }
function isAmount(n) { return isInt(n) && n >= 0 && n <= MAX; }
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function divRound(n, d) { return Math.floor((n + Math.floor(d / 2)) / d); }
function procOf(p) { return p["process"]; }

function canon(v) {
    if (v === null) return "null";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) {
        var i, parts = [];
        for (i = 0; i < v.length; i++) parts.push(canon(v[i]));
        return "[" + parts.join(",") + "]";
    }
    if (isObj(v)) {
        var keys = sortedKeys(v), bits = [], k;
        for (k = 0; k < keys.length; k++) bits.push(JSON.stringify(keys[k]) + ":" + canon(v[keys[k]]));
        return "{" + bits.join(",") + "}";
    }
    return "null";
}
function fnv1a(text) {
    var h = 0x811c9dc5, i, c;
    for (i = 0; i < text.length; i++) {
        c = text.charCodeAt(i);
        h ^= c & 0xff;
        h = Math.imul(h, 0x01000193) >>> 0;
        h ^= c >>> 8;
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
}

function indexMaterials(list) {
    var byId = {}, byStrata = {}, i, m;
    for (i = 0; i < list.length; i++) {
        m = list[i];
        byId[m.id] = m;
        if (typeof m.strataId === "number") byStrata[m.strataId] = m;
    }
    return { byId: byId, byStrata: byStrata };
}

function postingSum(ps) {
    var t = 0, i, u;
    if (!ps) return 0;
    for (i = 0; i < ps.length; i++) {
        u = ps[i].unmappedMu || 0;
        t += (ps[i].mu || 0) + u;
    }
    return t;
}

function createMaterials(data) {
    var bag = isObj(data) ? data : {};
    var cat = isObj(bag.catalogue) ? bag.catalogue : {};
    var masses = isObj(bag.masses) ? bag.masses : {};
    var list = Array.isArray(cat.materials) ? cat.materials : [];
    var idx = indexMaterials(list);
    var items = isObj(masses.items) ? masses.items : {};
    var objects = isObj(masses.objects) ? masses.objects : {};

    function material(id) {
        var m = idx.byId[id];
        if (!m && (typeof id === "number" || (typeof id === "string" && id === String(Number(id))))) m = idx.byStrata[Number(id)];
        return m ? copy(m) : null;
    }
    function massOf(id, form, count) {
        var row, m, slice;
        if (!isAmount(count)) {
            var e = new Error("E_AMOUNT");
            e.code = "E_AMOUNT";
            throw e;
        }
        if (count === 0) return 0;
        if (form === "item") {
            row = items[id];
            if (!row) return null;
            if (row.massless) return 0;
            if (!isAmount(row.massMu)) return null;
            if (row.massMu > Math.floor(MAX / count)) {
                var e2 = new Error("E_AMOUNT");
                e2.code = "E_AMOUNT";
                throw e2;
            }
            return row.massMu * count;
        }
        if (form === "object" || form === "ruin") {
            row = objects[id];
            if (row) {
                if (row.massless) return 0;
                if (!isAmount(row.massMu)) return null;
                return row.massMu * count;
            }
            m = idx.byId[id];
            if (m && isAmount(m.massPerSlice)) return m.massPerSlice * count;
            return null;
        }
        m = idx.byId[id];
        if (!m && typeof id === "number") m = idx.byStrata[id];
        if (!m) return null;
        if (m.massless) return 0;
        slice = m.massPerSlice;
        if (!isAmount(slice)) return null;
        return slice * count;
    }
    function yieldOf(id) {
        var m = idx.byId[id], o = objects[id];
        if (m && o) return { material: m.yield ? copy(m.yield) : null, object: o.yield ? copy(o.yield) : null };
        if (m) return m.yield ? copy(m.yield) : null;
        if (o) return o.yield ? copy(o.yield) : null;
        return null;
    }
    function reclaimTarget(id) {
        var m = idx.byId[id] || idx.byStrata[id];
        if (!m || !m.reclaim) return null;
        return copy(m.reclaim);
    }
    function billOfMaterials(elementId) {
        var o = objects[elementId], m = idx.byId[elementId], lines, total, i;
        if (o && Array.isArray(o.bill)) {
            lines = copy(o.bill);
            total = 0;
            for (i = 0; i < o.bill.length; i++) total += o.bill[i].mu || 0;
            return { elementId: elementId, lines: lines, totalMu: total, elementMu: o.massMu || 0, massless: o.massless === true, reason: o.reason || null };
        }
        if (m && m.bill && Array.isArray(m.bill.lines)) return copy(m.bill);
        return null;
    }
    function checksum() { return fnv1a(canon(bag)); }
    function describe() {
        var nMassless = 0, id;
        for (id of sortedKeys(objects)) if (objects[id].massless) nMassless++;
        return {
            schema: SCHEMA,
            materials: list.length,
            items: sortedKeys(items).length,
            objects: sortedKeys(objects).length,
            masslessObjects: nMassless,
            mu: cat.mu ? copy(cat.mu) : null,
            calendar: cat.calendar ? copy(cat.calendar) : null,
            exemptionImplemented: cat.exemption ? cat.exemption.implemented === true : null
        };
    }
    return Object.freeze({
        material: material,
        massOf: massOf,
        yieldOf: yieldOf,
        reclaimTarget: reclaimTarget,
        billOfMaterials: billOfMaterials,
        validate: function (d, ledgerDefaults) { return validate(d === undefined ? bag : d, ledgerDefaults); },
        checksum: checksum,
        describe: describe
    });
}

function validate(data, ledgerDefaults) {
    var errors = [];
    function err(code, where) { errors.push(code + ": " + where); }
    if (!isObj(data) || !isObj(data.catalogue) || !isObj(data.masses) || !isObj(data.interactions)) {
        return ["E_SCHEMA: data"];
    }
    var cat = data.catalogue, masses = data.masses, ix = data.interactions;
    var ledger = ledgerDefaults;
    if (!isObj(ledger) || !isObj(ledger.classes) || !Array.isArray(ledger.transforms)) {
        return ["E_SCHEMA: ledgerDefaults"];
    }
    if (cat.schema !== SCHEMA || masses.schema !== SCHEMA || ix.schema !== SCHEMA) err("E_SCHEMA", "schema");

    var mu = cat.mu;
    if (!isObj(mu) || mu.status !== "PM_DEFAULT_UNCONFIRMED" || mu.confirmed !== false || !isInt(mu.proposalMuPerKg) || mu.proposalMuPerKg < 1) {
        err("E_MU_STATUS", "mu");
    }
    var perKg = mu && isInt(mu.proposalMuPerKg) ? mu.proposalMuPerKg : 0;
    var cal = cat.calendar || {};
    if (cal.status !== "OWNER_OPEN" || cal.dpy != null || cal.tickHz != null) err("E_OWNER_OPEN", "calendar");
    var geo = cat.geometry || {};
    if (has(geo, "layerCount")) err("E_LAYER_COUNT", "geometry.layerCount");
    if (!geo.legacyHalfSlice || geo.legacyHalfSlice.implemented !== false) err("E_MIGRATION", "geometry.legacyHalfSlice");
    if (!cat.exemption || cat.exemption.implemented !== false) err("E_MIGRATION", "exemption");

    var classes = ledger.classes;
    function clsOf(name) { return has(classes, name) ? classes[name] : null; }
    function isOre(name) { var c = clsOf(name); return !!(c && c.ore === true); }
    function formsOf(name) { var c = clsOf(name); return c && Array.isArray(c.forms) ? c.forms : []; }
    function familyName(name) { var c = clsOf(name); return c && typeof c.family === "string" ? c.family : null; }

    function statusOk(node, where) {
        if (!isObj(node)) return;
        var keys = sortedKeys(node), i, k, v;
        for (i = 0; i < keys.length; i++) {
            k = keys[i];
            v = node[k];
            if (k === "status" && !STATUS[v]) err("E_STATUS", where + ".status");
            else if (isObj(v)) statusOk(v, where + "." + k);
        }
    }
    statusOk(cat, "catalogue");
    statusOk(masses, "masses");

    if (!Array.isArray(cat.materials)) {
        err("E_SCHEMA", "materials");
        errors.sort();
        return errors;
    }
    var byId = {}, strataUsed = {}, mi, m;
    for (mi = 0; mi < cat.materials.length; mi++) {
        m = cat.materials[mi];
        if (!isObj(m) || typeof m.id !== "string") { err("E_SCHEMA", "materials[" + mi + "]"); continue; }
        if (byId[m.id]) err("E_ID", "duplicate " + m.id);
        byId[m.id] = m;
        if (m.strataId != null) {
            if (!isInt(m.strataId) || m.strataId < 0 || m.strataId > 63) err("E_ID", m.id + ".strataId");
            if (strataUsed[m.strataId]) err("E_ID", "strata " + m.strataId);
            strataUsed[m.strataId] = m.id;
        }
        if (!KINDS[m.kind]) err("E_SCHEMA", m.id + ".kind");
        checkMaterial(m);
    }

    function transformOk(p) {
        var name = procOf(p), rows, r, i;
        if (name === "identity" || name === "none") return true;
        if (!p.class) return true;
        rows = ledger.transforms;
        for (i = 0; i < rows.length; i++) {
            r = rows[i];
            if (r.id === name && r.from === p.fromClass && r.fromForms.indexOf(p.fromForm) >= 0 && r.to === p.class && r.toForms.indexOf(p.form) >= 0) return true;
        }
        return false;
    }
    function famAdd(map, cls, amount, explicit) {
        var c, keys, den, i, f, part;
        if (explicit) { map[explicit] = (map[explicit] || 0) + amount; return true; }
        c = clsOf(cls);
        if (!c) return false;
        if (c.family) { map[c.family] = (map[c.family] || 0) + amount; return true; }
        if (!isObj(c.composition)) return false;
        keys = sortedKeys(c.composition);
        den = 0;
        for (i = 0; i < keys.length; i++) den += c.composition[keys[i]];
        if (!den || amount % den !== 0) return false;
        for (i = 0; i < keys.length; i++) {
            f = keys[i];
            part = amount / den * c.composition[f];
            map[f] = (map[f] || 0) + part;
        }
        return true;
    }
    function famMap(ps) {
        var map = {}, i, p;
        for (i = 0; i < ps.length; i++) {
            p = ps[i];
            if (!p.class) continue;
            if (!famAdd(map, p.class, p.mu || 0, p.family || null)) err("E_FAMILY_MASS", "posting " + (p.class || "?"));
        }
        return map;
    }
    function famEqual(a, b, where) {
        var keys = {}, i, k, list;
        for (k in a) if (has(a, k)) keys[k] = 1;
        for (k in b) if (has(b, k)) keys[k] = 1;
        list = sortedKeys(keys);
        for (i = 0; i < list.length; i++) {
            k = list[i];
            if ((a[k] || 0) !== (b[k] || 0)) err("E_FAMILY_MASS", where + " " + k);
        }
    }
    function checkPostings(ps, where, mass, sourceOre) {
        var i, p, sum, name;
        if (!ps) return;
        sum = postingSum(ps);
        if (isAmount(mass) && sum !== mass) err(where.indexOf("collapse") >= 0 ? "E_COLLAPSE_MASS" : "E_YIELD_MASS", where);
        for (i = 0; i < ps.length; i++) {
            p = ps[i];
            name = procOf(p);
            if (p.class) {
                if (!clsOf(p.class)) err("E_LEDGER_CLASS", where + " " + p.class);
                else if (formsOf(p.class).indexOf(p.form) < 0) err("E_FORM", where + " " + p.class + " " + p.form);
                if (p.fromClass && clsOf(p.fromClass) && formsOf(p.fromClass).indexOf(p.fromForm) < 0) err("E_FORM", where + " from " + p.fromClass + " " + p.fromForm);
                if (!transformOk(p)) err("E_TRANSFORM", where + " " + name + " " + p.fromClass + "->" + p.class);
                if (!isAmount(p.mu)) err("E_MASS", where);
                if (isOre(p.class)) {
                    var allowed = sourceOre && sourceOre[p.class] >= p.mu && p.sameClass === true;
                    if (!allowed) err("E_ORE_OUTPUT", where + " " + p.class);
                }
            }
            if (p.unmappedMu != null && !isAmount(p.unmappedMu)) err("E_MASS", where + " unmapped");
        }
    }
    function sourceOreOf(m) {
        var o = {}, c;
        if (m.ledger && m.ledger.class && isOre(m.ledger.class) && isAmount(m.massPerSlice)) o[m.ledger.class] = m.massPerSlice;
        return o;
    }
    function sourceFam(m) {
        var map = {}, unmapped = 0, ledgerMu, c;
        if (!isAmount(m.massPerSlice) || !m.ledger) return map;
        if (m.unmapped && isAmount(m.unmapped.mu)) unmapped = m.unmapped.mu;
        c = m.ledger.class;
        if (m.ledger.composition) c = m.ledger.class;
        if (!c) return map;
        ledgerMu = m.massPerSlice - unmapped;
        if (ledgerMu < 0) ledgerMu = 0;
        famAdd(map, c, ledgerMu, null);
        return map;
    }

    function checkMaterial(m) {
        var where = "materials." + m.id;
        if (m.massless) {
            if (typeof m.reason !== "string" || !m.reason) err("E_MASSLESS", where);
            if (m.massPerSlice !== 0) err("E_MASSLESS", where);
        } else if (m.massPerSlice == null) {
            var openOk = m.massStatus === "OWNER_OPEN" || m.massStatus === "PLACEHOLDER" || (m.ledgerForm === "fluid" && m.massStatus === "PM_DEFAULT");
            if (!openOk) err("E_MASS", where + " open");
        } else if (!isAmount(m.massPerSlice)) err("E_MASS", where);
        if (isAmount(m.kgPerSlice) && isAmount(m.massPerSlice) && perKg && m.massPerSlice !== m.kgPerSlice * perKg) err("E_MU_SCALE", where);
        if (m.ledger && m.ledger.class) {
            var c = clsOf(m.ledger.class);
            if (!c) err("E_LEDGER_CLASS", where + " " + m.ledger.class);
            else if (m.ledger.composition) {
                if (!c.composition) err("E_ALLOY", where);
                else {
                    var a = sortedKeys(m.ledger.composition), b = sortedKeys(c.composition), i;
                    if (a.length !== b.length) err("E_ALLOY", where);
                    for (i = 0; i < a.length; i++) if (a[i] !== b[i] || m.ledger.composition[a[i]] !== c.composition[a[i]]) err("E_ALLOY", where);
                }
                if (m.ledger.family) err("E_ALLOY", where + " family");
            } else if (m.ledger.family && c && c.family && m.ledger.family !== c.family) err("E_LEDGER_FAMILY", where);
            if (c && c.family && ledger.families && !has(ledger.families, c.family) && m.ledger.family) err("E_LEDGER_FAMILY", where);
        } else if (!m.massless && !m.reserved && !(m.unmapped && m.unmapped.reason)) {
            if (m.massPerSlice != null) err("E_LEDGER_CLASS", where);
        }
        if (m.unmapped && !m.unmapped.reason) err("E_GAP_UNDECLARED", where);
        if (m.laneQPerMille && m.laneQPerMille.appliedToLedger === true) err("E_GAP_UNDECLARED", where + " applied");
        if (m.blastGroup && ix.blast && ix.blast.groups && !has(ix.blast.groups, m.blastGroup)) err("E_BLAST_GROUP", where);
        if (m.decay && m.decay.dc && cat.decayClasses && !has(cat.decayClasses, m.decay.dc)) err("E_SCHEMA", where + " decay");
        if (m.decay && m.decay.outputClass) {
            if (!clsOf(m.decay.outputClass)) err("E_LEDGER_CLASS", where + " decay");
            if (isOre(m.decay.outputClass)) err("E_ORE_OUTPUT", where + " decay");
        }
        if (m.combustion && m.combustion.ledger) {
            var L = m.combustion.ledger;
            if ((L.ashPerMille || 0) + (L.charPerMille || 0) !== 1000) err("E_COMBUSTION_MASS", where);
            if (L.ashClass && L.ashClass !== "ash") err("E_ORE_OUTPUT", where + " combustion");
            if (L.charClass && L.charClass !== "charcoal") err("E_ORE_OUTPUT", where + " combustion");
            if (L.ashPerMille && isOre("ash")) err("E_ORE_OUTPUT", where);
        }
        if (m.reclaim && m.reclaim.ledgerClass) {
            if (!clsOf(m.reclaim.ledgerClass)) err("E_LEDGER_CLASS", where + " reclaim");
            if (isOre(m.reclaim.ledgerClass)) err("E_ORE_OUTPUT", where + " reclaim " + m.reclaim.ledgerClass);
            var src = m.ledger && m.ledger.class;
            if (src && RUST_TO[src] && m.reclaim.ledgerClass !== RUST_TO[src]) err("E_METAL_RECLAIM", where);
            if (src && NOBLE[src] && m.reclaim.ledgerClass !== src) err("E_METAL_RECLAIM", where);
        }
        if (m.reclaim && m.reclaim.classByElement) {
            var ek = sortedKeys(m.reclaim.classByElement), ei;
            for (ei = 0; ei < ek.length; ei++) {
                var target = m.reclaim.classByElement[ek[ei]];
                if (isOre(target)) err("E_ORE_OUTPUT", where + " classByElement");
                if (RUST_TO[ek[ei] === "iron" ? "fe_metal" : ek[ei] === "copper" ? "cu_metal" : ek[ei] === "silver" ? "ag_metal" : ek[ei] === "steel" ? "steel" : ""]) {
                    var key = ek[ei] === "iron" ? "fe_metal" : ek[ei] === "copper" ? "cu_metal" : ek[ei] === "silver" ? "ag_metal" : "steel";
                    if (target !== RUST_TO[key]) err("E_METAL_RECLAIM", where + " " + ek[ei]);
                }
            }
        }
        if (m.bill && Array.isArray(m.bill.lines)) {
            var bs = 0, bi;
            for (bi = 0; bi < m.bill.lines.length; bi++) bs += m.bill.lines[bi].mu || 0;
            if (isAmount(m.massPerSlice) && bs !== m.massPerSlice) err("E_BOM", where);
            if (m.bill.totalMu != null && m.bill.totalMu !== bs) err("E_BOM", where + " total");
        }
        if (m.speciesScale && isAmount(m.kgPerSlice)) {
            var sk = sortedKeys(m.speciesScale), si, sp, expect;
            for (si = 0; si < sk.length; si++) {
                sp = byId[sk[si]];
                if (!sp || !isAmount(sp.densityKgM3)) { err("E_MU_SCALE", where + " species " + sk[si]); continue; }
                expect = divRound(m.kgPerSlice * sp.densityKgM3, 750) * perKg;
                if (m.speciesScale[sk[si]] !== expect) err("E_MU_SCALE", where + " species " + sk[si]);
            }
        }
        if (m.bulkKgByLineage) {
            var rule = m.id === "scrap" ? 4 : 5;
            var bk = sortedKeys(m.bulkKgByLineage), bki, parent, got;
            for (bki = 0; bki < bk.length; bki++) {
                parent = byId[bk[bki]];
                if (!parent || !isAmount(parent.kgPerSlice)) continue;
                got = m.id === "scrap" ? divRound(parent.kgPerSlice, 4) : divRound(parent.kgPerSlice * 3, rule);
                if (m.bulkKgByLineage[bk[bki]] !== got) err("E_MU_SCALE", where + " bulk " + bk[bki]);
            }
        }
        if (m.solidify) {
            var bas = byId[m.solidify.basaltId];
            if (!bas || m.solidify.duPerBasaltVoxel * m.kgPerDu !== bas.kgPerSlice) err("E_COLLAPSE_MASS", where + " solidify");
            if (m.solidify.remainderRubbleKg !== m.kgPerDu) err("E_COLLAPSE_MASS", where + " remainder");
        }
        if (isAmount(m.massPerSlice) && !m.massless) {
            var oreSrc = sourceOreOf(m);
            if (m.yield && m.yield.postings) {
                checkPostings(m.yield.postings, where + " yield", m.massPerSlice, oreSrc);
                famEqual(sourceFam(m), famMap(m.yield.postings), where + " yield");
            } else err("E_YIELD_MASS", where + " missing");
            if (m.collapse && m.collapse.postings) {
                checkPostings(m.collapse.postings, where + " collapse", m.massPerSlice, oreSrc);
                famEqual(sourceFam(m), famMap(m.collapse.postings), where + " collapse");
            } else err("E_COLLAPSE_MASS", where + " missing");
        }
        if (m.ledger && m.ledger.composition && isAmount(m.massPerSlice)) {
            var den = 0, ck = sortedKeys(m.ledger.composition), ci;
            for (ci = 0; ci < ck.length; ci++) den += m.ledger.composition[ck[ci]];
            if (den && m.massPerSlice % den !== 0) err("E_ALLOY", where + " multiple");
        }
    }

    var items = masses.items || {}, objects = masses.objects || {};
    var index = masses.catalogIndex || { items: [], objects: [] };
    var ii, oid;
    if (!Array.isArray(index.items) || !Array.isArray(index.objects)) err("E_COVERAGE", "catalogIndex");
    else {
        for (ii = 0; ii < index.items.length; ii++) if (!has(items, index.items[ii])) err("E_COVERAGE", "item " + index.items[ii]);
        for (ii = 0; ii < index.objects.length; ii++) if (!has(objects, index.objects[ii])) err("E_COVERAGE", "object " + index.objects[ii]);
        if (sortedKeys(items).length !== index.items.length) err("E_COVERAGE", "item extras");
        if (sortedKeys(objects).length !== index.objects.length) err("E_COVERAGE", "object extras");
    }
    var itemIds = sortedKeys(items);
    for (ii = 0; ii < itemIds.length; ii++) checkItem(itemIds[ii], items[itemIds[ii]]);
    var objIds = sortedKeys(objects);
    for (oid = 0; oid < objIds.length; oid++) checkObject(objIds[oid], objects[objIds[oid]]);

    function checkItem(id, row) {
        var where = "items." + id;
        if (!isObj(row)) { err("E_SCHEMA", where); return; }
        if (row.massless) {
            if (!row.reason) err("E_MASSLESS", where);
            return;
        }
        if (!isAmount(row.massMu) || row.massMu < 1) err("E_MASS", where);
        if (row.catalogWeightTimes1000 != null && row.catalogWeightTimes1000 !== row.massMu) err("E_ITEM_WEIGHT", where);
        if (!row.ledger || !clsOf(row.ledger.class)) err("E_LEDGER_CLASS", where);
        else if (familyName(row.ledger.class) && row.ledger.family !== familyName(row.ledger.class)) err("E_LEDGER_FAMILY", where);
    }
    function lineFam(lines) {
        var map = {}, i;
        for (i = 0; i < lines.length; i++) map[lines[i].family] = (map[lines[i].family] || 0) + lines[i].mu;
        return map;
    }
    function oreBag(lines) {
        var o = {}, i;
        for (i = 0; i < lines.length; i++) if (isOre(lines[i].class)) o[lines[i].class] = (o[lines[i].class] || 0) + lines[i].mu;
        return o;
    }
    function checkObject(id, row) {
        var where = "objects." + id, i, sum, b, ps, lineSum;
        if (!isObj(row)) { err("E_SCHEMA", where); return; }
        if (row.massless) {
            if (typeof row.reason !== "string" || !row.reason) err("E_MASSLESS", where);
            if (row.massMu !== 0) err("E_MASSLESS", where);
            return;
        }
        if (!isAmount(row.massMu) || row.massMu < 1) err("E_MASS", where);
        if (!Array.isArray(row.lines)) { err("E_SCHEMA", where + " lines"); return; }
        lineSum = 0;
        for (i = 0; i < row.lines.length; i++) {
            lineSum += row.lines[i].mu || 0;
            if (!clsOf(row.lines[i].class)) err("E_LEDGER_CLASS", where + " " + row.lines[i].class);
            else if (familyName(row.lines[i].class) && row.lines[i].family !== familyName(row.lines[i].class)) err("E_LEDGER_FAMILY", where);
        }
        if (lineSum !== row.massMu) err("E_BOM", where + " lines");
        if (Array.isArray(row.bill)) {
            sum = 0;
            for (i = 0; i < row.bill.length; i++) {
                b = row.bill[i];
                if (!items[b.item]) err("E_COVERAGE", where + " bill " + b.item);
                else if (b.count * items[b.item].massMu !== b.mu) err("E_BOM", where + " " + b.item);
                sum += b.mu || 0;
            }
            if (sum !== row.massMu) err("E_BOM", where);
        }
        var bag = oreBag(row.lines);
        ps = row.yield && row.yield.postings;
        if (!ps) err("E_YIELD_MASS", where);
        else {
            checkPostings(ps, where + " yield", row.massMu, bag);
            famEqual(lineFam(row.lines), famMap(ps), where + " yield");
            checkItemCounts(ps, where);
        }
        ps = row.collapse && row.collapse.postings;
        if (!ps) err("E_COLLAPSE_MASS", where);
        else {
            checkPostings(ps, where + " collapse", row.massMu, bag);
            famEqual(lineFam(row.lines), famMap(ps), where + " collapse");
        }
    }
    function checkItemCounts(ps, where) {
        var i, p;
        for (i = 0; i < ps.length; i++) {
            p = ps[i];
            if (p.item && p.count != null && items[p.item] && p.count * items[p.item].massMu !== p.mu) err("E_BOM", where + " count " + p.item);
        }
    }

    if (!Array.isArray(ix.rusts) || !Array.isArray(ix.erodes)) err("E_SCHEMA", "interactions");
    else {
        var r, t;
        for (r = 0; r < ix.rusts.length; r++) {
            t = ix.rusts[r];
            if (!clsOf(t.class)) err("E_LEDGER_CLASS", "rust " + t.class);
            if (t.to && isOre(t.to)) err("E_ORE_OUTPUT", "rust " + t.to);
            if (RUST_TO[t.class] && t.to !== RUST_TO[t.class]) err("E_METAL_RECLAIM", "rust " + t.class);
            if (NOBLE[t.class] && t.to) err("E_METAL_RECLAIM", "rust " + t.class);
        }
        for (r = 0; r < ix.erodes.length; r++) {
            t = ix.erodes[r];
            if (!clsOf(t.from) || !clsOf(t.to)) err("E_LEDGER_CLASS", "erode " + t.from);
            if (isOre(t.to)) err("E_ORE_OUTPUT", "erode " + t.to);
        }
    }
    errors.sort();
    var uniq = [], last = "", ui;
    for (ui = 0; ui < errors.length; ui++) if (errors[ui] !== last) { uniq.push(errors[ui]); last = errors[ui]; }
    return uniq;
}

module.exports = { createMaterials: createMaterials, validate: validate, SCHEMA: SCHEMA };
