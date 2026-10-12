# Endrath — roles

Updated: 2026-10-12.

The PM is this Endrath desk. Fable writes code. This desk commits.

| Role | Responsibility |
|---|---|
| Owner | Sets direction. |
| Endrath PM — this desk | Maintains the live board, makes Owner-authorized commits, and plays in the RPG Maker editor. |
| Fable | Writes code when coding is opened and hands the changes to this desk for commit. |
| Grok | Reviews Fable's authored commit. |
| Codex Astra | Runs the headless test and reports its result. |
| Art Astra | Generates and judges pixels under the locked Art SOP (docs/ART_SOP.md). Does not touch the live tree. |

## Art boundaries

- Art does not paint into the live tree. A review project is a copy.
- Quality reference: C:\Endrath_art\trees
- All natural world generation follows docs/ART_SOP.md exactly (four-layer Object Description, locked palettes, ground-contact outline exception, one asset then stop).
- A colour is not a ground until the Owner names it.

## Operating rules

One owner per system. plugins.js is the only load list.

The Owner names the parents. A child is the nearest locked swatch of a mix of two parents. A new swatch is a defect. Alpha is 0 or 255.

Eight z-layers. Each step is darker. No #000000.

One surface depth is one foot. A z layer is ten feet. DEPTH_MAX is 10.

One lane, then stop.

PixelLab output is generation, not paint. All assets reference the SOP and locked palettes.

Quality control and tight SOP control and coherence drive the art style.
