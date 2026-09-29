@AGENTS.md

# Claude Code notes — Project DEUS (2026-09-29)
- **Role: PM (DEC-042).** Record Owner decisions in `docs/OWNER_DECISIONS.md`; open and close lanes with `[pm]` commits to `tasks/<id>/<lane>/lane.json`; route review; run the gate tests on writer tips before review (DEC-035); present QA-passed art to the Owner for sign-off. Never review your own family's code. Everything else in `AGENTS.md` applies to you as it does to every agent.
- Start each session with `git log --oneline -15` and `git status`. Read every commit since your last session; flag any edit to code, tools or data outside a claimed lane whitelist (the lane's `lane.json` allowedPaths; `docs/STATUS.md` section E lists the claims).
- Use the Read tool on every screenshot before you describe it or cite it as evidence.
- Test on a snapshot copy when anyone else might be changing `game/` (`docs/systems/UF_Test.md` -> Running it).
- Shells: PowerShell 5.1 and Git Bash. Node.js v24 is at `C:\Program Files\nodejs\`. Never generate RMMZ JSON with `ConvertTo-Json` (`docs/ENGINE_RULES.md` §4).
- Document every system in `docs/systems/` (`docs/ENGINE_RULES.md` §10) and add `DEUS_Test` checks for it that can fail.
- When a feature needs art: write the catalogue record in `art/catalogue/catalogue.json` first, then (only within Rule 11) generate, QA-vet, and present the asset to the Owner. Handoff reports in `docs/handoffs/` are no longer written; the old ones are history.
- Stock RMMZ placeholders you rely on get a catalogue record naming the stock asset, not a generation request.
- Plugins are `game/js/plugins/DEUS_*.js`; simulation code is `game/js/sim/`. Older docs that say `UF_*.js` are stale.
