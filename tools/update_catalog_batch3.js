const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

const updates = {
    fir_snow: '!$UF_Fir_Snow',
    mangrove: '!$UF_Mangrove',
    tree_tropical: '!$UF_Tree_Tropical',
    palm: '!$UF_Palm',
    tree_cursed: '!$UF_Tree_Cursed',
    glow_caps: '!$UF_GlowCaps',
    cave_mushrooms: '!$UF_CaveMushrooms',
    cave_moss: '!$UF_CaveMoss',
    spore_reeds: '!$UF_SporeReeds',
    stalagmite: '!$UF_Stalagmite',
    crystal_spire: '!$UF_CrystalSpire'
};

let count = 0;
for (const obj of catalog.objects) {
    if (updates[obj.id]) {
        obj.image = updates[obj.id];
        delete obj.tile;
        delete obj.tint;
        count++;
        console.log(`Updated: ${obj.id} -> image: "${obj.image}"`);
    }
}

const jsonString = JSON.stringify(catalog, null, 2);
JSON.parse(jsonString); // validate

fs.writeFileSync(CATALOG_PATH, jsonString, 'utf8');
console.log(`Successfully updated ${count} objects in UF_WorldCatalog.json!`);
