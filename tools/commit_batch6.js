"use strict";
const { execSync } = require("child_process");

const filesToStage = [
    "tools/build_batch6_objects_and_faces.js",
    "tools/verify_batch6_assets.js",
    "tools/update_catalog_batch6.js",
    "tools/run_batch6_tests.js",
    "tools/commit_batch6.js",
    "docs/STATUS.md",
    "docs/ASSET_REQUESTS.md",
    "docs/ASSET_INVENTORY.md",
    "game/data/UF_WorldCatalog.json",
    "game/data/UF_AssetIndex.json",
    "game/img/faces/UF_Faces_Flora_Ex.png",
    "game/img/faces/UF_Faces_Landmarks.png"
];

const masters = [
    "door_wood.png", "door_stone.png", "bowyer_bench.png", "fletcher_bench.png",
    "tanning_rack.png", "weapon_rack.png", "well.png", "farm_plot.png", "bridge.png"
];
for (const m of masters) {
    filesToStage.push(`art/masters/${m}`);
}

const charsets = [
    "Door_Wood", "Door_Stone", "Bowyer_Bench", "Fletcher_Bench",
    "Tanning_Rack", "Weapon_Rack", "Well", "FarmPlot", "Bridge"
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
execSync(`git commit -m "[gemini] Batch 6 objects, workshop benches, and extended flora/landmark face sets"`, { stdio: "inherit" });
console.log("Committed successfully!");
