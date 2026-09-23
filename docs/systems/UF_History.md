# UF_History

## ASTRA08 biological calibration experiment — 2026-09-23

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
