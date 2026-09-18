# ART STANDARD: the 2.5D look and how assets get made

This applies to every image in the game, placeholders included. An image that breaks a rule here doesn't go into `game/img/`, however good it looks.

Tags: **[LOCKED]** approved by the user · **[PROPOSED]** waiting on the user · **[MEASURE]** must be checked against the real Ultima VII before anyone relies on it. When a fact is measured, replace the tag with `[MEASURED 2026-xx-xx: how]`.

## 1. What Ultima VII's view actually is
The target is U7's specific projection. Vague words like "top-down 3/4" and "isometric" produced the wrong sprites before; use these facts instead.

| # | Fact | Tag |
|---|---|---|
| F1 | The ground is a **square top-down grid**, not an isometric diamond. U7's native tile is 8×8 px. | [MEASURE] |
| F2 | Height is counted in **lifts**. Each lift moves an image **4 px up and 4 px left**, so every vertical edge is drawn as a **45° line leaning up-left**. The top of a box sits up-left of its base, and you see its top, south face, and east face. | [MEASURE] (believed to be how Exult, the open-source U7 engine, draws it) |
| F3 | Every object has a 3D size: a footprint in tiles (x, y) and a height in lifts (z). Its image is anchored at the **bottom-right corner of its footprint** and extends up and left. | [MEASURE] |
| F4 | **People lean too.** A standing figure's head is up-left of its feet, along the same 45° line. The leaning figures in `game/img/characters/$U7_Avatar.png` show this. Upright JRPG-style sprites are wrong. | [MEASURE] |
| F5 | Draw order comes from 3D position: anything further south or east draws in front. | [MEASURE] |
| F6 | U7 characters have 4 facings (N, E, S, W); diagonal movement reuses one of them. | [MEASURE] |
| F7 | The native screen was 320×200 in 256 colors. | [MEASURE] |

**How to measure:** run the real game (GOG's DOSBox build, or Exult with the GOG data), take screenshots, and count pixels. Save the screenshots and notes in `reference/u7/`. Our own extraction scripts don't count as a source until their output matches a real screenshot; they produced wrong shapes before (wall slabs and a red creature instead of people and a tree).

## 2. Our grid and pixel scale [PROPOSED: Q6]
| Setting | Value | Why |
|---|---|---|
| Art resolution | Everything is drawn at **1× "native" pixels** and shown at exactly **3×**, nearest-neighbor. No other scale, anywhere. | Crisp pixels that are the same size everywhere |
| Grid cell | **16×16 native px = 48×48 screen px** | 48 is RMMZ's default tile size, so no engine change |
| Lift | **4 native px = 12 screen px**, applied **up and left** | F2 |
| Screen | **960×600** (320×200 native at 3×, U7's viewport). It's currently 816×624. | Set in Database → System 2; not an engine edit |
| Adult human height | ___ lifts (fill in from measurement) | F4 |
| Lifts per story (a DF z-level) | ___ (fill in from measurement) | F2 |

## 3. Ground vs. objects [PROPOSED]
- **Ground** is anything flat you walk on: grass, dirt, sand, water, floors. It's drawn as RMMZ tileset tiles on the map.
- **Objects** are anything with height: trees, walls, rocks, furniture, items, creatures. They're sprites drawn by the UF renderer and sorted by 3D position (F5). Never put something tall in a B–E tileset, because tiles can't sort correctly in front of or behind a moving character.
- Each object type is defined once in data with `footprint: [w, d]` (cells), `height` (lifts), and `anchor`. Graybox images, collision, depth sorting, and art briefs all read these same numbers. Nobody types sizes into a prompt by hand.

**Bounding-box rule** (any script can check it): an object with a w×d cell footprint and h lifts of height fits in a box **(16w + 4h) × (16d + 4h)** native px, with its footprint in the box's bottom-right corner.

## 4. Sprite sheets [PROPOSED: Q5]
- Every sheet has a JSON sidecar with the same name (`UF_Human.png` + `UF_Human.json`). The sidecar holds frame width and height, the anchor pixel, the facings, frames per facing, and frame order. The engine reads the sidecar and never guesses.
- Facings: 4 (like U7, half the art) or 8. The recommendation is 4, used for 8-way movement.
- Walk frames per facing: ___ (measure what U7 used, then decide).
- World objects use this UF sheet format even when they're drawn through RMMZ's character sprites. RMMZ's standard 3×4 `$`/`!` layout is not the format for world objects.

## 5. Color and style [PROPOSED until the style lock]
- One project palette, at most 256 colors: `art/palette/uf.hex`. Every shipped pixel uses a palette color, and a script checks this.
- Pixels are fully opaque or fully transparent. Shadows are drawn by the engine, not baked into images.
- No anti-aliasing, blur, gradients, glow, or mixed pixel sizes.
- Light direction: ___ (set at the style lock, then the same for every asset).
- Outline rule: ___ (set at the style lock).

## 6. Graybox placeholders (engine phase)
Until the art phase, every object is a **graybox**: a box generated by a script in the exact projection from its footprint and height. The top face is light, the south face medium, and the east face dark. Creatures are narrow boxes with a mark on the side they're facing.
- Colors by category: creature blue, plant green, stone/wall gray, item yellow, furniture brown.
- Grayboxes come only from the graybox tool. Nobody hand-draws or AI-generates placeholders.
- Why: with grayboxes you can judge perspective, depth sorting, and scale before any art exists. Real art later replaces boxes whose size is already known.

## 7. Making real art (only after the engine slices are approved)
Each step has its own folder. No step is skipped.

| Step | Output | Who |
|---|---|---|
| 1. Brief | `art/briefs/<id>.md`: id, category, footprint, height, facings, frame count, description in approved terminology only | Agent drafts it from the object's data; user approves the list |
| 2. Style lock (once) | Four anchor assets: one human, one tree, one wall piece, one ground tile. After approval they're the reference images for every later prompt | Art agent, then user |
| 3. Generate | `art/raw/<id>/`: untouched Gemini output. **One view per request, never a whole sheet.** Always attach the object's graybox render (geometry) and the style anchors (look). Flat magenta `#FF00FF` background, never green, because foliage is green. | Art agent |
| 4. Clean | `art/masters/<id>.png`: detect the fake pixel size, downsample to native 1×, snap to the palette, remove the background, place on the anchor from the sidecar | A tool, not by hand |
| 5. Check | The automated checks in §8 pass | Tool |
| 6. Review | `art/review/index.html`: every asset at 1× and 3×, over its graybox outline, next to the human reference, on grass | User |
| 7. Approve | `art/APPROVALS.md`: approved, or rejected with a reason | **User only** |
| 8. Export | Upscale 3× and write to `game/img/`, for approved ids only | Tool |

## 8. Asset checklist
Automated (the tool fails the asset if any of these fail):
- [ ] Only palette colors
- [ ] Alpha is only 0 or 255
- [ ] Clean grid: scaling the master 3× reproduces the export exactly
- [ ] The bounding box matches §3 for the asset's footprint and height, within ±1 native px
- [ ] The sidecar exists, and its frame counts match the brief

By eye (agent first, then the user):
- [ ] Verticals lean up-left at 45°, the same as the graybox
- [ ] Correct size next to the human reference
- [ ] Light comes from the locked direction
- [ ] Same character or object in every frame and facing
- [ ] No text, watermark, border, or stray pixels

## 9. How image models fail here, and the rule for each
| Failure | Rule |
|---|---|
| Can't hit exact pixel sizes or sheet grids | Never trust the model's grid. The clean step (§7 step 4) rebuilds it. |
| "Pixel art" with mixed pixel sizes and blur | Downsample and snap. If it falls apart at 1×, reject it. |
| Drifts to upright JRPG sprites or isometric diamonds | Attach the graybox render. Reject anything that doesn't lean the way it does. |
| The character changes between frames or facings | Generate and approve one base facing first, then use it as the reference for the others. Reject any mismatch. |
| Green fringes from green-screen | Magenta background only |
