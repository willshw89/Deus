# UF_History

## DEUS-TSK-ASTRA-15 HIST-10 materialization and world age — 2026-09-23

**Verdict: headless acceptance PASS for the source set identified below; integration/commit pending shared-file ownership. Native F5/F8 and screenshots NOT RUN.** The final standalone suite passed 29 checks with exit 0, including the 12 canonical seed/age combinations, three full demographic/event prefix comparisons, six actual disk/process restarts, stable entity IDs, the age-1 founder alias, explicit seed-zero reproducibility, and Colonists bootstrap at ages 0, 250 and 500. All three requested mutation commands exited 1 at their intended assertions. The frozen HIST-09 engine and its existing JSON report remain unchanged.

### API and saved identity

`UF.History.generate(world, { targetYear, seed, onCheckpoint })` accepts either a world state or the World service. `targetYear` defaults to 500; 0 and 1 run zero annual steps, while N > 1 runs exactly N frozen HIST-09 steps. The engine starts at calendar year 1, so age 500 enters calendar year 501. Invalid negative/noninteger ages, ages at or above the engine's 1,000,000-year bound, and non-uint32 seeds reject. An explicit seed changes the demographic RNG only; it does not regenerate terrain/factions or change `world.seed`. Regenerating an already materialized world at a different era/seed rejects. The identical era/seed and `History.materialize(world)` are idempotent.

The foundation still comes from the existing canonical year-1 founder plan. The historical plugin's biology, density/capacity math, RNG and succession rules are untouched. Each synchronous `onCheckpoint` observation has the same demographic fields as the completed boundary, including living/deceased ID indexes. Nested arrays remain shared with the simulation; a caller retaining a checkpoint must snapshot it immediately. Prefix tests compare the complete demographic object and its event ledger, without removing the indexes.

`history.demographics.people` remains the single person-record ledger. `living` and `graveyard` are arrays of historical person IDs, including ID 0, rather than copies of those records. Every living person is created through `World.addUnit` on a checked, unoccupied, walkable cell. Entity slots are reserved as `baseUnitId + historicalPersonId`, including ancestors' unused physical slots, so identities persist across eras and saves. Allocation guards reject interference from unit-added listeners. A partially interrupted materialization cannot be retried on that world.

`history.materialization` schema 1 stores the living `personToUnit` map and households. Unit data preserves `historicalPersonId`, canonical `historicalName`/`historicalFounder`, species, gender/sex, birth year, age, site affiliation, family and household. Unit `parents`, `spouse`, `children`, `motherId` and `fatherId` use the reserved **entity-ID namespace**, including dead relatives; the canonical ledger uses **historical person IDs**. Keeping dead parent IDs preserves the existing runtime sibling checks. `partnerId` identifies an active living partner; `childIds` selects living children. `History.personById(id, world)` and `History.genealogy(id, world)` query historical IDs and retain ancestors.

All three callings are sampled deterministically from the existing 89-entry Callings module. Primary calling rank conditions the deterministic ability seed; the existing Dnd5e roll, species modifiers, class choice and level-one HP formulas supply the scores. No new vocation bonus table or demographic formula was introduced. The bridge initially derives stages from the species profile's maturity/lifespan bounds. `history.rulers` projects all succession records, including person/entity identities, while faction/site leadership and unit superior IDs reference active rulers. Existing World/DataManager save aliases carry the history and units; no separate save hook was added.

The live `founder` flag is false for materialized citizens because it drives the legacy founder-only pairing/quota workflow; historical founder truth is retained separately. A mature Colonists bootstrap initially formed 76 extra live partnerships at seed 0/age 250. History now defers pairing via the existing `willingToPartner` flag during initialization, releasing it from a late `world:created` listener registered at boot. The repeated mature check observed 0 partner conflicts, all 984 citizens retained, and pairing restored. The final suite tests live partner coherence and resumed pairing at ages 250 and 500.

### Measured matrix and provenance

The dispatch's full baseline `2f22f9e403d6d5ef0dfad0ca023fb2764b855938` is not the observed commit. Work started at `2f22f9ebad576cb69016def0e5fb423309e2ceb1`. Fable committed its separate work as `1e00b044270cc6d51c566173236346a5e2f1c7b0` during this task. Tests execute working sources, record every input SHA-256 and check their stability across workers and suite completion; they do not claim an immutable HEAD snapshot. Rendering and scene baseline methods are headless doubles. Actual engine DataManager/JsonEx methods, World save aliases, event bus, terrain seating, and listed production modules execute.

Final report: `C:/Users/snewt/AppData/Local/Temp/deus-astra15-final-139e8f88-f0e8-438b-9a00-2911b3dffc56.json`; source-set digest `92adaf6cec3b2f9e46b4624368d3735fa70c07321a6cf45fbedf82042f246940`. Total suite wall time: **116.9729126 s**. The table measures generation/materialization and assertions inside each worker; subprocess start and restore costs are additional and included in total wall time. The report includes individual process wall times, six disk-save SHA-256 hashes and saver/loader process IDs. Temporary save files were fsynced, read by new processes after saver exit, compared across full world/history/units/factions/sites/people/rulers hashes, then removed.

| Seed | Age | Living | Ancestors | Serialized world bytes | Worker ms |
|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 72 | 0 | 278364 | 3008.670 |
| 0 | 100 | 761 | 188 | 2294083 | 3676.941 |
| 0 | 250 | 984 | 1582 | 3551194 | 4730.513 |
| 0 | 500 | 1080 | 4178 | 4991801 | 13829.380 |
| 424242 | 0 | 72 | 0 | 278300 | 2991.769 |
| 424242 | 100 | 738 | 211 | 2239711 | 3220.580 |
| 424242 | 250 | 943 | 1599 | 3440499 | 4319.938 |
| 424242 | 500 | 1063 | 4199 | 4958372 | 14671.546 |
| 20260919 | 0 | 72 | 0 | 278679 | 3012.858 |
| 20260919 | 100 | 730 | 168 | 2198707 | 3593.681 |
| 20260919 | 250 | 977 | 1584 | 3519606 | 4942.389 |
| 20260919 | 500 | 1093 | 4224 | 5037835 | 14035.295 |

| Seed / age | Complete demographic SHA-256 | Event SHA-256 |
|---|---|---|
| 0 / 0 | `ca095b53cdcc5e26e79846d535fff06b60c0cfd3e6146aaf19abc3bb4d68d8ed` | `81a2dc521bbade823963467d16e92b1188916ff5c26bf78e3ce04a47a822d7fe` |
| 0 / 100 | `e9a674ccfdde603d402e8d07214f808e933f18e2b2029768cd84ef858ad5dc1d` | `374063268b1cff369057e932f9000f8a74d0134d51eb98e689879b8823aac7d7` |
| 0 / 250 | `3e44616b828a1e5ed3749d833a983f8f31964e5aebae0b97a4db103d143e65a8` | `5ba174cadbabe069e4934b31657790faac45fc37b69348c0a87962eed4797483` |
| 0 / 500 | `379668ca17d243c7ee628117de012c9412a7e6c82fd004558f88af00c1735e18` | `674604ed212fb57366848777d7d4b8ecb28f333251f8d7491b0ab59270832e3b` |
| 424242 / 0 | `1ef105c75bcb94326eaa7be9f16514832ca01fe2ecca9caf6521ffd136d378df` | `2de602d9ea88174fb0e20bf7ca269fc3a58e4a52bd2de61c5c80c1a588c16ff4` |
| 424242 / 100 | `1d0149838a85282144c70e8bdf9ab6fb88f5a1c021b0333068ef1d60d09fb932` | `521146f01de49822b55d6a1e560e070e676f97ca34e655a3586da14fc520a251` |
| 424242 / 250 | `cec3f8040804dc038cda7d23f04f54421ccb6b606e8834ad9ea6d184e08e1890` | `253cde26f8d538214484b0c46ca262f19344520cdf677c57537442e8a58a867a` |
| 424242 / 500 | `97c171fb5d5c10bf46f9aead35b844ad8a7848e5239bcfe5ec6af7538dbedb35` | `b53d17cac5995041e8896536dd0048d212b79ba3547cf7bc69b959186b07c07c` |
| 20260919 / 0 | `3d027e7a6223608c27f3f850480f4bedbd87b8693b45b5bfe6b08e5c0316a213` | `64b5510989eabef1a89fd48df569e1c3cc5283ece13b6f355b2ec2c343f94aab` |
| 20260919 / 100 | `555758145aa7df2bcae8da657ec611afa8dc9121588548c88e2f0d615ef8fce5` | `6b14d5831c929ea23cadf3091b3ad54c3518f84a68756ff211d704b09789b145` |
| 20260919 / 250 | `67b80240269c6aab591cd00d8da359dad15789098418f584987d522a202755ae` | `7412f24a55a505cba87ccc3f09c7060bed5cddf1a3aaa6182e31fb21f75f0a61` |
| 20260919 / 500 | `391ab0bf67db9ae3f8b22d2eb825f9522561a0217ee88d790595a032b2adf4ef` | `334c3dba9419274687b866ada89beb24f93569c8957b2a10d7aec356446b141a` |

### Commands and negative controls

| Command/check | Observed result |
|---|---|
| `node tools/test_history_materialization_and_world_age.js` | PASS, exit 0; 29 checks, 12 eras, 3 prefixes, 6 disk restarts, 9 species at every 250/500 boundary, valid physical placement and family coherence. |
| `--mutant=target_year_alters_early_history` on that command | Expected FAIL, exit 1: `PREFIX_INVARIANCE: seed 0 Year100 differs from the 500-year checkpoint`. |
| `--mutant=materialization_drops_species` | Expected FAIL, exit 1: `MATERIALIZED_CENSUS: physical living population differs from ledger`. |
| `--mutant=save_drops_historical_records` | Expected FAIL, exit 1: `ROUNDTRIP_HISTORICAL_RECORDS: 1582 ancestors became 0 in actual saved contents; fresh loader 35020 restored 0 ancestors`. Engine class instances remain intact in this mutation. |
| `node tools/test_historical_carrying_capacity.js` | PASS, exit 0; frozen HIST-09 23 common contracts, 5 metadata contracts, 8 detected capacity mutants. |
| `node tools/bench_species_biology.js --selftest` | PASS, exit 0; 29 self-tests. |
| `node --check` on History and the new suite; scoped `git diff --check` | PASS, exit 0. |
| Native F5/F8, screenshots, in-game history test suite | NOT RUN. |
| Scoped commit | NOT RUN: mixed contributor edits and the untracked Callings dependency require ownership resolution. |

Mutation evidence: `C:/Users/snewt/AppData/Local/Temp/deus-astra15-mutants-1790206032105.json`. An earlier read-only archived-Callings preview and two earlier passing integration runs are superseded by the final report; they are not substituted for production-path acceptance.

The frozen demographics file remains 52,586 bytes / SHA-256 `d0a09bfda8ab63ff3eec5b362c63896ea0c3dbcb3aeeeb574c48c3113c995e4e`. The previous `game/test_output/bench_species_biology.json` remains 37,997,150 bytes / `afabf8695dc2cc71be5bfcf0347f7077167f4aa489860d6dee72cd86491dea19`. Final tested History SHA-256: `a5eb0ec691b38877dd4a441e73ee8be70d86421f83480030cdbd1fa164ee4d17`; new harness: `b2cd04303573392b10656b2366f6a64dd43d044a5345904ba11bfdf91b1b6453`.

### Integration boundary and known limits

- Another contributor restored the previously missing `game/js/plugins/DEUS_Callings.js` during this session. It is 14,744 bytes / SHA-256 `1370ae3d4538f3596e01a511e39fab3ae64e8d736c39ccd223058b561d9f55bd`, identical to the archived module, and remains outside ASTRA-15's allowed edit list. Astra did not write or stage it.
- Other edits appeared in History's dependency helpers and legacy `spawnSettled` implementation during the claimed task. They were preserved. No mixed-contributor commit was made; the coordinator must commit those changes separately or explicitly authorize their inclusion. Astra's claim is released for that coordination.
- `DEUS_Core.js` changed again after the successful final suite. The report identifies the tested bytes (`72e583f0079c20dba2e95fb44852215213c0d3ea17b8a3bf9df8365cbed1eeb5`); the subsequent companion-plugin loader is not covered by this report. No claim is made that every current shared-tree byte was tested.
- Colonists retains its existing player display-name and human-based appearance-stage rules. Canonical names and biology remain in the ledger. Live gameplay after initialization can form new relationships; synchronizing subsequent gameplay changes back into the historical snapshot is not implemented here.
- All ancestor records are retained; only the existing last 400 historical events are retained (`eventsDiscarded` records truncation). Era labels do not add houses, trade networks, crypt art, or a new UF_Look genealogy interface. Existing year-1 camp/starter-kit placement is retained.
- The legacy in-game history suite still contains founder-only/version-5 assumptions; it has not been updated or run for this version-6 bridge. Native acceptance and the final integration commit remain open.

## DEUS-TSK-ASTRA-14 independent HIST-09 candidate revalidation — 2026-09-23

**Verdict: PASS, exit code 0 for all three required commands.** The frozen candidate resolves both ASTRA-12/13 metadata defects: unsupported caller capacity IDs/versions and contradictory stored config IDs reject, and genuine custom v6 biology migrates with the `custom` demographic tag. All 23 common contracts, five reconciled metadata contracts, eight capacity mutation controls, 29 benchmark self-checks, six canonical 500-year trajectories, three repeat comparisons, three disk restart comparisons, and twenty 250-year sweep trajectories pass. The first default run passed in 165.7087084 seconds; a provenance correction required a second default run. Measurements below identify the final report, not an average or fastest-sample selection. No forced GC was used.

### Candidate, dispatch, and evidence identity

| Evidence | Identity |
|---|---|
| Observed dispatch baseline | `c49a142cd087b6b95cb7d7acef07dbf97d5698c1` |
| Packet's supplied baseline identifier | `c49a14250269389255a0ea738d2f5926ec0ea429` (not present in local Git) |
| Frozen production candidate | `4af58ddd486b8e5d97d24877fd1b826131724c1d` |
| Production file | `game/js/plugins/DEUS_HistoricalDemographics.js` |
| Candidate bytes / raw SHA-256 | 52,586 / `d0a09bfda8ab63ff3eec5b362c63896ea0c3dbcb3aeeeb574c48c3113c995e4e` |
| Benchmark source-set digest | `6f30da16ccc78709ef201afdae477574a94c0214cc66ad5f7433681751dbad7a` |
| Benchmark harness raw SHA-256 | `bf1666bbaf89dc61e3f96720f2639cfb4317981a87e6d21f5dde2b6beacf286a` |
| Capacity harness raw SHA-256 | `fd38c0ad554770b24f2e4804712d29674f3b32247774ab78d5e5e05d465e8512` |
| Local final artifact | `game/test_output/bench_species_biology.json`; task `DEUS-TSK-ASTRA-14`, schema 5, status `PASS` |
| Artifact creation timestamp | `2026-09-23T22:46:57.392Z` |
| Artifact bytes / raw SHA-256 | 37,997,150 / `afabf8695dc2cc71be5bfcf0347f7077167f4aa489860d6dee72cd86491dea19` |
| Runtime | Node v24.19.0; AMD Ryzen 7 8845HS with Radeon 780M Graphics; sequential fresh worker processes |

All executed production modules, catalog data, and plugin order come from the immutable `4af58dd` Git snapshot. The working `DEUS_World.js` differs from that snapshot and was not executed; its difference is recorded in provenance. The demographics plugin matches the frozen bytes before/after the run and `candidateUnchangedAtEnd` is true. This verification makes no claim about other contributors' working-tree changes. The artifact replaces the previous task's report at the same local, gitignored path and is a final consolidated report, not a temporary restart snapshot. Its aggregate size is separate from the **15 MiB per serialized simulation state** gate.

The production diff from `ebf2455` is confined to metadata handling in `create`, `validate`, and `migrate`. Independent byte comparisons found the 18,338-byte prefix before `create` (including defaults, capacity, RNG, lifespan, pairing and succession) and the 7,956-byte `conditionsValid` through `step`/`simulate`/`summary` span before `migrate` unchanged. Astra edited no production plugin. This is metadata verification, not a production optimization.

### Contracts and verification changes

| Reconciled contract | Result | Evidence |
|---|---|---|
| `PACKET_DEFAULT_PROFILE_TAG` | PASS | Promoted default `profileId: "v1"`, profile version and demographic tag `1.0.0-provisional-astra08`. |
| `PACKET_DEMOGRAPHIC_MODEL` | PASS | Root version/schema 7, `historyModelId: "historical_demographics_v1"`, model version 1. |
| `PACKET_CAPACITY_MODEL_IDENTITY` | PASS | Root/config identity `local_density_v1`, version 1; explicit supported options pass. Caller IDs `"TEST_UNSUPPORTED_CAPACITY"`, null, and numeric 1 reject. Caller versions 2, null, and string `"1"` reject. Contradictory stored config IDs reject with a supported root ID. Rejection preserves the checked inputs. |
| `PACKET_CUSTOM_CANNOT_CLAIM_V1` | PASS | Custom create normalizes all four tags; explicit promoted-claim spoofs reject without mutation; genuine populated v6 custom migration now has `profileKind: "custom"`, null profile ID/version, and `demographicProfileVersion: "custom"`. |
| `PACKET_CUSTOM_PROFILE_FINGERPRINT` | PASS | Independent canonical SHA-256 oracle agrees; equal/reordered inputs and a fresh process repeat; all nine parameter/range-endpoint changes produce the expected changed fingerprints. |

The common suite passes **23/23**, including absolute capacity bounds [60, 350], source-ID-derived capacity, site locality, frozen start-of-year/pre-death density, the nonzero fertility floor, no probability-1 bypass, immutable validation, and migration preservation/idempotence/rejection/atomicity. The migration fixture uses genuine 40-year v6 state from `931b993e60545b24bddaa71ab433ebac8e967eb8`. Its custom biology remains unchanged and its profile fingerprint is `3089a195939cf5d1977c0612e4c57ef380498ad98b65e07e8541d42c966b0790`.

The benchmark's dispatch-baseline field and both tools' stale task labels were corrected. A pre-commit full-hash check found that the packet's supplied baseline object does not exist locally: `git rev-parse HEAD`, `git show`, and the reflog identify the aligned `c49a142` commit as `c49a142cd087b6b95cb7d7acef07dbf97d5698c1`. The first passing report had copied the packet's erroneous full identifier. Only the benchmark provenance constant changed before rerunning the default command; the frozen production candidate and test logic did not change. The final report uses the observed baseline above and supersedes that first artifact.

The capacity packet check now explicitly covers caller versions and contradictory config IDs and requires actual rejection of unsupported caller IDs, as specified by ASTRA-14. These additions stay inside the existing five metadata checks; none of the original 23 common checks, eight mutation controls, biological gates, trajectory parameters, or timing limits were removed or relaxed. `rejectUnchanged` now returns the observed exception message so the added rejection evidence records its diagnostic.

### Commands and ability to fail

| Command/check | Observed result |
|---|---|
| `node tools/test_historical_carrying_capacity.js` | Exit 0; 23 common PASS, 5 metadata PASS, 8 capacity mutants detected with intended child exit 1. |
| `node tools/bench_species_biology.js --selftest` | Exit 0; 29 PASS, including snapshot corruption, partial/timeout evidence, repeat discrimination, and four negative controls. |
| `node tools/bench_species_biology.js` | Exit 0; full schema-5 report PASS; complete matrix/restart/sweep coverage. |
| `node --check` on both authorized harnesses | PASS. |
| Scoped whitespace, staged-path, and source/artifact identity checks | PASS; production unchanged. |
| Older production regression suite | NOT RUN; outside the required dispatch and still pinned to `8a40d2e`. Its older results are not counted for this candidate. |

All eight capacity controls failed their intended assertion: `no_density_pressure` → `DENSITY_RATE`; `universal_constant` → `LOCAL_CAPACITY`; `live_census_order_dependent` → `ANNUAL_ORDER`; `base_birth_1_bypass` → `BIRTH_ONE`; `unsupported_version_accepted` → `VERSIONS`; `malformed_capacity_accepted` → `CAPACITY_REJECTION`; `migration_rewrites_custom_profile` → `MIGRATION_PRESERVATION`; `migration_non_idempotence` → `MIGRATION_IDEMPOTENCE`. Benchmark mutants `unseeded`, `invalid_lifespan`, `inverted_fertility`, and `corrupt_parentage` each exited 1 for the intended assertion. Ten stale/malformed fingerprint controls were rejected by the independent oracle.

Three supplemental controls executed in separate child processes outside both timed default runs. Each verified the original frozen bytes before changing only a cloned source bundle in memory. All three produced 23 common PASS and exactly one metadata FAIL (the intended `PACKET_CAPACITY_MODEL_IDENTITY`), exiting 1. They are separate evidence from the unchanged eight required controls and are not inserted into the final JSON report.

| Synthetic mutation | Child exit | Intended diagnostic |
|---|---|---|
| Remove caller-ID rejection; retain canonical assignment | 1 | `Caller capacityModel.id escaped required unsupported-model rejection` |
| Remove caller-version rejection | 1 | `Unsupported caller capacity version 2: expected rejection matching /unsupported/, got success` |
| Remove both config-ID validation checks | 1 | `Contradictory config capacity ID "TEST_UNSUPPORTED_CAPACITY": expected rejection matching /unsupported/, got success` |

### Timing and demographic gates

Only public `api.step` execution contributes to simulation time. Worker wall also includes setup, observations, checkpoint validation/serialization and emission; parent process wall includes startup, source loading and final IPC parsing. The strict `<30 seconds` trajectory gate uses the larger worker/parent value, without averaging. All six 500-year runs pass. The full default suites/matrix/restarts/sweep wall time is **187.0362076 seconds**. Separate direct suite executions, supplemental probes and documentation work are outside that measurement.

| Seed | Repeat | Simulation, s | Worker wall, s | Parent process wall, s | Worst annual step, ms |
|---|---|---|---|---|---|
| 0 | 1 | 8.9013169 | 10.3797087 | 10.8229190 | 65.8954 |
| 0 | 2 | 10.2230709 | 11.7833740 | 12.2414065 | 69.8933 |
| 424242 | 1 | 10.6002966 | 12.1596999 | 12.5811280 | 75.7094 |
| 424242 | 2 | 10.6036280 | 12.1866124 | 12.6483508 | 91.4553 |
| 20260919 | 1 | 10.0856625 | 11.6161753 | 12.0479071 | 70.0923 |
| 20260919 | 2 | 9.9830550 | 11.5073334 | 11.9582089 | 73.4312 |

All nine species survive every annual census. At both 250 and 500 years every species has active fertile partnerships. Canonical annual species population peaks at **177**; the combined canonical/sweep observed range is **7–187**, below 1,500. Largest canonical serialized state is **4,003,167 bytes (3.818 MiB)**, below 15 MiB. Maximum sampled heap delta is **71.907 MiB**; this includes temporary and retained test evidence and ordinary GC, and is not a leak measurement. All five gates (`zeroExtinctions`, `viableReproduction`, `boundedPopulation`, `serializedState`, `trajectoryBudget`) pass. Differences from previous timings do not establish a production speedup.

### Canonical checkpoints, populations, and hashes

Both repeats have exact matching state/event bytes, hashes and annual curves. Each unique checkpoint appears once below. Horizons are elapsed years; cumulative births exclude 72 founders, deaths include founder deaths. Ruler triples are active / accession records / successions. All checkpoints have nine active sites, none abandoned or ruined, and nine living rulers.

| Seed | Years | Living | Person records | Births / deaths | Rulers | Fertile partnerships | State bytes |
|---|---|---|---|---|---|---|---|
| 0 | 100 | 761 | 949 | 877 / 188 | 9 / 23 / 14 | 207 | 587,471 |
| 0 | 250 | 984 | 2,566 | 2,494 / 1,582 | 9 / 57 / 48 | 277 | 1,835,742 |
| 0 | 500 | 1,080 | 5,258 | 5,186 / 4,178 | 9 / 115 / 106 | 279 | 3,966,866 |
| 424242 | 100 | 738 | 949 | 877 / 211 | 9 / 22 / 13 | 196 | 589,729 |
| 424242 | 250 | 943 | 2,542 | 2,470 / 1,599 | 9 / 53 / 44 | 234 | 1,819,092 |
| 424242 | 500 | 1,063 | 5,262 | 5,190 / 4,199 | 9 / 118 / 109 | 277 | 3,989,470 |
| 20260919 | 100 | 730 | 898 | 826 / 168 | 9 / 21 / 12 | 190 | 545,863 |
| 20260919 | 250 | 977 | 2,561 | 2,489 / 1,584 | 9 / 55 / 46 | 258 | 1,814,945 |
| 20260919 | 500 | 1,093 | 5,317 | 5,245 / 4,224 | 9 / 109 / 100 | 300 | 4,003,167 |

Year-500 species populations:

| Species | Seed 0 | Seed 424242 | Seed 20260919 |
|---|---|---|---|
| human | 110 | 123 | 140 |
| elf | 70 | 66 | 85 |
| dwarf | 106 | 155 | 116 |
| halfling | 148 | 143 | 144 |
| gnome | 132 | 104 | 111 |
| dragonborn | 125 | 116 | 123 |
| half-elf | 145 | 126 | 118 |
| half-orc | 137 | 129 | 154 |
| tiefling | 107 | 101 | 102 |

Checkpoint SHA-256 hashes:

| Seed | Years | State SHA-256 | Events SHA-256 |
|---|---|---|---|
| 0 | 100 | `b7927de369d1dd3c0e4d207068383c704f90ef5e43361e4743218f063f17e960` | `518a9eed889b965325023e541396c893d0386ae74ae00b538325e4afef653ef5` |
| 0 | 250 | `90490bba048eccd031b6c9c70eadc2538c34fd070e6b0fc2bf6c43442f47dc4b` | `2d080f0a7ac72268818944c9917637052077851176daca7b9a2fb6968721ef03` |
| 0 | 500 | `5ae11e0181a120f484bb7890987dff68b39674063c4bbd41b52f0dfbbbe4887b` | `b2e6473d61318ae5af128cbb0423f3ab98ae873ab06408e19b49d5f6e51a6fc2` |
| 424242 | 100 | `b78cfb2f1710c2deb448f813ff702800e00b1b67286fe7f900a7b7b275af271c` | `f33879b72397f49a131837ca6e51aebb4090e30e961b239c73c7e79580af933d` |
| 424242 | 250 | `848b53a80d562b5518f2e07e184597d907c628633f750ff0bcf77fa05e503a2b` | `b3348727358b30d79594b5bb51ea294510b483b84e5dd7ecbe87ac3d1294348b` |
| 424242 | 500 | `afe4a9369e9dd2dcaaa3f8634165b2dc8699e7e64269d4d454bbf43c86e85a7e` | `a1950a9194bfdff91c2cdd26ea8280af59b158708bb40731b3507d121053c470` |
| 20260919 | 100 | `afd8ffa57bdd7581fe5bb477679cc45a3102c7f0958dc355b9aa79e916a3cd19` | `7206745bb5d08a0d3f6d93b18131007983c943a6787b1525c8a3ad1a6a260027` |
| 20260919 | 250 | `dcf9370c8a6eb35b21faba5c41126fa238a5572ec6137bce3068635d78f5d599` | `120534fb17cf5712b7df6193705043524cc2d2798324e5227e69f4f9b135997d` |
| 20260919 | 500 | `145b41d8a3eff3ccbbbbd930e535c7e26606dcadb05b48ba2b99b9fd468581f7` | `a8bcf9a7e691d342e072f074bd3ecf4e41f761ec36e0fe63ee5a9f761d6dbc9a` |

Before replacing the ASTRA-12 artifact, Astra retained its nine canonical checkpoint hashes and canonical/sweep annual-curve fingerprints in session. All canonical state/event hashes and all 23 unique-seed annual-curve fingerprints match ASTRA-14. This supports unchanged measured demographic behavior across the candidates; it is not a claim of general equivalence for all inputs. The previous failed boundary inputs were intentionally outside these default trajectories.

### Disk restart and twenty-seed sweep

A dedicated child per seed simulated 100 years, wrote/fsynced/closed a snapshot at the sole allowed JSON artifact path, and exited. The parent checked snapshot identity and the continuous 100-year reference. A new child read that file, advanced 150 years, and matched exact state/event bytes and hashes against the continuous 250-year reference. Stdin supplied identity metadata, not saved state. All three comparisons pass; the final report replaced the temporary snapshot in `finally`. Raw state/event strings are omitted after exact comparisons; the report retains hashes, curves, source identities and outcomes.

| Seed | Exited saver PID | New resumed PID | Snapshot bytes | Snapshot file SHA-256 | Restart process wall, ms | Result |
|---|---|---|---|---|---|---|
| 0 | 30124 | 40020 | 675,602 | `a120a184417e226bd8d0b4d5c0f62685ef05fa88d84950d1b29d41037abd4025` | 4998.9049 | PASS |
| 424242 | 3456 | 40152 | 678,293 | `1c4c6294eef97c3bc01e720ab3559770ef8184ac90d0d24b8c3c7b585ed27752` | 5015.4461 | PASS |
| 20260919 | 40264 | 40688 | 627,868 | `0961c8b5f15a7d9282966731720919665b9e4656520103ce5bd902da52429af5` | 4994.1911 | PASS |

Snapshot-file hashes include the envelope, unlike state-only hashes. Saved state/event hashes equal the 100-year entries above and resumed hashes equal the 250-year entries. This verifies the headless registry's disk persistence and process restart, not native RMMZ save integration.

Sweep seeds **1–20** each completed 250 years. Zero annual extinctions were observed across all nine species, all annual species populations stayed below 1,500, and all 250-year serialized checkpoints stayed below 15 MiB. Total living population minimum/median/maximum is **900 / 980.5 / 1,029**; largest annual site population **187**; largest checkpoint **1,920,192 bytes**; slowest worker trajectory **2,783.6599 ms**. Sweep timing is descriptive; the strict 30-second gate applies to the six canonical 500-year trajectories. The report contains 26 trajectories, 8,000 annual steps and 38 checkpoints; repeats are determinism checks, not additional independent biological samples.

### Remaining limits and handoff

The eight previously disclosed, explicitly nongating validation probes remain accepted without mutation: forged root/config hashes, missing hashes, stale custom-biology hash, arbitrary custom kind/version, custom promoted ID/version, missing default ID/version, and missing schema field. Fingerprint generation passes; production hash-integrity validation is not established. These observations are preserved in `observedMetadata.validationObservations` and do not alter the five agreed contract results.

Native F5/F8, NW.js, screenshots, gameplay, New Game activation and real-save integration are **NOT RUN**. Finite-seed survival does not prove indefinite stability or general equilibrium. Astra changed only the two authorized verifiers, this ledger, the ASTRA-14 STATUS entry and the local artifact; no production, catalog, seed or simulation-math change was made. Gemini retains integration and production-promotion authority. Astra's verification claim is released; no next implementation task started.

## DEUS-TSK-ASTRA-12 independent HIST-09 verification ledger — 2026-09-23

**Archived candidate evidence:** This ASTRA-12/13 ledger describes `ebf2455`. Its former local artifact was replaced by the ASTRA-14 schema-5 report above; its failures, timings and artifact hash remain historical observations.

**Authoritative classification: FAIL, exit code 1; PASS on all behavioral, biological, migration-preservation, and timing gates.** The retained ASTRA-12 run has **3 passing and 2 failing reconciled metadata contracts**. `PACKET_CAPACITY_MODEL_IDENTITY` fails on caller-supplied model IDs. `PACKET_CUSTOM_CANNOT_CLAIM_V1` also fails on migrated custom-profile provenance, although its creation-normalization and spoof-rejection subchecks pass. The ASTRA-13 dispatch summary's four-pass/one-failure count omits this migration-tag failure; this ledger preserves the observed result without changing the test or evidence.

ASTRA-13 is documentation consolidation against baseline `87766842ba742b40bb942da2b241a107e44ee0c0`, not a new benchmark or production repair. Astra's verification claim is released. Gemini remains coordinator and production implementation owner. This section supersedes the older candidate ledgers below for the frozen HIST-09 candidate; it does not certify later changes in other production systems.

### Frozen candidate and retained evidence

| Evidence | Identity |
|---|---|
| Frozen production candidate | `ebf2455af610e7a29f5393182e2b75d4eac35769` |
| Production file | `game/js/plugins/DEUS_HistoricalDemographics.js` |
| Production bytes / raw SHA-256 | 51,780 / `9efb6c69faee25c44ed3f97e067089d209126c3d3fde30e397ecc26850dedbdf` |
| ASTRA-12 dispatch baseline | `596f237e4dd04500ebbfc3b66856b0b3ce691581` |
| ASTRA-12 verifier commit | `62631babc86e407eaa0c0e9d939648850ce6ae20` |
| Benchmark source-set digest | `3a792b9000afc5bcab5158a2e6cb05f18dc0172494423a62435e7d0599c59c5d` |
| Benchmark harness raw SHA-256 | `ce1475f3b35f220a5f173e4396fb09aa537fffe7477592a5d5b060f3d99704b3` |
| Capacity harness raw SHA-256 | `5ea2219d1665eaa3aab41048ed7a65d403e0584038b7b3afa14b5a13b9c3d75c` |
| Final local artifact | `game/test_output/bench_species_biology.json`; task `DEUS-TSK-ASTRA-12`, schema 5, status `FAIL` |
| Artifact creation timestamp | `2026-09-23T16:22:35.857Z` |
| Artifact bytes / raw SHA-256 | 37,996,246 / `9e2a91d98759eccdb4093def6c456b223675a55058c23080a65316d2391e2d8f` |
| Runtime | Node v24.19.0; AMD Ryzen 7 8845HS with Radeon 780M Graphics; sequential fresh worker processes |

The benchmark loaded production plugins, plugin order, and catalog bytes from the immutable candidate snapshot, not later working-tree terrain changes. The retained report records matching working-source hashes at the start and end and `candidateUnchangedAtEnd: true`. ASTRA-13 rechecked the raw production, both verifier, and artifact hashes against this evidence. The aggregate 37,996,246-byte report contains 26 trajectories and annual telemetry; the **15 MiB gate applies to each serialized simulation state**, not this report. The final artifact is a consolidated report, not a transient restart snapshot, and remains unmodified.

### Contract breakdown and failure evidence

| Reconciled metadata contract | Result | Observed evidence |
|---|---|---|
| `PACKET_DEFAULT_PROFILE_TAG` | PASS | `profileKind: "promoted-default"`, `profileId: "v1"`, profile version and demographic tag `1.0.0-provisional-astra08`. |
| `PACKET_DEMOGRAPHIC_MODEL` | PASS | Root `version` and `schemaVersion` 7; `historyModelId: "historical_demographics_v1"`, `historyModelVersion: 1`. Schema and model versions are distinct. |
| `PACKET_CAPACITY_MODEL_IDENTITY` | FAIL | Default root/config IDs are `local_density_v1`, version 1. However, `create(world, { capacityModel: { id: "TEST_UNSUPPORTED_CAPACITY" } })` persists that unsupported config ID while the root retains the supported ID; `null` and numeric `1` also escape rejection/normalization. |
| `PACKET_CUSTOM_CANNOT_CLAIM_V1` | FAIL | New custom profiles normalize all four tags and both explicit promoted-claim spoofs reject without mutation. Genuine v6 custom migration instead returns `profileKind: "custom"`, null ID/version, but `demographicProfileVersion: "legacy-v6"` instead of `"custom"`. |
| `PACKET_CUSTOM_PROFILE_FINGERPRINT` | PASS | Independent Node SHA-256 oracle matches canonical parameter serialization; equal/reordered profiles and fresh processes repeat; changes to all nine parameter/range endpoints change the fingerprint. |

Capacity failure evidence is in `suites.capacity.report.packetChecks`: the candidate's create merge retains caller `capacityModel.id` (production line 277), while numeric/version validation at lines 371–374 does not reject that config identity. The custom migration failure comes from the `legacy-v6` fallback at lines 557–558 and the custom classification at line 567. The populated 40-year v6 fixture is pinned to `931b993e60545b24bddaa71ab433ebac8e967eb8`; its records and biology survive migration. Its migrated profile hash is `3089a195939cf5d1977c0612e4c57ef380498ad98b65e07e8541d42c966b0790`. This is a metadata-normalization failure, separate from passing migration preservation, idempotence, rejection, and atomicity.

The known default profile fingerprint is `e6d1fa7e53f4e606f2545bb149e0f4620127ffe5bd27cdaa30d1a772b801ba48`; the custom human `birthChance: 0.123` profile is `aeb1fa42e74bad9f018b9e53578b9a32b32e7874eebc19fc6e17b720c6c0512f`. Ten stale/malformed-hash controls are rejected by the independent oracle. This establishes fingerprint generation, not production hash-integrity validation. Eight explicitly nongating validation probes remain accepted without mutation: forged root/config hashes, missing hashes, stale custom-biology hash, arbitrary custom kind/version, custom promoted ID/version, missing default ID/version, and missing schema field. They are recorded as coverage limitations, not added to or hidden inside the five contract counts.

### Recorded execution and negative controls

The ASTRA-12 default command was `node tools/bench_species_biology.js`; it completed the required coverage with exit 1. Its capacity child ran `node tools/test_historical_carrying_capacity.js --selftest --json` and exited 1. The benchmark self-test (`node tools/bench_species_biology.js --selftest`) passed. These are retained ASTRA-12 execution results; ASTRA-13 checked the documentation against the artifact without rerunning or replacing the matrix.

| Check group | Recorded result |
|---|---|
| Benchmark self-test | 29 PASS / 0 FAIL, including corruption, partial/timeout evidence, repeat discrimination, and negative controls. |
| Common capacity/behavior contracts | 23 PASS / 0 FAIL: fixed [60, 350] bounds, site locality, start-of-year/pre-death density, nonzero floor, no probability-1 bypass, immutable validation, and migration preservation/idempotence/rejection/atomic failure. |
| Reconciled metadata contracts | 3 PASS / 2 FAIL; capacity suite exit 1. |
| Capacity mutant controls | 8 PASS / 0 missed; every mutant child exited 1 for its intended assertion. |
| Benchmark mutants | Four detected: `unseeded`, `invalid_lifespan`, `inverted_fertility`, `corrupt_parentage`; each intended child exit 1. |
| Canonical matrix | Six complete 500-year trajectories, 18 checkpoints, all five behavioral/biological/size/timing gates PASS. |
| Repeat comparisons | 3 PASS; exact state/event bytes, SHA-256 hashes, and annual curves agree across two fresh processes per seed. |
| Disk save/process restart | 3 PASS; saved 100-year checkpoint and resumed 250-year checkpoint match continuous references. |
| Sweep | 20/20 complete 250-year seeds; extinction, population, and state-size gates PASS. |
| Older production regression suite | NOT RUN in ASTRA-12: still pinned to candidate `8a40d2e`, outside that dispatch's editable/required suites. Its ASTRA-11 results are not evidence for `ebf2455`. |

The eight capacity controls map as follows: `no_density_pressure` → `DENSITY_RATE`; `universal_constant` → `LOCAL_CAPACITY`; `live_census_order_dependent` → `ANNUAL_ORDER`; `base_birth_1_bypass` → `BIRTH_ONE`; `unsupported_version_accepted` → `VERSIONS`; `malformed_capacity_accepted` → `CAPACITY_REJECTION`; `migration_rewrites_custom_profile` → `MIGRATION_PRESERVATION`; `migration_non_idempotence` → `MIGRATION_IDEMPOTENCE`. Mutations are confined to test copies in memory.

### Canonical timing and population measurements

The three seeds are 0, 424242, and 20260919, each run twice through 500 years. Only public `api.step` calls contribute to simulation time. Worker wall includes setup, observations, checkpoint validation/serialization and emission; parent process wall also includes startup, frozen-source loading, and final IPC parsing. The strict `<30 seconds` trajectory gate uses the larger worker/parent measurement. All six pass, without timing retries, averaging away failures, or forced GC. The complete suites/matrix/restarts/sweep took **141.3306056 seconds**.

| Seed | Repeat | Simulation, s | Worker wall, s | Parent process wall, s | Worst annual step, ms |
|---|---|---|---|---|---|
| 0 | 1 | 9.4960919 | 10.1355400 | 10.5635031 | 65.7898 |
| 0 | 2 | 9.7740068 | 10.3892180 | 10.8362765 | 73.7591 |
| 424242 | 1 | 9.6068179 | 10.2548823 | 10.7032454 | 67.5845 |
| 424242 | 2 | 9.7719429 | 10.4388844 | 10.8562837 | 71.2869 |
| 20260919 | 1 | 9.4884942 | 10.1238287 | 10.5660253 | 72.6096 |
| 20260919 | 2 | 10.3197181 | 10.9804155 | 11.3990842 | 77.5884 |

All nine species survive each annual census, and each has active fertile partnerships at years 250 and 500. Canonical annual species population peaks at 177; across canonical and sweep runs the observed range is 7–187, below the strict 1,500 gate. Largest canonical state is **4,003,167 bytes (3.818 MiB)**. Maximum sampled heap delta is **67.553 MiB**; ordinary GC and retained test evidence affect this number, so it is not a leak measurement. The five matrix gates `zeroExtinctions`, `viableReproduction`, `boundedPopulation`, `serializedState`, and `trajectoryBudget` all pass.

The table lists each unique checkpoint once; both repeats agree. Years are elapsed years (engine years 101/251/501). Births exclude 72 imported founders; deaths include founder deaths. Ruler triples are active / accession records / successions. All nine sites remain active with no abandoned or ruined sites and nine living rulers at every checkpoint.

| Seed | Years | Living | Person records | Births / deaths | Rulers | Fertile partnerships | State bytes |
|---|---|---|---|---|---|---|---|
| 0 | 100 | 761 | 949 | 877 / 188 | 9 / 23 / 14 | 207 | 587,471 |
| 0 | 250 | 984 | 2,566 | 2,494 / 1,582 | 9 / 57 / 48 | 277 | 1,835,742 |
| 0 | 500 | 1,080 | 5,258 | 5,186 / 4,178 | 9 / 115 / 106 | 279 | 3,966,866 |
| 424242 | 100 | 738 | 949 | 877 / 211 | 9 / 22 / 13 | 196 | 589,729 |
| 424242 | 250 | 943 | 2,542 | 2,470 / 1,599 | 9 / 53 / 44 | 234 | 1,819,092 |
| 424242 | 500 | 1,063 | 5,262 | 5,190 / 4,199 | 9 / 118 / 109 | 277 | 3,989,470 |
| 20260919 | 100 | 730 | 898 | 826 / 168 | 9 / 21 / 12 | 190 | 545,863 |
| 20260919 | 250 | 977 | 2,561 | 2,489 / 1,584 | 9 / 55 / 46 | 258 | 1,814,945 |
| 20260919 | 500 | 1,093 | 5,317 | 5,245 / 4,224 | 9 / 109 / 100 | 300 | 4,003,167 |

Year-500 species populations below substantiate the nine-species survival result. Local capacities are fertility inputs, not hard population ceilings; the artifact retains site capacities, yearly curves, and 100/250-year species evidence.

| Species | Seed 0 | Seed 424242 | Seed 20260919 |
|---|---|---|---|
| human | 110 | 123 | 140 |
| elf | 70 | 66 | 85 |
| dwarf | 106 | 155 | 116 |
| halfling | 148 | 143 | 144 |
| gnome | 132 | 104 | 111 |
| dragonborn | 125 | 116 | 123 |
| half-elf | 145 | 126 | 118 |
| half-orc | 137 | 129 | 154 |
| tiefling | 107 | 101 | 102 |

### Checkpoint SHA-256 identities

These hashes belong to `ebf2455` and the recorded ASTRA-12 run. State metadata changes make state hashes differ from the archived ASTRA-11 candidate; matching events do not erase that distinction.

| Seed | Years | State SHA-256 | Events SHA-256 |
|---|---|---|---|
| 0 | 100 | `b7927de369d1dd3c0e4d207068383c704f90ef5e43361e4743218f063f17e960` | `518a9eed889b965325023e541396c893d0386ae74ae00b538325e4afef653ef5` |
| 0 | 250 | `90490bba048eccd031b6c9c70eadc2538c34fd070e6b0fc2bf6c43442f47dc4b` | `2d080f0a7ac72268818944c9917637052077851176daca7b9a2fb6968721ef03` |
| 0 | 500 | `5ae11e0181a120f484bb7890987dff68b39674063c4bbd41b52f0dfbbbe4887b` | `b2e6473d61318ae5af128cbb0423f3ab98ae873ab06408e19b49d5f6e51a6fc2` |
| 424242 | 100 | `b78cfb2f1710c2deb448f813ff702800e00b1b67286fe7f900a7b7b275af271c` | `f33879b72397f49a131837ca6e51aebb4090e30e961b239c73c7e79580af933d` |
| 424242 | 250 | `848b53a80d562b5518f2e07e184597d907c628633f750ff0bcf77fa05e503a2b` | `b3348727358b30d79594b5bb51ea294510b483b84e5dd7ecbe87ac3d1294348b` |
| 424242 | 500 | `afe4a9369e9dd2dcaaa3f8634165b2dc8699e7e64269d4d454bbf43c86e85a7e` | `a1950a9194bfdff91c2cdd26ea8280af59b158708bb40731b3507d121053c470` |
| 20260919 | 100 | `afd8ffa57bdd7581fe5bb477679cc45a3102c7f0958dc355b9aa79e916a3cd19` | `7206745bb5d08a0d3f6d93b18131007983c943a6787b1525c8a3ad1a6a260027` |
| 20260919 | 250 | `dcf9370c8a6eb35b21faba5c41126fa238a5572ec6137bce3068635d78f5d599` | `120534fb17cf5712b7df6193705043524cc2d2798324e5227e69f4f9b135997d` |
| 20260919 | 500 | `145b41d8a3eff3ccbbbbd930e535c7e26606dcadb05b48ba2b99b9fd468581f7` | `a8bcf9a7e691d342e072f074bd3ecf4e41f761ec36e0fe63ee5a9f761d6dbc9a` |

### Disk continuation and sweep evidence

For each canonical seed, a dedicated child simulated 100 years, wrote/fsynced/closed the sole allowed JSON artifact path, and exited. The parent verified file identity and compared the saved state/events to the continuous 100-year reference. A new child read the file from disk and advanced 150 years; stdin conveyed identity metadata, not the saved state. Exact resumed state/event bytes and hashes matched the continuous 250-year reference. The final consolidated report replaced the temporary snapshot in `finally`. Raw checkpoint state/event strings were omitted after exact comparisons; the retained report carries their hashes, curves, comparison outcomes, and source identity.

| Seed | Exited saver PID | Resumed PID | Snapshot bytes | Snapshot file SHA-256 | Restart process wall, ms | Result |
|---|---|---|---|---|---|---|
| 0 | 35608 | 40716 | 675,602 | `7d83a27d8906e744e57c847fe31d2293c99ab2d575716b09a133b82a3f67f965` | 3107.4944 | PASS |
| 424242 | 9628 | 26816 | 678,293 | `1d2b459ab93ee6a8e094f9ba2547f73cf2175caa7db5243c0be22fb92a47b5b8` | 3196.5360 | PASS |
| 20260919 | 39080 | 11280 | 627,868 | `40e23ff44e411583a6eab64a134d4160b329f3dfef6d540874e75ac52a5281db` | 3647.1163 | PASS |

Snapshot file hashes cover the envelope and differ from state-only hashes. Saved state/event hashes equal the 100-year rows above; resumed hashes equal the 250-year rows. This covers headless registry persistence and process restart, not native RMMZ save integration.

All seeds **1–20** completed the 250-year sweep. All nine species had zero annual extinctions; each remained below 1,500, and each 250-year serialized checkpoint remained below 15 MiB. Living totals were **900 / 980.5 / 1,029 minimum / median / maximum**; largest recorded annual site population **187**, largest state **1,920,192 bytes**, slowest worker trajectory **1,939.4427 ms**. The 250-year sweep timing is descriptive; the 30-second gate applies to canonical 500-year trajectories. The artifact contains every sweep seed's species populations and annual curves. In total, six canonical plus twenty sweep trajectories provide 8,000 annual steps and 38 checkpoints; repeated seeds test determinism, not additional independent biological samples.

### ASTRA-13 consolidation and limits

ASTRA-13 inspected the retained schema-5 artifact and verifier source, checked its counts/tables/hashes against this ledger, checked that the artifact and frozen production bytes remained unchanged, and confined the commit to this document and the designated `## DEUS-TSK-ASTRA-12` STATUS section. Both harnesses remain unchanged. Earlier ledgers below are archived observations of different candidates; their reused artifact paths no longer identify the current file contents.

Native RMMZ F5/F8, NW.js, screenshots, gameplay, New Game activation, and real-save integration are **NOT RUN** for this documentation task; no gameplay or production-acceptance claim follows. Finite-seed survival is not proof of general equilibrium or future survival. Coordinator action remains resolution of the two observed metadata failures, or an explicit contract decision that preserves the historical test result. Astra did not change production, weaken acceptance checks, or rewrite evidence to match the dispatch summary. Verification claim released; no next implementation task started.

## Archived ASTRA11 independent HIST-09 revalidation — 2026-09-23

This section preserves the ASTRA-11 candidate `8a40d2e` findings. Its artifact identities and results describe that earlier run. The reused local JSON path now contains the ASTRA-12 schema-5 report documented above.

**Authoritative classification: FAIL, exit code 1.** The completed default dispatch passed all 23 established behavior/model checks, the gates for all six canonical trajectories, three repeat comparisons, three disk save/restart comparisons, and the twenty-seed sweep. Five literal ASTRA-11 metadata requirements failed. Those mismatches remain acceptance failures; passing simulation behavior does not revise the packet. All requested execution coverage completed in **146.3548166 seconds** without a timing retry or production change.

### Frozen candidate and evidence identity

| Evidence | Inspected identity |
|---|---|
| Production candidate commit | `8a40d2ed66da758fc95fc3c1e8205709336c54df` |
| Production file | `game/js/plugins/DEUS_HistoricalDemographics.js` |
| Production bytes / SHA-256 | 45,429 / `e08ce6104669830e0388fe90631f8002f8547f77484f52263eea3aee34273e95` |
| Benchmark source digest | `043c0a82d1b3971c7f459d5affd9ce212c5b7b82c868230e879c5ba5f853eb05` |
| Benchmark harness SHA-256 | `2c1fb6fe26df36ab7ff18c3871f5e34c1c8f3492e0ab5e49a6c7b6ec34e88138` |
| Capacity harness SHA-256 | `7150a620c388bb3db45cdf9d2255b7621d772d12fe1dbfd8d9bcedb81e104f1a` |
| Regression harness SHA-256 | `4aa775f92ee1244c2d5e33c5ba28810b7eeeb29a2b2e91ae4de5a3e223897383` |
| Final artifact | `game/test_output/bench_species_biology.json`, task `DEUS-TSK-ASTRA-11`, report schema 4 |
| Artifact bytes / SHA-256 | 37,992,993 / `837a3442312548d3e9ceede440d128f4df6072f7e210f9a831f61a1603d3ef61` |
| Runtime | Node v24.19.0; AMD Ryzen 7 8845HS with Radeon 780M Graphics; sequential fresh worker processes |

Every executed production plugin, catalog, and plugin-order input was read from the candidate's immutable Git snapshot. The working plugin matched the specified raw bytes before execution and afterward (`candidateUnchangedAtEnd: true`). Source and harness identities were checked for workers and restart snapshots. The artifact contains twenty-six matrix/sweep trajectories and their annual evidence; its aggregate size is not subject to the **15 MiB per serialized simulation state** gate. The largest canonical state was 4,002,785 bytes (3.817 MiB).

### Contract results and literal packet discrepancies

The packet requires schema 7, demographic model 7, capacity model identity `local_density_v1`, promoted profile tag `v1`, and deterministic custom-profile fingerprinting. The candidate satisfies schema 7 but persists the different metadata below. Clarification was requested; no correction to the literal packet was received before this run. The verifier retains both the established implementation-contract results and the literal packet results, with an overall FAIL.

| Literal packet check | Expected | Observed |
|---|---|---|
| `PACKET_DEFAULT_PROFILE_TAG` | `v1` | `demographicProfileVersion: "1.0.0-provisional-astra08"`. |
| `PACKET_DEMOGRAPHIC_MODEL` | Demographic model version 7 | Existing `historyModelVersion: 1`; schema `version` is separately 7. The verifier maps the named model requirement to that existing field rather than inventing another field. |
| `PACKET_CAPACITY_MODEL_IDENTITY` | Persisted `local_density_v1` identity | Root `capacityModelVersion: 1`; config `{ version: 1, defaultBaseline: 160, minimumScale: 0.1, minCapacity: 60, maxCapacity: 350 }`; no literal model identity. |
| `PACKET_CUSTOM_CANNOT_CLAIM_V1` | Modified biology remains tagged `custom` | Modified explicit profiles with `options.demographicProfileVersion: "v1"` retain `v1`. Protection of the candidate's own promoted tag does not protect the packet's different tag. |
| `PACKET_CUSTOM_PROFILE_FINGERPRINT` | Advertised deterministic SHA-256 fingerprint; identical profiles repeat and changed profiles differ | Normal explicit profiles are tagged `custom`, but no advertised 64-hex SHA-256 fingerprint was found in existing top-level/config metadata; original/repeated/changed fingerprint lists are empty. |

The common suite passed **23 checks**, including fixed absolute capacity bounds (59 and 351 reject; 60 and 350 accept; widened caller bounds reject), malformed model input rejection, immutable validation, site-local start-of-year density, pre-death census, no probability-1 bypass, source-ID-based capacity derivation, explicit v6 rejection before migration, preservation of populated legacy records, and idempotent migration. The new mandatory failed-migration atomicity check passed: malformed v6 input remained byte-identical and retained version 6. A successful migration still changes subsequent simulation to v7 density behavior; preservation of old records is not a promise of the old v6 future trajectory.

### Commands, checks, and ability to fail

The completed `node tools/bench_species_biology.js` default invoked the bounded suites, six canonical workers, disk restarts, and sweep. The regression was also checked directly with `node tools/test_production_history_demographics.js --selftest --json`; its syntax check and scoped whitespace checks passed. No baseline production method was patched or disabled.

| Suite | Observed result |
|---|---|
| Benchmark self-checks | 29 PASS, including disk identity/corruption, sweep-gate failure, timeout evidence, repeat evidence, and four existing negative controls. |
| Carrying-capacity common contracts | 23 PASS / 0 FAIL. |
| Literal packet metadata contracts | 0 PASS / 5 FAIL; suite process exited 1. |
| Regression self-checks | 34 PASS; suite process exited 0. Existing assertions and TEST biology remained unchanged when the candidate pin was updated. |
| Capacity mutation controls | Eight detected; every child exited 1 for its intended assertion. |
| Regression mutation controls | Four detected; every child exited 1 for its intended assertion. |

The eight capacity controls are `no_density_pressure` → `DENSITY_RATE`, `universal_constant` → `LOCAL_CAPACITY`, `live_census_order_dependent` → `ANNUAL_ORDER`, `base_birth_1_bypass` → `BIRTH_ONE`, `unsupported_version_accepted` → `VERSIONS`, `malformed_capacity_accepted` → `CAPACITY_REJECTION`, `migration_rewrites_custom_profile` → `MIGRATION_PRESERVATION`, and `migration_non_idempotence` → `MIGRATION_IDEMPOTENCE`. The regression controls are `dead_reproduce` → dead-parent reproduction, `skip_succession` → dead/mismatched ruler, `corrupt_parents` → invalid parent IDs, and `uniform_lifespan` → a young elf incorrectly dying of old age. Mutations affect in-memory test copies only. Passing existing-model regression assertions is not counted as satisfying the five conflicting metadata requirements.

### Canonical timing and biological gates

Only unmodified public `api.step` calls contribute to simulation time. Worker wall time also includes setup, annual observations, checkpoint validation/serialization, and checkpoint emission. Parent process wall time additionally includes startup, frozen-source loading, and final IPC parsing. The strict `<30.0 seconds` gate conservatively uses the larger worker/parent wall measurement. All six passed. No failed timing sample was retried or averaged away.

| Seed | Repeat | Simulation, s | Worker wall, s | Parent process wall, s | Worst annual step, ms |
|---|---:|---:|---:|---:|---:|
| 0 | 1 | 10.481 | 11.130 | 11.566 | 81.508 |
| 0 | 2 | 9.011 | 9.624 | 10.058 | 56.463 |
| 424242 | 1 | 9.964 | 10.615 | 11.017 | 74.639 |
| 424242 | 2 | 10.200 | 10.879 | 11.340 | 78.381 |
| 20260919 | 1 | 9.801 | 10.457 | 10.875 | 70.530 |
| 20260919 | 2 | 9.871 | 10.530 | 10.969 | 73.571 |

All nine species remained alive at every annual census, stayed strictly below 1,500 living people, and retained active fertile partnerships at both 250 and 500 years. The largest annual species census was 177. All checkpoint states were below 15 MiB. Thus `zeroExtinctions`, `viableReproduction`, `boundedPopulation`, `serializedState`, and `trajectoryBudget` each passed. Maximum sampled heap delta was **66.025 MiB**; samples include retained evidence, temporary allocations, and ordinary GC and do not measure leaks or serialized-state size. No forced GC was used.

### Nine unique canonical checkpoints

Both repeats have identical state/event bytes, hashes, and annual census curves. Counts below therefore appear once per seed/horizon. Horizons are elapsed years (engine years 101/251/501). Cumulative births exclude the 72 imported founders; cumulative deaths include founder deaths. Records equal living plus deceased. All nine sites were active, none abandoned or ruined, and each faction had one living ruler at every checkpoint. Ruler triples mean **active / historical accession records / successions**.

| Seed | Years | Living | All person records | Births / deaths | Rulers | Fertile partnerships | State bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0 | 100 | 761 | 949 | 877 / 188 | 9 / 23 / 14 | 207 | 587,089 |
| 0 | 250 | 984 | 2,566 | 2,494 / 1,582 | 9 / 57 / 48 | 277 | 1,835,360 |
| 0 | 500 | 1,080 | 5,258 | 5,186 / 4,178 | 9 / 115 / 106 | 279 | 3,966,484 |
| 424242 | 100 | 738 | 949 | 877 / 211 | 9 / 22 / 13 | 196 | 589,347 |
| 424242 | 250 | 943 | 2,542 | 2,470 / 1,599 | 9 / 53 / 44 | 234 | 1,818,710 |
| 424242 | 500 | 1,063 | 5,262 | 5,190 / 4,199 | 9 / 118 / 109 | 277 | 3,989,088 |
| 20260919 | 100 | 730 | 898 | 826 / 168 | 9 / 21 / 12 | 190 | 545,481 |
| 20260919 | 250 | 977 | 2,561 | 2,489 / 1,584 | 9 / 55 / 46 | 258 | 1,814,563 |
| 20260919 | 500 | 1,093 | 5,317 | 5,245 / 4,224 | 9 / 109 / 100 | 300 | 4,002,785 |

The following site tables provide **100 / 250 / 500** population and fertile-partnership counts. Each species has exactly one canonical site, so its site and species populations agree. Capacity is constant within each trajectory and is a fertility input, not a hard population cap. The first column records demographic site ID / imported source site ID.

**Seed 0**

| Site / source | Species | Z | Capacity | Site and species population | Fertile partnerships |
|---|---|---:|---:|---:|---:|
| 0 / 1 | human | 0 | 160 | 131 / 132 / 110 | 34 / 30 / 18 |
| 1 / 2 | elf | 0 | 181 | 13 / 29 / 70 | 4 / 9 / 24 |
| 2 / 3 | halfling | 0 | 169 | 116 / 122 / 148 | 36 / 36 / 43 |
| 3 / 4 | dwarf | -1 | 144 | 25 / 112 / 106 | 6 / 31 / 29 |
| 4 / 5 | gnome | -1 | 166 | 20 / 72 / 132 | 6 / 19 / 29 |
| 5 / 6 | dragonborn | -2 | 149 | 127 / 113 / 125 | 36 / 29 / 37 |
| 6 / 7 | half-elf | 0 | 179 | 64 / 152 / 145 | 14 / 52 / 42 |
| 7 / 8 | half-orc | 0 | 165 | 150 / 139 / 137 | 44 / 41 / 32 |
| 8 / 9 | tiefling | -2 | 132 | 115 / 113 / 107 | 27 / 30 / 25 |

**Seed 424242**

| Site / source | Species | Z | Capacity | Site and species population | Fertile partnerships |
|---|---|---:|---:|---:|---:|
| 0 / 1 | human | 0 | 156 | 129 / 112 / 123 | 33 / 22 / 31 |
| 1 / 2 | elf | 0 | 170 | 12 / 25 / 66 | 4 / 10 / 20 |
| 2 / 3 | halfling | 0 | 170 | 95 / 135 / 143 | 21 / 34 / 42 |
| 3 / 4 | dwarf | -1 | 170 | 28 / 109 / 155 | 5 / 32 / 53 |
| 4 / 5 | gnome | -1 | 143 | 18 / 58 / 104 | 6 / 17 / 24 |
| 5 / 6 | dragonborn | -2 | 146 | 126 / 120 / 116 | 40 / 25 / 26 |
| 6 / 7 | half-elf | 0 | 170 | 81 / 135 / 126 | 25 / 35 / 31 |
| 7 / 8 | half-orc | 0 | 166 | 141 / 140 / 129 | 31 / 36 / 30 |
| 8 / 9 | tiefling | -2 | 143 | 108 / 109 / 101 | 31 / 23 / 20 |

**Seed 20260919**

| Site / source | Species | Z | Capacity | Site and species population | Fertile partnerships |
|---|---|---:|---:|---:|---:|
| 0 / 1 | human | 0 | 169 | 124 / 131 / 140 | 26 / 29 / 31 |
| 1 / 2 | elf | 0 | 161 | 14 / 38 / 85 | 4 / 10 / 28 |
| 2 / 3 | halfling | 0 | 171 | 101 / 133 / 144 | 30 / 38 / 40 |
| 3 / 4 | dwarf | -1 | 140 | 34 / 117 / 116 | 10 / 42 / 38 |
| 4 / 5 | gnome | -1 | 151 | 22 / 54 / 111 | 5 / 10 / 29 |
| 5 / 6 | dragonborn | -2 | 143 | 129 / 121 / 123 | 35 / 35 / 32 |
| 6 / 7 | half-elf | 0 | 166 | 61 / 132 / 118 | 17 / 38 / 35 |
| 7 / 8 | half-orc | 0 | 181 | 164 / 147 / 154 | 46 / 28 / 39 |
| 8 / 9 | tiefling | -2 | 131 | 81 / 104 / 102 | 17 / 28 / 28 |

| Seed | Years | State SHA-256 | Events SHA-256 |
|---|---:|---|---|
| 0 | 100 | `78edbb1309150456d105cf7d873965341596ae87724e3bb6d2f260d8e0ec3020` | `518a9eed889b965325023e541396c893d0386ae74ae00b538325e4afef653ef5` |
| 0 | 250 | `3aac8f703fd24a17927e38dc9614ef259f4ada63ed007871dd44dcb0bd2c3a0e` | `2d080f0a7ac72268818944c9917637052077851176daca7b9a2fb6968721ef03` |
| 0 | 500 | `8e480092290630c211aea77ca5b7f585197aed6650872c308d85a2b38f29dc3b` | `b2e6473d61318ae5af128cbb0423f3ab98ae873ab06408e19b49d5f6e51a6fc2` |
| 424242 | 100 | `987fa8b0a97a5a997b2e24198156a207b08027c89a5461dc614c56cade71af0f` | `f33879b72397f49a131837ca6e51aebb4090e30e961b239c73c7e79580af933d` |
| 424242 | 250 | `188a42fa8e20f58885c0715998ae90df468e0b46dd1e002c3fd0c80db5f6537d` | `b3348727358b30d79594b5bb51ea294510b483b84e5dd7ecbe87ac3d1294348b` |
| 424242 | 500 | `88cc27090dbe2fa5913d6217c27db55adf38c608fcc17a99c352419b1156ab03` | `a1950a9194bfdff91c2cdd26ea8280af59b158708bb40731b3507d121053c470` |
| 20260919 | 100 | `dbd76996b6ea603265a1a1544ce80035dc366ae826acd1caeb26a94e21a74a30` | `7206745bb5d08a0d3f6d93b18131007983c943a6787b1525c8a3ad1a6a260027` |
| 20260919 | 250 | `2a9fcc6e2de379f5a310af5ce459b8181fd991a7d81eaae1330c2edf4e2b2744` | `120534fb17cf5712b7df6193705043524cc2d2798324e5227e69f4f9b135997d` |
| 20260919 | 500 | `caebed5f5c849d5b614766f6c121ce5bbbbc0fd5f53c390120dcb7c89bae76dd` | `a8bcf9a7e691d342e072f074bd3ecf4e41f761ec36e0fe63ee5a9f761d6dbc9a` |

### Actual disk save and process restart

For each seed, a dedicated child simulated 100 years, wrote/fsynced/closed a snapshot at the sole allowed artifact path, and exited. The parent compared the file's checkpoint with the continuous 100-year reference. A different child read the file from disk, advanced 150 years, and matched the continuous 250-year state/event bytes and hashes. Stdin supplied identity metadata, not the saved state. All three tests passed; the final consolidated report replaced each temporary snapshot in `finally`. No real game save was involved.

| Seed | Exited saver PID | New resumed PID | Saved file bytes | Snapshot file SHA-256 | Result |
|---|---:|---:|---:|---|---|
| 0 | 32648 | 38676 | 675,186 | `e6cfa526b8f31ddc6d28cd78765215016f6e22644c096ceadec81744b9e1e4b6` | PASS |
| 424242 | 32028 | 11292 | 677,878 | `190a750927f15f3396142f31ec2da99ae1e402e78bb1eaf17c54272b44783fc4` | PASS |
| 20260919 | 40888 | 22744 | 627,452 | `4e512c84cf5a841c63d6c8dc308d4ddb26f6614a327da0549ce39899d604493a` | PASS |

Snapshot file hashes include the saved envelope and are different from the state-only hashes. Saved state/event hashes equal the 100-year entries above; resumed state/event hashes equal the corresponding 250-year entries. This proves disk persistence and fresh-process continuation for the headless registry, not RMMZ native save integration.

### Twenty-seed sweep and scope limits

All seeds **1..20** completed 250 years with **zero annual extinctions for each of nine species**. The sweep's `zeroExtinctions`, `boundedPopulation` (each species below 1,500), and `serializedState` (each checkpoint below 15 MiB) gates passed. Total living population was **900 / 980.5 / 1,029 minimum / median / maximum**; largest annual site population was **187**, largest serialized state **1,919,810 bytes**, and slowest worker trajectory **1,913.499 ms**. Sweep timing is descriptive; the strict 30-second requirement applies to the six 500-year canonical trajectories. All twenty per-species population rows and annual curves remain in the schema-4 artifact.

Finite-seed survival and exact repeats do not establish general equilibrium, future survival, or native-game performance. Repeats supply determinism evidence, not additional independent biological samples. Production plugins, catalogs, profiles, New Game registration, settlement/combat code, and real saves were not edited. Native RMMZ Playtest, F8 console inspection, screenshots, and production activation were **NOT RUN**. The required decision is resolution of the five literal packet discrepancies by the coordinator and implementation owner; the verifier did not silently substitute different metadata contracts.

## Archived ASTRA10 independent HIST-09 production verification — 2026-09-23

This section preserves the ASTRA10 findings for candidate `f532291b`. Its references to the then-current benchmark and artifact describe that earlier session. The reused `game/test_output/bench_species_biology.json` now contains the ASTRA11 schema-4 evidence above; ASTRA10 timing failures, metadata behavior, and migration diagnostics below are historical observations, not claims about the new candidate.

The completed default verification observed **FAIL, exit code 1**: the independent contract suite has 18 passing checks and four failing production contracts, and both seed-0 trajectories exceeded the 30-second limit. All eight required mutation controls were detected. All six canonical trajectories, eighteen checkpoints, three full-process restart comparisons, and twenty sweep seeds completed. Biological and state-size gates passed for the canonical matrix; those results do not cancel the contract or timing failures. Astra is the verifier; Gemini remains the production implementation owner. No production repair, catalog change, New Game activation, or real-save migration is part of this verification.

The sixteen evidence fields below organize this handoff. They are not a claim to reproduce an unavailable coordinator checklist verbatim.

### 1. Candidate identity and inspection boundary

| Field | Inspected value |
|---|---|
| Task | `DEUS-TSK-ASTRA-10` |
| Candidate commit | `f532291b8aecbd9899814ddf6c098bd3cee36342` |
| Production source | `game/js/plugins/DEUS_HistoricalDemographics.js` |
| Raw source SHA-256 | `06d0f7ac1596bea8d2432c48c899497e9d8b0cb67b12925e23958a5427af0012` |
| Raw byte length | 41,439 |
| Demographic schema | 7 |
| History / capacity model versions | 1 / 1 |
| Default profile version | `1.0.0-provisional-astra08` |
| Default capacity model | `{ version: 1, defaultBaseline: 160, minimumScale: 0.10, minCapacity: 60, maxCapacity: 350 }` |

The candidate's working-file hash and byte length matched the packet before execution; the final report records `candidateUnchangedAtEnd: true`. All production JavaScript, plugin-order input, and catalog data used by the verifiers are read as raw Git blobs from the named commit. Concurrent working-tree changes to other plugins are recorded as provenance, never loaded as simulation inputs. The benchmark's production-source digest is `46a10dc03f8a23113e1be821860ccdb0d2121ba474647cdc36b4f05451dff816`; the candidate remains the same across the suites even when their aggregate digest formats differ. Each worker and restart checks the loaded source and harness identities. The benchmark harness SHA-256 is `678777e24a34beeb0b4b7f3b57fb16b05dd8e2b11b783e5677b7552e61600a9c`.

### 2. Ownership and files changed by the verifier

The verification work is limited to `tools/bench_species_biology.js`, `tools/test_historical_carrying_capacity.js`, `tools/test_production_history_demographics.js`, this document, Astra's status entry, and the consolidated diagnostic artifact. `DEUS_HistoricalDemographics.js`, other production plugins, catalogs, plugin registration, and real saves are read-only. Fable's settlement files remain outside this task.

The carrying-capacity and regression suites emit JSON to stdout. The benchmark owns the consolidated `game/test_output/bench_species_biology.json`, report schema version 3, including intermediate coverage and failures. That path now holds ASTRA10 evidence; it no longer denotes the ASTRA08 artifact described in the archived section below.

### 3. Commands and execution method

```text
node tools/test_historical_carrying_capacity.js --selftest --json
node tools/test_production_history_demographics.js --selftest --json
node tools/bench_species_biology.js --selftest
node tools/bench_species_biology.js
```

The default benchmark invokes the bounded suites, then runs the three canonical seeds with two independent processes each, full-process restart comparisons, and the twenty-seed sweep sequentially. `--seed`, `--years`, `--runs`, or `--matrix-only` select partial coverage; such a run does not establish full dispatch acceptance. The benchmark records production density inputs for inspection but never applies the old caller-side fertility schedule to the candidate. Ordinary matrix workers call the unmodified public `step(state)` using defaults from `create(world)`.

### 4. Fresh-state and profile contract

Observed passing checks confirm that omitted or undefined `options.profiles` imports the nine expected ASTRA08 profiles, 72 canonical founders, nine sites, and the v7/model metadata. Normal explicit profile objects are copied and labeled `custom`; changes to a caller's supplied profile or one created state do not change subsequent default creations. The source Year-1 `world.history.version === 5` remains separate and unchanged, and `create` does not attach the demographic state automatically.

The explicit profile-version override is defective: changed custom biology can claim the promoted-default version string. The failing case and source anchors are recorded in field 8.

### 5. Versioned API observed in the candidate

| API | Observed behavior and boundary |
|---|---|
| `create(world, options = {})` | Imports canonical Year-1 data into a separate v7 registry; uses promoted defaults when profiles are omitted; accepts explicit test profiles, optional capacity-model fields, and capacity overrides keyed by source site ID. Input-validation defects are listed below. |
| `step(state, conditions = {})` | Validates v7 state and annual conditions, snapshots each site's census, then processes deaths, partnerships, births, succession, census/abandonment, and record tiers. One historical year advances. |
| `simulate(state, years, options = {})` | Validates and repeatedly calls `step`; accepts fixed `conditions` or `conditionsByYear`, not both. |
| `validate(state)` | Checks without mutating valid input; the deeply frozen-state control passes. v6 and unsupported schema/model versions reject. It currently enforces caller-widenable capacity bounds, which violates the mandatory range. |
| `migrate(state)` | Explicitly mutates a v6 object into v7 and returns that same object. Successful migration preserves existing records/profiles; a valid v7 input is byte-idempotent. Failed migration is not atomic. |
| `summary(state)` / `kinshipRelated(state, a, b)` | Existing summary and kinship APIs remain available. Summary validates the state first. |
| `deriveSiteCapacity(...)` | Exposes the candidate's deterministic capacity derivation. `DEFAULT_PROFILES` and `DEFAULT_CAPACITY_MODEL` are also exported. |

The plugin adds no save/load hook or New Game listener. JSON snapshots in this task belong to isolated headless processes. Migration acceptance does not imply unchanged future v6 simulation: migrated states subsequently use v7 site-density behavior.

### 6. Local capacity and annual density semantics

Capacity is derived from `sourceSiteId`, seed, and z using the existing `UF.World.hash32` and `mulberry32` helpers. The base is 170 at z=0, 155 at z=-1, and 145 otherwise; the tested canonical sites use z=0/-1/-2. The modifier is `floor(rng() * 31) - 15`, with salt `0x43415041`, followed by the configured capacity clamp. Reordering the source sites does not alter their capacities.

For births, the candidate uses `baseBirthChance * max(minimumScale, 1 - startOfYearPopulation / historicalCapacity)`. The census is captured before deaths and remains fixed for all households in that year. The same-species, two-site fixture checks each site's own population and capacity, including an unrelated-site population perturbation. Separate controls verify that earlier births, deaths, a universal capacity, or a `birthChance === 1` bypass cannot silently substitute another rule. At and above capacity, the configured 0.10 floor remains nonzero. This is fertility feedback, not a hard population limit or a physical food/housing economy.

### 7. Successful migration and rejection behavior

The legacy fixture is produced by the real v6 engine from commit `931b993e60545b24bddaa71ab433ebac8e967eb8`, normalized engine SHA-256 `647592fc4a65b474f5f12835cee80a461d1f0c86ba847559b3ec835791471c2e`, and advanced for 40 years with custom profiles. Direct `step` and `validate` reject that v6 state with an explicit migration-required diagnostic. A successful explicit migration preserves every pre-existing field after projecting away the added schema/model/capacity metadata, including IDs, people, parents, partnerships, dynasties, rulers, events, and custom profiles. Repeating migration on the resulting v7 object changes no bytes.

The separate `MIGRATION_FAILURE_ATOMICITY` observation reports `MUTATED_BEFORE_REJECTION`: a v6 fixture containing a malformed capacity throws after its version has already changed to 7. The packet requires rejection and pure validation; failed-migration atomicity is reported separately from the four failed mandatory checks. Callers must retain an untouched input snapshot when testing this candidate's migration. No real save was migrated.

### 8. Observed production contract failures

These failures were reproduced against the unmodified frozen candidate and retained in `suites.capacity.report.checks`. Tests were not weakened and production code was not repaired.

| Contract | Observed failure | Candidate source anchor |
|---|---|---|
| `CUSTOM_PROVENANCE` | Change human birth chance to 0.123, supply the promoted version string, and `create` accepts that version instead of recording `custom`. | `DEUS_HistoricalDemographics.js:162–164`; validation at 229 accepts any nonempty string. |
| `ABSOLUTE_CREATE_BOUNDS` | Supplying model bounds 1..1000 permits an explicit site capacity of 59, below the mandatory minimum 60. | `DEUS_HistoricalDemographics.js:157`, `176–179`. |
| `ABSOLUTE_VALIDATE_BOUNDS` | A state with widened model bounds and capacity 59 passes validation. | `DEUS_HistoricalDemographics.js:235`, `249`. |
| `MODEL_INPUT_SHAPE` | `create(world, { capacityModel: 42 })` succeeds by merging the primitive into defaults instead of rejecting malformed input. | `DEUS_HistoricalDemographics.js:157`. |

The widened-bound tests contain additional cases but stop on the first accepted invalid value; the recorded evidence specifically establishes acceptance of 59. Likewise, the malformed-container check records its first numeric case, 42. Do not infer execution of later cases from the source list alone.

### 9. Ability-to-fail evidence

The contract suite observed **18 PASS / 4 FAIL** on the candidate. All eight required mutants separately exited 1 because their intended assertion failed; mutant detection is a passing test outcome, not another production failure.

| Mutant | Assertion that detected it |
|---|---|
| `no_density_pressure` | `DENSITY_RATE`: births differ from the independent probability oracle. |
| `universal_constant` | `LOCAL_CAPACITY`: site-local oracle differs. |
| `live_census_order_dependent` | `ANNUAL_ORDER`: later household births differ. |
| `base_birth_1_bypass` | `BIRTH_ONE`: base probability 1 still requires density pressure. |
| `unsupported_version_accepted` | `VERSIONS`: unsupported metadata was accepted. |
| `malformed_capacity_accepted` | `CAPACITY_REJECTION`: malformed site capacity was accepted. |
| `migration_rewrites_custom_profile` | `MIGRATION_PRESERVATION`: stored custom biology changed. |
| `migration_non_idempotence` | `MIGRATION_IDEMPOTENCE`: a second migration changed bytes. |

Each mutation is applied only to an in-memory test copy of the candidate source, selected by an exact unique anchor; no production file is edited. The no-density mutant uses a bounded discriminatory birth fixture rather than requiring a potentially unbounded population explosion to prove that the equation was bypassed.

### 10. Regression and benchmark self-checks

The frozen regression suite observed **34 PASS** checks. Its four existing mutants independently failed for dead-parent reproduction, a dead/mismatched ruler, invalid parent IDs, and human-style mortality applied to a young elf. The regression harness SHA-256 is `f719b5707a3fd4da9d2f1fdebca7802c7637a6cccf67e7d2298c34b42ccd79bd`.

Five prior fixture overrides setting `minimumScale: 1.0` were removed. Small synthetic TEST households use fixed seed 1 and explicitly establish that each required birth draw succeeds under ordinary 0.10-floor density. Their count, spacing, parentage, and succession assertions remain intact. The original seed-0 fixture assumption was correctly rejected because draw 0.98906157 exceeded threshold 0.9875. Canonical benchmark seeds were not altered. The regression's existing reload test uses a new VM in the same process; field 12 covers the separate full-process proof.

The completed default run's benchmark self-checks observed **26 PASS**, including altered snapshot/worker identity, repeat evidence, incomplete-coverage gating, and retained checkpoint data after a controlled timeout. These bounded self-checks do not imply that the production contract suite or every long-run gate passed.

### 11. Canonical matrix measurements

The completed report contains seeds 0, 424242, and 20260919, two independent trajectories per seed, with checkpoints after 100/250/500 elapsed years: **six trajectories, eighteen checkpoints, no incomplete workers**. All three repeat checks passed exact state/event byte and annual-curve comparisons. Biological summaries use three unique seeds, not six independent populations. Runtime was Node v24.19.0 on an AMD Ryzen 7 8845HS with sequential workers. The complete default dispatch, including suites, matrix, restarts, and sweep, took **256.7508614 seconds**.

Each timing pair is repeat 1 / repeat 2. Living count, archived count, and state bytes are identical across repeats. The annual peak is the largest living population of any one species during that seed's 500-year trajectory.

| Seed | Whole trajectory, seconds | Worker process elapsed, seconds | Annual species peak | Living at 500 | Archived at 500 | State bytes at 500 |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 32.247 / 35.060 | 32.662 / 35.482 | 163 | 1,080 | 4,178 | 3,966,484 |
| 424242 | 24.011 / 25.143 | 24.393 / 25.535 | 177 | 1,063 | 4,199 | 3,989,088 |
| 20260919 | 23.537 / 28.865 | 23.946 / 29.263 | 168 | 1,093 | 4,224 | 4,002,785 |

Seed 0's unrounded whole-trajectory times were **32.2473287 and 35.0597312 seconds**. Both fail the strict `<30 seconds` requirement; other seeds passing does not average away these failures. The largest serialized checkpoint was **4,002,785 bytes (3.817 MiB)**, below 15 MiB. Every species stayed alive at each annual census and had an active fertile partnership at every 250/500-year checkpoint. The largest annual species population was 177, below 1,500. Thus `zeroExtinctions`, `viableReproduction`, `boundedPopulation`, and `serializedState` passed; `trajectoryBudget` failed.

These cumulative simulation measurements pool timing observations across all six trials. Maximum sampled heap delta is relative to each worker's pre-simulation heap sample, not serialized-state memory or a leak measurement.

| Elapsed years | Mean simulation, ms | Simulation range, ms | Worst annual call, ms | State bytes, min–max | Maximum sampled heap delta, MiB |
|---|---:|---:|---:|---:|---:|
| 100 | 149.860 | 131.494–186.238 | 6.455 | 545,481–589,347 | 6.700 |
| 250 | 1,976.738 | 1,718.612–2,338.192 | 52.603 | 1,814,563–1,835,360 | 28.931 |
| 500 | 27,373.400 | 22,797.376–34,245.775 | 327.124 | 3,966,484–4,002,785 | 94.290 |

Living populations are **100 / 250 / 500 elapsed years**. Each species starts with eight canonical founders.

| Species | Seed 0 | Seed 424242 | Seed 20260919 |
|---|---:|---:|---:|
| human | 131 / 132 / 110 | 129 / 112 / 123 | 124 / 131 / 140 |
| elf | 13 / 29 / 70 | 12 / 25 / 66 | 14 / 38 / 85 |
| dwarf | 25 / 112 / 106 | 28 / 109 / 155 | 34 / 117 / 116 |
| halfling | 116 / 122 / 148 | 95 / 135 / 143 | 101 / 133 / 144 |
| gnome | 20 / 72 / 132 | 18 / 58 / 104 | 22 / 54 / 111 |
| dragonborn | 127 / 113 / 125 | 126 / 120 / 116 | 129 / 121 / 123 |
| half-elf | 64 / 152 / 145 | 81 / 135 / 126 | 61 / 132 / 118 |
| half-orc | 150 / 139 / 137 | 141 / 140 / 129 | 164 / 147 / 154 |
| tiefling | 115 / 113 / 107 | 108 / 109 / 101 | 81 / 104 / 102 |

Each canonical species has one site. Its capacity stays constant, while active fertile partnership counts below are **250 / 500 elapsed years** and match between repeats. The minimum across species at those two checkpoints is 9 / 18 for seed 0, 10 / 20 for seed 424242, and 10 / 28 for seed 20260919. A positive partnership count establishes the measured checkpoint's reproductive eligibility; it does not predict future births or survival.

| Species | Seed 0 capacity | Seed 0 fertile couples | Seed 424242 capacity | Seed 424242 fertile couples | Seed 20260919 capacity | Seed 20260919 fertile couples |
|---|---:|---:|---:|---:|---:|---:|
| human | 160 | 30 / 18 | 156 | 22 / 31 | 169 | 29 / 31 |
| elf | 181 | 9 / 24 | 170 | 10 / 20 | 161 | 10 / 28 |
| dwarf | 144 | 31 / 29 | 170 | 32 / 53 | 140 | 42 / 38 |
| halfling | 169 | 36 / 43 | 170 | 34 / 42 | 171 | 38 / 40 |
| gnome | 166 | 19 / 29 | 143 | 17 / 24 | 151 | 10 / 29 |
| dragonborn | 149 | 29 / 37 | 146 | 25 / 26 | 143 | 35 / 32 |
| half-elf | 179 | 52 / 42 | 170 | 35 / 31 | 166 | 38 / 35 |
| half-orc | 165 | 41 / 32 | 166 | 36 / 30 | 181 | 28 / 39 |
| tiefling | 132 | 30 / 25 | 143 | 23 / 20 | 131 | 28 / 28 |

The following state/event SHA-256 pairs are identical across both repeats. Elapsed horizons 100/250/500 correspond to engine years 101/251/501.

| Seed | Elapsed years | State SHA-256 | Events SHA-256 |
|---|---:|---|---|
| 0 | 100 | `78edbb1309150456d105cf7d873965341596ae87724e3bb6d2f260d8e0ec3020` | `518a9eed889b965325023e541396c893d0386ae74ae00b538325e4afef653ef5` |
| 0 | 250 | `3aac8f703fd24a17927e38dc9614ef259f4ada63ed007871dd44dcb0bd2c3a0e` | `2d080f0a7ac72268818944c9917637052077851176daca7b9a2fb6968721ef03` |
| 0 | 500 | `8e480092290630c211aea77ca5b7f585197aed6650872c308d85a2b38f29dc3b` | `b2e6473d61318ae5af128cbb0423f3ab98ae873ab06408e19b49d5f6e51a6fc2` |
| 424242 | 100 | `987fa8b0a97a5a997b2e24198156a207b08027c89a5461dc614c56cade71af0f` | `f33879b72397f49a131837ca6e51aebb4090e30e961b239c73c7e79580af933d` |
| 424242 | 250 | `188a42fa8e20f58885c0715998ae90df468e0b46dd1e002c3fd0c80db5f6537d` | `b3348727358b30d79594b5bb51ea294510b483b84e5dd7ecbe87ac3d1294348b` |
| 424242 | 500 | `88cc27090dbe2fa5913d6217c27db55adf38c608fcc17a99c352419b1156ab03` | `a1950a9194bfdff91c2cdd26ea8280af59b158708bb40731b3507d121053c470` |
| 20260919 | 100 | `dbd76996b6ea603265a1a1544ce80035dc366ae826acd1caeb26a94e21a74a30` | `7206745bb5d08a0d3f6d93b18131007983c943a6787b1525c8a3ad1a6a260027` |
| 20260919 | 250 | `2a9fcc6e2de379f5a310af5ce459b8181fd991a7d81eaae1330c2edf4e2b2744` | `120534fb17cf5712b7df6193705043524cc2d2798324e5227e69f4f9b135997d` |
| 20260919 | 500 | `caebed5f5c849d5b614766f6c121ce5bbbbc0fd5f53c390120dcb7c89bae76dd` | `a8bcf9a7e691d342e072f074bd3ecf4e41f761ec36e0fe63ee5a9f761d6dbc9a` |

### 12. Save and full-process restart

All three full-process restart comparisons **passed**. The benchmark retained a 100-year JSON checkpoint after its originating child exited, started a different Node process, reloaded the checkpoint, advanced 150 years, and compared exact state text, event text, and their SHA-256 hashes against the continuous 250-year checkpoint. Both candidate-source and harness identities were checked. The resulting hashes equal the 250-year entries in field 11. This is a headless process restart, not RMMZ's native save/load path.

| Seed | Exited source PID | New resumed PID | Resumed worker process elapsed, seconds | Exact comparison |
|---|---:|---:|---:|---|
| 0 | 40680 | 36788 | 3.470 | PASS |
| 424242 | 40440 | 2972 | 3.431 | PASS |
| 20260919 | 32356 | 2144 | 3.442 | PASS |

### 13. Twenty-seed sweep

Seeds 1..20 all completed 250 elapsed years with no incomplete workers. Every species had **zero observed extinctions in twenty seeds**; the report's per-species extinction-seed arrays are empty. Total living population was **900 minimum, 980.5 median, and 1,029 maximum**. The largest annual site population was **187** and the slowest whole sweep trajectory was **2,301.056 ms**. These are sampled outcomes, not a guarantee for other seeds or later centuries; extinction-free sweep output is not an additional packet gate.

All counts below are living people at the 250-year checkpoint. The final column equals the sum of all nine species.

| Seed | human | elf | dwarf | halfling | gnome | dragonborn | half-elf | half-orc | tiefling | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 140 | 33 | 109 | 120 | 57 | 101 | 135 | 131 | 109 | 935 |
| 2 | 140 | 26 | 108 | 124 | 62 | 116 | 144 | 152 | 105 | 977 |
| 3 | 120 | 28 | 137 | 123 | 62 | 125 | 148 | 150 | 130 | 1023 |
| 4 | 145 | 25 | 107 | 139 | 54 | 133 | 150 | 130 | 101 | 984 |
| 5 | 142 | 32 | 129 | 128 | 53 | 107 | 136 | 151 | 107 | 985 |
| 6 | 144 | 21 | 120 | 128 | 66 | 133 | 151 | 143 | 111 | 1017 |
| 7 | 120 | 29 | 96 | 128 | 58 | 128 | 147 | 159 | 109 | 974 |
| 8 | 145 | 37 | 106 | 136 | 64 | 132 | 144 | 143 | 122 | 1029 |
| 9 | 121 | 32 | 135 | 138 | 44 | 118 | 143 | 145 | 109 | 985 |
| 10 | 120 | 34 | 117 | 140 | 81 | 133 | 146 | 129 | 114 | 1014 |
| 11 | 114 | 31 | 136 | 98 | 81 | 93 | 123 | 117 | 107 | 900 |
| 12 | 118 | 22 | 102 | 124 | 76 | 106 | 126 | 151 | 98 | 923 |
| 13 | 132 | 23 | 127 | 130 | 67 | 126 | 126 | 136 | 128 | 995 |
| 14 | 142 | 31 | 110 | 135 | 59 | 123 | 125 | 126 | 125 | 976 |
| 15 | 129 | 32 | 120 | 148 | 76 | 99 | 133 | 136 | 119 | 992 |
| 16 | 145 | 44 | 136 | 150 | 55 | 100 | 132 | 137 | 126 | 1025 |
| 17 | 133 | 19 | 118 | 136 | 35 | 114 | 122 | 133 | 129 | 939 |
| 18 | 105 | 34 | 118 | 137 | 66 | 115 | 150 | 126 | 111 | 962 |
| 19 | 126 | 26 | 117 | 146 | 72 | 109 | 145 | 112 | 119 | 972 |
| 20 | 152 | 35 | 130 | 127 | 52 | 99 | 129 | 128 | 120 | 972 |

### 14. Measurement limits and acceptance timing

Only unmodified `api.step` calls are included in annual simulation timing. Trajectory wall time includes setup, annual observations, checkpoint validation/serialization, and checkpoint pipe emission. Parent-measured process time additionally includes startup, frozen-source loading, and parsing. Default gates require positive populations at every annual census, active fertile partnerships at 250/500 years, fewer than 1,500 living members per species, less than 15 MiB per serialized checkpoint, and less than 30 seconds per trajectory. Exact repeat evidence is checked separately. The prior ASTRA08 two-worker 60-second budget is historical and is not an additional ASTRA10 packet gate.

Heap samples include ordinary garbage collection, temporary allocations, and retained evidence; they are not allocation counts, serialized-state sizes, or proof of leaks. Completed-death lifespan averages are not life expectancy: old-age deaths, other causes, founders, and censored living ages remain distinct. Three repeated seeds do not establish general equilibrium or population survival guarantees.

### 15. Classification and unresolved work

The independent production **contract verdict and final aggregate classification are FAIL**. All requested execution coverage completed, with three exact repeat comparisons, three full-process restart comparisons, and all twenty sweep seeds. Four canonical biology/state gates passed; both seed-0 timing trials failed. The four production contract defects belong to Gemini's implementation scope. The separate diagnostic migration mutation and the failed timing requirement also need coordinator review. No approval for activation, default-catalog adoption, or general production readiness follows from this verification.

### 16. Artifact, rollback, and non-activation boundary

The consolidated evidence path is `game/test_output/bench_species_biology.json`. This document's ASTRA08 and ASTRA07 sections are archived observations from their named commits; their statements about that same artifact path refer to those earlier sessions. The ASTRA08 verifier/harness state is recoverable from commit `8e17376`, rather than from the now-reused diagnostic output path.

Astra changed no production plugin or real save, so rolling back this verifier is limited to reverting its eventual task commit or restoring only its explicitly changed harness/documentation paths. Do not reset unrelated concurrent work. RMMZ editor Playtest, F8 console inspection, native save/load, and screenshots are not part of the observed headless evidence. The coordinator's referenced sixteen-point handoff list was not included in the supplied packet; the evidence organization above is disclosed rather than presented as a recovered specification.

## Archived ASTRA08 biological calibration experiment — 2026-09-23

This section preserves ASTRA08 evidence recorded at commit `8e17376`. Its references to the then-current harness and `bench_species_biology.json` describe that archived experiment. The current artifact is the independent ASTRA10 verification report described above.

**Task:** DEUS-TSK-ASTRA-08. **Tool:** `tools/bench_species_biology.js`, report schema version 2. This is a proposed caller-side experiment using production sources loaded from commit `931b993e60545b24bddaa71ab433ebac8e967eb8`. The engine SHA-256 remains `647592fc4a65b474f5f12835cee80a461d1f0c86ba847559b3ec835791471c2e`. Only the harness and task documentation change; production plugins, catalogs, New Game registration, and real saves remain read-only. The experiment does not implement production ecology or establish general demographic viability.

The CLI still accepts `--seed`, `--years 100|250|500`, `--runs 1..20`, `--json <path-under-game/test_output>`, `--selftest`, and the existing mutant names. Default coverage remains seeds 0, 424242, and 20260919, with two independent processes per seed and continuous checkpoints at 100/250/500 elapsed years. A one-repeat screening run reports repeat verification as `NOT RUN`; it does not replace the default two-repeat check. The worker timeout is now **60 seconds**, replacing ASTRA07's archived 30-minute limit. Reports retain verified checkpoint streaming, snapshot/harness identity checks, and explicit incomplete coverage on timeout.

### Candidate 2 inputs and annual schedule

All nine lifespan intervals and all biological inputs for elf and gnome remain unchanged from the ASTRA07 proposal. Candidate 2 retains Candidate 1's four short-lived-species changes and additionally widens dwarf, halfling, and half-elf reproduction. Current changed base profiles are:

| Species | Reproductive ages | Base annual birth chance | Birth spacing | Infant mortality | Disease / exposure mortality |
|---|---|---:|---:|---:|---:|
| human | 18–55 | 0.36 | 3 years | 0.004 | 0.0003 / 0.0003 |
| dwarf | 40–240 | 0.09 | 6 years | 0.006 | 0.0003 / 0.0003 |
| halfling | 20–110 | 0.20 | 4 years | 0.012 | 0.0008 / 0.0006 |
| dragonborn | 15–60 | 0.34 | 3 years | 0.004 | 0.0003 / 0.0003 |
| half-elf | 20–125 | 0.12 | 5 years | 0.01 | 0.0005 / 0.0005 |
| half-orc | 14–50 | 0.40 | 2 years | 0.004 | 0.0003 / 0.0003 |
| tiefling | 18–65 | 0.30 | 3 years | 0.004 | 0.0003 / 0.0003 |

Before each historical year, the harness reads the site's **starting** living population and supplies `birthChance = baseBirthChance * max(0.1, 1 - startPopulation / 160)`. It asserts exactly one site per species, so applying the rate through that species' state profile is unambiguous. After the public annual call, a `finally` block restores every base birth chance. Annual report curves retain site ID, starting population, capacity parameter, scale, and effective fertility. The scale is 1 at population 0, 0.5 at 80, and has a floor of 0.1 at 144 and above. Candidate 1 used 200; Candidate 2 chooses **160** to reduce persistent-record pressure. The task's 200–500 examples were treated as examples, not binding parameter bounds. This is a disclosed experimental choice, not an approved ecological constant. The parameter is a soft fertility input, not a hard population cap or a simulated food/housing carrying capacity; fertility never becomes zero solely because of density.

The timed call now uses the unchanged public `step(state)` plus this caller-side schedule, with one full production validation per year. ASTRA07 used `simulate(state, 1)`, which validates in both `simulate` and `step`; the changed API entry point must be considered when comparing timings. Setup, census, heap sampling, checkpoint verification, hashing, and IPC remain outside annual simulation timing. Whole-trajectory `wallMs` includes setup and observation work; parent-measured `processWallMs` additionally includes worker startup, source loading, IPC, and parsing. No validation, kinship rule, archive, or production loop is bypassed.

At checkpoints, one pass groups individuals by species and unpartnered fertile candidates by site and 10-year age bin for **diagnostics only**. The report adds fertile male/female counts, unpartnered fertile counts, age-bin counts, and active partnerships whose two members remain reproductively eligible. These indexes do not drive the engine's pairing decisions. Production pairing already searches the entire configured reproductive window; the experiment changes the listed static windows. Internal quadratic searches remain unchanged and read-only. The harness adds no settlers, resurrection, migration, or rescue births.

### Experiment gates and observed verification

| Gate | Required result for the selected coverage |
|---|---|
| `zeroExtinctions` | Every species has a positive living population at every recorded annual census. |
| `viableReproduction` | Every species has a living population and at least one active fertile partnership at each selected 250/500-year checkpoint; `NOT RUN` when no such checkpoint is selected. |
| `boundedPopulation` | Every species remains strictly below 1,500 living people at every recorded annual census. |
| `serializedState` | Every checkpoint's complete serialized state is strictly below 15 MiB. |
| `trajectoryBudget` | Every whole trajectory completes in strictly less than 30 seconds. |
| `seedBudget` | Summed parent-measured worker process elapsed time across all requested repeats of each seed is strictly below 60 seconds. |

Any failed gate produces a `FAIL` report and exit code 1. A `PASS` applies only to the selected coverage and these finite-seed experiment gates; `approvedForIntegration` remains false. The older greater-than-100-times-founders growth flag remains a diagnostic alongside the new explicit population bound. Lifespan cause separation, right-censoring, unique-seed aggregation, and sampled-heap limitations described in the archived methodology below still apply.

Observed by the task's root agent on 2026-09-23: **25 self-tests passed for each candidate**, including exact state/event equality between public `step` and `simulate` under the density schedule, a JSON round-trip after 50 years followed by continuation to 100, base-probability restoration, and rejection of ambiguous multiple-site scheduling. Deliberate extinction, zero-fertile-partnership, population-bound, state-size, and timing mutations were detected, alongside the existing randomness/profile/parentage and timeout controls. The root agent also observed the harness syntax check pass. These are headless checks; native RMMZ Playtest was not run for this measurement task.

Candidate 1's three-seed, one-repeat 500-year screening completed with **FAIL** in 96.292 seconds of reported total wall time. In seed order 0/424242/20260919, whole-trajectory times were 31.281/34.474/28.984 seconds, annual species-population maxima were 191/183/184, and final state sizes were 4,256,328/4,379,732/4,170,452 bytes. Population and state-size bounds passed, but the first two trajectory budgets failed. Half-elves became extinct for seed 20260919 and halflings for seed 424242. Seed 424242 retained three dwarves with no fertile partnership; seed 0 retained 16 half-elves with no fertile partnership. Thus both extinction and reproductive-viability gates failed even though the four initially adjusted species survived with 150–179 living members. These are screening findings; one repeat does not establish repeatability.

A separate CPU-profiled Candidate 1 seed-0 run attributed approximately 90% of sampled CPU time to validation and 1.3% to pairing; its 36.754-second wall time is profiling evidence, not an acceptance timing. A `compileFunction` experiment took approximately 2,192 ms for a 250-year trial versus 2,051 ms with the original invocation and was not adopted. Neither result authorizes modifying the frozen engine or bypassing its validation.

Candidate 2's three-seed, one-repeat 500-year screening completed with **FAIL**, solely on `trajectoryBudget`, in 89.723 seconds of reported total wall time. In seed order 0/424242/20260919, whole-trajectory times were 28.645/31.589/27.724 seconds and annual species-population maxima were 167/151/169. Final state sizes ranged from 4,033,764 to 4,066,082 bytes. All nine species remained alive and had active fertile partnerships at both 250 and 500 years in every screened seed. Extinction, reproductive viability, population, state-size, and one-repeat seed-budget gates passed; seed 424242 exceeded the 30-second trajectory limit. These finite-seed biological findings do not constitute overall acceptance or production profile approval.

The performance requirement survived both candidates, so **AGENTS.md rule 10 stopped further repairs**. The required default two-repeat matrix then ran with the unchanged Candidate 2 harness and completed with **PASS, exit code 0**, for all six gates. Both the failed Candidate 2 screen and the passing default run used harness SHA-256 `5d8554948d57134d0ca2155ab7a4fd29efcbc922959b14390e1d59c4130dc4af`; there was no intervening repair or further tuning. The default run supplies the required repeat evidence. Its success does not erase the earlier timing failure or establish a reliable performance margin on other runs or machines.

### Completed Candidate 2 default measurements

The inspected `game/test_output/bench_species_biology.json` contains **six completed trajectories and 18 checkpoints**, measured with Node v24.19.0 on an AMD Ryzen 7 8845HS. Reported total wall time was **169.630968 seconds**. Every species remained alive throughout all recorded annual censuses and had an active fertile partnership at each 250/500-year checkpoint in all three seeds. All three repeat checks passed exact state/event byte and annual-curve comparisons. Independent inspection of the saved report also confirmed identical hashes, state sizes, biological measurements, and curves between each seed's repeats.

All loaded production sources matched baseline commit `931b993e60545b24bddaa71ab433ebac8e967eb8`; the aggregate source SHA-256 was `180d6d7840083aa9cf501fbefa566e58cbd3afab360c6e8dda2d4309d9bedfbd`. The production engine hash remains the value at the top of this section. The saved report and the current harness bytes have the harness hash recorded above. Production source/catalog hashes were unchanged at run start and end; no production integration or catalog-profile approval follows from this experiment.

Each timing pair below is repeat 1 / repeat 2. The state size and living count are identical across repeats; the annual peak is the largest single-species living population across the full 500-year curve.

| Seed | Whole trajectory, seconds | Worker process elapsed, seconds | Sum of both workers, seconds | Annual species peak | Living at 500 | State bytes at 500 |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 25.893 / 29.121 | 26.342 / 29.500 | 55.841 | 167 | 1,086 | 4,033,764 |
| 424242 | 27.649 / 28.791 | 28.048 / 29.192 | 57.241 | 151 | 1,065 | 4,066,082 |
| 20260919 | 28.224 / 27.171 | 28.653 / 27.572 | 56.225 | 169 | 1,090 | 4,053,000 |

The slowest default trajectory left only **0.879 seconds** below the 30-second gate, and the largest two-worker total left **2.759 seconds** below the 60-second seed gate. The earlier same-harness screen exceeded the trajectory limit by 1.589 seconds. These observations support the recorded run's PASS while preserving the narrow and variable timing margin.

The following cumulative simulation measurements cover all six trials. Whole-trajectory and process costs above additionally include setup and reporting work; serialized state bytes and sampled heap are separate measures.

| Elapsed years | Mean simulation, ms | Simulation range, ms | Worst annual call, ms | State bytes, min–max | Maximum sampled heap delta |
|---|---:|---:|---:|---:|---:|
| 100 | 150.348 | 140.070–162.251 | 6.939 | 546,062–614,376 | 8.87 MiB |
| 250 | 1,898.056 | 1,768.892–1,968.646 | 32.951 | 1,829,225–1,865,608 | 31.97 MiB |
| 500 | 27,024.517 | 25,086.062–28,359.313 | 373.459 | 4,033,764–4,066,082 | 101.66 MiB |

Living populations below are **100 / 250 / 500 elapsed years** for each unique seed. Each species started with eight canonical founders. Repeated deterministic trials do not increase the biological sample beyond three seeds.

| Species | Seed 0 | Seed 424242 | Seed 20260919 |
|---|---:|---:|---:|
| human | 132 / 124 / 127 | 139 / 121 / 123 | 122 / 123 / 133 |
| elf | 13 / 30 / 64 | 12 / 20 / 50 | 13 / 28 / 49 |
| dwarf | 26 / 112 / 128 | 27 / 92 / 140 | 35 / 133 / 127 |
| halfling | 111 / 140 / 137 | 88 / 129 / 145 | 95 / 126 / 136 |
| gnome | 20 / 61 / 104 | 18 / 63 / 109 | 24 / 74 / 123 |
| dragonborn | 137 / 124 / 133 | 138 / 129 / 124 | 137 / 119 / 138 |
| half-elf | 58 / 122 / 140 | 73 / 132 / 119 | 52 / 129 / 122 |
| half-orc | 151 / 134 / 127 | 136 / 131 / 127 | 143 / 137 / 130 |
| tiefling | 122 / 136 / 126 | 131 / 132 / 128 | 100 / 137 / 132 |

Full checkpoint SHA-256 values are listed once per unique seed/horizon; both repeats have these exact hashes. The horizons are elapsed years, corresponding to engine years 101/251/501.

| Seed | Elapsed years | State SHA-256 | Events SHA-256 |
|---|---:|---|---|
| 0 | 100 | `89604f277e56df61db21d3c4c17cf6d71b7cde3c004d072f7fd9d7f300b47986` | `a0950b01b6a2e216a42a48551ae9ef1fddb055a28a9d8e5df3baf6f1a668c1a7` |
| 0 | 250 | `1afac30949f6ef94c53facca941c21b99da5b3a4360d24d4f1aca1e28aaf3ba3` | `1e08f5b645732cc8b9f7120dfe0a073e80816350ae65fd95f8c2e4fee58029c6` |
| 0 | 500 | `e25d4d8482cc8fd616f3e808a24fedccf11c4b89c7bd95a92be46ce7cce7fb56` | `e0c47f82b56255a631ec24db5e9ffe8b61dac37ae6186e6d2a3d97de8b3ee733` |
| 424242 | 100 | `6bd500b17e31b4befee845580721376e5f82d1420cd11920b101a703f9ae811a` | `3147726c61e0f78a57cd91c39f21e2ac6dac667131f765414d5ab72ee6325e3a` |
| 424242 | 250 | `bd0e1b5c6d67e5f13fcaedd3a3c77b68b1757c17b95622dc08180faf00d6e4c2` | `ce30da18b7ecf37ceef8043e88dbf5e94befe7c9b65925ee899ba83063bf96e4` |
| 424242 | 500 | `6f97047ad9d5e4d471c4363792cb1458a309b41fb2546b8fdc05d7dfd8d3e521` | `eb236ce4401717c58ac22ff90fce465901f6601d4b1468397e35f512b6d0745e` |
| 20260919 | 100 | `0bd8df6cd5036a876118c79bf7b7bfb8d37827ff5afb5ea5fc92df11db818702` | `2a595c488d99b8a3b26410db4858b0e244ea1ef6e86d3ec84a6d00f10dd273c0` |
| 20260919 | 250 | `fac559473923739462baf9fae360a0f569f25d4a6d5f97ab66ad4c2905561e17` | `c239eebf177d3b8e454e1aa376c8fe46490382d024a0cf194de358c745e09a5e` |
| 20260919 | 500 | `172dcb490f0abff23de8a2cea77a61dbdd326213c27e974b8db7c71ef0826e3e` | `b8c371f610a3256e08c3a9390721c01e4849bf47ab783b3dce420e951b98a70a` |

The observed default PASS completes this finite measurement matrix. The nine caller-supplied profiles remain proposals, `approvedForIntegration` remains false, and no general equilibrium, future extinction resistance, production ecology, or native-game performance claim is made.

## Archived ASTRA07 species biology measurement — 2026-09-23

The following section records the ASTRA07 harness settings and evidence archived in commit `931b993e60545b24bddaa71ab433ebac8e967eb8`. Its profile matrix, absent density schedule, `simulate(state, 1)` timing, 30-minute worker cap, and incomplete 500-year outcome are historical; ASTRA08's current experiment is described above.

**Task:** DEUS-TSK-ASTRA-07. **Tool:** `tools/bench_species_biology.js`. This headless harness evaluates the supplied nine-species profile proposal using the unchanged ASTRA06 demographic engine and canonical Year-1 bootstrap. The proposal is copied into the report's `proposedProfiles`; it is a measurement input, not approved catalog biology or an automatic New Game setting. Production plugins, catalogs, registration, and real saves remain read-only. The ASTRA06 implementation and its earlier evidence are documented below.

```text
node tools/bench_species_biology.js
node tools/bench_species_biology.js --seed 424242 --years 250 --runs 2 --json game/test_output/TEST_species_biology.json
node tools/bench_species_biology.js --selftest
```

`--seed <integer>` selects one seed; `--years 100|250|500` selects one horizon; `--runs 1..20` controls repeated trials. `--json <path>` selects a JSON file beneath `game/test_output/`; its default is `game/test_output/bench_species_biology.json`. It is a path argument, unlike ASTRA06's Boolean `--json` flag. `--selftest` runs assertion and negative-control checks; adding `--json <path>` writes that self-test report. `--mutant=unseeded|invalid_lifespan|inverted_fertility|corrupt_parentage` runs a deliberately invalid benchmark input or measurement in isolation. These controls do not rewrite production source or replace production methods.

The default matrix requests seeds **0, 424242, and 20260919**, each with **two fresh Node processes**, run sequentially. Every process advances one continuous trajectory with requested checkpoints after 100, 250, and 500 elapsed years: a completed matrix would contain **six trajectories and 18 snapshots**, not 18 independently restarted simulations. The engine dates at those checkpoints are 101, 251, and 501. Each worker has a **30-minute timeout**. Repeat trials compare exact state bytes, full event bytes, SHA-256 hashes, and annual population curves. Biological aggregates use one result per unique seed; repeated identical seeds do not increase the extinction sample size. With `--runs 1`, repeat verification is reported as `NOT RUN`.

| Report data | Meaning and limits |
|---|---|
| `runs[].curves`, checkpoint `species[].living`, `births`, and `archived` | Annual living counts and cumulative births/deaths, plus checkpoint totals. `summaries[].species[].populationsBySeed` retains the per-seed populations. |
| `lifespan.allCompleted`, `oldAge`, `founders`, `bornDuringRun`, `censoredLivingAges` | Count, minimum, maximum, mean, and population standard deviation for separate cohorts. Only `old_age` deaths must meet the profile's lower lifespan bound; earlier infant, disease, and exposure deaths are valid. All recorded deaths must remain below or at the upper bound. Living individuals are right-censored; founders entered alive at ages 18–40. Completed-death means are not life expectancy. Empty cohorts return null statistics. |
| `birthSpacing` and `replacement` | Gaps between a mother's recorded births, including across partnerships. Replacement summaries count daughters of non-founder females whose reproductive histories have ended through death or aging beyond their window, daughters reaching maturity, and still-censored daughters. These are descriptive cohort measurements, not a proof of replacement equilibrium or an estimated population reproduction number. |
| `extinct`, `firstExtinctionYear`, aggregate `extinctions` and `extinctionSampleFraction` | Observed zero-living outcomes and their first elapsed year. Fractions use unique seeds only; three seeds do not establish a general extinction probability. |
| `growth` | Living/founder ratio, trailing birth/death counts, and a trailing endpoint log-growth rate with doubling time when positive. Any observed population greater than **100 times its founder count** sets a diagnostic flag. This disclosed threshold neither limits simulation nor represents ecological carrying capacity; `carryingCapacity` is null and `capacityCheck` is `NOT CONFIGURED`. The rate is not a fitted exponential or a stability verdict. |
| `maxGeneration` and `rulers` | Genealogical depth, open reigns, accessions/successions, distinct ruling dynasties, and dynasty changes. Aggregate ruler counts sum the unique seed worlds. |
| `stateBytes`, `stateSha256`, `eventsSha256` | Serialized UTF-8 state size and reproducibility checksums at each checkpoint. `eventLimit` is 1,000,000, and a checkpoint fails if any event has been discarded, preserving full-stream comparison. |
| `timing`, `heap`, and `runtime` | Cumulative simulation time, mean/worst annual call, separate setup/observation/verification costs, process-heap samples, and machine/runtime context. Each timed call is the unmodified public `simulate(state, 1)`, including validation in both `simulate` and `step`. Census, heap sampling, serialization, hashing, verification, and IPC are outside simulation timing. Heap deltas include ordinary GC effects, temporary allocations, and retained prior checkpoint evidence; sampled peaks are not exact allocation peaks, serialized state sizes, or leak measurements. |

All executable dependency source, plugin registration input, and catalog data are loaded directly with `git show` from commit `a97f606fdc689961a33030131fe2dc2d6b14862c` into an in-memory snapshot. Working-tree production bytes are never executed or parsed as simulation inputs. Each worker checks the loaded snapshot's hashes, and the parent requires the worker's aggregate source digest to match its own. Working-tree hashes at the beginning and end are observational provenance only: concurrent edits are preserved and cannot change the frozen run. This follows the snapshot requirement in `ENGINE_RULES.md` when other agents are editing production files.

The task packet supplied engine SHA-256 `6fa731efc5b2ea13d339d2f2526e3c0352ef20092cb3e433f001ba1ee5405101`; the engine in the named commit instead has normalized SHA-256 `647592fc4a65b474f5f12835cee80a461d1f0c86ba847559b3ec835791471c2e`. The harness records both values, reports the packet mismatch, and executes the verified commit snapshot.

Observed on 2026-09-23: the final `--selftest` report passed **22 checks**, including rejection of changed snapshot bytes, mismatched worker harness hashes, and the intended failures for unseeded randomness, invalid lifespan bounds, inverted fertility, and corrupt parentage. A real child-process timeout control preserved its previously validated checkpoint and identified missing coverage. A separate in-memory harness control with a 1 ms worker cap exited 1 and wrote a `FAIL` JSON report; production code was unchanged. An earlier attempt stopped at its former working-file end guard after concurrent edits added two null guards to `DEUS_Levels.js`; the commit-snapshot implementation removed that dependency on changing working files.

The commit-snapshot default attempt before checkpoint streaming was added **failed with exit code 1**: seed 424242, repeat 1, exceeded the worker's 30-minute cap (`ETIMEDOUT`). Its last console progress report was at 400 elapsed years, with 46,235 person records and 2,120 living half-elves; this is a progress observation, not a completed 500-year result. Before that timeout, seed 0 completed two 500-year trajectories and their state/event/curve repeats matched exactly; that seed reported 69,927 person records and 25,451 living half-elves. The parent run took approximately 3,542 seconds of wall time, including completed trials and the timed-out worker, and stopped before seed 20260919. The driver used for this attempt emitted no final default artifact, so these observations do not provide the complete requested biological matrix or its final serialized-size report.

The final driver emits verified checkpoint frames as newline-delimited JSON before a worker finishes. On timeout, the parent writes a `FAIL` report containing `completedRuns`, `partialRun`, failure details, and coverage marked `MEASURED` or `NOT RUN`; interrupted repeat verification is `INCOMPLETE`. Checkpoint measurements and hashes are retained, while full state/event evidence strings are removed from the failure artifact. Missing checkpoints are not represented as zero populations. This recovery behavior is covered by the timeout controls; the revised driver has **not** rerun the full 500-year matrix.

The separate 100-year and 250-year matrices completed for all three seeds with two repeats each. Both reports passed integrity checks and exact state/event/curve repeat comparisons. Inspected artifacts are `game/test_output/bench_species_biology_100.json` and `game/test_output/bench_species_biology_250.json`, measured with Node v24.19.0 on an AMD Ryzen 7 8845HS:

| Elapsed years | Reported wall time, six trials | Mean simulation per trajectory | Worst annual call | Serialized state bytes, min–max | Maximum sampled heap delta |
|---|---:|---:|---:|---:|---:|
| 100 | 5.243 s | 105.692 ms | 3.566 ms | 157,987–244,741 | 7.76 MiB |
| 250 | 13.803 s | 1,504.096 ms | 56.303 ms | 589,315–1,735,144 | 31.09 MiB |

At 250 years, humans and half-orcs were extinct in 2/3 sampled seeds each; dragonborn and tieflings were extinct in 1/3 each. These are observed failures of an extinction-free proposal, despite passing simulation-integrity checks. The profiles remain unapproved.

The ASTRA07 `game/test_output/bench_species_biology.json` was explicitly an **`INCOMPLETE` session handoff**, assembled from the inspected shorter reports and the original timeout-console evidence. It was not an emitted, completed default-matrix report. The full three-seed 500-year matrix for those ASTRA07 settings remained incomplete; this historical outcome is not replaced by results from changed ASTRA08 inputs.

The harness's `PASS` means its integrity and requested repeatability checks passed; extinction or high-growth findings remain reported biological outcomes, not calibration approval. It supplies no migration, tactical wars, extra environmental shocks, density regulation, or automatic profile adjustment. The failed default attempt above is not a PASS for the full matrix. Native RMMZ Playtest is outside this measurement harness.

## Optional historical demographics v6 — 2026-09-23

**Task:** DEUS-TSK-ASTRA-06, HIST-01 plus minimum HIST-02. **Files:** `game/js/plugins/DEUS_HistoricalDemographics.js` and `tools/test_production_history_demographics.js`. The new module exposes `UF.HistoricalDemographics`; the existing `UF.History` API and canonical Year-1 campfire start remain separate.

The module is not registered in `game/js/plugins.js`. Loading it requires `UF.World.hash32` and `UF.World.mulberry32`, and adds no generation listeners, engine aliases, annual clock hooks, live units, terrain changes, or save hooks. `create` imports an existing canonical history v5 into a separate demographics v6 object without changing its source. A caller may explicitly attach the result at `world.history.demographics`; the module never attaches it automatically or replaces `world.history`.

The current canonical bootstrap used by the harness has nine factions, nine sites, and 72 founders: human, elf, halfling, half-elf, and half-orc at Z=0; dwarf and gnome at Z=-1; dragonborn and tiefling at Z=-2. Imported founder identities, ages, faction membership, and site coordinates are retained. The two-depth dwarf description dated 2026-09-19 below records an earlier founding implementation; it does not describe this current bootstrap. This task does not relocate or regenerate existing saved worlds.

### Required demographic inputs

`create` requires an explicit profile for every species present in the source factions. Each profile contains:

| Field | Contract |
|---|---|
| `lifespan` | Two positive integer ages `[minimumOldAge, maximumAge]`, in ascending order. Old-age hazard rises across this interval and reaches certainty at its upper bound. Other causes can kill younger people. |
| `reproductiveAge` | Inclusive positive integer age interval; births require both parents to be within their species' interval. Its upper bound must be below the maximum lifespan. |
| `birthChance` | Annual probability in `[0,1]` for an eligible partnership. |
| `birthSpacingYears` | Positive integer minimum interval between a mother's births, retained across remarriage. |
| `infantMortality`, `diseaseMortality`, `exposureMortality` | Explicit annual probabilities in `[0,1]`. |
| `names` | Optional species-specific syllable tables with nonempty `start`, `male`, and `female` string arrays. |

There are no biological fallback profiles in the plugin. The harness supplies nine **provisional proof profiles**, including unapproved reproductive windows and probabilities. They are test inputs only, not approved catalog biology or defaults for New Game. Global name tables come from `options.names` or the existing catalog's `start.names`; species name tables may override them. Missing required profiles or invalid tables are rejected.

### Public API

| Method | Behavior |
|---|---|
| `create(world, options)` | Returns a separate state after importing canonical `world.history.version === 5`, `startYear === 1`, and `years === 0`, together with faction/site/founder records and dimensions. `options.profiles` is required. Optional `names` supplies global syllable tables; `recentYears` defaults to 20; `eventLimit` defaults to 400; `dynastyInheritance` is `"maternal"` by default or explicitly `"paternal"`. Source data is not mutated. |
| `step(state, conditions = {})` | Validates state and annual conditions, then mutates and returns the same state after one historical year. No game-frame or tactical-time advancement occurs. |
| `simulate(state, years, options = {})` | Calls `step` for a nonnegative integer number of years and returns the same state. Accepts fixed `options.conditions` or `options.conditionsByYear`, not both. Year-indexed keys name the years being entered. Conditions are checked before the run; casualty IDs must already exist when supplied. The API's per-call limit is 10,000 years, but this milestone's verification scope stops at 250. |
| `validate(state)` | Returns `true` or throws on invalid schema, coordinates, census, genealogy, partnership intervals, birth spacing, ruler continuity, or event retention. This is validation, not repair or migration. |
| `kinshipRelated(state, personIdA, personIdB)` | Returns whether IDs are identical, share an immediate parent, or either person is an ancestor of the other. Rejects invalid IDs. Empty founder parent lists do not make unrelated founders siblings. |
| `summary(state)` | Validates and returns `currentYear`, `yearsSimulated`, `living`, `deceased`, `archived`, age `cohorts`, `settlementsActive`, `settlementsAbandoned`, `dynasties`, `activeRulers`, `eventsGenerated`, and `eventsRetained`. |

Caller-controlled attachment, after the caller supplies approved profiles and loads the module:

```javascript
const demographics = UF.HistoricalDemographics.create(world, {
    profiles: approvedProfiles,
    dynastyInheritance: "maternal"
});
world.history.demographics = demographics;
UF.HistoricalDemographics.simulate(demographics, 100);
// startYear: 1; yearsSimulated: 100; currentYear: 101
```

`step` accepts `{ casualtyIds: [personId, ...], siteRisks: { [siteId]: { disease?, exposure? } } }`. Casualty IDs must be unique, valid IDs; a known person who has already died is an idempotent no-op. A living casualty dies with cause `"violence"`. This is an explicit input from a future owning system, not a tactical war implementation. Site risks are probabilities added to the corresponding species hazard and clamped at 1. Unknown sites, IDs, condition keys, and out-of-range probabilities are rejected. The annual routine consumes these conditions; it does not persist a pending casualty queue.

### Persistent schema and annual rules

The state root has `version: 6`, `domain: "historical"`, `seed`, `startYear`, `currentYear`, `yearsSimulated`, world `dimensions`, copied `config`, and registries for `factions`, `sites`, `people`, `dynasties`, `rulers`, `partnerships`, and `events`. `nextEventId` and `eventsDiscarded` preserve event identity across bounded retention. A fresh state starts at year 1; 100 steps reach year 101 and 250 steps reach year 251. Age is derived from `currentYear - born`.

- People, sites, dynasties, partnerships, and ruler records use stable integer IDs. Imported faction IDs remain the source strings. `sourceSiteId` preserves the source-to-demographics site mapping. **`faction.activeRulerId` and `lastRulerId` point to ruler-record IDs**, whose `personId` identifies the individual.
- Sites retain area coordinates, local x/y, `z`, and inclusive `zRange` within -2 through +2. A source without `zRange` imports `[z, z]`. Only census, peak population, and abandonment metadata change; sites never expand, move, or become rendered ruins.
- People retain ordered `parents: [motherId, fatherId]`, or `[]` for founders; faction/site/species references; `born`, `died`, cause/detail; dynasty, generation, title, founder/ruler/pedigree flags; partnership link; and maternal birth-spacing history. Founder families establish dynasties. Births inherit the configured mother's or father's dynasty; the default is explicitly maternal.
- Partnerships are persistent, monogamous, same-site, same-species, and same-faction records. Kinship checks exclude siblings, half-siblings, and direct ancestral relationships. Co-located canonical founder-family pairs are imported in year 1 with `imported: true`, retaining their existing household bond even when a supplied species profile makes either partner too young to reproduce. A shared family ID across different sites does not establish a cross-site partnership. Newly formed partnerships use `imported: false` and require both partners to meet the reproductive window; all births, including those in imported households, require reproductive eligibility. A partnership ends only when a partner dies; surviving partners can subsequently form another eligible partnership. Closed intervals remain available for birth validation.
- Each year processes deaths first, closes affected partnerships, establishes eligible partnerships, creates births, resolves succession, updates site census/abandonment, and advances deceased-record tiers. Both parents must have been alive at birth: `died === null || died > child.born`. Consequently, a death in a year prevents reproduction in that year. Both parents must also meet the reproductive window at the child's birth.
- Mortality checks explicit casualties, infant risk, disease, exposure, then increasing old-age hazard. The first annual assessment after a birth applies infant risk at age 1. Infant deaths use `causeOfDeath: "disease"` with `deathDetail: "infant"`; other supported causes are `"old_age"`, `"exposure"`, and `"violence"`.
- Succession retains the current living ruler. On death, it closes the reign in that year, prefers direct living children, then other living descendants, and otherwise chooses the oldest living faction member. Age and then ID resolve ties within each preference group. A minority ruler is valid and recorded with `isMinor`, defined by age below the profile's minimum reproductive age; no regent simulation is implemented. Ruler validation checks that the individual was alive at accession. Each non-extinct faction has exactly one open reign; an extinct faction has none and its `activeRulerId` is `null`. Existing dynasty identities and ancestry remain intact through succession.
- Living people use tier `"living"`; deaths enter `"recent"` and become `"historic"` after `recentYears`. These archived records remain complete and retain pedigree anchors. `"compressed"` is reserved for a future schema/compression step: it is neither emitted nor accepted as a complete v6 person by this implementation. No deep-history lossy compression is present.

All returned state is JSON-safe data. Deterministic choices use the existing World's seeded helpers, keyed by year, record ID, and operation; there is no alternate random generator or live object reference to restore. The module emits no `UF.Events` notifications and listens to none. Its bounded chronicle records founding, household formation, birth, death, ruler/succession, and abandonment events inside the returned state. Event text retention does not remove parentage or ruler records.

### Verification and limits

The headless harness loads actual World, WorldGen, Factions, History, and Levels sources and their catalog to construct the canonical founding input, then loads the optional module separately. It checks that module loading and import preserve the source world, that site geometry remains fixed, and that the result survives JSON round-trip and resumed simulation.

Observed by the task's root agent on 2026-09-23: `node tools/test_production_history_demographics.js --selftest` passed **33 checks**. Negative controls `--mutant=dead_reproduce`, `--mutant=skip_succession`, `--mutant=corrupt_parents`, and `--mutant=uniform_lifespan` each failed their intended invariant with exit code 1. Coverage includes kinship/monogamy, imported households before maturity, temporal parent survival, disease/exposure/infant mortality, child-ruler and extinction cases, direct-child succession despite unequal genealogy depth, malformed annual inputs, integer foreign keys, site/Z locality, repeated 100-year output, and continuous 250-year output compared with a 100-year run resumed for another 150 years after JSON reload. A separate in-memory restoration of the old generation-depth heir ordering failed the direct-child regression with exit code 1.

The harness accepts `--selftest`, `--years 1..250`, `--seed 0..2147483647`, `--runs 1..20`, `--json`, and the four mutant names. Its default matrix completed 100 and 250 years for seeds 0, 424242, and 20260919, with two runs per combination: all 12 trials passed, including byte-identical state/event repeats and population/name/event seed variance. Final wall time was 7.111 seconds; mean simulation totals were 44.901–60.922 ms for 100 years and 389.361–568.485 ms for 250 years, with a 9.334 ms worst year. Matrix measurements are written to `game/test_output/bench_production_history.json`. Timings include each production `step` call's validation cost; setup, sampling, and final verification are separate. Reported heap measurements are sampled annual process high-water deltas affected by ordinary GC and temporary allocations, not exact allocation peaks or save sizes. Serialized UTF-8 state size and SHA-256 checksums are separate outputs. Short custom horizons do not require a birth and death to occur; the required 100/250-year proof and dedicated fixtures check those behaviors.

This is a headless demographic proof. NW.js rendering, native RMMZ F5 Playtest, and F8 console checks were not performed for this module. Integration/automatic attachment, approved biological catalog profiles, migration between settlements, expansion/path traversal, tactical wars, live settlement AI, ruins placement, and deep-history compression remain outside this milestone.

## Two-depth dwarf founding — 2026-09-19

New year-1 histories use **version 5**. A dwarf faction starts at **two sites of the same faction**, one at −1 and one at −2, using the natural pockets already selected by Factions. Its existing configured founder count is split, not duplicated: with the default four men/four women, each camp gets two men and two women. Other factions retain their single Ground camp and eight-person ring. Odd configured gender counts put the extra member at the primary −1 site. Names and culture remain catalog-generated; old saved sites/founders are not moved, renamed or regenerated.

Public/save additions (the old primary fields remain for compatibility):

- Each site has `z`; omitted legacy `z` means Ground. `faction.sites` contains both IDs; `faction.home` is the primary −1 site.
- `history.founders[id] = {site, sites:[siteId,...], plan, units, camp, camps}`. `site`/`camp` are primary aliases. Every plan and spawn record has its own `site` and `z`; each camp record is `{site,area:{x,y},x,y,z,fire,cleared}`.
- Each founder has `unit.z`, `data.site` (existing site-ID field), and `data.home = {area:{x,y},x,y,z}`. One ruler still leads the whole faction, and total faction population remains the configured founder count.
- Campfire writes, ring object clears, overflow occupancy reservations and unit spawns use the site's level. Matching x/y at different depths are independent. `spawnPeople` continues to run for every site, independent of the viewed map.
- `sitesIn(ax,ay,z=0)` returns only that level. `siteAt(x,y,area?)` and `describeSite` use `area.z` when explicit, otherwise the current `World.viewLevel()`; an explicit legacy `{x,y}` remains Ground.
- `campCell(state,faction)` returns the selected pocket centre for an underground faction; surface search behavior is unchanged.
- `addEvent({...,area,x,y,z})` retains z (falls back to `area.z`, then 0); founding events include their site location. There is one founding event per settlement.
- `viewStart={area:{x,y},x,y,z}` and `homeSite()` refer only to the primary player home. A dwarf player's secondary −2 camp is not a second protected home.

Checks: the existing history suite now uses level-specific maps, spawn records and first-frame captures, and accepts partial dwarf camp rings. New `dwarf_two_level_start` asserts guaranteed dwarf presence, exact configured population, two-site membership, balanced per-depth genders and matching unit/home levels. Surface-site checks exclude the underground sites. Existing saved histories still round-trip without relocation.

Evidence: real Factions/History sources passed a controlled Node VM survey of 24 seeds (10 dwarf-player worlds; 4 multiple-dwarf worlds), checking configured faction/population counts, split genders, campfire writes, queries, view and JSON save data. A deliberately dropped founder z was rejected by the level assertion. The VM uses terrain/pocket/World doubles, not renderer evidence; editor Playtest and full snapshot checks are handled by integration. The older single-camp/version-4 descriptions below remain historical background and are superseded by this section.

The world's chronicle and its first year. **No history** (user decision 2026-09-19, VISION V4 and V31 revised, V54 retired: "Lets do no history, just start by dropping 2 males and 2 females into each faction area"; the same afternoon: "Campfire in the middle, surrounded by 8 peasants", drawn as PPP / PFP / PPP): on every New Game, after UF_Factions has rolled the factions and placed each one's area, this plugin writes year 1: a bare camp record per faction on its camp cell (the area centre, or the nearest cell whose 3 × 3 block is all land), a lit campfire on that cell, eight founders per faction (four men and four women, adults, with rolled d20 scores, a leader and the others under it) on the eight cells around the fire exactly as the user drew it on 2026-09-19 (P a peasant, F the fire: `PPP` / `PFP` / `PPP`), and one "Year 1" line per faction in the chronicle. The player's eight become the colonists (UF_Colonists). In play, other plugins add lines with `UF.History.addEvent`. The older generator (500–600 simulated years of sites, wars and ruins, then the settling run on the map) stays in the file, switched off by the catalog.
Status: built 2026-09-18 (rewrite of Gemini's draft of the same day), settling run, stats and ranks added 2026-09-18 night, **year-1 start added and the older generator switched off 2026-09-19**, **the campfire start (PPP / PFP / PPP, eight founders) 2026-09-19 afternoon**; checks: `history` (16 checks, all PASS on snapshot copies 2026-09-19; see Checks).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_History.js` · **Load order:** after `UF_World`, `UF_WorldGen`, `UF_Factions`; before `UF_Objects`, `UF_Items`, `UF_Wildlife`, `UF_Colonists`, `UF_Test` (WORLD_ARCHITECTURE §5). Contract: `docs/design/WORLD_ARCHITECTURE.md` §2.6, §2.7, §2.10, §3.7, §5.8 (revised 2026-09-19).

## API (`UF.History`)
- `generate(state, opts?)` → `state.history`, or `null` without a catalog or factions. With `history.simulate` false (the catalog since 2026-09-19): **year 1** (below). With `history.simulate` true or `opts.simulate === true`: the older generator (`simulate`, then the settling run for `history.settleYears` years, `opts.years` overriding, `opts.settle === false` skipping it). Deterministic from `state.seed`; swaps a synthetic state into `UF.World.state` for the call. Emits `history:generated`. Doesn't spawn people.
- `spawnPeople(state)` → the units added (live world only). Year 1: the founders (below). The older generator: people at every living site (`spawnSettled`, below).
- `addEvent({ type, text, factions?, site?, area?, x?, y? })` → the event, or `null` without a history or text. The event gets `year = currentYear()` and `clock = { day, month, year }` (the game clock as numbers), goes at the end of `history.events` (the newest `history.eventsKept` are kept, never a year-1 founding), and `history:event(event)` is emitted. UF_Doors already calls it (`door_broken`).
- `currentYear()` → the chronicle's year now: 1 at New Game, then one more per year of the game clock since (`$ufTime.year − history.clockYear0 + 1`); an older save: its `years`.
- `events({ faction?, type?, site?, since? })` → matching events, oldest first. Year-1 type: `founding`; play events: whatever their plugin names them.
- `homeSite()` → the player's camp (the site with `protected: true`), or `null`. UF_Colonists reads it for the colony's site.
- `sitesIn(ax, ay)` → `[{ ...site, radius, pieces }]` for the area. A year-1 camp (`bare: true`) has **no pieces**; UF_WorldGen then only keeps its disc (radius + 1) free of plants. Sites of an older save still get their layout (`pieces(site)`).
- `sites()`, `siteById(id)`, `siteAt(x, y, area?)`, `describeSite(x, y, area?)` → the look label: `"Peldunok, your home camp of The Ostwyn League (settled in year 1)"`, `"Ostum, the camp of The Pelirwyn Warren (settled in year 1)"`; an older save's sites as before.
- `describeUnit(unit)` → `"Liaon, adult, leader of Ostum, age 28"`, `"Dora, adult of Zannoreth, age 30"`.
- `summary()` → per faction, the player's first: `{ id, name, species, population, isPlayer, people (person and colonist units now), sites, ruins, wars, ruler: { name (the unit's current name), title, since } }`.
- `rollStats(seed, unitId, species, stage)` → `{ str, dex, con, int, wis, cha }`: 4d6 drop the lowest per score from `mulberry32(hash32(seed, unitId, 0x57a7))` (the "stats" salt), plus `catalog.people[species].stats` and the stage shift (baby/child −2 str and con; elder −1 str, dex, con), clamped to 3–18 (VISION V53). `stageOf(age)`.
- `campCell(state?, faction | factionId)` → `{ x, y, moved }`: the faction's camp cell (pure, terrain only): the cell nearest its area centre (Euclidean, ties north then west) whose whole 3 × 3 block is walkable land by `UF.WorldGen.cellInfo` (no water, no peak rock, no ground kind with `passable: false`) and not on the map edge; `moved` = cells from the centre (0 on every seed run so far: UF_Factions keeps a walkable disc of 5 there). `null` if the area has no such block.
- `RING` (the eight offsets clockwise from north), `faceFire(dx, dy)` → the RMMZ facing toward the fire from that offset (top row 2, bottom row 8, west 6, east 4).
- `startCapture` (test runs with the `history` suite only): what the first map frame held, see Checks.
- `foundersConfig()` (`catalog.factions.founders` with defaults, 4 and 4 since 2026-09-19 afternoon), `config()` (`catalog.history`), `sitesConfig()` (`catalog.sites`), `current()`, `factionName(id)`, `lastRun` (`{ ms, years, factions, sites, events }`), `lastSettle`.
- `settle(state, years?)` → re-runs the settling run on a state that already has an older-generator history (kept for tests and tools).
- `toggleChronicle()`, `nextChroniclePage()`, `chronicleWindow()`, `ChronicleWindow` (`page`, `pageCount()`, `setPage(n)`, `nextPage()`).

## Year 1 (`generate` with `history.simulate` false)
For every faction, the player's first (its camp is site 1):
- **Camp record** on the faction's camp cell (`campCell`: `faction.home`, placed by UF_Factions, `docs/systems/UF_Factions.md`, unless its 3 × 3 block isn't all land): `{ id, faction, kind: sites.founding.kind ("camp"), bare: true, area, x, y, radius (the kind's radius, 4), founded: 1, pop: 8, ruined: null, name }`, the player's with `protected: true`. The name is generated from `catalog.factions.names` syllables. UF_Colonists needs a site record for the colony (it reads `homeSite()`, `siteById`, the kind's radius for its plan cells), which is why every faction gets one; nothing is stamped for it (the campfire is written when the founders spawn, below).
- **Founders plan** (`history.founders[factionId] = { site, plan: [{ name, gender, age, leader, title? }], units: [] }`): `factions.founders.male` men and `female` women (4 and 4) in a seeded order (`hash32(seed, 0xf0d5, factionIndex)`), ages within `founders.age` (18–40), one of them the leader with a title from `founders.titles` (Chief, Warden, Speaker, Reeve). Names from `people[species].names` when a species has its own table (none does yet), else `start.names` (start syllable, sometimes a second, then a male or female ending); unique in the world.
- **Rulers**: `history.rulers[factionId] = [{ name, title, from: 1, to: null, unitId }]`, the leader only.
- **Chronicle**: `{ year: 1, type: "founding", factions: [id], site, text: "Eight humans of The Ostwyn League settled by Peldunok." }` (the species' plural name from `factions.species[].name`, lower case).
- `history = { version: 4, simulated: false, years: 0, startYear: 1, clockYear0 ($ufTime.year at New Game, live world only), events, sites, rulers, wars: [], homeSiteId, founders }`; `state.viewStart` = the player's camp.

**The campfire** (`spawnPeople` → `placeCamps`, on `world:created`, live world only): for every camp, any object on the eight cells around the camp cell is removed and the campfire (`sites.kinds[founding.kind].center`, "campfire") is put on the camp cell through `UF.Objects.setIn`, the way built objects are placed (an object diff, saved with the world; `UF.World.setObject` when UF_Objects isn't loaded). The generator already keeps the camp's disc (radius + 1) free of plants, so in practice nothing is removed. **Lit:** the catalog's campfire has no unlit state and no lit variant; it is always burning: UF_Fire's rule for tag `fire` is a contained source that never burns out (it can only light a flammable 4-neighbour, `escapeChance` 0.0005 per beat, and the eight cells around it are bare), and the ambient flame follows the same tag. `history.founders[id].camp = { x, y, fire: "campfire", cleared }`.

**Spawning the founders** (`spawnPeople` → `spawnFounders`): the layout the user drew, P a peasant, F the fire, north at the top:
```
PPP
PFP
PPP
```
One founder on each of the eight cells around the fire (`RING`, clockwise from north), men and women alternating round the ring from a seeded first cell (`hash32(seed, 0x7f1e, factionIndex)`; with 4 and 4 the ring always reads m f m f m f m f), men and women taken in the plan's order, each facing the fire with the nearest facing the engine has (`faceFire`: the top row faces down, the bottom row up, the west cell right, the east cell left; 8-way facing is queued, VISION V3). Founders beyond eight (another catalog count) would take the nearest free land cells within `founders.reach` (3). Plain folk in the plainest clothes: humans get the clothing tier-0 sheet of their gender (`start.pair[gender].tiers[0]`, the sheet UF_Colonists starts its colonists on); other species keep `people[species].images` round-robin with their tint (the catalog has no clothing tiers for them). Each founder is a unit `{ name, image, area, x, y, dir (facing the fire), snapToFree: 3 }` with `data = { kind: "person", faction, species, ai: "wander", home: the centre, wander: radius + 2, site, founder: true, born: 1 − age, age, stage: "adult", gender, rank: 1 for the leader / 0, superior: the leader's id / null, title (leader), tint? }`, then `data.stats = rollStats(seed, unit id, species, stage)`. `history.founders[id].units` records `{ id, x, y, dir, ring (index into RING, −1 off the ring), gender, within }` at spawn; the leader's id goes into `rulers[id][0].unitId`.

**The player's eight and UF_Colonists' gender roll.** UF_Colonists converts every person of the player's faction within its camp's radius + 2 into a colonist, and gives each a gender of its own (`UF.Colonists.genderFor(seed, unitId)`) and a name to match. So that the colony stays four men and four women and the ring keeps alternating, `spawnFounders` hands the player's founders the unit ids whose rolled gender matches their own and lets the other factions' founders take the ids in between (ids are only given out in spawn order). The fix belongs in UF_Colonists (keep `data.gender` when it is set; requested in the 2026-09-19 report); until then this keeps V4 true. Without UF_Colonists the order is plain.

## State it saves
- `UF.World.state.history` (above; about 6 KB for 7 factions). Saves made before 2026-09-19 keep `version: 3` with `years`, `sites` (stamped layouts), `wars`, `rulers`, `settled`; everything reads both.
- The campfires: object diffs in `UF.World.state.objectDiffs` (UF_World), one per camp.
- Person units (founders) in `UF.World.state.units` with the `data` above. UF_Colonists keeps `rank`, `superior`, `stats`, `age`, `stage` on the colonists and replaces `name`, `gender` (same gender, see above), `kind`, `ai`, `home`.
- `UF.World.state.viewStart`, and in `UF.World.state.factions` the factions' `population` (the founders' count).
- The older generator also writes `objectDiffs`, `regrow`, `items` through the settling run (below); year 1 writes none (the campfires are UF_Objects diffs, not settling diffs).

## Catalog fields it reads
**`history.simulate`** (false) and **`history.settleYears`** (0) switch the older generator off; `history.eventsKept`; **`factions.founders`** (`male`, `female`, `age`, `reach`, `titles`); **`sites.founding`** (`kind`, `stamp: false`) and `sites.kinds[kind].radius` and `.center` (the campfire); `groundKinds[].passable` (the camp cell); `start.pair[].tiers[0]` (the human founders' sheets); `factions.names` (place names); `factions.species[].name`; `start.names` / `people[species].names`; `people[species].images`, `tint`, `stats`. The older generator: `history.years`, `startingPopulation`, `growthPerYear`, `populationCap`, `siteFoundEvery`, `maxSitesPerFaction`, `warChancePerYear`, `warLength`, `sackChance`, `peaceChancePerYear`, `allianceChancePerYear`, `tradeChancePerYear`, `plagueChancePerYear`, `beastChancePerYear`, `rulerReign`, `relationDrift`, `titles`, `history.settle` (its tunables), `sites.kinds`, `bySpecies`, `preferredBiomes`, `growth`, `minDistanceFromStart`, `peoplePerSite`, `cultures[species]`, `start.kit`, `objects`.

## Events (UF.Events)
- Emits `history:generated(history)` at the end of `generate`; `history:event(event)` from `addEvent`.
- Listens `world:created(state)` (registered at load, after UF_Factions' listener): `generate(state)`, `spawnPeople(state)`, then one console line: `UF_History: year 1, 7 factions settled (areas placed in 66 ms), 7 campfires lit, 56 founders (28 men, 28 women), 0 outside their area's reach` (the older generator: its settling summary as before).

## Keys and mouse
- **H** (`Input.keyMapper[72] = "ufChronicle"`) toggles the chronicle on page 1; **Tab** turns the pages while it is open. A year-1 world has two pages: **1 Chronicle, year N**: one row per faction, the player's first (`yours · humans · 8 people at Peldunok · led by Chief Zorette`), then "What happened": the Year 1 lines first and then the newest play events that fit (`Year N` + one sentence). **2 The founders**: per faction, its founders alive now, the leader first (`Zorette (woman, 28, Chief), Dorar (man, 29), …`). An older save keeps its three pages (overview, the last settling years, the sites now). The chronicle names every faction, met or not.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `catalog.people[species].images` with `tint` | The founders of non-human species (person units); the player's become colonists | catalog entries (the stock-art swap of 2026-09-19 is changing them; their status is in `docs/ASSET_INVENTORY.md`) |
| `catalog.start.pair[].tiers[0]` (`$UF_Stock_People1_4`, `$UF_Stock_People1_5` on 2026-09-19) | Human founders by gender: the plainest clothes | catalog entries, the colonists' tier 0 |
| `catalog.objects` campfire (`!$UF_Campfire`) | The campfire on every camp cell | UF_Objects' asset (`docs/ASSET_INVENTORY.md`) |
| none drawn by this plugin | The chronicle window uses the window skin | – |
| (older generator) `sites.kinds` pieces, `cultures[*].wall`, stockpile items | Stamped and settled sites of older saves | catalog entries |

## Checks (suite `history`, default)
| Check | FAILs when |
|---|---|
| `generated_with_world` | No `history`, it isn't version 4, or it has no founders record |
| `player_faction` | The player's faction or its camp is missing; the camp isn't bare, protected, of the player's faction, on the faction's camp cell (`campCell`), within `factions.areas.playerReach` of (128,128); `homeSiteId` isn't it; `state.viewStart` or the RMMZ player (the view) isn't on it; or seeds +1, +2 (synthetic) have no home at the centre |
| `no_years` | The catalog flags aren't off (`simulate` false, `settleYears` 0); or for this seed, +1 or +2: years ≠ 0, a settling record, a year-0/1 event that isn't a year-1 founding, an event of a simulated type (growth, succession, plague, beast, war, peace, war_end, sack, alliance, trade, settle_*), a faction without exactly one founding line matching "<Word> <species> of <faction> settled by <camp>.", without exactly one bare unruined year-1 camp, or without exactly one ruler; a lair, a ruin or a war |
| `founders` | A faction without exactly `male` men and `female` women (counted on the live units, after UF_Colonists' conversion); a founder missing, of the wrong faction, species or kind (the player's must be colonists when UF_Colonists is loaded, the others persons), unnamed, outside the age range, not `adult`, or with `born + age ≠ 1`; a spawn cell more than `reach` from the centre, shared, or (in a pristine build of the area: no diffs, no units) water, a peak or holding a blocking object |
| `campfire_start` (2026-09-19 afternoon) | The catalog's founders aren't eight; for any faction: its camp isn't on `campCell` recomputed, is on the map edge, or one of its nine cells is water or a peak in a pristine build; the live object grid doesn't hold the campfire on the centre cell (or `founders.camp.fire` isn't it) or holds any object on the other eight; the spawn records don't put exactly one founder on each of the eight cells, men and women don't alternate round the ring, the counts aren't `male`/`female`, or a founder wasn't facing the fire; the start capture didn't finish or missed a camp of this area; at the first map frame (the capture) a ring cell didn't hold exactly one unit, that faction's founder, facing the fire (the direction of its event on screen), or the centre held anything but the fire; the campfire isn't tagged `fire` with UF_Fire's contained-source rule (lit) |
| `stats_and_ranks` | A founder's six scores aren't integers in 3–18 or aren't exactly `rollStats(seed, id, species, stage)`; a faction without exactly one rank-1 founder, or the chronicle's ruler record doesn't name that unit; another founder not rank 0 under the leader |
| `nothing_built` | A camp has pieces, or a pristine build of an area with a camp holds any object tagged `building` or `ruin` |
| `deterministic` | A synthetic regeneration of the seed gives another year 1 (camps, founding lines, rulers, founders' plans) or other areas than the live world, or the next seed gives the same year 1 |
| `saved` | A `JsonEx` round-trip of the world state changes the history |
| `chronicle_opens` | H doesn't open it on page 1 of 2, Tab doesn't turn to page 2 and back, or a second H doesn't close it (screenshots `history.chronicle.png`, `history.chronicle_founders.png`) |
| `describe_site` | Another faction's camp cell isn't described with its name and "the camp of", the home's without its name and "your home", or a cell outside every camp gets a description |
| `add_event` | `addEvent` doesn't return an event with the current year (≥ 1), doesn't put it last, `events({ type })` doesn't find it, `history:event` isn't heard, or an event without text is accepted (the test event is removed again) |
| `no_banned_words` | An event text, camp name, founder name or founder description contains a reference-game or product-identity word (`avatar`, `britannia`, `guardian`, `lord british`, `iolo`, `dupre`, `shamino`, `fellowship`, `moongate`, `urist`, `armok`, `strange mood`, `fey mood`, `dwarf fortress`, `ultima`, `beholder`, `mind flayer`, `illithid`, `displacer beast`, `githyanki`) |
| `settle_off` | The catalog flags aren't off, `History.settle` is gone, the live history has a settling record, or a synthetic New Game writes object diffs or a settling record |
| `legacy_switchable` | Switched on (`opts.simulate`, 2 settling years) on a synthetic state, the older generator doesn't give years within `history.years`, a site for every faction, 50 events and a 2-year settling record |
| `no_errors` | Any uncaught error during the suite |

**The start capture** (test runs only, when the `history` suite is selected): the colonists start working and the other bands wandering on the first map updates, so by the time any suite runs the ring has broken up. At the first map start the world is paused (`UF.Time.pause()`, what the player's Space does); once the images are ready and the fade-in is over (at most 25 frames), every camp's nine cells in the area on screen are recorded (units, the facing of their events, objects), the player's camp is shot at zoom 1 and ⅔ and another faction's camp at ⅔, and the world runs again: 37 frames in the runs of 2026-09-19, under the 60 UF_Test waits before its first suite (`START_HOLD` 55). The HUD shows PAUSED in those three shots.

Screenshots taken by the suite: `history.start_zoom1.png`, `history.start_zoom23.png` (the player's campfire and its eight at the first frame), `history.start_other.png` (another faction's camp at the first frame, zoom ⅔), then, zoom ⅔ and later (the ring has broken up by then): `history.home_area.png`, `history.other_area.png`, then the two chronicle pages.

**Removed 2026-09-19 and why:** `simulated`, `sites_placed`, `wars_and_ruins` (no years are simulated at New Game: `no_years` tests that none are, `factions.areas` tests where the areas go); `stamped_in_world` (nothing is stamped: `nothing_built`); `people_at_sites` (no sites with populations: `founders`); `settle_runs`, `settle_changes_map`, `settle_houses`, `settle_population`, `settle_deterministic`, `settle_no_banned_words` (the settling run is switched off, V54 retired: `settle_off` checks it stays off and `legacy_switchable` that the kept code still runs when switched on).

Seen 2026-09-19 afternoon on snapshot copies with the campfire start: all 16 PASS (seed 1311311428: 6 factions, 48 founders, every camp on its area centre, the start capture done after 37 frames, every camp PPP/PFP/PPP at the first frame, facings 2 2 4 8 8 8 6 2 clockwise from north). `campfire_start` seen failing on a copy whose founders all spawn facing down: `FAIL history.campfire_start - … facings 22222222, first frame PPP/PFP/PPP [PROBLEM]; … PROBLEMS (14): Ostesh Band: 5 founders not facing the fire (first at 1,1 facing 2, want 8); Ostesh Band at the first frame: -1,0: no object, Alette dir 2; …`.

Seen 2026-09-19 on snapshot copies of the game (`%TEMP%\uf_snapshots\gen_*`, with the catalog edit): all 15 PASS (seed 320657983: 7 factions, 28 founders, the player's humans at (128,128), goblins in a primeval swamp at (24,96)). Seen failing on two sabotaged copies, one line each: `generated_with_world` ("history version 5"), `player_faction` ("viewStart (138,128) DOES NOT match; the view (138,128) is NOT on it"), `no_years` ("1 year-0/1 events that aren't year-1 foundings; simulated event types present"), `founders` ("Naric: age 50, stage adult, born -49"), `stats_and_ranks` ("Tamine: rank 0, superior null (want 0 under 2)"), `deterministic` ("year 1 DIFFERENT to the live world"), `saved` (a field that changes on every read), `nothing_built` ("7 with pieces; 224 built objects … first: wall_wood at (173,11)"), `chronicle_opens` ("page 1 of 3 (want 2): false"), `describe_site` ("Irfaleth (settled in year 1)"), `add_event` ("{ year 0, … }"), `no_banned_words` ("first: "Iolo""), `settle_off` ("wrote 1 object-diff areas"), `legacy_switchable` ("3 years, 7 sites, 27 events").

## The older generator (switched off since 2026-09-19)
Kept in the file (`simulate`, `settle`, `spawnSettled`, `placeSite`, `placeHome`, `piecesFor`) and in the catalog (`history.years` … `titles`, `history.settle`, `sites.kinds`); `history.simulate: true` (and `settleYears > 0` for the settling run) switches it back on. What it does:
- **History** (`simulate`): every faction exists from year 0 with one site (the player's at the map centre, protected: never sacked or abandoned) and a ruler; per year populations grow, sites are founded (within 60 cells of a faction site) and grow (`sites.bySpecies`), rulers succeed one another, hostile pairs go to war (second half of the history), lost wars turn sites into ruins, peace, alliances and trade move the relations, plagues cut populations, beasts make lairs. Site cells: walkable, whose disc of the largest radius is walkable, preferred biome first, ≥ `sites.minDistanceFromStart` from the start and ≥ 24 cells from every other site. The factions' `home`, `population` and `relations` are updated; `state.viewStart` = the home site.
- **The settling run** (`settle`, V54, retired with V31): the last `settleYears` years played out on the built map site by site, arithmetic on counts of people by age (deaths by age, fevers, births from adult pairs, abandonment under `minPeople`), and pieces written to the object grid (a second wall, straw beds, stockpiles, a work stone, houses with a door and a bed, trees felled, stones taken, bushes picked, items in the stockpiles), recorded in `site.settled` and `history.settled`; about 70–90 ms for 100 years and 12–15 sites plus a 200 ms map build.
- **People** (`spawnSettled`): at every living site a count within `sites.peoplePerSite` following the settled population, ages from the settled counts, one ruler per faction (rank 2), a leader per other site (rank 1), everyone else under the site's leader.
- Its checks were the ten removed above; `legacy_switchable` keeps it honest.

## Replaced core methods
None, aliases only: `Scene_Map.prototype.createAllWindows`, `Scene_Map.prototype.update`, `Scene_Boot.prototype.start`.

## Known limits
- The founders of the other factions only wander within radius + 2 of their centre (`ai: "wander"`, UF_Wildlife's wander AI) until the bands' living-and-building AI (V51) drives them; they have no needs yet.
- UF_Colonists re-rolls the colonists' gender and name; the id order above keeps four men and four women on their ring cells, but the plan's names for the player's eight are replaced (the chronicle reads the units' current names).
- UF_Colonists' plan counts the standing campfire as its hearth with no change to UF_Colonists: its build step for the site kind's own centre piece is done when the site holds one (`buildCells`), and `plan_reads_the_site` passes again ("centre holds campfire; hearth step done; status: Hearth: built · Knives: 0/8 · …", 2026-09-19).
- Only the first frame shows the ring: the colonists walk off to work and the other bands wander at once (V51 will give them their own camp life).
- Facing is the nearest of four: the corner founders look straight down (top row) or up (bottom row), not diagonally at the fire, until 8-way facing (V3).
- Plain clothes are defined for humans only (the tier-0 sheets); other species' founders wear whatever `people[species].images` names, which on 2026-09-19 includes `Actor` sheets (hats, robes).
- `currentYear()` counts game-clock years; with Q11 open a year takes over 100 real hours at ×1.
- The chronicle lists every faction, met or not (the ledger only the met ones), and page 1 shows at most about 20 events.
- UF_Doors (not registered) expects rings with gaps at the living sites; year-1 camps have none, so its site checks have nothing to test until the bands build rings (reported).
- A save made before 2026-09-19 keeps its older history (stamped sites, the settling diffs, rulers); nothing converts it.
