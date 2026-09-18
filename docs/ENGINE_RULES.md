# ENGINE RULES: RMMZ technical guardrails

## 1. Environment (checked 2026-09-18)
- RPG Maker MZ **v1.10.0** is at `C:\Program Files (x86)\Steam\steamapps\common\RPG Maker MZ\` (`RPGMZ.exe`, `nwjs-win\nw.exe`).
- Project file: `game/game.rmmzproject`.
- Shells: Windows PowerShell 5.1 and Git Bash.
- Git is installed, but the project isn't a repo yet.
- Node.js is **not installed.** Python is **not installed** (`python` is only the Microsoft Store stub).
- The folder is inside **OneDrive**. Fast file changes can produce OneDrive "-conflict" copies, so pause sync during heavy work.
- The project root is also the Dwarf Fortress install. The two U7 installs are subfolders.

## 2. The engine stays stock
- Never edit `game/js/rmmz_*.js`, `game/js/main.js`, or `game/js/libs/`.
- All behavior lives in `game/js/plugins/UF_*.js`: one system per plugin, with the standard MZ header (`@target MZ`, `@plugindesc`, `@help`, and `@base`/`@orderAfter` for dependencies).
- Patch core methods by aliasing them and calling the original. If a plugin has to replace a core method outright, list it under "Replaced core methods" in that plugin's `@help`.
- Use one global namespace: `window.UF`.
- All simulation state saves and loads through RMMZ's save system. Every slice's checks include save, load, and confirming the state is identical.
- Node APIs (`require('fs')` and the like) are allowed only in test and debug code, behind `Utils.isNwjs()`.
- Any change to `game/index.html` or `game/package.json` gets a line in `docs/STATUS.md` explaining why.

## 3. The RMMZ editor overwrites files
The editor keeps the database and plugin list in memory and writes them out when it saves.
- Before an agent changes `game/data/*.json` or `game/js/plugins.js`, the editor has to be closed. Ask the user.
- Afterward, tell the user to reopen the project.
- After any data change, the project must still open in the editor and start in Playtest without errors.

## 4. Data file facts
- **Don't use `ConvertTo-Json` on RMMZ data.** In PowerShell 5.1 it silently cuts off anything nested deeper than 2 levels by default, and it unwraps one-item arrays. It already broke `Map002.json` once. Use Node once it's installed; until then, don't generate RMMZ data from PowerShell.
- Map `data` array: index = `(z * height + y) * width + x`. z 0–3 are tile layers, 4 is shadows, 5 is region IDs. Length must be exactly `width × height × 6`.
- Tile ID ranges: B 0–255 · C 256–511 · D 512–767 · E 768–1023 · A5 1536–1663 · A1 2048–2815 · A2 2816–4351 · A3 4352–5887 · A4 5888–8191.
- Autotile ID = range start + kind × 48 + shape. Shape 0 is the interior (fully surrounded) piece, so 2816 is A2 kind 0's interior, not an edge piece.
- Tile size is `$dataSystem.tileSize` (Database → System 2), default 48. The engine supports it (`rmmz_objects.js:6124`). Screen size is set in the same tab.
- Character image names: a `$` prefix means one character per file (3×4 frames); no prefix means 8 characters per file; `!` marks an object (no 6 px upward shift). Rows are down, left, right, up. RMMZ itself only displays 4 facings.

## 5. Runtime-generated world [PROPOSED: confirm in Slice 0]
- The world is generated at runtime from a seed and stored in the save file, not baked into `MapXXX.json`. Map JSON is only for fixed places (the starting glade, test maps).
- The RMMZ "player" becomes an invisible camera/cursor. Once there are more than a handful of units, they're UF entities rather than RMMZ events.
- The simulation runs on a fixed tick, separate from rendering. Pathfinding work is spread across frames.

## 6. Testing: checks that can fail
The current `run_autotest.bat` and the autotest block in `UF_Core.js` break these rules. Their output is not evidence (see `docs/STATUS.md`).

- Autotest mode turns on only for the exact argument `--autotest`. RMMZ's Playtest launches the game with `test`, so a loose match hijacks normal playtests.
- Every check goes through one helper, `UF.Test.check(name, condition, detail)`, which prints `PASS <name>` or `FAIL <name>: <detail>`.
- The last line is computed from the checks: `RESULT: <n> passed, <m> failed`. Any failure means a non-zero exit code.
- **Banned:** any log line that announces success without a condition behind it.
- Check what the player would see, not internal flags: the sprite exists, its bitmap loaded, it's visible and not transparent, it's on screen, and it's at the expected pixel position. "Window opened: true" by itself is not a check.
- Each acceptance criterion in `docs/SLICES.md` maps to a named check, or is marked "user-only" when a script can't judge it.
- Visual criteria produce a screenshot at `test_output/<slice>/<check>.png`, and the agent opens every one.
- Tests use a fixed seed so runs repeat exactly.
- A performance number needs a method: average and worst frame time over at least 30 seconds, how many units were on screen, and on which machine.
- The final test is always the user running Playtest in the RMMZ editor.

## 7. Git (once it's set up)
- `.gitignore` covers the U7 installs, the DF files at the root, `reference/`, and `test_output/`.
- Commit after each approved slice and tag it `slice-N-approved`.
- Commit before risky changes, so a bad attempt can be thrown away cleanly.
