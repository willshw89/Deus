const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load palette
const paletteLines = fs.readFileSync(PALETTE_FILE, 'utf8').trim().split(/\r?\n/);
const PALETTE = paletteLines.map(line => {
    const hex = line.trim().replace('#', '');
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
    ];
});

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

const palLab = PALETTE.map(c => srgbToLab(...c));
function snap(r, g, b) {
    const l = srgbToLab(r, g, b);
    let best = PALETTE[0], bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        const d = labDist(l, palLab[i]);
        if (d < bd) { bd = d; best = PALETTE[i]; }
    }
    return best;
}

// Cohesive palette colors
const cInk         = snap(12, 10, 8);
const cBackdrop    = snap(14, 18, 42); // Deep U7 midnight navy backdrop
const cBackdropDark= snap(8, 10, 26);  // Deepest shadow

// Brass/Gold colors
const cGoldDark    = snap(120, 85, 20);
const cGoldMid     = snap(175, 130, 35);
const cGoldLit     = snap(225, 185, 55);
const cGoldGleam   = snap(255, 240, 130);

// Oak wood colors
const cBarkDark    = snap(42, 28, 16);
const cBarkMid     = snap(70, 46, 24);
const cBarkLit     = snap(105, 72, 38);

// Nature green leaves
const cLeafDark    = snap(35, 65, 25);
const cLeafMid     = snap(60, 115, 45);
const cLeafLit     = snap(95, 165, 65);

// Stone grey colors
const cStoneDark   = snap(45, 45, 48);
const cStoneMid    = snap(75, 75, 80);
const cStoneLit    = snap(115, 115, 120);

// Bone/horn color
const cBoneLit     = snap(240, 235, 220);
const cBoneDark    = snap(180, 170, 150);

// NATIVE RESOLUTION: 48x48 per face frame (scaled 3x to 144x144)
const FW = 48, FH = 48;

// Frame 0: Classic U7 Oval Brass Locket (48x48 native)
function createOvalBrassNative() {
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, cy = 23.5;
    const outerRx = 19.5, outerRy = 22.5;
    const innerRx = 16.0, innerRy = 19.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const outerD = Math.hypot(dx / outerRx, dy / outerRy);
            const innerD = Math.hypot(dx / innerRx, dy / innerRy);

            if (innerD <= 1.0) {
                isInside[y][x] = true;
                const col = (y > 33) ? cBackdropDark : cBackdrop;
                frame[y][x] = [col[0], col[1], col[2], 255];
            } else if (outerD <= 1.0) {
                const angle = Math.atan2(dy, dx);
                const light = Math.cos(angle - (-Math.PI * 0.75));

                let c = cGoldMid;
                if (outerD >= 0.94) c = cInk;
                else if (outerD >= 0.85) c = (light > 0) ? cGoldGleam : cGoldLit;
                else if (outerD >= 0.70) c = (light > -0.2) ? cGoldLit : cGoldMid;
                else c = cGoldDark;

                frame[y][x] = [c[0], c[1], c[2], 255];
            }

            // Top clasp at y: 0..3
            if (Math.abs(dx) <= 3 && y <= 3) {
                let c = (y === 1 && Math.abs(dx) <= 1) ? cGoldGleam : (y === 0 ? cInk : cGoldLit);
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
            // Bottom clasp at y: 44..47
            if (Math.abs(dx) <= 3 && y >= 44) {
                let c = (y === 45 && Math.abs(dx) <= 1) ? cGoldGleam : (y === 47 ? cInk : cGoldLit);
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
            // Side studs at (4, 23) and (43, 23)
            if (Math.hypot(x - 4, y - 23.5) <= 1.8) {
                let c = (x === 4 && Math.round(y) === 23) ? cGoldGleam : cGoldLit;
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
            if (Math.hypot(x - 43, y - 23.5) <= 1.8) {
                let c = (x === 43 && Math.round(y) === 23) ? cGoldGleam : cGoldLit;
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
        }
    }
    return { frame, isInside };
}

// Frame 1: Natural Living Oak Border (48x48 native, V106)
function createLivingOakNative() {
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, cy = 23.5;
    const outerRx = 20.0, outerRy = 22.0;
    const innerRx = 16.0, innerRy = 18.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const outerD = Math.hypot(dx / outerRx, dy / outerRy);
            const innerD = Math.hypot(dx / innerRx, dy / innerRy);

            if (innerD <= 1.0) {
                isInside[y][x] = true;
                const col = (y > 33) ? cBackdropDark : cBackdrop;
                frame[y][x] = [col[0], col[1], col[2], 255];
            } else if (outerD <= 1.0) {
                const angle = Math.atan2(dy, dx);
                const light = Math.cos(angle - (-Math.PI * 0.75));

                let c = cBarkMid;
                if (outerD >= 0.94) c = cInk;
                else if (outerD >= 0.82) c = (light > 0) ? cBarkLit : cBarkMid;
                else c = cBarkDark;

                // Leaf foliage along crown
                if (y <= 12 || (y <= 24 && Math.abs(dx) >= 15)) {
                    const leaf = (x * 3 + y * 7) % 5;
                    if (leaf === 0) c = cLeafLit;
                    else if (leaf === 1 || leaf === 2) c = cLeafMid;
                    else if (leaf === 3) c = cLeafDark;
                }

                frame[y][x] = [c[0], c[1], c[2], 255];
            }

            // Root flares at bottom (y: 42..47)
            if (y >= 42) {
                if (Math.hypot(x - 6, y - 45) <= 3.0) {
                    let c = (x === 6 && y === 44) ? cBarkLit : cBarkMid;
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
                if (Math.hypot(x - 41, y - 45) <= 3.0) {
                    let c = (x === 41 && y === 44) ? cBarkLit : cBarkMid;
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            }
            // Canopy crest leaves at top (y: 0..5)
            if (y <= 5 && Math.abs(dx) <= 7) {
                let c = (y <= 2) ? cLeafLit : cLeafMid;
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
        }
    }
    return { frame, isInside };
}

// Frame 2: Carved Timber & Antler Horns Border (48x48 native)
function createAntlerTimberNative() {
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, cy = 24.5;
    const outerRx = 19.0, outerRy = 21.0;
    const innerRx = 15.5, innerRy = 17.5;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const outerD = Math.hypot(dx / outerRx, dy / outerRy);
            const innerD = Math.hypot(dx / innerRx, dy / innerRy);

            if (innerD <= 1.0) {
                isInside[y][x] = true;
                const col = (y > 35) ? cBackdropDark : cBackdrop;
                frame[y][x] = [col[0], col[1], col[2], 255];
            } else if (outerD <= 1.0) {
                let c = cBarkMid;
                if (outerD >= 0.94) c = cInk;
                else if (outerD >= 0.82) c = cBarkLit;
                else c = cBarkDark;

                if ((x + y) % 3 === 0) c = cBarkLit;
                frame[y][x] = [c[0], c[1], c[2], 255];
            }

            // Stag Antlers at top crest (y: 0..7)
            if (y <= 7 && Math.abs(dx) >= 3 && Math.abs(dx) <= 12) {
                const hornY = Math.round(2 + Math.pow((Math.abs(dx) - 7) / 3, 2));
                if (Math.abs(y - hornY) <= 1) {
                    let c = (y <= 2) ? cBoneLit : cBoneDark;
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            }
        }
    }
    return { frame, isInside };
}

// Frame 3: Classical Romanesque Stone Arch (48x48 native)
function createStoneArchNative() {
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5;
    const archCy = 21.0;
    const archOuterR = 19.0, archInnerR = 15.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx;

            if (y <= archCy) {
                const r = Math.hypot(dx, y - archCy);
                if (r <= archInnerR) {
                    isInside[y][x] = true;
                    frame[y][x] = [cBackdrop[0], cBackdrop[1], cBackdrop[2], 255];
                } else if (r <= archOuterR) {
                    let c = (r >= archOuterR - 0.8) ? cInk : (r >= archOuterR - 2.5 ? cStoneLit : cStoneMid);
                    if (Math.abs(dx) <= 2 && y <= 6) c = cStoneLit; // Keystone
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            } else {
                if (Math.abs(dx) < archInnerR && y < 44) {
                    isInside[y][x] = true;
                    const col = (y > 35) ? cBackdropDark : cBackdrop;
                    frame[y][x] = [col[0], col[1], col[2], 255];
                } else if (Math.abs(dx) >= archInnerR && Math.abs(dx) <= archOuterR && y < 44) {
                    const isLeft = (dx < 0);
                    let c = isLeft ? (dx === -Math.round(archOuterR) ? cInk : cStoneLit) : (dx === Math.round(archOuterR) ? cInk : cStoneDark);
                    frame[y][x] = [c[0], c[1], c[2], 255];
                } else if (Math.abs(dx) <= archOuterR + 1 && y >= 44 && y <= 46) {
                    let c = (y === 44) ? cStoneLit : (y === 46 ? cInk : cStoneMid);
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            }
        }
    }
    return { frame, isInside };
}

// Composite raw bust sheet (384x288, 3x scaled 32x32 busts) into 576x288 faceset (3x scaled 48x48)
function compositeFacesetNative(rawBustSheetPath, outFacesetPath, masterReviewPath) {
    const rawBuf = fs.readFileSync(rawBustSheetPath);
    const rawImg = decodePNG(rawBuf, path.basename(rawBustSheetPath));
    console.log(`Processing ${path.basename(rawBustSheetPath)}: ${rawImg.width}x${rawImg.height}`);

    // Downsample raw 384x288 (3x) to native 128x96 (4 cols x 3 rows of 32x32)
    const nativeBustW = 32, nativeBustH = 32;
    const nativeBusts = Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => 
        Array.from({ length: nativeBustH }, () => Array.from({ length: nativeBustW }, () => [0, 0, 0, 0]))
    ));

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            for (let by = 0; by < nativeBustH; by++) {
                for (let bx = 0; bx < nativeBustW; bx++) {
                    // Inspect the 3x3 block from raw image
                    let bestR = 0, bestG = 0, bestB = 0, bestA = 0;
                    let foundFeature = false;

                    let skinSumR = 0, skinSumG = 0, skinSumB = 0, skinCount = 0;

                    for (let dy = 0; dy < 3; dy++) {
                        for (let dx = 0; dx < 3; dx++) {
                            const sx = (c * nativeBustW + bx) * 3 + dx;
                            const sy = (r * nativeBustH + by) * 3 + dy;
                            const sidx = (sy * rawImg.width + sx) * 4;
                            const br = rawImg.data[sidx];
                            const bg = rawImg.data[sidx + 1];
                            const bb = rawImg.data[sidx + 2];
                            const ba = rawImg.data[sidx + 3];

                            const isBg = (br >= 25 && br <= 60 && bg >= 25 && bg <= 60 && bb >= 25 && bb <= 60);
                            if (ba === 0 || isBg) continue;

                            // Check if dark line/contour/pupil (high visual importance)
                            const lum = 0.299 * br + 0.587 * bg + 0.114 * bb;
                            if (lum < 45 && !foundFeature) {
                                bestR = br; bestG = bg; bestB = bb; bestA = 255;
                                foundFeature = true;
                            } else if (!foundFeature) {
                                skinSumR += br; skinSumG += bg; skinSumB += bb;
                                skinCount++;
                            }
                        }
                    }

                    if (foundFeature) {
                        const s = snap(bestR, bestG, bestB);
                        nativeBusts[r][c][by][bx] = [s[0], s[1], s[2], 255];
                    } else if (skinCount > 0) {
                        const avgR = Math.round(skinSumR / skinCount);
                        const avgG = Math.round(skinSumG / skinCount);
                        const avgB = Math.round(skinSumB / skinCount);
                        const s = snap(avgR, avgG, avgB);
                        nativeBusts[r][c][by][bx] = [s[0], s[1], s[2], 255];
                    }
                }
            }
        }
    }

    // 4 Native frames (48x48)
    const frames = [
        createOvalBrassNative(),
        createLivingOakNative(),
        createAntlerTimberNative(),
        createStoneArchNative()
    ];

    // Native output canvas: 4 cols x 2 rows of 48x48 = 192x96
    const NW = 192, NH = 96;
    const nativeCanvas = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
            const { frame, isInside } = frames[c];
            const bust = nativeBusts[r][c];

            // Offset 32x32 bust inside 48x48 frame
            // Centered horizontally: (48 - 32) / 2 = 8
            // Centered vertically towards bottom: yOffset = 9
            const offX = 8, offY = 9;

            for (let y = 0; y < FH; y++) {
                for (let x = 0; x < FW; x++) {
                    const canvasX = c * FW + x;
                    const canvasY = r * FH + y;

                    // 1. Draw frame
                    const fp = frame[y][x];
                    if (fp[3] > 0) {
                        nativeCanvas[canvasY][canvasX] = [fp[0], fp[1], fp[2], fp[3]];
                    }

                    // 2. Draw bust inside aperture
                    if (isInside[y][x]) {
                        const bx = x - offX;
                        const by = y - offY;
                        if (bx >= 0 && bx < nativeBustW && by >= 0 && by < nativeBustH) {
                            const bp = bust[by][bx];
                            if (bp[3] > 0) {
                                nativeCanvas[canvasY][canvasX] = [bp[0], bp[1], bp[2], 255];
                            }
                        }
                    }
                }
            }
        }
    }

    // UPSCALE 3X to 576x288
    const sheetW = 576, sheetH = 288;
    const outBuf = Buffer.alloc(sheetW * sheetH * 4, 0);

    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            const pixel = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const px = nx * 3 + dx;
                    const py = ny * 3 + dy;
                    const didx = (py * sheetW + px) * 4;
                    outBuf[didx] = pixel[0];
                    outBuf[didx + 1] = pixel[1];
                    outBuf[didx + 2] = pixel[2];
                    outBuf[didx + 3] = pixel[3];
                }
            }
        }
    }

    // Quantize to max 31 colors
    const colorCounts = new Map();
    for (let i = 0; i < outBuf.length; i += 4) {
        if (outBuf[i + 3] === 0) continue;
        const k = (outBuf[i] << 16) | (outBuf[i + 1] << 8) | outBuf[i + 2];
        colorCounts.set(k, (colorCounts.get(k) || 0) + 1);
    }
    console.log(`Faceset colors: ${colorCounts.size}`);

    if (colorCounts.size > 31) {
        const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
        const topKeys = sorted.slice(0, 30).map(e => e[0]);
        const topRgb = topKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
        const topLab = topRgb.map(c => srgbToLab(...c));

        const remap = new Map();
        for (let i = 30; i < sorted.length; i++) {
            const k = sorted[i][0];
            const rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
            const lab = srgbToLab(...rgb);
            let best = topRgb[0], bd = Infinity;
            for (let j = 0; j < topLab.length; j++) {
                const d = labDist(lab, topLab[j]);
                if (d < bd) { bd = d; best = topRgb[j]; }
            }
            remap.set(k, best);
        }

        for (let i = 0; i < outBuf.length; i += 4) {
            if (outBuf[i + 3] === 0) continue;
            const k = (outBuf[i] << 16) | (outBuf[i + 1] << 8) | outBuf[i + 2];
            if (remap.has(k)) {
                const rep = remap.get(k);
                outBuf[i] = rep[0];
                outBuf[i + 1] = rep[1];
                outBuf[i + 2] = rep[2];
            }
        }
    }

    const finalColors = new Set();
    for (let i = 0; i < outBuf.length; i += 4) {
        if (outBuf[i + 3] === 255) {
            finalColors.add((outBuf[i] << 16) | (outBuf[i + 1] << 8) | outBuf[i + 2]);
        }
    }
    console.log(`Final Faceset colors: ${finalColors.size} (Limit 32)`);

    writePNG(outFacesetPath, sheetW, sheetH, outBuf);

    // Review image (2x zoom)
    const revW = sheetW * 2, revH = sheetH * 2;
    const revBuf = Buffer.alloc(revW * revH * 4, 0);
    for (let i = 0; i < revBuf.length; i += 4) {
        revBuf[i] = 18; revBuf[i + 1] = 20; revBuf[i + 2] = 24; revBuf[i + 3] = 255;
    }
    for (let y = 0; y < sheetH; y++) {
        for (let x = 0; x < sheetW; x++) {
            const sidx = (y * sheetW + x) * 4;
            const sa = outBuf[sidx + 3];
            if (sa === 0) continue;
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const didx = ((y * 2 + dy) * revW + (x * 2 + dx)) * 4;
                    revBuf[didx] = outBuf[sidx];
                    revBuf[didx + 1] = outBuf[sidx + 1];
                    revBuf[didx + 2] = outBuf[sidx + 2];
                    revBuf[didx + 3] = 255;
                }
            }
        }
    }
    writePNG(masterReviewPath, revW, revH, revBuf);
    console.log(`Saved faceset to: ${outFacesetPath}`);
    console.log(`Saved review to: ${masterReviewPath}`);
}

compositeFacesetNative(
    path.join(ROOT, 'art', 'raw', 'face_human_male_adult.png'),
    path.join(ROOT, 'game', 'img', 'faces', 'UF_Faces_Human_Male_Adult.png'),
    path.join(ROOT, 'art', 'review', 'u7_facesets_review_2x.png')
);

compositeFacesetNative(
    path.join(ROOT, 'art', 'raw', 'face_human_female_adult.png'),
    path.join(ROOT, 'game', 'img', 'faces', 'UF_Faces_Human_Female_Adult.png'),
    path.join(ROOT, 'art', 'review', 'u7_female_faceset_review_2x.png')
);

if (fs.existsSync(path.join(ROOT, 'art', 'raw', 'face_human_male_elder.png'))) {
    compositeFacesetNative(
        path.join(ROOT, 'art', 'raw', 'face_human_male_elder.png'),
        path.join(ROOT, 'game', 'img', 'faces', 'UF_Faces_Human_Male_Elder.png'),
        path.join(ROOT, 'art', 'review', 'u7_male_elder_faceset_review_2x.png')
    );
}

if (fs.existsSync(path.join(ROOT, 'art', 'raw', 'face_human_female_elder.png'))) {
    compositeFacesetNative(
        path.join(ROOT, 'art', 'raw', 'face_human_female_elder.png'),
        path.join(ROOT, 'game', 'img', 'faces', 'UF_Faces_Human_Female_Elder.png'),
        path.join(ROOT, 'art', 'review', 'u7_female_elder_faceset_review_2x.png')
    );
}
