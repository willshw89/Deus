const fs = require('fs');
const path = require('path');

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');
const files = fs.readdirSync(charDir);

for (const file of files) {
    if (file.includes('Fruit') || file.includes('Adam') || file.includes('Eve')) {
        const fullPath = path.join(charDir, file);
        const buf = fs.readFileSync(fullPath);
        if (buf.slice(12, 16).toString('ascii') === 'IHDR') {
            const w = buf.readUInt32BE(16);
            const h = buf.readUInt32BE(20);
            console.log(`${file}: ${w}x${h} (frame: ${w/3}x${h/4})`);
        }
    }
}
