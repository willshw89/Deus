const fs = require('fs');
const path = require('path');

const shapesPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\SHAPES.VGA";
if (!fs.existsSync(shapesPath)) {
    console.error("SHAPES.VGA not found");
    process.exit(1);
}

const shapesBytes = fs.readFileSync(shapesPath);
console.log(`SHAPES.VGA loaded (${shapesBytes.length} bytes)`);

// Search shapes 600 to 750 (scenery / nature shapes in U7)
for (let s = 600; s < 750; s++) {
    const offset = shapesBytes.readUInt32LE(128 + s * 8);
    const length = shapesBytes.readUInt32LE(128 + s * 8 + 4);
    if (offset === 0 || length === 0) continue;

    const frameCount = shapesBytes.readUInt32LE(offset);
    if (frameCount < 1 || frameCount > 64) continue;
    const frame0Off = shapesBytes.readUInt32LE(offset + 4);
    if (frame0Off < 8 || frame0Off >= length) continue;

    const ptr = offset + frame0Off;
    const xright = shapesBytes.readInt16LE(ptr);
    const xleft = shapesBytes.readInt16LE(ptr + 2);
    const yabove = shapesBytes.readInt16LE(ptr + 4);
    const ybelow = shapesBytes.readInt16LE(ptr + 6);
    const width = Math.max(1, xleft + xright + 1);
    const height = Math.max(1, yabove + ybelow + 1);

    if (width >= 16 && height >= 16) {
        console.log(`Shape ${s}: ${width}x${height} (frames: ${frameCount}, xleft: ${xleft}, yabove: ${yabove})`);
    }
}
