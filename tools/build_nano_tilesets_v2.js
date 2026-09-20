const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// 1. Palette & CIELAB Snapping
// ----------------------------------------------------------------------------
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

const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8').split(/\r?\n/).filter(s => s.trim().startsWith('#'));
const palRGB = hexLines.map(parseHex).filter(Boolean);
const palLab = palRGB.map(c => srgbToLab(...c));
const snapCache = new Map();

function snap(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    if (snapCache.has(key)) return snapCache.get(key);
    const l = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    snapCache.set(key, best);
    return best;
}

function snapHex(hex) {
    const rgb = parseHex(hex);
    return snap(rgb[0], rgb[1], rgb[2]);
}

// ----------------------------------------------------------------------------
// 2. Load Raw Nano Banana II Generations
// ----------------------------------------------------------------------------
const dungeonWallsRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'dungeon_walls_nano_raw.png')));
const dungeonFloorsRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'dungeon_floors_nano_raw.png')));
const waterAnimatedRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'water_nano_animated_raw.png')));
const wallStoneRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'wall_stone_nano_banana_raw.png')));
const wallWoodRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'wall_wood_nano_banana_raw.png')));

function sampleBox(raw, sx, sy, sw, sh, dw, dh) {
    const buf = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const startX = Math.floor(sx + (dx * sw / dw));
            const endX = Math.max(startX + 1, Math.floor(sx + ((dx + 1) * sw / dw)));
            const startY = Math.floor(sy + (dy * sh / dh));
            const endY = Math.max(startY + 1, Math.floor(sy + ((dy + 1) * sh / dh)));
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let py = startY; py < endY; py++) {
                if (py < 0 || py >= raw.height) continue;
                for (let px = startX; px < endX; px++) {
                    if (px < 0 || px >= raw.width) continue;
                    const si = (py * raw.width + px) * 4;
                    rSum += raw.data[si];
                    gSum += raw.data[si + 1];
                    bSum += raw.data[si + 2];
                    count++;
                }
            }
            const di = (dy * dw + dx) * 4;
            buf[di] = count ? Math.round(rSum / count) : 0;
            buf[di + 1] = count ? Math.round(gSum / count) : 0;
            buf[di + 2] = count ? Math.round(bSum / count) : 0;
            buf[di + 3] = 255;
        }
    }
    return buf;
}

function makeSeamless(tile, w, h, blend = 6) {
    const out = Buffer.from(tile);
    for (let y = 0; y < h; y++) {
        for (let i = 0; i < blend; i++) {
            const t = (i + 1) / (blend + 1);
            const leftIdx = (y * w + i) * 4;
            const rightIdx = (y * w + (w - blend + i)) * 4;
            for (let c = 0; c < 3; c++) {
                const avg = Math.round(out[leftIdx + c] * t + out[rightIdx + c] * (1 - t));
                out[leftIdx + c] = avg;
                out[rightIdx + c] = avg;
            }
        }
    }
    for (let x = 0; x < w; x++) {
        for (let i = 0; i < blend; i++) {
            const t = (i + 1) / (blend + 1);
            const topIdx = (i * w + x) * 4;
            const botIdx = ((h - blend + i) * w + x) * 4;
            for (let c = 0; c < 3; c++) {
                const avg = Math.round(out[topIdx + c] * t + out[botIdx + c] * (1 - t));
                out[topIdx + c] = avg;
                out[botIdx + c] = avg;
            }
        }
    }
    return out;
}

// ----------------------------------------------------------------------------
// 3. BUILD A4 WALLS (Dungeon_A4.png & Outside_A4.png)
//    Exact RMMZ A4 Autotile Architecture:
//    Width: 768 px (8 wall columns of 96 px)
//    Height: 720 px (3 vertical tiers of 240 px)
//    Each 96x240 Wall Column:
//      - y = 0..143 (144 px): Wall Top Autotile (4x6 sub-tiles of 24x24 px, FLOOR_AUTOTILE_TABLE)
//      - y = 144..239 (96 px): Wall Face Autotile (4x4 sub-tiles of 24x24 px, WALL_AUTOTILE_TABLE)
// ----------------------------------------------------------------------------
function buildA4WallColumn(style) {
    // style: { topTex, faceTex, rimDark, rimMid, rimHi, lipDark, lipMid, lipHi, shadowColor, voidColor }
    const col = Buffer.alloc(96 * 240 * 4);
    const voidCol = snapHex(style.voidColor || '#000000');
    const innerShd = snapHex(style.shadowColor || '#0a0a14');
    const rimD = snapHex(style.rimDark);
    const rimM = snapHex(style.rimMid);
    const rimH = snapHex(style.rimHi);
    const lipD = snapHex(style.lipDark || style.rimDark);
    const lipM = snapHex(style.lipMid || style.rimMid);
    const lipH = snapHex(style.lipHi || style.rimHi);

    // --- Part A: Wall Top (y = 0..143, 4x6 sub-tiles of 24x24) ---
    // Sample 48x48 bedrock texture from topRaw for interior unmined rock
    const topBedrock = makeSeamless(sampleBox(style.topRaw || style.faceRaw, style.topX || style.faceX, style.topY || style.faceY, 300, 300, 48, 48), 48, 48);

    for (let sy = 0; sy < 6; sy++) {
        for (let sx = 0; sx < 4; sx++) {
            const baseTx = (sx === 0 || sx === 2) ? 0 : 24;
            const baseTy = (sy % 2 === 0) ? 0 : 24;

            for (let ly = 0; ly < 24; ly++) {
                for (let lx = 0; lx < 24; lx++) {
                    const py = sy * 24 + ly;
                    const px = sx * 24 + lx;
                    const di = (py * 96 + px) * 4;

                    const si = ((baseTy + ly) * 48 + (baseTx + lx)) * 4;
                    let r = topBedrock[si], g = topBedrock[si + 1], b = topBedrock[si + 2];

                    let edgeDist = Infinity;
                    let isSouthLip = false;

                    if ((sy === 3 || sy === 4) && (sx === 1 || sx === 2)) {
                        edgeDist = Infinity; // Fully connected interior (solid bedrock)
                    } else if (sy === 2 && (sx === 1 || sx === 2)) {
                        edgeDist = ly; // North edge
                    } else if (sy === 5 && (sx === 1 || sx === 2)) {
                        edgeDist = 23 - ly; // South edge
                        isSouthLip = true;
                    } else if (sx === 0 && (sy === 3 || sy === 4)) {
                        edgeDist = lx; // West edge
                    } else if (sx === 3 && (sy === 3 || sy === 4)) {
                        edgeDist = 23 - lx; // East edge
                    } else if (sx === 0 && sy === 2) {
                        edgeDist = Math.hypot(lx, ly);
                    } else if (sx === 3 && sy === 2) {
                        edgeDist = Math.hypot(23 - lx, ly);
                    } else if (sx === 0 && sy === 5) {
                        edgeDist = Math.hypot(lx, 23 - ly);
                        isSouthLip = true;
                    } else if (sx === 3 && sy === 5) {
                        edgeDist = Math.hypot(23 - lx, 23 - ly);
                        isSouthLip = true;
                    } else if (sx === 2 && sy === 0) {
                        if (lx < 6 && ly < 6) edgeDist = Math.hypot(lx, ly);
                    } else if (sx === 3 && sy === 0) {
                        if ((23 - lx) < 6 && ly < 6) edgeDist = Math.hypot(23 - lx, ly);
                    } else if (sx === 2 && sy === 1) {
                        if (lx < 6 && (23 - ly) < 6) { edgeDist = Math.hypot(lx, 23 - ly); isSouthLip = true; }
                    } else if (sx === 3 && sy === 1) {
                        if ((23 - lx) < 6 && (23 - ly) < 6) { edgeDist = Math.hypot(23 - lx, 23 - ly); isSouthLip = true; }
                    } else if (sx === 0 && sy === 0) {
                        edgeDist = Math.hypot(lx, ly);
                    } else if (sx === 1 && sy === 0) {
                        edgeDist = Math.hypot(23 - lx, ly);
                    } else if (sx === 0 && sy === 1) {
                        edgeDist = Math.hypot(lx, 23 - ly);
                        isSouthLip = true;
                    } else if (sx === 1 && sy === 1) {
                        edgeDist = Math.hypot(23 - lx, 23 - ly);
                        isSouthLip = true;
                    }

                    // Render Wall Top:
                    // edgeDist 0..6.5: Coping rim with highlight and bevel
                    // edgeDist 6.5..8: Inner bevel shadow into the dark void
                    // edgeDist >= 8: Pure black ceiling void inside the material rim
                    let c = null;
                    if (edgeDist < 1.0) {
                        c = isSouthLip ? lipD : rimD;
                    } else if (edgeDist < 2.5) {
                        c = isSouthLip ? lipM : rimM;
                    } else if (edgeDist < 4.5) {
                        c = isSouthLip ? lipH : rimH;
                    } else if (edgeDist < 6.5) {
                        c = isSouthLip ? lipM : rimM;
                    } else if (edgeDist < 8.0) {
                        c = innerShd;
                    } else {
                        // Pure pitch black ceiling void inside the material rim
                        c = voidCol;
                    }

                    col[di] = c[0];
                    col[di + 1] = c[1];
                    col[di + 2] = c[2];
                    col[di + 3] = 255;
                }
            }
        }
    }

    // --- Part B: Wall Face / Front (y = 144..239, 4x4 sub-tiles of 24x24 px, WALL_AUTOTILE_TABLE) ---
    // In RMMZ WALL_AUTOTILE_TABLE:
    // sy = 0: Upper course of single-height wall (y = 0..23 of 48px tile) -> HAS CAST SHADOW FROM COPING
    // sy = 2: Upper course of multi-tile wall (y = 0..23 of 48px tile) -> HAS CAST SHADOW FROM COPING
    // sy = 1: Lower course of multi-tile wall (y = 24..47 of 48px tile) -> HAS FOUNDATION FOOTER
    // sy = 3: Lower course of single-height wall (y = 24..47 of 48px tile) -> HAS FOUNDATION FOOTER
    //
    // Horizontal mapping:
    // sx = 0: West outer edge (x = 0..23 with dark edge)
    // sx = 2: Left half of center wall (x = 0..23)
    // sx = 1: Right half of center wall (x = 24..47)
    // sx = 3: East outer edge (x = 24..47 with highlight edge)
    const faceW = 48, faceH = 48;
    const sampledW = style.faceW || 160;
    const sampledH = style.faceH || 160;
    let rawFace = makeSeamless(sampleBox(style.faceRaw, style.faceX, style.faceY, sampledW, sampledH, faceW, faceH), faceW, faceH, 4);

    let rawFooter = null;
    if (style.footerY) {
        rawFooter = makeSeamless(sampleBox(style.faceRaw, style.faceX, style.footerY, sampledW, sampledH, faceW, faceH), faceW, faceH, 4);
    }

    for (let sy = 0; sy < 4; sy++) {
        const isUpper = (sy === 0 || sy === 2);
        const faceBaseY = isUpper ? 0 : 24;

        for (let sx = 0; sx < 4; sx++) {
            const isLeft = (sx === 0 || sx === 2);
            const faceBaseX = isLeft ? 0 : 24;

            for (let ly = 0; ly < 24; ly++) {
                for (let lx = 0; lx < 24; lx++) {
                    const py = 144 + sy * 24 + ly;
                    const px = sx * 24 + lx;
                    const di = (py * 96 + px) * 4;

                    const faceY = faceBaseY + ly;
                    const faceX = faceBaseX + lx;
                    const si = (faceY * faceW + faceX) * 4;

                    const srcBuf = (!isUpper && rawFooter && ly >= 8) ? rawFooter : rawFace;
                    let r = srcBuf[si], g = srcBuf[si + 1], b = srcBuf[si + 2];

                    if (style.tint) {
                        r = Math.round((r * style.tint[0]) / 255);
                        g = Math.round((g * style.tint[1]) / 255);
                        b = Math.round((b * style.tint[2]) / 255);
                    }

                    // 1. Cast shadow directly under south coping overhang (isUpper && ly 0..3)
                    if (isUpper) {
                        if (ly === 0) {
                            r = Math.round(r * 0.35); g = Math.round(g * 0.35); b = Math.round(b * 0.35);
                        } else if (ly === 1) {
                            r = Math.round(r * 0.50); g = Math.round(g * 0.50); b = Math.round(b * 0.50);
                        } else if (ly === 2) {
                            r = Math.round(r * 0.70); g = Math.round(g * 0.70); b = Math.round(b * 0.70);
                        }
                    }

                    // 2. Foundation footer baseboard / boulders (bottom of tile: !isUpper && ly >= 18)
                    if (!isUpper) {
                        if (ly === 18) {
                            // Highlight bevel along top of footer
                            r = Math.min(255, Math.round(r * 1.25));
                            g = Math.min(255, Math.round(g * 1.25));
                            b = Math.min(255, Math.round(b * 1.25));
                        } else if (ly >= 19) {
                            // Darker sturdy foundation stone
                            r = Math.round(r * 0.85);
                            g = Math.round(g * 0.85);
                            b = Math.round(b * 0.85);
                        }
                    }

                    // 3. Side vertical corner edge shading
                    if (sx === 0 && lx === 0) {
                        r = Math.round(r * 0.65); g = Math.round(g * 0.65); b = Math.round(b * 0.65);
                    } else if (sx === 3 && lx === 23) {
                        r = Math.min(255, Math.round(r * 1.25)); g = Math.min(255, Math.round(g * 1.25)); b = Math.min(255, Math.round(b * 1.25));
                    }

                    const c = snap(r, g, b);
                    col[di] = c[0];
                    col[di + 1] = c[1];
                    col[di + 2] = c[2];
                    col[di + 3] = 255;
                }
            }
        }
    }

    return col;
}

// ----------------------------------------------------------------------------
// 4. BUILD A2 DUNGEON FLOORS (Dungeon_A2.png)
//    Width: 768 px (8 columns of 96 px)
//    Height: 576 px (4 rows of 144 px)
//    Each 96x144 autotile block is 4x6 sub-tiles of 24x24 px (FLOOR_AUTOTILE_TABLE)
// ----------------------------------------------------------------------------
function buildA2FloorBlock(tile48, borderColors) {
    const block = Buffer.alloc(96 * 144 * 4);
    const borderDark = snapHex(borderColors.dark);
    const borderMid = snapHex(borderColors.mid);
    const borderHi = snapHex(borderColors.hi);

    for (let sy = 0; sy < 6; sy++) {
        for (let sx = 0; sx < 4; sx++) {
            const baseTx = (sx % 2 === 0) ? 0 : 24;
            const baseTy = (sy % 2 === 0) ? 0 : 24;

            for (let ly = 0; ly < 24; ly++) {
                for (let lx = 0; lx < 24; lx++) {
                    const si = ((baseTy + ly) * 48 + (baseTx + lx)) * 4;
                    let r = tile48[si], g = tile48[si + 1], b = tile48[si + 2];

                    let dist = Infinity;
                    if ((sy === 3 || sy === 4) && (sx === 1 || sx === 2)) {
                        dist = Infinity;
                    } else if (sy === 2 && (sx === 1 || sx === 2)) {
                        dist = ly;
                    } else if (sy === 5 && (sx === 1 || sx === 2)) {
                        dist = 23 - ly;
                    } else if (sx === 0 && (sy === 3 || sy === 4)) {
                        dist = lx;
                    } else if (sx === 3 && (sy === 3 || sy === 4)) {
                        dist = 23 - lx;
                    } else if (sx === 0 && sy === 2) {
                        dist = Math.hypot(lx, ly);
                    } else if (sx === 3 && sy === 2) {
                        dist = Math.hypot(23 - lx, ly);
                    } else if (sx === 0 && sy === 5) {
                        dist = Math.hypot(lx, 23 - ly);
                    } else if (sx === 3 && sy === 5) {
                        dist = Math.hypot(23 - lx, 23 - ly);
                    } else if (sx === 2 && sy === 0) {
                        if (lx < 4 && ly < 4) dist = Math.hypot(lx, ly);
                    } else if (sx === 3 && sy === 0) {
                        if ((23 - lx) < 4 && ly < 4) dist = Math.hypot(23 - lx, ly);
                    } else if (sx === 2 && sy === 1) {
                        if (lx < 4 && (23 - ly) < 4) dist = Math.hypot(lx, 23 - ly);
                    } else if (sx === 3 && sy === 1) {
                        if ((23 - lx) < 4 && (23 - ly) < 4) dist = Math.hypot(23 - lx, 23 - ly);
                    } else if (sx === 0 && sy === 0) {
                        dist = Math.hypot(lx, ly);
                    } else if (sx === 1 && sy === 0) {
                        dist = Math.hypot(23 - lx, ly);
                    } else if (sx === 0 && sy === 1) {
                        dist = Math.hypot(lx, 23 - ly);
                    } else if (sx === 1 && sy === 1) {
                        dist = Math.hypot(23 - lx, 23 - ly);
                    }

                    if (dist < 1.0) {
                        r = borderDark[0]; g = borderDark[1]; b = borderDark[2];
                    } else if (dist < 2.2) {
                        r = borderMid[0]; g = borderMid[1]; b = borderMid[2];
                    } else if (dist < 3.2) {
                        r = borderHi[0]; g = borderHi[1]; b = borderHi[2];
                    }

                    const c = snap(r, g, b);
                    const di = ((sy * 24 + ly) * 96 + (sx * 24 + lx)) * 4;
                    block[di] = c[0];
                    block[di + 1] = c[1];
                    block[di + 2] = c[2];
                    block[di + 3] = 255;
                }
            }
        }
    }
    return block;
}

// ----------------------------------------------------------------------------
// 5. BUILD ANIMATED WATER A1 (Outside_A1.png, Dungeon_A1.png)
//    Width: 768 px (16 tiles)
//    Height: 576 px (12 tiles)
//    From water_nano_animated_raw.png (Panels 1, 2, 3)
//    Universal seamless shoreline with soft translucent shallows & white surf foam
// ----------------------------------------------------------------------------
const waterPanels = [
    makeSeamless(sampleBox(waterAnimatedRaw, 70, 120, 350, 600, 48, 48), 48, 48),
    makeSeamless(sampleBox(waterAnimatedRaw, 490, 120, 350, 600, 48, 48), 48, 48),
    makeSeamless(sampleBox(waterAnimatedRaw, 910, 120, 350, 600, 48, 48), 48, 48)
];

function buildWaterStrip(spec) {
    const W = 288, H = 144;
    const strip = Buffer.alloc(W * H * 4);

    const foamWhite = snapHex('#FFFFFF');
    const foamAqua = snapHex(spec.ramp.foam || '#A0FFFF');
    const shallowGlint = snapHex(spec.ramp.crest || '#7DFFFF');
    const shallowWater = snapHex(spec.ramp.shallows || '#3DBBFF');
    const deepWater = snapHex(spec.ramp.deep || '#001850');

    for (let f = 0; f < 3; f++) {
        const frameOriginX = f * 96;
        const panel = waterPanels[f];

        for (let sy = 0; sy < 6; sy++) {
            for (let sx = 0; sx < 4; sx++) {
                const baseTx = (sx % 2 === 0) ? 0 : 24;
                const baseTy = (sy % 2 === 0) ? 0 : 24;

                for (let ly = 0; ly < 24; ly++) {
                    for (let lx = 0; lx < 24; lx++) {
                        const si = ((baseTy + ly) * 48 + (baseTx + lx)) * 4;
                        let r = panel[si], g = panel[si + 1], b = panel[si + 2];

                        // Tint panel toward spec water kind palette
                        if (spec.tint) {
                            r = Math.round((r * 0.6) + (spec.tint[0] * 0.4));
                            g = Math.round((g * 0.6) + (spec.tint[1] * 0.4));
                            b = Math.round((b * 0.6) + (spec.tint[2] * 0.4));
                        }

                        let dist = Infinity;
                        if ((sy === 3 || sy === 4) && (sx === 1 || sx === 2)) {
                            dist = Infinity;
                        } else if (sy === 2 && (sx === 1 || sx === 2)) {
                            dist = ly;
                        } else if (sy === 5 && (sx === 1 || sx === 2)) {
                            dist = 23 - ly;
                        } else if (sx === 0 && (sy === 3 || sy === 4)) {
                            dist = lx;
                        } else if (sx === 3 && (sy === 3 || sy === 4)) {
                            dist = 23 - lx;
                        } else if (sx === 0 && sy === 2) {
                            dist = Math.hypot(lx, ly);
                        } else if (sx === 3 && sy === 2) {
                            dist = Math.hypot(23 - lx, ly);
                        } else if (sx === 0 && sy === 5) {
                            dist = Math.hypot(lx, 23 - ly);
                        } else if (sx === 3 && sy === 5) {
                            dist = Math.hypot(23 - lx, 23 - ly);
                        } else if (sx === 2 && sy === 0) {
                            if (lx < 5 && ly < 5) dist = Math.hypot(lx, ly);
                        } else if (sx === 3 && sy === 0) {
                            if ((23 - lx) < 5 && ly < 5) dist = Math.hypot(23 - lx, ly);
                        } else if (sx === 2 && sy === 1) {
                            if (lx < 5 && (23 - ly) < 5) dist = Math.hypot(lx, 23 - ly);
                        } else if (sx === 3 && sy === 1) {
                            if ((23 - lx) < 5 && (23 - ly) < 5) dist = Math.hypot(23 - lx, 23 - ly);
                        } else if (sx === 0 && sy === 0) {
                            dist = Math.hypot(lx, ly);
                        } else if (sx === 1 && sy === 0) {
                            dist = Math.hypot(23 - lx, ly);
                        } else if (sx === 0 && sy === 1) {
                            dist = Math.hypot(lx, 23 - ly);
                        } else if (sx === 1 && sy === 1) {
                            dist = Math.hypot(23 - lx, 23 - ly);
                        }

                        // Universal Shoreline Transition (Organic wave surf & shallow water)
                        // No hard dark navy box borders!
                        // Dist 0: Crisp white wave foam / surf froth
                        // Dist 1..2: Translucent turquoise / aqua shallows with ripple highlights
                        // Dist 3..4: Dithered transition to open water
                        if (dist < 1.0) {
                            // Organic surf edge with subtle wave break
                            const rippleBreak = ((lx * 7 + ly * 13 + f * 5) % 4 === 0);
                            const c = rippleBreak ? foamAqua : foamWhite;
                            r = c[0]; g = c[1]; b = c[2];
                        } else if (dist < 2.5) {
                            const c = shallowGlint;
                            r = c[0]; g = c[1]; b = c[2];
                        } else if (dist < 4.0) {
                            const dither = ((lx + ly + f) % 2 === 0);
                            const c = dither ? shallowWater : shallowGlint;
                            r = c[0]; g = c[1]; b = c[2];
                        }

                        const c = snap(r, g, b);
                        const px = sx * 24 + lx;
                        const py = sy * 24 + ly;
                        const di = (py * W + (frameOriginX + px)) * 4;
                        strip[di] = c[0];
                        strip[di + 1] = c[1];
                        strip[di + 2] = c[2];
                        strip[di + 3] = 255;
                    }
                }
            }
        }
    }
    return strip;
}

// ----------------------------------------------------------------------------
// 6. MAIN EXECUTION & SHEET ASSEMBLY
// ----------------------------------------------------------------------------
console.log('=== Building Complete Nano Banana II Tileset Suite v2 ===');

// --- A4 WALLS ASSEMBLY ---
const A4_W = 768, A4_H = 720;
const dungeonA4 = Buffer.alloc(A4_W * A4_H * 4);
const outsideA4 = Buffer.alloc(A4_W * A4_H * 4);

// Wall Styles for Dungeon_A4
const dungeonWallStyles = [
    // 0: Subterranean Soil / Earthen Cavern Rock Wall (kind 0)
    {
        faceRaw: dungeonWallsRaw, faceX: 720, faceY: 280, faceW: 160, faceH: 160, footerY: 580,
        rimDark: '#3A281A', rimMid: '#6B4E32', rimHi: '#9E7750',
        lipDark: '#2E1E12', lipMid: '#543C24', lipHi: '#82603C',
        shadowColor: '#120A04', voidColor: '#000000'
    },
    // 1: Subterranean Granite / Slate Cavern Rock Wall (kind 1)
    {
        faceRaw: dungeonWallsRaw, faceX: 720, faceY: 280, faceW: 160, faceH: 160, footerY: 580,
        tint: [170, 185, 205],
        rimDark: '#262D38', rimMid: '#4E5B6E', rimHi: '#7C8FA8',
        lipDark: '#1E242E', lipMid: '#3E4B5C', lipHi: '#6A7D96',
        shadowColor: '#0A0E14', voidColor: '#000000'
    },
    // 2: Ancient Chiseled Ashlar Stone Fortress Wall (kind 2)
    {
        faceRaw: dungeonWallsRaw, faceX: 50, faceY: 280, faceW: 160, faceH: 160,
        rimDark: '#262D38', rimMid: '#4E5B6E', rimHi: '#7C8FA8',
        lipDark: '#1E242E', lipMid: '#3E4B5C', lipHi: '#6A7D96',
        shadowColor: '#0A0E14', voidColor: '#000000'
    },
    // 3: Chiseled Crypt Basalt Wall (kind 3)
    {
        faceRaw: dungeonWallsRaw, faceX: 50, faceY: 280, faceW: 160, faceH: 160,
        tint: [140, 140, 160],
        rimDark: '#1E1E26', rimMid: '#3A3A4A', rimHi: '#5C5C72',
        lipDark: '#16161E', lipMid: '#2E2E3C', lipHi: '#4C4C60',
        shadowColor: '#08080C', voidColor: '#000000'
    },
    // 4..7: Additional underground wall variations
    {
        faceRaw: dungeonWallsRaw, faceX: 720, faceY: 280, faceW: 160, faceH: 160, footerY: 580,
        rimDark: '#3A281A', rimMid: '#6B4E32', rimHi: '#9E7750',
        lipDark: '#2E1E12', lipMid: '#543C24', lipHi: '#82603C',
        shadowColor: '#120A04', voidColor: '#000000'
    },
    {
        faceRaw: dungeonWallsRaw, faceX: 720, faceY: 280, faceW: 160, faceH: 160, footerY: 580,
        tint: [170, 185, 205],
        rimDark: '#262D38', rimMid: '#4E5B6E', rimHi: '#7C8FA8',
        lipDark: '#1E242E', lipMid: '#3E4B5C', lipHi: '#6A7D96',
        shadowColor: '#0A0E14', voidColor: '#000000'
    },
    {
        faceRaw: dungeonWallsRaw, faceX: 50, faceY: 280, faceW: 160, faceH: 160,
        rimDark: '#262D38', rimMid: '#4E5B6E', rimHi: '#7C8FA8',
        lipDark: '#1E242E', lipMid: '#3E4B5C', lipHi: '#6A7D96',
        shadowColor: '#0A0E14', voidColor: '#000000'
    },
    {
        faceRaw: dungeonWallsRaw, faceX: 50, faceY: 280, faceW: 160, faceH: 160,
        tint: [140, 140, 160],
        rimDark: '#1E1E26', rimMid: '#3A3A4A', rimHi: '#5C5C72',
        lipDark: '#16161E', lipMid: '#2E2E3C', lipHi: '#4C4C60',
        shadowColor: '#08080C', voidColor: '#000000'
    }
];

// Wall Styles for Outside_A4
const outsideWallStyles = [
    // 0: Timber Palisade Wall
    {
        faceRaw: wallWoodRaw, faceX: 50, faceY: 150, faceW: 160, faceH: 160,
        rimDark: '#4A3018', rimMid: '#825628', rimHi: '#B88242',
        lipDark: '#3A2412', lipMid: '#6A441E', lipHi: '#9A6C32',
        shadowColor: '#181006', voidColor: '#000000'
    },
    // 1: Fortress Stone Wall
    {
        faceRaw: wallStoneRaw, faceX: 50, faceY: 150, faceW: 160, faceH: 160,
        rimDark: '#262D38', rimMid: '#4E5B6E', rimHi: '#7C8FA8',
        lipDark: '#1E242E', lipMid: '#3E4B5C', lipHi: '#6A7D96',
        shadowColor: '#0A0E14', voidColor: '#000000'
    },
    // 2: Mountain Rock Cliff
    {
        faceRaw: dungeonWallsRaw, faceX: 720, faceY: 280, faceW: 160, faceH: 160, footerY: 580,
        rimDark: '#32261E', rimMid: '#5C4A3C', rimHi: '#8A725E',
        lipDark: '#281C16', lipMid: '#4A3A2E', lipHi: '#725E4C',
        shadowColor: '#0E0A06', voidColor: '#000000'
    },
    // 3: Whitewash Masonry Wall
    {
        faceRaw: wallStoneRaw, faceX: 50, faceY: 150, faceW: 400, faceH: 400,
        rimDark: '#42424E', rimMid: '#747488', rimHi: '#A8A8BF',
        lipDark: '#343440', lipMid: '#606074', lipHi: '#8E8EA8',
        shadowColor: '#14141E', voidColor: '#000000'
    },
    // 4..7: Duplicated for full 8-column coverage
    {
        faceRaw: wallWoodRaw, faceX: 50, faceY: 150, faceW: 400, faceH: 400,
        rimDark: '#4A3018', rimMid: '#825628', rimHi: '#B88242',
        lipDark: '#3A2412', lipMid: '#6A441E', lipHi: '#9A6C32',
        shadowColor: '#181006', voidColor: '#000000'
    },
    {
        faceRaw: wallStoneRaw, faceX: 50, faceY: 150, faceW: 400, faceH: 400,
        rimDark: '#262D38', rimMid: '#4E5B6E', rimHi: '#7C8FA8',
        lipDark: '#1E242E', lipMid: '#3E4B5C', lipHi: '#6A7D96',
        shadowColor: '#0A0E14', voidColor: '#000000'
    },
    {
        faceRaw: dungeonWallsRaw, faceX: 720, faceY: 280, faceW: 600, faceH: 380,
        rimDark: '#32261E', rimMid: '#5C4A3C', rimHi: '#8A725E',
        lipDark: '#281C16', lipMid: '#4A3A2E', lipHi: '#725E4C',
        shadowColor: '#0E0A06', voidColor: '#000000'
    },
    {
        faceRaw: wallStoneRaw, faceX: 50, faceY: 150, faceW: 400, faceH: 400,
        rimDark: '#42424E', rimMid: '#747488', rimHi: '#A8A8BF',
        lipDark: '#343440', lipMid: '#606074', lipHi: '#8E8EA8',
        shadowColor: '#14141E', voidColor: '#000000'
    }
];

// Paint 3 vertical tiers of 240 px each
for (let tier = 0; tier < 3; tier++) {
    const tierY = tier * 240;
    for (let c = 0; c < 8; c++) {
        const colX = c * 96;
        const dCol = buildA4WallColumn(dungeonWallStyles[c]);
        const oCol = buildA4WallColumn(outsideWallStyles[c]);

        for (let y = 0; y < 240; y++) {
            for (let x = 0; x < 96; x++) {
                const srcI = (y * 96 + x) * 4;
                const dstI = ((tierY + y) * A4_W + (colX + x)) * 4;

                dungeonA4[dstI] = dCol[srcI];
                dungeonA4[dstI + 1] = dCol[srcI + 1];
                dungeonA4[dstI + 2] = dCol[srcI + 2];
                dungeonA4[dstI + 3] = 255;

                outsideA4[dstI] = oCol[srcI];
                outsideA4[dstI + 1] = oCol[srcI + 1];
                outsideA4[dstI + 2] = oCol[srcI + 2];
                outsideA4[dstI + 3] = 255;
            }
        }
    }
}

function quantizeToMaxColors(buf, maxColors = 48) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 0) {
            const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topColors = sorted.slice(0, maxColors).map(e => [
        (e[0] >> 16) & 255,
        (e[0] >> 8) & 255,
        e[0] & 255
    ]);
    const topLab = topColors.map(c => srgbToLab(c[0], c[1], c[2]));

    const remap = new Map();
    for (let i = maxColors; i < sorted.length; i++) {
        const k = sorted[i][0];
        const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255;
        const lab = srgbToLab(r, g, b);
        let best = topColors[0], bd = Infinity;
        for (let j = 0; j < topLab.length; j++) {
            const d = Math.hypot(lab[0] - topLab[j][0], lab[1] - topLab[j][1], lab[2] - topLab[j][2]);
            if (d < bd) { bd = d; best = topColors[j]; }
        }
        remap.set(k, best);
    }

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 0) {
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (remap.has(k)) {
                const target = remap.get(k);
                buf[i] = target[0];
                buf[i + 1] = target[1];
                buf[i + 2] = target[2];
            }
        }
    }
}

quantizeToMaxColors(dungeonA4, 48);
quantizeToMaxColors(outsideA4, 48);

writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A4.png'), A4_W, A4_H, dungeonA4);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A4.png'), A4_W, A4_H, outsideA4);
writePNG(path.join(ROOT, 'art', 'masters', 'Outside_A4.png'), A4_W, A4_H, outsideA4);
writePNG(path.join(ROOT, 'art', 'masters', 'Dungeon_A4.png'), A4_W, A4_H, dungeonA4);
writePNG(path.join(ROOT, 'art', 'masters', 'UF_GenTerrain_A4.png'), A4_W, A4_H, outsideA4);
console.log('Successfully wrote Dungeon_A4.png, Outside_A4.png, and masters.');

// --- A2 DUNGEON FLOORS ASSEMBLY ---
const A2_W = 768, A2_H = 576;
const dungeonA2 = Buffer.alloc(A2_W * A2_H * 4);

// Sample base 48x48 tiles from dungeon_floors_nano_raw.png
const dugEarthTile = makeSeamless(sampleBox(dungeonFloorsRaw, 60, 60, 560, 260, 48, 48), 48, 48);
const clayBedTile = makeSeamless(sampleBox(dungeonFloorsRaw, 740, 60, 560, 260, 48, 48), 48, 48);
const flagstoneTile = makeSeamless(sampleBox(dungeonFloorsRaw, 60, 440, 560, 260, 48, 48), 48, 48);
const cavernRockTile = makeSeamless(sampleBox(dungeonFloorsRaw, 740, 440, 560, 260, 48, 48), 48, 48);

// Build 32 blocks (8 cols x 4 rows)
for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
        const k = row * 8 + col;
        let tile = dugEarthTile;
        let border = { dark: '#2E2216', mid: '#5A442C', hi: '#846844' };

        if (k === 0) {
            tile = clayBedTile;
            border = { dark: '#422414', mid: '#784628', hi: '#AA683C' };
        } else if (k === 1 || k === 10) {
            tile = flagstoneTile;
            border = { dark: '#262D38', mid: '#4E5B6E', hi: '#7C8FA8' };
        } else if (k === 2) {
            tile = dugEarthTile;
            border = { dark: '#2E2216', mid: '#5A442C', hi: '#846844' };
        } else if (k === 6) {
            // Hole edge / abyss pit
            tile = Buffer.alloc(48 * 48 * 4);
            for (let i = 0; i < tile.length; i += 4) { tile[i] = 0; tile[i+1] = 0; tile[i+2] = 0; tile[i+3] = 255; }
            border = { dark: '#1E242E', mid: '#3E4B5C', hi: '#6A7D96' };
        } else if (k === 8) {
            tile = cavernRockTile;
            border = { dark: '#32261E', mid: '#5C4A3C', hi: '#8A725E' };
        } else {
            const cycle = k % 4;
            if (cycle === 0) { tile = dugEarthTile; border = { dark: '#2E2216', mid: '#5A442C', hi: '#846844' }; }
            else if (cycle === 1) { tile = clayBedTile; border = { dark: '#422414', mid: '#784628', hi: '#AA683C' }; }
            else if (cycle === 2) { tile = flagstoneTile; border = { dark: '#262D38', mid: '#4E5B6E', hi: '#7C8FA8' }; }
            else { tile = cavernRockTile; border = { dark: '#32261E', mid: '#5C4A3C', hi: '#8A725E' }; }
        }

        const block = buildA2FloorBlock(tile, border);
        const bx = col * 96;
        const by = row * 144;

        for (let y = 0; y < 144; y++) {
            for (let x = 0; x < 96; x++) {
                const srcI = (y * 96 + x) * 4;
                const dstI = ((by + y) * A2_W + (bx + x)) * 4;
                dungeonA2[dstI] = block[srcI];
                dungeonA2[dstI + 1] = block[srcI + 1];
                dungeonA2[dstI + 2] = block[srcI + 2];
                dungeonA2[dstI + 3] = 255;
            }
        }
    }
}

quantizeToMaxColors(dungeonA2, 48);

writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A2.png'), A2_W, A2_H, dungeonA2);
writePNG(path.join(ROOT, 'art', 'masters', 'Dungeon_A2.png'), A2_W, A2_H, dungeonA2);
console.log('Successfully wrote Dungeon_A2.png and master.');

// --- A1 ANIMATED WATER ASSEMBLY ---
const A1_W = 768, A1_H = 576;
const fullA1 = Buffer.alloc(A1_W * A1_H * 4);

// Initialize with deep ocean
for (let i = 0; i < fullA1.length; i += 4) {
    fullA1[i] = 0; fullA1[i + 1] = 24; fullA1[i + 2] = 80; fullA1[i + 3] = 255;
}

const WATER_KINDS = [
    { id: "fresh", name: "Fresh Water", slot: [0, 0], ramp: { foam: "#C8FFFF", crest: "#7DFFFF", shallows: "#3DBBFF", deep: "#00206D" } },
    { id: "pond", name: "Pond Water", slot: [0, 144], ramp: { foam: "#C8F8FF", crest: "#6AD8FF", shallows: "#30A0E8", deep: "#001858" } },
    { id: "marsh", name: "Marsh Water", slot: [288, 0], tint: [100, 130, 60], ramp: { foam: "#E8F8C8", crest: "#B0D878", shallows: "#689840", deep: "#283818" } },
    { id: "swamp", name: "Swamp Water", slot: [288, 144], tint: [90, 75, 55], ramp: { foam: "#E0D0B0", crest: "#A89068", shallows: "#605038", deep: "#201810" } },
    { id: "icy", name: "Icy Water", slot: [384, 0], ramp: { foam: "#FFFFFF", crest: "#E0F8FF", shallows: "#A8CEFF", deep: "#183070" } },
    { id: "brackish", name: "Brackish Water", slot: [0, 288], tint: [80, 120, 140], ramp: { foam: "#E0FFFF", crest: "#88D0E8", shallows: "#4088B0", deep: "#183850" } },
    { id: "salt", name: "Salt Water", slot: [0, 432], ramp: { foam: "#FFFFFF", crest: "#80FFFF", shallows: "#20A0FF", deep: "#002888" } },
    { id: "deep", name: "Deep Ocean", slot: [384, 288], ramp: { foam: "#B0E8FF", crest: "#4098E0", shallows: "#1860B8", deep: "#001048" } },
    { id: "blighted", name: "Blighted Water", slot: [384, 432], tint: [140, 40, 140], ramp: { foam: "#FFD0FF", crest: "#D060D0", shallows: "#882088", deep: "#300030" } }
];

for (const k of WATER_KINDS) {
    const strip = buildWaterStrip(k);
    const ox = k.slot[0];
    const oy = k.slot[1];

    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 288; x++) {
            if (ox + x >= A1_W || oy + y >= A1_H) continue;
            const si = (y * 288 + x) * 4;
            const di = ((oy + y) * A1_W + (ox + x)) * 4;
            fullA1[di] = strip[si];
            fullA1[di + 1] = strip[si + 1];
            fullA1[di + 2] = strip[si + 2];
            fullA1[di + 3] = 255;
        }
    }
}

quantizeToMaxColors(fullA1, 48);

writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'UF_GenWater_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'art', 'masters', 'UF_GenWater_A1.png'), A1_W, A1_H, fullA1);
console.log('Successfully wrote Outside_A1.png, Dungeon_A1.png, UF_GenWater_A1.png, and masters.');

console.log('=== All Nano Banana II Tilesets Built Successfully ===');
