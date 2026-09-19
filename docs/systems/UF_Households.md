# UF_Households

Date: 2026-09-19. Persistent household membership, parentage and incremental home plans for every faction settlement. This system supplies exact construction requests; it never stamps a building, creates materials, teleports a resident or creates a baby. Existing UF_Colonists/UF_Jobs execute the work. Household records describe cohabitation and family ties, not permanent marriages or a rule about fidelity.

## Public API

| API | Contract |
|---|---|
| `state()` | Saved `UF.World.state.households`, or null before a world exists. |
| `all()` | Active household records, excluding records merged into another household. |
| `of(unitOrId)` | The unit's current household, or null. |
| `members(householdOrId)` | Living world unit records belonging to that household's faction, site and home level. A temporarily traveling unit retains its home membership. |
| `reconcile()` | Reconcile existing unit/parent/reciprocal-partner records, genealogy generations and completed beds/doors. Does not form arbitrary founder couples. |
| `formPair(a,b)` | Explicit partnership formation; returns the joined household or null. Both people must be living adults aged at least 18, willing, of the same biological species, same settlement and present level, not close relatives, and not already partnered to a different living unit. |
| `pairReason(a,b)` | Refusal text or null. Existing reciprocal partnership is checked separately by `roomForPair`. |
| `closeKin(a,b)` | True for a shared known ancestor within three generations, including ancestors and descendants. Reads physical genealogy, not NPC belief. |
| `planSteps(unit)` | Persistent home build-step array, or `[]` when no supported site/space exists. Only adults present on their home's level receive construction steps. |
| `demands(h)` | Actual supported deficits: `{members,bedrooms,beds,cooking,storage,overflow,blocked,unsupported}`. Numeric demand is not satisfied by a plan or an unrelated object elsewhere. `unsupported` lists dining, windows and locks. |
| `describe(h)` | `{id,members:[unitId],generation,home,complete,demands,children:[unitId],reason}`. `complete` means only the supported physical enclosure/bed/hearth/storage requirements are met, with no overflow. It does not claim dining, windows, roofs, keys or all requested house features exist. |
| `roomForPair(a,b)` | Strict current privacy validation, returning `{householdId,area:{x,y},z,cells:[{x,y}],spots:[{x,y},{x,y}],door:{kind,area,x,y,z}}`, or null. The spots are adjacent central sleeping-room cells. No movement occurs here. |
| `CAPACITY` | Four bed slots per initial home. Additional residents remain an explicit overflow/housing deficit. |

Every spatial operation retains z; missing z means Ground. State uses level coordinates independently of the currently rendered map. Plan cells are offsets from `UF.Colonists.state(unit).site`, not from the household house origin. A step is `{id,build,cells,exact:true,household:id,stores?}`. Consumers must honor `exact`, must not treat another building on the target as completion, and must carry `household` into job parameters. Unchanged step objects retain `done`, `celebrated` and executor metadata across planning calls. A membership change updates only the changed bed step, leaving unchanged structural progress intact.

## Household and genealogy rules

Founders with no existing family or partnership links start as separate households. An existing reciprocal eligible partnership merges those households. An under-18 child joins its known living mother's household, otherwise its known living father's, only when faction/site/home level agree. Parenthood alone does not invent a marriage between unpartnered parents. Birth processing uses the existing parent IDs; it does not infer parentage from proximity.

`formPair` rejects explicit `data.familyDesire === false` or `data.willingToPartner === false`, cross-species pairing, automaton/undead/swarm biological reproduction and `data.reproduction === false`. An undefined preference does not veto this **explicit API**; an autonomous courting caller must establish mutual positive willingness first (the root Colonists integration requires both `familyDesire === true` and mutual familiarity). The same safeguards gate private-room requests. This API is not an autonomous romance director and is not a complete consent, courting or species-specific life-cycle simulation.

The genealogy registry stores simulation truth: `motherId`, `fatherId`, `generation` and the person's identity. **That truth is not a universal NPC knowledge or gossip record.** Suspected parentage, publicly acknowledged parentage, secrecy, evidence, relationships outside a partnership, justice and social consequences need separate belief/event systems. Callers must not publish a hidden biological father as something every character knows. Debug inspection may show simulation truth explicitly.

Missing units are not declared dead. Only explicit death flags or the actual `combat:kill` event write `deceased` and `deathTick`. Recorded ancestors persist after death; generation derives recursively from recorded parent IDs, with a cycle/depth guard. Movement, temporary absence and removal for a test do not fabricate a death event.

## Home planning

The first home uses existing catalog objects only: the culture's wall and door, `floor_straw`, `campfire` and `stockpile`. If that culture's selected wall has no build recipe, its own existing `laterWall` is used only when buildable (the current goblin configuration falls back from nonbuildable `rubble_pillar` to its approved `wall_wood`). No unrelated wall or new asset is invented; a missing fallback recipe remains a reported blocker. Its 7×7 outer footprint has a 5×2 sleeping room, a partition with an internal door, a 5×2 common room and an outer door. Four side bed slots leave the central aisle clear. The common room has a hearth and food stockpile. This is an initial two-room layout, not a full architecture generator.

The deterministic search tries at most 80 candidate footprints in four rings, once per game day after a failure (year/month/day key, not a repeating day-of-month alone). Every footprint cell must have dry supported ground. Existing buildings, ruins, owned objects, occupied cells, bootstrap plan cells and other home reservations are refused. Blocking natural objects are permitted only on cells the construction chain will clear; the walking interior remains unobstructed. An external entrance cell must be clear and reachable from the requesting resident. A solid underground pocket or unsupported upper level produces a blocked/no-space reason, never automatic excavation or floating construction.

Plans reserve their footprint plus separation. A household merge retains the older reservation record instead of deleting existing structures or silently giving them away. Replanning, relocation, demolition and releasing an abandoned house need their own explicit future rules.

Construction order is walls, doors, required individual beds, hearth and food storage. Materials and labor are ordinary exact build jobs owned by the colonist planner. There is no instant NPC construction. Demand checks inspect the exact actual objects every time. A new child adds a bed requirement; a fifth resident creates overflow instead of marking a four-bed home sufficient. Removing a wall restores the enclosure deficit.

Completed beds are offered to their recorded intended resident through `UF.Ownership.assignBed`, without force. A valid existing assignment is not re-emitted on repeated planner/inspection calls. Someone else's claim is not stolen. If a different owner already holds a bed, the household still lacks that bed. Door states created by ordinary construction initially default to the player faction in UF_Doors; this adapter corrects the faction only for matching doors in its exclusively reserved home footprint, unless an incompatible owner claim exists.

`roomForPair` requires reciprocal eligible partners in the same household and on its level, all expected enclosing/partition walls and both doors physically present, both residents' beds present, a dry traversable sleeping interior and no additional living unit in that interior, including children. Door passage must admit both partners and neither door may be held open or temporarily open after a crossing. It does not use UF_Rooms' relaxed two-gap definition. The caller still moves the two people physically into the returned cells and rechecks occupancy at job completion; a returned room is not an intimacy reservation or teleport.

## Events and hooks

Emits `households:merged(target,old)`, `households:paired(a,b,household)` and `households:homePlanned(household,home)`.

Listens to `colonists:ready`, `colonists:born`, `time:day`, `jobs:done`, `world:unitRemoved` and `combat:kill`. Job completion with `params.household` reconciles intended bed ownership and home-door faction. Boot installs listeners; save extraction reconciles the loaded state. No map-view gate is used. No core methods are replaced; only `Scene_Boot.start` and `DataManager.extractSaveContents` are aliased.

## Saved data

`UF.World.state.households = {version:1,nextId,byId,byUnit,people}`. Household IDs are stable sequential `household:N` identifiers. Each household stores faction/site/area/z, member IDs, founding tick, generation, home reservation and last failed search day/reason. Home records contain absolute structural cells, sleeping-room cells, individual bed slots, furniture cells and exact plan steps. Merged records retain `mergedInto` and their old house reservation. There are no sprites, engine events, functions or cyclic unit references in the save data.

## Checks and observed status

`node tools/test_households.js` loads the actual plugin in a Node VM with small World/Objects/Ownership/Doors/Colonists doubles. Observed 2026-09-19: **37 passed, 0 failed**. It covers single founders, stable IDs, timestamps from UF.Time, explicit pairing safeguards, kinship, mother/child membership, generations, JSON round-trip, real versus assumed death, level isolation, exact two-room plans without world stamping, persistent plan flags, actual physical demand, bed claims without repeated assignment events, NPC door faction, private-room occupancy/temporarily open doors, new-child bed demand, wall destruction, nonoverlapping reservations, overflow, blocked terrain, bounded retries across calendar months, the approved goblin wall fallback and refusal when neither cultural wall is buildable.

Behavior mutations of the loaded real source were observed failing: `--mutate-z` removes same-level equality and fails `different_levels_not_joined` (36 passed, 1 failed; exit 1). `--mutate-enclosure` changes the actual enclosure predicate and fails `missing_wall_reopens_demand` (36 passed, 1 failed; exit 1). No fake forced-PASS condition is used.

The VM fixture places objects directly only to establish assessment/ownership/privacy test cases; it does **not** prove physical material delivery or construction by AI. Root's Colonists exact-step integration and runtime tests are separate. This subtask produced no screenshot, did not register the plugin, did not change catalog/engine files, and did not run editor F5/F8. Runtime art, full-duration population growth and performance acceptance remain unchecked.

## Known limits

- Four-resident homes do not expand yet; unmet demand is explicit.
- The layout does not inherit household taste or evolve architecture. Culture evolution belongs to a separate practice/preference system.
- Cooking access here means a physical campfire at the planned position, not proof of fuel, meal production or exclusive use. Storage is a physical stockpile, not proof it contains food.
- Roofs, flooring jobs, dining tables/chairs, windows, household ownership as a new Ownership owner kind, shared keys and household lock access remain unimplemented here.
- Strict privacy validates only the sleeping room; the common room is a separate room. It does not block passersby from entering afterward, so callers must revalidate.
- The bounded planner may report no space in a dense or narrow cavern even if a more sophisticated rotated/irregular design could fit.
- Existing homes in other systems are not automatically appropriated as household houses.
- Global future genealogy/house-history pruning is not implemented; metadata grows with actual recorded people.
