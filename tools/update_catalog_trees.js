const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

const treeMapping = {
    oak: '!$UF_Oak',
    birch: '!$UF_Birch',
    pine: '!$UF_Pine',
    fruit_tree: '!$UF_Fruit_Tree',
    fruit_tree_bare: '!$UF_Fruit_Tree_Bare',
    tree_savanna: '!$UF_Tree_Savanna',
    tree_swamp: '!$UF_Tree_Swamp',
    dead_tree: '!$UF_Tree_Dead',
    tower_cap: '!$UF_TowerCap',
    stump: '!$UF_Stump'
};

let updatedCount = 0;
for (const obj of catalog.objects) {
    if (treeMapping[obj.id]) {
        obj.image = treeMapping[obj.id];
        delete obj.tile;
        delete obj.tint;
        updatedCount++;
        console.log(`Updated catalog object: ${obj.id} -> image: "${obj.image}"`);
    }
}

// Validate JSON parse
const jsonString = JSON.stringify(catalog, null, 2);
JSON.parse(jsonString); // throws if invalid

fs.writeFileSync(CATALOG_PATH, jsonString, 'utf8');
console.log(`Successfully updated ${updatedCount} tree and stump objects in UF_WorldCatalog.json!`);
