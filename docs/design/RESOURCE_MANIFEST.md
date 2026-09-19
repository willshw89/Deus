# Resource coverage manifest

**Status:** phase-2 design input; not loaded by the game

**Date:** 2026-09-19

**Machine-readable source:** `docs/design/RESOURCE_MANIFEST.json`

**Validator:** `tools/check_resource_manifest.js`

## Purpose

The manifest turns V82-V83's resource plan into data that can be checked before it is integrated into the catalog, generator or ecology director. It defines the five legal levels, the distinct biome sets, canonical original-resource families, production inputs, minimum world presence and provisional population profiles. It also records how source-reference roles are represented without copying another game's player-facing names or prose.

This file does not mean the resources are present in a New Game. The live generator does not consume the manifest yet.

## Current coverage

| Source set | Mode | Checked rows | What phase 2 covers |
|---|---:|---:|---|
| Local DF inorganic raws | generated mapping | 265 | metals, soils, layer stone, ores, mineral deposits, gems and special inorganic roles |
| Local DF plant raws | generated mapping | 225 | crops, garden plants, grasses, surface trees/plants and subterranean fungi/timber |
| Local DF creature raws | generated multi-role mapping | 767 records / 11,048 roles | flesh, organs, hides, body materials, eggs, milk, fibres, extracts, secretions, processed animal products and construct remains |
| Installed U7 manuals | explicit ledger | 34 | generic gathering, processing, food, textile, glass, drink and reagent roles |
| OSRS gathering references | explicit ledger | 82 | mining, woodcutting, farming, fishing, hunting and essence/catalyst roles |

The 490 inorganic and plant rows are parsed from the read-only local raws every time the validator runs. They are not copied into the manifest or the game. Each record must match one mapping rule, the source count must stay exact and the target must be a declared canonical resource.

Creature records are multi-role because one animal can supply meat, hide, bone, fat, blood and several special products. The checker resolves `COPY_TAGS_FROM` inheritance before matching material roles, requires all 767 records to be mapped or explicitly excluded, requires every role rule to match at least one record, and checks the exact total of 11,048 emitted roles. Three `DOES_NOT_EXIST` placeholders with no body or material definition are excluded with reasons. Construct corpse declarations map to their earth, stone, gem or metal resource rather than imaginary biological yields.

Together, the dynamic imports produce 11,538 checked mappings from the local DF raws.

The 116 manual and web-reference rows are an explicit role ledger. Each `(source, key)` pair must be unique and have exactly one outcome: canonical resource, variant, alias, produced item or a reasoned exclusion.

## Schema contract

### Natural resources

Each natural row has:

- a stable original `id` and broad `family`;
- `kind: natural`;
- explicit `allowedZ` and `biomeTags`;
- `renewable: false` for finite geology, or a valid `spawnProfile` for renewable populations;
- a positive `minWorldCount` when `worldRequired` is true;
- a gathering skill when the source is collected by a character.

### Processed resources

Each processed row has at least one canonical input and a governing skill. The validator recursively follows every processed input to natural sources and rejects missing inputs and cycles.

### Population profiles

The phase-2 rates are provisional counts per 4,096 compatible cells, not final balance:

- each profile has initial, minimum, target and hard-cap densities;
- minimum must not exceed target, and target must not exceed the cap;
- evaluation is currently specified at six world hours;
- batches are bounded;
- every attempt rejects occupied cells and visible pop-in, with start and unit protection radii.

Finite earth, stone, ore, metal, gems, crystals, geological fuels, salt, archaeological deposits and magma never receive a renewal profile. Renewable plants, fungi and living-source products recover through compatible habitat and caps. Enemies use the same deficit-and-cap contract but remain separate from item resources.

These numbers must be tuned with seeded long runs after the five-level ecology engine exists. They are not observed gameplay rates.

## Running the checker

From the project root:

```powershell
& 'C:\Program Files\nodejs\node.exe' tools/check_resource_manifest.js
```

The command exits nonzero when any invariant fails. Its built-in mutations prove that important checks can fail without editing the source file:

```powershell
& 'C:\Program Files\nodejs\node.exe' tools/check_resource_manifest.js --mutation missing-target
& 'C:\Program Files\nodejs\node.exe' tools/check_resource_manifest.js --mutation renewable-ore
& 'C:\Program Files\nodejs\node.exe' tools/check_resource_manifest.js --mutation deferred-level
& 'C:\Program Files\nodejs\node.exe' tools/check_resource_manifest.js --mutation missing-creature-role
```

Those cases must respectively reject an unresolved source target, renewable finite ore, a four-level world and a creature role whose target does not exist.

## Integration boundary

The next implementation pass must not simply dump reference rows into `UF_WorldCatalog.json`. It must:

1. review and approve original player-facing names for each accepted canonical and variant entry;
2. translate accepted entries into the live catalog schema without changing existing saves silently;
3. connect all-five-level generation, legal placement, coverage repair and reachability checks;
4. connect renewable profiles to the ecology director and leave finite geology outside recovery;
5. add deterministic generated-world tests, save round-trips and RMMZ F5 evidence.

## Known phase-2 gaps

- The creature audit covers the main `vanilla_creatures` source set. The separate `vanilla_creatures_extinct` module is not part of this source set and has not received its own count contract.
- Creature role matching audits declared material categories, inheritance and coverage. It does not yet execute every DF raw transformation such as `CV_REMOVE_TAG`, calculate caste-specific butchery yield, or decide whether a material can be harvested safely. The mapping is deliberately conservative until UF has its own creature definitions.
- The OSRS ledger covers distinct gathering and production roles from the six selected reference indexes, not every named item or species on the service.
- Manual mappings are semantic roles derived from read-only reference material. They are not copied descriptions and still need a second-person review before catalog integration.
- Habitat host material, cell shape, liquid depth, temperature, tool tier and progression gates are specified conceptually in `RESOURCE_ATLAS.md` but are not yet fields on every manifest row.
- The manifest checker is a development tool. It does not prove initial placement, runtime replenishment, save persistence, performance or visual correctness in RMMZ.
