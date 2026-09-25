# DEUS — TASK ASSIGNMENT: DEUS-TSK-FABLE-19C
# WG.00.09 — GLOBAL FIVE-Z DEPTH RENDERER

**Agent:** Fable / Claude Code  
**Role:** Bounded implementation agent  
**Coordinator / Review Authority:** Gemini  
**Adversarial Quality Auditor:** Grok  

**Prerequisites:**
- `WG.00.06 / FABLE-19A`: Five-Strata Geometry Foundation — `FROZEN / ACCEPTED` [commit `edba004`]
- `WG.00.07`: Fluid ↔ Strata Reconciliation — `FROZEN / ACCEPTED` [commit `2f47203`]
- `WG.00.08 / FABLE-19B`: Natural Cuts & All-Z Caves on Strata — `FROZEN / ACCEPTED` [commit `2e4571a` / `31676cf`]

---

## 1. OBJECTIVE

Implement the canonical **Global Five-Z Depth Renderer** (`WG.00.09 / FABLE-19C`) in `game/js/plugins/DEUS_Depth.js` and associated engine render hooks:
- Enable the active camera level to look down through natural cuts, ravines, canyons, chasms, sinkholes, skylights, and excavated shafts across all five macro-Z levels (`Z+2`, `Z+1`, `Z0`, `Z-1`, `Z-2`), compositing up to 4 visible lower planes beneath the active camera level.
- Eliminate surface-only gating (`z > 0`), 2-plane hardcoded limits, and legacy shape-grid inference.
- Enforce the canonical 5 ft camera recession model, restrained progressive value shading, zero-allocation hot paths, chunk-local exposure caching, and strict exclusion of production blur.

---

## 2. PHYSICAL STRATA AUTHORITY FOR VERTICAL SIGHT

### Hard Invariant: No Secondary Visibility Authority
- The five 1 ft strata ($S_0..S_4$) per 5 ft cell (25 strata across the five macro levels, elevation $e = (z + 2) \times 5 + s$, $0 \le e \le 24$) remain the **ONLY** truth for matter and void.
- Downward line-of-sight must be calculated directly from the strata column:
  - Sight penetrates non-solid strata ($m = 0$ air or translucent fluids).
  - Sight terminates at the first opaque solid stratum (`isSolid`, non-zero structural HP, constructed floor/roof, or ceiling cap).
- **Derived shape codes are a compatibility view only:** `shapeAt`, `shapeCodeAt`, and `shapeGrid` are convenience mappings for 2D movement and legacy pathfinding. They MUST NEVER be used to determine vertical sight, cave-roof occlusion, exposure depth, or hole transparency.
- The depth renderer directly queries `UF.Levels.hasOpaqueOverburden(ax, ay, x, y, z)`, `continuousAirHeight`, `worldStrataElevationAt`, and vertical passage masks.

---

## 3. FULL FIVE-LAYER DEPTH COMPOSITING

- Support looking down from any camera level $Z_{\text{cam}} \in \{+2, +1, 0, -1, -2\}$:
  - At $Z_{\text{cam}} = +2$: compositing can expose depths down to $Z = -2$ (4 lower planes).
  - At $Z_{\text{cam}} = +1$: compositing can expose depths down to $Z = -2$ (3 lower planes).
  - At $Z_{\text{cam}} = 0$ (Ground): compositing can expose depths down to $Z = -2$ (2 lower planes).
  - At $Z_{\text{cam}} = -1$: compositing can expose depths down to $Z = -2$ (1 lower plane).
  - At $Z_{\text{cam}} = -2$: 0 lower planes (bedrock layer; upward ceiling rendering is handled by overburden occlusion).
- Multi-tier exposure: A chasm cutting from $Z0$ through $Z-1$ to $Z-2$ must render the ground rim at depth 0, the exposed rock walls and ledges of $Z-1$ at depth 1, and the crystalline bed of $Z-2$ at depth 2 in a unified, continuous composite.

---

## 4. CANONICAL 5 FT CAMERA SCALE MODEL

- Each macro-Z level represents exactly **5 feet** of vertical elevation.
- Virtual camera optical perspective uses the physical focal model:
  $$S(\text{depth}) = \frac{H}{H + 5 \times \text{depth}}$$
  anchored to the camera focus origin, with canonical baseline $H = 120\text{ ft}$:
  - Depth 1 (5 ft below): scale factor $120 / 125 = 0.960$
  - Depth 2 (10 ft below): scale factor $120 / 130 = 0.923$
  - Depth 3 (15 ft below): scale factor $120 / 135 = 0.889$
  - Depth 4 (20 ft below): scale factor $120 / 140 = 0.857$
- Maintain developer presets for tuning ($H \in \{90, 120, 160\}\text{ ft}$).

---

## 5. RESTRAINED PROGRESSIVE VALUE SHADING

- Depth is communicated via discrete, pixel-crisp progressive value reduction:
  - ~4% brightness and saturation reduction per depth level (e.g. 96%, 92%, 88%, 84%).
  - Alpha remains strictly locked at $1.0$ (solid substrate; no black void or background bleeding).
- Strict adherence to Master Palette V1 (`art/palette/uf.hex`) and 16-bit cel-shading principles:
  - Shading uses flat tonal steps matching the standard upper-left (135°) light direction.
  - Zero blurred gradient filters.

---

## 6. ABSOLUTE PROHIBITION ON PRODUCTION BLUR

- **Binding Rule:** AGENTS.md Rule 12, VISION V108, V133, and Runtime Performance Architecture §6.5.
- Dynamic blur shaders (`PIXI.filters.BlurFilter`) are **STRICTLY PROHIBITED** in production builds.
- Depth is communicated exclusively through physical cliff/wall geometry, scale recession, parallax, and restrained color/value reduction.
- Any blur implementation must be completely bypassed by default (`blur: false`), incurring exactly 0.00 ms GPU/CPU overhead.

---

## 7. VIEWPORT CULLING & PERFORMANCE INVARIANTS

### Frame Budget: $\le 6.00\text{ ms}$ Render Time ($\ge 60\text{ FPS}$ at $\times 1$, $\ge 30\text{ FPS}$ at $\times 8$)
1. **Zero Overdraw When Unexposed (`PERF-003`):**
   - Never render full stacked maps beneath each other.
   - When the active viewport contains zero open cuts, ravines, or shafts, **ZERO lower plane draw calls** occur.
2. **Chunk-Local Exposure Cache (VISION V133):**
   - Evaluate vertical exposure in viewport-bounded chunks.
   - Invalidate cache entries event-driven on strata write events:
     - `levels:strataChanged`
     - `levels:strataDestroyed`
     - `levels:capBreached`
   - Zero full-world or full-viewport raycasts per frame; stable terrain cost is near-zero.
3. **Zero-Allocation Hot Path:**
   - Zero object allocations (`{}`), array allocations (`[]`), closures (`.map()`, `.filter()`), or string concatenations in the per-frame render loop.
   - Use pre-allocated typed arrays and module-scoped scratch buffers.
4. **Offscreen Sprite Suppression:**
   - Sprites and animated tiles outside the camera viewport (+2 tile padding) are culled before matrix transforms and draw calls.
   - All lower-level animations synchronize to the global master animation tick (`$deusAnimationMaster.frame3`).

---

## 8. DWARF-FORTRESS-STYLE BLACK WALL-TOP ALIGNMENT

- In lower exposed planes, all two-grid-high walls, doors, cliff-adjacent architectural pieces, and natural cave walls (48×96 px) MUST strictly maintain the DF Black Wall-Top Convention (AGENTS.md Rule 13, ART_DIRECTION_SPEC §3):
  - Upper 48 px cap: flat near-black (`#08080C` to `#121218`) with 2 px subtle boundary edge.
  - Lower 48 px face: authentic material texture (stone, soil, timber).
  - Unbroken horizontal black occlusion line preserved across all exposed lower elevations.

---

## 9. DELIVERABLES & OWNED PATHS

### Owned File Paths (Fable write authority in isolated worktree `wt19c`):
- `game/js/plugins/DEUS_Depth.js`
- `docs/systems/UF_Depth.md`
- `tools/test_global_depth_renderer.js`

### Read-Only References:
- `game/js/plugins/DEUS_Levels.js`
- `game/js/plugins/DEUS_WorldGen.js`
- `docs/systems/UF_Levels.md`
- `docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md`
- `docs/PERFORMANCE_ARCHITECTURE.md`

---

## 10. QUALITY & VERIFICATION GATES

1. **Automated Regression Suite (`tools/test_global_depth_renderer.js`):**
   - Pure Node.js VM execution testing all 5 macro-Z camera viewpoints.
   - Deterministic exposure verification on golden seeds (18, 3, 21, 4).
   - Zero-allocation assertions in render query hot path.
   - Negative mutant controls (minimum 15 semantic mutants caught, each exiting 1).
2. **Adversarial Audit (Grok Sign-Off):**
   - Independent review firewall: Grok audits diff, specs, and invariants without implementer anchoring.
   - Verification of zero memory leaks, zero blur overhead, and correct strata downward LoS termination.
3. **Native NW.js Playtest Visual Proof:**
   - Authentic 1.00x native screenshot showing visible portions of all 5 levels (`Z+2` down to `Z-2`) in one view on genuine generated world geometry.
   - Inspected screenshots for each camera level switch (-2, -1, 0, +1, +2).
   - 0 console errors, 0 exceptions, 60 FPS verified.
