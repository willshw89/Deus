// tools/test_cooperative_building_and_offspring_pairbonding.js
// Automated verification for:
// 1. Confirmation of 1:1 founder pairbonding at creation across all factions
// 2. Cooperative sequential construction (settlers prioritize active focal house)
// 3. Adult offspring non-kin pairbonding and independent household creation
// 4. Rule 4 mutant checks

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");

const root = path.resolve(__dirname, "..");
const readPlugin = name => fs.readFileSync(path.join(root, "game/js/plugins", name + ".js"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));

const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
let colonistsCode = readPlugin("UF_Colonists");
let householdsCode = readPlugin("UF_Households");
let historyCode = readPlugin("UF_History");

if (mutant === "no_focal_bonus") {
    // Mutant: disable cooperative focal household priority boost
    colonistsCode = colonistsCode.replace("if (focal && x.step.household === focal.id)", "if (false && focal && x.step.household === focal.id)");
} else if (mutant === "allow_incest") {
    // Mutant: disable kinship guards in attemptAdulthoodPairbond
    colonistsCode = colonistsCode
        .replace("if (H && H.closeKin && H.closeKin(u, o)) return false;", "// closeKin disabled")
        .replace("if (u.data.motherId && (u.data.motherId === o.id || (o.data.motherId && u.data.motherId === o.data.motherId))) return false;", "// mother check disabled")
        .replace("if (u.data.fatherId && (u.data.fatherId === o.id || (o.data.fatherId && u.data.fatherId === o.data.fatherId))) return false;", "// father check disabled");
} else if (mutant === "no_adult_pairbond") {
    // Mutant: disable calling attemptAdulthoodPairbond on age transition
    colonistsCode = colonistsCode.replace(/attemptAdulthoodPairbond\(u\);/g, "// no pairbond");
} else if (mutant === "merge_parent_households") {
    // Mutant: force merging parental households instead of independent household creation
    householdsCode = householdsCode.replace(/const h = make\(u\);/g, "const h = merge(hu, hp);");
}

let passed = 0, failed = 0;
function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS coop_pairbond.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL coop_pairbond.${name}: ${e.stack || e.message}`);
    }
}

function createHarness() {
    const size = 64;
    const objects = new Map();
    const ground = new Map();
    const units = new Map();
    const events = new Map();
    let tick = 100;

    const zOf = r => (r && r.z !== undefined ? r.z : (r && r.area && r.area.z !== undefined ? r.area.z : 0));
    const key = (a, x, y) => `${(a && a.x) || 0},${(a && a.y) || 0},${zOf(a)}:${x},${y}`;
    const copyArea = a => ({ x: a ? a.x : 0, y: a ? a.y : 0 });

    const cat = JSON.parse(JSON.stringify(catalog));
    const types = cat.objects.map((o, i) => ({ ...o, typeId: i + 1 }));

    const W = {
        state: {
            seed: 20260920,
            size,
            area: { x: 0, y: 0 },
            startArea: { x: 0, y: 0 },
            colony: null,
            factions: {
                playerId: "player",
                list: [
                    { id: "player", species: "human", name: "Kingdom" },
                    { id: "dwarves", species: "dwarf", name: "Dwarven Clan" },
                    { id: "elves", species: "elf", name: "Elven Haven" },
                    { id: "orcs", species: "orc", name: "Orc Tribe" }
                ]
            },
            history: {
                sites: [
                    { id: 1, faction: "player", kind: "camp", area: { x: 0, y: 0 }, x: 16, y: 16, radius: 6 },
                    { id: 2, faction: "dwarves", kind: "camp", area: { x: 0, y: 0 }, x: 48, y: 16, radius: 6 },
                    { id: 3, faction: "elves", kind: "camp", area: { x: 0, y: 0 }, x: 16, y: 48, radius: 6 },
                    { id: 4, faction: "orcs", kind: "camp", area: { x: 0, y: 0 }, x: 48, y: 48, radius: 6 }
                ],
                rulers: { player: [], dwarves: [], elves: [], orcs: [] },
                founders: {}
            }
        },
        unit: id => units.get(id) || null,
        units: () => Array.from(units.values()),
        addUnit(opts) {
            const id = units.size + 1;
            const u = {
                id,
                name: opts.name || `Unit_${id}`,
                x: opts.x || 16,
                y: opts.y || 16,
                z: opts.z || 0,
                area: copyArea(opts.area || { x: 0, y: 0 }),
                dir: opts.dir || 2,
                image: opts.image || { characterName: "$UF_Human_Male_1_Walk", characterIndex: 0 },
                data: Object.assign({ needs: { hunger: 10, thirst: 10, sleep: 10 }, faction: "player" }, opts.data || {})
            };
            units.set(id, u);
            return u;
        },
        removeUnit(id) { units.delete(id); },
        currentArea: () => ({ x: 0, y: 0 }),
        viewLevel: () => ({ x: 0, y: 0, z: 0 }),
        levelOfMapId: () => ({ x: 0, y: 0, z: 0 }),
        hash32(...xs) {
            let h = 2166136261;
            for (const x of xs) {
                h ^= Number(x) || 0;
                h = Math.imul(h, 16777619);
            }
            return h >>> 0;
        },
        mulberry32(seed) {
            let s = seed >>> 0;
            return function() {
                s = (s + 0x6D2B79F5) >>> 0;
                let t = Math.imul(s ^ (s >>> 15), 1 | s);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        },
        cellFree: () => true,
        walkable(ax, ay, x, y, opts = {}) {
            if (x < 0 || y < 0 || x >= size || y >= size) return false;
            const a = { x: ax, y: ay, z: opts.z !== undefined ? opts.z : 0 };
            const o = O.atIn(a, x, y);
            return !o || o.passable === true;
        },
        findPath(a, sx, sy, gx, gy) {
            if (Math.abs(sx - gx) + Math.abs(sy - gy) <= 1) return [{ x: gx, y: gy }];
            return [{ x: sx + Math.sign(gx - sx), y: sy + Math.sign(gy - sy) }];
        },
        reachable: () => true,
        eventOf: () => null,
        refreshUnitImage: () => {},
        getTile: () => "grass"
    };

    const O = {
        types: () => types,
        type: id => types.find(t => (typeof id === "number" ? t.typeId === id : t.id === id)) || null,
        typeId: id => { const t = O.type(id); return t ? t.typeId : 0; },
        atIn: (a, x, y) => {
            const id = objects.get(key(a, x, y));
            return id ? O.type(id) : null;
        },
        typeIdIn: (a, x, y) => {
            const t = O.atIn(a, x, y);
            return t ? t.typeId : 0;
        },
        setIn: (a, x, y, id) => {
            const k = key(a, x, y);
            if (id) {
                const t = O.type(id);
                if (!t) return false;
                objects.set(k, t.id);
            } else {
                objects.delete(k);
            }
            return true;
        },
        addAt: (a, x, y, id) => O.setIn(a, x, y, id),
        findIn: (a, opts) => {
            const out = [];
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                const t = O.atIn(a, x, y);
                if (!t) continue;
                const d = Math.hypot(x - opts.near.x, y - opts.near.y);
                if (d <= (opts.radius || 20) && (!opts.id || t.id === opts.id)) {
                    out.push({ x, y, type: t, dist: d });
                }
            }
            return out.sort((p, q) => p.dist - q.dist);
        }
    };

    const J = {
        open: () => [],
        list: () => [],
        of: () => null,
        isWaterAt: () => false,
        standable: (a, x, y) => W.walkable(a.x, a.y, x, y),
        create: spec => Object.assign({ id: 100, state: "active" }, spec),
        assign: () => true
    };

    const I = {
        items: [],
        count: () => 10,
        find: () => [],
        inventoryOf: () => [],
        type: id => (cat.items && cat.items.types ? cat.items.types.find(t => t.id === id) : null),
        get: id => ({ id, type: id.startsWith("knife") ? "stone_knife" : "fiber_wrap", holder: 3 })
    };

    const ctx = {
        console,
        performance,
        window: {},
        Graphics: { frameCount: 0 },
        Scene_Boot: { prototype: { start() {} } },
        Scene_Map: { prototype: { update() {} } },
        Game_Map: class { update() {} },
        ImageManager: { loadCharacter: () => ({ isReady: () => true, width: 144, height: 192 }) },
        Bitmap: class { constructor() {} isReady() { return true; } },
        Rectangle: class { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } },
        Input: { keyMapper: {}, isTriggered: () => false, isPressed: () => false },
        TouchInput: { isTriggered: () => false },
        Window_Base: class { constructor() {} initialize() {} update() {} refresh() {} },
        Window_Selectable: class { constructor() {} initialize() {} update() {} refresh() {} setHandler() {} select() {} activate() {} deactivate() {} reselect() {} },
        Window_Command: class { constructor() {} initialize() {} update() {} refresh() {} addCommand() {} },
        PluginManager: { parameters: () => ({}) },
        $ufWorldCatalog: cat,
        UF: {
            World: W,
            Objects: O,
            Jobs: J,
            Items: I,
            Time: { ticks: () => tick },
            Events: {
                on(name, fn) {
                    if (!events.has(name)) events.set(name, []);
                    events.get(name).push(fn);
                },
                emit(name, ...args) {
                    for (const fn of events.get(name) || []) fn(...args);
                }
            },
            Factions: {
                playerId: () => "player",
                get: id => W.state.factions.list.find(f => f.id === id) || null,
                all: () => W.state.factions.list.slice()
            },
            History: {
                siteById: id => W.state.history.sites.find(s => s.id === id) || null
            },
            WorldGen: {
                cellInfo: () => ({ walkable: true, peak: false, water: false, ground: "grass" })
            },
            Levels: {
                settlementCell: (st, ref) => ({ x: 32, y: 32, z: ref && ref.z !== undefined ? ref.z : -1 }),
                habitablePockets: () => [{ id: 1, x: 32, y: 32 }]
            }
        }
    };

    ctx.window = ctx;
    vm.createContext(ctx);

    const plugins = ["UF_Factions", "UF_CultureGrowth", "UF_History", "UF_Households", "UF_Colonists"];
    for (const p of plugins) {
        let code = readPlugin(p);
        if (p === "UF_Colonists") code = colonistsCode;
        if (p === "UF_Households") code = householdsCode;
        if (p === "UF_History") code = historyCode;
        vm.runInContext(code, ctx);
    }

    return { W, O, J, I, ctx, UF: ctx.UF };
}

// ---------------------------------------------------------------------------
// TEST 1: Founder 1:1 Pairbonding Verification at Creation
// ---------------------------------------------------------------------------
check("founder_1to1_pairbonding_at_creation", () => {
    const { UF, W } = createHarness();
    const st = W.state;

    // Generate factions and history
    UF.Factions.generate(st);
    UF.History.generate(st);

    // Spawn founders across all factions
    const founders = UF.History.spawnPeople(st);
    assert.ok(founders.length >= 8, `expected at least 8 founders, got ${founders.length}`);

    // Check founders across all generated factions
    let factionsChecked = 0;
    for (const f of st.factions.list) {
        const fFounders = founders.filter(u => u.data.faction === f.id);
        if (!fFounders.length) continue;
        factionsChecked++;
        const males = fFounders.filter(u => u.data.gender === "male");
        const females = fFounders.filter(u => u.data.gender === "female");

        assert.equal(males.length, 4, `Faction ${f.id}: expected 4 males, got ${males.length}`);
        assert.equal(females.length, 4, `Faction ${f.id}: expected 4 females, got ${females.length}`);

        // Verify 1:1 mutual reciprocity
        for (const m of males) {
            assert.ok(m.data.partnerId, `Male founder ${m.name} must have partnerId`);
            const partner = females.find(fem => fem.id === m.data.partnerId);
            assert.ok(partner, `Male founder ${m.name}'s partner ${m.data.partnerId} must exist in female founders`);
            assert.equal(partner.data.partnerId, m.id, `Female founder ${partner.name} partnerId must point back to ${m.id}`);
            assert.equal(m.data.familyId, partner.data.familyId, "Married founder couple must share matching familyId");
            assert.equal(m.data.surname, partner.data.surname, "Married founder couple must share matching surname");
        }

        const partnerIds = males.map(m => m.data.partnerId);
        assert.equal(new Set(partnerIds).size, 4, `Faction ${f.id}: all 4 female partners must be distinct`);
    }
    assert.ok(factionsChecked >= 2, `expected at least 2 factions checked, got ${factionsChecked}`);
});

// ---------------------------------------------------------------------------
// TEST 2: Cooperative Sequential Construction Pacing
// ---------------------------------------------------------------------------
check("cooperative_sequential_focal_pacing", () => {
    const { UF, W, O } = createHarness();
    const H = UF.Households;
    const colony = { factionId: "player", site: { x: 16, y: 16 }, area: { x: 0, y: 0 }, z: 0 };

    // Create 3 households
    const u1 = W.addUnit({ name: "H1_M", data: { kind: "colonist", faction: "player", gender: "male", age: 25, founder: false, site: 1, home: colony } });
    const u2 = W.addUnit({ name: "H1_F", data: { kind: "colonist", faction: "player", gender: "female", age: 24, founder: false, site: 1, home: colony } });
    H.formPair(u1, u2);
    const h1 = H.of(u1);
    H.planSteps(u1);

    const u3 = W.addUnit({ name: "H2_M", data: { kind: "colonist", faction: "player", gender: "male", age: 28, founder: false, site: 1, home: colony } });
    const u4 = W.addUnit({ name: "H2_F", data: { kind: "colonist", faction: "player", gender: "female", age: 26, founder: false, site: 1, home: colony } });
    H.formPair(u3, u4);
    const h2 = H.of(u3);
    H.planSteps(u3);

    const u5 = W.addUnit({ name: "H3_M", data: { kind: "colonist", faction: "player", gender: "male", age: 30, founder: false, site: 1, home: colony } });
    const u6 = W.addUnit({ name: "H3_F", data: { kind: "colonist", faction: "player", gender: "female", age: 29, founder: false, site: 1, home: colony } });
    H.formPair(u5, u6);
    const h3 = H.of(u5);
    H.planSteps(u5);

    // Initial state: House 1 is unsheltered -> Focal household must be h1
    let focal = H.activeFocalHousehold(colony);
    assert.ok(focal, "Focal household must exist");
    assert.equal(focal.id, h1.id, `Initial focal house must be h1, got ${focal.id}`);
    assert.equal(H.isSheltered(h1), false, "h1 must not be sheltered initially");

    // Complete House 1
    for (const w of h1.home.walls) O.setIn(colony, w.x, w.y, h1.home.wall);
    for (const d of h1.home.doors) O.setIn(colony, d.x, d.y, h1.home.door);
    for (const b of h1.home.beds) O.setIn(colony, b.x, b.y, "floor_straw");
    O.setIn(colony, h1.home.hearth.x, h1.home.hearth.y, "campfire");

    assert.equal(H.isSheltered(h1), true, "h1 must be sheltered after placement");

    // Focal household must automatically advance to House 2!
    focal = H.activeFocalHousehold(colony);
    assert.equal(focal.id, h2.id, `Focal house must advance to h2 once h1 is sheltered, got ${focal.id}`);

    // Complete House 2
    for (const w of h2.home.walls) O.setIn(colony, w.x, w.y, h2.home.wall);
    for (const d of h2.home.doors) O.setIn(colony, d.x, d.y, h2.home.door);
    for (const b of h2.home.beds) O.setIn(colony, b.x, b.y, "floor_straw");
    O.setIn(colony, h2.home.hearth.x, h2.home.hearth.y, "campfire");

    assert.equal(H.isSheltered(h2), true, "h2 must be sheltered");

    // Focal household must automatically advance to House 3!
    focal = H.activeFocalHousehold(colony);
    assert.equal(focal.id, h3.id, `Focal house must advance to h3 once h2 is sheltered, got ${focal.id}`);
});

// ---------------------------------------------------------------------------
// TEST 3: Cooperative Job Scoring Priority (Neighbors Prioritize Focal House)
// ---------------------------------------------------------------------------
check("cooperative_job_scoring_priority", () => {
    const { UF, W } = createHarness();
    const H = UF.Households;
    const C = UF.Colonists;
    const colony = { factionId: "player", site: { x: 16, y: 16 }, area: { x: 0, y: 0 }, z: 0 };
    W.state.colony = Object.assign({ plan: [], stockpiles: [] }, colony);

    // H1 (focal house, unsheltered)
    const u1 = W.addUnit({ name: "Founder1", data: { kind: "colonist", faction: "player", gender: "male", age: 25, founder: false, site: 1, home: colony } });
    const u2 = W.addUnit({ name: "Founder2", data: { kind: "colonist", faction: "player", gender: "female", age: 24, founder: false, site: 1, home: colony } });
    H.formPair(u1, u2);
    const h1 = H.of(u1);
    H.planSteps(u1);

    // H2 (member u3)
    const u3 = W.addUnit({ name: "Neighbor3", data: { kind: "colonist", faction: "player", gender: "male", age: 28, founder: false, site: 1, home: colony, tier: 1, equipment: { tool: "knife_1", clothes: "wrap_1" } } });
    const u4 = W.addUnit({ name: "Neighbor4", data: { kind: "colonist", faction: "player", gender: "female", age: 26, founder: false, site: 1, home: colony, tier: 1, equipment: { tool: "knife_2", clothes: "wrap_2" } } });
    H.formPair(u3, u4);
    const h2 = H.of(u3);
    H.planSteps(u3);

    // Check effective plan for neighbor u3
    const plan = C.effectivePlan(u3);
    const h1Steps = plan.filter(s => s.household === h1.id);
    assert.ok(h1Steps.length > 0, "Neighbor u3's plan must include communal focal steps from h1");

    // Run decide for u3: u3 should pick up a job for H1 (cooperative building) rather than starting H2
    const job = C.decide(u3);
    assert.ok(job, "Colonist u3 must decide a job");
    assert.ok(job.params && job.params.household, "Job must have household parameter");
    assert.equal(job.params.household, h1.id,
        `Neighbor u3 must cooperatively work on active focal household h1, but got ${job.params.household}`);
});

// ---------------------------------------------------------------------------
// TEST 4: Adult Offspring Non-Kin Pairbonding & Independent Households
// ---------------------------------------------------------------------------
check("adult_offspring_nonkin_pairbonding", () => {
    const { UF, W } = createHarness();
    const H = UF.Households;
    const C = UF.Colonists;
    const colony = { factionId: "player", site: { x: 16, y: 16 }, area: { x: 0, y: 0 }, z: 0 };
    W.state.colony = Object.assign({ plan: [], stockpiles: [] }, colony);

    // Founder Family 1 (Snaggletooth)
    const f1m = W.addUnit({ name: "Father1", data: { kind: "colonist", faction: "player", gender: "male", age: 35, site: 1, surname: "Snaggletooth", home: colony } });
    const f1f = W.addUnit({ name: "Mother1", data: { kind: "colonist", faction: "player", gender: "female", age: 34, site: 1, surname: "Snaggletooth", home: colony } });
    H.formPair(f1m, f1f);
    const house1 = H.of(f1m);

    // Offspring of Family 1: Son1 (14) and Daughter1 (14)
    const son1 = W.addUnit({ name: "Son1", data: { kind: "colonist", faction: "player", gender: "male", age: 14, stage: "teen", site: 1, motherId: f1f.id, fatherId: f1m.id, surname: "Snaggletooth", home: colony } });
    const daughter1 = W.addUnit({ name: "Daughter1", data: { kind: "colonist", faction: "player", gender: "female", age: 14, stage: "teen", site: 1, motherId: f1f.id, fatherId: f1m.id, surname: "Snaggletooth", home: colony } });
    H.join(son1, house1);
    H.join(daughter1, house1);

    // Founder Family 2 (Ratbite)
    const f2m = W.addUnit({ name: "Father2", data: { kind: "colonist", faction: "player", gender: "male", age: 38, site: 1, surname: "Ratbite", home: colony } });
    const f2f = W.addUnit({ name: "Mother2", data: { kind: "colonist", faction: "player", gender: "female", age: 36, site: 1, surname: "Ratbite", home: colony } });
    H.formPair(f2m, f2f);
    const house2 = H.of(f2m);

    // Offspring of Family 2: Daughter2 (14)
    const daughter2 = W.addUnit({ name: "Daughter2", data: { kind: "colonist", faction: "player", gender: "female", age: 14, stage: "teen", site: 1, motherId: f2f.id, fatherId: f2m.id, surname: "Ratbite", home: colony } });
    H.join(daughter2, house2);

    // Kinship check
    assert.equal(H.closeKin(son1, daughter1), true, "Son1 and Daughter1 must be detected as close kin (siblings)");
    assert.equal(H.closeKin(son1, daughter2), false, "Son1 and Daughter2 must NOT be close kin (different founder families)");

    // At age 14, neither should pairbond
    C.updateAgeAppearance(son1);
    C.updateAgeAppearance(daughter2);
    assert.equal(son1.data.partnerId, undefined, "Teen Son1 must not pairbond at age 14");
    assert.equal(daughter2.data.partnerId, undefined, "Teen Daughter2 must not pairbond at age 14");

    // Phase 1: Son1 and Daughter1 (siblings) reach age 15 while Daughter2 is still 14
    son1.data.age = 15;
    daughter1.data.age = 15;
    C.updateAgeAppearance(son1);
    C.updateAgeAppearance(daughter1);

    // Son1 and Daughter1 are siblings: they MUST NOT pairbond with each other!
    assert.equal(son1.data.partnerId, undefined, "Son1 must NOT pairbond with sister Daughter1");
    assert.equal(daughter1.data.partnerId, undefined, "Daughter1 must NOT pairbond with brother Son1");

    // Phase 2: Daughter2 (unrelated non-kin) reaches age 15
    daughter2.data.age = 15;
    C.updateAgeAppearance(daughter2);
    C.updateAgeAppearance(son1);

    // Verify non-kin pairbonding
    assert.notEqual(son1.data.partnerId, daughter1.id, "Son1 must NOT pairbond with sibling Daughter1");
    assert.equal(son1.data.partnerId, daughter2.id, `Son1 must pairbond with non-kin Daughter2, got ${son1.data.partnerId}`);
    assert.equal(daughter2.data.partnerId, son1.id, `Daughter2 must reciprocally pairbond with Son1, got ${daughter2.data.partnerId}`);

    // Verify independent household creation
    const son1House = H.of(son1);
    const daughter2House = H.of(daughter2);
    assert.ok(son1House && daughter2House, "New couple must have household records");
    assert.equal(son1House.id, daughter2House.id, "Couple must share their own household");

    // Crucial check: Family 1 and Family 2 parental households must NOT be merged!
    const house1After = H.of(f1m);
    const house2After = H.of(f2m);
    assert.equal(house1After.id, house1.id, "Family 1 parents must remain in House 1");
    assert.equal(house2After.id, house2.id, "Family 2 parents must remain in House 2");
    assert.notEqual(son1House.id, house1.id, "Offspring household must be separate from Family 1 house");
    assert.notEqual(son1House.id, house2.id, "Offspring household must be separate from Family 2 house");
});

console.log("\n===========================================");
console.log(`TOTAL PASSES: ${passed}`);
console.log(`TOTAL FAILS:  ${failed}`);
console.log("===========================================");

if (failed > 0) {
    process.exit(1);
}
