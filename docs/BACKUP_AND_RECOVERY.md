# DEUS — BACKUP, DISASTER RECOVERY & RUNBOOKS (v1)
**Authoritative Operational Recovery Standard**
**Integration Authority:** Gemini / Antigravity
**Approved by Owner Directive:** 2026-09-25

---

## 1. Storage Architecture & Working Copy Relocation

### A. The OneDrive Elimination Mandate
Development of a high-concurrency multi-agent game project in a cloud-synchronized folder (`OneDrive`) introduces file-locking race conditions, phantom file creations, high disk I/O latency, and git index corruption.

- **Active Engineering Authority:** Relocating during Phase 2 of consolidation to local, non-synchronized NVMe storage:
  `C:\Dev\DEUS`
- **Role of OneDrive / External Cloud:** Backup and export storage ONLY; never the live active working directory for development agents.

### B. Disaster Recovery Tiers
| Tier | Content | Backup Frequency | Target Destination | Recovery RTO |
|---|---|---|---|---|
| **Tier 1: Core Code & Data** | Git repository, plugins, tools, catalogs, docs | Continuous (per commit) | Git Remote / Local Mirror | $< 5\text{ minutes}$ |
| **Tier 2: Generated Art Masters** | Raw Nano Banana Pro generation outputs, atlas masters | Daily / Task Completion | External Local Backup / Cloud Archive | $< 1\text{ hour}$ |
| **Tier 3: Reference & Style Archives** | U7 references, palette definitions, training sets | Weekly / Milestone | Cold Archive Storage | $< 4\text{ hours}$ |

---

## 2. Operational Runbooks

### Runbook 1: Agent Session Crash or Lost Worktree Recovery
*Scenario:* An AI agent crashes, loses conversational context, or terminates unexpectedly while working in an isolated worktree (`scratchpad/wt*`).

1. **Locate Worktree State:**
   Inspect the worktree path on disk:
   ```powershell
   cd <worktree_path>
   git status
   git diff
   ```
2. **Inspect Mailbox & Telemetry:**
   Read `docs/agents/mailboxes/<task_id>/` to retrieve the last logged handoff packet, defect report, or test output.
3. **Determine Worktree Fate:**
   - *If work is clean and tests pass:* Commit with `[agent] <task_id> closeout` and dispatch review.
   - *If work is broken or mid-refactor:* Review git diff. If unrecoverable within 15 minutes, delete worktree, prune task branch, and re-dispatch clean task contract.
4. **Clean Git State:**
   ```powershell
   git worktree prune
   ```

---

### Runbook 2: Corrupted Working Copy or Failed Integration Rollback
*Scenario:* A faulty merge introduces widespread test failures or unresolvable git conflicts on canonical `main`.

1. **Halt Integration Immediately:** Notify agents that `main` is locked.
2. **Identify Last Known Good Commit:**
   ```powershell
   git log -n 5 --oneline
   ```
3. **Hard Reset Canonical Main to Last Verified Commit:**
   ```powershell
   git reset --hard <last_good_commit_hash>
   git clean -fd
   ```
4. **Re-verify Sanity:**
   ```powershell
   node tools/test_strata_cuts_and_caves.js --no-suites
   ```
5. **Post-Mortem:** Record root cause in `docs/telemetry/incidents.json`.

---

### Runbook 3: Provider API Outage or Quota Exhaustion
*Scenario:* A key provider (OpenAI Codex, Claude, Grok, or Google Gemini) encounters rate limits, quota exhaustion, or service outage.

1. **Consult Unified Telemetry:**
   Inspect `docs/agents/PROVIDER_USAGE_STATUS.json`.
2. **Execute Canonical Fallback Routing:**
   - If **Claude (Fable)** exhausts: Route implementation to **Codex Astra** or **Grok Code**.
   - If **Grok** exhausts: Route adversarial review to **Claude Code** (with independent red-team prompt).
   - If **Gemini** approaches limit: Conserve control plane tokens; delegate sub-tasks to available CLI workers.
3. **Record Routing Divergence:** Log reason in task telemetry.

---

### Runbook 4: Emergency Save File Corruption Repair
*Scenario:* A player save file fails to load or triggers runtime exceptions upon area transition.

1. **Extract Save JSON:** Pretty-print the corrupted save state into `scratch/save_debug.json`.
2. **Run Integrity Validator:**
   ```powershell
   node tools/verify_save_integrity.js scratch/save_debug.json
   ```
3. **Identify Schema Mismatch:** Compare `saveSchemaVersion` with engine version in `DEUS_Core.js`.
4. **Apply Schema Repair:** Run migration pipeline manually to regenerate missing cache structures or clamp out-of-bounds entity coordinates.
