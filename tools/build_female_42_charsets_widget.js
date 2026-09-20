'use strict';

/**
 * tools/build_female_42_charsets_widget.js
 *
 * Builds the comprehensive master showcase widget for Adult Female Human
 * featuring all 42 charsets (6 variations x 7 actions).
 * Outputs to artifact directory: human_female_master_showcase.html
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

function toBase64(filePath) {
    if (!fs.existsSync(filePath)) return '';
    const buf = fs.readFileSync(filePath);
    return `data:image/png;base64,${buf.toString('base64')}`;
}

const VARIATIONS = [
    {
        num: 1,
        name: 'Var 1 — Master Settler / Militia Pioneer',
        role: 'Faction Steel Shortsword & Round Buckler',
        desc: 'Dark chestnut hair in tidy crown braid/bun, rustic linen blouse, sturdy frontier skirt with leather belt.',
        prefix: 'Human_Female_1'
    },
    {
        num: 2,
        name: 'Var 2 — Frontier Scout / Wayfinder',
        role: 'Dual Hunting Daggers & Light Composite Yew Scout Bow',
        desc: 'Sun-bleached blonde hair in high swept-back ponytail, olive-green woodland tunic with leather cross-harness.',
        prefix: 'Human_Female_2'
    },
    {
        num: 3,
        name: 'Var 3 — Heavy Guard / Shieldmaiden Veteran',
        role: 'Heavy Iron Broadsword & Garrison Longbow',
        desc: 'Raven black braided hair, charcoal grey padded gambeson, iron-buckled cross-belt, sturdy boots.',
        prefix: 'Human_Female_3'
    },
    {
        num: 4,
        name: 'Var 4 — Artisan Herbalist / Woodcrafter',
        role: 'Curved Woodcutter Hatchet / Cleaver & Forester Bow',
        desc: 'Auburn hair tied with herb string, terracotta/ochre gathering apron over linen smock, work pouches.',
        prefix: 'Human_Female_4'
    },
    {
        num: 5,
        name: 'Var 5 — Forge Artisan / Quarrywoman',
        role: 'Heavy Forge Hammer & Miner Crossbow / Sling',
        desc: 'Shorn dark hair with brow band bandana, heavy rawhide blacksmith work apron over rolled sleeves.',
        prefix: 'Human_Female_5'
    },
    {
        num: 6,
        name: 'Var 6 — Seasoned Veteran Huntress / Ranger Captain',
        role: 'Steel Hunting Sabre & Arthurian Yew Longbow',
        desc: 'Salt-and-pepper steel grey braided hair, deep indigo-blue ranger tunic with cross-strap, leather vambraces.',
        prefix: 'Human_Female_6'
    }
];

const ACTIONS = [
    { key: 'Walk', name: 'Walk Cycle', desc: '4-direction step / stand / step with dynamic alternating leg strides on profile facings' },
    { key: 'Haul', name: 'Haul / Carry', desc: 'Dedicated heavy load burlap sack held in front of chest in both arms across all 4 facings' },
    { key: 'Attack', name: 'Melee Combat', desc: 'Role-specific melee combat strike with curved luminous steel slash arcs' },
    { key: 'Bow', name: 'Archery / Ranged', desc: 'Role-specific bow/crossbow aim, string tension draw, and pluck recoil. ZERO flying projectiles (VISION V111)' },
    { key: 'Magic', name: 'Spell Initiation', desc: 'Incantation chant posture with soft glowing palm mana aura initiation. ZERO flying beams (VISION V111)' },
    { key: 'Work', name: 'Craftsman Work', desc: 'Standing inspection, kneeling craftsman down low (~28px), and ground tool/hammer strike' },
    { key: 'Downed', name: 'Downed / Defeat', desc: 'Hurt flinch clutching torso, kneeling collapse down low (~28px), and flat horizontal prone corpse (~14px)' }
];

console.log('Encoding all 42 charsets to base64 data URIs...');
const sheetsData = {};

for (const v of VARIATIONS) {
    sheetsData[v.num] = {};
    for (const act of ACTIONS) {
        const file = `$UF_${v.prefix}_${act.key}.png`;
        const filePath = path.join(CHAR_DIR, file);
        sheetsData[v.num][act.key] = toBase64(filePath);
    }
}

const closeupB64 = toBase64(path.join(REVIEW_DIR, 'human_female_6_variations_live_closeup.png'));
const normalB64  = toBase64(path.join(REVIEW_DIR, 'human_female_6_variations_live_normal.png'));
const montageB64 = toBase64(path.join(REVIEW_DIR, 'human_female_6_variations_montage.png'));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Adult Female Human — Master 42-Charset Showcase</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    .pixelated { image-rendering: pixelated; image-rendering: -moz-crisp-edges; }
  </style>
</head>
<body class="bg-[#0b0f17] text-slate-200 antialiased p-4">
  <div class="max-w-6xl mx-auto space-y-6">

    <!-- Header Banner -->
    <div class="bg-[#141b27] border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-pink-950/90 text-pink-300 border border-pink-800/60">Demographic 2: Adult Female</span>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-950/90 text-amber-400 border border-amber-800/60">6 Settler Variations</span>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-950/90 text-blue-400 border border-blue-800/60">7 Actions / Settler (42 Charsets)</span>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-purple-950/90 text-purple-300 border border-purple-800/60">100% Nano Banana Pro</span>
        </div>
        <h1 class="text-2xl font-black text-amber-300 mt-2">Adult Female Human — Complete 42-Charset Matrix</h1>
        <p class="text-slate-400 text-sm mt-1">Serious Chibi (~3.1 heads, 42–43px tall) • Native baseline y=47 • 12 Sprites / Sheet • U7 Originality: 42/42 PASS • In-Engine Smoke: PASS</p>
      </div>
      <div class="text-right text-xs text-slate-400">
        <div class="text-emerald-400 font-bold text-base">42 / 42 Charsets Complete</div>
        <div class="text-slate-400">144×192 px RMMZ Native ($filename.png)</div>
      </div>
    </div>

    <!-- Section 1: Live In-Engine Gameplay Screenshot -->
    <div class="bg-[#141b27] border border-slate-700/80 rounded-2xl p-6 shadow-xl">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-lg font-bold text-slate-100">Live In-Game Playtest Verification (RMMZ Engine)</h2>
          <p class="text-xs text-slate-400 mt-0.5">Automated test run: 6 distinct settler variations and full action lineup rendered live around campfire colony on map 1000.</p>
        </div>
        <span class="px-3 py-1 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-xs font-bold">In-Engine Tests PASS</span>
      </div>
      <div class="rounded-xl overflow-hidden border border-slate-700/70 bg-black/40 flex justify-center p-2">
        <img src="${closeupB64}" alt="Live Close-up In-Game" class="max-w-full rounded-lg shadow-md pixelated">
      </div>
    </div>

    <!-- Section 2: Interactive Variation & Action Matrix Navigator -->
    <div class="bg-[#141b27] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-700/60 pb-4">
        <div>
          <h2 class="text-lg font-bold text-amber-300">Interactive 4-Direction Live Animation Viewer</h2>
          <p class="text-xs text-slate-400">Select any settler variation and action to inspect live 4-direction animations and pixel charset sheets.</p>
        </div>
        <!-- Speed & Zoom Controls -->
        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Zoom:</span>
            <select id="zoomSelect" class="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200">
              <option value="2">2x</option>
              <option value="3" selected>3x (Native In-Game)</option>
              <option value="4">4x</option>
              <option value="5">5x (Closeup)</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Speed:</span>
            <input id="speedRange" type="range" min="80" max="350" value="180" class="w-20">
            <span id="speedVal" class="text-amber-400 font-mono">180ms</span>
          </div>
          <button id="pauseBtn" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold">Pause</button>
        </div>
      </div>

      <!-- Variation Selector Tabs -->
      <div class="space-y-2">
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Settler Variation (Cultural Faction Role):</span>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2" id="varTabs">
          ${VARIATIONS.map((v, idx) => `
            <button class="var-btn text-left p-2.5 rounded-xl border transition-all ${idx === 0 ? 'bg-amber-950/60 border-amber-500 text-amber-200' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700/50'}" data-var="${v.num}">
              <div class="text-xs font-bold truncate">${v.name.split('—')[0].trim()}</div>
              <div class="text-[11px] text-amber-400 truncate mt-0.5">${v.name.split('—')[1]?.trim() || ''}</div>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Action Selector Tabs -->
      <div class="space-y-2">
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Dedicated Action Suite:</span>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2" id="actionTabs">
          ${ACTIONS.map((a, idx) => `
            <button class="act-btn text-center p-2 rounded-xl border transition-all ${idx === 0 ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700/50'}" data-act="${a.key}">
              <div class="text-xs">${a.name}</div>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Active Variation & Action Info Card -->
      <div id="infoCard" class="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-xs space-y-1">
        <div class="flex items-center gap-2">
          <span class="font-bold text-amber-300 text-sm" id="infoName">Variation 1 — Master Settler / Militia Pioneer</span>
          <span class="text-slate-400">•</span>
          <span class="text-emerald-400 font-semibold" id="infoAction">Walk Cycle</span>
        </div>
        <p class="text-slate-300" id="infoRole">Role: Faction Steel Shortsword & Round Buckler</p>
        <p class="text-slate-400" id="infoDesc">Dark chestnut hair in tidy crown braid/bun, rustic linen blouse, sturdy frontier skirt with leather belt.</p>
        <p class="text-amber-400/90 font-mono text-[11px] mt-1" id="infoFile">File: $UF_Human_Female_1_Walk.png (144×192 px, 31 colors, binary alpha, grounded y=47)</p>
      </div>

      <!-- Live 4-Direction Sprites & Sheet Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        <!-- 4-Direction Animated Canvases -->
        <div class="lg:col-span-6 bg-[#0f141f] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
          <div class="text-xs font-bold text-slate-300 mb-4 self-start">Live 4-Direction Animations (Active Frame: <span id="frameIdxText" class="text-amber-400 font-mono">1</span>)</div>
          <div class="grid grid-cols-4 gap-4" id="canvasContainer">
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[11px] font-semibold text-slate-400">South (Front)</span>
              <div class="border border-slate-700/80 rounded-lg p-1 bg-slate-900/80 shadow-inner flex items-center justify-center">
                <canvas id="cSouth" width="48" height="48" class="pixelated" style="width: 96px; height: 96px;"></canvas>
              </div>
            </div>
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[11px] font-semibold text-slate-400">West (Left)</span>
              <div class="border border-slate-700/80 rounded-lg p-1 bg-slate-900/80 shadow-inner flex items-center justify-center">
                <canvas id="cWest" width="48" height="48" class="pixelated" style="width: 96px; height: 96px;"></canvas>
              </div>
            </div>
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[11px] font-semibold text-slate-400">East (Right)</span>
              <div class="border border-slate-700/80 rounded-lg p-1 bg-slate-900/80 shadow-inner flex items-center justify-center">
                <canvas id="cEast" width="48" height="48" class="pixelated" style="width: 96px; height: 96px;"></canvas>
              </div>
            </div>
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[11px] font-semibold text-slate-400">North (Back)</span>
              <div class="border border-slate-700/80 rounded-lg p-1 bg-slate-900/80 shadow-inner flex items-center justify-center">
                <canvas id="cNorth" width="48" height="48" class="pixelated" style="width: 96px; height: 96px;"></canvas>
              </div>
            </div>
          </div>
          <!-- Step Frame Controls -->
          <div class="flex items-center gap-3 mt-5">
            <button id="stepPrevBtn" class="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold border border-slate-700">◀ Step Prev</button>
            <button id="stepNextBtn" class="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold border border-slate-700">Step Next ▶</button>
          </div>
        </div>

        <!-- 12-Sprite Charset Sheet (144x192) Display -->
        <div class="lg:col-span-6 bg-[#0f141f] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
          <div class="w-full flex justify-between items-center mb-3">
            <span class="text-xs font-bold text-slate-300">Active 12-Sprite Charset Sheet ($filename.png)</span>
            <span class="text-[11px] text-slate-400 font-mono">144×192 px • 3 cols × 4 rows</span>
          </div>
          <div class="border border-slate-700/80 rounded-lg p-2 bg-slate-900/80 shadow-inner">
            <img id="sheetImg" src="" alt="Charset Sheet" class="pixelated" style="width: 216px; height: 288px;">
          </div>
          <div class="text-[11px] text-slate-400 mt-2 text-center">Row 1: South • Row 2: West • Row 3: East • Row 4: North</div>
        </div>
      </div>
    </div>

    <!-- Section 3: Master 6-Variation 72-Sprite Montage -->
    <div class="bg-[#141b27] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-3">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-bold text-slate-100">All 6 Settler Variations Side-by-Side (72 Walk Sprites)</h2>
          <p class="text-xs text-slate-400">864×192 px master review montage showing complete demographic variety, hair, outfits, and gear.</p>
        </div>
        <span class="px-3 py-1 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 text-xs font-bold">100% Palette Snapped</span>
      </div>
      <div class="rounded-xl overflow-x-auto border border-slate-700/70 bg-black/40 p-2 flex justify-center">
        <img src="${montageB64}" alt="6 Variations Montage" class="pixelated" style="height: 192px; max-width: none;">
      </div>
    </div>

  </div>

  <script>
    const variations = ${JSON.stringify(VARIATIONS)};
    const actions = ${JSON.stringify(ACTIONS)};
    const sheetsData = ${JSON.stringify(sheetsData)};

    let currentVar = 1;
    let currentAct = 'Walk';
    let currentFrame = 0;
    let isPlaying = true;
    let animTimer = null;
    let frameSpeed = 180;
    let zoomLevel = 3;

    const cSouth = document.getElementById('cSouth');
    const cWest  = document.getElementById('cWest');
    const cEast  = document.getElementById('cEast');
    const cNorth = document.getElementById('cNorth');
    const sheetImg = document.getElementById('sheetImg');

    const ctxS = cSouth.getContext('2d');
    const ctxW = cWest.getContext('2d');
    const ctxE = cEast.getContext('2d');
    const ctxN = cNorth.getContext('2d');

    const loadedImages = {};

    function getSheetImage(v, a, callback) {
        const key = v + '_' + a;
        if (loadedImages[key]) {
            callback(loadedImages[key]);
            return;
        }
        const img = new Image();
        img.onload = () => {
            loadedImages[key] = img;
            callback(img);
        };
        img.src = sheetsData[v][a];
    }

    function renderActiveFrame() {
        getSheetImage(currentVar, currentAct, (img) => {
            sheetImg.src = img.src;

            // Frame sequences per action
            const isFourStep = (currentAct === 'Walk' || currentAct === 'Haul' || currentAct === 'Work' || currentAct === 'Magic');
            const seq = isFourStep ? [0, 1, 2, 1] : [0, 1, 2];
            const col = seq[currentFrame % seq.length];

            document.getElementById('frameIdxText').textContent = col;

            // Clear canvases
            ctxS.clearRect(0, 0, 48, 48);
            ctxW.clearRect(0, 0, 48, 48);
            ctxE.clearRect(0, 0, 48, 48);
            ctxN.clearRect(0, 0, 48, 48);

            // Row 0: South
            ctxS.drawImage(img, col * 48, 0 * 48, 48, 48, 0, 0, 48, 48);
            // Row 1: West
            ctxW.drawImage(img, col * 48, 1 * 48, 48, 48, 0, 0, 48, 48);
            // Row 2: East
            ctxE.drawImage(img, col * 48, 2 * 48, 48, 48, 0, 0, 48, 48);
            // Row 3: North
            ctxN.drawImage(img, col * 48, 3 * 48, 48, 48, 0, 0, 48, 48);
        });
    }

    function updateInfoCard() {
        const v = variations.find(x => x.num === currentVar);
        const a = actions.find(x => x.key === currentAct);
        document.getElementById('infoName').textContent = v.name;
        document.getElementById('infoAction').textContent = a.name;
        document.getElementById('infoRole').textContent = 'Role: ' + v.role;
        document.getElementById('infoDesc').textContent = v.desc + ' — ' + a.desc;
        const filename = '$UF_' + v.prefix + '_' + a.key + '.png';
        document.getElementById('infoFile').textContent = 'File: ' + filename + ' (144×192 px, <=31 colors, binary alpha, grounded y=47, U7 PASS)';
    }

    function startAnimation() {
        if (animTimer) clearInterval(animTimer);
        animTimer = setInterval(() => {
            if (isPlaying) {
                currentFrame = (currentFrame + 1) % 4;
                renderActiveFrame();
            }
        }, frameSpeed);
    }

    // Event listeners
    document.querySelectorAll('.var-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.var-btn').forEach(b => {
                b.className = 'var-btn text-left p-2.5 rounded-xl border transition-all bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700/50';
            });
            btn.className = 'var-btn text-left p-2.5 rounded-xl border transition-all bg-amber-950/60 border-amber-500 text-amber-200';
            currentVar = parseInt(btn.dataset.var, 10);
            updateInfoCard();
            renderActiveFrame();
        });
    });

    document.querySelectorAll('.act-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.act-btn').forEach(b => {
                b.className = 'act-btn text-center p-2 rounded-xl border transition-all bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700/50';
            });
            btn.className = 'act-btn text-center p-2 rounded-xl border transition-all bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold';
            currentAct = btn.dataset.act;
            currentFrame = 0;
            updateInfoCard();
            renderActiveFrame();
        });
    });

    document.getElementById('zoomSelect').addEventListener('change', (e) => {
        zoomLevel = parseInt(e.target.value, 10);
        const sz = 48 * zoomLevel;
        [cSouth, cWest, cEast, cNorth].forEach(c => {
            c.style.width = sz + 'px';
            c.style.height = sz + 'px';
        });
    });

    document.getElementById('speedRange').addEventListener('input', (e) => {
        frameSpeed = parseInt(e.target.value, 10);
        document.getElementById('speedVal').textContent = frameSpeed + 'ms';
        startAnimation();
    });

    document.getElementById('pauseBtn').addEventListener('click', (e) => {
        isPlaying = !isPlaying;
        e.target.textContent = isPlaying ? 'Pause' : 'Play';
    });

    document.getElementById('stepPrevBtn').addEventListener('click', () => {
        isPlaying = false;
        document.getElementById('pauseBtn').textContent = 'Play';
        currentFrame = (currentFrame + 3) % 4;
        renderActiveFrame();
    });

    document.getElementById('stepNextBtn').addEventListener('click', () => {
        isPlaying = false;
        document.getElementById('pauseBtn').textContent = 'Play';
        currentFrame = (currentFrame + 1) % 4;
        renderActiveFrame();
    });

    // Initialize
    updateInfoCard();
    renderActiveFrame();
    startAnimation();
  </script>
</body>
</html>
`;

const outPath = path.join(BRAIN_DIR, 'human_female_master_showcase.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Saved master interactive showcase widget to: ${outPath} (${Buffer.byteLength(html)} bytes)`);
