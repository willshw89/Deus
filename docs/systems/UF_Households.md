# UF_Households

Date: 2026-09-19. Persistent household membership, parentage and incremental home plans for every faction settlement. This system supplies exact construction requests; it never stamps a building, creates materials, teleports a resident or creates a baby. Existing UF_Colonists/UF_Jobs execute the work. Household records describe cohabitation and family ties, not permanent marriages or a rule about fidelity.

## Public API

| API | Contract |
|---|---|
| `state()` | Saved `UF.World.state.households`, or null before a world exists. |
| `all()` | Active household records, excluding records merged into another household. |
| `of(unitOrId)` | The unit's current household, or null. |
| `members(householdOrId)` | Living world unit records belonging to that household's faction, site and home level. A temporarily traveling unit retains its home membership. |
| `structures(householdOrId)` | Main home plus its detached bedroom annexes. Construction reservation/source protection and home-leash consumers must inspect every returned footprint. Annex `hearth` and `storage` are null. |
| `reconcile()` | Reconcile existing unit/parent/reciprocal-partner records, genealogy generations and completed beds/doors. Does not form arbitrary founder couples. |
| `formPair(a,b)` | Explicit partnership formation; returns the joined household or null. Both people must be living adults aged at least 18, willing, of the same biological species, same settlement and present level, not close relatives, and not already partnered to a different living unit. |
| `pairReason(a,b)` | Refusal text or null. Existing reciprocal partnership is checked separately by `roomForPair`. |
| `closeKin(a,b)` | True for a shared known ancestor within three generations, including ancestors and descendants. Reads physical genealogy, not NPC belief. |
| `planSteps(unit)` | Persistent home build-step array, or `[]` when no supported site/space exists. Only adults present on their home's level receive construction steps. |
| `demands(h)` | Actual supported deficits: `{members,bedrooms,beds,cooking,storage,capacity,overflow,expansionBlocked,blocked,unsupported}`. `capacity` is all reserved bed slots; `beds` counts physically missing or differently owned beds. Numeric demand is not satisfied by a plan or an unrelated object elsewhere. `unsupported` lists dining, windows and locks. |
| `describe(h)` | `{id,members:[unitId],generation,home,complete,demands,children:[unitId],reason}`. `complete` means only the supported physical enclosure/bed/hearth/storage requirements are met, with no overflow. It does not claim dining, windows, roofs, keys or all requested house features exist. |
| `roomForPair(a,b)` | Strict current privacy validation, returning `{householdId,area:{x,y},z,cells:[{x,y}],spots:[{x,y},{x,y}],door:{kind,area,x,y,z}}`, or null. The spots are adjacent central sleeping-room cells. No movement occurs here. |
| `CAPACITY` | Legacy value 4, retained for compatibility only. New callers must read `demands(h).capacity`; real new homes and annexes have need-sized capacities. |

Every spatial operation retains z; missing z means Ground. State uses level coordinates independently of the currently rendered map. Plan cells are offsets from `UF.Colonists.state(unit).site`, not from the household house origin. A step is `{id,build,cells,exact:true,household:id,stores?}`. Consumers must honor `exact`, must not treat another building on the target as completion, and must carry `household` into job parameters. Unchanged step objects retain `done`, `celebrated` and executor metadata across planning calls. A membership change updates only the changed bed step, leaving unchanged structural progress intact.

## Household and genealogy rules

Founders with no existing family or partnership links start as separate households. An existing reciprocal eligible partnership merges those households. An under-18 child joins its known living mother's household, otherwise its known living father's, only when faction/site/home level agree. Parenthood alone does not invent a marriage between unpartnered parents. Birth processing uses the existing parent IDs; it does not infer parentage from proximity.

`formPair` rejects explicit `data.familyDesire === false` or `data.willingToPartner === false`, cross-species pairing, automaton/undead/swarm biological reproduction and `data.reproduction === false`. An undefined preference does not veto this **explicit API**; an autonomous courting caller must establish mutual positive willingness first (the root Colonists integration requires both `familyDesire === true` and mutual familiarity). The same safeguards gate private-room requests. This API is not an autonomous romance director and is not a complete consent, courting or species-specific life-cycle simulation.

The genealogy registry stores simulation truth: `motherId`, `fatherId`, `generation` and the person's identity. **That truth is not a universal NPC knowledge or gossip record.** Suspected parentage, publicly acknowledged parentage, secrecy, evidence, relationships outside a partnership, justice and social consequences need separate belief/event systems. Callers must not publish a hidden biological father as something every character knows. Debug inspection may show simulation truth explicitly.

Missing units are not declared dead. Only explicit death flags or the actual `combat:kill` event write `deceased` and `deathTick`. Recorded ancestors persist after death; generation derives recursively from recorded parent IDs, with a cycle/depth guard. Movement, temporary absence and removal for a test do not fabricate a death event.

## Home planning

The first home uses existing catalog objects only: the culture's wall and door, `floor_straw`, `campfire` and `stockpile`. If that culture's selected wall has no build recipe, its own existing `laterWall` is used only when buildable (the current goblin configuration falls back from nonbuildable `rubble_pillar` to its approved `wall_wood`). No unrelated wall or new asset is invented; a missing fallback recipe remains a reported blocker.

**Need determines size before randomness.** New homes reserve enough bed slots for actual current household members. Then a deterministic choice selects room proportions, rotation, mirroring and door lanes from suitable designs. The chosen `home.design` stores the seed-derived decision and the actual membership/sociability inputs; existing homes are never redrawn when preferences or the world seed later change. Current adult/child membership determines capacity. Mean existing `data.facets.sociability` biases the broader common-room variant; faction identity participates in the seed and the existing culture selects building materials. No new architectural lore or species stereotypes are invented.

| Residents at first planning | Bed capacity | Unrotated main footprints |
|---|---|---|
| 1–2 | 2 | 6×8 or 7×8 |
| 3–4 | 4 | 7×9 or 9×8 |
| 5–8 | 8 | 9×10 or 11×9 |
| More than 8 | Rounded up to a multiple of 4 | Width 11 or 13; bedroom rows and height increase with actual capacity |

Four rotations and mirroring transform every wall, bed, door, sleeping cell, adjacent privacy spot, furniture cell and external entrance together. This changes actual built footprints and room proportions, not only labels. Side bed columns leave a reachable central aisle. Main homes have separate sleeping and common rooms and two doors. There is no arbitrary population ceiling in the sizing formula; very large footprints may legitimately fail the bounded dry/support/access search.

New main common rooms have at least three interior rows. The hearth has an empty four-neighbor buffer and a Manhattan distance of at least two from every planned wall, wooden door, bed and stockpile. Existing objects, including passable fuel plants, are rejected in those buffer cells. **This geometry is not proof of fireproof ground:** natural grass or a displayed floor may still be combustible according to UF_Fire. Floor construction, fuel rules and firebreak behavior remain explicit Fire/Floors integration work. Historical homes are not silently moved to apply the new clearance rule.

The deterministic search tries at most 80 candidate footprints in four rings, once per game day after a failure (year/month/day key, not a repeating day-of-month alone). Every footprint cell must have dry supported ground. Existing buildings, ruins, owned objects, occupied cells, bootstrap plan cells and other home/annex reservations are refused. Natural connection endpoints and intermediate chain landings retain the existing one-cell access-buffer reservation, isolated by level. Blocking natural objects are permitted only on cells the construction chain will clear; the walking interior remains unobstructed. An external entrance cell must be clear and reachable from the requesting resident. A solid underground pocket or unsupported upper level produces a blocked/no-space reason, never automatic excavation or floating construction.

Plans reserve their footprint plus separation. A household merge retains the older reservation record instead of deleting existing structures or silently giving them away. Replanning, relocation, demolition and releasing an abandoned house need their own explicit future rules.

Construction order is main walls, doors, required individual beds, hearth and food storage. Materials and labor are ordinary exact build jobs owned by the colonist planner. There is no instant NPC construction. Demand checks inspect the exact actual objects every time. Removing a wall restores the enclosure deficit.

When actual residents exceed existing slots, a planning pass seeks a **detached bedroom annex** owned by the same household and reached through the open exterior. It has real walls, an entrance and enough new bed slots for the deficit, but no duplicate hearth. Its wall/door/bed work is appended as three persistent exact steps; existing main walls and beds remain where they are. At most one annex search runs per calendar-day/member-count request, with the same 80-candidate terrain/ownership/occupancy/access protections. Further actual growth may request another annex. If no safe plot exists, `expansionBlocked`, unmet `beds` and `overflow` remain explicit, with a larger-home-needed explanation. A reservation alone never satisfies the child's bed demand. The current implementation does not knock through an existing wall or create an attached corridor.

Completed beds are offered to their recorded intended resident through `UF.Ownership.assignBed`, without force. A valid existing assignment is not re-emitted on repeated planner/inspection calls. Someone else's claim is not stolen. If a different owner already holds a bed, the household still lacks that bed. Door states created by ordinary construction initially default to the player faction in UF_Doors; this adapter corrects the faction only for matching doors in its exclusively reserved home footprint, unless an incompatible owner claim exists.

`roomForPair` selects the main or annex sleeping room containing both partners' assigned beds. It requires reciprocal eligible partners in the same household and on its level, that room's expected enclosing/partition walls and doors physically present, both residents' beds present, a dry traversable sleeping interior and no additional living unit in that interior, including children. Occupancy of a separate annex does not invade the parents' room. Door passage must admit both partners and no door may be held open or temporarily open after a crossing. It does not use UF_Rooms' relaxed two-gap definition. The caller still moves the two people physically into the returned cells and rechecks occupancy at job completion; a returned room is not an intimacy reservation or teleport.

## Events and hooks

Emits `households:merged(target,old)`, `households:paired(a,b,household)`, `households:homePlanned(household,home)` and `households:annexPlanned(household,annex)`.

Listens to `colonists:ready`, `colonists:born`, `time:day`, `jobs:done`, `world:unitRemoved` and `combat:kill`. Job completion with `params.household` reconciles intended bed ownership and home-door faction. Boot installs listeners; save extraction reconciles the loaded state. No map-view gate is used. No core methods are replaced; only `Scene_Boot.start` and `DataManager.extractSaveContents` are aliased.

## Saved data

`UF.World.state.households = {version:1,nextId,byId,byUnit,people}`. Household IDs are stable sequential `household:N` identifiers. Each household stores faction/site/area/z, member IDs, founding tick, generation, home reservation, failed search/retry keys and expansion status. New home records add `design`, `spots`, `hearthClearance` and optional `annexes` to the existing absolute structural cells, sleeping-room cells, individual bed slots, furniture cells and exact plan steps. Each annex has its own footprint/design/cells; main `x/y/w/h` never changes. Historical homes without `design`/`spots` keep their exact prior geometry and old adjacent privacy spots. Merged records retain `mergedInto` and their old house reservation. There are no sprites, engine events, functions or cyclic unit references in the save data.

## Checks and observed status

`node tools/test_households.js` loads the actual plugin in a Node VM with small World/Objects/Ownership/Doors/Colonists doubles. Observed 2026-09-19: **54 passed, 0 failed**. Alongside the original family/ownership/genealogy/privacy/culture-material checks, it covers natural endpoint/landing reservations, deterministic size-first designs, all four rotations, larger-family capacity and nondecreasing area, reachable aisle/door/bed/privacy geometry, hearth clearance, actual annex construction demand/assessment, legacy geometry preservation and save/load of new designs/annexes. Sixteen planner seeds produced two distinct four-resident footprint areas, sixteen door/footprint signatures and all four rotations. These are actual function results in controlled terrain, not screenshots of naturally grown settlements.

Behavior mutations of the loaded real source were observed failing: `--mutate-variety` forces one proportion choice and fails `saved_seeded_structural_variety` (53 passed, 1 failed; exit 1). `--mutate-size` forces new main homes to two-resident sizing and fails `larger_new_families_get_capacity_and_area` (53 passed, 1 failed; exit 1). The z mutation fails household level separation and other-level passage isolation (52 passed, 2 failed); the enclosure mutation fails the removed-wall check (53 passed, 1 failed). All four exit 1; none replaces an assertion with hardcoded success.

The VM fixture places objects directly only to establish assessment/ownership/privacy test cases; it does **not** prove physical material delivery or construction by AI. Root's Colonists exact-step integration and runtime tests are separate. This subtask produced no screenshot, did not register the plugin, did not change catalog/engine files, and did not run editor F5/F8. Runtime art, full-duration population growth and performance acceptance remain unchecked.

## Known limits

Root runtime follow-up, 2026-09-19: fixed-seed `society_growth_20260919_a` passed **17/17** with actual Colonists/Jobs, prepared supported terrain and supplied physical input stacks. Workers completed 66 individual construction jobs for two differently proportioned homes on +1 and -1, then 23 further jobs for a detached bedroom annex after an actual fixture-triggered birth. The child gained an owned bed; original main-wall geometry was unchanged. Privacy refusal, personal crafts, culture evidence and RMMZ save serialization also passed. Root opened all four PNGs: readable goals with a three-member furnished household, a two-room main home, its separate narrow bedroom annex, and the differently proportioned underground house under cave-night lighting. This proves construction in a supplied test environment, not self-sufficient long-run population growth. Editor F5/F8 remains unchecked.

- Growth currently uses detached bedroom annexes, not attached extensions, wall replacement, relocation or demolition. A bounded search can leave expansion blocked.
- Seeded design reads actual present household size and sociability and existing cultural materials. This is not a learned regional architecture language or multigeneration architectural inheritance system.
- Cooking access here means a physical campfire at the planned position, not proof of fuel, meal production or exclusive use. Storage is a physical stockpile, not proof it contains food.
- Roofs, flooring jobs, dining tables/chairs, windows, household ownership as a new Ownership owner kind, shared keys and household lock access remain unimplemented here.
- Strict privacy validates only the sleeping room; the common room is a separate room. It does not block passersby from entering afterward, so callers must revalidate.
- The bounded planner may report no space in a dense or narrow cavern even if a different orientation or irregular building could fit. The selected saved design is tested at 80 positions, not every possible layout at every cell.
- Existing homes in other systems are not automatically appropriated as household houses.
- Global future genealogy/house-history pruning is not implemented; metadata grows with actual recorded people.
