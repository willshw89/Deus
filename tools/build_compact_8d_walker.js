const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

function toBase64(filePath) {
    const data = fs.readFileSync(filePath);
    return 'data:image/png;base64,' + data.toString('base64');
}

const humanSheet = toBase64(path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Male_8D.png'));
const dwarfSheet = toBase64(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Male_8D.png'));
const elfSheet = toBase64(path.join(ROOT, 'game', 'img', 'characters', '$UF_Elf_Male_8D.png'));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>8-Direction Simultaneous Walk Cycles</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    canvas {
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body class="bg-transparent text-[#e2e8f0] font-sans antialiased p-2">
  <div class="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-4 max-w-full">
    
    <!-- Header -->
    <div class="border-b border-[#30363d] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div>
        <h2 class="text-base font-bold text-white flex items-center gap-2">
          <span>🚶</span>
          <span>3 Sprites Walking in All 8 Directions (Simultaneous)</span>
        </h2>
        <p class="text-xs text-[#8b949e]">Live animation of Human, Dwarf, and Elf walking simultaneously across all 8 compass facings.</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-[#8b949e]">Speed:</label>
        <select id="speed-select" onchange="setSpeed(this.value)" class="bg-[#21262d] border border-[#30363d] text-xs rounded px-2 py-1 text-white">
          <option value="120">Fast (120ms)</option>
          <option value="160" selected>Normal (160ms)</option>
          <option value="240">Slow (240ms)</option>
        </select>
      </div>
    </div>

    <!-- Table of 8 Facings x 3 Sprites -->
    <div class="space-y-3">
      <!-- Header Row -->
      <div class="grid grid-cols-4 gap-2 text-center text-xs font-bold text-[#8b949e] border-b border-[#30363d] pb-1">
        <div class="text-left pl-2">Facing Direction</div>
        <div class="text-blue-400">Human Male (38px)</div>
        <div class="text-amber-400">Dwarf Male (36px)</div>
        <div class="text-emerald-400">Elf Male (40px)</div>
      </div>

      <!-- 8 Rows Container -->
      <div id="rows-container" class="space-y-2">
        <!-- Rendered by JS -->
      </div>
    </div>

    <!-- Footer Note -->
    <div class="p-2.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-[11px] text-[#8b949e] flex justify-between">
      <span><strong>Mechanics:</strong> Planted boot on Row 47, trailing boot lifted with daylight, scissor leg split in profile.</span>
      <span class="text-emerald-400 font-semibold">16-Bit FF5 Proportions</span>
    </div>

  </div>

  <script>
    const facings = [
      { id: 'S', name: 'South', arrow: '⬇', desc: 'Front Stomp', row: 0 },
      { id: 'SW', name: 'South-West', arrow: '↙', desc: '3/4 Turn', row: 1 },
      { id: 'W', name: 'West', arrow: '⬅', desc: 'Scissor Split', row: 2 },
      { id: 'NW', name: 'North-West', arrow: '↖', desc: '3/4 Back', row: 3 },
      { id: 'N', name: 'North', arrow: '⬆', desc: 'Back Walk', row: 4 },
      { id: 'NE', name: 'North-East', arrow: '↗', desc: '3/4 Back', row: 5 },
      { id: 'E', name: 'East', arrow: '➡', desc: 'Scissor Split', row: 6 },
      { id: 'SE', name: 'South-East', arrow: '↘', desc: '3/4 Turn', row: 7 }
    ];

    const sheets = {
      human: new Image(),
      dwarf: new Image(),
      elf: new Image()
    };
    sheets.human.src = '${humanSheet}';
    sheets.dwarf.src = '${dwarfSheet}';
    sheets.elf.src = '${elfSheet}';

    const walkSeq = [0, 1, 2, 1]; // Left step, Stand, Right step, Stand
    let seqIdx = 0;
    let animTimer = null;
    let animSpeed = 160;

    // Create the 8 rows in DOM
    const container = document.getElementById('rows-container');
    facings.forEach(f => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'grid grid-cols-4 gap-2 items-center bg-[#21262d] border border-[#30363d] rounded-lg p-1.5 hover:border-[#58a6ff] transition';
      
      // Label cell
      const labelCell = document.createElement('div');
      labelCell.className = 'pl-2 text-xs';
      labelCell.innerHTML = '<span class="font-bold text-white text-sm mr-1">' + f.arrow + '</span> ' +
        '<span class="font-semibold text-white">' + f.name + '</span>' +
        '<span class="block text-[10px] text-[#8b949e]">' + f.desc + '</span>';
      rowDiv.appendChild(labelCell);

      // 3 Canvas Cells: Human, Dwarf, Elf
      ['human', 'dwarf', 'elf'].forEach(sp => {
        const cell = document.createElement('div');
        cell.className = 'flex justify-center items-center bg-[#161b22] rounded border border-[#30363d]/60 py-1';
        
        const canvas = document.createElement('canvas');
        canvas.id = 'cvs-' + sp + '-' + f.id;
        canvas.width = 96;  // 48px at 2x scale
        canvas.height = 96; // 48px at 2x scale
        canvas.className = 'w-[72px] h-[72px] sm:w-[84px] sm:h-[84px]';
        cell.appendChild(canvas);
        rowDiv.appendChild(cell);
      });

      container.appendChild(rowDiv);
    });

    function drawAllFrames() {
      const col = walkSeq[seqIdx];

      facings.forEach(f => {
        const row = f.row;

        ['human', 'dwarf', 'elf'].forEach(sp => {
          const canvas = document.getElementById('cvs-' + sp + '-' + f.id);
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const img = sheets[sp];
          if (img && img.complete) {
            // Draw ground line at row 47 (y = 47 * 2 = 94)
            ctx.fillStyle = 'rgba(63, 185, 80, 0.35)';
            ctx.fillRect(4, 94, 88, 2);

            // Draw sprite 48x48 scaled 2x to 96x96
            ctx.drawImage(img, col * 48, row * 48, 48, 48, 0, 0, 96, 96);
          }
        });
      });
    }

    function tick() {
      seqIdx = (seqIdx + 1) % walkSeq.length;
      drawAllFrames();
    }

    function setSpeed(ms) {
      animSpeed = parseInt(ms);
      if (animTimer) clearInterval(animTimer);
      animTimer = setInterval(tick, animSpeed);
    }

    window.addEventListener('load', () => {
      drawAllFrames();
      animTimer = setInterval(tick, animSpeed);
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(BRAIN, 'sprite_walker.html'), html, 'utf8');
console.log('Saved compact 8D walker to sprite_walker.html');

