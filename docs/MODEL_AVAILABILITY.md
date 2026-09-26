# MODEL AVAILABILITY STATE — Project DEUS

**Current Integration Authority:** Coordinator (Gemini)  
**Last Updated:** 2026-09-25  
**Governing Standard:** [`docs/AGENT_UTILIZATION_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_UTILIZATION_POLICY.md)  

---

## 1. Active Model Pool & Availability State

| Provider | Role | Access | State | CLI Ready | Strongest Discovered Model | Configuration / Effort | Multi-Agent Support | Image Gen | Routing Policy |
|---|---|:---:|:---:|:---:|---|---|:---:|:---:|---|
| **Claude / Fable** | Bounded Implementation & Core Engineering | YES | **AVAILABLE** (Session 3%, Weekly 95%, resets Tue Sep 29 16:59 CT) | YES | claude-opus-5-5[1m] | effort: max | **YES** | FROZEN (DEC-007) | Budget kept for reviews and live writers. |
| **Grok** | Adversarial review & mutation testing | YES | **AVAILABLE** | YES | grok-4.7 | reasoning-effort: xhigh | **YES** | FROZEN (DEC-007) | Writes lane-ab/lane-ac. |
| **Grok Bot** | PM (directives, verification sign-off, mailbox) | YES | **AVAILABLE** | N/A | grok-4.7 | PM Mailbox Authority | **YES** | FROZEN (DEC-007) | Directives, independent verification sign-off, mailbox communication. |
| **OpenAI Codex** | Bounded tooling & tests | YES | **EXHAUSTED** (Until Tue Sep 29 21:34 CT) | NO | gpt-6-astra | effort: ultra | **YES** | FROZEN (DEC-007) | EXHAUSTED account-wide. No Codex lanes until reset. |
| **Gemini / Antigravity** | Coordinator & integrator only | YES | **AVAILABLE** | YES | gemini-3.1-pro-preview | High reasoning / Thinking | **YES** | FROZEN (DEC-007) | Coordinator, integrator, and WBS state maintainer. |

*Owner rule (2026-09-26): every worker runs the strongest model at max effort (Claude claude-opus-5-5[1m] --effort max; Grok grok-4.7 --reasoning-effort xhigh; Codex gpt-6-astra effort ultra).*

