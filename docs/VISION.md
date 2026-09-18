# VISION: what we're building

Working title: **UF**. Not final: "Ultima" is a trademark, so it can't be in the release name.

## In one paragraph
A living, randomly generated world simulated with Dwarf Fortress depth (terrain, materials, gathering, construction, needs, jobs, combat with body-part wounds). It's shown and played like Ultima VII: the U7 2.5D view, objects you can pick up, drag, and open, and inhabitants with daily lives. Built in RPG Maker MZ using plugins only.

## Locked decisions
These came from the user. Only the user can change them. When they do, edit the row and add a line to the Decision log.

| # | Decision |
|---|---|
| V1 | Engine: RPG Maker MZ v1.10.0. Behavior comes from plugins; RMMZ core files are never modified. The project must stay openable and playtestable in the RMMZ editor. |
| V2 | The look is Ultima VII's 2.5D view, and **everything** on screen follows the same projection: people, trees, walls, items. Spec: `ART_STANDARD.md`. |
| V3 | 8-directional movement on a square grid. |
| V4 | No protagonist. The game starts with one naked man and one naked woman in the middle of the start area, with names generated each game. Everything else, including the start's surroundings, is randomly generated. (Revised 2026-09-18: the fixed fruit tree was removed.) |
| V5 | The player commands units the way DF does (designations, jobs, orders). |
| V6 | DF's systems are all in: randomness and world generation, gathering, construction, needs, combat. Implemented originally, not copied. |
| V7 | Many races. Not dwarf-centric. |
| V8 | Fantasy plus science-fiction elements are allowed. |
| V9 | Setting, names, and terminology are original, not copied from Ultima or DF. Public-domain myth and generic SRD-style fantasy are fine. Ultima VII art may be used as examples and temporary stand-ins during development (`U7_` prefix, replaced before release). |
| V13 | A cursor is how the player looks around (DF "look" style). The camera follows the cursor. |
| V14 | The world is made of **areas at RMMZ's maximum size (256×256 cells each)**. World characters **and** the player's view move between areas. Characters keep living and traveling when their area isn't on screen. The glade sits in the middle of the starting area. |
| V15 | The camera zooms out to show more of the world (mouse wheel, − / +). Zoom steps keep pixel art exact. |
| V16 | **Emergence and replayability are the core goal.** Every new game is a different world, and stories come out of the simulation rather than scripts, so people want to play again and again. |
| V17 | **Colonists act on their own.** Adam and Eve pursue goals without player input: survive first, then gather, build shelter, and grow into a society. Player orders change priorities; they're never required. |
| V18 | **Factions are generated with the world**, with relations from allied to hostile between them. |
| V19 | **Entities can arrive along the edges of the 256×256 map at any time** (migrants, traders, raiders, wildlife), depending on the factions. |
| V21 | **What people do shows up physically.** A fire is a fire object, a house is built one wall segment at a time, dropped items lie on the ground as objects. |
| V22 | **Water can be changed like in DF:** it flows, can be dug, dammed, and channeled, and pours between layers. |
| V23 | **People have complex AI:** a daily pattern of life, plus productive work chosen by their personality traits and skills, without player input. |
| V24 | **The world is populated at the start:** wildlife, monsters, and faction members, generated with the world. |
| V25 | **Everything in the world is interactive,** like in DF (trees, rocks, water, items, buildings, creatures). |
| V26 | **People have children** (relationships, pregnancy, growing up, aging). |
| V27 | **Biomes with distinct features:** every DF world-block starting state (all biome types, region character, water bodies, caves) exists, each with its own look, plants, and creatures. |
| V28 | **DF's core gameplay mechanics are adopted as mechanics** (not DF's text or data). The plan is `docs/design/DF_MECHANICS.md`. |
| V29 | **Combat works like Ultima VII's:** real time, combat mode, per-character attack modes, click targeting, stats and equipment decide hits (DF_MECHANICS §8). |
| V20 | **An underground layer** under the whole world. Each 256×256 underground area corresponds cell for cell to the surface area above it. They connect at random spots (cave mouths), and the underground has its own fog of war. |
| V10 | Engine first. All the U7 and DF functionality works (with graybox placeholder art) before any unique art is generated. |
| V11 | The user sees and approves every art asset before it goes into the game. |
| V12 | Work happens in vertical slices. The user approves each slice before the next starts. |

## Rejected: don't bring these back
- A starting party or companions ("The Wayfarer", Garrick, Doran, Thalric)
- A fixed protagonist (the "Delver")
- The pre-built dwarf fortress scenario (Deepdelve, the mountainhall, the King's hall, the tavern, etc.)
- A game centered on hand-written named NPCs with hand-written dialogue trees
- Ripped Ultima VII sprites as **final** game art. As labeled stand-ins they're allowed (V9).
- Isometric diamond grids (that's Ultima VIII, not VII)
- Upright JRPG-style character sprites (they don't match the U7 projection; see `ART_STANDARD.md` F4)

## Proposed but not approved
An earlier agent session invented these. The user hasn't approved them. Don't build on them and don't delete them; the user decides.
- World name "Kaldurath"
- Races: Karadrim, Valen, Sylvathi, Vorgari, Kitterkin, Morvath, Precursor Automata
- Lore and materials: Star-Iron, aetheric power cells, "Dual Axioms", Precursor fabricators, etc.
- Calendar names ("Deep-Frost", etc.)
- Named portrait characters in `game/img/faces/`

## Open questions (only the user can answer)
Don't guess these. If a task depends on one, ask.
- **Q1 Time:** real-time with pause and speed control (DF and U7 both work this way), or something else?
- **Q2 Population:** how does it grow from two people? Births, arriving migrants, or both?
- **Q3 Failure:** is there a lose condition, or does the world just carry on?
- **Q4 Control:** does the player ever steer one unit directly (U7-style), or only give orders (DF-style)?
- **Q5 Facings:** do sprites have 4 facings (like U7) or 8? This roughly doubles the art. See `ART_STANDARD.md` §4.
- **Q6 Scale:** pixel scale and screen size. See `ART_STANDARD.md` §2.
- **Q7 World size in areas:** how many areas across and down? The default is 6×6, which at the proposed scale is about Ultima VII's world size (U7 was 3072×3072 of its own tiles = 1536×1536 of our cells). It's a plugin parameter, so it's easy to change.
- **Q11 Life timescale:** at 1 game hour per real minute, a DF-length year would take over 100 real hours. How long should a year, a pregnancy, and a childhood be in real play time?
- **Q12 Injuries:** with U7-style combat, also keep DF-style injuries (bleeding, broken or lost limbs, infections), or pure hit points?
- ~~Q9 One world system~~: resolved 2026-09-18, a fresh seeded world (see the Decision log).
- ~~Q10 Who builds colonist AI and factions~~: resolved 2026-09-18, Claude Code (engine).
- **Q8 Area edges:** crossing an edge currently switches the screen to the next area (DF-style). A seamless, U7-style continuous scroll is possible later, but it's harder in RMMZ. Keep switching for now?

## Decision log
Append only, newest at the bottom.
- 2026-09-18: V1–V12 recorded from the user's instructions during the first planning session. The rejected directions were rejected by the user in the same session.
- 2026-09-18: The user approved the guardrail docs, git setup, the Node install, the K1 fix, and the start of Slice 0. Roles set: Gemini builds features and art; Claude Code owns the guardrails, audits Gemini, fixes mistakes, and builds documented U7/DF mechanics when audits are clean.
- 2026-09-18: The user allowed Ultima VII assets as examples and stand-ins (V9 amended). Added V13 (a cursor is how you look around) and V14 (a larger world).
- 2026-09-18: The user set V14: areas at maximum size (256×256), and both world characters and the player move between areas.
- 2026-09-18: Division of labor revised by the user. Claude Code owns the engine and features, plus asset specs in `docs/ASSET_REQUESTS.md`. Gemini owns art only.
- 2026-09-18: The user asked for the camera to zoom out to show more of the world. Added V15.
- 2026-09-18: The user set the core goal (V16), autonomous colonists building a society (V17), and generated factions with relations (V18).
- 2026-09-18: The user resolved Q9: a **fresh seeded 256×256 world** each game, Adam and Eve in the middle, and fog of war explored by them and faction members. Gemini's baked Map002 world is retired. Q10: under the division of labor, factions are Claude Code's; Gemini's `UF_Factions.js` draft gets reviewed first.
- 2026-09-18: The user added V19: arrivals along the map edges at any time.
- 2026-09-18: The user added V20: an underground layer connected to the surface at random spots, same grid, with its own fog of war. Also: every stock RMMZ asset the engine uses gets a replacement request for Gemini.
- 2026-09-18: The user revised V4: **no fixed tree**; the only fixed part of a new game is a man and a woman, with names generated each game. Factions, surface, and caves are all random per New Game. Time: 1 game hour per real minute, with no clock on screen; speed-up allowed, never backward.
- 2026-09-18: The user added V21–V29 (physical results of actions, DF-style water, complex personality-driven AI, populated world at start, everything interactive, children, distinct biomes, DF mechanics as the model, U7-style combat).
