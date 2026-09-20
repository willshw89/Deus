"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const factionsSource = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Factions.js"), "utf8");
const colonistsSource = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Colonists.js"), "utf8");

let passed = 0;
let failed = 0;

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS population_growth.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL population_growth.${name}: ${e.message}`);
    }
}

function createFixture(opts = {}) {
    const units = [];
    const items = [];
    const objects = [];
    const jobs = [];
    let frame = 100;
    let nextId = 1;

    const colony = {
        version: 2,
        factionId: "player",
        siteId: 1,
        site: { x: 25, y: 25 },
        area: { x: 0, y: 0 },
        z: 0,
        radius: 6,
        plan: [],
        stockpiles: [],
        log: []
    };

    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function() {};
    function Window_Base() {}
    Window_Base.prototype.loadWindowskin = function() {};
    function Scene_Map() {}
    Scene_Map.prototype.update = function() {};
    const SceneManager = { _scene: null };
    const ImageManager = {
        loadSystem: () => ({ isReady: () => true, addLoadListener: () => {} }),
        loadFace: () => ({ isReady: () => true }),
        loadCharacter: () => ({ isReady: () => true })
    };
    function Bitmap(w, h) {
        this.width = w || 1;
        this.height = h || 1;
        this.context = {
            getImageData: () => ({ data: new Uint8Array(4) }),
            putImageData: () => {},
            save: () => {},
            restore: () => {},
            fillRect: () => {},
            beginPath: () => {},
            rect: () => {},
            fill: () => {},
            stroke: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {}
        };
        this._baseTexture = { update: () => {} };
    }
    Bitmap.prototype.blt = function() {};
    Bitmap.prototype.isReady = function() { return true; };
    Bitmap.prototype.destroy = function() {};

    const ColorManager = {
        normalColor: () => "#ffffff",
        systemColor: () => "#ffcc00",
        textColor: () => "#ffffff"
    };

    const listeners = new Map();
    const Events = {
        on: (ev, fn) => {
            if (!listeners.has(ev)) listeners.set(ev, []);
            listeners.get(ev).push(fn);
        },
        off: (ev, fn) => {
            if (!listeners.has(ev)) return;
            listeners.set(ev, listeners.get(ev).filter(x => x !== fn));
        },
        emit: (ev, ...args) => {
            const list = (listeners.get(ev) || []).slice();
            for (const fn of list) {
                try { fn(...args); } catch (e) { console.error(e); }
            }
        }
    };

    const ctx = {
        window: {},
        console,
        Math,
        Number,
        String,
        Object,
        Array,
        Set,
        Map,
        Infinity,
        Game_Map,
        Scene_Boot,
        Window_Base,
        Scene_Map,
        SceneManager,
        ImageManager,
        Bitmap,
        ColorManager,
        Input: { keyMapper: {}, isTriggered: () => false, isPressed: () => false },
        TouchInput: { isTriggered: () => false },
        PluginManager: { registerCommand: () => {}, parameters: () => ({}) },
        DataManager: { extractSaveContents: () => {} },
        $ufTime: { hour: opts.hour !== undefined ? opts.hour : 12, day: 1, monthIndex: 0, year: 1, dateString: "1:0:1" },
        $ufWorldCatalog: JSON.parse(fs.readFileSync(path.join(__dirname, "../game/data/UF_WorldCatalog.json"), "utf8"))
    };
    ctx.window = ctx;

    function mulberry32(a) {
        return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash32(...parts) {
        let h = 2166136261 >>> 0;
        for (const p of parts) {
            h ^= (p | 0);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h;
    }

    const World = {
        _frame: 100,
        mulberry32,
        hash32,
        units: () => units,
        unit: id => units.find(u => u.id === id) || null,
        addUnit: u => {
            u.id = u.id || nextId++;
            units.push(u);
            return u;
        },
        removeUnit: id => {
            const idx = units.findIndex(u => u.id === id);
            if (idx >= 0) return units.splice(idx, 1)[0];
            return null;
        },
        eventOf: () => ({ setImage: () => {} }),
        state: {
            seed: 12345,
            size: 50,
            areasX: 1,
            areasY: 1,
            startArea: { x: 0, y: 0 },
            colony,
            history: {
                sites: [
                    { id: 1, name: "Oakhaven", kind: "camp", faction: "player", area: { x: 0, y: 0 }, x: 25, y: 25, z: 0, ruined: false }
                ]
            }
        }
    };

    const Jobs = {
        _jobs: jobs,
        isWaterAt: () => false,
        standable: () => true,
        create: spec => {
            const j = { id: nextId++, state: "active", ...spec };
            jobs.push(j);
            return j;
        },
        of: uid => jobs.find(j => j.assigned === uid && (j.state === "active" || j.state === "travel" || j.state === "work")) || null,
        cancel: id => {
            const j = jobs.find(x => x.id === id);
            if (j) j.state = "cancelled";
        },
        handler: () => ({ verb: "do" }),
        describe: j => j ? `${j.type} #${j.id}` : "idle"
    };

    const Items = {
        inventoryOf: uid => items.filter(it => it.owner === uid),
        find: () => [],
        count: () => 0,
        type: id => (ctx.$ufWorldCatalog.items.types.find(t => t.id === id) || null)
    };

    const Objects = {
        types: () => ctx.$ufWorldCatalog.objects,
        type: id => ctx.$ufWorldCatalog.objects.find(o => o.id === id) || null,
        typeId: id => (ctx.$ufWorldCatalog.objects.find(o => o.id === id) ? id : null),
        findIn: () => [],
        atIn: () => null
    };

    const History = {
        siteById: id => World.state.history.sites.find(s => s.id === id) || null,
        homeSite: () => World.state.history.sites[0]
    };

    const Time = {
        ticks: () => frame++,
        tick: () => frame++
    };

    const Visuals = {
        barks: [],
        bark: (ev, text, duration) => {
            Visuals.barks.push({ text, duration });
        }
    };

    const Households = {
        reconciled: 0,
        reconcile: () => { Households.reconciled++; },
        roomForPair: () => ({ cells: [{ x: 25, y: 25 }], spots: [{ x: 25, y: 25 }, { x: 26, y: 25 }] }),
        formPair: (u1, u2) => {
            u1.data.partnerId = u2.id;
            u2.data.partnerId = u1.id;
        }
    };

    const SettlementPillars = {
        rostersAssigned: 0,
        assignSkillRoster: () => { SettlementPillars.rostersAssigned++; }
    };

    const UF = {
        Events,
        World,
        Jobs,
        Items,
        Objects,
        History,
        Time,
        Visuals,
        Households,
        SettlementPillars
    };
    ctx.window.UF = UF;

    vm.createContext(ctx);
    vm.runInContext(factionsSource, ctx);
    vm.runInContext(colonistsSource, ctx);

    // Initialize player faction
    const factionsState = ctx.window.UF.Factions.generate(World.state);
    factionsState.list[0].population = 0; // reset to track accurately in tests

    return { ctx, UF, World, colony };
}

// ----------------------------------------------------------------------------
// Test 1: Mathematical Logistic Curve for Conception
// ----------------------------------------------------------------------------
check("conception_chance_logistic_curve", () => {
    const { UF } = createFixture();
    const C = UF.Colonists;

    // Rapid expansion stage (< 20): 95%
    assert.strictEqual(C.conceptionChance(0), 0.95, "pop 0 should be 95%");
    assert.strictEqual(C.conceptionChance(10), 0.95, "pop 10 should be 95%");
    assert.strictEqual(C.conceptionChance(19), 0.95, "pop 19 should be 95%");

    // Linear decline from 20 to 100: at pop 50 -> 0.95 - (30/80)*0.45 = 0.78125
    const at50 = C.conceptionChance(50);
    assert.ok(Math.abs(at50 - 0.78125) < 1e-4, `pop 50 expected ~0.781, got ${at50}`);

    // At pop 100: exactly 50%
    assert.strictEqual(C.conceptionChance(100), 0.50, "pop 100 should be exactly 50%");

    // Quadratic falloff from 100 to 200: C(P) = 0.50 * ((200 - P) / 100)^2
    // Pop 125 -> 0.50 * (75/100)^2 = 0.50 * 0.5625 = 0.28125
    const at125 = C.conceptionChance(125);
    assert.ok(Math.abs(at125 - 0.28125) < 1e-4, `pop 125 expected ~0.281, got ${at125}`);

    // Pop 150 -> 0.50 * (50/100)^2 = 0.50 * 0.25 = 0.125
    const at150 = C.conceptionChance(150);
    assert.ok(Math.abs(at150 - 0.125) < 1e-4, `pop 150 expected 0.125, got ${at150}`);

    // Pop 175 -> 0.50 * (25/100)^2 = 0.50 * 0.0625 = 0.03125
    const at175 = C.conceptionChance(175);
    assert.ok(Math.abs(at175 - 0.03125) < 1e-4, `pop 175 expected 0.03125, got ${at175}`);

    // Pop 195 -> 0.50 * (5/100)^2 = 0.50 * 0.0025 = 0.00125 (~0.1%)
    const at195 = C.conceptionChance(195);
    assert.ok(Math.abs(at195 - 0.00125) < 1e-4, `pop 195 expected 0.00125, got ${at195}`);

    // Carrying capacity ceiling: exactly 0.0% at >= 200
    assert.strictEqual(C.conceptionChance(200), 0.0, "pop 200 should be exactly 0.0%");
    assert.strictEqual(C.conceptionChance(250), 0.0, "pop 250 should be exactly 0.0%");
});

// ----------------------------------------------------------------------------
// Test 2: Twin Rate Scaling
// ----------------------------------------------------------------------------
check("twin_chance_scaling", () => {
    const { UF } = createFixture();
    const C = UF.Colonists;

    assert.strictEqual(C.twinChance(10), 0.15, "pop 10 twin chance should be 15%");
    assert.strictEqual(C.twinChance(39), 0.15, "pop 39 twin chance should be 15%");
    assert.strictEqual(C.twinChance(40), 0.05, "pop 40 twin chance should be 5%");
    assert.strictEqual(C.twinChance(79), 0.05, "pop 79 twin chance should be 5%");
    assert.strictEqual(C.twinChance(80), 0.0, "pop 80 twin chance should be 0%");
    assert.strictEqual(C.twinChance(150), 0.0, "pop 150 twin chance should be 0%");
});

// ----------------------------------------------------------------------------
// Test 3: Post-Partum Cooldown & Gestation Scaling
// ----------------------------------------------------------------------------
check("cooldown_and_gestation_scaling", () => {
    const { UF } = createFixture();
    const C = UF.Colonists;

    // Post-partum: 45s (<50), 60s..120s (50..100), 120s..300s (100..200)
    assert.strictEqual(C.postPartumCooldownSeconds(20), 45, "pop 20 cooldown should be 45s");
    assert.strictEqual(C.postPartumCooldownSeconds(50), 60, "pop 50 cooldown should be 60s");
    assert.strictEqual(C.postPartumCooldownSeconds(75), 90, "pop 75 cooldown should be 90s");
    assert.strictEqual(C.postPartumCooldownSeconds(100), 120, "pop 100 cooldown should be 120s");
    assert.strictEqual(C.postPartumCooldownSeconds(150), 210, "pop 150 cooldown should be 210s");
    assert.strictEqual(C.postPartumCooldownSeconds(200), 300, "pop 200 cooldown should be 300s");

    // Gestation: 45s (<50), 60s (>=50)
    assert.strictEqual(C.gestationSeconds(30), 45, "pop 30 gestation should be 45s");
    assert.strictEqual(C.gestationSeconds(50), 60, "pop 50 gestation should be 60s");
    assert.strictEqual(C.gestationSeconds(120), 60, "pop 120 gestation should be 60s");
});

// ----------------------------------------------------------------------------
// Test 4: Immigration Wave Size & Probability Mechanics
// ----------------------------------------------------------------------------
check("immigration_wave_probabilities", () => {
    const { UF } = createFixture();
    const C = UF.Colonists;

    // Probabilities
    assert.strictEqual(C.immigrationChance(20), 0.80, "pop 20 immigration chance should be 80%");
    assert.strictEqual(C.immigrationChance(60), 0.50, "pop 60 immigration chance should be 50%");
    assert.strictEqual(C.immigrationChance(120), 0.20, "pop 120 immigration chance should be 20%");
    assert.strictEqual(C.immigrationChance(180), 0.0, "pop 180 immigration chance should be 0%");
    assert.strictEqual(C.immigrationChance(200), 0.0, "pop 200 immigration chance should be 0%");

    // Wave sizes
    const sizeLow = C.immigrationWaveSize(20);
    assert.ok(sizeLow >= 2 && sizeLow <= 4, `pop 20 wave size expected 2-4, got ${sizeLow}`);
    const sizeMid = C.immigrationWaveSize(70);
    assert.ok(sizeMid >= 1 && sizeMid <= 2, `pop 70 wave size expected 1-2, got ${sizeMid}`);
    const sizeHigh = C.immigrationWaveSize(130);
    assert.strictEqual(sizeHigh, 1, `pop 130 wave size should be 1`);
    assert.strictEqual(C.immigrationWaveSize(185), 0, `pop 185 wave size should be 0`);
});

// ----------------------------------------------------------------------------
// Test 5: End-to-End Immigrant Spawning on Perimeter & Integration
// ----------------------------------------------------------------------------
check("spawn_immigrants_perimeter_and_integration", () => {
    const { UF, colony } = createFixture();
    const C = UF.Colonists;
    const F = UF.Factions.get(colony.factionId);
    F.population = 0;

    const immigrants = C.spawnImmigrants(colony, 3);
    assert.strictEqual(immigrants.length, 3, "should spawn exactly 3 immigrants");

    // Verify properties of immigrants
    for (const u of immigrants) {
        assert.strictEqual(u.data.faction, colony.factionId, "faction must match settlement");
        assert.strictEqual(u.data.species, F.species, "species must match faction species");
        assert.ok(u.data.age >= 18 && u.data.age <= 29, `immigrant age must be young adult 18-29, got ${u.data.age}`);
        assert.strictEqual(u.data.stage, "adult", "immigrant stage must be adult");
        assert.ok(u.image && u.image.characterName, `must have character image: ${u.image && u.image.characterName}`);

        // Perimeter check: distance from site center (x: 25, y: 25)
        const dist = Math.hypot(u.x - colony.site.x, u.y - colony.site.y);
        assert.ok(dist >= colony.radius, `immigrant should spawn near or outside perimeter (radius: ${colony.radius}), got dist: ${dist.toFixed(1)}`);

        // Check thought
        const arrivalThought = u.data.thoughts && u.data.thoughts.find(t => /hopeful immigrant/i.test(t.text));
        assert.ok(arrivalThought, "immigrant must receive hopeful arrival thought");
        assert.strictEqual(arrivalThought.strength, 12, "arrival thought strength should be +12");

        // Check facets and skills
        assert.ok(u.data.facets && Object.keys(u.data.facets).length >= 7, "must have facets generated");
        assert.ok(u.data.skills && Object.keys(u.data.skills).length >= 6, "must have skills generated");
    }

    // Verify faction census and tracking
    assert.strictEqual(F.population, 3, `faction population should be incremented to 3, got ${F.population}`);
    assert.strictEqual(C.factionPopulation(colony.factionId), 3, "census should reflect 3 living people");

    // Verify household reconciliation and skill roster hooks fired
    assert.ok(UF.Households.reconciled > 0, "Households.reconcile() must be called");
    assert.ok(UF.SettlementPillars.rostersAssigned > 0, "SettlementPillars.assignSkillRoster() must be called");

    // Verify bark message was triggered
    assert.ok(UF.Visuals.barks.length >= 3, "each immigrant should emit a glad arrival bark");
});

// ----------------------------------------------------------------------------
// Test 6: Carrying Capacity Capping at Population 200
// ----------------------------------------------------------------------------
check("carrying_capacity_capping_at_200", () => {
    const { UF, colony, World } = createFixture();
    const C = UF.Colonists;
    const F = UF.Factions.get(colony.factionId);

    // Pre-populate settlement to 198 colonists
    for (let i = 0; i < 198; i++) {
        World.addUnit({
            id: 1000 + i,
            name: `Colonist_${i}`,
            area: { x: 0, y: 0 },
            x: 25,
            y: 25,
            z: 0,
            dir: 2,
            data: {
                kind: "colonist",
                faction: colony.factionId,
                species: "human",
                gender: i % 2 === 0 ? "male" : "female",
                age: 22,
                stage: "adult",
                dead: false
            }
        });
    }
    F.population = 198;
    assert.strictEqual(C.factionPopulation(colony.factionId), 198, "initial pop should be 198");

    // Attempt to spawn wave of 5: should be clamped to 2 (200 - 198)
    const wave1 = C.spawnImmigrants(colony, 5);
    assert.strictEqual(wave1.length, 2, "wave must be clamped to 2 to reach exactly 200");
    assert.strictEqual(C.factionPopulation(colony.factionId), 200, "pop should now be exactly 200");

    // Next wave when pop = 200: must return 0 units
    const wave2 = C.spawnImmigrants(colony, 3);
    assert.strictEqual(wave2.length, 0, "no immigrants should spawn when pop is at 200");
    assert.strictEqual(C.factionPopulation(colony.factionId), 200, "pop must stay capped at 200");

    // Reproduction check when pop = 200: stepFactionReproduction should skip faction
    const reproResult = C.stepFactionReproduction();
    assert.strictEqual(reproResult.conceived, 0, "no conceptions should occur at pop 200");

    // Direct handleMated check when pop = 200: conceptionChance is 0.0
    const m = World.units().find(u => u.data.gender === "male");
    const f = World.units().find(u => u.data.gender === "female");
    delete f.data.pregnancy;
    delete f.data.lastMatedDate;
    delete m.data.lastMatedDate;
    C.onMated(m, f);
    assert.strictEqual(f.data.pregnancy, undefined, "female must not conceive when pop >= 200");
});

// ----------------------------------------------------------------------------
// Test 7: Population Dip Reactivation Below 200
// ----------------------------------------------------------------------------
check("carrying_capacity_equilibrium_reactivation", () => {
    const { UF, colony, World } = createFixture();
    const C = UF.Colonists;
    const F = UF.Factions.get(colony.factionId);

    // Populate to 200
    for (let i = 0; i < 200; i++) {
        World.addUnit({
            id: 2000 + i,
            name: `Colonist_${i}`,
            area: { x: 0, y: 0 },
            x: 25,
            y: 25,
            z: 0,
            dir: 2,
            data: {
                kind: "colonist",
                faction: colony.factionId,
                species: "human",
                gender: i % 2 === 0 ? "male" : "female",
                age: 22,
                stage: "adult",
                dead: false
            }
        });
    }
    F.population = 200;
    assert.strictEqual(C.conceptionChance(C.factionPopulation(colony.factionId)), 0.0, "conception chance at 200 is 0.0");

    // Simulate loss of 3 colonists (e.g. death/removal)
    const deadUnits = World.units().slice(0, 3);
    for (const d of deadUnits) {
        World.removeUnit(d.id);
        F.population--;
    }
    assert.strictEqual(C.factionPopulation(colony.factionId), 197, "pop should now be 197");

    // Conception chance should immediately reactivate > 0
    const revivedChance = C.conceptionChance(C.factionPopulation(colony.factionId));
    assert.ok(revivedChance > 0, `conception chance should reactivate, got ${revivedChance}`);

    // Immigrants should be allowed up to 3 to restore carrying capacity
    const recoveryWave = C.spawnImmigrants(colony, 10);
    assert.strictEqual(recoveryWave.length, 3, `should spawn exactly 3 to restore to 200, got ${recoveryWave.length}`);
    assert.strictEqual(C.factionPopulation(colony.factionId), 200, "pop restored to 200");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
}
