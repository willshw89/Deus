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
| V4 | No protagonist. The game starts in a fixed small area with one fruit tree, one naked man, and one naked woman (working names Adam and Eve). Everything beyond that area is randomly generated. |
| V5 | The player commands units the way DF does (designations, jobs, orders). |
| V6 | DF's systems are all in: randomness and world generation, gathering, construction, needs, combat. Implemented originally, not copied. |
| V7 | Many races. Not dwarf-centric. |
| V8 | Fantasy plus science-fiction elements are allowed. |
| V9 | Setting, names, and terminology are original, not copied from Ultima or DF. Public-domain myth and generic SRD-style fantasy are fine. Ultima VII art may be used as examples and temporary stand-ins during development (`U7_` prefix, replaced before release). |
| V13 | A cursor is how the player looks around (DF "look" style). The camera follows the cursor. |
| V14 | The world is made of **areas at RMMZ's maximum size (256×256 cells each)**. World characters **and** the player's view move between areas. Characters keep living and traveling when their area isn't on screen. The glade sits in the middle of the starting area. |
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
- **Q8 Area edges:** crossing an edge currently switches the screen to the next area (DF-style). A seamless, U7-style continuous scroll is possible later, but it's harder in RMMZ. Keep switching for now?

## Decision log
Append only, newest at the bottom.
- 2026-09-18: V1–V12 recorded from the user's instructions during the first planning session. The rejected directions were rejected by the user in the same session.
- 2026-09-18: The user approved the guardrail docs, git setup, the Node install, the K1 fix, and the start of Slice 0. Roles set: Gemini builds features and art; Claude Code owns the guardrails, audits Gemini, fixes mistakes, and builds documented U7/DF mechanics when audits are clean.
- 2026-09-18: The user allowed Ultima VII assets as examples and stand-ins (V9 amended). Added V13 (a cursor is how you look around) and V14 (a larger world).
- 2026-09-18: The user set V14: areas at maximum size (256×256), and both world characters and the player move between areas.
