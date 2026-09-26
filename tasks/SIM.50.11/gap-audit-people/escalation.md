# SIM.50.11 escalation (lane-o2, writer Claude)

Standing rule 6: bugs found in read-only shared files, and sources that disagree. Nothing below was edited; every file named is outside this lane's allowedPaths. The audit continues, because none of these items blocks its deliverables: the audit cites each decision by its number and title in `docs/OWNER_DECISIONS.md`, not by the cross-reference in the WBS row text.

Base commit for every line number: `790387090083848959ce0b95bc560a395336fa3d` (the brief's base; this branch adds only files under `tasks/SIM.50.11/`).

## E1. Three WBS rows cite the wrong DEC (and one the wrong V row)

Rev 24 renumbered the Addendum decisions to DEC-019..DEC-022 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:730`). Three rows still carry the old numbers.

| WBS row | Line | Row text says | The decision that matches the row's scope |
|---|---|---|---|
| WG.00.20 Seamless inter-layer ramps | `docs/worldgen/DEUS_WORLDGEN_WBS.md:108` | `(DEC-017; dep: Lane N, WG.00.19)` | DEC-020 "Seamless Inter-Layer Ramps and Camera-Follow Behavior" (`docs/OWNER_DECISIONS.md:282`). DEC-017 is the RMMZ shell and PixiJS fallback (`docs/OWNER_DECISIONS.md:239`). |
| WG.00.21 Layer occlusion culling | `docs/worldgen/DEUS_WORLDGEN_WBS.md:109` | `(DEC-018; dep: Lane K follow-up, WG.00.17)` | DEC-021 "Occlusion Rule for Layer Rendering" (`docs/OWNER_DECISIONS.md:293`). DEC-018 is hyper-realistic SRD spells (`docs/OWNER_DECISIONS.md:251`). |
| GP.07.02 Cross-layer 3D targeting | `docs/worldgen/DEUS_WORLDGEN_WBS.md:578` | `Directive 0021-V Addendum §20; DEC-019; V148` | DEC-022 "Cross-Layer 3D Targeting, Ballistics, and Volume Damage" (`docs/OWNER_DECISIONS.md:304`) and V151 (`docs/VISION.md:412`). DEC-019 is in-layer strata height (`docs/OWNER_DECISIONS.md:267`); V148 is the overlook view (`docs/VISION.md:409`). |

Owner of the fix: the coordinator (WBS files are coordinator-only). Suggested fix: correct the three cross-references in the next WBS revision.

## E2. VISION V87 (eleven peoples) and DEC-013 (exactly nine races) disagree

- `docs/VISION.md:98` (V87, 2026-09-19): eleven peoples found factions (lizardfolk, dwarves, elves, goblins, gnomes, humans, orcs, kobolds, undead, a star-born race, a swarm race).
- `docs/OWNER_DECISIONS.md:184` (DEC-013 §5, 2026-09-26): "Exactly 9 races exist in the world". V132 (`docs/VISION.md:126`) and WG.62.01 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:195`) name the nine SRD races.

V87 is not marked superseded. This lane's brief settles which one the audit uses ("the 9 SRD races (DEC-013)"), so the audit follows DEC-013 and lists the stale V87 row as a documentation mismatch. The Owner or coordinator decides whether V87 is superseded.

## What was not done

- No file outside `tasks/SIM.50.11/gap-audit-people/**` was changed.
- No Owner question was answered; no WBS status or ID was changed or minted.
