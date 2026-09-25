# DEUS Agent Mailboxes

Durable mailbox repository adhering to `docs/AGENT_COMMUNICATION_PROTOCOL.md` and `docs/INVARIANT_REGISTRY.md` (`INV-GOV-04`).

## Structure

```text
docs/agents/mailboxes/
├── gemini/            # Messages and dispatch packets for Gemini / Antigravity
│   ├── inbox.jsonl
│   └── outbox.jsonl
├── fable/             # Messages and handoffs for Claude / Fable
│   ├── inbox.jsonl
│   └── outbox.jsonl
├── grok/              # Defect submissions and review reports for Grok
│   ├── inbox.jsonl
│   └── outbox.jsonl
├── codex/             # Audit requests and findings for Codex
│   ├── inbox.jsonl
│   └── outbox.jsonl
└── broadcast.jsonl    # Global inter-agent broadcasts and milestone events
```
