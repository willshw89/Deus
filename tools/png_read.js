'use strict';
// tools/png_read.js: a dependency-free PNG decoder (Node's zlib only).
// Decodes gray (1/2/4/8/16-bit), RGB (8/16), palette (1/2/4/8), gray+alpha (8/16)
// and RGBA (8/16) PNGs, every scanline filter (None, Sub, Up, Average, Paeth),
// tRNS transparency (palette alpha and colour-key) and Adam7 interlace, to an
// 8-bit RGBA buffer. 16-bit samples keep their high byte. CRCs are not verified.
//
// Companion of tools/png_util.js (writePNG). Used by tools/art_check.js.
//
//   const { readPNG } = require('./png_read');
//   const img = readPNG('game/img/characters/$Adam.png');
//   img.width, img.height, img.data (Buffer, width*height*4 RGBA), img.px(x, y) -> [r, g, b, a]

const fs = require('fs');
const zlib = require('zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const ALLOWED_DEPTHS = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
// Adam7 passes: [x start, y start, x step, y step]
const ADAM7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];

function readPNG(file) {
    return decodePNG(fs.readFileSync(file), file);
}

function decodePNG(buf, label) {
    label = label || 'png';
    if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) {
        throw new Error(`${label}: not a PNG (bad signature)`);
    }
    let pos = 8;
    let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
    let sawIHDR = false;
    const idat = [];
    let plte = null, trns = null;
    while (pos + 8 <= buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        if (pos + 12 + len > buf.length) throw new Error(`${label}: truncated ${type} chunk`);
        const data = buf.subarray(pos + 8, pos + 8 + len);
        if (type === 'IHDR') {
            if (len !== 13) throw new Error(`${label}: IHDR is ${len} bytes, expected 13`);
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            depth = data[8];
            colorType = data[9];
            if (data[10] !== 0) throw new Error(`${label}: unknown compression method ${data[10]}`);
            if (data[11] !== 0) throw new Error(`${label}: unknown filter method ${data[11]}`);
            interlace = data[12];
            sawIHDR = true;
        } else if (type === 'PLTE') {
            plte = data;
        } else if (type === 'tRNS') {
            trns = data;
        } else if (type === 'IDAT') {
            idat.push(data);
        } else if (type === 'IEND') {
            break;
        }
        pos += 12 + len;
    }
    if (!sawIHDR) throw new Error(`${label}: no IHDR chunk`);
    if (!(colorType in CHANNELS)) throw new Error(`${label}: unknown colour type ${colorType}`);
    if (!ALLOWED_DEPTHS[colorType].includes(depth)) {
        throw new Error(`${label}: bit depth ${depth} is not valid for colour type ${colorType}`);
    }
    if (interlace !== 0 && interlace !== 1) throw new Error(`${label}: unknown interlace method ${interlace}`);
    if (colorType === 3 && !plte) throw new Error(`${label}: palette image without a PLTE chunk`);
    if (width === 0 || height === 0) throw new Error(`${label}: zero-sized image (${width}x${height})`);
    if (idat.length === 0) throw new Error(`${label}: no IDAT chunk`);

    const raw = zlib.inflateSync(Buffer.concat(idat));
    const channels = CHANNELS[colorType];
    const bitsPerPixel = channels * depth;
    const bpp = Math.max(1, Math.ceil(bitsPerPixel / 8)); // filter byte distance
    const out = Buffer.alloc(width * height * 4);

    // Colour-key transparency (gray / RGB) compares raw samples at the file's depth.
    let keyGray = -1, keyR = -1, keyG = -1, keyB = -1;
    if (trns && colorType === 0 && trns.length >= 2) keyGray = trns.readUInt16BE(0);
    if (trns && colorType === 2 && trns.length >= 6) {
        keyR = trns.readUInt16BE(0); keyG = trns.readUInt16BE(2); keyB = trns.readUInt16BE(4);
    }
    const maxSample = (1 << depth) - 1;

    // Reads sample `s` (0-based across the row) from an unfiltered scanline, at native depth.
    function sample(line, s) {
        if (depth === 8) return line[s];
        if (depth === 16) return (line[s * 2] << 8) | line[s * 2 + 1];
        const bit = s * depth;
        return (line[bit >> 3] >> (8 - depth - (bit & 7))) & maxSample;
    }
    function to8(v) {
        if (depth === 8) return v;
        if (depth === 16) return v >> 8;
        return Math.round(v * 255 / maxSample);
    }

    function putPixel(line, sx, x, y) {
        let r, g, b, a = 255;
        if (colorType === 6) {
            r = to8(sample(line, sx * 4)); g = to8(sample(line, sx * 4 + 1));
            b = to8(sample(line, sx * 4 + 2)); a = to8(sample(line, sx * 4 + 3));
        } else if (colorType === 2) {
            const rs = sample(line, sx * 3), gs = sample(line, sx * 3 + 1), bs = sample(line, sx * 3 + 2);
            r = to8(rs); g = to8(gs); b = to8(bs);
            if (rs === keyR && gs === keyG && bs === keyB) a = 0;
        } else if (colorType === 3) {
            const idx = sample(line, sx);
            if (idx * 3 + 2 >= plte.length) throw new Error(`${label}: palette index ${idx} outside PLTE (${plte.length / 3} entries)`);
            r = plte[idx * 3]; g = plte[idx * 3 + 1]; b = plte[idx * 3 + 2];
            if (trns && idx < trns.length) a = trns[idx];
        } else if (colorType === 4) {
            r = g = b = to8(sample(line, sx * 2)); a = to8(sample(line, sx * 2 + 1));
        } else {
            const v = sample(line, sx);
            r = g = b = to8(v);
            if (v === keyGray) a = 0;
        }
        const o = (y * width + x) * 4;
        out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
    }

    // Unfilters `ph` scanlines of `pw` pixels starting at raw[offset]; calls place(line, rowIndex).
    function unfilterPass(offset, pw, ph, place) {
        const stride = Math.ceil(pw * bitsPerPixel / 8);
        let prev = Buffer.alloc(stride);
        let q = offset;
        for (let y = 0; y < ph; y++) {
            if (q + 1 + stride > raw.length) throw new Error(`${label}: image data ends early (row ${y})`);
            const filter = raw[q++];
            const line = Buffer.from(raw.subarray(q, q + stride));
            q += stride;
            if (filter > 4) throw new Error(`${label}: unknown scanline filter ${filter} on row ${y}`);
            for (let i = 0; i < stride; i++) {
                const a = i >= bpp ? line[i - bpp] : 0;
                const b = prev[i];
                const c = i >= bpp ? prev[i - bpp] : 0;
                let v = line[i];
                if (filter === 1) v += a;
                else if (filter === 2) v += b;
                else if (filter === 3) v += (a + b) >> 1;
                else if (filter === 4) {
                    const p = a + b - c;
                    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                    v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                }
                line[i] = v & 255;
            }
            place(line, y);
            prev = line;
        }
        return q;
    }

    if (interlace === 0) {
        unfilterPass(0, width, height, (line, y) => {
            for (let x = 0; x < width; x++) putPixel(line, x, x, y);
        });
    } else {
        let offset = 0;
        for (const [x0, y0, dx, dy] of ADAM7) {
            const pw = Math.ceil((width - x0) / dx);
            const ph = Math.ceil((height - y0) / dy);
            if (pw <= 0 || ph <= 0) continue;
            offset = unfilterPass(offset, pw, ph, (line, py) => {
                for (let px = 0; px < pw; px++) putPixel(line, px, x0 + px * dx, y0 + py * dy);
            });
        }
    }

    return {
        width, height, w: width, h: height,
        colorType, bitDepth: depth, interlaced: interlace === 1,
        data: out,
        px(x, y) { const o = (y * width + x) * 4; return [out[o], out[o + 1], out[o + 2], out[o + 3]]; },
        alpha(x, y) { return out[(y * width + x) * 4 + 3]; }
    };
}

module.exports = { readPNG, decodePNG };

if (require.main === module) {
    // node tools/png_read.js <png> ['[[x,y],...]']  -> prints the size and the listed pixels
    const img = readPNG(process.argv[2]);
    console.log(`${img.width}x${img.height} colourType=${img.colorType} depth=${img.bitDepth}${img.interlaced ? ' interlaced' : ''}`);
    for (const [x, y] of JSON.parse(process.argv[3] || '[]')) console.log(x, y, img.px(x, y));
}
