const fs = require('fs');
const path = require('path');

function getBase64(filePath) {
    return fs.readFileSync(filePath).toString('base64');
}

const b64Settler16x = getBase64('game/test_output/settler_clean_16x.png');
const b64Settler3x = getBase64('game/test_output/settler_clean_3x.png');
const b64Settler1x = getBase64('game/test_output/settler_clean_1x.png');

const b64Man1 = getBase64('game/test_output/ff5_Man1-Front_zoom.png');
const b64Bartz = getBase64('game/test_output/ff5_bartz_native_zoom.png');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Final Fantasy V Art Style with Ultima VII Daylight Palette</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .pixelated {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body class="bg-stone-950 text-stone-100 antialiased p-6">
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="border-b border-stone-800 pb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-amber-400">Final Fantasy V Style Settler</h1>
        <p class="text-stone-400 text-sm">Colored exclusively with Ultima VII Daylight Palette (PALETTES.FLX Record 0)</p>
      </div>
      <span class="px-3 py-1 bg-amber-950 border border-amber-600 text-amber-300 text-xs font-mono rounded">
        NATIVE 16×16 CANVAS
      </span>
    </div>

    <!-- Main Comparison Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Settler Showcase -->
      <div class="bg-stone-900 border-2 border-amber-500/50 rounded-xl p-5 flex flex-col items-center">
        <span class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Our New Settler Sprite</span>
        
        <div class="bg-stone-950 p-6 rounded-lg border border-stone-800 flex items-center justify-center gap-6 w-full mb-4">
          <div class="flex flex-col items-center gap-1.5">
            <img class="pixelated" src="data:image/png;base64,${b64Settler1x}" width="16" height="16" alt="1x Native">
            <span class="text-[11px] text-stone-400 font-mono">1x Native</span>
          </div>
          <div class="flex flex-col items-center gap-1.5">
            <img class="pixelated" src="data:image/png;base64,${b64Settler3x}" width="48" height="48" alt="3x In-game">
            <span class="text-[11px] text-amber-400 font-mono">3x Game (48px)</span>
          </div>
          <div class="flex flex-col items-center gap-1.5">
            <img class="pixelated border border-magenta-500/30" src="data:image/png;base64,${b64Settler16x}" width="160" height="160" alt="16x Zoom">
            <span class="text-[11px] text-stone-400 font-mono">16x Zoomed</span>
          </div>
        </div>

        <div class="w-full text-xs text-stone-300 space-y-1.5 bg-stone-950/60 p-3 rounded border border-stone-800/80">
          <p>• <strong>Hair:</strong> Short dark brown (#8A5D2D / #6D3D0C / #5D350C) with top-left highlight.</p>
          <p>• <strong>Eyes:</strong> Authentic FF5 2x2 structure (crisp #FFFFFF sclera + dark pupil).</p>
          <p>• <strong>Tunic:</strong> Undyed homespun linen (#EBE3D7 / #CAB292 / #AA8659) to mid-thigh with V-neck.</p>
          <p>• <strong>Belt:</strong> Brown rope belt (#BA9A71 / #613100) tied at waist.</p>
          <p>• <strong>Trousers:</strong> Dark grey-brown (#553D31 / #3D2D24 / #281C14) emerging below tunic.</p>
          <p>• <strong>Boots:</strong> Simple dark leather (#4D2D0C / #2D1C08) touching row 16 bottom.</p>
        </div>
      </div>

      <!-- FF5 SNES Reference -->
      <div class="bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col items-center">
        <span class="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3">Authentic FF5 SNES ROM References</span>

        <div class="bg-stone-950 p-6 rounded-lg border border-stone-800 flex items-center justify-center gap-6 w-full mb-4">
          <div class="flex flex-col items-center gap-1.5">
            <img class="pixelated" src="data:image/png;base64,${b64Man1}" width="140" height="160" alt="FF5 Man1">
            <span class="text-[11px] text-sky-300 font-mono">FF5 Townsman 1</span>
          </div>
          <div class="flex flex-col items-center gap-1.5">
            <img class="pixelated" src="data:image/png;base64,${b64Bartz}" width="140" height="160" alt="FF5 Bartz">
            <span class="text-[11px] text-sky-300 font-mono">FF5 Bartz</span>
          </div>
        </div>

        <div class="w-full text-xs text-stone-300 space-y-1.5 bg-stone-950/60 p-3 rounded border border-stone-800/80">
          <p>• <strong>True Resolution:</strong> 14px wide × 16px high centered in 16×16 frame.</p>
          <p>• <strong>Facial Formula:</strong> 2px high eyes with 2px skin bridge between them.</p>
          <p>• <strong>Posture:</strong> Broad shoulders (12-14px), arms at sides, hands peeking at hips.</p>
          <p>• <strong>SNES Identity:</strong> No cartoon balloon head, no skinny stickman slop.</p>
        </div>
      </div>
    </div>

    <!-- Palette Breakdown -->
    <div class="bg-stone-900 border border-stone-800 rounded-xl p-5">
      <h3 class="text-sm font-semibold text-stone-200 mb-3">Ultima VII Daylight Palette Mapping</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#201408"></span>
          <div><div class="font-mono text-[10px]">#201408</div><div class="text-[10px] text-stone-400">Outline</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#8A5D2D"></span>
          <div><div class="font-mono text-[10px]">#8A5D2D</div><div class="text-[10px] text-stone-400">Hair High</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#6D3D0C"></span>
          <div><div class="font-mono text-[10px]">#6D3D0C</div><div class="text-[10px] text-stone-400">Hair Mid</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#FFDFBA"></span>
          <div><div class="font-mono text-[10px]">#FFDFBA</div><div class="text-[10px] text-stone-400">Skin Light</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#E3C2B2"></span>
          <div><div class="font-mono text-[10px]">#E3C2B2</div><div class="text-[10px] text-stone-400">Skin Mid</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#FFFFFF"></span>
          <div><div class="font-mono text-[10px]">#FFFFFF</div><div class="text-[10px] text-stone-400">Sclera</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#EBE3D7"></span>
          <div><div class="font-mono text-[10px]">#EBE3D7</div><div class="text-[10px] text-stone-400">Linen High</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#CAB292"></span>
          <div><div class="font-mono text-[10px]">#CAB292</div><div class="text-[10px] text-stone-400">Linen Mid</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#AA8659"></span>
          <div><div class="font-mono text-[10px]">#AA8659</div><div class="text-[10px] text-stone-400">Linen Low</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#BA9A71"></span>
          <div><div class="font-mono text-[10px]">#BA9A71</div><div class="text-[10px] text-stone-400">Rope Belt</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#553D31"></span>
          <div><div class="font-mono text-[10px]">#553D31</div><div class="text-[10px] text-stone-400">Trousers</div></div>
        </div>
        <div class="bg-stone-950 p-2 rounded border border-stone-800 flex items-center gap-2">
          <span class="w-5 h-5 rounded" style="background:#4D2D0C"></span>
          <div><div class="font-mono text-[10px]">#4D2D0C</div><div class="text-[10px] text-stone-400">Boots</div></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const targetPath = 'C:\\Users\\snewt\\.gemini\\antigravity\\brain\\0b6708e3-82fc-4aaa-90fd-dc48dedc58fa\\style_comparison.html';
fs.writeFileSync(targetPath, html);
console.log('Saved style_comparison.html');

