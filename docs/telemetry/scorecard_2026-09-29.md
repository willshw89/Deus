# Agent scorecard v0 — generated 2026-09-29 from git (PM snapshot; tools/governance/scorecard.js in lane-co supersedes this)

Source: 90 committed review files under tasks/*/*/review_*.md; verdict = first VERDICT line; reviewer = subject tag of the commit that added the file; writer = lane.json writer at that commit.

## Reviewers (by tag family)
| Reviewer | Reviews | FAIL | PASS | other | FAIL rate |
|---|---|---|---|---|---|
| grok | 46 | 9 | 35 | 2 | 20% |
| gemini | 36 | 0 | 33 | 3 | 0% |
| codex | 5 | 4 | 1 | 0 | 80% |
| claude | 3 | 2 | 1 | 0 | 67% |

## Writers (lane.json writer family) — first-review outcomes
| Writer | Reviews received | FAIL | PASS | other |
|---|---|---|---|---|
| grok | 43 | 6 | 35 | 2 |
| claude | 25 | 3 | 22 | 0 |
| gemini | 9 | 3 | 5 | 1 |
| codex | 5 | 0 | 4 | 1 |
| minimax | 4 | 2 | 2 | 0 |
| ? | 4 | 1 | 2 | 1 |

## Provenance flags
- Review files whose adding commit is authored by the ops account rather than a reviewer account: 6 of 90. These are not independent evidence (see the 2026-09-29 lane-execution audit).
- Verdict '?' rows (no VERDICT line found): 5.

## Rows
| Lane | Date | Reviewer tag | Commit author | Writer | Verdict |
|---|---|---|---|---|---|
| NAT.04.01/lane-by | 2026-09-29 | grok | deus-grok | minimax | FAIL |
| NAT.04.01/lane-by | 2026-09-29 | grok | deus-grok | claude | PASS |
| WG.00.41/lane-bt | 2026-09-28 | grok | deus-ops | claude | PASS |
| TOOL.01.02/lane-cd | 2026-09-28 | grok | deus-grok | gemini | ? |
| TOOL.01.02/lane-cd | 2026-09-28 | grok | deus-grok | gemini | PASS |
| TOOL.01.01/lane-bz | 2026-09-28 | grok | deus-ops | gemini | PASS |
| NAT.04.01/lane-by | 2026-09-28 | grok | deus-grok | minimax | FAIL |
| NAT.03.01/lane-bx | 2026-09-28 | grok | deus-ops | minimax | PASS |
| NAT.03.01/lane-bx | 2026-09-28 | grok | deus-ops | minimax | PASS |
| NAT.02.01/lane-bv | 2026-09-28 | grok | deus-ops | codex | PASS |
| WG.00.40/lane-bs | 2026-09-27 | grok | deus-ops | gemini | PASS |
| WG.00.39/lane-bg | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| WG.00.39/lane-bg | 2026-09-27 | codex | deus-codex | grok | FAIL |
| WG.00.38/lane-ax | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| WG.00.36/lane-bf | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| WG.00.36/lane-bf | 2026-09-27 | codex | deus-codex | grok | FAIL |
| WG.00.35/lane-aw | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| WG.00.21/lane-be | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| WG.00.21/lane-be | 2026-09-27 | codex | deus-codex | grok | FAIL |
| WG.00.15/lane-av | 2026-09-27 | gemini | deus-gemini | grok | PASS |
| SOC.40.02/lane-bq | 2026-09-27 | grok | deus-grok | codex | PASS |
| SOC.32.01/lane-br | 2026-09-27 | grok | deus-grok | codex | PASS |
| SOC.31.01/lane-bp2 | 2026-09-27 | grok | deus-grok | codex | PASS |
| SOC.30.01/lane-bo | 2026-09-27 | grok | deus-grok | codex | ? |
| SOC.20.01/lane-bl | 2026-09-27 | grok | deus-grok | gemini | PASS |
| SOC.20.01/lane-bl | 2026-09-27 | grok | deus-grok | gemini | FAIL |
| SOC.20.01/lane-bl | 2026-09-27 | grok | deus-grok | gemini | FAIL |
| SOC.12.01/lane-bk | 2026-09-27 | grok | deus-grok | gemini | FAIL |
| SOC.12.01/lane-bk | 2026-09-27 | grok | deus-grok | gemini | CLEAN_PASS |
| SOC.11.02/lane-bm | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| SOC.11.01/lane-bn | 2026-09-27 | grok | deus-grok | fable | PASS |
| SOC.10.03/lane-bh | 2026-09-27 | codex | deus-codex | grok | CLEAN_PASS |
| SOC.10.03/lane-bh | 2026-09-27 | codex | deus-codex | grok | FAIL |
| SOC.10.02/lane-az | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| SOC.10.01/lane-ba | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.60.07/lane-aq | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.50.12/lane-af | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.50.02/lane-au | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.40.05/lane-ay | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.10.05/lane-ag | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.10.02/lane-ar | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| OPS.70.01/lane-as | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| OPS.40.06/lane-at | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| DEUS-TSK-WORLD-ITEMS/lane-ao | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| DEUS-TSK-EFFORT-POLICY/lane-bc | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| DEUS-TSK-DEPTH-DEMO/lane-ap | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| DEUS-TSK-COMBAT-U7/lane-an | 2026-09-27 | gemini | deus-gemini | grok | CLEAN_PASS |
| WG.65.15/lane-l1 | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| WG.41.01/lane-u | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| WG.33.01/lane-x | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| WG.32.02/lane-t | 2026-09-26 | grok | deus-grok | claude | PASS |
| WG.20.02/lane-s | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| WG.20.01/lane-al | 2026-09-26 | gemini | deus-gemini | grok | PASS |
| WG.20.01/lane-al | 2026-09-26 | gemini | deus-gemini | grok | CLEAN_PASS |
| WG.20.01/lane-al | 2026-09-26 | gemini | deus-gemini | grok | ? |
| WG.20.01/lane-al | 2026-09-26 | gemini | deus-gemini | grok | PASS |
| WG.00.17/lane-aa | 2026-09-26 | gemini | deus-gemini | grok | ? |
| WG.00.17/lane-aa | 2026-09-26 | gemini | deus-gemini | grok | PASS |
| WG.00.12b/lane-g1 | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| WG.00.12/lane-j | 2026-09-26 | grok | deus-grok | claude | PASS |
| WG.00.12/lane-i | 2026-09-26 | grok | deus-grok | claude | PASS |
| WG.00.09b/lane-k | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| WG.00.09b/lane-k | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| WG.00.09b/lane-k | 2026-09-26 | grok | deus-grok | claude | FAIL |
| SIM.60.06/lane-ah | 2026-09-26 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.60.05/lane-ab | 2026-09-26 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.60.05/lane-ab | 2026-09-26 | claude | deus-claude | grok | FAIL |
| SIM.60.02/lane-v | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| SIM.60.01/lane-p | 2026-09-26 | grok | deus-grok | claude | PASS |
| SIM.50.13/lane-ae | 2026-09-26 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.50.11/gap-audit-people | 2026-09-26 | grok | deus-grok | claude | PASS |
| SIM.50.01/gap-audit | 2026-09-26 | grok | deus-grok | ? | PASS |
| SIM.40.11/lane-ad | 2026-09-26 | gemini | deus-gemini | grok | CLEAN_PASS |
| SIM.40.10/lane-w | 2026-09-26 | grok | deus-grok | claude | PASS |
| SIM.40.05/lane-r | 2026-09-26 | grok | deus-grok | claude | PASS |
| SIM.40.05/lane-r | 2026-09-26 | grok | deus-grok | claude | FAIL |
| SIM.40.01/lane-q | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| SIM.40.01/lane-q | 2026-09-26 | grok | deus-grok | claude | FAIL |
| SIM.40.00/lane-ac | 2026-09-26 | claude | deus-claude | grok | FAIL |
| SIM.40.00/lane-ac | 2026-09-26 | claude | deus-claude | grok | PASS |
| SIM.00.01/lane-m | 2026-09-26 | grok | deus-grok | ? | FAIL |
| SIM.00.01/lane-m | 2026-09-26 | grok | deus-grok | ? | PASS |
| SIM.00.01/lane-m | 2026-09-26 | gemini | snewt | ? | ? |
| SIM.00.00/lane-n | 2026-09-26 | grok | deus-grok | claude | CLEAN_PASS |
| OPS.70.02/lane-z | 2026-09-26 | grok | deus-grok | claude | PASS |
| OPS.30.06/lane-ai | 2026-09-26 | gemini | deus-gemini | grok | CLEAN_PASS |
| OPS.30.01/lane-y | 2026-09-26 | grok | deus-grok | claude | PASS |
| OPS.20.06/lane-ak | 2026-09-26 | gemini | deus-gemini | grok | PASS |
| OPS.10.04/lane-aj | 2026-09-26 | gemini | deus-gemini | grok | CLEAN_PASS |
| DEUS-TSK-AUDIO-STD/lane-am | 2026-09-26 | gemini | deus-gemini | grok | CLEAN_PASS |
