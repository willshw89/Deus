# AGENTS.md — Binding rules for every AI agent on this project

Applies to every AI agent working in this folder (Claude Code, Gemini, anything else). Read it at the start of every session, before touching anything.
If a rule here conflicts with your habits, this file wins. If it conflicts with something the user tells you directly, the user wins. Then record the change in `docs/VISION.md` → Decision log.

## Read order
1. `AGENTS.md` (this file)
2. `docs/STATUS.md`: what actually works, what's broken, who is working on what
3. `docs/SLICES.md`: the current slice and its acceptance criteria
4. `docs/VISION.md`: what the game is, locked decisions, rejected directions
5. `docs/ENGINE_RULES.md`: before touching code or data
6. `docs/ART_STANDARD.md`: before touching any image

## The ten rules
1. **One slice at a time.** Work only on the slice marked `IN PROGRESS` in `docs/SLICES.md`. No bonus features, nothing extra "while I was in there". Ideas go to `docs/STATUS.md` → Backlog.
2. **Nothing is done until it's been seen working.** The Definition of Done below is the only one that counts.
3. **Never claim what you didn't observe.** "Verified", "working", "0 errors", "60 FPS" need evidence you produced and looked at in this session. If you didn't check, write "not checked".
4. **Tests must be able to fail.** No hardcoded success messages. A check that can never print FAIL is not a check. See `docs/ENGINE_RULES.md` §6.
5. **Look at every screenshot you produce.** Open the image, describe what's actually in it, and compare it to the acceptance criteria before the user sees anything. If it's wrong, fix it or report it as wrong.
6. **The user approves every slice and every art asset.** Stop at the gate. Don't start the next slice without an explicit "approved".
7. **Don't invent the game.** No new lore, place names, races, factions, or named characters unless they're approved in `docs/VISION.md`. Placeholder names start with `TEST_`.
8. **Only original content goes in `game/`.** Ultima VII and Dwarf Fortress files are reference only. No extracted sprites, palettes, text, or raws in anything that ships. See "Reference vs. shipped content" below.
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
| `Ultima VII - * [GOG.com]/` | The original games | Read-only reference: measure proportions, perspective, UI behavior. Nothing copied into `game/`. |
| Root `Dwarf Fortress.exe`, `data/`, DLLs | The original game | Read-only reference for mechanics. Raws and text never go into `game/`. |
| `reference/` (create when needed) | Extracted frames, measurements, screenshots for study | Local only. Never loaded by the game. |
| `game/` | The RMMZ project | Only original or properly licensed content. |

Player-facing text never uses Ultima or DF proper nouns or signature terms (Avatar, Britannia, Guardian, Lord British, Iolo, Dupre, Shamino, Fellowship, moongate, Urist, Armok, "strange mood", "fey mood", …). It also never uses D&D product-identity creatures (beholder, mind flayer/illithid, displacer beast, githyanki, …). Generic fantasy is fine: elves, dwarves, goblins, trolls, dragons. If any text comes from the D&D SRD 5.1, it's CC-BY-4.0 and needs attribution in the game credits.

## Two agents, one project
- **Claim before you start.** Add a line under "In progress" in `docs/STATUS.md`: agent, task, files/folders you'll touch.
- Don't edit files another agent has claimed. If you have to, ask the user first.
- Remove your claim when you report.
- Default split (the user can change it): **Claude Code** owns plugin code, tools, tests, and RMMZ data files. **Gemini** owns image generation and first-pass art review. Either may edit docs.

## RMMZ editor safety
The RMMZ editor keeps the database and plugin list in memory and overwrites the files when it saves.
- Before changing `game/data/*.json` or `game/js/plugins.js`, confirm with the user that the editor is closed.
- After changing them, tell the user to reopen the project.

## Dates
Use absolute dates (2026-09-18), never "today" or "yesterday", in every doc.
