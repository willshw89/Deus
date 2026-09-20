'use strict';
const fs = require('fs');
const path = require('path');

const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const REVIEW_DIR = path.resolve(__dirname, '..', 'art', 'review');

function toBase64(filePath) {
    if (!fs.existsSync(filePath)) return '';
    return 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
}

const closeupB64 = toBase64(path.join(REVIEW_DIR, 'standard_4d_live_closeup.png'));
const normalB64  = toBase64(path.join(REVIEW_DIR, 'standard_4d_live_normal.png'));
const reviewB64  = toBase64(path.join(REVIEW_DIR, 'elf_standard_4d_review_board.png'));

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
  <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-5 shadow-lg max-w-5xl mx-auto">
    <div class="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
      <div>
        <h2 class="text-xl font-bold flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
          Standard 4-Directional Charset Suite: 100% Nano Banana II
        </h2>
        <p class="text-sm text-[var(--muted-foreground)]">Captured live in RPG Maker MZ Playtest engine on Ground level (Map 1000)</p>
      </div>
      <div class="flex gap-2 text-xs">
        <button onclick="setTab('closeup')" id="btn-closeup" class="px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 text-white transition">3x Live Close-up</button>
        <button onclick="setTab('normal')" id="btn-normal" class="px-3 py-1.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">2x Wide View</button>
        <button onclick="setTab('review')" id="btn-review" class="px-3 py-1.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">Full Master Matrix</button>
      </div>
    </div>

    <!-- Active Viewport Container -->
    <div class="relative bg-black/80 rounded-lg overflow-hidden border border-[var(--border)] flex items-center justify-center p-2 min-h-[480px]">
      <div id="view-closeup" class="w-full flex flex-col items-center">
        <img src="${closeupB64}" class="pixelated rounded max-h-[520px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-3xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">Live In-Game 3x Close-up:</span> 3 rows of demographics (Adult Male 40px top, Adult Female 39px mid, Elf Child 30px bottom). Each row showcases 4 walking directions (S, W, E, N) followed by the 6 core actions: Dedicated Hauling Sack (AR-600 col 7), Melee Attack Slash, Ranged Bow String Pluck, Magic Mana Channel, Kneeling Craft/Harvest, and Downed Horizontal Resting Corpse!
        </div>
      </div>

      <div id="view-normal" class="w-full hidden flex flex-col items-center">
        <img src="${normalB64}" class="pixelated rounded max-h-[520px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-3xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">2x Normal Gameplay Overview:</span> All 30 units deployed on active terrain with live river water, rain particle effects, and proper RMMZ tile-anchored grounding at row 47.
        </div>
      </div>

      <div id="view-review" class="w-full hidden flex flex-col items-center">
        <img src="${reviewB64}" class="pixelated rounded max-h-[520px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-3xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">Master Matrix Review Board (21 Columns × 4 Rows per Demographic):</span> 100% sourced from Google Nano Banana II generations, quantized to &le;31 colors on uf.hex, binary alpha 0/255, and zero U7 likeness (0 FAIL, 0 WARN).
        </div>
      </div>
    </div>

    <!-- Action & Architecture Highlights -->
    <div class="grid grid-cols-4 gap-3 mt-4 text-xs">
      <div class="p-3 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
          <span>4-Direction Movement</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Clean Standard</span>
        </div>
        <p class="text-[var(--muted-foreground)]">Down (2), Left (4), Right (6 mirrored), Up (8). Movement stays 8-way in engine while sprites use authentic SNES/FF6 4-facing charsets without diagonal bloat.</p>
      </div>
      <div class="p-3 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
          <span>Dedicated Hauling</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">AR-600 Col 7</span>
        </div>
        <p class="text-[var(--muted-foreground)]">Colonists visibly carry a heavy burlap sack in their arms when hauling logs, stone, or supplies, replacing the generic walk cycle.</p>
      </div>
      <div class="p-3 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
          <span>Ranged & Magic</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Separated Missiles</span>
        </div>
        <p class="text-[var(--muted-foreground)]">Bow frames depict string tension and release pluck; Magic frames depict radiant hand-glow / staff raising. Projectiles are animated independently.</p>
      </div>
      <div class="p-3 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
          <span>Demographics</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">3 Archetypes</span>
        </div>
        <p class="text-[var(--muted-foreground)]">Adult Male (40px, amber eyes), Adult Female (39px, cyan eyes & silver hair), Elf Child (30px, youthful proportions & scaled accessories).</p>
      </div>
    </div>
  </div>

  <script>
    function setTab(tab) {
      ['closeup', 'normal', 'review'].forEach(t => {
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
