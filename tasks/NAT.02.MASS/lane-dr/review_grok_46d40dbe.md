# Review: NAT.02.MASS lane-dr

- Reviewer: grok (family grok)
- Writer family: codex (implementation commit author deus-codex, subject tag `[codex]`)
- TIP (full hash reviewed): `46d40dbee3e8fb7294149e3a5eb84a2f41f72da9`
- Last non-review commit: `b16037d5335dbd1a49e34bfe2674053cd9eb9140`
- Branch: `task/lane-dr`
- Parent of TIP: `b16037d5335dbd1a49e34bfe2674053cd9eb9140`
- Implementation parent: `74a9d7eee9497b70c9a027753864cf6e975003d8` (PM lane open)
- Branch point of the lane: `917f2755f823d7aad297769d09db600ff653b8c1`
- Worktree was clean before this review file (`git status --porcelain` printed nothing)

TIP is the previous review commit. Its only change is `tasks/NAT.02.MASS/lane-dr/review_grok_b16037d5.md` (182 insertions). The centipound implementation is the parent, `b16037d5335dbd1a49e34bfe2674053cd9eb9140`. This review checks the tree at TIP.

`git fetch origin` exited 0. After fetch, `git rev-parse origin/main` printed `de8ef5e1bc09600f802104d7130458d7aa5144cc`. `git merge-base origin/main HEAD` printed `46d40dbee3e8fb7294149e3a5eb84a2f41f72da9`. `git merge-base --is-ancestor HEAD origin/main` exited 0, so TIP is already contained in `origin/main`.

`git log --format='%h %an | %s' origin/main..HEAD` printed no lines.

Lane commits from the branch point (`git log --format='%h %an | %s' 917f2755f823d7aad297769d09db600ff653b8c1..HEAD`):

```
46d40dbe deus-grok | [grok] NAT.02.MASS lane-dr review: review_grok_b16037d5.md (VERDICT: PASS WITH MINORS)
b16037d5 deus-codex | [codex] NAT.02.MASS store reclaim and world item centipounds
74a9d7ee deus-pm | [pm] Open lane-dr (NAT.02.MASS part 4, writer codex): reclaim and world items store and post centipounds; rubble part dropped under DEC-083
```

`node tools/check_deus_syntax.js` and `node tools/sim/test_ledger.js` were left to merge_gate.

## Check 1 — Scope

`git merge-base --is-ancestor 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD` exited 1. `15a6fe4c12eb15237f3c0d496d75d119a41d4940` is not an ancestor of TIP, so `git diff --name-status` between those two trees also lists files this branch does not change.

`git diff --name-status 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD`:

```
M	.agents/rules/deus-game-translation.md
M	docs/AUDIT_LOG.md
M	docs/OWNER_DECISIONS.md
D	docs/design/COLLAPSE_REPLAN_DEC083.md
D	docs/design/WAVE3_BRIEF_NOTES_2026-10-02.md
D	docs/handoffs/HANDOFF_AG_COORDINATOR_2026-10-02.md
M	docs/systems/DEUS_Reclamation.md
M	docs/systems/DEUS_WorldItems.md
M	game/data/sim/mass_tables.json
M	game/js/sim/reclaim.js
M	game/js/sim/world_items/catalog.js
M	game/js/sim/world_items/ledger_bridge.js
M	game/js/sim/world_items/world.js
A	tasks/NAT.02.MASS/lane-dr/BRIEF.md
A	tasks/NAT.02.MASS/lane-dr/lane.json
A	tasks/NAT.02.MASS/lane-dr/review_grok_b16037d5.md
D	tasks/OPS.MAIN.GREEN/lane-gp/BRIEF.md
D	tasks/OPS.MAIN.GREEN/lane-gp/REPORT.md
D	tasks/OPS.MAIN.GREEN/lane-gp/convert_geology_fixture.js
D	tasks/OPS.MAIN.GREEN/lane-gp/lane.json
D	tasks/OPS.MAIN.GREEN/lane-gp/review_grok_ecd1f50f.md
M	tools/sim/test_living_world_rules.js
M	tools/sim/test_reclaim.js
M	tools/sim/test_reclaim_longrun.js
M	tools/test_area_generation_speed.js
M	tools/world_items/test_world_items.js
M	tools/zrange/fixtures/geology_304ca7b2_seed18.json
M	tools/zrange/zrange_suite.js
```

`git log --format='%h %an | %s' 917f2755f823d7aad297769d09db600ff653b8c1..15a6fe4c12eb15237f3c0d496d75d119a41d4940`:

```
15a6fe4c deus-pm | [pm] DEC-088: AG takes the coordinator seat, Claude codes; the handoff brief docs/handoffs/HANDOFF_AG_COORDINATOR_2026-10-02.md
d874e0be deus-pm | [pm] DEC-087 (eight process cuts, Owner "do all"), AUDIT A13-17 (timing-sensitive zrange census), the DEC-083 collapse re-plan and the wave-3 brief notes moved into docs/design
86a51589 deus-pm | Merge task/lane-gp at 9d8db81291086e5978ca078be0b4a202906f8982 (OPS.MAIN.GREEN lane-gp) via merge_gate
91d37ae5 deus-pm | [pm] DEC-065: the Owner accepted the narrowing (2026-10-02): New Game builds the start and faction-home areas; the simulation, never the view, drives generation
9d8db812 deus-grok | [grok] OPS.MAIN.GREEN lane-gp review: review_grok_ecd1f50f.md (VERDICT: CLEAN PASS)
8a918a24 deus-pm | [pm] AUDIT_LOG A13-16: the coordinator edited launch_worker.ps1 live in the main checkout (astra-max model, whole-file rewrite); reverted, lane-dr relaunched
ecd1f50f deus-claude | [claude] OPS.MAIN.GREEN: speed harness installs the sim hook, six stump mass rows, zrange census counts objects by id
3aae2b8c deus-pm | [pm] Open lane-gp (OPS.MAIN.GREEN, writer claude): main's four red gates after the lane-gh, lane-do2 and lane-dc merges
```

Those commits account for the paths outside `lane.json` `allowedPaths` (the agents rule, audit and decision logs, the design and handoff docs, `mass_tables.json`, the lane-gp task files, the speed harness, and the zrange fixture and suite).

`git rev-parse 74a9d7eee9497b70c9a027753864cf6e975003d8^` printed `917f2755f823d7aad297769d09db600ff653b8c1`. The lane's own tree diff, `git diff --name-status 917f2755f823d7aad297769d09db600ff653b8c1 HEAD`:

```
M	docs/systems/DEUS_Reclamation.md
M	docs/systems/DEUS_WorldItems.md
M	game/js/sim/reclaim.js
M	game/js/sim/world_items/catalog.js
M	game/js/sim/world_items/ledger_bridge.js
M	game/js/sim/world_items/world.js
A	tasks/NAT.02.MASS/lane-dr/BRIEF.md
A	tasks/NAT.02.MASS/lane-dr/lane.json
A	tasks/NAT.02.MASS/lane-dr/review_grok_b16037d5.md
M	tools/sim/test_living_world_rules.js
M	tools/sim/test_reclaim.js
M	tools/sim/test_reclaim_longrun.js
M	tools/world_items/test_world_items.js
```

Every path matches `tasks/NAT.02.MASS/lane-dr/lane.json` `allowedPaths`. `git show --stat b16037d5335dbd1a49e34bfe2674053cd9eb9140` is 10 files changed, 319 insertions, 200 deletions, and does not include `BRIEF.md`, `lane.json`, or `REPORT.md`. The writer commit did not edit the manifest or the brief.

`git diff --numstat 74a9d7eee9497b70c9a027753864cf6e975003d8 b16037d5335dbd1a49e34bfe2674053cd9eb9140` and the same command with `--ignore-cr-at-eol` printed the same counts: Reclamation 5/4, WorldItems 2/2, reclaim.js 81/74, catalog.js 33/25, ledger_bridge.js 2/2, world.js 28/21, test_living_world_rules.js 4/4, test_reclaim.js 101/38, test_reclaim_longrun.js 12/29, test_world_items.js 51/1. A byte scan of the thirteen lane paths reported `bom=false` and `crlf=0` on each. reclaim.js is a field rename plus the `E_UNIT` refusal and the schema-2 restore guard (81/74 on a file whose `SCHEMA` export is line 1004). world.js is 28/21 on a file the scan reported at 1887 newline-splits. No whole-file rewrite and no BOM.

## Check 2 — Scope items at TIP

The Scope section of the brief is five bullets. Each is present at `46d40dbee3e8fb7294149e3a5eb84a2f41f72da9`.

1. Manifest, branch, writer, reviewer, gate commands. `tasks/NAT.02.MASS/lane-dr/lane.json` lines 2-6 name lane-dr, NAT.02.MASS, `task/lane-dr`, writer codex, reviewer grok. Lines 21-63 are the six gate commands from the brief (`check_deus_syntax`, `test_reclaim`, `test_reclaim_longrun`, `test_living_world_rules`, `test_world_items`, `test_ledger`), each `timeoutSec` 900. `allowedPaths` lines 7-20 match the brief.

2. `reclaim.js` stores and posts `cp`. Places use `cp` at `blankPlace` line 193, `givePlace` 215-218, `available` 228-230, `takeCp` 234-244, `compact` 249. `postingAmount` lines 259-261 return `p.cp` only. `scalePostings` line 269 returns `{ error: "E_UNIT" }` when that is null, and `applyMaterial` line 345 and `applyElementPostings` line 377 pass that to `soft` before `runMoves`. `mine` line 671 returns `soft("E_UNIT", id)` before `applyMaterial`. `soft` (lines 113-117) calls `die` when strict, and `die` (lines 103-108) throws `e.code`. The strict probe below left both checksums unchanged. `registerCommon` lines 552-556 takes `cp` and returns `{ ok, cp, cls, form }`. `registerObject` line 615 reads `line.cp`. `mine` line 675 reads `unmapped.cp`. `blocks` lines 895-911 and `checksum` lines 921-924 carry `cp`. `snapshot` line 933 writes `schema: 2`. `restore` lines 945-952 refuse schema 1 with `E_UNIT_PROVENANCE`, then require schema 2 and a safe `place.cp` with no `mu` property, and only then call `ledger.restore` at line 952. Export `SCHEMA: 2` is line 1004. `note` line 817 is still `postElement(..., "collapse", ...)` and the writer diff does not change that line. `registerSlice` line 578 is still `exempt: o.exempt !== false` and that expression is outside the writer diff. A search of `reclaim.js`, `catalog.js`, `world.js`, and `ledger_bridge.js` finds `mu` / `massMu` only as the legacy refusal strings at `reclaim.js:950` and `world.js:1676`.

3. World items derive and post `massCp`. `catalog.js` `massCp` lines 16-21 are `floor((weightOz * CP_PER_LB + OZ_PER_LB / 2) / OZ_PER_LB)` with a safe-integer check. `CP_PER_LB` is 100 (`units.js:5`) and `OZ_PER_LB` is 16 (`world_items/constants.js:28`). `row` line 33 sets `massCp: massCp(spec.weightOz)`. The catalog has no `massMu` field. `world.js` carries `massCp` at makeItem 95, postRegister 395-397, surface collapse 430-436, seeded expand 1163, burn 1233-1240, container spill 1254-1263, rot 1337-1341, copy 1442, serialize 1482, restoreTree 1600. `saveChanges` line 1528 writes `v: 2`. `loadChanges` lines 1672-1680 refuse a blob whose `v` is not 2, or any nested key `massMu`, with `E_SAVE` before tombstones, manifests, items, or deposits are applied. `fail` at lines 17-20 throws `err.code`. `ledger_bridge.js` line 24 recounts `item.massCp`. `applyPlan` lines 8-11 pass `step.amount` to `ledger.transform`.

4. Tests feed raw cp rows. `adaptForReclaim` and `placeMu` are absent from the four owned test files. Both reclaim suites read `mass_tables.json` directly (`test_reclaim.js` lines 15-19, longrun lines 14-17). `placeCp` is `test_reclaim.js:45-49` and `test_living_world_rules.js:544-548`, used at living-world lines 654-655. `cpPins` are `test_reclaim_longrun.js:19-20`: seed 1 `0bc6fb75`, seed 2 `df4a146a`, with the comment that the place and checksum field names changed from `mu` to `cp`. The brief's probe text names `registerObject("stump")`. The new check calls `registerObject("wall_wood")` at `test_reclaim.js:56`. `stump` lines are `cp` at `game/data/sim/mass_tables.json:3076-3080`, and `wall_wood` lines are `cp` at `mass_tables.json:912-915`. `registerObject` uses `line.cp` for every object. Named checks: `reclaim_fields_are_cp` test_reclaim.js:60, `posting_amount_reads_cp` :126, `reclaim_old_snapshot_refused` :78, `reclaim_snapshot_roundtrip_cp` :82, `no_mu_identifiers` :96 (four files, empty allowlist, comment line 87), `world_item_mass_matches_weight` test_world_items.js:38, `world_item_ledger_cp` :409, `world_item_old_save_refused` :451. Mutants: `accept_mu_records_mutant_killed` test_reclaim.js:127-129 and `no_25_over_4_mutant_killed` test_world_items.js:62-63. Leak and duplicate injections remain at test_reclaim.js:287, :296, :329, :347 and longrun line 133.

5. Docs. `docs/systems/DEUS_Reclamation.md` line 5 states integer centipounds and `E_UNIT`. Line 15 says the yield list's cp. Lines 23-24 state schema 2, `E_UNIT_PROVENANCE`, and no conversion. Line 60 points the gate pins at `test_reclaim_longrun.js`. The old `D-MU-UNIT` bullet is gone (Left open starts at line 66). `docs/systems/DEUS_WorldItems.md` line 29 states save `v: 2` and `E_SAVE` for `v: 1` or `massMu`. Line 39 replaces `massMu` with weight-derived `massCp` (3 lb = 300, 1 oz = 6, 2 oz = 13).

## Check 3 — Changed tests and named mutants

`node tools/sim/test_reclaim.js` exited 0.

```
PASS reclaim_fields_are_cp
PASS reclaim_old_snapshot_refused
PASS reclaim_snapshot_roundtrip_cp
PASS no_mu_identifiers
PASS posting_amount_reads_cp
PASS accept_mu_records_mutant_killed
PASS catalogue validates
PASS reclaim has no host calls
PASS vm load
PASS mine four slices
PASS mine keeps one floor slice
PASS mine posts the slice mass
PASS legacy two stone is not the ledger mass
PASS mine family constant
PASS soil mine stays soil
PASS build campfire
PASS collapse campfire
PASS deconstruct wall
PASS ore harvest keeps cp
PASS unsealed ore placement is registration phase
PASS sealed ore placement is refused
PASS exempt iron stays metal
PASS gold stays scrap
PASS finite families constant
PASS bone rots to one humus block
PASS bone family constant
PASS rubble reclaims to stone
PASS wood reclaim reaches humus
PASS snapshot restore
PASS tampered place fails recount
PASS good snapshot again
PASS duplicated cp is caught
PASS leaked cp is caught
PASS sealed unpaid deck
PASS undeclared item creates nothing
PASS mutant leak cp fails the run
PASS mutant duplicated cp fails the run
PASS same seed same checksum
PASS jobs posts mine build and tick
PASS objects guard ore and post harvest
PASS floors post build deconstruct and deck
PASS items post appear and remove
PASS walls post collapse
PASS unmapped tin is not invented
RESULT: 44 passed, 0 failed
```

`node tools/sim/test_reclaim_longrun.js` exited 0.

```
PASS seed 1 conserves for 4000 ticks
PASS seed 1 deterministic
PASS seed 2 conserves
PASS seeds differ
PASS seed 1 exempt iron untouched
PASS seed 1 outdoor iron is trace
PASS seed 1 gold scrap remains
PASS seed 1 ore mass unchanged
PASS seed 1 gem family unchanged
PASS seed 1 humus block formed
PASS seed 1 closure
PASS seed 2 exempt iron untouched
PASS seed 2 outdoor iron is trace
PASS seed 2 gold scrap remains
PASS seed 2 ore mass unchanged
PASS seed 2 gem family unchanged
PASS seed 2 humus block formed
PASS seed 2 closure
PASS pinned checksums
PASS injected cp fails the long run
CHECKSUM seed1 0bc6fb75
CHECKSUM seed2 df4a146a
RESULT: 20 passed, 0 failed
```

`node tools/sim/test_living_world_rules.js` exited 0.

```
PRE-FIX 75cf2ff399e5fdbce1f69e7178e4cb4329374eee
PASS F-01 rejects the 5-level 1 ft model — rejected (levels -2,-1,0,1,2 want -16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15; zRange {"zMin":-2,"zMax":2}; isLevel false for 27 levels in range, first -16; feet cell 5 stratum 1 per 5 step 5; no worldStrataElevationAt)
PASS F-03 rejects an ore sprout row — rejected (0:rocks_small->ironstone)
PASS F-05 mutant bind stays unset — mutant left window.UF.Fluid unset
PASS F-01 -16..+15 — env -16..+15 and state; levels 32 feet 5/2/10 elevation -16=4,-11=29,-10=34,-9=39,-8=44,-7=49,-6=54,-5=59,-4=64,-3=69
PASS F-02 -16..+15 — below-core 14 uniform; mixed levels 2; scratch 1/32; grids before 0 after write 1 after read 1 volume 3
PASS F-03 -16..+15 — scheduled ore refused at -16,0,15; beats 320; ore hits 0
PASS F-04 -16..+15 — mine z -16 4 slices moved, 1 kept; mine z 0 4 slices moved, 1 kept; mine z 15 4 slices moved, 1 kept; soil z -1 stayed soil; quarry z -16 4 slices moved, 1 kept; campfire collapse conserved
PASS F-05 -16..+15 — bound before Core; volume 22 across 32 layers; bottom 22
PASS F-01 -4..+4 — env -4..+4 and state; levels 9 feet 5/2/10 elevation -4=4
PASS F-02 -4..+4 — below-core 2 uniform; mixed levels 2; scratch 1/9; grids before 0 after write 1 after read 1 volume 3
PASS F-03 -4..+4 — scheduled ore refused at -4,0,4; beats 320; ore hits 0
PASS F-04 -4..+4 — mine z -4 4 slices moved, 1 kept; mine z 0 4 slices moved, 1 kept; mine z 4 4 slices moved, 1 kept; soil z -1 stayed soil; quarry z -4 4 slices moved, 1 kept; campfire collapse conserved
PASS F-05 -4..+4 — bound before Core; volume 22 across 9 layers; bottom 22
RESULT: PASS (0 failed)
```

`node tools/world_items/test_world_items.js` exited 0. Ninety `PASS` lines, including `world_item_mass_matches_weight`, `no_25_over_4_mutant_killed`, `world_item_ledger_cp`, `mass_burn`, `mass_spill`, `world_item_old_save_refused`, and `save_roundtrip`. Last line: `RESULT: 90 passed, 0 failed`.

The suites apply the mutants in memory. A separate in-memory run of the same anchors (catalog replacement `weightOz * CP_PER_LB` -> `weightOz`, one hit; reclaim insertion of `if (typeof p.mu === "number") return p.mu;` after the `p.cp` read, one hit) printed:

```
no_25_over_4 anchor_count 1 replacement weightOz * CP_PER_LB -> weightOz
world_item_mass_matches_weight real PASS rows 22
world_item_mass_matches_weight mutant FAIL wrong 22 of 22
no_25_over_4 longsword real 300 mutant 3
no_25_over_4 key_brass real 6 mutant 0
no_25_over_4 sack real 50 mutant 1
no_25_over_4 massCp(2) real 13 mutant 0
accept_mu_records anchor_count 1
posting_amount_reads_cp real PASS mu:E_UNIT sessionSame:true ledgerSame:true, du:E_UNIT sessionSame:true ledgerSame:true
posting_amount_reads_cp mutant FAIL mu: sessionSame:false ledgerSame:false, du: sessionSame:false ledgerSame:false
MUTANT_COUNTS no_25_over_4_wrong=22/22 accept_mu_records_ok=false
```

That run exited 0 and did not rewrite files on disk. `no_25_over_4` makes `world_item_mass_matches_weight` fail for all 22 catalog rows; the longsword becomes 3. `accept_mu_records` makes `posting_amount_reads_cp` fail for both `mu` and `du`: the mine returns no `E_UNIT` and both checksums change. The real function refuses both with `E_UNIT` and both checksums stay put.

## Check 4 — REPORT.md

`tasks/NAT.02.MASS/lane-dr/REPORT.md` is not in the worktree and is not in TIP. The lane directory lists `BRIEF.md`, `lane.json`, and `review_grok_b16037d5.md`. `git show --stat` of the writer commit lists ten files and does not list a report. There is no number in a report to compare, so the report overstates nothing. It omits the whole session report, the quoted test output, the GAME TRANSLATION block, and the cpPins handoff the brief asks the writer to record. The values this run produced, which that handoff would have carried, are seed 1 `0bc6fb75` and seed 2 `df4a146a` (20 passed, 0 failed), reclaim 44 passed / 0 failed, world items 90 passed / 0 failed, living-world `RESULT: PASS (0 failed)`. Those two pins are the constants at `test_reclaim_longrun.js:20`, and the long-run output above matches them.

No in-game scene was run. The brief classes this lane C: neither plugin is enabled by this lane, and the lane does not add one.

## Check N — merge-tree

`git fetch origin` exited 0. `git rev-parse origin/main` printed `de8ef5e1bc09600f802104d7130458d7aa5144cc`. `git merge-base origin/main HEAD` printed `46d40dbee3e8fb7294149e3a5eb84a2f41f72da9`.

`git merge-tree --write-tree origin/main HEAD` exited 0 and printed `df23103e65e331e47b05e25e33d1b950e6a04bf6`.

## Findings

MINOR. `REPORT.md` was not committed. The brief requires that file for the session report, the quoted test output, the GAME TRANSLATION block, and the cpPins reason. The pins and the field-rename reason are in `tools/sim/test_reclaim_longrun.js:19-20`, and this run matched the pins. The missing file does not change the posted amounts.

MINOR. `docs/systems/DEUS_Reclamation.md:60` says the older `checksums.json` records the prior field spelling. `tools/sim/fixtures/reclaim/checksums.json` is two hashes, `"1": "07830127"` and `"2": "d082be50"`. It has no field name. Those hashes are the long-run pins quoted in `tasks/SIM.40.11/lane-ad/review_gemini_22ca4163.md`, and they are neither the lane-do pins in `tasks/NAT.02.MASS/lane-do/REPORT.md` (`1afb4f75`, `54b9da8d`) nor this lane's pins (`0bc6fb75`, `df4a146a`). The same sentence sends the gate to `test_reclaim_longrun.js`, and the long run matched those pins.

VERDICT: PASS WITH MINORS
