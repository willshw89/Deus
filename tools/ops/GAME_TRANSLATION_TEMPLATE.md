# DEUS game translation and proof templates

Mandatory under the Owner's 2026-09-28 traceability request and `.agents/rules/deus-game-translation.md`. Revised 2026-09-29 under DEC-042: one brief block, one report block, one exit table. Fill them within the approved scope; a template opens no WBS leaf and authorizes no art, engine edit, integration or new gameplay work. Adding this block to existing work does not make it playable.

Nothing is complete without in-game proof: the Owner sees it in RMMZ Playtest (F5). Headless tests alone never count.

## 1. Every lane brief and completion report: the GAME TRANSLATION block

In a brief, describe the expected behavior and the planned proof. In a completion report, replace plans with observed results, exact commits, evidence paths and commands; mark anything not run. Keep all ten fields and all six YES/NO lines. Use `N/A - <specific reason>` only for a genuinely inapplicable detail, never to hide a missing bridge or consumer. Tooling and governance lanes explain the indirect assurance they give and the gameplay work that relies on it.

```text
GAME TRANSLATION

WBS / Lane:
Approved scope / Owner authorization reference:
Writer SHA / evidence date:
Translation Class: A DIRECT PLAYER-VISIBLE | B WORLD-BEHAVIOR VISIBLE | C FOUNDATIONAL / INDIRECT

Player / World Effect:
What concretely changes in the game or world?

Trigger:
What action or simulation condition causes the behavior?

Runtime Authority:
Which single system owns the truth and which state fields represent it?

Simulation Path:
Which actual files, functions/modules and data calculate the result?

Engine Bridge:
Which RPG Maker MZ consumer receives, displays or uses the result?
Name the actual connection, or the specific deferred integration and its approval state.

Visible Result:
What would the player see, manipulate, or experience? What has actually been observed?

Persistence:
What survives save/load and region unload/reload? Cite schema/IDs and proof.

Failure Without This Lane:
What looks fake, breaks, or cannot happen without it?

Automated Proof:
Exact command, seed/fixture, expected invariant, observed exit/result, log, tested SHA.
Separate deterministic unit proof from the integration test of the consumer.

In-Game Proof:
Exact reproducible playtest steps, seed/scene, expected result, actual result,
evidence paths and inspected screenshots. State NOT RUN when not performed.

CONSUMED BY GAME SYSTEMS:
- Named visible consumer, contract/data received, and integration test proving delivery.
- For each foundation: how corruption would manifest in gameplay.

GAME BRIDGE STATUS
Simulation implemented: YES/NO - evidence or reason
Engine bridge implemented: YES/NO - evidence or reason
Presentation implemented: YES/NO - evidence or reason
Input/player interaction implemented: YES/NO - evidence or reason
Save/load implemented: YES/NO - evidence or reason
Playable verification performed: YES/NO - evidence or reason

Remaining step before player can experience it:
```

Write `NO - NOT VERIFIED` when a YES has not been established. Class A and B results need a direct playable demonstration or an in-game outcome scenario before the behavior is called complete. Class C results name their consumers, say how corruption would show in gameplay, and supply the consumer integration test or state that it is blocked or not run. A foundation whose bridge belongs to another lane reports `Engine bridge: DEFERRED TO <named integration>` and `Player-facing status: NOT YET PLAYABLE`; it does not widen its scope to make the fields look complete. A passing headless test cannot establish the RMMZ connection; a screenshot cannot establish conservation or persistence.

## 2. One report block: WBS proposal, review record, overnight report

One block serves the three uses that had their own templates before 2026-09-29. Fill every line; write `NOT RUN`, `NOT YET APPROVED` or `N/A - <reason>` rather than leaving one empty.

```text
GAME TRANSLATION REPORT   (use: WBS PROPOSAL | REVIEW | STATUS)

Lane / WBS / exact writer SHA:
Why the player cares (a concrete action or world consequence, not "realism" or "depth"):
Translation class / named consumer / upstream dependency:
Simulation behavior and headless proof (command, fixture, exit code, tested SHA):
In-game consequence and in-engine proof (playtest steps, observed result, or NOT RUN):
Persistence proof (save/load, region unload/reload):
Six bridge-status lines supported by evidence: YES / NO - which ones are not
Permitted claim: bounded foundation complete | behavior demonstrated | NOT YET PLAYABLE
Remaining step before the player can experience it / missing evidence / missing approval:
Author, actual model family, review artifact or commit, timestamp:
```

Rules for each use:
- **WBS proposal:** the "Why the player cares" line is mandatory (`.agents/rules/deus-game-translation.md`); a weak consequence is grounds to recommend deferral, never to open a leaf. "Owner approval" is `NOT YET APPROVED` unless an explicit approval is cited.
- **Review:** this block supplements, and never replaces, the single `VERDICT:` line, the review-commit structure, family independence and `merge_gate.js` (`tools/governance/MERGE_GATE.md` §5 (b)). The reviewer checks the chain, class, six status lines, persistence, exact SHA and both levels of proof independently. Missing fields block a gameplay-complete claim; a truthful foundation-only outcome is a valid outcome.
- **Status (overnight or morning):** state the concrete consequence first, then separate simulation evidence from RMMZ integration and playtest evidence. "Support calculation enforces the span rule and conserves mass in the fixture; engine bridge/playtest: NOT VERIFIED" stays that way until the Owner has seen it in the game.

## 3. Natural World v1 exit gate

DEC-041 item 7 (2026-09-28) is the authority for the exit gate. The table below merges the twelve DEC-041 points with the six observable scenarios (A to F) this template carried before 2026-09-29; where they differ, DEC-041 governs. The coordinator assembles one controlled, fixed-seed in-engine sequence before final Owner sign-off, with approved content only, and records commands, tested SHAs, expected and observed outcomes, conservation and identity checks, saved state and the evidence the Owner opened. A point that needs unapproved work stays an explicit exit blocker; it approves nothing.

| # | DEC-041 point | Observable in-engine proof | Was |
|---|---|---|---|
| 1 | World topology survives region seams and save/load cycles | Walk across a surface region seam and an underground one; save, reload; the same cells, strata and objects are there. | A, B |
| 2 | Physical world objects remain persistent | Move an object; put it in a container and take it out; carry it across a seam; save and reload; same identity, placement and count. | A |
| 3 | Excavation exposes predetermined geological strata | Inspect a deep cut and descend several Z levels; the strata match the generated record and stay continuous after reload. | B |
| 4 | Unsupported terrain triggers cascading collapse into rubble | Show a safe span standing; remove the critical support; observe the collapse and physical rubble; the collapsed state persists. | C |
| 5 | Groundwater breach produces conserved Darcy seepage | Breach a saturated formation; observe inflow, pooling and equilibrium; the water ledger balances (DEC-040) and the water state persists. | D |
| 6 | Groundwater and surface water hydrate soil moisture | Observe surface runoff and groundwater raising soil moisture in the cells they reach, and dry cells staying dry. | D, E |
| 7 | Terrain elevation and volcanism dynamically drive continuous climate | Compare temperature across elevation and near volcanism (DEC-038 continua); the gradient is continuous, not a biome stamp. | E |
| 8 | Soil moisture, light and temperature govern plant germination and growth | Compare dry, wet and cold terrain; vegetation suitability and growth differ accordingly and persist. | E |
| 9 | Vegetation biomass determines herbivore carrying capacity | Reduce biomass in one area; the herbivore population there falls or moves; it does not stay constant. | F |
| 10 | Wildlife populations persist and reproduce rather than respawning | Populations follow habitat and resources over time and reload; no arbitrary respawn timers (DEC-039 regeneration law). | F |
| 11 | Full region unload and reload reproduces bit-identical state | Unload a region, reload it, compare the serialized state byte for byte with the pre-unload snapshot. | A, B |
| 12 | Quiescent sleep guarantees zero global full-world per-frame scans | With the world at rest, the diagnostics show no per-frame iteration over all units, objects or items (AGENTS.md Rule 14). | new |

The old A to F wording, and any pasted example about objects, 32-layer worlds, support or aquifers, described intended translation, not verified features. Actual dimensions, consumers and behavior come from the approved lane contracts and the observed runtime. No new art is required or authorized by this proof plan (DEC-007 as amended 2026-09-29).
