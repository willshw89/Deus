const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Read palette & prepare CIELAB snapping
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

function isBgPixel(r, g, b) {
    // Pure or near magenta background
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 130 && g < 70 && b > 130) return true;
    if (r > 180 && g < 120 && b > 180) return true;
    return false;
}

// Process single facing JPG into a 48x48 RGBA buffer
function processFacing(img, name, options = {}) {
    console.log(`Processing ${name}: ${img.width}x${img.height}`);

    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx];
            const g = img.data[idx + 1];
            const b = img.data[idx + 2];
            if (!isBgPixel(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    console.log(`  BBox for ${name}: [${minX}, ${minY}] to [${maxX}, ${maxY}] (${bboxW}x${bboxH})`);

    // Target deer spec: height up to 47 px (with antlers, rows 1..47, grounded on row 47)
    // Body length up to 44 px.
    const targetH = Math.min(47, Math.max(44, options.targetH || 46));
    const scale = targetH / bboxH;
    const targetW = Math.min(46, Math.round(bboxW * scale));
    const startX = Math.round(24 - targetW / 2) + (options.offsetX || 0);
    const startY = 48 - targetH; // e.g. 1 or 2

    const out48 = Buffer.alloc(48 * 48 * 4); // RGBA

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
                    if (!isBgPixel(r, g, b)) {
                        sumR += r; sumG += g; sumB += b;
                        count++;
                    }
                }
            }

            const total = (srcY1 - srcY0) * (srcX1 - srcX0);
            const outIdx = (outY * 48 + outX) * 4;
            if (count > total * 0.30) {
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                const snapped = pal.snap(avgR, avgG, avgB);
                out48[outIdx] = snapped[0];
                out48[outIdx + 1] = snapped[1];
                out48[outIdx + 2] = snapped[2];
                out48[outIdx + 3] = 255;
            } else {
                out48[outIdx + 3] = 0;
            }
        }
    }

    return out48;
}

// Mirror frame horizontally
function mirrorFrame(buf) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const srcIdx = (y * 48 + x) * 4;
            const dstIdx = (y * 48 + (47 - x)) * 4;
            out[dstIdx] = buf[srcIdx];
            out[dstIdx + 1] = buf[srcIdx + 1];
            out[dstIdx + 2] = buf[srcIdx + 2];
            out[dstIdx + 3] = buf[srcIdx + 3];
        }
    }
    return out;
}

// Generate idle breathing animation frames from stand frame
// Frame 0: Stand
// Frame 1: Idle 1 (gentle breathing expansion in chest/flank, head subtle 1px breath)
// Frame 2: Idle 2 (ear twitch / alert subtle recovery)
function generateIdleFrames(baseFrame, facingId) {
    const f0 = Buffer.from(baseFrame);
    const f1 = Buffer.from(baseFrame);
    const f2 = Buffer.from(baseFrame);

    // Frame 1: Subtle breathing (slight expansion in middle torso / flank rows 20-36)
    for (let y = 20; y <= 36; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (f0[idx + 3] > 0) {
                // If on flank boundary, expand slightly or highlight
                if (facingId === 'W' || facingId === 'NW') {
                    // Slight breathing rise
                    if (y >= 22 && y <= 32) {
                        const aboveIdx = ((y - 1) * 48 + x) * 4;
                        if (f0[aboveIdx + 3] === 0 && Math.random() < 0.25) {
                            f1[aboveIdx] = f0[idx];
                            f1[aboveIdx + 1] = f0[idx + 1];
                            f1[aboveIdx + 2] = f0[idx + 2];
                            f1[aboveIdx + 3] = 255;
                        }
                    }
                } else if (facingId === 'S' || facingId === 'N') {
                    // Breathing expansion on sides
                    if (x <= 20) {
                        const leftIdx = (y * 48 + (x - 1)) * 4;
                        if (x > 1 && f0[leftIdx + 3] === 0 && Math.random() < 0.2) {
                            f1[leftIdx] = f0[idx];
                            f1[leftIdx + 1] = f0[idx + 1];
                            f1[leftIdx + 2] = f0[idx + 2];
                            f1[leftIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    // Frame 2: Alert / ear flick frame
    // Antlers and ears on rows 1..18
    for (let y = 5; y <= 16; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (f0[idx + 3] > 0) {
                // Ears at rows 10-15: shift 1px horizontally
                if (y >= 10 && y <= 14) {
                    if (facingId === 'S' || facingId === 'SW' || facingId === 'W') {
                        // Ear twitch
                        if (x >= 28 && x <= 35) {
                            const shiftIdx = ((y - 1) * 48 + (x + 1)) * 4;
                            if (shiftIdx >= 0 && shiftIdx < 48 * 48 * 4) {
                                f2[shiftIdx] = f0[idx];
                                f2[shiftIdx + 1] = f0[idx + 1];
                                f2[shiftIdx + 2] = f0[idx + 2];
                                f2[shiftIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    return [f0, f1, f2];
}

const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/db800f88-dfc4-4e99-a47d-ad67d22b80de';

const southJpg = path.join(BRAIN, 'deer_stag_south_nano_banana_1789836305903.jpg');
const southWestJpg = path.join(BRAIN, 'deer_stag_west_nano_banana_1789836391916.jpg');
const westJpg = path.join(BRAIN, 'deer_stag_west_profile_nano_banana_1789836408306.jpg');
const northWestJpg = path.join(BRAIN, 'deer_stag_northwest_nano_banana_1789836447915.jpg');
const northJpg = path.join(BRAIN, 'deer_stag_north_nano_banana_1789836422825.jpg');

console.log('Loading base facings from Nano Banana output...');
const baseSouth = processFacing(loadJpg(southJpg), 'South', { targetH: 46, offsetX: 2 });
const baseSouthWest = processFacing(loadJpg(southWestJpg), 'SouthWest', { targetH: 46 });
const baseWest = processFacing(loadJpg(westJpg), 'West', { targetH: 46 });
const baseNorthWest = processFacing(loadJpg(northWestJpg), 'NorthWest', { targetH: 46 });
const baseNorth = processFacing(loadJpg(northJpg), 'North', { targetH: 46 });

const baseNorthEast = mirrorFrame(baseNorthWest);
const baseEast = mirrorFrame(baseWest);
const baseSouthEast = mirrorFrame(baseSouthWest);

const facingList = [
    { id: 'S', base: baseSouth },
    { id: 'SW', base: baseSouthWest },
    { id: 'W', base: baseWest },
    { id: 'NW', base: baseNorthWest },
    { id: 'N', base: baseNorth },
    { id: 'NE', base: baseNorthEast },
    { id: 'E', base: baseEast },
    { id: 'SE', base: baseSouthEast }
];

console.log('Generating 3 idle frames per facing...');
const idleGrid = [];
for (const f of facingList) {
    const frames = generateIdleFrames(f.base, f.id);
    idleGrid.push({ id: f.id, frames });
}

// 1. Build 4x Raw Canvas (576 x 1536 px: 3 columns x 8 rows of 192x192)
console.log('Building 4x raw canvas (576 x 1536 px)...');
const rawW = 192 * 3; // 576
const rawH = 192 * 8; // 1536
const rawBuf = Buffer.alloc(rawW * rawH * 4);

// Fill with flat magenta #FF00FF
for (let i = 0; i < rawW * rawH; i++) {
    rawBuf[i * 4] = 255;
    rawBuf[i * 4 + 1] = 0;
    rawBuf[i * 4 + 2] = 255;
    rawBuf[i * 4 + 3] = 255;
}

for (let r = 0; r < 8; r++) {
    const rowFrames = idleGrid[r].frames;
    for (let col = 0; col < 3; col++) {
        const fBuf = rowFrames[col];
        const cellX0 = col * 192;
        const cellY0 = r * 192;

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * 48 + x) * 4;
                if (fBuf[sidx + 3] > 0) {
                    const pr = fBuf[sidx], pg = fBuf[sidx + 1], pb = fBuf[sidx + 2];
                    for (let dy = 0; dy < 4; dy++) {
                        for (let dx = 0; dx < 4; dx++) {
                            const didx = ((cellY0 + y * 4 + dy) * rawW + (cellX0 + x * 4 + dx)) * 4;
                            rawBuf[didx] = pr;
                            rawBuf[didx + 1] = pg;
                            rawBuf[didx + 2] = pb;
                            rawBuf[didx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
}

const rawPath = path.join(ROOT, 'art', 'raw', 'deer_idle.png');
writePNG(rawPath, rawW, rawH, rawBuf);
console.log(`Saved raw 4x canvas: ${rawPath}`);

// 2. Build 1:1 Screen Master (144 x 384 px: 3 columns x 8 rows of 48x48)
console.log('Building 1:1 screen master sheet (144 x 384 px)...');
const masterW = 48 * 3; // 144
const masterH = 48 * 8; // 384
const masterBuf = Buffer.alloc(masterW * masterH * 4); // Transparent RGBA

for (let r = 0; r < 8; r++) {
    const rowFrames = idleGrid[r].frames;
    for (let col = 0; col < 3; col++) {
        const fBuf = rowFrames[col];
        const cellX0 = col * 48;
        const cellY0 = r * 48;

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * 48 + x) * 4;
                if (fBuf[sidx + 3] > 0) {
                    const didx = ((cellY0 + y) * masterW + (cellX0 + x)) * 4;
                    masterBuf[didx] = fBuf[sidx];
                    masterBuf[didx + 1] = fBuf[sidx + 1];
                    masterBuf[didx + 2] = fBuf[sidx + 2];
                    masterBuf[didx + 3] = 255;
                }
            }
        }
    }
}

const masterPngPath = path.join(ROOT, 'art', 'masters', 'deer_idle.png');
writePNG(masterPngPath, masterW, masterH, masterBuf);
console.log(`Saved master sheet: ${masterPngPath}`);

// Sidecar JSON
const masterJson = {
    id: "deer_idle",
    species: "deer",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    heightLifts: 0,
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    animations: {
        stand: [0],
        idle: [0, 1, 2, 1]
    },
    frameMs: 300,
    layer: "body",
    category: "wildlife",
    generator: "Google Nano Banana (Rule V69, V70)"
};

const masterJsonPath = path.join(ROOT, 'art', 'masters', 'deer_idle.json');
fs.writeFileSync(masterJsonPath, JSON.stringify(masterJson, null, 2) + '\n');
console.log(`Saved master sidecar: ${masterJsonPath}`);

// 3. Run make_25d.js to reduce palette to 32 colors and write master sidecar
console.log('Running make_25d.js on art/raw/deer_idle.png...');
const make25dCmd = `"${process.execPath}" tools/make_25d.js art/raw/deer_idle.png --sheet 3x8 --facings S,SW,W,NW,N,NE,E,SE --max-colors 32 --lean none --bg-holes --force`;
childProcess.execSync(make25dCmd, { cwd: ROOT, stdio: 'inherit' });

// 4. Build Standard RMMZ Character Sheet (144 x 192 px: 3 cols x 4 rows)
// Taking frames directly from the cleaned 32-color master sheet ensures strict <= 32 color palette.
console.log('Building standard RMMZ character sheet (144 x 192 px) from 32-color master...');
const cleanMaster = decodePNG(fs.readFileSync(masterPngPath), 'master');
const rmmzW = 144;
const rmmzH = 192;
const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

const rmmzMasterRows = [
    0, // S -> Row 0 (Down)
    2, // W -> Row 1 (Left)
    6, // E -> Row 2 (Right)
    4  // N -> Row 3 (Up)
];

for (let r = 0; r < 4; r++) {
    const srcRow = rmmzMasterRows[r];
    const shiftX = (r === 0) ? 2 : 0; // Shift South frame to center mass at exactly x=23.9
    for (let col = 0; col < 3; col++) {
        // RMMZ walk/idle columns: 0 (step1/idle1), 1 (stand), 2 (step2/idle2)
        const srcCol = (col === 0) ? 1 : (col === 1 ? 0 : 2);
        
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = ((srcRow * 48 + y) * masterW + (srcCol * 48 + x)) * 4;
                if (cleanMaster.data[sidx + 3] > 0) {
                    const outX = x + shiftX;
                    if (outX >= 0 && outX < 48) {
                        const didx = ((r * 48 + y) * rmmzW + (col * 48 + outX)) * 4;
                        rmmzBuf[didx] = cleanMaster.data[sidx];
                        rmmzBuf[didx + 1] = cleanMaster.data[sidx + 1];
                        rmmzBuf[didx + 2] = cleanMaster.data[sidx + 2];
                        rmmzBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }
}

const rmmzPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Deer.png');
writePNG(rmmzPath, rmmzW, rmmzH, rmmzBuf);
console.log(`Saved RMMZ charset: ${rmmzPath}`);

const rmmzJson = {
    id: "UF_Deer",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [1],
        walk: [0, 1, 2, 1],
        idle: [0, 1, 2, 1]
    },
    frameMs: 250,
    category: "wildlife"
};

const rmmzJsonPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Deer.json');
fs.writeFileSync(rmmzJsonPath, JSON.stringify(rmmzJson, null, 2) + '\n');
console.log(`Saved RMMZ charset sidecar: ${rmmzJsonPath}`);

// 5. Generate Review Visuals
console.log('Generating review renders...');
const reviewDir = path.join(ROOT, 'art', 'review');
if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

// A. 4x RMMZ Charset Preview
const charset4xW = rmmzW * 4;
const charset4xH = rmmzH * 4;
const charset4xBuf = Buffer.alloc(charset4xW * charset4xH * 4);
for (let y = 0; y < rmmzH; y++) {
    for (let x = 0; x < rmmzW; x++) {
        const sidx = (y * rmmzW + x) * 4;
        const a = rmmzBuf[sidx + 3];
        const pr = a > 0 ? rmmzBuf[sidx] : 32;
        const pg = a > 0 ? rmmzBuf[sidx + 1] : 32;
        const pb = a > 0 ? rmmzBuf[sidx + 2] : 40;
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const didx = ((y * 4 + dy) * charset4xW + (x * 4 + dx)) * 4;
                charset4xBuf[didx] = pr;
                charset4xBuf[didx + 1] = pg;
                charset4xBuf[didx + 2] = pb;
                charset4xBuf[didx + 3] = 255;
            }
        }
    }
}
const charset4xPath = path.join(reviewDir, 'deer_rmmz_charset_4x.png');
writePNG(charset4xPath, charset4xW, charset4xH, charset4xBuf);

// B. 4x Lineup of all 8 facings (Stand, Idle 1, Idle 2)
const lineup4xW = masterW * 4;
const lineup4xH = masterH * 4;
const lineup4xBuf = Buffer.alloc(lineup4xW * lineup4xH * 4);
for (let y = 0; y < masterH; y++) {
    for (let x = 0; x < masterW; x++) {
        const sidx = (y * masterW + x) * 4;
        const a = cleanMaster.data[sidx + 3];
        const pr = a > 0 ? cleanMaster.data[sidx] : 28;
        const pg = a > 0 ? cleanMaster.data[sidx + 1] : 32;
        const pb = a > 0 ? cleanMaster.data[sidx + 2] : 36;
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const didx = ((y * 4 + dy) * lineup4xW + (x * 4 + dx)) * 4;
                lineup4xBuf[didx] = pr;
                lineup4xBuf[didx + 1] = pg;
                lineup4xBuf[didx + 2] = pb;
                lineup4xBuf[didx + 3] = 255;
            }
        }
    }
}
const lineup4xPath = path.join(reviewDir, 'deer_8way_idle_lineup_4x.png');
writePNG(lineup4xPath, lineup4xW, lineup4xH, lineup4xBuf);

// C. Deer on meadow grass next to human settler anchor (Scale & Coherence check)
const meadowPngPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
const settlerPngPath = path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png');
if (fs.existsSync(meadowPngPath) && fs.existsSync(settlerPngPath)) {
    const meadowImg = decodePNG(fs.readFileSync(meadowPngPath), 'meadow');
    const settlerImg = decodePNG(fs.readFileSync(settlerPngPath), 'settler');

    // 4 tiles wide x 2 tiles high canvas = 192 x 96 px native -> 768 x 384 at 4x
    const sceneW = 192, sceneH = 96;
    const sceneBuf = Buffer.alloc(sceneW * sceneH * 4);

    // Tile meadow grass
    for (let ty = 0; ty < 2; ty++) {
        for (let tx = 0; tx < 4; tx++) {
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sidx = (py * 48 + px) * 4;
                    const didx = (((ty * 48 + py) * sceneW) + (tx * 48 + px)) * 4;
                    sceneBuf[didx] = meadowImg.data[sidx];
                    sceneBuf[didx + 1] = meadowImg.data[sidx + 1];
                    sceneBuf[didx + 2] = meadowImg.data[sidx + 2];
                    sceneBuf[didx + 3] = 255;
                }
            }
        }
    }

    // Place Settler on tile 1 (x: 48..95, y: 0..47 grounded on y: 47)
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (settlerImg.data[sidx + 3] > 0) {
                const didx = ((y * sceneW) + (48 + x)) * 4;
                sceneBuf[didx] = settlerImg.data[sidx];
                sceneBuf[didx + 1] = settlerImg.data[sidx + 1];
                sceneBuf[didx + 2] = settlerImg.data[sidx + 2];
                sceneBuf[didx + 3] = 255;
            }
        }
    }

    // Place Deer (West profile) on tile 2 (x: 96..143, y: 0..47 grounded on y: 47)
    // Row 2 is West in cleanMaster
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = ((2 * 48 + y) * masterW + x) * 4;
            if (cleanMaster.data[sidx + 3] > 0) {
                const didx = ((y * sceneW) + (96 + x)) * 4;
                sceneBuf[didx] = cleanMaster.data[sidx];
                sceneBuf[didx + 1] = cleanMaster.data[sidx + 1];
                sceneBuf[didx + 2] = cleanMaster.data[sidx + 2];
                sceneBuf[didx + 3] = 255;
            }
        }
    }

    // Place Deer (South front) on tile 3 (x: 144..191, y: 48..95 grounded on y: 95)
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = ((0 * 48 + y) * masterW + x) * 4;
            if (cleanMaster.data[sidx + 3] > 0) {
                const didx = (((48 + y) * sceneW) + (144 + x)) * 4;
                sceneBuf[didx] = cleanMaster.data[sidx];
                sceneBuf[didx + 1] = cleanMaster.data[sidx + 1];
                sceneBuf[didx + 2] = cleanMaster.data[sidx + 2];
                sceneBuf[didx + 3] = 255;
            }
        }
    }

    // Place Deer (SW 3/4 turn) on tile 0 (x: 0..47, y: 48..95 grounded on y: 95)
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = ((1 * 48 + y) * masterW + x) * 4;
            if (cleanMaster.data[sidx + 3] > 0) {
                const didx = (((48 + y) * sceneW) + x) * 4;
                sceneBuf[didx] = cleanMaster.data[sidx];
                sceneBuf[didx + 1] = cleanMaster.data[sidx + 1];
                sceneBuf[didx + 2] = cleanMaster.data[sidx + 2];
                sceneBuf[didx + 3] = 255;
            }
        }
    }

    // Scale to 4x
    const scene4xW = sceneW * 4, scene4xH = sceneH * 4;
    const scene4xBuf = Buffer.alloc(scene4xW * scene4xH * 4);
    for (let y = 0; y < sceneH; y++) {
        for (let x = 0; x < sceneW; x++) {
            const sidx = (y * sceneW + x) * 4;
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const didx = ((y * 4 + dy) * scene4xW + (x * 4 + dx)) * 4;
                    scene4xBuf[didx] = sceneBuf[sidx];
                    scene4xBuf[didx + 1] = sceneBuf[sidx + 1];
                    scene4xBuf[didx + 2] = sceneBuf[sidx + 2];
                    scene4xBuf[didx + 3] = 255;
                }
            }
        }
    }
    const scene4xPath = path.join(reviewDir, 'deer_on_meadow_4x.png');
    writePNG(scene4xPath, scene4xW, scene4xH, scene4xBuf);
    console.log(`Saved review scene: ${scene4xPath}`);
}

console.log('Deer idle processing complete!');

