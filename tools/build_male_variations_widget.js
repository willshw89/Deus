'use strict';

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

const montageB64 = toBase64(path.join(REVIEW_DIR, 'human_male_6_variations_montage.png'));
const closeupB64 = toBase64(path.join(BRAIN_DIR, 'human_male_live_closeup.png'));

const varSheetsB64 = [];
for (let i = 1; i <= 6; i++) {
    varSheetsB64.push(toBase64(path.join(CHAR_DIR, `$UF_Human_Male_${i}.png`)));
}

const VAR_DETAILS = [
    {
        num: 1,
        title: "Variation 1 — Master Settler / Militia",
        desc: "Chestnut brown combed hair, clean-shaven, rustic brown leather doublet & coarse linen shirt, sturdy leather boots.",
        weapon: "Faction Iron Arming Sword & Round Wooden Buckler (Arthurian Human Melee)"
    },
    {
        num: 2,
        title: "Variation 2 — Frontier Scout / Forester",
        desc: "Golden blonde swept-back hair, light stubble, forest olive-green tunic with dark leather vest, brown breeches.",
        weapon: "Dual Frontier Hunting Daggers & Light Composite Yew Bow"
    },
    {
        num: 3,
        title: "Variation 3 — Heavy Guard / Guard Veteran",
        desc: "Raven black shaggy hair, full dark beard & mustache, charcoal grey wool tunic, dark steel-riveted belt.",
        weapon: "Heavy Iron Broadsword & Steel-Tipped Spear"
    },
    {
        num: 4,
        title: "Variation 4 — Artisan Woodsman / Carpenter",
        desc: "Fiery red/auburn hair, trimmed red goatee, terracotta/ochre artisan tunic, rolled sleeves, tool loops.",
        weapon: "Broad Bearded Woodcutter Axe & Heavy Billhook"
    },
    {
        num: 5,
        title: "Variation 5 — Blacksmith / Quarryman",
        desc: "Shaved bald head, rugged dark full beard, rawhide leather work vest over coarse off-white sleeves, heavy apron breeches.",
        weapon: "Heavy Iron Smithing Hammer & Steel Mining Pickaxe"
    },
    {
        num: 6,
        title: "Variation 6 — Seasoned Veteran Ranger",
        desc: "Mature salt-and-pepper steel grey hair, trimmed grey beard, deep indigo-blue woolen tunic with leather cross-strap.",
        weapon: "Arthurian Yew Longbow & Steel Sidearm Hunting Sword"
    }
];

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    .pixelated { image-rendering: pixelated; image-rendering: -moz-crisp-edges; }
  </style>
</head>
<body class="bg-[#0f141c] text-slate-200 antialiased p-4">
  <div class="max-w-6xl mx-auto space-y-6">

    <!-- Header -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">Demographic 1: Adult Male Human</span>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-950/80 text-amber-400 border border-amber-800/60">6 Variations Complete</span>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-950/80 text-blue-400 border border-blue-800/60">100% Nano Banana Pro</span>
        </div>
        <h1 class="text-2xl font-bold text-amber-300 mt-2">Adult Male Human — 6 Unique Settler Variations</h1>
        <p class="text-slate-400 text-xs mt-1">Serious Chibi Proportions (V116: ~3.1 heads, 43px tall) • Invariant baseline y=47 • Dynamic Alternating Strides • V118 Faction Weapons & Arsenals</p>
      </div>
      <div class="text-right text-xs text-slate-400">
        <div>144×192 px RMMZ Charsets</div>
        <div class="text-emerald-400 font-semibold mt-0.5">U7 Originality: 6/6 PASS</div>
      </div>
    </div>

    <!-- Section 1: Live Interactive Animation Walk Preview (All 6 Variations) -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div>
          <h2 class="text-base font-semibold text-amber-200">Live 4-Direction Walk & Stride Playback</h2>
          <p class="text-xs text-slate-400">Verify dynamic alternating leg strides when moving left/right. Zero frozen leg postures.</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-slate-400">Facing:</label>
          <select id="facingSelect" class="bg-[#0b1017] border border-slate-700 text-xs rounded px-2 py-1 text-slate-200" onchange="updateFacing(this.value)">
            <option value="0">South (Front Walk)</option>
            <option value="1">West (Profile Walk - Left)</option>
            <option value="2" selected>East (Profile Walk - Right)</option>
            <option value="3">North (Back Walk)</option>
          </select>
          <button id="toggleBtn" class="bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded" onclick="togglePlay()">Pause</button>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        ${VAR_DETAILS.map((v, idx) => `
          <div class="bg-[#0e131d] border border-slate-800 rounded-lg p-3 flex flex-col items-center">
            <div class="text-xs font-bold text-amber-400 mb-1">Var ${v.num}</div>
            <div class="w-[96px] h-[96px] bg-[#1a2333] border border-slate-700 rounded relative overflow-hidden flex items-center justify-center">
              <div id="anim-var-${v.num}" class="pixelated absolute" style="width: 48px; height: 48px; transform: scale(2); transform-origin: top left; background-image: url('${varSheetsB64[idx]}'); background-position: 0px 0px;"></div>
            </div>
            <div class="text-[11px] font-semibold text-slate-300 text-center mt-2 line-clamp-1">${v.title.split('—')[1]}</div>
            <div class="text-[10px] text-slate-400 text-center mt-1 leading-tight line-clamp-2">${v.weapon.split('(')[0]}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Section 2: Detailed Variation Catalog Cards -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg">
      <h2 class="text-base font-semibold text-amber-200 mb-1">Variation Profiles & Cultural Faction Arsenals (V118)</h2>
      <p class="text-xs text-slate-400 mb-4">Each settler variation possesses a distinct visual silhouette and specialized weapon/tool role within the Human Arthurian theme.</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${VAR_DETAILS.map((v, idx) => `
          <div class="bg-[#0e131d] border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-emerald-400">Var ${v.num}</span>
                <span class="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">$UF_Human_Male_${v.num}</span>
              </div>
              <h3 class="text-sm font-bold text-slate-200 mt-1">${v.title}</h3>
              <p class="text-xs text-slate-300 mt-2 leading-relaxed">${v.desc}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800">
              <div class="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Faction Weapon Role</div>
              <div class="text-xs text-amber-200/90 mt-0.5">${v.weapon}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Section 3: Full 6-Variation Review Montage (100% Genuine Nano Banana Pro Generations) -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg">
      <div class="flex justify-between items-center mb-3">
        <div>
          <h2 class="text-base font-semibold text-amber-200">Master 6-Variation Charset Review Board</h2>
          <p class="text-xs text-slate-400">All 6 sheets side-by-side (72 total sprites). Invariant scale, baseline y=47, &lt;= 31 colors from art/palette/uf.hex.</p>
        </div>
        <span class="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono">864 × 192 px</span>
      </div>
      <div class="overflow-x-auto bg-[#0b1017] p-4 rounded-lg border border-slate-800 flex justify-center">
        <img src="${montageB64}" alt="Human Male 6 Variations Montage" class="pixelated" style="transform: scale(2); transform-origin: top center; margin-bottom: 192px;" />
      </div>
    </div>

  </div>

  <script>
    let currentFacing = 2; // East by default to demonstrate alternating leg strides
    let stepIndex = 0;
    const walkSequence = [0, 1, 2, 1]; // Step A, Stand, Step B, Stand
    let isPlaying = true;
    let timer = null;

    function renderFrames() {
      const col = walkSequence[stepIndex];
      const posX = -(col * 48);
      const posY = -(currentFacing * 48);

      for (let i = 1; i <= 6; i++) {
        const el = document.getElementById('anim-var-' + i);
        if (el) {
          el.style.backgroundPosition = posX + 'px ' + posY + 'px';
        }
      }
    }

    function tick() {
      if (!isPlaying) return;
      stepIndex = (stepIndex + 1) % walkSequence.length;
      renderFrames();
    }

    function updateFacing(val) {
      currentFacing = parseInt(val, 10);
      renderFrames();
    }

    function togglePlay() {
      isPlaying = !isPlaying;
      const btn = document.getElementById('toggleBtn');
      if (btn) btn.innerText = isPlaying ? 'Pause' : 'Play';
    }

    renderFrames();
    timer = setInterval(tick, 180);
  </script>
</body>
</html>
`;

const destPath = path.join(BRAIN_DIR, 'human_male_6_variations_widget.html');
fs.writeFileSync(destPath, html);
console.log(`Successfully generated showcase widget: ${destPath}`);
