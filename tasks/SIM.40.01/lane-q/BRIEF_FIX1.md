# Lane Q Fix 1 Brief: design corrections after Grok FAIL (SIM.40.01)

Issued by the PM (main-chat ops), 2026-09-26 ~04:52 CT. Branch `task/lane-q`, worktree `C:\Users\snewt\.deus_worktrees\lane-q`.
Reviewed writer tip: `9d5b40d32f96a38803b1f32f78287a902d2bead8`. Review: `tasks/SIM.40.01/lane-q/review_grok_9d5b40d3.md`
(commit `77a80a854bd0c06aa498534ef19f952c1d3ab169`), **VERDICT: FAIL** (0 BLOCKER, 1 MAJOR, 5 MINOR).

The original `BRIEF.md` stays the authority for scope, forbidden paths, and product behaviour (NO CODE, NO ART, docs only under `tasks/SIM.40.01/lane-q/**`).
This brief adds the fix work and **overrides BRIEF.md in one place only**: you push your own branch at the end
(`git push origin task/lane-q`; never any other branch, never main, never force).

Do **not** edit `review_grok_*.md`. Do **not** mint WBS IDs or answer Owner questions (keep OQ-Q-* as questions). Proposed packages stay `PROPOSED-Q-NN`.

## Standing rules (unchanged except push)
1. NO ART GENERATION BY ANYONE (DEC-007). Art needs remain text-only "art slot needed: ..." lines.
2. NO CODE. Write only inside `tasks/SIM.40.01/lane-q/**`. Never commit under `game/**`, `tools/**`, `docs/**`, `art/**`.
3. Keep the gate in `lane.json` green (trace.json + required headings + size).
4. Do not merge. Do not self-certify; an independent Grok review (launched later by the PM) decides.
5. Commit messages start with `[claude] SIM.40.01 Fix1`.

## Findings to fix (from the review)

### MAJOR-1 (must fix) - fall distance defined twice with different dice
Section 6.2 defines fall height as `h = e0 - (landing + 1)` strata, then `2h` feet. Section 6.5 says dice are `floor(ft / 10)` and that one full layer is 1d6. T10 (line ~852) puts a unit on a timber floor at S0 of layer +2 over open room down to ground at layer 0, calls that 20 ft, and passes on 2d6; its mutant says a 1 ft stratum height yields 1d6.

For ground at S0 of layer 0 and floor at S0 of layer +2, the elevation-index gap is 10 strata. Section 6.2 gives `h = 9` strata = 18 ft and `floor(18/10) = 1` die. A one-layer drop under 6.2 gives 8 ft / 0 dice, which contradicts "one full layer is 1d6". T10 and the "one full layer" sentence read as a foot-drop rule (20 ft → 2d6); section 6.2 is the air gap under the member (18 ft → 1d6). The document never says which length the falling unit uses. SUP-4's acceptance test cannot be implemented from both statements.

**Required design change:**
- Align section 6.2, section 6.5, and T10 on **one** length definition for unit fall damage (state explicitly: foot-drop distance, or air-gap-under-member, or another single rule).
- Recompute and reprint the T10 fixture and any worked examples so pass dice match that single rule under the 2 ft strata / 10 ft layer geometry.
- Make the mutant for T10 attack the chosen rule (not a second incompatible length).
- Keep SRD falling-damage dice as the rules-layer number; only the measured feet feeding `floor(ft / 10)` change.

### MINOR-1 - conjured_stone kg off granite scaling
Section 2.5: `conjured_stone` is "0.10 × granite" at 382 kg/voxel. Granite is 3,894 kg; `0.10 × 3,894 = 389.4` → 389. 382 is `0.10 × 2.70 t/m³ × 1,415.84`. T16 locks `10 × 10 × 382 = 38,200` kg. Fix the fill sentence / density so the stated fraction of granite, the kg/voxel, and T16 agree.

### MINOR-2 - timber_roof kg/voxel 1 kg low
`timber_roof` is 60 kg/m² and 138 kg/voxel. Cell area `1.524² = 2.322576 m²`; `60 × 2.322576 = 139.35` → 139 (thatch 41 → 95 matches). Correct the roof row (or the stated kg/m²) so product and table agree.

### MINOR-3 - floating ice P formula vs printed kg
Section 4.3: `P = 3.5 × h²` with h = 61 cm and 122 cm prints 13,020 / 52,080 kg, but `3.5 × 61² = 13,023.5` and `3.5 × 122² = 52,094`. Fix printed results or the formula (and note if truncated).

### MINOR-4 - lava→basalt mass off by 2 kg
Section 9.1: 3 lava depth units of 2,738 kg → 2 basalt voxels of 4,107 kg (`3 × 2,738 = 8,214 = 2 × 4,107`), but the material table basalt voxel is 4,106 kg (`2 × 4,106 = 8,212`). Align the proposal with the single `kgPerVoxel` for that id (or state an explicit rounding rule and apply it consistently).

### MINOR-5 - WBS Rev 25 cite is off by one line
Header cites WBS Rev 25 at `docs/worldgen/DEUS_WORLDGEN_WBS.md:3`. Line 3 is `**Namespace:** WG`; line 4 is `**Rev:** 25`. Fix the citation line.

## Deliverables for Fix 1
1. Edit `SIM.40.01_STRUCTURAL_SUPPORT.md` so MAJOR-1 and MINOR-1..5 are resolved (or honestly escalated with a concrete blocker in `escalation.md` if a finding needs an Owner ruling — prefer fixing in-doc).
2. Update `trace.json` statuses/sections if any requirement text or section anchors move.
3. Update `REPORT.md`: list each finding, what changed (file + section), paste gate command + exit code from a fresh temp clone of your Fix1 tip, and `git rev-parse HEAD` after push.
4. Re-run the `lane.json` gate in a temp clone; paste raw output. Do not edit the live worktree while the gate runs in the clone.
5. Leave `review_grok_9d5b40d3.md` untouched.

## Done when
- Gate exits 0 on the Fix1 tip in a temp clone.
- REPORT.md records MAJOR-1 and all five MINORs as addressed (or escalated).
- Branch pushed: `origin/task/lane-q` equals `git rev-parse HEAD`.
- Final output line exactly: `FINAL SHA: <sha>`
