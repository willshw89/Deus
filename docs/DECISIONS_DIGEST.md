# DEUS Decisions Digest

Derived from `docs/OWNER_DECISIONS.md` (the only decision log) on 2026-09-29. One line per LIVE rule, with its source. No history, options or reasoning: the log entry has them. Where this file and the log disagree, the log wins. Rebuild this file whenever a decision changes.

## Authority and roles
- DEC-042: Claude Code is the PM: records Owner decisions in the log, opens and closes lanes with `[pm]` commits, routes review, presents QA-passed art to the Owner.
- DEC-042: Gemini / Antigravity coordinates its own worker fleet and keeps its integration duties; Grok reviews; Codex does bounded tooling (`docs/CANONICAL_ROLES.md`).
- DEC-039 item 1: rules hierarchy is Owner decisions > SRD 5.1 > vanilla Minecraft Java behaviour > DEUS physical interpretation > original DEUS content.
- DEC-032 item 9 / DEC-042: zero self-certification; no provider reviews its own family's code, the PM included; review is independent and cross-family.
- DEC-035 item 1: the PM runs every `lane.json` gate test on the writer tip in a fresh clone before any review; a failing gate goes back to a fix pass.
- DEC-035 items 2-3: strongest available model at `xhigh` for hard logic; `high` or cheaper only for purely mechanical work; Gemini 3.1 Pro is the merge-gate reviewer when available.
- DEC-032 items 1-2, 4, 7-8: Big-tier lanes use the top model at max effort; effort never drops below the tier standard; step down a provider's chain on limit errors; multi-agent on by default.
- DEC-041 items 3-4, 6: every lane ends MERGED, REJECTED, SUPERSEDED or PAUSED-BLOCKED; a worktree is removed only after merge SHA, push, review evidence and report are on main; `tasks/wbs_registry.json` is master truth.
- DEC-041 item 5: when a package completes, orchestration halts for explicit Owner approval before the next implementation lanes open. Owner 2026-09-29 (DEC-041 status): ask the Owner only for design choices, art sign-off and destructive repository actions; keep agents working in parallel and show results in the game.
- DEC-004 default: no `--no-verify` without a written Owner entry in the log.
- DEC-008: heavy-job cap lifted; any power loss reinstates `MAX_SIMULTANEOUS_HEAVY_LOCAL_JOBS=1` until the Owner lifts it.
- DEC-005 / DEC-029: `origin` is the private GitHub remote; no git history purge, filter-repo or force push on `origin/main`. OPEN: the Owner's 2026-09-29 answer "purge history" was read as "no history in this digest"; if it meant git, DEC-029 needs an Owner amendment first (`docs/STATUS.md` D.9).
- `.agents/rules/deus-multiagent-routing.md` (Owner 2026-09-28): MiniMax and other unsupported providers are manual-only.
- AGENTS.md Rule 10: two failed fixes on the same problem: stop, write down what is known, ask the Owner.

## Scope and phase lock
- DEC-037 item 1: Lean Natural World v1 only; defer luxury features, cut redundant systems.
- DEC-037 item 2: build in this order: Physical Space -> Matter -> Water -> Soil -> Climate -> Flora -> Fauna; no downstream runtime before its upstream contract passes its gate.
- DEC-037 item 3: civilization, farming, faction and society implementation is frozen; Owner-authorized exceptions (2026-09-29): the sack inventory and racial banners.
- DEC-043: ghost / under-construction / final build model and workbench crafting are recorded design only, not a lane.
- DEC-041 item 7: Natural World v1 closes only on the fixed-seed 12-point in-engine scenario.
- Owner 2026-09-29 (AGENTS.md Definition of Done; DEC-001 status): nothing is complete without in-game RMMZ F5 proof seen by the Owner; headless tests alone never count.
- DEC-039 item 4: worldgen order is seed -> terrain -> geology -> water -> soil -> vegetation -> fauna -> structures; regeneration only through physical rules, never respawn timers.
- DEC-039 items 2-3, 5: use the SRD first, Minecraft behaviour where the SRD is silent; copy behaviour, never assets or code; record SOURCE, REFERENCE BEHAVIOR, DEUS TRANSLATION, DEVIATIONS.
- DEC-023: ore, stone and gem deposits are finite and never respawn.
- DEC-027: combat is SRD 5.1 (d20 vs AC, SRD damage, HP, actions, conditions) behind `UF.Rules`, seeded and deterministic.
- DEC-018: spell effects play out physically on top of unchanged SRD numbers; one effect schema, zero per-spell code.
- OPEN defaults in force: DEC-009 (`uf.hex` interim; master-palette migration release-blocking), DEC-010 (lateral rock connectivity is sufficient support).

## Closed mass
- DEC-040 (clarified 2026-09-29): a lifecycle weight ledger for material generated with the world (stone, soil, sand, clay, ores, metals) and for water; type, volume and density may change, weight may not.
- DEC-040 clarification: plants, creatures and gases are outside the rule; the ledger counts weight, not chemistry, and must not complicate soil.
- DEC-040 item 2: no deletion sinks; material or water that appears from nothing or vanishes without a destination is a blocking defect.
- DEC-040 item 5: lava and magma are mass-transfer reservoirs, not sinks; the planetary core is not an infinite faucet.
- DEC-028 items 1, 4: mining, building and collapse move exact weight; `game/js/sim/ledger*` is the single accounting instrument.
- DEC-028 items 2-3: terrain reclaims abandoned outdoor stone and metal by weight (stone -> stone; metal -> rust, scrap or trace, never virgin ore); items inside active or enclosed structures are exempt.

## Engine and process
- AGENTS.md Rules 9 and 18 / DEC-042: `game/js/rmmz_*.js`, `main.js` and `libs/` are read-only; the merge gate (`tools/governance/merge_gate.js`, `git merge --no-ff`) is the only door into main.
- DEC-012: the simulation is plain JS with no RMMZ, PIXI or DOM dependency on a fixed 10 Hz headless tick (the action-domain round is the 6 s SRD round, AS-SCALE-001; other cadences are targets); RMMZ renders snapshots and queues orders; distant regions run coarse LOD that conserves mass and population.
- DEC-017: RMMZ stays for menus, dialogue, save, database and battle; a custom PixiJS map renderer inside `Scene_Map` is the fallback, decided with the Owner after benchmarks.
- DEC-013 item 3 / D-3: sparse storage in memory and in saves; cost scales with occupied cells, not 32 x area.
- DEC-021: anything under an opaque upper layer is not drawn; draw cost is bounded by exposed screen area.
- DEC-024: `DEUS_Fluid` is the open-water authority; groundwater is the NAT.03.01 aquifer kernel (DEC-038 items 5, 9), which hands seeped water to it.
- DEC-016: the scale chart (`game/data/DEUS_ScaleRegistry.json` / `art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`) is the size authority for catalogue, templates and placement.
- DEC-020 / DEC-022: ramps and multi-layer slopes carry units across layers with no transfer or load; targeting and range use true 3D geometry through openings.

## Art
- DEC-007: art generation is frozen without the Owner, except the 2026-09-29 PixelLab opening: OBJECTS and MAPS tools only, for natural-world tilesets, charsets and chipsets; no Creator or Character prompts.
- DEC-007 amendment 2026-09-29: the catalogue record in `art/catalogue/catalogue.json` exists before generation; the prompt follows `docs/art/DEUS_ASSET_STANDARD.md` (the SOP).
- DEC-007 amendment 2026-09-29: QA vetting before entry: style, dimensions, camera orientation, working animation; nothing substandard passes.
- DEC-007 amendment 2026-09-29: the Owner is final QA; Claude presents each QA-passed asset for sign-off; it enters the game only with that sign-off.
- DEC-007 amendment 2026-09-29 / AS-VIEW-002: every PixelLab prompt, for every asset class, uses the high top-down view.
- DEC-007 amendment 2026-09-29: each ground kind gets several tile variants so the ground reads as a gradient; ground kinds stay distinguishable.
- DEC-007 amendment 2026-09-29: use object-prompt variety for a world that is diverse but readable.
- DEC-044 (AS-GEN-004/005): PixelLab is the sole production generator; Retro Diffusion standby; Nano Banana Pro concepts only (both dormant under DEC-007: nothing but PixelLab OBJECTS and MAPS without the Owner); one generator per category and per layered set.
- DEC-007 amendment 2026-09-25: the catalogue, blank templates and placement/validation tooling are not art and need no Owner.
- AGENTS.md Rule 12: all animation is sprite frames; the engine draws no motion of its own.
- AGENTS.md Rule 8: Ultima VII only as reference or `U7_`-prefixed stand-in; every shipped asset passes the originality check.
- DEC-011: every Z layer renders 1:1: no blur, scale, parallax, tint or filter; depth cues 7-9 only in an Owner-led session.
- DEC-019 item 4: one top-surface tile per terrain plus edge/cliff strips per height difference; no full tile set per height.

## Presentation and physical calibration
- DEC-013 item 2 / DEC-038 item 3: 1 cell = 5 ft x 5 ft; 1 Z layer = 10 ft; 5 strata of 2 ft per layer. OPEN: the art SOP (AS-GLOBAL-018, AS-SCALE-001, AS-QTR-001) says 5 ft, 48 px, four 12 px quarters; the log governs until the Owner rules once (DEC-016 `stratumPx`; `docs/STATUS.md` D.5).
- DEC-013 item 1 / DEC-038 item 7: 32 Z layers (-16..+15, surface 0); tests also run at 9; 32 Z and 768x768 are v1 envelopes, not engine ceilings.
- DEC-038 item 2: depth bands Deep Earth -16..-11, Caverns -10..-5, Lowlands -4..+1, Uplands +2..+6, Highlands +7..+11, Sky +12..+15.
- DEC-038 item 1: physics is four continua (temperature, moisture, volcanism, wildness) over elevation; biome names are derived labels, not enums.
- DEC-038 item 3: integer units: centipounds (1 gal = 834), basis points, millistrata, centi-Fahrenheit, ticks. Carry capacity is SRD Str x 15 lb (AS-SCALE-001); the old 8-slot / 60 kg invariant is retired.
- DEC-038 items 4-6: slope accumulates continuously onto the 2 ft lattice; aquifer head, harmonic-mean conductivity, residual accumulator; elevation cooling is a configurable coefficient.
- DEC-038 item 8: 360-day calendar: 12 months x 30 days, 4 seasons x 90 days, zero-based day-of-year.
- DEC-030: the world is a 3x3 grid of 256x256 maps wrapping on all edges; grid size is data; seams use the in-place swap.
- DEC-019 items 1-3: strata raise sprites by a fixed vertical pixel shift; 1 stratum = step, 2 = climb, a full layer = stairs or ramp; falls, reach and line of sight use real 3D height. OPEN: Owner to confirm the stratum shift is not the retired 2.5D offset (Owner 2026-09-29; INV-GEO-05).
- DEC-011 amendments: lower-layer overlays (HP bars, effects) render 1:1 unfiltered; selection and group orders work across layers.
