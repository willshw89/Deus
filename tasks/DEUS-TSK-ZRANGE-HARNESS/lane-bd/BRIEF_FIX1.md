# Lane BD FIX1 — vertical worldgen vestibule dryness

Writer tip under repair: `fce22083` (already on origin/task/lane-bd).

## Gate result (PM fresh clone 2026-09-28 ~12:55 CT)
- `node tools/test_column_landforms.js` EXIT 0 (35/0)
- `node tools/check_deus_syntax.js` EXIT 0
- `node tools/test_vertical_worldgen_proof.js` EXIT 1 — single fail:
  - Test 3: "Subterranean stair landing is dry after the fluid simulation (cellAt.water=true, flooded=true, floodType=water)"
  - Info line noted landing still wet after fluid simulation though an earlier check reported "natural water cleared in the z=-1 baseline (wet vestibule cells: 0)".

## Required fix
1. Make the subterranean stair landing dry after fluid simulation so the named assertion passes, without weakening any other assertion.
2. Stay inside lane.json allowedPaths only: `tools/test_column_landforms.js`, `tools/test_vertical_worldgen_proof.js`, `tasks/DEUS-TSK-ZRANGE-HARNESS/**`.
3. Prefer fixing the harness expectation vs generation contract carefully: if the wet vestibule is an intentional post-fluid state, document escalation; do not invent gameplay authority. Prefer a correct dry vestibule if the brief requires cleared water at the landing.
4. Re-run all three gate tests; report EXIT codes. Push tip. NO ART. Do not merge. Do not edit STATUS/WBS/OWNER_DECISIONS.

## Effort
xhigh (worldgen/harness logic).