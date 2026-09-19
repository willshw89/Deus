# Five-level vertical world

**Date:** 2026-09-19  
**Status:** approved design target from VISION V80-V83; not implemented

**Scope:** condense Dwarf Fortress's vertically dependent mechanics into one persistent 256x256 footprint with exactly five physical levels. This is a mechanics reference and architecture contract, not an import of DF raws, prose, names, creatures, or balance numbers.

This document supersedes the surface-only clauses in `WORLD_ARCHITECTURE.md` and the obsolete V20 references in `DF_MECHANICS.md`. Those files remain descriptions of the current engine until the vertical build is implemented and tested.

The complete biome, resource coverage, generation-density and mapwide spawn-rate contract is `RESOURCE_ATLAS.md`. Where this document gives only a category summary, the atlas is authoritative.

## 1. Fixed world stack

The world has 327,680 addressable cells: `5 x 256 x 256`. Every cell, object, item, unit, job, room, ownership record, liquid, discovery flag, and construction has a `z` coordinate from `-2` through `+2`.

| z | Functional level | Generated state | Main play |
|---:|---|---|---|
| `+2` | Upper 2 | Mostly open air; the top of large trees and rare natural high points | Third storeys, tower tops, roofs, high bridges, battlements, flight, falls, projectiles |
| `+1` | Upper 1 | Mostly open air; trunks, heavy branches, and occasional raised terrain | Second storeys, ramparts, bridges, raised machinery, climbing and canopy travel |
| `0` | Ground | The complete surface biome map | Founding camps, roads, farms, surface water, ordinary wildlife and settlements |
| `-1` | Subterranean 1 | Soil, roots, upper stone, aquifers, small caves and pockets | Cellars, wells, cisterns, early mines, underground farms, common stone and ore |
| `-2` | Subterranean 2 | Deep stone plus large carved and natural domains | Deep mines, cavern ecosystems, rare minerals, underground lakes, magma, deepest threats |

These are functional labels, not setting lore. The UI may say `+2`, `+1`, `Ground`, `-1`, and `-2` until the user approves any thematic names.

### 1.1 Compression rule

DF can use many physical z-levels, multiple cavern depths, a magma sea, and further sealed depths. UF has five physical levels, so it preserves the decisions and interactions rather than the literal count:

- Ground elevation is usually expressed inside `z=0` as terrain, slopes, cliffs, water depth, and blocking height. It does not consume all of the two buildable upper levels.
- The three broad DF cavern depths become gated `depthBand` regions inside `z=-2`, not three more maps.
- Magma and the deepest sealed region are domains inside `z=-2`, separated by hard rock, hazards, and controlled connectors.
- A depth band changes geology, ecology, danger, ambient light, and spawn tables. It does not change the physical `z` coordinate.
- The player still has to breach the bands in order. They are connected spatially by tunnels, doors, ramps, water barriers, hard strata, and magma-safe construction, not by a menu teleport.

Suggested internal bands are `near`, `middle`, `deep`, `magma`, and `sealed`. They are data tags, not player-facing proper nouns.

### 1.2 Five levels are persistent, not five RMMZ maps in memory

- New Game generates and validates complete seeded baselines for all five levels before the first playable frame. No level is deferred until the player visits it.
- All five levels always persist in `UF.World.state` and in saves.
- One level is materialized into the RMMZ map and rendered at a time.
- Units on every level retain exact positions, inventories, needs, relationships, jobs, and next scheduled decisions.
- Off-screen levels advance with sparse unit/job queues and scheduled ecology events. No off-screen renderer or full-map scan runs.
- Cross-level changes such as falling, liquid flow, cave-ins, tree growth, and connector use enqueue work for the affected neighboring level even when it is not visible.
- A connector graph caches routes between levels. Local pathfinding only runs around the current route segment and invalidates when a connector or supporting cell changes.

This preserves the whole world without trying to draw or rescan 327,680 cells every frame.

## 2. Vertical content inventory and UF condensation

This is the complete category inventory for DF mechanics whose meaning depends on height, depth, an opening between levels, or a material layer.

| DF vertical content | What must survive in UF | Five-level expression |
|---|---|---|
| Tile shapes | Solid wall, walkable floor, open space, ramps, upward/downward/bidirectional stairs | Stored per cell; connectors link matching or adjacent `(x,y,z)` cells |
| Digging | Mining walls, carving stairs and ramps, channeling floors, removing stairs/ramps | Jobs mutate cell shape and material; channeling opens the floor and can expose or carve the cell below |
| Construction | Walls, floors, ramps, stairs, roofs, supports, hatches, grates, bars and bridges | Any non-solid level can be built into when support and access rules pass |
| Structural failure | Unsupported floors and constructions collapse; objects and creatures fall | Support graph and queued collapse; debris, injuries and falling continue until a supporting floor is reached |
| Geology | Soil, sedimentary, igneous and metamorphic layers; veins, clusters, ore, gems, clay, sand and fuel | Upper geology is concentrated in `-1`; full stone families, veins, clusters and rare deposits are distributed across gated regions of `-2` |
| Aquifers | Water-bearing soil/stone, including slower and heavy sources | `seeping` and `pressurized` aquifer cells, mainly in `-1`; generation always leaves a feasible route or engineering answer |
| Water | Depth, lateral flow, falling water, pressure, sources, wells, cisterns and waterfalls | Depth `0..7`; open cells flow downward first, then laterally; pressure and pumps can raise water; wells draw through aligned openings |
| Magma | Deep natural magma, magma-safe materials, magma workshops and pumping | Generated only in deep domains of `-2`; it may be contained, channeled, bridged, gated, or pumped upward with heat-safe parts |
| Fluid control | Floodgates, hatches, bridges, grates, bars, pumps and pressure plates | Fixtures declare whether they block creatures, items, sight, water, magma, or airborne flow independently |
| Power and machines | Wind/water power, gears, horizontal and vertical axles, pump stacks, rollers | Power networks include `z`; a vertical axle connects machines at the same `(x,y)` on adjacent levels |
| Hauling | Tracks, track stops, carts, ramp velocity, falling cargo and collisions | Track graph crosses ramps/bridges; carts keep momentum across a connector and can fall through open cells |
| Trees | Trunks, branches, walkable canopy, falling logs and roots that affect below-ground cells | Mature trees compress into `z=0..+2`; roots influence or occupy `z=-1`; cutting the base updates every occupied level |
| Underground ecology | Depth-bound crops, shrubs, fungal trees, spores, mud, lakes, fish and creatures | Farming and small cave growth begin in `-1`; larger cavern ecology and depth-gated populations occupy domains in `-2` |
| Creature movement | Walking, swimming, flying, climbing, jumping, stairs, ramps and falls | Movement profile controls legal connector and open-air edges; climbing costs more than walking; fliers traverse open aligned cells |
| Vertical combat | Ranged fire across openings, attacks from height, knockback, dodging and falling damage | Line of sight crosses open/grated cells; range includes vertical distance; knockback can cause a fall; each crossed level contributes danger |
| Sieges | Attackers climb, fly, break structures, and build floors/stairs to reach targets | Capability-driven assault planning uses the same connector graph and only creates legal construction jobs |
| Rooms and zones | Multi-level rooms, burrows, stockpiles, workshops, bedrooms and ownership | Every footprint cell includes `z`; one logical room or designation may contain cells on several levels |
| Jobs and AI | Workers select and reach targets on other levels; danger and distance include connectors | Job targets are `{area,x,y,z}`; planner cost includes connector travel, climbing, liquid, traffic and hazards |
| Sight and light | Darkness below ground, sunlight through openings, vision through bars/grates, above/below awareness | Light propagates downward through open cells; fixtures filter sight/light; UI shows nearby above/below entities without drawing them on the wrong level |
| Weather and airborne flow | Rain/snow falling through openings; smoke, mist, dust, steam and other flows crossing levels | Sparse transient queues; gravity or buoyancy chooses vertical direction before lateral spread |
| Temperature and fire | Heat crosses openings and materials; magma and fire affect nearby cells and liquids | Temperature is active only near a source or phase change; heat-safe material flags gate construction around magma |
| Discovery | Hidden stone, caves and sealed features revealed by excavation | Exploration and hidden state are per level; breaching a domain reveals only connected visible space |
| Navigation UI | Move view up/down, retain horizontal cursor, follow a unit through connectors | Level controls change `z` at the same `x,y`; follow mode changes level when its unit does; designation tools can span selected levels |

## 3. Cell and entity contract

### 3.1 Coordinates

Every spatial reference uses:

```text
CellRef = { area: { x, y }, x: 0..255, y: 0..255, z: -2..2 }
```

The area grid remains disabled. `area:{x:0,y:0}` is retained so the current public APIs do not need another incompatible migration.

Required state shape:

```text
state.levels["-2".."2"] = seeded baseline + sparse changes
state.view = { x, y, z }
unit.area, unit.x, unit.y, unit.z
item.area, item.x, item.y, item.z
job.target = { area, x, y, z }
room.cells[] = { x, y, z }
object.owner / room.owner remain independent of z
```

Every public spatial API accepts a full `CellRef`. A compatibility overload may assume `z=0` only during migration; new code must not silently omit it.

### 3.2 Cell state

The minimal persistent cell fields are:

| Field | Values |
|---|---|
| `shape` | `solid`, `floor`, `open`, `ramp`, `stairUp`, `stairDown`, `stairBoth` |
| `material` | catalog material id |
| `natural` | natural / constructed |
| `liquid` | type, depth `0..7`, pressure/source flags |
| `cover` | grass, mud, snow, ash, blood and similar surface state |
| `designation` | dig, channel, carve connector, remove, smooth, gather, build |
| `support` | cached support component/version, not an authoritative boolean |
| `light` | cached light value/version |
| `hidden` | undiscovered natural cell/domain |
| `depthBand` | optional geological/ecological band, chiefly on `z=-2` |

Plants, fixtures, furniture, buildings, loose items, and creatures remain entities rather than being packed into the terrain shape.

### 3.3 Connector rules

- Stairs connect matching `(x,y)` cells when their directions agree.
- A ramp is entered from an adjacent cell on its lower level and exits to a walkable cell on the upper level. It needs supporting terrain and clear headroom.
- An open cell is not a walking connector. It is a falling, flying, projectile, sight, weather, and fluid connection.
- A floor hatch occupies an opening and can independently block passage and liquid according to state.
- A floor grate or floor bars can support walkers while allowing selected liquids, sight, projectiles, or airborne effects through.
- A bridge creates supported floor across open space or liquid. Raising or retracting it removes those path edges and may expose a fall.
- Diagonal movement still obeys V3: no cutting across a blocked corner, including at the entry or exit of a vertical connector.

## 4. Generation contract

Generation uses the same seed for all five levels and derives every placement from stable salts. It never generates each level independently and hopes the connectors line up.

### 4.1 Order

1. Derive the complete `z=0` climate fields, geological columns and water table from the world seed.
2. Allocate all five 256x256 baselines, then materialize `z=0`, the earth-biome mosaic on `z=-1`, the deep-biome domains on `z=-2`, and the derived exposure/canopy zones on `z=+1/+2`.
3. Place aligned surface water, aquifers, underground lakes, magma, caves, openings and connector opportunities.
4. Place all natural resource sources required by `RESOURCE_ATLAS.md`, with legal geology/habitat and mapwide density rather than one clustered cache.
5. Populate renewable flora, fauna, fish and enemy populations on every eligible level/biome bucket under local and global caps.
6. Place settlement starts, roads and V67 starting-resource guarantees without overwriting blockers, hazards or units.
7. Carve and validate at least two separated descent networks from ground to `-1`, and at least one reachable but gated route from `-1` into each required `-2` band.
8. Audit resource/variant coverage, production-chain satisfiability, reachability, water containment, support and faction-start safety. Repair missing coverage deterministically and rerun affected audits.
9. Checksum and commit all five levels as one atomic world transaction. Play cannot begin with a deferred or invalid level.

### 4.2 Resource compression

- `z=0` supplies the full surface-biome range: woods, crops and wild plants, land and aquatic food, animal products, water, surface reagents and exposed earth/stone.
- `z=-1` is a distinct earth-biome mosaic: rooted loam, clay, sand/gravel, peat, aquifer earth, chalk/karst, salt/evaporite, frozen earth, ash/tuff and shallow caves.
- `z=-2` contains gated deep mine belts, crystal caverns, fungal forests, underground lakes, chasms, fossil/bone beds, salt caverns, magma chambers, frozen deep caverns and Hell.
- `z=+1/+2` contain the real upper cells of multi-level trees plus suitable nests, products and flying creatures; they do not duplicate the ground resource node.
- Every DF/U7/OSRS resource input maps through the canonical coverage manifest defined in `RESOURCE_ATLAS.md`; real variants remain variants while duplicated or proprietary names are normalized into original resources.

Finite stone, ore, gems, and fuel obey V74 and do not respawn. Cave plants, fungi, fish, prey, and eligible monsters replenish through the ecology rules when habitat and caps allow.

The ecology director rotates fairly through every `(z, biomeRegion)` bucket. Renewable sources and enemy populations recover toward data-driven targets at bounded rates; finite geology receives broad initial distribution but never respawns.

### 4.3 Trees across five levels

A mature large tree is one entity with occupied cells, not duplicated objects:

- roots: influence or block selected cells in `z=-1`;
- base and lower trunk: `z=0`;
- trunk and heavy branches: `z=+1`;
- crown, light branches, and canopy: `z=+2`.

Small trees may use only `z=0..+1`; shrubs use only `z=0`. Felling the base invalidates support, routes, light, and occupied cells across the whole tree. Growth never overwrites units or blocking construction (V68).

## 5. Digging, building, support and falling

### 5.1 Designations

- `mine`: solid cell becomes a walkable floor and yields its material.
- `channel`: removes the current floor. If the cell immediately below is natural solid, it may be carved into a ramp/floor pair; otherwise the result is open space.
- `carve stair`: changes a suitable natural or constructed cell to the selected stair direction and validates the neighbor level.
- `carve ramp`: makes the lower/upper pair required by the ramp rule.
- `remove connector`: removes constructed stairs/ramps without revealing hidden cells merely because the designation was drawn.
- `construct`: builds walls, floors, ramps, stairs, roofs, supports, hatches, grates, bars or bridges from hauled material.

The worker never stands on the floor being removed. Channel and collapse jobs reserve a safe adjacent cell before work begins.

### 5.2 Support

- Natural solid terrain is a support source.
- A constructed floor or wall is supported when a path through connected structural cells reaches natural solid or a valid support column.
- A constructed floor is the ceiling of the same `(x,y)` cell below.
- Removing terrain or a support invalidates only its structural component, not the whole map.
- An unsupported component enters a warning state, then collapses as one queued event. Collapse produces debris, opens cells, and moves or injures occupants.
- Initial tuning may use a conservative support-span limit, but the authoritative rule is graph connectivity plus material/span data, not a magic visual roof.

### 5.3 V73 wall art versus physical levels

V73's 48x96 wall occupies one blocking cell and visually overhangs the screen cell above it. That overhang is not `z+1`. A real second storey is a floor/wall on `z+1` at the same world coordinates. The renderer must therefore handle both sprite overhang and true level state without storing either one twice.

### 5.4 Falling

- A creature or loose object entering `open` without flight/support falls toward `z-1` until it meets a supporting floor, branch, stair edge, bridge, or the bottom boundary.
- Each crossed level adds impact energy. Skills, size, equipment, liquid depth, branches and stairs can reduce or redirect it.
- Falling objects can strike creatures and other objects.
- Knockback, dodges, collapsing structures, channeling, carts, and felled tree parts can all start a fall.
- At `z=-2`, the bottom boundary is solid except for explicitly generated lethal/sealed cells; nothing leaves the world array silently.

## 6. Fluids, air, light and heat

### 6.1 Liquids

Each liquid cell holds type and depth `0..7`.

1. An open downward edge receives liquid before lateral equalization.
2. Remaining liquid spreads to lower-depth neighbors.
3. Source, aquifer, and pressure states enqueue additional volume.
4. Pumps move a bounded volume from an intake cell to an output cell, including one level upward.
5. Grates, bars, hatches, gates, bridges and constructed floors apply explicit permeability rules.

Water and magma never share one cell; contact schedules phase-change material and steam effects. Still liquid does no per-frame work. Only dirty cells and their neighbors update.

### 6.2 Wells and cisterns

A well needs an aligned open/grated shaft to reachable water below, a safe supporting rim, and a container/hauling interaction. Cisterns are ordinary constructed rooms with fluid-tight boundaries. Contamination and drink quality can be added as data without changing the vertical model.

### 6.3 Light, weather and airborne effects

- Sky light enters exposed cells on `+2`, then propagates downward through aligned open or light-permeable cells.
- Roofs and floors block it; grates and sparse canopy attenuate it.
- Rain and snow fall through exposed openings. They do not appear under a closed roof.
- Smoke, steam, mist, dust and similar effects use sparse timed entities; each declares whether it tends to rise, fall or drift.
- Fire and magma enqueue local heat. Temperature does not run as a full five-map scan.

## 7. Movement, AI, combat and ownership

### 7.1 Pathfinding

Path cost includes horizontal steps, connector transitions, door state, liquid depth, climbing, traffic, danger, ownership restrictions and job hauling weight. The planner first finds a route through the small connector graph, then calculates local paths on each traversed level. A closed or destroyed connector invalidates only affected cached routes.

Movement profiles:

- walkers use floors, stairs and valid ramps;
- swimmers enter sufficient liquid and use water connectors;
- fliers move through aligned open cells and over ordinary gaps, but still need space;
- climbers use eligible vertical faces at higher cost and risk;
- large creatures validate footprint and headroom on both ends of a connector.

### 7.2 AI and jobs

- Every intent, order, reservation and job target includes `z`.
- Colonists may live, work, sleep, socialize, fight and haul on different levels; current actions still appear only in the clicked profile (V59/V62).
- Safety checks consider falls, cave-ins, deep liquid, magma, heat, hostile domains and loss of an escape route.
- A multi-level task reserves both connector access and its work cell, preventing two workers from blocking each other in a stair shaft.
- Off-screen units keep exact persistent state. Their beat work is event-driven/batched so V48's decision semantics remain while V50's budgets are measured rather than assumed.

### 7.3 Rooms, privacy and ownership

Rooms can span levels but enclosure is checked per storey. A stair opening does not make two storeys one private room by itself. Bedrooms, beds, doors, containers, workshops and buildings retain their owner/household/faction records at their actual `z`. Privacy checks from V78 count bystanders who can occupy, see into, or enter the same enclosed room, including through an open stairwell.

### 7.4 Combat and invasion

- Range uses horizontal distance plus vertical separation.
- Line of sight and projectiles may cross open cells and permissive grates/bars, never arbitrary solid floors.
- Cover, elevation, recoil/knockback and falls are data-driven modifiers compatible with the OSRS-style combat decision V64.
- Attackers may fly, climb, destroy blockers, or build stairs/floors only if their species, equipment and faction rules grant that capability.
- Defenders can use walls, battlements, drawbridges, hatches, traps, drops and controlled flooding without special-case siege maps.

## 8. UI

- Level up/down controls change `state.view.z` while retaining cursor `x,y`.
- The current level and `z` are always visible in the HUD.
- The cursor inspection panel shows terrain/object/unit summaries immediately above and below the selected cell.
- Follow mode changes level automatically when the followed creature uses a connector or falls.
- Build/dig previews show both ends of a stair, ramp, channel, well, axle or pump.
- A translucent cutaway may show the level below only for planning; entities are never interactable as though they occupy the current level.
- Multi-level designations are explicit start/end level selections. They never silently affect all five.
- Fog, hidden terrain and discovery state are independent per level.

## 9. Persistence and performance contract

The user-approved V50 budgets remain requirements, not claims that this design already meets them.

- Seeded natural terrain is regenerated from seed; saves store versioned sparse differences plus entities and scheduled events.
- Runtime arrays use compact numeric fields. At roughly 6-8 bytes per cell, five dense terrain layers cost about 1.9-2.5 MiB before objects and caches; this is a planning estimate, not a measured result.
- The rendered level alone owns sprites and tilemap state.
- Cell simulation uses dirty queues. No system scans all five levels per frame or per beat.
- Spatial indexes are keyed by `levelKey(area,z)` and cell index.
- Saves made before V80 migrate every existing terrain/entity reference to `z=0`, generate untouched `+2,+1,-1,-2` baselines from the original world seed, and preserve existing ids and ownership.
- A migration never moves an existing surface entity underground or into the air to solve a collision; conflicts are logged for repair.
- Save size, generation time, level-switch latency, beat time and far-zoom frame rate must be measured in the RMMZ playtest before implementation is called working.

## 10. Implementation slices

These are dependencies, not authorization to skip the currently approved project slice.

1. **State and migration:** introduce `z`, five seeded baselines, full `CellRef`, save migration and level switching with graybox rendering.
2. **Connectors and routes:** stairs, ramps, open cells, multi-level connector graph, unit/job/item transitions and follow UI.
3. **Excavation and construction:** mine, channel, construct floors/walls/connectors, support graph, falling and collapse.
4. **Generation and ecology:** implement `RESOURCE_ATLAS.md`: atomic five-level generation, three unique biome mosaics, derived upper zones, coverage manifest, geological columns, aquifers, veins/clusters, caves, multi-level trees, mapwide distribution and capped replenishment.
5. **Fluids and machines:** vertical water/magma, wells, gates/hatches/grates, pumps, power, bridges and tracks.
6. **Combat and UI finish:** vertical line of sight, projectiles, climbing/flying assaults, multi-level designations, cutaway/above-below indicators.

Current systems that will require audited changes include World, WorldGen, Objects, Items, Jobs, Colonists/Society, Wildlife/Ecology, Movement, Fog, Floors, Walls, Doors, Ownership, Fire, Combat, Look/Interact, Sheet, Time and save migration. No engine-core file is changed.

## 11. Acceptance checks

Every check needs a deliberately provoked failure before its passing result counts.

| Check | Required observation |
|---|---|
| `vertical.five_levels` | Exactly five 256x256 baselines exist at `z=-2..2`; a sixth is rejected |
| `vertical.complete_at_start` | All five baselines, biome maps, resource indexes and checksums exist before play; a deferred level is rejected |
| `vertical.surface_migration` | A pre-V80 save loads its existing world unchanged at `z=0` |
| `vertical.persistence` | Changes and entities on all five levels survive save/load and a New Game produces the same five baselines from the same seed |
| `vertical.switch_view` | Switching level retains cursor coordinates and draws/interacts only with the selected level |
| `vertical.stairs_ramps` | A unit paths up and down valid stairs/ramps and refuses an invalid half-connector |
| `vertical.channel_fall` | Channeling opens the correct cells; worker stays safe; an object and liquid fall to the matching cell below |
| `vertical.support_collapse` | Removing the final support collapses only the disconnected component and produces persistent debris/injury state |
| `vertical.geology` | Soil/upper stone/aquifer occur in `-1`; deep stone, veins, cavern bands and magma domains occur in `-2` with reachable progression |
| `vertical.biome_identity` | Surface, upper-earth and deep-world tables remain distinct; required earth and deep biome families all occur |
| `vertical.resource_coverage` | The complete source manifest is mapped and every required canonical/variant source or production chain is present and legal |
| `vertical.mapwide_ecology` | Every eligible level/biome bucket receives bounded ecology service; renewable resources and enemies recover toward targets without violating caps or spawn safety |
| `vertical.tree_span` | One tree occupies its configured levels, blocks safe spawning there, and clears/updates every occupied level when felled |
| `vertical.aquifer_well` | Seeping and pressurized sources behave differently and a well draws only through a valid shaft |
| `vertical.magma_safe` | Unsafe construction is rejected or fails according to rule; safe construction contains magma |
| `vertical.flight_climb_fall` | Walker, swimmer, flier and climber choose different legal routes; an unsupported walker takes measured falling consequences |
| `vertical.combat` | Sight/projectiles respect floors, openings and grates; knockback can cause a fall |
| `vertical.multilevel_jobs` | A colonist takes, reaches, completes and reports a job on another level without duplicate reservations |
| `vertical.rooms_ownership` | A bed, room and building retain owners and privacy/enclosure across save/load and stair openings |
| `vertical.offscreen_sim` | An off-screen job/ecology timer advances without sprites and gives the same seeded result after save/load |
| `vertical.budgets` | RMMZ playtest records generation, switch latency, save size, beat cost and frame rate against V50 |

## 12. Local reference evidence

The installed DF copy was treated as read-only. The evidence below establishes the mechanic categories; none of its raw content is copied into `game/`.

- The original z-axis and multi-level fortress change is described in `release notes.txt:3972`; vertical burrows and cross-level designations appear at `release notes.txt:840` and `release notes.txt:2968`.
- Falling at stairs/branches, falling objects, channel movement and falling damage appear at `release notes.txt:287`, `release notes.txt:2697`, `release notes.txt:2667`, and `release notes.txt:3199`.
- Invaders building stairs/floors and flying behavior appear at `release notes.txt:415` and `release notes.txt:425`; climbing movement and its higher path cost appear at `release notes.txt:2471`, `release notes.txt:2535`, and `release notes.txt:2590`.
- Aquifers, pressure plates, magma-safe material handling, waterfalls and vertical vision behavior appear at `release notes.txt:1221`, `release notes.txt:657`, `release notes.txt:2106`, `release notes.txt:2621`, and `release notes.txt:2974`.
- The local interface exposes hatches, bridges, wells, supports, pumps, windmills, gears, vertical axles, rollers, constructed floors/ramps/stairs/tracks and channeling at `data/init/interface.txt:571`, `:599`, `:601`, `:621`, `:647-659`, `:681-691`, and `:821-823`.
- Soil/aquifer tags are present in `data/vanilla/vanilla_materials/objects/inorganic_stone_soil.txt:22-170`; layer stones cover sedimentary, intrusive/extrusive igneous and metamorphic families in `inorganic_stone_layer.txt:15-262`; mineral placement uses veins and clusters in `inorganic_stone_mineral.txt:12-92` and beyond.
- Underground plants and tree-sized growth are depth-gated in `data/vanilla/vanilla_plants/objects/plant_standard.txt:58-264` and `:1545-1775`; surface trees carry trunk-height, branches and roots such as `:836-846` and `:1110-1120`.
- Underground creatures use depth ranges and movement/destruction abilities throughout `data/vanilla/vanilla_creatures/objects/creature_subterranean.txt`, including representative depth, flight, climbing, web and building-destruction tags at `:16`, `:263`, `:420`, `:1014`, and `:1699`; further depth distributions appear throughout `creature_next_underground.txt` beginning at `:12`.

The original tags demonstrate distribution and capability. UF implements original data tables, terminology, creatures, tuning and presentation under V9/V28.
