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

const closeupB64 = toBase64(path.join(REVIEW_DIR, 'human_male_live_closeup.png'));
const normalB64  = toBase64(path.join(REVIEW_DIR, 'human_male_live_normal.png'));
const boardB64   = toBase64(path.join(REVIEW_DIR, 'human_male_all_7_actions_12_sprites.png'));

const walkSheetB64   = toBase64(path.join(CHAR_DIR, '$UF_Human_Male_Walk.png'));
const haulSheetB64   = toBase64(path.join(CHAR_DIR, '$UF_Human_Male_Haul.png'));
const attackSheetB64 = toBase64(path.join(CHAR_DIR, '$UF_Human_Male_Attack.png'));
const bowSheetB64    = toBase64(path.join(CHAR_DIR, '$UF_Human_Male_Bow.png'));
const magicSheetB64  = toBase64(path.join(CHAR_DIR, '$UF_Human_Male_Magic.png'));
const workSheetB64   = toBase64(path.join(CHAR_DIR, '$UF_Human_Male_Work.png'));
const downedSheetB64 = toBase64(path.join(CHAR_DIR, '$UF_Human_Male_Downed.png'));

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
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">Demographic 1: Adult Male</span>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-950/80 text-amber-400 border border-amber-800/60">Serious Chibi (V116)</span>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-950/80 text-blue-400 border border-blue-800/60">12 Sprites / Sheet</span>
        </div>
        <h1 class="text-xl font-bold text-amber-300 mt-2">Adult Male Human — Complete 7-Action Suite</h1>
        <p class="text-slate-400 text-xs mt-1">100% Google Nano Banana Pro • FF5 16-Bit Serious Chibi (~3.07 heads, 46px tall) • Invariant baseline y=47 • U7 Originality: PASS</p>
      </div>
      <div class="text-right text-xs text-slate-400">
        <div>144×192 px RMMZ Sheets</div>
        <div class="text-emerald-400 font-semibold mt-0.5">All 7 Actions Verified</div>
      </div>
    </div>

    <!-- Section 1: Live In-Game Gameplay Close-up -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-sm font-semibold text-amber-300 uppercase tracking-wide">1. Live In-Game Gameplay Lineup (3× Zoom)</h2>
        <span class="text-xs text-slate-400">Captured live in RMMZ NW.js Runtime</span>
      </div>
      <div class="rounded-lg overflow-hidden border border-slate-700/80 bg-black/40">
        <img src="${closeupB64}" class="w-full h-auto pixelated block" alt="Live In-Game Close-up">
      </div>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs text-slate-300">
        <div class="bg-slate-900/60 p-2 rounded border border-slate-800"><span class="text-amber-400 font-bold">1-4. Walk S, W, E, N:</span> Scissor-step walking cycle</div>
        <div class="bg-slate-900/60 p-2 rounded border border-slate-800"><span class="text-amber-400 font-bold">5. Haul (Sack):</span> Heavy load in both arms against torso</div>
        <div class="bg-slate-900/60 p-2 rounded border border-slate-800"><span class="text-amber-400 font-bold">6. Melee Attack:</span> Lunge & broadsword slash arc</div>
        <div class="bg-slate-900/60 p-2 rounded border border-slate-800"><span class="text-amber-400 font-bold">7. Bow Archery:</span> Aim & draw (zero flying arrows)</div>
        <div class="bg-slate-900/60 p-2 rounded border border-slate-800"><span class="text-amber-400 font-bold">8-10. Magic, Work, Downed:</span> Chant aura, anvil strike, corpse</div>
      </div>
    </div>

    <!-- Section 2: Interactive Animation Studio -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg">
      <div class="flex justify-between items-center mb-3">
        <div>
          <h2 class="text-sm font-semibold text-amber-300 uppercase tracking-wide">2. Interactive Sprite Studio (3× Animated View)</h2>
          <p class="text-slate-400 text-xs">Switch actions to inspect live animation cycles at 3× scale with native baseline alignment.</p>
        </div>
        <div class="flex gap-1" id="facingTabs">
          <button onclick="setFacing(0)" id="fBtn_0" class="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 text-white">South (Down)</button>
          <button onclick="setFacing(1)" id="fBtn_1" class="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">West (Left)</button>
          <button onclick="setFacing(2)" id="fBtn_2" class="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">East (Right)</button>
          <button onclick="setFacing(3)" id="fBtn_3" class="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">North (Up)</button>
        </div>
      </div>

      <!-- Action Tabs -->
      <div class="flex flex-wrap gap-1.5 border-b border-slate-700 pb-3 mb-4" id="actionTabs">
        <button onclick="setAction('walk')"   id="tab_walk"   class="px-3 py-1 text-xs font-bold rounded bg-amber-500 text-black">WALK (12)</button>
        <button onclick="setAction('haul')"   id="tab_haul"   class="px-3 py-1 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">HAUL SACK (12)</button>
        <button onclick="setAction('attack')" id="tab_attack" class="px-3 py-1 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">MELEE ATTACK (12)</button>
        <button onclick="setAction('bow')"    id="tab_bow"    class="px-3 py-1 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">BOW ARCHERY (12)</button>
        <button onclick="setAction('magic')"  id="tab_magic"  class="px-3 py-1 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">MAGIC INITIATION (12)</button>
        <button onclick="setAction('work')"   id="tab_work"   class="px-3 py-1 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">WORK CRAFTSMAN (12)</button>
        <button onclick="setAction('downed')" id="tab_downed" class="px-3 py-1 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">DOWNED / CORPSE (12)</button>
      </div>

      <!-- Display Stage -->
      <div class="flex flex-col md:flex-row gap-6 items-center">
        <div class="relative w-36 h-36 bg-[#1a2333] border border-slate-600 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
          <!-- Red Baseline guide line -->
          <div class="absolute left-0 right-0 top-[141px] h-[2px] bg-red-500/80 z-20 pointer-events-none"></div>
          <!-- 3x Sprite Container -->
          <div id="animStage" class="w-[48px] h-[48px] origin-top-left transform scale-[3] pixelated" style="background-image: url('${walkSheetB64}'); background-position: 0px 0px;"></div>
        </div>

        <div class="flex-1 space-y-2 text-xs">
          <div class="flex items-center gap-2">
            <span id="actionTitle" class="text-sm font-bold text-amber-400">WALK CYCLE</span>
            <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">U7 ORIGINALITY: PASS</span>
          </div>
          <p id="actionDesc" class="text-slate-300 leading-relaxed">
            Master 12-sprite walk reference sheet. Features dynamic scissor stride foot articulation, grounded baseline y=47, and serious chibi proportions (~3.07 heads tall).
          </p>
          <div class="pt-2 border-t border-slate-800 flex gap-4 text-[11px] text-slate-400">
            <div><strong>Grid:</strong> 3 cols × 4 rows (144×192 px)</div>
            <div><strong>Frame:</strong> 48×48 px</div>
            <div><strong>Colors:</strong> 31 (snapped to uf.hex)</div>
            <div><strong>Alpha:</strong> Binary (0 or 255)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Complete 7-Action 12-Sprite Master Review Board -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-sm font-semibold text-amber-300 uppercase tracking-wide">3. Complete 7-Action 12-Sprite Architecture Board</h2>
        <span class="text-xs text-slate-400">All 84 Sprites across 7 Dedicated Sheets</span>
      </div>
      <div class="rounded-lg overflow-hidden border border-slate-700/80 bg-black/40">
        <img src="${boardB64}" class="w-full h-auto pixelated block" alt="Complete 7-Action Review Board">
      </div>
    </div>

    <!-- Section 4: 2x Normal Zoom In-Game Gameplay Scene -->
    <div class="bg-[#171e2e] border border-slate-700 rounded-xl p-5 shadow-lg">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-sm font-semibold text-amber-300 uppercase tracking-wide">4. Live In-Game Gameplay Scene (2× Normal Zoom)</h2>
        <span class="text-xs text-slate-400">Standard Camera Distance</span>
      </div>
      <div class="rounded-lg overflow-hidden border border-slate-700/80 bg-black/40">
        <img src="${normalB64}" class="w-full h-auto pixelated block" alt="Live In-Game Normal Zoom">
      </div>
    </div>

  </div>

  <script>
    const sheets = {
      walk:   { url: '${walkSheetB64}',   title: 'WALK CYCLE (12 Sprites)', desc: 'Master 12-sprite walk reference sheet. Features dynamic scissor stride foot articulation, grounded baseline y=47, and serious chibi proportions (~3.07 heads tall).' },
      haul:   { url: '${haulSheetB64}',   title: 'HAUL / CARRY SACK (12 Sprites)', desc: 'Dedicated heavy burlap sack held in front of chest in both arms across full walking step cycle (AR-600 col 7 / VISION V112).' },
      attack: { url: '${attackSheetB64}', title: 'MELEE BROADSWORD ATTACK (12 Sprites)', desc: 'High guard windup, forward heroic strike lunge with 2px solid steel broadsword blade and sweeping luminous blue-white crescent slash arc, recovery guard.' },
      bow:    { url: '${bowSheetB64}',    title: 'BOW ARCHERY (12 Sprites)', desc: 'Archery aim stance holding recurve yew wood bow, string tension draw held taut, string release pluck recoil. Zero flying arrows per VISION V111.' },
      magic:  { url: '${magicSheetB64}',  title: 'SPELL INITIATION MAGIC (12 Sprites)', desc: 'Incantation ready posture, arms raised in ritual incantation chant, soft glowing palm mana aura. Zero flying projectile beams per VISION V111.' },
      work:   { url: '${workSheetB64}',   title: 'CRAFTSMAN WORK (12 Sprites)', desc: 'Standing reach forward, proportional kneeling craftsman position (~30px height, row 47 baseline), ground hammer strike on anvil with contact spark.' },
      downed: { url: '${downedSheetB64}', title: 'DOWNED / FALLEN CORPSE (12 Sprites)', desc: 'Col 0: Hurt flinch recoil; Col 1: Kneeling collapse (~28px); Col 2: Flat horizontal prone resting corpse on ground baseline.' }
    };

    let curAction = 'walk';
    let curFacing = 0; // 0: South, 1: West, 2: East, 3: North
    let curFrame = 0;

    function setAction(act) {
      curAction = act;
      for (const k in sheets) {
        const btn = document.getElementById('tab_' + k);
        if (btn) {
          if (k === act) {
            btn.className = 'px-3 py-1 text-xs font-bold rounded bg-amber-500 text-black';
          } else {
            btn.className = 'px-3 py-1 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700';
          }
        }
      }
      document.getElementById('actionTitle').innerText = sheets[act].title;
      document.getElementById('actionDesc').innerText = sheets[act].desc;
      const stage = document.getElementById('animStage');
      stage.style.backgroundImage = "url('" + sheets[act].url + "')";
    }

    function setFacing(f) {
      curFacing = f;
      for (let i = 0; i < 4; i++) {
        const btn = document.getElementById('fBtn_' + i);
        if (btn) {
          if (i === f) {
            btn.className = 'px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 text-white';
          } else {
            btn.className = 'px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700';
          }
        }
      }
    }

    setInterval(() => {
      curFrame = (curFrame + 1) % 3;
      const stage = document.getElementById('animStage');
      if (stage) {
        const xPos = -curFrame * 48;
        const yPos = -curFacing * 48;
        stage.style.backgroundPosition = xPos + 'px ' + yPos + 'px';
      }
    }, 220);
  </script>
</body>
</html>`;

const outPath = path.join(REVIEW_DIR, 'human_male_showcase_widget.html');
fs.writeFileSync(outPath, html);
if (fs.existsSync(BRAIN_DIR)) {
    fs.writeFileSync(path.join(BRAIN_DIR, 'human_male_showcase_widget.html'), html);
}
console.log('Saved showcase widget to', outPath);
