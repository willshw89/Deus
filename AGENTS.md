# AGENTS.md — Binding rules for every AI agent on this project

Applies to every AI agent working in this folder (Claude Code, Gemini, anything else). Read it at the start of every session, before touching anything.
If a rule here conflicts with your habits, this file wins. If it conflicts with something the user tells you directly, the user wins. Then record the change in `docs/VISION.md` → Decision log.

## Read order
1. `AGENTS.md` (this file)
2. `docs/STATUS.md`: what actually works, what's broken, who is working on what
3. `docs/AUDIT_LOG.md`: the latest audit entry and its open findings
4. `docs/SLICES.md`: the current slice and its acceptance criteria
5. `docs/VISION.md`: what the game is, locked decisions, rejected directions
6. `docs/ENGINE_RULES.md`: before touching code or data
7. `docs/ART_STANDARD.md`: before touching any image
8. `docs/systems/`: the documented API of any system you build on
9. `docs/ASSET_REQUESTS.md`: the art the engine needs, with specs (Gemini's work queue)

## The ten rules
1. **One slice at a time.** Work only on the slice marked `IN PROGRESS` in `docs/SLICES.md`. No bonus features, nothing extra "while I was in there". Ideas go to `docs/STATUS.md` → Backlog.
2. **Nothing is done until it's been seen working.** The Definition of Done below is the only one that counts.
3. **Never claim what you didn't observe.** "Verified", "working", "0 errors", "60 FPS" need evidence you produced and looked at in this session. If you didn't check, write "not checked".
4. **Tests must be able to fail.** No hardcoded success messages. A check that can never print FAIL is not a check. See `docs/ENGINE_RULES.md` §6.
5. **Look at every screenshot you produce.** Open the image, describe what's actually in it, and compare it to the acceptance criteria before the user sees anything. If it's wrong, fix it or report it as wrong.
6. **The user approves every slice and every art asset.** Stop at the gate. Don't start the next slice without an explicit "approved".
7. **Don't invent the game.** No new lore, place names, races, factions, or named characters unless they're approved in `docs/VISION.md`. Placeholder names start with `TEST_`.
8. **Ultima VII art may be used as examples and stand-ins; nothing copied ships.** (User decision 2026-09-18.) Stand-in files in `game/` must start with `U7_` (`$U7_Man.png`), use exactly 3× scale, and be listed in `docs/STATUS.md` → Stand-ins. They all get replaced with original art before any release. See `docs/GUIDE_25D.md` §2 and "Reference vs. shipped content" below.
9. **The engine core is read-only.** Never edit `game/js/rmmz_*.js`, `game/js/main.js`, or `game/js/libs/`. All behavior goes in `game/js/plugins/UF_*.js`.
10. **Two failed fixes means stop.** If the same problem survives two attempts, stop patching. Write down what you know and what you've ruled out, then ask the user.

## Definition of Done
A task is done only when all of these are true:
- [ ] It runs in the RMMZ editor's Playtest (F5), not only through a script.
- [ ] Its automated checks exist and pass, and you've seen each one able to fail.
- [ ] You took a screenshot of the relevant moment, opened it, and it matches the acceptance criteria.
- [ ] No new errors in the dev console (F8) while running the user test steps.
- [ ] `docs/STATUS.md` matches reality.

## Report format (end of every work session)
Use this structure. No marketing language, no emoji headings, no percentages of "operational".

```text
## What changed
- <file>: <one-line reason>

## How I tested it
- <commands / steps actually run>

## Evidence
- Screenshot <path>: <one sentence on what is visible in it>
- Log excerpt (copied from the real output, trimmed):

## Not done / known problems
- ...

## Try it in RMMZ
1. ...
Expected: ...

## Decisions needed
- ...
```

If "Not done / known problems" is empty, reread your evidence. It's almost never empty.

## Banned in reports
- "verified 100%", "fully operational", "production-ready", "seamless", "authentic" (about our own work)
- Any FPS figure without the measurement method (see `docs/ENGINE_RULES.md` §6)
- Describing an image you didn't open, or a file you didn't read
- Listing features that aren't in the code

## Reference vs. shipped content
| Location | What it is | Rule |
|---|---|---|
| `Ultima VII - * [GOG.com]/` | The original games | Read-only reference, and a source of **stand-in** art (rule 8): `U7_`-prefixed, 3×, listed in STATUS, replaced before release. |
| Root `Dwarf Fortress.exe`, `data/`, DLLs | The original game | Read-only reference for mechanics. Raws and text never go into `game/`. |
| `reference/` (create when needed) | Extracted frames, measurements, screenshots for study | Local only. Never loaded by the game. |
| `game/` | The RMMZ project | Original or properly licensed content, plus `U7_` stand-ins during development. |

Player-facing text never uses Ultima or DF proper nouns or signature terms (Avatar, Britannia, Guardian, Lord British, Iolo, Dupre, Shamino, Fellowship, moongate, Urist, Armok, "strange mood", "fey mood", …). It also never uses D&D product-identity creatures (beholder, mind flayer/illithid, displacer beast, githyanki, …). Generic fantasy is fine: elves, dwarves, goblins, trolls, dragons. If any text comes from the D&D SRD 5.1, it's CC-BY-4.0 and needs attribution in the game credits.

## Two agents, one project
Roles (set by the user 2026-09-18, revised the same day; this replaces the earlier split):
- **Claude Code: engine and features.** All code (`game/js/plugins/`, `tools/`, tests), the RMMZ data files, the guardrail docs, and **`docs/ASSET_REQUESTS.md`**: every piece of art the engine needs, with an exact spec. Claude Code checks each delivered asset against its spec before integrating it.
- **Gemini: art.** Makes the assets in `docs/ASSET_REQUESTS.md` to spec, following `docs/ART_STANDARD.md` and `docs/GUIDE_25D.md`, including U7 stand-ins. **Gemini doesn't edit code, tools, or `game/data/`.** If an asset needs an engine change, Gemini writes it under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.

Who touches what:
| Path | Owner |
|---|---|
| `game/js/`, `tools/`, `game/data/`, `run_tests.bat`, `docs/systems/` | Claude Code |
| `art/`, `game/img/` (new or replaced images), `docs/ASSET_REQUESTS.md` status column and Notes | Gemini |
| `docs/ASSET_REQUESTS.md` requests and specs, other `docs/` | Claude Code (either agent may add Notes) |

Rules:
- **Claim before you start.** Add a line under "In progress" in `docs/STATUS.md`: agent, task, files/folders you'll touch.
- Don't edit files another agent owns or has claimed. If you have to, ask the user first.
- **Commit at the end of every task** (the project is a git repo). Start the message with your agent name, e.g. `[gemini] AR-021 wild tree stand-ins`. One task per commit, so a review can diff exactly what changed.
- **Stage only your own files:** `git add <paths>`. Never `git add -A`, `git add .`, or `git commit -a`, which sweep the other agent's unfinished work into your commit.
- Remove your claim when you report.

## Reviews and audits
- Claude Code checks every asset delivery against its request and ART_STANDARD §8, and records the result in the request's status (`CHECKED`, or back to `IN PROGRESS` with the reason). Bigger problems go in `docs/AUDIT_LOG.md`: numbered findings graded **BLOCKER / MAJOR / MINOR**.
- Findings cite evidence: a file and line, a screenshot the reviewer opened, or a command's output. "Looks wrong" isn't a finding.
- Before starting, read the latest audit entry. Open findings in your area come before new work.

## RMMZ editor safety
The RMMZ editor keeps the database and plugin list in memory and overwrites the files when it saves.
- Before changing `game/data/*.json` or `game/js/plugins.js`, confirm with the user that the editor is closed.
- After changing them, tell the user to reopen the project.

## Dates
Use absolute dates (2026-09-18), never "today" or "yesterday", in every doc.
