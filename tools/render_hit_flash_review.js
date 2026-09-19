const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Load master 144x48
const master = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'fx_hit.png')), 'fx_hit.png');

// Load meadow tile for terrain preview
let meadow = null;
try {
    meadow = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')), 'meadow.png');
} catch (e) {
    console.log('Could not load meadow.png');
}

// Load settler south stand frame
let settler = null;
try {
    settler = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png')), 'human_male_stand_south.png');
} catch (e) {
    console.log('Could not load settler');
}

function isMagenta(r, g, b) {
    return r === 255 && g === 0 && b === 255;
}

// 1. Review showcase 1: 4x zoom on magenta with frame border guides
const W1 = 144 * 4;
const H1 = 48 * 4;
const review1Data = Buffer.alloc(W1 * H1 * 4);

for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 144; x++) {
        const srcO = (y * 144 + x) * 4;
        const r = master.data[srcO];
        const g = master.data[srcO + 1];
        const b = master.data[srcO + 2];
        
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const px = x * 4 + dx;
                const py = y * 4 + dy;
                const dstO = (py * W1 + px) * 4;
                
                // Draw faint cell border between frames (at x=48*4 and x=96*4)
                if (px === 192 || px === 384 || px === 0 || px === W1 - 1 || py === 0 || py === H1 - 1) {
                    review1Data[dstO] = 180;
                    review1Data[dstO + 1] = 0;
                    review1Data[dstO + 2] = 180;
                    review1Data[dstO + 3] = 255;
                } else {
                    review1Data[dstO] = r;
                    review1Data[dstO + 1] = g;
                    review1Data[dstO + 2] = b;
                    review1Data[dstO + 3] = 255;
                }
            }
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'fx_hit_frames_4x.png'), W1, H1, review1Data);

// 2. Review showcase 2: Over meadow grass (3 frames side by side)
const review2Data = Buffer.alloc(W1 * H1 * 4);
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 144; x++) {
        const srcO = (y * 144 + x) * 4;
        const r = master.data[srcO];
        const g = master.data[srcO + 1];
        const b = master.data[srcO + 2];
        const isFg = !isMagenta(r, g, b);
        
        // Meadow background sample (wrap 48x48)
        let bgR = 77, bgG = 93, bgB = 40;
        if (meadow) {
            const mx = x % 48;
            const my = y % 48;
            const mo = (my * meadow.width + mx) * 4;
            bgR = meadow.data[mo];
            bgG = meadow.data[mo + 1];
            bgB = meadow.data[mo + 2];
        }
        
        const finalR = isFg ? r : bgR;
        const finalG = isFg ? g : bgG;
        const finalB = isFg ? b : bgB;
        
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const px = x * 4 + dx;
                const py = y * 4 + dy;
                const dstO = (py * W1 + px) * 4;
                
                // Border lines
                if (px === 192 || px === 384) {
                    review2Data[dstO] = 40;
                    review2Data[dstO + 1] = 50;
                    review2Data[dstO + 2] = 20;
                    review2Data[dstO + 3] = 255;
                } else {
                    review2Data[dstO] = finalR;
                    review2Data[dstO + 1] = finalG;
                    review2Data[dstO + 2] = finalB;
                    review2Data[dstO + 3] = 255;
                }
            }
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'fx_hit_on_meadow_4x.png'), W1, H1, review2Data);

// 3. Review showcase 3: Settler taking a hit (Settler + Hit Flash Overlay)
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
            
            // Settler pixel
            let colR = bgR, colG = bgG, colB = bgB;
            if (settler) {
                const so = (y * settler.width + x) * 4;
                const sr = settler.data[so];
                const sg = settler.data[so + 1];
                const sb = settler.data[so + 2];
                if (!isMagenta(sr, sg, sb)) {
                    colR = sr; colG = sg; colB = sb;
                }
            }
            
            // Hit flash overlay pixel
            const fo = (y * 144 + (fxOffset + x)) * 4;
            const fr = master.data[fo];
            const fg = master.data[fo + 1];
            const fb = master.data[fo + 2];
            if (!isMagenta(fr, fg, fb)) {
                colR = fr; colG = fg; colB = fb;
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
writePNG(path.join(ROOT, 'art', 'review', 'fx_hit_combat_settler_4x.png'), W1, H1, review3Data);

console.log('Successfully generated review renders!');
