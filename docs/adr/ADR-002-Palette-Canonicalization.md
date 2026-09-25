# ADR-002: Canonical Master World Palette & Legacy Palette Compatibility

**Status:** APPROVED / CANONICAL  
**Date:** 2026-09-25  
**Context:** DEUS Directive 001 Section 5 / WG.00.05 / DW.01.05  
**Integration Authority:** Gemini / Antigravity

---

## 1. Context & Problem Statement
Historical prototype artwork used `art/palette/uf.hex` (384 colors). Under DW.01.05 and WG.00.05, Project DEUS adopted a unified, authoritative 16-bit master palette capped at 256 colors to ensure strict retro-CRPG aesthetic coherence and zero perceptual color drift.

## 2. Decision
1. **Authoritative Master Palette:** `art/palette/deus_master_world_palette_v1.hex` is the single canonical source of truth for all world, environment, character, and object art.
   - Total active slots: 226 colors.
   - Headroom reserve: 30 reserved slots (total indexing <= 256 colors).
   - Contains 58 cohesive family material ramps (3–5 tone lengths).
2. **Legacy Compatibility with `uf.hex`:**
   - Existing prototype assets referencing `art/palette/uf.hex` remain valid in the codebase during transition.
   - Automated art validation tools (`tools/art_check.js`) and palette quantizers prioritize `deus_master_world_palette_v1.hex`.
   - Any new asset generated via Google Nano Banana Pro or delivered to `game/img/` must map to `deus_master_world_palette_v1.hex`.

## 3. Consequences
- Zero near-duplicate hex entries across material families.
- All non-living and living asset generation prompts must anchor against `deus_master_world_palette_v1.hex`.
