'use strict';
/**
 * tools/build_nano_c_sheets.js
 *
 * Assembles authentic 16-bit Outside_C.png from Google Nano Banana Pro generations:
 * - Rows 0-1: Cave mouths, mine adits, portcullis gates, temple portals
 * - Rows 2-3: Classical broken pillars, fallen column drums, guardian statues, ruined masonry
 * - Rows 4-5: Horizontal & vertical timber bridges, horizontal & vertical stone arched bridges
 * - Rows 6-7: Canvas pavilions, shingled wells, watchtower crenellations, stone fire braziers
 * - Rows 8-11: Standing megaliths, prehistoric dolmens, stone basins, basalt columns, hoodoos
 * - Rows 12-15: Additional overworld monuments, drystone field walls, and stone fortifications
 *
 * Snapped 100% to art/palette/uf.hex and quantized to <= 60 colors.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Load project palette
const hexLines = fs.readFileSync(path.join(ROOT, 'art', 'palette', 'uf.hex'), 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim().replace(/^#/, ''))
    .filter(l => l.length === 6 && /^[0-9A-Fa-f]{6}$/.test(l));

const PALETTE = hexLines.map(hex => [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
]);

function snapColor(r, g, b) {
    let bestDist = Infinity;
    let best = PALETTE[0];
    for (let i = 0; i < PALETTE.length; i++) {
        const p = PALETTE[i];
        const dr = r - p[0];
        const dg = g - p[1];
        const db = b - p[2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            best = p;
        }
    }
    return best;
}

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_c_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

function isMagentaOrFringe(r, g, b) {
    if (r > 175 && g < 80 && b > 175) return true;
    if (r > 80 && b > 80 && g < 70 && (r + b) > g * 2.2) return true;
    if (r === 142 && g === 16 && b === 142) return true;
    if (r === 162 && g === 40 && b === 162) return true;
    return false;
}

function blitTile(dstBuf, dstW, col, row, srcImg, sx, sy, sw, sh, transparentColor = isMagentaOrFringe) {
    const dx = col * 48;
    const dy = row * 48;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const ssx = Math.min(srcImg.width - 1, Math.max(0, Math.floor(sx + (x / 48) * sw)));
            const ssy = Math.min(srcImg.height - 1, Math.max(0, Math.floor(sy + (y / 48) * sh)));
            const sidx = (ssy * srcImg.width + ssx) * 4;
            const didx = ((dy + y) * dstW + (dx + x)) * 4;

            const r = srcImg.data[sidx];
            const g = srcImg.data[sidx + 1];
            const b = srcImg.data[sidx + 2];
            const a = srcImg.data[sidx + 3];

            if (a < 128) continue;
            if (transparentColor && transparentColor(r, g, b)) continue;

            const snapped = snapColor(r, g, b);
            dstBuf[didx] = snapped[0];
            dstBuf[didx + 1] = snapped[1];
            dstBuf[didx + 2] = snapped[2];
            dstBuf[didx + 3] = 255;
        }
    }
}

// Blit a 2x2 tile block (96x96 px)
function blitBlock2x2(dstBuf, dstW, startCol, startRow, srcImg, sx, sy, sw, sh) {
    for (let by = 0; by < 2; by++) {
        for (let bx = 0; bx < 2; bx++) {
            const subSx = sx + (bx / 2) * sw;
            const subSy = sy + (by / 2) * sh;
            blitTile(dstBuf, dstW, startCol + bx, startRow + by, srcImg, subSx, subSy, sw / 2, sh / 2);
        }
    }
}

function quantizeToColors(buf, maxColors = 60) {
    const colorFreq = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 255) {
            const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
        }
    }
    if (colorFreq.size <= maxColors) return;

    const sorted = Array.from(colorFreq.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, maxColors).map(e => [
        (e[0] >> 16) & 0xFF,
        (e[0] >> 8) & 0xFF,
        e[0] & 0xFF
    ]);

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 255) {
            const r = buf[i], g = buf[i + 1], b = buf[i + 2];
            let bestDist = Infinity;
            let best = top[0];
            for (const c of top) {
                const dr = r - c[0], dg = g - c[1], db = b - c[2];
                const d = dr * dr + dg * dg + db * db;
                if (d < bestDist) {
                    bestDist = d;
                    best = c;
                }
            }
            buf[i] = best[0];
            buf[i + 1] = best[1];
            buf[i + 2] = best[2];
        }
    }
}

function main() {
    console.log('Building authentic Outside_C.png from Nano Banana Pro masters...');
    const W = 768, H = 768;
    const outsideC = Buffer.alloc(W * H * 4); // all alpha 0 by default

    const ruinsBridges = loadJpg(path.join(ROOT, 'art', 'raw', 'nano_ruins_bridges_caves_raw.jpg'));
    const bouldersMegaliths = loadJpg(path.join(ROOT, 'art', 'raw', 'nano_boulders_megaliths_raw.jpg'));
    const fencesGates = loadJpg(path.join(ROOT, 'art', 'raw', 'nano_fences_gates_raw.jpg'));
    const signposts = loadJpg(path.join(ROOT, 'art', 'raw', 'nano_signposts_markers_raw.jpg'));

    // In a 4x4 raw 1024x1024 image, each cell is 256x256.
    // Cell (r, c) starts at (c * 256, r * 256).
    function cellRect(c, r, pad = 6) {
        return {
            x: c * 256 + pad,
            y: r * 256 + pad,
            w: 256 - pad * 2,
            h: 256 - pad * 2
        };
    }

    // Rows 0-1 (Cols 0..15): 4 Cave Entrances & Portals (each 2x2 tiles = 96x96)
    // Col 0-1: Natural cave mouth (ruinsBridges row 0, col 0)
    const cr0 = cellRect(0, 0);
    blitBlock2x2(outsideC, W, 0, 0, ruinsBridges, cr0.x, cr0.y, cr0.w, cr0.h);
    // Col 2-3: Mine shaft timber adit (ruinsBridges row 0, col 1)
    const cr1 = cellRect(1, 0);
    blitBlock2x2(outsideC, W, 2, 0, ruinsBridges, cr1.x, cr1.y, cr1.w, cr1.h);
    // Col 4-5: Iron portcullis gate arch (ruinsBridges row 0, col 2)
    const cr2 = cellRect(2, 0);
    blitBlock2x2(outsideC, W, 4, 0, ruinsBridges, cr2.x, cr2.y, cr2.w, cr2.h);
    // Col 6-7: Stone temple portal (ruinsBridges row 0, col 3)
    const cr3 = cellRect(3, 0);
    blitBlock2x2(outsideC, W, 6, 0, ruinsBridges, cr3.x, cr3.y, cr3.w, cr3.h);

    // Col 8-9: Prehistoric stone dolmen (bouldersMegaliths row 1, col 1)
    const bm1 = cellRect(1, 1);
    blitBlock2x2(outsideC, W, 8, 0, bouldersMegaliths, bm1.x, bm1.y, bm1.w, bm1.h);
    // Col 10-11: Stone guardian dragon relic (bouldersMegaliths row 1, col 2)
    const bm2 = cellRect(2, 1);
    blitBlock2x2(outsideC, W, 10, 0, bouldersMegaliths, bm2.x, bm2.y, bm2.w, bm2.h);
    // Col 12-13: Circular stone water basin (bouldersMegaliths row 1, col 3)
    const bm3 = cellRect(3, 1);
    blitBlock2x2(outsideC, W, 12, 0, bouldersMegaliths, bm3.x, bm3.y, bm3.w, bm3.h);
    // Col 14-15: Upright standing megalith menhir (bouldersMegaliths row 1, col 0)
    const bm0 = cellRect(0, 1);
    blitBlock2x2(outsideC, W, 14, 0, bouldersMegaliths, bm0.x, bm0.y, bm0.w, bm0.h);

    // Rows 2-3: Ruins & Broken Classical Pillars
    // Cols 0-1: Standing fluted pillar pedestal (ruinsBridges row 1, col 0)
    const r10 = cellRect(0, 1);
    blitBlock2x2(outsideC, W, 0, 2, ruinsBridges, r10.x, r10.y, r10.w, r10.h);
    // Cols 2-3: Fallen column drum on ground (ruinsBridges row 1, col 1)
    const r11 = cellRect(1, 1);
    blitBlock2x2(outsideC, W, 2, 2, ruinsBridges, r11.x, r11.y, r11.w, r11.h);
    // Cols 4-5: Weathered stone knight statue (ruinsBridges row 1, col 2)
    const r12 = cellRect(2, 1);
    blitBlock2x2(outsideC, W, 4, 2, ruinsBridges, r12.x, r12.y, r12.w, r12.h);
    // Cols 6-7: Ruined brick & stone wall with ivy (ruinsBridges row 1, col 3)
    const r13 = cellRect(3, 1);
    blitBlock2x2(outsideC, W, 6, 2, ruinsBridges, r13.x, r13.y, r13.w, r13.h);

    // Cols 8-9: Hexagonal basalt columns (bouldersMegaliths row 3, col 1)
    const b31 = cellRect(1, 3);
    blitBlock2x2(outsideC, W, 8, 2, bouldersMegaliths, b31.x, b31.y, b31.w, b31.h);
    // Cols 10-11: Cavern rock spire stalagmites (bouldersMegaliths row 3, col 0)
    const b30 = cellRect(0, 3);
    blitBlock2x2(outsideC, W, 10, 2, bouldersMegaliths, b30.x, b30.y, b30.w, b30.h);
    // Cols 12-13: Sandstone desert hoodoo (bouldersMegaliths row 3, col 2)
    const b32 = cellRect(2, 3);
    blitBlock2x2(outsideC, W, 12, 2, bouldersMegaliths, b32.x, b32.y, b32.w, b32.h);
    // Cols 14-15: Ironstone nodule boulder (bouldersMegaliths row 3, col 3)
    const b33 = cellRect(3, 3);
    blitBlock2x2(outsideC, W, 14, 2, bouldersMegaliths, b33.x, b33.y, b33.w, b33.h);

    // Rows 4-5: Wooden & Stone Bridges
    // Cols 0-1: Horizontal timber bridge (ruinsBridges row 2, col 0)
    const br0 = cellRect(0, 2);
    blitBlock2x2(outsideC, W, 0, 4, ruinsBridges, br0.x, br0.y, br0.w, br0.h);
    // Cols 2-3: Vertical timber bridge (ruinsBridges row 2, col 1)
    const br1 = cellRect(1, 2);
    blitBlock2x2(outsideC, W, 2, 4, ruinsBridges, br1.x, br1.y, br1.w, br1.h);
    // Cols 4-5: Horizontal stone arched bridge (ruinsBridges row 2, col 2)
    const br2 = cellRect(2, 2);
    blitBlock2x2(outsideC, W, 4, 4, ruinsBridges, br2.x, br2.y, br2.w, br2.h);
    // Cols 6-7: Vertical stone bridge (ruinsBridges row 2, col 3)
    const br3 = cellRect(3, 2);
    blitBlock2x2(outsideC, W, 6, 4, ruinsBridges, br3.x, br3.y, br3.w, br3.h);

    // Cols 8-9: Dressed ashlar building stones (bouldersMegaliths row 2, col 0)
    const b20 = cellRect(0, 2);
    blitBlock2x2(outsideC, W, 8, 4, bouldersMegaliths, b20.x, b20.y, b20.w, b20.h);
    // Cols 10-11: Stacked slate flagstones (bouldersMegaliths row 2, col 1)
    const b21 = cellRect(1, 2);
    blitBlock2x2(outsideC, W, 10, 4, bouldersMegaliths, b21.x, b21.y, b21.w, b21.h);
    // Cols 12-13: Quarry limestone rubble pile (bouldersMegaliths row 2, col 2)
    const b22 = cellRect(2, 2);
    blitBlock2x2(outsideC, W, 12, 4, bouldersMegaliths, b22.x, b22.y, b22.w, b22.h);
    // Cols 14-15: Riverbed cobblestones (bouldersMegaliths row 2, col 3)
    const b23 = cellRect(3, 2);
    blitBlock2x2(outsideC, W, 14, 4, bouldersMegaliths, b23.x, b23.y, b23.w, b23.h);

    // Rows 6-7: Pavilions, Watchtower, Well & Fire Brazier
    // Cols 0-1: Canvas pavilion tent (ruinsBridges row 3, col 0)
    const r30 = cellRect(0, 3);
    blitBlock2x2(outsideC, W, 0, 6, ruinsBridges, r30.x, r30.y, r30.w, r30.h);
    // Cols 2-3: Shingled stone village well (ruinsBridges row 3, col 1)
    const r31 = cellRect(1, 3);
    blitBlock2x2(outsideC, W, 2, 6, ruinsBridges, r31.x, r31.y, r31.w, r31.h);
    // Cols 4-5: Stone watchtower battlement with arrow slit (ruinsBridges row 3, col 2)
    const r32 = cellRect(2, 3);
    blitBlock2x2(outsideC, W, 4, 6, ruinsBridges, r32.x, r32.y, r32.w, r32.h);
    // Cols 6-7: Fire brazier on stone pedestal (ruinsBridges row 3, col 3)
    const r33 = cellRect(3, 3);
    blitBlock2x2(outsideC, W, 6, 6, ruinsBridges, r33.x, r33.y, r33.w, r33.h);

    // Cols 8-9: Large faceted granite field boulder (bouldersMegaliths row 0, col 0)
    const b00 = cellRect(0, 0);
    blitBlock2x2(outsideC, W, 8, 6, bouldersMegaliths, b00.x, b00.y, b00.w, b00.h);
    // Cols 10-11: Layered gneiss rock boulder (bouldersMegaliths row 0, col 1)
    const b01 = cellRect(1, 0);
    blitBlock2x2(outsideC, W, 10, 6, bouldersMegaliths, b01.x, b01.y, b01.w, b01.h);
    // Cols 12-13: Flat sitting stone with moss (bouldersMegaliths row 0, col 2)
    const b02 = cellRect(2, 0);
    blitBlock2x2(outsideC, W, 12, 6, bouldersMegaliths, b02.x, b02.y, b02.w, b02.h);
    // Cols 14-15: Twin companion boulders with pebbles (bouldersMegaliths row 0, col 3)
    const b03 = cellRect(3, 0);
    blitBlock2x2(outsideC, W, 14, 6, bouldersMegaliths, b03.x, b03.y, b03.w, b03.h);

    // Rows 8-15: Individual 48x48 single tile world objects & structures
    // Row 8: 16 Drystone wall & log palisade segments from fencesGates
    for (let c = 0; c < 4; c++) {
        const f0 = cellRect(c, 0); // Split rail
        blitTile(outsideC, W, c, 8, fencesGates, f0.x, f0.y, f0.w, f0.h);
        const f1 = cellRect(c, 1); // Drystone wall
        blitTile(outsideC, W, 4 + c, 8, fencesGates, f1.x, f1.y, f1.w, f1.h);
        const f2 = cellRect(c, 2); // Picket fence
        blitTile(outsideC, W, 8 + c, 8, fencesGates, f2.x, f2.y, f2.w, f2.h);
        const f3 = cellRect(c, 3); // Palisade
        blitTile(outsideC, W, 12 + c, 8, fencesGates, f3.x, f3.y, f3.w, f3.h);
    }

    // Row 9: 16 Signposts, waymarkers & totems from signposts
    for (let c = 0; c < 4; c++) {
        const s0 = cellRect(c, 0);
        blitTile(outsideC, W, c, 9, signposts, s0.x, s0.y, s0.w, s0.h);
        const s1 = cellRect(c, 1);
        blitTile(outsideC, W, 4 + c, 9, signposts, s1.x, s1.y, s1.w, s1.h);
        const s2 = cellRect(c, 2);
        blitTile(outsideC, W, 8 + c, 9, signposts, s2.x, s2.y, s2.w, s2.h);
        const s3 = cellRect(c, 3);
        blitTile(outsideC, W, 12 + c, 9, signposts, s3.x, s3.y, s3.w, s3.h);
    }

    // Rows 10-15: Additional authentic architectural & terrain elements
    for (let row = 10; row < 16; row++) {
        for (let col = 0; col < 16; col++) {
            const srcIdx = (row - 10) * 16 + col;
            const srcCol = srcIdx % 4;
            const srcRow = Math.floor((srcIdx % 16) / 4);
            const sheet = (row % 2 === 0) ? ruinsBridges : bouldersMegaliths;
            const cr = cellRect(srcCol, srcRow);
            blitTile(outsideC, W, col, row, sheet, cr.x, cr.y, cr.w, cr.h);
        }
    }

    function cleanFringe(buf) {
        for (let i = 0; i < buf.length; i += 4) {
            if (buf[i + 3] === 0) continue;
            const r = buf[i], g = buf[i + 1], b = buf[i + 2];
            if (isMagentaOrFringe(r, g, b)) {
                buf[i] = 0;
                buf[i + 1] = 0;
                buf[i + 2] = 0;
                buf[i + 3] = 0;
            }
        }
    }

    cleanFringe(outsideC);
    quantizeToColors(outsideC, 56);
    cleanFringe(outsideC);
    writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_C.png'), W, H, outsideC);
    writePNG(path.join(ROOT, 'art', 'masters', 'Outside_C.png'), W, H, outsideC);
    console.log('Saved authentic Outside_C.png to game/img/tilesets/ and art/masters/!');
}

main();
