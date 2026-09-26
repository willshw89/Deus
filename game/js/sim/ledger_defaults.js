"use strict";
// WG.65.15 default tables for the mass ledger (game/js/sim/ledger.js). Data only: no logic beyond expanding rows.
// Citations are file:line at base 9cba41ea. Full tables, meaning and hook-up notes: tasks/WG.65.15/lane-l1/LEDGER_API.md.
//
// Two axes, as in ADR-003 Rev 3 §7.8 (PROPOSED): a CLASS is a material class (stone, rubble, fe_metal, ...) and a FORM
// is where that matter is (strata, item, object, ...). Q-MASS[family] is the sum over every class of the family and
// every form. A class belongs to one FAMILY, or (an alloy) to several families by an integer composition.
//
// Units. "mu" is an integer mass unit whose size per material and per 2-ft slice is set later by SIM.40.00/SIM.40.01
// (ADR-003 §7.8 "one table per material and form, set by SIM.40.01 with WG.65.15"); it is an Owner/PM question in the
// REPORT. "du" is the fluid depth unit, 1/7 of a full cell (DEUS_Fluid.js:50 DEPTH_MAX = 7; ADR-003 §7.8 Q-WATER).

const FORMS = [
    "strata",   // matter in place in a cell's 2-ft slices, natural or deposited (rock, soil, rubble, sediment, ash beds, rust traces)
    "item",     // loose items (DEUS_Items records), ADR-003 Q-ITEM
    "object",   // placed objects and structures, including constructed (0x80) strata (DEUS_Levels.js:995), ADR-003 Q-OBJ
    "ruin",     // a failed or abandoned structure's remains before they break into rubble (decay chain, ADR-003 §17.4)
    "fluid",    // liquid volume (DEUS_Fluid), ADR-003 Q-WATER / Q-LAVA
    "ice",      // frozen water: the brief's "water (fluid, with an ice form)"; ADR-003 §7.8 "Water that freezes stays Q-MASS[water] in an ice form"
    "creature"  // matter held in creatures (food eaten, body mass, water drunk), ADR-003 §7.8 "the matter held in creatures"
];

// Families. finite: no source may add to the family unless that source row says allowFinite (none does by default).
// DEUS_ResourceRegistry.json:500-507 conservedClasses STONE, IRON, COPPER, SILVER, GOLD, PLATINUM; audit F-04 / §6 step 2
// (strata by material, loose items by material, fluid volume, biomass); FIR-3 (carbon/ash).
const FAMILIES = {
    mineral: { unit: "mu", finite: false }, // registry STONE; rock, rubble, soil mineral, sediment, lava
    organic: { unit: "mu", finite: false }, // wood, living biomass, humus, ash, charcoal (Lane R keeps ash/charcoal in ORGANIC)
    water: { unit: "du", finite: false },   // liquid water and ice
    fe: { unit: "mu", finite: true },       // registry IRON (:243); STEEL counts toward iron (:453)
    cu: { unit: "mu", finite: true },       // registry COPPER (:282)
    ag: { unit: "mu", finite: true },       // registry SILVER (:321)
    au: { unit: "mu", finite: true },       // registry GOLD (:360)
    pt: { unit: "mu", finite: true },       // registry PLATINUM (:399)
    gem: { unit: "mu", finite: true }       // VISION V83 (docs/VISION.md:94): "Finite stone, ore, gems and fossil beds ... do not respawn"
};

const METALS = ["fe", "cu", "ag", "au", "pt"];
const RUSTING = ["fe", "cu", "ag"];         // gold and platinum do not corrode (Lane R R-03.6 NOBLE row: never)

const CLASSES = {
    // mineral: the decay chain object -> ruin -> rubble -> soil/sediment -> rock (brief rule 2; ADR-003 §17.4)
    stone: { family: "mineral", forms: ["strata", "item", "object", "ruin"] },
    rubble: { family: "mineral", forms: ["strata", "item"] },
    soil: { family: "mineral", forms: ["strata", "item"] },
    sediment: { family: "mineral", forms: ["strata"] },
    lava: { family: "mineral", forms: ["fluid"] },  // DEUS_Levels.js:994 M_LAVA; the hook converts du to mu (Lane Q §9.1)
    // organic (carbon): FIR-3 wants ash and charcoal as ledger outputs
    wood: { family: "organic", forms: ["strata", "item", "object", "ruin"] },
    biomass: { family: "organic", forms: ["item", "object", "creature"] },
    humus: { family: "organic", forms: ["strata"] },  // the organic part of soil (Lane R SOIL-ORG)
    ash: { family: "organic", forms: ["strata", "item"] },
    charcoal: { family: "organic", forms: ["strata", "item"] },
    // water
    water: { family: "water", forms: ["fluid", "ice", "item", "creature"] },
    // finite
    gem: { family: "gem", forms: ["strata", "item", "object"] },
    steel: { family: "fe", forms: ["item", "object", "ruin"] },  // DEUS_ResourceRegistry.json:453
    // Electrum: "a 50/50 alloy of Gold and Silver. Its mass is conserved against the gold and silver ledgers"
    // (DEUS_ResourceRegistry.json:471). Every 2 mu of electrum is 1 mu of au and 1 mu of ag.
    electrum: { composition: { au: 1, ag: 1 }, forms: ["item", "object", "ruin"] }
};
for (const m of METALS) {
    CLASSES[m + "_ore"] = { family: m, forms: ["strata", "object", "item"], ore: true };  // object: outcrops (DEUS_Ecology.js:738)
    CLASSES[m + "_metal"] = { family: m, forms: ["item", "object", "ruin"] };
}
for (const m of RUSTING) CLASSES[m + "_trace"] = { family: m, forms: ["strata"] };  // rust, patina, tarnish: never ore

// Transform rows: [process, fromClass, fromForms, toClass, toForms]. Every (from, fromForm, to, toForm) pair is one allowed
// move. A move that is not listed (skipping or reversing a decay stage, for example) is refused. No row may output an
// ore class from another class, and from/to must have the same composition; ledger.js checks both at load.
const ROWS = [
    // mineral: quarrying, building, salvage
    ["quarry", "stone", ["strata"], "stone", ["item"]],
    ["build", "stone", ["item"], "stone", ["object"]],
    ["build", "rubble", ["item"], "stone", ["object"]],            // rubble-stone masonry (Lane Q §9.2 row 10)
    ["salvage", "stone", ["object", "ruin"], "stone", ["item"]],
    // mineral: the decay chain (object -> ruin -> rubble -> soil/sediment -> rock), collapse and blast debris
    ["decay", "stone", ["object"], "stone", ["ruin"]],
    ["break", "stone", ["strata", "object", "ruin"], "rubble", ["strata"]],   // ruin falls, collapse, blast, mining spoil
    ["pick", "rubble", ["strata"], "rubble", ["item"]],
    ["dump", "rubble", ["item"], "rubble", ["strata"]],
    ["weather", "rubble", ["strata"], "soil", ["strata"]],
    ["weather", "rubble", ["strata"], "sediment", ["strata"]],
    ["erode", "soil", ["strata"], "sediment", ["strata"]],
    ["pedogenesis", "sediment", ["strata"], "soil", ["strata"]],
    ["lithify", "sediment", ["strata"], "stone", ["strata"]],
    ["dig", "soil", ["strata"], "soil", ["item"]],
    ["fill", "soil", ["item"], "soil", ["strata"]],
    ["solidify", "lava", ["fluid"], "stone", ["strata"]],
    // organic: growth, harvest, food, death, rot
    ["grow", "humus", ["strata"], "biomass", ["object"]],
    ["litter", "biomass", ["object"], "humus", ["strata"]],
    ["harvest", "biomass", ["object"], "biomass", ["item"]],
    ["fell", "biomass", ["object"], "wood", ["item"]],
    ["eat", "biomass", ["item"], "biomass", ["creature"]],
    ["butcher", "biomass", ["creature"], "biomass", ["item"]],
    ["remains", "biomass", ["creature"], "humus", ["strata"]],
    ["rot", "biomass", ["item"], "humus", ["strata"]],
    ["chop", "wood", ["strata"], "wood", ["item"]],
    ["build", "wood", ["item"], "wood", ["object"]],
    ["salvage", "wood", ["object", "ruin"], "wood", ["item"]],
    ["decay", "wood", ["object"], "wood", ["ruin"]],
    ["rot", "wood", ["strata", "item", "ruin"], "humus", ["strata"]],
    // organic: fire (FIR-3) and residue weathering (Lane R R-04.4)
    ["burn", "wood", ["strata", "item", "object", "ruin"], "ash", ["strata"]],
    ["burn", "wood", ["strata", "item", "object", "ruin"], "charcoal", ["strata"]],
    ["burn", "biomass", ["item", "object"], "ash", ["strata"]],
    ["burn", "biomass", ["item", "object"], "charcoal", ["strata"]],
    ["burn", "charcoal", ["strata", "item"], "ash", ["strata"]],
    ["kiln", "wood", ["item"], "charcoal", ["item"]],
    ["weather", "ash", ["strata"], "humus", ["strata"]],
    ["weather", "charcoal", ["strata"], "humus", ["strata"]],
    // water
    ["freeze", "water", ["fluid"], "water", ["ice"]],
    ["thaw", "water", ["ice"], "water", ["fluid"]],
    ["fill", "water", ["fluid"], "water", ["item"]],
    ["pour", "water", ["item"], "water", ["fluid"]],
    ["drink", "water", ["fluid", "item"], "water", ["creature"]],
    ["excrete", "water", ["creature"], "water", ["fluid"]],
    // gems: they only change form
    ["mine", "gem", ["strata"], "gem", ["item"]],
    ["set", "gem", ["item"], "gem", ["object"]],
    ["unset", "gem", ["object"], "gem", ["item"]],
    // steel (counts toward iron) and electrum (only changes form; alloying and parting are recipes below)
    ["forge", "fe_metal", ["item"], "steel", ["item"]],
    ["remelt", "steel", ["item"], "fe_metal", ["item"]],
    ["build", "steel", ["item"], "steel", ["object"]],
    ["salvage", "steel", ["object", "ruin"], "steel", ["item"]],
    ["decay", "steel", ["object"], "steel", ["ruin"]],
    ["rust", "steel", ["item", "object", "ruin"], "fe_trace", ["strata"]],
    ["build", "electrum", ["item"], "electrum", ["object"]],
    ["salvage", "electrum", ["object", "ruin"], "electrum", ["item"]],
    ["decay", "electrum", ["object"], "electrum", ["ruin"]]
];
for (const m of METALS) {
    ROWS.push(["mine", m + "_ore", ["strata", "object"], m + "_ore", ["item"]]);  // ore moves form; it is never made
    ROWS.push(["smelt", m + "_ore", ["item"], m + "_metal", ["item"]]);           // ore only decreases
    ROWS.push(["build", m + "_metal", ["item"], m + "_metal", ["object"]]);
    ROWS.push(["salvage", m + "_metal", ["object", "ruin"], m + "_metal", ["item"]]);
    ROWS.push(["decay", m + "_metal", ["object"], m + "_metal", ["ruin"]]);
}
// Rust keeps the element: an iron item becomes iron-bearing trace mineral (brief rule 3; LIFE-002; ADR-003 §7.8).
for (const m of RUSTING) ROWS.push(["rust", m + "_metal", ["item", "object", "ruin"], m + "_trace", ["strata"]]);

const TRANSFORMS = ROWS.map(r => ({ id: r[0], from: r[1], fromForms: r[2], to: r[3], toForms: r[4] }));

// Recipes: fixed integer proportions across several classes, balanced per family (checked at load).
const RECIPES = [
    { id: "alloy.electrum", inputs: [["au_metal", "item", 1], ["ag_metal", "item", 1]], outputs: [["electrum", "item", 2]] },
    { id: "part.electrum", inputs: [["electrum", "item", 2]], outputs: [["au_metal", "item", 1], ["ag_metal", "item", 1]] }
];

// Named sources and sinks. classes/forms "*" = every class/form the row may touch; for a source "*" never includes an
// ore class, and never a finite family unless allowFinite is true. An explicit list naming an ore class is refused at
// load. ownerConfirmed records whether an Owner decision covers the row; none does yet.
const SOURCES = {
    magic: {
        classes: "*", forms: "*", allowFinite: false, ownerConfirmed: false,
        authority: "PM default for DEC-018's open sub-question (docs/OWNER_DECISIONS.md:262); NOT confirmed by the Owner"
    },
    "world-edge": {
        classes: "*", forms: "*", allowFinite: false, ownerConfirmed: false,
        authority: "PM brief WG.65.15 default: matter entering across the world edge (inflow, migration)"
    },
    "debug-explicit": {
        classes: "*", forms: "*", allowFinite: false, ownerConfirmed: false,
        authority: "PM brief WG.65.15 default: an explicit debug or test command, logged with its cause"
    },
    rain: {
        classes: ["water"], forms: ["fluid"], allowFinite: false, ownerConfirmed: false,
        authority: "ADR-003 §7.8-§7.9 (PROPOSED): rain is the example of a named water source"
    }
};
const SINKS = {
    magic: {
        classes: "*", forms: "*", ownerConfirmed: false,
        authority: "PM default for DEC-018's open sub-question (docs/OWNER_DECISIONS.md:262); NOT confirmed by the Owner"
    },
    "world-edge": {
        classes: "*", forms: "*", ownerConfirmed: false,
        authority: "PM brief WG.65.15 default: matter leaving across the world edge (outflow, emigration)"
    },
    "debug-explicit": {
        classes: "*", forms: "*", ownerConfirmed: false,
        authority: "PM brief WG.65.15 default: an explicit debug or test command, logged with its cause"
    },
    evaporation: {
        classes: ["water"], forms: ["fluid"], ownerConfirmed: false,
        authority: "ADR-003 §7.8-§7.9 (PROPOSED): evaporation is the example of a named water sink"
    }
};

// Frozen, so that no host can change the defaults another host gets; defaultConfig() in ledger.js returns a mutable copy.
function deepFreeze(o) {
    if (o !== null && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); }
    return o;
}

module.exports = deepFreeze({
    schema: 1,
    families: FAMILIES,
    forms: FORMS,
    classes: CLASSES,
    transforms: TRANSFORMS,
    recipes: RECIPES,
    sources: SOURCES,
    sinks: SINKS,
    logLimit: 256
});
