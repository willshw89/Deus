const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// CIELAB Palette Snapping
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

function isBgPixel(r, g, b) {
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 130 && g < 70 && b > 130) return true;
    if (r > 180 && g < 120 && b > 180) return true;
    if (r > 20 && b > 20 && (r + b) > 2 * g + 20) return true;
    if (r > 15 && b > 15 && r > g + 10 && b > g + 10) return true;
    return false;
}

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch (e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

function processFacing(img, name, options = {}) {
    const cropX = options.cropX !== undefined ? options.cropX : 0;
    const cropY = options.cropY !== undefined ? options.cropY : 0;
    const cropW = options.cropW !== undefined ? options.cropW : img.width;
    const cropH = options.cropH !== undefined ? options.cropH : img.height;

    let minX = cropX + cropW, maxX = cropX, minY = cropY + cropH, maxY = cropY;
    for (let y = cropY; y < cropY + cropH; y++) {
        for (let x = cropX; x < cropX + cropW; x++) {
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

    const targetH = options.targetH || 32;
    const scale = targetH / bboxH;
    const outW = Math.round(bboxW * scale);
    const outH = targetH;

    const out48 = Buffer.alloc(48 * 48 * 4);
    const offsetX = options.offsetX !== undefined ? options.offsetX : Math.floor((48 - outW) / 2);
    const groundY = options.groundY !== undefined ? options.groundY : 47;
    const offsetY = groundY - outH + 1;

    for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
            const srcX = minX + Math.floor(x / scale);
            const srcY = minY + Math.floor(y / scale);
            if (srcX >= img.width || srcY >= img.height) continue;

            const sidx = (srcY * img.width + srcX) * 4;
            const sr = img.data[sidx];
            const sg = img.data[sidx + 1];
            const sb = img.data[sidx + 2];

            const outX = offsetX + x;
            const outY = offsetY + y;
            if (outX < 0 || outX >= 48 || outY < 0 || outY >= 48) continue;

            const outIdx = (outY * 48 + outX) * 4;
            if (!isBgPixel(sr, sg, sb)) {
                const snapped = pal.snap(sr, sg, sb);
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

function setPx(buf, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= 48 || y < 0 || y >= 48) return;
    const idx = (y * 48 + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
}

// 1. Idle (breathing & alertness)
function buildIdleFrames(baseBuf, facingIdx, landmarks) {
    const f0 = Buffer.from(baseBuf);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);
    const { topY, torsoY } = landmarks;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (baseBuf[idx + 3] === 0) continue;
            const r = baseBuf[idx], g = baseBuf[idx + 1], b = baseBuf[idx + 2];

            // F1: gentle breath rise (move torso up 1px, seamless seam)
            if (y >= topY && y <= torsoY) {
                setPx(f1, x, y - 1, r, g, b);
                if (y === torsoY) setPx(f1, x, torsoY, r, g, b);
            } else {
                setPx(f1, x, y, r, g, b);
            }

            // F2: ear/snout twitch / alertness
            if (y < topY + 8) {
                setPx(f2, x + ((x > 24) ? 1 : -1), y, r, g, b);
            } else {
                setPx(f2, x, y, r, g, b);
            }
        }
    }
    return [f0, f1, f2];
}

// 2. Walk / Hop gait cycle
function buildWalkFrames(baseBuf, facingIdx, landmarks) {
    const fPass = Buffer.from(baseBuf);
    const fStep1 = Buffer.alloc(48 * 48 * 4);
    const fStep2 = Buffer.alloc(48 * 48 * 4);
    const { legY } = landmarks;

    const isSide = (facingIdx === 2 || facingIdx === 6);
    const isEast = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    const dirSign = isEast ? 1 : -1;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            if (y < legY) {
                setPx(fStep1, x, y, r, g, b);
                setPx(fStep2, x, y, r, g, b);
            } else {
                if (isSide) {
                    const isFore = isEast ? (x >= 25) : (x <= 23);
                    if (isFore) {
                        setPx(fStep1, x + dirSign * 2, y - 1, r, g, b);
                        setPx(fStep2, x - dirSign * 1, y, r, g, b);
                    } else {
                        setPx(fStep1, x - dirSign * 2, y, r, g, b);
                        setPx(fStep2, x + dirSign * 2, y - 1, r, g, b);
                    }
                } else {
                    if (x < 24) {
                        setPx(fStep1, x, y - 1, r, g, b);
                        setPx(fStep2, x, y, r, g, b);
                    } else {
                        setPx(fStep1, x, y, r, g, b);
                        setPx(fStep2, x, y - 1, r, g, b);
                    }
                }
            }
        }
    }
    return [fStep1, fPass, fStep2];
}

// 3. Action (3 frames manipulating environment with hands/paws)
function buildActionFrames(baseBuf, facingIdx, landmarks) {
    const fReach = Buffer.alloc(48 * 48 * 4);
    const fManip = Buffer.alloc(48 * 48 * 4);
    const fReturn = Buffer.alloc(48 * 48 * 4);
    const { legY } = landmarks;

    const isSide = (facingIdx === 2 || facingIdx === 6);
    const isEast = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    const isNorth = (facingIdx === 3 || facingIdx === 4 || facingIdx === 5);
    const dirX = isEast ? 2 : (facingIdx === 2 ? -2 : 0);

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            // Only animate the front forepaws/hands area
            const isForelimb = isSide ? (isEast ? (x >= 24) : (x <= 24)) : (y >= legY && Math.abs(x - 24) <= 6);

            if (isForelimb && y >= legY - 2) {
                // Frame 0: Paws lift and reach forward toward ground/item
                setPx(fReach, x + dirX, y - 1, r, g, b);
                // Frame 1: Paws scratch/manipulate down and forward
                setPx(fManip, x + dirX * 2, y, r, g, b);
                // Frame 2: Paws pull back toward chest
                setPx(fReturn, x - Math.round(dirX * 0.5), y - 1, r, g, b);
            } else {
                // Main body, head, and hind haunches remain stable
                setPx(fReach, x, y, r, g, b);
                setPx(fManip, x, y, r, g, b);
                setPx(fReturn, x, y, r, g, b);
            }
        }
    }
    return [fReach, fManip, fReturn];
}

// 4. Attack (3 frames: windup, strike/lunge, recovery)
function buildAttackFrames(baseBuf, facingIdx) {
    const fWind = Buffer.alloc(48 * 48 * 4);
    const fStrike = Buffer.alloc(48 * 48 * 4);
    const fRecov = Buffer.alloc(48 * 48 * 4);

    const isEast = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    const isNorth = (facingIdx === 3 || facingIdx === 4 || facingIdx === 5);
    const dirSign = isEast ? 1 : -1;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            // Wind-up: crouch back 1-2px
            const wx = x - (isEast ? 2 : (facingIdx === 2 ? -2 : 0));
            const wy = Math.min(47, y + 1);
            setPx(fWind, wx, wy, r, g, b);

            // Strike: aggressive lunge forward 3px
            const sx = x + (isEast ? 3 : (facingIdx === 2 ? -3 : 0));
            const sy = isNorth ? Math.max(0, y - 3) : Math.min(47, y + 2);
            setPx(fStrike, sx, sy, r, g, b);

            // Recovery: returning to stance
            setPx(fRecov, x, y, r, g, b);
        }
    }
    return [fWind, fStrike, fRecov];
}

// 5. Graze / Eat (3 frames: head lower, earth rooting/nibbling, chewing)
function buildGrazeFrames(baseBuf, facingIdx, headY = 34) {
    const fLower = Buffer.alloc(48 * 48 * 4);
    const fRoot = Buffer.alloc(48 * 48 * 4);
    const fLift = Buffer.alloc(48 * 48 * 4);

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            // Frame 0: head angled down
            if (y < headY) {
                setPx(fLower, x, Math.min(47, y + 2), r, g, b);
            } else {
                setPx(fLower, x, y, r, g, b);
            }

            // Frame 1: snout/mouth nibbling at ground contact
            if (y < headY) {
                setPx(fRoot, x, Math.min(47, y + 3), r, g, b);
            } else {
                setPx(fRoot, x, y, r, g, b);
            }

            // Frame 2: head lifted slightly, chewing
            if (y < headY) {
                setPx(fLift, x, Math.min(47, y + 1), r, g, b);
            } else {
                setPx(fLift, x, y, r, g, b);
            }
        }
    }
    return [fLower, fRoot, fLift];
}

// 6. Hurt (3 frames: impact recoil flinch, stumble, recovery)
function buildHurtFrames(baseBuf, facingIdx) {
    const fRecoil = Buffer.alloc(48 * 48 * 4);
    const fStumble = Buffer.alloc(48 * 48 * 4);
    const fRecov = Buffer.alloc(48 * 48 * 4);

    const isEast = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    const isNorth = (facingIdx === 3 || facingIdx === 4 || facingIdx === 5);
    const recoilX = isEast ? -3 : (facingIdx === 2 ? 3 : 0);
    const recoilY = isNorth ? 2 : -2;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            setPx(fRecoil, x + recoilX, Math.min(47, Math.max(0, y + recoilY)), r, g, b);
            setPx(fStumble, x + Math.round(recoilX * 0.5), Math.min(47, Math.max(0, y + Math.round(recoilY * 0.5))), r, g, b);
            setPx(fRecov, x, y, r, g, b);
        }
    }
    return [fRecoil, fStumble, fRecov];
}

// 7. Death (3 frames: buckle, collapse, fallen carcass)
function buildDeathFrames(baseBuf, facingIdx, carcassWest, carcassEast) {
    const fBuckle = Buffer.alloc(48 * 48 * 4);
    const fFall = Buffer.alloc(48 * 48 * 4);

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            setPx(fBuckle, x, Math.min(47, y + 3), r, g, b);
            setPx(fFall, x, Math.min(47, y + 6), r, g, b);
        }
    }

    const isEast = (facingIdx === 4 || facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    const fCarcass = isEast ? carcassEast : carcassWest;
    return [fBuckle, fFall, fCarcass];
}

function assembleSheet(grid, cols, rows, rawOutPath, masterOutPath, sidecarJson) {
    const cellW = 48, cellH = 48;
    const rawW = cellW * 4 * cols;
    const rawH = cellH * 4 * rows;
    const rawBuf = Buffer.alloc(rawW * rawH * 4);

    for (let i = 0; i < rawW * rawH; i++) {
        rawBuf[i * 4] = 255;
        rawBuf[i * 4 + 1] = 0;
        rawBuf[i * 4 + 2] = 255;
        rawBuf[i * 4 + 3] = 255;
    }

    const masterW = cellW * cols;
    const masterH = cellH * rows;
    const masterBuf = Buffer.alloc(masterW * masterH * 4);

    for (let r = 0; r < rows; r++) {
        const rowData = grid[r];
        for (let c = 0; c < cols; c++) {
            const fBuf = Array.isArray(rowData) ? rowData[c] : rowData;
            for (let y = 0; y < cellH; y++) {
                for (let x = 0; x < cellW; x++) {
                    const sidx = (y * cellW + x) * 4;
                    if (fBuf[sidx + 3] > 0) {
                        const pr = fBuf[sidx], pg = fBuf[sidx + 1], pb = fBuf[sidx + 2];

                        const midx = ((r * cellH + y) * masterW + (c * cellW + x)) * 4;
                        masterBuf[midx] = pr;
                        masterBuf[midx + 1] = pg;
                        masterBuf[midx + 2] = pb;
                        masterBuf[midx + 3] = 255;

                        const rawCellX = c * 192;
                        const rawCellY = r * 192;
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const ridx = ((rawCellY + y * 4 + dy) * rawW + (rawCellX + x * 4 + dx)) * 4;
                                rawBuf[ridx] = pr;
                                rawBuf[ridx + 1] = pg;
                                rawBuf[ridx + 2] = pb;
                                rawBuf[ridx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(rawOutPath, rawW, rawH, rawBuf);
    writePNG(masterOutPath, masterW, masterH, masterBuf);
    fs.writeFileSync(masterOutPath.replace(/\.png$/, '.json'), JSON.stringify(sidecarJson, null, 2) + '\n');
}

function reducePalette(buf, maxColors = 31) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topKeys = sorted.slice(0, maxColors).map(e => e[0]);
    const topRgb = topKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topRgb.map(c => srgbToLab(...c));

    const map = new Map();
    for (let i = maxColors; i < sorted.length; i++) {
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

// Master execution pipeline
async function processCreature(config) {
    const {
        species,
        className,
        targetH,
        sourceImages, // { south, profile, north, southwest, northwest, death }
        options = {}
    } = config;

    console.log(`=== Processing Creature: ${species} (Height: ${targetH}px) ===`);

    const southImg = loadJpg(sourceImages.south);
    const profileImg = loadJpg(sourceImages.profile);
    const northImg = loadJpg(sourceImages.north);
    const swImg = loadJpg(sourceImages.southwest);
    const nwImg = loadJpg(sourceImages.northwest);

    const baseSouth = processFacing(southImg, 'South', { targetH, ...options.south });
    const baseWest = processFacing(profileImg, 'West', { targetH, ...options.profile });
    const baseNorth = processFacing(northImg, 'North', { targetH, ...options.north });
    const baseSouthWest = processFacing(swImg, 'SouthWest', { targetH, ...options.southwest });
    const baseNorthWest = processFacing(nwImg, 'NorthWest', { targetH, ...options.northwest });

    const baseNorthEast = mirrorFrame(baseNorthWest);
    const baseEast = mirrorFrame(baseWest);
    const baseSouthEast = mirrorFrame(baseSouthWest);

    const baseFacings = [
        baseSouth,      // 0: S
        baseSouthWest,  // 1: SW
        baseWest,       // 2: W
        baseNorthWest,  // 3: NW
        baseNorth,      // 4: N
        baseNorthEast,  // 5: NE
        baseEast,       // 6: E
        baseSouthEast   // 7: SE
    ];
    const facings8 = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];

    let carcassWest;
    if (sourceImages.death) {
        const deathImg = loadJpg(sourceImages.death);
        carcassWest = processFacing(deathImg, 'CarcassWest', { targetH: Math.round(targetH * 0.65), groundY: 47, ...options.death });
    } else {
        // Synthesize fallen carcass from side view
        carcassWest = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * 48 + x) * 4;
                if (baseWest[sidx + 3] > 0) {
                    setPx(carcassWest, x, Math.min(47, y + 8), baseWest[sidx], baseWest[sidx + 1], baseWest[sidx + 2]);
                }
            }
        }
    }
    const carcassEast = mirrorFrame(carcassWest);

    console.log(`Synthesizing all 7 animation suites across 8 directions...`);
    const topY = 47 - targetH + 1;
    const torsoY = Math.round(topY + targetH * 0.55);
    const pawY = Math.round(topY + targetH * 0.72);
    const pawRadius = Math.max(2, Math.round(targetH * 0.12));
    const legY = Math.round(topY + targetH * 0.75);
    const headY = Math.round(topY + targetH * 0.50);
    const landmarks = { topY, torsoY, pawY, pawRadius, legY, headY };

    const idleGrid = [];
    const walkGrid = [];
    const actionGrid = [];
    const attackGrid = [];
    const grazeGrid = [];
    const hurtGrid = [];
    const deathGrid = [];

    for (let f = 0; f < 8; f++) {
        const b = baseFacings[f];
        idleGrid.push(buildIdleFrames(b, f, landmarks));
        walkGrid.push(buildWalkFrames(b, f, landmarks));
        actionGrid.push(buildActionFrames(b, f, landmarks));
        attackGrid.push(buildAttackFrames(b, f));
        grazeGrid.push(buildGrazeFrames(b, f, headY));
        hurtGrid.push(buildHurtFrames(b, f));
        deathGrid.push(buildDeathFrames(b, f, carcassWest, carcassEast));
    }

    // Deliver 7 Action Masters (3 cols x 8 rows)
    const actions = [
        { name: 'idle', grid: idleGrid, anims: { idle: [0, 1, 2, 1], stand: [1] }, frameMs: 200 },
        { name: 'walk', grid: walkGrid, anims: { walk: [0, 1, 2, 1], run: [0, 1, 2, 1] }, frameMs: 150 },
        { name: 'action', grid: actionGrid, anims: { action: [0, 1, 2, 1], work: [0, 1, 2, 1] }, frameMs: 150 },
        { name: 'attack', grid: attackGrid, anims: { attack: [0, 1, 2] }, frameMs: 150 },
        { name: 'graze', grid: grazeGrid, anims: { graze: [0, 1, 2, 1], eat: [0, 1, 2, 1] }, frameMs: 200 },
        { name: 'hurt', grid: hurtGrid, anims: { hurt: [0, 1, 2] }, frameMs: 150 },
        { name: 'death', grid: deathGrid, anims: { death: [0, 1, 2] }, frameMs: 250 }
    ];

    for (const act of actions) {
        assembleSheet(act.grid, 3, 8,
            path.join(ROOT, 'art', 'raw', `${species}_${act.name}.png`),
            path.join(ROOT, 'art', 'masters', `${species}_${act.name}.png`),
            { id: `${species}_${act.name}`, species, frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: facings8, animations: act.anims, frameMs: act.frameMs, layer: "body", category: "wildlife" }
        );
    }

    // Consolidated AR-600 Master (20 cols x 8 rows)
    console.log(`Assembling AR-600 20-col x 8-row master: art/masters/${species}_master_8way.png...`);
    const ar600Buf = Buffer.alloc(48 * 20 * 48 * 8 * 4);
    const ar600W = 48 * 20;

    for (let r = 0; r < 8; r++) {
        const colMap = [
            walkGrid[r][1],     // 0: stand
            walkGrid[r][0],     // 1: walk 0
            walkGrid[r][1],     // 2: walk 1
            walkGrid[r][2],     // 3: walk 2
            actionGrid[r][0],   // 4: action 0
            actionGrid[r][1],   // 5: action 1
            actionGrid[r][2],   // 6: action 2
            walkGrid[r][1],     // 7: carry
            attackGrid[r][0],   // 8: attack 0
            attackGrid[r][1],   // 9: attack 1
            attackGrid[r][2],   // 10: attack 2
            grazeGrid[r][0],    // 11: eat 0
            grazeGrid[r][1],    // 12: eat 1
            grazeGrid[r][2],    // 13: eat 2
            hurtGrid[r][0],     // 14: hurt
            deathGrid[r][0],    // 15: death 0
            deathGrid[r][1],    // 16: death 1
            deathGrid[r][2],    // 17: death 2 (carcass)
            idleGrid[r][0],     // 18: idle 0
            idleGrid[r][1]      // 19: idle 1
        ];

        for (let c = 0; c < 20; c++) {
            const fBuf = colMap[c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (fBuf[sidx + 3] > 0) {
                        const didx = ((r * 48 + y) * ar600W + (c * 48 + x)) * 4;
                        ar600Buf[didx] = fBuf[sidx];
                        ar600Buf[didx + 1] = fBuf[sidx + 1];
                        ar600Buf[didx + 2] = fBuf[sidx + 2];
                        ar600Buf[didx + 3] = 255;
                    }
                }
            }
        }
    }

    const ar600Path = path.join(ROOT, 'art', 'masters', `${species}_master_8way.png`);
    writePNG(ar600Path, ar600W, 48 * 8, ar600Buf);
    fs.writeFileSync(ar600Path.replace(/\.png$/, '.json'), JSON.stringify({
        id: `${species}_master_8way`,
        species,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: facings8,
        animations: {
            stand: [0],
            walk: [1, 2, 3, 2],
            action: [4, 5, 6, 5],
            work: [4, 5, 6, 5],
            carry: [7],
            attack: [8, 9, 10],
            graze: [11, 12, 13, 12],
            eat: [11, 12, 13, 12],
            hurt: [14],
            death: [15, 16, 17],
            idle: [18, 19]
        },
        frameMs: 150,
        layer: "body",
        category: "wildlife"
    }, null, 2) + '\n');

    // 4-way Standard RMMZ Single-Character Sheet ($UF_<ClassName>.png)
    const rmmzW = 144, rmmzH = 192;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);
    const rmmzSrcRows = [0, 2, 6, 4]; // S, W, E, N

    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzSrcRows[r];
        const frames = walkGrid[srcRow];
        for (let col = 0; col < 3; col++) {
            const fBuf = frames[col];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (fBuf[sidx + 3] > 0) {
                        const didx = ((r * 48 + y) * rmmzW + (col * 48 + x)) * 4;
                        rmmzBuf[didx] = fBuf[sidx];
                        rmmzBuf[didx + 1] = fBuf[sidx + 1];
                        rmmzBuf[didx + 2] = fBuf[sidx + 2];
                        rmmzBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }
    reducePalette(rmmzBuf, 31);
    const rmmzPath = path.join(ROOT, 'game', 'img', 'characters', `$UF_${className}.png`);
    writePNG(rmmzPath, rmmzW, rmmzH, rmmzBuf);
    fs.writeFileSync(rmmzPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: `UF_${className}`,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1],
            idle: [0, 1, 2, 1],
            action: [0, 1, 2, 1],
            attack: [0, 1, 2],
            graze: [0, 1, 2, 1],
            eat: [0, 1, 2, 1],
            hurt: [0, 1, 2],
            death: [0, 1, 2]
        },
        frameMs: 150,
        category: "wildlife"
    }, null, 2) + '\n');

    // 8-way RMMZ Single-Character Sheet ($UF_<ClassName>_8D.png)
    const rmmz8W = 144, rmmz8H = 384;
    const rmmz8Buf = Buffer.alloc(rmmz8W * rmmz8H * 4);
    for (let r = 0; r < 8; r++) {
        const frames = walkGrid[r];
        for (let col = 0; col < 3; col++) {
            const fBuf = frames[col];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (fBuf[sidx + 3] > 0) {
                        const didx = ((r * 48 + y) * rmmz8W + (col * 48 + x)) * 4;
                        rmmz8Buf[didx] = fBuf[sidx];
                        rmmz8Buf[didx + 1] = fBuf[sidx + 1];
                        rmmz8Buf[didx + 2] = fBuf[sidx + 2];
                        rmmz8Buf[didx + 3] = 255;
                    }
                }
            }
        }
    }
    reducePalette(rmmz8Buf, 31);
    const rmmz8Path = path.join(ROOT, 'game', 'img', 'characters', `$UF_${className}_8D.png`);
    writePNG(rmmz8Path, rmmz8W, rmmz8H, rmmz8Buf);
    fs.writeFileSync(rmmz8Path.replace(/\.png$/, '.json'), JSON.stringify({
        id: `UF_${className}_8D`,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: facings8,
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1],
            idle: [0, 1, 2, 1],
            action: [0, 1, 2, 1],
            attack: [0, 1, 2],
            graze: [0, 1, 2, 1],
            eat: [0, 1, 2, 1],
            hurt: [0, 1, 2],
            death: [0, 1, 2]
        },
        frameMs: 150,
        category: "wildlife"
    }, null, 2) + '\n');

    // Carcass Ground Remains Sheet (!$UF_<ClassName>_Carcass.png)
    const carcassBuf = Buffer.alloc(144 * 192 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (carcassWest[sidx + 3] > 0) {
                const didx = (y * 144 + (48 + x)) * 4;
                carcassBuf[didx] = carcassWest[sidx];
                carcassBuf[didx + 1] = carcassWest[sidx + 1];
                carcassBuf[didx + 2] = carcassWest[sidx + 2];
                carcassBuf[didx + 3] = 255;
            }
        }
    }
    const carcassPath = path.join(ROOT, 'game', 'img', 'characters', `!$UF_${className}_Carcass.png`);
    writePNG(carcassPath, 144, 192, carcassBuf);
    fs.writeFileSync(carcassPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: `UF_${className}_Carcass`,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');

    // Render Review Showcase (4x)
    renderShowcase(species, {
        idle: idleGrid,
        walk: walkGrid,
        action: actionGrid,
        attack: attackGrid,
        graze: grazeGrid,
        hurt: hurtGrid,
        death: deathGrid
    });

    console.log(`[SUCCESS] Creature ${species} complete!`);
}

function renderShowcase(species, grids) {
    const showCols = [
        { name: 'idle', grid: grids.idle, col: 1 },
        { name: 'walk', grid: grids.walk, col: 2 },
        { name: 'action', grid: grids.action, col: 1 },
        { name: 'attack', grid: grids.attack, col: 1 },
        { name: 'graze', grid: grids.graze, col: 1 },
        { name: 'hurt', grid: grids.hurt, col: 0 },
        { name: 'death', grid: grids.death, col: 2 }
    ];

    const rows = [
        { name: 'South (Down)', r: 0 },
        { name: 'South-West', r: 1 },
        { name: 'West (Left)', r: 2 },
        { name: 'East (Right)', r: 6 },
        { name: 'North (Up)', r: 4 }
    ];

    const cellW = 48 * 4;
    const cellH = 48 * 4;
    const pad = 12;
    const totalW = showCols.length * (cellW + pad) + pad;
    const totalH = rows.length * (cellH + pad) + pad;

    const bg = Buffer.alloc(totalW * totalH * 4);
    for (let y = 0; y < totalH; y++) {
        for (let x = 0; x < totalW; x++) {
            const idx = (y * totalW + x) * 4;
            const d = ((x ^ y) & 3) === 0 ? 4 : 0;
            bg[idx] = 60 + d;
            bg[idx + 1] = 108 + d;
            bg[idx + 2] = 56 + d;
            bg[idx + 3] = 255;
        }
    }

    for (let r = 0; r < rows.length; r++) {
        const rowInfo = rows[r];
        for (let c = 0; c < showCols.length; c++) {
            const act = showCols[c];
            const frameBuf = act.grid[rowInfo.r][act.col];
            const dx = pad + c * (cellW + pad);
            const dy = pad + r * (cellH + pad);

            // Ground shadow
            for (let sy = 40; sy < 46; sy++) {
                for (let sx = 14; sx < 34; sx++) {
                    const shadowDist = Math.hypot((sx - 24) / 10, (sy - 43) / 3.0);
                    if (shadowDist <= 1.0) {
                        for (let sdy = 0; sdy < 4; sdy++) {
                            const ty = dy + sy * 4 + sdy;
                            for (let sdx = 0; sdx < 4; sdx++) {
                                const tx = dx + sx * 4 + sdx;
                                const sidx = (ty * totalW + tx) * 4;
                                bg[sidx] = Math.floor(bg[sidx] * 0.65);
                                bg[sidx + 1] = Math.floor(bg[sidx + 1] * 0.65);
                                bg[sidx + 2] = Math.floor(bg[sidx + 2] * 0.65);
                            }
                        }
                    }
                }
            }

            // Blit nearest 4x
            for (let sy = 0; sy < 48; sy++) {
                for (let sx = 0; sx < 48; sx++) {
                    const sidx = (sy * 48 + sx) * 4;
                    if (frameBuf[sidx + 3] === 0) continue;
                    for (let dy2 = 0; dy2 < 4; dy2++) {
                        const ty = dy + sy * 4 + dy2;
                        for (let dx2 = 0; dx2 < 4; dx2++) {
                            const tx = dx + sx * 4 + dx2;
                            const didx = (ty * totalW + tx) * 4;
                            bg[didx] = frameBuf[sidx];
                            bg[didx + 1] = frameBuf[sidx + 1];
                            bg[didx + 2] = frameBuf[sidx + 2];
                            bg[didx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    const reviewPath = path.join(ROOT, 'art', 'review', `${species}_actions_showcase_4x.png`);
    writePNG(reviewPath, totalW, totalH, bg);
    console.log(`Saved review showcase: ${reviewPath}`);
}

module.exports = { processCreature };

// CLI support: if run directly with a json config file
if (require.main === module) {
    const configPath = process.argv[2];
    if (configPath) {
        const config = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf8'));
        processCreature(config).catch(console.error);
    }
}
