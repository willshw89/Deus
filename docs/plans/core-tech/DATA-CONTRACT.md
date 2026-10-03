# DATA-CONTRACT — schema-driven world content loading

**Status:** PARKED Owner-requested lane stub, 2026-10-03. Its implementation order is not set here. **Writer:** Claude. **Reviewer:** Codex (cross-family). ORG-0.2 green and WORLD-3x3 remain earlier gates; DEC-037 freezes faction/society runtime changes.

**Why the player cares:** A typo or missing item/material reference should stop a build with a useful file-and-field error instead of producing a broken object, recipe, or save in play. Runtime lookup should also stay bounded as the catalog grows.

## Proposed data boundary

- Lay out data files by kind with a `schemaVersion` on each file and matching JSON schemas. A registry owns stable, namespaced string IDs. IDs may contain spaces: the read-only DF study counted 24 recipe/reaction IDs with spaces, so a no-space validator would reject real input. Choose the DEUS ID normalization rule explicitly before coding.
- Resolve `copyFrom` through a single registry, reject cycles, and keep abstract templates out of instantiated content. Schema-marked reference fields (for example `x-ref`) drive validation, with file and JSON path in every unresolved-reference error.
- A CI validator exits **1** for schema errors, unresolved references, duplicate IDs, `copyFrom` cycles, and abstract leaks. It must demonstrate a failing fixture for each condition. Build a release-time prebuilt data bundle only after validation; measure load time before and after using the same data set and environment.
- `weight_lb` is the primary item/block field: use an SRD value where one exists, otherwise a labeled estimate. Density × volume is an explicitly declared fallback only where SRD weight is absent; it must not silently override the SRD value. The study's illustrative iron battleaxe is about 14 lb by density × volume versus SRD 4 lb, which shows why this distinction matters. This proposal does not open the later digging/building matter-rule implementation.
- Runtime may compile registry string IDs to dense integer indices for fast lookup. Saves retain string IDs and a version/migration path, **never registry-list indices**; rebuild derived dense maps and caches on load. The save-format version starts with the first save.
- The source study proposes 16×16×1 sparse, lazily allocated property arrays. For a 3×3 world of 256×256-tile areas, that is 48×48 chunks per z. This is a data-layout design input, not an authorization to replace the world store now.

Per-society allowed item, recipe, and building sets are **design only** under DEC-037, even though the DF study discusses them. Do not add faction/society code or tech progression in this lane. The separate data-loading research from DF raws, DFHack, Cataclysm DDA JSON, and RimWorld Defs is input only; its final body is pending and this stub does not invent its findings or copy GPL/AGPL material.

**Acceptance gate for a future opened lane:** Schema and negative-fixture CI checks, controlled before/after load milliseconds, `run_tests.bat` green, identical save/load object references and string IDs across registry reordering, and named runtime consumers with an RMMZ bridge test. Cross-family review checks that only one data registry exists and no save depends on ephemeral indices. Deus checks the laptop result. No target load-time threshold is invented here.

**Source and limits:** The [DF pattern study](https://github.com/willshw89/Deus/blob/4b2f5694ee265995c85c388414902063cc7d1e1e/docs/research/DF_PATTERN_STUDY.md) is on `task/docs-df-pattern-study` at `4b2f5694`, outside main `038a02c3`; its measurements and proposals must be separated when implementing. This page records a contract proposal, not an adopted schema or test result.
