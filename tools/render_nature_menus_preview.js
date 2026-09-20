const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

function loadPNG(rel) {
    return decodePNG(fs.readFileSync(path.join(ROOT, rel)), path.basename(rel));
}

// Render side-by-side: Wildlife theme (left, 408x312) and Cavern theme (right, 408x312)
// Total 816 x 312
const outW = 816;
const outH = 312;
const outBuf = Buffer.alloc(outW * outH * 4);

const wildBg = loadPNG('game/img/pictures/UF_Menu_wildlife.png');
const wildWin = loadPNG('game/img/system/Window_wildlife.png');
const cavBg = loadPNG('game/img/pictures/UF_Menu_cavern.png');
const cavWin = loadPNG('game/img/system/Window_cavern.png');

function drawTheme(bg, win, dstX0) {
    // 1. Blit half-scale bg: 408x312
    for (let y = 0; y < outH; y++) {
        const sy = Math.floor(y * bg.height / outH);
        for (let x = 0; x < 408; x++) {
            const sx = Math.floor(x * bg.width / 408);
            const si = (sy * bg.width + sx) * 4;
            const di = (y * outW + (dstX0 + x)) * 4;
            outBuf[di] = bg.data[si];
            outBuf[di + 1] = bg.data[si + 1];
            outBuf[di + 2] = bg.data[si + 2];
            outBuf[di + 3] = 255;
        }
    }

    // 2. Draw sample window (180x100) at (dstX0 + 20, 60)
    const wx0 = dstX0 + 24, wy0 = 60, ww = 160, wh = 110;
    // Window backfill (top-left 96x96 of win)
    for (let y = 4; y < wh - 4; y++) {
        for (let x = 4; x < ww - 4; x++) {
            const si = ((y % 64) * win.width + (x % 64)) * 4;
            const di = ((wy0 + y) * outW + (wx0 + x)) * 4;
            outBuf[di] = win.data[si];
            outBuf[di + 1] = win.data[si + 1];
            outBuf[di + 2] = win.data[si + 2];
            outBuf[di + 3] = 255;
        }
    }
    // Border corners
    // Top-left
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const si = ((y + 0) * win.width + (96 + x)) * 4;
            if (win.data[si + 3] > 0) {
                const di = ((wy0 + y) * outW + (wx0 + x)) * 4;
                outBuf[di] = win.data[si]; outBuf[di+1] = win.data[si+1]; outBuf[di+2] = win.data[si+2]; outBuf[di+3] = 255;
            }
        }
    }
    // Top-right
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const si = ((y + 0) * win.width + (176 + x)) * 4;
            if (win.data[si + 3] > 0) {
                const di = ((wy0 + y) * outW + (wx0 + ww - 16 + x)) * 4;
                outBuf[di] = win.data[si]; outBuf[di+1] = win.data[si+1]; outBuf[di+2] = win.data[si+2]; outBuf[di+3] = 255;
            }
        }
    }
    // Bottom-left
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const si = ((y + 80) * win.width + (96 + x)) * 4;
            if (win.data[si + 3] > 0) {
                const di = ((wy0 + wh - 16 + y) * outW + (wx0 + x)) * 4;
                outBuf[di] = win.data[si]; outBuf[di+1] = win.data[si+1]; outBuf[di+2] = win.data[si+2]; outBuf[di+3] = 255;
            }
        }
    }
    // Bottom-right
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const si = ((y + 80) * win.width + (176 + x)) * 4;
            if (win.data[si + 3] > 0) {
                const di = ((wy0 + wh - 16 + y) * outW + (wx0 + ww - 16 + x)) * 4;
                outBuf[di] = win.data[si]; outBuf[di+1] = win.data[si+1]; outBuf[di+2] = win.data[si+2]; outBuf[di+3] = 255;
            }
        }
    }
}

drawTheme(wildBg, wildWin, 0);
drawTheme(cavBg, cavWin, 408);

const prevPath = path.join(ROOT, 'art', 'review', 'nature_cavern_menus_preview.png');
writePNG(prevPath, outW, outH, outBuf);
console.log('Saved nature_cavern_menus_preview.png');
