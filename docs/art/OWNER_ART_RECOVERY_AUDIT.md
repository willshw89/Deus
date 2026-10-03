# Owner art recovery audit — 2026-10-03

This is a source-recovery inventory, not an art approval or a game induction. The authority for the historic votes and Owner picks is [COUNCIL_RECORD.md](../../art/COUNCIL_RECORD.md). A council pass, an Owner pick, a PM YEA in [APPROVALS.md](../../art/APPROVALS.md), a committed source, and a loaded game asset are separate facts. Earlier approvals are superseded by later Owner decisions where stated below. The art council is now suspended under DEC-079; the Owner grades art in game.

The lane began from `038a02c35922df825fd7d47d948d7747d4e56755` on `task/art-import-cliffs`. Before this lane, the approved cliff source components below existed in the 2026-10-01 PM backup, not at the corresponding committed `art/masters/source_sets/` paths. This source-recovery change preserves them byte-identically at those paths without changing pixels. The [import manifest](../../art/masters/source_sets/CLIFFS_OWNER_SOURCE_IMPORT_2026-10-03.json) gives **each** source absolute path, target path, SHA-256, byte count, dimensions, known PixelLab source-sheet job ID, and explicit unknown individual generation ID. It distinguishes 34 approved top/face components from 51 related/reference files. The source files and provenance remain reviewable independently of runtime induction. No cliff PM YEA row or game induction is established by this import.

Search was bounded to `git ls-tree`/`git log --all` for the named art families, [APPROVALS.md](../../art/APPROVALS.md), the canonical `scratchpad/pixellab/` references recorded by the council, and the preserved `C:/Users/snewt/DEUS_backups/pm_art_2026-10-01/{pixellab,fauna}/` folders. The backup is evidence, not a committed deliverable. “Candidate” means the record identifies a design or board but does not prove which cut file was judged. “No exact committed source matched” means no matching source was established in the searched art paths; it is not a repository-wide byte-scan conclusion. A processed committed PNG may represent an approved design without matching the backup source byte-for-byte; this audit does not assert pixel identity without a matching hash. The artifact ledger at the end records exact Git paths, introducing commits and SHA-256 hashes where a committed artifact is traceable.

Recovery status key: **A** means a traceable committed artifact at the exact Git path, commit and hash in the ledger; it may be a processed version, not the backup's same bytes. **B** means source evidence in the PM backup or council scratchpad only, including candidate boards/cuts whose exact approval mapping is unresolved. **C** would mean no source candidate found in the bounded search. For the 17 approved cliff-set rows, all were B before this lane; their byte-identical source components are preserved in this change. Among the 62 non-cliff rows (including three later-superseded fauna originals), 35 have A artifacts plus B backup evidence, 27 have B evidence only, and **zero are classified C**. Of those 62, 41 explicitly carry source-identity uncertainty such as a candidate cut, unresolved mapping or differing source/artifact hashes. Zero C does **not** prove that no art was lost; it means the bounded backup search found at least a candidate for each recorded approval.

## Cliff picks and recovered source

The ten legacy sets were finally approved together by the Owner at [council lines 197–214](../../art/COUNCIL_RECORD.md), recorded in `62aad76b7a541fd3997821dbe78a38202060c572`. The three sheet-A picks were recorded in `fbcc847e80e940998d9f0e8ff41b6e7f7b5f4499` ([lines 230–232](../../art/COUNCIL_RECORD.md)); four sheet-B picks in `b4d724b6dcf7275802d8a784500ccb60cd8ad78f` ([lines 234–236](../../art/COUNCIL_RECORD.md)). The “source pair” below is relative to the backup `pixellab/` root. Both components of every listed pair are now under the existing top/side catalogue IDs, with paths and hashes in the manifest. The A/B variants share those existing material IDs because the catalogue has no A/B variant rows; this import does not invent them.

| Approved set | Latest record | Before lane: backup source pair | After lane | Recovery status |
|---|---|---|---|---|
| 01 granite | Owner all-ten pick; top v6, face v6 | `cliffs_a4/v6/set01_{top,face}_v6.png` | Imported pair; manifest material `granite` | B before recovery → source preserved in this change |
| 02 soil | Owner all-ten override; v7/v7 | `cliffs_a4/v7/set02_{top,face}_v7.png` | Imported pair; `soil` | B before recovery → source preserved in this change |
| 03 sand over sandstone | Owner all-ten pick; v6/v6 | `cliffs_a4/v6/set03_{top,face}_v6.png` | Imported pair; manifest material `sandstone` (catalogue ID has `SAND`) | B before recovery → source preserved in this change |
| 04 mud | Owner all-ten pick; v6/v6 | `cliffs_a4/v6/set04_{top,face}_v6.png` | Imported pair; `mud` | B before recovery → source preserved in this change |
| 05 cave limestone | Owner all-ten override; **v5 top / v7 face** | `cliffs_a4/v6/set05_top_v6.png` (selected-v5 top copy); `cliffs_a4/v7/set05_face_v7.png` | Imported pair; `limestone` | B before recovery → source preserved in this change |
| 06 lichen rock | Owner retained; v6 top / v7 face | `cliffs_a4/v6/set06_top_v6.png`; `cliffs_a4/v7/set06_face_v7.png` | Imported pair; `lichen` | B before recovery → source preserved in this change |
| 07 rooted soil | Owner all-ten pick; v6/v6 | `cliffs_a4/v6/set07_{top,face}_v6.png` | Imported pair; `rooted` | B before recovery → source preserved in this change |
| 08 banded sandstone | Owner all-ten pick; v6/v6 | `cliffs_a4/v6/set08_{top,face}_v6.png` | Imported pair; `banded` | B before recovery → source preserved in this change |
| 09 red clay | Owner all-ten override; v6 top / v7 face | `cliffs_a4/v6/set09_top_v6.png`; `cliffs_a4/v7/set09_face_v7.png` | Imported pair; manifest material `clay` (catalogue ID has `RED-CLAY`) | B before recovery → source preserved in this change |
| 10 layered strata | Owner all-ten override; v7/v7 | `cliffs_a4/v7/set10_{top,face}_v7.png` | Imported pair; `strata` | B before recovery → source preserved in this change |
| Sheet A dry grass | Owner bottom-left-three pick | `round17/final_cliffs/drygrass_{top,face}.png` | Imported pair; `drygrass` | B before recovery → source preserved in this change |
| Sheet A forest floor | Owner bottom-left-three pick | `round17/final_cliffs/forest_{top,face}.png` | Imported pair; `forest` | B before recovery → source preserved in this change |
| Sheet A needle floor | Owner bottom-left-three pick | `round17/final_cliffs/needle_{top,face}.png` | Imported pair; `needle` | B before recovery → source preserved in this change |
| Sheet B dry grass | Owner top-four pick | `round17/final_cliffs/drygrass_B_{top,face}.png` | Imported pair; `drygrass` B | B before recovery → source preserved in this change |
| Sheet B forest floor | Owner top-four pick | `round17/final_cliffs/forest_B_{top,face}.png` | Imported pair; `forest` B | B before recovery → source preserved in this change |
| Sheet B needle floor | Owner top-four pick | `round17/final_cliffs/needle_B_{top,face}.png` | Imported pair; `needle` B | B before recovery → source preserved in this change |
| Sheet B stony | Owner top-four pick | `round17/final_cliffs/stony_B_{top,face}.png` | Imported pair; `stony` B | B before recovery → source preserved in this change |

The Owner's earlier isolated limestone override at [lines 155–161](../../art/COUNCIL_RECORD.md), commit `2ac5b39335e76e34b186be0002ee17ae8e4c1eb0`, was **withdrawn**; the later all-ten pick is the effective approval. The rejected round-9 layered-strata recolour (`round9/owner_pick_limestone_strata.png`) is a historical composite reference, not the approved v7/v7 source. The round-17 sheet-A dry-grass and sheet-B stony owner picks supersede the different variants shown in ART-COUNCIL-11. Related A4 cuts, B bodies/boards, and tall assembled examples are preserved as references in the manifest, not certified as separate approved assets. `regrid/set_05_cave_limestone.png` has unresolved lineage and is marked accordingly. The latest Owner runtime request addresses **three** cliff sets; recovery of the seven round-17 source picks and ten older sets does not expand that runtime acceptance scope. The Owner resolved the wall frame on 2026-10-03 as **48 px face + 48 px cap = 96 px total**, replacing the previously open 48+48 versus 96+48 choice. ART-WIRE-WALLS remains parked until ORG-0.2 is green; this lane makes no re-cut, loader, or runtime art change.

## Other approved record assets

The following covers every non-cliff piece recorded as passed or Owner-kept in the council record, including passed originals that the Owner later superseded. `P/` below means `C:/Users/snewt/DEUS_backups/pm_art_2026-10-01/pixellab/`; `F/` means the sibling `fauna/` folder. All rows are **before this lane** unless a cliff import is stated above. `A:` points to a committed processed artifact in the exact-path ledger below; it does not imply byte identity with the backup. No source files in this section were copied in ART-IMPORT-CLIFFS.

| Record item | Latest approval state | Before-lane source / committed trace | Recovery status |
|---|---|---|---|
| Oak stump | Council 2, 4/4; current | `P/trees/oak_stump6_px.png`; A: `TREE_OAK_DEPLETED` | A committed artifact + B backup source |
| Swamp stump | Council 2, 4/4; current | `P/trees/swamp_stump6_px.png`; A: `TREE_SWAMP_DEPLETED` | A committed artifact + B backup source |
| Dead stump | Council 2, 4/4; current | `P/trees/dead_stump6_px.png`; A: `TREE_DEAD-TREE_DEPLETED` | A committed artifact + B backup source |
| Birch stump | Council 2, 4/4; current | `P/trees/birch_stump6_px.png`; A: `TREE_BIRCH_DEPLETED` | A committed artifact + B backup source |
| Apple/fruit stump | Council 2, 4/4; current | `P/trees/fruit_stump6_px.png`; A: `TREE_FRUIT-TREE_DEPLETED` | A committed artifact + B backup source |
| Pine stump | Council 2, 4/4; current | `P/trees/pine_stump6_px.png`; A: `TREE_PINE_DEPLETED` | A committed artifact + B backup source |
| Hanging roots | Councils 5–6, 4/4; current | `P/group4/roots_px550.png` candidate; exact judged cut not established; no committed source matched | B backup/source candidate only |
| Oak tree v7 | Councils 5–6, 4/4; current | `P/trees/v7/oak_v7.png` candidate (`oak_v7k.png` also survives); A: `TREE_OAK_DEFAULT` | A committed artifact + B backup source |
| Swamp tree | Councils 5–6, 4/4; current | `P/trees/v4/swamp_v4.png` candidate; A: `TREE_SWAMP_DEFAULT` | A committed artifact + B backup source |
| Dead tree | Councils 5–6, 4/4; current | `P/trees/v4/dead_v4.png` candidate; A: `TREE_DEAD-TREE_DEFAULT` | A committed artifact + B backup source |
| Birch tree | Councils 5–6, 4/4; current | `P/trees/v4/birch_v4.png` candidate (`birch_v4b.png` also survives); A: `TREE_BIRCH_DEFAULT` | A committed artifact + B backup source |
| Pine tree | Councils 5–6, 4/4; current | `P/trees/v4/pine_v4.png` candidate (`pine_v4b.png` also survives); A: `TREE_PINE_DEFAULT` | A committed artifact + B backup source |
| Hanging vines v5 | Owner kept after 3/4 split, [lines 163–169](../../art/COUNCIL_RECORD.md) | `P/group4/vines_v5px.png` candidate; no committed source matched | B backup/source candidate only |
| Stalactites v5 | Owner kept after 3/4 split, same ruling | `P/group4/stal_v5px.png` candidate; no committed source matched | B backup/source candidate only |
| Fruit tree B | Council 10, passed after fix | `P/round17/final_flora/fruit_tree_b.png`; A: `TREE_FRUIT-TREE_DEFAULT`; backup/final and A hashes differ | A committed artifact + B backup source |
| Bare fruit tree | Council 10, Owner kept | `P/round17/final_flora/fruit_tree_bare.png`; A: `TREE_FRUIT-TREE-BARE_DEFAULT`; hashes differ | A committed artifact + B backup source |
| Sapling | Council 10, passed after fix | `P/round17/final_flora/sapling_fix.png` likely fixed cut; A: `TREE_SAPLING_DEFAULT`; hashes differ | A committed artifact + B backup source |
| Broadleaf crown | Council 10, Owner kept as drawn | `P/round17/final_flora/canopy_2x2.png`; no exact committed source matched | B backup/source candidate only |
| Fallen log | Council 10, passed after fix | `P/round17/final_flora/fallen_log.png`; no exact committed source matched | B backup/source candidate only |
| Bush | Council 10, passed after fix | `P/round17/final_flora/bush.png`; A: `FLORA_BUSH_DEFAULT`; hashes differ | A committed artifact + B backup source |
| Flower clump 1 | Council 10, Owner kept | `P/round17/final_flora/flowers_1.png`; processed A flower family exists, exact index mapping/hash not established | A committed artifact + B backup source |
| Flower clump 2 | Council 10, Owner kept | `P/round17/final_flora/flowers_2.png`; processed A flower family exists, exact index mapping/hash not established | A committed artifact + B backup source |
| Flower clump 3 | Council 10, Owner kept | `P/round17/final_flora/flowers_3.png`; processed A flower family exists, exact index mapping/hash not established | A committed artifact + B backup source |
| Flower clump 4 | Council 10, Owner kept | `P/round17/final_flora/flowers_4.png`; processed A flower family exists, exact index mapping/hash not established | A committed artifact + B backup source |
| Grass tuft 1 | Council 10, passed after fix | `P/round17/final_flora/grass_tufts_1.png`; A tuft family exists, source/artifact hash differs | A committed artifact + B backup source |
| Grass tuft 2 | Council 10, passed after fix | `P/round17/final_flora/grass_tufts_2.png`; A tuft family exists, source/artifact hash differs | A committed artifact + B backup source |
| Grass tuft 3 | Council 10, passed after fix | `P/round17/final_flora/grass_tufts_3.png`; A tuft family exists, source/artifact hash differs | A committed artifact + B backup source |
| Grass tuft 4 | Council 10, Owner kept as drawn | `P/round17/final_flora/grass_tufts_4.png`; A tuft family exists, source/artifact hash differs | A committed artifact + B backup source |
| Mushroom clump 1 | Council 10, passed after fix | `P/round17/final_flora/mushrooms_1.png`; no exact committed source matched | B backup/source candidate only |
| Mushroom clump 2 | Council 10, passed after fix | `P/round17/final_flora/mushrooms_2.png`; no exact committed source matched | B backup/source candidate only |
| Large mossy boulder | Council 11, passed after fix | Candidate `P/round17/cut_stones/` and `P/council2/c11_objects.png`; exact cut mapping unresolved; no exact committed source matched | B backup/source candidate only |
| Granite boulders (group) | Council 11, passed after fix | Same stone board/cuts; group-to-cut mapping unresolved; no exact committed source matched | B backup/source candidate only |
| Small rocks (group) | Council 11, passed after fix | Same stone board/cuts; group-to-cut mapping unresolved; no exact committed source matched | B backup/source candidate only |
| Rock strained | Council 11, passed after fixes | Candidate `P/round17/marks_pro_0.png` and cut-stone board; exact cut unresolved; no exact committed source matched | B backup/source candidate only |
| Ground scar | Council 11, passed after fix | Candidate `P/round17/marks_pro_0.png` and `P/round18/cut_decals/`; exact cut unresolved; no exact committed source matched | B backup/source candidate only |
| Stairs up | Council 12, passed after fix | Candidate `P/council2/c12_under.png`, `P/round17/cut_under/`; exact fixed cut unresolved; no exact committed source matched | B backup/source candidate only |
| Stairs down | Council 12, passed after fix | Same underground board/cuts; exact fixed cut unresolved; no exact committed source matched | B backup/source candidate only |
| Earth ramp down | Council 12, passed after fix | Same underground board/cuts; exact fixed cut unresolved; no exact committed source matched | B backup/source candidate only |
| Pit wall | Council 12, passed after fix | Same underground board/cuts; exact fixed cut unresolved; no exact committed source matched | B backup/source candidate only |
| Ladder | Council 12, passed after fix | Same underground board/cuts; exact fixed cut unresolved; no exact committed source matched | B backup/source candidate only |
| Ladder top | Council 12, passed after fix | Same underground board/cuts; exact fixed cut unresolved; no exact committed source matched | B backup/source candidate only |
| Rope ladder | Council 12, passed after fix | Same underground board/cuts; exact fixed cut unresolved; no exact committed source matched | B backup/source candidate only |
| Lava | Council 13, passed after fix; replaces rejected round-18 lava | Candidate `P/round22/lava_body_a_fix.png`; exact judged cut unresolved; no exact committed source matched | B backup/source candidate only |
| Small crown A | Council 13, passed after fix | Candidate `P/round22/crown1x1_a_fix.png`; exact judged cut unresolved; no exact committed source matched | B backup/source candidate only |
| Small crown B | Council 13, passed after fix | Candidate `P/round22/crown1x1_b_fix.png`; exact judged cut unresolved; no exact committed source matched | B backup/source candidate only |
| Large crown A | Council 13, passed after fix | Candidate `P/round22/crown2x2_a_fix.png`; exact judged cut unresolved; no exact committed source matched | B backup/source candidate only |
| Large crown B | Council 13, passed after fix | Candidate `P/round22/crown2x2_b_fix.png`; exact judged cut unresolved; no exact committed source matched | B backup/source candidate only |
| Wolf | Councils 14–15, passed; current | `F/chars/wolf/`; A: `FAUNA/wolf` with PixelLab ID in `source.json` | A committed artifact + B backup source |
| Fox | Councils 14–15, passed; current | `F/chars/fox/`; A: `FAUNA/fox` | A committed artifact + B backup source |
| Wildcat | Councils 14–15 original passed with fixes, then **superseded** by Owner redraw; redraw has no vote in this record | `F/chars/wildcat/`, `F/chars/wildcat-h/`; no `art/fauna/wildcat` on searched refs; original must not be treated as current approval | B backup/source candidate only |
| Boar | Councils 14–15, passed; current | `F/chars/boar/`; A: `FAUNA/boar` | A committed artifact + B backup source |
| Aurochs bull | Councils 14–15 original passed with fix, then **superseded** by Owner redraw; redraw has no vote in this record | `F/chars/aurochs/`, `F/chars/aurochs-f/`; no `art/fauna/aurochs` on searched refs | B backup/source candidate only |
| Wild sheep (ram) | Councils 14–15, passed after fix; current | `F/chars/wild-sheep-fix/` candidate; A: `FAUNA/wild_sheep` | A committed artifact + B backup source |
| Hare | Councils 14–15, passed; current | `F/chars/hare/`; A: `FAUNA/hare` | A committed artifact + B backup source |
| Rat | Councils 14–15, passed after fix; current | `F/chars/rat-half-fix/` candidate; A: `FAUNA/rat` | A committed artifact + B backup source |
| Hen | Councils 14–15, passed; current | `F/chars/fowl/`; A: `FAUNA/fowl` | A committed artifact + B backup source |
| Hawk | Councils 14–15, passed; current | `F/chars/hawk/`; A: `FAUNA/hawk` | A committed artifact + B backup source |
| Songbird | Councils 14–15, passed; current | `F/chars/songbird/`; A: `FAUNA/songbird` | A committed artifact + B backup source |
| Bat | Councils 14–15, passed; current | `F/chars/bat-half/` candidate; A: `FAUNA/bat` | A committed artifact + B backup source |
| Serpent | Councils 14–15 original passed with fix, then **superseded** by Owner redraw; redraw has no vote in this record | `F/chars/serpent/`, `F/chars/serpent-h/`; no `art/fauna/serpent` on searched refs | B backup/source candidate only |
| Giant spider | Councils 14–15 original passed; later full-size redraw separately awaits vote | `F/chars/spider/`; redraw `F/chars/spider-f/` is not covered by original pass; A: `FAUNA/giant_spider` | A committed artifact + B backup source |
| Restless dead | Councils 14–15, passed after fix; current | `F/chars/restless-dead4-fix/` candidate; A: `FAUNA/restless_dead` | A committed artifact + B backup source |

Three-of-four pieces left for the Owner to decide are **not** approved by this record: ART-COUNCIL-11 steam vent, rock failing, soil strained/failing, ash patch and sediment; ART-COUNCIL-12 earth ramp up, waterfall, light shaft and dust; ART-COUNCIL-13 obsidian. Red deer stag and wild horse were also 3/4 and then superseded by redraws without a recorded new vote. The rejected round-18 lava, fruit tree A, apple trees, and withdrawn troll/bog-horror generations likewise cannot be promoted by this audit. An art/council approval is not proof that the asset is loaded; no playtest or screenshot was run for this docs/source lane.

## Exact committed artifact ledger

These paths and hashes identify artifacts already committed at the base commit. They are not proofs of byte identity with the backup candidate unless explicitly stated. `A1` = `5a4e30f86ca3506f979e5977c9b0466b246018c0`, `A2` = `125219349cf67b44493678a66a1a92acd5c33ab7`, `F1` = `9e90606de2ec0a928ec2322bdf7c586eb4fbfb0d`. The `art/approved/` rows are processed/PM-approved derivatives; the 12 `art/fauna/<species>/south.png` rows are one exact committed source facing per inducted species, with seven other facings and `source.json` at the same prefix. These are Git object SHA-256 values, not new checksums on the backup.

| Key | Exact committed path | Introduced | SHA-256 |
|---|---|---|---|
| `FLORA_BUSH_DEFAULT` | `art/approved/SURFACE_SHARED_FLORA_BUSH_B-V1_DEFAULT.png` | A1 | `0d718a9088f57ab39ca4f25fe03bae5c409c9fc8a804870b595cd119997ac7df` |
| Flower family: blue | `art/approved/SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT.png` | A2 | `c99e86a686c5c27af0485969896df0a83141a033df26841664fa7f36c5c179fe` |
| Flower family: purple | `art/approved/SURFACE_SHARED_FLORA_FLOWERS-PURPLE_B-V1_DEFAULT.png` | A2 | `c0d39b5a8a5c4baa9db3d8d74198ff5de6919116b5da9b531852df8cc2d5938e` |
| Flower family: white | `art/approved/SURFACE_SHARED_FLORA_FLOWERS-WHITE_B-V1_DEFAULT.png` | A1 | `0ecb01000c9acbe3a76e6d7dfbc87e2b285f515e79b680ede44afd87a1f68792` |
| Flower family: mixed | `art/approved/SURFACE_SHARED_FLORA_FLOWERS_B-V1_DEFAULT.png` | A2 | `c30576deb4b07b8138bdf262c73b2e9cec0c9b844e5037e5ad91bd3fb7b9546f` |
| Tuft family: V1 | `art/approved/SURFACE_SHARED_FLORA_GRASS-TUFT_B-V1_DEFAULT.png` | A1 | `9830e002135f6b3c554200aed5e5939e20610edfad46e8f6b6c485d8c96b6bb8` |
| Tuft family: V2 | `art/approved/SURFACE_SHARED_FLORA_GRASS-TUFT_B-V2_DEFAULT.png` | A1 | `6722d6be1d7437ce91a569639a4f51119166634bb8319ab1f6d52cf16e701701` |
| Tuft family: V3 | `art/approved/SURFACE_SHARED_FLORA_GRASS-TUFT_B-V3_DEFAULT.png` | A1 | `0ab2837c979810a8cae12aa750187ff0c503853b000437ecf41745abfad1d0de` |
| Tuft family: V4 | `art/approved/SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT.png` | A2 | `6a32c487cf8914082c1add62e59db2427edaf90e88c252e078a2089478ff526e` |
| `TREE_BIRCH_DEFAULT` | `art/approved/SURFACE_SHARED_TREE_BIRCH_B-V1_DEFAULT.png` | A1 | `c8a239c534b2a8e509d6ccbd2a99dcb9afe21ada8b16dd068cd0795b7d467747` |
| `TREE_BIRCH_DEPLETED` | `art/approved/SURFACE_SHARED_TREE_BIRCH_B-V1_DEPLETED.png` | A1 | `f64ffcee9394020a09d3af1b4cc7890b6d25dbb3a45c241b5d99ad673b7651fe` |
| `TREE_DEAD-TREE_DEFAULT` | `art/approved/SURFACE_SHARED_TREE_DEAD-TREE_B-V1_DEFAULT.png` | A1 | `78209b52835be26b23bd919b97515ae47734b1f236e71ac3dc6e3e68c024ccfb` |
| `TREE_DEAD-TREE_DEPLETED` | `art/approved/SURFACE_SHARED_TREE_DEAD-TREE_B-V1_DEPLETED.png` | A1 | `ff7a5a828ffb1215e3467f911204b1db1692da6c0e6d473489e783b335b72377` |
| `TREE_FRUIT-TREE-BARE_DEFAULT` | `art/approved/SURFACE_SHARED_TREE_FRUIT-TREE-BARE_B-V1_DEFAULT.png` | A2 | `d3a755a8495d86c00043f2c3681f0b0a4d147bb4c991649a0cee8c29b4c5e80b` |
| `TREE_FRUIT-TREE_DEFAULT` | `art/approved/SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT.png` | A2 | `b1834430748fb4cce6d5ce52e8e928281d133b53de5dd6022d6bb8b834abaf4e` |
| `TREE_FRUIT-TREE_DEPLETED` | `art/approved/SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEPLETED.png` | A1 | `fa1b40518804c6fd8fc4748709663617e40e2f2036d93c3065805b4ad3889126` |
| `TREE_OAK_DEFAULT` | `art/approved/SURFACE_SHARED_TREE_OAK_B-V1_DEFAULT.png` | A1 | `2db44565f0e0761515890ae4bd512b95693c41d50a474e52cd78f107160622ac` |
| `TREE_OAK_DEPLETED` | `art/approved/SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED.png` | A1 | `08760f2592fa69eb5bb05537cc72b9b275302d6217800640e4c8e9eab6e3bb5a` |
| `TREE_PINE_DEFAULT` | `art/approved/SURFACE_SHARED_TREE_PINE_B-V1_DEFAULT.png` | A1 | `8d6ff2f8169dddad88eeb65d4f0982e5650b94cb486d91dc1373c2ea204c532a` |
| `TREE_PINE_DEPLETED` | `art/approved/SURFACE_SHARED_TREE_PINE_B-V1_DEPLETED.png` | A1 | `d1b913a0916af0ec0b74d82b5a7b89f719b090b8c3c991cf8e56ddac5bf4a1ad` |
| `TREE_SAPLING_DEFAULT` | `art/approved/SURFACE_SHARED_TREE_SAPLING_B-V1_DEFAULT.png` | A2 | `31201ea5c6e02214d4317bad40aa879d4f79ec1916f3c5e05617046d1d077a79` |
| `TREE_SWAMP_DEFAULT` | `art/approved/SURFACE_SHARED_TREE_SWAMP_B-V1_DEFAULT.png` | A1 | `a4e2c5dfd272bbeb8553fdd7cf8e2ce855648e9ba280c0f2a158d2f4ee6ae18f` |
| `TREE_SWAMP_DEPLETED` | `art/approved/SURFACE_SHARED_TREE_SWAMP_B-V1_DEPLETED.png` | A1 | `ba740c66021abf7d0f66f359b111baaa092d2490d5787e9d915df5b9b9f7a2df` |
| `FAUNA/wolf` | `art/fauna/wolf/south.png` | F1 | `64a646dbc7fc051d1e2ab2f777f1fa6cd325684c341ccb90f5e724a40a9362c1` |
| `FAUNA/fox` | `art/fauna/fox/south.png` | F1 | `f85e6ca4e505f638698e4408eca7b81f553e1d5e3dc9ddb3a6b760a11fa84acd` |
| `FAUNA/boar` | `art/fauna/boar/south.png` | F1 | `ddb9204fbdd9f709d43bd63537e080196740bb0c89e107ed0aaf93011af414bb` |
| `FAUNA/wild_sheep` | `art/fauna/wild_sheep/south.png` | F1 | `127d98bb2bf73d2baf86bf156547dd2ffb473acf126c5fc8ac2c93acc0d20071` |
| `FAUNA/hare` | `art/fauna/hare/south.png` | F1 | `ab34a222713bc188b702f6602ec89ce61cfad2618eb92ec14697bba6c610ac40` |
| `FAUNA/rat` | `art/fauna/rat/south.png` | F1 | `7bfac6342eb7a9ffa572a57b65d7e19c5992d04a2d9b3992b9c2e83d92afc90d` |
| `FAUNA/fowl` | `art/fauna/fowl/south.png` | F1 | `36421aa82f04df11ec715b9e18a2a4f97cbd1ee750e980bc40e9482e01c6dc59` |
| `FAUNA/hawk` | `art/fauna/hawk/south.png` | F1 | `7c0e3d21a45d100c51844c87b2cc2154d018ce2bf468242e28e3da3e892ce949` |
| `FAUNA/songbird` | `art/fauna/songbird/south.png` | F1 | `eb2190943d6ac22921ae3228d1902819b87e3b2522cb14cc138948a91a2a076e` |
| `FAUNA/bat` | `art/fauna/bat/south.png` | F1 | `39a4eeb1ce5866da2a7bd2e94539c2e132be26f31d342814540c0f82b24a3cb0` |
| `FAUNA/giant_spider` | `art/fauna/giant_spider/south.png` | F1 | `9c3eb5299b76a54c4929f6a0efdb6b16b74c9b5b967d6470d26b0040f65a7ba3` |
| `FAUNA/restless_dead` | `art/fauna/restless_dead/south.png` | F1 | `312ac779fd241bd2bcc63a6fc207e28c207272a1372d313a09229b87860ecbec` |
