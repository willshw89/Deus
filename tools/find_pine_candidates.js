const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'scratch', 'nature_shapes');
const files = fs.readdirSync(dir);

for (const f of files) {
    if (!f.endsWith('.png')) continue;
    const stat = fs.statSync(path.join(dir, f));
    // Let's list files that are tall and slender or large (pine candidates)
    // Read PNG width & height
    const buf = fs.readFileSync(path.join(dir, f));
    if (buf.slice(12, 16).toString('ascii') === 'IHDR') {
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        if (h >= 50 && w >= 30 && w <= 70) {
            console.log(`${f}: ${w}x${h}`);
        }
    }
}
