# Lane R Fix 1 Brief: design corrections after Grok FAIL (SIM.40.05)

Issued by the PM (main-chat ops), 2026-09-26 ~04:41 CT. Branch `task/lane-r`, worktree `C:\Users\snewt\.deus_worktrees\lane-r`.
Reviewed writer tip: `6613418ff5539c4156c5f42d589913d479dc0853`. Review: `tasks/SIM.40.05/lane-r/review_grok_6613418f.md`
(commit `b2cc93610b7478b407eb05944f433ac8fcd9424e`), **VERDICT: FAIL** (0 BLOCKER, 1 MAJOR, 4 MINOR).

The original `BRIEF.md` stays the authority for scope, forbidden paths, and product behaviour (NO CODE, NO ART, docs only under `tasks/SIM.40.05/lane-r/**`).
This brief adds the fix work and **overrides BRIEF.md in one place only**: you push your own branch at the end
(`git push origin task/lane-r`; never any other branch, never main, never force).

Do **not** edit `review_grok_*.md`. Do **not** mint WBS IDs or answer Owner questions (keep OQ-R-* as questions). Proposed packages stay `PROPOSED-R-NN`.

## Standing rules (unchanged except push)
1. NO ART GENERATION BY ANYONE (DEC-007). Art needs remain text-only "art slot needed: ..." lines.
2. NO CODE. Write only inside `tasks/SIM.40.05/lane-r/**`. Never commit under `game/**`, `tools/**`, `docs/**`, `art/**`.
3. Keep the gate in `lane.json` green (trace.json + required headings + size).
4. Do not merge. Do not self-certify; an independent Grok review (launched later by the PM) decides.
5. Commit messages start with `[claude] SIM.40.05 Fix1`.

## Findings to fix (from the review)

### MAJOR-1 (must fix) — `rateMilli` does not preserve the life table
R-01.2's `rateMilli = ceil(1000 × maxHP / (lifeYears × DPY))` with `HP(day) = HP(d0) - floor(rateMilli × (day - d0) / 1000)` cannot reproduce multi-millennium lives at DPY 20 when HP is a byte (maxHP 120 → latest fail 6,000 sy; life table has ASHLAR SHELTERED 20,000 sy, etc.). R-09.1 / AT-R-20 require FX-R-01 at DPY 1 and DPY 20 to give **identical stage years**. The report's band arithmetic currently follows unquantized lives, not that formula.

**Required design change:**
- Make the **due / fail day** the integer day counted from `lifeYears × DPY` (and exposure / maintenance modifiers), so DPY 1 and DPY 20 agree on stage years.
- Keep a rate formula only where it inverts exactly; otherwise state the closed form for `failDay` / stage transitions and make the oracle use that same day.
- Recompute / reprint the R-01.6 and R-09.3 worked examples and FX-R-01 expected years so they match the corrected model.
- State explicitly how strata HP bytes interact with lives longer than `1000 × maxHP` game-days (extend the representation, store failDay, or another sparse field — design only, no code).

### MINOR-1 — visitor years cite the wrong worked example
R-07.3 attributes limestone visitor years (~1,400 / ~4,300) to R-01.6, but those are the wR 50 fixture (R-09.3). R-01.6 is ASHLAR at wR 90 (~2,700 / ~8,500). Fix the citation so the visitor sentence points at R-09.3 / the wR 50 table.

### MINOR-2 — sub-day lives need a non-integer-day due key
R-08.5 keys the heap by integer `nextDay`, but FOOD lives (0.1 / 0.05 sy) and SKY corpse→skeletal (0.25 sy) fall inside a day at DPY 1. Specify a tick or fractional-day due time for remains/food (member layout fields as needed). Year-scale FX-R-01 checkpoints may stay day-keyed if that is intentional — say so.

### MINOR-3 — printed Lane Q / Lane W tips were stale
Update section 0.2 / any SHA table to the tips that existed at your Fix1 tip (or say "read current `origin/task/lane-q` and `origin/task/lane-w`" and re-sample). Keep R-05 PARTIAL / ASSUMED where the interface is still owned by Q. Do not copy Q/W design into this lane; only correct the stale hashes and note reconciliation ownership (Q §9.7 is fine to cite if still accurate).

### MINOR-4 — exposure change must reset closed-form baseline
When a band becomes SKY or BURIED, specify the assignment: set `hp0` to HP at that day, set `d0` to that day, recompute rate / failDay for the new exposure. "Reschedule" alone is not enough for the piecewise years in R-01.6 / R-09.3.

## Deliverables for Fix 1
1. Edit `SIM.40.05_DECAY_CYCLE.md` so MAJOR-1 and MINOR-1..4 are resolved (or honestly escalated with a concrete blocker in `escalation.md` if a finding needs an Owner ruling — prefer fixing in-doc).
2. Update `trace.json` statuses/sections if any requirement text or section anchors move.
3. Update `REPORT.md`: list each finding, what changed (file + section), paste gate command + exit code from a fresh temp clone of your Fix1 tip, and `git rev-parse HEAD` after push.
4. Re-run the `lane.json` gate in a temp clone; paste raw output. Do not edit the live worktree while the gate runs in the clone.
5. Leave `review_grok_6613418f.md` untouched.

## Done when
- Gate exits 0 on the Fix1 tip in a temp clone.
- REPORT.md records MAJOR-1 and all four MINORs as addressed (or escalated).
- Branch pushed: `origin/task/lane-r` equals `git rev-parse HEAD`.
- Final output line exactly: `FINAL SHA: <sha>`
