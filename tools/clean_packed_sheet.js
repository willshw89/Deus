// tools/clean_packed_sheet.js - Palette snapping & game integration for packed sheets
"use strict";

const fs = require("fs");
const path = require("path");
const { decodePNG } = require("./png_read");
const { writePNG } = require("./png_util");

const ROOT = path.resolve(__dirname, "..");
const PALETTE_FILE = path.join(ROOT, "art", "palette", "uf.hex");

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

const hexLines = fs.readFileSync(PALETTE_FILE, "utf8").split(/\r?\n/).filter(s => s.trim().startsWith("#"));
const palRGB = hexLines.map(parseHex).filter(Boolean);
const palLab = palRGB.map(c => srgbToLab(...c));
const cache = new Map();

function snapToPalette(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    if (cache.has(key)) return cache.get(key);
    const l = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    cache.set(key, best);
    return best;
}

const srcFile = path.join(ROOT, "art", "raw", "stone_walls_packed_02_extracted.png");
const raw = decodePNG(fs.readFileSync(srcFile));
const W = raw.width;
const H = raw.height;

const outBuf = Buffer.alloc(W * H * 4);

// The DF black wall-top convention:
// Upper 48 px of each 96 px cell is flat near-black (#08080C to #121218).
// Lower 48 px is the authentic material face.
for (let y = 0; y < H; y++) {
    const cellRow = Math.floor(y / 96);
    const yInCell = y % 96;
    const isTopCap = yInCell < 48;

    for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const r = raw.data[i], g = raw.data[i + 1], b = raw.data[i + 2], a = raw.data[i + 3];

        if (a < 128) {
            outBuf[i] = 0;
            outBuf[i + 1] = 0;
            outBuf[i + 2] = 0;
            outBuf[i + 3] = 0;
            continue;
        }

        if (isTopCap) {
            // Check if this pixel is the near-black top cap or the subtle top highlight line
            const brightness = (r + g + b) / 3;
            if (brightness < 35) {
                // Pitch black cap (#08080C)
                outBuf[i] = 8;
                outBuf[i + 1] = 8;
                outBuf[i + 2] = 12;
                outBuf[i + 3] = 255;
            } else {
                // Edge definition or quoin peak
                const snapped = snapToPalette(r, g, b);
                outBuf[i] = snapped[0];
                outBuf[i + 1] = snapped[1];
                outBuf[i + 2] = snapped[2];
                outBuf[i + 3] = 255;
            }
        } else {
            // Material face: snap to uf.hex palette
            const snapped = snapToPalette(r, g, b);
            outBuf[i] = snapped[0];
            outBuf[i + 1] = snapped[1];
            outBuf[i + 2] = snapped[2];
            outBuf[i + 3] = 255;
        }
    }
}

// Write master image
const masterPath = path.join(ROOT, "art", "masters", "!$UF_StoneWalls_Set.png");
writePNG(masterPath, W, H, outBuf);
console.log(`Saved master to ${masterPath}`);

// Write runtime game charset / tileset image
const gameCharPath = path.join(ROOT, "game", "img", "characters", "!$UF_StoneWalls_Set.png");
writePNG(gameCharPath, W, H, outBuf);
console.log(`Saved game character sheet to ${gameCharPath}`);

// Also create sidecar JSON for the sheet
const sidecar = {
    id: "UF_StoneWalls_Set",
    sheetWidth: W,
    sheetHeight: H,
    cellWidth: 48,
    cellHeight: 96,
    cols: 4,
    rows: 2,
    slots: {
        "0,0": { id: "wall_limestone_straight", name: "Straight Limestone Wall", type: "wall", material: "stones:limestone", blackTop: true },
        "1,0": { id: "wall_limestone_corner", name: "Limestone Wall Corner", type: "wall", material: "stones:limestone", blackTop: true },
        "2,0": { id: "wall_limestone_doorway", name: "Limestone Wall Doorway", type: "doorway", material: "stones:limestone", blackTop: true },
        "3,0": { id: "wall_limestone_closed_door", name: "Limestone Wall with Closed Door", type: "door", material: "stones:limestone", blackTop: true },
        "0,1": { id: "rock_limestone_cliff", name: "Natural Solid Limestone Cliff Face", type: "cliff", material: "stones:limestone", blackTop: true },
        "1,1": { id: "rock_cave_wall_excavated", name: "Excavated Natural Cave Wall", type: "cave_wall", material: "stones:limestone", blackTop: true },
        "2,1": { id: "wall_limestone_arrow_slit", name: "Limestone Wall with Arrow Slit", type: "wall", material: "stones:limestone", blackTop: true },
        "3,1": { id: "wall_limestone_gate", name: "Fortified Portcullis Gate in Stone Wall", type: "gate", material: "stones:limestone", blackTop: true }
    }
};

const sidecarPath = path.join(ROOT, "art", "masters", "!$UF_StoneWalls_Set.json");
fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
const gameSidecarPath = path.join(ROOT, "game", "img", "characters", "!$UF_StoneWalls_Set.json");
fs.writeFileSync(gameSidecarPath, JSON.stringify(sidecar, null, 2));
console.log(`Saved sidecar JSON to ${sidecarPath} and ${gameSidecarPath}`);
