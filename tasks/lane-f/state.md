# Task State: LANE-F — Absolute OneDrive-Link Rewrite Preparation

- **Task ID:** `LANE-F`
- **WBS ID:** not named in the lane brief (governing directives: DEUS Directive 001, 001-A, 001-B, 001-C)
- **Role:** Writer: Claude CLI (lane-f) | Reviewer: not named in the brief (Coordinator: Gemini)
- **Branch / Worktree:** `task/lane-f` (`C:\Users\snewt\.deus_worktrees\lane-f`)
- **Base Commit:** `09448a9` ([gemini] DEUS-DIR-001-B). The LANE-F checkpoint is the commit that adds this file.
- **Current Gate:** Prepared, **not applied**. The diff goes on the tree only at the migration freeze point.

## Owned File Set
- `tools/migration/rewrite_onedrive_links.js`
- `docs/migration/onedrive_links_inventory.md` (generated)
- `docs/migration/onedrive_links_rewrite.diff` (generated)
- `tasks/lane-f/state.md`

No other tracked file was modified. `docs/STATUS.md` was not edited: the brief limits the file set. The coordinator still needs to add Lane F to the worker board.

## What is Done (with Evidence)
1. **Scan** of tracked `.md`/`.js`/`.json` files, plus a listing of other tracked text files. Counts from the dry-run on `09448a9`:
   - `file:///` links: **136** in 26 files (116 lines). All 136 are REWRITE.
   - Windows-path forms: 192. REWRITE 74, MANUAL 63, KEEP 16, OUT_OF_SCOPE 39 (`.ps1`, `.log`).
   - Tool-directory slugs: 4 (MANUAL 2, KEEP 2). The word alone: 8 (INFO).
   - **Totals:** REWRITE 210, MANUAL 65, KEEP 18, INFO 8, OUT_OF_SCOPE 39. The patch changes 36 files (+190/−190 lines).
   - The brief estimated 103 occurrences. The tree at `09448a9` holds 136 `file:///` links alone. The tool counts; it does not assume.
2. **Rewrite rules** (the tool header and the inventory both document them):
   - A `file:///` link becomes a path relative to the linking document, so it still resolves. Links inside the markdown template of `tools/build_srd_character_presentation.js` resolve from the doc it generates (`docs/art/`).
   - A Windows path with a sub-path in live markdown becomes repo-root-relative (`docs/X.md`).
   - Bare repo-root declarations, code, data, and autolinks are MANUAL.
   - Fenced blocks, pasted transcript blocks (`<USER_REQUEST>`…), `docs/archive/`, and external tool-state paths are KEEP.
3. **Tool behaviour:** there is no in-place write mode. `--dry-run` writes only the inventory and the diff. `--check` exits 1 while rewritable paths remain. Before writing anything, the tool checks its own output: no REWRITE-class match may survive in the rewritten text, the MANUAL/KEEP/INFO counts must not change, and every new relative link must resolve back to its original target.
4. **Verification run on 2026-09-25** (all in `.lanef_scratch/`, a git-ignored throwaway folder; the tracked files in this worktree were not touched):
   - `git apply --check docs/migration/onedrive_links_rewrite.diff` → exit 0. Each `index` line's pre-image hash equals `git rev-parse HEAD:<file>`.
   - Scratch repo built from `git archive HEAD` (`core.autocrlf=false`, matching the repo config). Results:
     - `--check` before the patch → exit 1, "210 rewritable OneDrive path(s) remain".
     - `git apply` → exit 0, 36 files changed.
     - `--check` after the patch → exit 0, REWRITE=0 MANUAL=65 KEEP=18 INFO=8.
     - Re-running `--dry-run` → 0 rewrites (idempotent).
     - All 36 patched blobs equal the diff's post-image hashes.
   - Separate link check, not using the tool's own code: 136 relative links on added lines, 0 unresolved.
   - Edge-case fixture (no trailing newline, fence, transcript block, archive, autolink, JS/JSON code paths, the generator, `.ps1`, the `UFO` look-alike): the patch applies, and the 4 rewritten files match hand-written expected files byte-for-byte. The untouched files stay unchanged.
   - Mutants, all caught:
     - Link base-dir bug → the tool's own check fails, exit 1, nothing written.
     - Missing "No newline" markers → `git apply` fails.
     - Fence detection disabled → output differs from the expected files.
     - `--check` that never fails → the "exit 1 before the patch" expectation catches it.
     - One corrupted context line in the real diff → `git apply --check` exit 1.

## Freeze-Point Procedure (for the integration authority)
1. Every writer commits and pauses (the migration freeze).
2. On the frozen canonical tree, run `node tools/migration/rewrite_onedrive_links.js --dry-run`. This regenerates both outputs against the frozen docs; the committed diff is only a preview against `09448a9`.
3. Review the diff and the MANUAL table, then run `git apply --check docs/migration/onedrive_links_rewrite.diff` and `git apply docs/migration/onedrive_links_rewrite.diff`.
   - Use the default whitespace mode. Ten changed lines end in the markdown hard-break double space that was already in the source, so `--whitespace=error` would reject them and `--whitespace=fix` would strip them.
4. Run `node tools/migration/rewrite_onedrive_links.js --check` → must print PASS.

## Exact Next Step
- Coordinator review of this checkpoint and decisions on the MANUAL items below. No further LANE-F writes until then.

## Open Defects / Questions
- **MANUAL, 65 items. Owner/Coordinator wording needed.**
  - 48 bare repo-root declarations have no relative form: the AGENTS.md rule 14 "one canonical project" line, `docs/ENGINEERING_STANDARD.md`, `docs/ARCHITECTURE.md`, the packet headers, and `tasks/*/state.md`. Options: name the post-migration root, or use wording like "the repository root".
  - Three lines also name the new root: `docs/CONSOLIDATION_PLAN_V1.md` lines 14 and 69 (describe the move; probably keep) and `docs/SECURITY_AND_SECRETS.md` line 43 (lists both roots; drop the old one).
  - `art/staging/chest_audit/audit_report.json`: 12 absolute paths, written by `tools/audit_chest_frames.js`.
  - `tools/deus_usage_telemetry.js` lines 101 and 138 hardcode the Claude/Grok session-store directory names derived from the old path. They will stop finding sessions after the move.
- **OUT_OF_SCOPE, 39 items in 19 `.ps1`/`.log` files.** They will break after the move. This includes `tools/launch_workers.ps1` (the active worker launcher) and 16 other PowerShell tools with a hardcoded root. They need a separate task, because the brief scope is `.md`/`.js`/`.json`.
- **Pre-existing dangling targets.** The rewrite keeps them pointing at the same place:
  - `docs/systems/jobs.md` and `docs/systems/crafting.md`: not in the repo.
  - `scratch/synthetic_probe.js` and `game/test_output`: untracked or ignored.
- **INFO:** the `docs/ENGINE_RULES.md` line 9 advice about OneDrive sync will be stale after the move.

## Relevant Commands
```bash
node tools/migration/rewrite_onedrive_links.js --dry-run
node tools/migration/rewrite_onedrive_links.js --check
git apply --check docs/migration/onedrive_links_rewrite.diff
```
