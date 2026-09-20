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
    console.log(`Facing ${name} BBox: ${bboxW}x${bboxH} at [${minX}, ${minY}] to [${maxX}, ${maxY}]`);

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

// Build 3 idle breathing frames (clean, no scanlines)
function buildIdleFrames(baseBuf, facingIdx) {
    const f0 = Buffer.from(baseBuf);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);

    // Frame 1: gentle 1px breathing rise in upper torso/spine
    // Frame 2: subtle ear/snout twitch or relax
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (baseBuf[idx + 3] === 0) continue;
            const r = baseBuf[idx], g = baseBuf[idx + 1], b = baseBuf[idx + 2];

            // F1: gentle breath rise (move whole upper torso y: 16..35 up by 1px, filling seam at 35)
            if (y >= 16 && y <= 35) {
                setPx(f1, x, y - 1, r, g, b);
                if (y === 35) {
                    setPx(f1, x, 35, r, g, b);
                }
            } else {
                setPx(f1, x, y, r, g, b);
            }

            // F2: return to neutral baseline
            setPx(f2, x, y, r, g, b);
        }
    }

    return [f0, f1, f2];
}

// Build 3 walk frames (Step 1, Pass/Stand, Step 2)
function buildWalkFrames(baseBuf, facingIdx) {
    const fPass = Buffer.from(baseBuf);
    const fStep1 = Buffer.alloc(48 * 48 * 4);
    const fStep2 = Buffer.alloc(48 * 48 * 4);

    const isSide = (facingIdx === 2 || facingIdx === 6);
    const isEast = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    const dirSign = isEast ? 1 : -1;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            if (y < 36) {
                // Torso & head remain continuous
                setPx(fStep1, x, y, r, g, b);
                setPx(fStep2, x, y, r, g, b);
            } else {
                // Legs (y >= 36)
                if (isSide) {
                    // Profile view: forelegs and hindlegs alternate stride
                    const isForeleg = isEast ? (x >= 25) : (x <= 23);
                    const isHindleg = isEast ? (x <= 22) : (x >= 26);
                    if (isForeleg) {
                        // Step 1: foreleg lifts forward; Step 2: foreleg steps back
                        setPx(fStep1, x + dirSign * 2, y - 1, r, g, b);
                        setPx(fStep2, x - dirSign * 1, y, r, g, b);
                    } else if (isHindleg) {
                        // Step 1: hindleg reaches back; Step 2: hindleg lifts forward
                        setPx(fStep1, x - dirSign * 2, y, r, g, b);
                        setPx(fStep2, x + dirSign * 2, y - 1, r, g, b);
                    } else {
                        setPx(fStep1, x, y, r, g, b);
                        setPx(fStep2, x, y, r, g, b);
                    }
                } else {
                    // Front / Back / Diagonals: alternate left and right hooves
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

// Build 3 combat/attack frames: Windup, Goring Lunge Strike, Recovery
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

            // Wind-up: crouch back 1-2px, head lowered
            const wx = x - (isEast ? 2 : (facingIdx === 2 ? -2 : 0));
            const wy = Math.min(47, y + 1);
            setPx(fWind, wx, wy, r, g, b);

            // Strike: aggressive lunge forward 3px, head thrust up/forward
            const sx = x + (isEast ? 3 : (facingIdx === 2 ? -3 : 0));
            const sy = isNorth ? Math.max(0, y - 3) : Math.min(47, y + 2);
            setPx(fStrike, sx, sy, r, g, b);

            // Recovery: returning to stance
            setPx(fRecov, x, y, r, g, b);
        }
    }

    return [fWind, fStrike, fRecov];
}

// Build 3 eating/graze frames: Lower head, root in ground, chew
function buildGrazeFrames(baseBuf, facingIdx) {
    const fLower = Buffer.alloc(48 * 48 * 4);
    const fRoot = Buffer.alloc(48 * 48 * 4);
    const fLift = Buffer.alloc(48 * 48 * 4);

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            // Frame 0: head angled down
            if (y < 34) {
                setPx(fLower, x, Math.min(47, y + 2), r, g, b);
            } else {
                setPx(fLower, x, y, r, g, b);
            }

            // Frame 1: snout rooting in earth (snout contact with row 47)
            if (y < 36) {
                setPx(fRoot, x, Math.min(47, y + 3), r, g, b);
            } else {
                setPx(fRoot, x, y, r, g, b);
            }

            // Frame 2: head lifted slightly, chewing
            if (y < 34) {
                setPx(fLift, x, Math.min(47, y + 1), r, g, b);
            } else {
                setPx(fLift, x, y, r, g, b);
            }
        }
    }

    return [fLower, fRoot, fLift];
}

// Build 3 hurt recoil frames: Impact flinch, Stumble, Recovery
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

            // Frame 0: sharp recoil flinch
            setPx(fRecoil, x + recoilX, Math.min(47, Math.max(0, y + recoilY)), r, g, b);
            // Frame 1: stumble recovery
            setPx(fStumble, x + Math.round(recoilX * 0.5), Math.min(47, Math.max(0, y + Math.round(recoilY * 0.5))), r, g, b);
            // Frame 2: recover to stance
            setPx(fRecov, x, y, r, g, b);
        }
    }

    return [fRecoil, fStumble, fRecov];
}

// Build 3 death collapse frames: Buckle, Fall, Carcass remains
function buildDeathFrames(baseBuf, facingIdx, carcassWest, carcassEast) {
    const fBuckle = Buffer.alloc(48 * 48 * 4);
    const fFall = Buffer.alloc(48 * 48 * 4);

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            // Buckle: sink 3px
            setPx(fBuckle, x, Math.min(47, y + 3), r, g, b);

            // Fall: sink 6px
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

    // Fill with magenta
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

                        // Master
                        const midx = ((r * cellH + y) * masterW + (c * cellW + x)) * 4;
                        masterBuf[midx] = pr;
                        masterBuf[midx + 1] = pg;
                        masterBuf[midx + 2] = pb;
                        masterBuf[midx + 3] = 255;

                        // Raw 4x
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
    console.log(`Saved master: ${masterOutPath} (${masterW}x${masterH})`);
}

async function run() {
    const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';

    console.log('Loading Nano Banana boar generations...');
    const southJpg = path.join(BRAIN, 'nb_boar_south_1789843675270.jpg');
    const profileJpg = path.join(BRAIN, 'nb_boar_profile_1789843829642.jpg');
    const northJpg = path.join(BRAIN, 'nb_boar_north_1789843886155.jpg');
    const swJpg = path.join(BRAIN, 'nb_boar_southwest_1789844075876.jpg');
    const nwJpg = path.join(BRAIN, 'nb_boar_northwest_1789844091092.jpg');
    const deathJpg = path.join(BRAIN, 'nb_boar_death_1789844012900.jpg');

    const baseSouth = processFacing(loadJpg(southJpg), 'South', { targetH: 34 });
    // Isolate ONLY the big central boar from the profile sheet (clean boundaries: y: 348..727, x: 168..849)
    const baseWest = processFacing(loadJpg(profileJpg), 'West', { cropX: 168, cropY: 348, cropW: 682, cropH: 380, targetH: 32 });
    const baseNorth = processFacing(loadJpg(northJpg), 'North', { targetH: 34 });
    const baseSouthWest = processFacing(loadJpg(swJpg), 'SouthWest', { targetH: 33 });
    const baseNorthWest = processFacing(loadJpg(nwJpg), 'NorthWest', { targetH: 33 });

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

    // Process dedicated dead carcass frame
    const carcassWest = processFacing(loadJpg(deathJpg), 'CarcassWest', { targetH: 22, groundY: 47 });
    const carcassEast = mirrorFrame(carcassWest);

    console.log('Synthesizing 8-way action suites...');
    const idleGrid = [];
    const walkGrid = [];
    const attackGrid = [];
    const grazeGrid = [];
    const hurtGrid = [];
    const deathGrid = [];

    for (let f = 0; f < 8; f++) {
        const base = baseFacings[f];
        idleGrid.push(buildIdleFrames(base, f));
        walkGrid.push(buildWalkFrames(base, f));
        attackGrid.push(buildAttackFrames(base, f));
        grazeGrid.push(buildGrazeFrames(base, f));
        hurtGrid.push(buildHurtFrames(base, f));
        deathGrid.push(buildDeathFrames(base, f, carcassWest, carcassEast));
    }

    // 1. boar_idle (3 cols x 8 rows)
    assembleSheet(idleGrid, 3, 8,
        path.join(ROOT, 'art', 'raw', 'boar_idle.png'),
        path.join(ROOT, 'art', 'masters', 'boar_idle.png'),
        { id: "boar_idle", species: "boar", frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: facings8, animations: { idle: [0, 1, 2, 1], stand: [1] }, frameMs: 200, layer: "body", category: "wildlife" }
    );

    // 2. boar_walk (3 cols x 8 rows)
    assembleSheet(walkGrid, 3, 8,
        path.join(ROOT, 'art', 'raw', 'boar_walk.png'),
        path.join(ROOT, 'art', 'masters', 'boar_walk.png'),
        { id: "boar_walk", species: "boar", frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: facings8, animations: { walk: [0, 1, 2, 1], run: [0, 1, 2, 1] }, frameMs: 150, layer: "body", category: "wildlife" }
    );

    // 3. boar_attack (3 cols x 8 rows)
    assembleSheet(attackGrid, 3, 8,
        path.join(ROOT, 'art', 'raw', 'boar_attack.png'),
        path.join(ROOT, 'art', 'masters', 'boar_attack.png'),
        { id: "boar_attack", species: "boar", frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: facings8, animations: { attack: [0, 1, 2] }, frameMs: 150, layer: "body", category: "wildlife" }
    );

    // 4. boar_graze (eating) (3 cols x 8 rows)
    assembleSheet(grazeGrid, 3, 8,
        path.join(ROOT, 'art', 'raw', 'boar_graze.png'),
        path.join(ROOT, 'art', 'masters', 'boar_graze.png'),
        { id: "boar_graze", species: "boar", frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: facings8, animations: { graze: [0, 1, 2, 1], eat: [0, 1, 2, 1] }, frameMs: 200, layer: "body", category: "wildlife" }
    );

    // 5. boar_hurt (3 cols x 8 rows)
    assembleSheet(hurtGrid, 3, 8,
        path.join(ROOT, 'art', 'raw', 'boar_hurt.png'),
        path.join(ROOT, 'art', 'masters', 'boar_hurt.png'),
        { id: "boar_hurt", species: "boar", frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: facings8, animations: { hurt: [0, 1, 2] }, frameMs: 150, layer: "body", category: "wildlife" }
    );

    // 6. boar_death (3 cols x 8 rows)
    assembleSheet(deathGrid, 3, 8,
        path.join(ROOT, 'art', 'raw', 'boar_death.png'),
        path.join(ROOT, 'art', 'masters', 'boar_death.png'),
        { id: "boar_death", species: "boar", frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: facings8, animations: { death: [0, 1, 2] }, frameMs: 250, layer: "body", category: "wildlife" }
    );

    // 7. Consolidated AR-600 Master 8-Way Unit Sheet (20 cols x 8 rows)
    // Cols 0: stand, 1-3: walk, 4-6: work/graze, 7: carry, 8-10: attack, 11-13: eat, 14: hurt, 15-17: death, 18-19: idle
    console.log('Building consolidated AR-600 8-way master sheet: art/masters/boar_master_8way.png...');
    const ar600Cols = 20, ar600Rows = 8;
    const ar600W = 48 * ar600Cols, ar600H = 48 * ar600Rows;
    const ar600Buf = Buffer.alloc(ar600W * ar600H * 4);

    for (let r = 0; r < 8; r++) {
        const rowWalk = walkGrid[r];
        const rowAttack = attackGrid[r];
        const rowGraze = grazeGrid[r];
        const rowHurt = hurtGrid[r];
        const rowDeath = deathGrid[r];
        const rowIdle = idleGrid[r];

        const colMap = [
            rowWalk[1],       // 0: stand
            rowWalk[0],       // 1: walk 0
            rowWalk[1],       // 2: walk 1
            rowWalk[2],       // 3: walk 2
            rowGraze[0],      // 4: work 0
            rowGraze[1],      // 5: work 1
            rowGraze[2],      // 6: work 2
            rowWalk[1],       // 7: carry
            rowAttack[0],     // 8: attack 0
            rowAttack[1],     // 9: attack 1
            rowAttack[2],     // 10: attack 2
            rowGraze[0],      // 11: eat 0
            rowGraze[1],      // 12: eat 1
            rowGraze[2],      // 13: eat 2
            rowHurt[0],       // 14: hurt
            rowDeath[0],      // 15: death 0
            rowDeath[1],      // 16: death 1
            rowDeath[2],      // 17: death 2 (carcass remains)
            rowIdle[0],       // 18: idle 0
            rowIdle[1]        // 19: idle 1
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

    const ar600Path = path.join(ROOT, 'art', 'masters', 'boar_master_8way.png');
    writePNG(ar600Path, ar600W, ar600H, ar600Buf);
    fs.writeFileSync(ar600Path.replace(/\.png$/, '.json'), JSON.stringify({
        id: "boar_master_8way",
        species: "boar",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: facings8,
        animations: {
            stand: [0],
            walk: [1, 2, 3, 2],
            work: [4, 5, 6, 5],
            carry: [7],
            attack: [8, 9, 10],
            graze: [4, 5, 6, 5],
            eat: [11, 12, 13, 12],
            hurt: [14],
            death: [15, 16, 17],
            idle: [18, 19]
        },
        frameMs: 150,
        layer: "body",
        category: "wildlife"
    }, null, 2) + '\n');
    console.log(`Saved AR-600 8-way master: ${ar600Path}`);

    // 8. Standard RMMZ Drop-in Character Sheet ($UF_Boar.png) - 4-way
    console.log('Building standard RMMZ character sheet: game/img/characters/$UF_Boar.png...');
    const rmmzW = 144, rmmzH = 192;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);
    // RMMZ rows: 0 Down (S), 1 Left (W), 2 Right (E), 3 Up (N)
    const rmmzSrcRows = [0, 2, 6, 4];

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

    // Palette reduce to <= 32 colors
    reducePalette(rmmzBuf, 31);
    const rmmzPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Boar.png');
    writePNG(rmmzPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`Saved RMMZ character sheet: ${rmmzPath}`);

    const rmmzJson = {
        id: "UF_Boar",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1],
            idle: [0, 1, 2, 1],
            attack: [0, 1, 2],
            graze: [0, 1, 2, 1],
            eat: [0, 1, 2, 1],
            hurt: [0, 1, 2],
            death: [0, 1, 2]
        },
        frameMs: 200,
        category: "wildlife"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Boar.json'), JSON.stringify(rmmzJson, null, 2) + '\n');

    // 9. Full 8-way RMMZ character sheet ($UF_Boar_8D.png) - 8 rows
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
    const rmmz8Path = path.join(ROOT, 'game', 'img', 'characters', '$UF_Boar_8D.png');
    writePNG(rmmz8Path, rmmz8W, rmmz8H, rmmz8Buf);
    fs.writeFileSync(rmmz8Path.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_Boar_8D",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: facings8,
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1],
            idle: [0, 1, 2, 1],
            attack: [0, 1, 2],
            graze: [0, 1, 2, 1],
            eat: [0, 1, 2, 1],
            hurt: [0, 1, 2],
            death: [0, 1, 2]
        },
        frameMs: 150,
        category: "wildlife"
    }, null, 2) + '\n');
    console.log(`Saved 8-way RMMZ character sheet: ${rmmz8Path}`);

    // 10. Carcass sheet for ground remains
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
    const carcassPath = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Boar_Carcass.png');
    writePNG(carcassPath, 144, 192, carcassBuf);
    fs.writeFileSync(carcassPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_Boar_Carcass",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');
    console.log(`Saved carcass sheet: ${carcassPath}`);
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

run().catch(console.error);
