> **SUPERSEDED (2026-09-18). Don't use this file.** It conflicts with `docs/ART_STANDARD.md`: it uses upright 48×48 4-facing sheets, green chroma, and whole-sheet prompts, and it's built on unapproved characters and lore. Kept only for reference until the user decides what to do with it.

# Standardized Anti-Slop Asset Prompt Catalog: Kaldurath (Ultima VII Science-Fantasy Format)

This catalog defines the strict mathematical specifications and prompt templates for generating unique, authentic assets for **Kaldurath** using **Gemini Image Pro** and automated post-processing via **Claude Code** (`tools/process_assets.ps1`).

---

## 1. Visual Specification & Mathematical Standards

All assets generated for this project must strictly comply with the **Ultima VII retro visual architecture**:

| Asset Type | Canvas Dimensions | Cell / Grid Size | Projection / View | Framing / Background |
| :--- | :--- | :--- | :--- | :--- |
| **Character Bust Portrait** | 144 × 144 px | Single bust frame | 3/4 front bust portrait | Carved antique stone/wood/tech arch frame; flat `#00FF00` chroma key behind bust |
| **Walk Cycle Spritesheet** | 144 × 192 px | 48 × 48 px (3 cols × 4 rows) | Top-down 3/4 perspective | Rows: Down (row 0), Left (row 1), Right (row 2), Up (row 3); `#00FF00` chroma key |
| **Container Gump** | 360 × 240 px | Internal grid (40×40 slots) | Isometric-top tactile view | Antique wood, hammered iron, or precursor console gump with interior cavity |
| **Paperdoll Screen** | 480 × 480 px | Centered anatomy doll | Standing heroic pose | Slate/parchment background with 9 equipment & bionic slot brackets |
| **Environment Tileset** | 768 × 768 px | 48 × 48 px (16 × 16 tiles) | Top-down 3/4 perspective | Orthogonal tile alignment; clean edge tiling; `#00FF00` transparent mask |

### Mandatory Color & Shading Directives:
1. **Palette Snapping**: Every color must map to the authentic **Ultima VII 256-color VGA palette** (`PALETTES.FLX`).
2. **Cluster Shading**: Hand-drawn retro pixel clusters; strict 3 to 5 shading steps per material (e.g. shadow, base, midtone, highlight, specular).
3. **Outlines**: 1-pixel dark contours using `#1e1914` or deep tonal shadow (no pure black `#000000` harsh outlines, no floaters).
4. **Chroma-Key Transparency**: Solid, unshaded green background (`#00FF00`) for instantaneous zero-loss extraction via `FastQuantizer`.
5. **Science-Fantasy Motifs**: Vacuum tubes, exposed copper wiring, green phosphor CRT screens, brass pneumatic pistons, Star-Iron glowing edges.

### The Anti-Slop Clause (Universal Negative Prompt):
> **STRICT NEGATIVES**:
> `smooth gradients, blurred edges, antialiased glow, 3D CGI rendering, modern digital painting, photorealism, soft airbrushing, noisy background texture, extra fingers, anatomical distortion, isometric misalignment, inconsistent lighting, modern anime shading, generic AI slop`.

---

## 2. Parameterized Character Portrait Templates (144 × 144 px)

### Master Portrait Formula:
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of [SUBJECT_DESCRIPTION]. 
Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique [FRAME_MATERIAL] arched border. 
Crisp pixel clusters, sharp edge contours with dark outline #1e1914, 5-level manual dithering, zero blur, zero 3D rendering. 
Background behind the character is solid unshaded chroma green #00FF00. 
[LIGHTING_AND_FACIAL_DETAILS]. 
Inspired by classic Ultima VII / Serpent Isle dialogue gumps.
```

---

### 2.1. Karadrim (Mountain-Kin)

#### A. Master Metalsmith Kragan Anvilhammer:
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a veteran Karadrim master blacksmith. A stout, rugged mountain-dweller with a magnificent long steel-grey braided beard bound with bronze rings. He wears heavy fire-singed smithing leathers over riveted iron mail, with a glowing Star-Iron pectoral plate and soot smudged across his furrowed brow. His gaze is piercing, resolute, and weathered by centuries beside the roaring plasma crucibles. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique carved grey granite arched border with subtle runic engravings. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, warm hearth lighting from the lower-right casting amber reflections on iron armor, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

#### B. Tavern Master Thorgar Aleheart:
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a jovial Karadrim brewer and tavern master. A broad, ruddy-cheeked mountain-dweller with a thick russet beard tucked into his stained linen apron. A small bronze hop-flower brooch fastens his wool tunic. He wears a warm, welcoming grin, with laugh lines crinkling around his lively hazel eyes. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique carved dark oak timber arched border. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, warm tavern candlelight from the side, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

#### C. Vanguard Captain Kogan Ironshield:
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a stern Karadrim garrison captain. A battle-hardened mountain warrior wearing a crested iron bascinet with a nose-guard, revealing only a braided black beard and scarred, watchful eyes. Heavy polished steel gorget and iron pauldrons strapped over thick padded gambeson, with a galvanic power conduit resting against his gorget. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique fortified iron-banded stone arched border. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, cold rampart lighting from above, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

---

### 2.2. Valen (Sovereign Humans)

#### A. Cedric Brightward (Merchant-Diplomat):
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a prosperous Valen merchant and caravan master. A sharp-featured human in his late thirties with neatly trimmed dark brown hair, a short mustache, and shrewd, calculating amber eyes. He wears an emerald-green wool doublet with gold-embroidered cuffs over a fine cream linen shirt, and a heavy brass guild medallion set with a glowing cyan quantum chip rests upon his chest. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique carved walnut and polished brass arched border. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, natural daylight from the upper-left, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

#### B. The Solitary Delver (Player Protagonist):
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a solitary survivor and delver of the deeps. A determined wanderer of medium build with windswept hair, an alert, perceptive expression, and traveling attire of reinforced leather, weathered wool mantle, and a salvaged galvanic optic sensor visor resting on their brow. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique carved stone arch with celestial constellation and circuit engravings. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, balanced ambient lighting, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

---

### 2.3. Sylvathi (Canopy-Kin)

#### A. Caerith Sylvanna (Canopy Ranger & Emissary):
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a graceful Sylvathi canopy ranger and woodland emissary. A slender, elegant elf with high cheekbones, pointed elongated ears, long silvery-ash hair bound in intricate forest braids, and piercing emerald-green almond eyes. She wears supple green leaf-leather armor trimmed with living-wood brooches and faint bio-luminescent fiber-optics, with a delicate silver circlet upon her brow. Her expression is solemn, poised, and deeply observant. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique entwined living-wood and ivy arched border. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, cool dappled forest canopy lighting from above, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

---

### 2.4. Vorgari (Zenith-Kin)

#### A. Vor-Tek Zenith (Winged Scholar of the Dual Axioms):
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a noble Vorgari scholar of the Winged caste. A stately, horned humanoid with deep charcoal-crimson basalt stonehide, sweeping curved obsidian horns arching backward from his brow, and luminous golden eyes that emanate philosophical wisdom. Large folded leathery wings frame his shoulders behind a ceremonial crimson-and-black wool stole with geometric basalt glyphs and quantum traces. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique carved volcanic basalt arched border glowing with faint magma cracks. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, dramatic volcanic glow from below, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

#### B. Borin Forgehand (Wingless Artisan):
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a muscular Vorgari artisan of the Wingless caste. A powerful, heavy-jawed basalt-skinned craftsman with stout, textured horns, broad neck musculature, and smoldering ember-red eyes. He wears a heavy reinforced leather apron with bronze rivets over his stonehide torso, carrying a pair of long crucible tongs and a pneumatic hammer strap. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique carved dark basalt arched border. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, fiery furnace under-lighting, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

---

### 2.5. Kitterkin (Warren-Slinkers)

#### A. Tik-Chit Quickfinger (Scrap-Tinker & Lockturner):
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a cunning Kitterkin warren-slinker. A diminutive, expressive creature with soft sandy-brown fur, large mobile pointed ears, bright inquisitive yellow eyes with slit pupils, and twitching whiskers. He wears a patchwork leather hood with tiny scavenged brass gears and vacuum tubes pinned to the rim, and a coil of copper lockpick wire peeking from his bandolier. His expression is nervous, inquisitive, and mischievous. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique notched timber and copper wire arched border. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, soft lantern glow from the side, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

---

### 2.6. Morvath (Trench-Kin)

#### A. Gorgar Bonecarver (Trench Raider):
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a fierce Morvath trench-raider. A sinewy, sallow-skinned subterranean warrior with jagged teeth, pointed jagged ears, scarred cheeks, and glowing subterranean crimson eyes. He wears a spiked dark iron collar, rough fur mantle, and a crude salvaged plasma-cutter visor strapped over one scarred eye. A wicked sneer exposes his sharp fangs. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique jagged dark iron and spiked bone arched border. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, ominous pale torchlight from below, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

---

### 2.7. Precursor Automata (Derelict Wardens)

#### A. Unit-77 Sentinel:
```text
Authentic 1990s MS-DOS 256-color pixel art character bust portrait of a derelict Precursor Automaton sentinel. A weathered, heavy star-iron robotic chassis with exposed hydraulic valves, scratched titanium plating, and a glowing cyan circular optic eye sensor behind an armored quartz slit. Runic circuit traces pulse faintly with blue aetheric power along its neck housing. Centered 144x144 pixel bust portrait viewed in 3/4 angle, framed inside an antique industrial precursor bulkhead border with recessed rivets and glowing conduit lines. Crisp pixel clusters, sharp edge contours with dark outline #1e1914, cold blue optic glare from within, zero blur, zero 3D rendering. Background behind the character is solid unshaded chroma green #00FF00. Inspired by classic Ultima VII dialogue portraits.
```

---

## 3. Parameterized Character Spritesheet Templates (3 × 4 Grid, 48 × 48 px Cells)

### Master Spritesheet Formula:
```text
Authentic 1990s MS-DOS 256-color pixel art complete character walk cycle spritesheet of [CHARACTER_DESCRIPTION]. 
Grid format: exactly 144 pixels wide by 192 pixels high, composed of 3 animation walk columns and 4 directional rows (Row 0: Facing Down/South, Row 1: Facing Left/West, Row 2: Facing Right/East, Row 3: Facing Up/North). 
Each sprite cell is precisely 48x48 pixels. 
Viewed in top-down 3/4 perspective matching Ultima VII: The Black Gate. 
Hand-placed pixel clusters, clean dark outline #1e1914, zero blur, zero antialiasing, zero smooth 3D shading. 
Every walk frame has clear leg/arm stride separation. 
Entire sheet has a flat, unshaded solid background color of pure chroma green #00FF00.
```

#### Example: Karadrim Miner Walk Sheet:
```text
Authentic 1990s MS-DOS 256-color pixel art complete character walk cycle spritesheet of a Karadrim Miner in soot-stained overalls with a braided steel-grey beard, iron bascinet, and a heavy pickaxe strapped to their back. Grid format: exactly 144 pixels wide by 192 pixels high, composed of 3 animation walk columns and 4 directional rows (Row 0: Facing Down, Row 1: Facing Left, Row 2: Facing Right, Row 3: Facing Up). Each sprite cell is precisely 48x48 pixels. Viewed in top-down 3/4 perspective matching Ultima VII. Hand-placed pixel clusters, dark outline #1e1914, zero blur, zero antialiasing. Entire sheet has a flat, unshaded solid background color of pure chroma green #00FF00.
```

---

## 4. Parameterized Science-Fantasy Tileset Templates (48 × 48 px Tiles)

### A. Kraghold Mountainhall & Precursor Delve:
```text
Authentic 1990s MS-DOS 256-color pixel art isometric-top 3/4 tileset sheet for subterranean mountainhall and ancient precursor delve architecture. 
Canvas size 768x768 pixels, divided into a strict 16x16 grid of 48x48 pixel tiles. 
Contains: chiseled black granite floor flagstones, rough cavern walls, starship hull bulkhead plating with recessed rivets, glowing cyan conduit floor tiles, runic stone pillars, plasma smelter with blue flames, blacksmith anvil, beer brewing keg with copper tap, pre-collapse stasis pod with frosted glass, CRT terminal console encased in iron, communal wooden tables, bunk beds, and iron-banded storage footlockers. 
Hand-drawn pixel clusters, sharp edge contours, 256-color VGA palette, dark outlines #1e1914. 
Background of unused grid cells is solid unshaded chroma green #00FF00. 
Matching Ultima VII: The Black Gate environment aesthetic.
```

---

## 5. Automated Asset Post-Processing Pipeline (`tools/process_assets.ps1`)

When Gemini Image Pro generates a raw PNG:
1. **Drop File**: Place raw PNG into `artifacts/` or `tools/input_assets/`.
2. **Execute C# Quantizer (7ms Execution)**:
   ```powershell
   # Process single portrait (144x144)
   .\tools\process_assets.ps1 -InputFile "artifacts/raw_kragan.png" -OutputFile "game/img/faces/Kragan.png" -Mode "portrait"
   
   # Process 3x4 character walk sheet (144x192)
   .\tools\process_assets.ps1 -InputFile "artifacts/raw_kragan_walk.png" -OutputFile "game/img/characters/$Kragan.png" -Mode "character"
   ```
3. **Automated Verification**:
   - Compares pixel colors against `PALETTES.FLX` (Euclidean distance tolerance < 10).
   - Keys out `#00FF00` to 100% alpha transparency.
   - Verifies 48×48 cell grid alignment.
   - Outputs verified RMMZ asset directly to `game/img/`.
