# GOV.01.01 independent review — process streamline

Writer: Claude (PM). Reviewer: Grok. Reviewed commit: `517974a11622c607b592ee1070df5a1f63235f97`. Merge base with main: `8115eff660ebf4a0ee498c15b4f8a069312d69f7` (merge `6eee2a4f` brought that main tip in). Date: 2026-09-29.

Reviewed in worktree `C:\Users\snewt\.deus_worktrees\lane-pm-streamline` on `task/lane-pm-streamline`. No product file was edited for this review.

## 1. Integrity

`git rev-parse HEAD` = `517974a11622c607b592ee1070df5a1f63235f97`.

`git merge-base main HEAD` = `8115eff660ebf4a0ee498c15b4f8a069312d69f7`. Current `main` is `37919470e83397bd458feb99dc1e299f667c55be` (moved after the merge base). Parents: `517974a1` → `d084e5cd` `[pm]` manifest → `6eee2a4f` merge (`eca4eb67` + `8115eff6`) → `eca4eb67` docs rewrite.

`git log --oneline main..HEAD`:

- `517974a1` [claude] GOV.01.01 PM review of the rewrite
- `d084e5cd` [pm] Open lane-pm-streamline
- `6eee2a4f` Merge branch 'main' into task/lane-pm-streamline
- `eca4eb67` [claude] GOV.01.01 docs rewrite

`git diff --stat main HEAD` also lists `tools/test_package_proofs_ingame.js`. That file is not a lane edit. Main commit `1b3006fb` reverted it after the merge base, so the two-dot diff against today's main shows the pre-revert text. `git diff --name-only 8115eff6...HEAD` (the lane delta) does not include it, and does not include any path under `game/js`, `game/data`, or `tools/*.js`.

Every path in that lane delta is inside `tasks/GOV.01.01/lane-pm-streamline/lane.json` `allowedPaths` (65 paths: docs, the four rule stubs, the specialist skill, governance and ops markdown, the registry, and this lane folder). A merge of this branch should keep main's revert of `tools/test_package_proofs_ingame.js`, because this branch does not touch that file. `git merge-tree --write-tree HEAD main` does conflict in `docs/OWNER_DECISIONS.md` and `docs/VISION.md` (see finding 3). `docs/art/DEUS_ASSET_STANDARD.md` auto-merges.

Untracked, not in the reviewed commit: `tasks/GOV.01.01/lane-pm-streamline/launches/` and `prompt_review_grok.txt`.

## 2. Gate tests

Run in this worktree on `517974a1`, not in a fresh clone.

| Command | Exit |
|---|---|
| `node tools/check_deus_syntax.js` | 0 (62 DEUS plugin files, 0 errors) |
| `node tools/governance/test_check_claims.js` | 0 (`RESULT: 279 passed, 0 failed`) |
| `node tools/governance/check_invariants.js` | 0 (`SUMMARY active=9 pass=9 fail=0 not-mechanical=18 superseded-pending-owner=8`) |
| registry shape check from `lane.json` (no `DONE` without an F5 note) | 0 (`PASS registry: 9 packages, 22 tasks, 7 open lanes`) |
| `node tools/governance/check_claims.js` (exists; staged index, 0 paths) | 0 (`RESULT: 4 passed, 0 failed`) |

Line caps (newline count, last empty segment dropped): `AGENTS.md` 94 (cap 120), `docs/STATUS.md` 77 (cap 80), `docs/DECISIONS_DIGEST.md` 78 (cap 80), `docs/ENGINE_RULES.md` 86 (cap 150), `tools/ops/ANTIGRAVITY.md` 63 (cap 100). All inside the caps.

File paths cited as existing project files in `AGENTS.md`, the digest, `ENGINE_RULES.md`, `STATUS.md`, `ARCHITECTURE.md`, and asset-standard §3 were spot-checked. The ones named as present are on disk, including `docs/design/THEME.md`, `art/APPROVALS.md`, `art/catalogue/catalogue.json`, `game/data/UF_WorldCatalog.json`, and `tools/art/validate_art.js`. `tools/check_plugin_boot.js` is cited as not built yet (`ENGINE_RULES.md` §3). `tools/art/check_ground_variants.js`, cited by DEC-045, is not in the tree (the citation predates this rewrite). Section id `AS-LOOK-002` is cited and is not in this tree (finding 3).

## 3. Rule integrity

Compared `git show 8115eff6:AGENTS.md` (identical to `main:AGENTS.md`; the later main commits do not touch `AGENTS.md`) with the new rulebook and `docs/DECISIONS_DIGEST.md`, then every `Record status` line in `docs/OWNER_DECISIONS.md`. The decision-log diff against the merge base adds record-status lines, the DEC-029 amendment, DEC-044, and a reorder of two DEC-007 bullets. The reordered bullet text is unchanged. No earlier Owner quotation in the log was rewritten.

These LIVE rules are still stated in `AGENTS.md` or the digest, at the same strength as the log: DEC-042 roles and zero self-certification; DEC-035 gate-before-review and `xhigh` / mechanical split; DEC-032 big-tier effort and fallback; DEC-041 exit states, worktree removal, registry-as-truth, package halt, and the 12-point exit; DEC-037 order and the civilization freeze, with the sack and banner exceptions; DEC-043 design-only; DEC-040 as clarified on 2026-09-29 (weight of world material and water; plants, creatures, and gases out; no mass from nothing); DEC-007 PixelLab OBJECTS/MAPS, catalogue-first, QA, Owner sign-off, high top-down; DEC-044 PixelLab only, Retro Diffusion and Nano Banana Pro dormant; Rule 12 sprite-frame animation; Rule 13 suspension; DEC-011 1:1; DEC-012 / DEC-013 / DEC-038 units, 32 Z, bands, calendar; DEC-023 no ore respawn; DEC-027 SRD combat; DEC-018 physical spells; DEC-004 `--no-verify` default; DEC-008 heavy-job cap; DEC-009 and DEC-010 open defaults. Definition of Done L1/L2/L3 in `AGENTS.md` matches `ENGINE_RULES.md` §6 and `docs/CANONICAL_ROLES.md` §2. Commit tags in `AGENTS.md` match `ENGINE_RULES.md` §11.

Missing, weakened, or contradicted:

- **Ultima VII as training data (Owner 2026-09-18/19) is gone from the governing rule.** Old rule 8 allowed U7 art as examples, stand-ins, style references, and training data, and recorded that the user accepted the risk of training on it. New rule 8 (`AGENTS.md:28`) says "reference and stand-in only" and drops both the permission and the acceptance. The digest repeats that narrower rule (`docs/DECISIONS_DIGEST.md:64`). `docs/VISION.md:21` (V9) and `docs/VISION.md:214` still say U7 may be training data and cite AGENTS rule 8. `AGENTS.md:8` says this file governs where an older file differs, so the permission does not survive the read order.

- **The Owner's "1. purge history" is given two opposite meanings.** The brief quotes the harness answer as `1. purge history; 2. use judgement; 3. use judgement; 4. high topdown; 5. Yeah` and says answer 1 was applied to the digest, not to git (`tasks/GOV.01.01/lane-pm-streamline/BRIEF.md:9`). The digest shortens the quotation to "purge history", reads it as "no history in this digest", and says a git reading would still need an Owner amendment (`docs/DECISIONS_DIGEST.md:17`). The log amendment quotes "1. purge history" and records a completed force-push (`a24bafe6` → `4aa51e1a`) that lifts the no-purge rule whenever the Owner orders one for a leaked key (`docs/OWNER_DECISIONS.md:447`). `docs/STATUS.md:43` agrees with the log. The digest's own header says the log wins, so the session-start page and the canonical log disagree about what the Owner said and about whether a force-push is still forbidden. `a24bafe6` and `5842f6f8` are not reachable (consistent with a rewritten history). `4aa51e1a` is reachable; its subject is the `.gitignore` commit, not a purge marker.

- **English / British Isles art direction is a one-line paraphrase of a ruling this tree does not record.** `AGENTS.md:32` says every prompt's style tail names Ultima VII, EverQuest, and an English / British Isles world feel, and cites `AS-LOOK-002`. This tree's `docs/art/DEUS_ASSET_STANDARD.md` has `AS-VIEW-002` at line 538 and no `AS-LOOK-002`. The digest has no style-tail line. The Owner's words are on current main, in commits after the merge base: the DEC-007 style-influences bullet (quotation "I want to add to future art Prompts English, britannic influence..."), VISION V152, and `AS-LOOK-002` (including "use that as part of your guidance for accepting or rejecting art" and "Like an english / british feel on the races, dragons, the demon influence of tieflings, etc."). Those commits were not in `8115eff6`. V152 itself is `37919470` at 13:39 CT, about one minute after `517974a1` (13:38:45 CT). The paraphrase omits acceptance guidance and the peoples, dragons, demons, and heraldry extension. Merging this branch conflicts in the two files that hold the quotation.

- **DEC-001 fluids-over-voids is LIVE and is in neither rulebook.** The log (`docs/OWNER_DECISIONS.md:31` and `:40`) says fluid above a void needs at least one solid layer, and fluid directly on air is a defect. A search of `AGENTS.md` and `docs/DECISIONS_DIGEST.md` has no statement of it. The digest promises one line per LIVE rule.

- **DEC-045 and DEC-046 have no record-status line.** Every other decision from DEC-001 through DEC-044 has one. The new reading rule (`docs/OWNER_DECISIONS.md:8`) is "obey LIVE items." DEC-045 (`:740`) and DEC-046 (`:755`) are `DECIDED` with no LIVE mark. DEC-046 (integrity indicators and sprite animations for natural change; Owner's words at `:759`) does not appear in `AGENTS.md` or the digest. The art SOP then treats the DEC-045 design as still open (below).

Contradictions that remain:

- **Approval scope.** `AGENTS.md:11` and `docs/DECISIONS_DIGEST.md:14` attribute to "Owner 2026-09-29" / "DEC-041 status" the sentence "ask the Owner only for design choices, art sign-off and destructive repository actions." The DEC-041 record status (`docs/OWNER_DECISIONS.md:672`) says the Owner asked for fewer approval loops and questionnaires, and that item 5's package gate stands until the Owner changes it. It does not contain the "only for" sentence. `AGENTS.md:26` (Rule 6) and the first clause of digest line 14 still require Owner approval before a new leaf, a widened lane, and the next package. `docs/CANONICAL_ROLES.md:10` says the coordinator does not open lanes without the Owner.

- **Ground tiles.** `AGENTS.md:32` cites DEC-045 (Dryness Triplets, D sheet, RMMZ A2). DEC-045 item 3 says build on today's A2 autotile path and leave the AS-TERR-001 Wang dual-grid as a future option. `docs/art/DEUS_ASSET_STANDARD.md:736` says variant counts and the placement rule are still pending, and `:736` puts terrain on the dual-grid path in AS-TERR-001. `docs/STATUS.md:38` says the counts, format, and placement rule are still to be recorded. DEC-045 was recorded in `809d119a`, which is an ancestor of this commit via `8115eff6`.

- **Closed mass wording.** `AGENTS.md:37`, `ENGINE_RULES.md` §8, and `INV-SIM-03` match the 2026-09-29 clarification. `docs/INVARIANT_REGISTRY.md:17` (`INV-FLD-02`) still allows fluid to leave through a "named source, sink or evaporation." DEC-040 item 2 forbids a deletion sink.

- **Black wall cap.** `AGENTS.md:34` says the Rule 13 DF black wall-top convention does not bind until the Owner rewrites it. `docs/INVARIANT_REGISTRY.md:26` (`INV-ART-04`) says the 48×96 near-black cap stays.

- **Push.** `docs/CANONICAL_ROLES.md:11` says writers do not push. `AGENTS.md:93` allows a writer to push its own lane branch when the launch prompt says so. The roles file says AGENTS.md wins where they differ.

- **Camera.** High top-down is the stated camera (`AGENTS.md:32`, `AS-VIEW-002`). The log equates that with the engine's "RMMZ standard top-down 3/4 view." `docs/art/DEUS_ASSET_STANDARD.md:546` and `:552` still say the game view stays the 3/4 view, with no pointer to AS-VIEW-002. DEC-019's per-stratum pixel shift is correctly left OPEN (`docs/OWNER_DECISIONS.md:307`, digest line 77).

Roles, the three done levels, the DEC-037 order, and the seven commit tags do not contradict each other across `AGENTS.md`, the digest, `ENGINE_RULES.md`, and `docs/CANONICAL_ROLES.md`, aside from the push cell above. `docs/ARCHITECTURE.md:3` points at `ENGINE_RULES.md` §6 for the merge gate; §6 is the done-level table, and the push/gate rules are §11.

## 4. Facts

Spot-checks of `docs/STATUS.md` sections A–C and `tasks/wbs_registry.json` against git. These match:

1. `game/js/plugins.js` registers 42 `DEUS_*` plugins, all `status: true`. `DEUS_Core.js` `companionPlugins` is the 11 names in section A, including `UF_Households`.
2. `DEUS_World` has `"parameters": {}`. Header defaults are AreasX 1, AreasY 1, AreaSize 256, Seed 0, StartInWorld true. `DEUS_World.js:166` is `zMin: -16, zMax: 15` with the split marked OPEN. `DEUS_Depth` `MaxDepth` is `"2"`. The `DEUS_Levels` description still says 5 layers, -2 to +2.
3. No `game/js/plugins/*.js` file mentions `geomorphology`.
4. `e1554c63` is the merge-gate merge of lane-by. `94e89cff` is `[claude]` NAT.04.01 attempt 3. `148f048b` is `[grok]`, author `deus-grok`, and records `136 passed` and `14 caught, 0 survived`.
5. `tasks/NAT.03.01/lane-bx/REPORT.md:76` is `Playable verification performed: NO`.
6. `fe193188` is `VERDICT: FAIL` with defects D1–D8. At 13:38 CT, `fb8ffd36` was still the `task/lane-cf` tip. Attempt 2 `834aa2ee` landed at 13:40:58 CT, after this commit.
7. `54f67436`, `592ea869`, `1bd2cd2b`, and `593c5232` are `[grok]` subjects authored `deus-ops`, as section D.8 says.
8. Registry `NAT.04.01` is `MERGED_L1`, writer `claude`, sha `e1554c63`, review `148f048b`. `NAT.02.01` and `NAT.03.01` are `MERGED_L1`, writer `minimax`. `WG.00.40` writer `gemini`, `WG.00.41` writer `claude`. `cd8e43b7` and `eb790a68` exist and are `[gemini]`.
9. Lane tips that matched the branch tips at review time: lane-ca `000341d8`, lane-bb `d171c0fd` (`[grok]`), lane-bj `d134315d` (`[codex]`). The no-`DONE`-without-F5 scan passed (no task is `DONE`).

These do not:

10. `docs/STATUS.md:2` and `tasks/wbs_registry.json:8` say main is `e1554c63`. This commit already contains `8115eff6`, and nine commits sit between them, including the DEC-045 and DEC-046 recordings (`809d119a`, `5640a8a5`). Current main is `37919470`.
11. `docs/STATUS.md:25` says this lane's tip is `6eee2a4f` and the next step includes the `[pm]` manifest commit. The parent of the reviewed commit is that manifest, `d084e5cd` (13:38:44 CT). `tasks/wbs_registry.json:285` and `:466`–`:468` still say the manifest commit is pending, the base is `5b300427`, and the next step is a rebase onto `e1554c63`.
12. `docs/STATUS.md:14` says NAT.05.01 (lane-bw) is locked until the Owner approves opening it. `docs/STATUS.md:24` says lane-cl is open. Registry `NAT.05.01` (`tasks/wbs_registry.json:287`–`:301`) is `IN_PROGRESS_L1` on `lane-cl` and its `haltReason` still says opening needs Owner approval. `openLanes` (`:504`–`:509`) lists `lane-bw` as `HELD`, not lane-cl. `task/lane-cl` tip `2f4bdf20` (`[gemini]` climate kernel) is dated 13:33:32 CT, before this status page. `3ea1ab69`, recorded as the Grok tip of lane-bd, is a `[pm]` commit authored `deus-pm`; the SHA is the branch tip.

## Findings

**BLOCKER** `AGENTS.md:28` and `docs/DECISIONS_DIGEST.md:64` — Owner 2026-09-18/19 permission to train generators on Ultima VII art, including the recorded acceptance of that risk, is removed. `docs/VISION.md:21` and `:214` still state it and cite rule 8. `AGENTS.md:8` makes the narrower rule win.

**BLOCKER** `docs/DECISIONS_DIGEST.md:17` — Owner quotation "1. purge history" is shortened to "purge history" and read as "no history in this digest," with a git amendment described as still needed. `docs/OWNER_DECISIONS.md:447` and `docs/STATUS.md:43` record the same words as a completed git purge that changes DEC-029 item 2. `tasks/GOV.01.01/lane-pm-streamline/BRIEF.md:9` agrees with the digest. The log and the digest cannot both be the Owner's meaning.

**BLOCKER** `AGENTS.md:32` — cites `AS-LOOK-002`, which is not in this tree. The Owner's English / British Isles quotations (prompt tail, PM accept/reject guidance, and the extension to peoples, dragons, demons, and heraldry) are on main after the merge base and are absent from this branch's decision log, `docs/VISION.md`, and the digest. The one clause that is here drops the acceptance-guidance and living-creature rulings. `git merge-tree` conflicts in `docs/OWNER_DECISIONS.md` and `docs/VISION.md`.

**BLOCKER** `tasks/wbs_registry.json:8`, `:285`, `:466` — master-truth rows say main is `e1554c63`, this lane's base is `5b300427`, the `[pm]` manifest commit is pending, and the lane must rebase onto `e1554c63`. The reviewed commit's parent is the manifest `d084e5cd`, and `8115eff6` is already merged. `docs/STATUS.md:2` and `:25` carry the same wrong main SHA and the same stale tip / next step.

**MAJOR** `docs/OWNER_DECISIONS.md:31` — LIVE fluids-over-voids ruling has no line in `AGENTS.md` or `docs/DECISIONS_DIGEST.md`.

**MAJOR** `docs/OWNER_DECISIONS.md:740` and `:755` — DEC-045 and DEC-046 have no record-status line. Under `docs/OWNER_DECISIONS.md:8`, only LIVE items bind. DEC-046 is not in `AGENTS.md` or the digest.

**MAJOR** `docs/art/DEUS_ASSET_STANDARD.md:736` — SOP says ground-variant counts and placement are still pending and sends terrain down the AS-TERR-001 dual-grid path. DEC-045 (ancestor `809d119a`) and `AGENTS.md:32` specify Dryness Triplets on the current RMMZ A2 path. `docs/STATUS.md:38` repeats the "not yet recorded" status.

**MAJOR** `docs/DECISIONS_DIGEST.md:14` — "ask the Owner only for design choices, art sign-off and destructive repository actions" is cited as DEC-041 status. `docs/OWNER_DECISIONS.md:672` does not say that, and says the package gate stands. `AGENTS.md:26` still requires approval before a new leaf, a widened lane, and the next package.

**MAJOR** `docs/STATUS.md:14` and `tasks/wbs_registry.json:287` — NAT.05.01 is both locked / HELD on lane-bw and `IN_PROGRESS_L1` on lane-cl. Kernel commit `2f4bdf20` predates this page.

**MAJOR** `docs/INVARIANT_REGISTRY.md:17` — `INV-FLD-02` still names a sink as a way fluid mass may leave. DEC-040 item 2 and `AGENTS.md:37` forbid a deletion sink.

**MAJOR** `docs/INVARIANT_REGISTRY.md:26` — `INV-ART-04` keeps the 48×96 near-black cap in force. `AGENTS.md:34` says that Rule 13 convention does not bind.

**MINOR** `docs/CANONICAL_ROLES.md:11` — writers "do not push"; `AGENTS.md:93` allows a lane-branch push when the launch prompt says so. The roles header says AGENTS.md wins.

**MINOR** `docs/art/DEUS_ASSET_STANDARD.md:546` and `:552` — character-trial notes still say the view stays the RMMZ 3/4 view, with no AS-VIEW-002 pointer. The log treats that phrase as the engine presentation of high top-down.

**MINOR** `docs/ARCHITECTURE.md:3` — cites `ENGINE_RULES.md` §6 for the merge gate. §6 is the done-level table; the gate rule is §11 and `AGENTS.md` Rule 18.

**MINOR** `tasks/wbs_registry.json:488` — lane-bd tip `3ea1ab69` is the branch tip, and the commit subject is `[pm]`, author `deus-pm`. The row names the writer Grok.

**MINOR** `docs/OWNER_DECISIONS.md:750` — DEC-045 cites `tools/art/check_ground_variants.js`, which is not in the tree. The sentence was already in the log before this rewrite.

VERDICT: FAIL
