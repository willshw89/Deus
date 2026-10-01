# lane-gi: delete the originality check (DEC-061)

| Field | Value |
|---|---|
| WBS | OPS.ORIG.DELETE |
| taskId (manifest) | OPS.ORIG.DELETE |
| Branch | `task/lane-gi` |
| Manifest | `tasks/OPS.ORIG.DELETE/lane-gi/lane.json` |
| Writer -> reviewer | gemini -> grok (Owner, 2026-10-01: "Prompt gemini to start coding"; "Keep gemini coding too") |
| Dependencies | none |
| RMMZ editor must be closed | no (no `game/data` or `game/js` change) |

Base: `main` at `9f440b00` or later.

## Why

DEC-061 (Owner, 2026-10-01): "We can nix the originality check entirely. delete it off the planet. we are already controlling for originality".
- **Item 1.** The check's tools are deleted, not archived. That means `tools/originality_check.js`, `tools/check_furniture_originality.js` and `tools/test_object_originality.js`, plus the originality step in every pipeline script that calls them and the quarantine entries that name them.
- **Item 3.** The sweep runs as a reviewed cleanup lane. This is that lane.
- **Already done.** The PM already synced the binding rule files (AGENTS.md Rule 8, VISION).

## Scope

1. **Delete** `tools/originality_check.js`, `tools/check_furniture_originality.js`, `tools/test_object_originality.js` and `docs/systems/ORIGINALITY_CHECK.md` (`git rm`).
2. **Pipeline scripts.** In every script under `tools/` that requires, spawns or reads any of the three tools or their index (`reference/u7_originality_index.json`), remove the originality step and nothing else:
   - The script must still parse (`node --check`).
   - It must still do its other work unchanged.
   - Where a summary line or report reported the originality result, remove that line.
   - Where a script's only purpose was originality, delete it and name it in the report.
   - Find the scripts with `git grep -n -i -E "originality_check|check_furniture_originality|test_object_originality|originality_index|originalityDistance|checkOriginality" -- tools`. The PM's list at the base is in the manifest's `allowedPaths`.
3. **`tools/ops/quarantine.json`.** Remove every entry that names one of the three tools or the originality index. Keep the file valid JSON, in the same layout.
4. **Docs.** In the docs listed in `allowedPaths`, replace each instruction to run the originality check with one line saying it was removed by DEC-061. Change nothing else in those docs. Leave alone:
   - historical records: `docs/archive/**`, `docs/packets/**`, `docs/agents/**`, `docs/migration/**`, `tasks/**/evidence/**`, review files;
   - the governance files: `docs/OWNER_DECISIONS.md`, `docs/VISION.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `docs/worldgen/DEUS_WORLDGEN_WBS.md`;
   - `docs/ASSET_REQUESTS.md`, whose edits make the art catalogue stale;
   - `art/catalogue/**` (lane-cy2's slot);
   - the `originalityDistance` fields inside sprite sidecars and the catalogue (inert metadata).
5. **A guard test** `tools/test_no_originality_check.js`. It fails if:
   - any of the three tools or `docs/systems/ORIGINALITY_CHECK.md` exists;
   - any file under `tools/` (other than this test) requires, spawns or names them;
   - `tools/ops/quarantine.json` names them;
   - any script this lane changed fails `node --check` (the list is read from `git diff --name-only <merge-base> HEAD -- tools`).

   Show each check failing under a named mutant (AGENTS.md Rule 4), for example a restored `require("./originality_check")` line in one script, or a restored quarantine entry.

## Tests (lane.json gateTests; each runs in a fresh clone)

- `node tools/check_deus_syntax.js`
- `node tools/test_no_originality_check.js`
- Also run `node tools/test_all_object_charsets.js` and `node tools/test_object_art.js` at the base and at the tip. Both cite the check today. Quote both results in the report: each must be no worse at the tip.

## Out of scope

Anything not tied to the originality check. Do not reformat or "tidy" the scripts you touch.

## Rules

- Commit only on `task/lane-gi` with the `[gemini]` tag (launch_worker authors it `deus-gemini`), staging only the manifest paths.
- Push `task/lane-gi` when the work is committed, and end with FINAL SHA.
- The reviewer is launched through `tools/ops/launch_worker.ps1` (AUDIT_LOG A12). The PM merges through merge_gate.
- Report in the AGENTS.md format and write "not checked" for anything not observed.
