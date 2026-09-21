# AGENTS.md — Binding rules for every AI agent on Project DEUS

Project formal name: **DEUS** (formally renamed by user directive 2026-09-20; replaces working titles "UF", "Ultima Frontier", and "Wayfarer").
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

## The thirteen binding rules
1. **One slice at a time.** Work only on the slice marked `IN PROGRESS` in `docs/SLICES.md`. No bonus features, nothing extra "while I was in there". Ideas go to `docs/STATUS.md` → Backlog.
2. **Nothing is done until it's been seen working.** The Definition of Done below is the only one that counts.
3. **Never claim what you didn't observe.** "Verified", "working", "0 errors", "60 FPS" need evidence you produced and looked at in this session. If you didn't check, write "not checked".
4. **Tests must be able to fail.** No hardcoded success messages. A check that can never print FAIL is not a check. See `docs/ENGINE_RULES.md` §6.
5. **Look at every screenshot you produce.** Open the image, describe what's actually in it, and compare it to the acceptance criteria before the user sees anything. If it's wrong, fix it or report it as wrong.
6. **The user approves every slice and every art asset.** Stop at the gate. Don't start the next slice without an explicit "approved".
7. **Don't invent the game.** No new lore, place names, races, factions, or named characters unless they're approved in `docs/VISION.md`. Placeholder names start with `TEST_`.
8. **Ultima VII art may be used as examples, stand-ins, style references and training data for our art generators; everything that ships is our own original work.** (User decisions 2026-09-18 and 2026-09-19; the user accepted the risk of training on it.) No shipped asset may be a copy, trace, recolour, crop or near-copy of a U7 image: every delivered asset passes `tools/originality_check.js` against the U7 shape library before it goes into `game/`. Stand-in files in `game/` must start with `U7_` (`$U7_Man.png`), use exactly 3× scale, and be listed in `docs/STATUS.md` → Stand-ins. They all get replaced with original art before any release. See `docs/GUIDE_25D.md` §2 and "Reference vs. shipped content" below.
9. **The engine core is read-only.** Never edit `game/js/rmmz_*.js`, `game/js/main.js`, or `game/js/libs/`. All behavior goes in `game/js/plugins/UF_*.js`.
10. **Two failed fixes means stop.** If the same problem survives two attempts, stop patching. Write down what you know and what you've ruled out, then ask the user.
11. **All generation tasks are to utilize Google Nano Banana Pro.** (User decisions 2026-09-19: "Nano Banana Pro: The Gemini 3 Pro Image model (gemini-3-pro-image). The premium choice for complex visual tasks, utilizing advanced reasoning (\"Thinking\") to follow complex instructions, maintain brand consistency, and render high-fidelity text. REWRITE EVERYTHING TO USE NANO BANANA PRO NOT NANO BANANA II".) Every visual asset across every category (characters, creatures, wildlife, monsters, terrain, tilesets, autotiles, world objects, items, equipment layers, portraits, facesets, icons, and UI) MUST originate from Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`). Nano Banana Pro utilizes advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity visual assets. No other generator model is allowed, and no agent is permitted to type in sprites pixel-by-pixel in code. Everything starts from an authentic Nano Banana Pro generation, processed into RMMZ standard formats via our palette and cleaning tools.
12. **All animation must happen through the sprite; no after-effect animations.** (User decisions 2026-09-19: "The animation for these things should come from the sprites, not an after effect. this applies to everything we generate" and "Also, ENFORCE THAT ALL ANIMATION IS TO HAPPEN THROUGH THE SPRITE. NO AFTER EFFECT ANIMATIONS"; VISION V108.) All animations across every entity and environmental feature—humanoids, wildlife, monsters, trees, flora, crops, fire, campfires, water ripples, doors, workshops, and world objects—must be delivered and played as distinct pixel sprite animation frames on the sprite sheets (e.g. 8-direction walk/action cycles, multi-frame wind sway, flickering flame loops, rippling water waves). No animation is to be faked or produced using code-driven after-effects, procedural scaling/squashing, sine-wave swaying, rotation, or shader distortions. The engine draws no motion of its own.
13. **Continuous Nano Banana Pro Non-Living Asset Production Pipeline with DF Black Wall-Top Convention & Strict Living Exclusion.** (User directive 2026-09-21):
    - *Autonomous Non-Living Pipeline:* Whenever current implementation requires NON-LIVING artwork (walls, doors, terrain, flora, crops, furniture, workshops, machinery, items, effects), agents continuously identify those needs, batch them aggressively into packed character/sprite sheets (80–100% useful area), prompt Nano Banana Pro with explicit slot maps, process approved results, integrate them into the project, log them in `docs/ASSET_MANIFEST.md`, and verify them in context. DO NOT wait for the user to manually request individual non-living assets.
    - *Absolute Exclusion of Living Beings:* This autonomous pipeline DOES NOT apply to living beings (humans, colonists, humanoids, animals, wildlife, monsters, creatures, living portraits, living character sprites/animation sheets). When living assets are needed, register the requirement in `docs/ASSET_REQUESTS.md` / `docs/STATUS.md`, but do NOT generate autonomously.
    - *Dwarf-Fortress-Style Black Wall-Top Convention:* For TWO-GRID-HIGH walls, doors, gates, cliff-adjacent elements, and vertical architectural pieces (48×96 px), the upper 48 px cap MUST read as flat near-black (`#08080C` to `#121218`) with minimal edge definition for readability, creating an unbroken horizontal black occlusion line connecting with DEUS void and darkness language. The lower 48 px displays the authentic material face. The black cap is an architectural/occlusion convention, not a dynamic shadow. Follow `docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md` for all prompts.


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
| `Ultima VII - * [GOG.com]/` | The original games | Read-only reference; a source of **stand-in** art (rule 8: `U7_`-prefixed, 3×, listed in STATUS, replaced before release); and **style references and training data** for our art generators (2026-09-19). Exported training material lives in `reference/` only (local, never committed, never loaded by the game). |
| Root `Dwarf Fortress.exe`, `data/`, DLLs | The original game | Read-only reference for mechanics. Raws and text never go into `game/`. |
| `reference/` (create when needed) | Extracted frames, measurements, screenshots for study | Local only. Never loaded by the game. |
| `game/` | The RMMZ project | Original or properly licensed content, plus `U7_` stand-ins during development. |

Player-facing text never uses Ultima or DF proper nouns or signature terms (Avatar, Britannia, Guardian, Lord British, Iolo, Dupre, Shamino, Fellowship, moongate, Urist, Armok, "strange mood", "fey mood", …). It also never uses D&D product-identity creatures (beholder, mind flayer/illithid, displacer beast, githyanki, …). Generic fantasy is fine: elves, dwarves, goblins, trolls, dragons. If any text comes from the D&D SRD 5.1, it's CC-BY-4.0 and needs attribution in the game credits.

## Agents and collaboration
Roles (updated by user directive 2026-09-20; establishes unified full-stack capability):
- **Gemini / Antigravity**: Full-stack systems engineering, plugin architecture (`game/js/plugins/`), automated test harnesses (`tools/`), data schemas (`game/data/`), and original art production via Google Nano Banana Pro (`art/`, `game/img/`).
- **Claude Code**: Systems engineering, engine plugins, automated test suites, data catalogs, and asset integration review.

Who touches what:
| Path | Owner |
|---|---|
| `game/js/`, `tools/`, `game/data/`, `run_tests.bat`, `docs/systems/` | Gemini & Claude Code (collaborative / task-claimed) |
| `art/`, `game/img/` (new or replaced images), `docs/ASSET_REQUESTS.md` | Gemini & Claude Code |
| `docs/` | Gemini & Claude Code |

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
