# ART-SCALE-1 independent review — Grok 4.7

VERDICT: CLEAN PASS

| Field | Value |
|---|---|
| Reviewer | Grok 4.7 (xAI). Cross-family reviewer. Not the writer. |
| Writer | Codex / GPT (OpenAI). Commit identity `deus-pm <deus-pm@local.invalid>`. Subjects tagged `[codex]`. |
| Writer tip | `ec7e0d6e1eebe7b01ffb92f8eb24ecf653b95bb0` |
| Reviewed range | `15973c414b30e0e2923d47287f075868a63ed896` and `ec7e0d6e1eebe7b01ffb92f8eb24ecf653b95bb0`, against parent `0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a` |
| Branch | `task/art-scale-1-docs` |
| Review date | 2026-10-03 |
| Worktree | `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\art-scale-1-docs` |

This review certifies the documentation diff only. It does not certify a native test run, a Deus claim check, or a fresh SRD 5.1 audit.

## Scope and controlling rules

Reviewed the two follow-up documentation commits on the exact tip above. The Owner rulings those commits record are design-only: five large ships lose true-scale walkable-map dimensions and become N/A future StarCraft-style transport units; Rowboat stays an object; D-2026-10-02-16's ship-map clause is superseded; Divinity: Original Sin-style spell surfaces and the water-in / other-environment-out rulings are recorded; the 23:08 performance plan records only the overlay/log before green and parks the listed optimizations; the 23:25 plan keeps ORG-0.2 at 1×1 and places WORLD-3x3 first after that green result.

Controlling Owner limits for this review, read from `AGENTS.md` and `docs/DECISIONS.md` D-2026-10-02-3: no merge, no force-push, no deletion, no commit or push to `main`. The ORG-0.1 expected-red list only gates CI, hygiene, and docs lanes (ORG-1, ORG-2, ORG-3). ORG-0.2 owns the native slot. This lane is docs-only, so no `run_tests.bat` run was performed and no native RESULT is claimed. `AGENTS.md` §2's general "reviewers run the tests" rule yields to that exemption here. Approved design docs were not edited. The only review output written for commit is this file. Scratch evidence is `scratchpad/art-scale-1-review/check_invariants.mjs` and `scratchpad/art-scale-1-review/csv_invariants.json` (gitignored).

## Commit boundary

Commands (PowerShell; `^` quoted because it is an escape character):

```text
git rev-parse HEAD
ec7e0d6e1eebe7b01ffb92f8eb24ecf653b95bb0
exit 0

git rev-parse --abbrev-ref HEAD
task/art-scale-1-docs
exit 0

git rev-parse "ec7e0d6e1eebe7b01ffb92f8eb24ecf653b95bb0^"
15973c414b30e0e2923d47287f075868a63ed896
exit 0

git rev-parse "15973c414b30e0e2923d47287f075868a63ed896^"
0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a
exit 0

git merge-base --is-ancestor 0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a ec7e0d6e1eebe7b01ffb92f8eb24ecf653b95bb0
exit 0

git diff --name-status 0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a ec7e0d6e1eebe7b01ffb92f8eb24ecf653b95bb0
M docs/DECISIONS.md
M docs/WBS_INDEX.md
M docs/WBS_ORG.md
M docs/WBS_SIM.md
M docs/WBS_SPLIT.md
M docs/art/srd_sizes/SIZES.md
M docs/art/srd_sizes/items.csv
exit 0

git diff --stat 0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a ec7e0d6e1eebe7b01ffb92f8eb24ecf653b95bb0
7 files changed, 71 insertions(+), 31 deletions(-)
exit 0
```

`git status --short` before this review file was empty (exit 0). No `game/`, `art/` binary, engine, credential, or provider-status path is in the diff. `15973c41` changes `docs/DECISIONS.md`, `docs/WBS_SIM.md`, `docs/art/srd_sizes/SIZES.md`, and `docs/art/srd_sizes/items.csv` (4 files, +29/−21). `ec7e0d6e` changes `docs/DECISIONS.md`, `docs/WBS_INDEX.md`, `docs/WBS_ORG.md`, `docs/WBS_SIM.md`, and `docs/WBS_SPLIT.md` (5 files, +42/−10).

Author and committer of both reviewed commits: `deus-pm <deus-pm@local.invalid>`. Dates: `15973c41` 2026-10-02 23:46:02 −0500; `ec7e0d6e` 2026-10-02 23:57:40 −0500.

## Ships, D-16 supersession, spell surfaces, water

Checked against the committed text, not against a re-audit of the SRD PDF.

- `docs/DECISIONS.md:28` records D-2026-10-02-21 (22:42 CT): five large ships skipped for now; future ships are StarCraft-style transport units; a ship sprite carries units; no true-scale walkable tile map; Rowboat remains an object; Feather Token and Folding Boat walkable-map forms are withdrawn; SRD-stated dimensions stay source facts, not approved game geometry; this supersedes only the ship-map clause of D-2026-10-02-16.
- `docs/DECISIONS.md:49` rewrites the D-2026-10-02-16 ship sentence to that supersession. Rowboat remains an object. The same cell still allows labeled real-world estimates where the SRD is silent. That matches "supersedes only the ship-map clause": historical feet stay in notes and are marked not approved.
- `docs/art/srd_sizes/SIZES.md:24` states large ships are parked transport units and that the table approves no large-ship sprite dimensions or footprints.
- `docs/art/srd_sizes/SIZES.md:85` sets the Galley summary sprite and footprint to N/A. Rowboat at `SIZES.md:84` stays 144×48, footprint 3×1, door NO, 100 lb.
- `docs/art/srd_sizes/SIZES.md:88-90` names Keelboat, Longship, Sailing ship, Warship, and Galley; retires prior map bounds; keeps Rowboat's existing row; keeps Feather Token's SRD 50×20-ft swan boat and Folding Boat's SRD box / 10×4×2-ft boat / 24×8×6-ft ship as source dimensions that do not approve walkable maps. The small Folding Boat form remains an object. The token and box keep their item sprites.
- `docs/art/srd_sizes/items.csv:216-220` are the only five `vehicle (water)` rows besides Rowboat. Each has `sprite_w`, `sprite_h`, and `footprint_tiles` = `N/A`, door `NO`, blank weight, and a note that says future StarCraft-style transport unit, no walkable tile map, sprite/footprint TBD, and that the historical feet are not approved game geometry. Category, held overlay, door, and weight were not changed. Prior map pixels and tile envelopes (including Galley 1536×384 and 32×8) are gone from those columns.
- `docs/art/srd_sizes/items.csv:215` Rowboat is byte-identical to `0c94cb23`: 144, 48, 3×1, door NO, weight 100, category `vehicle (water)`, note still "Object, not a walkable tile map".
- `items.csv:313` Feather Token keeps sprite 3×6 and door YES. The note drops the 10×4 / 480×192 walkable map and keeps the SRD 50×20-ft swan boat as a future transport unit with TBD sprite. The 60-ft tree art estimate remains labeled as an estimate.
- `items.csv:318` Folding Boat keeps sprite 12×6, door YES, weight 4. The note keeps the SRD box, keeps the 10×4×2-ft boat as an object, labels 120×48 and 2×1 as art estimates, and moves the 24×8×6-ft ship off the walkable map onto a TBD transport sprite. Only the notes column changed for these two rows.
- `docs/DECISIONS.md:27` records D-2026-10-02-22: Divinity: Original Sin-style tile surfaces instead of a per-spell full-world function; SRD 5.1 damage, range, saves, and area kept; surfaces oil, water, ice, blood, poison, fire, steam, electrified water, and mud (nine); six reactions (fire+oil=fire, water+fire=steam, cold+water=ice, lightning+water=electrified water, fire+poison=explosion, fire+ice=water); spells, items, and the environment apply elements; new spells are data; every reaction needs a before/after fixture; no spell implementation.
- `docs/WBS_SIM.md:26` and `docs/WBS_SIM.md:40` repeat that surface list, those six fixtures, the unchanged SRD damage/range/saves/area rule, and data-only new spells. Ships are parked there under D-21.
- `docs/DECISIONS.md:26` records D-2026-10-02-23: depth 0–7; flow to neighbors and down an open z level; simple pressure; active cells are moving or near the player/colonists; settled water sleeps until disturbed; fixtures are basin levels, a hole draining to the lower z, total water conservation, and an active-cell budget; no numeric budget; seasons, weather, vegetation growth, rare disasters, erosion, and migration stay parked; no runtime change.
- `docs/WBS_SIM.md:26` and `docs/WBS_SIM.md:38` match that water scope and the parked list. No budget number was added.

Repo search for `walkable tile map`, `MAP BOUNDS`, and `32x8` after the diff finds those phrases only in the withdrawal sentences and in historical-note wording that says the bounds are not approved. No remaining approved walkable-map footprint was found in the tracked markdown, CSV, JSON, or JS search.

## Performance plan (23:08) and WORLD-3x3 (23:25)

- `docs/DECISIONS.md:16-18` D-2026-10-02-24: the only pre-green performance work is an overlay and log of frame milliseconds, simulation-tick milliseconds, draw milliseconds, worldgen/load milliseconds, and heap size; NW.js DevTools; baseline at a recorded green SHA once one exists; no optimization or new simulation/render lane before ORG-0.2 is green. Parked later work matches the brief: Comlink workers with plain-data snapshots while RMMZ draws only; static Pixi `RenderTexture` chunks, visible only, dirty rebuild; pooling, typed arrays, no per-frame allocations; stagger every N ticks, off-screen work roughly once per second, per-system millisecond budget; reachability before A* and cached routes; WASM only if profiling shows hot water or pathfinding loops; same-seed before/after overlay numbers required. N, per-system budgets, and a pass threshold are explicitly not fixed. "Roughly once per second" is parked plan wording, not a pass threshold.
- Comlink is recorded as Apache-2.0 at version 4.4.2, with the future version not pinned and a licensing-register entry required before reuse. The same statement is at `docs/WBS_SIM.md:32` and `docs/WBS_SPLIT.md:18`. No package manifest in this diff pins a version.
- `docs/WBS_SIM.md:3` and `docs/WBS_SIM.md:22` limit pre-green SIM-5 work to that overlay/log. `docs/WBS_INDEX.md:5` and `docs/WBS_INDEX.md:10` say the same. `docs/WBS_ORG.md:37` and `docs/WBS_ORG.md:73` place the overlay in the current order as measurement, and keep later optimization parked.
- `docs/DECISIONS.md:10-14` D-2026-10-02-25: ORG-0.2 remains 1×1; WORLD-3x3 is the first M1 item after ORG-0.2 is green; Claude writes, Codex reviews cross-family, Deus checks on the laptop; planned defaults `AreasX=3`, `AreasY=3`, `AreaSize=256`, wrap on all edges; New Game generates the start area and every faction-home area and home floor; other areas and levels are on request; no faction starts late. DEC-065 and DEC-070 are carried forward, including lazy-versus-eager and build-order equivalence, time-dependent registration or catch-up, and condition C's eager fallback. Transient ordinary wildlife is excluded from the per-area checksum; spawn designations, lairs/dens, depletion, and persistent notables are included. The Owner-accepted narrowing of the all-32-levels-at-New-Game request is stated, and the conditional eager fallback is kept. At 3×3 the M1 gates are re-run: 5–10 recorded seeds, deterministic hash, load-time budget, identical-hash save/load. Seed `1920951434` includes year 500 and side-by-side 1×1 versus 3×3 New Game overlay measurements at recorded SHAs. Camp, density, and ecology thresholds are rechecked and labeled per-area or per-world. Numeric load-time limits and missing thresholds stay TBD. DEC-037 remains in force. The entry says this is not a claim that 3×3 has shipped and not permission to change ORG-0.2's scope.
- `docs/WBS_ORG.md:29-35` maps WORLD-3x3 onto existing leaves WG.00.25 and WG.00.26 without opening those lanes. Those leaves exist at `docs/worldgen/DEUS_WORLDGEN_WBS.md:121-122` and are still `PLANNED`. The new row repeats the grid, wrap, New Game rule, DEC-065/070 equivalence, condition-C eager fallback, checksum contents, seed `1920951434`, year 500, 1×1/3×3 overlay, per-area versus per-world thresholds, no invented thresholds, the full hard-gate re-run, and Claude / Codex / Deus roles. Status text: `DESIGN ONLY; first M1 item after ORG-0.2 green; no implementation launched`.
- `docs/WBS_SIM.md:34` and `docs/WBS_SPLIT.md:3` and `:20` keep the same order and say the 3×3 item does not release DEC-037 or replace the hard gates with the soft split work.
- Context read, not rewritten by this diff: `docs/OWNER_DECISIONS.md:449` (DEC-030: 3×3 of 256×256, wrap on all edges); `docs/OWNER_DECISIONS.md:595` (DEC-038 item 7: 768×768 / 3×3 regions as the v1 envelope; 3×256 = 768, consistent with the new defaults); `docs/OWNER_DECISIONS.md:1125-1157` (DEC-065, including the 2026-10-02 Owner acceptance of the all-32-levels narrowing at line 1157); `docs/OWNER_DECISIONS.md:1205-1214` (DEC-070 conditions A–C at line 1210, and the wildlife checksum amendment at line 1214). The new text matches those rulings. It cites condition C instead of redefining the eager rule; the precise "all 32 levels of every area at New Game" sentence remains at `OWNER_DECISIONS.md:1210`.
- Static source read on this tip, not an execution: `game/js/plugins/DEUS_World.js:15` `@default 1` for AreasX, `:22` AreasY default 1, `:29` AreaSize default 256 with max 256; `:142-144` fallbacks `areasX: 1`, `areasY: 1`, `size` capped at 256. `game/js/plugins.js:67-71` enables `DEUS_World` with `"parameters": {}`, so those defaults are what the registered plugin uses. These files are not in the reviewed diff. They support the statement that this record does not ship 3×3 and that ORG-0.2's current grid is 1×1. Seed `1920951434` with year 500 is already the controlled scenario named in `docs/reviews/ORG_SETUP_2ffa0d3a_CODEX.md:21`. This review did not re-run it. No new camp, density, ecology, load-time, or FPS threshold number was introduced.

## CSV and table invariants

Parser: `node scratchpad/art-scale-1-review/check_invariants.mjs` (exit 0). It parses quoted CSV from `git show` of the tip and of `0c94cb23`. Results also in `scratchpad/art-scale-1-review/csv_invariants.json`.

| Check | Result |
|---|---|
| Header | `name,category,sprite_w,sprite_h,footprint_tiles,held_overlay,door,weight_lb,notes` at both commits |
| Item data rows | 514 at `0c94cb23` and 514 at the tip. No added or removed names. No duplicate names. Every row has 9 fields. |
| Rows whose fields changed | Exactly Keelboat, Longship, Sailing ship, Warship, Galley, Feather Token, Folding Boat |
| Non-numeric `sprite_w` / `sprite_h` | Only those five ships, all `N/A` |
| Water vehicles | Rowboat, Keelboat, Longship, Sailing ship, Warship, Galley |
| `creatures.csv` blob | `git rev-parse` of `TIP:docs/art/srd_sizes/creatures.csv` equals the blob at `0c94cb23`. Parsed data rows: 319. |
| Documented counts | `docs/art/srd_sizes/SIZES.md:3` still says 319 creature rows and 514 item rows. Those counts match the parsed files. This is a row-count check, not an SRD content audit. The count sentence was not part of this diff. |

## Links and Comlink license

Relative targets named by the new or updated paragraphs exist (PowerShell `Test-Path`, exit 0): `docs/OWNER_DECISIONS.md`, `docs/WBS_ORG.md`, `docs/WBS_SIM.md`, `docs/WBS_SPLIT.md`, `docs/DECISIONS.md`, `docs/art/srd_sizes/SIZES.md`, `docs/art/srd_sizes/items.csv`, `docs/art/srd_sizes/creatures.csv`, `docs/art/CAMERA_DEPTH_PLAN.md`, `docs/research/README.md`, `docs/worldgen/DEUS_WORLDGEN_WBS.md`.

Fetched on 2026-10-03:

- `https://raw.githubusercontent.com/GoogleChromeLabs/comlink/v4.4.2/package.json` — `"version": "4.4.2"`, `"license": "Apache-2.0"`. Not MIT.
- `https://raw.githubusercontent.com/GoogleChromeLabs/comlink/v4.4.2/LICENSE` — Apache License Version 2.0, January 2004, with the Google Inc. appendix. This is the file at the tag cited by the GitHub blob URL in `docs/DECISIONS.md:18`, `docs/WBS_SIM.md:32`, and `docs/WBS_SPLIT.md:18`.

The HTML blob page itself was not downloaded. The raw license file at that tag was.

## Local node checks, not native proof

```text
node tools/ci/syntax_check.js
syntax_check: 1166 files checked (72 plugins incl. plugins.js, 74 sim, 1020 tools), 0 failed; 1 allowlisted invalid fixture(s) skipped
exit 0

node tools/ci/check_root.js
check_root: 0 disallowed .js/.png/.zip file(s)
exit 0
```

These are the repo's node CI hygiene checks. They are not `run_tests.bat` and they are not evidence that worldgen, the overlay, or 3×3 works.

## Notes that do not fail the verdict

- `docs/WBS_INDEX.md:19` still cites ART-SCALE-1 as D-2026-10-02-16/-17. The ship supersession is D-21, and it is in `docs/DECISIONS.md:28` and `docs/DECISIONS.md:49`, in `SIZES.md`, and in `items.csv`. The index priority paragraph at `docs/WBS_INDEX.md:5` already points at D-2026-10-02-8 through -25. The ART-SCALE row still says the tables are parked until the world loads green, which remains true. The linked `SIZES.md` contains the correction.
- `docs/WBS_ORG.md:22` still says the multi-seed gate is planned after ORG-0.2 green. `docs/WBS_ORG.md:35` and `docs/WBS_ORG.md:73` require those same gates to be re-run at 3×3 before leaving worldgen. The later sentences are the 23:25 order. They do not invent a 1×1-only exit.
- `AGENTS.md` still describes WBS-SIM and WBS-SPLIT as parked. `AGENTS.md` says a direct Owner instruction wins and is recorded in `docs/DECISIONS.md`. D-24's overlay exception is recorded there. This diff does not implement the overlay.
- DEC-030's "other eight areas at ADR-003 LOD" sentence was not restated. The new WORLD-3x3 text does not cancel it.

## Unperformed checks

- `run_tests.bat` was not run. No native NW.js RESULT line was produced. No suite, seed, or screenshot from this session is claimed. ORG-0.2 owns the native slot. The expected-red docs exemption is why this review does not treat a missing native run as a docs failure.
- No Deus claim check was requested or performed. This file is not a Deus CONFIRMED, PARTIAL, or FALSE verdict.
- No fresh SRD 5.1 PDF audit. Creature and item row counts were compared with the parent commit and with the existing count sentence only.
- No game boot, worldgen, save/load, overlay, heap sample, DevTools session, or 1×1 versus 3×3 measurement. Seed `1920951434` / year 500 was not executed.
- `DEUS_World.js` was read for parameter defaults. It was not loaded in NW.js or Node.
- No browser or UI pass. This diff has no UI.
- The GitHub HTML page for the Comlink LICENSE blob URL was not fetched. The raw LICENSE at tag `v4.4.2` was.
- Historical code line numbers inside the DEC-065 entry were not re-checked against current `game/js` files. The ruling text at the cited `OWNER_DECISIONS.md` lines was read.
- No art was generated. No approved design doc was edited. No merge, force-push, file delete, or `main` commit or push was done.

VERDICT: CLEAN PASS
