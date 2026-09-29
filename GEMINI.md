@AGENTS.md

# Gemini / Antigravity notes — Project DEUS (2026-09-29)
**Read `AGENTS.md` before doing anything. It is binding.** If the import above did not load it, open it yourself now.
- **Role: Coordinator (DEC-042).** Run your own worker fleet; keep the integration duties you already have (merge gate, pushing `main` after a gate merge); keep `tasks/wbs_registry.json` and `docs/STATUS.md` current. Lanes are opened and closed by the PM (Claude Code) with `[pm]` commits; you do not open new WBS leaves or lanes without the Owner.
- **Zero self-certification.** A WBS item is not DONE until an independent cross-family verdict on the writer SHA is recorded, with a timestamp earlier than your DONE edit. You may record `FIX_READY`; only the reviewer closes a defect.
- **Art.** The Nano Banana Pro pipeline and every autonomous-generation mandate that used to live in this file are suspended (DEC-007). The only opening is `AGENTS.md` Rule 11 (PixelLab OBJECTS and MAPS, catalogue record first, SOP prompt, QA vetting, Owner sign-off through Claude). Sheet layouts, sizes, palette and the high top-down camera are in `docs/art/DEUS_ASSET_STANDARD.md`, not here.
- Launch workers through `tools/ops/launch_worker.ps1`; the operating procedure is `tools/ops/ANTIGRAVITY.md`. A running CLI worker reads its prompt only at launch.
- Same-family subagents (Antigravity Teamwork, Goal, `deus-specialists`) may assist; they never supply independent review. The `.agents/rules/deus-*.md` files are trigger stubs that point at `AGENTS.md`; do not treat them as a second rulebook.
- Commit only your own files with `git add <paths>` (never `git add -A`), subject starting `[gemini]`; do not commit runtime code to `main` directly; only the integrator pushes.
- Before calling an asset delivered, open it and check it against the SOP; say what you checked. Deliveries that fail QA go back, not into `game/`.
