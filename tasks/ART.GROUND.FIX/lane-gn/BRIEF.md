# lane-gn: a ground-art check that fails once the art is on main (fix after lane-cy2)

| Field | Value |
|---|---|
| WBS | ART.GROUND.FIX |
| taskId (manifest) | ART.GROUND.FIX |
| Branch | `task/lane-gn` |
| Manifest | `tasks/ART.GROUND.FIX/lane-gn/lane.json` |
| Writer -> reviewer | gemini -> codex (Owner: "Keep gemini coding too": a small focused change) |
| Dependencies | lane-cy2, merged `ee38f9bc` |
| RMMZ editor must be closed | no |

Base: `main` at `df911859` or later.

## The defect

lane-cy2 added a check to `tools/art/verify_specimens_rgb.js` that Outside_A2.png slots 0 and 1 and the Outside_D swatches 0 and 1 are not main's old flat tiles. It reads "main's tiles" from the live ref `origin/main` (line 12, `mainSheet`). After the lane merged, `origin/main` holds the Owner masters, so the script now exits 1 with `[FAIL] Outside_A2.png slot 0 still equals origin/main` on main itself (Grok's review `review_grok_5703d109.md`, which found it when it ran against the merged state). A check must compare with a fixed baseline, never a moving ref.

## Change

In `tools/art/verify_specimens_rgb.js`, make `mainSheet` read the same pinned commit that `baseline()` uses (`a5255704`, the lane's base: its tileset sheets are main's pre-lane sheets), and reword the three messages and the OK line that say "origin/main" to say "the pre-lane sheets (a5255704)". Change nothing else in the file. Do not reformat.

## Tests (lane.json gateTests; each runs in a fresh clone)

- `node tools/check_deus_syntax.js`
- `node tools/art/verify_specimens_rgb.js` must exit 0 on this branch, with the OK line for slots 0 and 1 and the swatches.
- `node tools/art/test_ground_kept_sets.js` must still exit 0.

Show the check can still fail (AGENTS.md Rule 4): in a temp copy replace Outside_A2.png slot 0 with the `a5255704` tile (`git show a5255704:game/img/tilesets/Outside_A2.png`, cut with the script's own `block()` helper) and quote the script exiting 1 with the new message. Show it also exits 0 when run from a clone made after any later main commit (the point of the fix): a fresh `git clone --shared` of this branch is enough.

## Out of scope

Any other file. Any art.

## Rules

Commit only on `task/lane-gn` with the `[gemini]` tag (authored deus-gemini by the signing rule in MSG-PRUNE-PM-131), staging only the manifest paths. Push the branch and end with FINAL SHA. The reviewer is launched through `tools/ops/launch_worker.ps1`, writes the review file and commits it in its own run. The PM or AG merges through merge_gate (AG may not merge a lane whose writer is Gemini: DEC-082). Report in one paragraph plus the test output (DEC-085; this lane touches no `game/`).
