# MODEL AVAILABILITY STATE — Project DEUS

**Current Integration Authority:** Coordinator (Gemini)  
**Last Updated:** 2026-09-25  
**Governing Standard:** [`docs/AGENT_UTILIZATION_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_UTILIZATION_POLICY.md)  

---

## 1. Active Model Pool & Availability State

| Provider | Role | Access | State | CLI Ready | Strongest Discovered Model | Configuration / Effort | Multi-Agent Support | Image Gen | Routing Policy |
|---|---|:---:|:---:|:---:|---|---|:---:|:---:|---|
| **Claude / Fable** | Bounded Implementation & Core Engineering | `YES` | **`AVAILABLE`** | `YES` | `claude-opus-5-5[1m]` | `effort: xhigh`, 1M context | **YES** (native subagents, agent teams) | `FROZEN (DEC-007)` | Active owner of bounded implementation leaves. MAX_MULTIAGENT routing. |
| **Grok** | Adversarial review & mutation testing; does not author specs or results docs | `YES` | **`AVAILABLE`** | `YES` | `grok-4.7` | Highest reasoning | **YES** (native `--agents`, parallel sessions) | `FROZEN (DEC-007)` | Adversarial analysis, test design, profiling. MAX_MULTIAGENT routing. |
| **Grok Bot** | PM (directives, verification sign-off, mailbox) | `YES` | **`AVAILABLE`** | `N/A` | `grok-4.7` | PM Mailbox Authority | **YES** | `FROZEN (DEC-007)` | Directives, independent verification sign-off, mailbox communication. |
| **OpenAI Codex** | Bounded tooling & tests (EXHAUSTED) | `YES` | **`EXHAUSTED`** (Owner-confirmed 16:25) | `NO` | **`astra`** (Codex Model) | Highest appropriate reasoning | **YES** (when available) | `FROZEN (DEC-007)` | Usage exhausted; reset time unknown. Lane C1 failed over to Claude (merged). |
| **Gemini / Antigravity** | Coordinator & integrator only; no self-certification; writes only its governance set | `YES` | **`AVAILABLE`** | `YES` | `gemini-3-pro` | High reasoning / Thinking | **YES** (`invoke_subagent`, `define_subagent`) | `FROZEN (DEC-007)` | Coordinator, integrator, and WBS state maintainer. Writes only governance set. MAX_MULTIAGENT routing. |

---

## 2. Recognized Owner Signals

Send these explicit signals to toggle model availability at any time:
- `CLAUDE AVAILABLE` / `FABLE AVAILABLE`
- `GROK AVAILABLE`
- `CODEX AVAILABLE` / `ASTRA AVAILABLE`
- `CLAUDE EXHAUSTED` / `GROK EXHAUSTED` / `CODEX EXHAUSTED` / `ASTRA EXHAUSTED`
- `MAX_UTILIZATION` (Enforce maximum productive subscription usage per `AGENT_UTILIZATION_POLICY.md`)
- `MAX_MULTIAGENT` (Enforce maximum model strength, highest reasoning, and multi-agent execution)

---

## 3. Operating Principles

0. **No art generation without Owner involvement (DEC-007):** No art of any kind may be generated, requested from any generator, or integrated as newly generated art by any agent without the Owner's direct involvement.
1. **MAX_MULTIAGENT Default:** Substantive delegated work defaults to the strongest currently available provider model, highest practical reasoning/effort, expanded context when beneficial, and provider-native multi-agent/subagent execution whenever supported.
2. **[SUSPENDED — DEC-007] Absolute WBS-Catalogue Image Rule:** All DEUS image generation is subordinate to the canonical WBS and semantic asset catalogue. Pre-assigned atlas slots precede generation. Multi-provider generation operates strictly across different READY catalogue families for source art only.
3. **[SUSPENDED — DEC-007] WorldGen Physical Gates:** No mass image generation occurs before physical world completion and gates WG.10–WG.33 are satisfied.
4. **Maximum Productive Compute:** Convert expiring AI subscription usage into project progress, test coverage, and performance validation rather than saving quota.
5. **Strict Non-Overlapping Path Ownership:** Exactly one primary writer per file path. Subagents inspect, reason, test, profile, and propose patches read-only.
6. **Transparent Reporting:** Report requested model, actual model, reasoning effort, multiagent execution state, and any forced downgrade reasons.

