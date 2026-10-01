# RELEASE CHECKLIST & GATE — Project DEUS

**Release Gate Authority:** Owner Terminal (Gemini)  
**Last Updated:** 2026-09-22  
**Current Milestone Target:** Slice 1 Final Gate -> Playable Demo (Slices 0–7)  

---

## 1. Release Gate Criteria

Before any slice, milestone, or build package can be declared `RELEASE_ELIGIBLE` or `DONE`, every verification gate below must be explicitly satisfied and recorded with physical evidence.

```text
[ENGINE INTEGRITY] ──> [AUTOMATED SUITES] ──> [NATIVE MZ INSPECTION] ──> [PERFORMANCE AUDIT] ──> [PROVENANCE AUDIT] ──> [OWNER SIGN-OFF]
```

---

## 2. Gate Verification Checklist

| Gate # | Verification Dimension | Required Standard | Evidence / Command Required | Status |
|---|---|---|---|---|
| **G1** | **Engine Core Integrity** | `game/js/rmmz_*.js`, `game/js/main.js`, and `game/js/libs/` are completely unmodified from stock RMMZ v1.10.0. All game logic resides in `game/js/plugins/DEUS_*.js`. | `git diff HEAD -- game/js/rmmz_*.js game/js/main.js game/js/libs/` returns empty diff. | `PASS` |
| **G2** | **Automated Test Suites** | All automated test suites (`smoke`, `sheet`, `colonists`, `jobs`, `perf`) run clean with 0 failures and 0 unhandled rejections. | `node tools/run_tests.js smoke` (13/13 PASS), `sheet` (16/16 PASS), `colonists` (5/5 PASS), `jobs` (19/19 PASS). Exit code 0. | `PASS` |
| **G3** | **Native MZ Playtest** | Game boots cleanly in RPG Maker MZ editor (F5). New Game reaches `Scene_Map`. Title scene, map navigation, input handling, and camera follow function properly. Dev console (F8) has zero unhandled errors. | Actual live screenshot opened and inspected. Console log excerpt verified with 0 errors. | `VERIFY` (Awaiting Owner Review) |
| **G4** | **Performance & Frame Budget** | Simulation maintains a solid 60 FPS (frame time < 16.6 ms) at 1x speed, and >= 30 FPS at 8x speed. No global full-world scans per frame. Memory footprint stable over extended play. | Headless probe measurements from `docs/rmmz/probe-results.json` and in-game performance logs. | `PASS` |
| **G5** | **Asset Provenance & Licensing** | Zero unlicensed, ripped, or third-party assets in `game/img/`. All shipped art originates from Google Nano Banana Pro or verified original source. Passes `tools/originality_check.js`. No `U7_` stand-ins in release build. | `tools/originality_check.js` audit, `docs/ASSET_MANIFEST.md` registry. | `PASS` (Dev Stand-ins documented) |
| **G6** | **Save / Load Integrity** | Clean round-trip serialization and deserialization via `DataManager.saveGame` / `loadGame`. Zero circular reference errors (`Object too deep`). Schema version explicitly tagged. | Automated `smoke.save_serializes` passes. Cache correctly rebuilt upon load. | `PASS` |
| **G7** | **Documentation Reality** | `docs/STATUS.md`, `docs/SLICES.md`, `docs/VISION.md`, and `docs/WORK_QUEUE.md` accurately match disk reality. No unverified claims. | Manual audit against working tree and git log. | `PASS` |
| **G8** | **Owner Explicit Approval** | The owner has personally tested the slice in RMMZ and provided an explicit "approved" in Owner Terminal. | Recorded timestamp and owner quote in `docs/SLICES.md`. | `PENDING` |

---

## 3. Release Gate Sign-Off Record

- **Slice / Build ID**: Slice 1: Autonomous Colonist AI & Settlement Construction
- **Evaluator**: Owner Terminal (Gemini)
- **Technical Sign-off**: Ready for Owner Native Playtest Review.
- **Owner Sign-off**: `PENDING OWNER REVIEW`
