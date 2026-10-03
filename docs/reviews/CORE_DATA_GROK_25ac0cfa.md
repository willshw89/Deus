# CORE/DATA parked-plan re-review — Grok 4.7

VERDICT: CLEAN PASS

| Field | Value |
|---|---|
| Reviewer | Grok 4.7 (xAI). Independent cross-family reviewer. Not the writer. |
| Writer | Codex / GPT (OpenAI). Commit identity `deus-pm <deus-pm@local.invalid>`. Subject tagged `[codex]`. |
| Reviewed SHA | `25ac0cfac4aa7a6facf3b900fc9f01a8c7d954d8` |
| Parent | `e3f23b467103395c465f2b46d89f40a1d290f9d6` (`[grok] CORE/DATA docs review aba75071 (VERDICT: FAIL)`) |
| Original stub SHA | `aba7507106b51d8b4a61d989771ca1635b1cf8ca` |
| Source base used for code and DEC-011 / DEC-012 / `DEUS_Depth.md` | `038a02c35922df825fd7d47d948d7747d4e56755` (local `main` in this worktree) |
| Later depth rulings | `1f2e637e82ec1f923a4326ab945ce7ccdf4348f9` on `task/art-scale-1-docs` |
| Branch | `task/core-tech-plan-docs` |
| Review date | 2026-10-03 |
| Worktree | `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\core-tech-plan-docs` |
| Prior review | `docs/reviews/CORE_DATA_GROK_aba75071.md` (preserved; not edited) |

This pass reviews the four corrected markdown lines only. The checklist in the aba75071 review stands for every line this commit does not change. F1 and F2 from that review are cleared.

## Scope and controlling limits

Controlling limits, from `AGENTS.md`, `.agents/rules/deus-review-policy.md`, and the lane brief: no edit of the writer files, no deletion (including temps), no merge, no rebase, no squash, no force-push, no push to `main`. ORG-0.2 owns the native slot. This lane is docs-only, so `run_tests.bat` was not run and no native RESULT is claimed. No Deus laptop check was run. No screenshot was required for these text corrections, and none was taken. DEC-089's relaxation of cross-family review for non-core logic does not cover this architectural plan set.

Sparse checkout does not contain `game/js/plugins/DEUS_Movement8D.js` or `game/js/plugins/DEUS_World.js` as working-tree files. Those reads are `git show` / `git grep` of `038a02c3`. The later rulings are `git show` / `git grep` of `1f2e637e`, plus the two GitHub blob pages named in the stub.

## Commit boundary

Commands (PowerShell), run in this worktree. Exit codes are the tool or `$LASTEXITCODE` values from this session.

```text
git rev-parse HEAD
25ac0cfac4aa7a6facf3b900fc9f01a8c7d954d8
exit 0

git rev-parse --abbrev-ref HEAD
task/core-tech-plan-docs
exit 0

git status --short
(empty before this review file)
exit 0

git rev-parse 25ac0cfac4aa7a6facf3b900fc9f01a8c7d954d8^
e3f23b467103395c465f2b46d89f40a1d290f9d6
exit 0

git diff --stat e3f23b467103395c465f2b46d89f40a1d290f9d6 25ac0cfac4aa7a6facf3b900fc9f01a8c7d954d8
 docs/plans/core-tech/CORE-CHUNKCACHE.md | 2 +-
 docs/plans/core-tech/CORE-PQ.md         | 2 +-
 docs/plans/core-tech/DATA-TICK.md       | 2 +-
 docs/plans/core-tech/README.md          | 2 +-
 4 files changed, 4 insertions(+), 4 deletions(-)
exit 0

git show -s --format=... 25ac0cfac4aa7a6facf3b900fc9f01a8c7d954d8
author=deus-pm <deus-pm@local.invalid>
committer=deus-pm <deus-pm@local.invalid>
authorDate=2026-10-03T01:17:54-05:00
subject=[codex] Correct parked plan provenance and actual path-search bounds
parent=e3f23b467103395c465f2b46d89f40a1d290f9d6
exit 0
```

The full color-off diff is those four single-line replacements. No other hunk. The README order table, the acceptance gates, and the proposed-change sections are outside the hunks.

## F1 cleared — depth grade, old rule, and later rulings

`docs/plans/core-tech/CORE-CHUNKCACHE.md:11` now states the grade as: current z full brightness; visible z−1 about 60% brightness and about 50% desaturation; visible z−2 about 30% brightness and mostly gray; a cool blue on both lower levels; z−3 and deeper not drawn; nothing above current z; lower levels only where every intermediate level is open. It says `docs/systems/DEUS_Depth.md` and DEC-011 on `038a02c3` are the earlier flat 1:1, no-filter rule, with that rule's historical amendment notes, and that they do not contain this later grade. It names D-2026-10-02-19 and D-2026-10-02-26 as the authority that keeps flat 1:1 and amends the shading ban, names D-2026-10-03-1 for the wall frame, and points at the full-SHA GitHub blobs below. It says those files are not merged into this branch or main.

Checked:

- `038a02c3:docs/OWNER_DECISIONS.md:169` heading is `### Decision `DEC-011`: Owner overrides DEC-006/R1 (Option D). Flat layer rendering`. The fragment `decision-dec-011-owner-overrides-dec-006r1-option-d-flat-layer-rendering` is the punctuation-stripped slug (slash deleted, no hyphen inserted), the same rule the aba75071 review used.
- `038a02c3:docs/OWNER_DECISIONS.md:173` is the flat 1:1 ruling: no blur, scale, zoom, parallax, projection offset, ColorMatrix, alpha, tint depth shading, or other filter.
- `038a02c3:docs/OWNER_DECISIONS.md:176` is the art/draw-order amendment. Cues 1–6, including darker baked tile palettes, rim shadows, and height edges, are in scope under DEC-011 as art and draw order. Cues 7–9 (parallax, code haze/darkening, slight scale-down) are a later Owner-led review, off by default. The stub does not say those historical baked palettes were forbidden. It says this base does not contain the later 60% / 50% / 30% grade.
- `038a02c3:docs/systems/DEUS_Depth.md:5` repeats the DEC-011 no-filter ban. `DEUS_Depth.md:28` is scale 1, alpha 1, `filters` null. `git grep` of `60%`, `cool blue`, `cool gray`, and `D-2026-10-02-19` on that file at `038a02c3` returns no hits. The only `desatur` hit under the paired grep is the DEC-011 overlay amendment at `OWNER_DECISIONS.md:177` (overlays stay unfiltered), not the new grade.
- `1f2e637e:docs/DECISIONS.md` D-2026-10-02-19: current z full brightness; z−1 about 60% with a slight cool tint; z−2 about 30%; z−3 and deeper not rendered; nothing above current z; lower levels only where every intervening level is open; brightness in data; flat 1:1 kept; the earlier depth-shading ban explicitly amended.
- Same file, D-2026-10-02-26, extending D-19: through open space only, z−1 about 60% brightness and about 50% desaturated; z−2 about 30% brightness and mostly gray; both use a cool blue cast; water, lava, colonists, and enemies keep some identifying tint; z−3 and deeper not drawn; nothing above current z; flat 1:1 and the open-space rule kept. Wall height left open for D-2026-10-03-1.
- Same file, D-2026-10-03-1: 48 px face + 48 px cap = 96 px total. No re-cut, new art, loader, or wall-renderer work. The stub's wall sentence is that choice, and art wiring stays parked.
- `1f2e637e:docs/art/CAMERA_DEPTH_PLAN.md` table: z−1 about 60% / about 50% desaturated / cool blue cast; z−2 about 30% and mostly gray with a cool blue cast; z−3 not rendered; flat 1:1 retained. Line for D-2026-10-03-1 repeats 48 + 48 = 96. The plan says the exact cool-blue value is unspecified.
- Both GitHub URLs in the stub were fetched on 2026-10-03 and returned those two files at `1f2e637e82ec1f923a4326ab945ce7ccdf4348f9`, including D-19, D-26, D-2026-10-03-1, and the plan grade table.
- `git cat-file -e` of `docs/DECISIONS.md` and `docs/art/CAMERA_DEPTH_PLAN.md` at `25ac0cfa` exits 128. The plan path at `038a02c3` exits 128. `git merge-base --is-ancestor 1f2e637e82ec1f923a4326ab945ce7ccdf4348f9` exits 1 for `25ac0cfa`, for `038a02c3`, and for `origin/main` (`565dc5aead7e068230528d573c395ea21ed5cf5d`). `git branch -a --contains 1f2e637e` lists `task/art-scale-1-docs` and `remotes/origin/task/art-scale-1-docs` only. The "not merged into this branch or main" sentence holds for this tip, for local `main` at `038a02c3`, and for `origin/main`.

The word "slight" on the shared cool blue is D-19's adjective for the z−1 tint. D-26 says "cool blue cast" for both levels and does not say "slight". The plan leaves the exact blue unspecified, and brightness stays in data. That word does not restore the old "cool gray cast" conflation and does not change this verdict.

## F2 cleared — Movement8D bounds

`docs/plans/core-tech/README.md:24` and `docs/plans/core-tech/CORE-PQ.md:7` now say `DEUS_Movement8D.js` runs a binary-heap octile A* with a 200-iteration cutoff, and that the 24×24 window is the comment at line 510 and is not a clamp. `CORE-PQ.md:7` adds that the function uses map dimensions and wrapped neighbors.

On `038a02c3:game/js/plugins/DEUS_Movement8D.js`:

- `PriorityQueue` at `:418-460` is a binary heap: parent `(i - 1) >> 1`, children `(i << 1) + 1`, ordered by `f`. `findDirection8DTo` acquires it from `pqPool` at `:513`.
- `:510` is the only 24×24 text in the function: `// Octile A* Search over a localized 24x24 grid window`.
- `:511-512` read `$gameMap.width()` and `$gameMap.height()`. Neighbor steps at `:562-563` call `roundXWithDirection` / `roundYWithDirection`. No 24-cell origin, radius, or clamp appears in `findDirection8DTo` (`:491-634`).
- `:519-531` is `octileDist` (diagonal cost 14, cardinal 10) when `fourWay` is off. `:542` is `maxIterations = 200`. The loop condition at `:544` stops at that count.
- When `fourWay` is on, the same helper uses a Manhattan cost and the 4-neighbor list (`:531`, `:537`). The stub describes the octile path named by the line 510 comment and by the plugin's 8-way log line at `:652`. It does not reintroduce a 24×24 bound.

The unchanged `World.findPath` clause on both lines (8-way unless 4-way, 12,000-node cap, region and vertical links) was checked in the aba75071 review and is not part of this diff. `CORE-PQ.md:7` still says the contracts need a fresh audit at the implementation SHA.

## DEC-012 citation — not a live 10 Hz claim

`docs/plans/core-tech/DATA-TICK.md:7` still opens as a proposal to measure. The new clause cites DEC-012 for a 10 Hz headless sim and says this stub is not evidence that the running game uses that clock. The minute-tick reconciliation sentence is unchanged. No implementation step was added.

- `038a02c3:docs/OWNER_DECISIONS.md:183` heading is `### Decision `DEC-012`: Sim/render split and level-of-detail simulation are adopted architecture`. The fragment `decision-dec-012-simrender-split-and-level-of-detail-simulation-are-adopted-architecture` matches the same punctuation-stripped slug (`Sim/render` becomes `simrender`).
- DEC-012 item 1 at `038a02c3:docs/OWNER_DECISIONS.md:188`: headless node runs the simulation on its own fixed tick (10 Hz). Item 3 in that entry places the work in milestone M3. The stub's "future headless sim" matches that roadmap. DEC-012's tick is fixed; the stub keeps the parked lane's 10 Hz as a tunable proposal to measure, and it does not rewrite DEC-012 into that proposal.
- `038a02c3:game/js/plugins/DEUS_World.js:722-727` is the live shared tick: 1 tick = 36 game-seconds, advanced on `time:minute`, `secondsPerTick: 36`. That is the minute-driven clock the unchanged half of the sentence already names. It is not a 10 Hz headless clock.

## What did not change

`git diff --stat` is four lines. Compared with the aba75071 checklist, this commit does not change lane order, DEC-037, acceptance gates, vendor or license rules, or the other source claims that review recorded. Those results stand. They were not re-executed here.

The acceptance paragraph in `CORE-CHUNKCACHE.md` remains the next line after the corrected grade and is not in the changed side of the hunk. `DATA-TICK.md` still tells the future brief to reconcile clocks before replacing either. `README.md` still says FlowFields wiring or removal is not part of these stubs.

## What this review did not do

- Did not run `run_tests.bat` or any native, playtest, or browser check. ORG-0.2 owns that slot. No native green and no Deus confirmation is claimed.
- Did not edit the writer files, including the four corrected plans and `docs/reviews/CORE_DATA_GROK_aba75071.md`.
- Did not merge, rebase, squash, force-push, delete, or push `main`.
