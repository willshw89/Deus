# Independent review: coordinator commit `8d1c7c37` (WG.00.11 / ATK-YEAR0-001)

- **Reviewer:** Claude (Opus 5.5), independent read-only reviewer per Directive 001-H §8 (as assigned; the directive text itself is not in the repo).
- **Date:** 2026-09-25
- **Branch:** `task/lane-b`. This file is the only change.
- **Commit under review:** `8d1c7c37` `[gemini] DEUS-YEAR0-01: Establish World Year 0 default, add test_new_game_year0.js, deploy mailboxes, and align control docs`. Parent `689aff84`.
- **Scope:** the coordinator's edits to `game/js/plugins/DEUS_FactionMenus.js` and the new `tools/test_new_game_year0.js`. The follow-ups are `37ac57da` (Lane B), `0859ed3c` and `a8e42502` (Lane G). The rest of the commit is only listed (§2.3), not reviewed.
- **No engine, tool or data file was edited.** All test runs happened in memory against `git show` content (see Appendix A).

## Verdict
- **The menu edit in `8d1c7c37` is correct in direction but incomplete.** It set the setup window's default and fallback year to 0 and lowered three of the five year floors to 0. It left two floors at 1, left stale 1-based text, and broke one check in its own in-game `setup` suite.
- **The test file overclaimed.** It printed "INV-SIM-01 VERIFIED" but checked only the setup payload. On the same tree, a Year 0 New Game ran its clock and its first save at year 1.
- **Every code and test gap I found in `8d1c7c37` has since been fixed.** `37ac57da` fixed the menu and test gaps. `0859ed3c` + `a8e42502` fixed the end-to-end part. On `main` (`d087b097`), the setup payload, clock, first save and demographics are all at year 0 for a Year 0 New Game. `node tools/test_new_game_year0.js --strict` exits 0 there (30 gating checks, 15 mutants).
- **Still open:**
  - Grok's F1 is not written down anywhere I could find.
  - The ATK-YEAR0-001/-002 ledger rows are stale.
  - Setup year N>1 still gives clock N+1.
  - Nobody has recorded a native RMMZ Year 0 run.
  - Two ID collisions remain.
  - Two owner decisions are needed.
  - See §6 and §7.

## 1. Governing specifications used
| Spec | Location | What it requires |
|---|---|---|
| V134 | `docs/VISION.md:128` (at `8d1c7c37`) | A standard New Game begins at World Year 0. The player does not normally choose a later start. |
| WBS principle 7 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:26` | Same as V134. Simulating forward is "a developer / simulation / scenario tool, not a standard New Game starting option". |
| INV-SIM-01 | `docs/INVARIANT_REGISTRY.md:51` | "Standard New Game begins strictly at World Year 0." Enforced by `DEUS_WorldGen.js`, `test_new_game_year0.js`. |
| ATK-YEAR0-001 | `tasks/WG.00.08/defects.jsonl:9` (written by `8d1c7c37`) | Closure: "Menu default is 0; test_new_game_year0.js exists and fails if default !== 0 or if NewGameSetup.year !== 0 on an untouched embark; STATUS no longer cites a nonexistent test as existing". |
| AGENTS.md | rules 2, 3, 4; Definition of Done; "One task per commit" | Seen working natively, no unobserved claims, tests able to fail, one task per commit. |
| CANONICAL_ROLES.md §2 | created by `fbb534f9`, 5 minutes **after** `8d1c7c37` | The coordinator "does not self-certify". It did not bind `8d1c7c37`; I cite it only for context. |

**Not found:** I found no text for Grok's Lane D review, and no finding "F1". I searched every branch and worktree, the mailboxes, `tasks/messages.jsonl`, and the gitignored files in all 9 lane worktrees. The only record is one line in `docs/STATUS.md:45` on `main`: "ATK-YEAR0-001 KEEP OPEN (F1)". The file declared as Lane D's write set, `tasks/WG.00.12/grok_adversarial_review.md`, exists nowhere. §4 covers this.

## 2. What `8d1c7c37` committed
### 2.1 `game/js/plugins/DEUS_FactionMenus.js` (line numbers at `8d1c7c37`)
| Line | Change | Assessment |
|---|---|---|
| 280 | `onNewGameEmbark` fallback year `1` → `0` | Correct |
| 347 | `Window_NewGameSetup` default `_year` `1` → `0` | Correct |
| 558 | typed-box floor `Math.max(1, val)` → `Math.max(0, val)` | Correct |
| 563–564 | blur floor `< 1 → 1` → `< 0 → 0` | Correct |
| 1091 | `changeYear` floor `1` → `0` | Correct |
| 1579 | in-game check `default_year_1` → `default_year_0` | Correct |
| **not changed** 390 | `currentYear()` accepts a box value only if `parsed >= 1` | Missed (R1) |
| **not changed** 490 | `setYear()` is `Math.max(1, … parseInt(y) \|\| 1)` | Missed (R1) |
| **not changed** 338, 515 | class comment "(1-200 AD)", tooltip "Starting Year (1 - 999 AD)" | Missed (R5) |
| **not changed** 1606–1608 | `changeYear(49)` then expects 50 (it assumed the old default of 1) | Broken by this commit (R2) |
| **not changed** 1613–1614 | `setYear(-10)` then `year_clamped_min_1` expects 1 | Asserts the old floor (R2) |

### 2.2 `tools/test_new_game_year0.js` (new, 178 lines)
- It has three checks: window default 0, untouched embark payload 0, and null-window fallback 0.
- It has one mutant (`"this._year = 0;"` → `1`), and its success banner says "INV-SIM-01 VERIFIED".
- It loads only `DEUS_FactionMenus.js` against stubs, and `DataManager.setupNewGame` is a no-op. So nothing after the payload is exercised: the clock, History, demographics and the save are never reached.

### 2.3 Rest of the commit (listed, not reviewed)
- `tools/test_generated_z2_cut_proof.js` (+447)
- `tools/capture_pre_migration_baseline.js` (+49/−8)
- `docs/agents/mailboxes/*` (6 new files)
- `docs/STATUS.md`, `docs/WORK_QUEUE.md`, `docs/CONSOLIDATION_PLAN_V1.md`
- `tasks/WG.00.08/defects.jsonl` (9 rows, including the ATK-YEAR0-001 row)

## 3. Findings on `8d1c7c37`
The R-numbers are this review's. They are separate from Grok's F-numbers.

### R1 (MINOR): two year floors left at 1
- `setYear()` (`:490`) still floored at 1:
  - `setYear(0)`, `setYear(-10)` and non-numeric input all gave 1.
  - `currentYear()` (`:390`) ignored a box value of `"0"`, so a stale `_year` could win.
- **Evidence:** I ran the Lane B suite (`test@37ac57da`) against `tree@8d1c7c37`:
  ```
  [FAIL] key_right_left_round_trip: 0 -> Right -> 2 -> Left -> 1 (expected 1, 0)
  [FAIL] set_year_0_is_0: setYear(0) -> 1, box "1" (expected 0, "0")
  [FAIL] set_year_negative_clamps_0: setYear(-10) -> 1 (expected 0)
  [FAIL] set_year_non_numeric_is_0: setYear("abc"/undefined/null/"") -> 1/1/1/1 (expected 0/0/0/0)
  [FAIL] box_0_overrides_stale_year: Box "0" with stale _year 42 -> currentYear 42 (expected 0)
  ```
  The round-trip failure is a consequence of `setYear(0)` → 1, not a separate defect.
- **Why MINOR:**
  - At `8d1c7c37`, `setYear` is called only by the in-game test suite (`:1610`, `:1613`, `:1743`).
  - The player's paths reach 0 with the committed code: default, arrows, typing, blur.
  - The stale-box case needs `_year` to change without the box changing, which no player path does.
- **Now:** fixed in `37ac57da`. On `tree@37ac57da` and `tree@main` the same checks pass.

### R2 (MAJOR): the commit's own in-game `setup` suite was left failing and self-contradictory
- The commit changed the default to 0 and the check `default_year_1` → `default_year_0`. It did not update the check two dozen lines below.
- Between `:1579` and `:1606` only the faction row is touched (`select(0)`, two `cursorRight`, two faction-arrow touches). So `changeYear(49)` moves the year from 0 to 49, and `year_adjusted_to_50` (`:1608`) must fail.
- `year_clamped_min_1` (`:1614`) still passes, but it asserts the 1-floor that INV-SIM-01 removes. The suite pinned the defect as expected behaviour.
- **Evidence:**
  - Code reading (above).
  - Lane B observed natively on `d1fbeab`: `setup` suite `61 passed, 4 failed`, including `year_adjusted_to_50` (`tasks/WG.00.11/state.md`). **I did not reproduce the native run.**
- **Why MAJOR:** the commit's STATUS line calls the Year-0 default "verified". A check the same commit edits could not pass. Either the native `setup` suite was not run, or its failure was not reported (AGENTS.md rules 2 and 3, Definition of Done).
- **Now:** fixed in `37ac57da`, which changes the step to `changeYear(50)` and the check to `year_clamped_min_0`. Code read; the native result comes from Lane B only.

### R3 (MAJOR): "INV-SIM-01 VERIFIED" was not true on the committed tree
- **The claims:**
  - The test header (`:8`) says "Proves standard New Game begins at World Year 0".
  - The banner (`:173`) prints "ALL YEAR 0 CHECKS PASSED (INV-SIM-01 VERIFIED)".
  - The STATUS line says "verified Year-0 default".
  - INVARIANT_REGISTRY names this test as the enforcement for INV-SIM-01.
- **The test checked only the payload the menu emits.** On the same tree, a New Game fed that payload ran at year 1.
- **Evidence:** a headless New Game through the real Core/World/WorldGen/Factions/History/Levels/Dnd5e/Callings/HistoricalDemographics plugins. It uses Lane G's `runSectionC`, seed 1 (Appendix A, probe 2):
  ```
  tree 8d1c7c37: setup year 0 -> clock 1, save 1, history startYear 1, years 0, demographics start/current 1/1, pipeline_ran true
  tree 8d1c7c37: setup year 1 -> clock 1, save 1, history startYear 1, years 0, demographics start/current 1/1, pipeline_ran true
  ```
  Lane B's `test@37ac57da` on `tree@8d1c7c37` reports the same result with seed 424242: `Clock year after a Year 0 New Game: 1`, `deusTime.year in the first save … 1`, `new Game_DEUSTime() … year 1`.
- **Why MAJOR:** the invariant looked enforced when it was not. A second defect (ATK-YEAR0-002) and a runtime change in three plugins were needed to meet it.
- **Now:**
  - `37ac57da` exposed the gap as known-open Section C checks. It did not hide it.
  - `0859ed3c` fixed the runtime.
  - `a8e42502` made Section C gating.
  - On `tree@main`: `setup year 0 -> clock 0, save 0, history startYear 0, demographics start/current 0/0`.

### R4 (MINOR): the test could fail, but it pinned little
- **It satisfies Rule 4 at the minimum:**
  - On the parent tree `689aff84` it exits 1, with all 3 checks failing (`currentYear() === 1`, payload 1, fallback 1).
  - Its one mutant is caught.
- **Mutants I ran against `test@8d1c7c37` on `tree@8d1c7c37`:**

  | Mutant (in-memory edit to `DEUS_FactionMenus.js`) | Exit | Caught? |
  |---|---|---|
  | M1 fallback `: 0` → `: 1` | 1 | yes (`fallback_embark_year_is_0`) |
  | M2 null-window path skips the payload write | 0 | **no** |
  | M3 `changeYear` floor 1 | 0 | **no** |
  | M4 `changeYear` no floor (Left at 0 gives −1) | 0 | **no** |
  | M5 typed-box floor 1 | 0 | **no** |
  | M6 payload year as string | 1 | yes |
  | M7 payload drops year 0 (`year \|\| undefined`) | 1 | yes |
  | M8 blur floor 1 | 0 | **no** |

- **What survived:**
  - M2 survives because check 3 runs right after check 2 and reads `UF.NewGameSetup.year`, which is still 0 from check 2. It passes on a leftover value.
  - M4 would let a player embark at year −1, and the suite would not notice.
- **The mutant anchor was not unique.** `"this._year = 0;"` occurs at `:347` and `:564`. `src.replace` hits the constructor only because it comes first in the file.
- **Now:**
  - `37ac57da` added 19 more setup checks and 12 mutants, with anchors that must occur exactly once and a sentinel before each embark.
  - M2 is now caught (`fallback_embark_year_is_0: … === "SENTINEL"`, exit 1) on both `test@37ac57da/tree@37ac57da` and `test@a8e42502/tree@main`.
  - M3, M4, M5 and M8 are in the Lane B mutant list and are caught.

### R5 (MINOR): stale 1-based text
- The year box tooltip (`:515`, shown on hover in NW.js) said "Starting Year (1 - 999 AD)".
- The class comment (`:338`) said "(1-200 AD)".
- **Now:** fixed in `37ac57da` ("0 - 999 AD", "0-999 AD, default World Year 0").

### R6 (MINOR, process): the defect row cannot show that the defect came before the fix
- The ATK-YEAR0-001 row (`defects.jsonl:9`) says `finder: grok`. It was written in the same commit as the fix and the test.
- It has none of the `createdAt` / `history` fields that every other row in the file has (the keys are `defectId,taskId,status,finder,title,severity,requirement,location,closureCriterion`).
- Its closure criterion covers only the menu. Its `requirement` is INV-SIM-01, which is end to end. That gap is how the commit met the criterion and still left the invariant unmet (R3).
- **Now:** still true on `main`.

### R7 (MINOR, process): several tasks in one commit, and self-verification
- The commit bundles the Year-0 code change with the other items listed in §2.3: a new 447-line proof tool, a baseline tool change, the mailbox bus, three control docs and the defect ledger.
- AGENTS.md: "One task per commit, so a review can diff exactly what changed."
- One author wrote the defect row, the closure criterion, the fix, the test and the "verified" STATUS line, with no independent run.
- AGENTS.md at `8d1c7c37` allowed Gemini to edit plugins and tools, so this is recorded as a flag, not a rule breach. This review is the CLAUDE.md "flag any Gemini edits to code, tools, or data" check. CANONICAL_ROLES' "does not self-certify" rule was added 5 minutes later (`fbb534f9`).

## 4. Grok Lane D F1 and the Section C open items
- **F1:**
  - Grok's F1 is cited as the reason ATK-YEAR0-001 stays open (`docs/STATUS.md:45`). Its text is not recorded anywhere I could reach (§1).
  - I cannot say what F1 asks for or whether it is met. As recorded, anyone trying to close ATK-YEAR0-001 cannot check it.
  - Grok's hold timestamp (16:48:00) matches the minute `37ac57da` was committed (16:48:43). It was probably judged against `8d1c7c37`/`d1fbeab`, but that is inference, not evidence.
  - **Recommendation (MAJOR, process):** Lane D should commit the F1 text, with the commit and run it was judged on (CANONICAL_ROLES §2, Grok constraints), before ATK-YEAR0-001 is closed or kept open on it.
- **Section C open items** (Lane B `tasks/WG.00.11/state.md`):

  | Item | Status on `main` | Evidence (mine unless stated) |
  |---|---|---|
  | `new_game_clock_year_is_0` (clock 1) | Fixed, gating | `test@a8e42502 --strict` on `tree@a8e42502`: exit 0; probe: clock 0 |
  | `new_game_save_year_is_0` (save 1) | Fixed, gating | same; probe: save 0 |
  | `clock_constructor_keeps_year_0` (`\|\| 1`) | Fixed, gating | same; mutant `core_restores_or_1` caught (1 failing check) |
  | ATK-YEAR0-002 closure criterion: "Section C checks pass unmodified" | Met | `runSectionC` byte-identical: 1798 bytes, SHA-256 `4b8d9141…6d26` in both `37ac57da` and `a8e42502` (my slice; Lane G's 1799/`45b883ee…` uses a different boundary) |
  | Discrimination run (checks can pass under an independent implementation) | Kept | `section_c_checks_can_pass` PASS on both commits |
  | New Game after a Load keeps the save's day/month/hour | Code fix in `0859ed3c` (`DataManager.setupNewGame` → `resetCalendar()`) | **No committed check:** `git grep resetCalendar main -- tools` finds nothing. Section A stubs `setupNewGame`, and Section C calls `UF.World.newWorld` directly. Not run by me. |
  | Setup year N>1 → clock N+1 | **Open** | §6 N1 |
  | ID collisions (WG.00.11, INV-SIM-01) | **Open** | §6 N4 |

## 5. How the later commits addressed `8d1c7c37`
| Commit | What it changed for this review | Verified here |
|---|---|---|
| `37ac57da` (Lane B) | R1, R2, R4, R5 fixed. 22 setup + 4 save/load gating checks, 12 mutants, and Section C, which reports R3 honestly as known-open. | `test@37ac57da/tree@37ac57da`: exit 0, "27 gating checks, 12 mutants caught", 3 Section C OPEN. `--strict`: exit 1 on exactly those 3. |
| `0859ed3c` (Lane G) | R3 fixed in the runtime: Core constructor keeps 0; History founds at year 0; HistoricalDemographics accepts `startYear` 0 or 1; `resetCalendar` on New Game; DEUS_Test `DEUS_TEST_YEAR`. | Probe on `tree@main` (§3 R3). |
| `a8e42502` (Lane G) | Section C promoted to gating; 3 Section C mutants added. | `test@a8e42502/tree@a8e42502 --strict`: exit 0, "30 gating checks, 15 mutants caught", "INV-SIM-01 END-TO-END MET". |
| Merges `8c0c210c`, `da2c16b2` | Carried the above into `main` unchanged | `git diff 37ac57da 8c0c210c` and `git diff a8e42502 da2c16b2` on the reviewed files: empty. `a8e42502` vs `main` on `game/js/plugins`, the test, `rmmz_core.js` and the catalog: identical. |

- The original 3 gates of `8d1c7c37` still hold: `test@8d1c7c37` on `tree@main` exits 0.
- Nothing `8d1c7c37` intended was reverted. Its test file was replaced by `37ac57da`, which kept its three checks by name (`window_default_year_is_0`, `embark_year_is_0`, `fallback_embark_year_is_0`).

## 6. Residual problems on `main` (`d087b097`)
- **N1 (MINOR, untracked): setup year N>1 gives clock N+1.**
  - Probe on `tree@main`: `2 -> clock 3`, `42 -> clock 43`. Year 1 gives 1.
  - So native `setup.clock_year_is_42` (`DEUS_FactionMenus.js:1772`) should still fail on `main`. That is inferred from the probe; I did not run it natively.
  - Lane G says this is the frozen HIST-10 contract pinned by ASTRA-15 (`tasks/lane-g/state.md:187`).
  - It has no defect ID in `defects.jsonl` and no entry in `OWNER_DECISIONS.md`. Only the two lane state files mention it.
- **N2 (MINOR): the ledger lags the code.**
  - `defects.jsonl` has only an `OPEN` row for ATK-YEAR0-002 (line 11), with no `FIX_READY` for `0859ed3c`/`a8e42502`.
  - `docs/STATUS.md:78` still says "OPEN (Assigned Lane G)", while `:48` says Lane G is integrated to main.
  - `docs/INVARIANT_REGISTRY.md:51` still names `DEUS_WorldGen.js` as INV-SIM-01's enforcement point. The Year-0 path is in FactionMenus, Core, History and HistoricalDemographics.
- **N3 (MAJOR against the Definition of Done): nobody has recorded a native Year 0 run.**
  - Lane G says it did not run one.
  - STATUS cites only node suite reproductions for Lane G.
  - Lane B's native run (screenshot "Starting Year ◄ 0 ► AD") predates the runtime fix, and its clock was still at year 1.
  - I did not run one either.
- **N4 (MINOR, governance): ID collisions Lane B raised are unchanged.**
  - `WG.00.11` is "Incarnation & Command Layer" in `DEUS_WORLDGEN_WBS.md:98`, but the Year 0 work uses the same ID.
  - `INV-SIM-01` is also "Matter Conservation Invariant" in `DEUS_NATURAL_WORLD_SYSTEMS.md:111`.
- **N5 (MINOR, my own lane's earlier text): a wrong count in Lane B's state file.**
  - `tasks/WG.00.11/state.md` §2 heading says "31 checks + 12 mutants + 1 discrimination run". The suite has 30 checks (22 + 4 + 4; counted from a run on `37ac57da`) plus the discrimination run.
  - It is left as is here because this review only adds its own file.

## 7. Recommendations
1. **ATK-YEAR0-001 closure:** cite `37ac57da`, not `8d1c7c37`, as the fix evidence.
   - By my runs, the closure criterion is met on `main`. The default is 0. `default_year_1` fails 5 checks, including `window_default_year_is_0` and `embark_year_is_0`. The test exists.
   - Closing belongs to Grok, once F1 is on record (§4).
2. **ATK-YEAR0-002:** record `FIX_READY` (`0859ed3c`, `a8e42502`) and update STATUS `:78`. Grok closes.
3. **Add a check for `resetCalendar`:** a New Game after a Load starts at the setup year and the start date (§4 table).
4. **Coordinator:** run the native Year 0 check Lane G suggests (`DEUS_TEST_YEAR=0 node tools/run_tests.js history --game <snapshot>`), open the screenshot, and look at the HUD year and the chronicle.

## Decisions needed (owner)
- **N>1 mapping:**
  - Should setup year N start the clock at N (a 0-based model for every era), or keep HIST-10's N+1?
  - Changing it moves every era's demographics RNG stream and the pinned era hashes (Lane G).
- **Should a standard New Game offer a Starting Year selector at all?**
  - V134 and WBS principle 7 say later starts are "a developer / simulation / scenario tool, not a standard New Game starting option".
  - `8d1c7c37` kept a 0–999 "Starting Year" row on the standard setup window, and only changed its default. It is still there on `main`.
  - I raise it as a question, not a defect: V134 says the player does not "normally" choose.

## Not checked
- No native RMMZ run (F5 or `tools/run_tests.js`), no screenshots taken or opened, and the F8 console not watched. Native results above are quoted from Lane B and marked as such.
- The text of Grok's F1 and of Directive 001-H.
- The other files in `8d1c7c37` (§2.3) beyond their diffstat.
- Lane G's ASTRA-14 and ASTRA-15 suites. Grok is the closure reviewer for them.

## Appendix A: how the runs were made (no files written)
- Each run executes one commit's `tools/test_new_game_year0.js` against another commit's `game/` tree.
- The driver patches `fs.readFileSync` so that any path under `game/` returns `git show <TREE_REV>:<path>`.
- Optional mutants are applied to that text in memory. Each anchor must match exactly once, or the driver exits 3.
- The test source (`git show <TEST_REV>:tools/test_new_game_year0.js`) is then compiled as a module at `tools/test_new_game_year0.js`.
- ```js
  const fs = require("fs"), path = require("path"), cp = require("child_process"), Module = require("module");
  const ROOT = path.resolve("C:/Users/snewt/.deus_worktrees/lane-b");
  const testRev = process.env.TEST_REV, treeRev = process.env.TREE_REV, mut = JSON.parse(process.env.MUTATE || "{}");
  const show = (rev, rel) => cp.execFileSync("git", ["-C", ROOT, "show", rev + ":" + rel], { maxBuffer: 1 << 28 }).toString("utf8");
  const orig = fs.readFileSync;
  fs.readFileSync = function (p, opts) {
    const rel = path.relative(ROOT, path.resolve(String(p))).split(path.sep).join("/");
    if (!rel.startsWith("..") && rel.startsWith("game/")) {
      let s = show(treeRev, rel);
      for (const [a, r] of Object.entries(mut[rel] || {})) { if (s.split(a).length !== 2) process.exit(3); s = s.replace(a, () => r); }
      const enc = typeof opts === "string" ? opts : opts && opts.encoding;
      return enc ? s : Buffer.from(s, "utf8");
    }
    return orig.apply(this, arguments);
  };
  const filename = path.join(ROOT, "tools", "test_new_game_year0.js");
  process.argv = [process.argv[0], filename].concat(process.env.ARGS ? process.env.ARGS.split(" ") : []);
  const m = new Module(filename, null); m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename));
  m._compile(show(testRev, "tools/test_new_game_year0.js").replace(/^#!.*/, ""), filename);
  ```
- **Probe 2 (setup year → clock year):**
  - Same `fs` patch, then `a8e42502`'s test source with `main();` replaced by `module.exports = { runSectionC };`.
  - Called with `{ faction: "human", year: Y, seed: 1, worldSize: 256, fogOfWar: false }` for Y = 0, 1, 2, 42, on `tree@8d1c7c37` and `tree@main`.
  - `runSectionC` overrides the seed with 424242.

**Run results (2026-09-25, Node v24.19.0):**
| Test | Tree | Args / mutant | Exit | Key output |
|---|---|---|---|---|
| `8d1c7c37` | `8d1c7c37` | none | 0 | 3 PASS; `rule4_mutant_caught … (2 failures triggered)` |
| `8d1c7c37` | `689aff84` | none | 1 | all 3 FAIL (`=== 1`) |
| `8d1c7c37` | `8d1c7c37` | M1…M8 | see R4 | M2, M3, M4, M5, M8 survive |
| `37ac57da` | `8d1c7c37` | none | 1 | 5 Section A FAIL (R1); Section C clock/save/constructor 1; Section D throws on anchors absent from the old code (expected) |
| `a8e42502` | `8d1c7c37` | none | 1 | same Section A FAILs; Section C 3 FAIL (gating) |
| `37ac57da` | `37ac57da` | none | 0 | "27 gating checks, 12 mutants caught"; 3 OPEN |
| `37ac57da` | `37ac57da` | `--strict` | 1 | the 3 Section C checks |
| `a8e42502` | `a8e42502` | `--strict` | 0 | "30 gating checks, 15 mutants caught … INV-SIM-01 END-TO-END MET" |
| `8d1c7c37` | `main` | none | 0 | original 3 gates hold |
| `37ac57da` / `a8e42502` | `37ac57da` / `main` | M2 | 1 | `fallback_embark_year_is_0: … === "SENTINEL"` |
| `node tools/test_new_game_year0.js` (worktree, = `37ac57da`) | worktree | none | 0 | 22 / 4 / 4 checks in sections A / B / C |
