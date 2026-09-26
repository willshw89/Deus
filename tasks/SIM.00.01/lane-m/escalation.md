# Lane M (SIM.00.01) escalation: ADR-003 Rev 3

Writer: Claude (Lane M), 2026-09-26. Branch `task/lane-m`.

Standing rule 6 says to write this file when a read-only shared file has a bug, or two sources disagree in a way the brief doesn't settle. Nothing below blocks Rev 3, and nothing below was changed: every file named here is outside Lane M's write set.

## E1. WBS rows cite the wrong DEC and VISION ids (coordinator files)

At `b612bc72`, three WBS rows cite decision ids that `docs/OWNER_DECISIONS.md` gives to other decisions:

| WBS row | Line | Cites | `docs/OWNER_DECISIONS.md` records the ruling as |
|---|---|---|---|
| WG.00.20 (seamless ramps) | `docs/worldgen/DEUS_WORLDGEN_WBS.md:108` | DEC-017 | DEC-020 (`:282`) |
| WG.00.21 (occlusion) | `docs/worldgen/DEUS_WORLDGEN_WBS.md:109` | DEC-018 | DEC-021 (`:293`) |
| GP.07.02 (cross-layer targeting) | `docs/worldgen/DEUS_WORLDGEN_WBS.md:577` | "DEC-019; V148" | DEC-022 (`:304`); VISION has it as V151 (`docs/VISION.md:412`), while V148 is the overlook placeholder (`docs/VISION.md:409`) |

- **Why this doesn't block Rev 3.** The Rev 3 brief says to cite each decision by id and heading from `docs/OWNER_DECISIONS.md`. The ADR does that.
- **What it needs.** The coordinator corrects the three references. The ADR lists this as Q20.

## E2. V135 labels fluid depths for 1 ft strata; DEC-013 as amended makes strata 2 ft

- V135 (`docs/VISION.md:129`) ties the five fluid depth states to "the 5 physical 1 ft strata per 5 ft cell (1 ft = Depth 1 … 5 ft = Depth 5)".
- DEC-013 as amended (`docs/OWNER_DECISIONS.md:181`) and V136 (`docs/VISION.md:130`) make a stratum 2 ft and a layer 10 ft.
- The engine comments agree with V135, not with DEC-013: `game/js/plugins/DEUS_Levels.js:985-986` and `:1790-1791`.
- **Why this doesn't block Rev 3.** The brief tells the ADR to adopt the 2 ft stratum. The ADR does, and asks the Owner whether the five states stay and only their feet change (Q17). It doesn't resolve the question.
- **What it needs.** An Owner ruling on Q17, then a VISION edit by the coordinator.

## E3. `main` moved during the run

- Lane N (SIM.00.00) was merged at `e27e8be5` while Rev 3 was being written. It changes `game/js/plugins/DEUS_Levels.js` and `game/js/plugins/DEUS_World.js`.
- The brief pins citations to `b612bc72`, and the ADR keeps that pin and says so.
- Appendix C of the ADR counts which citations into those two files still read the same at `e27e8be5`. A later amendment can re-pin them.
