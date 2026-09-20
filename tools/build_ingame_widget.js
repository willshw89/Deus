'use strict';
const fs = require('fs');
const path = require('path');

const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const REVIEW_DIR = path.resolve(__dirname, '..', 'art', 'review');

function toBase64(filePath) {
    if (!fs.existsSync(filePath)) return '';
    return 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
}

const closeupB64 = toBase64(path.join(REVIEW_DIR, 'standard_8d_live_closeup.png'));
const normalB64 = toBase64(path.join(REVIEW_DIR, 'standard_8d_live_normal.png'));
const boardB64 = toBase64(path.join(REVIEW_DIR, 'elf_creator_review_board.png'));

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    .pixelated {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased p-4">
  <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-5 shadow-lg max-w-4xl mx-auto">
    <div class="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
      <div>
        <h2 class="text-xl font-bold flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
          Live In-Engine RMMZ Gameplay: 8-Directional Standard Suite
        </h2>
        <p class="text-sm text-[var(--muted-foreground)]">Captured live in RPG Maker MZ Playtest engine on Ground level (Map 1000)</p>
      </div>
      <div class="flex gap-2 text-xs">
        <button onclick="setTab('closeup')" id="btn-closeup" class="px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 text-white transition">3x Close-up</button>
        <button onclick="setTab('normal')" id="btn-normal" class="px-3 py-1.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">2x Normal View</button>
        <button onclick="setTab('board')" id="btn-board" class="px-3 py-1.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">18x8 Matrix Board</button>
      </div>
    </div>

    <!-- Active Viewport Container -->
    <div class="relative bg-black/80 rounded-lg overflow-hidden border border-[var(--border)] flex items-center justify-center p-2 min-h-[460px]">
      <div id="view-closeup" class="w-full flex flex-col items-center">
        <img src="${closeupB64}" class="pixelated rounded max-h-[500px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-2xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">3x Close-up In-Game:</span> All 6 actions rendered simultaneously across all 8 directions. Notice the dynamic rain streaks, silver crescent melee slash arcs, distinct directional bow draws, radiant emerald mana glow, and grounded horizontal corpses.
        </div>
      </div>

      <div id="view-normal" class="w-full hidden flex flex-col items-center">
        <img src="${normalB64}" class="pixelated rounded max-h-[500px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-2xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">2x Normal View In-Game:</span> Showing the full parade formation on dry savannah terrain. Row 0: Walk cycle | Row 1: Melee strike | Row 2: Ranged bow | Row 3: Arcane magic | Row 4: Kneeling craft | Row 5: Downed / dead.
        </div>
      </div>

      <div id="view-board" class="w-full hidden flex flex-col items-center">
        <img src="${boardB64}" class="pixelated rounded max-h-[500px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-2xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">Creator Review Board:</span> Complete 18 columns × 8 rows specification matrix conforming to AR-600 standard with zero label collisions.
        </div>
      </div>
    </div>

    <!-- Features Breakdown -->
    <div class="grid grid-cols-3 gap-3 mt-4 text-xs">
      <div class="p-2.5 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1">⚔ Combat & Ranged</div>
        <p class="text-[var(--muted-foreground)]">True directional bow draw & silver crescent melee strikes across all 8 directions without flipped limbs.</p>
      </div>
      <div class="p-2.5 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1">✨ Arcane & Industry</div>
        <p class="text-[var(--muted-foreground)]">High-raised glowing mana hands visible against sky on North casts; unified 34px kneeling craftsmen across all 8 facings.</p>
      </div>
      <div class="p-2.5 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1">💀 Downed & Dead</div>
        <p class="text-[var(--muted-foreground)]">Authentic flinch recoil with chest blood impact, kneeling collapse, and flat grounded resting corpses on rows 37..47.</p>
      </div>
    </div>
  </div>

  <script>
    function setTab(tab) {
      ['closeup', 'normal', 'board'].forEach(t => {
        const v = document.getElementById('view-' + t);
        const b = document.getElementById('btn-' + t);
        if (t === tab) {
          v.classList.remove('hidden');
          b.className = 'px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 text-white transition';
        } else {
          v.classList.add('hidden');
          b.className = 'px-3 py-1.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition';
        }
      });
    }
  </script>
</body>
</html>`;

const targetFile = path.join(BRAIN_DIR, 'ingame_showcase_widget.html');
fs.writeFileSync(targetFile, html, 'utf8');
console.log('Wrote widget to:', targetFile);
