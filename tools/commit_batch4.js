const { execSync } = require("child_process");

const filesToStage = [
    "tools/build_batch4_plants_minerals.js",
    "tools/verify_batch4_assets.js",
    "tools/update_catalog_batch4.js",
    "tools/commit_batch4.js",
    "docs/STATUS.md",
    "docs/ASSET_INVENTORY.md",
    "game/data/UF_WorldCatalog.json",
    "game/data/UF_AssetIndex.json",
    "game/img/faces/UF_Faces_Plants.png",
    "game/img/faces/UF_Faces_Minerals.png"
];

const masters = [
    "cactus.png", "cactus_tall.png", "grass_tuft.png", "reeds.png",
    "flowers.png", "flowers_purple.png", "flowers_blue.png", "flowers_white.png",
    "wheat_wild.png", "wild_grain.png", "lichen.png", "lily_pad.png",
    "granite_boulder.png", "granite_boulder.json",
    "ironstone.png", "ironstone.json",
    "copper_outcrop.png", "gold_outcrop.png",
    "crystal.png", "crystal_small.png",
    "rocks_small.png", "rocks_small.json",
    "gravel.png", "bones_pile.png", "rubble_pillar.png"
];
for (const m of masters) {
    filesToStage.push(`art/masters/${m}`);
}

const charsets = [
    "Cactus", "CactusTall", "GrassTuft", "Reeds",
    "Wildflowers", "Flowers_Purple", "Flowers_Blue", "Flowers_White",
    "Wheat_Wild", "Wild_Grain", "Lichen", "Lily_Pad",
    "GraniteBoulder", "IronstoneDeposit", "CopperOutcrop", "GoldOutcrop",
    "CrystalCluster", "SmallCrystals", "LooseStones", "Gravel",
    "OldBones", "FallenPillar"
];
for (const c of charsets) {
    filesToStage.push(`game/img/characters/!$UF_${c}.png`);
    filesToStage.push(`game/img/characters/!$UF_${c}.json`);
}

console.log(`Staging ${filesToStage.length} files...`);
for (const file of filesToStage) {
    execSync(`git add "${file}"`, { stdio: "inherit" });
}

console.log("Committing...");
execSync(`git commit -m "[gemini] Batch 4 plants, Batch 5 minerals charsets, and plant/mineral face sets"`, { stdio: "inherit" });
console.log("Committed successfully!");
