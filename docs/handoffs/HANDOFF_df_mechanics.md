# HANDOFF: art for the DF-mechanics systems (remains, ecology, tech trees)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Started:** 2026-09-19
**Plan this serves:** the "DF mechanics" claim in `docs/STATUS.md` (VISION V74-V77, V83-V85). One section per system; each section is written by the run that builds that system and says exactly which assets it needs, to what spec, and how they plug in without touching code. The shared rules are the ones in `docs/ASSET_REQUESTS.md` (Shared spec) and `docs/ART_STANDARD.md`; nothing here overrides them.

---

## Ecology (`UF_Ecology`, 2026-09-19)
**What the system does:** harvested plants regrow, plants spread, animals breed and wander back in, monsters come on a seeded clock, ore never returns (`docs/systems/UF_Ecology.md`). A felled tree comes back in three stages: **stump** (exists: AR-021) → **sapling** (new) → the grown tree (exists: AR-102). Births, arrivals and monster spawns reuse the creature sheets of AR-401/AR-402, and plant spread reuses AR-102/AR-103, so the sapling is the only new asset.

### AR-1600 Tree sapling (broadleaf and conifer)
| Item | Spec |
|---|---|
| What | A young tree one or two seasons old: a thin stem with a few leaves (broadleaf) and a small fir-like shoot (conifer). It must read as "a tree starting", not as grass, a bush or a flower, at 1× and at zoom ⅓ |
| Frame | 48 × 48, one object per sheet |
| Size (V81 micro scale, ART_STANDARD §2) | 16–22 px tall against the 44–48 px person, about 8–14 px wide; grounded on row 47 at the horizontal centre (anchor `[24, 47]`, footprint `[1, 1]`), so open ground shows round it |
| Draw order | Under units (`"under": true`), walkable (`"passable": true`): a unit standing on it covers it |
| Frames | 1 stand frame; optional 3-frame sway loop (V60) named `sway` in the sidecar. The engine draws the stand frame until the sway loop is wired for objects |
| Colours and alpha | `art/palette/uf.hex` only, 8 colours or fewer, alpha 0 or 255, no baked shadow |
| Generation | 4× canvas (one square = 192 × 192), flat magenta `#FF00FF`, original kept in `art/raw/` (ART_STANDARD §5) |
| Files | `game/img/characters/!$UF_Sapling.png` (broadleaf) and `!$UF_SaplingConifer.png` (conifer), each the standard RMMZ `!$` single-object sheet (144 × 192, the sapling in every cell, as `!$UF_Fern.png` is laid out) with a JSON sidecar like `!$UF_Fern.json`: `{ "id": "sapling", "frameWidth": 48, "frameHeight": 48, "anchor": [24, 47], "footprint": [1, 1], "facings": ["S", "W", "E", "N"], "animations": { "stand": [0] }, "passable": true, "under": true }` (conifer: `"id": "sapling_conifer"`) |
| Checks before delivery | `tools/art_check.js --native` and `tools/originality_check.js` pass; a review render at 1× and 4× on grass beside the person reference and beside AR-021's stump and AR-102's oak and pine |

**How it plugs in (no code):** the catalog object already exists (`tools/add_ecology_catalog.js` appends it): `{ "id": "sapling", "name": "Sapling", "tile": { "sheet": "Outside_B", "id": 152 }, "tint": "#7fb35a", "under": true, "passable": true, "tags": ["plant", "sapling", "wood"], "actions": { "gather": { "work": 20, "yields": { "fiber": 1 }, "becomes": null } } }` in `game/data/UF_WorldCatalog.json` → `objects`. When the broadleaf sheet is approved, replace its `"tile"` and `"tint"` with `"image": "!$UF_Sapling"` (the `objects` list is yours to edit per `HANDOFF_world_generation.md`); nothing else changes. What a sapling grows into is not in the object: the engine keeps it in the cell's growth timer, so **one** sapling object serves every tree kind. The conifer sheet needs a second object (`"id": "sapling_conifer"`, same fields, `"image": "!$UF_SaplingConifer"`) and an engine change to pick it for conifers (pine, snow fir); write it under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md` when you deliver, and Claude Code wires it.

**World generation:** saplings are never placed by the generator (they only appear where a tree was felled or where a tree seeds itself), so nothing in `biomes[*].plants` changes.

**Placeholder in use now:** stock `Outside_B` tile 152, a small leafy grass clump, tinted `#7fb35a` (checked by opening a crop of the sheet, 2026-09-19).

**Not requested:** young animals (newborns are adult-sized; `docs/design/ECOLOGY.md` decision D6). Ask the user before making any.
