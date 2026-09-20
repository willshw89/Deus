const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const artDir = path.join(ROOT, 'art', 'review');
const facesDir = path.join(ROOT, 'game', 'img', 'faces');
const artifactDir = 'C:\\Users\\snewt\\.gemini\\antigravity\\brain\\f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45';

const factions = [
  { id: "human", name: "Human", bgm: "Town1", file: "UF_Faces_human_1.png", frame: "Carved stone archway with oak rosettes on deep midnight navy." },
  { id: "elf", name: "Elf", bgm: "Theme2", file: "UF_Faces_elf_1.png", frame: "Leafy bower of living branches and golden foliage on deep forest green." },
  { id: "dwarf", name: "Dwarf", bgm: "Town2", file: "UF_Faces_dwarf_1.png", frame: "Rune-cut granite stone niche with iron brackets on hearth-lit dark rock." },
  { id: "gnome", name: "Gnome", bgm: "Town3", file: "UF_Faces_gnome_1.png", frame: "Polished brass-and-gear roundel bezel on dark teal enamel." },
  { id: "goblin", name: "Goblin", bgm: "Dungeon2", file: "UF_Faces_goblin_1.png", frame: "Patched hide, twisted wire, and rusted scrap iron on smoky olive dusk." },
  { id: "orc", name: "Orc", bgm: "Battle3", file: "UF_Faces_orc_1.png", frame: "Black wrought iron and carved beast bone with boar tusk clamps on red-brown." },
  { id: "lizardfolk", name: "Lizardfolk", bgm: "Town7", file: "UF_Faces_lizardfolk_1.png", frame: "Bound river reeds and spiral nautilus shells with pearl mounts on marsh teal." },
  { id: "kobold", name: "Kobold", bgm: "Dungeon1", file: "UF_Faces_kobold_1.png", frame: "Rough tunnel-rock niche hung with copper bells and candle wax on clay ochre." },
  { id: "undead", name: "Undead", bgm: "Dungeon3", file: "UF_Faces_undead_1.png", frame: "Ancient mausoleum slate stone niche with creeping grave moss on tomb grey." },
  { id: "starborn", name: "Starborn", bgm: "Theme1", file: "UF_Faces_starborn_1.png", frame: "Geometric crystal lattice with cut sapphire facets and silver nodes on indigo void." },
  { id: "swarm", name: "Swarm", bgm: "Dungeon6", file: "UF_Faces_swarm_1.png", frame: "Ribbed chitin exoskeleton frame with glistening violet sinew nodes on toxic chitin." }
];

console.log('Encoding in-game dialogue screenshots to base64...');
for (const f of factions) {
  const p = path.join(artDir, `faction_dialogue_${f.file}`);
  if (fs.existsSync(p)) {
    f.dialogueB64 = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  } else {
    console.warn('Missing: ' + p);
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased p-3 font-sans">
  <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-5 shadow-lg max-w-4xl mx-auto">
    <div class="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
      <div>
        <h2 class="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <span>⚔️</span> Live In-Game Faction Facesets & Frames
        </h2>
        <p class="text-xs text-[var(--muted-foreground)] mt-0.5">Direct in-engine NW.js snapshots showing Ultima VII faction frames inside RMMZ dialogue</p>
      </div>
      <div class="text-xs px-2.5 py-1 rounded bg-[var(--accent)] text-[var(--accent-foreground)] font-mono font-semibold">
        11 Factions Live
      </div>
    </div>

    <!-- Faction Tabs -->
    <div class="flex flex-wrap gap-1.5 mb-4" id="factionTabs"></div>

    <!-- In-Game View Container -->
    <div class="bg-[var(--background)] p-4 rounded-lg border border-[var(--border)]">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Active In-Game Dialogue Box & Frame
        </span>
        <div class="flex gap-2">
          <span id="factionBadge" class="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">Human</span>
          <span id="bgmBadge" class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">BGM: Town1</span>
        </div>
      </div>

      <!-- In-Engine Capture -->
      <div class="border border-[var(--border)] rounded-lg overflow-hidden bg-black shadow-xl">
        <img id="dialogueImg" src="" alt="Live In-Game Dialogue" class="w-full h-auto block" />
      </div>

      <!-- Detail Card -->
      <div class="mt-3 bg-[var(--card)] p-3 rounded-lg border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span class="text-xs font-semibold text-[var(--foreground)] block">Cultural Frame Motif:</span>
          <p class="text-xs text-[var(--muted-foreground)] mt-0.5" id="frameDescText"></p>
        </div>
        <div class="text-xs font-mono text-[var(--muted-foreground)] shrink-0 bg-[var(--background)] px-2.5 py-1 rounded border border-[var(--border)]" id="sheetFile">
        </div>
      </div>
    </div>

    <!-- Navigation Controls -->
    <div class="mt-4 flex items-center justify-between pt-3 border-t border-[var(--border)]">
      <button onclick="prevFaction()" class="text-xs px-3 py-1.5 rounded bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--accent)] transition-colors font-medium">
        ← Previous Faction
      </button>
      <span class="text-xs text-[var(--muted-foreground)]" id="counter">Faction 1 of 11</span>
      <button onclick="nextFaction()" class="text-xs px-3 py-1.5 rounded bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--accent)] transition-colors font-medium">
        Next Faction →
      </button>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify(factions)};
    let current = 0;

    const tabsContainer = document.getElementById("factionTabs");
    const dialogueImg = document.getElementById("dialogueImg");
    const factionBadge = document.getElementById("factionBadge");
    const bgmBadge = document.getElementById("bgmBadge");
    const sheetFile = document.getElementById("sheetFile");
    const frameDescText = document.getElementById("frameDescText");
    const counter = document.getElementById("counter");

    function renderTabs() {
      tabsContainer.innerHTML = "";
      data.forEach((f, idx) => {
        const btn = document.createElement("button");
        const active = idx === current;
        btn.className = "text-xs px-2.5 py-1 rounded transition-colors font-medium " + (
          active
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm font-semibold"
            : "bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
        );
        btn.textContent = f.name;
        btn.onclick = () => selectFaction(idx);
        tabsContainer.appendChild(btn);
      });
    }

    function selectFaction(idx) {
      current = idx;
      const f = data[idx];
      dialogueImg.src = f.dialogueB64;
      factionBadge.textContent = f.name;
      bgmBadge.textContent = "BGM: " + f.bgm;
      sheetFile.textContent = f.file;
      frameDescText.textContent = f.frame;
      counter.textContent = "Faction " + (idx + 1) + " of " + data.length;
      renderTabs();
    }

    function prevFaction() {
      selectFaction((current - 1 + data.length) % data.length);
    }

    function nextFaction() {
      selectFaction((current + 1) % data.length);
    }

    selectFaction(0);
  </script>
</body>
</html>`;

const outPath = path.join(artifactDir, 'faction_faces_preview.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Saved self-contained base64 widget to: ' + outPath);
