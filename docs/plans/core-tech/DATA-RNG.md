# DATA-RNG — named deterministic simulation streams

**Status:** PARKED Owner-requested lane stub, 2026-10-03; first foundation job after green ORG-0.2 and WORLD-3x3. **Writer:** Grok. **Reviewer:** Claude (cross-family).

**Why the player cares:** The same world seed and commands should produce the same terrain, history, fights, and unit decisions after a reload or a different frame rate.

Derive a stream for each simulation system from the world seed plus a stable system name. Audit worldgen, history, combat, AI, ecology, and later weather separately; a change in one system's draws must not silently perturb another's. Define how stream state or counters are saved and restored. An unseeded choice of the **initial** world seed is input selection, not a simulation draw.

The main `038a02c3` `Math.random` search includes initial seed selection in `DEUS_World.js` and `DEUS_FactionMenus.js`, presentation barks in `DEUS_Visuals.js`, RNG fallbacks in `DEUS_Dnd5e.js` and `DEUS_Callings.js`, and a `DEUS_StructuralPhysics.js` crushing-roll stub. These must be classified by actual loading/call path before edits: the literal match count is not a count of live nondeterministic simulation sites. Replace every **live simulation** `Math.random` use with the named seeded authority; keep clearly cosmetic, non-state-changing randomness separate and document it. DEC-037 still blocks faction/society behavior changes.

[seedrandom](https://github.com/davidbau/seedrandom) is an optional implementation candidate; its upstream [README states MIT](https://github.com/davidbau/seedrandom/blob/master/README.md#license-mit). No dependency is selected or copied here. Recheck its license at lane start; any vendor file needs the Owner's explicit first-file OK and the [notice rules](README.md#external-code-candidates-and-source-rules).

**Acceptance gate:** A lint check fails for any newly introduced `Math.random` in a declared simulation path. On at least five controlled seeds, identical input sequences produce matching deterministic world/simulation hashes, including after save/load; different seeds remain distinguishable. Run native `run_tests.bat`, name the seed/year, report counts and failure names, obtain cross-family review, and have Deus confirm on the laptop. No runtime result is claimed by this stub.
