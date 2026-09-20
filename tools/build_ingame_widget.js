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
const focusedB64 = toBase64(path.join(REVIEW_DIR, 'standard_8d_live_focused_scene.png'));
const normalB64  = toBase64(path.join(REVIEW_DIR, 'standard_8d_live_normal.png'));
const familyB64  = toBase64(path.join(REVIEW_DIR, 'elf_demographics_family_board.png'));

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
          Live In-Engine RMMZ Gameplay: Elf Demographics (Male, Female, Child)
        </h2>
        <p class="text-sm text-[var(--muted-foreground)]">Captured live in RPG Maker MZ Playtest engine on Ground level (Map 1000)</p>
      </div>
      <div class="flex gap-2 text-xs">
        <button onclick="setTab('focused')" id="btn-focused" class="px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 text-white transition">Family Showcase</button>
        <button onclick="setTab('closeup')" id="btn-closeup" class="px-3 py-1.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">3x Close-up</button>
        <button onclick="setTab('family')" id="btn-family" class="px-3 py-1.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">Demographics Board</button>
        <button onclick="setTab('normal')" id="btn-normal" class="px-3 py-1.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-white transition">2x Wide View</button>
      </div>
    </div>

    <!-- Active Viewport Container -->
    <div class="relative bg-black/80 rounded-lg overflow-hidden border border-[var(--border)] flex items-center justify-center p-2 min-h-[480px]">
      <div id="view-focused" class="w-full flex flex-col items-center">
        <img src="${focusedB64}" class="pixelated rounded max-h-[520px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-3xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">Live In-Game Family Scene:</span> Adult Male (40px), Adult Female (39px), and Elf Child (30px) side-by-side in active gameplay! Notice the bottom family group with Father on left, Mother on right, and Child in center.
        </div>
      </div>

      <div id="view-closeup" class="w-full hidden flex flex-col items-center">
        <img src="${closeupB64}" class="pixelated rounded max-h-[520px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-3xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">3x In-Game Close-up:</span> Full parade showing 8-directional movement cycles for Male, Female, and Child, directional attacks with mithril slash arcs, ranged bows, radiant emerald mana casting, and grounded kneeling craftsmen.
        </div>
      </div>

      <div id="view-family" class="w-full hidden flex flex-col items-center">
        <img src="${familyB64}" class="pixelated rounded max-h-[520px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-3xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">Creator Review Board (All Demographics):</span> Stacked 18 columns × 8 rows specification matrices for Adult Male, Adult Female, and Elf Child with 100% anatomical alignment and palette locking.
        </div>
      </div>

      <div id="view-normal" class="w-full hidden flex flex-col items-center">
        <img src="${normalB64}" class="pixelated rounded max-h-[520px] w-auto border border-zinc-800 shadow-md">
        <div class="mt-3 text-xs text-zinc-400 text-center max-w-3xl bg-zinc-900/90 px-3 py-1.5 rounded border border-zinc-800">
          <span class="text-emerald-400 font-semibold">2x Normal Overview:</span> The entire colony contingent assembled on savannah terrain with active weather, stances, and proper grounding.
        </div>
      </div>
    </div>

    <!-- Demographics Specification Details -->
    <div class="grid grid-cols-3 gap-3 mt-4 text-xs">
      <div class="p-3 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
          <span>Adult Male</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">40px Stature</span>
        </div>
        <p class="text-[var(--muted-foreground)]">Ground rows 8..47, athletic warrior silhouette, longbow tension, mithril blade slash arcs, high North mana channel, 34px kneeling craftsman.</p>
      </div>
      <div class="p-3 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
          <span>Adult Female</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">39px Stature</span>
        </div>
        <p class="text-[var(--muted-foreground)]">Ground rows 9..47, slender waist, flared sylvan tunic hem with silver trim, cascading silver hair past shoulders, graceful sylvan rapier & recurve bow.</p>
      </div>
      <div class="p-3 rounded bg-[var(--muted)]/30 border border-[var(--border)]">
        <div class="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
          <span>Elf Child / Kid</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">30px Stature</span>
        </div>
        <p class="text-[var(--muted-foreground)]">Ground rows 18..47, youthful 1:2.8 proportions, cute pointed elven ears, practice dagger swing, training shortbow, fairy mana sparkles, kneeling berry forager.</p>
      </div>
    </div>
  </div>

  <script>
    function setTab(tab) {
      ['focused', 'closeup', 'family', 'normal'].forEach(t => {
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
