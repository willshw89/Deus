# MODEL AVAILABILITY STATE — Project DEUS

**Current Integration Authority:** Owner Terminal (Gemini)  
**Last Updated:** 2026-09-25  
**Governing Standard:** [`docs/AGENT_UTILIZATION_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_UTILIZATION_POLICY.md)  

---

## 1. Active Model Pool & Availability State

| Model / Work Destination | Designated Role | Access | Current State | CLI Ready | Strongest Discovered Model | Configuration / Effort | Routing Policy |
|---|---|:---:|:---:|:---:|---|---|---|
| **Claude / Fable** | Bounded Implementation & Core Engineering | `YES` | **`AVAILABLE`** | `YES` | `claude-opus-5-5[1m]` | `effort: xhigh`, 1M context | Active owner of bounded implementation leaves (e.g. `WG.00.08 / FABLE-19B`). MAX_QUALITY routing. |
| **Grok** | Parallel Analysis, Adversarial Review, Profiling | `YES` | **`AVAILABLE`** | `YES` | `grok-4.7` | Highest reasoning | Saturate available capacity on independent audits, seed sweeps, benchmarks, and reviews. MAX_QUALITY routing. |
| **Codex** | Mutation Testing & Invariant Breaking | `YES` | **`EXHAUSTED`** | `NO` | *(Deferred to reset)* | Highest appropriate reasoning | Owner holds access; current period usage exhausted. Retain queued tasks; re-probe when quota resets. |
| **Gemini / Antigravity** | Coordinator, Control Tower, Architecture, Nano Banana Pro Art | `YES` | **`AVAILABLE`** | `YES` | `gemini-3-pro` / `gemini-3-pro-image` | High reasoning / Thinking | Integration authority, gatekeeper, regression verifier, and author of authentic pixel art assets. MAX_QUALITY routing. |

---

## 2. Recognized Owner Signals

Send these explicit signals to toggle model availability at any time:
- `CLAUDE AVAILABLE` / `FABLE AVAILABLE`
- `GROK AVAILABLE`
- `CODEX AVAILABLE`
- `CLAUDE EXHAUSTED` / `GROK EXHAUSTED` / `CODEX EXHAUSTED`
- `MAX_UTILIZATION` (Enforce maximum productive subscription usage per `AGENT_UTILIZATION_POLICY.md`)
- `MAX_QUALITY` (Enforce maximum model strength, reasoning effort, and large context)

---

## 3. Operating Principles

1. **MAX_QUALITY Default:** Substantive delegated work defaults to the strongest currently available provider model, highest practical reasoning/effort, and expanded context when beneficial.
2. **Maximum Productive Compute:** Convert expiring AI subscription usage into project progress, test coverage, and performance validation rather than saving quota.
3. **Strict Non-Overlapping Path Ownership:** No two workers modify the same files concurrently.
4. **Multi-Model Attack on High-Risk Work:** Deploy parallel workers for implementation, adversarial review, and independent test generation using strong models on both sides.
5. **Worktree Isolation:** Concurrent implementation tasks operate in isolated git worktrees.
6. **Transparent Reporting:** Report requested model, actual model, reasoning effort, and any forced downgrade reasons.
