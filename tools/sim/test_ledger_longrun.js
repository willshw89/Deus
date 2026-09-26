"use strict";
// WG.65.15 deterministic long-run conservation harness for game/js/sim/ledger.js (node only; never NW.js).
//
//   node tools/sim/test_ledger_longrun.js                   the gate run (seeds, determinism, continuity, fixture, faults)
//   node tools/sim/test_ledger_longrun.js --write-fixture   the same, then rewrite tools/sim/fixtures/ledger/longrun_expected.json
//   node tools/sim/test_ledger_longrun.js --child --seeds=7 --ops=20000 [--fault=<name> --fault-at=<n>] [--zmin=-16 --zmax=15] [--k=1000]
//
// The toy world lives here, not in game/js/sim/. It is one 128 x 128-cell area of sparse 32 x 32-cell chunks, allocated
// on first write, on layers zmin..zmax (default -16..+15, DEC-013 as amended; ADR-003 Rev 3 §15). A cell is 5 ft square;
// a layer is 10 ft, five 2-ft slices. Each slice holds one strata material and an integer amount; every other form
// (items, objects, ruins, fluid, ice, creatures, sub-slice residue) sits in the cell's bag. Every world operation also
// tells the ledger. Every K operations the world is recounted cell by cell, without reading the ledger, and
//   - each family total must equal its start plus the sources minus the sinks this harness itself declared,
//   - no ore class total may rise,
//   - ledger.assertBalanced(recount) must pass, and the ledger's interval identity must hold.
// Injected faults (--fault) must make the run fail with a named check and a non-zero exit.

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const { createLedger } = require("../../game/js/sim/ledger.js");

const ARGS = {};
for (const a of process.argv.slice(2)) { const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a); if (m) ARGS[m[1]] = m[2] === undefined ? true : m[2]; }
const FIXTURE = path.join(__dirname, "fixtures", "ledger", "longrun_expected.json");

// Geometry: DEC-013 (docs/OWNER_DECISIONS.md:178-181) and ADR-003 Rev 3 §15.0/§15.3.
const CELL_FT = 5, SLICE_FT = 2, STRATA = 5, LAYER_FT = STRATA * SLICE_FT, CHUNK = 32, CHUNKS_PER_SIDE = 4, W = CHUNK * CHUNKS_PER_SIDE;
const BANDS = [["Lower-2", -16, -9], ["Lower-1", -8, -1], ["Surface", 0, 3], ["Upper-1", 4, 9], ["Upper-2", 10, 15]];

// Toy mass per full 2-ft slice, in mass units. Placeholders only: SIM.40.00/SIM.40.01 set the real table.
const SLICE_CAP = { stone: 1000, rubble: 650, soil: 700, sediment: 750, wood: 450, gem: 900, fe_ore: 1200, cu_ore: 1150, ag_ore: 1150, au_ore: 1300, pt_ore: 1400 };

// This harness's own composition table, written independently of game/js/sim/ledger_defaults.js.
const COMP = {
    stone: { mineral: 1 }, rubble: { mineral: 1 }, soil: { mineral: 1 }, sediment: { mineral: 1 }, lava: { mineral: 1 },
    wood: { organic: 1 }, biomass: { organic: 1 }, humus: { organic: 1 }, ash: { organic: 1 }, charcoal: { organic: 1 },
    water: { water: 1 }, gem: { gem: 1 }, steel: { fe: 1 }, electrum: { au: 1, ag: 1 }
};
const METALS = ["fe", "cu", "ag", "au", "pt"];
for (const m of METALS) { COMP[m + "_ore"] = { [m]: 1 }; COMP[m + "_metal"] = { [m]: 1 }; }
for (const m of ["fe", "cu", "ag"]) COMP[m + "_trace"] = { [m]: 1 };
const DEN = cls => Object.values(COMP[cls]).reduce((a, b) => a + b, 0);
const FAMILIES = ["mineral", "organic", "water", "fe", "cu", "ag", "au", "pt", "gem"];
const FINITE = ["fe", "cu", "ag", "au", "pt", "gem"];
const ORES = METALS.map(m => m + "_ore");

//=======================================================================================================================
// Seeded integer PRNG (mulberry32, seeded through a 32-bit hash; no Math.random anywhere).

function hash32(a, b) {
    let h = Math.imul((a ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ b;
    h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);
    h ^= h >>> 13;
    h = Math.imul(h, 0x27d4eb2f);
    return (h ^ (h >>> 16)) >>> 0;
}
class Rng {
    constructor(state) { this.s = state >>> 0; }
    next() {
        let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
    }
    int(lo, hi) { return lo + (this.next() % (hi - lo + 1)); }
    chance(num, den) { return this.next() % den < num; }
    pick(arr) { return arr[this.next() % arr.length]; }
}

//=======================================================================================================================
// The toy world: sparse chunks, cells with five slices and a bag.

class World {
    constructor(zMin, zMax) { this.zMin = zMin; this.zMax = zMax; this.chunks = new Map(); this.cells = []; }
    inBounds(x, y, z) { return x >= 0 && y >= 0 && x < W && y < W && z >= this.zMin && z <= this.zMax; }
    get(x, y, z, create) {
        const ck = ((z - this.zMin) * CHUNKS_PER_SIDE + (y >> 5)) * CHUNKS_PER_SIDE + (x >> 5);
        let ch = this.chunks.get(ck);
        if (!ch) { if (!create) return null; ch = new Map(); this.chunks.set(ck, ch); }
        const ci = ((y & 31) << 5) | (x & 31);
        let c = ch.get(ci);
        if (!c && create) { c = { x, y, z, s: [null, null, null, null, null], bag: {} }; ch.set(ci, c); this.cells.push(c); }
        return c || null;
    }
    serialize() { return JSON.stringify({ zMin: this.zMin, zMax: this.zMax, cells: this.cells.map(c => [c.x, c.y, c.z, c.s, Object.entries(c.bag)]) }); }
    static parse(text) {
        const d = JSON.parse(text), w = new World(d.zMin, d.zMax);
        for (const [x, y, z, s, bag] of d.cells) { const c = w.get(x, y, z, true); c.s = s; for (const [k, v] of bag) c.bag[k] = v; }
        return w;
    }
}
function strataHave(c, cls) {
    let n = c.bag[cls + "|strata"] || 0;
    for (const sl of c.s) if (sl && sl[0] === cls) n += sl[1];
    return n;
}
function strataTake(c, cls, max) {
    let need = max, got = 0;
    const k = cls + "|strata";
    if (c.bag[k]) { const t = Math.min(c.bag[k], need); c.bag[k] -= t; if (!c.bag[k]) delete c.bag[k]; need -= t; got += t; }
    for (let i = STRATA - 1; i >= 0 && need > 0; i--) {
        const sl = c.s[i];
        if (sl && sl[0] === cls) { const t = Math.min(sl[1], need); sl[1] -= t; need -= t; got += t; if (!sl[1]) c.s[i] = null; }
    }
    return got;
}
function strataPut(c, cls, a) {
    const cap = SLICE_CAP[cls];
    if (cap) {
        for (let i = 0; i < STRATA && a > 0; i++) { const sl = c.s[i]; if (sl && sl[0] === cls && sl[1] < cap) { const t = Math.min(cap - sl[1], a); sl[1] += t; a -= t; } }
        for (let i = 0; i < STRATA && a > 0; i++) if (!c.s[i]) { const t = Math.min(cap, a); c.s[i] = [cls, t]; a -= t; }
    }
    if (a > 0) c.bag[cls + "|strata"] = (c.bag[cls + "|strata"] || 0) + a;   // sub-slice residue record
}
function have(c, cls, form) { return form === "strata" ? strataHave(c, cls) : (c.bag[cls + "|" + form] || 0); }
function take(c, cls, form, n) {
    if (form === "strata") return strataTake(c, cls, n);
    const k = cls + "|" + form, v = c.bag[k] || 0, t = Math.min(v, n);
    if (t === v) delete c.bag[k]; else c.bag[k] = v - t;
    return t;
}
function put(c, cls, form, n) {
    if (n <= 0) return;
    if (form === "strata") strataPut(c, cls, n);
    else c.bag[cls + "|" + form] = (c.bag[cls + "|" + form] || 0) + n;
}

// The independent recount: walks every allocated cell. It never reads the ledger.
function recount(world) {
    const rc = {};
    const add = (cls, form, n) => { const r = rc[cls] || (rc[cls] = {}); r[form] = (r[form] || 0) + n; };
    for (const c of world.cells) {
        for (const sl of c.s) if (sl) add(sl[0], "strata", sl[1]);
        for (const k of Object.keys(c.bag)) { const p = k.split("|"); add(p[0], p[1], c.bag[k]); }
    }
    return rc;
}
function classTotal(rc, cls) { let n = 0; if (rc[cls]) for (const f of Object.keys(rc[cls])) n += rc[cls][f]; return n; }
function familiesOf(rc) {
    const out = {};
    for (const f of FAMILIES) out[f] = 0;
    for (const cls of Object.keys(rc)) {
        if (!COMP[cls]) throw new Error("the recount found an unknown class " + cls);
        const n = classTotal(rc, cls), d = DEN(cls);
        for (const f of Object.keys(COMP[cls])) out[f] += n / d * COMP[cls][f];
    }
    return out;
}
function fnv1a(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ("0000000" + h.toString(16)).slice(-8);
}
function worldChecksum(world) {
    const lines = world.cells.map(c => c.z + "," + c.y + "," + c.x + ":" + JSON.stringify(c.s) + ":" + Object.keys(c.bag).sort().map(k => k + "=" + c.bag[k]).join(";"));
    lines.sort();
    return fnv1a(lines.join("\n"));
}

//=======================================================================================================================
// A run: generation, operations, checkpoints.

function newRun(opts) {
    const run = {
        opts, world: new World(opts.zMin, opts.zMax), ledger: createLedger(), rng: new Rng(hash32(opts.seed, 0x5eed)),
        counts: {}, performed: 0, skipped: 0, attempts: 0, checkpoints: 0,
        tally: { src: {}, snk: {} }, oreOut: {}, start: null, startCls: null, startOre: {}, lastOre: {}, failure: null, genStats: null
    };
    for (const f of FAMILIES) { run.tally.src[f] = 0; run.tally.snk[f] = 0; }
    for (const o of ORES) run.oreOut[o] = 0;
    for (const op of OPS) run.counts[op[0]] = 0;
    return run;
}
function source(run, name, cls, form, n, cause) {
    run.ledger.source(name, cls, form, n, cause);
    for (const f of Object.keys(COMP[cls])) run.tally.src[f] += n / DEN(cls) * COMP[cls][f];
}
function sink(run, name, cls, form, n, cause) {
    run.ledger.sink(name, cls, form, n, cause);
    for (const f of Object.keys(COMP[cls])) run.tally.snk[f] += n / DEN(cls) * COMP[cls][f];
    if (ORES.indexOf(cls) >= 0) run.oreOut[cls] += n;
}

function generate(run) {
    const { world, rng, ledger } = run;
    const reg = (c, cls, form, n) => { if (n <= 0) return; put(c, cls, form, n); ledger.register(cls, form, n, "worldgen"); };
    const zMin = world.zMin, zMax = world.zMax;
    for (let col = 0; col < 360; col++) {
        const x = rng.int(0, W - 1), y = rng.int(0, W - 1), g = Math.min(rng.int(-2, 2), zMax);
        for (let z = zMin; z <= g; z++) {
            const c = world.get(x, y, z, true);
            if (c.s.some(Boolean) || Object.keys(c.bag).length) continue;
            const d = g - z;
            if (d === 0) {
                reg(c, "soil", "strata", rng.int(1000, 2100));
                reg(c, "humus", "strata", rng.int(20, 150));
                if (rng.chance(50, 100)) reg(c, "biomass", "object", rng.int(50, 600));
                if (rng.chance(10, 100)) reg(c, "biomass", "item", rng.int(5, 60));
                if (rng.chance(15, 100)) reg(c, "water", "fluid", rng.int(1, 70));
                if (rng.chance(3, 100)) reg(c, "wood", "strata", rng.int(200, 450));
                if (rng.chance(4, 100)) reg(c, rng.pick(["fe_ore", "cu_ore", "au_ore"]), "object", rng.int(100, 800));   // outcrops
                if (rng.chance(12, 100)) {   // a settled plot
                    reg(c, "stone", "object", rng.int(200, 2000)); reg(c, "wood", "object", rng.int(100, 800)); reg(c, "fe_metal", "object", rng.int(5, 40));
                    reg(c, "stone", "item", rng.int(0, 200)); reg(c, "wood", "item", rng.int(0, 200)); reg(c, "rubble", "item", rng.int(0, 100));
                    reg(c, "fe_metal", "item", rng.int(0, 30)); reg(c, "steel", "item", rng.int(0, 20)); reg(c, "cu_metal", "item", rng.int(0, 30));
                    reg(c, "ag_metal", "item", rng.int(0, 20)); reg(c, "au_metal", "item", rng.int(0, 15)); reg(c, "pt_metal", "item", rng.int(0, 5));
                    reg(c, "electrum", "item", 2 * rng.int(0, 10)); reg(c, "gem", "item", rng.int(0, 3)); reg(c, "charcoal", "item", rng.int(0, 40));
                    reg(c, "water", "item", rng.int(0, 20));
                }
                if (rng.chance(10, 100)) { reg(c, "biomass", "creature", rng.int(50, 300)); reg(c, "water", "creature", rng.int(10, 50)); }
            } else {
                const cave = d >= 2 && rng.chance(6, 100);
                for (let s = 0; s < (cave ? 3 : STRATA); s++) {
                    let cls = "stone";
                    if (rng.chance(8, 100)) cls = "fe_ore";
                    else if (d >= 2 && rng.chance(5, 100)) cls = "cu_ore";
                    else if (d >= 3 && rng.chance(3, 100)) cls = "ag_ore";
                    else if (d >= 3 && rng.chance(2, 100)) cls = "au_ore";
                    else if (d >= 4 && rng.chance(2, 100)) cls = "pt_ore";
                    else if (d >= 2 && rng.chance(2, 100)) cls = "gem";
                    else if (rng.chance(3, 100)) cls = "sediment";
                    reg(c, cls, "strata", SLICE_CAP[cls]);
                }
                if (cave) reg(c, "water", "fluid", rng.int(1, 70));
                if (d >= 4 && rng.chance(1, 100)) reg(c, "lava", "fluid", rng.int(5, 50));
            }
        }
        if (rng.chance(3, 100)) for (let z = g + 1; z <= Math.min(g + 6, zMax); z++) reg(world.get(x, y, z, true), "stone", "object", rng.int(200, 1500));   // towers
    }
    for (let i = 0; i < 60; i++) {   // birds in the high sky
        const z = rng.int(Math.max(zMin, zMax - 5), zMax);
        reg(world.get(rng.int(0, W - 1), rng.int(0, W - 1), z, true), "biomass", "creature", rng.int(5, 40));
    }
}

//---- operations -------------------------------------------------------------------------------------------------------

function pickCell(run, pred, tries) {
    const cells = run.world.cells, n = tries || 24;
    for (let i = 0; i < n; i++) { const c = cells[run.rng.next() % cells.length]; if (pred(c)) return c; }
    return null;
}
function amountOf(run, cls, avail) { const d = DEN(cls), units = Math.floor(avail / d); return units < 1 ? 0 : d * run.rng.int(1, units); }
function neighbour(run, c, dzs) {
    let dx = run.rng.int(-1, 1), dy = run.rng.int(-1, 1), dz = run.rng.pick(dzs);
    if (!dx && !dy && !dz) dz = -1;
    return [c.x + dx, c.y + dy, c.z + dz];
}
// One transform in place: take from (cls, form), put into (cls2, form2) in the same cell, tell the ledger.
function inPlace(pairs, cause) {
    return run => {
        const ok = (c, p) => have(c, p[0], p[1]) >= DEN(p[0]);
        const c = pickCell(run, c => pairs.some(p => ok(c, p)));
        if (!c) return false;
        const opts = pairs.filter(p => ok(c, p)), p = opts[run.rng.next() % opts.length];
        const n = take(c, p[0], p[1], amountOf(run, p[0], have(c, p[0], p[1])));
        put(c, p[2], p[3], n);
        run.ledger.transform(p[0], p[1], p[2], p[3], n, cause);
        if (ORES.indexOf(p[0]) >= 0 && p[2] !== p[0]) run.oreOut[p[0]] += n;   // smelting: the only way ore leaves its class
        return true;
    };
}
const DECAYING = ["stone", "wood", "fe_metal", "cu_metal", "ag_metal", "au_metal", "pt_metal", "steel", "electrum"];
const RUSTING = [["fe_metal", "fe_trace"], ["cu_metal", "cu_trace"], ["ag_metal", "ag_trace"], ["steel", "fe_trace"]];
const each = (list, fn) => list.reduce((a, x) => a.concat(fn(x)), []);

function opMineStone(run, double) {
    const c = pickCell(run, c => have(c, "stone", "strata") > 0, double ? 5000 : 24);
    if (!c) return false;
    const n = take(c, "stone", "strata", amountOf(run, "stone", have(c, "stone", "strata")));
    const q = double ? n : run.rng.int(0, n), spoil = n - q;
    put(c, "stone", "item", double ? 2 * q : q);   // fault double_yield: the world gets twice what the ledger books
    put(c, "rubble", "strata", spoil);
    run.ledger.transform("stone", "strata", "stone", "item", q, "mine:quarry");
    run.ledger.transform("stone", "strata", "rubble", "strata", spoil, "mine:spoil");
    return true;
}
function opFire(run, deleteItems) {
    const fuel = [["wood", "object"], ["wood", "item"], ["wood", "ruin"], ["wood", "strata"], ["biomass", "object"], ["biomass", "item"]];
    const c = pickCell(run, c => fuel.some(p => have(c, p[0], p[1]) > 0), deleteItems ? 5000 : 24);
    if (!c) return false;
    const opts = fuel.filter(p => have(c, p[0], p[1]) > 0), p = opts[run.rng.next() % opts.length];
    const n = take(c, p[0], p[1], amountOf(run, p[0], have(c, p[0], p[1])));
    const ash = Math.floor(n / 10), char = n - ash;
    if (!deleteItems) { put(c, "ash", "strata", ash); put(c, "charcoal", "strata", char); }   // fault fire_deletes_items: nothing left
    run.ledger.transform(p[0], p[1], "ash", "strata", ash, "fire:burnout");
    run.ledger.transform(p[0], p[1], "charcoal", "strata", char, "fire:burnout");
    return true;
}
function opErode(run) {
    const c = pickCell(run, c => have(c, "soil", "strata") > 0);
    if (!c) return false;
    const n = take(c, "soil", "strata", amountOf(run, "soil", have(c, "soil", "strata")));
    const [x, y, z] = neighbour(run, c, [-1, 0]);
    run.ledger.transform("soil", "strata", "sediment", "strata", n, "erosion:transport");
    if (run.world.inBounds(x, y, z)) put(run.world.get(x, y, z, true), "sediment", "strata", n);
    else sink(run, "world-edge", "sediment", "strata", n, "erosion:off_edge");
    return true;
}
function opWaterFlow(run) {
    const c = pickCell(run, c => have(c, "water", "fluid") > 0);
    if (!c) return false;
    const n = take(c, "water", "fluid", amountOf(run, "water", have(c, "water", "fluid")));
    const [x, y, z] = neighbour(run, c, [-1, -1, 0]);   // gravity first
    if (run.world.inBounds(x, y, z)) put(run.world.get(x, y, z, true), "water", "fluid", n);   // a move: no ledger call
    else sink(run, "world-edge", "water", "fluid", n, "flow:off_edge");
    return true;
}
function opCreatureMove(run) {
    const c = pickCell(run, c => have(c, "biomass", "creature") > 0);
    if (!c) return false;
    const b = take(c, "biomass", "creature", have(c, "biomass", "creature")), w = take(c, "water", "creature", have(c, "water", "creature"));
    const [x, y, z] = neighbour(run, c, [-1, 0, 0, 1]);
    if (run.world.inBounds(x, y, z)) { const d = run.world.get(x, y, z, true); put(d, "biomass", "creature", b); put(d, "water", "creature", w); }
    else { sink(run, "world-edge", "biomass", "creature", b, "migration:left_map"); if (w) sink(run, "world-edge", "water", "creature", w, "migration:left_map"); }
    return true;
}
const HAULED = ["stone", "rubble", "soil", "wood", "biomass", "charcoal", "water", "gem", "steel", "electrum"].concat(each(METALS, m => [m + "_ore", m + "_metal"]));
function opHaul(run) {
    const c = pickCell(run, c => HAULED.some(k => have(c, k, "item") > 0));
    if (!c) return false;
    const opts = HAULED.filter(k => have(c, k, "item") > 0), cls = opts[run.rng.next() % opts.length];
    const [x, y, z] = neighbour(run, c, [-1, 0, 1]);
    if (!run.world.inBounds(x, y, z)) return false;
    put(run.world.get(x, y, z, true), cls, "item", take(c, cls, "item", have(c, cls, "item")));   // a move: no ledger call
    return true;
}
function opRain(run) {
    const c = pickCell(run, () => true);
    const n = run.rng.int(1, 20);
    source(run, "rain", "water", "fluid", n, "weather:rain");
    put(c, "water", "fluid", n);
    return true;
}
function opSinkFrom(name, pairs, cause) {
    return run => {
        const c = pickCell(run, c => pairs.some(p => have(c, p[0], p[1]) >= DEN(p[0])));
        if (!c) return false;
        const opts = pairs.filter(p => have(c, p[0], p[1]) >= DEN(p[0])), p = opts[run.rng.next() % opts.length];
        const n = take(c, p[0], p[1], amountOf(run, p[0], have(c, p[0], p[1])));
        sink(run, name, p[0], p[1], n, cause);
        return true;
    };
}
function opMagicSource(run) {
    const c = pickCell(run, () => true);
    if (run.rng.chance(1, 2)) { const n = run.rng.int(50, 500); source(run, "magic", "stone", "object", n, "spell:wall_of_stone"); put(c, "stone", "object", n); }
    else { const n = run.rng.int(1, 40); source(run, "magic", "water", "fluid", n, "spell:create_water"); put(c, "water", "fluid", n); }
    return true;
}
function opMigrantArrives(run) {
    const c = run.world.get(0, run.rng.int(0, W - 1), Math.min(0, run.world.zMax), true);
    const b = run.rng.int(20, 200), w = run.rng.int(5, 30);
    source(run, "world-edge", "biomass", "creature", b, "migration:arrived");
    source(run, "world-edge", "water", "creature", w, "migration:arrived");
    put(c, "biomass", "creature", b);
    put(c, "water", "creature", w);
    return true;
}
function opDebug(run) {
    const c = pickCell(run, () => true);
    if (run.rng.chance(1, 2) || have(c, "sediment", "strata") === 0) { const n = run.rng.int(1, 10); source(run, "debug-explicit", "sediment", "strata", n, "debug:test_feed"); put(c, "sediment", "strata", n); }
    else { const n = take(c, "sediment", "strata", amountOf(run, "sediment", have(c, "sediment", "strata"))); sink(run, "debug-explicit", "sediment", "strata", n, "debug:test_drain"); }
    return true;
}
function opAlloy(run) {
    const c = pickCell(run, c => have(c, "au_metal", "item") > 0 && have(c, "ag_metal", "item") > 0);
    if (!c) return false;
    const n = run.rng.int(1, Math.min(have(c, "au_metal", "item"), have(c, "ag_metal", "item")));
    take(c, "au_metal", "item", n); take(c, "ag_metal", "item", n); put(c, "electrum", "item", 2 * n);
    run.ledger.recipe("alloy.electrum", n, "smith:alloy");
    return true;
}
function opPart(run) {
    const c = pickCell(run, c => have(c, "electrum", "item") >= 2);
    if (!c) return false;
    const n = run.rng.int(1, Math.floor(have(c, "electrum", "item") / 2));
    take(c, "electrum", "item", 2 * n); put(c, "au_metal", "item", n); put(c, "ag_metal", "item", n);
    run.ledger.recipe("part.electrum", n, "smith:part");
    return true;
}

// [name, weight, fn]
const OPS = [
    ["decay_ruin", 6, inPlace(DECAYING.map(k => [k, "object", k, "ruin"]), "decay:abandoned")],
    ["ruin_to_rubble", 5, inPlace([["stone", "ruin", "rubble", "strata"]], "decay:ruin_fell")],
    ["collapse", 2, inPlace([["stone", "object", "rubble", "strata"], ["stone", "strata", "rubble", "strata"]], "collapse")],
    ["weather", 5, inPlace([["rubble", "strata", "soil", "strata"], ["rubble", "strata", "sediment", "strata"]], "decay:weather")],
    ["erode", 4, opErode],
    ["pedogenesis", 2, inPlace([["sediment", "strata", "soil", "strata"]], "decay:pedogenesis")],
    ["lithify", 2, inPlace([["sediment", "strata", "stone", "strata"]], "geology:lithify")],
    ["rust", 5, inPlace(each(RUSTING, r => ["item", "object", "ruin"].map(f => [r[0], f, r[1], "strata"])), "decay:rust")],
    ["mine_stone", 5, run => opMineStone(run, false)],
    ["mine_ore", 4, inPlace(each(ORES, o => [[o, "strata", o, "item"], [o, "object", o, "item"]]), "mine:ore")],
    ["mine_gem", 1, inPlace([["gem", "strata", "gem", "item"]], "mine:gem")],
    ["smelt", 3, inPlace(METALS.map(m => [m + "_ore", "item", m + "_metal", "item"]), "smelt")],
    ["build", 5, inPlace([["stone", "item", "stone", "object"], ["rubble", "item", "stone", "object"], ["wood", "item", "wood", "object"], ["gem", "item", "gem", "object"]]
        .concat(DECAYING.filter(k => k !== "stone" && k !== "wood").map(k => [k, "item", k, "object"])), "build")],
    ["salvage", 2, inPlace(each(DECAYING, k => [[k, "object", k, "item"], [k, "ruin", k, "item"]]).concat([["gem", "object", "gem", "item"]]), "salvage")],
    ["fire", 4, run => opFire(run, false)],
    ["ash_weather", 2, inPlace([["ash", "strata", "humus", "strata"], ["charcoal", "strata", "humus", "strata"]], "decay:weather")],
    ["water_flow", 10, opWaterFlow],
    ["freeze", 3, inPlace([["water", "fluid", "water", "ice"]], "weather:freeze")],
    ["thaw", 3, inPlace([["water", "ice", "water", "fluid"]], "weather:thaw")],
    ["rain", 3, opRain],
    ["evaporate", 3, opSinkFrom("evaporation", [["water", "fluid"]], "weather:sun")],
    ["magic_source", 1, opMagicSource],
    ["magic_sink", 1, opSinkFrom("magic", [["stone", "object"], ["water", "fluid"]], "spell:dispel_conjured")],
    ["migrant_arrives", 1, opMigrantArrives],
    ["trader_leaves", 1, opSinkFrom("world-edge", [["fe_metal", "item"], ["cu_metal", "item"], ["ag_metal", "item"], ["steel", "item"]], "trade:left_map")],
    ["grow", 4, inPlace([["humus", "strata", "biomass", "object"]], "growth")],
    ["litter", 3, inPlace([["biomass", "object", "humus", "strata"]], "litter")],
    ["harvest", 3, inPlace([["biomass", "object", "biomass", "item"]], "harvest")],
    ["eat", 3, inPlace([["biomass", "item", "biomass", "creature"]], "eat")],
    ["die", 2, inPlace([["biomass", "creature", "humus", "strata"]], "death:remains")],
    ["butcher", 1, inPlace([["biomass", "creature", "biomass", "item"]], "butcher")],
    ["fell", 2, inPlace([["biomass", "object", "wood", "item"]], "fell")],
    ["chop", 1, inPlace([["wood", "strata", "wood", "item"]], "chop")],
    ["rot", 3, inPlace([["wood", "item", "humus", "strata"], ["wood", "ruin", "humus", "strata"], ["wood", "strata", "humus", "strata"], ["biomass", "item", "humus", "strata"]], "decay:rot")],
    ["kiln", 1, inPlace([["wood", "item", "charcoal", "item"]], "kiln")],
    ["forge", 1, inPlace([["fe_metal", "item", "steel", "item"], ["steel", "item", "fe_metal", "item"]], "forge")],
    ["dig_fill", 2, inPlace([["soil", "strata", "soil", "item"], ["soil", "item", "soil", "strata"], ["rubble", "strata", "rubble", "item"], ["rubble", "item", "rubble", "strata"]], "earthwork")],
    ["drink", 2, inPlace([["water", "fluid", "water", "creature"], ["water", "item", "water", "creature"], ["water", "fluid", "water", "item"]], "drink")],
    ["excrete", 2, inPlace([["water", "creature", "water", "fluid"], ["water", "item", "water", "fluid"]], "excrete")],
    ["solidify", 1, inPlace([["lava", "fluid", "stone", "strata"]], "lava:solidify")],
    ["haul", 6, opHaul],
    ["creature_move", 5, opCreatureMove],
    ["alloy", 1, opAlloy],
    ["part", 1, opPart],
    ["debug", 1, opDebug]
];
const WEIGHT = OPS.reduce((a, o) => a + o[1], 0);
function pickOp(rng) { let r = rng.next() % WEIGHT; for (const o of OPS) { if (r < o[1]) return o; r -= o[1]; } return OPS[0]; }

//---- faults (each applied once, right after operation number --fault-at) ----------------------------------------------

const FAULTS = {
    // a world write the ledger never hears of (a writer without a hook)
    unreported_mutation: run => { const c = pickCell(run, c => have(c, "stone", "strata") >= 100, 5000); put(c, "stone", "item", take(c, "stone", "strata", 100)); },
    // the DEUS_Ecology ore sprout (audit F-03): stone becomes ore in the world
    ore_created: run => { const c = pickCell(run, c => have(c, "stone", "strata") >= 500, 5000); put(c, "fe_ore", "strata", take(c, "stone", "strata", 500)); },
    // the same sprout, reported to the ledger: the ledger itself refuses it
    ore_via_ledger: run => { run.ledger.transform("stone", "strata", "fe_ore", "strata", 1, "ecology:sprout"); },
    delete_one_unit: run => { const c = pickCell(run, c => Object.keys(c.bag).length > 0, 5000), k = Object.keys(c.bag).sort()[0]; if (--c.bag[k] === 0) delete c.bag[k]; },
    create_one_unit: run => { const c = pickCell(run, () => true); c.bag["stone|item"] = (c.bag["stone|item"] || 0) + 1; },
    // DEUS_Fire.js:442: burned items are deleted, while the ledger books ash and charcoal
    fire_deletes_items: run => { opFire(run, true); },
    // the quarry that pays twice (audit LAND-1)
    double_yield: run => { opMineStone(run, true); }
};

function checkpoint(run) {
    const rc = recount(run.world), fam = familiesOf(rc), problems = [];
    for (const f of FAMILIES) {
        const exp = run.start[f] + run.tally.src[f] - run.tally.snk[f];
        if (fam[f] !== exp) problems.push((FINITE.indexOf(f) >= 0 ? "ELEMENT " : "MASS ") + f + ": counted " + fam[f] + ", expected " + exp + " (start " + run.start[f] + " + sources " + run.tally.src[f] + " - sinks " + run.tally.snk[f] + ")");
    }
    for (const o of ORES) {
        const n = classTotal(rc, o), exp = run.startOre[o] - run.oreOut[o];
        if (n > run.lastOre[o]) problems.push("ORE_INCREASED " + o + ": " + run.lastOre[o] + " -> " + n);
        if (n > exp) problems.push("ORE_APPEARED " + o + ": counted " + n + ", start " + run.startOre[o] + " - smelted or sunk " + run.oreOut[o] + " = " + exp);
        else if (n < exp) problems.push("ORE_LOST " + o + ": counted " + n + ", expected " + exp);
        run.lastOre[o] = n;
    }
    try { run.ledger.assertBalanced(rc); } catch (e) { problems.push("AUDIT " + String(e.message).slice(0, 400)); }
    const iv = run.ledger.closeInterval();
    if (!iv.ok) problems.push("IDENTITY interval " + iv.index + " delta(total) != sources - sinks");
    run.checkpoints++;
    if (problems.length) { run.failure = { at: run.performed, checks: problems }; return false; }
    return true;
}
function begin(opts) {
    const run = newRun(opts);
    generate(run);
    run.ledger.seal();
    const rc = recount(run.world);
    run.start = familiesOf(rc);
    run.startCls = {};
    for (const c of Object.keys(COMP).sort()) run.startCls[c] = classTotal(rc, c);
    for (const o of ORES) run.startOre[o] = run.lastOre[o] = classTotal(rc, o);
    const alloc = run.world.chunks.size;
    run.genStats = { cells: run.world.cells.length, chunks: alloc };
    checkpoint(run);   // right after seal: the generator's own bookkeeping must balance
    return run;
}
function advance(run, target) {
    const o = run.opts;
    while (!run.failure && run.performed < target) {
        if (++run.attempts > o.ops * 20) { run.failure = { at: run.performed, checks: ["STALLED: too many skipped operations"] }; break; }
        const op = pickOp(run.rng);
        let did;
        try { did = op[2](run); } catch (e) { run.failure = { at: run.performed + 1, checks: ["LEDGER_REFUSED " + (e.code || "") + " in " + op[0] + ": " + String(e.message).slice(0, 300)] }; break; }
        if (!did) { run.skipped++; continue; }
        run.performed++;
        run.counts[op[0]]++;
        if (o.fault && run.performed === o.faultAt) {
            try { FAULTS[o.fault](run); } catch (e) { run.failure = { at: run.performed, checks: ["LEDGER_REFUSED " + (e.code || "") + " in fault " + o.fault + ": " + String(e.message).slice(0, 300)] }; break; }
        }
        if (run.performed % o.k === 0) checkpoint(run);
    }
    if (!run.failure && run.performed === o.ops && o.ops % o.k !== 0) checkpoint(run);
    return run;
}
function freeze(run) {
    return JSON.stringify({ ledger: run.ledger.snapshot(), world: run.world.serialize(), rng: run.rng.s, counts: run.counts, performed: run.performed, skipped: run.skipped,
        attempts: run.attempts, checkpoints: run.checkpoints, tally: run.tally, oreOut: run.oreOut, start: run.start, startCls: run.startCls, startOre: run.startOre, lastOre: run.lastOre, genStats: run.genStats });
}
function thaw(opts, text) {
    const d = JSON.parse(text), run = newRun(opts);
    run.ledger.restore(d.ledger);
    run.world = World.parse(d.world);
    run.rng.s = d.rng;
    for (const k of ["counts", "performed", "skipped", "attempts", "checkpoints", "tally", "oreOut", "start", "startCls", "startOre", "lastOre", "genStats"]) run[k] = d[k];
    return run;
}
function result(run) { return { ledger: run.ledger.checksum(), world: worldChecksum(run.world), counts: JSON.stringify(run.counts), tally: JSON.stringify(run.tally) + JSON.stringify(run.oreOut) }; }

//=======================================================================================================================
// Output

const num = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
let passed = 0, failed = 0;
function report(name, good, detail) {
    if (good) passed++; else failed++;
    console.log((good ? "PASS " : "FAIL ") + name + (detail ? (good ? " (" + detail + ")" : ": " + detail) : ""));
}
function runName(o) { return "longrun_seed_" + o.seed + (o.zMin === -16 && o.zMax === 15 ? "" : "_z" + o.zMin + ".." + o.zMax); }
function fixtureKey(o) { return "seed" + o.seed + "_z" + o.zMin + ".." + o.zMax + "_ops" + o.ops + "_k" + o.k; }

function printRun(run, ms) {
    const o = run.opts, rc = recount(run.world), endFam = familiesOf(rc);
    console.log("== seed " + o.seed + ", layers " + o.zMin + ".." + o.zMax + " (" + (o.zMax - o.zMin + 1) + "), " + num(o.ops) + " operations, recount every " + num(o.k) +
        (o.fault ? ", FAULT " + o.fault + " after operation " + o.faultAt : "") + " ==");
    const bands = BANDS.map(b => {
        let n = 0;
        for (const k of run.world.chunks.keys()) { const z = Math.floor(k / (CHUNKS_PER_SIDE * CHUNKS_PER_SIDE)) + o.zMin; if (z >= b[1] && z <= b[2]) n++; }
        return b[0] + " " + n;
    });
    const possible = (o.zMax - o.zMin + 1) * CHUNKS_PER_SIDE * CHUNKS_PER_SIDE;
    console.log("  world: after generation " + num(run.genStats.cells) + " cells in " + run.genStats.chunks + " chunks; now " + num(run.world.cells.length) + " cells in " +
        run.world.chunks.size + " of " + possible + " possible chunks (" + bands.join(", ") + ")");
    console.log("  class totals, start -> end (mass units; water in depth units):");
    const cls = Object.keys(COMP).sort(), cols = [];
    for (const c of cls) cols.push(c + " " + num(run.startCls[c]) + " -> " + num(classTotal(rc, c)));
    for (let i = 0; i < cols.length; i += 4) console.log("    " + cols.slice(i, i + 4).map(s => s.padEnd(38)).join(""));
    console.log("  family totals, start + sources - sinks = end:");
    for (const f of FAMILIES) console.log("    " + (f + ":").padEnd(9) + num(run.start[f]) + " + " + num(run.tally.src[f]) + " - " + num(run.tally.snk[f]) + " = " + num(endFam[f]) +
        (FINITE.indexOf(f) >= 0 ? "  (finite)" : ""));
    console.log("  ore totals at the end: " + ORES.map(x => x + " " + num(classTotal(rc, x))).join(", "));
    const ops = Object.keys(run.counts).sort().map(k => k + "=" + num(run.counts[k]));
    console.log("  operations: " + ops.join(" "));
    console.log("  operations performed " + num(run.performed) + ", skipped draws " + num(run.skipped) + ", checkpoints " + run.checkpoints + " (seal, every " + num(o.k) + ", end)");
    console.log("  checksums: ledger " + run.ledger.checksum() + ", world " + worldChecksum(run.world) + "; run time " + ms + " ms");
}
function timed(fn) { const t = process.hrtime.bigint(); const r = fn(); return [r, Number((process.hrtime.bigint() - t) / 1000000n)]; }
function optsOf(seed, extra) {
    return Object.assign({ seed, ops: 100000, k: 1000, zMin: -16, zMax: 15, fault: null, faultAt: 0 }, extra || {});
}
function oneRun(o) {
    const [run, ms] = timed(() => advance(begin(o), o.ops));
    printRun(run, ms);
    const f = run.failure;
    report(runName(o), !f, f ? "at operation " + f.at + ": " + f.checks.join(" | ") : num(run.performed) + " operations, " + run.checkpoints + " recounts balanced");
    return run;
}

//=======================================================================================================================

const T0 = process.hrtime.bigint();
console.log("WG.65.15 long-run ledger harness; node " + process.version + "; geometry: cell " + CELL_FT + " ft, layer " + LAYER_FT + " ft = " + STRATA + " slices x " + SLICE_FT +
    " ft, chunk " + CHUNK + "x" + CHUNK + " cells, area " + W + "x" + W + " cells");

if (ARGS.child) {
    const seeds = String(ARGS.seeds || "7").split(",").map(Number);
    const extra = { ops: Number(ARGS.ops || 20000), k: Number(ARGS.k || 1000) };
    if (ARGS.zmin !== undefined) extra.zMin = Number(ARGS.zmin);
    if (ARGS.zmax !== undefined) extra.zMax = Number(ARGS.zmax);
    if (ARGS.fault) { if (!FAULTS[ARGS.fault]) { console.log("FAIL unknown fault " + ARGS.fault); process.exit(2); } extra.fault = ARGS.fault; extra.faultAt = Number(ARGS["fault-at"] || 7777); }
    for (const s of seeds) oneRun(optsOf(s, extra));
} else {
    // 1. Long runs: three seeds at 32 layers, one at the 9-layer test range (ADR-003 §15.2).
    const plans = [optsOf(1), optsOf(2), optsOf(3), optsOf(4, { zMin: -4, zMax: 4 })];
    const results = {};
    for (const o of plans) { const run = oneRun(o); results[fixtureKey(o)] = run.failure ? null : result(run); }

    // 2. Determinism: each run again from scratch gives identical checksums, operation counts and flows.
    for (const o of plans) {
        const first = results[fixtureKey(o)];
        const again = result(advance(begin(o), o.ops));
        const same = first && again.ledger === first.ledger && again.world === first.world && again.counts === first.counts && again.tally === first.tally;
        report("determinism_" + runName(o), same, same ? "second run: ledger " + again.ledger + ", world " + again.world : "first " + JSON.stringify(first) + " second " + JSON.stringify(again));
    }

    // 3. Continuity (ADR-003 §10.7): run(N) == restore(snapshot(run(k))) + run(N - k), checksum-exact.
    {
        const o = optsOf(2), first = results[fixtureKey(o)];
        const half = advance(begin(o), 50000), text = freeze(half);
        const resumed = result(advance(thaw(o, text), o.ops));
        const same = first && resumed.ledger === first.ledger && resumed.world === first.world && resumed.counts === first.counts;
        report("continuity_longrun_seed_2_snapshot_at_50000", same, same ? "snapshot " + num(text.length) + " bytes; resumed run ends at ledger " + resumed.ledger + ", world " + resumed.world : JSON.stringify(resumed));
    }

    // 4. Pinned checksums: the same numbers on any machine and in any later run of this code.
    if (ARGS["write-fixture"]) {
        const out = { task: "WG.65.15", note: "Final checksums of tools/sim/test_ledger_longrun.js runs. Regenerate with --write-fixture only when the ledger, its defaults or the harness change on purpose.", runs: results };
        fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
        fs.writeFileSync(FIXTURE, JSON.stringify(out, null, 2) + "\n");
        console.log("wrote " + path.relative(process.cwd(), FIXTURE));
    }
    {
        let fx = null;
        try { fx = JSON.parse(fs.readFileSync(FIXTURE, "utf8")); } catch (e) { fx = null; }
        if (!fx) report("fixture_checksums_match", false, "no fixture at " + FIXTURE);
        else {
            const bad = [];
            for (const k of Object.keys(results)) {
                const a = results[k], b = fx.runs[k];
                if (!a || !b || a.ledger !== b.ledger || a.world !== b.world || a.counts !== b.counts) bad.push(k);
            }
            report("fixture_checksums_match", bad.length === 0, bad.length ? "differs: " + bad.join(", ") : Object.keys(results).map(k => k + " " + results[k].ledger + "/" + results[k].world).join("; "));
        }
    }

    // 5. Faults: each child run must exit non-zero with a named check that fires at or after the fault.
    const child = extra => cp.spawnSync(process.execPath, [__filename, "--child", "--seeds=7", "--ops=20000"].concat(extra), { encoding: "utf8", timeout: 300000 });
    {
        const r = child([]);
        const line = (r.stdout || "").split("\n").find(l => /^(PASS|FAIL) longrun_seed_7/.test(l)) || "";
        report("fault_control_clean_child", r.status === 0 && /^PASS/.test(line), "exit " + r.status + ": " + line.slice(0, 160));
    }
    const EXPECT = [
        ["unreported_mutation", /AUDIT/],
        ["ore_created", /ORE_APPEARED fe_ore/],
        ["ore_via_ledger", /LEDGER_REFUSED E_ORE_OUTPUT/],
        ["delete_one_unit", /(MASS|ELEMENT) \w+: counted/],
        ["create_one_unit", /MASS mineral: counted/],
        ["fire_deletes_items", /MASS organic: counted/],
        ["double_yield", /MASS mineral: counted/]
    ];
    for (const [name, re] of EXPECT) {
        const r = child(["--fault=" + name, "--fault-at=7777"]);
        const line = (r.stdout || "").split("\n").find(l => /^FAIL longrun_seed_7/.test(l)) || "";
        const at = Number((/at operation (\d+)/.exec(line) || [])[1]);
        const good = r.status === 1 && re.test(line) && at >= 7777 && at <= 8000 && (name !== "unreported_mutation" || /AUDIT/.test(line));
        report("fault_" + name + "_detected", good, "exit " + r.status + ", " + line.replace(/^FAIL /, "").slice(0, 330));
    }
}

const secs = Number((process.hrtime.bigint() - T0) / 1000000n) / 1000;
console.log("run time " + secs.toFixed(1) + " s");
console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
