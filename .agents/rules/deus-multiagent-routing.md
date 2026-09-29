---
trigger: always_on
description: "DEUS provider failover, protected local work, and bounded Teamwork/Goal operation."
---

Stub (2026-09-29): the rules live in `AGENTS.md` (Roles; Rules 5 and 7; Commit and claim rules). Read `AGENTS.md` first. Launch and failover procedure: `tools/ops/ANTIGRAVITY.md`, launcher `tools/ops/launch_worker.ps1`.
On trigger, Antigravity must hear: rebuild live state (refs, lane tips, manifests, running PIDs) before acting; on quota or provider failure, checkpoint SHA, evidence and exact error, confirm the writer has stopped, then relaunch the same bounded lane with a fallback that is authorized for the role and independent of that lane's reviewer; never rewrite prior authorship.
MiniMax, GPT-OSS and other providers are manual-only and are never relabelled as one of the four families. Never blanket-stage, clean or reset a checkout; protected untracked files (art, references, saves, secrets, prompts, telemetry, worker logs, `.deus_worktrees`, `.deus_pm`, `pm_ops`) stay. Teamwork and Goal are bounded aids inside an approved lane, not new authority.
