const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIRS = [
    path.join(ROOT, 'game', 'img', 'characters'),
    path.join(ROOT, 'art', 'masters')
];

console.log("=== Purging all fake aftereffect animations across all assets ===");

// 1. Scan and clean all sidecars with sway
for (const charDir of CHAR_DIRS) {
    if (!fs.existsSync(charDir)) continue;
    const jsonFiles = fs.readdirSync(charDir).filter(f => f.endsWith('.json'));
    for (const jf of jsonFiles) {
        const jPath = path.join(charDir, jf);
        try {
            const sidecar = JSON.parse(fs.readFileSync(jPath, 'utf8'));
            let modified = false;

            if (sidecar.animations && sidecar.animations.sway) {
                delete sidecar.animations.sway;
                if (!sidecar.animations.stand) {
                    sidecar.animations.stand = [1];
                }
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(jPath, JSON.stringify(sidecar, null, 2), 'utf8');
                console.log(`Cleaned sidecar (removed fake sway): ${path.relative(ROOT, jPath)}`);
            }
        } catch (e) {
            console.error(`Error processing sidecar ${jPath}:`, e.message);
        }
    }
}

// 2. Scan and clean PNGs: replace sheared column 0 and column 2 with pure un-sheared column 1
for (const charDir of CHAR_DIRS) {
    if (!fs.existsSync(charDir)) continue;
    const pngFiles = fs.readdirSync(charDir).filter(f => f.startsWith('!$UF_') && f.endsWith('.png'));
    for (const pf of pngFiles) {
        const pPath = path.join(charDir, pf);
        const jPath = pPath.replace(/\.png$/, '.json');
        // Only process if it was an object/flora with 3x4 layout (frameWidth 48 or 96)
        if (!fs.existsSync(jPath)) continue;
        const sidecar = JSON.parse(fs.readFileSync(jPath, 'utf8'));
        const fw = sidecar.frameWidth || 48;
        const fh = sidecar.frameHeight || 48;

        // Skip animated assets with authentic distinct multi-frames like Campfire, Furnace, Well
        if (pf.includes('Campfire') || pf.includes('Furnace') || pf.includes('Well')) {
            continue;
        }

        try {
            const raw = decodePNG(fs.readFileSync(pPath), pf);
            if (raw.width !== fw * 3 || raw.height !== fh * 4) continue;

            const cdata = Buffer.from(raw.data);
            const w = raw.width;

            // Copy column 1 (clean master) to column 0 and column 2 across all 4 rows
            for (let row = 0; row < 4; row++) {
                for (let y = 0; y < fh; y++) {
                    const py = row * fh + y;
                    for (let x = 0; x < fw; x++) {
                        const srcX = fw + x; // column 1
                        const sidx = (py * w + srcX) * 4;

                        // col 0
                        const dst0 = (py * w + x) * 4;
                        cdata[dst0] = cdata[sidx];
                        cdata[dst0 + 1] = cdata[sidx + 1];
                        cdata[dst0 + 2] = cdata[sidx + 2];
                        cdata[dst0 + 3] = cdata[sidx + 3];

                        // col 2
                        const dst2 = (py * w + (fw * 2 + x)) * 4;
                        cdata[dst2] = cdata[sidx];
                        cdata[dst2 + 1] = cdata[sidx + 1];
                        cdata[dst2 + 2] = cdata[sidx + 2];
                        cdata[dst2 + 3] = cdata[sidx + 3];
                    }
                }
            }

            writePNG(pPath, raw.width, raw.height, cdata);
            console.log(`Replaced fake sheared frames with clean master in: ${path.relative(ROOT, pPath)}`);
        } catch (e) {
            console.error(`Error processing PNG ${pPath}:`, e.message);
        }
    }
}

// 3. Remove rowSway and swayOffset from tools/ scripts
const toolFiles = [
    path.join(ROOT, 'tools', 'process_nano_banana_world_assets.js'),
    path.join(ROOT, 'tools', 'process_nano_banana_batch2.js'),
    path.join(ROOT, 'tools', 'process_nano_banana_batch3.js'),
    path.join(ROOT, 'tools', 'process_nano_banana_batch4.js')
];

for (const tf of toolFiles) {
    if (!fs.existsSync(tf)) continue;
    let code = fs.readFileSync(tf, 'utf8');
    let replaced = false;

    // Replace swayOffset logic with clean zero sway
    if (code.includes('swayOffset')) {
        code = code.replace(/const swayOffset = \(col === 0 \? -1 : \(col === 2 \? 1 : 0\)\);/g, 'const swayOffset = 0;');
        code = code.replace(/sway: \[0, 1, 2\]/g, 'stand: [1]');
        code = code.replace(/animations: \{ stand: \[1\], stand: \[1\] \}/g, 'animations: { stand: [1] }');
        replaced = true;
    }

    if (replaced) {
        fs.writeFileSync(tf, code, 'utf8');
        console.log(`Purged aftereffect logic from generator tool: ${path.relative(ROOT, tf)}`);
    }
}

console.log("=== All fake aftereffects purged successfully! ===");
