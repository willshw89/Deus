const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const PALETTE_FILE = path.join(__dirname, '..', 'art', 'palette', 'uf.hex');
const paletteLines = fs.readFileSync(PALETTE_FILE, 'utf8').trim().split(/\r?\n/);
const PALETTE = paletteLines.map(line => {
    const hex = line.trim().replace('#', '');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
});
function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const palLab = PALETTE.map(c => srgbToLab(...c));
function snap(r, g, b) {
    const l = srgbToLab(r, g, b);
    let best = PALETTE[0], bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = PALETTE[i]; }
    }
    return best;
}

function resize(src, sw, sh, tw, th) {
    const out = Buffer.alloc(tw * th * 4);
    for (let y = 0; y < th; y++) {
        const y0 = Math.floor(y * sh / th), y1 = Math.floor((y + 1) * sh / th);
        for (let x = 0; x < tw; x++) {
            const x0 = Math.floor(x * sw / tw), x1 = Math.floor((x + 1) * sw / tw);
            let sr = 0, sg = 0, sb = 0, count = 0;
            for (let py = y0; py < y1 && py < sh; py++) {
                for (let px = x0; px < x1 && px < sw; px++) {
                    const idx = (py * sw + px) * 4;
                    sr += src[idx]; sg += src[idx + 1]; sb += src[idx + 2]; count++;
                }
            }
            const sn = snap(Math.round(sr / count), Math.round(sg / count), Math.round(sb / count));
            const o = (y * tw + x) * 4;
            out[o] = sn[0]; out[o + 1] = sn[1]; out[o + 2] = sn[2]; out[o + 3] = 255;
        }
    }
    return out;
}

const testDir = path.join(__dirname, '..', 'art', 'review', 'test_crops');
const m0_png = decodePNG(fs.readFileSync(path.join(testDir, 'm_0.png')), 'm_0.png');
const m4_png = decodePNG(fs.readFileSync(path.join(testDir, 'm_4.png')), 'm_4.png');

// Direct resize to 144x144
const m0_144 = resize(m0_png.data, m0_png.width, m0_png.height, 144, 144);
const m4_144 = resize(m4_png.data, m4_png.width, m4_png.height, 144, 144);

writePNG(path.join(testDir, 'm0_144.png'), 144, 144, m0_144);
writePNG(path.join(testDir, 'm4_144.png'), 144, 144, m4_144);
console.log('Saved 144x144 test crops');
