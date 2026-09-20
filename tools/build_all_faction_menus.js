'use strict';
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

function quantizeBuffer(buf, maxColors) {
    // Snap to 256-color palette first (O(N))
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const s = snap(buf[i], buf[i + 1], buf[i + 2]);
        buf[i] = s[0]; buf[i + 1] = s[1]; buf[i + 2] = s[2];
        buf[i + 3] = 255;
    }

    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Now counts.size is at most 256, reduce to maxColors in milliseconds
    while (counts.size > maxColors) {
        let minCount = Infinity, minKey = null;
        for (const [k, c] of counts.entries()) {
            if (c < minCount) { minCount = c; minKey = k; }
        }
        if (minKey === null) break;

        const r1 = (minKey >> 16) & 0xff, g1 = (minKey >> 8) & 0xff, b1 = minKey & 0xff;
        const l1 = srgbToLab(r1, g1, b1);

        let mergeKey = null, mergeDist = Infinity;
        for (const [k, c] of counts.entries()) {
            if (k === minKey) continue;
            const r2 = (k >> 16) & 0xff, g2 = (k >> 8) & 0xff, b2 = k & 0xff;
            const d = labDist(l1, srgbToLab(r2, g2, b2));
            if (d < mergeDist) { mergeDist = d; mergeKey = k; }
        }

        const mr = (mergeKey >> 16) & 0xff, mg = (mergeKey >> 8) & 0xff, mb = mergeKey & 0xff;
        for (let i = 0; i < buf.length; i += 4) {
            if (buf[i + 3] === 0) continue;
            const curKey = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (curKey === minKey) {
                buf[i] = mr; buf[i + 1] = mg; buf[i + 2] = mb;
            }
        }
        counts.set(mergeKey, counts.get(mergeKey) + minCount);
        counts.delete(minKey);
    }
}

// Blerp sampling
function sampleBilinear(img, sx, sy) {
    sx = Math.max(0, Math.min(img.width - 1, sx));
    sy = Math.max(0, Math.min(img.height - 1, sy));
    const x0 = Math.floor(sx), x1 = Math.min(img.width - 1, x0 + 1);
    const y0 = Math.floor(sy), y1 = Math.min(img.height - 1, y0 + 1);
    const fx = sx - x0, fy = sy - y0;

    const i00 = (y0 * img.width + x0) * 4;
    const i10 = (y0 * img.width + x1) * 4;
    const i01 = (y1 * img.width + x0) * 4;
    const i11 = (y1 * img.width + x1) * 4;

    const out = [0, 0, 0, 0];
    for (let c = 0; c < 4; c++) {
        const top = img.data[i00 + c] * (1 - fx) + img.data[i10 + c] * fx;
        const bot = img.data[i01 + c] * (1 - fx) + img.data[i11 + c] * fx;
        out[c] = Math.round(top * (1 - fy) + bot * fy);
    }
    return out;
}

function downsampleRect(img, rx, ry, rw, rh, tw, th) {
    const out = Buffer.alloc(tw * th * 4);
    for (let ty = 0; ty < th; ty++) {
        const sy = ry + (ty + 0.5) * (rh / th);
        for (let tx = 0; tx < tw; tx++) {
            const sx = rx + (tx + 0.5) * (rw / tw);
            const rgba = sampleBilinear(img, sx, sy);
            const idx = (ty * tw + tx) * 4;
            out[idx] = rgba[0]; out[idx + 1] = rgba[1]; out[idx + 2] = rgba[2]; out[idx + 3] = rgba[3];
        }
    }
    return out;
}

// Load raw PNG images
const rawHuman = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'menu_human_raw.png')), 'menu_human_raw.png');
const rawBatchOne = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'menu_batch_one_raw.png')), 'menu_batch_one_raw.png');
const rawBatchTwo = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'menu_batch_two_raw.png')), 'menu_batch_two_raw.png');
const rawBatchThree = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'menu_batch_three_raw.png')), 'menu_batch_three_raw.png');

const FACTIONS = [
    {
        id: "human",
        name: "Human",
        about: "Human Kingdom carved stone archway with Celtic knotwork timber and oak rosettes.",
        img: rawHuman,
        crop: { x: 50, y: 50, w: 924, h: 924 },
        cursorCrop: { x: 230, y: 375, w: 60, h: 60 }
    },
    {
        id: "elf",
        name: "Elf",
        about: "Elven Kingdom living woody bower with golden leaves and autumn berries.",
        img: rawBatchOne,
        crop: { x: 20, y: 20, w: 472, h: 472 },
        cursorCrop: { x: 330, y: 165, w: 60, h: 60 }
    },
    {
        id: "dwarf",
        name: "Dwarf",
        about: "Dwarven Clan dressed ashlar granite stone blocks with glowing blue runic inlays.",
        img: rawBatchOne,
        crop: { x: 532, y: 20, w: 472, h: 472 },
        cursorCrop: { x: 825, y: 165, w: 75, h: 75 }
    },
    {
        id: "gnome",
        name: "Gnome",
        about: "Gnomish Guild interlocking brass cogs, steam pipes, pressure gauges, and teal enamel.",
        img: rawBatchOne,
        crop: { x: 20, y: 532, w: 472, h: 472 },
        cursorCrop: { x: 330, y: 675, w: 65, h: 65 }
    },
    {
        id: "goblin",
        name: "Goblin",
        about: "Goblin Horde driftwood branches, barbed wire, and rusted scrap metal plates.",
        img: rawBatchOne,
        crop: { x: 532, y: 532, w: 472, h: 472 },
        cursorCrop: { x: 830, y: 665, w: 60, h: 60 }
    },
    {
        id: "orc",
        name: "Orc",
        about: "Orc War-Band black iron band with bleached ivory tusks and curved bone crests.",
        img: rawBatchTwo,
        crop: { x: 20, y: 20, w: 472, h: 472 },
        cursorCrop: { x: 285, y: 255, w: 80, h: 80 }
    },
    {
        id: "lizardfolk",
        name: "Lizardfolk",
        about: "Lizardfolk Marsh-Kin bound river reeds, mother-of-pearl mounts, and nautilus shells.",
        img: rawBatchTwo,
        crop: { x: 532, y: 20, w: 472, h: 472 },
        cursorCrop: { x: 790, y: 265, w: 80, h: 80 }
    },
    {
        id: "kobold",
        name: "Kobold",
        about: "Kobold Warren cavern rock niche with copper bells, candles, and clay ochre wall.",
        img: rawBatchTwo,
        crop: { x: 20, y: 532, w: 472, h: 472 },
        cursorCrop: { x: 285, y: 755, w: 80, h: 80 }
    },
    {
        id: "undead",
        name: "Undead",
        about: "Undead Crypt-Lords weathered tomb slate stone with creeping moss and verdigris bronze.",
        img: rawBatchTwo,
        crop: { x: 532, y: 532, w: 472, h: 472 },
        cursorCrop: { x: 790, y: 755, w: 75, h: 75 }
    },
    {
        id: "starborn",
        name: "Starborn",
        about: "Starborn Concord geometric crystalline lattice with cut sapphire facets on cosmic void.",
        img: rawBatchThree,
        crop: { x: 20, y: 20, w: 472, h: 472 },
        cursorCrop: { x: 100, y: 115, w: 60, h: 60 }
    },
    {
        id: "swarm",
        name: "Swarm",
        about: "Chitinous Swarm ribbed exoskeleton carapace with violet sinew nodes on bio-membrane.",
        img: rawBatchThree,
        crop: { x: 532, y: 20, w: 472, h: 472 },
        cursorCrop: { x: 595, y: 105, w: 65, h: 65 }
    }
];

const MENU_W = 816, MENU_H = 624;

console.log('=== Building 11 Authentic Full-Screen Faction Menu Backdrops (816x624) ===');

fs.mkdirSync(path.join(ROOT, 'game', 'img', 'pictures'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'game', 'img', 'system'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'art', 'masters'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'art', 'review'), { recursive: true });

for (const f of FACTIONS) {
    console.log(`Processing full matching menu for ${f.id}...`);

    const menuBuf = Buffer.alloc(MENU_W * MENU_H * 4);
    const cr = f.crop;

    const WALL_PATTERNS = {
        human: (x, y) => {
            const plank = Math.floor(x / 48);
            const isSeam = (x % 48 === 0);
            const grain = ((x * 3 + y * 7 + (plank * 17)) % 13 < 4) ? 8 : 0;
            return isSeam ? [18, 12, 8] : [32 + grain, 22 + grain, 14 + grain];
        },
        elf: (x, y) => {
            const weave = ((x * 2 + y * 3) % 11 < 4) ? 10 : 0;
            const vein = ((x + y) % 16 === 0) ? 6 : 0;
            return [12 + weave + vein, 34 + weave + vein * 2, 18 + weave];
        },
        dwarf: (x, y) => {
            const row = Math.floor(y / 32);
            const isSeamX = ((x + (row % 2) * 32) % 64 === 0);
            const isSeamY = (y % 32 === 0);
            const fleck = ((x * 7 + y * 13) % 17 < 3) ? 10 : 0;
            if (isSeamX || isSeamY) return [14, 15, 18];
            return [26 + fleck, 28 + fleck, 34 + fleck];
        },
        gnome: (x, y) => {
            const isGrid = (x % 24 === 0 || y % 24 === 0);
            const isSubGrid = (x % 6 === 0 && y % 6 === 0);
            const dot = isSubGrid ? 12 : 0;
            if (isGrid) return [14, 46, 52];
            return [10 + dot, 30 + dot, 36 + dot];
        },
        goblin: (x, y) => {
            const patch = (Math.floor(x / 40) + Math.floor(y / 40)) % 2;
            const weave = ((x ^ y) % 7 < 3) ? 8 : 0;
            const base = patch ? 24 : 32;
            return [base + weave, Math.round((base + weave) * 0.82), Math.round((base + weave) * 0.6)];
        },
        orc: (x, y) => {
            const grain = ((x * 5 + y * 11) % 19 < 5) ? 12 : 0;
            return [44 + grain, 14 + Math.round(grain * 0.4), 14 + Math.round(grain * 0.4)];
        },
        lizardfolk: (x, y) => {
            const wave = Math.round(Math.sin((x + y * 0.5) / 12) * 6);
            const ripple = ((x * 3 + y * 5) % 13 < 4) ? 8 : 0;
            return [10 + wave, 28 + wave + ripple, 28 + wave + ripple];
        },
        kobold: (x, y) => {
            const stratum = Math.round(Math.sin(y / 8 + x / 32) * 6);
            const clay = ((x * 7 + y * 3) % 11 < 4) ? 8 : 0;
            return [38 + stratum + clay, 22 + stratum + clay, 14 + stratum];
        },
        undead: (x, y) => {
            const crack = ((x * 11 + y * 7) % 37 === 0) ? -10 : 0;
            const moss = ((x ^ (y * 2)) % 23 < 4) ? 8 : 0;
            return [22 + crack, 26 + crack + moss, 24 + crack + Math.round(moss * 0.6)];
        },
        starborn: (x, y) => {
            const isStar = ((x * 47 + y * 79) % 313 === 0);
            const isStar2 = ((x * 83 + y * 31) % 521 === 0);
            const nebula = Math.round((Math.sin(x / 40) + Math.cos(y / 35)) * 5);
            if (isStar) return [180, 190, 255];
            if (isStar2) return [200, 160, 240];
            return [14 + nebula, 12 + nebula, 34 + nebula * 2];
        },
        swarm: (x, y) => {
            const pore = Math.hypot((x % 24) - 12, (y % 24) - 12);
            const isPore = pore < 4;
            const sinew = ((x + y * 2) % 13 < 4) ? 10 : 0;
            if (isPore) return [12, 18, 10];
            return [22 + sinew, 34 + sinew, 18];
        }
    };

    const patFn = WALL_PATTERNS[f.id] || WALL_PATTERNS.human;
    for (let y = 0; y < MENU_H; y++) {
        for (let x = 0; x < MENU_W; x++) {
            const rgb = patFn(x, y);
            const didx = (y * MENU_W + x) * 4;
            menuBuf[didx] = rgb[0];
            menuBuf[didx + 1] = rgb[1];
            menuBuf[didx + 2] = rgb[2];
            menuBuf[didx + 3] = 255;
        }
    }

    // 2. 9-Slice Border Composition
    // Frame border thickness: 80 px in final canvas (about 13% of raw crop)
    const CORNER_W = 100;
    const CORNER_H = 80;
    const RAW_BORDER_W = Math.floor(cr.w * 0.13);
    const RAW_BORDER_H = Math.floor(cr.h * 0.13);
    const RAW_C_W = Math.floor(cr.w * 0.18);
    const RAW_C_H = Math.floor(cr.h * 0.18);

    // Top-Left Corner
    const tlCorner = downsampleRect(f.img, cr.x, cr.y, RAW_C_W, RAW_C_H, CORNER_W, CORNER_H);
    // Top-Right Corner
    const trCorner = downsampleRect(f.img, cr.x + cr.w - RAW_C_W, cr.y, RAW_C_W, RAW_C_H, CORNER_W, CORNER_H);
    // Bottom-Left Corner
    const blCorner = downsampleRect(f.img, cr.x, cr.y + cr.h - RAW_C_H, RAW_C_W, RAW_C_H, CORNER_W, CORNER_H);
    // Bottom-Right Corner
    const brCorner = downsampleRect(f.img, cr.x + cr.w - RAW_C_W, cr.y + cr.h - RAW_C_H, RAW_C_W, RAW_C_H, CORNER_W, CORNER_H);

    // Top Edge
    const topEdgeW = MENU_W - CORNER_W * 2;
    const topEdge = downsampleRect(f.img, cr.x + RAW_C_W, cr.y, cr.w - RAW_C_W * 2, RAW_BORDER_H, topEdgeW, CORNER_H);
    // Bottom Edge
    const botEdge = downsampleRect(f.img, cr.x + RAW_C_W, cr.y + cr.h - RAW_BORDER_H, cr.w - RAW_C_W * 2, RAW_BORDER_H, topEdgeW, CORNER_H);
    // Left Edge
    const sideEdgeH = MENU_H - CORNER_H * 2;
    const leftEdge = downsampleRect(f.img, cr.x, cr.y + RAW_C_H, RAW_BORDER_W, cr.h - RAW_C_H * 2, CORNER_W, sideEdgeH);
    // Right Edge
    const rightEdge = downsampleRect(f.img, cr.x + cr.w - RAW_BORDER_W, cr.y + RAW_C_H, RAW_BORDER_W, cr.h - RAW_C_H * 2, CORNER_W, sideEdgeH);

    function blit(src, sw, sh, dx, dy) {
        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                const sidx = (y * sw + x) * 4;
                const didx = ((dy + y) * MENU_W + (dx + x)) * 4;
                menuBuf[didx] = src[sidx];
                menuBuf[didx + 1] = src[sidx + 1];
                menuBuf[didx + 2] = src[sidx + 2];
                menuBuf[didx + 3] = 255;
            }
        }
    }

    // Blit edges
    blit(topEdge, topEdgeW, CORNER_H, CORNER_W, 0);
    blit(botEdge, topEdgeW, CORNER_H, CORNER_W, MENU_H - CORNER_H);
    blit(leftEdge, CORNER_W, sideEdgeH, 0, CORNER_H);
    blit(rightEdge, CORNER_W, sideEdgeH, MENU_W - CORNER_W, CORNER_H);

    // Blit corners (on top)
    blit(tlCorner, CORNER_W, CORNER_H, 0, 0);
    blit(trCorner, CORNER_W, CORNER_H, MENU_W - CORNER_W, 0);
    blit(blCorner, CORNER_W, CORNER_H, 0, MENU_H - CORNER_H);
    blit(brCorner, CORNER_W, CORNER_H, MENU_W - CORNER_W, MENU_H - CORNER_H);

    // Quantize menu backdrop to <= 32 colors
    quantizeBuffer(menuBuf, 32);

    // Write picture file and master
    const picPath = path.join(ROOT, 'game', 'img', 'pictures', `UF_Menu_${f.id}.png`);
    const masterPath = path.join(ROOT, 'art', 'masters', `UF_Menu_${f.id}.png`);
    writePNG(picPath, MENU_W, MENU_H, menuBuf);
    writePNG(masterPath, MENU_W, MENU_H, menuBuf);

    const sidecar = {
        name: `UF_Menu_${f.id}`,
        about: `${f.about} Full-screen 816x624 menu frame and thematic wallpaper.`,
        author: "Gemini (Google Nano Banana II)",
        date: "2026-09-19",
        frameWidth: MENU_W,
        frameHeight: MENU_H,
        anchor: [Math.floor(MENU_W / 2), MENU_H - 1],
        facings: ["S"],
        animations: { "default": [0] },
        width: MENU_W,
        height: MENU_H,
        layer: "menu_picture",
        culture: f.id,
        colors: 32,
        palette: "art/palette/uf.hex"
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `UF_Menu_${f.id}.json`), JSON.stringify(sidecar, null, 2));

    // 3. Custom Faction Cursor Icon (48x48)
    console.log(`Processing custom cursor for ${f.id}...`);
    const cc = f.cursorCrop;
    const curSample = downsampleRect(f.img, cc.x, cc.y, cc.w, cc.h, 48, 48);
    const curBuf = Buffer.alloc(48 * 48 * 4);

    // Find bounding box / alpha mask
    // We make corners transparent if near black or background
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            const r = curSample[idx], g = curSample[idx + 1], b = curSample[idx + 2];
            const lum = (r * 0.299 + g * 0.587 + b * 0.114);
            const distCenter = Math.hypot(x - 24, y - 24);
            if (lum < 20 || distCenter > 22) {
                curBuf[idx + 3] = 0; // transparent
            } else {
                const s = snap(r, g, b);
                curBuf[idx] = s[0];
                curBuf[idx + 1] = s[1];
                curBuf[idx + 2] = s[2];
                curBuf[idx + 3] = 255;
            }
        }
    }

    quantizeBuffer(curBuf, 16);

    const cursorPath = path.join(ROOT, 'game', 'img', 'system', `Cursor_${f.id}.png`);
    const cursorMasterPath = path.join(ROOT, 'art', 'masters', `Cursor_${f.id}.png`);
    writePNG(cursorPath, 48, 48, curBuf);
    writePNG(cursorMasterPath, 48, 48, curBuf);

    const cursorSidecar = {
        name: `Cursor_${f.id}`,
        about: `Custom 48x48 menu selection cursor emblem for ${f.name} culture.`,
        author: "Gemini (Google Nano Banana II)",
        date: "2026-09-19",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        facings: ["S"],
        animations: { "default": [0] },
        width: 48,
        height: 48,
        layer: "ui_cursor",
        culture: f.id,
        colors: 16,
        palette: "art/palette/uf.hex"
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `Cursor_${f.id}.json`), JSON.stringify(cursorSidecar, null, 2));
}

// 4. Generate Master Review Showcase of All 11 Full-Screen Menus
console.log('Generating review showcase of all 11 full-screen menus...');
// Grid 4 columns x 3 rows at 1/4 scale (204x156 each -> 816x468 total)
const THUMB_W = 204, THUMB_H = 156;
const SHOWCASE_W = THUMB_W * 4, SHOWCASE_H = THUMB_H * 3;
const showcaseBuf = Buffer.alloc(SHOWCASE_W * SHOWCASE_H * 4);

for (let i = 0; i < FACTIONS.length; i++) {
    const f = FACTIONS[i];
    const picPath = path.join(ROOT, 'game', 'img', 'pictures', `UF_Menu_${f.id}.png`);
    const png = decodePNG(fs.readFileSync(picPath), picPath);
    const thumb = downsampleRect(png, 0, 0, png.width, png.height, THUMB_W, THUMB_H);

    const col = i % 4;
    const row = Math.floor(i / 4);
    const dx = col * THUMB_W;
    const dy = row * THUMB_H;

    for (let ty = 0; ty < THUMB_H; ty++) {
        for (let tx = 0; tx < THUMB_W; tx++) {
            const sidx = (ty * THUMB_W + tx) * 4;
            const didx = ((dy + ty) * SHOWCASE_W + (dx + tx)) * 4;
            showcaseBuf[didx] = thumb[sidx];
            showcaseBuf[didx + 1] = thumb[sidx + 1];
            showcaseBuf[didx + 2] = thumb[sidx + 2];
            showcaseBuf[didx + 3] = 255;
        }
    }
}

const showcasePath = path.join(ROOT, 'art', 'review', 'all_factions_matching_menus_showcase.png');
writePNG(showcasePath, SHOWCASE_W, SHOWCASE_H, showcaseBuf);
console.log('Saved showcase to ' + showcasePath);

console.log('=== Finished Building Faction Menus & Cursors ===');
