# HANDOFF: the stone hearth and the household cottage (DEUS-TSK-FABLE-16, 2026-09-24)

For Gemini. What the engine now builds, which art it needs, and how the art plugs in through the catalog without touching code. Generator for every image: Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`) only (AGENTS.md Rule 11); every motion is a sprite frame (Rule 12); these are non-living objects, so the autonomous pipeline (Rule 13) applies.

## 1. What the engine does now

- **A contained hearth.** `DEUS_Fire` treats a constructed hearth as a contained fire source: in normal use it never lights a neighbour (escape chance 0). A campfire in the open still escapes at the catalog's 0.0005 a beat. A hearth's type is recognised by id (`hearth`, `kitchen_hearth`), by a `hearth` tag, or by `contained: true` on the catalog object; a finished building's hearth cell is also marked contained by `DEUS_Projects`, whatever stands there. `damaged`, `overturned` or `uncontrolled` (a flag on the object type, or `UF.Fire.setSourceState`) makes it escape again. Every fire carries a provenance (`fireId`, when and where it started, from what, how it spread), and a burn casualty's forensic record names it.
- **The communal shelter is 6×6** with the hearth in the middle, its four neighbours kept free (the walkway from the door, no straw against the fire), and 11 straw beds.
- **A household cottage** (5×5, wood walls, a wood door, the hearth, 2–3 straw beds on the corners, a wooden chest) is built for every household once the settlement is a village (shelter up, everyone bedded, three days of food, storage). The household moves in: its members take the cottage beds and their communal beds go to newcomers.
- The blueprint's hearth id is `"hearth"`, resolved at runtime to the first of `hearth`, `kitchen_hearth`, `campfire` the catalog defines. **Today the catalog has no `hearth` object, so shelters and cottages build the cooking hearth (`kitchen_hearth`, `!$UF_Kitchen_Hearth`: 4 stone and a log).** The moment a `hearth` object exists in the catalog, every new shelter and cottage builds it instead. No code change.

## 2. The art (AR-2010)

`game/img/characters/!$UF_Hearth.png` + `!$UF_Hearth.json` (the same sidecar shape as `!$UF_Kitchen_Hearth.json`).

- Footprint 48×48, one cell, blocking; anchor `[24, 47]`; the 45° lean and outline weight of the other `!$UF_*` objects (docs/ART_STANDARD.md, docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md).
- A raised ring of fitted grey field stones (the palette's stone greys, `art/palette/uf.hex`), a bed of ash inside, a small flame.
- Frames on one sheet (one row, 48×48 each): `unlit` (1: cold ash, no flame), `lit` (4: a low flame flicker loop; the sidecar lists them under `animations.lit` and the engine steps them: no code-made flicker), `damaged` (1: the ring broken open on one side, embers spilling onto the ground).
- Nothing else moves; no smoke overlay (smoke is `UF_Ambient`'s business and is off for hearths until it too is a sprite).

## 3. Plugging it in (catalog only, editor closed)

Add to `game/data/UF_WorldCatalog.json` → `objects`:

```json
{
  "id": "hearth",
  "name": "Stone hearth",
  "image": "!$UF_Hearth",
  "passable": false,
  "tags": ["building", "fire", "heat", "hearth", "workplace", "lit"],
  "build": { "items": { "stone": 4, "log": 1 }, "work": 80 },
  "ruin": "rubble"
}
```

The existing fire rule `{ "tags": ["fire"], "source": true, "escapeChance": 0.0005 }` already makes it a source; `DEUS_Fire` holds it contained because of the `hearth` tag and id. To let a damaged hearth escape at another rate add `"uncontrolledEscapeChance": 0.002` to that rule (optional; 0.002 is the default).

Nothing in `game/js/` changes. The sidecar's `animations.lit` frames are what the engine steps (Rule 12).

## 4. Checking the delivery

- `node tools/test_settlement_domestic_housing.js`: with the object in the catalog, the check `plugins_load` reports "shelter hearth resolves to hearth (contained type true)" and the whole run must still pass (the founders build it: 4 stone and a log per hearth).
- `node tools/test_hearth_containment_and_provenance.js`: unchanged (its double defines its own hearth).
- In the editor's Playtest: the communal shelter's centre shows the hearth, the four cells round it stay empty, straw beds beyond; `UF.Fire.sourceInfoAt(area, x, y)` on it reads `{ contained: true, state: "normal", escapeChance: 0 }`.
