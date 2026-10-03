# CORE/DATA parked-plan review — Grok 4.7

VERDICT: FAIL

| Field | Value |
|---|---|
| Reviewer | Grok 4.7 (xAI). Independent cross-family reviewer. Not the writer. |
| Writer | Codex / GPT (OpenAI). Commit identity `deus-pm <deus-pm@local.invalid>`. Subject tagged `[codex]`. |
| Writer tip | `aba7507106b51d8b4a61d989771ca1635b1cf8ca` |
| Writer parent / stated base | `038a02c35922df825fd7d47d948d7747d4e56755` (`main` in this worktree) |
| Branch | `task/core-tech-plan-docs` |
| Review date | 2026-10-03 |
| Worktree | `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\core-tech-plan-docs` |

This review covers the parked planning diff only. It does not certify a native test run, a Deus laptop check, an implementation, or a vendor copy. Two source claims fail. The rest of the Owner checklist is present in the stubs.

## Scope and controlling rules

Reviewed the 14 files added under `docs/plans/core-tech/` at the writer tip. No runtime, vendor, plugin, art, or WBS file is in the diff. The pages stay parked: they do not activate a lane, change WBS status, or authorize a plugin load.

Controlling limits for this review, from `AGENTS.md`, `.agents/rules/deus-review-policy.md`, and the lane brief: no merge, no push to `main`, no rebase, squash, or force-push, no deletion, no edit of the writer files. ORG-0.2 owns the native slot. This lane is docs-only, so `run_tests.bat` was not run and no native RESULT is claimed. No screenshot was required for these stubs, and none was taken. DEC-089's relaxation of cross-family review for non-core logic does not cover this architectural plan set; this review is the independent pass.

## Commit boundary

Commands (PowerShell), run in this worktree:

```text
git rev-parse HEAD
aba7507106b51d8b4a61d989771ca1635b1cf8ca
exit 0

git rev-parse --abbrev-ref HEAD
task/core-tech-plan-docs
exit 0

git rev-parse aba7507106b51d8b4a61d989771ca1635b1cf8ca^
038a02c35922df825fd7d47d948d7747d4e56755
exit 0

git merge-base --is-ancestor 038a02c35922df825fd7d47d948d7747d4e56755 aba7507106b51d8b4a61d989771ca1635b1cf8ca
exit 0

git diff --stat 038a02c35922df825fd7d47d948d7747d4e56755 HEAD -- docs/plans/core-tech
14 files changed, 217 insertions(+)
exit 0

git status --short
(empty before this review file)
exit 0
```

`aba75071` parents `038a02c3` directly. Author and committer `deus-pm <deus-pm@local.invalid>`. Author date 2026-10-03 00:46:20 −0500. Subject: `[codex] File parked core-tech and colony-data foundation lane stubs`. The diff is only the 14 new markdown files. `git status --short` before this review file was empty.

## Findings

### F1 — CHUNKCACHE points the grade at documents that forbid it

`docs/plans/core-tech/CORE-CHUNKCACHE.md:11` requires the future cache to bake current z at full brightness, visible z−1 at about 60% brightness and about 50% desaturation, visible z−2 at about 30% with a cool gray cast, z−3 and deeper not drawn, nothing above current z, and lower levels only where every intermediate level is open. The same paragraph then says to see `docs/systems/DEUS_Depth.md` and DEC-011.

On `038a02c3` those two texts forbid that grade:

- `docs/OWNER_DECISIONS.md:173` (DEC-011 Owner ruling): every Z layer renders 1:1, with no blur, scale, zoom, parallax, projection offset, ColorMatrix, alpha, or tint depth shading, or any other filter. Visual depth effects are to be revisited later, and only with the Owner.
- `docs/systems/DEUS_Depth.md:5` repeats that ban. `docs/systems/DEUS_Depth.md:28` describes the current planes as scale 1, alpha 1, and `filters` null.

The records that amend the shading ban and keep flat 1:1 geometry are D-2026-10-02-19 and D-2026-10-02-26, plus the wall-frame choice D-2026-10-03-1, on `task/art-scale-1-docs` at `1f2e637e`. `git cat-file -e 038a02c3:docs/art/CAMERA_DEPTH_PLAN.md` and the same path at this tip both fail: that plan is not in this base. `git grep` of `D-2026-10-02-19` on this worktree returns no hits. The stub's "separately parked depth/art plan" has no path on this branch.

The grade numbers themselves belong in the stub. What fails is the citation. A reader who opens the two linked documents on this SHA is told the baked desaturation is not allowed, and is not told that a later Owner ruling amends the shading ban while keeping flat 1:1. D-2026-10-02-26 also separates "mostly gray" from a "cool blue cast" on both lower levels. The stub's "cool gray cast" on z−2 does not carry that split.

### F2 — Movement8D's 24×24 window is a comment, not a bound

`docs/plans/core-tech/README.md:24` and `docs/plans/core-tech/CORE-PQ.md:7` say `DEUS_Movement8D.js` runs a local 24×24 octile A* with its own heap and a 200-iteration cutoff.

On `038a02c3`:

- `game/js/plugins/DEUS_Movement8D.js:510` is the only `24x24` hit in that file, and it is a comment.
- `findDirection8DTo` (`:491`) takes map width and height (`:511-512`) and expands neighbors with `roundXWithDirection` / `roundYWithDirection`. No 24-cell window is applied.
- The cutoff that exists is `maxIterations = 200` at `:542`.
- The open set is a binary heap: `class PriorityQueue` at `:418-460`, acquired from `pqPool` at `:513`.

The heap and the 200-iteration cutoff match the stub. The 24×24 window does not. `CORE-PQ.md:7` also says these contracts need a fresh audit at the implementation SHA, which does not make the 24×24 sentence true of the code at `038a02c3`.

## Requirement checklist

Checked against the 14 files and against `git show` / `git grep` of `038a02c3`, plus the DF study blob `4b2f5694ee265995c85c388414902063cc7d1e1e:docs/research/DF_PATTERN_STUDY.md`.

| Requirement | Where it is recorded | Result |
|---|---|---|
| Stubs only; no activation before ORG-0.2 green and WORLD-3x3 | `README.md:3`, each page's status line | Present. Diff adds no runtime. |
| Order RNG, SAVE, TICK, EVENTS, CORE-PQ, CORE-SPATIAL, ECS, SCHED, JOBS, CORE-HPA, CORE-CHUNKCACHE, INSPECT | `README.md:7-18` | Present, in that order. |
| INSPECT may move earlier only after ORG-0.2 green, idle writer, isolated files | `README.md:22`, `DATA-INSPECT.md:3` | Present. |
| DATA-CONTRACT order unspecified | `README.md:20`, `DATA-CONTRACT.md:3` | Present. |
| DEC-037 stays; first green worldgen does not lift it | `README.md:3` and `:22`; also RNG, EVENTS, JOBS, CONTRACT | Present. |
| RNG: world seed + system name; live sim `Math.random` replaced; cosmetic and seed selection classified; five seeds and a lint | `DATA-RNG.md:7-13` | Present. |
| SAVE: global version, ordered migrations, string IDs, bad refs hard-error | `DATA-SAVE.md:7-9` | Present. |
| TICK: tunable 10 Hz proposal, frame-rate independence, interpolation, pause and 1×/2×/4×, hash at tick N | `DATA-TICK.md:7-11` | Present. |
| EVENTS: typed registry, debug payloads, 38-file map, behavior kept, history only after the freeze lifts | `DATA-EVENTS.md:7-11` | Present. The 38-file count matches. |
| ECS: id + generation, typed columns, sparse optionals, colonists and wildlife first, items later, 1,800 / 60 FPS before/after, exact round trip | `DATA-ECS.md:7-11` | Present. |
| SCHED: per-system budget, cursor, off-screen aggregate; p95 ≤ 110% of that system's budget | `DATA-SCHED.md:7-9` | Present. The bound is each system's budget, not 10% of the frame. |
| JOBS: claims on items, tiles, and workstations; timeout and release on completion, cancel, death, and load; spatial nearest-free; 1,800 no-double-claim; nearest-item p95 | `DATA-JOBS.md:7-9` | Present. |
| INSPECT: raw components, job, reservations; read-only; off in release; screenshots at the future gate | `DATA-INSPECT.md:7-9` | Present. |
| CORE-PQ: tinyqueue only inside `World.findPath` and only if a measurement wins; route Movement8D through `World.findPath`; remove the inline A* in place; do not delete files | `CORE-PQ.md:11-15`, `README.md:24` | Present, aside from F2's window size. |
| CORE-SPATIAL: dynamic 16×16 grid, typed head/next, actual O(1); flatbush and kdbush optional and static | `CORE-SPATIAL.md:9-13` | Present. |
| HPA: 16×16 clusters, edge entrances, dirty on dig/build/collapse, wrap every world edge and stair/ramp, final `World.findPath`, five seeds, cross-area p95 | `CORE-HPA.md:9-15` | Present. |
| CHUNKCACHE: 16×16 `PIXI.RenderTexture` per z for visible chunks, rebake dirty only, LRU and memory counters, baked grade, live tint only on moving layers, wall 48 px face + 48 px cap = 96 px, art wiring parked | `CORE-CHUNKCACHE.md:9-13` | Grade and wall size are present. Citation fails (F1). |
| Vendor: Owner OK before the first file; `game/js/vendor/<lib>`; original license; root `THIRD_PARTY_NOTICES.md` with name, URL, license, and copied commit; not `game/js/libs/`; no GPL/AGPL; recheck at lane start; pin the commit at copy time | `README.md:28-41` | Present. |
| bitECS MPL-2.0, reference only, no copy | `README.md:39`, `DATA-ECS.md:9` | Present. Upstream `LICENSE` on `main` opens with Mozilla Public License 2.0. |
| seedrandom optional, MIT | `README.md:38`, `DATA-RNG.md:11` | Present. README anchor `#license-mit` is the MIT section. |
| DATA-CONTRACT: `schemaVersion`, `x-ref`, file-and-path ref errors, CI exit 1, `copyFrom` cycles, abstract leaks, dense runtime indices, string save IDs, spaces allowed, one prebuilt bundle, load time before/after, `weight_lb` primary, density fallback only, no invented research body | `DATA-CONTRACT.md:9-20` | Present. Study figures match the cited blob (below). |

`CORE-SPATIAL.md:3` calls that lane "Proposed M1 work". The README table's group cell for it is "Core spatial", and its sequence slot is 6, after CORE-PQ. The order is the table. The M1 label is loose and does not move the lane ahead of TICK or EVENTS.

`DATA-TICK.md:7` calls 10 Hz a proposal to measure, not an adopted runtime constant. That matches this parked-plan instruction. Separately, DEC-012 (`docs/OWNER_DECISIONS.md:188`) already names a fixed 10 Hz headless tick as decided architecture, and the live clock in `DEUS_World.js:722-727` is 36 game-seconds advanced on `time:minute`. The stub tells the future brief to reconcile `DEUS_TimeSpeed.js` and that minute tick. It does not cite DEC-012. That citation is worth adding; it is not a second verdict by itself, because the stub does not treat the running game as already being 10 Hz.

## Source claims that hold

All of these are `git grep` / `git show` of `038a02c3`.

- `World.findPath` (`DEUS_World.js:3455`) is one area. The contract comment at `:3446-3452` is 8-way unless `UF_Movement8D` FourWay is on, blocked-corner diagonals, default `maxNodes` 12000 (`:2489` and `:3450`), and opts `z`. Region precheck is `regionsOf` at `:3083-3086`. Vertical steps are inside the same area: ramp up/down and stair z changes at `:2988-3013`. An older file header at `:83` and `:89` still says 4-way; the operative comment and `fourWay()` at `:261-263` match the stub.
- `DEUS_FlowFields` is `"status": true` in `game/js/plugins.js:43-44`. `UF.Pathfinding.requestFlowField` and `getFlowDir` are defined only at `DEUS_FlowFields.js:156` and `:167`. A tree grep of those two names returns no other hit.
- Plugin `Math.random` lines: 20 (`git grep -n Math.random 038a02c3 -- game/js/plugins/*.js`). Five are "never Math.random" comments (`DEUS_Colonists.js:208`, `DEUS_Ecology.js:96`, `DEUS_Factions.js:261`, `DEUS_Wildlife.js:120`, `DEUS_World.js:1007`). Fifteen are expressions. The stub's classes match the expressions: seed selection at `DEUS_World.js:844` and `:851` and `DEUS_FactionMenus.js:490`, `:516`, `:526`; barks at `DEUS_Visuals.js:151`, `:166`, `:171`; fallbacks at `DEUS_Dnd5e.js:415`, `:720`, `:800` and `DEUS_Callings.js:153`, `:214`, `:306`; crushing roll at `DEUS_StructuralPhysics.js:64` (`hasAnchor` at `:55` returns false). The stub does not treat the literal count as a live-sim count. `game/js/rmmz_*.js` and `game/js/libs/pixi.js` also contain `Math.random`; those paths are engine-core and outside the 20 plugin lines.
- `UF.Events` is the untyped `_listeners` map at `DEUS_Core.js:286-318`. The object's closing `};` is line 319. `git grep -l UF.Events 038a02c3 -- game/js/plugins/*.js` returns 38 files.
- `DEUS_World.js:857` sets `version: 4` in `newWorld`. `DEUS_World.js:3883` is the `extractSaveContents` wrapper. `DEUS_Colonists.js:867` is `migratePersonIdentities`.
- `DEUS_Levels.js:1633` reads `strataSchemaVersion`. `migrateSaveToFiveStrata` is `:3692` ("legacy level changes … to strata records"). `migrate` at `:4828` brings a pre-V80 state (version 3 or none) to version 4, and `:4837` names the `surface_migration` provocation.
- `DEUS_Jobs.js:137-214` is the `ReservationManager` header, class, and instance.
- `DEUS_TimeSpeed.js:146-165` multiplies `SceneManager` repeats by the speed list while the map is running. `no_speedup_while_paused` is the check at `:500`.
- DF study at `4b2f5694`, which is `task/docs-df-pattern-study` and not an ancestor of this tip: line 41 counts 24 reaction IDs containing spaces; line 78 is about 13.8 lb by density × volume versus SRD 4 lb (the stub's "about 14 lb" is that figure); lines 82-84 make `weight_lb` primary and density a fallback; lines 203 and 356 are 16×16×1 chunks, lazily allocated, 48×48 per z on a 3×3 world of 256 tiles. The public blob URL for that path returned the study. The stub's "sparse … property arrays" is looser than the study's dense typed arrays inside lazily allocated chunks. The page marks that layout as design input only.
- Wall frame 48 px face + 48 px cap = 96 px total is D-2026-10-03-1 on `task/art-scale-1-docs` (`docs/DECISIONS.md` at `1f2e637e`). It is not in this base. The stub states the choice the Owner recorded there, and it leaves art wiring parked.

## License links

Fetched 2026-10-03 from the moving branches the stub names. The stub already says those branches are not a version pin.

| Link in the stub | What the page was |
|---|---|
| `mourner/tinyqueue` `blob/main/LICENSE` | ISC, copyright 2017 Vladimir Agafonkin |
| `mourner/flatbush` `blob/main/LICENSE` | ISC, copyright 2022 Vladimir Agafonkin |
| `mourner/kdbush` `blob/main/LICENSE` | ISC, copyright 2026 Vladimir Agafonkin |
| `hugoscurti/hierarchical-pathfinding` `blob/master/LICENSE.md` | MIT, copyright 2022 Hugo Scurti |
| `qiao/PathFinding.js` `blob/master/README.md#license` | Heading `## License`, anchor `license`, MIT text |
| `ondras/rot.js` `blob/master/license.txt` | Three-clause BSD text (source notice, binary notice, no endorsement) |
| `davidbau/seedrandom` `blob/master/README.md#license-mit` | Heading `## LICENSE (MIT)`, anchor `license-mit` |
| `NateTheGreatt/bitECS` `blob/main/LICENSE` | Mozilla Public License Version 2.0 |
| `gafferongames.com/post/fix_your_timestep/` | Glenn Fiedler, "Fix Your Timestep!", fixed step plus interpolation. The stub says to use the ideas and not copy the code. |

None of these license texts is GPL or AGPL. The pages are current branch tips, which is the limitation the README already states.

In-repo links: each `README.md` sibling link targets a file in this diff. The heading `## External code candidates and source rules` matches `#external-code-candidates-and-source-rules`. `docs/systems/DEUS_Depth.md` exists at the base. The DEC-011 heading at `docs/OWNER_DECISIONS.md:169` is `### Decision `DEC-011`: Owner overrides DEC-006/R1 (Option D). Flat layer rendering`, and the fragment `decision-dec-011-owner-overrides-dec-006r1-option-d-flat-layer-rendering` is the usual punctuation-stripped slug. F1 is about what that heading's ruling says, not about a missing heading.

## What this review did not do

- Did not run `run_tests.bat` or any native, playtest, or browser check. ORG-0.2 owns that slot. No native green and no Deus confirmation is claimed.
- Did not edit the 14 writer files, and did not open an implementation lane.
- Did not merge, rebase, squash, force-push, or delete.

## Fix that clears the verdict

1. In `CORE-CHUNKCACHE.md`, separate the current `038a02c3` depth documents from the later grade. State that DEC-011 and `docs/systems/DEUS_Depth.md` on this base forbid tint and desaturation depth shading, and that the 60% / 50% / 30% grade comes from the later Owner depth rulings, which keep flat 1:1 and amend that ban. Name those rulings and where they live. Keep z−2 as mostly gray with a cool blue cast, not only a "cool gray cast".
2. In `README.md` and `CORE-PQ.md`, describe Movement8D's inline search as a binary-heap octile A* with a 200-iteration cutoff. Say the 24×24 window is a comment at `DEUS_Movement8D.js:510` and is not a clamp in the function.
