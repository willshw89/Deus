# DATA-SAVE — global save version and migrations

**Status:** PARKED Owner-requested lane stub, 2026-10-03; second foundation job in [the sequence](README.md). **Writer:** Grok. **Reviewer:** Claude (cross-family).

**Why the player cares:** A colony saved before a data or engine change must either load into the current rules without losing entities, or stop with a clear error naming the incompatible reference.

Add `saveFormatVersion` to every new save and one explicit migration function for each version bump. Run migrations in order before live consumers see the data. Keep content IDs as strings at the save boundary, never transient registry-list indices; test registry reordering. Preserve stable entity IDs and rebuild derived caches and typed indexes after load.

This lane must **reconcile**, not duplicate, current migration authorities. On main `038a02c3`, `DEUS_World.js:857` initializes world state at `version: 4`; `DEUS_Levels.js` has `strataSchemaVersion`, legacy-to-five-strata migration, and a pre-v4 surface migration; `DEUS_Colonists.js:867` has `migratePersonIdentities`. `DEUS_World.js:3883` wraps save extraction. The future brief must inventory each path and define how the global format version relates to these subsystem versions. An unknown version or broken reference should fail load with a clear error rather than partially applying changes.

**Acceptance gate:** Keep fixtures for every supported prior format version, including existing legacy fixtures; prove migration to the current format and an exact save/load round trip for IDs, references, and the controlled world hash. A broken-reference fixture must fail clearly, without a half-loaded game. Run native `run_tests.bat`, report counts/failing names, cross-family review, and Deus laptop confirmation. The docs stub itself changes no save format.
