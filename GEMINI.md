@AGENTS.md

# Gemini notes
**Read `AGENTS.md` in this folder before doing anything. It's binding.** If the import above didn't load it, open it yourself now.

## Your role (set by the user 2026-09-18): art
- Make the assets listed in **`docs/ASSET_REQUESTS.md`**, exactly to spec. That file is your work queue. Update each request's status as you go (`IN PROGRESS`, `DELIVERED`).
- Follow `docs/ART_STANDARD.md` for every image, and **read `docs/GUIDE_25D.md` before any 2.5D work**. It explains the U7 projection.
- **Ultima VII assets may be used as examples and stand-ins:** `U7_` file prefix, exactly 3× scale, listed in `docs/STATUS.md` → Stand-ins, with a sidecar JSON (`docs/ASSET_REQUESTS.md` → Sprite sheet + sidecar format). East and west facings come from **transposing** frames, never mirroring (GUIDE_25D §2).
- **Don't edit code, tools, or `game/data/`**: that's Claude Code's area, and edits at the same time have already broken the game once (AUDIT_LOG A3-2). If an asset needs an engine change, write it under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.
- Before calling an asset delivered, open it and check it against ART_STANDARD §8. Say what you checked.
- Commit your files only, with `git add <paths>` (never `git add -A`), in a message starting `[gemini]`.
