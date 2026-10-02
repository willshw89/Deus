# ART.GROUND.FIX lane-gn review

- Reviewer: Codex, OpenAI GPT-6 family; writer family: Gemini.
- Reviewed TIP: `29255dd54bc0d2df1b63d6e04dc363d6f25ee032` on `task/lane-gn`.
- Review time: 2026-10-02 03:57 UTC. This verdict covers that TIP only.
- Brief: `tasks/ART.GROUND.FIX/lane-gn/BRIEF.md`; manifest: `tasks/ART.GROUND.FIX/lane-gn/lane.json`.
- Tests used a fresh shared clone at `%TEMP%/deus-lane-gn-review-29255dd5`. Only that clone's `Outside_A2.png` was altered for the physical mutation. No game file in the lane worktree was changed.

## 1. Scope and file integrity

The exact requested base-to-TIP diff has nine paths, six inside `lane.json:8-11` `allowedPaths` and three outside. The base is an ancestor (`git merge-base` returned `15a6fe4c12eb15237f3c0d496d75d119a41d4940`). The outside paths came from earlier PM commits on the branch, but the specified scope condition is still false at this TIP.

```text
> git diff --name-status 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD
M       docs/STATUS.md
A       tasks/ART.GROUND.FIX/lane-gn/BRIEF.md
A       tasks/ART.GROUND.FIX/lane-gn/REPORT.md
A       tasks/ART.GROUND.FIX/lane-gn/lane.json
A       tasks/ART.GROUND.FIX/lane-gn/review_codex_0f0e357b.md
A       tasks/ART.GROUND.FIX/lane-gn/review_codex_7386317e.md
A       tasks/WG.65.04/lane-fi/BRIEF.md
A       tasks/WG.65.04/lane-fi/lane.json
M       tools/art/verify_specimens_rgb.js
exit 0; 9 paths, 6 allowed, 3 outside
> git diff --name-status origin/main...HEAD
A       tasks/ART.GROUND.FIX/lane-gn/BRIEF.md
A       tasks/ART.GROUND.FIX/lane-gn/REPORT.md
A       tasks/ART.GROUND.FIX/lane-gn/lane.json
A       tasks/ART.GROUND.FIX/lane-gn/review_codex_0f0e357b.md
A       tasks/ART.GROUND.FIX/lane-gn/review_codex_7386317e.md
M       tools/art/verify_specimens_rgb.js
exit 0
```

There is no whole-file rewrite, line-ending conversion, or BOM insertion in the checker. Its base and TIP blobs each have 49 LF lines and zero CRLF. The base-to-TIP patch is four replacements (`4 4` in `git diff --numstat`). The full diff has trailing whitespace in new files, but the checker-specific diff check is clean.

```text
> git diff --numstat 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD -- tools/art/verify_specimens_rgb.js
4       4       tools/art/verify_specimens_rgb.js
> blob byte check (git show base:file and HEAD:file)
15a6fe4c12eb15237f3c0d496d75d119a41d4940 bytes=4442 BOM=false CRLF=0 LF=49
HEAD bytes=4496 BOM=false CRLF=0 LF=49
> git diff --check 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD -- tools/art/verify_specimens_rgb.js
exit 0, no output
> git diff --check 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD
tasks/ART.GROUND.FIX/lane-gn/REPORT.md:23: trailing whitespace.
tasks/WG.65.04/lane-fi/BRIEF.md:17: trailing whitespace.
tasks/WG.65.04/lane-fi/lane.json:26: trailing whitespace.
exit 1
```

## 2. Brief requirements at TIP

The brief has a `Change` section rather than numbered Scope items. I checked every actionable instruction in `BRIEF.md:19-33`:

1. **Pin the moving comparison:** done at `tools/art/verify_specimens_rgb.js:11-12`; `baseline()` and `mainSheet()` both read `a5255704:game/img/tilesets/`.
2. **Reword the diagnostics and OK line:** done at `tools/art/verify_specimens_rgb.js:32,45,48`. The source had two failure messages and one OK line mentioning `origin/main`, although the brief calls these “three messages and the OK line.” The clean run below prints the new OK text.
3. **Change nothing else in the checker and do not reformat:** done as to content outside those four replaced lines; the diff and byte check in section 1 show no rewrite. The five-line count requested by the review prompt is inaccurate; see section 5.
4. **Run the pinned checker and demonstrate a later-main green clone:** done. `git clone --shared --single-branch --branch task/lane-gn . %TEMP%/deus-lane-gn-review-29255dd5` exited 0, the clone resolved the full reviewed TIP, and its clean checker exited 0. It had no `origin/main` ref (`git rev-parse --verify origin/main` exited 128), while this worktree's fetched `origin/main` is 176 commits after `a5255704` (`git rev-list --count a5255704..origin/main` printed `176`).
5. **Show slot-0 replacement exits 1 with the new message:** not met. A temporary-clone script copied the 96x144 slot-0 RGBA block from `git show a5255704:game/img/tilesets/Outside_A2.png` into that clone's sheet, using the checker's row-copy geometry. The checker exited 1 with the earlier generic message, quoted in section 3. `tools/art/verify_specimens_rgb.js:31` checks `got.equals(expected)` before the pinned comparison at `:32`; the equivalent ordering is at `:44-45` for swatches.
6. **No other file or art change:** the lane-side diff is restricted to the checker and lane documents, as shown in section 1. The exact requested base-to-TIP diff nevertheless includes three paths outside the manifest.

This is a tooling-only lane with no lane-side `game/` change, so no game-translation block or RMMZ scene proof is required. Playtest was not checked.

## 3. Checks and mutation evidence

The changed checker passed in the clean shared clone. I also ran the syntax command to audit the number in `REPORT.md`. I did not rerun the unchanged kept-sets green gate; merge_gate owns the full gate suite.

```text
> node tools/check_deus_syntax.js                         exit 0
Checked 62 DEUS plugin files. Errors: 0
> node tools/art/verify_specimens_rgb.js                  exit 0
[OK] Outside_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
[OK] Dungeon_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
[OK] gallery and Outside_D match all 34 kept sets, two Owner masters and three stand-in swatches
[OK] Outside A2 slots 0/1 and Outside D swatches 0/1 derive from Owner masters and differ from the pre-lane sheets (a5255704)
```

All five named specimen mutants and all four named kept-set mutants turned red: **5/5 and 4/4, total 9/9**. These are the actual `--mutant=` command results in the clean clone:

```text
> node tools/art/verify_specimens_rgb.js --mutant=outside-source  exit 1
[FAIL] Outside_A2.png slot 4 is not forest_floor_base
> node tools/art/verify_specimens_rgb.js --mutant=grass-slot-0    exit 1
[FAIL] Outside_A2.png slot 0 is not meadow
> node tools/art/verify_specimens_rgb.js --mutant=grass-slot-1    exit 1
[FAIL] Outside_A2.png slot 1 is not tropical_grass
> node tools/art/verify_specimens_rgb.js --mutant=grass-d-0       exit 1
[FAIL] gallery swatch 0 meadow
> node tools/art/verify_specimens_rgb.js --mutant=grass-d-1       exit 1
[FAIL] gallery swatch 1 tropical_grass
> node tools/art/test_ground_kept_sets.js --mutant=source-id      exit 1
[FAIL] deleted source in allowlist
> node tools/art/test_ground_kept_sets.js --mutant=map            exit 1
[FAIL] Map001 Git blob differs byte-for-byte from lane base
> node tools/art/test_ground_kept_sets.js --mutant=tilesets       exit 1
[FAIL] Tilesets non-name field 2 modified
> node tools/art/test_ground_kept_sets.js --mutant=d-name         exit 1
[FAIL] Tilesets 2 D sheet must be Outside_D and be the only name change
```

The separate physical mutation turned the check red **1/1**, but missed the brief's specified message:

```text
> node - (temporary clone: copy a5255704 Outside_A2.png slot-0 block, then writePNG)
replaced Outside_A2.png slot 0 with a5255704 block (96x144)
exit 0
> node tools/art/verify_specimens_rgb.js
[FAIL] Outside_A2.png slot 0 is not meadow
exit 1
```

## 4. REPORT.md audit

Every numeric claim in `REPORT.md:10-14` matches output produced above: 62 files, 0 errors, 32 slots in each A2 sheet, 34 kept sets, two Owner masters, three stand-in swatches, slots and swatches 0/1, and the `a5255704` baseline. Its two logged green command results match the clean clone. `REPORT.md:17` honestly says the writer did not run the unchanged `ground_kept_sets.js` green gate; `:20` says RMMZ was not checked. The report does not overstate a numeric result. It omits the required physical mutation and later-main clone evidence, the four reworded source lines, and the fact that the new failure message remains unreachable for the requested mutation. It also has trailing whitespace at line 23, quoted in section 1.

## 5. Five-line edit check

The checker did **not** touch five lines. The exact base-to-TIP patch changes four source lines: `mainSheet` at line 12 and strings at lines 32, 45 and 48. `git diff --numstat ... -- tools/art/verify_specimens_rgb.js` printed `4 4`, as quoted in section 1. The brief's “three messages and the OK line” count does not match the prior source, which had two failure messages plus the OK line. No other checker line changed.

## N. Integration tree after fetch

The required merge-tree command does **not** exit 0. Main acquired a PM hotfix for this same checker (`b09dbc4737e62146b5ee1405ef44e16eb8d40923`, `[pm] Hotfix (DEC-089): Pin verify_specimens_rgb.js to baseline a5255704`). In main, the pinned checks precede the generic expected-value checks; at this TIP they follow them. The overlap causes a content conflict and means this TIP is not currently mergeable through the normal gate.

```text
> git fetch origin
exit 0
> git rev-parse origin/main
fd76b8bc23239dd24b954410893c6f74beda4c50
> git merge-tree --write-tree origin/main HEAD
e6037bc99371e9f77c54acaa442bd7dc7a2711a5
100644 0846922413d984430e71ec56bd67bb0567c91fd7 1 tools/art/verify_specimens_rgb.js
100644 d79e60fd312cfa48922c515d38ecba8e71be7ab5 2 tools/art/verify_specimens_rgb.js
100644 1e3c78a711380a9cf0dada7eb446127122badba5 3 tools/art/verify_specimens_rgb.js
Auto-merging tools/art/verify_specimens_rgb.js
CONFLICT (content): Merge conflict in tools/art/verify_specimens_rgb.js
exit 1
```

## Findings

- **BLOCKER — integration-tree check fails.** The fetched main and reviewed TIP conflict in the checker. The PM hotfix on main already addresses the same defect and orders the checks to print the specified baseline diagnostic.
- **MAJOR — exact requested scope condition fails.** `git diff --name-status 15a6fe4c... HEAD` includes `docs/STATUS.md` and lane-fi's brief and manifest outside `allowedPaths`. These are inherited PM changes, not evidence that the Gemini writer edited them.
- **MAJOR — the required physical mutation does not print the new message.** It exits 1 with `slot 0 is not meadow`, because the generic expected-value check at checker line 31 runs before the pinned-baseline check at line 32. Both slot and swatch mutant results show the same ordering issue.
- **MINOR — five-line assertion and brief message count are inaccurate.** The checker has exactly four replaced lines (`4 4`), with no BOM or line-ending rewrite. The brief describes three diagnostic messages and an OK line where the source has two diagnostics and one OK line.
- **MINOR — REPORT.md omits the required mutation and clone evidence.** Its numbers match observed outputs, but it leaves the exact required diagnostic failure unreported. Line 23 also has trailing whitespace.

VERDICT: REJECT
