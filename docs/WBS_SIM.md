# WBS-SIM: Simulation core

**Status: Parked until the world loads green** (WBS-ORG ORG-0.2, ORG-4.2). Recorded 2026-10-02. Nothing here may start without the Owner reopening it.

Constraints: DEC-037 freeze stays (no faction/society work). Race bonuses from SRD 5.1 only; professions replace SRD backgrounds. Every lane cites 1–3 GitHub references; no GPL/AGPL copying. Determinism hash (ORG-4.2) must stay unchanged unless the Owner approves.

| ID | Task |
|---|---|
| SIM-0 | Foundations: seeded RNG (`seedrandom` pattern), fixed simulation tick, sim/render boundary, save/load of sim state. |
| SIM-1 | Data: typed-array entity store (bitECS as reference only; adopt after a measured decision), spatial index (flatbush / rbush), items tracked through the mass ledger. |
| SIM-2 | Movement: reachability regions, hierarchical pathfinding, flow fields wired into real movers. |
| SIM-3 | Work: job board with reservations; job score = priority x competence x distance x urgency, where competence = SRD ability modifier + proficiency (from race, class or profession, no stacking); hauling and stockpiles; construction and mining through the mass ledger. |
| SIM-4 | Colonists: needs, mood, skills/XP (SRD thresholds, no race XP modifier), health and death. |
| SIM-4.5 | Professions replacing SRD backgrounds: each grants 2 skill proficiencies + 1–2 tool proficiencies. |
| SIM-5 | Performance: workers via `comlink`, per-tick time budgeting. |
| SIM-6 | World: creatures as entities, weather and seasons. |
