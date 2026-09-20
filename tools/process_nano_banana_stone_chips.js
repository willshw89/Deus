const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Target colors from Prompt 13 / SEG-18 for stone chips
const COLOR_SPARK    = [255, 255, 0];   // #FFFF00 (impact spark)
const COLOR_AMBER    = [255, 174, 0];   // #FFAE00 (spark glow)
const COLOR_HL       = [239, 239, 239]; // #EFEFEF (knapped stone edge)
const COLOR_LIGHT    = [206, 206, 206]; // #CECECE (lit rock facet)
const COLOR_MID      = [174, 174, 174]; // #AEAEAE (mid grey)
const COLOR_SHADOW   = [109, 109, 109]; // #6D6D6D (shadowed facet)
const COLOR_DARK     = [81, 81, 81];    // #515151 (deep fracture)
const COLOR_MAGENTA  = [255, 0, 255];   // Background

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const colors = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('#')) continue;
        const hex = trimmed.substring(1);
        if (hex.length === 6) {
            colors.push([
                parseInt(hex.substring(0, 2), 16),
                parseInt(hex.substring(2, 4), 16),
                parseInt(hex.substring(4, 6), 16)
            ]);
        }
    }
    return colors;
}

function colorDist(c1, c2) {
    return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

function snapToPalette(rgb, palette) {
    let best = palette[0];
    let bestDist = Infinity;
    for (const p of palette) {
        const d = colorDist(rgb, p);
        if (d < bestDist) {
            bestDist = d;
            best = p;
        }
    }
    return best;
}

function loadJpgOrPng(filePath) {
    if (filePath.endsWith('.png')) {
        return decodePNG(fs.readFileSync(filePath), path.basename(filePath));
    }
    const tmpPng = path.join(os.tmpdir(), `tmp_stone_${Date.now()}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${filePath}'); $img.Save('${tmpPng}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(filePath));
}

function isBgPixel(r, g, b) {
    return (r > 160 && g < 100 && b > 160) || (r > 140 && g < 80 && b > 140);
}

function processStoneChips(srcPath) {
    if (!fs.existsSync(srcPath)) {
        console.error('Source file not found:', srcPath);
        return false;
    }

    const palette = loadPalette();
    const rawImg = loadJpgOrPng(srcPath);
    console.log(`Loaded Nano Banana stone chips image: ${rawImg.width}x${rawImg.height}`);

    const quarterW = rawImg.width / 4;
    const frameBoxes = [];

    for (let f = 0; f < 4; f++) {
        const xMin = Math.floor(f * quarterW);
        const xMax = Math.floor((f + 1) * quarterW);
        let minX = xMax, maxX = xMin, minY = rawImg.height, maxY = 0;
        let count = 0;

        for (let y = 0; y < rawImg.height; y++) {
            for (let x = xMin; x < xMax; x++) {
                const o = (y * rawImg.width + x) * 4;
                const r = rawImg.data[o];
                const g = rawImg.data[o + 1];
                const b = rawImg.data[o + 2];
                if (!isBgPixel(r, g, b)) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    count++;
                }
            }
        }

        if (count > 0) {
            frameBoxes.push({ f, minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, count });
            console.log(`Stone Frame ${f}: bounds [${minX}..${maxX}] x [${minY}..${maxY}], count=${count}`);
        } else {
            frameBoxes.push({ f, minX: xMin + quarterW * 0.2, maxX: xMax - quarterW * 0.2, minY: rawImg.height * 0.3, maxY: rawImg.height * 0.7, cx: (xMin + xMax) / 2, cy: rawImg.height * 0.5, count: 0 });
        }
    }

    // Target 48x48 cell per frame, strike point at (24, 30)
    const TARGET_CX = 24;
    const TARGET_CY = 30;
    const blockSize = Math.max(12, Math.min(20, (rawImg.height / 48) * 0.6));

    const frames48 = [];

    for (let f = 0; f < 4; f++) {
        const grid = Array.from({ length: 48 }, () => Array(48).fill(null));
        const box = frameBoxes[f];

        for (let gy = 0; gy < 48; gy++) {
            for (let gx = 0; gx < 48; gx++) {
                const relGx = gx - TARGET_CX;
                const relGy = gy - TARGET_CY;

                const srcX = Math.round(box.cx + relGx * blockSize);
                const srcY = Math.round(box.cy + relGy * blockSize);

                if (srcX < 0 || srcX >= rawImg.width || srcY < 0 || srcY >= rawImg.height) continue;

                let sumR = 0, sumG = 0, sumB = 0, count = 0;
                const halfWin = Math.max(1, Math.floor(blockSize * 0.4));

                for (let sy = srcY - halfWin; sy <= srcY + halfWin; sy++) {
                    for (let sx = srcX - halfWin; sx <= srcX + halfWin; sx++) {
                        if (sx < 0 || sx >= rawImg.width || sy < 0 || sy >= rawImg.height) continue;
                        const o = (sy * rawImg.width + sx) * 4;
                        const r = rawImg.data[o];
                        const g = rawImg.data[o + 1];
                        const b = rawImg.data[o + 2];
                        if (!isBgPixel(r, g, b)) {
                            sumR += r;
                            sumG += g;
                            sumB += b;
                            count++;
                        }
                    }
                }

                const totalWinPixels = (2 * halfWin + 1) * (2 * halfWin + 1);
                if (count > totalWinPixels * 0.25) {
                    const avgR = sumR / count;
                    const avgG = sumG / count;
                    const avgB = sumB / count;

                    // Spark detection
                    if (f === 0 && avgR > 200 && avgG > 180 && avgB < 120) {
                        grid[gy][gx] = snapToPalette(COLOR_SPARK, palette);
                    } else if (f === 0 && avgR > 200 && avgG > 140 && avgB < 80) {
                        grid[gy][gx] = snapToPalette(COLOR_AMBER, palette);
                    } else {
                        const lum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
                        let chosen = COLOR_MID;
                        if (lum > 215) chosen = COLOR_HL;
                        else if (lum > 175) chosen = COLOR_LIGHT;
                        else if (lum > 125) chosen = COLOR_MID;
                        else if (lum > 75) chosen = COLOR_SHADOW;
                        else chosen = COLOR_DARK;

                        grid[gy][gx] = snapToPalette(chosen, palette);
                    }
                }
            }
        }
        frames48.push(grid);
    }

    // 1. Export Master: 192x48 on flat magenta
    const masterBuf = Buffer.alloc(192 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 192; x++) {
            const f = Math.floor(x / 48);
            const lx = x % 48;
            const c = frames48[f][y][lx];
            const o = (y * 192 + x) * 4;
            if (c) {
                masterBuf[o] = c[0]; masterBuf[o+1] = c[1]; masterBuf[o+2] = c[2]; masterBuf[o+3] = 255;
            } else {
                masterBuf[o] = COLOR_MAGENTA[0]; masterBuf[o+1] = COLOR_MAGENTA[1]; masterBuf[o+2] = COLOR_MAGENTA[2]; masterBuf[o+3] = 255;
            }
        }
    }
    const masterPngPath = path.join(ROOT, 'art', 'masters', 'fx_stone_chips.png');
    writePNG(masterPngPath, 192, 48, masterBuf);

    const masterJson = {
        id: "fx_stone_chips",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: {
            stand: [0],
            mine: [0, 1, 2, 3]
        },
        layer: "fx",
        frameMs: 60
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'fx_stone_chips.json'), JSON.stringify(masterJson, null, 2));

    // 2. Export 4x Raw: 768x192 on flat magenta
    const raw4xBuf = Buffer.alloc(768 * 192 * 4);
    for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 768; x++) {
            const mx = Math.floor(x / 4);
            const my = Math.floor(y / 4);
            const mo = (my * 192 + mx) * 4;
            const ro = (y * 768 + x) * 4;
            raw4xBuf[ro] = masterBuf[mo];
            raw4xBuf[ro+1] = masterBuf[mo+1];
            raw4xBuf[ro+2] = masterBuf[mo+2];
            raw4xBuf[ro+3] = 255;
        }
    }
    const rawPngPath = path.join(ROOT, 'art', 'raw', 'fx_stone_chips.png');
    writePNG(rawPngPath, 768, 192, raw4xBuf);

    // 3. Export RMMZ single character sheet: 144x192 (3 columns x 4 rows)
    const rmmzFrameIndices = [0, 1, 2];
    const rmmzBuf = Buffer.alloc(144 * 192 * 4);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const f = rmmzFrameIndices[col];
            for (let ly = 0; ly < 48; ly++) {
                for (let lx = 0; lx < 48; lx++) {
                    const c = frames48[f][ly][lx];
                    const gx = col * 48 + lx;
                    const gy = row * 48 + ly;
                    const o = (gy * 144 + gx) * 4;
                    if (c) {
                        rmmzBuf[o] = c[0]; rmmzBuf[o+1] = c[1]; rmmzBuf[o+2] = c[2]; rmmzBuf[o+3] = 255;
                    } else {
                        rmmzBuf[o] = 0; rmmzBuf[o+1] = 0; rmmzBuf[o+2] = 0; rmmzBuf[o+3] = 0;
                    }
                }
            }
        }
    }

    const gameSheetPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_fx_stone_chips.png');
    writePNG(gameSheetPath, 144, 192, rmmzBuf);

    const gameJson = {
        id: "$UF_fx_stone_chips",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [0],
            mine: [0, 1, 2]
        },
        layer: "fx",
        frameMs: 60
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_fx_stone_chips.json'), JSON.stringify(gameJson, null, 2));

    console.log('Successfully processed and exported fx_stone_chips (master, raw, and RMMZ sheet)!');
    return true;
}

if (require.main === module) {
    const srcArg = process.argv[2] || path.join(ROOT, 'art', 'raw', 'fx_stone_chips_raw.jpg');
    processStoneChips(srcArg);
}

module.exports = { processStoneChips };
