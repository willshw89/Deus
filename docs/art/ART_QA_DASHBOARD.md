# Project DEUS — Art Quality Assurance Dashboard

**Header rewritten 2026-09-29** (DEC-007 amendment; PM under DEC-042). The procedure is `docs/art/DEUS_ASSET_STANDARD.md` §3. The QA checklist is §3.3 (twelve items, every one pass or fail). Owner sign-off is the SHA-256 ledger in `art/APPROVALS.md` (`docs/art/APPROVALS_FORMAT.md`) and nothing else.

## The one status ladder

`CATALOGUED` -> `PROMPTED` -> `GENERATED` -> `QA_PASSED` | `QA_FAILED` -> `OWNER_APPROVED` | `OWNER_REJECTED` -> `INDUCTED` -> `IN_GAME`

This replaces the ladder this page used until 2026-09-29 (`GENERATED` -> `AI_VISUAL_REVIEW` -> ... -> `COMPLETE`) and the two-gate wording (AI Reviewer Gate, AG Second-Pass). Read the old column values in the table as follows:

| Old value in the table | Reads as | Why |
|---|---|---|
| `GENERATED (STAGED)` | `GENERATED` | raw output exists; no checklist run |
| `INDUCTED (RETRO_QA)` | `GENERATED` | placed in a sheet before QA and before a ledger row; induction without both is void (`docs/art/APPROVALS_FORMAT.md`) |
| AI Verdict / AG Verdict `PENDING` or `QUEUED` | no `QA_PASSED` | nothing has been judged; every verdict on this page is still pending |
| catalogue `APPROVED` with no `YEA` ledger row | `GENERATED` | only the Owner's ledger row sets `OWNER_APPROVED` |

Rules for this page from 2026-09-29:

- An agent may write `QA_PASSED` or `QA_FAILED` here, with the failing item named. No agent writes `OWNER_APPROVED`, `INDUCTED` or `IN_GAME` without citing the ledger row date and, for `IN_GAME`, the opened screenshot.
- QA items 6 to 11 (camera, light, outline, grayscale step, variant coherence, animation) are judged on the PM's review board until `tools/art/validate_art.js` measures them. A static check alone never passes item 11.
- The variant columns `0 1 2 3 4 5 6 7` record eight cells. Where those cells are eight rotations of one generation, they count as one variant plus seven facings (asset standard §3.4), not eight variants.
- Every V8 sheet built by `tools/art/assemble_v8_sheet.js` copies one frame into all twelve cells. That is correct only for an asset whose record names a static exception from AS-ANIM-001. Vegetation, workstations and lights are animation classes and do not pass item 11 on such a sheet.

## Batch 3: QA pending, not approved

On 2026-09-29 eight batch-3 objects were set to `APPROVED` in `art/catalogue/catalogue.json` by Antigravity without a `YEA` row in `art/APPROVALS.md`. Under the SOP those statuses are void. The eight are `GENERATED` with QA pending until the checklist is run, the review board is presented, and the Owner writes the ledger row. Ids, as observed in the main working copy's uncommitted catalogue and its untracked masters on 2026-09-29 (the PM confirms the list at merge time; the catalogue was still changing while this page was written):

| Entry id | Master on disk (untracked in main on 2026-09-29; not in this worktree or any commit) | Status on this page |
|---|---|---|
| `ALL_SHARED_REMAINS_RUBBLE-PILLAR_V1_DEFAULT` | `art/masters/ALL_SHARED_REMAINS_RUBBLE-PILLAR_V1_DEFAULT.png` | `GENERATED`, QA pending |
| `ALL_SHARED_REMAINS_SKELETON_V1_DEFAULT` | `art/masters/ALL_SHARED_REMAINS_SKELETON_V1_DEFAULT.png` | `GENERATED`, QA pending |
| `ALL_SHARED_STONE_IRONSTONE_V1_DEFAULT` | `art/masters/ALL_SHARED_STONE_IRONSTONE_V1_DEFAULT.png` | `GENERATED`, QA pending |
| `LOWER1_SHARED_FLORA_CAVE-MOSS_V1_DEFAULT` | `art/masters/LOWER1_SHARED_FLORA_CAVE-MOSS_V1_DEFAULT.png` | `GENERATED`, QA pending |
| `LOWER1_SHARED_FLORA_SPORE-REEDS_V1_DEFAULT` | `art/masters/LOWER1_SHARED_FLORA_SPORE-REEDS_V1_DEFAULT.png` | `GENERATED`, QA pending |
| `SURFACE_SHARED_FLORA_BUSH_V1_DEFAULT` | `art/masters/SURFACE_SHARED_FLORA_BUSH_V1_DEFAULT.png` | `GENERATED`, QA pending |
| `SURFACE_SHARED_FLORA_LICHEN_V1_DEFAULT` | `art/masters/SURFACE_SHARED_FLORA_LICHEN_V1_DEFAULT.png` | `GENERATED`, QA pending |
| `SURFACE_SHARED_FLORA_WILD-GRAIN_V1_DEFAULT` | `art/masters/SURFACE_SHARED_FLORA_WILD-GRAIN_V1_DEFAULT.png` | `GENERATED`, QA pending |

The same reading applies to the 24 entries the catalogue already marks `APPROVED` at commit 5b300427 and to the ten batch-2 entries `tools/art/induct_batch_10.js` (untracked in main on 2026-09-29) marks `APPROVED`: none has a ledger row, so each is `GENERATED` until the Owner signs.

## Summary (as counted on 2026-09-29)

- Assets tracked on this page: 43 in the table below, plus the 8 batch-3 objects above.
- `IN_GAME` with an opened screenshot: 0.
- `OWNER_APPROVED` by ledger row: 0.
- `QA_PASSED`: 0. No checklist has been run under §3.3 yet.
- `GENERATED`: all of them.

## Active Art QA Table

Rows are kept as written on 2026-09-28. Their status words are the old ladder and read as the table above says. The 8 batch-3 objects are not in this table yet; they enter it when their records carry the new words.

| Asset Name | Canonical Entry ID | Topology | Variants | 0 1 2 3 4 5 6 7 | AI Reviewer | AI Verdict | AG Inspected | AG Verdict | Status Ladder | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Granite Boulder | `SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 1 Geological |
| Small Rocks | `ALL_SHARED_STONE_ROCKS-SMALL_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 2 Geological |
| Copper Outcrop | `ALL_SHARED_STONE_COPPER-OUTCROP_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 3 Mineral Outcrop |
| Coal Outcrop | `ALL_SHARED_STONE_COAL-OUTCROP_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 3 Mineral Outcrop |
| Tin Outcrop | `ALL_SHARED_STONE_TIN-OUTCROP_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 3 Mineral Outcrop |
| Silver Outcrop | `ALL_SHARED_STONE_SILVER-OUTCROP_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 3 Mineral Outcrop |
| Gold Outcrop | `SURFACE_SHARED_STONE_GOLD-OUTCROP_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 3 Mineral Outcrop |
| Iron Outcrop | `ALL_SHARED_STONE_IRON-OUTCROP_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 3 Mineral Outcrop |
| Clay Deposit | `ALL_SHARED_STONE_CLAY-DEPOSIT_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 4 Geological |
| Peat Mound | `SURFACE_SHARED_STONE_PEAT-MOUND_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 4 Geological |
| Gravel | `SURFACE_SHARED_STONE_GRAVEL_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 4 Geological |
| Crystal Cluster | `SURFACE_SHARED_STONE_CRYSTAL_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 4 Geological |
| Sulfur Crust | `LOWER1_SHARED_STONE_SULFUR-CRUST_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 4 Geological |
| Berry Bush | `SURFACE_SHARED_FLORA_BERRY-BUSH_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Berry Bush Bare | `SURFACE_SHARED_FLORA_BERRY-BUSH-BARE_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Wild Wheat | `SURFACE_SHARED_FLORA_WHEAT-WILD_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Cave Mushrooms | `LOWER1_SHARED_FLORA_CAVE-MUSHROOMS_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Cactus | `SURFACE_SHARED_FLORA_CACTUS_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Cactus Tall | `SURFACE_SHARED_FLORA_CACTUS-TALL_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Fern | `SURFACE_SHARED_FLORA_FERN_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Flowers Purple | `SURFACE_SHARED_FLORA_FLOWERS-PURPLE_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Flowers Blue | `SURFACE_SHARED_FLORA_FLOWERS-BLUE_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Flowers White | `SURFACE_SHARED_FLORA_FLOWERS-WHITE_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Desert Shrub | `SURFACE_SHARED_FLORA_DESERT-SHRUB_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Wild Hemp | `SURFACE_SHARED_FLORA_HEMP-WILD_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Wild Herbs | `SURFACE_SHARED_FLORA_HERBS-WILD_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Wild Roots | `SURFACE_SHARED_FLORA_ROOTS-WILD_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Lily Pad | `SURFACE_SHARED_FLORA_LILY-PAD_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Reeds | `SURFACE_SHARED_FLORA_REEDS_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 5 Flora |
| Bones Pile | `SURFACE_SHARED_REMAINS_BONES-PILE_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 6 Remains |
| Tree Stump | `SURFACE_SHARED_TREE_STUMP_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 7 Props |
| Fallen Log | `ALL_SHARED_ITEM_LOG_V1_DEFAULT` | STATIC_ORIENTED_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 7 Props (Oriented) |
| Kitchen Hearth | `ALL_SHARED_WORKSHOP_KITCHEN-HEARTH_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | P P P P P P P P | ART.QA | PENDING | PENDING | PENDING | INDUCTED (RETRO_QA) | Priority 7 Props |
| Sand Deposit | `ALL_SHARED_STONE_SAND-DEPOSIT_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Grass Tuft | `SURFACE_SHARED_FLORA_GRASS-TUFT_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Wildflowers | `SURFACE_SHARED_FLORA_FLOWERS_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Snow Bush | `SURFACE_SHARED_FLORA_SNOW-BUSH_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Tree Sapling | `SURFACE_SHARED_TREE_SAPLING_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Glow Caps | `LOWER1_SHARED_FLORA_GLOW-CAPS_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Stalagmite | `LOWER1_SHARED_STONE_STALAGMITE_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Small Crystals | `ALL_SHARED_STONE_CRYSTAL-SMALL_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Stone Rubble | `ALL_SHARED_REMAINS_RUBBLE_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
| Stone Well | `ALL_SHARED_STRUCTURE_WELL_V1_DEFAULT` | STATIC_VARIANT_8 | 8 | ? ? ? ? ? ? ? ? | ART.QA | QUEUED | QUEUED | QUEUED | GENERATED (STAGED) | Batch 2 |
