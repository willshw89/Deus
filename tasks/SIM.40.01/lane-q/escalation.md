# Escalation: three sibling design lanes use three different ledger mass units (SIM.40.01, lane-q)

| | |
|---|---|
| Raised by | Claude, lane-q (SIM.40.01), 2026-09-26 |
| For | the PM (and the WG.65.15 owner). This is not an Owner question |
| Standing rule | BRIEF standing rule 6: two sources disagree in a way the brief does not settle |
| Blocks | nothing in this lane's deliverables; it blocks merging the three designs as one consistent ledger |

## What disagrees

ADR-003 Rev 3 (PROPOSED, `origin/task/lane-m`) leaves the Q-MASS unit and per-material tables to "SIM.40.01 with WG.65.15" (its §7.8). The three parallel design lanes, all unreviewed, chose differently:

| Lane | Document | Mass unit | Family list |
|---|---|---|---|
| Q (this lane) | `tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md` §1, §9.1 | 1 kg | mineral, organic, metal:<element>, water (du) |
| R (SIM.40.05) | `origin/task/lane-r:tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md` §0.2 (tip `6613418f`) | 1 mu = 1/16 lb ("assumed") | STONE (per lithology), EARTH, ORGANIC, BONE, FE, CU, PB, AG, AU, PT, SPECIAL, GLASS, WATER |
| W (SIM.40.10) | `origin/task/lane-w:tasks/SIM.40.10/lane-w/SIM.40.10_POPULATION_LIFECYCLE.md` §0 (tip `bed949e8`) | 1 g ("Assumption A-MASS") | organics, water (the ADR's list) |

A single conserved ledger (LIFE-001, WG.65.15) needs one unit and one family list. Each lane's numbers are internally consistent and scale by one constant, so nothing is wrong inside any document; they just cannot be merged as written.

## What this lane proposes (not decided)

- **Unit: 1 g** for every family except water, which stays in fluid depth units (du). Grams are fine enough for Lane W's small creatures; Lane Q's tables convert exactly (× 1,000); Lane R's convert once (1 mu = 28.349523125 g, rounded per table entry at data time). Range: a fully solid 256 × 256 × 160-voxel granite area is about 4.1 × 10¹³ g, under 2⁵³ ≈ 9.0 × 10¹⁵, so totals are kept per area and family.
- **Families: Lane R's list.** It refines Lane Q's (mineral = STONE ∪ EARTH ∪ GLASS; metal:<element> = FE, CU, PB, AG, AU, PT; BONE separate), and it already keeps ash and charcoal in ORGANIC, which Lane Q has adopted.
- The full difference table, including the naming differences Lane Q has already resolved by adopting Lane R's names (`capacityThresholdsHP`, `collapse.breakElement`, build-time roles), is §9.7 of the lane-q design.

## What is asked

The PM (or WG.65.15's owner) picks one unit and one family list before any of the three designs merges, or tells the three lanes which document governs. Lane Q has not changed its own kg figures, because choosing for the other two lanes is not this lane's call.
