'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HOUSEHOLDS_PATH = path.join(ROOT, 'game', 'js', 'plugins', 'UF_Households.js');
const source = fs.readFileSync(HOUSEHOLDS_PATH, 'utf8');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
    if (condition) {
        passed++;
        console.log(`PASS ${name}${detail ? ' - ' + detail : ''}`);
    } else {
        failed++;
        console.error(`FAIL ${name}${detail ? ' - ' + detail : ''}`);
    }
}

function fixture() {
    const objects = new Map(), claims = new Map(), doors = new Map(), blocked = new Set(), events = {};
    const types = Object.fromEntries([
        ['wall_wood', ['building', 'wall'], false],
        ['door_wood', ['building', 'door'], false],
        ['floor_straw', ['building', 'bed'], true],
        ['campfire', ['building', 'fire'], false],
        ['stockpile', ['building', 'stockpile'], true],
        ['floor_wood', ['building', 'floor'], true],
        ['floor_stone', ['building', 'floor'], true],
        ['kitchen_hearth', ['building', 'fire', 'kitchen'], false],
        ['kitchen_counter', ['building', 'kitchen'], false],
        ['kitchen_pantry', ['building', 'kitchen', 'stockpile'], false],
        ['dining_table', ['building', 'dining'], false],
        ['dining_bench', ['building', 'dining'], true],
        ['bed_wood', ['building', 'bed'], true],
        ['chest_wood', ['building', 'stockpile'], false],
        ['shop_counter', ['building', 'shop'], false],
        ['workbench', ['building', 'workplace'], false],
        ['smithy', ['building', 'workplace'], false],
        ['furnace', ['building', 'workplace'], false],
        ['bowyer_bench', ['building', 'workplace'], false],
        ['fletcher_bench', ['building', 'workplace'], false],
        ['tanning_rack', ['building', 'workplace'], false],
        ['apothecary_bench', ['building', 'workplace'], false],
        ['weapon_rack', ['building', 'stockpile'], false],
        ['crib', ['building', 'bed'], true]
    ].map(([id, tags, passable]) => [id, { id, tags, passable, build: { items: { log: 1 } } }]));

    const k = (a, x, y) => `${a.x},${a.y},${a.z || 0}:${x},${y}`;
    const refKey = r => k({ x: r.area.x, y: r.area.y, z: r.z === undefined ? r.area.z : r.z }, r.x, r.y);
    const st = { size: 128, units: {}, colony: {} };
    const contexts = {};
    const World = {
        state: st,
        unit: id => st.units[id] || null,
        units: () => Object.values(st.units),
        walkable: (ax, ay, x, y, opts) => !blocked.has(k({ x: ax, y: ay, z: opts.z }, x, y)),
        reachable: () => true
    };
    const Events = {
        on: (name, fn) => (events[name] || (events[name] = [])).push(fn),
        emit: (name, ...args) => (events[name] || []).forEach(fn => fn(...args))
    };
    let assignments = 0;
    const Ownership = {
        ownerOf: r => claims.get(refKey(r)) || null,
        bedOf: u => u.data.bed || null,
        assignBed: (u, r) => {
            const old = claims.get(refKey(r));
            if (old && (old.kind !== 'unit' || old.id !== u.id)) return null;
            assignments++;
            claims.set(refKey(r), { kind: 'unit', id: u.id });
            u.data.bed = { ...r };
            return r;
        }
    };
    const Doors = {
        stateAt: (a, x, y) => {
            const kk = k(a, x, y);
            if (!doors.has(kk)) doors.set(kk, { faction: 999, heldOpen: false });
            return doors.get(kk);
        },
        at: (a, x, y) => ({ state: Doors.stateAt(a, x, y) }),
        isOpen: (a, x, y) => !!Doors.stateAt(a, x, y).open,
        canUnitPass: (u, d) => d.state.faction === u.data.faction && !d.state.locked
    };
    const sandbox = {
        console,
        Scene_Boot: function() {},
        DataManager: { extractSaveContents: () => {} },
        $ufTime: { year: 1, monthIndex: 0, day: 1 },
        UF: {
            World,
            Events,
            Ownership,
            Doors,
            Time: { ticks: () => 100 },
            Objects: {
                type: id => types[id],
                atIn: (a, x, y) => objects.get(k(a, x, y)) || null
            },
            Jobs: { isWaterAt: () => false },
            Colonists: {
                state: u => contexts[u && u.data.site],
                culture: () => ({ wall: 'wall_wood', door: 'door_wood', floor: { kind: 'floor_wood', item: 'log' } })
            }
        }
    };
    sandbox.Scene_Boot.prototype.start = () => {};
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    new sandbox.Scene_Boot().start();

    function add(id, opts = {}) {
        const z = opts.z || 0, site = opts.site || `site${z}`, faction = opts.faction || 1;
        contexts[site] = contexts[site] || {
            siteId: site,
            factionId: faction,
            area: { x: 0, y: 0 },
            z,
            site: { x: 64, y: 64 },
            plan: []
        };
        const u = {
            id,
            name: `TEST_${id}`,
            area: { x: 0, y: 0 },
            z,
            x: 63 + (id % 3),
            y: 63,
            data: {
                kind: 'person',
                ai: 'settlement',
                site,
                faction,
                species: 'human',
                age: 25,
                home: { area: { x: 0, y: 0 }, z, x: 64, y: 64 },
                facets: { industriousness: 70, bravery: 65, curiosity: 50, sociability: 50 },
                skills: {},
                ...opts.data
            }
        };
        st.units[id] = u;
        return u;
    }

    const H = sandbox.UF.Households;

    function complete(h, steps) {
        const c = contexts[h.siteId];
        for (const s of steps) {
            if (!types[s.build]) continue;
            for (const [dx, dy] of s.cells) {
                objects.set(k({ ...h.area, z: h.z }, c.site.x + dx, c.site.y + dy), types[s.build]);
            }
        }
        H.reconcile();
    }

    return { H, add, st, contexts, objects, claims, doors, blocked, Events, sandbox, k, refKey, types, complete, World };
}

console.log('=== Test Suite: Family Compounds, Progressive Home Construction & Personality Shops ===\n');

// 1. Initial 5 Bootstrap Steps
{
    const f = fixture();
    const a = f.add(1), b = f.add(2);
    const h = f.H.formPair(a, b);
    const steps = f.H.planSteps(a);

    check('initial_bootstrap_steps_count', steps.length === 5, `Expected 5 base steps, got ${steps.length}`);
    check('initial_bootstrap_steps_types',
        steps[0].build === 'wall_wood' && steps[1].build === 'door_wood' && steps[2].build === 'floor_straw' &&
        steps[3].build === 'campfire' && steps[4].build === 'stockpile',
        'Steps match wall, door, bed, hearth, stockpile');
}

// 2. Progressive Domestic Improvements upon base completion
{
    const f = fixture();
    const a = f.add(1), b = f.add(2);
    const h = f.H.formPair(a, b);
    const baseSteps = f.H.planSteps(a);
    f.complete(h, baseSteps);

    // After base built, planSteps appends progressive domestic improvements
    const upgradedSteps = f.H.planSteps(a);
    const stepBuilds = upgradedSteps.map(s => s.build);

    check('progressive_floors_added', stepBuilds.includes('floor_wood'), 'Wood flooring step added');
    check('progressive_kitchen_appointments_added',
        stepBuilds.includes('kitchen_counter') && stepBuilds.includes('kitchen_pantry') && stepBuilds.includes('kitchen_hearth'),
        'Kitchen counter, pantry, and cooking hearth added');
    check('progressive_dining_appointments_added',
        stepBuilds.includes('dining_table') && stepBuilds.includes('dining_bench'),
        'Dining table and bench added');
    check('progressive_bed_upgrade_added', stepBuilds.includes('bed_wood'), 'Wooden bed upgrade step added');
    check('progressive_chest_added', stepBuilds.includes('chest_wood'), 'Storage chest step added');
}

// 3. Personality-Driven Callings & Shop Setups
{
    // Case A: Blacksmith (High industriousness + bravery + smithing)
    const fA = fixture();
    const smith = fA.add(1, {
        data: {
            facets: { industriousness: 85, bravery: 80, curiosity: 40, sociability: 30 },
            skills: { smithing: { level: 20 } }
        }
    });
    const smithPair = fA.add(2);
    const hA = fA.H.formPair(smith, smithPair);
    fA.complete(hA, fA.H.planSteps(smith));
    const smithSteps = fA.H.planSteps(smith);
    const smithBuilds = smithSteps.map(s => s.build);

    check('calling_blacksmith_identified', smith.data.calling && smith.data.calling.id === 'blacksmith',
        `Calling is ${smith.data.calling && smith.data.calling.title}`);
    check('calling_blacksmith_station_and_shop_planned',
        smithBuilds.includes('smithy') && smithBuilds.includes('shop_counter'),
        'Smithy workstation and shop counter planned');

    // Case B: Bowyer & Fletcher (High natureAffinity + patience + fletching)
    const fB = fixture();
    const bowyer = fB.add(3, {
        data: {
            facets: { natureAffinity: 90, patience: 85, curiosity: 40, industriousness: 50 },
            skills: { fletching: { level: 15 } }
        }
    });
    const bowyerPair = fB.add(4);
    const hB = fB.H.formPair(bowyer, bowyerPair);
    fB.complete(hB, fB.H.planSteps(bowyer));
    const bowyerSteps = fB.H.planSteps(bowyer);
    const bowyerBuilds = bowyerSteps.map(s => s.build);

    check('calling_bowyer_identified', bowyer.data.calling && bowyer.data.calling.id === 'bowyer',
        `Calling is ${bowyer.data.calling && bowyer.data.calling.title}`);
    check('calling_bowyer_station_and_shop_planned',
        bowyerBuilds.includes('bowyer_bench') && bowyerBuilds.includes('shop_counter'),
        'Bowyer bench and shop counter planned');

    // Case C: Apothecary (High curiosity + natureAffinity + healing)
    const fC = fixture();
    const healer = fC.add(5, {
        data: {
            facets: { curiosity: 90, natureAffinity: 85, industriousness: 50, sociability: 50 },
            skills: { healing: { level: 18 } }
        }
    });
    const healerPair = fC.add(6);
    const hC = fC.H.formPair(healer, healerPair);
    fC.complete(hC, fC.H.planSteps(healer));
    const healerSteps = fC.H.planSteps(healer);
    const healerBuilds = healerSteps.map(s => s.build);

    check('calling_apothecary_identified', healer.data.calling && healer.data.calling.id === 'apothecary',
        `Calling is ${healer.data.calling && healer.data.calling.title}`);
    check('calling_apothecary_station_and_shop_planned',
        healerBuilds.includes('apothecary_bench') && healerBuilds.includes('shop_counter'),
        'Apothecary bench and shop counter planned');
}

// 4. Character Sets Verified in game/img/characters/
{
    const expectedProps = [
        '!$UF_Bed_Wood.png',
        '!$UF_Chest_Wood.png',
        '!$UF_Dining_Table.png',
        '!$UF_Dining_Bench.png',
        '!$UF_Kitchen_Counter.png',
        '!$UF_Kitchen_Pantry.png',
        '!$UF_Kitchen_Hearth.png',
        '!$UF_Shop_Counter.png',
        '!$UF_Apothecary_Bench.png'
    ];
    const charDir = path.join(ROOT, 'game', 'img', 'characters');
    const allExist = expectedProps.every(f => fs.existsSync(path.join(charDir, f)) && fs.existsSync(path.join(charDir, f.replace('.png', '.json'))));
    check('all_9_prop_charsets_deployed', allExist, 'All 9 character sets and JSON sidecars deployed');
}

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
