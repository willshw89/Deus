const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIRS = [
    path.join(ROOT, 'game', 'img', 'characters'),
    path.join(ROOT, 'art', 'masters')
];

console.log("=== Verifying Authentic Sprite Frame Sway Animations for Foliage & Trees ===");

let totalChecked = 0;
let totalPassed = 0;
let failures = [];

const FOLIAGE_NAMES = [
    '!$UF_Oak', '!$UF_Palm', '!$UF_Pine', '!$UF_SnowBush', '!$UF_Tree_Savanna', '!$UF_Tree_Swamp',
    '!$UF_BerryBush', '!$UF_BerryBush_Bare', '!$UF_Birch', '!$UF_Bush', '!$UF_CactusTall',
    '!$UF_DesertShrub', '!$UF_Fern', '!$UF_Fir_Snow', '!$UF_Flowers_Blue', '!$UF_Flowers_Purple',
    '!$UF_Flowers_White', '!$UF_Fruit_Tree', '!$UF_Fruit_Tree_Bare', '!$UF_GrassTuft',
    '!$UF_Lily_Pad', '!$UF_Mangrove', '!$UF_Reeds', '!$UF_SporeReeds', '!$UF_TowerCap',
    '!$UF_Tree_Cursed', '!$UF_Tree_Dead', '!$UF_Tree_Tropical', '!$UF_Wheat_Wild',
    '!$UF_Wild_Grain', '!$UF_Wildflowers'
];

for (const dir of CHAR_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const dirLabel = path.relative(ROOT, dir);

    for (const name of FOLIAGE_NAMES) {
        const jPath = path.join(dir, name + '.json');
        const pPath = path.join(dir, name + '.png');
        if (!fs.existsSync(jPath) || !fs.existsSync(pPath)) {
            continue; // Not all exist in both art/masters and game/img/characters
        }

        totalChecked++;
        const relP = path.relative(ROOT, pPath);

        // 1. Check sidecar JSON
        const sidecar = JSON.parse(fs.readFileSync(jPath, 'utf8'));
        if (!sidecar.animations || !Array.isArray(sidecar.animations.sway) || sidecar.animations.sway.length !== 3) {
            failures.push(`${relP}: sidecar missing animations.sway = [0, 1, 2]`);
            continue;
        }
        if (sidecar.animations.sway[0] !== 0 || sidecar.animations.sway[1] !== 1 || sidecar.animations.sway[2] !== 2) {
            failures.push(`${relP}: animations.sway is not [0, 1, 2]`);
            continue;
        }

        // 2. Check PNG sprite frames: col 0, col 1, col 2 must be distinct
        const fw = sidecar.frameWidth || 48;
        const fh = sidecar.frameHeight || 48;
        const raw = decodePNG(fs.readFileSync(pPath), name + '.png');
        if (raw.width !== fw * 3 || raw.height !== fh * 4) {
            failures.push(`${relP}: invalid dimensions ${raw.width}x${raw.height}, expected ${fw * 3}x${fh * 4}`);
            continue;
        }

        const data = raw.data;
        const w = raw.width;

        // Compare col 0 vs col 1, and col 2 vs col 1 for row 0
        let diff01 = 0;
        let diff21 = 0;
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const i0 = (y * w + x) * 4;
                const i1 = (y * w + (fw + x)) * 4;
                const i2 = (y * w + (fw * 2 + x)) * 4;

                for (let c = 0; c < 4; c++) {
                    if (data[i0 + c] !== data[i1 + c]) diff01++;
                    if (data[i2 + c] !== data[i1 + c]) diff21++;
                }
            }
        }

        if (diff01 === 0 || diff21 === 0) {
            failures.push(`${relP}: sprite columns are identical! (diff01=${diff01}, diff21=${diff21})`);
            continue;
        }

        totalPassed++;
        console.log(`PASS: ${name} (${dirLabel}) - sway: [0, 1, 2], distinct sprite frames (diff01=${diff01}, diff21=${diff21})`);
    }
}

console.log(`\n=== Summary ===`);
console.log(`Checked: ${totalChecked}`);
console.log(`Passed:  ${totalPassed}`);
console.log(`Failed:  ${failures.length}`);

if (failures.length > 0) {
    console.error("\nFailures:");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
} else {
    console.log("ALL FOLIAGE & TREE SPRITE SWAY ANIMATIONS VERIFIED AUTHENTIC & ACTIVE!");
    process.exit(0);
}
