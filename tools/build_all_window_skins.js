'use strict';
const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');
const { readPNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load palette
const paletteLines = fs.readFileSync(PALETTE_FILE, 'utf8').trim().split(/\r?\n/);
const PALETTE = paletteLines.map(line => {
    const hex = line.trim().replace('#', '');
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
    ];
});

function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

const palLab = PALETTE.map(c => srgbToLab(...c));
function snap(r, g, b) {
    const l = srgbToLab(r, g, b);
    let best = PALETTE[0], bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        const d = labDist(l, palLab[i]);
        if (d < bd) { bd = d; best = PALETTE[i]; }
    }
    return best;
}

function hexRgb(hex) {
    const n = parseInt(String(hex || '#000000').replace('#', ''), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 32 standard text color chips
const TEXT_COLORS = [
    "#ffffff","#71aee7","#ff5965","#efca28","#8eff82","#006dd2","#bebebe","#ffffff",
    "#7d7d7d","#006dd2","#c20c1c","#45b645","#c69618","#ff5965","#8eff82","#bebebe",
    "#006dd2","#c69618","#c20c1c","#45b645","#8a5508","#71aee7","#efca28","#bebebe",
    "#45b645","#c20c1c","#006dd2","#efca28","#45b645","#c69618","#8a5508","#100c08"
].map(hexRgb);

// Specifications for all 13 skins
const SKINS = [
    {
        id: "main",
        file: "Window",
        extraFiles: ["Window_main"],
        title: "Regal / Main Menu",
        desc: "Midnight navy velvet with gold filigree and fleur brackets",
        bgBase: snap(12, 16, 32),
        bgPattern: snap(20, 26, 48),
        bgPatternType: "diamond",
        rim: snap(12, 10, 16),
        lit: snap(240, 205, 50),
        mid: snap(198, 150, 24),
        dark: snap(110, 75, 12),
        cornerType: "bracket",
        cursorLit: snap(240, 205, 50),
        cursorDark: snap(158, 105, 12),
        arrowLit: snap(240, 205, 50),
        arrowDark: snap(110, 75, 12)
    },
    {
        id: "human",
        file: "Window_human",
        title: "Human - Carved Oak",
        desc: "Carved dark walnut oak with warm brass wire and rosette rivets",
        bgBase: snap(22, 16, 12),
        bgPattern: snap(32, 24, 18),
        bgPatternType: "woodgrain",
        rim: snap(16, 12, 8),
        lit: snap(219, 174, 32),
        mid: snap(125, 77, 24),
        dark: snap(61, 36, 12),
        cornerType: "rosette",
        cursorLit: snap(219, 174, 32),
        cursorDark: snap(93, 53, 12),
        arrowLit: snap(219, 174, 32),
        arrowDark: snap(61, 36, 12)
    },
    {
        id: "dwarf",
        file: "Window_dwarf",
        title: "Dwarf - Granite & Iron",
        desc: "Dressed granite stone slab with dark iron bevel and rune rivets",
        bgBase: snap(18, 22, 28),
        bgPattern: snap(28, 34, 42),
        bgPatternType: "masonry",
        rim: snap(8, 10, 14),
        lit: snap(220, 228, 240),
        mid: snap(94, 104, 120),
        dark: snap(40, 46, 56),
        cornerType: "rune",
        cursorLit: snap(220, 228, 240),
        cursorDark: snap(56, 62, 72),
        arrowLit: snap(220, 228, 240),
        arrowDark: snap(40, 46, 56)
    },
    {
        id: "elf",
        file: "Window_elf",
        title: "Elf - Living Wood & Gold",
        desc: "Ancient woodland bower, deep forest green with pale gold leaf wire",
        bgBase: snap(10, 24, 14),
        bgPattern: snap(18, 38, 24),
        bgPatternType: "foliage",
        rim: snap(10, 18, 8),
        lit: snap(240, 226, 144),
        mid: snap(110, 140, 40),
        dark: snap(32, 54, 20),
        cornerType: "leaf",
        cursorLit: snap(240, 226, 144),
        cursorDark: snap(60, 84, 24),
        arrowLit: snap(240, 226, 144),
        arrowDark: snap(32, 54, 20)
    },
    {
        id: "gnome",
        file: "Window_gnome",
        title: "Gnome - Brass & Enamel",
        desc: "Teal drafting enamel with polished mechanical brass and cog brackets",
        bgBase: snap(10, 26, 32),
        bgPattern: snap(18, 42, 50),
        bgPatternType: "grid",
        rim: snap(18, 14, 8),
        lit: snap(255, 240, 168),
        mid: snap(176, 138, 44),
        dark: snap(60, 40, 10),
        cornerType: "cog",
        cursorLit: snap(255, 240, 168),
        cursorDark: snap(110, 80, 20),
        arrowLit: snap(255, 240, 168),
        arrowDark: snap(60, 40, 10)
    },
    {
        id: "goblin",
        file: "Window_goblin",
        title: "Goblin - Scrap Iron & Hide",
        desc: "Rusted scrap iron and stitched hide with barbed corner plates",
        bgBase: snap(24, 22, 12),
        bgPattern: snap(36, 34, 18),
        bgPatternType: "patchwork",
        rim: snap(22, 12, 6),
        lit: snap(224, 160, 96),
        mid: snap(140, 74, 30),
        dark: snap(60, 28, 10),
        cornerType: "barb",
        cursorLit: snap(224, 160, 96),
        cursorDark: snap(80, 36, 14),
        arrowLit: snap(224, 160, 96),
        arrowDark: snap(60, 28, 10)
    },
    {
        id: "orc",
        file: "Window_orc",
        title: "Orc - Black Iron & Bone",
        desc: "Raw dark crimson hide with heavy brutal black iron and bone tusks",
        bgBase: snap(30, 12, 10),
        bgPattern: snap(44, 18, 14),
        bgPatternType: "hide",
        rim: snap(18, 8, 6),
        lit: snap(244, 236, 216),
        mid: snap(168, 154, 128),
        dark: snap(50, 24, 20),
        cornerType: "tusk",
        cursorLit: snap(244, 236, 216),
        cursorDark: snap(90, 40, 32),
        arrowLit: snap(244, 236, 216),
        arrowDark: snap(50, 24, 20)
    },
    {
        id: "lizardfolk",
        file: "Window_lizardfolk",
        title: "Lizardfolk - Reed & Shell",
        desc: "Marsh teal woven reeds with polished river-shell and spiral knots",
        bgBase: snap(10, 24, 20),
        bgPattern: snap(18, 40, 34),
        bgPatternType: "weave",
        rim: snap(8, 16, 12),
        lit: snap(240, 220, 200),
        mid: snap(78, 138, 106),
        dark: snap(24, 52, 40),
        cornerType: "spiral",
        cursorLit: snap(240, 220, 200),
        cursorDark: snap(40, 80, 60),
        arrowLit: snap(240, 220, 200),
        arrowDark: snap(24, 52, 40)
    },
    {
        id: "kobold",
        file: "Window_kobold",
        title: "Kobold - Clay & Copper",
        desc: "Warm earthen red clay with hammered copper and trinket notches",
        bgBase: snap(32, 16, 8),
        bgPattern: snap(48, 26, 14),
        bgPatternType: "clay",
        rim: snap(20, 8, 4),
        lit: snap(248, 200, 120),
        mid: snap(176, 96, 42),
        dark: snap(64, 30, 10),
        cornerType: "trinket",
        cursorLit: snap(248, 200, 120),
        cursorDark: snap(90, 46, 18),
        arrowLit: snap(248, 200, 120),
        arrowDark: snap(64, 30, 10)
    },
    {
        id: "undead",
        file: "Window_undead",
        title: "Undead - Crypt Slate & Moss",
        desc: "Cold crypt slate with tarnished verdigris bronze and grave notches",
        bgBase: snap(14, 20, 12),
        bgPattern: snap(22, 32, 20),
        bgPatternType: "crypt",
        rim: snap(10, 14, 8),
        lit: snap(202, 216, 184),
        mid: snap(106, 122, 94),
        dark: snap(36, 46, 32),
        cornerType: "cryptnotch",
        cursorLit: snap(202, 216, 184),
        cursorDark: snap(54, 68, 48),
        arrowLit: snap(202, 216, 184),
        arrowDark: snap(36, 46, 32)
    },
    {
        id: "starborn",
        file: "Window_starborn",
        title: "Starborn - Astral Crystal",
        desc: "Cosmic indigo void with starlight grid and luminous crystal lattice",
        bgBase: snap(10, 10, 36),
        bgPattern: snap(18, 18, 56),
        bgPatternType: "constellation",
        rim: snap(10, 10, 24),
        lit: snap(228, 226, 255),
        mid: snap(106, 90, 216),
        dark: snap(32, 28, 80),
        cornerType: "crystal",
        cursorLit: snap(228, 226, 255),
        cursorDark: snap(54, 46, 130),
        arrowLit: snap(228, 226, 255),
        arrowDark: snap(32, 28, 80)
    },
    {
        id: "swarm",
        file: "Window_swarm",
        title: "Swarm - Chitin Membrane",
        desc: "Dark chitinous plates with living membrane cells and violet sinew nodes",
        bgBase: snap(20, 8, 28),
        bgPattern: snap(36, 14, 52),
        bgPatternType: "cells",
        rim: snap(16, 6, 24),
        lit: snap(228, 148, 240),
        mid: snap(148, 76, 164),
        dark: snap(68, 32, 80),
        cornerType: "sinew",
        cursorLit: snap(228, 148, 240),
        cursorDark: snap(100, 45, 120),
        arrowLit: snap(228, 148, 240),
        arrowDark: snap(68, 32, 80)
    }
];

function generateNativeSkin(spec) {
    // 64x64 native buffer
    const NW = 64, NH = 64;
    const grid = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    function setNative(x, y, rgb, a = 255) {
        if (x < 0 || x >= NW || y < 0 || y >= NH) return;
        grid[y][x] = [rgb[0], rgb[1], rgb[2], a];
    }

    // 1. TOP-LEFT [0..31, 0..31]: Background Wallpaper (stretched at 75% opacity)
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            let col = spec.bgBase;
            const pat = spec.bgPatternType;
            if (pat === "diamond") {
                if (((x + y) % 8 === 0) || ((x - y + 64) % 8 === 0)) col = spec.bgPattern;
            } else if (pat === "woodgrain") {
                const wave = Math.sin(y * 0.4 + x * 0.1);
                if (wave > 0.6 || ((x * 7 + y * 13) % 17 === 0)) col = spec.bgPattern;
            } else if (pat === "masonry") {
                if (y % 8 === 0 || (Math.floor(y / 8) % 2 === 0 ? x % 16 === 0 : (x + 8) % 16 === 0)) col = spec.rim;
                else if (((x * 3 + y * 7) % 11 === 0)) col = spec.bgPattern;
            } else if (pat === "foliage") {
                if (((x ^ y) & 5) === 0 || ((x * 11 + y * 7) % 13 === 0)) col = spec.bgPattern;
            } else if (pat === "grid") {
                if (x % 8 === 0 || y % 8 === 0) col = spec.bgPattern;
            } else if (pat === "patchwork") {
                if ((x % 12 === 0 && y % 3 !== 0) || (y % 12 === 0 && x % 3 !== 0)) col = spec.rim;
                else if ((x + y) % 7 === 0) col = spec.bgPattern;
            } else if (pat === "hide") {
                if (((x * 13 + y * 17) % 9 === 0) || ((x * 5 ^ y * 7) % 11 === 0)) col = spec.bgPattern;
            } else if (pat === "weave") {
                if (((x + y * 2) % 6 === 0) || ((x * 2 - y + 60) % 6 === 0)) col = spec.bgPattern;
            } else if (pat === "clay") {
                if (((x * 7 + y * 11) % 8 === 0)) col = spec.bgPattern;
            } else if (pat === "crypt") {
                if (y % 10 === 0 || ((x * 13 + y * 7) % 11 === 0)) col = spec.bgPattern;
            } else if (pat === "constellation") {
                if ((x % 10 === 0 && y % 10 === 0) || ((x * 17 + y * 23) % 37 === 0)) col = spec.bgPattern;
            } else if (pat === "cells") {
                if (((x * x + y * y) % 13 === 0)) col = spec.bgPattern;
            }
            setNative(x, y, col, 255);
        }
    }

    // 2. BOTTOM-LEFT [0..31, 32..63]: Dim/Overlay pattern (tiled 1:1)
    for (let y = 32; y < 64; y++) {
        for (let x = 0; x < 32; x++) {
            const lx = x, ly = y - 32;
            let col = spec.rim;
            let a = 255;
            // Subtle 1-pixel dither pattern
            if ((lx + ly) % 4 === 0) {
                col = spec.bgPattern;
            } else {
                col = spec.bgBase;
            }
            setNative(x, y, col, a);
        }
    }

    // 3. TOP-RIGHT [32..63, 0..31]: 9-slice Window Frame
    // Border width: EXACTLY 2 native pixels (6 screen pixels)!
    // Slices at m=8 native (24 screen). fx in 0..7 and 24..31.
    // Everything with dEdge >= 2 is completely TRANSPARENT!
    for (let fy = 0; fy < 32; fy++) {
        for (let fx = 0; fx < 32; fx++) {
            const dLeft = fx;
            const dRight = 31 - fx;
            const dTop = fy;
            const dBottom = 31 - fy;
            const dEdge = Math.min(dLeft, dRight, dTop, dBottom);

            const isCornerZone = (fx < 8 || fx >= 24) && (fy < 8 || fy >= 24);

            if (dEdge === 0) {
                // Outermost 1px rim / drop shadow
                setNative(fx + 32, fy, spec.rim, 255);
            } else if (dEdge === 1) {
                // 1px lit highlight / bevel rail
                const isLitSide = (dTop === 1 || dLeft === 1);
                const railCol = isLitSide ? spec.lit : spec.mid;
                setNative(fx + 32, fy, railCol, 255);
            } else {
                // Inside rail: check if there is a refined corner motif
                let cornerPixel = false;
                if (isCornerZone) {
                    // Refined corner motif within (1..3, 1..3)
                    const cx = fx < 8 ? fx : 31 - fx;
                    const cy = fy < 8 ? fy : 31 - fy;

                    // Motifs based on culture:
                    if (spec.cornerType === "bracket") {
                        // Royal corner bracket: 3x3 diagonal reinforcement
                        if ((cx === 2 && cy <= 3) || (cy === 2 && cx <= 3)) {
                            setNative(fx + 32, fy, (cx + cy <= 4) ? spec.lit : spec.dark, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "rosette") {
                        // Human rosette stud at (2, 2)
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        } else if ((cx === 2 && cy === 3) || (cx === 3 && cy === 2)) {
                            setNative(fx + 32, fy, spec.dark, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "rune") {
                        // Dwarf iron rivet block at (2, 2)
                        if ((cx === 2 && cy === 2) || (cx === 3 && cy === 2) || (cx === 2 && cy === 3)) {
                            setNative(fx + 32, fy, (cx === 2 && cy === 2) ? spec.lit : spec.dark, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "leaf") {
                        // Elf leaf curl at (2, 2) and (3, 2)
                        if ((cx === 2 && cy === 2) || (cx === 3 && cy === 2)) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        } else if (cx === 3 && cy === 3) {
                            setNative(fx + 32, fy, spec.mid, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "cog") {
                        // Gnome gear tooth notch at (2, 2)
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        } else if (cx === 2 && cy === 3) {
                            setNative(fx + 32, fy, spec.dark, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "barb") {
                        // Goblin jagged barb
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "tusk") {
                        // Orc bone tusk tip at (2, 2)
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "spiral") {
                        // Lizardfolk shell node
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "trinket") {
                        // Kobold copper trinket stud
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "cryptnotch") {
                        // Undead crypt notch
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.mid, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "crystal") {
                        // Starborn crystal node
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        }
                    } else if (spec.cornerType === "sinew") {
                        // Swarm chitin node
                        if (cx === 2 && cy === 2) {
                            setNative(fx + 32, fy, spec.lit, 255);
                            cornerPixel = true;
                        }
                    }
                }
                if (!cornerPixel) {
                    setNative(fx + 32, fy, [0, 0, 0], 0);
                }
            }
        }
    }

    // Scroll Arrows in the frame center (native fx in 12..19, fy in 4..27)
    // Up arrow at fx = 16 (center 48), fy = 8..12
    for (let r = 0; r < 4; r++) {
        const hw = r;
        for (let dx = -hw; dx <= hw; dx++) {
            const px = 48 + dx;
            const py = 8 + r;
            if (Math.abs(dx) === hw || r === 3) setNative(px, py, spec.rim, 255);
            else if (dx === 0 && r === 1) setNative(px, py, spec.arrowLit, 255);
            else setNative(px, py, spec.arrowDark, 255);
        }
    }
    // Down arrow at fx = 16, fy = 19..23
    for (let r = 0; r < 4; r++) {
        const hw = 3 - r;
        for (let dx = -hw; dx <= hw; dx++) {
            const px = 48 + dx;
            const py = 20 + r;
            if (Math.abs(dx) === hw || r === 0) setNative(px, py, spec.rim, 255);
            else if (dx === 0 && r === 2) setNative(px, py, spec.arrowLit, 255);
            else setNative(px, py, spec.arrowDark, 255);
        }
    }

    // 4. CURSOR [32..47, 32..47] (16x16 native)
    // 1-pixel border with lit highlight and semi-transparent inner glow
    for (let cy = 0; cy < 16; cy++) {
        for (let cx = 0; cx < 16; cx++) {
            const px = 32 + cx;
            const py = 32 + cy;
            const dEdge = Math.min(cx, 15 - cx, cy, 15 - cy);
            if (dEdge === 0) {
                const isLit = (cy === 0 || cx === 0);
                setNative(px, py, isLit ? spec.cursorLit : spec.cursorDark, 255);
            } else if (dEdge === 1) {
                setNative(px, py, spec.dark, 255);
            } else {
                setNative(px, py, spec.bgBase, 255);
            }
        }
    }

    // 5. PAUSE SIGN [48..63, 32..47] (16x16 native: 4 frames of 8x8)
    // A blinking triangular down-indicator
    for (let f = 0; f < 4; f++) {
        const ox = 48 + (f % 2) * 8;
        const oy = 32 + Math.floor(f / 2) * 8;
        const bounce = f % 2;
        for (let r = 0; r < 4; r++) {
            const hw = 3 - r;
            for (let dx = -hw; dx <= hw; dx++) {
                const px = ox + 4 + dx;
                const py = oy + 2 + r + bounce;
                if (Math.abs(dx) === hw || r === 0) setNative(px, py, spec.rim, 255);
                else setNative(px, py, spec.arrowLit, 255);
            }
        }
    }

    // 6. TEXT COLORS [32..63, 48..63] (32x16 native -> 96x48 screen)
    // 8 columns x 4 rows of 4x4 native chips
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 8; col++) {
            const idx = row * 8 + col;
            const rgb = TEXT_COLORS[idx];
            for (let cy = 0; cy < 4; cy++) {
                for (let cx = 0; cx < 4; cx++) {
                    const px = 32 + col * 4 + cx;
                    const py = 48 + row * 4 + cy;
                    setNative(px, py, rgb, 255);
                }
            }
        }
    }

    return grid;
}

function scale3x(nativeGrid) {
    const W = 192, H = 192;
    const buf = Buffer.alloc(W * H * 4, 0);
    for (let ny = 0; ny < 64; ny++) {
        for (let nx = 0; nx < 64; nx++) {
            const [r, g, b, a] = nativeGrid[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const sx = nx * 3 + dx;
                    const sy = ny * 3 + dy;
                    const idx = (sy * W + sx) * 4;
                    buf[idx] = r;
                    buf[idx + 1] = g;
                    buf[idx + 2] = b;
                    buf[idx + 3] = a;
                }
            }
        }
    }
    return buf;
}

// Build all skins and test them
console.log(`Building ${SKINS.length} authentic thin-bordered window skins...`);

const builtSkins = [];
for (const spec of SKINS) {
    const grid = generateNativeSkin(spec);
    const buf = scale3x(grid);

    // Verify palette count
    const colorSet = new Set();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 0) {
            colorSet.add(`${buf[i]},${buf[i+1]},${buf[i+2]}`);
        }
    }
    console.log(`- ${spec.id} (${spec.title}): ${colorSet.size} unique colors (limit 32)`);

    builtSkins.push({ spec, buf, colors: colorSet.size });
}

// Export files
const GAME_SYS = path.join(ROOT, 'game', 'img', 'system');
const ART_MASTERS = path.join(ROOT, 'art', 'masters');

const sidecar = {
    frameWidth: 192,
    frameHeight: 192,
    anchor: [24, 47],
    facings: ["S"],
    animations: { "stand": [0] }
};

for (const { spec, buf } of builtSkins) {
    const mainPath = path.join(GAME_SYS, `${spec.file}.png`);
    writePNG(mainPath, 192, 192, buf);

    if (spec.extraFiles) {
        for (const ef of spec.extraFiles) {
            writePNG(path.join(GAME_SYS, `${ef}.png`), 192, 192, buf);
        }
    }

    const masterPath = path.join(ART_MASTERS, `${spec.file}.png`);
    writePNG(masterPath, 192, 192, buf);
    fs.writeFileSync(path.join(ART_MASTERS, `${spec.file}.json`), JSON.stringify(sidecar, null, 2) + '\n');
}

// Generate Showcase image with mockups
const SHOWCASE_W = 1200, SHOWCASE_H = 920;
const showBuf = Buffer.alloc(SHOWCASE_W * SHOWCASE_H * 4, 0);
for (let i = 0; i < showBuf.length; i += 4) {
    showBuf[i] = 16; showBuf[i+1] = 18; showBuf[i+2] = 22; showBuf[i+3] = 255;
}

function drawWindowMockup(targetBuf, targetW, skinBuf, wx, wy, ww, wh) {
    // 1. Background
    for (let y = wy + 3; y < wy + wh - 3; y++) {
        for (let x = wx + 3; x < wx + ww - 3; x++) {
            const bx = (x - wx) % 96;
            const by = (y - wy) % 96;
            const sidx = (by * 192 + bx) * 4;
            const didx = (y * targetW + x) * 4;
            targetBuf[didx] = skinBuf[sidx];
            targetBuf[didx + 1] = skinBuf[sidx + 1];
            targetBuf[didx + 2] = skinBuf[sidx + 2];
            targetBuf[didx + 3] = 255;
        }
    }
    // 2. 9-slice frame
    const cw = 24, ch = 24;
    for (let y = 0; y < wh; y++) {
        for (let x = 0; x < ww; x++) {
            let sx = -1, sy = -1;
            if (x < cw) sx = 96 + x;
            else if (x >= ww - cw) sx = 192 - (ww - x);
            else sx = 120 + ((x - cw) % 48);

            if (y < ch) sy = y;
            else if (y >= wh - ch) sy = 96 - (wh - y);
            else sy = 24 + ((y - ch) % 48);

            const sidx = (sy * 192 + sx) * 4;
            const sa = skinBuf[sidx + 3];
            if (sa > 0) {
                const didx = ((wy + y) * targetW + (wx + x)) * 4;
                targetBuf[didx] = skinBuf[sidx];
                targetBuf[didx + 1] = skinBuf[sidx + 1];
                targetBuf[didx + 2] = skinBuf[sidx + 2];
                targetBuf[didx + 3] = sa;
            }
        }
    }
}

// Lay out 4 columns x 3 rows of windows
const cols = 4, rows = 3;
const cardW = 270, cardH = 180;
const startX = 40, startY = 40;
const gapX = 20, gapY = 20;

for (let i = 0; i < Math.min(SKINS.length, 12); i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const wx = startX + c * (cardW + gapX);
    const wy = startY + r * (cardH + gapY);
    drawWindowMockup(showBuf, SHOWCASE_W, builtSkins[i].buf, wx, wy, cardW, cardH);
}

const reviewPath = path.join(ROOT, 'art', 'review', 'window_skins_all_factions_showcase.png');
writePNG(reviewPath, SHOWCASE_W, SHOWCASE_H, showBuf);
console.log(`Saved showcase review to: ${reviewPath}`);
