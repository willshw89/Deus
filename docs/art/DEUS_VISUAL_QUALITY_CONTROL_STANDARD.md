# DEUS — Visual Asset Quality Control & Validation Standard
**Document ID:** `DEUS-QC-ART-01`  
**Status:** Authoritative Quality Control Design & Tooling Specification (Implementation Roadmap)  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Applicability:** Every asset generation, cleaning step, automated test harness, and review gate on Project DEUS  

---

## 1. Specification Status Notice

$$\textbf{NOTICE: THIS DOCUMENT SPECIFIES THE QC ARCHITECTURE AND TOOLING ROADMAP.}$$
The six gates outlined below represent the **formal target specification** for our visual quality assurance tools. They will be implemented incrementally into [`tools/art_check.js`](file:///c:/Users/snewt/OneDrive/Desktop/UF/tools/art_check.js) and verified via Rule 4 negative control mutants. Until those tests are executed and committed, this document serves as the binding design authority.

---

## 2. Executive Diagnosis: Where Assets Currently Slip Through

An audit of existing tooling ([`tools/art_check.js`](file:///c:/Users/snewt/OneDrive/Desktop/UF/tools/art_check.js), [`tools/originality_check.js`](file:///c:/Users/snewt/OneDrive/Desktop/UF/tools/originality_check.js), and [`docs/ART_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/ART_STANDARD.md)) identified seven specific vulnerabilities where deformed, unaligned, or stylistically broken assets can pass automated checks:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE SEVEN ART QC VULNERABILITIES IDENTIFIED                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Loose Palette Check:      art_check passes <=32 colors, but DOES NOT verify they    │
│                              actually exist in art/palette/uf.hex.                     │
│ 2. Cross-Action Drift:       No check verifies that Melee/Haul/Cast matches Walk       │
│                              in phenotype ramps, head size, or ground baseline.        │
│ 3. Black Wall-Top Blindspot: No check enforces upper 48px near-black (#08080C..#121218)│
│                              on 48x96 walls, allowing shingle/dirt caps to slip in.    │
│ 4. Equipment Scaling Void:   No check flags a 35px dagger or an 18px spear.            │
│ 5. Autotile Seam Blindness:  No validator proves A1-A4 24px quadrants match bitmasks. │
│ 6. Headroom & Anchor Drift:  Checks bottom row touches, but not y=47 ground baseline   │
│                              or rig-appropriate transparent headroom margins.          │
│ 7. Texture Frequency Trap:   No check prevents 14px grass blades or giant cobblestones.│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Three Distinct Scaling Validations

Visual quality control cannot rely on a single blunt measurement. Scale is validated across three orthogonal axes:

1. **WORLD SCALE**: `tile ↔ creature ↔ architecture ↔ vegetation`  
   Does a human look believable standing in a doorway, next to a barrel, under an oak tree, or climbing a cliff face?
2. **BODY SCALE**: `body ↔ weapon ↔ shield ↔ tool ↔ clothing`  
   Does a dagger look like a dagger and a spear look like a spear relative to that specific species/rig's anatomy?
3. **TEXTURE SCALE**: `object size ↔ pixel-feature frequency`  
   Are grass blades 1–3px rather than 14px? Are cobblestones tightly fitted rather than bowling balls? Is wood grain proportional?

---

## 4. The Six Automated Mechanical Gates (Target Specifications)

### Gate 1: Strict Hex Membership (`--palette-exact`)
- **Scope**: Ordinary production pixel assets (characters, terrain, objects, furniture).
- **Rule**: Every opaque pixel's RGB tuple must exist in `art/palette/uf.hex`. If an unsnapped off-palette pixel exists, the check immediately triggers **FAIL (exit 1)**.
- **Rendering Exemption**: Translucent VFX, dynamic spell auras, and engine lighting overlays operate under a separate rendering policy and are exempt from static 256-color palette clamping.

### Gate 2: Cross-Sheet Demographic Continuity (`--cross-sheet`)
- **Scope**: Character action sheets (`<id>_melee.png`, `<id>_haul.png`, `<id>_magic.png`) validated against `<id>_walk.png`.
- **Rule**: Rather than expecting 100% pixel-for-pixel identity (which would forbid legitimate highlights and dynamic shadow changes in active poses), the validator verifies **Phenotype / Palette-Ramp IDs**:
  - Skin ramp ID, hair ramp ID, and eye pupil color category must match exactly.
  - Standing frame height delta $\Delta H \le 1\text{ px}$.
  - Head height delta $\Delta \text{Head} = 0\text{ px}$.
  - Ground baseline $y = 47$ on standing frames.

### Gate 3: Dwarf Fortress Black Wall-Top Audit (`--wall-cap`)
- **Scope**: Two-grid-high architectural walls and cliff-adjacent vertical elements ($48 \times 96\text{ px}$).
- **Status**: Candidate QC standard, pending final visual confirmation with the Human Golden Pack.
- **Rule**:
  - Upper Cap ($y = 0 \dots 47$): Mean luminance $\le 18$ (sRGB 0–255), colors bounded strictly to `#08080C` through `#14141E`, variance $\sigma^2 \le 4.0$. (Rejects isometric roofs or bright highlights on wall caps).
  - Lower Face ($y = 48 \dots 95$): Requires authentic material texture (timber, stone, granite) and a defined 1-pixel horizontal top shadow at $y = 48$.

### Gate 4: Body-Relative Equipment Scale Gate (`--equipment-proportions`)
- **Scope**: Held weapons, shields, and tools.
- **Rule**: Evaluated as **body-relative proportions ($H$) per rig family**, not raw static pixels:
  - Daggers: $0.25 \dots 0.40\ H$
  - One-Handed Blades: $0.55 \dots 0.75\ H$
  - Two-Handed Weapons: $0.85 \dots 1.15\ H$
  - Spears / Pikes: $1.00 \dots 1.50\ H$
  - Shields: $0.35 \dots 0.70\ H$
- **The Extended Envelope Invariant**: A 48×48 tile is the simulation coordinate and baseline humanoid footprint; spears, cloaks, horns, hair, and gestures **can and must visually extend beyond 48px** when physically appropriate, using stable ground origin ($x=\text{Center}, y=47$).

### Gate 5: Autotile Quadrant Seam Audit (`--autotile-seams`)
- **Scope**: Tilesets A1, A2, A3, and A4.
- **Status**: Pending formal verification against actual RMMZ internal autotile bitmask tables before test implementation.
- **Rule**: Verifies that 24×24 sub-quadrants share identical pixel sequences at their touching borders across all supported RMMZ bitmask configurations, guaranteeing zero 1-pixel seam lines.

### Gate 6: Rig-Specific Ground Baseline & Headroom Gate (`--headroom`)
- **Scope**: Character sheets.
- **Rule**: Soles of standing characters must hit row $y = 47$. Headroom clearance is **rig-specific** (e.g. minimum 4px for standard adult humans, larger for children or dwarves, adjusted for tiefling horns or dragonborn crests) to prevent clipping under helmets and tall headwear.

---

## 5. Pre-Generation Quality Controls: Templates & Scale Rulers

### 5.1 The Universal Scale-Strip Reference Card
A permanent visual reference card (`art/reference/DEUS_SCALE_STRIP_V1.png`) is passed as an `ImagePaths` reference in every environment and equipment prompt. It lays out the canonical silhouettes side-by-side:
$$\textbf{[48px Grid Tile]} \longleftrightarrow \textbf{[Human (42px)]} \longleftrightarrow \textbf{[Dwarf (36px)]} \longleftrightarrow \textbf{[Elf (43px)]} \longleftrightarrow \textbf{[Door (72px)]} \longleftrightarrow \textbf{[Bed (2-Tile)]} \longleftrightarrow \textbf{[Tree (3-Tile)]} \longleftrightarrow \textbf{[1-Z Cliff (96px)]}$$

### 5.2 Blank Deterministic Mask Templates
Instead of asking the model to mentally pack a complex sheet:
- `TEMPLATE_A2_GROUND.png`: Declares the 32 autotile block boundaries.
- `TEMPLATE_A4_WALL.png`: Pre-bakes the solid black top caps ($y=0\dots 47$), prompting the model only to paint the lower material faces ($y=48\dots 95$).
- `TEMPLATE_CHAR_12_FRAME.png`: Declares the $3\times 4$ cell grid with red baseline guides at $y=47$ and rig-specific headroom zones.

---

## 6. In-Engine Runtime & Performance Quality Controls

Automated Playtest harnesses (`tools/test_visual_regressions.js`) enforce:
1. **Single Canonical Camera Scale Verification**: Display scale is locked. Tile width is strictly 48px (or the frozen integer multiple). Zero sub-pixel jitter during WASD panning. Zero blur or bilinear filtering.
2. **Memory & Performance Invariants**:
   - VRAM and heap allocation must remain **bounded and stable after initial level warm-up, with zero sustained upward growth**.
   - Viewport culling must bypass `Sprite_Character.update()` and render passes for entities outside the camera (+ 2 tile margin).
   - Target: **60 FPS under 4× simulation speed** with up to 100 active simulated colonists.
3. **Foot-Y Depth Sorting & Layer Occlusion**: Upper pixels smoothly occluded behind tree canopies, doorways, or walls while feet remain visible at the correct Y-depth.

---

## 7. Human Review Workflow: Definition of Visual Done

1. **Automated Mechanical Check**: `node tools/art_check.js <file>` passes all active gates.
2. **Originality Similarity Flagger**: `node tools/originality_check.js <file>` flags any unexpected shape-matching. (Provenance records and human audit remain the authoritative legal gate).
3. **In-Context Playtest Screenshot**: The asset is placed into a live RMMZ test map alongside the canonical Human Adult reference sprite at the single canonical camera distance under daytime and twilight lighting.
4. **Visual Inspection**: The reviewing agent opens the resulting screenshot and verifies that line weights match, texture frequency is proportional, and equipment reads clearly at 1× gameplay scale.
5. **User Approval Gate**: Work stops at the gate until the user grants explicit approval.
