# Cave follow-up handoff — 2026-09-19

The user confirmed the RMMZ editor was closed and authorized appending cave-plant definitions. Before Codex's catalog patch could apply, another agent appended overlapping cave types, underground kit settings and GEN3 terrain changes. The patch failed safely; **Codex has not changed the catalog**. A question asking to pause that writer and authorize reconciliation of the new cave entries is pending. Do not overwrite these concurrent edits or imply their approval.

## Saved independently

Natural two-square wall rendering in UF_Levels and constant underground night in UF_DayNight. Only the four renderer/test hunks in Levels belong to this change; GEN3 is separate. The global clock still advances and Ground follows its normal clock. See system docs for positive and deliberately failing runtime evidence. No editor F5/F8 acceptance yet.

## Prepared, uncommitted flora work

- `game/js/plugins/UF_WorldGen.js`: `start.undergroundKit[z]` schema; natural plants across dry pockets; no surface-plant fallback; existing finite mineral pass unchanged.
- `docs/systems/UF_WorldGen.md`: schema and integration notes.
- `tools/test_z_flora.js`: actual-source WorldGen/Objects VM harness.
- `tools/fixtures/UF_ZFlora.js`: disposable runtime suite `underground_flora`, not registered live.

VM checks passed 7/7 only after injecting the agreed definitions in memory. That is not a pass against the current live catalog. Runtime flora suite has not run and no flora-specific screenshots were produced.

Agreed implementation plan, not deployed data:

- Shallow: cave_mushrooms (2 mushroom), hanging_roots (4 log), cave_moss (2 fiber + 1 straw).
- Deep: spore_cluster (2 mushroom), timber_fungus (4 log), spore_reeds (2 fiber + 1 straw).
- Each plant becomes a distinct underground harvested object; food/fiber regrow after 48 hours, timber after 96. Existing Objects regrowth already retains z and runs offscreen.
- Each camp minimum: 10 food plants, 9 timber plants, 30 fiber plants, 10 rocks_small, 4 granite_boulder, inherited ore/radius. Keep the surface kit untouched.
- Only append object IDs; never reorder old entries because saves store their array indices. Existing new external IDs must be reconciled, not duplicated.
- Temporary inspected Dungeon_B visuals: 38 pale small fungus, 36 green sprouts, 7+15 vines/roots, 54+62 tall pale fungus, 39 purple sprouts. No image file changes or unapproved AR-190x integrations.

The current external definitions differ: shared shallow/deep vegetation, surface tree/reed/flower graphics, non-regrowing consumed plants, and tower_cap becoming a surface stump. See audit A6. Existing saved object diffs should remain intact; clean flora generation should be tested with New Game, not by overwriting old saves.

## Resume safely

1. Obtain coordination on the competing catalog writer and the overlapping new cave entries. Do not interpret the earlier append-only permission as permission to rewrite them.
2. Re-read git status, claims and exact diffs; other work is active. No broad staging.
3. Reconcile cave data with the WorldGen schema, then run the actual-catalog VM command and the runtime fixture on fresh snapshots. Open every PNG.
4. Re-run vertical integration, save migration and smoke on the final coherent tree. The combined GEN3 snapshot `codex_cave_followup_vertical_20260919_a` passed 10/11, failing an offscreen test corridor whose generated objects were not cleared; another agent subsequently changed that fixture, not yet retested by Codex.
5. Resolve A6's mostly-earth mismatch and inaccurate GEN3 pocket size metadata with its owner. Do not silently accept a relaxed terrain check as meeting the user's previous requirement.
6. Commit only owned changes, refresh STATUS, then request editor Playtest/visual approval.
