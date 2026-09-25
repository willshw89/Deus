# Task State: WG.00.11 — Standard New Game Year 0 Contract (INV-SIM-01)

- **Task ID:** `WG.00.11`
- **WBS ID:** `WG.00.11`
- **Role:** Writer: Fable / Gemini | Reviewer: Grok
- **Branch / Worktree:** `main` (`c:\Users\snewt\OneDrive\Desktop\UF`)
- **Last Commit:** `8d1c7c3`
- **Current Gate:** Lane B: ATK-YEAR0-001 (New Game defaults to Year 0).

## Owned File Set
- `game/js/plugins/DEUS_FactionMenus.js`
- `tools/test_new_game_year0.js`
- `tasks/WG.00.11/*`

## What is Done (with Evidence)
1. **Engine Default Fix**:
   - `game/js/plugins/DEUS_FactionMenus.js` line 347: `this._year = 0;` (was 1).
   - Line 280: `onNewGameEmbark` fallback year is `0` (was 1).
   - Lines 558, 563: User text entry and blur handler clamp to `Math.max(0, val)`.
   - Line 1091: `changeYear` delta clamped to `Math.max(0, ...)`.
   - Line 1579: Internal self-test updated to `default_year_0`.
2. **Dedicated Verification Suite**:
   - `tools/test_new_game_year0.js` created and executed.
   - Proves `Window_NewGameSetup.currentYear() === 0`.
   - Proves `UF.NewGameSetup.year === 0` on untouched embark.
   - Proves fallback year is 0 when setup window is null.
   - Rule 4 mutant check catches mutant restoring default 1 (2 failures triggered).
   - Result: ALL CHECKS PASSED (exit 0).
3. **Commit**: Committed to `main` in `8d1c7c3`.

## Exact Next Step
- Grok independent adversarial review and closure signature for `ATK-YEAR0-001`.

## Open Defects / Questions
- `ATK-YEAR0-001`: OPEN, fix committed in `8d1c7c3`, awaiting Grok closure.

## Relevant Commands
```bash
node tools/test_new_game_year0.js
```
