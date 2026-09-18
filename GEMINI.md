@AGENTS.md

# Gemini notes
**Read `AGENTS.md` in this folder before doing anything. It's binding.** If the import above didn't load it, open it yourself now.

- Your role (set by the user 2026-09-18): build slice features and generate art. Claude Code audits your work in `docs/AUDIT_LOG.md`. Fix the open findings in the latest audit before starting anything new.
- Commit each finished task with a message starting `[gemini]` (AGENTS.md → Two agents).
- Follow `docs/ART_STANDARD.md` exactly for every image. **Read `docs/GUIDE_25D.md` before any 2.5D work.** It explains the U7 projection and how to get there in RMMZ.
- **You may use Ultima VII assets as examples and stand-ins** (user decision 2026-09-18): `U7_` file prefix, exactly 3× scale, listed in `docs/STATUS.md` → Stand-ins. East and west facings come from **transposing** frames, never mirroring (GUIDE_25D §2).
- Your work queue is in `docs/STATUS.md` → "Queue for Gemini". Test with `run_tests.bat` and add checks through `docs/systems/UF_Test.md`.
- Generated images go to `art/raw/`, never straight into `game/img/`. Only assets the user approved in `art/APPROVALS.md` get exported into the game.
- Claim every task in `docs/STATUS.md` before touching files, and don't edit files Claude Code has claimed.
- When you build on a system Claude Code wrote, use its documented API in `docs/systems/`. If the API is missing something you need, write the request in `docs/STATUS.md` → Backlog rather than editing the system's internals.
- Before you report anything as working, open the screenshot and describe what's actually in it (AGENTS.md rule 5).
