# ART-IMPORT-CLIFFS independent source-recovery review

**VERDICT: CLEAN PASS**

| Field | Value |
|---|---|
| Reviewer | Grok 4.7, model family Grok, role independent reviewer |
| Writer | Codex, commit author `deus-pm <deus-pm@local.invalid>` |
| Reviewed SHA | `4d0bc32d4cb6dd1999356f5a6e3cb0317242db57` |
| Parent | `038a02c35922df825fd7d47d948d7747d4e56755` |
| Branch | `task/art-import-cliffs` |
| Reviewed at | 2026-10-03 01:03 CT (UTC-5) |
| Review artifact | `docs/reviews/ART_RECOVERY_GROK_4d0bc32d.md` |

Preservation goal under review: a safe copy of the Owner-picked cliff sources from `C:/Users/snewt/DEUS_backups/pm_art_2026-10-01/pixellab` into `art/masters/source_sets/<existingCatalogueID>/`, with source paths, known PixelLab sheet job IDs, Owner-pick commits, and hashes. The backup stays the source of the bytes. This commit is source preservation and an inventory. It adds no game files, no `art/APPROVALS.md` rows, and no catalogue edits.

This review read `AGENTS.md`, the five `.agents/rules/deus-*.md` rules, and `docs/art/DEUS_ASSET_STANDARD.md` before any image-byte inspection. It produced no images. It did not open pixels in a viewer. Dimensions are PNG IHDR fields. No ORG-0.2 run, no native playtest, and no Deus runtime claim.

## What the writer commit contains

`git diff-tree --no-commit-id --name-status -r 4d0bc32d4cb6dd1999356f5a6e3cb0317242db57` lists 88 additions and no modifications or deletions:

- 85 PNG files under 28 `art/masters/source_sets/SURFACE_SHARED_TERRAIN_CLIFF-*` directories
- `art/masters/source_sets/CLIFFS_OWNER_SOURCE_IMPORT_2026-10-03.json`
- `art/masters/source_sets/FILE_LIST_SHA256.md`
- `docs/art/OWNER_ART_RECOVERY_AUDIT.md`

`git diff --name-only 038a02c3 4d0bc32d -- game art/APPROVALS.md art/catalogue art/sprites docs/OWNER_DECISIONS.md` is empty. `git cat-file -e 038a02c3:<target>` failed for all 85 targets: none of the imported paths existed at the parent.

## Byte identity

For all 85 manifest rows, SHA-256 and byte size of the backup file, the committed file, and the manifest agree. PNG IHDR width and height agree with `imageDimensionsPx` on all 85. `FILE_LIST_SHA256.md` has the same 85 targets, hashes, and sizes in the same order. Every `sourceAbsolutePath` resolves inside `C:/Users/snewt/DEUS_backups/pm_art_2026-10-01/pixellab` and equals that root plus `sourceRelative`. No `..` segment. Every host directory id is in `coversCatalogueIds`, and all 28 directory ids plus every covered id are present as `id` in `art/catalogue/catalogue.json` (unchanged by this commit). Target paths are unique. `pixelLabGenerationId` is null on all 85 rows. `byteIdenticalCopy` is true on all 85.

Status counts: `approved_component` 34, other statuses 51 (`related_cut_not_independently_approved` 14, `composite_reference` 22, `assembly_reference` 11, `multi_set_reference` 2, `related_cut_lineage_unverified` 1, `historical_composite_reference` 1).

Samples checked in that full pass:

| Role | Path | SHA-256 | Bytes | IHDR |
|---|---|---|---|---|
| Approved granite top | `cliffs_a4/v6/set01_top_v6.png` | `1fd2a0dbea6455fd4b97b57b3cf574e1bd12c353ae01921f68c906c15a42c341` | 6040 | 96×144 |
| Approved limestone top | `cliffs_a4/v6/set05_top_v6.png` | `d3f1c585334be5bd0df01d912d5a1834b4b52d5999493a85f5e6f41b31ccb78d` | 4540 | 96×144 |
| Approved limestone face | `cliffs_a4/v7/set05_face_v7.png` | `50b65b2fc3710891b683c73a2a47b531cd06ba6ff22f4412cea00f8d5c54b561` | 6071 | 96×96 |
| Approved sheet A dry-grass top | `round17/final_cliffs/drygrass_top.png` | `b256261f71ec181df6019202c67d36ec2b0db33c3c810305dd01bd909df41c21` | 5359 | 96×144 |
| Approved sheet B dry-grass top | `round17/final_cliffs/drygrass_B_top.png` | `32f475c530da2a40a68ec98f14d4aa94bd728c6103cca3304c3be474a1d6f333` | 5577 | 96×144 |
| Historical round-9 composite | `round9/owner_pick_limestone_strata.png` | `57417eb8c5800c3dcb177f70634cd944a953b1ddeacfeba0bf81198ae20e049e` | 52369 | 848×512 |
| Regrid set 05 | `regrid/set_05_cave_limestone.png` | `13465dce597b5255464eeec84c8b9e10e130d0c599612fcd50b796af4b2b86ce` | 7370 | 96×240 |

This review only read the backup. The match is against the backup as it existed at review time.

## Limestone, round 17, and labels

Council text at the reviewed SHA matches the manifest's approval basis.

- `2ac5b39335e76e34b186be0002ee17ae8e4c1eb0` records the isolated cave-limestone override. Later commit `5519288735f854aa085719c6a924b0f98610ece7` records the withdrawal ("dont like it") and is an ancestor of the all-ten commit. Current `art/COUNCIL_RECORD.md` lines 155–161 contain both the override and the withdrawal.
- `62aad76b7a541fd3997821dbe78a38202060c572` is the effective all-ten pick. Its table at lines 201–211 is v6/v6 for sets 01, 03, 04, 07, and 08; v7/v7 for 02 and 10; v6 top / v7 face for 06 and 09; **v5 top / v7 face for set 05**.
- Backup `cliffs_a4/v5/set05_top_v5.png` is byte-identical to `cliffs_a4/v6/set05_top_v6.png` (same hash and 4540 bytes). That is the imported approved top. `cliffs_a4/v7/set05_top_v7.png` is absent. `v5/set05_face_v5.png` matches `v6/set05_face_v6.png` (`50d0d7002750efc3529c9e57629e72747e523a8122034958abd61e920dbc6f99`, 6559 bytes) and differs from the imported v7 face.
- Round 9 `owner_pick_limestone_strata.png` is `historical_composite_reference`. Its note says the filename is not current approval evidence. Its hash differs from the approved limestone and strata components. Council lines 178–189 record the round-9 strata recolour as out (3 NO).
- `regrid/set_05_cave_limestone.png` is `related_cut_lineage_unverified`, 96×240, and its hash differs from both approved limestone components. The note says pixel equality to the approved v6/v7 pair was not established. That statement matches these hashes.
- `fbcc847e80e940998d9f0e8ff41b6e7f7b5f4499` is the sheet-A pick of dry grass, forest floor, and needle floor (council lines 230–232). `b4d724b6dcf7275802d8a784500ccb60cd8ad78f` adds the four sheet-B picks, including stony (lines 234–236). Both commits are ancestors of the reviewed SHA and touch `art/COUNCIL_RECORD.md`.
- Approved components are the `final_cliffs` top/face pairs plus the ten legacy top/face pairs named above. Boards, bodies, tall assemblies, earlier A4 cuts, the four-set B assemblies, the regrid file, and the round-9 composite are other statuses. Sheet A `a4/stony_*.png` files exist in the backup and are not in this import. Stony's Owner pick is the sheet-B pair.

Three backup files named as sheet-B A4 tops are byte-identical to the corresponding sheet-A approved tops, and the manifest hashes show that:

- `round17/a4/drygrassB_top.png` = `round17/final_cliffs/drygrass_top.png` = `round17/a4/drygrass_top.png` (`b256261f71ec…`)
- `round17/a4/forestB_top.png` = `round17/final_cliffs/forest_top.png` (`7182aae2352c…`)
- `round17/a4/needleB_top.png` = `round17/final_cliffs/needle_top.png` (`915b764ae577…`)

The same three B A4 faces match the B final faces, which differ from the A faces. Those B A4 tops are `related_cut_not_independently_approved`. The approved B tops are the distinct `final_cliffs/*_B_top.png` files. The destination names follow the backup filenames.

## PixelLab ids

`pixellab/genlog.jsonl` has two matching lines and no generation-id field:

- `15b6c85d-3aac-4ee6-859f-b2a017fd7f31` — `create_image_pro`, item "round 17 sheet cliffs_a", out `cliffs_a_pro_*.png`, 2026-10-01T15:34:48.888Z
- `78ea2c3d-cb34-4784-b360-82a24040b55e` — `create_image_pro`, item "round 17 sheet cliffs_b", out `cliffs_b_pro_*.png`, same timestamp

The manifest assigns the cliffs_a job to all 21 sheet-A files and the cliffs_b job to all 42 sheet-B files, including `tall_B4.png` and `tall_4B.png`. Legacy, regrid, and round-9 rows leave `pixelLabJobId` null (22 rows). The same two ids also appear in `pixellab/round17/r17.log`. Sampled PNGs have no `tEXt` / `iTXt` / `zTXt` chunks. Null individual generation ids match the genlog: it records the sheet job, and the cuts are later tooling.

## Council inventory

The audit's 17 cliff rows are the ten all-ten sets plus three sheet-A and four sheet-B picks. Each is described as B before this lane, with the source pair preserved here. That matches council lines 197–214 and 230–236. Earlier council rejections of those same sets are recorded above the all-ten override.

The 62 non-cliff rows match the passed or Owner-kept pieces, plus the three later-superseded fauna originals (wildcat, aurochs, serpent). Recount from the table: 35 rows say "A committed artifact + B backup source" and 27 say "B backup/source candidate only". None say C. The audit states that zero C means the bounded search found a candidate, and that it does not prove no art was lost.

Rows left for the Owner, or rejected, stay out of the 62: ART-COUNCIL-11 steam vent, rock failing, soil strained/failing, ash, sediment; ART-COUNCIL-12 earth ramp up, waterfall, light shaft, dust; ART-COUNCIL-13 obsidian; red deer and wild horse; withdrawn troll and bog horror; round-18 lava; fruit tree A; the apple trees. That matches the council tables read at lines 165–176, 216–226, 242–335.

All 63 backup paths and directories named in those 62 rows exist under `C:/Users/snewt/DEUS_backups/pm_art_2026-10-01/{pixellab,fauna}`. `art/fauna/wildcat`, `aurochs`, and `serpent` are absent from the commit, as the audit says. Eight sampled backup-versus-artifact pairs differ in SHA-256, including the oak stump (the row does not claim byte identity) and the fruit tree, bush, sapling, bare fruit tree, one flower, and one tuft (the rows that say the hashes differ or that the mapping is unresolved).

The summary sentence "of those 62, 41 explicitly carry source-identity uncertainty" matches the 41 non-stump, non-fauna rows (every one of those 41 uses candidate, unresolved, hash-differ, or "no exact committed source matched"). Four fauna rows also say "candidate": wild sheep, rat, bat, and restless dead. Wildcat, aurochs, and serpent are marked superseded, and the giant-spider row says the full-size redraw is outside the original pass. Those per-row words are in the table. The number 41 does not include them.

## Artifact ledger

The ledger's 35 values are content SHA-256 of the committed files. They match `git cat-file blob` at HEAD and at the cited introducing commit for every row. `git log --diff-filter=A` names that same commit as the adding commit for every row: A1 `5a4e30f86ca3506f979e5977c9b0466b246018c0`, A2 `125219349cf67b44493678a66a1a92acd5c33ab7`, F1 `9e90606de2ec0a928ec2322bdf7c586eb4fbfb0d`. Those paths are not checked out in this worktree; the hashes are from the Git object store. `art/fauna/wolf/source.json` at F1 contains `"generator": "PixelLab Create Character"` and a `pixellabCharacterId`.

The audit calls these "Git object SHA-256 values". This repository's object ids are SHA-1. The bush blob id at HEAD is `5391d6a8a18b6e240083007a24e39cbe923fe10c`. The ledger hash for that file is the content SHA-256, and that content hash is what was checked.

## Scope that stays parked

The commit does not recut pixels: approved tops are 96×144 and approved faces are 96×96, byte-identical to the named backup files. `docs/OWNER_DECISIONS.md` and `art/COUNCIL_RECORD.md` on this branch do not contain a separate 2026-10-03 wall-frame decision. The standing 48 px cap + 48 px face = 96 px total convention is already in `AGENTS.md` rule 13. This lane does not start ART-WIRE-WALLS and does not claim ORG-0.2 is green.

The diff touches nothing under `game/`. There is no GAME TRANSLATION block. What changed is source copies plus an inventory. What was tested is the static checks above. What was not checked is an in-game scene, a contact sheet, palette or seam QA, and any runtime acceptance of cave limestone or cliff sets. The audit says this import establishes no cliff PM YEA and does not expand runtime acceptance. That matches the empty game and APPROVALS diffs.

## Commands

Working directory: `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\art-import-cliffs`. Exit 0 unless noted.

- `git rev-parse HEAD` and `HEAD^` → the SHAs above. `git status --short --branch` at start was clean and level with `origin/task/art-import-cliffs`.
- `git diff-tree --name-status` and `git show --stat` → 88 additions, 2178 insertions.
- PowerShell `Get-FileHash -Algorithm SHA256` plus PNG IHDR on all 85 source and destination pairs, compared with the manifest. Result: 85/85 hash, size, and dimension matches; 0 present at the parent; 28 catalogue directories found in `catalogue.json`.
- `node` content SHA-256 of `git cat-file blob` for the 35 ledger paths, and `git log --diff-filter=A` for their adding commits. Result: 35/35 match.
- Backup path existence for the 63 non-cliff citations: 0 absent.
- Genlog parse for the two job ids: the two lines quoted above.

An earlier IHDR reader treated byte values as the shift width and reported false mismatches on images wider than 255 px. The recast-to-int rerun is the one counted here (`DIM_OK=85 DIM_FAIL=0`).

## Limits

- The summary count 41 omits four fauna rows that say "candidate", plus the superseded-fauna and spider-redraw notes. The A/B/C counts and the per-row text stand.
- The ledger phrase "Git object SHA-256" names content SHA-256 checksums. The checked values match those content hashes.
- Three files named as sheet-B A4 tops are byte-identical to the sheet-A approved tops. Their status is related, and the approved B tops are different files.
- No visual read of the pixels. Path, council text, and bytes are the identity evidence.
- No statement here that any imported file is loaded, PM-approved for the game, or accepted at runtime.
- ORG-0.2 was not run. Nothing in this review is a native or playable result.
