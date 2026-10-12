# Endrath Art SOP — Natural World Generation

**Status:** Locked 2026-10-12. Quality control and tight SOP control drive the art style.

**Quality reference:** C:\Endrath_art\trees (locked tree set)

**Palettes:** Locked biome masters (parents + verified NSEW children). No invented hexes. Alpha 0 or 255.

## Mandatory layered prompt structure
Every generation MUST use this order. Do not collapse.

1. **Overall art style and specs**
   High top-down view. Crisp pixel clusters. Consistent upper-left light. Establish silhouette first, value second, restrained colour third. Hard continuous single-pixel black outline on open edges only. No outline on ground-contact pixels. Transparent background. Binary alpha. No noise, stipple, dither, blur, soft edges, or partial alpha. Continuous connected forms. Ultima VII / Ultima VIII visual language. Preserve deep shadows and substantial middle planes. Highlights are sparse connected 2–4 pixel groups on upper surfaces only.

2. **Biome specs**
   Insert locked biome description and allowed colours only from the master palette.

3. **Type spec**
   Rules for the asset type (tree, bush, rock, cliff, water, ground, flora, etc.).

4. **Generation-specific specs**
   Exact size, proportions, silhouette constraints, style reference paths from locked assets, prohibitions for this single asset.

## Process
- Tool: Object Creator Pro via API (1-direction, high top-down, selective outline, medium detail, transparent background, binary alpha).
- Maximize style reference strength from locked assets of the same type and biome.
- Post-process locked order: recolor to palette → remove strays → outline (air-facing only) → contrast pass preserving hard silhouette → snap to palette → binarise alpha.
- One asset, then stop for review.

## Filing
Flat structure. Filename: {category}_{asset}_{variant}_{size}.png

All natural world assets must reference this SOP and the locked palettes.
