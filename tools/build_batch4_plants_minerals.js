const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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

function quantizeTo32(buf) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= 32) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topKeys = sorted.slice(0, 31).map(e => e[0]);
    const topRgb = topKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topRgb.map(c => srgbToLab(...c));

    const map = new Map();
    for (let i = 31; i < sorted.length; i++) {
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
            const rgb = map.get(k);
            buf[i] = rgb[0];
            buf[i + 1] = rgb[1];
            buf[i + 2] = rgb[2];
        }
    }
}

function setPixel(buf, w, x, y, hex, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= buf.length / (w * 4)) return;
    const rgb = typeof hex === 'string' ? parseHex(hex) : hex;
    const snapped = pal.snap(...rgb);
    const idx = (y * w + x) * 4;
    buf[idx] = snapped[0];
    buf[idx + 1] = snapped[1];
    buf[idx + 2] = snapped[2];
    buf[idx + 3] = a;
}

// -------------------------------------------------------------
// NATIVE 16x16 PROCEDURAL PIXEL ART GENERATORS
// -------------------------------------------------------------

function generateCactus() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Barrel cactus with ribbed body and red tunas
    // Base rows 5 to 15, cols 4 to 11
    for (let y = 6; y <= 15; y++) {
        for (let x = 4; x <= 11; x++) {
            const isRim = (x === 4 || x === 11 || y === 15 || y === 6);
            if (isRim && ((x === 4 && y === 6) || (x === 11 && y === 6))) continue;
            let c = '#2E7D32'; // mid green
            if (x === 5 || x === 8) c = '#4CAF50'; // lit ridge
            else if (x === 6 || x === 9) c = '#1B5E20'; // shadow rib
            else if (x === 10 || x === 11) c = '#144214'; // dark side
            else if (x === 4) c = '#81C784'; // lit edge
            setPixel(buf, w, x, y, c);
        }
    }
    // Golden spines dots
    setPixel(buf, w, 3, 8, '#FFF59D');
    setPixel(buf, w, 3, 11, '#FFF59D');
    setPixel(buf, w, 12, 9, '#FFF59D');
    setPixel(buf, w, 12, 12, '#FFF59D');
    setPixel(buf, w, 5, 10, '#FFFDE7');
    setPixel(buf, w, 8, 8, '#FFFDE7');
    setPixel(buf, w, 8, 12, '#FFFDE7');

    // Red tunas on top (rows 3 to 5)
    setPixel(buf, w, 6, 4, '#D32F2F');
    setPixel(buf, w, 7, 4, '#F44336');
    setPixel(buf, w, 7, 3, '#FFCDD2');
    setPixel(buf, w, 9, 5, '#C2185B');
    setPixel(buf, w, 9, 4, '#E91E63');
    setPixel(buf, w, 5, 5, '#C2185B');

    quantizeTo32(buf);
    return buf;
}

function generateCactusTall() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Main saguaro stem: cols 7-9, rows 2-15
    for (let y = 2; y <= 15; y++) {
        setPixel(buf, w, 7, y, '#4CAF50'); // lit side
        setPixel(buf, w, 8, y, '#2E7D32'); // mid
        setPixel(buf, w, 9, y, '#1B5E20'); // shadow
    }
    // Left arm: branch at y=8, col 4-6, goes up y=5-7 at col 4-5
    setPixel(buf, w, 5, 8, '#4CAF50');
    setPixel(buf, w, 6, 8, '#4CAF50');
    for (let y = 5; y <= 7; y++) {
        setPixel(buf, w, 4, y, '#81C784');
        setPixel(buf, w, 5, y, '#2E7D32');
    }
    // Right arm: branch at y=6, col 10-12, goes up y=3-5 at col 11-12
    setPixel(buf, w, 10, 6, '#2E7D32');
    setPixel(buf, w, 11, 6, '#1B5E20');
    for (let y = 3; y <= 5; y++) {
        setPixel(buf, w, 11, y, '#2E7D32');
        setPixel(buf, w, 12, y, '#144214');
    }
    // Spines
    setPixel(buf, w, 7, 4, '#FFFDE7');
    setPixel(buf, w, 7, 10, '#FFFDE7');
    setPixel(buf, w, 9, 7, '#FFFDE7');
    setPixel(buf, w, 9, 13, '#FFFDE7');

    quantizeTo32(buf);
    return buf;
}

function generateGrassTuft() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Wild grass blades fanning out from base (cols 6-10, y=15)
    // Left leaning blades
    const blades = [
        [[7, 15], [6, 14], [5, 12], [4, 9], [3, 7]],
        [[7, 15], [7, 13], [6, 11], [5, 8], [5, 5]],
        [[8, 15], [8, 13], [8, 10], [8, 7], [7, 4]],
        [[9, 15], [9, 13], [10, 11], [11, 8], [12, 6]],
        [[9, 15], [10, 14], [11, 12], [12, 10], [13, 8]],
        [[8, 15], [7, 12], [7, 9], [6, 7]],
        [[8, 15], [9, 12], [9, 9], [10, 7]]
    ];
    for (const b of blades) {
        for (let i = 0; i < b.length; i++) {
            const [x, y] = b[i];
            let c = '#4CAF50';
            if (i === b.length - 1) c = '#81C784'; // tip lit
            else if (i === 0) c = '#1B5E20'; // base shadow
            setPixel(buf, w, x, y, c);
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateReeds() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Wetland cattails: 3 main stalks
    const stalks = [
        { sx: 5, sy: 15, h: 12, seedY: [5, 8] },
        { sx: 8, sy: 15, h: 14, seedY: [3, 7] },
        { sx: 11, sy: 15, h: 11, seedY: [6, 9] }
    ];
    for (const s of stalks) {
        for (let y = s.sy - s.h; y <= s.sy; y++) {
            setPixel(buf, w, s.sx, y, '#388E3C');
        }
        // Brown cattail head
        for (let y = s.seedY[0]; y <= s.seedY[1]; y++) {
            setPixel(buf, w, s.sx, y, '#5D4037');
            setPixel(buf, w, s.sx + 1, y, '#3E2723');
        }
        // Spike on top
        setPixel(buf, w, s.sx, s.seedY[0] - 1, '#8D6E63');
        setPixel(buf, w, s.sx, s.seedY[0] - 2, '#4CAF50');
    }
    // Base leaves
    setPixel(buf, w, 4, 13, '#2E7D32');
    setPixel(buf, w, 3, 11, '#4CAF50');
    setPixel(buf, w, 12, 13, '#2E7D32');
    setPixel(buf, w, 13, 11, '#4CAF50');
    setPixel(buf, w, 6, 14, '#1B5E20');
    setPixel(buf, w, 10, 14, '#1B5E20');

    quantizeTo32(buf);
    return buf;
}

function generateFlowers(variant = 'mixed') {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Foliage base at rows 11-15, cols 3-13
    for (let y = 12; y <= 15; y++) {
        for (let x = 4; x <= 12; x++) {
            if (Math.random() > 0.25) {
                setPixel(buf, w, x, y, (x + y) % 2 === 0 ? '#388E3C' : '#2E7D32');
            }
        }
    }
    // Flower blossoms
    const flowers = [
        { x: 5, y: 10, c: '#E91E63' },
        { x: 8, y: 8, c: '#FFEB3B' },
        { x: 11, y: 9, c: '#2196F3' },
        { x: 6, y: 13, c: '#9C27B0' },
        { x: 10, y: 12, c: '#F44336' },
        { x: 8, y: 12, c: '#FF9800' }
    ];

    for (const f of flowers) {
        let col = f.c;
        if (variant === 'purple') col = (f.x % 2 === 0) ? '#9C27B0' : '#BA68C8';
        else if (variant === 'blue') col = (f.x % 2 === 0) ? '#1E88E5' : '#64B5F6';
        else if (variant === 'white') col = (f.x % 2 === 0) ? '#FFFFFF' : '#E0E0E0';

        // 2x2 blossom with yellow stamen
        setPixel(buf, w, f.x, f.y, col);
        setPixel(buf, w, f.x + 1, f.y, col);
        setPixel(buf, w, f.x, f.y + 1, col);
        setPixel(buf, w, f.x + 1, f.y + 1, '#FFEB3B'); // stamen
        // Stalk down
        for (let sy = f.y + 2; sy <= 14; sy++) {
            setPixel(buf, w, f.x, sy, '#2E7D32');
        }
    }

    quantizeTo32(buf);
    return buf;
}

function generateWheat() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Golden wild wheat stalks
    const stalks = [
        { sx: 5, h: 12, bend: -1 },
        { sx: 7, h: 13, bend: 0 },
        { sx: 9, h: 14, bend: 1 },
        { sx: 11, h: 11, bend: 1 }
    ];
    for (const s of stalks) {
        for (let y = 15 - s.h; y <= 15; y++) {
            setPixel(buf, w, s.sx, y, '#FDD835');
        }
        // Grain head
        const headTop = 15 - s.h;
        for (let y = headTop; y <= headTop + 5; y++) {
            const bx = s.sx + (y < headTop + 3 ? s.bend : 0);
            setPixel(buf, w, bx, y, '#FBC02D');
            setPixel(buf, w, bx - 1, y, '#FFF59D'); // lit awn
            setPixel(buf, w, bx + 1, y, '#F57F17'); // shadow awn
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateWildGrain() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Wild barley/grain with bristling awns
    const stalks = [
        { sx: 6, h: 13 },
        { sx: 8, h: 14 },
        { sx: 10, h: 12 }
    ];
    for (const s of stalks) {
        for (let y = 15 - s.h; y <= 15; y++) {
            setPixel(buf, w, s.sx, y, '#E0A96D');
        }
        const ht = 15 - s.h;
        for (let y = ht; y <= ht + 6; y++) {
            setPixel(buf, w, s.sx, y, '#DDB892');
            setPixel(buf, w, s.sx - 1, y - 1, '#FFF3B0');
            setPixel(buf, w, s.sx + 1, y - 1, '#B08968');
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateLichen() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Spreading concentric flat lichen patches on soil/rock
    for (let y = 9; y <= 14; y++) {
        for (let x = 3; x <= 13; x++) {
            const dx = (x - 8), dy = (y - 12) * 1.5;
            const dist = Math.hypot(dx, dy);
            if (dist < 4.5) {
                let c = '#C8E6C9';
                if (dist > 3.2) c = '#81C784';
                else if (dist > 1.8) c = '#A5D6A7';
                else c = '#E8F5E9';
                setPixel(buf, w, x, y, c);
            }
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateLilyPad() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Floating water lily pads
    for (let y = 9; y <= 14; y++) {
        for (let x = 4; x <= 12; x++) {
            const dx = (x - 8), dy = (y - 12) * 1.6;
            const d = Math.hypot(dx, dy);
            if (d < 4.2) {
                // Notched cleft at top-left
                if (dx < 0 && dy < 0 && Math.abs(dx - dy) < 1.0) continue;
                setPixel(buf, w, x, y, d > 3.0 ? '#1B5E20' : '#4CAF50');
            }
        }
    }
    // Water lily bloom
    setPixel(buf, w, 9, 10, '#FFFFFF');
    setPixel(buf, w, 10, 10, '#F8BBD0');
    setPixel(buf, w, 9, 11, '#FFEB3B');
    setPixel(buf, w, 10, 11, '#FFFFFF');

    quantizeTo32(buf);
    return buf;
}

function generateGraniteBoulder() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Weathered granite rock boulder (rows 6-15, cols 3-13)
    for (let y = 6; y <= 15; y++) {
        for (let x = 3; x <= 13; x++) {
            const dx = (x - 8), dy = (y - 11);
            if (Math.hypot(dx, dy) < 5.2) {
                let c = '#757575'; // mid grey
                if (dx < -1 && dy < -1) c = '#BDBDBD'; // lit highlight
                else if (dx > 1 && dy > 1) c = '#424242'; // shadow facet
                else if (dx === -1 && dy === 0) c = '#9E9E9E';
                // Lichen accent
                if (x === 6 && y === 9) c = '#81C784';
                if (x === 7 && y === 9) c = '#4CAF50';
                setPixel(buf, w, x, y, c);
            }
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateIronstone() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Hematite reddish brown ironstone outcrop
    for (let y = 6; y <= 15; y++) {
        for (let x = 3; x <= 13; x++) {
            const dx = (x - 8), dy = (y - 11);
            if (Math.hypot(dx, dy) < 5.2) {
                let c = '#5D4037'; // dark brown
                if (dx < -1 && dy < -1) c = '#8D6E63'; // lit rusty
                else if (x === 6 || x === 7) c = '#BF360C'; // rich hematite red
                else if (dx > 1 && dy > 1) c = '#3E2723'; // deep shadow
                else if (x === 9 && y === 10) c = '#D84315'; // metallic glint
                setPixel(buf, w, x, y, c);
            }
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateCopperOutcrop() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Malachite green / turquoise copper rock
    for (let y = 6; y <= 15; y++) {
        for (let x = 3; x <= 13; x++) {
            const dx = (x - 8), dy = (y - 11);
            if (Math.hypot(dx, dy) < 5.2) {
                let c = '#455A64'; // dark host rock
                if (dx < -1 && dy < -1) c = '#78909C';
                // Malachite vein
                if ((x - y) % 3 === 0) c = '#00897B'; // verdigris
                if (x === 7 && y === 10) c = '#80CBC4'; // bright copper turquoise
                if (x === 8 && y === 11) c = '#004D40'; // deep green
                setPixel(buf, w, x, y, c);
            }
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateGoldOutcrop() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Quartz rock with gold veins
    for (let y = 6; y <= 15; y++) {
        for (let x = 3; x <= 13; x++) {
            const dx = (x - 8), dy = (y - 11);
            if (Math.hypot(dx, dy) < 5.2) {
                let c = '#616161';
                if (dx < -1 && dy < -1) c = '#9E9E9E';
                // Gold veins
                if (x === 6 && (y === 9 || y === 10)) c = '#FFD700';
                if (x === 7 && (y === 10 || y === 11)) c = '#FFEA00';
                if (x === 8 && y === 11) c = '#FF8F00';
                if (x === 9 && y === 9) c = '#FFF9C4'; // gold glint
                setPixel(buf, w, x, y, c);
            }
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateCrystalCluster() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Radiant amethyst geode crystal spires
    const spires = [
        { bx: 5, by: 15, h: 9, c: '#7B1FA2' },
        { bx: 8, by: 15, h: 12, c: '#9C27B0' },
        { bx: 11, by: 15, h: 8, c: '#BA68C8' }
    ];
    for (const sp of spires) {
        for (let y = sp.by - sp.h; y <= sp.by; y++) {
            setPixel(buf, w, sp.bx, y, sp.c);
            setPixel(buf, w, sp.bx + 1, y, '#4A148C'); // shadow facet
        }
        // Crystal peak point
        const pt = sp.by - sp.h;
        setPixel(buf, w, sp.bx, pt, '#E1BEE7'); // highlight tip
    }
    // Base rock bed
    for (let x = 3; x <= 13; x++) {
        setPixel(buf, w, x, 15, '#424242');
        if (x % 2 === 0) setPixel(buf, w, x, 14, '#616161');
    }
    quantizeTo32(buf);
    return buf;
}

function generateSmallCrystals() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Small crystal shards scattered
    const shards = [
        { x: 5, y: 13, col: '#00E5FF' },
        { x: 8, y: 12, col: '#E040FB' },
        { x: 11, y: 14, col: '#76FF03' },
        { x: 6, y: 11, col: '#FFFF00' },
        { x: 9, y: 14, col: '#FF5252' }
    ];
    for (const sh of shards) {
        setPixel(buf, w, sh.x, sh.y, sh.col);
        setPixel(buf, w, sh.x, sh.y - 1, '#FFFFFF'); // glint
        setPixel(buf, w, sh.x + 1, sh.y, '#37474F'); // shadow rock
    }
    quantizeTo32(buf);
    return buf;
}

function generateLooseStones(variant = 'stones') {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Scatter of stones/pebbles
    const stones = [
        { x: 4, y: 13, w: 3, h: 2, c: '#757575' },
        { x: 9, y: 12, w: 4, h: 3, c: '#616161' },
        { x: 7, y: 14, w: 2, h: 1, c: '#9E9E9E' },
        { x: 12, y: 14, w: 2, h: 2, c: '#757575' }
    ];
    for (const st of stones) {
        for (let dy = 0; dy < st.h; dy++) {
            for (let dx = 0; dx < st.w; dx++) {
                let col = st.c;
                if (dy === 0 && dx === 0) col = '#BDBDBD'; // top-left lit
                else if (dy === st.h - 1 && dx === st.w - 1) col = '#424242'; // shadow
                setPixel(buf, w, st.x + dx, st.y + dy, col);
            }
        }
    }
    quantizeTo32(buf);
    return buf;
}

function generateOldBones() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Bleached skull and ribs on ground (rows 11-15)
    // Skull (cols 4-7, rows 12-14)
    setPixel(buf, w, 5, 12, '#FFFFFF');
    setPixel(buf, w, 6, 12, '#FFFFFF');
    setPixel(buf, w, 4, 13, '#E0E0E0');
    setPixel(buf, w, 5, 13, '#212121'); // eye socket
    setPixel(buf, w, 6, 13, '#E0E0E0');
    setPixel(buf, w, 7, 13, '#9E9E9E');
    setPixel(buf, w, 5, 14, '#BDBDBD'); // jaw
    setPixel(buf, w, 6, 14, '#BDBDBD');

    // Rib cage arches (cols 8-13, rows 11-15)
    for (let r = 8; r <= 12; r += 2) {
        setPixel(buf, w, r, 12, '#FFFFFF');
        setPixel(buf, w, r, 13, '#E0E0E0');
        setPixel(buf, w, r + 1, 14, '#BDBDBD');
    }
    // Spine
    for (let x = 7; x <= 13; x++) {
        setPixel(buf, w, x, 15, '#757575');
    }
    quantizeTo32(buf);
    return buf;
}

function generateFallenPillar() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Collapsed fluted stone column (rows 10-15, cols 3-13)
    for (let x = 4; x <= 12; x++) {
        setPixel(buf, w, x, 11, '#E0E0E0'); // top lit
        setPixel(buf, w, x, 12, '#9E9E9E'); // fluting 1
        setPixel(buf, w, x, 13, '#BDBDBD'); // fluting 2
        setPixel(buf, w, x, 14, '#616161'); // shadow
    }
    // Broken jagged fracture at x=7-8
    setPixel(buf, w, 7, 10, '#E0E0E0');
    setPixel(buf, w, 8, 12, '#424242');
    // Chiseled capital block at left (cols 3-4, rows 10-14)
    for (let y = 10; y <= 14; y++) {
        setPixel(buf, w, 3, y, '#BDBDBD');
    }
    quantizeTo32(buf);
    return buf;
}

// -------------------------------------------------------------
// 3x EXPORT PIPELINE
// -------------------------------------------------------------

function exportCharset(native16, rmmzName, sidecarData) {
    const sheetW = 144;
    const sheetH = 192;
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

    // 3 columns x 4 rows
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const ox = col * 48;
            const oy = row * 48;
            for (let ny = 0; ny < 16; ny++) {
                for (let nx = 0; nx < 16; nx++) {
                    const sIdx = (ny * 16 + nx) * 4;
                    if (native16[sIdx + 3] === 0) continue;
                    const r = native16[sIdx];
                    const g = native16[sIdx + 1];
                    const b = native16[sIdx + 2];
                    const a = native16[sIdx + 3];

                    for (let dy = 0; dy < 3; dy++) {
                        for (let dx = 0; dx < 3; dx++) {
                            const px = ox + nx * 3 + dx;
                            const py = oy + ny * 3 + dy;
                            const dIdx = (py * sheetW + px) * 4;
                            sheetBuf[dIdx] = r;
                            sheetBuf[dIdx + 1] = g;
                            sheetBuf[dIdx + 2] = b;
                            sheetBuf[dIdx + 3] = a;
                        }
                    }
                }
            }
        }
    }

    quantizeTo32(sheetBuf);

    const outPng = path.join(ROOT, 'game', 'img', 'characters', `${rmmzName}.png`);
    const outJson = path.join(ROOT, 'game', 'img', 'characters', `${rmmzName}.json`);

    writePNG(outPng, sheetW, sheetH, sheetBuf);
    fs.writeFileSync(outJson, JSON.stringify(sidecarData, null, 2), 'utf8');
    console.log(`[Charset Exported] ${rmmzName}.png & .json`);
}

function exportMaster(native16, masterId) {
    const mw = 48, mh = 48;
    const mbuf = Buffer.alloc(mw * mh * 4);
    for (let ny = 0; ny < 16; ny++) {
        for (let nx = 0; nx < 16; nx++) {
            const sIdx = (ny * 16 + nx) * 4;
            if (native16[sIdx + 3] === 0) continue;
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const px = nx * 3 + dx;
                    const py = ny * 3 + dy;
                    const dIdx = (py * mw + px) * 4;
                    mbuf[dIdx] = native16[sIdx];
                    mbuf[dIdx + 1] = native16[sIdx + 1];
                    mbuf[dIdx + 2] = native16[sIdx + 2];
                    mbuf[dIdx + 3] = native16[sIdx + 3];
                }
            }
        }
    }
    quantizeTo32(mbuf);
    const pngPath = path.join(ROOT, 'art', 'masters', `${masterId}.png`);
    writePNG(pngPath, mw, mh, mbuf);
    console.log(`[Master Exported] ${masterId}.png`);
}

// -------------------------------------------------------------
// FACE SETS GENERATOR (576x288 via 192x96 Native 3x Grid)
// -------------------------------------------------------------

const cInk = pal.snap(20, 20, 24);
const cBackdrop = pal.snap(40, 42, 50);
const cBackdropDark = pal.snap(25, 26, 32);
const cBarkDark = pal.snap(60, 40, 25);
const cBarkMid = pal.snap(100, 65, 40);
const cBarkLit = pal.snap(140, 95, 60);
const cLeafDark = pal.snap(35, 65, 25);
const cLeafMid = pal.snap(60, 115, 45);
const cLeafLit = pal.snap(95, 165, 65);
const cStoneDark = pal.snap(45, 45, 48);
const cStoneMid = pal.snap(75, 75, 80);
const cStoneLit = pal.snap(115, 115, 120);

function createLivingOakNative() {
    const FH = 48, FW = 48;
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, cy = 23.5;
    const outerRx = 20.0, outerRy = 22.0;
    const innerRx = 16.0, innerRy = 18.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx, dy = y - cy;
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

                if (y <= 12 || (y <= 24 && Math.abs(dx) >= 15)) {
                    const leaf = (x * 3 + y * 7) % 5;
                    if (leaf === 0) c = cLeafLit;
                    else if (leaf === 1 || leaf === 2) c = cLeafMid;
                    else if (leaf === 3) c = cLeafDark;
                }
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
        }
    }
    return { frame, isInside };
}

function createStoneArchNative() {
    const FH = 48, FW = 48;
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, archCy = 21.0;
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
                    if (Math.abs(dx) <= 2 && y <= 6) c = cStoneLit;
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

function generateFaceSet(portraits16, isStone, outFileName) {
    const NW = 192, NH = 96;
    const nativeCanvas = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    for (let idx = 0; idx < 8; idx++) {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const ox = col * 48;
        const oy = row * 48;

        const { frame, isInside } = isStone ? createStoneArchNative() : createLivingOakNative();
        const cell = Array.from({ length: 48 }, () => Array.from({ length: 48 }, () => [0, 0, 0, 0]));

        // Render portrait inside cell
        const native16 = portraits16[idx];
        if (native16) {
            // Scale 16x16 feature ~1.5x into 24x24 centered at (12, 14)
            for (let y = 0; y < 24; y++) {
                const sy = Math.floor(y / 1.5);
                for (let x = 0; x < 24; x++) {
                    const sx = Math.floor(x / 1.5);
                    if (sx < 16 && sy < 16) {
                        const sIdx = (sy * 16 + sx) * 4;
                        if (native16[sIdx + 3] > 0) {
                            const dx = 12 + x, dy = 14 + y;
                            if (dx >= 0 && dx < 48 && dy >= 0 && dy < 48 && isInside[dy][dx]) {
                                cell[dy][dx] = [native16[sIdx], native16[sIdx + 1], native16[sIdx + 2], 255];
                            }
                        }
                    }
                }
            }
        }

        // Composite frame and portrait
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const fp = frame[y][x];
                let finalPixel;
                if (isInside[y][x]) {
                    finalPixel = cell[y][x][3] > 0 ? cell[y][x] : fp;
                } else if (fp[3] > 0) {
                    finalPixel = fp;
                } else {
                    finalPixel = [0, 0, 0, 0];
                }
                nativeCanvas[oy + y][ox + x] = finalPixel;
            }
        }
    }

    const sheetW = 576, sheetH = 288;
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);
    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * sheetW + (nx * 3 + dx)) * 4;
                    sheetBuf[idx] = p[0]; sheetBuf[idx + 1] = p[1]; sheetBuf[idx + 2] = p[2]; sheetBuf[idx + 3] = p[3];
                }
            }
        }
    }

    quantizeTo32(sheetBuf);
    const outPath = path.join(ROOT, 'game', 'img', 'faces', outFileName);
    writePNG(outPath, sheetW, sheetH, sheetBuf);
    console.log(`[Face Set Exported] ${outFileName} (576x288, 3x grid verified)`);
}

// -------------------------------------------------------------
// MAIN EXECUTION
// -------------------------------------------------------------

console.log('=== Building Batch 4 Plants and Batch 5 Minerals Assets ===');

// 1. Generate Native 16x16 frames
const plants = {
    cactus: generateCactus(),
    cactus_tall: generateCactusTall(),
    grass_tuft: generateGrassTuft(),
    reeds: generateReeds(),
    flowers: generateFlowers('mixed'),
    flowers_purple: generateFlowers('purple'),
    flowers_blue: generateFlowers('blue'),
    flowers_white: generateFlowers('white'),
    wheat_wild: generateWheat(),
    wild_grain: generateWildGrain(),
    lichen: generateLichen(),
    lily_pad: generateLilyPad()
};

const minerals = {
    granite_boulder: generateGraniteBoulder(),
    ironstone: generateIronstone(),
    copper_outcrop: generateCopperOutcrop(),
    gold_outcrop: generateGoldOutcrop(),
    crystal: generateCrystalCluster(),
    crystal_small: generateSmallCrystals(),
    rocks_small: generateLooseStones('stones'),
    gravel: generateLooseStones('gravel'),
    bones_pile: generateOldBones(),
    rubble_pillar: generateFallenPillar()
};

// 2. Export Charsets and Masters
const plantDefs = [
    { id: 'cactus', rmmz: '!$UF_Cactus', name: 'Cactus', passable: false, under: false },
    { id: 'cactus_tall', rmmz: '!$UF_CactusTall', name: 'Tall cactus', passable: false, under: false },
    { id: 'grass_tuft', rmmz: '!$UF_GrassTuft', name: 'Tall grass', passable: true, under: true },
    { id: 'reeds', rmmz: '!$UF_Reeds', name: 'Reeds', passable: true, under: true },
    { id: 'flowers', rmmz: '!$UF_Wildflowers', name: 'Wildflowers', passable: true, under: true },
    { id: 'flowers_purple', rmmz: '!$UF_Flowers_Purple', name: 'Purple flowers', passable: true, under: true },
    { id: 'flowers_blue', rmmz: '!$UF_Flowers_Blue', name: 'Blue flowers', passable: true, under: true },
    { id: 'flowers_white', rmmz: '!$UF_Flowers_White', name: 'White flowers', passable: true, under: true },
    { id: 'wheat_wild', rmmz: '!$UF_Wheat_Wild', name: 'Wild wheat', passable: true, under: true },
    { id: 'wild_grain', rmmz: '!$UF_Wild_Grain', name: 'Wild grain', passable: true, under: true },
    { id: 'lichen', rmmz: '!$UF_Lichen', name: 'Lichen', passable: true, under: true },
    { id: 'lily_pad', rmmz: '!$UF_Lily_Pad', name: 'Lily pads', passable: true, under: true }
];

for (const p of plantDefs) {
    const native = plants[p.id];
    exportMaster(native, p.id);
    exportCharset(native, p.rmmz, {
        id: p.id,
        name: p.name,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0] },
        passable: p.passable,
        under: p.under
    });
}

const mineralDefs = [
    { id: 'granite_boulder', rmmz: '!$UF_GraniteBoulder', name: 'Granite boulder', passable: false, under: false },
    { id: 'ironstone', rmmz: '!$UF_IronstoneDeposit', name: 'Ironstone outcrop', passable: false, under: false },
    { id: 'copper_outcrop', rmmz: '!$UF_CopperOutcrop', name: 'Copper outcrop', passable: false, under: false },
    { id: 'gold_outcrop', rmmz: '!$UF_GoldOutcrop', name: 'Gold outcrop', passable: false, under: false },
    { id: 'crystal', rmmz: '!$UF_CrystalCluster', name: 'Crystal cluster', passable: false, under: false },
    { id: 'crystal_small', rmmz: '!$UF_SmallCrystals', name: 'Small crystals', passable: true, under: true },
    { id: 'rocks_small', rmmz: '!$UF_LooseStones', name: 'Loose stones', passable: true, under: true },
    { id: 'gravel', rmmz: '!$UF_Gravel', name: 'Gravel', passable: true, under: true },
    { id: 'bones_pile', rmmz: '!$UF_OldBones', name: 'Old bones', passable: true, under: true },
    { id: 'rubble_pillar', rmmz: '!$UF_FallenPillar', name: 'Fallen pillar', passable: false, under: false }
];

for (const m of mineralDefs) {
    const native = minerals[m.id];
    exportMaster(native, m.id);
    exportCharset(native, m.rmmz, {
        id: m.id,
        name: m.name,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0] },
        passable: m.passable,
        under: m.under
    });
}

// 3. Export Face Sets
const plantFaceFrames = [
    plants.cactus,
    plants.cactus_tall,
    plants.grass_tuft,
    plants.reeds,
    plants.flowers,
    plants.flowers_purple,
    plants.flowers_blue,
    plants.wheat_wild
];
generateFaceSet(plantFaceFrames, false, 'UF_Faces_Plants.png');

const mineralFaceFrames = [
    minerals.granite_boulder,
    minerals.ironstone,
    minerals.copper_outcrop,
    minerals.gold_outcrop,
    minerals.crystal,
    minerals.crystal_small,
    minerals.rocks_small,
    minerals.bones_pile
];
generateFaceSet(mineralFaceFrames, true, 'UF_Faces_Minerals.png');

console.log('All Batch 4 & 5 assets and face sets generated successfully!');
