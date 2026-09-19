"use strict";
const fs = require('fs');
const path = require('path');

const catalogPath = path.resolve(__dirname, '..', 'game', 'data', 'UF_WorldCatalog.json');
const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const updates = {
    door_wood: { image: "!$UF_Door_Wood" },
    door_stone: { image: "!$UF_Door_Stone" },
    bowyer_bench: { image: "!$UF_Bowyer_Bench" },
    fletcher_bench: { image: "!$UF_Fletcher_Bench" },
    tanning_rack: { image: "!$UF_Tanning_Rack" },
    weapon_rack: { image: "!$UF_Weapon_Rack" },
    well: { image: "!$UF_Well" },
    farm_plot: { image: "!$UF_FarmPlot" },
    bridge: { image: "!$UF_Bridge" },
    stockpile: { image: "!$UF_Stockpile" }
};

let count = 0;
for (const obj of cat.objects) {
    if (updates[obj.id]) {
        const u = updates[obj.id];
        obj.image = u.image;
        delete obj.tile;
        delete obj.tint;
        delete obj.characterIndex;
        delete obj.gen;
        count++;
        console.log(`Updated ${obj.id} -> image: "${u.image}"`);
    }
}

fs.writeFileSync(catalogPath, JSON.stringify(cat, null, 2) + "\n", 'utf8');
console.log(`Successfully updated ${count} objects in UF_WorldCatalog.json!`);
