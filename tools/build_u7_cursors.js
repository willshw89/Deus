const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const palPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\PALETTES.FLX";
const palBytes = fs.readFileSync(palPath);

const pal = [];
for (let i = 0; i < 256; i++) {
    pal.push({
        r: Math.min(255, Math.round(palBytes[256 + i * 3] * 255 / 63.0)),
        g: Math.min(255, Math.round(palBytes[256 + i * 3 + 1] * 255 / 63.0)),
        b: Math.min(255, Math.round(palBytes[256 + i * 3 + 2] * 255 / 63.0))
    });
}

// ----------------------------------------------------------------------------
// 1. Design Ornate 48x48 2-Frame Ground Look Reticle (game/img/system/U7_Cursor.png)
// 96x48 total (two 48x48 frames)
// Frame 0: Polished bright gold corner brackets with inner accent pips
// Frame 1: Soft breathing glow pulse gold brackets
// ----------------------------------------------------------------------------
function buildGroundCursor() {
    const w = 96, h = 48;
    const buf = Buffer.alloc(w * h * 4, 0);

    function drawPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const idx = (y * w + x) * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = a;
    }

    function drawFrame(frameOffset, brightness, pulseAlpha) {
        // 48x48 cell boundary
        const ox = frameOffset;
        const cornerLen = 10;
        const thickness = 2;

        const goldHighlight = [Math.min(255, Math.round(255 * brightness)), Math.min(255, Math.round(225 * brightness)), Math.min(255, Math.round(90 * brightness))];
        const goldBase = [Math.min(255, Math.round(220 * brightness)), Math.min(255, Math.round(175 * brightness)), Math.min(255, Math.round(35 * brightness))];
        const goldShadow = [Math.min(255, Math.round(140 * brightness)), Math.min(255, Math.round(100 * brightness)), Math.min(255, Math.round(15 * brightness))];
        const darkOutline = [25, 20, 10, 220];

        // Corner 1: Top-Left
        for (let i = 0; i < cornerLen; i++) {
            // Horizontal bar
            drawPixel(ox + i + 1, 1, ...goldHighlight);
            drawPixel(ox + i + 1, 2, ...goldBase);
            drawPixel(ox + i + 1, 3, ...goldShadow);
            drawPixel(ox + i + 1, 0, ...darkOutline);
            drawPixel(ox + i + 1, 4, ...darkOutline);

            // Vertical bar
            drawPixel(ox + 1, i + 1, ...goldHighlight);
            drawPixel(ox + 2, i + 1, ...goldBase);
            drawPixel(ox + 3, i + 1, ...goldShadow);
            drawPixel(ox + 0, i + 1, ...darkOutline);
            drawPixel(ox + 4, i + 1, ...darkOutline);
        }

        // Corner 2: Top-Right
        for (let i = 0; i < cornerLen; i++) {
            const x = 47 - i - 1;
            drawPixel(ox + x, 1, ...goldHighlight);
            drawPixel(ox + x, 2, ...goldBase);
            drawPixel(ox + x, 3, ...goldShadow);
            drawPixel(ox + x, 0, ...darkOutline);
            drawPixel(ox + x, 4, ...darkOutline);

            const y = i + 1;
            drawPixel(ox + 46, y, ...goldHighlight);
            drawPixel(ox + 45, y, ...goldBase);
            drawPixel(ox + 44, y, ...goldShadow);
            drawPixel(ox + 47, y, ...darkOutline);
            drawPixel(ox + 43, y, ...darkOutline);
        }

        // Corner 3: Bottom-Left
        for (let i = 0; i < cornerLen; i++) {
            const x = i + 1;
            drawPixel(ox + x, 46, ...goldHighlight);
            drawPixel(ox + x, 45, ...goldBase);
            drawPixel(ox + x, 44, ...goldShadow);
            drawPixel(ox + x, 47, ...darkOutline);
            drawPixel(ox + x, 43, ...darkOutline);

            const y = 47 - i - 1;
            drawPixel(ox + 1, y, ...goldHighlight);
            drawPixel(ox + 2, y, ...goldBase);
            drawPixel(ox + 3, y, ...goldShadow);
            drawPixel(ox + 0, y, ...darkOutline);
            drawPixel(ox + 4, y, ...darkOutline);
        }

        // Corner 4: Bottom-Right
        for (let i = 0; i < cornerLen; i++) {
            const x = 47 - i - 1;
            drawPixel(ox + x, 46, ...goldHighlight);
            drawPixel(ox + x, 45, ...goldBase);
            drawPixel(ox + x, 44, ...goldShadow);
            drawPixel(ox + x, 47, ...darkOutline);
            drawPixel(ox + x, 43, ...darkOutline);

            const y = 47 - i - 1;
            drawPixel(ox + 46, y, ...goldHighlight);
            drawPixel(ox + 45, y, ...goldBase);
            drawPixel(ox + 44, y, ...goldShadow);
            drawPixel(ox + 47, y, ...darkOutline);
            drawPixel(ox + 43, y, ...darkOutline);
        }

        // Center pip crosshair
        const cx = 23, cy = 23;
        drawPixel(ox + cx, cy, ...goldHighlight);
        drawPixel(ox + cx + 1, cy, ...goldHighlight);
        drawPixel(ox + cx, cy + 1, ...goldHighlight);
        drawPixel(ox + cx + 1, cy + 1, ...goldHighlight);
        drawPixel(ox + cx - 1, cy, ...goldShadow);
        drawPixel(ox + cx + 2, cy, ...goldShadow);
        drawPixel(ox + cx, cy - 1, ...goldShadow);
        drawPixel(ox + cx, cy + 2, ...goldShadow);
    }

    drawFrame(0, 1.0, 1.0);  // Frame 0: full brilliance
    drawFrame(48, 0.78, 0.85); // Frame 1: subtle breathing pulse

    const outPath = path.join(__dirname, "..", "game", "img", "system", "U7_Cursor.png");
    writePNG(outPath, w, h, buf);
    console.log(`[Cursor] Generated ${outPath} (96x48, 2-frame 48x48 ornate gold ground reticle)`);
}

// ----------------------------------------------------------------------------
// 2. Design Custom Fantasy Mouse Pointer Cursor (game/img/system/U7_Pointer.png)
// 32x32 elegant 2.5D gold-trimmed fantasy pointer with runic blade / arrow
// ----------------------------------------------------------------------------
function buildMousePointer() {
    const w = 32, h = 32;
    const buf = Buffer.alloc(w * h * 4, 0);

    function drawPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const idx = (y * w + x) * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = a;
    }

    // High fantasy gold-inlaid arrow pointer (hotspot at 0, 0)
    // Pixel matrix (0..20 x, 0..22 y)
    const pointerPattern = [
        "##..............................",
        "#@#.............................",
        "#@@#............................",
        "#@@@#...........................",
        "#@@@@#..........................",
        "#@@@@@#.........................",
        "#@@@@@@#........................",
        "#@@@@@@@#.......................",
        "#@@@@@@@@#......................",
        "#@@@@@@@@@#.....................",
        "#@@@@@@@@@@#....................",
        "#@@@@@@@@@@@#...................",
        "#@@@@@@######...................",
        "#@@@@@#.........................",
        "#@@#@@#.........................",
        "#@#.#@@#........................",
        "##..#@@#........................",
        "#...#@@#........................",
        ".....#@@#.......................",
        ".....#@@#.......................",
        "......##........................",
        "................................"
    ];

    const goldEdge = [255, 235, 110];
    const goldMid = [225, 185, 45];
    const goldDark = [165, 120, 20];
    const ironCore = [60, 70, 85];
    const ironHighlight = [110, 130, 155];
    const rubyGem = [230, 45, 60];
    const dropShadow = [15, 15, 20, 160];
    const outline = [18, 12, 6, 255];

    // First draw drop shadow shifted (+2, +2)
    for (let y = 0; y < pointerPattern.length; y++) {
        for (let x = 0; x < pointerPattern[y].length; x++) {
            if (pointerPattern[y][x] !== '.') {
                drawPixel(x + 2, y + 2, ...dropShadow);
            }
        }
    }

    // Now draw pointer body
    for (let y = 0; y < pointerPattern.length; y++) {
        for (let x = 0; x < pointerPattern[y].length; x++) {
            const ch = pointerPattern[y][x];
            if (ch === '#') {
                drawPixel(x, y, ...outline);
            } else if (ch === '@') {
                if (x === 1 || y === x) {
                    drawPixel(x, y, ...goldEdge);
                } else if (x === 2 && y <= 4) {
                    drawPixel(x, y, ...rubyGem); // ruby glint near tip!
                } else if (x >= 2 && x <= 4 && y >= 12) {
                    drawPixel(x, y, ...ironHighlight);
                } else if (x > y / 2) {
                    drawPixel(x, y, ...goldMid);
                } else {
                    drawPixel(x, y, ...goldDark);
                }
            }
        }
    }

    const outPath = path.join(__dirname, "..", "game", "img", "system", "U7_Pointer.png");
    writePNG(outPath, w, h, buf);
    console.log(`[Pointer] Generated ${outPath} (32x32, gold fantasy pointer with ruby tip)`);
}

buildGroundCursor();
buildMousePointer();

