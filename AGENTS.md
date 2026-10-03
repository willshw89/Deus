# AGENTS.md: the only rulebook for Project DEUS

Project: **DEUS**, a colony sim built on RPG Maker MZ (formal name since 2026-09-20; replaces "UF", "Ultima Frontier", "Wayfarer").
Repository: `willshw89/Deus`. This file applies to every AI agent (Codex, Claude, Grok, Gemini, Deus/Grok Bot, anything else). Read it at the start of every session.
`CLAUDE.md`, `GEMINI.md` and `.clinerules` only point here. Older role files (`docs/CANONICAL_ROLES.md`, `.agents/rules/*.md`, `tools/ops/ANTIGRAVITY.md`) are superseded wherever they conflict with this file. If this file conflicts with a direct Owner instruction, the Owner wins; record the ruling in `docs/DECISIONS.md`.

**Current priority (Owner, 2026-10-02): get the world loading green.** See `docs/WBS_ORG.md` (active: ORG-0.1, ORG-0.2, ORG-1.1, ORG-1.2, ORG-4.2). WBS-SIM and WBS-SPLIT are parked. Do not start other work. Index of all plans: `docs/WBS_INDEX.md`.

## 1. Team

| Who | Role |
|---|---|
| **Owner** | Approves scope, design decisions and merges. Only the Owner opens new lanes, changes priorities, or approves force-push, deletion, test retirement or history rewrite. |
| **Codex** (PM) | Runs on the strongest OpenAI single agent at its highest effort. Writes lane briefs, picks the 1–3 GitHub references, assigns writer and reviewer, tracks the WBS. Does not self-certify. |
| **Claude** | Writes the hard lanes (engine, simulation, worldgen logic, anything with subtle state). |
| **Grok** | Writes the mechanical lanes (CI, tooling, hygiene, well-specified refactors). |
| **Gemini** | Writer only, for narrow lanes that come with references. Reached only through the Owner's relay; agents do not launch or message Gemini directly. |
| **Deus / Grok Bot** | Independent claim checker. Checks each completion claim (branch, SHA, call sites, RESULT lines) against the repo and returns CONFIRMED / PARTIAL / FALSE. PARTIAL or FALSE holds the merge regardless of review. |

## 2. Review

- Review is always done by a **different model family** than the writer. No self-review, no same-family certification.
- Reviewers **grep for real call sites** (the new code is actually called from the game or test path, not only defined) and **run the tests themselves**. Reading the diff alone is not a review.
- A merge needs: passing tests, a cross-family PASS review, and a CONFIRMED Deus claim check, then the Owner's merge.

## 3. Lane rules

1. **Small lanes.** 1–2 files ideally. One or two lanes at a time. No swarms, no multi-agent "teamwork" modes, no parallel lanes that share files.
2. **A lane is NOT done** until the writer pastes the passing `run_tests.bat` RESULT line, the branch name and the full commit SHA (visible on origin). Reports without these are rejected.
3. **No direct pushes to `main`. PRs only.** The Owner merges.
4. **No force-push and no deletion** (files, branches, tags, stashes, worktrees) without the Owner's OK. Move with `git mv` instead of deleting.
5. **Scripts live only under `tools/`** (permanent, reviewed) **or `scratchpad/<lane-id>/`** (throwaway, gitignored). Never in the repo root. CI (`tools/ci/check_root.js`) fails if a `.js`, `.png` or `.zip` appears in the root.
6. **Every brief cites 1–3 GitHub reference repos** (exact files/functions the PM opened). The writer reads them first and maps new code to them in the report. **No GPL/AGPL code copying.** Permissive-licence adaptation needs attribution.
7. **Race bonuses come from SRD 5.1 only.** Never invent race bonuses. **Racial/cultural backgrounds replace SRD Background and the earlier Profession design**, with skill/tool proficiencies, one job edge and no extra ability-score bonuses. Homebrew racial feats and the ASI/feat choice at levels 4, 8, 12, 16, 19 are the Owner-approved design exception (2026-10-02 21:56-22:15 CT; `docs/DECISIONS.md` D-2026-10-02-9). Details remain proposals until Owner approval; implementation stays gated on ORG-0.2 green and DEC-037.
8. **Never loosen a test to make it pass.** Fix the cause. If a test is genuinely wrong, write the reason and get the Owner's OK before changing or retiring it.
9. **Two failed fixes means stop.** Write down what you know and what you ruled out, then ask.
10. **Stage only your own files** (`git add <paths>`; never `git add -A`, `git add .`, `git commit -a`). Commit messages start with a lane tag, e.g. `[org-0.2] ...`.
11. Work in a worktree on a lane branch, not in the main checkout. Main is touched only by merges.

## 4. Freeze: DEC-037 natural world only

The active milestone is the natural world: Physical Space -> Physical Matter -> Water -> Geomorphology -> Climate -> Flora -> Fauna (fauna = seeded rule-based spawner, DEC-073; soil deferred, DEC-057). **No civilization, farming, faction or society implementation.** Don't invent lore, place names, races, factions or named characters that aren't approved in `docs/VISION.md`; placeholders start with `TEST_`.

## 5. Protected paths and items

Never edit, move, delete or commit changes to these without the Owner's explicit OK:
- Engine core: `game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/`. Behaviour goes in plugins under `game/js/plugins/`.
- `art/sprites/`, `PROVIDER_USAGE_STATUS.json`, `.pixellab_token` (secret, never committed), `.env*`.
- Branch `backup/pre-rollback-gemini-swarm-2026-10-02`, every stash, other agents' worktrees and branches.
- Local untracked work you didn't create (prompts, telemetry, mailboxes, worker logs, saves, `reference/`, the Dwarf Fortress / Ultima VII installs in the project folder). Never `git clean`, never blanket-stage.
- RMMZ editor: it overwrites `game/data/*.json` and `game/js/plugins.js` when it saves. Before changing them make sure the editor is closed; afterwards tell the Owner to reopen the project.

## 6. Test procedure

- Run `run_tests.bat [suite]` from the root of your worktree (it runs `tools/run_tests.js`, which launches the Steam RMMZ `nw.exe` on that worktree's `game/`). Results: `game/test_output/results.txt`.
- The only result that counts is the `RESULT: <n> passed, <m> failed (exit <code>)` line. Exit 0 = all passed, 1 = failures, 2 = harness problem (no RESULT, crash, watchdog). "No RESULT line" is a failure, not a pass.
- Tests must be able to fail: no hardcoded success. Show that a new check can print FAIL.
- Never claim what you didn't observe. "Verified", "0 errors", "60 FPS" need evidence produced in this session; otherwise write "not checked". FPS/perf numbers need the measurement method.
- Open every screenshot you cite and describe what is actually in it.
- CI (`.github/workflows/ci.yml`, job `ci`) runs `tools/ci/syntax_check.js` and `tools/ci/check_root.js`. Run both locally before pushing.

## 7. Art rules

Authority: `docs/OWNER_DECISIONS.md` (DEC-007, 055, 056, 062, 063, 066, 069, 071, 072, 079, 085).
- **The Owner makes the art.** No agent generates art on its own initiative, with any tool. PixelLab work by the PM is only on the Owner's hand-off (DEC-007, DEC-063). No animations are being generated now.
- Before generating: the asset has its row in `art/catalogue/catalogue.json` and its prompt follows `docs/art/DEUS_ASSET_STANDARD.md` (the SOP, including pixel dimensions).
- What enters the game: the PM chooses (DEC-056) after machine QA (RMMZ format, seams, anchors, palette), with a "PM YEA (DEC-056)" row in `art/APPROVALS.md`. The Owner grades art in game and can reverse any choice (DEC-079). Style: "RMMZ reference, Ultima 7 style".
- All animation comes from sprite frames; the engine draws no procedural motion (no sine sway, squash, rotation or shader distortion).
- Ultima VII art may be used only as reference/stand-ins; everything that ships is original (no copy, trace, recolour or crop). Stand-ins in `game/` start with `U7_`, 3x scale, listed in `docs/STATUS.md`. Player-facing text uses no Ultima/DF/D&D product-identity names. SRD 5.1 text is CC-BY-4.0 and needs attribution in the credits.
- Allowed without the Owner (not art): test-harness PNG renders used as evidence, the art catalogue, blank template tilesets, placement and validation tooling.

## 8. Engineering standards (still binding)

`docs/ENGINEERING_STANDARD.md`, `docs/ARCHITECTURE.md`, `docs/ENGINE_RULES.md`: one source of truth per concept; data over hardcoding (catalogs in `game/data/`); no full-world scans every frame; small refactors over rewrites; stable persistent IDs; tagged time domains; versioned saves; observability via `UF_Sheet` / `UF_Look`. Don't generate RMMZ JSON with `ConvertTo-Json`.

## 9. Report format (every lane)

```text
Lane / task:      <id>
Branch:           <name>
Commit SHA:       <full SHA, pushed to origin>
Files changed:    <file>: <one-line reason>
New symbols:      <functions> and their existing callers
Test command:     <exact command>
RESULT:           <pasted RESULT line(s), copied from the real output>
Evidence:         <screenshot path: what is visible in it>
Not done / known problems / untested:
Decisions needed:
```

Banned in reports: "verified 100%", "fully operational", "production-ready", "seamless", describing an image you didn't open or a file you didn't read, listing features that aren't in the code. Use absolute dates (2026-10-02) in every doc.
