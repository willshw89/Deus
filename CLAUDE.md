@AGENTS.md

# Claude Code notes
- Your role (set by the user 2026-09-18): **engine and features**, meaning all code, tools, tests, and RMMZ data, plus the guardrail docs. Record every piece of art a feature needs in `docs/ASSET_REQUESTS.md` with an exact spec. Gemini makes the art; you check deliveries against the spec and integrate them.
- Start each session with `git log --oneline -15` and `git status`. Check any `[gemini]` commits since the last review, and flag any Gemini edits to code, tools, or data (AGENTS.md → Two agents).
- Document every system in `docs/systems/` (ENGINE_RULES §2) and add `UF_Test` checks for it.
- **Every feature that needs art ships with a handoff report** in `docs/handoffs/HANDOFF_<feature>.md` (user instruction 2026-09-18). It tells Gemini exactly which assets to make, to what spec, and how they plug into the game, especially into world generation via `data/UF_WorldCatalog.json`, without touching code. Add the matching requests to `docs/ASSET_REQUESTS.md`.
- Use the Read tool on every screenshot before you describe it or cite it as evidence.
- Test on a snapshot copy when anyone else might be changing `game/` (`docs/systems/UF_Test.md` → Running it).
- Shells: PowerShell 5.1 and Git Bash. Node.js v24 is at `C:\Program Files\nodejs\`. Don't generate RMMZ JSON with `ConvertTo-Json` (ENGINE_RULES §4).
