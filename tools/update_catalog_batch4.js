const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '..', 'game', 'data', 'UF_WorldCatalog.json');
const cat = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

const swaps = {
    cactus: '!$UF_Cactus',
    cactus_tall: '!$UF_CactusTall',
    grass_tuft: '!$UF_GrassTuft',
    reeds: '!$UF_Reeds',
    flowers: '!$UF_Wildflowers',
    flowers_purple: '!$UF_Flowers_Purple',
    flowers_blue: '!$UF_Flowers_Blue',
    flowers_white: '!$UF_Flowers_White',
    wheat_wild: '!$UF_Wheat_Wild',
    wild_grain: '!$UF_Wild_Grain',
    lichen: '!$UF_Lichen',
    lily_pad: '!$UF_Lily_Pad',
    granite_boulder: '!$UF_GraniteBoulder',
    ironstone: '!$UF_IronstoneDeposit',
    copper_outcrop: '!$UF_CopperOutcrop',
    gold_outcrop: '!$UF_GoldOutcrop',
    crystal: '!$UF_CrystalCluster',
    crystal_small: '!$UF_SmallCrystals',
    rocks_small: '!$UF_LooseStones',
    gravel: '!$UF_Gravel',
    bones_pile: '!$UF_OldBones',
    rubble_pillar: '!$UF_FallenPillar'
};

let swappedCount = 0;
for (const obj of cat.objects) {
    if (swaps[obj.id]) {
        obj.image = swaps[obj.id];
        delete obj.tile;
        delete obj.tint;
        swappedCount++;
        console.log(`Swapped ${obj.id} -> image: ${obj.image}`);
    }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(cat, null, 2) + '\n', 'utf8');
console.log(`Successfully swapped ${swappedCount} objects in UF_WorldCatalog.json!`);
