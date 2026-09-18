const fs = require('fs');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
}

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(len + 12);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.slice(4, len + 8));
    buf.writeUInt32BE(crcVal, len + 8);
    return buf;
}

function writePNG(filePath, width, height, rgbaBuffer) {
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // 8-bit depth
    ihdr[9] = 6; // Color type 6 (RGBA)
    ihdr[10] = 0; // Compression
    ihdr[11] = 0; // Filter
    ihdr[12] = 0; // Interlace
    const ihdrChunk = makeChunk('IHDR', ihdr);

    // IDAT with scanline filter 0
    const rawData = Buffer.alloc(height * (width * 4 + 1));
    let rawPos = 0;
    for (let y = 0; y < height; y++) {
        rawData[rawPos++] = 0; // Filter: None
        const rowStart = y * width * 4;
        rgbaBuffer.copy(rawData, rawPos, rowStart, rowStart + width * 4);
        rawPos += width * 4;
    }

    const compressed = zlib.deflateSync(rawData, { level: 9 });
    const idatChunk = makeChunk('IDAT', compressed);

    // IEND
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    const finalBuf = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
    fs.writeFileSync(filePath, finalBuf);
}

module.exports = { writePNG };
