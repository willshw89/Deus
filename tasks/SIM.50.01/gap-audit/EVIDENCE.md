# SIM.50.01 gap audit: evidence

- Deliverable: `docs/audits/LIVING_WORLD_GAP_AUDIT.md`
- Code audited: `main` at `75cf2ff3`
- Run: 2026-09-26, in worktree `task/gap-audit`, Node v24, Git Bash. Each exit code was captured right after its command.

## Files in this folder

| File | What it is |
|---|---|
| `BRIEF.md`, `lane.json` | The coordinator's brief and lane manifest. They were present and untracked when the lane opened, and this commit leaves them untracked (they are not the writer's files). |
| `verify_citations.js` | Checks every `file:line` citation in the audit against a commit: the file exists, the lines exist, and every evidence-table excerpt is on the cited line. `--selftest` doctors three rows (a wrong excerpt, a line past the end of the file, a missing file) and passes only if all three are reported. |
| `probe_fluid_require_binding.js` | Loads `DEUS_Fluid.js` from the commit with Node `require()` and as a classic script, then reports whether `window.UF.Fluid` is set and how many event listeners attach. `--control` rewrites line 44 to bind `window.UF`, which must make the probe fail. |
| `EVIDENCE.md` | This file. |

## Output

```text
$ node tasks/SIM.50.01/gap-audit/verify_citations.js
353 citations checked, 231 verbatim excerpts checked against 75cf2ff3: 0 failure(s)
EXIT=0

$ node tasks/SIM.50.01/gap-audit/verify_citations.js --selftest
SELFTEST: 3/3 doctored citations reported as failures (3 failures total)
EXIT=0

$ node tasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js
DEUS_Fluid.js at 75cf2ff3
A require():      window.UF.Fluid set: false; module.exports is the Fluid API: true; UF.Events listeners attached: 0; Game_Map.update patched: true
B classic script: window.UF.Fluid set: true; UF.Events listeners attached: 7; Game_Map.update patched: true
RESULT: require() leaves window.UF.Fluid unset; a classic script sets it
EXIT=0

$ node tasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js --control
DEUS_Fluid.js at 75cf2ff3 (CONTROL: line 44 rewritten to bind window.UF)
A require():      window.UF.Fluid set: true; module.exports is the Fluid API: true; UF.Events listeners attached: 7; Game_Map.update patched: true
B classic script: window.UF.Fluid set: true; UF.Events listeners attached: 7; Game_Map.update patched: true
RESULT: unexpected (the contrast did not hold)
EXIT=1

$ node tools/governance/check_wbs_integrity.js      (lane gate from lane.json)
============================================================
INTEGRITY AUDIT SUMMARY: 15 passed, 0 failed
============================================================
EXIT=0
```

## Checks the verifier caught while the audit was being written

The first run reported 2 failures out of 350 citations. Both were off by one line: `DEUS_Levels.js:1790` should have been 1791, and `DEUS_Levels.js:5466` should have been 5467. Both were corrected. The first self-test run caught only 2 of 3 doctored rows, because the self-test was mutating the wrong table cell. The self-test was fixed and now catches 3 of 3.

## Scope confirmation

`git status --porcelain` before the commit showed only `docs/audits/LIVING_WORLD_GAP_AUDIT.md` and `tasks/SIM.50.01/` as new. `git diff --stat 75cf2ff3 -- game tools` was empty.

## Not run

- NW.js, the RMMZ editor and F5 were not run, so no screenshots were taken.
- No performance was measured.
- The probe tests CommonJS scoping in Node, not NW.js itself. To confirm in the game, open the F8 console after boot and read `window.UF.Fluid`.
