# GitHub tech inventory independent review — Grok 4.7

VERDICT: FAIL

| Field | Value |
|---|---|
| Reviewer | Grok 4.7 (xAI). Cross-family reviewer. Not the writer. |
| Writer | Codex / GPT (OpenAI). Commit identity `deus-pm <deus-pm@local.invalid>`. Subject tagged `[codex]`. |
| Writer tip | `798ac01c148206dfc226c0697818c94c0f3d8581` |
| Parent / named baseline | `0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a` |
| Branch | `task/github-tech-inventory` |
| Review date | 2026-10-03 |
| Worktree | `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\github-tech-inventory` |
| Author docs | `docs/research/GITHUB_TECH_INVENTORY.md` (51 data rows, lines 7–57) and `docs/research/SPRITE_BENCH_FINDINGS.md`. Neither file was edited. |

This review certifies a read of those two documents against the tree at the writer SHA. It does not certify a native test run, a Deus claim check, or a whole-repository license clearance.

## Scope and controlling rules

Reviewed the single writer commit above. It adds only the two research documents. The inventory is a pre-2026-10-02 00:00 CT recovery index of Gemini-assigned libraries and named techniques, with a current-code and WBS-SIM comparison at `0c94cb23`. The sprite note is a bounded search for a million-sprite animated benchmark.

Controlling Owner limits, read from `AGENTS.md` and `docs/DECISIONS.md:52` (D-2026-10-02-3): no merge, no force-push, no deletion, no commit or push to `main`. The expected-red list gates CI, hygiene, and docs lanes only. ORG-2 owns the native slot. This lane is a docs review, so `run_tests.bat` was not run and no native RESULT is claimed. `AGENTS.md` §2's general "reviewers run the tests" rule yields to that exemption here. The only review file written for commit is this one. Scratch notes stay under `scratchpad/research-review/` (gitignored).

## Commit boundary

```text
git rev-parse HEAD
798ac01c148206dfc226c0697818c94c0f3d8581
exit 0

git rev-parse --abbrev-ref HEAD
task/github-tech-inventory
exit 0

git log -1 --format="%H%n%an <%ae>%n%cn <%ce>%n%s%n%ci"
798ac01c148206dfc226c0697818c94c0f3d8581
deus-pm <deus-pm@local.invalid>
deus-pm <deus-pm@local.invalid>
[codex] Inventory pre-October Gemini techniques and sprite benchmark evidence
2026-10-03 00:06:11 -0500
exit 0

git merge-base --is-ancestor 0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a HEAD
ANCESTOR_EXIT:0

git diff --name-only 0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a HEAD
docs/research/GITHUB_TECH_INVENTORY.md
docs/research/SPRITE_BENCH_FINDINGS.md
exit 0
```

No `game/`, engine, art, credential, or provider-status path is in the writer diff.

## Failing findings

### 1. The typed-array object-field row cites the water-distance grid

`docs/research/GITHUB_TECH_INVENTORY.md:24` names the technique "Typed-array world-object field" and the purpose "Compact per-cell object IDs and material fields." The current-code cite is `DEUS_WorldGen.js:1490`.

That line is the water-distance dilation, a `Uint8Array`, already covered by the flora row at `:23`:

```1490:1491:game/js/plugins/DEUS_WorldGen.js
        const waterDist = new Uint8Array(cells).fill(WATER_DIST_MAX + 1);
        for (let i = 0; i < cells; i++) if (water[i]) waterDist[i] = 0;
```

The per-cell object IDs the historical packet describes are a different array. Generation packet 04 at `docs/packets/generation/DEUS_GENERATION_PACKET_04_CLIMATE_BIOMES_ECOLOGY_RESOURCES.md:29` says storage is `$dataMap.ufObjects` (`Uint16Array(65536)`). The current builder is `game/js/plugins/DEUS_World.js:1259`, `const objects = new Uint16Array(cells)`, assigned to `ufObjects` at `:1269`. Line 1258 is the comment that these are map-object type numbers, not events.

The status sentence can still say a typed array exists in worldgen and that this is a different scope from the SIM-1 entity store. The current-code pointer identifies the water-distance grid. That is the wrong structure for this row.

### 2. The method paragraph's git-history claim is false

`docs/research/GITHUB_TECH_INVENTORY.md:3` says the pre-cutoff project docs, tasks, reference search, local lane-board files, and Git history yielded no third-party `github.com` URL, only the project's own remote.

The tracked tree at this SHA contains third-party `github.com` URLs that predate the cutoff. Examples:

- `game/js/libs/effekseer.min.js:3` is `https://github.com/effekseer/EffekseerForWebGL`. `git log -1` on that path is `940ac9172c21cddb2d5f3f15aa4512d4d274408b`, 2026-09-18 14:42:59 −0500. That is the same repository the Effekseer row presents as an independently identified upstream link.
- `game/js/rmmz_core.js:1062` is `https://github.com/Darsain/fpsmeter`, in a comment that also says the meter is MIT.
- `game/js/libs/pixi.js` contains many third-party `github.com` URLs, including pixijs, resource-loader, and libgdx references.

A markdown search of `docs/**/*.md` and `tasks/**/*.md` at this tip, aside from the new inventory's own license links, found only `https://github.com/willshw89/Deus.git` (`docs/OWNER_DECISIONS.md:84`, `docs/archive/STATUS_LEDGER_20260930.md:34`, `tasks/SIM.40.01/lane-q/REPORT.md:43`). The narrower docs-and-tasks claim can hold. The sentence as written includes Git history, and that part does not.

These vendored header URLs are engine bundle comments. They are not evidence that Gemini adopted those repositories as new DEUS dependencies. The license cells checked below still match the files that were fetched. The failure is the absolute negative used to justify the search method.

## What held

### Licenses fetched 2026-10-03

Raw files, not the GitHub HTML blob pages:

| Upstream file | What the file says | Inventory cell |
|---|---|---|
| `pixijs` tag `v5.3.12` `LICENSE` | MIT. Copyright 2013–2017 Mathew Groves, Chad Engler. | MIT. Matches `game/js/libs/pixi.js:1-6` header `pixi.js - v5.3.12`, MIT. |
| `localForage` tag `1.7.3` `LICENSE` | Apache License 2.0. Copyright 2014 Mozilla. | Apache-2.0. Matches `game/js/libs/localforage.min.js:1-6` header Version 1.7.3, Apache License 2.0. |
| `pako` tag `1.0.11` `README.md` License section | MIT for all files except `/lib/zlib`, which is ZLIB. | "MIT plus zlib notices" at 1.0.11, with bundled-version match still open. That caveat stays correct. The minified bundle was not re-scanned for a version string. |
| `EffekseerForWebGL` `master` `LICENSE` | MIT. Copyright 2011 Effekseer Project. | MIT. Local header `game/js/libs/effekseer.min.js:1-6` says v1.70b and MIT. The historical 1.53c conflict is a version note the table already flags. `master` is a moving branch, so this fetch is the file as of this review, not a pinned tag. |
| `stb` `master` `LICENSE` | MIT (Copyright 2017 Sean Barrett) or public domain / Unlicense. | "MIT or public domain." `game/js/libs/vorbisdecoder.js:1-3` says v1.0.1, based on `http://nothings.org/stb_vorbis/`. The wrapper/WASM license is not in that header. Leaving it unverified is correct. |
| `nw.js` ref `nw84` `LICENSE` | MIT-style grant. Copyright lines name NW.js Authors, The Chromium Authors, and Intel Corp. | "MIT core" matches this file. The fetched `LICENSE` is that grant. The table already places a complete bundle-license audit outside the row. |
| `nodejs` tag `v20.0.0` `LICENSE` | Node.js core MIT grant, then "externally maintained libraries" with separate notices (Acorn MIT, c-ares, ICU, and others). | "MIT core plus third-party notices" matches the opening structure. The fetch returned the first 30720 of 114948 bytes. The remainder was not read line by line. No GPL or AGPL heading appeared in the portion read. |

No GPL or AGPL text appeared in the Pixi, localForage, pako, Effekseer, stb, or NW.js files fetched, or in the Node portion read. That supports the inventory's closing sentence as a finding about this record. It is not a whole-repository clearance, which the inventory already says.

`DEUS_Mint` and `DEUS_WorldItems` have no registration in `game/js/plugins.js`. `DEUS_Spawners` is registered at `game/js/plugins.js:304`, and `game/js/plugins/DEUS_Spawners.js:28-39` is `console.log` only. `DEUS_Ecology` is at `plugins.js:157`. `DEUS_Anim` is at `plugins.js:175`. `DEUS_Structural.js` is absent; `DEUS_StructuralPhysics` is registered twice, at `plugins.js:302` and `:303`. The inventory's sentence is the absence of `DEUS_Structural.js`, which matches.

`DEUS_WorldGen.js:396-398` returns `[]` from `riverModels`. The test at `:2225` sets `const rivers = []` and then checks `rivers_count` against a catalog minimum. The empty local is real. `DEUS_World.js:1449` is `const PEEK_CACHE = 9`, with a comment that it was 6 before.

`git cat-file -e 0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a:game/js/sim/climate/climate_engine.js` exited 128 (`path does not exist`). The same path at `2f4bdf206dfe446137e299326eb9e13091228226` exited 0. The "absent at 0c94cb23" climate status matches those checks. The historical report body was not re-read.

`DEUS_Ecology.js:733` says sprouts mature over 2–3 minutes. Delays in `:749-761` are 120, 150, and 180. That is the beat range the inventory reports.

### Sprite measurements

`tasks/WG.00.09b/lane-k/perf/stress_baseline_c2184c94.json`, read with Node (not by launching the bench):

| Run | `environment.units` | `stress.units` | Phase | frameMs median / p95 / worst | fps.atMedian | drawCalls.median |
|---|---:|---:|---|---|---:|---:|
| 1 | 1309 | 221 | stress_day_30s | 63.03 / 190.27 / 311.125 | 15.865 | 182 |
| 1 | 1309 | 221 | stress_night_30s | 71.635 / 180.825 / 344.78 | 13.96 | 174 |
| 2 | 1163 | 219 | stress_day_30s | 67.21 / 204.98 / 511.975 | 14.879 | 210 |
| 2 | 1163 | 219 | stress_night_30s | 67.675 / 323.495 / 535.365 | 14.777 | 203 |

The sprite note pads some of those figures to three decimals (63.030, 190.270, 344.780, 13.960, 67.210, 204.980). The values are the same numbers.

Machine object: host MSI, 16 CPUs, cpu string `AMD Ryzen 7 8845HS w/ Radeon 780M Graphics`, totalMemGb 31.3. Both runs' `environment.gl` is `ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)`. Quiet labels are at JSON lines 2317 and 5168 (`"label": "quiet"`) and `"quiet": true` at 2860 and 5711.

The FPS formula is `r3(1000 / med)` at `tools/bench_render_layers.js:332`. The culling file at `tools/bench_viewport_culling.js:15` says 300 fixture frames, 64 `Game_Character` updates, CPU submission time. `tools/world_items/bench_world_items_100k.js:7` sets `PLACED = 100000` and `:34-36` loops 21 `drawList()` calls. `docs/OWNER_DECISIONS.md:1433` is DEC-099. `tasks/WBS_RENDER_OPTIMIZATIONS.md:10` is the WG.RENDER.02 culling track. `tasks/WG.00.09b/lane-k/lane.json` names writer `claude` and reviewer `grok`.

```text
git log -1 --format="%H %an %ci %s" 5c6641e151e2568ef15a445ba674ac9e77d9f747
5c6641e151e2568ef15a445ba674ac9e77d9f747 deus-claude 2026-09-26 01:38:10 -0500 [claude] WG.00.09b K3: bench_render_layers.js
exit 0

git log -1 --format="%H %an %ci %s" c2184c949650765a4fe8237eccc09c9106537e86
c2184c949650765a4fe8237eccc09c9106537e86 deus-claude 2026-09-26 06:18:30 -0500 [claude] WG.00.09b Fix2 WIP: ...
exit 0

git rev-parse archive/task/lane-k
ab2e5b15fbf5c0afed463cd1629630e286d445e8
TAG_EXIT:0

git log -1 --format="%H %an %ci %s" ab2e5b15fbf5c0afed463cd1629630e286d445e8
ab2e5b15fbf5c0afed463cd1629630e286d445e8 deus-grok 2026-09-26 07:14:31 -0500 [grok] WG.00.09b review 95c18bfa
exit 0
```

A search for `1000000`, `one million`, `1,000,000`, and `million sprite` in `*.js`, `*.md`, and `*.json` did not locate a million-sprite animated harness. Hits were demographic `eventLimit: 1000000` text and decimal timestamps that contain those digits. `ParticleContainer` hits in this search were inside `game/js/libs/pixi.js`. The sprite note's bounded negative, and its refusal to treat that negative as proof the experiment never existed, match this search. Lane K remains the largest located native render-stress record in the files checked, at 219–221 added combatants, with derived median FPS about 14–16.

## Notes that do not fail the verdict

- `SPRITE_BENCH_FINDINGS.md:25` cites `bench_render_layers.js#L327` for `1000 / median frame interval`. Line 327 is `const out = {`. The formula is line 332. The described formula is the one in the file.
- The same note cites `REPORT.md#L165` for the transcribed stress numbers. Line 165 is the heading `## F2.5 Benchmark on c2184c94`. The matching numbers are at lines 178–181. The figures match the JSON.
- `GITHUB_TECH_INVENTORY.md:55` says ecology matures over 120–180 beats, "unlike the historical 15-year target." `docs/systems/DEUS_RESOURCE_ECONOMY_STANDARD.md:220` is a mature-tree band of 5–15 years, and `:224` is canopy regeneration in 5–10 years (clear-cut 25–50). The beat-versus-years contrast holds. "15-year target" compresses that band into one figure.
- The river test's `rivers_count` check uses the empty local at `DEUS_WorldGen.js:2225`. With `rivers.length === 0`, that check fails. The inventory's "hard-codes an empty river list" is accurate. The local does not manufacture a passing river count.
- The sprite note's title date is 2026-10-02. The writer commit time is 2026-10-03 00:06:11 −0500.
- Later names the inventory excludes (seedrandom, bitECS, flatbush, rbush, comlink, DFHack, Cataclysm DDA JSON, RimWorld Defs) were not pickaxed across every pre-cutoff commit. Their exclusion is the cutoff rule the brief required. This review did not enlarge the table with them.

## Unperformed checks

- `run_tests.bat` was not run. No native NW.js RESULT line was produced. No suite, seed, screenshot, or FPS measurement from this session is claimed. ORG-2 owns the native slot. D-2026-10-02-3 is why a missing native run is not treated as a docs-lane failure.
- No Deus claim check. This file is not a Deus CONFIRMED, PARTIAL, or FALSE verdict.
- No full 51-row re-audit of every WBS-SIM cell against `docs/WBS_SIM.md`.
- No pre-cutoff pickaxe proving the later 2026-10-02 library names never appeared in any Gemini assignment.
- `tasks/ART.NAT.INDUCT/lane-gh/REPORT.md:12-24` exists at HEAD (`git cat-file -e` exit 0) and was not content-read. `tasks/NAT.05.01/lane-cl/REPORT.md` is absent at HEAD and present at `2f4bdf20` (exit 0); lines 9–80 were not content-read.
- `game/js/sim/hydrology/aquifer.js` lines 141–144 and 328–339 were not re-read. `rmmz_managers.js` pako and localForage call sites were not re-read. The 2026-10-01 Grok rejection of `tasks/NAT.02.01/lane-gq` was not re-verified.
- `node tools/ci/syntax_check.js` and `node tools/ci/check_root.js` were not run. They would not be native proof.
- The remainder of the Node.js `v20.0.0` LICENSE past the first 30720 bytes was not read. The pako minified bundle was not searched for a version string. Installed NW.js and Node versions were not probed.
- No game boot, worldgen, save/load, or browser pass. This diff has no UI. No author research doc was edited. No merge, force-push, file delete, or `main` commit or push was done.

VERDICT: FAIL
