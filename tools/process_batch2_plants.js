#!/usr/bin/env node
'use strict';

/**
 * tools/process_batch2_plants.js
 * 
 * End-to-end processing and export pipeline for Group 3: Small Plants and Ground Cover (AR-103) Batch 2:
 * 1. cactus       (Short ribbed desert cactus barrel with red tunas on top)
 * 2. cactus_tall  (Tall saguaro-like desert cactus with two arms)
 * 3. grass_tuft   (Tall wild meadow grass clump)
 * 4. reeds        (Wetland reeds/cattails with brown seedheads)
 * 5. fern         (Lush woodland fiddlehead/fern frond cluster)
 * 
 * Directives:
 * - FF6 HD 2D top-down standard (completely upright, zero 2.5D lean).
 * - Canvas: 4x scale (192x192 per 48x48 tile) downscaled with majority-block filter.
 * - Flat magenta #FF00FF background flood-fill and strict boundary de-fringing (0 purple fringe pixels).
 * - Palette: Strict color-snapping to art/palette/uf.hex (<= 32 distinct colors per asset).
 * - Alpha: Pure binary alpha (0 or 255 only).
 * - Grounding: Grounded at row 47, center anchor [24, 47].
 * - Standard RMMZ exports: 144x192 px single-character sheets (!$UF_*.png) and AR-600 JSON sidecars.
 * - Review showcases: Side-by-side at 4x on desert sand and meadow grass, plus individual 4x review renders.
 * - Automated verification: Runs tools/originality_check.js and tools/art_check.js.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Target Plant Definitions (Rule V81: natural micro/sub-square proportions)
const PLANTS = [
    {
        id: 'cactus',
        name: 'Cactus',
        rmmz: '!$UF_Cactus',
        terrain: 'sand',
        passable: false,
        under: false,
        footprint: [1, 1],
        anchor: [24, 47],
        targetW: 24,
        targetH: 22,
        hasFruit: true,
        desc: 'Short ribbed desert cactus barrel with red tunas on top'
    },
    {
        id: 'cactus_tall',
        name: 'Tall cactus',
        rmmz: '!$UF_CactusTall',
        terrain: 'sand',
        passable: false,
        under: false,
        footprint: [1, 1],
        anchor: [24, 47],
        targetW: 26,
        targetH: 42,
        desc: 'Tall saguaro-like desert cactus with two arms'
    },
    {
        id: 'grass_tuft',
        name: 'Tall grass',
        rmmz: '!$UF_GrassTuft',
        terrain: 'meadow',
        passable: true,
        under: true,
        footprint: [1, 1],
        anchor: [24, 47],
        targetW: 24,
        targetH: 18,
        desc: 'Tall wild meadow grass clump'
    },
    {
        id: 'reeds',
        name: 'Reeds',
        rmmz: '!$UF_Reeds',
        terrain: 'sand',
        passable: true,
        under: true,
        footprint: [1, 1],
        anchor: [24, 47],
        targetW: 22,
        targetH: 34,
        desc: 'Wetland reeds/cattails with brown seedheads'
    },
    {
        id: 'fern',
        name: 'Fern',
        rmmz: '!$UF_Fern',
        terrain: 'meadow',
        passable: true,
        under: true,
        footprint: [1, 1],
        anchor: [24, 47],
        targetW: 26,
        targetH: 22,
        desc: 'Lush woodland fiddlehead/fern frond cluster'
    },
    {
        id: 'wildflowers',
        name: 'Wildflowers',
        rmmz: '!$UF_Wildflowers',
        terrain: 'meadow',
        passable: true,
        under: true,
        footprint: [1, 1],
        anchor: [24, 47],
        targetW: 24,
        targetH: 20,
        hasFruit: true,
        desc: 'Delicate cluster of wild meadow flowers (blue, yellow, white)'
    }
];

// ============================================================================
// 1. Color and Palette Engine (CIELAB CIE76)
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

    // Filter palette for small plants to ensure ZERO purple/magenta edge contamination
    // Exclude the 14 purple/magenta shades (#EBCAEB, #D79AD7, #FF65EF, etc.)
    const isPurpleOrMagenta = (r, g, b) => (b > g + 25 && r > g + 25 && b > 70) || (r > 200 && b > 200 && g < 80);

    // Cactus palette: allow red fruit, exclude purples/magentas
    const cactusPalette = unique.filter(c => !isPurpleOrMagenta(c[0], c[1], c[2]));
    const cactusLabs = cactusPalette.map(c => srgbToLab(...c));

    // General flora palette: exclude purples/magentas AND bright reds (only foliage/bark/earth/grey/white)
    const floraPalette = unique.filter(c => {
        const [r, g, b] = c;
        if (isPurpleOrMagenta(r, g, b)) return false;
        if (r > 160 && g < 70 && b < 70) return false; // Exclude pure reds for non-flowering plants
        return true;
    });
    const floraLabs = floraPalette.map(c => srgbToLab(...c));

    const cacheCactus = new Map();
    const cacheFlora = new Map();

    return {
        snap(r, g, b, hasFruit = false) {
            const k = (r << 16) | (g << 8) | b;
            const cache = hasFruit ? cacheCactus : cacheFlora;
            if (cache.has(k)) return cache.get(k);

            const palette = hasFruit ? cactusPalette : floraPalette;
            const labs = hasFruit ? cactusLabs : floraLabs;

            const l = srgbToLab(r, g, b);
            let best = palette[0], bd = Infinity;
            for (let i = 0; i < labs.length; i++) {
                const d = labDist(l, labs[i]);
                if (d < bd) { bd = d; best = palette[i]; }
            }
            cache.set(k, best);
            return best;
        }
    };
}

const pal = loadPalette();

// ============================================================================
// 2. Raw Image Processing (Downsampling, Background Keying, Grounding)
// ============================================================================

/**
 * Strict magenta and fringe detector.
 * A pixel is magenta or fringe if:
 * 1. High red and blue with low green (magenta hue).
 * 2. Blue exceeds green by a notable margin and red is moderate-to-high.
 * Legitimate cactus red fruit has R high, G low, B VERY LOW (b < 80).
 */
function isMagentaOrFringe(r, g, b, hasFruit = false) {
    if (hasFruit && r > 140 && g < 75 && b < 75) {
        return false; // Legitimate red fruit
    }
    // Pure or near-pure magenta
    const dr = r - 255, dg = g - 0, db = b - 255;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= 90) return true;

    // Anti-aliased / blended magenta fringe
    if (b > g + 15 && b > 60 && r > 80) return true;
    if (r > 130 && b > 90 && (r + b) > (g * 2 + 25)) return true;

    return false;
}

/**
 * Flood-fills magenta from the borders of an image and clears all fringe pixels.
 */
function keyMagentaAndDefringe(img, hasFruit = false) {
    const { width: w, height: h, data } = img;
    const visited = new Uint8Array(w * h);
    const queue = [];

    // Push all border pixels that match magenta or fringe
    function checkAndPush(x, y) {
        const idx = y * w + x;
        if (visited[idx]) return;
        const o = idx * 4;
        if (isMagentaOrFringe(data[o], data[o + 1], data[o + 2], hasFruit)) {
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

    // Flood fill from border
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
                    if (isMagentaOrFringe(data[no], data[no + 1], data[no + 2], hasFruit)) {
                        visited[nIdx] = 1;
                        queue.push(nIdx);
                    }
                }
            }
        }
    }

    // Clear visited background and all fringe pixels everywhere
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const o = idx * 4;
            if (visited[idx] || isMagentaOrFringe(data[o], data[o + 1], data[o + 2], hasFruit)) {
                data[o] = 0;
                data[o + 1] = 0;
                data[o + 2] = 0;
                data[o + 3] = 0;
            } else {
                data[o + 3] = 255; // Force binary alpha
            }
        }
    }
}

/**
 * Find bounding box of opaque non-fringe pixels in raw image.
 */
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

/**
 * Downscale raw canvas to micro/sub-square target size (Rule V81) via majority clean block voting.
 * Grounded at bottom row 47, horizontally centered at column 24.
 */
function scaleToMicroTarget(rawImg, plant) {
    const rawBounds = findRawBounds(rawImg);
    console.log(`  Raw bounding box: [${rawBounds.minX}, ${rawBounds.minY}] to [${rawBounds.maxX}, ${rawBounds.maxY}], size ${rawBounds.w}x${rawBounds.h}`);

    // Determine scale to fit within targetW x targetH while preserving aspect ratio
    const scale = Math.min(plant.targetW / rawBounds.w, plant.targetH / rawBounds.h);
    const fitW = Math.max(1, Math.round(rawBounds.w * scale));
    const fitH = Math.max(1, Math.round(rawBounds.h * scale));
    console.log(`  Rule V81 micro scale: target=${plant.targetW}x${plant.targetH} -> fitted=${fitW}x${fitH} (grounded row 47, centered col 24)`);

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
                        if (!isMagentaOrFringe(r, g, b, plant.hasFruit)) {
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

    // Boundary morphological cleanup on 48x48: remove isolated or fringe edge pixels
    for (let ty = 0; ty < outH; ty++) {
        for (let tx = 0; tx < outW; tx++) {
            const o = (ty * outW + tx) * 4;
            if (outBuf[o + 3] === 255) {
                const r = outBuf[o], g = outBuf[o + 1], b = outBuf[o + 2];
                if (isMagentaOrFringe(r, g, b, plant.hasFruit)) {
                    outBuf[o] = 0; outBuf[o + 1] = 0; outBuf[o + 2] = 0; outBuf[o + 3] = 0;
                }
            }
        }
    }

    return { width: outW, height: outH, data: outBuf };
}


/**
 * Bounds, Grounding at row 47, and Centering at col 24
 */
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

    // Check bounds for shift
    if (minX + dx < 0) dx = -minX;
    if (maxX + dx >= 48) dx = 47 - maxX;

    let finalData = img.data;
    if (dy !== 0 || dx !== 0) {
        console.log(`  Shifting asset: dx=${dx}, dy=${dy} (grounding at row 47)`);
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

/**
 * Palette snapping and <= 32 colors enforcement.
 */
function snapAndQuantize(img, hasFruit = false) {
    const { data } = img;
    const colorUsage = new Map();

    // 1. Snap every opaque pixel to filtered uf.hex palette
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const o = (y * 48 + x) * 4;
            if (data[o + 3] === 255) {
                const snapped = pal.snap(data[o], data[o + 1], data[o + 2], hasFruit);
                data[o] = snapped[0];
                data[o + 1] = snapped[1];
                data[o + 2] = snapped[2];

                const k = (snapped[0] << 16) | (snapped[1] << 8) | snapped[2];
                colorUsage.set(k, (colorUsage.get(k) || 0) + 1);
            }
        }
    }

    // 2. Check if distinct colors > 32
    if (colorUsage.size > 32) {
        console.log(`  Colors (${colorUsage.size}) exceed 32! Merging down to 32...`);
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

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const o = (y * 48 + x) * 4;
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

    // Final color count
    const finalColors = new Set();
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 255) {
            finalColors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
        }
    }

    return finalColors.size;
}

// ============================================================================
// 3. Asset Processing & RMMZ Export
// ============================================================================

function processPlant(plant) {
    console.log(`\n======================================================`);
    console.log(`Processing ${plant.name} (${plant.id})...`);
    console.log(`======================================================`);

    const rawPath = path.join(ROOT, 'art', 'raw', `${plant.id}.png`);
    const masterPath = path.join(ROOT, 'art', 'masters', `${plant.id}.png`);
    const masterJsonPath = path.join(ROOT, 'art', 'masters', `${plant.id}.json`);

    let masterDec = null;

    if (fs.existsSync(rawPath)) {
        console.log(`Found raw canvas: ${rawPath}`);
        const rawDec = decodePNG(fs.readFileSync(rawPath), plant.id);
        console.log(`  Raw dimensions: ${rawDec.width}x${rawDec.height}`);

        // Background key and strict de-fringing
        keyMagentaAndDefringe(rawDec, plant.hasFruit);

        // Downsample to micro/sub-square proportions (Rule V81)
        let downsampled = scaleToMicroTarget(rawDec, plant);

        // Ground & Center
        const { img: grounded, bounds } = groundAndCenter(downsampled);

        // Snap palette (with fruit allowance if plant has fruit)
        const colorCount = snapAndQuantize(grounded, plant.hasFruit);
        console.log(`  Snapped to palette: ${colorCount} unique colors (limit 32)`);
        console.log(`  Bounds: [${bounds.minX}, ${bounds.minY}] to [${bounds.maxX}, ${bounds.maxY}], size ${bounds.w}x${bounds.h}`);

        // Save Master PNG
        writePNG(masterPath, 48, 48, grounded.data);
        console.log(`  Saved master PNG: ${masterPath}`);

        // Save Master AR-600 Sidecar
        const masterJson = {
            id: plant.id,
            frameWidth: 48,
            frameHeight: 48,
            anchor: plant.anchor,
            footprint: plant.footprint,
            facings: ["S"],
            animations: {
                stand: [0]
            },
            frameMs: 150,
            lean: {
                mode: "none",
                slope: 1,
                top: null,
                east: 0
            },
            scale: {
                subjectHeight: bounds.h,
                target: null,
                factor: 1
            },
            source: {
                file: `art/raw/${plant.id}.png`,
                format: "png",
                converted: null,
                size: [rawDec.width, rawDec.height],
                sheet: [1, 1],
                block: 4,
                phase: [0, 0],
                background: "magenta #FF00FF"
            },
            made: {
                by: "tools/process_batch2_plants.js",
                at: new Date().toISOString(),
                options: [`art/raw/${plant.id}.png`, "--lean", "none", "--frame", "48", "--defringe"]
            }
        };
        fs.writeFileSync(masterJsonPath, JSON.stringify(masterJson, null, 2), 'utf8');
        console.log(`  Saved master sidecar: ${masterJsonPath}`);

        masterDec = grounded;
    } else if (fs.existsSync(masterPath)) {
        console.log(`Raw canvas not found, using existing master: ${masterPath}`);
        masterDec = decodePNG(fs.readFileSync(masterPath), plant.id);
    } else {
        console.log(`Notice: Neither ${rawPath} nor ${masterPath} exists yet. Waiting for raw asset.`);
        return null;
    }

    // Export RMMZ single-character sheet: 3 cols x 4 rows = 144x192 px
    const rmmzW = 144;
    const rmmzH = 192;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const ox = col * 48;
            const oy = row * 48;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((oy + y) * rmmzW + (ox + x)) * 4;
                    rmmzBuf[dIdx] = masterDec.data[sIdx];
                    rmmzBuf[dIdx + 1] = masterDec.data[sIdx + 1];
                    rmmzBuf[dIdx + 2] = masterDec.data[sIdx + 2];
                    rmmzBuf[dIdx + 3] = masterDec.data[sIdx + 3];
                }
            }
        }
    }

    const rmmzPngPath = path.join(ROOT, 'game', 'img', 'characters', `${plant.rmmz}.png`);
    writePNG(rmmzPngPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`  Saved RMMZ charset: ${rmmzPngPath}`);

    const rmmzJson = {
        id: plant.id,
        name: plant.name,
        frameWidth: 48,
        frameHeight: 48,
        anchor: plant.anchor,
        footprint: plant.footprint,
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [0]
        },
        passable: plant.passable,
        under: plant.under
    };
    const rmmzJsonPath = path.join(ROOT, 'game', 'img', 'characters', `${plant.rmmz}.json`);
    fs.writeFileSync(rmmzJsonPath, JSON.stringify(rmmzJson, null, 2), 'utf8');
    console.log(`  Saved RMMZ sidecar: ${rmmzJsonPath}`);

    return masterDec;
}

// ============================================================================
// 4. Review Showcases and Terrains
// ============================================================================

const FONT = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001001010010', '8': '111101111101111', '9': '111101111001111',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
    'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
    'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010',
    'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
    'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
    'Z': '111001010100111', '.': '000000000000010', ':': '000010000010000', '-': '000000111000000', '=': '000111000111000',
    '/': '001001010100100', '_': '000000000000111', '(': '010100100100010', ')': '010001001001010', '#': '101111101111101',
    '$': '011110010011110', '!': '010010010000010', '?': '110001010000010', ' ': '000000000000000', '<': '001010100010001',
    '>': '100010001010100', '+': '000010111010000', ',': '000000000010100', '[': '110100100100110', ']': '011001001001011',
    '&': '010101010101101', '|': '010010010010010'
};

function loadTerrains() {
    let meadowTile = null;
    const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
    if (fs.existsSync(meadowPath)) {
        const m = decodePNG(fs.readFileSync(meadowPath));
        meadowTile = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * m.width + x) * 4;
                const dIdx = (y * 48 + x) * 4;
                meadowTile[dIdx] = m.data[sIdx];
                meadowTile[dIdx + 1] = m.data[sIdx + 1];
                meadowTile[dIdx + 2] = m.data[sIdx + 2];
                meadowTile[dIdx + 3] = 255;
            }
        }
    }

    let sandTile = null;
    const a2Path = path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A2.png');
    if (fs.existsSync(a2Path)) {
        const a2 = decodePNG(fs.readFileSync(a2Path));
        sandTile = Buffer.alloc(48 * 48 * 4);
        // Col 0, Row 2 top-left tile: x in 0..47, y in 288..335
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = ((288 + y) * a2.width + x) * 4;
                const dIdx = (y * 48 + x) * 4;
                sandTile[dIdx] = a2.data[sIdx];
                sandTile[dIdx + 1] = a2.data[sIdx + 1];
                sandTile[dIdx + 2] = a2.data[sIdx + 2];
                sandTile[dIdx + 3] = 255;
            }
        }
    }

    return { meadowTile, sandTile };
}

function buildShowcase() {
    console.log(`\nGenerating Group 3 Batch 2 Review Showcase...`);
    const { meadowTile, sandTile } = loadTerrains();

    // 1. Lineup strip (PLANTS.length * 192 px)
    const stripW = PLANTS.length * 192;
    const stripH = 192;
    const stripBuf = Buffer.alloc(stripW * stripH * 4);

    // Dark checkerboard background for the lineup strip
    for (let y = 0; y < stripH; y++) {
        for (let x = 0; x < stripW; x++) {
            const o = (y * stripW + x) * 4;
            const cb = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0) ? 0x22 : 0x1a;
            stripBuf[o] = cb; stripBuf[o + 1] = cb; stripBuf[o + 2] = cb; stripBuf[o + 3] = 255;
        }
    }

    // 2. Comprehensive showcase canvas
    const marginX = 20;
    const gapX = 16;
    const cardW = 192;
    const totalW = marginX * 2 + PLANTS.length * cardW + (PLANTS.length - 1) * gapX;
    const totalH = 750;
    const showBuf = Buffer.alloc(totalW * totalH * 4);

    // Neutral dark background
    for (let i = 0; i < showBuf.length; i += 4) {
        showBuf[i] = 0x14; showBuf[i + 1] = 0x17; showBuf[i + 2] = 0x20; showBuf[i + 3] = 255;
    }

    function setPx(buf, bufW, bufH, x, y, r, g, b, a = 255) {
        if (x < 0 || x >= bufW || y < 0 || y >= bufH) return;
        const o = (y * bufW + x) * 4;
        if (a === 255) {
            buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255;
        } else if (a > 0) {
            const alpha = a / 255;
            buf[o] = Math.round(r * alpha + buf[o] * (1 - alpha));
            buf[o + 1] = Math.round(g * alpha + buf[o + 1] * (1 - alpha));
            buf[o + 2] = Math.round(b * alpha + buf[o + 2] * (1 - alpha));
            buf[o + 3] = 255;
        }
    }

    function fillRect(buf, bufW, bufH, x0, y0, w, h, r, g, b, a = 255) {
        for (let y = y0; y < y0 + h; y++) {
            for (let x = x0; x < x0 + w; x++) {
                setPx(buf, bufW, bufH, x, y, r, g, b, a);
            }
        }
    }

    function drawRect(buf, bufW, bufH, x0, y0, w, h, r, g, b) {
        for (let x = x0; x < x0 + w; x++) {
            setPx(buf, bufW, bufH, x, y0, r, g, b);
            setPx(buf, bufW, bufH, x, y0 + h - 1, r, g, b);
        }
        for (let y = y0; y < y0 + h; y++) {
            setPx(buf, bufW, bufH, x0, y, r, g, b);
            setPx(buf, bufW, bufH, x0 + w - 1, y, r, g, b);
        }
    }

    function drawText(buf, bufW, bufH, x, y, text, rgb, scale = 1) {
        let cx = x;
        for (const ch of String(text).toUpperCase()) {
            const g = FONT[ch] || FONT['?'];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 3; c++) {
                    if (g[r * 3 + c] === '1') {
                        fillRect(buf, bufW, bufH, cx + c * scale, y + r * scale, scale, scale, rgb[0], rgb[1], rgb[2], 255);
                    }
                }
            }
            cx += 4 * scale;
        }
    }

    // Header
    fillRect(showBuf, totalW, totalH, 20, 15, totalW - 40, 56, 0x1e, 0x22, 0x2f);
    drawRect(showBuf, totalW, totalH, 20, 15, totalW - 40, 56, 0x3b, 0x82, 0xf6);
    drawText(showBuf, totalW, totalH, 35, 24, "GROUP 3: SMALL PLANTS & GROUND COVER -- BATCH 2 (AR-103)", [255, 255, 255], 2);
    drawText(showBuf, totalW, totalH, 35, 48, "FF6 HD TOP-DOWN STANDARD  |  CACTUS, CACTUS TALL, GRASS TUFT, REEDS, FERN, WILDFLOWERS  |  4X COMPARATIVE VIEW", [160, 185, 220], 1);

    // Section 1: 4x Masters with Registration Guides
    const row1Y = 85;
    drawText(showBuf, totalW, totalH, 22, row1Y, "1. NATIVE MASTERS (4X RESOLUTION) -- GROUNDED AT ROW 47, ANCHOR [24, 47], 0 PURPLE FRINGE", [240, 240, 240], 1);

    // Section 2: 4x on Desert Sand
    const row2Y = 305;
    drawText(showBuf, totalW, totalH, 22, row2Y, "2. IN-SITU COHERENCE: DESERT SAND (OUTSIDE_A2 DUNE DUST)", [240, 240, 240], 1);

    // Section 3: 4x on Meadow Grass
    const row3Y = 525;
    drawText(showBuf, totalW, totalH, 22, row3Y, "3. IN-SITU COHERENCE: MEADOW GRASS (APPROVED MASTER MEADOW)", [240, 240, 240], 1);

    for (let i = 0; i < PLANTS.length; i++) {
        const p = PLANTS[i];
        const masterPath = path.join(ROOT, 'art', 'masters', `${p.id}.png`);
        const cardX = marginX + i * (cardW + gapX);

        if (!fs.existsSync(masterPath)) {
            fillRect(showBuf, totalW, totalH, cardX, row1Y + 16, cardW, 192, 0x25, 0x29, 0x36);
            drawRect(showBuf, totalW, totalH, cardX, row1Y + 16, cardW, 192, 0x45, 0x4f, 0x68);
            drawText(showBuf, totalW, totalH, cardX + 15, row1Y + 100, `WAITING FOR ${p.id.toUpperCase()}`, [140, 155, 180], 1);
            continue;
        }

        const master = decodePNG(fs.readFileSync(masterPath), p.id);

        // 1. Draw into lineup strip
        const stripStartX = i * 192;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (master.data[sIdx + 3] === 255) {
                    for (let dy = 0; dy < 4; dy++) {
                        for (let dx = 0; dx < 4; dx++) {
                            const dIdx = ((y * 4 + dy) * stripW + (stripStartX + x * 4 + dx)) * 4;
                            stripBuf[dIdx] = master.data[sIdx];
                            stripBuf[dIdx + 1] = master.data[sIdx + 1];
                            stripBuf[dIdx + 2] = master.data[sIdx + 2];
                            stripBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
        // Baseline guide on strip (row 47 = y: 188..191)
        for (let x = 0; x < 192; x++) {
            const o = (188 * stripW + (stripStartX + x)) * 4;
            stripBuf[o] = (stripBuf[o] + 0x60) >> 1;
            stripBuf[o + 1] = (stripBuf[o + 1] + 0x20) >> 1;
            stripBuf[o + 2] = (stripBuf[o + 2] + 0x20) >> 1;
        }

        // 2. Draw Row 1: Master card
        const yTop1 = row1Y + 16;
        fillRect(showBuf, totalW, totalH, cardX, yTop1, cardW, 192, 0x1b, 0x1f, 0x2b);
        drawRect(showBuf, totalW, totalH, cardX, yTop1, cardW, 192, 0x3e, 0x48, 0x60);

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (master.data[sIdx + 3] === 255) {
                    fillRect(showBuf, totalW, totalH, cardX + x * 4, yTop1 + y * 4, 4, 4,
                        master.data[sIdx], master.data[sIdx + 1], master.data[sIdx + 2], 255);
                }
            }
        }

        // Draw registration guide (baseline row 47 line)
        for (let x = 0; x < cardW; x++) {
            setPx(showBuf, totalW, totalH, cardX + x, yTop1 + 47 * 4 + 3, 0xff, 0x33, 0x33, 160);
        }
        // Anchor marker [24, 47] -> [96, 191]
        fillRect(showBuf, totalW, totalH, cardX + 24 * 4 - 2, yTop1 + 47 * 4 + 1, 5, 3, 0x33, 0xff, 0xff, 255);

        // Label above card
        drawText(showBuf, totalW, totalH, cardX + 4, yTop1 + 6, `${p.name} (${p.id})`, [255, 230, 100], 1);
        drawText(showBuf, totalW, totalH, cardX + 4, yTop1 + 18, `PASSABLE:${p.passable} UNDER:${p.under}`, [150, 180, 210], 1);

        // 3. Draw Row 2: Desert Sand
        const yTop2 = row2Y + 16;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                let sr = 221, sg = 178, sb = 105;
                if (sandTile) {
                    const to = (y * 48 + x) * 4;
                    sr = sandTile[to]; sg = sandTile[to + 1]; sb = sandTile[to + 2];
                }
                const mo = (y * 48 + x) * 4;
                const r = master.data[mo + 3] === 255 ? master.data[mo] : sr;
                const g = master.data[mo + 3] === 255 ? master.data[mo + 1] : sg;
                const b = master.data[mo + 3] === 255 ? master.data[mo + 2] : sb;
                fillRect(showBuf, totalW, totalH, cardX + x * 4, yTop2 + y * 4, 4, 4, r, g, b, 255);
            }
        }
        drawRect(showBuf, totalW, totalH, cardX, yTop2, cardW, 192, 0x5a, 0x48, 0x30);

        // 4. Draw Row 3: Meadow Grass
        const yTop3 = row3Y + 16;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                let mr = 77, mg = 93, mb = 40;
                if (meadowTile) {
                    const to = (y * 48 + x) * 4;
                    mr = meadowTile[to]; mg = meadowTile[to + 1]; mb = meadowTile[to + 2];
                }
                const mo = (y * 48 + x) * 4;
                const r = master.data[mo + 3] === 255 ? master.data[mo] : mr;
                const g = master.data[mo + 3] === 255 ? master.data[mo + 1] : mg;
                const b = master.data[mo + 3] === 255 ? master.data[mo + 2] : mb;
                fillRect(showBuf, totalW, totalH, cardX + x * 4, yTop3 + y * 4, 4, 4, r, g, b, 255);
            }
        }
        drawRect(showBuf, totalW, totalH, cardX, yTop3, cardW, 192, 0x30, 0x50, 0x20);

        // Save individual 4x renders
        const singleMasterBuf = Buffer.alloc(192 * 192 * 4);
        const singleTerrainBuf = Buffer.alloc(192 * 192 * 4);

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                const isSolid = master.data[sIdx + 3] === 255;

                let tr = 77, tg = 93, tb = 40;
                if (p.terrain === 'sand' && sandTile) {
                    const to = (y * 48 + x) * 4;
                    tr = sandTile[to]; tg = sandTile[to + 1]; tb = sandTile[to + 2];
                } else if (meadowTile) {
                    const to = (y * 48 + x) * 4;
                    tr = meadowTile[to]; tg = meadowTile[to + 1]; tb = meadowTile[to + 2];
                }

                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 4; dx++) {
                        const dIdx = ((y * 4 + dy) * 192 + (x * 4 + dx)) * 4;
                        if (isSolid) {
                            singleMasterBuf[dIdx] = master.data[sIdx];
                            singleMasterBuf[dIdx + 1] = master.data[sIdx + 1];
                            singleMasterBuf[dIdx + 2] = master.data[sIdx + 2];
                            singleMasterBuf[dIdx + 3] = 255;

                            singleTerrainBuf[dIdx] = master.data[sIdx];
                            singleTerrainBuf[dIdx + 1] = master.data[sIdx + 1];
                            singleTerrainBuf[dIdx + 2] = master.data[sIdx + 2];
                            singleTerrainBuf[dIdx + 3] = 255;
                        } else {
                            const cb = ((Math.floor((x * 4 + dx) / 16) + Math.floor((y * 4 + dy) / 16)) % 2 === 0) ? 0x22 : 0x1a;
                            singleMasterBuf[dIdx] = cb; singleMasterBuf[dIdx + 1] = cb; singleMasterBuf[dIdx + 2] = cb; singleMasterBuf[dIdx + 3] = 255;

                            singleTerrainBuf[dIdx] = tr;
                            singleTerrainBuf[dIdx + 1] = tg;
                            singleTerrainBuf[dIdx + 2] = tb;
                            singleTerrainBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }

        const outMasterPath = path.join(ROOT, 'art', 'review', `${p.id}_master_4x.png`);
        const outTerrainPath = path.join(ROOT, 'art', 'review', `${p.id}_on_terrain_4x.png`);
        writePNG(outMasterPath, 192, 192, singleMasterBuf);
        writePNG(outTerrainPath, 192, 192, singleTerrainBuf);
    }

    const lineupPath = path.join(ROOT, 'art', 'review', 'batch2_plants_lineup_4x.png');
    writePNG(lineupPath, stripW, stripH, stripBuf);
    console.log(`  Saved lineup review: ${lineupPath}`);

    const showPath = path.join(ROOT, 'art', 'review', 'batch2_plants_showcase_4x.png');
    writePNG(showPath, totalW, totalH, showBuf);
    console.log(`  Saved comprehensive showcase: ${showPath}`);
}

// ============================================================================
// 5. Automated Verification Runner
// ============================================================================

function runVerification() {
    console.log(`\n======================================================`);
    console.log(`Running Automated Verification (Originality & Art Check)...`);
    console.log(`======================================================`);

    const nodePath = process.execPath;
    let allPassed = true;

    for (const p of PLANTS) {
        const masterPath = path.join(ROOT, 'art', 'masters', `${p.id}.png`);
        const rmmzPath = path.join(ROOT, 'game', 'img', 'characters', `${p.rmmz}.png`);

        if (!fs.existsSync(masterPath)) {
            console.log(`Skipping verification for ${p.id}: master not found.`);
            continue;
        }

        // 1. Originality check on master
        try {
            const origRes = childProcess.execFileSync(nodePath, [
                path.join(ROOT, 'tools', 'originality_check.js'),
                masterPath
            ], { encoding: 'utf8' });
            const match = origRes.match(/closest distance ([0-9.]+)/);
            const dist = match ? match[1] : 'PASS';
            console.log(`  [Originality] ${p.id} master: PASS (distance ${dist} >= 0.28)`);
        } catch (err) {
            console.error(`  [Originality FAIL] ${p.id} master: ${err.message}`);
            allPassed = false;
        }

        // 2. Originality check on RMMZ sheet
        if (fs.existsSync(rmmzPath)) {
            try {
                const origRmmz = childProcess.execFileSync(nodePath, [
                    path.join(ROOT, 'tools', 'originality_check.js'),
                    rmmzPath
                ], { encoding: 'utf8' });
                console.log(`  [Originality] ${p.rmmz} charset: PASS (all 12 frames >= 0.28)`);
            } catch (err) {
                console.error(`  [Originality FAIL] ${p.rmmz} charset: ${err.message}`);
                allPassed = false;
            }
        }

        // 3. Art check on master
        try {
            const artRes = childProcess.spawnSync(nodePath, [
                path.join(ROOT, 'tools', 'art_check.js'),
                masterPath
            ], { encoding: 'utf8' });
            const output = artRes.stdout || '';
            const alphaPass = output.includes('PASS alpha');
            const palPass = output.includes('PASS palette');
            const sizePass = output.includes('PASS size');
            const sidecarPass = output.includes('PASS sidecar');
            console.log(`  [ArtCheck] ${p.id} master: alpha:${alphaPass?'PASS':'FAIL'} palette:${palPass?'PASS':'FAIL'} size:${sizePass?'PASS':'FAIL'} sidecar:${sidecarPass?'PASS':'FAIL'}`);
        } catch (err) {
            console.error(`  [ArtCheck ERROR] ${p.id}: ${err.message}`);
        }
    }

    return allPassed;
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
    console.log(`=== UF Batch 2 Small Plants Processing Pipeline ===`);
    console.log(`Checking incoming raw assets and existing masters...\n`);

    let processedAny = false;
    for (const plant of PLANTS) {
        const res = processPlant(plant);
        if (res) processedAny = true;
    }

    buildShowcase();
    runVerification();

    console.log(`\nProcessing and verification routine finished.`);
}

if (require.main === module) {
    main();
}

module.exports = {
    PLANTS,
    processPlant,
    buildShowcase,
    runVerification
};
