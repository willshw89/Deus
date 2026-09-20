const fs = require('fs');
const zlib = require('zlib');

function readPNG(filePath) {
    const buf = fs.readFileSync(filePath);
    let pos = 8; // skip signature
    let width = 0, height = 0;
    let idatChunks = [];

    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        const data = buf.slice(pos + 8, pos + 8 + len);
        pos += 12 + len;

        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
        } else if (type === 'IDAT') {
            idatChunks.push(data);
        } else if (type === 'IEND') {
            break;
        }
    }

    const compressed = Buffer.concat(idatChunks);
    const raw = zlib.inflateSync(compressed);
    const rgba = Buffer.alloc(width * height * 4);

    let rawPos = 0;
    const bpp = 4;
    const stride = width * bpp;

    const uncompressedRow = Buffer.alloc(stride);
    const prevRow = Buffer.alloc(stride);

    for (let y = 0; y < height; y++) {
        const filter = raw[rawPos++];
        for (let x = 0; x < stride; x++) {
            const byte = raw[rawPos++];
            let left = x >= bpp ? uncompressedRow[x - bpp] : 0;
            let up = prevRow[x];
            let upLeft = x >= bpp ? prevRow[x - bpp] : 0;

            let val = byte;
            if (filter === 1) val = (byte + left) & 0xFF;
            else if (filter === 2) val = (byte + up) & 0xFF;
            else if (filter === 3) val = (byte + Math.floor((left + up) / 2)) & 0xFF;
            else if (filter === 4) {
                const p = left + up - upLeft;
                const pa = Math.abs(p - left);
                const pb = Math.abs(p - up);
                const pc = Math.abs(p - upLeft);
                let pr = upLeft;
                if (pa <= pb && pa <= pc) pr = left;
                else if (pb <= pc) pr = up;
                val = (byte + pr) & 0xFF;
            }
            uncompressedRow[x] = val;
        }
        uncompressedRow.copy(prevRow);
        uncompressedRow.copy(rgba, y * stride);
    }

    return { width, height, rgba };
}

module.exports = { readPNG };

