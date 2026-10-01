# OPS.ORIG.DELETE / lane-gi review

| Field | Value |
|---|---|
| Reviewer | Grok (xAI) |
| Writer | gemini (`deus-gemini`) |
| Reviewed commit | `a49f4b092f36e4c991b1048afc58ae1351235a06` |
| Parent | `ce6294222a7b45353384e3654cd71c4a58933aa6` |
| Branch | `task/lane-gi` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-gi` |
| Merge base with `main` | `9f440b00fd6a284ead5636120415109c56fa3067` |
| Node | v24.19.0 |
| Executed | 2026-10-01 |

This review checks `a49f4b09` against `tasks/OPS.ORIG.DELETE/lane-gi/BRIEF.md` and against `tasks/OPS.ORIG.DELETE/lane-gi/review_grok_b7e154a1.md`. The prior review rejected `b7e154a17a339762c315d52f1357982813633652`.

Untracked and left untracked: `tasks/OPS.ORIG.DELETE/lane-gi/launches/` and `tasks/OPS.ORIG.DELETE/lane-gi/grok_re_review_prompt.txt`. They are not in the commit.

## Scope

`git diff --name-only 9f440b00 HEAD` is 43 paths. Five are outside `lane.json` `allowedPaths`, and the brief says to leave `docs/OWNER_DECISIONS.md` and `docs/agents/**` alone. All five were introduced by `a49f4b09`:

- `docs/AUDIT_LOG.md` — A13-2 marked fixed, and A13-6, A13-7, A13-8 added. Those rows are about lane-do, lane-dm, and the Gemini CLI. They are not this deletion.
- `docs/OWNER_DECISIONS.md` — amendments on DEC-016, DEC-071, and DEC-072, plus a new DEC-084 (MiniMax).
- `docs/agents/mailboxes/fable/inbox.jsonl` — AG-PRUNE-126, AG-PRUNE-127, AG-PRUNE-128.
- `docs/agents/mailboxes/fable/outbox.jsonl` — MSG-PRUNE-PM-130, MSG-PRUNE-PM-131, MSG-PRUNE-PM-132.
- `docs/agents/mailboxes/gemini/inbox.jsonl` — the same three PM messages.

The other 38 paths match `allowedPaths`.

## Prior findings

### 1. `verify_batch3_assets.js` and `verify_biome_assets.js` still called `execSync` on `ORIG_CHECK`

Still resolved. `a49f4b09` does not touch those files. The exit still depends only on `artFails`.

### 2. `process_batch2_plants.js` header comment and log line

Resolved. The `// removed check` header is gone. `tools/process_batch2_plants.js:1005` now logs `Running Automated Verification (Art Check)...`.

### 3. `"FILE PASS"` stub

The quoted stub string is gone from the call sites named in the prior review. Several of those edits delete the assignment and leave the use, so the script throws, or they leave the originality summary in place.

Crashes. `node --check` exits 0 on both files. Evaluating the same statements throws `ReferenceError`.

- `tools/verify_nature_and_cursors.js:40-44`. Section 2 is still headed `VERIFYING ORIGINALITY ON FACE SHEETS`. The `const out = "RESULT PASS\nFILE PASS"` line is gone. `out.match` and `out.includes('FILE PASS')` remain. `out` in the section 1 loops is block-scoped, so this `out` is not defined. Observed: `ReferenceError: out is not defined`.
- `tools/verify_all_42_male_charsets.js:101`. `if (orig !== 'PASS')` remains, and the file has no declaration of `orig`. Observed: `ReferenceError: orig is not defined`. Line 122 still prints `U7 Orig: PASS` on the success log.

The originality step is still there:

- `tools/verify_batch6_assets.js:46-49` and `:73-76`. The stub string is gone. The empty `try` still does `passed++`, so each file adds a pass for a check that does nothing. The summary at line 83 counts those passes.
- `tools/verify_batch4_assets.js:40` and `:74-75`. `origFailCount` stays 0. The summary is still `art_check FAILs = ${artFailCount}, originality FAILs = ${origFailCount}`, and line 75 still takes the success branch when that count is 0.
- `tools/verify_all_6_male_variations.js:83-87`. The comment is still `// Originality check`. `origResult` stays `'NOT RUN'`, and the log still ends `U7 originality: ${origResult}`.
- `tools/test_all_object_charsets.js:14` and `:47`. The stub block is gone. `origPass` and `origFail` are never updated, and `origFail > 0` can no longer fail the process. No originality total is printed.

Removed cleanly: `tools/build_female_settler_walk.js` (the stub and its `console.log`), `tools/process_nano_banana_female_settler.js` (the stub `try`), `tools/test_var_suite.js`, `tools/test_var2_suite.js`, `tools/verify_all_42_female_charsets.js` (the whole Ultima VII section), `tools/verify_all_face_deliveries.js` (the whole originality section), `tools/verify_human_male_suite.js` (the originality loop).

### 4. `tools/test_no_originality_check.js`

Partly resolved.

- A mutant `tools/_mutant_stub.js` containing `const x = "RESULT PASS\nFILE PASS";` exited 1 with `contains RESULT PASS stub`. The file was deleted.
- A mutant `tools/_mutant_require_originality.js` containing `require("./originality_check")` exited 1 with `contains originality_check`. The file was deleted.
- `GIT_DIR=C:\no\such\gitdir` now exits 1. The test printed `FAIL: Could not check changed files syntax via git diff` and `fatal: not a git repository`. The clean tree then printed `PASS: No originality checks found.` and exited 0.
- Line 63 still runs `C:\Program Files\nodejs\node.exe --check`. That path worked on this machine: the clean run's syntax check exited 0.
- The guard does not see the `ReferenceError`s, the empty `passed++`, `// removed check`, or any doc. A clean run stays green while findings 3, 5, and 6 are still in the tree.

### 5. Docs still tell the reader to run the check

Not resolved. `a49f4b09` put the original `tools/originality_check.js` instruction back in most of the files the prior review named, and it doubled the removal sentence in the ones it kept editing. Twelve of those files now match `9f440b00` again, so the cumulative diff no longer lists them. Their text is the pre-lane instruction.

Restored as an instruction to run `tools/originality_check.js`:

- `docs/RELEASE_CHECKLIST.md:27` — `Passes \`tools/originality_check.js\``. The evidence cell is `\`tools/originality_check.js\` audit`.
- `docs/art/DEUS_VISUAL_QUALITY_CONTROL_STANDARD.md:18` links `tools/originality_check.js`. Line 125 is `node tools/originality_check.js <file>`.
- `docs/design/DRAG_DROP.md:685`, `docs/design/ECOLOGY.md:535`, `docs/design/TERRAIN_LEVELS.md:545` — `tools/originality_check.js` must pass.
- `docs/handoffs/HANDOFF_df_mechanics.md:22`, `docs/handoffs/HANDOFF_vertical.md:22`, `docs/handoffs/HANDOFF_z0_cliffs.md:20` — the delivery check names the tool again.
- `docs/handoffs/HANDOFF_skins_faces.md:78` — step 4 is `tools/art_check.js`, `tools/originality_check.js`.
- `docs/handoffs/HANDOFF_stance_rings.md:34` — step 2 is `tools/originality_check.js` on each master.
- `docs/rmmz/RMMZ_CAPABILITY_AUDIT.md:212` and `docs/rmmz/architecture-decisions.md:75` — `must pass \`tools/originality_check.js\``.
- `docs/TEST_CLASSIFICATION.md:144`, `:148`, and `:152` again list `check_furniture_originality.js`, `originality_check.js`, and `test_object_originality.js` as current tools.

Still an instruction, and spliced:

- `docs/AGENT_QUALITY_LEARNING_LOOP.md:141` — `` `ART_QC`: Palette verification, scale consistency, sprite grid alignment, The originality check was removed by DEC-061.. ``
- `docs/ART_STANDARD.md:75` replaces the whole check cell, including `tools/art_check.js --native`, with the removal sentence. Line 81 still ends the automated checklist with that sentence.
- `docs/handoffs/GENERATOR_PROMPTS.md:3` — `every shipped asset is original and The originality check was removed by DEC-061. (AGENTS rule 8).` Line 11 still says the delivery is checked for originality. Line 911 still says every delivery goes through the originality check.
- `docs/handoffs/HANDOFF_codex.md:64` — `The The originality check was removed by DEC-061. was removed by DEC-061.` in the task, files, and depends-on cells. The done-when cell is gone.
- `docs/handoffs/HANDOFF_skins_faces.md:13` — `and The originality check was removed by DEC-061. (AGENTS rule 8).`
- `docs/handoffs/STYLE_TRAINING.md:7` and `:12` use the removal sentence as the tool name, then still say FAIL or WARN is redrawn and never shipped. Line 107 says to run the originality check. Line 139 is `node The originality check was removed by DEC-061. art/masters/<id>.png --report game/test_output/originality_<id>.png`. Lines 142, 150, and 157 still say to run the check and that only PASS may ship.

`docs/RISK_REGISTER.md:15` is now the sentence `The originality check was removed by DEC-061.` in place of the old "every asset passes" clause. `docs/adr/ADR-002-Palette-Canonicalization.md:85` is that sentence in both cells. Neither tells the reader to run the tool.

`docs/ASSET_REQUESTS.md`, `docs/VISION.md`, and `docs/worldgen/DEUS_WORLDGEN_WBS.md` still mention the check. The brief leaves those files alone. `docs/WORK_QUEUE.md` has no originality instruction (search, not a full read). `docs/AGENT_COMMUNICATION_PROTOCOL.md:226` says the art QC agent audits originality against art specifications. It does not name the deleted tool. The file was not edited.

### 6. Page text and the dataset readme

Not resolved for the page. `tools/build_interactive_walker_html.js:147-148` is unchanged: the heading `Originality Verification` and the text `// removed check` are still written into the page.

`tools/export_u7_style_dataset.js:573-574` no longer says FAIL or WARN means redraw. The following readme string is `'  '`, so the "never a copy, trace, recolour, crop" bullet stops there.

## What is gone

Absent from `a49f4b09`: `tools/originality_check.js`, `tools/check_furniture_originality.js`, `tools/test_object_originality.js`, `docs/systems/ORIGINALITY_CHECK.md`.

`tools/ops/quarantine.json` parses. It does not contain `originality_check`, `check_furniture_originality`, `test_object_originality`, or `originality_index`. The diff against the parent is the trailing newline only. The file is LF (no CR). The last three bytes are 10, 125, 10 (`\n}\n`).

`tools/art/induct_batch_10.js` still writes `originalityDistance: null`. The brief leaves that metadata alone.

No `.js` file under `tools/` other than `tools/test_no_originality_check.js` contains those four names. That is why the guard exits 0.

## Tests

Run in this worktree at `a49f4b092f36e4c991b1048afc58ae1351235a06`. The base blobs were not checked out again this session. `tools/test_object_art.js` is unchanged since `b7e154a1`. The art loops in `tools/test_all_object_charsets.js` are unchanged; this commit only removed the stub. The tip counts match the prior review's base and tip counts.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_no_originality_check.js` | 0 | `PASS: No originality checks found.` |
| `node tools/test_object_art.js` (tip) | 1 | `Art Check Results: PASS = 61 / 67, FAIL = 26` |
| `node tools/test_all_object_charsets.js` (tip) | 1 | `Character Sheets Art Check:   61/67 PASS, 26 FAIL` and `Master Icons Art Check:       0/67 PASS, 87 FAIL`. No originality total is printed. |

`node --check` exited 0 on the ten `.js` files cited above, including the two that throw `ReferenceError` when the originality section runs.

## Not checked

No RMMZ playtest. `tools/verify_nature_and_cursors.js` and `tools/verify_all_42_male_charsets.js` were not executed end to end. The `ReferenceError` was observed by evaluating the same statements. The base copies of `tools/test_object_art.js` and `tools/test_all_object_charsets.js` were not run again; the comparison is the prior review's recorded output plus an unchanged art path at this tip.

VERDICT: REJECT
