"use strict";
// tools/add_srd_food_data.js - SRD 5.1 food data for the world catalog (owner decision 2026-09-23, task 2 of the
// survival order). Three separate numbers per food item: the item's weight in pounds, its nutritional contribution
// in pounds of the SRD's daily requirement (Food and Water, pp. 86-87: one pound a day), and its water contribution
// in gallons of the daily gallon. Where the SRD gives the data (Rations (1 day): 2 lb, srd:gear:rations-1-day) the
// item is marked with its SRD id; every DEUS-only food is marked `source: "deus"` for the owner's review.
//
// The catalog is under the RMMZ editor gate (AGENTS.md, RMMZ editor safety): run --write only with the editor closed,
// then reopen the project. Both catalog files (UF_WorldCatalog.json and its DEUS_ twin) are patched identically.
//
// Usage: node tools/add_srd_food_data.js            dry run: prints what would change
//        node tools/add_srd_food_data.js --check    exit 1 when the catalog lacks the data (CI-style)
//        node tools/add_srd_food_data.js --write    apply, write-if-changed, canonical 2-space JSON
// As a module: require(...).applyFoodData(catalog) patches a parsed catalog in place and returns { changed, notes }.

const fs = require("fs");
const path = require("path");

const SRD_RATIONS = "srd:gear:rations-1-day";
const FOOD = {
    // SRD 5.1 equipment: Rations (1 day), 5 sp, 2 lb (srd:gear:rations-1-day). One unit is one day's food.
    rations: {
        insertAfter: "fish",
        item: { id: "rations", name: "Rations (1 day)", image: "!$UF_Item_MeatCooked", tags: ["food", "dry", "trade"], stack: 5, srd: SRD_RATIONS },
        weight: 2, hunger: 100, nutrition: 1, water: 0, source: SRD_RATIONS
    },
    // DEUS foods: not SRD items. Weight, nutrition and water are DEUS data, marked for review.
    berries: { weight: 0.1, hunger: 25, nutrition: 0.1, water: 0.02, source: "deus" },
    fruit: { weight: 0.3, hunger: 30, nutrition: 0.25, water: 0.05, source: "deus" },
    mushroom: { weight: 0.1, hunger: 20, nutrition: 0.1, water: 0.01, source: "deus" },
    root: { weight: 0.3, hunger: 25, nutrition: 0.3, water: 0.01, source: "deus" },
    meat_raw: { weight: 0.5, hunger: 20, nutrition: 0.4, water: 0, source: "deus" },
    meat_cooked: { weight: 0.4, hunger: 50, nutrition: 0.5, water: 0, source: "deus" },
    fish: { weight: 0.5, hunger: 25, nutrition: 0.5, water: 0, source: "deus" }
};

/** Patches a parsed catalog in place. Returns { changed, notes: [text] }. */
function applyFoodData(catalog) {
    const notes = [];
    let changed = false;
    const types = catalog && catalog.items && Array.isArray(catalog.items.types) ? catalog.items.types : null;
    if (!types) return { changed: false, notes: ["catalog has no items.types"] };
    for (const id of Object.keys(FOOD)) {
        const spec = FOOD[id];
        let t = types.find(x => x.id === id);
        if (!t) {
            if (!spec.item) { notes.push(`${id}: not in the catalog, skipped`); continue; }
            t = Object.assign({}, spec.item);
            const after = types.findIndex(x => x.id === spec.insertAfter);
            types.splice(after >= 0 ? after + 1 : types.length, 0, t);
            notes.push(`${id}: added (${spec.source})`);
            changed = true;
        }
        if (t.weight !== spec.weight) { t.weight = spec.weight; notes.push(`${id}: weight ${spec.weight} lb`); changed = true; }
        const food = t.food || (t.food = {});
        const want = { hunger: spec.hunger, nutrition: spec.nutrition, water: spec.water, source: spec.source };
        for (const k of Object.keys(want)) {
            if (food[k] !== want[k]) { food[k] = want[k]; notes.push(`${id}: food.${k} = ${JSON.stringify(want[k])}`); changed = true; }
        }
        if (spec.source !== "deus" && t.srd !== spec.source) { t.srd = spec.source; changed = true; }
    }
    // Every food item the catalog has must say where its numbers come from.
    for (const t of types) {
        if (t.food && !t.food.source) { t.food.source = "deus"; notes.push(`${t.id}: food.source = "deus" (unreviewed)`); changed = true; }
    }
    return { changed, notes };
}

if (require.main === module) {
    const ROOT = path.resolve(__dirname, "..");
    const files = ["game/data/UF_WorldCatalog.json", "game/data/DEUS_WorldCatalog.json"].map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));
    const write = process.argv.includes("--write"), check = process.argv.includes("--check");
    let anyChange = false;
    for (const file of files) {
        const text = fs.readFileSync(file, "utf8");
        const catalog = JSON.parse(text);
        const { changed, notes } = applyFoodData(catalog);
        const out = JSON.stringify(catalog, null, 2);
        const differs = out !== text;
        anyChange = anyChange || differs;
        console.log(`${path.relative(ROOT, file)}: ${differs ? `${notes.length} change(s)` : "up to date"}`);
        for (const n of notes) console.log(`  ${n}`);
        if (differs && write) { fs.writeFileSync(file, out); console.log("  written"); }
        if (!differs && changed) console.log("  (values already present; formatting unchanged)");
    }
    if (check) process.exit(anyChange ? 1 : 0);
    if (!write && anyChange) console.log("dry run: nothing written (use --write with the RMMZ editor closed)");
}

module.exports = { applyFoodData, FOOD, SRD_RATIONS };
