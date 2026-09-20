const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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
    try { fs.unlinkSync(tmpPng); } catch (e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

function isMagenta(r, g, b) {
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 130 && g < 70 && b > 130) return true;
    if (r > 180 && g < 120 && b > 180) return true;
    return false;
}

// Global 32-color quantizer
function reduceTo32Colors(buf, maxColors = 32) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topKeys = sorted.slice(0, maxColors - 1).map(e => e[0]);
    const topRgb = topKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topRgb.map(c => srgbToLab(...c));

    const map = new Map();
    for (let i = maxColors - 1; i < sorted.length; i++) {
        const k = sorted[i][0];
        const rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
        const lab = srgbToLab(...rgb);
        let best = topRgb[0], bestDist = Infinity;
        for (let j = 0; j < topLab.length; j++) {
            const d = labDist(lab, topLab[j]);
            if (d < bestDist) { bestDist = d; best = topRgb[j]; }
        }
        map.set(k, best);
    }

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        if (map.has(k)) {
            const rep = map.get(k);
            buf[i] = rep[0];
            buf[i + 1] = rep[1];
            buf[i + 2] = rep[2];
        }
    }
}

// Process 1024x1024 raw frame into 144x144 frame buffer with inner mask
function processU7Frame(img) {
    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
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
    console.log(`Frame BBox: ${bboxW}x${bboxH}`);

    const targetDim = 144;
    const scale = targetDim / Math.max(bboxW, bboxH);
    const frameBuf = Buffer.alloc(144 * 144 * 4);
    const isInnerWindow = Buffer.alloc(144 * 144); // 1 = inside dark blue window

    // Center coordinates inside 144x144: center oval around (72, 72)
    // Radius rx ~ 34, ry ~ 46
    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            const srcX = minX + Math.floor(x / scale);
            const srcY = minY + Math.floor(y / scale);
            const didx = (y * 144 + x) * 4;

            if (srcX < 0 || srcX >= img.width || srcY < 0 || srcY >= img.height) {
                frameBuf[didx + 3] = 0;
                continue;
            }

            const sidx = (srcY * img.width + srcX) * 4;
            const sr = img.data[sidx], sg = img.data[sidx + 1], sb = img.data[sidx + 2];

            if (isMagenta(sr, sg, sb)) {
                frameBuf[didx + 3] = 0;
            } else {
                // Check if this pixel is in the inner dark blue background
                // Inner dark blue has low red, low green, dark blue hue
                const isInnerDark = (sb > sr && sr < 40 && sg < 40 && sb < 80);
                const dx = (x - 72) / 36;
                const dy = (y - 74) / 48;
                const inOval = (dx * dx + dy * dy <= 1.0);

                if (isInnerDark || (inOval && (sr < 50 && sg < 50 && sb < 90))) {
                    isInnerWindow[y * 144 + x] = 1;
                    // Midnight blue #000035 (or #081040)
                    const snapped = pal.snap(0x08, 0x10, 0x40);
                    frameBuf[didx] = snapped[0];
                    frameBuf[didx + 1] = snapped[1];
                    frameBuf[didx + 2] = snapped[2];
                    frameBuf[didx + 3] = 255;
                } else {
                    const snapped = pal.snap(sr, sg, sb);
                    frameBuf[didx] = snapped[0];
                    frameBuf[didx + 1] = snapped[1];
                    frameBuf[didx + 2] = snapped[2];
                    frameBuf[didx + 3] = 255;
                }
            }
        }
    }

    return { frameBuf, isInnerWindow };
}

// Composite character bust into framed 144x144 cell
function compositeFramedBust(frameData, bustImg, bustCellCol, bustCellRow) {
    const out = Buffer.from(frameData.frameBuf);
    const { isInnerWindow } = frameData;

    // Bust cell from original 576x288 faceset (each cell 144x144)
    const cellX0 = bustCellCol * 144;
    const cellY0 = bustCellRow * 144;

    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            const sidx = ((cellY0 + y) * bustImg.width + (cellX0 + x)) * 4;
            const didx = (y * 144 + x) * 4;

            // Only draw bust inside the inner window oval
            if (isInnerWindow[y * 144 + x] === 1) {
                const br = bustImg.data[sidx];
                const bg = bustImg.data[sidx + 1];
                const bb = bustImg.data[sidx + 2];
                const ba = bustImg.data[sidx + 3];

                // Check if bust pixel is not background (the old background was flat dark grey #262626)
                const isBustBg = (br >= 32 && br <= 45 && bg >= 32 && bg <= 45 && bb >= 32 && bb <= 45);
                if (ba > 0 && !isBustBg) {
                    const snapped = pal.snap(br, bg, bb);
                    out[didx] = snapped[0];
                    out[didx + 1] = snapped[1];
                    out[didx + 2] = snapped[2];
                    out[didx + 3] = 255;
                }
            }
        }
    }

    return out;
}

async function run() {
    const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';
    console.log('Loading U7 ornate portrait frame...');
    const frameJpg = path.join(BRAIN, 'nb_u7_face_frame_1789844111983.jpg');
    const stoneFrameJpg = path.join(BRAIN, 'nb_u7_frame_stone_1789844126071.jpg');

    const oakFrame = processU7Frame(loadJpg(frameJpg));
    const stoneFrame = processU7Frame(loadJpg(stoneFrameJpg));

    // Save standalone U7 master frames
    writePNG(path.join(ROOT, 'art', 'masters', 'u7_frame_oak.png'), 144, 144, oakFrame.frameBuf);
    writePNG(path.join(ROOT, 'art', 'masters', 'u7_frame_stone.png'), 144, 144, stoneFrame.frameBuf);
    console.log('Saved U7 master frames to art/masters/');

    // 1. Process Human Male Adult Faceset
    console.log('Processing Human Male Adult faceset with U7 ornate frames...');
    const maleFacePath = path.join(ROOT, 'game', 'img', 'faces', 'UF_Faces_Human_Male_Adult.png');
    const maleFaceset = decodePNG(fs.readFileSync(maleFacePath), 'male_faceset');

    const sheetW = 576, sheetH = 288;
    const maleOutBuf = Buffer.alloc(sheetW * sheetH * 4);

    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
            // Alternate oak frame and stone frame for rich Arthurian variety
            const frame = (c % 2 === 0) ? oakFrame : stoneFrame;
            const framedCell = compositeFramedBust(frame, maleFaceset, c, r);

            for (let y = 0; y < 144; y++) {
                for (let x = 0; x < 144; x++) {
                    const sidx = (y * 144 + x) * 4;
                    const didx = ((r * 144 + y) * sheetW + (c * 144 + x)) * 4;
                    maleOutBuf[didx] = framedCell[sidx];
                    maleOutBuf[didx + 1] = framedCell[sidx + 1];
                    maleOutBuf[didx + 2] = framedCell[sidx + 2];
                    maleOutBuf[didx + 3] = framedCell[sidx + 3];
                }
            }
        }
    }

    reduceTo32Colors(maleOutBuf, 32);
    writePNG(maleFacePath, sheetW, sheetH, maleOutBuf);
    writePNG(path.join(ROOT, 'art', 'masters', 'face_human_male_adult.png'), sheetW, sheetH, maleOutBuf);
    console.log(`Updated Male Faceset with U7 frames: ${maleFacePath}`);

    // 2. Process Human Female Adult Faceset
    console.log('Processing Human Female Adult faceset with U7 ornate frames...');
    const femaleFacePath = path.join(ROOT, 'game', 'img', 'faces', 'UF_Faces_Human_Female_Adult.png');
    if (fs.existsSync(femaleFacePath)) {
        const femaleFaceset = decodePNG(fs.readFileSync(femaleFacePath), 'female_faceset');
        const femaleOutBuf = Buffer.alloc(sheetW * sheetH * 4);

        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 4; c++) {
                const frame = (c % 2 === 0) ? oakFrame : stoneFrame;
                const framedCell = compositeFramedBust(frame, femaleFaceset, c, r);

                for (let y = 0; y < 144; y++) {
                    for (let x = 0; x < 144; x++) {
                        const sidx = (y * 144 + x) * 4;
                        const didx = ((r * 144 + y) * sheetW + (c * 144 + x)) * 4;
                        femaleOutBuf[didx] = framedCell[sidx];
                        femaleOutBuf[didx + 1] = framedCell[sidx + 1];
                        femaleOutBuf[didx + 2] = framedCell[sidx + 2];
                        femaleOutBuf[didx + 3] = framedCell[sidx + 3];
                    }
                }
            }
        }

        reduceTo32Colors(femaleOutBuf, 32);
        writePNG(femaleFacePath, sheetW, sheetH, femaleOutBuf);
        writePNG(path.join(ROOT, 'art', 'masters', 'face_human_female_adult.png'), sheetW, sheetH, femaleOutBuf);
        console.log(`Updated Female Faceset with U7 frames: ${femaleFacePath}`);
    }

    // 3. Generate grand review render
    console.log('Generating U7 facesets review render...');
    const revW = 576 * 2, revH = 288 * 2;
    const revBuf = Buffer.alloc(revW * revH * 4);

    // 2x zoom of male faceset
    for (let y = 0; y < 288; y++) {
        for (let x = 0; x < 576; x++) {
            const sidx = (y * sheetW + x) * 4;
            const r = maleOutBuf[sidx], g = maleOutBuf[sidx + 1], b = maleOutBuf[sidx + 2], a = maleOutBuf[sidx + 3];
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const didx = ((y * 2 + dy) * revW + (x * 2 + dx)) * 4;
                    revBuf[didx] = r;
                    revBuf[didx + 1] = g;
                    revBuf[didx + 2] = b;
                    revBuf[didx + 3] = a;
                }
            }
        }
    }
    const revPath = path.join(ROOT, 'art', 'review', 'u7_facesets_review_2x.png');
    writePNG(revPath, revW, revH, revBuf);
    console.log(`Saved review showcase: ${revPath}`);
}

run().catch(console.error);
