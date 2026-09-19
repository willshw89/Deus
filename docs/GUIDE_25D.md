# GUIDE: how to make UF look like Ultima VII

> **OBSOLETE (2026-09-19, early afternoon).** The user dropped the 2.5D look ("I cant get the generator to do 2.5 to my standard") for HD pixel art in the style of Final Fantasy VI (VISION V2). Nothing in this guide applies to new art: no lean, no lifts, no transposed facings. The binding rules are in `docs/ART_STANDARD.md`. Kept as history.

Written for Gemini (and any agent) doing the 2.5D work. `ART_STANDARD.md` holds the rules; this is the how-to. Items tagged [MEASURE] are believed true but must be confirmed before building on them (ART_STANDARD §1).

## 1. The one idea
Ultima VII is **not** isometric and **not** a normal JRPG view. It's a **flat square grid seen from straight above**, with height faked by **sliding things up and to the left**:

- The ground is an ordinary top-down square grid, exactly like RMMZ's.
- Every unit of height moves the image **4 native px up and 4 native px left** [MEASURE]. So anything with height **leans up-left at 45°**.
- As a result you see the **top**, the **south face**, and the **east face** of everything. Never the north or west faces.

A box in this projection (its top sits up-left of its base):

```text
+------+
| top  |\
|      | \
+------+  +
 \ south\ |   <- the east face is between the two right-hand lines
  \      \|
   +------+   <- the base, sitting on the ground grid
```

A person follows the same rule: feet on their cell, head up and to the left of the feet.

| View | Grid | Tall things | Example |
|---|---|---|---|
| RMMZ default / JRPG | square | drawn straight up, facing the camera | RMMZ's RTP mushrooms, rocks, ferns |
| Isometric | diamond | straight up | Ultima VIII, Diablo |
| **Ultima VII (our target)** | **square** | **lean up-left at 45°** | `$U7_Avatar.png` rows 1, 2, 4 |

**Why the current glade still doesn't look like U7:** the ground clutter (mushrooms, ferns, rocks, stumps) is RMMZ RTP art drawn upright. The tree is an isometric diamond. Only Adam and Eve lean correctly, and their east-facing row leans the wrong way (AUDIT_LOG A1-2).

## 2. Using Ultima VII assets as stand-ins (allowed; user decision 2026-09-18)
You may decode U7 art and use it as **examples and stand-ins** while the engine is being built. Rules:
1. **Name every stand-in file with a `U7_` prefix** (`$U7_Man.png`, `!$U7_Tree_Oak.png`, `U7_Ground_A2.png`). The prefix is how we track them. `.gitignore` keeps them out of git, and they all get replaced with original art before release.
2. Scale is **exactly 3×, nearest-neighbor**. Never 1.3× or any other factor.
3. Keep the decoder's raw output (1× PNGs, notes) in `scratch/` or `reference/`. Only finished, 3× stand-ins go into `game/img/`.
4. List each stand-in in `docs/STATUS.md` → Stand-ins with its source (file, shape number, frames).

### Decoding facts to use (confirm each one by rendering it and looking)
- `STATIC/SHAPES.VGA` is a Flex file: entry table at byte 128, 8 bytes per entry (offset, length). Your decoder already reads this correctly for shapes ≥150.
- Shapes 0–149 are flat 8×8 **ground tiles** (not RLE) [MEASURE]. Use them for stand-in terrain: put 2×2 of them together to make one 16×16 native cell, then scale 3× to a 48×48 RMMZ tile.
- Each RLE frame header is `xright, xleft, yabove, ybelow`. The **hotspot** is at pixel `(xleft, yabove)` in the decoded frame, and it marks the **bottom-right corner of the object's footprint** [MEASURE]. Save it in the sidecar JSON; the engine anchors the sprite there.
- **People have 4 facings, built from 2 stored directions.** Frames 0–15 face one way and 16–31 the opposite way (believed north and south) [MEASURE]. The other two facings are the stored frames **transposed**, not mirrored.
  - **Transpose** = swap x and y: pixel (x, y) goes to (y, x). It keeps the up-left lean. North transposed gives west; south transposed gives east.
  - A **horizontal mirror** flips the lean to up-right. That's always wrong (A1-2).
  - In System.Drawing: `RotateFlip([RotateFlipType]::Rotate90FlipX)` is a transpose. In a canvas: `ctx.setTransform(0, 1, 1, 0, 0, 0)`. The hotspot transposes too: (hx, hy) becomes (hy, hx).
  - Within each block of 16, frames 0, 1, 2 are believed to be stand, step, step [MEASURE]. Render all 32 frames on one contact sheet with their numbers and check before mapping them.
- Palette: `STATIC/PALETTES.FLX`, record 0 is the daylight palette. Index 255 is transparent in shape data.

**Proof step before using any decoded shape:** render it next to a real in-game screenshot of the same thing (ask the user for a screenshot if you can't run the game) and confirm they match. Earlier decodes produced wall slabs and a red creature instead of people and a tree.

## 3. Building it in RMMZ
Target numbers (ART_STANDARD §2): one cell = 48 screen px = 16 native px. One lift = 12 screen px (4 native × 3), applied **both up and left**.

1. **Ground = tiles.** Anything flat (grass, dirt, water, floors) is tileset tiles. Stand-in terrain comes from U7 ground shapes (§2).
2. **Everything with height = a sprite object.** Trees, rocks, bushes, walls, furniture, and people are events or UF entities with sprites, **never** B–E tiles. Tiles can't sort in front of or behind a walking unit.
3. **Anchor at the footprint's bottom-right corner.** Set the sprite's `anchor` from the sidecar hotspot (`hotspotX / frameWidth`, `hotspotY / frameHeight`) and position it at the bottom-right corner of the object's cell:
   `screenX = (cell right edge on screen) − 12 × lift`, `screenY = (cell bottom edge on screen) − 12 × lift`.
   The current `UF_Perspective25D.js` only moves things **up** by 36 px per level. It has to move them up **and left** by 12 px per lift.
4. **Draw order.** Sort objects by `x + y` of their footprint's bottom-right cell (bigger means closer to the viewer, drawn later), then by lift. RMMZ sorts map sprites by `z`, then screen `y`, so UF sprites need their own comparison. Alias `Tilemap.prototype._compareChildOrder` and apply the UF order only to sprites flagged as UF objects. Objects bigger than 1×1 will eventually need a box-overlap comparison (Exult's approach); flag that when you hit it rather than guessing.
5. **Facing for 8-way movement with 4 facings.** Until we measure what U7 does: NE→E, SE→S, SW→W, NW→N.
6. **Canopy and roof cutaway:** when a unit is behind a tall object's image, fade that object. Decide the exact rule with the user in Slice 1.

## 4. Order of work
Each step ends with a screenshot you **open and describe** (AGENTS rule 5), plus a `UF_Test` check where a script can judge it.

1. **Decoder proof:** contact sheet of the 32 frames of one human shape, plus 10 ground tiles and 5 trees/rocks, next to real U7 screenshots. Record the frame and facing mapping in ART_STANDARD §1 as [MEASURED].
2. **Projection in the engine:** fix `UF_Perspective25D.js` (anchor, up-and-left lift, draw order) as in §3.
3. **Projection Yard test map** (SLICES Slice 0, deliverable 6), using grayboxes or U7 stand-ins.
4. **Glade stand-ins:** replace the RTP clutter and the isometric tree with U7 stand-in objects, drawn as objects. Rebuild Adam and Eve with transposed east/west facings at exactly 3×.
5. Run `run_tests.bat`, fix what fails, commit as `[gemini] ...`, and write the report in the AGENTS.md format.

## 5. Before you show the user anything
- [ ] Every tall thing leans **up-left**. Nothing upright, nothing leaning right.
- [ ] Every pixel is the same size (exactly 3×).
- [ ] Walk a unit around a tree: hidden when north or west of it, in front when south or east.
- [ ] Nothing drawn from the RMMZ RTP sits on the map as a tall object.
- [ ] You opened the screenshot and described what's actually in it.
