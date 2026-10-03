# Parked M1/M2 core-tech plans

**Status:** PARKED Owner-requested lane stubs, 2026-10-03. These pages record the core-tech order and acceptance evidence. They do not activate implementation, change WBS status, or authorize a vendor copy, plugin load, or runtime change. ORG-0.2 must be green first. WORLD-3x3 is the first M1 job, immediately followed by [DISPLAY-16x9](DISPLAY-16x9.md), ahead of DATA-RNG and before further visual baselines. DEC-037 still freezes faction and society implementation.

| Order after WORLD-3x3 | Owner-requested lane | Writer / cross-family reviewer | Group |
|---|---|---|---|
| 1 | [DISPLAY-16x9](DISPLAY-16x9.md): 1920×1080 logical display and integer outer scale | Grok / Claude | Visual baseline |
| 2 | [DATA-RNG](DATA-RNG.md): deterministic simulation streams | Grok / Claude | M1 foundation |
| 3 | [DATA-SAVE](DATA-SAVE.md): save version and migrations | Grok / Claude | M1 foundation |
| 4 | [DATA-TICK](DATA-TICK.md): fixed simulation timestep | Claude / Codex | M2 split proposal |
| 5 | [DATA-EVENTS](DATA-EVENTS.md): typed event registry | Grok / Claude | Foundation |
| 6 | [CORE-PQ](CORE-PQ.md): one path queue and path authority | Grok / Claude | Core path |
| 7 | [CORE-SPATIAL](CORE-SPATIAL.md): dynamic unit index | Grok / Claude | Core spatial |
| 8 | [DATA-ECS](DATA-ECS.md): entity component store | Claude / Codex | Foundation |
| 9 | [DATA-SCHED](DATA-SCHED.md): bounded system scheduler | Grok / Claude | Foundation |
| 10 | [DATA-JOBS](DATA-JOBS.md): job board and claims | Claude / Codex | Foundation |
| 11 | [CORE-HPA](CORE-HPA.md): hierarchical paths | Claude / Codex | Core path |
| 12 | [CORE-CHUNKCACHE](CORE-CHUNKCACHE.md): static chunk render cache and baked depth grade | Claude / Codex | Core render |
| 13 | [DATA-INSPECT](DATA-INSPECT.md): debug inspection and graphs | Grok / Claude | Foundation |

[DATA-CONTRACT](DATA-CONTRACT.md) is a separate Owner-requested parked data-loading lane stub with Claude writing and Codex reviewing. Its implementation order is not set here. Activation of each lane requires ORG-0.2 green, its preceding dependencies, a bounded brief, an isolated branch/worktree, baseline, native tests, cross-family architectural review, and Deus confirmation before merge.

DATA-INSPECT stays last in the table. It may move earlier in parallel on an idle writer only behind the DISPLAY-16x9 baseline gate, with non-overlapping files and its own branch/worktree. That gate waits on ORG-0.2 green and a completed WORLD-3x3. The table is the proposed interleaved sequence, not evidence that any lane has started. The first green worldgen result does not lift DEC-037 by itself; history/faction/society behavior remains frozen until a separate Owner decision.

The existing `DEUS_World.js` owns `World.findPath` (same-area route, up to 12,000 expanded nodes by default, region and vertical-link handling). `DEUS_Movement8D.js` also contains a binary-heap octile A* search with a 200-iteration cutoff. Its line 510 comment calls it a 24×24 window, but the function does not enforce that spatial bound. The plan is to consolidate callers, not to introduce another path authority. `DEUS_FlowFields.js` is enabled in `plugins.js`; a read of main `038a02c3` found definitions of `UF.Pathfinding.requestFlowField` and `getFlowDir` but no plugin callers. The Owner's pending choice is to wire FlowFields for crowds/sieges after HPA **or** remove its code; the choice itself need not wait for HPA. Neither action belongs to these docs stubs. The path and caller baseline must be rechecked on the eventual implementation SHA.

## External code candidates and source rules

The table records read-only upstream license checks on 2026-10-03. It does **not** select a version or approve copying. The implementation lane must pin an exact upstream tag/commit, inspect that revision's license and dependencies, and ask the Owner for **OK before the first vendored file**. Any approved vendor file goes under `game/js/vendor/<lib>` with its license header and a root `THIRD_PARTY_NOTICES.md` entry stating name, URL, license, and copied commit. Never place it in `game/js/libs/`; never copy GPL/AGPL code. No file deletion or force-push follows from these plans.

| Candidate | Planned use | Upstream license evidence |
|---|---|---|
| [tinyqueue](https://github.com/mourner/tinyqueue) | Heap candidate for `World.findPath`, only if measured better | [ISC license](https://github.com/mourner/tinyqueue/blob/main/LICENSE) |
| [flatbush](https://github.com/mourner/flatbush) | Optional static rectangle index, not moving units | [ISC license](https://github.com/mourner/flatbush/blob/main/LICENSE) |
| [kdbush](https://github.com/mourner/kdbush) | Optional static point index, not moving units | [ISC license](https://github.com/mourner/kdbush/blob/main/LICENSE) |
| [hugoscurti/hierarchical-pathfinding](https://github.com/hugoscurti/hierarchical-pathfinding) | HPA* design reference; Unity/C# code is not a JS drop-in | [MIT license](https://github.com/hugoscurti/hierarchical-pathfinding/blob/master/LICENSE.md) |
| [qiao/PathFinding.js](https://github.com/qiao/PathFinding.js) | 2D pathfinding comparison/reference | [MIT license in project README](https://github.com/qiao/PathFinding.js/blob/master/README.md#license) |
| [ondras/rot.js](https://github.com/ondras/rot.js) | Read-only chunk/render pattern reference | [BSD-3-Clause license](https://github.com/ondras/rot.js/blob/master/license.txt) |
| [seedrandom](https://github.com/davidbau/seedrandom) | Optional deterministic PRNG candidate for DATA-RNG | [MIT license in project README](https://github.com/davidbau/seedrandom/blob/master/README.md#license-mit) |
| [bitECS](https://github.com/NateTheGreatt/bitECS) | DATA-ECS architecture reference **only; no code copying** | [MPL-2.0 license](https://github.com/NateTheGreatt/bitECS/blob/main/LICENSE) |

The direct license links are to moving upstream branches, so each writer must recheck the license at lane start and again at the exact commit chosen for any future copy. The references are not instructions to vendor or replace DEUS systems wholesale. bitECS remains reference-only even though its license is identified.

## Evidence discipline

The planned 3×3-world baselines and post-change results must name the seed, year, code SHA, Owner-laptop hardware, run method, test result counts, and whether FPS is measured as frame intervals in native NW.js or only inferred from CPU timings. Native `run_tests.bat` remains required. Record p50/p95 and failure names; a benchmark that merely completes does not prove a target. Keep simulation, RMMZ bridge, and actual playtest claims separate.

Related read-only design input: the [DF pattern study](https://github.com/willshw89/Deus/blob/4b2f5694ee265995c85c388414902063cc7d1e1e/docs/research/DF_PATTERN_STUDY.md) is on `task/docs-df-pattern-study` at `4b2f5694` and is not part of main `038a02c3`. Its measurements inform the proposed chunk and data layouts; its proposals are not adopted runtime behavior.
