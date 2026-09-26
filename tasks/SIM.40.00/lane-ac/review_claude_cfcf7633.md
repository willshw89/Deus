# SIM.40.00 review (Claude) of cfcf7633ab9a80d9507227e942d179c312957cae

Independent attack and mutation review of Lane AC (SIM.40.00: material catalogue, mass tables, pure reader). Writer: grok (commits by `deus-grok`). Reviewer: Claude, not Grok.

Every check ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach cfcf7633ab9a80d9507227e942d179c312957cae`), never in the live worktree. Code mutants were written to the clone's copy of `game/js/sim/materials.js` and restored byte for byte after each run (`restored byte-identical: true`; clone `git status --short` empty afterwards). The clone was deleted after the checks (`rm -rf` EXIT=0; existence test EXIT=1). In the live worktree no production file, fixture, tool, BRIEF or REPORT was edited; this file is the only file written. No art was generated, requested or integrated.

Reviewer probe scripts (outside the repo, not committed): `%TEMP%/lane-ac-review-EzfiWQ/work/` (`fixtures_probe.js`, `attack_probe.js`, `probe2.js`, `conserve_audit.js`, `code_mutants.js`, `purity_mutants.js`, `ice_demo.js`, `gold_demo.js`).

## 1. Identity

Live worktree, before any other command:

```
$ git rev-parse HEAD origin/task/lane-ac
cfcf7633ab9a80d9507227e942d179c312957cae
cfcf7633ab9a80d9507227e942d179c312957cae
EXIT=0
$ git log -12 --format="%H %an %s"
cfcf7633ab9a80d9507227e942d179c312957cae deus-grok [grok] SIM.40.00 record gate output in the lane report
ddbc3b8d2a542d8014373bc2c577aa2eeb70aeb1 deus-grok [grok] SIM.40.00 material catalogue, mass tables, and reader
27ef76773ce86e9367f6ecbce4ed55fb21266170 snewt [pm] Open lane-ac (SIM.40.00): BRIEF.md and lane.json
092c0181949c8cb2568d86546e7e03132445df9c snewt [gemini] Record Lane X completion and WBS WG.33.01 DONE
176bffe42ad80725e7c497793e3edad7fe2cb9dc snewt Merge task/lane-x: WG.33.01 world-state registry integrity checker (PM manual merge; merge_gate TEST_FAILED on pre-existing main catalogue pin: test_catalogue 46/47 and build_catalogue --check also fail on main fb5391fa; Grok VERDICT CLEAN PASS at b07087d5; review 85ffe5e7)
85ffe5e75e422ef20fc40f08196daca9b1aa733c deus-grok [grok] WG.33.01 review b07087d5
fb5391fa64992359487b7eb7988b2f0c288adc9d snewt [gemini] Record DEC-023..028 and WBS Rev 26 (SIM.40.00/.11, SIM.50.11-.13, SIM.60.05/.06, SIM.10.05)
5a68fd5ab8b3ce4aaf20d8d778cdac434335447c snewt Merge task/lane-v at 3e12866cdd55636f0b704a3de4c96e3d43bbe8d2 (SIM.60.02 lane-v) via merge_gate
b07087d5a043bda344cdb9790269e6a4458b78ad deus-claude [claude] WG.33.01 REPORT.md: record the report commit and the scope check
d132d007d5638ea2ac179294bbd2b45967d81ce0 deus-claude [claude] WG.33.01 REPORT.md and raw evidence (worktree and CRLF clone gates at 66641f1c, determinism, rebuilt-catalogue gate, section 7 cross-check)
3e12866cdd55636f0b704a3de4c96e3d43bbe8d2 deus-grok [grok] SIM.60.02 review 2ce93a0a
66641f1c960af36fb7ac3ee0b3355b882e8f1112 deus-claude [claude] WG.33.01 tests: reportOf() asserts a report exists, so a mutant that makes the tool exit 2 fails on an assertion, not a TypeError
EXIT=0
$ git ls-remote origin task/lane-ac
cfcf7633ab9a80d9507227e942d179c312957cae	refs/heads/task/lane-ac
EXIT=0
```

Clone: `git checkout --detach cfcf7633ab9a80d9507227e942d179c312957cae` EXIT=0; `git rev-parse HEAD` printed `cfcf7633ab9a80d9507227e942d179c312957cae`; `core.autocrlf` false; `git ls-files --eol` shows `i/lf w/lf` for all seven deliverables. `git merge-base --is-ancestor 092c0181949c8cb2568d86546e7e03132445df9c cfcf7633ab9a80d9507227e942d179c312957cae` EXIT=0 (3 commits on top of the base). Node v24.19.0.

## 2. Scope

```
$ git diff --name-status 092c0181949c8cb2568d86546e7e03132445df9c cfcf7633ab9a80d9507227e942d179c312957cae
A	docs/systems/DEUS_Materials.md
A	game/data/sim/README.md
A	game/data/sim/interactions.json
A	game/data/sim/mass_tables.json
A	game/data/sim/materials.json
A	game/js/sim/materials.js
A	tasks/SIM.40.00/lane-ac/BRIEF.md
A	tasks/SIM.40.00/lane-ac/REPORT.md
A	tasks/SIM.40.00/lane-ac/lane.json
A	tools/sim/fixtures/materials/bad_alloy.json
[... bad_blast, bad_bom, bad_calendar, bad_class, bad_collapse, bad_combustion, bad_coverage_item, bad_coverage_object, bad_family, bad_family_mass, bad_gap, bad_item_weight, bad_layer, bad_mass_float, bad_mass_negative, bad_massless, bad_metal_reclaim, bad_migration, bad_mu_status, bad_noble, bad_ore_reclaim, bad_ore_yield, bad_strata_id, bad_transform: each "A	tools/sim/fixtures/materials/<name>.json" ...]
A	tools/sim/fixtures/materials/bad_yield.json
A	tools/sim/test_materials.js
EXIT=0
```

| Path | Files | Status | allowedPaths entry (lane.json) | In scope |
|---|---|---|---|---|
| `docs/systems/DEUS_Materials.md` | 1 | A | `docs/systems/DEUS_Materials.md` | yes |
| `game/data/sim/README.md`, `interactions.json`, `mass_tables.json`, `materials.json` | 4 | A | `game/data/sim/**` | yes |
| `game/js/sim/materials.js` | 1 | A | `game/js/sim/materials.js` | yes |
| `tasks/SIM.40.00/lane-ac/BRIEF.md`, `lane.json` (PM commit 27ef7677), `REPORT.md` | 3 | A | `tasks/SIM.40.00/**` | yes |
| `tools/sim/fixtures/materials/bad_*.json` | 26 | A | `tools/sim/fixtures/materials/**` | yes |
| `tools/sim/test_materials.js` | 1 | A | `tools/sim/test_materials.js` | yes |
| **Total** | **36** | all A | | 36 of 36 |

Per commit (`git diff-tree --name-status -r`): `27ef76773ce86e9367f6ecbce4ed55fb21266170` (snewt, [pm]) BRIEF.md and lane.json only; `ddbc3b8d2a542d8014373bc2c577aa2eeb70aeb1` (deus-grok) the other 33 deliverables; `cfcf7633ab9a80d9507227e942d179c312957cae` (deus-grok) REPORT.md only.

- Forbidden paths: `git diff --name-only <base> <tip> -- game/js/plugins game/js/plugins.js game/js/sim/ledger.js game/js/sim/ledger_defaults.js tools/sim/test_ledger.js docs/STATUS.md docs/VISION.md docs/OWNER_DECISIONS.md "*WBS*" docs/adr docs/audits art tasks/SIM.40.01 tasks/SIM.40.05 tasks/WG.65.15 game/js/sim/rules` printed nothing, EXIT=0. No plugin, no ledger file, no STATUS, no WBS, no tool outside the two allowed tool paths.
- Wiring: a grep for `sim/materials`, `data/sim/`, `mass_tables` and `createMaterials` over `game/` and `tools/` (`*.js`, `*.json`, `*.html`) outside the lane's own files found no hit; `game/js/plugins.js` has no `materials` entry. Nothing is wired into gameplay. `materials.js` requires nothing and loads in a bare `vm` context.
- Art: no image or audio path in the diff (grep EXIT=1); no image generator is named in the deliverables.

## 3. Gate (lane.json `gateTests`, run in the clone at the tip, foreground)

a. `node tools/sim/test_materials.js`

```
PASS clean_validate
PASS determinism_checksum
[... 64 further PASS lines: every check named in REPORT.md lines 118-184, none FAIL ...]
PASS mutant_combustion
RESULT: 67 passed, 0 failed
EXIT=0
```
(67 `PASS` lines, 0 `FAIL` lines, counted with grep.)

b. `node tools/sim/test_ledger.js`

```
WG.65.15 ledger tests; node v24.19.0; files: game/js/sim/ledger.js, game/js/sim/ledger_defaults.js
PASS load_in_bare_vm_context (ECMAScript built-ins only; Math.random throws; Date removed)
[... 116 further PASS lines trimmed ...]
mutants: 42; run time 12378 ms
RESULT: 117 passed, 0 failed
EXIT=0
```
(117 `PASS`, 0 `FAIL`: the base count the BRIEF names.)

c. `node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

## 4. REPORT claims remeasured

| REPORT claim | Measured at the tip | Match |
|---|---|---|
| 71 materials: 29 natural, 16 loose, 25 constructed, 1 air | 71; kind natural 29, loose 16, constructed 25, none 1 | yes |
| 54 strata ids, 0..53 | 54 distinct ids, 0..53 | yes |
| Ids 38-42 ore hosts with null mass; 43-47, 15, 31 reserved | 38-47 `massPerSlice` null, `OWNER_OPEN`; 15 and 31 null, `PLACEHOLDER` | yes |
| 61 item rows, 87 object rows, one per `DEUS_WorldCatalog.json` id | 61 and 87, set-equal to `items.types` and `objects` of the live catalogue; `UF_WorldCatalog.json` is byte-identical (`cmp` EXIT=0) | yes |
| 2 massless objects with reasons | `stockpile`, `farm_plot`, both with a reason; 0 massless items | yes |
| 67 checks, 26 fixtures, 8 data mutants, 4 purity mutants | 67, 26, 8 (`mutant_yield_short` .. `mutant_combustion`), 4 | yes |
| Status census 41 / 450 / 98 / 37 / 92 | every key ending in `status` in the three JSON files: SOURCED 41, PM_DEFAULT 450, PM_DEFAULT_UNCONFIRMED 98, OWNER_OPEN 37, PLACEHOLDER 92 (718); no value outside the five words | yes (labelling: MINOR-2) |
| Yield, collapse and bills conserve mass | reviewer audit that does not call `materials.js`: 56 massful materials, 85 massful objects, 61 items, 381 postings: 0 sum errors, 0 family errors; every non-identity posting is a `ledger_defaults.js` transform row; 0 identity postings change class or form; 35 postings that name a target object and 24 that name an item count match the target's mass | yes |
| Nothing outputs ore; reclamation never invents ore | ore appears only as same-class `mine` of ore the source holds (`ironstone`, `copper_outcrop`, `gold_outcrop`); no reclaim, decay, combustion, rust or erosion output is an ore class; every reclaim path step names a ledger row (metals use the bare words `rust` / `salvage`) | yes |
| Kilogram rounding (SIM.40.01 §2.3) | density × 50 × 0.3048³ recomputed in integer arithmetic for 37 rows: 0 differences; `massPerSlice = kgPerSlice × 1000` on every massful material | yes |
| Decay lives are SIM.40.05 | ASHLAR .. THATCH equal R-01.6; TEXTILE and FOOD equal R-03.3; FERROUS, CUPROUS, LEADTIN, SILVER, NOBLE equal R-03.6; BONE stage rows equal R-03.4; every milli-year value is a multiple of 5, so it converts to whole year-ticks (1 sy = 2,400 yt, R §0.3) | yes |
| Support columns are SIM.40.01 | granite, sandstone, soil, wood, masonry, foundation, timber_wall, thatch_roof, iron_grate, conjured_stone, rubble and scrap against §2.3-§2.5: AC, HP, DT, spans, rated load (20×, 2×, 5× kg), bearing, perm, flam all match | yes |
| Gate output in the REPORT | reproduced exactly (section 3); the REPORT ran at ddbc3b8d and cfcf7633 adds only REPORT.md | yes |
| No self-certification | no DONE / VERIFIED / CLOSED / "verified" in REPORT.md, DEUS_Materials.md or README.md; `PASS` appears only in pasted runner lines | yes |

## 5. Open Owner values stay open

- mu: `{"id":"MU_SIZE","proposal":"1 mu = 1 g","proposalMuPerKg":1000,"confirmed":false,"status":"PM_DEFAULT_UNCONFIRMED"}`. REPORT Owner/PM question 1 gives options A-C and chooses none.
- Calendar: `{"status":"OWNER_OPEN","ref":"D-1"}`; `dpy` and `tickHz` absent. A grep of the three JSON files, `materials.js` and the README for `tickHz`, `dpy`, `2400`, `2,400`, `365`, `360`, `yearTick` found no calendar literal (only `24000` mu values). Lives are stored in milli-years, which needs no DPY.
- Water per slice null (`OWNER_OPEN`), ungraded veins null (`OWNER_OPEN`), DEC-028.3 exemption `implemented: false`, legacy half-slice rule stated with `implemented: false`, no `layerCount` in `geometry`, no layer identifier in the module.
- The validator would not notice an `OWNER_OPEN` null mass being relabelled `PLACEHOLDER` (MINOR-2). The data at the tip is labelled correctly.

## 6. Negative fixtures and mutants

### 6.1 Every fixture, applied by the reviewer to a fresh copy of the clean data (full error list each)

```
clean errors: []
FAILS-AS-CLAIMED bad_alloy.json expect=E_ALLOY n=1 :: ["E_ALLOY: materials.electrum"]
FAILS-AS-CLAIMED bad_blast.json expect=E_BLAST_GROUP n=1 :: ["E_BLAST_GROUP: materials.granite"]
FAILS-AS-CLAIMED bad_bom.json expect=E_BOM n=4 :: ["E_BOM: objects.wall_stone","E_BOM: objects.wall_stone lines","E_COLLAPSE_MASS: objects.wall_stone collapse","E_YIELD_MASS: objects.wall_stone yield"]
FAILS-AS-CLAIMED bad_calendar.json expect=E_OWNER_OPEN n=1 :: ["E_OWNER_OPEN: calendar"]
FAILS-AS-CLAIMED bad_class.json expect=E_LEDGER_CLASS n=3 :: ["E_FAMILY_MASS: materials.granite collapse mineral","E_FAMILY_MASS: materials.granite yield mineral","E_LEDGER_CLASS: materials.granite nope"]
FAILS-AS-CLAIMED bad_collapse.json expect=E_COLLAPSE_MASS n=2 :: ["E_COLLAPSE_MASS: materials.granite collapse","E_FAMILY_MASS: materials.granite collapse mineral"]
FAILS-AS-CLAIMED bad_combustion.json expect=E_COMBUSTION_MASS n=1 :: ["E_COMBUSTION_MASS: materials.wood"]
FAILS-AS-CLAIMED bad_coverage_item.json expect=E_COVERAGE n=2 :: ["E_COVERAGE: item bone","E_COVERAGE: item extras"]
FAILS-AS-CLAIMED bad_coverage_object.json expect=E_COVERAGE n=2 :: ["E_COVERAGE: object extras","E_COVERAGE: object oak"]
FAILS-AS-CLAIMED bad_family.json expect=E_LEDGER_FAMILY n=1 :: ["E_LEDGER_FAMILY: materials.granite"]
FAILS-AS-CLAIMED bad_family_mass.json expect=E_FAMILY_MASS n=2 :: ["E_FAMILY_MASS: materials.granite collapse mineral","E_FAMILY_MASS: materials.granite collapse organic"]
FAILS-AS-CLAIMED bad_gap.json expect=E_GAP_UNDECLARED n=2 :: ["E_GAP_UNDECLARED: materials.tin","E_LEDGER_CLASS: materials.tin"]
FAILS-AS-CLAIMED bad_item_weight.json expect=E_ITEM_WEIGHT n=1 :: ["E_ITEM_WEIGHT: items.sword_long"]
FAILS-AS-CLAIMED bad_layer.json expect=E_LAYER_COUNT n=1 :: ["E_LAYER_COUNT: geometry.layerCount"]
FAILS-AS-CLAIMED bad_mass_float.json expect=E_MASS n=1 :: ["E_MASS: materials.granite"]
FAILS-AS-CLAIMED bad_mass_negative.json expect=E_MASS n=1 :: ["E_MASS: materials.granite"]
FAILS-AS-CLAIMED bad_massless.json expect=E_MASSLESS n=1 :: ["E_MASSLESS: objects.stockpile"]
FAILS-AS-CLAIMED bad_metal_reclaim.json expect=E_METAL_RECLAIM n=1 :: ["E_METAL_RECLAIM: materials.iron"]
FAILS-AS-CLAIMED bad_migration.json expect=E_MIGRATION n=1 :: ["E_MIGRATION: geometry.legacyHalfSlice"]
FAILS-AS-CLAIMED bad_mu_status.json expect=E_MU_STATUS n=1 :: ["E_MU_STATUS: mu"]
FAILS-AS-CLAIMED bad_noble.json expect=E_METAL_RECLAIM n=1 :: ["E_METAL_RECLAIM: materials.gold"]
FAILS-AS-CLAIMED bad_ore_reclaim.json expect=E_ORE_OUTPUT n=1 :: ["E_ORE_OUTPUT: materials.granite reclaim fe_ore"]
FAILS-AS-CLAIMED bad_ore_yield.json expect=E_ORE_OUTPUT n=3 :: ["E_FAMILY_MASS: materials.granite yield fe","E_ORE_OUTPUT: materials.granite yield fe_ore","E_YIELD_MASS: materials.granite yield"]
FAILS-AS-CLAIMED bad_strata_id.json expect=E_ID n=1 :: ["E_ID: sand.strataId"]
FAILS-AS-CLAIMED bad_transform.json expect=E_TRANSFORM n=1 :: ["E_TRANSFORM: materials.granite yield smelt stone->stone"]
FAILS-AS-CLAIMED bad_yield.json expect=E_YIELD_MASS n=2 :: ["E_FAMILY_MASS: materials.granite yield mineral","E_YIELD_MASS: materials.granite yield"]
EXIT=0
```

26 of 26 fixtures fail with the code they claim, and the claimed code comes from the intended rule in each case. The writer's 8 in-memory data mutants are all killed (their `mutant_*` lines are `PASS` in gate a).

### 6.2 The harness can print FAIL: samples with one validator rule disabled or one impurity added to `materials.js` (temp clone, restored after each)

```
KILLED   K01 yield/collapse mass-sum check off | exit 1 | RESULT: 63 passed, 4 failed | FAIL fixture_bad_collapse, FAIL fixture_bad_yield, FAIL mutant_yield_short, FAIL mutant_collapse_short
KILLED   K02 transformOk always true | exit 1 | RESULT: 66 passed, 1 failed | FAIL fixture_bad_transform
KILLED   K03 posting ore check off | exit 1 | RESULT: 65 passed, 2 failed | FAIL fixture_bad_ore_yield, FAIL mutant_ore_yield
KILLED   K17 noble reclaim check off | exit 1 | RESULT: 66 passed, 1 failed | FAIL fixture_bad_noble
KILLED   K18 family-mass equality off | exit 1 | RESULT: 66 passed, 1 failed | FAIL fixture_bad_family_mass
KILLED   K27 reclaim ore check off | exit 1 | RESULT: 66 passed, 1 failed | FAIL fixture_bad_ore_reclaim
KILLED   P-DATE clock read inside massOf | exit 1 | RESULT: 66 passed, 1 failed | FAIL purity_clean: E_HOST
KILLED   P-RANDOM Math.random inside validate | exit 1 | (no RESULT line; last: Node.js v24.19.0)
```

P-RANDOM is killed by the bare `vm` context throwing inside `validate` (a crash with exit 1, not a `FAIL` line).

### 6.3 Reviewer mutation battery on `game/js/sim/materials.js` (29 mutants, one exact snippet each)

7 killed, 22 survived. Every survivor left `RESULT: 67 passed, 0 failed` with exit 0.

| Mutant | What it disables | Result |
|---|---|---|
| K01 | yield/collapse mass-sum check | killed (above) |
| K02 | `transformOk` returns true | killed (above) |
| K03 | ore check on postings | killed (above) |
| K04 | status-word check in `statusOk` | survived |
| K05 | `E_FORM` on postings | survived |
| K06 | `massPerSlice === kgPerSlice × perKg` (`E_MU_SCALE`) | survived |
| K07 | decay output is not ore | survived |
| K08 | combustion ash class is `ash` | survived |
| K09 | `interactions.rusts` output is not ore | survived |
| K10 | `interactions.erodes` output is not ore | survived |
| K11 | alloy mass is a multiple of the composition denominator | survived |
| K12 | yield item count × item mass = posting mu | survived |
| K13 | a null mass must be `OWNER_OPEN` / `PLACEHOLDER` | survived |
| K14 | loose bulk by lineage (rubble 3/5, scrap 1/4) | survived |
| K15 | lava solidify ratio | survived |
| K16 | species timber scale | survived |
| K17 | NOBLE reclaim stays same class | killed (above) |
| K18 | family-mass equality | killed (above) |
| K19 | `massOf` item overflow guard | survived |
| K20 | `checksum()` returns a constant | survived |
| K21 | `classByElement` rust targets | survived |
| K22 | item row ledger class exists | survived |
| K23 | object line ledger class exists | survived |
| K24 | coverage "extras" count | survived |
| K25 | massless material has mass 0 | survived |
| K26 | duplicate strata id | survived |
| K27 | reclaim target is not ore | killed (above) |
| K28 | `yieldOf` returns null | killed (exit 1, crash before RESULT) |
| K29 | `reclaimTarget` by strata id | survived |
| P-LAYERS | adds `layers: 32 * 5,` to `describe()` | survived (the purity scan matches identifiers only) |

### 6.4 Reviewer data probes against `validate` (clean data plus one change)

```
ACCEPTED A1 granite.massStatus=VERIFIED (not a status word) :: []
ACCEPTED A2 granite.support.status=BOGUS (status inside materials array) :: []
ACCEPTED A3 water.massStatus OWNER_OPEN->PLACEHOLDER (open value loses OWNER_OPEN) :: []
ACCEPTED A4 fe_ore_rock.massStatus OWNER_OPEN->PLACEHOLDER :: []
REJECTED A5 decayClasses.ASHLAR.status=BOGUS :: ["E_STATUS: catalogue.decayClasses.ASHLAR.status"]
ACCEPTED A6 masses.items.log.massStatus=VERIFIED :: []
REJECTED A7 granite.decay.outputClass=fe_ore :: ["E_ORE_OUTPUT: materials.granite decay"]
REJECTED A8 wood.combustion.ledger.ashClass=fe_ore :: ["E_ORE_OUTPUT: materials.wood combustion"]
REJECTED A9 interactions.rusts: fe_metal -> fe_ore :: ["E_METAL_RECLAIM: rust fe_metal","E_ORE_OUTPUT: rust fe_ore"]
REJECTED A10 interactions.erodes: first row to=cu_ore :: ["E_ORE_OUTPUT: erode cu_ore"]
REJECTED A11 granite.kgPerSlice+1 (mu scale) :: ["E_MU_SCALE: materials.granite","E_MU_SCALE: materials.rubble bulk granite"]
REJECTED A13 granite yield posting form=fluid (bad form) :: ["E_FORM: materials.granite yield stone fluid","E_TRANSFORM: materials.granite yield quarry stone->stone"]
REJECTED A14 ice booked at 1 du (Lane Q 9.1 unit) instead of 1011000 :: ["E_MU_SCALE: materials.ice"]
ACCEPTED A16 reclaim path names a process the ledger lacks :: []
ACCEPTED A17 ledger.unit on granite = du :: []
REJECTED A18 duplicate material id :: ["E_ID: duplicate granite","E_ID: strata 32"]
REJECTED A20 exemption.implemented=true :: ["E_MIGRATION: exemption"]
REJECTED A21 calendar.tickHz=60 :: ["E_OWNER_OPEN: calendar"]
ACCEPTED A23 masses.muRef deleted :: []
REJECTED A24 lava.solidify.duPerBasaltVoxel=3 :: ["E_COLLAPSE_MASS: materials.lava solidify"]
ACCEPTED P1 flesh massPerSlice=0 (kg 0, postings 0): brief says positive :: []
R1 massOf(granite,strata,2^52) -> 1.7537016948980711e+22 (NOT a safe integer)
R2 massOf(wall_stone,object,2^52) -> 135107988821114880000 (NOT a safe integer)
R3 massOf(stone,item,2^52) -> threw E_AMOUNT
R4 massOf(ice,strata,1) -> 1011000 (safe int)
R10 massOf(iron,strata,1) [ledger metal has no strata form] -> 11143000 (safe int)
R14 checksum clean=c3bc0999 mutated=061bf94c differs=true
EXIT=0
```

## 7. Findings

### BLOCKER

None.

### MAJOR

**MAJOR-1. Ice is booked in grams in a family the ledger counts in du, and the disagreement is not recorded.**

- The ledger's water family is in fluid depth units: `game/js/sim/ledger_defaults.js:29` `water: { unit: "du", finite: false },   // liquid water and ice`, with du defined at `:11` (1/7 of a full cell, citing `DEUS_Fluid.js:50` `DEPTH_MAX = 7`). `tasks/WG.65.15/lane-l1/LEDGER_API.md:49`: "The ledger never converts units. ... Families never mix, so `water` in `du` and `mineral` in `mu` never meet in one sum." SIM.40.01 §9.1 (`tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md:673`): the `water` family unit is "fluid depth unit (du)", covering "liquid water ..., ice and snow. An ice voxel holds exactly 1 du, so its load is 1,011 kg". §9.2 row 19 (`:702`): "ice voxels: `FLUID ↔ STRATUM_NATURAL (ice)`, 1 du each". §9.7 (`:736`): "Lane Q recommends 1 g for every family except water (du)". WG.65.15 Q2 (`tasks/WG.65.15/lane-l1/REPORT.md:434`): "water in fluid depth units".
- The catalogue's ice record (`game/data/sim/materials.json:2633`) says `ledger.unit: "du"` (`:2639`) and `duPerSlice: 1` (`:2647`), but `massPerSlice: 1011000` (`:2645`), and its yield and collapse postings carry `"mu": 1011000` of class `water` (`:2695`, `:2708`). `massOf("ice", "strata", 1)` returns 1011000 (probe R4). The validator enforces the gram figure: booking the slice at 1 du is refused with `E_MU_SCALE: materials.ice` (probe A14, from `game/js/sim/materials.js:340`).
- Failure scenario (reviewer demo with the real `game/js/sim/ledger.js`, following `game/data/sim/README.md:32-33`): register one full fluid cell `water/fluid 7` and one ice slice `water/ice` at `massOf("ice")`, seal, then thaw that one slice with the ledger's `thaw` row:
  ```
  iceMu from massOf = 1011000
  after thawing ONE ice slice: water/fluid = 1011007 du, water/ice = 0, water family total = 1011007 du
  EXIT=0
  ```
  SIM.40.01 §9.2 row 19 releases 1 du for that slice. The water family total no longer describes the fluid in the world, so the ledger recount (PROPOSED-L1-01) could not balance.
- Not recorded as a disagreement: `D-MU-UNIT` (`materials.json:37`, REPORT.md:58) lists the kilogram, 1/16 lb and gram sources but not Lane Q's water exception; `D-ICE-BULK` (REPORT.md:83) and `D-WATER-SLICE` (REPORT.md:68) are about other things. The BRIEF (Deliverables 2) says disagreements between SIM.40.01, the ledger defaults and the catalogue are recorded, never silently fixed; the Goal and the acceptance criteria ask that every material map onto the ledger with exact weights for SIM.40.11.
- Related label: `lava` says `ledger.unit: "du"` (`materials.json:2244`), but class `lava` is family `mineral`, booked in mu after a fixed du-to-mu ratio (`LEDGER_API.md:354`). The record's `muPerDu` carries that ratio, so lava is a label problem only.
- What would close it (the writer chooses): book the water family in du in these tables (1 du per ice slice, keeping 1,011 kg as the support load and exposing the du amount through `massOf` and the postings), or keep grams for ice and record the disagreement with the ledger's du unit as an Owner/PM question. A check that a posting's unit matches its class family's unit would stop it coming back.

### MINOR

**MINOR-1. Test strength: 22 of 29 reviewer code mutants survive, and so does P-LAYERS (section 6.3).** Untested rules include four of the ore-output channels the BRIEF lists by name (decay K07, combustion ash class K08, `interactions.rusts` K09, `interactions.erodes` K10; only the yield and reclamation channels have a killing fixture). Also untested: ledger-class existence for item rows and object lines (K22, K23), the alloy multiple (K11), the mu scale and derived-kilogram rules (K06, K14, K15, K16), the status checks (K04, K13), and the reader's overflow guard, checksum and strata-id lookup (K19, K20, K29). `determinism_checksum` (`tools/sim/test_materials.js:108`) still passes when `checksum()` returns a constant (K20). `purity()` (`tools/sim/test_materials.js:90-93`) matches identifiers only, so a literal `32 * 5` layer count passes. The rules themselves work: data probes A7-A11, A13, A18, A22 and A24 are refused with the right codes. The gap is that the suite would not notice those lines being deleted. The BRIEF's "at least one mutant per rule killed" asks for that.

**MINOR-2. Status handling is narrow, and some labels contradict the REPORT's own definition.** `statusOk` (`game/js/sim/materials.js:210-221`) checks only keys named exactly `status` and does not descend into arrays. So no status inside `catalogue.materials[]`, and no `massStatus` / `densityStatus` / `perDuStatus`, is ever checked (A1, A2, A6 accepted). The open-mass rule (`:336-338`) treats `OWNER_OPEN` and `PLACEHOLDER` alike, so water's and `fe_ore_rock`'s `OWNER_OPEN` can be relabelled `PLACEHOLDER` without an error (A3, A4). REPORT.md:50 defines `PM_DEFAULT_UNCONFIRMED` as "every mass that is the proposal times a kilogram figure". But the 15 carried-mass item rows (for example `stone` 15,000 mu and `log` 8,000 mu) and the 85 massful object rows are labelled `PM_DEFAULT` (all 87 object rows are), even though their mu scales with the unconfirmed proposal. The census counts are accurate as label counts.

**MINOR-3. The reader is looser than its header.** `massOf` guards overflow only for items (`game/js/sim/materials.js:103-107`). The object/ruin branch (`:110-120`) and the slice branch (`:121-127`) multiply without a check: R1 and R2 return non-safe numbers where R3 throws `E_AMOUNT`, although the header (`:7`) says amounts are non-negative safe integers. Any form other than item, object or ruin is read as a slice, so `massOf("iron", "strata", 1)` returns 11,143,000 even though `fe_metal` has no strata form (R10). A non-massless material with `massPerSlice` 0 passes `validate` (P1: `isAmount` at `:22` admits 0), but the BRIEF asks for positive masses.

**MINOR-4. 78 postings move matter into the ledger's `item` form without naming a catalogue item type.** Examples: the `soil` dig of 2,265,000 mu ("No soil item in the catalogue."); the `rubble` and `gravel` picks; wood chop remainders after whole logs (oak 6,000 mu, pine 5,000 mu); salvage remainders for masonry, ashlar, brick, foundation and conjured stone (2,000-14,000 mu); every timber assembly's and wooden object's collapse to a wood item; and the iron grate, smithy and iron door collapsing to an `fe_metal` item. The ledger balances. But the `item` form means DEUS_Items records (`ledger_defaults.js:15`), and SIM.40.01 §9.2 rows 3 and 5 put sub-item remainders in LOOSE spoil. Some rows carry a note or a D-id (`D-WOOD-COLLAPSE`, `D-SCRAP-FORM`), but the REPORT has no gap entry for untyped remainders. Related: strata id 51 (`bone`) maps to `biomass`, which has no strata form in the ledger. `D-BONE` records the class, not the form.

**MINOR-5. The `gold_outcrop` yield cannot be posted as written.** Its first yield posting (`game/data/sim/mass_tables.json:5138`) is `smelt au_ore/item -> au_metal/item 100`, but the outcrop holds its ore as `au_ore/object`. The `mine` step appears only in `path: ["mine","smelt"]`. Following README.md:33 ("Post a path with `ledger.transform` using the posting's process, classes and forms") fails against the real ledger: `FAIL smelt au_ore/item -> au_metal/item 100 :: E_INSUFFICIENT: transform "au_ore"/"item" -> "au_metal"/"item": au_ore|item holds 0, cannot remove 100`. `D-GOLD-NUGGET` records the route, not that the list cannot be posted directly.

**MINOR-6. The validator ignores several shape fields.** It does not check `reclaim.path` strings (A16: `"transmute:stone->gold"` accepted), `ledger.unit` (A17; see MAJOR-1) or `masses.muRef` (A23). `catalogue.decayClasses` holds a string entry, `statusNote`, next to the classes, and `has(cat.decayClasses, m.decay.dc)` (`:360`) would accept it as a class name. At the tip every path step names a ledger row (section 4), so the data itself is fine.

**MINOR-7. Owner/PM question 1 (REPORT.md:89) leaves out the headroom trade-off.** It lists 1 g, 1 kg and 1/16 lb without the safe-integer trade-off that WG.65.15 Q2 (`tasks/WG.65.15/lane-l1/REPORT.md:434`) and SIM.40.01 §9.7 (`:736`) state. At 1 g, one fully solid 256 × 256 area of 160 slices is up to 65,536 × 160 × 4,106,000 ≈ 4.3 × 10^13 mu (basalt). A single world ledger (PROPOSED-L1-01) would pass 2^53 at about 209 fully solid areas; beyond that the ledger refuses with `E_OVERFLOW` (`game/js/sim/ledger.js:367`, `:375`). Today's default world is one area (`game/js/plugins/DEUS_World.js:127-128`, `:420`). This is for the Owner's choice, not a defect in the data.

## 8. Not checked

- The NW.js harness (`tools/run_tests.js`) was not run; the BRIEF excludes it.
- The SIM.40.01 §8.3 blast per-mille values in `interactions.json` were not compared with the design. Only the existence of every `blastGroup` was checked, via fixture `bad_blast`.
- I did not read each of the 87 object rows and 61 item rows by eye. They were checked mechanically (section 4), and I read about ten object rows and every item row's class and mass.
- ADR-003 §7.8, the living-world gap audit, `DEUS_PHYSICAL_WORLD_SIMULATION_SPEC.md`, and the Lane Q and Lane R review files were not reread for this review.
- `DEUS_Fluid.js:50` was not opened. The du definition is taken from `ledger_defaults.js:11`, `LEDGER_API.md:49` and SIM.40.01 §9.1.

## 9. Result

0 BLOCKER, 1 MAJOR (MAJOR-1), 7 MINOR. A MAJOR fails the review under this project's grading, so this tip does not pass. Scope, gates, conservation, the ore rules, the open Owner values and the fixtures all check out; the MAJOR is the unit of the water family.

VERDICT: FAIL
