# DEUS — Native Resolution & Pixel Density Standard (DW.01.02)

**Document ID:** `DEUS-ART-NATIVE-01`  
**Status:** Authoritative Technical Standard (Frozen V1)  
**Task:** `DW.01.02 — Freeze native-resolution / pixel-density standard`  
**Applicability:** All original Project DEUS art assets (characters, terrain, tilesets, vegetation, architecture, props, items, interface).

---

## 1. Core Production Standard

$$\mathbf{1\text{ Source Art Pixel}} = \mathbf{1\text{ Rendered Screen Pixel at official 1.00x gameplay scale.}}$$

All original DEUS world and character art must share the **exact same effective pixel density**. A one-pixel sword edge, a one-pixel grass blade, a one-pixel eye pupil, and a one-pixel stone highlight are all actual one-screen-pixel features when viewed at the official 1.00x camera.

---

## 2. Three Distinct Concepts Defined

To prevent confusion in production and tooling, Project DEUS strictly separates three geometric concepts:

```text
┌────────────────────────────────────────────────────────────────────────┐
│               THREE DISTINCT GEOMETRIC CONCEPTS IN DEUS                │
├────────────────────────────────────────────────────────────────────────┤
│ A. WORLD GRID SIZE (Map Geometry)                                      │
│    - 48 × 48 screen pixels per RMMZ world tile.                        │
│    - Governs pathfinding, collision cells, coordinates, and packing.   │
├────────────────────────────────────────────────────────────────────────┤
│ B. VISUAL OBJECT SIZE (Silhouette & Physical Volume)                   │
│    - Adult Human: ~42 px tall (~1 tile visual footprint).              │
│    - Common Oak: ~84 px target (~2 tiles tall, spans 2×2 footprint).   │
│    - Large Boulder: ~40–48 px class (1 tile).                          │
│    - Object size is NOT limited to a single 48×48 tile.                │
├────────────────────────────────────────────────────────────────────────┤
│ C. PIXEL DENSITY (Resolution Grammar)                                  │
│    - Native 1:1 display density across ALL entities.                   │
│    - No chunky 3×3 pixels; no downsampled high-res art.                │
│    - Hand-clustered native pixels with intentional 1-pixel accents.    │
└────────────────────────────────────────────────────────────────────────┘
```

1. **World Grid Size ($48 \times 48\text{ px}$)**:
   The logical tile dimension of the RPG Maker MZ map engine. It determines collision bounds and autotile slicing. It is packaging and navigational geometry, NOT an artistic clipping boundary.
2. **Visual Object Size**:
   The true visual envelope of an object. An $84\text{ px}$ tree is authored as a single, coherent $84\text{ px}$ sprite and subsequently sliced or anchored across the tilemap.
3. **Pixel Density (Native 1:1)**:
   The uniform grain of the universe. Every entity—from a human eyelash to a mountain cliff—shares the same native pixel scale.

---

## 3. Strictly Prohibited Legacy Behavior

The following legacy practices are **strictly forbidden** for original DEUS production assets:

- ❌ **16 px Art Enlarged 3×**: Authoring sprites at $16\text{ px}$ and applying $3\times$ nearest-neighbor scaling.
- ❌ **Mandatory 3×3 Same-Color Pixel Blocks**: Artificially enforcing that every $3\times 3$ pixel block must share one color.
- ❌ **Downsample $\rightarrow$ Re-upscale Workflows**: Generating at $4\times$ or high resolution and downsampling with bilinear/bicubic blur.
- ❌ **Bilinear / Anti-Aliased Resizing**: Blurring pixel borders against transparent backgrounds.
- ❌ **Mixed Effective Pixel Densities**: Placing $16\text{ px}$-density props alongside $48\text{ px}$-density characters.

### Legacy Ultima VII Stand-In Isolation
Legacy stand-in assets imported from Ultima VII (`U7_` prefix) retain an isolated compatibility validation mode (`--legacy-3x`). They are strictly segregated in `docs/STATUS.md` and are systematically replaced by original native DEUS assets before public release.

---

## 4. Multi-Tile Objects & Packing Standard

Multi-tile assets (such as an $84\text{ px}$ Common Oak, a $92\text{ px}$ Pine, or a $96\text{ px}$ Cliff) must be **authored as single, coherent native-resolution objects**.

- **Authoring Rule**: The complete tree or rock is generated/drawn as one intact sprite with its full canopy and trunk.
- **Packaging Rule**: Deterministic pipeline tooling calculates the visual envelope, determines the ground anchor ($[x, y]$ at root baseline), and slices/packs the sprite into standard RMMZ sheet cells ($B\text{--}E$ decoration layers or $48\times 96$ wall sheets) without altering the native pixel scale.
- **Prohibition**: Never independently generate disjointed $48\times 48$ square chunks of a single tree.

---

## 5. Machine-Readable Asset Metadata Schema

Every production asset sheet is accompanied by a machine-readable JSON sidecar (`<asset_name>.json`) adhering to the following schema:

```json
{
  "assetId": "oak_common_temperate",
  "category": "tree",
  "intendedNativeWidth": 80,
  "intendedNativeHeight": 84,
  "footprintWidthTiles": 2,
  "footprintHeightTiles": 2,
  "anchorX": 40,
  "anchorY": 83,
  "pixelDensityMode": "NATIVE_1_TO_1",
  "resamplingAllowed": false,
  "animationFrameCount": 1,
  "alphaMode": "BINARY_0_255",
  "palettePolicy": "SNAPPED_UF_HEX",
  "sourceGenerator": "Google Nano Banana Pro (gemini-3-pro-image)",
  "conditioningReferenceVersion": "DEUS_WORLD_ART_VISUAL_CHARTER_V1"
}
```

### Metadata Fields Defined
| Field | Type | Description / Valid Values |
|---|---|---|
| `assetId` | string | Unique catalog identifier. |
| `category` | string | `terrain`, `vegetation`, `tree`, `rock`, `cliff`, `water`, `architecture`, `prop`, `character`, `item`, `vfx`. |
| `intendedNativeWidth` | integer | Target width in native logical pixels. |
| `intendedNativeHeight` | integer | Target height in native logical pixels. |
| `footprintWidthTiles` | integer | Number of $48\text{ px}$ tiles wide in gameplay collision grid. |
| `footprintHeightTiles` | integer | Number of $48\text{ px}$ tiles high in gameplay collision grid. |
| `anchorX`, `anchorY` | integer | Sprite anchor offset in pixels from top-left (typically bottom-center baseline). |
| `pixelDensityMode` | enum | `NATIVE_1_TO_1` (mandatory for original art) or `LEGACY_3X` (U7 stand-ins only). |
| `resamplingAllowed` | boolean | `false` for all standard art. `true` only for documented procedural exceptions. |
| `animationFrameCount` | integer | Number of animation frames per action/state. |
| `alphaMode` | enum | `BINARY_0_255` (every pixel alpha 0 or 255) or `PER_PIXEL_SMOOTH` (VFX exception). |
| `palettePolicy` | enum | `SNAPPED_UF_HEX` (256-color daylight palette) or `EXTENDED_VFX`. |
| `sourceGenerator` | string | Mandatory: `Google Nano Banana Pro (gemini-3-pro-image)`. |
| `conditioningReferenceVersion` | string | Active reference charter version (`DEUS_WORLD_ART_VISUAL_CHARTER_V1`). |

---

## 6. RMMZ Renderer Configuration & Verification

At official 1.00x camera scale:

1. **Texture Scale Mode**:
   - WebGL textures are set to `PIXI.SCALE_MODES.NEAREST` (`Tilemap.Renderer.prototype._createInternalTextures`).
   - RMMZ `Bitmap` instances for world tiles, characters, and UI enforce `smooth = false` (`_baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST`).
   - Canvas 2D contexts enforce `imageSmoothingEnabled = false`.
2. **Camera Scale**:
   - `UF.Camera.officialScale = 1.0` locked permanently (`DEUS_Camera.js`).
   - `Spriteset_Map.prototype.updateUfZoom` strictly forces `tilemap.scale.set(1, 1)`.
3. **Display Scaling vs. Art Resolution**:
   - Internal logical game resolution is fixed ($816 \times 624\text{ px}$ or fullscreen equivalent in integer tile multiples).
   - If output window/canvas is scaled to high-DPI displays, it must use integer nearest-neighbor presentation scaling. Internal 1:1 pixel density remains invariant.

---

## 7. VFX & Particle Exceptions

World visual effects (fire glow, magical auras, fog particles) may utilize smooth alpha blending (`alphaMode: "PER_PIXEL_SMOOTH"`):
- All VFX sprites must still be authored for the **same gameplay camera** and **spatial scale**.
- VFX shaders and smooth alpha layers are isolated to the effects pipeline and must never redefine the binary alpha or native resolution of environmental or character sprites.

---

## 8. Automated Tooling & Enforcement (`tools/art_check.js`)

`tools/art_check.js` mechanically enforces this standard:
- `--native` (default): Verifies native 1:1 pixel resolution, checks intended dimensions against sidecar metadata, ensures binary alpha ($0$ or $255$), and **fails any non-U7 asset that is 100% 3×3 block-scaled** (preventing 16px upscaled art from passing as native DEUS art).
- `--legacy-3x`: Validates legacy Ultima VII stand-ins (`U7_` prefix) requiring $3\times 3$ block uniformity.
- Automated test suite `tools/test_native_resolution_standard.js` deterministically verifies all 7 compliance fixtures.
