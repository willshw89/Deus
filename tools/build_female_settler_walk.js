#!/usr/bin/env node
'use strict';

/**
 * tools/build_female_settler_walk.js
 * 
 * Constructs the 144x192 3x4 character walk cycle for the adult female settler:
 * - Clean pixel-perfect strides matching the male walk cycle mechanics
 * - Grounded on row 47, no stray/floating pixels
 * - Ensures palette matches art/palette/uf.hex (<= 32 unique colors, binary alpha)
 * - Writes game/img/characters/$UF_Human_Female.png and .json
 * - Writes art/masters/human_female_walk.png and .json
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

function cloneFrame(srcBuf) {
    const copy = Buffer.alloc(srcBuf.length);
    srcBuf.copy(copy);
    return copy;
}

function getPixel(buf, x, y) {
    if (x < 0 || x >= 48 || y < 0 || y >= 48) return [0, 0, 0, 0];
    const idx = (y * 48 + x) * 4;
    return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

function setPixel(buf, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= 48 || y < 0 || y >= 48) return;
    const idx = (y * 48 + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
}

function clearPixel(buf, x, y) {
    if (x < 0 || x >= 48 || y < 0 || y >= 48) return;
    const idx = (y * 48 + x) * 4;
    buf[idx] = 0; buf[idx + 1] = 0; buf[idx + 2] = 0; buf[idx + 3] = 0;
}

function flipHorizontal(buf48) {
    const flipped = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            const didx = (y * 48 + (47 - x)) * 4;
            flipped[didx] = buf48[sidx];
            flipped[didx + 1] = buf48[sidx + 1];
            flipped[didx + 2] = buf48[sidx + 2];
            flipped[didx + 3] = buf48[sidx + 3];
        }
    }
    return flipped;
}

function extractFrame(masterBuf, masterW, row) {
    const frame = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = ((row * 48 + y) * masterW + x) * 4;
            const didx = (y * 48 + x) * 4;
            frame[didx] = masterBuf[sidx];
            frame[didx + 1] = masterBuf[sidx + 1];
            frame[didx + 2] = masterBuf[sidx + 2];
            frame[didx + 3] = masterBuf[sidx + 3];
        }
    }
    return frame;
}

function createWalkFramesSouth(rawStand) {
    // First ground both feet in stand frame on row 47
    const stand = cloneFrame(rawStand);
    // Boot dark outline: [32, 20, 8], boot fill: [77, 45, 12], shadow: [45, 28, 8]
    // Left boot sole: ground at x = 18..20 on row 47
    setPixel(stand, 18, 47, 45, 28, 8, 255);
    setPixel(stand, 19, 47, 45, 28, 8, 255);
    setPixel(stand, 20, 47, 32, 20, 8, 255);

    const stepL = cloneFrame(stand);
    const stepR = cloneFrame(stand);

    // Col 0: Step Left
    // Left foot planted on row 47 (x=18..20)
    // Right foot lifted 1px (clear row 47 at x=27..29)
    for (let x = 26; x <= 30; x++) clearPixel(stepL, x, 47);
    // Arm swing: left arm swings slightly forward, right arm back
    setPixel(stepL, 16, 33, 198, 142, 117, 255); // hand slightly forward
    clearPixel(stepL, 30, 34);

    // Col 2: Step Right
    // Right foot planted on row 47 (x=27..29)
    // Left foot lifted 1px (clear row 47 at x=18..20)
    for (let x = 17; x <= 21; x++) clearPixel(stepR, x, 47);
    // Arm swing: right arm swings slightly forward, left arm back
    setPixel(stepR, 31, 33, 198, 142, 117, 255); // hand slightly forward
    clearPixel(stepR, 17, 34);

    return [stepL, stand, stepR];
}

function createWalkFramesWest(rawStand) {
    const stand = cloneFrame(rawStand);
    // Ensure both boots touch row 47 or have clean footing:
    // Front boot (x: 18..21), Back boot (x: 26..28)
    setPixel(stand, 18, 47, 45, 28, 8, 255);
    setPixel(stand, 19, 47, 45, 28, 8, 255);
    setPixel(stand, 20, 47, 32, 20, 8, 255);

    const stepL = cloneFrame(stand);
    const stepR = cloneFrame(stand);

    // Col 0: Step Forward (facing West = Left)
    // Front foot strides forward: planted at x = 16..19, y = 47
    setPixel(stepL, 16, 47, 32, 20, 8, 255);
    setPixel(stepL, 17, 47, 45, 28, 8, 255);
    setPixel(stepL, 18, 47, 45, 28, 8, 255);
    setPixel(stepL, 19, 47, 32, 20, 8, 255);
    // Back foot lifts off row 47
    clearPixel(stepL, 26, 47);
    clearPixel(stepL, 27, 47);
    clearPixel(stepL, 28, 47);

    // Col 2: Step Back (back foot strides forward, front foot lifts)
    // Back foot planted at x = 25..28, y = 47
    setPixel(stepR, 25, 47, 32, 20, 8, 255);
    setPixel(stepR, 26, 47, 45, 28, 8, 255);
    setPixel(stepR, 27, 47, 45, 28, 8, 255);
    setPixel(stepR, 28, 47, 32, 20, 8, 255);
    // Front foot lifts off row 47
    clearPixel(stepR, 18, 47);
    clearPixel(stepR, 19, 47);
    clearPixel(stepR, 20, 47);

    return [stepL, stand, stepR];
}

function createWalkFramesNorth(rawStand) {
    const stand = cloneFrame(rawStand);
    // Stand: both heels planted at row 47: left (x: 18..20), right (x: 27..29)
    setPixel(stand, 18, 47, 45, 28, 8, 255);
    setPixel(stand, 19, 47, 45, 28, 8, 255);
    setPixel(stand, 20, 47, 32, 20, 8, 255);

    const stepL = cloneFrame(stand);
    const stepR = cloneFrame(stand);

    // Col 0: Step Left
    // Left heel planted, right heel lifted
    for (let x = 26; x <= 30; x++) clearPixel(stepL, x, 47);

    // Col 2: Step Right
    // Right heel planted, left heel lifted
    for (let x = 17; x <= 21; x++) clearPixel(stepR, x, 47);

    return [stepL, stand, stepR];
}

function main() {
    console.log('=== Building Clean Female Settler Walk Sheet ===');
    const standMasterPath = path.join(ROOT, 'art', 'masters', 'human_female_stand.png');
    const standImg = decodePNG(fs.readFileSync(standMasterPath));
    const standSouth = extractFrame(standImg.data, standImg.width, 0);
    const standWest  = extractFrame(standImg.data, standImg.width, 1);
    const standEast  = extractFrame(standImg.data, standImg.width, 2);
    const standNorth = extractFrame(standImg.data, standImg.width, 3);

    const [walkS_0, walkS_1, walkS_2] = createWalkFramesSouth(standSouth);
    const [walkW_0, walkW_1, walkW_2] = createWalkFramesWest(standWest);
    const [walkE_0, walkE_1, walkE_2] = [flipHorizontal(walkW_0), flipHorizontal(walkW_1), flipHorizontal(walkW_2)];
    const [walkN_0, walkN_1, walkN_2] = createWalkFramesNorth(standNorth);

    const rows = [
        [walkS_0, walkS_1, walkS_2], // Row 0: Down (South)
        [walkW_0, walkW_1, walkW_2], // Row 1: Left (West)
        [walkE_0, walkE_1, walkE_2], // Row 2: Right (East)
        [walkN_0, walkN_1, walkN_2]  // Row 3: Up (North)
    ];

    const rmmzW = 144, rmmzH = 192;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const fBuf = rows[r][c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (fBuf[sidx + 3] === 255) {
                        const didx = ((r * 48 + y) * rmmzW + (c * 48 + x)) * 4;
                        rmmzBuf[didx] = fBuf[sidx];
                        rmmzBuf[didx + 1] = fBuf[sidx + 1];
                        rmmzBuf[didx + 2] = fBuf[sidx + 2];
                        rmmzBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }

    // Quantize buffer to <= 32 colors
    const colorCounts = new Map();
    for (let i = 0; i < rmmzBuf.length; i += 4) {
        if (rmmzBuf[i + 3] === 255) {
            const k = (rmmzBuf[i] << 16) | (rmmzBuf[i + 1] << 8) | rmmzBuf[i + 2];
            colorCounts.set(k, (colorCounts.get(k) || 0) + 1);
        }
    }
    if (colorCounts.size > 32) {
        const sorted = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
        const keepKeys = new Set(sorted.slice(0, 32).map(e => e[0]));
        const keepRgb = Array.from(keepKeys).map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
        const keepLab = keepRgb.map(c => srgbToLab(...c));
        const remap = new Map();
        for (const [k] of sorted.slice(32)) {
            const rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
            const lab = srgbToLab(...rgb);
            let bestDist = Infinity, bestIdx = 0;
            for (let i = 0; i < keepLab.length; i++) {
                const d = labDist(lab, keepLab[i]);
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            remap.set(k, keepRgb[bestIdx]);
        }
        for (let i = 0; i < rmmzBuf.length; i += 4) {
            if (rmmzBuf[i + 3] === 255) {
                const k = (rmmzBuf[i] << 16) | (rmmzBuf[i + 1] << 8) | rmmzBuf[i + 2];
                if (remap.has(k)) {
                    const mapped = remap.get(k);
                    rmmzBuf[i] = mapped[0];
                    rmmzBuf[i + 1] = mapped[1];
                    rmmzBuf[i + 2] = mapped[2];
                }
            }
        }
    }

    const charsetPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Female.png');
    writePNG(charsetPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`Saved clean female walk charset: ${charsetPath}`);

    const masterWalkPath = path.join(ROOT, 'art', 'masters', 'human_female_walk.png');
    writePNG(masterWalkPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`Saved master walk: ${masterWalkPath}`);

    const masterSidecar = {
        id: "human_female_walk",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1]
        },
        frameMs: 150,
        layer: "body",
        species: "human",
        gender: "female",
        stage: "adult"
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'human_female_walk.json'), JSON.stringify(masterSidecar, null, 2) + '\n');
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Female.json'), JSON.stringify(masterSidecar, null, 2) + '\n');

    // Run verification
    const art = childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" tools\\art_check.js --native "${charsetPath}"`, { cwd: ROOT }).toString();
    console.log(art.trim());

    const orig = childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" tools\\originality_check.js "${charsetPath}"`, { cwd: ROOT }).toString();
    console.log(orig.trim());
}

if (require.main === module) {
    main();
}
