# DATA-EVENTS — named typed event registry

**Status:** PARKED Owner-requested lane stub, 2026-10-03; fourth foundation job in [the sequence](README.md). **Writer:** Grok. **Reviewer:** Claude (cross-family).

**Why the player cares:** Mining, building, collapse, jobs, and inspection should react to the same real state change once, instead of missing an event or accepting a malformed payload.

Create one registry of named events and payload shapes, with debug-mode payload validation and a fail-fast path for unregistered emits. Preserve existing game behavior while routing producers and consumers to the registered names. On main `038a02c3`, `UF.Events` is an untyped listener map in `DEUS_Core.js:286-318`, and a `git grep -l 'UF.Events'` audit found 38 plugin files. That is the audit set, not proof that every use needs conversion or that no other event mechanism exists. The brief must map emitters, subscribers, payloads, and event ordering before edits.

Future history generation should subscribe to real events through this registry only when the Owner separately authorizes that DEC-037-frozen behavior. Green ORG-0.2 does **not** lift the faction/society freeze. This lane may establish the bus contract without implementing new history behavior.

**Acceptance gate:** Native `run_tests.bat` green and a compatibility fixture showing event ordering and payloads unchanged for migrated consumers. Negative fixtures reject unregistered names and invalid debug payloads. Report the 38-file audit disposition, test counts, and any intentional deferred history consumer; obtain cross-family review and Deus laptop confirmation. No event migration is claimed complete here.
