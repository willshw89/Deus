# QUALITY_ENGINEERING_POLICY: what ENGINE_RULES does not say

> The rules are in `docs/ENGINE_RULES.md` §5 (testing), §6 (the three Definition-of-Done levels) and §7 (performance). Reduced 2026-09-29 from the 2026-09-25 policy; its gate checklist (automated suite, mutants, performance, native smoke, observability) is now ENGINE_RULES §5-§9 and is not repeated here.

## The lifecycle of a capability
```text
SPECIFY -> IMPLEMENT -> BREAK (mutants, Rule 4) -> BENCHMARK (targets in PERFORMANCE_ARCHITECTURE; enforced numbers in ENGINE_RULES §7) -> INTEGRATE (merge gate)
```
The Definition of Done is compiled before coding starts and is not redefined afterwards. Every lane's brief says which of the three DoD levels it must reach and which proof is planned versus observed (`tools/ops/GAME_TRANSLATION_TEMPLATE.md`).

## Review
- Independent, cross-family, adversarial review before any merge (`.agents/rules/deus-review-policy.md`). The reviewer reads the diff and the tests before the writer's narrative.
- A correct feature with an unexplained performance regression against a recorded baseline is not integration-ready; the PM classifies it as defect, justified tradeoff, or noise (five repeated runs).

## Where the related documents are
- Agent mailboxes and evidence: `docs/AGENT_COMMUNICATION_PROTOCOL.md`
- Learning loop and telemetry: `docs/AGENT_QUALITY_LEARNING_LOOP.md`
- Performance targets: `docs/PERFORMANCE_ARCHITECTURE.md`
- Multi-agent orchestration: `docs/AGENT_UTILIZATION_POLICY.md`, `tools/ops/ANTIGRAVITY.md`
- Risk register: `docs/RISK_REGISTER.md`
- WorldGen WBS: `docs/worldgen/DEUS_WORLDGEN_WBS.md`
