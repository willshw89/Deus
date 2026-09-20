const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const GENERATOR_DIR = 'C:/Program Files (x86)/Steam/steamapps/common/RPG Maker MZ/generator';
const BACKUP_DIR = path.join(__dirname, '..', 'art', 'generator_demo');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function makeTransparent(width, height) {
    return Buffer.alloc(width * height * 4); // all zeroes (transparent)
}

function scaleImage(src, sw, sh, dw, dh) {
    const dst = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const sx = Math.min(sw - 1, Math.floor(dx * sw / dw));
            const sy = Math.min(sh - 1, Math.floor(dy * sh / dh));
            const sIdx = (sy * sw + sx) * 4;
            const dIdx = (dy * dw + dx) * 4;
            dst[dIdx] = src[sIdx];
            dst[dIdx + 1] = src[sIdx + 1];
            dst[dIdx + 2] = src[sIdx + 2];
            dst[dIdx + 3] = src[sIdx + 3];
        }
    }
    return dst;
}

function centerImage(src, sw, sh, dw, dh) {
    const dst = Buffer.alloc(dw * dh * 4);
    const ox = Math.floor((dw - sw) / 2);
    const oy = Math.floor((dh - sh) / 2);
    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
            const dx = ox + x;
            const dy = oy + y;
            if (dx >= 0 && dx < dw && dy >= 0 && dy < dh) {
                const sIdx = (y * sw + x) * 4;
                const dIdx = (dy * dw + dx) * 4;
                dst[dIdx] = src[sIdx];
                dst[dIdx + 1] = src[sIdx + 1];
                dst[dIdx + 2] = src[sIdx + 2];
                dst[dIdx + 3] = src[sIdx + 3];
            }
        }
    }
    return dst;
}

function extractSubRect(src, sw, sh, rx, ry, rw, rh) {
    const dst = Buffer.alloc(rw * rh * 4);
    for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
            const sx = rx + x;
            const sy = ry + y;
            const sIdx = (sy * sw + sx) * 4;
            const dIdx = (y * rw + x) * 4;
            dst[dIdx] = src[sIdx];
            dst[dIdx + 1] = src[sIdx + 1];
            dst[dIdx + 2] = src[sIdx + 2];
            dst[dIdx + 3] = src[sIdx + 3];
        }
    }
    return dst;
}

function saveAsset(relPath, width, height, buffer) {
    // 1. Save to generator folder
    const fullGenPath = path.join(GENERATOR_DIR, relPath);
    const genDir = path.dirname(fullGenPath);
    if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
    writePNG(fullGenPath, width, height, buffer);

    // 2. Save backup copy in project
    const fullBackupPath = path.join(BACKUP_DIR, relPath);
    const backupSubDir = path.dirname(fullBackupPath);
    if (!fs.existsSync(backupSubDir)) fs.mkdirSync(backupSubDir, { recursive: true });
    writePNG(fullBackupPath, width, height, buffer);

    console.log(`Saved [${width}x${height}]: ${relPath}`);
}

// ----------------------------------------------------------------------------
// 1. Load Source Assets
// ----------------------------------------------------------------------------
console.log('Loading source assets...');

// Portraits (144x144)
const faceCedric = decodePNG(fs.readFileSync('game/img/faces/Cedric_Merchant_144.png'));
const faceKogan = decodePNG(fs.readFileSync('game/img/faces/Kogan_Captain_144.png'));
const faceKragan = decodePNG(fs.readFileSync('game/img/faces/Kragan_Smith_144.png'));

// Western FF5 Walk Sheets (144x192)
const walkForester = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_1_Walk.png'));
const walkKnight = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_2_Walk.png'));
const walkSmith = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_3_Walk.png'));

// Downed Frames from decomposition row 0 (144x48)
const decompSheet = decodePNG(fs.readFileSync('game/img/characters/!$UF_Decomposition_Human.png'));
const downedBuf = extractSubRect(decompSheet.data, 144, 192, 0, 0, 144, 48);

// Transparent buffers
const trans144x192 = makeTransparent(144, 192);
const trans144x48 = makeTransparent(144, 48);
const trans144x144 = makeTransparent(144, 144);
const trans576x384 = makeTransparent(576, 384);

// ----------------------------------------------------------------------------
// 2. Install Face Options (p13, p14, p15)
// ----------------------------------------------------------------------------
console.log('\nInstalling U7 Portraits into RMMZ Character Generator...');

const facePresets = [
    { p: 'p13', name: 'Cedric (U7 Townsman)', img: faceCedric },
    { p: 'p14', name: 'Kogan (U7 Iron Captain)', img: faceKogan },
    { p: 'p15', name: 'Kragan (U7 Veteran Smith)', img: faceKragan }
];

for (const fp of facePresets) {
    // Thumbnail icon (64x64)
    const iconBuf = scaleImage(fp.img.data, 144, 144, 64, 64);
    saveAsset(`Variation/Male/icon_Face_${fp.p}.png`, 64, 64, iconBuf);

    // Face graphic (144x144)
    saveAsset(`Face/Male/FG_Face_${fp.p}_c1_m001.png`, 144, 144, fp.img.data);
}

// ----------------------------------------------------------------------------
// 3. Install Clothing Options (p27, p28, p29)
// ----------------------------------------------------------------------------
console.log('\nInstalling Western FF5 Outfits into RMMZ Character Generator...');

const clothingPresets = [
    { p: 'p27', name: 'Western FF5 Townsman / Forester', walk: walkForester, face: faceCedric },
    { p: 'p28', name: 'Western FF5 Iron Guard / Knight', walk: walkKnight, face: faceKogan },
    { p: 'p29', name: 'Western FF5 Blacksmith / Artisan', walk: walkSmith, face: faceKragan }
];

for (const cp of clothingPresets) {
    // 1. Thumbnail icon (64x64) from front standing pose (cell 0, 48x48) centered
    const frontPose = extractSubRect(cp.walk.data, 144, 192, 0, 0, 48, 48);
    const iconBuf = centerImage(frontPose, 48, 48, 64, 64);
    saveAsset(`Variation/Male/icon_Clothing_${cp.p}.png`, 64, 64, iconBuf);

    // 2. TV Walk Sheet (144x192)
    saveAsset(`TV/Male/TV_Clothing2_${cp.p}.png`, 144, 192, cp.walk.data);
    saveAsset(`TV/Male/TV_Clothing2_${cp.p}_c.png`, 144, 192, trans144x192);

    // 3. TVD Downed Sheet (144x48)
    saveAsset(`TVD/Male/TVD_Clothing_${cp.p}.png`, 144, 48, downedBuf);
    saveAsset(`TVD/Male/TVD_Clothing_${cp.p}_c.png`, 144, 48, trans144x48);

    // 4. Face Clothing Layer (144x144) - extract collar/shoulders from matching portrait
    const collarBuf = Buffer.alloc(144 * 144 * 4);
    for (let y = 80; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            const idx = (y * 144 + x) * 4;
            collarBuf[idx] = cp.face.data[idx];
            collarBuf[idx + 1] = cp.face.data[idx + 1];
            collarBuf[idx + 2] = cp.face.data[idx + 2];
            collarBuf[idx + 3] = cp.face.data[idx + 3];
        }
    }
    saveAsset(`Face/Male/FG_Clothing2_${cp.p}_c1.png`, 144, 144, collarBuf);

    // 5. SV Side-view Battler (576x384) - create compatible side-view layout
    const svBuf = Buffer.alloc(576 * 384 * 4);
    // Place side walk pose (cell (0, 1) = row 1 West facing) across the 9x6 battler grid
    const sidePose = extractSubRect(cp.walk.data, 144, 192, 0, 48, 48, 48);
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 9; col++) {
            const bx = col * 64 + 8;
            const by = row * 64 + 16;
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 48 + px) * 4;
                    const dIdx = ((by + py) * 576 + (bx + px)) * 4;
                    svBuf[dIdx] = sidePose[sIdx];
                    svBuf[dIdx + 1] = sidePose[sIdx + 1];
                    svBuf[dIdx + 2] = sidePose[sIdx + 2];
                    svBuf[dIdx + 3] = sidePose[sIdx + 3];
                }
            }
        }
    }
    saveAsset(`SV/Male/SV_Clothing2_${cp.p}.png`, 576, 384, svBuf);
    saveAsset(`SV/Male/SV_Clothing2_${cp.p}_c.png`, 576, 384, trans576x384);
}

console.log('\n=== RMMZ CHARACTER GENERATOR DEMO PACK COMPLETE ===');
console.log('Installed parts:');
console.log('  - Face: Face_p13 (Cedric U7), Face_p14 (Kogan U7), Face_p15 (Kragan U7)');
console.log('  - Clothing: Clothing_p27 (FF5 Townsman), Clothing_p28 (FF5 Iron Guard), Clothing_p29 (FF5 Blacksmith)');

