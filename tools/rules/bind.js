"use strict";
// Host binding for the legacy proofs: read the SRD JSON, build UF.Rules, and
// point condition lookups at whatever the proof installed on root.UF.Conditions.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const { createRules, attach } = require("../../game/js/sim/rules/rules");

function loadSrd() {
    const dir = path.join(ROOT, "game", "data", "srd51");
    const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    return {
        creatures: read("creatures.json"),
        equipment: read("equipment.json"),
        rules: read("rules.json"),
        characterOptions: read("character_options.json")
    };
}

function bindRules(root) {
    const host = root || global;
    host.UF = host.UF || {};
    const rules = createRules(loadSrd(), {
        lookupItem: id => {
            const I = host.UF && host.UF.Items;
            return I && typeof I.get === "function" ? I.get(Number(id)) : null;
        },
        conditions: () => (host.UF && host.UF.Conditions) || null
    });
    attach(host, rules);
    return rules;
}

module.exports = { loadSrd, bindRules };
