# Independent Review: Commit `d1fbeab`

**Commit:** `d1fbeab84a9ca07fce905f65d5bbffc6148c566c`, "[gemini] DEUS-DIR-001 Housekeeping, WBS Rev 15, STATUS ledger split, and policy updates" (18 files, +5,692 / −5,189)
**Reviewer:** Claude CLI, Lane C3 (`task/lane-c3`, worktree at `048752c`). Not the commit's author.
**Date:** 2026-09-25
**Scope:** every file in the commit. That covers the six areas the brief names, plus the STATUS split, ADR-002, baseline, prompts, audits banners, handoff banner, MODEL_AVAILABILITY and the closure of ARCHITECTURE-CLEANUP-001.
**Directive text:** DEUS Directive 001 / 001-A..D is not in the repository. I judged compliance against:
- the directive as the repository reflects it: STATUS, OWNER_DECISIONS, the WBS revision log, and BRIEF.md;
- the binding rules in `AGENTS.md`.

## Verdict

**FAIL.** There is 1 BLOCKER: the STATUS split breaks the originality gate (AGENTS rule 8). It needs a fix in `docs/STATUS.md`, which only Gemini may write.

| ID | Grade | Area | One line |
|---|---|---|---|
| R1 | **BLOCKER** | STATUS split | The `## Stand-ins`, `## In progress` and `## Backlog` sections went to the archive. `originality_check.js` now FAILs 1,016 of 1,017 PNGs. |
| R2 | **MAJOR** | DW→WG crosswalk | `DW.01.06` (autotile standard, paused at gate) is mapped onto `WG.00.06` (strata geometry) and marked `DONE`. |
| R3 | **MAJOR** | DEC-001 | The recommended default would close WG.00.08 without the F5 Playtest that the binding Definition of Done requires. It doesn't say so, and the proof PNG it cites is not in git. |
| R4 | **MAJOR** | ADR-002 Rev 1 | "APPROVED / CANONICAL" with false facts: 384 colours, and the master palette presented as the runtime source. Addressed by ADR-002 Rev 2 in this lane's commit. |
| R5 | MINOR | INV-SOC-09 | The invariant now points at an untracked PDF and doesn't name the tracked SRD catalogue. |
| R6 | MINOR | Handoff banner | "FABLE-19A and FABLE-19B are complete" contradicts WG.00.08 → `REVIEW` in the same commit. |
| R7 | MINOR | WG WBS Rev 15 | WG.00.08 lost its commit reference. `REVIEW` and `IN_PROGRESS` are outside the WBS's stated vocabulary. WG.00.12 is tagged "(Lane C1)" only. |
| R8 | MINOR | WG WBS Rev 15 | The description of WG.00.07, a `DONE` leaf, was edited. The content is correct, but the WBS anchor allows only status changes. |
| R9 | MINOR | WG WBS Rev 15 | Binding Rule 1 (one active implementation leaf) is unchanged, while the same commit's STATUS runs parallel lanes. |
| R10 | MINOR | DW deprecation | DW.02–DW.04 (13 `QUEUED` leaves) have no mapping and no `SUPERSEDED` marking. The header still reads "CANONICAL & FROZEN". |
| R11 | MINOR | OWNER_DECISIONS | "Nothing … waits on Owner input unless logged here" conflicts with AGENTS rule 6. DEC-004 cites a tool that doesn't exist yet. |
| R12 | MINOR | MODEL_AVAILABILITY | "Owner-confirmed 16:25" has no date or timezone. |
| R13 | MINOR | Commit shape | One commit bundles about 9 unrelated changes, including a 5,179-line move. |

Hunks with no findings are listed at the end.

---

## R1: BLOCKER. The STATUS split removed sections that tools and binding rules read

**What changed.** `docs/STATUS.md` went from 5,179 lines to 60. The old file is now `docs/archive/STATUS_LEDGER_20260925.md`. `cmp` shows the archive is byte-identical to `d1fbeab^:docs/STATUS.md`, so nothing was lost. The new STATUS has five sections: hardware, lanes, ownership, defects, models. It **no longer contains**:
- `## In progress` (old line 28);
- `## Stand-ins (U7-derived files …; AGENTS rule 8)` (old line 5131);
- `## Backlog (not scheduled)` (old line 5166).

**What depends on them:**
- `tools/originality_check.js:41-42` looks for `^##\s+Stand-ins`. When the heading is missing it sets `error = 'Stand-ins heading not found'`. `standInPolicy` then returns `policy-error` for every `game/img` PNG not named `U7_` (line 76-79), and `policyFailure` turns that into **FAIL** (lines 93-95). This check is how AGENTS rule 8 is enforced ("every delivered asset passes `tools/originality_check.js` … before it goes into `game/`").
- `tools/generate_asset_inventory.js:154,173`: the `standins_parsed` check needs at least one line under that heading. This is inferred from the code; I did not run the tool, because it writes `docs/ASSET_INVENTORY.md`.
- The same sections are named in:
  - `AGENTS.md:19` (rule 1: "Ideas go to `docs/STATUS.md` → Backlog");
  - `AGENTS.md:113` ("Add a line under 'In progress' in `docs/STATUS.md`");
  - AGENTS rule 8 and `docs/GUIDE_25D.md:41` ("List each stand-in in `docs/STATUS.md` → Stand-ins");
  - the `.gitignore` comment ("docs/STATUS.md → Stand-ins").

  The `AGENTS.md` hunk in this commit updated the read order but none of these.

**Observed.** I ran `standInPolicy()` over all 1,017 PNGs in `game/img/characters/` and `game/img/tilesets/`:

| STATUS used | `policy-error` (FAIL) | declared stand-in | goes on to pixel scoring | `U7_` reserved name |
|---|---:|---:|---:|---:|
| HEAD (post-`d1fbeab`) | **1,016** | 0 | 0 | 1 |
| `d1fbeab^` (read in-process through a patched `fs.readFileSync`; no file written) | 0 | 9 | 1,007 | 1 |

Before the split the declarations loaded as 8 stand-in lines: 113 names and 15 globs. `!$Campfire.png`, for example, was declared at old STATUS line 5148; after the split it is not declared anywhere the tools read.

**Fix** (Gemini, since `docs/STATUS.md` is Gemini-exclusive):
- Restore `## In progress`, `## Stand-ins …` and `## Backlog (not scheduled)` into `docs/STATUS.md`, copied verbatim from the archive.
- The Stand-ins heading must start with `## Stand-ins`, and each declaration must keep the first-pipe-field grammar that `originality_check.js:46-50` parses.
- This is smaller than changing three tools to read the archive, and it keeps AGENTS.md true.

**Re-check after the fix:**
```bash
node -e "console.log(require('./tools/originality_check.js').standInDeclarations().error)"
```
It must print `null`. Before the fix it prints `Stand-ins heading not found` (observed 2026-09-25).

---

## R2: MAJOR. The crosswalk maps DW.01.06 onto a leaf with a different scope and marks it DONE

- **`docs/art/DEUS_WORLD_WBS.md:32`**: `DW.01.06`, "Freeze Seamless Autotile & Terrain Assembly Standard" (autotile bitmasking, border blending, corner logic, multi-layer elevation edges). Status: **`AUTHORIZED (PAUSED AT GATE)`**, ref "Pending FABLE-19 track".
- **`docs/worldgen/DEUS_WORLDGEN_WBS.md:93`**: `WG.00.06`, "Five-Strata Geometry Foundation" (strata storage, cached shapes, damage API). `DONE (FABLE-19A / edba004)`.
- **The crosswalk row (`DEUS_WORLD_WBS.md:84`)**: `DW.01.06 → WG.00.06 | Seamless Autotile & Terrain Assembly Standard | DONE (Geometry Foundation)`.
  - Its "Canonical Leaf Title" is not WG.00.06's canonical title.
  - Its `DONE` contradicts DW.01.06's own row 52 lines above it in the same file.
- This breaks two rules:
  - `DEUS_WORLD_WBS.md` §1.1: every ID has "exactly one permanent, approved scope";
  - the WG anchor (`DEUS_WORLDGEN_WBS.md:8`): "Never silently renumber, merge, or reuse".

  In effect, an unexecuted art standard now reads as done.
- **Fix:** don't map DW.01.06 to a DONE leaf. The autotile scope matches planned WG leaves: `WG.10.01` Ground Layer Assembly Architecture, `WG.21.01` Ground Autotile & Macro-Variety Rules, and `WG.30.02` Autotile Block Geometric Mapping (all `PLANNED`). Two options:
  - map it as `SUPERSEDED by WG.30.02 / WG.10.01 (PLANNED)`;
  - leave it unmapped with its paused status.

  The Coordinator chooses.
- The other five rows (DW.01.01–05 → WG.00.01–05) match the WG table: scope, `DONE` status, and the `(DW.01.0x)` back-references at `DEUS_WORLDGEN_WBS.md:88-92`. The crosswalk titles are shortened ("Native Resolution & Pixel Density Standard" against WG's "Native 1:1 Resolution Standard"), but the scope is the same.

---

## R3: MAJOR. DEC-001's recommended default conflicts with the binding Definition of Done, and its evidence file is not in git

**The conflict.** `docs/OWNER_DECISIONS.md:30` recommends Option 1: close WG.00.08 on an "automated NW.js test + rendered map proof".
- `AGENTS.md:49` (Definition of Done) requires "It runs in the RMMZ editor's Playtest (F5), not only through a script".
- `DEUS_WORLDGEN_WBS.md:23` (Binding Rule 4) requires "running in actual RMMZ Playtest (NW.js / F5)".
- The owner may override either, but AGENTS.md then requires recording the change in `docs/VISION.md` → Decision log. DEC-001 mentions neither the conflict nor that step. An owner accepting the recommended default would waive a binding rule without being told.

**The evidence file.**
- DEC-001 cites `game/test_output/z2_cut_proof_seed18_194_89.png`. `game/test_output/` is git-ignored (`.gitignore`, "Generated by test runs"), and `git log --all -- <that path>` is empty, so the PNG was never committed.
- The same commit's STATUS (Lane A row, line 23) says "Z-2 cut proof committed in `8d1c7c3`". What `8d1c7c3` committed is the generator `tools/test_generated_z2_cut_proof.js`.
- The PNG exists only in the main checkout (4,598 bytes, 2026-09-25 16:09). I opened it. It is a 512×512 top-down map: two greens, light-grey patches, dark grey-brown winding channels, and a purple channel near the centre with a red crosshair at about (258, 258). The image has no label, legend, Z-level or seed. On its own it does not show that the channel is on Z-2.

**Fix:**
- DEC-001 should cite AGENTS.md:49, and say that Option 1 is a Definition-of-Done override to be logged in VISION.
- STATUS should say "proof generator committed in `8d1c7c3`; PNG regenerated locally by `node tools/test_generated_z2_cut_proof.js`".

---

## R4: MAJOR. ADR-002 Rev 1 was marked APPROVED / CANONICAL with false facts (addressed by this lane)

Measured at `048752c`; the full evidence is in ADR-002 Rev 2 §2.

| Rev 1 statement | What the repository shows |
|---|---|
| "`uf.hex` (384 colors)" | 256 entries, 250 distinct. |
| The master palette is "the single canonical source of truth for all world … art" | No runtime colour source uses it: 0 of 101 ground-shade tones, 0 of 7 flame colours, 0 of 168 plugin literals. |
| `art_check.js` and quantizers "prioritize" the master palette | `art_check.js` checks against the master registry only on sidecar or flag opt-in. 202 tools reference `uf.hex`. |
| `uf.hex` was used by "historical prototype artwork" | Current runtime code and data use it. It is the Ultima VII daylight palette: 256/256 entries match `tools/extract_palette.ps1` run on U7 `PALETTES.FLX`. |

- **Also found.** The `DEUS_Tiles.js:1392-1397` `palette_only` check passes when the shade atlas is 768×768, and reads no colours, yet its message claims "100% uf.hex palette compliance".
- **Status:** ADR-002 Rev 2 is committed on `task/lane-c3`, PROPOSED and awaiting Coordinator acceptance. The `DEUS_Tiles.js` check is outside Lane C3's write set; it is listed as migration test T2 in ADR-002 §4.3.

---

## R5: MINOR. INV-SOC-09 now names an untracked file as the only source

- **New text** (`docs/INVARIANT_REGISTRY.md:93`): "derive exclusively from the 2014 SRD 5.1 (CC-BY-4.0) specification (local untracked reference copy)."
- The only local copy is `SRD_CC_v5.1.pdf` at the root of the main checkout. It is ignored by `.gitignore:3` (`/*`), no tracked file matches `SRD_CC`, and worktrees and clones don't contain it.
- The tracked SRD data are not mentioned:
  - `game/data/srd51/`: 7 files, described in `docs/SRD_CATALOGUE_CROSSWALK.md:3` as the content library;
  - `game/data/srd5_1/`: 15 files, described in the same place as the legacy folder.
- As written, the invariant can't be checked from the repository. It would also allow transcription straight from the PDF, bypassing the catalogue and its verification marks.
- The old wording ("located in the UF project repository") was wrong about the PDF, so the clarification is an improvement. It is still incomplete.
- **Suggested wording:** "…derive exclusively from SRD 5.1 (CC-BY-4.0) through the tracked catalogue `game/data/srd51/`; records are verified against the local, untracked `SRD_CC_v5.1.pdf` before use."

## R6: MINOR. The handoff banner contradicts the WBS change in the same commit

- `docs/DEUS_TSK_FABLE_19_HANDOFF.md:2`: "FABLE-19A and FABLE-19B are complete; 19C is queued."
- The same commit returns WG.00.08 (FABLE-19B) to `REVIEW` (`DEUS_WORLDGEN_WBS.md:95`).
- **Suggested fix:** "19A is DONE; 19B is in REVIEW (Directive 001); 19C is queued."

## R7: MINOR. WG.00.08 and WG.00.12 table cells

- **WG.00.08:** `DONE (FABLE-19B / 2e4571a)` became `REVIEW (DEUS Directive 001)`. The implementing commit reference is gone from the table; it survives only in the Rev 12 log row. Keep it: `REVIEW (FABLE-19B / 2e4571a; returned by Directive 001)`.
- **Vocabulary:** the anchor (`:8`) lists `PLANNED → DONE` and `SUPERSEDED`, and the table also uses `QUEUED`. `REVIEW` and `IN_PROGRESS` appear with no definition. Either define the status vocabulary, or use the tokens already listed.
- **WG.00.12:** it says "(Lane C1)", but the same commit's STATUS runs WG.00.12 work in Lane C1 and Lane C2 (lines 25-26). Later commits add C3 and F.

## R8: MINOR. A DONE leaf's description was edited

- WG.00.07's text changed from "physical strata (0..5)" to "(0..4, S0-S4)". The anchor (`DEUS_WORLDGEN_WBS.md:8`) allows a committed leaf to change "only by status … or retirement via `SUPERSEDED`".
- The change is disclosed in the Rev 15 log, and its content is correct for stratum indices. `DEUS_Levels.js` has five strata:
  - `:986`: "S0 (bottom) .. S4 (top)";
  - `:1756`: "stratum … isn't 0..4";
  - `:1803`: "strata are 0..4".
- "0..5" was also defensible as fill height (`HEIGHT_k_OF_5`, `:1880`; "fill 5: solid", `:1193`).
- **Suggestion:** write "strata S0–S4 (fill 0..5)", and add a text-correction clause to the anchor so the next edit isn't a rule break.

## R9: MINOR. Binding Rule 1 contradicts the parallel lanes

- `DEUS_WORLDGEN_WBS.md:17`: "Only ONE implementation leaf may be active at any given time across all agents." Rev 15 left this unchanged.
- The same commit's STATUS §2 runs WG.00.08, WG.00.11, WG.00.12 and WG.00.09 lanes at the same time. WG.00.11 is engine code in `DEUS_FactionMenus.js`.
- Either amend Rule 1 and cite the Directive 001 lane model, or state which lanes are not "implementation".

## R10: MINOR. The DW deprecation is incomplete

- The crosswalk covers DW.01 only. DW.02.01–05, DW.03.01–04 and DW.04.01–04 (13 leaves, all `QUEUED`, `DEUS_WORLD_WBS.md:42-68`) get no WG mapping and no `SUPERSEDED` marking.
- The file header still says "CANONICAL & FROZEN HIERARCHY" (`:6`).
- A reader can't tell whether those 13 leaves are still live work or retired. Add a status or a mapping for each.

## R11: MINOR. OWNER_DECISIONS scope rule and a forward reference

- **The scope rule.** `docs/OWNER_DECISIONS.md:4` says "Nothing in Project DEUS waits on Owner input unless it is explicitly logged as an open entry in this file". AGENTS rule 6 (`AGENTS.md:24`) says "The user approves every slice and every art asset. Stop at the gate." Those approvals are not logged in this file. Add an exception for the standing rule-6 gates, or log them.
- **The forward reference.** DEC-004 (`:62`) concerns bypassing `tools/governance/check_claims.js`, which does not exist at `d1fbeab` (`git cat-file -e` fails) and is being written by Lane C2. Say "(once installed)".
- DEC-002 and DEC-003 have no findings: each has options, a default and a fallback, and DEC-003's default respects the migration freeze.

## R12: MINOR. MODEL_AVAILABILITY time with no date

- `docs/MODEL_AVAILABILITY.md:15`: "`EXHAUSTED` (Owner-confirmed 16:25)" has no date or timezone. AGENTS.md:130 asks for absolute dates.
- **Fix:** "Owner-confirmed 2026-09-25 16:25 -0500".

## R13: MINOR. Commit shape

- AGENTS.md:115: "One task per commit, so a review can diff exactly what changed."
- This commit mixes about 9 changes: the STATUS move, the WBS revision, the crosswalk, a new decisions log, a new ADR, an invariant edit, audit banners, three prompt files, and a baseline JSON.
- The 5,179-line STATUS move in particular hid R1: the diff shows only deletions from STATUS. A pure-move commit, followed by a separate "new STATUS" commit, would have shown the missing sections.

---

## Hunks with no findings

- **`AGENTS.md` read order:** the link target exists, and the archive is byte-identical to the pre-commit STATUS (`cmp` exit 0, 5,179 lines each). The rule text that points into STATUS sections is covered in R1.
- **`.gitignore` whitelist (`!/tasks/`, `!/prompts/`, `!/baseline/`):**
  - `tasks/` already had 8 tracked files before this commit (first added in `8d1c7c3`), so the whitelist makes the ignore rules match what was already tracked.
  - `prompts/` (3 files) and `baseline/` (1 file) are new.
  - `game/test_output/` stays ignored; its effect on DEC-001 is covered in R3.
  - No secrets or large binaries are in the newly tracked files.
- **`baseline/pre_migration_baseline.json`:**
  - Its generator, `tools/capture_pre_migration_baseline.js`, is tracked (added in `8d1c7c3`).
  - The memory figures add up: per-level strata 5 × 327,680 = 1,638,400; connectors 5 × 32,768 = 163,840. Seed 18 totals 2,069,912, and seed 20260923 totals 2,069,928, which differs only through `caps`.
  - I did not regenerate it. It is a heavy worldgen run, and outside this lane.
  - The file has no trailing newline (cosmetic).
- **`docs/audits/GROK_*` "NOT EVIDENCE" banners:** these downgrade the documents, which is the safe direction. No tracked document outside `docs/archive/` cites either audit (grep). I did not independently check whether the runs the audits describe ever happened.
- **`tasks/active/ARCHITECTURE-CLEANUP-001.md` closure:** the superseding `docs/CONSOLIDATION_PLAN_V1.md` exists at `d1fbeab`.
- **WG WBS header:** Rev 14→15, and the next free ID WG.00.12→WG.00.13, match the one added leaf (WG.00.12). The revision-log row is present.
- **MODEL_AVAILABILITY:** Codex `EXHAUSTED` agrees with STATUS §5 (apart from R12).
- **`prompts/*.md`:** historical 19B prompts (remediation, defect closure, attack), tracked for the record. Their FAIL verdicts refer to `116a3de`, which later fixes superseded.

## Not checked

- RMMZ Playtest (F5/F8): this is a documentation review, and no code changed in this lane.
- `tools/generate_asset_inventory.js`: not run, because it writes `docs/ASSET_INVENTORY.md`, outside the C3 write set.
- The Directive 001 text itself, which is not in the repository.

## Commands used (Git Bash, repository root)

```bash
git show --stat d1fbeab
git show d1fbeab^:docs/STATUS.md > /tmp/old.md; git show d1fbeab:docs/archive/STATUS_LEDGER_20260925.md > /tmp/ledger.md; cmp /tmp/old.md /tmp/ledger.md
grep -n "^## In progress\|^## Stand-ins\|^## Backlog" /tmp/old.md
node -e "console.log(require('./tools/originality_check.js').standInDeclarations().error)"
git log --all --format='%h %s' -- game/test_output/z2_cut_proof_seed18_194_89.png
git cat-file -e d1fbeab:tools/governance/check_claims.js
```
