> **ART RULES: live summary.** Authority is `docs/OWNER_DECISIONS.md` (DEC-007, 055, 056, 062, 063, 066, 069, 071, 072, 079, 085); the long banners that stood here are retired.
>
> - **Who makes art.** The Owner generates all art; no agent generates on its own initiative, with any tool. The PM's PixelLab work is the Owner's hand-off (DEC-007, DEC-063): Pixflux and Bitforge for the natural world, the character creator for the fauna (v3 for humanoid shapes, Pro for animals and other bodies, DEC-071). No animations. AGENTS.md Rules 11 and 13 stay suspended.
> - **Before generating.** The asset has its row in `art/catalogue/catalogue.json`, and its prompt follows `docs/art/DEUS_ASSET_STANDARD.md` (the SOP), which includes the pixel dimensions.
> - **What enters the game.** The PM chooses (DEC-056), after machine QA (RMMZ format, seams, anchors, palette; a size mismatch does not hold art back, DEC-016 amendment) and with a "PM YEA (DEC-056)" row in `art/APPROVALS.md`. The art council is suspended and the Owner grades art in game (DEC-079); the Owner can reverse any choice. Style: "RMMZ reference, Ultima 7 style"; keep the world varied but readable.
> - **Obsolete instructions.** The originality check is deleted (DEC-061, DEC-085). A doc line that tells you to run it, or to run `tools/originality_check.js`, is obsolete: originality is controlled by how the art is made (our own prompts, guides and swatches; never a copy, trace, recolour or crop of a U7 image).
> - **Allowed without the Owner (not art):** test-harness PNG renders used as evidence, the art catalogue, blank template tilesets, and placement and validation tooling.

# AGENTS.md — Binding rules for every AI agent on Project DEUS

Project formal name: **DEUS** (formally renamed by user directive 2026-09-20; replaces working titles "UF", "Ultima Frontier", and "Wayfarer").
Applies to every AI agent working in this folder (Claude Code, Gemini, anything else). Read it at the start of every session, before touching anything.
If a rule here conflicts with your habits, this file wins. If it conflicts with something the user tells you directly, the user wins. Then record the change in `docs/VISION.md` → Decision log.

## Persistent orchestration rules (Owner request, 2026-09-28)

**Owner update, 2026-10-02:** follow the [MODEL FALLBACK / CROSSLOAD SOP](docs/ops/USAGE.md#model-fallback--crossload-sop) for staffing, outage checkpoints, handoffs, reviewer pairing and completion reports. Codex is PM; hard lanes use Claude at top effort and the strongest available different-family reviewer; Gemini is narrow-scope writing only via Owner handoff. No direct commits to main. Newer explicit Owner instructions override conflicting older routing rules below.

Read these rules at every session start, including through non-Antigravity providers:
- `.agents/rules/deus-governance.md`: DEC-007, Owner approval before any new WBS leaf/lane or scope expansion, engine-core protection, and existing lane/worktree isolation.
- `.agents/rules/deus-review-policy.md`: zero self-certification, independent model-family review, evidence before closure, and mandatory `merge_gate` / `--no-ff` integration.
- `.agents/rules/deus-natural-world.md`: DEC-037 Natural World phase lock and the lean upstream-first critical path; civilization/farming/faction implementation remains frozen.
- `.agents/rules/deus-multiagent-routing.md`: quality-preserving failover, protected local files, and bounded Teamwork/Goal operation.
- `.agents/rules/deus-game-translation.md`: mandatory code-to-game traceability, named consumers, bridge status, and separate headless/playable proof. Templates: `tools/ops/GAME_TRANSLATION_TEMPLATE.md`.

The practical procedure and launch templates are in `tools/ops/ANTIGRAVITY.md`. This supplement records the Owner's current orchestration request; it does not open a task lane, change WBS status, or grant self-review/merge authority. Current explicit Owner instructions and recorded freezes override older role descriptions and autonomous art mandates in this file, `GEMINI.md`, or other guides. Continue only already approved work; preserve existing lanes and their local files. The setup changes remain working-copy configuration pending independent review and normal integration, not a self-certified completion.

## Read order
1. `AGENTS.md` (this file)
2. `docs/STATUS.md`: what actually works, what's broken, who is working on what (current state; historical ledger archived in `docs/archive/STATUS_LEDGER_20260925.md`)
3. `docs/AUDIT_LOG.md`: the latest audit entry and its open findings
4. `docs/SLICES.md`: the current slice and its acceptance criteria
5. `docs/VISION.md`: what the game is, locked decisions, rejected directions
6. `docs/ENGINE_RULES.md`: before touching code or data
7. `docs/art/DEUS_ASSET_STANDARD.md` (the SOP, DEC-007): before touching any image
8. `docs/systems/`: the documented API of any system you build on
9. `docs/ASSET_REQUESTS.md`: the art the engine needs, with specs (Gemini's work queue)

## The fourteen binding rules
1. **One slice at a time.** Work only on the slice marked `IN PROGRESS` in `docs/SLICES.md`. No bonus features, nothing extra "while I was in there". Ideas go to `docs/STATUS.md` → Backlog.
2. **Nothing is done until it's been seen working.** The Definition of Done below is the only one that counts.
3. **Never claim what you didn't observe.** "Verified", "working", "0 errors", "60 FPS" need evidence you produced and looked at in this session. If you didn't check, write "not checked".
4. **Tests must be able to fail.** No hardcoded success messages. A check that can never print FAIL is not a check. See `docs/ENGINE_RULES.md` §6.
5. **Look at every screenshot you produce.** Open the image, describe what's actually in it, and compare it to the acceptance criteria before the user sees anything. If it's wrong, fix it or report it as wrong.
6. **The user approves every slice; the PM chooses the art that goes in game (DEC-056, 2026-09-30), and the user can change any choice.** Stop at the slice gate. Don't start the next slice without an explicit "approved". Exception (DEC-059, 2026-09-30): natural-world slices and packages are built straight through without a gate; the user gets reports and can stop anything.
7. **Don't invent the game.** No new lore, place names, races, factions, or named characters unless they're approved in `docs/VISION.md`. Placeholder names start with `TEST_`.
8. **Ultima VII art may be used as examples, stand-ins, style references and training data for our art generators; everything that ships is our own original work.** (User decisions 2026-09-18 and 2026-09-19; the user accepted the risk of training on it.) No shipped asset may be a copy, trace, recolour, crop or near-copy of a U7 image. Originality is controlled by how the art is made and by the unanimous art council (DEC-062); the originality-check tool is removed (DEC-061, Owner 2026-10-01: "delete it off the planet"). Stand-in files in `game/` must start with `U7_` (`$U7_Man.png`), use exactly 3× scale, and be listed in `docs/STATUS.md` → Stand-ins. They all get replaced with original art before any release. See `docs/GUIDE_25D.md` §2 and "Reference vs. shipped content" below.
9. **The engine core is read-only.** Never edit `game/js/rmmz_*.js`, `game/js/main.js`, or `game/js/libs/`. All behavior goes in `game/js/plugins/UF_*.js`.
10. **Two failed fixes means stop.** If the same problem survives two attempts, stop patching. Write down what you know and what you've ruled out, then ask the user.
11. **All generation tasks are to utilize Google Nano Banana Pro.** **SUSPENDED by DEC-007 (2026-09-25); generator routing is DEC-063.** (User decisions 2026-09-19: "Nano Banana Pro: The Gemini 3 Pro Image model (gemini-3-pro-image). The premium choice for complex visual tasks, utilizing advanced reasoning (\"Thinking\") to follow complex instructions, maintain brand consistency, and render high-fidelity text. REWRITE EVERYTHING TO USE NANO BANANA PRO NOT NANO BANANA II".) Every visual asset across every category (characters, creatures, wildlife, monsters, terrain, tilesets, autotiles, world objects, items, equipment layers, portraits, facesets, icons, and UI) MUST originate from Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`). Nano Banana Pro utilizes advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity visual assets. No other generator model is allowed, and no agent is permitted to type in sprites pixel-by-pixel in code. Everything starts from an authentic Nano Banana Pro generation, processed into RMMZ standard formats via our palette and cleaning tools.
12. **All animation must happen through the sprite; no after-effect animations.** (User decisions 2026-09-19: "The animation for these things should come from the sprites, not an after effect. this applies to everything we generate" and "Also, ENFORCE THAT ALL ANIMATION IS TO HAPPEN THROUGH THE SPRITE. NO AFTER EFFECT ANIMATIONS"; VISION V108.) All animations across every entity and environmental feature—humanoids, wildlife, monsters, trees, flora, crops, fire, campfires, water ripples, doors, workshops, and world objects—must be delivered and played as distinct pixel sprite animation frames on the sprite sheets (e.g. 8-direction walk/action cycles, multi-frame wind sway, flickering flame loops, rippling water waves). No animation is to be faked or produced using code-driven after-effects, procedural scaling/squashing, sine-wave swaying, rotation, or shader distortions. The engine draws no motion of its own.
13. **Continuous Nano Banana Pro Non-Living Asset Production Pipeline with DF Black Wall-Top Convention & Strict Living Exclusion.** **SUSPENDED by DEC-007 (2026-09-25); generator routing is DEC-063.** (User directive 2026-09-21):
    - *Autonomous Non-Living Pipeline:* Whenever current implementation requires NON-LIVING artwork (walls, doors, terrain, flora, crops, furniture, workshops, machinery, items, effects), agents continuously identify those needs, batch them aggressively into packed character/sprite sheets (80–100% useful area), prompt Nano Banana Pro with explicit slot maps, process approved results, integrate them into the project, log them in `docs/ASSET_MANIFEST.md`, and verify them in context. DO NOT wait for the user to manually request individual non-living assets.
    - *Absolute Exclusion of Living Beings:* This autonomous pipeline DOES NOT apply to living beings (humans, colonists, humanoids, animals, wildlife, monsters, creatures, living portraits, living character sprites/animation sheets). When living assets are needed, register the requirement in `docs/ASSET_REQUESTS.md` / `docs/STATUS.md`, but do NOT generate autonomously.
    - *Dwarf-Fortress-Style Black Wall-Top Convention:* For TWO-GRID-HIGH walls, doors, gates, cliff-adjacent elements, and vertical architectural pieces (48×96 px), the upper 48 px cap MUST read as flat near-black (`#08080C` to `#121218`) with minimal edge definition for readability, creating an unbroken horizontal black occlusion line connecting with DEUS void and darkness language. The lower 48 px displays the authentic material face. The black cap is an architectural/occlusion convention, not a dynamic shadow. Follow `docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md` for all prompts.
14. **Engineering Health, Lean Architecture & Long-Term Maintainability** (User directive 2026-09-21): Treat project health as an ongoing system. Follow `docs/ENGINEERING_STANDARD.md` and `docs/ARCHITECTURE.md` as binding standards across all tasks:
    - *One canonical project:* Exactly one authoritative working copy (`c:\Users\snewt\OneDrive\Desktop\UF`); single integration authority for canonical changes.
    - *One source of truth per concept:* Strict subsystem ownership (World, WorldGen, Entities, Time, Capabilities, Jobs, Inventory, Resources, Construction, Pathfinding, AI, Combat, Rendering, Save, Diagnostics). No duplicated implementations.
    - *Data over hardcoding:* `System + Data = Content`. Logic stays general; content lives in catalogs (`game/data/UF_WorldCatalog.json`).
    - *No global full-world scans every frame:* Hard performance rule. Use spatial registries, localized queries, dirty flags, and event-driven updates. Never iterate all units, objects, or items per frame.
    - *Small refactors over rewrites:* Incremental debt cleanup; no risky monolithic engine rewrites.
    - *Stable persistent IDs:* Identify entities by ID (`Creature #1042`, `Household #83`), never live JS object references across ticks or saves.
    - *Explicit multi-domain time:* Disallow naked ambiguous timers; tag all timers/conditions (`domain: "action" | "historical" | "presentation" | "engine"`).
    - *Versioned saves:* Save truth, rebuild temporary caches upon load. Provide explicit schema migrations (`saveSchemaVersion`).
    - *Observability before complexity:* The simulation must be able to explain itself via `UF_Sheet` and `UF_Look` (why this goal, why this resource, capability breakdown, cell geology/moisture).


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
Cross-model agent roles, decision authorities, and responsibilities are canonically governed by [`docs/CANONICAL_ROLES.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/CANONICAL_ROLES.md) (Owner Directive 2026-09-25):
- **Gemini / Antigravity**: Coordinator, WBS controller, integration authority, non-living art production pipeline via Google Nano Banana Pro. Does not self-certify.
- **Claude / Fable**: Primary implementer for engine, simulation, and society leaves.
- **Grok**: Independent adversarial review, mutation design, defect closure, performance attack plans; production code writer in a lane whose manifest names Grok (natural-world lanes under DEC-058; other lanes while Claude is constrained, DEC-031 item 1; `docs/CANONICAL_ROLES.md` Section 2.1).
- **Codex**: Bounded tooling, test harnesses, scripts, governance & telemetry utilities; production code writer in natural-world lanes whose manifest names Codex (DEC-058; `docs/CANONICAL_ROLES.md` Section 2.1).

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
- Claude Code checks every asset against its catalogue row and the SOP (DEUS_ASSET_STANDARD), then the art council (DEC-062), and records the result in the request's status (`CHECKED`, or back to `IN PROGRESS` with the reason). Bigger problems go in `docs/AUDIT_LOG.md`: numbered findings graded **BLOCKER / MAJOR / MINOR**.
- Findings cite evidence: a file and line, a screenshot the reviewer opened, or a command's output. "Looks wrong" isn't a finding.
- Before starting, read the latest audit entry. Open findings in your area come before new work.

## RMMZ editor safety
- DEC-059 standing permission (2026-09-30): during the natural-world build the editor stays closed. The PM may change `game/data/*.json` and `game/js/plugins.js` without asking each time, and tells the user when to reopen.
The RMMZ editor keeps the database and plugin list in memory and overwrites the files when it saves.
- Before changing `game/data/*.json` or `game/js/plugins.js`, confirm with the user that the editor is closed.
- After changing them, tell the user to reopen the project.

## Dates
Use absolute dates (2026-09-18), never "today" or "yesterday", in every doc.
