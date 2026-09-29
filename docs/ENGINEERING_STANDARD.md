# ENGINEERING_STANDARD: what ENGINE_RULES does not say

> The rules are in `docs/ENGINE_RULES.md` (rewritten 2026-09-29). This file was 299 lines of 68 numbered sections (User directive 2026-09-21); everything that duplicated `ENGINE_RULES.md`, `ARCHITECTURE.md` or `AGENTS.md` Rule 14 was removed on 2026-09-29. What is left is design guidance the rulebook does not repeat.

## Update cadences (targets, not measured)
The fixed clocks are stated once in ENGINE_RULES §7: the headless engine tick is 10 Hz (DEC-012) and the action-domain round is the 6 s SRD round (AS-SCALE-001). The cadences below are design targets. Render 60 Hz; tactical action 10-20 Hz; survival AI 2-5 Hz; job selection 1-2 Hz; household planning every 10 s; settlement planning every 50 s; historical biology and ecology batched per game hour or day. Lower cadences accumulate elapsed time and resolve it; they never change an outcome.

## Fidelity tiers
High: visible and nearby entities (exact movement, combat, animation). Medium: the active settlement (jobs, needs, production). Coarse: distant regions and background wildlife (batched statistics).

## Leaks
- Every reservation has an owner, a purpose and a release condition, and is released on cancel, death and load.
- Every project has an explicit lifecycle state (`planned`, `active`, `blocked`, `complete`, `canceled`, `abandoned`); terminal states are cleaned up.
- History and logs use bounded buffers. Listeners are removed with their owner.

## Pathfinding
Bounded searches with an iteration cap; cached local routes and unreachable-area caches; path work spread across frames; priority Emergency (flee, combat) > High (hunger, thirst) > Normal (jobs) > Low (relocation).

## Worldgen
Same seed + coordinates = the same untouched world; mutations are stored separately from the base generation. Catalogues, materials and recipes are validated at boot. A permanent deterministic reference world for regression (`DEUS_REFERENCE_WORLD`) was specified on 2026-09-21 and is not built.

## Working rules
- Freeze a shared interface (World, Entity, Inventory, Job, Time, Resource) before two lanes write against it.
- No obsolete duplicate files (`*_V2.js`, `*_FINAL.js`); git is the archive. Dead-code and asset audits delete nothing without proof.
- Change only what the feature needs; no mass cleanup in a feature lane. Fix ownership and invariants rather than adding defensive patches.
- Dev builds throw on invariant violations; production recovers without corrupting world truth. Debug overlays cost nothing when off.

## The health questions (any time, for any system)
What owns this? Where does the data live? Why did this creature do this? Why is this resource here? What changed this cell? What clock does this timer use? Can this save migrate? What does it cost per frame? How is it tested? Can the bug be reproduced from seed + coordinates?
