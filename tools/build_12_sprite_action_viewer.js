'use strict';

/**
 * tools/build_12_sprite_action_viewer.js
 *
 * Generates an interactive HTML artifact and widget showcasing:
 * - 12 Sprites at a Time (3x4 Grid: South, West, East, North x 3 animation frames)
 * - The First Sprite Sheet as Master Reference for subsequent Nano Banana II sheets
 * - Interactive Canvas Player animating all 7 actions in real-time across all 4 facings
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REF_DIR = path.join(ROOT, 'art', 'raw', 'references');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

function toBase64(filePath) {
    if (!fs.existsSync(filePath)) return '';
    return 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
}

const actions = {
    walk: {
        name: '1. Walk Cycle (Master Reference Sheet)',
        desc: '3 frames per facing (step left, stand, step right). Used as ImagePaths master reference for all subsequent generations.',
        tag: 'Master Reference',
        tagColor: 'bg-emerald-950 text-emerald-400 border-emerald-800',
        sheet: toBase64(path.join(CHAR_DIR, '$UF_Elf_Male_Walk.png'))
    },
    haul: {
        name: '2. Dedicated Hauling (AR-600 Col 7)',
        desc: 'Holding heavy burlap sack in both arms in front of torso across all 4 facings.',
        tag: 'AR-600 Col 7',
        tagColor: 'bg-amber-950 text-amber-400 border-amber-800',
        sheet: toBase64(path.join(CHAR_DIR, '$UF_Elf_Male_Haul.png'))
    },
    attack: {
        name: '3. Melee Sword Attack',
        desc: 'Two-handed sword strike with sweeping crescent slash arc across South, West, East, and North.',
        tag: 'Melee Strike',
        tagColor: 'bg-blue-950 text-blue-400 border-blue-800',
        sheet: toBase64(path.join(CHAR_DIR, '$UF_Elf_Male_Attack.png'))
    },
    bow: {
        name: '4. Archery Bow Attack (Zero Arrows)',
        desc: 'Aim, tension draw, and string pluck release ONLY. Zero flying arrow projectiles (handled separately by engine).',
        tag: 'Zero Projectiles',
        tagColor: 'bg-purple-950 text-purple-400 border-purple-800',
        sheet: toBase64(path.join(CHAR_DIR, '$UF_Elf_Male_Bow.png'))
    },
    magic: {
        name: '5. Magic Spell Initiation (Zero Projectiles)',
        desc: 'Spell incantation and chant posture with soft glowing emerald palms. Zero flying beams, blast waves, or leaves.',
        tag: 'Initiation Only',
        tagColor: 'bg-indigo-950 text-indigo-400 border-indigo-800',
        sheet: toBase64(path.join(CHAR_DIR, '$UF_Elf_Male_Magic.png'))
    },
    work: {
        name: '6. Work & Kneeling Craft',
        desc: 'Reaching, kneeling craft with hammer, and ground inspection. Preserves natural kneeling scale without stretching.',
        tag: 'Kneel & Inspect',
        tagColor: 'bg-orange-950 text-orange-400 border-orange-800',
        sheet: toBase64(path.join(CHAR_DIR, '$UF_Elf_Male_Work.png'))
    },
    downed: {
        name: '7. Downed & Horizontal Corpse',
        desc: 'Hurt flinch, kneeling collapse, and flat horizontal corpse resting on the ground across all facings.',
        tag: 'Resting Corpse',
        tagColor: 'bg-rose-950 text-rose-400 border-rose-800',
        sheet: toBase64(path.join(CHAR_DIR, '$UF_Elf_Male_Downed.png'))
    }
};

const masterRefB64 = toBase64(path.join(REF_DIR, 'elf_male_walk_12_reference.png'));
const liveCloseupB64 = toBase64(path.join(ROOT, 'art', 'review', 'elf_male_live_closeup.png'));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ultimate Frontier - 12 Sprites at a Time Suite</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    canvas, img {
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased p-4">
  <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-5 shadow-xl max-w-5xl mx-auto space-y-4">
    
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 text-[11px] font-bold uppercase rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">12 Sprites at a Time</span>
          <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-950 text-blue-400 border border-blue-800">First Sheet as Reference</span>
          <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-950 text-purple-400 border border-purple-800">4 Facings &times; 3 Frames</span>
        </div>
        <h1 class="text-xl font-bold mt-1">Adult Male Elf: 12-Sprite Standardized Suite</h1>
        <p class="text-xs text-[var(--muted-foreground)]">3 Columns &times; 4 Rows native RMMZ charsets ($filename.png) conditioned on Master Reference Sheet</p>
      </div>
      
      <!-- Mode Tabs -->
      <div class="flex gap-2">
        <button onclick="setMode('gallery')" id="btn-gallery" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition">12-Sprite Sheets</button>
        <button onclick="setMode('animator')" id="btn-animator" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">Live Animator</button>
        <button onclick="setMode('ingame')" id="btn-ingame" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">In-Game 3x</button>
      </div>
    </div>

    <!-- VIEW 1: 12-Sprite Sheet Gallery -->
    <div id="view-gallery" class="space-y-3">
      <div class="flex flex-wrap gap-1.5 border-b border-[var(--border)] pb-2">
        ${Object.keys(actions).map((k, i) => `
          <button onclick="selectAction('${k}')" id="act-btn-${k}" class="px-2.5 py-1 text-xs rounded-md font-medium transition ${i === 0 ? 'bg-emerald-600 text-white' : 'bg-[var(--muted)]/50 text-[var(--muted-foreground)] hover:text-white'}">
            ${actions[k].name.split('(')[0]}
          </button>
        `).join('')}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-black/70 p-4 rounded-lg border border-[var(--border)]">
        <!-- 12-Sprite Sheet Display -->
        <div class="md:col-span-2 flex flex-col items-center justify-center p-2 bg-zinc-950/80 rounded border border-zinc-800">
          <img id="sheet-img" src="${actions.walk.sheet}" class="max-h-[380px] w-auto pixelated border border-zinc-800 rounded shadow">
          <div class="mt-2 text-[11px] text-zinc-400 text-center flex items-center gap-4">
            <span>Row 0: <b>South (3)</b></span>
            <span>Row 1: <b>West (3)</b></span>
            <span>Row 2: <b>East (3)</b></span>
            <span>Row 3: <b>North (3)</b></span>
          </div>
        </div>

        <!-- Action Meta & Rule Breakdown -->
        <div class="space-y-3 text-xs">
          <div>
            <span id="sheet-tag" class="px-2 py-0.5 text-[10px] font-bold rounded border ${actions.walk.tagColor}">${actions.walk.tag}</span>
            <h3 id="sheet-title" class="text-sm font-bold mt-1 text-white">${actions.walk.name}</h3>
            <p id="sheet-desc" class="text-[var(--muted-foreground)] mt-1">${actions.walk.desc}</p>
          </div>

          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 space-y-1.5">
            <div class="font-semibold text-emerald-400">12-Sprite Architecture:</div>
            <ul class="list-disc list-inside text-zinc-300 space-y-1 text-[11px]">
              <li><b>3 Columns &times; 4 Rows:</b> Exact 12 sprites.</li>
              <li><b>Invariant Scale:</b> Invariant 40.0/276.0 scale factor.</li>
              <li><b>Zero Projectiles:</b> Bow is string pluck; Magic is initiation chant.</li>
              <li><b>Dedicated Haul:</b> Carrying sack in both arms.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 2: Live Action Animator -->
    <div id="view-animator" class="hidden space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
        <div class="flex items-center gap-2 text-xs">
          <span class="text-zinc-400">Action:</span>
          <select id="anim-act-select" onchange="updateAnimAction()" class="bg-zinc-800 text-white rounded px-2 py-1 border border-zinc-700 text-xs">
            ${Object.keys(actions).map(k => `<option value="${k}">${actions[k].name}</option>`).join('')}
          </select>
        </div>

        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-zinc-400">Facing:</span>
          <button onclick="setFacing(0)" id="f-btn-0" class="px-2 py-1 rounded bg-emerald-600 text-white">South &darr;</button>
          <button onclick="setFacing(1)" id="f-btn-1" class="px-2 py-1 rounded bg-zinc-800 text-zinc-300">West &larr;</button>
          <button onclick="setFacing(2)" id="f-btn-2" class="px-2 py-1 rounded bg-zinc-800 text-zinc-300">East &rarr;</button>
          <button onclick="setFacing(3)" id="f-btn-3" class="px-2 py-1 rounded bg-zinc-800 text-zinc-300">North &uarr;</button>
        </div>

        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-zinc-400">Zoom:</span>
          <button onclick="setZoom(2)" id="z-btn-2" class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">2x</button>
          <button onclick="setZoom(3)" id="z-btn-3" class="px-2 py-0.5 rounded bg-emerald-600 text-white">3x</button>
          <button onclick="setZoom(4)" id="z-btn-4" class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">4x</button>
        </div>
      </div>

      <div class="flex flex-col items-center justify-center p-8 bg-black/80 rounded-lg border border-[var(--border)] min-h-[300px]">
        <canvas id="anim-canvas" width="144" height="144" class="border border-zinc-800 rounded bg-zinc-950 shadow-lg"></canvas>
        <div id="anim-caption" class="mt-3 text-xs text-zinc-400 text-center">Playing: Walk Cycle (South / Front View) - 3 Frames Loop</div>
      </div>
    </div>

    <!-- VIEW 3: In-Game Live View -->
    <div id="view-ingame" class="hidden flex flex-col items-center justify-center p-4 bg-black/80 rounded-lg border border-[var(--border)]">
      <img src="${liveCloseupB64}" class="max-h-[460px] w-auto pixelated rounded border border-zinc-800 shadow-md">
      <div class="mt-3 text-xs text-zinc-400 text-center max-w-2xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
        <span class="text-emerald-400 font-semibold">Live In-Game 3x Smoke Test:</span> All 11 sprites on meadow terrain. Clean borders, 0 purple fringe, uniform anatomical scale.
      </div>
    </div>

  </div>

  <script>
    const actionData = ${JSON.stringify(actions)};
    let curMode = 'gallery';
    let curAct = 'walk';
    let curFacing = 0; // 0 S, 1 W, 2 E, 3 N
    let curZoom = 3;
    let animFrame = 0;
    let animTimer = null;

    const imgCache = {};
    for (const k in actionData) {
      const im = new Image();
      im.src = actionData[k].sheet;
      imgCache[k] = im;
    }

    function setMode(mode) {
      curMode = mode;
      ['gallery', 'animator', 'ingame'].forEach(m => {
        document.getElementById('view-' + m).classList.toggle('hidden', m !== mode);
        document.getElementById('btn-' + m).className = (m === mode) ? 
          'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition' :
          'px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition';
      });
      if (mode === 'animator') startAnimator();
      else stopAnimator();
    }

    function selectAction(k) {
      curAct = k;
      for (const ak in actionData) {
        document.getElementById('act-btn-' + ak).className = (ak === k) ?
          'px-2.5 py-1 text-xs rounded-md font-medium transition bg-emerald-600 text-white' :
          'px-2.5 py-1 text-xs rounded-md font-medium transition bg-[var(--muted)]/50 text-[var(--muted-foreground)] hover:text-white';
      }
      const a = actionData[k];
      document.getElementById('sheet-img').src = a.sheet;
      document.getElementById('sheet-title').textContent = a.name;
      document.getElementById('sheet-desc').textContent = a.desc;
      document.getElementById('sheet-tag').textContent = a.tag;
      document.getElementById('sheet-tag').className = 'px-2 py-0.5 text-[10px] font-bold rounded border ' + a.tagColor;
    }

    function setFacing(f) {
      curFacing = f;
      [0, 1, 2, 3].forEach(i => {
        document.getElementById('f-btn-' + i).className = (i === f) ?
          'px-2 py-1 rounded bg-emerald-600 text-white' : 'px-2 py-1 rounded bg-zinc-800 text-zinc-300';
      });
      updateAnimCaption();
    }

    function setZoom(z) {
      curZoom = z;
      [2, 3, 4].forEach(i => {
        document.getElementById('z-btn-' + i).className = (i === z) ?
          'px-2 py-0.5 rounded bg-emerald-600 text-white' : 'px-2 py-0.5 rounded bg-zinc-800 text-zinc-300';
      });
      const cvs = document.getElementById('anim-canvas');
      cvs.width = 48 * curZoom;
      cvs.height = 48 * curZoom;
    }

    function updateAnimAction() {
      curAct = document.getElementById('anim-act-select').value;
      updateAnimCaption();
    }

    function updateAnimCaption() {
      const dirs = ['South (Front)', 'West (Left Profile)', 'East (Right Profile)', 'North (Back)'];
      document.getElementById('anim-caption').textContent = \`Playing: \${actionData[curAct].name.split('(')[0]} (\${dirs[curFacing]}) - 3 Frames\`;
    }

    function startAnimator() {
      if (animTimer) clearInterval(animTimer);
      const cvs = document.getElementById('anim-canvas');
      const ctx = cvs.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const seq = [0, 1, 2, 1];
      let seqIdx = 0;

      animTimer = setInterval(() => {
        seqIdx = (seqIdx + 1) % seq.length;
        animFrame = seq[seqIdx];
        const im = imgCache[curAct];
        if (im && im.complete) {
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          const sx = animFrame * 48;
          const sy = curFacing * 48;
          ctx.drawImage(im, sx, sy, 48, 48, 0, 0, cvs.width, cvs.height);
        }
      }, 180);
    }

    function stopAnimator() {
      if (animTimer) {
        clearInterval(animTimer);
        animTimer = null;
      }
    }
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(BRAIN_DIR, 'elf_12_sprite_viewer.html'), html);
console.log('Saved 12-sprite action viewer to:', path.join(BRAIN_DIR, 'elf_12_sprite_viewer.html'));
