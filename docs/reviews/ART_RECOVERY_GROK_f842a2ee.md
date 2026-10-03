# ART-IMPORT-CLIFFS wording-correction review

**VERDICT: CLEAN PASS**

| Field | Value |
|---|---|
| Reviewer | Grok 4.7, model family Grok, role independent reviewer |
| Writer | Codex, commit author `deus-pm <deus-pm@local.invalid>` |
| Reviewed SHA | `f842a2eeda0576edacb468696fe5824a4a4c084d` |
| Parent | `9ba7924423a64024d456fe3ebb6f52c4dc4a6aa8` |
| Branch | `task/art-import-cliffs` |
| Reviewed at | 2026-10-03 01:18 CT (UTC-5) |
| Review artifact | `docs/reviews/ART_RECOVERY_GROK_f842a2ee.md` |
| Prior review | `docs/reviews/ART_RECOVERY_GROK_4d0bc32d.md`, CLEAN PASS for `4d0bc32d4cb6dd1999356f5a6e3cb0317242db57` |

Scope of this review: the two audit wording corrections in `f842a2ee`. The prior CLEAN PASS stays the review of the source import. This follow-up recounts the audit tables and compares Git blobs. It does not recertify the import by a new backup scan, pixel read, or runtime run.

The prior review file is in the parent and is unchanged here. Its blob id is `cb2294c025e4a3978a51e8c7a75536b5c8cb4bc2` at both `9ba79244` and `f842a2ee`.

This review read `AGENTS.md` and the five `.agents/rules/deus-*.md` rules. It produced no images. No ORG-0.2 run, no native playtest, and no Deus runtime claim. The writer diff touches nothing under `game/`, so there is no GAME TRANSLATION block. What changed is two sentences in the recovery audit. What was tested is the recount and the blob comparisons below. What was not checked is an in-game scene.

## Diff

`git diff-tree --no-commit-id --name-status -r f842a2eeda0576edacb468696fe5824a4a4c084d` lists one modification:

- `docs/art/OWNER_ART_RECOVERY_AUDIT.md`

`git show --stat` reports 1 file changed, 2 insertions, 2 deletions. `git diff --name-only 9ba79244 f842a2ee -- game art/APPROVALS.md art/catalogue` is empty. Between the import commit `4d0bc32d` and `f842a2ee`, the only path differences are this audit edit and the prior review file added by the parent.

The replaced recovery-status sentence now says: of the 62 non-cliff rows, at least 45 explicitly carry source-identity uncertainty, made of 41 non-stump flora/terrain rows plus the candidate sheep, rat, bat, and restless-dead sources, with the three superseded fauna originals and the spider redraw kept as separate approval-state caveats. The replaced ledger sentence now says the printed hashes are SHA-256 checksums of committed file contents read from Git blobs, that this repository uses SHA-1 object IDs, and that the values are not new checksums of the backup.

## Table recount

Cliff table: 17 data rows. Non-cliff table: 62 data rows. Recovery status on those 62 is `A committed artifact + B backup source` for 35 and `B backup/source candidate only` for 27. No other status text, and none is C. 35 + 27 = 62.

The 62 split on the trace cell, not on the status label `source candidate`:

| Group | Rows | Trace-cell source-identity phrase | Approval caveat in the row |
|---|---:|---:|---:|
| Stumps | 6 | 0 | 0 |
| Non-stump flora/terrain, including underground fixtures and lava | 41 | 41 | 0 |
| Candidate fauna: wild sheep, rat, bat, restless dead | 4 | 4 | 0 |
| Superseded originals: wildcat, aurochs, serpent | 3 | 0 | 3 |
| Giant spider | 1 | 0 | 1 |
| Other current fauna: wolf, fox, boar, hare, hen, hawk, songbird | 7 | 0 | 0 |

6 + 41 + 4 + 3 + 1 + 7 = 62. The 45 are the 41 plus the 4, and those two groups are disjoint. Each of the 41 trace cells contains `candidate`, `unresolved`, `hashes differ`, `hash differs`, `hash not established`, or `no exact committed source matched` / `no committed source matched`. The four flower rows use the wording `exact index mapping/hash not established`. Each of the four fauna trace cells contains `candidate` (`wild-sheep-fix`, `rat-half-fix`, `bat-half`, `restless-dead4-fix`). Wildcat, aurochs, and serpent say the original was superseded. The spider row says the later full-size redraw is not covered by the original pass. Those four caveats sit outside the 45, as the new sentence says.

The six stump rows and the seven other current fauna rows do not use those trace phrases. The status words `B backup/source candidate only` were not treated as the uncertainty marker.

## Ledger label

`git rev-parse --show-object-format` prints `sha1`. The ledger table has 35 rows: 23 under `art/approved/` and 12 `art/fauna/<species>/south.png` paths. For every row, SHA-256 of `git cat-file blob f842a2ee:<path>` equals the printed hash. All 35 Git object ids are 40 hex characters, and none equals that content hash. The adding commit from `git log -1 --diff-filter=A` is the cited `A1`, `A2`, or `F1` commit, and the blob at that commit equals the blob at `f842a2ee`. The blob at base `038a02c35922df825fd7d47d948d7747d4e56755` equals the blob at `f842a2ee` for all 35.

Bush sample: object id `5391d6a8a18b6e240083007a24e39cbe923fe10c`; content SHA-256 `0d718a9088f57ab39ca4f25fe03bae5c409c9fc8a804870b595cd119997ac7df`, which is the ledger value.

The corrected label matches these checks.

## Import bytes left in place

The tree id of `art/masters/source_sets` is `366b019733dda0040e63435321a47af0efa63300` at `4d0bc32d`, `9ba79244`, and `f842a2ee`. The manifest blob is `ca895e06d0c8af54c004ae9ccc6221d9f27541b9` and `FILE_LIST_SHA256.md` is `e51ff272b32a868e16773da20d06f33a7c8b9867` at all three commits. The manifest blob still lists 85 files, all with `.png` targets, and each target's blob id matches `4d0bc32d` (0 mismatches). Status counts inside that same blob: `approved_component` 34, `related_cut_not_independently_approved` 14, `composite_reference` 22, `assembly_reference` 11, `multi_set_reference` 2, `related_cut_lineage_unverified` 1, `historical_composite_reference` 1 (51 other, 85 total). The file list has 85 data rows. This session did not re-hash the backup.

## Commands

Working directory: `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\art-import-cliffs`. Exit 0 unless noted.

- `git rev-parse HEAD` → `f842a2eeda0576edacb468696fe5824a4a4c084d`. `HEAD^` → `9ba7924423a64024d456fe3ebb6f52c4dc4a6aa8`. `git status --short --branch` at start was clean and level with `origin/task/art-import-cliffs`.
- `git diff-tree --no-commit-id --name-status -r f842a2ee` and `git show --stat` → the one-file, two-line diff above.
- `node scratchpad/art-recovery-nits-review/grok-f842a2ee-check.js` → the recount, blob ids, and 35/35 content-hash result above.
- `node scratchpad/art-recovery-nits-review/grok-f842a2ee-ledger-count.js` → `PATHS 35 SOUTH 12 APPROVED 23 FAUNA 12`.

## Limits

- The prior CLEAN PASS for `4d0bc32d` remains the import review. Council line quotes, PixelLab genlog lines, and backup byte identity were not re-run.
- The 41 flora/terrain rows are the non-stump, non-fauna rows in the non-cliff table, including stairs, ladders, the earth ramp, the pit wall, and lava. The four flower rows use `exact index mapping/hash not established`.
- Ledger values were checked against Git blobs. Backup files were not hashed again.
- No visual read of the pixels. No statement here that any imported file is loaded, PM-approved for the game, or accepted at runtime.
- ORG-0.2 was not run. Nothing in this review is a native or playable result.
