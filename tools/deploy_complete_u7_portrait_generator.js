const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const GENERATOR_DIR = 'C:/Program Files (x86)/Steam/steamapps/common/RPG Maker MZ/generator';
const BACKUP_DIR = path.join(__dirname, '..', 'art', 'generator_demo');

function makeTransparent(w, h) { return Buffer.alloc(w * h * 4); }

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
    const fullGenPath = path.join(GENERATOR_DIR, relPath);
    const genDir = path.dirname(fullGenPath);
    if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
    writePNG(fullGenPath, width, height, buffer);

    const fullBackupPath = path.join(BACKUP_DIR, relPath);
    const backupSubDir = path.dirname(fullBackupPath);
    if (!fs.existsSync(backupSubDir)) fs.mkdirSync(backupSubDir, { recursive: true });
    writePNG(fullBackupPath, width, height, buffer);

    console.log(`Deployed [${width}x${height}]: ${relPath}`);
}

// ----------------------------------------------------------------------------
// Load Source Images
// ----------------------------------------------------------------------------
console.log('Loading face sheets and character sets...');

const humanFaces1 = decodePNG(fs.readFileSync('game/img/faces/UF_Faces_human_1.png'));
function getHumanFaceCell(col, row) {
    const dst = Buffer.alloc(144 * 144 * 4);
    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            const sIdx = ((row * 144 + y) * 576 + (col * 144 + x)) * 4;
            const dIdx = (y * 144 + x) * 4;
            dst[dIdx] = humanFaces1.data[sIdx];
            dst[dIdx + 1] = humanFaces1.data[sIdx + 1];
            dst[dIdx + 2] = humanFaces1.data[sIdx + 2];
            dst[dIdx + 3] = humanFaces1.data[sIdx + 3];
        }
    }
    return dst;
}

// Named U7 portraits
const faceCedric = decodePNG(fs.readFileSync('game/img/faces/Cedric_Merchant_144.png'));
const faceKogan = decodePNG(fs.readFileSync('game/img/faces/Kogan_Captain_144.png'));
const faceKragan = decodePNG(fs.readFileSync('game/img/faces/Kragan_Smith_144.png'));

// Extracted from UF_Faces_human_1:
const faceForester = getHumanFaceCell(0, 0); // Young Forester in Stone Arch
const faceSoldier = getHumanFaceCell(1, 0);  // Eyepatch Soldier in Stone Arch
const faceElder = getHumanFaceCell(2, 0);    // Druid/Elder in Stone Arch
const faceRogue = getHumanFaceCell(3, 0);    // Hooded Rogue in Stone Arch

// Western FF5 Walk Sheets (144x192)
const walkForester = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_1_Walk.png'));
const walkKnight = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_2_Walk.png'));
const walkSmith = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_3_Walk.png'));
const walkRanger = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_5.png'));

// Downed Frames (144x48)
const decompSheet = decodePNG(fs.readFileSync('game/img/characters/!$UF_Decomposition_Human.png'));
const downedBuf = extractSubRect(decompSheet.data, 144, 192, 0, 0, 144, 48);

// Transparent blanks
const trans144x192 = makeTransparent(144, 192);
const trans144x48 = makeTransparent(144, 48);
const trans144x144 = makeTransparent(144, 144);
const trans576x384 = makeTransparent(576, 384);

// ----------------------------------------------------------------------------
// 1. Deploy Face Bases (Face_p13 .. Face_p19)
// ----------------------------------------------------------------------------
console.log('\nDeploying 7 Ultima VII Face Bases...');

const faces = [
    { p: 'p13', name: 'Cedric (U7 Nobleman)', buf: faceCedric.data },
    { p: 'p14', name: 'Kogan (U7 Iron Captain)', buf: faceKogan.data },
    { p: 'p15', name: 'Kragan (U7 Veteran Smith)', buf: faceKragan.data },
    { p: 'p16', name: 'Young Forester (U7 Arch)', buf: faceForester },
    { p: 'p17', name: 'Eyepatch Soldier (U7 Arch)', buf: faceSoldier },
    { p: 'p18', name: 'Elder Druid (U7 Arch)', buf: faceElder },
    { p: 'p19', name: 'Hooded Rogue (U7 Arch)', buf: faceRogue }
];

for (const f of faces) {
    // 64x64 thumbnail icon
    const icon = scaleImage(f.buf, 144, 144, 64, 64);
    saveAsset(`Variation/Male/icon_Face_${f.p}.png`, 64, 64, icon);

    // 144x144 face graphic layer
    saveAsset(`Face/Male/FG_Face_${f.p}_c1_m001.png`, 144, 144, f.buf);
}

// ----------------------------------------------------------------------------
// 2. Deploy Clothing & Armor Collars (Clothing_p27 .. Clothing_p30)
// ----------------------------------------------------------------------------
console.log('\nDeploying 4 Modular Clothing & Armor Sets...');

function extractCollarAndShoulders(srcBuf) {
    const dst = Buffer.alloc(144 * 144 * 4);
    for (let y = 80; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            const idx = (y * 144 + x) * 4;
            // Ignore dark background (r < 18, g < 22, b < 32)
            const r = srcBuf[idx], g = srcBuf[idx + 1], b = srcBuf[idx + 2], a = srcBuf[idx + 3];
            if (a > 20 && !(r < 20 && g < 25 && b < 35)) {
                dst[idx] = r;
                dst[idx + 1] = g;
                dst[idx + 2] = b;
                dst[idx + 3] = a;
            }
        }
    }
    return dst;
}

const clothes = [
    { p: 'p27', name: 'Forester Jerkin', walk: walkForester, face: faceForester },
    { p: 'p28', name: 'Iron Knight Armor', walk: walkKnight, face: faceSoldier },
    { p: 'p29', name: 'Blacksmith Apron', walk: walkSmith, face: faceKragan.data },
    { p: 'p30', name: 'Dark Rogue Cloak', walk: walkRanger, face: faceRogue }
];

for (const c of clothes) {
    // Icon (64x64) from front walk cell
    const frontCell = extractSubRect(c.walk.data, 144, 192, 0, 0, 48, 48);
    const icon = centerImage(frontCell, 48, 48, 64, 64);
    saveAsset(`Variation/Male/icon_Clothing_${c.p}.png`, 64, 64, icon);

    // TV Walk Sheet (144x192)
    saveAsset(`TV/Male/TV_Clothing2_${c.p}.png`, 144, 192, c.walk.data);
    saveAsset(`TV/Male/TV_Clothing2_${c.p}_c.png`, 144, 192, trans144x192);

    // TVD Downed Sheet (144x48)
    saveAsset(`TVD/Male/TVD_Clothing_${c.p}.png`, 144, 48, downedBuf);
    saveAsset(`TVD/Male/TVD_Clothing_${c.p}_c.png`, 144, 48, trans144x48);

    // Face Collar Layer (144x144)
    const collar = extractCollarAndShoulders(c.face);
    saveAsset(`Face/Male/FG_Clothing2_${c.p}_c1.png`, 144, 144, collar);

    // SV Side-view Battler (576x384)
    const svBuf = Buffer.alloc(576 * 384 * 4);
    const sideCell = extractSubRect(c.walk.data, 144, 192, 0, 48, 48, 48);
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 9; col++) {
            const bx = col * 64 + 8, by = row * 64 + 16;
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 48 + px) * 4;
                    const dIdx = ((by + py) * 576 + (bx + px)) * 4;
                    svBuf[dIdx] = sideCell[sIdx];
                    svBuf[dIdx + 1] = sideCell[sIdx + 1];
                    svBuf[dIdx + 2] = sideCell[sIdx + 2];
                    svBuf[dIdx + 3] = sideCell[sIdx + 3];
                }
            }
        }
    }
    saveAsset(`SV/Male/SV_Clothing2_${c.p}.png`, 576, 384, svBuf);
    saveAsset(`SV/Male/SV_Clothing2_${c.p}_c.png`, 576, 384, trans576x384);
}

// ----------------------------------------------------------------------------
// 3. Deploy Modular U7 Beards (Beard_p12 .. Beard_p14)
// ----------------------------------------------------------------------------
console.log('\nDeploying 3 Modular U7 Beards...');

// Extract beards from Kragan (full beard) and Elder (braided beard)
function extractBeardOnly(faceBuf) {
    const dst = Buffer.alloc(144 * 144 * 4);
    for (let y = 68; y < 115; y++) {
        for (let x = 30; x < 114; x++) {
            const idx = (y * 144 + x) * 4;
            const r = faceBuf[idx], g = faceBuf[idx + 1], b = faceBuf[idx + 2], a = faceBuf[idx + 3];
            if (a > 20 && !(r < 20 && g < 25 && b < 35)) {
                dst[idx] = r;
                dst[idx + 1] = g;
                dst[idx + 2] = b;
                dst[idx + 3] = a;
            }
        }
    }
    return dst;
}

const beards = [
    { p: 'p12', name: 'U7 Trimmed Goatee', face: faceCedric.data },
    { p: 'p13', name: 'U7 Full Warrior Beard', face: faceKragan.data },
    { p: 'p14', name: 'U7 Long Braided Elder Beard', face: faceElder }
];

for (const b of beards) {
    const beardLayer = extractBeardOnly(b.face);

    // Icon (64x64)
    const iconCrop = extractSubRect(beardLayer, 144, 144, 30, 68, 84, 50);
    const icon = centerImage(iconCrop, 84, 50, 64, 64);
    saveAsset(`Variation/Male/icon_Beard_${b.p}.png`, 64, 64, icon);

    // Face layer
    saveAsset(`Face/Male/FG_Beard_${b.p}_c1.png`, 144, 144, beardLayer);

    // TV Walk layer (144x192) - transparent blank so it doesn't double-draw on our complete walk sprites
    saveAsset(`TV/Male/TV_Beard1_${b.p}.png`, 144, 192, trans144x192);
    saveAsset(`TV/Male/TV_Beard1_${b.p}_c.png`, 144, 192, trans144x192);

    // TVD Downed layer (144x48)
    saveAsset(`TVD/Male/TVD_Beard1_${b.p}.png`, 144, 48, trans144x48);
    saveAsset(`TVD/Male/TVD_Beard1_${b.p}_c.png`, 144, 48, trans144x48);
}

console.log('\n=== COMPLETE U7 MODULAR PORTRAIT GENERATOR PACK DEPLOYED ===');
console.log('Ready to test live in RPG Maker MZ Character Generator!');
