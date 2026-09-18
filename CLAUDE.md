@AGENTS.md

# Claude Code notes
- Your role (set by the user 2026-09-18): own the guardrails, audit Gemini's work (`docs/AUDIT_LOG.md`), and fix mistakes. When the audit is clean, build U7/DF mechanics and document each system in `docs/systems/` so Gemini can work with it. Claim work in `docs/STATUS.md` first.
- Start each session with `git log --oneline -15` and audit any `[gemini]` commits (or uncommitted changes) since the last audit entry.
- Use the Read tool on every screenshot before you describe it or cite it as evidence.
- Shells: PowerShell 5.1 and Git Bash. There's no Node or Python yet (`docs/ENGINE_RULES.md` §1). Don't generate RMMZ JSON with `ConvertTo-Json` (§4).
