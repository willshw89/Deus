# Provider usage and assignment policy

Authority: Owner, 2026-10-02 20:26 CT. Maintained by Codex PM; Claude may take over PM duties from AGENTS.md and the WBS if Codex is unavailable. This branch copy is pending review/integration; the main checkout is protected.

| Provider | Last observed status | Evidence / qualification | Reset date and time (America/Chicago) | Weekly reset day |
|---|---|---|---|---|
| Codex | available | Active PM session, 2026-10-02; remaining allowance unknown | Not supplied | Not supplied |
| Claude | available at last use | claude-fable-5-1 completed fix commit 248fc691 on 2026-10-02; worker later stopped without a final result; no quota error observed in the inspected tail | Not supplied | Not supplied |
| Grok | available at last use | grok-4.7 produced audit activity on 2026-10-02; remaining allowance unknown | Not supplied | Not supplied |
| Gemini | not checked | No current availability evidence; do not infer quota from old telemetry | Not supplied | Not supplied |

Operational statuses are available, low and out. Not checked is an evidence gap, not an availability claim. Never invent reset times or weekly days. Update this table from the Owner's limit/reset notices or an actual provider error, including the observation date. Check it before every assignment. A reset date passing does not prove availability.

- Hard lanes: Claude -> Codex -> Grok, top effort. Mechanical lanes: Grok -> Gemini -> Claude, lower effort appropriate to the work.
- Reviewer: an available family different from every implementation contributor. If none is available, finish writing and queue the lane for review. Never merge unreviewed.
- Do not switch an assigned writer because it is low. Pause until reset unless it has failed to fix the same item in two rounds; then hand off the item with notes. Provider interruption without a quota error is not an out-of-usage verdict.
- Each lane maintains scratchpad/<lane>/NOTES.md with done, next, tried, exact commits/results, attempts and blockers. Preserve these notes and logs across resumes.
- One writer at a time. Verify the old process and its children have stopped before resuming; never kill another lane's processes. A different-family handoff also requires a reviewer independent of all contributors.

## Current assignment

ORG-0.2 / lane-worldgen-green: Claude writer at max effort, Grok reviewer. Resume item (a)'s interrupted post-commit test at 248fc691; then proceed in the Owner's order. Runtime acceptance and independent review are pending.
