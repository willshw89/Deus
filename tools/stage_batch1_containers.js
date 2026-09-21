'use strict';

const fs = require('fs');
const path = require('path');
const { convertJpgToPng } = require('./jpg_to_png');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const BRAIN = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4";
const JPG_SOURCE = path.join(BRAIN, "deus_containers_animated_1790009287362.jpg");
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const MASTERS_DIR = path.join(ROOT, 'art', 'masters');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

[RAW_DIR, MASTERS_DIR, STAGING_DIR, REVIEW_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 1. CIELAB Palette Snapping
function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

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

function labDist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const unique = [];
    const index = new Map();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!index.has(k)) {
            index.set(k, unique.length);
            unique.push(rgb);
        }
    }
    const isPurpleOrMagenta = (r, g, b) => (r > 160 && b > 160 && g < 120);
    const filteredPalette = unique.filter(c => !isPurpleOrMagenta(c[0], c[1], c[2]));
    const filteredLabs = filteredPalette.map(c => srgbToLab(...c));
    const cache = new Map();

    return {
        snap(r, g, b) {
            const k = (r << 16) | (g << 8) | b;
            if (cache.has(k)) return cache.get(k);
            const l = srgbToLab(r, g, b);
            let best = filteredPalette[0], bd = Infinity;
            for (let i = 0; i < filteredLabs.length; i++) {
                const d = labDist(l, filteredLabs[i]);
                if (d < bd) { bd = d; best = filteredPalette[i]; }
            }
            cache.set(k, best);
            return best;
        }
    };
}

const pal = loadPalette();

async function run() {
    console.log("=== Step 1: Converting JPG to PNG Raw ===");
    const rawPng = path.join(RAW_DIR, "raw_batch1_containers.png");
    convertJpgToPng(JPG_SOURCE, rawPng);

    console.log("=== Step 2: Reading & Cleaning Background Magenta ===");
    const rawImg = readPNG(rawPng);
    const W = rawImg.width;
    const H = rawImg.height;
    console.log(`Source dimensions: ${W}x${H}`);

    const cellW = Math.floor(W / 3);
    const cellH = Math.floor(H / 4);
    console.log(`Cell dimensions: ${cellW}x${cellH}`);

    const isMagentaBg = (r, g, b) => {
        return (r > 180 && b > 180 && g < 120) || (r > 150 && b > 150 && g < 80);
    };

    const cleanedData = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
        const r = rawImg.data[i * 4];
        const g = rawImg.data[i * 4 + 1];
        const b = rawImg.data[i * 4 + 2];
        if (isMagentaBg(r, g, b)) {
            cleanedData[i * 4] = 0;
            cleanedData[i * 4 + 1] = 0;
            cleanedData[i * 4 + 2] = 0;
            cleanedData[i * 4 + 3] = 0;
        } else {
            const [sr, sg, sb] = pal.snap(r, g, b);
            cleanedData[i * 4] = sr;
            cleanedData[i * 4 + 1] = sg;
            cleanedData[i * 4 + 2] = sb;
            cleanedData[i * 4 + 3] = 255;
        }
    }

    const master4xPath = path.join(MASTERS_DIR, "batch1_containers_master_4x.png");
    writePNG(master4xPath, W, H, cleanedData);
    console.log(`Wrote 4x master: ${master4xPath}`);

    console.log("=== Step 3: Downsampling to Native 1x (144x192) ===");
    const natW = 144;
    const natH = 192;
    const natData = Buffer.alloc(natW * natH * 4);

    for (let ny = 0; ny < natH; ny++) {
        for (let nx = 0; nx < natW; nx++) {
            const sx0 = Math.floor(nx * (W / natW));
            const sx1 = Math.floor((nx + 1) * (W / natW));
            const sy0 = Math.floor(ny * (H / natH));
            const sy1 = Math.floor((ny + 1) * (H / natH));

            const colorVotes = new Map();
            let opaqueCount = 0;
            let totalCount = 0;

            for (let sy = sy0; sy < sy1; sy++) {
                for (let sx = sx0; sx < sx1; sx++) {
                    totalCount++;
                    const sidx = (sy * W + sx) * 4;
                    const a = cleanedData[sidx + 3];
                    if (a > 128) {
                        opaqueCount++;
                        const colKey = (cleanedData[sidx] << 16) | (cleanedData[sidx + 1] << 8) | cleanedData[sidx + 2];
                        colorVotes.set(colKey, (colorVotes.get(colKey) || 0) + 1);
                    }
                }
            }

            const nidx = (ny * natW + nx) * 4;
            if (opaqueCount >= totalCount * 0.4 && colorVotes.size > 0) {
                let bestCol = 0, bestVotes = -1;
                for (const [col, votes] of colorVotes.entries()) {
                    if (votes > bestVotes) { bestVotes = votes; bestCol = col; }
                }
                natData[nidx] = (bestCol >> 16) & 255;
                natData[nidx + 1] = (bestCol >> 8) & 255;
                natData[nidx + 2] = bestCol & 255;
                natData[nidx + 3] = 255;
            } else {
                natData[nidx] = 0;
                natData[nidx + 1] = 0;
                natData[nidx + 2] = 0;
                natData[nidx + 3] = 0;
            }
        }
    }

    const masterNatPath = path.join(MASTERS_DIR, "batch1_containers_master_native.png");
    writePNG(masterNatPath, natW, natH, natData);
    console.log(`Wrote native master: ${masterNatPath}`);

    console.log("=== Step 4: Slicing & Staging Game-Ready RMMZ Charsets ===");
    const assets = [
        { id: "chest_wood", file: "!$UF_Chest_Wood", row: 0, name: "Storage Chest" },
        { id: "crate_wood", file: "!$UF_Crate_Wood", row: 1, name: "Storage Crate" },
        { id: "barrel_food", file: "!$UF_Barrel_Food", row: 2, name: "Food Barrel" },
        { id: "kitchen_pantry", file: "!$UF_Kitchen_Pantry", row: 3, name: "Kitchen Pantry" }
    ];

    for (const a of assets) {
        // Standard RMMZ single character sheet: 3 columns x 4 rows of 48x48 = 144x192
        const sheetData = Buffer.alloc(144 * 192 * 4);
        
        // Copy the 3 animation frames into Row 0 (South facing)
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 144; x++) {
                const sidx = ((a.row * 48 + y) * 144 + x) * 4;
                const didx = (y * 144 + x) * 4;
                sheetData[didx] = natData[sidx];
                sheetData[didx + 1] = natData[sidx + 1];
                sheetData[didx + 2] = natData[sidx + 2];
                sheetData[didx + 3] = natData[sidx + 3];
            }
        }
        
        // Also copy Row 0 to Rows 1, 2, 3 so any facing behaves identically
        for (let r = 1; r < 4; r++) {
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 144; x++) {
                    const sidx = (y * 144 + x) * 4;
                    const didx = ((r * 48 + y) * 144 + x) * 4;
                    sheetData[didx] = sheetData[sidx];
                    sheetData[didx + 1] = sheetData[sidx + 1];
                    sheetData[didx + 2] = sheetData[sidx + 2];
                    sheetData[didx + 3] = sheetData[sidx + 3];
                }
            }
        }

        // Palette constraint: <= 32 colors per sheet (ART_STANDARD)
        const counts = new Map();
        for (let i = 0; i < 144 * 192; i++) {
            if (sheetData[i * 4 + 3] > 0) {
                const k = (sheetData[i * 4] << 16) | (sheetData[i * 4 + 1] << 8) | sheetData[i * 4 + 2];
                counts.set(k, (counts.get(k) || 0) + 1);
            }
        }
        if (counts.size > 32) {
            const sorted = Array.from(counts.entries()).sort((x, y) => y[1] - x[1]);
            const allowed = sorted.slice(0, 31).map(e => e[0]);
            const allowedLabs = allowed.map(k => srgbToLab((k >> 16) & 255, (k >> 8) & 255, k & 255));
            for (let i = 0; i < 144 * 192; i++) {
                if (sheetData[i * 4 + 3] > 0) {
                    const k = (sheetData[i * 4] << 16) | (sheetData[i * 4 + 1] << 8) | sheetData[i * 4 + 2];
                    if (!allowed.includes(k)) {
                        const l = srgbToLab(sheetData[i * 4], sheetData[i * 4 + 1], sheetData[i * 4 + 2]);
                        let best = allowed[0], bd = Infinity;
                        for (let j = 0; j < allowedLabs.length; j++) {
                            const d = labDist(l, allowedLabs[j]);
                            if (d < bd) { bd = d; best = allowed[j]; }
                        }
                        sheetData[i * 4] = (best >> 16) & 255;
                        sheetData[i * 4 + 1] = (best >> 8) & 255;
                        sheetData[i * 4 + 2] = best & 255;
                    }
                }
            }
        }

        const outPng = path.join(STAGING_DIR, `${a.file}.png`);
        writePNG(outPng, 144, 192, sheetData);

        const outJson = path.join(STAGING_DIR, `${a.file}.json`);
        const sidecar = {
            id: a.id,
            generator: "gemini-3-pro-image",
            model: "Google Nano Banana Pro",
            frameWidth: 48,
            frameHeight: 48,
            anchor: [24, 47],
            footprint: [1, 1],
            facings: ["S", "W", "E", "N"],
            animations: {
                stand: [0],
                open: [0, 1, 2]
            },
            frameMs: 150,
            standard: "Project DEUS 16-bit HD"
        };
        fs.writeFileSync(outJson, JSON.stringify(sidecar, null, 2));
        console.log(`Staged ${a.file}.png and .json`);
    }

    console.log("=== Step 5: Generating Gate B Review Contact Sheet & Gallery ===");
    // Create side-by-side contact sheet:
    // Left: 1x native scale (144x192), Right: 4x scale (896x1200)
    const reviewW = 144 + 32 + W;
    const reviewH = H;
    const reviewData = Buffer.alloc(reviewW * reviewH * 4);

    // Dark slate background for clean contrast (#181820)
    for (let i = 0; i < reviewW * reviewH; i++) {
        reviewData[i * 4] = 0x18;
        reviewData[i * 4 + 1] = 0x18;
        reviewData[i * 4 + 2] = 0x20;
        reviewData[i * 4 + 3] = 0xFF;
    }

    // Blit native 1x at x=16, y=32
    for (let y = 0; y < natH; y++) {
        for (let x = 0; x < natW; x++) {
            const sidx = (y * natW + x) * 4;
            if (natData[sidx + 3] > 0) {
                const didx = ((32 + y) * reviewW + (16 + x)) * 4;
                reviewData[didx] = natData[sidx];
                reviewData[didx + 1] = natData[sidx + 1];
                reviewData[didx + 2] = natData[sidx + 2];
                reviewData[didx + 3] = 0xFF;
            }
        }
    }

    // Blit 4x master at x=176, y=0
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const sidx = (y * W + x) * 4;
            if (cleanedData[sidx + 3] > 0) {
                const didx = (y * reviewW + (176 + x)) * 4;
                reviewData[didx] = cleanedData[sidx];
                reviewData[didx + 1] = cleanedData[sidx + 1];
                reviewData[didx + 2] = cleanedData[sidx + 2];
                reviewData[didx + 3] = 0xFF;
            }
        }
    }

    const contactSheetPath = path.join(REVIEW_DIR, "batch1_containers_contact_sheet.png");
    writePNG(contactSheetPath, reviewW, reviewH, reviewData);
    console.log(`Generated Gate B Review Contact Sheet: ${contactSheetPath}`);

    // Generate animated HTML inspection gallery
    const htmlPath = path.join(REVIEW_DIR, "batch1_containers_preview.html");
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Project DEUS — Batch 1 Containers Gate B Review Gallery</title>
<style>
  body { background: #0c0c14; color: #d0d0e0; font-family: sans-serif; padding: 20px; }
  h1 { color: #f0c040; border-bottom: 1px solid #303040; padding-bottom: 8px; }
  .grid { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 20px; }
  .card { background: #181824; border: 1px solid #282838; border-radius: 8px; padding: 16px; width: 320px; }
  .card h3 { margin-top: 0; color: #60b0ff; }
  .anim-box { width: 192px; height: 192px; background: #202030; border: 1px solid #404050; position: relative; overflow: hidden; margin: 0 auto; image-rendering: pixelated; }
  .sprite { width: 192px; height: 192px; position: absolute; background-size: 576px 768px; }
  .controls { margin-top: 12px; display: flex; gap: 8px; justify-content: center; }
  button { background: #303048; color: #fff; border: 1px solid #505070; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
  button:hover { background: #404060; }
  .strip { display: flex; gap: 8px; margin-top: 12px; justify-content: center; }
  .strip-frame { width: 48px; height: 48px; background: #202030; border: 1px solid #383848; overflow: hidden; position: relative; image-rendering: pixelated; }
  .strip-frame div { width: 48px; height: 48px; position: absolute; background-size: 144px 192px; }
</style>
</head>
<body>
<h1>PROJECT DEUS — Batch 1 Storage Containers (Approval Gate B)</h1>
<p>Each container is presented below with full 3-frame discrete sprite animation playback (Closed &rarr; Ajar &rarr; Open Hold &rarr; Closing).</p>
<div class="grid">
  ${assets.map((a, i) => `
    <div class="card">
      <h3>${a.name} (<code>${a.id}</code>)</h3>
      <div class="anim-box">
        <div id="anim-${a.id}" class="sprite" style="background-image: url('../masters/batch1_containers_master_4x.png'); background-position: 0px -${i * 192}px;"></div>
      </div>
      <div class="controls">
        <button onclick="toggle('${a.id}')">Pause/Play</button>
        <button onclick="step('${a.id}', -1)">&larr;</button>
        <button onclick="step('${a.id}', 1)">&rarr;</button>
        <span id="frame-${a.id}" style="align-self: center; font-family: monospace;">Frame 0</span>
      </div>
      <div class="strip">
        <div class="strip-frame" title="Closed (Col 0)"><div style="background-image: url('../masters/batch1_containers_master_native.png'); background-position: 0px -${i * 48}px;"></div></div>
        <div class="strip-frame" title="Ajar (Col 1)"><div style="background-image: url('../masters/batch1_containers_master_native.png'); background-position: -48px -${i * 48}px;"></div></div>
        <div class="strip-frame" title="Open (Col 2)"><div style="background-image: url('../masters/batch1_containers_master_native.png'); background-position: -96px -${i * 48}px;"></div></div>
      </div>
    </div>
  `).join('')}
</div>
<script>
  const states = {
    chest_wood: { frame: 0, row: 0, playing: true, seq: [0, 1, 2, 2, 1, 0] },
    crate_wood: { frame: 0, row: 1, playing: true, seq: [0, 1, 2, 2, 1, 0] },
    barrel_food: { frame: 0, row: 2, playing: true, seq: [0, 1, 2, 2, 1, 0] },
    kitchen_pantry: { frame: 0, row: 3, playing: true, seq: [0, 1, 2, 2, 1, 0] }
  };
  function render(id) {
    const st = states[id];
    const col = st.seq[st.frame];
    const el = document.getElementById('anim-' + id);
    el.style.backgroundPosition = (-col * 192) + 'px ' + (-st.row * 192) + 'px';
    document.getElementById('frame-' + id).innerText = 'Frame ' + col + ' (' + (col === 0 ? 'Closed' : col === 1 ? 'Ajar' : 'Open') + ')';
  }
  function toggle(id) { states[id].playing = !states[id].playing; }
  function step(id, d) {
    const st = states[id];
    st.frame = (st.frame + d + st.seq.length) % st.seq.length;
    render(id);
  }
  setInterval(() => {
    for (const id of Object.keys(states)) {
      if (states[id].playing) {
        states[id].frame = (states[id].frame + 1) % states[id].seq.length;
        render(id);
      }
    }
  }, 220);
</script>
</body>
</html>`;
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`Generated Gate B Interactive Gallery: ${htmlPath}`);
}

run().catch(e => { console.error("Staging error:", e); process.exit(1); });
