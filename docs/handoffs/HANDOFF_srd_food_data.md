# HANDOFF: SRD food data in the catalog (weight, nutrition, water)

**From:** Claude Code (Fable, engine) · **To:** Gemini (coordinator gate for `game/data/*.json`) · **Date:** 2026-09-23 · **Feature:** SRD 5.1 survival, task 2 of the owner's order (effects → food data → stabilisation → native test)

## What the owner decided
Real SRD food weights go into the catalog where the SRD gives them; DEUS-only foods are explicitly DEUS data; and **item weight, nutritional contribution and water contribution are three separate numbers**. A 2 lb ration and 2 lb of something nutritionally poor must not count the same.

## The contract (per food item type in `items.types`)
| Field | Meaning | Unit |
|---|---|---|
| `weight` | what the item weighs (carry limits, `Items.weightOf`) | lb per unit |
| `food.nutrition` | what one unit counts toward the SRD's daily requirement (Food and Water, pp. 86–87: one pound a day) | lb of the day's food |
| `food.water` | what one unit counts toward the daily gallon | gal |
| `food.hunger` | the legacy meter value, still read by `UF_Jobs` `eat` for non-colonist units and by `DEUS_History` persons | points |
| `food.source` | `srd:<id>` when the SRD gives the numbers, else `"deus"` (owner review pending) | |
| `srd` | the SRD record id on an SRD item | |

`DEUS_Colonists` (commit pending, "food data") reads `food.nutrition` and `food.water` when a colonist finishes an `eat`; without them it falls back to the item's weight and no water.

## The data (`tools/add_srd_food_data.js`)
| Item | Weight | Nutrition | Water | Source |
|---|---:|---:|---:|---|
| rations (new, "Rations (1 day)") | 2 lb | 1.0 | 0 | `srd:gear:rations-1-day` (5 sp in the SRD; the catalog carries no prices) |
| berries | 0.1 | 0.1 | 0.02 | deus |
| fruit | 0.3 | 0.25 | 0.05 | deus |
| mushroom | 0.1 | 0.1 | 0.01 | deus |
| root | 0.3 | 0.3 | 0.01 | deus |
| meat_raw | 0.5 | 0.4 | 0 | deus |
| meat_cooked | 0.4 | 0.5 | 0 | deus |
| fish | 0.5 | 0.5 | 0 | deus |

The DEUS rows are Fable's proposal for the owner to adjust; nothing about them is SRD.

## What to do at the gate
1. Close the RMMZ editor.
2. `node tools/add_srd_food_data.js` (dry run: lists the changes), then `node tools/add_srd_food_data.js --write`. Both `UF_WorldCatalog.json` and `DEUS_WorldCatalog.json` are patched identically; the file stays canonical two-space JSON, so the diff is only the food rows.
3. `node tools/add_srd_food_data.js --check` must exit 0 afterwards; it is idempotent.
4. Reopen the project. `node tools/test_survival_needs_loop.js` already runs against the patched data in memory (`food_data_contract`, `nutrition_and_water_are_not_weight`).

## Art
The rations item uses `!$UF_Item_MeatCooked` as a stand-in. Request AR-2000 in `docs/ASSET_REQUESTS.md` asks for its own bundle sprite from Google Nano Banana Pro.
