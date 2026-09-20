'use strict';

/**
 * tools/build_pointy_cursors_and_default_menu.js
 *
 * Processes authentic Google Nano Banana Pro generations:
 * 1. 12 Pointy Cursors -> game/img/system/Cursor_<fac>.png & art/masters/Cursor_<fac>.png/json
 *    Ensuring sharp 1px pointy tips and pixel-accurate click hotspots.
 * 2. Default Menu Theme -> game/img/pictures/UF_Menu_default.png & art/masters/UF_Menu_default.png/json
 * 3. Default Window Skin -> game/img/system/Window_default.png & art/masters/Window_default.png/json
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const SYS_DIR = path.join(ROOT, 'game', 'img', 'system');
const PIC_DIR = path.join(ROOT, 'game', 'img', 'pictures');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

fs.mkdirSync(SYS_DIR, { recursive: true });
fs.mkdirSync(PIC_DIR, { recursive: true });
fs.mkdirSync(MASTER_DIR, { recursive: true });
fs.mkdirSync(REVIEW_DIR, { recursive: true });

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
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!seen.has(k)) {
            seen.add(k);
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
const C_DARK_OUTLINE = pal.snap(24, 16, 10);

function isMagenta(r, g, b) {
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
    return false;
}

function quantizeSheet(buf, w, h, maxColors = 31) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const keptKeys = sorted.slice(0, maxColors).map(e => e[0]);
    const keptRgb = keptKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const keptLab = keptRgb.map(c => srgbToLab(...c));

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        if (keptKeys.includes(k)) continue;

        const curLab = srgbToLab(buf[i], buf[i + 1], buf[i + 2]);
        let best = keptRgb[0], bd = Infinity;
        for (let j = 0; j < keptLab.length; j++) {
            const d = labDist(curLab, keptLab[j]);
            if (d < bd) { bd = d; best = keptRgb[j]; }
        }
        buf[i]     = best[0];
        buf[i + 1] = best[1];
        buf[i + 2] = best[2];
    }
}

function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => (x >= 0 && x < w && y >= 0 && y < h && buf[(y * w + x) * 4 + 3] > 0);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (buf[idx + 3] === 0) continue;
            let border = false;
            for (let dy = -1; dy <= 1 && !border; dy++) {
                for (let dx = -1; dx <= 1 && !border; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (!isOpaque(x + dx, y + dy)) border = true;
                }
            }
            if (border) {
                const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
                const isGlow = (r > 200 && g > 220 && b > 240) || (r > 80 && g > 185 && b > 225) || (r > 180 && g < 60 && b < 60);
                if (!isGlow) {
                    buf[idx]     = C_DARK_OUTLINE[0];
                    buf[idx + 1] = C_DARK_OUTLINE[1];
                    buf[idx + 2] = C_DARK_OUTLINE[2];
                }
            }
        }
    }
}

const CURSOR_KEYS = [
    'default', 'human', 'elf', 'dwarf',
    'gnome', 'goblin', 'orc', 'lizardfolk',
    'kobold', 'undead', 'starborn', 'swarm'
];

function buildPointyCursors() {
    console.log('--- Processing 12 Pointy Cursors ---');
    const rawPath = path.join(RAW_DIR, 'pointy_cursors_12_raw.png');
    if (!fs.existsSync(rawPath)) {
        throw new Error(`Raw cursors file not found: ${rawPath}`);
    }

    const img = decodePNG(fs.readFileSync(rawPath));
    const cols = 4;
    const rows = 3;
    const cellW = img.width / cols;
    const cellH = img.height / rows;

    const cursorResults = {};
    const reviewW = 4 * 48 * 4; // 768
    const reviewH = 3 * 48 * 4; // 576
    const reviewBuf = Buffer.alloc(reviewW * reviewH * 4);

    // Checkerboard review background
    for (let y = 0; y < reviewH; y++) {
        for (let x = 0; x < reviewW; x++) {
            const check = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0);
            const col = check ? 36 : 46;
            const idx = (y * reviewW + x) * 4;
            reviewBuf[idx] = col; reviewBuf[idx+1] = col; reviewBuf[idx+2] = col + 6; reviewBuf[idx+3] = 255;
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (idx >= CURSOR_KEYS.length) break;
            const facKey = CURSOR_KEYS[idx];

            const x0 = Math.round(c * cellW);
            const x1 = Math.round((c + 1) * cellW) - 1;
            const y0 = Math.round(r * cellH);
            const y1 = Math.round((r + 1) * cellH) - 1;

            // Find foreground bounds inside cell
            let minX = x1, maxX = x0, minY = y1, maxY = y0, count = 0;
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    const pIdx = (y * img.width + x) * 4;
                    if (!isMagenta(img.data[pIdx], img.data[pIdx + 1], img.data[pIdx + 2])) {
                        count++;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            console.log(`Cursor ${facKey}: raw bounds [${minX},${minY} .. ${maxX},${maxY}], size ${maxX - minX + 1}x${maxY - minY + 1}`);

            // Fit into 48x48 buffer
            // Scale to fit ~36-40px height/width so it's readable and sharp
            const curW = maxX - minX + 1;
            const curH = maxY - minY + 1;
            const scale = Math.min(38.0 / curW, 38.0 / curH);

            const curBuf = Buffer.alloc(48 * 48 * 4);
            const targetTipX = 4;
            const targetTipY = 4;

            // Map (minX, minY) near (targetTipX, targetTipY)
            for (let cy = 0; cy < 48; cy++) {
                for (let cx = 0; cx < 48; cx++) {
                    const srcX = Math.round(minX + (cx - targetTipX) / scale);
                    const srcY = Math.round(minY + (cy - targetTipY) / scale);

                    if (srcX >= minX && srcX <= maxX && srcY >= minY && srcY <= maxY) {
                        const sIdx = (srcY * img.width + srcX) * 4;
                        if (!isMagenta(img.data[sIdx], img.data[sIdx + 1], img.data[sIdx + 2])) {
                            const sn = pal.snap(img.data[sIdx], img.data[sIdx + 1], img.data[sIdx + 2]);
                            const dIdx = (cy * 48 + cx) * 4;
                            curBuf[dIdx]     = sn[0];
                            curBuf[dIdx + 1] = sn[1];
                            curBuf[dIdx + 2] = sn[2];
                            curBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }

            applyDarkOutline(curBuf, 48, 48);

            // Find the precise topmost/leftmost pointy tip pixel in curBuf
            let tipX = 4, tipY = 4;
            let minDistance = Infinity;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const dIdx = (y * 48 + x) * 4;
                    if (curBuf[dIdx + 3] > 0) {
                        // We want the point closest to top-left (x + y smallest)
                        const dist = x * 1.0 + y * 1.2;
                        if (dist < minDistance) {
                            minDistance = dist;
                            tipX = x;
                            tipY = y;
                        }
                    }
                }
            }

            // Ensure the tip pixel itself is sharp (solid point)
            const tipIdx = (tipY * 48 + tipX) * 4;
            curBuf[tipIdx + 3] = 255;

            quantizeSheet(curBuf, 48, 48, 31);

            cursorResults[facKey] = {
                hotspot: [tipX, tipY],
                buf: curBuf
            };
            console.log(`Final Cursor ${facKey}: pointy hotspot at [${tipX}, ${tipY}]`);

            // Save to game/img/system/Cursor_<fac>.png
            const sysPath = path.join(SYS_DIR, `Cursor_${facKey}.png`);
            fs.writeFileSync(sysPath, writePNG(curBuf, 48, 48));

            // Save master
            const masterPng = path.join(MASTER_DIR, `Cursor_${facKey}.png`);
            fs.writeFileSync(masterPng, writePNG(curBuf, 48, 48));

            const sidecar = {
                name: `Cursor_${facKey}`,
                culture: facKey,
                about: `Pointy 16-bit mouse cursor for ${facKey} (hotspot: [${tipX}, ${tipY}]).`,
                frameWidth: 48,
                frameHeight: 48,
                anchor: [tipX, tipY],
                facings: ["S"],
                animations: { default: [0] },
                layer: "ui_cursor",
                palette: "art/palette/uf.hex"
            };
            fs.writeFileSync(path.join(MASTER_DIR, `Cursor_${facKey}.json`), JSON.stringify(sidecar, null, 2));

            // Render into review buffer at 4x with red hotspot crosshair
            const rx0 = c * 48 * 4;
            const ry0 = r * 48 * 4;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (curBuf[sIdx + 3] === 0) continue;
                    for (let dy = 0; dy < 4; dy++) {
                        for (let dx = 0; dx < 4; dx++) {
                            const px = rx0 + x * 4 + dx;
                            const py = ry0 + y * 4 + dy;
                            const dIdx = (py * reviewW + px) * 4;
                            reviewBuf[dIdx]     = curBuf[sIdx];
                            reviewBuf[dIdx + 1] = curBuf[sIdx + 1];
                            reviewBuf[dIdx + 2] = curBuf[sIdx + 2];
                            reviewBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }

            // Draw red crosshair on hotspot
            const hx = rx0 + tipX * 4;
            const hy = ry0 + tipY * 4;
            for (let d = -4; d <= 7; d++) {
                const p1 = (hy * reviewW + Math.min(Math.max(hx + d, 0), reviewW - 1)) * 4;
                const p2 = (Math.min(Math.max(hy + d, 0), reviewH - 1) * reviewW + hx) * 4;
                reviewBuf[p1] = 255; reviewBuf[p1+1] = 0; reviewBuf[p1+2] = 0; reviewBuf[p1+3] = 255;
                reviewBuf[p2] = 255; reviewBuf[p2+1] = 0; reviewBuf[p2+2] = 0; reviewBuf[p2+3] = 255;
            }
        }
    }

    fs.writeFileSync(path.join(REVIEW_DIR, 'all_pointy_cursors_review.png'), writePNG(reviewBuf, reviewW, reviewH));
    console.log('Saved review image: art/review/all_pointy_cursors_review.png');
    return cursorResults;
}

function buildDefaultMenu() {
    console.log('\n--- Processing Default Menu Theme (UF_Menu_default.png) ---');
    const rawPath = path.join(RAW_DIR, 'default_menu_theme_raw.png');
    if (!fs.existsSync(rawPath)) {
        throw new Error(`Raw menu file not found: ${rawPath}`);
    }

    const img = decodePNG(fs.readFileSync(rawPath));
    const targetW = 816;
    const targetH = 624;
    const outBuf = Buffer.alloc(targetW * targetH * 4);

    const scaleX = img.width / targetW;
    const scaleY = img.height / targetH;

    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            const srcX = Math.min(Math.round(x * scaleX), img.width - 1);
            const srcY = Math.min(Math.round(y * scaleY), img.height - 1);
            const sIdx = (srcY * img.width + srcX) * 4;
            const sn = pal.snap(img.data[sIdx], img.data[sIdx + 1], img.data[sIdx + 2]);
            const dIdx = (y * targetW + x) * 4;
            outBuf[dIdx]     = sn[0];
            outBuf[dIdx + 1] = sn[1];
            outBuf[dIdx + 2] = sn[2];
            outBuf[dIdx + 3] = 255;
        }
    }

    quantizeSheet(outBuf, targetW, targetH, 32);

    fs.writeFileSync(path.join(PIC_DIR, 'UF_Menu_default.png'), writePNG(outBuf, targetW, targetH));
    fs.writeFileSync(path.join(MASTER_DIR, 'UF_Menu_default.png'), writePNG(outBuf, targetW, targetH));

    const sidecar = {
        name: "UF_Menu_default",
        culture: "default",
        about: "Default fortress main menu frame and wallpaper (816x624).",
        frameWidth: targetW,
        frameHeight: targetH,
        palette: "art/palette/uf.hex"
    };
    fs.writeFileSync(path.join(MASTER_DIR, 'UF_Menu_default.json'), JSON.stringify(sidecar, null, 2));
    console.log('Saved game/img/pictures/UF_Menu_default.png and art/masters/UF_Menu_default.png');
}

function buildDefaultWindow() {
    console.log('\n--- Processing Default Window Skin (Window_default.png) ---');
    const rawPath = path.join(RAW_DIR, 'default_window_skin_raw.png');
    if (!fs.existsSync(rawPath)) {
        throw new Error(`Raw window file not found: ${rawPath}`);
    }

    const img = decodePNG(fs.readFileSync(rawPath));
    const targetW = 192;
    const targetH = 192;
    const outBuf = Buffer.alloc(targetW * targetH * 4);

    const scaleX = img.width / targetW;
    const scaleY = img.height / targetH;

    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            const srcX = Math.min(Math.round(x * scaleX), img.width - 1);
            const srcY = Math.min(Math.round(y * scaleY), img.height - 1);
            const sIdx = (srcY * img.width + srcX) * 4;

            const r = img.data[sIdx], g = img.data[sIdx + 1], b = img.data[sIdx + 2];
            const dIdx = (y * targetW + x) * 4;

            if (isMagenta(r, g, b)) {
                outBuf[dIdx + 3] = 0;
            } else {
                const sn = pal.snap(r, g, b);
                outBuf[dIdx]     = sn[0];
                outBuf[dIdx + 1] = sn[1];
                outBuf[dIdx + 2] = sn[2];
                // Check if in background fill area (top-left 64x64 or bottom-left 64x64)
                if ((x < 64 && y < 64) || (x < 64 && y >= 96 && y < 160)) {
                    outBuf[dIdx + 3] = 192; // translucent window backplate
                } else {
                    outBuf[dIdx + 3] = 255;
                }
            }
        }
    }

    quantizeSheet(outBuf, targetW, targetH, 24);

    fs.writeFileSync(path.join(SYS_DIR, 'Window_default.png'), writePNG(outBuf, targetW, targetH));
    fs.writeFileSync(path.join(MASTER_DIR, 'Window_default.png'), writePNG(outBuf, targetW, targetH));

    const sidecar = {
        name: "Window_default",
        culture: "default",
        about: "Default fortress windowskin (192x192).",
        frameWidth: targetW,
        frameHeight: targetH,
        palette: "art/palette/uf.hex"
    };
    fs.writeFileSync(path.join(MASTER_DIR, 'Window_default.json'), JSON.stringify(sidecar, null, 2));
    console.log('Saved game/img/system/Window_default.png and art/masters/Window_default.png');
}

function main() {
    const cursorResults = buildPointyCursors();
    buildDefaultMenu();
    buildDefaultWindow();

    console.log('\n=== Hotspots to update in UF_FactionMenus.js ===');
    console.log('const CURSOR_HOTSPOTS = {');
    for (const [k, v] of Object.entries(cursorResults)) {
        console.log(`    ${k}: [${v.hotspot[0]}, ${v.hotspot[1]}],`);
    }
    console.log('};');
}

if (require.main === module) {
    main();
}

module.exports = { buildPointyCursors, buildDefaultMenu, buildDefaultWindow };
