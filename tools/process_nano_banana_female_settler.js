#!/usr/bin/env node
'use strict';

/**
 * tools/process_nano_banana_female_settler.js
 * 
 * Processes Nano Banana generated adult human female settler assets:
 * - South (Front): nb_human_female_stand
 * - North (Back):  nb_human_female_back
 * - West (Side):   nb_human_female_side
 * - East:          Flipped West
 * 
 * Produces:
 * - art/masters/human_female_stand.png & .json
 * - game/img/characters/$UF_Human_Female.png & .json
 * - art/review/human_settlers_pair_showcase_4x.png
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

const JPG_SOUTH = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3/nb_human_female_stand_1789842764528.jpg';
const JPG_NORTH = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3/nb_human_female_back_1789842777928.jpg';
const JPG_WEST  = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3/nb_human_female_side_1789842791787.jpg';

// CIELAB color math
function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

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

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const unique = [];
    const index = new Map();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!index.has(k)) {
            index.set(k, unique.length);
            unique.push(rgb);
        }
    }
    const lab = unique.map(c => srgbToLab(...c));
    const cache = new Map();
    return {
        snap(r, g, b) {
            const k = (r << 16) | (g << 8) | b;
            if (cache.has(k)) return cache.get(k);
            const l = srgbToLab(r, g, b);
            let best = unique[0], bd = Infinity;
            for (let i = 0; i < lab.length; i++) {
                const d = labDist(l, lab[i]);
                if (d < bd) { bd = d; best = unique[i]; }
            }
            cache.set(k, best);
            return best;
        }
    };
}

const pal = loadPalette();

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

function processFacing(img, name) {
    console.log(`Processing ${name}: ${img.width}x${img.height}`);
    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    const isMagenta = (r, g, b) => (r > 165 && g < 85 && b > 165);

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx];
            const g = img.data[idx + 1];
            const b = img.data[idx + 2];
            if (!isMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    console.log(`  BBox: [${minX}, ${minY}] to [${maxX}, ${maxY}] (${bboxW}x${bboxH})`);

    // Target height: 46 pixels (rows 2 to 47, grounded on row 47, center col 24)
    const targetH = 46;
    const scale = targetH / bboxH;
    const targetW = Math.round(bboxW * scale);
    const startX = Math.round(24 - targetW / 2);
    const startY = 48 - targetH; // 2

    const out48 = Buffer.alloc(48 * 48 * 4);

    for (let dy = 0; dy < targetH; dy++) {
        const outY = startY + dy;
        const srcY0 = minY + Math.floor(dy / scale);
        const srcY1 = minY + Math.floor((dy + 1) / scale);

        for (let dx = 0; dx < targetW; dx++) {
            const outX = startX + dx;
            if (outX < 0 || outX >= 48) continue;

            const srcX0 = minX + Math.floor(dx / scale);
            const srcX1 = minX + Math.floor((dx + 1) / scale);

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let sy = srcY0; sy < srcY1 && sy < img.height; sy++) {
                for (let sx = srcX0; sx < srcX1 && sx < img.width; sx++) {
                    const sidx = (sy * img.width + sx) * 4;
                    const r = img.data[sidx];
                    const g = img.data[sidx + 1];
                    const b = img.data[sidx + 2];
                    if (!isMagenta(r, g, b)) {
                        sumR += r; sumG += g; sumB += b;
                        count++;
                    }
                }
            }

            if (count > (srcY1 - srcY0) * (srcX1 - srcX0) * 0.25) {
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                const snapped = pal.snap(avgR, avgG, avgB);

                const didx = (outY * 48 + outX) * 4;
                out48[didx] = snapped[0];
                out48[didx + 1] = snapped[1];
                out48[didx + 2] = snapped[2];
                out48[didx + 3] = 255;
            }
        }
    }

    return out48;
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

// Ensure global palette does not exceed 32 colors
function quantizeBuffers(buffers, maxColors = 32) {
    const colorCounts = new Map();
    for (const buf of buffers) {
        for (let i = 0; i < buf.length; i += 4) {
            if (buf[i + 3] === 255) {
                const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
                colorCounts.set(k, (colorCounts.get(k) || 0) + 1);
            }
        }
    }

    console.log(`Initial unique colors across all facings: ${colorCounts.size}`);
    if (colorCounts.size <= maxColors) return;

    console.log(`Colors (${colorCounts.size}) exceed ${maxColors}! Merging least-used colors...`);
    const sorted = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
    const keepKeys = new Set(sorted.slice(0, maxColors).map(e => e[0]));
    const keepRgb = Array.from(keepKeys).map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const keepLab = keepRgb.map(c => srgbToLab(...c));

    const remap = new Map();
    for (const [k] of sorted.slice(maxColors)) {
        const rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
        const lab = srgbToLab(...rgb);
        let bestDist = Infinity, bestIdx = 0;
        for (let i = 0; i < keepLab.length; i++) {
            const d = labDist(lab, keepLab[i]);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        remap.set(k, keepRgb[bestIdx]);
    }

    for (const buf of buffers) {
        for (let i = 0; i < buf.length; i += 4) {
            if (buf[i + 3] === 255) {
                const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
                if (remap.has(k)) {
                    const mapped = remap.get(k);
                    buf[i] = mapped[0];
                    buf[i + 1] = mapped[1];
                    buf[i + 2] = mapped[2];
                }
            }
        }
    }
}

function main() {
    console.log('=== Processing Adult Human Female Settler Sprite ===');
    const imgSouth = loadJpg(JPG_SOUTH);
    const imgNorth = loadJpg(JPG_NORTH);
    const imgWest  = loadJpg(JPG_WEST);

    const frameSouth = processFacing(imgSouth, 'South (Front)');
    const frameNorth = processFacing(imgNorth, 'North (Back)');
    const frameWest  = processFacing(imgWest,  'West (Side)');
    const frameEast  = flipHorizontal(frameWest);

    const facings = [frameSouth, frameWest, frameEast, frameNorth];
    quantizeBuffers(facings, 32);

    // 1. Build 4-facing Master Sheet (48x192)
    const masterW = 48, masterH = 192;
    const masterBuf = Buffer.alloc(masterW * masterH * 4);
    for (let r = 0; r < 4; r++) {
        const src = facings[r];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * 48 + x) * 4;
                const didx = ((r * 48 + y) * masterW + x) * 4;
                masterBuf[didx] = src[sidx];
                masterBuf[didx + 1] = src[sidx + 1];
                masterBuf[didx + 2] = src[sidx + 2];
                masterBuf[didx + 3] = src[sidx + 3];
            }
        }
    }

    const masterPath = path.join(ROOT, 'art', 'masters', 'human_female_stand.png');
    writePNG(masterPath, masterW, masterH, masterBuf);
    console.log(`Saved master PNG: ${masterPath}`);

    const masterSidecar = {
        id: "human_female_stand",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [0] },
        frameMs: 150,
        lean: { mode: "none", slope: 1, top: null, east: 0 },
        scale: { subjectHeight: 46, target: null, factor: 1 },
        source: {
            files: ["nb_human_female_stand", "nb_human_female_back", "nb_human_female_side"],
            format: "png",
            background: "magenta #FF00FF"
        }
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'human_female_stand.json'), JSON.stringify(masterSidecar, null, 2) + '\n');

    // 2. Build standard RMMZ 144x192 Charset ($UF_Human_Female.png)
    // Layout: 3 cols x 4 rows (Down, Left, Right, Up)
    const rmmzW = 144, rmmzH = 192;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

    for (let r = 0; r < 4; r++) {
        const src = facings[r];
        for (let col = 0; col < 3; col++) {
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (src[sidx + 3] === 255) {
                        const didx = ((r * 48 + y) * rmmzW + (col * 48 + x)) * 4;
                        rmmzBuf[didx] = src[sidx];
                        rmmzBuf[didx + 1] = src[sidx + 1];
                        rmmzBuf[didx + 2] = src[sidx + 2];
                        rmmzBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }

    const rmmzCharsetPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Female.png');
    writePNG(rmmzCharsetPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`Saved RMMZ charset: ${rmmzCharsetPath}`);

    const rmmzSidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1]
        },
        layer: "body",
        species: "human",
        gender: "female",
        stage: "adult"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Female.json'), JSON.stringify(rmmzSidecar, null, 2) + '\n');

    // 3. Build Comparative Showcase: Male & Female Settlers Side-by-Side
    buildComparativeShowcase(frameSouth, frameNorth, frameWest, frameEast);

    // 4. Verification
    runVerification(masterPath, rmmzCharsetPath);
}

function buildComparativeShowcase(femS, femN, femW, femE) {
    const maleCharsetPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Male.png');
    let maleS = null, maleN = null, maleW = null, maleE = null;
    if (fs.existsSync(maleCharsetPath)) {
        const mc = decodePNG(fs.readFileSync(maleCharsetPath));
        const getCell = (r, c) => {
            const buf = Buffer.alloc(48 * 48 * 4);
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = ((r * 48 + y) * mc.width + (c * 48 + x)) * 4;
                    const didx = (y * 48 + x) * 4;
                    buf[didx] = mc.data[sidx];
                    buf[didx + 1] = mc.data[sidx + 1];
                    buf[didx + 2] = mc.data[sidx + 2];
                    buf[didx + 3] = mc.data[sidx + 3];
                }
            }
            return buf;
        };
        maleS = getCell(0, 1);
        maleW = getCell(1, 1);
        maleE = getCell(2, 1);
        maleN = getCell(3, 1);
    }

    let meadowTile = null;
    const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
    if (fs.existsSync(meadowPath)) {
        const m = decodePNG(fs.readFileSync(meadowPath));
        meadowTile = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * m.width + x) * 4;
                const didx = (y * 48 + x) * 4;
                meadowTile[didx] = m.data[sidx];
                meadowTile[didx + 1] = m.data[sidx + 1];
                meadowTile[didx + 2] = m.data[sidx + 2];
                meadowTile[didx + 3] = 255;
            }
        }
    }

    // 8 columns (Male S, W, E, N | Female S, W, E, N) x 192 px width = 1536 px
    const showW = 1536;
    const showH = 640;
    const showBuf = Buffer.alloc(showW * showH * 4);

    // Fill neutral dark background
    for (let i = 0; i < showBuf.length; i += 4) {
        showBuf[i] = 0x14; showBuf[i + 1] = 0x17; showBuf[i + 2] = 0x20; showBuf[i + 3] = 255;
    }

    const maleFrames = [maleS, maleW, maleE, maleN];
    const femFrames  = [femS, femW, femE, femN];
    const labels = ["MALE SOUTH", "MALE WEST", "MALE EAST", "MALE NORTH", "FEMALE SOUTH", "FEMALE WEST", "FEMALE EAST", "FEMALE NORTH"];

    for (let c = 0; c < 8; c++) {
        const fBuf = c < 4 ? maleFrames[c] : femFrames[c - 4];
        const cardX = c * 192;

        // Row 1: Checkerboard (y: 60..251)
        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 192; x++) {
                const o = ((60 + y) * showW + (cardX + x)) * 4;
                const cb = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0) ? 0x24 : 0x1c;
                showBuf[o] = cb; showBuf[o + 1] = cb; showBuf[o + 2] = cb; showBuf[o + 3] = 255;
            }
        }

        // Draw sprite at 4x on checkerboard
        if (fBuf) {
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (fBuf[sidx + 3] === 255) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const didx = ((60 + y * 4 + dy) * showW + (cardX + x * 4 + dx)) * 4;
                                showBuf[didx] = fBuf[sidx];
                                showBuf[didx + 1] = fBuf[sidx + 1];
                                showBuf[didx + 2] = fBuf[sidx + 2];
                                showBuf[didx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }

        // Registration line on checkerboard (row 47)
        for (let x = 0; x < 192; x++) {
            const o = ((60 + 188) * showW + (cardX + x)) * 4;
            showBuf[o] = 0xff; showBuf[o + 1] = 0x33; showBuf[o + 2] = 0x33; showBuf[o + 3] = 180;
        }

        // Row 2: Meadow Grass (y: 300..491)
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                let mr = 77, mg = 93, mb = 40;
                if (meadowTile) {
                    const to = (y * 48 + x) * 4;
                    mr = meadowTile[to]; mg = meadowTile[to + 1]; mb = meadowTile[to + 2];
                }
                const sidx = fBuf ? (y * 48 + x) * 4 : 0;
                const r = (fBuf && fBuf[sidx + 3] === 255) ? fBuf[sidx] : mr;
                const g = (fBuf && fBuf[sidx + 3] === 255) ? fBuf[sidx + 1] : mg;
                const b = (fBuf && fBuf[sidx + 3] === 255) ? fBuf[sidx + 2] : mb;

                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 4; dx++) {
                        const didx = ((300 + y * 4 + dy) * showW + (cardX + x * 4 + dx)) * 4;
                        showBuf[didx] = r; showBuf[didx + 1] = g; showBuf[didx + 2] = b; showBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }

    const reviewPath = path.join(ROOT, 'art', 'review', 'human_settlers_pair_showcase_4x.png');
    writePNG(reviewPath, showW, showH, showBuf);
    console.log(`Saved settler pair comparative showcase: ${reviewPath}`);
}

function runVerification(masterPath, rmmzPath) {
    console.log('\n--- Running Automated Verification ---');
    try {
        const origOut = childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" tools\\originality_check.js "${masterPath}" "${rmmzPath}"`, { cwd: ROOT }).toString();
        console.log(origOut.trim());
    } catch (e) {
        console.error('Originality check output:', (e.stdout || '').toString(), (e.stderr || '').toString());
    }

    try {
        const artOut = childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" tools\\art_check.js "${masterPath}"`, { cwd: ROOT }).toString();
        console.log(artOut.trim());
    } catch (e) {
        console.error('Art check output:', (e.stdout || '').toString(), (e.stderr || '').toString());
    }
}

if (require.main === module) {
    main();
}

