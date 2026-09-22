# DEUS GENERATION PACKET 01: BASELINE & STARTING SCENARIO CONTRACT

**System Identifier:** `DEUS_GENERATION_PACKET_01_BASELINE_AND_STARTING_CONTRACT`  
**Integration Authority:** Owner Terminal (Gemini)  
**Creation Date:** 2026-09-22  
**Target Repository:** `C:\Users\snewt\OneDrive\Desktop\UF`  
**Classification:** Generation Source Baseline Audit  

---

## 1. Actual Current Starting Configuration (Authoritative Baseline)

*Inspected directly from `game/data/UF_WorldCatalog.json` (`start`, `factions`, `colony`, `climate`). Values are factual and un-inferred.*

### 1.1 Starting Population & Personnel
- **Headcount:** Exactly 8 founders (4 male, 4 female), all adults aged between 18 and 40 (`start.founders.age: [18, 40]`).
- **Hierarchy:** One founder is rolled as the band's Leader (Rank 1, title randomly selected from `["Chief", "Warden", "Speaker", "Reeve"]`). The remaining 7 colonists answer to the leader.
- **Names:** Syllables constructed deterministically from `start.names.start` combined with `start.names.male` or `start.names.female`.
- **Character Sprites & Clothing Tiers:**
  - Male: `$UF_Human_Male` (Tiers 0–3: `$UF_Human_Male`, `$Adam`, `$UF_Human_Male`, `$Adam`).
  - Female: `$UF_Human_Female` (Tiers 0–3: `$UF_Human_Female`, `$Eve`, `$UF_Human_Female`, `$Eve`).
- **Stats:** D20-rolled attributes per VISION V53.

### 1.2 Starting Location, Spawn Rules & Geography
- **Map Dimensions:** 256×256 tiles on Map001 runtime container.
- **Starting Layer:** Layer $Z = 0$ (Ground).
- **Placement Coordinates:** Map center (`mid = 128`). The player's faction camp is guaranteed within 6 cells of `(128, 128)` (`areas.playerReach: 6`).
- **Clearing:** `clearRadius: 0` with glade note (`"<glade>"`). A 9-cell disc around the campfire is kept clear of natural obstructions.
- **Initial Fixtures:** A lit campfire (`id: "hearth"`, build: `campfire`) placed at `(0, 0)` relative to the camp center. Zero pre-built houses, walls, or workshops.
- **Founders Placement:** Placed in a ring within reach 3 cells of the campfire, facing inward.

### 1.3 Starting Supplies & Guaranteed Resource Kit
The starting band embarks with zero manufactured tools or stockpiles in inventory, but the procedural generator guarantees a dense **Annulus Resource Kit** in an annulus of radius [5, 20] cells around the campfire:
- **8 `berry_bush`** (food & seeds)
- **8 `oak`** (wood: 4 logs each with stump = 36 logs total)
- **10 `rocks_small`** (loose building stone)
- **4 `granite_boulder`** (quarry stone)
- **60 `grass_tuft`** (fiber & straw)
- **4 `reeds`** (fiber near water)
- **1 `fruit_tree`** (food & wood)
- **1–2 ore outcrops** (`ironstone` or `copper_outcrop`, yielding metal ore and loose stones)
- **Starting Water Guarantee:** Drinkable water (`fresh`, `pond`, `icy`, `marsh`, `swamp`) within reach 30 cells of the camp center. A dedicated starter pond is generated at distance [8, 22] with radius [2, 5].
- **Wildlife Guarantees:** 1 grazer herd (`deer` or `boar`, count 2–3) and 1 vermin herd (`hare` or `fowl`, count 2–4) spawned 24–40 cells away; a 20-cell predator-free radius around every campfire.

### 1.4 Starting Faction Setup & World Relations
- **Faction Count:** Exactly 9 factions generated per New Game (`count: [9, 9]`).
- **Layer Allocation:** 3 factions per vertical layer:
  - $Z = 0$ (Surface): Human, Elf, Halfling, Goblin, Orc.
  - $Z = -1$ (Upper Earth): Dwarf, Gnome, Serpentkin, Undead, Goblin.
  - $Z = -2$ (Deep Earth): Demon, Automaton, Swarmer, Dark Dwarf, Dark Gnome.
- **Player Faction:** One of the playable surface factions (Human, Elf, Halfling, Dwarf, Gnome) assigned to the player.
- **Diplomatic Relations:** Symmetric relations matrix $[-100, +100]$. Species affinities (e.g. human-elf +10, dwarf-goblin -40) combined with ethos modifiers (Traders, Warlike, Pious, etc.).
- **Inter-Faction Spacing:** Non-player factions placed on habitable terrain with `minGap: 40` cells separation and `edgeMargin: 12` cells from map edge.

---

## 2. Distinguishing the Starting Scenario from World Generation

To prevent corrupting the baseline, the engine strictly separates:
1. **The Starting Scenario Contract:** The immutable rule that a playable game begins at $(128, 128)$ on $Z=0$ with 8 living founders, a lit campfire, and sufficient immediate raw materials to build a shelter, larder, woodpile, and basic tools.
2. **Procedural World Generation:** The independent, global algorithms that compute elevation noise, continental landmasses, rivers, lakes, subterranean caverns, rock strata, and biomes across all 65,536 cells and 5 elevation layers.

### Couplings in Code:
- **Coupling 1 (`climate.startClimate`):** In `DEUS_WorldGen.js:321-335`, the natural elevation, temperature, rainfall, and drainage fields are overridden within a radial blend [28, 110] around the center so the player's start never rolls as deep ocean, barren mountain peak, or cursed wasteland.
- **Coupling 2 (`WorldGen.placeKit`):** In `DEUS_WorldGen.js:881-932`, after natural biome vegetation is placed, the generator scans the annulus around each faction campfire and forces missing kit objects to spawn if natural biome density was insufficient.
- **Coupling 3 (`Factions.placeAreas`):** In `DEUS_Factions.js:335-550`, the player faction's area center is explicitly anchored to $(128, 128) \pm 6$, while all other factions are distributed via spatial repulsion.
