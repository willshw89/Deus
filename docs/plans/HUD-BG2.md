# HUD-BG2 - parked design input

**Status: PARKED; design input missing.** Recorded 2026-10-03 from the Owner's renewed overnight queue, which requests a "HUD-BG2 design note" alongside the CORE, DATA and DISPLAY plans. This page preserves that requested item; it does not supply or approve a HUD design. Documentation author: Codex/GPT (PM). Implementation staffing and order are not assigned here.

## Available authority and missing input

The queue supplies the identifier HUD-BG2 and asks for a design note. It supplies no layout, controls, screenshots, reference example or acceptance criteria. A read-only search on 2026-10-03 found no earlier HUD-BG2 brief or design note in the inspected docs, tasks, scratchpad, existing worktrees or Git history. That is a bounded search result, not proof that the Owner has no reference outside the repository.

The meaning of BG2, the desired player interaction, named runtime consumers, and the reason the player needs this change remain unspecified. Do not infer them from the identifier or invent features, visual styling, assets, hotkeys, screen regions or tests.

Required before a design can be written:

- The Owner's intended reference or pasted design requirements.
- The proposed player-visible behavior and what current behavior it replaces, if anything.
- Approval boundaries, acceptance evidence, implementation ownership and scheduling.

## Freeze and existing dependencies

ORG-0.2 remains the only active build goal. No HUD-BG2 implementation starts before worldgen is green, and this note does not itself authorize implementation after that gate. DEC-037 remains in effect. The already filed [DISPLAY-16x9 plan](core-tech/DISPLAY-16x9.md) goes immediately after WORLD-3x3 and before further visual baselines; this note changes none of that order and chooses no HUD-BG2 slot.

No code, game data, image, screenshot baseline or performance setting changed for this note. No art generation or asset induction is authorized. Engine core, game/js/libs/, art/sprites/ and PROVIDER_USAGE_STATUS.json remain protected.

## Evidence and next action

This is a record of missing design input. Native tests, performance measurements, screenshots and Deus confirmation were not performed and are not claimed. Once the reference is available, a later design-only update can state the proposal and its acceptance criteria for Owner approval. Until then, keep this item parked and work the other authorized queue items rather than guessing.
