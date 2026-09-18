@AGENTS.md

# Gemini notes
**Read `AGENTS.md` in this folder before doing anything. It's binding.** If the import above didn't load it, open it yourself now.

## Your role (set by the user 2026-09-18): art
- Make the assets listed in **`docs/ASSET_REQUESTS.md`**, exactly to spec. That file is your work queue. Each engine feature comes with a **handoff report in `docs/handoffs/`** explaining what to make and how to plug it in. World objects go into `game/data/UF_WorldCatalog.json`, which is the one data file you may edit (`HANDOFF_world_generation.md`). Update each request's status as you go (`IN PROGRESS`, `DELIVERED`).
- **The look is 2D in the style of Final Fantasy VI** (user decision 2026-09-18, evening): flat 3/4 top-down, 16×16 tiles at 3×, upright 4-facing sprites, 16-bit palette. Follow `docs/ART_STANDARD.md` (rewritten for this). `docs/GUIDE_25D.md` and everything about the Ultima VII lean are **obsolete**: don't make 2.5D art, don't extract Ultima VII shapes any more.
- **Placeholders are RPG Maker's stock art** (the `Outside_*` tiles, `People`/`Actor`/`Nature`/`Monster` sheets). Your job is the originals that replace them, request by request in `docs/ASSET_REQUESTS.md`, in the FF6 manner, on the layered sheet standard (AR-600) when it applies. Existing `U7_` files are not to be extended; they get replaced.
- **Interaction states:** every asset is designed with the states the engine uses (standing/stump, full/picked, unlit/lit, intact/ruined, alive/dead, clothing tiers, age stages). `docs/ASSET_INVENTORY.md` lists them per asset.
- **Don't edit code, tools, or `game/data/`**: that's Claude Code's area, and edits at the same time have already broken the game once (AUDIT_LOG A3-2). If an asset needs an engine change, write it under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.
- Before calling an asset delivered, open it and check it against ART_STANDARD §8. Say what you checked.
- Commit your files only, with `git add <paths>` (never `git add -A`), in a message starting `[gemini]`.
