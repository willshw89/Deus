# MODEL AVAILABILITY STATE — Project DEUS

**Current Integration Authority:** Owner Terminal (Gemini)  
**Last Updated:** 2026-09-22  

---

## 1. Active Model Pool & Availability State

| Model / Work Destination | Designated Role | Current Status | Last Signal / Status Change | Routing Policy |
|---|---|---|---|---|
| **Codex Astra Ultra** | Architecture Council | `UNAVAILABLE` (`WAITING_FOR_MODEL_CREDITS`) | 2026-09-22 | Unavailable per owner signal. Mark dependent architectural reviews waiting or route safe/minor reviews to Gemini. |
| **Claude Code Fable Ultra** | Build Bench / Implementation | `AVAILABLE` | 2026-09-22 | Available per owner signal ("Fable Multiagent is available"). Assigned to bounded implementation blocks and automated testing. |
| **Gemini / Antigravity** | Owner Terminal, Control Tower, Economy & Sim Review, Verification/Debug, Provenance/Assets, Nano Banana Pro Art | `AVAILABLE` | 2026-09-22 | Active in current session. Handles intake, governance, testing, simulation reviews, and Nano Banana Pro art production. |

---

## 2. Recognized Owner Signals

Send these explicit signals to toggle model availability at any time:
- `ASTRA AVAILABLE`
- `FABLE AVAILABLE`
- `ASTRA AND FABLE AVAILABLE`
- `ASTRA UNAVAILABLE`
- `FABLE UNAVAILABLE`

---

## 3. Fallback & Operating Rules

1. **Credit Exhaustion / Model Downtime (`WAITING_FOR_MODEL_CREDITS`):**
   - When Astra or Fable is unavailable, mark affected work blocks in `docs/WORK_QUEUE.md` as `WAITING_FOR_MODEL_CREDITS`.
   - Never simulate or fake a handoff to an unavailable model.
   - Continue safe planning, documentation, Idea Arsenal curation, headless automated test writing, profiling, and review work with Gemini.
2. **Single Implementation Authority:**
   - Only assign bounded implementation blocks to confirmed available models.
   - Each implementation block must have strictly non-overlapping path boundaries.
