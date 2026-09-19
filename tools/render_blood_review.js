const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Load master 144x48
const master = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'fx_blood.png')), 'fx_blood.png');

let meadow = null;
try {
    meadow = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')), 'meadow.png');
} catch (e) {
    console.log('Could not load meadow.png');
}

let settler = null;
try {
    settler = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png')), 'human_male_stand_south.png');
} catch (e) {
    console.log('Could not load settler');
}

function isMagenta(r, g, b) {
    return r === 255 && g === 0 && b === 255;
}

const W1 = 144 * 4;
const H1 = 48 * 4;

// 3. Review showcase 3: Settler stepping away from blood decals on meadow grass
// Showing decal on the left of each cell, settler standing on the right
const review3Data = Buffer.alloc(W1 * H1 * 4);
for (let f = 0; f < 3; f++) {
    const fxOffset = f * 48;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            // Ground background
            let bgR = 77, bgG = 93, bgB = 40;
            if (meadow) {
                const mo = (y * meadow.width + x) * 4;
                bgR = meadow.data[mo];
                bgG = meadow.data[mo + 1];
                bgB = meadow.data[mo + 2];
            }
            
            let colR = bgR, colG = bgG, colB = bgB;
            
            // 1. Blood decal (layer "under") on ground
            const bo = (y * 144 + (fxOffset + x)) * 4;
            const br = master.data[bo];
            const bg = master.data[bo + 1];
            const bb = master.data[bo + 2];
            if (!isMagenta(br, bg, bb)) {
                colR = br; colG = bg; colB = bb;
            }
            
            // 2. Settler body shifted 10 px right to show stepping away from wound/kill site
            const sx = x - 10;
            if (settler && sx >= 0 && sx < settler.width) {
                const so = (y * settler.width + sx) * 4;
                const sr = settler.data[so];
                const sg = settler.data[so + 1];
                const sb = settler.data[so + 2];
                const sa = settler.data[so + 3];
                if (sa > 128 && !isMagenta(sr, sg, sb)) {
                    colR = sr; colG = sg; colB = sb;
                }
            }
            
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const px = (fxOffset + x) * 4 + dx;
                    const py = y * 4 + dy;
                    const dstO = (py * W1 + px) * 4;
                    
                    if (px === 192 || px === 384) {
                        review3Data[dstO] = 40;
                        review3Data[dstO + 1] = 50;
                        review3Data[dstO + 2] = 20;
                        review3Data[dstO + 3] = 255;
                    } else {
                        review3Data[dstO] = colR;
                        review3Data[dstO + 1] = colG;
                        review3Data[dstO + 2] = colB;
                        review3Data[dstO + 3] = 255;
                    }
                }
            }
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'fx_blood_under_settler_4x.png'), W1, H1, review3Data);
console.log('Updated blood under settler review render!');
