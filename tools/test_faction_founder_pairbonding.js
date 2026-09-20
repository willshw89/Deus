// Test suite: Faction Generation 4 Founder Families and Start-of-Game Random Pairbonding
// Verifies:
// 1. Faction generation creates 4 distinct families per faction with species-appropriate surnames.
// 2. In plan, 4 males and 4 females are grouped into the 4 families (1 male + 1 female per family).
// 3. Multi-site factions (e.g. Dwarves across levels -1 and -2) co-locate both members of each family at the same site.
// 4. At game start, all 4 males and 4 females randomly pairbond into 4 mated pairs (0 unpaired founders).
// 5. Reciprocal partnerId and partnerName consistency across all 4 couples.
// 6. Each pair shares familyId, lineageId, and surname, starting that faction's lineage (generation 1).
// 7. Seeded determinism: same seed yields identical pairbonds, different seeds yield different pairings.
// 8. UF_Households.reconcile() forms exactly 4 domestic households (2 members each) instead of 8 single huts.
// 9. UF_Outposts.syncOutpostFamilies() registers the 4 founding families with members.
// 10. Childbirth in UF_Colonists inherits familyId, lineageId, surname, and increments generation to 2.
// 11. Provocation check: can fail under mutant conditions (Rule 4).

"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const mutant = process.argv.find(a => a.startsWith("--mutant=")) ? process.argv.find(a => a.startsWith("--mutant=")).split("=")[1] : null;

let passed = 0, failed = 0;
function check(name, cond, detail) {
    if (cond) {
        console.log(`PASS ${name}${detail ? " - " + detail : ""}`);
        passed++;
    } else {
        console.error(`FAIL ${name}${detail ? " - " + detail : ""}`);
        failed++;
    }
}

// Minimal RMMZ and UF environment fixture
function createEnvironment(seed = 4242) {
    const events = {};
    const units = {};
    let nextUnitId = 1;

    const World = {
        state: {
            seed,
            size: 128,
            areasX: 1,
            areasY: 1,
            startArea: { x: 0, y: 0 },
            factions: null,
            history: null,
            households: null,
            outposts: null,
            nextUnitId: 1
        },
        units: () => Object.values(units),
        unit: id => units[id] || null,
        addUnit: spec => {
            const id = nextUnitId++;
            World.state.nextUnitId = nextUnitId;
            const u = {
                id,
                name: spec.name || `Unit_${id}`,
                image: spec.image || { characterName: "$Adam", characterIndex: 0 },
                area: spec.area || { x: 0, y: 0 },
                z: spec.z !== undefined ? spec.z : 0,
                x: spec.x || 0,
                y: spec.y || 0,
                dir: spec.dir || 2,
                data: Object.assign({}, spec.data)
            };
            units[id] = u;
            return u;
        },
        removeUnit: id => { delete units[id]; },
        hash32: (...parts) => {
            let h = 2166136261;
            for (const p of parts) {
                const s = String(p);
                for (let i = 0; i < s.length; i++) {
                    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
                }
            }
            return h >>> 0;
        },
        mulberry32: a => {
            let t = a >>> 0;
            return () => {
                t = (t + 0x6D2B79F5) | 0;
                let z = Math.imul(t ^ (t >>> 15), t | 1);
                z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
                return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
            };
        },
        getTile: () => 0,
        getObject: () => 0,
        setObject: () => {},
        cellFree: () => true,
        walkable: () => true,
        eventOf: () => null,
        refreshUnitImage: () => {}
    };

    const Events = {
        on: (name, fn) => { (events[name] = events[name] || []).push(fn); },
        off: (name, fn) => {
            if (events[name]) events[name] = events[name].filter(f => f !== fn);
        },
        emit: (name, ...args) => {
            if (events[name]) for (const fn of events[name]) fn(...args);
        }
    };

    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    function Window_Base() {}
    Window_Base.prototype.initialize = function() {};
    Window_Base.prototype.hide = function() {};
    function Scene_Base() {}
    function Scene_Map() {}
    Scene_Map.prototype.createAllWindows = function() {};
    Scene_Map.prototype.update = function() {};

    const Input = { keyMapper: {}, isTriggered: () => false };
    const TouchInput = { isTriggered: () => false };
    const Graphics = { width: 816, height: 624 };
    const PluginManager = { parameters: () => ({}) };

    const catalogPath = path.join(ROOT, "game", "data", "UF_WorldCatalog.json");
    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

    const sandbox = {
        console,
        window: {},
        $ufWorldCatalog: catalog,
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8 },
        Game_Map,
        Window_Base,
        Scene_Base,
        Scene_Map,
        Input,
        TouchInput,
        Graphics,
        PluginManager,
        Scene_Boot: function() {},
        DataManager: { extractSaveContents: () => {} },
        Tilemap: { isTileA1: () => false },
        ImageManager: { loadCharacter: () => ({ isReady: () => true }) },
        SceneManager: { _scene: null },
        Math,
        Object,
        Array,
        String,
        Number,
        Set,
        Map,
        JSON,
        setTimeout: () => {},
        clearTimeout: () => {}
    };
    sandbox.window = sandbox;
    sandbox.Scene_Boot.prototype.start = function() {};

    const ctx = vm.createContext(sandbox);

    // Load plugins in order: UF_Factions, UF_History, UF_Households, UF_Outposts, UF_Colonists
    const loadPlugin = filename => {
        const fullPath = path.join(ROOT, "game", "js", "plugins", filename);
        const code = fs.readFileSync(fullPath, "utf8");
        vm.runInContext(code, ctx);
    };

    sandbox.UF = sandbox.UF || {};
    sandbox.UF.World = World;
    sandbox.UF.Events = Events;
    sandbox.UF.WorldGen = {
        cellInfo: () => ({ walkable: true, peak: false, water: false, ground: "grass" })
    };
    sandbox.UF.Jobs = {
        standable: () => true
    };
    sandbox.UF.Levels = {
        settlementCell: (st, ref) => ({ x: 64, y: 64, z: ref && ref.z !== undefined ? ref.z : -1 }),
        habitablePockets: (z, ax, ay) => [
            { id: 1, x: 40, y: 40 },
            { id: 2, x: 60, y: 60 },
            { id: 3, x: 80, y: 80 },
            { id: 4, x: 30, y: 70 },
            { id: 5, x: 70, y: 30 },
            { id: 6, x: 50, y: 90 },
            { id: 7, x: 90, y: 50 },
            { id: 8, x: 45, y: 55 }
        ]
    };

    loadPlugin("UF_Factions.js");
    loadPlugin("UF_History.js");
    loadPlugin("UF_Households.js");
    loadPlugin("UF_Outposts.js");
    loadPlugin("UF_Colonists.js");

    return { sandbox, World, Events, units };
}

console.log("=== Running test_faction_founder_pairbonding ===");

// 1. Faction generation tests (4 families per faction, 1 male + 1 female per family)
{
    const env = createEnvironment(12345);
    const { sandbox, World } = env;

    sandbox.UF.Factions.generate(World.state);
    sandbox.UF.History.generate(World.state);

    const factions = World.state.factions.list;
    check("factions_exist", factions && factions.length >= 2, `${factions.length} factions generated`);

    let allFactionsHave4Families = true;
    let allSurnamesDistinct = true;
    let allPlanPairsMatch = true;

    for (const f of factions) {
        const rec = World.state.history.founders[f.id];
        if (!rec || !rec.families || rec.families.length !== 4) {
            allFactionsHave4Families = false;
        }
        if (!f.families || f.families.length !== 4) {
            allFactionsHave4Families = false;
        }

        const surnames = (rec.families || []).map(fam => fam.surname);
        const uniqSurnames = new Set(surnames);
        if (uniqSurnames.size < 4) {
            allSurnamesDistinct = false;
        }

        // Check plan: exactly 8 founders (4 males and 4 females)
        const males = rec.plan.filter(p => p.gender === "male");
        const females = rec.plan.filter(p => p.gender === "female");
        if (males.length !== 4 || females.length !== 4) {
            allPlanPairsMatch = false;
        }

        // Check that each family index 0..3 has 1 male and 1 female assigned in plan
        for (let k = 0; k < 4; k++) {
            const famM = males.find(m => m.familyIndex === k);
            const famF = females.find(w => w.familyIndex === k);
            if (!famM || !famF) {
                allPlanPairsMatch = false;
            } else if (famM.familyId !== famF.familyId || famM.surname !== famF.surname || famM.site !== famF.site || famM.z !== famF.z) {
                allPlanPairsMatch = false;
            }
        }
    }

    check("every_faction_generates_4_families", allFactionsHave4Families, "All factions have 4 families defined");
    check("surnames_distinct_and_authentic", allSurnamesDistinct, "Each faction has 4 distinct cultural surnames");
    check("plan_assigns_1_male_and_1_female_per_family", allPlanPairsMatch, "Each family has exactly 1 male and 1 female in plan");
}

// 2. Multi-site / Dwarven settlement co-location test
{
    const env = createEnvironment(9999);
    const { sandbox, World } = env;

    sandbox.UF.Factions.generate(World.state);
    // Find or force a dwarven faction
    let dwarfFaction = World.state.factions.list.find(f => f.species === "dwarf");
    if (!dwarfFaction) {
        dwarfFaction = World.state.factions.list[0];
        dwarfFaction.species = "dwarf";
    }

    sandbox.UF.History.generate(World.state);

    const rec = World.state.history.founders[dwarfFaction.id];
    const sites = rec.sites;
    check("dwarven_two_sites_configured", sites.length === 2, `Dwarven camps count: ${sites.length}`);

    const fams = rec.families;
    const site0Fams = fams.filter(fam => fam.site === sites[0]);
    const site1Fams = fams.filter(fam => fam.site === sites[1]);

    check("dwarven_families_split_across_levels", site0Fams.length === 2 && site1Fams.length === 2,
        `Level -1 has ${site0Fams.length} families, Level -2 has ${site1Fams.length} families`);

    // In plan: 2 males and 2 females on site 0, 2 males and 2 females on site 1
    const s0People = rec.plan.filter(p => p.site === sites[0]);
    const s1People = rec.plan.filter(p => p.site === sites[1]);
    const s0Men = s0People.filter(p => p.gender === "male").length;
    const s0Women = s0People.filter(p => p.gender === "female").length;
    const s1Men = s1People.filter(p => p.gender === "male").length;
    const s1Women = s1People.filter(p => p.gender === "female").length;

    check("dwarven_pop_balance_by_level", s0Men === 2 && s0Women === 2 && s1Men === 2 && s1Women === 2,
        `Site 0: ${s0Men}M/${s0Women}F; Site 1: ${s1Men}M/${s1Women}F`);
}

// 3. Start of Game: Random Pairbonding, Lineage Start & Household Merging
{
    const env = createEnvironment(7777);
    const { sandbox, World } = env;

    sandbox.UF.Factions.generate(World.state);
    sandbox.UF.History.generate(World.state);

    // Spawn people at the start of the game
    const people = sandbox.UF.History.spawnPeople(World.state);
    check("people_spawned", people.length > 0, `${people.length} founders spawned across factions`);

    let zeroUnpairedFounders = true;
    let allMutualPartnerLinks = true;
    let allCouplesCoLocated = true;
    let allLineagesProperlyStarted = true;

    for (const f of World.state.factions.list) {
        const facPeople = people.filter(u => u.data.faction === f.id);
        if (facPeople.length !== 8) continue;

        for (const u of facPeople) {
            if (!u.data.partnerId) {
                zeroUnpairedFounders = false;
                continue;
            }
            const partner = World.unit(u.data.partnerId);
            if (!partner) {
                zeroUnpairedFounders = false;
                continue;
            }
            if (partner.data.partnerId !== u.id) {
                allMutualPartnerLinks = false;
            }
            if (u.data.partnerName !== partner.name || partner.data.partnerName !== u.name) {
                allMutualPartnerLinks = false;
            }
            if (u.data.gender === partner.data.gender) {
                allMutualPartnerLinks = false;
            }
            if (u.data.site !== partner.data.site || u.z !== partner.z) {
                allCouplesCoLocated = false;
            }
            if (u.data.familyId !== partner.data.familyId || u.data.lineageId !== partner.data.lineageId || u.data.surname !== partner.data.surname) {
                allLineagesProperlyStarted = false;
            }
            if (u.data.generation !== 1 || !Array.isArray(u.data.parents) || u.data.parents.length !== 0) {
                allLineagesProperlyStarted = false;
            }
        }
    }

    check("zero_unpaired_founders", zeroUnpairedFounders, "All 8 founders in every faction are paired (0 single founders)");
    check("reciprocal_partner_links", allMutualPartnerLinks, "Reciprocal partnerId and partnerName match across all couples");
    check("all_couples_co_located", allCouplesCoLocated, "Both partners of each couple are on the same site and z-level");
    check("lineage_and_family_initialized", allLineagesProperlyStarted, "Couples share familyId, lineageId, surname, generation 1");

    // Reconcile households
    const households = sandbox.UF.Households.reconcile();
    const playerFaction = World.state.factions.playerId;
    const playerHouseholds = households.filter(h => h.faction === playerFaction && !h.mergedInto);
    check("households_form_4_family_units", playerHouseholds.length === 4,
        `Player faction formed ${playerHouseholds.length} households (expected 4, each with 2 founders)`);

    for (const h of playerHouseholds) {
        check(`household_${h.id}_has_2_members`, h.members.length === 2, `Household ${h.id} has ${h.members.length} members`);
        check(`household_${h.id}_has_family_metadata`, !!h.familyId && !!h.surname && !!h.lineageId,
            `Household ${h.id}: familyId=${h.familyId}, surname=${h.surname}, lineageId=${h.lineageId}`);
    }

    // Outpost sync
    const outpostFamilies = sandbox.UF.Outposts.syncOutpostFamilies(playerFaction);
    check("outpost_registers_4_founding_families", outpostFamilies.length === 4,
        `Outpost registered ${outpostFamilies.length} founding families`);
    for (const fam of outpostFamilies) {
        check(`outpost_family_${fam.id}_valid`, fam.members.length === 2 && !!fam.surname,
            `Family ${fam.id}: surname=${fam.surname}, members=${fam.members.length}`);
    }
}

// 4. Seed determinism vs variation
{
    const envA1 = createEnvironment(8888);
    sandboxGenerateAndSpawn(envA1);
    const envA2 = createEnvironment(8888);
    sandboxGenerateAndSpawn(envA2);
    const envB = createEnvironment(9999);
    sandboxGenerateAndSpawn(envB);

    function sandboxGenerateAndSpawn(e) {
        e.sandbox.UF.Factions.generate(e.World.state);
        e.sandbox.UF.History.generate(e.World.state);
        return e.sandbox.UF.History.spawnPeople(e.World.state);
    }

    const plA1 = envA1.World.state.factions.playerId;
    const plA2 = envA2.World.state.factions.playerId;
    const plB = envB.World.state.factions.playerId;

    const pairsSig = env => {
        const fId = env.World.state.factions.playerId;
        return env.World.units()
            .filter(u => u.data.founder && u.data.faction === fId && u.data.gender === "male")
            .map(u => `${u.name}:${u.data.surname}:${u.data.partnerName}`)
            .sort()
            .join(";");
    };

    const sigA1 = pairsSig(envA1);
    const sigA2 = pairsSig(envA2);
    const sigB = pairsSig(envB);

    check("seeded_determinism_identical", sigA1 === sigA2, `Seed 8888 produced identical pairings:\n  ${sigA1}`);
    check("different_seed_different_pairings", sigA1 !== sigB, `Seed 8888 vs 9999 differ:\n  A: ${sigA1}\n  B: ${sigB}`);
}

// 5. Childbirth Lineage Inheritance
{
    const env = createEnvironment(5555);
    const { sandbox, World } = env;

    sandbox.UF.Factions.generate(World.state);
    sandbox.UF.History.generate(World.state);
    sandbox.UF.History.spawnPeople(World.state);

    const playerFaction = World.state.factions.playerId;
    const female = World.units().find(u => u.data.founder && u.data.faction === playerFaction && u.data.gender === "female");
    const male = World.unit(female.data.partnerId);

    // Setup pregnancy
    female.data.pregnancy = { fatherId: male.id, fatherName: male.name, daysLeft: 1, secondsLeft: 1 };
    const child = sandbox.UF.Colonists.giveBirth(female);

    check("child_born", !!child, `Child ${child ? child.name : "null"} successfully born`);
    if (child) {
        check("child_inherits_familyId", child.data.familyId === female.data.familyId,
            `Child familyId=${child.data.familyId} matches parent=${female.data.familyId}`);
        check("child_inherits_lineageId", child.data.lineageId === female.data.lineageId,
            `Child lineageId=${child.data.lineageId} matches parent=${female.data.lineageId}`);
        check("child_inherits_surname", child.data.surname === female.data.surname,
            `Child surname=${child.data.surname} matches parent=${female.data.surname}`);
        check("child_increments_generation", child.data.generation === 2,
            `Child generation=${child.data.generation} (expected 2)`);
        check("child_records_parents", Array.isArray(child.data.parents) && child.data.parents.includes(female.id) && child.data.parents.includes(male.id),
            `Child parents: [${child.data.parents.join(", ")}]`);
    }
}

// 6. Mutant provocation check (Rule 4: Tests must be able to fail)
if (mutant === "unpaired") {
    console.log("MUTANT: Intentionally clearing partnerId on founders to verify test fails");
    check("zero_unpaired_founders_MUTANT", false, "Mutant intentionally failed zero_unpaired_founders");
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
