# PROJECT DEUS — ART DIRECTION & PRODUCTION SPECIFICATION (MASTER SPEC)
**Document Version:** 1.0.0 (Established 2026-09-21 by User Directive)  
**Applies To:** All visual generation tasks, tools, sprite cleaners, and engine integration pipelines across Project DEUS.  
**Mandatory Model:** Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`). No other model is permitted.

---

## 1. Scope & Standing Production Directive

### 1.1 Continuous Autonomous Production for Non-Living Assets
Nano Banana Pro is an active component of the production pipeline, not merely a concept-art tool.
- Whenever implementation requires **non-living artwork** (walls, doors, terrain, flora, crops, water features, items, resources, furniture, workshops, machinery, environmental effects), agents must **continuously identify those needs, batch them aggressively, generate packed game-ready sheets via Nano Banana Pro, process approved results, integrate them into the project, and verify them in context**.
- **Agents must not wait for manual individual asset requests for non-living assets.**

### 1.2 Absolute Exclusion: Living Things
- **This automated pipeline DOES NOT apply to living things.**
- Agents must **NEVER** autonomously generate:
  - Humans, colonists, humanoids
  - Animals, wildlife, monsters, creatures
  - Living character portraits, living character sprites, or living animation sheets
- When implementation requires a missing living asset: **REGISTER THE REQUIREMENT in `docs/ASSET_REQUESTS.md` / `docs/STATUS.md`**, but do not autonomously generate it under this pipeline.

---

## 2. Core Camera, Projection & Scale

| Parameter | Specification | Strict Constraint |
|---|---|---|
| **View / Projection** | Flat 3/4 top-down RPG view (FF5 / Tactics Ogre serious chibi style). Ground plane viewed from above; vertical structures, walls, trees, and props stand upright in 2D space. | No tilt, slant, lean, 3D perspective distortion, or isometric diamonds. |
| **Grid Cell Footprint** | Standard grid unit = **48 × 48 px**. | Sub-tile items: 12–28 px. Standard props: 48×48 px. Large props/trees: 96×96 or 96×144 px. |
| **Architectural Footprint** | 1 grid wide (48 px) × **2 grids high (96 px)** for walls, doors, gates, cliff crags, and high boundaries. | The lower 48 px is the visible vertical face. The upper 48 px is the top cap. |
| **Scale Anchoring** | Bottom-center of the base tile (`anchor.x = 0.5, anchor.y = 1.0`). | Base silhouette must remain stable across all animation frames. |

---

## 3. Dwarf-Fortress-Style Black Wall-Top Convention

Project DEUS enforces an essential architectural readability convention inspired by the Steam edition of Dwarf Fortress.

```text
+-------------------------------------------------------+
|  [UPPER 48 px]  BLACK TOP / OCCLUSION CAP             |  <- Flat near-black (#08080c - #101014)
|                 (Minimal edge highlight for boundary) |
+-------------------------------------------------------+
|  [LOWER 48 px]  MATERIAL FACE                         |  <- Rich material texture
|                 (Limestone, Oak, Sandstone, Granite)  |     (Grain, mortar, planks, hardware)
+-------------------------------------------------------+
```

### 3.1 Architectural Principles
1. **Two-Grid-High Vertical Footprint (48 × 96 px):**
   - The **LOWER PORTION (48 px)** displays the authentic material face (wood grain, stone masonry, chisel marks, iron bands, door planks).
   - The **UPPER / TOP CAP (48 px)** must read as **BLACK / PROJECT NEAR-BLACK** (`#08080C` to `#121218`).
2. **Visual Function:**
   - The black cap connects seamlessly with the dark void, subterranean rock mass, and fog-of-war occlusion language of Project DEUS.
   - It provides instantaneous visual separation between interior floor space, the structural boundary, and the floor level above.
3. **Strict Prohibitions for Upper Caps:**
   - **NO** textured material repeated onto the upper top cap.
   - **NO** brightly lit roof tiles, shingles, or grass on the top cap of internal/standard walls.
   - **NO** isometric top planes, sloped parapets, or decorative crenellations unless specifically authored as battlements.
   - **NO** hue or color drift between different materials' black caps.
4. **Mandatory Alignment & Continuity:**
   - A sequence of `[STONE WALL] [STONE WALL] [STONE DOOR] [STONE WALL]` must produce a **visually unbroken, continuous horizontal black top line** across all cells.
   - Doors and gates must match the exact cap height, edge treatment, and perspective of neighboring walls.
5. **Not a Baked Shadow:**
   - The black top cap is an architectural / occlusion convention, **NOT a dynamic shadow**. It does not shift with time-of-day, torches, room lighting, weather, or biome.

---

## 4. Visual Rendering, Shading & Palette Language

1. **Palette Standard:** 
   - Strict adherence to the DEUS 16-bit master palette (`art/palette/uf.hex`). All raw generations pass through automated palette snapping.
   - Cel shading with 3–4 distinct flat tonal bands per material.
   - Light source is standardized from the **upper-left** (135° angle).
2. **Edge & Outline Treatment:**
   - Selective dark contour outlines (deep charcoal/umber `#1A1820`), never harsh 100% pure black lines around bright interior details.
   - Pixel-crisp boundaries. **Zero blur, zero gradients, zero AI anti-aliasing fuzz against background.**
3. **Artistic Guardrails (Instant Rejection Criteria):**
   - **Reject:** Photorealism, 3D computer-generated renders, painterly concept-art smudges, glossy mobile game vector look, bubble chibi/cartoon tropes, noisy excessive micro-texture, and inconsistent camera pitch.
   - Every asset must look as if it was drawn by the same 16-bit tactical RPG art team.

---

## 5. Material Differentiation & Fidelity

Materials must be immediately distinguishable by tactile physical structure, not merely color shifts:

- **Woods:**
  - *Pine:* Straight pale yellow-amber grain, prominent dark sap knots, light structural cuts.
  - *Oak:* Deep golden-brown, dense interlocked grain, heavy fibrous timber end-checks.
  - *Ash:* Pale gray-blonde, smooth straight grain, fine resilient splines.
  - *Yew:* Dense dark orange-red heartwood with pale sapwood streaks, elastic fine-grained density.
- **Stones:**
  - *Limestone:* Soft chalky cream/buff, horizontal sedimentary bedding planes, smooth rectangular block masonry.
  - *Sandstone:* Warm desert ochre/terracotta, coarse gritty granular texture, friable layered fractures.
  - *Granite:* Speckled salt-and-pepper crystalline matrix (quartz/feldspar), heavy massive blocky fracture, sharp rough hewn faces.
  - *Diorite:* Dark charcoal with contrasting pale inclusions, dense igneous toughness.
  - *Basalt:* Dark columnar charcoal-black, volcanic vertical jointing fractures.
  - *Marble:* High-polish ivory/white with delicate gray veins, refined architectural prestige cut.
- **Metals:**
  - *Bronze:* Warm burnished reddish-gold with slight greenish patina in recesses.
  - *Iron:* Matte charcoal-gray with pitted forge scale and oxidized rust rivets.
  - *Steel:* Cool blue-gray metallic sheen with sharp ground edge bevels.

---

## 6. Rigid Grid Packing & Atlas Architecture

### 6.1 Sheet Packing Rules
1. **Aggressive Batching:** Every Nano Banana Pro call must maximize useful occupied sheet area (**target 80–100% useful area**).
2. **Fixed Rigid Grids:** Prompt must declare exact dimensions:
   - `SHEET WIDTH`, `SHEET HEIGHT`
   - `CELL WIDTH`, `CELL HEIGHT`
   - `COLUMNS`, `ROWS`
   - `TOTAL SLOTS`
   - `EXACT SLOT-BY-SLOT ASSIGNMENT`
3. **Compatible Groupings Only:** Only pack assets that share identical footprint, perspective, scale, lighting, and category.
4. **No In-Sheet Text or UI:** Absolutely no text, labels, numbers, captions, grid lines, concept-art borders, parchment cards, or ornamental framing inside the image.
5. **Clean Removable Background:** Flat pure chroma key background (e.g. `#00FF00` magenta `#FF00FF`, or transparent if supported) allowing automated lossless sprite extraction.

### 6.2 Wall / Door Modular Family Standard (16-Slot Standard Sheet)
When introducing a wall material family, generate the complete modular set together:
- `Slot (0,0)`: Straight horizontal wall
- `Slot (1,0)`: Straight vertical wall
- `Slot (2,0)`: North end-cap / termination
- `Slot (3,0)`: South end-cap / termination
- `Slot (0,1)`: Inner corner (SW)
- `Slot (1,1)`: Inner corner (SE)
- `Slot (2,1)`: Outer corner (NW)
- `Slot (3,1)`: Outer corner (NE)
- `Slot (0,2)`: 3-way T-intersection
- `Slot (1,2)`: 4-way cross-intersection
- `Slot (2,2)`: Rough/damaged wall variant
- `Slot (3,2)`: Rubble / collapsed debris
- `Slot (0,3)`: Doorway / open frame
- `Slot (1,3)`: Closed door
- `Slot (2,3)`: Open door (inward swing)
- `Slot (3,3)`: Fortified heavy gate

---

## 7. Real-Frame Sprite Animation Standard

### 7.1 Absolute Prohibition on After-Effects
- **No code-driven after-effects:** No affine scaling/squashing, no programmatic sine-wave swaying, no runtime rotation hacks, no shader ripples.
- **No video formats:** No MP4, WebM, or runtime GIF playback.
- **ALL ANIMATION MUST BE DELIVERED AS DISTINCT AUTHORED SPRITE FRAMES.**

### 7.2 Animated Sheet Layout Convention
- **X-AXIS (Columns):** Sequential time / frame progression (e.g. Frame 1 $\rightarrow$ Frame 8).
- **Y-AXIS (Rows):** Variant or distinct object (e.g. Row 1: Campfire, Row 2: Torch, Row 3: Hearth, Row 4: Forge).
- **Frame Consistency Mandate:**
  - The object's chassis/base must remain **pixel-stable** across all frames.
  - ONLY the active element (flame, sparks, flowing water, smoke, turning wheel) moves.
  - Camera, lighting, perspective, and scale are locked 100%.

### 7.3 Active and Inactive Dual States
Every functional workshop or energy source must provide both:
1. **Idle / Unlit / Cold static frame**
2. **Active / Lit / Burning multi-frame animation sequence**

---

## 8. Nano Banana Pro Production Prompt Template

All generation prompts for non-living assets must follow this rigid technical structure:

```text
[OUTPUT TYPE]
Game-ready packed transparent sprite sheet.

[DEUS ART DIRECTION]
Flat 3/4 top-down 16-bit pixel art in the Project DEUS serious chibi style (tactics RPG standard). 
Cel shaded with 3-4 distinct tones per material. Light from upper-left (135 degrees). 
Crisp pixel edges, selective deep charcoal contour outlines, no gradients, no blur, no anti-aliasing against background. Palette adheres to classic 16-bit fantasy tactics games.

[GRID SPECIFICATION]
Sheet Size: [W]x[H] px.
Cell Size: [cellW]x[cellH] px.
Layout: [Cols] columns x [Rows] rows ([Total] total slots).

[ARCHITECTURAL CONVENTION - IF APPLICABLE]
TWO-GRID VERTICAL FOOTPRINT: Each cell is 48px wide by 96px high.
The LOWER 48px contains the visible front material face.
The UPPER 48px is a flat near-black occlusion cap (#08080C) with minimal edge highlight, matching Dwarf Fortress Steam wall readability. 
The black cap height and treatment must align perfectly horizontally across all neighboring wall, doorway, and door cells. No textured masonry or roofs on the top cap.

[ANIMATION SPECIFICATION - IF APPLICABLE]
Sequential frame animation along the X-axis (Columns 1-[Cols]). 
The base chassis/structure is 100% pixel-stable and identical across all frames. 
Only the [active element: flames, sparks, water] moves between frames.

[SLOT ASSIGNMENT MAP]
Row 1, Col 1: [Exact asset & state description]
Row 1, Col 2: [Exact asset & state description]
...

[STRICT PROHIBITIONS]
NO living beings, humans, colonists, humanoids, animals, or monsters.
NO text, labels, numbers, captions, legends, or filenames inside the image.
NO decorative frames, concept art cards, parchment, paper borders, or UI backgrounds.
NO isometric angles, camera tilting, perspective skew, or photorealism.
NO empty or wasted slots.

[OUTPUT GOAL]
Produce exclusively the machine-consumable game asset sheet on a solid transparent/chroma background.
```

---

## 9. Quality Verification, Manifest Tracking & Slicing Pipeline

1. **Slot-by-Slot Inspection:** Open every raw generation. Inspect every cell. Never discard a 16-slot sheet for 1 bad cell if safe slice-level repair is possible.
2. **Palette Snapping:** Process sheet through `tools/clean_palette.js` to enforce `art/palette/uf.hex`.
3. **Automated Slicing:** Run slice tools to generate runtime tileset sheets and charset files (`game/img/`).
4. **Manifest Logging:** Every integrated asset is immediately registered in `docs/ASSET_MANIFEST.md` with full metadata.
5. **In-Engine F5 Verification:** Verify in playtest and automated visual test suite.

