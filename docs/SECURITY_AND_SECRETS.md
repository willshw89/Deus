# DEUS — SECURITY & SECRETS POLICY (v1)
**Authoritative Security & Secrets Management Standard**
**Integration Authority:** Gemini / Antigravity
**Approved by Owner Directive:** 2026-09-25

---

## 1. Absolute Zero-Secrets Rule

Project DEUS enforces a strict, non-negotiable **Zero-Secrets Invariant**:

> *"No API key, provider token, authentication cookie, session credential, password, or private credential may enter Git history, task telemetry, agent logs, communication packets, or committed prompts."*

Any commit containing a secret constitutes an immediate security incident requiring repository sanitization and key revocation.

---

## 2. Protected Credential Categories

The following patterns must never appear in repository files or committed documents:
- **Provider API Keys:** OpenAI (`sk-...`), Google AI (`AIza...`), Anthropic (`sk-ant-...`), xAI (`xai-...`).
- **Authentication Tokens:** Bearer tokens, JWT tokens, OAuth access/refresh tokens.
- **Local Configuration:** Personal paths containing credentials, private SSH keys, `.netrc` entries.
- **Session Cookies:** Browser session headers or intercepted auth cookies.

---

## 3. Storage & Configuration Architecture

All authentication credentials must be kept strictly outside the repository:

| Credential Type | Canonical Storage Location | Tracking Status |
|---|---|---|
| **Antigravity CLI / Gemini Auth** | User Profile (`~/.gemini/`, Windows Credential Vault) | Strictly Excluded from Repo |
| **Claude / Fable Auth** | User Profile (`~/.claude.json`) | Strictly Excluded from Repo |
| **Local Environment Variables** | Local `.env` (if applicable) | Enforced in `.gitignore` |
| **Provider Telemetry Data** | `docs/agents/PROVIDER_USAGE_STATUS.json` | Token counts and quotas ONLY; zero keys |

---

## 4. Agent Permissions & Least-Privilege Execution

1. **Workspace Boundary:** AI subagents operate strictly within designated workspace paths (`c:\Users\snewt\OneDrive\Desktop\UF` or `C:\Dev\DEUS` and temporary scratchpads). Subagents are prohibited from writing outside the project tree.
2. **Tool Restrictions:** Autonomous subagents possess read/write tools scoped to project code and assets. Shell execution is strictly bounded.
3. **Prompt Cleansing:** When agents dispatch prompts or tasks to other models or subagents, all authorization headers and credentials are scrubbed.

---

## 5. Automated Secret Scanning

During the post-19B consolidation window, an automated pre-commit secret scanner (`tools/security/scan_secrets.js`) will be deployed to enforce:
- High-entropy string detection in staged files.
- Regex pattern matching for known provider keys (`sk-`, `AIza`, `xai-`, `bearer`).
- Verification that `.env` and credential files remain untracked.

---

## 6. Incident Response Runbook

If a secret or credential is inadvertently committed to the repository:
1. **Immediate Revocation:** Revoke the exposed key immediately via the provider console.
2. **Repository Purge:** Use `git filter-repo` or BFG Repo-Cleaner to scrub the commit from local history.
3. **Verification:** Confirm clean status across all active branches and worktrees before resuming operations.
4. **Log Incident:** Record a sanitized post-mortem entry in `docs/telemetry/security_incidents.json`.
