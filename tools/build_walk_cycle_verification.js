'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const characters = [
    { name: 'Male 1 (Master Settler)', path: 'game/img/characters/$UF_Human_Male_1_Walk.png' },
    { name: 'Female 1 (Master Settler)', path: 'game/img/characters/$UF_Human_Female_1_Walk.png' },
    { name: 'Generator Colonist ($gen_c0)', path: 'game/img/characters/gen/$gen_c0.png' },
    { name: 'Adam ($Adam.png)', path: 'game/img/characters/$Adam.png' },
    { name: 'Eve ($Eve.png)', path: 'game/img/characters/$Eve.png' },
];

function extractCell(img, c, r) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = ((r * 48 + y) * img.width + (c * 48 + x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            buf[dIdx]   = img.data[sIdx];
            buf[dIdx+1] = img.data[sIdx+1];
            buf[dIdx+2] = img.data[sIdx+2];
            buf[dIdx+3] = img.data[sIdx+3];
        }
    }
    return buf;
}

// Build a 4x zoom filmstrip of the 4-step walk cycle (0 -> 1 -> 2 -> 1) for both Left (Row 1) and Right (Row 2)
// For 3 characters: Male 1, Female 1, Generator Colonist
const scale = 4;
const steps = [0, 1, 2, 1]; // RMMZ step cycle
const testChars = characters.slice(0, 3);
const totalW = steps.length * 48 * scale * 2 + 32; // Left side (West) + gap + Right side (East)
const totalH = testChars.length * 48 * scale + (testChars.length - 1) * 16;
const montage = Buffer.alloc(totalW * totalH * 4);

for (let i = 0; i < testChars.length; i++) {
    const item = testChars[i];
    const img = decodePNG(fs.readFileSync(item.path));
    const yOffset = i * (48 * scale + 16);

    // Left walk cycle (Row 1)
    for (let s = 0; s < steps.length; s++) {
        const c = steps[s];
        const frame = extractCell(img, c, 1);
        const xOffset = s * (48 * scale);

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const px = xOffset + x * scale + dx;
                        const py = yOffset + y * scale + dy;
                        const dIdx = (py * totalW + px) * 4;
                        montage[dIdx]     = frame[sIdx];
                        montage[dIdx + 1] = frame[sIdx + 1];
                        montage[dIdx + 2] = frame[sIdx + 2];
                        montage[dIdx + 3] = frame[sIdx + 3];
                    }
                }
            }
        }
    }

    // Right walk cycle (Row 2)
    const rightBaseX = steps.length * 48 * scale + 32;
    for (let s = 0; s < steps.length; s++) {
        const c = steps[s];
        const frame = extractCell(img, c, 2);
        const xOffset = rightBaseX + s * (48 * scale);

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const px = xOffset + x * scale + dx;
                        const py = yOffset + y * scale + dy;
                        const dIdx = (py * totalW + px) * 4;
                        montage[dIdx]     = frame[sIdx];
                        montage[dIdx + 1] = frame[sIdx + 1];
                        montage[dIdx + 2] = frame[sIdx + 2];
                        montage[dIdx + 3] = frame[sIdx + 3];
                    }
                }
            }
        }
    }
}

const outPath = 'art/review/walk_cycles_verified_comparison.png';
writePNG(outPath, totalW, totalH, montage);
const brainPath = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85/walk_cycles_verified_comparison.png';
writePNG(brainPath, totalW, totalH, montage);
console.log(`Saved comparison montage to ${outPath} and ${brainPath}`);

// Also generate an interactive HTML live animator previewing the actual 180ms walking loop
const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Live Walk Cycle Animation Verification</title>
<style>
body { background: #1a1a24; color: #eee; font-family: monospace; padding: 24px; }
h1 { margin-bottom: 8px; color: #4ade80; }
.card { background: #222230; border: 1px solid #333348; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
.character-row { display: flex; gap: 32px; align-items: center; margin-top: 12px; }
.anim-box { text-align: center; }
.sprite-view {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
    display: inline-block;
    transform: scale(3);
    transform-origin: top left;
    margin-right: 96px;
    margin-bottom: 96px;
}
.label { font-size: 13px; color: #aaa; margin-bottom: 8px; }
</style>
</head>
<body>
<h1>Bipedal Walk Cycle Live Verification (180ms RMMZ cadence)</h1>
<p>Each row demonstrates the active 4-step walk cycle: <strong>Col 0 (Step 1) &rarr; Col 1 (Stand) &rarr; Col 2 (Step 2) &rarr; Col 1 (Stand)</strong>.</p>
${characters.map((c, idx) => `
<div class="card">
    <h3>${c.name}</h3>
    <div class="character-row">
        <div class="anim-box">
            <div class="label">&larr; Walk West (Left)</div>
            <div id="anim_w_${idx}" class="sprite-view" style="background: url('../../${c.path}') 0px -48px;"></div>
        </div>
        <div class="anim-box">
            <div class="label">Walk East (Right) &rarr;</div>
            <div id="anim_e_${idx}" class="sprite-view" style="background: url('../../${c.path}') 0px -96px;"></div>
        </div>
        <div class="anim-box">
            <div class="label">&darr; Walk South (Down)</div>
            <div id="anim_s_${idx}" class="sprite-view" style="background: url('../../${c.path}') 0px 0px;"></div>
        </div>
        <div class="anim-box">
            <div class="label">&uarr; Walk North (Up)</div>
            <div id="anim_n_${idx}" class="sprite-view" style="background: url('../../${c.path}') 0px -144px;"></div>
        </div>
    </div>
</div>
`).join('')}

<script>
const pattern = [0, 1, 2, 1];
let step = 0;
setInterval(() => {
    step = (step + 1) % pattern.length;
    const col = pattern[step];
    const xPos = -col * 48;
    for (let i = 0; i < ${characters.length}; i++) {
        document.getElementById('anim_w_' + i).style.backgroundPosition = xPos + 'px -48px';
        document.getElementById('anim_e_' + i).style.backgroundPosition = xPos + 'px -96px';
        document.getElementById('anim_s_' + i).style.backgroundPosition = xPos + 'px 0px';
        document.getElementById('anim_n_' + i).style.backgroundPosition = xPos + 'px -144px';
    }
}, 180);
</script>
</body>
</html>`;

fs.writeFileSync('art/review/walk_cycle_live_preview.html', html);
console.log('Saved live animation preview to art/review/walk_cycle_live_preview.html');
