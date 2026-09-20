const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

function createCheckerboard(w, h, size = 16, c1 = [220, 220, 220], c2 = [245, 245, 245]) {
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const check = ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0);
            const c = check ? c1 : c2;
            const idx = (y * w + x) * 4;
            buf[idx] = c[0];
            buf[idx + 1] = c[1];
            buf[idx + 2] = c[2];
            buf[idx + 3] = 255;
        }
    }
    return buf;
}

function blitNearest(src, srcW, srcH, dst, dstW, dstH, dstX, dstY, scale = 1) {
    for (let sy = 0; sy < srcH; sy++) {
        for (let sx = 0; sx < srcW; sx++) {
            const sidx = (sy * srcW + sx) * 4;
            const a = src[sidx + 3];
            if (a === 0) continue;
            for (let dy = 0; dy < scale; dy++) {
                const ty = dstY + sy * scale + dy;
                if (ty < 0 || ty >= dstH) continue;
                for (let dx = 0; dx < scale; dx++) {
                    const tx = dstX + sx * scale + dx;
                    if (tx < 0 || tx >= dstW) continue;
                    const didx = (ty * dstW + tx) * 4;
                    dst[didx] = src[sidx];
                    dst[didx + 1] = src[sidx + 1];
                    dst[didx + 2] = src[sidx + 2];
                    dst[didx + 3] = 255;
                }
            }
        }
    }
}

function extractFrame(sheetBuf, sheetW, col, row, frameW = 48, frameH = 48) {
    const fBuf = Buffer.alloc(frameW * frameH * 4);
    const startX = col * frameW;
    const startY = row * frameH;
    for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
            const sidx = ((startY + y) * sheetW + (startX + x)) * 4;
            const didx = (y * frameW + x) * 4;
            fBuf[didx] = sheetBuf[sidx];
            fBuf[didx + 1] = sheetBuf[sidx + 1];
            fBuf[didx + 2] = sheetBuf[sidx + 2];
            fBuf[didx + 3] = sheetBuf[sidx + 3];
        }
    }
    return fBuf;
}

async function render() {
    // 1. Render RMMZ charset 4x
    const rmmzFile = path.join(ROOT, 'game', 'img', 'characters', '$UF_Boar.png');
    const rmmzRaw = decodePNG(fs.readFileSync(rmmzFile), '$UF_Boar.png');
    const out1W = 144 * 4;
    const out1H = 192 * 4;
    const bg1 = createCheckerboard(out1W, out1H, 16);
    blitNearest(rmmzRaw.data, 144, 192, bg1, out1W, out1H, 0, 0, 4);
    const out1Path = path.join(ROOT, 'art', 'review', 'boar_rmmz_charset_4x.png');
    writePNG(out1Path, out1W, out1H, bg1);
    console.log(`Saved: ${out1Path}`);

    // 2. Render Actions Showcase 4x
    // We want to show:
    // Columns: [Idle/Stand, Walk, Combat/Attack, Graze/Eat, Hurt, Dead Carcass]
    // Rows: South, West, East, North (and diagonal SouthWest)
    // 6 actions x 5 rows
    const actions = [
        { name: 'idle', file: 'boar_idle.png', col: 1 },
        { name: 'walk', file: 'boar_walk.png', col: 2 },
        { name: 'attack', file: 'boar_attack.png', col: 1 },
        { name: 'graze', file: 'boar_graze.png', col: 1 },
        { name: 'hurt', file: 'boar_hurt.png', col: 0 },
        { name: 'death', file: 'boar_death.png', col: 2 }
    ];

    const actionData = actions.map(a => {
        const p = path.join(ROOT, 'art', 'masters', a.file);
        return {
            ...a,
            png: decodePNG(fs.readFileSync(p), a.file)
        };
    });

    const rows = [
        { name: 'South (Down)', rowIdx: 0 },
        { name: 'South-West', rowIdx: 1 },
        { name: 'West (Left)', rowIdx: 2 },
        { name: 'East (Right)', rowIdx: 6 },
        { name: 'North (Up)', rowIdx: 4 }
    ];

    const cellW = 48 * 4;
    const cellH = 48 * 4;
    const pad = 12;
    const totalW = actions.length * (cellW + pad) + pad;
    const totalH = rows.length * (cellH + pad) + pad;

    const bg2 = Buffer.alloc(totalW * totalH * 4);
    // Fill with soft forest meadow green [64, 112, 60] with subtle dither
    for (let y = 0; y < totalH; y++) {
        for (let x = 0; x < totalW; x++) {
            const idx = (y * totalW + x) * 4;
            const d = ((x ^ y) & 3) === 0 ? 4 : 0;
            bg2[idx] = 60 + d;
            bg2[idx + 1] = 108 + d;
            bg2[idx + 2] = 56 + d;
            bg2[idx + 3] = 255;
        }
    }

    for (let r = 0; r < rows.length; r++) {
        const rowInfo = rows[r];
        for (let c = 0; c < actions.length; c++) {
            const act = actionData[c];
            const frameBuf = extractFrame(act.png.data, act.png.width, act.col, rowInfo.rowIdx, 48, 48);
            const dx = pad + c * (cellW + pad);
            const dy = pad + r * (cellH + pad);

            // Ground shadow under creature
            for (let sy = 38; sy < 46; sy++) {
                for (let sx = 14; sx < 34; sx++) {
                    const shadowDist = Math.hypot((sx - 24) / 10, (sy - 42) / 3.5);
                    if (shadowDist <= 1.0) {
                        for (let sdy = 0; sdy < 4; sdy++) {
                            const ty = dy + sy * 4 + sdy;
                            for (let sdx = 0; sdx < 4; sdx++) {
                                const tx = dx + sx * 4 + sdx;
                                const sidx = (ty * totalW + tx) * 4;
                                bg2[sidx] = Math.floor(bg2[sidx] * 0.65);
                                bg2[sidx + 1] = Math.floor(bg2[sidx + 1] * 0.65);
                                bg2[sidx + 2] = Math.floor(bg2[sidx + 2] * 0.65);
                            }
                        }
                    }
                }
            }

            blitNearest(frameBuf, 48, 48, bg2, totalW, totalH, dx, dy, 4);
        }
    }

    const out2Path = path.join(ROOT, 'art', 'review', 'boar_actions_showcase_4x.png');
    writePNG(out2Path, totalW, totalH, bg2);
    console.log(`Saved: ${out2Path}`);
}

render().catch(console.error);
