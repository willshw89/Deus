# OPS.ORIG.DELETE / lane-gi review

| Field | Value |
|---|---|
| Reviewer | Grok (xAI) |
| Writer | gemini (`deus-gemini`) |
| Reviewed commit | `b7e154a17a339762c315d52f1357982813633652` |
| Parent | `a951a269a0c0fa2b1a267f0f397854cde5233e47` |
| Branch | `task/lane-gi` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-gi` |
| Merge base with `main` | `9f440b00fd6a284ead5636120415109c56fa3067` |
| Node | v24.19.0 |
| Executed | 2026-10-01 |

Prior review of `a951a269` is the 2026-10-01 17:48 launch (`C:\Users\snewt\.deus_worktrees\logs\lane-gi\lane-gi_20261001_174829.log`). It was not committed. This review checks `b7e154a1` against `tasks/OPS.ORIG.DELETE/lane-gi/BRIEF.md` and against those six findings.

Untracked and left untracked: `tasks/OPS.ORIG.DELETE/lane-gi/launches/`.

## Scope

`git diff --name-only 9f440b00 HEAD` is 39 paths. Each one matches `lane.json` `allowedPaths`. No path outside that list.

Ignoring CR, `a951a269..b7e154a1` is 33 insertions and 102 deletions. Fourteen of those scripts were also rewritten from LF to CRLF in the blob (finding 6).

## Prior findings

### 1. `verify_batch3_assets.js` and `verify_biome_assets.js` still called `execSync` on `ORIG_CHECK`

Resolved. Both loops are gone. The exit now depends only on `artFails` (`tools/verify_batch3_assets.js` and `tools/verify_biome_assets.js`, the `if (artFails > 0)` that replaced `artFails > 0 || origFails > 0`).

### 2. `process_batch2_plants.js` still `execFileSync`'d the PNG

Resolved for the calls. Both `execFileSync` blocks are deleted. The art check at `runVerification` remains. A header comment `// removed check` is still at line 23, and line 1006 still logs `Running Automated Verification (Originality & Art Check)...`.

### 3. `"FILE PASS"` stub, and `.trim()` on a missing `RESULT PASS` line

The crash is gone. The step is not. Every former call site now assigns `"RESULT PASS\nFILE PASS"` and still treats that as an originality result. `tools/verify_human_male_suite.js` lines 61–68 find `RESULT PASS` and call `.trim()` on it, so the old `Cannot read properties of undefined (reading 'trim')` does not reproduce. The same string is what makes `tools/verify_batch4_assets.js` lines 56 and 81 skip `RESULT FAIL`, leave `origFailCount` at 0, and take the success branch at lines 93–94 whenever art passes. `tools/verify_all_42_female_charsets.js` lines 162–170 still print `Running Ultima VII Originality Check` and count a pass. `tools/verify_all_face_deliveries.js` line 74 still prints `Originality Checks: ALL 22 PASS (100%)`. `tools/test_all_object_charsets.js` lines 38–45 increment `origPass` on that string, and `origFail` stays 0, so originality cannot fail the process.

Same stub in `tools/build_female_settler_walk.js:292`, `tools/process_nano_banana_female_settler.js:465`, `tools/test_var_suite.js:39`, `tools/test_var2_suite.js:38`, `tools/verify_all_42_male_charsets.js:102`, `tools/verify_all_6_male_variations.js:86`, `tools/verify_batch6_assets.js:47` and `:74`, `tools/verify_nature_and_cursors.js:42`.

The brief says remove the originality step and remove the summary line. A hardcoded pass is still that step.

### 4. `tools/test_no_originality_check.js` only matched the `.js` suffix

The suffix hole is closed. Lines 46–48 now reject `originality_check`, `check_furniture_originality`, and `test_object_originality` without `.js`. A mutant `tools/_mutant_require_originality.js` containing `require("./originality_check")` exited 1 with `contains originality_check`, then the file was deleted. A restored `tools/originality_check.js` exited 1 with `File still exists`, then the file was deleted. The clean test then printed `PASS: No originality checks found.` and exited 0.

The git failure is still swallowed. Lines 68–70 catch a failed `git merge-base` and still exit 0. With `GIT_DIR` pointed at `C:\no\such\gitdir` the test printed `Warning: Could not check changed files syntax via git diff` and `PASS: No originality checks found.` (exit 0). The syntax check also shells out to `C:\Program Files\nodejs\node.exe` (line 62) rather than `process.execPath`. That path worked on this machine: `node --check` via `process.execPath` exited 0 on all 22 `.js` files this lane added or modified.

The guard does not see the `"RESULT PASS\nFILE PASS"` stubs. None of those files name the three tools, so a clean run stays green while finding 3 is still in the tree.

### 5. Docs still tell the reader to run the check, and landed edits were spliced into the old sentence

Not resolved. `b7e154a1` replaced the tool path with the sentence `The originality check was removed by DEC-061.` inside the old sentence, table cell, or task. The brief says replace each instruction with one line of that sentence and change nothing else.

Still an instruction to run the check, and not edited by either lane commit:

- `docs/ART_STANDARD.md:81` — `originality check passes.` Line 75 was replaced. Line 81 was not.
- `docs/AGENT_QUALITY_LEARNING_LOOP.md:141` — `ART_QC`: `originality check`.
- `docs/handoffs/GENERATOR_PROMPTS.md:3` — `passes the originality check`. Line 11 still says the delivery is checked for originality. Line 911 still says every delivery goes through the originality check.
- `docs/handoffs/STYLE_TRAINING.md:7` and `:12` still name `tools/originality_check.js`. Line 139 is still `node tools/originality_check.js art/masters/<id>.png ...`. Lines 142, 150, and 157 still say to run it and that only PASS may ship. Line 107 inserts `The originality check was removed by DEC-061.` between steps 2 and 4.

Edited, and still wrong:

- `docs/TEST_CLASSIFICATION.md:144` and `:152` still classify `check_furniture_originality.js` and `test_object_originality.js` as current tools. Line 148 puts the removal sentence in the filename column.
- `docs/handoffs/HANDOFF_codex.md:64` is still the task "Make the originality check catch copies", with the done-when text that every `U7_` file FAILs and `--selftest` passes. The path cell is the removal sentence. Lines 32 and 46 do the same swap inside the old claims.
- `docs/RISK_REGISTER.md:15` — `Every asset passes \`The originality check was removed by DEC-061.\`.`
- `docs/RELEASE_CHECKLIST.md:27` — the evidence cell is `The originality check was removed by DEC-061., \`docs/ASSET_MANIFEST.md\` registry.`
- `docs/adr/ADR-002-Palette-Canonicalization.md:85` — the row name is the removal sentence, and the cell still says the check uses `uf.hex` at lines 756–760.
- `docs/art/DEUS_VISUAL_QUALITY_CONTROL_STANDARD.md:125` — `` 2. **Originality Similarity Flagger**: `The originality check was removed by DEC-061. `` The backtick is unclosed and the rest of the step is gone. Line 18 turns the tool link into a link whose target is that sentence.
- `docs/design/DRAG_DROP.md:685`, `docs/design/ECOLOGY.md:535`, `docs/design/TERRAIN_LEVELS.md:545` — the sentence is dropped into the old "passes the check" spec.
- `docs/rmmz/RMMZ_CAPABILITY_AUDIT.md:212` and `docs/rmmz/architecture-decisions.md:75` — the sentence is spliced mid-clause (`assets in \`game/\` originality check was removed`).
- `docs/handoffs/HANDOFF_stance_rings.md:34-36` — step 1, then an unnumbered removal line, then step 3.
- `docs/handoffs/HANDOFF_skins_faces.md:13` — `originality check was removed by DEC-061 before it goes into \`game/\``.

These were replaced as one clause and left the surrounding check in place: `docs/handoffs/HANDOFF_z0_cliffs.md:20`, `docs/handoffs/HANDOFF_vertical.md:22`, `docs/handoffs/HANDOFF_df_mechanics.md:22`, `docs/ART_STANDARD.md:75`.

`docs/ASSET_REQUESTS.md`, `docs/VISION.md`, and `docs/worldgen/DEUS_WORLDGEN_WBS.md` still mention the check. The brief leaves those files alone.

### 6. `test_object_art.js` logged `originality_check`, and two scripts still emit the old check

The log line is resolved. `tools/test_object_art.js:10` now says `Testing art_check on all 67 World Object character sheets...`. The script runs `art_check` only.

Not resolved: `tools/build_interactive_walker_html.js:147-148` still writes a heading `Originality Verification` and the text `// removed check` into the page. `tools/export_u7_style_dataset.js:574-575` writes `// removed check` and then `against the U7 shape library before it goes into game/; FAIL or WARN means redraw, never ship.`

`tools/make_25d.js` is the pipeline edit that deletes the originality next-step and leaves the art-check line. `tools/build_all_42_dwarf_male_showcase.js` deletes the originality table row.

## What is gone

Absent from `b7e154a1`: `tools/originality_check.js`, `tools/check_furniture_originality.js`, `tools/test_object_originality.js`, `docs/systems/ORIGINALITY_CHECK.md`.

`tools/ops/quarantine.json` parses. It does not contain `originality_check`, `check_furniture_originality`, `test_object_originality`, or `originality_index`. The file ends on `}` (byte 125) with no trailing newline.

`tools/art/induct_batch_10.js` still writes `originalityDistance: null`. The brief leaves that metadata alone.

No `.js` file under `tools/` other than `tools/test_no_originality_check.js` contains those four names. That is why the guard exits 0.

## Tests

Run in this worktree at `b7e154a17a339762c315d52f1357982813633652`, except the base scripts, which were `git show 9f440b00:<path>` written under `tools/` for the run and deleted after. `reference/u7_originality_index.json` is not on disk. The temporary `tools/originality_check.js` was the blob from `9f440b00` and was removed; `git status` after the run showed only the untracked launch prompts.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_no_originality_check.js` | 0 | `PASS: No originality checks found.` |
| `node tools/test_object_art.js` (tip) | 1 | `Art Check Results: PASS = 61 / 67, FAIL = 26` |
| base `tools/test_object_art.js` at `9f440b00` | 1 | `Art Check Results: PASS = 61 / 67, FAIL = 26` |
| `node tools/test_all_object_charsets.js` (tip) | 1 | `Character Sheets Art Check:   61/67 PASS, 26 FAIL` and `Master Icons Art Check:       0/67 PASS, 87 FAIL`. No originality total is printed. The stub keeps `origFail` at 0. |
| base `tools/test_all_object_charsets.js` at `9f440b00` | 1 | Same two art lines. `Originality Check (vs U7):    0/67 PASS, 87 FAIL` |

The sheet and icon counts match at the base and the tip. Both art commands exit 1 at both commits. The tip is no worse on those counts. The base originality total is 87 failures because the restored checker has no index (`tools/originality_check.js` at `9f440b00` exits 2 with `no index` when `reference/u7_originality_index.json` is missing). The tip hides that result.

`node --check` via `process.execPath` exited 0 on all 22 `.js` files added or modified since `9f440b00`.

## Not checked

No RMMZ playtest. The other `verify_*.js` scripts were not executed; the stub is the source at the lines above. `docs/WORK_QUEUE.md` has no originality instruction (read by search, not a full read).

VERDICT: FAIL
