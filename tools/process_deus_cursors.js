'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const SYS_DIR = path.join(ROOT, 'game', 'img', 'system');
const BRAIN = 'C:\\Users\\snewt\\.gemini\\antigravity\\brain\\74107bfb-a5b5-43a6-8ab7-87deb97997e1';

const MOUSE_JPG = path.join(BRAIN, 'deus_lightning_cursor_1789928303556.jpg');
const MENU_JPG = path.join(BRAIN, 'deus_menu_pointer_1789928342311.jpg');

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

function resizeWithPs(jpgPath, targetW, targetH) {
    const tmpPng = path.join(require('os').tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `
        Add-Type -AssemblyName System.Drawing
        $src = [System.Drawing.Bitmap]::FromFile('${jpgPath.replace(/'/g, "''")}')
        
        # Find bounding box of non-black pixels
        $minX = $src.Width; $maxX = 0; $minY = $src.Height; $maxY = 0
        for ($y = 0; $y -lt $src.Height; $y += 2) {
            for ($x = 0; $x -lt $src.Width; $x += 2) {
                $p = $src.GetPixel($x, $y)
                if ($p.R -gt 38 -or $p.G -gt 38 -or $p.B -gt 38) {
                    if ($x -lt $minX) { $minX = $x }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }
        $cropW = [Math]::Max(1, $maxX - $minX + 1)
        $cropH = [Math]::Max(1, $maxY - $minY + 1)
        $cropRect = New-Object System.Drawing.Rectangle($minX, $minY, $cropW, $cropH)
        $cropped = $src.Clone($cropRect, $src.PixelFormat)
        
        $dest = New-Object System.Drawing.Bitmap(${targetW}, ${targetH}, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($dest)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($cropped, 0, 0, ${targetW}, ${targetH})
        $g.Dispose()
        $dest.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
        $dest.Dispose()
        $cropped.Dispose()
        $src.Dispose()
    `;
    childProcess.execSync(`powershell.exe -NoProfile -Command "${ps.replace(/\r?\n/g, '; ').replace(/"/g, '`"')}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch (e) {}
    return decodePNG(buf, 'resized.png');
}

function cleanAndSnap(img, bgThresh = 40) {
    const out = Buffer.alloc(img.width * img.height * 4);
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
            // If black background
            if (r < bgThresh && g < bgThresh && b < bgThresh) {
                out[idx + 3] = 0;
            } else {
                const snapped = pal.snap(r, g, b);
                out[idx] = snapped[0];
                out[idx + 1] = snapped[1];
                out[idx + 2] = snapped[2];
                out[idx + 3] = 255;
            }
        }
    }
    return { data: out, width: img.width, height: img.height };
}

function keepLargestComponent(buf, w, h) {
    const visited = new Uint8Array(w * h);
    const components = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (visited[idx] || buf[idx * 4 + 3] === 0) continue;

            const comp = [];
            const queue = [x, y];
            visited[idx] = 1;

            while (queue.length > 0) {
                const qy = queue.pop();
                const qx = queue.pop();
                comp.push([qx, qy]);

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = qx + dx;
                        const ny = qy + dy;
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            const nIdx = ny * w + nx;
                            if (!visited[nIdx] && buf[nIdx * 4 + 3] > 0) {
                                visited[nIdx] = 1;
                                queue.push(nx, ny);
                            }
                        }
                    }
                }
            }
            components.push(comp);
        }
    }

    if (components.length <= 1) return buf;

    // Sort by size descending
    components.sort((a, b) => b.length - a.length);
    // Keep pixels belonging to components with at least 8 pixels (preserves main body + prominent lightning sparks, drops single isolated noise specks)
    const valid = new Set();
    for (const c of components) {
        if (c.length >= 6) {
            for (const [x, y] of c) valid.add(y * w + x);
        }
    }

    const out = Buffer.from(buf);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (!valid.has(idx)) {
                out[idx * 4 + 3] = 0;
            }
        }
    }
    return out;
}

function placeInCanvas(imgData, imgW, imgH, canvasW, canvasH, offsetX, offsetY) {
    const out = Buffer.alloc(canvasW * canvasH * 4);
    for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
            const dx = x + offsetX;
            const dy = y + offsetY;
            if (dx >= 0 && dx < canvasW && dy >= 0 && dy < canvasH) {
                const sIdx = (y * imgW + x) * 4;
                const dIdx = (dy * canvasW + dx) * 4;
                if (imgData[sIdx + 3] > 0) {
                    out[dIdx] = imgData[sIdx];
                    out[dIdx + 1] = imgData[sIdx + 1];
                    out[dIdx + 2] = imgData[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }
    }
    return out;
}

// 1. Menu Pointer (horizontal arrow pointing right, 32x24)
console.log('Processing DEUS Menu Pointer...');
const menuRes = resizeWithPs(MENU_JPG, 32, 24);
const menuClean = cleanAndSnap(menuRes, 35);
const menuConnected = keepLargestComponent(menuClean.data, 32, 24);
const menuCanvas = placeInCanvas(menuConnected, 32, 24, 48, 48, 8, 12);
writePNG(path.join(SYS_DIR, 'Cursor_deus_pointer.png'), 48, 48, menuCanvas);
console.log('Saved game/img/system/Cursor_deus_pointer.png');

// 2. Mouse Cursor (pointer pointing up-left, 36x36)
console.log('Processing DEUS Mouse Cursor...');
const mouseRes = resizeWithPs(MOUSE_JPG, 36, 36);
const mouseClean = cleanAndSnap(mouseRes, 35);
const mouseConnected = keepLargestComponent(mouseClean.data, 36, 36);
const mouseCanvas = placeInCanvas(mouseConnected, 36, 36, 48, 48, 3, 3);
writePNG(path.join(SYS_DIR, 'Cursor_deus.png'), 48, 48, mouseCanvas);
writePNG(path.join(SYS_DIR, 'Cursor_default.png'), 48, 48, mouseCanvas);
console.log('Saved game/img/system/Cursor_deus.png and Cursor_default.png');
