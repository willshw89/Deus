const fs = require('fs');
const path = require('path');

function getBase64(filePath) {
    return fs.readFileSync(filePath).toString('base64');
}

const b64Chibi16x = getBase64('art/settler_male_16x.png');
const b64Chibi3x = getBase64('game/test_output/settler_male_3x.png');

const b64Real16x = getBase64('game/test_output/realistic_settler_16a_16x.png');
const b64Real16x3x = getBase64('game/test_output/realistic_settler_16a_3x.png');

const b64Real48x = getBase64('game/test_output/realistic_settler_48x48_zoom.png');
const b64Real48x1x = getBase64('game/test_output/realistic_settler_48x48_tile.png');

const b64Real24 = getBase64('game/test_output/realistic_settler_24_8x.png');

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
<body class="bg-transparent text-[var(--foreground)] antialiased p-3">
  <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-5 shadow-lg max-w-3xl mx-auto">
    <div class="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
      <div>
        <h2 class="text-xl font-bold text-[var(--foreground)]">Art Style Comparison</h2>
        <p class="text-sm text-[var(--muted-foreground)]">Chibi vs. Realistic (Non-Chibi) with Authentic Ultima VII Palette</p>
      </div>
      <span class="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">
        Ultima VII Daylight Palette
      </span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- Option 1: Previous Chibi -->
      <div class="bg-[var(--background)]/60 border border-[var(--border)] rounded-lg p-4 flex flex-col items-center text-center opacity-70">
        <span class="text-xs font-semibold text-rose-400 mb-2 uppercase tracking-wide">1. Previous Chibi (Rejected)</span>
        <div class="bg-black/40 p-4 rounded-md border border-white/10 mb-3 flex items-center justify-center gap-4">
          <div class="flex flex-col items-center gap-1">
            <img class="pixelated" src="data:image/png;base64,${b64Chibi3x}" width="48" height="48" alt="Chibi 3x">
            <span class="text-[10px] text-gray-400">1x (48px)</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <img class="pixelated" src="data:image/png;base64,${b64Chibi16x}" width="120" height="120" alt="Chibi Zoom">
            <span class="text-[10px] text-gray-400">Zoomed</span>
          </div>
        </div>
        <ul class="text-xs text-[var(--muted-foreground)] text-left space-y-1 w-full mt-1">
          <li>• <strong>Proportions:</strong> 1:3 head-to-body (huge head)</li>
          <li>• <strong>Face:</strong> Giant anime 2x2 eyes with shiny dots</li>
          <li>• <strong>Feel:</strong> Cute, child-like casual RPG</li>
        </ul>
      </div>

      <!-- Option 2: Realistic Non-Chibi (U7 Palette) -->
      <div class="bg-[var(--background)] border-2 border-emerald-500/50 rounded-lg p-4 flex flex-col items-center text-center shadow-md">
        <span class="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">2. Realistic Adult (U7 Palette)</span>
        <div class="bg-black/40 p-4 rounded-md border border-white/10 mb-3 flex items-center justify-center gap-4">
          <div class="flex flex-col items-center gap-1">
            <img class="pixelated" src="data:image/png;base64,${b64Real48x1x}" width="48" height="48" alt="Real 48px">
            <span class="text-[10px] text-emerald-400">Tile (48px)</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <img class="pixelated" src="data:image/png;base64,${b64Real48x}" width="120" height="120" alt="Real Zoom">
            <span class="text-[10px] text-emerald-400">Zoomed</span>
          </div>
        </div>
        <ul class="text-xs text-[var(--foreground)] text-left space-y-1 w-full mt-1">
          <li>• <strong>Proportions:</strong> 1:5 adult human (mature anatomy)</li>
          <li>• <strong>Anatomy:</strong> Broad shoulders, natural waist, long legs</li>
          <li>• <strong>Face:</strong> Realistic brow & subtle eye sockets (no anime)</li>
          <li>• <strong>Palette:</strong> 100% U7 Daylight (raw linen, leather, earth)</li>
          <li>• <strong>Feel:</strong> Gritty medieval colonist / DF survival</li>
        </ul>
      </div>
    </div>

    <!-- Taller 16x24 Option -->
    <div class="mt-5 p-4 bg-[var(--background)]/40 border border-[var(--border)] rounded-lg flex items-center gap-5">
      <div class="bg-black/40 p-3 rounded-md border border-white/10 flex-shrink-0">
        <img class="pixelated" src="data:image/png;base64,${b64Real24}" width="80" height="120" alt="Taller 24px">
      </div>
      <div>
        <h4 class="text-sm font-semibold text-sky-400">Alternative: Taller 16×24 Frame (Native)</h4>
        <p class="text-xs text-[var(--muted-foreground)] mt-1">
          Gives 50% more vertical pixels inside the 48×48 tile box. Allows defined facial structure, hair curls, realistic cloth folds, and visible belt buckles while keeping exact U7 palette colors.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const targetPath = 'C:\\Users\\snewt\\.gemini\\antigravity\\brain\\0b6708e3-82fc-4aaa-90fd-dc48dedc58fa\\style_comparison.html';
fs.writeFileSync(targetPath, html);
console.log('Saved', targetPath);

