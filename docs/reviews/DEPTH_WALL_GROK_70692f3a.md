# Depth wall independent review — Grok 4.7

VERDICT: CLEAN PASS

| Field | Value |
|---|---|
| Reviewer | Grok 4.7 (xAI). Cross-family reviewer. Not the writer. |
| Writer | Codex / GPT (OpenAI). Commit identity `deus-pm <deus-pm@local.invalid>`. Subjects tagged `[codex]`. |
| Writer tip | `70692f3a8b858cc276d6171a53017c159edbffc9` |
| Reviewed range | `f918f652cef2590484a2679a1518789817f49130` and `70692f3a8b858cc276d6171a53017c159edbffc9`, against parent `dce81896b13113482d7ef573d34794ec9491beb4` |
| Branch | `task/art-scale-1-docs` |
| Review date | 2026-10-03 |
| Worktree | `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\art-scale-1-docs` |

This review certifies the documentation diff only. It does not certify a native test run, a Deus claim check, or an art recut. The earlier review `docs/reviews/ART_SCALE_1_GROK_ec7e0d6e.md` stays as written and does not cover these two commits.

## Scope and controlling rules

Reviewed the parked depth-extension record and the later wall-frame record. The 2026-10-02 23:54 CT ruling (D-2026-10-02-26) extends D-2026-10-02-19 and stays design-only until ORG-0.2 is green. The 2026-10-03 Owner choice (D-2026-10-03-1) closes the wall-height question as 48 px face + 48 px cap = 96 px total and rejects the 96 px face / 144 px frame. No recut, new art, or renderer work is authorized.

Controlling Owner limits for this review, read from `AGENTS.md` and `docs/DECISIONS.md` D-2026-10-02-3: no merge, no force-push, no rebase or squash, no deletion, no commit or push to `main`. The ORG-0.1 expected-red list only gates CI, hygiene, and docs lanes (ORG-1, ORG-2, ORG-3). ORG-0.2 owns the native slot. This lane is docs-only, so no `run_tests.bat` run was performed and no native RESULT is claimed. `AGENTS.md` §2's general "reviewers run the tests" rule yields to that exemption here. Writer docs and the prior review were not edited. The only review output written for commit is this file. Command notes are in gitignored `scratchpad/depth-wall-review/static_checks.txt`.

## Commit boundary

Commands (PowerShell):

```text
git rev-parse HEAD
70692f3a8b858cc276d6171a53017c159edbffc9
exit 0

git rev-parse --abbrev-ref HEAD
task/art-scale-1-docs
exit 0

git merge-base --is-ancestor dce81896b13113482d7ef573d34794ec9491beb4 70692f3a8b858cc276d6171a53017c159edbffc9
exit 0

git diff --name-status dce81896b13113482d7ef573d34794ec9491beb4 70692f3a8b858cc276d6171a53017c159edbffc9
M docs/DECISIONS.md
M docs/WBS_INDEX.md
M docs/art/CAMERA_DEPTH_PLAN.md
exit 0

git diff --stat dce81896b13113482d7ef573d34794ec9491beb4 70692f3a8b858cc276d6171a53017c159edbffc9
3 files changed, 23 insertions(+), 9 deletions(-)
exit 0
```

`git status --short` before this review file was empty (exit 0). No `game/`, `art/` binary, engine, library, credential, or provider-status path is in the diff.

`f918f652cef2590484a2679a1518789817f49130` parents `dce81896`. It changes `docs/DECISIONS.md`, `docs/WBS_INDEX.md`, and `docs/art/CAMERA_DEPTH_PLAN.md` (3 files, +19/−9). Author and committer `deus-pm <deus-pm@local.invalid>`. Date 2026-10-03 00:24:03 −0500. Subject: `[codex] Record parked depth rims, wall faces and cached shading`.

`70692f3a8b858cc276d6171a53017c159edbffc9` parents `f918f652`. It changes `docs/DECISIONS.md` and `docs/art/CAMERA_DEPTH_PLAN.md` (2 files, +6/−2). Same author and committer. Date 2026-10-03 00:32:36 −0500. Subject: `[codex] Record Owner choice of 48px wall face and 48px cap`.

## D-2026-10-02-26 coverage

Checked against the committed text at the tip.

- `docs/DECISIONS.md:14` records D-2026-10-02-26 (23:54 CT) as an extension of D-2026-10-02-19. A drop edge gets a 2–4 px dark rim and a short shadow onto the lower level. Lower wall faces use the Owner's cliff art after ART-WIRE-WALLS. Current z stays full brightness. Through open space only, z-1 is about 60% brightness and about 50% desaturated; z-2 is about 30% brightness and mostly gray. Both use a cool blue cast. Water, lava, colonists, and enemies retain some identifying tint. z-3 and deeper stay black and are not drawn. Nothing above current z is drawn.
- The same paragraph preserves D-2026-10-02-19's every-intervening-level-open rule, flat 1:1 geometry, and data-configurable brightness. `docs/DECISIONS.md:56` still holds the earlier 22:32 CT row, including the vaguer "slight cool tint" and the three-deep shaft fixture. The later entry says it extends that row. The earlier row was not deleted.
- `docs/DECISIONS.md:16` bakes the static depth grade into cached chunks, rebakes only chunks affected by digging, building, or collapse, and applies a live tint only to moving sprites. It forbids rendering all lower levels and then darkening or covering them. Future acceptance adds same-seed before/after performance-overlay readings and a z0-into-shaft screenshot for Owner review, on top of the existing draw-count, open-space, and data-config fixtures. It sets no numeric performance pass threshold. The entry is design-only until ORG-0.2 is green, and DEC-037 remains in force.
- The 2–4 px rim is the Owner's stated range. The shadow length stays "short", with no invented pixel length. Brightness and desaturation stay "about" values and remain data-configurable. No cool-blue hex, FPS number, chunk size, or pass threshold was added.
- `docs/art/CAMERA_DEPTH_PLAN.md:3` cites 22:27, 22:32, and 23:54 CT as D-2026-10-02-18, -19, and -26, keeps the plan queued behind ORG-0.2, and keeps DEC-037 in force.
- `docs/art/CAMERA_DEPTH_PLAN.md:23-27` matches the grade and the draw rules: full brightness on the current z; z-1 about 60% / about 50% desaturated / cool blue, only through open space; z-2 about 30% and mostly gray with a cool blue cast, only where the current level and z-1 are open; z-3 and deeper not rendered. Above current z is never drawn.
- `docs/art/CAMERA_DEPTH_PLAN.md:29` keeps the every-intervening-level rule, the relative two-level draw limit, flat geometry, and data-config brightness. The exact cool-blue value stays unspecified. Water, lava, colonists, and enemies retain some identifying tint.
- `docs/art/CAMERA_DEPTH_PLAN.md:31-33` records the 2–4 px rim, the short shadow, cliff-art faces after ART-WIRE-WALLS, the ban on drawing every lower level and then darkening, cached-chunk baking, rebake on dig/build/collapse, and live tint for moving sprites only. It claims no measured FPS or draw-time improvement.
- `docs/art/CAMERA_DEPTH_PLAN.md:41-46` updates checks 5 and 6 and adds checks 9 and 10: the z0 shaft screenshot for Owner review, zero draws past the two lower levels, no rebake of unchanged static chunks, live tint on moving sprites, and same-seed overlay readings of frame, tick, draw, worldgen/load milliseconds, and heap. Check 10 forbids claiming an unmeasured or unapproved gain or pass threshold. `docs/art/CAMERA_DEPTH_PLAN.md:48` still says these checks are planned, not run.
- `docs/art/CAMERA_DEPTH_PLAN.md:19` still withholds per-level scaling, projection offset, parallax, and blur. That sentence was already present and was not rewritten by this diff.
- `docs/WBS_INDEX.md:20` points the UI-FULLSCREEN / depth-plan row at `docs/art/CAMERA_DEPTH_PLAN.md` and D-2026-10-02-18/-19/-26. The status text names the later rim, cliff faces, cached grade, and Owner shaft screenshot, and says no runtime work is authorized.

## D-2026-10-03-1 supersession

At `f918f652`, before the height commit, D-2026-10-02-26 said wall-face height remained an open Owner choice between 48 and 96 px and that the 23:54 ruling did not resolve that dimension. The plan said the same and said it did not change the existing size tables.

At the tip:

- `docs/DECISIONS.md:8` records D-2026-10-03-1. The Owner chose 48 px face + 48 px cap = 96 px total frame. The proposed 96 px face / 144 px frame is not selected. The entry says this resolves the open question in ART-WIRE-WALLS and in D-2026-10-02-26. It does not authorize re-cutting, new art, a runtime loader, or wall-renderer changes. ART-WIRE-WALLS stays parked until ORG-0.2 is green. ART-IMPORT-CLIFFS is described as preserving source art only.
- `docs/DECISIONS.md:14` now says the height was unresolved at the 23:54 ruling and that D-2026-10-03-1 later selects 48 px face + 48 px cap. The 23:54 grade, rim, cache, tint, and parking text remains in place.
- `docs/DECISIONS.md:16` still says no wall-face height was chosen in that 23:54 entry. Read with line 14, "here" is the 23:54 ruling. The later choice lives in D-2026-10-03-1, not in a silent rewrite of the 23:54 grade.
- `docs/art/CAMERA_DEPTH_PLAN.md:31` states the same 2026-10-03 choice, says the 96 px face proposal is not selected, and withholds new art, re-cutting, and renderer changes before ORG-0.2 is green.
- A search of the three scoped files at the tip for `between 48 and 96`, `remains an open`, and `remains an Owner choice` returned no matches (`git grep` exit 1). The question is not left open.
- `docs/DECISIONS.md:59` still preserves 96 px walls as 48 face + 48 cap under D-2026-10-02-16. `docs/art/srd_sizes/SIZES.md:11` still says walls total 96 px: 48 px face + 48 px cap. The blob of `docs/art/srd_sizes/SIZES.md` is `3c2c4f3c975894d521224b4ab5f3301573768da3` at both `dce81896` and the tip. This diff does not recut or rewrite the size table. The chosen frame matches that already recorded scale.

## WBS art-row reference

`docs/WBS_INDEX.md:19` now cites D-2026-10-02-16/-17/-21 and says the ship-map supersession is recorded, with implementation parked until the world loads green. That matches `docs/DECISIONS.md:38` and `docs/DECISIONS.md:59`, and `docs/art/srd_sizes/SIZES.md:24` and `:88`. The blob of `docs/art/srd_sizes/items.csv` is `c069949581bf0a0c8431da58609b6d5576d976b5` at both the parent and the tip, so this diff did not reopen ship footprints. The row change is the citation fix already covered by the prior ship ruling.

## Links and local node checks

Relative and index targets named by the changed rows exist (`Test-Path`, exit 0): `docs/DECISIONS.md`, `docs/WBS_INDEX.md`, `docs/art/CAMERA_DEPTH_PLAN.md`, `docs/art/srd_sizes/SIZES.md`, `docs/systems/DEUS_Depth.md`, `docs/OWNER_DECISIONS.md`, `docs/WBS_ORG.md`, `docs/WBS_SIM.md`, `docs/WBS_SPLIT.md`.

Cited decision ids D-2026-10-02-16, -17, -18, -19, -21, -26, and D-2026-10-03-1 each appear in `docs/DECISIONS.md`. D-2026-10-03-1 and D-2026-10-02-26 each have one definition.

```text
node tools/ci/syntax_check.js
syntax_check: 1166 files checked (72 plugins incl. plugins.js, 74 sim, 1020 tools), 0 failed; 1 allowlisted invalid fixture(s) skipped
exit 0

node tools/ci/check_root.js
check_root: 0 disallowed .js/.png/.zip file(s)
exit 0
```

These are the repo's node CI hygiene checks. They are not `run_tests.bat` and they are not evidence that depth shading, chunk rebake, or wall faces work.

## Notes that do not fail the verdict

- `docs/WBS_INDEX.md:3` still says "Updated 2026-10-02", and `docs/WBS_INDEX.md:5` still points the priority paragraph at 21:56–23:25 CT and D-2026-10-02-8 through -25. The depth row at line 20 carries D-2026-10-02-26. The index does not cite D-2026-10-03-1 by id. The linked plan states that choice, and the index does not still say the height is open.
- `docs/art/CAMERA_DEPTH_PLAN.md:3` lists the 23:54 CT decision and does not repeat D-2026-10-03-1 in the status line. The height choice is in the body at line 31.
- `docs/systems/DEUS_Depth.md:3` still summarizes the 22:32 CT grade ("slight cool tint") and points at the camera/depth plan for the controls. That file is outside this diff. The plan is the updated control text.
- D-2026-10-03-1 also says ART-WIRE-WALLS stays parked with Claude writing, Codex/GPT reviewing, and Owner screenshots for cave limestone and each of the three selected cliff sets at z=0 and z=-1. This branch has no ART-WIRE-WALLS brief that names those sets. The sentence approves no file, no recut, and no start. The three sets are not enumerated here, so this commit does not select cliff assets.
- The docs say water, lava, colonists, and enemies keep some identifying tint, and that only moving sprites take a live tint. They do not invent a separate bake-or-live rule for water and lava autotiles. That mechanism stays unspecified.

## Unperformed checks

- `run_tests.bat` was not run. No native NW.js RESULT line was produced. No suite, seed, or screenshot from this session is claimed. ORG-0.2 owns the native slot. The expected-red docs exemption is why this review does not treat a missing native run as a docs failure.
- No Deus claim check was requested or performed. This file is not a Deus CONFIRMED, PARTIAL, or FALSE verdict.
- No game boot, depth fixture, chunk rebake, overlay reading, or wall-art screenshot was produced. The z0-into-shaft image named in the plan was not captured.
- No art file was opened or compared. The 48+48 frame was checked as text against `docs/DECISIONS.md` and `docs/art/srd_sizes/SIZES.md` only.
- No browser or UI pass. This diff has no UI.
