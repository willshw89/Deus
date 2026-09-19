# UF_Ownership

**Date:** 2026-09-19. Persistent claims for objects, items, units and sites, bed assignment, and exhausted people's sleep requests. State is saved with the World registry. Reconciliation and sleep scheduling visit people on every supported level, regardless of which level is rendered.

## Public API

| Member | Contract |
|---|---|
| `state()` | Returns `UF.World.state.ownership`, creating the version-1 registry when absent. |
| `keyOf(ref)` | Entity key or `null` for an invalid/unsupported object level. Object refs are `{kind:"object",area,x,y,z?}`. Item, unit and site refs are `{kind,id}`. Existing string keys are also accepted; object strings are validated. |
| `claim(ref, owner, {force?,reason?})` | Creates/replaces a claim, or returns `null` when another owner already holds it or the reference is unsupported. |
| `release(ref, owner?)` | Removes a matching claim; returns a boolean. |
| `ownerOf(ref)`, `entryOf(ref)`, `entries()` | Ownership lookups. Owners are `{kind:"unit"|"faction",id}` or `{kind:"public"}`; a unit record and the string `"public"` are accepted when claiming. |
| `assignBed(unitOrId, bed, {force?})`, `bedOf(unitOrId)` | Assigns/returns a valid claimed bed record, or `null`. New assignments require the unit and bed on the same level and in the same area. Existing valid assignments remain saved when a unit changes level. |
| `reconcile(area?)`, `reconcileArea(area)` | Remove invalid claims and assign unclaimed beds to people on each level, nearest first. Without an area, every supported level containing people is visited. Returns assignment/person/bed counts, plus area count for `reconcile`. |
| `scheduleSleep(unitOrId, {frames?,force?})` | Requests an ordinary sleep job after a successful handler preflight, or returns `null`. Cross-level requests are refused until routing exists. Target and preflight retain bed z. |
| `priorityReason(unit)` | Explains whether danger, thirst, hunger, exhaustion or missing bed prevents a sleep request. |
| `describeAt(area,x,y)`, `ownerName(owner)` | Inspection text. Look decoration reads the viewed level. |
| `setEnabled(on)`, `isEnabled()` | Enable/disable automatic reconciliation and sleep scheduling. |
| `errors`, `errorCount()` | Bounded error log and total caught error count. |

## Coordinates and save compatibility

API LevelArea handles are `{x,y,z?}`. Records carry `{area:{x,y},x,y,z?}`; explicit record z takes precedence over `area.z`. Omitted z means Ground. Only integer levels -2 through +2 are valid. Non-ground reads and mutations require the documented World seam: `viewLevel`, `levelKey`, and `levelOfMapId` must exist. A legacy core refuses such requests before object access.

`UF.World.state.ownership = {version:1,claims:{key:entry}}`; entries store `{entity,owner,reason,tick}`. Assigned beds live in `unit.data.bed`. Ground retains its existing record shape and key spelling, `object:ax,ay:x,y`; non-ground keys are `object:ax,ay,z:x,y`. Thus old saves need no destructive re-keying. Non-ground object entities and bed records save z beside area. Legacy missing-z records continue to mean Ground.

Cleanup preserves unsupported non-ground saved claims and beds rather than validating them against Ground. It cannot reconstruct state lost by earlier key collisions. It does not invent migration history or move entities.

Ground colonist sleep requests retain the existing `Colonists.order` path. That adapter currently strips target z, so non-ground colonists use `Jobs.cancel`/`Jobs.create` directly with the complete bed target and `params.ordered:true`. Exhaustion/survival priorities, same-level validation and the sleep-handler preflight run before either submission path. The five-level VM fixture deliberately supplies a z-stripping `Colonists.order` and verifies it is called only for Ground.

## Events and hooks

Emits `ownership:changed(key,newEntry,oldEntry)`, `ownership:bedAssigned(unit,bed)`, and `ownership:sleepOrdered(unit,job,bed)`.

Listens to `world:created`, `colonists:ready`, `world:unitAdded`, `world:unitRemoved`, `objects:changed` (Ground), and `objects:levelChanged` (other levels). Destroying a bed clears only its level's claim and assignment. Aliases Game_Map update for scheduling, DataManager save extraction for registry initialization, Scene_Boot start for setup, and the public Look API for owner labels.

## Checks and status

`node tools/test_z_ownership.js` runs the real plugin in Node VM fixtures for legacy and documented level seams: Ground keys/record shapes, legacy refusal without object access, invalid z, record precedence, separate same-coordinate claims/beds, per-level reconciliation, sleep target z, cross-level sleep refusal, viewed-level labels, object destruction isolation, unit-added record z, JSON save/load, and all-five-level reconciliation/sleep while only Ground is viewed.

`node tools/test_z_ownership.js --mutate-z` replaces the loaded source's z reader with zero; the same assertions must fail and the process must exit 1. This is a mutation of behavior, not a forced-false check. The existing in-engine `ownership` suite covers its original Ground behavior.

Observed on 2026-09-19: the normal VM contract suite passed 16/16; the source mutation exited 1 with 5 passed and 11 failed, including the separate-key, per-level reconciliation, and all-five-level scheduling checks. Node syntax checks passed for plugin and test.

Snapshot `codex_zcompat_20260919_ownership_b` passed the real Ground runtime `ownership` suite 9/9 after the order-adapter fix. The opened `ownership.owned_bed.png` shows straw beds among the founders and the Look line `Owned by TEST_Ada`; the exhausted fixture used its own bed, survival/danger priorities remained intact, and save/cleanup checks passed. Ownership was registered only in the snapshot; the live plugin list was not changed.

VM checks are API evidence only. Live five-level integration and RMMZ F5/F8 have not been checked. The current live World core lacks the level seam; this plugin does not create five maps or cross-level routes. All five maps must ultimately simulate continuously; viewing one map is not permission to pause another map's simulation.
