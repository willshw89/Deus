# Lane Brief: lane-cv (ART.PRUNE.MEADOW_A2)

## Objective
Synthesize the Set 0 meadow A2 Owner review contact board under `tasks/ART.PRUNE.MEADOW_A2/lane-cv/` ONLY per Owner Directives and PM rulings (MSG-PRUNE-PM-040, MSG-PRUNE-PM-043):
- **Strict Isolation:** ZERO edits in `game/`. No changes to `game/img/tilesets/`, `game/data/`, or runtime plugins.
- **Source:** Owner's `art/masters/owner/2026-09-29_biome/` Set 0 (`variant_0.png` through `variant_5.png` / `set_0_tiles.zip`).
- **Deliverables:**
  1. Synthesis script: `tasks/ART.PRUNE.MEADOW_A2/lane-cv/synthesize_meadow_board.js`
  2. Synthesized Owner contact board: `tasks/ART.PRUNE.MEADOW_A2/lane-cv/meadow_set0_a2_board.png`
  3. Manifest: `tasks/ART.PRUNE.MEADOW_A2/lane-cv/manifest.md`
  4. Test suite: `tasks/ART.PRUNE.MEADOW_A2/lane-cv/test_meadow_board.js` (validates board dimensions, PNG integrity, zero `game/` modifications, and failure on negative mutant `--mutant=missing_board`).

## Governance
- Writer: `gemini` (Google)
- Reviewer: `grok` (xAI)
- Branch: `task/lane-cv`
- Allowed Paths: `tasks/ART.PRUNE.MEADOW_A2/lane-cv/**`
