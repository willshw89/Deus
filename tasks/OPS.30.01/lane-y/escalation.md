# OPS.30.01 lane-y escalation: three gate suites fail on CRLF checkouts, which is how merge_gate.js clones here

**Raised by:** claude (writer), 2026-09-26. **Standing rule 6:** a bug in read-only shared files blocks one of this
lane's own gateTests in the merge gate. Nothing outside allowedPaths was changed and no workaround was applied.

## What was observed

1. `node tools/ops/run_gate.js` (lane.json gateTest 3) in a clone made the way `merge_gate.js` makes one
   (`git clone --shared --no-checkout <common dir>` + `checkout --detach`, `tools/governance/merge_gate.js:605-608` at
   the base; this machine has `git config --system core.autocrlf` = `true` and the repo has no `.gitattributes`, so
   the working files are CRLF) ended `RESULT: 6 passed, 3 failed`, `EXIT=1`
   (`evidence/gatetests_clone_gate.log`):
   - `tools/test_strata_cuts_and_caves.js` EXIT=2: `HARNESS shafts_keep_fluid: the shaft loop to instrument is
     missing` (the anchor check at `tools/test_strata_cuts_and_caves.js:985`), all 18 checks otherwise passing.
   - `tools/test_new_game_year0.js` EXIT=1: `Override anchor found 0 times in DEUS_FactionMenus.js:
     this._factionIndex = 0;` (`tools/test_new_game_year0.js:49`).
   - `tools/test_historical_carrying_capacity.js` EXIT=1: `CANDIDATE_MISMATCH: working plugin differs from frozen
     candidate` (a sha256/length check of the working file, `tools/test_historical_carrying_capacity.js:95`).
2. A/B on that same clone and commit (`evidence/crlf_ab.log`): with the CRLF checkout the three suites give
   `RESULT: 0 passed, 3 failed`, `EXIT=1`; after `git config core.autocrlf false; git rm -q --cached -r .;
   git reset -q --hard` (LF files) they give `RESULT: 3 passed, 0 failed`, `EXIT=0`. Line endings are the only
   difference.
3. The brief's census and gate runs use `git clone -c core.autocrlf=false` (LF). There all 9 gate suites pass in gate
   mode (`evidence/gate_fresh_clone.log`, `EXIT=0`), and `run_gate.js` exits 1 with one suite deliberately broken
   (`evidence/gate_broken_suite.log`).

## Consequence

On this machine, `merge_gate.js` would refuse lane-y at TESTS (`TEST_FAILED`, test 3), and it would do the same to
any lane whose gateTests run one of these three suites, whatever the lane changed. `quarantine.json` describes LF
checkouts, as briefed; how the other suites behave on CRLF checkouts was not measured.

## Options (PM / Owner decision; none applied)

- (a) `merge_gate.js` clones with `-c core.autocrlf=false` (Lane I/G1 file, outside this lane).
- (b) Add a `.gitattributes` (for example `* text=auto eol=lf`) so every checkout is LF (repo-wide decision).
- (c) Make the three suites line-ending-proof (anchors, hashes of normalised text): OPS.30.04 work.
- (d) Merge this lane manually (as the recent lanes were) and treat the CRLF behaviour as a separate defect.

Everything else in this lane is finished and reported in `REPORT.md`; the branch is pushed.
