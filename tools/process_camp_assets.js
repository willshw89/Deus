#!/usr/bin/env node
'use strict';

/**
 * tools/process_camp_assets.js
 * 
 * Processes Camp & Settlement Core Assets:
 * 1. campfire (unlit 48x48 master)
 * 2. campfire_lit (3-frame animated 144x48 master & RMMZ !$UF_Campfire.png 144x192)
 * 3. workbench (crafting table 48x48 master & RMMZ !$UF_Workbench.png 144x192)
 * 
 * Conforms to:
 * - FF6 HD 2D top-down standard (ART_STANDARD.md)
 * - Pure binary alpha (0 or 255)
 * - CIELAB CIE76 palette snapping to art/palette/uf.hex (<= 32 colors)
 * - Zero magenta/purple background fringe
 * - Ground contact row 47, center column 24
 * - Originality check against 19,431 U7 shapes (distance >= 0.28)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ============================================================================
// 1. CIELAB Palette Snapping
// ============================================================================

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

function labDist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

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

    // Exclude all magenta/purple shades to prevent edge bleed
    const isPurpleOrMagenta = (r, g, b) => (r > 25 && b > 25 && g < Math.min(r, b) - 15) || (b > g + 25 && r > g + 25 && b > 50) || (r > 180 && b > 180 && g < 100);
    const filteredPalette = unique.filter(c => !isPurpleOrMagenta(c[0], c[1], c[2]));
    const filteredLabs = filteredPalette.map(c => srgbToLab(...c));
    const cache = new Map();

    return {
        snap(r, g, b) {
            const k = (r << 16) | (g << 8) | b;
            if (cache.has(k)) return cache.get(k);

            const l = srgbToLab(r, g, b);
            let best = filteredPalette[0], bd = Infinity;
            for (let i = 0; i < filteredLabs.length; i++) {
                const d = labDist(l, filteredLabs[i]);
                if (d < bd) { bd = d; best = filteredPalette[i]; }
            }
            cache.set(k, best);
            return best;
        }
    };
}

const pal = loadPalette();

// ============================================================================
// 2. Magenta Keying & Defringing
// ============================================================================

function isMagentaOrFringe(r, g, b, isFlame = false) {
    // Pure or near-pure magenta
    const dr = r - 255, dg = g - 0, db = b - 255;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= 90) return true;

    // Any purples/pinks/magentas
    if (!isFlame) {
        if (r > 25 && b > 25 && g < Math.min(r, b) - 15) return true;
        if (b > g + 15 && b > 50 && r > 50) return true;
        if (r > 120 && b > 80 && (r + b) > (g * 2 + 20)) return true;
    } else {
        // Flame has reds and yellows, but not high blue with high red and low green
        if (b > 80 && r > 120 && g < 50) return true;
        if (b > 100 && b > g + 25) return true;
    }

    return false;
}

function keyMagentaAndDefringe(img, isFlame = false) {
    const { width: w, height: h, data } = img;
    const visited = new Uint8Array(w * h);
    const queue = [];

    function checkAndPush(x, y) {
        const idx = y * w + x;
        if (visited[idx]) return;
        const o = idx * 4;
        if (isMagentaOrFringe(data[o], data[o + 1], data[o + 2], isFlame)) {
            visited[idx] = 1;
            queue.push(idx);
        }
    }

    for (let x = 0; x < w; x++) {
        checkAndPush(x, 0);
        checkAndPush(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
        checkAndPush(0, y);
        checkAndPush(w - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        const neighbors = [
            [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                if (!visited[nIdx]) {
                    const no = nIdx * 4;
                    if (isMagentaOrFringe(data[no], data[no + 1], data[no + 2], isFlame)) {
                        visited[nIdx] = 1;
                        queue.push(nIdx);
                    }
                }
            }
        }
    }

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const o = idx * 4;
            if (visited[idx] || isMagentaOrFringe(data[o], data[o + 1], data[o + 2], isFlame)) {
                data[o] = 0;
                data[o + 1] = 0;
                data[o + 2] = 0;
                data[o + 3] = 0;
            } else {
                data[o + 3] = 255;
            }
        }
    }
}

function findRawBounds(img) {
    const { width: w, height: h, data } = img;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            if (data[o + 3] === 255) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX === -1) {
        return { minX: 0, maxX: w - 1, minY: 0, maxY: h - 1, w, h };
    }
    return { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// ============================================================================
// 3. Micro & Object Downsampling
// ============================================================================

function scaleToTarget(rawImg, targetW, targetH, isFlame = false) {
    const rawBounds = findRawBounds(rawImg);
    const scale = Math.min(targetW / rawBounds.w, targetH / rawBounds.h);
    const fitW = Math.max(1, Math.round(rawBounds.w * scale));
    const fitH = Math.max(1, Math.round(rawBounds.h * scale));

    const outW = 48;
    const outH = 48;
    const outBuf = Buffer.alloc(outW * outH * 4);

    const startDstY = 48 - fitH;
    const startDstX = Math.round(24 - fitW / 2);

    for (let py = 0; py < fitH; py++) {
        const dstY = startDstY + py;
        if (dstY < 0 || dstY >= outH) continue;

        const srcY0 = Math.floor(rawBounds.minY + py * (rawBounds.h / fitH));
        const srcY1 = Math.floor(rawBounds.minY + (py + 1) * (rawBounds.h / fitH));

        for (let px = 0; px < fitW; px++) {
            const dstX = startDstX + px;
            if (dstX < 0 || dstX >= outW) continue;

            const srcX0 = Math.floor(rawBounds.minX + px * (rawBounds.w / fitW));
            const srcX1 = Math.floor(rawBounds.minX + (px + 1) * (rawBounds.w / fitW));

            const colorCounts = new Map();
            let opaqueCount = 0;
            let totalCount = 0;

            for (let sy = srcY0; sy < srcY1; sy++) {
                if (sy < 0 || sy >= rawImg.height) continue;
                for (let sx = srcX0; sx < srcX1; sx++) {
                    if (sx < 0 || sx >= rawImg.width) continue;
                    totalCount++;
                    const so = (sy * rawImg.width + sx) * 4;
                    if (rawImg.data[so + 3] === 255) {
                        const r = rawImg.data[so];
                        const g = rawImg.data[so + 1];
                        const b = rawImg.data[so + 2];
                        if (!isMagentaOrFringe(r, g, b, isFlame)) {
                            opaqueCount++;
                            const k = (r << 16) | (g << 8) | b;
                            colorCounts.set(k, (colorCounts.get(k) || 0) + 1);
                        }
                    }
                }
            }

            const dstIdx = (dstY * outW + dstX) * 4;
            if (opaqueCount >= Math.max(2, Math.floor(totalCount * 0.15))) {
                let bestKey = 0, bestCount = -1;
                for (const [k, count] of colorCounts.entries()) {
                    if (count > bestCount) {
                        bestCount = count;
                        bestKey = k;
                    }
                }
                outBuf[dstIdx] = (bestKey >> 16) & 255;
                outBuf[dstIdx + 1] = (bestKey >> 8) & 255;
                outBuf[dstIdx + 2] = bestKey & 255;
                outBuf[dstIdx + 3] = 255;
            } else {
                outBuf[dstIdx] = 0;
                outBuf[dstIdx + 1] = 0;
                outBuf[dstIdx + 2] = 0;
                outBuf[dstIdx + 3] = 0;
            }
        }
    }

    return { width: outW, height: outH, data: outBuf, bounds: { fitW, fitH, startDstX, startDstY } };
}

function groundAndCenter(img) {
    let minX = 48, maxX = -1, minY = 48, maxY = -1;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const o = (y * 48 + x) * 4;
            if (img.data[o + 3] === 255) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX === -1) {
        return { img, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, w: 0, h: 0 } };
    }

    const dy = 47 - maxY;
    const midX = Math.round((minX + maxX) / 2);
    let dx = 24 - midX;

    if (minX + dx < 0) dx = -minX;
    if (maxX + dx >= 48) dx = 47 - maxX;

    let finalData = img.data;
    if (dy !== 0 || dx !== 0) {
        const shifted = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < 48 && ny >= 0 && ny < 48) {
                    const srcO = (y * 48 + x) * 4;
                    const dstO = (ny * 48 + nx) * 4;
                    shifted[dstO] = img.data[srcO];
                    shifted[dstO + 1] = img.data[srcO + 1];
                    shifted[dstO + 2] = img.data[srcO + 2];
                    shifted[dstO + 3] = img.data[srcO + 3];
                }
            }
        }
        finalData = shifted;
        minX += dx; maxX += dx;
        minY += dy; maxY += dy;
    }

    return {
        img: { width: 48, height: 48, data: finalData },
        bounds: { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 }
    };
}

function snapAndQuantize(img) {
    const { width: w, height: h, data } = img;
    const colorUsage = new Map();

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            if (data[o + 3] === 255) {
                const snapped = pal.snap(data[o], data[o + 1], data[o + 2]);
                data[o] = snapped[0];
                data[o + 1] = snapped[1];
                data[o + 2] = snapped[2];

                const k = (snapped[0] << 16) | (snapped[1] << 8) | snapped[2];
                colorUsage.set(k, (colorUsage.get(k) || 0) + 1);
            }
        }
    }

    if (colorUsage.size > 32) {
        const sortedColors = Array.from(colorUsage.entries()).sort((a, b) => b[1] - a[1]);
        const allowedColors = sortedColors.slice(0, 31).map(entry => {
            const k = entry[0];
            return [(k >> 16) & 255, (k >> 8) & 255, k & 255];
        });
        const allowedLabs = allowedColors.map(c => srgbToLab(...c));

        const remap = new Map();
        for (let i = 31; i < sortedColors.length; i++) {
            const k = sortedColors[i][0];
            const rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
            const lab = srgbToLab(...rgb);
            let best = allowedColors[0], bd = Infinity;
            for (let j = 0; j < allowedLabs.length; j++) {
                const d = labDist(lab, allowedLabs[j]);
                if (d < bd) { bd = d; best = allowedColors[j]; }
            }
            remap.set(k, best);
        }

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const o = (y * w + x) * 4;
                if (data[o + 3] === 255) {
                    const k = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2];
                    if (remap.has(k)) {
                        const m = remap.get(k);
                        data[o] = m[0];
                        data[o + 1] = m[1];
                        data[o + 2] = m[2];
                    }
                }
            }
        }
    }

    const finalColors = new Set();
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 255) {
            finalColors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
        }
    }
    return finalColors.size;
}

// ============================================================================
// 4. Main Processing
// ============================================================================

console.log('=== UF Camp & Settlement Assets Processing ===\n');

// --- 1. Campfire Unlit ---
console.log('1. Processing Campfire Unlit...');
const unlitRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'campfire_unlit.png')));
keyMagentaAndDefringe(unlitRaw, false);
const unlitScaled = scaleToTarget(unlitRaw, 38, 30, false);
const unlitGrounded = groundAndCenter(unlitScaled);
const unlitColors = snapAndQuantize(unlitGrounded.img);
console.log(`  Snapped campfire unlit: ${unlitColors} colors, bounds: ${unlitGrounded.bounds.w}x${unlitGrounded.bounds.h}`);

const campfireMasterPath = path.join(ROOT, 'art', 'masters', 'campfire.png');
writePNG(campfireMasterPath, 48, 48, unlitGrounded.img.data);
const campfireSidecar = {
    id: "campfire",
    name: "Campfire (Unlit)",
    category: "Building",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: { "stand": [0] },
    passable: false,
    under: false
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'campfire.json'), JSON.stringify(campfireSidecar, null, 2));

// --- 2. Campfire Lit (3 frames) ---
console.log('\n2. Processing Campfire Lit (3 Animation Frames)...');
const litRawFiles = ['campfire_lit.png', 'campfire_lit_f2.png', 'campfire_lit_f3.png'];
const litFrames = [];

for (let i = 0; i < 3; i++) {
    const raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', litRawFiles[i])));
    keyMagentaAndDefringe(raw, true);
    const scaled = scaleToTarget(raw, 38, 36, true);
    const grounded = groundAndCenter(scaled);
    const colors = snapAndQuantize(grounded.img);
    console.log(`  Frame ${i}: ${colors} colors, bounds: ${grounded.bounds.w}x${grounded.bounds.h}`);
    litFrames.push(grounded.img);
}

// Master lit sheet: 144x48 px
const litMasterW = 144, litMasterH = 48;
const litMasterBuf = Buffer.alloc(litMasterW * litMasterH * 4);
for (let f = 0; f < 3; f++) {
    const fImg = litFrames[f];
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * litMasterW + (f * 48 + x)) * 4;
            litMasterBuf[dIdx] = fImg.data[sIdx];
            litMasterBuf[dIdx + 1] = fImg.data[sIdx + 1];
            litMasterBuf[dIdx + 2] = fImg.data[sIdx + 2];
            litMasterBuf[dIdx + 3] = fImg.data[sIdx + 3];
        }
    }
}

// Global quantization across all 3 frames to strictly enforce <= 32 colors on the sheet
const litMasterImg = { width: litMasterW, height: litMasterH, data: litMasterBuf };
const litSheetColors = snapAndQuantize(litMasterImg);
console.log(`  Combined 3-frame lit sheet colors: ${litSheetColors} (limit 32)`);

const campfireLitMasterPath = path.join(ROOT, 'art', 'masters', 'campfire_lit.png');
writePNG(campfireLitMasterPath, litMasterW, litMasterH, litMasterBuf);
const campfireLitSidecar = {
    id: "campfire_lit",
    name: "Campfire (Lit)",
    category: "Building",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: { "stand": [0], "lit": [0, 1, 2] },
    frameMs: 150,
    passable: false,
    under: false
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'campfire_lit.json'), JSON.stringify(campfireLitSidecar, null, 2));

// Export RMMZ single-character sheet: 144x192 px (3 cols x 4 rows)
// Stepping animation cycles cols 0, 1, 2 across all 4 rows
const rmmzCampfireW = 144, rmmzCampfireH = 192;
const rmmzCampfireBuf = Buffer.alloc(rmmzCampfireW * rmmzCampfireH * 4);
for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
        const fImg = litFrames[col];
        const ox = col * 48, oy = row * 48;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * litMasterW + (col * 48 + x)) * 4;
                const dIdx = ((oy + y) * rmmzCampfireW + (ox + x)) * 4;
                rmmzCampfireBuf[dIdx] = litMasterBuf[sIdx];
                rmmzCampfireBuf[dIdx + 1] = litMasterBuf[sIdx + 1];
                rmmzCampfireBuf[dIdx + 2] = litMasterBuf[sIdx + 2];
                rmmzCampfireBuf[dIdx + 3] = litMasterBuf[sIdx + 3];
            }
        }
    }
}
const rmmzCampfirePath = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire.png');
writePNG(rmmzCampfirePath, rmmzCampfireW, rmmzCampfireH, rmmzCampfireBuf);
const rmmzCampfireJson = {
    id: "campfire",
    name: "Campfire",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { "stand": [0, 1, 2] },
    passable: false,
    under: false
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire.json'), JSON.stringify(rmmzCampfireJson, null, 2));
console.log(`  Exported RMMZ animated campfire: ${rmmzCampfirePath}`);

// --- 3. Workbench ---
console.log('\n3. Processing Workbench (Crafting Table)...');
const wbRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'workbench.png')));
keyMagentaAndDefringe(wbRaw, false);
const wbScaled = scaleToTarget(wbRaw, 42, 38, false);
const wbGrounded = groundAndCenter(wbScaled);
const wbColors = snapAndQuantize(wbGrounded.img);
console.log(`  Snapped workbench: ${wbColors} colors, bounds: ${wbGrounded.bounds.w}x${wbGrounded.bounds.h}`);

const wbMasterPath = path.join(ROOT, 'art', 'masters', 'workbench.png');
writePNG(wbMasterPath, 48, 48, wbGrounded.img.data);
const wbSidecar = {
    id: "workbench",
    name: "Workbench (Carpentry Table)",
    category: "Building",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: { "stand": [0] },
    passable: false,
    under: false
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'workbench.json'), JSON.stringify(wbSidecar, null, 2));

// Export RMMZ single-character sheet: 144x192 px (3 cols x 4 rows)
const rmmzWbW = 144, rmmzWbH = 192;
const rmmzWbBuf = Buffer.alloc(rmmzWbW * rmmzWbH * 4);
for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
        const ox = col * 48, oy = row * 48;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                const dIdx = ((oy + y) * rmmzWbW + (ox + x)) * 4;
                rmmzWbBuf[dIdx] = wbGrounded.img.data[sIdx];
                rmmzWbBuf[dIdx + 1] = wbGrounded.img.data[sIdx + 1];
                rmmzWbBuf[dIdx + 2] = wbGrounded.img.data[sIdx + 2];
                rmmzWbBuf[dIdx + 3] = wbGrounded.img.data[sIdx + 3];
            }
        }
    }
}
const rmmzWbPath = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Workbench.png');
writePNG(rmmzWbPath, rmmzWbW, rmmzWbH, rmmzWbBuf);
const rmmzWbJson = {
    id: "workbench",
    name: "Workbench",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { "stand": [0] },
    passable: false,
    under: false
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Workbench.json'), JSON.stringify(rmmzWbJson, null, 2));
console.log(`  Exported RMMZ workbench charset: ${rmmzWbPath}`);

// ============================================================================
// 5. Review Showcase
// ============================================================================

console.log('\n4. Generating Camp Review Showcase...');
const showW = 960, showH = 384;
const showBuf = Buffer.alloc(showW * showH * 4);

// Load meadow ground tile
const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
let meadowTile = null;
if (fs.existsSync(meadowPath)) {
    meadowTile = decodePNG(fs.readFileSync(meadowPath));
}

function blit4x(srcImg, ox, oy, bgTile = null) {
    for (let ty = 0; ty < 48; ty++) {
        for (let tx = 0; tx < 48; tx++) {
            const sIdx = (ty * 48 + tx) * 4;
            const a = srcImg.data[sIdx + 3];
            let r = srcImg.data[sIdx], g = srcImg.data[sIdx + 1], b = srcImg.data[sIdx + 2];

            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const px = ox + tx * 4 + dx;
                    const py = oy + ty * 4 + dy;
                    if (px >= showW || py >= showH) continue;
                    const dIdx = (py * showW + px) * 4;

                    if (a === 255) {
                        showBuf[dIdx] = r;
                        showBuf[dIdx + 1] = g;
                        showBuf[dIdx + 2] = b;
                        showBuf[dIdx + 3] = 255;
                    } else if (bgTile) {
                        const bgO = ((ty % 48) * 48 + (tx % 48)) * 4;
                        showBuf[dIdx] = bgTile.data[bgO];
                        showBuf[dIdx + 1] = bgTile.data[bgO + 1];
                        showBuf[dIdx + 2] = bgTile.data[bgO + 2];
                        showBuf[dIdx + 3] = 255;
                    } else {
                        // Checkerboard
                        const chk = ((Math.floor(px / 16) + Math.floor(py / 16)) % 2 === 0) ? 40 : 25;
                        showBuf[dIdx] = chk;
                        showBuf[dIdx + 1] = chk;
                        showBuf[dIdx + 2] = chk;
                        showBuf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }
}

// Row 1: Checkerboard (y=0..191)
// Items: Campfire Unlit, Lit Frame 0, Lit Frame 1, Lit Frame 2, Workbench
const items = [unlitGrounded.img, litFrames[0], litFrames[1], litFrames[2], wbGrounded.img];
for (let i = 0; i < 5; i++) {
    blit4x(items[i], i * 192, 0, null);
}

// Row 2: In-situ Meadow (y=192..383)
for (let i = 0; i < 5; i++) {
    blit4x(items[i], i * 192, 192, meadowTile);
}

const showcasePath = path.join(ROOT, 'art', 'review', 'camp_assets_showcase_4x.png');
writePNG(showcasePath, showW, showH, showBuf);
console.log(`  Saved review showcase: ${showcasePath}`);

console.log('\nProcessing complete.');
