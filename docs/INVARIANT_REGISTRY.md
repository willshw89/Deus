# INVARIANT_REGISTRY: the live invariants (table only)

> The rules are in `docs/ENGINE_RULES.md`. This file is the row list that `tools/governance/check_invariants.js` and `test_check_invariants.js` read: one `| **INV-...** |` row per invariant, in this exact order, IDs never renumbered or removed (the checker fails on a missing, extra, duplicate or reordered ID). Reduced 2026-09-29: the prose went to ENGINE_RULES or was dropped. A row marked "superseded" states the later Owner decision; the checker reports it SUPERSEDED-PENDING-OWNER until the Owner closes it.

| ID | Invariant | Enforcement |
|---|---|---|
| **INV-CORE-01** | Engine core read-only: `game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/**`. Logic lives in `game/js/plugins/DEUS_*.js` and `game/js/sim/**`. | `check_invariants.js` (mechanical) |
| **INV-CORE-02** | One subsystem owns each piece of simulation state (World, Entities, Fluid, Jobs, Items); no parallel copies. | `docs/ARCHITECTURE.md`; review |
| **INV-CORE-03** | No global full-world scan in a frame; work is spatially bounded, dirty-flagged or event-driven. | ENGINE_RULES §7; `DEUS_Test` `perf` |
| **INV-CORE-04** | Entities are referenced by stable integer ID across ticks, events and saves, never by live object. | Save/load round-trip tests |
| **INV-CORE-05** | Tests must be able to fail; every suite proves it with mutants or negative fixtures. | ENGINE_RULES §5; mutants per lane |
| **INV-GEO-01** | Five strata per Z layer; 1 stratum = 2 ft, 1 layer = 10 ft, 1 cell = 5 ft (DEC-013 item 2, DEC-038). Superseded wording (1 ft strata) pending Owner closure. OPEN: the art SOP (AS-GLOBAL-018, AS-SCALE-001, AS-QTR-001) says 5 ft, 48 px, four 12 px quarters; the decision log governs until the Owner rules once (`docs/STATUS.md` D.5). | `DEUS_Levels.js`, `tools/test_strata_foundation.js` |
| **INV-GEO-02** | The Z range is data, never a literal: new worlds 32 layers, -16..+15, ground 0 (DEC-013; `docs/systems/DEUS_ZRange.md`); pre-WG.00.17 saves keep -2..+2. Superseded wording (five macro levels) pending Owner closure. | `tools/test_zrange.js` |
| **INV-GEO-03** | AIR is exactly material `M_AIR` (index 0); water, lava and slurry are fluids, never air. | `test_strata_cuts_and_caves.js` (`clearance_stops_at_fluid`) |
| **INV-GEO-04** | Natural worldgen leaves no solid strata floating unsupported. | `test_strata_cuts_and_caves.js` (`no_floating_mass`) |
| **INV-GEO-05** | Flat 2D top-down, one camera for every asset: high top-down (AS-VIEW-002); 2.5D offsets retired (Owner, 2026-09-29). DEC-019's per-stratum pixel offset stays recorded; Owner to close. | DoD level 3 playtest; `DEUS_Visuals.js` |
| **INV-FLD-01** | Water and lava have exactly five visible depth states, one per stratum (2 ft each, DEC-013). In the same OPEN layer-height conflict as INV-GEO-01 (the SOP's four quarters would give four); DEC-013 governs until the Owner rules. | `docs/art/CANONICAL_FLUID_DEPTH_STANDARD.md` (bannered: reference only) |
| **INV-FLD-02** | Fluid mass is conserved: nothing appears or vanishes without a named source, sink or evaporation. | `tools/test_strata_fluid_reconciliation.js` |
| **INV-FLD-03** | Natural shafts, skylights and cuts never carve through a column holding fluid. | `test_strata_cuts_and_caves.js` (`shafts_keep_fluid`) |
| **INV-SIM-01** | Standard New Game starts at World Year 0 (VISION V134); history unfolds live. | `tools/test_new_game_year0.js` |
| **INV-SIM-02** | Every timer declares its domain: `action`, `historical`, `presentation` or `engine`. No naked tick counter. | ENGINE_RULES §7; not mechanical (`UF_Time.schedule` defaults to `engine`) |
| **INV-SIM-03** | Closed mass (DEC-040 as clarified 2026-09-29): stone, soil, sand, clay, ores, metals and water keep their weight through mining, crafting, decay and reclaim, in integer centipounds; plants, creatures and gases are outside the rule. | `game/js/sim/ledger.js`; `tools/test_starter_kit_and_stockpile.js` |
| **INV-ART-01** | Superseded: art generation is PixelLab OBJECTS and MAPS only, catalogue record first, SOP prompt (`docs/art/DEUS_ASSET_STANDARD.md`), QA vetting, Owner sign-off (DEC-007 amendment 2026-09-29). The Nano Banana Pro mandate (Rule 11) is suspended. | `art/catalogue/catalogue.json`; Owner sign-off |
| **INV-ART-02** | All animation is discrete sprite frames; no code-driven motion, scale, sway or shader (Rule 12, V108). | Visual inspection; DoD level 3 |
| **INV-ART-03** | Superseded: character map sprites are eight-direction PixelLab characters (AS-CHMAP-001); creatures use four directions S, W, E, N (AS-GLOBAL-022). The 3x4 rule is retired. | `docs/art/DEUS_ASSET_STANDARD.md` |
| **INV-ART-04** | Two-grid-high walls (48x96) carry a flat near-black upper cap (`#08080C`..`#121218`). Rule 13 is suspended under DEC-007; the convention stays as recorded in `tools/clean_packed_sheet.js`. | Not mechanical |
| **INV-ART-05** | Superseded: no autonomous generation of any asset, living or not, without the Owner (DEC-007). | `AGENTS.md` banner |
| **INV-GOV-01** | Superseded: Claude Code is PM (DEC-042); `tools/governance/merge_gate.js` (`git merge --no-ff`) is the only door into `main`; Gemini / Antigravity coordinates its own fleet and keeps its integration duties. | `merge_gate.js` |
| **INV-GOV-02** | One writer per file set at a time: `lane.json` `allowedPaths`, one lane worktree per writer. | `check_invariants.js`; launcher `OUT-OF-SCOPE` |
| **INV-GOV-03** | A reviewer forms the first verdict from the diff and the spec, before the writer's narrative. | `.agents/rules/deus-review-policy.md` |
| **INV-GOV-04** | Task state, defects and evidence are committed or on disk (`docs/agents/mailboxes/`, `docs/telemetry/sessions/`) and survive a crash. | `docs/AGENT_COMMUNICATION_PROTOCOL.md` |
| **INV-GOV-05** | Evidence precedes claims: no "verified", "0 errors" or FPS figure without evidence produced and inspected in the session (Rule 3). | `check_invariants.js`; `tools/governance/check_claims.js` |
| **INV-SOC-01** | Craft, civic office and SRD class are three independent identity axes (design; civilization frozen under DEC-037). | `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md`, `game/js/sim/society/identity.js` |
| **INV-SOC-02** | Current duty is operational state, never an identity axis (design, DEC-037 frozen). | SOC.13.01 |
| **INV-SOC-03** | An office survives its holder as a vacancy; authority sits in the office (design, DEC-037 frozen). | SOC.20.01, SOC.23.01 |
| **INV-SOC-04** | Institutions split by workload, not by population triggers (design, DEC-037 frozen). | SOC.21.01, SOC.22.02 |
| **INV-SOC-05** | Minting turns assayed metal into coin at equal mass; it creates nothing (design; DEC-040). | `game/js/plugins/DEUS_Mint.js`, SOC.30.01 |
| **INV-SOC-06** | Treasury (money) and stores (goods) are separate; money is not food (design, DEC-037 frozen). | `game/js/sim/society/DEUS_Treasury.js`, `DEUS_Quartermaster.js` |
| **INV-SOC-07** | No fixed military ratio; service status is `NONE`, `RESERVE`, `MILITIA`, `GUARD`, `PROFESSIONAL` (design, DEC-037 frozen). | `game/js/sim/society/DEUS_Militia.js` |
| **INV-SOC-08** | Mobilization redirects civilian labour and costs real production (design, DEC-037 frozen). | SOC.40.02, SOC.42.01 |
| **INV-SOC-09** | Class mechanics come only from the 2014 SRD 5.1 (CC-BY-4.0; local untracked copy). | SOC.11.01, `docs/SRD5_1_INTEGRATION.md` |
