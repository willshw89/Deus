# AGENTS.md — the one rulebook for every AI agent on Project DEUS (rewritten 2026-09-29)

**DEUS**: a retro CRPG plus world simulation (Ultima VII interactive world, Dwarf Fortress depth and geology, D&D 5.1 SRD rules, RimWorld jobs). Flat 2D top-down; the 2.5D offsets are retired (Owner 2026-09-29). Formally named DEUS on 2026-09-20 (VISION V124), replacing the working titles "UF", "Ultima Frontier" and "Wayfarer"; the `UF_` prefixes and the `window.UF` alias predate the rename.
**The Owner's word wins over every document.** Owner decisions are recorded as DEC entries in `docs/OWNER_DECISIONS.md`; this file is rewritten to match them, never the other way round.
**Read order at session start:** this file -> `docs/DECISIONS_DIGEST.md` -> `docs/STATUS.md` -> your lane brief (`tasks/<id>/<lane>/BRIEF.md`). Reference only when the work needs it: `docs/OWNER_DECISIONS.md` (full decision text), `docs/ENGINE_RULES.md` (code, data, testing, git).
**Unit of work:** a WBS leaf in `tasks/wbs_registry.json` (DEC-041), worked in one lane worktree under `C:\Users\snewt\.deus_worktrees\`. Slices (`docs/SLICES.md`) are history.
**Art:** frozen except as Rule 11 says (DEC-007, amended 2026-09-29). The SOP is `docs/art/DEUS_ASSET_STANDARD.md`; the catalogue is `art/catalogue/catalogue.json`.
Older rule files (`.agents/rules/*.md`, `docs/CANONICAL_ROLES.md`, `CLAUDE.md`, `GEMINI.md`) point here. Where any of them still differs, this file governs.

## Roles (DEC-042, 2026-09-29)
- **Owner**: approves every lane, package and art asset; is the final art QA; is the only person who can mark work seen in RMMZ Playtest (F5). Owner 2026-09-29: ask the Owner only for design choices, art sign-off and destructive repository actions; keep agents working in parallel and show results in the game.
- **PM: Claude Code**: interprets Owner intent, records decisions in `docs/OWNER_DECISIONS.md`, opens and closes lanes with `[pm]` commits to `tasks/<id>/<lane>/lane.json` (which `tools/governance/merge_gate.js` trusts), runs the gate tests on writer tips before review (DEC-035), routes review, presents QA-passed art to the Owner. The PM never reviews its own family's code.
- **Coordinator: Gemini / Antigravity**: runs its own worker fleet (and runs the gate tests for it), keeps the integration duties it already has (merge gate, pushing `main`), keeps `tasks/wbs_registry.json` and `docs/STATUS.md` current. Does not self-certify.
- **Writers**: Claude, Gemini, Grok or Codex, named per lane in `lane.json`; one writer per file set. Hard logic goes to the strongest available model at `xhigh`; cheaper models or `high` only for mechanical work (DEC-032, DEC-035).
- **Reviewers**: a different model family from the writer (Grok by default; Gemini Pro or Codex when assigned). A reviewer forms the first verdict from the actual diff and its own test run, records the reviewed SHA, and is the only one who closes a defect.
- **Codex**: bounded tooling, harnesses, governance and telemetry utilities; writes plugin code only when a lane assigns it.
- **MiniMax and any other provider**: manual-only until a reviewed adapter and family mapping exist; never relabelled as one of the four families to pass a gate.

## Binding rules
Slots 1-14 keep the meaning they had on 2026-09-21, so every older citation of "Rule N" (decisions, docs, code comments) stays valid; a retired or suspended slot says so in one line. Rules 15 and up were added 2026-09-29.
1. **RETIRED 2026-09-29 (slices).** "One slice at a time" ended with `docs/SLICES.md`; the unit of work is a WBS leaf in a lane (DEC-041), and Rule 6 says what may open.
2. **Nothing is done until it has been seen working**, in RMMZ Playtest (F5) by the Owner (Owner 2026-09-29). The Definition of Done below is the only one that counts; headless tests alone never make anything done.
3. **Never claim what you did not observe.** "Verified", "working", "0 errors", any FPS figure: only with evidence you produced and looked at in this session; otherwise write "not checked". Audit findings go in `docs/AUDIT_LOG.md`, graded BLOCKER / MAJOR / MINOR, each citing a file:line, an opened screenshot or a command output ("looks wrong" is not a finding); open findings in your area come before new work.
4. **Tests must be able to fail.** No hardcoded success. Each check is shown failing once (a mutant or a broken fixture) before it counts (`docs/ENGINE_RULES.md` §5).
5. **Look at every screenshot you produce.** Open it (Read tool), describe what is actually in it and compare it to the acceptance criteria before anyone else sees it; if it is wrong, fix it or report it as wrong.
6. **The Owner approves every lane, package and art asset.** Owner approval before any new WBS leaf or lane, before widening a lane, and before the next package opens (DEC-041); a backlog row, a plan or an idle provider is not approval. A generated asset enters the game only with the Owner's sign-off (Rule 11; VISION V11).
7. **Don't invent the game.** No new lore, place names, races, factions or named characters unless approved in `docs/VISION.md`; placeholder names start with `TEST_`. Player-facing text never uses Ultima or DF proper nouns or signature terms (Avatar, Britannia, Guardian, Lord British, Iolo, Dupre, Shamino, Fellowship, moongate, Urist, Armok, strange mood, fey mood) nor D&D product-identity creatures (beholder, mind flayer/illithid, displacer beast, githyanki); generic fantasy (elves, dwarves, goblins, trolls, dragons) is fine; the longer list is `docs/design/THEME.md`. SRD 5.1 text is CC-BY-4.0 and is credited.
8. **Ultima VII is reference and stand-in only** (Owner 2026-09-18/19). Stand-ins in `game/` start with `U7_`, use exactly 3x scale, are listed in `docs/STATUS.md` -> Stand-ins (the section `tools/originality_check.js`, `tools/generate_asset_inventory.js` and `tools/switch_things_to_stock.js` read), and are replaced before release. No shipped asset may be a copy, trace, recolour, crop or near-copy of a U7 image; every delivered asset passes `tools/originality_check.js`. Dwarf Fortress is a mechanics reference; its raws and text never enter `game/`. `reference/` is local only. Git whitelist and never-committed derived files: `docs/ENGINE_RULES.md` §11.
9. **The engine core is read-only:** `game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/`. Behaviour lives in `game/js/plugins/DEUS_*.js` and `game/js/sim/`.
10. **Two failed fixes means stop.** Write down what you know and what you ruled out, then ask the Owner through the PM.
11. **Art (DEC-007, amended by the Owner 2026-09-29).** The 2026-09-19 Nano Banana Pro mandate that stood in this slot is SUSPENDED since DEC-007 (2026-09-25); the generator is DEC-044 (PixelLab only). Generation stays frozen except PixelLab **OBJECTS and MAPS tools only**, as needed for natural-world tilesets, charsets, chipsets and the like. No PixelLab "Creator" or "Character" prompts; no other generator, tool or scope without the Owner's direct involvement. Every generated asset: (1) has its record in `art/catalogue/catalogue.json` before generation; (2) is prompted per the SOP `docs/art/DEUS_ASSET_STANDARD.md`; (3) passes QA vetting (art style, dimensions, camera orientation, animation that works as intended; nothing substandard gets through); (4) is presented by Claude to the Owner, the final QA, and enters the game only with the Owner's sign-off.
    Camera is **high top-down** for every asset class (AS-VIEW-002). Use the variety object prompts produce for a diverse but READABLE world; each ground kind gets several tile variants so the ground reads as a gradient. Not art, allowed without the Owner: test-harness PNG renders used as evidence, the catalogue, blank template tilesets, and placement/validation tooling.
12. **All animation is sprite frames** (Owner 2026-09-19, VISION V108). Every motion is stepped from discrete frames on the sheet. No procedural scaling, squash, sine sway, rotation or shader distortion; the engine draws no motion of its own.
13. **SUSPENDED under DEC-007 (2026-09-25).** The 2026-09-21 continuous Nano Banana Pro non-living pipeline and its DF black wall-top convention (48x96 near-black cap) stood in this slot; neither binds until the Owner rewrites them. Living beings are never generated without the Owner (DEC-007).
14. **Engineering health (Owner 2026-09-21)** stays binding: `docs/ENGINEERING_STANDARD.md` and `docs/ARCHITECTURE.md`; no full-world scans per frame; data over hardcoding; stable persistent IDs; tagged timers; versioned saves; the sim explains itself through `DEUS_Sheet` and `DEUS_Look`.
15. **Natural World first (DEC-037).** Order: Physical Space -> Matter -> Water -> Soil -> Climate -> Flora -> Fauna. No downstream system until its upstream contract exists and has passed its gate. Civilization, farming, factions and society are frozen; the only Owner-authorized exceptions are the sack inventory and the racial banners. DEC-043 (ghost-model build/craft) is a recorded design, not a lane.
16. **Closed mass (DEC-040 as clarified 2026-09-29).** A lifecycle weight ledger for material generated with the world (stone, soil, sand, clay, ores, metals such as iron and copper) and for water: mined, crafted, rusted, broken, reclaimed, the weight stays the same. Type, volume and density may change; weight may not. Plants, creatures and gases are outside the rule. It must not complicate soil. Material or water that appears from nothing or vanishes without a destination is a blocking defect.
17. **One writer per file set.** Claim in `docs/STATUS.md` section E (one row: lane, writer, whitelist) before editing. Work only in your lane worktree on your `lane.json` `allowedPaths`. Never edit, reset, stash, rebase, prune or repurpose another lane or its worktree; unknown ownership means hold and report.
18. **The merge gate is the only door into `main`.** The integrator runs `node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<id>/<lane>/lane.json --branch <branch> --dry-run`, then the same without `--dry-run` after PASS; it performs `git merge --no-ff`. Nobody commits runtime code (`game/`, `tools/`) to `main` directly, merges by hand, cherry-picks, squashes, or weakens a check to get past a refusal. The PM, or the coordinator for its own fleet, runs the gate tests on the writer tip in a fresh clone before any review (DEC-035).
19. **Independent cross-family review; zero self-certification.** Nobody approves their own family's work, directly or through a subagent. The reviewer records provider, model, reviewed SHA, commands and real exit codes; a WBS closure needs that verdict recorded before the closing edit; any change after review is re-reviewed. The `[tag]` in a commit subject names the agent that actually did the work, and a review commit is authored by the reviewer's own account (`deus-grok`, `deus-codex`, `deus-gemini`; `deus-ops` belongs to no family); never relabel an author or backdate a verdict.
20. **RMMZ editor closed** before anyone changes `game/data/*.json` or `game/js/plugins.js` (confirm with the Owner); afterwards tell the Owner to reopen the project. The editor overwrites both on save.
21. **Absolute dates** (2026-09-29), never "today" or "yesterday", in every doc, commit and report.

## Definition of Done (three levels)
- **L1 Headless:** every gate test in `lane.json` passes on the writer tip in a fresh clone with exit codes recorded; each check has been seen to fail; an independent cross-family review PASS names that SHA.
- **L2 Bridged:** the plugin is registered in `game/js/plugins.js`; the boot check is clean (no new F8 console errors); automated NW.js Playtest evidence exists (nw.exe harness on a snapshot copy, `docs/systems/UF_Test.md`), with its screenshot opened and described; the GAME TRANSLATION block (`tools/ops/GAME_TRANSLATION_TEMPLATE.md`) is filled with observed, not planned, results.
- **L3 Seen by the Owner:** the Owner ran RMMZ Playtest (F5) and saw the behaviour; the record quotes the Owner's words and date.
Required level: tooling, docs and design lanes reach L1 to merge. A lane that changes `game/js/plugins/**` or `game/data/**` reaches L2 to merge. A lane that changes `game/js/sim/**` only may merge at L1 when its brief names the bridge lane that will reach L2 (NAT.02.01, NAT.03.01 and NAT.04.01 merged this way; their bridge lanes are not yet open). A WBS leaf, a package (DEC-041 §5) and every Natural World v1 exit item (DEC-041 §7) is complete only at L3. `docs/STATUS.md` may say **VERIFIED** only at L3, quoting the Owner. Headless tests alone never make anything done.

## Report format (end of every work session; one template for everyone)
```text
## What changed
- <file>: <one-line reason>

## How I tested it
- <commands / steps actually run, with exit codes>

## Evidence
- Screenshot <path>: <one sentence on what is visible in it>
- Log excerpt (copied from the real output, trimmed):

## Game translation (YES/NO each, with evidence or the reason)
Simulation implemented: YES/NO - evidence or reason
Engine bridge implemented: YES/NO - evidence or reason
Presentation implemented: YES/NO - evidence or reason
Input/player interaction implemented: YES/NO - evidence or reason
Save/load implemented: YES/NO - evidence or reason
Playable verification performed: YES/NO - evidence or reason
Done level reached: L1 / L2 / L3

## Not done / known problems
- ...

## Try it in RMMZ
1. ...
Expected: ...

## Decisions needed
- ...
```
If "Not done / known problems" is empty, reread your evidence. It is almost never empty. Unknown is written as NO plus "NOT VERIFIED", never as a success.

## Banned in reports
- "verified 100%", "fully operational", "production-ready", "seamless", "authentic" (about our own work), and any "% operational"
- Any FPS figure without the measurement method (`docs/ENGINE_RULES.md` §7)
- Describing an image you did not open, or a file you did not read
- Listing features that are not in the code; calling planned proof observed proof

## Commit and claim rules
- Claim before you start (Rule 17); remove the claim when you report.
- Commit at the end of every task, one task per commit, subject starting with your tag. The seven tags: `[claude]`, `[gemini]`, `[grok]`, `[codex]` (the four families; the tag is the agent that did the work), `[minimax]` (manual MiniMax results, never relabelled), `[pm]` (lane administration by the PM only; never a review), `[ops]` (launcher prompt commits; never a review; never touches `lane.json`).
- Stage only your own files: `git add <paths>`. Never `git add -A`, `git add .`, `git commit -a`, `--no-verify`, or a blanket clean or reset; protected untracked files (art, references, saves, secrets, prompts, telemetry, worker logs) stay where they are.
- A writer pushes only its own lane branch (`git push origin task/<lane>`), and only when its launch prompt says so (`lane.json` `push: true`); otherwise the integrator pushes the lane branch. The gate needs the lane branch on `origin`. Nobody but the integrator pushes `main`, after a gate merge. Runtime code reaches `main` only through the gate (Rule 18); DEC-042 words it "the only way into `main` for reviewed code", so governance records (decisions, `docs/STATUS.md`, `tasks/wbs_registry.json`, lane manifests, briefs) may be committed to `main` directly by the PM or the coordinator, pending Owner confirmation of that boundary (asked 2026-09-29, `docs/STATUS.md` section D).
- A running CLI worker reads its prompt only at launch: editing a rule file does not change an in-flight worker.
