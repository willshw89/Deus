# DEUS — QUALITY ENGINEERING & VERIFICATION POLICY
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)
**Approved by Owner Directive:** 2026-09-25

---

## 1. Executive Quality Charter

Every capability in Project DEUS is governed by the five-phase quality lifecycle:
```text
SPECIFY → IMPLEMENT → BREAK (Rule 4 Mutants) → BENCHMARK → INTEGRATE
```

### Core Tenets
1. **Tests Must Be Able to Fail (Binding Rule 4)**: No hardcoded passes. Every verification suite must include negative testing, boundary conditions, and pinned mutation tests proving that defects are detected.
2. **Nothing is Done Until Seen Working**: Definition of Done requires automated verification, native RMMZ/NW.js playtest execution, and screenshot proof of visual acceptance.
3. **Performance as an Acceptance Gate**: Code that functions correctly but introduces an unexplained performance regression is not integration-ready. All substantive tasks adhere to [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md).
4. **Adversarial Independent Review**: Major systems undergo adversarial review by independent models (e.g. Grok red-team review, Gemini independent verification) before canonical merge.

---

## 2. Quality & Performance Verification Gates

Before any implementation branch is merged into canonical `main`:
1. **Automated Suite**: 100% pass on dedicated and regression test suites.
2. **Mutation Suite**: Pinned mutant detection verifying that altered logic triggers test failure.
3. **Performance Baseline**: Benchmarked against golden scenarios defined in [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md). Zero unexplained regressions.
4. **Native Playtest Smoke**: NW.js boots cleanly with zero new F8 console errors.
5. **Observability Verification**: System state is inspectable via `UF_Look` and `UF_Sheet`.

---

## 3. Cross-System Architecture References
- **Agent Quality & Continuous-Learning Standard:** [`docs/AGENT_QUALITY_LEARNING_LOOP.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_QUALITY_LEARNING_LOOP.md) (Evidence-based learning, corrections & telemetry)
- **Performance Standard**: [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md)
- **Multi-Agent Orchestration**: [`docs/AGENT_UTILIZATION_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_UTILIZATION_POLICY.md)
- **Repository Consolidation**: [`docs/CONSOLIDATION_PLAN_V1.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/CONSOLIDATION_PLAN_V1.md)
- **WorldGen Work Breakdown**: [`docs/worldgen/DEUS_WORLDGEN_WBS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_WORLDGEN_WBS.md)
- **Risk Register**: [`docs/RISK_REGISTER.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/RISK_REGISTER.md)

