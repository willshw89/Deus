# DEUS — CANONICAL INVARIANT REGISTRY (v1)
**Authoritative Architectural & Simulation Invariants**
**Integration Authority:** Gemini / Antigravity
**Approved by Owner Directive:** 2026-09-25

---

## 1. Executive Summary
This registry centralizes the fundamental, non-negotiable invariants of Project DEUS. Every subsystem, generator, test suite, and agent must adhere to these invariants. Violations constitute immediate build-breaking bugs.

---

## 2. Engine & Code Architecture Invariants

| ID | Invariant | Formal Statement | Enforcement / Verification |
|---|---|---|---|
| **INV-CORE-01** | **Core Engine Read-Only** | Files under `game/js/rmmz_*.js`, `game/js/main.js`, and `game/js/libs/` are strictly read-only. All DEUS logic resides in `game/js/plugins/DEUS_*.js`. | Git pre-commit check, `tools/verify_engine_read_only.js` |
| **INV-CORE-02** | **Single Source of Truth** | Exactly one subsystem owns any given simulation state (World, Entities, Fluid, Jobs, Items). No duplicate parallel state tracking. | Code review, Architecture audit |
| **INV-CORE-03** | **No Global Full-World Scans** | The engine never scans all world cells, units, or objects in a single frame. All processing is spatially bounded, dirty-flagged, or event-driven. | `PERF_QUIET_WORLD` benchmarks, frame-time audits |
| **INV-CORE-04** | **Stable Persistent IDs** | Entities are referenced across ticks, events, and saves exclusively by stable integer IDs (`Creature #1042`, `Household #83`), never live JS object references. | Save/load round-trip tests |
| **INV-CORE-05** | **Tests Must Be Able to Fail** | No tautological tests or hardcoded success strings. Every test suite must prove its capability to detect defects via mutation or negative fixtures. | Mutation testing (`--mutants`), Quality Engineering Policy |

---

## 3. Spatial & Geometric Invariants

| ID | Invariant | Formal Statement | Enforcement / Verification |
|---|---|---|---|
| **INV-GEO-01** | **Five Strata Micro-Z** | Every 5 ft cubic world cell consists of exactly 5 physical 1 ft strata (strata 0..4). 1 stratum = 1 ft. | `DEUS_Levels.js`, `test_strata_foundation.js` |
| **INV-GEO-02** | **Five Macro-Z Levels** | Active playable space is partitioned into 5 macro-Z levels: Z-2, Z-1, Z0 (ground/surface), Z+1, Z+2. | `DEUS_World.js`, `test_strata_cuts_and_caves.js` |
| **INV-GEO-03** | **AIR Means Exactly `M_AIR`** | Air is strictly material `M_AIR` (index 0). Non-solid materials (water, lava, slurry) are fluids, NOT air. Void carving and clearance checks must never count fluids as air. | `test_strata_cuts_and_caves.js` (`clearance_stops_at_fluid`) |
| **INV-GEO-04** | **No Floating Mass** | Natural world generation must never leave solid strata unsupported in mid-air unless connected to bedrock, cavern pillars, or area edges. | `test_strata_cuts_and_caves.js` (`no_floating_mass`) |
| **INV-GEO-05** | **Flat 2D Chibi Perspective** | DEUS uses flat top-down 2D RPG perspective (FF5/FF6 style). 2.5D visual height offsets and code-driven cast shadows are retired. | `DEUS_Visuals.js`, NW.js playtest visual verification |

---

## 4. Hydrology & Fluid Invariants

| ID | Invariant | Formal Statement | Enforcement / Verification |
|---|---|---|---|
| **INV-FLD-01** | **Canonical 5-Step Depth** | Water and lava each have exactly 5 visible, semantic depth states (1..5) mapping 1:1 to the 5 physical 1 ft strata in a cell. | `docs/art/CANONICAL_FLUID_DEPTH_STANDARD.md` |
| **INV-FLD-02** | **Finite Fluid Mass Conservation** | In closed natural systems, fluids do not spawn from nothing or vanish into void without explicit evaporation, source springs, or drainage sinks. | `test_strata_fluid_reconciliation.js` |
| **INV-FLD-03** | **Fluids Block Natural Voids** | Cave shafts, skylights, and natural cuts must refuse to carve through columns containing fluid strata, preventing artificial draining of surface water. | `test_strata_cuts_and_caves.js` (`shafts_keep_fluid`) |

---

## 5. Simulation & Time Invariants

| ID | Invariant | Formal Statement | Enforcement / Verification |
|---|---|---|---|
| **INV-SIM-01** | **Standard New Game Starts at Year 0** | Standard New Game begins strictly at World Year 0 (V134). No pre-generated centuries of roads, ruined cities, or exhausted mines. History unfolds through live simulation. | `DEUS_WorldGen.js`, `test_new_game_year0.js` |
| **INV-SIM-02** | **Explicit Multi-Domain Time** | Every timer and scheduled event must declare its explicit domain: `action`, `historical`, `presentation`, or `engine`. No ambiguous naked tick counters. | `DEUS_Core.js`, `docs/ENGINEERING_STANDARD.md` |
| **INV-SIM-03** | **Finite Material Conservation** | Finite resources (wood, stone, metal ore, soil) originate from discrete physical entities or strata; they cannot be fabricated without material cost. | `DEUS_Items.js`, `test_starter_kit_and_stockpile.js` |

---

## 6. Art & Visual Invariants

| ID | Invariant | Formal Statement | Enforcement / Verification |
|---|---|---|---|
| **INV-ART-01** | **Nano Banana Pro Generation Only** | 100% of original visual assets must be generated by Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`). Zero pixel-by-pixel code drafting. | `AGENTS.md` Rule 11, `docs/ASSET_MANIFEST.md` |
| **INV-ART-02** | **All Animation Through Sprites** | All animations must exist as discrete frames on sprite sheets. Zero code-driven after-effect swaying, scaling, stretching, or shader distortion. | `AGENTS.md` Rule 12, visual inspection |
| **INV-ART-03** | **Universal 12-Sprite Charset Layout** | All character sets and directional animated sheets follow the universal 3×4 matrix (3 Down, 3 Left, 3 Right, 3 Up) on native RMMZ layouts. | `GEMINI.md`, charset validation suites |
| **INV-ART-04** | **Dwarf Fortress Black Wall-Top** | Two-grid-high walls (48×96 px) must feature a flat near-black upper 48 px cap (`#08080C` to `#121218`) producing a continuous horizontal occlusion line. | `AGENTS.md` Rule 13, `docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md` |
| **INV-ART-05** | **Living Exclusion from Autonomous Pipeline** | Autonomous asset production applies strictly to non-living assets. Living beings (humans, wildlife, monsters) are never autonomously generated without explicit owner request. | `AGENTS.md` Rule 13, `docs/ASSET_REQUESTS.md` |

---

## 7. Multi-Agent Governance & Workflow Invariants

| ID | Invariant | Formal Statement | Enforcement / Verification |
|---|---|---|---|
| **INV-GOV-01** | **Gemini Integration Authority** | Gemini / Antigravity is the sole authority permitted to integrate candidate branches into canonical `main`. | Git branch protection, task workflow |
| **INV-GOV-02** | **One Primary Writer Per File Set** | Only one agent owns and writes to an active task worktree or file set at a time. No concurrent edits. | `docs/STATUS.md` claiming rules |
| **INV-GOV-03** | **Independent Review Precedence** | Reviewers form conclusions independently from the diff and specification before reviewing author explanations or rebuttals. | Adversarial review workflow |
| **INV-GOV-04** | **Durable Task State** | Task state, defects, and evidence must be committed or written to disk mailboxes (`docs/agents/mailboxes/`); they must survive agent context loss or crashes. | `docs/AGENT_COMMUNICATION_PROTOCOL.md` |
| **INV-GOV-05** | **Evidence Precedes Claims** | No claims of "verified", "0 errors", or "60 FPS" without citing concrete evidence generated and inspected in the active session. | `AGENTS.md` Rule 3, report format enforcement |

---

## 8. Person, Society & Institutional Invariants

| ID | Invariant | Formal Statement | Enforcement / Verification |
|---|---|---|---|
| **INV-SOC-01** | **Three Independent Identity Axes** | A person's economic Craft, Civic Office, and 2014 SRD Class are independent characteristics. Progression or changes in one axis do not modify another. | `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md`, `SOC.10.01` |
| **INV-SOC-02** | **Current Duty is Operational State** | Current Duty describes temporary operational assignments (what a person is doing right now), never an immutable identity axis. | `SOC.13.01`, Duty Scheduler tests |
| **INV-SOC-03** | **Office Exists Independently of Holder** | An office survives holder death as a vacancy. Authority and jurisdiction reside in the Office entity, never solely in individual person records. | `SOC.20.01`, `SOC.23.01` |
| **INV-SOC-04** | **Workload-Driven Institutional Growth** | Small factions combine civic functions across multi-hat founders; institutions specialize and split into subordinate offices based on workload index, not arbitrary population triggers. | `SOC.21.01`, `SOC.22.02` |
| **INV-SOC-05** | **Conserved Physical Minting** | Minting transforms physical assayed monetary metal into official coinage (cp, sp, ep, gp, pp) and never creates wealth or matter from nothing. | `SOC.30.01`, Mass conservation tests |
| **INV-SOC-06** | **Treasury vs Stores Separation** | Faction monetary balance (Treasurer) and physical goods inventory (Quartermaster) are strictly separate concepts. Financial wealth cannot substitute for physical food in famine. | `SOC.31.01`, `SOC.32.01` |
| **INV-SOC-07** | **No Fixed Military Ratios** | DEUS rejects universal fixed military/civilian population ratios. Military participation derives from administrative service status (`NONE`, `RESERVE`, `MILITIA`, `GUARD`, `PROFESSIONAL`). | `SOC.40.01` |
| **INV-SOC-08** | **Mobilization Economic Cost** | Threat mobilization temporarily redirects civilian economic labor to defense, imposing an authentic, physical economic productivity and harvest cost. | `SOC.40.02`, `SOC.42.01` |
| **INV-SOC-09** | **Canonical 2014 SRD Class Source** | All Class mechanics, spell progressions, proficiencies, and combat capabilities derive exclusively from the canonical 2014 SRD located in the UF project repository. | `SOC.11.01`, `docs/SRD5_1_INTEGRATION.md` |

